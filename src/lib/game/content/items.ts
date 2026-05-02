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
	stackable: boolean;
};

export type ConsumableEffect = { type: 'heal'; amount: number };

export type ConsumableDefinition = BaseItemDefinition & {
	type: 'consumable';
	stackable: true;
	effect: ConsumableEffect;
};

export type EquipmentDefinition = BaseItemDefinition & {
	type: 'equipment';
	stackable: false;
	slot: EquipmentSlot;
	modifiers: StatModifiers;
};

export type KeyItemDefinition = BaseItemDefinition & {
	type: 'key';
	stackable: true;
};

export type ItemDefinition = ConsumableDefinition | EquipmentDefinition | KeyItemDefinition;

export const items = {
	'field-potion': {
		id: 'field-potion',
		name: 'Field Potion',
		description: 'Restores 8 HP.',
		type: 'consumable',
		stackable: true,
		effect: { type: 'heal', amount: 8 }
	},
	'greater-field-potion': {
		id: 'greater-field-potion',
		name: 'Greater Field Potion',
		description: 'Restores 14 HP.',
		type: 'consumable',
		stackable: true,
		effect: { type: 'heal', amount: 14 }
	},
	'ember-tonic': {
		id: 'ember-tonic',
		name: 'Ember Tonic',
		description: 'Restores 5 HP.',
		type: 'consumable',
		stackable: true,
		effect: { type: 'heal', amount: 5 }
	},
	'ruin-draught': {
		id: 'ruin-draught',
		name: 'Ruin Draught',
		description: 'Restores 10 HP.',
		type: 'consumable',
		stackable: true,
		effect: { type: 'heal', amount: 10 }
	},
	'sunleaf-salve': {
		id: 'sunleaf-salve',
		name: 'Sunleaf Salve',
		description: 'Restores 6 HP.',
		type: 'consumable',
		stackable: true,
		effect: { type: 'heal', amount: 6 }
	},
	'training-sword': {
		id: 'training-sword',
		name: 'Training Sword',
		description: 'A reliable starter blade.',
		type: 'equipment',
		stackable: false,
		slot: 'weapon',
		modifiers: { attack: 1 }
	},
	'ruin-blade': {
		id: 'ruin-blade',
		name: 'Ruin Blade',
		description: 'A chipped sword humming with old heat.',
		type: 'equipment',
		stackable: false,
		slot: 'weapon',
		modifiers: { attack: 2 }
	},
	'iron-cap': {
		id: 'iron-cap',
		name: 'Iron Cap',
		description: 'Simple protection for dangerous ruins.',
		type: 'equipment',
		stackable: false,
		slot: 'head',
		modifiers: { defense: 1 }
	},
	'warden-crown': {
		id: 'warden-crown',
		name: 'Warden Crown',
		description: 'A cracked helm from the ruins core.',
		type: 'equipment',
		stackable: false,
		slot: 'head',
		modifiers: { maxHp: 3, defense: 1 }
	},
	'traveler-vest': {
		id: 'traveler-vest',
		name: 'Traveler Vest',
		description: 'Light armor for long walks.',
		type: 'equipment',
		stackable: false,
		slot: 'body',
		modifiers: { maxHp: 4 }
	},
	'stone-mail': {
		id: 'stone-mail',
		name: 'Stone Mail',
		description: 'Heavy plates carved from ruin stone.',
		type: 'equipment',
		stackable: false,
		slot: 'body',
		modifiers: { maxHp: 6, defense: 1 }
	},
	'grip-wraps': {
		id: 'grip-wraps',
		name: 'Grip Wraps',
		description: 'Cloth wraps that steady each strike.',
		type: 'equipment',
		stackable: false,
		slot: 'hands',
		modifiers: { attack: 1 }
	},
	'meadow-charm': {
		id: 'meadow-charm',
		name: 'Meadow Charm',
		description: 'A small charm from the meadow path.',
		type: 'equipment',
		stackable: false,
		slot: 'accessory',
		modifiers: { maxHp: 2 }
	},
	'meadow-token': {
		id: 'meadow-token',
		name: 'Meadow Token',
		description: 'A keepsake from the entry meadow.',
		type: 'key',
		stackable: true
	},
	'threshold-rune': {
		id: 'threshold-rune',
		name: 'Threshold Rune',
		description: 'A carved marker from the ruin threshold.',
		type: 'key',
		stackable: true
	},
	'warden-sigil': {
		id: 'warden-sigil',
		name: 'Warden Sigil',
		description: 'Proof that the ruins warden fell.',
		type: 'key',
		stackable: true
	}
} satisfies DefinitionRegistry<ItemDefinition>;

export const itemList: ItemDefinition[] = Object.values(items);

export function getItem(itemId: string): ItemDefinition | undefined {
	return (items as DefinitionRegistry<ItemDefinition>)[itemId];
}
