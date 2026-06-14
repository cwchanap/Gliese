import { describe, expect, it } from 'vitest';
import { enemies } from '$lib/game/content/enemies';
import { getDialogue } from '$lib/game/content/dialogue';
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
import type { WorldMapDefinition } from '$lib/game/content/maps';

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
		expect(meadowEntryMap.spawn).toEqual({ x: 1_536, y: 5_550 });
		expect(meadowEntryMap.forestZone).toBeUndefined();
		expect(meadowEntryMap.combatBounds?.map((bounds) => bounds.id)).toEqual([
			'wildwood-north-combat-pocket',
			'wildwood-crossing-combat-pocket',
			'whispering-cave-combat-pocket'
		]);
		expect(meadowEntryMap.transitions).toEqual([
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
				id: 'meadow-to-shrine-of-aurora',
				x: 1_050,
				y: 6_000,
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
			expect.arrayContaining([
				'sundrop-plaza-stone',
				'sundrop-north-lane',
				'sundrop-south-lane',
				'sundrop-west-lane',
				'sundrop-east-lane',
				'sundrop-northwest-branch',
				'sundrop-southeast-branch'
			])
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
				arrival: { x: 531, y: 6_040, facing: 'down' }
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
		expect(heroHouseMap.transitions[0].arrival).toEqual({ x: 531, y: 6_040, facing: 'down' });
		expect(guildHallMap.transitions[0].arrival).toEqual({ x: 2_048, y: 6_080, facing: 'down' });
		expect(itemShopMap.transitions[0].arrival).toEqual({ x: 2_138, y: 4_816, facing: 'down' });
		expect(villagerHouse1Map.transitions[0].arrival).toEqual({
			x: 333,
			y: 5_312,
			facing: 'down'
		});
		expect(villagerHouse2Map.transitions[0].arrival).toEqual({
			x: 1_011,
			y: 4_816,
			facing: 'down'
		});
		expect(villagerHouse3Map.transitions[0].arrival).toEqual({
			x: 2_592,
			y: 5_024,
			facing: 'down'
		});
		expect(shrineOfAuroraInteriorMap.transitions[0].arrival).toEqual({
			x: 1_050,
			y: 6_104,
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
					x: 531,
					y: 5_850,
					width: 294,
					height: 307,
					labelKey: 'content.maps.landmarks.hero-house-exterior.label'
				}),
				expect.objectContaining({
					id: 'guild-hall-exterior',
					x: 2_048,
					y: 5_869,
					width: 384,
					height: 346,
					labelKey: 'content.maps.landmarks.guild-hall-exterior.label'
				}),
				expect.objectContaining({
					id: 'item-shop-exterior',
					x: 2_138,
					y: 4_634,
					width: 307,
					height: 294,
					labelKey: 'content.maps.landmarks.item-shop-exterior.label'
				}),
				expect.objectContaining({
					id: 'villager-house-1-exterior',
					x: 333,
					y: 5_152,
					width: 282,
					height: 256,
					labelKey: 'content.maps.landmarks.villager-house-1-exterior.label'
				}),
				expect.objectContaining({
					id: 'villager-house-2-exterior',
					x: 1_011,
					y: 4_618,
					width: 422,
					height: 326,
					labelKey: 'content.maps.landmarks.villager-house-2-exterior.label'
				}),
				expect.objectContaining({
					id: 'villager-house-3-exterior',
					x: 2_592,
					y: 4_778,
					width: 230,
					height: 416,
					labelKey: 'content.maps.landmarks.villager-house-3-exterior.label'
				}),
				expect.objectContaining({
					id: 'sundrop-well',
					x: 1_536,
					y: 5_341,
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
					x: 595,
					y: 4_877,
					width: 294,
					height: 282,
					labelKey: 'content.maps.landmarks.blacksmith.label'
				}),
				expect.objectContaining({
					id: 'shrine-of-aurora',
					x: 1_050,
					y: 5_872,
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
					x: 1_536,
					y: 5_344,
					width: 672,
					height: 512,
					tile: 'ruinsFloorTile'
				},
				{ id: 'sundrop-north-lane', x: 1_536, y: 4_800, width: 64, height: 640, tile: 'pathTile' },
				{ id: 'sundrop-south-lane', x: 1_536, y: 5_818, width: 64, height: 448, tile: 'pathTile' },
				{ id: 'sundrop-west-lane', x: 720, y: 5_347, width: 992, height: 70, tile: 'pathTile' },
				{ id: 'sundrop-east-lane', x: 2_336, y: 5_347, width: 960, height: 70, tile: 'pathTile' },
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
				{ id: 'sundrop-home-pocket', x: 531, y: 6_002, width: 384, height: 96, tile: 'pathTile' },
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
			{ id: 'sundrop-home-fence', x: 531, y: 6_072, width: 384, height: 32 },
			{ id: 'sundrop-plaza-west-fence', x: 1_120, y: 5_536, width: 32, height: 288 },
			{ id: 'sundrop-plaza-east-fence', x: 1_952, y: 5_536, width: 32, height: 288 }
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
				{ id: 'mistfen-salve', x: 880, y: 2_500, itemId: 'sunleaf-salve', quantity: 1 }
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
});
