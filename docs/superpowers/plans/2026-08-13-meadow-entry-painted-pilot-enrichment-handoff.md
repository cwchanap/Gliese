# Meadow Entry Painted Pilot Enrichment and Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace eight painted Meadow source panels with richer, clearance-safe terrain art and
repair the Sundrop and connector/Crossroads handoffs without changing the approved two-texture
runtime, camera envelope, gameplay, or pinned Hero House frontage source.

**Architecture:** A compositor-first change seals one axis-pair helper and an edge-feathered
pair-correction pass. The same helper owns the existing underlay north/south and family blends.
Before generation, a deterministic review tool derives decoration eligibility from the existing
controls and pins the exact 67-tile texture-energy baseline. Eight separately generated source
panels then pass two explicit user gates. The finalizer applies ordinary detail feathering in
priority order and corrects each declared pair immediately after its second member. Existing
publication, probe, E2E, and two-crop runtime paths are regenerated rather than redesigned.

**Tech Stack:** TypeScript, Vitest, Bun, Sharp, canonical PNG helpers, built-in image generation,
Phaser 4, Playwright, Git LFS.

## Global Constraints

- Implement the approved design at
  `docs/superpowers/specs/2026-08-13-meadow-entry-painted-pilot-enrichment-handoff-design.md`.
- Treat this as a Gliese world-expansion `revision`; use `gliese-world-expansion`,
  `2d-game-asset-workflow`, `imagegen`, `superpowers:test-driven-development`, and
  `superpowers:verification-before-completion` in their owning tasks.
- Keep runtime crop geometry exact:
  - `painted-v2-sundrop-camera-base`: `(0,3200)–(3200,6400)`, `3200×3200`;
  - `painted-v2-crossroads-camera-base`: `(2368,2240)–(5568,5440)`, `3200×3200`.
- Keep exactly two opaque base textures, no foreground plane, no third runtime texture, and no
  renderer branch.
- Keep `?meadowPaintedPilot=on` opt-in. Default and `regionalBackground=off` continue to select
  fallback tiles.
- Freeze the approved `1920×1080`, DPR-1, zoom-1 camera envelope and all collision, transitions,
  actors, pickups, discoveries, ownership, fallback, save, and route semantics.
- Regenerate exactly these eight source IDs at their existing paths and registry geometry:
  `camera-underlay-sundrop-north`, `camera-underlay-sundrop-south`,
  `camera-underlay-crossroads-north`, `camera-underlay-crossroads-south`, `sundrop-north`,
  `sundrop-south`, `village-crossroads-connector`, and `crossroads`.
- Keep `hero-house-frontage` byte-pinned at normalized SHA-256
  `9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b`.
- Keep all nine panel IDs, paths, bounds, roles, dimensions, and assembly priorities unchanged.
- Keep ordinary detail compositing at ascending priority with the existing `128px` smoothstep
  feather. Pair correction is an in-place operation after the second pair member; it is not a
  replacement compositor or a runtime layer.
- Declare only these detail pairs:

  ```text
  sundrop-north -> sundrop-south
  bounds (256,4928)–(2880,5056), axis y

  village-crossroads-connector -> crossroads
  bounds (2880,4480)–(3392,4768), axis x
  ```

- Do not declare the existing connector/Sundrop north overlap as a pair. Ordinary priority and
  feather behavior remain authoritative at exact bounds `(2592,4480)–(2880,5056)`.
- Reuse the existing control SVGs and export the existing protection margins. Do not add a control
  SVG, duplicate the margin values, or change the approved control fingerprint merely to create
  review evidence.
- Decoration review uses the exact 67 qualifying world-aligned `512×512` tiles, five sheets
  (`16 + 16 + 16 + 16 + 3`), minimum per-tile RGB step `1.5`, and median floor
  `3.1843126049067515`.
- The 67-row inventory is the user-approved current-source correction to the superseded 60-row
  arithmetic: 83 crop-union cells are inspected, 16 fail the 50% threshold, and qualifying row
  counts are `7 + 6 + 10 + 9 + 5 + 10 + 8 + 6 + 6`. Do not truncate or invent exclusions.
- Every qualifying tile must show at least two distinct low-profile microdetail cluster types after
  the objective floor passes. Repeated grids, regular stamps, noise-only texture, and broad empty
  eligible fields fail.
- Generate each source in a distinct built-in image-generation call, in the approved order. Use
  uniform scale plus deterministic crop, never stretch, reject scale over `2×`, require canonical
  opaque RGBA, and forbid cleanup rectangles or unrecorded pixel patches.
- Allow at most five recorded generation attempts per source. Hitting the limit stops for a new
  design decision.
- Stop at the interim six-source gate and the final eight-source gate for explicit user approval.
  Do not infer approval.
- Do not rerun the texture probe at the interim gate. Run the existing final two-texture candidate
  exactly once after final exports are stable.
- Preserve the current rejected visual report and nine PNGs as uncommitted evidence until an
  explicitly accepted replacement set overwrites them.
- Use `apply_patch` for handwritten files. Owning deterministic tools may write generated JSON and
  PNG artifacts.
- Every task writes an ignored handoff report under
  `.superpowers/sdd/2026-08-13-meadow-entry-painted-pilot-enrichment-handoff/` and stages only the
  tracked inventory named by that task.
- Do not start Task 9, PR3, full-world painting, or default painted-mode activation before the final
  user visual verdict.

---

### Task 1: Seal the shared axis-pair compositor before generation

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts`
- Report: `.superpowers/sdd/2026-08-13-meadow-entry-painted-pilot-enrichment-handoff/task-1-report.md` (ignored)

**Interfaces:**
- Produces:
  `MeadowEntryPaintedV2BlendAxis = 'x' | 'y'`.
- Produces:
  `MeadowEntryPaintedV2DetailPair = { readonly firstId: string; readonly secondId: string; readonly bounds: PixelBounds; readonly axis: MeadowEntryPaintedV2BlendAxis }`.
- Produces the frozen exact table `MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS` with the two rows in
  Global Constraints.
- Produces frozen `MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS` with the five exact
  self-describing formula strings from the approved design.
- Produces:
  `validateMeadowEntryPaintedV2DetailPairContract(panels, pairs, formulas): void`, used by the pure
  stack compositor and later by finalizer provenance validation.
- Produces:
  `blendMeadowEntryAxisPairPixel(first, second, bounds, axis, x, y): readonly [number, number, number, 255]`.
- Produces:
  `meadowEntryDetailPairCorrectionLastInsetIndex(bounds: PixelBounds): number`.
- Produces:
  `compositeMeadowEntryDetailPairCorrection(target, first, second, pair): void`.
- Produces:
  `compositeMeadowEntryDetailPanels(target, panels, pairs): void`, the single pure owner of
  ascending ordinary detail compositing and immediate post-second-member pair correction.
- Refactors both existing underlay north/south transitions and the family handoff to call the same
  axis-pair pixel helper with byte-identical output.
- Does **not** integrate pair correction into the production pilot finalizer yet. The checked-in
  master remains current until accepted replacement source bytes exist. The pure stack helper is
  used only by synthetic tests and temporary review assembly until Task 5.

- [ ] **Step 1: Pin the pre-refactor underlay output**

Run the current pure underlay assembler against the four checked-in underlay panels, record its
decoded RGBA SHA-256 in the ignored report, and add that literal to the underlay test. This is the
byte-equivalence oracle for the helper refactor.

- [ ] **Step 2: Write pair-table and synthetic correction RED tests**

Add literal table expectations:

```ts
expect(MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS).toEqual([
  {
    firstId: 'sundrop-north',
    secondId: 'sundrop-south',
    bounds: { left: 256, top: 4928, right: 2880, bottom: 5056 },
    axis: 'y'
  },
  {
    firstId: 'village-crossroads-connector',
    secondId: 'crossroads',
    bounds: { left: 2880, top: 4480, right: 3392, bottom: 4768 },
    axis: 'x'
  }
]);
expect(MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS).not.toContainEqual(
  expect.objectContaining({
    firstId: 'village-crossroads-connector',
    secondId: 'sundrop-north'
  })
);
expect(MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS).toEqual({
  axisPair:
    'floor((first*(lastIndex-index)+second*index+floor(lastIndex/2))/lastIndex)',
  correctionLastInsetIndex:
    'min(127,floor((min(intersectionWidth,intersectionHeight)-1)/2))',
  correctionEdgeDistance: 'min(x-left,right-1-x,y-top,bottom-1-y)',
  correctionWeight:
    'meadowEntryDetailFeatherWeight(correctionEdgeDistance,correctionLastInsetIndex)',
  out: 'blendMeadowEntryDetailChannel(ordinaryComposite,axisPair,correctionWeight)'
});
```

Add a synthetic `128px` intersection whose ordinary composite is a third color. Assert:

```ts
expect(meadowEntryDetailPairCorrectionLastInsetIndex({
  left: 0,
  top: 0,
  right: 2624,
  bottom: 128
})).toBe(63);
expect(meadowEntryDetailFeatherWeight(0, 63)).toBe(0);
expect(meadowEntryDetailFeatherWeight(63, 63)).toBe(255);
expect(rejectedMaxOfTwoPanelFeathersAtSundropMidpoint).toBe(129);

const midpoint = correctedPixel(1312, 63);
expect(midpoint).toEqual([
  blendMeadowEntryOpaqueChannel(firstR, secondR, 63, 127),
  blendMeadowEntryOpaqueChannel(firstG, secondG, 63, 127),
  blendMeadowEntryOpaqueChannel(firstB, secondB, 63, 127),
  255
]);
expect(midpoint).not.toEqual(ordinaryWashedMidpoint);
```

Pin all four correction edges to the ordinary target byte-for-byte, every output alpha to 255,
and every pixel outside the intersection unchanged. Repeat the operation from identical inputs and
assert identical output.

Add negative cases for duplicate/stale IDs, missing participants, bounds outside either panel,
wrong pair bounds, zero-length axis, overlapping pair ownership for the same second member, and a
formula/table mismatch.

Add an order spy around `compositeMeadowEntryDetailPanels` and pin:

```text
sundrop-north ordinary
sundrop-south ordinary
sundrop pair correction
hero-house-frontage ordinary
village-crossroads-connector ordinary
crossroads ordinary
connector/Crossroads pair correction
```

The helper sorts by `assemblyPriority`, rejects duplicate priorities, and requires pair
`firstId` to have been processed before `secondId`.

- [ ] **Step 3: Run focused RED**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts
```

Expected: FAIL because the pair table, shared pixel helper, correction inset helper, and correction
compositor do not exist. Existing underlay/detail tests remain green.

- [ ] **Step 4: Implement one axis-pair pixel helper**

Derive `index` and `lastIndex`; do not store them in the table:

```ts
export function blendMeadowEntryAxisPairPixel(
  first: readonly number[],
  second: readonly number[],
  bounds: PixelBounds,
  axis: MeadowEntryPaintedV2BlendAxis,
  x: number,
  y: number
): readonly [number, number, number, 255] {
  const index = axis === 'x' ? x - bounds.left : y - bounds.top;
  const lastIndex = axis === 'x'
    ? bounds.right - bounds.left - 1
    : bounds.bottom - bounds.top - 1;
  return [
    blendMeadowEntryOpaqueChannel(first[0]!, second[0]!, index, lastIndex),
    blendMeadowEntryOpaqueChannel(first[1]!, second[1]!, index, lastIndex),
    blendMeadowEntryOpaqueChannel(first[2]!, second[2]!, index, lastIndex),
    255
  ];
}
```

Replace `blendNorthSouth` and `blendFamilies` channel loops with this helper. Keep their existing
pair lookup and sealed geometry validation.

- [ ] **Step 5: Implement the edge-feathered pair correction**

Use the current target pixel as `ordinaryComposite`, compute the pair source from the two registered
panels, and write only inside `pair.bounds`:

```ts
const correctionLastInsetIndex = Math.min(
  MEADOW_ENTRY_PAINTED_V2_DETAIL_FEATHER_LAST_INSET_INDEX,
  Math.floor((Math.min(width, height) - 1) / 2)
);
const edgeDistance = Math.min(
  x - bounds.left,
  bounds.right - 1 - x,
  y - bounds.top,
  bounds.bottom - 1 - y
);
const correctionWeight = meadowEntryDetailFeatherWeight(
  edgeDistance,
  correctionLastInsetIndex
);
const pairPixel = blendMeadowEntryAxisPairPixel(firstPixel, secondPixel, bounds, axis, x, y);
out = blendMeadowEntryDetailChannel(ordinaryComposite, pairPixel, correctionWeight);
```

The helper must mutate only the supplied derived target buffer. It must not mutate either source
panel, allocate a full-master clone, or snapshot the intersection.

Implement `compositeMeadowEntryDetailPanels` by calling the existing ordinary compositor for one
panel and then applying any pair whose `secondId` matches that panel. Do not expose an alternative
ordering callback in production; tests may observe results with small synthetic buffers.

- [ ] **Step 6: Run GREEN and prove no published-byte drift**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
rtk bun run check
rtk bunx prettier --check \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts
rtk bunx eslint \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts
rtk git diff --check
```

Assert the underlay hash equals Step 1 and the current finalizer `--check` remains green, proving the
new correction helper is sealed but not yet active in production assembly.

- [ ] **Step 7: Commit Task 1**

```bash
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts
rtk git commit -m "feat(art): seal Meadow pair correction"
```

---

### Task 2: Seal decoration eligibility and the 67-tile baseline

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts`
- Create: `tools/render-meadow-entry-painted-v2-enrichment-review.ts`
- Create: `tools/render-meadow-entry-painted-v2-enrichment-review.test.ts`
- Create: `docs/superpowers/reports/img/hpa-586-painted-v2-enrichment/decoration-baseline.json`
- Create: `docs/superpowers/reports/2026-08-13-meadow-entry-painted-enrichment-baseline.md`
- Report: `.superpowers/sdd/2026-08-13-meadow-entry-painted-pilot-enrichment-handoff/task-2-report.md` (ignored)

**Interfaces:**
- Renames and exports the existing exact object as
  `MEADOW_ENTRY_PROTECTION_MARGINS: Readonly<Insets>`; every bake policy continues to reference that
  same object.
- Produces:
  `buildMeadowEntryPaintedV2DecorationEligibility(input): MeadowEntryPaintedV2DecorationEligibility`.
- Produces:
  `collectMeadowEntryPaintedV2DecorationTiles(eligibility): readonly MeadowEntryPaintedV2DecorationTile[]`.
- Produces:
  `measureMeadowEntryPaintedV2DecorationEnergy(image, eligibility, tiles): MeadowEntryPaintedV2DecorationEnergy`.
- Produces:
  `assertMeadowEntryPaintedV2DecorationEnergy(result): void`.
- The tool reads the existing rendered SVG controls, derives route-core exclusion in memory,
  renders five numbered contact sheets on demand, and supports `--check`, `--master`,
  `--mode baseline|candidate`, `--contact-sheets`, `--source-review`, and `--output-root` without
  publishing runtime files. Baseline mode writes only `decoration-baseline.json`; candidate mode
  writes `decoration-candidate.json`, writes the five sheets only with `--contact-sheets`, and
  writes the sealed native review inventory only with `--source-review`.
- The tool also supports `--assemble-sources`: it reads the nine fixed registry paths, builds the
  underlay with `assembleMeadowEntryPaintedV2Underlay`, applies the pure
  `compositeMeadowEntryDetailPanels` helper, validates two-crop opacity, and writes a review-only
  master and two crops beneath `--output-root`.
- Pins the rejected-master 67-row baseline before any image-generation call.
- Produces `MEADOW_ENTRY_PAINTED_V2_ENRICHMENT_REVIEW_FILENAMES`, a frozen exact inventory for:
  one five-crop quadrant/center sheet per replacement panel; three underlay seams; complete and
  west/center/east crops for each detail pair; one sides/corners sheet per detail pair; Hero House
  edges; protected-live atlas; region/material overlay; route-centerline overlay; five density
  sheets; and candidate JSON. The candidate JSON binds the eight normalized source paths/hashes and
  records full-panel original-detail inspection; the tool does not duplicate those large PNG bytes
  into the report tree.

The exact candidate inventory is:

```text
decoration-candidate.json
decoration-density-01.png
decoration-density-02.png
decoration-density-03.png
decoration-density-04.png
decoration-density-05.png
panel-camera-underlay-sundrop-north-quadrants-center.png
panel-camera-underlay-sundrop-south-quadrants-center.png
panel-camera-underlay-crossroads-north-quadrants-center.png
panel-camera-underlay-crossroads-south-quadrants-center.png
panel-sundrop-north-quadrants-center.png
panel-sundrop-south-quadrants-center.png
panel-village-crossroads-connector-quadrants-center.png
panel-crossroads-quadrants-center.png
underlay-sundrop-north-south.png
underlay-crossroads-north-south.png
underlay-family-handoff.png
detail-sundrop-intersection.png
detail-sundrop-west.png
detail-sundrop-center.png
detail-sundrop-east.png
detail-sundrop-sides-corners.png
detail-connector-crossroads-intersection.png
detail-connector-crossroads-west.png
detail-connector-crossroads-middle.png
detail-connector-crossroads-east.png
detail-connector-crossroads-sides-corners.png
hero-house-edges.png
protected-live-atlas.png
region-material-overlay.png
route-centerline-overlay.png
```

- [ ] **Step 1: Write the protection-margin identity RED**

Assert the export equals the existing values, is frozen, and is the same object embedded in every
`protected-live` disposition:

```ts
expect(MEADOW_ENTRY_PROTECTION_MARGINS).toEqual({
  top: 32,
  right: 16,
  bottom: 16,
  left: 16
});
expect(Object.isFrozen(MEADOW_ENTRY_PROTECTION_MARGINS)).toBe(true);
for (const entry of protectedEntries) {
  expect(entry.disposition.protectionMargins).toBe(MEADOW_ENTRY_PROTECTION_MARGINS);
}
```

Expected RED: the current constant is private.

- [ ] **Step 2: Write synthetic eligibility and energy RED tests**

Use small raster masks to prove:

- crop union clipping is half-open;
- protected-live, building, entrance/transition, reward/discovery, and semantic-anchor alpha remove
  eligibility;
- terrain rectangles are inset with `MEADOW_ENTRY_PROTECTION_MARGINS` and non-positive results are
  discarded;
- no second dilation is applied;
- a tile qualifies at exactly 50% and fails one pixel below 50%;
- row-major ordering and `16 + 16 + 16 + 16 + 3` partitioning are deterministic;
- `rgbStep` averages absolute RGB differences over three channels for right/down eligible pairs;
- pairs with either endpoint ineligible are excluded;
- minimum and nearest-rank median gates fail independently;
- repeated execution produces byte-identical JSON.

Add command-level tests that `--assemble-sources` writes one `6400×6400` review master plus the two
exact `3200×3200` crop filenames only beneath a temporary output root, and that `--check` detects a
stale review artifact without writing. The test must prove the public runtime directory is never a
target. Test baseline and candidate output names separately and prove baseline mode never overwrites
candidate evidence. Pin the full `MEADOW_ENTRY_PAINTED_V2_ENRICHMENT_REVIEW_FILENAMES` list and
prove `--source-review` writes no unlisted file.

Use literal assertions:

```ts
expect(summary).toMatchObject({
  tileSizePx: 512,
  qualifyingTileCount: 67,
  sheetTileCounts: [16, 16, 16, 16, 3],
  candidateMinimumFloor: 1.5,
  candidateMedianFloor: 3.1843126049067515
});
```

- [ ] **Step 3: Run focused RED**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts
rtk bun test tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
```

Expected: FAIL on the private margins export and missing review module/tool.

- [ ] **Step 4: Implement the pure eligibility contract**

The core module accepts decoded alpha masks and terrain rectangles. The CLI obtains those inputs by
calling `renderMeadowEntryControls(buildMeadowEntryControlInputs())`, rasterizing the five exact
subtraction SVGs with Sharp, and parsing only the renderer's deterministic terrain `<rect>` rows.
It records the SVG hashes, parser policy, source rectangle bounds, and margin object in metadata.

The eligible predicate is:

```ts
insideCropUnion &&
!protectedLive &&
!buildingFootprint &&
!entranceTransition &&
!rewardDiscovery &&
!semanticAnchor &&
!derivedRouteCore
```

Do not add the derived route-core raster to `MEADOW_ENTRY_CONTROL_FILENAMES`, the approval module,
or the combined control fingerprint.

- [ ] **Step 5: Implement exact tile and energy measurement**

For each world-aligned `512×512` tile, clip to the two-crop union, count eligible pixels, and retain
the row only when `eligiblePixels / cropUnionPixels >= 0.5`. For each retained row, collect
rightward and downward neighbor steps only when both pixels are eligible:

```ts
rgbStep = (
  Math.abs(firstR - secondR) +
  Math.abs(firstG - secondG) +
  Math.abs(firstB - secondB)
) / 3;
```

The candidate assertion requires all 67 rows, minimum `>= 1.5`, and median
`>= 3.1843126049067515`. It does not score semantic richness or approve a candidate.

- [ ] **Step 6: Pin the rejected-master baseline before generation**

Run the tool against the current checked-in master:

```bash
rtk bun tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  --mode baseline \
  --master artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png \
  --output-root docs/superpowers/reports/img/hpa-586-painted-v2-enrichment
rtk bun tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  --mode baseline \
  --master artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png \
  --output-root docs/superpowers/reports/img/hpa-586-painted-v2-enrichment \
  --check
```

Pin the exact 67 rows, their bounds and counts, baseline minimum
`1.5571045952962603`, and baseline median `2.8948296408243195`. The baseline is descriptive and may
fall below the candidate median floor; `--check` validates reproducibility rather than treating the
rejected master as a candidate pass.

- [ ] **Step 7: Run GREEN and verify controls are unchanged**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-controls.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts
rtk bun test tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk bun tools/export-meadow-entry-art-controls.ts --check
rtk bun tools/approve-meadow-entry-controls.ts --check
rtk bun run check
rtk bunx prettier --check \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts \
  docs/superpowers/reports/img/hpa-586-painted-v2-enrichment/decoration-baseline.json \
  docs/superpowers/reports/2026-08-13-meadow-entry-painted-enrichment-baseline.md
rtk bunx eslint \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk git diff --check
```

Assert the controls fingerprint and every checked-in control byte remain unchanged.

- [ ] **Step 8: Commit Task 2**

```bash
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts \
  docs/superpowers/reports/img/hpa-586-painted-v2-enrichment/decoration-baseline.json \
  docs/superpowers/reports/2026-08-13-meadow-entry-painted-enrichment-baseline.md
rtk git commit -m "test(art): seal Meadow enrichment review"
```

---

### Task 3: Generate the first six sources and obtain the interim approval

**Files:**
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-sundrop-north.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-north.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-north.json`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-sundrop-south.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-south.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-south.json`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-north.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.json`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-south.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.json`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/raw/sundrop-north.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/sundrop-north.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/sundrop-north.json`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/raw/sundrop-south.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/sundrop-south.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/sundrop-south.json`
- Modify: `artifacts/meadow-entry/painted-v2/provenance.json`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts`
- Create/replace: interim evidence under
  `docs/superpowers/reports/img/hpa-586-painted-v2-enrichment/`
- Report: `.superpowers/sdd/2026-08-13-meadow-entry-painted-pilot-enrichment-handoff/task-3-report.md` (ignored)

**Interfaces:**
- Generates exactly six distinct raw candidates and six normalized canonical panel files.
- Keeps the current pinned Hero House, connector, and Crossroads bytes for the interim assembly.
- The review tool writes a temporary master and two temporary crops outside tracked publication
  roots. It may serve those temporary crops for one review-only browser capture, but it must not
  rewrite `public/game/assets/regions/meadow-entry-painted-v2/`.
- Stops `NEEDS_CONTEXT` before staging or committing until the user approves the complete interim
  evidence.

- [ ] **Step 1: Capture genuine hash/provenance RED**

Change the source-panel test to expect the six old normalized hashes to be superseded while keeping
all geometry and Hero House exact. Run:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts
```

Expected: FAIL because current manifests still contain the accepted prior attempts and hashes.

- [ ] **Step 2: Prepare safe generation references**

Create temporary per-panel packs from:

- the approved concept and region palette;
- actual neighboring source pixels;
- route geometry and material ownership;
- softly annotated clearance information derived from the existing masks.

Do not provide a high-contrast rectangular control atlas as literal scenery. Record every temporary
reference path and SHA-256 before generation, and remove temporary raster references only after
their hashes are persisted.

- [ ] **Step 3: Generate four underlays in four distinct calls**

Use the built-in image-generation tool in this order:

1. `camera-underlay-sundrop-north`;
2. `camera-underlay-sundrop-south`, with the accepted north `3200×128` overlap;
3. `camera-underlay-crossroads-north`;
4. `camera-underlay-crossroads-south`, with the accepted north `3200×128` overlap.

The prompts require opaque top-down ground, region-correct microdetail, quiet route cores, no
buildings/live props/labels/tall objects, no repeated grid, no rectangular pad, and no baked
collision cue. Inspect every raw output at original detail before normalization. Reject any raw
candidate with a macro rectangle, repeated stamp field, wrong biome, seam, false obstacle, or broad
empty eligible ground.

- [ ] **Step 4: Generate the Sundrop detail pair in two distinct calls**

Generate `sundrop-north` first. Generate `sundrop-south` only after north passes, and include the
accepted north panel's actual `2624×128` overlap. Require continuous path centerline/width, light,
grass density, brush scale, and region texture.

Every accepted source records its prior accepted attempt as superseded with old hashes and the
user-rejection reason, plus its new prompt, references, output path/hash, and attempt number.

- [ ] **Step 5: Normalize without cleanup**

Use `normalizeMeadowEntryMasterCandidate` with one exact uniform cover scale/crop per source.
Require:

```ts
expect(transform.scaleX).toBe(transform.scaleY);
expect(transform.scale).toBeLessThanOrEqual(2);
expect(decoded).toMatchObject(panel.expectedDimensions);
expect(alphaMinimum).toBe(255);
expect(validateCanonicalPngChunks(bytes)).not.toThrow();
expect(manifest.cleanup).toEqual({
  operationCount: 0,
  operations: [],
  beforeSha256: normalizedSha256,
  afterSha256: normalizedSha256
});
```

Do not run any deterministic cleanup or semantic-pad flattening. Regenerate instead.

- [ ] **Step 6: Build the interim temporary assembly and evidence**

Use the enrichment review tool against the six working-tree candidates plus the pinned current
Hero House, connector, and Crossroads panels. Write only to a fresh temporary root. Produce:

- temporary master and both `3200×3200` crops;
- all four Sundrop pair sides and all four corners at native resolution;
- west/center/east enlarged Sundrop intersection crops;
- all four Hero House edges against regenerated Sundrop south;
- both underlay north/south seams and the family handoff;
- protected/live and region/route overlays separate from clean art;
- five numbered 67-tile contact sheets;
- one normal Sundrop browser capture at `1920×1080`, DPR 1, zoom 1.

Run the review assembly first:

```bash
MEADOW_ENRICHMENT_REVIEW_ROOT="$(rtk mktemp -d /private/tmp/gliese-meadow-enrichment-interim.XXXXXX)"
rtk bun tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  --assemble-sources \
  --output-root "$MEADOW_ENRICHMENT_REVIEW_ROOT"
```

The browser capture must intercept only the two painted runtime PNG requests with the corresponding
temporary crop bytes in a fresh review session. It must not modify the checked-in public runtime
PNGs, generated runtime descriptors, or approval module.

- [ ] **Step 7: Run objective and human interim gates**

```bash
rtk bun tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  --mode candidate \
  --contact-sheets \
  --source-review \
  --master "$MEADOW_ENRICHMENT_REVIEW_ROOT/masters/meadow-entry-painted-v2-pilot-base-master.png" \
  --output-root "$MEADOW_ENRICHMENT_REVIEW_ROOT/review"
rtk bun tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  --mode candidate \
  --contact-sheets \
  --source-review \
  --master "$MEADOW_ENRICHMENT_REVIEW_ROOT/masters/meadow-entry-painted-v2-pilot-base-master.png" \
  --output-root "$MEADOW_ENRICHMENT_REVIEW_ROOT/review" \
  --check
```

Record the resulting `MEADOW_ENRICHMENT_REVIEW_ROOT` path in the task report. Require all 67 energy
rows to pass. At native detail, identify at least two distinct microdetail cluster types in every
qualifying tile. If one source is corrected, rerender its intersecting tiles and seam evidence; run
the full 67-tile pass again on the promoted interim set.

- [ ] **Step 8: Present the interim user gate**

Show the normal browser capture, complete Sundrop pair, Hero House edges, density sheets, and clean
underlay seams. State exact scale factors and any concerns. Stop `NEEDS_CONTEXT` with no staging,
commit, seventh/eighth image-generation call, finalizer publication, or texture probe.

- [ ] **Step 9: Record approval and run post-gate checks**

Only after explicit approval, add the exact UTC-second verdict to the six manifests, root
provenance, and ignored report. Then run:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts
rtk bun test tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk bun run art:storage:meadow-entry
rtk git lfs fsck
rtk bun run check
rtk bunx prettier --check \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-*.json \
  artifacts/meadow-entry/painted-v2/source-panels/sundrop-*.json \
  artifacts/meadow-entry/painted-v2/provenance.json
rtk bunx eslint src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts
rtk git diff --check
```

- [ ] **Step 10: Commit Task 3 after approval**

Stage the exact six raw/normalized/manifest triples, root provenance, the test update, and only the
accepted interim review images. Do not stage the temporary master/crops or rejected Task 8 evidence.

```bash
rtk git add \
  artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-sundrop-north.png \
  artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-north.png \
  artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-north.json \
  artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-sundrop-south.png \
  artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-south.png \
  artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-south.json \
  artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-north.png \
  artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.png \
  artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.json \
  artifacts/meadow-entry/painted-v2/source-panels/raw/camera-underlay-crossroads-south.png \
  artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.png \
  artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.json \
  artifacts/meadow-entry/painted-v2/source-panels/raw/sundrop-north.png \
  artifacts/meadow-entry/painted-v2/source-panels/sundrop-north.png \
  artifacts/meadow-entry/painted-v2/source-panels/sundrop-north.json \
  artifacts/meadow-entry/painted-v2/source-panels/raw/sundrop-south.png \
  artifacts/meadow-entry/painted-v2/source-panels/sundrop-south.png \
  artifacts/meadow-entry/painted-v2/source-panels/sundrop-south.json \
  artifacts/meadow-entry/painted-v2/provenance.json \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  docs/superpowers/reports/img/hpa-586-painted-v2-enrichment
rtk git commit -m "art(world): enrich Meadow Sundrop terrain"
```

---

### Task 4: Generate the connector/Crossroads pair and obtain final source approval

**Files:**
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/raw/village-crossroads-connector.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/village-crossroads-connector.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/village-crossroads-connector.json`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/raw/crossroads.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/crossroads.png`
- Replace: `artifacts/meadow-entry/painted-v2/source-panels/crossroads.json`
- Modify: `artifacts/meadow-entry/painted-v2/provenance.json`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts`
- Replace/add: final source evidence under
  `docs/superpowers/reports/img/hpa-586-painted-v2-enrichment/`
- Create: `docs/superpowers/reports/2026-08-13-meadow-entry-painted-enrichment-source-review.md`
- Report: `.superpowers/sdd/2026-08-13-meadow-entry-painted-pilot-enrichment-handoff/task-4-report.md` (ignored)

**Interfaces:**
- Generates the seventh and eighth distinct source calls only after Task 3 approval.
- Produces one complete eight-source temporary assembly and the full source-art approval inventory.
- Stops `NEEDS_CONTEXT` before staging or final master publication until the user explicitly
  approves the final source set.

- [ ] **Step 1: Write the final two-hash RED**

Update the literal source inventory to expect replacement connector/Crossroads hashes while keeping
all paths, dimensions, priorities, and the Hero House hash exact. Run the focused source/provenance
tests and record the expected two failures.

- [ ] **Step 2: Generate connector, then Crossroads**

Generate `village-crossroads-connector` with the accepted underlay family handoff, Sundrop detail,
route geometry, and material palette. Inspect it at native detail before proceeding.

Generate `crossroads` only after connector passes. Its references must contain the accepted
connector's actual `512×288` overlap plus adjacent underlay pixels. Require one continuous
east-west path centerline/width and a gradual packed-earth → mixed dirt/gravel → cobble transition.
Reject a straight value line, rectangular island, abrupt flower/grass cutoff, brush-scale change,
blur mismatch, or false obstacle.

- [ ] **Step 3: Normalize and bind provenance**

Apply the same no-cleanup, `<=2×`, canonical opaque RGBA contract as Task 3. Record independent
attempt histories; do not reuse a Task 3 approval timestamp or infer approval for these two pixels.

- [ ] **Step 4: Build the complete temporary source gate**

Using all eight new sources plus pinned Hero House, produce the complete design evidence:

- eight full panels and five native crops per panel;
- both underlay `128px` intersections and the `832px` family handoff;
- complete Sundrop pair plus west/center/east and all sides/corners;
- complete connector/Crossroads pair plus west/middle/east and all sides/corners;
- all four pinned Hero House edges;
- protected/live atlas;
- five numbered density sheets covering all 67 tiles;
- region/material and route-centerline overlays separate from clean art.

Build and measure the final review-only assembly with concrete temporary and tracked review roots:

```bash
MEADOW_FINAL_SOURCE_REVIEW_ROOT="$(rtk mktemp -d /private/tmp/gliese-meadow-enrichment-final.XXXXXX)"
rtk bun tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  --assemble-sources \
  --output-root "$MEADOW_FINAL_SOURCE_REVIEW_ROOT"
rtk bun tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  --mode candidate \
  --contact-sheets \
  --source-review \
  --master "$MEADOW_FINAL_SOURCE_REVIEW_ROOT/masters/meadow-entry-painted-v2-pilot-base-master.png" \
  --output-root docs/superpowers/reports/img/hpa-586-painted-v2-enrichment
rtk bun tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  --mode candidate \
  --contact-sheets \
  --source-review \
  --master "$MEADOW_FINAL_SOURCE_REVIEW_ROOT/masters/meadow-entry-painted-v2-pilot-base-master.png" \
  --output-root docs/superpowers/reports/img/hpa-586-painted-v2-enrichment \
  --check
```

Run the objective floors and the complete 67-tile human review. A corrected source reruns affected
tiles/seams, followed by one final complete 67-tile pass.

- [ ] **Step 5: Present the final source-art user gate**

Show the two paired-detail handoffs, representative density sheets, Hero House perimeter, and
protected-clearance evidence. Record explicit approve/reject and requested changes. Stop without
staging, committing, activating pair correction in the production finalizer, or publishing the
master if the verdict is not approval.

- [ ] **Step 6: Record approval and run focused GREEN**

After approval, bind the exact UTC-second verdict to both manifests, root provenance, source review,
and ignored task report. Run:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts
rtk bun test tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk bun run art:storage:meadow-entry
rtk git lfs fsck
rtk bun run check
rtk bunx prettier --check \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  artifacts/meadow-entry/painted-v2/source-panels/village-crossroads-connector.json \
  artifacts/meadow-entry/painted-v2/source-panels/crossroads.json \
  artifacts/meadow-entry/painted-v2/provenance.json \
  docs/superpowers/reports/2026-08-13-meadow-entry-painted-enrichment-source-review.md
rtk bunx eslint src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts
rtk git diff --check
```

- [ ] **Step 7: Commit Task 4 after approval**

```bash
rtk git add \
  artifacts/meadow-entry/painted-v2/source-panels/raw/village-crossroads-connector.png \
  artifacts/meadow-entry/painted-v2/source-panels/village-crossroads-connector.png \
  artifacts/meadow-entry/painted-v2/source-panels/village-crossroads-connector.json \
  artifacts/meadow-entry/painted-v2/source-panels/raw/crossroads.png \
  artifacts/meadow-entry/painted-v2/source-panels/crossroads.png \
  artifacts/meadow-entry/painted-v2/source-panels/crossroads.json \
  artifacts/meadow-entry/painted-v2/provenance.json \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  docs/superpowers/reports/img/hpa-586-painted-v2-enrichment \
  docs/superpowers/reports/2026-08-13-meadow-entry-painted-enrichment-source-review.md
rtk git commit -m "art(world): enrich Meadow connector handoff"
```

---

### Task 5: Integrate pair correction and assemble the enriched master

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-master-provenance.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts`
- Modify: `tools/finalize-meadow-entry-painted-v2-pilot.ts`
- Regenerate: `artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png`
- Regenerate: `artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json`
- Modify: `artifacts/meadow-entry/painted-v2/provenance.json`
- Report: `.superpowers/sdd/2026-08-13-meadow-entry-painted-pilot-enrichment-handoff/task-5-report.md` (ignored)

**Interfaces:**
- Keeps `assembleMeadowEntryPaintedV2Pilot(input)` as the sealed public entry point.
- Replaces the finalizer's local detail loop with the already-tested pure
  `compositeMeadowEntryDetailPanels` helper; it does not duplicate pair ordering.
- Records exact pair rows and formulas in assembly provenance; direction and last index are derived
  review values, not duplicated configuration.
- Removes only the fixed historical hard-copy master hash and stale absolute Hero metric literals.
- Keeps relative boundary reduction and p95 gates blocking.

- [ ] **Step 1: Write finalizer integration RED**

Against a synthetic sealed registry, assert the order:

```text
sundrop-north ordinary
sundrop-south ordinary
sundrop pair correction
hero-house-frontage ordinary
village-crossroads-connector ordinary
crossroads ordinary
connector/Crossroads pair correction
```

Assert the third connector/Sundrop overlap receives only ordinary priority behavior. Assert a stale
pair row, swapped order, missing second member, wrong formula, or absent source hash fails.

- [ ] **Step 2: Write fresh boundary acceptance RED**

Build both a fresh hard-copy comparison and the corrected master from the current accepted bytes.
For every visible detail perimeter require:

```ts
expect(correctedExcess).toBeLessThanOrEqual(freshHardCopyExcess * 0.25);
if (comparisonP95 === 0) expect(edgeP95).toBe(0);
else expect(edgeP95 / comparisonP95).toBeLessThanOrEqual(1.30);
```

Measure all four sides of both pair rectangles explicitly, without later-priority filtering, and
assert each correction-edge pixel is byte-identical before/after correction. Measure all four Hero
House edges and assert the normalized source hash remains pinned.

Expected RED: current finalizer performs only ordinary detail compositing and provenance has no
pair formulas.

- [ ] **Step 3: Integrate correction at the owning priority seam**

Build the decoded detail-panel records from the sealed registry and pass them, with
`MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS`, to `compositeMeadowEntryDetailPanels`. Do not retain a second
local finalizer loop, clone the master, or reorder later panels.

- [ ] **Step 4: Make provenance self-describing**

Record exact rows and exact strings:

```json
{
  "axisPair": "floor((first*(lastIndex-index)+second*index+floor(lastIndex/2))/lastIndex)",
  "correctionLastInsetIndex": "min(127,floor((min(intersectionWidth,intersectionHeight)-1)/2))",
  "correctionEdgeDistance": "min(x-left,right-1-x,y-top,bottom-1-y)",
  "correctionWeight": "meadowEntryDetailFeatherWeight(correctionEdgeDistance,correctionLastInsetIndex)",
  "out": "blendMeadowEntryDetailChannel(ordinaryComposite,axisPair,correctionWeight)"
}
```

Continue binding all nine normalized source hashes. Set source policy to replacement-approved rather
than the stale blanket `immutable` label; keep Hero House specifically byte-pinned.

- [ ] **Step 5: Run focused RED, implement, then GREEN**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts
```

Record the initial pair-correction failures, implement Steps 3–4, and rerun until all pass.

- [ ] **Step 6: Regenerate and inspect the master**

```bash
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
```

Assert exact alpha counts remain `18_616_320` opaque / `22_343_680` transparent and runtime crops
remain fully opaque. Inspect the complete Sundrop and connector/Crossroads intersections, all four
sides/corners, Hero House, main street, connector, and Waystone at original detail. Numeric GREEN
cannot override a visible seam, rectangular correction island, wash, or loss of core detail.

- [ ] **Step 7: Run final Task 5 verification**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
rtk bun run check
rtk bunx prettier --check \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts \
  tools/finalize-meadow-entry-painted-v2-pilot.ts \
  artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json \
  artifacts/meadow-entry/painted-v2/provenance.json
rtk bunx eslint \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts \
  tools/finalize-meadow-entry-painted-v2-pilot.ts
rtk git diff --check
```

- [ ] **Step 8: Commit Task 5**

```bash
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts \
  tools/finalize-meadow-entry-painted-v2-pilot.ts \
  artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png \
  artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json \
  artifacts/meadow-entry/painted-v2/provenance.json
rtk git commit -m "feat(art): assemble enriched Meadow master"
```

---

### Task 6: Republish exports, proofs, approval, and runtime bytes

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts`
- Verify unchanged: `tools/export-meadow-entry-regions.ts`
- Modify: `tools/render-meadow-entry-art-proofs.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts`
- Verify unchanged: `src/lib/game/content/backgrounds/meadow-entry-proof-renderer.ts`
- Verify unchanged: `tools/approve-meadow-entry-art-package.ts`
- Verify unchanged: `tools/generate-meadow-entry-runtime.ts`
- Verify unchanged: `src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts`
- Verify unchanged: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-export-integration.test.ts`
- Verify unchanged: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts`
- Verify unchanged: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts`
- Conditional measured-budget branch only: modify
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.ts` and its test;
  regenerate controls, generated control module, and controls approval.
- Regenerate: `artifacts/meadow-entry/painted-v2/exports/`
- Regenerate: `public/game/assets/regions/meadow-entry-painted-v2/`
- Regenerate: `artifacts/meadow-entry/painted-v2/proofs/` except historical representative probe evidence
- Regenerate: `artifacts/meadow-entry/painted-v2/provenance/`
- Regenerate: `src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts`
- Regenerate: `src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts`
- Report: `.superpowers/sdd/2026-08-13-meadow-entry-painted-pilot-enrichment-handoff/task-6-report.md` (ignored)

**Interfaces:**
- Publishes the same exact two export/runtime filenames and one overlap.
- Keeps the same ten proof IDs; every proof PNG/JSON pair binds the current master, current controls,
  crop manifest, and all nine source hashes.
- Preserves the five checked-in texture files below byte-for-byte while atomically replacing the
  ten active proof pairs; every other unexpected proof-root path remains a failure:

  ```text
  texture-probe/browser-1600.json
  texture-probe/browser-3200.json
  texture-probe/browser-camera-safe-pilot.json
  texture-probe/representative-1600.png
  texture-probe/representative-3200.png
  ```
- Measures encoded bytes in a temporary root before deciding whether review budgets change.
- Keeps hard limits `32 MiB` per crop and `64 MiB` aggregate.
- Generates exact approval and runtime descriptor inventories from the replacement package.

- [ ] **Step 1: Write stale-byte and historical-proof preservation RED tests**

Change the literal approval artifact expectation to the Task 5 master and nine source hashes while
leaving the checked-in approval module unchanged. Run the ten focused publication files. Expected:
the approval artifact test fails on the stale approved package; every structural export/proof/
runtime test remains green with the same crop IDs, geometry, overlap pixels, and descriptor rows.

Add a command-level proof publisher test with an allowlisted historical
`texture-probe/representative-3200.png` sentinel. Assert publication preserves its bytes and path,
pin the exact five-path preservation inventory, assert active `--check` compares exactly the ten
proof pairs plus those five paths, and require any sixth texture-probe or other extra path to fail.
Expected RED: the current root-swap publisher deletes the sentinel and the current inventory
checker rejects the restored paths.

- [ ] **Step 2: Measure exports in a temporary root**

```bash
MEADOW_EXPORT_REVIEW_ROOT="$(rtk mktemp -d /private/tmp/gliese-meadow-enrichment-export.XXXXXX)"
rtk bun tools/export-meadow-entry-regions.ts \
  --output-root "$MEADOW_EXPORT_REVIEW_ROOT/painted-v2"
```

Record the actual temporary path and verification JSON. Require two exports, one overlap,
`1_863_680` overlap pixels compared, zero difference, and aggregate encoded bytes under `64 MiB`.

If both measured bytes remain under current literal review ceilings, leave the crop manifest and
controls unchanged. If either exceeds only its review ceiling while remaining below the hard cap,
write a literal measured-budget RED, update only the affected review ceiling, regenerate/reapprove
controls, and rerun the finalizer so provenance binds the new fingerprint. Never raise a hard cap.

- [ ] **Step 3: Publish exports and ten proofs**

```bash
rtk bun tools/export-meadow-entry-regions.ts
rtk bun tools/export-meadow-entry-regions.ts --check
rtk bun tools/render-meadow-entry-art-proofs.ts
rtk bun tools/render-meadow-entry-art-proofs.ts --check
```

Inspect all ten proof PNGs at original detail. Confirm the master-transparency sidecar has the same
universal input binding as the other proofs and that no historical representative probe file was
rewritten. Compare all five existing texture-probe hashes before and after publication.

- [ ] **Step 4: Publish package approval and runtime data**

Capture a UTC-second timestamp, then run the existing explicit interfaces:

```bash
MEADOW_PACKAGE_REVIEWED_AT="$(rtk date -u '+%Y-%m-%dT%H:%M:%SZ')"
rtk bun tools/approve-meadow-entry-art-package.ts \
  --reviewed-by chanwaichan \
  --reviewed-at "$MEADOW_PACKAGE_REVIEWED_AT"
rtk bun tools/approve-meadow-entry-art-package.ts --check
rtk bun tools/generate-meadow-entry-runtime.ts
rtk bun tools/generate-meadow-entry-runtime.ts --check
```

Replace the literal approval artifact expectation with the complete reviewed object. Assert each
public runtime PNG equals its export byte-for-byte and generated descriptor IDs, paths, centers,
dimensions, draw orders, selection, and ownership rows remain structurally unchanged.

- [ ] **Step 5: Run focused GREEN and every writer check**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-export-integration.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-controls-approval.test.ts \
  src/lib/game/content/meadow-entry-controls-approval-tool.test.ts
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
rtk bun tools/export-meadow-entry-art-controls.ts --check
rtk bun tools/approve-meadow-entry-controls.ts --check
rtk bun tools/export-meadow-entry-regions.ts --check
rtk bun tools/render-meadow-entry-art-proofs.ts --check
rtk bun tools/approve-meadow-entry-art-package.ts --check
rtk bun tools/generate-meadow-entry-runtime.ts --check
rtk bun run art:storage:meadow-entry
rtk git lfs fsck
rtk bun run check
rtk git diff --check
```

Capture status before and after all `--check` commands and require no tracked mutation.

- [ ] **Step 6: Commit Task 6**

Stage only files that actually changed. Do not stage unchanged tools merely because they appear in
the review inventory.

```bash
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
  tools/render-meadow-entry-art-proofs.ts \
  src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts \
  artifacts/meadow-entry/painted-v2/exports \
  artifacts/meadow-entry/painted-v2/proofs \
  artifacts/meadow-entry/painted-v2/provenance \
  public/game/assets/regions/meadow-entry-painted-v2
rtk git commit -m "feat(art): publish enriched Meadow package"
```

If and only if the measured-budget branch ran, separately add the crop manifest/test, regenerated
controls, generated control module, controls approval, and controls report. Before committing,
inspect `rtk git diff --cached --name-status`; no verify-unchanged tool or test may appear without a
newly captured RED proving an implementation defect.

---

### Task 7: Rerun the exact texture and real-input runtime gates

**Files:**
- Modify: `tools/probe-meadow-entry-texture-safety.ts`
- Modify: `tools/probe-meadow-entry-texture-safety.test.ts`
- Replace: `artifacts/meadow-entry/painted-v2/proofs/texture-probe/browser-camera-safe-pilot.json`
- Modify: `docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-texture-preflight.md`
- Verify without expected edits: `tests/e2e/game.e2e.ts`
- Modify: `docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-browser.md`
- Report: `.superpowers/sdd/2026-08-13-meadow-entry-painted-pilot-enrichment-handoff/task-7-report.md` (ignored)

**Interfaces:**
- Updates only the two encoded byte/hash literals for existing candidate
  `painted-v2-camera-safe-pilot`.
- Reruns that exact candidate once. No new candidate, representative derivation, upload retry, or
  context-loss exception is added.
- Reruns the existing two painted-pilot Playwright titles at `1920×1080`, DPR 1 with unchanged
  runtime IDs, geometry, route, fallback, and camera coverage assertions.

- [ ] **Step 1: Write exact hash/byte RED**

Update the candidate test with Task 6 approval values before changing the tool constants:

```ts
expect(candidate.assets).toEqual([
  {
    id: 'sundrop-camera-base',
    path: 'artifacts/meadow-entry/painted-v2/exports/painted-v2-sundrop-camera-base.png',
    width: 3200,
    height: 3200,
    encodedBytes: approvedSundropBytes,
    encodedSha256: approvedSundropSha256
  },
  {
    id: 'crossroads-camera-base',
    path: 'artifacts/meadow-entry/painted-v2/exports/painted-v2-crossroads-camera-base.png',
    width: 3200,
    height: 3200,
    encodedBytes: approvedCrossroadsBytes,
    encodedSha256: approvedCrossroadsSha256
  }
]);
```

Run `rtk bun test tools/probe-meadow-entry-texture-safety.test.ts`; expected RED is only stale
candidate bytes/hashes.

- [ ] **Step 2: Update the existing candidate and run static probe tests**

Change the two literals only. Run:

```bash
rtk bun test tools/probe-meadow-entry-texture-safety.test.ts
rtk bun run test:unit -- --run \
  src/lib/game/content/meadow-entry-texture-safety-probe-orchestration.test.ts \
  src/lib/game/content/meadow-entry-texture-safety-probe-unit.test.ts \
  src/lib/game/content/meadow-entry-texture-safety-probe.test.ts
```

- [ ] **Step 3: Run the real browser probe exactly once**

```bash
rtk bun tools/probe-meadow-entry-texture-safety.ts \
  --candidate painted-v2-camera-safe-pilot
```

One setup-only loopback sandbox failure permits one narrow localhost escalation. Acceptance requires
2/2 uploads, 2 retained, exact dimensions/hashes/bytes, `contextLost=false`, and no WebGL error.
Any real upload, retention, context, or WebGL failure writes `stop`, leaves Task 7 uncommitted, and
returns `NEEDS_CONTEXT`.

- [ ] **Step 4: Run the existing real-input E2E gates unchanged**

```bash
rtk bun run test:e2e -- --grep "Meadow painted pilot selects only approved planes and preserves live fallbacks"
rtk bun run test:e2e -- --grep "Meadow painted pilot preserves the village Crossroads gameplay loop"
rtk bun run test:e2e -- --grep "Meadow painted pilot" --repeat-each=2
```

Set the viewport through the existing test contract. Require every sampled exterior token to remain
inside the unchanged crop union. A route failure is diagnosed as its own issue; do not tune
waypoints, tolerances, collision, or retries merely to make the art revision pass.

- [ ] **Step 5: Update truthful reports and run checks**

Record browser engine/version/renderer, maximum texture size, per-upload and total durations,
encoded/decoded aggregate, context status, decision, E2E counts/timings, and unchanged camera
coverage. Then run:

```bash
rtk bun run check
rtk bunx prettier --check \
  tools/probe-meadow-entry-texture-safety.ts \
  tools/probe-meadow-entry-texture-safety.test.ts \
  artifacts/meadow-entry/painted-v2/proofs/texture-probe/browser-camera-safe-pilot.json \
  docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-texture-preflight.md \
  docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-browser.md
rtk bunx eslint \
  tools/probe-meadow-entry-texture-safety.ts \
  tools/probe-meadow-entry-texture-safety.test.ts
rtk git lfs fsck
rtk git diff --check
```

- [ ] **Step 6: Commit Task 7 only on probe `proceed` and E2E GREEN**

```bash
rtk git add \
  tools/probe-meadow-entry-texture-safety.ts \
  tools/probe-meadow-entry-texture-safety.test.ts \
  artifacts/meadow-entry/painted-v2/proofs/texture-probe/browser-camera-safe-pilot.json \
  docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-texture-preflight.md \
  docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-browser.md
rtk git commit -m "test(art): verify enriched Meadow textures"
```

If E2E source did not change, do not stage it.

---

### Task 8: Replace the rejected visual evidence and obtain final approval

**Files:**
- Replace: `docs/superpowers/reports/img/hpa-586-painted-v2-pilot/hero-house-frontage.png`
- Replace: `docs/superpowers/reports/img/hpa-586-painted-v2-pilot/sundrop-main-street.png`
- Replace: `docs/superpowers/reports/img/hpa-586-painted-v2-pilot/connector-village-mouth.png`
- Replace: `docs/superpowers/reports/img/hpa-586-painted-v2-pilot/connector-midpoint.png`
- Replace: `docs/superpowers/reports/img/hpa-586-painted-v2-pilot/connector-crossroads-mouth.png`
- Replace: `docs/superpowers/reports/img/hpa-586-painted-v2-pilot/crossroads-waystone.png`
- Replace: `docs/superpowers/reports/img/hpa-586-painted-v2-pilot/collision-boundary.png`
- Replace: `docs/superpowers/reports/img/hpa-586-painted-v2-pilot/fallback-matched-camera.png`
- Replace: `docs/superpowers/reports/img/hpa-586-painted-v2-pilot/missing-plane-fallback.png`
- Replace: `docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-visual-review.md`
- Add/replace: native handoff evidence under
  `docs/superpowers/reports/img/hpa-586-painted-v2-enrichment/`
- Report: `.superpowers/sdd/2026-08-13-meadow-entry-painted-pilot-enrichment-handoff/task-8-report.md` (ignored)

**Interfaces:**
- Produces nine exact `1920×1080`, DPR-1, zoom-1 browser captures with the existing review bar.
- Preserves hashes of the rejected set as superseded evidence before replacement.
- Adds native-detail paired handoff crops to the report.
- Requires explicit user approval before commit or cumulative Task 9 work.

- [ ] **Step 1: Audit and clean only known transients**

Record hashes of the current rejected report and nine PNGs. Verify `.playwright-cli/` and `output/`
contain only generated session/transient files before removing those exact roots. Do not remove or
overwrite the rejected nine images until accepted replacements have been captured.

- [ ] **Step 2: Build and launch a fresh named headed session**

```bash
rtk bun run build
```

Start preview at `127.0.0.1:4173`, then use the Playwright workflow in a new named headed session.
Verify viewport `1920×1080`, DPR 1, zoom 1, painted pilot enabled, visible canvas, and exact bar:

```text
HPA-586 • PAINTED PILOT • BROWSER • 100%
```

- [ ] **Step 3: Recapture the six normal positions**

Use the same seeds as the rejected review:

```text
Hero House: (704,5920)
Sundrop main street: (1472,4672)
connector village mouth: (2600,4688)
connector midpoint: (2200,4688)
connector Crossroads mouth: (3264,4688)
Crossroads Waystone: (3500,4100)
```

No debug overlay is allowed in normal images. Confirm live actors, landmark visuals, pickup,
discovery, collision ownership, and clear approaches remain present.

- [ ] **Step 4: Recapture the three diagnostics**

Capture collision-only debug at Waystone, matched pilot-off fallback, and one deliberate
missing/render-faulted crop. The two fallback images may show fallback tiles but must be labelled
truthfully; the six normal images may not.

- [ ] **Step 5: Inspect every image at original detail**

Reject on any source rectangle, pair-correction rectangle, material jump, double-darkening,
fallback exposure in normal mode, blur/stretch mismatch, repeated stamp field, false collision cue,
clearance ambiguity, debug overlay in normal mode, or incorrect review bar. Require the requested
richer regional microdetail to remain legible at runtime scale without competing with routes or live
objects.

- [ ] **Step 6: Present the final visual gate**

Show at least Hero House, Sundrop main street, connector village mouth, connector midpoint,
connector Crossroads mouth, Waystone, and native detail from both declared pairs. Record the user's
exact approve/reject verdict and UTC-second timestamp. Do not infer approval.

- [ ] **Step 7: Commit only accepted replacement evidence**

If rejected, stop `NEEDS_CONTEXT` with no evidence commit and no Task 9. If approved, update the
report with exact old/new hashes, dimensions, settings, source/package approvals, texture decision,
native-detail findings, and user verdict, then:

```bash
rtk git add \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/hero-house-frontage.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/sundrop-main-street.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/connector-village-mouth.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/connector-midpoint.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/connector-crossroads-mouth.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/crossroads-waystone.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/collision-boundary.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/fallback-matched-camera.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-pilot/missing-plane-fallback.png \
  docs/superpowers/reports/img/hpa-586-painted-v2-enrichment \
  docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-visual-review.md
rtk git commit -m "docs(art): approve enriched Meadow pilot"
```

---

### Task 9: Run cumulative gates and independent whole-branch review

**Files:**
- Create: `docs/superpowers/reports/2026-08-13-meadow-entry-painted-enrichment-validation.md`
- Verify: the exact range from approved design commit `72d93c6` through Task 8
- Report: `.superpowers/sdd/2026-08-13-meadow-entry-painted-pilot-enrichment-handoff/task-9-report.md` (ignored)

**Interfaces:**
- Produces a cumulative automated/art/browser/texture/native-boundary validation report.
- Produces an independent whole-branch review and scoped re-review before branch finishing.
- Proves the runtime/gameplay freeze, pinned Hero House, exact two-texture inventory, and replacement
  visual approval.

- [ ] **Step 1: Run every active writer in no-write mode**

Capture tracked status before and after:

```bash
rtk bun tools/export-meadow-entry-art-controls.ts --check
rtk bun tools/approve-meadow-entry-controls.ts --check
rtk bun tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  --mode candidate \
  --contact-sheets \
  --source-review \
  --master artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png \
  --output-root docs/superpowers/reports/img/hpa-586-painted-v2-enrichment \
  --check
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
rtk bun tools/export-meadow-entry-regions.ts --check
rtk bun tools/render-meadow-entry-art-proofs.ts --check
rtk bun tools/approve-meadow-entry-art-package.ts --check
rtk bun tools/generate-meadow-entry-runtime.ts --check
rtk bun run art:storage:meadow-entry
rtk git lfs fsck
```

Require every command to pass and status to remain identical.

- [ ] **Step 2: Run the complete focused art/runtime inventory**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-controls.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-controls-approval.test.ts \
  src/lib/game/content/meadow-entry-controls-approval-tool.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-camera-envelope.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts \
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
rtk bun test \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts \
  tools/probe-meadow-entry-texture-safety.test.ts
```

Record exact file/test counts.

- [ ] **Step 3: Run full repository gates**

```bash
rtk bun run test:unit -- --run
rtk bun run test:e2e
rtk bun run check
rtk bun run lint
rtk bun run build
rtk bun run build:tauri
rtk git diff --check
```

If whole lint fails, demonstrate it comes exclusively from preserved unrelated untracked evidence
and run targeted Prettier/ESLint over every changed text file. A source/test lint failure is
blocking. If a localhost collision occurs, stop the competing process and rerun once serially;
record both results without weakening tests.

- [ ] **Step 4: Audit exact artifact and runtime invariants**

Verify:

- eight replacement raw/normalized/provenance triples are present and LFS-correct;
- `hero-house-frontage` normalized SHA remains
  `9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b`;
- the two pair rows/formulas and all nine source hashes agree across registry, master provenance,
  root provenance, proofs, and package approval;
- alpha counts remain `18_616_320` opaque / `22_343_680` transparent;
- exactly two exports equal exactly two public runtime copies byte-for-byte;
- overlap difference is zero across `1_863_680` pixels;
- the 67-tile inventory and all candidate energy/human-review results are complete;
- controls fingerprint and two-crop manifest remain exact unless Task 6 documented a necessary
  review-budget-only reapproval;
- default Boot selection is zero, pilot selection is exactly two, and per-crop fallback ownership
  remains fail-closed;
- concept art and review-only masks are absent from runtime assets;
- no PR3/default activation or gameplay geometry change entered the range.

- [ ] **Step 5: Record native boundary honestly**

Run `rtk bun run build:tauri` and attempt packaged/Tauri launch only through configured tooling. Use
a configured companion MCP only if it is actually callable. If launch works but functional control
is unavailable, record build/window launch PASS and functional native diagnostics/walkthrough
BLOCKED. Do not touch the user's native save and do not substitute ad-hoc GUI automation.

- [ ] **Step 6: Request independent whole-branch review**

Review the exact `72d93c6..HEAD` implementation range for:

- approved design compliance and runtime freeze;
- shared axis-helper math, correction ordering, four-side equality, relative excess, and p95 gates;
- 67-tile eligibility/energy truthfulness and human evidence;
- Hero House byte pin and eight-source provenance histories;
- package/approval/proof/runtime inventory integrity;
- ownership, fallback, collision, texture, and E2E correctness;
- final visual quality and superseded-evidence truthfulness;
- KISS/YAGNI and absence of a new art/runtime framework.

Fix only concrete findings in separate RED/GREEN commits and request scoped re-review until no
actionable finding remains.

- [ ] **Step 7: Write and commit the cumulative validation report**

The report distinguishes unit/static, art no-write, storage/LFS, browser E2E, texture probe,
packaged launch, functional native, and explicit user visual evidence. It records all constraints
that remain out of scope.

```bash
rtk git add docs/superpowers/reports/2026-08-13-meadow-entry-painted-enrichment-validation.md
rtk git commit -m "docs(world): validate enriched Meadow pilot"
```

- [ ] **Step 8: Hand off branch finishing**

Require clean tracked status, accepted visual evidence, texture `proceed`, cumulative GREEN, and
independent whole-branch review PASS before invoking
`superpowers:finishing-a-development-branch`. The rejected pre-revision evidence may remain only as
explicitly superseded history; no unrelated untracked transient may be staged.
