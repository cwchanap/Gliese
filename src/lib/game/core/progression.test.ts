import { describe, expect, it } from 'vitest';
import { applyExperienceGain, getXpForLevel } from '$lib/game/core/progression';

describe('progression rules', () => {
	it('keeps the hero at level 1 below threshold', () => {
		expect(applyExperienceGain({ level: 1, xp: 0, hp: 20, attack: 3 }, 4)).toEqual({
			level: 1,
			xp: 4,
			hp: 20,
			attack: 3
		});
	});

	it('levels the hero once at the exact level 2 threshold', () => {
		expect(applyExperienceGain({ level: 1, xp: 4, hp: 20, attack: 3 }, 1)).toEqual({
			level: 2,
			xp: 5,
			hp: 24,
			attack: 4
		});
	});

	it('rejects non-level-1 input because only the first level-up is implemented', () => {
		expect(() => applyExperienceGain({ level: 2, xp: 9, hp: 24, attack: 4 }, 1)).toThrow(
			'applyExperienceGain only supports level 1 progression'
		);
	});

	it('returns deterministic thresholds', () => {
		expect(getXpForLevel(2)).toBe(5);
	});
});
