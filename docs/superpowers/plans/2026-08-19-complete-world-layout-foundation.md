# Complete World Layout and Runtime Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove and preserve the current compliant world layouts, add the missing Meadow watershed and crossing geometry, and establish generic map-local all-or-nothing painted-background ownership before any new final art is generated.

**Architecture:** Extend the existing `WorldMapDefinition`, background ownership, review-mode selection, RegionFragment, and direct-map seams instead of introducing another authoring system. Seven interiors and both Ruins maps are contract-tested and retained; only Meadow receives known geometry changes. The existing painted Meadow package remains reviewable, but becomes opt-in in the same commit that changes Meadow geometry so mismatched historical art never renders by default.

**Tech Stack:** TypeScript, Vitest, Phaser 4, Svelte 5 checks, Playwright, Sharp, Bun, existing RegionFragment/direct-map authoring, existing save normalization.

**Spec:** `docs/superpowers/specs/2026-08-19-complete-world-background-and-layout-redesign-design.md`

## Global Constraints

- Preserve all ten map IDs and every existing transition, NPC, ambient NPC, pickup, encounter, discovery, quest, shop, enemy, dialogue, and landmark identity.
- Keep `meadow-entry` exactly 200×200 cells and 6400×6400 pixels on the existing 32-pixel grid.
- Treat `VILLAGE_INTERIOR_LAYOUTS` and the existing expanded Ruins shells as approved baselines; do not move or resize them unless a newly added composed-collision proof fails and the report records the exact failure.
- Keep Lynn/family, Toma/workshop, and Io/archive-study bindings closed unless a story-source audit proves a contradiction.
- Add no map editor, procedural generator, room graph, interior compiler, layered-interior framework, arrival registry, save-schema field, traversal mechanic, story prose, or final generated art.
- Static presentation may change; collision, interaction, encounter, transition, and stateful-object semantics remain live and presentation-independent.
- A background package is selected per `mapId` and is all-or-nothing. A failed required texture leaves zero package images and restores the complete legacy base tile layer and static visuals.
- Add `visual?: MapVisualOwnership` to ground patches and interior props by extending the existing ownership contract; do not create parallel ownership types.
- Keep the historical two-crop Meadow package and evidence immutable. Once Meadow geometry changes, plain development uses fallback and `?meadowPaintedPilot=on` remains the explicit historical comparison path.
- Package 1 performs no image generation and does not retarget the Meadow crop exporter. The four-slice migration belongs to the Meadow art package.
- Run shell commands through `rtk`. Preserve unrelated untracked `.playwright-cli/`, `output/`, reports, and PNG evidence.

---

### Task 1: Extend Visual Ownership to Every Static Map Source

**Files:**
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/background-ownership.ts`
- Modify: `src/lib/game/content/maps/background-ownership.test.ts`

**Interfaces:**
- Consumes: existing `MapVisualOwnership`, `MapVisualOwnerCrop`, `applyVisualOwnership<T>()`, and `validateMapBackgroundOwnership()`.
- Produces:

```ts
export type MapVisualSourceType =
	| 'blocker'
	| 'decor'
	| 'fence'
	| 'ground-patch'
	| 'interior-prop';

export interface MapGroundPatch extends MapRect {
	tile: MapGroundTile;
	visual?: MapVisualOwnership;
}

export interface MapInteriorProp extends MapRect {
	frameName: InteriorPropFrameName;
	depth?: MapInteriorPropDepth;
	collision?: MapRect;
	visual?: MapVisualOwnership;
}
```

- `MapBackgroundOwnershipSource` includes `groundPatches` and `interiorProps` in addition to the three existing visual collections.
- `validateMapBackgroundOwnership()` validates all five source collections using the existing crop/required-ID rules.

- [ ] **Step 1: Write RED tests for the two missing ownership sources**

Add concrete cases to `background-ownership.test.ts`:

```ts
it.each([
	[
		'Ground patch',
		'path',
		(visual: MapVisualOwnership) => ({
			groundPatches: [
				{ id: 'path', x: 16, y: 16, width: 32, height: 32, tile: 'pathTile' as const, visual }
			]
		})
	],
	[
		'Interior prop',
		'table',
		(visual: MapVisualOwnership) => ({
			interiorProps: [
				{ id: 'table', x: 32, y: 32, width: 64, height: 32, frameName: 'table' as const, visual }
			]
		})
	]
] as const)('validates %s fallback ownership', (label, sourceId, buildSource) => {
	const visual = {
		mode: 'fallback-only' as const,
		ownerCrops: [{ cropId: 'map-base', requiredBackgroundIds: ['map-base-image'] }]
	};
	const map = {
		backgroundImages: [
			{
				id: 'map-base-image',
				textureKey: 'map-base',
				x: 32,
				y: 32,
				width: 64,
				height: 64,
				plane: 'base' as const,
				drawOrder: 0
			}
		],
		...buildSource(visual)
	};

	expect(() => validateMapBackgroundOwnership(map)).not.toThrow();
	expect(() =>
		validateMapBackgroundOwnership({
			...map,
			backgroundImages: []
		})
	).toThrow(`${label} ${sourceId} references missing fallback-only owner ID`);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
rtk bun run test:unit -- --run src/lib/game/content/maps/background-ownership.test.ts
```

Expected: FAIL because `MapGroundPatch` and `MapInteriorProp` do not accept `visual`, and the validator ignores both collections.

- [ ] **Step 3: Extend the shared types and validator**

Add the exact `MapVisualSourceType` union and optional fields shown in Interfaces. Change the source subset and validation calls:

```ts
export type MapBackgroundOwnershipSource = Pick<
	WorldMapDefinition,
	'backgroundImages' | 'blockers' | 'mapDecor' | 'fences' | 'groundPatches' | 'interiorProps'
>;

validateVisualOwnershipSources('Blocker', map.blockers ?? [], descriptorIds);
validateVisualOwnershipSources('Map decor', map.mapDecor ?? [], descriptorIds);
validateVisualOwnershipSources('Fence', map.fences ?? [], descriptorIds);
validateVisualOwnershipSources('Ground patch', map.groundPatches ?? [], descriptorIds);
validateVisualOwnershipSources('Interior prop', map.interiorProps ?? [], descriptorIds);
```

Keep `applyVisualOwnership<T>()` generic and unchanged.

- [ ] **Step 4: Run focused GREEN and static checks**

Run:

```bash
rtk bun run test:unit -- --run src/lib/game/content/maps/background-ownership.test.ts
rtk bun run check
rtk bunx prettier --check src/lib/game/content/maps/types.ts src/lib/game/content/maps/background-ownership.ts src/lib/game/content/maps/background-ownership.test.ts
rtk bunx eslint src/lib/game/content/maps/background-ownership.ts src/lib/game/content/maps/background-ownership.test.ts
rtk git diff --check
```

Expected: all pass.

- [ ] **Step 5: Commit Task 1**

```bash
rtk git add src/lib/game/content/maps/types.ts src/lib/game/content/maps/background-ownership.ts src/lib/game/content/maps/background-ownership.test.ts
rtk git commit -m "feat(world): extend background visual ownership"
```

---

### Task 2: Make Background Packages Generic and Map-Locally Atomic

**Files:**
- Create: `src/lib/game/content/backgrounds/map-background-package.ts`
- Create: `src/lib/game/content/backgrounds/map-background-package.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts`
- Modify: `src/lib/game/content/maps/meadow-entry-painted-backgrounds.ts`
- Modify: `src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts`
- Modify: `src/lib/game/phaser/world-render-options.ts`
- Modify: `src/lib/game/phaser/world-render-options.test.ts`
- Modify: `src/lib/game/phaser/renderer-diagnostics.ts`
- Modify: `src/lib/game/phaser/renderer-diagnostics.test.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts`
- Modify: `src/lib/game/phaser/scenes/BootScene.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

**Interfaces:**
- Consumes: `RegionalBackgroundPreloadAsset`, `MapBackgroundImage`, `MapVisualSourceType`, `MapVisualOwnerCrop`, `WorldRenderOptions`, and the existing generated legacy Meadow descriptors.
- Produces:

```ts
export type MapBackgroundPackageMode = 'fallback' | 'review' | 'production';

export interface MapBackgroundVisualOwner {
	readonly sourceType: MapVisualSourceType;
	readonly sourceId: string;
	readonly ownerCrops: readonly MapVisualOwnerCrop[];
}

export interface MapBackgroundPackageDefinition {
	readonly id: string;
	readonly mapId: string;
	readonly coverage: 'full-map' | 'historical-partial';
	readonly assets: readonly RegionalBackgroundPreloadAsset[];
	readonly backgrounds: readonly MapBackgroundImage[];
	readonly visualOwners: readonly MapBackgroundVisualOwner[];
}

export interface MapBackgroundPackageSelection {
	readonly mode: MapBackgroundPackageMode;
	readonly definition: MapBackgroundPackageDefinition | null;
}

export interface MapBackgroundPackagePresentation {
	readonly packageId: string | null;
	readonly presentationMode: 'painted' | 'fallback';
	readonly coverage: 'full-map' | 'historical-partial' | null;
	readonly requiredBackgroundIds: readonly string[];
	readonly successfulBackgroundIds: readonly string[];
	readonly selectedBackgroundIds: readonly string[];
}

export interface ResolveMapBackgroundPackageInput {
	readonly mapId: string;
	readonly regionalBackgrounds: boolean;
	readonly reviewPackageIds: readonly string[];
	readonly defaultSelection: {
		readonly packageId: string;
		readonly mode: 'review' | 'production';
	} | null;
	readonly forcedFallback: boolean;
}

export function resolveMapBackgroundPackageSelection(
	registry: readonly MapBackgroundPackageDefinition[],
	input: ResolveMapBackgroundPackageInput
): MapBackgroundPackageSelection;

export function selectedMapBackgroundPackagesForPreload(
	registry: readonly MapBackgroundPackageDefinition[],
	inputs: readonly ResolveMapBackgroundPackageInput[]
): readonly MapBackgroundPackageDefinition[];

export function applyMapBackgroundPackage(
	map: WorldMapDefinition,
	selection: MapBackgroundPackageSelection
): WorldMapDefinition;
```

- The historical package ID is exactly `meadow-entry-painted-v2-legacy`.
- The historical package alone uses `coverage: 'historical-partial'`: it still succeeds or fails as one two-texture transaction, but retains the ground layer and uses per-source ownership because it does not cover the full map. Every new package in this program uses `coverage: 'full-map'`.
- `WorldRenderOptions` adds `mapBackgroundReviewIds: readonly string[]`, populated by repeated exact `mapBackgroundReview=<package-id>` parameters.
- `?meadowPaintedPilot=on` remains an alias that requests `meadow-entry-painted-v2-legacy`; `off` and `regionalBackground=off` have priority.
- `RegionalBackgroundRendererDiagnostic` replaces the Meadow-only `paintedMode` field with sorted `packageIds`, sorted `requiredAssetKeys`, sorted `completedAssetKeys`, renderer, texture limit, and load duration.
- `RegionalBackgroundPlaneRenderDiagnostic` adds `packageId`, `requiredBackgroundIds`, `selectedBackgroundIds`, and `presentationMode: 'painted' | 'fallback'`.
- WorldScene renders required planes transactionally. If any descriptor is missing, invalid, or throws, it destroys every image created for that package and reports fallback.

- [ ] **Step 1: Write pure RED tests for registry selection and atomic presentation**

In `map-background-package.test.ts`, use two synthetic map packages and assert:

```ts
expect(
	resolveMapBackgroundPackageSelection(registry, {
		mapId: 'hero-house',
		regionalBackgrounds: true,
		reviewPackageIds: ['hero-house-review'],
		defaultSelection: null,
		forcedFallback: false
	})
).toEqual({ mode: 'review', definition: registry[1] });

expect(
	resolveMapBackgroundPackageSelection(registry, {
		mapId: 'hero-house',
		regionalBackgrounds: false,
		reviewPackageIds: ['hero-house-review'],
		defaultSelection: null,
		forcedFallback: false
	})
).toEqual({ mode: 'fallback', definition: null });
```

Also assert duplicate package IDs, two requested review package IDs targeting the same map, a package whose descriptor IDs are not unique, a default selection with an unknown package ID, and a package whose definition `mapId` differs from the selected map all fail closed. Resolution priority is forced fallback → regional-backgrounds off → one explicit review package → default selection → fallback.

- [ ] **Step 2: Run the pure test and verify RED**

Run:

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/map-background-package.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the immutable registry contract and generic ownership application**

Create the interfaces above. Freeze package definitions at module boundaries. Implement `applyMapBackgroundPackage()` with one source dispatch table:

```ts
const sources = {
	blocker: map.blockers ?? [],
	decor: map.mapDecor ?? [],
	fence: map.fences ?? [],
	'ground-patch': map.groundPatches ?? [],
	'interior-prop': map.interiorProps ?? []
} as const;
```

For each source type, build `VisualOwnershipAssignment[]`, call the existing `applyVisualOwnership(..., { rejectExisting: true })`, preserve absent optional fields, attach `backgroundImages`, then call `validateMapBackgroundOwnership()`.

Keep `applyMeadowEntryPaintedBackgrounds()` as a thin compatibility adapter that delegates to `applyMapBackgroundPackage()`; do not duplicate source dispatch.

- [ ] **Step 4: Add generic review-option parsing while preserving the legacy flag**

Update `parseWorldRenderOptions()`:

```ts
const mapBackgroundReviewIds = parameters
	.getAll('mapBackgroundReview')
	.filter((value) => value.length > 0);
```

Freeze/copy the array in the returned options. Accept only IDs matching `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`. Add tests for zero, one, repeated distinct, repeated duplicate, empty, uppercase, slash, and whitespace-bearing IDs. Deduplicate exact duplicates while preserving first-seen order. Keep all current `meadowPaintedPilot` assertions.

- [ ] **Step 5: Register the historical Meadow package through the generic table**

In `meadow-entry-painted-v2-runtime.ts`, adapt the current generated descriptors into one frozen `MapBackgroundPackageDefinition`:

```ts
export const MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE_ID =
	'meadow-entry-painted-v2-legacy' as const;

export const MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE = Object.freeze({
	id: MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE_ID,
	mapId: 'meadow-entry',
	coverage: 'historical-partial',
	assets: MEADOW_ENTRY_PAINTED_MODE_PILOT.assets,
	backgrounds: MEADOW_ENTRY_PAINTED_MODE_PILOT.backgrounds,
	visualOwners: MEADOW_ENTRY_PAINTED_MODE_PILOT.visualOwners
}) satisfies MapBackgroundPackageDefinition;
```

Preserve `resolveMeadowEntryPaintedSelection()` as a compatibility facade for existing callers/tests. Add tests that generic and legacy resolution select byte-equivalent descriptor lists.

Until Task 4 changes Meadow geometry, derive its generic default exactly as follows; every other map has `defaultSelection: null`:

```ts
const meadowDefaultSelection =
	MEADOW_ENTRY_DEFAULT_PAINTED_MODE === 'pilot'
		? {
				packageId: MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE_ID,
				mode: 'review' as const
			}
		: null;
```

`MEADOW_ENTRY_PAINTED_MODE_PRODUCTION` remains empty, so Package 1 registers no production default.

- [ ] **Step 6: Write scene RED tests for transactional fallback**

Add focused scene tests proving:

1. A synthetic `coverage: 'full-map'` package with two healthy required backgrounds yields `presentationMode: 'painted'`, renders no legacy ground layer, suppresses ground patches, blocker/decor/fence visuals, and interior props, while collision collections remain unchanged.
2. Missing texture 1, missing texture 2, invalid dimensions, and injected render fault each yield `presentationMode: 'fallback'`, destroy any package images already created, render one complete legacy ground layer, and render every static fallback collection.
3. A partial success never leaves a package image attached to the display list.
4. Stateful landmarks, transitions, pickups, actors, and encounters render in both modes.
5. The historical two-crop package commits both images or neither, retains the legacy ground layer on success, and consults existing per-source ownership instead of claiming full-map suppression.

Run:

```bash
rtk bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL because current rendering commits each plane before package success and never suppresses the ground layer or interior props.

- [ ] **Step 7: Reorder WorldScene presentation without changing collision**

Change the map render sequence to:

```ts
const packageRender = this.renderRegionalBackgroundPackage(map);
if (
	packageRender.presentationMode === 'fallback' ||
	packageRender.coverage === 'historical-partial'
) {
	this.renderGround(map);
}
this.renderMapDecor(map, ['floor', 'furniture'], packageRender);
this.renderFences(map, packageRender);
this.renderBlockers(map, packageRender);
this.renderLandmarks(map);
this.renderInteriorProps(map, ['floor', 'furniture'], packageRender);
```

Repeat the same package argument for foreground decor and interior props. Do not filter blockers, fences, decor collision, interior-prop collision, landmarks, transitions, or interaction records in movement/collision code.

Inside `renderRegionalBackgroundPackage()`, accumulate created images locally and destroy them if the complete required descriptor set is not successful. Preserve one diagnostic entry per attempted descriptor, but expose `selectedBackgroundIds: []` on fallback.

- [ ] **Step 8: Generalize Boot preload and diagnostics**

Resolve requested packages once in BootScene, preload the deduplicated asset-key union, and report the total required/completed keys. Do not preload unrequested review packages. Keep the current renderer and `MAX_TEXTURE_SIZE` fields.

Remove the Boot diagnostic's Meadow-named mode import. Emit sorted package IDs and asset-key inventories so one preload can describe review packages for several maps. In the per-map plane diagnostic, add `packageId: null` for fallback and the exact package ID for review/production.

- [ ] **Step 9: Run focused GREEN**

Run:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/map-background-package.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts \
  src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts \
  src/lib/game/phaser/world-render-options.test.ts \
  src/lib/game/phaser/renderer-diagnostics.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
rtk bun run check
rtk bunx prettier --check \
  src/lib/game/content/backgrounds/map-background-package.ts \
  src/lib/game/content/backgrounds/map-background-package.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.ts \
  src/lib/game/content/maps/meadow-entry-painted-backgrounds.ts \
  src/lib/game/phaser/world-render-options.ts \
  src/lib/game/phaser/renderer-diagnostics.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.ts \
  src/lib/game/phaser/scenes/BootScene.ts \
  src/lib/game/phaser/scenes/WorldScene.ts
rtk bunx eslint \
  src/lib/game/content/backgrounds/map-background-package.ts \
  src/lib/game/phaser/world-render-options.ts \
  src/lib/game/phaser/renderer-diagnostics.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.ts \
  src/lib/game/phaser/scenes/BootScene.ts \
  src/lib/game/phaser/scenes/WorldScene.ts
rtk git diff --check
```

Expected: all pass.

- [ ] **Step 10: Commit Task 2**

```bash
rtk git add \
  src/lib/game/content/backgrounds/map-background-package.ts \
  src/lib/game/content/backgrounds/map-background-package.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts \
  src/lib/game/content/maps/meadow-entry-painted-backgrounds.ts \
  src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts \
  src/lib/game/phaser/world-render-options.ts \
  src/lib/game/phaser/world-render-options.test.ts \
  src/lib/game/phaser/renderer-diagnostics.ts \
  src/lib/game/phaser/renderer-diagnostics.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/BootScene.ts \
  src/lib/game/phaser/scenes/WorldScene.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
rtk git commit -m "feat(world): add map-local background package fallback"
```

---

### Task 3: Prove and Freeze the Reusable Interior and Ruins Layouts

**Files:**
- Create: `src/lib/game/content/maps/layouts/complete-world-layout-foundation.ts`
- Create: `src/lib/game/content/maps/layouts/complete-world-layout-foundation.test.ts`
- Modify: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Create: `docs/superpowers/reports/2026-08-19-complete-world-layout-foundation.md`

**Interfaces:**
- Consumes: `maps`, `VILLAGE_INTERIOR_LAYOUTS`, `collectStrictCollisionRects()`, `collectInteriorPropCollisionRects()`, `collectLandmarkRects()`, and existing route helpers in `maps.test.ts`.
- Produces:

```ts
export const COMPLETE_WORLD_MAP_IDS = [
	'meadow-entry',
	'hero-house',
	'guild-hall',
	'item-shop',
	'villager-house-1',
	'villager-house-2',
	'villager-house-3',
	'shrine-of-aurora-interior',
	'ruins-threshold',
	'ruins-core'
] as const;

export type CompleteWorldMapId = (typeof COMPLETE_WORLD_MAP_IDS)[number];

export const COMPLETE_WORLD_LAYOUT_DECISIONS: Readonly<
	Record<CompleteWorldMapId, { readonly action: 'preserve' | 'change'; readonly reasonIds: readonly string[] }>
>;
```

- Exact decisions:
  - `meadow-entry`: `change`, reasons `continuous-watershed` and `crossing-route-network`.
  - seven interiors: `preserve`, reason `existing-v2-room-program`.
  - `ruins-threshold` and `ruins-core`: `preserve`, reason `expanded-puzzle-shell`.

- [ ] **Step 1: Write the exact decision and map-inventory RED test**

Assert the ten IDs and decisions exactly. Assert `Object.keys(maps).sort()` equals the same sorted ten IDs. Assert no stateful ID is duplicated within its collection on any map.

Run:

```bash
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/complete-world-layout-foundation.test.ts
```

Expected: FAIL because the contract module does not exist.

- [ ] **Step 2: Implement the immutable layout-decision table**

Create only the ten-map constant and type shown above. Freeze each `reasonIds` list and record. Do not add coordinate data or another map registry.

- [ ] **Step 3: Pin the seven current interior programs**

Add a table-driven assertion in `layouts.test.ts` with these exact current contracts:

```ts
const EXPECTED_INTERIOR_PROGRAMS = {
	'guild-hall': {
		size: [32, 26],
		rooms: ['recordsHall', 'commonHall', 'guildMasterOffice', 'trainingHall', 'quartermasterRoom'],
		corridors: ['mainSpine', 'entranceLobby'],
		npcApproaches: ['guildMaster', 'quartermaster']
	},
	'hero-house': {
		size: [22, 18],
		rooms: ['bedroom', 'study', 'livingKitchen'],
		corridors: ['hall'],
		npcApproaches: []
	},
	'item-shop': {
		size: [26, 20],
		rooms: ['stockroom', 'office', 'salesFloor'],
		corridors: ['serviceCorridor'],
		npcApproaches: ['mira']
	},
	'shrine-of-aurora-interior': {
		size: [24, 22],
		rooms: ['innerSanctum', 'westPreparation', 'eastArchive'],
		corridors: ['nave', 'entranceHall'],
		npcApproaches: []
	},
	'villager-house-1': {
		size: [20, 18],
		rooms: ['bedroom', 'storage', 'livingKitchen'],
		corridors: ['hall'],
		npcApproaches: ['lynn']
	},
	'villager-house-2': {
		size: [22, 18],
		rooms: ['workshop', 'bedroom', 'livingArea'],
		corridors: ['hall'],
		npcApproaches: ['toma']
	},
	'villager-house-3': {
		size: [20, 20],
		rooms: ['archiveStudy', 'bedroomStorage', 'sittingRoom'],
		corridors: ['hall'],
		npcApproaches: ['io']
	}
} as const;
```

For every layout, reuse `reachableInteriorSamples()` to prove spawn, exit, every room center, every door center, and every NPC approach are connected under authored walls and prop collision. Do not change `village-interiors-v2.ts`.

- [ ] **Step 4: Pin the two expanded Ruins shells and their routes**

In `maps.test.ts`, retain the exact 200×200 dimensions and current transition/pickup/encounter IDs. Add composed-collision route assertions for:

- Threshold spawn → `threshold-slime-west` → north room pickup → south room pickup → `threshold-slime-east` → core stair.
- Threshold spawn → north optional loop → main route, and spawn → south optional loop → main route.
- Core spawn → north pickup → south pickup → boss approach.
- A movement segment through each existing `future-gate` rectangle is blocked, while the current authored route to required encounters and transitions remains reachable through its intended opening.

Use the existing non-open runtime collision helper; a test helper that ignores blockers/fences/decor collision is forbidden.

- [ ] **Step 5: Prove existing save recovery rather than adding a registry**

Add one table-driven test in `save-state.test.ts` that visits all ten maps, serializes a save at each map's `spawn`, parses it, and proves the coordinate remains unchanged and outside strict, landmark, and interior-prop collision.

Retain the current nearest-walkable and terminal-spawn tests. Do not export `normalizePlayerPosition()` and do not add a safe-arrival table.

- [ ] **Step 6: Write the tracked audit report**

Create `docs/superpowers/reports/2026-08-19-complete-world-layout-foundation.md` with:

- the ten-map decision table;
- exact current dimensions;
- exact room-program keys for the seven interiors;
- exact Ruins route proof names;
- immutable identity policy;
- save policy: clamp → nearest walkable → `map.spawn` terminal fallback;
- a clear statement that only Meadow has a known geometry failure in Package 1.

- [ ] **Step 7: Run focused GREEN**

Run:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/maps/layouts/complete-world-layout-foundation.test.ts \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/save/save-state.test.ts
rtk bun run check
rtk bunx prettier --check \
  src/lib/game/content/maps/layouts/complete-world-layout-foundation.ts \
  src/lib/game/content/maps/layouts/complete-world-layout-foundation.test.ts \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/save/save-state.test.ts \
  docs/superpowers/reports/2026-08-19-complete-world-layout-foundation.md
rtk bunx eslint \
  src/lib/game/content/maps/layouts/complete-world-layout-foundation.ts \
  src/lib/game/content/maps/layouts/complete-world-layout-foundation.test.ts
rtk git diff --check
```

Expected: all pass.

- [ ] **Step 8: Commit Task 3**

```bash
rtk git add \
  src/lib/game/content/maps/layouts/complete-world-layout-foundation.ts \
  src/lib/game/content/maps/layouts/complete-world-layout-foundation.test.ts \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/save/save-state.test.ts \
  docs/superpowers/reports/2026-08-19-complete-world-layout-foundation.md
rtk git commit -m "test(world): prove reusable world layouts"
```

---

### Task 4: Add the Missing Meadow Watershed and Crossing Network

**Files:**
- Modify: `src/lib/game/content/maps/layouts/meadow-entry-v2.ts`
- Modify: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Create: `src/lib/game/content/maps/regions/river-system.ts`
- Create: `src/lib/game/content/maps/regions/river-system.test.ts`
- Modify: `src/lib/game/content/maps/regions/paths.ts`
- Modify: `src/lib/game/content/maps/regions/coast.ts`
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps/regions/soft-maze.test.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts`

**Interfaces:**
- Consumes: `rect()`, `toMapRect()`, `RegionFragment`, `MEADOW_ENTRY_V2_WORLD`, current village/building constants, and composed movement collision.
- Produces:

```ts
export interface MeadowEntryV2LandscapeRect {
	readonly id: string;
	readonly rect: LayoutRect;
}

export const MEADOW_ENTRY_V2_RIVER_SEGMENTS: readonly MeadowEntryV2LandscapeRect[];
export const MEADOW_ENTRY_V2_CROSSINGS: Readonly<Record<string, LayoutRect>>;
export const riverSystemRegion: RegionFragment;
```

- Exact top-left river rectangles:

```ts
export const MEADOW_ENTRY_V2_RIVER_SEGMENTS = [
	{ id: 'silverpine-headwater', rect: rect(3456, 256, 256, 1088) },
	{ id: 'silverpine-falls', rect: rect(3264, 1344, 448, 512) },
	{ id: 'north-river', rect: rect(3040, 1856, 320, 480) },
	{ id: 'central-river', rect: rect(2880, 2496, 480, 1056) },
	{ id: 'lower-river', rect: rect(2784, 3744, 480, 768) },
	{ id: 'river-delta', rect: rect(2816, 4736, 672, 512) },
	{ id: 'estuary-west', rect: rect(3008, 5248, 496, 896) },
	{ id: 'estuary-east', rect: rect(3712, 5248, 384, 896) }
] as const;

export const MEADOW_ENTRY_V2_CROSSINGS = {
	silverpineBridge: rect(2880, 2336, 1024, 160),
	mistfenBridge: rect(2368, 3552, 1536, 192),
	sundropBridge: rect(2496, 4512, 1248, 224),
	ferryApproach: rect(3504, 5248, 208, 896)
} as const;
```

- Each river segment becomes one `seaTile` ground patch and one collision-only `ocean` blocker with the same bounds.
- Each crossing becomes a `pathTile` ground patch; no water blocker intersects a crossing.
- `coast-fisher` moves from `(3840,5570)` to `(4224,5570)` because the old point becomes estuary collision. Its ID and role remain unchanged. No other stateful Meadow coordinate changes.

- [ ] **Step 1: Write exact river/crossing RED tests**

In `layouts.test.ts` and `river-system.test.ts`, assert:

- the exact eight segment IDs/bounds and four crossing bounds above;
- every rectangle is within `MEADOW_ENTRY_V2_WORLD`;
- water and crossing interiors do not overlap;
- the ordered vertical gaps are exactly 160 pixels, 192 pixels, and 224 pixels for the three bridges;
- the estuary gap is exactly 208 pixels wide and contains the ferry/discovery approach axis at `x=3600`;
- compiled ground patches and blockers share exact bounds after `toMapRect()` conversion;
- all IDs are unique.

Run:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps/regions/river-system.test.ts
```

Expected: FAIL because the landscape constants and region do not exist.

- [ ] **Step 2: Add the exact landscape constants and compile the river fragment**

Add the two exported constants exactly as shown. In `river-system.ts`:

```ts
const groundPatches = MEADOW_ENTRY_V2_RIVER_SEGMENTS.map(({ id, rect: bounds }) => ({
	...toMapRect(`${id}-water`, bounds),
	tile: 'seaTile' as const
}));

const blockers = MEADOW_ENTRY_V2_RIVER_SEGMENTS.map(({ id, rect: bounds }) => ({
	...toMapRect(`${id}-collision`, bounds),
	kind: 'ocean' as const
}));

const crossingPatches = Object.entries(MEADOW_ENTRY_V2_CROSSINGS).map(([id, bounds]) => ({
	...toMapRect(`${id}-path`, bounds),
	tile: 'pathTile' as const
}));

export const riverSystemRegion: RegionFragment = {
	groundPatches: [...groundPatches, ...crossingPatches],
	blockers
};
```

Register `riverSystemRegion` once in `mergeRegions()` after `pathsRegion` and before `meadowBoundsRegion`. This ordering makes river water override legacy regional/path tiles while the crossing patches, which are last inside `riverSystemRegion.groundPatches`, override that water only in the four declared gaps.

- [ ] **Step 3: Retarget the shared route rectangles to the crossings**

Replace the cross-region route inventory with these exact path rectangles:

```ts
export const MEADOW_ENTRY_V2_ROUTE_PATCHES = [
	{ id: 'village-west-main-street', owner: 'paths', rect: rect(256, 4608, 2240, 160) },
	{ id: 'village-river-crossing', owner: 'paths', rect: MEADOW_ENTRY_V2_CROSSINGS.sundropBridge },
	{ id: 'crossroads-south-approach', owner: 'paths', rect: rect(3360, 4448, 384, 320) },
	{ id: 'crossroads-to-mistfen', owner: 'paths', rect: MEADOW_ENTRY_V2_CROSSINGS.mistfenBridge },
	{ id: 'crossroads-to-silverpine', owner: 'paths', rect: MEADOW_ENTRY_V2_CROSSINGS.silverpineBridge },
	{ id: 'silverpine-south-approach', owner: 'paths', rect: rect(3808, 2496, 192, 320) },
	{ id: 'crossroads-to-wildwood', owner: 'paths', rect: rect(4544, 3824, 448, 160) },
	{ id: 'crossroads-to-coast', owner: 'paths', rect: rect(4128, 4768, 192, 800) },
	{ id: 'mistfen-west-approach', owner: 'mistfen', rect: rect(2240, 3552, 128, 192) },
	{ id: 'silverpine-north-approach', owner: 'silverpine', rect: rect(2816, 2176, 192, 160) },
	{ id: 'wildwood-mouth', owner: 'wildwood', rect: rect(4896, 3776, 192, 384) }
] as const;
```

Set `MEADOW_ENTRY_V2_ROUTES.crossroadsPlaza` to `rect(3360,3456,1184,1312)` and `crossroadsNorthTrunk` to `rect(3808,2816,192,640)`. Keep village lots, footprints, doors, transitions, and all seven exterior return arrivals unchanged.

Preserve the public route object keys with these exact values so current consumers do not need a second route API:

```ts
export const MEADOW_ENTRY_V2_ROUTES = {
	villageMainStreet: rect(256, 4608, 2560, 160),
	villageToCrossroads: MEADOW_ENTRY_V2_CROSSINGS.sundropBridge,
	crossroadsPlaza: rect(3360, 3456, 1184, 1312),
	crossroadsNorthTrunk: rect(3808, 2816, 192, 640),
	crossroadsToMistfen: MEADOW_ENTRY_V2_CROSSINGS.mistfenBridge,
	crossroadsToSilverpine: MEADOW_ENTRY_V2_CROSSINGS.silverpineBridge,
	crossroadsToWildwood: rect(4544, 3824, 448, 160),
	crossroadsToCoast: rect(4128, 4768, 192, 800)
} as const;
```

- [ ] **Step 4: Move only the coast fisher and assert every stateful clearance**

In `coast.ts`, change only the `coast-fisher` coordinates to `(4224,5570)`. Add a table-driven map test that checks every transition, ambient NPC, pickup, discovery, encounter, and landmark approach against river blockers expanded by `PLAYER_COLLISION_RADIUS`. Assert the full ID lists are unchanged from the Task 3 inventory.

- [ ] **Step 5: Add composed-collision critical and optional route proofs**

Extend `soft-maze.test.ts` using actual Meadow blockers, fences, decor collision, landmark collision, and the player radius. Prove routes between these exact anchors:

```ts
const MEADOW_LAYOUT_ROUTE_ANCHORS = {
	heroHouse: { x: 704, y: 5920 },
	villageBridgeWest: { x: 2496, y: 4624 },
	villageBridgeEast: { x: 3744, y: 4624 },
	crossroads: { x: 3904, y: 4224 },
	mistfen: { x: 2240, y: 3648 },
	silverpine: { x: 3904, y: 2416 },
	wildwood: { x: 4992, y: 3904 },
	coast: { x: 4224, y: 5120 },
	cave: { x: 5760, y: 1868 },
	ferry: { x: 3600, y: 5500 }
} as const;
```

Required routes: Hero House → Crossroads; Crossroads → Mistfen; Crossroads → Silverpine; Crossroads → Wildwood → Cave; Crossroads → Coast; Coast → Ferry. Optional loops must leave and rejoin the main route in Mistfen, Silverpine, and Wildwood. Add negative assertions that water blocks a direct crossing outside each bridge/ford gap.

- [ ] **Step 6: Make the historical painted package opt-in in the geometry commit**

Change:

```ts
export const MEADOW_ENTRY_DEFAULT_PAINTED_MODE: MeadowEntryPaintedMode = 'fallback';
```

Update tests so plain selection is fallback, explicit `?meadowPaintedPilot=on` and generic `mapBackgroundReview=meadow-entry-painted-v2-legacy` still select the immutable two-crop package, and `off` remains highest priority. Do not modify any historical PNG, manifest, provenance, or generated runtime bytes.

- [ ] **Step 7: Run focused GREEN and no-drift checks**

Run:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps/regions/river-system.test.ts \
  src/lib/game/content/maps/regions/soft-maze.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/save/save-state.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts
rtk bun run check
rtk bunx prettier --check \
  src/lib/game/content/maps/layouts/meadow-entry-v2.ts \
  src/lib/game/content/maps/regions/river-system.ts \
  src/lib/game/content/maps/regions/river-system.test.ts \
  src/lib/game/content/maps/regions/paths.ts \
  src/lib/game/content/maps/regions/coast.ts \
  src/lib/game/content/maps/meadow-entry.ts
rtk bunx eslint \
  src/lib/game/content/maps/layouts/meadow-entry-v2.ts \
  src/lib/game/content/maps/regions/river-system.ts \
  src/lib/game/content/maps/regions/river-system.test.ts
rtk git diff --check
```

Expected: all pass; tracked historical painted-v2 artifacts show no diff.

- [ ] **Step 8: Commit Task 4**

```bash
rtk git add \
  src/lib/game/content/maps/layouts/meadow-entry-v2.ts \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps/regions/river-system.ts \
  src/lib/game/content/maps/regions/river-system.test.ts \
  src/lib/game/content/maps/regions/paths.ts \
  src/lib/game/content/maps/regions/coast.ts \
  src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/content/maps/regions/soft-maze.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/save/save-state.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts
rtk git commit -m "feat(world): add Meadow river route foundation"
```

---

### Task 5: Render Deterministic Ten-Map Layout Evidence

**Files:**
- Create: `tools/render-complete-world-layout-review.ts`
- Create: `tools/render-complete-world-layout-review.test.ts`
- Create: `docs/superpowers/reports/img/complete-world-layout-foundation/inventory.json`
- Create: `docs/superpowers/reports/img/complete-world-layout-foundation/meadow-entry.png`
- Create: `docs/superpowers/reports/img/complete-world-layout-foundation/hero-house.png`
- Create: `docs/superpowers/reports/img/complete-world-layout-foundation/guild-hall.png`
- Create: `docs/superpowers/reports/img/complete-world-layout-foundation/item-shop.png`
- Create: `docs/superpowers/reports/img/complete-world-layout-foundation/villager-house-1.png`
- Create: `docs/superpowers/reports/img/complete-world-layout-foundation/villager-house-2.png`
- Create: `docs/superpowers/reports/img/complete-world-layout-foundation/villager-house-3.png`
- Create: `docs/superpowers/reports/img/complete-world-layout-foundation/shrine-of-aurora-interior.png`
- Create: `docs/superpowers/reports/img/complete-world-layout-foundation/ruins-threshold.png`
- Create: `docs/superpowers/reports/img/complete-world-layout-foundation/ruins-core.png`
- Create: `docs/superpowers/reports/img/complete-world-layout-foundation/meadow-river-crossings.png`
- Modify: `docs/superpowers/reports/2026-08-19-complete-world-layout-foundation.md`

**Interfaces:**
- Consumes: active `maps`, `COMPLETE_WORLD_LAYOUT_DECISIONS`, Meadow route/river constants, and Sharp already present in `package.json`.
- Produces:

```ts
export interface CompleteWorldLayoutReviewEntry {
	readonly mapId: CompleteWorldMapId;
	readonly disposition: 'preserved' | 'changed';
	readonly reasonIds: readonly string[];
	readonly worldDimensions: { readonly width: number; readonly height: number };
	readonly reviewDimensions: { readonly width: number; readonly height: number };
	readonly imagePath: string;
	readonly imageSha256: string;
	readonly counts: Readonly<Record<string, number>>;
}

export async function renderCompleteWorldLayoutReview(input: {
	readonly outputRoot: string;
	readonly check: boolean;
}): Promise<readonly CompleteWorldLayoutReviewEntry[]>;
```

- Review sizing: `scale = min(1, 1600 / worldWidth, 1600 / worldHeight)`, then `ceil(worldWidth * scale)` by `ceil(worldHeight * scale)`. Meadow and both Ruins pages have a 1600-pixel maximum edge; current interiors render at native world-pixel dimensions.
- Fixed colors: legacy terrain `#25322a`, authored ground patches `#4ade80`, water `#2563eb`, blockers `#ef4444`, fences `#f97316`, collidable decor/props `#a855f7`, landmarks `#64748b`, transitions `#facc15`, actors `#22d3ee`, pickups/discoveries `#bef264`, route anchors/segments `#ffffff`.

- [ ] **Step 1: Write RED tests for deterministic inventory and no-write check**

Test a temporary output root. Assert exactly 11 PNGs plus `inventory.json`, ten map entries, one entry per map ID, correct review dimensions, canonical PNG metadata, deterministic SHA-256 on a second render, and `--check` detects one byte changed in a PNG or JSON file without rewriting it.

Run:

```bash
rtk bun test tools/render-complete-world-layout-review.test.ts
```

Expected: FAIL because the renderer does not exist.

- [ ] **Step 2: Implement one SVG-to-PNG renderer over active map data**

Build SVG strings directly from the active records, then encode with Sharp. Draw base terrain first, followed by ground patches, blockers, fences, collidable decor/props, landmarks, transitions, stateful markers, and route proof lines. The tool may import map data; it may not re-declare geometry.

Render `meadow-river-crossings.png` as a crop of the world rectangle `{ left: 2048, top: 2048, right: 4352, bottom: 6144 }`, scaled to a 1152-pixel maximum edge, with river segments, crossings, route anchors, and stateful clearances labeled.

- [ ] **Step 3: Implement deterministic inventory and check mode**

Sort map entries by `COMPLETE_WORLD_MAP_IDS`, sort count keys alphabetically, serialize JSON with a final newline, and write atomically through a temporary sibling path. In check mode, render in memory, compare every required byte, reject missing/extra files, and perform no writes.

- [ ] **Step 4: Render the committed evidence and inspect all 11 PNGs**

Run:

```bash
rtk bun tools/render-complete-world-layout-review.ts
```

Inspect every PNG at original detail. Reject if:

- a required route enters red/orange/purple collision;
- a transition or stateful marker is embedded in collision;
- a bridge does not connect both banks;
- the river visually stops outside a declared bridge gap;
- a preserved interior/Ruins layout differs from its current authored dimensions or program;
- any label or color layer is clipped.

Record the inspection verdict and exact inventory SHA in the tracked report.

- [ ] **Step 5: Run renderer GREEN and check mode**

Run:

```bash
rtk bun test tools/render-complete-world-layout-review.test.ts
rtk bun tools/render-complete-world-layout-review.ts --check
rtk bun run check
rtk bunx prettier --check \
  tools/render-complete-world-layout-review.ts \
  tools/render-complete-world-layout-review.test.ts \
  docs/superpowers/reports/img/complete-world-layout-foundation/inventory.json \
  docs/superpowers/reports/2026-08-19-complete-world-layout-foundation.md
rtk bunx eslint tools/render-complete-world-layout-review.ts tools/render-complete-world-layout-review.test.ts
rtk git diff --check
```

Expected: all pass and check mode reports current bytes.

- [ ] **Step 6: Commit Task 5**

```bash
rtk git add \
  tools/render-complete-world-layout-review.ts \
  tools/render-complete-world-layout-review.test.ts \
  docs/superpowers/reports/2026-08-19-complete-world-layout-foundation.md \
  docs/superpowers/reports/img/complete-world-layout-foundation
rtk git commit -m "test(world): render complete layout foundation"
```

---

### Task 6: Validate the Fallback-Mode World Journey in a Real Browser

**Files:**
- Modify: `tests/e2e/game.e2e.ts`
- Create: `docs/superpowers/reports/2026-08-19-complete-world-layout-browser.md`
- Modify: `docs/superpowers/reports/2026-08-19-complete-world-layout-foundation.md`

**Interfaces:**
- Consumes: existing Playwright route helpers, trusted keyboard helpers, regional-background diagnostics, map transition fixtures, and save/reload helpers.
- Produces two exact E2E titles:
  - `Complete world layout foundation keeps historical Meadow art opt-in`
  - `Complete world layout foundation traverses every map in fallback mode`

- [ ] **Step 1: Write the RED browser assertions before changing route support**

The first test must load plain `/` and prove the selected Meadow package is fallback, then load `/?meadowPaintedPilot=on` and prove package ID `meadow-entry-painted-v2-legacy` is selected. It must also inject one legacy Meadow background render fault and prove `presentationMode: 'fallback'`, `selectedBackgroundIds: []`, and complete legacy static presentation.

The second test must use `/?meadowPaintedPilot=off&movementDiagnostics=on` at 1920×1080 and traverse:

1. Hero House exit.
2. All seven Meadow interiors, returning to the exact authored exterior arrival after each.
3. Village bridge → Crossroads.
4. Mistfen bridge and optional loop.
5. Silverpine bridge and optional loop.
6. Wildwood route, optional loop, and cave entrance.
7. Tidewatch/coast and ferry approach.
8. Ruins Threshold main route plus north and south loops.
9. Ruins Core north pickup, south pickup, and boss approach.
10. Save in Meadow, reload, and continue from a walkable coordinate.

Assert exact map IDs at transitions, representative NPC/shop/quest/pickup/discovery interaction, route movement diagnostics with `blocked: false`, and collision debug parity where available.

Seed the test save once with `threshold-slime-west` and `threshold-slime-east` in `clearedEncounterIds` so the existing `requiresClear` stair to `ruins-core` is available. Package 1 proves encounter approaches through composed-collision unit tests; it does not claim browser combat acceptance. Do not seed map coordinates after the initial save.

- [ ] **Step 2: Run the two titles and verify RED only at new assertions**

Run:

```bash
rtk bun run build
rtk bun run test:e2e -- --grep "Complete world layout foundation"
```

Expected: both tests are discovered; failures point to missing new test support or the new route contract, not build or preview startup.

- [ ] **Step 3: Reuse existing helpers and add only exact route fixtures**

Add route constants for the Task 4 anchors and existing interior/Ruins paths. Do not widen `AXIS_REACH_TOLERANCE`, increase correction attempts, inject player coordinates after the initial save seed, teleport between checkpoints, or change production movement.

When a route fails, stop after one focused reproduction and diagnose collision/waypoint geometry. Fix authored geometry if the route proof is wrong; do not tune the browser driver around a real collision.

- [ ] **Step 4: Run individual GREEN, then repeat the combined suite**

Run:

```bash
rtk bun run test:e2e -- --grep "keeps historical Meadow art opt-in"
rtk bun run test:e2e -- --grep "traverses every map in fallback mode"
rtk bun run test:e2e -- --grep "Complete world layout foundation" --repeat-each=2
```

Expected: 1/1, 1/1, then 4/4 pass.

- [ ] **Step 5: Write the browser report**

Record viewport, exact URLs, selected/fallback package diagnostics, map sequence, every interior/Ruins transition, route tokens, interaction evidence, save/reload coordinate, individual durations, repeat results, and any browser-only limitation. Do not claim final painted-art or native/Tauri acceptance; those belong to later packages.

- [ ] **Step 6: Run final Package 1 verification**

Run:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/backgrounds/map-background-package.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts \
  src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts \
  src/lib/game/content/maps/layouts/complete-world-layout-foundation.test.ts \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps/regions/river-system.test.ts \
  src/lib/game/content/maps/regions/soft-maze.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/save/save-state.test.ts \
  src/lib/game/phaser/world-render-options.test.ts \
  src/lib/game/phaser/renderer-diagnostics.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
rtk bun test tools/render-complete-world-layout-review.test.ts
rtk bun tools/render-complete-world-layout-review.ts --check
rtk bun run check
rtk bun run lint
rtk git diff --check
rtk git lfs fsck
```

Expected: all pass. If whole-repository lint reports only preserved untracked `.playwright-cli` YAML, run targeted Prettier/ESLint on every tracked changed text file, record the baseline limitation, and do not modify the preserved artifacts.

- [ ] **Step 7: Commit Task 6**

```bash
rtk git add \
  tests/e2e/game.e2e.ts \
  docs/superpowers/reports/2026-08-19-complete-world-layout-browser.md \
  docs/superpowers/reports/2026-08-19-complete-world-layout-foundation.md
rtk git commit -m "test(world): validate complete layout journeys"
```

- [ ] **Step 8: Perform final scope and history audit**

Run:

```bash
rtk git status --short --branch
rtk git log --oneline --decorate -8
rtk git diff --name-status 4eb8bf27a14e32e540931ccf1f80a7f7f514aee2..HEAD
rtk git diff --check 4eb8bf27a14e32e540931ccf1f80a7f7f514aee2..HEAD
```

Expected: only Package 1 source/tests/tools/reports/evidence are in the range; no final art, story, save-schema, crop-export, or unrelated untracked file is included.
