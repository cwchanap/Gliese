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
	width: 320,
	height: 320,
	spawnDirection: 'right',
	spawn: { x: 256, y: 5_120 },
	transitions: [
		{
			x: 9_984,
			y: 5_120,
			toMapId: 'ruins-threshold',
			arrival: { x: 256, y: 5_120, facing: 'right' }
		}
	],
	encounter: { x: 5_120, y: 5_120, enemyId: 'slime-scout' }
};

export const ruinsThresholdMap: WorldMapDefinition = {
	id: 'ruins-threshold',
	width: 320,
	height: 320,
	spawnDirection: 'right',
	spawn: { x: 256, y: 5_120 },
	transitions: [
		{
			x: 128,
			y: 5_120,
			toMapId: openingMapId,
			arrival: { x: 9_856, y: 5_120, facing: 'left' }
		},
		{
			x: 9_984,
			y: 5_120,
			toMapId: 'ruins-core',
			arrival: { x: 256, y: 1_280, facing: 'right' }
		}
	]
};

export const ruinsCoreMap: WorldMapDefinition = {
	id: 'ruins-core',
	width: 80,
	height: 80,
	spawnDirection: 'right',
	spawn: { x: 256, y: 1_280 },
	transitions: [
		{
			x: 128,
			y: 1_280,
			toMapId: 'ruins-threshold',
			arrival: { x: 9_856, y: 5_120, facing: 'left' }
		}
	],
	encounter: { x: 1_600, y: 1_280, enemyId: 'ruins-warden', completion: 'victory' }
};

export const maps: DefinitionRegistry<WorldMapDefinition> = {
	[meadowEntryMap.id]: meadowEntryMap,
	[ruinsThresholdMap.id]: ruinsThresholdMap,
	[ruinsCoreMap.id]: ruinsCoreMap
};
