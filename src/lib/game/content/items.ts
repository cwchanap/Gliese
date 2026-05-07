import type { DefinitionRegistry } from '$lib/game/core/types';

export const equipmentSlots = ['weapon', 'head', 'body', 'hands', 'accessory'] as const;

export type EquipmentSlot = (typeof equipmentSlots)[number];

export type StatModifiers = {
	attack?: number;
	defense?: number;
	maxHp?: number;
};

type BaseItemDefinition = {
	id: string;
	name: string;
	description: string;
	iconPath: string;
	stackable: boolean;
};

type PricedItemDefinition = BaseItemDefinition & {
	basePrice: number;
};

export type ConsumableEffect = { type: 'heal'; amount: number };

export type ConsumableDefinition = PricedItemDefinition & {
	type: 'consumable';
	stackable: true;
	effect: ConsumableEffect;
};

export type EquipmentDefinition = PricedItemDefinition & {
	type: 'equipment';
	stackable: false;
	slot: EquipmentSlot;
	modifiers: StatModifiers;
};

export type KeyItemDefinition = BaseItemDefinition & {
	type: 'key';
	stackable: true;
};

export type SellableItemDefinition = ConsumableDefinition | EquipmentDefinition;

export type ItemDefinition = ConsumableDefinition | EquipmentDefinition | KeyItemDefinition;

export const items = {
	'field-potion': {
		id: 'field-potion',
		name: 'Field Potion',
		description: 'Restores 8 HP.',
		iconPath: '/game/assets/items/field-potion.png',
		type: 'consumable',
		stackable: true,
		basePrice: 10,
		effect: { type: 'heal', amount: 8 }
	},
	'greater-field-potion': {
		id: 'greater-field-potion',
		name: 'Greater Field Potion',
		description: 'Restores 14 HP.',
		iconPath: '/game/assets/items/greater-field-potion.png',
		type: 'consumable',
		stackable: true,
		basePrice: 18,
		effect: { type: 'heal', amount: 14 }
	},
	'ember-tonic': {
		id: 'ember-tonic',
		name: 'Ember Tonic',
		description: 'Restores 5 HP.',
		iconPath: '/game/assets/items/ember-tonic.png',
		type: 'consumable',
		stackable: true,
		basePrice: 8,
		effect: { type: 'heal', amount: 5 }
	},
	'ruin-draught': {
		id: 'ruin-draught',
		name: 'Ruin Draught',
		description: 'Restores 10 HP.',
		iconPath: '/game/assets/items/ruin-draught.png',
		type: 'consumable',
		stackable: true,
		basePrice: 14,
		effect: { type: 'heal', amount: 10 }
	},
	'sunleaf-salve': {
		id: 'sunleaf-salve',
		name: 'Sunleaf Salve',
		description: 'Restores 6 HP.',
		iconPath: '/game/assets/items/sunleaf-salve.png',
		type: 'consumable',
		stackable: true,
		basePrice: 12,
		effect: { type: 'heal', amount: 6 }
	},
	'training-sword': {
		id: 'training-sword',
		name: 'Training Sword',
		description: 'A reliable starter blade.',
		iconPath: '/game/assets/items/training-sword.png',
		type: 'equipment',
		stackable: false,
		basePrice: 40,
		slot: 'weapon',
		modifiers: { attack: 1 }
	},
	'ruin-blade': {
		id: 'ruin-blade',
		name: 'Ruin Blade',
		description: 'A chipped sword humming with old heat.',
		iconPath: '/game/assets/items/ruin-blade.png',
		type: 'equipment',
		stackable: false,
		basePrice: 80,
		slot: 'weapon',
		modifiers: { attack: 2 }
	},
	'iron-cap': {
		id: 'iron-cap',
		name: 'Iron Cap',
		description: 'Simple protection for dangerous ruins.',
		iconPath: '/game/assets/items/iron-cap.png',
		type: 'equipment',
		stackable: false,
		basePrice: 35,
		slot: 'head',
		modifiers: { defense: 1 }
	},
	'warden-crown': {
		id: 'warden-crown',
		name: 'Warden Crown',
		description: 'A cracked helm from the ruins core.',
		iconPath: '/game/assets/items/warden-crown.png',
		type: 'equipment',
		stackable: false,
		basePrice: 100,
		slot: 'head',
		modifiers: { maxHp: 3, defense: 1 }
	},
	'traveler-vest': {
		id: 'traveler-vest',
		name: 'Traveler Vest',
		description: 'Light armor for long walks.',
		iconPath: '/game/assets/items/traveler-vest.png',
		type: 'equipment',
		stackable: false,
		basePrice: 45,
		slot: 'body',
		modifiers: { maxHp: 4 }
	},
	'stone-mail': {
		id: 'stone-mail',
		name: 'Stone Mail',
		description: 'Heavy plates carved from ruin stone.',
		iconPath: '/game/assets/items/stone-mail.png',
		type: 'equipment',
		stackable: false,
		basePrice: 90,
		slot: 'body',
		modifiers: { maxHp: 6, defense: 1 }
	},
	'grip-wraps': {
		id: 'grip-wraps',
		name: 'Grip Wraps',
		description: 'Cloth wraps that steady each strike.',
		iconPath: '/game/assets/items/grip-wraps.png',
		type: 'equipment',
		stackable: false,
		basePrice: 35,
		slot: 'hands',
		modifiers: { attack: 1 }
	},
	'meadow-charm': {
		id: 'meadow-charm',
		name: 'Meadow Charm',
		description: 'A small charm from the meadow path.',
		iconPath: '/game/assets/items/meadow-charm.png',
		type: 'equipment',
		stackable: false,
		basePrice: 30,
		slot: 'accessory',
		modifiers: { maxHp: 2 }
	},
	'meadow-token': {
		id: 'meadow-token',
		name: 'Meadow Token',
		description: 'A keepsake from the entry meadow.',
		iconPath: '/game/assets/items/meadow-token.png',
		type: 'key',
		stackable: true
	},
	'threshold-rune': {
		id: 'threshold-rune',
		name: 'Threshold Rune',
		description: 'A carved marker from the ruin threshold.',
		iconPath: '/game/assets/items/threshold-rune.png',
		type: 'key',
		stackable: true
	},
	'warden-sigil': {
		id: 'warden-sigil',
		name: 'Warden Sigil',
		description: 'Proof that the ruins warden fell.',
		iconPath: '/game/assets/items/warden-sigil.png',
		type: 'key',
		stackable: true
	}
} satisfies DefinitionRegistry<ItemDefinition>;

export const itemList: ItemDefinition[] = Object.values(items);

export function getItem(itemId: string): ItemDefinition | undefined {
	return (items as DefinitionRegistry<ItemDefinition>)[itemId];
}

export function isSellableItem(itemId: string): boolean {
	const item = getItem(itemId);

	return item?.type === 'consumable' || item?.type === 'equipment';
}

export function getSellValue(itemId: string): number | undefined {
	const item = getItem(itemId);

	if (item?.type !== 'consumable' && item?.type !== 'equipment') {
		return undefined;
	}

	return Math.max(1, Math.floor(item.basePrice * 0.5));
}
