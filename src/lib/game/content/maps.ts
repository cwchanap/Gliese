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
	id: string;
	x: number;
	y: number;
	enemyId: string;
	completion?: 'victory';
}

export interface MapPickup {
	id: string;
	x: number;
	y: number;
	itemId: string;
	quantity: number;
	label?: string;
}

export interface WorldMapDefinition extends MapDefinition {
	spawn: {
		x: number;
		y: number;
	};
	transitions: MapTransition[];
	pickups?: MapPickup[];
	encounters?: MapEncounter[];
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
	pickups: [
		{ id: 'meadow-entry-potion', x: 512, y: 1_184, itemId: 'field-potion', quantity: 2 },
		{ id: 'meadow-entry-charm', x: 896, y: 1_408, itemId: 'meadow-charm', quantity: 1 },
		{ id: 'meadow-entry-token', x: 1_024, y: 1_152, itemId: 'meadow-token', quantity: 1 }
	],
	encounters: [
		{ id: 'meadow-slime-west', x: 1_024, y: 1_280, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-center', x: 1_280, y: 1_280, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-east', x: 1_536, y: 1_280, enemyId: 'slime-scout' }
	]
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
	],
	pickups: [
		{ id: 'ruins-threshold-cap', x: 416, y: 352, itemId: 'iron-cap', quantity: 1 },
		{ id: 'ruins-threshold-rune', x: 576, y: 608, itemId: 'threshold-rune', quantity: 1 },
		{ id: 'ruins-threshold-salve', x: 320, y: 640, itemId: 'sunleaf-salve', quantity: 2 }
	],
	encounters: [
		{ id: 'threshold-slime-west', x: 416, y: 480, enemyId: 'slime-scout' },
		{ id: 'threshold-slime-east', x: 576, y: 480, enemyId: 'slime-scout' }
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
	pickups: [
		{ id: 'ruins-core-mail', x: 448, y: 608, itemId: 'stone-mail', quantity: 1 },
		{ id: 'ruins-core-draught', x: 544, y: 352, itemId: 'ruin-draught', quantity: 1 }
	],
	encounters: [
		{ id: 'ruins-warden', x: 640, y: 480, enemyId: 'ruins-warden', completion: 'victory' }
	]
};

export const maps: DefinitionRegistry<WorldMapDefinition> = {
	[meadowEntryMap.id]: meadowEntryMap,
	[ruinsThresholdMap.id]: ruinsThresholdMap,
	[ruinsCoreMap.id]: ruinsCoreMap
};
