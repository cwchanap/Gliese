import type { DefinitionRegistry, EnemyDefinition } from '$lib/game/core/types';
import type { LootTable } from '$lib/game/core/loot';

export interface EnemyCombatDefinition extends EnemyDefinition {
	xpReward: number;
	loot?: LootTable;
	boss?: {
		phaseTwoColor: number;
	};
}

export const slimeScout: EnemyCombatDefinition = {
	id: 'slime-scout',
	baseHp: 8,
	baseAttack: 2,
	moveSpeed: 90,
	xpReward: 4,
	loot: {
		guaranteed: [],
		chance: [{ itemId: 'field-potion', quantity: 1, chance: 0.6 }]
	}
};

export const ruinsWarden: EnemyCombatDefinition = {
	id: 'ruins-warden',
	baseHp: 45,
	baseAttack: 5,
	moveSpeed: 75,
	xpReward: 18,
	loot: {
		guaranteed: [
			{ itemId: 'warden-sigil', quantity: 1 },
			{ itemId: 'warden-crown', quantity: 1 }
		],
		chance: [{ itemId: 'ruin-blade', quantity: 1, chance: 0.5 }]
	},
	boss: {
		phaseTwoColor: 0xff8a3d
	}
};

export const enemies: DefinitionRegistry<EnemyCombatDefinition> = {
	[slimeScout.id]: slimeScout,
	[ruinsWarden.id]: ruinsWarden
};
