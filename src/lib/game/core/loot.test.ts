import { describe, expect, it } from 'vitest';

import { resolveLootDrops, type LootTable } from './loot';

describe('loot resolver', () => {
	it('always awards guaranteed drops', () => {
		const table: LootTable = { guaranteed: [{ itemId: 'warden-sigil', quantity: 1 }], chance: [] };

		expect(resolveLootDrops(table, () => 0.99)).toEqual([{ itemId: 'warden-sigil', quantity: 1 }]);
	});

	it('awards chance drops when rng is below drop chance', () => {
		const table: LootTable = {
			guaranteed: [],
			chance: [{ itemId: 'field-potion', quantity: 1, chance: 0.5 }]
		};

		expect(resolveLootDrops(table, () => 0.49)).toEqual([{ itemId: 'field-potion', quantity: 1 }]);
		expect(resolveLootDrops(table, () => 0.5)).toEqual([]);
	});
});
