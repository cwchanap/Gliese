import type { DefinitionRegistry, EnemyDefinition } from '$lib/game/core/types';

export interface EnemyCombatDefinition extends EnemyDefinition {
	xpReward: number;
}

export const slimeScout: EnemyCombatDefinition = {
	id: 'slime-scout',
	baseHp: 3,
	baseAttack: 2,
	moveSpeed: 90,
	xpReward: 5
};

export const enemies: DefinitionRegistry<EnemyCombatDefinition> = {
	[slimeScout.id]: slimeScout
};
