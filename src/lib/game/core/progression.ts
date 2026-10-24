export type ProgressionState = {
	level: number;
	xp: number;
	hp: number;
	attack: number;
};

export const MAX_LEVEL = 8;
const HP_PER_LEVEL = 4;
const ATTACK_PER_LEVEL = 1;

export function getBaseMaxHp(baseHp: number, level: number): number {
	return baseHp + HP_PER_LEVEL * (Math.min(level, MAX_LEVEL) - 1);
}

/** Total XP needed to reach `level`: 5, 15, 30, 50, … (each step 5 more than the last). */
export function getXpForLevel(level: number) {
	const steps = Math.max(0, level - 1);
	return (5 * steps * (steps + 1)) / 2;
}

/** Adds XP and applies every level-up it crosses: +4 max HP (healed) and +1 attack each. */
export function applyExperienceGain(state: ProgressionState, gainedXp: number): ProgressionState {
	const xp = state.xp + Math.max(0, gainedXp);
	let { level, hp, attack } = state;

	while (level < MAX_LEVEL && xp >= getXpForLevel(level + 1)) {
		level += 1;
		hp += HP_PER_LEVEL;
		attack += ATTACK_PER_LEVEL;
	}

	return { level, xp, hp, attack };
}
