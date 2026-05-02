import { describe, expect, it } from 'vitest';
import { items } from '$lib/game/content/items';
import { maps, meadowEntryMap, ruinsThresholdMap } from '$lib/game/content/maps';

describe('opening map content', () => {
	it('declares a spawn point, opening encounter, and connected exit', () => {
		expect(meadowEntryMap.spawn).toEqual({ x: 256, y: 1_280 });
		expect(meadowEntryMap.encounter).toMatchObject({
			x: 1_280,
			y: 1_280,
			enemyId: 'slime-scout'
		});
		expect(meadowEntryMap.transitions[0]).toMatchObject({
			toMapId: 'ruins-threshold'
		});
	});

	it('declares explicit arrival points for doorway returns', () => {
		expect(meadowEntryMap.transitions[0]).toMatchObject({
			toMapId: 'ruins-threshold',
			arrival: {
				x: 256,
				y: 480,
				facing: 'right'
			}
		});
		expect(ruinsThresholdMap.transitions[0]).toMatchObject({
			toMapId: 'meadow-entry',
			arrival: {
				x: 2_176,
				y: 1_280,
				facing: 'left'
			}
		});
	});

	it('defines valid placed pickups with stable ids and item ids', () => {
		const pickups = Object.values(maps).flatMap((map) => map.pickups ?? []);

		expect(pickups.length).toBeGreaterThan(0);
		expect(new Set(pickups.map((pickup) => pickup.id)).size).toBe(pickups.length);

		for (const map of Object.values(maps)) {
			for (const pickup of map.pickups ?? []) {
				expect(items[pickup.itemId]).toBeDefined();
				expect(pickup.quantity).toBeGreaterThan(0);
				expect(pickup.x).toBeGreaterThanOrEqual(0);
				expect(pickup.y).toBeGreaterThanOrEqual(0);
				expect(pickup.x).toBeLessThanOrEqual(map.width * 32);
				expect(pickup.y).toBeLessThanOrEqual(map.height * 32);
			}
		}
	});
});
