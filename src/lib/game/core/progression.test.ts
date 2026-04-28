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

	it('uses the current level threshold instead of hard-coding level 2', () => {
		expect(applyExperienceGain({ level: 2, xp: 9, hp: 24, attack: 4 }, 1)).toEqual({
			level: 3,
			xp: 10,
			hp: 28,
			attack: 5
		});
	});

	it('returns deterministic thresholds', () => {
		expect(getXpForLevel(2)).toBe(5);
		expect(getXpForLevel(3)).toBe(10);
	});
});
