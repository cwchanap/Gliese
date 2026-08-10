import { describe, expect, it } from 'vitest';

import { getVillageBuildingFrameName, villageBuildingAsset } from '$lib/game/content/assets';
import { PLAYER_COLLISION_RADIUS } from '$lib/game/core/collision';
import { NORMALIZE_TRANSITION_RADIUS } from '$lib/game/save/save-state';
import {
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
	layoutRectContainsPoint,
	rect,
	rectClearance,
	rectContains,
	rectsConnect,
	rectsOverlap
} from './layout-rects';

function expectStructuralGrid(value: { x: number; y: number; width: number; height: number }) {
	for (const [name, number] of Object.entries(value)) {
		expect(number, name).toBeGreaterThanOrEqual(0);
		expect(number % 32, `${name}=${number}`).toBe(0);
	}
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
		expect(rectsConnect(routes.villageToCrossroads, routes.crossroadsPlaza)).toBe(true);
		expect(rectsConnect(routes.crossroadsPlaza, routes.crossroadsNorthTrunk)).toBe(true);
		expect(rectsConnect(routes.crossroadsNorthTrunk, routes.crossroadsToMistfen)).toBe(true);
		expect(rectsConnect(routes.crossroadsNorthTrunk, routes.crossroadsToSilverpine)).toBe(true);
		expect(rectsConnect(routes.crossroadsPlaza, routes.crossroadsToWildwood)).toBe(true);
		expect(rectsConnect(routes.crossroadsPlaza, routes.crossroadsToCoast)).toBe(true);
	});

	it('keeps the ordered semantic route/seam source registry exact', () => {
		expect(MEADOW_ENTRY_V2_ROUTE_PATCHES).toEqual([
			{
				id: 'village-to-crossroads',
				owner: 'paths',
				rect: { x: 2_816, y: 4_608, width: 448, height: 160 }
			},
			{
				id: 'crossroads-to-mistfen',
				owner: 'paths',
				rect: { x: 3_072, y: 3_072, width: 608, height: 160 }
			},
			{
				id: 'crossroads-to-silverpine',
				owner: 'paths',
				rect: { x: 3_680, y: 2_432, width: 192, height: 384 }
			},
			{
				id: 'crossroads-to-wildwood',
				owner: 'paths',
				rect: { x: 4_288, y: 4_144, width: 704, height: 160 }
			},
			{
				id: 'crossroads-to-coast',
				owner: 'paths',
				rect: { x: 4_128, y: 4_768, width: 192, height: 800 }
			},
			{
				id: 'mistfen-seam-horizontal',
				owner: 'mistfen',
				rect: { x: 2_400, y: 3_072, width: 672, height: 160 }
			},
			{
				id: 'mistfen-seam-vertical',
				owner: 'mistfen',
				rect: { x: 2_240, y: 2_752, width: 160, height: 480 }
			},
			{
				id: 'silverpine-seam',
				owner: 'silverpine',
				rect: { x: 3_424, y: 2_336, width: 352, height: 192 }
			},
			{
				id: 'wildwood-seam',
				owner: 'wildwood',
				rect: { x: 4_704, y: 3_776, width: 192, height: 384 }
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
