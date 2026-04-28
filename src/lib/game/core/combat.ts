export function resolveHit(
	target: { hp: number; defense: number },
	attack: { power: number }
) {
	return { hp: Math.max(0, target.hp - Math.max(1, attack.power - target.defense)) };
}

export function canReceiveHit(target: { invulnerableUntil: number }, now: number) {
	return now >= target.invulnerableUntil;
}
