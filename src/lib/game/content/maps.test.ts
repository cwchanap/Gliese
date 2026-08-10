import { describe, expect, it } from 'vitest';
import { enemies } from '$lib/game/content/enemies';
import { getDialogue } from '$lib/game/content/dialogue';
import { mergeRegions } from '$lib/game/content/maps/meadow-entry';
import { STEPS } from '$lib/game/content/maps/layered/geometry';
import { VILLAGE_INTERIOR_EXTERIORS } from '$lib/game/content/maps/layouts/meadow-entry-v2';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';
import { en } from '$lib/game/i18n/messages/en';
import { ja } from '$lib/game/i18n/messages/ja';
import { zhHant } from '$lib/game/i18n/messages/zh-Hant';
import {
	coastDressingAsset,
	crossroadsDressingAsset,
	villageDressingAsset,
	forestDressingAsset,
	interiorPropAsset,
	isNpcPackFrameName,
	marshDressingAsset,
	shrineDressingAsset,
	terrainTilesAsset
} from '$lib/game/content/assets';
import { getItem } from '$lib/game/content/items';
import { getShop } from '$lib/game/content/shops';
import {
	NPC_INTERACTION_RADIUS,
	NPC_PACK_COLLISION_RADIUS,
	PLAYER_COLLISION_RADIUS,
	STARTER_NPC_COLLISION_RADIUS
} from '$lib/game/core/collision';
import { t } from '$lib/game/i18n/translate';
import {
	guildHallMap,
	heroHouseMap,
	itemShopMap,
	maps,
	meadowEntryMap,
	ruinsCoreMap,
	ruinsThresholdMap,
	shrineOfAuroraInteriorMap,
	villagerHouse1Map,
	villagerHouse2Map,
	villagerHouse3Map
} from '$lib/game/content/maps';
import type { MapDecor, WorldMapDefinition } from '$lib/game/content/maps';
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

function expectRectInsideMap(rect: CenterRect, map = meadowEntryMap) {
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

/**
 * Two center-based rects are "contiguous" when they share an edge or overlap —
 * the geometric definition of a connected path network. Inclusive bounds so an
 * exactly-touching seam still counts as connected.
 */
function rectsAreContiguous(a: CenterRect, b: CenterRect): boolean {
	return (
		a.x - a.width / 2 <= b.x + b.width / 2 &&
		a.x + a.width / 2 >= b.x - b.width / 2 &&
		a.y - a.height / 2 <= b.y + b.height / 2 &&
		a.y + a.height / 2 >= b.y - b.height / 2
	);
}

/**
 * Allow-list of the stable SW village landmark cohort. New regions (Mistfen,
 * Silverpine, Tidewatch, Crossroads, …) add their own landmarks to the composed
 * meadow-entry map; selecting the village cohort positively means those regions
 * require zero edits to the geography test. `whispering-cave` is NE forest and is
 * asserted separately, so it is intentionally excluded here.
 */
const VILLAGE_LANDMARK_IDS = new Set([
	'hero-house-exterior',
	'guild-hall-exterior',
	'item-shop-exterior',
	'villager-house-1-exterior',
	'villager-house-2-exterior',
	'villager-house-3-exterior',
	'blacksmith',
	'shrine-of-aurora'
]);

const CANOPY_DECOR_IDS = new Set(['wildwood-north-canopy', 'wildwood-east-canopy']);

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

function getTestNpcBodyRadius(npc: NonNullable<WorldMapDefinition['npcs']>[number]) {
	return (
		PLAYER_COLLISION_RADIUS +
		(isNpcPackFrameName(npc.frameName) ? NPC_PACK_COLLISION_RADIUS : STARTER_NPC_COLLISION_RADIUS)
	);
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
	const routeCollisionRects = [...collectStrictCollisionRects(map), ...collectLandmarkRects(map)];
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

	it('declares a bottom-left village spawn, peaceful building doors, forest combat pockets, and ruins exit', () => {
		expect(meadowEntryMap.width).toBe(200);
		expect(meadowEntryMap.height).toBe(200);
		expect(meadowEntryMap.spawnDirection).toBe('up');
		expect(meadowEntryMap.spawn).toEqual({ x: 704, y: 5_920 });
		expect(meadowEntryMap.combatBounds?.map((bounds) => bounds.id)).toEqual([
			'wildwood-north-combat-pocket',
			'wildwood-crossing-combat-pocket',
			'whispering-cave-combat-pocket'
		]);
		expect(meadowEntryMap.transitions).toEqual(
			expect.arrayContaining([
				{
					id: 'meadow-to-hero-house',
					x: 704,
					y: 5_856,
					toMapId: 'hero-house',
					showMarker: false,
					arrival: { x: 256, y: 224, facing: 'up' }
				},
				{
					id: 'meadow-to-item-shop',
					x: 704,
					y: 5_184,
					toMapId: 'item-shop',
					showMarker: false,
					arrival: { x: 256, y: 288, facing: 'up' }
				},
				{
					id: 'meadow-to-villager-house-1',
					x: 672,
					y: 4_384,
					toMapId: 'villager-house-1',
					showMarker: false,
					arrival: { x: 256, y: 288, facing: 'up' }
				},
				{
					id: 'meadow-to-villager-house-2',
					x: 1_376,
					y: 4_384,
					toMapId: 'villager-house-2',
					showMarker: false,
					arrival: { x: 256, y: 288, facing: 'up' }
				},
				{
					id: 'meadow-to-guild-hall',
					x: 2_272,
					y: 4_416,
					toMapId: 'guild-hall',
					showMarker: false,
					arrival: { x: 512, y: 736, facing: 'up' }
				},
				{
					id: 'meadow-to-shrine-of-aurora',
					x: 2_272,
					y: 5_856,
					toMapId: 'shrine-of-aurora-interior',
					showMarker: false,
					arrival: { x: 256, y: 288, facing: 'up' }
				},
				{
					id: 'meadow-to-villager-house-3',
					x: 1_472,
					y: 5_856,
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
			])
		);
		expect(meadowEntryMap.transitions).toHaveLength(8);
		expect(meadowEntryMap.encounters).toEqual([
			{ id: 'meadow-slime-west', x: 4_928, y: 960, enemyId: 'slime-scout' },
			{ id: 'meadow-slime-center', x: 5_360, y: 1_280, enemyId: 'slime-scout' },
			{ id: 'meadow-slime-east', x: 5_920, y: 1_600, enemyId: 'slime-scout' }
		]);
		expect(
			meadowEntryMap.transitions.find((transition) =>
				transition.id.includes('whispering-cave-ruins-threshold')
			)
		).toMatchObject({
			toMapId: 'ruins-threshold',
			requiresClear: true,
			questRequirement: {
				questId: 'investigate-the-ruins',
				objectiveId: 'talk-to-guild-master'
			}
		});
		expect(
			meadowEntryMap.transitions
				.filter((transition) => !transition.id.includes('whispering-cave-ruins-threshold'))
				.every((transition) => transition.requiresClear !== true)
		).toBe(true);
	});

	it('keeps the V2 village landmarks and painted road fragment in the meadow map', () => {
		expect(meadowEntryMap.landmarks?.map((landmark) => landmark.id)).toEqual(
			expect.arrayContaining([
				'hero-house-exterior',
				'guild-hall-exterior',
				'item-shop-exterior',
				'villager-house-1-exterior',
				'villager-house-2-exterior',
				'villager-house-3-exterior',
				'blacksmith',
				'shrine-of-aurora'
			])
		);
		expect(
			meadowEntryMap.mapDecor?.filter((decor) => decor.id.startsWith('village-decor-'))
		).toHaveLength(4);
		expect(meadowEntryMap.blockers?.map((blocker) => blocker.id)).toEqual(
			expect.arrayContaining([
				'meadow-north-boundary',
				'meadow-west-boundary',
				'meadow-east-boundary',
				'meadow-south-boundary'
			])
		);
	});

	it('declares explicit arrival points for village doors and ruin doorway returns', () => {
		expect(
			meadowEntryMap.transitions.find((transition) => transition.id === 'meadow-to-hero-house')
		).toMatchObject({
			toMapId: 'hero-house',
			arrival: { x: 256, y: 224, facing: 'up' }
		});
		expect(heroHouseMap.transitions).toEqual([
			{
				id: 'hero-house-to-meadow',
				x: 256,
				y: 336,
				toMapId: 'meadow-entry',
				arrival: { x: 704, y: 5_920, facing: 'down' }
			}
		]);
		const villageInteriors = [
			heroHouseMap,
			guildHallMap,
			itemShopMap,
			villagerHouse1Map,
			villagerHouse2Map,
			villagerHouse3Map,
			shrineOfAuroraInteriorMap
		];

		for (const interior of villageInteriors) {
			const inbound = meadowEntryMap.transitions.find(
				(transition) => transition.toMapId === interior.id
			);
			expect(inbound).toBeDefined();
			expect(inbound!.arrival).toEqual({
				...interior.spawn,
				facing: interior.spawnDirection
			});
		}
		expect(
			meadowEntryMap.transitions.find((transition) =>
				transition.id.includes('whispering-cave-ruins-threshold')
			)
		).toMatchObject({
			toMapId: 'ruins-threshold',
			arrival: { x: 512, y: 3_200, facing: 'right' }
		});
		expect(
			ruinsThresholdMap.transitions.find((transition) => transition.id === 'threshold-to-meadow')
		).toMatchObject({
			toMapId: 'meadow-entry',
			arrival: { x: 5_760, y: 1_868, facing: 'left' }
		});
		expect(ruinsThresholdMap.transitions).toEqual([
			{
				id: 'threshold-to-meadow',
				x: 256,
				y: 3_200,
				toMapId: 'meadow-entry',
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
			'meadow-arrival-to-core-stair'
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
			[spineLobby, { x: 512, y: 208 }, { x: 192, y: 208 }],
			'spine-to-records-hall'
		);
		expectRouteClear(
			guildHallMap,
			[spineLobby, { x: 512, y: 368 }, { x: 800, y: 368 }],
			'spine-to-training-hall'
		);
		expectRouteClear(
			guildHallMap,
			[spineLobby, { x: 512, y: 568 }, quartermasterApproach],
			'spine-to-quartermaster'
		);
		expectRouteClear(guildHallMap, [spawn, { x: 512, y: 816 }], 'guild-spawn-to-exit');

		const guildMaster = guildHallMap.npcs!.find((npc) => npc.id === 'guild-master')!;
		const quartermaster = guildHallMap.npcs!.find((npc) => npc.id === 'guild-quartermaster')!;

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
		for (const map of [meadowEntryMap, ruinsThresholdMap, ruinsCoreMap]) {
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

	it('returns from the ruins near the city stair and clear of meadow blockers', () => {
		const cityToRuins = meadowEntryMap.transitions.find((transition) =>
			transition.id.includes('whispering-cave-ruins-threshold')
		);
		const ruinsToCity = ruinsThresholdMap.transitions.find(
			(transition) => transition.id === 'threshold-to-meadow'
		);

		expect(cityToRuins).toBeDefined();
		expect(ruinsToCity?.arrival).toBeDefined();

		const arrival = ruinsToCity!.arrival!;
		expect(Math.hypot(arrival.x - cityToRuins!.x, arrival.y - cityToRuins!.y)).toBeLessThanOrEqual(
			256
		);
		for (const blocker of meadowEntryMap.blockers ?? []) {
			expect(isPointInsideRect(arrival, blocker)).toBe(false);
		}
	});

	it('registers compact village interiors and the expanded Guild Hall', () => {
		const compactInteriors = [
			heroHouseMap,
			itemShopMap,
			villagerHouse1Map,
			villagerHouse2Map,
			villagerHouse3Map,
			shrineOfAuroraInteriorMap
		];

		expect(maps['hero-house']).toBe(heroHouseMap);
		expect(maps['item-shop']).toBe(itemShopMap);
		expect(maps['villager-house-1']).toBe(villagerHouse1Map);
		expect(maps['villager-house-2']).toBe(villagerHouse2Map);
		expect(maps['villager-house-3']).toBe(villagerHouse3Map);
		expect(maps['shrine-of-aurora-interior']).toBe(shrineOfAuroraInteriorMap);

		for (const map of compactInteriors) {
			expect(map.width).toBe(16);
			expect(map.height).toBe(12);
			expect(map.transitions).toHaveLength(1);
			expect(map.transitions[0].toMapId).toBe('meadow-entry');
		}

		expect(maps['guild-hall']).toBe(guildHallMap);
		expect(guildHallMap.width).toBe(32);
		expect(guildHallMap.height).toBe(26);
		expect(guildHallMap.spawnDirection).toBe('up');
		expect(guildHallMap.spawn).toEqual({ x: 512, y: 736 });
		expect(guildHallMap.transitions[0]).toMatchObject({
			id: 'guild-hall-to-meadow',
			x: 512,
			y: 816,
			toMapId: 'meadow-entry',
			arrival: { x: 2272, y: 4480, facing: 'down' }
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
					id: 'guild-master',
					x: 800,
					y: 144,
					dialogueId: 'guild-master',
					role: 'guild'
				}),
				expect.objectContaining({
					id: 'guild-quartermaster',
					x: 816,
					y: 528,
					dialogueId: 'guild-quartermaster',
					role: 'shopkeeper',
					shopId: 'guild-quartermaster'
				})
			])
		);
		expect(getShop('guild-quartermaster')).toBeDefined();
		expect(guildHallMap.transitions[0].arrival).toEqual({
			x: 2_272,
			y: 4_480,
			facing: 'down'
		});
	});

	it('decorates compact village interiors with bounded props and ambient NPCs', () => {
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
			'hero-house-rug',
			'hero-house-bed',
			'hero-house-table',
			'hero-house-bookshelf',
			'hero-house-crates',
			'hero-house-plant'
		]);
		expect(guildHallMap.interiorProps?.map((prop) => prop.id)).toContain('guild-hall-notice-board');
		expect(itemShopMap.interiorProps?.map((prop) => prop.id)).toContain('item-shop-counter');
		expect(villagerHouse1Map.interiorProps?.map((prop) => prop.id)).toContain(
			'villager-house-1-family-table'
		);
		expect(villagerHouse2Map.interiorProps?.map((prop) => prop.id)).toContain(
			'villager-house-2-work-table'
		);
		expect(villagerHouse3Map.interiorProps?.map((prop) => prop.id)).toContain(
			'villager-house-3-bookshelf'
		);
		expect(shrineOfAuroraInteriorMap.interiorProps?.map((prop) => prop.id)).toEqual([
			'shrine-of-aurora-rug',
			'shrine-of-aurora-west-lamp',
			'shrine-of-aurora-east-lamp',
			'shrine-of-aurora-west-bench',
			'shrine-of-aurora-east-bench',
			'shrine-of-aurora-offerings',
			'shrine-of-aurora-plant',
			'shrine-of-aurora-bookshelf'
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

	it('places interior return arrivals outside the exterior doorway trigger radius', () => {
		const triggerRadius = 30;
		const exteriorTransitions = new Map(
			meadowEntryMap.transitions.map((transition) => [transition.toMapId, transition])
		);

		for (const interiorMap of [
			heroHouseMap,
			guildHallMap,
			itemShopMap,
			villagerHouse1Map,
			villagerHouse2Map,
			villagerHouse3Map,
			shrineOfAuroraInteriorMap
		]) {
			const returnTransition = interiorMap.transitions[0];
			const exteriorTransition = exteriorTransitions.get(interiorMap.id);
			expect(exteriorTransition).toBeDefined();
			expect(returnTransition.arrival).toBeDefined();

			const distance = Math.hypot(
				returnTransition.arrival!.x - exteriorTransition!.x,
				returnTransition.arrival!.y - exteriorTransition!.y
			);

			expect(distance).toBeGreaterThan(triggerRadius);
		}
	});

	it('keeps interior return arrivals close to their exterior door', () => {
		// Originally this asserted arrival.x === door.x exactly. That is not a
		// property the map can always satisfy: guild-hall, villager-house-3 and
		// shrine-of-aurora each sit in a standable band too shallow to hold the
		// conventional 40px-south arrival, so their arrivals are offset EAST and
		// their x deliberately differs from the door's. What must hold is that the
		// player still lands recognisably at the door they used — within 1.25
		// tiles on x (TILE + TILE/4 = 40px). Standability and trigger clearance
		// are asserted separately, in "interior return arrivals are standable".
		const TILE = 32;
		const exteriorTransitions = new Map(
			meadowEntryMap.transitions.map((transition) => [transition.toMapId, transition])
		);

		for (const interiorMap of [
			heroHouseMap,
			guildHallMap,
			itemShopMap,
			villagerHouse1Map,
			villagerHouse2Map,
			villagerHouse3Map,
			shrineOfAuroraInteriorMap
		]) {
			const returnTransition = interiorMap.transitions[0];
			const exteriorTransition = exteriorTransitions.get(interiorMap.id);
			expect(exteriorTransition).toBeDefined();
			expect(returnTransition.arrival).toBeDefined();
			expect(
				Math.abs(returnTransition.arrival!.x - exteriorTransition!.x),
				`${interiorMap.id} arrival x drifts more than 1.25 tiles from its door`
			).toBeLessThanOrEqual(TILE + TILE / 4);
		}
	});

	it('declares exact exterior return arrivals for bottom-left village interiors', () => {
		const interiors = [
			heroHouseMap,
			guildHallMap,
			itemShopMap,
			villagerHouse1Map,
			villagerHouse2Map,
			villagerHouse3Map,
			shrineOfAuroraInteriorMap
		];
		for (const interior of interiors) {
			expect(interior.transitions[0].arrival).toEqual(
				VILLAGE_INTERIOR_EXTERIORS[interior.id as keyof typeof VILLAGE_INTERIOR_EXTERIORS]
					.returnArrival
			);
		}
		expect(guildHallMap.transitions[0].arrival).toEqual({
			x: 2_272,
			y: 4_480,
			facing: 'down'
		});
	});

	it('defines village NPCs with stable ids and bounded coordinates', () => {
		const npcs = Object.values(maps).flatMap((map) => map.npcs ?? []);
		const roles = ['guild', 'shopkeeper', 'villager', 'home'];

		expect(heroHouseMap.npcs ?? []).toEqual([]);
		expect(guildHallMap.npcs).toMatchObject([
			{
				id: 'guild-master',
				x: 800,
				y: 144,
				nameKey: 'content.maps.npcs.guild-master.name',
				dialogueId: 'guild-master',
				role: 'guild',
				frameName: 'guildMasterNpc'
			},
			{
				id: 'guild-quartermaster',
				x: 816,
				y: 528,
				nameKey: 'content.maps.npcs.guild-quartermaster.name',
				dialogueId: 'guild-quartermaster',
				role: 'shopkeeper',
				frameName: 'quartermasterNpc',
				shopId: 'guild-quartermaster'
			}
		]);
		expect(itemShopMap.npcs).toMatchObject([
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
		]);
		expect(villagerHouse1Map.npcs).toMatchObject([
			{
				id: 'villager-lynn',
				x: 160,
				y: 224,
				nameKey: 'content.maps.npcs.villager-lynn.name',
				dialogueId: 'villager-lynn',
				role: 'villager',
				frameName: 'miraItemShopNpc'
			}
		]);
		expect(villagerHouse2Map.npcs).toMatchObject([
			{
				id: 'villager-toma',
				x: 224,
				y: 224,
				nameKey: 'content.maps.npcs.villager-toma.name',
				dialogueId: 'villager-toma',
				role: 'villager',
				frameName: 'quartermasterNpc'
			}
		]);
		expect(villagerHouse3Map.npcs).toMatchObject([
			{
				id: 'villager-io',
				x: 320,
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
				expect(getDialogue(npc.dialogueId)).toBeDefined();
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

	it('defines exterior building landmarks for each village door', () => {
		expect(meadowEntryMap.landmarks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'hero-house-exterior',
					x: 704,
					y: 5_712,
					width: 256,
					height: 288,
					labelKey: 'content.maps.landmarks.hero-house-exterior.label'
				}),
				expect.objectContaining({
					id: 'guild-hall-exterior',
					x: 2_272,
					y: 4_224,
					width: 448,
					height: 384,
					labelKey: 'content.maps.landmarks.guild-hall-exterior.label'
				}),
				expect.objectContaining({
					id: 'item-shop-exterior',
					x: 704,
					y: 5_024,
					width: 320,
					height: 320,
					labelKey: 'content.maps.landmarks.item-shop-exterior.label'
				}),
				expect.objectContaining({
					id: 'villager-house-1-exterior',
					x: 672,
					y: 4_240,
					width: 256,
					height: 288,
					labelKey: 'content.maps.landmarks.villager-house-1-exterior.label'
				}),
				expect.objectContaining({
					id: 'villager-house-2-exterior',
					x: 1_376,
					y: 4_240,
					width: 256,
					height: 288,
					labelKey: 'content.maps.landmarks.villager-house-2-exterior.label'
				}),
				expect.objectContaining({
					id: 'villager-house-3-exterior',
					x: 1_472,
					y: 5_712,
					width: 256,
					height: 288,
					labelKey: 'content.maps.landmarks.villager-house-3-exterior.label'
				}),
				expect.objectContaining({
					id: 'whispering-cave',
					x: 5_960,
					y: 1_800,
					width: 256,
					height: 224,
					labelKey: 'content.maps.landmarks.whispering-cave.label'
				}),
				expect.objectContaining({
					id: 'blacksmith',
					x: 2_272,
					y: 5_024,
					width: 320,
					height: 320,
					labelKey: 'content.maps.landmarks.blacksmith.label'
				}),
				expect.objectContaining({
					id: 'shrine-of-aurora',
					x: 2_272,
					y: 5_696,
					width: 320,
					height: 320,
					labelKey: 'content.maps.landmarks.shrine-of-aurora.label'
				})
			])
		);

		for (const landmark of meadowEntryMap.landmarks ?? []) {
			expectEnglishMessage(landmark.labelKey);
			expect(landmark.width).toBeGreaterThan(32);
			expect(landmark.height).toBeGreaterThan(32);
			expect(landmark.x).toBeGreaterThanOrEqual(0);
			expect(landmark.y).toBeGreaterThanOrEqual(0);
			expect(landmark.x).toBeLessThan(meadowEntryMap.width * 32);
			expect(landmark.y).toBeLessThan(meadowEntryMap.height * 32);
		}
	});

	it('keeps the V2 village collision layer neutral while retaining meadow boundaries', () => {
		const villageBlockers =
			meadowEntryMap.blockers?.filter((b) => b.id.startsWith('village-')) ?? [];
		const meadowBoundaries =
			meadowEntryMap.blockers?.filter(
				(b) => b.kind === 'town-hedge' && b.id.startsWith('meadow-')
			) ?? [];

		expect(villageBlockers).toEqual([]);
		// The four world-edge boundaries stay forest tree-cluster walls.
		expect(meadowBoundaries).toHaveLength(4);
		expect(meadowBoundaries.map((b) => b.id)).toEqual(
			expect.arrayContaining([
				'meadow-north-boundary',
				'meadow-south-boundary',
				'meadow-west-boundary',
				'meadow-east-boundary'
			])
		);
		expect(meadowBoundaries.find((b) => b.id === 'meadow-west-boundary')).toMatchObject({
			x: 32,
			y: 3_200,
			width: 64,
			height: 6_400
		});
		// No ocean blocker changed kind
		expect(
			meadowEntryMap.blockers?.some((b) => b.id === 'sundrop-southwest-ocean' && b.kind === 'ocean')
		).toBe(true);
	});

	it('keeps the V2 village cluster in its approved bounds and the slime forest in the top-right corner', () => {
		const villageLandmarks = (meadowEntryMap.landmarks ?? []).filter((landmark) =>
			VILLAGE_LANDMARK_IDS.has(landmark.id)
		);
		for (const landmark of villageLandmarks) {
			expect(landmark.x + landmark.width / 2).toBeLessThanOrEqual(3_072);
			expect(landmark.y - landmark.height / 2).toBeGreaterThanOrEqual(3_968);
			expect(landmark.y + landmark.height / 2).toBeLessThanOrEqual(6_144);
		}

		const cave = meadowEntryMap.landmarks?.find((landmark) => landmark.id === 'whispering-cave');
		expect(cave).toMatchObject({ x: 5_960, y: 1_800 });

		for (const combatBounds of meadowEntryMap.combatBounds ?? []) {
			expect(combatBounds.x - combatBounds.width / 2).toBeGreaterThanOrEqual(4_784);
			expect(combatBounds.y + combatBounds.height / 2).toBeLessThanOrEqual(1_792);
		}

		const canopyDecor = (meadowEntryMap.mapDecor ?? []).filter((decor) =>
			CANOPY_DECOR_IDS.has(decor.id)
		);
		for (const decor of canopyDecor) {
			expect(decor.x - decor.width / 2).toBeGreaterThanOrEqual(4_880);
			expect(decor.y + decor.height / 2).toBeLessThanOrEqual(1_470);
		}
	});

	it('covers the V2 painted village paths with compiled ground patches', () => {
		const villageGround = (meadowEntryMap.groundPatches ?? []).filter((patch) =>
			patch.id.startsWith('village-ground-')
		);
		expect(villageGround.length).toBeGreaterThan(0);
		expect(
			villageGround.every((patch) => ['pathTile', 'cobblestoneTile'].includes(patch.tile))
		).toBe(true);
	});

	it('keeps meadow combat in the top-right forest pockets instead of a separate forest arena', () => {
		expect(meadowEntryMap.encounters).toEqual([
			{ id: 'meadow-slime-west', x: 4_928, y: 960, enemyId: 'slime-scout' },
			{ id: 'meadow-slime-center', x: 5_360, y: 1_280, enemyId: 'slime-scout' },
			{ id: 'meadow-slime-east', x: 5_920, y: 1_600, enemyId: 'slime-scout' }
		]);

		const encountersById = new Map(
			(meadowEntryMap.encounters ?? []).map((encounter) => [encounter.id, encounter])
		);

		for (const combatBounds of meadowEntryMap.combatBounds ?? []) {
			expectRectInsideMap(combatBounds);
			for (const encounterId of combatBounds.encounterIds) {
				const encounter = encountersById.get(encounterId);
				expect(encounter).toBeDefined();
				expectPointInsideRect(encounter!, combatBounds);
			}
		}
	});

	it('keeps meadow encounters out of meadow blockers', () => {
		for (const encounter of meadowEntryMap.encounters ?? []) {
			for (const blocker of meadowEntryMap.blockers ?? []) {
				expect(isPointInsideRect(encounter, blocker)).toBe(false);
			}
		}
	});

	it('defines bottom-left village paths, top-right forest paths, blockers, fences, and forest dressing inside the meadow map bounds', () => {
		expect(meadowEntryMap.groundPatches).toEqual(
			expect.arrayContaining([
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
			])
		);
		expect(meadowEntryMap.blockers).toEqual(
			expect.arrayContaining([
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
			])
		);
		expect(meadowEntryMap.fences).toMatchObject([
			{ id: 'coast-approach-west-fence', x: 4_020, y: 5_250, width: 32, height: 520 },
			{ id: 'coast-approach-east-fence', x: 4_380, y: 5_250, width: 32, height: 520 },
			{ id: 'coast-fork-east-field-fence', x: 4_460, y: 5_660, width: 500, height: 32 }
		]);
		const ids = [
			...(meadowEntryMap.groundPatches ?? []).map((patch) => patch.id),
			...(meadowEntryMap.blockers ?? []).map((blocker) => blocker.id),
			...(meadowEntryMap.fences ?? []).map((fence) => fence.id),
			...(meadowEntryMap.mapDecor ?? []).map((decor) => decor.id)
		];
		expect(new Set(ids).size).toBe(ids.length);

		for (const rect of [
			...(meadowEntryMap.groundPatches ?? []),
			...(meadowEntryMap.blockers ?? []),
			...(meadowEntryMap.fences ?? []),
			...(meadowEntryMap.mapDecor ?? [])
		]) {
			expectRectInsideMap(rect);
		}
	});

	it('keeps the two wildwood canopies as colliding map decor', () => {
		const canopies = (meadowEntryMap.mapDecor ?? []).filter((decor) =>
			CANOPY_DECOR_IDS.has(decor.id)
		);
		expect(canopies).toHaveLength(2);
		for (const canopy of canopies) {
			expect(canopy.frameName).toBe('treeCluster');
			expect(canopy.mode).toBe('tile');
			expect(canopy.collision).toBeDefined();
		}
	});

	it('defines valid placed pickups with stable ids and item ids', () => {
		const pickups = Object.values(maps).flatMap((map) => map.pickups ?? []);

		expect(maps['meadow-entry'].pickups ?? []).toEqual(
			expect.arrayContaining([
				{ id: 'mistfen-salve', x: 880, y: 2_500, itemId: 'sunleaf-salve', quantity: 1 },
				{ id: 'coast-salve', x: 5_440, y: 5_930, itemId: 'sunleaf-salve', quantity: 1 },
				{ id: 'silverpine-tonic', x: 2_620, y: 1_560, itemId: 'field-potion', quantity: 1 }
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
			{ id: 'threshold-slime-west', x: 2_304, y: 3_200, enemyId: 'slime-scout' },
			{ id: 'threshold-slime-east', x: 4_096, y: 3_008, enemyId: 'slime-scout' }
		]);
		expect(maps['ruins-core'].encounters).toEqual([
			{ id: 'ruins-warden', x: 4_992, y: 3_200, enemyId: 'ruins-warden', completion: 'victory' }
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

const decorAssetFrames: Record<string, Record<string, unknown>> = {
	[forestDressingAsset.key]: forestDressingAsset.frames,
	[coastDressingAsset.key]: coastDressingAsset.frames,
	[shrineDressingAsset.key]: shrineDressingAsset.frames,
	[marshDressingAsset.key]: marshDressingAsset.frames,
	[crossroadsDressingAsset.key]: crossroadsDressingAsset.frames,
	[villageDressingAsset.key]: villageDressingAsset.frames
};

describe('meadow-entry region integrity', () => {
	it('keeps every ground patch tile within the terrain tileset', () => {
		for (const patch of meadowEntryMap.groundPatches ?? []) {
			expect(terrainTilesAsset.frames).toHaveProperty(patch.tile);
			expectRectInsideMap(patch);
		}
	});

	it('points every decor frame at a real asset frame and stays in-bounds', () => {
		for (const decor of meadowEntryMap.mapDecor ?? []) {
			const frames = decorAssetFrames[decor.textureKey];
			expect(frames).toBeDefined();
			expect(frames).toHaveProperty(decor.frameName);
			expectRectInsideMap(decor);
			if (decor.collision) {
				expectRectInsideMap(decor.collision);
			}
		}
	});

	it('anchors every village-sheet poleLantern collision to the compiler convention', () => {
		// The layered compiler anchors decor collision at
		//   center.y + renderHeight/2 - collisionHeight/2
		// (compile-layered-region.ts:237). Hand-authored decor fragments that
		// share the same sprite (e.g. corridorWaymarker) must match so identical
		// poleLanterns don't collide 10px apart in the merged map.
		const lanterns = (meadowEntryMap.mapDecor ?? []).filter(
			(d) =>
				d.textureKey === villageDressingAsset.key &&
				d.frameName === 'poleLantern' &&
				d.collision !== undefined
		);
		expect(lanterns.length).toBeGreaterThan(0);
		for (const decor of lanterns) {
			expect(decor.collision).toBeDefined();
			const expected = decor.y + decor.height / 2 - (decor.collision?.height ?? 0) / 2;
			expect(decor.collision?.y).toBe(expected);
		}
	});

	it('keeps every landmark in-bounds with a translated label', () => {
		for (const landmark of meadowEntryMap.landmarks ?? []) {
			expectRectInsideMap(landmark);
			expectEnglishMessage(landmark.labelKey);
		}
	});

	it('resolves every transition target to a known map', () => {
		for (const transition of meadowEntryMap.transitions) {
			expect(maps).toHaveProperty(transition.toMapId);
		}
	});

	/**
	 * Structural connectivity guard: flood-fills the tile grid from spawn,
	 * treating only `map.blockers` (the region-sealing hedges/walls/gates) as
	 * impassable, and asserts every transition cell stays reachable.
	 *
	 * Ground patches are decorative tiling, not the walkable surface (the player
	 * walks on any non-blocked tile), and they are intentionally fragmented — so
	 * a patch-overlap walk is not a valid reachability test. Blockers are the
	 * surfaces that actually seal off regions, so a flood fill over the blocker
	 * field is the regression that catches "a future edit silently breaks
	 * navigation" by adding a sealing wall. mapDecor/fence/landmark collisions
	 * are local obstacles (with doorway-carved shapes) and are intentionally
	 * excluded so this stays a structural, flake-free guard.
	 */
	const connectivityTileSize = 32;

	function floodFillReachableCells(map: WorldMapDefinition): Set<string> {
		const isBlocked = (px: number, py: number) =>
			(map.blockers ?? []).some((blocker) => isPointInsideRect({ x: px, y: py }, blocker));

		const startCol = Math.floor(map.spawn.x / connectivityTileSize);
		const startRow = Math.floor(map.spawn.y / connectivityTileSize);
		// Only seed the spawn cell once we confirm it is not itself sealed by a
		// blocker. Seeding unconditionally would mark a blocked spawn reachable
		// and make the "spawn cell must not be sealed" assertion below a tautology.
		const seen = new Set<string>();
		const queue: Array<[number, number]> = [];
		const startCenterX = startCol * connectivityTileSize + connectivityTileSize / 2;
		const startCenterY = startRow * connectivityTileSize + connectivityTileSize / 2;
		if (!isBlocked(startCenterX, startCenterY)) {
			seen.add(`${startCol},${startRow}`);
			queue.push([startCol, startRow]);
		}

		while (queue.length > 0) {
			const [col, row] = queue.shift()!;
			for (const [dCol, dRow] of STEPS) {
				const nextCol = col + dCol;
				const nextRow = row + dRow;
				if (nextCol < 0 || nextRow < 0 || nextCol >= map.width || nextRow >= map.height) {
					continue;
				}
				const cellKey = `${nextCol},${nextRow}`;
				if (seen.has(cellKey)) {
					continue;
				}
				const cellCenterX = nextCol * connectivityTileSize + connectivityTileSize / 2;
				const cellCenterY = nextRow * connectivityTileSize + connectivityTileSize / 2;
				if (isBlocked(cellCenterX, cellCenterY)) {
					continue;
				}
				seen.add(cellKey);
				queue.push([nextCol, nextRow]);
			}
		}

		return seen;
	}

	it('keeps every meadow transition reachable from spawn through the blocker field', () => {
		const reachableCells = floodFillReachableCells(meadowEntryMap);
		const isReachable = (point: { x: number; y: number }) =>
			reachableCells.has(
				`${Math.floor(point.x / connectivityTileSize)},${Math.floor(point.y / connectivityTileSize)}`
			);

		expect(isReachable(meadowEntryMap.spawn), 'spawn cell must not be sealed by a blocker').toBe(
			true
		);

		for (const transition of meadowEntryMap.transitions) {
			expect(
				isReachable(transition),
				`${transition.id} at (${transition.x}, ${transition.y}) is sealed off from spawn by blockers`
			).toBe(true);
		}
	});

	/**
	 * Full-obstacle connectivity guard: same flood fill as the structural guard
	 * above, but treating every movement-blocking surface — `blockers`, `fences`,
	 * and colliding `mapDecor` — as impassable. Landmarks are excluded because
	 * their collision is doorway-carved at runtime; this is intentionally a
	 * SUPERSET of the structural guard so a lane fence or decor wall that
	 * accidentally seals a corridor junction (trapping the player off-screen) is
	 * caught here even though it is not a region-sealing blocker. Every
	 * interactable gameplay object — transitions, pickups, encounters, NPCs, and
	 * discoveries — must stay reachable from spawn through the full obstacle field.
	 */
	function floodFillReachableCellsOverAllSolids(map: WorldMapDefinition): Set<string> {
		const solids: CenterRect[] = [
			...(map.blockers ?? []),
			...(map.fences ?? []),
			...(map.mapDecor ?? [])
				.filter((decor) => decor.collision)
				.map((decor) => decor.collision as CenterRect)
		];
		const isBlocked = (px: number, py: number) =>
			solids.some((rect) => isPointInsideRect({ x: px, y: py }, rect));

		const startCol = Math.floor(map.spawn.x / connectivityTileSize);
		const startRow = Math.floor(map.spawn.y / connectivityTileSize);
		// See floodFillReachableCells: only seed the spawn cell when it is not
		// itself sealed by a solid, otherwise the blocked-spawn assertion below
		// would pass against a spawn that is actually unwalkable.
		const seen = new Set<string>();
		const queue: Array<[number, number]> = [];
		const startCenterX = startCol * connectivityTileSize + connectivityTileSize / 2;
		const startCenterY = startRow * connectivityTileSize + connectivityTileSize / 2;
		if (!isBlocked(startCenterX, startCenterY)) {
			seen.add(`${startCol},${startRow}`);
			queue.push([startCol, startRow]);
		}

		while (queue.length > 0) {
			const [col, row] = queue.shift()!;
			for (const [dCol, dRow] of STEPS) {
				const nextCol = col + dCol;
				const nextRow = row + dRow;
				if (nextCol < 0 || nextRow < 0 || nextCol >= map.width || nextRow >= map.height) {
					continue;
				}
				const cellKey = `${nextCol},${nextRow}`;
				if (seen.has(cellKey)) {
					continue;
				}
				const cellCenterX = nextCol * connectivityTileSize + connectivityTileSize / 2;
				const cellCenterY = nextRow * connectivityTileSize + connectivityTileSize / 2;
				if (isBlocked(cellCenterX, cellCenterY)) {
					continue;
				}
				seen.add(cellKey);
				queue.push([nextCol, nextRow]);
			}
		}

		return seen;
	}

	it('keeps every gameplay object reachable from spawn through the full obstacle field', () => {
		const reachableCells = floodFillReachableCellsOverAllSolids(meadowEntryMap);
		const cellKey = (point: { x: number; y: number }) =>
			`${Math.floor(point.x / connectivityTileSize)},${Math.floor(point.y / connectivityTileSize)}`;
		// Transitions and encounters require a standable cell — the player walks
		// onto the tile to trigger them — so they must be reachable at the exact cell.
		const isReachable = (point: { x: number; y: number }) => reachableCells.has(cellKey(point));
		// Pickups, discoveries, and NPCs are proximity-interacted (a radius around
		// the object), and authors legitimately tuck them against a wall so the
		// object's own cell sits inside a collision rect. Treat such an object as
		// reachable when any cell within a 2-tile neighbourhood is walkable.
		const isReachableNearby = (point: { x: number; y: number }) => {
			const col = Math.floor(point.x / connectivityTileSize);
			const row = Math.floor(point.y / connectivityTileSize);
			for (let dCol = -2; dCol <= 2; dCol += 1) {
				for (let dRow = -2; dRow <= 2; dRow += 1) {
					if (reachableCells.has(`${col + dCol},${row + dRow}`)) {
						return true;
					}
				}
			}
			return false;
		};

		expect(isReachable(meadowEntryMap.spawn), 'spawn cell must not be sealed by any solid').toBe(
			true
		);

		for (const transition of meadowEntryMap.transitions) {
			expect(
				isReachable(transition),
				`${transition.id} at (${transition.x}, ${transition.y}) is sealed off from spawn by a solid obstacle`
			).toBe(true);
		}
		for (const encounter of meadowEntryMap.encounters ?? []) {
			expect(
				isReachable(encounter),
				`${encounter.id} at (${encounter.x}, ${encounter.y}) is sealed off from spawn by a solid obstacle`
			).toBe(true);
		}

		const proximityChecks: Array<{ kind: string; point: { x: number; y: number }; id: string }> = [
			...(meadowEntryMap.pickups ?? []).map((p) => ({ kind: 'pickup', point: p, id: p.id })),
			...(meadowEntryMap.discoveries ?? []).map((d) => ({
				kind: 'discovery',
				point: d,
				id: d.id
			})),
			...(meadowEntryMap.npcs ?? []).map((n) => ({ kind: 'npc', point: n, id: n.id })),
			// Ambient NPCs are proximity-interacted just like authored NPCs; a
			// solid that seals one of these off spawn would otherwise go uncaught.
			...(meadowEntryMap.ambientNpcs ?? []).map((n) => ({
				kind: 'ambient-npc',
				point: n,
				id: n.id
			}))
		];
		for (const { kind, point, id } of proximityChecks) {
			expect(
				isReachableNearby(point),
				`${kind} ${id} at (${point.x}, ${point.y}) has no walkable cell within 2 tiles`
			).toBe(true);
		}
	});

	it('keeps every inter-region path link connected to the region ground network', () => {
		// The `pathsRegion` connectors are decorative ground patches (the player
		// walks any non-blocked tile, so they do not affect navigation). Their whole
		// purpose is visual continuity between regions, so a link that no longer
		// touches the ground network — a mis-coordinated gap leaving it orphaned in
		// empty grass — is the regression this guards. The ground network spans all
		// tiles (paths AND cobblestone plazas), since links legitimately bridge onto
		// plazas. Flood-fills contiguity outward from the region-authored ground
		// patches and asserts every shared connector patch is reachable through that network.
		const groundPatches = meadowEntryMap.groundPatches ?? [];
		const linkIds = new Set([
			'village-to-crossroads',
			'crossroads-to-mistfen',
			'crossroads-to-silverpine',
			'crossroads-to-wildwood',
			'crossroads-to-coast'
		]);
		const links = groundPatches.filter((patch) => linkIds.has(patch.id));
		const regionGround = groundPatches.filter((patch) => !linkIds.has(patch.id));
		expect(links.length, 'expected authored inter-region link patches').toBeGreaterThan(0);
		expect(
			regionGround.length,
			'expected region-authored ground patches to anchor against'
		).toBeGreaterThan(0);

		const byId = new Map(groundPatches.map((patch) => [patch.id, patch]));
		const connected = new Set<string>(regionGround.map((patch) => patch.id));
		const queue: string[] = [...connected];

		while (queue.length > 0) {
			const current = byId.get(queue.shift()!)!;
			for (const candidate of groundPatches) {
				if (connected.has(candidate.id)) {
					continue;
				}
				if (rectsAreContiguous(current, candidate)) {
					connected.add(candidate.id);
					queue.push(candidate.id);
				}
			}
		}

		for (const link of links) {
			expect(
				connected.has(link.id),
				`${link.id} is not contiguous with the region ground network (orphaned link)`
			).toBe(true);
		}
	});

	it('preserves the semantic V2 connector and destination-seam rectangles', () => {
		const expected = {
			'village-to-crossroads': { x: 3_040, y: 4_688, width: 448, height: 160 },
			'crossroads-to-mistfen': { x: 3_376, y: 3_152, width: 608, height: 160 },
			'crossroads-to-silverpine': { x: 3_776, y: 2_624, width: 192, height: 384 },
			'crossroads-to-wildwood': { x: 4_640, y: 4_224, width: 704, height: 160 },
			'crossroads-to-coast': { x: 4_224, y: 5_168, width: 192, height: 800 },
			'mistfen-seam-horizontal': { x: 2_736, y: 3_152, width: 672, height: 160 },
			'mistfen-seam-vertical': { x: 2_320, y: 2_992, width: 160, height: 480 },
			'silverpine-seam': { x: 3_600, y: 2_432, width: 352, height: 192 },
			'wildwood-seam': { x: 4_800, y: 3_968, width: 192, height: 384 }
		} as const;
		const groundPatchesById = new Map(
			(meadowEntryMap.groundPatches ?? []).map((patch) => [patch.id, patch])
		);

		expect([...groundPatchesById.keys()].filter((id) => id in expected)).toHaveLength(9);
		for (const [id, rectangle] of Object.entries(expected)) {
			expect(groundPatchesById.get(id), id).toMatchObject({
				...rectangle,
				tile: 'pathTile'
			});
		}
	});

	it('references real items from every pickup', () => {
		expect(meadowEntryMap.pickups ?? []).toBeInstanceOf(Array);
		for (const pickup of meadowEntryMap.pickups ?? []) {
			expect(() => getItem(pickup.itemId)).not.toThrow();
			expect(pickup.quantity).toBeGreaterThan(0);
		}
	});

	it('keeps every ambient NPC in-bounds with a valid frame', () => {
		expect(meadowEntryMap.ambientNpcs ?? []).toBeInstanceOf(Array);
		for (const npc of meadowEntryMap.ambientNpcs ?? []) {
			expect(isNpcPackFrameName(npc.frameName)).toBe(true);
			expect(npc.x).toBeGreaterThanOrEqual(0);
			expect(npc.y).toBeGreaterThanOrEqual(0);
			expect(npc.x).toBeLessThan(meadowEntryMap.width * 32);
			expect(npc.y).toBeLessThan(meadowEntryMap.height * 32);
		}
	});

	it('does not author pickups, discoveries, or ambient NPCs inside solid rects', () => {
		// Regression guard: a reward/NPC/discovery placed inside a blocker,
		// fence, landmark collision bounds, or colliding decor would be
		// unreachable or visually clipped. Solids use the full landmark rect
		// (conservative — the doorway carve is a movement exception, not an
		// authoring invitation). Mirrors collectSolidRects in soft-maze.test.ts.
		const solids: Array<{ id: string; x: number; y: number; width: number; height: number }> = [
			...(meadowEntryMap.blockers ?? []),
			...(meadowEntryMap.fences ?? []),
			...(meadowEntryMap.landmarks ?? []),
			...(meadowEntryMap.mapDecor ?? [])
				.map((decor) => decor.collision)
				.filter((rect): rect is NonNullable<typeof rect> => rect !== undefined)
		];
		const pointInRect = (
			px: number,
			py: number,
			rect: { x: number; y: number; width: number; height: number }
		): boolean =>
			Math.abs(px - rect.x) <= rect.width / 2 && Math.abs(py - rect.y) <= rect.height / 2;

		const entities: Array<{ kind: string; id: string; x: number; y: number }> = [
			...(meadowEntryMap.pickups ?? []).map((p) => ({ kind: 'pickup', id: p.id, x: p.x, y: p.y })),
			...(meadowEntryMap.discoveries ?? []).map((d) => ({
				kind: 'discovery',
				id: d.id,
				x: d.x,
				y: d.y
			})),
			...(meadowEntryMap.ambientNpcs ?? []).map((n) => ({
				kind: 'ambientNpc',
				id: n.id,
				x: n.x,
				y: n.y
			}))
		];

		for (const entity of entities) {
			const inside = solids.filter((rect) => pointInRect(entity.x, entity.y, rect));
			expect(
				inside,
				`${entity.kind} ${entity.id} at (${entity.x}, ${entity.y}) is inside solid(s): ${inside
					.map((r) => r.id)
					.join(', ')}`
			).toEqual([]);
		}
	});

	it('surfaces composed region interactive NPCs onto the map (no silent drop)', () => {
		// Guard against the mergeRegions -> meadowEntryMap wiring gap: every
		// other merged field is spread onto the map literal, so `npcs` must be
		// too. Today no region contributes interactive NPCs, but the field must
		// still be present so a future region author's NPCs are rendered.
		expect(meadowEntryMap.npcs).toEqual([]);
	});

	it('uses the live V2 graybox instead of the V1 semantic package', () => {
		expect(meadowEntryMap.backgroundImages ?? []).toEqual([]);
		for (const visual of [
			...(meadowEntryMap.blockers ?? []),
			...(meadowEntryMap.mapDecor ?? []),
			...(meadowEntryMap.fences ?? [])
		]) {
			expect(visual.visual?.mode).not.toBe('fallback-only');
		}
	});

	it('seals three foreshadow gates with future-gate collision', () => {
		const sealedGateIds = ['witchwood-gate-block', 'silver-shrine-gate-block', 'castle-gate-block'];
		const gateBlockers = (meadowEntryMap.blockers ?? []).filter((blocker) =>
			sealedGateIds.includes(blocker.id)
		);
		expect(gateBlockers).toHaveLength(3);
		for (const gate of gateBlockers) {
			expect(gate.kind).toBe('future-gate');
		}
	});

	it('keeps every id-bearing composed field free of cross-region id collisions', () => {
		// WorldScene keys pickup/NPC/landmark markers by `id`; a duplicate within a
		// field silently overwrites one entity. Grounds/blockers/fences/mapDecor are
		// already checked cross-field above — this pins the remaining interactive
		// fields that the merge exposes.
		for (const field of [
			'transitions',
			'landmarks',
			'ambientNpcs',
			'pickups',
			'encounters',
			'combatBounds'
		] as const) {
			const ids = (meadowEntryMap[field] ?? []).map((item: { id: string }) => item.id);
			expect(new Set(ids).size, `duplicate ids in ${field}`).toBe(ids.length);
		}
	});
});

describe('mergeRegions collision guard', () => {
	it('throws on a duplicate background image id across composed regions', () => {
		const regionA: RegionFragment = {
			backgroundImages: [
				{
					id: 'shared-background',
					textureKey: 'first-background',
					x: 100,
					y: 100,
					width: 100,
					height: 100,
					plane: 'base',
					drawOrder: 0
				}
			]
		};
		const regionB: RegionFragment = {
			backgroundImages: [
				{
					id: 'shared-background',
					textureKey: 'second-background',
					x: 200,
					y: 200,
					width: 200,
					height: 200,
					plane: 'foreground',
					drawOrder: 0
				}
			]
		};

		expect(() => mergeRegions([regionA, regionB])).toThrowError(/duplicate id "shared-background"/);
	});

	it('throws on a duplicate id within a field across composed regions', () => {
		const regionA: RegionFragment = {
			transitions: [{ id: 'shared-door', x: 0, y: 0, toMapId: 'meadow-entry' }]
		};
		const regionB: RegionFragment = {
			transitions: [{ id: 'shared-door', x: 100, y: 100, toMapId: 'meadow-entry' }]
		};

		expect(() => mergeRegions([regionA, regionB])).toThrowError(/duplicate id "shared-door"/);
	});

	it('accepts distinct ids across regions without throwing', () => {
		const regionA: RegionFragment = {
			pickups: [{ id: 'a-relic', x: 0, y: 0, itemId: 'potion', quantity: 1 }]
		};
		const regionB: RegionFragment = {
			pickups: [{ id: 'b-relic', x: 100, y: 100, itemId: 'potion', quantity: 1 }]
		};

		expect(() => mergeRegions([regionA, regionB])).not.toThrow();
	});
});

describe('map discoveries', () => {
	it('exposes a discoveries array on the merged meadow-entry map', () => {
		expect(Array.isArray(meadowEntryMap.discoveries)).toBe(true);
	});

	it('rejects duplicate discovery ids across composed regions', () => {
		const duplicate: RegionFragment = {
			discoveries: [
				{
					id: 'dup-discovery',
					x: 100,
					y: 100,
					labelKey: 'content.maps.landmarks.castle-gate.label',
					descriptionKey: 'content.maps.landmarks.castle-gate.label'
				}
			]
		};
		expect(() => mergeRegions([duplicate, duplicate])).toThrow(/duplicate id "dup-discovery"/);
	});

	it('places every discovery outside every encounter aggro radius', () => {
		// A discovery that sits inside an encounter's aggro radius surfaces its
		// warning only once the player is already in combat (the wildwood-cave-
		// danger regression, which used to share a tile with meadow-slime-east).
		// aggroRadius lives on combatBounds; resolve each encounter to its bound.
		const encountersById = new Map(
			(meadowEntryMap.encounters ?? []).map((encounter) => [encounter.id, encounter])
		);
		const aggroZones = (meadowEntryMap.combatBounds ?? []).flatMap((bounds) =>
			bounds.encounterIds.map((id) => {
				const encounter = encountersById.get(id);
				return encounter
					? { id, x: encounter.x, y: encounter.y, radius: bounds.aggroRadius }
					: null;
			})
		);

		for (const discovery of meadowEntryMap.discoveries ?? []) {
			for (const zone of aggroZones) {
				if (!zone) continue;
				const distance = Math.hypot(discovery.x - zone.x, discovery.y - zone.y);
				expect(
					distance,
					`${discovery.id} at (${discovery.x}, ${discovery.y}) is inside the ${zone.radius}px aggro radius of encounter ${zone.id} — the warning would reveal only once combat has already triggered`
				).toBeGreaterThan(zone.radius);
			}
		}
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

const V2_ROUTE_POINTS = {
	heroHouseToCrossroads: [
		{ x: 704, y: 5_920 },
		{ x: 704, y: 6_080 },
		{ x: 320, y: 6_080 },
		{ x: 320, y: 5_920 },
		{ x: 320, y: 4_688 },
		{ x: 3_264, y: 4_688 },
		{ x: 3_776, y: 4_688 },
		{ x: 3_776, y: 4_480 }
	],
	crossroadsToMistfen: [
		{ x: 3_776, y: 4_480 },
		{ x: 3_648, y: 4_480 },
		{ x: 3_648, y: 4_064 },
		{ x: 3_776, y: 4_064 },
		{ x: 3_776, y: 3_136 },
		{ x: 3_072, y: 3_136 },
		{ x: 2_320, y: 3_136 },
		{ x: 2_320, y: 2_784 }
	],
	crossroadsToSilverpine: [
		{ x: 3_776, y: 4_480 },
		{ x: 3_648, y: 4_480 },
		{ x: 3_648, y: 4_064 },
		{ x: 3_776, y: 4_064 },
		{ x: 3_776, y: 2_432 },
		{ x: 3_440, y: 2_432 }
	],
	crossroadsToWildwood: [
		{ x: 3_776, y: 4_480 },
		{ x: 4_288, y: 4_480 },
		{ x: 4_288, y: 4_224 },
		{ x: 4_800, y: 4_224 },
		{ x: 4_800, y: 3_808 }
	],
	crossroadsToCoast: [
		{ x: 3_776, y: 4_480 },
		{ x: 4_224, y: 4_480 },
		{ x: 4_224, y: 5_520 }
	]
} as const satisfies Readonly<Record<string, readonly Pt[]>>;

const V2_FULL_ROUTE_POINTS = {
	heroHouseToCrossroads: V2_ROUTE_POINTS.heroHouseToCrossroads,
	crossroadsToMistfen: [
		...V2_ROUTE_POINTS.crossroadsToMistfen,
		{ x: 2_320, y: 2_750 },
		{ x: 2_150, y: 2_750 },
		{ x: 2_260, y: 2_750 },
		{ x: 2_260, y: 2_540 },
		{ x: 1_760, y: 2_540 },
		{ x: 1_400, y: 2_540 },
		{ x: 1_400, y: 2_030 },
		{ x: 1_380, y: 2_030 },
		{ x: 1_380, y: 820 },
		{ x: 1_060, y: 820 }
	],
	crossroadsToSilverpine: [
		...V2_ROUTE_POINTS.crossroadsToSilverpine,
		{ x: 3_440, y: 2_360 },
		{ x: 3_180, y: 2_360 },
		{ x: 2_900, y: 2_360 },
		{ x: 2_900, y: 1_820 },
		{ x: 2_900, y: 2_200 },
		{ x: 4_000, y: 2_200 },
		{ x: 4_000, y: 520 },
		{ x: 4_000, y: 680 },
		{ x: 3_000, y: 680 }
	],
	crossroadsToWildwood: [
		...V2_ROUTE_POINTS.crossroadsToWildwood,
		{ x: 4_420, y: 3_808 },
		{ x: 4_420, y: 5_347 },
		{ x: 5_600, y: 5_347 },
		{ x: 5_600, y: 3_200 },
		{ x: 5_600, y: 2_100 },
		{ x: 5_960, y: 2_100 }
	],
	crossroadsToCoast: [
		...V2_ROUTE_POINTS.crossroadsToCoast,
		{ x: 4_184, y: 5_520 },
		{ x: 4_184, y: 5_840 },
		{ x: 4_600, y: 5_840 }
	]
} as const satisfies Readonly<Record<string, readonly Pt[]>>;

function collectEntityIds(map: WorldMapDefinition): Set<string> {
	const ids = new Set<string>();
	const lists = [
		map.landmarks,
		map.pickups,
		map.npcs,
		map.ambientNpcs,
		map.encounters,
		map.blockers,
		map.mapDecor,
		map.groundPatches,
		map.fences,
		map.transitions,
		map.discoveries
	];
	for (const list of lists) {
		for (const item of list ?? []) ids.add(item.id);
	}
	return ids;
}

function interestPoints(map: WorldMapDefinition): Pt[] {
	const points: Pt[] = [];
	for (const l of map.landmarks ?? []) points.push({ x: l.x, y: l.y });
	for (const p of map.pickups ?? []) points.push({ x: p.x, y: p.y });
	for (const e of map.encounters ?? []) points.push({ x: e.x, y: e.y });
	for (const n of map.npcs ?? []) points.push({ x: n.x, y: n.y });
	for (const a of map.ambientNpcs ?? []) points.push({ x: a.x, y: a.y });
	for (const d of map.discoveries ?? []) points.push({ x: d.x, y: d.y });
	for (const b of map.blockers ?? []) if (b.kind === 'future-gate') points.push({ x: b.x, y: b.y });
	// Visual breadcrumbs count as interest even when not interactive: a decor prop or
	// ground patch reads as "something is over there" to the player walking the route.
	for (const d of map.mapDecor ?? []) points.push({ x: d.x, y: d.y });
	for (const g of map.groundPatches ?? []) points.push({ x: g.x, y: g.y });
	return points;
}

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

// Stricter than "is any sample near interest?": walks the segment and returns the
// longest continuous stretch with nothing interesting within `radius`, plus where that
// gap is, so a failing route names the dead spot instead of just the segment index.
function worstEmptyGapAlongSegment(
	a: Pt,
	b: Pt,
	points: Pt[],
	stepPx: number,
	radius: number
): { gap: number; at: Pt } {
	let currentGap = 0;
	let maxGap = 0;
	let worstAt: Pt = a;
	for (const sample of segmentSamples(a, b, stepPx)) {
		const hasNearbyInterest = points.some(
			(point) => Math.hypot(point.x - sample.x, point.y - sample.y) <= radius
		);
		if (hasNearbyInterest) {
			currentGap = 0;
		} else {
			currentGap += stepPx;
			if (currentGap > maxGap) {
				maxGap = currentGap;
				worstAt = sample;
			}
		}
	}
	return { gap: maxGap, at: worstAt };
}

// Sampling cadence + tolerances for the route-interest tests. A route fails when any
// stretch longer than ROUTE_MAX_EMPTY_GAP has no interest within ROUTE_INTEREST_RADIUS.
const ROUTE_STEP_PX = 256;
const ROUTE_INTEREST_RADIUS = 650;
const ROUTE_MAX_EMPTY_GAP = 700;

function expectRouteHasNoEmptyStretch(label: string, route: readonly Pt[]): void {
	const points = interestPoints(meadowEntryMap);
	for (let i = 0; i < route.length - 1; i += 1) {
		const { gap, at } = worstEmptyGapAlongSegment(
			route[i],
			route[i + 1],
			points,
			ROUTE_STEP_PX,
			ROUTE_INTEREST_RADIUS
		);
		expect(
			gap,
			`${label}: ${gap}px with no interest near (${Math.round(at.x)}, ${Math.round(at.y)}) on segment ${i}`
		).toBeLessThanOrEqual(ROUTE_MAX_EMPTY_GAP);
	}
}

function payoffsNear(map: WorldMapDefinition, endpoint: Pt, radius: number): Pt[] {
	const candidates = [
		...(map.pickups ?? []),
		...(map.landmarks ?? []),
		...(map.npcs ?? []),
		...(map.ambientNpcs ?? []),
		...(map.discoveries ?? [])
	];
	return candidates.filter((c) => Math.hypot(c.x - endpoint.x, c.y - endpoint.y) <= radius);
}

function nonLandmarkPayoffsNear(map: WorldMapDefinition, endpoint: Pt, radius: number): Pt[] {
	const candidates = [
		...(map.pickups ?? []),
		...(map.npcs ?? []),
		...(map.ambientNpcs ?? []),
		...(map.discoveries ?? [])
	];
	return candidates.filter((c) => Math.hypot(c.x - endpoint.x, c.y - endpoint.y) <= radius);
}

function storyFacingNear(map: WorldMapDefinition, endpoint: Pt, radius: number): Pt[] {
	const candidates = [...(map.landmarks ?? []), ...(map.discoveries ?? [])];
	return candidates.filter((c) => Math.hypot(c.x - endpoint.x, c.y - endpoint.y) <= radius);
}

function pointInsideRect(
	point: Pt,
	rect: { x: number; y: number; width: number; height: number }
): boolean {
	return (
		Math.abs(point.x - rect.x) <= rect.width / 2 && Math.abs(point.y - rect.y) <= rect.height / 2
	);
}

describe('exploration test helpers', () => {
	it('collects entity ids and interest points from the meadow map', () => {
		expect(collectEntityIds(meadowEntryMap).size).toBeGreaterThan(0);
		expect(interestPoints(meadowEntryMap).length).toBeGreaterThan(0);
	});

	it('samples a segment inclusive of both endpoints', () => {
		const samples = segmentSamples({ x: 0, y: 0 }, { x: 700, y: 0 }, 350);
		expect(samples[0]).toEqual({ x: 0, y: 0 });
		expect(samples.at(-1)).toEqual({ x: 700, y: 0 });
	});

	it('detects a point inside a center-based rect', () => {
		expect(pointInsideRect({ x: 10, y: 10 }, { x: 0, y: 0, width: 40, height: 40 })).toBe(true);
		expect(pointInsideRect({ x: 30, y: 0 }, { x: 0, y: 0, width: 40, height: 40 })).toBe(false);
	});

	it('exercises remaining helpers without throwing', () => {
		const a: Pt = { x: 0, y: 0 };
		const b: Pt = { x: 700, y: 0 };
		expect(worstEmptyGapAlongSegment(a, b, [], 350, 1).gap).toBeGreaterThan(0);
		const anchor = (meadowEntryMap.landmarks ?? [])[0];
		expect(anchor).toBeDefined();
		expect(payoffsNear(meadowEntryMap, anchor, 1).length).toBeGreaterThan(0);
		expect(storyFacingNear(meadowEntryMap, anchor, 1).length).toBeGreaterThan(0);
	});
});

describe('runtime-faithful Meadow Entry routes', () => {
	it('keeps the hero house approach clear to the Crossroads', () => {
		expectRouteClear(
			meadowEntryMap,
			V2_ROUTE_POINTS.heroHouseToCrossroads,
			'hero house to crossroads'
		);
	});

	it('keeps the Crossroads to Mistfen seam clear', () => {
		expectRouteClear(
			meadowEntryMap,
			V2_ROUTE_POINTS.crossroadsToMistfen,
			'crossroads to Mistfen seam'
		);
	});

	it('keeps the Crossroads to Silverpine seam clear', () => {
		expectRouteClear(
			meadowEntryMap,
			V2_ROUTE_POINTS.crossroadsToSilverpine,
			'crossroads to Silverpine seam'
		);
	});

	it('keeps the Crossroads to Wildwood seam clear', () => {
		expectRouteClear(
			meadowEntryMap,
			V2_ROUTE_POINTS.crossroadsToWildwood,
			'crossroads to Wildwood seam'
		);
	});

	it('keeps the Crossroads to Tidewatch Coast seam clear', () => {
		expectRouteClear(
			meadowEntryMap,
			V2_ROUTE_POINTS.crossroadsToCoast,
			'crossroads to Tidewatch Coast seam'
		);
	});
});

// Route-interest guard: each route below must have no walkable stretch longer than
// ROUTE_MAX_EMPTY_GAP without something interesting within ROUTE_INTEREST_RADIUS. These
// bite — removing wildwood-staging-brush reopens a 1536px dead stretch on the wildwood
// climb, and removing crossroads-cache fails the crossroads payoff test. The spawn→
// crossroads approach is intentionally NOT single-breadcrumb dependent: it is redundantly
// covered by village-roadside-cache, village-roadside-flowers, and villager-house-3, so
// no one prop is load-bearing there. That redundancy is by design, not a gap in the test.
describe('route: spawn → crossroads', () => {
	it('has no empty stretch longer than the gap tolerance', () => {
		expectRouteHasNoEmptyStretch('spawn → crossroads', V2_FULL_ROUTE_POINTS.heroHouseToCrossroads);
	});
});

describe('dead end: castle gate', () => {
	it('has a payoff and a story-facing element beyond the blocker', () => {
		const endpoint = { x: 4_176, y: 2_976 };
		expect(payoffsNear(meadowEntryMap, endpoint, 360).length).toBeGreaterThan(0);
		expect(storyFacingNear(meadowEntryMap, endpoint, 360).length).toBeGreaterThan(0);
		expect(
			nonLandmarkPayoffsNear(meadowEntryMap, endpoint, 360).length,
			'castle gate dead end needs a non-landmark payoff (warning discovery)'
		).toBeGreaterThan(0);
	});
});

describe('crossroads hub', () => {
	it('offers a payoff pickup without leaving the plaza', () => {
		const cache = (meadowEntryMap.pickups ?? []).find((p) => p.id === 'crossroads-cache');
		expect(cache).toBeDefined();
	});
});

describe('route: crossroads → coast', () => {
	it('has no empty stretch longer than the gap tolerance', () => {
		expectRouteHasNoEmptyStretch('crossroads → coast', V2_FULL_ROUTE_POINTS.crossroadsToCoast);
	});
});

describe('dead end: coast jetty', () => {
	it('rewards reaching the jetty', () => {
		expect(payoffsNear(meadowEntryMap, { x: 4_900, y: 6_180 }, 360).length).toBeGreaterThan(0);
	});
});

describe('route: crossroads → mistfen', () => {
	it('has no empty stretch longer than the gap tolerance', () => {
		expectRouteHasNoEmptyStretch('crossroads → mistfen', V2_FULL_ROUTE_POINTS.crossroadsToMistfen);
	});
});

describe('dead end: witchwood gate', () => {
	it('has a payoff and a story-facing element beyond the blocker', () => {
		const endpoint = { x: 1_200, y: 620 };
		expect(payoffsNear(meadowEntryMap, endpoint, 360).length).toBeGreaterThan(0);
		expect(storyFacingNear(meadowEntryMap, endpoint, 360).length).toBeGreaterThan(0);
		expect(
			nonLandmarkPayoffsNear(meadowEntryMap, { x: 1_200, y: 620 }, 360).length,
			'witchwood gate dead end needs a non-landmark payoff (poison warning discovery)'
		).toBeGreaterThan(0);
	});
});

describe('route: crossroads → silverpine', () => {
	it('has no empty stretch longer than the gap tolerance', () => {
		expectRouteHasNoEmptyStretch(
			'crossroads → silverpine',
			V2_FULL_ROUTE_POINTS.crossroadsToSilverpine
		);
	});
});

describe('dead end: silver shrine gate', () => {
	it('has a payoff and a story-facing element beyond the blocker', () => {
		const endpoint = { x: 3_000, y: 480 };
		expect(payoffsNear(meadowEntryMap, endpoint, 360).length).toBeGreaterThan(0);
		expect(storyFacingNear(meadowEntryMap, endpoint, 360).length).toBeGreaterThan(0);
		expect(
			nonLandmarkPayoffsNear(meadowEntryMap, endpoint, 360).length,
			'silver shrine gate dead end needs a non-landmark payoff (offering cache)'
		).toBeGreaterThan(0);
	});
});

describe('route: crossroads → wildwood cave', () => {
	it('has no empty stretch longer than the gap tolerance', () => {
		expectRouteHasNoEmptyStretch(
			'crossroads → wildwood cave',
			V2_FULL_ROUTE_POINTS.crossroadsToWildwood
		);
	});

	it('preserves the slime encounters and the ruins transition', () => {
		const encounterIds = (meadowEntryMap.encounters ?? []).map((e) => e.id);
		expect(encounterIds).toEqual(
			expect.arrayContaining(['meadow-slime-west', 'meadow-slime-center', 'meadow-slime-east'])
		);
		expect(meadowEntryMap.transitions.some((t) => t.toMapId === 'ruins-threshold')).toBe(true);
	});
});

describe('interior return arrivals are standable', () => {
	// Regression: three interiors (guild-hall, villager-house-3, shrine-of-aurora)
	// each returned the player to a point inside a padded blocker. The shrine one
	// was hard stuck — WorldScene refuses any move that leaves the player
	// intersecting a blocker, and the arrival already intersected the south
	// perimeter wall, so every direction was refused and the save recorded that
	// position. Nothing caught it: the layered contract (A1-A12) validates the
	// village *source*, and these arrivals live in the interior maps.
	//
	// Two properties, both load-bearing:
	//  1. the arrival is standable under the game's real composed rule
	//     (tile centre outside every collision + landmark rect padded by the
	//     player radius) — otherwise the player arrives entombed;
	//  2. it is further from its door than the transition trigger radius
	//     (playerRadius 12 + transitionRadius 18 = 30px) — otherwise the first
	//     step after arriving re-enters the interior the player just left.
	const PLAYER_RADIUS = 12;
	const TRANSITION_TRIGGER = 30;
	const rects = [
		...collectStrictCollisionRects(meadowEntryMap),
		...collectLandmarkRects(meadowEntryMap)
	];
	const returns = Object.values(maps).flatMap((map) =>
		(map.transitions ?? [])
			.filter((transition) => transition.toMapId === meadowEntryMap.id && transition.arrival)
			.map((transition) => ({ mapId: map.id, transition }))
	);

	it('covers every interior that returns to the meadow', () => {
		expect(returns.length).toBeGreaterThanOrEqual(7);
	});

	it.each(returns)('$mapId — $transition.id arrival is standable', ({ transition }) => {
		const { x, y } = transition.arrival!;
		expect(
			isInsideAnyCollisionRect(x, y, rects, PLAYER_RADIUS),
			`arrival (${x},${y}) is inside a padded blocker — the player would arrive unable to move`
		).toBe(false);
	});

	it.each(returns)('$mapId — $transition.id arrival clears its door', ({ mapId, transition }) => {
		const { x, y } = transition.arrival!;
		const door = meadowEntryMap.transitions.find((t) => t.toMapId === mapId);
		expect(door, `no meadow-side door targets ${mapId}`).toBeDefined();
		const distance = Math.hypot(x - door!.x, y - door!.y);
		expect(
			distance,
			`arrival (${x},${y}) is ${Math.round(distance)}px from its door — inside the ${TRANSITION_TRIGGER}px trigger, so stepping out re-enters`
		).toBeGreaterThan(TRANSITION_TRIGGER);
	});
});

describe('critical routes stay runtime-clear', () => {
	const criticalRoutes: readonly (readonly Pt[])[] = [
		V2_FULL_ROUTE_POINTS.crossroadsToCoast,
		V2_FULL_ROUTE_POINTS.crossroadsToSilverpine,
		V2_FULL_ROUTE_POINTS.crossroadsToMistfen,
		V2_FULL_ROUTE_POINTS.crossroadsToWildwood
	];

	it('keeps every critical-route sample outside runtime collisions', () => {
		for (const [index, route] of criticalRoutes.entries()) {
			expectRouteClear(meadowEntryMap, route, `critical route ${index + 1}`);
		}
	});
});

function localeHasPath(source: unknown, key: string): boolean {
	let current: unknown = source;
	for (const segment of key.split('.')) {
		if (typeof current !== 'object' || current === null) return false;
		current = (current as Record<string, unknown>)[segment];
	}
	return typeof current === 'string' && current.trim().length > 0;
}

describe('discovery content', () => {
	const discoveries = meadowEntryMap.discoveries ?? [];

	it('places at least the curated discovery set', () => {
		expect(discoveries.length).toBeGreaterThanOrEqual(6);
	});

	it.each(discoveries)('discovery $id is valid and localized in all locales', (discovery) => {
		expectRectInsideMap({ x: discovery.x, y: discovery.y, width: 2, height: 2 });
		for (const key of [discovery.labelKey, discovery.descriptionKey]) {
			expectEnglishMessage(key);
			expect(localeHasPath(en, key), `en missing ${key}`).toBe(true);
			expect(localeHasPath(ja, key), `ja missing ${key}`).toBe(true);
			expect(localeHasPath(zhHant, key), `zh-Hant missing ${key}`).toBe(true);
		}
	});
});
