import type {
	ForestDressingFrameName,
	InteriorPropFrameName,
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

export type MapBlockerKind = 'city-wall' | 'town-hedge' | 'ruin-wall' | 'future-gate' | 'ocean';

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

export type MapInteriorPropDepth = 'floor' | 'furniture' | 'foreground';

export interface MapInteriorProp extends MapRect {
	frameName: InteriorPropFrameName;
	depth?: MapInteriorPropDepth;
	collision?: MapRect;
}

export type MapAmbientNpcRole = 'guild-member' | 'shopper' | 'family' | 'neighbor';

export interface MapAmbientNpc {
	id: string;
	x: number;
	y: number;
	frameName: NpcFrameName;
	width?: number;
	height?: number;
	role?: MapAmbientNpcRole;
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
	interiorProps?: MapInteriorProp[];
	ambientNpcs?: MapAmbientNpc[];
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
	spawnDirection: 'up',
	spawn: { x: 1_536, y: 5_550 },
	landmarks: [
		{
			id: 'hero-house-exterior',
			x: 531,
			y: 5_850,
			width: 294,
			height: 307,
			labelKey: 'content.maps.landmarks.hero-house-exterior.label'
		},
		{
			id: 'guild-hall-exterior',
			x: 2_048,
			y: 5_869,
			width: 384,
			height: 346,
			labelKey: 'content.maps.landmarks.guild-hall-exterior.label'
		},
		{
			id: 'item-shop-exterior',
			x: 2_138,
			y: 4_634,
			width: 307,
			height: 294,
			labelKey: 'content.maps.landmarks.item-shop-exterior.label'
		},
		{
			id: 'villager-house-1-exterior',
			x: 333,
			y: 5_152,
			width: 282,
			height: 256,
			labelKey: 'content.maps.landmarks.villager-house-1-exterior.label'
		},
		{
			id: 'villager-house-2-exterior',
			x: 1_011,
			y: 4_618,
			width: 422,
			height: 326,
			labelKey: 'content.maps.landmarks.villager-house-2-exterior.label'
		},
		{
			id: 'villager-house-3-exterior',
			x: 2_592,
			y: 4_778,
			width: 230,
			height: 416,
			labelKey: 'content.maps.landmarks.villager-house-3-exterior.label'
		},
		{
			id: 'sundrop-well',
			x: 1_536,
			y: 5_341,
			width: 141,
			height: 160,
			labelKey: 'content.maps.landmarks.sundrop-well.label'
		},
		{
			id: 'whispering-cave',
			x: 5_960,
			y: 1_800,
			width: 256,
			height: 224,
			labelKey: 'content.maps.landmarks.whispering-cave.label'
		},
		{
			id: 'blacksmith',
			x: 595,
			y: 4_877,
			width: 294,
			height: 282,
			labelKey: 'content.maps.landmarks.blacksmith.label'
		},
		{
			id: 'shrine-of-aurora',
			x: 1_050,
			y: 5_872,
			width: 307,
			height: 416,
			labelKey: 'content.maps.landmarks.shrine-of-aurora.label'
		}
	],
	transitions: [
		{
			id: 'meadow-to-hero-house',
			x: 531,
			y: 5_940,
			toMapId: 'hero-house',
			showMarker: false,
			arrival: { x: 256, y: 224, facing: 'up' }
		},
		{
			id: 'meadow-to-guild-hall',
			x: 2_048,
			y: 5_960,
			toMapId: 'guild-hall',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-item-shop',
			x: 2_138,
			y: 4_717,
			toMapId: 'item-shop',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-1',
			x: 333,
			y: 5_222,
			toMapId: 'villager-house-1',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-2',
			x: 1_011,
			y: 4_712,
			toMapId: 'villager-house-2',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-3',
			x: 2_592,
			y: 4_912,
			toMapId: 'villager-house-3',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-whispering-cave-ruins-threshold',
			x: 5_960,
			y: 1_868,
			toMapId: 'ruins-threshold',
			requiresClear: true,
			marker: 'stair',
			questRequirement: {
				questId: 'investigate-the-ruins',
				objectiveId: 'talk-to-guild-master'
			},
			arrival: { x: 512, y: 3_200, facing: 'right' }
		}
	],
	groundPatches: [
		{
			id: 'sundrop-plaza-stone',
			x: 1_536,
			y: 5_344,
			width: 672,
			height: 512,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'sundrop-north-lane',
			x: 1_536,
			y: 4_800,
			width: 64,
			height: 640,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-south-lane',
			x: 1_536,
			y: 5_818,
			width: 64,
			height: 448,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-west-lane',
			x: 720,
			y: 5_347,
			width: 992,
			height: 70,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-east-lane',
			x: 2_336,
			y: 5_347,
			width: 960,
			height: 70,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-northwest-branch',
			x: 896,
			y: 4_797,
			width: 384,
			height: 58,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-northeast-branch',
			x: 2_176,
			y: 4_797,
			width: 384,
			height: 58,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-southwest-branch',
			x: 896,
			y: 5_853,
			width: 384,
			height: 58,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-southeast-branch',
			x: 2_176,
			y: 5_853,
			width: 384,
			height: 58,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-home-pocket',
			x: 531,
			y: 6_002,
			width: 384,
			height: 96,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-forest-road-east',
			x: 4_200,
			y: 5_347,
			width: 2_800,
			height: 70,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-forest-road-north',
			x: 5_600,
			y: 3_200,
			width: 70,
			height: 4_300,
			tile: 'pathTile'
		},
		{
			id: 'wildwood-north-combat-pocket',
			x: 5_120,
			y: 960,
			width: 672,
			height: 384,
			tile: 'pathTile'
		},
		{
			id: 'wildwood-crossing-combat-pocket',
			x: 5_360,
			y: 1_280,
			width: 512,
			height: 320,
			tile: 'pathTile'
		},
		{
			id: 'whispering-cave-combat-pocket',
			x: 5_920,
			y: 1_600,
			width: 512,
			height: 384,
			tile: 'pathTile'
		},
		{
			id: 'wildwood-cave-branch',
			x: 5_880,
			y: 1_600,
			width: 520,
			height: 70,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-cave-pocket',
			x: 5_960,
			y: 1_896,
			width: 288,
			height: 96,
			tile: 'pathTile'
		}
	],
	blockers: [
		{
			id: 'meadow-north-boundary',
			x: 3_200,
			y: 32,
			width: 6_400,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'meadow-south-boundary',
			x: 3_200,
			y: 6_368,
			width: 6_400,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'meadow-west-boundary',
			x: 32,
			y: 3_200,
			width: 64,
			height: 6_400,
			kind: 'town-hedge'
		},
		{
			id: 'meadow-east-boundary',
			x: 6_368,
			y: 3_200,
			width: 64,
			height: 6_400,
			kind: 'town-hedge'
		},
		{
			id: 'sundrop-southwest-ocean',
			x: 114,
			y: 6_311,
			width: 100,
			height: 50,
			kind: 'ocean'
		}
	],
	fences: [
		{ id: 'sundrop-home-fence', x: 531, y: 6_072, width: 384, height: 32 },
		{ id: 'sundrop-plaza-west-fence', x: 1_120, y: 5_536, width: 32, height: 288 },
		{ id: 'sundrop-plaza-east-fence', x: 1_952, y: 5_536, width: 32, height: 288 }
	],
	forestDecor: [
		{
			id: 'wildwood-north-canopy',
			x: 5_360,
			y: 360,
			width: 960,
			height: 160,
			frameName: 'treeCluster'
		},
		{
			id: 'wildwood-east-canopy',
			x: 6_120,
			y: 1_020,
			width: 160,
			height: 900,
			frameName: 'treeCluster'
		}
	],
	combatBounds: [
		{
			id: 'wildwood-north-combat-pocket',
			x: 5_120,
			y: 960,
			width: 672,
			height: 384,
			encounterIds: ['meadow-slime-west'],
			aggroRadius: 240,
			leashRadius: 420
		},
		{
			id: 'wildwood-crossing-combat-pocket',
			x: 5_360,
			y: 1_280,
			width: 512,
			height: 320,
			encounterIds: ['meadow-slime-center'],
			aggroRadius: 240,
			leashRadius: 420
		},
		{
			id: 'whispering-cave-combat-pocket',
			x: 5_920,
			y: 1_600,
			width: 512,
			height: 384,
			encounterIds: ['meadow-slime-east'],
			aggroRadius: 240,
			leashRadius: 420
		}
	],
	encounters: [
		{ id: 'meadow-slime-west', x: 4_928, y: 960, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-center', x: 5_360, y: 1_280, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-east', x: 5_920, y: 1_600, enemyId: 'slime-scout' }
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
			arrival: { x: 531, y: 6_040, facing: 'down' }
		}
	],
	interiorProps: [
		{
			id: 'hero-house-rug',
			x: 256,
			y: 252,
			width: 128,
			height: 72,
			frameName: 'rug',
			depth: 'floor'
		},
		{
			id: 'hero-house-bed',
			x: 112,
			y: 112,
			width: 96,
			height: 72,
			frameName: 'bed',
			collision: { id: 'hero-house-bed-collision', x: 112, y: 112, width: 92, height: 62 }
		},
		{
			id: 'hero-house-table',
			x: 256,
			y: 144,
			width: 76,
			height: 54,
			frameName: 'table',
			collision: { id: 'hero-house-table-collision', x: 256, y: 144, width: 70, height: 46 }
		},
		{
			id: 'hero-house-bookshelf',
			x: 400,
			y: 112,
			width: 64,
			height: 96,
			frameName: 'bookshelf',
			collision: { id: 'hero-house-bookshelf-collision', x: 400, y: 112, width: 56, height: 86 }
		},
		{
			id: 'hero-house-crates',
			x: 416,
			y: 248,
			width: 58,
			height: 58,
			frameName: 'crateStack',
			collision: { id: 'hero-house-crates-collision', x: 416, y: 248, width: 48, height: 48 }
		},
		{ id: 'hero-house-plant', x: 96, y: 248, width: 36, height: 48, frameName: 'plant' }
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
			arrival: { x: 2_048, y: 6_080, facing: 'down' }
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
	],
	interiorProps: [
		{
			id: 'guild-hall-notice-board',
			x: 256,
			y: 64,
			width: 112,
			height: 72,
			frameName: 'noticeBoard',
			collision: { id: 'guild-hall-notice-board-collision', x: 256, y: 64, width: 96, height: 34 }
		},
		{
			id: 'guild-hall-west-desk',
			x: 128,
			y: 152,
			width: 96,
			height: 54,
			frameName: 'table',
			collision: { id: 'guild-hall-west-desk-collision', x: 128, y: 152, width: 88, height: 44 }
		},
		{
			id: 'guild-hall-east-desk',
			x: 384,
			y: 152,
			width: 96,
			height: 54,
			frameName: 'table',
			collision: { id: 'guild-hall-east-desk-collision', x: 400, y: 152, width: 56, height: 44 }
		},
		{
			id: 'guild-hall-west-bench',
			x: 128,
			y: 256,
			width: 96,
			height: 34,
			frameName: 'bench',
			collision: { id: 'guild-hall-west-bench-collision', x: 128, y: 256, width: 86, height: 26 }
		},
		{
			id: 'guild-hall-east-bench',
			x: 384,
			y: 256,
			width: 96,
			height: 34,
			frameName: 'bench',
			collision: { id: 'guild-hall-east-bench-collision', x: 384, y: 256, width: 86, height: 26 }
		},
		{
			id: 'guild-hall-records',
			x: 64,
			y: 96,
			width: 52,
			height: 64,
			frameName: 'papers',
			collision: { id: 'guild-hall-records-collision', x: 64, y: 96, width: 42, height: 44 }
		},
		{
			id: 'guild-hall-weapon-rack',
			x: 448,
			y: 96,
			width: 56,
			height: 86,
			frameName: 'weaponRack',
			collision: { id: 'guild-hall-weapon-rack-collision', x: 448, y: 96, width: 44, height: 72 }
		}
	],
	ambientNpcs: [
		{
			id: 'guild-hall-member-west',
			x: 96,
			y: 208,
			frameName: 'quartermasterNpc',
			role: 'guild-member'
		},
		{
			id: 'guild-hall-member-east',
			x: 416,
			y: 208,
			frameName: 'miraItemShopNpc',
			role: 'guild-member'
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
			arrival: { x: 2_138, y: 4_816, facing: 'down' }
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
	],
	interiorProps: [
		{
			id: 'item-shop-counter',
			x: 256,
			y: 132,
			width: 192,
			height: 58,
			frameName: 'shopCounter',
			collision: { id: 'item-shop-counter-collision', x: 256, y: 108, width: 184, height: 48 }
		},
		{
			id: 'item-shop-west-shelf',
			x: 80,
			y: 128,
			width: 62,
			height: 104,
			frameName: 'displayShelf',
			collision: { id: 'item-shop-west-shelf-collision', x: 80, y: 128, width: 50, height: 92 }
		},
		{
			id: 'item-shop-east-shelf',
			x: 432,
			y: 128,
			width: 62,
			height: 104,
			frameName: 'displayShelf',
			collision: { id: 'item-shop-east-shelf-collision', x: 432, y: 128, width: 50, height: 92 }
		},
		{
			id: 'item-shop-rug',
			x: 256,
			y: 252,
			width: 118,
			height: 70,
			frameName: 'rug',
			depth: 'floor'
		},
		{
			id: 'item-shop-crates',
			x: 416,
			y: 260,
			width: 58,
			height: 58,
			frameName: 'crateStack',
			collision: { id: 'item-shop-crates-collision', x: 416, y: 260, width: 48, height: 48 }
		},
		{
			id: 'item-shop-barrel',
			x: 96,
			y: 260,
			width: 46,
			height: 52,
			frameName: 'barrel',
			collision: { id: 'item-shop-barrel-collision', x: 96, y: 260, width: 38, height: 42 }
		}
	],
	ambientNpcs: [
		{ id: 'item-shop-customer', x: 176, y: 232, frameName: 'guildMasterNpc', role: 'shopper' }
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
			arrival: { x: 333, y: 5_312, facing: 'down' }
		}
	],
	interiorProps: [
		{
			id: 'villager-house-1-rug',
			x: 256,
			y: 252,
			width: 118,
			height: 70,
			frameName: 'rug',
			depth: 'floor'
		},
		{
			id: 'villager-house-1-family-table',
			x: 256,
			y: 152,
			width: 82,
			height: 56,
			frameName: 'table',
			collision: {
				id: 'villager-house-1-family-table-collision',
				x: 256,
				y: 152,
				width: 72,
				height: 46
			}
		},
		{
			id: 'villager-house-1-bed',
			x: 104,
			y: 112,
			width: 90,
			height: 66,
			frameName: 'bed',
			collision: { id: 'villager-house-1-bed-collision', x: 104, y: 112, width: 82, height: 56 }
		},
		{
			id: 'villager-house-1-bench',
			x: 384,
			y: 176,
			width: 82,
			height: 34,
			frameName: 'bench',
			collision: { id: 'villager-house-1-bench-collision', x: 384, y: 176, width: 72, height: 26 }
		},
		{
			id: 'villager-house-1-crates',
			x: 416,
			y: 264,
			width: 54,
			height: 54,
			frameName: 'crateStack',
			collision: {
				id: 'villager-house-1-crates-collision',
				x: 416,
				y: 264,
				width: 44,
				height: 44
			}
		}
	],
	ambientNpcs: [
		{ id: 'villager-house-1-family', x: 336, y: 224, frameName: 'miraItemShopNpc', role: 'family' }
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
			arrival: { x: 1_011, y: 4_816, facing: 'down' }
		}
	],
	interiorProps: [
		{
			id: 'villager-house-2-work-table',
			x: 160,
			y: 144,
			width: 92,
			height: 58,
			frameName: 'table',
			collision: {
				id: 'villager-house-2-work-table-collision',
				x: 160,
				y: 144,
				width: 82,
				height: 48
			}
		},
		{
			id: 'villager-house-2-shelf',
			x: 400,
			y: 112,
			width: 62,
			height: 96,
			frameName: 'bookshelf',
			collision: { id: 'villager-house-2-shelf-collision', x: 400, y: 112, width: 52, height: 84 }
		},
		{
			id: 'villager-house-2-crates',
			x: 96,
			y: 256,
			width: 58,
			height: 58,
			frameName: 'crateStack',
			collision: { id: 'villager-house-2-crates-collision', x: 96, y: 256, width: 48, height: 48 }
		},
		{
			id: 'villager-house-2-papers',
			x: 280,
			y: 196,
			width: 54,
			height: 38,
			frameName: 'papers',
			depth: 'floor'
		},
		{ id: 'villager-house-2-plant', x: 416, y: 256, width: 36, height: 48, frameName: 'plant' }
	],
	ambientNpcs: [
		{ id: 'villager-house-2-neighbor', x: 320, y: 224, frameName: 'guildMasterNpc', role: 'neighbor' }
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
			arrival: { x: 2_592, y: 5_024, facing: 'down' }
		}
	],
	interiorProps: [
		{
			id: 'villager-house-3-bookshelf',
			x: 112,
			y: 112,
			width: 68,
			height: 104,
			frameName: 'bookshelf',
			collision: {
				id: 'villager-house-3-bookshelf-collision',
				x: 112,
				y: 112,
				width: 58,
				height: 92
			}
		},
		{
			id: 'villager-house-3-east-bookshelf',
			x: 400,
			y: 112,
			width: 68,
			height: 104,
			frameName: 'bookshelf',
			collision: {
				id: 'villager-house-3-east-bookshelf-collision',
				x: 400,
				y: 112,
				width: 58,
				height: 92
			}
		},
		{
			id: 'villager-house-3-rug',
			x: 256,
			y: 252,
			width: 118,
			height: 70,
			frameName: 'rug',
			depth: 'floor'
		},
		{
			id: 'villager-house-3-papers',
			x: 256,
			y: 156,
			width: 58,
			height: 40,
			frameName: 'papers',
			depth: 'floor'
		},
		{
			id: 'villager-house-3-lamp',
			x: 416,
			y: 256,
			width: 46,
			height: 56,
			frameName: 'hearthLamp',
			collision: { id: 'villager-house-3-lamp-collision', x: 416, y: 256, width: 36, height: 42 }
		}
	],
	ambientNpcs: [
		{
			id: 'villager-house-3-neighbor',
			x: 176,
			y: 224,
			frameName: 'quartermasterNpc',
			role: 'neighbor'
		}
	]
};

export const ruinsThresholdMap: WorldMapDefinition = {
	id: 'ruins-threshold',
	width: 200,
	height: 200,
	spawnDirection: 'right',
	spawn: { x: 512, y: 3_200 },
	transitions: [
		{
			id: 'threshold-to-meadow',
			x: 256,
			y: 3_200,
			toMapId: openingMapId,
			requiresClear: true,
			marker: 'stair',
			arrival: { x: 5_760, y: 1_868, facing: 'left' }
		},
		{
			id: 'threshold-to-core',
			x: 5_888,
			y: 3_200,
			toMapId: 'ruins-core',
			requiresClear: true,
			marker: 'stair',
			arrival: { x: 512, y: 3_200, facing: 'right' }
		}
	],
	groundPatches: [
		{
			id: 'threshold-main-loop-west',
			x: 1_600,
			y: 3_200,
			width: 2_176,
			height: 192,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'threshold-main-loop-east',
			x: 4_224,
			y: 3_200,
			width: 2_560,
			height: 192,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'threshold-north-branch',
			x: 2_240,
			y: 2_048,
			width: 192,
			height: 1_920,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'threshold-south-branch',
			x: 3_584,
			y: 4_352,
			width: 192,
			height: 1_920,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'threshold-north-room',
			x: 1_728,
			y: 2_048,
			width: 832,
			height: 640,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'threshold-south-room',
			x: 3_584,
			y: 4_608,
			width: 960,
			height: 672,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'threshold-east-room',
			x: 4_864,
			y: 3_008,
			width: 832,
			height: 640,
			tile: 'ruinsFloorTile'
		}
	],
	blockers: [
		{
			id: 'threshold-north-wall',
			x: 3_200,
			y: 1_184,
			width: 5_120,
			height: 128,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-south-wall',
			x: 3_200,
			y: 5_216,
			width: 5_120,
			height: 128,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-west-wall-north',
			x: 768,
			y: 2_080,
			width: 128,
			height: 1_600,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-west-wall-south',
			x: 768,
			y: 4_320,
			width: 128,
			height: 1_600,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-east-wall-north',
			x: 5_632,
			y: 2_080,
			width: 128,
			height: 1_600,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-east-wall-south',
			x: 5_632,
			y: 4_320,
			width: 128,
			height: 1_600,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-loop-divider-north',
			x: 3_040,
			y: 2_368,
			width: 128,
			height: 1_536,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-loop-divider-south',
			x: 2_912,
			y: 4_032,
			width: 128,
			height: 1_280,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-future-gate-north',
			x: 2_240,
			y: 2_816,
			width: 256,
			height: 96,
			kind: 'future-gate',
			label: 'Future north switch gate'
		},
		{
			id: 'threshold-future-gate-east',
			x: 4_864,
			y: 2_816,
			width: 320,
			height: 96,
			kind: 'future-gate',
			label: 'Future east gate'
		}
	],
	pickups: [
		{ id: 'ruins-threshold-cap', x: 1_728, y: 2_112, itemId: 'iron-cap', quantity: 1 },
		{ id: 'ruins-threshold-rune', x: 3_584, y: 4_384, itemId: 'threshold-rune', quantity: 1 },
		{ id: 'ruins-threshold-salve', x: 2_048, y: 4_800, itemId: 'sunleaf-salve', quantity: 2 }
	],
	encounters: [
		{ id: 'threshold-slime-west', x: 2_304, y: 3_200, enemyId: 'slime-scout' },
		{ id: 'threshold-slime-east', x: 4_096, y: 3_008, enemyId: 'slime-scout' }
	]
};

export const ruinsCoreMap: WorldMapDefinition = {
	id: 'ruins-core',
	width: 200,
	height: 200,
	spawnDirection: 'right',
	spawn: { x: 512, y: 3_200 },
	transitions: [
		{
			id: 'core-to-threshold',
			x: 256,
			y: 3_200,
			toMapId: 'ruins-threshold',
			requiresClear: true,
			marker: 'stair',
			arrival: { x: 5_504, y: 3_200, facing: 'left' }
		}
	],
	groundPatches: [
		{
			id: 'core-main-approach',
			x: 2_368,
			y: 3_200,
			width: 3_648,
			height: 192,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'core-north-side-room',
			x: 2_240,
			y: 2_048,
			width: 896,
			height: 704,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'core-south-side-room',
			x: 3_584,
			y: 4_544,
			width: 1_024,
			height: 704,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'core-boss-chamber',
			x: 4_992,
			y: 3_200,
			width: 1_024,
			height: 960,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'core-north-connector',
			x: 2_240,
			y: 2_624,
			width: 192,
			height: 1_280,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'core-south-connector',
			x: 3_584,
			y: 3_872,
			width: 192,
			height: 1_344,
			tile: 'ruinsFloorTile'
		}
	],
	blockers: [
		{
			id: 'core-north-wall',
			x: 3_200,
			y: 1_184,
			width: 5_120,
			height: 128,
			kind: 'ruin-wall'
		},
		{
			id: 'core-south-wall',
			x: 3_200,
			y: 5_216,
			width: 5_120,
			height: 128,
			kind: 'ruin-wall'
		},
		{
			id: 'core-west-wall-north',
			x: 768,
			y: 2_080,
			width: 128,
			height: 1_600,
			kind: 'ruin-wall'
		},
		{
			id: 'core-west-wall-south',
			x: 768,
			y: 4_320,
			width: 128,
			height: 1_600,
			kind: 'ruin-wall'
		},
		{
			id: 'core-east-wall',
			x: 5_760,
			y: 3_200,
			width: 128,
			height: 3_840,
			kind: 'ruin-wall'
		},
		{
			id: 'core-boss-approach-north',
			x: 4_352,
			y: 2_432,
			width: 128,
			height: 896,
			kind: 'ruin-wall'
		},
		{
			id: 'core-boss-approach-south',
			x: 4_352,
			y: 3_968,
			width: 128,
			height: 896,
			kind: 'ruin-wall'
		},
		{
			id: 'core-future-gate-boss',
			x: 4_608,
			y: 2_816,
			width: 96,
			height: 256,
			kind: 'future-gate',
			label: 'Future boss gate'
		},
		{
			id: 'core-future-gate-south',
			x: 3_584,
			y: 3_936,
			width: 256,
			height: 96,
			kind: 'future-gate',
			label: 'Future south chamber gate'
		}
	],
	pickups: [
		{ id: 'ruins-core-mail', x: 2_240, y: 2_048, itemId: 'stone-mail', quantity: 1 },
		{ id: 'ruins-core-draught', x: 3_584, y: 4_544, itemId: 'ruin-draught', quantity: 1 }
	],
	encounters: [
		{ id: 'ruins-warden', x: 4_992, y: 3_200, enemyId: 'ruins-warden', completion: 'victory' }
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
