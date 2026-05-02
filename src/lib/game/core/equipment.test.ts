import { describe, expect, it } from 'vitest';

import { createEmptyEquipment, equipItem, unequipSlot } from './equipment';

describe('equipment core', () => {
	it('equips owned equipment into its slot', () => {
		const result = equipItem(createEmptyEquipment(), ['training-sword'], 'training-sword');

		expect(result).toEqual({
			equipped: true,
			equipment: {
				weapon: 'training-sword',
				head: null,
				body: null,
				hands: null,
				accessory: null
			}
		});
	});

	it('rejects unowned or non-equipment items', () => {
		expect(equipItem(createEmptyEquipment(), [], 'training-sword').equipped).toBe(false);
		expect(equipItem(createEmptyEquipment(), ['field-potion'], 'field-potion').equipped).toBe(false);
	});

	it('replaces equipment in the same slot and unequips slots', () => {
		const first = equipItem(createEmptyEquipment(), ['training-sword', 'ruin-blade'], 'training-sword');
		const second = equipItem(first.equipment, ['training-sword', 'ruin-blade'], 'ruin-blade');

		expect(second.equipment.weapon).toBe('ruin-blade');
		expect(unequipSlot(second.equipment, 'weapon').weapon).toBeNull();
	});
});
