# Entry Map Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `meadow-entry` into a motivated exploration space — every region gets an anchor, approach, optional choice, payoff, and exit hook — backed by a new examinable `MapDiscovery` primitive and deterministic tests that prevent future sparse maps.

**Architecture:** Additive content pass on the existing per-region fragment system (`mergeRegions`), plus a new `MapDiscovery` content type rendered + read by `WorldScene` through the existing `system`-mode dialogue path, a `seenDiscoveries` set persisted in `SaveState` to light area-map markers, and data-level tests in `maps.test.ts` driven by a test-only design manifest.

**Tech Stack:** TypeScript, Svelte 5 (runes), Phaser 4, Vitest (node + browser projects), bun.

## Global Constraints

- Package manager is **bun**; run tests with `bun run test:unit -- --run`.
- `vite.config.ts` sets `expect: { requireAssertions: true }` — every test must call `expect()`.
- Svelte files are runes-mode only; non-`.svelte` tests run in the node `server` project.
- Map rects are **center-based**: a rect at `{x, y, width, height}` spans `x ± width/2`, `y ± height/2` (see `expectRectInsideMap` in `maps.test.ts`). The map is `200 × 200` tiles × `32` = `6400 × 6400` px.
- Save invariant (enforced by a code comment in `save-state.ts`): `version`, `SAVE_STORAGE_KEY`, and `isSaveState` must move in **lockstep** on every schema change.
- No new art / sprite sheets. Reuse existing dressing frames; discoveries render as a subtle programmatic marker over existing decor.
- New UI/content strings must be added to **all three** locales: `en`, `ja`, `zh-Hant`.
- Do not change slime encounter IDs (`meadow-slime-west/center/east`), wildwood `combatBounds`, or the quest-gated `ruins-threshold` transition.
- Reuse existing item IDs for pickups (`field-potion`, `sunleaf-salve`); do not invent items.
- Work on branch `feat/entry-map-enrichment` (already created off `main`).

---

### Task 1: Exploration audit (no code)

**Files:**
- Create: `docs/superpowers/reports/2026-06-17-entry-map-exploration-audit.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a route-by-route audit that names the weakest segments; consumed by the human/agent as guidance for Tasks 5–10. No exported code.

- [ ] **Step 1: Read the seven region modules** under `src/lib/game/content/maps/regions/` and the composition in `maps/meadow-entry.ts`.

- [ ] **Step 2: Write the audit** using one block per route (`Spawn → Crossroads`, `Crossroads → Coast`, `Crossroads → Mistfen`, `Crossroads → Silverpine`, `Crossroads → Wildwood`). For each: purpose, anchor, approach clues, optional branches, payoffs, empty-feeling segments, collision risks, one recommended fix. End with the **top 5 weakest segments**. Must explicitly record at least: one missing payoff (Crossroads has no pickup), one missing approach clue, one missing optional branch, one route that risks feeling empty (the `paths.ts` connectors).

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/reports/2026-06-17-entry-map-exploration-audit.md
git commit -m "docs: entry-map exploration audit"
```

---

### Task 2: MapDiscovery type + region merge wiring

**Files:**
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/regions/types.ts`
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Test: `src/lib/game/content/maps.test.ts`

**Interfaces:**
- Produces:
  - `type MapDiscoveryKind = 'sign' | 'lore' | 'vista' | 'secret' | 'warning' | 'foreshadow'`
  - `interface MapDiscovery { id: string; x: number; y: number; radius?: number; labelKey: MessageKey; descriptionKey: MessageKey; kind: MapDiscoveryKind; revealMarker?: boolean }`
  - `WorldMapDefinition.discoveries?: MapDiscovery[]`
  - `RegionFragment.discoveries?: MapDiscovery[]`
  - `mergeRegions(...)` result now includes `discoveries: MapDiscovery[]`.

- [ ] **Step 1: Write the failing test** — append to `maps.test.ts`:

```ts
describe('map discoveries', () => {
	it('exposes a discoveries array on the merged meadow-entry map', () => {
		expect(Array.isArray(meadowEntryMap.discoveries)).toBe(true);
	});

	it('rejects duplicate discovery ids across composed regions', () => {
		const duplicate: RegionFragment = {
			discoveries: [
				{
					id: 'dup-discovery',
					x: 100,
					y: 100,
					labelKey: 'content.maps.landmarks.castle-gate.label',
					descriptionKey: 'content.maps.landmarks.castle-gate.label',
					kind: 'sign'
				}
			]
		};
		expect(() => mergeRegions([duplicate, duplicate])).toThrow(/duplicate id "dup-discovery"/);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`
Expected: FAIL — `discoveries` is not a property of `meadowEntryMap`; `mergeRegions` does not dedupe discoveries.

- [ ] **Step 3: Add the type** in `src/lib/game/content/maps/types.ts` (after `MapAmbientNpc`, before `WorldMapDefinition`):

```ts
export type MapDiscoveryKind = 'sign' | 'lore' | 'vista' | 'secret' | 'warning' | 'foreshadow';

export interface MapDiscovery {
	id: string;
	x: number;
	y: number;
	/** Interact proximity in px (player center to discovery). Defaults to a WorldScene constant. */
	radius?: number;
	labelKey: MessageKey;
	descriptionKey: MessageKey;
	kind: MapDiscoveryKind;
	/** When true, becomes an area-map pin after it has been examined. */
	revealMarker?: boolean;
}
```

Add to `WorldMapDefinition` (alongside `ambientNpcs?`):

```ts
	discoveries?: MapDiscovery[];
```

- [ ] **Step 4: Extend `RegionFragment`** in `src/lib/game/content/maps/regions/types.ts`:

Add `MapDiscovery` to the import list from `$lib/game/content/maps/types`, then add to the interface:

```ts
	discoveries?: MapDiscovery[];
```

- [ ] **Step 5: Wire `mergeRegions`** in `src/lib/game/content/maps/meadow-entry.ts`:

Add `'discoveries'` to the `MergedRegions` `Pick<...>` union. In `mergeRegions`, add:

```ts
		discoveries: fragments.flatMap((fragment) => fragment.discoveries ?? []),
```

to the `merged` object, and:

```ts
	assertUniqueIds(merged.discoveries, 'discoveries');
```

after the existing `assertUniqueIds` calls. Add `discoveries: merged.discoveries,` to the `meadowEntryMap` object passed to `addEnglishMapText`.

- [ ] **Step 6: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`
Expected: PASS.

- [ ] **Step 7: Typecheck + commit**

```bash
bun run check
git add src/lib/game/content/maps/types.ts src/lib/game/content/maps/regions/types.ts src/lib/game/content/maps/meadow-entry.ts src/lib/game/content/maps.test.ts
git commit -m "feat: add MapDiscovery type and merge wiring"
```

---

### Task 3: Save schema v6 → v7 with `seenDiscoveries`

**Files:**
- Modify: `src/lib/game/save/save-state.ts`
- Modify: `src/lib/game/save/storage.ts`
- Test: `src/lib/game/save/save-state.test.ts` (create if absent; otherwise append)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `SaveState.seenDiscoveries: string[]`; `SaveState.version: 7`; `SAVE_STORAGE_KEY = 'gliese.save.v7'`. `createNewSaveState()` returns `seenDiscoveries: []`.

- [ ] **Step 1: Write the failing test** — append to `src/lib/game/save/save-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createNewSaveState, parseSaveState, serializeSaveState } from '$lib/game/save/save-state';

describe('seenDiscoveries', () => {
	it('initializes empty on a new save', () => {
		expect(createNewSaveState().seenDiscoveries).toEqual([]);
	});

	it('round-trips a populated set', () => {
		const save = { ...createNewSaveState(), seenDiscoveries: ['crossroads-waystone-sign'] };
		const parsed = parseSaveState(serializeSaveState(save));
		expect(parsed?.seenDiscoveries).toEqual(['crossroads-waystone-sign']);
	});

	it('migrates a v6 payload by defaulting seenDiscoveries to []', () => {
		const v6 = { ...createNewSaveState(), version: 6 } as Record<string, unknown>;
		delete v6.seenDiscoveries;
		const parsed = parseSaveState(JSON.stringify(v6));
		expect(parsed?.version).toBe(7);
		expect(parsed?.seenDiscoveries).toEqual([]);
	});

	it('rejects a non-string-array seenDiscoveries', () => {
		const bad = { ...createNewSaveState(), seenDiscoveries: [1, 2] } as unknown;
		expect(parseSaveState(JSON.stringify(bad))).toBeNull();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/game/save/save-state.test.ts`
Expected: FAIL — `seenDiscoveries` does not exist; version is `6`.

- [ ] **Step 3: Update the `SaveState` type** in `save-state.ts`:

Change `version: 6;` to `version: 7;` and add after `mapExploration: MapExplorationState;`:

```ts
	seenDiscoveries: string[];
```

- [ ] **Step 4: Update `createNewSaveState`** — change `version: 6` to `version: 7` and add `seenDiscoveries: [],` (alongside `mapExploration`).

- [ ] **Step 5: Extend the migration chain** — replace `migrateSaveState` with a chained version:

```ts
function migrateSaveState(value: unknown): unknown {
	let migrated = migrateV5ToV6(value);
	migrated = migrateV6ToV7(migrated);
	return migrated;
}

function migrateV5ToV6(value: unknown): unknown {
	if (!isRecord(value) || value.version !== 5) {
		return value;
	}

	const flags = isRecord(value.flags) ? value.flags : {};

	return {
		...value,
		version: 6,
		flags: {
			...flags,
			clearedEncounters: Array.isArray(flags.clearedEncounters) ? flags.clearedEncounters : [],
			clearedEncounterUnitCounts: isRecord(flags.clearedEncounterUnitCounts)
				? flags.clearedEncounterUnitCounts
				: {},
			collectedPickups: Array.isArray(flags.collectedPickups) ? flags.collectedPickups : [],
			resolvedEncounterDrops:
				isRecord(flags.resolvedEncounterDrops) && !Array.isArray(flags.resolvedEncounterDrops)
					? flags.resolvedEncounterDrops
					: {}
		}
	};
}

function migrateV6ToV7(value: unknown): unknown {
	if (!isRecord(value) || value.version !== 6) {
		return value;
	}

	return {
		...value,
		version: 7,
		seenDiscoveries: Array.isArray(value.seenDiscoveries) ? value.seenDiscoveries : []
	};
}
```

- [ ] **Step 6: Update `isSaveState`** — change the `version !== 6` guard to `version !== 7`, destructure `seenDiscoveries`, and add to the final boolean chain:

```ts
		Array.isArray(seenDiscoveries) &&
		seenDiscoveries.every((entry) => typeof entry === 'string')
```

(Remember to add `seenDiscoveries` to the destructuring at the top of `isSaveState`.)

- [ ] **Step 7: Bump the storage keys** in `src/lib/game/save/storage.ts`:

```ts
export const SAVE_STORAGE_KEY = 'gliese.save.v7';
const PREVIOUS_SAVE_STORAGE_KEY = 'gliese.save.v6';
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `bun run test:unit -- --run src/lib/game/save/save-state.test.ts`
Expected: PASS.

- [ ] **Step 9: Typecheck + commit**

```bash
bun run check
git add src/lib/game/save/save-state.ts src/lib/game/save/storage.ts src/lib/game/save/save-state.test.ts
git commit -m "feat: persist seenDiscoveries; bump save v6->v7"
```

> Note: `WorldScene.buildSaveState()` still hardcodes `version: 6` and omits `seenDiscoveries`; that is fixed in Task 13. Until then the scene's in-memory save is stale-shaped but never parsed back through `isSaveState` in this task's scope.

---

### Task 4: Exploration-test infrastructure (manifest + helpers)

**Files:**
- Create: `src/lib/game/content/maps/regions/design-manifest.ts`
- Test: `src/lib/game/content/maps.test.ts`

**Interfaces:**
- Produces:
  - `interface RegionDesignEntry { id: string; emotion?: string; density?: 'quiet' | 'medium' | 'dense'; anchorIds: string[]; approachClueIds: string[]; optionalBranchIds: string[]; payoffIds: string[]; exitHookIds: string[] }`
  - `const regionDesignManifest: RegionDesignEntry[]` (starts **empty**; regions append in Tasks 5–10).
  - In `maps.test.ts`, exported-within-file helpers: `collectEntityIds(map)`, `interestPoints(map)`, `segmentSamples(a, b, stepPx)`, `segmentHasInterest(a, b, points, stepPx, radius)`, `payoffsNear(map, endpoint, radius)`, `storyFacingNear(map, endpoint, radius)`, `pointInsideRect(point, rect)`.
- Consumes: `MapDiscovery` (Task 2).

> This module is imported only by tests; nothing in the runtime imports it, so Vite tree-shakes it from the game bundle.

- [ ] **Step 1: Create the manifest module** `design-manifest.ts`:

```ts
export interface RegionDesignEntry {
	id: string;
	emotion?: string;
	density?: 'quiet' | 'medium' | 'dense';
	anchorIds: string[];
	approachClueIds: string[];
	optionalBranchIds: string[];
	payoffIds: string[];
	exitHookIds: string[];
}

/** Design-intent manifest. Regions are appended as their content tasks land. */
export const regionDesignManifest: RegionDesignEntry[] = [];
```

- [ ] **Step 2: Add helpers + a smoke test** to `maps.test.ts`. First, add the import:

```ts
import { regionDesignManifest } from '$lib/game/content/maps/regions/design-manifest';
```

Then append:

```ts
type Pt = { x: number; y: number };

function collectEntityIds(map: WorldMapDefinition): Set<string> {
	const ids = new Set<string>();
	const lists = [
		map.landmarks,
		map.pickups,
		map.npcs,
		map.ambientNpcs,
		map.encounters,
		map.blockers,
		map.mapDecor,
		map.groundPatches,
		map.fences,
		map.transitions,
		map.discoveries
	];
	for (const list of lists) {
		for (const item of list ?? []) ids.add(item.id);
	}
	return ids;
}

function interestPoints(map: WorldMapDefinition): Pt[] {
	const points: Pt[] = [];
	for (const l of map.landmarks ?? []) points.push({ x: l.x, y: l.y });
	for (const p of map.pickups ?? []) points.push({ x: p.x, y: p.y });
	for (const e of map.encounters ?? []) points.push({ x: e.x, y: e.y });
	for (const n of map.npcs ?? []) points.push({ x: n.x, y: n.y });
	for (const a of map.ambientNpcs ?? []) points.push({ x: a.x, y: a.y });
	for (const d of map.discoveries ?? []) points.push({ x: d.x, y: d.y });
	for (const b of map.blockers ?? []) if (b.kind === 'future-gate') points.push({ x: b.x, y: b.y });
	return points;
}

function segmentSamples(a: Pt, b: Pt, stepPx: number): Pt[] {
	const distance = Math.hypot(b.x - a.x, b.y - a.y);
	const steps = Math.max(1, Math.ceil(distance / stepPx));
	const samples: Pt[] = [];
	for (let i = 0; i <= steps; i += 1) {
		const t = i / steps;
		samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
	}
	return samples;
}

function segmentHasInterest(a: Pt, b: Pt, points: Pt[], stepPx: number, radius: number): boolean {
	return segmentSamples(a, b, stepPx).some((sample) =>
		points.some((point) => Math.hypot(point.x - sample.x, point.y - sample.y) <= radius)
	);
}

function payoffsNear(map: WorldMapDefinition, endpoint: Pt, radius: number): Pt[] {
	const candidates = [
		...(map.pickups ?? []),
		...(map.landmarks ?? []),
		...(map.npcs ?? []),
		...(map.ambientNpcs ?? []),
		...(map.discoveries ?? [])
	];
	return candidates.filter((c) => Math.hypot(c.x - endpoint.x, c.y - endpoint.y) <= radius);
}

function storyFacingNear(map: WorldMapDefinition, endpoint: Pt, radius: number): Pt[] {
	const candidates = [...(map.landmarks ?? []), ...(map.discoveries ?? [])];
	return candidates.filter((c) => Math.hypot(c.x - endpoint.x, c.y - endpoint.y) <= radius);
}

function pointInsideRect(point: Pt, rect: { x: number; y: number; width: number; height: number }): boolean {
	return (
		Math.abs(point.x - rect.x) <= rect.width / 2 && Math.abs(point.y - rect.y) <= rect.height / 2
	);
}

describe('exploration test helpers', () => {
	it('collects entity ids and interest points from the meadow map', () => {
		expect(collectEntityIds(meadowEntryMap).size).toBeGreaterThan(0);
		expect(interestPoints(meadowEntryMap).length).toBeGreaterThan(0);
	});

	it('samples a segment inclusive of both endpoints', () => {
		const samples = segmentSamples({ x: 0, y: 0 }, { x: 700, y: 0 }, 350);
		expect(samples[0]).toEqual({ x: 0, y: 0 });
		expect(samples.at(-1)).toEqual({ x: 700, y: 0 });
	});

	it('detects a point inside a center-based rect', () => {
		expect(pointInsideRect({ x: 10, y: 10 }, { x: 0, y: 0, width: 40, height: 40 })).toBe(true);
		expect(pointInsideRect({ x: 30, y: 0 }, { x: 0, y: 0, width: 40, height: 40 })).toBe(false);
	});

	it('starts with an empty design manifest (regions appended in later tasks)', () => {
		expect(Array.isArray(regionDesignManifest)).toBe(true);
	});
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/game/content/maps/regions/design-manifest.ts src/lib/game/content/maps.test.ts
git commit -m "test: add exploration-test helpers and design manifest scaffold"
```

---

### Task 5: Village → Crossroads approach

**Files:**
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps/regions/paths.ts`
- Modify: `src/lib/game/content/maps/regions/design-manifest.ts`
- Test: `src/lib/game/content/maps.test.ts`

**Interfaces:**
- Consumes: helpers + `regionDesignManifest` (Task 4).
- Produces: new ids `village-waymarker` (decor), `village-crossroads-nook` (groundPatch), `village-roadside-cache` (pickup); a `village` manifest entry. Route `spawn→crossroads` covered.

The connector is `link-village-crossroads` at `(2750, 4700)` / `link-village-crossroads-v` at `(3050, 4550)` (see `paths.ts`). Place a waymarker + an off-path nook with a payoff between the village edge (~`2400, 5000`) and the Crossroads plaza (`3500, 4000`).

- [ ] **Step 1: Write the failing test + manifest entry.** Append to `maps.test.ts`:

```ts
describe('route: spawn → crossroads', () => {
	it('has no empty segment within a generous radius', () => {
		const points = interestPoints(meadowEntryMap);
		const route: Pt[] = [
			{ x: 1_536, y: 5_550 },
			{ x: 2_750, y: 4_700 },
			{ x: 3_500, y: 4_000 }
		];
		for (let i = 0; i < route.length - 1; i += 1) {
			expect(
				segmentHasInterest(route[i], route[i + 1], points, 350, 700),
				`spawn→crossroads segment ${i} runs empty`
			).toBe(true);
		}
	});
});
```

Add a `village` entry to `regionDesignManifest` in `design-manifest.ts`:

```ts
	{
		id: 'village',
		emotion: 'home',
		density: 'dense',
		anchorIds: ['guild-hall-exterior'],
		approachClueIds: ['village-waymarker', 'link-village-crossroads'],
		optionalBranchIds: ['village-crossroads-nook'],
		payoffIds: ['village-roadside-cache'],
		exitHookIds: ['crossroads-waystone']
	},
```

Also add the manifest-completeness test once (it will be reused by every region — add it now):

```ts
describe('region design manifest completeness', () => {
	const ids = collectEntityIds(meadowEntryMap);
	it.each(regionDesignManifest)('region $id declares a complete exploration loop', (entry) => {
		expect(entry.anchorIds.length, `${entry.id}: no anchor`).toBeGreaterThan(0);
		expect(entry.payoffIds.length, `${entry.id}: no payoff`).toBeGreaterThan(0);
		expect(entry.approachClueIds.length, `${entry.id}: no approach clue`).toBeGreaterThan(0);
		expect(entry.exitHookIds.length, `${entry.id}: no exit hook`).toBeGreaterThan(0);
		const declared = [
			...entry.anchorIds,
			...entry.approachClueIds,
			...entry.optionalBranchIds,
			...entry.payoffIds,
			...entry.exitHookIds
		];
		for (const id of declared) {
			expect(ids.has(id), `manifest id "${id}" (region ${entry.id}) resolves to no entity`).toBe(
				true
			);
		}
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`
Expected: FAIL — manifest references `village-waymarker`, `village-crossroads-nook`, `village-roadside-cache` which do not exist yet (and the route may report an empty middle segment).

- [ ] **Step 3: Add content.** In `paths.ts`, add an off-path nook ground patch to `groundPatches`:

```ts
		{ id: 'village-crossroads-nook', x: 2_980, y: 4_820, width: 240, height: 220, tile: 'autumnLeafTile' },
```

In `village.ts`, add to `mapDecor` (use the crossroads dressing sheet — import `crossroadsDressingAsset` if not already imported):

```ts
		{
			id: 'village-waymarker',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'poleLantern',
			x: 2_700,
			y: 4_760,
			width: 110,
			height: 220,
			mode: 'image',
			collision: { id: 'village-waymarker-collision', x: 2_700, y: 4_840, width: 50, height: 60 }
		},
		{
			id: 'village-roadside-flowers',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'flowerBed',
			x: 3_040,
			y: 4_900,
			width: 160,
			height: 130,
			mode: 'image'
		},
```

Add to `village.ts` `pickups` (create the array if absent):

```ts
		{ id: 'village-roadside-cache', x: 2_980, y: 4_780, itemId: 'field-potion', quantity: 1 },
```

If the route's middle segment still reports empty, add one ambient traveler to `village.ts` `ambientNpcs` near `(2_750, 4_700)` using an existing frame (e.g. `frameName: 'travelerNpc'`, id `village-road-traveler`).

- [ ] **Step 4: Run to verify pass**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`
Expected: PASS (village manifest entry resolves; route has no empty segment).

- [ ] **Step 5: Typecheck + commit**

```bash
bun run check
git add src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/paths.ts src/lib/game/content/maps/regions/design-manifest.ts src/lib/game/content/maps.test.ts
git commit -m "feat: breadcrumb the village->crossroads approach"
```

---

### Task 6: Crossroads hub payoff + approach

**Files:**
- Modify: `src/lib/game/content/maps/regions/crossroads.ts`
- Modify: `src/lib/game/content/maps/regions/design-manifest.ts`
- Test: `src/lib/game/content/maps.test.ts`

**Interfaces:**
- Consumes: helpers + manifest (Task 4).
- Produces: new ids `crossroads-nook` (groundPatch), `crossroads-cache` (pickup); a `crossroads` manifest entry; dead-end coverage for `castle-gate`.

- [ ] **Step 1: Write the failing tests + manifest entry.** Append to `maps.test.ts`:

```ts
describe('dead end: castle gate', () => {
	it('has a payoff and a story-facing element beyond the blocker', () => {
		const endpoint = { x: 3_500, y: 2_980 };
		expect(payoffsNear(meadowEntryMap, endpoint, 360).length).toBeGreaterThan(0);
		expect(storyFacingNear(meadowEntryMap, endpoint, 360).length).toBeGreaterThan(0);
	});
});

describe('crossroads hub', () => {
	it('offers a payoff pickup without leaving the plaza', () => {
		const cache = (meadowEntryMap.pickups ?? []).find((p) => p.id === 'crossroads-cache');
		expect(cache).toBeDefined();
	});
});
```

Add a `crossroads` entry to `regionDesignManifest`:

```ts
	{
		id: 'crossroads',
		emotion: 'civic',
		density: 'dense',
		anchorIds: ['crossroads-waystone'],
		approachClueIds: ['crossroads-festival-road', 'crossroads-banner'],
		optionalBranchIds: ['crossroads-nook'],
		payoffIds: ['crossroads-cache'],
		exitHookIds: ['castle-gate']
	},
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`
Expected: FAIL — `crossroads-cache` and `crossroads-nook` do not exist; `payoffsNear(castle-gate)` finds only the landmark (passes) but the manifest completeness for `crossroads` fails on the missing ids.

- [ ] **Step 3: Add content** in `crossroads.ts`. Add to `groundPatches`:

```ts
		{ id: 'crossroads-nook', x: 3_980, y: 4_280, width: 260, height: 220, tile: 'cobblestoneTile' },
```

Add a `pickups` array to the fragment:

```ts
	pickups: [{ id: 'crossroads-cache', x: 4_000, y: 4_300, itemId: 'sunleaf-salve', quantity: 1 }],
```

(The market stall is at `(3_820, 4_200)`; the cache sits in the nook just behind/beside it.)

- [ ] **Step 4: Run to verify pass**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

```bash
bun run check
git add src/lib/game/content/maps/regions/crossroads.ts src/lib/game/content/maps/regions/design-manifest.ts src/lib/game/content/maps.test.ts
git commit -m "feat: give the crossroads hub a payoff nook"
```

---

### Task 7: Coast three-node + jetty dead end

**Files:**
- Modify: `src/lib/game/content/maps/regions/coast.ts`
- Modify: `src/lib/game/content/maps/regions/design-manifest.ts`
- Test: `src/lib/game/content/maps.test.ts`

**Interfaces:**
- Produces: `coast` manifest entry; coverage for route `crossroads→coast` and dead-end `coast-jetty`. The existing `coast-salve` pickup (`5_300, 5_820`) is the side reward; `coast-tidepool` (`5_400, 6_040`) and `coast-jetty` (`4_900, 6_180`) already exist.

- [ ] **Step 1: Write failing tests + manifest entry.** Append to `maps.test.ts`:

```ts
describe('route: crossroads → coast', () => {
	it('has no empty segment within a generous radius', () => {
		const points = interestPoints(meadowEntryMap);
		const route: Pt[] = [
			{ x: 3_500, y: 4_000 },
			{ x: 3_900, y: 4_700 },
			{ x: 4_200, y: 5_500 },
			{ x: 4_600, y: 5_840 }
		];
		for (let i = 0; i < route.length - 1; i += 1) {
			expect(
				segmentHasInterest(route[i], route[i + 1], points, 350, 700),
				`crossroads→coast segment ${i} runs empty`
			).toBe(true);
		}
	});
});

describe('dead end: coast jetty', () => {
	it('rewards reaching the jetty', () => {
		expect(payoffsNear(meadowEntryMap, { x: 4_900, y: 6_180 }, 360).length).toBeGreaterThan(0);
	});
});
```

Add a `coast` entry to `regionDesignManifest`:

```ts
	{
		id: 'coast',
		emotion: 'open',
		density: 'medium',
		anchorIds: ['ferry-crossing'],
		approachClueIds: ['coast-approach-path', 'coast-net', 'coast-driftwood'],
		optionalBranchIds: ['coast-tidepool'],
		payoffIds: ['coast-salve'],
		exitHookIds: ['coast-jetty']
	},
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`
Expected: FAIL — the `crossroads→coast` route likely reports an empty mid-segment around `(4_200, 5_100)`, and `coast-jetty` has no payoff within 360px (jetty is decor, not a payoff entity).

- [ ] **Step 3: Add content** in `coast.ts`. Move the side-reward pickup nearer the tidepool and add a small reward at the jetty; add a breadcrumb along the approach. Add to `mapDecor`:

```ts
		{
			id: 'coast-approach-net',
			textureKey: coastDressingAsset.key,
			frameName: 'fishingNet',
			x: 4_200,
			y: 5_300,
			width: 160,
			height: 140,
			mode: 'image'
		},
```

Add a jetty-end payoff to `pickups`:

```ts
		{ id: 'coast-jetty-catch', x: 4_900, y: 6_120, itemId: 'field-potion', quantity: 1 },
```

(The jetty discovery added in Task 12 also satisfies the story-facing requirement; the pickup satisfies the payoff requirement now.)

- [ ] **Step 4: Run to verify pass** — re-run the file; expect PASS. If the mid-segment still reports empty, add one ambient gull/fisher or a `driftwood` decor near `(4_200, 5_150)`.

- [ ] **Step 5: Typecheck + commit**

```bash
bun run check
git add src/lib/game/content/maps/regions/coast.ts src/lib/game/content/maps/regions/design-manifest.ts src/lib/game/content/maps.test.ts
git commit -m "feat: shape the coast into a three-node exploration space"
```

---

### Task 8: Mistfen approach + side pocket

**Files:**
- Modify: `src/lib/game/content/maps/regions/mistfen.ts`
- Modify: `src/lib/game/content/maps/regions/design-manifest.ts`
- Test: `src/lib/game/content/maps.test.ts`

**Interfaces:**
- Produces: `mistfen` manifest entry; route `crossroads→mistfen` + dead-end `witchwood-gate` coverage. Existing: `witchwood-gate` landmark/blocker, `mistfen-salve` pickup (`880, 2_500`), toxic blooms.

- [ ] **Step 1: Write failing tests + manifest entry.** Append to `maps.test.ts`:

```ts
describe('route: crossroads → mistfen', () => {
	it('has no empty segment within a generous radius', () => {
		const points = interestPoints(meadowEntryMap);
		const route: Pt[] = [
			{ x: 3_050, y: 3_150 },
			{ x: 2_690, y: 2_750 },
			{ x: 2_150, y: 2_750 },
			{ x: 1_250, y: 1_750 },
			{ x: 1_200, y: 620 }
		];
		for (let i = 0; i < route.length - 1; i += 1) {
			expect(
				segmentHasInterest(route[i], route[i + 1], points, 350, 700),
				`crossroads→mistfen segment ${i} runs empty`
			).toBe(true);
		}
	});
});

describe('dead end: witchwood gate', () => {
	it('has a payoff and a story-facing element beyond the blocker', () => {
		const endpoint = { x: 1_200, y: 620 };
		expect(payoffsNear(meadowEntryMap, endpoint, 360).length).toBeGreaterThan(0);
		expect(storyFacingNear(meadowEntryMap, endpoint, 360).length).toBeGreaterThan(0);
	});
});
```

Add a `mistfen` entry to `regionDesignManifest`:

```ts
	{
		id: 'mistfen',
		emotion: 'eerie',
		density: 'quiet',
		anchorIds: ['witchwood-gate'],
		approachClueIds: ['mistfen-toxic-bloom', 'mistfen-reeds-1'],
		optionalBranchIds: ['mistfen-pool-east'],
		payoffIds: ['mistfen-salve'],
		exitHookIds: ['witchwood-gate']
	},
```

- [ ] **Step 2: Run to verify failure** — expect empty segments along the long basin climb (`(1_250,1_750)→(1_200,620)` is ~1130px with nothing in the middle) and possibly the `(2_150,2_750)→(1_250,1_750)` diagonal.

- [ ] **Step 3: Add content** in `mistfen.ts`. Add breadcrumb blooms/dead-trees along the gate approach and a side-pocket payoff. Add to `mapDecor`:

```ts
		{
			id: 'mistfen-bloom-trail-1',
			textureKey: marshDressingAsset.key,
			frameName: 'toxicBloom',
			x: 1_220,
			y: 1_180,
			width: 150,
			height: 150,
			mode: 'image'
		},
		{
			id: 'mistfen-bloom-trail-2',
			textureKey: marshDressingAsset.key,
			frameName: 'toxicBloom',
			x: 1_700,
			y: 2_200,
			width: 150,
			height: 150,
			mode: 'image'
		},
```

Add a side-pocket payoff to `pickups`:

```ts
		{ id: 'mistfen-cache', x: 1_780, y: 2_120, itemId: 'field-potion', quantity: 1 },
```

(`mistfen-pool-east` at `(1_700, 2_100)` is the optional pool pocket; the cache rewards detouring to it.)

- [ ] **Step 4: Run to verify pass** — re-run; add additional blooms only if a segment is still empty. Keep ambient life sparse.

- [ ] **Step 5: Typecheck + commit**

```bash
bun run check
git add src/lib/game/content/maps/regions/mistfen.ts src/lib/game/content/maps/regions/design-manifest.ts src/lib/game/content/maps.test.ts
git commit -m "feat: turn mistfen into a breadcrumbed fog approach"
```

---

### Task 9: Silverpine ceremonial climb

**Files:**
- Modify: `src/lib/game/content/maps/regions/silverpine.ts`
- Modify: `src/lib/game/content/maps/regions/design-manifest.ts`
- Test: `src/lib/game/content/maps.test.ts`

**Interfaces:**
- Produces: `silverpine` manifest entry; route `crossroads→silverpine` + dead-end `silver-shrine-gate` coverage. Existing: lanterns, `silverpine-tonic` pickup (`2_900, 1_700`), `silverpine-amulet-rack` (`2_840, 1_120`), shrine gate.

- [ ] **Step 1: Write failing tests + manifest entry.** Append to `maps.test.ts`:

```ts
describe('route: crossroads → silverpine', () => {
	it('has no empty segment within a generous radius', () => {
		const points = interestPoints(meadowEntryMap);
		const route: Pt[] = [
			{ x: 3_500, y: 3_000 },
			{ x: 3_300, y: 2_950 },
			{ x: 3_100, y: 1_600 },
			{ x: 3_000, y: 520 }
		];
		for (let i = 0; i < route.length - 1; i += 1) {
			expect(
				segmentHasInterest(route[i], route[i + 1], points, 350, 700),
				`crossroads→silverpine segment ${i} runs empty`
			).toBe(true);
		}
	});
});

describe('dead end: silver shrine gate', () => {
	it('has a payoff and a story-facing element beyond the blocker', () => {
		const endpoint = { x: 3_000, y: 480 };
		expect(payoffsNear(meadowEntryMap, endpoint, 360).length).toBeGreaterThan(0);
		expect(storyFacingNear(meadowEntryMap, endpoint, 360).length).toBeGreaterThan(0);
	});
});
```

Add a `silverpine` entry to `regionDesignManifest`:

```ts
	{
		id: 'silverpine',
		emotion: 'reverent',
		density: 'medium',
		anchorIds: ['silver-shrine-gate'],
		approachClueIds: ['silverpine-lantern-west', 'silverpine-lantern-east'],
		optionalBranchIds: ['silverpine-amulet-rack'],
		payoffIds: ['silverpine-tonic'],
		exitHookIds: ['silver-shrine-gate']
	},
```

- [ ] **Step 2: Run to verify failure** — the long stair climb `(3_100,1_600)→(3_000,520)` (~1080px) likely has an empty middle, and the shrine-gate dead end has no payoff within 360px (the tonic is at y `1_700`, far below).

- [ ] **Step 3: Add content** in `silverpine.ts`. Add a lantern cadence mid-climb + an offering payoff near the terrace. Add to `mapDecor`:

```ts
		{
			id: 'silverpine-lantern-mid',
			textureKey: shrineDressingAsset.key,
			frameName: 'stoneLantern',
			x: 3_080,
			y: 1_080,
			width: 120,
			height: 180,
			mode: 'image',
			collision: { id: 'silverpine-lantern-mid-collision', x: 3_080, y: 1_140, width: 70, height: 70 }
		},
```

Add a terrace-side payoff to `pickups`:

```ts
		{ id: 'silverpine-offering-cache', x: 3_260, y: 720, itemId: 'sunleaf-salve', quantity: 1 },
```

- [ ] **Step 4: Run to verify pass** — re-run; add one more mid-climb lantern only if a segment is still empty.

- [ ] **Step 5: Typecheck + commit**

```bash
bun run check
git add src/lib/game/content/maps/regions/silverpine.ts src/lib/game/content/maps/regions/design-manifest.ts src/lib/game/content/maps.test.ts
git commit -m "feat: make silverpine read as a ceremonial climb"
```

---

### Task 10: Wildwood danger pacing + side reward

**Files:**
- Modify: `src/lib/game/content/maps/regions/wildwood.ts`
- Modify: `src/lib/game/content/maps/regions/design-manifest.ts`
- Test: `src/lib/game/content/maps.test.ts`

**Interfaces:**
- Produces: `wildwood` manifest entry; route `crossroads→wildwood` coverage. Preserves `meadow-slime-*` encounters, `combatBounds`, and the `ruins-threshold` transition.

- [ ] **Step 1: Write failing tests + manifest entry.** Append to `maps.test.ts`:

```ts
describe('route: crossroads → wildwood cave', () => {
	it('has no empty segment within a generous radius', () => {
		const points = interestPoints(meadowEntryMap);
		const route: Pt[] = [
			{ x: 4_000, y: 4_300 },
			{ x: 4_200, y: 5_347 },
			{ x: 5_600, y: 5_347 },
			{ x: 5_600, y: 3_200 },
			{ x: 5_960, y: 1_800 }
		];
		for (let i = 0; i < route.length - 1; i += 1) {
			expect(
				segmentHasInterest(route[i], route[i + 1], points, 350, 700),
				`crossroads→wildwood segment ${i} runs empty`
			).toBe(true);
		}
	});

	it('preserves the slime encounters and the ruins transition', () => {
		const encounterIds = (meadowEntryMap.encounters ?? []).map((e) => e.id);
		expect(encounterIds).toEqual(
			expect.arrayContaining(['meadow-slime-west', 'meadow-slime-center', 'meadow-slime-east'])
		);
		expect(
			meadowEntryMap.transitions.some((t) => t.toMapId === 'ruins-threshold')
		).toBe(true);
	});
});
```

Add a `wildwood` entry to `regionDesignManifest`:

```ts
	{
		id: 'wildwood',
		emotion: 'tense',
		density: 'medium',
		anchorIds: ['whispering-cave'],
		approachClueIds: ['sundrop-forest-road-north', 'wildwood-woodcutter'],
		optionalBranchIds: ['wildwood-grove-cache'],
		payoffIds: ['wildwood-grove-cache'],
		exitHookIds: ['whispering-cave']
	},
```

- [ ] **Step 2: Run to verify failure** — `wildwood-grove-cache` doesn't exist; the long forest-road-north climb `(5_600,5_347)→(5_600,3_200)` may report empty mid-segments.

- [ ] **Step 3: Add content** in `wildwood.ts`. Add a safe staging marker before the combat pockets, a brush-hidden side reward in the grove, and escalation decor near the cave. Add to `mapDecor`:

```ts
		{
			id: 'wildwood-staging-brush',
			textureKey: forestDressingAsset.key,
			frameName: 'brush',
			x: 5_600,
			y: 4_200,
			width: 180,
			height: 150,
			mode: 'image'
		},
		{
			id: 'wildwood-cave-canopy',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 5_700,
			y: 2_100,
			width: 200,
			height: 260,
			mode: 'image',
			collision: { id: 'wildwood-cave-canopy-collision', x: 5_700, y: 2_180, width: 80, height: 70 }
		},
```

Add a brush-hidden side reward (grove is around `(4_600–4_900, 3_300–4_750)`) to a `pickups` array:

```ts
	pickups: [{ id: 'wildwood-grove-cache', x: 4_700, y: 3_650, itemId: 'sunleaf-salve', quantity: 1 }],
```

- [ ] **Step 4: Run to verify pass** — re-run; add one more roadside brush/tree near an empty mid-segment if needed. Do **not** place decor collision boxes inside the combat pockets (`(5_120,960)`, `(5_360,1_280)`, `(5_920,1_600)`).

- [ ] **Step 5: Typecheck + commit**

```bash
bun run check
git add src/lib/game/content/maps/regions/wildwood.ts src/lib/game/content/maps/regions/design-manifest.ts src/lib/game/content/maps.test.ts
git commit -m "feat: add danger pacing and a hidden reward to wildwood"
```

---

### Task 11: Critical-route collision sanity test

**Files:**
- Test: `src/lib/game/content/maps.test.ts`

**Interfaces:**
- Consumes: `segmentSamples`, `pointInsideRect` (Task 4).
- Produces: a guard that no critical-route sample sits inside any blocker.

- [ ] **Step 1: Write the test.** Append to `maps.test.ts`:

```ts
describe('critical routes avoid blockers', () => {
	const criticalRoutes: Pt[][] = [
		[
			{ x: 1_536, y: 5_550 },
			{ x: 2_750, y: 4_700 },
			{ x: 3_500, y: 4_000 }
		],
		[
			{ x: 3_500, y: 4_000 },
			{ x: 4_200, y: 5_500 },
			{ x: 4_600, y: 5_840 }
		],
		[
			{ x: 3_500, y: 4_000 },
			{ x: 3_300, y: 2_950 }
		],
		[
			{ x: 3_050, y: 3_150 },
			{ x: 2_150, y: 2_750 }
		],
		[
			{ x: 4_000, y: 4_300 },
			{ x: 4_200, y: 5_347 },
			{ x: 5_600, y: 5_347 },
			{ x: 5_600, y: 3_200 }
		]
	];

	it('keeps every critical-route sample outside blockers', () => {
		const blockers = meadowEntryMap.blockers ?? [];
		for (const route of criticalRoutes) {
			for (let i = 0; i < route.length - 1; i += 1) {
				for (const sample of segmentSamples(route[i], route[i + 1], 48)) {
					for (const blocker of blockers) {
						expect(
							pointInsideRect(sample, blocker),
							`route sample (${Math.round(sample.x)},${Math.round(sample.y)}) is inside blocker ${blocker.id}`
						).toBe(false);
					}
				}
			}
		}
	});
});
```

- [ ] **Step 2: Run the test**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`
Expected: PASS. If it fails, a critical route endpoint overlaps a `future-gate`/`ocean` blocker — pull the route endpoint short of the gate (gates sit beyond the playable approach); do **not** move the blocker.

- [ ] **Step 3: Commit**

```bash
git add src/lib/game/content/maps.test.ts
git commit -m "test: assert critical routes stay clear of blockers"
```

---

### Task 12: Discovery content + i18n + validity test

**Files:**
- Modify: region files `crossroads.ts`, `coast.ts`, `mistfen.ts`, `silverpine.ts`, `wildwood.ts`
- Modify: `src/lib/game/i18n/messages/en.ts`, `ja.ts`, `zh-Hant.ts`
- Test: `src/lib/game/content/maps.test.ts`

**Interfaces:**
- Consumes: `MapDiscovery` (Task 2), the merge wiring (Task 2).
- Produces: 6 discovery entries with `content.maps.discoveries.<id>.{label,description}` keys in all locales.

The curated set (each `x,y` matches an existing anchor):

| id | region | x, y | kind | revealMarker |
|---|---|---|---|---|
| `crossroads-waystone-sign` | crossroads | 3_500, 4_000 | sign | true |
| `castle-gate-warning` | crossroads | 3_500, 3_020 | warning | true |
| `ferry-shrine-lore` | coast | 3_600, 5_720 | lore | true |
| `coast-jetty-foreshadow` | coast | 4_900, 6_180 | foreshadow | false |
| `witchwood-poison-warning` | mistfen | 1_200, 620 | warning | true |
| `silverpine-amulet-foreshadow` | silverpine | 2_840, 1_120 | foreshadow | false |
| `wildwood-cave-danger` | wildwood | 5_960, 1_700 | warning | true |

- [ ] **Step 1: Add the English strings** in `en.ts` under `content.maps`, after the `landmarks` block, add a `discoveries` block:

```ts
			discoveries: {
				'crossroads-waystone-sign': {
					label: 'Worn Waystone',
					description: 'Carved arrows fan out: shrine north, coast south, marsh west, cave east.'
				},
				'castle-gate-warning': {
					label: 'Castle Gate Notice',
					description: 'The royal road is sealed by decree. None pass the white line until the festival ends.'
				},
				'ferry-shrine-lore': {
					label: 'Ferry Shrine',
					description: 'Ring the bell at dusk and the ferryman answers — when the tide and the war allow.'
				},
				'coast-jetty-foreshadow': {
					label: "Jetty's End",
					description: 'The planks stop at open water. No boat waits here yet.'
				},
				'witchwood-poison-warning': {
					label: 'Witchwood Marker',
					description: 'Breathe shallow past the gate. The blooms here weep a poison mist.'
				},
				'silverpine-amulet-foreshadow': {
					label: 'Amulet Rack',
					description: 'Pilgrims hang charms to seal a pact older than the shrine.'
				},
				'wildwood-cave-danger': {
					label: 'Cave Warning',
					description: 'Claw-scarred bark. Something denned in the Whispering Cave does not sleep.'
				}
			},
```

- [ ] **Step 2: Mirror the keys** in `ja.ts` and `zh-Hant.ts` under the same `content.maps.discoveries` path. Provide translated `label`/`description` for every id above (these files are `DeepPartial`, but the parity test in Step 4 requires both keys present in both locales).

- [ ] **Step 3: Add discovery data to each region fragment.** Example for `crossroads.ts` — add a `discoveries` array:

```ts
	discoveries: [
		{
			id: 'crossroads-waystone-sign',
			x: 3_500,
			y: 4_000,
			kind: 'sign',
			revealMarker: true,
			labelKey: 'content.maps.discoveries.crossroads-waystone-sign.label',
			descriptionKey: 'content.maps.discoveries.crossroads-waystone-sign.description'
		},
		{
			id: 'castle-gate-warning',
			x: 3_500,
			y: 3_020,
			kind: 'warning',
			revealMarker: true,
			labelKey: 'content.maps.discoveries.castle-gate-warning.label',
			descriptionKey: 'content.maps.discoveries.castle-gate-warning.description'
		}
	],
```

Repeat the pattern in `coast.ts` (`ferry-shrine-lore`, `coast-jetty-foreshadow`), `mistfen.ts` (`witchwood-poison-warning`), `silverpine.ts` (`silverpine-amulet-foreshadow`), `wildwood.ts` (`wildwood-cave-danger`) using the table's coords/kinds/flags and the matching message keys.

- [ ] **Step 4: Write the validity + parity test.** Append to `maps.test.ts` (add imports for the raw locale modules at the top of the file):

```ts
import { en } from '$lib/game/i18n/messages/en';
import { ja } from '$lib/game/i18n/messages/ja';
import { zhHant } from '$lib/game/i18n/messages/zh-Hant';

const discoveryKinds = ['sign', 'lore', 'vista', 'secret', 'warning', 'foreshadow'];

function localeHasPath(source: unknown, key: string): boolean {
	let current: unknown = source;
	for (const segment of key.split('.')) {
		if (typeof current !== 'object' || current === null) return false;
		current = (current as Record<string, unknown>)[segment];
	}
	return typeof current === 'string' && current.trim().length > 0;
}

describe('discovery content', () => {
	const discoveries = meadowEntryMap.discoveries ?? [];

	it('places at least the curated discovery set', () => {
		expect(discoveries.length).toBeGreaterThanOrEqual(6);
	});

	it.each(discoveries)('discovery $id is valid and localized in all locales', (discovery) => {
		expectRectInsideMap({ x: discovery.x, y: discovery.y, width: 2, height: 2 });
		expect(discoveryKinds).toContain(discovery.kind);
		for (const key of [discovery.labelKey, discovery.descriptionKey]) {
			expectEnglishMessage(key);
			expect(localeHasPath(en, key), `en missing ${key}`).toBe(true);
			expect(localeHasPath(ja, key), `ja missing ${key}`).toBe(true);
			expect(localeHasPath(zhHant, key), `zh-Hant missing ${key}`).toBe(true);
		}
	});
});
```

- [ ] **Step 5: Run the test**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`
Expected: PASS. (If `ja`/`zh-Hant` is missing a key, the parity assertion names it.)

- [ ] **Step 6: Typecheck + commit**

```bash
bun run check
git add src/lib/game/content/maps/regions/*.ts src/lib/game/i18n/messages/*.ts src/lib/game/content/maps.test.ts
git commit -m "feat: add map discoveries with localized lore/warnings"
```

---

### Task 13: WorldScene — render, read, and persist discoveries

**Files:**
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`

**Interfaces:**
- Consumes: `MapDiscovery` (Task 2), `SaveState.seenDiscoveries` (Task 3), discovery content (Task 12).
- Produces: in-scene `seenDiscoveryIds: Set<string>`; `buildSaveState()` now emits `version: 7` and `seenDiscoveries`. Reading a discovery opens a `system` dialogue and persists the id.

> This task is verified primarily by `bun run check` + the existing scene boot smoke test; Phaser scene behavior is not unit-tested here. Keep edits minimal and mirror existing NPC/pickup patterns.

- [ ] **Step 1: Add the import** — add `type MapDiscovery` to the existing `$lib/game/content/maps` type import group, and ensure `t` and `MessageKey` are imported (they are used via `this.status`/`this.getLocale`).

- [ ] **Step 2: Add fields + constant** near `private collectedPickupIds` (~line 297) and the static radii:

```ts
	private static readonly discoveryInteractRadius = 64;
	private seenDiscoveryIds = new Set<string>();
	private discoveryMarkers = new Map<string, Phaser.GameObjects.Arc>();
```

- [ ] **Step 3: Hydrate from the active save** — next to `this.collectedPickupIds = new Set(activeSave?.flags.collectedPickups ?? []);` (~line 399), add:

```ts
		this.seenDiscoveryIds = new Set(activeSave?.seenDiscoveries ?? []);
```

- [ ] **Step 4: Render markers** — next to where `renderPickups(map)` is called in `create()` (~line 478), add `this.renderDiscoveries(map);`, and add the method (place near `renderPickups`):

```ts
	private renderDiscoveries(map: WorldMapDefinition) {
		this.discoveryMarkers.clear();
		for (const discovery of map.discoveries ?? []) {
			const marker = this.add.circle(discovery.x, discovery.y, 10, 0xfff2b0, 0.55);
			marker.setStrokeStyle(2, 0xffd24d, 0.9);
			this.tweens.add({
				targets: marker,
				alpha: { from: 0.25, to: 0.7 },
				duration: 900,
				yoyo: true,
				repeat: -1
			});
			this.discoveryMarkers.set(discovery.id, marker);
		}
	}
```

Also clear the markers map where the scene tears down other marker maps (near `this.pickupMarkers.clear();` ~line 429): add `this.discoveryMarkers.clear();`.

- [ ] **Step 5: Hook interaction** — replace the body of `handleInteractInput()` (~line 2685) with:

```ts
	private handleInteractInput() {
		if (!this.hasInteractJustDown()) {
			return;
		}

		const nearbyNpc = this.findNearbyNpc();

		if (this.dialogueSession) {
			if (!nearbyNpc || !this.isTransientFallbackDialogueSession(this.dialogueSession)) {
				return;
			}
		}

		if (!nearbyNpc) {
			const discovery = this.findNearbyDiscovery();
			if (discovery) {
				this.readDiscovery(discovery);
				return;
			}
		}

		this.interactWithNearbyNpc(nearbyNpc);
	}

	private findNearbyDiscovery(): MapDiscovery | undefined {
		if (!this.player) {
			return undefined;
		}

		const map = this.resolveMap(this.mapId);

		return (map.discoveries ?? [])
			.map((discovery) => ({
				discovery,
				distance: Phaser.Math.Distance.Between(
					this.player!.x,
					this.player!.y,
					discovery.x,
					discovery.y
				)
			}))
			.filter(
				({ discovery, distance }) =>
					distance <=
					WorldScene.playerRadius + (discovery.radius ?? WorldScene.discoveryInteractRadius)
			)
			.sort((left, right) => left.distance - right.distance)[0]?.discovery;
	}

	private readDiscovery(discovery: MapDiscovery) {
		const locale = this.getLocale();
		this.storyDialogueSeq++;
		this.dialogueSession = buildDialogueFallback(
			t(locale, discovery.labelKey),
			t(locale, discovery.descriptionKey)
		);

		if (!this.seenDiscoveryIds.has(discovery.id)) {
			this.seenDiscoveryIds.add(discovery.id);
			if (this.shouldPersistExplorationChanges) {
				saveGameState(this.buildSaveState());
			}
		}

		this.publishHudState(this.status('status.dialogueUpdated'));
	}
```

- [ ] **Step 6: Update `buildSaveState()`** (~line 646) — change `version: 6` to `version: 7`, and add after `mapExploration: cloneMapExploration(this.mapExploration)`:

```ts
			seenDiscoveries: [...this.seenDiscoveryIds].sort()
```

- [ ] **Step 7: Typecheck**

Run: `bun run check`
Expected: no type errors.

- [ ] **Step 8: Verify boot smoke test still passes**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`
Expected: PASS (and any existing WorldScene/boot smoke test).

- [ ] **Step 9: Commit**

```bash
git add src/lib/game/phaser/scenes/WorldScene.ts
git commit -m "feat: read and persist map discoveries in WorldScene"
```

---

### Task 14: Area-map discovery markers

**Files:**
- Modify: `src/lib/game/core/area-map.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts` (pass `seenDiscoveries` to `buildAreaMapState`)
- Test: `src/lib/game/core/area-map.test.ts` (create if absent; otherwise append)

**Interfaces:**
- Consumes: `MapDiscovery` (Task 2), `seenDiscoveryIds` (Task 13).
- Produces: `HudAreaMapMarkerKind` includes `'discovery'`; `buildAreaMapState` accepts `seenDiscoveries: string[]` (default `[]`).

- [ ] **Step 1: Write the failing test** in `area-map.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildAreaMapState } from '$lib/game/core/area-map';
import { meadowEntryMap } from '$lib/game/content/maps';
import { createInitialQuestState } from '$lib/game/core/quests';
import { revealCellsAroundPoint } from '$lib/game/core/map-exploration';

describe('discovery markers', () => {
	const seen = 'crossroads-waystone-sign';
	const discovery = (meadowEntryMap.discoveries ?? []).find((d) => d.id === seen);
	const revealedCells = discovery
		? revealCellsAroundPoint({
				x: discovery.x,
				y: discovery.y,
				mapWidth: meadowEntryMap.width * 32,
				mapHeight: meadowEntryMap.height * 32
			})
		: [];

	it('shows a revealMarker discovery only after it is seen', () => {
		const hidden = buildAreaMapState({
			map: meadowEntryMap,
			player: meadowEntryMap.spawn,
			revealedCells,
			quests: createInitialQuestState(),
			locale: 'en',
			seenDiscoveries: []
		});
		expect(hidden.markers.some((m) => m.id === seen)).toBe(false);

		const shown = buildAreaMapState({
			map: meadowEntryMap,
			player: meadowEntryMap.spawn,
			revealedCells,
			quests: createInitialQuestState(),
			locale: 'en',
			seenDiscoveries: [seen]
		});
		expect(shown.markers.some((m) => m.id === seen && m.kind === 'discovery')).toBe(true);
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `bun run test:unit -- --run src/lib/game/core/area-map.test.ts`
Expected: FAIL — `buildAreaMapState` has no `seenDiscoveries` param; no `'discovery'` markers.

- [ ] **Step 3: Implement** in `area-map.ts`:

Add `'discovery'` to the kind union:

```ts
export type HudAreaMapMarkerKind = 'building' | 'exit' | 'quest' | 'discovery';
```

Add `seenDiscoveries` to the `buildAreaMapState` params (default `[]`) and include discovery markers in the candidates:

```ts
export function buildAreaMapState({
	map,
	player,
	revealedCells,
	quests,
	locale,
	seenDiscoveries = []
}: {
	map: WorldMapDefinition;
	player: { x: number; y: number };
	revealedCells: string[];
	quests: QuestState;
	locale: Locale;
	seenDiscoveries?: string[];
}): HudAreaMapState {
	const markerCandidates = [
		...buildLandmarkMarkers(map, locale),
		...buildTransitionMarkers(map, locale),
		...buildMainQuestMarkers(map, quests, locale),
		...buildDiscoveryMarkers(map, seenDiscoveries, locale)
	];
	// ...unchanged return
```

Add the builder (mirrors `buildLandmarkMarkers`):

```ts
function buildDiscoveryMarkers(
	map: WorldMapDefinition,
	seenDiscoveries: string[],
	locale: Locale
): HudAreaMapMarker[] {
	const seen = new Set(seenDiscoveries);
	return (map.discoveries ?? [])
		.filter((discovery) => discovery.revealMarker === true && seen.has(discovery.id))
		.map((discovery) => ({
			id: discovery.id,
			kind: 'discovery',
			x: discovery.x,
			y: discovery.y,
			label: t(locale, discovery.labelKey)
		}));
}
```

- [ ] **Step 4: Pass `seenDiscoveries` from the scene** — in `WorldScene.ts` `publishHudState`, add to the `buildAreaMapState({...})` call:

```ts
					seenDiscoveries: [...this.seenDiscoveryIds]
```

- [ ] **Step 5: Run to verify pass**

Run: `bun run test:unit -- --run src/lib/game/core/area-map.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck + commit**

```bash
bun run check
git add src/lib/game/core/area-map.ts src/lib/game/core/area-map.test.ts src/lib/game/phaser/scenes/WorldScene.ts
git commit -m "feat: surface seen discoveries as area-map pins"
```

---

### Task 15: Full validation + human playtest checkpoint

**Files:**
- Create: `docs/superpowers/reports/2026-06-17-entry-map-playtest.md`

**Interfaces:**
- Consumes: all prior tasks. Produces: a passing test suite and a human playtest record.

- [ ] **Step 1: Run the full unit suite**

Run: `bun run test:unit -- --run`
Expected: PASS. Fix any failures before continuing.

- [ ] **Step 2: Run typecheck + lint**

Run: `bun run check && bun run lint`
Expected: clean.

- [ ] **Step 3: Run e2e**

Run: `bun run test:e2e`
Expected: PASS (boot, save/load, existing flows intact).

- [ ] **Step 4: Confirm save compatibility manually** — verify a fresh boot creates a save with `seenDiscoveries: []`, and that a stored `gliese.save.v6` payload loads (migrated to v7). This is covered by Task 3 tests; re-run them if in doubt:

Run: `bun run test:unit -- --run src/lib/game/save/save-state.test.ts`

- [ ] **Step 5: Human playtest checkpoint (manual).** The implementing agent pauses here and asks the human to run `bun run dev` and walk the five routes (Spawn→Crossroads, Crossroads→Coast→Jetty→Tidepool, Crossroads→Mistfen→Witchwood Gate, Crossroads→Silverpine→Shrine Gate, Crossroads→Wildwood→Whispering Cave), recording per route: time to first curiosity / choice / payoff, empty-feeling segments, confusing collisions, false-interactive objects, and under-visible interactables. Capture findings in the report file.

- [ ] **Step 6: Patch the three worst findings** (if any), re-running the affected route's unit test and `bun run check` after each patch.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/reports/2026-06-17-entry-map-playtest.md
git commit -m "docs: entry-map playtest notes and final tuning"
```

---

## Self-Review

**Spec coverage:**
- MapDiscovery primitive (spec §A) → Tasks 2, 12, 13. ✓
- Save v6→v7 + `seenDiscoveries` (spec §B) → Task 3 (+ scene emit in Task 13). ✓
- Area-map markers (spec §C) → Task 14. ✓
- Per-region content pass + stop conditions (spec §D) → Tasks 5–10. ✓
- Authoring manifest + 5 test families (spec §E): manifest-completeness (Task 5 harness, entries 5–10), dead-end payoff (Tasks 6/7/8/9), route-interest lenient (Tasks 5/7/8/9/10), collision sanity (Task 11), discovery validity+parity (Task 12). ✓
- Sequencing audit→scaffold→tests→content→engine→markers→validate (spec Sequencing) → Tasks 1–15 in order. ✓
- Reshaped tasks: no `meta` on fragments (manifest module instead); playtest as human checkpoint (Task 15); no separate final-review doc (folds into PR). ✓

**Placeholder scan:** No `TBD`/`TODO`/"handle edge cases". Content tasks give concrete coordinates, real frame names, and real item IDs; "add one more breadcrumb if a segment is still empty" is explicit tuning guidance bounded by a deterministic test, not a placeholder.

**Type consistency:** `MapDiscovery`/`MapDiscoveryKind` fields identical across Tasks 2, 12, 13, 14. `buildAreaMapState`'s `seenDiscoveries?: string[]` (Task 14) matches the scene call passing `[...this.seenDiscoveryIds]` (Task 14 Step 4). `seenDiscoveries: string[]` on `SaveState` (Task 3) matches `buildSaveState` emit (Task 13 Step 6) and hydration (Task 13 Step 3). Helper signatures defined in Task 4 are used unchanged in Tasks 5–11.
