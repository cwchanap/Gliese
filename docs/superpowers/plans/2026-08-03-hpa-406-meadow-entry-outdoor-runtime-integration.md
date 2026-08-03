# HPA-406 Meadow-Entry Outdoor Runtime Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all approved non-village meadow-entry base and foreground exports through a deterministic runtime package, safe load-plan boundary, ordered two-phase renderer, and generic baked-visual fallback while preserving frozen gameplay geometry and live semantics.

**Architecture:** Keep HPA-399/HPA-496 manifests and approvals authoritative, generate stable runtime descriptors and ownership from those inputs, and compose them only after region fragments merge. Separate authored background descriptors from fully composed runtime descriptors, evaluate all bases before dependent foregrounds, and select fallback visuals only from the final render-success set. Generate the complete approved inventory immediately, but route actual preload through an explicit load plan and require an early full-inventory safety decision before Checkpoint 2.

**Tech Stack:** TypeScript 6, Phaser 4, Svelte/Vite, Vitest 4, Playwright 1.59, Bun, Sharp, Tauri 2, Git LFS, checked-in Markdown/JSON/PNG evidence.

## Global Constraints

- HPA-406 maps to exactly one Linear ticket and one pull request. Keep all implementation, checkpoint commits, reports, and evidence in PR #20.
- Use the existing branch `jack65786656/hpa-406-integrate-all-remaining-meadow-entry-outdoor-regions-from`.
- Do not begin runtime implementation until the approved HPA-514 Story Integration Catalog/fingerprint and HPA-495 Area Expansion Packet/skill outputs are present and current.
- Treat HPA-399 crop geometry, overlaps, route mouths, ownership, runtime coverage, fingerprints, and storage contracts as frozen inputs.
- Treat HPA-496 approved masters, export bytes, dimensions, hashes, draw orders, provenance, and approval inventory as frozen inputs.
- Do not change route geometry, collision geometry, encounters, NPC roles, rewards, discoveries, gates, transitions, story semantics, spoiler constraints, or audio behavior.
- Do not regenerate or retouch visual masters or regional exports inside HPA-406.
- Region fragments author `AuthoredMapBackgroundImage`; only the composed `WorldMapDefinition` may contain ordered `MapBackgroundImage` values.
- Stable HPA-399 background IDs are `${textureKey}-image`. Existing HPA-398 IDs remain `sundrop-village-base-image` and `sundrop-village-foreground-image`.
- Frozen HPA-399 draw orders are `0`, `10`, `100..140`, and `200..240`. Both HPA-398 descriptors use the reviewed runtime-only order `1_000` on separate planes.
- Reject duplicate `(plane, drawOrder)` pairs. Never use Phaser insertion order as seam ownership.
- Compute depth as `MAP_BACKGROUND_DEPTHS[plane] + drawOrder / 10_000`. Do not add a raw descriptor `depth` field.
- Every foreground descriptor must depend on a base descriptor in the same composed map. Evaluate all bases before any foreground.
- Keep immutable HPA-398 dual-owner fallback semantics unchanged. New HPA-406 fallback entries use exactly one authoritative base owner.
- Resolve new ownership by full containment plus highest frozen draw order. Use primary-region data only as a post-selection provenance check.
- Buildings, entrances, NPCs, ambient NPCs, pickups, discoveries, encounters, combat bounds, transitions, stateful gates, and story-controlled objects remain live.
- Generate and validate all 22 HPA-496 exports from Checkpoint 1. Do not equate inventory membership with immediate preload.
- The approval inventory is `109,509,947` compressed bytes and `98,893,824` pixels, estimating `395,575,296` decoded RGBA bytes (`377.25 MiB`). Including the HPA-398 pair estimates approximately `398.25 MiB` before overhead.
- Runtime loading must go through `RegionalBackgroundLoadPlan`. `BootScene` must not iterate the complete inventory directly.
- Checkpoint 1 must record a full-inventory load-safety result. If eager loading is rejected, stop before Checkpoint 2 and create a separate Linear ticket and PR for streaming/load management.
- Add Git LFS only for `public/game/assets/regions/meadow-entry/**/*.png`. Preserve the existing raw HPA-398 Sundrop sibling files.
- No permanent checkpoint feature flag or checkpoint selector remains in the final code.
- Preserve `?regionalBackground=off` behavior: queue zero regional background files and render live/tile fallback.
- Use test-first implementation and commit after every task. Do not batch unrelated task commits.
- Do not mark the PR ready until all three checkpoints, evidence reports, and the final command gate pass.

## File Structure

### New focused modules

- `src/lib/game/content/backgrounds/regional-background-assets.ts` — unified loader-facing asset type, HPA-398 adapters, combined approved inventory, and inventory validation.
- `src/lib/game/content/backgrounds/regional-background-load-plan.ts` — eager-map and explicit streamed load-plan construction, dependency validation, and byte estimates.
- `src/lib/game/content/backgrounds/meadow-entry-runtime-package.ts` — pure stable-ID/path mapping, fingerprinting, descriptor construction, inventory estimates, and package validation.
- `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.ts` — deterministic baked-source owner resolution and ownership-package validation.
- `src/lib/game/content/backgrounds/meadow-entry-runtime-composition.ts` — pure HPA-398 ordering adapter, generated ownership application, and final meadow-entry composition.
- `src/lib/game/content/generated/meadow-entry-runtime-package.ts` — generated HPA-406 runtime assets, descriptors, fingerprints, and ownership records.
- `tools/generate-meadow-entry-runtime-package.ts` — atomic generator and `--check` entry point.
- `tools/verify-meadow-entry-runtime-storage.ts` — LFS/materialization/hash/OID verification.
- `tests/e2e/meadow-entry-backgrounds.e2e.ts` — focused checkpoint visual, fallback, traversal, load-safety, and evidence capture suite.
- `docs/superpowers/reports/hpa-406/checkpoint-1-crossroads-connectors.md`
- `docs/superpowers/reports/hpa-406/checkpoint-1-load-safety.json`
- `docs/superpowers/reports/hpa-406/checkpoint-2-coast-silverpine.md`
- `docs/superpowers/reports/hpa-406/checkpoint-3-mistfen-wildwood.md`
- `docs/superpowers/reports/hpa-406/defects.json`

### New focused tests

- `src/lib/game/content/backgrounds/regional-background-assets.test.ts`
- `src/lib/game/content/backgrounds/regional-background-load-plan.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts`

### Existing files changed in place

- `.gitattributes`
- `package.json`
- `src/lib/game/content/assets.ts`
- `src/lib/game/content/assets.test.ts`
- `src/lib/game/content/maps/types.ts`
- `src/lib/game/content/maps/regions/types.ts`
- `src/lib/game/content/maps/layered/region-background.ts`
- `src/lib/game/content/maps/regions/village.ts`
- `src/lib/game/content/maps/regions/village-layered.test.ts`
- `src/lib/game/content/maps/background-ownership.ts`
- `src/lib/game/content/maps/background-ownership.test.ts`
- `src/lib/game/content/maps/meadow-entry.ts`
- `src/lib/game/content/maps.test.ts`
- `src/lib/game/phaser/regional-background-plane-render-diagnostics.ts`
- `src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts`
- `src/lib/game/phaser/renderer-diagnostics.ts`
- `src/lib/game/phaser/renderer-diagnostics.test.ts`
- `src/lib/game/phaser/scenes/BootScene.ts`
- `src/lib/game/phaser/scenes/WorldScene.ts`
- `src/lib/game/phaser/scenes/scenes.test.ts`
- `tests/e2e/game.e2e.ts`
- `tools/render-sundrop-village-obstacle-proof.ts`

---

### Task 1: Commit the Execution Contract and Verify Prerequisites

**Files:**
- Create: `docs/superpowers/plans/2026-08-03-hpa-406-meadow-entry-outdoor-runtime-integration.md`
- Modify: `docs/superpowers/specs/2026-08-03-hpa-406-meadow-entry-outdoor-runtime-integration-design.md` only if implementation discovers a design contradiction before code starts.
- Create during execution: `docs/superpowers/reports/hpa-406/defects.json`

**Interfaces:**
- Consumes: approved HPA-406 design, HPA-514 Story Integration Catalog, HPA-495 Area Expansion Packet, HPA-399/HPA-496 frozen contracts.
- Produces: committed plan, verified prerequisite paths/fingerprints, and an empty structured defect ledger.

- [ ] **Step 1: Verify the design and plan format**

Run:

```bash
bunx prettier --check \
  docs/superpowers/specs/2026-08-03-hpa-406-meadow-entry-outdoor-runtime-integration-design.md \
  docs/superpowers/plans/2026-08-03-hpa-406-meadow-entry-outdoor-runtime-integration.md
```

Expected: `All matched files use Prettier code style!`

- [ ] **Step 2: Resolve and verify the current HPA-514 integration catalog**

Run:

```bash
catalog_path=$(git grep -l 'Story Integration Catalog' -- story src-tauri docs | head -n 1)
test -n "$catalog_path"
printf 'catalog=%s\n' "$catalog_path"
bun run story:check:strict
```

Expected: one repository path is printed and strict story validation exits `0`. If no path is found, stop; HPA-514 is not consumable yet.

- [ ] **Step 3: Resolve and verify the current HPA-495 Area Expansion Packet**

Run:

```bash
packet_path=$(git grep -l '^areaId:.*meadow-entry' -- .agents docs | head -n 1)
test -n "$packet_path"
printf 'packet=%s\n' "$packet_path"
git grep -n 'fingerprint:' -- "$packet_path"
git grep -n 'staleConsumerStatus:' -- "$packet_path"
```

Expected: one packet path, one fingerprint field, and one stale-consumer field. If the packet is missing or stale, stop before runtime work.

- [ ] **Step 4: Verify frozen HPA-399 and HPA-496 approvals**

Run:

```bash
bun run art:validate:meadow-entry-controls
bun run art:validate:meadow-entry
```

Expected: both commands exit `0` without regenerating approved inputs.

- [ ] **Step 5: Create the defect ledger**

Create `docs/superpowers/reports/hpa-406/defects.json`:

```json
{
  "version": 1,
  "issue": "HPA-406",
  "defects": []
}
```

- [ ] **Step 6: Commit the execution contract**

```bash
git add \
  docs/superpowers/plans/2026-08-03-hpa-406-meadow-entry-outdoor-runtime-integration.md \
  docs/superpowers/reports/hpa-406/defects.json
git commit -m "docs(hpa-406): lock runtime integration plan"
```

---

### Task 2: Split Authored and Composed Background Types

**Files:**
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/regions/types.ts`
- Modify: `src/lib/game/content/maps/layered/region-background.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps/regions/village-layered.test.ts`
- Modify: `src/lib/game/content/maps/background-ownership.ts`
- Modify: `src/lib/game/content/maps/background-ownership.test.ts`
- Create initially: `src/lib/game/content/backgrounds/meadow-entry-runtime-composition.ts`
- Create test: `src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts`
- Modify: `tools/render-sundrop-village-obstacle-proof.ts`

**Interfaces:**
- Consumes: current plane-only `MapBackgroundImage`, HPA-398 IDs, and `MAP_BACKGROUND_DEPTHS`.
- Produces:
  - `AuthoredMapBackgroundImage`
  - composed `MapBackgroundImage`
  - `HPA398_SUNDROP_OVERLAY_DRAW_ORDER`
  - `applyHpa398RuntimeOrdering(authored): MapBackgroundImage[]`
  - `getMapBackgroundDepth(background): number`

- [ ] **Step 1: Write failing authored/composed type tests**

Add to `village-layered.test.ts` and `meadow-entry-runtime-composition.test.ts`:

```ts
it('keeps fragment backgrounds unordered and composes the HPA-398 pair deterministically', () => {
  const authored = villageRegion.backgroundImages ?? [];
  expect(authored).toHaveLength(2);
  expect(authored[0]).not.toHaveProperty('drawOrder');
  expect(authored[1]).not.toHaveProperty('dependsOnBackgroundId');

  const composed = applyHpa398RuntimeOrdering(authored);
  expect(composed).toEqual([
    expect.objectContaining({
      id: 'sundrop-village-base-image',
      plane: 'base',
      drawOrder: 1_000
    }),
    expect.objectContaining({
      id: 'sundrop-village-foreground-image',
      plane: 'foreground',
      drawOrder: 1_000,
      dependsOnBackgroundId: 'sundrop-village-base-image'
    })
  ]);
});
```

Add to `background-ownership.test.ts`:

```ts
it('derives depth from semantic plane and reviewed order', () => {
  expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 1_000 })).toBe(-8.9);
  expect(getMapBackgroundDepth({ plane: 'foreground', drawOrder: 240 })).toBe(100.024);
});
```

- [ ] **Step 2: Run tests and verify failure**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts
```

Expected: failures because the new types and ordering adapter do not exist.

- [ ] **Step 3: Add authored and composed map types**

Implement in `maps/types.ts`:

```ts
export type MapBackgroundPlane = 'base' | 'foreground';

export interface AuthoredMapBackgroundImage extends MapRect {
  textureKey: string;
  plane: MapBackgroundPlane;
}

export interface MapBackgroundImage extends AuthoredMapBackgroundImage {
  drawOrder: number;
  dependsOnBackgroundId?: string;
}
```

Update `RegionFragment.backgroundImages` to `AuthoredMapBackgroundImage[]`. Keep `WorldMapDefinition.backgroundImages` as `MapBackgroundImage[]`.

Update `createLayeredRegionBackground(...)` to return `AuthoredMapBackgroundImage` without order or dependency fields.

- [ ] **Step 4: Implement HPA-398 widening and depth calculation**

Implement in `meadow-entry-runtime-composition.ts`:

```ts
export const HPA398_SUNDROP_OVERLAY_DRAW_ORDER = 1_000;

export function applyHpa398RuntimeOrdering(
  backgrounds: readonly AuthoredMapBackgroundImage[]
): MapBackgroundImage[] {
  return backgrounds.map((background) => {
    if (background.id === 'sundrop-village-base-image') {
      return { ...background, drawOrder: HPA398_SUNDROP_OVERLAY_DRAW_ORDER };
    }
    if (background.id === 'sundrop-village-foreground-image') {
      return {
        ...background,
        drawOrder: HPA398_SUNDROP_OVERLAY_DRAW_ORDER,
        dependsOnBackgroundId: 'sundrop-village-base-image'
      };
    }
    throw new Error(`Unexpected authored regional background: ${background.id}`);
  });
}
```

Change `getMapBackgroundDepth`:

```ts
const BACKGROUND_ORDER_SCALE = 10_000;

type BackgroundDepthInput = Pick<MapBackgroundImage, 'plane' | 'drawOrder'>;

export function getMapBackgroundDepth(background: BackgroundDepthInput): number {
  return MAP_BACKGROUND_DEPTHS[background.plane] + background.drawOrder / BACKGROUND_ORDER_SCALE;
}
```

- [ ] **Step 5: Migrate direct depth consumers and authored/composed expectations**

Update all direct calls to pass a descriptor-like object, including `WorldScene`, tests, and `tools/render-sundrop-village-obstacle-proof.ts`.

Keep authored exact equality in `village-layered.test.ts`; add separate composed assertions for production `meadowEntryMap.backgroundImages` after Task 7.

- [ ] **Step 6: Run focused tests and type check**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts
bun run check
```

Expected: focused tests pass and type check exits `0`.

- [ ] **Step 7: Commit**

```bash
git add \
  src/lib/game/content/maps/types.ts \
  src/lib/game/content/maps/regions/types.ts \
  src/lib/game/content/maps/layered/region-background.ts \
  src/lib/game/content/maps/regions/village.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps/background-ownership.ts \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-composition.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts \
  tools/render-sundrop-village-obstacle-proof.ts
git commit -m "refactor(hpa-406): split authored and composed backgrounds"
```

---

### Task 3: Generalize Visual Ownership to Blockers, Decor, and Fences

**Files:**
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/background-ownership.ts`
- Modify: `src/lib/game/content/maps/background-ownership.test.ts`
- Modify later renderer call sites: `src/lib/game/phaser/scenes/WorldScene.ts`

**Interfaces:**
- Consumes: existing `MapBlockerVisual`, `shouldRenderBlockerVisual`, and blocker-only validator.
- Produces:
  - `MapVisualOwnership`
  - optional `visual` on `MapBlocker`, `MapDecorBase`, and `MapFenceSegment`
  - `shouldRenderOwnedVisual(visual, successfulBackgroundIds)`
  - generic `validateMapBackgroundOwnership(...)`

- [ ] **Step 1: Write failing ownership tests for all three collections**

Add tests:

```ts
it('validates and selects blocker, decor, and fence fallbacks', () => {
  const map = {
    backgroundImages: [
      { id: 'base-a', textureKey: 'base-a', x: 50, y: 50, width: 100, height: 100, plane: 'base', drawOrder: 10 }
    ],
    blockers: [
      { id: 'blocker-a', x: 10, y: 10, width: 10, height: 10, kind: 'town-hedge', visual: { mode: 'fallback-only', ownerBackgroundIds: ['base-a'] } }
    ],
    mapDecor: [
      { id: 'decor-a', x: 20, y: 20, width: 10, height: 10, mode: 'tile', visual: { mode: 'fallback-only', ownerBackgroundIds: ['base-a'] } }
    ],
    fences: [
      { id: 'fence-a', x: 30, y: 30, width: 10, height: 10, visual: { mode: 'fallback-only', ownerBackgroundIds: ['base-a'] } }
    ]
  };

  expect(() => validateMapBackgroundOwnership(map)).not.toThrow();
  expect(shouldRenderOwnedVisual(map.mapDecor[0]!.visual, new Set())).toBe(true);
  expect(shouldRenderOwnedVisual(map.fences[0]!.visual, new Set(['base-a']))).toBe(false);
});
```

Add a regression proving HPA-398 multi-owner semantics remain `every(...)` based.

- [ ] **Step 2: Run and verify failure**

```bash
bun run test:unit -- --run src/lib/game/content/maps/background-ownership.test.ts
```

Expected: failures because decor/fence ownership and the shared helper do not exist.

- [ ] **Step 3: Implement the shared type and helper**

```ts
export type MapVisualOwnership =
  | { mode: 'always' }
  | { mode: 'fallback-only'; ownerBackgroundIds: readonly string[] };

export function shouldRenderOwnedVisual(
  visual: MapVisualOwnership | undefined,
  successfulBackgroundIds: ReadonlySet<string>
): boolean {
  if (!visual || visual.mode === 'always') return true;
  return !visual.ownerBackgroundIds.every((id) => successfulBackgroundIds.has(id));
}
```

Make the existing blocker helper call `shouldRenderOwnedVisual` temporarily or remove it after all call sites migrate.

- [ ] **Step 4: Generalize validation**

Change the validator source to include `backgroundImages`, `blockers`, `mapDecor`, and `fences`. Validate each fallback-only item with collection-specific error labels while preserving non-empty, unique, existing owner checks.

- [ ] **Step 5: Run focused tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
bun run check
```

Expected: all tests pass and HPA-398 ownership remains unchanged.

- [ ] **Step 6: Commit**

```bash
git add \
  src/lib/game/content/maps/types.ts \
  src/lib/game/content/maps/background-ownership.ts \
  src/lib/game/content/maps/background-ownership.test.ts
git commit -m "feat(hpa-406): generalize baked visual ownership"
```

---

### Task 4: Build Stable Runtime Asset and Package Contracts

**Files:**
- Create: `src/lib/game/content/backgrounds/regional-background-assets.ts`
- Create: `src/lib/game/content/backgrounds/regional-background-assets.test.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-package.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts`
- Modify: `src/lib/game/content/assets.ts`
- Modify: `src/lib/game/content/assets.test.ts`

**Interfaces:**
- Consumes: `meadowEntryArtPackageApproval`, crop manifest, HPA-398 background constants and approvals.
- Produces:
  - `RegionalBackgroundAsset`
  - pure ID/path functions
  - `buildMeadowEntryRuntimePackageInputs()`
  - `computeMeadowEntryArtPackageFingerprint()`
  - deterministic inventory byte/pixel estimates
  - combined `regionalBackgroundAssetInventory`

- [ ] **Step 1: Write failing stable-mapping and inventory tests**

```ts
it('maps every approved export to a stable runtime identity', () => {
  const crossroads = meadowEntryArtPackageApproval.exports.find(
    (entry) => entry.cropId === 'crossroads' && entry.plane === 'base'
  );
  expect(crossroads).toBeDefined();
  expect(getMeadowEntryBackgroundId(crossroads!)).toBe('meadow-entry-crossroads-base-image');
  expect(getMeadowEntryRuntimePath(crossroads!)).toBe('/game/assets/regions/meadow-entry/crossroads-base.png');
});

it('derives the approved full-inventory estimates', () => {
  const estimate = estimateApprovedMeadowEntryInventory(meadowEntryArtPackageApproval.exports);
  expect(estimate).toEqual({
    assetCount: 22,
    compressedBytes: 109_509_947,
    pixels: 98_893_824,
    decodedRgbaBytes: 395_575_296
  });
});
```

Add tests asserting the two HPA-398 entries retain exact approval fingerprint/hash fields and the combined inventory has unique IDs, keys, and paths.

- [ ] **Step 2: Run and verify failure**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/regional-background-assets.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts \
  src/lib/game/content/assets.test.ts
```

Expected: failures because the focused asset/package modules do not exist.

- [ ] **Step 3: Implement the unified asset type**

```ts
export interface RegionalBackgroundAsset {
  id: string;
  key: string;
  path: string;
  plane: MapBackgroundPlane;
  width: number;
  height: number;
  drawOrder: number;
  approvedControlFingerprint: string;
  approvedPngSha256: string;
  source: 'hpa-398' | 'hpa-496';
  cropId?: string;
  dependsOnBackgroundId?: string;
}
```

Adapt the two HPA-398 assets into this shape and re-export the combined inventory from `assets.ts` for compatibility.

- [ ] **Step 4: Implement pure HPA-496 mapping functions**

```ts
export function getMeadowEntryBackgroundId(
  entry: MeadowEntryArtPackageApproval['exports'][number]
): string {
  return `${entry.textureKey}-image`;
}

export function getMeadowEntryRuntimePath(
  entry: MeadowEntryArtPackageApproval['exports'][number]
): string {
  const filename = entry.path.split('/').at(-1);
  if (!filename) throw new Error(`Missing export filename: ${entry.path}`);
  return `/game/assets/regions/meadow-entry/${filename}`;
}
```

Build descriptors from crop bounds and attach foreground dependencies to matching base IDs.

- [ ] **Step 5: Implement deterministic fingerprint and estimates**

Stable-sort by crop ID and plane before hashing. Include the approved combined control fingerprint to bind art approval to control revision.

Compute compressed bytes from `bytes`, pixels from `width * height`, and decoded RGBA bytes from `pixels * 4`.

- [ ] **Step 6: Replace exact two-element asset tests**

Keep exact assertions for the two HPA-398 entries, exact generated assertions for all 22 HPA-496 entries, and combined uniqueness assertions. Remove any expectation that the complete loader inventory has length `2`.

- [ ] **Step 7: Run focused tests and type check**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/regional-background-assets.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts \
  src/lib/game/content/assets.test.ts
bun run check
```

Expected: tests pass and type check exits `0`.

- [ ] **Step 8: Commit**

```bash
git add \
  src/lib/game/content/backgrounds/regional-background-assets.ts \
  src/lib/game/content/backgrounds/regional-background-assets.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts \
  src/lib/game/content/assets.ts \
  src/lib/game/content/assets.test.ts
git commit -m "feat(hpa-406): define regional runtime asset package"
```

---

### Task 5: Generate Deterministic HPA-406 Visual Ownership

**Files:**
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts`
- Consume unchanged: `src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts`
- Consume unchanged: `src/lib/game/content/backgrounds/meadow-entry-crop-manifest.ts`
- Consume unchanged: `src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.ts`
- Consume unchanged: `src/lib/game/content/backgrounds/meadow-entry-controls.ts`

**Interfaces:**
- Consumes: bake-ownership entries, source catalog, approved base crops, stable descriptor-ID mapping.
- Produces:
  - `resolveMeadowEntryRuntimeOwnership(...)`
  - `validateGeneratedMeadowEntryOwnership(...)`
  - blocker/decor/fence `RuntimeVisualOwner[]`

- [ ] **Step 1: Write failing owner-selection tests**

Add cases proving:

```ts
it('chooses the highest-order fully containing base crop', () => {
  const result = selectAuthoritativeBaseOwner({
    sourceBounds: { left: 100, top: 100, right: 140, bottom: 140 },
    candidates: [
      { cropId: 'low', backgroundId: 'low-image', drawOrder: 100, bounds: { left: 0, top: 0, right: 200, bottom: 200 }, sourceRegionIds: ['region-a'] },
      { cropId: 'high', backgroundId: 'high-image', drawOrder: 200, bounds: { left: 50, top: 50, right: 250, bottom: 250 }, sourceRegionIds: ['region-b'] }
    ],
    primaryRegionId: 'region-a',
    overlaps: [{ firstCropId: 'low', secondCropId: 'high', ownerCropId: 'high' }]
  });
  expect(result.backgroundId).toBe('high-image');
});
```

Add tests for exact-edge containment, outward-margin rejection, missing containing crop, overlap owner mismatch, and primary-region provenance mismatch.

- [ ] **Step 2: Run and verify failure**

```bash
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts
```

Expected: failure because owner-selection functions do not exist.

- [ ] **Step 3: Implement shared-bounds conversion and containment**

Use `toRawPixelBounds`, approved insets, `rasterizeCoverageBounds`, and `containsBounds`. Do not write parallel rectangle arithmetic.

- [ ] **Step 4: Implement deterministic selection**

Filter to fully containing base crops, sort by descending frozen draw order, choose the first, then validate overlap and primary-region provenance. Reject zero candidates. Duplicate same-plane order has already failed package validation.

- [ ] **Step 5: Build exhaustive ownership collections**

Map runtime requirements exactly:

```text
existing-blocker-fallback -> ownership.blockers
extend-decor-fallback     -> ownership.decor
extend-fence-fallback     -> ownership.fences
remain-live               -> no ownership entry
fallback-tile             -> no ownership entry
none                      -> no ownership entry
```

Reject any unrecognized requirement or duplicate source ID.

- [ ] **Step 6: Validate generated ownership**

Require each generated owner list to contain one base descriptor ID, forbid foreground IDs, require the source object to exist in the assembled collection, and forbid targeting an HPA-398 already-owned blocker.

- [ ] **Step 7: Run focused tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts
bun run check
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts
git commit -m "feat(hpa-406): resolve generated visual ownership"
```

---

### Task 6: Generate and Verify the Runtime Package and LFS Assets

**Files:**
- Create: `tools/generate-meadow-entry-runtime-package.ts`
- Create: `tools/verify-meadow-entry-runtime-storage.ts`
- Create: `src/lib/game/content/generated/meadow-entry-runtime-package.ts`
- Create: `public/game/assets/regions/meadow-entry/*.png` as Git LFS paths
- Modify: `.gitattributes`
- Modify: `package.json`
- Modify tests: `src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts`

**Interfaces:**
- Consumes: pure package builder and ownership resolver from Tasks 4–5.
- Produces: committed generated TypeScript, 22 byte-identical runtime PNGs, `--check`, package scripts, and storage verification.

- [ ] **Step 1: Write failing generator freshness tests**

Add tests that run the generator in a temporary directory, compare two generated modules byte-for-byte, reject stale output in `--check`, and reject an approval hash mismatch.

- [ ] **Step 2: Run and verify failure**

```bash
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts
```

Expected: generator tests fail because the CLI and generated file do not exist.

- [ ] **Step 3: Implement atomic generation**

The CLI must:

```ts
const check = process.argv.includes('--check');
await generateMeadowEntryRuntimePackage({ root: process.cwd(), check });
```

Write generated TypeScript and copied PNGs into a temporary sibling directory, verify every byte/hash/dimension, and rename into place only after all outputs pass. In `--check`, compare expected bytes without mutating the tree.

- [ ] **Step 4: Add package scripts**

Add:

```json
{
  "world:generate:meadow-entry-runtime": "bun tools/generate-meadow-entry-runtime-package.ts",
  "world:validate:meadow-entry-runtime": "bun tools/generate-meadow-entry-runtime-package.ts --check",
  "art:storage:meadow-entry-runtime": "bun tools/verify-meadow-entry-runtime-storage.ts"
}
```

Preserve all existing scripts.

- [ ] **Step 5: Add the scoped Git LFS rule**

Append to `.gitattributes`:

```text
public/game/assets/regions/meadow-entry/**/*.png filter=lfs diff=lfs merge=lfs -text
```

Do not change the storage rule for `public/game/assets/regions/sundrop-village-base.png` or foreground.

- [ ] **Step 6: Generate the package and inspect LFS status**

```bash
bun run world:generate:meadow-entry-runtime
git lfs status
git lfs ls-files public/game/assets/regions/meadow-entry
```

Expected: 22 generated runtime PNG paths are LFS tracked.

- [ ] **Step 7: Implement storage verification**

Verify source/runtime SHA-256 equality, matching LFS OIDs, PNG signatures after materialization, no pointer text passed to Sharp, and raw materialized existence of the two HPA-398 sibling files.

- [ ] **Step 8: Run package and storage checks**

```bash
bun run world:validate:meadow-entry-runtime
bun run art:storage:meadow-entry-runtime
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts
```

Expected: all commands exit `0`.

- [ ] **Step 9: Commit**

```bash
git add \
  .gitattributes \
  package.json \
  tools/generate-meadow-entry-runtime-package.ts \
  tools/verify-meadow-entry-runtime-storage.ts \
  src/lib/game/content/generated/meadow-entry-runtime-package.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts \
  public/game/assets/regions/meadow-entry
git commit -m "feat(hpa-406): generate approved meadow runtime assets"
```

---

### Task 7: Compose Generated Backgrounds and Ownership After Region Merge

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-composition.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts`
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/content/maps/regions/village-layered.test.ts`

**Interfaces:**
- Consumes: merged authored regions, HPA-398 ordering adapter, generated package, generated ownership, existing Sundrop ownership.
- Produces: pure `composeMeadowEntryRuntime(merged, package)` and final composed arrays.

- [ ] **Step 1: Write failing composition tests**

Test that composition:

```ts
const composed = composeMeadowEntryRuntime(mergedFixture, packageFixture);
expect(composed.backgroundImages.map((entry) => entry.id)).toEqual([
  'sundrop-village-base-image',
  'sundrop-village-foreground-image',
  'meadow-entry-sundrop-village-underlay-base-image'
]);
expect(composed.blockers.find((entry) => entry.id === 'hpa398-owned')?.visual).toEqual(
  existingHpa398Visual
);
expect(mergedFixture).toEqual(originalMergedFixture);
```

Add failures for duplicate background IDs, generated ownership targeting an already-owned blocker, missing dependency, and missing source object.

- [ ] **Step 2: Run and verify failure**

```bash
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts
```

Expected: composition tests fail because the final compositor does not exist.

- [ ] **Step 3: Implement pure generated-ownership application**

Return new arrays, clone only changed entries, reject unknown source IDs, reject already-owned items, and attach `{ mode: 'fallback-only', ownerBackgroundIds: [ownerBackgroundId] }`.

- [ ] **Step 4: Implement background append and dependency validation**

Compose HPA-398 descriptors first, append selected generated descriptors, validate unique IDs/order/dependencies, then validate generic ownership and Sundrop coverage.

- [ ] **Step 5: Replace meadow-entry assembly**

In `meadow-entry.ts`, keep `mergeRegions(...)` unchanged and replace the blocker-only post-processing with `composeMeadowEntryRuntime(...)`. For the first checkpoint commit, select the exact Checkpoint 1 generated IDs listed in Task 10; later tasks expand and finally remove the selector.

- [ ] **Step 6: Update production-map tests**

Add composed HPA-398 order/dependency expectations and manifest-derived HPA-406 descriptor assertions. Keep fragment-level authored equality unchanged.

- [ ] **Step 7: Run focused tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps.test.ts
bun run check
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add \
  src/lib/game/content/backgrounds/meadow-entry-runtime-composition.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts \
  src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts
git commit -m "feat(hpa-406): compose generated meadow backgrounds"
```

---

### Task 8: Implement Base-Then-Foreground Rendering and Generic Diagnostics

**Files:**
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `tests/e2e/game.e2e.ts`

**Interfaces:**
- Consumes: composed descriptors, `getMapBackgroundDepth`, `shouldRenderOwnedVisual`.
- Produces: deterministic base phase, foreground dependency phase, final fallback selection, `blocked-by-base`, decor/fence fallback diagnostics.

- [ ] **Step 1: Write failing diagnostic and scene tests**

Add tests proving:

```ts
expect(renderStatuses).toEqual([
  ['base-a', 'rendered'],
  ['foreground-a', 'blocked-by-base']
]);
expect(successfulBackgroundIds).toEqual(['base-a']);
```

Use a missing/failed dependency case where foreground appears earlier in input order. Add disabled-mode coverage proving foreground status remains `disabled`, not `blocked-by-base`.

Add diagnostic expectations for `selectedFallbackDecorIds`, `selectedFallbackFenceIds`, and `selectedFallbackFenceSegmentCount`.

- [ ] **Step 2: Run and verify failure**

```bash
bun run test:unit -- --run \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: failures because rendering is still a single array-order pass.

- [ ] **Step 3: Extend the diagnostic contracts**

Add `blocked-by-base` to `RegionalBackgroundRenderStatus` and additive optional decor/fence fallback fields. Keep blocker fields unchanged for compatibility.

- [ ] **Step 4: Implement the three runtime phases**

In `renderRegionalBackgrounds`:

```text
1. disabled shortcut: emit disabled for all descriptors, then fallback from empty set
2. sort and evaluate every base
3. sort and evaluate every foreground whose base succeeded
4. emit blocked-by-base for foregrounds whose dependency did not succeed
5. select blocker/decor/fence fallbacks from the final success set
```

Pass the full descriptor to `getMapBackgroundDepth(background)`.

- [ ] **Step 5: Gate decor and fence rendering**

Update `renderMapDecor` and `renderFences` to call `shouldRenderOwnedVisual` using the final background success set. Keep collision creation independent from visual rendering.

- [ ] **Step 6: Update e2e depth and fallback assertions**

Replace exact `-9`/`100` assumptions with descriptor-derived expected depths. Add assertions for `blocked-by-base` and all selected fallback collections.

- [ ] **Step 7: Run focused and e2e tests**

```bash
bun run test:unit -- --run \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts \
  src/lib/game/content/maps/background-ownership.test.ts
bun run build
bunx playwright test tests/e2e/game.e2e.ts --grep "regional background"
```

Expected: focused tests and selected Playwright tests pass.

- [ ] **Step 8: Commit**

```bash
git add \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/WorldScene.ts \
  src/lib/game/phaser/scenes/scenes.test.ts \
  tests/e2e/game.e2e.ts
git commit -m "feat(hpa-406): render regional backgrounds in dependency order"
```

---

### Task 9: Add the Runtime Load-Plan Boundary

**Files:**
- Create: `src/lib/game/content/backgrounds/regional-background-load-plan.ts`
- Create: `src/lib/game/content/backgrounds/regional-background-load-plan.test.ts`
- Modify: `src/lib/game/phaser/renderer-diagnostics.ts`
- Modify: `src/lib/game/phaser/renderer-diagnostics.test.ts`
- Modify: `src/lib/game/phaser/scenes/BootScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `tests/e2e/game.e2e.ts`

**Interfaces:**
- Consumes: composed map and combined asset inventory.
- Produces:
  - `RegionalBackgroundLoadPlan`
  - `buildRegionalBackgroundLoadPlan(...)`
  - loader diagnostics that distinguish inventory and planned load
  - BootScene queue based only on plan IDs

- [ ] **Step 1: Write failing load-plan tests**

```ts
it('builds an eager-map plan from composed map references', () => {
  const plan = buildRegionalBackgroundLoadPlan({
    strategy: 'eager-map',
    map: mapFixture,
    inventory: inventoryFixture
  });
  expect(plan.assetIds).toEqual(['base-a', 'foreground-a']);
  expect(plan.estimatedDecodedRgbaBytes).toBe(80_000);
});

it('rejects a foreground without its base in an explicit streamed plan', () => {
  expect(() =>
    buildRegionalBackgroundLoadPlan({
      strategy: 'streamed',
      map: mapFixture,
      inventory: inventoryFixture,
      requestedAssetIds: ['foreground-a'],
      reason: 'test'
    })
  ).toThrow(/missing base dependency/);
});
```

Also test disabled mode returns zero assets and deterministic plan order.

- [ ] **Step 2: Run and verify failure**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/regional-background-load-plan.test.ts \
  src/lib/game/phaser/renderer-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: failures because load planning and new diagnostics do not exist.

- [ ] **Step 3: Implement the discriminated input and plan**

```ts
export type RegionalBackgroundLoadStrategy = 'eager-map' | 'streamed';

export type BuildRegionalBackgroundLoadPlanInput =
  | { strategy: 'eager-map'; map: WorldMapDefinition; inventory: readonly RegionalBackgroundAsset[] }
  | { strategy: 'streamed'; map: WorldMapDefinition; inventory: readonly RegionalBackgroundAsset[]; requestedAssetIds: readonly string[]; reason: string };
```

Validate every asset ID, dependency closure, unique texture keys, and deterministic order by composed descriptor order.

- [ ] **Step 4: Extend renderer-load diagnostics**

Add inventory count, planned count, compressed estimate, decoded RGBA estimate, strategy, and completion count. Preserve existing renderer/max-texture/load timing fields.

- [ ] **Step 5: Make BootScene consume the plan**

Resolve the opening map before preload selection, build an eager-map plan when regional backgrounds are enabled, and queue only `plan.assetIds`. When disabled, build an explicit zero-asset plan and queue none.

- [ ] **Step 6: Parameterize completion-count tests**

Replace hard-coded `2` expectations with `loadPlan.assetIds.length`. Keep disabled expectations at `0`.

- [ ] **Step 7: Run tests and selected e2e**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/regional-background-load-plan.test.ts \
  src/lib/game/phaser/renderer-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
bun run build
bunx playwright test tests/e2e/game.e2e.ts --grep "regional background load"
```

Expected: all selected tests pass.

- [ ] **Step 8: Commit**

```bash
git add \
  src/lib/game/content/backgrounds/regional-background-load-plan.ts \
  src/lib/game/content/backgrounds/regional-background-load-plan.test.ts \
  src/lib/game/phaser/renderer-diagnostics.ts \
  src/lib/game/phaser/renderer-diagnostics.test.ts \
  src/lib/game/phaser/scenes/BootScene.ts \
  src/lib/game/phaser/scenes/scenes.test.ts \
  tests/e2e/game.e2e.ts
git commit -m "feat(hpa-406): plan regional background loading"
```

---

### Task 10: Complete Checkpoint 1 and Decide Eager Versus Streaming

**Files:**
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Create: `tests/e2e/meadow-entry-backgrounds.e2e.ts`
- Create: `docs/superpowers/reports/hpa-406/checkpoint-1-crossroads-connectors.md`
- Create: `docs/superpowers/reports/hpa-406/checkpoint-1-load-safety.json`
- Create evidence: `docs/superpowers/reports/hpa-406/checkpoint-1/`
- Modify if defects found: `docs/superpowers/reports/hpa-406/defects.json`

**Interfaces:**
- Consumes: complete generated inventory, composed map selector, load plan, renderer diagnostics, HPA-495 skills/packet.
- Produces: Crossroads/connectors runtime integration, field evidence, and explicit accepted load strategy.

**Checkpoint 1 descriptor IDs:**

```text
meadow-entry-sundrop-village-underlay-base-image
meadow-entry-village-crossroads-connector-base-image
meadow-entry-village-crossroads-connector-foreground-image
meadow-entry-crossroads-coast-connector-base-image
meadow-entry-crossroads-coast-connector-foreground-image
meadow-entry-crossroads-mistfen-connector-base-image
meadow-entry-crossroads-mistfen-connector-foreground-image
meadow-entry-crossroads-silverpine-connector-base-image
meadow-entry-crossroads-silverpine-connector-foreground-image
meadow-entry-crossroads-wildwood-connector-base-image
meadow-entry-crossroads-wildwood-connector-foreground-image
meadow-entry-crossroads-base-image
meadow-entry-crossroads-foreground-image
```

- [ ] **Step 1: Write failing checkpoint map/e2e tests**

Add assertions that all 13 IDs are composed, all connector foreground dependencies point to their matching base, Village ↔ Crossroads route samples remain clear, and HPA-398 overlays remain above every HPA-399 crop on their plane.

- [ ] **Step 2: Add focused evidence helpers**

In `meadow-entry-backgrounds.e2e.ts`, derive probe positions from descriptor centers. Add cases for enabled, disabled, missing, invalid dimensions, partial foreground, collision overlay, injected base/foreground failure, `blocked-by-base`, save/reload, and controller traversal.

When `HPA406_WRITE_EVIDENCE=1`, write deterministic JSON and screenshots into `docs/superpowers/reports/hpa-406/checkpoint-1/`.

- [ ] **Step 3: Run tests and verify failure**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bunx playwright test tests/e2e/meadow-entry-backgrounds.e2e.ts --grep "checkpoint 1"
```

Expected: failures until the Checkpoint 1 IDs are attached and evidence helpers are complete.

- [ ] **Step 4: Attach the Checkpoint 1 descriptor subset**

Use a temporary internal constant in `meadow-entry.ts` or composition module containing exactly the 13 IDs above. This is an implementation checkpoint selector, not a runtime flag; Tasks 11–12 expand and remove it.

- [ ] **Step 5: Implement the full-inventory safety probe**

Create an explicit load plan containing every inventory ID and record:

```json
{
  "version": 1,
  "issue": "HPA-406",
  "inventoryAssetCount": 24,
  "hpa496AssetCount": 22,
  "hpa496CompressedBytes": 109509947,
  "hpa496Pixels": 98893824,
  "hpa496DecodedRgbaBytes": 395575296,
  "combinedDecodedRgbaEstimateBytes": 417595392,
  "strategyDecision": "eager-map",
  "decisionAcceptedBy": "",
  "referenceEnvironment": {
    "browser": "",
    "renderer": "",
    "maxTextureSize": 0,
    "os": "",
    "hardware": ""
  },
  "load": {
    "queued": 0,
    "completed": 0,
    "loadMs": 0,
    "bootToWorldReadyMs": 0,
    "loaderErrors": [],
    "contextLost": false,
    "allocationFailure": false
  },
  "residualRisks": []
}
```

The evidence writer must replace every empty string/zero measurement with observed values before committing. `strategyDecision` must be either `eager-map` or `streamed-required`.

- [ ] **Step 6: Run the load-safety and checkpoint evidence suite**

```bash
HPA406_WRITE_EVIDENCE=1 bunx playwright test \
  tests/e2e/meadow-entry-backgrounds.e2e.ts \
  --grep "checkpoint 1|full inventory load safety"
```

Expected: evidence files are written and tests pass without loader error, crash, context loss, or allocation failure.

- [ ] **Step 7: Apply the decision gate**

If `strategyDecision` is `streamed-required`, stop. Create a new Linear ticket for camera/crop-aware loading and unloading, make HPA-406 blocked by it, and do not begin Task 11.

If `strategyDecision` is `eager-map`, record the human approval identity and residual device risk, then continue.

- [ ] **Step 8: Write the Checkpoint 1 report**

Record consumed HPA-514/HPA-495 fingerprints, skill decisions, commands, visual approvals, load decision, route results, fallback cases, defects, and residual risks.

- [ ] **Step 9: Run Checkpoint 1 gates**

```bash
bun run world:validate:meadow-entry-runtime
bun run art:storage:meadow-entry-runtime
bun run test:unit -- --run \
  src/lib/game/content/maps.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
bunx playwright test tests/e2e/meadow-entry-backgrounds.e2e.ts --grep "checkpoint 1"
```

Expected: all commands pass.

- [ ] **Step 10: Commit Checkpoint 1**

```bash
git add \
  src/lib/game/content/maps/meadow-entry.ts \
  tests/e2e/meadow-entry-backgrounds.e2e.ts \
  docs/superpowers/reports/hpa-406/checkpoint-1-crossroads-connectors.md \
  docs/superpowers/reports/hpa-406/checkpoint-1-load-safety.json \
  docs/superpowers/reports/hpa-406/checkpoint-1 \
  docs/superpowers/reports/hpa-406/defects.json
git commit -m "feat(hpa-406): integrate crossroads and connectors"
```

---

### Task 11: Complete Checkpoint 2 — Tidewatch Coast and Silverpine

**Files:**
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `tests/e2e/meadow-entry-backgrounds.e2e.ts`
- Create: `docs/superpowers/reports/hpa-406/checkpoint-2-coast-silverpine.md`
- Create evidence: `docs/superpowers/reports/hpa-406/checkpoint-2/`
- Modify if needed: `docs/superpowers/reports/hpa-406/defects.json`

**Interfaces:**
- Consumes: accepted load strategy and Checkpoint 1 runtime foundation.
- Produces: Coast/Silverpine descriptor attachment, ownership, routes, and evidence.

**Checkpoint 2 added IDs:**

```text
meadow-entry-tidewatch-coast-base-image
meadow-entry-tidewatch-coast-foreground-image
meadow-entry-silverpine-base-image
meadow-entry-silverpine-foreground-image
```

- [ ] **Step 1: Write failing map and e2e tests**

Assert all four IDs are composed, ownership suppresses only generated base-owned blocker/decor/fence visuals, Coast and Silverpine route samples remain clear, and gates/rewards/NPCs retain their IDs and behavior.

- [ ] **Step 2: Run and verify failure**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bunx playwright test tests/e2e/meadow-entry-backgrounds.e2e.ts --grep "checkpoint 2"
```

Expected: failures because the four descriptors are not attached yet.

- [ ] **Step 3: Expand the cumulative selector**

Add exactly the four IDs above to the temporary internal selector. Do not add Mistfen, Wildwood, or east-boundary IDs yet.

- [ ] **Step 4: Add Coast and Silverpine evidence cases**

Capture mandatory enabled, disabled, missing, invalid, partial foreground, and collision-overlay modes for both region groups. Add one representative base failure, foreground failure, `blocked-by-base`, save/reload, and controller traversal scenario for the checkpoint.

- [ ] **Step 5: Run evidence and focused gates**

```bash
HPA406_WRITE_EVIDENCE=1 bunx playwright test \
  tests/e2e/meadow-entry-backgrounds.e2e.ts \
  --grep "checkpoint 2"
bun run test:unit -- --run \
  src/lib/game/content/maps.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: all tests pass and evidence is written.

- [ ] **Step 6: Write the Checkpoint 2 report**

Record route/gate/reward checks, fallback outcomes, skill usage, fingerprints, commands, approvals, defects, and residual risks.

- [ ] **Step 7: Commit Checkpoint 2**

```bash
git add \
  src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/content/maps.test.ts \
  tests/e2e/meadow-entry-backgrounds.e2e.ts \
  docs/superpowers/reports/hpa-406/checkpoint-2-coast-silverpine.md \
  docs/superpowers/reports/hpa-406/checkpoint-2 \
  docs/superpowers/reports/hpa-406/defects.json
git commit -m "feat(hpa-406): integrate coast and silverpine"
```

---

### Task 12: Complete Checkpoint 3 — Mistfen, Wildwood, and East Boundary

**Files:**
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `tests/e2e/meadow-entry-backgrounds.e2e.ts`
- Create: `docs/superpowers/reports/hpa-406/checkpoint-3-mistfen-wildwood.md`
- Create evidence: `docs/superpowers/reports/hpa-406/checkpoint-3/`
- Modify if needed: `docs/superpowers/reports/hpa-406/defects.json`

**Interfaces:**
- Consumes: Checkpoints 1–2 and accepted load strategy.
- Produces: all 22 HPA-496 descriptors attached with no remaining checkpoint selector.

**Checkpoint 3 added IDs:**

```text
meadow-entry-mistfen-base-image
meadow-entry-mistfen-foreground-image
meadow-entry-wildwood-base-image
meadow-entry-wildwood-foreground-image
meadow-entry-outer-boundary-east-forest-lane-base-image
```

- [ ] **Step 1: Write failing final-coverage tests**

Assert every generated descriptor ID is present exactly once, zero approved descriptors remain unintegrated, Mistfen narrow-passage samples stay clear, Wildwood combat/cave routes remain reachable, and live enemies/pickups/discoveries/transitions retain behavior.

- [ ] **Step 2: Run and verify failure**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bunx playwright test tests/e2e/meadow-entry-backgrounds.e2e.ts --grep "checkpoint 3"
```

Expected: failures because final descriptors are not attached.

- [ ] **Step 3: Remove the checkpoint selector and attach the complete package**

Replace the temporary selected-ID list with `meadowEntryRuntimePackage.backgrounds`. Add a test that no checkpoint selection constant remains in runtime code.

- [ ] **Step 4: Add Mistfen/Wildwood evidence cases**

Capture mandatory visual modes and representative synthetic failure/save/traversal scenarios. Include enemy/pickup/cave readability under foreground and collision-overlay evidence through narrow passages.

- [ ] **Step 5: Run evidence and final checkpoint tests**

```bash
HPA406_WRITE_EVIDENCE=1 bunx playwright test \
  tests/e2e/meadow-entry-backgrounds.e2e.ts \
  --grep "checkpoint 3"
bun run test:unit -- --run \
  src/lib/game/content/maps.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: all tests pass and final checkpoint evidence is written.

- [ ] **Step 6: Write the Checkpoint 3 report**

Record collision/occlusion/combat/cave results, fingerprints, skill usage, approvals, commands, defects, and residual risks.

- [ ] **Step 7: Commit Checkpoint 3**

```bash
git add \
  src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/content/maps.test.ts \
  tests/e2e/meadow-entry-backgrounds.e2e.ts \
  docs/superpowers/reports/hpa-406/checkpoint-3-mistfen-wildwood.md \
  docs/superpowers/reports/hpa-406/checkpoint-3 \
  docs/superpowers/reports/hpa-406/defects.json
git commit -m "feat(hpa-406): integrate mistfen and wildwood"
```

---

### Task 13: Run the Complete Gate and Prepare the Single PR for Review

**Files:**
- Modify only if verification exposes a defect: files owned by the failing task.
- Update: PR #20 body and checklist.
- Keep: `docs/superpowers/reports/hpa-406/defects.json` complete and truthful.

**Interfaces:**
- Consumes: all implementation and checkpoint evidence.
- Produces: verified single HPA-406 PR ready for human review, or a precise blocked/failing report.

- [ ] **Step 1: Verify generated/package/storage freshness**

```bash
bun run world:validate:meadow-entry-runtime
bun run art:validate:meadow-entry-controls
bun run art:validate:meadow-entry
bun run art:storage:meadow-entry-runtime
```

Expected: all commands exit `0` without modifying files.

- [ ] **Step 2: Run unit and e2e tests**

```bash
bun run test
```

Expected: all Vitest and Playwright tests pass.

- [ ] **Step 3: Run static and build gates**

```bash
bun run check
bun run lint
bun run build
bun run build:tauri
```

Expected: all commands exit `0`.

- [ ] **Step 4: Run conditional Rust gates if Rust/Cargo changed**

```bash
if ! git diff --quiet main...HEAD -- src-tauri Cargo.toml Cargo.lock; then
  cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
  cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
  cargo test --manifest-path src-tauri/Cargo.toml
fi
```

Expected: either no Rust changes or all Rust gates pass.

- [ ] **Step 5: Verify evidence completeness**

```bash
test -s docs/superpowers/reports/hpa-406/checkpoint-1-crossroads-connectors.md
test -s docs/superpowers/reports/hpa-406/checkpoint-1-load-safety.json
test -s docs/superpowers/reports/hpa-406/checkpoint-2-coast-silverpine.md
test -s docs/superpowers/reports/hpa-406/checkpoint-3-mistfen-wildwood.md
bun --eval 'const r=await Bun.file("docs/superpowers/reports/hpa-406/checkpoint-1-load-safety.json").json(); if(!["eager-map","streamed-required"].includes(r.strategyDecision)) throw new Error("missing load decision"); if(!r.decisionAcceptedBy) throw new Error("missing load decision approval"); console.log(r.strategyDecision);'
```

Expected: all files exist and the load decision is approved.

- [ ] **Step 6: Verify no permanent checkpoint selector remains**

```bash
if git grep -n 'CHECKPOINT_[123]_BACKGROUND_IDS\|checkpointBackgroundIds' -- src; then
  exit 1
fi
```

Expected: no matches.

- [ ] **Step 7: Verify one-ticket/one-PR scope**

```bash
git status --short
git log --oneline main..HEAD
git diff --stat main...HEAD
```

Expected: clean working tree, reviewable task/checkpoint commits, and only HPA-406 scope.

- [ ] **Step 8: Commit any final report-only corrections**

If verification changed reports only:

```bash
git add docs/superpowers/reports/hpa-406
git commit -m "docs(hpa-406): finalize integration evidence"
```

Do not create an empty commit.

- [ ] **Step 9: Update PR #20 and mark ready only with evidence**

Update the PR body with:

```text
- accepted load strategy and Checkpoint 1 measurements
- Checkpoint 1/2/3 evidence links
- full validation command results
- residual risks
- explicit statement that HPA-411 owns final performance acceptance
```

Mark ready for review only after Steps 1–7 pass. If a command fails, keep the PR draft and report the exact failing command/output.
