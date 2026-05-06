import { describe, expect, it } from 'vitest';

import {
	actorAnimationAssets,
	animationPackAsset,
	getActorAnimationAsset,
	getEnemyActorId,
	getVillageBuildingFrameName,
	isNpcPackFrameName,
	npcPackAsset,
	starterPackAsset,
	villageBuildingAsset,
	type ActorAnimationId,
	type ActorAnimationKey,
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

	it('maps every meadow building landmark to a building frame', () => {
		expect(getVillageBuildingFrameName('hero-house-exterior')).toBe('heroHouse');
		expect(getVillageBuildingFrameName('guild-hall-exterior')).toBe('guildHall');
		expect(getVillageBuildingFrameName('item-shop-exterior')).toBe('itemShop');
		expect(getVillageBuildingFrameName('villager-house-1-exterior')).toBe('villagerHouse');
		expect(getVillageBuildingFrameName('villager-house-2-exterior')).toBe('villagerHouse');
		expect(getVillageBuildingFrameName('villager-house-3-exterior')).toBe('villagerHouse');
		expect(getVillageBuildingFrameName('unknown-landmark')).toBeUndefined();

		for (const landmark of meadowEntryMap.landmarks ?? []) {
			expect(requiredBuildingFrames).toContain(getVillageBuildingFrameName(landmark.id));
		}
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
			quartermasterNpc: { x: 96, y: 0, w: 96, h: 96 }
		});
		expect(isNpcPackFrameName('miraItemShopNpc')).toBe(true);
		expect(isNpcPackFrameName('quartermasterNpc')).toBe(true);
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
