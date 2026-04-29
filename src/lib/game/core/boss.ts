export type BossPhaseState = {
	phase: 1 | 2;
	hp: number;
	maxHp: number;
};

export function createBossPhaseState(): BossPhaseState {
	return { phase: 1, hp: 10, maxHp: 10 };
}

export function advanceBossPhase(state: BossPhaseState): BossPhaseState {
	if (state.phase === 1 && state.hp <= state.maxHp / 2) {
		return { ...state, phase: 2 };
	}

	return state;
}
