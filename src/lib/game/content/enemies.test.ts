import { describe, expect, it } from 'vitest';
import { ruinsWarden, slimeScout } from '$lib/game/content/enemies';

describe('enemy combat tuning', () => {
	it('keeps normal enemies durable enough to need multiple training-sword hits', () => {
		expect(slimeScout.baseHp).toBe(8);
		expect(slimeScout.xpReward).toBe(4);
	});

	it('keeps the boss from dying in one opening attack', () => {
		expect(ruinsWarden.baseHp).toBe(45);
		expect(ruinsWarden.baseAttack).toBe(5);
		expect(ruinsWarden.xpReward).toBe(18);
	});
});
