export function getXpForLevel(level: number) {
	return Math.max(0, (level - 1) * 5);
}

export function applyExperienceGain(
	state: { level: number; xp: number; hp: number; attack: number },
	gainedXp: number
) {
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
