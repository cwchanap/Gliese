import { describe, expect, it } from 'vitest';

import {
	actorAnimationAssets,
	animationPackAsset,
	getActorAnimationAsset,
	getEnemyActorId,
	starterPackAsset,
	type ActorAnimationId,
	type ActorAnimationKey
} from '$lib/game/content/assets';

const requiredActors: ActorAnimationId[] = ['hero', 'slimeScout', 'ruinsWarden'];
const requiredClips: ActorAnimationKey[] = ['idle', 'walk', 'attack', 'dead'];

describe('starter pack asset frames', () => {
	it('keeps hero and potion frames large enough to avoid visible cropping', () => {
		expect(starterPackAsset.frames.hero).toEqual({ x: 90, y: 80, w: 235, h: 280 });
		expect(starterPackAsset.frames.healFlask).toEqual({ x: 1210, y: 145, w: 150, h: 215 });
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
						expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), w: 192, h: 192 })
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
});
