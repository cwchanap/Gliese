import { describe, expect, it } from 'vitest';

import { advanceBossPhase, createBossPhaseState } from '$lib/game/core/boss';

describe('boss phase rules', () => {
	it('starts in phase 1', () => {
		expect(createBossPhaseState().phase).toBe(1);
	});

	it('switches phase after the hp threshold', () => {
		expect(advanceBossPhase({ phase: 1, hp: 4, maxHp: 10 }).phase).toBe(2);
	});

	it('remains in phase 1 when hp is above the threshold', () => {
		const state = { phase: 1 as const, hp: 6, maxHp: 10 };
		expect(advanceBossPhase(state)).toBe(state);
	});

	it('remains in phase 2 when already enraged', () => {
		const state = { phase: 2 as const, hp: 3, maxHp: 10 };
		expect(advanceBossPhase(state)).toBe(state);
	});
});
