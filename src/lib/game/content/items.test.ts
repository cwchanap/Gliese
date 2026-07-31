import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
	equipmentSlots,
	getItem,
	getSellValue,
	isSellableItem,
	items,
	itemList,
	type EquipmentDefinition
} from '$lib/game/content/items';
import { t } from '$lib/game/i18n/translate';

function expectEnglishMessage(key: Parameters<typeof t>[1]): string {
	const value = t('en', key);
	expect(value).not.toMatch(/^\[/);
	expect(value.trim()).not.toHaveLength(0);
	return value;
}

describe('item content', () => {
	it('defines the first-pass roster counts', () => {
		expect(itemList.filter((item) => item.type === 'consumable')).toHaveLength(5);
		expect(itemList.filter((item) => item.type === 'equipment')).toHaveLength(8);
		expect(itemList.filter((item) => item.type === 'key')).toHaveLength(3);
	});

	it('uses stable unique ids', () => {
		expect(new Set(itemList.map((item) => item.id)).size).toBe(itemList.length);
		expect(getItem('field-potion')).toBe(items['field-potion']);
	});

	it('keeps stackability tied to item type', () => {
		expect(items['field-potion']).toMatchObject({ type: 'consumable', stackable: true });
		expect(items['meadow-charm']).toMatchObject({ type: 'equipment', stackable: false });
		expect(items['warden-sigil']).toMatchObject({ type: 'key', stackable: true });
	});

	it('resolves every item text key in the English source dictionary', () => {
		for (const item of itemList) {
			expectEnglishMessage(item.nameKey);
			expectEnglishMessage(item.descriptionKey);
		}
	});

	it('assigns equipment to valid slots', () => {
		const slots = new Set(equipmentSlots);
		for (const item of itemList.filter(
			(entry): entry is EquipmentDefinition => entry.type === 'equipment'
		)) {
			expect(slots.has(item.slot)).toBe(true);
		}
	});

	it('defines base prices for every sellable item', () => {
		const expectedBasePrices = {
			'field-potion': 10,
			'greater-field-potion': 18,
			'ember-tonic': 8,
			'ruin-draught': 14,
			'sunleaf-salve': 12,
			'training-sword': 40,
			'ruin-blade': 80,
			'iron-cap': 35,
			'warden-crown': 100,
			'traveler-vest': 45,
			'stone-mail': 90,
			'grip-wraps': 35,
			'meadow-charm': 30
		};

		for (const item of itemList) {
			if (item.type === 'key') {
				expect('basePrice' in item).toBe(false);
				continue;
			}

			expect(item.basePrice).toBeGreaterThan(0);
			expect(item.basePrice).toBe(expectedBasePrices[item.id as keyof typeof expectedBasePrices]);
		}

		expect(Object.keys(expectedBasePrices)).toHaveLength(
			itemList.filter((item) => item.type !== 'key').length
		);
	});

	it('returns sell values only for consumables and equipment', () => {
		expect(getSellValue('field-potion')).toBe(5);
		expect(getSellValue('traveler-vest')).toBe(22);
		expect(getSellValue('warden-sigil')).toBeUndefined();
		expect(getSellValue('not-real')).toBeUndefined();
	});

	it('identifies only consumables and equipment as sellable', () => {
		expect(isSellableItem('field-potion')).toBe(true);
		expect(isSellableItem('training-sword')).toBe(true);
		expect(isSellableItem('warden-sigil')).toBe(false);
		expect(isSellableItem('not-real')).toBe(false);
	});

	it('defines a 96x96 transparent PNG icon for every item', () => {
		for (const item of itemList) {
			expect(item.iconPath).toBe(`/game/assets/items/${item.id}.png`);

			const iconPath = resolve('public', item.iconPath.replace('/game/', 'game/'));
			expect(existsSync(iconPath), `${item.id} icon should exist`).toBe(true);

			const bytes = readFileSync(iconPath);
			expect(Array.from(bytes.subarray(0, 8))).toEqual([
				0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
			]);
			expect(bytes.readUInt32BE(16), `${item.id} icon width`).toBe(96);
			expect(bytes.readUInt32BE(20), `${item.id} icon height`).toBe(96);
			expect(bytes[25], `${item.id} icon color type`).toBe(6);
		}
	});
});
