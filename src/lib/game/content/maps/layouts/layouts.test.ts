import { describe, expect, it } from 'vitest';

import { getVillageBuildingFrameName, villageBuildingAsset } from '$lib/game/content/assets';
import {
	NPC_INTERACTION_RADIUS,
	NPC_PACK_COLLISION_RADIUS,
	PLAYER_COLLISION_RADIUS
} from '$lib/game/core/collision';
import { NORMALIZE_TRANSITION_RADIUS } from '$lib/game/save/save-state';
import {
	MEADOW_ENTRY_V2_CROSSINGS,
	MEADOW_ENTRY_V2_RIVER_SEGMENTS,
	MEADOW_ENTRY_V2_ROUTE_PATCHES,
	MEADOW_ENTRY_V2_ROUTES,
	MEADOW_ENTRY_V2_WORLD,
	SUNDROP_VILLAGE_APPROACH_ROADS,
	SUNDROP_VILLAGE_V2,
	SUNDROP_VILLAGE_V2_BUILDINGS,
	SUNDROP_VILLAGE_V2_PUBLIC_SPACES,
	VILLAGE_INTERIOR_EXTERIORS
} from './meadow-entry-v2';
import {
	expandedLayoutRectContainsPoint,
	layoutRectContainsPoint,
	rect,
	rectClearance,
	rectContains,
	rectsConnect,
	rectsOverlap
} from './layout-rects';
import { buildVillageInteriorNavigationSource } from '$lib/game/content/backgrounds/village-interior-package';
import { VILLAGE_INTERIOR_NAVIGATION_SOURCES } from '$lib/game/content/backgrounds/village-interior-navigation-sources';
import { compileNavigationGrid, isWalkable } from '$lib/game/core/navigation';
import { VILLAGE_INTERIOR_LAYOUTS, type VillageInteriorLayout } from './village-interiors-v2';

const EXPECTED_INTERIOR_PROGRAMS = {
	'guild-hall': {
		size: [32, 26],
		rooms: ['recordsHall', 'commonHall', 'guildMasterOffice', 'trainingHall', 'quartermasterRoom'],
		corridors: ['mainSpine', 'entranceLobby'],
		npcApproaches: ['guildMaster', 'quartermaster']
	},
	'hero-house': {
		size: [22, 18],
		rooms: ['bedroom', 'study', 'livingKitchen'],
		corridors: ['hall'],
		npcApproaches: []
	},
	'item-shop': {
		size: [26, 20],
		rooms: ['stockroom', 'office', 'salesFloor'],
		corridors: ['serviceCorridor', 'entranceAisle'],
		npcApproaches: ['mira']
	},
	'shrine-of-aurora-interior': {
		size: [24, 22],
		rooms: ['innerSanctum', 'westPreparation', 'eastArchive'],
		corridors: ['nave', 'entranceHall'],
		npcApproaches: []
	},
	'villager-house-1': {
		size: [20, 18],
		rooms: ['bedroom', 'storage', 'livingKitchen'],
		corridors: ['hall'],
		npcApproaches: ['lynn']
	},
	'villager-house-2': {
		size: [22, 18],
		rooms: ['workshop', 'bedroom', 'livingArea'],
		corridors: ['hall'],
		npcApproaches: ['toma']
	},
	'villager-house-3': {
		size: [20, 20],
		rooms: ['archiveStudy', 'bedroomStorage', 'sittingRoom'],
		corridors: ['hall'],
		npcApproaches: ['io']
	}
} as const;

const EXPECTED_GUILD_HALL_AMBIENT_ACTIVITY = {
	'guild-hall-member-west': { x: 160, y: 592 },
	'guild-hall-member-east': { x: 912, y: 368 }
} as const;

const EXPECTED_ITEM_SHOP_AMBIENT_ACTIVITY = {
	'item-shop-customer': { x: 256, y: 512 }
} as const;

function expectStructuralGrid(value: { x: number; y: number; width: number; height: number }) {
	for (const [name, number] of Object.entries({
		x: value.x,
		y: value.y,
		width: value.width,
		height: value.height
	})) {
		expect(number, name).toBeGreaterThanOrEqual(0);
		expect(number % 32, `${name}=${number}`).toBe(0);
	}
}

const APPROVED_HALF_TILE_DOORS = {
	'guild-hall:recordsToSpine': { x: 416, y: 144, width: 32, height: 96 },
	'guild-hall:masterToSpine': { x: 576, y: 112, width: 32, height: 96 },
	'item-shop:stockroom': { x: 320, y: 112, width: 32, height: 64 },
	'item-shop:office': { x: 480, y: 112, width: 32, height: 64 }
} as const;

const APPROVED_NON_GRID_WALLS = {
	'guild-hall:guild-hall-records-spine-north': { x: 416, y: 64, width: 32, height: 80 },
	'guild-hall:guild-hall-records-spine-south': { x: 416, y: 240, width: 32, height: 80 },
	'guild-hall:guild-hall-office-spine-north': { x: 576, y: 64, width: 32, height: 48 },
	'guild-hall:guild-hall-office-spine-south': { x: 576, y: 208, width: 32, height: 48 },
	'item-shop:item-shop-stockroom-divider-north': { x: 320, y: 64, width: 32, height: 48 },
	'item-shop:item-shop-stockroom-divider-south': { x: 320, y: 176, width: 32, height: 48 },
	'item-shop:item-shop-office-divider-north': { x: 480, y: 64, width: 32, height: 48 },
	'item-shop:item-shop-office-divider-south': { x: 480, y: 176, width: 32, height: 48 }
} as const;

const SHRINE_SERVICE_WALLS = [
	{
		id: 'shrine-of-aurora-west-mid-service-pocket',
		x: 64,
		y: 224,
		width: 160,
		height: 32
	},
	{
		id: 'shrine-of-aurora-east-mid-service-pocket',
		x: 544,
		y: 224,
		width: 160,
		height: 32
	},
	{
		id: 'shrine-of-aurora-west-entrance-service-pocket',
		x: 64,
		y: 576,
		width: 192,
		height: 96
	},
	{
		id: 'shrine-of-aurora-east-entrance-service-pocket',
		x: 512,
		y: 576,
		width: 192,
		height: 96
	}
] as const;

function interiorWalkableRects(layout: VillageInteriorLayout) {
	return [
		...Object.values(layout.rooms),
		...Object.values(layout.corridors),
		...Object.values(layout.doors)
	];
}

function isInteriorWalkable(layout: VillageInteriorLayout, candidate: { x: number; y: number }) {
	const authoredFloor = interiorWalkableRects(layout).some((value) =>
		layoutRectContainsPoint(value, candidate)
	);
	if (!authoredFloor) return false;
	if (
		layout.walls.some((wall) =>
			expandedLayoutRectContainsPoint(wall, candidate, PLAYER_COLLISION_RADIUS)
		)
	)
		return false;
	return !Object.values(layout.propCollisions).some((collision) =>
		expandedLayoutRectContainsPoint(collision, candidate, PLAYER_COLLISION_RADIUS)
	);
}

function reachableInteriorSamples(layout: VillageInteriorLayout) {
	const sampleStep = 8;
	const width = layout.widthTiles * 32;
	const height = layout.heightTiles * 32;
	const samples = new Map<string, { x: number; y: number }>();
	for (let y = sampleStep / 2; y < height; y += sampleStep) {
		for (let x = sampleStep / 2; x < width; x += sampleStep) {
			if (isInteriorWalkable(layout, { x, y })) samples.set(`${x}:${y}`, { x, y });
		}
	}

	const start = [...samples.values()].sort(
		(left, right) =>
			Math.hypot(left.x - layout.spawn.x, left.y - layout.spawn.y) -
			Math.hypot(right.x - layout.spawn.x, right.y - layout.spawn.y)
	)[0];
	expect(start, 'spawn must sit beside authored walkable geometry').toBeDefined();
	if (!start) return new Set<string>();
	expect(
		Math.hypot(start.x - layout.spawn.x, start.y - layout.spawn.y),
		'spawn root must be adjacent to the authored spawn'
	).toBeLessThanOrEqual(sampleStep);

	const reachable = new Set<string>([`${start.x}:${start.y}`]);
	const queue = [start];
	while (queue.length > 0) {
		const current = queue.shift()!;
		for (const neighbor of [
			{ x: current.x - sampleStep, y: current.y },
			{ x: current.x + sampleStep, y: current.y },
			{ x: current.x, y: current.y - sampleStep },
			{ x: current.x, y: current.y + sampleStep }
		]) {
			const key = `${neighbor.x}:${neighbor.y}`;
			if (!samples.has(key) || reachable.has(key)) continue;
			reachable.add(key);
			queue.push(neighbor);
		}
	}
	return reachable;
}

function reachableInteriorPoint(
	reachable: ReadonlySet<string>,
	candidate: { x: number; y: number },
	maxDistance = 8
) {
	return [...reachable].some((key) => {
		const [x, y] = key.split(':').map(Number);
		return Math.hypot(x - candidate.x, y - candidate.y) <= maxDistance;
	});
}

function normalizedInteriorSignature(layout: VillageInteriorLayout) {
	const width = layout.widthTiles * 32;
	const height = layout.heightTiles * 32;
	const normalize = (value: { x: number; y: number; width: number; height: number }) =>
		[value.x / width, value.y / height, value.width / width, value.height / height]
			.map((number) => number.toFixed(6))
			.join(',');
	return JSON.stringify({
		rooms: Object.values(layout.rooms).map(normalize).sort(),
		walls: layout.walls.map(normalize).sort()
	});
}

describe('outdoor layout coordinate contracts', () => {
	it('keeps the world and enlarged village bounds stable', () => {
		expect(MEADOW_ENTRY_V2_WORLD).toEqual({ x: 0, y: 0, width: 6400, height: 6400 });
		expect(SUNDROP_VILLAGE_V2).toMatchObject({
			origin: { x: 256, y: 3968 },
			widthTiles: 80,
			heightTiles: 68,
			bounds: { x: 256, y: 3968, width: 2560, height: 2176 }
		});
		expect((2560 * 2176) / (1792 * 1536)).toBeGreaterThanOrEqual(2);
	});

	it('pins the exact Meadow watershed and crossing rectangles', () => {
		expect(MEADOW_ENTRY_V2_RIVER_SEGMENTS).toEqual([
			{ id: 'silverpine-headwater', rect: rect(3456, 256, 256, 1088) },
			{ id: 'silverpine-falls', rect: rect(3264, 1344, 448, 512) },
			{ id: 'north-river', rect: rect(3040, 1856, 320, 480) },
			{ id: 'central-river', rect: rect(2880, 2496, 480, 1056) },
			{ id: 'lower-river', rect: rect(2784, 3744, 480, 768) },
			{ id: 'river-delta', rect: rect(2816, 4736, 672, 512) },
			{ id: 'estuary-west', rect: rect(3008, 5248, 496, 896) },
			{ id: 'estuary-east', rect: rect(3712, 5248, 384, 896) }
		]);
		expect(MEADOW_ENTRY_V2_CROSSINGS).toEqual({
			silverpineBridge: rect(2880, 2336, 1024, 160),
			mistfenBridge: rect(2368, 3552, 1536, 192),
			sundropBridge: rect(2496, 4512, 1248, 224),
			ferryApproach: rect(3504, 5248, 208, 896)
		});

		for (const { rect: bounds } of MEADOW_ENTRY_V2_RIVER_SEGMENTS) {
			expect(rectContains(MEADOW_ENTRY_V2_WORLD, bounds)).toBe(true);
		}
		for (const bounds of Object.values(MEADOW_ENTRY_V2_CROSSINGS)) {
			expect(rectContains(MEADOW_ENTRY_V2_WORLD, bounds)).toBe(true);
		}

		expect(MEADOW_ENTRY_V2_CROSSINGS.silverpineBridge.height).toBe(160);
		expect(MEADOW_ENTRY_V2_CROSSINGS.mistfenBridge.height).toBe(192);
		expect(MEADOW_ENTRY_V2_CROSSINGS.sundropBridge.height).toBe(224);
		expect(MEADOW_ENTRY_V2_CROSSINGS.ferryApproach.width).toBe(208);
		expect(
			3600 >= MEADOW_ENTRY_V2_CROSSINGS.ferryApproach.x &&
				3600 <=
					MEADOW_ENTRY_V2_CROSSINGS.ferryApproach.x + MEADOW_ENTRY_V2_CROSSINGS.ferryApproach.width
		).toBe(true);
	});

	it('keeps footprints inside non-overlapping lots with 96 px clearance', () => {
		const buildings = Object.values(SUNDROP_VILLAGE_V2_BUILDINGS);
		for (const building of buildings) {
			expectStructuralGrid(building.lot);
			expectStructuralGrid(building.footprint);
			expectStructuralGrid(building.approach);
			expect(rectContains(SUNDROP_VILLAGE_V2.bounds, building.lot)).toBe(true);
			expect(rectContains(building.lot, building.footprint)).toBe(true);
			expect(rectContains(SUNDROP_VILLAGE_V2.bounds, building.approach)).toBe(true);
		}
		for (let left = 0; left < buildings.length; left += 1) {
			for (let right = left + 1; right < buildings.length; right += 1) {
				expect(rectsOverlap(buildings[left]!.lot, buildings[right]!.lot)).toBe(false);
				expect(
					rectClearance(buildings[left]!.footprint, buildings[right]!.footprint)
				).toBeGreaterThanOrEqual(96);
			}
		}
	});

	it('keeps building display rectangles within five percent of native frame aspect', () => {
		for (const building of Object.values(SUNDROP_VILLAGE_V2_BUILDINGS)) {
			const frameName = getVillageBuildingFrameName(building.landmarkId);
			expect(frameName, building.landmarkId).toBeDefined();
			const frame = villageBuildingAsset.frames[frameName!];
			const nativeAspect = frame.w / frame.h;
			const displayAspect = building.footprint.width / building.footprint.height;
			expect(Math.abs(displayAspect / nativeAspect - 1), building.landmarkId).toBeLessThanOrEqual(
				0.05
			);
		}
	});

	it('connects every approach to a named road without accepting corner-only contact', () => {
		for (const [buildingKey, roadKey] of Object.entries(SUNDROP_VILLAGE_APPROACH_ROADS)) {
			const building =
				SUNDROP_VILLAGE_V2_BUILDINGS[buildingKey as keyof typeof SUNDROP_VILLAGE_V2_BUILDINGS];
			const road =
				SUNDROP_VILLAGE_V2_PUBLIC_SPACES[roadKey as keyof typeof SUNDROP_VILLAGE_V2_PUBLIC_SPACES];
			expect(rectsConnect(building.approach, road), buildingKey).toBe(true);
		}
		expect(rectsConnect(rect(0, 0, 32, 32), rect(32, 32, 32, 32))).toBe(false);
	});

	it('runs both side lanes through all three road bands', () => {
		const { mainStreet, southLane, southernMeadowLane, westLane, eastLane } =
			SUNDROP_VILLAGE_V2_PUBLIC_SPACES;
		for (const lane of [westLane, eastLane]) {
			expect(lane.y).toBe(mainStreet.y + mainStreet.height);
			expect(lane.y + lane.height).toBe(southernMeadowLane.y);
			expect(rectsConnect(lane, mainStreet)).toBe(true);
			expect(rectsConnect(lane, southLane)).toBe(true);
			expect(rectsConnect(lane, southernMeadowLane)).toBe(true);
		}
	});

	it('connects the village, Crossroads, and all four destination mouths', () => {
		const routes = MEADOW_ENTRY_V2_ROUTES;
		expect(rectsConnect(routes.villageMainStreet, routes.villageToCrossroads)).toBe(true);
		expect(rectsConnect(routes.crossroadsPlaza, routes.crossroadsNorthTrunk)).toBe(true);
		expect(rectsConnect(routes.villageToCrossroads, routes.crossroadsPlaza)).toBe(true);
		expect(rectsConnect(routes.crossroadsPlaza, routes.crossroadsToMistfen)).toBe(true);
		const silverpineSouthApproach = MEADOW_ENTRY_V2_ROUTE_PATCHES.find(
			(patch) => patch.id === 'silverpine-south-approach'
		)?.rect;
		expect(silverpineSouthApproach).toBeDefined();
		expect(rectsConnect(routes.crossroadsNorthTrunk, silverpineSouthApproach!)).toBe(true);
		expect(rectsConnect(silverpineSouthApproach!, routes.crossroadsToSilverpine)).toBe(true);
		expect(rectsConnect(routes.crossroadsPlaza, routes.crossroadsToWildwood)).toBe(true);
		expect(rectsConnect(routes.crossroadsPlaza, routes.crossroadsToCoast)).toBe(true);
	});

	it('keeps the ordered semantic route/seam source registry exact', () => {
		expect(MEADOW_ENTRY_V2_ROUTE_PATCHES).toEqual([
			{
				id: 'village-west-main-street',
				owner: 'paths',
				rect: { x: 256, y: 4608, width: 2240, height: 160 }
			},
			{
				id: 'village-river-crossing',
				owner: 'paths',
				rect: { x: 2496, y: 4512, width: 1248, height: 224 }
			},
			{
				id: 'crossroads-south-approach',
				owner: 'paths',
				rect: { x: 3360, y: 4448, width: 384, height: 320 }
			},
			{
				id: 'crossroads-to-mistfen',
				owner: 'paths',
				rect: { x: 2368, y: 3552, width: 1536, height: 192 }
			},
			{
				id: 'crossroads-to-silverpine',
				owner: 'paths',
				rect: { x: 2880, y: 2336, width: 1024, height: 160 }
			},
			{
				id: 'silverpine-south-approach',
				owner: 'paths',
				rect: { x: 3808, y: 2496, width: 192, height: 320 }
			},
			{
				id: 'crossroads-to-wildwood',
				owner: 'paths',
				rect: { x: 4544, y: 3824, width: 448, height: 160 }
			},
			{
				id: 'crossroads-to-coast',
				owner: 'paths',
				rect: { x: 4128, y: 4768, width: 192, height: 800 }
			},
			{
				id: 'mistfen-west-approach',
				owner: 'mistfen',
				rect: { x: 2240, y: 3552, width: 128, height: 192 }
			},
			{
				id: 'silverpine-north-approach',
				owner: 'silverpine',
				rect: { x: 2816, y: 2176, width: 192, height: 160 }
			},
			{
				id: 'wildwood-mouth',
				owner: 'wildwood',
				rect: { x: 4896, y: 3776, width: 192, height: 384 }
			}
		]);
	});

	it('keeps every return outside its footprint and beyond the re-trigger envelope', () => {
		const triggerClearance = PLAYER_COLLISION_RADIUS + NORMALIZE_TRANSITION_RADIUS;
		for (const exterior of Object.values(VILLAGE_INTERIOR_EXTERIORS)) {
			expect(layoutRectContainsPoint(exterior.footprint, exterior.returnArrival)).toBe(false);
			expect(
				Math.hypot(
					exterior.returnArrival.x - exterior.door.x,
					exterior.returnArrival.y - exterior.door.y
				)
			).toBeGreaterThan(triggerClearance);
		}
	});
});

describe('village interior layout coordinate contracts', () => {
	it('pins the Guild Hall civic program, anchors, circulation, and camera envelope', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
		expect([layout.widthTiles, layout.heightTiles]).toEqual([32, 26]);
		expect(Object.keys(layout.rooms)).toEqual([
			'recordsHall',
			'commonHall',
			'guildMasterOffice',
			'trainingHall',
			'quartermasterRoom'
		]);
		expect(Object.keys(layout.corridors)).toEqual(['mainSpine', 'entranceLobby']);
		expect(Object.keys(layout.doors)).toEqual([
			'recordsToSpine',
			'commonToSpine',
			'masterToSpine',
			'trainingToSpine',
			'quartermasterToSpine',
			'exterior'
		]);
		expect(Object.keys(layout.propZones)).toEqual([
			'recordsShelves',
			'questBoardRecordsDesk',
			'commonTableSeating',
			'guildMasterStation',
			'trainingEquipment',
			'quartermasterStation',
			'lobbyNoticeBenches'
		]);
		expect(Object.keys(layout.propCollisions)).toEqual([
			'recordsShelves',
			'questBoardRecordsDesk',
			'commonTableSeating',
			'guildMasterDesk',
			'trainingEquipment',
			'quartermasterCounter'
		]);
		expect(layout.propCollisions).toEqual({
			recordsShelves: { x: 80, y: 80, width: 112, height: 176 },
			questBoardRecordsDesk: { x: 240, y: 144, width: 128, height: 32 },
			commonTableSeating: { x: 176, y: 448, width: 128, height: 64 },
			guildMasterDesk: { x: 728, y: 160, width: 144, height: 8 },
			trainingEquipment: { x: 752, y: 368, width: 96, height: 32 },
			quartermasterCounter: { x: 696, y: 544, width: 176, height: 8 }
		});
		for (const [collisionId, collision] of Object.entries(layout.propCollisions)) {
			const propZone = layout.propZones[collisionId as keyof typeof layout.propZones];
			if (propZone)
				expect(rectContains(propZone, collision), `${collisionId} escapes its prop zone`).toBe(
					true
				);
		}
		expect(layout.corridors.mainSpine.width).toBeGreaterThanOrEqual(96);
		expect(layout.corridors.entranceLobby.width).toBeGreaterThanOrEqual(96);
		expect(layout.corridors.entranceLobby.height).toBeGreaterThanOrEqual(96);
		expect(layout.rooms.trainingHall.width).toBeGreaterThanOrEqual(96);
		for (const [doorId, door] of Object.entries(layout.doors)) {
			expect(Math.max(door.width, door.height), doorId).toBeGreaterThanOrEqual(64);
		}

		expect(layout.spawn).toEqual({ x: 512, y: 736 });
		expect(layout.exit).toEqual({ x: 512, y: 816 });
		expect(layout.fullFloor).toEqual({ x: 0, y: 0, width: 1024, height: 832 });
		expect({
			horizontalScrollPx: layout.fullFloor.width - 640,
			verticalScrollPx: layout.fullFloor.height - 360
		}).toEqual({ horizontalScrollPx: 384, verticalScrollPx: 472 });

		expect(layout.ambientActivity).toEqual(EXPECTED_GUILD_HALL_AMBIENT_ACTIVITY);
		for (const [id, point] of Object.entries(layout.ambientActivity ?? {})) {
			expect(
				layoutRectContainsPoint(layout.rooms.commonHall, point) ||
					layoutRectContainsPoint(layout.rooms.trainingHall, point),
				id
			).toBe(true);
			expect(isInteriorWalkable(layout, point), `${id} activity position is not walkable`).toBe(
				true
			);
			for (const zone of Object.values(layout.propZones)) {
				expect(layoutRectContainsPoint(zone, point), `${id} overlaps ${zone}`).toBe(false);
			}
		}

		const reachable = reachableInteriorSamples(layout);
		for (const [label, point] of [
			['records', { x: 240, y: 240 }],
			['common', { x: 160, y: 592 }],
			['guild-master-approach', layout.npcApproaches.guildMaster.approach],
			['training', { x: 912, y: 368 }],
			['quartermaster-approach', layout.npcApproaches.quartermaster.approach],
			['spawn', layout.spawn],
			['exit', layout.exit]
		] as const) {
			expect(reachableInteriorPoint(reachable, point), `${label} is disconnected`).toBe(true);
		}
		expect(
			expandedLayoutRectContainsPoint(layout.propCollisions.guildMasterDesk, { x: 800, y: 164 }, 0)
		).toBe(true);
		expect(
			expandedLayoutRectContainsPoint(
				layout.propCollisions.quartermasterCounter,
				{ x: 784, y: 548 },
				0
			)
		).toBe(true);
	});

	it('pins the Hero House Gate 1 program and its layout-derived navigation source', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['hero-house'];
		expect([layout.widthTiles, layout.heightTiles]).toEqual([22, 18]);
		expect(Object.keys(layout.rooms)).toEqual(['bedroom', 'study', 'livingKitchen']);
		expect(Object.keys(layout.corridors)).toEqual(['hall']);
		expect(layout.corridors.hall.width).toBeGreaterThanOrEqual(96);
		expect(
			Object.values(layout.doors).every((door) => Math.max(door.width, door.height) >= 64)
		).toBe(true);

		const reachable = reachableInteriorSamples(layout);
		for (const [label, point] of [
			['bedroom', { x: 232, y: 160 }],
			['study', { x: 472, y: 160 }],
			['living-kitchen', { x: 400, y: 480 }]
		] as const) {
			expect(reachableInteriorPoint(reachable, point), `${label} is disconnected`).toBe(true);
		}
		expect(layout.propCollisions).toEqual({
			bed: { x: 112, y: 112, width: 96, height: 96 },
			studyStorage: { x: 496, y: 112, width: 112, height: 96 },
			livingTable: { x: 224, y: 400, width: 112, height: 64 },
			kitchenStorage: { x: 464, y: 320, width: 160, height: 144 }
		});
		expect(reachableInteriorPoint(reachable, layout.spawn), 'spawn is disconnected').toBe(true);
		expect(reachableInteriorPoint(reachable, layout.exit), 'exit is disconnected').toBe(true);
		expect(layout.fullFloor.width - 640).toBeGreaterThanOrEqual(64);
		expect(layout.fullFloor.height - 360).toBeGreaterThanOrEqual(192);

		const source = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
			(value) => value.mapId === 'hero-house'
		);
		expect(source).toBeDefined();
		expect(source).toMatchObject({
			id: 'hero-house-navigation',
			cellSizePx: 16,
			widthCells: 44,
			heightCells: 36,
			clearancePx: 12
		});
		expect(source?.rows).toEqual(
			buildVillageInteriorNavigationSource({ mapId: 'hero-house', layout }).rows
		);
	});

	it('pins the Item Shop Gate 1 program, anchors, circulation, and camera envelope', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
		expect([layout.widthTiles, layout.heightTiles]).toEqual([26, 20]);
		expect(Object.keys(layout.rooms)).toEqual(['stockroom', 'office', 'salesFloor']);
		expect(Object.keys(layout.corridors)).toEqual(['serviceCorridor', 'entranceAisle']);
		expect(Object.keys(layout.doors)).toEqual([
			'stockroom',
			'office',
			'serviceToSales',
			'exterior'
		]);
		expect(Object.keys(layout.propZones)).toEqual([
			'counter',
			'westDisplay',
			'eastDisplay',
			'stockShelves',
			'officeDesk'
		]);
		expect(Object.keys(layout.propCollisions)).toEqual([
			'miraCounter',
			'westDisplay',
			'eastDisplay',
			'stockShelves',
			'officeDesk'
		]);
		expect(layout.propZones).toEqual({
			counter: { x: 224, y: 288, width: 384, height: 64 },
			westDisplay: { x: 128, y: 384, width: 96, height: 128 },
			eastDisplay: { x: 608, y: 384, width: 96, height: 128 },
			stockShelves: { x: 96, y: 96, width: 192, height: 96 },
			officeDesk: { x: 544, y: 96, width: 192, height: 96 }
		});
		expect(layout.propCollisions).toEqual({
			miraCounter: { x: 224, y: 336, width: 384, height: 8 },
			westDisplay: { x: 144, y: 384, width: 64, height: 128 },
			eastDisplay: { x: 624, y: 384, width: 64, height: 128 },
			stockShelves: { x: 128, y: 112, width: 128, height: 48 },
			officeDesk: { x: 576, y: 112, width: 128, height: 48 }
		});
		expect(layout.rooms.salesFloor.width).toBeGreaterThanOrEqual(96);
		expect(layout.corridors.serviceCorridor.width).toBeGreaterThanOrEqual(96);
		expect(layout.corridors.serviceCorridor.height).toBeGreaterThanOrEqual(96);
		for (const [doorId, door] of Object.entries(layout.doors)) {
			expect(Math.max(door.width, door.height), doorId).toBeGreaterThanOrEqual(64);
		}

		expect(layout.spawn).toEqual({ x: 416, y: 544 });
		expect(layout.exit).toEqual({ x: 416, y: 624 });
		expect(layout.fullFloor).toEqual({ x: 0, y: 0, width: 832, height: 640 });
		expect({
			horizontalScrollPx: layout.fullFloor.width - 640,
			verticalScrollPx: layout.fullFloor.height - 360
		}).toEqual({ horizontalScrollPx: 192, verticalScrollPx: 280 });
		const camera = {
			left: Math.max(0, Math.min(layout.spawn.x - 320, layout.fullFloor.width - 640)),
			top: Math.max(0, Math.min(layout.spawn.y - 180, layout.fullFloor.height - 360)),
			width: 640,
			height: 360
		};
		expect(camera).toEqual({ left: 96, top: 280, width: 640, height: 360 });
		for (const [label, point] of [
			['mira', layout.npcApproaches.mira.npc],
			['mira-approach', layout.npcApproaches.mira.approach],
			['counter', { x: 416, y: 320 }],
			['west-display', { x: 144, y: 448 }],
			['east-display', { x: 688, y: 448 }],
			['entrance', { x: 416, y: 560 }],
			['exit', layout.exit]
		] as const) {
			expect(
				point.x >= camera.left &&
					point.x <= camera.left + camera.width &&
					point.y >= camera.top &&
					point.y <= camera.top + camera.height,
				`${label} is outside the initial camera envelope`
			).toBe(true);
		}

		expect(layout.ambientActivity).toEqual(EXPECTED_ITEM_SHOP_AMBIENT_ACTIVITY);
		const reachable = reachableInteriorSamples(layout);
		for (const [label, candidate] of [
			['stockroom', { x: 288, y: 192 }],
			['office', { x: 736, y: 192 }],
			['sales-floor', { x: 416, y: 480 }],
			['west-display', { x: 240, y: 448 }],
			['east-display', { x: 592, y: 448 }],
			['ambient-customer', EXPECTED_ITEM_SHOP_AMBIENT_ACTIVITY['item-shop-customer']],
			['mira-approach', layout.npcApproaches.mira.approach],
			['spawn', layout.spawn],
			['exit', layout.exit]
		] as const) {
			expect(reachableInteriorPoint(reachable, candidate), `${label} is disconnected`).toBe(true);
		}
		expect(layout.npcApproaches.mira).toEqual({
			npc: { x: 416, y: 320 },
			approach: { x: 416, y: 360 }
		});
	});

	it('aligns painted display collision with outward approaches and side circulation', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
		const source = buildVillageInteriorNavigationSource({ mapId: 'item-shop', layout });
		const grid = compileNavigationGrid(source);
		const oldApproaches = [
			['west-display', { x: 208, y: 448 }, layout.propZones.westDisplay],
			['east-display', { x: 624, y: 448 }, layout.propZones.eastDisplay]
		] as const;
		for (const [label, point, zone] of oldApproaches) {
			expect(
				expandedLayoutRectContainsPoint(zone, point, PLAYER_COLLISION_RADIUS),
				`${label} old approach must be inside the painted display envelope`
			).toBe(true);
			expect(isWalkable(grid, point.x, point.y), `${label} old approach must be blocked`).toBe(
				false
			);
		}

		for (const [label, point] of [
			['west-display-approach', { x: 240, y: 448 }],
			['east-display-approach', { x: 592, y: 448 }]
		] as const) {
			expect(isWalkable(grid, point.x, point.y), `${label} must remain walkable`).toBe(true);
		}
		for (const [label, point] of [
			['west-display-core', { x: 168, y: 448 }],
			['east-display-core', { x: 648, y: 448 }]
		] as const) {
			expect(isWalkable(grid, point.x, point.y), `${label} must be blocked`).toBe(false);
		}

		expect(
			layout.propZones.westDisplay.x - layout.rooms.salesFloor.x,
			'west display side circulation'
		).toBeGreaterThanOrEqual(64);
		expect(
			layout.rooms.salesFloor.x +
				layout.rooms.salesFloor.width -
				(layout.propZones.eastDisplay.x + layout.propZones.eastDisplay.width),
			'east display side circulation'
		).toBeGreaterThanOrEqual(64);
	});

	it('keeps both upper service rooms open below their shelving and desk', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
		const source = buildVillageInteriorNavigationSource({ mapId: 'item-shop', layout });
		const grid = compileNavigationGrid(source);
		for (const [roomId, collisionId, dividerId, sampleX] of [
			['stockroom', 'stockShelves', 'item-shop-stockroom-sales-divider', 192],
			['office', 'officeDesk', 'item-shop-office-sales-divider', 624]
		] as const) {
			const collision = layout.propCollisions[collisionId];
			const divider = layout.walls.find((wall) => wall.id === dividerId);
			expect(divider, `${roomId} sales divider is missing`).toBeDefined();
			if (!divider) return;
			expect(
				divider.y - (collision.y + collision.height),
				`${roomId} raw service clearance`
			).toBeGreaterThanOrEqual(64);
			expect(
				[176, 192].every((y) => isWalkable(grid, sampleX, y)),
				`${roomId} must retain a two-row player-centre service band`
			).toBe(true);
		}
	});

	it('keeps both upper service-room door turns open across a two-column player-centre band', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
		const source = buildVillageInteriorNavigationSource({ mapId: 'item-shop', layout });
		const grid = compileNavigationGrid(source);
		for (const [roomId, collisionId, dividerId, side, columns] of [
			['stockroom', 'stockShelves', 'item-shop-stockroom-divider-south', 'right', [272, 288]],
			['office', 'officeDesk', 'item-shop-office-divider-south', 'left', [528, 544]]
		] as const) {
			const collision = layout.propCollisions[collisionId];
			const divider = layout.walls.find((wall) => wall.id === dividerId);
			expect(divider, `${roomId} door divider is missing`).toBeDefined();
			if (!divider) return;
			const rawDoorSideClearance =
				side === 'right'
					? divider.x - (collision.x + collision.width)
					: collision.x - (divider.x + divider.width);
			expect(rawDoorSideClearance, `${roomId} raw door-side clearance`).toBeGreaterThanOrEqual(64);
			expect(
				[144, 192].every((y) => columns.every((x) => isWalkable(grid, x, y))),
				`${roomId} must retain two walkable player-centre columns through the turn`
			).toBe(true);
		}
	});

	it('seals every Shrine service pocket with an explicit inert wall', () => {
		const shrine = VILLAGE_INTERIOR_LAYOUTS['shrine-of-aurora-interior'];
		for (const wall of SHRINE_SERVICE_WALLS) {
			expect(shrine.walls).toContainEqual(wall);
		}
	});

	it('keeps every interior rectangle in bounds and every approach clear', () => {
		const minimumApproach = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
		const maximumApproach = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;

		for (const [mapId, layout] of Object.entries(VILLAGE_INTERIOR_LAYOUTS)) {
			const bounds = rect(0, 0, layout.widthTiles * 32, layout.heightTiles * 32);
			expect(layout.fullFloor).toEqual(bounds);
			for (const value of Object.values(layout.rooms))
				expect(rectContains(bounds, value)).toBe(true);
			for (const value of Object.values(layout.corridors))
				expect(rectContains(bounds, value)).toBe(true);
			for (const value of Object.values(layout.doors))
				expect(rectContains(bounds, value)).toBe(true);
			for (const value of Object.values(layout.propZones))
				expect(rectContains(bounds, value)).toBe(true);
			for (const value of Object.values(layout.propCollisions))
				expect(rectContains(bounds, value)).toBe(true);
			for (const wall of layout.walls) expect(rectContains(bounds, wall)).toBe(true);

			for (const group of [layout.rooms, layout.corridors]) {
				for (const value of Object.values(group)) expectStructuralGrid(value);
			}
			for (const [doorId, value] of Object.entries(layout.doors)) {
				const approvedDoor =
					APPROVED_HALF_TILE_DOORS[`${mapId}:${doorId}` as keyof typeof APPROVED_HALF_TILE_DOORS];
				if (approvedDoor) {
					expect(value).toEqual(approvedDoor);
				} else {
					expectStructuralGrid(value);
				}
			}
			for (const wall of layout.walls) {
				const approvedWall =
					APPROVED_NON_GRID_WALLS[`${mapId}:${wall.id}` as keyof typeof APPROVED_NON_GRID_WALLS];
				if (approvedWall) {
					expect(wall).toMatchObject(approvedWall);
				} else {
					expectStructuralGrid(wall);
				}
			}

			for (const opening of Object.values(layout.doors)) {
				for (const wall of layout.walls) {
					expect(rectsOverlap(wall, opening), `${wall.id} overlaps a door`).toBe(false);
				}
			}

			for (const anchor of [layout.spawn, layout.exit]) {
				expect(layoutRectContainsPoint(bounds, anchor)).toBe(true);
				for (const wall of layout.walls) {
					expect(
						expandedLayoutRectContainsPoint(wall, anchor, PLAYER_COLLISION_RADIUS),
						`anchor (${anchor.x},${anchor.y}) is embedded in ${wall.id}`
					).toBe(false);
				}
				for (const collision of Object.values(layout.propCollisions)) {
					expect(
						expandedLayoutRectContainsPoint(collision, anchor, PLAYER_COLLISION_RADIUS),
						`anchor (${anchor.x},${anchor.y}) is embedded in a prop collision`
					).toBe(false);
				}
			}

			for (const { npc, approach } of Object.values(layout.npcApproaches)) {
				const distance = Math.hypot(npc.x - approach.x, npc.y - approach.y);
				expect(distance).toBeGreaterThanOrEqual(minimumApproach);
				expect(distance).toBeLessThanOrEqual(maximumApproach);
				for (const zone of Object.values(layout.propZones)) {
					expect(layoutRectContainsPoint(zone, approach)).toBe(false);
				}
				for (const collision of Object.values(layout.propCollisions)) {
					expect(expandedLayoutRectContainsPoint(collision, npc, PLAYER_COLLISION_RADIUS)).toBe(
						false
					);
					expect(
						expandedLayoutRectContainsPoint(collision, approach, PLAYER_COLLISION_RADIUS)
					).toBe(false);
				}
				expect(isInteriorWalkable(layout, npc), `${mapId} NPC is not wall/prop clear`).toBe(true);
				expect(
					isInteriorWalkable(layout, approach),
					`${mapId} approach is not authored-walkable`
				).toBe(true);
			}

			const reachable = reachableInteriorSamples(layout);
			for (const [npcId, { approach }] of Object.entries(layout.npcApproaches)) {
				expect(
					reachableInteriorPoint(reachable, approach),
					`${mapId}:${npcId} approach is disconnected from the spawn root`
				).toBe(true);
			}
			for (const [roomId, room] of Object.entries(layout.rooms)) {
				const roomReachable = [...reachable].some((key) => {
					const [x, y] = key.split(':').map(Number);
					return layoutRectContainsPoint(room, { x, y });
				});
				expect(roomReachable, `${roomId} is disconnected from the entrance`).toBe(true);
			}
			const exitReachable = [...reachable].some((key) => {
				const [x, y] = key.split(':').map(Number);
				return Math.hypot(x - layout.exit.x, y - layout.exit.y) <= 8;
			});
			expect(exitReachable, `${mapId} exit is disconnected from the entrance`).toBe(true);
		}
	});

	it('keeps Guild Hall service counters clear of their named NPC approaches', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
		const reachable = reachableInteriorSamples(layout);
		const serviceSamples = [
			{
				collision: layout.propCollisions.guildMasterDesk,
				center: { x: 784, y: 160 },
				approach: layout.npcApproaches.guildMaster.approach
			},
			{
				collision: layout.propCollisions.quartermasterCounter,
				center: { x: 784, y: 560 },
				approach: layout.npcApproaches.quartermaster.approach
			}
		];
		for (const { collision, center, approach } of serviceSamples) {
			expect(expandedLayoutRectContainsPoint(collision, center, PLAYER_COLLISION_RADIUS)).toBe(
				true
			);
			expect(isInteriorWalkable(layout, approach)).toBe(true);
			expect(reachableInteriorPoint(reachable, approach)).toBe(true);
		}
	});

	it('freezes the seven current room programs and their composed-collision routes', () => {
		for (const [mapId, expected] of Object.entries(EXPECTED_INTERIOR_PROGRAMS)) {
			const layout = VILLAGE_INTERIOR_LAYOUTS[mapId as keyof typeof VILLAGE_INTERIOR_LAYOUTS];
			expect([layout.widthTiles, layout.heightTiles], `${mapId}:size`).toEqual(expected.size);
			expect(Object.keys(layout.rooms), `${mapId}:rooms`).toEqual(expected.rooms);
			expect(Object.keys(layout.corridors), `${mapId}:corridors`).toEqual(expected.corridors);
			expect(Object.keys(layout.npcApproaches), `${mapId}:npcApproaches`).toEqual(
				expected.npcApproaches
			);

			const reachable = reachableInteriorSamples(layout);
			const roomSamples = Object.entries(layout.rooms).flatMap(([roomId, room]) => {
				const reachablePoints = [...reachable].map((key) => {
					const [x, y] = key.split(':').map(Number);
					return { x, y };
				});
				const point = reachablePoints
					.filter((candidate) => layoutRectContainsPoint(room, candidate))
					.sort(
						(left, right) =>
							Math.hypot(left.x - (room.x + room.width / 2), left.y - (room.y + room.height / 2)) -
							Math.hypot(right.x - (room.x + room.width / 2), right.y - (room.y + room.height / 2))
					)[0];
				return point ? [{ label: `room:${roomId}:reachable-sample`, point }] : [];
			});
			const samples = [
				{ label: 'spawn', point: layout.spawn },
				{ label: 'exit', point: layout.exit },
				...roomSamples,
				...Object.entries(layout.doors).map(([doorId, door]) => ({
					label: `door:${doorId}`,
					point: { x: door.x + door.width / 2, y: door.y + door.height / 2 }
				})),
				...Object.entries(layout.npcApproaches).map(([npcId, approach]) => ({
					label: `npc:${npcId}`,
					point: approach.approach
				}))
			];

			for (const { label, point } of samples) {
				expect(
					reachableInteriorPoint(reachable, point),
					`${mapId}:${label} is disconnected under authored walls and prop collision`
				).toBe(true);
			}
		}
	});

	it('derives continuous 16px raw and player-centre grids with approved route widths', () => {
		for (const [mapId, layout] of Object.entries(VILLAGE_INTERIOR_LAYOUTS)) {
			const source = buildVillageInteriorNavigationSource({
				mapId: mapId as keyof typeof VILLAGE_INTERIOR_LAYOUTS,
				layout
			});
			const grid = compileNavigationGrid(source);
			expect(source.rows).toHaveLength(layout.heightTiles * 2);
			expect(source.rows.every((row) => row.length === layout.widthTiles * 2)).toBe(true);
			expect(source.rows.some((row) => row.includes('#'))).toBe(true);
			expect(isWalkable(grid, layout.spawn.x, layout.spawn.y), `${mapId}:spawn`).toBe(true);
			expect(isWalkable(grid, layout.exit.x, layout.exit.y), `${mapId}:exit`).toBe(true);
			for (const [doorId, door] of Object.entries(layout.doors)) {
				expect(Math.max(door.width, door.height), `${mapId}:${doorId}`).toBeGreaterThanOrEqual(64);
				expect(isWalkable(grid, door.x + door.width / 2, door.y + door.height / 2)).toBe(true);
			}
			for (const [corridorId, corridor] of Object.entries(layout.corridors)) {
				expect(
					Math.min(corridor.width, corridor.height),
					`${mapId}:${corridorId}`
				).toBeGreaterThanOrEqual(96);
			}
			for (const { approach } of Object.values(layout.npcApproaches)) {
				expect(isWalkable(grid, approach.x, approach.y)).toBe(true);
			}
		}
	});

	it('keeps the three villager homes architecturally distinct', () => {
		const signatures = [
			VILLAGE_INTERIOR_LAYOUTS['villager-house-1'],
			VILLAGE_INTERIOR_LAYOUTS['villager-house-2'],
			VILLAGE_INTERIOR_LAYOUTS['villager-house-3']
		].map(normalizedInteriorSignature);
		expect(new Set(signatures).size).toBe(3);
	});
});
