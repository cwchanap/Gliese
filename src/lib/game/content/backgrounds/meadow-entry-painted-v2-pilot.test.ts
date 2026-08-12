import { describe, expect, it } from 'vitest';

import type { PixelBounds } from './meadow-entry-authoring-types';
import {
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE
} from './meadow-entry-painted-v2-crop-manifest';
import {
	MEADOW_ENTRY_PAINTED_V2_PILOT_MASTER_PATH,
	MEADOW_ENTRY_PAINTED_V2_RUNTIME_ROOT,
	MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS
} from './meadow-entry-painted-v2-pilot';
import {
	MEADOW_ENTRY_V2_REGION_ENVELOPES,
	MEADOW_ENTRY_V2_ROUTES,
	MEADOW_ENTRY_V2_WORLD
} from '$lib/game/content/maps/layouts/meadow-entry-v2';

function toPixelBounds(rect: { x: number; y: number; width: number; height: number }): PixelBounds {
	return {
		left: rect.x,
		top: rect.y,
		right: rect.x + rect.width,
		bottom: rect.y + rect.height
	};
}

function containsBounds(container: PixelBounds, value: PixelBounds): boolean {
	return (
		container.left <= value.left &&
		container.top <= value.top &&
		container.right >= value.right &&
		container.bottom >= value.bottom
	);
}

function intersectBounds(first: PixelBounds, second: PixelBounds): PixelBounds | null {
	const intersection = {
		left: Math.max(first.left, second.left),
		top: Math.max(first.top, second.top),
		right: Math.min(first.right, second.right),
		bottom: Math.min(first.bottom, second.bottom)
	};
	return intersection.left < intersection.right && intersection.top < intersection.bottom
		? intersection
		: null;
}

function boundsOverlap(first: PixelBounds, second: PixelBounds): boolean {
	return intersectBounds(first, second) !== null;
}

/**
 * Rectangles have integer edges, so testing every cell in the edge partition
 * proves coverage for every integer pixel without iterating millions of cells.
 */
function everyPixelCoveredByPanel(crop: PixelBounds): boolean {
	const xEdges = [
		...new Set([
			crop.left,
			crop.right,
			...MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.flatMap(({ bounds }) => [
				Math.max(crop.left, bounds.left),
				Math.min(crop.right, bounds.right)
			])
		])
	]
		.filter((edge) => edge >= crop.left && edge <= crop.right)
		.sort((first, second) => first - second);
	const yEdges = [
		...new Set([
			crop.top,
			crop.bottom,
			...MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.flatMap(({ bounds }) => [
				Math.max(crop.top, bounds.top),
				Math.min(crop.bottom, bounds.bottom)
			])
		])
	]
		.filter((edge) => edge >= crop.top && edge <= crop.bottom)
		.sort((first, second) => first - second);

	for (let xIndex = 0; xIndex < xEdges.length - 1; xIndex += 1) {
		const left = xEdges[xIndex]!;
		const right = xEdges[xIndex + 1]!;
		if (left >= right) continue;
		for (let yIndex = 0; yIndex < yEdges.length - 1; yIndex += 1) {
			const top = yEdges[yIndex]!;
			const bottom = yEdges[yIndex + 1]!;
			if (top >= bottom) continue;
			const cell = { left, top, right, bottom };
			if (
				!MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.some(({ bounds }) => containsBounds(bounds, cell))
			) {
				return false;
			}
		}
	}
	return true;
}

describe('painted-v2 pilot source-panel contract', () => {
	it('locks the five native-detail rows and immutable package paths', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS).toEqual([
			{
				id: 'sundrop-north',
				bounds: { left: 256, top: 3968, right: 2880, bottom: 5056 },
				expectedDimensions: { width: 2624, height: 1088 },
				assemblyPriority: 10,
				rawPath: 'artifacts/meadow-entry/painted-v2/source-panels/raw/sundrop-north.png',
				normalizedPath: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-north.png',
				provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-north.json'
			},
			{
				id: 'sundrop-south',
				bounds: { left: 256, top: 4928, right: 2880, bottom: 6144 },
				expectedDimensions: { width: 2624, height: 1216 },
				assemblyPriority: 20,
				rawPath: 'artifacts/meadow-entry/painted-v2/source-panels/raw/sundrop-south.png',
				normalizedPath: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-south.png',
				provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-south.json'
			},
			{
				id: 'hero-house-frontage',
				bounds: { left: 384, top: 5312, right: 1280, bottom: 6144 },
				expectedDimensions: { width: 896, height: 832 },
				assemblyPriority: 30,
				rawPath: 'artifacts/meadow-entry/painted-v2/source-panels/raw/hero-house-frontage.png',
				normalizedPath: 'artifacts/meadow-entry/painted-v2/source-panels/hero-house-frontage.png',
				provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/hero-house-frontage.json'
			},
			{
				id: 'village-crossroads-connector',
				bounds: { left: 2592, top: 4480, right: 3392, bottom: 4896 },
				expectedDimensions: { width: 800, height: 416 },
				assemblyPriority: 40,
				rawPath:
					'artifacts/meadow-entry/painted-v2/source-panels/raw/village-crossroads-connector.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/source-panels/village-crossroads-connector.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/source-panels/village-crossroads-connector.json'
			},
			{
				id: 'crossroads',
				bounds: { left: 2880, top: 2816, right: 4608, bottom: 4768 },
				expectedDimensions: { width: 1728, height: 1952 },
				assemblyPriority: 50,
				rawPath: 'artifacts/meadow-entry/painted-v2/source-panels/raw/crossroads.png',
				normalizedPath: 'artifacts/meadow-entry/painted-v2/source-panels/crossroads.png',
				provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/crossroads.json'
			}
		]);
		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_MASTER_PATH).toBe(
			'artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png'
		);
		expect(MEADOW_ENTRY_PAINTED_V2_RUNTIME_ROOT).toBe(
			'public/game/assets/regions/meadow-entry-painted-v2'
		);

		const ids = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.map(({ id }) => id);
		const priorities = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.map(
			({ assemblyPriority }) => assemblyPriority
		);
		const paths = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.flatMap(
			({ rawPath, normalizedPath, provenancePath }) => [rawPath, normalizedPath, provenancePath]
		);
		expect(new Set(ids)).toHaveLength(ids.length);
		expect(new Set(priorities)).toHaveLength(priorities.length);
		expect(new Set(paths)).toHaveLength(paths.length);
		for (const panel of MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS) {
			expect(Object.isFrozen(panel)).toBe(true);
			expect(Object.isFrozen(panel.bounds)).toBe(true);
			expect(Object.isFrozen(panel.expectedDimensions)).toBe(true);
		}
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS)).toBe(true);
	});

	it('keeps panel dimensions, handoff overlap, frontage containment, and crop coverage exact', () => {
		for (const panel of MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS) {
			expect(panel.expectedDimensions).toEqual({
				width: panel.bounds.right - panel.bounds.left,
				height: panel.bounds.bottom - panel.bounds.top
			});
		}

		const north = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.find(({ id }) => id === 'sundrop-north')!;
		const south = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.find(({ id }) => id === 'sundrop-south')!;
		const villageOverlap = intersectBounds(north.bounds, south.bounds);
		expect(villageOverlap).toEqual({ left: 256, top: 4928, right: 2880, bottom: 5056 });
		expect(villageOverlap!.bottom - villageOverlap!.top).toBe(128);

		const hero = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.find(
			({ id }) => id === 'hero-house-frontage'
		)!;
		const sundropCrop = MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.find(
			({ id }) => id === 'painted-v2-sundrop-village'
		)!;
		expect(containsBounds(sundropCrop.bounds, hero.bounds)).toBe(true);

		for (const crop of MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS) {
			expect(everyPixelCoveredByPanel(crop.bounds), crop.id).toBe(true);
		}
	});

	it('keeps panels and crops inside the V2 world and pins active envelopes and seams', () => {
		const world = toPixelBounds(MEADOW_ENTRY_V2_WORLD);
		for (const panel of MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS) {
			expect(containsBounds(world, panel.bounds), panel.id).toBe(true);
		}
		for (const crop of MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS) {
			expect(containsBounds(world, crop.bounds), crop.id).toBe(true);
		}

		const crossroads = MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.find(
			({ id }) => id === 'painted-v2-crossroads'
		)!;
		expect(crossroads.bounds).toEqual(toPixelBounds(MEADOW_ENTRY_V2_REGION_ENVELOPES.crossroads));

		const sundrop = MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.find(
			({ id }) => id === 'painted-v2-sundrop-village'
		)!;
		const activeSundrop = toPixelBounds(MEADOW_ENTRY_V2_REGION_ENVELOPES.sundropVillage);
		expect(sundrop.bounds).toEqual({
			left: activeSundrop.left,
			top: activeSundrop.top,
			right: activeSundrop.right + 64,
			bottom: activeSundrop.bottom
		});

		const connector = MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.find(
			({ id }) => id === 'painted-v2-village-crossroads-connector'
		)!;
		const route = toPixelBounds(MEADOW_ENTRY_V2_ROUTES.villageToCrossroads);
		expect(containsBounds(connector.bounds, route)).toBe(true);
		expect(boundsOverlap(connector.bounds, sundrop.bounds)).toBe(true);
		expect(boundsOverlap(connector.bounds, crossroads.bounds)).toBe(true);

		const villageDecorWithMargin = { left: 2618, top: 4580, right: 2854, bottom: 4796 };
		expect(containsBounds(sundrop.bounds, villageDecorWithMargin)).toBe(true);
		expect(containsBounds(connector.bounds, villageDecorWithMargin)).toBe(true);

		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE).toHaveLength(8);
	});
});
