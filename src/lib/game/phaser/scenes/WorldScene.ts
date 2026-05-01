import * as Phaser from 'phaser';

import {
	getEnemyFrameName,
	getGroundFrameName,
	starterPackAsset
} from '$lib/game/content/assets';
import { enemies, type EnemyCombatDefinition } from '$lib/game/content/enemies';
import { maps, openingMapId, type WorldMapDefinition } from '$lib/game/content/maps';
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
	private static readonly attackReach = 24;
	private static readonly attackWindowMs = 150;
	private static readonly enemyInvulnerabilityMs = 250;
	private static readonly enemyRadius = 10;
	private static readonly maxMovementDeltaMs = 250;
	private static readonly playerRadius = 12;
	private static readonly tileSize = 32;
	private static readonly transitionRadius = 18;

	private attackKey?: DirectionKey;
	private attackWindowUntil = 0;
	private clearedEncounterIds = new Set<string>();
	private cursorKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;
	private enemy?: EnemyInstance;
	private enemyMarker?: EnemyMarker;
	private facing: Direction = 'down';
	private healCharges = 1;
	private mapId = openingMapId;
	private player?: Phaser.GameObjects.Image;
	private playerInvulnerableUntil = 0;
	private playerProgress: ProgressionState = {
		level: 1,
		xp: 0,
		hp: startingPlayer.baseHp,
		attack: startingPlayer.baseAttack
	};
	private removeHudCommandListener = () => {};
	private victoryAchieved = false;
	private wasAttackKeyDown = false;
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

		this.attackWindowUntil = 0;
		this.clearedEncounterIds = new Set(activeSave?.flags.clearedEncounters ?? []);
		this.enemy = undefined;
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
		this.victoryAchieved = false;
		this.wasAttackKeyDown = false;
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
		this.attackKey = this.input?.keyboard?.addKey?.(Phaser.Input.Keyboard.KeyCodes.SPACE);
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

		const isAttackPressed = Boolean(this.attackKey?.isDown);

		if (isAttackPressed && !this.wasAttackKeyDown && time >= this.attackWindowUntil) {
			this.attackWindowUntil = time + WorldScene.attackWindowMs;
		}
		this.wasAttackKeyDown = isAttackPressed;

		if (this.enemy && !this.enemy.defeated && time < this.attackWindowUntil) {
			const distanceToEnemy = Phaser.Math.Distance.Between(
				this.player.x,
				this.player.y,
				this.enemy.x,
				this.enemy.y
			);

			if (
				distanceToEnemy <=
					WorldScene.playerRadius + WorldScene.enemyRadius + WorldScene.attackReach &&
				canReceiveHit(this.enemy, time)
			) {
				this.enemy.hp = resolveHit(
					{ hp: this.enemy.hp, defense: 0 },
					{ power: this.playerProgress.attack }
				).hp;
				this.enemy.invulnerableUntil = time + WorldScene.enemyInvulnerabilityMs;
				this.updateBossPhase();

				if (this.enemy.hp === 0) {
					this.finishEncounter();
				}
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

	private buildTransitionSaveState(toMapId: string): SaveState {
		const nextMap = this.resolveMap(toMapId);
		const saveState = this.buildSaveState();

		return {
			...saveState,
			mapId: nextMap.id,
			player: {
				...saveState.player,
				x: nextMap.spawn.x,
				y: nextMap.spawn.y,
				facing: nextMap.spawnDirection
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

		if (isCleared) {
			this.enemyMarker.setVisible(false);

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
					saveState: this.buildTransitionSaveState(transition.toMapId),
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
}
