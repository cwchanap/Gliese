import { point, rect, type LayoutPoint, type LayoutRect } from './layout-rects';

export interface LayoutArrival extends LayoutPoint {
	readonly facing: 'up' | 'down' | 'left' | 'right';
}

export interface VillageBuildingLayout {
	readonly landmarkId: string;
	readonly labelKey: string;
	readonly mapId?: string;
	readonly transitionId?: string;
	readonly lot: LayoutRect;
	readonly footprint: LayoutRect;
	readonly door: LayoutPoint;
	readonly approach: LayoutRect;
	readonly returnArrival?: LayoutArrival;
}

export interface VillageInteriorExterior {
	readonly footprint: LayoutRect;
	readonly door: LayoutPoint;
	readonly returnArrival: LayoutArrival;
}

export const MEADOW_ENTRY_V2_WORLD = rect(0, 0, 6400, 6400);

export interface MeadowEntryV2LandscapeRect {
	readonly id: string;
	readonly rect: LayoutRect;
}

export const MEADOW_ENTRY_V2_RIVER_SEGMENTS = [
	{ id: 'silverpine-headwater', rect: rect(3456, 256, 256, 1088) },
	{ id: 'silverpine-falls', rect: rect(3264, 1344, 448, 512) },
	{ id: 'north-river', rect: rect(3040, 1856, 320, 480) },
	{ id: 'central-river', rect: rect(2880, 2496, 480, 1056) },
	{ id: 'lower-river', rect: rect(2784, 3744, 480, 768) },
	{ id: 'river-delta', rect: rect(2816, 4736, 672, 512) },
	{ id: 'estuary-west', rect: rect(3008, 5248, 496, 896) },
	{ id: 'estuary-east', rect: rect(3712, 5248, 384, 896) }
] as const;

export const MEADOW_ENTRY_V2_CROSSINGS = {
	silverpineBridge: rect(2880, 2336, 1024, 160),
	mistfenBridge: rect(2368, 3552, 1536, 192),
	sundropBridge: rect(2496, 4512, 1248, 224),
	ferryApproach: rect(3504, 5248, 208, 896)
} as const;

export const MEADOW_ENTRY_V2_REGION_ENVELOPES = {
	mistfen: rect(384, 384, 2816, 3712),
	silverpine: rect(2432, 384, 2048, 2432),
	crossroads: rect(2880, 2816, 1728, 1952),
	wildwood: rect(4320, 256, 1824, 5312),
	tidewatchCoast: rect(3328, 4768, 2816, 1376),
	sundropVillage: rect(256, 3968, 2560, 2176)
} as const;

export type MeadowEntryV2RoutePatchOwner = 'paths' | 'mistfen' | 'silverpine' | 'wildwood';

export interface MeadowEntryV2RoutePatch {
	readonly id: string;
	readonly owner: MeadowEntryV2RoutePatchOwner;
	readonly rect: LayoutRect;
}

/**
 * Ordered top-left rectangles for the shared outdoor connectors and destination
 * seams. Region fragments consume only the records assigned to their owner;
 * keeping this inventory here prevents proof coordinates from drifting away
 * from the authored map geometry.
 */
export const MEADOW_ENTRY_V2_ROUTE_PATCHES = [
	{ id: 'village-west-main-street', owner: 'paths', rect: rect(256, 4608, 2240, 160) },
	{ id: 'village-river-crossing', owner: 'paths', rect: MEADOW_ENTRY_V2_CROSSINGS.sundropBridge },
	{ id: 'crossroads-south-approach', owner: 'paths', rect: rect(3360, 4448, 384, 320) },
	{ id: 'crossroads-to-mistfen', owner: 'paths', rect: MEADOW_ENTRY_V2_CROSSINGS.mistfenBridge },
	{
		id: 'crossroads-to-silverpine',
		owner: 'paths',
		rect: MEADOW_ENTRY_V2_CROSSINGS.silverpineBridge
	},
	{ id: 'silverpine-south-approach', owner: 'paths', rect: rect(3808, 2496, 192, 320) },
	{ id: 'crossroads-to-wildwood', owner: 'paths', rect: rect(4544, 3824, 448, 160) },
	{ id: 'crossroads-to-coast', owner: 'paths', rect: rect(4128, 4768, 192, 800) },
	{ id: 'mistfen-west-approach', owner: 'mistfen', rect: rect(2240, 3552, 128, 192) },
	{ id: 'silverpine-north-approach', owner: 'silverpine', rect: rect(2816, 2176, 192, 160) },
	{ id: 'wildwood-mouth', owner: 'wildwood', rect: rect(4896, 3776, 192, 384) }
] as const satisfies readonly MeadowEntryV2RoutePatch[];

export function meadowEntryV2RoutePatchesFor(
	owner: MeadowEntryV2RoutePatchOwner
): readonly MeadowEntryV2RoutePatch[] {
	return MEADOW_ENTRY_V2_ROUTE_PATCHES.filter((patch) => patch.owner === owner);
}

export const MEADOW_ENTRY_V2_ROUTES = {
	villageMainStreet: rect(256, 4608, 2560, 160),
	villageToCrossroads: MEADOW_ENTRY_V2_CROSSINGS.sundropBridge,
	crossroadsPlaza: rect(3360, 3456, 1184, 1312),
	crossroadsNorthTrunk: rect(3808, 2816, 192, 640),
	crossroadsToMistfen: MEADOW_ENTRY_V2_CROSSINGS.mistfenBridge,
	crossroadsToSilverpine: MEADOW_ENTRY_V2_CROSSINGS.silverpineBridge,
	crossroadsToWildwood: rect(4544, 3824, 448, 160),
	crossroadsToCoast: rect(4128, 4768, 192, 800)
} as const;

export const SUNDROP_VILLAGE_V2 = {
	origin: point(256, 3968),
	widthTiles: 80,
	heightTiles: 68,
	bounds: rect(256, 3968, 2560, 2176)
} as const;

export const SUNDROP_VILLAGE_V2_PUBLIC_SPACES = {
	mainStreet: rect(256, 4608, 2560, 160),
	westLane: rect(256, 4768, 128, 1248),
	eastLane: rect(2688, 4768, 128, 1248),
	southLane: rect(256, 5376, 2560, 128),
	southernMeadowLane: rect(256, 6016, 2560, 128),
	villageGreen: rect(1152, 4800, 704, 512),
	greenNorthStep: rect(1344, 4768, 320, 32),
	greenSouthStep: rect(1344, 5312, 320, 64),
	wellFootprint: rect(1408, 4960, 192, 192)
} as const;

export const SUNDROP_VILLAGE_V2_BUILDINGS = {
	villagerHouse1: {
		landmarkId: 'villager-house-1-exterior',
		labelKey: 'content.maps.landmarks.villager-house-1-exterior.label',
		mapId: 'villager-house-1',
		transitionId: 'meadow-to-villager-house-1',
		lot: rect(384, 4064, 576, 448),
		footprint: rect(544, 4096, 256, 288),
		door: point(672, 4384),
		approach: rect(608, 4384, 128, 224),
		returnArrival: { x: 672, y: 4448, facing: 'down' }
	},
	villagerHouse2: {
		landmarkId: 'villager-house-2-exterior',
		labelKey: 'content.maps.landmarks.villager-house-2-exterior.label',
		mapId: 'villager-house-2',
		transitionId: 'meadow-to-villager-house-2',
		lot: rect(1088, 4064, 576, 448),
		footprint: rect(1248, 4096, 256, 288),
		door: point(1376, 4384),
		approach: rect(1312, 4384, 128, 224),
		returnArrival: { x: 1376, y: 4448, facing: 'down' }
	},
	guildHall: {
		landmarkId: 'guild-hall-exterior',
		labelKey: 'content.maps.landmarks.guild-hall-exterior.label',
		mapId: 'guild-hall',
		transitionId: 'meadow-to-guild-hall',
		lot: rect(1888, 4032, 800, 480),
		footprint: rect(2048, 4032, 448, 384),
		door: point(2272, 4416),
		approach: rect(2208, 4416, 128, 192),
		returnArrival: { x: 2272, y: 4480, facing: 'down' }
	},
	itemShop: {
		landmarkId: 'item-shop-exterior',
		labelKey: 'content.maps.landmarks.item-shop-exterior.label',
		mapId: 'item-shop',
		transitionId: 'meadow-to-item-shop',
		lot: rect(384, 4832, 704, 448),
		footprint: rect(544, 4864, 320, 320),
		door: point(704, 5184),
		approach: rect(640, 5184, 128, 192),
		returnArrival: { x: 704, y: 5248, facing: 'down' }
	},
	blacksmith: {
		landmarkId: 'blacksmith',
		labelKey: 'content.maps.landmarks.blacksmith.label',
		mapId: 'blacksmith-interior',
		transitionId: 'meadow-to-blacksmith',
		lot: rect(1952, 4832, 736, 448),
		footprint: rect(2112, 4864, 320, 320),
		door: point(2272, 5184),
		approach: rect(2208, 5184, 128, 192),
		returnArrival: { x: 2272, y: 5248, facing: 'down' }
	},
	heroHouse: {
		landmarkId: 'hero-house-exterior',
		labelKey: 'content.maps.landmarks.hero-house-exterior.label',
		mapId: 'hero-house',
		transitionId: 'meadow-to-hero-house',
		lot: rect(384, 5536, 704, 416),
		footprint: rect(576, 5568, 256, 288),
		door: point(704, 5856),
		approach: rect(640, 5856, 128, 160),
		returnArrival: { x: 704, y: 5920, facing: 'down' }
	},
	villagerHouse3: {
		landmarkId: 'villager-house-3-exterior',
		labelKey: 'content.maps.landmarks.villager-house-3-exterior.label',
		mapId: 'villager-house-3',
		transitionId: 'meadow-to-villager-house-3',
		lot: rect(1184, 5536, 576, 416),
		footprint: rect(1344, 5568, 256, 288),
		door: point(1472, 5856),
		approach: rect(1408, 5856, 128, 160),
		returnArrival: { x: 1472, y: 5920, facing: 'down' }
	},
	shrine: {
		landmarkId: 'shrine-of-aurora',
		labelKey: 'content.maps.landmarks.shrine-of-aurora.label',
		mapId: 'shrine-of-aurora-interior',
		transitionId: 'meadow-to-shrine-of-aurora',
		lot: rect(1888, 5504, 800, 448),
		footprint: rect(2112, 5536, 320, 320),
		door: point(2272, 5856),
		approach: rect(2208, 5856, 128, 160),
		returnArrival: { x: 2272, y: 5920, facing: 'down' }
	}
} as const satisfies Record<string, VillageBuildingLayout>;

export const SUNDROP_VILLAGE_APPROACH_ROADS = {
	villagerHouse1: 'mainStreet',
	villagerHouse2: 'mainStreet',
	guildHall: 'mainStreet',
	itemShop: 'southLane',
	blacksmith: 'southLane',
	heroHouse: 'southernMeadowLane',
	villagerHouse3: 'southernMeadowLane',
	shrine: 'southernMeadowLane'
} as const;

function interiorExterior(building: VillageBuildingLayout): VillageInteriorExterior {
	if (!building.returnArrival) {
		throw new Error(`Interior building ${building.landmarkId} is missing a return arrival`);
	}
	return {
		footprint: building.footprint,
		door: building.door,
		returnArrival: building.returnArrival
	};
}

export const VILLAGE_INTERIOR_EXTERIORS = {
	'villager-house-1': interiorExterior(SUNDROP_VILLAGE_V2_BUILDINGS.villagerHouse1),
	'villager-house-2': interiorExterior(SUNDROP_VILLAGE_V2_BUILDINGS.villagerHouse2),
	'guild-hall': interiorExterior(SUNDROP_VILLAGE_V2_BUILDINGS.guildHall),
	'item-shop': interiorExterior(SUNDROP_VILLAGE_V2_BUILDINGS.itemShop),
	'blacksmith-interior': interiorExterior(SUNDROP_VILLAGE_V2_BUILDINGS.blacksmith),
	'hero-house': interiorExterior(SUNDROP_VILLAGE_V2_BUILDINGS.heroHouse),
	'villager-house-3': interiorExterior(SUNDROP_VILLAGE_V2_BUILDINGS.villagerHouse3),
	'shrine-of-aurora-interior': interiorExterior(SUNDROP_VILLAGE_V2_BUILDINGS.shrine)
} as const;
