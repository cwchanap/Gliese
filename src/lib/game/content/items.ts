import type { DefinitionRegistry } from '$lib/game/core/types';
import { t, type MessageKey } from '$lib/game/i18n/translate';

export const equipmentSlots = ['weapon', 'head', 'body', 'hands', 'accessory'] as const;

export type EquipmentSlot = (typeof equipmentSlots)[number];

export type StatModifiers = {
	attack?: number;
	defense?: number;
	maxHp?: number;
};

type BaseItemDefinition = {
	id: string;
	nameKey: MessageKey;
	descriptionKey: MessageKey;
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

type ItemDefinitionSource =
	| Omit<ConsumableDefinition, 'name' | 'description'>
	| Omit<EquipmentDefinition, 'name' | 'description'>
	| Omit<KeyItemDefinition, 'name' | 'description'>;

const itemDefinitions = {
	'field-potion': {
		id: 'field-potion',
		nameKey: 'content.items.field-potion.name',
		descriptionKey: 'content.items.field-potion.description',
		iconPath: '/game/assets/items/field-potion.png',
		type: 'consumable',
		stackable: true,
		basePrice: 10,
		effect: { type: 'heal', amount: 8 }
	},
	'greater-field-potion': {
		id: 'greater-field-potion',
		nameKey: 'content.items.greater-field-potion.name',
		descriptionKey: 'content.items.greater-field-potion.description',
		iconPath: '/game/assets/items/greater-field-potion.png',
		type: 'consumable',
		stackable: true,
		basePrice: 18,
		effect: { type: 'heal', amount: 14 }
	},
	'ember-tonic': {
		id: 'ember-tonic',
		nameKey: 'content.items.ember-tonic.name',
		descriptionKey: 'content.items.ember-tonic.description',
		iconPath: '/game/assets/items/ember-tonic.png',
		type: 'consumable',
		stackable: true,
		basePrice: 8,
		effect: { type: 'heal', amount: 5 }
	},
	'ruin-draught': {
		id: 'ruin-draught',
		nameKey: 'content.items.ruin-draught.name',
		descriptionKey: 'content.items.ruin-draught.description',
		iconPath: '/game/assets/items/ruin-draught.png',
		type: 'consumable',
		stackable: true,
		basePrice: 14,
		effect: { type: 'heal', amount: 10 }
	},
	'sunleaf-salve': {
		id: 'sunleaf-salve',
		nameKey: 'content.items.sunleaf-salve.name',
		descriptionKey: 'content.items.sunleaf-salve.description',
		iconPath: '/game/assets/items/sunleaf-salve.png',
		type: 'consumable',
		stackable: true,
		basePrice: 12,
		effect: { type: 'heal', amount: 6 }
	},
	'training-sword': {
		id: 'training-sword',
		nameKey: 'content.items.training-sword.name',
		descriptionKey: 'content.items.training-sword.description',
		iconPath: '/game/assets/items/training-sword.png',
		type: 'equipment',
		stackable: false,
		basePrice: 40,
		slot: 'weapon',
		modifiers: { attack: 1 }
	},
	'ruin-blade': {
		id: 'ruin-blade',
		nameKey: 'content.items.ruin-blade.name',
		descriptionKey: 'content.items.ruin-blade.description',
		iconPath: '/game/assets/items/ruin-blade.png',
		type: 'equipment',
		stackable: false,
		basePrice: 80,
		slot: 'weapon',
		modifiers: { attack: 2 }
	},
	'iron-cap': {
		id: 'iron-cap',
		nameKey: 'content.items.iron-cap.name',
		descriptionKey: 'content.items.iron-cap.description',
		iconPath: '/game/assets/items/iron-cap.png',
		type: 'equipment',
		stackable: false,
		basePrice: 35,
		slot: 'head',
		modifiers: { defense: 1 }
	},
	'warden-crown': {
		id: 'warden-crown',
		nameKey: 'content.items.warden-crown.name',
		descriptionKey: 'content.items.warden-crown.description',
		iconPath: '/game/assets/items/warden-crown.png',
		type: 'equipment',
		stackable: false,
		basePrice: 100,
		slot: 'head',
		modifiers: { maxHp: 3, defense: 1 }
	},
	'traveler-vest': {
		id: 'traveler-vest',
		nameKey: 'content.items.traveler-vest.name',
		descriptionKey: 'content.items.traveler-vest.description',
		iconPath: '/game/assets/items/traveler-vest.png',
		type: 'equipment',
		stackable: false,
		basePrice: 45,
		slot: 'body',
		modifiers: { maxHp: 4 }
	},
	'stone-mail': {
		id: 'stone-mail',
		nameKey: 'content.items.stone-mail.name',
		descriptionKey: 'content.items.stone-mail.description',
		iconPath: '/game/assets/items/stone-mail.png',
		type: 'equipment',
		stackable: false,
		basePrice: 90,
		slot: 'body',
		modifiers: { maxHp: 6, defense: 1 }
	},
	'grip-wraps': {
		id: 'grip-wraps',
		nameKey: 'content.items.grip-wraps.name',
		descriptionKey: 'content.items.grip-wraps.description',
		iconPath: '/game/assets/items/grip-wraps.png',
		type: 'equipment',
		stackable: false,
		basePrice: 35,
		slot: 'hands',
		modifiers: { attack: 1 }
	},
	'meadow-charm': {
		id: 'meadow-charm',
		nameKey: 'content.items.meadow-charm.name',
		descriptionKey: 'content.items.meadow-charm.description',
		iconPath: '/game/assets/items/meadow-charm.png',
		type: 'equipment',
		stackable: false,
		basePrice: 30,
		slot: 'accessory',
		modifiers: { maxHp: 2 }
	},
	'meadow-token': {
		id: 'meadow-token',
		nameKey: 'content.items.meadow-token.name',
		descriptionKey: 'content.items.meadow-token.description',
		iconPath: '/game/assets/items/meadow-token.png',
		type: 'key',
		stackable: true
	},
	'threshold-rune': {
		id: 'threshold-rune',
		nameKey: 'content.items.threshold-rune.name',
		descriptionKey: 'content.items.threshold-rune.description',
		iconPath: '/game/assets/items/threshold-rune.png',
		type: 'key',
		stackable: true
	},
	'warden-sigil': {
		id: 'warden-sigil',
		nameKey: 'content.items.warden-sigil.name',
		descriptionKey: 'content.items.warden-sigil.description',
		iconPath: '/game/assets/items/warden-sigil.png',
		type: 'key',
		stackable: true
	}
} satisfies DefinitionRegistry<ItemDefinitionSource>;

export const items = addEnglishItemText(itemDefinitions);

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

function addEnglishItemText(
	definitions: DefinitionRegistry<ItemDefinitionSource>
): DefinitionRegistry<ItemDefinition> {
	return Object.fromEntries(
		Object.entries(definitions).map(([itemId, item]) => [
			itemId,
			{
				...item,
				name: t('en', item.nameKey),
				description: t('en', item.descriptionKey)
			}
		])
	) as DefinitionRegistry<ItemDefinition>;
}
