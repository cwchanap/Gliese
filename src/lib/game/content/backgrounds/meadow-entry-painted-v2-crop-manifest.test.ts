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
				id: 'painted-v2-sundrop-village',
				derivation: { mode: 'exact-bounds' },
				reviewBounds: { left: 256, top: 3968, right: 2880, bottom: 6144 },
				preClampBounds: { left: 256, top: 3968, right: 2880, bottom: 6144 },
				coverageAttachments: [],
				edgeClamp: null,
				bounds: { left: 256, top: 3968, right: 2880, bottom: 6144 },
				expectedDimensions: { width: 2624, height: 2176 },
				baseFilename: 'painted-v2-sundrop-village-base.png',
				foregroundFilename: null,
				textureKeys: {
					base: 'meadow-entry-painted-v2-sundrop-village-base',
					foreground: null
				},
				drawOrder: 0,
				sourceRegionIds: ['connector-village-crossroads', 'sundrop-village', 'wildwood'],
				neighborIds: ['painted-v2-village-crossroads-connector'],
				overlapIds: ['painted-v2-overlap-sundrop-connector'],
				alphaPolicy: { base: 'opaque', foreground: null },
				sizeBudgets: {
					baseReviewBytes: 20 * MIB,
					baseHardBytes: 32 * MIB,
					foregroundReviewBytes: null,
					foregroundHardBytes: null
				}
			},
			{
				id: 'painted-v2-village-crossroads-connector',
				derivation: { mode: 'exact-bounds' },
				reviewBounds: { left: 2592, top: 4480, right: 3392, bottom: 4896 },
				preClampBounds: { left: 2592, top: 4480, right: 3392, bottom: 4896 },
				coverageAttachments: [],
				edgeClamp: null,
				bounds: { left: 2592, top: 4480, right: 3392, bottom: 4896 },
				expectedDimensions: { width: 800, height: 416 },
				baseFilename: 'painted-v2-village-crossroads-connector-base.png',
				foregroundFilename: null,
				textureKeys: {
					base: 'meadow-entry-painted-v2-village-crossroads-connector-base',
					foreground: null
				},
				drawOrder: 10,
				sourceRegionIds: ['connector-village-crossroads', 'crossroads', 'sundrop-village'],
				neighborIds: ['painted-v2-sundrop-village', 'painted-v2-crossroads'],
				overlapIds: [
					'painted-v2-overlap-sundrop-connector',
					'painted-v2-overlap-connector-crossroads'
				],
				alphaPolicy: { base: 'opaque', foreground: null },
				sizeBudgets: {
					baseReviewBytes: 4 * MIB,
					baseHardBytes: 8 * MIB,
					foregroundReviewBytes: null,
					foregroundHardBytes: null
				}
			},
			{
				id: 'painted-v2-crossroads',
				derivation: { mode: 'exact-bounds' },
				reviewBounds: { left: 2880, top: 2816, right: 4608, bottom: 4768 },
				preClampBounds: { left: 2880, top: 2816, right: 4608, bottom: 4768 },
				coverageAttachments: [],
				edgeClamp: null,
				bounds: { left: 2880, top: 2816, right: 4608, bottom: 4768 },
				expectedDimensions: { width: 1728, height: 1952 },
				baseFilename: 'painted-v2-crossroads-base.png',
				foregroundFilename: null,
				textureKeys: {
					base: 'meadow-entry-painted-v2-crossroads-base',
					foreground: null
				},
				drawOrder: 20,
				sourceRegionIds: [
					'connector-crossroads-mistfen',
					'connector-crossroads-wildwood',
					'connector-village-crossroads',
					'crossroads',
					'silverpine',
					'wildwood'
				],
				neighborIds: ['painted-v2-village-crossroads-connector'],
				overlapIds: ['painted-v2-overlap-connector-crossroads'],
				alphaPolicy: { base: 'opaque', foreground: null },
				sizeBudgets: {
					baseReviewBytes: 16 * MIB,
					baseHardBytes: 24 * MIB,
					foregroundReviewBytes: null,
					foregroundHardBytes: null
				}
			}
		]);

		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS).toEqual([
			{
				id: 'painted-v2-overlap-sundrop-connector',
				firstCropId: 'painted-v2-sundrop-village',
				secondCropId: 'painted-v2-village-crossroads-connector',
				bounds: { left: 2592, top: 4480, right: 2880, bottom: 4896 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 2816, top: 4608, right: 2880, bottom: 4768 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-only',
				ownerCropId: 'painted-v2-village-crossroads-connector'
			},
			{
				id: 'painted-v2-overlap-connector-crossroads',
				firstCropId: 'painted-v2-village-crossroads-connector',
				secondCropId: 'painted-v2-crossroads',
				bounds: { left: 2880, top: 4480, right: 3392, bottom: 4768 },
				routeMouth: {
					sharedAxis: 'x',
					bounds: { left: 2880, top: 4608, right: 3264, bottom: 4768 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-only',
				ownerCropId: 'painted-v2-crossroads'
			}
		]);
	});

	it('exports the exact non-overlapping partial runtime coverage partition', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE).toEqual([
			{
				mode: 'baked',
				bounds: { left: 2880, top: 2816, right: 4608, bottom: 4480 },
				cropIds: ['painted-v2-crossroads']
			},
			{
				mode: 'baked',
				bounds: { left: 256, top: 3968, right: 2880, bottom: 4480 },
				cropIds: ['painted-v2-sundrop-village']
			},
			{
				mode: 'baked',
				bounds: { left: 256, top: 4480, right: 2592, bottom: 4896 },
				cropIds: ['painted-v2-sundrop-village']
			},
			{
				mode: 'baked',
				bounds: { left: 2592, top: 4480, right: 2880, bottom: 4896 },
				cropIds: ['painted-v2-sundrop-village', 'painted-v2-village-crossroads-connector']
			},
			{
				mode: 'baked',
				bounds: { left: 2880, top: 4480, right: 3392, bottom: 4768 },
				cropIds: ['painted-v2-village-crossroads-connector', 'painted-v2-crossroads']
			},
			{
				mode: 'baked',
				bounds: { left: 3392, top: 4480, right: 4608, bottom: 4768 },
				cropIds: ['painted-v2-crossroads']
			},
			{
				mode: 'baked',
				bounds: { left: 2880, top: 4768, right: 3392, bottom: 4896 },
				cropIds: ['painted-v2-village-crossroads-connector']
			},
			{
				mode: 'baked',
				bounds: { left: 256, top: 4896, right: 2880, bottom: 6144 },
				cropIds: ['painted-v2-sundrop-village']
			}
		]);

		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_FALLBACK_REQUIREMENTS).toEqual([]);
		expect(
			unionArea(MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE.map(({ bounds }) => bounds))
		).toBe(unionArea(MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map(({ bounds }) => bounds)));
		expect(
			MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE.reduce(
				(area, entry) => area + boundsArea(entry.bounds),
				0
			)
		).toBe(unionArea(MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map(({ bounds }) => bounds)));
	});

	it('exports the exact pilot budget summary and requires explicit synthetic ownership', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_PILOT_BUDGET_SUMMARY).toEqual({
			exportAreaRatio: 0.229875,
			overlapArea: 267_264,
			aggregateBaseReviewBytes: 40 * MIB,
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
});
