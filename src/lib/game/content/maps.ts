import type { DefinitionRegistry, MapDefinition } from '$lib/game/core/types';

export interface MapTransition {
	x: number;
	y: number;
	toMapId: string;
	arrival?: {
		x: number;
		y: number;
		facing: WorldMapDefinition['spawnDirection'];
	};
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
	encounter?: MapEncounter;
}

export const openingMapId = 'meadow-entry';

export const meadowEntryMap: WorldMapDefinition = {
	id: openingMapId,
	width: 80,
	height: 80,
	spawnDirection: 'right',
	spawn: { x: 256, y: 1_280 },
	transitions: [
		{
			x: 2_304,
			y: 1_280,
			toMapId: 'ruins-threshold',
			arrival: { x: 256, y: 480, facing: 'right' }
		}
	],
	encounter: { x: 1_280, y: 1_280, enemyId: 'slime-scout' }
};

export const ruinsThresholdMap: WorldMapDefinition = {
	id: 'ruins-threshold',
	width: 30,
	height: 30,
	spawnDirection: 'right',
	spawn: { x: 256, y: 480 },
	transitions: [
		{
			x: 128,
			y: 480,
			toMapId: openingMapId,
			arrival: { x: 2_176, y: 1_280, facing: 'left' }
		},
		{
			x: 704,
			y: 480,
			toMapId: 'ruins-core',
			arrival: { x: 256, y: 480, facing: 'right' }
		}
	]
};

export const ruinsCoreMap: WorldMapDefinition = {
	id: 'ruins-core',
	width: 30,
	height: 30,
	spawnDirection: 'right',
	spawn: { x: 256, y: 480 },
	transitions: [
		{
			x: 128,
			y: 480,
			toMapId: 'ruins-threshold',
			arrival: { x: 576, y: 480, facing: 'left' }
		}
	],
	encounter: { x: 640, y: 480, enemyId: 'ruins-warden', completion: 'victory' }
};

export const maps: DefinitionRegistry<WorldMapDefinition> = {
	[meadowEntryMap.id]: meadowEntryMap,
	[ruinsThresholdMap.id]: ruinsThresholdMap,
	[ruinsCoreMap.id]: ruinsCoreMap
};
