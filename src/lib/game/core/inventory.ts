import { getItem } from '$lib/game/content/items';

export type InventoryStack = {
	itemId: string;
	quantity: number;
};

export type InventoryState = {
	stacks: InventoryStack[];
	equipment: string[];
};

export function createEmptyInventory(): InventoryState {
	return { stacks: [], equipment: [] };
}

export function addItem(inventory: InventoryState, itemId: string, quantity = 1): InventoryState {
	const item = getItem(itemId);

	if (!item || quantity < 1) {
		return inventory;
	}

	if (item.type === 'equipment') {
		return inventory.equipment.includes(itemId)
			? inventory
			: { ...inventory, equipment: [...inventory.equipment, itemId] };
	}

	const existing = inventory.stacks.find((stack) => stack.itemId === itemId);
	const stacks = existing
		? inventory.stacks.map((stack) =>
				stack.itemId === itemId ? { ...stack, quantity: stack.quantity + quantity } : stack
			)
		: [...inventory.stacks, { itemId, quantity }];

	return { ...inventory, stacks };
}

export function consumeStackItem(
	inventory: InventoryState,
	itemId: string
): { consumed: boolean; inventory: InventoryState } {
	const existing = inventory.stacks.find((stack) => stack.itemId === itemId);

	if (!existing) {
		return { consumed: false, inventory };
	}

	const stacks =
		existing.quantity > 1
			? inventory.stacks.map((stack) =>
					stack.itemId === itemId ? { ...stack, quantity: stack.quantity - 1 } : stack
				)
			: inventory.stacks.filter((stack) => stack.itemId !== itemId);

	return { consumed: true, inventory: { ...inventory, stacks } };
}

export function ownsEquipment(inventory: InventoryState, itemId: string): boolean {
	return inventory.equipment.includes(itemId);
}
