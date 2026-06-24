import { describe, expect, it } from 'vitest';
import { enemies } from '$lib/game/content/enemies';
import { getDialogue } from '$lib/game/content/dialogue';
import { mergeRegions } from '$lib/game/content/maps/meadow-entry';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';
import { en } from '$lib/game/i18n/messages/en';
import { ja } from '$lib/game/i18n/messages/ja';
import { zhHant } from '$lib/game/i18n/messages/zh-Hant';
import {
	coastDressingAsset,
	crossroadsDressingAsset,
	forestDressingAsset,
	interiorPropAsset,
	isNpcPackFrameName,
	marshDressingAsset,
	shrineDressingAsset,
	terrainTilesAsset
} from '$lib/game/content/assets';
import { getItem } from '$lib/game/content/items';
import { getShop } from '$lib/game/content/shops';
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
import { regionDesignManifest } from '$lib/game/content/maps/regions/design-manifest';

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

function expectRectClearOfRect(rect: CenterRect, blocker: CenterRect, message: string) {
	const overlaps =
		rect.x - rect.width / 2 < blocker.x + blocker.width / 2 &&
		rect.x + rect.width / 2 > blocker.x - blocker.width / 2 &&
		rect.y - rect.height / 2 < blocker.y + blocker.height / 2 &&
		rect.y + rect.height / 2 > blocker.y - blocker.height / 2;

	expect(overlaps, message).toBe(false);
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
	'sundrop-well',
	'blacksmith',
	'shrine-of-aurora'
]);

const CANOPY_DECOR_IDS = new Set(['wildwood-north-canopy', 'wildwood-east-canopy']);

function expectPointClearOfInteriorPropCollisions(
	map: WorldMapDefinition,
	point: { x: number; y: number },
	label: string
) {
	const pointRect = { x: point.x, y: point.y, width: 24, height: 24 };

	for (const prop of map.interiorProps ?? []) {
		if (!prop.collision) {
			continue;
		}

		expectRectClearOfRect(pointRect, prop.collision, `${map.id}:${label} blocked by ${prop.id}`);
	}
}

function expectHorizontalRouteClear(
	map: WorldMapDefinition,
	route: { id: string; from: { x: number; y: number }; to: { x: number; y: number } }
) {
	expect(route.from.y).toBe(route.to.y);

	const startX = Math.min(route.from.x, route.to.x);
	const endX = Math.max(route.from.x, route.to.x);
	const sampleXs = new Set<number>();

	for (let x = startX; x <= endX; x += 32) {
		sampleXs.add(x);
	}
	sampleXs.add(endX);

	for (const x of [...sampleXs].sort((left, right) => left - right)) {
		const point = { x, y: route.from.y };
		const overlappingBlocker = (map.blockers ?? []).find((blocker) =>
			isPointInsideRect(point, blocker)
		);

		expect(
			overlappingBlocker,
			`${map.id}:${route.id} blocked at (${point.x}, ${point.y})`
		).toBeUndefined();
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
		expect(meadowEntryMap.spawn).toEqual({ x: 700, y: 5_600 });
		expect(meadowEntryMap.forestZone).toBeUndefined();
		expect(meadowEntryMap.combatBounds?.map((bounds) => bounds.id)).toEqual([
			'wildwood-north-combat-pocket',
			'wildwood-crossing-combat-pocket',
			'whispering-cave-combat-pocket'
		]);
		expect(meadowEntryMap.transitions).toEqual([
			{
				id: 'meadow-to-hero-house',
				x: 700,
				y: 5_600,
				toMapId: 'hero-house',
				showMarker: false,
				arrival: { x: 256, y: 224, facing: 'up' }
			},
			{
				id: 'meadow-to-guild-hall',
				x: 1_400,
				y: 5_070,
				toMapId: 'guild-hall',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-item-shop',
				x: 600,
				y: 4_945,
				toMapId: 'item-shop',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-villager-house-1',
				x: 900,
				y: 4_880,
				toMapId: 'villager-house-1',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-villager-house-2',
				x: 1_200,
				y: 4_870,
				toMapId: 'villager-house-2',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-villager-house-3',
				x: 1_450,
				y: 5_610,
				toMapId: 'villager-house-3',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-shrine-of-aurora',
				x: 1_000,
				y: 5_610,
				toMapId: 'shrine-of-aurora-interior',
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
		]);
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

	it('keeps the bottom-left village readable with a central well and radial paths', () => {
		expect(meadowEntryMap.groundPatches?.map((patch) => patch.id)).toEqual(
			expect.arrayContaining(['sundrop-plaza-stone', 'village-spawn-pocket'])
		);
		expect(meadowEntryMap.landmarks?.map((landmark) => landmark.id)).toContain('sundrop-well');
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
				arrival: { x: 700, y: 5_700, facing: 'down' }
			}
		]);
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
			}
		}
	});

	it('keeps required ruin progression corridors clear of blockers', () => {
		expectHorizontalRouteClear(ruinsThresholdMap, {
			id: 'meadow-arrival-to-core-stair',
			from: { x: 512, y: 3_200 },
			to: { x: 5_888, y: 3_200 }
		});
		expectHorizontalRouteClear(ruinsCoreMap, {
			id: 'core-arrival-to-warden',
			from: { x: 512, y: 3_200 },
			to: { x: 4_992, y: 3_200 }
		});
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

	it('registers all compact village interiors', () => {
		const interiors = [
			heroHouseMap,
			guildHallMap,
			itemShopMap,
			villagerHouse1Map,
			villagerHouse2Map,
			villagerHouse3Map,
			shrineOfAuroraInteriorMap
		];

		expect(maps['hero-house']).toBe(heroHouseMap);
		expect(maps['guild-hall']).toBe(guildHallMap);
		expect(maps['item-shop']).toBe(itemShopMap);
		expect(maps['villager-house-1']).toBe(villagerHouse1Map);
		expect(maps['villager-house-2']).toBe(villagerHouse2Map);
		expect(maps['villager-house-3']).toBe(villagerHouse3Map);
		expect(maps['shrine-of-aurora-interior']).toBe(shrineOfAuroraInteriorMap);

		for (const map of interiors) {
			expect(map.width).toBe(16);
			expect(map.height).toBe(12);
			expect(map.transitions).toHaveLength(1);
			expect(map.transitions[0].toMapId).toBe('meadow-entry');
		}
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

			for (const npc of map.npcs ?? []) {
				expectPointClearOfInteriorPropCollisions(map, npc, npc.id);
			}
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

	it('declares exact exterior return arrivals for bottom-left village interiors', () => {
		expect(heroHouseMap.transitions[0].arrival).toEqual({ x: 700, y: 5_700, facing: 'down' });
		expect(guildHallMap.transitions[0].arrival).toEqual({ x: 1_400, y: 5_170, facing: 'down' });
		expect(itemShopMap.transitions[0].arrival).toEqual({ x: 600, y: 5_045, facing: 'down' });
		expect(villagerHouse1Map.transitions[0].arrival).toEqual({
			x: 900,
			y: 4_980,
			facing: 'down'
		});
		expect(villagerHouse2Map.transitions[0].arrival).toEqual({
			x: 1_200,
			y: 4_970,
			facing: 'down'
		});
		expect(villagerHouse3Map.transitions[0].arrival).toEqual({
			x: 1_450,
			y: 5_560,
			facing: 'down'
		});
		expect(shrineOfAuroraInteriorMap.transitions[0].arrival).toEqual({
			x: 1_000,
			y: 5_710,
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
					x: 700,
					y: 5_450,
					width: 294,
					height: 307,
					labelKey: 'content.maps.landmarks.hero-house-exterior.label'
				}),
				expect.objectContaining({
					id: 'guild-hall-exterior',
					x: 1_400,
					y: 4_900,
					width: 384,
					height: 346,
					labelKey: 'content.maps.landmarks.guild-hall-exterior.label'
				}),
				expect.objectContaining({
					id: 'item-shop-exterior',
					x: 600,
					y: 4_800,
					width: 307,
					height: 294,
					labelKey: 'content.maps.landmarks.item-shop-exterior.label'
				}),
				expect.objectContaining({
					id: 'villager-house-1-exterior',
					x: 900,
					y: 4_750,
					width: 282,
					height: 256,
					labelKey: 'content.maps.landmarks.villager-house-1-exterior.label'
				}),
				expect.objectContaining({
					id: 'villager-house-2-exterior',
					x: 1_200,
					y: 4_700,
					width: 422,
					height: 326,
					labelKey: 'content.maps.landmarks.villager-house-2-exterior.label'
				}),
				expect.objectContaining({
					id: 'villager-house-3-exterior',
					x: 1_450,
					y: 5_400,
					width: 230,
					height: 416,
					labelKey: 'content.maps.landmarks.villager-house-3-exterior.label'
				}),
				expect.objectContaining({
					id: 'sundrop-well',
					x: 1_000,
					y: 5_100,
					width: 141,
					height: 160,
					labelKey: 'content.maps.landmarks.sundrop-well.label'
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
					x: 500,
					y: 5_200,
					width: 294,
					height: 282,
					labelKey: 'content.maps.landmarks.blacksmith.label'
				}),
				expect.objectContaining({
					id: 'shrine-of-aurora',
					x: 1_000,
					y: 5_400,
					width: 307,
					height: 416,
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

	it('keeps the village cluster in the bottom-left corner and the slime forest in the top-right corner', () => {
		const villageLandmarks = (meadowEntryMap.landmarks ?? []).filter((landmark) =>
			VILLAGE_LANDMARK_IDS.has(landmark.id)
		);
		for (const landmark of villageLandmarks) {
			expect(landmark.x + landmark.width / 2).toBeLessThanOrEqual(3_072);
			expect(landmark.y - landmark.height / 2).toBeGreaterThanOrEqual(4_352);
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

	it('keeps meadow combat in the top-right forest pockets instead of a separate forest arena', () => {
		expect(meadowEntryMap.forestZone).toBeUndefined();
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
					id: 'sundrop-plaza-stone',
					x: 1_000,
					y: 5_100,
					width: 400,
					height: 400,
					tile: 'ruinsFloorTile'
				},
				{ id: 'village-spawn-pocket', x: 700, y: 5_550, width: 300, height: 100, tile: 'pathTile' },
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
		expect(meadowEntryMap.fences).toEqual([
			{ id: 'coast-approach-west-fence', x: 4_020, y: 5_250, width: 32, height: 520 },
			{ id: 'coast-approach-east-fence', x: 4_380, y: 5_250, width: 32, height: 520 },
			{ id: 'coast-fork-east-field-fence', x: 4_460, y: 5_660, width: 500, height: 32 },
			{ id: 'crossroads-south-market-fence', x: 3_600, y: 4_510, width: 520, height: 32 },
			{ id: 'crossroads-north-festival-barrier', x: 3_160, y: 3_370, width: 280, height: 32 },
			{ id: 'crossroads-north-festival-barrier-east', x: 3_840, y: 3_370, width: 280, height: 32 }
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
	[crossroadsDressingAsset.key]: crossroadsDressingAsset.frames
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
		const seen = new Set<string>([`${startCol},${startRow}`]);
		const queue: Array<[number, number]> = [[startCol, startRow]];

		while (queue.length > 0) {
			const [col, row] = queue.shift()!;
			for (const [dCol, dRow] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
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
		const seen = new Set<string>([`${startCol},${startRow}`]);
		const queue: Array<[number, number]> = [[startCol, startRow]];

		while (queue.length > 0) {
			const [col, row] = queue.shift()!;
			for (const [dCol, dRow] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
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
			...(meadowEntryMap.npcs ?? []).map((n) => ({ kind: 'npc', point: n, id: n.id }))
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
		// patches and asserts every `link-*` patch is reachable through that network.
		const groundPatches = meadowEntryMap.groundPatches ?? [];
		const links = groundPatches.filter((patch) => patch.id.startsWith('link-'));
		const regionGround = groundPatches.filter((patch) => !patch.id.startsWith('link-'));
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

	it('surfaces composed region interactive NPCs onto the map (no silent drop)', () => {
		// Guard against the mergeRegions -> meadowEntryMap wiring gap: every
		// other merged field is spread onto the map literal, so `npcs` must be
		// too. Today no region contributes interactive NPCs, but the field must
		// still be present so a future region author's NPCs are rendered.
		expect(meadowEntryMap.npcs).toEqual([]);
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
					descriptionKey: 'content.maps.landmarks.castle-gate.label',
					kind: 'sign'
				}
			]
		};
		expect(() => mergeRegions([duplicate, duplicate])).toThrow(/duplicate id "dup-discovery"/);
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

function manifestReferencedIds(): Set<string> {
	const ids = new Set<string>();
	for (const entry of regionDesignManifest) {
		for (const id of [
			...entry.anchorIds,
			...entry.approachClueIds,
			...entry.optionalBranchIds,
			...entry.payoffIds,
			...entry.exitHookIds
		]) {
			ids.add(id);
		}
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
	// ground patch the design manifest flags as part of a region's exploration loop
	// reads as "something is over there" to the player walking the route.
	const manifestIds = manifestReferencedIds();
	for (const d of map.mapDecor ?? []) if (manifestIds.has(d.id)) points.push({ x: d.x, y: d.y });
	for (const g of map.groundPatches ?? [])
		if (manifestIds.has(g.id)) points.push({ x: g.x, y: g.y });
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

function expectRouteHasNoEmptyStretch(label: string, route: Pt[]): void {
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

	it('starts with an empty design manifest (regions appended in later tasks)', () => {
		expect(Array.isArray(regionDesignManifest)).toBe(true);
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

// Route-interest guard: each route below must have no walkable stretch longer than
// ROUTE_MAX_EMPTY_GAP without something interesting within ROUTE_INTEREST_RADIUS. These
// bite — removing wildwood-staging-brush reopens a 1536px dead stretch on the wildwood
// climb, and removing crossroads-cache fails the crossroads payoff test. The spawn→
// crossroads approach is intentionally NOT single-breadcrumb dependent: it is redundantly
// covered by village-roadside-cache, village-roadside-flowers, and villager-house-3, so
// no one prop is load-bearing there. That redundancy is by design, not a gap in the test.
describe('route: spawn → crossroads', () => {
	it('has no empty stretch longer than the gap tolerance', () => {
		expectRouteHasNoEmptyStretch('spawn → crossroads', [
			{ x: 700, y: 5_600 },
			{ x: 1_000, y: 5_100 },
			{ x: 1_600, y: 4_600 },
			{ x: 3_500, y: 4_000 }
		]);
	});
});

describe('dead end: castle gate', () => {
	it('has a payoff and a story-facing element beyond the blocker', () => {
		const endpoint = { x: 3_500, y: 2_980 };
		expect(payoffsNear(meadowEntryMap, endpoint, 360).length).toBeGreaterThan(0);
		expect(storyFacingNear(meadowEntryMap, endpoint, 360).length).toBeGreaterThan(0);
		expect(
			nonLandmarkPayoffsNear(meadowEntryMap, { x: 3_500, y: 2_980 }, 360).length,
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

describe('region design manifest completeness', () => {
	const ids = collectEntityIds(meadowEntryMap);
	const landmarkIds = new Set((meadowEntryMap.landmarks ?? []).map((l) => l.id));
	it.each(regionDesignManifest)('region $id declares a complete exploration loop', (entry) => {
		expect(entry.anchorIds.length, `${entry.id}: no anchor`).toBeGreaterThan(0);
		expect(entry.payoffIds.length, `${entry.id}: no payoff`).toBeGreaterThan(0);
		expect(entry.approachClueIds.length, `${entry.id}: no approach clue`).toBeGreaterThan(0);
		expect(
			entry.optionalBranchIds.length,
			`${entry.id}: no optional branch / side pocket`
		).toBeGreaterThan(0);
		expect(entry.exitHookIds.length, `${entry.id}: no exit hook`).toBeGreaterThan(0);
		// Payoffs must be real rewards off the signposted path, not just a landmark gate the
		// player walks up to anyway. Keeps the exploration loop ending on something earned.
		for (const id of entry.payoffIds) {
			expect(
				landmarkIds.has(id),
				`${entry.id}: payoff "${id}" is a landmark; payoffs should be non-landmark rewards`
			).toBe(false);
		}
		const declared = [
			...entry.anchorIds,
			...entry.approachClueIds,
			...entry.optionalBranchIds,
			...entry.payoffIds,
			...entry.exitHookIds
		];
		for (const id of declared) {
			expect(ids.has(id), `manifest id "${id}" (region ${entry.id}) resolves to no entity`).toBe(
				true
			);
		}
	});
});

describe('route: crossroads → coast', () => {
	it('has no empty stretch longer than the gap tolerance', () => {
		expectRouteHasNoEmptyStretch('crossroads → coast', [
			{ x: 3_500, y: 4_000 },
			{ x: 3_900, y: 4_700 },
			{ x: 4_200, y: 5_500 },
			{ x: 4_600, y: 5_840 }
		]);
	});
});

describe('dead end: coast jetty', () => {
	it('rewards reaching the jetty', () => {
		expect(payoffsNear(meadowEntryMap, { x: 4_900, y: 6_180 }, 360).length).toBeGreaterThan(0);
	});
});

describe('route: crossroads → mistfen', () => {
	it('has no empty stretch longer than the gap tolerance', () => {
		expectRouteHasNoEmptyStretch('crossroads → mistfen', [
			{ x: 3_050, y: 3_150 },
			{ x: 2_690, y: 2_750 },
			{ x: 2_150, y: 2_750 },
			{ x: 1_250, y: 1_750 },
			{ x: 1_200, y: 620 }
		]);
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
		expectRouteHasNoEmptyStretch('crossroads → silverpine', [
			{ x: 3_500, y: 3_000 },
			{ x: 3_300, y: 2_950 },
			{ x: 3_100, y: 1_600 },
			{ x: 3_000, y: 520 }
		]);
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
		expectRouteHasNoEmptyStretch('crossroads → wildwood cave', [
			{ x: 4_000, y: 4_300 },
			{ x: 4_200, y: 5_347 },
			{ x: 5_600, y: 5_347 },
			{ x: 5_600, y: 3_200 },
			{ x: 5_960, y: 1_800 }
		]);
	});

	it('preserves the slime encounters and the ruins transition', () => {
		const encounterIds = (meadowEntryMap.encounters ?? []).map((e) => e.id);
		expect(encounterIds).toEqual(
			expect.arrayContaining(['meadow-slime-west', 'meadow-slime-center', 'meadow-slime-east'])
		);
		expect(meadowEntryMap.transitions.some((t) => t.toMapId === 'ruins-threshold')).toBe(true);
	});
});

describe('critical routes avoid blockers', () => {
	const criticalRoutes: Pt[][] = [
		[
			{ x: 700, y: 5_600 },
			{ x: 1_000, y: 5_100 },
			{ x: 1_650, y: 4_550 },
			{ x: 1_650, y: 4_340 },
			{ x: 3_200, y: 4_400 },
			{ x: 3_500, y: 4_000 }
		],
		[
			{ x: 3_500, y: 4_000 },
			{ x: 4_200, y: 5_500 },
			{ x: 4_600, y: 5_840 }
		],
		[
			{ x: 3_500, y: 4_000 },
			{ x: 3_500, y: 3_000 }
		],
		[
			{ x: 3_050, y: 3_150 },
			{ x: 2_150, y: 2_750 }
		],
		[
			{ x: 4_000, y: 4_300 },
			{ x: 4_200, y: 5_347 },
			{ x: 5_600, y: 5_347 },
			{ x: 5_600, y: 3_200 }
		]
	];

	it('keeps every critical-route sample outside blockers', () => {
		const blockers = meadowEntryMap.blockers ?? [];
		for (const route of criticalRoutes) {
			for (let i = 0; i < route.length - 1; i += 1) {
				for (const sample of segmentSamples(route[i], route[i + 1], 48)) {
					for (const blocker of blockers) {
						expect(
							pointInsideRect(sample, blocker),
							`route sample (${Math.round(sample.x)},${Math.round(sample.y)}) is inside blocker ${blocker.id}`
						).toBe(false);
					}
				}
			}
		}
	});
});

const discoveryKinds = ['sign', 'lore', 'vista', 'secret', 'warning', 'foreshadow'];

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
		expect(discoveryKinds).toContain(discovery.kind);
		for (const key of [discovery.labelKey, discovery.descriptionKey]) {
			expectEnglishMessage(key);
			expect(localeHasPath(en, key), `en missing ${key}`).toBe(true);
			expect(localeHasPath(ja, key), `ja missing ${key}`).toBe(true);
			expect(localeHasPath(zhHant, key), `zh-Hant missing ${key}`).toBe(true);
		}
	});
});
