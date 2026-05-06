import * as Phaser from 'phaser';
import {
	animationPackAsset,
	npcPackAsset,
	starterPackAsset,
	villageBuildingAsset
} from '$lib/game/content/assets';
import { openingMapId } from '$lib/game/content/maps';
import { WorldScene } from './WorldScene';

export class BootScene extends Phaser.Scene {
	static readonly key = 'boot';

	constructor() {
		super(BootScene.key);
	}

	preload() {
		this.load.image(starterPackAsset.key, starterPackAsset.path);
		this.load.image(animationPackAsset.key, animationPackAsset.path);
		this.load.image(npcPackAsset.key, npcPackAsset.path);
		this.load.image(villageBuildingAsset.key, villageBuildingAsset.path);
	}

	create() {
		this.scene.start(WorldScene.key, { mapId: openingMapId });
	}
}
