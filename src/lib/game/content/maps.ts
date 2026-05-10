import type { NpcFrameName } from '$lib/game/content/assets';
import type { DefinitionRegistry, MapDefinition } from '$lib/game/core/types';

export interface MapTransition {
	id: string;
	x: number;
	y: number;
	toMapId: string;
	requiresClear?: boolean;
	showMarker?: boolean;
	questRequirement?: {
		questId: string;
		objectiveId: string;
	};
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

export type MapNpcRole = 'guild' | 'shopkeeper' | 'villager' | 'home';

export interface MapNpc {
	id: string;
	x: number;
	y: number;
	name: string;
	dialogue: string;
	role: MapNpcRole;
	frameName: NpcFrameName;
	shopId?: string;
}

export interface MapLandmark {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	label: string;
}

export interface WorldMapDefinition extends MapDefinition {
	spawn: {
		x: number;
		y: number;
	};
	transitions: MapTransition[];
	pickups?: MapPickup[];
	encounters?: MapEncounter[];
	npcs?: MapNpc[];
	landmarks?: MapLandmark[];
}

export const openingMapId = 'meadow-entry';

const interiorDoor = { x: 256, y: 336 } as const;

export const meadowEntryMap: WorldMapDefinition = {
	id: openingMapId,
	width: 80,
	height: 80,
	spawnDirection: 'down',
	spawn: { x: 384, y: 1_376 },
	landmarks: [
		{
			id: 'hero-house-exterior',
			x: 384,
			y: 1_289,
			width: 192,
			height: 174,
			label: "Hero's House"
		},
		{ id: 'guild-hall-exterior', x: 800, y: 1_054, width: 256, height: 228, label: 'Guild' },
		{
			id: 'item-shop-exterior',
			x: 832,
			y: 1_436,
			width: 192,
			height: 200,
			label: 'Item Shop'
		},
		{
			id: 'villager-house-1-exterior',
			x: 352,
			y: 991,
			width: 160,
			height: 178,
			label: 'Villager Home'
		},
		{
			id: 'villager-house-2-exterior',
			x: 576,
			y: 1_535,
			width: 160,
			height: 178,
			label: 'Villager Home'
		},
		{
			id: 'villager-house-3-exterior',
			x: 1_056,
			y: 1_311,
			width: 160,
			height: 178,
			label: 'Villager Home'
		}
	],
	transitions: [
		{
			id: 'meadow-to-hero-house',
			x: 384,
			y: 1_344,
			toMapId: 'hero-house',
			showMarker: false,
			arrival: { x: 256, y: 224, facing: 'up' }
		},
		{
			id: 'meadow-to-guild-hall',
			x: 800,
			y: 1_136,
			toMapId: 'guild-hall',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-item-shop',
			x: 832,
			y: 1_504,
			toMapId: 'item-shop',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-1',
			x: 352,
			y: 1_048,
			toMapId: 'villager-house-1',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-2',
			x: 576,
			y: 1_592,
			toMapId: 'villager-house-2',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-3',
			x: 1_056,
			y: 1_368,
			toMapId: 'villager-house-3',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-ruins-threshold',
			x: 2_304,
			y: 1_280,
			toMapId: 'ruins-threshold',
			requiresClear: true,
			questRequirement: {
				questId: 'investigate-the-ruins',
				objectiveId: 'talk-to-guild-master'
			},
			arrival: { x: 256, y: 480, facing: 'right' }
		}
	],
	pickups: [
		{ id: 'meadow-entry-potion', x: 704, y: 1_248, itemId: 'field-potion', quantity: 2 },
		{ id: 'meadow-entry-charm', x: 960, y: 1_408, itemId: 'meadow-charm', quantity: 1 },
		{ id: 'meadow-entry-token', x: 1_280, y: 1_152, itemId: 'meadow-token', quantity: 1 }
	],
	encounters: [
		{ id: 'meadow-slime-west', x: 1_568, y: 1_280, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-center', x: 1_824, y: 1_280, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-east', x: 2_080, y: 1_280, enemyId: 'slime-scout' }
	]
};

export const heroHouseMap: WorldMapDefinition = {
	id: 'hero-house',
	width: 16,
	height: 12,
	spawnDirection: 'up',
	spawn: { x: 256, y: 224 },
	transitions: [
		{
			id: 'hero-house-to-meadow',
			...interiorDoor,
			toMapId: openingMapId,
			arrival: { x: 384, y: 1_456, facing: 'down' }
		}
	]
};

export const guildHallMap: WorldMapDefinition = {
	id: 'guild-hall',
	width: 16,
	height: 12,
	spawnDirection: 'up',
	spawn: { x: 256, y: 288 },
	transitions: [
		{
			id: 'guild-hall-to-meadow',
			...interiorDoor,
			toMapId: openingMapId,
			arrival: { x: 800, y: 1_216, facing: 'down' }
		}
	],
	npcs: [
		{
			id: 'guild-master',
			x: 192,
			y: 144,
			name: 'Guild Master Arlen',
			dialogue: 'The ruins are stirring again. Speak with me, then clear the warden.',
			role: 'guild',
			frameName: 'guildMasterNpc'
		},
		{
			id: 'guild-quartermaster',
			x: 352,
			y: 144,
			name: 'Quartermaster Vale',
			dialogue: 'Need field gear before the ruins? Guild stock is limited, but sturdy.',
			role: 'shopkeeper',
			frameName: 'quartermasterNpc',
			shopId: 'guild-quartermaster'
		}
	]
};

export const itemShopMap: WorldMapDefinition = {
	id: 'item-shop',
	width: 16,
	height: 12,
	spawnDirection: 'up',
	spawn: { x: 256, y: 288 },
	transitions: [
		{
			id: 'item-shop-to-meadow',
			...interiorDoor,
			toMapId: openingMapId,
			arrival: { x: 832, y: 1_584, facing: 'down' }
		}
	],
	npcs: [
		{
			id: 'shopkeeper-mira',
			x: 256,
			y: 144,
			name: 'Mira',
			dialogue: 'Fresh tonics are on the shelf. The guild already stocked your field kit today.',
			role: 'shopkeeper',
			frameName: 'miraItemShopNpc',
			shopId: 'miras-item-shop'
		}
	]
};

export const villagerHouse1Map: WorldMapDefinition = {
	id: 'villager-house-1',
	width: 16,
	height: 12,
	spawnDirection: 'up',
	spawn: { x: 256, y: 288 },
	transitions: [
		{
			id: 'villager-house-1-to-meadow',
			...interiorDoor,
			toMapId: openingMapId,
			arrival: { x: 352, y: 1_128, facing: 'down' }
		}
	]
};

export const villagerHouse2Map: WorldMapDefinition = {
	id: 'villager-house-2',
	width: 16,
	height: 12,
	spawnDirection: 'up',
	spawn: { x: 256, y: 288 },
	transitions: [
		{
			id: 'villager-house-2-to-meadow',
			...interiorDoor,
			toMapId: openingMapId,
			arrival: { x: 576, y: 1_672, facing: 'down' }
		}
	]
};

export const villagerHouse3Map: WorldMapDefinition = {
	id: 'villager-house-3',
	width: 16,
	height: 12,
	spawnDirection: 'up',
	spawn: { x: 256, y: 288 },
	transitions: [
		{
			id: 'villager-house-3-to-meadow',
			...interiorDoor,
			toMapId: openingMapId,
			arrival: { x: 1_056, y: 1_448, facing: 'down' }
		}
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
			id: 'threshold-to-meadow',
			x: 128,
			y: 480,
			toMapId: openingMapId,
			requiresClear: true,
			arrival: { x: 2_176, y: 1_280, facing: 'left' }
		},
		{
			id: 'threshold-to-core',
			x: 704,
			y: 480,
			toMapId: 'ruins-core',
			requiresClear: true,
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
			id: 'core-to-threshold',
			x: 128,
			y: 480,
			toMapId: 'ruins-threshold',
			requiresClear: true,
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
	[heroHouseMap.id]: heroHouseMap,
	[guildHallMap.id]: guildHallMap,
	[itemShopMap.id]: itemShopMap,
	[villagerHouse1Map.id]: villagerHouse1Map,
	[villagerHouse2Map.id]: villagerHouse2Map,
	[villagerHouse3Map.id]: villagerHouse3Map,
	[ruinsThresholdMap.id]: ruinsThresholdMap,
	[ruinsCoreMap.id]: ruinsCoreMap
};
