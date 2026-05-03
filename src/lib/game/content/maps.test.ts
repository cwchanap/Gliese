import { describe, expect, it } from 'vitest';
import { enemies } from '$lib/game/content/enemies';
import { getItem } from '$lib/game/content/items';
import { maps, meadowEntryMap, ruinsThresholdMap } from '$lib/game/content/maps';

describe('opening map content', () => {
	it('declares a spawn point, multiple opening encounters, and connected exit', () => {
		expect(meadowEntryMap.spawn).toEqual({ x: 256, y: 1_280 });
		expect(meadowEntryMap.encounters).toEqual([
			{ id: 'meadow-slime-west', x: 1_024, y: 1_280, enemyId: 'slime-scout' },
			{ id: 'meadow-slime-center', x: 1_280, y: 1_280, enemyId: 'slime-scout' },
			{ id: 'meadow-slime-east', x: 1_536, y: 1_280, enemyId: 'slime-scout' }
		]);
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

		expect(maps['meadow-entry'].pickups).toEqual([
			{ id: 'meadow-entry-potion', x: 512, y: 1_184, itemId: 'field-potion', quantity: 2 },
			{ id: 'meadow-entry-charm', x: 896, y: 1_408, itemId: 'meadow-charm', quantity: 1 },
			{ id: 'meadow-entry-token', x: 1_024, y: 1_152, itemId: 'meadow-token', quantity: 1 }
		]);
		expect(maps['ruins-threshold'].pickups).toEqual([
			{ id: 'ruins-threshold-cap', x: 416, y: 352, itemId: 'iron-cap', quantity: 1 },
			{ id: 'ruins-threshold-rune', x: 576, y: 608, itemId: 'threshold-rune', quantity: 1 },
			{ id: 'ruins-threshold-salve', x: 320, y: 640, itemId: 'sunleaf-salve', quantity: 2 }
		]);
		expect(maps['ruins-core'].pickups).toEqual([
			{ id: 'ruins-core-mail', x: 448, y: 608, itemId: 'stone-mail', quantity: 1 },
			{ id: 'ruins-core-draught', x: 544, y: 352, itemId: 'ruin-draught', quantity: 1 }
		]);

		expect(new Set(pickups.map((pickup) => pickup.id)).size).toBe(pickups.length);

		for (const map of Object.values(maps)) {
			for (const pickup of map.pickups ?? []) {
				expect(getItem(pickup.itemId)).toBeDefined();
				expect(pickup.quantity).toBeGreaterThan(0);
				expect(pickup.x).toBeGreaterThanOrEqual(0);
				expect(pickup.y).toBeGreaterThanOrEqual(0);
				expect(pickup.x).toBeLessThan(map.width * 32);
				expect(pickup.y).toBeLessThan(map.height * 32);
			}
		}
	});

	it('defines valid multi-encounters with stable ids and enemy definitions', () => {
		const encounters = Object.values(maps).flatMap((map) => map.encounters ?? []);

		expect(maps['ruins-threshold'].encounters).toEqual([
			{ id: 'threshold-slime-west', x: 416, y: 480, enemyId: 'slime-scout' },
			{ id: 'threshold-slime-east', x: 576, y: 480, enemyId: 'slime-scout' }
		]);
		expect(maps['ruins-core'].encounters).toEqual([
			{ id: 'ruins-warden', x: 640, y: 480, enemyId: 'ruins-warden', completion: 'victory' }
		]);
		expect(new Set(encounters.map((encounter) => encounter.id)).size).toBe(encounters.length);

		for (const map of Object.values(maps)) {
			for (const encounter of map.encounters ?? []) {
				expect(enemies[encounter.enemyId]).toBeDefined();
				expect(encounter.x).toBeGreaterThanOrEqual(0);
				expect(encounter.y).toBeGreaterThanOrEqual(0);
				expect(encounter.x).toBeLessThan(map.width * 32);
				expect(encounter.y).toBeLessThan(map.height * 32);
			}
		}
	});
});
