import { describe, expect, it } from 'vitest';

import { addItem, consumeStackItem, createEmptyInventory, ownsEquipment } from './inventory';

describe('inventory core', () => {
	it('stacks consumables and key items', () => {
		const inventory = addItem(addItem(createEmptyInventory(), 'field-potion', 2), 'field-potion', 1);
		const keyItemInventory = addItem(addItem(createEmptyInventory(), 'meadow-token'), 'meadow-token');

		expect(inventory.stacks).toEqual([{ itemId: 'field-potion', quantity: 3 }]);
		expect(keyItemInventory.stacks).toEqual([{ itemId: 'meadow-token', quantity: 2 }]);
	});

	it('stores equipment ownership by id once', () => {
		const inventory = addItem(addItem(createEmptyInventory(), 'training-sword', 1), 'training-sword', 1);

		expect(inventory.equipment).toEqual(['training-sword']);
		expect(ownsEquipment(inventory, 'training-sword')).toBe(true);
	});

	it('consumes stack quantities and removes empty stacks', () => {
		const inventory = addItem(createEmptyInventory(), 'field-potion', 2);

		expect(consumeStackItem(inventory, 'field-potion')).toEqual({
			consumed: true,
			inventory: { stacks: [{ itemId: 'field-potion', quantity: 1 }], equipment: [] }
		});
		expect(
			consumeStackItem({ stacks: [{ itemId: 'field-potion', quantity: 1 }], equipment: [] }, 'field-potion')
		).toEqual({
			consumed: true,
			inventory: { stacks: [], equipment: [] }
		});
	});

	it('rejects consuming missing stacks', () => {
		expect(consumeStackItem(createEmptyInventory(), 'field-potion')).toEqual({
			consumed: false,
			inventory: createEmptyInventory()
		});
	});
});
