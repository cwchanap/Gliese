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

const expectedPathOwners = {
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

const defaultFragmentOwners = {
	village: 'sundrop-village',
	crossroads: 'crossroads',
	coast: 'tidewatch-coast',
	mistfen: 'mistfen',
	silverpine: 'silverpine',
	wildwood: 'wildwood',
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

describe('meadow-entry authoring layout', () => {
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

	it('rejects any drift from the independently reviewed primary-owner snapshot', () => {
		const canonicalOwners = Object.entries(MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS)
			.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
			.map(([sourceKey, owner]) => `${sourceKey}=${owner}\n`)
			.join('');

		expect(MEADOW_ENTRY_REVIEWED_PRIMARY_SOURCE_OWNERS_SHA256).toBe(
			'63bf03a986d2755ead9306e4124ecf0cdabb87e7bc99ef9ba447c044c1f00519'
		);
		expect(sha256(canonicalOwners)).toBe(MEADOW_ENTRY_REVIEWED_PRIMARY_SOURCE_OWNERS_SHA256);
	});

	it('locks the exact ordered region metadata to its independent reviewed snapshot', () => {
		expect(MEADOW_ENTRY_REVIEWED_AUTHORING_REGIONS_SHA256).toBe(
			'a8b56d60dd0de31c3db76375aeb8a66eb8eff6d422be26bacbe5396c4ba8f28c'
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
			const hasReownedFragment =
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
		).toEqual({
			sourceKey: 'ground-patch:sundrop-forest-road-east',
			mode: 'cross-region',
			coverageIndex: 0
		});
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
							bounds: [{ ...original, top: original.top - 32 }, { ...original }],
							secondaryRegions: ['tidewatch-coast']
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
							secondaryRegions: ['tidewatch-coast', 'silverpine']
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
		const firstOutlier = MEADOW_ENTRY_OUTLIER_RESOLUTIONS[0]!;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					primarySourceOwners: {
						...MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS,
						[firstOutlier.sourceKey]: 'mistfen' as MeadowEntryAuthoringRegionId
					},
					outlierResolutions: [
						...MEADOW_ENTRY_OUTLIER_RESOLUTIONS.filter(
							(r) => r.sourceKey !== firstOutlier.sourceKey
						),
						{ sourceKey: firstOutlier.sourceKey, mode: 'contained' as const }
					]
				})
			)
		).toThrow(/outside its primary region|Outlier resolution set does not match/);
	});

	it('rejects a re-owned outlier with a mismatched owner', () => {
		const reowned = MEADOW_ENTRY_OUTLIER_RESOLUTIONS.find((r) => r.mode === 're-owned');
		expect(reowned).toBeDefined();
		if (!reowned) return;
		expect(() =>
			validateMeadowEntryAuthoringLayout(
				options({
					primarySourceOwners: {
						...MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS,
						[reowned.sourceKey]: 'mistfen' as MeadowEntryAuthoringRegionId
					},
					outlierResolutions: MEADOW_ENTRY_OUTLIER_RESOLUTIONS.map((r) =>
						r.sourceKey === reowned.sourceKey
							? {
									sourceKey: reowned.sourceKey,
									mode: 're-owned' as const,
									owner: 'crossroads' as MeadowEntryAuthoringRegionId
								}
							: r
					)
				})
			)
		).toThrow(/Invalid re-owned resolution|Outlier resolution set does not match/);
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
