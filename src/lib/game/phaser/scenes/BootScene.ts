import * as Phaser from 'phaser';
import {
	animationPackAsset,
	battleBackgroundAssets,
	coastDressingAsset,
	crossroadsDressingAsset,
	environmentDressingAsset,
	fenceDressingAsset,
	forestDressingAsset,
	interiorPropAsset,
	marshDressingAsset,
	npcPackAsset,
	shrineDressingAsset,
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
		// Phaser returns a `__MISSING` placeholder texture for failed loads rather
		// than rejecting, so a bad path silently renders the missing-texture box.
		// Log the offending key so production asset failures are diagnosable.
		this.load.on('loaderror', (file: { key?: string; src?: string }) => {
			console.error(
				`[BootScene] asset load failed: key="${file.key ?? 'unknown'}" src="${file.src ?? ''}"`
			);
		});
		this.load.image(starterPackAsset.key, starterPackAsset.path);
		this.load.image(terrainTilesAsset.key, terrainTilesAsset.path);
		this.load.image(animationPackAsset.key, animationPackAsset.path);
		this.load.image(npcPackAsset.key, npcPackAsset.path);
		this.load.image(villageBuildingAsset.key, villageBuildingAsset.path);
		this.load.image(forestDressingAsset.key, forestDressingAsset.path);
		this.load.image(fenceDressingAsset.key, fenceDressingAsset.path);
		this.load.image(interiorPropAsset.key, interiorPropAsset.path);
		this.load.image(environmentDressingAsset.key, environmentDressingAsset.path);
		this.load.image(coastDressingAsset.key, coastDressingAsset.path);
		this.load.image(shrineDressingAsset.key, shrineDressingAsset.path);
		this.load.image(marshDressingAsset.key, marshDressingAsset.path);
		this.load.image(crossroadsDressingAsset.key, crossroadsDressingAsset.path);
		for (const asset of Object.values(battleBackgroundAssets)) {
			this.load.image(asset.key, asset.path);
		}
	}

	create() {
		this.scene.start(WorldScene.key, { mapId: openingMapId });
	}
}
