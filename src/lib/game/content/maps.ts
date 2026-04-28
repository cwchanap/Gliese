import type { DefinitionRegistry, MapDefinition } from '$lib/game/core/types';

export interface MapTransition {
	x: number;
	y: number;
	toMapId: string;
	hostile?: boolean;
}

export interface WorldMapDefinition extends MapDefinition {
	spawn: {
		x: number;
		y: number;
	};
	transitions: MapTransition[];
}

export const openingMapId = 'meadow-entry';

export const meadowEntryMap: WorldMapDefinition = {
	id: openingMapId,
	width: 20,
	height: 12,
	spawnDirection: 'down',
	spawn: { x: 64, y: 64 },
	transitions: [{ x: 304, y: 96, toMapId: 'ruins-threshold', hostile: true }]
};

export const ruinsThresholdMap: WorldMapDefinition = {
	id: 'ruins-threshold',
	width: 16,
	height: 10,
	spawnDirection: 'left',
	spawn: { x: 48, y: 96 },
	transitions: [{ x: 16, y: 96, toMapId: openingMapId }]
};

export const maps: DefinitionRegistry<WorldMapDefinition> = {
	[meadowEntryMap.id]: meadowEntryMap,
	[ruinsThresholdMap.id]: ruinsThresholdMap
};
