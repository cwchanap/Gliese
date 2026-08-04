# HPA-406 Meadow-Entry Outdoor Runtime Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the 22 approved HPA-496 regional exports with the minimum runtime changes required: deterministic package generation, ordered base/foreground rendering, blocker/decor/fence fallback ownership, and focused checkpoint evidence.

**Architecture:** Run an isolated texture-safety preflight before changing runtime architecture. If it passes, add `drawOrder` directly to the existing background descriptor, derive foreground/base pairing from stable IDs, generate one runtime package from HPA-399/HPA-496 inputs, compose it after `mergeRegions`, render bases before foregrounds, and preload only assets referenced by the current map. Do not introduce speculative streaming, a dependency graph, a second background type hierarchy, or custom one-off evidence schemas.

**Tech Stack:** TypeScript 6, Phaser 4, Vite, Vitest 4, Playwright 1.59, Bun, Sharp, Tauri 2, Git LFS.

## Global Constraints

- Keep all HPA-406 work in PR #20. One Linear ticket maps to one PR.
- If the preflight or implementation proves the PR cannot remain reviewable, stop and rescope remaining work into new Linear tickets before opening more PRs.
- The texture-safety preflight may run before HPA-514/HPA-495 complete. All other runtime work requires their approved current outputs.
- HPA-399 geometry, overlaps, ownership, coverage, draw orders, and fingerprint are frozen.
- HPA-496 bytes, dimensions, filenames, hashes, texture keys, and provenance are frozen.
- Do not change gameplay geometry, collision, NPCs, encounters, rewards, discoveries, transitions, gates, story, or audio.
- Do not regenerate or retouch approved art.
- Keep one `MapBackgroundImage` type; add required `drawOrder` directly.
- Derive foreground/base pairing from stable IDs; do not add `dependsOnBackgroundId`.
- Do not add a streaming strategy enum or future streaming implementation.
- Do not add an HPA-406 aggregate art fingerprint; validate existing approval fields directly.
- New HPA-406 fallback entries use one base owner. Preserve HPA-398 multi-owner behavior.
- Add Git LFS only for `public/game/assets/regions/meadow-entry/**/*.png`.
- Use unit/scene tests for exhaustive failures and focused screenshots for distinct visual behavior.
- Keep checkpoint commits inside the single PR; remove temporary checkpoint selection before final review.

## File Structure

### Create

- `tools/probe-meadow-entry-texture-safety.ts`
- `src/lib/game/content/backgrounds/meadow-entry-runtime-package.ts`
- `src/lib/game/content/generated/meadow-entry-runtime-package.ts`
- `tools/generate-meadow-entry-runtime-package.ts`
- `tools/verify-meadow-entry-runtime-storage.ts`
- `src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-runtime-composition.ts`
- `src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts`
- `tests/e2e/meadow-entry-backgrounds.e2e.ts`
- `docs/superpowers/reports/hpa-406/preflight-texture-safety.json`
- `docs/superpowers/reports/hpa-406/checkpoint-1-crossroads-connectors.md`
- `docs/superpowers/reports/hpa-406/checkpoint-2-coast-silverpine.md`
- `docs/superpowers/reports/hpa-406/checkpoint-3-mistfen-wildwood.md`
- `docs/superpowers/reports/hpa-406/defects.json`

### Modify

- `.gitattributes`
- `package.json`
- `src/lib/game/content/maps/types.ts`
- `src/lib/game/content/maps/layered/region-background.ts`
- `src/lib/game/content/maps/regions/village.ts`
- `src/lib/game/content/maps/regions/village-layered.test.ts`
- `src/lib/game/content/maps/background-ownership.ts`
- `src/lib/game/content/maps/background-ownership.test.ts`
- `src/lib/game/content/maps/meadow-entry.ts`
- `src/lib/game/content/maps.test.ts`
- `src/lib/game/content/assets.ts`
- `src/lib/game/content/assets.test.ts`
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

### Task 1: Run the Texture-Safety Preflight Before Runtime Work

**Files:**
- Create: `tools/probe-meadow-entry-texture-safety.ts`
- Create: `docs/superpowers/reports/hpa-406/preflight-texture-safety.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: `meadowEntryArtPackageApproval.exports` and materialized HPA-496 artifact PNGs.
- Produces: a machine-readable go/stop result before any model, generator, or renderer migration.

- [ ] **Step 1: Add a static dimension assertion**

In the probe, compute the largest width and height from approval metadata and print all exports exceeding 4096:

```ts
const over4096 = meadowEntryArtPackageApproval.exports.filter(
  (entry) => entry.width > 4_096 || entry.height > 4_096
);

console.log(JSON.stringify({
  over4096: over4096.map(({ path, width, height }) => ({ path, width, height }))
}, null, 2));
```

Expected current matches:

```text
wildwood-base.png: 2688 × 4928
outer-boundary-east-forest-lane-base.png: 1440 × 4608
```

- [ ] **Step 2: Implement an isolated browser/WebGL probe**

The script must start a local HTTP server that serves only approved artifact paths, launch Chromium through Playwright, and evaluate:

```ts
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
if (!gl) throw new Error('WebGL unavailable');

const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
const results = [];

for (const asset of assets) {
  const startedAt = performance.now();
  try {
    const response = await fetch(asset.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bitmap = await createImageBitmap(await response.blob());

    const texture = gl.createTexture();
    if (!texture) throw new Error('createTexture returned null');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      bitmap
    );
    const error = gl.getError();
    gl.deleteTexture(texture);
    bitmap.close();
    if (error !== gl.NO_ERROR) throw new Error(`WebGL error ${error}`);

    results.push({ id: asset.id, status: 'uploaded', ms: performance.now() - startedAt });
  } catch (error) {
    results.push({
      id: asset.id,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      ms: performance.now() - startedAt
    });
  }
}
```

Also listen for `webglcontextlost` and record browser, renderer, OS, hardware, total time, and every result.

- [ ] **Step 3: Add the command**

```json
"world:probe:meadow-entry-textures": "bun tools/probe-meadow-entry-texture-safety.ts"
```

- [ ] **Step 4: Run the probe**

```bash
bun run world:probe:meadow-entry-textures
```

Expected: `preflight-texture-safety.json` is written with observed `maxTextureSize`, 22 asset results, no empty environment fields, and a decision of either `proceed` or `stop`.

- [ ] **Step 5: Apply the hard gate**

If any approved dimension exceeds observed `MAX_TEXTURE_SIZE`, an individual upload fails, the context is lost, or aggregate upload cannot complete, stop. Record the failing assets and route crop/export work to HPA-399/HPA-496 or load-management work to a new ticket. Do not begin Task 2.

If all uploads complete, set `decision: "proceed"` and continue. HPA-411 still owns final performance budgets.

- [ ] **Step 6: Commit the probe and evidence**

```bash
git add \
  tools/probe-meadow-entry-texture-safety.ts \
  docs/superpowers/reports/hpa-406/preflight-texture-safety.json \
  package.json
git commit -m "test(hpa-406): probe meadow texture safety"
```

---

### Task 2: Verify HPA-514 and HPA-495 Prerequisites

**Files:**
- Create: `docs/superpowers/reports/hpa-406/defects.json`

**Interfaces:**
- Consumes: approved HPA-514 catalog/fingerprint and HPA-495 Area Expansion Packet.
- Produces: exact prerequisite paths/fingerprints and an empty defect ledger.

- [ ] **Step 1: Require exactly one HPA-514 catalog output**

```bash
mapfile -t catalogs < <(git grep -l 'Story Integration Catalog' -- story src-tauri)
if [ "${#catalogs[@]}" -ne 1 ]; then
  printf 'expected exactly one catalog, found %s\n' "${#catalogs[@]}" >&2
  printf '%s\n' "${catalogs[@]}" >&2
  exit 1
fi
printf 'catalog=%s\n' "${catalogs[0]}"
bun run story:check:strict
```

Expected: exactly one non-documentation catalog path and strict story validation exits `0`.

- [ ] **Step 2: Require exactly one current meadow-entry packet**

```bash
mapfile -t packets < <(git grep -l '^areaId:.*meadow-entry' -- .agents docs | grep -v 'docs/superpowers')
if [ "${#packets[@]}" -ne 1 ]; then
  printf 'expected exactly one packet, found %s\n' "${#packets[@]}" >&2
  printf '%s\n' "${packets[@]}" >&2
  exit 1
fi
git grep -n 'fingerprint:' -- "${packets[0]}"
git grep -n 'staleConsumerStatus:' -- "${packets[0]}"
```

Expected: one packet with a current fingerprint and non-stale status. Otherwise stop.

- [ ] **Step 3: Verify frozen approvals**

```bash
bun run art:validate:meadow-entry-controls
bun run art:validate:meadow-entry
```

Expected: both commands exit `0` without modifying files.

- [ ] **Step 4: Create the defect ledger**

```json
{
  "version": 1,
  "issue": "HPA-406",
  "defects": []
}
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/reports/hpa-406/defects.json
git commit -m "docs(hpa-406): record integration prerequisites"
```

---

### Task 3: Add Ordered Backgrounds and Shared Visual Ownership

**Files:**
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/layered/region-background.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps/regions/village-layered.test.ts`
- Modify: `src/lib/game/content/maps/background-ownership.ts`
- Modify: `src/lib/game/content/maps/background-ownership.test.ts`
- Modify: `tools/render-sundrop-village-obstacle-proof.ts`

**Interfaces:**
- Produces `MapBackgroundImage.drawOrder`, `getRequiredBaseBackgroundId`, `MapVisualOwnership`, `shouldRenderOwnedVisual`, and generic ownership validation.

- [ ] **Step 1: Write failing order and pairing tests**

```ts
it('derives ordered depths without a raw depth field', () => {
  expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 1_000 })).toBe(-8.9);
  expect(getMapBackgroundDepth({ plane: 'foreground', drawOrder: 240 })).toBe(100.024);
});

it('derives the required base from stable foreground IDs', () => {
  expect(getRequiredBaseBackgroundId({
    id: 'meadow-entry-crossroads-foreground-image',
    textureKey: 'meadow-entry-crossroads-foreground',
    plane: 'foreground',
    drawOrder: 200,
    x: 0,
    y: 0,
    width: 1,
    height: 1
  })).toBe('meadow-entry-crossroads-base-image');
});
```

Add the HPA-398 special-case expectation.

- [ ] **Step 2: Write failing blocker/decor/fence ownership tests**

Create a map fixture with one fallback-only item in each collection and assert the validator accepts it, missing owners fail, and HPA-398 multi-owner `every(...)` semantics remain unchanged.

- [ ] **Step 3: Run and verify failure**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts
```

Expected: failures because `drawOrder`, derived pairing, and generic ownership do not exist.

- [ ] **Step 4: Add `drawOrder` directly**

```ts
export interface MapBackgroundImage extends MapRect {
  textureKey: string;
  plane: MapBackgroundPlane;
  drawOrder: number;
}
```

Add `drawOrder` to `createLayeredRegionBackground` input/return. Pass `drawOrder: 1_000` at both village call sites.

- [ ] **Step 5: Implement derived pairing and depth**

Implement the exact `getRequiredBaseBackgroundId(...)` and `getMapBackgroundDepth(...)` functions from the design. Validate stable foreground suffixes and the Sundrop special case.

- [ ] **Step 6: Generalize visual ownership**

Rename `MapBlockerVisual` to `MapVisualOwnership`, add optional `visual` to decor and fence segments, and implement `shouldRenderOwnedVisual(visual, successSet)`.

Extend ownership validation to blockers, decor, and fences, but do not duplicate collection-ID checks already performed by `mergeRegions`.

- [ ] **Step 7: Update affected tests and proof utility**

Add `drawOrder: 1_000` to exact HPA-398 production descriptor expectations. Update all depth calls to pass a descriptor-like object.

- [ ] **Step 8: Run focused gates**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
bun run check
```

Expected: tests pass and HPA-398 behavior is unchanged.

- [ ] **Step 9: Commit**

```bash
git add \
  src/lib/game/content/maps/types.ts \
  src/lib/game/content/maps/layered/region-background.ts \
  src/lib/game/content/maps/regions/village.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps/background-ownership.ts \
  src/lib/game/content/maps/background-ownership.test.ts \
  tools/render-sundrop-village-obstacle-proof.ts
git commit -m "feat(hpa-406): order backgrounds and generalize ownership"
```

---

### Task 4: Generate the Minimal Runtime Package and LFS Assets

**Files:**
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-package.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts`
- Create: `src/lib/game/content/generated/meadow-entry-runtime-package.ts`
- Create: `tools/generate-meadow-entry-runtime-package.ts`
- Create: `tools/verify-meadow-entry-runtime-storage.ts`
- Create: `public/game/assets/regions/meadow-entry/*.png`
- Modify: `.gitattributes`
- Modify: `package.json`
- Modify: `src/lib/game/content/assets.ts`
- Modify: `src/lib/game/content/assets.test.ts`

**Interfaces:**
- Produces one `MeadowEntryRuntimePackage` containing minimal loader assets, ordered descriptors, existing control fingerprint, and blocker/decor/fence owner records.

- [ ] **Step 1: Write failing stable-mapping tests**

```ts
expect(getMeadowEntryBackgroundId(crossroadsBase))
  .toBe('meadow-entry-crossroads-base-image');
expect(getMeadowEntryRuntimePath(crossroadsBase))
  .toBe('/game/assets/regions/meadow-entry/crossroads-base.png');
```

Assert inventory totals are derived from approval metadata and every descriptor order matches the crop manifest.

- [ ] **Step 2: Write failing ownership-selection tests**

Test exact-edge containment, outward-margin rejection, highest-order full containment, overlap owner consistency, no containing crop, and an already-owned HPA-398 blocker conflict. Do not test primary-region selection.

- [ ] **Step 3: Run and verify failure**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts \
  src/lib/game/content/assets.test.ts
```

Expected: failures because the package builder does not exist.

- [ ] **Step 4: Implement minimal package types**

```ts
export interface RegionalBackgroundAsset {
  id: string;
  key: string;
  path: string;
  compressedBytes: number;
  decodedRgbaBytes: number;
  approvedPngSha256: string;
}
```

Keep plane, geometry, order, and pairing only in `MapBackgroundImage`.

- [ ] **Step 5: Implement package and owner generation**

Use the approved crop/overlap/bake manifests and existing geometry helpers. Select one base owner by full containment plus highest order. Verify `ownerCropId` only where both overlapping crops fully contain the source.

Store the existing HPA-399 `combinedControlFingerprint`; do not calculate a new aggregate art fingerprint.

- [ ] **Step 6: Implement atomic generation and `--check`**

Generate the TypeScript file and copy exact approved PNG bytes through a temporary output directory. In `--check`, compare expected output without mutating the tree.

- [ ] **Step 7: Add scoped LFS and scripts**

```text
public/game/assets/regions/meadow-entry/**/*.png filter=lfs diff=lfs merge=lfs -text
```

```json
"world:generate:meadow-entry-runtime": "bun tools/generate-meadow-entry-runtime-package.ts",
"world:validate:meadow-entry-runtime": "bun tools/generate-meadow-entry-runtime-package.ts --check",
"art:storage:meadow-entry-runtime": "bun tools/verify-meadow-entry-runtime-storage.ts"
```

- [ ] **Step 8: Implement lean storage verification**

Verify LFS tracking, valid materialized PNG signatures, and approved SHA-256 equality. Do not add a separate LFS OID equality assertion.

- [ ] **Step 9: Generate and test**

```bash
bun run world:generate:meadow-entry-runtime
bun run world:validate:meadow-entry-runtime
bun run art:storage:meadow-entry-runtime
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts \
  src/lib/game/content/assets.test.ts
bun run check
```

Expected: 22 generated runtime PNGs are valid and all checks pass.

- [ ] **Step 10: Commit**

```bash
git add \
  .gitattributes package.json \
  src/lib/game/content/assets.ts src/lib/game/content/assets.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts \
  src/lib/game/content/generated/meadow-entry-runtime-package.ts \
  tools/generate-meadow-entry-runtime-package.ts \
  tools/verify-meadow-entry-runtime-storage.ts \
  public/game/assets/regions/meadow-entry
git commit -m "feat(hpa-406): generate meadow runtime package"
```

---

### Task 5: Compose the Package and Render Bases Before Foregrounds

**Files:**
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-composition.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts`
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `tests/e2e/game.e2e.ts`

**Interfaces:**
- Produces pure post-merge ownership application and a two-phase renderer with `blocked-by-base`.

- [ ] **Step 1: Write failing composition tests**

Assert generated backgrounds append without replacing the HPA-398 pair, generated ownership never overwrites HPA-398, source arrays remain unchanged, and every foreground derives an existing base.

- [ ] **Step 2: Write failing renderer tests**

Use input order `[foreground-a, base-a]` and prove both render when base succeeds. Inject base failure and prove statuses are:

```ts
[
  ['base-a', 'render-failed'],
  ['foreground-a', 'blocked-by-base']
]
```

Add disabled mode and blocker/decor/fence fallback diagnostics.

- [ ] **Step 3: Run and verify failure**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: failures because composition and two-phase rendering do not exist.

- [ ] **Step 4: Implement pure post-merge composition**

Append selected generated descriptors, apply existing Sundrop ownership first, apply generated ownership second, reject conflicts, and run order/pair/ownership/Sundrop validations on the final arrays.

- [ ] **Step 5: Implement base → foreground → fallback rendering**

Sort and render all bases, then sort foregrounds and call `getRequiredBaseBackgroundId`. Emit `blocked-by-base` without creating the image when the base is absent from the success set. Select all fallback collections only after both phases.

- [ ] **Step 6: Gate decor and fence visuals**

Use `shouldRenderOwnedVisual` in decor/fence render paths while keeping collision creation unconditional.

- [ ] **Step 7: Update diagnostics and e2e assertions**

Add optional selected decor/fence IDs and descriptor-derived depth expectations. Preserve existing blocker fields.

- [ ] **Step 8: Run focused gates**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
bun run build
bunx playwright test tests/e2e/game.e2e.ts --grep "regional background"
```

Expected: all selected tests pass.

- [ ] **Step 9: Commit**

```bash
git add \
  src/lib/game/content/backgrounds/meadow-entry-runtime-composition.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts \
  src/lib/game/content/maps/meadow-entry.ts src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/WorldScene.ts \
  src/lib/game/phaser/scenes/scenes.test.ts \
  tests/e2e/game.e2e.ts
git commit -m "feat(hpa-406): compose and render meadow backgrounds"
```

---

### Task 6: Select Map Assets for Boot Without a Strategy Framework

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-package.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts`
- Modify: `src/lib/game/phaser/renderer-diagnostics.ts`
- Modify: `src/lib/game/phaser/renderer-diagnostics.test.ts`
- Modify: `src/lib/game/phaser/scenes/BootScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `tests/e2e/game.e2e.ts`

**Interfaces:**
- Produces `buildRegionalBackgroundLoadPlan(map, inventory)` with no strategy enum.

- [ ] **Step 1: Write failing load-selection tests**

```ts
const plan = buildRegionalBackgroundLoadPlan(mapFixture, inventoryFixture);
expect(plan.assetIds).toEqual(['base-a', 'foreground-a']);
expect(plan.estimatedCompressedBytes).toBe(12_000);
expect(plan.estimatedDecodedRgbaBytes).toBe(80_000);
```

Add missing inventory reference, duplicate ID, deterministic descriptor-order, and empty disabled-plan tests.

- [ ] **Step 2: Run and verify failure**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts \
  src/lib/game/phaser/renderer-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: failures because map load selection does not exist.

- [ ] **Step 3: Implement the single production plan**

```ts
export interface RegionalBackgroundLoadPlan {
  assetIds: readonly string[];
  estimatedCompressedBytes: number;
  estimatedDecodedRgbaBytes: number;
}
```

Select exactly `map.backgroundImages` in descriptor order and validate each ID/key against inventory.

- [ ] **Step 4: Update BootScene**

When backgrounds are enabled, resolve the opening map, build the plan, and queue only its IDs. When disabled, queue none and emit zero planned assets. Do not report a strategy name.

- [ ] **Step 5: Parameterize diagnostics and tests**

Record inventory count, planned count, byte estimates, completion count, renderer, max texture size, and timings. Replace every hard-coded completion count of `2` with the plan length.

- [ ] **Step 6: Run focused gates**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts \
  src/lib/game/phaser/renderer-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
bun run build
bunx playwright test tests/e2e/game.e2e.ts --grep "regional background load"
```

Expected: tests pass; disabled mode queues zero and is not labeled streaming.

- [ ] **Step 7: Commit**

```bash
git add \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts \
  src/lib/game/phaser/renderer-diagnostics.ts \
  src/lib/game/phaser/renderer-diagnostics.test.ts \
  src/lib/game/phaser/scenes/BootScene.ts \
  src/lib/game/phaser/scenes/scenes.test.ts \
  tests/e2e/game.e2e.ts
git commit -m "feat(hpa-406): select regional assets for boot"
```

---

### Task 7: Complete Checkpoint 1 — Crossroads and Connectors

**Files:**
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Create: `tests/e2e/meadow-entry-backgrounds.e2e.ts`
- Create: `docs/superpowers/reports/hpa-406/checkpoint-1-crossroads-connectors.md`
- Modify: `docs/superpowers/reports/hpa-406/defects.json`

**Descriptor subset:** Sundrop underlay, five connector base/foreground pairs, and Crossroads base/foreground.

- [ ] **Step 1: Write failing map and route tests**

Assert the 13 checkpoint IDs are present, pair to the correct bases, preserve HPA-398 overlay ordering, and keep Village ↔ Crossroads route samples clear.

- [ ] **Step 2: Add focused e2e evidence**

Capture enabled composition, collision overlay, continuous traversal, one disabled/missing-base case, one partial-foreground case, and one save/reload case.

- [ ] **Step 3: Run and verify failure**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bunx playwright test tests/e2e/meadow-entry-backgrounds.e2e.ts --grep "checkpoint 1"
```

- [ ] **Step 4: Attach the exact checkpoint subset**

Use a temporary internal selected-ID constant. This is a commit-sequencing aid, not a runtime feature flag.

- [ ] **Step 5: Route HPA-495 gaps**

For each reusable skill defect, add its failing scenario and smallest correction to the HPA-495 PR, rerun that scenario, rerun the affected HPA-406 test, and record the HPA-495 commit SHA in the checkpoint report.

- [ ] **Step 6: Run checkpoint gates**

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

- [ ] **Step 7: Commit**

```bash
git add \
  src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/content/maps.test.ts \
  tests/e2e/meadow-entry-backgrounds.e2e.ts \
  docs/superpowers/reports/hpa-406/checkpoint-1-crossroads-connectors.md \
  docs/superpowers/reports/hpa-406/defects.json
git commit -m "feat(hpa-406): integrate crossroads and connectors"
```

---

### Task 8: Complete Checkpoints 2 and 3

**Files:**
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `tests/e2e/meadow-entry-backgrounds.e2e.ts`
- Create: `docs/superpowers/reports/hpa-406/checkpoint-2-coast-silverpine.md`
- Create: `docs/superpowers/reports/hpa-406/checkpoint-3-mistfen-wildwood.md`
- Modify: `docs/superpowers/reports/hpa-406/defects.json`

- [ ] **Step 1: Add failing Coast/Silverpine tests**

Assert Coast and Silverpine base/foreground IDs, route samples, live gates/NPCs/rewards, and generated visual suppression.

- [ ] **Step 2: Expand the temporary selector and run Checkpoint 2 evidence**

Capture enabled, collision, traversal, one fallback/partial case, and one save/reload case.

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bunx playwright test tests/e2e/meadow-entry-backgrounds.e2e.ts --grep "checkpoint 2"
```

Expected: pass after the four IDs are added.

- [ ] **Step 3: Commit Checkpoint 2**

```bash
git add \
  src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/content/maps.test.ts \
  tests/e2e/meadow-entry-backgrounds.e2e.ts \
  docs/superpowers/reports/hpa-406/checkpoint-2-coast-silverpine.md \
  docs/superpowers/reports/hpa-406/defects.json
git commit -m "feat(hpa-406): integrate coast and silverpine"
```

- [ ] **Step 4: Add failing final-coverage tests**

Assert Mistfen, Wildwood, and east-boundary IDs, zero unintegrated generated descriptors, Mistfen narrow-route clearance, Wildwood combat/cave reachability, and unchanged enemies/pickups/discoveries/transitions.

- [ ] **Step 5: Remove the selector and attach the full package**

Replace the temporary selected-ID list with `meadowEntryRuntimePackage.backgrounds`. Add a test or grep gate proving no checkpoint selector remains.

- [ ] **Step 6: Run Checkpoint 3 evidence**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bunx playwright test tests/e2e/meadow-entry-backgrounds.e2e.ts --grep "checkpoint 3"
```

Capture enabled, collision, traversal, one fallback/partial case, and one save/reload case.

- [ ] **Step 7: Commit Checkpoint 3**

```bash
git add \
  src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/content/maps.test.ts \
  tests/e2e/meadow-entry-backgrounds.e2e.ts \
  docs/superpowers/reports/hpa-406/checkpoint-3-mistfen-wildwood.md \
  docs/superpowers/reports/hpa-406/defects.json
git commit -m "feat(hpa-406): integrate mistfen and wildwood"
```

---

### Task 9: Run the Complete Gate and Prepare PR #20

- [ ] **Step 1: Verify generated and approved inputs**

```bash
bun run world:validate:meadow-entry-runtime
bun run art:validate:meadow-entry-controls
bun run art:validate:meadow-entry
bun run art:storage:meadow-entry-runtime
```

- [ ] **Step 2: Run tests**

```bash
bun run test
```

- [ ] **Step 3: Run static and build gates**

```bash
bun run check
bun run lint
bun run build
bun run build:tauri
```

- [ ] **Step 4: Run Rust gates only if Rust changed**

```bash
if ! git diff --quiet main...HEAD -- src-tauri Cargo.toml Cargo.lock; then
  cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
  cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
  cargo test --manifest-path src-tauri/Cargo.toml
fi
```

- [ ] **Step 5: Verify evidence and selector removal**

```bash
test -s docs/superpowers/reports/hpa-406/preflight-texture-safety.json
test -s docs/superpowers/reports/hpa-406/checkpoint-1-crossroads-connectors.md
test -s docs/superpowers/reports/hpa-406/checkpoint-2-coast-silverpine.md
test -s docs/superpowers/reports/hpa-406/checkpoint-3-mistfen-wildwood.md
if git grep -n 'CHECKPOINT_[123]_BACKGROUND_IDS\|checkpointBackgroundIds' -- src; then
  exit 1
fi
```

- [ ] **Step 6: Verify one-ticket/one-PR scope**

```bash
git status --short
git log --oneline main..HEAD
git diff --stat main...HEAD
```

Expected: clean tree and only HPA-406 scope.

- [ ] **Step 7: Update PR #20**

Record the preflight result, checkpoint evidence, exact validation results, residual risks, and that HPA-411 owns final performance acceptance. Mark ready only after every preceding command exits `0`.
