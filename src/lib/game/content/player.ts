import type { DefinitionRegistry, PlayerDefinition } from '$lib/game/core/types';

export const startingPlayer: PlayerDefinition = {
	id: 'hero',
	baseHp: 20,
	baseAttack: 3,
	moveSpeed: 120
};

export const players: DefinitionRegistry<PlayerDefinition> = {
	[startingPlayer.id]: startingPlayer
};
