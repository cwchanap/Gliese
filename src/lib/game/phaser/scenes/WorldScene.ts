import * as Phaser from 'phaser';

import {
	getEnemyFrameName,
	getGroundFrameName,
	starterPackAsset
} from '$lib/game/content/assets';
import { enemies, type EnemyCombatDefinition } from '$lib/game/content/enemies';
import { maps, openingMapId, type MapTransition, type WorldMapDefinition } from '$lib/game/content/maps';
import { startingPlayer } from '$lib/game/content/player';
import { advanceBossPhase } from '$lib/game/core/boss';
import { canReceiveHit, resolveHit } from '$lib/game/core/combat';
import { resolveMovementVector } from '$lib/game/core/input';
import { applyExperienceGain, type ProgressionState } from '$lib/game/core/progression';
import type { Direction } from '$lib/game/core/types';
import type { SaveState } from '$lib/game/save/save-state';
import { loadStoredSaveResult, saveGameState } from '$lib/game/save/storage';
import { emitHudState, onHudCommand, type HudCommand } from '$lib/game/ui-bridge/events';

interface WorldSceneData {
	mapId?: string;
	reason?: 'invalid-save' | 'new' | 'resume' | 'transition';
	saveState?: SaveState | null;
}

type DirectionKey = {
	isDown: boolean;
};

type EnemyMarker = {
	x?: number;
	y?: number;
	setDisplaySize: (width: number, height: number) => unknown;
	setTint: (color: number) => unknown;
	setVisible: (visible: boolean) => unknown;
};

type OverlayMarker = {
	x?: number;
	y?: number;
	setPosition: (x: number, y: number) => unknown;
	setScale: (x: number, y?: number) => unknown;
	setVisible: (visible: boolean) => unknown;
};

type EnemyInstance = {
	completion?: 'victory';
	defeated: boolean;
	definition: EnemyCombatDefinition;
	attackCooldownUntil: number;
	hp: number;
	invulnerableUntil: number;
	maxHp: number;
	phase: 1 | 2;
	x: number;
	y: number;
};

export class WorldScene extends Phaser.Scene {
	static readonly key = 'world';
	private static readonly attackReach = 40;
	private static readonly attackFlashDurationMs = 150;
	private static readonly autoAttackCooldownMs = 450;
	private static readonly enemyInvulnerabilityMs = 250;
	private static readonly enemyRadius = 10;
	private static readonly maxMovementDeltaMs = 250;
	private static readonly playerRadius = 12;
	private static readonly tileSize = 32;
	private static readonly transitionRadius = 18;
	private static readonly enemyHealthBarOffsetY = 34;

	private attackFlash?: OverlayMarker;
	private attackFlashUntil = 0;
	private clearedEncounterIds = new Set<string>();
	private cursorKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;
	private enemy?: EnemyInstance;
	private enemyHealthBarBg?: OverlayMarker;
	private enemyHealthBarFill?: OverlayMarker;
	private enemyMarker?: EnemyMarker;
	private facing: Direction = 'down';
	private healCharges = 1;
	private mapId = openingMapId;
	private player?: Phaser.GameObjects.Image;
	private playerAttackCooldownUntil = 0;
	private playerInvulnerableUntil = 0;
	private playerProgress: ProgressionState = {
		level: 1,
		xp: 0,
		hp: startingPlayer.baseHp,
		attack: startingPlayer.baseAttack
	};
	private removeHudCommandListener = () => {};
	private simulationPaused = false;
	private victoryAchieved = false;
	private wasdKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;
	private worldSize = { width: 0, height: 0 };

	constructor() {
		super(WorldScene.key);
	}

	create(data: WorldSceneData = {}) {
		const activeSave = data.saveState;
		const map = this.resolveMap(activeSave?.mapId ?? data.mapId);
		const width = map.width * WorldScene.tileSize;
		const height = map.height * WorldScene.tileSize;
		const reason = data.reason ?? (activeSave ? 'resume' : 'new');

		this.attackFlashUntil = 0;
		this.attackFlash = undefined;
		this.clearedEncounterIds = new Set(activeSave?.flags.clearedEncounters ?? []);
		this.enemy = undefined;
		this.enemyHealthBarBg = undefined;
		this.enemyHealthBarFill = undefined;
		this.enemyMarker = undefined;
		this.facing = activeSave?.player.facing ?? map.spawnDirection;
		this.healCharges = activeSave?.consumables.heals ?? 1;
		this.mapId = map.id;
		this.playerProgress = {
			level: activeSave?.player.level ?? 1,
			xp: activeSave?.player.xp ?? 0,
			hp: activeSave?.player.hp ?? startingPlayer.baseHp,
			attack: activeSave?.player.attack ?? startingPlayer.baseAttack
		};
		this.playerInvulnerableUntil = 0;
		this.playerAttackCooldownUntil = 0;
		this.simulationPaused = false;
		this.victoryAchieved = false;
		this.worldSize = { width, height };

		this.registerStarterPackFrames();
		this.renderGround(map);
		this.player = this.add.image(
			activeSave?.player.x ?? map.spawn.x,
			activeSave?.player.y ?? map.spawn.y,
			starterPackAsset.key,
			'hero'
		) as Phaser.GameObjects.Image;
		this.player.setDisplaySize(44, 60);

		this.setupEncounter(map);
		this.renderTransitions(map);

		this.cameras.main.setBackgroundColor('#1a1f2b');
		this.cameras.main.setBounds(0, 0, width, height);
		this.cameras.main.startFollow(this.player, true);

		this.cursorKeys = this.input?.keyboard?.createCursorKeys?.();
		this.wasdKeys = this.input?.keyboard?.addKeys?.({
			left: Phaser.Input.Keyboard.KeyCodes.A,
			right: Phaser.Input.Keyboard.KeyCodes.D,
			up: Phaser.Input.Keyboard.KeyCodes.W,
			down: Phaser.Input.Keyboard.KeyCodes.S
		}) as Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>> | undefined;
		this.removeHudCommandListener();
		this.removeHudCommandListener = onHudCommand((command) => this.handleHudCommand(command));
		this.events?.once?.('shutdown', () => this.removeHudCommandListener());

		this.publishHudState(
			this.victoryAchieved ? 'Victory: ruins cleared' : this.resolveInitialStatus(reason)
		);
	}

	update(time: number, delta: number) {
		if (!this.player) {
			return;
		}

		if (this.simulationPaused) {
			return;
		}

		const direction = resolveMovementVector({
			left: Boolean(this.cursorKeys?.left?.isDown || this.wasdKeys?.left?.isDown),
			right: Boolean(this.cursorKeys?.right?.isDown || this.wasdKeys?.right?.isDown),
			up: Boolean(this.cursorKeys?.up?.isDown || this.wasdKeys?.up?.isDown),
			down: Boolean(this.cursorKeys?.down?.isDown || this.wasdKeys?.down?.isDown)
		});

		const step = startingPlayer.moveSpeed * (Math.min(delta, WorldScene.maxMovementDeltaMs) / 1000);
		const min = WorldScene.playerRadius;
		const maxX = this.worldSize.width - WorldScene.playerRadius;
		const maxY = this.worldSize.height - WorldScene.playerRadius;

		this.player.x = Math.min(Math.max(this.player.x + direction.x * step, min), maxX);
		this.player.y = Math.min(Math.max(this.player.y + direction.y * step, min), maxY);
		this.facing = this.resolveFacing(direction, this.facing);

		if (this.tryTransition()) {
			return;
		}

		if (time >= this.attackFlashUntil) {
			this.attackFlash?.setVisible(false);
		}

		if (
			this.enemy &&
			!this.enemy.defeated &&
			time >= this.playerAttackCooldownUntil &&
			this.canHeroAttackEnemy(time)
		) {
			this.playerAttackCooldownUntil = time + WorldScene.autoAttackCooldownMs;
			this.attackFlashUntil = time + WorldScene.attackFlashDurationMs;
			this.showAttackFlash();
			this.enemy.hp = resolveHit(
				{ hp: this.enemy.hp, defense: 0 },
				{ power: this.playerProgress.attack }
			).hp;
			this.enemy.invulnerableUntil = time + WorldScene.enemyInvulnerabilityMs;
			this.updateEnemyHealthBar();
			this.updateBossPhase();

			if (this.enemy.hp === 0) {
				this.finishEncounter();
			} else {
				this.publishHudState('Strike landed');
			}
		}

		if (!this.enemy || this.enemy.defeated) {
			return;
		}

		this.updateEnemyBehavior(time, delta);
	}

	private applyReward(xpReward: number): ProgressionState {
		if (this.playerProgress.level === 1) {
			return applyExperienceGain(this.playerProgress, xpReward);
		}

		return {
			...this.playerProgress,
			xp: this.playerProgress.xp + xpReward
		};
	}

	private canHeroAttackEnemy(time: number) {
		if (!this.player || !this.enemy || this.enemy.defeated) {
			return false;
		}

		const distanceToEnemy = Phaser.Math.Distance.Between(
			this.player.x,
			this.player.y,
			this.enemy.x,
			this.enemy.y
		);

		return (
			distanceToEnemy <=
				WorldScene.playerRadius + WorldScene.enemyRadius + WorldScene.attackReach &&
			canReceiveHit(this.enemy, time)
		);
	}

	private buildSaveState(): SaveState {
		return {
			version: 1,
			mapId: this.mapId,
			player: {
				level: this.playerProgress.level,
				xp: this.playerProgress.xp,
				hp: this.playerProgress.hp,
				attack: this.playerProgress.attack,
				x: this.player?.x ?? 64,
				y: this.player?.y ?? 64,
				facing: this.facing
			},
			flags: {
				clearedEncounters: [...this.clearedEncounterIds].sort()
			},
			consumables: {
				heals: this.healCharges
			}
		};
	}

	private buildTransitionSaveState(transition: MapTransition): SaveState {
		const nextMap = this.resolveMap(transition.toMapId);
		const arrival = transition.arrival;
		const saveState = this.buildSaveState();

		return {
			...saveState,
			mapId: nextMap.id,
			player: {
				...saveState.player,
				x: arrival?.x ?? nextMap.spawn.x,
				y: arrival?.y ?? nextMap.spawn.y,
				facing: arrival?.facing ?? nextMap.spawnDirection
			}
		};
	}

	private consumeHeal() {
		const maxHp = this.getMaxHp();

		if (this.healCharges < 1) {
			this.publishHudState('No heal charges left');
			return;
		}

		if (this.playerProgress.hp >= maxHp) {
			this.publishHudState('HP already full');
			return;
		}

		this.healCharges -= 1;
		this.playerProgress = {
			...this.playerProgress,
			hp: Math.min(maxHp, this.playerProgress.hp + 8)
		};
		this.publishHudState('Recovered HP');
	}

	private finishEncounter() {
		if (!this.enemy) {
			return;
		}

		this.enemy.defeated = true;
		this.enemyMarker?.setVisible(false);
		this.enemyHealthBarBg?.setVisible(false);
		this.enemyHealthBarFill?.setVisible(false);
		this.clearedEncounterIds.add(this.enemy.definition.id);
		this.playerProgress = this.applyReward(this.enemy.definition.xpReward);

		if (this.enemy.completion === 'victory') {
			this.showVictoryState();
			this.publishHudState('Victory: ruins cleared');
			return;
		}

		this.publishHudState('Enemy defeated');
	}

	private getMaxHp() {
		return this.playerProgress.level > 1 ? startingPlayer.baseHp + 4 : startingPlayer.baseHp;
	}

	private handleHudCommand(command: HudCommand) {
		if (command === 'pause-game') {
			this.simulationPaused = true;
			return;
		}

		if (command === 'resume-game') {
			this.simulationPaused = false;
			return;
		}

		if (command === 'heal') {
			this.consumeHeal();
			return;
		}

		if (command === 'resume') {
			this.resumeStoredSave();
			return;
		}

		this.saveCurrentState();
	}

	private publishHudState(status: string) {
		const saveResult = loadStoredSaveResult();

		emitHudState({
			ready: true,
			mapId: this.mapId,
			hp: this.playerProgress.hp,
			maxHp: this.getMaxHp(),
			level: this.playerProgress.level,
			xp: this.playerProgress.xp,
			attack: this.playerProgress.attack,
			heals: this.healCharges,
			canResume: saveResult.status === 'loaded',
			status
		});
	}

	private registerStarterPackFrames() {
		const texture = this.textures.get(starterPackAsset.key);

		for (const [frameName, frame] of Object.entries(starterPackAsset.frames)) {
			if (!texture.has(frameName)) {
				texture.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);
			}
		}
	}

	private renderGround(map: WorldMapDefinition) {
		const baseFrame = getGroundFrameName(map.id);

		for (let row = 0; row < map.height; row += 1) {
			for (let column = 0; column < map.width; column += 1) {
				let frame = baseFrame;

				if (map.id === openingMapId && row === 2 && column >= 2 && column <= 11) {
					frame = 'pathTile';
				}

				this.add
					.image(
						column * WorldScene.tileSize + WorldScene.tileSize / 2,
						row * WorldScene.tileSize + WorldScene.tileSize / 2,
						starterPackAsset.key,
						frame
					)
					.setDisplaySize(WorldScene.tileSize, WorldScene.tileSize);
			}
		}
	}

	private getEnemyMoveSpeed() {
		if (!this.enemy) {
			return 0;
		}

		if (this.enemy.definition.boss && this.enemy.phase === 2) {
			return this.enemy.definition.moveSpeed * 1.5;
		}

		return this.enemy.definition.moveSpeed;
	}

	private renderTransitions(map: WorldMapDefinition) {
		for (const transition of map.transitions) {
			this.add
				.image(transition.x, transition.y, starterPackAsset.key, 'doorwayTile')
				.setDisplaySize(40, 40);
		}
	}

	private resolveFacing(direction: { x: number; y: number }, fallback: Direction): Direction {
		if (direction.x > 0) return 'right';
		if (direction.x < 0) return 'left';
		if (direction.y > 0) return 'down';
		if (direction.y < 0) return 'up';
		return fallback;
	}

	private resolveMap(mapId?: string): WorldMapDefinition {
		return maps[mapId ?? openingMapId] ?? maps[openingMapId];
	}

	private resumeStoredSave() {
		const storedSave = loadStoredSaveResult();

		if (storedSave.status === 'missing') {
			this.publishHudState('No save found');
			return;
		}

		if (storedSave.status === 'invalid') {
			this.scene.restart({ mapId: openingMapId, reason: 'invalid-save' });
			return;
		}

		this.scene.restart({ saveState: storedSave.saveState, reason: 'resume' });
	}

	private saveCurrentState() {
		saveGameState(this.buildSaveState());
		this.publishHudState('Saved');
	}

	private setupEncounter(map: WorldMapDefinition) {
		const encounter = map.encounter;

		if (!encounter) {
			return;
		}

		const definition = enemies[encounter.enemyId];
		const isCleared = this.clearedEncounterIds.has(definition.id);
		this.enemy = {
			completion: encounter.completion,
			defeated: isCleared,
			definition,
			attackCooldownUntil: 0,
			hp: isCleared ? 0 : definition.baseHp,
			invulnerableUntil: 0,
			maxHp: definition.baseHp,
			phase: 1,
			x: encounter.x,
			y: encounter.y
		};
		this.enemyMarker = this.add.image(
			encounter.x,
			encounter.y,
			starterPackAsset.key,
			getEnemyFrameName(encounter.enemyId)
		) as EnemyMarker;
		this.enemyMarker.setDisplaySize(
			encounter.enemyId === 'ruins-warden' ? 80 : 44,
			encounter.enemyId === 'ruins-warden' ? 96 : 44
		);
		this.enemyMarker.x = encounter.x;
		this.enemyMarker.y = encounter.y;
		this.enemyHealthBarBg = this.add.rectangle(
			encounter.x,
			encounter.y - WorldScene.enemyHealthBarOffsetY,
			34,
			4,
			0x0f172a,
			0.92
		) as OverlayMarker;
		this.enemyHealthBarFill = this.add.rectangle(
			encounter.x,
			encounter.y - WorldScene.enemyHealthBarOffsetY,
			30,
			2,
			0xff5d8f,
			1
		) as OverlayMarker;
		this.updateEnemyHealthBar();

		if (isCleared) {
			this.enemyMarker.setVisible(false);
			this.enemyHealthBarBg?.setVisible(false);
			this.enemyHealthBarFill?.setVisible(false);

			if (encounter.completion === 'victory') {
				this.showVictoryState();
			}
		}
	}

	private resolveInitialStatus(reason: NonNullable<WorldSceneData['reason']>) {
		if (reason === 'resume') return 'Save resumed';
		if (reason === 'transition') return 'Entered area';
		if (reason === 'invalid-save') return 'Invalid save reset';
		return 'New run';
	}

	private showVictoryState() {
		if (this.victoryAchieved) {
			return;
		}

		this.victoryAchieved = true;
		this.add.rectangle(
			this.worldSize.width / 2,
			this.worldSize.height / 2,
			this.worldSize.width,
			this.worldSize.height,
			0x0f172a,
			0.78
		);
		this.add
			.text(this.worldSize.width / 2, this.worldSize.height / 2, 'Victory: ruins cleared', {
				color: '#f8fafc',
				fontSize: '28px'
			})
			.setOrigin(0.5);
	}

	private tryTransition() {
		if (!this.player || (this.enemy && !this.enemy.defeated)) {
			return false;
		}

		const map = this.resolveMap(this.mapId);

		for (const transition of map.transitions) {
			const distance = Phaser.Math.Distance.Between(
				this.player.x,
				this.player.y,
				transition.x,
				transition.y
			);

			if (distance <= WorldScene.playerRadius + WorldScene.transitionRadius) {
				this.scene.restart({
					saveState: this.buildTransitionSaveState(transition),
					reason: 'transition'
				});
				return true;
			}
		}

		return false;
	}

	private updateBossPhase() {
		if (!this.enemy?.definition.boss) {
			return;
		}

		const nextState = advanceBossPhase({
			phase: this.enemy.phase,
			hp: this.enemy.hp,
			maxHp: this.enemy.maxHp
		});

		if (nextState.phase === this.enemy.phase) {
			return;
		}

		this.enemy.phase = nextState.phase;
		this.enemyMarker?.setTint(this.enemy.definition.boss.phaseTwoColor);
		this.publishHudState('Boss enraged');
	}

	private updateEnemyBehavior(time: number, delta: number) {
		if (!this.player || !this.enemy || this.enemy.defeated) {
			return;
		}

		const distanceToPlayer = Phaser.Math.Distance.Between(
			this.player.x,
			this.player.y,
			this.enemy.x,
			this.enemy.y
		);

		if (distanceToPlayer > 0) {
			const chaseStep = this.getEnemyMoveSpeed() * (Math.min(delta, WorldScene.maxMovementDeltaMs) / 1000);
			const chaseDistance = Math.min(chaseStep, Math.max(0, distanceToPlayer - WorldScene.enemyRadius));
			const directionX = (this.player.x - this.enemy.x) / distanceToPlayer;
			const directionY = (this.player.y - this.enemy.y) / distanceToPlayer;

			this.enemy.x += directionX * chaseDistance;
			this.enemy.y += directionY * chaseDistance;
			if (this.enemyMarker) {
				this.enemyMarker.x = this.enemy.x;
				this.enemyMarker.y = this.enemy.y;
			}
			this.updateEnemyHealthBar();
		}

		const contactDistance = Phaser.Math.Distance.Between(
			this.player.x,
			this.player.y,
			this.enemy.x,
			this.enemy.y
		);

		if (
			contactDistance > WorldScene.playerRadius + WorldScene.enemyRadius ||
			time < this.enemy.attackCooldownUntil ||
			time < this.playerInvulnerableUntil
		) {
			return;
		}

		this.playerProgress = {
			...this.playerProgress,
			hp: resolveHit(
				{ hp: this.playerProgress.hp, defense: 0 },
				{ power: this.enemy.definition.baseAttack }
			).hp
		};
		this.enemy.attackCooldownUntil = time + (this.enemy.definition.boss ? 450 : 700);
		this.playerInvulnerableUntil = time + 500;
		this.publishHudState(this.playerProgress.hp === 0 ? 'Hero down' : 'Enemy struck first');
	}

	private getAttackFlashPosition() {
		if (!this.player) {
			return { x: 0, y: 0 };
		}

		if (this.facing === 'left') {
			return { x: this.player.x - 20, y: this.player.y };
		}

		if (this.facing === 'right') {
			return { x: this.player.x + 20, y: this.player.y };
		}

		if (this.facing === 'up') {
			return { x: this.player.x, y: this.player.y - 20 };
		}

		return { x: this.player.x, y: this.player.y + 20 };
	}

	private showAttackFlash() {
		if (!this.player) {
			return;
		}

		if (!this.attackFlash) {
			this.attackFlash = this.add.rectangle(this.player.x, this.player.y, 18, 18, 0xfff0a8, 0.82) as OverlayMarker;
		}

		const { x, y } = this.getAttackFlashPosition();
		this.attackFlash.setPosition(x, y);
		this.attackFlash.setVisible(true);
	}

	private updateEnemyHealthBar() {
		if (!this.enemy || !this.enemyHealthBarBg || !this.enemyHealthBarFill) {
			return;
		}

		if (this.enemy.defeated) {
			this.enemyHealthBarBg.setVisible(false);
			this.enemyHealthBarFill.setVisible(false);
			return;
		}

		const hpRatio = Math.max(0, this.enemy.hp / Math.max(this.enemy.maxHp, 1));
		const x = this.enemy.x;
		const y = this.enemy.y - WorldScene.enemyHealthBarOffsetY;

		this.enemyHealthBarBg.setPosition(x, y);
		this.enemyHealthBarFill.setPosition(x, y);
		this.enemyHealthBarBg.setVisible(true);
		this.enemyHealthBarFill.setVisible(true);
		this.enemyHealthBarFill.setScale(hpRatio, 1);
	}
}
