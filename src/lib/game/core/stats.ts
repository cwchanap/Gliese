import { getItem, type EquipmentSlot } from '$lib/game/content/items';
import { startingPlayer } from '$lib/game/content/player';
import type { EquipmentState } from '$lib/game/core/equipment';
import { getBaseMaxHp } from '$lib/game/core/progression';

export type BaseStats = {
	hp: number;
	attack: number;
	defense: number;
};

export type EffectiveStats = {
	maxHp: number;
	attack: number;
	defense: number;
};

export function deriveEffectiveStats(base: BaseStats, equipment: EquipmentState): EffectiveStats {
	return Object.values(equipment).reduce<EffectiveStats>(
		(stats, itemId) => {
			const item = itemId ? getItem(itemId) : undefined;

			if (!item || item.type !== 'equipment') {
				return stats;
			}

			return {
				maxHp: stats.maxHp + (item.modifiers.maxHp ?? 0),
				attack: stats.attack + (item.modifiers.attack ?? 0),
				defense: stats.defense + (item.modifiers.defense ?? 0)
			};
		},
		{ maxHp: base.hp, attack: base.attack, defense: base.defense }
	);
}

export function clampHpToMax(hp: number, stats: EffectiveStats): number {
	return Math.min(hp, stats.maxHp);
}

/**
 * The hero's un-equipped stats at a progression point: max HP scales with
 * level, attack comes from progression, and defense starts at zero. Shared
 * so the HUD, shop previews, and save-slot summaries can't drift apart.
 */
export function getHeroBaseStats(progress: { level: number; attack: number }): BaseStats {
	return {
		hp: getBaseMaxHp(startingPlayer.baseHp, progress.level),
		attack: progress.attack,
		defense: 0
	};
}

export type EquipmentSwapPreview = {
	slot: EquipmentSlot;
	replacedItemId: string | null;
	before: EffectiveStats;
	after: EffectiveStats;
};

/** Canonical before/after stat comparison for equipping `itemId` into the
	current equipment loadout. Derived purely via `deriveEffectiveStats`.
	@param input - `{ base, equipment, itemId }`: the base stats, the current
		equipment loadout, and the item id to preview equipping.
	@returns EquipmentSwapPreview | null — the slot, replaced item, and
		before/after effective stats; `null` when `itemId` is not equipment. */
export function previewEquipmentSwap(input: {
	base: BaseStats;
	equipment: EquipmentState;
	itemId: string;
}): EquipmentSwapPreview | null {
	const item = getItem(input.itemId);

	if (!item || item.type !== 'equipment') {
		return null;
	}

	return {
		slot: item.slot,
		replacedItemId: input.equipment[item.slot],
		before: deriveEffectiveStats(input.base, input.equipment),
		after: deriveEffectiveStats(input.base, { ...input.equipment, [item.slot]: item.id })
	};
}
