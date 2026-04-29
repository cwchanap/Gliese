import Phaser from 'phaser';
import { maps, openingMapId, type WorldMapDefinition } from '$lib/game/content/maps';
import { enemies, type EnemyCombatDefinition } from '$lib/game/content/enemies';
import { startingPlayer } from '$lib/game/content/player';
import { canReceiveHit, resolveHit } from '$lib/game/core/combat';
import { resolveMovementVector } from '$lib/game/core/input';
import { applyExperienceGain, type ProgressionState } from '$lib/game/core/progression';
import type { Direction } from '$lib/game/core/types';
import type { SaveState } from '$lib/game/save/save-state';
import { loadStoredSaveState, saveGameState } from '$lib/game/save/storage';
import { emitHudState, onHudCommand, type HudCommand } from '$lib/game/ui-bridge/events';

interface WorldSceneData {
	mapId?: string;
	saveState?: SaveState | null;
}

type DirectionKey = {
	isDown: boolean;
};

type EnemyInstance = {
	definition: EnemyCombatDefinition;
	x: number;
	y: number;
	hp: number;
	invulnerableUntil: number;
	defeated: boolean;
};

export class WorldScene extends Phaser.Scene {
	static readonly key = 'world';
	private static readonly tileSize = 32;
	private static readonly playerRadius = 12;
	private static readonly enemyRadius = 10;
	private static readonly maxMovementDeltaMs = 250;
	private static readonly attackWindowMs = 150;
	private static readonly enemyInvulnerabilityMs = 250;
	private static readonly attackReach = 24;

	private player?: Phaser.GameObjects.Arc;
	private cursorKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;
	private wasdKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;
	private attackKey?: DirectionKey;
	private wasAttackKeyDown = false;
	private enemy?: EnemyInstance;
	private enemyMarker?: { setVisible: (visible: boolean) => unknown };
	private attackWindowUntil = 0;
	private playerProgress: ProgressionState = {
		level: 1,
		xp: 0,
		hp: startingPlayer.baseHp,
		attack: startingPlayer.baseAttack
	};
	private mapId = openingMapId;
	private facing: Direction = 'down';
	private healCharges = 1;
	private worldSize = { width: 0, height: 0 };
	private removeHudCommandListener = () => {};

	constructor() {
		super(WorldScene.key);
	}

	create(data: WorldSceneData = {}) {
		const activeSave = data.saveState;
		const map = this.resolveMap(activeSave?.mapId ?? data.mapId);
		const width = map.width * WorldScene.tileSize;
		const height = map.height * WorldScene.tileSize;
		this.worldSize = { width, height };
		this.attackWindowUntil = 0;
		this.playerProgress = {
			level: activeSave?.player.level ?? 1,
			xp: activeSave?.player.xp ?? 0,
			hp: activeSave?.player.hp ?? startingPlayer.baseHp,
			attack: activeSave?.player.attack ?? startingPlayer.baseAttack
		};
		this.mapId = map.id;
		this.facing = activeSave?.player.facing ?? map.spawnDirection;
		this.healCharges = activeSave?.consumables.heals ?? 1;
		this.enemy = undefined;
		this.enemyMarker = undefined;
		this.wasAttackKeyDown = false;

		this.add.rectangle(width / 2, height / 2, width, height, 0x5d7a3a);
		this.player = this.add.circle(
			activeSave?.player.x ?? map.spawn.x,
			activeSave?.player.y ?? map.spawn.y,
			WorldScene.playerRadius,
			0x4da6ff
		) as Phaser.GameObjects.Arc;

		const hostileTransition = map.transitions.find((transition) => transition.hostile);

		if (hostileTransition) {
			this.add.rectangle(hostileTransition.x, hostileTransition.y, 20, 20, 0x8b2f2f);
			const encounter = enemies['slime-scout'];
			const isCleared = activeSave?.flags.clearedEncounters.includes(encounter.id) ?? false;
			this.enemy = {
				definition: encounter,
				x: hostileTransition.x,
				y: hostileTransition.y,
				hp: isCleared ? 0 : encounter.baseHp,
				invulnerableUntil: 0,
				defeated: isCleared
			};
			this.enemyMarker = this.add.rectangle(
				hostileTransition.x,
				hostileTransition.y,
				WorldScene.enemyRadius * 2,
				WorldScene.enemyRadius * 2,
				0x7cff6b
			);
			if (isCleared) {
				this.enemyMarker.setVisible(false);
			}
		}

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
		this.publishHudState(activeSave ? 'Save resumed' : 'New run');
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

		const step =
			startingPlayer.moveSpeed *
			(Math.min(delta, WorldScene.maxMovementDeltaMs) / 1000);
		const min = WorldScene.playerRadius;
		const maxX = this.worldSize.width - WorldScene.playerRadius;
		const maxY = this.worldSize.height - WorldScene.playerRadius;

		this.player.x = Math.min(Math.max(this.player.x + direction.x * step, min), maxX);
		this.player.y = Math.min(Math.max(this.player.y + direction.y * step, min), maxY);
		this.facing = this.resolveFacing(direction, this.facing);

		const isAttackPressed = Boolean(this.attackKey?.isDown);

		if (isAttackPressed && !this.wasAttackKeyDown && time >= this.attackWindowUntil) {
			this.attackWindowUntil = time + WorldScene.attackWindowMs;
		}
		this.wasAttackKeyDown = isAttackPressed;

		if (!this.enemy || this.enemy.defeated || time >= this.attackWindowUntil) {
			return;
		}

		const distanceToEnemy = Phaser.Math.Distance.Between(
			this.player.x,
			this.player.y,
			this.enemy.x,
			this.enemy.y
		);

		if (
			distanceToEnemy >
				WorldScene.playerRadius + WorldScene.enemyRadius + WorldScene.attackReach ||
			!canReceiveHit(this.enemy, time)
		) {
			return;
		}

		this.enemy.hp = resolveHit(
			{ hp: this.enemy.hp, defense: 0 },
			{ power: this.playerProgress.attack }
		).hp;
		this.enemy.invulnerableUntil = time + WorldScene.enemyInvulnerabilityMs;

		if (this.enemy.hp === 0) {
			this.enemy.defeated = true;
			this.enemyMarker?.setVisible(false);
			this.playerProgress = this.applyReward(this.enemy.definition.xpReward);
			this.publishHudState('Enemy defeated');
		}
	}

	private resolveMap(mapId?: string): WorldMapDefinition {
		return maps[mapId ?? openingMapId] ?? maps[openingMapId];
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

	private resumeStoredSave() {
		const storedSave = loadStoredSaveState();

		if (!storedSave) {
			this.publishHudState('No save found');
			return;
		}

		this.scene.restart({ saveState: storedSave });
	}

	private saveCurrentState() {
		saveGameState(this.buildSaveState());
		this.publishHudState('Saved');
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
				clearedEncounters: this.enemy?.defeated ? [this.enemy.definition.id] : []
			},
			consumables: {
				heals: this.healCharges
			}
		};
	}

	private publishHudState(status: string) {
		emitHudState({
			ready: true,
			mapId: this.mapId,
			hp: this.playerProgress.hp,
			maxHp: this.getMaxHp(),
			level: this.playerProgress.level,
			xp: this.playerProgress.xp,
			attack: this.playerProgress.attack,
			heals: this.healCharges,
			canResume: Boolean(loadStoredSaveState()),
			status
		});
	}

	private getMaxHp() {
		return this.playerProgress.level > 1 ? startingPlayer.baseHp + 4 : startingPlayer.baseHp;
	}

	private resolveFacing(
		direction: { x: number; y: number },
		fallback: Direction
	): Direction {
		if (direction.x > 0) return 'right';
		if (direction.x < 0) return 'left';
		if (direction.y > 0) return 'down';
		if (direction.y < 0) return 'up';
		return fallback;
	}
}
