import Phaser from 'phaser';
import { meadowEntryMap } from '$lib/game/content/maps';
import { WorldScene } from './WorldScene';

const BaseScene = Phaser.Scene ?? class {};

export class BootScene extends BaseScene {
	static readonly key = 'boot';

	constructor() {
		super(BootScene.key);
	}

	create() {
		this.scene.start(WorldScene.key, { mapId: meadowEntryMap.id });
	}
}
