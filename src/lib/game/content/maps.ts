import type { DefinitionRegistry, MapDefinition } from '$lib/game/core/types';

export interface MapTransition {
	x: number;
	y: number;
	toMapId: string;
}

export interface MapEncounter {
	x: number;
	y: number;
	enemyId: string;
	completion?: 'victory';
}

export interface WorldMapDefinition extends MapDefinition {
	spawn: {
		x: number;
		y: number;
	};
	transitions: MapTransition[];
	encounters: MapEncounter[];
}

export const openingMapId = 'meadow-entry';

export const meadowEntryMap: WorldMapDefinition = {
	id: openingMapId,
	width: 20,
	height: 12,
	spawnDirection: 'down',
	spawn: { x: 64, y: 64 },
	transitions: [{ x: 352, y: 96, toMapId: 'ruins-threshold' }],
	encounters: [{ x: 304, y: 96, enemyId: 'slime-scout' }]
};

export const ruinsThresholdMap: WorldMapDefinition = {
	id: 'ruins-threshold',
	width: 16,
	height: 10,
	spawnDirection: 'left',
	spawn: { x: 48, y: 96 },
	transitions: [
		{ x: 16, y: 96, toMapId: openingMapId },
		{ x: 464, y: 96, toMapId: 'ruins-core' }
	],
	encounters: []
};

export const ruinsCoreMap: WorldMapDefinition = {
	id: 'ruins-core',
	width: 18,
	height: 10,
	spawnDirection: 'right',
	spawn: { x: 48, y: 96 },
	transitions: [{ x: 16, y: 96, toMapId: 'ruins-threshold' }],
	encounters: [{ x: 304, y: 96, enemyId: 'ruins-warden', completion: 'victory' }]
};

export const maps: DefinitionRegistry<WorldMapDefinition> = {
	[meadowEntryMap.id]: meadowEntryMap,
	[ruinsThresholdMap.id]: ruinsThresholdMap,
	[ruinsCoreMap.id]: ruinsCoreMap
};
