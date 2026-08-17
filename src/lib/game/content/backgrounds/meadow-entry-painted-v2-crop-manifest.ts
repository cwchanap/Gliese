import type { PixelBounds } from './meadow-entry-authoring-types';
import type {
	MeadowEntryApprovedCrop,
	MeadowEntryCropBudgetSummary,
	MeadowEntryFallbackRequirement,
	MeadowEntryOverlap,
	MeadowEntryRuntimeCoverage
} from './meadow-entry-crop-manifest';

const MIB = 1_024 * 1_024;

function freezeBounds(bounds: PixelBounds): PixelBounds {
	return Object.freeze({ ...bounds });
}

function freezeCrop(crop: MeadowEntryApprovedCrop): MeadowEntryApprovedCrop {
	return Object.freeze({
		...crop,
		derivation: Object.freeze({ ...crop.derivation }),
		reviewBounds: freezeBounds(crop.reviewBounds),
		coverageAttachments: Object.freeze(crop.coverageAttachments.map(freezeBounds)),
		preClampBounds: freezeBounds(crop.preClampBounds),
		edgeClamp:
			crop.edgeClamp === null
				? null
				: Object.freeze({
						sides: Object.freeze([...crop.edgeClamp.sides]),
						reason: crop.edgeClamp.reason
					}),
		bounds: freezeBounds(crop.bounds),
		expectedDimensions: Object.freeze({ ...crop.expectedDimensions }),
		textureKeys: Object.freeze({ ...crop.textureKeys }),
		sourceRegionIds: Object.freeze([...crop.sourceRegionIds]),
		neighborIds: Object.freeze([...crop.neighborIds]),
		overlapIds: Object.freeze([...crop.overlapIds]),
		alphaPolicy: Object.freeze({ ...crop.alphaPolicy }),
		sizeBudgets: Object.freeze({ ...crop.sizeBudgets })
	}) as MeadowEntryApprovedCrop;
}

const RAW_PILOT_CROPS = [
	{
		id: 'painted-v2-sundrop-camera-base',
		derivation: { mode: 'exact-bounds' },
		reviewBounds: { left: 0, top: 3200, right: 3200, bottom: 6400 },
		coverageAttachments: [],
		preClampBounds: { left: 0, top: 3200, right: 3200, bottom: 6400 },
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
		coverageAttachments: [],
		preClampBounds: { left: 2368, top: 2240, right: 5568, bottom: 5440 },
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
] satisfies readonly MeadowEntryApprovedCrop[];

export const MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS: readonly MeadowEntryApprovedCrop[] =
	Object.freeze(RAW_PILOT_CROPS.map(freezeCrop));

function freezeOverlap(overlap: MeadowEntryOverlap): MeadowEntryOverlap {
	return Object.freeze({
		...overlap,
		bounds: freezeBounds(overlap.bounds),
		routeMouth: Object.freeze({
			sharedAxis: overlap.routeMouth.sharedAxis,
			bounds: freezeBounds(overlap.routeMouth.bounds)
		})
	}) as MeadowEntryOverlap;
}

const RAW_PILOT_OVERLAPS = [
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
] satisfies readonly MeadowEntryOverlap[];

export const MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS: readonly MeadowEntryOverlap[] = Object.freeze(
	RAW_PILOT_OVERLAPS.map(freezeOverlap)
);

function freezeRuntimeCoverage(entry: MeadowEntryRuntimeCoverage): MeadowEntryRuntimeCoverage {
	return entry.mode === 'baked'
		? (Object.freeze({
				mode: entry.mode,
				bounds: freezeBounds(entry.bounds),
				cropIds: Object.freeze([...entry.cropIds])
			}) as MeadowEntryRuntimeCoverage)
		: (Object.freeze({
				mode: entry.mode,
				bounds: freezeBounds(entry.bounds),
				reason: entry.reason
			}) as MeadowEntryRuntimeCoverage);
}

const RAW_PILOT_RUNTIME_COVERAGE = [
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
] satisfies readonly MeadowEntryRuntimeCoverage[];

export const MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE: readonly MeadowEntryRuntimeCoverage[] =
	Object.freeze(RAW_PILOT_RUNTIME_COVERAGE.map(freezeRuntimeCoverage));

export const MEADOW_ENTRY_PAINTED_V2_PILOT_FALLBACK_REQUIREMENTS: readonly MeadowEntryFallbackRequirement[] =
	Object.freeze([]);

export const MEADOW_ENTRY_PAINTED_V2_PILOT_BUDGET_SUMMARY: MeadowEntryCropBudgetSummary =
	Object.freeze({
		exportAreaRatio: 0.5,
		overlapArea: 1_863_680,
		aggregateBaseReviewBytes: 56_613_986,
		aggregateBaseHardBytes: 64 * MIB,
		aggregateForegroundReviewBytes: 0,
		aggregateForegroundHardBytes: 0
	});
