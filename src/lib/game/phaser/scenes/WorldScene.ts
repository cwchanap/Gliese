import Phaser from 'phaser';
import { maps, type WorldMapDefinition } from '$lib/game/content/maps';

interface WorldSceneData {
	mapId?: string;
}

const BaseScene = Phaser.Scene ?? class {};

export class WorldScene extends BaseScene {
	static readonly key = 'world';

	constructor() {
		super(WorldScene.key);
	}

	create(data: WorldSceneData = {}) {
		const map = this.resolveMap(data.mapId);
		const tileSize = 32;
		const width = map.width * tileSize;
		const height = map.height * tileSize;

		this.add.rectangle(width / 2, height / 2, width, height, 0x5d7a3a);
		this.add.circle(map.spawn.x, map.spawn.y, 12, 0x4da6ff);

		const hostileTransition = map.transitions[0];

		if (hostileTransition) {
			this.add.rectangle(hostileTransition.x, hostileTransition.y, 20, 20, 0x8b2f2f);
		}

		this.cameras.main.setBackgroundColor('#1a1f2b');
	}

	private resolveMap(mapId?: string): WorldMapDefinition {
		return maps[mapId ?? 'meadow-entry'] ?? maps['meadow-entry'];
	}
}
