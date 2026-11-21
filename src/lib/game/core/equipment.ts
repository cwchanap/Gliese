import { equipmentSlots, getItem, type EquipmentSlot } from '$lib/game/content/items';
import { addItem, type InventoryState } from '$lib/game/core/inventory';
import { previewEquipmentSwap } from '$lib/game/core/stats';

export type EquipmentState = Record<EquipmentSlot, string | null>;

export function createEmptyEquipment(): EquipmentState {
	return {
		weapon: null,
		head: null,
		body: null,
		hands: null,
		accessory: null
	};
}

export function equipItem(
	equipment: EquipmentState,
	ownedEquipment: string[],
	itemId: string
): { equipped: boolean; equipment: EquipmentState } {
	const item = getItem(itemId);

	if (!item || item.type !== 'equipment' || !ownedEquipment.includes(itemId)) {
		return { equipped: false, equipment };
	}

	return { equipped: true, equipment: { ...equipment, [item.slot]: itemId } };
}

export function unequipSlot(equipment: EquipmentState, slot: EquipmentSlot): EquipmentState {
	return equipmentSlots.includes(slot) ? { ...equipment, [slot]: null } : equipment;
}

/**
 * Grants non-shop items and auto-equips gear that has just become owned: an
 * empty slot always equips, an occupied slot only when the swap improves at
 * least one of attack/defense/maxHp without lowering the others. Replaced
 * gear stays owned in `inventory.equipment`.
 * @param state - `{ inventory, equipment }` to grant into; neither is mutated.
 * @param items - `{ itemId, quantity }` entries applied in order.
 * @returns `{ inventory, equipment, equipped }` — `equipped` lists the
 *   auto-equipped item ids in grant order; callers use `equipped.at(-1)` for
 *   a single reward message.
 */
export function grantItems(
	state: { inventory: InventoryState; equipment: EquipmentState },
	items: { itemId: string; quantity: number }[]
): { inventory: InventoryState; equipment: EquipmentState; equipped: string[] } {
	let { inventory, equipment } = state;
	const equipped: string[] = [];

	for (const { itemId, quantity } of items) {
		const wasOwned = inventory.equipment.includes(itemId);
		inventory = addItem(inventory, itemId, quantity);

		// Consumables, key items, invalid grants and re-granted gear never equip.
		if (wasOwned || !inventory.equipment.includes(itemId)) {
			continue;
		}

		const preview = previewEquipmentSwap({
			base: { hp: 0, attack: 0, defense: 0 },
			equipment,
			itemId
		});

		if (!preview) {
			continue;
		}

		if (preview.replacedItemId !== null) {
			const { before, after } = preview;
			const noStatDropped =
				after.attack >= before.attack &&
				after.defense >= before.defense &&
				after.maxHp >= before.maxHp;
			const oneStatImproved =
				after.attack > before.attack ||
				after.defense > before.defense ||
				after.maxHp > before.maxHp;

			if (!noStatDropped || !oneStatImproved) {
				continue;
			}
		}

		const result = equipItem(equipment, inventory.equipment, itemId);

		if (result.equipped) {
			equipment = result.equipment;
			equipped.push(itemId);
		}
	}

	return { inventory, equipment, equipped };
}
