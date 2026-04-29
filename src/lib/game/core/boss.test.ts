import { describe, expect, it } from 'vitest';

import { advanceBossPhase, createBossPhaseState } from '$lib/game/core/boss';

describe('boss phase rules', () => {
	it('starts in phase 1', () => {
		expect(createBossPhaseState().phase).toBe(1);
	});

	it('switches phase after the hp threshold', () => {
		expect(advanceBossPhase({ phase: 1, hp: 4, maxHp: 10 }).phase).toBe(2);
	});
});
