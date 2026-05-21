import { describe, expect, it } from 'vitest';

import {
	actorAnimationAssets,
	animationPackAsset,
	fenceDressingAsset,
	forestDressingAsset,
	getActorAnimationAsset,
	getEnemyActorId,
	getVillageBuildingFrameName,
	isNpcPackFrameName,
	npcPackAsset,
	starterPackAsset,
	villageBuildingAsset,
	type ActorAnimationId,
	type ActorAnimationKey,
	type FenceDressingFrameName,
	type ForestDressingFrameName,
	type VillageBuildingFrameName
} from '$lib/game/content/assets';
import { meadowEntryMap } from '$lib/game/content/maps';

const requiredActors: ActorAnimationId[] = ['hero', 'slimeScout', 'ruinsWarden'];
const requiredClips: ActorAnimationKey[] = ['idle', 'walk', 'attack', 'dead'];
const requiredBuildingFrames: VillageBuildingFrameName[] = [
	'heroHouse',
	'guildHall',
	'itemShop',
	'villagerHouse'
];
const requiredForestFrames: ForestDressingFrameName[] = [
	'treeCluster',
	'brush',
	'forestFloor',
	'forestEntrance'
];
const requiredFenceFrames: FenceDressingFrameName[] = [
	'horizontalFence',
	'verticalFence',
	'fencePost',
	'gateMarker'
];

describe('starter pack asset frames', () => {
	it('keeps hero and potion frames large enough to avoid visible cropping', () => {
		expect(starterPackAsset.frames.hero).toEqual({ x: 90, y: 80, w: 235, h: 280 });
		expect(starterPackAsset.frames.healFlask).toEqual({ x: 1210, y: 145, w: 150, h: 215 });
	});
});

describe('village building asset metadata', () => {
	it('loads village building art from a fixed 2x2 sheet', () => {
		expect(villageBuildingAsset).toMatchObject({
			key: 'village-buildings',
			path: '/game/assets/village-buildings.png',
			cellWidth: 627,
			cellHeight: 627,
			columns: 2
		});
		expect(villageBuildingAsset.frames).toEqual({
			heroHouse: { x: 118, y: 116, w: 407, h: 437 },
			guildHall: { x: 627, y: 96, w: 563, h: 499 },
			itemShop: { x: 114, y: 668, w: 430, h: 445 },
			villagerHouse: { x: 688, y: 675, w: 403, h: 449 }
		});
	});

	it('maps every authored village building landmark to a building frame', () => {
		expect(getVillageBuildingFrameName('hero-house-exterior')).toBe('heroHouse');
		expect(getVillageBuildingFrameName('guild-hall-exterior')).toBe('guildHall');
		expect(getVillageBuildingFrameName('item-shop-exterior')).toBe('itemShop');
		expect(getVillageBuildingFrameName('villager-house-1-exterior')).toBe('villagerHouse');
		expect(getVillageBuildingFrameName('villager-house-2-exterior')).toBe('villagerHouse');
		expect(getVillageBuildingFrameName('villager-house-3-exterior')).toBe('villagerHouse');
		expect(getVillageBuildingFrameName('unknown-landmark')).toBeUndefined();

		for (const landmark of meadowEntryMap.landmarks ?? []) {
			if (!landmark.id.endsWith('-exterior')) {
				expect(getVillageBuildingFrameName(landmark.id)).toBeUndefined();
				continue;
			}

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
		for (const decor of meadowEntryMap.forestDecor ?? []) {
			expect(requiredForestFrames).toContain(decor.frameName);
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
			guildMasterNpc: { x: 192, y: 0, w: 96, h: 96 }
		});
		expect(isNpcPackFrameName('miraItemShopNpc')).toBe(true);
		expect(isNpcPackFrameName('quartermasterNpc')).toBe(true);
		expect(isNpcPackFrameName('guildMasterNpc')).toBe(true);
		expect(isNpcPackFrameName('titleBadge')).toBe(false);
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

	it('keeps the hero attack clip free of baked hit arcs', () => {
		expect(actorAnimationAssets.hero.clips.attack.frames).toEqual(
			actorAnimationAssets.hero.clips.walk.frames
		);
	});
});
