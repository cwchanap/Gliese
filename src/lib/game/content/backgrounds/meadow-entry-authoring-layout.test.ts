import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { containsBounds, rasterizeCoverageBounds } from './meadow-entry-authoring-geometry';
import {
	MEADOW_ENTRY_AUTHORING_REGIONS,
	MEADOW_ENTRY_CROSS_REGION_COVERAGE,
	MEADOW_ENTRY_OUTLIER_RESOLUTIONS,
	MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS,
	MEADOW_ENTRY_REVIEWED_AUTHORING_REGIONS_SHA256,
	MEADOW_ENTRY_REVIEWED_PRIMARY_SOURCE_OWNERS_SHA256,
	primaryOwnerFor,
	validateMeadowEntryAuthoringLayout,
	type MeadowEntryAuthoringRegion,
	type MeadowEntryAuthoringRegionId,
	type MeadowEntryAuthoringLayoutValidationOptions,
	type MeadowEntryCrossRegionCoverage
} from './meadow-entry-authoring-layout';
import {
	collectMeadowEntrySourceCatalog,
	meadowEntrySourceKey,
	type MeadowEntrySourceRecord
} from './meadow-entry-source-catalog';
import {
	MEADOW_ENTRY_V2_REGION_ENVELOPES,
	MEADOW_ENTRY_V2_ROUTE_PATCHES,
	MEADOW_ENTRY_V2_WORLD
} from '$lib/game/content/maps/layouts/meadow-entry-v2';

const expectedPathOwners = {
	'ground-patch:crossroads-south-approach': 'connector-village-crossroads',
	'decor:village-corridor-waymarker': 'connector-village-crossroads',
	'ground-patch:crossroads-to-coast': 'connector-crossroads-coast',
	'ground-patch:crossroads-to-mistfen': 'connector-crossroads-mistfen',
	'ground-patch:crossroads-to-silverpine': 'connector-crossroads-silverpine',
	'ground-patch:crossroads-to-wildwood': 'connector-crossroads-wildwood',
	'ground-patch:silverpine-south-approach': 'connector-crossroads-silverpine',
	'ground-patch:village-river-crossing': 'connector-village-crossroads',
	'ground-patch:village-west-main-street': 'sundrop-village'
} as const satisfies Readonly<Record<string, MeadowEntryAuthoringRegionId>>;

const expectedDestinationSeamOwners = {
	'ground-patch:mistfen-west-approach': 'connector-crossroads-mistfen',
	'ground-patch:silverpine-north-approach': 'connector-crossroads-silverpine',
	'ground-patch:wildwood-mouth': 'connector-crossroads-wildwood'
} as const satisfies Readonly<Record<string, MeadowEntryAuthoringRegionId>>;

const defaultFragmentOwners = {
	village: 'sundrop-village',
	crossroads: 'crossroads',
	coast: 'tidewatch-coast',
	mistfen: 'mistfen',
	silverpine: 'silverpine',
	wildwood: 'wildwood',
	'river-system': 'outer-boundary',
	'outer-boundary': 'outer-boundary'
} as const satisfies Readonly<Record<string, MeadowEntryAuthoringRegionId>>;

function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function replaceRegion(region: MeadowEntryAuthoringRegion): readonly MeadowEntryAuthoringRegion[] {
	return MEADOW_ENTRY_AUTHORING_REGIONS.map((candidate) =>
		candidate.id === region.id ? region : candidate
	);
}

const expectedV2PrincipalBounds = {
	mistfen: { left: 384, top: 384, right: 3_200, bottom: 4_096 },
	silverpine: { left: 2_432, top: 384, right: 4_480, bottom: 2_816 },
	crossroads: { left: 2_880, top: 2_816, right: 4_608, bottom: 4_768 },
	wildwood: { left: 4_320, top: 256, right: 6_144, bottom: 5_568 },
	'tidewatch-coast': { left: 3_328, top: 4_768, right: 6_144, bottom: 6_144 },
	'sundrop-village': { left: 256, top: 3_968, right: 2_816, bottom: 6_144 }
} as const satisfies Readonly<
	Record<string, { left: number; top: number; right: number; bottom: number }>
>;

const expectedV2ConnectorBounds = {
	'connector-village-crossroads': { left: 2_368, top: 4_384, right: 3_872, bottom: 4_864 },
	'connector-crossroads-coast': { left: 4_000, top: 4_640, right: 4_448, bottom: 5_696 },
	'connector-crossroads-mistfen': { left: 2_112, top: 3_424, right: 4_032, bottom: 3_872 },
	'connector-crossroads-silverpine': { left: 2_688, top: 2_048, right: 4_128, bottom: 2_944 },
	'connector-crossroads-wildwood': { left: 4_416, top: 3_648, right: 5_216, bottom: 4_288 }
} as const satisfies Readonly<
	Record<string, { left: number; top: number; right: number; bottom: number }>
>;

const connectorPatchIds = {
	'connector-village-crossroads': ['village-river-crossing'],
	'connector-crossroads-coast': ['crossroads-to-coast'],
	'connector-crossroads-mistfen': ['crossroads-to-mistfen', 'mistfen-west-approach'],
	'connector-crossroads-silverpine': [
		'crossroads-to-silverpine',
		'silverpine-south-approach',
		'silverpine-north-approach'
	],
	'connector-crossroads-wildwood': ['crossroads-to-wildwood', 'wildwood-mouth']
} as const satisfies Readonly<Record<keyof typeof expectedV2ConnectorBounds, readonly string[]>>;

function boundsFromV2Rect(rect: { x: number; y: number; width: number; height: number }) {
	return { left: rect.x, top: rect.y, right: rect.x + rect.width, bottom: rect.y + rect.height };
}

function expandedPatchEnvelope(patchIds: readonly string[]) {
	const patches = MEADOW_ENTRY_V2_ROUTE_PATCHES.filter(({ id }) => patchIds.includes(id));
	const envelope = {
		left: Math.min(...patches.map(({ rect }) => rect.x)),
		top: Math.min(...patches.map(({ rect }) => rect.y)),
		right: Math.max(...patches.map(({ rect }) => rect.x + rect.width)),
		bottom: Math.max(...patches.map(({ rect }) => rect.y + rect.height))
	};
	return {
		left: Math.max(MEADOW_ENTRY_V2_WORLD.x, envelope.left - 128),
		top: Math.max(MEADOW_ENTRY_V2_WORLD.y, envelope.top - 128),
		right: Math.min(MEADOW_ENTRY_V2_WORLD.x + MEADOW_ENTRY_V2_WORLD.width, envelope.right + 128),
		bottom: Math.min(MEADOW_ENTRY_V2_WORLD.y + MEADOW_ENTRY_V2_WORLD.height, envelope.bottom + 128)
	};
}

describe('meadow-entry authoring layout', () => {
	it('uses the exact V2 principal envelopes and connector handoff bounds', () => {
		const principalBounds = Object.fromEntries(
			Object.entries(MEADOW_ENTRY_V2_REGION_ENVELOPES).map(([id, rect]) => [
				id === 'tidewatchCoast'
					? 'tidewatch-coast'
					: id === 'sundropVillage'
						? 'sundrop-village'
						: id,
				boundsFromV2Rect(rect)
			])
		);
		for (const [regionId, expectedBounds] of Object.entries(expectedV2PrincipalBounds)) {
			expect(principalBounds[regionId], regionId).toEqual(expectedBounds);
			expect(
				MEADOW_ENTRY_AUTHORING_REGIONS.find(({ id }) => id === regionId)?.reviewBounds,
				regionId
			).toEqual(expectedBounds);
		}

		for (const connectorId of Object.keys(expectedV2ConnectorBounds) as Array<
			keyof typeof expectedV2ConnectorBounds
		>) {
			const patchIds = connectorPatchIds[connectorId];
			const region = MEADOW_ENTRY_AUTHORING_REGIONS.find(({ id }) => id === connectorId);
			expect(region?.reviewBounds, connectorId).toEqual(expectedV2ConnectorBounds[connectorId]);
			expect(region?.reviewBounds, connectorId).toEqual(expandedPatchEnvelope(patchIds));
			for (const patch of MEADOW_ENTRY_V2_ROUTE_PATCHES.filter(({ id }) =>
				(patchIds as readonly string[]).includes(id)
			)) {
				expect(containsBounds(region!.reviewBounds, boundsFromV2Rect(patch.rect)), patch.id).toBe(
					true
				);
			}
		}
	});

	it('assigns exactly one primary authoring owner to every catalog source', () => {
		const catalogKeys = collectMeadowEntrySourceCatalog().map(({ ref }) =>
			meadowEntrySourceKey(ref)
		);
		const ownerKeys = Object.keys(MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS);

		expect(ownerKeys).toHaveLength(catalogKeys.length);
		expect([...ownerKeys].sort()).toEqual([...catalogKeys].sort());
		expect(validateMeadowEntryAuthoringLayout).not.toThrow();
	});

	it('keeps every paths.ts source on its exact reviewed connector owner', () => {
		const pathKeys = collectMeadowEntrySourceCatalog()
			.filter(({ fragmentId }) => fragmentId === 'paths')
			.map(({ ref }) => meadowEntrySourceKey(ref));

		expect([...pathKeys].sort()).toEqual(Object.keys(expectedPathOwners).sort());
		for (const [sourceKey, expectedOwner] of Object.entries(expectedPathOwners)) {
			expect(MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS[sourceKey], sourceKey).toBe(expectedOwner);
		}
	});

	it('keeps destination-authored V2 seams on their exact connector owners', () => {
		for (const [sourceKey, expectedOwner] of Object.entries(expectedDestinationSeamOwners)) {
			expect(MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS[sourceKey], sourceKey).toBe(expectedOwner);
		}
	});

	it('rejects any drift from the independently reviewed primary-owner snapshot', () => {
		const canonicalOwners = Object.entries(MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS)
			.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
			.map(([sourceKey, owner]) => `${sourceKey}=${owner}\n`)
			.join('');

		expect(MEADOW_ENTRY_REVIEWED_PRIMARY_SOURCE_OWNERS_SHA256).toBe(
			'50362deec5a856596a04e97a9b12db0210b72a05de472f0172532aa1c19f30a8'
		);
		expect(sha256(canonicalOwners)).toBe(MEADOW_ENTRY_REVIEWED_PRIMARY_SOURCE_OWNERS_SHA256);
	});

	it('locks the exact ordered region metadata to its independent reviewed snapshot', () => {
		expect(MEADOW_ENTRY_REVIEWED_AUTHORING_REGIONS_SHA256).toBe(
			'd8cd46ec202554dd65b86e29b3fcdae7668bd224f334d18f981039d8e981cd43'
		);
		expect(sha256(JSON.stringify(MEADOW_ENTRY_AUTHORING_REGIONS))).toBe(
			MEADOW_ENTRY_REVIEWED_AUTHORING_REGIONS_SHA256
		);
	});

	it('rejects self-neighbors and repeated neighbor declarations', () => {
		const crossroads = MEADOW_ENTRY_AUTHORING_REGIONS.find(({ id }) => id === 'crossroads');
		expect(crossroads).toBeDefined();
		if (!crossroads) return;

		expect(() =>
			validateMeadowEntryAuthoringLayout({
				regions: replaceRegion({
					...crossroads,
					neighbors: [...crossroads.neighbors, 'crossroads']
				})
			})
		).toThrow(/must not neighbor itself/);
		expect(() =>
			validateMeadowEntryAuthoringLayout({
				regions: replaceRegion({
					...crossroads,
					neighbors: [...crossroads.neighbors, 'connector-village-crossroads']
				})
			})
		).toThrow(/duplicate neighbor "connector-village-crossroads"/);
	});

	it('rejects every declared neighbor handoff below 128 shared pixels', () => {
		const connector = MEADOW_ENTRY_AUTHORING_REGIONS.find(
			({ id }) => id === 'connector-crossroads-coast'
		);
		expect(connector).toBeDefined();
		if (!connector) return;

		expect(() =>
			validateMeadowEntryAuthoringLayout({
				regions: replaceRegion({
					...connector,
					reviewBounds: { left: 4_192, top: 4_512, right: 4_256, bottom: 4_576 }
				})
			})
		).toThrow(/handoff must share at least 128px/);
	});

	it('records exactly one typed resolution for every detected spatial outlier', () => {
		const regions = new Map(
			MEADOW_ENTRY_AUTHORING_REGIONS.map((region) => [region.id, region.reviewBounds])
		);
		const detectedOutlierKeys = collectMeadowEntrySourceCatalog().flatMap((record) => {
			const sourceKey = meadowEntrySourceKey(record.ref);
			const owner = MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS[sourceKey];
			const reviewBounds = owner === undefined ? undefined : regions.get(owner);
			const hasExactConnectorOwner = Object.hasOwn(expectedDestinationSeamOwners, sourceKey);
			const hasReownedFragment =
				!hasExactConnectorOwner &&
				record.fragmentId !== 'paths' &&
				owner !== defaultFragmentOwners[record.fragmentId as keyof typeof defaultFragmentOwners];
			const isOutsidePrimary =
				record.bounds !== null &&
				reviewBounds !== undefined &&
				!containsBounds(reviewBounds, rasterizeCoverageBounds(record.bounds));
			return record.fragmentId === 'outer-boundary' || hasReownedFragment || isOutsidePrimary
				? [sourceKey]
				: [];
		});
		const resolutionKeys = MEADOW_ENTRY_OUTLIER_RESOLUTIONS.map(({ sourceKey }) => sourceKey);

		expect(new Set(resolutionKeys).size).toEqual(resolutionKeys.length);
		expect([...resolutionKeys].sort()).toEqual([...detectedOutlierKeys].sort());
	});

	it('names the mandatory forest-road and southwest-ocean decisions', () => {
		expect(
			MEADOW_ENTRY_OUTLIER_RESOLUTIONS.find(
				({ sourceKey }) => sourceKey === 'ground-patch:sundrop-forest-road-east'
			)
		).toMatchObject({
			sourceKey: 'ground-patch:sundrop-forest-road-east',
			mode: 'deferred-to-disposition'
		});
		expect(
			MEADOW_ENTRY_OUTLIER_RESOLUTIONS.find(
				({ sourceKey }) => sourceKey === 'ground-patch:sundrop-forest-road-east'
			)
		).toHaveProperty('reason');
		const southwestOcean = MEADOW_ENTRY_OUTLIER_RESOLUTIONS.find(
			({ sourceKey }) => sourceKey === 'ground-patch:sundrop-southwest-ocean-patch'
		);
		expect(southwestOcean).toMatchObject({
			sourceKey: 'ground-patch:sundrop-southwest-ocean-patch',
			mode: 'deferred-to-disposition'
		});
		expect(southwestOcean).toHaveProperty('reason');
	});
});

describe('validateMeadowEntryAuthoringLayout error paths', () => {
	const baseOptions: MeadowEntryAuthoringLayoutValidationOptions = {};

	function options(
		overrides: Partial<MeadowEntryAuthoringLayoutValidationOptions>
	): MeadowEntryAuthoringLayoutValidationOptions {
		return { ...baseOptions, ...overrides };
	}

	it('rejects a region whose review bounds extend outside meadow-entry', () => {
		const crossroads = MEADOW_ENTRY_AUTHORING_REGIONS.find(({ id }) => id === 'crossroads');
		expect(crossroads).toBeDefined();
		if (!crossroads) return;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					regions: replaceRegion({
						...crossroads,
						reviewBounds: { left: -128, top: 2_624, right: 4_256, bottom: 4_576 }
					})
				})
			)
		).toThrow(/within the meadow-entry world/);
	});

	it('rejects a region whose review bounds are not 32px aligned', () => {
		const crossroads = MEADOW_ENTRY_AUTHORING_REGIONS.find(({ id }) => id === 'crossroads');
		expect(crossroads).toBeDefined();
		if (!crossroads) return;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					regions: replaceRegion({
						...crossroads,
						reviewBounds: { left: 2_913, top: 2_624, right: 4_256, bottom: 4_576 }
					})
				})
			)
		).toThrow(/review bounds must be 32px aligned/);
	});

	it('rejects duplicate authoring region ids', () => {
		const crossroads = MEADOW_ENTRY_AUTHORING_REGIONS.find(({ id }) => id === 'crossroads');
		expect(crossroads).toBeDefined();
		if (!crossroads) return;
		expect(() =>
			validateMeadowEntryAuthoringLayout({
				regions: [...MEADOW_ENTRY_AUTHORING_REGIONS, { ...crossroads }]
			})
		).toThrow(/Duplicate authoring region "crossroads"/);
	});

	it('rejects an unknown neighbor on an authoring region', () => {
		const crossroads = MEADOW_ENTRY_AUTHORING_REGIONS.find(({ id }) => id === 'crossroads');
		expect(crossroads).toBeDefined();
		if (!crossroads) return;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					regions: replaceRegion({
						...crossroads,
						neighbors: [...crossroads.neighbors, 'nonexistent' as MeadowEntryAuthoringRegionId]
					})
				})
			)
		).toThrow(/Unknown neighbor "nonexistent"/);
	});

	it('rejects an asymmetric neighbor relation', () => {
		const crossroads = MEADOW_ENTRY_AUTHORING_REGIONS.find(({ id }) => id === 'crossroads');
		expect(crossroads).toBeDefined();
		if (!crossroads) return;
		const tidewatch = MEADOW_ENTRY_AUTHORING_REGIONS.find(({ id }) => id === 'tidewatch-coast');
		expect(tidewatch).toBeDefined();
		if (!tidewatch) return;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					regions: MEADOW_ENTRY_AUTHORING_REGIONS.map((region) =>
						region.id === 'tidewatch-coast'
							? { ...tidewatch, neighbors: [...tidewatch.neighbors, 'crossroads'] }
							: region
					)
				})
			)
		).toThrow(/neighbor relation must be symmetric/);
	});

	it('rejects a primary owner count that does not match the source count', () => {
		const owners = { ...MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS };
		const firstKey = Object.keys(owners)[0]!;
		delete owners[firstKey];
		expect(() =>
			validateMeadowEntryAuthoringLayout(options({ primarySourceOwners: owners }))
		).toThrow(/Primary owner count .* does not match source count/);
	});

	it('rejects an unknown primary owner source key', () => {
		const owners = { ...MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS };
		const firstKey = Object.keys(owners)[0]!;
		delete owners[firstKey];
		owners['ground-patch:nonexistent'] = 'crossroads';
		expect(() =>
			validateMeadowEntryAuthoringLayout(options({ primarySourceOwners: owners }))
		).toThrow(/Unknown primary owner source "ground-patch:nonexistent"/);
	});

	it('rejects a primary owner that points to an unknown region', () => {
		const owners = { ...MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS };
		const firstKey = Object.keys(owners).find((key) => {
			const record = collectMeadowEntrySourceCatalog().find(
				(r) => meadowEntrySourceKey(r.ref) === key
			);
			return record && record.fragmentId !== 'paths';
		});
		expect(firstKey).toBeDefined();
		if (!firstKey) return;
		owners[firstKey] = 'nonexistent' as MeadowEntryAuthoringRegionId;
		expect(() =>
			validateMeadowEntryAuthoringLayout(options({ primarySourceOwners: owners }))
		).toThrow(/Unknown primary authoring owner/);
	});

	it('rejects an incorrect exact paths.ts owner', () => {
		const owners = { ...MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS };
		const pathKey = Object.keys(owners).find((key) =>
			collectMeadowEntrySourceCatalog().some(
				(record) => meadowEntrySourceKey(record.ref) === key && record.fragmentId === 'paths'
			)
		);
		expect(pathKey).toBeDefined();
		if (!pathKey) return;
		owners[pathKey] = 'mistfen' as MeadowEntryAuthoringRegionId;
		expect(() =>
			validateMeadowEntryAuthoringLayout(options({ primarySourceOwners: owners }))
		).toThrow(/Incorrect exact paths.ts authoring owner/);
	});

	it('rejects an unknown cross-region coverage source', () => {
		const coverage: MeadowEntryCrossRegionCoverage = {
			sourceKey: 'ground-patch:nonexistent',
			bounds: [{ left: 2_800, top: 5_312, right: 5_600, bottom: 5_382 }],
			secondaryRegions: ['tidewatch-coast']
		};
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({ crossRegionCoverage: [...MEADOW_ENTRY_CROSS_REGION_COVERAGE, coverage] })
			)
		).toThrow(/Unknown cross-region coverage source/);
	});

	it('rejects cross-region coverage with empty bounds or secondary regions', () => {
		const first = MEADOW_ENTRY_CROSS_REGION_COVERAGE[0]!;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					crossRegionCoverage: [
						{ sourceKey: first.sourceKey, bounds: [], secondaryRegions: ['tidewatch-coast'] },
						...MEADOW_ENTRY_CROSS_REGION_COVERAGE.slice(1)
					]
				})
			)
		).toThrow(/must declare bounds and secondary regions/);
	});

	it('rejects cross-region coverage that extends outside meadow-entry', () => {
		const first = MEADOW_ENTRY_CROSS_REGION_COVERAGE[0]!;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					crossRegionCoverage: [
						{
							sourceKey: first.sourceKey,
							bounds: [{ left: -128, top: 5_312, right: 5_600, bottom: 5_382 }],
							secondaryRegions: ['tidewatch-coast']
						},
						...MEADOW_ENTRY_CROSS_REGION_COVERAGE.slice(1)
					]
				})
			)
		).toThrow(/within the meadow-entry world/);
	});

	it('rejects cross-region coverage not contained by a secondary region', () => {
		const first = MEADOW_ENTRY_CROSS_REGION_COVERAGE[0]!;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					crossRegionCoverage: [
						{
							sourceKey: first.sourceKey,
							bounds: [{ left: 128, top: 128, right: 256, bottom: 256 }],
							secondaryRegions: ['tidewatch-coast']
						},
						...MEADOW_ENTRY_CROSS_REGION_COVERAGE.slice(1)
					]
				})
			)
		).toThrow(/not contained by a secondary region/);
	});

	it('rejects cross-region coverage that extends outside its source bounds', () => {
		const first = MEADOW_ENTRY_CROSS_REGION_COVERAGE[0]!;
		const original = first.bounds[0]!;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					crossRegionCoverage: [
						{
							sourceKey: first.sourceKey,
							bounds: [{ ...original, left: original.left - 32 }, { ...original }],
							secondaryRegions: ['silverpine']
						},
						...MEADOW_ENTRY_CROSS_REGION_COVERAGE.slice(1)
					]
				})
			)
		).toThrow(/extends outside its source bounds/);
	});

	it('rejects a secondary region that contains none of the declared bounds', () => {
		const first = MEADOW_ENTRY_CROSS_REGION_COVERAGE[0]!;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					crossRegionCoverage: [
						{
							sourceKey: first.sourceKey,
							bounds: [...first.bounds],
							secondaryRegions: ['silverpine', 'tidewatch-coast']
						},
						...MEADOW_ENTRY_CROSS_REGION_COVERAGE.slice(1)
					]
				})
			)
		).toThrow(/contains none of the declared bounds/);
	});

	it('rejects an invalid secondary region on cross-region coverage', () => {
		const first = MEADOW_ENTRY_CROSS_REGION_COVERAGE[0]!;
		const owner = MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS[first.sourceKey];
		const ownerRegion = MEADOW_ENTRY_AUTHORING_REGIONS.find(({ id }) => id === owner);
		expect(ownerRegion).toBeDefined();
		if (!ownerRegion) return;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					crossRegionCoverage: [
						{
							sourceKey: first.sourceKey,
							bounds: [
								{
									left: ownerRegion.reviewBounds.left + 128,
									top: ownerRegion.reviewBounds.top + 128,
									right: ownerRegion.reviewBounds.left + 256,
									bottom: ownerRegion.reviewBounds.top + 256
								}
							],
							secondaryRegions: [owner as MeadowEntryAuthoringRegionId]
						},
						...MEADOW_ENTRY_CROSS_REGION_COVERAGE.slice(1)
					]
				})
			)
		).toThrow(/Invalid secondary region/);
	});

	it('rejects a duplicate cross-region coverage source key', () => {
		const first = MEADOW_ENTRY_CROSS_REGION_COVERAGE[0]!;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					crossRegionCoverage: [...MEADOW_ENTRY_CROSS_REGION_COVERAGE, { ...first }]
				})
			)
		).toThrow(/Duplicate cross-region coverage source/);
	});

	it('rejects an orphan cross-region coverage entry not referenced by any resolution', () => {
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					outlierResolutions: MEADOW_ENTRY_OUTLIER_RESOLUTIONS.filter(
						(r) => !(r.mode === 'cross-region' && r.coverageIndex === 0)
					)
				})
			)
		).toThrow(/not referenced by any cross-region resolution/);
	});

	it('rejects a split resolution whose bounds extend outside its source bounds', () => {
		const firstOutlier = MEADOW_ENTRY_OUTLIER_RESOLUTIONS.find((r) => r.mode === 'cross-region');
		expect(firstOutlier).toBeDefined();
		if (!firstOutlier) return;
		const record = collectMeadowEntrySourceCatalog().find(
			(r) => meadowEntrySourceKey(r.ref) === firstOutlier.sourceKey
		);
		expect(record).toBeDefined();
		if (!record || record.bounds === null) return;
		const sourceBounds = rasterizeCoverageBounds(record.bounds);
		const expandedBounds = {
			left: sourceBounds.left - 32,
			top: sourceBounds.top,
			right: sourceBounds.right,
			bottom: sourceBounds.bottom
		};
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					outlierResolutions: MEADOW_ENTRY_OUTLIER_RESOLUTIONS.map((r) =>
						r.sourceKey === firstOutlier.sourceKey
							? {
									sourceKey: firstOutlier.sourceKey,
									mode: 'split' as const,
									bounds: [expandedBounds, { ...sourceBounds, left: sourceBounds.left + 1 }]
								}
							: r
					)
				})
			)
		).toThrow(/Split resolution.*extends outside its source bounds/);
	});

	it('rejects an unknown outlier resolution source', () => {
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					outlierResolutions: [
						...MEADOW_ENTRY_OUTLIER_RESOLUTIONS,
						{ sourceKey: 'ground-patch:nonexistent', mode: 'contained' }
					]
				})
			)
		).toThrow(/Unknown outlier resolution source/);
	});

	it('rejects a duplicate outlier resolution', () => {
		const first = MEADOW_ENTRY_OUTLIER_RESOLUTIONS[0]!;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({ outlierResolutions: [...MEADOW_ENTRY_OUTLIER_RESOLUTIONS, { ...first }] })
			)
		).toThrow(/Duplicate outlier resolution/);
	});

	it('rejects a deferred outlier resolution with an empty reason', () => {
		const deferredKey = MEADOW_ENTRY_OUTLIER_RESOLUTIONS.find(
			(r) => r.mode === 'deferred-to-disposition'
		)!.sourceKey;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					outlierResolutions: MEADOW_ENTRY_OUTLIER_RESOLUTIONS.map((r) =>
						r.sourceKey === deferredKey
							? { sourceKey: deferredKey, mode: 'deferred-to-disposition' as const, reason: '   ' }
							: r
					)
				})
			)
		).toThrow(/Deferred outlier .* must include a reason/);
	});

	it('rejects a contained outlier outside its primary region', () => {
		const contained = MEADOW_ENTRY_OUTLIER_RESOLUTIONS.find((r) => r.mode === 'contained');
		expect(contained).toBeDefined();
		if (!contained) return;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					primarySourceOwners: {
						...MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS,
						[contained.sourceKey]: 'mistfen' as MeadowEntryAuthoringRegionId
					}
				})
			)
		).toThrow(/outside its primary region/);
	});

	it('rejects a re-owned outlier with a mismatched owner', () => {
		const sourceKey = 'blocker:mistfen-entry-bank-east';
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					outlierResolutions: [
						...MEADOW_ENTRY_OUTLIER_RESOLUTIONS,
						{
							sourceKey,
							mode: 're-owned' as const,
							owner: 'crossroads' as MeadowEntryAuthoringRegionId
						}
					]
				})
			)
		).toThrow(/Invalid re-owned resolution/);
	});

	it('rejects an outlier resolution set that does not match detected sources', () => {
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({ outlierResolutions: [...MEADOW_ENTRY_OUTLIER_RESOLUTIONS].slice(0, -1) })
			)
		).toThrow(/Outlier resolution set does not match detected sources/);
	});
});

describe('primaryOwnerFor', () => {
	it('throws for a paths source without an exact path owner', () => {
		const catalog = collectMeadowEntrySourceCatalog();
		const pathsRecord = catalog.find((record) => record.fragmentId === 'paths');
		expect(pathsRecord).toBeDefined();
		if (!pathsRecord) return;
		const fakeRecord = {
			...pathsRecord,
			ref: { sourceType: 'ground-patch' as const, sourceId: 'nonexistent-paths-source' },
			fragmentId: 'paths' as const
		};
		expect(() => primaryOwnerFor(fakeRecord)).toThrow(/Missing exact paths.ts authoring owner/);
	});

	it('throws for a fragment without a default owner', () => {
		const catalog = collectMeadowEntrySourceCatalog();
		const record = catalog[0]!;
		const fakeRecord = {
			...record,
			ref: { sourceType: 'ground-patch' as const, sourceId: 'nonexistent-fragment-source' },
			fragmentId: 'unknown-fragment' as MeadowEntrySourceRecord['fragmentId']
		};
		expect(() => primaryOwnerFor(fakeRecord)).toThrow(/Missing fragment authoring owner/);
	});
});
