import type { DefinitionRegistry, PlayerDefinition } from '$lib/game/core/types';

export const startingPlayer: PlayerDefinition = {
	id: 'hero',
	baseHp: 20,
	baseAttack: 3,
	moveSpeed: 240
};

/** Where a new game opens, and where Grik wakes after each night: beside his bed. */
export const homeBedside = { mapId: 'hero-house', x: 160, y: 224, facing: 'down' } as const;

export const players: DefinitionRegistry<PlayerDefinition> = {
	[startingPlayer.id]: startingPlayer
};
