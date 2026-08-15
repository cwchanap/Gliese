# Meadow Entry Painted Pilot Forest Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected sparse Meadow presentation candidate with richer ground detail and
natural forest depth baked only into ten already-blocked scenery belts, while preserving the
approved two-texture runtime, camera envelope, gameplay geometry, pinned Hero House source, and
all existing boundary-compositor contracts.

**Architecture:** Keep the completed pair compositor and exact 67-tile `groundAllowed` eligibility
contract as prerequisites. Before any image gate, Task 2 wires the production finalizer to the same
sealed pair-corrected priority stack already used by review assembly and proves parity in a
temporary root. One catalog-backed mask builder retains only five ground/scenery output masks plus
intermediate hashes. A pure preassembly bake tone-matches each package-owned hedge/woodland insert
to its owning source, derives organic clumps from insert luma, and multiplies that clump field by
the existing 15px edge envelope. Task 5 adds only this bake to the already-correct finalizer and
publishes the approved master. Publication continues to emit the same two opaque 3200×3200 runtime
textures.

**Tech Stack:** TypeScript, Vitest, Bun, Sharp, canonical RGBA/PNG helpers, built-in image
generation, Git LFS, Phaser 4, Playwright.

## Prerequisite and supersession state

- The approved design is
  `docs/superpowers/specs/2026-08-13-meadow-entry-painted-pilot-enrichment-handoff-design.md`.
- The completed compositor work from old Task 1 remains authoritative at commits `939ac71` and
  `a6593d7`.
- The completed exact 67-tile eligibility work from old Task 2 remains authoritative through
  commit `d374f3d`. It must not be changed to make generated art pass.
- The sealed ten-blocker/seven-insert table at `782f9aa` remains the row/bounds/priority authority,
  but its three insert paths are corrected in revised Task 2 to the approved `source-inserts/`
  locations.
- The scenery-bake commits `599d052` and `e16f408` are now the explicit RED baseline: they implement
  the rejected 15px-only overwrite and duplicate mask derivation. They are not a GREEN prerequisite
  for generation.
- The approved source checkpoint at `0caefd1` and the current unstaged source-only correction are
  superseded visual evidence. Preserve their hashes, histories, and review images, but do not stage,
  approve, or publish either assembled result.
- Tasks 3 through 9 in
  `docs/superpowers/plans/2026-08-13-meadow-entry-painted-pilot-enrichment-handoff.md` are
  superseded by this plan.
- The current uncommitted six-source candidate, its review images, and the rejected Task 8 browser
  evidence are comparison evidence only. Before replacing bytes, record their paths and hashes in
  the ignored continuation report. Never stage them as an approval.
- Create and maintain the ignored ledger at
  `.superpowers/sdd/2026-08-14-meadow-entry-painted-pilot-forest-enrichment/progress.md`. Record
  every RED, GREEN, image attempt, user gate, commit, and blocker without staging the ledger.

## Global Constraints

- Use `gliese-world-expansion` for source ownership and frozen gameplay integration,
  `2d-game-asset-workflow` for raster normalization/provenance/package handling, `imagegen` for
  every generated raster, `superpowers:test-driven-development` for code changes, and
  `superpowers:verification-before-completion` before every completion claim.
- Keep runtime crop geometry exact:
  - `painted-v2-sundrop-camera-base`: `(0,3200)–(3200,6400)`, `3200×3200`;
  - `painted-v2-crossroads-camera-base`: `(2368,2240)–(5568,5440)`, `3200×3200`.
- Keep exactly two opaque base textures, no foreground plane, no third runtime texture, no renderer
  branch, and no new public asset for scenery inserts.
- Keep painted mode opt-in through `?meadowPaintedPilot=on`. Default mode and
  `regionalBackground=off` continue to render fallback tiles.
- Freeze camera geometry at the approved `1920×1080`, DPR-1, zoom-1 envelope. Freeze collision,
  ownership, routes, transitions, actors, pickups, discoveries, encounters, saves, fallbacks, and
  all source-catalog geometry.
- Regenerate exactly these eight presentation IDs at their existing registry paths, bounds, roles,
  dimensions, and assembly priorities:
  `camera-underlay-sundrop-north`, `camera-underlay-sundrop-south`,
  `camera-underlay-crossroads-north`, `camera-underlay-crossroads-south`, `sundrop-north`,
  `sundrop-south`, `village-crossroads-connector`, and `crossroads`.
- Keep `hero-house-frontage` normalized SHA-256 byte-pinned at
  `9809baf80d939eee485ee0876d3e907e60e04a8185b774f1a14a418a9cd8205b`.
- Keep all nine `MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS` rows and both declared detail-pair rows
  unchanged. Inserts never become source-panel rows.
- Keep the same ten active proof IDs. Every proof PNG/JSON pair binds the final master, controls,
  crop manifest, all nine presentation sources, all seven insert triples, and the blocked-scenery
  bake provenance.
- Keep the exact 67 qualifying world-aligned `512×512` tiles, five sheets
  (`16 + 16 + 16 + 16 + 3`), RGB-step minimum `1.5`, and median floor
  `3.1843126049067515`. Do not truncate, guess, or add exclusions.
- Ground-detail panels remain ground-only: no baked tree or trunk on traversable Sundrop or
  connector terrain, no building, prop, actor, pickup, sign, landmark, transition, label, regular
  stamp grid, or false collision cue.
- Tree trunks, canopy interiors, and forest-bank depth are allowed only through the ten literal
  selected blocker rows. Hedge rows remain low brush/reeds and contain no trunks or canopy masses.
- `selectedBlockers` is the exact union of the ten rows. `otherProtected` rerenders the ownership
  catalog while omitting only those ten blocker IDs. Mask precedence is exact:

  ```text
  groundAllowed = cropUnion & !protectedLive & !building & !transition
                  & !rewardDiscovery & !semanticAnchor & !routeCore

  sceneryAllowed = cropUnion & selectedBlockers & !otherProtected & !building & !transition
                   & !rewardDiscovery & !semanticAnchor & !routeCore
  ```

- Reuse exported `MEADOW_ENTRY_PROTECTION_MARGINS`; do not duplicate its four values or add a
  control SVG. The art-only masks and their hashes do not enter the gameplay control fingerprint.
- Image-generation references are art-only. Do not provide control SVGs, mask rasters, rectangle
  atlases, blocked-scenery overlays, or route diagrams to image generation.
- Every presentation source and insert permits at most five attempts. Record each attempt and
  reason independently. Never weaken geometry, masks, energy floors, compositor formulas, or
  runtime contracts to accept an image.
- Use uniform scale plus deterministic center crop, no stretch, canonical opaque RGBA, and reject
  any input needing more than `2×` uniform upscaling.
- Do not stage unrelated dirty/rejected evidence. Before every commit, inspect
  `rtk git diff --cached --name-status` and compare it with the task inventory.

## Risks and Cost Controls

- `artifacts/meadow-entry/painted-v2/` is already approximately `672 MB` in the working tree,
  including approximately `107 MB` of source panels and `84 MB` of source inserts. Its PNGs are
  Git LFS objects, so every raw/normalized replacement and retained rejected attempt permanently
  grows repository history even when the working-tree path is overwritten.
- Do not make any image-generation call until the corrected compositor, class-specific structural
  metrics, five-mask memory contract, and production/review parity gate are independently GREEN.
  Re-evaluate preserved bytes first and regenerate only failing inputs.
- Preserve the maximum of five attempts per input. Do not add an attempt to compensate for a code,
  mask, metric, or assembly-path defect.
- Never prune or rewrite Git LFS history in this plan. Task 9 records starting and ending
  working-tree bytes plus the exact added/replaced LFS OIDs and sizes so a later revision decision
  sees its real storage cost.
- Task 2 intentionally leaves a staged non-publishable source state: the finalizer describes the
  pair-corrected master while checked-in package bytes remain frozen. Only Task 5 may close that
  state by publishing the user-approved scenery bake and master.

---

### Task 1: Verify the already-sealed blocked-scenery source contract

**Files:**
- Verify unchanged:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts`
- Verify unchanged:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts`
- Verify unchanged:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.ts`
- Verify unchanged:
  `src/lib/game/content/backgrounds/meadow-entry-source-catalog.ts`
- Verify unchanged:
  `src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts`
- Report:
  `.superpowers/sdd/2026-08-14-meadow-entry-painted-pilot-forest-enrichment/task-1-report.md`
  (ignored)

**Interfaces:**

```ts
export type MeadowEntryPaintedV2SceneryClass = 'hedge' | 'woodland';
export type MeadowEntryPaintedV2SceneryLanguage = 'hedge' | 'tree-wall' | 'forest-bank';

export interface MeadowEntryPaintedV2SceneryBlocker {
  readonly sourceId: string;
  readonly bounds: PixelBounds;
  readonly language: MeadowEntryPaintedV2SceneryLanguage;
  readonly sceneryClass: MeadowEntryPaintedV2SceneryClass;
}

export interface MeadowEntryPaintedV2SceneryInsert {
  readonly id: string;
  readonly sceneryClass: MeadowEntryPaintedV2SceneryClass;
  readonly bounds: PixelBounds;
  readonly owningSourceId: string;
  readonly owningSourcePriority: number;
  readonly rawPath: string;
  readonly normalizedPath: string;
  readonly provenancePath: string;
}

export interface MeadowEntryPaintedV2SceneryIntersection {
  readonly blockerId: string;
  readonly owningSourceId: string;
  readonly insertId: string;
  readonly sceneryClass: MeadowEntryPaintedV2SceneryClass;
  readonly bounds: PixelBounds;
}

export function validateMeadowEntryPaintedV2SceneryContract(
  blockers?: readonly MeadowEntryPaintedV2SceneryBlocker[],
  inserts?: readonly MeadowEntryPaintedV2SceneryInsert[],
  panels?: readonly MeadowEntryPaintedV2SourcePanel[],
  sourceCatalog?: readonly MeadowEntrySourceRecord[]
): readonly MeadowEntryPaintedV2SceneryIntersection[];
```

The production constants contain exactly ten blockers in this order:

```ts
[
  ['coast-crossroads-mouth-bank', [3168, 4900, 3232, 5300], 'hedge'],
  ['mistfen-entry-bank-east', [3068, 2600, 3132, 3100], 'hedge'],
  ['silverpine-wall-A-east', [3628, 2700, 3692, 3000], 'tree-wall'],
  ['silverpine-wall-A-west', [3308, 2700, 3372, 3000], 'tree-wall'],
  ['silverpine-wall-B-north', [3148, 2558, 3532, 2622], 'tree-wall'],
  ['silverpine-wall-B-south', [3148, 2878, 3532, 2942], 'tree-wall'],
  ['silverpine-wall-C-east', [3308, 2540, 3372, 2780], 'tree-wall'],
  ['silverpine-wall-C-west', [2988, 2540, 3052, 2780], 'tree-wall'],
  ['wildwood-forest-lane-west-bank', [4968, 3200, 5032, 5300], 'forest-bank'],
  ['wildwood-north-climb-west-bank', [5368, 1950, 5432, 3050], 'forest-bank']
]
```

Map `hedge` language to class `hedge`; map `tree-wall` and `forest-bank` to class `woodland`.
The insert constant contains exactly these seven rows, with bounds equal to the owning source panel:

```text
camera-underlay-sundrop-south-blocked-hedge       hedge     (0,4736)–(3200,6400)     owner priority 1
camera-underlay-crossroads-north-blocked-hedge    hedge     (2368,2240)–(5568,3904)  owner priority 2
camera-underlay-crossroads-south-blocked-hedge    hedge     (2368,3776)–(5568,5440)  owner priority 3
camera-underlay-crossroads-north-blocked-woodland woodland  (2368,2240)–(5568,3904)  owner priority 2
camera-underlay-crossroads-south-blocked-woodland woodland  (2368,3776)–(5568,5440)  owner priority 3
crossroads-blocked-hedge                           hedge     (2880,2816)–(4608,4768)  owner priority 50
crossroads-blocked-woodland                        woodland  (2880,2816)–(4608,4768)  owner priority 50
```

The validator must derive and exact-match this sixteen-row coverage matrix, sorted first by insert
table order and then blocker table order:

```text
camera-underlay-sundrop-south-blocked-hedge:
  coast-crossroads-mouth-bank
camera-underlay-crossroads-north-blocked-hedge:
  mistfen-entry-bank-east
camera-underlay-crossroads-south-blocked-hedge:
  coast-crossroads-mouth-bank
camera-underlay-crossroads-north-blocked-woodland:
  silverpine-wall-A-east
  silverpine-wall-A-west
  silverpine-wall-B-north
  silverpine-wall-B-south
  silverpine-wall-C-east
  silverpine-wall-C-west
  wildwood-forest-lane-west-bank
  wildwood-north-climb-west-bank
camera-underlay-crossroads-south-blocked-woodland:
  wildwood-forest-lane-west-bank
crossroads-blocked-hedge:
  mistfen-entry-bank-east
crossroads-blocked-woodland:
  silverpine-wall-A-east
  silverpine-wall-A-west
  silverpine-wall-B-south
```

- [ ] **Step 1: Inventory the rejected checkpoint and the existing sealed contract**

Record current `rtk git status --short`, every dirty presentation PNG/JSON SHA-256, the attempt-2
master hash, the rejected browser/review image hashes, and rejection text in the ignored task report
and ledger. Also record commit `782f9aa`, the current scenery source/test hashes, and the sealed
table hashes. Do not copy, modify, or stage rejected bytes. Assert the pinned Hero House hash before
proceeding.

Capture the storage baseline in the ledger without pruning or fetching objects:

```bash
rtk git rev-parse HEAD
rtk du -sk artifacts/meadow-entry/painted-v2
rtk git lfs ls-files --all --long --size \
  --include="artifacts/meadow-entry/painted-v2/**/*.png"
```

Use `0c65e3b5e1a3ec365402b809d4bc36876190e62a` as the immutable LFS range base; the later plan-only
amendment adds no LFS object. Also record the actual Task 1 HEAD and retain the exact LFS listing for
Task 9 comparison.

- [ ] **Step 2: Verify the literal contract already committed at `782f9aa`**

Run the existing tests and confirm they pin exact blocker order, IDs, bounds, languages/classes,
exact seven insert rows, unique IDs, owning bounds/priorities, and the exact sixteen intersections.
Confirm rejection for:

- missing, extra, reordered, duplicate, or renamed blocker/insert rows;
- a selected source that is no longer catalog type `blocker`;
- catalog bounds that differ by one pixel;
- an insert bound or priority that differs from its owning source panel;
- a missing, extra, cross-class, or duplicate source/class coverage row;
- an insert for Sundrop north, either Sundrop detail, Hero House, or connector;
- any mutation of the nine source-panel registry rows.

Run the focused verification suite:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts
```

Expected result: GREEN against the shipped module. The known `source-panels/` aliases in the insert
table remain a verified defect owned by Task 2; Task 1 does not edit them merely to manufacture a
RED.

- [ ] **Step 3: Prove no tracked file changed**

```bash
rtk git diff --exit-code -- \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.ts \
  src/lib/game/content/backgrounds/meadow-entry-source-catalog.ts \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts
```

Write the verification results and hashes to the ignored Task 1 report and continuation ledger.
Task 1 makes no code change, creates no commit, and hands the existing contract to Task 2.

---

### Task 2: Replace the rejected scenery overwrite with the organic-clump bake

**Files:**
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts`
- Modify:
  `tools/render-meadow-entry-painted-v2-enrichment-review.ts`
- Modify:
  `tools/render-meadow-entry-painted-v2-enrichment-review.test.ts`
- Verify unchanged:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.ts`
- Verify unchanged:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts`
- Verify unchanged:
  `artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png`
- Verify unchanged:
  `artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json`
- Verify unchanged:
  `artifacts/meadow-entry/painted-v2/exports/`
- Verify unchanged:
  `src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts`
- Verify unchanged:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts`
- Verify unchanged:
  `public/game/assets/regions/meadow-entry-painted-v2/`
- Report:
  `.superpowers/sdd/2026-08-14-meadow-entry-painted-pilot-forest-enrichment/task-2-report.md`
  (ignored)

**Interfaces:**

```ts
export function rgbStep(
  decoded: DecodedMeadowEntryRgba,
  first: PixelPoint,
  second: PixelPoint
): number;

export function meadowEntryNearestRank(
  values: readonly number[],
  percentile: number
): number;

export interface MeadowEntryPaintedV2SceneryMaskSet {
  readonly width: 6400;
  readonly height: 6400;
  readonly otherProtected: Uint8Array;
  readonly groundAllowed: Uint8Array;
  readonly sceneryAllowed: Uint8Array;
  readonly hedgeAllowed: Uint8Array;
  readonly woodlandAllowed: Uint8Array;
  readonly sourceHashes: Readonly<Record<string, string>>;
}

export interface DecodedMeadowEntryPaintedV2SceneryInsert {
  readonly id: string;
  readonly sceneryClass: MeadowEntryPaintedV2SceneryClass;
  readonly owningSourceId: string;
  readonly bounds: PixelBounds;
  readonly rgba: DecodedMeadowEntryRgba;
}

export interface MeadowEntryPaintedV2SceneryIntersectionMetric {
  readonly blockerId: string;
  readonly insertId: string;
  readonly owningSourceId: string;
  readonly sceneryClass: MeadowEntryPaintedV2SceneryClass;
  readonly sampleCount: number;
  readonly q40: number;
  readonly q80: number;
  readonly weightSha256: string;
}

export interface MeadowEntryPaintedV2SceneryRowMetricBase {
  readonly blockerId: string;
  readonly language: MeadowEntryPaintedV2SceneryLanguage;
  readonly sceneryClass: MeadowEntryPaintedV2SceneryClass;
  readonly eligiblePixelCount: number;
  readonly weightedPixelCount: number;
  readonly coverage: number;
  readonly weightSha256: string;
}

export interface MeadowEntryPaintedV2SceneryClumpRunMetric
  extends MeadowEntryPaintedV2SceneryRowMetricBase {
  readonly metricKind: 'clump-runs';
  readonly language: 'hedge' | 'forest-bank';
  readonly transverseSliceCount: number;
  readonly longestRunP95Ratio: number;
  readonly longestRunMaximumRatio: number;
}

export interface MeadowEntryPaintedV2SceneryContinuousContourMetric
  extends MeadowEntryPaintedV2SceneryRowMetricBase {
  readonly metricKind: 'continuous-contour';
  readonly language: 'tree-wall';
  readonly evaluableSliceCount: number;
  readonly nonEvaluableSliceCount: number;
  readonly weightedSliceCount: number;
  readonly evaluableSegmentCount: number;
  readonly distinctContourPairCount: number;
  readonly longestConstantContourRunRatio: number;
  readonly contourProfileSha256: string;
}

export type MeadowEntryPaintedV2SceneryRowMetric =
  | MeadowEntryPaintedV2SceneryClumpRunMetric
  | MeadowEntryPaintedV2SceneryContinuousContourMetric;

export interface MeadowEntryPaintedV2SceneryBakeResult {
  readonly panels: readonly MeadowEntryDetailDecodedPanel[];
  readonly enrichedSourceSha256: Readonly<Record<string, string>>;
  readonly changedPixelCount: number;
  readonly classChangedPixelCounts: Readonly<Record<MeadowEntryPaintedV2SceneryClass, number>>;
  readonly intersections: readonly MeadowEntryPaintedV2SceneryIntersectionMetric[];
  readonly rows: readonly MeadowEntryPaintedV2SceneryRowMetric[];
  readonly formulas: Readonly<Record<string, string>>;
}

export function buildMeadowEntryPaintedV2SceneryMaskSetFromControls(
  input: MeadowEntryControlInputs,
  sourceHashes: Readonly<Record<string, string>>
): MeadowEntryPaintedV2SceneryMaskSet;

export function buildMeadowEntryPaintedV2SceneryMaskSet(
  repositoryRoot?: string
): MeadowEntryPaintedV2SceneryMaskSet;

export function erodeMeadowEntryMask8(
  source: Uint8Array,
  width: number,
  height: number
): Uint8Array;

export function meadowEntrySceneryInsetDistances(
  classAllowed: Uint8Array,
  width: number,
  height: number,
  maximumDistance?: 15
): Uint8Array;

export function enrichMeadowEntryPaintedV2Sources(
  panels: readonly MeadowEntryDetailDecodedPanel[],
  inserts: readonly DecodedMeadowEntryPaintedV2SceneryInsert[],
  masks: MeadowEntryPaintedV2SceneryMaskSet
): MeadowEntryPaintedV2SceneryBakeResult;
```

`buildMeadowEntryPaintedV2SceneryMaskSet()` calls `buildMeadowEntryControlInputs()` once and delegates
to the pure control-input builder. The enrichment-review adapter accepts the resulting mask set and
sets `eligible = groundAllowed`; it no longer accepts `terrainRects` or derives `routeCore` itself.
Rendered SVGs are evidence outputs only and are never parsed back into this contract.

The compositor formula is exact:

```text
luma(r, g, b) = floor((54*r + 183*g + 19*b + 128) / 256)
insertMeanC(p) = clippedHalfUpBoxMean(insertC, p, radius=31)
insertDetailC(p) = clamp(insertC(p) - insertMeanC(p), -detailLimit(class), detailLimit(class))
toneMatchedInsertC(p) = clamp(originalSourceC(p) + insertDetailC(p), 0, 255)

nearLuma(p) = clippedHalfUpBoxMean(insertLuma, p, radius=15)
farLuma(p) = clippedHalfUpBoxMean(insertLuma, p, radius=63)
organicSignal(p) = abs(nearLuma(p) - farLuma(p))
t(p) = clamp(halfUp(255 * (organicSignal(p) - q40) / (q80 - q40)), 0, 255)
organicWeight(p) = meadowEntryDetailFeatherWeight(t(p), 255)

E0 = classAllowed
E(k+1) = { p in E(k) | every pixel in p's 3x3 neighborhood is in E(k) }
sceneryInsetDistance(p) = max k such that p is in E(k)
edgeWeight(p) = meadowEntryDetailFeatherWeight(min(sceneryInsetDistance(p), 15), 15)
sceneryWeight(p) = halfUp(edgeWeight(p) * organicWeight(p) / 255)
enrichedSourceC(p) = blendMeadowEntryDetailChannel(
  originalSourceC(p),
  toneMatchedInsertC(p),
  sceneryWeight(p)
)
```

The tone detail cap is `32` for hedge and `48` for woodland. `q40` and `q80` are produced by the
shared nearest-rank helper over each exact blocker/source/class sample set. Fewer than `64` samples
or `q40 === q80` fails before any source mutation. Local means are evaluated only for those sample
pixels; a whole-source prefix-sum cache is permitted, but a whole-panel output/filter pass is not.

- [ ] **Step 1: Capture the rejected compositor as genuine RED**

Before changing finalizer source, run its ordinary `--check` once and record the current published
master/provenance hashes as the green comparison baseline. Then capture the RED below without
writing any production artifact.

Before production edits, add synthetic art with at least `64` eligible samples, non-tied organic
signals, an irregular protected hole, a deliberately uniform hedge/bank belt, and a continuous
tree-wall fixture with an initially constant rectangular contour. Also add finalizer-level
synthetic assertions that the production path and review path apply both declared pair corrections
immediately after each pair's second priority. Assert:

- the current 15px-only overwrite fails because its final weight stays continuous through the belt;
- owner-relative tone matching caps hedge detail at `32` and woodland detail at `48`;
- organic-clump coverage is between `25%` and `70%` for every literal row;
- `hedge` and `forest-bank` transverse longest-run nearest-rank p95 is at most `0.30` and the
  absolute maximum is at most `0.50`;
- every evaluable `tree-wall` long-axis slice contains final weight `>=32`, its contour profile has
  more than one distinct `(nearDepth, farDepth)` pair, and its longest constant-pair run ratio is at
  most `0.50`; evaluability requires a slice-local maximum edge-envelope weight `>=32` (first
  possible depth is `4`, where edge weight is `45`); non-evaluable slices are recorded as nullable
  mask/envelope facts, identical-pair runs reset across them, and every evaluable slice must be
  weighted;
- the class-mask union boundary and every higher-precedence hole have final weight zero;
- an intersection with fewer than `64` samples and one with `q40 === q80` each fail before any
  output panel changes;
- the current production finalizer's singular detail loop disagrees with the pair-corrected review
  assembly at both midpoints, providing the genuine parity RED;
- the current review writer fails the five-mask contract because it still reads removed retained
  intermediates/union masks.

Also make the path contract RED by requiring all seven `rawPath`, `normalizedPath`, and
`provenancePath` values under `artifacts/meadow-entry/painted-v2/source-inserts/`; explicitly reject
the current `source-panels/` aliases.

Run RED:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
```

Expected RED is limited to the missing shared exports, wrong insert paths, duplicate mask authority,
missing class-specific organic provenance, old continuous-belt result, and production/review pair
assembly/review-writer mismatch. Existing pair-compositor and 67-tile fixtures remain green.

- [ ] **Step 2: Export shared integer helpers and correct the insert paths**

Export the existing `rgbStep` from `meadow-entry-detail-boundary-metrics.ts`. Replace private
`nearestRankP95` and `nearestRankMedian` with one exported `meadowEntryNearestRank(values,
percentile)` and call it for p95, median, q40, and q80. Keep the current RGB-step arithmetic and
nearest-rank indexing byte-for-byte; do not add a second implementation in the bake or enrichment
review. Use `meadowEntryDetailFeatherWeight(t, 255)` for organic smoothstep and the existing
`blendMeadowEntryDetailChannel` for channel output.

Change only the three paths in each sealed insert row to its own `source-inserts/raw/<id>.png`,
`source-inserts/<id>.png`, and `source-inserts/<id>.json`. Keep all seven IDs, classes, owners,
bounds, priorities, and the sixteen-row coverage matrix unchanged.

- [ ] **Step 3: Establish one catalog-backed mask authority**

Move all mask derivation behind `buildMeadowEntryPaintedV2SceneryMaskSetFromControls()`. It consumes
one `MeadowEntryControlInputs`, its crop rows, source catalog, bake ownership, control clearances,
and exported `MEADOW_ENTRY_PROTECTION_MARGINS`. It returns only the five binary `6400×6400` rasters
in the interface above plus `sourceHashes`. Derive `routeCore` there exactly once from the
catalog-backed ground patches. Omit only the ten selected blocker IDs from `otherProtected`.

Build `insideCropUnion`, `protectedLive`, `selectedBlockers`, `buildingFootprint`,
`entranceTransition`, `rewardDiscovery`, `semanticAnchor`, and `routeCore` as builder-local
intermediates through one reusable scratch raster/accumulator path. Hash each intermediate before
discarding or reusing its storage. Do not expose or retain these eight additional full-canvas arrays
for tests. Assert class-mask disjointness and precedence through sealed input/output coordinates:
every non-selected protected/live, building, transition, reward/discovery, semantic-anchor, and
route-core pixel still wins. A diagnostic overlay may compute `groundAllowed | sceneryAllowed` at
its rendering call site; no retained union property or provenance row is permitted.

The eligibility adapter reuses the returned arrays and sets `eligible` to `groundAllowed`
byte-for-byte. Its exact 67 row-major tiles, `16 + 16 + 16 + 16 + 3` sheet split, minimum `1.5`, and
median `3.1843126049067515` remain unchanged.

Update the review writer in the same RED/GREEN slice. Its mask inventory counts only the five
retained rasters and records builder-local hashes from `sourceHashes`; it no longer reads a retained
selected-blocker or union raster. When an overlay needs all allowed decoration pixels, allocate one
review-artifact-local buffer, fill each pixel with `groundAllowed | sceneryAllowed`, render it, and
release it. That ephemeral diagnostic buffer is neither returned by the builder nor written into
package provenance.

- [ ] **Step 4: Implement owner-relative organic composition and returned provenance**

Validate the sealed coverage matrix before reading pixels. For each exact intersection, collect its
eligible sample coordinates, compute clipped integer luma/means only at those coordinates, fail
closed on sample/percentile degeneracy, and combine overlapping same-insert organic weights with
`max`. Compute the edge envelope from the matching class-mask union, multiply it by organic weight,
and blend the tone-matched insert only where the final weight is nonzero.

Clone only these four affected decoded sources:

```text
camera-underlay-sundrop-south
camera-underlay-crossroads-north
camera-underlay-crossroads-south
crossroads
```

Return every other decoded panel with byte-identical RGBA data. Return—not recompute in tests—the
per-intersection q40/q80/sample count/weight hash; common per-blocker
language/class/eligible/weighted/coverage/weight hash; `clump-runs` p95/maximum statistics for
hedge/forest-bank rows; `continuous-contour` evaluable/weighted slice counts, distinct contour-pair
count, non-evaluable count, evaluable-segment count, longest constant-contour-run ratio, and nullable
evaluability/contour-profile hash for tree-wall rows;
formula/helper IDs; changed-pixel totals; class counts; and four enriched decoded-RGBA SHA-256
values. Do not encode or overwrite normalized presentation PNGs.

- [ ] **Step 5: Add synthetic full-assembly and non-mutation coverage**

Feed enriched synthetic sources into the existing underlay/detail assembly and prove:

- source-local clumps survive within matching `sceneryAllowed` pixels without a continuous bar;
- the edge envelope can reach `255` at inward depth `15`, while final weight reaches `255` only
  where organic weight also reaches `255`;
- existing north/south blends, family handoff, ordinary detail perimeter equality, and both pair
  corrections remain exact;
- every pixel outside `sceneryAllowed`, inside `otherProtected`, or belonging to the wrong class is
  byte-exact to assembly of the same sources without inserts;
- hedge/woodland application order, input arrays, alpha, repeated hashes, and returned metrics are
  deterministic;
- tests consume returned thresholds/hashes/class-specific row metrics and do not reimplement the
  bake's percentile, run-ratio, or contour-profile algorithms.

Then replace the production finalizer's manual `compositeMeadowEntryDetailPanel` loop with the
already-sealed `compositeMeadowEntryDetailPanels` priority-stack helper. Add finalizer-level tests
for both corrected midpoints, all four ordinary-composite edges, and immediate-after-second-member
ordering. Assemble the current source bytes through the production function and the review adapter
into a temporary root with scenery disabled; require identical decoded master pixels and identical
pair-stage formula/configuration rows, and pin the temporary pair-corrected hash in the Task 2
report.

Until Task 5, replace any test that assumes source finalization equals the checked-in master with an
explicit staged-state assertion: pin the current published master hash, pin the temporary
pair-corrected hash, require them to differ for the known pair-correction reason, and require all
published bytes to remain unchanged. Task 5 removes this temporary inequality assertion when it
publishes the approved assembly and restores ordinary finalizer `--check` equality.

Do not wire blocked-scenery inputs into the production finalizer and do not run image generation in
this task. The checked-in published master and every downstream package/runtime artifact must remain
byte-identical. Because finalizer source now intentionally describes the pair-corrected future
master, ordinary `finalize ... --check` is expected to fail stale until Task 5 publishes the approved
assembly. Mark the intermediate branch non-publishable; do not weaken the finalizer or overwrite the
published master to recover a green `--check`.

- [ ] **Step 6: Run focused GREEN and static gates**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk bun run check
rtk bunx prettier --check \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.ts \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk bunx eslint \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.ts \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk git diff --exit-code -- \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png \
  artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json \
  artifacts/meadow-entry/painted-v2/exports/ \
  src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts \
  public/game/assets/regions/meadow-entry-painted-v2/
rtk git diff --check
```

Do not run the ordinary finalizer `--check` after the pair-path swap: a stale result is the expected
truthful state until Task 5. Instead, the focused finalizer test must exercise the temporary-root
assembly twice and prove identical output while the literal diff command proves published bytes did
not move.

- [ ] **Step 7: Commit and obtain an independent review before generation**

```bash
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.ts \
  src/lib/game/content/backgrounds/meadow-entry-detail-boundary-metrics.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk git commit -m "fix(art): align Meadow forest assembly"
```

Review the exact Task 2 commit for helper reuse, one five-raster mask authority, unchanged 67-tile
inventory, source-insert paths, fail-closed percentiles, class-specific row metrics, returned
provenance, production/review pair parity, non-mutation, and unchanged published package bytes. Do
not begin Task 3 until the review is GREEN.

---

### Task 3: Re-evaluate the interim sources with the corrected bake, regenerate only failures, and stop at the gate

**Files:**
- Replace raw/normalized PNG and panel JSON only when corrected native review still fails for:
  - `camera-underlay-sundrop-north`
  - `camera-underlay-sundrop-south`
  - `camera-underlay-crossroads-north`
  - `camera-underlay-crossroads-south`
  - `sundrop-north`
  - `sundrop-south`
- Replace raw/normalized PNG and JSON only when corrected native review still fails for:
  - `camera-underlay-sundrop-south-blocked-hedge`
  - `camera-underlay-crossroads-north-blocked-hedge`
  - `camera-underlay-crossroads-south-blocked-hedge`
  - `camera-underlay-crossroads-north-blocked-woodland`
  - `camera-underlay-crossroads-south-blocked-woodland`
- Modify:
  `tools/render-meadow-entry-painted-v2-enrichment-review.ts`
- Modify:
  `tools/render-meadow-entry-painted-v2-enrichment-review.test.ts`
- Modify after approval only:
  `artifacts/meadow-entry/painted-v2/provenance.json`
- Generate review images under:
  `docs/superpowers/reports/img/hpa-586-painted-v2-enrichment/forest-interim/`
- Report:
  `.superpowers/sdd/2026-08-14-meadow-entry-painted-pilot-forest-enrichment/task-3-report.md`
  (ignored)

**Restart state:**
- Commit `0caefd1` is the withdrawn interim source checkpoint. Its user approval does not approve an
  assembly made by the corrected compositor.
- The current unstaged five-insert correction and its 76 rebuilt evidence files are rejected audit
  evidence from the same 15px-only compositor. Record their hashes before touching them.
- Preserve every prior prompt, reference hash, raw/normalized hash, attempt number, rejection reason,
  and withdrawn approval. Never reset a history to attempt 1.
- Task 2's focused GREEN, temporary-root production/review parity hash, published-package no-write
  proof, commit, and independent review are prerequisites. No image-generation call is permitted
  before all five exist.

**Interfaces:**
- First run the latest preserved source bytes through the corrected compositor in a temporary root.
  A source that clears its own native-detail checks plus all returned organic metrics does not need a
  cosmetic regeneration merely because its earlier assembly was rejected.
- Every source that still fails receives one distinct correction call in dependency order. The
  report states the exact number of calls actually made; it does not assume eleven new calls.
- Presentation calls receive concept/palette, current panel, adjacent accepted painted pixels, and
  prose constraints only.
- Hedge calls receive only art references and the hedge language; woodland calls receive only art
  references and the regional woodland language. No mask/atlas/control reference is supplied.
- The temporary assembly uses the five inserts through Task 2's exact masks while retaining pinned
  Hero House and current connector/Crossroads detail bytes.

- [ ] **Step 1: Write corrected-bake review-tool RED coverage before any image call**

Extend the review tool/test contract to require:

- all six presentation panel reviews and five insert reviews;
- five native crops per insert;
- four enriched owning-source previews;
- both underlay north/south seams and the family handoff;
- full temporary master and two temporary crop exports;
- four Sundrop pair sides, four Hero House edges, one matched Sundrop richness comparison, one
  Wildwood forest-lane view, all five 67-tile sheets, ten blocker-row crops, and mask inventory JSON;
- exact hashes and dimensions for every evidence file;
- failure for a missing insert review, wrong class, wrong bounds, grid-like upper-band artifact,
  visible insert rectangle, protected overlap, or insufficient tile energy;
- exact use of the bake result's per-intersection q40/q80/weight hashes, common per-row coverage,
  hedge/forest-bank p95/max clump-run metrics, and tree-wall continuous-contour metrics, with no
  review-tool recomputation of those values;
- failure if the exact 67-tile inventory or energy calculation samples anything other than
  `groundAllowed`.

Run RED before any image call:

```bash
rtk bun run test:unit -- --run \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts
```

- [ ] **Step 2: Render the preserved candidate once, then correct failing underlays in dependency order**

Build one temporary assembly from the latest preserved bytes and the reviewed Task 2 compositor.
Inspect its four enriched-owner previews, every blocker row, Wildwood lane, underlay seams, family
handoff, and returned structural metrics. This is an evaluation run, not a new approval.

Only an underlay that still fails source/native or assembled evidence receives a fresh distinct
built-in image-generation call, in this order:

1. Sundrop north;
2. Sundrop south using accepted north overlap pixels;
3. Crossroads north;
4. Crossroads south using accepted north overlap pixels.

Inspect raw output at original resolution before normalization. Reject broad grass-only fields,
trees/trunks on open ground, square pads, source frames, repeated stamp grids, straight material
bars, buildings, props, labels, and false doors. Normalize only candidates that pass raw review.

- [ ] **Step 3: Correct Sundrop north/south detail only if preserved detail fails**

If either preserved detail source fails, use distinct calls in north-then-south order and feed the
accepted north overlap to the south correction. Require three visible motif families in the
representative main-street view while keeping route cores and building approaches quiet. Sundrop
must contain no baked tree or trunk. Inspect the full `2624×128` pair overlap and west/center/east
crops before acceptance.

- [ ] **Step 4: Correct only the underlay inserts that still fail organic assembly**

For each of the five preserved inserts, distinguish a compositor failure from a source-art failure.
Keep an insert only when the corrected bake passes q40/q80, coverage, its language-specific
clump-run or continuous-contour gate, protected-mask, and native-detail review. A failing insert gets
one distinct call. Insert canvases may contain their class across the whole image because
deterministic organic composition owns visibility. Require irregular regional surfaces and reject
any literal mask shape, straight hedge bar, repeated tree stamp, landmark silhouette, path,
building, label, or live prop. Hedge excludes trunks/canopy; woodland shows at least two depth cues
and shifts from Silverpine conifer character northward to Wildwood broadleaf character southward.

- [ ] **Step 5: Normalize and write truthful per-input provenance**

For each accepted input record raw/normalized hashes, bytes, dimensions, exact uniform transform,
prompt, supplied reference paths/hashes, model availability, attempts and rejection reasons. Keep
all attempts monotonically numbered from their existing histories, including the withdrawn
checkpoint and rejected source-only correction. Store inserts only at:

```text
artifacts/meadow-entry/painted-v2/source-inserts/raw/<insert-id>.png
artifacts/meadow-entry/painted-v2/source-inserts/<insert-id>.png
artifacts/meadow-entry/painted-v2/source-inserts/<insert-id>.json
```

- [ ] **Step 6: Build the temporary interim assembly and inspect all evidence**

Run the review writer in a temporary output root. The production master, exports, approval, runtime
assets, and public files must remain unchanged. Require all 67 rows to meet the energy floor and
human richness contract on `groundAllowed` only. Pin the compositor-returned intersection and row
metrics in the manifest. Inspect every review image at original detail. Confirm the insert bake is
visible in Wildwood, invisible outside `sceneryAllowed`, and does not create a rectangle edge.

After rendering, run the literal no-write proof:

```bash
rtk git diff --exit-code -- \
  artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png \
  artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json \
  artifacts/meadow-entry/painted-v2/exports/ \
  src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts \
  public/game/assets/regions/meadow-entry-painted-v2/
```

- [ ] **Step 7: Stop at `NEEDS_CONTEXT` for explicit interim approval**

Provide absolute paths for the full overview, six panel reviews, five insert reviews, seams,
Sundrop matched comparison, Wildwood forest-lane crop, blocker inventory, and all five density
sheets. State the exact evaluation inputs, correction-call count, attempts, returned q40/q80,
weight hashes, common coverage, clump-run metrics, and continuous-contour metrics. Do not infer
approval. Do not generate connector, Crossroads detail, or the two Crossroads detail inserts. Do not
bind root approval, stage, commit, publish, or run the texture probe before the user's explicit
verdict.

- [ ] **Step 8: After approval, bind metadata and commit only the interim inventory**

Record the user's answer and UTC-second timestamp in six panel JSONs, five insert JSONs, root
provenance, report, and ledger. Run focused review/scenery tests, storage, LFS, static, targeted
format/lint, and diff checks. Repeat the Step 6 protected-package `git diff --exit-code` command
immediately before staging. Stage only approved Task 3 files and review evidence:

```bash
rtk git commit -m "art(world): paint Meadow underlay forest inputs"
```

---

### Task 4: Generate connector/Crossroads detail and two detail inserts, then stop at the final source gate

**Files:**
- Replace raw/normalized PNG and panel JSON for:
  - `village-crossroads-connector`
  - `crossroads`
- Create raw/normalized PNG and JSON for:
  - `crossroads-blocked-hedge`
  - `crossroads-blocked-woodland`
- Modify:
  `artifacts/meadow-entry/painted-v2/provenance.json`
- Extend review evidence under:
  `docs/superpowers/reports/img/hpa-586-painted-v2-enrichment/forest-final-sources/`
- Modify:
  `tools/render-meadow-entry-painted-v2-enrichment-review.ts`
- Modify:
  `tools/render-meadow-entry-painted-v2-enrichment-review.test.ts`
- Report:
  `.superpowers/sdd/2026-08-14-meadow-entry-painted-pilot-forest-enrichment/task-4-report.md`
  (ignored)

- [ ] **Step 1: Generate connector then Crossroads detail with two distinct calls**

Connector remains tree-free open terrain with wheel-rut wear, compacted-soil variation, low scrub,
small stones, fallen leaves, and sparse flowers. Crossroads transitions through dirt, gravel,
sparse stone, and cobble while leaving routes and live Waystone/landmark clearances quiet. Feed
accepted connector overlap pixels to the Crossroads call; do not pass masks or overlays.

- [ ] **Step 2: Generate the two Crossroads detail inserts**

Generate `crossroads-blocked-hedge` and `crossroads-blocked-woodland` separately. Hedge remains low
brush/reeds. Woodland covers the approved Silverpine A-east/A-west/B-south intersections with
varied trunks, undergrowth, roots, leaf litter, canopy depth, and no recognizable live-prop copy.

- [ ] **Step 3: Normalize, provenance-bind, and assemble all sixteen package inputs in a temporary root**

The full candidate has exactly eight revised presentation inputs, the pinned Hero House input, and
seven insert inputs. Run the same preassembly bake and ordinary assembly. Do not overwrite
normalized presentation PNGs with enriched bytes. Root draft provenance records all input histories
but remains `pending-final-source-gate`.

- [ ] **Step 4: Inspect the complete evidence inventory**

Require and inspect:

- eight presentation reviews and seven insert reviews at native detail;
- four enriched-source previews;
- both underlay seams, family handoff, full Sundrop pair, full connector/Crossroads pair, and all
  side/corner crops;
- ten clean blocker-row before/after crops plus one labelled overlay;
- five exact 67-tile sheets and inventory JSON;
- exact compositor-returned q40/q80 and weight hashes for every intersection, common coverage for
  every row, hedge/forest-bank p95 and maximum clump-run ratios, and tree-wall
  continuous-contour metrics/hashes;
- full master, temporary two-crop exports, Silverpine tree-wall, Wildwood forest-lane, coast hedge,
  Mistfen hedge, Hero House, and matched Sundrop/connector views;
- no grid, source rectangle, false blocker, duplicate prop, material jump, double darkening, alpha
  hole, blur mismatch, or lost route readability.

- [ ] **Step 5: Stop at `NEEDS_CONTEXT` for explicit final source approval**

Return absolute paths and one-line inspection verdicts. State attempts per input and exact scaling.
Do not publish master/package/runtime bytes, stage, or commit until the user explicitly approves.
Before returning, prove those protected bytes did not move:

```bash
rtk git diff --exit-code -- \
  artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png \
  artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json \
  artifacts/meadow-entry/painted-v2/exports/ \
  src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts \
  public/game/assets/regions/meadow-entry-painted-v2/
```

- [ ] **Step 6: After approval, bind metadata and commit Task 4**

Record answer and UTC timestamp in two panel manifests, two insert manifests, root provenance,
report, and ledger. Run focused source/review/scenery tests, storage, LFS, check, targeted
Prettier/ESLint, and diff-check. Repeat the Step 5 protected-package diff command before staging.
Commit only final-source files and evidence:

```bash
rtk git commit -m "art(world): paint Meadow detail forest inputs"
```

---

### Task 5: Wire the approved scenery bake into finalization and assemble the master

**Files:**
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-master-provenance.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts`
- Modify:
  `tools/finalize-meadow-entry-painted-v2-pilot.ts`
- Modify:
  `artifacts/meadow-entry/painted-v2/provenance.json`
- Regenerate:
  `artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png`
- Regenerate:
  `artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json`
- Report:
  `.superpowers/sdd/2026-08-14-meadow-entry-painted-pilot-forest-enrichment/task-5-report.md`
  (ignored)

**Input extension:**

```ts
export interface MeadowEntryPaintedV2BlockedSceneryAssemblyInput {
  readonly inserts: Readonly<Record<string, Buffer>>;
  readonly insertProvenance: Readonly<Record<string, MeadowEntryGenerationProvenance>>;
  readonly masks: MeadowEntryPaintedV2SceneryMaskSet;
}

export interface MeadowEntryPaintedV2PilotAssemblyInput {
  readonly panels: Readonly<Record<string, Buffer>>;
  readonly panelProvenance: Readonly<Record<string, MeadowEntryGenerationProvenance>>;
  readonly blockedScenery: MeadowEntryPaintedV2BlockedSceneryAssemblyInput;
  readonly controlFingerprint: string;
  readonly approvedControlFingerprint: string;
}
```

- [ ] **Step 1: Write production integration RED tests**

Require exact seven insert keys/provenance rows, exact dimensions/bounds/classes/owners, normalized
hash binding, mask/source-catalog fingerprints, and approved gate timestamps. Test missing/extra,
stale, wrong-class, wrong-dimension, cross-owner, and unapproved inputs. Assert the CLI `--check`
path reads all seven inserts and fails with a truthful stale-package error before production wiring.
Retain Task 2's finalizer-level pair-correction and production/review parity tests unchanged; pair
assembly is already sealed and is not a Task 5 RED. Replace Task 2's temporary
future-master-versus-published-master inequality assertion with the ordinary equality/`--check`
contract once the approved bake is wired and generated.

- [ ] **Step 2: Decode and enrich before ordinary assembly**

Decode all nine panels and seven inserts. Call `enrichMeadowEntryPaintedV2Sources` once. Feed its
returned panels into the already pair-corrected production priority stack established in Task 2.
Task 5 wires only blocked-scenery decoding, validation, enrichment, and provenance; it does not
change pair formulas, widths, table, ordering, or call sites. Keep normalized presentation and
insert PNG bytes untouched. Assert runtime crop opacity and outside-pilot transparency exactly as
before.

- [ ] **Step 3: Extend deterministic provenance**

Root provenance contains:

- `blockedSceneryInserts`: exact seven rows with IDs/classes/paths/bounds/owners/priorities,
  raw/normalized/provenance hashes, attempts, approval answer, reviewer, and timestamp;
- `blockedSceneryBake`: exact sixteen coverage rows, selected/other-protected/ground/scenery/hedge/
  woodland and builder-local intermediate hashes, source-catalog hash, formulas/helper IDs,
  local-mean radii, hedge/woodland detail caps, 15px edge-envelope cap, exact per-intersection sample
  counts/q40/q80/weight hashes, exact common per-row eligible/weighted counts and coverage,
  hedge/forest-bank clump-run metrics, tree-wall continuous-contour metrics/profile hashes,
  changed-pixel counts, and decoded-RGBA hashes for the four enriched owning sources.

Pin stable JSON ordering. Preserve all unrelated source-panel, control, crop, overlap, and history
fields. Add a repeat-run byte-equality test for both master PNG and provenance JSON.

- [ ] **Step 4: Generate and inspect the production master**

```bash
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
```

Inspect full overview, all seams/handoffs, ten blocker crops, Hero House, Sundrop, connector,
Silverpine, Wildwood, Coast, and Mistfen at native detail. Verify exact alpha counts required by the
unchanged crop union, no insert rectangle, and no mutation outside `sceneryAllowed` relative to a
same-panel assembly with inserts disabled.

- [ ] **Step 5: Run focused GREEN and no-write gates**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts
MEADOW_FINALIZER_STATUS_BEFORE="$(rtk git status --short)"
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
MEADOW_FINALIZER_STATUS_AFTER="$(rtk git status --short)"
test "$MEADOW_FINALIZER_STATUS_BEFORE" = "$MEADOW_FINALIZER_STATUS_AFTER"
rtk bun run check
rtk git diff --check
```

- [ ] **Step 6: Commit Task 5**

Stage only the finalizer/provenance code, tests, new master, master provenance, and root provenance.

```bash
rtk git commit -m "feat(art): assemble forest-enriched Meadow master"
```

---

### Task 6: Republish exports, proofs, approval inventory, and the same two runtime textures

**Files:**
- Modify as required by RED:
  `tools/render-meadow-entry-art-proofs.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts`
- Regenerate:
  `artifacts/meadow-entry/painted-v2/exports/`
- Regenerate:
  `artifacts/meadow-entry/painted-v2/proofs/` except immutable historical representative files
- Regenerate:
  `artifacts/meadow-entry/painted-v2/provenance/`
- Regenerate:
  `src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts`
- Regenerate:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts`
- Regenerate:
  `public/game/assets/regions/meadow-entry-painted-v2/`
- Verify unchanged unless measured-budget RED requires a literal review-ceiling update:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.ts`
- Report:
  `.superpowers/sdd/2026-08-14-meadow-entry-painted-pilot-forest-enrichment/task-6-report.md`
  (ignored)

- [ ] **Step 1: Write stale package/proof binding RED tests**

Update the literal approval expectation before regenerating approval. Require every active proof
sidecar to bind the current master, controls, crop manifest, all nine presentation panels, all seven
insert raw/normalized/provenance triples, and `blockedSceneryBake` provenance. Pin exactly two
exports, one overlap, and no foreground/runtime insert asset.

- [ ] **Step 2: Measure exports in a temporary root**

```bash
MEADOW_EXPORT_REVIEW_ROOT="$(rtk mktemp -d /private/tmp/gliese-meadow-forest-export.XXXXXX)"
rtk bun tools/export-meadow-entry-regions.ts \
  --output-root "$MEADOW_EXPORT_REVIEW_ROOT/painted-v2"
```

Require two 3200×3200 opaque exports, one overlap, `1_863_680` overlap-plane pixels compared, zero
difference, under `32 MiB` per crop and `64 MiB` aggregate. If only a literal review ceiling is
exceeded, capture a measured-budget RED and update only that review ceiling; never raise a hard cap.

- [ ] **Step 3: Publish exports and active proofs**

```bash
rtk bun tools/export-meadow-entry-regions.ts
rtk bun tools/export-meadow-entry-regions.ts --check
rtk bun tools/render-meadow-entry-art-proofs.ts
rtk bun tools/render-meadow-entry-art-proofs.ts --check
```

Preserve the two historical representative PNGs and three historical texture-probe JSON files
byte-for-byte. Inspect all active proof PNGs at original detail and validate every sidecar binding.
Prove the historical files stayed unchanged:

```bash
rtk git diff --exit-code -- \
  artifacts/meadow-entry/painted-v2/proofs/texture-probe/representative-1600.png \
  artifacts/meadow-entry/painted-v2/proofs/texture-probe/representative-3200.png \
  artifacts/meadow-entry/painted-v2/proofs/texture-probe/browser-1600.json \
  artifacts/meadow-entry/painted-v2/proofs/texture-probe/browser-3200.json \
  artifacts/meadow-entry/painted-v2/proofs/texture-probe/browser-camera-safe-pilot.json
```

- [ ] **Step 4: Publish explicit package approval and runtime data**

Only after the package review is complete, capture a UTC-second timestamp and run:

```bash
MEADOW_PACKAGE_REVIEWED_AT="$(rtk date -u '+%Y-%m-%dT%H:%M:%SZ')"
rtk bun tools/approve-meadow-entry-art-package.ts \
  --reviewed-by chanwaichan \
  --reviewed-at "$MEADOW_PACKAGE_REVIEWED_AT"
rtk bun tools/approve-meadow-entry-art-package.ts --check
rtk bun tools/generate-meadow-entry-runtime.ts
rtk bun tools/generate-meadow-entry-runtime.ts --check
```

Assert public runtime files equal package exports byte-for-byte. Descriptor IDs, paths, dimensions,
centers, draw orders, selection, crop ownership, and overlap ownership remain structurally exact.

- [ ] **Step 5: Run focused publication GREEN and all writers in check mode**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-export-integration.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts
MEADOW_CHECK_STATUS_BEFORE="$(rtk git status --short)"
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
MEADOW_CHECK_STATUS_AFTER="$(rtk git status --short)"
test "$MEADOW_CHECK_STATUS_BEFORE" = "$MEADOW_CHECK_STATUS_AFTER"
```

The literal status comparison must pass across all `--check` commands.

If Step 2 did not produce a measured-budget RED, also require:

```bash
rtk git diff --exit-code -- \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.ts
```

If a literal ceiling changed, the report instead records the measured RED and the exact one-file
manifest diff; no other crop geometry or runtime descriptor field may change.

- [ ] **Step 6: Commit Task 6**

Inspect exact staged inventory and commit only changed publication code/tests/generated artifacts:

```bash
rtk git commit -m "feat(art): publish forest-enriched Meadow package"
```

---

### Task 7: Rerun the exact two-texture probe and real-input browser journeys

**Files:**
- Modify:
  `tools/probe-meadow-entry-texture-safety.ts`
- Modify:
  `tools/probe-meadow-entry-texture-safety.test.ts`
- Replace:
  `artifacts/meadow-entry/painted-v2/proofs/texture-probe/browser-camera-safe-pilot.json`
- Modify:
  `docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-texture-preflight.md`
- Verify unchanged unless a test-only instrumentation defect is proven:
  `tests/e2e/game.e2e.ts`
- Modify:
  `docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-browser.md`
- Report:
  `.superpowers/sdd/2026-08-14-meadow-entry-painted-pilot-forest-enrichment/task-7-report.md`
  (ignored)

- [ ] **Step 1: Write exact encoded-byte/hash RED**

Update only the two expected asset hash/byte literals in the candidate test first. Keep candidate ID
`painted-v2-camera-safe-pilot`, two assets, dimensions, retention count, paths, and all stop rules
unchanged. Run:

```bash
rtk bun test tools/probe-meadow-entry-texture-safety.test.ts
```

Expected RED is stale candidate bytes/hashes only.

- [ ] **Step 2: Update candidate literals and run static probe tests**

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

One setup-only loopback bind failure permits one narrow localhost escalation. Acceptance requires
2/2 uploads, 2 retained, exact hashes/bytes/dimensions, `contextLost=false`, and no WebGL error. A
real upload/retention/context/WebGL failure records `stop`, leaves Task 7 uncommitted, and returns
`NEEDS_CONTEXT`.

- [ ] **Step 4: Run existing real-input E2E at the frozen viewport**

```bash
rtk bun run test:e2e -- --grep "Meadow painted pilot selects only approved planes and preserves live fallbacks"
rtk bun run test:e2e -- --grep "Meadow painted pilot preserves the village Crossroads gameplay loop"
rtk bun run test:e2e -- --grep "Meadow painted pilot" --repeat-each=2
```

Require exact two preload IDs/count, separate Sundrop/Crossroads failure ownership, exact crop-union
coverage for every exterior route token, and save/reload continuity. Diagnose route failures
separately; do not tune waypoints, tolerances, retries, collision, camera, or runtime ownership for
the art revision.

- [ ] **Step 5: Record facts, run checks, and commit only on `proceed`**

Record browser/renderer/version, maximum texture size, durations, encoded/decoded aggregate,
context status, probe decision, E2E counts/timings, and camera extrema. Run `bun run check`, targeted
Prettier/ESLint, LFS fsck, and diff-check. If no test-only instrumentation defect was reproduced,
prove the E2E source stayed unchanged:

```bash
rtk git diff --exit-code -- tests/e2e/game.e2e.ts
rtk git diff --exit-code -- \
  artifacts/meadow-entry/painted-v2/masters/ \
  artifacts/meadow-entry/painted-v2/exports/ \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts \
  public/game/assets/regions/meadow-entry-painted-v2/
```

If an instrumentation defect required an edit, record its isolated RED/GREEN and exact diff instead.
Commit:

```bash
rtk git commit -m "test(art): verify forest-enriched Meadow textures"
```

---

### Task 8: Capture final native/browser evidence and obtain explicit visual approval

**Files:**
- Replace approved visual report:
  `docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-visual-review.md`
- Replace/add images under:
  `docs/superpowers/reports/img/hpa-586-painted-v2-pilot/`
- Add matched comparisons under:
  `docs/superpowers/reports/img/hpa-586-painted-v2-enrichment/final-comparisons/`
- Report:
  `.superpowers/sdd/2026-08-14-meadow-entry-painted-pilot-forest-enrichment/task-8-report.md`
  (ignored)

- [ ] **Step 1: Build and open one fresh headed review session**

Run `rtk bun run build`, start preview, then use the Playwright skill in a named headed session.
Set viewport `1920×1080`, DPR 1, zoom 1, use fresh save seeds, and apply the exact noninteractive
review bar. Never mutate live coordinates after a capture has begun.

- [ ] **Step 2: Capture eight normal views**

Capture and inspect at original detail:

1. Hero House frontage;
2. Sundrop main street;
3. connector village mouth;
4. connector midpoint;
5. connector Crossroads mouth;
6. Crossroads Waystone;
7. Silverpine tree wall;
8. Wildwood forest lane.

Normal views must show no crop/source rectangle, fallback exposure, material jump,
double-darkening, blur/stretch, regular stamp, duplicate live prop, false door/blocker, clearance
ambiguity, debug overlay, or review-bar defect. Sundrop/connector show richer ground but no baked
tree/trunk. Silverpine/Wildwood show at least two natural forest-depth cues while routes remain
unambiguous.

- [ ] **Step 3: Capture three truthful diagnostics**

Capture collision-only, matched fallback, and deliberate render-fault/missing-plane fallback views.
Keep debug state separate from normal captures. Diagnostics may show tile fallback only when
explicitly labelled as fallback evidence.

- [ ] **Step 4: Capture four exact matched before/after comparisons**

Use identical save, camera center, viewport, DPR, zoom, and bar placement for Sundrop main street,
connector midpoint, Silverpine tree wall, and Wildwood forest lane. Also attach the final full
master overview and clean Coast/Mistfen hedge crops.

- [ ] **Step 5: Stop at `NEEDS_CONTEXT` for the user's final verdict**

Provide absolute image/report paths, exact hashes/dimensions/settings, and an honest one-line
inspection of every view. Do not infer approval, stage, commit, mark the package final, or begin any
follow-on task until the user explicitly approves.

Before returning, prove the capture workflow changed no art, runtime, or gameplay source:

```bash
rtk git diff --exit-code -- \
  artifacts/meadow-entry/painted-v2/masters/ \
  artifacts/meadow-entry/painted-v2/exports/ \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts \
  public/game/assets/regions/meadow-entry-painted-v2/ \
  src/lib/game/content/maps/ \
  src/lib/game/phaser/
```

- [ ] **Step 6: After approval, record and commit evidence**

Record the user's exact answer with UTC-second timestamp. Run build, focused visual inventory tests,
targeted formatting, and diff-check. Stage only the approved report and image inventory, then:

```bash
rtk git commit -m "docs(art): approve forest-enriched Meadow visuals"
```

---

### Task 9: Run cumulative gates and independent whole-branch review

**Files:**
- Modify only files required by reproduced review findings.
- Final report:
  `.superpowers/sdd/2026-08-14-meadow-entry-painted-pilot-forest-enrichment/final-report.md`
  (ignored)

- [ ] **Step 1: Run cumulative deterministic gates**

Before the gates, record the end-state working-tree size and exact LFS inventory. Compare the
immutable pre-execution base recorded by Task 1 with the current final commit; do not prune LFS:

```bash
rtk git rev-parse HEAD
rtk du -sk artifacts/meadow-entry/painted-v2
rtk git lfs ls-files --all --long --size \
  --include="artifacts/meadow-entry/painted-v2/**/*.png"
rtk git lfs ls-files --long --size \
  --include="artifacts/meadow-entry/painted-v2/**/*.png" \
  0c65e3b5e1a3ec365402b809d4bc36876190e62a HEAD
```

The ledger records the start/end `rtk du -sk` values, base/final commits, and every added or replaced
LFS OID/path/size in the range. Working-tree size is reported separately from historical LFS-object
growth.

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-export-integration.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts
rtk bun test tools/probe-meadow-entry-texture-safety.test.ts
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
rtk bun run build
rtk bun run build:tauri
rtk git diff --check
```

Run whole `bun run lint` after removing only task-owned transient browser files. If preserved
unrelated ignored files still cause lint failure, record the exact baseline and run targeted
Prettier/ESLint over every changed source/test/report file; do not delete user evidence to obtain a
cosmetic whole-tree pass.

- [ ] **Step 2: Reconfirm runtime/browser evidence**

Require the committed texture probe decision to be `proceed`, exact two runtime files, successful
individual and repeat-each=2 painted-pilot E2E runs, exact 1920×1080 camera coverage, and the user's
final visual approval timestamp.

- [ ] **Step 3: Perform independent whole-branch review**

Review the full range from the Task 2 base through Task 8 for:

- exact ten blocker/seven insert/sixteen intersection contracts;
- no scenery mutation outside `sceneryAllowed`;
- complete provenance, proof, approval, storage, and LFS bindings for all sixteen assembly inputs
  (eight revised presentation sources, pinned Hero House, and seven inserts);
- unchanged nine-panel registry, two-crop runtime, control fingerprint semantics, gameplay,
  fallbacks, collision, routes, and pinned Hero House;
- truthful review/probe/browser reports and no accidental staging of rejected evidence.

For each valid finding, capture a genuine RED, apply the smallest scoped fix, rerun focused and
cumulative gates, commit separately, and obtain a re-review. Do not treat a report assertion as
evidence unless its underlying artifact/test reproduces.

- [ ] **Step 4: Close the continuation ledger**

Record final commit range, all gate results, master/export/runtime hashes and bytes, probe facts,
browser evidence, explicit user verdict, review findings/fixes, remaining concerns, and exact
preserved rejected artifacts. Include the Task 1/Task 9 working-tree byte comparison and exact LFS
OID/size delta. Verify tracked worktree cleanliness and report any unrelated untracked files without
modifying them.

## Definition of Done

The forest-enrichment revision is complete only when all of the following are true:

1. all eight presentation sources and seven inserts have independent, truthful histories and fresh
   approvals;
2. the exact 67-tile `groundAllowed` richness inventory and all ten `sceneryAllowed` blocker belts
   pass their separate objective and native-detail reviews;
3. the preassembly bake changes only `sceneryAllowed`, has zero class-union/hole boundary weight, an
   edge envelope that can reach `255` at inward depth `15`, final weight conditioned by organic
   clumps, deterministic percentile/weight/source hashes, and 25–70% row coverage; hedge and
   forest-bank rows satisfy p95 `<=0.30` and maximum `<=0.50` clump-run ratios; tree-wall rows have
   complete weighted-slice coverage over every slice whose edge envelope can reach threshold,
   explicit nullable entries for mask/envelope-caused non-evaluable slices, more than one contour
   pair, longest constant-contour run `<=0.50`, and no visible source rectangle;
4. production finalizer and review assembly share the same priority-stack path, and existing
   underlay, family, detail-feather, and pair-correction boundaries remain exact;
5. Hero House, gameplay controls, nine-panel registry, two runtime crops, ownership, routes,
   fallback behavior, and camera envelope remain frozen;
6. exports, proofs, approval, runtime data, storage, LFS, builds, E2E, and the exact two-texture probe
   are green; and
7. the final browser evidence is visibly richer and smoother, Silverpine/Wildwood read as natural
   forest edges, and the user explicitly approves the result.
