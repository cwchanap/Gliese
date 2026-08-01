import { describe, expect, it } from 'vitest';

import {
	boundsArea,
	containsBounds,
	intersectBounds,
	unionArea,
	MEADOW_ENTRY_MIN_HANDOFF_PX,
	MEADOW_ENTRY_WORLD_BOUNDS
} from './meadow-entry-authoring-geometry';
import {
	MEADOW_ENTRY_BAKE_OWNERSHIP,
	type MeadowEntryBakeOwnershipEntry
} from './meadow-entry-bake-ownership';
import {
	collectMeadowEntrySourceCatalog,
	meadowEntrySourceKey
} from './meadow-entry-source-catalog';
import {
	MEADOW_ENTRY_APPROVED_CROPS,
	MEADOW_ENTRY_APPROVED_OVERLAPS,
	MEADOW_ENTRY_CROP_BUDGET_SUMMARY,
	MEADOW_ENTRY_RUNTIME_COVERAGE,
	type MeadowEntryApprovedCrop,
	type MeadowEntryCropBudgetSummary,
	type MeadowEntryOverlap,
	type MeadowEntryRuntimeCoverage,
	validateMeadowEntryCropContract
} from './meadow-entry-crop-manifest';

const MIB = 1_024 * 1_024;
type BakedCoverage = Extract<MeadowEntryRuntimeCoverage, { mode: 'baked' }>;
type FallbackCoverage = Extract<MeadowEntryRuntimeCoverage, { mode: 'fallback-tile' }>;

function isBaked(entry: MeadowEntryBakeOwnershipEntry): boolean {
	return (
		entry.disposition.mode === 'base-underlay' ||
		entry.disposition.mode === 'base-static' ||
		entry.disposition.mode === 'base-and-foreground'
	);
}

describe('meadow-entry crop manifest', () => {
	it('freezes the reviewed candidate pipeline, dimensions, draw orders, and per-crop budgets', () => {
		expect(
			MEADOW_ENTRY_APPROVED_CROPS.map((crop) => ({
				id: crop.id,
				reviewBounds: crop.reviewBounds,
				attachments: crop.coverageAttachments,
				preClampBounds: crop.preClampBounds,
				clampSides: crop.edgeClamp?.sides ?? [],
				bounds: crop.bounds,
				dimensions: crop.expectedDimensions,
				drawOrder: crop.drawOrder,
				sourceRegionIds: crop.sourceRegionIds,
				alphaPolicy: crop.alphaPolicy,
				budgets: crop.sizeBudgets
			}))
		).toEqual([
			{
				id: 'sundrop-village-underlay',
				reviewBounds: { left: 256, top: 4_352, right: 2_048, bottom: 5_888 },
				attachments: [],
				preClampBounds: { left: 256, top: 4_352, right: 2_048, bottom: 5_888 },
				clampSides: [],
				bounds: { left: 256, top: 4_352, right: 2_048, bottom: 5_888 },
				dimensions: { width: 1_792, height: 1_536 },
				drawOrder: 0,
				sourceRegionIds: ['sundrop-village'],
				alphaPolicy: { base: 'opaque', foreground: null },
				budgets: {
					baseReviewBytes: 4_194_304,
					baseHardBytes: 8_388_608,
					foregroundReviewBytes: null,
					foregroundHardBytes: null
				}
			},
			{
				id: 'outer-boundary-east-forest-lane',
				reviewBounds: { left: 4_960, top: 1_024, right: 6_144, bottom: 5_376 },
				attachments: [
					{ left: 6_068, top: 3_200, right: 6_132, bottom: 5_300 },
					{ left: 4_968, top: 3_200, right: 5_032, bottom: 5_300 },
					{ left: 5_565, top: 1_050, right: 5_635, bottom: 5_350 }
				],
				preClampBounds: { left: 4_832, top: 896, right: 6_272, bottom: 5_504 },
				clampSides: [],
				bounds: { left: 4_832, top: 896, right: 6_272, bottom: 5_504 },
				dimensions: { width: 1_440, height: 4_608 },
				drawOrder: 10,
				sourceRegionIds: ['wildwood', 'tidewatch-coast'],
				alphaPolicy: { base: 'opaque', foreground: null },
				budgets: {
					baseReviewBytes: 25_165_824,
					baseHardBytes: 37_748_736,
					foregroundReviewBytes: null,
					foregroundHardBytes: null
				}
			},
			{
				id: 'village-crossroads-connector',
				reviewBounds: { left: 1_536, top: 3_840, right: 3_200, bottom: 4_960 },
				attachments: [],
				preClampBounds: { left: 1_408, top: 3_712, right: 3_328, bottom: 5_088 },
				clampSides: [],
				bounds: { left: 1_408, top: 3_712, right: 3_328, bottom: 5_088 },
				dimensions: { width: 1_920, height: 1_376 },
				drawOrder: 100,
				sourceRegionIds: ['connector-village-crossroads'],
				alphaPolicy: { base: 'opaque', foreground: 'sparse-eligible-mask' },
				budgets: {
					baseReviewBytes: 8_657_044,
					baseHardBytes: 12_985_566,
					foregroundReviewBytes: 3_246_392,
					foregroundHardBytes: 6_492_783
				}
			},
			{
				id: 'crossroads-coast-connector',
				reviewBounds: { left: 3_424, top: 4_544, right: 4_352, bottom: 5_568 },
				attachments: [],
				preClampBounds: { left: 3_296, top: 4_416, right: 4_480, bottom: 5_696 },
				clampSides: [],
				bounds: { left: 3_296, top: 4_416, right: 4_480, bottom: 5_696 },
				dimensions: { width: 1_184, height: 1_280 },
				drawOrder: 110,
				sourceRegionIds: ['connector-crossroads-coast'],
				alphaPolicy: { base: 'opaque', foreground: 'sparse-eligible-mask' },
				budgets: {
					baseReviewBytes: 4_966_056,
					baseHardBytes: 7_449_084,
					foregroundReviewBytes: 1_862_271,
					foregroundHardBytes: 3_724_542
				}
			},
			{
				id: 'crossroads-mistfen-connector',
				reviewBounds: { left: 2_304, top: 2_560, right: 3_136, bottom: 3_584 },
				attachments: [],
				preClampBounds: { left: 2_176, top: 2_432, right: 3_264, bottom: 3_712 },
				clampSides: [],
				bounds: { left: 2_176, top: 2_432, right: 3_264, bottom: 3_712 },
				dimensions: { width: 1_088, height: 1_280 },
				drawOrder: 120,
				sourceRegionIds: ['connector-crossroads-mistfen'],
				alphaPolicy: { base: 'opaque', foreground: 'sparse-eligible-mask' },
				budgets: {
					baseReviewBytes: 4_563_403,
					baseHardBytes: 6_845_105,
					foregroundReviewBytes: 1_711_277,
					foregroundHardBytes: 3_422_553
				}
			},
			{
				id: 'crossroads-silverpine-connector',
				reviewBounds: { left: 3_040, top: 2_880, right: 3_584, bottom: 3_104 },
				attachments: [],
				preClampBounds: { left: 2_912, top: 2_752, right: 3_712, bottom: 3_232 },
				clampSides: [],
				bounds: { left: 2_912, top: 2_752, right: 3_712, bottom: 3_232 },
				dimensions: { width: 800, height: 480 },
				drawOrder: 130,
				sourceRegionIds: ['connector-crossroads-silverpine'],
				alphaPolicy: { base: 'opaque', foreground: 'sparse-eligible-mask' },
				budgets: {
					baseReviewBytes: 1_258_292,
					baseHardBytes: 2_097_152,
					foregroundReviewBytes: 524_288,
					foregroundHardBytes: 1_048_576
				}
			},
			{
				id: 'crossroads-wildwood-connector',
				reviewBounds: { left: 3_968, top: 3_712, right: 4_352, bottom: 4_928 },
				attachments: [],
				preClampBounds: { left: 3_840, top: 3_584, right: 4_480, bottom: 5_056 },
				clampSides: [],
				bounds: { left: 3_840, top: 3_584, right: 4_480, bottom: 5_056 },
				dimensions: { width: 640, height: 1_472 },
				drawOrder: 140,
				sourceRegionIds: ['connector-crossroads-wildwood'],
				alphaPolicy: { base: 'opaque', foreground: 'sparse-eligible-mask' },
				budgets: {
					baseReviewBytes: 3_087_008,
					baseHardBytes: 4_630_512,
					foregroundReviewBytes: 1_157_628,
					foregroundHardBytes: 2_315_256
				}
			},
			{
				id: 'crossroads',
				reviewBounds: { left: 2_912, top: 2_624, right: 4_256, bottom: 4_576 },
				attachments: [],
				preClampBounds: { left: 2_784, top: 2_496, right: 4_384, bottom: 4_704 },
				clampSides: [],
				bounds: { left: 2_784, top: 2_496, right: 4_384, bottom: 4_704 },
				dimensions: { width: 1_600, height: 2_208 },
				drawOrder: 200,
				sourceRegionIds: ['crossroads'],
				alphaPolicy: { base: 'opaque', foreground: 'sparse-eligible-mask' },
				budgets: {
					baseReviewBytes: 11_576_280,
					baseHardBytes: 17_364_419,
					foregroundReviewBytes: 4_341_105,
					foregroundHardBytes: 8_682_210
				}
			},
			{
				id: 'tidewatch-coast',
				reviewBounds: { left: 2_784, top: 4_448, right: 6_400, bottom: 6_400 },
				attachments: [
					{ left: 2_800, top: 5_312, right: 5_600, bottom: 5_382 },
					{ left: 5_565, top: 4_928, right: 5_635, bottom: 5_350 },
					{ left: 6_068, top: 4_928, right: 6_132, bottom: 5_300 },
					{ left: 4_968, top: 4_928, right: 5_032, bottom: 5_300 },
					{ left: 4_450, top: 5_140, right: 5_550, bottom: 5_260 },
					{ left: 4_450, top: 5_440, right: 5_550, bottom: 5_560 }
				],
				preClampBounds: { left: 2_656, top: 4_320, right: 6_528, bottom: 6_528 },
				clampSides: ['right', 'bottom'],
				bounds: { left: 2_656, top: 4_320, right: 6_400, bottom: 6_400 },
				dimensions: { width: 3_744, height: 2_080 },
				drawOrder: 210,
				sourceRegionIds: ['tidewatch-coast'],
				alphaPolicy: { base: 'opaque', foreground: 'sparse-eligible-mask' },
				budgets: {
					baseReviewBytes: 25_518_146,
					baseHardBytes: 38_277_219,
					foregroundReviewBytes: 9_569_305,
					foregroundHardBytes: 19_138_610
				}
			},
			{
				id: 'mistfen',
				reviewBounds: { left: 224, top: 416, right: 2_560, bottom: 3_104 },
				attachments: [],
				preClampBounds: { left: 96, top: 288, right: 2_688, bottom: 3_232 },
				clampSides: [],
				bounds: { left: 96, top: 288, right: 2_688, bottom: 3_232 },
				dimensions: { width: 2_592, height: 2_944 },
				drawOrder: 220,
				sourceRegionIds: ['mistfen'],
				alphaPolicy: { base: 'opaque', foreground: 'sparse-eligible-mask' },
				budgets: {
					baseReviewBytes: 25_004_763,
					baseHardBytes: 37_507_145,
					foregroundReviewBytes: 9_376_787,
					foregroundHardBytes: 18_753_573
				}
			},
			{
				id: 'silverpine',
				reviewBounds: { left: 2_176, top: 256, right: 3_808, bottom: 3_008 },
				attachments: [],
				preClampBounds: { left: 2_048, top: 128, right: 3_936, bottom: 3_136 },
				clampSides: [],
				bounds: { left: 2_048, top: 128, right: 3_936, bottom: 3_136 },
				dimensions: { width: 1_888, height: 3_008 },
				drawOrder: 230,
				sourceRegionIds: ['silverpine'],
				alphaPolicy: { base: 'opaque', foreground: 'sparse-eligible-mask' },
				budgets: {
					baseReviewBytes: 18_609_288,
					baseHardBytes: 27_913_932,
					foregroundReviewBytes: 6_978_483,
					foregroundHardBytes: 13_956_966
				}
			},
			{
				id: 'wildwood',
				reviewBounds: { left: 3_840, top: 256, right: 6_400, bottom: 4_928 },
				attachments: [],
				preClampBounds: { left: 3_712, top: 128, right: 6_528, bottom: 5_056 },
				clampSides: ['right'],
				bounds: { left: 3_712, top: 128, right: 6_400, bottom: 5_056 },
				dimensions: { width: 2_688, height: 4_928 },
				drawOrder: 240,
				sourceRegionIds: ['wildwood'],
				alphaPolicy: { base: 'opaque', foreground: 'sparse-eligible-mask' },
				budgets: {
					baseReviewBytes: 43_406_014,
					baseHardBytes: 65_109_020,
					foregroundReviewBytes: 16_277_255,
					foregroundHardBytes: 32_554_510
				}
			}
		]);

		for (const crop of MEADOW_ENTRY_APPROVED_CROPS) {
			expect(crop.baseFilename, crop.id).toBe(`${crop.id}-base.png`);
			expect(crop.textureKeys.base, crop.id).toBe(`meadow-entry-${crop.id}-base`);
			const baseOnly =
				crop.id === 'sundrop-village-underlay' || crop.id === 'outer-boundary-east-forest-lane';
			expect(crop.foregroundFilename, crop.id).toBe(baseOnly ? null : `${crop.id}-foreground.png`);
			expect(crop.textureKeys.foreground, crop.id).toBe(
				baseOnly ? null : `meadow-entry-${crop.id}-foreground`
			);
		}
	});

	it('keeps the Sundrop predecessor underlay exact, base-only, and within its dedicated budget', () => {
		const sundrop = MEADOW_ENTRY_APPROVED_CROPS.find(({ id }) => id === 'sundrop-village-underlay');

		expect(sundrop).toMatchObject({
			derivation: { mode: 'exact-bounds' },
			reviewBounds: { left: 256, top: 4_352, right: 2_048, bottom: 5_888 },
			coverageAttachments: [],
			preClampBounds: { left: 256, top: 4_352, right: 2_048, bottom: 5_888 },
			edgeClamp: null,
			bounds: { left: 256, top: 4_352, right: 2_048, bottom: 5_888 },
			expectedDimensions: { width: 1_792, height: 1_536 },
			foregroundFilename: null,
			textureKeys: { foreground: null },
			drawOrder: 0,
			alphaPolicy: { base: 'opaque', foreground: null },
			sizeBudgets: {
				baseReviewBytes: 4 * MIB,
				baseHardBytes: 8 * MIB,
				foregroundReviewBytes: null,
				foregroundHardBytes: null
			}
		});
	});

	it('records every world-edge clamp explicitly and approves only the post-clamp candidate', () => {
		const clamped = MEADOW_ENTRY_APPROVED_CROPS.filter(({ edgeClamp }) => edgeClamp !== null).map(
			({ id, preClampBounds, edgeClamp, bounds }) => ({
				id,
				preClampBounds,
				sides: edgeClamp?.sides,
				bounds
			})
		);

		expect(clamped).toEqual([
			{
				id: 'tidewatch-coast',
				preClampBounds: { left: 2_656, top: 4_320, right: 6_528, bottom: 6_528 },
				sides: ['right', 'bottom'],
				bounds: { left: 2_656, top: 4_320, right: 6_400, bottom: 6_400 }
			},
			{
				id: 'wildwood',
				preClampBounds: { left: 3_712, top: 128, right: 6_528, bottom: 5_056 },
				sides: ['right'],
				bounds: { left: 3_712, top: 128, right: 6_400, bottom: 5_056 }
			}
		]);
	});

	it('freezes the exact reviewed overlap, route-mouth, plane, owner, and corner table', () => {
		expect(
			MEADOW_ENTRY_APPROVED_OVERLAPS.map((overlap) => ({
				id: overlap.id,
				firstCropId: overlap.firstCropId,
				secondCropId: overlap.secondCropId,
				bounds: overlap.bounds,
				routeMouth: overlap.routeMouth,
				minimumSharedPixels: overlap.minimumSharedPixels,
				planePolicy: overlap.planePolicy,
				ownerCropId: overlap.ownerCropId,
				cornerGroupId: overlap.cornerGroupId ?? null
			}))
		).toEqual([
			{
				id: 'overlap-sundrop-village-underlay--village-crossroads-connector',
				firstCropId: 'sundrop-village-underlay',
				secondCropId: 'village-crossroads-connector',
				bounds: { left: 1_408, top: 4_352, right: 2_048, bottom: 5_088 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 1_408, top: 4_352, right: 2_048, bottom: 5_088 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-only',
				ownerCropId: 'village-crossroads-connector',
				cornerGroupId: null
			},
			{
				id: 'overlap-outer-boundary-east-forest-lane--tidewatch-coast',
				firstCropId: 'outer-boundary-east-forest-lane',
				secondCropId: 'tidewatch-coast',
				bounds: { left: 4_832, top: 4_320, right: 6_272, bottom: 5_504 },
				routeMouth: {
					sharedAxis: 'x',
					bounds: { left: 4_832, top: 4_320, right: 6_272, bottom: 5_504 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-only',
				ownerCropId: 'tidewatch-coast',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-outer-boundary-east-forest-lane--wildwood',
				firstCropId: 'outer-boundary-east-forest-lane',
				secondCropId: 'wildwood',
				bounds: { left: 4_832, top: 896, right: 6_272, bottom: 5_056 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 4_832, top: 896, right: 6_272, bottom: 5_056 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-only',
				ownerCropId: 'wildwood',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-village-crossroads-connector--crossroads-coast-connector',
				firstCropId: 'village-crossroads-connector',
				secondCropId: 'crossroads-coast-connector',
				bounds: { left: 3_296, top: 4_416, right: 3_328, bottom: 5_088 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 3_296, top: 4_416, right: 3_328, bottom: 5_088 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'crossroads-coast-connector',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-village-crossroads-connector--crossroads',
				firstCropId: 'village-crossroads-connector',
				secondCropId: 'crossroads',
				bounds: { left: 2_784, top: 3_712, right: 3_328, bottom: 4_704 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 2_784, top: 3_712, right: 3_328, bottom: 4_704 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'crossroads',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-village-crossroads-connector--tidewatch-coast',
				firstCropId: 'village-crossroads-connector',
				secondCropId: 'tidewatch-coast',
				bounds: { left: 2_656, top: 4_320, right: 3_328, bottom: 5_088 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 2_656, top: 4_320, right: 3_328, bottom: 5_088 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'tidewatch-coast',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads-coast-connector--crossroads-wildwood-connector',
				firstCropId: 'crossroads-coast-connector',
				secondCropId: 'crossroads-wildwood-connector',
				bounds: { left: 3_840, top: 4_416, right: 4_480, bottom: 5_056 },
				routeMouth: {
					sharedAxis: 'x',
					bounds: { left: 3_840, top: 4_416, right: 4_480, bottom: 5_056 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'crossroads-wildwood-connector',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads-coast-connector--crossroads',
				firstCropId: 'crossroads-coast-connector',
				secondCropId: 'crossroads',
				bounds: { left: 3_296, top: 4_416, right: 4_384, bottom: 4_704 },
				routeMouth: {
					sharedAxis: 'x',
					bounds: { left: 3_296, top: 4_416, right: 4_384, bottom: 4_704 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'crossroads',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads-coast-connector--tidewatch-coast',
				firstCropId: 'crossroads-coast-connector',
				secondCropId: 'tidewatch-coast',
				bounds: { left: 3_296, top: 4_416, right: 4_480, bottom: 5_696 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 3_296, top: 4_416, right: 4_480, bottom: 5_696 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'tidewatch-coast',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads-coast-connector--wildwood',
				firstCropId: 'crossroads-coast-connector',
				secondCropId: 'wildwood',
				bounds: { left: 3_712, top: 4_416, right: 4_480, bottom: 5_056 },
				routeMouth: {
					sharedAxis: 'x',
					bounds: { left: 3_712, top: 4_416, right: 4_480, bottom: 5_056 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'wildwood',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads-mistfen-connector--crossroads-silverpine-connector',
				firstCropId: 'crossroads-mistfen-connector',
				secondCropId: 'crossroads-silverpine-connector',
				bounds: { left: 2_912, top: 2_752, right: 3_264, bottom: 3_232 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 2_912, top: 2_752, right: 3_264, bottom: 3_232 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'crossroads-silverpine-connector',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads-mistfen-connector--crossroads',
				firstCropId: 'crossroads-mistfen-connector',
				secondCropId: 'crossroads',
				bounds: { left: 2_784, top: 2_496, right: 3_264, bottom: 3_712 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 2_784, top: 2_496, right: 3_264, bottom: 3_712 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'crossroads',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads-mistfen-connector--mistfen',
				firstCropId: 'crossroads-mistfen-connector',
				secondCropId: 'mistfen',
				bounds: { left: 2_176, top: 2_432, right: 2_688, bottom: 3_232 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 2_176, top: 2_432, right: 2_688, bottom: 3_232 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'mistfen',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads-mistfen-connector--silverpine',
				firstCropId: 'crossroads-mistfen-connector',
				secondCropId: 'silverpine',
				bounds: { left: 2_176, top: 2_432, right: 3_264, bottom: 3_136 },
				routeMouth: {
					sharedAxis: 'x',
					bounds: { left: 2_176, top: 2_432, right: 3_264, bottom: 3_136 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'silverpine',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads-silverpine-connector--crossroads',
				firstCropId: 'crossroads-silverpine-connector',
				secondCropId: 'crossroads',
				bounds: { left: 2_912, top: 2_752, right: 3_712, bottom: 3_232 },
				routeMouth: {
					sharedAxis: 'x',
					bounds: { left: 2_912, top: 2_752, right: 3_712, bottom: 3_232 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'crossroads',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads-silverpine-connector--silverpine',
				firstCropId: 'crossroads-silverpine-connector',
				secondCropId: 'silverpine',
				bounds: { left: 2_912, top: 2_752, right: 3_712, bottom: 3_136 },
				routeMouth: {
					sharedAxis: 'x',
					bounds: { left: 2_912, top: 2_752, right: 3_712, bottom: 3_136 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'silverpine',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads-wildwood-connector--crossroads',
				firstCropId: 'crossroads-wildwood-connector',
				secondCropId: 'crossroads',
				bounds: { left: 3_840, top: 3_584, right: 4_384, bottom: 4_704 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 3_840, top: 3_584, right: 4_384, bottom: 4_704 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'crossroads',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads-wildwood-connector--tidewatch-coast',
				firstCropId: 'crossroads-wildwood-connector',
				secondCropId: 'tidewatch-coast',
				bounds: { left: 3_840, top: 4_320, right: 4_480, bottom: 5_056 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 3_840, top: 4_320, right: 4_480, bottom: 5_056 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'tidewatch-coast',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads-wildwood-connector--wildwood',
				firstCropId: 'crossroads-wildwood-connector',
				secondCropId: 'wildwood',
				bounds: { left: 3_840, top: 3_584, right: 4_480, bottom: 5_056 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 3_840, top: 3_584, right: 4_480, bottom: 5_056 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'wildwood',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads--tidewatch-coast',
				firstCropId: 'crossroads',
				secondCropId: 'tidewatch-coast',
				bounds: { left: 2_784, top: 4_320, right: 4_384, bottom: 4_704 },
				routeMouth: {
					sharedAxis: 'x',
					bounds: { left: 2_784, top: 4_320, right: 4_384, bottom: 4_704 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'tidewatch-coast',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads--silverpine',
				firstCropId: 'crossroads',
				secondCropId: 'silverpine',
				bounds: { left: 2_784, top: 2_496, right: 3_936, bottom: 3_136 },
				routeMouth: {
					sharedAxis: 'x',
					bounds: { left: 2_784, top: 2_496, right: 3_936, bottom: 3_136 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'silverpine',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-crossroads--wildwood',
				firstCropId: 'crossroads',
				secondCropId: 'wildwood',
				bounds: { left: 3_712, top: 2_496, right: 4_384, bottom: 4_704 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 3_712, top: 2_496, right: 4_384, bottom: 4_704 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'wildwood',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-tidewatch-coast--wildwood',
				firstCropId: 'tidewatch-coast',
				secondCropId: 'wildwood',
				bounds: { left: 3_712, top: 4_320, right: 6_400, bottom: 5_056 },
				routeMouth: {
					sharedAxis: 'x',
					bounds: { left: 3_712, top: 4_320, right: 6_400, bottom: 5_056 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'wildwood',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-mistfen--silverpine',
				firstCropId: 'mistfen',
				secondCropId: 'silverpine',
				bounds: { left: 2_048, top: 288, right: 2_688, bottom: 3_136 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 2_048, top: 288, right: 2_688, bottom: 3_136 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'silverpine',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			},
			{
				id: 'overlap-silverpine--wildwood',
				firstCropId: 'silverpine',
				secondCropId: 'wildwood',
				bounds: { left: 3_712, top: 128, right: 3_936, bottom: 3_136 },
				routeMouth: {
					sharedAxis: 'y',
					bounds: { left: 3_712, top: 128, right: 3_936, bottom: 3_136 }
				},
				minimumSharedPixels: 128,
				planePolicy: 'base-and-foreground',
				ownerCropId: 'wildwood',
				cornerGroupId: 'corner-meadow-entry-handoff-network'
			}
		]);
	});

	it('freezes every exact crop intersection and a route mouth of at least 128px', () => {
		const crops = new Map(MEADOW_ENTRY_APPROVED_CROPS.map((crop) => [crop.id, crop]));
		expect(MEADOW_ENTRY_APPROVED_OVERLAPS).toHaveLength(25);

		for (const overlap of MEADOW_ENTRY_APPROVED_OVERLAPS) {
			const first = crops.get(overlap.firstCropId);
			const second = crops.get(overlap.secondCropId);
			expect(first, overlap.id).toBeDefined();
			expect(second, overlap.id).toBeDefined();
			expect(
				first && second ? intersectBounds(first.bounds, second.bounds) : null,
				overlap.id
			).toEqual(overlap.bounds);
			expect(containsBounds(overlap.bounds, overlap.routeMouth.bounds), overlap.id).toBe(true);
			const sharedPixels =
				overlap.routeMouth.sharedAxis === 'x'
					? overlap.routeMouth.bounds.right - overlap.routeMouth.bounds.left
					: overlap.routeMouth.bounds.bottom - overlap.routeMouth.bounds.top;
			expect(overlap.minimumSharedPixels, overlap.id).toBe(MEADOW_ENTRY_MIN_HANDOFF_PX);
			expect(sharedPixels, overlap.id).toBeGreaterThanOrEqual(MEADOW_ENTRY_MIN_HANDOFF_PX);
		}
	});

	it('assigns every non-empty three-crop intersection to one explicit corner group', () => {
		const grouped = new Set(
			MEADOW_ENTRY_APPROVED_OVERLAPS.flatMap(({ cornerGroupId }) =>
				cornerGroupId === undefined ? [] : [cornerGroupId]
			)
		);
		expect(grouped).toEqual(new Set(['corner-meadow-entry-handoff-network']));
		for (let first = 0; first < MEADOW_ENTRY_APPROVED_CROPS.length - 2; first += 1) {
			for (let second = first + 1; second < MEADOW_ENTRY_APPROVED_CROPS.length - 1; second += 1) {
				for (let third = second + 1; third < MEADOW_ENTRY_APPROVED_CROPS.length; third += 1) {
					const a = MEADOW_ENTRY_APPROVED_CROPS[first]!;
					const b = MEADOW_ENTRY_APPROVED_CROPS[second]!;
					const c = MEADOW_ENTRY_APPROVED_CROPS[third]!;
					const ab = intersectBounds(a.bounds, b.bounds);
					const triple = ab === null ? null : intersectBounds(ab, c.bounds);
					if (triple === null) continue;
					const pairKeys = new Set([
						[a.id, b.id].sort().join('|'),
						[a.id, c.id].sort().join('|'),
						[b.id, c.id].sort().join('|')
					]);
					const cornerGroups = new Set(
						MEADOW_ENTRY_APPROVED_OVERLAPS.filter((overlap) =>
							pairKeys.has([overlap.firstCropId, overlap.secondCropId].sort().join('|'))
						).map(({ cornerGroupId }) => cornerGroupId)
					);
					expect(cornerGroups.size, `${a.id}/${b.id}/${c.id}`).toBe(1);
					expect([...cornerGroups][0], `${a.id}/${b.id}/${c.id}`).toMatch(/^corner-/);
				}
			}
		}
	});

	it('contains every baked source in a named runtime base crop', () => {
		const sourceByKey = new Map(
			collectMeadowEntrySourceCatalog().map((record) => [meadowEntrySourceKey(record.ref), record])
		);
		for (const ownership of MEADOW_ENTRY_BAKE_OWNERSHIP.filter(isBaked)) {
			const sourceKey = meadowEntrySourceKey(ownership.ref);
			const source = sourceByKey.get(sourceKey);
			expect(source?.bounds, sourceKey).not.toBeNull();
			if (source?.bounds === null || source?.bounds === undefined) continue;
			const rasterBounds = {
				left: Math.floor(source.bounds.left),
				top: Math.floor(source.bounds.top),
				right: Math.ceil(source.bounds.right),
				bottom: Math.ceil(source.bounds.bottom)
			};
			expect(
				MEADOW_ENTRY_APPROVED_CROPS.some((crop) => containsBounds(crop.bounds, rasterBounds)),
				sourceKey
			).toBe(true);
		}
	});

	it('partitions the entire world into baked or reasoned fallback coverage with zero unexplained area', () => {
		const baked = MEADOW_ENTRY_RUNTIME_COVERAGE.filter(
			(coverage): coverage is BakedCoverage => coverage.mode === 'baked'
		);
		const fallback = MEADOW_ENTRY_RUNTIME_COVERAGE.filter(
			(coverage): coverage is FallbackCoverage => coverage.mode === 'fallback-tile'
		);

		expect(MEADOW_ENTRY_RUNTIME_COVERAGE).toHaveLength(179);
		expect(baked).toHaveLength(152);
		expect(fallback).toHaveLength(27);
		for (const coverage of fallback) {
			expect(coverage.reason.trim(), JSON.stringify(coverage.bounds)).not.toBe('');
		}
		expect(unionArea(MEADOW_ENTRY_RUNTIME_COVERAGE.map(({ bounds }) => bounds))).toBe(
			boundsArea(MEADOW_ENTRY_WORLD_BOUNDS)
		);
		expect(
			MEADOW_ENTRY_RUNTIME_COVERAGE.reduce(
				(area, coverage) => area + boundsArea(coverage.bounds),
				0
			)
		).toBe(boundsArea(MEADOW_ENTRY_WORLD_BOUNDS));
		expect(baked.every(({ cropIds }) => cropIds.length > 0)).toBe(true);
		expect(fallback).toContainEqual({
			mode: 'fallback-tile',
			bounds: { left: 64, top: 6_286, right: 164, bottom: 6_336 },
			reason:
				'Southwest ocean remains fallback tile: the collision-only ocean blocker relies on its paired sea ground patch, and the existing sea tile covers this reviewed margin outside regional crops.'
		});
	});

	it('closes aggregate budgets arithmetically against the frozen crop table', () => {
		const sums = MEADOW_ENTRY_APPROVED_CROPS.reduce(
			(totals, crop) => ({
				area: totals.area + boundsArea(crop.bounds),
				baseReview: totals.baseReview + crop.sizeBudgets.baseReviewBytes,
				baseHard: totals.baseHard + crop.sizeBudgets.baseHardBytes,
				foregroundReview: totals.foregroundReview + (crop.sizeBudgets.foregroundReviewBytes ?? 0),
				foregroundHard: totals.foregroundHard + (crop.sizeBudgets.foregroundHardBytes ?? 0)
			}),
			{ area: 0, baseReview: 0, baseHard: 0, foregroundReview: 0, foregroundHard: 0 }
		);

		expect(MEADOW_ENTRY_CROP_BUDGET_SUMMARY).toEqual({
			exportAreaRatio: 1.3218,
			overlapArea: 18_795_520,
			aggregateBaseReviewBytes: 176_006_422,
			aggregateBaseHardBytes: 266_316_498,
			aggregateForegroundReviewBytes: 55_044_791,
			aggregateForegroundHardBytes: 110_089_579
		});
		expect(MEADOW_ENTRY_CROP_BUDGET_SUMMARY.exportAreaRatio).toBe(
			sums.area / boundsArea(MEADOW_ENTRY_WORLD_BOUNDS)
		);
		expect(MEADOW_ENTRY_CROP_BUDGET_SUMMARY.overlapArea).toBe(
			sums.area - unionArea(MEADOW_ENTRY_APPROVED_CROPS.map(({ bounds }) => bounds))
		);
		expect(MEADOW_ENTRY_CROP_BUDGET_SUMMARY.aggregateBaseReviewBytes).toBe(sums.baseReview);
		expect(MEADOW_ENTRY_CROP_BUDGET_SUMMARY.aggregateBaseHardBytes).toBe(sums.baseHard);
		expect(MEADOW_ENTRY_CROP_BUDGET_SUMMARY.aggregateForegroundReviewBytes).toBe(
			sums.foregroundReview
		);
		expect(MEADOW_ENTRY_CROP_BUDGET_SUMMARY.aggregateForegroundHardBytes).toBe(sums.foregroundHard);
		expect(validateMeadowEntryCropContract).not.toThrow();
	});
});

describe('validateMeadowEntryCropContract error paths', () => {
	function cloneCrops(): MeadowEntryApprovedCrop[] {
		return MEADOW_ENTRY_APPROVED_CROPS.map((crop) => ({
			...crop,
			derivation: { ...crop.derivation },
			reviewBounds: { ...crop.reviewBounds },
			coverageAttachments: crop.coverageAttachments.map((b) => ({ ...b })),
			preClampBounds: { ...crop.preClampBounds },
			edgeClamp: crop.edgeClamp ? { ...crop.edgeClamp, sides: [...crop.edgeClamp.sides] } : null,
			bounds: { ...crop.bounds },
			expectedDimensions: { ...crop.expectedDimensions },
			textureKeys: { ...crop.textureKeys },
			sourceRegionIds: [...crop.sourceRegionIds],
			neighborIds: [...crop.neighborIds],
			overlapIds: [...crop.overlapIds],
			alphaPolicy: { ...crop.alphaPolicy },
			sizeBudgets: { ...crop.sizeBudgets }
		}));
	}

	it('rejects duplicate approved crop ids', () => {
		const crops = cloneCrops();
		crops[1] = { ...crops[1]!, id: crops[0]!.id, drawOrder: 999 };
		expect(() => validateMeadowEntryCropContract({ crops })).toThrow(/Duplicate approved crop/);
	});

	it('rejects duplicate crop draw orders', () => {
		const crops = cloneCrops();
		crops[1] = { ...crops[1]!, id: 'unique-id', drawOrder: crops[0]!.drawOrder };
		expect(() => validateMeadowEntryCropContract({ crops })).toThrow(/Duplicate crop draw order/);
	});

	it('rejects a crop whose pre-clamp bounds have drifted', () => {
		const crops = cloneCrops();
		crops[0] = {
			...crops[0]!,
			preClampBounds: { ...crops[0]!.preClampBounds, left: crops[0]!.preClampBounds.left + 32 }
		};
		expect(() => validateMeadowEntryCropContract({ crops })).toThrow(
			/pre-clamp candidate has drifted/
		);
	});

	it('rejects a crop whose approved bounds differ from its post-clamp candidate', () => {
		const crops = cloneCrops();
		crops[0] = {
			...crops[0]!,
			bounds: { ...crops[0]!.bounds, right: crops[0]!.bounds.right - 32 }
		};
		expect(() => validateMeadowEntryCropContract({ crops })).toThrow(
			/approved bounds differ from its post-clamp candidate/
		);
	});

	it('rejects a crop that declares an unused edge clamp', () => {
		const crops = cloneCrops();
		const sundropIdx = crops.findIndex((c) => c.id === 'sundrop-village-underlay');
		expect(sundropIdx).toBeGreaterThanOrEqual(0);
		crops[sundropIdx] = {
			...crops[sundropIdx]!,
			edgeClamp: { sides: ['right'], reason: 'unused' }
		};
		expect(() => validateMeadowEntryCropContract({ crops })).toThrow(
			/declares an unused edge clamp/
		);
	});

	it('rejects a crop that silently clips a world edge', () => {
		const crops = cloneCrops();
		const idx = crops.findIndex((c) => c.id === 'tidewatch-coast');
		crops[idx] = { ...crops[idx]!, edgeClamp: null };
		expect(() => validateMeadowEntryCropContract({ crops })).toThrow(/silently clips a world edge/);
	});

	it('rejects a crop with an invalid declared edge clamp', () => {
		const crops = cloneCrops();
		const idx = crops.findIndex((c) => c.id === 'tidewatch-coast');
		crops[idx] = {
			...crops[idx]!,
			edgeClamp: { sides: ['left'], reason: 'wrong side' }
		};
		expect(() => validateMeadowEntryCropContract({ crops })).toThrow(/invalid declared edge clamp/);
	});

	it('rejects a crop that is not 32px aligned', () => {
		const crops = cloneCrops();
		const idx = crops.findIndex((c) => c.id === 'sundrop-village-underlay');
		crops[idx] = {
			...crops[idx]!,
			bounds: { left: 257, top: 4_352, right: 2_048, bottom: 5_888 },
			preClampBounds: { left: 257, top: 4_352, right: 2_048, bottom: 5_888 },
			reviewBounds: { left: 257, top: 4_352, right: 2_048, bottom: 5_888 },
			expectedDimensions: { width: 1_791, height: 1_536 }
		};
		expect(() => validateMeadowEntryCropContract({ crops })).toThrow(/not 32px aligned/);
	});

	it('rejects a crop whose dimensions do not match bounds', () => {
		const crops = cloneCrops();
		crops[0] = {
			...crops[0]!,
			expectedDimensions: { width: 1_000, height: 1_536 }
		};
		expect(() => validateMeadowEntryCropContract({ crops })).toThrow(
			/dimensions do not match bounds/
		);
	});

	it('rejects a crop whose base identity has drifted', () => {
		const crops = cloneCrops();
		crops[0] = {
			...crops[0]!,
			baseFilename: 'wrong-base.png'
		};
		expect(() => validateMeadowEntryCropContract({ crops })).toThrow(/base identity has drifted/);
	});

	it('rejects a crop whose foreground identity has drifted', () => {
		const crops = cloneCrops();
		const idx = crops.findIndex((c) => c.id === 'crossroads');
		crops[idx] = {
			...crops[idx]!,
			foregroundFilename: null,
			textureKeys: { ...crops[idx]!.textureKeys, foreground: null },
			sizeBudgets: {
				...crops[idx]!.sizeBudgets,
				foregroundReviewBytes: null,
				foregroundHardBytes: null
			}
		};
		expect(() => validateMeadowEntryCropContract({ crops })).toThrow(
			/foreground identity has drifted/
		);
	});

	it('rejects a crop with invalid size budgets', () => {
		const crops = cloneCrops();
		crops[0] = {
			...crops[0]!,
			sizeBudgets: { ...crops[0]!.sizeBudgets, baseReviewBytes: 0 }
		};
		expect(() => validateMeadowEntryCropContract({ crops })).toThrow(/invalid size budgets/);
	});

	it('rejects an overlap that names an unknown crop', () => {
		const overlaps: MeadowEntryOverlap[] = [
			...MEADOW_ENTRY_APPROVED_OVERLAPS,
			{
				id: 'overlap-bogus',
				firstCropId: 'nonexistent',
				secondCropId: 'sundrop-village-underlay',
				bounds: { left: 0, top: 0, right: 128, bottom: 128 },
				routeMouth: { sharedAxis: 'x', bounds: { left: 0, top: 0, right: 128, bottom: 128 } },
				minimumSharedPixels: 128,
				planePolicy: 'base-only',
				ownerCropId: 'sundrop-village-underlay'
			}
		];
		expect(() => validateMeadowEntryCropContract({ overlaps })).toThrow(/names an unknown crop/);
	});

	it('rejects a duplicate crop overlap', () => {
		const overlaps: MeadowEntryOverlap[] = [
			...MEADOW_ENTRY_APPROVED_OVERLAPS,
			{ ...MEADOW_ENTRY_APPROVED_OVERLAPS[0]! }
		];
		expect(() => validateMeadowEntryCropContract({ overlaps })).toThrow(/Duplicate crop overlap/);
	});

	it('rejects an overlap that does not equal its exact crop intersection', () => {
		const overlaps = MEADOW_ENTRY_APPROVED_OVERLAPS.map((o, i) =>
			i === 0
				? {
						...o,
						bounds: {
							...o.bounds,
							right: o.bounds.right + 32
						}
					}
				: o
		);
		expect(() => validateMeadowEntryCropContract({ overlaps })).toThrow(
			/does not equal its exact crop intersection/
		);
	});

	it('rejects an overlap whose route mouth leaves its intersection', () => {
		const overlaps = MEADOW_ENTRY_APPROVED_OVERLAPS.map((o, i) =>
			i === 0
				? {
						...o,
						routeMouth: {
							...o.routeMouth,
							bounds: {
								left: o.bounds.left - 32,
								top: o.bounds.top,
								right: o.bounds.right,
								bottom: o.bounds.bottom
							}
						}
					}
				: o
		);
		expect(() => validateMeadowEntryCropContract({ overlaps })).toThrow(
			/route mouth leaves its intersection/
		);
	});

	it('rejects an overlap with an undersized route mouth', () => {
		const overlaps = MEADOW_ENTRY_APPROVED_OVERLAPS.map((o, i) =>
			i === 0
				? {
						...o,
						minimumSharedPixels: 64 as const,
						routeMouth: {
							...o.routeMouth,
							bounds: {
								left: o.bounds.left,
								top: o.bounds.top,
								right: o.bounds.left + 64,
								bottom: o.bounds.top + 64
							}
						}
					}
				: o
		) as MeadowEntryOverlap[];
		expect(() => validateMeadowEntryCropContract({ overlaps })).toThrow(/undersized route mouth/);
	});

	it('rejects an overlap whose owner crop is not one of the crop pair', () => {
		const overlap = MEADOW_ENTRY_APPROVED_OVERLAPS[0]!;
		const otherCrop = MEADOW_ENTRY_APPROVED_CROPS.find(
			({ id }) => id !== overlap.firstCropId && id !== overlap.secondCropId
		);
		expect(otherCrop).toBeDefined();
		if (!otherCrop) return;
		const overlaps = MEADOW_ENTRY_APPROVED_OVERLAPS.map((o, i) =>
			i === 0 ? { ...o, ownerCropId: otherCrop.id } : o
		);
		expect(() => validateMeadowEntryCropContract({ overlaps })).toThrow(/unknown owner crop/);
	});

	it('rejects an overlap whose owner crop is not the higher draw order crop', () => {
		const overlaps = MEADOW_ENTRY_APPROVED_OVERLAPS.map((o, i) =>
			i === 0
				? {
						...o,
						ownerCropId: o.firstCropId === o.ownerCropId ? o.secondCropId : o.firstCropId
					}
				: o
		);
		expect(() => validateMeadowEntryCropContract({ overlaps })).toThrow(/higher draw order/);
	});

	it('rejects an overlap that declares foreground planes for a crop without one', () => {
		const index = MEADOW_ENTRY_APPROVED_OVERLAPS.findIndex((o) => o.planePolicy === 'base-only');
		expect(index).toBeGreaterThanOrEqual(0);
		const overlaps = MEADOW_ENTRY_APPROVED_OVERLAPS.map((o, i) =>
			i === index ? { ...o, planePolicy: 'base-and-foreground' as const } : o
		);
		expect(() => validateMeadowEntryCropContract({ overlaps })).toThrow(
			/foreground planes for a crop without one/
		);
	});

	it('rejects an overlap that omits foreground planes for a fully foreground crop pair', () => {
		const index = MEADOW_ENTRY_APPROVED_OVERLAPS.findIndex(
			(o) => o.planePolicy === 'base-and-foreground'
		);
		expect(index).toBeGreaterThanOrEqual(0);
		const overlaps = MEADOW_ENTRY_APPROVED_OVERLAPS.map((o, i) =>
			i === index ? { ...o, planePolicy: 'base-only' as const } : o
		);
		expect(() => validateMeadowEntryCropContract({ overlaps })).toThrow(
			/must declare foreground planes/
		);
	});

	it('rejects a crop pair whose overlap accounting has drifted', () => {
		const overlaps = MEADOW_ENTRY_APPROVED_OVERLAPS.slice(0, -1);
		expect(() => validateMeadowEntryCropContract({ overlaps })).toThrow(
			/overlap accounting has drifted/
		);
	});

	it('rejects a triple crop intersection that lacks one corner group', () => {
		// Remove corner group from all overlaps that have one, so any triple intersection will fail.
		const overlaps = MEADOW_ENTRY_APPROVED_OVERLAPS.map((o) =>
			o.cornerGroupId !== undefined ? { ...o, cornerGroupId: undefined } : o
		);
		expect(() => validateMeadowEntryCropContract({ overlaps })).toThrow(/lacks one corner group/);
	});

	it('rejects baked runtime coverage with incorrect crop ownership', () => {
		// Find the first baked coverage entry and corrupt its crop ownership.
		const idx = MEADOW_ENTRY_RUNTIME_COVERAGE.findIndex((c) => c.mode === 'baked');
		expect(idx).toBeGreaterThanOrEqual(0);
		const runtimeCoverage = MEADOW_ENTRY_RUNTIME_COVERAGE.map((c, i) =>
			i === idx && c.mode === 'baked' ? { ...c, cropIds: [] } : c
		);
		expect(() => validateMeadowEntryCropContract({ runtimeCoverage })).toThrow(
			/incorrect crop ownership/
		);
	});

	it('rejects fallback runtime coverage that overlaps a crop or lacks a reason', () => {
		const fallbackIdx = MEADOW_ENTRY_RUNTIME_COVERAGE.findIndex((c) => c.mode === 'fallback-tile');
		expect(fallbackIdx).toBeGreaterThanOrEqual(0);
		const runtimeCoverage = MEADOW_ENTRY_RUNTIME_COVERAGE.map((c, i) =>
			i === fallbackIdx && c.mode === 'fallback-tile' ? { ...c, reason: '   ' } : c
		);
		expect(() => validateMeadowEntryCropContract({ runtimeCoverage })).toThrow(
			/overlaps a crop or lacks a reason/
		);
	});

	it('rejects runtime coverage with unexplained or overlapping area', () => {
		const runtimeCoverage = MEADOW_ENTRY_RUNTIME_COVERAGE.slice(0, -1);
		expect(() => validateMeadowEntryCropContract({ runtimeCoverage })).toThrow(
			/unexplained or overlapping area/
		);
	});

	it('rejects aggregate crop budgets that do not equal per-crop sums', () => {
		const budgetSummary: MeadowEntryCropBudgetSummary = {
			...MEADOW_ENTRY_CROP_BUDGET_SUMMARY,
			aggregateBaseReviewBytes: MEADOW_ENTRY_CROP_BUDGET_SUMMARY.aggregateBaseReviewBytes + 1
		};
		expect(() => validateMeadowEntryCropContract({ budgetSummary })).toThrow(
			/budgets do not equal per-crop sums/
		);
	});

	it('rejects a mismatch in a non-default budget summary field', () => {
		const budgetSummary: MeadowEntryCropBudgetSummary = {
			...MEADOW_ENTRY_CROP_BUDGET_SUMMARY,
			overlapArea: MEADOW_ENTRY_CROP_BUDGET_SUMMARY.overlapArea + 1
		};
		expect(() => validateMeadowEntryCropContract({ budgetSummary })).toThrow(
			/budgets do not equal per-crop sums/
		);
	});

	it('rejects a budget summary with an unexpected extra key', () => {
		const budgetSummary = {
			...MEADOW_ENTRY_CROP_BUDGET_SUMMARY,
			extraField: 1
		} as unknown as MeadowEntryCropBudgetSummary;
		expect(() => validateMeadowEntryCropContract({ budgetSummary })).toThrow(
			/budget summary shape does not match expected schema/
		);
	});
});
