import type { DefinitionRegistry, MapDefinition } from '$lib/game/core/types';

export const meadowEntryMap: MapDefinition = {
	id: 'meadow-entry',
	width: 20,
	height: 12,
	spawnDirection: 'down'
};

export const maps: DefinitionRegistry<MapDefinition> = {
	[meadowEntryMap.id]: meadowEntryMap
};
