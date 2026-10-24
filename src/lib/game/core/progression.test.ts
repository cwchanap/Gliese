import { describe, expect, it } from 'vitest';
import {
	applyExperienceGain,
	getBaseMaxHp,
	getXpForLevel,
	MAX_LEVEL
} from '$lib/game/core/progression';

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

	it('applies every level-up a large gain crosses', () => {
		expect(applyExperienceGain({ level: 2, xp: 9, hp: 24, attack: 4 }, 21)).toEqual({
			level: 4,
			xp: 30,
			hp: 32,
			attack: 6
		});
	});

	it('stops levelling at the level cap', () => {
		expect(applyExperienceGain({ level: 1, xp: 0, hp: 20, attack: 3 }, 10_000).level).toBe(
			MAX_LEVEL
		);
	});

	it('returns deterministic thresholds', () => {
		expect([2, 3, 4, 5].map(getXpForLevel)).toEqual([5, 15, 30, 50]);
	});

	it('computes base max HP from level', () => {
		expect(getBaseMaxHp(20, 1)).toBe(20);
		expect(getBaseMaxHp(20, 2)).toBe(24);
	});
});
