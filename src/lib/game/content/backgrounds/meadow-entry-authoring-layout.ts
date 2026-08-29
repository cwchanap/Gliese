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
import {
	MEADOW_ENTRY_V2_REGION_ENVELOPES,
	MEADOW_ENTRY_V2_ROUTE_PATCHES
} from '$lib/game/content/maps/layouts/meadow-entry-v2';

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

const V2_CONNECTOR_ROUTE_PATCH_IDS = {
	'connector-village-crossroads': ['village-river-crossing'],
	'connector-crossroads-coast': ['crossroads-to-coast'],
	'connector-crossroads-mistfen': ['crossroads-to-mistfen', 'mistfen-west-approach'],
	'connector-crossroads-silverpine': [
		'crossroads-to-silverpine',
		'silverpine-south-approach',
		'silverpine-north-approach'
	],
	'connector-crossroads-wildwood': ['crossroads-to-wildwood', 'wildwood-mouth']
} as const;

function pixelBoundsFromLayoutRect(rect: {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}): PixelBounds {
	return { left: rect.x, top: rect.y, right: rect.x + rect.width, bottom: rect.y + rect.height };
}

function connectorBoundsFromV2RoutePatches(patchIds: readonly string[]): PixelBounds {
	const patches = MEADOW_ENTRY_V2_ROUTE_PATCHES.filter(({ id }) => patchIds.includes(id));
	if (patches.length === 0) throw new Error('V2 connector must own at least one route patch');
	const envelope = {
		left: Math.min(...patches.map(({ rect }) => rect.x)),
		top: Math.min(...patches.map(({ rect }) => rect.y)),
		right: Math.max(...patches.map(({ rect }) => rect.x + rect.width)),
		bottom: Math.max(...patches.map(({ rect }) => rect.y + rect.height))
	};
	return {
		left: Math.max(MEADOW_ENTRY_WORLD_BOUNDS.left, envelope.left - MEADOW_ENTRY_MIN_HANDOFF_PX),
		top: Math.max(MEADOW_ENTRY_WORLD_BOUNDS.top, envelope.top - MEADOW_ENTRY_MIN_HANDOFF_PX),
		right: Math.min(MEADOW_ENTRY_WORLD_BOUNDS.right, envelope.right + MEADOW_ENTRY_MIN_HANDOFF_PX),
		bottom: Math.min(
			MEADOW_ENTRY_WORLD_BOUNDS.bottom,
			envelope.bottom + MEADOW_ENTRY_MIN_HANDOFF_PX
		)
	};
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
		reviewBounds: pixelBoundsFromLayoutRect(MEADOW_ENTRY_V2_REGION_ENVELOPES.sundropVillage),
		materialProfile: 'sundrop-painted-village',
		neighbors: ['connector-village-crossroads']
	},
	{
		id: 'crossroads',
		reviewBounds: pixelBoundsFromLayoutRect(MEADOW_ENTRY_V2_REGION_ENVELOPES.crossroads),
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
		reviewBounds: pixelBoundsFromLayoutRect(MEADOW_ENTRY_V2_REGION_ENVELOPES.tidewatchCoast),
		materialProfile: 'tidewatch-sand-and-sea',
		neighbors: ['connector-crossroads-coast', 'wildwood', 'outer-boundary']
	},
	{
		id: 'mistfen',
		reviewBounds: pixelBoundsFromLayoutRect(MEADOW_ENTRY_V2_REGION_ENVELOPES.mistfen),
		materialProfile: 'mistfen-marsh-and-fog',
		neighbors: ['connector-crossroads-mistfen', 'outer-boundary']
	},
	{
		id: 'silverpine',
		reviewBounds: pixelBoundsFromLayoutRect(MEADOW_ENTRY_V2_REGION_ENVELOPES.silverpine),
		materialProfile: 'silverpine-autumn-shrine',
		neighbors: ['connector-crossroads-silverpine']
	},
	{
		id: 'wildwood',
		reviewBounds: pixelBoundsFromLayoutRect(MEADOW_ENTRY_V2_REGION_ENVELOPES.wildwood),
		materialProfile: 'wildwood-forest-and-ruins',
		neighbors: ['connector-crossroads-wildwood', 'tidewatch-coast', 'outer-boundary']
	},
	{
		id: 'connector-village-crossroads',
		reviewBounds: connectorBoundsFromV2RoutePatches(
			V2_CONNECTOR_ROUTE_PATCH_IDS['connector-village-crossroads']
		),
		materialProfile: 'village-crossroads-handoff',
		neighbors: ['sundrop-village', 'crossroads']
	},
	{
		id: 'connector-crossroads-coast',
		reviewBounds: connectorBoundsFromV2RoutePatches(
			V2_CONNECTOR_ROUTE_PATCH_IDS['connector-crossroads-coast']
		),
		materialProfile: 'crossroads-coast-handoff',
		neighbors: ['crossroads', 'tidewatch-coast']
	},
	{
		id: 'connector-crossroads-mistfen',
		reviewBounds: connectorBoundsFromV2RoutePatches(
			V2_CONNECTOR_ROUTE_PATCH_IDS['connector-crossroads-mistfen']
		),
		materialProfile: 'crossroads-mistfen-handoff',
		neighbors: ['crossroads', 'mistfen']
	},
	{
		id: 'connector-crossroads-silverpine',
		reviewBounds: connectorBoundsFromV2RoutePatches(
			V2_CONNECTOR_ROUTE_PATCH_IDS['connector-crossroads-silverpine']
		),
		materialProfile: 'crossroads-silverpine-handoff',
		neighbors: ['crossroads', 'silverpine']
	},
	{
		id: 'connector-crossroads-wildwood',
		reviewBounds: connectorBoundsFromV2RoutePatches(
			V2_CONNECTOR_ROUTE_PATCH_IDS['connector-crossroads-wildwood']
		),
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
	'd8cd46ec202554dd65b86e29b3fcdae7668bd224f334d18f981039d8e981cd43';

const DEFAULT_FRAGMENT_OWNERS = {
	village: 'sundrop-village',
	crossroads: 'crossroads',
	coast: 'tidewatch-coast',
	mistfen: 'mistfen',
	silverpine: 'silverpine',
	wildwood: 'wildwood',
	'river-system': 'outer-boundary',
	'outer-boundary': 'outer-boundary'
} as const satisfies Readonly<Record<string, MeadowEntryAuthoringRegionId>>;

const EXACT_PATH_OWNERS = {
	'ground-patch:village-west-main-street': 'sundrop-village',
	'ground-patch:village-river-crossing': 'connector-village-crossroads',
	'ground-patch:crossroads-south-approach': 'connector-village-crossroads',
	'decor:village-corridor-waymarker': 'connector-village-crossroads',
	'ground-patch:crossroads-to-coast': 'connector-crossroads-coast',
	'ground-patch:crossroads-to-mistfen': 'connector-crossroads-mistfen',
	'ground-patch:crossroads-to-silverpine': 'connector-crossroads-silverpine',
	'ground-patch:silverpine-south-approach': 'connector-crossroads-silverpine',
	'ground-patch:crossroads-to-wildwood': 'connector-crossroads-wildwood',
	'ground-patch:mistfen-west-approach': 'connector-crossroads-mistfen',
	'ground-patch:silverpine-north-approach': 'connector-crossroads-silverpine',
	'ground-patch:wildwood-mouth': 'connector-crossroads-wildwood'
} as const satisfies Readonly<Record<string, MeadowEntryAuthoringRegionId>>;

export function primaryOwnerFor(record: MeadowEntrySourceRecord): MeadowEntryAuthoringRegionId {
	const sourceKey = meadowEntrySourceKey(record.ref);
	const exactOwner = EXACT_PATH_OWNERS[sourceKey as keyof typeof EXACT_PATH_OWNERS];
	if (exactOwner) return exactOwner;
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
	'50362deec5a856596a04e97a9b12db0210b72a05de472f0172532aa1c19f30a8';

export const MEADOW_ENTRY_CROSS_REGION_COVERAGE: readonly MeadowEntryCrossRegionCoverage[] = [
	{
		sourceKey: 'blocker:castle-gate-block',
		bounds: [{ left: 3_936, top: 2_788, right: 4_416, bottom: 2_816 }],
		secondaryRegions: ['silverpine']
	},
	{
		sourceKey: 'blocker:silverpine-grove-pocket-wall-north',
		bounds: [{ left: 2_340, top: 1_268, right: 2_900, bottom: 1_332 }],
		secondaryRegions: ['mistfen']
	},
	{
		sourceKey: 'blocker:silverpine-grove-pocket-wall-south',
		bounds: [{ left: 2_360, top: 1_788, right: 2_840, bottom: 1_852 }],
		secondaryRegions: ['mistfen']
	},
	{
		sourceKey: 'blocker:silverpine-grove-pocket-wall-west',
		bounds: [{ left: 2_328, top: 1_300, right: 2_392, bottom: 1_820 }],
		secondaryRegions: ['mistfen']
	},
	{
		sourceKey: 'blocker:silverpine-wall-A-east',
		bounds: [{ left: 3_628, top: 2_816, right: 3_692, bottom: 3_000 }],
		secondaryRegions: ['crossroads']
	},
	{
		sourceKey: 'blocker:silverpine-wall-A-west',
		bounds: [{ left: 3_308, top: 2_816, right: 3_372, bottom: 3_000 }],
		secondaryRegions: ['crossroads']
	},
	{
		sourceKey: 'blocker:silverpine-wall-B-south',
		bounds: [{ left: 3_148, top: 2_878, right: 3_532, bottom: 2_942 }],
		secondaryRegions: ['crossroads']
	},
	{
		sourceKey: 'decor:silverpine-offering-grove-wall',
		bounds: [{ left: 2_180, top: 1_470, right: 2_420, bottom: 1_770 }],
		secondaryRegions: ['mistfen']
	},
	{
		sourceKey: 'decor:silverpine-side-grove-maple',
		bounds: [{ left: 2_305, top: 1_375, right: 2_535, bottom: 1_665 }],
		secondaryRegions: ['mistfen']
	},
	{
		sourceKey: 'decor:silverpine-tree-1',
		bounds: [{ left: 2_430, top: 1_150, right: 2_650, bottom: 1_450 }],
		secondaryRegions: ['mistfen']
	},
	{
		sourceKey: 'decor:village-decor-22-77',
		bounds: [{ left: 2_688, top: 4_588, right: 2_846, bottom: 4_788 }],
		secondaryRegions: ['connector-village-crossroads']
	},
	{
		sourceKey: 'decor:wildwood-grove-tree-1',
		bounds: [{ left: 4_290, top: 2_860, right: 4_510, bottom: 3_140 }],
		secondaryRegions: ['crossroads']
	},
	{
		sourceKey: 'ground-patch:silverpine-grove-floor',
		bounds: [{ left: 2_400, top: 400, right: 3_200, bottom: 1_400 }],
		secondaryRegions: ['mistfen']
	},
	{
		sourceKey: 'ground-patch:silverpine-side-grove-floor',
		bounds: [{ left: 2_370, top: 1_350, right: 2_870, bottom: 1_770 }],
		secondaryRegions: ['mistfen']
	}
];

export const MEADOW_ENTRY_OUTLIER_RESOLUTIONS: readonly MeadowEntryOutlierResolution[] = [
	{
		sourceKey: 'blocker:castle-gate-block',
		mode: 'cross-region',
		coverageIndex: 0
	},
	{
		sourceKey: 'blocker:silverpine-grove-pocket-wall-north',
		mode: 'cross-region',
		coverageIndex: 1
	},
	{
		sourceKey: 'blocker:silverpine-grove-pocket-wall-south',
		mode: 'cross-region',
		coverageIndex: 2
	},
	{
		sourceKey: 'blocker:silverpine-grove-pocket-wall-west',
		mode: 'cross-region',
		coverageIndex: 3
	},
	{
		sourceKey: 'blocker:silverpine-wall-A-east',
		mode: 'cross-region',
		coverageIndex: 4
	},
	{
		sourceKey: 'blocker:silverpine-wall-A-west',
		mode: 'cross-region',
		coverageIndex: 5
	},
	{
		sourceKey: 'blocker:silverpine-wall-B-south',
		mode: 'cross-region',
		coverageIndex: 6
	},
	{
		sourceKey: 'decor:silverpine-offering-grove-wall',
		mode: 'cross-region',
		coverageIndex: 7
	},
	{
		sourceKey: 'decor:silverpine-side-grove-maple',
		mode: 'cross-region',
		coverageIndex: 8
	},
	{
		sourceKey: 'decor:silverpine-tree-1',
		mode: 'cross-region',
		coverageIndex: 9
	},
	{
		sourceKey: 'decor:village-decor-22-77',
		mode: 'cross-region',
		coverageIndex: 10
	},
	{
		sourceKey: 'decor:wildwood-grove-tree-1',
		mode: 'cross-region',
		coverageIndex: 11
	},
	{
		sourceKey: 'ground-patch:silverpine-grove-floor',
		mode: 'cross-region',
		coverageIndex: 12
	},
	{
		sourceKey: 'ground-patch:silverpine-side-grove-floor',
		mode: 'cross-region',
		coverageIndex: 13
	},
	{
		sourceKey: 'blocker:coast-approach-west-bank',
		mode: 'deferred-to-disposition',
		reason: 'The coast approach blocker extends outside the V2 Tidewatch authoring envelope.'
	},
	{
		sourceKey: 'blocker:coast-crossroads-mouth-bank',
		mode: 'deferred-to-disposition',
		reason: 'The coast mouth blocker sits outside the V2 Tidewatch and connector envelopes.'
	},
	{
		sourceKey: 'blocker:coast-sea-wall',
		mode: 'deferred-to-disposition',
		reason: 'The coast sea wall remains outside the V2 Tidewatch authoring envelope.'
	},
	{
		sourceKey: 'blocker:silver-shrine-gate-block',
		mode: 'deferred-to-disposition',
		reason: 'The upper Silverpine gate blocker extends beyond the V2 biome envelopes.'
	},
	{
		sourceKey: 'blocker:wildwood-north-climb-east-bank',
		mode: 'deferred-to-disposition',
		reason: 'The eastern Wildwood climb bank exceeds the V2 Wildwood right edge.'
	},
	{
		sourceKey: 'combat-bounds:whispering-cave-combat-pocket',
		mode: 'deferred-to-disposition',
		reason: 'The Whispering Cave combat pocket remains live outside the V2 art envelope.'
	},
	{
		sourceKey: 'decor:coast-foam',
		mode: 'deferred-to-disposition',
		reason: 'The coast foam spans the V2 Tidewatch left boundary and remains live.'
	},
	{
		sourceKey: 'decor:coast-jetty',
		mode: 'deferred-to-disposition',
		reason: 'The coast jetty reaches beyond the V2 Tidewatch lower boundary.'
	},
	{
		sourceKey: 'decor:coast-shrine-pocket-boundary',
		mode: 'deferred-to-disposition',
		reason: 'The coast shrine pocket crosses outside the V2 Tidewatch left edge.'
	},
	{
		sourceKey: 'decor:coast-torii',
		mode: 'deferred-to-disposition',
		reason: 'The coast torii reaches below the V2 Tidewatch envelope.'
	},
	{
		sourceKey: 'decor:mistfen-fog',
		mode: 'deferred-to-disposition',
		reason: 'The fog veil extends west of the V2 Mistfen envelope.'
	},
	{
		sourceKey: 'decor:silver-shrine-gate-sprite',
		mode: 'deferred-to-disposition',
		reason: 'The upper Silverpine gate sprite extends above the V2 envelopes.'
	},
	{
		sourceKey: 'decor:wildwood-east-canopy',
		mode: 'deferred-to-disposition',
		reason: 'The eastern Wildwood canopy exceeds the V2 Wildwood right edge.'
	},
	{
		sourceKey: 'ground-patch:coast-sand',
		mode: 'deferred-to-disposition',
		reason: 'The coast sand extends west of the V2 Tidewatch envelope.'
	},
	{
		sourceKey: 'ground-patch:coast-sea',
		mode: 'deferred-to-disposition',
		reason: 'The coast sea extends west of the V2 Tidewatch envelope.'
	},
	{
		sourceKey: 'ground-patch:mistfen-basin',
		mode: 'deferred-to-disposition',
		reason: 'The Mistfen basin extends west of the V2 Mistfen envelope.'
	},
	{
		sourceKey: 'ground-patch:silverpine-shrine-terrace',
		mode: 'deferred-to-disposition',
		reason: 'The Silverpine shrine terrace extends above the V2 Silverpine envelope.'
	},
	{
		sourceKey: 'ground-patch:sundrop-forest-road-east',
		mode: 'deferred-to-disposition',
		reason: 'The forest road crosses a V2 gap between Sundrop Village and Tidewatch.'
	},
	{
		sourceKey: 'ground-patch:sundrop-southwest-ocean-patch',
		mode: 'deferred-to-disposition',
		reason: 'Inline ocean pixels await the reviewed base-underlay or fallback-only disposition.'
	},
	{
		sourceKey: 'ground-patch:whispering-cave-combat-pocket',
		mode: 'deferred-to-disposition',
		reason: 'The Whispering Cave combat pocket remains live outside the V2 art envelope.'
	},
	{
		sourceKey: 'landmark:silver-shrine-gate',
		mode: 'deferred-to-disposition',
		reason: 'The Silverpine shrine gate extends above the V2 Silverpine envelope.'
	},
	{ sourceKey: 'blocker:meadow-east-boundary', mode: 'contained' },
	{ sourceKey: 'blocker:meadow-north-boundary', mode: 'contained' },
	{ sourceKey: 'blocker:meadow-south-boundary', mode: 'contained' },
	{ sourceKey: 'blocker:meadow-west-boundary', mode: 'contained' },
	{
		sourceKey: 'blocker:sundrop-southwest-ocean',
		mode: 'deferred-to-disposition',
		reason: 'Inline ocean collision awaits the reviewed base-underlay or fallback-only disposition.'
	}
];

function assertRegionBounds(region: MeadowEntryAuthoringRegion): void {
	if (!containsBounds(MEADOW_ENTRY_WORLD_BOUNDS, region.reviewBounds)) {
		throw new Error(
			`Authoring region "${region.id}" review bounds must remain inside meadow-entry`
		);
	}
	const alignmentPx = region.id.startsWith('connector-')
		? MEADOW_ENTRY_TILE_SIZE_PX / 2
		: MEADOW_ENTRY_TILE_SIZE_PX;
	for (const edge of Object.values(region.reviewBounds)) {
		if (edge % alignmentPx !== 0) {
			throw new Error(
				`Authoring region "${region.id}" review bounds must be ${alignmentPx}px aligned`
			);
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
		const exactOwner = EXACT_PATH_OWNERS[sourceKey as keyof typeof EXACT_PATH_OWNERS];
		const expectedFragmentOwner =
			exactOwner ??
			(record.fragmentId === 'paths'
				? undefined
				: DEFAULT_FRAGMENT_OWNERS[record.fragmentId as keyof typeof DEFAULT_FRAGMENT_OWNERS]);
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
		const exactOwner = EXACT_PATH_OWNERS[sourceKey as keyof typeof EXACT_PATH_OWNERS];
		if (exactOwner !== undefined && primarySourceOwners[sourceKey] !== exactOwner) {
			throw new Error(`Incorrect exact paths.ts authoring owner for "${sourceKey}"`);
		}
	}

	const coverageSourceKeys = new Set<string>();
	for (const [index, coverage] of crossRegionCoverage.entries()) {
		const record = catalogByKey.get(coverage.sourceKey);
		if (!record) throw new Error(`Unknown cross-region coverage source "${coverage.sourceKey}"`);
		if (coverageSourceKeys.has(coverage.sourceKey)) {
			throw new Error(`Duplicate cross-region coverage source "${coverage.sourceKey}"`);
		}
		coverageSourceKeys.add(coverage.sourceKey);
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
	const usedCoverageIndices = new Set<number>();
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
			usedCoverageIndices.add(resolution.coverageIndex);
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
			for (const bounds of resolution.bounds) {
				if (!containsBounds(sourceBounds, bounds)) {
					throw new Error(
						`Split resolution for "${resolution.sourceKey}" extends outside its source bounds`
					);
				}
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

	if (usedCoverageIndices.size !== crossRegionCoverage.length) {
		const orphanIndices = crossRegionCoverage
			.map((_, index) => index)
			.filter((index) => !usedCoverageIndices.has(index));
		throw new Error(
			`Cross-region coverage entries ${orphanIndices.join(', ')} are not referenced by any cross-region resolution`
		);
	}

	const detected = detectedOutlierKeys(catalog, regions, primarySourceOwners);
	if (detected.length !== resolutions.size || detected.some((key) => !resolutions.has(key))) {
		throw new Error(
			`Outlier resolution set does not match detected sources: detected=${detected.length}, resolved=${resolutions.size}`
		);
	}
}

validateMeadowEntryAuthoringLayout();
