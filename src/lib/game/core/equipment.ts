import { equipmentSlots, getItem, type EquipmentSlot } from '$lib/game/content/items';

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
