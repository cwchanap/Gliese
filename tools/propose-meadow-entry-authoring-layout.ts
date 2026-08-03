import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
	boundsArea,
	clampBoundsToWorld,
	containsBounds,
	intersectBounds,
	rasterizeCoverageBounds,
	unionArea,
	MEADOW_ENTRY_MIN_HANDOFF_PX,
	MEADOW_ENTRY_TILE_SIZE_PX,
	MEADOW_ENTRY_WORLD_BOUNDS,
	type PixelBounds
} from '$lib/game/content/backgrounds/meadow-entry-authoring-geometry';
import {
	MEADOW_ENTRY_AUTHORING_REGIONS,
	MEADOW_ENTRY_CROSS_REGION_COVERAGE,
	type MeadowEntryAuthoringRegionId
} from '$lib/game/content/backgrounds/meadow-entry-authoring-layout';
import { MEADOW_ENTRY_BAKE_OWNERSHIP } from '$lib/game/content/backgrounds/meadow-entry-bake-ownership';
import {
	MEADOW_ENTRY_APPROVED_CROPS,
	MEADOW_ENTRY_APPROVED_OVERLAPS,
	MEADOW_ENTRY_CROP_BUDGET_SUMMARY,
	MEADOW_ENTRY_RUNTIME_COVERAGE,
	validateMeadowEntryCropContract
} from '$lib/game/content/backgrounds/meadow-entry-crop-manifest';
import {
	collectMeadowEntrySourceCatalog,
	meadowEntrySourceKey,
	type MeadowEntrySourceRecord
} from '$lib/game/content/backgrounds/meadow-entry-source-catalog';

type CandidateRegionId =
	| 'sundrop-village'
	| 'crossroads'
	| 'tidewatch-coast'
	| 'mistfen'
	| 'silverpine'
	| 'wildwood'
	| 'connector-village-crossroads'
	| 'connector-crossroads-coast'
	| 'connector-crossroads-mistfen'
	| 'connector-crossroads-silverpine'
	| 'connector-crossroads-wildwood'
	| 'outer-boundary';

interface CandidateRegion {
	id: CandidateRegionId;
	reviewBounds: PixelBounds;
}

type CandidateCropId =
	| 'sundrop-village-underlay'
	| 'outer-boundary-east-forest-lane'
	| 'village-crossroads-connector'
	| 'crossroads'
	| 'crossroads-coast-connector'
	| 'tidewatch-coast'
	| 'crossroads-mistfen-connector'
	| 'mistfen'
	| 'crossroads-silverpine-connector'
	| 'silverpine'
	| 'crossroads-wildwood-connector'
	| 'wildwood';

interface CandidateCrop {
	id: CandidateCropId;
	regionIds: readonly MeadowEntryAuthoringRegionId[];
	reviewBounds: PixelBounds;
	coverageAttachments: readonly PixelBounds[];
	preClampBounds: PixelBounds;
	clampedSides: readonly ('left' | 'right' | 'top' | 'bottom')[];
	bounds: PixelBounds;
	expectedDimensions: { width: number; height: number };
	drawOrder: number;
	foreground: boolean;
	sizeBudgets: {
		baseReviewBytes: number;
		baseHardBytes: number;
		foregroundReviewBytes: number | null;
		foregroundHardBytes: number | null;
	};
}

const OUTPUT_DIRECTORY = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../docs/superpowers/reports/img/hpa-399/proposals'
);

validateMeadowEntryCropContract();

// Deliberately hand-authored candidates. These are review aids, never inputs to
// production crop derivation. The checked-in layout is frozen separately after
// the proposal has been reviewed.
const CANDIDATE_REGIONS: readonly CandidateRegion[] = [
	{ id: 'sundrop-village', reviewBounds: { left: 256, top: 4_352, right: 2_048, bottom: 5_888 } },
	{ id: 'crossroads', reviewBounds: { left: 2_912, top: 2_624, right: 4_256, bottom: 4_576 } },
	{ id: 'tidewatch-coast', reviewBounds: { left: 2_784, top: 4_448, right: 6_400, bottom: 6_400 } },
	{ id: 'mistfen', reviewBounds: { left: 224, top: 416, right: 2_560, bottom: 3_104 } },
	{ id: 'silverpine', reviewBounds: { left: 2_176, top: 256, right: 3_808, bottom: 3_008 } },
	{ id: 'wildwood', reviewBounds: { left: 3_840, top: 256, right: 6_400, bottom: 4_928 } },
	{
		id: 'connector-village-crossroads',
		reviewBounds: { left: 1_536, top: 3_840, right: 3_200, bottom: 4_960 }
	},
	{
		id: 'connector-crossroads-coast',
		reviewBounds: { left: 3_424, top: 4_544, right: 4_352, bottom: 5_568 }
	},
	{
		id: 'connector-crossroads-mistfen',
		reviewBounds: { left: 2_304, top: 2_560, right: 3_136, bottom: 3_584 }
	},
	{
		id: 'connector-crossroads-silverpine',
		reviewBounds: { left: 3_040, top: 2_880, right: 3_584, bottom: 3_104 }
	},
	{
		id: 'connector-crossroads-wildwood',
		reviewBounds: { left: 3_968, top: 3_712, right: 4_352, bottom: 4_928 }
	},
	{ id: 'outer-boundary', reviewBounds: { left: 0, top: 0, right: 6_400, bottom: 6_400 } }
];

const REVIEWED_PARTITION_RATIONALES = {
	crossroads:
		'The west edge includes the authored west hedge and Mistfen cue without claiming the marsh basin; the north edge includes the castle-gate approach and festival road; the east edge includes the Coast and Wildwood cues; the south edge closes below the plaza and market staging. The 32px-aligned bounds were reviewed against those geographic landmarks. Their equality to the snapped fragment envelope is coincidental and is not used as a derivation rule.',
	silverpine:
		'The west edge includes the offering grove and its wall, the north edge preserves the shrine canopy breathing room, the east edge includes the eastern wall and grove dressing, and the south edge closes below the lower approach and wall pair at the Crossroads handoff. The 32px-aligned bounds were reviewed against those geographic landmarks. Their equality to the snapped fragment envelope is coincidental and is not used as a derivation rule.'
} as const satisfies Partial<Record<CandidateRegionId, string>>;

const CROP_BY_REGION = {
	'sundrop-village': { id: 'sundrop-village-underlay', drawOrder: 0, foreground: false },
	'connector-village-crossroads': {
		id: 'village-crossroads-connector',
		drawOrder: 100,
		foreground: true
	},
	crossroads: { id: 'crossroads', drawOrder: 200, foreground: true },
	'connector-crossroads-coast': {
		id: 'crossroads-coast-connector',
		drawOrder: 110,
		foreground: true
	},
	'tidewatch-coast': { id: 'tidewatch-coast', drawOrder: 210, foreground: true },
	'connector-crossroads-mistfen': {
		id: 'crossroads-mistfen-connector',
		drawOrder: 120,
		foreground: true
	},
	mistfen: { id: 'mistfen', drawOrder: 220, foreground: true },
	'connector-crossroads-silverpine': {
		id: 'crossroads-silverpine-connector',
		drawOrder: 130,
		foreground: true
	},
	silverpine: { id: 'silverpine', drawOrder: 230, foreground: true },
	'connector-crossroads-wildwood': {
		id: 'crossroads-wildwood-connector',
		drawOrder: 140,
		foreground: true
	},
	wildwood: { id: 'wildwood', drawOrder: 240, foreground: true }
} as const satisfies Partial<
	Readonly<
		Record<
			MeadowEntryAuthoringRegionId,
			{ id: CandidateCropId; drawOrder: number; foreground: boolean }
		>
	>
>;

const MIB = 1_024 * 1_024;
const MASTER_AREA = boundsArea(MEADOW_ENTRY_WORLD_BOUNDS);

function envelopeBounds(bounds: readonly PixelBounds[]): PixelBounds {
	if (bounds.length === 0) throw new Error('Cannot derive an empty crop envelope');
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

function projectedBudgets(
	bounds: PixelBounds,
	foreground: boolean,
	sundrop: boolean
): CandidateCrop['sizeBudgets'] {
	if (sundrop) {
		return {
			baseReviewBytes: 4 * MIB,
			baseHardBytes: 8 * MIB,
			foregroundReviewBytes: null,
			foregroundHardBytes: null
		};
	}
	const ratio = boundsArea(bounds) / MASTER_AREA;
	return {
		baseReviewBytes: Math.max(MIB, Math.ceil(128 * MIB * ratio)),
		baseHardBytes: Math.max(2 * MIB, Math.ceil(192 * MIB * ratio)),
		foregroundReviewBytes: foreground ? Math.max(512 * 1_024, Math.ceil(48 * MIB * ratio)) : null,
		foregroundHardBytes: foreground ? Math.max(MIB, Math.ceil(96 * MIB * ratio)) : null
	};
}

function deriveCropCandidates(
	catalogByKey: ReadonlyMap<string, MeadowEntrySourceRecord>
): readonly CandidateCrop[] {
	const regionalCrops = Object.entries(CROP_BY_REGION).map(([regionId, cropFacts]) => {
		const region = MEADOW_ENTRY_AUTHORING_REGIONS.find(({ id }) => id === regionId);
		if (!region) throw new Error(`Missing reviewed region ${regionId}`);
		const coverageAttachments = MEADOW_ENTRY_CROSS_REGION_COVERAGE.filter(({ secondaryRegions }) =>
			secondaryRegions.includes(region.id)
		).flatMap(({ bounds }) => bounds);
		const sundrop = cropFacts.id === 'sundrop-village-underlay';
		const expanded = sundrop
			? region.reviewBounds
			: (() => {
					const start = envelopeBounds([region.reviewBounds, ...coverageAttachments]);
					return {
						left: start.left - MEADOW_ENTRY_MIN_HANDOFF_PX,
						top: start.top - MEADOW_ENTRY_MIN_HANDOFF_PX,
						right: start.right + MEADOW_ENTRY_MIN_HANDOFF_PX,
						bottom: start.bottom + MEADOW_ENTRY_MIN_HANDOFF_PX
					};
				})();
		const preClampBounds = sundrop ? expanded : snapPreClampBounds(expanded);
		const clampResult = clampBoundsToWorld(preClampBounds);
		const bounds = clampResult.bounds;
		return {
			id: cropFacts.id,
			regionIds: [region.id],
			reviewBounds: region.reviewBounds,
			coverageAttachments,
			preClampBounds,
			clampedSides: clampResult.clampedSides,
			bounds,
			expectedDimensions: {
				width: bounds.right - bounds.left,
				height: bounds.bottom - bounds.top
			},
			drawOrder: cropFacts.drawOrder,
			foreground: cropFacts.foreground,
			sizeBudgets: projectedBudgets(bounds, cropFacts.foreground, sundrop)
		};
	});
	const edgeAttachments = [
		'blocker:wildwood-forest-lane-east-bank',
		'blocker:wildwood-forest-lane-west-bank',
		'ground-patch:sundrop-forest-road-north'
	].map((sourceKey) => {
		const source = catalogByKey.get(sourceKey);
		if (source?.bounds === null || source?.bounds === undefined) {
			throw new Error(`Missing edge-crop attachment ${sourceKey}`);
		}
		return rasterizeCoverageBounds(source.bounds);
	});
	const edgeReviewBounds = { left: 4_960, top: 1_024, right: 6_144, bottom: 5_376 };
	const edgePreClampBounds = snapPreClampBounds({
		left: edgeReviewBounds.left - MEADOW_ENTRY_MIN_HANDOFF_PX,
		top: edgeReviewBounds.top - MEADOW_ENTRY_MIN_HANDOFF_PX,
		right: edgeReviewBounds.right + MEADOW_ENTRY_MIN_HANDOFF_PX,
		bottom: edgeReviewBounds.bottom + MEADOW_ENTRY_MIN_HANDOFF_PX
	});
	const edgeClampResult = clampBoundsToWorld(edgePreClampBounds);
	const edgeBounds = edgeClampResult.bounds;
	const edgeCrop: CandidateCrop = {
		id: 'outer-boundary-east-forest-lane',
		regionIds: ['wildwood', 'tidewatch-coast'],
		reviewBounds: edgeReviewBounds,
		coverageAttachments: edgeAttachments,
		preClampBounds: edgePreClampBounds,
		clampedSides: edgeClampResult.clampedSides,
		bounds: edgeBounds,
		expectedDimensions: {
			width: edgeBounds.right - edgeBounds.left,
			height: edgeBounds.bottom - edgeBounds.top
		},
		drawOrder: 10,
		foreground: false,
		sizeBudgets: {
			baseReviewBytes: 24 * MIB,
			baseHardBytes: 36 * MIB,
			foregroundReviewBytes: null,
			foregroundHardBytes: null
		}
	};
	return [...regionalCrops, edgeCrop].sort(
		({ drawOrder: first }, { drawOrder: second }) => first - second
	);
}

function buildCoverageCells(crops: readonly CandidateCrop[], fallbackBounds: PixelBounds) {
	const xEdges = [
		...new Set([
			MEADOW_ENTRY_WORLD_BOUNDS.left,
			MEADOW_ENTRY_WORLD_BOUNDS.right,
			fallbackBounds.left,
			fallbackBounds.right,
			...crops.flatMap(({ bounds }) => [bounds.left, bounds.right])
		])
	].sort((first, second) => first - second);
	const yEdges = [
		...new Set([
			MEADOW_ENTRY_WORLD_BOUNDS.top,
			MEADOW_ENTRY_WORLD_BOUNDS.bottom,
			fallbackBounds.top,
			fallbackBounds.bottom,
			...crops.flatMap(({ bounds }) => [bounds.top, bounds.bottom])
		])
	].sort((first, second) => first - second);
	const rows = yEdges.slice(0, -1).flatMap((top, yIndex) => {
		const bottom = yEdges[yIndex + 1];
		if (bottom === undefined) return [];
		const cells = xEdges.slice(0, -1).flatMap((left, xIndex) => {
			const right = xEdges[xIndex + 1];
			if (right === undefined) return [];
			const bounds = { left, top, right, bottom };
			const cropIds = crops
				.filter((crop) => containsBounds(crop.bounds, bounds))
				.map(({ id }) => id);
			const southwestOcean = containsBounds(fallbackBounds, bounds);
			return [
				cropIds.length > 0
					? { mode: 'baked' as const, bounds, cropIds }
					: {
							mode: 'fallback-tile' as const,
							bounds,
							reason: southwestOcean
								? 'Southwest ocean remains fallback tile: the collision-only ocean blocker relies on its paired sea ground patch, and the existing sea tile covers this reviewed margin outside regional crops.'
								: 'Existing meadow-entry tile rendering remains the deliberate fallback outside approved baked crop coverage.'
						}
			];
		});
		return cells.reduce<typeof cells>((merged, cell) => {
			const previous = merged.at(-1);
			const previousIdentity =
				previous?.mode === 'baked'
					? `baked:${previous.cropIds.join(',')}`
					: `fallback:${previous?.reason}`;
			const cellIdentity =
				cell.mode === 'baked' ? `baked:${cell.cropIds.join(',')}` : `fallback:${cell.reason}`;
			if (
				previous &&
				previousIdentity === cellIdentity &&
				previous.bounds.top === cell.bounds.top &&
				previous.bounds.bottom === cell.bounds.bottom &&
				previous.bounds.right === cell.bounds.left
			) {
				previous.bounds.right = cell.bounds.right;
			} else {
				merged.push({ ...cell, bounds: { ...cell.bounds } });
			}
			return merged;
		}, []);
	});
	return rows;
}

function uncoveredBakedSourceKeys(
	crops: readonly CandidateCrop[],
	catalogByKey: ReadonlyMap<string, MeadowEntrySourceRecord>
): readonly string[] {
	return MEADOW_ENTRY_BAKE_OWNERSHIP.flatMap((ownership) => {
		if (
			ownership.disposition.mode !== 'base-underlay' &&
			ownership.disposition.mode !== 'base-static' &&
			ownership.disposition.mode !== 'base-and-foreground'
		) {
			return [];
		}
		const sourceKey = meadowEntrySourceKey(ownership.ref);
		const source = catalogByKey.get(sourceKey);
		if (source?.bounds === null || source?.bounds === undefined) return [sourceKey];
		const sourceBounds = rasterizeCoverageBounds(source.bounds);
		return crops.some(({ bounds }) => containsBounds(bounds, sourceBounds)) ? [] : [sourceKey];
	});
}

const MANDATORY_PATH_OWNERS = {
	'ground-patch:link-village-crossroads': 'connector-village-crossroads',
	'ground-patch:link-village-crossroads-v': 'connector-village-crossroads',
	'ground-patch:village-crossroads-nook': 'connector-village-crossroads',
	'blocker:corridor-wall-2a': 'connector-village-crossroads',
	'blocker:corridor-wall-2b': 'connector-village-crossroads',
	'blocker:corridor-wall-3a': 'connector-village-crossroads',
	'blocker:corridor-wall-3b': 'connector-village-crossroads',
	'blocker:corridor-wall-4a': 'connector-village-crossroads',
	'blocker:corridor-wall-4b': 'connector-village-crossroads',
	'blocker:corridor-wall-5a': 'connector-village-crossroads',
	'blocker:corridor-wall-5b': 'connector-village-crossroads',
	'blocker:corridor-wall-6a': 'connector-village-crossroads',
	'blocker:corridor-wall-6b': 'connector-village-crossroads',
	'blocker:corridor-wall-7a': 'connector-village-crossroads',
	'blocker:corridor-wall-7b': 'connector-village-crossroads',
	'blocker:corridor-wall-8a': 'connector-village-crossroads',
	'blocker:corridor-wall-8b': 'connector-village-crossroads',
	'blocker:corridor-wall-9a': 'connector-village-crossroads',
	'blocker:corridor-wall-10b': 'connector-village-crossroads',
	'decor:village-corridor-waymarker': 'connector-village-crossroads',
	'ground-patch:link-crossroads-coast': 'connector-crossroads-coast',
	'ground-patch:link-crossroads-coast-v': 'connector-crossroads-coast',
	'ground-patch:link-crossroads-mistfen': 'connector-crossroads-mistfen',
	'ground-patch:link-crossroads-mistfen-h': 'connector-crossroads-mistfen',
	'ground-patch:link-crossroads-silverpine': 'connector-crossroads-silverpine',
	'ground-patch:link-crossroads-wildwood': 'connector-crossroads-wildwood'
} as const satisfies Readonly<Record<string, CandidateRegionId>>;

const FRAGMENT_REGION = {
	village: 'sundrop-village',
	crossroads: 'crossroads',
	coast: 'tidewatch-coast',
	mistfen: 'mistfen',
	silverpine: 'silverpine',
	wildwood: 'wildwood',
	'outer-boundary': 'outer-boundary'
} as const satisfies Readonly<Record<string, CandidateRegionId>>;

function ownerFor(record: MeadowEntrySourceRecord): CandidateRegionId {
	const key = meadowEntrySourceKey(record.ref);
	if (record.fragmentId === 'paths') {
		const owner = MANDATORY_PATH_OWNERS[key as keyof typeof MANDATORY_PATH_OWNERS];
		if (!owner) throw new Error(`Missing mandatory paths.ts owner for ${key}`);
		return owner;
	}
	const owner = FRAGMENT_REGION[record.fragmentId as keyof typeof FRAGMENT_REGION];
	if (!owner) throw new Error(`Missing candidate owner for ${key} (${record.fragmentId})`);
	return owner;
}

function envelope(records: readonly MeadowEntrySourceRecord[]): PixelBounds | null {
	const bounds = records.flatMap((record) =>
		record.bounds === null ? [] : [rasterizeCoverageBounds(record.bounds)]
	);
	if (bounds.length === 0) return null;
	return envelopeBounds(bounds);
}

function svgRect(bounds: PixelBounds, attributes: string): string {
	return `<rect x="${bounds.left}" y="${bounds.top}" width="${bounds.right - bounds.left}" height="${bounds.bottom - bounds.top}" ${attributes}/>`;
}

const catalog = collectMeadowEntrySourceCatalog();
const catalogByKey = new Map(catalog.map((record) => [meadowEntrySourceKey(record.ref), record]));
const pathKeys = catalog
	.filter(({ fragmentId }) => fragmentId === 'paths')
	.map(({ ref }) => meadowEntrySourceKey(ref));
const mappedPathKeys = Object.keys(MANDATORY_PATH_OWNERS);
if (
	pathKeys.length !== mappedPathKeys.length ||
	pathKeys.some((key) => !Object.hasOwn(MANDATORY_PATH_OWNERS, key))
) {
	throw new Error(
		`Exact paths.ts ownership is incomplete: catalog=${pathKeys.length}, mapped=${mappedPathKeys.length}`
	);
}

const sources = catalog.map((record) => {
	const sourceKey = meadowEntrySourceKey(record.ref);
	const rasterBounds = record.bounds === null ? null : rasterizeCoverageBounds(record.bounds);
	const primaryOwner = ownerFor(record);
	const primaryRegion = CANDIDATE_REGIONS.find(({ id }) => id === primaryOwner);
	if (!primaryRegion) throw new Error(`Missing candidate region ${primaryOwner}`);
	const intersectingRegions =
		rasterBounds === null
			? []
			: CANDIDATE_REGIONS.filter(
					(region) =>
						region.id !== 'outer-boundary' &&
						intersectBounds(rasterBounds, region.reviewBounds) !== null
				).map(({ id }) => id);
	return {
		sourceKey,
		fragmentId: record.fragmentId,
		primaryOwner,
		visualCapable: record.visualCapable,
		rawBounds: record.bounds,
		rasterBounds,
		containedByPrimary:
			rasterBounds === null || containsBounds(primaryRegion.reviewBounds, rasterBounds),
		intersectingRegions
	};
});

const fragmentIds = [...new Set(catalog.map(({ fragmentId }) => fragmentId))].sort();
const fragmentEnvelopes = Object.fromEntries(
	fragmentIds.map((fragmentId) => [
		fragmentId,
		envelope(catalog.filter((record) => record.fragmentId === fragmentId))
	])
);
const boundarySources = sources.filter(({ fragmentId }) => fragmentId === 'outer-boundary');
const crossingSources = sources.filter(
	({ primaryOwner, containedByPrimary, intersectingRegions }) =>
		!containedByPrimary || intersectingRegions.some((regionId) => regionId !== primaryOwner)
);
const cropCandidates = deriveCropCandidates(catalogByKey);
const cropIntersections = cropCandidates.flatMap((firstCrop, firstIndex) =>
	cropCandidates.slice(firstIndex + 1).flatMap((secondCrop) => {
		const bounds = intersectBounds(firstCrop.bounds, secondCrop.bounds);
		if (bounds === null) return [];
		const width = bounds.right - bounds.left;
		const height = bounds.bottom - bounds.top;
		return [
			{
				id: `overlap-${firstCrop.id}--${secondCrop.id}`,
				firstCropId: firstCrop.id,
				secondCropId: secondCrop.id,
				bounds,
				candidateSharedAxis: width >= height ? ('x' as const) : ('y' as const),
				sharedPixels: Math.max(width, height),
				planePolicy:
					firstCrop.foreground && secondCrop.foreground
						? ('base-and-foreground' as const)
						: ('base-only' as const),
				candidateOwnerCropId:
					firstCrop.drawOrder > secondCrop.drawOrder ? firstCrop.id : secondCrop.id
			}
		];
	})
);
const tripleIntersections = cropCandidates.flatMap((firstCrop, firstIndex) =>
	cropCandidates.slice(firstIndex + 1).flatMap((secondCrop, relativeSecondIndex) => {
		const firstSecond = intersectBounds(firstCrop.bounds, secondCrop.bounds);
		if (firstSecond === null) return [];
		return cropCandidates.slice(firstIndex + relativeSecondIndex + 2).flatMap((thirdCrop) => {
			const bounds = intersectBounds(firstSecond, thirdCrop.bounds);
			return bounds === null
				? []
				: [
						{
							cropIds: [firstCrop.id, secondCrop.id, thirdCrop.id],
							bounds,
							candidateCornerGroupId: 'corner-meadow-entry-handoff-network'
						}
					];
		});
	})
);
const initialRegionalCropCandidates = cropCandidates.filter(
	({ id }) => id !== 'outer-boundary-east-forest-lane'
);
const initialUncoveredBakedSources = uncoveredBakedSourceKeys(
	initialRegionalCropCandidates,
	catalogByKey
);
const uncoveredBakedSources = uncoveredBakedSourceKeys(cropCandidates, catalogByKey);
const southwestOceanRecord = catalogByKey.get('ground-patch:sundrop-southwest-ocean-patch');
if (southwestOceanRecord?.bounds === null || southwestOceanRecord?.bounds === undefined) {
	throw new Error('Missing southwest-ocean fallback bounds');
}
const southwestOceanFallbackBounds = rasterizeCoverageBounds(southwestOceanRecord.bounds);
const runtimeCoverageCandidates = buildCoverageCells(cropCandidates, southwestOceanFallbackBounds);
const cropAreaSum = cropCandidates.reduce((sum, { bounds }) => sum + boundsArea(bounds), 0);
const cropUnionArea = unionArea(cropCandidates.map(({ bounds }) => bounds));
const budgetSummaryCandidate = cropCandidates.reduce(
	(summary, crop) => ({
		exportAreaRatio: cropAreaSum / MASTER_AREA,
		overlapArea: cropAreaSum - cropUnionArea,
		aggregateBaseReviewBytes: summary.aggregateBaseReviewBytes + crop.sizeBudgets.baseReviewBytes,
		aggregateBaseHardBytes: summary.aggregateBaseHardBytes + crop.sizeBudgets.baseHardBytes,
		aggregateForegroundReviewBytes:
			summary.aggregateForegroundReviewBytes + (crop.sizeBudgets.foregroundReviewBytes ?? 0),
		aggregateForegroundHardBytes:
			summary.aggregateForegroundHardBytes + (crop.sizeBudgets.foregroundHardBytes ?? 0)
	}),
	{
		exportAreaRatio: cropAreaSum / MASTER_AREA,
		overlapArea: cropAreaSum - cropUnionArea,
		aggregateBaseReviewBytes: 0,
		aggregateBaseHardBytes: 0,
		aggregateForegroundReviewBytes: 0,
		aggregateForegroundHardBytes: 0
	}
);
const approvedCropComparisons = cropCandidates.map((candidate) => {
	const approved = MEADOW_ENTRY_APPROVED_CROPS.find(({ id }) => id === candidate.id);
	return {
		id: candidate.id,
		approved: approved !== undefined,
		preClampMatches:
			approved !== undefined &&
			JSON.stringify(approved.preClampBounds) === JSON.stringify(candidate.preClampBounds),
		postClampMatches:
			approved !== undefined &&
			JSON.stringify(approved.bounds) === JSON.stringify(candidate.bounds),
		clampSidesMatch:
			approved !== undefined &&
			JSON.stringify(approved.edgeClamp?.sides ?? []) === JSON.stringify(candidate.clampedSides),
		budgetsMatch:
			approved !== undefined &&
			JSON.stringify(approved.sizeBudgets) === JSON.stringify(candidate.sizeBudgets)
	};
});
const approvedOverlapComparisons = cropIntersections.map((candidate) => {
	const approved = MEADOW_ENTRY_APPROVED_OVERLAPS.find(
		({ firstCropId, secondCropId }) =>
			firstCropId === candidate.firstCropId && secondCropId === candidate.secondCropId
	);
	return {
		id: candidate.id,
		approved: approved !== undefined,
		boundsMatch:
			approved !== undefined &&
			JSON.stringify(approved.bounds) === JSON.stringify(candidate.bounds),
		sharedAxisMatches:
			approved !== undefined && approved.routeMouth.sharedAxis === candidate.candidateSharedAxis,
		planePolicyMatches: approved !== undefined && approved.planePolicy === candidate.planePolicy,
		ownerMatches: approved !== undefined && approved.ownerCropId === candidate.candidateOwnerCropId,
		cornerGroupId: approved?.cornerGroupId ?? null
	};
});

const proposal = {
	format: 'meadow-entry-authoring-layout-proposal-v1',
	diagnosticOnly: true,
	worldBounds: { left: 0, top: 0, right: 6_400, bottom: 6_400 },
	sourceCount: sources.length,
	candidateRegions: CANDIDATE_REGIONS,
	reviewedPartitionRationales: REVIEWED_PARTITION_RATIONALES,
	mandatoryPathOwners: MANDATORY_PATH_OWNERS,
	fragmentEnvelopes,
	boundarySources,
	crossingSources,
	cropDiagnostics: {
		candidatePipeline: [
			'reviewed partition plus explicit attachments',
			'expand 128px except exact Sundrop underlay',
			'snap outward to 32px',
			'record pre-clamp bounds',
			'apply only declared world-edge clamps',
			'compare approved post-clamp bounds'
		],
		cropCandidates,
		initialCandidateReview: {
			cropCount: initialRegionalCropCandidates.length,
			uncoveredBakedSources: initialUncoveredBakedSources,
			decision:
				'Add the base-only outer-boundary-east-forest-lane crop because three reviewed Wildwood-to-Coast sources were covered only by a multi-crop union, not contained by one runtime base crop.'
		},
		approvedCropComparisons,
		cropIntersections,
		approvedOverlapComparisons,
		tripleIntersections,
		approvedCornerGroups: [
			{
				id: 'corner-meadow-entry-handoff-network',
				reason:
					'The pair-level cornerGroupId API forms one connected overlap network because crossroads/wildwood and tidewatch-coast/wildwood pairs participate in triples at multiple reviewed intersections.'
			}
		],
		uncoveredBakedSources,
		runtimeCoverageCandidates,
		runtimeCoverageMatchesApproved:
			JSON.stringify(runtimeCoverageCandidates) === JSON.stringify(MEADOW_ENTRY_RUNTIME_COVERAGE),
		coverageSummary: {
			worldArea: MASTER_AREA,
			cropAreaSum,
			cropUnionArea,
			bakedCoverageArea: unionArea(
				runtimeCoverageCandidates.filter(({ mode }) => mode === 'baked').map(({ bounds }) => bounds)
			),
			fallbackCoverageArea: unionArea(
				runtimeCoverageCandidates
					.filter(({ mode }) => mode === 'fallback-tile')
					.map(({ bounds }) => bounds)
			),
			unexplainedArea:
				MASTER_AREA - unionArea(runtimeCoverageCandidates.map(({ bounds }) => bounds))
		},
		budgetSummaryCandidate,
		budgetSummaryMatchesApproved:
			JSON.stringify(budgetSummaryCandidate) === JSON.stringify(MEADOW_ENTRY_CROP_BUDGET_SUMMARY)
	},
	sources
};

const palette = [
	'#f97316',
	'#facc15',
	'#38bdf8',
	'#a855f7',
	'#22c55e',
	'#15803d',
	'#fb7185',
	'#06b6d4',
	'#c084fc',
	'#84cc16',
	'#10b981',
	'#64748b'
];
const regionSvg = CANDIDATE_REGIONS.map((region, index) => {
	const color = palette[index] ?? '#ffffff';
	return `${svgRect(region.reviewBounds, `fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-width="12"`)}<text x="${region.reviewBounds.left + 20}" y="${region.reviewBounds.top + 48}" fill="${color}" font-size="38">${region.id}</text>`;
}).join('');
const envelopeSvg = Object.entries(fragmentEnvelopes)
	.flatMap(([fragmentId, bounds]) =>
		bounds === null
			? []
			: [
					`${svgRect(bounds, 'fill="none" stroke="#f8fafc" stroke-width="6" stroke-dasharray="24 18" opacity="0.65"')}<text x="${bounds.left + 16}" y="${bounds.bottom - 20}" fill="#f8fafc" font-size="30">${fragmentId} envelope</text>`
				]
	)
	.join('');
const cropSvg = cropCandidates
	.map(
		(crop) =>
			`${svgRect(crop.bounds, 'fill="none" stroke="#ffffff" stroke-width="18"')}<text x="${crop.bounds.left + 20}" y="${crop.bounds.top + 92}" fill="#ffffff" font-size="34">${crop.id}</text>`
	)
	.join('');
const overlapSvg = cropIntersections
	.map(({ bounds }) => svgRect(bounds, 'fill="#ef4444" fill-opacity="0.12" stroke="none"'))
	.join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600" viewBox="0 0 6400 6400"><rect width="6400" height="6400" fill="#0f172a"/>${regionSvg}${envelopeSvg}${overlapSvg}${cropSvg}</svg>\n`;

await mkdir(OUTPUT_DIRECTORY, { recursive: true });
await Promise.all([
	writeFile(
		join(OUTPUT_DIRECTORY, 'meadow-entry-authoring-layout-proposal.json'),
		`${JSON.stringify(proposal)}\n`
	),
	writeFile(join(OUTPUT_DIRECTORY, 'meadow-entry-authoring-layout-proposal.svg'), svg)
]);

console.log(
	`Wrote ${sources.length} sources, ${cropCandidates.length} crop candidates, ${cropIntersections.length} overlaps, ${tripleIntersections.length} triple intersections, ${runtimeCoverageCandidates.length} coverage cells, ${uncoveredBakedSources.length} uncovered baked sources, ${boundarySources.length} boundary sources, and ${crossingSources.length} crossing diagnostics to ${OUTPUT_DIRECTORY}`
);
