import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
	containsBounds,
	intersectBounds,
	rasterizeCoverageBounds,
	type PixelBounds
} from '$lib/game/content/backgrounds/meadow-entry-authoring-geometry';
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

const OUTPUT_DIRECTORY = resolve(
	import.meta.dir,
	'../docs/superpowers/reports/img/hpa-399/proposals'
);

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
	return {
		left: Math.min(...bounds.map(({ left }) => left)),
		top: Math.min(...bounds.map(({ top }) => top)),
		right: Math.max(...bounds.map(({ right }) => right)),
		bottom: Math.max(...bounds.map(({ bottom }) => bottom))
	};
}

function svgRect(bounds: PixelBounds, attributes: string): string {
	return `<rect x="${bounds.left}" y="${bounds.top}" width="${bounds.right - bounds.left}" height="${bounds.bottom - bounds.top}" ${attributes}/>`;
}

const catalog = collectMeadowEntrySourceCatalog();
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

const proposal = {
	format: 'meadow-entry-authoring-layout-proposal-v1',
	diagnosticOnly: true,
	worldBounds: { left: 0, top: 0, right: 6_400, bottom: 6_400 },
	sourceCount: sources.length,
	candidateRegions: CANDIDATE_REGIONS,
	mandatoryPathOwners: MANDATORY_PATH_OWNERS,
	fragmentEnvelopes,
	boundarySources,
	crossingSources,
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
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600" viewBox="0 0 6400 6400"><rect width="6400" height="6400" fill="#0f172a"/>${regionSvg}${envelopeSvg}</svg>\n`;

await mkdir(OUTPUT_DIRECTORY, { recursive: true });
await Promise.all([
	Bun.write(
		join(OUTPUT_DIRECTORY, 'meadow-entry-authoring-layout-proposal.json'),
		`${JSON.stringify(proposal)}\n`
	),
	Bun.write(join(OUTPUT_DIRECTORY, 'meadow-entry-authoring-layout-proposal.svg'), svg)
]);

console.log(
	`Wrote ${sources.length} sources, ${boundarySources.length} boundary sources, and ${crossingSources.length} crossing diagnostics to ${OUTPUT_DIRECTORY}`
);
