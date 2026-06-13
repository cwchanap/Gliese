import * as Phaser from 'phaser';
import {
	animationPackAsset,
	battleBackgroundAssets,
	environmentDressingAsset,
	fenceDressingAsset,
	forestDressingAsset,
	interiorPropAsset,
	npcPackAsset,
	starterPackAsset,
	terrainTilesAsset,
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
		this.load.image(terrainTilesAsset.key, terrainTilesAsset.path);
		this.load.image(animationPackAsset.key, animationPackAsset.path);
		this.load.image(npcPackAsset.key, npcPackAsset.path);
		this.load.image(villageBuildingAsset.key, villageBuildingAsset.path);
		this.load.image(forestDressingAsset.key, forestDressingAsset.path);
		this.load.image(fenceDressingAsset.key, fenceDressingAsset.path);
		this.load.image(interiorPropAsset.key, interiorPropAsset.path);
		this.load.image(environmentDressingAsset.key, environmentDressingAsset.path);
		for (const asset of Object.values(battleBackgroundAssets)) {
			this.load.image(asset.key, asset.path);
		}
	}

	create() {
		this.scene.start(WorldScene.key, { mapId: openingMapId });
	}
}
