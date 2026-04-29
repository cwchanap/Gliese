import * as Phaser from 'phaser';
import { openingMapId } from '$lib/game/content/maps';
import { WorldScene } from './WorldScene';

export class BootScene extends Phaser.Scene {
	static readonly key = 'boot';

	constructor() {
		super(BootScene.key);
	}

	create() {
		this.scene.start(WorldScene.key, { mapId: openingMapId });
	}
}
