import { describe, expect, it } from 'vitest';
import { enemies } from '$lib/game/content/enemies';
import { browserStoryCatalog } from '$lib/game/story/browser-fixture';
import { rectContains, toMapRect } from '$lib/game/content/maps/layouts/layout-rects';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';
import {
	caveArrival,
	overworldDoorArrival,
	type OverworldDoorMapId
} from '$lib/game/content/maps/overworld/places';
import { anchorPoint } from '$lib/game/content/maps/overworld/world';
import { en } from '$lib/game/i18n/messages/en';
import { ja } from '$lib/game/i18n/messages/ja';
import { zhHant } from '$lib/game/i18n/messages/zh-Hant';
import {
	coastDressingAsset,
	interiorPropAsset,
	isNpcPackFrameName
} from '$lib/game/content/assets';
import { getItem } from '$lib/game/content/items';
import { getShop } from '$lib/game/content/shops';
import { storyWindows } from '$lib/game/content/quests';
import {
	buildVillageInteriorNavigationSource,
	VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES
} from '$lib/game/content/backgrounds/village-interior-package';
import { VILLAGE_INTERIOR_NAVIGATION_SOURCES } from '$lib/game/content/backgrounds/village-interior-navigation-sources';
import { GENERATED_NAVIGATION_GRIDS } from '$lib/game/content/generated/navigation-grids.generated';
import {
	NPC_INTERACTION_RADIUS,
	NPC_PACK_COLLISION_RADIUS,
	PLAYER_COLLISION_RADIUS,
	STARTER_NPC_COLLISION_RADIUS
} from '$lib/game/core/collision';
import { t } from '$lib/game/i18n/translate';
import {
	blacksmithInteriorMap,
	guildHallMap,
	heroHouseMap,
	itemShopMap,
	maps,
	overworldMap,
	ruinsCoreMap,
	ruinsThresholdMap,
	shrineOfAuroraInteriorMap,
	villagerHouse1Map,
	villagerHouse2Map,
	villagerHouse3Map
} from '$lib/game/content/maps';
import type { MapDecor, WorldMapDefinition } from '$lib/game/content/maps';
import { compileNavigationGrid, isWalkable } from '$lib/game/core/navigation';
import {
	collectLandmarkRects,
	collectStrictCollisionRects,
	isInsideCollisionRect,
	isInsideAnyCollisionRect
} from '$lib/game/save/save-state';

function expectEnglishMessage(key: Parameters<typeof t>[1]): string {
	const value = t('en', key);
	expect(value).not.toMatch(/^\[/);
	expect(value.trim()).not.toHaveLength(0);
	return value;
}

type CenterRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

function expectRectInsideMap(rect: CenterRect, map: WorldMapDefinition) {
	expect(rect.width).toBeGreaterThan(0);
	expect(rect.height).toBeGreaterThan(0);
	expect(rect.x - rect.width / 2).toBeGreaterThanOrEqual(0);
	expect(rect.y - rect.height / 2).toBeGreaterThanOrEqual(0);
	expect(rect.x + rect.width / 2).toBeLessThanOrEqual(map.width * 32);
	expect(rect.y + rect.height / 2).toBeLessThanOrEqual(map.height * 32);
}

function expectPointInsideMap(
	point: { x: number; y: number },
	map: { width: number; height: number }
) {
	expect(point.x).toBeGreaterThanOrEqual(0);
	expect(point.y).toBeGreaterThanOrEqual(0);
	expect(point.x).toBeLessThanOrEqual(map.width * 32);
	expect(point.y).toBeLessThanOrEqual(map.height * 32);
}

function expectPointInsideRect(point: { x: number; y: number }, rect: CenterRect) {
	expect(point.x).toBeGreaterThanOrEqual(rect.x - rect.width / 2);
	expect(point.x).toBeLessThanOrEqual(rect.x + rect.width / 2);
	expect(point.y).toBeGreaterThanOrEqual(rect.y - rect.height / 2);
	expect(point.y).toBeLessThanOrEqual(rect.y + rect.height / 2);
}

function isPointInsideRect(point: { x: number; y: number }, rect: CenterRect) {
	return (
		point.x >= rect.x - rect.width / 2 &&
		point.x <= rect.x + rect.width / 2 &&
		point.y >= rect.y - rect.height / 2 &&
		point.y <= rect.y + rect.height / 2
	);
}

function expectPointClearOfInteriorPropCollisions(
	map: WorldMapDefinition,
	point: { x: number; y: number },
	label: string
) {
	for (const prop of map.interiorProps ?? []) {
		if (!prop.collision) continue;
		expect(
			isInsideCollisionRect(point.x, point.y, prop.collision, PLAYER_COLLISION_RADIUS),
			`${map.id}:${label} blocked by ${prop.id}`
		).toBe(false);
	}
}

function expectPointClearOfStrictBlockers(
	map: WorldMapDefinition,
	point: { x: number; y: number },
	label: string
) {
	for (const blocker of map.blockers ?? []) {
		expect(
			isInsideCollisionRect(point.x, point.y, blocker, PLAYER_COLLISION_RADIUS),
			`${map.id}:${label} blocked by ${blocker.id}`
		).toBe(false);
	}
}

function getTestNpcBodyRadius(npc: NonNullable<WorldMapDefinition['npcs']>[number]) {
	return (
		PLAYER_COLLISION_RADIUS +
		(isNpcPackFrameName(npc.frameName) ? NPC_PACK_COLLISION_RADIUS : STARTER_NPC_COLLISION_RADIUS)
	);
}

function expectAcceptedInteriorGeometry(
	map: WorldMapDefinition,
	layout: (typeof VILLAGE_INTERIOR_LAYOUTS)[keyof typeof VILLAGE_INTERIOR_LAYOUTS],
	prefix: string
) {
	const kebabName = (name: string) =>
		name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
	expect(map.groundPatches).toEqual([
		{
			...toMapRect(`${prefix}-full-floor`, layout.fullFloor),
			tile: 'cobblestoneTile'
		},
		...Object.entries(layout.rooms).map(([name, value]) => ({
			...toMapRect(`${prefix}-room-${kebabName(name)}`, value),
			tile: 'plazaStoneTile'
		})),
		...Object.entries(layout.corridors).map(([name, value]) => ({
			...toMapRect(`${prefix}-corridor-${kebabName(name)}`, value),
			tile: 'pathTile'
		}))
	]);
	expect(map.blockers).toEqual(
		layout.walls.map((wall) => ({ ...toMapRect(wall.id, wall), kind: 'ruin-wall' }))
	);
}

function normalizedHouseSignature(map: WorldMapDefinition) {
	const normalizeId = (id: string) => id.replace(/^villager-house-[123]-/, '');
	return JSON.stringify({
		roomsAndCorridors: (map.groundPatches ?? [])
			.filter((patch) => patch.id.includes('-room-') || patch.id.includes('-corridor-'))
			.map((patch) => [
				normalizeId(patch.id),
				patch.x,
				patch.y,
				patch.width,
				patch.height,
				patch.tile
			])
			.sort(),
		walls: (map.blockers ?? [])
			.map((blocker) => [
				normalizeId(blocker.id),
				blocker.x,
				blocker.y,
				blocker.width,
				blocker.height,
				blocker.kind
			])
			.sort()
	});
}

/**
 * Asserts that an axis-aligned waypoint route through `map` is walkable.
 *
 * Walks each consecutive waypoint pair in 16px increments and, at every
 * sampled point, asserts the point stays inside the map bounds (with the
 * player collision radius as margin), is not inside any `map.blockers`
 * collision rect, is not blocked by any collidable `map.interiorProps`,
 * and keeps clear of every `map.npcs` body radius. Consecutive waypoints
 * must share an x or y coordinate (axis-aligned segments).
 *
 * @param map - The `WorldMapDefinition` whose blockers, interior props,
 *   NPCs, and tile dimensions bound the route.
 * @param waypoints - Ordered `Array<{ x: number; y: number }>` of route
 *   points; each adjacent pair must be axis-aligned.
 * @param label - Human-readable `string` used in failure messages to
 *   identify which route segment was blocked.
 * @returns void - this helper performs assertions only and returns nothing.
 */
function expectRouteClear(
	map: WorldMapDefinition,
	waypoints: readonly { x: number; y: number }[],
	label: string
) {
	// Story-gated blockers close routes on purpose (the raid's burning bridge); every
	// other entry counts regardless of its story window, so routes stay clear throughout.
	const openMap = { ...map, blockers: map.blockers?.filter((blocker) => !blocker.activeDuring) };
	const routeCollisionRects = [
		...collectStrictCollisionRects(openMap),
		...collectLandmarkRects(openMap)
	];
	for (let index = 1; index < waypoints.length; index += 1) {
		const from = waypoints[index - 1]!;
		const to = waypoints[index]!;
		expect(from.x === to.x || from.y === to.y, `${label} must be axis-aligned`).toBe(true);

		const distance = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
		const steps = Math.max(1, Math.ceil(distance / 16));
		for (let step = 0; step <= steps; step += 1) {
			const ratio = step / steps;
			const point = {
				x: from.x + (to.x - from.x) * ratio,
				y: from.y + (to.y - from.y) * ratio
			};

			expect(point.x).toBeGreaterThanOrEqual(PLAYER_COLLISION_RADIUS);
			expect(point.y).toBeGreaterThanOrEqual(PLAYER_COLLISION_RADIUS);
			expect(point.x).toBeLessThanOrEqual(map.width * 32 - PLAYER_COLLISION_RADIUS);
			expect(point.y).toBeLessThanOrEqual(map.height * 32 - PLAYER_COLLISION_RADIUS);

			for (const [collisionIndex, collisionRect] of routeCollisionRects.entries()) {
				expect(
					isInsideCollisionRect(point.x, point.y, collisionRect, PLAYER_COLLISION_RADIUS),
					`${map.id}:${label} blocked by collision rect ${collisionIndex} at (${collisionRect.x},${collisionRect.y},${collisionRect.width},${collisionRect.height})`
				).toBe(false);
			}

			expectPointClearOfInteriorPropCollisions(map, point, label);

			for (const npc of map.npcs ?? []) {
				expect(
					Math.hypot(point.x - npc.x, point.y - npc.y),
					`${map.id}:${label} crosses NPC ${npc.id}`
				).toBeGreaterThanOrEqual(getTestNpcBodyRadius(npc));
			}
		}
	}
}

describe('opening map content', () => {
	it('keeps every registered map without active background images', () => {
		expect(Object.values(maps).every((map) => (map.backgroundImages ?? []).length === 0)).toBe(
			true
		);
	});

	it('supports authored ground patches, blockers, stair markers, and route combat bounds', () => {
		const modelTestMap: WorldMapDefinition = {
			id: 'model-test',
			width: 200,
			height: 200,
			spawnDirection: 'down',
			spawn: { x: 320, y: 320 },
			transitions: [
				{
					id: 'model-test-stair',
					x: 640,
					y: 640,
					toMapId: 'hero-house',
					marker: 'stair'
				}
			],
			groundPatches: [
				{
					id: 'model-test-path',
					x: 320,
					y: 320,
					width: 320,
					height: 96,
					tile: 'pathTile'
				}
			],
			blockers: [
				{
					id: 'model-test-wall',
					x: 480,
					y: 320,
					width: 64,
					height: 320,
					kind: 'city-wall'
				},
				{
					id: 'model-test-hedge',
					x: 720,
					y: 320,
					width: 160,
					height: 48,
					kind: 'town-hedge'
				},
				{
					id: 'model-test-future-gate',
					x: 640,
					y: 320,
					width: 96,
					height: 64,
					kind: 'future-gate',
					label: 'Future switch gate'
				}
			],
			combatBounds: [
				{
					id: 'model-test-combat-pocket',
					x: 800,
					y: 320,
					width: 480,
					height: 320,
					encounterIds: ['model-test-slime'],
					aggroRadius: 240,
					leashRadius: 420
				}
			]
		};

		expect(modelTestMap.transitions[0].marker).toBe('stair');
		expect(modelTestMap.groundPatches?.[0]).toMatchObject({
			id: 'model-test-path',
			tile: 'pathTile'
		});
		expect(modelTestMap.blockers?.map((blocker) => blocker.kind)).toEqual([
			'city-wall',
			'town-hedge',
			'future-gate'
		]);
		expect(modelTestMap.combatBounds?.[0].encounterIds).toEqual(['model-test-slime']);
	});

	it('declares explicit arrival points for the hero house and ruin doorway returns', () => {
		expect(heroHouseMap.transitions).toEqual([
			{
				id: 'hero-house-to-overworld',
				x: 352,
				y: 560,
				toMapId: 'overworld',
				arrival: overworldDoorArrival('hero-house')
			}
		]);
		expect(ruinsThresholdMap.transitions).toEqual([
			{
				id: 'threshold-to-overworld',
				x: 256,
				y: 3_200,
				toMapId: 'overworld',
				requiresClear: true,
				marker: 'stair',
				arrival: caveArrival
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
		]);
		expect(ruinsCoreMap.transitions).toEqual([
			{
				id: 'core-to-threshold',
				x: 256,
				y: 3_200,
				toMapId: 'ruins-threshold',
				requiresClear: true,
				marker: 'stair',
				arrival: { x: 5_504, y: 3_200, facing: 'left' }
			}
		]);
	});

	it('declares expanded puzzle-ready ruin shells', () => {
		expect(ruinsThresholdMap.width).toBe(200);
		expect(ruinsThresholdMap.height).toBe(200);
		expect(ruinsThresholdMap.spawnDirection).toBe('right');
		expect(ruinsThresholdMap.spawn).toEqual({ x: 512, y: 3_200 });
		expect(ruinsThresholdMap.transitions.every((transition) => transition.marker === 'stair')).toBe(
			true
		);
		expect(ruinsThresholdMap.blockers?.some((blocker) => blocker.kind === 'future-gate')).toBe(
			true
		);
		expect(ruinsThresholdMap.groundPatches).toEqual([
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
		]);
		expect(ruinsThresholdMap.blockers).toEqual([
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
		]);

		expect(ruinsCoreMap.width).toBe(200);
		expect(ruinsCoreMap.height).toBe(200);
		expect(ruinsCoreMap.spawnDirection).toBe('right');
		expect(ruinsCoreMap.spawn).toEqual({ x: 512, y: 3_200 });
		expect(ruinsCoreMap.transitions.every((transition) => transition.marker === 'stair')).toBe(
			true
		);
		expect(ruinsCoreMap.blockers?.some((blocker) => blocker.kind === 'future-gate')).toBe(true);
		expect(ruinsCoreMap.groundPatches).toEqual([
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
		]);
		expect(ruinsCoreMap.blockers).toEqual([
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
		]);
	});

	it('proves the authored Threshold and Core routes with composed collision', () => {
		const thresholdWestEncounter = ruinsThresholdMap.encounters!.find(
			(encounter) => encounter.id === 'threshold-crawlers'
		)!;
		const thresholdEastEncounter = thresholdWestEncounter;
		const thresholdNorthPickup = ruinsThresholdMap.pickups!.find(
			(pickup) => pickup.id === 'ruins-threshold-cap'
		)!;
		const thresholdSouthPickup = ruinsThresholdMap.pickups!.find(
			(pickup) => pickup.id === 'ruins-threshold-salve'
		)!;
		const thresholdCoreStair = ruinsThresholdMap.transitions.find(
			(transition) => transition.id === 'threshold-to-core'
		)!;
		const thresholdOverworldStair = ruinsThresholdMap.transitions.find(
			(transition) => transition.id === 'threshold-to-overworld'
		)!;

		expect([ruinsThresholdMap.width, ruinsThresholdMap.height]).toEqual([200, 200]);
		expect(ruinsThresholdMap.pickups?.map((pickup) => pickup.id)).toEqual([
			'ruins-threshold-cap',
			'ruins-threshold-rune',
			'ruins-threshold-salve'
		]);
		expect(ruinsThresholdMap.encounters?.map((encounter) => encounter.id)).toEqual([
			'threshold-crawlers'
		]);

		expectRouteClear(
			ruinsThresholdMap,
			[
				ruinsThresholdMap.spawn,
				thresholdWestEncounter,
				{ x: 2_400, y: 3_200 },
				{ x: 2_400, y: 2_112 },
				thresholdNorthPickup,
				{ x: 1_728, y: 4_800 },
				thresholdSouthPickup,
				{ x: 2_048, y: 3_200 },
				{ x: thresholdEastEncounter.x, y: 3_200 },
				thresholdEastEncounter,
				{ x: thresholdEastEncounter.x, y: 3_200 },
				thresholdCoreStair
			],
			'threshold-critical-route'
		);
		expectRouteClear(
			ruinsThresholdMap,
			[
				ruinsThresholdMap.spawn,
				{ x: 2_400, y: 3_200 },
				{ x: 2_400, y: 2_112 },
				thresholdNorthPickup,
				{ x: 2_400, y: 2_112 },
				{ x: 2_400, y: 3_200 },
				thresholdCoreStair
			],
			'threshold-north-optional-loop'
		);
		expectRouteClear(
			ruinsThresholdMap,
			[
				ruinsThresholdMap.spawn,
				{ x: 2_048, y: 3_200 },
				thresholdSouthPickup,
				{ x: 2_048, y: 3_200 },
				thresholdCoreStair
			],
			'threshold-south-optional-loop'
		);
		expectRouteClear(
			ruinsThresholdMap,
			[ruinsThresholdMap.spawn, thresholdOverworldStair],
			'threshold-spawn-to-overworld-stair'
		);

		const coreNorthPickup = ruinsCoreMap.pickups!.find(
			(pickup) => pickup.id === 'ruins-core-mail'
		)!;
		const coreSouthPickup = ruinsCoreMap.pickups!.find(
			(pickup) => pickup.id === 'ruins-core-draught'
		)!;
		// The escape drops Grik at the far east end of the core; he walks west to the stair.
		const coreBoss = { x: 5_376, y: 3_200 };
		const coreThresholdStair = ruinsCoreMap.transitions.find(
			(transition) => transition.id === 'core-to-threshold'
		)!;

		expect([ruinsCoreMap.width, ruinsCoreMap.height]).toEqual([200, 200]);
		expect(ruinsCoreMap.pickups?.map((pickup) => pickup.id)).toEqual([
			'ruins-core-mail',
			'ruins-core-draught'
		]);
		expect(ruinsCoreMap.encounters?.map((encounter) => encounter.id)).toEqual(['core-crawlers']);
		expectRouteClear(
			ruinsCoreMap,
			[
				ruinsCoreMap.spawn,
				{ x: 2_240, y: 3_200 },
				coreNorthPickup,
				{ x: 2_240, y: 3_200 },
				{ x: 3_744, y: 3_200 },
				{ x: 3_744, y: 4_544 },
				coreSouthPickup,
				{ x: 3_744, y: 4_544 },
				{ x: 3_744, y: 3_200 },
				{ x: 4_600, y: 3_200 },
				coreBoss
			],
			'core-critical-route'
		);
		expectRouteClear(
			ruinsCoreMap,
			[ruinsCoreMap.spawn, coreThresholdStair],
			'core-spawn-to-threshold-stair'
		);
	});

	it('keeps every future gate blocked while preserving its authored opening', () => {
		for (const map of [ruinsThresholdMap, ruinsCoreMap]) {
			const collisionRects = collectStrictCollisionRects(map);
			const gates = (map.blockers ?? []).filter((blocker) => blocker.kind === 'future-gate');
			expect(gates, `${map.id}:future gates`).toHaveLength(2);

			for (const gate of gates) {
				const from = {
					x: gate.x - gate.width / 2 - 64,
					y: gate.y
				};
				const to = {
					x: gate.x + gate.width / 2 + 64,
					y: gate.y
				};
				const blocked = segmentSamples(from, to, 16).some((point) =>
					isInsideAnyCollisionRect(point.x, point.y, collisionRects, PLAYER_COLLISION_RADIUS)
				);
				expect(blocked, `${map.id}:${gate.id} must block a movement segment`).toBe(true);
			}
		}
	});

	it('keeps every transition arrival inside its current target map', () => {
		for (const map of Object.values(maps)) {
			for (const transition of map.transitions) {
				if (!transition.arrival) {
					continue;
				}

				const targetMap = maps[transition.toMapId];
				expect(targetMap).toBeDefined();
				expect(transition.arrival.x).toBeGreaterThanOrEqual(0);
				expect(transition.arrival.y).toBeGreaterThanOrEqual(0);
				expect(transition.arrival.x).toBeLessThan(targetMap.width * 32);
				expect(transition.arrival.y).toBeLessThan(targetMap.height * 32);
				const overlappingBlocker = (targetMap.blockers ?? []).find((blocker) =>
					isPointInsideRect(transition.arrival!, blocker)
				);
				expect(
					overlappingBlocker,
					`${map.id}:${transition.id} arrival overlaps ${targetMap.id} blocker`
				).toBeUndefined();
				expectPointClearOfInteriorPropCollisions(
					targetMap,
					transition.arrival,
					`${map.id}:${transition.id} arrival`
				);
			}
		}
	});

	it('keeps required ruin progression corridors and Guild Hall routes clear', () => {
		expectRouteClear(
			ruinsThresholdMap,
			[
				{ x: 512, y: 3_200 },
				{ x: 5_888, y: 3_200 }
			],
			'overworld-arrival-to-core-stair'
		);
		expectRouteClear(
			ruinsCoreMap,
			[
				{ x: 512, y: 3_200 },
				{ x: 4_992, y: 3_200 }
			],
			'core-arrival-to-warden'
		);

		const spawn = { x: 512, y: 736 };
		const spineLobby = { x: 512, y: 672 };
		const guildMasterApproach = { x: 800, y: 184 };
		const quartermasterApproach = { x: 816, y: 568 };

		expectRouteClear(guildHallMap, [spawn, spineLobby], 'guild-spawn-to-spine');
		expectRouteClear(
			guildHallMap,
			[spineLobby, { x: 512, y: 184 }, guildMasterApproach],
			'spine-to-guild-master'
		);
		expectRouteClear(
			guildHallMap,
			[spineLobby, { x: 512, y: 208 }, { x: 240, y: 208 }],
			'spine-to-records-hall'
		);
		expectRouteClear(
			guildHallMap,
			[spineLobby, { x: 512, y: 336 }, { x: 912, y: 336 }, { x: 912, y: 368 }],
			'spine-to-training-hall'
		);
		expectRouteClear(
			guildHallMap,
			[spineLobby, { x: 512, y: 568 }, quartermasterApproach],
			'spine-to-quartermaster'
		);
		expectRouteClear(guildHallMap, [spawn, { x: 512, y: 816 }], 'guild-spawn-to-exit');

		const guildMaster = guildHallMap.npcs!.find((npc) => npc.id === 'borak')!;
		const quartermaster = guildHallMap.npcs!.find((npc) => npc.id === 'lodge-keeper')!;

		for (const [npc, approach] of [
			[guildMaster, guildMasterApproach],
			[quartermaster, quartermasterApproach]
		] as const) {
			const distance = Math.hypot(approach.x - npc.x, approach.y - npc.y);
			expect(distance).toBeGreaterThan(getTestNpcBodyRadius(npc));
			expect(distance).toBeLessThanOrEqual(PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS);
			expectPointClearOfInteriorPropCollisions(guildHallMap, approach, `${npc.id}-approach`);
			for (const prop of guildHallMap.interiorProps ?? []) {
				if (!prop.collision) continue;
				expect(
					isInsideCollisionRect(npc.x, npc.y, prop.collision, PLAYER_COLLISION_RADIUS),
					`${npc.id} overlaps ${prop.id}`
				).toBe(false);
			}
		}
	});

	it('keeps every authored outdoor layout primitive inside map bounds', () => {
		for (const map of [overworldMap, ruinsThresholdMap, ruinsCoreMap]) {
			expectPointInsideMap(map.spawn, map);

			for (const transition of map.transitions) {
				expectPointInsideMap(transition, map);

				if (transition.arrival) {
					const targetMap = maps[transition.toMapId];
					expect(targetMap).toBeDefined();
					expectPointInsideMap(transition.arrival, targetMap);
				}
			}

			for (const rect of [
				...(map.groundPatches ?? []),
				...(map.blockers ?? []),
				...(map.combatBounds ?? []),
				...(map.fences ?? []),
				...(map.mapDecor ?? []),
				...(map.landmarks ?? [])
			]) {
				expectRectInsideMap(rect, map);
			}

			for (const point of [
				...(map.encounters ?? []),
				...(map.pickups ?? []),
				...(map.npcs ?? [])
			]) {
				expectPointInsideMap(point, map);
			}
		}
	});

	it('registers village interiors and the expanded Guild Hall', () => {
		const rebuiltInteriors = [
			heroHouseMap,
			itemShopMap,
			blacksmithInteriorMap,
			villagerHouse1Map,
			villagerHouse2Map,
			villagerHouse3Map,
			shrineOfAuroraInteriorMap
		];

		expect(maps['hero-house']).toBe(heroHouseMap);
		expect(maps['item-shop']).toBe(itemShopMap);
		expect(maps['blacksmith-interior']).toBe(blacksmithInteriorMap);
		expect(maps['villager-house-1']).toBe(villagerHouse1Map);
		expect(maps['villager-house-2']).toBe(villagerHouse2Map);
		expect(maps['villager-house-3']).toBe(villagerHouse3Map);
		expect(maps['shrine-of-aurora-interior']).toBe(shrineOfAuroraInteriorMap);

		expect(villagerHouse1Map.width).toBe(40);
		expect(villagerHouse1Map.height).toBe(26);
		expect(villagerHouse2Map.width).toBe(40);
		expect(villagerHouse2Map.height).toBe(24);
		expect(villagerHouse3Map.width).toBe(32);
		expect(villagerHouse3Map.height).toBe(22);
		expect(shrineOfAuroraInteriorMap.width).toBe(32);
		expect(shrineOfAuroraInteriorMap.height).toBe(28);

		for (const map of rebuiltInteriors.slice(2)) {
			expect(map.transitions).toHaveLength(1);
			expect(map.transitions[0].toMapId).toBe('overworld');
		}
		expect(heroHouseMap.width).toBe(22);
		expect(heroHouseMap.height).toBe(18);
		expect(itemShopMap.width).toBe(26);
		expect(itemShopMap.height).toBe(20);
		expect(blacksmithInteriorMap.width).toBe(28);
		expect(blacksmithInteriorMap.height).toBe(22);
		expect(blacksmithInteriorMap.spawn).toEqual({ x: 448, y: 576 });
		expect(blacksmithInteriorMap.transitions[0]).toMatchObject({
			id: 'blacksmith-to-overworld',
			x: 448,
			y: 688,
			toMapId: 'overworld',
			arrival: overworldDoorArrival('blacksmith-interior')
		});

		expect(maps['guild-hall']).toBe(guildHallMap);
		expect(guildHallMap.width).toBe(32);
		expect(guildHallMap.height).toBe(26);
		expect(guildHallMap.spawnDirection).toBe('up');
		expect(guildHallMap.spawn).toEqual({ x: 512, y: 736 });
		expect(guildHallMap.transitions[0]).toMatchObject({
			id: 'guild-hall-to-overworld',
			x: 512,
			y: 816,
			toMapId: 'overworld',
			arrival: overworldDoorArrival('guild-hall')
		});
	});

	it('uses the approved Guild Hall floor, wall, and identity contracts', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
		const fullFloor = guildHallMap.groundPatches?.find(
			(patch) => patch.id === 'guild-hall-full-floor'
		);

		expect(fullFloor).toMatchObject({
			x: 512,
			y: 416,
			width: 1024,
			height: 832,
			tile: 'cobblestoneTile'
		});
		expect(guildHallMap.blockers?.map((blocker) => blocker.id)).toEqual(
			layout.walls.map((wall) => wall.id)
		);
		expect(guildHallMap.blockers?.every((blocker) => blocker.kind === 'ruin-wall')).toBe(true);
		expect(
			guildHallMap.interiorProps?.find((prop) => prop.id === 'guild-hall-master-desk')?.collision
		).toMatchObject({ x: 800, y: 164, width: 144, height: 8 });
		expect(
			guildHallMap.interiorProps?.find((prop) => prop.id === 'guild-hall-quartermaster-counter')
				?.collision
		).toMatchObject({ x: 784, y: 548, width: 176, height: 8 });
		expect(guildHallMap.npcs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'borak',
					x: 800,
					y: 144,
					dialogueId: 'borak',
					role: 'guild'
				}),
				expect.objectContaining({
					id: 'lodge-keeper',
					x: 816,
					y: 528,
					dialogueId: 'lodge-keeper',
					role: 'shopkeeper',
					shopId: 'guild-quartermaster'
				})
			])
		);
		expect(getShop('guild-quartermaster')).toBeDefined();
		expect(guildHallMap.transitions[0].arrival).toEqual(overworldDoorArrival('guild-hall'));
	});

	it('uses the approved Hero House and Item Shop floor, wall, and arrival contracts', () => {
		expect(heroHouseMap.spawnDirection).toBe('up');
		expect(heroHouseMap.spawn).toEqual({ x: 352, y: 480 });
		expect(heroHouseMap.transitions).toEqual([
			{
				id: 'hero-house-to-overworld',
				x: 352,
				y: 560,
				toMapId: 'overworld',
				arrival: overworldDoorArrival('hero-house')
			}
		]);
		expect(heroHouseMap.groundPatches).toEqual([
			{
				id: 'hero-house-full-floor',
				x: 352,
				y: 288,
				width: 704,
				height: 576,
				tile: 'cobblestoneTile'
			},
			{
				id: 'hero-house-room-bedroom',
				x: 160,
				y: 160,
				width: 192,
				height: 192,
				tile: 'plazaStoneTile'
			},
			{
				id: 'hero-house-room-study',
				x: 544,
				y: 160,
				width: 192,
				height: 192,
				tile: 'plazaStoneTile'
			},
			{
				id: 'hero-house-room-living-kitchen',
				x: 352,
				y: 416,
				width: 576,
				height: 256,
				tile: 'plazaStoneTile'
			},
			{ id: 'hero-house-corridor-hall', x: 352, y: 176, width: 128, height: 224, tile: 'pathTile' }
		]);
		expect(heroHouseMap.blockers).toEqual(
			[
				['hero-house-wall-north', 352, 32, 704, 64],
				['hero-house-wall-west', 32, 304, 64, 480],
				['hero-house-wall-east', 672, 304, 64, 480],
				['hero-house-wall-south-west', 160, 560, 320, 32],
				['hero-house-wall-south-east', 544, 560, 320, 32],
				['hero-house-bedroom-divider-north', 272, 96, 32, 64],
				['hero-house-bedroom-divider-south', 272, 224, 32, 64],
				['hero-house-study-divider-north', 432, 96, 32, 64],
				['hero-house-study-divider-south', 432, 224, 32, 64],
				['hero-house-hall-living-divider-west', 176, 272, 224, 32],
				['hero-house-hall-living-divider-east', 528, 272, 224, 32]
			].map(([id, x, y, width, height]) => ({ id, x, y, width, height, kind: 'ruin-wall' }))
		);

		expect(itemShopMap.spawnDirection).toBe('up');
		const itemShopLayout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
		expect(itemShopMap.spawn).toEqual(itemShopLayout.spawn);
		expect(itemShopMap.transitions[0]).toMatchObject({ ...itemShopLayout.exit });
		expectAcceptedInteriorGeometry(itemShopMap, itemShopLayout, 'item-shop');
	});

	it('keeps Hero House and Item Shop authored door routes clear', () => {
		expectRouteClear(
			heroHouseMap,
			[heroHouseMap.spawn, { x: 352, y: 320 }, { x: 352, y: 160 }, { x: 232, y: 160 }],
			'hero-spawn-to-bedroom'
		);
		expectRouteClear(
			heroHouseMap,
			[heroHouseMap.spawn, { x: 352, y: 160 }, { x: 472, y: 160 }],
			'hero-spawn-to-study'
		);
		expectRouteClear(heroHouseMap, [heroHouseMap.spawn, { x: 400, y: 480 }], 'hero-living-kitchen');
		expectRouteClear(
			heroHouseMap,
			[heroHouseMap.spawn, heroHouseMap.transitions[0]],
			'hero-spawn-to-exit'
		);

		const mira = itemShopMap.npcs!.find((npc) => npc.id === 'mira')!;
		const miraApproach = { x: 416, y: 360 };
		expectRouteClear(itemShopMap, [itemShopMap.spawn, miraApproach], 'shop-spawn-to-mira');
		expectRouteClear(
			itemShopMap,
			[
				itemShopMap.spawn,
				{ x: 720, y: 544 },
				{ x: 720, y: 272 },
				{ x: 416, y: 272 },
				{ x: 416, y: 144 },
				{ x: 288, y: 144 },
				{ x: 288, y: 192 }
			],
			'shop-stockroom'
		);
		expectRouteClear(
			itemShopMap,
			[
				itemShopMap.spawn,
				{ x: 720, y: 544 },
				{ x: 720, y: 272 },
				{ x: 416, y: 272 },
				{ x: 416, y: 144 },
				{ x: 528, y: 144 },
				{ x: 528, y: 192 },
				{ x: 736, y: 192 }
			],
			'shop-office'
		);
		expectRouteClear(
			itemShopMap,
			[itemShopMap.spawn, { x: 240, y: 544 }, { x: 240, y: 448 }],
			'shop-west-display'
		);
		expectRouteClear(
			itemShopMap,
			[itemShopMap.spawn, { x: 592, y: 544 }, { x: 592, y: 448 }],
			'shop-east-display'
		);
		expectRouteClear(
			itemShopMap,
			[itemShopMap.spawn, itemShopMap.transitions[0]],
			'shop-spawn-to-exit'
		);
		expect(Math.hypot(miraApproach.x - mira.x, miraApproach.y - mira.y)).toBe(40);
	});

	it('rebuilds Shrine and all three villager houses from the accepted layouts', () => {
		const shrineLayout = VILLAGE_INTERIOR_LAYOUTS['shrine-of-aurora-interior'];
		const house1Layout = VILLAGE_INTERIOR_LAYOUTS['villager-house-1'];
		const house2Layout = VILLAGE_INTERIOR_LAYOUTS['villager-house-2'];
		const house3Layout = VILLAGE_INTERIOR_LAYOUTS['villager-house-3'];

		for (const [map, layout, prefix] of [
			[shrineOfAuroraInteriorMap, shrineLayout, 'shrine-of-aurora'],
			[villagerHouse1Map, house1Layout, 'villager-house-1'],
			[villagerHouse2Map, house2Layout, 'villager-house-2'],
			[villagerHouse3Map, house3Layout, 'villager-house-3']
		] as const) {
			expect(map.backgroundImages).toBeUndefined();
			expect(map.width).toBe(layout.widthTiles);
			expect(map.height).toBe(layout.heightTiles);
			expect(map.spawnDirection).toBe('up');
			expect(map.spawn).toEqual(layout.spawn);
			expect(map.transitions).toHaveLength(1);
			expect(map.transitions[0]).toMatchObject({
				toMapId: 'overworld',
				...layout.exit,
				arrival: overworldDoorArrival(map.id as OverworldDoorMapId)
			});
			expectAcceptedInteriorGeometry(map, layout, prefix);
		}

		expect(shrineOfAuroraInteriorMap.transitions[0]).toMatchObject({
			id: 'shrine-of-aurora-to-overworld',
			x: 512,
			y: 880,
			toMapId: 'overworld',
			arrival: overworldDoorArrival('shrine-of-aurora-interior')
		});
		expect(
			shrineOfAuroraInteriorMap.interiorProps?.map(
				({ x, y, width, height, frameName, collision }) => ({
					x,
					y,
					width,
					height,
					frameName,
					collision: collision
						? { x: collision.x, y: collision.y, width: collision.width, height: collision.height }
						: undefined
				})
			)
		).toEqual([
			{
				x: 512,
				y: 160,
				width: 256,
				height: 128,
				frameName: 'table',
				collision: { x: 512, y: 160, width: 192, height: 64 }
			},
			{
				x: 512,
				y: 256,
				width: 128,
				height: 64,
				frameName: 'hearthLamp',
				collision: undefined
			},
			{
				x: 400,
				y: 496,
				width: 96,
				height: 224,
				frameName: 'bench',
				collision: { x: 400, y: 496, width: 64, height: 192 }
			},
			{
				x: 624,
				y: 496,
				width: 96,
				height: 224,
				frameName: 'bench',
				collision: { x: 624, y: 496, width: 64, height: 192 }
			},
			{
				x: 160,
				y: 480,
				width: 128,
				height: 192,
				frameName: 'crateStack',
				collision: { x: 160, y: 480, width: 96, height: 160 }
			},
			{
				x: 864,
				y: 480,
				width: 128,
				height: 256,
				frameName: 'bookshelf',
				collision: { x: 864, y: 480, width: 96, height: 224 }
			},
			{
				x: 512,
				y: 784,
				width: 256,
				height: 96,
				frameName: 'hearthLamp',
				collision: undefined
			}
		]);
		expect(shrineOfAuroraInteriorMap.npcs?.map((npc) => npc.id)).toEqual(['mott-shrine']);
		expect(shrineOfAuroraInteriorMap.ambientNpcs ?? []).toEqual([]);

		expect(Object.keys(house1Layout.propCollisions)).toEqual([
			'bed',
			'familyTable',
			'kitchen',
			'storage'
		]);
		expect(villagerHouse1Map.interiorProps).toEqual([
			{
				...toMapRect('villager-house-1-bed', house1Layout.propZones.bed),
				frameName: 'bed',
				collision: toMapRect('villager-house-1-bed-collision', house1Layout.propCollisions.bed)
			},
			{
				...toMapRect('villager-house-1-family-table', house1Layout.propZones.familyTable),
				frameName: 'table',
				collision: toMapRect(
					'villager-house-1-family-table-collision',
					house1Layout.propCollisions.familyTable
				)
			},
			{
				...toMapRect('villager-house-1-kitchen', house1Layout.propZones.kitchen),
				frameName: 'crateStack',
				collision: toMapRect(
					'villager-house-1-kitchen-collision',
					house1Layout.propCollisions.kitchen
				)
			},
			{
				...toMapRect('villager-house-1-storage', house1Layout.propZones.storage),
				frameName: 'bookshelf',
				collision: toMapRect(
					'villager-house-1-storage-collision',
					house1Layout.propCollisions.storage
				)
			}
		]);
		expect(villagerHouse1Map.npcs).toEqual([
			expect.objectContaining({
				id: 'villager-lynn',
				x: house1Layout.npcApproaches.lynn.npc.x,
				y: house1Layout.npcApproaches.lynn.npc.y,
				nameKey: 'content.maps.npcs.villager-lynn.name',
				dialogueId: 'villager-lynn',
				role: 'villager',
				frameName: 'miraItemShopNpc'
			})
		]);
		expect(villagerHouse1Map.ambientNpcs).toEqual([
			{
				id: 'villager-house-1-family',
				x: house1Layout.ambientActivity!['villager-house-1-family'].x,
				y: house1Layout.ambientActivity!['villager-house-1-family'].y,
				frameName: 'miraItemShopNpc',
				role: 'family',
				hiddenDuring: storyWindows.afterRaid
			}
		]);

		expect(villagerHouse2Map.interiorProps).toEqual([
			{
				...toMapRect('villager-house-2-workbench', house2Layout.propZones.workbench),
				frameName: 'table',
				collision: toMapRect(
					'villager-house-2-workbench-collision',
					house2Layout.propCollisions.tomaWorkbench
				)
			},
			{
				...toMapRect('villager-house-2-workshop-storage', house2Layout.propZones.workshopStorage),
				frameName: 'crateStack',
				collision: toMapRect(
					'villager-house-2-workshop-storage-collision',
					house2Layout.propCollisions.workshopStorage
				)
			},
			{
				...toMapRect('villager-house-2-bedroom', house2Layout.propZones.bedroom),
				frameName: 'bed',
				collision: toMapRect(
					'villager-house-2-bedroom-collision',
					house2Layout.propCollisions.bedroom
				)
			},
			{
				...toMapRect('villager-house-2-living-table', house2Layout.propZones.livingTable),
				frameName: 'table',
				collision: toMapRect(
					'villager-house-2-living-table-collision',
					house2Layout.propCollisions.livingTable
				)
			}
		]);
		expect(villagerHouse2Map.npcs).toEqual([
			expect.objectContaining({
				id: 'villager-toma',
				x: house2Layout.npcApproaches.toma.npc.x,
				y: house2Layout.npcApproaches.toma.npc.y,
				nameKey: 'content.maps.npcs.villager-toma.name',
				dialogueId: 'villager-toma',
				role: 'villager',
				frameName: 'quartermasterNpc'
			})
		]);
		expect(villagerHouse2Map.ambientNpcs).toEqual([
			{
				id: 'villager-house-2-neighbor',
				x: house2Layout.ambientActivity!['villager-house-2-neighbor'].x,
				y: house2Layout.ambientActivity!['villager-house-2-neighbor'].y,
				frameName: 'guildMasterNpc',
				role: 'neighbor',
				hiddenDuring: storyWindows.afterRaid
			}
		]);
		expect(villagerHouse2Map.navigationGrid).toBeDefined();
		expect(villagerHouse2Map.navigationGrid).toBe(
			GENERATED_NAVIGATION_GRIDS['villager-house-2-navigation']
		);
		expect(villagerHouse2Map.navigationGridOwnedSources).toEqual(
			VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES
		);

		expect(villagerHouse3Map.navigationGrid).toBeDefined();
		expect(villagerHouse3Map.navigationGrid).toBe(
			GENERATED_NAVIGATION_GRIDS['villager-house-3-navigation']
		);
		expect(villagerHouse3Map.navigationGridOwnedSources).toEqual(
			VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES
		);

		expect(villagerHouse3Map.interiorProps).toEqual([
			{
				...toMapRect(
					'villager-house-3-west-archive-shelves',
					house3Layout.propZones.westArchiveShelves
				),
				frameName: 'bookshelf',
				collision: toMapRect(
					'villager-house-3-west-archive-shelves-collision',
					house3Layout.propCollisions.ioWestArchiveShelves
				)
			},
			{
				...toMapRect('villager-house-3-reading-table', house3Layout.propZones.readingTable),
				frameName: 'table',
				collision: toMapRect(
					'villager-house-3-reading-table-collision',
					house3Layout.propCollisions.readingTable
				)
			},
			{
				...toMapRect('villager-house-3-bedroom', house3Layout.propZones.bedroom),
				frameName: 'bed',
				collision: toMapRect(
					'villager-house-3-bedroom-collision',
					house3Layout.propCollisions.bedroom
				)
			},
			{
				...toMapRect('villager-house-3-travel-storage', house3Layout.propZones.travelStorage),
				frameName: 'crateStack',
				collision: toMapRect(
					'villager-house-3-travel-storage-collision',
					house3Layout.propCollisions.travelStorage
				)
			},
			{
				...toMapRect('villager-house-3-sitting', house3Layout.propZones.sitting),
				frameName: 'rug',
				collision: toMapRect(
					'villager-house-3-sitting-collision',
					house3Layout.propCollisions.sitting
				)
			}
		]);
		expect(villagerHouse3Map.npcs).toEqual([
			expect.objectContaining({
				id: 'villager-io',
				x: 256,
				y: 224,
				nameKey: 'content.maps.npcs.villager-io.name',
				dialogueId: 'villager-io',
				role: 'villager',
				frameName: 'guildMasterNpc'
			})
		]);
		expect(villagerHouse3Map.ambientNpcs).toEqual([
			{
				id: 'villager-house-3-neighbor',
				x: 768,
				y: 544,
				frameName: 'quartermasterNpc',
				role: 'neighbor',
				hiddenDuring: storyWindows.afterRaid
			}
		]);

		for (const [map, approach, route] of [
			[
				villagerHouse1Map,
				house1Layout.npcApproaches.lynn,
				[villagerHouse1Map.spawn, { x: 640, y: 544 }, house1Layout.npcApproaches.lynn.approach]
			],
			[
				villagerHouse2Map,
				house2Layout.npcApproaches.toma,
				[villagerHouse2Map.spawn, { x: 640, y: 240 }, { x: 408, y: 240 }, { x: 408, y: 224 }]
			],
			[
				villagerHouse3Map,
				house3Layout.npcApproaches.io,
				[villagerHouse3Map.spawn, { x: 512, y: 400 }, { x: 512, y: 224 }, { x: 304, y: 224 }]
			]
		] as const) {
			expect(map.backgroundImages).toBeUndefined();
			expectPointClearOfInteriorPropCollisions(map, approach.npc, `${map.id}-npc`);
			expectPointClearOfInteriorPropCollisions(map, approach.approach, `${map.id}-approach`);
			expectPointClearOfStrictBlockers(map, approach.npc, `${map.id}-npc`);
			expectPointClearOfStrictBlockers(map, approach.approach, `${map.id}-approach`);
			expectRouteClear(map, route, `${map.id}-spawn-to-npc`);
			expectRouteClear(map, [map.spawn, map.transitions[0]!], `${map.id}-spawn-to-exit`);
		}
		expectRouteClear(
			villagerHouse1Map,
			[villagerHouse1Map.spawn, { x: 640, y: 416 }, { x: 640, y: 224 }],
			'villager-house-1-spawn-to-hall'
		);
		expectRouteClear(
			villagerHouse1Map,
			[villagerHouse1Map.spawn, { x: 640, y: 416 }, { x: 640, y: 224 }, { x: 256, y: 224 }],
			'villager-house-1-spawn-to-bedroom'
		);
		expectRouteClear(
			villagerHouse1Map,
			[villagerHouse1Map.spawn, { x: 640, y: 416 }, { x: 640, y: 224 }, { x: 1000, y: 224 }],
			'villager-house-1-spawn-to-storage'
		);
		expectRouteClear(
			villagerHouse1Map,
			[villagerHouse1Map.spawn, { x: 800, y: 672 }, { x: 800, y: 544 }],
			'villager-house-1-spawn-to-living-kitchen'
		);
		expectRouteClear(
			villagerHouse2Map,
			[villagerHouse2Map.spawn, { x: 640, y: 240 }],
			'villager-house-2-spawn-to-hall'
		);
		expectRouteClear(
			villagerHouse2Map,
			[villagerHouse2Map.spawn, { x: 640, y: 240 }, { x: 800, y: 240 }, { x: 800, y: 336 }],
			'villager-house-2-spawn-to-bedroom'
		);
		expectRouteClear(
			villagerHouse2Map,
			[villagerHouse2Map.spawn, { x: 896, y: 608 }, { x: 896, y: 640 }],
			'villager-house-2-spawn-to-living-area'
		);
		expectRouteClear(
			villagerHouse3Map,
			[villagerHouse3Map.spawn, { x: 512, y: 400 }, { x: 512, y: 224 }],
			'villager-house-3-spawn-to-hall'
		);
		expectRouteClear(
			villagerHouse3Map,
			[
				villagerHouse3Map.spawn,
				{ x: 512, y: 400 },
				{ x: 512, y: 224 },
				{ x: 640, y: 224 },
				{ x: 640, y: 320 },
				{ x: 832, y: 320 }
			],
			'villager-house-3-spawn-to-bedroom-storage'
		);
		expectRouteClear(
			villagerHouse3Map,
			[villagerHouse3Map.spawn, { x: 864, y: 576 }],
			'villager-house-3-spawn-to-sitting-room'
		);
		expectRouteClear(
			villagerHouse3Map,
			[villagerHouse3Map.spawn, { x: 256, y: 576 }, { x: 256, y: 432 }],
			'villager-house-3-spawn-to-reading-table'
		);
		expectRouteClear(
			villagerHouse3Map,
			[villagerHouse3Map.spawn, { x: 864, y: 576 }, { x: 864, y: 544 }],
			'villager-house-3-spawn-to-neighbor'
		);
		const houses = [villagerHouse1Map, villagerHouse2Map, villagerHouse3Map];
		const signatures = houses.map(normalizedHouseSignature);
		for (let left = 0; left < signatures.length; left += 1) {
			for (let right = left + 1; right < signatures.length; right += 1) {
				expect(signatures[left]).not.toBe(signatures[right]);
			}
		}
	});

	it('exposes the Shrine luminous focal as a non-colliding fallback prop', () => {
		const focal = shrineOfAuroraInteriorMap.interiorProps?.find(
			(prop) => prop.id === 'shrine-of-aurora-luminous-focal'
		);
		expect(focal).toEqual({
			id: 'shrine-of-aurora-luminous-focal',
			x: 512,
			y: 256,
			width: 128,
			height: 64,
			frameName: 'hearthLamp'
		});
		expect(focal?.collision).toBeUndefined();
	});

	it('attaches the Shrine 64x56 navigation grid and keeps every processional route reachable', () => {
		const shrineLayout = VILLAGE_INTERIOR_LAYOUTS['shrine-of-aurora-interior'];
		const shrineSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
			(source) => source.mapId === 'shrine-of-aurora-interior'
		);
		const shrineGrid = GENERATED_NAVIGATION_GRIDS['shrine-of-aurora-interior-navigation'];
		expect(shrineSource).toBeDefined();
		expect(shrineGrid).toBeDefined();
		if (!shrineSource || !shrineGrid) return;

		expect(shrineSource).toMatchObject({
			id: 'shrine-of-aurora-interior-navigation',
			mapId: 'shrine-of-aurora-interior',
			cellSizePx: 16,
			widthCells: 64,
			heightCells: 56,
			clearancePx: 12
		});
		expect(shrineSource.rows).toHaveLength(56);
		expect(shrineSource.rows.every((row) => row.length === 64)).toBe(true);
		expect(shrineSource.rows).toEqual(
			buildVillageInteriorNavigationSource({
				mapId: 'shrine-of-aurora-interior',
				layout: shrineLayout
			}).rows
		);
		expect(shrineGrid).toEqual(compileNavigationGrid(shrineSource));
		expect(shrineGrid).toMatchObject({
			id: 'shrine-of-aurora-interior-navigation',
			mapId: 'shrine-of-aurora-interior',
			cellSizePx: 16,
			widthCells: 64,
			heightCells: 56,
			widthPx: 1024,
			heightPx: 896
		});
		expect(shrineOfAuroraInteriorMap.navigationGrid).toBe(shrineGrid);
		expect(shrineOfAuroraInteriorMap.navigationGridOwnedSources).toEqual(
			VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES
		);
		expect(shrineOfAuroraInteriorMap.npcs?.map((npc) => npc.id)).toEqual(['mott-shrine']);
		expect(shrineOfAuroraInteriorMap.ambientNpcs ?? []).toEqual([]);
		expect(shrineOfAuroraInteriorMap.width).toBe(32);
		expect(shrineOfAuroraInteriorMap.height).toBe(28);
		expect(shrineOfAuroraInteriorMap.spawn).toEqual({ x: 512, y: 784 });
		expect(shrineOfAuroraInteriorMap.transitions[0]).toMatchObject({
			id: 'shrine-of-aurora-to-overworld',
			x: 512,
			y: 880,
			toMapId: 'overworld',
			arrival: overworldDoorArrival('shrine-of-aurora-interior')
		});

		const routes = [
			[
				'procession-to-focal',
				[shrineOfAuroraInteriorMap.spawn, { x: 512, y: 704 }, { x: 512, y: 256 }]
			],
			[
				'procession-to-altar-sightline',
				[
					shrineOfAuroraInteriorMap.spawn,
					{ x: 512, y: 704 },
					{ x: 512, y: 256 },
					{ x: 336, y: 256 },
					{ x: 336, y: 96 },
					{ x: 512, y: 96 }
				]
			],
			[
				'procession-to-preparation',
				[
					shrineOfAuroraInteriorMap.spawn,
					{ x: 512, y: 624 },
					{ x: 344, y: 624 },
					{ x: 344, y: 512 },
					{ x: 232, y: 512 },
					{ x: 232, y: 368 },
					{ x: 96, y: 368 }
				]
			],
			[
				'procession-to-archive',
				[
					shrineOfAuroraInteriorMap.spawn,
					{ x: 512, y: 624 },
					{ x: 680, y: 624 },
					{ x: 680, y: 512 },
					{ x: 784, y: 512 },
					{ x: 784, y: 336 },
					{ x: 800, y: 336 }
				]
			],
			[
				'procession-to-exit',
				[shrineOfAuroraInteriorMap.spawn, shrineOfAuroraInteriorMap.transitions[0]!]
			]
		] as const;

		for (const [label, route] of routes) {
			expectRouteClear(shrineOfAuroraInteriorMap, route, `shrine-${label}`);
			for (let index = 1; index < route.length; index += 1) {
				const from = route[index - 1]!;
				const to = route[index]!;
				const distance = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
				const steps = Math.max(1, Math.ceil(distance / 16));
				for (let step = 0; step <= steps; step += 1) {
					const ratio = step / steps;
					const x = from.x + (to.x - from.x) * ratio;
					const y = from.y + (to.y - from.y) * ratio;
					expect(isWalkable(shrineGrid, x, y), `${label} blocked at (${x},${y})`).toBe(true);
				}
			}
		}
	});

	it('keeps Mira, counter clearance, and minimal interior props exact', () => {
		const mira = itemShopMap.npcs!.find((npc) => npc.id === 'mira');
		expect(mira).toMatchObject({
			id: 'mira',
			x: 416,
			y: 320,
			dialogueId: 'mira',
			role: 'shopkeeper',
			frameName: 'miraItemShopNpc',
			shopId: 'miras-item-shop'
		});
		expect(mira).toBeDefined();
		for (const point of [mira!, { x: 416, y: 360 }]) {
			expectPointClearOfInteriorPropCollisions(itemShopMap, point, 'mira-counter-clearance');
		}
		expect(itemShopMap.interiorProps?.map((prop) => prop.id)).toEqual([
			'item-shop-counter',
			'item-shop-west-display',
			'item-shop-east-display',
			'item-shop-stock-shelves',
			'item-shop-office-desk'
		]);
		expect(
			itemShopMap.interiorProps?.find((prop) => prop.id === 'item-shop-counter')?.collision
		).toEqual({ id: 'item-shop-counter-collision', x: 416, y: 340, width: 384, height: 8 });
		expect(itemShopMap.ambientNpcs).toEqual([
			{
				id: 'item-shop-customer',
				x: 256,
				y: 512,
				frameName: 'guildMasterNpc',
				role: 'shopper',
				hiddenDuring: storyWindows.afterRaid
			}
		]);
		expect(heroHouseMap.interiorProps?.map((prop) => prop.id)).toEqual([
			'hero-house-bed',
			'hero-house-study-storage',
			'hero-house-living-table',
			'hero-house-kitchen-storage'
		]);
		expect(heroHouseMap.interiorProps?.map((prop) => prop.collision)).toEqual([
			{ id: 'hero-house-bed-collision', x: 160, y: 160, width: 96, height: 96 },
			{ id: 'hero-house-study-storage-collision', x: 552, y: 160, width: 112, height: 96 },
			{ id: 'hero-house-living-table-collision', x: 280, y: 432, width: 112, height: 64 },
			{ id: 'hero-house-kitchen-storage-collision', x: 544, y: 392, width: 160, height: 144 }
		]);
		expect(heroHouseMap.backgroundImages).toBeUndefined();
		expect(itemShopMap.backgroundImages).toBeUndefined();
	});

	it('decorates rebuilt village interiors with bounded props and ambient NPCs', () => {
		const interiors = [
			heroHouseMap,
			guildHallMap,
			itemShopMap,
			villagerHouse1Map,
			villagerHouse2Map,
			villagerHouse3Map,
			shrineOfAuroraInteriorMap
		];
		const allAmbientNpcIds = new Set<string>();

		expect(heroHouseMap.interiorProps?.map((prop) => prop.id)).toEqual([
			'hero-house-bed',
			'hero-house-study-storage',
			'hero-house-living-table',
			'hero-house-kitchen-storage'
		]);
		expect(guildHallMap.interiorProps?.map((prop) => prop.id)).toContain('guild-hall-notice-board');
		expect(itemShopMap.interiorProps?.map((prop) => prop.id)).toContain('item-shop-counter');
		expect(villagerHouse1Map.interiorProps?.map((prop) => prop.id)).toContain(
			'villager-house-1-family-table'
		);
		expect(villagerHouse2Map.interiorProps?.map((prop) => prop.id)).toContain(
			'villager-house-2-workbench'
		);
		expect(villagerHouse3Map.interiorProps?.map((prop) => prop.id)).toContain(
			'villager-house-3-west-archive-shelves'
		);
		expect(shrineOfAuroraInteriorMap.interiorProps?.map((prop) => prop.frameName)).toEqual([
			'table',
			'hearthLamp',
			'bench',
			'bench',
			'crateStack',
			'bookshelf',
			'hearthLamp'
		]);
		expect(guildHallMap.ambientNpcs?.map((npc) => npc.id)).toEqual([
			'guild-hall-member-west',
			'guild-hall-member-east'
		]);
		expect(itemShopMap.ambientNpcs?.map((npc) => npc.id)).toEqual(['item-shop-customer']);

		for (const map of interiors) {
			const propIds = new Set<string>();

			for (const prop of map.interiorProps ?? []) {
				expect(propIds.has(prop.id), `${map.id}:${prop.id} duplicated`).toBe(false);
				propIds.add(prop.id);
				expect(Object.keys(interiorPropAsset.frames)).toContain(prop.frameName);
				expect(['floor', 'furniture', 'foreground', undefined]).toContain(prop.depth);
				expectRectInsideMap(prop, map);

				if (prop.collision) {
					expectRectInsideMap(prop.collision, map);
				}
			}

			for (const ambientNpc of map.ambientNpcs ?? []) {
				expect(allAmbientNpcIds.has(ambientNpc.id), ambientNpc.id).toBe(false);
				allAmbientNpcIds.add(ambientNpc.id);
				expectPointInsideMap(ambientNpc, map);
				expect(['miraItemShopNpc', 'quartermasterNpc', 'guildMasterNpc']).toContain(
					ambientNpc.frameName
				);
			}

			expectPointClearOfInteriorPropCollisions(map, map.spawn, 'spawn');
			expectPointClearOfInteriorPropCollisions(map, map.transitions[0], 'exit');
		}
	});

	it('defines village NPCs with stable ids and bounded coordinates', () => {
		const npcs = Object.values(maps).flatMap((map) => map.npcs ?? []);
		const roles = ['guild', 'shopkeeper', 'villager', 'home'];

		// Grik's family appears at home only in its story windows.
		expect(heroHouseMap.npcs?.map((npc) => npc.id)).toEqual([
			'mott-hearth',
			'tikka-home',
			'borak-home',
			'drogg-home'
		]);
		expect(shrineOfAuroraInteriorMap.npcs?.map((npc) => npc.id)).toEqual(['mott-shrine']);
		expect(guildHallMap.npcs).toMatchObject([
			{
				id: 'borak',
				x: 800,
				y: 144,
				nameKey: 'content.maps.npcs.borak.name',
				dialogueId: 'borak',
				role: 'guild',
				frameName: 'borakNpc'
			},
			{
				id: 'lodge-keeper',
				x: 816,
				y: 528,
				nameKey: 'content.maps.npcs.lodge-keeper.name',
				dialogueId: 'lodge-keeper',
				role: 'shopkeeper',
				frameName: 'quartermasterNpc',
				shopId: 'guild-quartermaster'
			},
			{ id: 'drogg-lodge', dialogueId: 'drogg-lodge', role: 'home' }
		]);
		expect(itemShopMap.npcs).toMatchObject([
			{
				id: 'mira',
				x: 416,
				y: 320,
				nameKey: 'content.maps.npcs.mira.name',
				dialogueId: 'mira',
				role: 'shopkeeper',
				frameName: 'miraItemShopNpc',
				shopId: 'miras-item-shop'
			},
			{ id: 'lirra-herb-hut', dialogueId: 'lirra-herb-hut', role: 'home' }
		]);
		expect(villagerHouse1Map.npcs).toMatchObject([
			{
				id: 'villager-lynn',
				x: VILLAGE_INTERIOR_LAYOUTS['villager-house-1'].npcApproaches.lynn.npc.x,
				y: VILLAGE_INTERIOR_LAYOUTS['villager-house-1'].npcApproaches.lynn.npc.y,
				nameKey: 'content.maps.npcs.villager-lynn.name',
				dialogueId: 'villager-lynn',
				role: 'villager',
				frameName: 'miraItemShopNpc'
			}
		]);
		expect(villagerHouse2Map.npcs).toMatchObject([
			{
				id: 'villager-toma',
				x: VILLAGE_INTERIOR_LAYOUTS['villager-house-2'].npcApproaches.toma.npc.x,
				y: VILLAGE_INTERIOR_LAYOUTS['villager-house-2'].npcApproaches.toma.npc.y,
				nameKey: 'content.maps.npcs.villager-toma.name',
				dialogueId: 'villager-toma',
				role: 'villager',
				frameName: 'quartermasterNpc'
			}
		]);
		expect(villagerHouse3Map.npcs).toMatchObject([
			{
				id: 'villager-io',
				x: 256,
				y: 224,
				nameKey: 'content.maps.npcs.villager-io.name',
				dialogueId: 'villager-io',
				role: 'villager',
				frameName: 'guildMasterNpc'
			}
		]);
		expect(new Set(npcs.map((npc) => npc.id)).size).toBe(npcs.length);

		for (const map of Object.values(maps)) {
			for (const npc of map.npcs ?? []) {
				expect(npc.name).toBe(expectEnglishMessage(npc.nameKey));
				expect(
					browserStoryCatalog.npcDialogues.find(({ npcId }) => npcId === npc.dialogueId)?.mapId,
					npc.dialogueId
				).toBe(map.id);
				expect(roles).toContain(npc.role);
				expect(npc.x).toBeGreaterThanOrEqual(0);
				expect(npc.y).toBeGreaterThanOrEqual(0);
				expect(npc.x).toBeLessThan(map.width * 32);
				expect(npc.y).toBeLessThan(map.height * 32);
				expect(npc.frameName).not.toBe('titleBadge');
				if (npc.shopId) {
					expect(getShop(npc.shopId)).toBeDefined();
					expect(npc.role).toBe('shopkeeper');
				}
			}
		}
	});

	it('keeps every story pack a fixed-size fight inside its own pocket', () => {
		for (const encounter of overworldMap.encounters ?? []) {
			expect(enemies[encounter.enemyId], encounter.id).toBeDefined();
			expect(encounter.count, encounter.id).toBeGreaterThanOrEqual(1);
			expect(encounter.activeDuring, `${encounter.id} is story-gated`).toBeDefined();
		}

		const encountersById = new Map(
			(overworldMap.encounters ?? []).map((encounter) => [encounter.id, encounter])
		);

		for (const combatBounds of overworldMap.combatBounds ?? []) {
			expectRectInsideMap(combatBounds, overworldMap);
			for (const encounterId of combatBounds.encounterIds) {
				const encounter = encountersById.get(encounterId);
				expect(encounter).toBeDefined();
				expectPointInsideRect(encounter!, combatBounds);
			}
		}
	});

	it('defines valid placed pickups with stable ids and item ids', () => {
		const pickups = Object.values(maps).flatMap((map) => map.pickups ?? []);

		expect(overworldMap.pickups ?? []).toEqual(
			expect.arrayContaining([
				{
					id: 'mistfen-salve',
					...anchorPoint('mistfen-salve'),
					itemId: 'sunleaf-salve',
					quantity: 1
				},
				{
					id: 'silverpine-tonic',
					...anchorPoint('silverpine-tonic'),
					itemId: 'field-potion',
					quantity: 1
				}
			])
		);
		expect(maps['ruins-threshold'].pickups).toEqual([
			{ id: 'ruins-threshold-cap', x: 1_728, y: 2_112, itemId: 'iron-cap', quantity: 1 },
			{
				id: 'ruins-threshold-rune',
				x: 3_584,
				y: 4_384,
				itemId: 'threshold-rune',
				quantity: 1
			},
			{
				id: 'ruins-threshold-salve',
				x: 2_048,
				y: 4_800,
				itemId: 'sunleaf-salve',
				quantity: 2
			}
		]);
		expect(maps['ruins-core'].pickups).toEqual([
			{ id: 'ruins-core-mail', x: 2_240, y: 2_048, itemId: 'stone-mail', quantity: 1 },
			{ id: 'ruins-core-draught', x: 3_584, y: 4_544, itemId: 'ruin-draught', quantity: 1 }
		]);

		expect(new Set(pickups.map((pickup) => pickup.id)).size).toBe(pickups.length);

		for (const map of Object.values(maps)) {
			for (const pickup of map.pickups ?? []) {
				expect(getItem(pickup.itemId)).toBeDefined();
				expect(pickup.quantity).toBeGreaterThan(0);
				expect(pickup.x).toBeGreaterThanOrEqual(0);
				expect(pickup.y).toBeGreaterThanOrEqual(0);
				expect(pickup.x).toBeLessThan(map.width * 32);
				expect(pickup.y).toBeLessThan(map.height * 32);
			}
		}
	});

	it('defines valid multi-encounters with stable ids and enemy definitions', () => {
		const encounters = Object.values(maps).flatMap((map) => map.encounters ?? []);

		expect(maps['ruins-threshold'].encounters).toEqual([
			{ id: 'threshold-crawlers', x: 3_200, y: 3_200, enemyId: 'tunnel-crawler', count: 3 }
		]);
		expect(maps['ruins-core'].encounters).toEqual([
			{ id: 'core-crawlers', x: 2_880, y: 3_200, enemyId: 'tunnel-crawler', count: 3 }
		]);
		expect(new Set(encounters.map((encounter) => encounter.id)).size).toBe(encounters.length);

		for (const map of Object.values(maps)) {
			for (const encounter of map.encounters ?? []) {
				expect(enemies[encounter.enemyId]).toBeDefined();
				expect(encounter.x).toBeGreaterThanOrEqual(0);
				expect(encounter.y).toBeGreaterThanOrEqual(0);
				expect(encounter.x).toBeLessThan(map.width * 32);
				expect(encounter.y).toBeLessThan(map.height * 32);
			}
		}
	});
});

describe('Hero House Gate 2 coordinate and navigation contracts', () => {
	it('attaches the generated grid and keeps fallback geometry derived from the layout', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['hero-house'];
		const source = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
			(value) => value.mapId === 'hero-house'
		);
		const grid = GENERATED_NAVIGATION_GRIDS['hero-house-navigation'];

		expect(source).toBeDefined();
		expect(grid).toBeDefined();
		if (!source || !grid) return;

		expect(grid).toEqual(compileNavigationGrid(source));
		expect(heroHouseMap.navigationGrid).toBe(grid);
		expect(heroHouseMap.navigationGridOwnedSources).toBe(VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES);
		expect(grid).toMatchObject({
			id: 'hero-house-navigation',
			mapId: 'hero-house',
			cellSizePx: 16,
			widthCells: 44,
			heightCells: 36,
			widthPx: 704,
			heightPx: 576
		});

		for (const wall of layout.walls) {
			expect(heroHouseMap.blockers).toContainEqual({
				...toMapRect(wall.id, wall),
				kind: 'ruin-wall'
			});
		}
		for (const [propId, collision] of Object.entries(layout.propCollisions)) {
			const suffix = propId.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
			const prop = heroHouseMap.interiorProps?.find((value) => value.id.endsWith(suffix));
			expect(prop, `${propId} prop is missing`).toBeDefined();
			expect(prop?.collision).toEqual({
				...toMapRect(`${prop?.id}-collision`, collision)
			});
		}
		for (const [id, value] of [
			['hero-house-full-floor', layout.fullFloor],
			['hero-house-room-bedroom', layout.rooms.bedroom],
			['hero-house-room-study', layout.rooms.study],
			['hero-house-room-living-kitchen', layout.rooms.livingKitchen],
			['hero-house-corridor-hall', layout.corridors.hall]
		] as const) {
			expect(heroHouseMap.groundPatches).toContainEqual({
				...toMapRect(id, value),
				tile:
					id === 'hero-house-corridor-hall'
						? 'pathTile'
						: id.endsWith('full-floor')
							? 'cobblestoneTile'
							: 'plazaStoneTile'
			});
		}
	});
});

describe('Guild Hall Gates 1/2 coordinate and navigation contracts', () => {
	it('attaches the generated grid and derives fallback geometry and anchors from the layout', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
		const source = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
			(value) => value.mapId === 'guild-hall'
		);
		const grid = GENERATED_NAVIGATION_GRIDS['guild-hall-navigation'];

		expect(source).toBeDefined();
		expect(grid).toBeDefined();
		if (!source || !grid) return;

		expect(grid).toEqual(compileNavigationGrid(source));
		expect(guildHallMap.navigationGrid).toBe(grid);
		expect(guildHallMap.navigationGridOwnedSources).toBe(VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES);
		expect(grid).toMatchObject({
			id: 'guild-hall-navigation',
			mapId: 'guild-hall',
			cellSizePx: 16,
			widthCells: 64,
			heightCells: 52,
			widthPx: 1024,
			heightPx: 832
		});

		expect(guildHallMap.width).toBe(layout.widthTiles);
		expect(guildHallMap.height).toBe(layout.heightTiles);
		expect(guildHallMap.spawn).toEqual(layout.spawn);
		expect(guildHallMap.transitions[0]).toMatchObject({ ...layout.exit });
		expect(guildHallMap.groundPatches).toContainEqual({
			...toMapRect('guild-hall-full-floor', layout.fullFloor),
			tile: 'cobblestoneTile'
		});
		for (const [id, value] of [
			['guild-hall-room-records', layout.rooms.recordsHall],
			['guild-hall-room-common', layout.rooms.commonHall],
			['guild-hall-room-master-office', layout.rooms.guildMasterOffice],
			['guild-hall-room-training', layout.rooms.trainingHall],
			['guild-hall-room-quartermaster', layout.rooms.quartermasterRoom],
			['guild-hall-corridor-spine', layout.corridors.mainSpine],
			['guild-hall-corridor-lobby', layout.corridors.entranceLobby]
		] as const) {
			expect(guildHallMap.groundPatches).toContainEqual({
				...toMapRect(id, value),
				tile: id.includes('corridor') ? 'pathTile' : 'plazaStoneTile'
			});
		}
		expect(guildHallMap.blockers).toEqual(
			layout.walls.map((wall) => ({ ...toMapRect(wall.id, wall), kind: 'ruin-wall' }))
		);
		for (const [id, value] of [
			['guild-hall-records-shelves', layout.propZones.recordsShelves],
			['guild-hall-notice-board', layout.propZones.questBoardRecordsDesk],
			['guild-hall-common-table', layout.propZones.commonTableSeating],
			['guild-hall-master-desk', layout.propZones.guildMasterStation],
			['guild-hall-training-equipment', layout.propZones.trainingEquipment],
			['guild-hall-quartermaster-counter', layout.propZones.quartermasterStation],
			['guild-hall-lobby-benches', layout.propZones.lobbyNoticeBenches]
		] as const) {
			expect(guildHallMap.interiorProps).toContainEqual(
				expect.objectContaining(toMapRect(id, value))
			);
		}

		for (const [propId, propIdInMap] of [
			['recordsShelves', 'guild-hall-records-shelves'],
			['questBoardRecordsDesk', 'guild-hall-notice-board'],
			['commonTableSeating', 'guild-hall-common-table'],
			['guildMasterDesk', 'guild-hall-master-desk'],
			['trainingEquipment', 'guild-hall-training-equipment'],
			['quartermasterCounter', 'guild-hall-quartermaster-counter']
		] as const) {
			const collision = layout.propCollisions[propId];
			const prop = guildHallMap.interiorProps?.find((value) => value.id === propIdInMap);
			expect(prop, `${propId} prop is missing`).toBeDefined();
			expect(prop?.collision).toEqual({ ...toMapRect(`${prop?.id}-collision`, collision) });
		}

		expect(guildHallMap.npcs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'borak',
					x: layout.npcApproaches.guildMaster.npc.x,
					y: layout.npcApproaches.guildMaster.npc.y,
					dialogueId: 'borak',
					role: 'guild'
				}),
				expect.objectContaining({
					id: 'lodge-keeper',
					x: layout.npcApproaches.quartermaster.npc.x,
					y: layout.npcApproaches.quartermaster.npc.y,
					dialogueId: 'lodge-keeper',
					role: 'shopkeeper',
					shopId: 'guild-quartermaster'
				})
			])
		);

		expect(guildHallMap.ambientNpcs?.map(({ id, x, y }) => ({ id, x, y }))).toEqual(
			Object.entries(layout.ambientActivity ?? {}).map(([id, point]) => ({ ...point, id }))
		);
	});

	it('keeps every Guild Hall function connected through the authored 96/64px routes', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
		const routes = [
			[guildHallMap.spawn, { x: 512, y: 184 }, layout.npcApproaches.guildMaster.approach],
			[guildHallMap.spawn, { x: 512, y: 568 }, layout.npcApproaches.quartermaster.approach],
			[guildHallMap.spawn, { x: 512, y: 208 }, { x: 240, y: 208 }],
			[
				guildHallMap.spawn,
				{ x: 512, y: 512 },
				{ x: 384, y: 512 },
				{ x: 384, y: 568 },
				{ x: 112, y: 568 },
				{ x: 112, y: 592 },
				{ x: 160, y: 592 }
			],
			[guildHallMap.spawn, { x: 512, y: 336 }, { x: 912, y: 336 }, { x: 912, y: 368 }],
			[guildHallMap.spawn, { x: layout.exit.x, y: layout.exit.y }]
		] as const;
		for (const [index, route] of routes.entries()) {
			expectRouteClear(guildHallMap, route, `guild-hall-function-${index}`);
			for (let segment = 1; segment < route.length; segment += 1) {
				const from = route[segment - 1]!;
				const to = route[segment]!;
				const distance = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
				const steps = Math.max(1, Math.ceil(distance / 16));
				for (let step = 0; step <= steps; step += 1) {
					const progress = step / steps;
					const point = {
						x: from.x + (to.x - from.x) * progress,
						y: from.y + (to.y - from.y) * progress
					};
					expect(
						isWalkable(guildHallMap.navigationGrid!, point.x, point.y),
						`route ${index} is blocked`
					).toBe(true);
				}
			}
		}
	});
});

describe('Villager House 1 Gates 1/2 coordinate and navigation contracts', () => {
	it('attaches the generated grid and derives fallback geometry and live anchors from the layout', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['villager-house-1'];
		const source = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
			(value) => value.mapId === 'villager-house-1'
		);
		const grid = GENERATED_NAVIGATION_GRIDS['villager-house-1-navigation'];

		expect(source).toBeDefined();
		expect(grid).toBeDefined();
		if (!source || !grid) return;

		expect(grid).toEqual(compileNavigationGrid(source));
		expect(villagerHouse1Map.navigationGrid).toBe(grid);
		expect(villagerHouse1Map.navigationGridOwnedSources).toBe(
			VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES
		);
		expect(grid).toMatchObject({
			id: 'villager-house-1-navigation',
			mapId: 'villager-house-1',
			cellSizePx: 16,
			widthCells: 80,
			heightCells: 52,
			widthPx: 1280,
			heightPx: 832
		});

		expect(villagerHouse1Map.width).toBe(layout.widthTiles);
		expect(villagerHouse1Map.height).toBe(layout.heightTiles);
		expect(villagerHouse1Map.spawn).toEqual(layout.spawn);
		expect(villagerHouse1Map.transitions[0]).toMatchObject({
			...layout.exit,
			toMapId: 'overworld'
		});
		expectAcceptedInteriorGeometry(villagerHouse1Map, layout, 'villager-house-1');

		for (const [id, zone] of Object.entries(layout.propZones)) {
			const propId = `villager-house-1-${id.replace(/^familyTable$/, 'family-table')}`;
			const collision = layout.propCollisions[id as keyof typeof layout.propCollisions];
			expect(collision, `${id} collision core is missing`).toBeDefined();
			if (!collision) return;
			expect(rectContains(zone, collision), `${id} collision core escapes its prop zone`).toBe(
				true
			);
			expect(villagerHouse1Map.interiorProps).toContainEqual(
				expect.objectContaining({
					...toMapRect(propId, zone),
					collision: toMapRect(`${propId}-collision`, collision)
				})
			);
		}
		expect(villagerHouse1Map.npcs).toEqual([
			expect.objectContaining({
				id: 'villager-lynn',
				x: layout.npcApproaches.lynn.npc.x,
				y: layout.npcApproaches.lynn.npc.y,
				dialogueId: 'villager-lynn',
				role: 'villager'
			})
		]);
		expect(villagerHouse1Map.ambientNpcs?.map(({ id, x, y }) => ({ id, x, y }))).toEqual(
			Object.entries(layout.ambientActivity ?? {}).map(([id, point]) => ({ ...point, id }))
		);
	});

	it('keeps the family entrance axis, domestic rooms, family activity, and Lynn approach connected', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['villager-house-1'];
		const routes = [
			[villagerHouse1Map.spawn, { x: 640, y: 416 }, { x: 640, y: 224 }, { x: 256, y: 224 }],
			[villagerHouse1Map.spawn, { x: 640, y: 416 }, { x: 640, y: 224 }, { x: 1000, y: 224 }],
			[villagerHouse1Map.spawn, { x: 800, y: 672 }, { x: 800, y: 544 }],
			[villagerHouse1Map.spawn, { x: 640, y: 544 }, layout.npcApproaches.lynn.approach],
			[villagerHouse1Map.spawn, { x: 432, y: 672 }, { x: 432, y: 448 }],
			[villagerHouse1Map.spawn, { x: 880, y: 672 }, { x: 880, y: 448 }],
			[villagerHouse1Map.spawn, villagerHouse1Map.transitions[0]!]
		] as const;
		for (const [index, route] of routes.entries()) {
			expectRouteClear(villagerHouse1Map, route, `villager-house-1-function-${index}`);
			for (let segment = 1; segment < route.length; segment += 1) {
				const from = route[segment - 1]!;
				const to = route[segment]!;
				const distance = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
				const steps = Math.max(1, Math.ceil(distance / 16));
				for (let step = 0; step <= steps; step += 1) {
					const progress = step / steps;
					const point = {
						x: from.x + (to.x - from.x) * progress,
						y: from.y + (to.y - from.y) * progress
					};
					expect(
						isWalkable(villagerHouse1Map.navigationGrid!, point.x, point.y),
						`route ${index} is blocked`
					).toBe(true);
				}
			}
		}

		const family = layout.ambientActivity!['villager-house-1-family'];
		const lynn = villagerHouse1Map.npcs!.find((npc) => npc.id === 'villager-lynn')!;
		expectPointClearOfInteriorPropCollisions(villagerHouse1Map, lynn, 'lynn');
		expectPointClearOfInteriorPropCollisions(
			villagerHouse1Map,
			layout.npcApproaches.lynn.approach,
			'lynn-approach'
		);
		expect(
			Math.hypot(
				layout.npcApproaches.lynn.approach.x - lynn.x,
				layout.npcApproaches.lynn.approach.y - lynn.y
			),
			'Lynn approach must be within interaction radius'
		).toBeLessThanOrEqual(NPC_INTERACTION_RADIUS + PLAYER_COLLISION_RADIUS);
		expect(isWalkable(villagerHouse1Map.navigationGrid!, family.x, family.y)).toBe(true);
	});
});

describe('Item Shop Gates 1/2 coordinate and navigation contracts', () => {
	it('attaches the generated grid and derives fallback geometry and live anchors from the layout', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
		const source = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find((value) => value.mapId === 'item-shop');
		const grid = GENERATED_NAVIGATION_GRIDS['item-shop-navigation'];

		expect(source).toBeDefined();
		expect(grid).toBeDefined();
		if (!source || !grid) return;

		expect(grid).toEqual(compileNavigationGrid(source));
		expect(itemShopMap.navigationGrid).toBe(grid);
		expect(itemShopMap.navigationGridOwnedSources).toBe(VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES);
		expect(grid).toMatchObject({
			id: 'item-shop-navigation',
			mapId: 'item-shop',
			cellSizePx: 16,
			widthCells: 52,
			heightCells: 40,
			widthPx: 832,
			heightPx: 640
		});

		expect(itemShopMap.width).toBe(layout.widthTiles);
		expect(itemShopMap.height).toBe(layout.heightTiles);
		expect(itemShopMap.spawn).toEqual(layout.spawn);
		expect(itemShopMap.transitions[0]).toMatchObject({ ...layout.exit });
		expect(itemShopMap.blockers).toEqual(
			layout.walls.map((wall) => ({ ...toMapRect(wall.id, wall), kind: 'ruin-wall' }))
		);
		expect(itemShopMap.groundPatches).toEqual([
			{
				...toMapRect('item-shop-full-floor', layout.fullFloor),
				tile: 'cobblestoneTile'
			},
			...Object.entries(layout.rooms).map(([id, value]) => ({
				...toMapRect(
					`item-shop-room-${id.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
					value
				),
				tile: 'plazaStoneTile'
			})),
			...Object.entries(layout.corridors).map(([id, value]) => ({
				...toMapRect(
					`item-shop-corridor-${id.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
					value
				),
				tile: 'pathTile'
			}))
		]);

		const propsById = new Map((itemShopMap.interiorProps ?? []).map((prop) => [prop.id, prop]));
		for (const [id, zone] of Object.entries(layout.propZones)) {
			const propId = `item-shop-${id
				.replace(/^miraCounter$/, 'counter')
				.replace(/^westDisplay$/, 'west-display')
				.replace(/^eastDisplay$/, 'east-display')
				.replace(/^stockShelves$/, 'stock-shelves')
				.replace(/^officeDesk$/, 'office-desk')}`;
			expect(propsById.get(propId), `${propId} prop is missing`).toEqual(
				expect.objectContaining(toMapRect(propId, zone))
			);
		}
		for (const [id, collision] of Object.entries(layout.propCollisions)) {
			const propId = `item-shop-${id
				.replace(/^miraCounter$/, 'counter')
				.replace(/^westDisplay$/, 'west-display')
				.replace(/^eastDisplay$/, 'east-display')
				.replace(/^stockShelves$/, 'stock-shelves')
				.replace(/^officeDesk$/, 'office-desk')}`;
			expect(propsById.get(propId)?.collision, `${propId} collision is missing`).toEqual(
				toMapRect(`${propId}-collision`, collision)
			);
		}

		expect(itemShopMap.npcs).toEqual([
			expect.objectContaining({
				id: 'mira',
				x: layout.npcApproaches.mira.npc.x,
				y: layout.npcApproaches.mira.npc.y,
				dialogueId: 'mira',
				role: 'shopkeeper',
				shopId: 'miras-item-shop'
			}),
			expect.objectContaining({ id: 'lirra-herb-hut', role: 'home' })
		]);
		expect(getShop('miras-item-shop')).toBeDefined();
		expect(
			itemShopMap.ambientNpcs?.map(({ id, x, y, frameName, role }) => ({
				id,
				x,
				y,
				frameName,
				role
			}))
		).toEqual([
			{
				id: 'item-shop-customer',
				...layout.ambientActivity!['item-shop-customer'],
				frameName: 'guildMasterNpc',
				role: 'shopper'
			}
		]);
	});

	it('keeps the entrance, shop counter, displays, stockroom, and office connected', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
		const routes = [
			[itemShopMap.spawn, layout.npcApproaches.mira.approach],
			[
				itemShopMap.spawn,
				{ x: 720, y: 544 },
				{ x: 720, y: 272 },
				{ x: 416, y: 272 },
				{ x: 416, y: 144 },
				{ x: 288, y: 144 },
				{ x: 288, y: 192 }
			],
			[
				itemShopMap.spawn,
				{ x: 720, y: 544 },
				{ x: 720, y: 272 },
				{ x: 416, y: 272 },
				{ x: 416, y: 144 },
				{ x: 528, y: 144 },
				{ x: 528, y: 192 },
				{ x: 736, y: 192 }
			],
			[itemShopMap.spawn, { x: 240, y: 544 }, { x: 240, y: 448 }],
			[itemShopMap.spawn, { x: 592, y: 544 }, { x: 592, y: 448 }],
			[itemShopMap.spawn, { x: 256, y: 544 }, { x: 256, y: 512 }],
			[itemShopMap.spawn, itemShopMap.transitions[0]!]
		] as const;
		for (const [index, route] of routes.entries()) {
			expectRouteClear(itemShopMap, route, `item-shop-function-${index}`);
			for (let segment = 1; segment < route.length; segment += 1) {
				const from = route[segment - 1]!;
				const to = route[segment]!;
				const distance = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
				const steps = Math.max(1, Math.ceil(distance / 16));
				for (let step = 0; step <= steps; step += 1) {
					const progress = step / steps;
					const point = {
						x: from.x + (to.x - from.x) * progress,
						y: from.y + (to.y - from.y) * progress
					};
					expect(
						isWalkable(itemShopMap.navigationGrid!, point.x, point.y),
						`route ${index} is blocked`
					).toBe(true);
				}
			}
		}

		const mira = itemShopMap.npcs!.find((npc) => npc.id === 'mira')!;
		expectPointClearOfInteriorPropCollisions(itemShopMap, mira, 'mira');
		expectPointClearOfInteriorPropCollisions(
			itemShopMap,
			layout.npcApproaches.mira.approach,
			'mira-approach'
		);
		expect(
			Math.hypot(
				layout.npcApproaches.mira.approach.x - mira.x,
				layout.npcApproaches.mira.approach.y - mira.y
			),
			'mira approach must be within interaction radius'
		).toBeLessThanOrEqual(NPC_INTERACTION_RADIUS + PLAYER_COLLISION_RADIUS);
	});
});

describe('MapDecor compile-time frame safety', () => {
	// Sink that forces an object literal to be checked against the MapDecor union.
	function acceptDecor(_decor: MapDecor) {
		// intentionally empty: existence of the typed parameter is the assertion
	}

	it('rejects a frameName that does not belong to its textureKey sheet', () => {
		// Valid: 'torii' is a real coast-dressing frame.
		acceptDecor({
			id: 'valid',
			x: 0,
			y: 0,
			width: 1,
			height: 1,
			textureKey: coastDressingAsset.key,
			frameName: 'torii'
		});

		// If the union regresses to bare `string`, this directive becomes unused
		// and svelte-check fails — proving the typo protection is intact. The
		// directive must sit directly above the offending property because TS
		// reports the assignability error on `frameName`, not on the call site.
		acceptDecor({
			id: 'bad',
			x: 0,
			y: 0,
			width: 1,
			height: 1,
			textureKey: coastDressingAsset.key,
			// @ts-expect-error 'toriii' is not a CoastDressingFrameName
			frameName: 'toriii'
		});

		expect(coastDressingAsset.frames).toHaveProperty('torii');
	});
});

type Pt = { x: number; y: number };

function segmentSamples(a: Pt, b: Pt, stepPx: number): Pt[] {
	const distance = Math.hypot(b.x - a.x, b.y - a.y);
	const steps = Math.max(1, Math.ceil(distance / stepPx));
	const samples: Pt[] = [];
	for (let i = 0; i <= steps; i += 1) {
		const t = i / steps;
		samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
	}
	return samples;
}

function localeHasPath(source: unknown, key: string): boolean {
	let current: unknown = source;
	for (const segment of key.split('.')) {
		if (typeof current !== 'object' || current === null) return false;
		current = (current as Record<string, unknown>)[segment];
	}
	return typeof current === 'string' && current.trim().length > 0;
}

describe('discovery content', () => {
	const discoveries = overworldMap.discoveries ?? [];

	it('places at least the curated discovery set', () => {
		expect(discoveries.length).toBeGreaterThanOrEqual(6);
	});

	it.each(discoveries)('discovery $id is valid and localized in all locales', (discovery) => {
		expectRectInsideMap({ x: discovery.x, y: discovery.y, width: 2, height: 2 }, overworldMap);
		// Story discoveries play a compiled scene instead of a short examine text.
		if (discovery.sceneId) {
			expect(
				browserStoryCatalog.scenes.some((scene) => scene.id === discovery.sceneId),
				discovery.sceneId
			).toBe(true);
		}
		for (const key of [discovery.labelKey, discovery.descriptionKey ?? discovery.labelKey]) {
			expectEnglishMessage(key);
			expect(localeHasPath(en, key), `en missing ${key}`).toBe(true);
			expect(localeHasPath(ja, key), `ja missing ${key}`).toBe(true);
			expect(localeHasPath(zhHant, key), `zh-Hant missing ${key}`).toBe(true);
		}
	});
});
