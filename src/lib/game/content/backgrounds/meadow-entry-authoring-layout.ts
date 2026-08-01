import {
	boundsArea,
	containsBounds,
	intersectBounds,
	rasterizeCoverageBounds,
	unionArea,
	MEADOW_ENTRY_MIN_HANDOFF_PX,
	MEADOW_ENTRY_TILE_SIZE_PX,
	MEADOW_ENTRY_WORLD_BOUNDS
} from './meadow-entry-authoring-geometry';
import {
	collectMeadowEntrySourceCatalog,
	meadowEntrySourceKey,
	type MeadowEntrySourceRecord
} from './meadow-entry-source-catalog';
import type { PixelBounds } from './meadow-entry-authoring-types';

export type MeadowEntryAuthoringRegionId =
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

export interface MeadowEntryAuthoringRegion {
	id: MeadowEntryAuthoringRegionId;
	reviewBounds: PixelBounds;
	materialProfile: string;
	neighbors: readonly MeadowEntryAuthoringRegionId[];
}

export interface MeadowEntryAuthoringLayoutValidationOptions {
	regions?: readonly MeadowEntryAuthoringRegion[];
	primarySourceOwners?: Readonly<Record<string, MeadowEntryAuthoringRegionId>>;
	crossRegionCoverage?: readonly MeadowEntryCrossRegionCoverage[];
	outlierResolutions?: readonly MeadowEntryOutlierResolution[];
}

export interface MeadowEntryCrossRegionCoverage {
	sourceKey: string;
	bounds: readonly PixelBounds[];
	secondaryRegions: readonly MeadowEntryAuthoringRegionId[];
}

export type MeadowEntryOutlierResolution =
	| { sourceKey: string; mode: 'contained' }
	| { sourceKey: string; mode: 'cross-region'; coverageIndex: number }
	| { sourceKey: string; mode: 'split'; bounds: readonly PixelBounds[] }
	| { sourceKey: string; mode: 're-owned'; owner: MeadowEntryAuthoringRegionId }
	| { sourceKey: string; mode: 'deferred-to-disposition'; reason: string };

export const MEADOW_ENTRY_AUTHORING_REGIONS: readonly MeadowEntryAuthoringRegion[] = [
	{
		id: 'sundrop-village',
		reviewBounds: { left: 256, top: 4_352, right: 2_048, bottom: 5_888 },
		materialProfile: 'sundrop-painted-village',
		neighbors: ['connector-village-crossroads']
	},
	{
		id: 'crossroads',
		reviewBounds: { left: 2_912, top: 2_624, right: 4_256, bottom: 4_576 },
		materialProfile: 'crossroads-cobblestone-festival',
		neighbors: [
			'connector-village-crossroads',
			'connector-crossroads-coast',
			'connector-crossroads-mistfen',
			'connector-crossroads-silverpine',
			'connector-crossroads-wildwood'
		]
	},
	{
		id: 'tidewatch-coast',
		reviewBounds: { left: 2_784, top: 4_448, right: 6_400, bottom: 6_400 },
		materialProfile: 'tidewatch-sand-and-sea',
		neighbors: ['connector-crossroads-coast', 'wildwood', 'outer-boundary']
	},
	{
		id: 'mistfen',
		reviewBounds: { left: 224, top: 416, right: 2_560, bottom: 3_104 },
		materialProfile: 'mistfen-marsh-and-fog',
		neighbors: ['connector-crossroads-mistfen', 'outer-boundary']
	},
	{
		id: 'silverpine',
		reviewBounds: { left: 2_176, top: 256, right: 3_808, bottom: 3_008 },
		materialProfile: 'silverpine-autumn-shrine',
		neighbors: ['connector-crossroads-silverpine']
	},
	{
		id: 'wildwood',
		reviewBounds: { left: 3_840, top: 256, right: 6_400, bottom: 4_928 },
		materialProfile: 'wildwood-forest-and-ruins',
		neighbors: ['connector-crossroads-wildwood', 'tidewatch-coast', 'outer-boundary']
	},
	{
		id: 'connector-village-crossroads',
		reviewBounds: { left: 1_536, top: 3_840, right: 3_200, bottom: 4_960 },
		materialProfile: 'village-crossroads-handoff',
		neighbors: ['sundrop-village', 'crossroads']
	},
	{
		id: 'connector-crossroads-coast',
		reviewBounds: { left: 3_424, top: 4_544, right: 4_352, bottom: 5_568 },
		materialProfile: 'crossroads-coast-handoff',
		neighbors: ['crossroads', 'tidewatch-coast']
	},
	{
		id: 'connector-crossroads-mistfen',
		reviewBounds: { left: 2_304, top: 2_560, right: 3_136, bottom: 3_584 },
		materialProfile: 'crossroads-mistfen-handoff',
		neighbors: ['crossroads', 'mistfen']
	},
	{
		id: 'connector-crossroads-silverpine',
		reviewBounds: { left: 3_040, top: 2_880, right: 3_584, bottom: 3_104 },
		materialProfile: 'crossroads-silverpine-handoff',
		neighbors: ['crossroads', 'silverpine']
	},
	{
		id: 'connector-crossroads-wildwood',
		reviewBounds: { left: 3_968, top: 3_712, right: 4_352, bottom: 4_928 },
		materialProfile: 'crossroads-wildwood-handoff',
		neighbors: ['crossroads', 'wildwood']
	},
	{
		id: 'outer-boundary',
		reviewBounds: { left: 0, top: 0, right: 6_400, bottom: 6_400 },
		materialProfile: 'outer-boundary-control',
		neighbors: ['tidewatch-coast', 'mistfen', 'wildwood']
	}
];

// Independent review seal for the ordered JSON registry above. The test owns
// the SHA-256 computation so coordinated metadata drift cannot update itself.
export const MEADOW_ENTRY_REVIEWED_AUTHORING_REGIONS_SHA256 =
	'a8b56d60dd0de31c3db76375aeb8a66eb8eff6d422be26bacbe5396c4ba8f28c';

const DEFAULT_FRAGMENT_OWNERS = {
	village: 'sundrop-village',
	crossroads: 'crossroads',
	coast: 'tidewatch-coast',
	mistfen: 'mistfen',
	silverpine: 'silverpine',
	wildwood: 'wildwood',
	'outer-boundary': 'outer-boundary'
} as const satisfies Readonly<Record<string, MeadowEntryAuthoringRegionId>>;

const EXACT_PATH_OWNERS = {
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
} as const satisfies Readonly<Record<string, MeadowEntryAuthoringRegionId>>;

const REOWNED_SOURCES = {
	'blocker:mistfen-entry-bank-east': 'connector-crossroads-mistfen'
} as const satisfies Readonly<Record<string, MeadowEntryAuthoringRegionId>>;

export function primaryOwnerFor(record: MeadowEntrySourceRecord): MeadowEntryAuthoringRegionId {
	const sourceKey = meadowEntrySourceKey(record.ref);
	const reowned = REOWNED_SOURCES[sourceKey as keyof typeof REOWNED_SOURCES];
	if (reowned) return reowned;
	if (record.fragmentId === 'paths') {
		const owner = EXACT_PATH_OWNERS[sourceKey as keyof typeof EXACT_PATH_OWNERS];
		if (!owner) throw new Error(`Missing exact paths.ts authoring owner for "${sourceKey}"`);
		return owner;
	}
	const owner = DEFAULT_FRAGMENT_OWNERS[record.fragmentId as keyof typeof DEFAULT_FRAGMENT_OWNERS];
	if (!owner) throw new Error(`Missing fragment authoring owner for "${sourceKey}"`);
	return owner;
}

export const MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS: Readonly<
	Record<string, MeadowEntryAuthoringRegionId>
> = Object.freeze(
	Object.fromEntries(
		collectMeadowEntrySourceCatalog().map((record) => [
			meadowEntrySourceKey(record.ref),
			primaryOwnerFor(record)
		])
	)
);

// Independent review seal for sorted `sourceKey=owner\n` records. This makes a
// future catalog addition fail review even though default fragment assignment
// can still build a useful diagnostic owner in memory.
export const MEADOW_ENTRY_REVIEWED_PRIMARY_SOURCE_OWNERS_SHA256 =
	'63bf03a986d2755ead9306e4124ecf0cdabb87e7bc99ef9ba447c044c1f00519';

export const MEADOW_ENTRY_CROSS_REGION_COVERAGE: readonly MeadowEntryCrossRegionCoverage[] = [
	{
		sourceKey: 'ground-patch:sundrop-forest-road-east',
		bounds: [{ left: 2_800, top: 5_312, right: 5_600, bottom: 5_382 }],
		secondaryRegions: ['tidewatch-coast']
	},
	{
		sourceKey: 'ground-patch:sundrop-forest-road-north',
		bounds: [{ left: 5_565, top: 4_928, right: 5_635, bottom: 5_350 }],
		secondaryRegions: ['tidewatch-coast']
	},
	{
		sourceKey: 'blocker:wildwood-forest-lane-east-bank',
		bounds: [{ left: 6_068, top: 4_928, right: 6_132, bottom: 5_300 }],
		secondaryRegions: ['tidewatch-coast']
	},
	{
		sourceKey: 'blocker:wildwood-forest-lane-west-bank',
		bounds: [{ left: 4_968, top: 4_928, right: 5_032, bottom: 5_300 }],
		secondaryRegions: ['tidewatch-coast']
	},
	{
		sourceKey: 'decor:wildwood-forest-lane-north-wall',
		bounds: [{ left: 4_450, top: 5_140, right: 5_550, bottom: 5_260 }],
		secondaryRegions: ['tidewatch-coast']
	},
	{
		sourceKey: 'decor:wildwood-forest-lane-south-wall',
		bounds: [{ left: 4_450, top: 5_440, right: 5_550, bottom: 5_560 }],
		secondaryRegions: ['tidewatch-coast']
	}
];

export const MEADOW_ENTRY_OUTLIER_RESOLUTIONS: readonly MeadowEntryOutlierResolution[] = [
	{
		sourceKey: 'ground-patch:sundrop-forest-road-east',
		mode: 'cross-region',
		coverageIndex: 0
	},
	{
		sourceKey: 'ground-patch:sundrop-forest-road-north',
		mode: 'cross-region',
		coverageIndex: 1
	},
	{
		sourceKey: 'blocker:wildwood-forest-lane-east-bank',
		mode: 'cross-region',
		coverageIndex: 2
	},
	{
		sourceKey: 'blocker:wildwood-forest-lane-west-bank',
		mode: 'cross-region',
		coverageIndex: 3
	},
	{
		sourceKey: 'decor:wildwood-forest-lane-north-wall',
		mode: 'cross-region',
		coverageIndex: 4
	},
	{
		sourceKey: 'decor:wildwood-forest-lane-south-wall',
		mode: 'cross-region',
		coverageIndex: 5
	},
	{
		sourceKey: 'blocker:mistfen-entry-bank-east',
		mode: 're-owned',
		owner: 'connector-crossroads-mistfen'
	},
	{ sourceKey: 'blocker:meadow-east-boundary', mode: 'contained' },
	{ sourceKey: 'blocker:meadow-north-boundary', mode: 'contained' },
	{ sourceKey: 'blocker:meadow-south-boundary', mode: 'contained' },
	{ sourceKey: 'blocker:meadow-west-boundary', mode: 'contained' },
	{
		sourceKey: 'blocker:sundrop-southwest-ocean',
		mode: 'deferred-to-disposition',
		reason: 'Inline ocean collision awaits the reviewed base-underlay or fallback-only disposition.'
	},
	{
		sourceKey: 'ground-patch:sundrop-southwest-ocean-patch',
		mode: 'deferred-to-disposition',
		reason: 'Inline ocean pixels await the reviewed base-underlay or fallback-only disposition.'
	}
];

function assertRegionBounds(region: MeadowEntryAuthoringRegion): void {
	if (!containsBounds(MEADOW_ENTRY_WORLD_BOUNDS, region.reviewBounds)) {
		throw new Error(
			`Authoring region "${region.id}" review bounds must remain inside meadow-entry`
		);
	}
	for (const edge of Object.values(region.reviewBounds)) {
		if (edge % MEADOW_ENTRY_TILE_SIZE_PX !== 0) {
			throw new Error(`Authoring region "${region.id}" review bounds must be 32px aligned`);
		}
	}
}

function rasterBounds(record: MeadowEntrySourceRecord): PixelBounds | null {
	return record.bounds === null ? null : rasterizeCoverageBounds(record.bounds);
}

function coverageAreaWithinSource(
	sourceBounds: PixelBounds,
	bounds: readonly PixelBounds[]
): number {
	return unionArea(
		bounds.flatMap((coverageBounds) => {
			const intersection = intersectBounds(sourceBounds, coverageBounds);
			return intersection === null ? [] : [intersection];
		})
	);
}

function detectedOutlierKeys(
	catalog: readonly MeadowEntrySourceRecord[],
	regions: ReadonlyMap<MeadowEntryAuthoringRegionId, MeadowEntryAuthoringRegion>,
	primarySourceOwners: Readonly<Record<string, MeadowEntryAuthoringRegionId>>
): readonly string[] {
	return catalog.flatMap((record) => {
		const sourceKey = meadowEntrySourceKey(record.ref);
		const owner = primarySourceOwners[sourceKey];
		const ownerRegion = owner === undefined ? undefined : regions.get(owner);
		const expectedFragmentOwner =
			record.fragmentId === 'paths'
				? undefined
				: DEFAULT_FRAGMENT_OWNERS[record.fragmentId as keyof typeof DEFAULT_FRAGMENT_OWNERS];
		const isReowned = expectedFragmentOwner !== undefined && owner !== expectedFragmentOwner;
		const bounds = rasterBounds(record);
		const isOutsideOwner =
			bounds !== null &&
			ownerRegion !== undefined &&
			!containsBounds(ownerRegion.reviewBounds, bounds);
		return record.fragmentId === 'outer-boundary' || isReowned || isOutsideOwner ? [sourceKey] : [];
	});
}

export function validateMeadowEntryAuthoringLayout(
	options: MeadowEntryAuthoringLayoutValidationOptions = {}
): void {
	const catalog = collectMeadowEntrySourceCatalog();
	const catalogByKey = new Map(catalog.map((record) => [meadowEntrySourceKey(record.ref), record]));
	const regions = new Map<MeadowEntryAuthoringRegionId, MeadowEntryAuthoringRegion>();
	const authoringRegions = options.regions ?? MEADOW_ENTRY_AUTHORING_REGIONS;
	const primarySourceOwners = options.primarySourceOwners ?? MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS;
	const crossRegionCoverage = options.crossRegionCoverage ?? MEADOW_ENTRY_CROSS_REGION_COVERAGE;
	const outlierResolutions = options.outlierResolutions ?? MEADOW_ENTRY_OUTLIER_RESOLUTIONS;
	for (const region of authoringRegions) {
		if (regions.has(region.id)) throw new Error(`Duplicate authoring region "${region.id}"`);
		assertRegionBounds(region);
		regions.set(region.id, region);
	}

	for (const region of authoringRegions) {
		const neighborIds = new Set<MeadowEntryAuthoringRegionId>();
		for (const neighborId of region.neighbors) {
			if (neighborId === region.id) {
				throw new Error(`Authoring region "${region.id}" must not neighbor itself`);
			}
			if (neighborIds.has(neighborId)) {
				throw new Error(`Authoring region "${region.id}" has duplicate neighbor "${neighborId}"`);
			}
			neighborIds.add(neighborId);
			const neighbor = regions.get(neighborId);
			if (!neighbor)
				throw new Error(`Unknown neighbor "${neighborId}" on authoring region "${region.id}"`);
			if (!neighbor.neighbors.includes(region.id)) {
				throw new Error(
					`Authoring region neighbor relation must be symmetric: ${region.id}/${neighborId}`
				);
			}
			const handoff = intersectBounds(region.reviewBounds, neighbor.reviewBounds);
			const sharedWidth = handoff === null ? 0 : handoff.right - handoff.left;
			const sharedHeight = handoff === null ? 0 : handoff.bottom - handoff.top;
			if (Math.max(sharedWidth, sharedHeight) < MEADOW_ENTRY_MIN_HANDOFF_PX) {
				throw new Error(
					`Authoring region handoff must share at least ${MEADOW_ENTRY_MIN_HANDOFF_PX}px: ${region.id}/${neighborId}`
				);
			}
		}
	}

	const ownerKeys = Object.keys(primarySourceOwners);
	if (ownerKeys.length !== catalog.length) {
		throw new Error(
			`Primary owner count ${ownerKeys.length} does not match source count ${catalog.length}`
		);
	}
	for (const sourceKey of ownerKeys) {
		if (!catalogByKey.has(sourceKey))
			throw new Error(`Unknown primary owner source "${sourceKey}"`);
		const owner = primarySourceOwners[sourceKey];
		if (owner === undefined || !regions.has(owner)) {
			throw new Error(`Unknown primary authoring owner for "${sourceKey}"`);
		}
	}
	for (const record of catalog) {
		const sourceKey = meadowEntrySourceKey(record.ref);
		if (!Object.hasOwn(primarySourceOwners, sourceKey)) {
			throw new Error(`Missing primary authoring owner for "${sourceKey}"`);
		}
		if (
			record.fragmentId === 'paths' &&
			primarySourceOwners[sourceKey] !==
				EXACT_PATH_OWNERS[sourceKey as keyof typeof EXACT_PATH_OWNERS]
		) {
			throw new Error(`Incorrect exact paths.ts authoring owner for "${sourceKey}"`);
		}
	}

	for (const [index, coverage] of crossRegionCoverage.entries()) {
		const record = catalogByKey.get(coverage.sourceKey);
		if (!record) throw new Error(`Unknown cross-region coverage source "${coverage.sourceKey}"`);
		if (coverage.bounds.length === 0 || coverage.secondaryRegions.length === 0) {
			throw new Error(`Cross-region coverage ${index} must declare bounds and secondary regions`);
		}
		const owner = primarySourceOwners[coverage.sourceKey];
		const sourceBounds = rasterBounds(record);
		for (const bounds of coverage.bounds) {
			if (!containsBounds(MEADOW_ENTRY_WORLD_BOUNDS, bounds)) {
				throw new Error(`Cross-region coverage ${index} must remain inside meadow-entry`);
			}
			if (
				!coverage.secondaryRegions.some((regionId) => {
					const region = regions.get(regionId);
					return region !== undefined && containsBounds(region.reviewBounds, bounds);
				})
			) {
				throw new Error(`Cross-region coverage ${index} is not contained by a secondary region`);
			}
		}
		for (const regionId of coverage.secondaryRegions) {
			if (!regions.has(regionId) || regionId === owner) {
				throw new Error(`Invalid secondary region "${regionId}" on coverage ${index}`);
			}
			const region = regions.get(regionId);
			if (
				region !== undefined &&
				!coverage.bounds.some((bounds) => containsBounds(region.reviewBounds, bounds))
			) {
				throw new Error(
					`Secondary region "${regionId}" on coverage ${index} contains none of the declared bounds`
				);
			}
		}
		for (const bounds of coverage.bounds) {
			if (sourceBounds !== null && !containsBounds(sourceBounds, bounds)) {
				throw new Error(
					`Cross-region coverage ${index} extends outside its source bounds "${coverage.sourceKey}"`
				);
			}
		}
	}

	const resolutions = new Map<string, MeadowEntryOutlierResolution>();
	for (const resolution of outlierResolutions) {
		if (!catalogByKey.has(resolution.sourceKey)) {
			throw new Error(`Unknown outlier resolution source "${resolution.sourceKey}"`);
		}
		if (resolutions.has(resolution.sourceKey)) {
			throw new Error(`Duplicate outlier resolution for "${resolution.sourceKey}"`);
		}
		resolutions.set(resolution.sourceKey, resolution);
		const record = catalogByKey.get(resolution.sourceKey);
		if (!record) continue;
		const sourceBounds = rasterBounds(record);
		const owner = primarySourceOwners[resolution.sourceKey];
		const ownerBounds = owner === undefined ? undefined : regions.get(owner)?.reviewBounds;
		if (resolution.mode === 'contained') {
			if (
				sourceBounds !== null &&
				(ownerBounds === undefined || !containsBounds(ownerBounds, sourceBounds))
			) {
				throw new Error(
					`Contained outlier "${resolution.sourceKey}" is outside its primary region`
				);
			}
		} else if (resolution.mode === 'cross-region') {
			const coverage = crossRegionCoverage[resolution.coverageIndex];
			if (!coverage || coverage.sourceKey !== resolution.sourceKey || sourceBounds === null) {
				throw new Error(`Invalid cross-region resolution for "${resolution.sourceKey}"`);
			}
			const primaryIntersection =
				ownerBounds === undefined ? null : intersectBounds(sourceBounds, ownerBounds);
			const coverageBounds = [
				...(primaryIntersection === null ? [] : [primaryIntersection]),
				...coverage.bounds
			];
			if (coverageAreaWithinSource(sourceBounds, coverageBounds) !== boundsArea(sourceBounds)) {
				throw new Error(`Cross-region coverage is incomplete for "${resolution.sourceKey}"`);
			}
		} else if (resolution.mode === 'split') {
			if (
				sourceBounds === null ||
				resolution.bounds.length === 0 ||
				coverageAreaWithinSource(sourceBounds, resolution.bounds) !== boundsArea(sourceBounds)
			) {
				throw new Error(`Split resolution is incomplete for "${resolution.sourceKey}"`);
			}
		} else if (resolution.mode === 're-owned') {
			if (
				owner !== resolution.owner ||
				ownerBounds === undefined ||
				(sourceBounds !== null && !containsBounds(ownerBounds, sourceBounds))
			) {
				throw new Error(`Invalid re-owned resolution for "${resolution.sourceKey}"`);
			}
		} else if (resolution.reason.trim().length === 0) {
			throw new Error(`Deferred outlier "${resolution.sourceKey}" must include a reason`);
		}
	}

	const detected = detectedOutlierKeys(catalog, regions, primarySourceOwners);
	if (detected.length !== resolutions.size || detected.some((key) => !resolutions.has(key))) {
		throw new Error(
			`Outlier resolution set does not match detected sources: detected=${detected.length}, resolved=${resolutions.size}`
		);
	}
}

validateMeadowEntryAuthoringLayout();
