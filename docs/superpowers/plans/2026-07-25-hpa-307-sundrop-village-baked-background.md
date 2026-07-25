# Sundrop Village Baked Regional Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one approved, deterministic `1792×1536` baked ground background for Sundrop Village while preserving the existing layered map as the authoritative gameplay and fallback path.

**Architecture:** Add a generic center-based regional-background descriptor to the map model, derive Sundrop's one descriptor from its layered bounds, and render it between the fallback ground and live decor. Build a separate HPA-307 art-control pipeline from committed collision and map sources, use a manually maintained approval record to bind the reviewed control fingerprint to the reviewed PNG bytes, and keep all developer modes observational. Generate the master with built-in image generation, normalize it uniformly, finalize it through a pinned deterministic RGBA pipeline, then validate runtime fallback, diagnostics, screenshots, controller traversal, and device-local rendering evidence.

**Tech Stack:** TypeScript 6, Bun, Phaser 4, Vitest 4, Playwright, Sharp 0.35.3, SVG, SHA-256, Svelte 5, Tauri 2

**Approved design:** `docs/superpowers/specs/2026-07-25-hpa-307-sundrop-village-baked-background-design.md`

**Live issue:** HPA-307, “Prototype baked regional background rendering for Sundrop Village”

## Baseline

The implementation starts from clean commit `ad75bd7` on
`codex/hpa-307-baked-village-background`.

- `rtk bun run test:unit -- --run`: 45 files and 706 tests pass when Chromium is allowed
  outside the macOS process sandbox.
- `rtk bun run check`: zero errors and zero warnings.
- `rtk bun run lint`: Prettier and ESLint pass.
- `rtk bun run test:e2e`: 12 tests pass.

## Global Constraints

- [ ] Run every repository shell command through `rtk`.
- [ ] Follow strict red-green-refactor discipline: add one focused failing test, observe the
      intended failure, add the minimum implementation, observe the test pass, then refactor.
- [ ] Preserve `groundPatches`, collision, transitions, NPCs, rewards, saves, minimap
      semantics, and the full fallback tilemap. HPA-307 changes presentation only.
- [ ] Treat `MapRect.x/y` as center coordinates. The art-control files alone use a local
      top-left origin.
- [ ] Keep the HPA-238 preview renderer and `img/hpa-238/` outputs untouched.
- [ ] Never let the control exporter or PNG finalizer create or modify the approval record.
- [ ] Never commit a placeholder image, placeholder digest, or invented performance result.
- [ ] Use the built-in `image_gen` tool for the production candidate. If it is unavailable,
      stop only the art-production slice; do not switch generators without explicit user
      authorization.
- [ ] Preserve aspect ratio. Normalize by a recorded `7:6` crop followed by uniform scale;
      never stretch the candidate.
- [ ] Keep the final PNG truecolor RGBA, exactly `1792×1536`, no larger than `8,388,608`
      bytes, with a review target of `4,194,304` bytes.
- [ ] Keep `Phaser.AUTO`. Report the selected renderer rather than forcing WebGL.
- [ ] Do not claim that browser automation proves fallback pixels, GPU residency, upload
      count, controller feel, or the device-local p95 performance gate.
- [ ] Make a focused commit after each completed task and record its SHA in the
      subagent-driven-development ledger.

## Task Interfaces and Execution Ledger

Initialize and use:

```text
.superpowers/sdd/2026-07-25-hpa-307-sundrop-village-baked-background/
```

The controller records each task's base SHA, final SHA, implementer report, specification
review, and quality review in `ledger.md`. Every implementer reads only the current task
brief plus the exact consumed interfaces below. Before starting a task, the controller
records `rtk git rev-parse HEAD` and confirms it matches the prerequisite task's final SHA
in the ledger.

| Task | Consumes | Produces |
| --- | --- | --- |
| 1 | layered source types and `mergeRegions` | `MapBackgroundImage`, `createLayeredRegionBackground`, one merged village descriptor |
| 2 | Task 1 map/descriptor; save collision helpers | nine fixed controls, computed fingerprint API, generated fingerprint constant, exporter CLI |
| 3 | Task 2 combined SVG dimensions/path | pinned Sharp dependency, alpha/finalization APIs, rasterize/normalize/finalize CLIs |
| 4 | Task 2 controls/fingerprint and Task 3 CLIs | reviewed PNG, manual approval record, asset validator, production evidence |
| 5 | Task 1 descriptor and Task 4 approved asset/record | asset catalog, BootScene preload, URL parser, safe WorldScene renderer |
| 6 | Task 5 URL/background lifecycle and current WorldScene collision inputs | live collision overlay and one typed renderer-diagnostic event |
| 7 | Task 5 fallback diagnostics and Task 6 event/overlay | E2E matrix, curated screenshots, completed runtime evidence |
| 8 | all prerequisite task SHAs and artifacts | full verified branch with resolved final reviews |

---

## Task 1: Add the source-derived map background contract

**Files:**

- Create: `src/lib/game/content/backgrounds/sundrop-village-background.ts`
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/regions/types.ts`
- Create: `src/lib/game/content/maps/layered/region-background.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps/regions/village-layered.test.ts`
- Modify: `src/lib/game/content/maps.test.ts`

### Contract

```ts
export interface MapBackgroundImage extends MapRect {
  textureKey: string;
  depth: number;
}
```

`WorldMapDefinition` and `RegionFragment` gain
`backgroundImages?: MapBackgroundImage[]`.

The shared Sundrop background module owns these stable values so the map descriptor, asset
catalog, tests, and runtime do not copy string or dimension literals:

```ts
export const SUNDROP_VILLAGE_BACKGROUND_ID =
  'sundrop-village-regional-background';
export const SUNDROP_VILLAGE_BACKGROUND_TEXTURE_KEY =
  'sundrop-village-background';
export const SUNDROP_VILLAGE_BACKGROUND_PATH =
  '/game/assets/regions/sundrop-village-background.png';
export const SUNDROP_VILLAGE_BACKGROUND_DEPTH = -9;
```

Add a pure helper near the layered-region compiler:

```ts
export function createLayeredRegionBackground(
  source: LayeredRegionSource,
  input: {
    id: string;
    textureKey: string;
    depth?: number;
  }
): MapBackgroundImage;
```

It derives width, height, and center coordinates from source origin, grid dimensions, and
tile size. It materializes `depth`, defaulting to `-9`.

### Steps

- [ ] Add a failing village-layer test that calls the helper without `depth` and expects:
      ID `sundrop-village-regional-background`, texture key
      `sundrop-village-background`, center `(1152, 5120)`, dimensions
      `1792×1536`, depth `-9`, and world edges
      `(256,4352)`–`(2048,5888)`.
- [ ] Run:

  ```sh
  rtk bun run test:unit -- --run \
    src/lib/game/content/maps/regions/village-layered.test.ts
  ```

  Confirm the failure is caused by the missing contract/helper.

- [ ] Implement the shared constants, map type, fragment type, helper, and the one village
      descriptor. Put the generic helper in
      `src/lib/game/content/maps/layered/region-background.ts`.
- [ ] Add a failing opening-map merge test for the one descriptor and a failing duplicate-ID
      test.
- [ ] Run the two focused test files again and confirm both merge assertions fail for the
      missing merge behavior.
- [ ] Update all four `meadow-entry.ts` merge points:
      `MergedRegions` pick, `flatMap`, `assertUniqueIds`, and final map assignment.
- [ ] Rerun the two focused test files and confirm green:

  ```sh
  rtk bun run test:unit -- --run \
    src/lib/game/content/maps/regions/village-layered.test.ts \
    src/lib/game/content/maps.test.ts
  ```

- [ ] Run `rtk bun run check`.
- [ ] Commit:

  ```sh
  rtk git add \
    src/lib/game/content/backgrounds/sundrop-village-background.ts \
    src/lib/game/content/maps/types.ts \
    src/lib/game/content/maps/regions/types.ts \
    src/lib/game/content/maps/layered/region-background.ts \
    src/lib/game/content/maps/regions/village.ts \
    src/lib/game/content/maps/meadow-entry.ts \
    src/lib/game/content/maps/regions/village-layered.test.ts \
    src/lib/game/content/maps.test.ts
  rtk git commit -m "feat(maps): describe Sundrop regional background"
  ```

---

## Task 2: Build deterministic HPA-307 art controls and fingerprinting

**Files:**

- Create: `src/lib/game/content/maps/layered/village-art-controls.ts`
- Create: `src/lib/game/content/maps/layered/village-art-controls.test.ts`
- Create: `tools/export-village-art-controls.ts`
- Create: `src/lib/game/content/generated/sundrop-village-art-control.ts`
- Modify: `src/lib/game/save/save-state.ts`
- Modify: `package.json`
- Generate:
  `docs/superpowers/reports/img/hpa-307/village-region-mask.svg`
- Generate:
  `docs/superpowers/reports/img/hpa-307/village-layered-collision-mask.svg`
- Generate:
  `docs/superpowers/reports/img/hpa-307/village-composed-collision-mask.svg`
- Generate:
  `docs/superpowers/reports/img/hpa-307/village-terrain-path-mask.svg`
- Generate:
  `docs/superpowers/reports/img/hpa-307/village-building-entrance-mask.svg`
- Generate:
  `docs/superpowers/reports/img/hpa-307/village-object-anchors.svg`
- Generate:
  `docs/superpowers/reports/img/hpa-307/village-forbidden-tall-mask.svg`
- Generate:
  `docs/superpowers/reports/img/hpa-307/village-art-control.svg`
- Generate:
  `docs/superpowers/reports/img/hpa-307/village-art-control-manifest.json`

### Geometry source and outputs

The CLI and tests assemble `sundropVillageLayered`, the compiled village fragment, the full
`meadowEntryMap`, and the live footprint metadata used by runtime collision, then pass them
as explicit inputs to the pure control library. The library must not import
`meadow-entry.ts`, create a map-module cycle, use `preview.ts`'s `tileCoverage()`, or build a
synthetic regional map.

Export the existing save-normalization constants under their current names:

```ts
NORMALIZE_PLAYER_RADIUS
NORMALIZE_DOORWAY_CLEARANCE_WIDTH
NORMALIZE_TRANSITION_RADIUS
collectStrictCollisionRects(map)
collectLandmarkRects(map)
isInsideAnyCollisionRect(x, y, rects, NORMALIZE_PLAYER_RADIUS)
```

The existing values `12`, `56`, and `18` remain behaviorally unchanged. This task shares
those pure inputs only; it does not rewrite WorldScene movement or save normalization.

Every SVG has:

```xml
viewBox="0 0 1792 1536"
```

No SVG appends a legend. `village-art-control.svg` contains geometry and fills only and has
no `<text>` element.

The canonical fingerprint includes only structural inputs: source origin/dimensions/tile
size; terrain, path, collision, decor, and region rows; semantic objects and dimensions;
the complete clipped output of `collectStrictCollisionRects(meadowEntryMap)` including
blockers, fences, and collision-bearing decor; landmark rectangles and their matching
transition carve inputs; and every exported spawn, pickup, ambient-NPC, transition,
discovery, decor, and live-footprint anchor. Sort semantic records by stable ID while
preserving authored row and glyph order. Use SHA-256 over one canonical JSON serialization.

### Steps

- [ ] Add failing unit tests for the exact nine-file inventory, exact SVG dimensions, no
      combined-control text, sorted deterministic serialization, and one stable computed
      fingerprint.
- [ ] Add the four required behavioral geometry tests:

  - world `(1682,4510)` / local `(1426,158)` is excluded by
    `corridor-wall-2b`;
  - world `(1677,4510)` / local `(1421,158)` remains open;
  - a synthetic `96×96` landmark centered `(100,100)` with a matching transition centered
    `(100,130)` leaves the transition center open;
  - world `(1680,4352)` / local `(1424,0)` remains open at the north handoff.

- [ ] Add fingerprint-mutation assertions before implementation: moving a fence, moving
      collision-bearing decor, and moving a doorway transition each changes the
      fingerprint.
- [ ] Add the player-radius-before-clipping and exact doorway-carve assertions before
      implementation.
- [ ] Run the focused test and observe the missing-renderer failures:

  ```sh
  rtk bun run test:unit -- --run \
    src/lib/game/content/maps/layered/village-art-controls.test.ts
  ```

- [ ] Implement pure control-data collection, clipping, local-coordinate conversion, SVG
      renderers, manifest rendering, canonical serialization, and
      `computeVillageArtControlFingerprint(...)`.
- [ ] Implement `tools/export-village-art-controls.ts`. It must:

  - refuse paths under `img/hpa-238/`;
  - refuse the legacy filename `village-composed-collision.svg`;
  - write only the fixed HPA-307 inventory plus the generated TypeScript constant;
  - create missing output directories;
  - use UTF-8, LF endings, sorted filenames, fixed JSON key order, and a trailing newline;
  - print each sorted artifact path, encoded byte count, and the single fingerprint.

- [ ] Add `"art:controls:village": "bun tools/export-village-art-controls.ts"` to
      `package.json`.
- [ ] Run the exporter once, stage only the nine generated controls plus the generated
      TypeScript fingerprint as the byte baseline, run it a second time, and prove the
      second run made no working-tree change against that staged baseline:

  ```sh
  rtk bun run art:controls:village
  rtk git add \
    docs/superpowers/reports/img/hpa-307 \
    src/lib/game/content/generated/sundrop-village-art-control.ts
  rtk bun run art:controls:village
  rtk git diff --exit-code -- \
    docs/superpowers/reports/img/hpa-307 \
    src/lib/game/content/generated/sundrop-village-art-control.ts
  ```

- [ ] Make the unit test compare every in-memory output with its committed artifact without
      writing during Vitest.
- [ ] Run:

  ```sh
  rtk bun run test:unit -- --run \
    src/lib/game/content/maps/layered/village-art-controls.test.ts \
    src/lib/game/content/maps/regions/village-layered.test.ts
  rtk bun run check
  rtk bun run lint
  ```

- [ ] Commit:

  ```sh
  rtk git add \
    package.json \
    src/lib/game/save/save-state.ts \
    src/lib/game/content/maps/layered/village-art-controls.ts \
    src/lib/game/content/maps/layered/village-art-controls.test.ts \
    src/lib/game/content/generated/sundrop-village-art-control.ts \
    tools/export-village-art-controls.ts \
    docs/superpowers/reports/img/hpa-307
  rtk git commit -m "feat(art): export Sundrop background controls"
  ```

---

## Task 3: Add the pinned deterministic PNG pipeline

**Files:**

- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `src/lib/game/content/backgrounds/sundrop-village-background.ts`
- Create: `src/lib/game/content/backgrounds/sundrop-village-png.ts`
- Create: `src/lib/game/content/backgrounds/sundrop-village-png.test.ts`
- Create: `tools/rasterize-sundrop-village-art-control.ts`
- Create: `tools/normalize-sundrop-village-background.ts`
- Create: `tools/finalize-sundrop-village-background.ts`

### Pinned pipeline

Add exact dev dependency `sharp@0.35.3`. Sharp is used for SVG rasterization, decoded raw
RGBA buffers, deterministic crop/resize, metadata-free truecolor PNG output, and final
decode verification. Do not use developer-global Pillow, ImageMagick, `sips`, `pngquant`,
or `oxipng`.

The shared edge function is:

```ts
export function sundropVillageBackgroundAlpha(
  x: number,
  y: number,
  width = 1792,
  height = 1536
): number {
  const distance = Math.min(x, y, width - 1 - x, height - 1 - y);
  const t = Math.max(0, Math.min(1, distance / 64));
  return Math.round(255 * (t * t * (3 - 2 * t)));
}
```

The finalizer accepts only a fully opaque normalized `1792×1536` input. Each tier starts
from the untouched decoded source. Pinned tiers reduce RGB precision independently while
preserving the exact alpha:

| Tier | RGB operation |
| --- | --- |
| `0` | preserve all RGB bytes |
| `1` | clear the least-significant bit of each RGB channel |
| `2` | clear the two least-significant bits of each RGB channel |
| `3` | clear the three least-significant bits of each RGB channel |

Encode each candidate with:

```ts
.png({
  palette: false,
  compressionLevel: 9,
  adaptiveFiltering: false,
  force: true
})
```

The file must remain PNG color type 6 / truecolor RGBA. The CLI writes to a temporary file,
decodes and validates that exact file, measures it, hashes it, and only then atomically
renames it over the requested output. It aborts without replacing an existing asset if the
result is over `8,388,608` bytes or any validation fails.

### Steps

- [ ] Add `sharp@0.35.3` as an exact dev dependency:

  ```sh
  rtk bun add --dev --exact sharp@0.35.3
  ```

- [ ] Add failing pure tests for every edge pixel, distance `64`, representative smoothstep
      values, monotonic edge normals, and a maximum adjacent alpha jump no greater than
      `32`.
- [ ] Add failing pipeline tests using generated in-memory fixtures:

  - reject wrong dimensions;
  - reject any non-opaque input;
  - prove each tier starts from the same source rather than a previous tier;
  - prove metadata is stripped;
  - prove output is truecolor RGBA;
  - recompute and match every output alpha byte;
  - prove identical input, tier, and arguments produce identical bytes and SHA-256;
  - refuse replacement on validation or hard-budget failure.

- [ ] Run the test and observe failures before implementation:

  ```sh
  rtk bun run test:unit -- --run \
    src/lib/game/content/backgrounds/sundrop-village-png.test.ts
  ```

- [ ] Implement the shared alpha function, raw-buffer quantization, encoder options,
      validation, hashing, and atomic output behavior.
- [ ] Implement the SVG rasterizer. It accepts only
      `village-art-control.svg` and emits an exact `1792×1536` PNG reference.
- [ ] Implement the normalizer with explicit arguments:

  ```text
  --input
  --output
  --crop-x
  --crop-y
  --crop-width
  --crop-height
  ```

  It rejects a crop that is not exactly `7:6` or falls outside the source. The visual
  reviewer—not the generic raster tool—rejects crops that lose required composition. The
  tool records native dimensions, crop, and scale in a machine-readable sidecar supplied
  by `--transform-output`. It always uses one uniform scale factor to `1792×1536`.

- [ ] Implement the finalizer with explicit `--input`, `--output`, and `--tier` arguments.
      It prints tier, final bytes, target/limit result, and SHA-256, but never writes the
      approval record.
- [ ] Add scripts:

  ```json
  {
    "art:rasterize:village": "bun tools/rasterize-sundrop-village-art-control.ts",
    "art:normalize:village": "bun tools/normalize-sundrop-village-background.ts",
    "art:finalize:village": "bun tools/finalize-sundrop-village-background.ts"
  }
  ```

- [ ] Run the focused tests, typecheck, and lint:

  ```sh
  rtk bun run test:unit -- --run \
    src/lib/game/content/backgrounds/sundrop-village-png.test.ts
  rtk bun run check
  rtk bun run lint
  ```

- [ ] Commit:

  ```sh
  rtk git add \
    package.json \
    bun.lock \
    src/lib/game/content/backgrounds/sundrop-village-background.ts \
    src/lib/game/content/backgrounds/sundrop-village-png.ts \
    src/lib/game/content/backgrounds/sundrop-village-png.test.ts \
    tools/rasterize-sundrop-village-art-control.ts \
    tools/normalize-sundrop-village-background.ts \
    tools/finalize-sundrop-village-background.ts
  rtk git commit -m "feat(art): finalize Sundrop background deterministically"
  ```

---

## Task 4: Generate, normalize, review, and approve the real master

**Files:**

- Create:
  `public/game/assets/regions/sundrop-village-background.png`
- Create:
  `src/lib/game/content/approvals/sundrop-village-background.ts`
- Create:
  `src/lib/game/content/sundrop-village-background.asset.test.ts`
- Create or update:
  `docs/superpowers/reports/2026-07-25-hpa-307-baked-background-validation.md`
- Create selected production and alignment evidence under:
  `docs/superpowers/reports/img/hpa-307/`
- Modify: `package.json`

### Production prompt

Use the built-in `image_gen` tool with the exact rasterized control image as its reference.
The prompt must describe:

- one complete orthographic top-down JRPG village ground master;
- exact `7:6` composition;
- warm lush palette with upper-left lighting;
- varied grass, packed soil, organic cobblestone, worn tracks, drainage, erosion, moss,
  low weeds, flowers, gardens, shrine-season autumn accents, and subtle non-colliding relief;
- high detail at non-walkable margins, foundations, gardens, and boundary transitions;
- medium detail in yards and secondary open spaces;
- low detail on roads, plazas, doorway approaches, reward approaches, and transition
  throats;
- no text, labels, signs, false doors, buildings, doors, NPCs, pickups, trees, arches,
  collision-bearing props, tall silhouettes, foreground objects, or misleading obstacles;
- preserve every control-mask route, doorway, transition, reward pocket, and all four edge
  handoffs.

The report records the exact prompt, production tool, native dimensions, source control
fingerprint, crop rectangle, uniform scale, selected quantization tier, final bytes, and
final SHA-256.

### Steps

- [ ] Create the production asset test before producing the asset or approval record. Its
      first assertions require both exact paths and the Task 3 validator; run it and observe
      the intended missing-asset/approval red state:

  ```sh
  rtk bun run test:unit -- --run \
    src/lib/game/content/sundrop-village-background.asset.test.ts
  ```

- [ ] Read the image-generation prompting references before generating.
- [ ] Regenerate controls and rasterize the exact reference:

  ```sh
  rtk bun run art:controls:village
  rtk bun run art:rasterize:village -- \
    --input docs/superpowers/reports/img/hpa-307/village-art-control.svg \
    --output /private/tmp/hpa-307-village-art-control.png
  ```

- [ ] Visually inspect the raster reference before sending it to `image_gen`.
- [ ] Generate one complete candidate with the fixed prompt and the raster reference.
- [ ] Copy the selected native output to the stable working path
      `/private/tmp/hpa-307-village-generated-candidate.png`.
- [ ] Inspect the native candidate. Reject and regenerate if no in-bounds `7:6` crop retains
      all routes, edges, and handoffs.
- [ ] Normalize the selected candidate by invoking `rtk bun run art:normalize:village`
      with input `/private/tmp/hpa-307-village-generated-candidate.png`, output
      `/private/tmp/hpa-307-village-normalized-opaque.png`, the four reviewed integer crop
      values, and transform output
      `docs/superpowers/reports/img/hpa-307/village-background-transform.json`. Record the
      exact executed command in the validation report.

- [ ] Composite the normalized opaque master against collision, entrance, anchor, and
      forbidden-tall masks. Save the whole-map alignment view and close crops for Home Yard,
      Well Plaza, Market/Blacksmith, North Residences/Guild, Shrine Garden/reward pocket,
      East Gate/Crossroads, every doorway/transition approach, and all four edges.
- [ ] Reject or clean any invented obstacle, false route cue, false entrance, text, tall
      object, blocked approach, or control drift. Do not change gameplay geometry to fit the
      generated art.
- [ ] Finalize tier 0 from the untouched normalized opaque source:

  ```sh
  rtk bun run art:finalize:village -- \
    --input /private/tmp/hpa-307-village-normalized-opaque.png \
    --output public/game/assets/regions/sundrop-village-background.png \
    --tier 0
  ```

- [ ] If tier 0 exceeds `4,194,304` bytes, compare each required nonzero tier against the
      untouched normalized master. Select the lowest visually acceptable tier that is no
      larger than `8,388,608` bytes. Run every tier from the untouched opaque source.
- [ ] Create the hand-maintained approval record with the actual:

  - computed control fingerprint;
  - final PNG SHA-256 printed by the finalizer;
  - `sizeBudgetException: null` when at or below `4,194,304` bytes, otherwise a specific
    non-empty visual-quality explanation;
  - evidence report path.

  Do not add a temporary digest. Write the record only after visual review.

- [ ] Complete the already-red asset test one validation assertion at a time. It
      independently:

  - recomputes current control fingerprint;
  - reads and compares manifest and generated constant;
  - compares the approved control fingerprint;
  - decodes the committed PNG and checks exact dimensions and color type;
  - checks every alpha byte with the shared function;
  - checks edge monotonicity and the maximum jump;
  - enforces the `4 MiB` exception semantics and `8 MiB` hard limit;
  - hashes the final bytes and matches `approvedPngSha256`;
  - emits “Regenerate controls, review master alignment, record evidence, then update the
    approved fingerprint.” for stale geometry.

- [ ] Add `"art:validate:village"` as a read-only validation command that runs the focused
      asset and control tests. It must not modify controls, the PNG, or approval.
- [ ] Run:

  ```sh
  rtk bun run art:validate:village
  rtk bun run test:unit -- --run \
    src/lib/game/content/sundrop-village-background.asset.test.ts \
    src/lib/game/content/maps/layered/village-art-controls.test.ts
  rtk bun run check
  rtk bun run lint
  ```

- [ ] Review the final PNG and the complete evidence set visually.
- [ ] Commit:

  ```sh
  rtk git add \
    package.json \
    public/game/assets/regions/sundrop-village-background.png \
    src/lib/game/content/approvals/sundrop-village-background.ts \
    src/lib/game/content/sundrop-village-background.asset.test.ts \
    docs/superpowers/reports/2026-07-25-hpa-307-baked-background-validation.md \
    docs/superpowers/reports/img/hpa-307
  rtk git commit -m "feat(art): add approved Sundrop background master"
  ```

---

## Task 5: Register, preload, and render the background with safe fallback

**Files:**

- Modify: `src/lib/game/content/assets.ts`
- Modify: `src/lib/game/content/assets.test.ts`
- Modify: `src/lib/game/phaser/scenes/BootScene.ts`
- Create: `src/lib/game/phaser/world-render-options.ts`
- Create: `src/lib/game/phaser/world-render-options.test.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

### Asset and render contract

Add a regional-background asset catalog entry that imports the approval record and includes
the stable key, public path, approved control fingerprint, and approved PNG SHA-256. Do not
copy either digest.

`BootScene` preloads every registered regional background and retains its generic
`loaderror` `console.error`.

`WorldScene.create()` resolves query options once, always renders the full fallback ground,
then calls:

```ts
this.renderGround(map);
this.renderRegionalBackgrounds(map);
this.renderMapDecor(map, ['floor', 'furniture']);
```

Before creating an image, inspect the immutable texture source/base-frame dimensions. A
missing or wrong-sized texture produces exactly one targeted `console.warn` per descriptor
per scene creation and skips the image. The warning contains background ID, texture key,
map ID, and dimensions when relevant. Do not render Phaser's missing-texture placeholder.

For a valid background:

```ts
this.add
  .image(background.x, background.y, background.textureKey)
  .setOrigin(0.5, 0.5)
  .setDisplaySize(background.width, background.height)
  .setDepth(background.depth);
```

### Developer URL contract

```ts
export interface WorldRenderOptions {
  regionalBackgrounds: boolean;
  collisionDebug: boolean;
}

export function parseWorldRenderOptions(search: string): WorldRenderOptions;

export function resolveWorldRenderOptions(
  readSearch = () => globalThis.location?.search ?? ''
): WorldRenderOptions;
```

Only exact values have effects:

- `regionalBackground=off` disables all regional backgrounds;
- `mapDebug=collision` enables the overlay;
- both combine;
- missing or unknown values preserve defaults.

### Steps

- [ ] Add failing asset tests for the one registered regional background and its approval
      metadata.
- [ ] Work through the remaining bullets as separate red-green cycles: add one failing
      behavior, run the smallest focused test, implement only that behavior, rerun green,
      then proceed.
- [ ] Add and green a BootScene test for the exact preload key/path.
- [ ] Add and green pure parser tests for default, off, collision, both, unknown, repeated,
      and injectable-reader cases.
- [ ] Add and green WorldScene tests one behavior at a time for:

  - ground depth `-10`;
  - background center and `.setOrigin(0.5, 0.5)`;
  - background depth `-9`;
  - render call after ground and before floor/furniture decor;
  - off mode skipping the background while preserving ground;
  - valid source dimensions;
  - missing texture skip and one targeted warning;
  - wrong intrinsic dimensions skip and one targeted warning with expected/actual values;
  - no duplicate targeted warning in one scene creation.

- [ ] Extend the Phaser texture and image mocks only as needed: provide immutable source or
      frame dimensions and chainable `setOrigin`, `setDisplaySize`, and `setDepth`.
- [ ] Run the focused tests and observe the intended failures:

  ```sh
  rtk bun run test:unit -- --run \
    src/lib/game/content/assets.test.ts \
    src/lib/game/phaser/world-render-options.test.ts \
    src/lib/game/phaser/scenes/scenes.test.ts
  ```

- [ ] Implement the catalog, preload loop, pure parser, injectable resolver, availability
      check, dimension check, render order, warnings, and off mode.
- [ ] Rerun the focused tests, then:

  ```sh
  rtk bun run check
  rtk bun run lint
  ```

- [ ] Commit:

  ```sh
  rtk git add \
    src/lib/game/content/assets.ts \
    src/lib/game/content/assets.test.ts \
    src/lib/game/phaser/scenes/BootScene.ts \
    src/lib/game/phaser/world-render-options.ts \
    src/lib/game/phaser/world-render-options.test.ts \
    src/lib/game/phaser/scenes/WorldScene.ts \
    src/lib/game/phaser/scenes/scenes.test.ts
  rtk git commit -m "feat(world): render approved regional backgrounds"
  ```

---

## Task 6: Draw live collision diagnostics and expose renderer evidence

**Files:**

- Create: `src/lib/game/phaser/renderer-diagnostics.ts`
- Create: `src/lib/game/phaser/renderer-diagnostics.test.ts`
- Modify: `src/lib/game/phaser/createGame.ts`
- Modify: `src/lib/game/phaser/scenes/BootScene.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

### Collision overlay

When `mapDebug=collision`, draw a read-only graphics overlay above normal world content for
every active map, including interiors. It uses the same already-resolved runtime inputs as
WorldScene and shows:

- map-edge limits;
- player-radius-expanded blockers, fences, and collision-bearing decor;
- landmark rectangles and doorway/transition carve-outs;
- interior-prop collision;
- current NPC collision circles;
- live transition, pickup, discovery, and landmark footprints useful for alignment.

The overlay must not change collision arrays, input handling, save state, scene transitions,
or movement methods. It must be destroyed with the scene.

### Renderer evidence

Export this exact read-only browser event API:

```ts
export const REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT =
  'gliese:regional-background-renderer-diagnostic';

export interface RegionalBackgroundRendererDiagnostic {
  renderer: 'webgl' | 'canvas';
  maxTextureSize: number | null;
  regionalBackgroundLoadMs: number | null;
  regionalBackgroundLoadCompletions: number;
}

export interface RegionalBackgroundRendererDiagnosticInput {
  renderer: 'webgl' | 'canvas';
  maxTextureSize: number | null;
  loadStartedAtMs: number | null;
  loadCompletedAtMs: number | null;
  regionalBackgroundLoadCompletions: number;
}

export function buildRegionalBackgroundRendererDiagnostic(
  input: RegionalBackgroundRendererDiagnosticInput
): RegionalBackgroundRendererDiagnostic;

export function emitRegionalBackgroundRendererDiagnostic(
  detail: RegionalBackgroundRendererDiagnostic,
  target?: Window
): void;
```

`emit...` dispatches exactly one `CustomEvent` on `window` per BootScene preload lifecycle;
the payload is `event.detail`. Start timing immediately before the first registered regional
background is handed to the Phaser loader. Count filtered successful `filecomplete` events
whose keys are present in the regional-background catalog. End timing and dispatch from the
loader's one-shot `complete` callback; report `null` duration when no regional background is
registered. The BootScene adapter supplies monotonic `performance.now()` start/end values.
It identifies the selected Phaser renderer; for WebGL it supplies
`gl.getParameter(gl.MAX_TEXTURE_SIZE)`, and for Canvas it supplies `null`. The pure builder
computes a non-negative duration only when both timestamps are present and normalizes Canvas
texture limits to `null`. `regionalBackgroundLoadCompletions` is loader completion/decode
bookkeeping, not a physical GPU upload count. Actual upload/decode count remains a manual
profiler observation in the validation report.

### Steps

- [ ] Work through renderer kind, Canvas null texture limit, WebGL
      `MAX_TEXTURE_SIZE`, exact event name/detail, filtered completion count, one-event
      lifecycle, and load timing as separate red-green cycles.
- [ ] Work through overlay absence by default, map bounds, expanded static geometry,
      landmark carve-outs, interior props, NPC circles, live footprints, and above-world
      depth as separate red-green cycles.
- [ ] Add and green a separate restart test proving the overlay is rebuilt from the interior
      map rather than retained from meadow-entry.
- [ ] Run:

  ```sh
  rtk bun run test:unit -- --run \
    src/lib/game/phaser/renderer-diagnostics.test.ts \
    src/lib/game/phaser/scenes/scenes.test.ts
  ```

- [ ] Implement the pure renderer diagnostic builder, load timing/bookkeeping, typed custom
      event emission, and WorldScene overlay without touching movement or save semantics.
- [ ] Rerun the focused tests, then the established gameplay regression tests:

  ```sh
  rtk bun run test:unit -- --run \
    src/lib/game/phaser/renderer-diagnostics.test.ts \
    src/lib/game/phaser/scenes/scenes.test.ts \
    src/lib/game/save/save-state.test.ts \
    src/lib/game/core/map-exploration.test.ts
  rtk bun run check
  rtk bun run lint
  ```

- [ ] Commit:

  ```sh
  rtk git add \
    src/lib/game/phaser/renderer-diagnostics.ts \
    src/lib/game/phaser/renderer-diagnostics.test.ts \
    src/lib/game/phaser/createGame.ts \
    src/lib/game/phaser/scenes/BootScene.ts \
    src/lib/game/phaser/scenes/WorldScene.ts \
    src/lib/game/phaser/scenes/scenes.test.ts
  rtk git commit -m "feat(world): expose regional background diagnostics"
  ```

---

## Task 7: Add browser fallback proof and durable validation evidence

**Files:**

- Modify: `tests/e2e/game.e2e.ts`
- Modify: `playwright.config.ts`
- Modify: `.github/workflows/ci.yml`
- Modify:
  `docs/superpowers/reports/2026-07-25-hpa-307-baked-background-validation.md`
- Create selected screenshots under:
  `docs/superpowers/reports/img/hpa-307/`

### Browser evidence matrix

Use a fixed `1280×720` viewport and the established ready signal of a visible canvas plus
visible `Menu`. Before every capture and the failure test, call:

```ts
await injectSave(
  page,
  createSaveFixture({
    mapId: 'meadow-entry',
    player: {
      level: 1,
      xp: 0,
      hp: 20,
      attack: 3,
      x: 624,
      y: 5776,
      facing: 'up'
    }
  })
);
```

This is the source-derived village spawn two tiles south of the hero-house door, not the E2E
fixture's default `(256,144)` outside the regional canvas.

Capture and attach:

1. `/`;
2. `/?regionalBackground=off`;
3. `/?mapDebug=collision`;
4. `/?regionalBackground=off&mapDebug=collision`;
5. a normal URL with the regional PNG request deliberately aborted.

These are human-review captures, not `toHaveScreenshot` golden assertions.

### Missing-asset E2E

Register before navigation:

```ts
await page.route(
  '**/game/assets/regions/sundrop-village-background.png',
  (route) => route.abort('failed')
);
```

Install console and `pageerror` collectors before `goto`. Assert:

- canvas and HUD reach ready state;
- exactly one BootScene `console.error` identifies the intercepted background request;
- exactly one targeted WorldScene `console.warn` includes the final background ID, texture
  key, and `meadow-entry`;
- no duplicate targeted warning;
- no other game-scoped error or page exception.

Only the exact intercepted-URL Chromium `net::ERR_FAILED` message may be filtered. Do not
add a broad network or console exclusion. The automated assertion proves boot continuity
and diagnostics. The load-failure/off-mode screenshot pair is the proof that fallback
pixels are visible and no missing-texture placeholder appears.

### Steps

- [ ] Add a failing E2E test for the missing-asset diagnostics and ready-state contract.
- [ ] Run only that test and observe the failure:

  ```sh
  rtk bun run test:e2e -- --grep "regional background load failure"
  ```

- [ ] Implement the exact collectors/assertions and confirm it passes.
- [ ] Add the four mode-capture tests or one parameterized test using
      `testInfo.outputPath(...)`, `page.screenshot(...)`, and `testInfo.attach(...)`.
- [ ] Before navigation, install a one-shot listener for the exported
      `REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT` through `page.addInitScript(...)`.
      Read its exact `CustomEvent.detail`, assert exactly one event, and attach the payload
      as JSON evidence through a test-only Playwright exposed binding. Pass the imported
      event-name constant as the init-script argument; do not copy the string or add a
      production test hook.
- [ ] Configure Playwright failure artifacts:

  ```ts
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  }
  ```

- [ ] Extend the CI upload path to include both `playwright-report/` and `test-results/`.
- [ ] Run the focused E2E matrix:

  ```sh
  rtk bun run test:e2e -- --grep "regional background"
  ```

- [ ] Inspect all five captures. Copy only the reviewed evidence images into
      `docs/superpowers/reports/img/hpa-307/` with stable descriptive names.
- [ ] Review landmark labels as live WorldScene output; verify that no such text is baked
      into the master.
- [ ] Complete the controller route with the background enabled:

  ```text
  Spawn → Plaza → Market reward → Home → Shrine reward → Plaza
  → North Residences → every building entrance → Guild → East Gate
  → Crossroads → return to village
  ```

- [ ] Enter and exit every village interior. Verify no corner snagging, false route cue,
      hidden transition, NPC obstruction, misleading obstacle, or texture re-upload hitch.
- [ ] Save and reload at Home Yard, Well Plaza, Shrine Garden, and East Gate.
- [ ] Record reference-device browser and Tauri evidence:

  - hardware/OS and build;
  - final encoded bytes and budget disposition;
  - computed control fingerprint and approved PNG SHA-256;
  - exact generation prompt/tool and normalization transform;
  - renderer kind;
  - WebGL `MAX_TEXTURE_SIZE`, or successful Canvas decode/draw;
  - background load duration;
  - one upload in WebGL or one decode in Canvas across interior round trips;
  - median and p95 frame time over the same route with background on and off;
  - whether p95 regressed by more than `2ms`;
  - controller and save/reload results;
  - links to whole-map overlays, close crops, four mode captures, and load-failure capture.

- [ ] Do not mark HPA-307 accepted on a WebGL target with
      `MAX_TEXTURE_SIZE < 1792`. Do not add runtime cropping as a workaround.
- [ ] Run the entire E2E suite:

  ```sh
  rtk bun run test:e2e
  ```

- [ ] Commit:

  ```sh
  rtk git add \
    tests/e2e/game.e2e.ts \
    playwright.config.ts \
    .github/workflows/ci.yml \
    docs/superpowers/reports/2026-07-25-hpa-307-baked-background-validation.md \
    docs/superpowers/reports/img/hpa-307
  rtk git commit -m "test(e2e): validate Sundrop background fallback"
  ```

---

## Task 8: Run the full acceptance gate and final review

**Files:**

- Modify only files implicated by review findings.
- Finalize:
  `docs/superpowers/reports/2026-07-25-hpa-307-baked-background-validation.md`

### Steps

- [ ] Regenerate controls once and verify the worktree stays clean:

  ```sh
  rtk bun run art:controls:village
  rtk git status --short
  ```

- [ ] Run deterministic asset validation:

  ```sh
  rtk bun run art:validate:village
  ```

- [ ] Run all frontend gates:

  ```sh
  rtk bun run check
  rtk bun run lint
  rtk bun run test:unit -- --run
  rtk bun run test:e2e
  ```

- [ ] Run Rust gates from `src-tauri/`:

  ```sh
  rtk cargo fmt --all -- --check
  rtk cargo clippy --all-targets --all-features -- -D warnings
  rtk cargo test
  ```

- [ ] Run the final desktop release build once:

  ```sh
  rtk bun run tauri build
  ```

- [ ] Inspect the final PNG, control overlays, runtime screenshots, and validation report
      together. Confirm the report contains measured values rather than planned values.
- [ ] Run a fresh specification-compliance review against every HPA-307 acceptance item.
- [ ] Run a separate code-quality review against the complete branch diff.
- [ ] Fix every valid finding with a failing regression test first where behavior changes.
- [ ] Rerun the smallest relevant test after each fix, then rerun the full gate above.
- [ ] Confirm the final worktree contains no unintended generated, raw candidate, temporary,
      Playwright, or build output.
- [ ] Commit final review fixes when present by staging each reviewed path explicitly, then
      running:

  ```sh
  rtk git commit -m "fix(world): close HPA-307 review findings"
  ```

- [ ] Update HPA-307 with a concise implementation and evidence summary and move it to the
      project’s completed state only after every automated and manual acceptance gate passes.

## Completion Definition

HPA-307 is complete only when all of the following are true:

- the approved PNG is the exact asset loaded by BootScene;
- its source-derived descriptor covers world
  `(256,4352)`–`(2048,5888)` at center `(1152,5120)`;
- fallback tiles always exist and retain all existing gameplay semantics;
- default, off, collision, combined, missing, and wrong-dimension paths are tested;
- all nine controls are deterministic and byte-stable;
- computed, generated, manifest, approved-control, and approved-PNG digests agree;
- exact edge alpha and both file-size limits pass;
- visual evidence covers all required rooms, routes, doors, transitions, edges, and fallback;
- the controller route and four save/reload checkpoints pass;
- reference-device renderer, texture limit/decode, load, upload/decode count, and p95 evidence
  are recorded honestly;
- typecheck, lint, unit, E2E, Rust, and Tauri release gates pass;
- final specification and code-quality reviews have no unresolved valid finding.
