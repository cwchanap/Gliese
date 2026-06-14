import { describe, expect, it } from 'vitest';

import {
	actorAnimationAssets,
	animationPackAsset,
	battleBackgroundAssets,
	coastDressingAsset,
	crossroadsDressingAsset,
	fenceDressingAsset,
	forestDressingAsset,
	getActorAnimationAsset,
	getBattleBackgroundAsset,
	getBattleEnvironmentId,
	getEnemyActorId,
	getEnemyFrameName,
	getVillageBuildingFrameName,
	interiorPropAsset,
	isNpcPackFrameName,
	marshDressingAsset,
	npcPackAsset,
	shrineDressingAsset,
	starterPackAsset,
	terrainTilesAsset,
	villageBuildingAsset,
	type ActorAnimationId,
	type ActorAnimationKey,
	type FenceDressingFrameName,
	type InteriorPropFrameName,
	type VillageBuildingFrameName
} from '$lib/game/content/assets';
import { meadowEntryMap } from '$lib/game/content/maps';

const requiredActors: ActorAnimationId[] = ['hero', 'slimeScout', 'ruinsWarden'];
const requiredClips: ActorAnimationKey[] = ['idle', 'walk', 'attack', 'dead'];
const requiredBuildingFrames: VillageBuildingFrameName[] = [
	'heroHouse',
	'guildHall',
	'itemShop',
	'villagerHouse',
	'blacksmith',
	'shrineOfAurora',
	'whisperingCave',
	'sundropWell'
];
/**
 * Allow-list of landmark ids that are genuinely village-BUILDING landmarks (the
 * ids `getVillageBuildingFrameName` resolves to a frame). New region gates and
 * non-building landmarks (e.g. `witchwood-gate`, future region gates) are simply
 * absent here, so future regions require zero edits to the building-frame test.
 */
const BUILDING_LANDMARK_IDS = new Set([
	'hero-house-exterior',
	'guild-hall-exterior',
	'item-shop-exterior',
	'villager-house-1-exterior',
	'villager-house-2-exterior',
	'villager-house-3-exterior',
	'blacksmith',
	'shrine-of-aurora',
	'whispering-cave',
	'sundrop-well'
]);
const requiredFenceFrames: FenceDressingFrameName[] = [
	'horizontalFence',
	'verticalFence',
	'fencePost',
	'gateMarker'
];
const requiredInteriorPropFrames: InteriorPropFrameName[] = [
	'bed',
	'table',
	'bench',
	'bookshelf',
	'shopCounter',
	'noticeBoard',
	'rug',
	'crateStack',
	'barrel',
	'displayShelf',
	'papers',
	'weaponRack',
	'hearthLamp',
	'plant'
];

describe('starter pack asset frames', () => {
	it('keeps hero and potion frames large enough to avoid visible cropping', () => {
		expect(starterPackAsset.frames.hero).toEqual({ x: 90, y: 80, w: 235, h: 280 });
		expect(starterPackAsset.frames.healFlask).toEqual({ x: 1210, y: 145, w: 150, h: 215 });
	});
});

describe('battle background asset metadata', () => {
	it('defines map-aware battle background assets', () => {
		expect(battleBackgroundAssets).toEqual({
			meadow: {
				key: 'battle-background-meadow',
				path: '/game/assets/battle-meadow.png'
			},
			ruins: {
				key: 'battle-background-ruins',
				path: '/game/assets/battle-ruins.png'
			},
			neutral: {
				key: 'battle-background-neutral',
				path: '/game/assets/battle-neutral.png'
			}
		});
	});

	it('maps source maps to battle environments with a neutral fallback', () => {
		expect(getBattleEnvironmentId('meadow-entry')).toBe('meadow');
		expect(getBattleEnvironmentId('ruins-threshold')).toBe('ruins');
		expect(getBattleEnvironmentId('ruins-core')).toBe('ruins');
		expect(getBattleEnvironmentId('hero-house')).toBe('neutral');
		expect(getBattleEnvironmentId('unknown-map')).toBe('neutral');
	});

	it('returns the background asset for the resolved environment', () => {
		expect(getBattleBackgroundAsset('ruins-core')).toBe(battleBackgroundAssets.ruins);
		expect(getBattleBackgroundAsset('villager-house-1')).toBe(battleBackgroundAssets.neutral);
	});
});

describe('village building asset metadata', () => {
	it('loads village building art from a fixed 4x2 sheet', () => {
		expect(villageBuildingAsset).toMatchObject({
			key: 'village-buildings',
			path: '/game/assets/village-buildings.png',
			cellWidth: 627,
			cellHeight: 627,
			columns: 4
		});
		expect(villageBuildingAsset.frames).toEqual({
			heroHouse: { x: 118, y: 116, w: 407, h: 437 },
			guildHall: { x: 627, y: 96, w: 563, h: 499 },
			itemShop: { x: 114, y: 668, w: 430, h: 445 },
			villagerHouse: { x: 688, y: 675, w: 403, h: 449 },
			blacksmith: { x: 1_254, y: 0, w: 627, h: 627 },
			shrineOfAurora: { x: 1_881, y: 0, w: 627, h: 627 },
			whisperingCave: { x: 1_254, y: 627, w: 627, h: 627 },
			sundropWell: { x: 1_881, y: 627, w: 627, h: 627 }
		});
	});

	it('maps every authored village building landmark to a building frame', () => {
		expect(getVillageBuildingFrameName('hero-house-exterior')).toBe('heroHouse');
		expect(getVillageBuildingFrameName('guild-hall-exterior')).toBe('guildHall');
		expect(getVillageBuildingFrameName('item-shop-exterior')).toBe('itemShop');
		expect(getVillageBuildingFrameName('villager-house-1-exterior')).toBe('villagerHouse');
		expect(getVillageBuildingFrameName('villager-house-2-exterior')).toBe('villagerHouse');
		expect(getVillageBuildingFrameName('villager-house-3-exterior')).toBe('villagerHouse');
		expect(getVillageBuildingFrameName('blacksmith')).toBe('blacksmith');
		expect(getVillageBuildingFrameName('shrine-of-aurora')).toBe('shrineOfAurora');
		expect(getVillageBuildingFrameName('whispering-cave')).toBe('whisperingCave');
		expect(getVillageBuildingFrameName('sundrop-well')).toBe('sundropWell');
		expect(getVillageBuildingFrameName('unknown-landmark')).toBeUndefined();

		const villageBuildingLandmarks = (meadowEntryMap.landmarks ?? []).filter((landmark) =>
			BUILDING_LANDMARK_IDS.has(landmark.id)
		);
		for (const landmark of villageBuildingLandmarks) {
			expect(requiredBuildingFrames).toContain(getVillageBuildingFrameName(landmark.id));
		}
	});
});

describe('forest dressing asset metadata', () => {
	it('loads compact forest art from a fixed 2x2 sheet', () => {
		expect(forestDressingAsset).toMatchObject({
			key: 'forest-dressing',
			path: '/game/assets/forest-dressing.png',
			cellWidth: 256,
			cellHeight: 256,
			columns: 2
		});
		expect(forestDressingAsset.frames).toEqual({
			treeCluster: { x: 0, y: 0, w: 256, h: 256 },
			brush: { x: 256, y: 0, w: 256, h: 256 },
			forestFloor: { x: 0, y: 256, w: 256, h: 256 },
			forestEntrance: { x: 256, y: 256, w: 256, h: 256 }
		});
	});

	it('covers every meadow forest decor frame reference', () => {
		for (const decor of meadowEntryMap.mapDecor ?? []) {
			if (decor.textureKey === forestDressingAsset.key) {
				expect(forestDressingAsset.frames).toHaveProperty(decor.frameName);
			}
		}
	});
});

describe('fence dressing asset metadata', () => {
	it('loads generated fence art from a fixed 2x2 sheet', () => {
		expect(fenceDressingAsset).toMatchObject({
			key: 'fence-dressing',
			path: '/game/assets/fence-dressing.png',
			cellWidth: 256,
			cellHeight: 256,
			columns: 2
		});
		expect(fenceDressingAsset.frames).toEqual({
			horizontalFence: { x: 0, y: 0, w: 256, h: 256 },
			verticalFence: { x: 256, y: 0, w: 256, h: 256 },
			fencePost: { x: 0, y: 256, w: 256, h: 256 },
			gateMarker: { x: 256, y: 256, w: 256, h: 256 }
		});
		expect(Object.keys(fenceDressingAsset.frames)).toEqual(requiredFenceFrames);
	});
});

describe('interior prop asset metadata', () => {
	it('loads reusable interior props from a 4-column sprite sheet with 14 prop frames', () => {
		expect(interiorPropAsset).toMatchObject({
			key: 'interior-props',
			path: '/game/assets/interior-props.png',
			cellWidth: 128,
			cellHeight: 128,
			columns: 4
		});
		expect(interiorPropAsset.frames).toEqual({
			bed: { x: 0, y: 0, w: 128, h: 128 },
			table: { x: 128, y: 0, w: 128, h: 128 },
			bench: { x: 256, y: 0, w: 128, h: 128 },
			bookshelf: { x: 384, y: 0, w: 128, h: 128 },
			shopCounter: { x: 0, y: 128, w: 128, h: 128 },
			noticeBoard: { x: 128, y: 128, w: 128, h: 128 },
			rug: { x: 256, y: 128, w: 128, h: 128 },
			crateStack: { x: 384, y: 128, w: 128, h: 128 },
			barrel: { x: 0, y: 256, w: 128, h: 128 },
			displayShelf: { x: 128, y: 256, w: 128, h: 128 },
			papers: { x: 256, y: 256, w: 128, h: 128 },
			weaponRack: { x: 384, y: 256, w: 128, h: 128 },
			hearthLamp: { x: 0, y: 384, w: 128, h: 128 },
			plant: { x: 128, y: 384, w: 128, h: 128 }
		});
		expect(Object.keys(interiorPropAsset.frames)).toEqual(requiredInteriorPropFrames);
	});
});

describe('npc pack metadata', () => {
	it('defines fixed-cell shopkeeper sprites separate from the starter sheet', () => {
		expect(npcPackAsset).toMatchObject({
			key: 'npc-pack',
			path: '/game/assets/npc-pack.png',
			cellWidth: 96,
			cellHeight: 96
		});
		expect(npcPackAsset.frames).toEqual({
			miraItemShopNpc: { x: 0, y: 0, w: 96, h: 96 },
			quartermasterNpc: { x: 96, y: 0, w: 96, h: 96 },
			guildMasterNpc: { x: 192, y: 0, w: 96, h: 96 },
			fisherNpc: { x: 288, y: 0, w: 96, h: 96 },
			travelerNpc: { x: 384, y: 0, w: 96, h: 96 },
			pilgrimNpc: { x: 480, y: 0, w: 96, h: 96 },
			woodcutterNpc: { x: 576, y: 0, w: 96, h: 96 },
			crierNpc: { x: 672, y: 0, w: 96, h: 96 }
		});
		expect(isNpcPackFrameName('miraItemShopNpc')).toBe(true);
		expect(isNpcPackFrameName('quartermasterNpc')).toBe(true);
		expect(isNpcPackFrameName('guildMasterNpc')).toBe(true);
		expect(isNpcPackFrameName('titleBadge')).toBe(false);
	});

	it('includes ambient NPC frames to the right of the shopkeeper sprites', () => {
		expect(isNpcPackFrameName('fisherNpc')).toBe(true);
		expect(isNpcPackFrameName('travelerNpc')).toBe(true);
		expect(isNpcPackFrameName('pilgrimNpc')).toBe(true);
		expect(isNpcPackFrameName('woodcutterNpc')).toBe(true);
		expect(isNpcPackFrameName('crierNpc')).toBe(true);
	});
});

describe('animation pack metadata', () => {
	it('loads actor animation art from a companion sheet', () => {
		expect(animationPackAsset).toMatchObject({
			key: 'animation-pack',
			path: '/game/assets/animation-pack.png',
			cellWidth: 192,
			cellHeight: 192,
			columns: 4
		});
	});

	it('defines all required actor clips with valid frame references', () => {
		for (const actorId of requiredActors) {
			const actor = actorAnimationAssets[actorId];
			expect(actor.displaySize.width).toBeGreaterThan(0);
			expect(actor.displaySize.height).toBeGreaterThan(0);

			for (const clipName of requiredClips) {
				const clip = actor.clips[clipName];
				expect(clip.key).toBe(`${actorId}-${clipName}`);
				expect(clip.frameRate).toBeGreaterThan(0);
				expect(clip.frames).toHaveLength(4);

				for (const frameName of clip.frames) {
					expect(animationPackAsset.frames[frameName]).toEqual(
						expect.objectContaining({
							x: expect.any(Number),
							y: expect.any(Number),
							w: 192,
							h: 192
						})
					);
				}
			}
		}
	});

	it('maps enemies to their actor animation definitions', () => {
		expect(getEnemyActorId('slime-scout')).toBe('slimeScout');
		expect(getEnemyActorId('ruins-warden')).toBe('ruinsWarden');
		expect(getActorAnimationAsset('hero')).toBe(actorAnimationAssets.hero);
	});

	it('maps enemies to their starter pack frame names', () => {
		expect(getEnemyFrameName('ruins-warden')).toBe('ruinsWarden');
		expect(getEnemyFrameName('slime-scout')).toBe('slimeScout');
		expect(getEnemyFrameName('unknown-enemy')).toBe('slimeScout');
	});

	it('keeps the hero attack clip free of baked hit arcs', () => {
		expect(actorAnimationAssets.hero.clips.attack.frames).toEqual(
			actorAnimationAssets.hero.clips.walk.frames
		);
	});
});

describe('terrainTilesAsset', () => {
	const required = [
		'grassTile',
		'pathTile',
		'ruinsFloorTile',
		'stoneWallTile',
		'seaTile',
		'sandTile',
		'marshMudTile',
		'autumnLeafTile',
		'cobblestoneTile'
	] as const;

	it('declares every required ground tile', () => {
		for (const name of required) {
			expect(terrainTilesAsset.frames).toHaveProperty(name);
		}
	});

	it('keeps every frame inside the sheet bounds', () => {
		const cols = terrainTilesAsset.columns;
		const rows = terrainTilesAsset.rows;
		const sheetWidth = cols * terrainTilesAsset.cellWidth;
		const sheetHeight = rows * terrainTilesAsset.cellHeight;
		for (const frame of Object.values(terrainTilesAsset.frames)) {
			expect(frame.x).toBeGreaterThanOrEqual(0);
			expect(frame.y).toBeGreaterThanOrEqual(0);
			expect(frame.x + frame.w).toBeLessThanOrEqual(sheetWidth);
			expect(frame.y + frame.h).toBeLessThanOrEqual(sheetHeight);
		}
	});
});

describe('coastDressingAsset', () => {
	it('declares the coastal props', () => {
		for (const name of [
			'torii',
			'ferryShrine',
			'fishingBoat',
			'fishingNet',
			'tidePool',
			'driftwood',
			'jetty',
			'shorelineFoam'
		]) {
			expect(coastDressingAsset.frames).toHaveProperty(name);
		}
	});
});

describe('shrineDressingAsset', () => {
	it('declares the shrine props', () => {
		for (const name of [
			'silverShrineGate',
			'stoneLantern',
			'offeringStand',
			'amuletRack',
			'silverpine',
			'autumnMaple'
		]) {
			expect(shrineDressingAsset.frames).toHaveProperty(name);
		}
	});
});

describe('marshDressingAsset', () => {
	it('declares the marsh props', () => {
		for (const name of ['witchwoodGate', 'deadTree', 'toxicBloom', 'reeds', 'marshRock', 'fog']) {
			expect(marshDressingAsset.frames).toHaveProperty(name);
		}
	});
});

describe('crossroadsDressingAsset', () => {
	it('declares the crossroads props', () => {
		for (const name of [
			'castleGate',
			'waystone',
			'hangingLantern',
			'poleLantern',
			'festivalBanner',
			'marketStall',
			'flowerBed'
		]) {
			expect(crossroadsDressingAsset.frames).toHaveProperty(name);
		}
	});
});
