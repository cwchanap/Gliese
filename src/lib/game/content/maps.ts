import type {
	ForestDressingFrameName,
	NpcFrameName,
	StarterPackFrameName
} from '$lib/game/content/assets';
import type { NpcDialogueId } from '$lib/game/content/dialogue';
import type { DefinitionRegistry, MapDefinition } from '$lib/game/core/types';
import { t, type MessageKey } from '$lib/game/i18n/translate';

export interface MapTransition {
	id: string;
	x: number;
	y: number;
	toMapId: string;
	requiresClear?: boolean;
	showMarker?: boolean;
	marker?: MapTransitionMarker;
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
	nameKey: MessageKey;
	name: string;
	dialogueId: NpcDialogueId;
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
	labelKey: MessageKey;
	label: string;
}

export interface MapRect {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export type MapTransitionMarker = 'doorway' | 'stair';

export type MapGroundTile = Extract<
	StarterPackFrameName,
	'grassTile' | 'pathTile' | 'ruinsFloorTile' | 'stoneWallTile'
>;

export interface MapGroundPatch extends MapRect {
	tile: MapGroundTile;
}

export type MapBlockerKind = 'city-wall' | 'ruin-wall' | 'future-gate';

export interface MapBlocker extends MapRect {
	kind: MapBlockerKind;
	label?: string;
}

export interface MapCombatBounds extends MapRect {
	encounterIds: string[];
	aggroRadius: number;
	leashRadius: number;
}

export interface MapForestZone extends MapRect {
	aggroRadius: number;
	leashRadius: number;
}

export type MapFenceSegment = MapRect;

export interface MapForestDecor extends MapRect {
	frameName: ForestDressingFrameName;
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
	forestZone?: MapForestZone;
	fences?: MapFenceSegment[];
	forestDecor?: MapForestDecor[];
	groundPatches?: MapGroundPatch[];
	blockers?: MapBlocker[];
	combatBounds?: MapCombatBounds[];
}

type MapNpcSource = Omit<MapNpc, 'name'>;
type MapLandmarkSource = Omit<MapLandmark, 'label'>;
type WorldMapDefinitionSource = Omit<WorldMapDefinition, 'npcs' | 'landmarks'> & {
	npcs?: MapNpcSource[];
	landmarks?: MapLandmarkSource[];
};

export const openingMapId = 'meadow-entry';

const interiorDoor = { x: 256, y: 336 } as const;

export const meadowEntryMap: WorldMapDefinition = addEnglishMapText({
	id: openingMapId,
	width: 200,
	height: 200,
	spawnDirection: 'down',
	spawn: { x: 640, y: 5_200 },
	landmarks: [
		{
			id: 'hero-house-exterior',
			x: 640,
			y: 5_088,
			width: 192,
			height: 174,
			labelKey: 'content.maps.landmarks.hero-house-exterior.label'
		},
		{
			id: 'guild-hall-exterior',
			x: 1_600,
			y: 4_256,
			width: 256,
			height: 228,
			labelKey: 'content.maps.landmarks.guild-hall-exterior.label'
		},
		{
			id: 'item-shop-exterior',
			x: 2_240,
			y: 4_960,
			width: 192,
			height: 200,
			labelKey: 'content.maps.landmarks.item-shop-exterior.label'
		},
		{
			id: 'villager-house-1-exterior',
			x: 960,
			y: 4_480,
			width: 160,
			height: 178,
			labelKey: 'content.maps.landmarks.villager-house-1-exterior.label'
		},
		{
			id: 'villager-house-2-exterior',
			x: 1_460,
			y: 5_440,
			width: 160,
			height: 178,
			labelKey: 'content.maps.landmarks.villager-house-2-exterior.label'
		},
		{
			id: 'villager-house-3-exterior',
			x: 2_800,
			y: 4_480,
			width: 160,
			height: 178,
			labelKey: 'content.maps.landmarks.villager-house-3-exterior.label'
		}
	],
	transitions: [
		{
			id: 'meadow-to-hero-house',
			x: 640,
			y: 5_168,
			toMapId: 'hero-house',
			showMarker: false,
			arrival: { x: 256, y: 224, facing: 'up' }
		},
		{
			id: 'meadow-to-guild-hall',
			x: 1_600,
			y: 4_352,
			toMapId: 'guild-hall',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-item-shop',
			x: 2_240,
			y: 5_040,
			toMapId: 'item-shop',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-1',
			x: 960,
			y: 4_552,
			toMapId: 'villager-house-1',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-2',
			x: 1_460,
			y: 5_512,
			toMapId: 'villager-house-2',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-3',
			x: 2_800,
			y: 4_552,
			toMapId: 'villager-house-3',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-ruins-threshold',
			x: 5_760,
			y: 960,
			toMapId: 'ruins-threshold',
			requiresClear: true,
			marker: 'stair',
			questRequirement: {
				questId: 'investigate-the-ruins',
				objectiveId: 'talk-to-guild-master'
			},
			arrival: { x: 256, y: 480, facing: 'right' }
		}
	],
	groundPatches: [
		{ id: 'city-loop-south-road', x: 1_650, y: 5_200, width: 2_300, height: 160, tile: 'pathTile' },
		{ id: 'city-loop-west-road', x: 640, y: 4_640, width: 160, height: 1_280, tile: 'pathTile' },
		{
			id: 'city-loop-north-road',
			x: 1_760,
			y: 4_256,
			width: 2_560,
			height: 160,
			tile: 'pathTile'
		},
		{ id: 'city-loop-east-road', x: 2_880, y: 4_160, width: 160, height: 1_280, tile: 'pathTile' },
		{ id: 'city-outskirts-road', x: 4_320, y: 2_640, width: 2_900, height: 160, tile: 'pathTile' },
		{ id: 'city-ruins-road', x: 5_640, y: 1_760, width: 160, height: 1_760, tile: 'pathTile' },
		{
			id: 'city-west-combat-ground',
			x: 3_200,
			y: 3_840,
			width: 720,
			height: 512,
			tile: 'pathTile'
		},
		{
			id: 'city-center-combat-ground',
			x: 4_128,
			y: 2_880,
			width: 720,
			height: 512,
			tile: 'pathTile'
		},
		{ id: 'city-east-combat-ground', x: 5_120, y: 1_600, width: 800, height: 512, tile: 'pathTile' }
	],
	blockers: [
		{
			id: 'city-west-district-wall',
			x: 320,
			y: 4_960,
			width: 64,
			height: 1_600,
			kind: 'city-wall'
		},
		{
			id: 'city-south-district-wall',
			x: 1_600,
			y: 5_872,
			width: 2_560,
			height: 64,
			kind: 'city-wall'
		},
		{
			id: 'city-north-district-wall',
			x: 1_600,
			y: 3_936,
			width: 2_560,
			height: 64,
			kind: 'city-wall'
		},
		{
			id: 'city-east-district-wall-north',
			x: 3_200,
			y: 3_496,
			width: 64,
			height: 176,
			kind: 'city-wall'
		},
		{
			id: 'city-east-district-wall-north-lower',
			x: 3_200,
			y: 4_264,
			width: 64,
			height: 336,
			kind: 'city-wall'
		},
		{
			id: 'city-east-district-wall-south',
			x: 3_200,
			y: 5_280,
			width: 64,
			height: 960,
			kind: 'city-wall'
		},
		{
			id: 'city-outskirts-north-tree-line',
			x: 4_480,
			y: 2_160,
			width: 2_720,
			height: 96,
			kind: 'city-wall'
		},
		{
			id: 'city-outskirts-south-tree-line',
			x: 4_480,
			y: 3_120,
			width: 2_720,
			height: 96,
			kind: 'city-wall'
		},
		{
			id: 'city-ruins-approach-west-wall',
			x: 5_360,
			y: 1_760,
			width: 96,
			height: 1_760,
			kind: 'city-wall'
		},
		{
			id: 'city-ruins-approach-east-wall',
			x: 6_016,
			y: 1_760,
			width: 96,
			height: 1_760,
			kind: 'city-wall'
		}
	],
	fences: [
		{ id: 'village-fence-south-west', x: 960, y: 5_648, width: 640, height: 32 },
		{ id: 'village-fence-south-east', x: 2_240, y: 5_648, width: 640, height: 32 },
		{ id: 'village-fence-west-north', x: 448, y: 4_512, width: 32, height: 736 },
		{ id: 'village-fence-west-south', x: 448, y: 5_360, width: 32, height: 384 },
		{ id: 'village-fence-east-north', x: 3_008, y: 4_448, width: 32, height: 640 },
		{ id: 'village-fence-east-south', x: 3_008, y: 5_280, width: 32, height: 512 }
	],
	forestDecor: [
		{
			id: 'outskirts-tree-line-north',
			x: 4_480,
			y: 2_080,
			width: 2_560,
			height: 160,
			frameName: 'treeCluster'
		},
		{
			id: 'outskirts-tree-line-south',
			x: 4_480,
			y: 3_200,
			width: 2_560,
			height: 160,
			frameName: 'treeCluster'
		},
		{
			id: 'outskirts-brush-west-pocket',
			x: 3_200,
			y: 3_840,
			width: 560,
			height: 256,
			frameName: 'brush'
		},
		{
			id: 'outskirts-brush-center-pocket',
			x: 4_128,
			y: 2_880,
			width: 560,
			height: 256,
			frameName: 'brush'
		},
		{
			id: 'outskirts-brush-east-pocket',
			x: 5_120,
			y: 1_600,
			width: 640,
			height: 256,
			frameName: 'brush'
		}
	],
	combatBounds: [
		{
			id: 'city-west-combat-pocket',
			x: 3_200,
			y: 3_840,
			width: 720,
			height: 512,
			encounterIds: ['meadow-slime-west'],
			aggroRadius: 240,
			leashRadius: 420
		},
		{
			id: 'city-center-combat-pocket',
			x: 4_128,
			y: 2_880,
			width: 720,
			height: 512,
			encounterIds: ['meadow-slime-center'],
			aggroRadius: 240,
			leashRadius: 420
		},
		{
			id: 'city-east-combat-pocket',
			x: 5_120,
			y: 1_600,
			width: 800,
			height: 512,
			encounterIds: ['meadow-slime-east'],
			aggroRadius: 240,
			leashRadius: 420
		}
	],
	encounters: [
		{ id: 'meadow-slime-west', x: 3_200, y: 3_840, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-center', x: 4_128, y: 2_880, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-east', x: 5_120, y: 1_600, enemyId: 'slime-scout' }
	]
});

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
			arrival: { x: 640, y: 5_248, facing: 'down' }
		}
	]
};

export const guildHallMap: WorldMapDefinition = addEnglishMapText({
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
			arrival: { x: 1_600, y: 4_432, facing: 'down' }
		}
	],
	npcs: [
		{
			id: 'guild-master',
			x: 192,
			y: 144,
			nameKey: 'content.maps.npcs.guild-master.name',
			dialogueId: 'guild-master',
			role: 'guild',
			frameName: 'guildMasterNpc'
		},
		{
			id: 'guild-quartermaster',
			x: 352,
			y: 144,
			nameKey: 'content.maps.npcs.guild-quartermaster.name',
			dialogueId: 'guild-quartermaster',
			role: 'shopkeeper',
			frameName: 'quartermasterNpc',
			shopId: 'guild-quartermaster'
		}
	]
});

export const itemShopMap: WorldMapDefinition = addEnglishMapText({
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
			arrival: { x: 2_240, y: 5_120, facing: 'down' }
		}
	],
	npcs: [
		{
			id: 'shopkeeper-mira',
			x: 256,
			y: 144,
			nameKey: 'content.maps.npcs.shopkeeper-mira.name',
			dialogueId: 'shopkeeper-mira',
			role: 'shopkeeper',
			frameName: 'miraItemShopNpc',
			shopId: 'miras-item-shop'
		}
	]
});

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
			arrival: { x: 960, y: 4_632, facing: 'down' }
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
			arrival: { x: 1_460, y: 5_592, facing: 'down' }
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
			arrival: { x: 2_800, y: 4_632, facing: 'down' }
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
			arrival: { x: 2_176, y: 704, facing: 'left' }
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

function addEnglishMapText(map: WorldMapDefinitionSource): WorldMapDefinition {
	return {
		...map,
		landmarks: map.landmarks?.map((landmark) => ({
			...landmark,
			label: t('en', landmark.labelKey)
		})),
		npcs: map.npcs?.map((npc) => ({
			...npc,
			name: t('en', npc.nameKey)
		}))
	};
}
