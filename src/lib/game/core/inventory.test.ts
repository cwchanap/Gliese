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

	it('ignores unknown item ids and invalid quantities', () => {
		const inventory = createEmptyInventory();

		expect(addItem(inventory, 'missing-item', 1)).toBe(inventory);
		expect(addItem(inventory, 'field-potion', 0)).toBe(inventory);
		expect(addItem(inventory, 'field-potion', Number.NaN)).toBe(inventory);
		expect(addItem(inventory, 'field-potion', Number.POSITIVE_INFINITY)).toBe(inventory);
		expect(addItem(inventory, 'field-potion', 1.5)).toBe(inventory);
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

	it('rejects consuming unknown, equipment, and invalid stack quantities', () => {
		const unknownItemInventory = { stacks: [{ itemId: 'missing-item', quantity: 1 }], equipment: [] };
		const equipmentInventory = { stacks: [{ itemId: 'training-sword', quantity: 1 }], equipment: [] };
		const invalidQuantityInventory = { stacks: [{ itemId: 'field-potion', quantity: 0 }], equipment: [] };

		const unknownItemResult = consumeStackItem(unknownItemInventory, 'missing-item');
		const equipmentResult = consumeStackItem(equipmentInventory, 'training-sword');
		const invalidQuantityResult = consumeStackItem(invalidQuantityInventory, 'field-potion');

		expect(unknownItemResult.consumed).toBe(false);
		expect(unknownItemResult.inventory).toBe(unknownItemInventory);
		expect(equipmentResult.consumed).toBe(false);
		expect(equipmentResult.inventory).toBe(equipmentInventory);
		expect(invalidQuantityResult.consumed).toBe(false);
		expect(invalidQuantityResult.inventory).toBe(invalidQuantityInventory);
	});
});
