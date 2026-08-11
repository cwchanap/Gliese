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
		id: 'painted-v2-sundrop-village',
		derivation: { mode: 'exact-bounds' },
		reviewBounds: { left: 256, top: 3968, right: 2880, bottom: 6144 },
		coverageAttachments: [],
		preClampBounds: { left: 256, top: 3968, right: 2880, bottom: 6144 },
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
		coverageAttachments: [],
		preClampBounds: { left: 2592, top: 4480, right: 3392, bottom: 4896 },
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
		overlapIds: ['painted-v2-overlap-sundrop-connector', 'painted-v2-overlap-connector-crossroads'],
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
		coverageAttachments: [],
		preClampBounds: { left: 2880, top: 2816, right: 4608, bottom: 4768 },
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
] satisfies readonly MeadowEntryRuntimeCoverage[];

export const MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE: readonly MeadowEntryRuntimeCoverage[] =
	Object.freeze(RAW_PILOT_RUNTIME_COVERAGE.map(freezeRuntimeCoverage));

export const MEADOW_ENTRY_PAINTED_V2_PILOT_FALLBACK_REQUIREMENTS: readonly MeadowEntryFallbackRequirement[] =
	Object.freeze([]);

export const MEADOW_ENTRY_PAINTED_V2_PILOT_BUDGET_SUMMARY: MeadowEntryCropBudgetSummary =
	Object.freeze({
		exportAreaRatio: 0.229875,
		overlapArea: 267_264,
		aggregateBaseReviewBytes: 40 * MIB,
		aggregateBaseHardBytes: 64 * MIB,
		aggregateForegroundReviewBytes: 0,
		aggregateForegroundHardBytes: 0
	});
