import { getItem } from '$lib/game/content/items';
import type { EquipmentState } from '$lib/game/core/equipment';

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
