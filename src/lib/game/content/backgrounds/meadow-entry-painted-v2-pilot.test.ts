import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, normalize } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { PixelBounds } from './meadow-entry-authoring-types';
import {
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE
} from './meadow-entry-painted-v2-crop-manifest';
import {
	MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS,
	MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_MASTER_PATH,
	MEADOW_ENTRY_PAINTED_V2_RUNTIME_ROOT,
	MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS,
	validateMeadowEntryPaintedV2DetailPairContract
} from './meadow-entry-painted-v2-pilot';
import {
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

interface SourcePanelProvenanceRecord {
	id: string;
	raw: { path: string };
	normalized: { path: string };
}

const IMMUTABLE_DETAIL_HASHES = {
	'sundrop-north': '3c7fe6063b8043578464ae68e5ec38505ae6a866afcd72fe2ff2293bf912a4e9',
	'sundrop-south': 'b3bb18292cd23556d58f2ac7720f95037392ef60b26e9f208206e1f270fd672f',
	'hero-house-frontage': '9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b',
	'village-crossroads-connector':
		'6866f90802dfcd73d3828b41b237c8c1239ee130c9d8c8af3ac10d20c193e8b2',
	crossroads: '1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34'
} as const;

function readJson<T>(path: string): T {
	return JSON.parse(readFileSync(path, 'utf8')) as T;
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
	it('freezes the declared detail pair table and self-describing formulas', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS).toEqual([
			{
				firstId: 'sundrop-north',
				secondId: 'sundrop-south',
				bounds: { left: 256, top: 4928, right: 2880, bottom: 5056 },
				axis: 'y'
			},
			{
				firstId: 'village-crossroads-connector',
				secondId: 'crossroads',
				bounds: { left: 2880, top: 4480, right: 3392, bottom: 4768 },
				axis: 'x'
			}
		]);
		expect(MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS).not.toContainEqual(
			expect.objectContaining({
				firstId: 'village-crossroads-connector',
				secondId: 'sundrop-north'
			})
		);
		expect(MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS).toEqual({
			axisPair: 'floor((first*(lastIndex-index)+second*index+floor(lastIndex/2))/lastIndex)',
			correctionLastInsetIndex: 'min(127,floor((min(intersectionWidth,intersectionHeight)-1)/2))',
			correctionEdgeDistance: 'min(x-left,right-1-x,y-top,bottom-1-y)',
			correctionWeight:
				'meadowEntryDetailFeatherWeight(correctionEdgeDistance,correctionLastInsetIndex)',
			out: 'blendMeadowEntryDetailChannel(ordinaryComposite,axisPair,correctionWeight)'
		});
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS)).toBe(true);
		for (const pair of MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS) {
			expect(Object.isFrozen(pair)).toBe(true);
			expect(Object.isFrozen(pair.bounds)).toBe(true);
		}
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS)).toBe(true);
	});

	it('rejects stale, malformed, or conflicting detail pair contracts', () => {
		const details = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.filter(({ role }) => role === 'detail');
		const validPairs = MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS;
		const formulas = MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS;

		expect(() =>
			validateMeadowEntryPaintedV2DetailPairContract(
				details,
				[...validPairs, validPairs[0]!],
				formulas
			)
		).toThrow(/duplicate|table/i);
		expect(() =>
			validateMeadowEntryPaintedV2DetailPairContract(
				details,
				[{ ...validPairs[0]!, firstId: 'stale' }, validPairs[1]!],
				formulas
			)
		).toThrow(/missing|stale|panel/i);
		expect(() =>
			validateMeadowEntryPaintedV2DetailPairContract(
				details.filter(({ id }) => id !== 'sundrop-south'),
				validPairs,
				formulas
			)
		).toThrow(/missing|participant/i);
		expect(() =>
			validateMeadowEntryPaintedV2DetailPairContract(
				details,
				[
					{ ...validPairs[0]!, bounds: { left: 255, top: 4928, right: 2880, bottom: 5056 } },
					validPairs[1]!
				],
				formulas
			)
		).toThrow(/bounds|outside/i);
		expect(() =>
			validateMeadowEntryPaintedV2DetailPairContract(
				details,
				[
					{ ...validPairs[0]!, bounds: { left: 256, top: 4929, right: 2880, bottom: 5056 } },
					validPairs[1]!
				],
				formulas
			)
		).toThrow(/bounds|intersection/i);
		expect(() =>
			validateMeadowEntryPaintedV2DetailPairContract(
				details,
				[{ ...validPairs[0]!, axis: 'z' as 'x' }, validPairs[1]!],
				formulas
			)
		).toThrow(/axis/i);
		expect(() =>
			validateMeadowEntryPaintedV2DetailPairContract(
				details,
				[validPairs[0]!, { ...validPairs[1]!, firstId: 'sundrop-north', secondId: 'crossroads' }],
				formulas
			)
		).toThrow(/duplicate|second|ownership|overlap/i);
		expect(() =>
			validateMeadowEntryPaintedV2DetailPairContract(details, validPairs, {
				...formulas,
				axisPair: 'stale'
			})
		).toThrow(/formula/i);
	});

	it('rejects a non-exact table for canonical decoded panels without role metadata', () => {
		const decodedPanels = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.filter(
			({ role }) => role === 'detail'
		).map(({ id, bounds }) => ({ id, bounds }));

		expect(() =>
			validateMeadowEntryPaintedV2DetailPairContract(
				decodedPanels,
				[],
				MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS
			)
		).toThrow(/table|pair/i);
	});

	it('rejects a pair whose declared axis has no blend length', () => {
		expect(() =>
			validateMeadowEntryPaintedV2DetailPairContract(
				[
					{ id: 'first', bounds: { left: 0, top: 0, right: 4, bottom: 4 } },
					{ id: 'second', bounds: { left: 0, top: 0, right: 4, bottom: 1 } }
				],
				[
					{
						firstId: 'first',
						secondId: 'second',
						bounds: { left: 0, top: 0, right: 4, bottom: 1 },
						axis: 'y'
					}
				],
				MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS
			)
		).toThrow(/zero length|axis/i);
	});

	it('rejects actual duplicate ownership of a second pair member', () => {
		const details = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.filter(({ role }) => role === 'detail');
		expect(() =>
			validateMeadowEntryPaintedV2DetailPairContract(
				details,
				[
					MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS[0]!,
					{
						firstId: 'hero-house-frontage',
						secondId: 'sundrop-south',
						bounds: { left: 384, top: 5312, right: 1280, bottom: 6144 },
						axis: 'x'
					}
				],
				MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS
			)
		).toThrow(/second member|ownership|overlap/i);
	});

	it('keeps every active provenance source path exact, repo-relative, and usable', () => {
		const packageProvenance = readJson<{
			sourcePanels: { panels: SourcePanelProvenanceRecord[] };
		}>('artifacts/meadow-entry/painted-v2/provenance.json');

		for (const panel of MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS) {
			const manifest = readJson<SourcePanelProvenanceRecord>(panel.provenancePath);
			const packagePanel = packageProvenance.sourcePanels.panels.find(({ id }) => id === panel.id);
			expect(packagePanel, `${panel.id} package provenance`).toBeDefined();

			for (const [label, provenance] of [
				['panel manifest', manifest],
				['package provenance', packagePanel!]
			] as const) {
				expect(provenance.id, label).toBe(panel.id);
				expect(provenance.raw.path, `${panel.id} ${label} raw path`).toBe(panel.rawPath);
				expect(provenance.normalized.path, `${panel.id} ${label} normalized path`).toBe(
					panel.normalizedPath
				);

				for (const path of [provenance.raw.path, provenance.normalized.path]) {
					expect(isAbsolute(path), `${panel.id} ${label} ${path}`).toBe(false);
					expect(normalize(path), `${panel.id} ${label} ${path}`).toBe(path);
					expect(existsSync(path), `${panel.id} ${label} ${path}`).toBe(true);
				}
			}
		}
	});

	it('locks the five native-detail rows and immutable package paths', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS).toEqual([
			{
				id: 'sundrop-north',
				role: 'detail',
				bounds: { left: 256, top: 3968, right: 2880, bottom: 5056 },
				expectedDimensions: { width: 2624, height: 1088 },
				assemblyPriority: 10,
				rawPath: 'artifacts/meadow-entry/painted-v2/source-panels/raw/sundrop-north.png',
				normalizedPath: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-north.png',
				provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-north.json'
			},
			{
				id: 'sundrop-south',
				role: 'detail',
				bounds: { left: 256, top: 4928, right: 2880, bottom: 6144 },
				expectedDimensions: { width: 2624, height: 1216 },
				assemblyPriority: 20,
				rawPath: 'artifacts/meadow-entry/painted-v2/source-panels/raw/sundrop-south.png',
				normalizedPath: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-south.png',
				provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/sundrop-south.json'
			},
			{
				id: 'hero-house-frontage',
				role: 'detail',
				bounds: { left: 384, top: 5312, right: 1280, bottom: 6144 },
				expectedDimensions: { width: 896, height: 832 },
				assemblyPriority: 30,
				rawPath: 'artifacts/meadow-entry/painted-v2/source-panels/raw/hero-house-frontage.png',
				normalizedPath: 'artifacts/meadow-entry/painted-v2/source-panels/hero-house-frontage.png',
				provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/hero-house-frontage.json'
			},
			{
				id: 'village-crossroads-connector',
				role: 'detail',
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
				role: 'detail',
				bounds: { left: 2880, top: 2816, right: 4608, bottom: 4768 },
				expectedDimensions: { width: 1728, height: 1952 },
				assemblyPriority: 50,
				rawPath: 'artifacts/meadow-entry/painted-v2/source-panels/raw/crossroads.png',
				normalizedPath: 'artifacts/meadow-entry/painted-v2/source-panels/crossroads.png',
				provenancePath: 'artifacts/meadow-entry/painted-v2/source-panels/crossroads.json'
			},
			{
				id: 'camera-underlay-sundrop-north',
				role: 'underlay',
				bounds: { left: 0, top: 3200, right: 3200, bottom: 4864 },
				expectedDimensions: { width: 3200, height: 1664 },
				assemblyPriority: 0,
				rawPath:
					'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-sundrop-north.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-north.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-north.json'
			},
			{
				id: 'camera-underlay-sundrop-south',
				role: 'underlay',
				bounds: { left: 0, top: 4736, right: 3200, bottom: 6400 },
				expectedDimensions: { width: 3200, height: 1664 },
				assemblyPriority: 1,
				rawPath:
					'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-sundrop-south.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-south.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-south.json'
			},
			{
				id: 'camera-underlay-crossroads-north',
				role: 'underlay',
				bounds: { left: 2368, top: 2240, right: 5568, bottom: 3904 },
				expectedDimensions: { width: 3200, height: 1664 },
				assemblyPriority: 2,
				rawPath:
					'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-north.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.json'
			},
			{
				id: 'camera-underlay-crossroads-south',
				role: 'underlay',
				bounds: { left: 2368, top: 3776, right: 5568, bottom: 5440 },
				expectedDimensions: { width: 3200, height: 1664 },
				assemblyPriority: 3,
				rawPath:
					'artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-south.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.json'
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

	it('keeps every accepted detail panel normalized hash byte-immutable', () => {
		for (const panel of MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.filter(
			({ role }) => role === 'detail'
		)) {
			const normalized = readFileSync(panel.normalizedPath);
			expect(
				createHash('sha256').update(normalized).digest('hex'),
				`${panel.id} normalized hash`
			).toBe(IMMUTABLE_DETAIL_HASHES[panel.id as keyof typeof IMMUTABLE_DETAIL_HASHES]);
		}
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
			({ id }) => id === 'painted-v2-sundrop-camera-base'
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
			({ id }) => id === 'painted-v2-crossroads-camera-base'
		)!;
		expect(crossroads.bounds).toEqual({ left: 2368, top: 2240, right: 5568, bottom: 5440 });

		const sundrop = MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.find(
			({ id }) => id === 'painted-v2-sundrop-camera-base'
		)!;
		expect(sundrop.bounds).toEqual({ left: 0, top: 3200, right: 3200, bottom: 6400 });

		const connector = MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.find(
			({ id }) => id === 'painted-v2-crossroads-camera-base'
		)!;
		const route = toPixelBounds(MEADOW_ENTRY_V2_ROUTES.villageToCrossroads);
		expect(containsBounds(connector.bounds, route)).toBe(true);
		expect(boundsOverlap(connector.bounds, sundrop.bounds)).toBe(true);
		expect(boundsOverlap(connector.bounds, crossroads.bounds)).toBe(true);

		const villageDecorWithMargin = { left: 2618, top: 4580, right: 2854, bottom: 4796 };
		expect(containsBounds(sundrop.bounds, villageDecorWithMargin)).toBe(true);
		expect(containsBounds(connector.bounds, villageDecorWithMargin)).toBe(true);

		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE).toHaveLength(5);
	});
});
