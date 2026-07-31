import { describe, expect, it } from 'vitest';

import { createEmptyEquipment } from './equipment';
import { clampHpToMax, deriveEffectiveStats } from './stats';

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
