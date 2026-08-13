# Meadow Entry Painted Pilot Camera-Safe Underlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three narrow painted Meadow pilot runtime islands with two continuous
camera-safe `3200×3200` crops while preserving the five accepted detail panels and all gameplay
semantics.

**Architecture:** Four new quiet terrain panels form a deterministic underlay in the partial
`6400×6400` master. The existing five byte-immutable detail sources composite above it in ascending
priority with a deterministic `128px` inward smoothstep feather, retaining exact source pixels at
and beyond inset index `127` while eliminating hard derived rectangles. Two opaque runtime crops
are cut from the flattened master; a pure swept-camera contract proves their union covers the
approved Hero House → Sundrop → connector → Waystone route.

**2026-08-13 Task 3 review amendment:** Seam acceptance is attributed to the compositor. Exact
visible perimeter equality to the pre-detail composite, at least `75%` hard-copy excess reduction
under strict per-step later-coverage filtering, and original-detail inspection are blocking. The
local `1.25x` p95 ratio remains recorded as a diagnostic and is not a publication blocker.

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
- Static camera-envelope proof includes the existing browser route driver's `18px` reach residual;
  transient Phaser smooth-follow rectangles are sampled separately by Task 6.
- Keep the five normalized detail-panel bytes immutable at these SHA-256 values:
  - `sundrop-north`: `3c7fe6063b8043578464ae68e5ec38505ae6a866afcd72fe2ff2293bf912a4e9`
  - `sundrop-south`: `b3bb18292cd23556d58f2ac7720f95037392ef60b26e9f208206e1f270fd672f`
  - `hero-house-frontage`: `9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b`
  - `village-crossroads-connector`: `6866f90802dfcd73d3828b41b237c8c1239ee130c9d8c8af3ac10d20c193e8b2`
  - `crossroads`: `1534062581775261bfcfd8a26eb5de5a730adf658d9b6ef9abb65413bbe4ae34`
- Composite those detail sources only with the approved policy
  `ascending-priority-source-over-current-master-with-128px-inset-smoothstep-feather`; perimeter
  index `0` equals the current master and inset index `127` equals the detail source.
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
- Modify: `src/lib/game/content/meadow-entry-controls-approval-tool.test.ts`
- Modify: `tools/approve-meadow-entry-controls.ts`
- Regenerate: `artifacts/meadow-entry/painted-v2/controls/`
- Regenerate: `src/lib/game/content/generated/meadow-entry-painted-v2-art-control.ts`
- Regenerate: `src/lib/game/content/approvals/meadow-entry-painted-v2-controls.ts`
- Create: `docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-controls.md`
- Report: `.superpowers/sdd/2026-08-12-meadow-entry-painted-pilot-camera-safe-underlay/task-1-report.md` (ignored)

**Interfaces:**
- Produces:
  `PaintedV2CameraRoutePoint = { readonly id: string; readonly x: number; readonly y: number }`.
- Produces:
  `MEADOW_ENTRY_PAINTED_V2_CAMERA_VIEWPORT: { width: 1920; height: 1080 }`.
- Produces: `MEADOW_ENTRY_PAINTED_V2_CAMERA_ROUTE_REACH_PX: 18`.
- Produces:
  `MEADOW_ENTRY_PAINTED_V2_CAMERA_SAFE_ROUTE: readonly PaintedV2CameraRoutePoint[]`.
- Produces:
  `cameraBoundsAtMeadowEntryPoint(point: { readonly x: number; readonly y: number }, viewport?: { readonly width: number; readonly height: number }): PixelBounds`.
- Produces:
  `collectMeadowEntryPaintedV2CameraEnvelopes(route?: readonly PaintedV2CameraRoutePoint[], viewport?: { readonly width: number; readonly height: number }, routeReachPx?: number): readonly PixelBounds[]`.
- Produces:
  `assertMeadowEntryPaintedV2CameraBoundsCovered(crops: readonly PixelBounds[], bounds: PixelBounds, label: string): void`.
- Produces:
  `assertMeadowEntryPaintedV2CameraEnvelopeCovered(crops: readonly PixelBounds[], route?: readonly PaintedV2CameraRoutePoint[], viewport?: { readonly width: number; readonly height: number }, routeReachPx?: number): void`.
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
expect(envelopeBounds(collectMeadowEntryPaintedV2CameraEnvelopes())).toEqual({
  left: 0,
  top: 3_666,
  right: 5_138,
  bottom: 6_400
});
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
  { id: 'villager-house-1-approach', x: 660, y: 4_688 },
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
  { id: 'crossroads-return', x: 3_776, y: 4_480 },
  { id: 'connector-return-east', x: 3_264, y: 4_480 },
  { id: 'connector-return-lane', x: 3_264, y: 4_688 },
  { id: 'west-lane-return', x: 320, y: 4_688 },
  { id: 'save-lane', x: 1_152, y: 4_688 },
  { id: 'save-point', x: 1_152, y: 4_800 }
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
  exportAreaRatio: 0.5,
  overlapArea: 1_863_680,
  aggregateBaseHardBytes: 64 * 1_024 * 1_024
});
expect(
  unionArea(MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map(({ bounds }) => bounds))
).toBe(18_616_320);
```

`exportAreaRatio` is the sum of both export areas divided by the `6400×6400` master, so it is
`20_480_000 / 40_960_000 = 0.5`. The distinct crop-union ratio is
`18_616_320 / 40_960_000 = 0.4545`; do not substitute it for the exported-area metric.

For both crop rows, use `derivation: { mode: 'exact-bounds' }`, set `reviewBounds`,
`preClampBounds`, and `bounds` to the same exact crop bounds, use `coverageAttachments: []` and
`edgeClamp: null`, and pin this metadata:

```ts
{
  id: 'painted-v2-sundrop-camera-base',
  sourceRegionIds: ['connector-village-crossroads', 'sundrop-village'],
  neighborIds: ['painted-v2-crossroads-camera-base'],
  overlapIds: ['painted-v2-overlap-camera-bases'],
  drawOrder: 0
}
{
  id: 'painted-v2-crossroads-camera-base',
  sourceRegionIds: [
    'connector-village-crossroads',
    'crossroads',
    'mistfen',
    'silverpine',
    'tidewatch-coast',
    'wildwood'
  ],
  neighborIds: ['painted-v2-sundrop-camera-base'],
  overlapIds: ['painted-v2-overlap-camera-bases'],
  drawOrder: 10
}
```

The source-region lists are the sorted unique primary owners of current baked sources completely
contained by each new crop. Pin them literally; do not infer them from broad region-envelope
intersection, which would incorrectly include environmental regions with no contained baked row.

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

Use `intersectBounds`, `boundsArea`, `unionArea`, and `clampBoundsToWorld`. For each consecutive
axis-aligned route pair, form the endpoint camera envelope, preserve edges already clamped to the
world, expand only the remaining edges by `routeReachPx` (default `18`), clamp once more, and then
test coverage:

```ts
const first = cameraBoundsAtMeadowEntryPoint(route[index]!);
const second = cameraBoundsAtMeadowEntryPoint(route[index + 1]!);
const envelope = {
  left: Math.min(first.left, second.left),
  top: Math.min(first.top, second.top),
  right: Math.max(first.right, second.right),
  bottom: Math.max(first.bottom, second.bottom)
};
const clampedEnvelope = clampBoundsToWorld({
  left: envelope.left === MEADOW_ENTRY_WORLD_BOUNDS.left
    ? envelope.left
    : envelope.left - routeReachPx,
  top: envelope.top === MEADOW_ENTRY_WORLD_BOUNDS.top
    ? envelope.top
    : envelope.top - routeReachPx,
  right: envelope.right === MEADOW_ENTRY_WORLD_BOUNDS.right
    ? envelope.right
    : envelope.right + routeReachPx,
  bottom: envelope.bottom === MEADOW_ENTRY_WORLD_BOUNDS.bottom
    ? envelope.bottom
    : envelope.bottom + routeReachPx
}).bounds;
const covered = crops
  .map((crop) => intersectBounds(crop, clampedEnvelope))
  .filter((value): value is PixelBounds => value !== null);
if (unionArea(covered) !== boundsArea(clampedEnvelope)) {
  throw new Error(`Painted-v2 camera envelope segment ${index} is not covered`);
}
```

Put the intersection/union-area comparison in
`assertMeadowEntryPaintedV2CameraBoundsCovered`; the route-envelope function calls that helper for
each segment, and Task 6 reuses the same helper for captured live camera rectangles.

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
replaces the review thresholds with the smallest whole-MiB ceiling at or above the measured export
sizes while retaining the aggregate `64 MiB` hard cap.

- [ ] **Step 6: Run focused GREEN and static checks**

First regenerate and inspect the active controls:

```bash
bun tools/export-meadow-entry-art-controls.ts
```

Inspect all 18 controls, especially runtime base coverage, crop manifest, handoff mask,
protected-live mask, and composite control. Write the controls report with exact source/catalog,
authoring, ownership, crop-manifest, storage, and combined fingerprints. Capture a UTC-second and
publish the approval. First change `EVIDENCE_PATH` in `tools/approve-meadow-entry-controls.ts`
and both controls-approval tests to the new report path
`docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-controls.md`; otherwise the
new approval would falsely cite the superseded 2026-08-11 report.

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
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-controls-approval.test.ts \
  src/lib/game/content/meadow-entry-controls-approval-tool.test.ts
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
  src/lib/game/content/meadow-entry-controls-approval-tool.test.ts \
  tools/approve-meadow-entry-controls.ts \
  src/lib/game/content/generated/meadow-entry-painted-v2-art-control.ts \
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
- Create these review images under
  `docs/superpowers/reports/img/hpa-586-painted-v2-camera-underlay/`:
  `sundrop-north.png`, `sundrop-south.png`, `crossroads-north.png`,
  `crossroads-south.png`, `sundrop-north-south-seam.png`,
  `crossroads-north-south-seam.png`, `family-handoff.png`,
  `detail-panel-handoffs.png`, and `protected-live-overlay.png`
- Create: `docs/superpowers/reports/img/hpa-586-painted-v2-camera-underlay/region-material-overlay.png`
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
- connector mask;
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
approved warm upper-left lighting and every masked region material. “Sundrop” and “Crossroads” in
the panel ID name crop families, not a single-biome fill: retain Mistfen wet/muted ground,
Silverpine autumn/shrine ground, Wildwood forest floor, and Tidewatch coast material wherever
their supplied masks intersect this rectangle. Keep every live/protected/transition clearance
flat, navigable, and object-free. No buildings, actors, pickups, labels, doors, tall foliage,
water in live clearances, false walls, tile grid, border, or frame. Match the supplied accepted
detail-panel edges in palette, value, and detail frequency. Return one continuous panel, not a map
mockup or UI composition.
```

Do not batch the four panels into one generated sheet.

- [ ] **Step 6: Normalize and validate each candidate**

For each accepted raw candidate, construct an exact `MeadowEntryNormalizationTransform` and call
`normalizeMeadowEntryMasterCandidate(raw, transform, spec.expectedDimensions)` from
`meadow-entry-master-finalizer.ts`, followed by
`encodeCanonicalMeadowEntryPng(decoded.data, decoded.width, decoded.height)` from
`meadow-entry-png.ts`. Uniformly scale and center-crop without stretching. Reject any candidate
requiring more than `2×` scaling; splitting the sealed panel requires a design amendment. Require:

```text
width and height equal the registry dimensions
channels = 4
alpha minimum = 255
alpha maximum = 255
canonical PNG chunks only
```

Write provenance with complete prompt, reference hashes, raw dimensions, crop rectangle, uniform
scale, cleanup operations, normalized hash, normalized bytes, and `byteReproducibleGeneration:
false` when the provider supplies no seed. Update root `provenance.json.sourcePanels` to the exact
nine-row inventory and set its top-level `controlFingerprint` to the approved Task 1 fingerprint;
preserve unrelated concept, semantic-ruling, and superseded-approval fields byte-for-byte at the
JSON-value level.

- [ ] **Step 7: Perform native-detail visual QA**

Inspect all four panels at original resolution plus:

- Sundrop north/south 128px overlap;
- Crossroads north/south 128px overlap;
- Sundrop/Crossroads 832px shared region;
- every protected/live mask overlay;
- every region/connector material overlay, including off-route Mistfen, Silverpine, Wildwood, and
  Tidewatch crop margins;
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
  docs/superpowers/reports/img/hpa-586-painted-v2-camera-underlay/sundrop-north.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-camera-underlay/sundrop-south.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-camera-underlay/crossroads-north.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-camera-underlay/crossroads-south.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-camera-underlay/sundrop-north-south-seam.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-camera-underlay/crossroads-north-south-seam.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-camera-underlay/family-handoff.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-camera-underlay/detail-panel-handoffs.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-camera-underlay/protected-live-overlay.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-camera-underlay/region-material-overlay.png
git commit -m "art(world): paint Meadow camera underlay"
```

---

### Task 3: Assemble the deterministic camera-safe master

**Files:**
- Create: `src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-master-provenance.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts`
- Modify: `tools/finalize-meadow-entry-painted-v2-pilot.ts`
- Regenerate: `artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png`
- Regenerate: `artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json`
- Modify: `artifacts/meadow-entry/painted-v2/provenance.json`
- Report: `.superpowers/sdd/2026-08-12-meadow-entry-painted-pilot-camera-safe-underlay/task-3-report.md` (ignored)

**Interfaces:**
- Produces a pure detail-boundary sampler that reports per-panel/per-edge visible sample counts,
  edge mean/nearest-rank p95, strictly filtered comparison count/mean/p95, excess, and p95 ratio.
- Filters every comparison step independently when either endpoint is covered by later-priority
  detail art; it never pools opposite parallel edges.
- Produces:
  `blendMeadowEntryOpaqueChannel(first, second, index, lastIndex): number`.
- Produces:
  `MeadowEntryUnderlayDecodedPanel = { readonly id: string; readonly bounds: PixelBounds; readonly rgba: DecodedMeadowEntryRgba }`.
- Produces:
  `MeadowEntryUnderlayAssemblyInput = { readonly width: number; readonly height: number; readonly panels: readonly MeadowEntryUnderlayDecodedPanel[]; readonly northSouthPairs: readonly { readonly northId: string; readonly southId: string; readonly bounds: PixelBounds }[]; readonly familyHandoff: { readonly sundropPanelIds: readonly string[]; readonly crossroadsPanelIds: readonly string[]; readonly bounds: PixelBounds } }`.
- Produces:
  `assembleMeadowEntryPaintedV2Underlay(input: MeadowEntryUnderlayAssemblyInput): DecodedMeadowEntryRgba`.
- Produces: `MEADOW_ENTRY_PAINTED_V2_DETAIL_FEATHER_WIDTH_PX: 128`.
- Produces: `MEADOW_ENTRY_PAINTED_V2_DETAIL_FEATHER_LAST_INSET_INDEX: 127`.
- Produces:
  `meadowEntryDetailFeatherWeight(edgeDistance: number, lastInsetIndex?: number): number`.
- Produces:
  `blendMeadowEntryDetailChannel(current: number, detail: number, weight: number): number`.
- Produces:
  `compositeMeadowEntryDetailPanel(target: DecodedMeadowEntryRgba, panel: MeadowEntryUnderlayDecodedPanel, lastInsetIndex?: number): void`.
- Keeps `assembleMeadowEntryPaintedV2Pilot(input)` as the public sealed finalizer entry point.
- The generic pure assembler is injectable for small synthetic tests, but the public finalizer
  constructs its input only from the sealed four underlay registry rows. No caller-supplied panel
  spec may bypass the registered production geometry.
- Changes master alpha policy to opaque inside the two-crop union and transparent elsewhere.

- [ ] **Step 1: Preserve the rejected hard-copy baseline and write correction RED tests**

Before replacing the current failed master, assert its SHA-256 is
`c6ce56d67ebab7edc0744b8b8f3321401530c80664cafa3245f7dd468154b137`. Compute the per-edge mean,
p95, comparison-band mean/p95, and excess with the exact sampling definition in the design. Record
the table in the ignored Task 3 report. Later-priority coverage is excluded from earlier edges,
and every comparison step is filtered independently when either of its two pixels is covered.
Write a synthetic regression that fails if an edge reuses the opposite edge's comparison band or
retains comparison steps hidden by later-priority art.

Keep the already captured missing-assembler RED in the report. Add new tests that fail against the
current hard-copy finalizer. Pin underlay blend endpoints and feather endpoints/rounding:

```ts
expect(blendMeadowEntryOpaqueChannel(10, 210, 0, 127)).toBe(10);
expect(blendMeadowEntryOpaqueChannel(10, 210, 127, 127)).toBe(210);
expect(blendMeadowEntryOpaqueChannel(0, 255, 63, 127)).toBe(126);
expect(() => blendMeadowEntryOpaqueChannel(0, 255, 1, 0)).toThrow(/lastIndex/);
expect(() => blendMeadowEntryOpaqueChannel(-1, 255, 1, 127)).toThrow(/channel/);

expect(meadowEntryDetailFeatherWeight(0)).toBe(0);
expect(meadowEntryDetailFeatherWeight(63)).toBe(126);
expect(meadowEntryDetailFeatherWeight(127)).toBe(255);
expect(meadowEntryDetailFeatherWeight(128)).toBe(255);
expect(blendMeadowEntryDetailChannel(10, 210, 126)).toBe(109);
expect(() => meadowEntryDetailFeatherWeight(-1)).toThrow(/edgeDistance/);
```

Add a `4×4` synthetic panel assembly that proves north/south blending happens before east/west
blending and every output alpha is 255. Add a `255×255` detail panel over a distinct target and
assert its perimeter equals the target, distance `127` equals the detail source, and source/target
buffers are otherwise not aliased. With injected `lastInsetIndex=1`, composite two overlapping
`3×3` details and prove the later panel feathers over the already-composed lower-priority result.

- [ ] **Step 2: Write failing sealed-finalizer integration tests**

Use the nine real registered panel inputs. Assert:

```ts
const provenance = JSON.parse(result.provenanceJson.toString('utf8'));
expect(provenance.base.alpha).toEqual({
  opaquePixels: 18_616_320,
  transparentPixels: 22_343_680
});
expect(await hashFile(existingDetail.normalizedPath)).toBe(existingDetail.expectedSha256);
```

Assert all five immutable detail hashes literally match Global Constraints. Assert a one-byte
change in any detail panel or underlay provenance fails before publication.
Assert the merged root `provenance.json` top-level `controlFingerprint` and nested
`assembly.controls.fingerprint` both equal the approved current fingerprint; a stale top-level
fingerprint must fail `--check`.
Assert `--check` performs reads only and returns stale when the committed master differs.

Add focused generation-provenance tests for the four approved attempt-3 underlays. A generative
record may omit `prompt` and `promptSha256` only when `settings.promptUnavailable === true`; in
that case both fields must be `null`. Reject `promptUnavailable=true` with either prompt field
present and reject null prompt fields without that explicit setting. This is a truthful validation
exception for the already-approved attempt-3 records, not permission to infer or fabricate the
missing prompt.

- [ ] **Step 3: Run focused RED**

Run:

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts
```

Expected after the original underlay RED has been implemented: FAIL only on the new detail-feather
contract because the current finalizer still hard-copies detail rectangles.

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

The generic assembler derives `lastIndex` as `overlapHeight - 1` for north/south pairs and
`overlapWidth - 1` for the family handoff; this is what makes the `4×4` synthetic contract useful.
The sealed production adapter separately asserts exact overlap sizes `128×3200` and `832×2240`,
therefore production uses `lastIndex=127` and `lastIndex=831`.

Implement the approved detail functions exactly:

```ts
export function meadowEntryDetailFeatherWeight(
  edgeDistance: number,
  lastInsetIndex = MEADOW_ENTRY_PAINTED_V2_DETAIL_FEATHER_LAST_INSET_INDEX
): number {
  assertIntegerAtLeast(edgeDistance, 0, 'edgeDistance');
  assertIntegerAtLeast(lastInsetIndex, 1, 'lastInsetIndex');
  const q = Math.min(edgeDistance, lastInsetIndex);
  const numerator = q * q * (3 * lastInsetIndex - 2 * q);
  const denominator = lastInsetIndex * lastInsetIndex * lastInsetIndex;
  return Math.floor((255 * numerator + Math.floor(denominator / 2)) / denominator);
}

export function blendMeadowEntryDetailChannel(
  current: number,
  detail: number,
  weight: number
): number {
  assertByte(current);
  assertByte(detail);
  assertByte(weight, 'weight');
  return Math.floor((current * (255 - weight) + detail * weight + 127) / 255);
}
```

For each panel pixel, derive
`edgeDistance = min(localX, width - 1 - localX, localY, height - 1 - localY)`. Require both panel
dimensions to be at least `255px`. Assemble the Sundrop and Crossroads families first, blend the
families, then call `compositeMeadowEntryDetailPanel` for the five detail rows in unchanged
ascending priority. The helper mutates only the derived target buffer; it never mutates or rewrites
the registered source panel bytes.

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
    "detailPolicy": "ascending-priority-source-over-current-master-with-128px-inset-smoothstep-feather",
    "detailFeatherWidthPx": 128,
    "detailFeatherLastInsetIndex": 127,
    "detailFeatherWeight": "floor((255*q^2*(3*127-2*q)+floor(127^3/2))/127^3),q=clamp(edgeDistance,0,127)",
    "detailBlend": "floor((current*(255-weight)+detail*weight+127)/255)",
    "detailSourceBytes": "immutable",
    "detailCore": "source-exact-at-edge-distance-gte-127-unless-later-priority-composites"
  }
}
```

Update `mergedPackageProvenance` so it replaces both `assembly` and the root
`controlFingerprint` from the validated assembly provenance. Preserve every unrelated root field.
This synchronization is required again when Task 4 finalizes measured budgets and reapproves the
controls.

- [ ] **Step 6: Regenerate and inspect the master**

Run:

```bash
bun tools/finalize-meadow-entry-painted-v2-pilot.ts
bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
```

Inspect the master at original detail across both 128px seams, the 832px family handoff, all five
detail boundaries, Hero House, main street, connector, and Waystone. Reject visible seams before
continuing.

Run the deterministic boundary measurement against a strictly recomputed hard-copy table. For
every visible detail perimeter require at least `75%` reduction in boundary-gradient excess and
exact equality between every visible corrected outer-edge pixel and the pre-detail composite pixel
immediately before that panel is applied. Record edge p95, `32px` comparison-band p95, and their
ratio for diagnosis; do not make the `1.25x` ratio blocking. Also assert both assembly runs produce
the same SHA-256, the five source hashes remain unchanged, and alpha counts remain `18_616_320`
opaque / `22_343_680` transparent. Numeric success cannot override a visible native-resolution
rectangle.

- [ ] **Step 7: Run focused GREEN and no-write checks**

Run:

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts
bun run check
bun run lint
git diff --check
```

Record master SHA-256, encoded bytes, exact alpha counts, and unchanged five detail hashes.

- [ ] **Step 8: Commit Task 3**

```bash
git add \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.ts \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts \
  tools/finalize-meadow-entry-painted-v2-pilot.ts \
  artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png \
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
- Modify: `src/lib/game/content/backgrounds/meadow-entry-proof-renderer.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts`
- Modify: `tools/approve-meadow-entry-art-package.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts`
- Modify: `tools/generate-meadow-entry-runtime.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-controls-approval.test.ts`
- Modify: `src/lib/game/content/meadow-entry-controls-approval-tool.test.ts`
- Regenerate: `artifacts/meadow-entry/painted-v2/controls/`
- Regenerate: `src/lib/game/content/generated/meadow-entry-painted-v2-art-control.ts`
- Regenerate: `src/lib/game/content/approvals/meadow-entry-painted-v2-controls.ts`
- Update: `docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-controls.md`
- Regenerate: `artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png`
- Regenerate: `artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json`
- Regenerate: `artifacts/meadow-entry/painted-v2/exports/`
- Regenerate: `public/game/assets/regions/meadow-entry-painted-v2/`
- Regenerate: `artifacts/meadow-entry/painted-v2/proofs/`
- Regenerate: `artifacts/meadow-entry/painted-v2/provenance/`
- Regenerate: `src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts`
- Regenerate: `src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts`
- Report: `.superpowers/sdd/2026-08-12-meadow-entry-painted-pilot-camera-safe-underlay/task-4-report.md` (ignored)

**Interfaces:**
- Uses one temporary-root export to measure encoded bytes without modifying tracked export/runtime
  roots.
- Finalizes the two literal review budgets, regenerates/reapproves controls, and reruns the sealed
  finalizer before tracked publication. The Task 3 master PNG must remain byte-identical while its
  provenance is rebound to the final control fingerprint.
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

Expected: FAIL only on the new two-export, ten-proof, approval, and runtime inventories. Measured
budget literals are introduced after the read-only preflight in Step 4.

- [ ] **Step 4: Measure both encodings in an isolated output root**

First implement the minimal exporter/proof/approval/runtime inventory changes required by the RED
tests: the exporter must cut the two manifest crops, delete retired filenames in any target root,
and verify all `1_863_680` overlap pixels; the proof renderer must implement the ten literal proof
IDs and their exact input bindings; the approval/runtime tools must consume those literal
inventories generically. Keep the approval and generated runtime artifacts stale until Steps 8–9.
Do not publish to tracked roots yet. Capture tracked status, create one validated temporary root,
and run:

```bash
MEADOW_CAMERA_MEASURE_ROOT="$(mktemp -d /private/tmp/gliese-meadow-camera-export.XXXXXX)"
bun tools/export-meadow-entry-regions.ts --output-root "$MEADOW_CAMERA_MEASURE_ROOT"
```

Record the two exact encoded byte counts from the command JSON and confirm tracked status is
unchanged. Compute each review ceiling as
`Math.ceil(measuredBytes / (1_024 * 1_024)) * 1_024 * 1_024`. After recording the values and
validating that `MEADOW_CAMERA_MEASURE_ROOT` begins with
`/private/tmp/gliese-meadow-camera-export.`, remove only that temporary root.

- [ ] **Step 5: Capture the measured-budget RED**

Copy the two computed integer ceilings literally into the crop-manifest test before changing the
manifest. Also assert each ceiling is at least its corresponding measured temporary export bytes,
each hard limit remains `32 * MiB`, and the aggregate hard limit remains `64 * MiB`. Run the crop
manifest, controls, and controls-approval tests. Expected: the crop-manifest test FAILS on the two
new literal ceilings while unchanged control/approval tests may still pass; this is the genuine
measured-budget RED before the manifest and its dependent fingerprint are regenerated.

- [ ] **Step 6: Stabilize budgets, controls, and master provenance**

Replace only the two provisional `baseReviewBytes` values with the measured literal ceilings.
Regenerate all 18 controls, inspect every changed control, update the camera-safe controls report,
and publish a new explicit controls approval:

```bash
bun tools/export-meadow-entry-art-controls.ts
MEADOW_CAMERA_CONTROLS_REVIEWED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
bun tools/approve-meadow-entry-controls.ts \
  --reviewed-by chanwaichan \
  --reviewed-at "$MEADOW_CAMERA_CONTROLS_REVIEWED_AT"
bun tools/export-meadow-entry-art-controls.ts --check
bun tools/approve-meadow-entry-controls.ts --check
```

Replace both controls-approval tests' stale literals with the exact reviewed object. Then rerun
the sealed finalizer so master provenance binds the final fingerprint:

```bash
bun tools/finalize-meadow-entry-painted-v2-pilot.ts
bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
```

Assert the master PNG SHA-256 is byte-identical to Task 3, the master provenance and both root
provenance fingerprint fields equal the final approval, and no unrelated root provenance field
changed. This closes the fingerprint dependency before tracked export publication.

- [ ] **Step 7: Publish exports and render all ten proofs**

Run:

```bash
bun tools/export-meadow-entry-regions.ts
bun tools/export-meadow-entry-regions.ts --check
bun tools/render-meadow-entry-art-proofs.ts
bun tools/render-meadow-entry-art-proofs.ts --check
```

Inspect every proof at original detail. The three seam/handoff proofs must include labeled source
bounds outside the art, not baked labels inside it. The camera-envelope proof must draw the full
outbound-and-return route and `18px`-expanded swept rectangles over the flattened master.

- [ ] **Step 8: Publish the reviewed package approval**

Run the approval publisher with the existing explicit review interface. Record reviewer,
`reviewedAt`, master/export/proof/provenance hashes, measured bytes, storage configuration, and
the final controls fingerprint. Use:

```bash
MEADOW_CAMERA_PACKAGE_REVIEWED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
bun tools/approve-meadow-entry-art-package.ts \
  --reviewed-by chanwaichan \
  --reviewed-at "$MEADOW_CAMERA_PACKAGE_REVIEWED_AT"
bun tools/approve-meadow-entry-art-package.ts --check
```

Replace the intentional stale literal in the approval artifact test with the exact reviewed
object. Never derive expected approval values dynamically in that test.

- [ ] **Step 9: Generate runtime data and verify public equality**

Run:

```bash
bun tools/generate-meadow-entry-runtime.ts
bun tools/generate-meadow-entry-runtime.ts --check
```

Assert each public runtime file equals its artifact export byte-for-byte and retired public PNGs
are absent. Assert generated descriptors use centered positions `(1600,4800)` and `(3968,3840)`,
dimensions `3200×3200`, base draw orders `0` and `10`.

- [ ] **Step 10: Run focused GREEN and package no-write gates**

Run:

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-export-integration.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-controls-approval.test.ts \
  src/lib/game/content/meadow-entry-controls-approval-tool.test.ts
bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
bun tools/export-meadow-entry-art-controls.ts --check
bun tools/approve-meadow-entry-controls.ts --check
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

- [ ] **Step 11: Commit Task 4**

Stage only publication code/tests and the complete new package inventory. Confirm the retired six
PNG paths (three artifact exports and three public runtime copies) appear as deletions and exactly
four replacement PNGs appear as additions (two artifact exports and two public runtime copies).

```bash
git add \
  tools/export-meadow-entry-regions.ts \
  tools/render-meadow-entry-art-proofs.ts \
  tools/approve-meadow-entry-art-package.ts \
  tools/generate-meadow-entry-runtime.ts \
  src/lib/game/content/backgrounds/meadow-entry-proof-renderer.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-export-integration.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-controls-approval.test.ts \
  src/lib/game/content/meadow-entry-controls-approval-tool.test.ts \
  src/lib/game/content/generated/meadow-entry-painted-v2-art-control.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts \
  src/lib/game/content/approvals/meadow-entry-painted-v2-controls.ts \
  src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts \
  artifacts/meadow-entry/painted-v2/controls \
  artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png \
  artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json \
  artifacts/meadow-entry/painted-v2/exports \
  artifacts/meadow-entry/painted-v2/proofs \
  artifacts/meadow-entry/painted-v2/provenance \
  artifacts/meadow-entry/painted-v2/provenance.json \
  docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-controls.md \
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
bun run check
bun run lint
git diff --check
```

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
- Adds a test-local `__glieseCameraSamples` probe containing
  `{ mapId: string; routeToken: string; pointIndex: number; left: number; top: number; right: number; bottom: number; width: number; height: number }`.
- Sets the gameplay journey viewport to exact `1920×1080` before navigation and proves every live
  Meadow camera sample is contained by the two-crop union.
- Keeps the stabilized keyboard route, transition helper, collision tolerances, save/reload, and
  facing assertions frozen.
- Preserves all existing route coordinates and tolerances. After at least one correction, the
  test-local route runner may advance an axis when an unblocked diagnostic has directionally
  reached the target and is within the existing `18px` reach tolerance.

- [ ] **Step 1: Run unchanged focused E2E for genuine RED**

Run:

```bash
bun run test:e2e -- --grep "Meadow painted pilot"
```

Expected: FAIL on the committed three-asset IDs/counts against the Task 5 two-crop runtime. The
stabilized route assertions must not be the failure source.

The baseline run on 2026-08-13 additionally exposed a nondeterministic Villager House 1 correction
oscillation: an unblocked correction moved from `x=526.9016` (`6.9016px` from target, already
inside the existing `18px` reach contract) to `x=500.8784` (`19.1216px` away) and exhausted the
correction limit. An unchanged individual rerun passed. The user approved the narrow test-runner
amendment below at `2026-08-13T18:31:58Z`; no route, tolerance, retry, player, or production change
is authorized.

- [ ] **Step 1a: Add the route-runner correction RED and minimal GREEN**

In the existing browser-local route-steering characterization, add a synthetic unblocked
correction sequence that first crosses the target outside the tight settle tolerance but inside
the existing reach tolerance. Require the corrected axis to advance after at least one correction.
Confirm genuine RED because the current runner continues correcting instead.

Then reuse the existing axis-settle branch when all of these are true:

- at least one correction has been issued;
- the diagnostic is not blocked;
- the movement has directionally reached the target;
- the remaining distance is at most the existing `reachTolerance`.

Retain the existing `18.01px` rejection, blocked-at-exhaustion, wrong-direction/no-progress, stall,
and correction-limit assertions. Run the route-steering characterization and the dedicated
Villager House 1 graybox case before resuming the two-asset E2E edits.

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

Before the gameplay test calls `page.goto`, run:

```ts
await page.setViewportSize({ width: 1_920, height: 1_080 });
```

Extend the existing test-local served-`WorldScene` chunk instrumentation used for facing capture.
Expose the active scene camera immediately after its existing `startFollow` call, fail if that
served-chunk marker is absent, and use an init-script `requestAnimationFrame` sampler to copy
`camera.worldView` plus the active route token/point index into `__glieseCameraSamples` only while
the route runner is active. Do not add a production diagnostic or game-state mutation. After the
return/save proof, require at least one sample for every exterior route token (retain `pointIndex`
for traceability; do not require a frame for a point that settles between animation frames),
require every Meadow sample to be exactly `1920×1080`, and
pass each half-open sample bounds plus the two runtime crop bounds to
`assertMeadowEntryPaintedV2CameraBoundsCovered`. Import that pure relative module directly in the
Playwright worker; it has no DOM, Phaser, or `$lib` dependency. Keep the static pure envelope and
this live smooth-follow probe as separate assertions.

- [ ] **Step 3: Make only evidence-backed expectation corrections**

Do not add waypoints, coordinate seeding, retries, tolerance widening, or player mutation. The
only approved route-runner change is Step 1a's post-correction use of the existing reach contract.
If another route fails independently of inventory, stop and report the regression instead of
tuning it in this task.

- [ ] **Step 4: Run individual and bounded-repeat GREEN**

Run each title once, then the bounded repeat:

```bash
bun run test:e2e -- --grep "^Meadow painted pilot selects only approved planes and preserves live fallbacks$"
bun run test:e2e -- --grep "^Meadow painted pilot preserves the village Crossroads gameplay loop$"
bun run test:e2e -- --grep "Meadow painted pilot" --repeat-each=2
```

Expected: four passes. Record per-test times and total duration. Update the browser report with the
new exact IDs, dimensions, healthy/failed ownership behavior, live camera-sample count and extrema,
and superseded three-crop evidence.

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
`81,920,000`, per-upload duration, aggregate duration, context status, and decision. Run:

```bash
bun run test:unit -- --run \
  src/lib/game/content/meadow-entry-texture-safety-probe-orchestration.test.ts \
  src/lib/game/content/meadow-entry-texture-safety-probe-unit.test.ts \
  src/lib/game/content/meadow-entry-texture-safety-probe.test.ts
bun test tools/probe-meadow-entry-texture-safety.test.ts
bun run check
bun run lint
git diff --check
git lfs fsck
```

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
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/hero-house-frontage.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/sundrop-main-street.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/connector-village-mouth.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/connector-midpoint.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/connector-crossroads-mouth.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/crossroads-waystone.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/collision-boundary.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/fallback-matched-camera.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/missing-plane-fallback.png \
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

Run the complete deduplicated Task 1–7 unit inventory and the Bun-owned probe test:

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-camera-envelope.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-controls.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-controls-approval.test.ts \
  src/lib/game/content/meadow-entry-controls-approval-tool.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-export-integration.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts \
  src/lib/game/content/assets.test.ts \
  src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/phaser/renderer-diagnostics.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts \
  src/lib/game/content/meadow-entry-texture-safety-probe-orchestration.test.ts \
  src/lib/game/content/meadow-entry-texture-safety-probe-unit.test.ts \
  src/lib/game/content/meadow-entry-texture-safety-probe.test.ts
bun test tools/probe-meadow-entry-texture-safety.test.ts
```

Record exact file/test counts from both commands.

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
- the static route includes its `18px` reach residual and the complete return/save leg, while the
  Task 6 report contains nonzero exact-`1920×1080` live camera samples with zero crop-union escapes;
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
