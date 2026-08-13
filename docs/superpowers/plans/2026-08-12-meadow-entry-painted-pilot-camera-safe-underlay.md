# Meadow Entry Painted Pilot Camera-Safe Underlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three narrow painted Meadow pilot runtime islands with two continuous
camera-safe `3200×3200` crops while preserving the five accepted detail panels and all gameplay
semantics.

**Architecture:** Four new quiet terrain panels form a deterministic underlay in the partial
`6400×6400` master. The existing five detail panels overwrite that underlay unchanged. Two opaque
runtime crops are cut from the flattened master; a pure swept-camera contract proves their union
covers the approved Hero House → Sundrop → connector → Waystone route.

**Tech Stack:** TypeScript, Vitest, Bun, Sharp, canonical PNG helpers, Phaser 4, Playwright,
Git LFS, built-in image generation.

## Global Constraints

- Implement the approved design at
  `docs/superpowers/specs/2026-08-12-meadow-entry-painted-pilot-camera-safe-underlay-design.md`.
- Treat this as a Gliese world-expansion `revision`; use `gliese-world-expansion`,
  `2d-game-asset-workflow`, and `imagegen` when generating art.
- Keep gameplay geometry, collision, transitions, actors, rewards, discoveries, and saves live and
  unchanged.
- Keep painted mode opt-in through exact `?meadowPaintedPilot=on`; default and
  `regionalBackground=off` remain fallback.
- Runtime inventory is exactly two opaque base textures; do not add an underlay renderer branch or
  foreground plane.
- Runtime crops are `(0,3200,3200,6400)` and `(2368,2240,5568,5440)`, both `3200×3200`.
- Runtime overlap is `(2368,3200,3200,5440)` and must contain zero differing pixels.
- Route-mouth proof is `(3072,4608,3200,4768)` and the Crossroads crop owns the overlap.
- Keep the five normalized detail-panel bytes immutable at these SHA-256 values:
  - `sundrop-north`: `3c7fe6063b8043578464ae68e5ec38505ae6a866afcd72fe2ff2293bf912a4e9`
  - `sundrop-south`: `b3bb18292cd23556d58f2ac7720f95037392ef60b26e9f208206e1f270fd672f`
  - `hero-house-frontage`: `9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b`
  - `village-crossroads-connector`: `6866f90802dfcd73d3828b41b237c8c1239ee130c9d8c8af3ac10d20c193e8b2`
  - `crossroads`: `1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34`
- Generate each underlay panel in a distinct image-generation call; normalization is uniform,
  never stretched, and no greater than `2×`.
- Keep the aggregate encoded base hard cap at `64 MiB`; exceeding it stops publication.
- Do not reuse the unstable sixteen-texture `1600×1600` candidate.
- Use TDD: capture a genuine focused RED before production edits, then focused GREEN.
- Use `apply_patch` for hand-edited project files. Generated artifacts may be written by their
  owning deterministic tools.
- Preserve rejected Task 10 files as uncommitted diagnostic evidence until accepted replacements
  overwrite the prescribed nine paths.
- Do not start PR3 or activate painted mode by default.

---

### Task 1: Seal the two-crop geometry and swept camera envelope

**Files:**
- Create: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-camera-envelope.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-camera-envelope.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-controls-approval.test.ts`
- Regenerate: `artifacts/meadow-entry/painted-v2/controls/`
- Regenerate: `src/lib/game/content/approvals/meadow-entry-painted-v2-controls.ts`
- Create: `docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-controls.md`
- Report: `.superpowers/sdd/2026-08-12-meadow-entry-painted-pilot-camera-safe-underlay/task-1-report.md` (ignored)

**Interfaces:**
- Produces:
  `MEADOW_ENTRY_PAINTED_V2_CAMERA_VIEWPORT: { width: 1920; height: 1080 }`.
- Produces:
  `MEADOW_ENTRY_PAINTED_V2_CAMERA_SAFE_ROUTE: readonly PaintedV2CameraRoutePoint[]`.
- Produces:
  `cameraBoundsAtMeadowEntryPoint(point, viewport?): PixelBounds`.
- Produces:
  `collectMeadowEntryPaintedV2CameraEnvelopes(route?, viewport?): readonly PixelBounds[]`.
- Produces:
  `assertMeadowEntryPaintedV2CameraEnvelopeCovered(crops, route?, viewport?): void`.
- Replaces the current three manifest crop rows with two exact rows and one overlap.
- Produces a freshly reviewed control fingerprint and approval bound to the two-crop manifest
  before Task 2 image generation.

- [ ] **Step 1: Write the failing camera-envelope tests**

Create tests that pin viewport, route, clamping, union coverage, and negative cases:

```ts
expect(MEADOW_ENTRY_PAINTED_V2_CAMERA_VIEWPORT).toEqual({ width: 1_920, height: 1_080 });
expect(cameraBoundsAtMeadowEntryPoint({ x: 704, y: 5_920 })).toEqual({
  left: 0,
  top: 5_320,
  right: 1_920,
  bottom: 6_400
});
expect(cameraBoundsAtMeadowEntryPoint({ x: 3_500, y: 4_100 })).toEqual({
  left: 2_540,
  top: 3_560,
  right: 4_460,
  bottom: 4_640
});
expect(() =>
  assertMeadowEntryPaintedV2CameraEnvelopeCovered(
    MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map(({ bounds }) => bounds)
  )
).not.toThrow();
expect(() =>
  assertMeadowEntryPaintedV2CameraEnvelopeCovered([
    { left: 0, top: 3_200, right: 3_200, bottom: 6_400 }
  ])
).toThrow(/camera envelope segment/);
```

The route table must use axis-aligned points matching the stabilized Task 8 journey:

```ts
[
  { id: 'hero-house', x: 704, y: 5_920 },
  { id: 'south-lane', x: 704, y: 6_080 },
  { id: 'west-lane-south', x: 320, y: 6_080 },
  { id: 'west-lane-north', x: 320, y: 4_688 },
  { id: 'pickup-lane', x: 912, y: 4_688 },
  { id: 'market-pickup', x: 912, y: 5_072 },
  { id: 'market-return', x: 912, y: 4_688 },
  { id: 'villager-house-1-lane', x: 672, y: 4_688 },
  { id: 'villager-house-1', x: 672, y: 4_448 },
  { id: 'villager-house-1-return', x: 672, y: 4_688 },
  { id: 'crossroads-handoff', x: 3_776, y: 4_688 },
  { id: 'waystone-east-lane', x: 4_032, y: 4_688 },
  { id: 'waystone-south', x: 4_032, y: 4_480 },
  { id: 'waystone-north', x: 4_032, y: 4_224 },
  { id: 'waystone', x: 3_904, y: 4_224 },
  { id: 'waystone-return-east', x: 4_160, y: 4_224 },
  { id: 'waystone-return-south', x: 4_160, y: 4_480 },
  { id: 'crossroads-return', x: 3_776, y: 4_480 }
]
```

- [ ] **Step 2: Replace the manifest expectations before production data**

Pin two exact crop rows, the single overlap, the five-row non-overlapping coverage partition, and
the initial hard budgets:

```ts
expect(MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map(({ id, bounds, expectedDimensions }) => ({
  id,
  bounds,
  expectedDimensions
}))).toEqual([
  {
    id: 'painted-v2-sundrop-camera-base',
    bounds: { left: 0, top: 3_200, right: 3_200, bottom: 6_400 },
    expectedDimensions: { width: 3_200, height: 3_200 }
  },
  {
    id: 'painted-v2-crossroads-camera-base',
    bounds: { left: 2_368, top: 2_240, right: 5_568, bottom: 5_440 },
    expectedDimensions: { width: 3_200, height: 3_200 }
  }
]);
expect(MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS).toContainEqual({
  id: 'painted-v2-overlap-camera-bases',
  firstCropId: 'painted-v2-sundrop-camera-base',
  secondCropId: 'painted-v2-crossroads-camera-base',
  bounds: { left: 2_368, top: 3_200, right: 3_200, bottom: 5_440 },
  routeMouth: {
    sharedAxis: 'x',
    bounds: { left: 3_072, top: 4_608, right: 3_200, bottom: 4_768 }
  },
  minimumSharedPixels: 128,
  planePolicy: 'base-only',
  ownerCropId: 'painted-v2-crossroads-camera-base'
});
expect(MEADOW_ENTRY_PAINTED_V2_PILOT_BUDGET_SUMMARY).toMatchObject({
  exportAreaRatio: 0.4545,
  overlapArea: 1_863_680,
  aggregateBaseHardBytes: 64 * 1_024 * 1_024
});
```

The exact coverage partition is:

```ts
[
  { mode: 'baked', bounds: { left: 2_368, top: 2_240, right: 5_568, bottom: 3_200 }, cropIds: ['painted-v2-crossroads-camera-base'] },
  { mode: 'baked', bounds: { left: 0, top: 3_200, right: 2_368, bottom: 5_440 }, cropIds: ['painted-v2-sundrop-camera-base'] },
  { mode: 'baked', bounds: { left: 2_368, top: 3_200, right: 3_200, bottom: 5_440 }, cropIds: ['painted-v2-sundrop-camera-base', 'painted-v2-crossroads-camera-base'] },
  { mode: 'baked', bounds: { left: 3_200, top: 3_200, right: 5_568, bottom: 5_440 }, cropIds: ['painted-v2-crossroads-camera-base'] },
  { mode: 'baked', bounds: { left: 0, top: 5_440, right: 3_200, bottom: 6_400 }, cropIds: ['painted-v2-sundrop-camera-base'] }
]
```

- [ ] **Step 3: Run focused tests and record genuine RED**

Run:

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-camera-envelope.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts
```

Expected: FAIL because the camera-envelope module is missing and the manifest still contains the
three narrow crops.

- [ ] **Step 4: Implement the pure envelope functions**

Use `intersectBounds`, `boundsArea`, and `unionArea`. For each consecutive axis-aligned route pair:

```ts
const first = cameraBoundsAtMeadowEntryPoint(route[index]!);
const second = cameraBoundsAtMeadowEntryPoint(route[index + 1]!);
const envelope = {
  left: Math.min(first.left, second.left),
  top: Math.min(first.top, second.top),
  right: Math.max(first.right, second.right),
  bottom: Math.max(first.bottom, second.bottom)
};
const covered = crops
  .map((crop) => intersectBounds(crop, envelope))
  .filter((value): value is PixelBounds => value !== null);
if (unionArea(covered) !== boundsArea(envelope)) {
  throw new Error(`Painted-v2 camera envelope segment ${index} is not covered`);
}
```

Reject diagonal route pairs, non-positive viewport dimensions, out-of-world points, and viewport
dimensions larger than the world.

- [ ] **Step 5: Implement the two-crop manifest**

Use filenames and texture keys:

```ts
{
  baseFilename: 'painted-v2-sundrop-camera-base.png',
  textureKeys: { base: 'meadow-entry-painted-v2-sundrop-camera-base', foreground: null },
  drawOrder: 0,
  alphaPolicy: { base: 'opaque', foreground: null }
}
{
  baseFilename: 'painted-v2-crossroads-camera-base.png',
  textureKeys: { base: 'meadow-entry-painted-v2-crossroads-camera-base', foreground: null },
  drawOrder: 10,
  alphaPolicy: { base: 'opaque', foreground: null }
}
```

Set each provisional `baseReviewBytes` to `32 MiB` and each `baseHardBytes` to `32 MiB`. Task 4
replaces the review thresholds with the smallest whole MiB above the measured export sizes while
retaining the aggregate `64 MiB` hard cap.

- [ ] **Step 6: Run focused GREEN and static checks**

First regenerate and inspect the active controls:

```bash
bun tools/export-meadow-entry-art-controls.ts
```

Inspect all 18 controls, especially runtime base coverage, crop manifest, handoff mask,
protected-live mask, and composite control. Write the controls report with exact source/catalog,
authoring, ownership, crop-manifest, storage, and combined fingerprints. Capture a UTC-second and
publish the approval:

```bash
MEADOW_CAMERA_CONTROLS_REVIEWED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
bun tools/approve-meadow-entry-controls.ts \
  --reviewed-by chanwaichan \
  --reviewed-at "$MEADOW_CAMERA_CONTROLS_REVIEWED_AT"
bun tools/approve-meadow-entry-controls.ts --check
bun tools/export-meadow-entry-art-controls.ts --check
```

Replace the control-approval test's stale literal with the exact reviewed object. Run:

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-camera-envelope.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-controls.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-controls-approval.test.ts
bun run check
bun run lint
git diff --check
```

Expected: all pass. Record the exact counts in the ignored task report.

- [ ] **Step 7: Commit Task 1**

```bash
git add \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-camera-envelope.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-camera-envelope.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-controls-approval.test.ts \
  src/lib/game/content/approvals/meadow-entry-painted-v2-controls.ts \
  artifacts/meadow-entry/painted-v2/controls \
  docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-controls.md
git commit -m "feat(world): define camera-safe Meadow controls"
```

---

### Task 2: Generate and approve the four underlay source panels

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts`
- Create: `artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-sundrop-north.png`
- Create: `artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-sundrop-south.png`
- Create: `artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-north.png`
- Create: `artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-south.png`
- Create: normalized PNG and JSON provenance with the same four basenames under
  `artifacts/meadow-entry/painted-v2/source-panels/`
- Create: `docs/superpowers/reports/img/hpa-586-painted-v2-camera-underlay/underlay-*.png`
- Modify: `artifacts/meadow-entry/painted-v2/provenance.json`
- Report: `.superpowers/sdd/2026-08-12-meadow-entry-painted-pilot-camera-safe-underlay/task-2-report.md` (ignored)

**Interfaces:**
- Adds `role: 'underlay' | 'detail'` to `MeadowEntryPaintedV2SourcePanel`.
- Adds four underlay rows with exact design bounds and keeps the five detail rows byte-immutable.
- Produces four accepted canonical opaque RGBA normalized panel files and validated generation
  provenance consumed by Task 3.

- [ ] **Step 1: Write failing registry and immutable-detail tests**

Pin the nine exact rows and hashes. The four underlay rows are:

```ts
[
  ['camera-underlay-sundrop-north', { left: 0, top: 3_200, right: 3_200, bottom: 4_864 }, { width: 3_200, height: 1_664 }],
  ['camera-underlay-sundrop-south', { left: 0, top: 4_736, right: 3_200, bottom: 6_400 }, { width: 3_200, height: 1_664 }],
  ['camera-underlay-crossroads-north', { left: 2_368, top: 2_240, right: 5_568, bottom: 3_904 }, { width: 3_200, height: 1_664 }],
  ['camera-underlay-crossroads-south', { left: 2_368, top: 3_776, right: 5_568, bottom: 5_440 }, { width: 3_200, height: 1_664 }]
]
```

Assert every existing detail `normalizedPath` hashes to the five values in Global Constraints.

- [ ] **Step 2: Run registry test for RED**

Run:

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts
```

Expected: FAIL because `role` and the four underlay rows do not exist.

- [ ] **Step 3: Add the sealed panel metadata**

Use assembly priorities `0, 1, 2, 3` for underlays. Keep existing detail priorities `10, 20, 30,
40, 50`. Add stable raw, normalized, and provenance paths for each new row. Do not change any
existing detail path or priority.

- [ ] **Step 4: Prepare exact image-generation references**

For each underlay crop, rasterize only the relevant portions of:

- approved concept;
- composite control;
- terrain/path mask;
- region mask;
- protected-live mask;
- entrance/transition mask;
- building footprint mask;
- the adjacent accepted detail panels.

Record every reference path and SHA-256 before generation. Temporary rasterized controls remain
outside tracked paths and are removed after accepted outputs are promoted.

- [ ] **Step 5: Generate each panel in a distinct built-in call**

Use the `imagegen` skill and built-in image-generation tool. Each prompt must include this contract:

```text
Paint only quiet orthographic terrain for this exact Meadow Entry underlay crop. Preserve the
approved warm upper-left lighting and region materials. Keep every live/protected/transition
clearance flat, navigable, and object-free. No buildings, actors, pickups, labels, doors, tall
foliage, water in live clearances, false walls, tile grid, border, or frame. Match the supplied
accepted detail-panel edges in palette, value, and detail frequency. Return one continuous panel,
not a map mockup or UI composition.
```

Do not batch the four panels into one generated sheet.

- [ ] **Step 6: Normalize and validate each candidate**

Use the existing canonical PNG utilities or a small Task-local script invoking those utilities.
Uniformly scale and center-crop without stretching. Reject any candidate requiring more than `2×`
scaling. Require:

```text
width and height equal the registry dimensions
channels = 4
alpha minimum = 255
alpha maximum = 255
canonical PNG chunks only
```

Write provenance with complete prompt, reference hashes, raw dimensions, crop rectangle, uniform
scale, cleanup operations, normalized hash, normalized bytes, and `byteReproducibleGeneration:
false` when the provider supplies no seed.

- [ ] **Step 7: Perform native-detail visual QA**

Inspect all four panels at original resolution plus:

- Sundrop north/south 128px overlap;
- Crossroads north/south 128px overlap;
- Sundrop/Crossroads 832px shared region;
- every protected/live mask overlay;
- edge comparisons with all five accepted detail panels.

Reject on a visible tile motif, frame, object cue, macro-rectangle, false blocker, live-clearance
violation, blur mismatch, or material discontinuity.

- [ ] **Step 8: Present the fresh art gate**

Show the overview and seam comparisons to the user. Record an explicit approve/reject answer and
UTC timestamp in panel provenance, root provenance, and the ignored Task 2 report. Do not commit or
start Task 3 before approval.

- [ ] **Step 9: Run focused checks after approval**

Run:

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-camera-envelope.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts
bun run art:storage:meadow-entry
git lfs fsck
bun run check
bun run lint
git diff --check
```

- [ ] **Step 10: Commit Task 2**

Stage only the registry/tests, four raw PNGs, four normalized PNGs, four provenance JSON files,
root provenance, and approved review images:

```bash
git add \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-*.png \
  artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-*.png \
  artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-*.json \
  artifacts/meadow-entry/painted-v2/provenance.json \
  docs/superpowers/reports/img/hpa-586-painted-v2-camera-underlay
git commit -m "art(world): paint Meadow camera underlay"
```

---

### Task 3: Assemble the deterministic camera-safe master

**Files:**
- Create: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts`
- Modify: `tools/finalize-meadow-entry-painted-v2-pilot.ts`
- Regenerate: `artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png`
- Regenerate: `artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json`
- Modify: `artifacts/meadow-entry/painted-v2/provenance.json`
- Report: `.superpowers/sdd/2026-08-12-meadow-entry-painted-pilot-camera-safe-underlay/task-3-report.md` (ignored)

**Interfaces:**
- Produces:
  `blendMeadowEntryOpaqueChannel(first, second, index, lastIndex): number`.
- Produces:
  `assembleMeadowEntryPaintedV2Underlay(panels): Buffer` for sealed production panel rows.
- Keeps `assembleMeadowEntryPaintedV2Pilot(input)` as the public sealed finalizer entry point.
- Changes master alpha policy to opaque inside the two-crop union and transparent elsewhere.

- [ ] **Step 1: Write failing synthetic blend tests**

Pin endpoints and rounding:

```ts
expect(blendMeadowEntryOpaqueChannel(10, 210, 0, 127)).toBe(10);
expect(blendMeadowEntryOpaqueChannel(10, 210, 127, 127)).toBe(210);
expect(blendMeadowEntryOpaqueChannel(0, 255, 63, 127)).toBe(126);
expect(() => blendMeadowEntryOpaqueChannel(0, 255, 1, 0)).toThrow(/lastIndex/);
expect(() => blendMeadowEntryOpaqueChannel(-1, 255, 1, 127)).toThrow(/channel/);
```

Add a `4×4` synthetic panel assembly that proves north/south blending happens before east/west
blending and every output alpha is 255.

- [ ] **Step 2: Write failing sealed-finalizer integration tests**

Use the nine real registered panel inputs. Assert:

```ts
expect(decoded.alpha.opaquePixels).toBe(18_616_320);
expect(decoded.alpha.transparentPixels).toBe(40_960_000 - 18_616_320);
expect(await hashFile(existingDetail.normalizedPath)).toBe(existingDetail.expectedSha256);
```

Assert a one-byte change in any detail panel or underlay provenance fails before publication.
Assert `--check` performs reads only and returns stale when the committed master differs.

- [ ] **Step 3: Run focused RED**

Run:

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts
```

Expected: FAIL because the underlay assembler is missing and the current finalizer only uses
last-owner-wins panel copies.

- [ ] **Step 4: Implement byte-exact blending**

Implement:

```ts
export function blendMeadowEntryOpaqueChannel(
  first: number,
  second: number,
  index: number,
  lastIndex: number
): number {
  assertByte(first);
  assertByte(second);
  if (!Number.isInteger(index) || !Number.isInteger(lastIndex) || lastIndex <= 0 || index < 0 || index > lastIndex) {
    throw new Error('Meadow Entry blend index/lastIndex is invalid');
  }
  return Math.floor((first * (lastIndex - index) + second * index + Math.floor(lastIndex / 2)) / lastIndex);
}
```

Use `lastIndex=127` for north/south shared rows and `lastIndex=831` for the family handoff. Assemble
the Sundrop and Crossroads families first, then blend families, then copy the five detail panels in
their unchanged ascending priorities.

- [ ] **Step 5: Update master validation and provenance**

Replace `assertOutsidePilotTransparent(master, specs)` with a union-based assertion:

```ts
const insideRuntimeUnion = MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.some(({ bounds }) =>
  x >= bounds.left && x < bounds.right && y >= bounds.top && y < bounds.bottom
);
expectAlpha(master, x, y, insideRuntimeUnion ? 255 : 0);
```

Provenance must record:

```json
{
  "alpha": "opaque-inside-camera-safe-crop-union",
  "underlayAssembly": {
    "northSouthLastIndex": 127,
    "familyHandoffLastIndex": 831,
    "rounding": "floor-half-up-positive-integers",
    "detailPolicy": "ascending-priority-last-owner-wins"
  }
}
```

- [ ] **Step 6: Regenerate and inspect the master**

Run:

```bash
bun tools/finalize-meadow-entry-painted-v2-pilot.ts
bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
```

Inspect the master at original detail across both 128px seams, the 832px family handoff, all five
detail boundaries, Hero House, main street, connector, and Waystone. Reject visible seams before
continuing.

- [ ] **Step 7: Run focused GREEN and no-write checks**

Run the three focused test files, `bun run check`, `bun run lint`, and `git diff --check`. Record
master SHA-256, encoded bytes, exact alpha counts, and unchanged five detail hashes.

- [ ] **Step 8: Commit Task 3**

```bash
git add \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts \
  tools/finalize-meadow-entry-painted-v2-pilot.ts \
  artifacts/meadow-entry/painted-v2/masters \
  artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json \
  artifacts/meadow-entry/painted-v2/provenance.json
git commit -m "feat(art): assemble camera-safe Meadow master"
```

---

### Task 4: Republish exports, proofs, approval, and generated runtime data

**Files:**
- Modify: `tools/export-meadow-entry-regions.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-export-integration.test.ts`
- Modify: `tools/render-meadow-entry-art-proofs.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts`
- Modify: `tools/approve-meadow-entry-art-package.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts`
- Modify: `tools/generate-meadow-entry-runtime.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts`
- Regenerate: `artifacts/meadow-entry/painted-v2/exports/`
- Regenerate: `public/game/assets/regions/meadow-entry-painted-v2/`
- Regenerate: `artifacts/meadow-entry/painted-v2/proofs/`
- Regenerate: `artifacts/meadow-entry/painted-v2/provenance/`
- Regenerate: `src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts`
- Regenerate: `src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts`
- Report: `.superpowers/sdd/2026-08-12-meadow-entry-painted-pilot-camera-safe-underlay/task-4-report.md` (ignored)

**Interfaces:**
- Publishes exactly two export/runtime PNGs and one overlap.
- Publishes ten proof IDs:
  `pilot-camera-envelope`, `pilot-underlay-sundrop-seam`,
  `pilot-underlay-crossroads-seam`, `pilot-underlay-family-handoff`,
  `pilot-detail-panel-handoffs`, `pilot-base-coverage`, `pilot-master-transparency`,
  `pilot-runtime-overlap`, `pilot-protected-live`, and `pilot-ownership`.
- Produces the exact approval inventory consumed by Task 5.

- [ ] **Step 1: Write failing two-export and ten-proof tests**

Before changing tools, assert exact filenames:

```ts
expect(Object.keys(result.files).sort()).toEqual([
  'painted-v2-crossroads-camera-base.png',
  'painted-v2-sundrop-camera-base.png'
]);
expect(result.verification).toMatchObject({
  cropCount: 2,
  exportCount: 2,
  baseExportCount: 2,
  foregroundExportCount: 0,
  overlapCount: 1,
  overlapPlanePixelsCompared: 1_863_680
});
```

Pin the ten proof IDs and require every PNG/JSON pair to bind the current master, controls, crop
manifest, and source-panel hashes.

- [ ] **Step 2: Write the approval/runtime inventory RED**

Change the literal approval artifact test to expect two exports and the ten proofs, while keeping
review metadata deliberately stale by one second. Run it to prove a genuine RED on the old
three-export approval.

- [ ] **Step 3: Run the focused RED set**

Run:

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-export-integration.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts
```

Expected: FAIL only on the new inventory, proof, and measured-budget assertions.

- [ ] **Step 4: Export the two exact crops**

Update the exporter to delete retired three-crop files during publication, reject them during
`--check`, cut the two new files from the master, and verify all `1_863_680` overlap pixels. Run:

```bash
bun tools/export-meadow-entry-regions.ts
bun tools/export-meadow-entry-regions.ts --check
```

Compute actual encoded sizes. Set each `baseReviewBytes` to
`Math.ceil(measuredBytes / MiB) * MiB`; rerun manifest tests and export until `--check` is stable.
Do not change either `32 MiB` per-crop hard limit or the `64 MiB` aggregate hard cap.

- [ ] **Step 5: Render and inspect all ten proofs**

Run:

```bash
bun tools/render-meadow-entry-art-proofs.ts
bun tools/render-meadow-entry-art-proofs.ts --check
```

Inspect every proof at original detail. The three seam/handoff proofs must include labeled source
bounds outside the art, not baked labels inside it. The camera-envelope proof must draw the route
and swept rectangles over the flattened master.

- [ ] **Step 6: Publish the reviewed approval**

Run the approval publisher with the existing explicit review interface. Record reviewer,
`reviewedAt`, master/export/proof/provenance hashes, measured bytes, storage configuration, and
controls fingerprint. Use:

```bash
MEADOW_CAMERA_PACKAGE_REVIEWED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
bun tools/approve-meadow-entry-art-package.ts \
  --reviewed-by chanwaichan \
  --reviewed-at "$MEADOW_CAMERA_PACKAGE_REVIEWED_AT"
bun tools/approve-meadow-entry-art-package.ts --check
```

Replace the intentional stale literal in the approval artifact test with the exact reviewed
object. Never derive expected approval values dynamically in that test.

- [ ] **Step 7: Generate runtime data and verify public equality**

Run:

```bash
bun tools/generate-meadow-entry-runtime.ts
bun tools/generate-meadow-entry-runtime.ts --check
```

Assert each public runtime file equals its artifact export byte-for-byte and retired public PNGs
are absent. Assert generated descriptors use centered positions `(1600,4800)` and `(3968,3840)`,
dimensions `3200×3200`, base draw orders `0` and `10`.

- [ ] **Step 8: Run focused GREEN and package no-write gates**

Run the seven test files from Step 3 plus:

```bash
bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
bun tools/export-meadow-entry-regions.ts --check
bun tools/render-meadow-entry-art-proofs.ts --check
bun tools/approve-meadow-entry-art-package.ts --check
bun tools/generate-meadow-entry-runtime.ts --check
bun run art:storage:meadow-entry
git lfs fsck
bun run check
bun run lint
git diff --check
```

Capture status before and after; no-write checks must leave it identical.

- [ ] **Step 9: Commit Task 4**

Stage only publication code/tests and the complete new package inventory. Confirm the retired six
PNG paths (three exports and three runtime copies) appear as deletions and only two replacements
exist.

```bash
git add \
  tools/export-meadow-entry-regions.ts \
  tools/render-meadow-entry-art-proofs.ts \
  tools/approve-meadow-entry-art-package.ts \
  tools/generate-meadow-entry-runtime.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-export-integration.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts \
  src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts \
  artifacts/meadow-entry/painted-v2/exports \
  artifacts/meadow-entry/painted-v2/proofs \
  artifacts/meadow-entry/painted-v2/provenance \
  artifacts/meadow-entry/painted-v2/provenance.json \
  public/game/assets/regions/meadow-entry-painted-v2
git commit -m "feat(art): publish camera-safe Meadow package"
```

---

### Task 5: Wire the two-texture pilot and fail-closed ownership

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts`
- Modify: `src/lib/game/content/assets.test.ts`
- Modify: `src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts`
- Modify: `src/lib/game/content/maps/background-ownership.test.ts`
- Modify: `src/lib/game/phaser/renderer-diagnostics.test.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify only if required by a failing contract:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.ts`
- Modify only if required by a failing contract: `src/lib/game/phaser/scenes/BootScene.ts`
- Report: `.superpowers/sdd/2026-08-12-meadow-entry-painted-pilot-camera-safe-underlay/task-5-report.md` (ignored)

**Interfaces:**
- Consumes Task 4 generated descriptors and regenerated visual-owner rows.
- Keeps `resolveMeadowEntryPaintedSelection(options)` unchanged.
- Pilot selection exposes exactly two assets/backgrounds and the regenerated owners.

- [ ] **Step 1: Run the unchanged focused runtime tests for genuine RED**

Run the seven files listed in Step 3 before editing them. Expected: FAIL on the committed
three-asset IDs/counts and old owner-restoration expectations now that Task 4 has generated the
two-crop runtime package. Record the exact failures; unrelated failures stop the task.

- [ ] **Step 2: Update exact selection, Boot, and scene contracts**

Assert pilot mode has two assets, two backgrounds, exact paths, dimensions, positions, orders, and
deep freezing. Assert fallback and production selections remain empty. Pin pilot preload
completion count `2`, off count `0`, and successful IDs. For each crop, cover:

- missing texture;
- wrong dimensions;
- injected render fault;
- the other healthy crop remaining successful;
- overlap owners staying suppressed when the healthy crop completely owns them;
- unique owners returning live when their only crop fails;
- collision remaining active.

- [ ] **Step 3: Run the focused suite after test edits**

Run:

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts \
  src/lib/game/content/assets.test.ts \
  src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/phaser/renderer-diagnostics.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS if generated-data consumption is fully generic. If a focused assertion fails on a
hardcoded three-asset assumption, retain that failure as the production RED for Step 4.

- [ ] **Step 4: Make the smallest runtime changes**

Prefer generated-data consumption only. Do not change `WorldScene` rendering, depth calculation,
camera behavior, collision, or map geometry. Change production TypeScript only if a focused failure
shows an actual hardcoded three-asset assumption.

- [ ] **Step 5: Run focused GREEN and static gates**

Run the seven files from Step 3, then `bun run check`, `bun run lint`, and `git diff --check`.

- [ ] **Step 6: Commit Task 5**

```bash
git add \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts \
  src/lib/game/content/assets.test.ts \
  src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/phaser/renderer-diagnostics.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "test(world): validate camera-safe Meadow runtime"
```

Include runtime/Boot production files in the commit only when Step 4 demonstrates they changed.

---

### Task 6: Update the real-input browser journeys

**Files:**
- Modify: `tests/e2e/game.e2e.ts`
- Modify: `docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-browser.md`
- Report: `.superpowers/sdd/2026-08-12-meadow-entry-painted-pilot-camera-safe-underlay/task-6-report.md` (ignored)

**Interfaces:**
- Keeps the exact two test titles beginning `Meadow painted pilot`.
- Changes only the painted asset IDs, dimensions, request paths, completion counts, and ownership
  restoration expectations.
- Keeps the stabilized keyboard route, transition helper, collision tolerances, save/reload, and
  facing assertions frozen.

- [ ] **Step 1: Run unchanged focused E2E for genuine RED**

Run:

```bash
bun run test:e2e -- --grep "Meadow painted pilot"
```

Expected: FAIL on the committed three-asset IDs/counts against the Task 5 two-crop runtime. The
stabilized route assertions must not be the failure source.

- [ ] **Step 2: Write the two-asset E2E expectations**

Use:

```ts
const PAINTED_PILOT_BACKGROUND_IDS = [
  'meadow-entry-painted-v2-sundrop-camera-base-image',
  'meadow-entry-painted-v2-crossroads-camera-base-image'
] as const;
```

Both expected dimensions are `{ width: 3_200, height: 3_200 }`; pilot renderer completion count is
`2`. Update request paths to the two new public filenames. Fault each crop separately.

- [ ] **Step 3: Make only evidence-backed expectation corrections**

Do not add waypoints, coordinate seeding, retries, tolerance widening, or player mutation. If a
route fails independently of inventory, stop and report the regression instead of tuning it in
this task.

- [ ] **Step 4: Run individual and bounded-repeat GREEN**

Run each title once, then:

```bash
bun run test:e2e -- --grep "Meadow painted pilot" --repeat-each=2
```

Expected: four passes. Record per-test times and total duration. Update the browser report with the
new exact IDs, dimensions, healthy/failed ownership behavior, and superseded three-crop evidence.

- [ ] **Step 5: Run static checks and commit Task 6**

Run `bun run check`, `bun run lint`, and `git diff --check`, then:

```bash
git add tests/e2e/game.e2e.ts \
  docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-browser.md
git commit -m "test(world): validate camera-safe Meadow journeys"
```

---

### Task 7: Probe the exact two-texture runtime inventory

**Files:**
- Modify: `tools/probe-meadow-entry-texture-safety.ts`
- Modify: `tools/probe-meadow-entry-texture-safety.test.ts`
- Create: `artifacts/meadow-entry/painted-v2/proofs/texture-probe/browser-camera-safe-pilot.json`
- Create: `docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-texture-preflight.md`
- Report: `.superpowers/sdd/2026-08-12-meadow-entry-painted-pilot-camera-safe-underlay/task-7-report.md` (ignored)

**Interfaces:**
- Adds candidate `painted-v2-camera-safe-pilot` containing the two actual Task 4 export paths.
- Does not derive representative images or alter the historical 3200/1600 evidence.
- Produces one frozen browser JSON report bound to exact export hashes and bytes.

- [ ] **Step 1: Write failing exact-candidate tests**

Assert two unique logical IDs, actual export paths, exact `3200×3200` decoded dimensions, exact
encoded hashes/bytes read from Task 4 approval, and expected retention `2`.

- [ ] **Step 2: Run Bun test for RED**

```bash
bun test tools/probe-meadow-entry-texture-safety.test.ts
```

Expected: FAIL because the new candidate is not registered.

- [ ] **Step 3: Implement the fixed candidate without retry weakening**

Register:

```ts
{
  id: 'painted-v2-camera-safe-pilot',
  assets: [
    { id: 'sundrop-camera-base', path: 'artifacts/meadow-entry/painted-v2/exports/painted-v2-sundrop-camera-base.png' },
    { id: 'crossroads-camera-base', path: 'artifacts/meadow-entry/painted-v2/exports/painted-v2-crossroads-camera-base.png' }
  ],
  expectedRetainedTextures: 2
}
```

Do not add upload retries or accept context loss.

- [ ] **Step 4: Run the real browser probe once**

Run:

```bash
bun tools/probe-meadow-entry-texture-safety.ts --candidate painted-v2-camera-safe-pilot
```

If loopback bind is sandbox-blocked, request one narrow localhost escalation. Acceptance requires
2/2 uploads, 2/2 retained, exact hashes/dimensions, `contextLost=false`, and no WebGL error. Any
other outcome is a fail-closed `stop`; do not chase green.

- [ ] **Step 5: Write the report and run checks**

Record renderer, Chromium, `MAX_TEXTURE_SIZE`, encoded aggregate, decoded aggregate
`81,920,000`, per-upload duration, aggregate duration, context status, and decision. Run focused
Vitest orchestration tests, Bun tests, `bun run check`, `bun run lint`, `git diff --check`, and
`git lfs fsck`.

- [ ] **Step 6: Commit only on `proceed`**

If the exact candidate stops, leave Task 7 uncommitted and return `NEEDS_CONTEXT`. If it proceeds:

```bash
git add \
  tools/probe-meadow-entry-texture-safety.ts \
  tools/probe-meadow-entry-texture-safety.test.ts \
  artifacts/meadow-entry/painted-v2/proofs/texture-probe/browser-camera-safe-pilot.json \
  docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-texture-preflight.md
git commit -m "test(art): verify camera-safe Meadow textures"
```

---

### Task 8: Replace Task 10 visual evidence and obtain user approval

**Files:**
- Replace: the nine PNGs under
  `docs/superpowers/reports/img/hpa-586-painted-v2-pilot/` named in the original Task 10
- Replace: `docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-visual-review.md`
- Report: `.superpowers/sdd/2026-08-12-meadow-entry-painted-pilot-camera-safe-underlay/task-8-report.md` (ignored)

**Interfaces:**
- Consumes the exact Task 6 runtime and Task 7 proceeding texture inventory.
- Produces nine accepted `1920×1080` DPR-1, zoom-100 browser captures and explicit user verdict.

- [ ] **Step 1: Clean only Task 10 transients**

Close the prior named Playwright session and remove only `.playwright-cli/` and `output/` generated
by Task 10 after confirming neither contains tracked or user-authored files. Preserve the rejected
PNG/report bytes until replacements are captured; record their hashes as superseded evidence.

- [ ] **Step 2: Build and start a fresh named headed session**

Run `bun run build`, start preview at `127.0.0.1:4173`, and use the Playwright CLI workflow with a
new named session. Verify viewport `1920×1080`, DPR 1, document zoom 1, visible canvas, and exact
review bar:

```text
HPA-586 • PAINTED PILOT • BROWSER • 100%
```

- [ ] **Step 3: Recapture the six normal/diagnostic pilot positions**

Use the same seeds as the superseded report:

```text
Hero House: (704,5920)
Sundrop main street: (1472,4672)
connector village mouth: (2600,4688)
connector midpoint: (2200,4688)
connector Crossroads mouth: (3264,4688)
Crossroads Waystone: (3500,4100)
```

No debug overlay is allowed in these six images.

- [ ] **Step 4: Recapture collision and fallback diagnostics**

At the Waystone seed, capture collision-only debug, matched pilot-off fallback, and one deliberate
missing/render-faulted crop. Confirm live Waystone, actors, pickup, and collision remain present.

- [ ] **Step 5: Inspect every PNG at original detail**

Reject the set on any visible crop/source rectangle, fallback tile exposure within the approved
envelope, seam, double-darkening, material jump, blur mismatch, duplicate live visual, false door,
invisible collision, clearance ambiguity, normal-view debug overlay, or incorrect bar.

- [ ] **Step 6: Present the replacement visual gate**

Show at least Hero House, connector village mouth, connector midpoint, connector Crossroads mouth,
and Waystone to the user. Record explicit approve/reject and requested changes. Do not infer
approval and do not start PR3.

- [ ] **Step 7: Commit only accepted evidence**

If rejected, stop `NEEDS_CONTEXT` with no evidence commit. If approved, update the report with
exact hashes, dimensions, capture settings, original-detail findings, texture decision, and user
approval timestamp, then:

```bash
git add \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot \
  docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-visual-review.md
git commit -m "docs(art): approve camera-safe Meadow pilot"
```

---

### Task 9: Run cumulative gates and final whole-branch review

**Files:**
- Create: `docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-validation.md`
- Verify: every file from design commit `42dc6be` through Task 8
- Report: `.superpowers/sdd/2026-08-12-meadow-entry-painted-pilot-camera-safe-underlay/task-9-report.md` (ignored)

**Interfaces:**
- Produces the cumulative automated/art/browser/native-boundary report.
- Produces an independent whole-branch review verdict before branch finishing.

- [ ] **Step 1: Run every no-write art/package gate**

Capture tracked status before and after:

```bash
bun tools/export-meadow-entry-art-controls.ts --check
bun tools/approve-meadow-entry-controls.ts --check
bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
bun tools/export-meadow-entry-regions.ts --check
bun tools/render-meadow-entry-art-proofs.ts --check
bun tools/approve-meadow-entry-art-package.ts --check
bun tools/generate-meadow-entry-runtime.ts --check
bun run art:storage:meadow-entry
git lfs fsck
```

Expected: every command passes and status is identical.

- [ ] **Step 2: Run focused camera-safe suites**

Run all Task 1–7 test files together, including camera envelope, crop manifest, panel registry,
underlay assembly, finalizer, exporter, proof, approval, generated runtime, selection, ownership,
Boot/scene, and texture probe tests. Record exact file/test counts.

- [ ] **Step 3: Run full automated gates**

```bash
bun run test:unit -- --run
bun run test:e2e
bun run check
bun run lint
bun run build
bun run build:tauri
git diff --check
```

If the known localhost/port collision occurs during parallel execution, stop competing processes
and rerun the affected suite once serially; document both runs. Do not weaken a test.

- [ ] **Step 4: Audit exact artifact/runtime equality**

Verify:

- four new underlay raw/normalized/provenance triples exist and are LFS-correct;
- five detail hashes still equal Global Constraints;
- master alpha counts equal `18_616_320` opaque and `22_343_680` transparent pixels;
- two exports equal two runtime copies byte-for-byte;
- overlap difference count is zero across `1_863_680` pixels;
- approval, provenance, proof, generated descriptor, and public inventories agree;
- retired three-crop runtime/export paths are absent;
- concept art is absent from runtime assets;
- default Boot selection is zero and pilot selection is exactly two.

- [ ] **Step 5: Record native boundary honestly**

Attempt packaged/Tauri build and window launch only through configured tooling. Use a configured
Gliese/Tauri companion MCP if one is actually callable. If launch works but functional control is
unavailable, record build/window launch PASS and functional native diagnostics/walkthrough
BLOCKED. Do not touch the user's native save and do not substitute ad-hoc GUI automation.

- [ ] **Step 6: Request independent whole-branch review**

Review the exact amendment range for:

- spec compliance;
- camera-envelope math;
- source/detail immutability;
- deterministic blend fidelity;
- package/approval/provenance integrity;
- ownership/fallback/collision correctness;
- texture evidence truthfulness;
- Task 8 visual quality;
- YAGNI/KISS and scope boundaries.

Fix only concrete findings through separate RED/GREEN commits, then request scoped re-review.

- [ ] **Step 7: Commit the validation report**

The report must distinguish automated, browser, texture, packaged launch, functional native, and
user visual evidence. It must state that PR3/default activation remains out of scope.

```bash
git add docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-validation.md
git commit -m "docs(world): validate camera-safe Meadow pilot"
```

- [ ] **Step 8: Hand off branch finishing**

Require clean tracked status, accepted visual evidence, texture `proceed`, and independent review
PASS before invoking `superpowers:finishing-a-development-branch`.
