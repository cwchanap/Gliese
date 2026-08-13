import { describe, expect, it } from 'vitest';

import { boundsArea, unionArea } from './meadow-entry-authoring-geometry';
import type { MeadowEntryBakeOwnershipEntry } from './meadow-entry-bake-ownership';
import { validateMeadowEntryCropContract } from './meadow-entry-crop-manifest';
import {
	MEADOW_ENTRY_PAINTED_V2_PILOT_BUDGET_SUMMARY,
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_FALLBACK_REQUIREMENTS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE
} from './meadow-entry-painted-v2-crop-manifest';

const MIB = 1_024 * 1_024;
const MEASURED_SUNDROP_BASE_BYTES = 26_114_768;
const MEASURED_CROSSROADS_BASE_BYTES = 27_604_984;

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
					baseReviewBytes: 26_214_400,
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
					baseReviewBytes: 28_311_552,
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
			aggregateBaseReviewBytes: 54_525_952,
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
