import { describe, expect, it } from 'vitest';
import { canReceiveHit, resolveHit } from '$lib/game/core/combat';

describe('combat rules', () => {
	it('applies attack damage to an enemy hp pool', () => {
		expect(resolveHit({ hp: 6, defense: 0 }, { power: 3 }).hp).toBe(3);
	});

	it('blocks hits during invulnerability frames', () => {
		expect(canReceiveHit({ invulnerableUntil: 1000 }, 999)).toBe(false);
	});
});
