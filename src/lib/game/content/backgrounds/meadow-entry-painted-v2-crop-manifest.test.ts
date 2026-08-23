import { describe, expect, it } from 'vitest';

import { boundsArea, intersectBounds, unionArea } from './meadow-entry-authoring-geometry';
import type { MeadowEntryBakeOwnershipEntry } from './meadow-entry-bake-ownership';
import { validateMeadowEntryCropContract } from './meadow-entry-crop-manifest';
import {
	MEADOW_ENTRY_PAINTED_V2_PILOT_BUDGET_SUMMARY,
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_FALLBACK_REQUIREMENTS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_BUDGET_SUMMARY,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_FALLBACK_REQUIREMENTS,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_OVERLAPS,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_COVERAGE
} from './meadow-entry-painted-v2-crop-manifest';

const MIB = 1_024 * 1_024;
const MEASURED_SUNDROP_BASE_BYTES = 27_461_169;
const MEASURED_CROSSROADS_BASE_BYTES = 29_152_817;

const syntheticOwnership: MeadowEntryBakeOwnershipEntry[] = [
	{
		ref: { sourceType: 'ground-patch', sourceId: 'crossroads-plaza' },
		primaryRegionId: 'crossroads',
		disposition: { mode: 'base-underlay' },
		runtimeRequirement: 'fallback-tile'
	}
];

describe('painted-v2 pilot crop contract', () => {
	it('exports the exact immutable crop, overlap, and source-region rows', () => {
		expect(
			MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map((crop) => ({
				id: crop.id,
				derivation: crop.derivation,
				reviewBounds: crop.reviewBounds,
				preClampBounds: crop.preClampBounds,
				coverageAttachments: crop.coverageAttachments,
				edgeClamp: crop.edgeClamp,
				bounds: crop.bounds,
				expectedDimensions: crop.expectedDimensions,
				baseFilename: crop.baseFilename,
				foregroundFilename: crop.foregroundFilename,
				textureKeys: crop.textureKeys,
				drawOrder: crop.drawOrder,
				sourceRegionIds: crop.sourceRegionIds,
				neighborIds: crop.neighborIds,
				overlapIds: crop.overlapIds,
				alphaPolicy: crop.alphaPolicy,
				sizeBudgets: crop.sizeBudgets
			}))
		).toEqual([
			{
				id: 'painted-v2-sundrop-camera-base',
				derivation: { mode: 'exact-bounds' },
				reviewBounds: { left: 0, top: 3200, right: 3200, bottom: 6400 },
				preClampBounds: { left: 0, top: 3200, right: 3200, bottom: 6400 },
				coverageAttachments: [],
				edgeClamp: null,
				bounds: { left: 0, top: 3200, right: 3200, bottom: 6400 },
				expectedDimensions: { width: 3200, height: 3200 },
				baseFilename: 'painted-v2-sundrop-camera-base.png',
				foregroundFilename: null,
				textureKeys: {
					base: 'meadow-entry-painted-v2-sundrop-camera-base',
					foreground: null
				},
				drawOrder: 0,
				sourceRegionIds: ['connector-village-crossroads', 'sundrop-village'],
				neighborIds: ['painted-v2-crossroads-camera-base'],
				overlapIds: ['painted-v2-overlap-camera-bases'],
				alphaPolicy: { base: 'opaque', foreground: null },
				sizeBudgets: {
					baseReviewBytes: 27_461_169,
					baseHardBytes: 32 * MIB,
					foregroundReviewBytes: null,
					foregroundHardBytes: null
				}
			},
			{
				id: 'painted-v2-crossroads-camera-base',
				derivation: { mode: 'exact-bounds' },
				reviewBounds: { left: 2368, top: 2240, right: 5568, bottom: 5440 },
				preClampBounds: { left: 2368, top: 2240, right: 5568, bottom: 5440 },
				coverageAttachments: [],
				edgeClamp: null,
				bounds: { left: 2368, top: 2240, right: 5568, bottom: 5440 },
				expectedDimensions: { width: 3200, height: 3200 },
				baseFilename: 'painted-v2-crossroads-camera-base.png',
				foregroundFilename: null,
				textureKeys: {
					base: 'meadow-entry-painted-v2-crossroads-camera-base',
					foreground: null
				},
				drawOrder: 10,
				sourceRegionIds: [
					'connector-village-crossroads',
					'crossroads',
					'mistfen',
					'silverpine',
					'tidewatch-coast',
					'wildwood'
				],
				neighborIds: ['painted-v2-sundrop-camera-base'],
				overlapIds: ['painted-v2-overlap-camera-bases'],
				alphaPolicy: { base: 'opaque', foreground: null },
				sizeBudgets: {
					baseReviewBytes: 29_152_817,
					baseHardBytes: 32 * MIB,
					foregroundReviewBytes: null,
					foregroundHardBytes: null
				}
			}
		]);

		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS).toEqual([
			{
				id: 'painted-v2-overlap-camera-bases',
				firstCropId: 'painted-v2-sundrop-camera-base',
				secondCropId: 'painted-v2-crossroads-camera-base',
				bounds: { left: 2368, top: 3200, right: 3200, bottom: 5440 },
				routeMouth: {
					sharedAxis: 'x',
					bounds: { left: 3072, top: 4608, right: 3200, bottom: 4768 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-only',
				ownerCropId: 'painted-v2-crossroads-camera-base'
			}
		]);
	});

	it('exports the exact non-overlapping partial runtime coverage partition', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE).toEqual([
			{
				mode: 'baked',
				bounds: { left: 2368, top: 2240, right: 5568, bottom: 3200 },
				cropIds: ['painted-v2-crossroads-camera-base']
			},
			{
				mode: 'baked',
				bounds: { left: 0, top: 3200, right: 2368, bottom: 5440 },
				cropIds: ['painted-v2-sundrop-camera-base']
			},
			{
				mode: 'baked',
				bounds: { left: 2368, top: 3200, right: 3200, bottom: 5440 },
				cropIds: ['painted-v2-sundrop-camera-base', 'painted-v2-crossroads-camera-base']
			},
			{
				mode: 'baked',
				bounds: { left: 3200, top: 3200, right: 5568, bottom: 5440 },
				cropIds: ['painted-v2-crossroads-camera-base']
			},
			{
				mode: 'baked',
				bounds: { left: 0, top: 5440, right: 3200, bottom: 6400 },
				cropIds: ['painted-v2-sundrop-camera-base']
			}
		]);

		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_FALLBACK_REQUIREMENTS).toEqual([]);
		expect(
			unionArea(MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE.map(({ bounds }) => bounds))
		).toBe(unionArea(MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map(({ bounds }) => bounds)));
		expect(unionArea(MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map(({ bounds }) => bounds))).toBe(
			18_616_320
		);
		expect(
			MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE.reduce(
				(area, entry) => area + boundsArea(entry.bounds),
				0
			)
		).toBe(18_616_320);
	});

	it('exports the exact pilot budget summary and requires explicit synthetic ownership', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_BUDGET_SUMMARY).toEqual({
			exportAreaRatio: 0.5,
			overlapArea: 1_863_680,
			aggregateBaseReviewBytes: 56_613_986,
			aggregateBaseHardBytes: 64 * MIB,
			aggregateForegroundReviewBytes: 0,
			aggregateForegroundHardBytes: 0
		});

		const options = {
			crops: MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
			overlaps: MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS,
			runtimeCoverage: MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE,
			budgetSummary: MEADOW_ENTRY_PAINTED_V2_PILOT_BUDGET_SUMMARY,
			coverageMode: 'partial' as const,
			requiredFallbacks: MEADOW_ENTRY_PAINTED_V2_PILOT_FALLBACK_REQUIREMENTS
		};
		expect(() => validateMeadowEntryCropContract(options)).toThrow(/Baked source/);
		expect(() =>
			validateMeadowEntryCropContract({ ...options, bakeOwnership: syntheticOwnership })
		).not.toThrow();
	});

	it('keeps measured export bytes below the approved ceilings', () => {
		const [sundrop, crossroads] = MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS;
		expect(sundrop.sizeBudgets.baseReviewBytes).toBeGreaterThanOrEqual(MEASURED_SUNDROP_BASE_BYTES);
		expect(crossroads.sizeBudgets.baseReviewBytes).toBeGreaterThanOrEqual(
			MEASURED_CROSSROADS_BASE_BYTES
		);
		expect(sundrop.sizeBudgets.baseHardBytes).toBe(32 * MIB);
		expect(crossroads.sizeBudgets.baseHardBytes).toBe(32 * MIB);
		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_BUDGET_SUMMARY.aggregateBaseHardBytes).toBe(64 * MIB);
	});
});

describe('painted-v2 complete crop contract', () => {
	it('exports four exact, non-overlapping 3200px world quadrants', () => {
		expect(
			MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS.map(({ id, bounds, expectedDimensions }) => ({
				id,
				bounds,
				expectedDimensions
			}))
		).toEqual([
			{
				id: 'painted-v2-complete-northwest',
				bounds: { left: 0, top: 0, right: 3200, bottom: 3200 },
				expectedDimensions: { width: 3200, height: 3200 }
			},
			{
				id: 'painted-v2-complete-northeast',
				bounds: { left: 3200, top: 0, right: 6400, bottom: 3200 },
				expectedDimensions: { width: 3200, height: 3200 }
			},
			{
				id: 'painted-v2-complete-southwest',
				bounds: { left: 0, top: 3200, right: 3200, bottom: 6400 },
				expectedDimensions: { width: 3200, height: 3200 }
			},
			{
				id: 'painted-v2-complete-southeast',
				bounds: { left: 3200, top: 3200, right: 6400, bottom: 6400 },
				expectedDimensions: { width: 3200, height: 3200 }
			}
		]);

		const cropIds = MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS.map(({ id }) => id);
		const textureKeys = MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS.map(
			({ textureKeys }) => textureKeys.base
		);
		const drawOrders = MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS.map(({ drawOrder }) => drawOrder);
		expect(new Set(cropIds).size).toBe(4);
		expect(new Set(textureKeys).size).toBe(4);
		expect(new Set(drawOrders).size).toBe(4);
		expect(drawOrders).toEqual([0, 10, 20, 30]);
		expect(unionArea(MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS.map(({ bounds }) => bounds))).toBe(
			6_400 * 6_400
		);
		expect(
			MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS.reduce(
				(area, crop) => area + boundsArea(crop.bounds),
				0
			)
		).toBe(6_400 * 6_400);
		for (let firstIndex = 0; firstIndex < cropIds.length - 1; firstIndex += 1) {
			for (let secondIndex = firstIndex + 1; secondIndex < cropIds.length; secondIndex += 1) {
				expect(
					intersectBounds(
						MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS[firstIndex]!.bounds,
						MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS[secondIndex]!.bounds
					)
				).toBeNull();
			}
		}
	});

	it('contains only opaque base textures and exact complete runtime coverage', () => {
		expect(
			MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS.every(
				({ foregroundFilename, textureKeys, alphaPolicy }) =>
					foregroundFilename === null &&
					textureKeys.foreground === null &&
					alphaPolicy.foreground === null
			)
		).toBe(true);
		expect(MEADOW_ENTRY_PAINTED_V2_COMPLETE_OVERLAPS).toEqual([]);
		expect(MEADOW_ENTRY_PAINTED_V2_COMPLETE_FALLBACK_REQUIREMENTS).toEqual([]);
		expect(MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_COVERAGE).toEqual([
			{
				mode: 'baked',
				bounds: { left: 0, top: 0, right: 3200, bottom: 3200 },
				cropIds: ['painted-v2-complete-northwest']
			},
			{
				mode: 'baked',
				bounds: { left: 3200, top: 0, right: 6400, bottom: 3200 },
				cropIds: ['painted-v2-complete-northeast']
			},
			{
				mode: 'baked',
				bounds: { left: 0, top: 3200, right: 3200, bottom: 6400 },
				cropIds: ['painted-v2-complete-southwest']
			},
			{
				mode: 'baked',
				bounds: { left: 3200, top: 3200, right: 6400, bottom: 6400 },
				cropIds: ['painted-v2-complete-southeast']
			}
		]);
		expect(MEADOW_ENTRY_PAINTED_V2_COMPLETE_BUDGET_SUMMARY).toEqual({
			exportAreaRatio: 1,
			overlapArea: 0,
			aggregateBaseReviewBytes: 128 * MIB,
			aggregateBaseHardBytes: 128 * MIB,
			aggregateForegroundReviewBytes: 0,
			aggregateForegroundHardBytes: 0
		});

		expect(() =>
			validateMeadowEntryCropContract({
				crops: MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS,
				overlaps: MEADOW_ENTRY_PAINTED_V2_COMPLETE_OVERLAPS,
				runtimeCoverage: MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_COVERAGE,
				budgetSummary: MEADOW_ENTRY_PAINTED_V2_COMPLETE_BUDGET_SUMMARY,
				coverageMode: 'full-world',
				requiredFallbacks: MEADOW_ENTRY_PAINTED_V2_COMPLETE_FALLBACK_REQUIREMENTS
			})
		).not.toThrow();
	});
});
