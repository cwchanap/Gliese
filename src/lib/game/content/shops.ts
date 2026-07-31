import type { DefinitionRegistry } from '$lib/game/core/types';
import { t, type MessageKey } from '$lib/game/i18n/translate';

export type ShopStockAvailability = { mode: 'unlimited' } | { mode: 'finite'; quantity: number };

export type ShopStockEntry = {
	id: string;
	itemId: string;
	buyPrice?: number;
	availability: ShopStockAvailability;
};

export type ShopDefinition = {
	id: string;
	nameKey: MessageKey;
	merchantNameKey: MessageKey;
	descriptionKey: MessageKey;
	name: string;
	merchantName: string;
	description: string;
	stock: ShopStockEntry[];
};

type ShopDefinitionSource = Omit<ShopDefinition, 'name' | 'merchantName' | 'description'>;

const shopDefinitions = {
	'miras-item-shop': {
		id: 'miras-item-shop',
		nameKey: 'content.shops.miras-item-shop.name',
		merchantNameKey: 'content.shops.miras-item-shop.merchantName',
		descriptionKey: 'content.shops.miras-item-shop.description',
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
		nameKey: 'content.shops.guild-quartermaster.name',
		merchantNameKey: 'content.shops.guild-quartermaster.merchantName',
		descriptionKey: 'content.shops.guild-quartermaster.description',
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
} satisfies DefinitionRegistry<ShopDefinitionSource>;

export const shops = addEnglishShopText(shopDefinitions);

export const shopList: ShopDefinition[] = Object.values(shops);

export function getShop(shopId: string): ShopDefinition | undefined {
	return (shops as DefinitionRegistry<ShopDefinition>)[shopId];
}

function addEnglishShopText(
	definitions: DefinitionRegistry<ShopDefinitionSource>
): DefinitionRegistry<ShopDefinition> {
	return Object.fromEntries(
		Object.entries(definitions).map(([shopId, shop]) => [
			shopId,
			{
				...shop,
				name: t('en', shop.nameKey),
				merchantName: t('en', shop.merchantNameKey),
				description: t('en', shop.descriptionKey)
			}
		])
	) as DefinitionRegistry<ShopDefinition>;
}
