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
	if (state.level !== 1) {
		throw new Error('applyExperienceGain only supports level 1 progression');
	}

	const xp = state.xp + gainedXp;

	if (xp < getXpForLevel(2)) {
		return { ...state, xp };
	}

	return {
		level: 2,
		xp,
		hp: state.hp + 4,
		attack: state.attack + 1
	};
}
