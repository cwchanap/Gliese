# HPA-406 Meadow-Entry Outdoor Runtime Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the 22 approved HPA-496 regional exports with the minimum runtime changes required: deterministic package generation, ordered two-phase rendering, blocker/decor/fence fallback ownership, map-based preload selection, and focused regional evidence.

**Architecture:** Run a standalone texture-safety preflight first. If it passes, add `drawOrder` directly to the existing background descriptor, derive foreground/base pairing from stable IDs, generate one runtime package from frozen manifests, compose it after `mergeRegions`, render all bases before foregrounds, and preload only map-referenced assets. Do not introduce speculative streaming, dependency graphs, a second background type hierarchy, custom aggregate fingerprints, or one-off evidence validators.

**Tech Stack:** TypeScript 6, Phaser 4, Vite, Vitest 4, Playwright 1.59, Bun, Sharp, Tauri 2, Git LFS.

## Global Constraints

- Keep all HPA-406 work in PR #20. One Linear ticket maps to one PR.
- If the work cannot remain one reviewable PR, stop and rescope remaining work into new Linear tickets before opening additional PRs.
- The texture preflight may run before HPA-514/HPA-495 complete. All other runtime work requires their approved current outputs.
- Treat HPA-399 geometry, overlap ownership, bake ownership, draw order, and fingerprint as frozen.
- Treat HPA-496 bytes, dimensions, filenames, hashes, texture keys, and provenance as frozen.
- Do not change gameplay geometry, collision, semantic objects, story, or approved art.
- Keep one `MapBackgroundImage` type with required `drawOrder`.
- Derive foreground/base pairing from stable IDs; do not add `dependsOnBackgroundId`.
- Keep HPA-398 multi-owner fallback semantics. New HPA-406 entries use one base owner.
- Add LFS only for `public/game/assets/regions/meadow-entry/**/*.png`.
- Use tests for exhaustive failure states and focused screenshots for distinct visual proof.
- Remove temporary checkpoint selection before final review.

---

### Task 1: Run the Texture-Safety Preflight

**Files:**
- Create: `tools/probe-meadow-entry-texture-safety.ts`
- Create: `docs/superpowers/reports/hpa-406/preflight-texture-safety.json`
- Modify: `package.json`

**Produces:** A hard `proceed` or `stop` decision before runtime architecture changes.

- [ ] **Step 1: Implement static inventory checks**

Read `meadowEntryArtPackageApproval.exports`, calculate total bytes/pixels, and list entries exceeding 4096 in either dimension. Current expected entries:

```text
wildwood-base.png                          2688 × 4928
outer-boundary-east-forest-lane-base.png   1440 × 4608
```

- [ ] **Step 2: Implement the isolated WebGL probe**

Start a local HTTP server for approved artifact paths and launch Chromium with Playwright. In the page:

```ts
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
if (!gl) throw new Error('WebGL unavailable');

const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
const retainedTextures: WebGLTexture[] = [];
const results: Array<Record<string, unknown>> = [];

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
    bitmap.close();

    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      gl.deleteTexture(texture);
      throw new Error(`WebGL error ${error}`);
    }

    retainedTextures.push(texture);
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

// Retain every successful texture until all uploads finish so the probe tests
// aggregate residency rather than one-at-a-time compatibility.
for (const texture of retainedTextures) gl.deleteTexture(texture);
```

Record `webglcontextlost`, browser, renderer, OS, hardware, total time, `maxTextureSize`, and all results.

- [ ] **Step 3: Add and run the command**

```json
"world:probe:meadow-entry-textures": "bun tools/probe-meadow-entry-texture-safety.ts"
```

```bash
bun run world:probe:meadow-entry-textures
```

Expected: JSON contains 22 results and a decision of `proceed` or `stop`.

- [ ] **Step 4: Apply the hard gate**

Stop before Task 2 when any dimension exceeds observed `MAX_TEXTURE_SIZE`, any individual upload fails, context loss occurs, or aggregate residency cannot complete. Route crop/export issues to HPA-399/HPA-496 and load-management issues to a new ticket.

- [ ] **Step 5: Commit**

```bash
git add tools/probe-meadow-entry-texture-safety.ts \
  docs/superpowers/reports/hpa-406/preflight-texture-safety.json package.json
git commit -m "test(hpa-406): probe meadow texture safety"
```

---

### Task 2: Verify Prerequisites

**Files:**
- Create: `docs/superpowers/reports/hpa-406/defects.json`

- [ ] **Step 1: Require exactly one HPA-514 catalog**

```bash
mapfile -t catalogs < <(git grep -l 'Story Integration Catalog' -- story src-tauri)
[ "${#catalogs[@]}" -eq 1 ] || { printf '%s\n' "${catalogs[@]}"; exit 1; }
bun run story:check:strict
```

- [ ] **Step 2: Require exactly one current meadow-entry packet**

```bash
mapfile -t packets < <(git grep -l '^areaId:.*meadow-entry' -- .agents docs | grep -v 'docs/superpowers')
[ "${#packets[@]}" -eq 1 ] || { printf '%s\n' "${packets[@]}"; exit 1; }
git grep -n 'fingerprint:' -- "${packets[0]}"
git grep -n 'staleConsumerStatus:' -- "${packets[0]}"
```

- [ ] **Step 3: Verify frozen approvals**

```bash
bun run art:validate:meadow-entry-controls
bun run art:validate:meadow-entry
```

- [ ] **Step 4: Create and commit the defect ledger**

```json
{"version":1,"issue":"HPA-406","defects":[]}
```

```bash
git add docs/superpowers/reports/hpa-406/defects.json
git commit -m "docs(hpa-406): record integration prerequisites"
```

---

### Task 3: Add Draw Order and Shared Visual Ownership

**Files:**
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/layered/region-background.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps/regions/village-layered.test.ts`
- Modify: `src/lib/game/content/maps/background-ownership.ts`
- Modify: `src/lib/game/content/maps/background-ownership.test.ts`
- Modify: `tools/render-sundrop-village-obstacle-proof.ts`

- [ ] **Step 1: Write failing depth/pairing tests**

```ts
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 1_000 })).toBe(-8.9);
expect(getRequiredBaseBackgroundId(foregroundFixture))
  .toBe('meadow-entry-crossroads-base-image');
```

Add the Sundrop foreground special case.

- [ ] **Step 2: Write failing blocker/decor/fence ownership tests**

Test valid owners, missing owners, generated single-base ownership, and unchanged HPA-398 multi-owner `every(...)` semantics.

- [ ] **Step 3: Run red tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts
```

- [ ] **Step 4: Implement minimal model changes**

```ts
export interface MapBackgroundImage extends MapRect {
  textureKey: string;
  plane: MapBackgroundPlane;
  drawOrder: number;
}
```

Add `drawOrder` to `createLayeredRegionBackground` input/return and pass `1_000` at the two village call sites.

Implement descriptor-based depth and derived foreground/base pairing from stable IDs. Do not add a graph field.

- [ ] **Step 5: Generalize ownership**

Rename the shared type to `MapVisualOwnership`, add optional `visual` to decor/fences, implement `shouldRenderOwnedVisual`, and extend owner-reference validation without duplicating `mergeRegions` ID checks.

- [ ] **Step 6: Run and commit**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
bun run check
git add src/lib/game/content/maps tools/render-sundrop-village-obstacle-proof.ts
git commit -m "feat(hpa-406): order backgrounds and generalize ownership"
```

---

### Task 4: Generate the Runtime Package and LFS Assets

**Files:**
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-package.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts`
- Create: `src/lib/game/content/generated/meadow-entry-runtime-package.ts`
- Create: `tools/generate-meadow-entry-runtime-package.ts`
- Create: `tools/verify-meadow-entry-runtime-storage.ts`
- Create: `public/game/assets/regions/meadow-entry/*.png`
- Modify: `.gitattributes`, `package.json`, `src/lib/game/content/assets.ts`, `src/lib/game/content/assets.test.ts`

- [ ] **Step 1: Write failing mapping/package tests**

Assert stable IDs/paths, approval-derived totals, exact descriptor orders, exact hashes, highest-order full-containment ownership, overlap owner consistency, no owner, and HPA-398 conflict.

- [ ] **Step 2: Run red tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts \
  src/lib/game/content/assets.test.ts
```

- [ ] **Step 3: Implement the minimal package**

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

Keep geometry/order only in `MapBackgroundImage`. Store the existing HPA-399 control fingerprint; do not add another aggregate fingerprint.

Select generated owners by expanded bounds → full containment → highest order → overlap-owner check. Do not use primary region.

- [ ] **Step 4: Implement atomic generation and `--check`**

Generate TypeScript plus exact PNG copies through temporary paths, then rename only after all outputs validate.

- [ ] **Step 5: Add scripts and scoped LFS**

```json
"world:generate:meadow-entry-runtime": "bun tools/generate-meadow-entry-runtime-package.ts",
"world:validate:meadow-entry-runtime": "bun tools/generate-meadow-entry-runtime-package.ts --check",
"art:storage:meadow-entry-runtime": "bun tools/verify-meadow-entry-runtime-storage.ts"
```

```text
public/game/assets/regions/meadow-entry/**/*.png filter=lfs diff=lfs merge=lfs -text
```

Verify LFS tracking, PNG signature, and approved SHA-256. Do not add OID-equality checks.

- [ ] **Step 6: Run and commit**

```bash
bun run world:generate:meadow-entry-runtime
bun run world:validate:meadow-entry-runtime
bun run art:storage:meadow-entry-runtime
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts \
  src/lib/game/content/assets.test.ts
bun run check
git add .gitattributes package.json src/lib/game/content tools public/game/assets/regions/meadow-entry
git commit -m "feat(hpa-406): generate meadow runtime package"
```

---

### Task 5: Compose and Render the Package

**Files:**
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-composition.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts`
- Modify: `src/lib/game/content/maps/meadow-entry.ts`, `src/lib/game/content/maps.test.ts`
- Modify: regional plane diagnostics, `WorldScene.ts`, scene tests, and `tests/e2e/game.e2e.ts`

- [ ] **Step 1: Write failing composition tests**

Prove append-only backgrounds, no HPA-398 overwrite, immutable inputs, derived base existence, and generated single-owner validation.

- [ ] **Step 2: Write failing two-phase renderer tests**

Use input `[foreground, base]`; both render when base succeeds. With injected base failure, expect base `render-failed`, foreground `blocked-by-base`, and fallback selected only after both phases.

- [ ] **Step 3: Run red tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
```

- [ ] **Step 4: Implement pure post-merge composition**

Append generated descriptors; apply Sundrop ownership first and generated ownership second; reject conflicts; validate final arrays.

- [ ] **Step 5: Implement base → foreground → fallback**

Render sorted bases, then sorted foregrounds whose derived base succeeded, then select blocker/decor/fence fallback from the final success set. Add `blocked-by-base` and additive decor/fence diagnostic fields. Keep collision unconditional.

- [ ] **Step 6: Run and commit**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-composition.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
bun run build
bunx playwright test tests/e2e/game.e2e.ts --grep "regional background"
git add src/lib/game/content src/lib/game/phaser tests/e2e/game.e2e.ts
git commit -m "feat(hpa-406): compose and render meadow backgrounds"
```

---

### Task 6: Select Map Assets for Boot

**Files:**
- Modify: runtime package module/tests, renderer diagnostics/tests, `BootScene.ts`, scene tests, and load e2e tests.

- [ ] **Step 1: Write failing selection tests**

`buildRegionalBackgroundLoadPlan(map, inventory)` must return only map-referenced assets in descriptor order plus compressed/decoded estimates. Test missing references and empty disabled loading.

- [ ] **Step 2: Implement one production plan**

```ts
export interface RegionalBackgroundLoadPlan {
  assetIds: readonly string[];
  estimatedCompressedBytes: number;
  estimatedDecodedRgbaBytes: number;
}
```

No strategy field. The standalone preflight remains separate.

- [ ] **Step 3: Update BootScene and diagnostics**

Enabled mode queues plan assets. Disabled mode queues none. Diagnostics report inventory count, planned count, bytes, completions, renderer, max texture size, and timings. Replace hard-coded `2` with plan length.

- [ ] **Step 4: Run and commit**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-package.test.ts \
  src/lib/game/phaser/renderer-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
bun run build
bunx playwright test tests/e2e/game.e2e.ts --grep "regional background load"
git add src/lib/game/content src/lib/game/phaser tests/e2e/game.e2e.ts
git commit -m "feat(hpa-406): select regional assets for boot"
```

---

### Task 7: Complete Crossroads and Connector Checkpoint

**Files:**
- Modify: `meadow-entry.ts`, map tests, focused e2e.
- Create: `tests/e2e/meadow-entry-backgrounds.e2e.ts`
- Create: `docs/superpowers/reports/hpa-406/checkpoint-1-crossroads-connectors.md`

- [ ] **Step 1: Add failing tests for the 13 checkpoint descriptors and routes**
- [ ] **Step 2: Attach the temporary exact checkpoint subset**
- [ ] **Step 3: Capture enabled, collision, traversal, one fallback/partial, and one save/reload case**
- [ ] **Step 4: Route reusable HPA-495 defects to its active PR and record commit SHAs**
- [ ] **Step 5: Run and commit**

```bash
bun run world:validate:meadow-entry-runtime
bun run art:storage:meadow-entry-runtime
bun run test:unit -- --run src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/scenes.test.ts
bunx playwright test tests/e2e/meadow-entry-backgrounds.e2e.ts --grep "checkpoint 1"
git add src/lib/game/content/maps tests/e2e/meadow-entry-backgrounds.e2e.ts docs/superpowers/reports/hpa-406
git commit -m "feat(hpa-406): integrate crossroads and connectors"
```

---

### Task 8: Complete Coast/Silverpine and Mistfen/Wildwood

- [ ] **Step 1: Add Coast/Silverpine failing map, route, and semantic-object tests**
- [ ] **Step 2: Expand the temporary subset, capture focused evidence, run tests, and commit**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bunx playwright test tests/e2e/meadow-entry-backgrounds.e2e.ts --grep "checkpoint 2"
git commit -am "feat(hpa-406): integrate coast and silverpine"
```

- [ ] **Step 3: Add final Mistfen/Wildwood/east-boundary failing tests**
- [ ] **Step 4: Remove the selector and attach the full package**
- [ ] **Step 5: Capture focused final evidence, run tests, and commit**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bunx playwright test tests/e2e/meadow-entry-backgrounds.e2e.ts --grep "checkpoint 3"
git add src/lib/game/content/maps tests/e2e/meadow-entry-backgrounds.e2e.ts docs/superpowers/reports/hpa-406
git commit -m "feat(hpa-406): integrate mistfen and wildwood"
```

---

### Task 9: Run the Complete Gate

- [ ] **Step 1: Validate generated/art/storage inputs**

```bash
bun run world:validate:meadow-entry-runtime
bun run art:validate:meadow-entry-controls
bun run art:validate:meadow-entry
bun run art:storage:meadow-entry-runtime
```

- [ ] **Step 2: Run full tests and builds**

```bash
bun run test
bun run check
bun run lint
bun run build
bun run build:tauri
```

- [ ] **Step 3: Run Rust gates only when Rust changed**

```bash
if ! git diff --quiet main...HEAD -- src-tauri Cargo.toml Cargo.lock; then
  cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
  cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
  cargo test --manifest-path src-tauri/Cargo.toml
fi
```

- [ ] **Step 4: Verify evidence and no selector remains**

```bash
test -s docs/superpowers/reports/hpa-406/preflight-texture-safety.json
test -s docs/superpowers/reports/hpa-406/checkpoint-1-crossroads-connectors.md
test -s docs/superpowers/reports/hpa-406/checkpoint-2-coast-silverpine.md
test -s docs/superpowers/reports/hpa-406/checkpoint-3-mistfen-wildwood.md
if git grep -n 'CHECKPOINT_[123]_BACKGROUND_IDS\|checkpointBackgroundIds' -- src; then exit 1; fi
```

- [ ] **Step 5: Update PR #20 and mark ready only with fresh evidence**

Record the preflight outcome, three checkpoint reports, exact command results, residual risks, and HPA-411 ownership of final performance acceptance.
