type ProgressionState = {
	level: number;
	xp: number;
	hp: number;
	attack: number;
};

export function getXpForLevel(level: number) {
	return Math.max(0, (level - 1) * 5);
}

export function applyExperienceGain(state: ProgressionState, gainedXp: number) {
	const xp = state.xp + gainedXp;
	const nextLevel = state.level + 1;

	if (xp < getXpForLevel(nextLevel)) {
		return { ...state, xp };
	}

	return {
		level: nextLevel,
		xp,
		hp: state.hp + 4,
		attack: state.attack + 1
	};
}
