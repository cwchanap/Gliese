import {
	getItem,
	getSellValue,
	type ConsumableDefinition,
	type EquipmentDefinition
} from '$lib/game/content/items';
import { getShop, shopList, type ShopStockEntry } from '$lib/game/content/shops';
import type { EquipmentState } from '$lib/game/core/equipment';
import {
	addItem,
	consumeStackItem,
	removeEquipmentItem,
	type InventoryState
} from '$lib/game/core/inventory';
import { getItemText } from '$lib/game/i18n/content';
import type { Locale } from '$lib/game/i18n/locales';

export type WalletState = { coins: number };

export type ShopStockState = Record<string, Record<string, number>>;

export type ShopBuyFailureReason =
	| 'shop-not-found'
	| 'stock-not-found'
	| 'not-enough-coins'
	| 'out-of-stock'
	| 'item-cannot-be-bought';

export type ShopBuyResult =
	| {
			purchased: true;
			wallet: WalletState;
			inventory: InventoryState;
			stockState: ShopStockState;
	  }
	| {
			purchased: false;
			reason: ShopBuyFailureReason;
			wallet: WalletState;
			inventory: InventoryState;
			stockState: ShopStockState;
	  };

export type ShopSellFailureReason =
	| 'item-not-owned'
	| 'not-sellable'
	| 'equipped-item'
	| 'item-cannot-be-sold';

export type ShopSellResult =
	| {
			sold: true;
			wallet: WalletState;
			inventory: InventoryState;
	  }
	| {
			sold: false;
			reason: ShopSellFailureReason;
			wallet: WalletState;
			inventory: InventoryState;
	  };

export type HudShopBuyEntry = {
	stockId: string;
	itemId: string;
	name: string;
	description: string;
	iconPath: string;
	kind: ConsumableDefinition['type'] | EquipmentDefinition['type'];
	price: number;
	availability: { mode: 'unlimited' } | { mode: 'finite'; remaining: number };
	item: ConsumableDefinition | EquipmentDefinition;
};

export type HudShopSellEntry = {
	itemId: string;
	name: string;
	description: string;
	iconPath: string;
	kind: ConsumableDefinition['type'] | EquipmentDefinition['type'];
	quantity: number;
	price: number;
	item: ConsumableDefinition | EquipmentDefinition;
};

function isSellableDefinition(
	item: ReturnType<typeof getItem>
): item is ConsumableDefinition | EquipmentDefinition {
	return item?.type === 'consumable' || item?.type === 'equipment';
}

function getStockBuyPrice(entry: ShopStockEntry): number | undefined {
	const item = getItem(entry.itemId);

	if (!isSellableDefinition(item)) {
		return undefined;
	}

	return entry.buyPrice ?? item.basePrice;
}

function isEquipped(equipment: EquipmentState, itemId: string): boolean {
	return Object.values(equipment).includes(itemId);
}

export function createInitialShopStockState(): ShopStockState {
	const stockState: ShopStockState = {};

	for (const shop of shopList) {
		const finiteEntries = shop.stock.flatMap((entry) =>
			entry.availability.mode === 'finite' ? [[entry.id, entry.availability.quantity] as const] : []
		);

		if (finiteEntries.length === 0) {
			continue;
		}

		stockState[shop.id] = Object.fromEntries(finiteEntries);
	}

	return stockState;
}

export function buyShopItem({
	shopId,
	stockId,
	wallet,
	inventory,
	stockState
}: {
	shopId: string;
	stockId: string;
	wallet: WalletState;
	inventory: InventoryState;
	stockState: ShopStockState;
}): ShopBuyResult {
	const shop = getShop(shopId);

	if (!shop) {
		return { purchased: false, reason: 'shop-not-found', wallet, inventory, stockState };
	}

	const entry = shop.stock.find((stockEntry) => stockEntry.id === stockId);

	if (!entry) {
		return { purchased: false, reason: 'stock-not-found', wallet, inventory, stockState };
	}

	const price = getStockBuyPrice(entry);
	const item = getItem(entry.itemId);

	if (price === undefined || !isSellableDefinition(item)) {
		return { purchased: false, reason: 'item-cannot-be-bought', wallet, inventory, stockState };
	}

	if (wallet.coins < price) {
		return { purchased: false, reason: 'not-enough-coins', wallet, inventory, stockState };
	}

	if (entry.availability.mode === 'finite') {
		const remaining = stockState[shopId]?.[stockId] ?? entry.availability.quantity;

		if (remaining <= 0) {
			return { purchased: false, reason: 'out-of-stock', wallet, inventory, stockState };
		}

		const nextInventory = addItem(inventory, item.id);

		if (nextInventory === inventory) {
			return { purchased: false, reason: 'item-cannot-be-bought', wallet, inventory, stockState };
		}

		return {
			purchased: true,
			wallet: { coins: wallet.coins - price },
			inventory: nextInventory,
			stockState: {
				...stockState,
				[shopId]: {
					...stockState[shopId],
					[stockId]: remaining - 1
				}
			}
		};
	}

	const nextInventory = addItem(inventory, item.id);

	if (nextInventory === inventory) {
		return { purchased: false, reason: 'item-cannot-be-bought', wallet, inventory, stockState };
	}

	return {
		purchased: true,
		wallet: { coins: wallet.coins - price },
		inventory: nextInventory,
		stockState
	};
}

export function sellInventoryItem({
	itemId,
	wallet,
	inventory,
	equipment
}: {
	itemId: string;
	wallet: WalletState;
	inventory: InventoryState;
	equipment: EquipmentState;
}): ShopSellResult {
	const item = getItem(itemId);
	const price = getSellValue(itemId);

	if (!isSellableDefinition(item) || price === undefined) {
		return { sold: false, reason: 'not-sellable', wallet, inventory };
	}

	if (item.type === 'consumable') {
		const result = consumeStackItem(inventory, itemId);

		if (!result.consumed) {
			const appearsOwned = inventory.stacks.some((stack) => stack.itemId === itemId);

			return {
				sold: false,
				reason: appearsOwned ? 'item-cannot-be-sold' : 'item-not-owned',
				wallet,
				inventory
			};
		}

		return { sold: true, wallet: { coins: wallet.coins + price }, inventory: result.inventory };
	}

	if (isEquipped(equipment, itemId)) {
		return { sold: false, reason: 'equipped-item', wallet, inventory };
	}

	const result = removeEquipmentItem(inventory, itemId);

	if (!result.removed) {
		return { sold: false, reason: 'item-not-owned', wallet, inventory };
	}

	return { sold: true, wallet: { coins: wallet.coins + price }, inventory: result.inventory };
}

export function buildShopBuyEntries(
	shopId: string,
	stockState: ShopStockState,
	locale: Locale
): HudShopBuyEntry[] {
	const shop = getShop(shopId);

	if (!shop) {
		return [];
	}

	return shop.stock.flatMap((entry) => {
		const item = getItem(entry.itemId);
		const price = getStockBuyPrice(entry);

		if (!isSellableDefinition(item) || price === undefined) {
			return [];
		}
		const itemText = getItemText(locale, item.id);

		return [
			{
				stockId: entry.id,
				itemId: item.id,
				name: itemText?.name ?? item.name,
				description: itemText?.description ?? item.description,
				iconPath: item.iconPath,
				kind: item.type,
				price,
				availability:
					entry.availability.mode === 'finite'
						? {
								mode: 'finite' as const,
								remaining: stockState[shopId]?.[entry.id] ?? entry.availability.quantity
							}
						: { mode: 'unlimited' as const },
				item
			}
		];
	});
}

export function buildShopSellEntries({
	inventory,
	equipment,
	locale
}: {
	inventory: InventoryState;
	equipment: EquipmentState;
	locale: Locale;
}): HudShopSellEntry[] {
	const stackEntries = inventory.stacks.flatMap((stack) => {
		const item = getItem(stack.itemId);
		const price = getSellValue(stack.itemId);

		if (item?.type !== 'consumable' || price === undefined || stack.quantity <= 0) {
			return [];
		}
		const itemText = getItemText(locale, item.id);

		return [
			{
				itemId: item.id,
				name: itemText?.name ?? item.name,
				description: itemText?.description ?? item.description,
				iconPath: item.iconPath,
				kind: item.type,
				quantity: stack.quantity,
				price,
				item
			}
		];
	});

	const equipmentEntries = inventory.equipment.flatMap((itemId) => {
		const item = getItem(itemId);
		const price = getSellValue(itemId);

		if (item?.type !== 'equipment' || price === undefined || isEquipped(equipment, itemId)) {
			return [];
		}
		const itemText = getItemText(locale, item.id);

		return [
			{
				itemId: item.id,
				name: itemText?.name ?? item.name,
				description: itemText?.description ?? item.description,
				iconPath: item.iconPath,
				kind: item.type,
				quantity: 1,
				price,
				item
			}
		];
	});

	return [...stackEntries, ...equipmentEntries];
}
