import {
	boundsArea,
	clampBoundsToWorld,
	containsBounds,
	intersectBounds,
	rasterizeCoverageBounds,
	unionArea,
	MEADOW_ENTRY_MIN_HANDOFF_PX,
	MEADOW_ENTRY_TILE_SIZE_PX,
	MEADOW_ENTRY_WORLD_BOUNDS
} from './meadow-entry-authoring-geometry';
import type { PixelBounds, WorldEdge } from './meadow-entry-authoring-types';
import type { MeadowEntryAuthoringRegionId } from './meadow-entry-authoring-layout';
import {
	MEADOW_ENTRY_BAKE_OWNERSHIP,
	type MeadowEntryBakeOwnershipEntry
} from './meadow-entry-bake-ownership';
import {
	collectMeadowEntrySourceCatalog,
	meadowEntrySourceKey,
	type MeadowEntrySourceRecord
} from './meadow-entry-source-catalog';

export type MeadowEntryCropDerivation =
	| { mode: 'expanded-review-bounds'; expansionPx: 128 }
	| { mode: 'exact-bounds' };

export interface MeadowEntryApprovedCrop {
	id: string;
	derivation: MeadowEntryCropDerivation;
	reviewBounds: PixelBounds;
	coverageAttachments: readonly PixelBounds[];
	preClampBounds: PixelBounds;
	edgeClamp: { sides: readonly WorldEdge[]; reason: string } | null;
	bounds: PixelBounds;
	expectedDimensions: { width: number; height: number };
	baseFilename: string;
	foregroundFilename: string | null;
	textureKeys: { base: string; foreground: string | null };
	drawOrder: number;
	sourceRegionIds: readonly MeadowEntryAuthoringRegionId[];
	neighborIds: readonly string[];
	overlapIds: readonly string[];
	alphaPolicy: { base: 'opaque'; foreground: 'sparse-eligible-mask' | null };
	sizeBudgets: {
		baseReviewBytes: number;
		baseHardBytes: number;
		foregroundReviewBytes: number | null;
		foregroundHardBytes: number | null;
	};
}

export interface MeadowEntryOverlap {
	id: string;
	firstCropId: string;
	secondCropId: string;
	bounds: PixelBounds;
	routeMouth: { sharedAxis: 'x' | 'y'; bounds: PixelBounds };
	minimumSharedPixels: 128;
	planePolicy: 'base-only' | 'base-and-foreground';
	ownerCropId: string;
	cornerGroupId?: string;
}

export type MeadowEntryRuntimeCoverage =
	| { mode: 'baked'; bounds: PixelBounds; cropIds: readonly string[] }
	| { mode: 'fallback-tile'; bounds: PixelBounds; reason: string };

export interface MeadowEntryCropBudgetSummary {
	exportAreaRatio: number;
	overlapArea: number;
	aggregateBaseReviewBytes: number;
	aggregateBaseHardBytes: number;
	aggregateForegroundReviewBytes: number;
	aggregateForegroundHardBytes: number;
}

interface ReviewedCropSpec {
	id: string;
	derivation: MeadowEntryCropDerivation;
	reviewBounds: PixelBounds;
	coverageAttachments: readonly PixelBounds[];
	preClampBounds: PixelBounds;
	edgeClamp: { sides: readonly WorldEdge[]; reason: string } | null;
	bounds: PixelBounds;
	drawOrder: number;
	sourceRegionIds: readonly MeadowEntryAuthoringRegionId[];
	foreground: boolean;
	sizeBudgets: MeadowEntryApprovedCrop['sizeBudgets'];
}

const MIB = 1_024 * 1_024;
const MASTER_AREA = boundsArea(MEADOW_ENTRY_WORLD_BOUNDS);
const GENERAL_FALLBACK_REASON =
	'Existing meadow-entry tile rendering remains the deliberate fallback outside approved baked crop coverage.';
const SOUTHWEST_OCEAN_FALLBACK_REASON =
	'Southwest ocean remains fallback tile: the collision-only ocean blocker relies on its paired sea ground patch, and the existing sea tile covers this reviewed margin outside regional crops.';
const CORNER_GROUP_ID = 'corner-meadow-entry-handoff-network';
const DEFAULT_FALLBACK_REQUIREMENTS: readonly MeadowEntryFallbackRequirement[] = Object.freeze([
	Object.freeze({
		bounds: Object.freeze({ left: 64, top: 6_286, right: 164, bottom: 6_336 }),
		reason: SOUTHWEST_OCEAN_FALLBACK_REASON
	})
]);

function freezeBounds(bounds: PixelBounds): PixelBounds {
	return Object.freeze({ ...bounds });
}

function freezeBudgets(
	budgets: MeadowEntryApprovedCrop['sizeBudgets']
): MeadowEntryApprovedCrop['sizeBudgets'] {
	return Object.freeze({ ...budgets });
}

const REVIEWED_CROP_SPEC_VALUES = [
	{
		id: 'sundrop-village-underlay',
		derivation: { mode: 'exact-bounds' },
		reviewBounds: { left: 256, top: 4_352, right: 2_048, bottom: 5_888 },
		coverageAttachments: [],
		preClampBounds: { left: 256, top: 4_352, right: 2_048, bottom: 5_888 },
		edgeClamp: null,
		bounds: { left: 256, top: 4_352, right: 2_048, bottom: 5_888 },
		drawOrder: 0,
		sourceRegionIds: ['sundrop-village'],
		foreground: false,
		sizeBudgets: {
			baseReviewBytes: 4 * MIB,
			baseHardBytes: 8 * MIB,
			foregroundReviewBytes: null,
			foregroundHardBytes: null
		}
	},
	{
		id: 'outer-boundary-east-forest-lane',
		derivation: { mode: 'expanded-review-bounds', expansionPx: 128 },
		reviewBounds: { left: 4_960, top: 1_024, right: 6_144, bottom: 5_376 },
		coverageAttachments: [
			{ left: 6_068, top: 3_200, right: 6_132, bottom: 5_300 },
			{ left: 4_968, top: 3_200, right: 5_032, bottom: 5_300 },
			{ left: 5_565, top: 1_050, right: 5_635, bottom: 5_350 }
		],
		preClampBounds: { left: 4_832, top: 896, right: 6_272, bottom: 5_504 },
		edgeClamp: null,
		bounds: { left: 4_832, top: 896, right: 6_272, bottom: 5_504 },
		drawOrder: 10,
		sourceRegionIds: ['wildwood', 'tidewatch-coast'],
		foreground: false,
		sizeBudgets: {
			baseReviewBytes: 24 * MIB,
			baseHardBytes: 36 * MIB,
			foregroundReviewBytes: null,
			foregroundHardBytes: null
		}
	},
	{
		id: 'village-crossroads-connector',
		derivation: { mode: 'expanded-review-bounds', expansionPx: 128 },
		reviewBounds: { left: 1_536, top: 3_840, right: 3_200, bottom: 4_960 },
		coverageAttachments: [],
		preClampBounds: { left: 1_408, top: 3_712, right: 3_328, bottom: 5_088 },
		edgeClamp: null,
		bounds: { left: 1_408, top: 3_712, right: 3_328, bottom: 5_088 },
		drawOrder: 100,
		sourceRegionIds: ['connector-village-crossroads'],
		foreground: true,
		sizeBudgets: {
			baseReviewBytes: 8_657_044,
			baseHardBytes: 12_985_566,
			foregroundReviewBytes: 3_246_392,
			foregroundHardBytes: 6_492_783
		}
	},
	{
		id: 'crossroads-coast-connector',
		derivation: { mode: 'expanded-review-bounds', expansionPx: 128 },
		reviewBounds: { left: 3_424, top: 4_544, right: 4_352, bottom: 5_568 },
		coverageAttachments: [],
		preClampBounds: { left: 3_296, top: 4_416, right: 4_480, bottom: 5_696 },
		edgeClamp: null,
		bounds: { left: 3_296, top: 4_416, right: 4_480, bottom: 5_696 },
		drawOrder: 110,
		sourceRegionIds: ['connector-crossroads-coast'],
		foreground: true,
		sizeBudgets: {
			baseReviewBytes: 4_966_056,
			baseHardBytes: 7_449_084,
			foregroundReviewBytes: 1_862_271,
			foregroundHardBytes: 3_724_542
		}
	},
	{
		id: 'crossroads-mistfen-connector',
		derivation: { mode: 'expanded-review-bounds', expansionPx: 128 },
		reviewBounds: { left: 2_304, top: 2_560, right: 3_136, bottom: 3_584 },
		coverageAttachments: [],
		preClampBounds: { left: 2_176, top: 2_432, right: 3_264, bottom: 3_712 },
		edgeClamp: null,
		bounds: { left: 2_176, top: 2_432, right: 3_264, bottom: 3_712 },
		drawOrder: 120,
		sourceRegionIds: ['connector-crossroads-mistfen'],
		foreground: true,
		sizeBudgets: {
			baseReviewBytes: 4_563_403,
			baseHardBytes: 6_845_105,
			foregroundReviewBytes: 1_711_277,
			foregroundHardBytes: 3_422_553
		}
	},
	{
		id: 'crossroads-silverpine-connector',
		derivation: { mode: 'expanded-review-bounds', expansionPx: 128 },
		reviewBounds: { left: 3_040, top: 2_880, right: 3_584, bottom: 3_104 },
		coverageAttachments: [],
		preClampBounds: { left: 2_912, top: 2_752, right: 3_712, bottom: 3_232 },
		edgeClamp: null,
		bounds: { left: 2_912, top: 2_752, right: 3_712, bottom: 3_232 },
		drawOrder: 130,
		sourceRegionIds: ['connector-crossroads-silverpine'],
		foreground: true,
		sizeBudgets: {
			baseReviewBytes: 1_258_292,
			baseHardBytes: 2_097_152,
			foregroundReviewBytes: 524_288,
			foregroundHardBytes: 1_048_576
		}
	},
	{
		id: 'crossroads-wildwood-connector',
		derivation: { mode: 'expanded-review-bounds', expansionPx: 128 },
		reviewBounds: { left: 3_968, top: 3_712, right: 4_352, bottom: 4_928 },
		coverageAttachments: [],
		preClampBounds: { left: 3_840, top: 3_584, right: 4_480, bottom: 5_056 },
		edgeClamp: null,
		bounds: { left: 3_840, top: 3_584, right: 4_480, bottom: 5_056 },
		drawOrder: 140,
		sourceRegionIds: ['connector-crossroads-wildwood'],
		foreground: true,
		sizeBudgets: {
			baseReviewBytes: 3_087_008,
			baseHardBytes: 4_630_512,
			foregroundReviewBytes: 1_157_628,
			foregroundHardBytes: 2_315_256
		}
	},
	{
		id: 'crossroads',
		derivation: { mode: 'expanded-review-bounds', expansionPx: 128 },
		reviewBounds: { left: 2_912, top: 2_624, right: 4_256, bottom: 4_576 },
		coverageAttachments: [],
		preClampBounds: { left: 2_784, top: 2_496, right: 4_384, bottom: 4_704 },
		edgeClamp: null,
		bounds: { left: 2_784, top: 2_496, right: 4_384, bottom: 4_704 },
		drawOrder: 200,
		sourceRegionIds: ['crossroads'],
		foreground: true,
		sizeBudgets: {
			baseReviewBytes: 11_576_280,
			baseHardBytes: 17_364_419,
			foregroundReviewBytes: 4_341_105,
			foregroundHardBytes: 8_682_210
		}
	},
	{
		id: 'tidewatch-coast',
		derivation: { mode: 'expanded-review-bounds', expansionPx: 128 },
		reviewBounds: { left: 2_784, top: 4_448, right: 6_400, bottom: 6_400 },
		coverageAttachments: [
			{ left: 2_800, top: 5_312, right: 5_600, bottom: 5_382 },
			{ left: 5_565, top: 4_928, right: 5_635, bottom: 5_350 },
			{ left: 6_068, top: 4_928, right: 6_132, bottom: 5_300 },
			{ left: 4_968, top: 4_928, right: 5_032, bottom: 5_300 },
			{ left: 4_450, top: 5_140, right: 5_550, bottom: 5_260 },
			{ left: 4_450, top: 5_440, right: 5_550, bottom: 5_560 }
		],
		preClampBounds: { left: 2_656, top: 4_320, right: 6_528, bottom: 6_528 },
		edgeClamp: {
			sides: ['right', 'bottom'],
			reason:
				'Tidewatch Coast reaches the east and south world edges; only its reviewed 128px expansion is clamped.'
		},
		bounds: { left: 2_656, top: 4_320, right: 6_400, bottom: 6_400 },
		drawOrder: 210,
		sourceRegionIds: ['tidewatch-coast'],
		foreground: true,
		sizeBudgets: {
			baseReviewBytes: 25_518_146,
			baseHardBytes: 38_277_219,
			foregroundReviewBytes: 9_569_305,
			foregroundHardBytes: 19_138_610
		}
	},
	{
		id: 'mistfen',
		derivation: { mode: 'expanded-review-bounds', expansionPx: 128 },
		reviewBounds: { left: 224, top: 416, right: 2_560, bottom: 3_104 },
		coverageAttachments: [],
		preClampBounds: { left: 96, top: 288, right: 2_688, bottom: 3_232 },
		edgeClamp: null,
		bounds: { left: 96, top: 288, right: 2_688, bottom: 3_232 },
		drawOrder: 220,
		sourceRegionIds: ['mistfen'],
		foreground: true,
		sizeBudgets: {
			baseReviewBytes: 25_004_763,
			baseHardBytes: 37_507_145,
			foregroundReviewBytes: 9_376_787,
			foregroundHardBytes: 18_753_573
		}
	},
	{
		id: 'silverpine',
		derivation: { mode: 'expanded-review-bounds', expansionPx: 128 },
		reviewBounds: { left: 2_176, top: 256, right: 3_808, bottom: 3_008 },
		coverageAttachments: [],
		preClampBounds: { left: 2_048, top: 128, right: 3_936, bottom: 3_136 },
		edgeClamp: null,
		bounds: { left: 2_048, top: 128, right: 3_936, bottom: 3_136 },
		drawOrder: 230,
		sourceRegionIds: ['silverpine'],
		foreground: true,
		sizeBudgets: {
			baseReviewBytes: 18_609_288,
			baseHardBytes: 27_913_932,
			foregroundReviewBytes: 6_978_483,
			foregroundHardBytes: 13_956_966
		}
	},
	{
		id: 'wildwood',
		derivation: { mode: 'expanded-review-bounds', expansionPx: 128 },
		reviewBounds: { left: 3_840, top: 256, right: 6_400, bottom: 4_928 },
		coverageAttachments: [],
		preClampBounds: { left: 3_712, top: 128, right: 6_528, bottom: 5_056 },
		edgeClamp: {
			sides: ['right'],
			reason: 'Wildwood reaches the east world edge; only its reviewed 128px expansion is clamped.'
		},
		bounds: { left: 3_712, top: 128, right: 6_400, bottom: 5_056 },
		drawOrder: 240,
		sourceRegionIds: ['wildwood'],
		foreground: true,
		sizeBudgets: {
			baseReviewBytes: 43_406_014,
			baseHardBytes: 65_109_020,
			foregroundReviewBytes: 16_277_255,
			foregroundHardBytes: 32_554_510
		}
	}
] satisfies readonly ReviewedCropSpec[];

const REVIEWED_CROP_SPECS: readonly ReviewedCropSpec[] = Object.freeze(
	REVIEWED_CROP_SPEC_VALUES.map((spec) =>
		Object.freeze({
			...spec,
			derivation: Object.freeze({ ...spec.derivation }),
			reviewBounds: freezeBounds(spec.reviewBounds),
			coverageAttachments: Object.freeze(spec.coverageAttachments.map(freezeBounds)),
			preClampBounds: freezeBounds(spec.preClampBounds),
			edgeClamp:
				spec.edgeClamp === null
					? null
					: Object.freeze({
							sides: Object.freeze([...spec.edgeClamp.sides]),
							reason: spec.edgeClamp.reason
						}),
			bounds: freezeBounds(spec.bounds),
			sourceRegionIds: Object.freeze([...spec.sourceRegionIds]),
			sizeBudgets: freezeBudgets(spec.sizeBudgets)
		})
	)
);

const OVERLAP_AXIS_BY_PAIR: Readonly<Record<string, 'x' | 'y'>> = Object.freeze({
	'sundrop-village-underlay|village-crossroads-connector': 'y',
	'outer-boundary-east-forest-lane|tidewatch-coast': 'x',
	'outer-boundary-east-forest-lane|wildwood': 'y',
	'village-crossroads-connector|crossroads-coast-connector': 'y',
	'village-crossroads-connector|crossroads': 'y',
	'village-crossroads-connector|tidewatch-coast': 'y',
	'crossroads-coast-connector|crossroads-wildwood-connector': 'x',
	'crossroads-coast-connector|crossroads': 'x',
	'crossroads-coast-connector|tidewatch-coast': 'y',
	'crossroads-coast-connector|wildwood': 'x',
	'crossroads-mistfen-connector|crossroads-silverpine-connector': 'y',
	'crossroads-mistfen-connector|crossroads': 'y',
	'crossroads-mistfen-connector|mistfen': 'y',
	'crossroads-mistfen-connector|silverpine': 'x',
	'crossroads-silverpine-connector|crossroads': 'x',
	'crossroads-silverpine-connector|silverpine': 'x',
	'crossroads-wildwood-connector|crossroads': 'y',
	'crossroads-wildwood-connector|tidewatch-coast': 'y',
	'crossroads-wildwood-connector|wildwood': 'y',
	'crossroads|tidewatch-coast': 'x',
	'crossroads|silverpine': 'x',
	'crossroads|wildwood': 'y',
	'tidewatch-coast|wildwood': 'x',
	'mistfen|silverpine': 'y',
	'silverpine|wildwood': 'y'
});

function pairKey(firstCropId: string, secondCropId: string): string {
	return `${firstCropId}|${secondCropId}`;
}

function buildOverlaps(specs: readonly ReviewedCropSpec[]): readonly MeadowEntryOverlap[] {
	const overlaps: MeadowEntryOverlap[] = [];
	for (let firstIndex = 0; firstIndex < specs.length - 1; firstIndex += 1) {
		const first = specs[firstIndex]!;
		for (let secondIndex = firstIndex + 1; secondIndex < specs.length; secondIndex += 1) {
			const second = specs[secondIndex]!;
			const bounds = intersectBounds(first.bounds, second.bounds);
			if (bounds === null) continue;
			const key = pairKey(first.id, second.id);
			const sharedAxis = OVERLAP_AXIS_BY_PAIR[key];
			if (sharedAxis === undefined) throw new Error(`Unreviewed crop overlap "${key}"`);
			const baseOnly = !first.foreground || !second.foreground;
			const cornerGroupId =
				key === 'sundrop-village-underlay|village-crossroads-connector'
					? undefined
					: CORNER_GROUP_ID;
			overlaps.push(
				Object.freeze({
					id: `overlap-${first.id}--${second.id}`,
					firstCropId: first.id,
					secondCropId: second.id,
					bounds: freezeBounds(bounds),
					routeMouth: Object.freeze({ sharedAxis, bounds: freezeBounds(bounds) }),
					minimumSharedPixels: MEADOW_ENTRY_MIN_HANDOFF_PX,
					planePolicy: baseOnly ? 'base-only' : 'base-and-foreground',
					ownerCropId: first.drawOrder > second.drawOrder ? first.id : second.id,
					...(cornerGroupId === undefined ? {} : { cornerGroupId })
				})
			);
		}
	}
	if (overlaps.length !== Object.keys(OVERLAP_AXIS_BY_PAIR).length) {
		throw new Error(
			`Reviewed overlap count ${Object.keys(OVERLAP_AXIS_BY_PAIR).length} does not match derived ${overlaps.length}`
		);
	}
	return Object.freeze(overlaps);
}

const BUILT_OVERLAPS = buildOverlaps(REVIEWED_CROP_SPECS);

function buildApprovedCrops(
	specs: readonly ReviewedCropSpec[],
	overlaps: readonly MeadowEntryOverlap[]
): readonly MeadowEntryApprovedCrop[] {
	return Object.freeze(
		specs.map((spec) => {
			const cropOverlaps = overlaps.filter(
				({ firstCropId, secondCropId }) => firstCropId === spec.id || secondCropId === spec.id
			);
			const neighborIds = cropOverlaps.map(({ firstCropId, secondCropId }) =>
				firstCropId === spec.id ? secondCropId : firstCropId
			);
			const foregroundFilename = spec.foreground ? `${spec.id}-foreground.png` : null;
			return Object.freeze({
				id: spec.id,
				derivation: spec.derivation,
				reviewBounds: spec.reviewBounds,
				coverageAttachments: spec.coverageAttachments,
				preClampBounds: spec.preClampBounds,
				edgeClamp: spec.edgeClamp,
				bounds: spec.bounds,
				expectedDimensions: Object.freeze({
					width: spec.bounds.right - spec.bounds.left,
					height: spec.bounds.bottom - spec.bounds.top
				}),
				baseFilename: `${spec.id}-base.png`,
				foregroundFilename,
				textureKeys: Object.freeze({
					base: `meadow-entry-${spec.id}-base`,
					foreground: spec.foreground ? `meadow-entry-${spec.id}-foreground` : null
				}),
				drawOrder: spec.drawOrder,
				sourceRegionIds: spec.sourceRegionIds,
				neighborIds: Object.freeze(neighborIds),
				overlapIds: Object.freeze(cropOverlaps.map(({ id }) => id)),
				alphaPolicy: Object.freeze({
					base: 'opaque' as const,
					foreground: spec.foreground ? ('sparse-eligible-mask' as const) : null
				}),
				sizeBudgets: spec.sizeBudgets
			});
		})
	);
}

export const MEADOW_ENTRY_APPROVED_OVERLAPS = BUILT_OVERLAPS;
export const MEADOW_ENTRY_APPROVED_CROPS = buildApprovedCrops(
	REVIEWED_CROP_SPECS,
	MEADOW_ENTRY_APPROVED_OVERLAPS
);

function buildRuntimeCoverage(
	crops: readonly MeadowEntryApprovedCrop[]
): readonly MeadowEntryRuntimeCoverage[] {
	const southwestOceanBounds = { left: 64, top: 6_286, right: 164, bottom: 6_336 };
	const xEdges = [
		...new Set([
			MEADOW_ENTRY_WORLD_BOUNDS.left,
			MEADOW_ENTRY_WORLD_BOUNDS.right,
			southwestOceanBounds.left,
			southwestOceanBounds.right,
			...crops.flatMap(({ bounds }) => [bounds.left, bounds.right])
		])
	].sort((first, second) => first - second);
	const yEdges = [
		...new Set([
			MEADOW_ENTRY_WORLD_BOUNDS.top,
			MEADOW_ENTRY_WORLD_BOUNDS.bottom,
			southwestOceanBounds.top,
			southwestOceanBounds.bottom,
			...crops.flatMap(({ bounds }) => [bounds.top, bounds.bottom])
		])
	].sort((first, second) => first - second);
	const coverage: MeadowEntryRuntimeCoverage[] = [];
	for (let yIndex = 0; yIndex < yEdges.length - 1; yIndex += 1) {
		const top = yEdges[yIndex]!;
		const bottom = yEdges[yIndex + 1]!;
		for (let xIndex = 0; xIndex < xEdges.length - 1; xIndex += 1) {
			const left = xEdges[xIndex]!;
			const right = xEdges[xIndex + 1]!;
			const bounds = { left, top, right, bottom };
			const cropIds = crops
				.filter((crop) => containsBounds(crop.bounds, bounds))
				.map(({ id }) => id);
			const southwestOcean = containsBounds(southwestOceanBounds, bounds);
			const next: MeadowEntryRuntimeCoverage =
				cropIds.length > 0
					? { mode: 'baked', bounds, cropIds }
					: {
							mode: 'fallback-tile',
							bounds,
							reason: southwestOcean ? SOUTHWEST_OCEAN_FALLBACK_REASON : GENERAL_FALLBACK_REASON
						};
			const previous = coverage.at(-1);
			const sameMode = previous?.mode === next.mode;
			const sameResponsibility =
				previous?.mode === 'baked' && next.mode === 'baked'
					? previous.cropIds.join('|') === next.cropIds.join('|')
					: previous?.mode === 'fallback-tile' && next.mode === 'fallback-tile'
						? previous.reason === next.reason
						: false;
			if (
				previous &&
				sameMode &&
				sameResponsibility &&
				previous.bounds.top === top &&
				previous.bounds.bottom === bottom &&
				previous.bounds.right === left
			) {
				(previous.bounds as { right: number }).right = right;
			} else {
				coverage.push(next);
			}
		}
	}
	return Object.freeze(
		coverage.map((entry) =>
			entry.mode === 'baked'
				? Object.freeze({
						mode: entry.mode,
						bounds: freezeBounds(entry.bounds),
						cropIds: Object.freeze([...entry.cropIds])
					})
				: Object.freeze({
						mode: entry.mode,
						bounds: freezeBounds(entry.bounds),
						reason: entry.reason
					})
		)
	);
}

export const MEADOW_ENTRY_RUNTIME_COVERAGE = buildRuntimeCoverage(MEADOW_ENTRY_APPROVED_CROPS);

function buildBudgetSummary(
	crops: readonly MeadowEntryApprovedCrop[]
): MeadowEntryCropBudgetSummary {
	const cropArea = crops.reduce((sum, crop) => sum + boundsArea(crop.bounds), 0);
	return Object.freeze({
		exportAreaRatio: cropArea / MASTER_AREA,
		overlapArea: cropArea - unionArea(crops.map(({ bounds }) => bounds)),
		aggregateBaseReviewBytes: crops.reduce(
			(sum, crop) => sum + crop.sizeBudgets.baseReviewBytes,
			0
		),
		aggregateBaseHardBytes: crops.reduce((sum, crop) => sum + crop.sizeBudgets.baseHardBytes, 0),
		aggregateForegroundReviewBytes: crops.reduce(
			(sum, crop) => sum + (crop.sizeBudgets.foregroundReviewBytes ?? 0),
			0
		),
		aggregateForegroundHardBytes: crops.reduce(
			(sum, crop) => sum + (crop.sizeBudgets.foregroundHardBytes ?? 0),
			0
		)
	});
}

export const MEADOW_ENTRY_CROP_BUDGET_SUMMARY = buildBudgetSummary(MEADOW_ENTRY_APPROVED_CROPS);

function boundsEqual(first: PixelBounds, second: PixelBounds): boolean {
	return (
		first.left === second.left &&
		first.top === second.top &&
		first.right === second.right &&
		first.bottom === second.bottom
	);
}

function arrayEqual<T>(first: readonly T[], second: readonly T[]): boolean {
	return first.length === second.length && first.every((value, index) => value === second[index]);
}

function envelopeBounds(bounds: readonly PixelBounds[]): PixelBounds {
	return {
		left: Math.min(...bounds.map(({ left }) => left)),
		top: Math.min(...bounds.map(({ top }) => top)),
		right: Math.max(...bounds.map(({ right }) => right)),
		bottom: Math.max(...bounds.map(({ bottom }) => bottom))
	};
}

function snapPreClampBounds(bounds: PixelBounds): PixelBounds {
	return {
		left: Math.floor(bounds.left / MEADOW_ENTRY_TILE_SIZE_PX) * MEADOW_ENTRY_TILE_SIZE_PX,
		top: Math.floor(bounds.top / MEADOW_ENTRY_TILE_SIZE_PX) * MEADOW_ENTRY_TILE_SIZE_PX,
		right: Math.ceil(bounds.right / MEADOW_ENTRY_TILE_SIZE_PX) * MEADOW_ENTRY_TILE_SIZE_PX,
		bottom: Math.ceil(bounds.bottom / MEADOW_ENTRY_TILE_SIZE_PX) * MEADOW_ENTRY_TILE_SIZE_PX
	};
}

function validateCropDerivation(crop: MeadowEntryApprovedCrop): void {
	const start = envelopeBounds([crop.reviewBounds, ...crop.coverageAttachments]);
	const expectedPreClamp =
		crop.derivation.mode === 'exact-bounds'
			? start
			: snapPreClampBounds({
					left: start.left - crop.derivation.expansionPx,
					top: start.top - crop.derivation.expansionPx,
					right: start.right + crop.derivation.expansionPx,
					bottom: start.bottom + crop.derivation.expansionPx
				});
	if (!boundsEqual(expectedPreClamp, crop.preClampBounds)) {
		throw new Error(`Crop "${crop.id}" pre-clamp candidate has drifted`);
	}
	const postClamp = clampBoundsToWorld(expectedPreClamp);
	if (!boundsEqual(postClamp.bounds, crop.bounds)) {
		throw new Error(`Crop "${crop.id}" approved bounds differ from its post-clamp candidate`);
	}
	if (postClamp.clampedSides.length === 0 && crop.edgeClamp !== null) {
		throw new Error(`Crop "${crop.id}" declares an unused edge clamp`);
	}
	if (postClamp.clampedSides.length > 0 && crop.edgeClamp === null) {
		throw new Error(`Crop "${crop.id}" silently clips a world edge`);
	}
	if (
		crop.edgeClamp !== null &&
		(!arrayEqual(crop.edgeClamp.sides, postClamp.clampedSides) ||
			crop.edgeClamp.reason.trim().length === 0)
	) {
		throw new Error(`Crop "${crop.id}" has an invalid declared edge clamp`);
	}
}

function validateCropMetadata(crop: MeadowEntryApprovedCrop): void {
	if (!containsBounds(MEADOW_ENTRY_WORLD_BOUNDS, crop.bounds)) {
		throw new Error(`Crop "${crop.id}" leaves meadow-entry`);
	}
	for (const edge of Object.values(crop.bounds)) {
		if (edge % MEADOW_ENTRY_TILE_SIZE_PX !== 0) {
			throw new Error(`Crop "${crop.id}" is not 32px aligned`);
		}
	}
	if (
		crop.expectedDimensions.width !== crop.bounds.right - crop.bounds.left ||
		crop.expectedDimensions.height !== crop.bounds.bottom - crop.bounds.top
	) {
		throw new Error(`Crop "${crop.id}" dimensions do not match bounds`);
	}
	const baseStem = crop.id.endsWith('-base') ? crop.id : `${crop.id}-base`;
	const expectedBaseTextureKey = crop.id.endsWith('-base')
		? `meadow-entry-${crop.id}`
		: `meadow-entry-${crop.id}-base`;
	if (crop.baseFilename !== `${baseStem}.png` || crop.textureKeys.base !== expectedBaseTextureKey) {
		throw new Error(`Crop "${crop.id}" base identity has drifted`);
	}
	const baseOnly = crop.alphaPolicy.foreground === null;
	if (
		(baseOnly &&
			(crop.foregroundFilename !== null ||
				crop.textureKeys.foreground !== null ||
				crop.sizeBudgets.foregroundReviewBytes !== null ||
				crop.sizeBudgets.foregroundHardBytes !== null)) ||
		(!baseOnly &&
			(crop.foregroundFilename !== `${crop.id}-foreground.png` ||
				crop.textureKeys.foreground !== `meadow-entry-${crop.id}-foreground` ||
				crop.sizeBudgets.foregroundReviewBytes === null ||
				crop.sizeBudgets.foregroundHardBytes === null))
	) {
		throw new Error(`Crop "${crop.id}" foreground identity has drifted`);
	}
	if (
		crop.sizeBudgets.baseReviewBytes <= 0 ||
		crop.sizeBudgets.baseHardBytes < crop.sizeBudgets.baseReviewBytes ||
		(crop.sizeBudgets.foregroundReviewBytes !== null &&
			crop.sizeBudgets.foregroundReviewBytes <= 0) ||
		(crop.sizeBudgets.foregroundHardBytes !== null &&
			crop.sizeBudgets.foregroundReviewBytes !== null &&
			crop.sizeBudgets.foregroundHardBytes < crop.sizeBudgets.foregroundReviewBytes)
	) {
		throw new Error(`Crop "${crop.id}" has invalid size budgets`);
	}
}

function validateBakedSources(
	crops: readonly MeadowEntryApprovedCrop[],
	bakeOwnership: readonly MeadowEntryBakeOwnershipEntry[],
	coverageMode: MeadowEntryCoverageMode,
	sourceCatalog: readonly MeadowEntrySourceRecord[]
): void {
	const sources = new Map(
		sourceCatalog.map((record) => [meadowEntrySourceKey(record.ref), record])
	);
	for (const ownership of bakeOwnership) {
		const baked =
			ownership.disposition.mode === 'base-underlay' ||
			ownership.disposition.mode === 'base-static' ||
			ownership.disposition.mode === 'base-and-foreground';
		if (!baked) continue;
		const sourceKey = meadowEntrySourceKey(ownership.ref);
		const source = sources.get(sourceKey);
		if (source?.bounds === null || source?.bounds === undefined) {
			throw new Error(`Baked source "${sourceKey}" has no coverage bounds`);
		}
		const bounds = rasterizeCoverageBounds(source.bounds);
		const coveredByRuntime =
			coverageMode === 'full-world'
				? unionArea(
						crops.flatMap((crop) => {
							const intersection = intersectBounds(crop.bounds, bounds);
							return intersection ? [intersection] : [];
						})
					) === boundsArea(bounds)
				: crops.some((crop) => containsBounds(crop.bounds, bounds));
		if (!coveredByRuntime) {
			throw new Error(`Baked source "${sourceKey}" is not contained by a runtime base crop`);
		}
	}
}

function validateOverlaps(
	crops: readonly MeadowEntryApprovedCrop[],
	overlaps: readonly MeadowEntryOverlap[]
): void {
	const cropsById = new Map(crops.map((crop) => [crop.id, crop]));
	const overlapsByPair = new Map<string, MeadowEntryOverlap>();
	for (const overlap of overlaps) {
		const first = cropsById.get(overlap.firstCropId);
		const second = cropsById.get(overlap.secondCropId);
		if (!first || !second) throw new Error(`Overlap "${overlap.id}" names an unknown crop`);
		const key = pairKey(overlap.firstCropId, overlap.secondCropId);
		if (overlapsByPair.has(key)) throw new Error(`Duplicate crop overlap "${key}"`);
		overlapsByPair.set(key, overlap);
		const intersection = intersectBounds(first.bounds, second.bounds);
		if (intersection === null || !boundsEqual(intersection, overlap.bounds)) {
			throw new Error(`Overlap "${overlap.id}" does not equal its exact crop intersection`);
		}
		if (!containsBounds(overlap.bounds, overlap.routeMouth.bounds)) {
			throw new Error(`Overlap "${overlap.id}" route mouth leaves its intersection`);
		}
		const sharedPixels =
			overlap.routeMouth.sharedAxis === 'x'
				? overlap.routeMouth.bounds.right - overlap.routeMouth.bounds.left
				: overlap.routeMouth.bounds.bottom - overlap.routeMouth.bounds.top;
		if (
			overlap.minimumSharedPixels !== MEADOW_ENTRY_MIN_HANDOFF_PX ||
			sharedPixels < MEADOW_ENTRY_MIN_HANDOFF_PX
		) {
			throw new Error(`Overlap "${overlap.id}" has an undersized route mouth`);
		}
		const ownerCrop = cropsById.get(overlap.ownerCropId);
		if (!ownerCrop || (ownerCrop.id !== first.id && ownerCrop.id !== second.id)) {
			throw new Error(`Overlap "${overlap.id}" names an unknown owner crop`);
		}
		const expectedOwner = first.drawOrder > second.drawOrder ? first : second;
		if (ownerCrop.id !== expectedOwner.id) {
			throw new Error(`Overlap "${overlap.id}" owner crop must have the higher draw order`);
		}
		const pairHasForeground =
			first.foregroundFilename !== null && second.foregroundFilename !== null;
		if (overlap.planePolicy === 'base-and-foreground' && !pairHasForeground) {
			throw new Error(`Overlap "${overlap.id}" declares foreground planes for a crop without one`);
		}
		if (overlap.planePolicy === 'base-only' && pairHasForeground) {
			throw new Error(`Overlap "${overlap.id}" must declare foreground planes for its crop pair`);
		}
	}

	for (let firstIndex = 0; firstIndex < crops.length - 1; firstIndex += 1) {
		for (let secondIndex = firstIndex + 1; secondIndex < crops.length; secondIndex += 1) {
			const first = crops[firstIndex]!;
			const second = crops[secondIndex]!;
			const intersection = intersectBounds(first.bounds, second.bounds);
			const overlap = overlapsByPair.get(pairKey(first.id, second.id));
			if ((intersection === null) !== (overlap === undefined)) {
				throw new Error(`Crop pair "${first.id}/${second.id}" overlap accounting has drifted`);
			}
		}
	}

	for (let firstIndex = 0; firstIndex < crops.length - 2; firstIndex += 1) {
		for (let secondIndex = firstIndex + 1; secondIndex < crops.length - 1; secondIndex += 1) {
			for (let thirdIndex = secondIndex + 1; thirdIndex < crops.length; thirdIndex += 1) {
				const first = crops[firstIndex]!;
				const second = crops[secondIndex]!;
				const third = crops[thirdIndex]!;
				const firstSecond = intersectBounds(first.bounds, second.bounds);
				const triple = firstSecond === null ? null : intersectBounds(firstSecond, third.bounds);
				if (triple === null) continue;
				const groupIds = [
					overlapsByPair.get(pairKey(first.id, second.id))?.cornerGroupId,
					overlapsByPair.get(pairKey(first.id, third.id))?.cornerGroupId,
					overlapsByPair.get(pairKey(second.id, third.id))?.cornerGroupId
				];
				if (groupIds.some((groupId) => groupId === undefined) || new Set(groupIds).size !== 1) {
					throw new Error(
						`Triple crop intersection "${first.id}/${second.id}/${third.id}" lacks one corner group`
					);
				}
			}
		}
	}
}

function validateRuntimeCoverage(
	crops: readonly MeadowEntryApprovedCrop[],
	coverage: readonly MeadowEntryRuntimeCoverage[],
	coverageMode: MeadowEntryCoverageMode,
	requiredFallbacks: readonly MeadowEntryFallbackRequirement[]
): void {
	let summedArea = 0;
	for (const entry of coverage) {
		summedArea += boundsArea(entry.bounds);
		const containingCropIds = crops
			.filter((crop) => containsBounds(crop.bounds, entry.bounds))
			.map(({ id }) => id);
		if (entry.mode === 'baked') {
			if (!arrayEqual(entry.cropIds, containingCropIds) || entry.cropIds.length === 0) {
				throw new Error(`Baked runtime coverage has incorrect crop ownership`);
			}
		} else if (containingCropIds.length > 0 || entry.reason.trim().length === 0) {
			throw new Error(`Fallback runtime coverage overlaps a crop or lacks a reason`);
		}
	}
	const coveredArea = unionArea(coverage.map(({ bounds }) => bounds));
	const expectedArea =
		coverageMode === 'partial' ? unionArea(crops.map(({ bounds }) => bounds)) : MASTER_AREA;
	if (coveredArea !== expectedArea || summedArea !== expectedArea) {
		throw new Error(
			`Runtime coverage has unexplained or overlapping area: union=${coveredArea}, sum=${summedArea}, expected=${expectedArea}`
		);
	}
	for (const requirement of requiredFallbacks) {
		if (requirement.reason.trim().length === 0) {
			throw new Error('Fallback requirement must have a non-empty reason');
		}
		const matchingFallback = coverage.find(
			(entry) =>
				entry.mode === 'fallback-tile' &&
				boundsEqual(entry.bounds, requirement.bounds) &&
				entry.reason === requirement.reason
		);
		if (matchingFallback === undefined) {
			if (requiredFallbacks === DEFAULT_FALLBACK_REQUIREMENTS) {
				throw new Error('Southwest-ocean fallback coverage is not explicit');
			}
			throw new Error('Runtime fallback requirement is not represented by coverage');
		}
	}
}

/**
 * Optional overrides for {@link validateMeadowEntryCropContract}.
 *
 * Each property defaults to the corresponding sealed source constant:
 * `crops` → `MEADOW_ENTRY_APPROVED_CROPS`, `overlaps` →
 * `MEADOW_ENTRY_APPROVED_OVERLAPS`, `runtimeCoverage` →
 * `MEADOW_ENTRY_RUNTIME_COVERAGE`, `budgetSummary` →
 * `MEADOW_ENTRY_CROP_BUDGET_SUMMARY`, `bakeOwnership` →
 * `MEADOW_ENTRY_BAKE_OWNERSHIP`, `requiredFallbacks` → the historical southwest
 * ocean fallback requirement for full-world coverage (none is assumed for partial
 * coverage), and `coverageMode` → `'full-world'`.
 */
export type MeadowEntryCoverageMode = 'full-world' | 'partial';

export interface MeadowEntryFallbackRequirement {
	readonly bounds: PixelBounds;
	readonly reason: string;
}

export interface MeadowEntryCropContractValidationOptions {
	readonly crops?: readonly MeadowEntryApprovedCrop[];
	readonly overlaps?: readonly MeadowEntryOverlap[];
	readonly runtimeCoverage?: readonly MeadowEntryRuntimeCoverage[];
	readonly budgetSummary?: MeadowEntryCropBudgetSummary;
	readonly bakeOwnership?: readonly MeadowEntryBakeOwnershipEntry[];
	readonly sourceCatalog?: readonly MeadowEntrySourceRecord[];
	readonly requiredFallbacks?: readonly MeadowEntryFallbackRequirement[];
	readonly coverageMode?: MeadowEntryCoverageMode;
}

/**
 * Validates the meadow-entry crop contract: crop identity, derivation, metadata,
 * overlap geometry, baked sources, runtime coverage, and aggregate budget sums.
 *
 * Each option defaults to the corresponding sealed source constant when omitted.
 * Throws an `Error` with a descriptive message on any contract violation.
 *
 * @param {MeadowEntryCropContractValidationOptions} [options] - optional overrides
 *   for the sealed crop, overlap, runtime-coverage, budget, ownership, and fallback data
 * @returns {void}
 */
export function validateMeadowEntryCropContract(
	options: MeadowEntryCropContractValidationOptions = {}
): void {
	const crops = options.crops ?? MEADOW_ENTRY_APPROVED_CROPS;
	const overlaps = options.overlaps ?? MEADOW_ENTRY_APPROVED_OVERLAPS;
	const runtimeCoverage = options.runtimeCoverage ?? MEADOW_ENTRY_RUNTIME_COVERAGE;
	const budgetSummary = options.budgetSummary ?? MEADOW_ENTRY_CROP_BUDGET_SUMMARY;
	const bakeOwnership = options.bakeOwnership ?? MEADOW_ENTRY_BAKE_OWNERSHIP;
	const sourceCatalog = options.sourceCatalog ?? collectMeadowEntrySourceCatalog();
	const coverageMode = options.coverageMode ?? 'full-world';
	const requiredFallbacks =
		options.requiredFallbacks ?? (coverageMode === 'partial' ? [] : DEFAULT_FALLBACK_REQUIREMENTS);
	const cropIds = new Set<string>();
	const drawOrders = new Set<number>();
	for (const crop of crops) {
		if (cropIds.has(crop.id)) throw new Error(`Duplicate approved crop "${crop.id}"`);
		if (drawOrders.has(crop.drawOrder)) {
			throw new Error(`Duplicate crop draw order ${crop.drawOrder}`);
		}
		cropIds.add(crop.id);
		drawOrders.add(crop.drawOrder);
		validateCropDerivation(crop);
		validateCropMetadata(crop);
	}
	validateOverlaps(crops, overlaps);
	validateBakedSources(crops, bakeOwnership, coverageMode, sourceCatalog);
	validateRuntimeCoverage(crops, runtimeCoverage, coverageMode, requiredFallbacks);
	const expectedSummary = buildBudgetSummary(crops);
	const expectedKeys = Object.keys(expectedSummary) as (keyof MeadowEntryCropBudgetSummary)[];
	const actualKeys = Object.keys(budgetSummary);
	if (
		expectedKeys.length !== actualKeys.length ||
		!expectedKeys.every((field) => actualKeys.includes(field))
	) {
		throw new Error(
			'Aggregate meadow-entry crop budget summary shape does not match expected schema'
		);
	}
	for (const field of expectedKeys) {
		if (expectedSummary[field] !== budgetSummary[field]) {
			throw new Error('Aggregate meadow-entry crop budgets do not equal per-crop sums');
		}
	}
}
