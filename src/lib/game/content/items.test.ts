import { describe, expect, it } from 'vitest';

import {
	equipmentSlots,
	getItem,
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
});
