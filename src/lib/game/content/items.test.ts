import { describe, expect, it } from 'vitest';

import {
	equipmentSlots,
	getItem,
	getSellValue,
	isSellableItem,
	items,
	itemList,
	type EquipmentDefinition
} from '$lib/game/content/items';

describe('item content', () => {
	it('defines the first-pass roster counts', () => {
		expect(itemList.filter((item) => item.type === 'consumable')).toHaveLength(5);
		expect(itemList.filter((item) => item.type === 'equipment')).toHaveLength(8);
		expect(itemList.filter((item) => item.type === 'key')).toHaveLength(3);
	});

	it('uses stable unique ids', () => {
		expect(new Set(itemList.map((item) => item.id)).size).toBe(itemList.length);
		expect(getItem('field-potion')).toBe(items['field-potion']);
	});

	it('keeps stackability tied to item type', () => {
		expect(items['field-potion']).toMatchObject({ type: 'consumable', stackable: true });
		expect(items['meadow-charm']).toMatchObject({ type: 'equipment', stackable: false });
		expect(items['warden-sigil']).toMatchObject({ type: 'key', stackable: true });
	});

	it('assigns equipment to valid slots', () => {
		const slots = new Set(equipmentSlots);
		for (const item of itemList.filter((entry): entry is EquipmentDefinition => entry.type === 'equipment')) {
			expect(slots.has(item.slot)).toBe(true);
		}
	});

	it('defines base prices for every sellable item', () => {
		const expectedBasePrices = {
			'field-potion': 10,
			'greater-field-potion': 18,
			'ember-tonic': 8,
			'ruin-draught': 14,
			'sunleaf-salve': 12,
			'training-sword': 40,
			'ruin-blade': 80,
			'iron-cap': 35,
			'warden-crown': 100,
			'traveler-vest': 45,
			'stone-mail': 90,
			'grip-wraps': 35,
			'meadow-charm': 30
		};

		for (const item of itemList) {
			if (item.type === 'key') {
				expect('basePrice' in item).toBe(false);
				continue;
			}

			expect(item.basePrice).toBeGreaterThan(0);
			expect(item.basePrice).toBe(expectedBasePrices[item.id as keyof typeof expectedBasePrices]);
		}

		expect(Object.keys(expectedBasePrices)).toHaveLength(
			itemList.filter((item) => item.type !== 'key').length
		);
	});

	it('returns sell values only for consumables and equipment', () => {
		expect(getSellValue('field-potion')).toBe(5);
		expect(getSellValue('traveler-vest')).toBe(22);
		expect(getSellValue('warden-sigil')).toBeUndefined();
		expect(getSellValue('not-real')).toBeUndefined();
	});

	it('identifies only consumables and equipment as sellable', () => {
		expect(isSellableItem('field-potion')).toBe(true);
		expect(isSellableItem('training-sword')).toBe(true);
		expect(isSellableItem('warden-sigil')).toBe(false);
		expect(isSellableItem('not-real')).toBe(false);
	});
});
