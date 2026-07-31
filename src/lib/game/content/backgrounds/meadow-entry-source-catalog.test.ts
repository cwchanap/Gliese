import { describe, expect, it } from 'vitest';
import {
	collectMeadowEntrySourceCatalog,
	meadowEntrySourceKey,
	resolveMeadowEntrySource
} from './meadow-entry-source-catalog';

describe('meadow-entry source catalog', () => {
	it('uses kind-qualified keys for every source record', () => {
		const catalog = collectMeadowEntrySourceCatalog();
		const keys = catalog.map((record) => meadowEntrySourceKey(record.ref));

		expect(new Set(keys)).toHaveLength(catalog.length);
		expect(meadowEntrySourceKey({ sourceType: 'ground-patch', sourceId: 'shared-source-id' })).toBe(
			'ground-patch:shared-source-id'
		);
		expect(meadowEntrySourceKey({ sourceType: 'blocker', sourceId: 'shared-source-id' })).toBe(
			'blocker:shared-source-id'
		);
	});

	it('keeps the southwest ocean patch in the inline outer-boundary fragment', () => {
		expect(
			resolveMeadowEntrySource({
				sourceType: 'ground-patch',
				sourceId: 'sundrop-southwest-ocean-patch'
			})
		).toMatchObject({
			fragmentId: 'outer-boundary',
			bounds: { left: 64, top: 6_286, right: 164, bottom: 6_336 }
		});
	});

	it('keeps the east map boundary in the inline outer-boundary fragment', () => {
		expect(
			resolveMeadowEntrySource({ sourceType: 'blocker', sourceId: 'meadow-east-boundary' })
		).toMatchObject({
			fragmentId: 'outer-boundary',
			bounds: { left: 6_336, top: 0, right: 6_400, bottom: 6_400 }
		});
	});

	it('retains wildwood provenance for the cross-region forest road', () => {
		expect(
			resolveMeadowEntrySource({
				sourceType: 'ground-patch',
				sourceId: 'sundrop-forest-road-east'
			})
		).toMatchObject({ fragmentId: 'wildwood' });
	});
});
