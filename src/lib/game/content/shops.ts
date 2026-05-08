import type { DefinitionRegistry } from '$lib/game/core/types';

export type ShopStockAvailability = { mode: 'unlimited' } | { mode: 'finite'; quantity: number };

export type ShopStockEntry = {
	id: string;
	itemId: string;
	buyPrice?: number;
	availability: ShopStockAvailability;
};

export type ShopDefinition = {
	id: string;
	name: string;
	merchantName: string;
	description: string;
	stock: ShopStockEntry[];
};

export const shops = {
	'miras-item-shop': {
		id: 'miras-item-shop',
		name: "Mira's Item Shop",
		merchantName: 'Mira',
		description: 'Reliable field supplies for the road east.',
		stock: [
			{ id: 'field-potion', itemId: 'field-potion', availability: { mode: 'unlimited' } },
			{ id: 'sunleaf-salve', itemId: 'sunleaf-salve', availability: { mode: 'unlimited' } },
			{
				id: 'greater-field-potion',
				itemId: 'greater-field-potion',
				availability: { mode: 'unlimited' }
			}
		]
	},
	'guild-quartermaster': {
		id: 'guild-quartermaster',
		name: 'Guild Quartermaster',
		merchantName: 'Quartermaster Vale',
		description: 'Guild-approved gear for new ruins assignments.',
		stock: [
			{ id: 'iron-cap', itemId: 'iron-cap', availability: { mode: 'finite', quantity: 1 } },
			{ id: 'grip-wraps', itemId: 'grip-wraps', availability: { mode: 'finite', quantity: 1 } },
			{
				id: 'traveler-vest',
				itemId: 'traveler-vest',
				availability: { mode: 'finite', quantity: 1 }
			}
		]
	}
} satisfies DefinitionRegistry<ShopDefinition>;

export const shopList: ShopDefinition[] = Object.values(shops);

export function getShop(shopId: string): ShopDefinition | undefined {
	return (shops as DefinitionRegistry<ShopDefinition>)[shopId];
}
