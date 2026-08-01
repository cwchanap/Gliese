import { describe, expect, it, vi } from 'vitest';
import {
	collectMeadowEntrySourceCatalog,
	meadowEntrySourceKey,
	resolveMeadowEntrySource,
	type MeadowEntrySourceType
} from './meadow-entry-source-catalog';

const meadowEntryModuleId = '$lib/game/content/maps/meadow-entry';

async function expectFreshCatalogToRejectMapMutation(
	mutateMap: (
		map: typeof import('$lib/game/content/maps/meadow-entry').meadowEntryMap
	) => typeof import('$lib/game/content/maps/meadow-entry').meadowEntryMap,
	expectedError: RegExp
): Promise<void> {
	vi.resetModules();
	vi.doMock(meadowEntryModuleId, async (importOriginal) => {
		const actual = await importOriginal<typeof import('$lib/game/content/maps/meadow-entry')>();
		return {
			...actual,
			meadowEntryMap: mutateMap(actual.meadowEntryMap)
		};
	});

	try {
		await expect(import('./meadow-entry-source-catalog')).rejects.toThrow(expectedError);
	} finally {
		vi.doUnmock(meadowEntryModuleId);
		vi.resetModules();
	}
}

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

	it('covers every populated source kind in stable key order', () => {
		const catalog = collectMeadowEntrySourceCatalog();
		const keys = catalog.map(({ ref }) => `${ref.sourceType}:${ref.sourceId}`);

		expect(new Set(catalog.map(({ ref }) => ref.sourceType))).toEqual(
			new Set([
				'ground-patch',
				'blocker',
				'decor',
				'fence',
				'landmark',
				'transition',
				'ambient-npc',
				'pickup',
				'encounter',
				'combat-bounds',
				'discovery'
			])
		);
		expect(keys).toEqual(
			[...keys].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
		);
	});

	it('classifies every populated source kind with its visual and bounds contract', () => {
		const expectedBySourceType = [
			{ sourceType: 'ground-patch', visualCapable: true, hasBounds: true },
			{ sourceType: 'blocker', visualCapable: true, hasBounds: true },
			{ sourceType: 'decor', visualCapable: true, hasBounds: true },
			{ sourceType: 'fence', visualCapable: true, hasBounds: true },
			{ sourceType: 'landmark', visualCapable: true, hasBounds: true },
			{ sourceType: 'transition', visualCapable: true, hasBounds: false },
			{ sourceType: 'ambient-npc', visualCapable: true, hasBounds: false },
			{ sourceType: 'pickup', visualCapable: true, hasBounds: false },
			{ sourceType: 'encounter', visualCapable: false, hasBounds: false },
			{ sourceType: 'combat-bounds', visualCapable: false, hasBounds: true },
			{ sourceType: 'discovery', visualCapable: true, hasBounds: false }
		] satisfies readonly {
			sourceType: MeadowEntrySourceType;
			visualCapable: boolean;
			hasBounds: boolean;
		}[];

		const catalog = collectMeadowEntrySourceCatalog();
		for (const expected of expectedBySourceType) {
			const records = catalog.filter(({ ref }) => ref.sourceType === expected.sourceType);
			expect(records, expected.sourceType).not.toHaveLength(0);
			expect(
				records.every(({ visualCapable }) => visualCapable === expected.visualCapable),
				expected.sourceType
			).toBe(true);
			expect(
				records.every(({ bounds }) => (bounds !== null) === expected.hasBounds),
				expected.sourceType
			).toBe(true);
		}
	});

	it('rejects both catalog omissions and map-only assembled sources', async () => {
		await expectFreshCatalogToRejectMapMutation(
			(map) => ({
				...map,
				groundPatches: (map.groundPatches ?? []).filter(({ id }) => id !== 'coast-sea')
			}),
			/cannot resolve "ground-patch:coast-sea"/
		);
		await expectFreshCatalogToRejectMapMutation(
			(map) => ({
				...map,
				groundPatches: [
					...(map.groundPatches ?? []),
					{
						id: 'catalog-parity-extra-ground-patch',
						x: 64,
						y: 64,
						width: 32,
						height: 32,
						tile: 'pathTile'
					}
				]
			}),
			/absent from source catalog "ground-patch:catalog-parity-extra-ground-patch"/
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

	it('rejects an unknown meadow-entry source ref', () => {
		expect(() =>
			resolveMeadowEntrySource({ sourceType: 'ground-patch', sourceId: 'does-not-exist' })
		).toThrow(/Unknown meadow-entry source "ground-patch:does-not-exist"/);
	});

	it('rejects a meadowEntryMap with duplicate source ids of the same kind', async () => {
		await expectFreshCatalogToRejectMapMutation(
			(map) => ({
				...map,
				pickups: [
					...(map.pickups ?? []),
					{ id: 'duplicate-pickup', x: 96, y: 96, itemId: 'potion', quantity: 1 },
					{ id: 'duplicate-pickup', x: 128, y: 128, itemId: 'potion', quantity: 1 }
				]
			}),
			/duplicate pickup source ids/
		);
	});
});
