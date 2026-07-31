import { describe, expect, it } from 'vitest';
import { containsBounds, rasterizeCoverageBounds } from './meadow-entry-authoring-geometry';
import {
	MEADOW_ENTRY_AUTHORING_REGIONS,
	MEADOW_ENTRY_OUTLIER_RESOLUTIONS,
	MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS,
	validateMeadowEntryAuthoringLayout,
	type MeadowEntryAuthoringRegionId
} from './meadow-entry-authoring-layout';
import {
	collectMeadowEntrySourceCatalog,
	meadowEntrySourceKey
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

		expect(new Set(resolutionKeys)).toHaveLength(resolutionKeys.length);
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
