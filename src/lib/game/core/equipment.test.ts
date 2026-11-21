import { describe, expect, it } from 'vitest';

import {
	createEmptyEquipment,
	equipItem,
	grantItems,
	unequipSlot,
	type EquipmentState
} from './equipment';
import { createEmptyInventory, type InventoryState } from './inventory';

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
		expect(equipItem(createEmptyEquipment(), ['field-potion'], 'field-potion').equipped).toBe(
			false
		);
	});

	it('replaces equipment in the same slot and unequips slots', () => {
		const first = equipItem(
			createEmptyEquipment(),
			['training-sword', 'ruin-blade'],
			'training-sword'
		);
		const second = equipItem(first.equipment, ['training-sword', 'ruin-blade'], 'ruin-blade');

		expect(second.equipment.weapon).toBe('ruin-blade');
		expect(unequipSlot(second.equipment, 'weapon').weapon).toBeNull();
	});

	describe('grantItems', () => {
		const ownedState = (
			equipmentIds: string[],
			equipped: Partial<EquipmentState>
		): { inventory: InventoryState; equipment: EquipmentState } => ({
			inventory: { stacks: [], equipment: equipmentIds },
			equipment: { ...createEmptyEquipment(), ...equipped }
		});

		it('auto-equips newly granted story gear into empty slots', () => {
			const result = grantItems(
				{ inventory: createEmptyInventory(), equipment: createEmptyEquipment() },
				[
					{ itemId: 'ancestral-amulet', quantity: 1 },
					{ itemId: 'practice-spear', quantity: 1 }
				]
			);

			expect(result.equipment.accessory).toBe('ancestral-amulet');
			expect(result.equipment.weapon).toBe('practice-spear');
			expect(result.equipped).toEqual(['ancestral-amulet', 'practice-spear']);
			expect(result.equipped.at(-1)).toBe('practice-spear');
			expect(result.inventory.equipment).toEqual(['ancestral-amulet', 'practice-spear']);
		});

		it('replaces a weaker equipped item and keeps the replaced gear owned', () => {
			const result = grantItems(ownedState(['practice-spear'], { weapon: 'practice-spear' }), [
				{ itemId: 'hunters-knife', quantity: 1 }
			]);

			expect(result.equipment.weapon).toBe('hunters-knife');
			expect(result.equipped).toEqual(['hunters-knife']);
			expect(result.inventory.equipment).toEqual(['practice-spear', 'hunters-knife']);
		});

		it('ignores a downgrade that lowers a stat without improving another', () => {
			const result = grantItems(ownedState(['hunters-knife'], { weapon: 'hunters-knife' }), [
				{ itemId: 'practice-spear', quantity: 1 }
			]);

			expect(result.equipment.weapon).toBe('hunters-knife');
			expect(result.equipped).toEqual([]);
			expect(result.inventory.equipment).toContain('practice-spear');
		});

		it('ignores a tie with identical stats', () => {
			const result = grantItems(ownedState(['practice-spear'], { weapon: 'practice-spear' }), [
				{ itemId: 'training-sword', quantity: 1 }
			]);

			expect(result.equipment.weapon).toBe('practice-spear');
			expect(result.equipped).toEqual([]);
		});

		it('ignores a trade-off that improves one stat while lowering another', () => {
			// No same-slot pair trades stats naturally; an iron-cap parked in the
			// weapon slot mimics a hand-edited save with defense but no attack.
			const result = grantItems(ownedState(['iron-cap'], { weapon: 'iron-cap' }), [
				{ itemId: 'hunters-knife', quantity: 1 }
			]);

			expect(result.equipment.weapon).toBe('iron-cap');
			expect(result.equipped).toEqual([]);
		});

		it('equips an empty slot even when the new item is no upgrade elsewhere', () => {
			const result = grantItems(ownedState(['hunters-knife'], { weapon: 'hunters-knife' }), [
				{ itemId: 'iron-cap', quantity: 1 }
			]);

			expect(result.equipment.head).toBe('iron-cap');
			expect(result.equipment.weapon).toBe('hunters-knife');
			expect(result.equipped).toEqual(['iron-cap']);
		});

		it('does not re-equip gear that is already owned but unworn', () => {
			const result = grantItems(ownedState(['practice-spear'], {}), [
				{ itemId: 'practice-spear', quantity: 1 }
			]);

			expect(result.equipment.weapon).toBeNull();
			expect(result.equipped).toEqual([]);
		});

		it('equips gear granted more than once in a batch only on the first copy', () => {
			const result = grantItems(
				{ inventory: createEmptyInventory(), equipment: createEmptyEquipment() },
				[
					{ itemId: 'practice-spear', quantity: 1 },
					{ itemId: 'practice-spear', quantity: 2 }
				]
			);

			expect(result.equipment.weapon).toBe('practice-spear');
			expect(result.equipped).toEqual(['practice-spear']);
			expect(result.inventory.equipment).toEqual(['practice-spear']);
		});

		it('grants consumables and key items without equipping them', () => {
			const result = grantItems(
				{ inventory: createEmptyInventory(), equipment: createEmptyEquipment() },
				[
					{ itemId: 'field-potion', quantity: 2 },
					{ itemId: 'meadow-token', quantity: 1 }
				]
			);

			expect(result.equipped).toEqual([]);
			expect(result.equipment).toEqual(createEmptyEquipment());
			expect(result.inventory.stacks).toEqual([
				{ itemId: 'field-potion', quantity: 2 },
				{ itemId: 'meadow-token', quantity: 1 }
			]);
		});

		it('ignores unknown item ids and invalid quantities', () => {
			const inventory = createEmptyInventory();
			const result = grantItems({ inventory, equipment: createEmptyEquipment() }, [
				{ itemId: 'not-an-item', quantity: 1 },
				{ itemId: 'practice-spear', quantity: 0 },
				{ itemId: 'hunters-knife', quantity: -2 },
				{ itemId: 'iron-cap', quantity: 1.5 }
			]);

			expect(result.inventory).toBe(inventory);
			expect(result.equipment).toEqual(createEmptyEquipment());
			expect(result.equipped).toEqual([]);
		});
	});
});
