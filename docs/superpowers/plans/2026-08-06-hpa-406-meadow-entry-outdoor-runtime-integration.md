# HPA-406 Meadow Entry Outdoor Runtime Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all 22 approved HPA-496 Meadow Entry exports through the existing HPA-398 background runtime, preserve live gameplay/collision/fallback ownership, and finish outdoor acceptance with the smallest runtime extension.

**Architecture:** Treat HPA-406 as frozen integration. Run one real texture-safety preflight, then use one direct Meadow Entry runtime registry, add `drawOrder` to the existing background descriptor, extend the existing fallback visual contract from blockers to decor/fences, and keep `WorldScene` background planes independent. Delete the zero-consumer generic adapter and full frozen-art every-PR CI instead of extending them.

**Tech Stack:** TypeScript 6, Phaser 4, Vite, Vitest 4, Playwright 1.59, Bun, Sharp, Tauri 2, Git LFS.

## Global Constraints

- HPA-406 is `frozen-integration`: approved geometry and art are inputs, not design work.
- HPA-399 crop geometry, overlap ownership, bake/fallback ownership, and draw order are frozen.
- HPA-496 filenames, texture keys, dimensions, bytes, hashes, planes, and approved PNG pixels are frozen.
- HPA-398 Sundrop Village background and multi-owner fallback behavior must remain unchanged except for adding explicit `drawOrder: 1000`.
- Collision, buildings, NPCs, pickups, discoveries, encounters, gates, transitions, minimap markers, and save semantics remain live and authoritative.
- Do not add a Story Integration Catalog, Area Expansion Packet, generic art-package adapter, runtime-package schema, dependency graph, load-strategy enum, streaming/residency manager, or new approval layer.
- Base and foreground planes remain independent. A missing foreground must not invalidate a successfully rendered base.
- Fix crop/art defects at HPA-399/HPA-496 ownership instead of compensating with a translation layer.
- Normal PR CI must not rerun the full frozen HPA-496 production-art package.
- Use tests for failure permutations and one concrete controller walkthrough for subjective/runtime acceptance.

---

## Delivery shape

### Implementation PR 1 — Crossroads and connector proof

PR 1 owns the reusable seam and integrates these 13 HPA-496 textures:

```text
sundrop-village-underlay-base.png
village-crossroads-connector-base.png
village-crossroads-connector-foreground.png
crossroads-coast-connector-base.png
crossroads-coast-connector-foreground.png
crossroads-mistfen-connector-base.png
crossroads-mistfen-connector-foreground.png
crossroads-silverpine-connector-base.png
crossroads-silverpine-connector-foreground.png
crossroads-wildwood-connector-base.png
crossroads-wildwood-connector-foreground.png
crossroads-base.png
crossroads-foreground.png
```

### Implementation PR 2 — Remaining regions and final acceptance

PR 2 appends the remaining 9 HPA-496 textures:

```text
tidewatch-coast-base.png
tidewatch-coast-foreground.png
mistfen-base.png
mistfen-foreground.png
silverpine-base.png
silverpine-foreground.png
wildwood-base.png
wildwood-foreground.png
outer-boundary-east-forest-lane-base.png
```

PR 2 must not create another abstraction. If the remaining nine records cannot be added through the PR-1 seam, fix that seam before proceeding.

---

### Task 1: Prove the Approved Texture Package Is Viable

**Files:**
- Create: `tools/probe-meadow-entry-texture-safety.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `meadowEntryArtPackageApproval.exports` from `src/lib/game/content/approvals/meadow-entry-art-package.ts`.
- Produces: CLI command `bun run world:probe:meadow-entry-textures` and a stdout JSON/summary with a hard `proceed` or `stop` decision.

- [ ] **Step 1: Add the probe script entry**

Add:

```json
"world:probe:meadow-entry-textures": "bun tools/probe-meadow-entry-texture-safety.ts"
```

Do not add a load-strategy or runtime package command.

- [ ] **Step 2: Implement the standalone server/browser probe**

The script must build the probe inventory directly from the approved exports:

```ts
import { chromium } from '@playwright/test';
import { meadowEntryArtPackageApproval } from '../src/lib/game/content/approvals/meadow-entry-art-package';

const exports = meadowEntryArtPackageApproval.exports.map((asset) => ({
	id: `${asset.cropId}:${asset.plane}`,
	path: asset.path,
	width: asset.width,
	height: asset.height
}));

if (exports.length !== 22) {
	throw new Error(`Expected 22 approved Meadow Entry exports, found ${exports.length}`);
}
```

Serve only those approved artifact paths with a small Bun HTTP server. In Chromium, create WebGL2 or WebGL1, query `MAX_TEXTURE_SIZE`, fetch/decode each PNG, upload it with `texImage2D`, and keep every successful `WebGLTexture` alive until the entire inventory has been attempted.

Track:

```ts
{
	maxTextureSize,
	results: [{ id, width, height, status, ms, error? }],
	contextLost,
	totalMs,
	environment: { browser, platform },
	decision: 'proceed' | 'stop'
}
```

Set `decision: 'stop'` when any approved dimension exceeds `MAX_TEXTURE_SIZE`, any upload fails, WebGL context loss occurs, or aggregate allocation cannot complete.

- [ ] **Step 3: Run the probe before any runtime architecture work**

Run:

```bash
bun run world:probe:meadow-entry-textures
```

Expected when viable:

```text
22/22 textures uploaded
contextLost=false
decision=proceed
```

Record `MAX_TEXTURE_SIZE`, failures if any, aggregate behavior, approximate timing, and environment in the implementation PR description.

If the result is `stop`, stop HPA-406 implementation. Route an individual texture/dimension failure to HPA-399/HPA-496 or create one measured load-management ticket for aggregate residency failure.

- [ ] **Step 4: Commit the probe**

```bash
git add package.json tools/probe-meadow-entry-texture-safety.ts
git commit -m "test(hpa-406): probe meadow texture safety"
```

---

### Task 2: Delete the Superseded Adapter and Every-PR Art Validation

**Files:**
- Delete: `art-map-adapters/meadow-entry.v1.json`
- Delete: `tools/art-map-package.ts`
- Delete: `src/lib/game/content/backgrounds/art-map-package-adapter.test.ts`
- Delete: `src/lib/game/content/backgrounds/fixtures/future-map-adapter.v1.json`
- Delete: `docs/superpowers/specs/hpa-495-art-map-package-adapter-v1.md`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: current repository search results.
- Produces: no generic `art:map-package` surface and no dedicated full Meadow Entry art-package job in normal PR CI.

- [ ] **Step 1: Prove the adapter has no real consumer**

Run:

```bash
git grep -n -E 'art:map-package|art-map-adapters/meadow-entry|art-map-package\.ts|hpa-495-art-map-package-adapter-v1' -- . \
  ':(exclude)docs/superpowers/plans/2026-07-30-hpa-399-*'
```

Expected real-code hits are limited to the adapter command/test/spec itself, `package.json`, and historical explanatory references. If an active runtime/workflow consumer appears, stop this deletion step and document it before changing anything.

- [ ] **Step 2: Delete the zero-consumer adapter surface**

Delete the five files listed above and remove:

```json
"art:map-package": "bun tools/art-map-package.ts"
```

from `package.json`.

Do not rewrite the historical HPA-399/HPA-496 implementation plans merely because they describe the old exploration.

- [ ] **Step 3: Remove full frozen-art checks from normal PR CI**

Delete the complete job:

```yaml
meadow-entry-art-package:
  name: Meadow Entry Art Package
  ...
  - name: Validate HPA-399 art package
    run: bun run art:validate:meadow-entry
```

Also remove the `build-and-lint` step:

```yaml
- name: Verify Meadow Entry Git LFS storage
  run: bun run art:storage:meadow-entry
```

Keep `art:validate:meadow-entry`, `art:storage:meadow-entry`, finalize/export/proof/approve commands in `package.json` for manual/local repair of the production package.

- [ ] **Step 4: Verify cleanup**

Run:

```bash
bun run check
bun run lint
git grep -n 'art:map-package' -- package.json .github src tools art-map-adapters || true
```

Expected: check/lint pass and no live `art:map-package` command or implementation remains.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(hpa-406): remove unused meadow art adapter"
```

---

### Task 3: Add Deterministic Background Draw Order

**Files:**
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/background-ownership.ts`
- Modify: `src/lib/game/content/maps/background-ownership.test.ts`
- Modify: `src/lib/game/content/maps/layered/region-background.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps/regions/village-layered.test.ts`
- Modify: `tools/render-sundrop-village-obstacle-proof.ts`

**Interfaces:**
- Produces: required `MapBackgroundImage.drawOrder: number` and `getMapBackgroundDepth(background)`.
- Existing Sundrop descriptors produce `drawOrder: 1000`.

- [ ] **Step 1: Write failing depth/order tests**

Update background fixtures to include `drawOrder`. Add tests equivalent to:

```ts
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 0 })).toBe(-9);
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 240 })).toBe(-8.976);
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 1000 })).toBe(-8.9);
expect(getMapBackgroundDepth({ plane: 'foreground', drawOrder: 1000 })).toBe(100.1);
```

Add validation cases rejecting negative, non-integer, greater-than-1000, and duplicate `(plane, drawOrder)` descriptors.

- [ ] **Step 2: Run red tests**

```bash
bun run test:unit -- --run src/lib/game/content/maps/background-ownership.test.ts src/lib/game/content/maps/regions/village-layered.test.ts
```

Expected: failures because `drawOrder` is not yet part of the descriptor/helper.

- [ ] **Step 3: Extend the existing descriptor**

In `maps/types.ts`:

```ts
export interface MapBackgroundImage extends MapRect {
	textureKey: string;
	plane: MapBackgroundPlane;
	drawOrder: number;
}
```

In `background-ownership.ts`:

```ts
const BACKGROUND_ORDER_SCALE = 10_000;

export function getMapBackgroundDepth(
	background: Pick<MapBackgroundImage, 'plane' | 'drawOrder'>
): number {
	return MAP_BACKGROUND_DEPTHS[background.plane] + background.drawOrder / BACKGROUND_ORDER_SCALE;
}
```

Extend `validateMapBackgroundOwnership(...)` to validate order while keeping its current descriptor-ID and owner-ID checks.

- [ ] **Step 4: Thread draw order through the only current helper**

Update `createLayeredRegionBackground(...)` input:

```ts
input: {
	id: string;
	textureKey: string;
	plane: MapBackgroundPlane;
	drawOrder: number;
}
```

Return `drawOrder: input.drawOrder`.

Set both current HPA-398 village call sites to:

```ts
drawOrder: 1_000
```

Update the village/proof fixtures rather than adding defaults. A missing draw order should be a compile-time failure.

- [ ] **Step 5: Run green tests and static check**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
bun run check
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/content/maps src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts tools/render-sundrop-village-obstacle-proof.ts
git commit -m "feat(hpa-406): order regional backgrounds"
```

---

### Task 4: Add the Direct PR-1 Runtime Registry and Approved Runtime Assets

**Files:**
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts`
- Create: `src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts`
- Create: `public/game/assets/regions/meadow-entry/` with the 13 PR-1 PNGs
- Modify: `.gitattributes`
- Modify: `src/lib/game/content/assets.ts`
- Modify: `src/lib/game/content/assets.test.ts`

**Interfaces:**
- Produces: `MEADOW_ENTRY_RUNTIME_BACKGROUNDS`, `meadowEntryRuntimeBackgroundImages`, and `meadowEntryRuntimeBackgroundAssets`.
- Runtime code does not import HPA-399/HPA-496 authoring modules; tests may import them.

- [ ] **Step 1: Write the failing registry contract test**

Define the runtime type in the new module:

```ts
import type { MapBackgroundImage } from '$lib/game/content/maps/types';

export type MeadowEntryRuntimeBackgroundDefinition = MapBackgroundImage & {
	cropId: string;
	path: string;
};
```

In the test, import:

```ts
import { meadowEntryArtPackageApproval } from '$lib/game/content/approvals/meadow-entry-art-package';
import { MEADOW_ENTRY_APPROVED_CROPS } from '$lib/game/content/backgrounds/meadow-entry-crop-manifest';
```

Assert the PR-1 crop/plane key set is exactly:

```ts
const PR1_KEYS = [
	'sundrop-village-underlay:base',
	'village-crossroads-connector:base',
	'village-crossroads-connector:foreground',
	'crossroads-coast-connector:base',
	'crossroads-coast-connector:foreground',
	'crossroads-mistfen-connector:base',
	'crossroads-mistfen-connector:foreground',
	'crossroads-silverpine-connector:base',
	'crossroads-silverpine-connector:foreground',
	'crossroads-wildwood-connector:base',
	'crossroads-wildwood-connector:foreground',
	'crossroads:base',
	'crossroads:foreground'
] as const;
```

For each runtime record, find the approved export and crop, then assert:

```ts
expect(runtime.textureKey).toBe(approved.textureKey);
expect(runtime.drawOrder).toBe(approved.drawOrder);
expect(runtime.plane).toBe(approved.plane);
expect(runtime.width).toBe(approved.width);
expect(runtime.height).toBe(approved.height);
expect(runtime.x).toBe((crop.bounds.left + crop.bounds.right) / 2);
expect(runtime.y).toBe((crop.bounds.top + crop.bounds.bottom) / 2);
expect(runtime.path).toBe(`/game/assets/regions/meadow-entry/${approved.path.split('/').at(-1)}`);
expect(runtime.id).toBe(`${approved.textureKey}-image`);
```

- [ ] **Step 2: Run the test red**

```bash
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts
```

Expected: fail because the runtime registry is empty/missing.

- [ ] **Step 3: Extract exact approved rows instead of transcribing from memory**

Run:

```bash
bun -e "const p=await Bun.file('artifacts/meadow-entry/hpa-399/provenance/meadow-entry-export-provenance.json').json(); const wanted=new Set(['sundrop-village-underlay','village-crossroads-connector','crossroads-coast-connector','crossroads-mistfen-connector','crossroads-silverpine-connector','crossroads-wildwood-connector','crossroads']); console.log(JSON.stringify(p.inventory.filter((x:any)=>wanted.has(x.cropId)), null, 2))"
```

Use those exact bounds/dimensions/keys/orders to author the 13 runtime records. Do not invent or normalize coordinates.

Export projections without duplicating data:

```ts
export const meadowEntryRuntimeBackgroundImages = MEADOW_ENTRY_RUNTIME_BACKGROUNDS.map(
	({ cropId: _cropId, path: _path, ...background }) => background
);

export const meadowEntryRuntimeBackgroundAssets = MEADOW_ENTRY_RUNTIME_BACKGROUNDS.map(
	({ textureKey, path }) => ({ key: textureKey, path })
);
```

- [ ] **Step 4: Copy the exact 13 approved files to the runtime path**

Create the directory and copy the listed PR-1 filenames directly from:

```text
artifacts/meadow-entry/hpa-399/exports/
```

into:

```text
public/game/assets/regions/meadow-entry/
```

Do not re-encode the PNGs.

Add to `.gitattributes`:

```text
public/game/assets/regions/meadow-entry/**/*.png filter=lfs diff=lfs merge=lfs -text
```

- [ ] **Step 5: Write the cheap runtime asset integrity test**

In `meadow-entry-runtime-assets.asset.test.ts`, for every runtime record:

1. resolve the corresponding public file;
2. verify it exists;
3. read dimensions with `sharp(...).metadata()`;
4. hash the raw file bytes with SHA-256;
5. compare dimensions/hash to `meadowEntryArtPackageApproval.exports`.

The assertion shape should be explicit:

```ts
expect({ width: metadata.width, height: metadata.height }).toEqual({
	width: approved.width,
	height: approved.height
});
expect(sha256(bytes)).toBe(approved.sha256);
```

This is the cheap normal-CI guard that replaces rerunning the production art pipeline.

- [ ] **Step 6: Register the assets through the existing asset seam**

In `assets.ts`:

```ts
import { meadowEntryRuntimeBackgroundAssets } from '$lib/game/content/backgrounds/meadow-entry-runtime-backgrounds';

export const regionalBackgroundAssets = [
	...existingSundropAssets,
	...meadowEntryRuntimeBackgroundAssets
] as const;
```

Keep the existing HPA-398 approval metadata where it already exists. Do not require runtime HPA-496 records to carry production approval metadata.

- [ ] **Step 7: Run focused tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts \
  src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts \
  src/lib/game/content/assets.test.ts
bun run check
```

Expected: 13 runtime records and assets match the approved HPA-496 inputs exactly.

- [ ] **Step 8: Commit**

```bash
git add .gitattributes src/lib/game/content public/game/assets/regions/meadow-entry
git commit -m "feat(hpa-406): register crossroads background assets"
```

---

### Task 5: Generalize Visual Ownership to Blockers, Decor, and Fences

**Files:**
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/background-ownership.ts`
- Modify: `src/lib/game/content/maps/background-ownership.test.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts`

**Interfaces:**
- Produces: `MapVisualOwnership`, `shouldRenderOwnedVisual(...)`, and `applyMeadowEntryRuntimeOwnership(...)`.
- HPA-398 blocker ownership remains valid with the same `ownerBackgroundIds.every(...)` behavior.

- [ ] **Step 1: Write failing shared-ownership tests**

Replace blocker-only decision tests with direct ownership tests:

```ts
expect(shouldRenderOwnedVisual(undefined, new Set())).toBe(true);
expect(shouldRenderOwnedVisual({ mode: 'always' }, new Set(['base']))).toBe(true);
expect(
	shouldRenderOwnedVisual(
		{ mode: 'fallback-only', ownerBackgroundIds: ['base'] },
		new Set(['base'])
	)
).toBe(false);
expect(
	shouldRenderOwnedVisual(
		{ mode: 'fallback-only', ownerBackgroundIds: ['base', 'foreground'] },
		new Set(['base'])
	)
).toBe(true);
```

Extend ownership validation fixtures to include `mapDecor` and `fences`; assert empty, duplicate, and missing owner IDs fail for all three visual collections.

- [ ] **Step 2: Implement the shared type**

In `maps/types.ts`:

```ts
export type MapVisualOwnership =
	| { mode: 'always' }
	| { mode: 'fallback-only'; ownerBackgroundIds: readonly string[] };
```

Use it for blockers:

```ts
export interface MapBlocker extends MapRect {
	kind: MapBlockerKind;
	label?: string;
	visual?: MapVisualOwnership;
}
```

Add to `MapDecorBase`:

```ts
visual?: MapVisualOwnership;
```

Replace the fence alias with:

```ts
export interface MapFenceSegment extends MapRect {
	visual?: MapVisualOwnership;
}
```

In `background-ownership.ts` implement `shouldRenderOwnedVisual(...)` exactly once. Update existing blocker callers/tests to use it.

- [ ] **Step 3: Run the shared ownership tests green**

```bash
bun run test:unit -- --run src/lib/game/content/maps/background-ownership.test.ts src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
```

Expected: HPA-398 multi-owner semantics still pass.

- [ ] **Step 4: Write a test-only derivation of the expected HPA-406 owner manifest**

The runtime manifest must be explicit, but the test should derive expected owners from frozen HPA-399 inputs so no reviewer has to trust manual matching.

In `meadow-entry-runtime-ownership.test.ts`:

1. import `MEADOW_ENTRY_BAKE_OWNERSHIP`;
2. import the approved crops;
3. use `collectMeadowEntrySourceCatalog()` to resolve source bounds;
4. consider only requirements `existing-blocker-fallback`, `extend-decor-fallback`, and `extend-fence-fallback`;
5. exclude blocker IDs already present in `SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP`;
6. expand source bounds by the frozen base/foreground margins from each disposition;
7. choose the fully containing approved base crop with the highest `drawOrder`;
8. map that crop to `${baseTextureKey}-image`;
9. for `base-and-foreground`, also require/map its approved foreground texture to `${foregroundTextureKey}-image`.

The expected record shape is:

```ts
type ExpectedOwner = {
	sourceType: 'blocker' | 'decor' | 'fence';
	sourceId: string;
	ownerBackgroundIds: readonly string[];
};
```

Assert the explicit runtime manifest equals the derived sorted list.

- [ ] **Step 5: Author the explicit runtime manifest from the test diff**

Create `meadow-entry-runtime-ownership.ts` with:

```ts
export interface MeadowEntryRuntimeVisualOwner {
	sourceType: 'blocker' | 'decor' | 'fence';
	sourceId: string;
	ownerBackgroundIds: readonly string[];
}

export const MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS: readonly MeadowEntryRuntimeVisualOwner[] = [
	// exact entries proven by the HPA-399 derivation test
];
```

Do not leave the comment as a placeholder in the final file: populate every exact entry until the test is green.

Implement a pure application helper that:

- clones only changed elements;
- finds the owning item by `id` in its correct collection;
- rejects missing IDs;
- rejects an HPA-406 record that would overwrite an existing `visual` contract;
- applies `{ mode: 'fallback-only', ownerBackgroundIds: [...] }`.

- [ ] **Step 6: Run ownership tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts
bun run check
```

Expected: exact HPA-399 runtime obligations are covered; HPA-398-owned blockers are preserved rather than overwritten.

- [ ] **Step 7: Commit**

```bash
git add src/lib/game/content/maps src/lib/game/content/backgrounds
git commit -m "feat(hpa-406): share baked visual fallback ownership"
```

---

### Task 6: Compose and Render the Crossroads/Connector Slice

**Files:**
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts`
- Modify: `tests/e2e/game.e2e.ts`

**Interfaces:**
- Consumes: `meadowEntryRuntimeBackgroundImages`, `applyMeadowEntryRuntimeOwnership(...)`, `getMapBackgroundDepth(background)`, `shouldRenderOwnedVisual(...)`.
- Produces: final PR-1 `meadowEntryMap` with 13 HPA-496 descriptors plus the existing HPA-398 pair.

- [ ] **Step 1: Write failing map-composition tests**

In `maps.test.ts`, assert:

```ts
expect(meadowEntryMap.backgroundImages).toHaveLength(15); // 13 HPA-496 + 2 HPA-398
```

Assert every PR-1 runtime background ID exists exactly once and both Sundrop IDs still exist with `drawOrder: 1000`.

Also assert key gameplay collections have not changed counts/IDs due to background integration. Reuse existing map fixtures rather than snapshotting the entire map.

- [ ] **Step 2: Compose after `mergeRegions(...)`**

Keep `mergeRegions(...)` unchanged.

After applying existing Sundrop ownership:

```ts
const backgroundImages = [
	...merged.backgroundImages,
	...meadowEntryRuntimeBackgroundImages
];

const sundropOwnedBlockers = applySundropObstacleOwnership(merged.blockers);
const owned = applyMeadowEntryRuntimeOwnership({
	blockers: sundropOwnedBlockers,
	mapDecor: merged.mapDecor,
	fences: merged.fences
});
```

Validate ownership against the final arrays, then pass `backgroundImages`, `owned.blockers`, `owned.mapDecor`, and `owned.fences` into `meadowEntryMap`.

Do not modify the six `RegionFragment` files for art registration.

- [ ] **Step 3: Write failing renderer tests for order and independence**

Add scene tests proving:

1. input order does not determine overlap depth: draw order does;
2. base and foreground each render when their own texture is valid;
3. a missing foreground leaves a valid base in `successfulBackgroundIds`;
4. a decor/fence with owners `[base, foreground]` returns live when only `base` succeeds;
5. a base-only owned visual stays suppressed when its base succeeds;
6. all owned live visuals return when regional backgrounds are disabled.

Do **not** add `blocked-by-base` expectations.

- [ ] **Step 4: Update the renderer minimally**

Change depth call from:

```ts
.setDepth(getMapBackgroundDepth(background.plane));
```

to:

```ts
.setDepth(getMapBackgroundDepth(background));
```

Keep the existing one-pass independent load/render decisions and final `successfulBackgroundIds` set.

Pass that set into decor/fence rendering:

```ts
this.renderMapDecor(map, ['floor', 'furniture'], successfulBackgroundIds);
this.renderFences(map, successfulBackgroundIds);
this.renderBlockers(map, successfulBackgroundIds);
// later foreground decor call receives the same set
```

Inside decor/fence loops:

```ts
if (!shouldRenderOwnedVisual(item.visual, successfulBackgroundIds)) {
	continue;
}
```

Keep collision code independent.

- [ ] **Step 5: Extend diagnostics only enough for focused acceptance**

Add optional arrays to the existing plane diagnostic:

```ts
selectedFallbackDecorIds: string[];
selectedFallbackFenceIds: string[];
```

Populate them after all background attempts using the same final success set. Do not add a second diagnostic protocol or evidence schema.

- [ ] **Step 6: Update the regional-background e2e coverage**

Extend the existing regional-background Playwright test to assert:

- the expected PR-1 completion count when enabled;
- zero regional loads when `?regionalBackground=off`;
- one representative base-missing fallback;
- one representative foreground-missing fallback;
- diagnostics report the expected blocker/decor/fence fallback IDs.

Use existing test hooks rather than a new page-only debug API.

- [ ] **Step 7: Run PR-1 focused validation**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts \
  src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
bunx playwright test tests/e2e/game.e2e.ts --grep "regional background"
bun run check
bun run lint
bun run build
```

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/game/content src/lib/game/phaser tests/e2e/game.e2e.ts
git commit -m "feat(hpa-406): render crossroads baked backgrounds"
```

---

### Task 7: Complete PR-1 Controller Acceptance and Handoff

**Files:**
- No required runtime file changes unless acceptance finds an owner-local defect.
- Update: PR description only.

**Interfaces:**
- Produces: reviewable PR 1 proving the reusable seam before remaining-region integration.

- [ ] **Step 1: Run the Crossroads/connector controller route**

Walk:

```text
Sundrop Village
→ Village/Crossroads connector
→ Crossroads
→ Coast connector mouth → Crossroads
→ Mistfen connector mouth → Crossroads
→ Silverpine connector mouth → Crossroads
→ Wildwood connector mouth → Crossroads
→ Village/Crossroads connector
→ Sundrop Village
```

Cross every connector mouth in both directions. Verify no seam, double-darkening, transparent hole, duplicate live/baked obstacle, or invisible collision.

- [ ] **Step 2: Exercise representative runtime states**

Verify manually:

- regional backgrounds enabled;
- regional backgrounds disabled;
- one missing/invalid base;
- one missing foreground;
- collision debug overlay;
- one representative save/reload.

- [ ] **Step 3: Run packaged Tauri and observe load/frame behavior**

```bash
bun run build:tauri
```

Run the current native development platform package. Record in the PR description:

- texture preflight result/environment;
- before/after approximate regional background load observation;
- one steady-state frame-time observation.

No hard performance budget is introduced by HPA-406.

- [ ] **Step 4: Run final PR-1 repository checks**

```bash
bun run test:unit -- --run
bun run check
bun run lint
bun run build
bun run build:tauri
git diff --check
```

Run `bun run art:validate:meadow-entry` only if PR 1 actually repairs/changes the HPA-496 production package. Do not run it merely because runtime copies were integrated.

- [ ] **Step 5: Update the PR-1 description**

Record exactly:

- player-facing Crossroads/connector outcome;
- HPA-399/HPA-496 inputs consumed;
- live/baked/collision/stateful ownership preserved;
- frozen-integration classification and skipped map/art production;
- texture preflight result;
- controller acceptance route;
- validation commands.

- [ ] **Step 6: Merge PR 1 before starting PR 2**

PR 2 should build from the merged PR-1 seam, not duplicate it on a parallel architecture branch.

---

### Task 8: Append the Remaining Nine Region Textures in PR 2

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.ts` only for owner records whose owner is one of the newly activated region crops
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts`
- Add: the remaining 9 PNGs under `public/game/assets/regions/meadow-entry/`
- Modify: affected focused scene/e2e tests only when expected counts/IDs change

**Interfaces:**
- Extends PR-1 registry from 13 to the complete 22 HPA-496 runtime definitions.
- Final `meadowEntryMap.backgroundImages` contains 24 descriptors including the two HPA-398 Sundrop descriptors.

- [ ] **Step 1: Change the registry contract test to the full approved inventory**

Replace the PR-1 key set with:

```ts
const expected = meadowEntryArtPackageApproval.exports.map(
	(asset) => `${asset.cropId}:${asset.plane}`
);

expect(runtimeKeys).toEqual(expected);
expect(MEADOW_ENTRY_RUNTIME_BACKGROUNDS).toHaveLength(22);
```

Keep the per-record geometry/path/order assertions from Task 4.

- [ ] **Step 2: Run red tests**

```bash
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts
```

Expected: fail because 9 approved entries are not yet registered.

- [ ] **Step 3: Extract the exact remaining approval rows**

Run:

```bash
bun -e "const p=await Bun.file('artifacts/meadow-entry/hpa-399/provenance/meadow-entry-export-provenance.json').json(); const wanted=new Set(['tidewatch-coast','mistfen','silverpine','wildwood','outer-boundary-east-forest-lane']); console.log(JSON.stringify(p.inventory.filter((x:any)=>wanted.has(x.cropId)), null, 2))"
```

Append those exact nine records to `MEADOW_ENTRY_RUNTIME_BACKGROUNDS` in approved draw-order order.

- [ ] **Step 4: Copy the remaining approved PNG bytes**

Copy the nine listed files unchanged from the approved artifact exports into the existing public runtime directory.

The existing LFS rule already covers them.

- [ ] **Step 5: Let the ownership derivation test identify newly active owner records**

Run:

```bash
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts
```

If the explicit manifest is incomplete because PR 1 intentionally omitted ownership whose selected crop was not active, add the exact derived entries now. Do not change the derivation rule.

- [ ] **Step 6: Update expected scene/e2e counts only**

The renderer behavior should not change. Update tests from 13 HPA-496 runtime entries to 22, and from 15 total map background descriptors to 24.

If PR 2 requires a new renderer feature, stop and review PR 1's seam before adding it.

- [ ] **Step 7: Run focused PR-2 tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts \
  src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
bunx playwright test tests/e2e/game.e2e.ts --grep "regional background"
bun run check
bun run lint
bun run build
```

Expected: all 22 HPA-496 runtime exports are registered, materialized, and independently renderable.

- [ ] **Step 8: Commit**

```bash
git add src/lib/game/content src/lib/game/phaser tests/e2e/game.e2e.ts public/game/assets/regions/meadow-entry
git commit -m "feat(hpa-406): integrate remaining meadow backgrounds"
```

---

### Task 9: Finish Outdoor Acceptance in PR 2

**Files:**
- No required new framework/files.
- Modify only owner-local runtime/map/art files when the walkthrough exposes a concrete defect.
- Update: PR description.

**Interfaces:**
- Produces: completed HPA-406 outdoor acceptance; no follow-up whole-map certification ticket.

- [ ] **Step 1: Run one continuous controller route**

Walk this complete route in one session:

```text
Sundrop Village
→ Crossroads
→ Tidewatch Coast → Crossroads
→ Mistfen → Crossroads
→ Silverpine → Crossroads
→ Wildwood → Crossroads
→ Sundrop Village
```

For every destination:

- cross the connector mouth both ways;
- walk one representative optional route;
- trigger one representative reward/discovery/encounter already present in that destination;
- confirm collision aligns with the approved art.

- [ ] **Step 2: Exercise final fallback behavior**

Verify:

- one representative missing-base background restores live fallback;
- one representative missing-foreground background keeps the valid base and restores any visual that requires the missing foreground;
- collision remains unchanged in both cases;
- regional-background-disabled mode remains readable.

- [ ] **Step 3: Verify save/reload**

Save at one representative outdoor checkpoint, reload, and confirm:

- player position remains valid/walkable;
- collected reward/discovery/encounter state remains correct;
- backgrounds/fallback do not alter persistence behavior.

- [ ] **Step 4: Run the complete focused/repository validation**

```bash
bun run test:unit -- --run
bun run test:e2e
bun run check
bun run lint
bun run build
bun run build:tauri
git diff --check
```

Also rerun:

```bash
bun run world:probe:meadow-entry-textures
```

only if any approved runtime PNG changed during defect repair. If runtime integration remains byte-identical to the approved package, the original preflight result is sufficient.

- [ ] **Step 5: Record final acceptance in the PR description**

Record:

- all 22 approved HPA-496 exports integrated;
- no new geometry or art production performed;
- continuous controller route and representative content checks;
- fallback/save behavior;
- packaged Tauri result;
- approximate load and steady-state frame observation;
- any source/art defect fixed at its existing owner.

- [ ] **Step 6: Close HPA-406 when PR 2 merges**

No separate HPA-411-style outdoor certification issue is required. The HPA-406 ticket owns final outdoor acceptance.

---

## Plan Self-Review

### Spec coverage

- Frozen-integration routing: Tasks 1, 7, 9.
- Texture-safety preflight without speculative loading architecture: Task 1.
- Deletion-first adapter/CI cleanup: Task 2.
- Minimal `drawOrder` extension: Task 3.
- Direct HPA-496 runtime registration with no package generator: Task 4.
- Cheap runtime existence/dimension/hash CI guard: Task 4.
- Shared blocker/decor/fence fallback ownership preserving HPA-398: Task 5.
- Post-merge background composition with unchanged `RegionFragment` sources: Task 6.
- Independent base/foreground rendering: Task 6.
- Crossroads/connectors proof first: Tasks 6-7.
- Remaining regions as append-only integration: Task 8.
- Continuous outdoor/controller/save/Tauri acceptance: Task 9.

### Scope check

The plan deliberately avoids runtime streaming, Story Integration Catalog work, packet schemas, new art generation, generalized background packages, and separate evidence infrastructure. The only new reusable runtime concepts are the fields/ownership already required by the approved HPA-399/HPA-496 package.

### Type consistency

The plan consistently uses:

- `MapBackgroundImage.drawOrder`;
- `getMapBackgroundDepth(background)`;
- `MapVisualOwnership`;
- `shouldRenderOwnedVisual(visual, successfulBackgroundIds)`;
- `MEADOW_ENTRY_RUNTIME_BACKGROUNDS`;
- `meadowEntryRuntimeBackgroundImages`;
- `meadowEntryRuntimeBackgroundAssets`;
- `MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS`;
- `applyMeadowEntryRuntimeOwnership(...)`.

No alternate dependency, package, or load-plan type is introduced later in the plan.