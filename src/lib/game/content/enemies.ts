import type { DefinitionRegistry, EnemyDefinition } from '$lib/game/core/types';

export interface EnemyCombatDefinition extends EnemyDefinition {
	xpReward: number;
	boss?: {
		phaseTwoColor: number;
	};
}

export const slimeScout: EnemyCombatDefinition = {
	id: 'slime-scout',
	baseHp: 3,
	baseAttack: 2,
	moveSpeed: 90,
	xpReward: 5
};

export const ruinsWarden: EnemyCombatDefinition = {
	id: 'ruins-warden',
	baseHp: 9,
	baseAttack: 4,
	moveSpeed: 75,
	xpReward: 12,
	boss: {
		phaseTwoColor: 0xff8a3d
	}
};

export const enemies: DefinitionRegistry<EnemyCombatDefinition> = {
	[slimeScout.id]: slimeScout,
	[ruinsWarden.id]: ruinsWarden
};
