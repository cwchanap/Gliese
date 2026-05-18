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

export type MapBlockerKind = 'city-wall' | 'town-hedge' | 'ruin-wall' | 'future-gate';

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
			arrival: { x: 512, y: 3_200, facing: 'right' }
		}
	],
	groundPatches: [
		{ id: 'village-home-pocket', x: 640, y: 5_224, width: 384, height: 160, tile: 'pathTile' },
		{ id: 'village-home-north-alley', x: 640, y: 4_720, width: 96, height: 960, tile: 'pathTile' },
		{ id: 'village-home-south-alley', x: 640, y: 5_488, width: 96, height: 448, tile: 'pathTile' },
		{
			id: 'village-north-civic-lane',
			x: 1_280,
			y: 4_552,
			width: 1_280,
			height: 128,
			tile: 'pathTile'
		},
		{ id: 'village-guild-court', x: 1_600, y: 4_352, width: 576, height: 320, tile: 'pathTile' },
		{
			id: 'village-guild-market-alley',
			x: 1_600,
			y: 4_624,
			width: 128,
			height: 512,
			tile: 'pathTile'
		},
		{
			id: 'village-villager1-pocket',
			x: 960,
			y: 4_624,
			width: 384,
			height: 256,
			tile: 'pathTile'
		},
		{
			id: 'village-central-courtyard',
			x: 1_600,
			y: 4_880,
			width: 576,
			height: 352,
			tile: 'pathTile'
		},
		{
			id: 'village-middle-market-lane',
			x: 1_520,
			y: 5_040,
			width: 1_760,
			height: 128,
			tile: 'pathTile'
		},
		{ id: 'village-shop-court', x: 2_240, y: 5_120, width: 576, height: 320, tile: 'pathTile' },
		{
			id: 'village-shop-back-alley',
			x: 2_464,
			y: 4_800,
			width: 128,
			height: 704,
			tile: 'pathTile'
		},
		{
			id: 'village-villager3-lane',
			x: 2_620,
			y: 4_552,
			width: 960,
			height: 128,
			tile: 'pathTile'
		},
		{
			id: 'village-villager3-pocket',
			x: 2_800,
			y: 4_624,
			width: 448,
			height: 256,
			tile: 'pathTile'
		},
		{
			id: 'village-villager2-pocket',
			x: 1_460,
			y: 5_520,
			width: 448,
			height: 320,
			tile: 'pathTile'
		},
		{
			id: 'village-south-service-lane',
			x: 1_560,
			y: 5_520,
			width: 1_360,
			height: 128,
			tile: 'pathTile'
		},
		{
			id: 'village-market-south-alley',
			x: 2_240,
			y: 5_344,
			width: 128,
			height: 448,
			tile: 'pathTile'
		},
		{
			id: 'village-east-gate-court',
			x: 3_024,
			y: 4_928,
			width: 480,
			height: 288,
			tile: 'pathTile'
		},
		{
			id: 'village-east-gate-neck',
			x: 3_360,
			y: 4_928,
			width: 672,
			height: 128,
			tile: 'pathTile'
		},
		{
			id: 'outskirts-split-trail',
			x: 3_700,
			y: 4_320,
			width: 128,
			height: 1_280,
			tile: 'pathTile'
		},
		{
			id: 'outskirts-north-brush-lane',
			x: 4_300,
			y: 3_760,
			width: 1_320,
			height: 128,
			tile: 'pathTile'
		},
		{
			id: 'outskirts-north-combat-pocket',
			x: 4_160,
			y: 3_520,
			width: 704,
			height: 448,
			tile: 'pathTile'
		},
		{
			id: 'outskirts-overlook-dead-end',
			x: 5_040,
			y: 3_440,
			width: 800,
			height: 128,
			tile: 'pathTile'
		},
		{
			id: 'outskirts-south-brush-lane',
			x: 4_520,
			y: 4_720,
			width: 1_640,
			height: 128,
			tile: 'pathTile'
		},
		{
			id: 'outskirts-south-combat-pocket',
			x: 4_640,
			y: 4_928,
			width: 704,
			height: 448,
			tile: 'pathTile'
		},
		{
			id: 'outskirts-center-cross-trail',
			x: 5_040,
			y: 4_240,
			width: 128,
			height: 1_088,
			tile: 'pathTile'
		},
		{
			id: 'outskirts-rejoin-clearing',
			x: 5_360,
			y: 4_240,
			width: 576,
			height: 320,
			tile: 'pathTile'
		},
		{
			id: 'ruins-approach-lower-run',
			x: 5_520,
			y: 3_360,
			width: 128,
			height: 1_920,
			tile: 'pathTile'
		},
		{
			id: 'ruins-east-combat-pocket',
			x: 5_520,
			y: 2_080,
			width: 640,
			height: 512,
			tile: 'pathTile'
		},
		{ id: 'ruins-final-bend', x: 5_760, y: 2_400, width: 608, height: 128, tile: 'pathTile' },
		{ id: 'ruins-final-stair-run', x: 5_760, y: 1_520, width: 128, height: 1_888, tile: 'pathTile' }
	],
	blockers: [
		{
			id: 'city-west-district-wall',
			x: 320,
			y: 4_960,
			width: 64,
			height: 1_600,
			kind: 'town-hedge'
		},
		{
			id: 'city-south-district-wall',
			x: 1_600,
			y: 5_872,
			width: 2_560,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'city-north-district-wall',
			x: 1_600,
			y: 3_936,
			width: 2_560,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'village-home-yard-west-hedge',
			x: 416,
			y: 5_200,
			width: 48,
			height: 448,
			kind: 'town-hedge'
		},
		{
			id: 'village-home-yard-east-hedge',
			x: 896,
			y: 5_280,
			width: 48,
			height: 320,
			kind: 'town-hedge'
		},
		{
			id: 'village-home-yard-north-left-hedge',
			x: 480,
			y: 4_960,
			width: 160,
			height: 48,
			kind: 'town-hedge'
		},
		{
			id: 'village-home-yard-north-right-hedge',
			x: 800,
			y: 4_960,
			width: 160,
			height: 48,
			kind: 'town-hedge'
		},
		{
			id: 'village-guild-court-west-wall',
			x: 1_280,
			y: 4_352,
			width: 48,
			height: 352,
			kind: 'city-wall'
		},
		{
			id: 'village-guild-court-east-wall',
			x: 1_920,
			y: 4_352,
			width: 48,
			height: 352,
			kind: 'city-wall'
		},
		{
			id: 'village-central-yard-west-hedge',
			x: 1_280,
			y: 4_880,
			width: 48,
			height: 352,
			kind: 'town-hedge'
		},
		{
			id: 'village-central-yard-east-hedge',
			x: 1_920,
			y: 4_880,
			width: 48,
			height: 352,
			kind: 'town-hedge'
		},
		{
			id: 'village-central-yard-south-hedge',
			x: 1_600,
			y: 5_312,
			width: 640,
			height: 48,
			kind: 'town-hedge'
		},
		{
			id: 'village-shop-yard-north-wall',
			x: 2_200,
			y: 4_864,
			width: 400,
			height: 48,
			kind: 'city-wall'
		},
		{
			id: 'village-shop-yard-east-hedge',
			x: 2_560,
			y: 5_120,
			width: 48,
			height: 384,
			kind: 'town-hedge'
		},
		{
			id: 'village-villager1-yard-south-hedge',
			x: 960,
			y: 4_800,
			width: 384,
			height: 48,
			kind: 'town-hedge'
		},
		{
			id: 'village-villager3-yard-south-hedge',
			x: 2_800,
			y: 4_800,
			width: 448,
			height: 48,
			kind: 'town-hedge'
		},
		{
			id: 'village-villager2-yard-north-hedge',
			x: 1_460,
			y: 5_328,
			width: 352,
			height: 48,
			kind: 'town-hedge'
		},
		{
			id: 'village-villager2-yard-west-hedge',
			x: 1_216,
			y: 5_664,
			width: 48,
			height: 192,
			kind: 'town-hedge'
		},
		{
			id: 'village-villager2-yard-east-wall',
			x: 1_704,
			y: 5_664,
			width: 48,
			height: 192,
			kind: 'city-wall'
		},
		{
			id: 'village-east-gate-north-wall',
			x: 3_200,
			y: 4_720,
			width: 560,
			height: 64,
			kind: 'city-wall'
		},
		{
			id: 'village-east-gate-south-wall',
			x: 3_200,
			y: 5_152,
			width: 560,
			height: 64,
			kind: 'city-wall'
		},
		{
			id: 'outskirts-north-tree-line',
			x: 4_480,
			y: 3_200,
			width: 2_200,
			height: 96,
			kind: 'town-hedge'
		},
		{
			id: 'outskirts-south-tree-line',
			x: 4_480,
			y: 5_248,
			width: 2_200,
			height: 96,
			kind: 'town-hedge'
		},
		{
			id: 'outskirts-split-west-brush-wall',
			x: 3_440,
			y: 4_320,
			width: 96,
			height: 1_320,
			kind: 'town-hedge'
		},
		{
			id: 'outskirts-north-lane-south-hedge',
			x: 4_400,
			y: 3_952,
			width: 1_200,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'outskirts-south-lane-north-hedge',
			x: 4_520,
			y: 4_528,
			width: 1_400,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'outskirts-north-pocket-north-wall',
			x: 4_160,
			y: 3_232,
			width: 704,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'outskirts-north-pocket-east-wall',
			x: 4_544,
			y: 3_520,
			width: 64,
			height: 448,
			kind: 'town-hedge'
		},
		{
			id: 'outskirts-south-pocket-south-wall',
			x: 4_640,
			y: 5_216,
			width: 704,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'outskirts-south-pocket-east-wall',
			x: 5_024,
			y: 4_928,
			width: 64,
			height: 448,
			kind: 'town-hedge'
		},
		{
			id: 'outskirts-rejoin-north-wall',
			x: 5_360,
			y: 3_920,
			width: 640,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'outskirts-rejoin-south-wall',
			x: 5_360,
			y: 4_560,
			width: 640,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'ruins-approach-west-wall',
			x: 5_360,
			y: 3_360,
			width: 96,
			height: 1_920,
			kind: 'city-wall'
		},
		{
			id: 'ruins-approach-east-wall',
			x: 5_680,
			y: 3_360,
			width: 96,
			height: 1_920,
			kind: 'city-wall'
		},
		{
			id: 'ruins-final-west-wall',
			x: 5_488,
			y: 1_520,
			width: 96,
			height: 1_648,
			kind: 'city-wall'
		},
		{
			id: 'ruins-final-east-wall',
			x: 6_032,
			y: 1_520,
			width: 96,
			height: 1_648,
			kind: 'city-wall'
		}
	],
	fences: [
		{ id: 'village-home-fence-south-west', x: 520, y: 5_680, width: 240, height: 32 },
		{ id: 'village-home-fence-south-east', x: 800, y: 5_680, width: 240, height: 32 },
		{ id: 'village-guild-fence-north-west', x: 1_380, y: 4_160, width: 360, height: 32 },
		{ id: 'village-guild-fence-north-east', x: 1_820, y: 4_160, width: 360, height: 32 },
		{ id: 'village-shop-fence-south', x: 2_480, y: 5_344, width: 160, height: 32 },
		{ id: 'village-villager1-fence-west', x: 704, y: 4_624, width: 32, height: 256 },
		{ id: 'village-villager3-fence-east', x: 3_072, y: 4_624, width: 32, height: 256 },
		{ id: 'village-villager2-fence-south', x: 1_460, y: 5_744, width: 448, height: 32 },
		{ id: 'village-east-gate-fence-north', x: 3_024, y: 4_768, width: 320, height: 32 },
		{ id: 'village-east-gate-fence-south', x: 3_024, y: 5_088, width: 320, height: 32 }
	],
	forestDecor: [
		{
			id: 'outskirts-tree-line-north',
			x: 4_480,
			y: 3_040,
			width: 2_200,
			height: 160,
			frameName: 'treeCluster'
		},
		{
			id: 'outskirts-tree-line-south',
			x: 4_480,
			y: 5_408,
			width: 2_200,
			height: 160,
			frameName: 'treeCluster'
		},
		{
			id: 'outskirts-brush-north-pocket',
			x: 4_160,
			y: 3_520,
			width: 640,
			height: 256,
			frameName: 'brush'
		},
		{
			id: 'outskirts-brush-south-pocket',
			x: 4_640,
			y: 4_928,
			width: 640,
			height: 256,
			frameName: 'brush'
		},
		{
			id: 'outskirts-brush-rejoin',
			x: 5_360,
			y: 4_240,
			width: 480,
			height: 256,
			frameName: 'brush'
		},
		{
			id: 'ruins-approach-brush',
			x: 5_520,
			y: 3_000,
			width: 256,
			height: 900,
			frameName: 'brush'
		}
	],
	combatBounds: [
		{
			id: 'city-west-combat-pocket',
			x: 4_160,
			y: 3_520,
			width: 704,
			height: 448,
			encounterIds: ['meadow-slime-west'],
			aggroRadius: 240,
			leashRadius: 420
		},
		{
			id: 'city-center-combat-pocket',
			x: 4_640,
			y: 4_928,
			width: 704,
			height: 448,
			encounterIds: ['meadow-slime-center'],
			aggroRadius: 240,
			leashRadius: 420
		},
		{
			id: 'city-east-combat-pocket',
			x: 5_520,
			y: 2_080,
			width: 640,
			height: 512,
			encounterIds: ['meadow-slime-east'],
			aggroRadius: 240,
			leashRadius: 420
		}
	],
	encounters: [
		{ id: 'meadow-slime-west', x: 4_160, y: 3_520, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-center', x: 4_640, y: 4_928, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-east', x: 5_680, y: 2_080, enemyId: 'slime-scout' }
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
			arrival: { x: 5_568, y: 960, facing: 'left' }
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
