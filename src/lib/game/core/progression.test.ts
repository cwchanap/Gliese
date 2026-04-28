import { describe, expect, it } from 'vitest';
import { applyExperienceGain, getXpForLevel } from '$lib/game/core/progression';

describe('progression rules', () => {
	it('keeps the hero at level 1 below threshold', () => {
		expect(applyExperienceGain({ level: 1, xp: 0, hp: 20, attack: 3 }, 4).level).toBe(1);
	});

	it('levels the hero once when threshold is crossed', () => {
		const result = applyExperienceGain({ level: 1, xp: 4, hp: 20, attack: 3 }, 2);
		expect(result.level).toBe(2);
		expect(result.hp).toBeGreaterThan(20);
	});

	it('returns deterministic thresholds', () => {
		expect(getXpForLevel(2)).toBe(5);
	});
});
