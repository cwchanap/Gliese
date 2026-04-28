import Phaser from 'phaser';
import { maps, openingMapId, type WorldMapDefinition } from '$lib/game/content/maps';
import { enemies, type EnemyCombatDefinition } from '$lib/game/content/enemies';
import { startingPlayer } from '$lib/game/content/player';
import { canReceiveHit, resolveHit } from '$lib/game/core/combat';
import { resolveMovementVector } from '$lib/game/core/input';
import { applyExperienceGain, type ProgressionState } from '$lib/game/core/progression';

interface WorldSceneData {
	mapId?: string;
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
	private worldSize = { width: 0, height: 0 };

	constructor() {
		super(WorldScene.key);
	}

	create(data: WorldSceneData = {}) {
		const map = this.resolveMap(data.mapId);
		const width = map.width * WorldScene.tileSize;
		const height = map.height * WorldScene.tileSize;
		this.worldSize = { width, height };
		this.attackWindowUntil = 0;
		this.playerProgress = {
			level: 1,
			xp: 0,
			hp: startingPlayer.baseHp,
			attack: startingPlayer.baseAttack
		};
		this.enemy = undefined;
		this.enemyMarker = undefined;
		this.wasAttackKeyDown = false;

		this.add.rectangle(width / 2, height / 2, width, height, 0x5d7a3a);
		this.player = this.add.circle(
			map.spawn.x,
			map.spawn.y,
			WorldScene.playerRadius,
			0x4da6ff
		) as Phaser.GameObjects.Arc;

		const hostileTransition = map.transitions.find((transition) => transition.hostile);

		if (hostileTransition) {
			this.add.rectangle(hostileTransition.x, hostileTransition.y, 20, 20, 0x8b2f2f);
			const encounter = enemies['slime-scout'];
			this.enemy = {
				definition: encounter,
				x: hostileTransition.x,
				y: hostileTransition.y,
				hp: encounter.baseHp,
				invulnerableUntil: 0,
				defeated: false
			};
			this.enemyMarker = this.add.rectangle(
				hostileTransition.x,
				hostileTransition.y,
				WorldScene.enemyRadius * 2,
				WorldScene.enemyRadius * 2,
				0x7cff6b
			);
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
}
