export type ItemDrop = {
	itemId: string;
	quantity: number;
};

export type ChanceDrop = ItemDrop & {
	chance: number;
};

export type LootTable = {
	guaranteed: ItemDrop[];
	chance: ChanceDrop[];
};

export function resolveLootDrops(
	loot: LootTable | undefined,
	random: () => number = Math.random
): ItemDrop[] {
	if (!loot) {
		return [];
	}

	return [
		...loot.guaranteed,
		...loot.chance
			.filter((drop) => random() < drop.chance)
			.map(({ chance: _chance, ...drop }) => drop)
	];
}
