import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX } from './sundrop-village-backgrounds';
import { SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP } from './sundrop-village-obstacle-ownership';
import {
	MEADOW_ENTRY_OUTLIER_RESOLUTIONS,
	MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS
} from './meadow-entry-authoring-layout';
import {
	MEADOW_ENTRY_BAKE_OWNERSHIP,
	MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX,
	MEADOW_ENTRY_REVIEWED_BAKE_OWNERSHIP_SHA256,
	validateMeadowEntryBakeOwnership
} from './meadow-entry-bake-ownership';
import {
	collectMeadowEntrySourceCatalog,
	meadowEntrySourceKey
} from './meadow-entry-source-catalog';

function ownershipByKey() {
	return new Map(
		MEADOW_ENTRY_BAKE_OWNERSHIP.map((entry) => [meadowEntrySourceKey(entry.ref), entry])
	);
}

describe('meadow-entry bake ownership', () => {
	it('classifies every catalog source exactly once in stable source-key order', () => {
		const catalogKeys = collectMeadowEntrySourceCatalog().map(({ ref }) =>
			meadowEntrySourceKey(ref)
		);
		const ownershipKeys = MEADOW_ENTRY_BAKE_OWNERSHIP.map(({ ref }) => meadowEntrySourceKey(ref));

		expect(catalogKeys).toHaveLength(360);
		expect(ownershipKeys).toHaveLength(catalogKeys.length);
		expect(new Set(ownershipKeys)).toHaveLength(ownershipKeys.length);
		expect(ownershipKeys).toEqual(catalogKeys);
		for (const entry of MEADOW_ENTRY_BAKE_OWNERSHIP) {
			expect(entry.primaryRegionId, meadowEntrySourceKey(entry.ref)).toBe(
				MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS[meadowEntrySourceKey(entry.ref)]
			);
		}
		expect(validateMeadowEntryBakeOwnership).not.toThrow();
	});

	it('locks the reviewed disposition and HPA-406 obligation registry', () => {
		const dispositionCounts = MEADOW_ENTRY_BAKE_OWNERSHIP.reduce<Record<string, number>>(
			(counts, entry) => ({
				...counts,
				[entry.disposition.mode]: (counts[entry.disposition.mode] ?? 0) + 1
			}),
			{}
		);
		const runtimeCounts = MEADOW_ENTRY_BAKE_OWNERSHIP.reduce<Record<string, number>>(
			(counts, entry) => ({
				...counts,
				[entry.runtimeRequirement]: (counts[entry.runtimeRequirement] ?? 0) + 1
			}),
			{}
		);
		const canonicalRegistry = MEADOW_ENTRY_BAKE_OWNERSHIP.map(
			(entry) =>
				`${meadowEntrySourceKey(entry.ref)}=${entry.primaryRegionId}|${JSON.stringify(entry.disposition)}|${entry.runtimeRequirement}\n`
		).join('');

		expect(dispositionCounts).toEqual({
			'base-and-foreground': 85,
			'base-static': 65,
			'base-underlay': 117,
			'control-only': 17,
			'protected-live': 74,
			'runtime-fallback-only': 2
		});
		expect(runtimeCounts).toEqual({
			'existing-blocker-fallback': 75,
			'extend-decor-fallback': 69,
			'extend-fence-fallback': 6,
			'fallback-tile': 119,
			none: 17,
			'remain-live': 74
		});
		expect(MEADOW_ENTRY_REVIEWED_BAKE_OWNERSHIP_SHA256).toBe(
			'4effa2e819e7550d1914311a138d3d4c252d230136282d91c4d281d067423a63'
		);
		expect(createHash('sha256').update(canonicalRegistry).digest('hex')).toBe(
			MEADOW_ENTRY_REVIEWED_BAKE_OWNERSHIP_SHA256
		);
	});

	it('shares the reviewed HPA-398 33px front cutoff and exact blocker facts', () => {
		expect(MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX).toBe(33);
		expect(MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX).toBe(
			SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX
		);

		const byKey = ownershipByKey();
		for (const predecessor of SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP) {
			const entry = byKey.get(`blocker:${predecessor.blockerId}`);
			expect(entry?.runtimeRequirement, predecessor.blockerId).toBe('existing-blocker-fallback');
			if (predecessor.foregroundMargins) {
				expect(entry?.disposition, predecessor.blockerId).toEqual({
					mode: 'base-and-foreground',
					baseMargins: predecessor.baseMargins,
					foregroundMargins: predecessor.foregroundMargins,
					frontCutoffPx: 33,
					motif: predecessor.motif
				});
			} else {
				expect(entry?.disposition, predecessor.blockerId).toEqual({
					mode: 'base-static',
					margins: predecessor.baseMargins,
					motif: predecessor.motif
				});
			}
		}
	});

	it('records every HPA-406 fallback obligation at the source that creates it', () => {
		for (const entry of MEADOW_ENTRY_BAKE_OWNERSHIP) {
			const key = meadowEntrySourceKey(entry.ref);
			const baked =
				entry.disposition.mode === 'base-static' ||
				entry.disposition.mode === 'base-and-foreground';
			if (entry.ref.sourceType === 'decor' && baked) {
				expect(entry.runtimeRequirement, key).toBe('extend-decor-fallback');
			}
			if (entry.ref.sourceType === 'fence' && baked) {
				expect(entry.runtimeRequirement, key).toBe('extend-fence-fallback');
			}
			if (entry.ref.sourceType === 'blocker' && baked) {
				expect(entry.runtimeRequirement, key).toBe('existing-blocker-fallback');
			}
			if (entry.disposition.mode === 'protected-live') {
				expect(entry.runtimeRequirement, key).toBe('remain-live');
			}
			if (entry.disposition.mode === 'control-only') {
				expect(entry.runtimeRequirement, key).toBe('none');
			}
		}
	});

	it('makes every ground patch an explicit baked underlay or tile fallback', () => {
		const groundPatches = MEADOW_ENTRY_BAKE_OWNERSHIP.filter(
			({ ref }) => ref.sourceType === 'ground-patch'
		);

		expect(groundPatches).toHaveLength(118);
		for (const entry of groundPatches) {
			expect(['base-underlay', 'runtime-fallback-only'], meadowEntrySourceKey(entry.ref)).toContain(
				entry.disposition.mode
			);
			expect(entry.runtimeRequirement, meadowEntrySourceKey(entry.ref)).toBe('fallback-tile');
		}
	});

	it('resolves both deferred southwest-ocean records deliberately', () => {
		const byKey = ownershipByKey();
		const deferredKeys = MEADOW_ENTRY_OUTLIER_RESOLUTIONS.filter(
			({ mode }) => mode === 'deferred-to-disposition'
		).map(({ sourceKey }) => sourceKey);

		expect(deferredKeys).toEqual([
			'blocker:sundrop-southwest-ocean',
			'ground-patch:sundrop-southwest-ocean-patch'
		]);
		expect(byKey.get('blocker:sundrop-southwest-ocean')).toMatchObject({
			disposition: { mode: 'runtime-fallback-only' },
			runtimeRequirement: 'fallback-tile'
		});
		expect(byKey.get('ground-patch:sundrop-southwest-ocean-patch')).toMatchObject({
			disposition: { mode: 'runtime-fallback-only' },
			runtimeRequirement: 'fallback-tile'
		});
	});

	it('keeps every translucent Mistfen fog source protected and live', () => {
		const byKey = ownershipByKey();
		const fogKeys = [
			'decor:mistfen-fog',
			'decor:mistfen-fog-entry',
			'decor:mistfen-fog-gate',
			'decor:mistfen-fog-middle',
			'decor:mistfen-gate-fog-wall'
		];

		for (const key of fogKeys) {
			expect(byKey.get(key), key).toMatchObject({
				disposition: { mode: 'protected-live' },
				runtimeRequirement: 'remain-live'
			});
		}
	});

	it('keeps semantic controls non-baked and stateful world objects live', () => {
		for (const entry of MEADOW_ENTRY_BAKE_OWNERSHIP) {
			const key = meadowEntrySourceKey(entry.ref);
			if (['encounter', 'combat-bounds', 'discovery'].includes(entry.ref.sourceType)) {
				expect(entry.disposition.mode, key).toBe('control-only');
			}
			if (
				['landmark', 'transition', 'npc', 'ambient-npc', 'pickup'].includes(entry.ref.sourceType)
			) {
				expect(entry.disposition.mode, key).toBe('protected-live');
			}
		}
	});
});
