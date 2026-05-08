# Shop System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved general NPC shop system with buying, selling, coins, starter item/equipment shops, and save persistence.

**Architecture:** Add shop and price content first, then pure shop rules, then persist wallet and finite stock in save `version: 3`. Wire the rules through the existing Phaser-to-Svelte HUD bridge so `WorldScene` owns runtime validation and `GameShell.svelte` owns a dedicated paused Shop overlay.

**Tech Stack:** TypeScript, Svelte 5 runes, SvelteKit, Phaser 4, Vitest, Playwright, Bun, Cloudflare adapter.

---

## File Structure

- Modify `src/lib/game/content/items.ts`: add prices and sellability helpers for consumables/equipment.
- Modify `src/lib/game/content/items.test.ts`: validate price coverage and sell values.
- Create `src/lib/game/content/shops.ts`: declarative shop definitions and lookup helpers.
- Create `src/lib/game/content/shops.test.ts`: validates stock ids, item references, finite stock, and no key item commerce.
- Modify `src/lib/game/content/maps.ts`: add optional `shopId` to `MapNpc`, attach Mira's shop, and add Guild Quartermaster.
- Modify `src/lib/game/content/maps.test.ts`: assert shop NPC placement and `shopId` references.
- Create `src/lib/game/core/shop.ts`: pure wallet, stock, buy, sell, and shop-view rules.
- Create `src/lib/game/core/shop.test.ts`: verifies buy/sell behavior, stock decrement, failures, and immutable failure states.
- Modify `src/lib/game/content/enemies.ts`: add `coinReward` to enemy definitions.
- Modify `src/lib/game/content/enemies.test.ts`: validate coin rewards.
- Modify `src/lib/game/save/save-state.ts`: bump to `version: 3`, add `wallet` and `shops.stock`.
- Modify `src/lib/game/save/save-state.test.ts`: assert new save shape and validation failures.
- Modify `src/lib/game/save/storage.ts`: change storage key to `gliese.save.v3`.
- Modify `src/lib/game/save/storage.test.ts`: assert v3 key behavior and obsolete v2 slot behavior.
- Modify `src/lib/game/ui-bridge/events.ts`: add wallet/shop HUD state and shop commands.
- Modify `src/lib/game/ui-bridge/store.ts`: add shop request helpers and initial HUD defaults.
- Modify `src/lib/game/phaser/scenes/WorldScene.ts`: track wallet, shop stock, nearby shop, open shop, buy/sell commands, and coin rewards.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`: cover shop proximity, buy/sell commands, stock persistence, and coin rewards.
- Modify `src/lib/game/GameShell.svelte`: add Shop action and dedicated Buy/Sell overlay.
- Modify `src/routes/game/page.svelte.e2e.ts`: add a browser flow for opening shop near a merchant and buying/selling.

## Task 1: Shop Content And NPC Attachments

**Files:**

- Modify: `src/lib/game/content/items.ts`
- Modify: `src/lib/game/content/items.test.ts`
- Create: `src/lib/game/content/shops.ts`
- Create: `src/lib/game/content/shops.test.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps.test.ts`

- [ ] **Step 1: Write failing item price tests**

Append these tests to `src/lib/game/content/items.test.ts`:

```ts
it('defines base prices for every sellable item', () => {
	for (const item of itemList) {
		if (item.type === 'key') {
			expect('basePrice' in item).toBe(false);
			continue;
		}

		expect(item.basePrice).toBeGreaterThan(0);
	}

	expect(items['field-potion']).toMatchObject({ basePrice: 10 });
	expect(items['traveler-vest']).toMatchObject({ basePrice: 45 });
	expect(items['warden-crown']).toMatchObject({ basePrice: 100 });
});

it('returns sell values only for consumables and equipment', () => {
	expect(getSellValue('field-potion')).toBe(5);
	expect(getSellValue('traveler-vest')).toBe(22);
	expect(getSellValue('warden-sigil')).toBeUndefined();
	expect(getSellValue('not-real')).toBeUndefined();
});
```

Update the import in the same file:

```ts
import {
	equipmentSlots,
	getItem,
	getSellValue,
	items,
	itemList,
	type EquipmentDefinition
} from '$lib/game/content/items';
```

- [ ] **Step 2: Run item content tests to verify failure**

Run: `bun run test:unit -- src/lib/game/content/items.test.ts --run`

Expected: FAIL because `getSellValue` and `basePrice` are not defined.

- [ ] **Step 3: Add item price types and helpers**

Modify `src/lib/game/content/items.ts`:

```ts
type BaseItemDefinition = {
	id: string;
	name: string;
	description: string;
	stackable: boolean;
};

type PricedItemDefinition = BaseItemDefinition & {
	basePrice: number;
};

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
```

Add `basePrice` properties to the existing item objects with these exact values:

| Item id                | `basePrice` |
| ---------------------- | ----------: |
| `field-potion`         |          10 |
| `greater-field-potion` |          18 |
| `ember-tonic`          |           8 |
| `ruin-draught`         |          14 |
| `sunleaf-salve`        |          12 |
| `training-sword`       |          40 |
| `ruin-blade`           |          80 |
| `iron-cap`             |          35 |
| `warden-crown`         |         100 |
| `traveler-vest`        |          45 |
| `stone-mail`           |          90 |
| `grip-wraps`           |          35 |
| `meadow-charm`         |          30 |

Add helpers near `getItem`:

```ts
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
```

- [ ] **Step 4: Run item content tests to verify pass**

Run: `bun run test:unit -- src/lib/game/content/items.test.ts --run`

Expected: PASS.

- [ ] **Step 5: Write failing shop content tests**

Create `src/lib/game/content/shops.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { getItem } from '$lib/game/content/items';
import { getShop, shopList, shops } from '$lib/game/content/shops';

describe('shop content', () => {
	it('defines the starter item and equipment shops', () => {
		expect(getShop('miras-item-shop')).toBe(shops['miras-item-shop']);
		expect(getShop('guild-quartermaster')).toBe(shops['guild-quartermaster']);
		expect(shopList).toHaveLength(2);
	});

	it('keeps shop and stock ids stable and unique', () => {
		expect(new Set(shopList.map((shop) => shop.id)).size).toBe(shopList.length);

		for (const shop of shopList) {
			expect(new Set(shop.stock.map((entry) => entry.id)).size).toBe(shop.stock.length);
			expect(shop.name).not.toHaveLength(0);
			expect(shop.merchantName).not.toHaveLength(0);
		}
	});

	it('uses known non-key items for shop stock', () => {
		const itemShop = shops['miras-item-shop'];
		expect(itemShop.stock).toEqual([
			{ id: 'field-potion', itemId: 'field-potion', availability: { mode: 'unlimited' } },
			{ id: 'sunleaf-salve', itemId: 'sunleaf-salve', availability: { mode: 'unlimited' } },
			{
				id: 'greater-field-potion',
				itemId: 'greater-field-potion',
				availability: { mode: 'unlimited' }
			}
		]);

		for (const shop of shopList) {
			for (const entry of shop.stock) {
				const item = getItem(entry.itemId);
				expect(item).toBeDefined();
				expect(item?.type).not.toBe('key');
			}
		}
	});

	it('uses unlimited stock for consumables and finite stock for equipment', () => {
		for (const entry of shops['miras-item-shop'].stock) {
			expect(getItem(entry.itemId)?.type).toBe('consumable');
			expect(entry.availability).toEqual({ mode: 'unlimited' });
		}

		expect(shops['guild-quartermaster'].stock).toEqual([
			{ id: 'iron-cap', itemId: 'iron-cap', availability: { mode: 'finite', quantity: 1 } },
			{ id: 'grip-wraps', itemId: 'grip-wraps', availability: { mode: 'finite', quantity: 1 } },
			{
				id: 'traveler-vest',
				itemId: 'traveler-vest',
				availability: { mode: 'finite', quantity: 1 }
			}
		]);
	});
});
```

- [ ] **Step 6: Run shop content tests to verify failure**

Run: `bun run test:unit -- src/lib/game/content/shops.test.ts --run`

Expected: FAIL with an import error for `$lib/game/content/shops`.

- [ ] **Step 7: Implement shop content**

Create `src/lib/game/content/shops.ts`:

```ts
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
```

- [ ] **Step 8: Run shop content tests to verify pass**

Run: `bun run test:unit -- src/lib/game/content/shops.test.ts --run`

Expected: PASS.

- [ ] **Step 9: Write failing NPC shop tests**

Modify `src/lib/game/content/maps.test.ts`:

```ts
import { getShop } from '$lib/game/content/shops';
```

Update the Guild Hall NPC expectation:

```ts
expect(guildHallMap.npcs).toEqual([
	{
		id: 'guild-clerk',
		x: 256,
		y: 144,
		name: 'Guild Clerk',
		dialogue: 'Morning. The ruins survey is posted; take the east road when you are ready.',
		role: 'guild',
		frameName: 'titleBadge'
	},
	{
		id: 'guild-quartermaster',
		x: 352,
		y: 144,
		name: 'Quartermaster Vale',
		dialogue: 'Need field gear before the ruins? Guild stock is limited, but sturdy.',
		role: 'shopkeeper',
		frameName: 'titleBadge',
		shopId: 'guild-quartermaster'
	}
]);
```

Update the Item Shop NPC expectation:

```ts
expect(itemShopMap.npcs).toEqual([
	{
		id: 'shopkeeper-mira',
		x: 256,
		y: 144,
		name: 'Mira',
		dialogue: 'Fresh tonics are on the shelf. The guild already stocked your field kit today.',
		role: 'shopkeeper',
		frameName: 'titleBadge',
		shopId: 'miras-item-shop'
	}
]);
```

Add this assertion inside the existing NPC validation loop:

```ts
if (npc.shopId) {
	expect(getShop(npc.shopId)).toBeDefined();
	expect(npc.role).toBe('shopkeeper');
}
```

- [ ] **Step 10: Run map content tests to verify failure**

Run: `bun run test:unit -- src/lib/game/content/maps.test.ts --run`

Expected: FAIL because `shopId` and the Guild Quartermaster NPC are not yet defined.

- [ ] **Step 11: Attach shops to NPC content**

Modify `src/lib/game/content/maps.ts`:

```ts
export interface MapNpc {
	id: string;
	x: number;
	y: number;
	name: string;
	dialogue: string;
	role: MapNpcRole;
	frameName: 'titleBadge';
	shopId?: string;
}
```

Add the second Guild Hall NPC after `guild-clerk`:

```ts
{
	id: 'guild-quartermaster',
	x: 352,
	y: 144,
	name: 'Quartermaster Vale',
	dialogue: 'Need field gear before the ruins? Guild stock is limited, but sturdy.',
	role: 'shopkeeper',
	frameName: 'titleBadge',
	shopId: 'guild-quartermaster'
}
```

Add Mira's shop id:

```ts
{
	id: 'shopkeeper-mira',
	x: 256,
	y: 144,
	name: 'Mira',
	dialogue: 'Fresh tonics are on the shelf. The guild already stocked your field kit today.',
	role: 'shopkeeper',
	frameName: 'titleBadge',
	shopId: 'miras-item-shop'
}
```

- [ ] **Step 12: Run content tests to verify pass**

Run: `bun run test:unit -- src/lib/game/content/items.test.ts src/lib/game/content/shops.test.ts src/lib/game/content/maps.test.ts --run`

Expected: PASS.

- [ ] **Step 13: Commit content**

```bash
git add src/lib/game/content/items.ts src/lib/game/content/items.test.ts src/lib/game/content/shops.ts src/lib/game/content/shops.test.ts src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts
git commit -m "Add shop content definitions"
```

## Task 2: Pure Shop Rules

**Files:**

- Create: `src/lib/game/core/shop.ts`
- Create: `src/lib/game/core/shop.test.ts`
- Modify: `src/lib/game/core/inventory.ts`
- Modify: `src/lib/game/core/inventory.test.ts`

- [ ] **Step 1: Write failing inventory removal tests**

Update the existing `./inventory` import in `src/lib/game/core/inventory.test.ts`:

```ts
import {
	addItem,
	consumeStackItem,
	createEmptyInventory,
	ownsEquipment,
	removeEquipmentItem
} from './inventory';
```

Add tests:

```ts
it('removes owned equipment by item id', () => {
	const inventory = {
		stacks: [],
		equipment: ['training-sword', 'iron-cap']
	};

	expect(removeEquipmentItem(inventory, 'iron-cap')).toEqual({
		removed: true,
		inventory: { stacks: [], equipment: ['training-sword'] }
	});
});

it('leaves inventory unchanged when removing unowned equipment', () => {
	const inventory = {
		stacks: [],
		equipment: ['training-sword']
	};

	const result = removeEquipmentItem(inventory, 'iron-cap');

	expect(result.removed).toBe(false);
	expect(result.inventory).toBe(inventory);
});
```

- [ ] **Step 2: Run inventory tests to verify failure**

Run: `bun run test:unit -- src/lib/game/core/inventory.test.ts --run`

Expected: FAIL because `removeEquipmentItem` is not exported.

- [ ] **Step 3: Implement equipment removal helper**

Add to `src/lib/game/core/inventory.ts`:

```ts
export function removeEquipmentItem(
	inventory: InventoryState,
	itemId: string
): { removed: boolean; inventory: InventoryState } {
	if (!inventory.equipment.includes(itemId)) {
		return { removed: false, inventory };
	}

	return {
		removed: true,
		inventory: {
			...inventory,
			equipment: inventory.equipment.filter((ownedItemId) => ownedItemId !== itemId)
		}
	};
}
```

- [ ] **Step 4: Run inventory tests to verify pass**

Run: `bun run test:unit -- src/lib/game/core/inventory.test.ts --run`

Expected: PASS.

- [ ] **Step 5: Write failing pure shop tests**

Create `src/lib/game/core/shop.test.ts`:

```ts
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

describe('shop core', () => {
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
```

- [ ] **Step 6: Run shop core tests to verify failure**

Run: `bun run test:unit -- src/lib/game/core/shop.test.ts --run`

Expected: FAIL because `src/lib/game/core/shop.ts` does not exist.

- [ ] **Step 7: Implement pure shop rules**

Create `src/lib/game/core/shop.ts`:

```ts
import { getItem, getSellValue } from '$lib/game/content/items';
import { getShop, shopList, type ShopStockEntry } from '$lib/game/content/shops';
import type { EquipmentState } from '$lib/game/core/equipment';
import {
	addItem,
	consumeStackItem,
	removeEquipmentItem,
	type InventoryState
} from '$lib/game/core/inventory';

export type WalletState = {
	coins: number;
};

export type ShopStockState = Record<string, Record<string, number>>;

export type ShopBuyFailureReason =
	| 'shop-not-found'
	| 'stock-not-found'
	| 'not-enough-coins'
	| 'out-of-stock'
	| 'item-cannot-be-bought';

export type ShopSellFailureReason =
	| 'item-not-owned'
	| 'not-sellable'
	| 'equipped-item'
	| 'item-cannot-be-sold';

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

export type ShopSellResult =
	| { sold: true; wallet: WalletState; inventory: InventoryState }
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
	price: number;
	availability: { mode: 'unlimited' } | { mode: 'finite'; remaining: number };
};

export type HudShopSellEntry = {
	itemId: string;
	name: string;
	description: string;
	quantity: number;
	kind: 'consumable' | 'equipment';
	price: number;
};

export function createInitialShopStockState(): ShopStockState {
	return Object.fromEntries(
		shopList.flatMap((shop) => {
			const finiteEntries = shop.stock.filter((entry) => entry.availability.mode === 'finite');

			return finiteEntries.length
				? [
						[
							shop.id,
							Object.fromEntries(
								finiteEntries.map((entry) => [
									entry.id,
									entry.availability.mode === 'finite' ? entry.availability.quantity : 0
								])
							)
						]
					]
				: [];
		})
	);
}

export function getStockBuyPrice(entry: ShopStockEntry): number | undefined {
	const item = getItem(entry.itemId);

	if (item?.type !== 'consumable' && item?.type !== 'equipment') {
		return undefined;
	}

	return entry.buyPrice ?? item.basePrice;
}

export function buyShopItem(input: {
	shopId: string;
	stockId: string;
	wallet: WalletState;
	inventory: InventoryState;
	stockState: ShopStockState;
}): ShopBuyResult {
	const shop = getShop(input.shopId);
	const entry = shop?.stock.find((stockEntry) => stockEntry.id === input.stockId);

	if (!shop) return { purchased: false, reason: 'shop-not-found', ...input };
	if (!entry) return { purchased: false, reason: 'stock-not-found', ...input };

	const price = getStockBuyPrice(entry);
	if (price === undefined) return { purchased: false, reason: 'item-cannot-be-bought', ...input };
	if (input.wallet.coins < price) return { purchased: false, reason: 'not-enough-coins', ...input };

	if (entry.availability.mode === 'finite') {
		const remaining = input.stockState[shop.id]?.[entry.id] ?? 0;

		if (remaining < 1) {
			return { purchased: false, reason: 'out-of-stock', ...input };
		}

		return {
			purchased: true,
			wallet: { coins: input.wallet.coins - price },
			inventory: addItem(input.inventory, entry.itemId, 1),
			stockState: {
				...input.stockState,
				[shop.id]: {
					...input.stockState[shop.id],
					[entry.id]: remaining - 1
				}
			}
		};
	}

	return {
		purchased: true,
		wallet: { coins: input.wallet.coins - price },
		inventory: addItem(input.inventory, entry.itemId, 1),
		stockState: input.stockState
	};
}

export function sellInventoryItem(input: {
	itemId: string;
	wallet: WalletState;
	inventory: InventoryState;
	equipment: EquipmentState;
}): ShopSellResult {
	const item = getItem(input.itemId);
	const sellValue = getSellValue(input.itemId);

	if (!item || sellValue === undefined) {
		return {
			sold: false,
			reason: 'not-sellable',
			wallet: input.wallet,
			inventory: input.inventory
		};
	}

	if (item.type === 'equipment') {
		if (Object.values(input.equipment).includes(input.itemId)) {
			return {
				sold: false,
				reason: 'equipped-item',
				wallet: input.wallet,
				inventory: input.inventory
			};
		}

		const removed = removeEquipmentItem(input.inventory, input.itemId);

		return removed.removed
			? {
					sold: true,
					wallet: { coins: input.wallet.coins + sellValue },
					inventory: removed.inventory
				}
			: {
					sold: false,
					reason: 'item-not-owned',
					wallet: input.wallet,
					inventory: input.inventory
				};
	}

	const consumed = consumeStackItem(input.inventory, input.itemId);

	return consumed.consumed
		? {
				sold: true,
				wallet: { coins: input.wallet.coins + sellValue },
				inventory: consumed.inventory
			}
		: {
				sold: false,
				reason: 'item-not-owned',
				wallet: input.wallet,
				inventory: input.inventory
			};
}

export function buildShopBuyEntries(shopId: string, stockState: ShopStockState): HudShopBuyEntry[] {
	const shop = getShop(shopId);
	if (!shop) return [];

	return shop.stock.flatMap((entry) => {
		const item = getItem(entry.itemId);
		const price = getStockBuyPrice(entry);

		if (!item || price === undefined) return [];

		return [
			{
				stockId: entry.id,
				itemId: item.id,
				name: item.name,
				description: item.description,
				price,
				availability:
					entry.availability.mode === 'unlimited'
						? { mode: 'unlimited' as const }
						: {
								mode: 'finite' as const,
								remaining: stockState[shop.id]?.[entry.id] ?? 0
							}
			}
		];
	});
}

export function buildShopSellEntries(input: {
	inventory: InventoryState;
	equipment: EquipmentState;
}): HudShopSellEntry[] {
	const stackEntries = input.inventory.stacks.flatMap((stack) => {
		const item = getItem(stack.itemId);
		const price = getSellValue(stack.itemId);

		return item?.type === 'consumable' && price !== undefined
			? [
					{
						itemId: item.id,
						name: item.name,
						description: item.description,
						quantity: stack.quantity,
						kind: 'consumable' as const,
						price
					}
				]
			: [];
	});
	const equipmentEntries = input.inventory.equipment.flatMap((itemId) => {
		if (Object.values(input.equipment).includes(itemId)) return [];

		const item = getItem(itemId);
		const price = getSellValue(itemId);

		return item?.type === 'equipment' && price !== undefined
			? [
					{
						itemId: item.id,
						name: item.name,
						description: item.description,
						quantity: 1,
						kind: 'equipment' as const,
						price
					}
				]
			: [];
	});

	return [...stackEntries, ...equipmentEntries];
}
```

- [ ] **Step 8: Run pure shop tests to verify pass**

Run: `bun run test:unit -- src/lib/game/core/inventory.test.ts src/lib/game/core/shop.test.ts --run`

Expected: PASS.

- [ ] **Step 9: Commit pure rules**

```bash
git add src/lib/game/core/inventory.ts src/lib/game/core/inventory.test.ts src/lib/game/core/shop.ts src/lib/game/core/shop.test.ts
git commit -m "Add pure shop rules"
```

## Task 3: Save Schema And Coin Rewards

**Files:**

- Modify: `src/lib/game/content/enemies.ts`
- Modify: `src/lib/game/content/enemies.test.ts`
- Modify: `src/lib/game/save/save-state.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Modify: `src/lib/game/save/storage.ts`
- Modify: `src/lib/game/save/storage.test.ts`

- [ ] **Step 1: Write failing enemy coin reward tests**

Append to `src/lib/game/content/enemies.test.ts`:

```ts
it('defines non-negative coin rewards for every enemy', () => {
	expect(enemies['slime-scout'].coinReward).toBe(4);
	expect(enemies['ruins-warden'].coinReward).toBe(25);

	for (const enemy of Object.values(enemies)) {
		expect(Number.isInteger(enemy.coinReward)).toBe(true);
		expect(enemy.coinReward).toBeGreaterThanOrEqual(0);
	}
});
```

- [ ] **Step 2: Run enemy tests to verify failure**

Run: `bun run test:unit -- src/lib/game/content/enemies.test.ts --run`

Expected: FAIL because `coinReward` is not defined.

- [ ] **Step 3: Add enemy coin rewards**

Modify `src/lib/game/content/enemies.ts`:

```ts
export interface EnemyCombatDefinition extends EnemyDefinition {
	xpReward: number;
	coinReward: number;
	loot?: LootTable;
	boss?: {
		phaseTwoColor: number;
	};
}
```

Add `coinReward: 4` to `slimeScout` immediately after `xpReward: 4`, and add `coinReward: 25` to `ruinsWarden` immediately after `xpReward: 18`.

- [ ] **Step 4: Run enemy tests to verify pass**

Run: `bun run test:unit -- src/lib/game/content/enemies.test.ts --run`

Expected: PASS.

- [ ] **Step 5: Write failing save/storage tests**

Update the starting save expectation in `src/lib/game/save/save-state.test.ts` so the expected object is:

```ts
expect(createNewSaveState()).toEqual({
	version: 3,
	mapId: meadowEntryMap.id,
	player: {
		level: 1,
		xp: getXpForLevel(1),
		hp: startingPlayer.baseHp,
		attack: startingPlayer.baseAttack,
		x: meadowEntryMap.spawn.x,
		y: meadowEntryMap.spawn.y,
		facing: meadowEntryMap.spawnDirection
	},
	flags: { clearedEncounters: [], collectedPickups: [], resolvedEncounterDrops: {} },
	inventory: {
		stacks: [{ itemId: 'field-potion', quantity: 1 }],
		equipment: ['training-sword']
	},
	equipment: {
		weapon: 'training-sword',
		head: null,
		body: null,
		hands: null,
		accessory: null
	},
	wallet: { coins: 30 },
	shops: {
		stock: {
			'guild-quartermaster': {
				'iron-cap': 1,
				'grip-wraps': 1,
				'traveler-vest': 1
			}
		}
	}
});
```

Update version assertions:

```ts
it('rejects version 2 and accepts version 3', () => {
	expect(parseSaveState(JSON.stringify({ ...createNewSaveState(), version: 2 }))).toBeNull();
	expect(parseSaveState(JSON.stringify(createNewSaveState()))?.version).toBe(3);
});
```

Add validation tests:

```ts
it('rejects invalid wallet and shop stock state', () => {
	const save = createNewSaveState();

	for (const invalidPayload of [
		{ ...save, wallet: undefined },
		{ ...save, wallet: { coins: -1 } },
		{ ...save, wallet: { coins: 1.5 } },
		{ ...save, shops: undefined },
		{ ...save, shops: { stock: [] } },
		{ ...save, shops: { stock: { 'not-real': { 'iron-cap': 1 } } } },
		{ ...save, shops: { stock: { 'guild-quartermaster': { 'not-real': 1 } } } },
		{ ...save, shops: { stock: { 'guild-quartermaster': { 'iron-cap': -1 } } } },
		{ ...save, shops: { stock: { 'guild-quartermaster': { 'iron-cap': 1.5 } } } }
	]) {
		expect(parseSaveState(JSON.stringify(invalidPayload))).toBeNull();
	}
});
```

Update `src/lib/game/save/storage.test.ts`:

```ts
expect(storage.getItem('gliese.save.v3')).toContain('"mapId":"meadow-entry"');
expect(storage.getItem('gliese.save.v3')).toContain('"version":3');
expect(loadStoredSaveResult(storage).saveState?.wallet).toEqual({ coins: 30 });
```

Update invalid and obsolete key tests:

```ts
storage.setItem('gliese.save.v3', '{"version":2,"bad":true}');
storage.setItem('gliese.save.v2', JSON.stringify(createNewSaveState()));
expect(loadStoredSaveResult(storage)).toEqual({ status: 'missing', saveState: null });
```

- [ ] **Step 6: Run save/storage tests to verify failure**

Run: `bun run test:unit -- src/lib/game/save/save-state.test.ts src/lib/game/save/storage.test.ts --run`

Expected: FAIL because save version, wallet, shops, and storage key are not implemented.

- [ ] **Step 7: Implement save v3 state**

Modify `src/lib/game/save/save-state.ts` imports:

```ts
import {
	createInitialShopStockState,
	type ShopStockState,
	type WalletState
} from '$lib/game/core/shop';
import { getShop } from '$lib/game/content/shops';
```

Update `SaveState` by changing `version: 2` to `version: 3` and adding these fields after `equipment`:

```ts
wallet: WalletState;
shops: {
	stock: ShopStockState;
}
```

Update `createNewSaveState()`:

```ts
version: 3,
wallet: { coins: 30 },
shops: {
	stock: createInitialShopStockState()
}
```

Update `isSaveState` destructuring and required checks:

```ts
const { version, mapId, player, flags, inventory, equipment, wallet, shops } = value;

if (
	version !== 3 ||
	typeof mapId !== 'string' ||
	!isRecord(player) ||
	!isRecord(flags) ||
	!isInventoryState(inventory) ||
	!isEquipmentState(equipment, inventory) ||
	!isWalletState(wallet) ||
	!isShopsState(shops)
) {
	return false;
}
```

Add validators:

```ts
function isWalletState(value: unknown): value is WalletState {
	return (
		isRecord(value) && isNumber(value.coins) && Number.isInteger(value.coins) && value.coins >= 0
	);
}

function isShopsState(value: unknown): value is SaveState['shops'] {
	return isRecord(value) && isShopStockState(value.stock);
}

function isShopStockState(value: unknown): value is ShopStockState {
	if (!isRecord(value) || Array.isArray(value)) {
		return false;
	}

	return Object.entries(value).every(([shopId, stockById]) => {
		const shop = getShop(shopId);

		if (!shop || !isRecord(stockById) || Array.isArray(stockById)) {
			return false;
		}

		return Object.entries(stockById).every(([stockId, quantity]) => {
			const stock = shop.stock.find((entry) => entry.id === stockId);

			return (
				stock?.availability.mode === 'finite' &&
				isNumber(quantity) &&
				Number.isInteger(quantity) &&
				quantity >= 0
			);
		});
	});
}
```

- [ ] **Step 8: Update storage key**

Modify `src/lib/game/save/storage.ts`:

```ts
export const SAVE_STORAGE_KEY = 'gliese.save.v3';
```

- [ ] **Step 9: Run save/storage/enemy tests to verify pass**

Run: `bun run test:unit -- src/lib/game/content/enemies.test.ts src/lib/game/save/save-state.test.ts src/lib/game/save/storage.test.ts --run`

Expected: PASS.

- [ ] **Step 10: Commit save and economy state**

```bash
git add src/lib/game/content/enemies.ts src/lib/game/content/enemies.test.ts src/lib/game/save/save-state.ts src/lib/game/save/save-state.test.ts src/lib/game/save/storage.ts src/lib/game/save/storage.test.ts
git commit -m "Persist shop economy state"
```

## Task 4: HUD Bridge And WorldScene Runtime

**Files:**

- Modify: `src/lib/game/ui-bridge/events.ts`
- Modify: `src/lib/game/ui-bridge/store.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Write failing scene tests for shop runtime**

Append to `src/lib/game/phaser/scenes/scenes.test.ts`:

```ts
it('publishes nearby shop metadata for shopkeeper NPCs', async () => {
	const events = await import('$lib/game/ui-bridge/events');
	const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'item-shop' });
	emitHudStateSpy.mockClear();
	Object.assign(phaserState.playerMarker, { x: 256, y: 144 });

	scene.update(0, 16);

	expect(emitHudStateSpy).toHaveBeenLastCalledWith(
		expect.objectContaining({
			nearbyShop: {
				shopId: 'miras-item-shop',
				name: "Mira's Item Shop",
				merchantName: 'Mira'
			}
		})
	);
});

it('opens a nearby shop and publishes buy and sell views', async () => {
	const events = await import('$lib/game/ui-bridge/events');
	const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		handleHudCommand: (command: HudCommand) => void;
	};

	scene.create({ mapId: 'item-shop' });
	Object.assign(phaserState.playerMarker, { x: 256, y: 144 });
	scene.update(0, 16);
	emitHudStateSpy.mockClear();

	sceneState.handleHudCommand({ type: 'open-shop', shopId: 'miras-item-shop' });

	expect(emitHudStateSpy).toHaveBeenLastCalledWith(
		expect.objectContaining({
			status: 'Shop opened',
			shop: expect.objectContaining({
				shopId: 'miras-item-shop',
				buy: expect.arrayContaining([
					expect.objectContaining({ stockId: 'field-potion', price: 10 })
				]),
				sell: expect.arrayContaining([
					expect.objectContaining({ itemId: 'field-potion', price: 5 })
				])
			})
		})
	);
});

it('buys shop items, updates wallet, and persists finite stock', async () => {
	const events = await import('$lib/game/ui-bridge/events');
	const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
	const { createNewSaveState } = await import('$lib/game/save/save-state');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		handleHudCommand: (command: HudCommand) => void;
		buildSaveState: () => ReturnType<typeof createNewSaveState>;
	};

	const save = createNewSaveState();

	scene.create({
		saveState: {
			...save,
			mapId: 'guild-hall',
			player: { ...save.player, x: 352, y: 144 },
			wallet: { coins: 40 }
		}
	});
	Object.assign(phaserState.playerMarker, { x: 352, y: 144 });
	scene.update(0, 16);
	emitHudStateSpy.mockClear();

	sceneState.handleHudCommand({ type: 'open-shop', shopId: 'guild-quartermaster' });
	sceneState.handleHudCommand({
		type: 'buy-shop-item',
		shopId: 'guild-quartermaster',
		stockId: 'iron-cap'
	});

	const saveState = sceneState.buildSaveState();
	expect(saveState.wallet.coins).toBe(5);
	expect(saveState.inventory.equipment).toContain('iron-cap');
	expect(saveState.shops.stock['guild-quartermaster']?.['iron-cap']).toBe(0);
	expect(emitHudStateSpy).toHaveBeenLastCalledWith(
		expect.objectContaining({ status: 'Bought Iron Cap' })
	);
});
```

Add sell and coin reward tests:

```ts
it('sells unequipped items through the active shop', async () => {
	const events = await import('$lib/game/ui-bridge/events');
	const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
	const { createNewSaveState } = await import('$lib/game/save/save-state');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		handleHudCommand: (command: HudCommand) => void;
		buildSaveState: () => ReturnType<typeof createNewSaveState>;
	};
	const save = createNewSaveState();

	scene.create({
		saveState: {
			...save,
			mapId: 'item-shop',
			player: { ...save.player, x: 256, y: 144 },
			inventory: {
				stacks: [{ itemId: 'field-potion', quantity: 2 }],
				equipment: ['training-sword', 'iron-cap']
			},
			equipment: { ...save.equipment, weapon: 'training-sword' },
			wallet: { coins: 0 }
		}
	});
	Object.assign(phaserState.playerMarker, { x: 256, y: 144 });
	scene.update(0, 16);
	emitHudStateSpy.mockClear();

	sceneState.handleHudCommand({ type: 'open-shop', shopId: 'miras-item-shop' });
	sceneState.handleHudCommand({ type: 'sell-inventory-item', itemId: 'iron-cap' });

	const saveState = sceneState.buildSaveState();
	expect(saveState.wallet.coins).toBe(17);
	expect(saveState.inventory.equipment).toEqual(['training-sword']);
	expect(emitHudStateSpy).toHaveBeenLastCalledWith(
		expect.objectContaining({ status: 'Sold Iron Cap' })
	);
});

it('awards coins when an enemy is defeated once', async () => {
	const { createNewSaveState } = await import('$lib/game/save/save-state');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		enemies: Array<{ hp: number }>;
		buildSaveState: () => ReturnType<typeof createNewSaveState>;
	};
	const save = createNewSaveState();

	scene.create({ saveState: { ...save, wallet: { coins: 0 } } });
	Object.assign(phaserState.playerMarker, { x: 1_568, y: 1_280 });
	sceneState.enemies[0]!.hp = 3;

	scene.update(500, 16);
	scene.update(1000, 16);

	expect(sceneState.buildSaveState().wallet.coins).toBe(4);
});
```

- [ ] **Step 2: Run scene tests to verify failure**

Run: `bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: FAIL because HUD types, shop fields, wallet state, and commands are not wired.

- [ ] **Step 3: Expand HUD event types and store helpers**

Modify `src/lib/game/ui-bridge/events.ts`:

```ts
import type { HudShopBuyEntry, HudShopSellEntry } from '$lib/game/core/shop';

export type HudNearbyShop = {
	shopId: string;
	name: string;
	merchantName: string;
};

export type HudOpenShop = HudNearbyShop & {
	buy: HudShopBuyEntry[];
	sell: HudShopSellEntry[];
};
```

Add fields to `HudState`:

```ts
wallet: {
	coins: number;
}
nearbyShop: HudNearbyShop | null;
shop: HudOpenShop | null;
```

Add commands to `HudCommand`:

```ts
| { type: 'open-shop'; shopId: string }
| { type: 'close-shop' }
| { type: 'buy-shop-item'; shopId: string; stockId: string }
| { type: 'sell-inventory-item'; itemId: string };
```

Modify `src/lib/game/ui-bridge/store.ts` initial state:

```ts
wallet: { coins: 30 },
nearbyShop: null,
shop: null
```

Add helpers:

```ts
export function requestOpenShop(shopId: string) {
	emitHudCommand({ type: 'open-shop', shopId });
}

export function requestCloseShop() {
	emitHudCommand({ type: 'close-shop' });
}

export function requestBuyShopItem(shopId: string, stockId: string) {
	emitHudCommand({ type: 'buy-shop-item', shopId, stockId });
}

export function requestSellInventoryItem(itemId: string) {
	emitHudCommand({ type: 'sell-inventory-item', itemId });
}
```

- [ ] **Step 4: Wire WorldScene shop state and commands**

Modify `src/lib/game/phaser/scenes/WorldScene.ts` imports:

```ts
import { getShop } from '$lib/game/content/shops';
import {
	buyShopItem,
	buildShopBuyEntries,
	buildShopSellEntries,
	createInitialShopStockState,
	sellInventoryItem,
	type ShopBuyFailureReason,
	type ShopSellFailureReason,
	type ShopStockState,
	type WalletState
} from '$lib/game/core/shop';
```

Add fields:

```ts
private wallet: WalletState = { coins: createNewSaveState().wallet.coins };
private shopStockState: ShopStockState = createInitialShopStockState();
private nearbyShopId: string | null = null;
private openShopId: string | null = null;
```

Initialize them in `create()`:

```ts
this.wallet = { ...(activeSave?.wallet ?? createNewSaveState().wallet) };
this.shopStockState = cloneShopStockState(activeSave?.shops.stock ?? createInitialShopStockState());
this.nearbyShopId = null;
this.openShopId = null;
```

Add clone helper near existing clone helpers:

```ts
function cloneShopStockState(stockState: ShopStockState): ShopStockState {
	return Object.fromEntries(
		Object.entries(stockState).map(([shopId, stockById]) => [shopId, { ...stockById }])
	);
}
```

Update `buildSaveState()`:

```ts
wallet: { ...this.wallet },
shops: {
	stock: cloneShopStockState(this.shopStockState)
}
```

Add command handlers:

```ts
private openNearbyShop(shopId: string) {
	if (this.nearbyShopId !== shopId || !getShop(shopId)) {
		this.publishHudState('No shop nearby');
		return;
	}

	this.openShopId = shopId;
	this.publishHudState('Shop opened');
}

private closeOpenShop() {
	this.openShopId = null;
	this.publishHudState('Shop closed');
}

private buyOpenShopItem(shopId: string, stockId: string) {
	if (this.openShopId !== shopId || this.nearbyShopId !== shopId) {
		this.publishHudState('No shop nearby');
		return;
	}

	const result = buyShopItem({
		shopId,
		stockId,
		wallet: this.wallet,
		inventory: this.inventory,
		stockState: this.shopStockState
	});

	if (!result.purchased) {
		this.publishHudState(this.formatBuyFailure(result.reason));
		return;
	}

	const itemName = getShop(shopId)?.stock.find((entry) => entry.id === stockId);
	this.wallet = result.wallet;
	this.inventory = result.inventory;
	this.shopStockState = result.stockState;
	this.publishHudState(`Bought ${getItem(itemName?.itemId ?? '')?.name ?? 'item'}`);
}

private sellOpenShopItem(itemId: string) {
	if (!this.openShopId || this.nearbyShopId !== this.openShopId) {
		this.publishHudState('No shop nearby');
		return;
	}

	const result = sellInventoryItem({
		itemId,
		wallet: this.wallet,
		inventory: this.inventory,
		equipment: this.equipment
	});

	if (!result.sold) {
		this.publishHudState(this.formatSellFailure(result.reason));
		return;
	}

	this.wallet = result.wallet;
	this.inventory = result.inventory;
	this.publishHudState(`Sold ${getItem(itemId)?.name ?? 'item'}`);
}
```

Add status formatters:

```ts
private formatBuyFailure(reason: ShopBuyFailureReason): string {
	if (reason === 'not-enough-coins') return 'Not enough coins';
	if (reason === 'out-of-stock') return 'Item out of stock';
	if (reason === 'shop-not-found' || reason === 'stock-not-found') return 'Item cannot be bought';
	return 'Item cannot be bought';
}

private formatSellFailure(reason: ShopSellFailureReason): string {
	if (reason === 'equipped-item') return 'Equipped item cannot be sold';
	if (reason === 'item-not-owned') return 'Item not owned';
	return 'Item cannot be sold';
}
```

Include the new command cases in `handleHudCommand()`:

```ts
case 'open-shop':
	this.openNearbyShop(command.shopId);
	return;
case 'close-shop':
	this.closeOpenShop();
	return;
case 'buy-shop-item':
	this.buyOpenShopItem(command.shopId, command.stockId);
	return;
case 'sell-inventory-item':
	this.sellOpenShopItem(command.itemId);
	return;
```

Update `finishEncounter()` after XP/drop logic:

```ts
this.wallet = { coins: this.wallet.coins + enemy.definition.coinReward };
```

Make sure this happens only in the non-early-return path after `enemy.defeated` flips from false to true.

- [ ] **Step 5: Publish nearby shop and shop views**

Update `updateNpcDialogue()` so `nearbyShopId` tracks proximity:

```ts
if (!nearbyNpc) {
	const hadShop = this.nearbyShopId !== null;
	this.currentNearbyNpcId = null;
	this.nearbyShopId = null;
	this.openShopId = null;

	if (hadShop) {
		this.publishHudState('Shop out of reach');
	}

	return;
}

this.nearbyShopId = nearbyNpc.shopId ?? null;
```

Keep the existing "do not republish the same NPC every frame" behavior. When the nearby NPC changes, publish the same dialogue string as today.

Update `publishHudState()`:

```ts
wallet: { ...this.wallet },
nearbyShop: this.buildNearbyShop(),
shop: this.buildOpenShop(),
```

Add helpers:

```ts
private buildNearbyShop(): HudState['nearbyShop'] {
	if (!this.nearbyShopId) return null;

	const shop = getShop(this.nearbyShopId);
	if (!shop) return null;

	return {
		shopId: shop.id,
		name: shop.name,
		merchantName: shop.merchantName
	};
}

private buildOpenShop(): HudState['shop'] {
	if (!this.openShopId) return null;

	const shop = getShop(this.openShopId);
	if (!shop) return null;

	return {
		shopId: shop.id,
		name: shop.name,
		merchantName: shop.merchantName,
		buy: buildShopBuyEntries(shop.id, this.shopStockState),
		sell: buildShopSellEntries({ inventory: this.inventory, equipment: this.equipment })
	};
}
```

- [ ] **Step 6: Run scene tests to verify pass**

Run: `bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: PASS.

- [ ] **Step 7: Run focused bridge and save tests**

Run: `bun run test:unit -- src/lib/game/ui-bridge/events.ts src/lib/game/save/save-state.test.ts src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: PASS. If Vitest reports no tests for `events.ts`, replace this command with:

`bun run test:unit -- src/lib/game/save/save-state.test.ts src/lib/game/phaser/scenes/scenes.test.ts --run`

- [ ] **Step 8: Commit runtime wiring**

```bash
git add src/lib/game/ui-bridge/events.ts src/lib/game/ui-bridge/store.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Wire shop runtime state"
```

## Task 5: Svelte Shop Overlay

**Files:**

- Modify: `src/lib/game/GameShell.svelte`
- Modify: `src/routes/game/page.svelte.e2e.ts`

- [ ] **Step 1: Write failing e2e test for shop overlay**

Append to `src/routes/game/page.svelte.e2e.ts`:

```ts
test('shop overlay opens near a merchant and supports buying and selling', async ({ page }) => {
	const save = {
		version: 3,
		mapId: 'item-shop',
		player: {
			level: 1,
			xp: 0,
			hp: 20,
			attack: 3,
			x: 256,
			y: 144,
			facing: 'up'
		},
		flags: { clearedEncounters: [], collectedPickups: [], resolvedEncounterDrops: {} },
		inventory: {
			stacks: [{ itemId: 'field-potion', quantity: 1 }],
			equipment: ['training-sword']
		},
		equipment: {
			weapon: 'training-sword',
			head: null,
			body: null,
			hands: null,
			accessory: null
		},
		wallet: { coins: 30 },
		shops: {
			stock: {
				'guild-quartermaster': {
					'iron-cap': 1,
					'grip-wraps': 1,
					'traveler-vest': 1
				}
			}
		}
	};

	await page.addInitScript((encoded) => {
		window.localStorage.setItem('gliese.save.v3', encoded);
	}, JSON.stringify(save));
	await page.goto('/game');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Resume Save' }).click();
	await expect(page.getByText(/Mira:/)).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Shop' }).click();

	await expect(page.getByRole('heading', { name: "Mira's Item Shop" })).toBeVisible();
	await expect(page.getByText('Coins: 30')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Field Potion' })).toBeVisible();

	await page.getByRole('button', { name: 'Buy Field Potion' }).click();
	await expect(page.getByText('Coins: 20')).toBeVisible();

	await page.getByRole('tab', { name: 'Sell' }).click();
	await page.getByRole('button', { name: 'Sell Field Potion' }).click();
	await expect(page.getByText('Coins: 25')).toBeVisible();
});
```

- [ ] **Step 2: Run e2e test to verify failure**

Run: `bun run test:e2e -- --grep "shop overlay opens"`

Expected: FAIL because there is no Shop menu action or overlay.

- [ ] **Step 3: Add shop state and command imports**

Modify the script block in `src/lib/game/GameShell.svelte`:

```ts
import {
	hudState,
	requestBuyShopItem,
	requestCloseShop,
	requestEquipItem,
	requestHeal,
	requestOpenShop,
	requestPauseGame,
	requestResume,
	requestResumeGame,
	requestSave,
	requestSellInventoryItem,
	requestUnequipSlot,
	requestUseItem
} from '$lib/game/ui-bridge/store';
```

Add types and state:

```ts
type ShopTab = 'buy' | 'sell';
type OverlayPauseOwner = 'settings' | 'inventory' | 'shop';

let shopDialog = $state<HTMLDivElement>();
let shopCloseButton = $state<HTMLButtonElement>();
let shopOpen = $state(false);
let activeShopTab = $state<ShopTab>('buy');
let shopFocusRestoreTarget: HTMLElement | null = null;
const shopTabs: ShopTab[] = ['buy', 'sell'];
```

If `OverlayPauseOwner` already exists, replace its union with `'settings' | 'inventory' | 'shop'`.

- [ ] **Step 4: Add shop open/close helpers**

Add functions beside the existing inventory helpers:

```ts
function rememberShopFocus() {
	shopFocusRestoreTarget =
		document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

function openShop() {
	if (shopOpen || !$hudState.nearbyShop) return;
	rememberShopFocus();
	settingsOpen = false;
	inventoryOpen = false;
	shopOpen = true;
	activeShopTab = 'buy';
	pauseForOverlay('shop');
	requestOpenShop($hudState.nearbyShop.shopId);
	void focusShopDialog();
}

function closeShop() {
	if (!shopOpen) return;
	shopOpen = false;
	requestCloseShop();
	resumeForOverlay('shop');
	void restoreShopFocus();
}

async function focusShopDialog() {
	await tick();
	(shopCloseButton ?? shopDialog)?.focus();
}

async function restoreShopFocus() {
	const restoreTarget = shopFocusRestoreTarget;
	shopFocusRestoreTarget = null;
	await tick();

	if (
		restoreTarget &&
		document.contains(restoreTarget) &&
		!restoreTarget.matches('[disabled], [aria-disabled="true"]') &&
		!restoreTarget.closest('#game-settings-panel')
	) {
		restoreTarget.focus();
		return;
	}

	menuButton?.focus();
}
```

Update `releaseOverlayPause()`:

```ts
const wasShopOpen = shopOpen;
shopOpen = false;

if (wasShopOpen) requestCloseShop();
```

- [ ] **Step 5: Add shop focus trap and tab keyboard helpers**

Mirror the existing inventory focus trap with shop-specific names:

```ts
function getShopFocusableElements() {
	if (!shopDialog) return [];

	return Array.from(
		shopDialog.querySelectorAll<HTMLElement>(
			'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
		)
	).filter((element) => element.offsetParent !== null);
}

function handleShopDialogKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		event.preventDefault();
		closeShop();
		return;
	}

	if (event.key !== 'Tab') return;

	const focusableElements = getShopFocusableElements();
	if (focusableElements.length === 0) {
		event.preventDefault();
		shopDialog?.focus();
		return;
	}

	const firstElement = focusableElements[0];
	const lastElement = focusableElements.at(-1);

	if (event.shiftKey && document.activeElement === firstElement) {
		event.preventDefault();
		lastElement?.focus();
	} else if (!event.shiftKey && document.activeElement === lastElement) {
		event.preventDefault();
		firstElement.focus();
	}
}

async function focusShopTab(tab: ShopTab) {
	activeShopTab = tab;
	await tick();
	document.getElementById(`shop-${tab}-tab`)?.focus();
}

function handleShopTabKeydown(event: KeyboardEvent, tab: ShopTab) {
	const currentIndex = shopTabs.indexOf(tab);
	const lastIndex = shopTabs.length - 1;

	if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
		event.preventDefault();
		void focusShopTab(shopTabs[currentIndex === lastIndex ? 0 : currentIndex + 1]);
	} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
		event.preventDefault();
		void focusShopTab(shopTabs[currentIndex === 0 ? lastIndex : currentIndex - 1]);
	} else if (event.key === 'Home') {
		event.preventDefault();
		void focusShopTab(shopTabs[0]);
	} else if (event.key === 'End') {
		event.preventDefault();
		void focusShopTab(shopTabs[lastIndex]);
	}
}
```

- [ ] **Step 6: Add the Settings menu Shop action**

In the settings menu button grid, add this button above Inventory:

```svelte
<button
	type="button"
	class="hud-action rounded-[1.1rem] border border-amber-200/20 bg-[linear-gradient(135deg,rgba(115,75,25,0.96),rgba(63,41,18,0.92))] px-4 py-3 text-sm font-black tracking-[0.24em] text-amber-50 uppercase transition hover:-translate-y-0.5 hover:border-amber-200/45 hover:shadow-[0_15px_30px_rgba(255,190,90,0.22)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
	onclick={openShop}
	disabled={!$hudState.ready || !$hudState.nearbyShop}
>
	Shop
</button>
```

- [ ] **Step 7: Add dedicated Shop overlay markup**

Add a new `{#if shopOpen}` block after the inventory overlay. Keep the classes consistent with the Inventory overlay, but use a narrower `w-[min(64rem,calc(100vw-1.5rem))]`.

The required structure:

```svelte
{#if shopOpen}
	<div
		class="absolute inset-0 z-50 flex items-center justify-center bg-black/52 p-3 backdrop-blur-[3px] sm:p-6"
		role="presentation"
	>
		<div class="absolute inset-0 cursor-default" role="presentation" onclick={closeShop}></div>
		<div
			bind:this={shopDialog}
			class="relative z-10 grid max-h-[calc(100vh-1.5rem)] w-[min(64rem,calc(100vw-1.5rem))] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[1.8rem] border border-white/12 bg-[linear-gradient(145deg,rgba(8,13,34,0.98),rgba(28,22,44,0.96)_54%,rgba(40,28,20,0.94))] text-slate-50 shadow-[0_34px_100px_rgba(0,0,0,0.58)] backdrop-blur-md sm:max-h-[calc(100vh-3rem)] sm:rounded-[2rem]"
			aria-labelledby="shop-heading"
			aria-modal="true"
			role="dialog"
			tabindex="-1"
			onkeydown={handleShopDialogKeydown}
		>
			<div class="border-b border-white/10 px-4 py-4 sm:px-6">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-[0.62rem] font-black tracking-[0.34em] text-amber-100/68 uppercase">
							{$hudState.shop?.merchantName ?? $hudState.nearbyShop?.merchantName ?? 'Merchant'}
						</p>
						<h2
							id="shop-heading"
							class="mt-1 text-2xl font-black tracking-[0.12em] text-white uppercase sm:text-3xl"
						>
							{$hudState.shop?.name ?? $hudState.nearbyShop?.name ?? 'Shop'}
						</h2>
						<p class="mt-2 text-sm font-bold tracking-[0.12em] text-amber-100/80 uppercase">
							Coins: {$hudState.wallet.coins}
						</p>
					</div>
					<button
						bind:this={shopCloseButton}
						type="button"
						class="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[0.65rem] font-black tracking-[0.24em] text-slate-100 uppercase transition hover:border-white/30"
						onclick={closeShop}
					>
						Close
					</button>
				</div>

				<div class="mt-4 grid grid-cols-2 gap-2" role="tablist" aria-label="Shop sections">
					<button
						id="shop-buy-tab"
						type="button"
						role="tab"
						aria-selected={activeShopTab === 'buy'}
						aria-controls="shop-tab-panel"
						tabindex={activeShopTab === 'buy' ? 0 : -1}
						class={`rounded-full border px-3 py-2 text-[0.68rem] font-black tracking-[0.2em] uppercase transition ${activeShopTab === 'buy' ? 'border-amber-200/45 bg-amber-200/16 text-amber-50' : 'border-white/10 bg-white/6 text-slate-200/72 hover:border-white/24 hover:text-white'}`}
						onclick={() => (activeShopTab = 'buy')}
						onkeydown={(event) => handleShopTabKeydown(event, 'buy')}
					>
						Buy
					</button>
					<button
						id="shop-sell-tab"
						type="button"
						role="tab"
						aria-selected={activeShopTab === 'sell'}
						aria-controls="shop-tab-panel"
						tabindex={activeShopTab === 'sell' ? 0 : -1}
						class={`rounded-full border px-3 py-2 text-[0.68rem] font-black tracking-[0.2em] uppercase transition ${activeShopTab === 'sell' ? 'border-emerald-200/45 bg-emerald-200/16 text-emerald-50' : 'border-white/10 bg-white/6 text-slate-200/72 hover:border-white/24 hover:text-white'}`}
						onclick={() => (activeShopTab = 'sell')}
						onkeydown={(event) => handleShopTabKeydown(event, 'sell')}
					>
						Sell
					</button>
				</div>
			</div>

			<div
				id="shop-tab-panel"
				class="min-h-0 overflow-y-auto p-4 sm:p-6"
				role="tabpanel"
				aria-labelledby={`shop-${activeShopTab}-tab`}
			>
				{#if activeShopTab === 'buy'}
					{#if $hudState.shop?.buy.length}
						<div class="grid gap-3">
							{#each $hudState.shop.buy as item (item.stockId)}
								{@const finiteRemaining =
									item.availability.mode === 'finite' ? item.availability.remaining : null}
								<article
									class="grid gap-3 rounded-[1.1rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
								>
									<div>
										<h3 class="text-lg font-black tracking-[0.08em] text-white uppercase">
											{item.name}
										</h3>
										<p class="mt-2 text-sm leading-5 text-slate-200/76">{item.description}</p>
										<p
											class="mt-2 text-[0.62rem] font-black tracking-[0.2em] text-amber-100/80 uppercase"
										>
											{item.price} coins · {item.availability.mode === 'unlimited'
												? 'Unlimited'
												: `${finiteRemaining} left`}
										</p>
									</div>
									<button
										type="button"
										class="rounded-full border border-amber-200/24 bg-amber-200/12 px-4 py-2 text-[0.68rem] font-black tracking-[0.24em] text-amber-50 uppercase transition hover:-translate-y-0.5 hover:border-amber-200/50 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
										onclick={() => requestBuyShopItem($hudState.shop?.shopId ?? '', item.stockId)}
										disabled={!$hudState.ready ||
											!$hudState.shop ||
											$hudState.wallet.coins < item.price ||
											finiteRemaining === 0}
										aria-label={`Buy ${item.name}`}
									>
										Buy
									</button>
								</article>
							{/each}
						</div>
					{:else}
						<div
							class="flex min-h-48 items-center justify-center rounded-[1.1rem] border border-dashed border-white/14 bg-white/5 px-6 py-10 text-center text-sm font-bold tracking-[0.2em] text-slate-300/62 uppercase"
						>
							No stock available.
						</div>
					{/if}
				{:else if $hudState.shop?.sell.length}
					<div class="grid gap-3">
						{#each $hudState.shop.sell as item (item.itemId)}
							<article
								class="grid gap-3 rounded-[1.1rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
							>
								<div>
									<h3 class="text-lg font-black tracking-[0.08em] text-white uppercase">
										{item.name}
									</h3>
									<p class="mt-2 text-sm leading-5 text-slate-200/76">{item.description}</p>
									<p
										class="mt-2 text-[0.62rem] font-black tracking-[0.2em] text-emerald-100/80 uppercase"
									>
										Sell for {item.price} coins{item.quantity > 1 ? ` · x${item.quantity}` : ''}
									</p>
								</div>
								<button
									type="button"
									class="rounded-full border border-emerald-200/24 bg-emerald-200/12 px-4 py-2 text-[0.68rem] font-black tracking-[0.24em] text-emerald-50 uppercase transition hover:-translate-y-0.5 hover:border-emerald-200/50 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
									onclick={() => requestSellInventoryItem(item.itemId)}
									disabled={!$hudState.ready}
									aria-label={`Sell ${item.name}`}
								>
									Sell
								</button>
							</article>
						{/each}
					</div>
				{:else}
					<div
						class="flex min-h-48 items-center justify-center rounded-[1.1rem] border border-dashed border-white/14 bg-white/5 px-6 py-10 text-center text-sm font-bold tracking-[0.2em] text-slate-300/62 uppercase"
					>
						No sellable items.
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
```

- [ ] **Step 8: Run Svelte autofixer**

Run the Svelte MCP `svelte-autofixer` on the modified `src/lib/game/GameShell.svelte`.

Expected: no remaining Svelte issues. If the Svelte MCP tools are not exposed in the session, record that in the implementation notes and continue with `bun run check` in Step 10.

- [ ] **Step 9: Run e2e test to verify pass**

Run: `bun run test:e2e -- --grep "shop overlay opens"`

Expected: PASS.

- [ ] **Step 10: Run Svelte/type check**

Run: `bun run check`

Expected: PASS.

- [ ] **Step 11: Commit shop overlay**

```bash
git add src/lib/game/GameShell.svelte src/routes/game/page.svelte.e2e.ts
git commit -m "Add shop overlay"
```

## Task 6: Final Verification And Stabilization

**Files:**

- Review all files touched in Tasks 1-5.

- [ ] **Step 1: Run focused unit tests**

Run:

```bash
bun run test:unit -- src/lib/game/content/items.test.ts src/lib/game/content/shops.test.ts src/lib/game/content/maps.test.ts src/lib/game/content/enemies.test.ts src/lib/game/core/inventory.test.ts src/lib/game/core/shop.test.ts src/lib/game/save/save-state.test.ts src/lib/game/save/storage.test.ts src/lib/game/phaser/scenes/scenes.test.ts --run
```

Expected: PASS.

- [ ] **Step 2: Run all unit tests**

Run: `bun run test:unit -- --run`

Expected: PASS.

- [ ] **Step 3: Run all e2e tests**

Run: `bun run test:e2e`

Expected: PASS.

- [ ] **Step 4: Run type check**

Run: `bun run check`

Expected: PASS.

- [ ] **Step 5: Run production build**

Run: `bun run build`

Expected: PASS.

- [ ] **Step 6: Inspect git diff**

Run: `git diff --stat HEAD~5..HEAD`

Expected: only shop-system implementation files and tests are listed.

- [ ] **Step 7: Commit any verification fixes**

If Steps 1-5 required code fixes, commit them:

```bash
git add src/lib/game docs/superpowers/plans/2026-05-05-shop-system.md src/routes/game/page.svelte.e2e.ts
git commit -m "Stabilize shop system"
```

If no fixes were required, do not create an empty commit.
