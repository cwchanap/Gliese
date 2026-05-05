import { describe, expect, it } from 'vitest';
import { enemies, ruinsWarden, slimeScout } from '$lib/game/content/enemies';

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

	it('defines non-negative coin rewards for every enemy', () => {
		expect(enemies['slime-scout'].coinReward).toBe(4);
		expect(enemies['ruins-warden'].coinReward).toBe(25);

		for (const enemy of Object.values(enemies)) {
			expect(Number.isInteger(enemy.coinReward)).toBe(true);
			expect(enemy.coinReward).toBeGreaterThanOrEqual(0);
		}
	});
});
