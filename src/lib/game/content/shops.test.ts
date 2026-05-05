import { describe, expect, it } from 'vitest';

import { getItem } from '$lib/game/content/items';
import { getShop, shopList, shops } from '$lib/game/content/shops';

describe('shop content', () => {
	it('defines the starter item and equipment shops', () => {
		expect(getShop('miras-item-shop')).toBe(shops['miras-item-shop']);
		expect(getShop('guild-quartermaster')).toBe(shops['guild-quartermaster']);
		expect(shopList).toHaveLength(2);
		expect(shops['miras-item-shop']).toMatchObject({
			name: "Mira's Item Shop",
			merchantName: 'Mira',
			description: 'Reliable field supplies for the road east.'
		});
		expect(shops['guild-quartermaster']).toMatchObject({
			name: 'Guild Quartermaster',
			merchantName: 'Quartermaster Vale',
			description: 'Guild-approved gear for new ruins assignments.'
		});
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
