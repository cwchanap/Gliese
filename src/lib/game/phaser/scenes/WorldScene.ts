import Phaser from 'phaser';
import { maps, openingMapId, type WorldMapDefinition } from '$lib/game/content/maps';
import { startingPlayer } from '$lib/game/content/player';
import { resolveMovementVector } from '$lib/game/core/input';

interface WorldSceneData {
	mapId?: string;
}

type DirectionKey = {
	isDown: boolean;
};

export class WorldScene extends Phaser.Scene {
	static readonly key = 'world';
	private static readonly tileSize = 32;
	private static readonly playerRadius = 12;
	private static readonly maxMovementDeltaMs = 250;

	private player?: Phaser.GameObjects.Arc;
	private cursorKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;
	private wasdKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;
	private worldSize = { width: 0, height: 0 };

	constructor() {
		super(WorldScene.key);
	}

	create(data: WorldSceneData = {}) {
		const map = this.resolveMap(data.mapId);
		const width = map.width * WorldScene.tileSize;
		const height = map.height * WorldScene.tileSize;
		this.worldSize = { width, height };

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
	}

	update(_time: number, delta: number) {
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
	}

	private resolveMap(mapId?: string): WorldMapDefinition {
		return maps[mapId ?? openingMapId] ?? maps[openingMapId];
	}
}
