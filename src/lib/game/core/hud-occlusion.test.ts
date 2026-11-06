import { describe, expect, it } from 'vitest';

import { HERO_CARD_ZONE, isHeroInHeroCardZone } from './hud-occlusion';

describe('isHeroInHeroCardZone', () => {
	it('flags the baseline overlap captures inside the top-left envelope', () => {
		// Task-0 measurements at the three probed breakpoints:
		// 1280×800 NW bedroom corner, 640×480 compact, 420×760 portrait.
		expect(isHeroInHeroCardZone(370, 192)).toBe(true);
		expect(isHeroInHeroCardZone(84, 80)).toBe(true);
		expect(isHeroInHeroCardZone(84, 176)).toBe(true);
		expect(isHeroInHeroCardZone(0, 0)).toBe(true);
	});

	it('stays inside up to but not including the envelope edge', () => {
		expect(isHeroInHeroCardZone(HERO_CARD_ZONE.width - 1, HERO_CARD_ZONE.height - 1)).toBe(true);
		expect(isHeroInHeroCardZone(HERO_CARD_ZONE.width, HERO_CARD_ZONE.height - 1)).toBe(false);
		expect(isHeroInHeroCardZone(HERO_CARD_ZONE.width - 1, HERO_CARD_ZONE.height)).toBe(false);
	});

	it('leaves positions clear of the card untouched', () => {
		expect(isHeroInHeroCardZone(500, 300)).toBe(false);
		expect(isHeroInHeroCardZone(640, 360)).toBe(false);
		expect(isHeroInHeroCardZone(640, 100)).toBe(false);
		expect(isHeroInHeroCardZone(100, 500)).toBe(false);
	});
});
