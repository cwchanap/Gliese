import { describe, expect, it } from 'vitest';

import { createEmptyEquipment } from '$lib/game/core/equipment';
import type { InventoryState } from '$lib/game/core/inventory';
import {
	buyShopItem,
	buildShopBuyEntries,
	buildShopSellEntries,
	createInitialShopStockState,
	sellInventoryItem
} from '$lib/game/core/shop';
import type {
	HudShopBuyEntry,
	HudShopSellEntry,
	ShopBuyFailureReason,
	ShopBuyResult,
	ShopSellFailureReason,
	ShopSellResult
} from '$lib/game/core/shop';

type ShopApiContract = {
	buyFailure: ShopBuyFailureReason;
	sellFailure: ShopSellFailureReason;
	buyResult: ShopBuyResult;
	sellResult: ShopSellResult;
	buyEntry: HudShopBuyEntry;
	sellEntry: HudShopSellEntry;
};

const shopApiContract: ShopApiContract | null = null;

describe('shop core', () => {
	it('exports the planned shop API type names', () => {
		expect(shopApiContract).toBeNull();
	});

	it('creates finite stock state from shop definitions', () => {
		expect(createInitialShopStockState()).toEqual({
			'guild-quartermaster': {
				'iron-cap': 1,
				'grip-wraps': 1,
				'traveler-vest': 1
			}
		});
	});

	it('buys unlimited consumables without changing stock', () => {
		const inventory: InventoryState = { stacks: [], equipment: [] };
		const stockState = createInitialShopStockState();

		const result = buyShopItem({
			shopId: 'miras-item-shop',
			stockId: 'field-potion',
			wallet: { coins: 30 },
			inventory,
			stockState
		});

		expect(result.purchased).toBe(true);
		expect(result.wallet).toEqual({ coins: 20 });
		expect(result.inventory.stacks).toEqual([{ itemId: 'field-potion', quantity: 1 }]);
		expect(result.stockState).toBe(stockState);
	});

	it('buys finite equipment and decrements saved stock', () => {
		const result = buyShopItem({
			shopId: 'guild-quartermaster',
			stockId: 'iron-cap',
			wallet: { coins: 40 },
			inventory: { stacks: [], equipment: [] },
			stockState: createInitialShopStockState()
		});

		expect(result.purchased).toBe(true);
		expect(result.wallet).toEqual({ coins: 5 });
		expect(result.inventory.equipment).toEqual(['iron-cap']);
		expect(result.stockState['guild-quartermaster']?.['iron-cap']).toBe(0);
	});

	it('rejects unaffordable and depleted purchases without mutation', () => {
		const inventory: InventoryState = { stacks: [], equipment: [] };
		const depletedStock = {
			'guild-quartermaster': {
				'iron-cap': 0,
				'grip-wraps': 1,
				'traveler-vest': 1
			}
		};

		const unaffordable = buyShopItem({
			shopId: 'miras-item-shop',
			stockId: 'greater-field-potion',
			wallet: { coins: 1 },
			inventory,
			stockState: depletedStock
		});
		const depleted = buyShopItem({
			shopId: 'guild-quartermaster',
			stockId: 'iron-cap',
			wallet: { coins: 100 },
			inventory,
			stockState: depletedStock
		});

		expect(unaffordable).toMatchObject({ purchased: false, reason: 'not-enough-coins' });
		expect(unaffordable.inventory).toBe(inventory);
		expect(unaffordable.stockState).toBe(depletedStock);
		expect(depleted).toMatchObject({ purchased: false, reason: 'out-of-stock' });
		expect(depleted.inventory).toBe(inventory);
		expect(depleted.stockState).toBe(depletedStock);
	});

	it('distinguishes missing shops from missing stock', () => {
		const inventory: InventoryState = { stacks: [], equipment: [] };
		const stockState = createInitialShopStockState();
		const wallet = { coins: 100 };

		const missingShop = buyShopItem({
			shopId: 'missing-shop',
			stockId: 'iron-cap',
			wallet,
			inventory,
			stockState
		});
		const missingStock = buyShopItem({
			shopId: 'guild-quartermaster',
			stockId: 'missing-stock',
			wallet,
			inventory,
			stockState
		});

		expect(missingShop).toMatchObject({ purchased: false, reason: 'shop-not-found' });
		expect(missingShop.wallet).toBe(wallet);
		expect(missingShop.inventory).toBe(inventory);
		expect(missingShop.stockState).toBe(stockState);
		expect(missingStock).toMatchObject({ purchased: false, reason: 'stock-not-found' });
		expect(missingStock.wallet).toBe(wallet);
		expect(missingStock.inventory).toBe(inventory);
		expect(missingStock.stockState).toBe(stockState);
	});

	it('rejects duplicate finite equipment purchases without spending or stock changes', () => {
		const wallet = { coins: 100 };
		const inventory: InventoryState = { stacks: [], equipment: ['iron-cap'] };
		const stockState = createInitialShopStockState();

		const result = buyShopItem({
			shopId: 'guild-quartermaster',
			stockId: 'iron-cap',
			wallet,
			inventory,
			stockState
		});

		expect(result).toMatchObject({ purchased: false, reason: 'item-cannot-be-bought' });
		expect(result.wallet).toBe(wallet);
		expect(result.inventory).toBe(inventory);
		expect(result.stockState).toBe(stockState);
		expect(stockState['guild-quartermaster']?.['iron-cap']).toBe(1);
	});

	it('sells one consumable stack item for half base price', () => {
		const result = sellInventoryItem({
			itemId: 'field-potion',
			wallet: { coins: 3 },
			inventory: { stacks: [{ itemId: 'field-potion', quantity: 2 }], equipment: [] },
			equipment: createEmptyEquipment()
		});

		expect(result.sold).toBe(true);
		expect(result.wallet).toEqual({ coins: 8 });
		expect(result.inventory.stacks).toEqual([{ itemId: 'field-potion', quantity: 1 }]);
	});

	it('sells unequipped equipment and rejects equipped or key items', () => {
		const inventory: InventoryState = {
			stacks: [{ itemId: 'warden-sigil', quantity: 1 }],
			equipment: ['training-sword', 'iron-cap']
		};
		const equipment = { ...createEmptyEquipment(), weapon: 'training-sword' };

		const equipped = sellInventoryItem({
			itemId: 'training-sword',
			wallet: { coins: 0 },
			inventory,
			equipment
		});
		const key = sellInventoryItem({
			itemId: 'warden-sigil',
			wallet: { coins: 0 },
			inventory,
			equipment
		});
		const sold = sellInventoryItem({
			itemId: 'iron-cap',
			wallet: { coins: 0 },
			inventory,
			equipment
		});

		expect(equipped).toMatchObject({ sold: false, reason: 'equipped-item' });
		expect(key).toMatchObject({ sold: false, reason: 'not-sellable' });
		expect(sold.sold).toBe(true);
		expect(sold.wallet).toEqual({ coins: 17 });
		expect(sold.inventory.equipment).toEqual(['training-sword']);
	});

	it('uses item-not-owned for missing owned sellable items', () => {
		const wallet = { coins: 0 };
		const inventory: InventoryState = { stacks: [], equipment: [] };
		const equipment = createEmptyEquipment();

		const missingConsumable = sellInventoryItem({
			itemId: 'field-potion',
			wallet,
			inventory,
			equipment
		});
		const missingEquipment = sellInventoryItem({
			itemId: 'iron-cap',
			wallet,
			inventory,
			equipment
		});

		expect(missingConsumable).toMatchObject({ sold: false, reason: 'item-not-owned' });
		expect(missingConsumable.wallet).toBe(wallet);
		expect(missingConsumable.inventory).toBe(inventory);
		expect(missingEquipment).toMatchObject({ sold: false, reason: 'item-not-owned' });
		expect(missingEquipment.wallet).toBe(wallet);
		expect(missingEquipment.inventory).toBe(inventory);
	});

	it('uses item-cannot-be-sold for malformed owned sellable inventory', () => {
		const wallet = { coins: 0 };
		const inventory: InventoryState = {
			stacks: [{ itemId: 'field-potion', quantity: 0 }],
			equipment: []
		};

		const result = sellInventoryItem({
			itemId: 'field-potion',
			wallet,
			inventory,
			equipment: createEmptyEquipment()
		});

		expect(result).toMatchObject({ sold: false, reason: 'item-cannot-be-sold' });
		expect(result.wallet).toBe(wallet);
		expect(result.inventory).toBe(inventory);
	});

	it('builds normalized buy and sell views', () => {
		const stockState = createInitialShopStockState();
		expect(buildShopBuyEntries('guild-quartermaster', stockState)).toContainEqual(
			expect.objectContaining({
				stockId: 'iron-cap',
				itemId: 'iron-cap',
				price: 35,
				availability: { mode: 'finite', remaining: 1 }
			})
		);
		expect(
			buildShopSellEntries({
				inventory: { stacks: [{ itemId: 'field-potion', quantity: 2 }], equipment: ['iron-cap'] },
				equipment: createEmptyEquipment()
			})
		).toEqual([
			expect.objectContaining({
				itemId: 'field-potion',
				quantity: 2,
				kind: 'consumable',
				price: 5
			}),
			expect.objectContaining({ itemId: 'iron-cap', quantity: 1, kind: 'equipment', price: 17 })
		]);
	});
});
