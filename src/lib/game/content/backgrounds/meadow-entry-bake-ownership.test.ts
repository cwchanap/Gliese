import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { getBlockerRuntimeRenderMode } from '$lib/game/content/maps/blocker-rendering';
import { meadowEntryMap } from '$lib/game/content/maps/meadow-entry';

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
	validateMeadowEntryBakeOwnership,
	type MeadowEntryBakeOwnershipEntry
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
			(counts, entry) => {
				counts[entry.disposition.mode] = (counts[entry.disposition.mode] ?? 0) + 1;
				return counts;
			},
			{}
		);
		const runtimeCounts = MEADOW_ENTRY_BAKE_OWNERSHIP.reduce<Record<string, number>>(
			(counts, entry) => {
				counts[entry.runtimeRequirement] = (counts[entry.runtimeRequirement] ?? 0) + 1;
				return counts;
			},
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
			'control-only': 13,
			'protected-live': 78,
			'runtime-fallback-only': 2
		});
		expect(runtimeCounts).toEqual({
			'existing-blocker-fallback': 75,
			'extend-decor-fallback': 69,
			'extend-fence-fallback': 6,
			'fallback-tile': 119,
			none: 13,
			'remain-live': 78
		});
		expect(MEADOW_ENTRY_REVIEWED_BAKE_OWNERSHIP_SHA256).toBe(
			'54b8b40002853b93cf213c5a06f22af485f03191d4cff99bb6495e07bd8dad7c'
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
			disposition: {
				mode: 'runtime-fallback-only',
				reason: expect.stringMatching(/paired sea ground patch/i)
			},
			runtimeRequirement: 'fallback-tile'
		});
		expect(byKey.get('ground-patch:sundrop-southwest-ocean-patch')).toMatchObject({
			disposition: { mode: 'runtime-fallback-only' },
			runtimeRequirement: 'fallback-tile'
		});
	});

	it('matches the blocker renderer contract for ocean collision and live boundaries', () => {
		const blockersById = new Map(
			(meadowEntryMap.blockers ?? []).map((blocker) => [blocker.id, blocker])
		);
		const ownership = ownershipByKey();
		const oceanBlocker = blockersById.get('sundrop-southwest-ocean');
		const oceanPatch = meadowEntryMap.groundPatches?.find(
			({ id }) => id === 'sundrop-southwest-ocean-patch'
		);
		const boundaryIds = [
			'meadow-east-boundary',
			'meadow-north-boundary',
			'meadow-south-boundary',
			'meadow-west-boundary'
		];

		expect(oceanBlocker?.kind).toBe('ocean');
		expect(oceanBlocker && getBlockerRuntimeRenderMode(oceanBlocker.kind)).toBe('collision-only');
		expect(oceanPatch?.tile).toBe('seaTile');
		for (const boundaryId of boundaryIds) {
			const blocker = blockersById.get(boundaryId);
			expect(blocker?.kind, boundaryId).toBe('town-hedge');
			expect(blocker && getBlockerRuntimeRenderMode(blocker.kind), boundaryId).toBe(
				'rendered-live'
			);
			expect(ownership.get(`blocker:${boundaryId}`), boundaryId).toMatchObject({
				disposition: { mode: 'protected-live' },
				runtimeRequirement: 'remain-live'
			});
		}
	});

	it('deep-freezes every disposition inset against cross-entry mutation', () => {
		const first = MEADOW_ENTRY_BAKE_OWNERSHIP.find(
			({ ref }) => meadowEntrySourceKey(ref) === 'decor:coast-foam'
		);
		const second = MEADOW_ENTRY_BAKE_OWNERSHIP.find(
			({ ref }) => meadowEntrySourceKey(ref) === 'decor:crossroads-flowers'
		);
		expect(first?.disposition.mode).toBe('base-static');
		expect(second?.disposition.mode).toBe('base-static');
		if (first?.disposition.mode !== 'base-static' || second?.disposition.mode !== 'base-static') {
			return;
		}

		const firstMargins = first.disposition.margins as { top: number };
		const originalTop = firstMargins.top;
		let mutationError: unknown;
		try {
			firstMargins.top = originalTop + 1;
		} catch (error) {
			mutationError = error;
		} finally {
			if (!Object.isFrozen(firstMargins)) firstMargins.top = originalTop;
		}

		expect(Object.isFrozen(first.disposition.margins)).toBe(true);
		expect(mutationError).toBeInstanceOf(TypeError);
		expect(second.disposition.margins.top).toBe(originalTop);
		expect(validateMeadowEntryBakeOwnership).not.toThrow();
		for (const entry of MEADOW_ENTRY_BAKE_OWNERSHIP) {
			const disposition = entry.disposition;
			if (disposition.mode === 'base-static') {
				expect(Object.isFrozen(disposition.margins), meadowEntrySourceKey(entry.ref)).toBe(true);
			} else if (disposition.mode === 'base-and-foreground') {
				expect(Object.isFrozen(disposition.baseMargins), meadowEntrySourceKey(entry.ref)).toBe(
					true
				);
				expect(
					Object.isFrozen(disposition.foregroundMargins),
					meadowEntrySourceKey(entry.ref)
				).toBe(true);
			} else if (disposition.mode === 'protected-live') {
				expect(
					Object.isFrozen(disposition.protectionMargins),
					meadowEntrySourceKey(entry.ref)
				).toBe(true);
			}
		}
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

describe('validateMeadowEntryBakeOwnership error paths', () => {
	function cloneOwnership(): MeadowEntryBakeOwnershipEntry[] {
		return MEADOW_ENTRY_BAKE_OWNERSHIP.map((entry) => ({
			ref: { ...entry.ref },
			primaryRegionId: entry.primaryRegionId,
			disposition: { ...entry.disposition } as MeadowEntryBakeOwnershipEntry['disposition'],
			runtimeRequirement: entry.runtimeRequirement
		}));
	}

	it('rejects ownership that does not cover the source catalog', () => {
		const ownership = cloneOwnership().slice(0, -1);
		expect(() => validateMeadowEntryBakeOwnership({ ownership })).toThrow(
			/does not cover the source catalog/
		);
	});

	it('rejects bake ownership that is not sorted', () => {
		const ownership = cloneOwnership();
		// Swap two adjacent entries.
		const first = ownership[0]!;
		ownership[0] = ownership[1]!;
		ownership[1] = first;
		expect(() => validateMeadowEntryBakeOwnership({ ownership })).toThrow(/not sorted/);
	});

	it('rejects bake owner drift', () => {
		const ownership = cloneOwnership();
		ownership[0] = {
			...ownership[0]!,
			primaryRegionId: 'mistfen' as MeadowEntryBakeOwnershipEntry['primaryRegionId']
		};
		expect(() => validateMeadowEntryBakeOwnership({ ownership })).toThrow(/bake owner drift/);
	});

	it('rejects a base-underlay source with invalid ownership', () => {
		const ownership = cloneOwnership();
		const idx = ownership.findIndex((e) => e.disposition.mode === 'base-underlay');
		expect(idx).toBeGreaterThanOrEqual(0);
		ownership[idx] = {
			...ownership[idx]!,
			runtimeRequirement: 'none' as MeadowEntryBakeOwnershipEntry['runtimeRequirement']
		};
		expect(() => validateMeadowEntryBakeOwnership({ ownership })).toThrow(
			/invalid base-underlay ownership/
		);
	});

	it('rejects a runtime-fallback-only source with invalid ownership', () => {
		const ownership = cloneOwnership();
		const idx = ownership.findIndex((e) => e.disposition.mode === 'runtime-fallback-only');
		expect(idx).toBeGreaterThanOrEqual(0);
		ownership[idx] = {
			...ownership[idx]!,
			runtimeRequirement: 'none' as MeadowEntryBakeOwnershipEntry['runtimeRequirement']
		};
		expect(() => validateMeadowEntryBakeOwnership({ ownership })).toThrow(
			/invalid runtime fallback ownership/
		);
	});

	it('rejects a protected-live source with invalid runtime requirement', () => {
		const ownership = cloneOwnership();
		const idx = ownership.findIndex((e) => e.disposition.mode === 'protected-live');
		expect(idx).toBeGreaterThanOrEqual(0);
		ownership[idx] = {
			...ownership[idx]!,
			runtimeRequirement: 'none' as MeadowEntryBakeOwnershipEntry['runtimeRequirement']
		};
		expect(() => validateMeadowEntryBakeOwnership({ ownership })).toThrow(
			/protected-live source must remain live/
		);
	});

	it('rejects a control-only source with invalid runtime requirement', () => {
		const ownership = cloneOwnership();
		const idx = ownership.findIndex((e) => e.disposition.mode === 'control-only');
		expect(idx).toBeGreaterThanOrEqual(0);
		ownership[idx] = {
			...ownership[idx]!,
			runtimeRequirement: 'fallback-tile' as MeadowEntryBakeOwnershipEntry['runtimeRequirement']
		};
		expect(() => validateMeadowEntryBakeOwnership({ ownership })).toThrow(
			/control-only source must use none/
		);
	});

	it('rejects a baked source with invalid runtime requirement', () => {
		const ownership = cloneOwnership();
		const idx = ownership.findIndex(
			(e) => e.disposition.mode === 'base-static' && e.ref.sourceType === 'blocker'
		);
		expect(idx).toBeGreaterThanOrEqual(0);
		ownership[idx] = {
			...ownership[idx]!,
			runtimeRequirement: 'none' as MeadowEntryBakeOwnershipEntry['runtimeRequirement']
		};
		expect(() => validateMeadowEntryBakeOwnership({ ownership })).toThrow(
			/invalid baked runtime ownership requirement/
		);
	});

	it('rejects a base-static source with invalid margins', () => {
		const ownership = cloneOwnership();
		const idx = ownership.findIndex((e) => e.disposition.mode === 'base-static');
		expect(idx).toBeGreaterThanOrEqual(0);
		const entry = ownership[idx]!;
		if (entry.disposition.mode !== 'base-static') return;
		ownership[idx] = {
			...entry,
			disposition: {
				...entry.disposition,
				margins: { top: -1, left: 0, right: 0, bottom: 0 }
			}
		};
		expect(() => validateMeadowEntryBakeOwnership({ ownership })).toThrow(/invalid margins/);
	});

	it('rejects a base-and-foreground source with invalid front cutoff', () => {
		const ownership = cloneOwnership();
		const idx = ownership.findIndex((e) => e.disposition.mode === 'base-and-foreground');
		expect(idx).toBeGreaterThanOrEqual(0);
		const entry = ownership[idx]!;
		if (entry.disposition.mode !== 'base-and-foreground') return;
		ownership[idx] = {
			...entry,
			disposition: {
				...entry.disposition,
				frontCutoffPx: 9999
			}
		};
		expect(() => validateMeadowEntryBakeOwnership({ ownership })).toThrow(
			/invalid foreground front cutoff/
		);
	});

	it('rejects a base-and-foreground source with empty motif', () => {
		const ownership = cloneOwnership();
		const idx = ownership.findIndex((e) => e.disposition.mode === 'base-and-foreground');
		expect(idx).toBeGreaterThanOrEqual(0);
		const entry = ownership[idx]!;
		if (entry.disposition.mode !== 'base-and-foreground') return;
		ownership[idx] = {
			...entry,
			disposition: {
				...entry.disposition,
				motif: '  '
			}
		};
		expect(() => validateMeadowEntryBakeOwnership({ ownership })).toThrow(/empty motif/);
	});

	it('rejects a protected-live source with invalid protection margins', () => {
		const ownership = cloneOwnership();
		const idx = ownership.findIndex((e) => e.disposition.mode === 'protected-live');
		expect(idx).toBeGreaterThanOrEqual(0);
		const entry = ownership[idx]!;
		if (entry.disposition.mode !== 'protected-live') return;
		ownership[idx] = {
			...entry,
			disposition: {
				...entry.disposition,
				protectionMargins: { top: -1, left: 0, right: 0, bottom: 0 }
			}
		};
		expect(() => validateMeadowEntryBakeOwnership({ ownership })).toThrow(
			/invalid protectionMargins/
		);
	});

	it('rejects a protected-live source with empty reason', () => {
		const ownership = cloneOwnership();
		const idx = ownership.findIndex((e) => e.disposition.mode === 'protected-live');
		expect(idx).toBeGreaterThanOrEqual(0);
		const entry = ownership[idx]!;
		if (entry.disposition.mode !== 'protected-live') return;
		ownership[idx] = {
			...entry,
			disposition: {
				...entry.disposition,
				reason: '  '
			}
		};
		expect(() => validateMeadowEntryBakeOwnership({ ownership })).toThrow(
			/empty protection reason/
		);
	});

	it('rejects a runtime-fallback-only source with empty reason', () => {
		const ownership = cloneOwnership();
		const idx = ownership.findIndex((e) => e.disposition.mode === 'runtime-fallback-only');
		expect(idx).toBeGreaterThanOrEqual(0);
		const entry = ownership[idx]!;
		if (entry.disposition.mode !== 'runtime-fallback-only') return;
		ownership[idx] = {
			...entry,
			disposition: {
				...entry.disposition,
				reason: '  '
			}
		};
		expect(() => validateMeadowEntryBakeOwnership({ ownership })).toThrow(/empty fallback reason/);
	});

	it('rejects a control-only source with empty reason', () => {
		const ownership = cloneOwnership();
		const idx = ownership.findIndex((e) => e.disposition.mode === 'control-only');
		expect(idx).toBeGreaterThanOrEqual(0);
		const entry = ownership[idx]!;
		if (entry.disposition.mode !== 'control-only') return;
		ownership[idx] = {
			...entry,
			disposition: {
				...entry.disposition,
				reason: '  '
			}
		};
		expect(() => validateMeadowEntryBakeOwnership({ ownership })).toThrow(/empty control reason/);
	});
});
