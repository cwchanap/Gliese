import { describe, expect, it } from 'vitest';

import { createEmptyEquipment } from './equipment';
import { clampHpToMax, deriveEffectiveStats, previewEquipmentSwap } from './stats';

describe('effective stats', () => {
	it('adds equipped modifiers to base stats', () => {
		expect(
			deriveEffectiveStats(
				{ hp: 20, attack: 3, defense: 0 },
				{
					...createEmptyEquipment(),
					weapon: 'ruin-blade',
					body: 'stone-mail',
					accessory: 'meadow-charm'
				}
			)
		).toEqual({ maxHp: 28, attack: 5, defense: 1 });
	});

	it('clamps hp when max hp drops', () => {
		expect(clampHpToMax(30, { maxHp: 24, attack: 4, defense: 1 })).toBe(24);
		expect(clampHpToMax(12, { maxHp: 24, attack: 4, defense: 1 })).toBe(12);
	});
});

describe('previewEquipmentSwap', () => {
	it('previews the Traveler Vest into an empty body slot', () => {
		expect(
			previewEquipmentSwap({
				base: { hp: 20, attack: 3, defense: 0 },
				equipment: createEmptyEquipment(),
				itemId: 'traveler-vest'
			})
		).toEqual({
			slot: 'body',
			replacedItemId: null,
			before: { maxHp: 20, attack: 3, defense: 0 },
			after: { maxHp: 24, attack: 3, defense: 0 }
		});
	});

	it('previews replacing an occupied slot', () => {
		expect(
			previewEquipmentSwap({
				base: { hp: 20, attack: 3, defense: 0 },
				equipment: { ...createEmptyEquipment(), weapon: 'training-sword' },
				itemId: 'ruin-blade'
			})
		).toEqual({
			slot: 'weapon',
			replacedItemId: 'training-sword',
			before: { maxHp: 20, attack: 4, defense: 0 },
			after: { maxHp: 20, attack: 5, defense: 0 }
		});
	});

	it('returns null for non-equipment items', () => {
		expect(
			previewEquipmentSwap({
				base: { hp: 20, attack: 3, defense: 0 },
				equipment: createEmptyEquipment(),
				itemId: 'field-potion'
			})
		).toBeNull();
		expect(
			previewEquipmentSwap({
				base: { hp: 20, attack: 3, defense: 0 },
				equipment: createEmptyEquipment(),
				itemId: 'missing-item'
			})
		).toBeNull();
	});
});
