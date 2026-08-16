# Meadow Entry Painted Pilot Forest Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected sparse Meadow presentation candidate with richer ground detail and
natural forest depth baked only into ten already-blocked scenery belts, while preserving the
approved two-texture runtime, camera envelope, gameplay geometry, pinned Hero House source, and
all existing boundary-compositor contracts.

**Architecture:** Keep the completed pair compositor, five-mask authority, organic scenery bake,
and exact 67-tile `groundAllowed` eligibility contract as prerequisites. Task 2 corrects the
rejected bake by retaining an immutable raw contribution matrix and applying two bounded,
language-aware weight shapers before the existing owner-priority tone composition: sparse saturated
cores are deterministically eroded/capped, while tree walls receive an edge-envelope-constrained
continuity and minimum-coverage floor. Task 3 evaluates the preserved bytes through that corrected
path, regenerates the two inputs that already violate the `<=2x` transform contract, and regenerates
any other source only when objective or native review still fails. Task 5 publishes the approved
master through the already-sealed finalizer. Publication continues to emit the same two opaque
3200×3200 runtime textures.

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
- The organic-bake correction at `50e0a07` and its review-contract fix at `41925cd` are the current
  code baseline. They preserve the five-raster mask authority, pair-corrected production/review
  parity, owner-relative tones, organic signals, and the 15px edge envelope, but they do not satisfy
  the rejected row-topology gate.
- Design amendment `8df10b9` is the authority for the language-aware topology correction. It does
  not reopen masks, geometry, thresholds, runtime ownership, pair formulas, or the pinned Hero House
  source.
- The approved source checkpoint at `0caefd1` and the current unstaged five-insert correction are
  superseded visual evidence. Preserve their hashes, histories, and review images, but do not stage,
  approve, or publish either assembled result. The corrected candidate fails nine of ten blocker
  rows; only `silverpine-wall-B-south` passes every row gate.
- The same rejected checkpoint contains two independently invalid normalization transforms:
  `camera-underlay-crossroads-north-blocked-hedge` at `2.064516129032258x` and
  `camera-underlay-crossroads-south-blocked-woodland` at `2.04211869814933x`. Their next accepted
  versions must come from new bounded attempts even if topology shaping makes the old pixels look
  acceptable.
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
- Across the complete branch, keep the independently regenerated histories for exactly these eight
  presentation IDs at their existing registry paths, bounds, roles, dimensions, and assembly
  priorities; revised Task 3 reuses a current passing attempt instead of spending another call:
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
- Keep the row thresholds exact: common weighted coverage is `25%`–`70%` at final weight `>=32`;
  sparse clump runs use final weight `>=254`, p95 `<=0.30`, and maximum `<=0.50`; tree-wall contour
  and slice coverage use final weight `>=32` only where the existing edge envelope is already
  `>=32`.
- Sparse shaping may cap only raw weights `>=254` to `191` after the smallest passing 8-neighbour
  erosion count from `0` through `15`. Tree shaping may only apply `max(rawWeight, 32)` to existing
  source contributions with `edgeWeight>=32`; it may not invent a tone or promote a low-envelope
  boundary pixel.
- Derive every shaping request from one immutable raw contribution matrix, union requests once, and
  recompute all final row metrics without row-to-row feedback. Coverage fill counts distinct world
  pixels rather than contribution records. Keep higher numeric owner priority as the later assembly
  priority.
- Do not stage unrelated dirty/rejected evidence. Before every commit, inspect
  `rtk git diff --cached --name-status` and compare it with the task inventory.

## Risks and Cost Controls

- `artifacts/meadow-entry/painted-v2/` is already approximately `672 MB` in the working tree,
  including approximately `107 MB` of source panels and `84 MB` of source inserts. Its PNGs are
  Git LFS objects, so every raw/normalized replacement and retained rejected attempt permanently
  grows repository history even when the working-tree path is overwritten.
- Do not make any image-generation call until the language-aware topology compositor, exact
  rejected-row regression, five-mask memory contract, and production/review parity gate are
  independently GREEN and independently reviewed. Re-evaluate preserved bytes first; regenerate
  the two invalid-scale inputs unconditionally and regenerate every other source only when the
  corrected objective/native gate still fails.
- Preserve the maximum of five attempts per input. Do not add an attempt to compensate for a code,
  mask, metric, or assembly-path defect.
- Never prune or rewrite Git LFS history in this plan. Task 9 records starting and ending
  working-tree bytes plus the exact added/replaced LFS OIDs and sizes so a later revision decision
  sees its real storage cost.
- The branch remains intentionally non-publishable: the finalizer describes the pair-corrected
  future master while checked-in package bytes remain frozen. Revised Task 2 changes only in-memory
  scenery shaping and its tests; only Task 5 may close the state by publishing the user-approved
  scenery bake and master.

---

### Task 1: Verify the already-sealed blocked-scenery source contract

**Status:** Completed prerequisite. Do not rerun or recommit this task unless the sealed table drifts.

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

- [x] **Step 1: Inventory the rejected checkpoint and the existing sealed contract**

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

- [x] **Step 2: Verify the literal contract already committed at `782f9aa`**

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

- [x] **Step 3: Prove no tracked file changed**

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

### Task 2: Correct the organic bake with language-aware topology shaping

**Files:**
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts`
- Verify unchanged:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts`
- Verify unchanged:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.ts`
- Verify unchanged:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts`
- Verify unchanged:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.ts`
- Verify unchanged:
  `tools/render-meadow-entry-painted-v2-enrichment-review.ts`
- Verify unchanged:
  `tools/render-meadow-entry-painted-v2-enrichment-review.test.ts`
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
  `.superpowers/sdd/2026-08-14-meadow-entry-painted-pilot-forest-enrichment/task-2-topology-report.md`
  (ignored)

**Interfaces:**

```ts
export interface MeadowEntryPaintedV2SceneryContribution {
  readonly blockerId: string;
  readonly insertId: string;
  readonly owningSourceId: string;
  readonly ownerPriority: number;
  readonly sceneryClass: MeadowEntryPaintedV2SceneryClass;
  readonly worldIndex: number;
  readonly rawFinalWeight: number;
  readonly organicSignal: number;
  readonly edgeWeight: number;
  readonly ownerRelativeTone: readonly [number, number, number];
}

export interface MeadowEntryPaintedV2SparseTopologyProvenance {
  readonly kind: 'sparse-core-cap';
  readonly erosionCount: number;
  readonly originalSaturatedPixelCount: number;
  readonly retainedSaturatedPixelCount: number;
  readonly demotedContributionCount: number;
  readonly requestSha256: string;
}

export interface MeadowEntryPaintedV2TreeTopologyProvenance {
  readonly kind: 'tree-continuity-floor';
  readonly missingSlicePromotionCount: number;
  readonly coveragePromotionCount: number;
  readonly promotedWorldPixelCount: number;
  readonly requestSha256: string;
}

export type MeadowEntryPaintedV2SceneryTopologyProvenance =
  | MeadowEntryPaintedV2SparseTopologyProvenance
  | MeadowEntryPaintedV2TreeTopologyProvenance;

export interface MeadowEntryPaintedV2SceneryTopologyRequest {
  readonly contributionIndex: number;
  readonly blockerIds: readonly string[];
  readonly reasons: readonly (
    | 'sparse-core-cap'
    | 'tree-missing-slice'
    | 'tree-coverage-floor'
  )[];
  readonly insertId: string;
  readonly worldIndex: number;
  readonly rawWeight: number;
  readonly shapedWeight: number;
}

export interface MeadowEntryPaintedV2SceneryTopologyResult {
  readonly shapedWeights: Uint8Array;
  readonly rowTopology: Readonly<Record<string, MeadowEntryPaintedV2SceneryTopologyProvenance>>;
  readonly requests: readonly MeadowEntryPaintedV2SceneryTopologyRequest[];
  readonly requestSha256: string;
}

export function shapeMeadowEntryPaintedV2SceneryContributions(
  contributions: readonly MeadowEntryPaintedV2SceneryContribution[],
  blockers: readonly MeadowEntryPaintedV2SceneryBlocker[],
  width: number,
  height: number
): MeadowEntryPaintedV2SceneryTopologyResult;

// Add these fields to the existing bake-result interface:
export interface MeadowEntryPaintedV2SceneryBakeResult {
  readonly topologyRequests: readonly MeadowEntryPaintedV2SceneryTopologyRequest[];
  readonly topologyRequestSha256: string;
}

// Add raw/shaped audit fields to the existing metric interfaces:
export interface MeadowEntryPaintedV2SceneryIntersectionMetric {
  readonly rawWeightSha256: string;
}

export interface MeadowEntryPaintedV2SceneryRowMetricBase {
  readonly rawWeightSha256: string;
  readonly topology: MeadowEntryPaintedV2SceneryTopologyProvenance;
}
```

`shapedWeights[index]` is parallel to `contributions[index]`. Contributions retain the sealed
sixteen-intersection order and row-major sample order. Unioned requests sort by
`contributionIndex`; each request's `blockerIds` and `reasons` sort ascending and deduplicate before
the existing stable-JSON SHA-256 helper hashes them. The function never mutates its input.
The existing `weightSha256` fields become hashes of shaped weights; each intersection and row also
adds `rawWeightSha256`. Each row adds its discriminated `topology` value above. The bake formula map
adds these exact IDs:

```ts
{
  sparseTopology: 'saturated-core-erode8-smallest-0..15-cap191-v1',
  treeTopology: 'raw-matrix-edge32-slice-repair-unique-coverage25-v1',
  topologyRequestUnion: 'immutable-raw-request-union-v1'
}
```

All mask derivation, source-local tone math, q40/q80, organic smoothstep, 15px edge envelope,
priority-stack assembly, and published artifacts remain as implemented at `41925cd`.

- [ ] **Step 1: Record the rejected facts and write topology RED tests**

Append the exact rejected checkpoint to the ignored topology report before editing production code:

```text
four sparse failures:
  coast-crossroads-mouth-bank       p95 0.46875, max 0.53125
  mistfen-entry-bank-east           p95 0.53125, max 0.53125
  wildwood-forest-lane-west-bank    p95 0.484375, max 0.53125
  wildwood-north-climb-west-bank    p95 0.4375, max 0.53125
five tree-slice failures:
  A-east 280/292, A-west 221/226, B-north 149/158,
  C-east 39/66 with coverage 0.05550621669626998, C-west 217/232
passing no-op row:
  B-south 376/376
```

Pin the already-dirty rejected Task 3 adapter bytes so Task 2 can prove it did not absorb them:

```text
tools/render-meadow-entry-painted-v2-enrichment-review.ts
  19cfa3ecd7e2e57b5bedfded6b60247807c17f9e39c7b2d67f99fe076003e4d7
tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
  e0b50d27672fc6ce17269b08ab6062856092bec22afc34aa7bc71d6c1efd4e8b
```

In `meadow-entry-painted-v2-scenery-bake.test.ts`, add a uniform saturated sparse belt fixture and
a tree fixture with both a missing evaluable slice and sub-25% coverage. The first RED assertion is:

```ts
expect(() =>
  shapeMeadowEntryPaintedV2SceneryContributions(contributions, blockers, width, height)
).not.toThrow();
```

Before implementation, the import must fail because the function and topology result do not exist.
The complete RED fixture must additionally pin:

- smallest passing erosion count in `0..15`;
- cap `191` only for raw weights `>=254` removed from the retained core;
- unchanged raw weights below `254` and unchanged `>=32` sparse coverage;
- cap requests for every saturated overlap contribution at a demoted world pixel;
- tree candidates restricted to the literal row and `edgeWeight>=32`;
- descending raw weight, organic signal, edge weight, and numeric owner priority, followed by
  ascending insert ID and world index;
- one winner per distinct world pixel, missing-slice repair even when raw coverage is already 25%,
  and no coverage fill when projected post-repair coverage is already 25%;
- immutable raw-matrix request derivation, one union/apply pass, and overlapping tree rows whose
  input order is reversed;
- hard failures for erosion count above 15, a missing slice with no capable contribution, too few
  capable distinct pixels for 25%, sparse/tree eligible overlap, and a final uniform contour.

Run only the focused file and preserve the exact missing-export failure:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts
```

- [ ] **Step 2: Retain the immutable raw contribution matrix**

In the existing per-intersection sample loop, stop discarding fields after direct map aggregation.
Append one contribution record per eligible sample in the sealed coverage-matrix order and existing
row-major sample order while preserving the current integer values:

```ts
contributions.push({
  blockerId: intersection.blockerId,
  insertId: insert.id,
  owningSourceId: insert.owningSourceId,
  ownerPriority: insert.owningSourcePriority,
  sceneryClass: insert.sceneryClass,
  worldIndex: index,
  rawFinalWeight: finalWeight,
  organicSignal: sample.weight,
  edgeWeight,
  ownerRelativeTone: detail as [number, number, number]
});
```

Assert integer ranges (`worldIndex`, `0..255` signals/weights/tones), exact blocker/insert membership,
and non-overlap between every sparse row's eligible world pixels and every tree-wall row's eligible
world pixels. Do not alter the source-local prefix sums, sample membership, q40/q80, masks, or tones.

- [ ] **Step 3: Implement sparse saturated-core shaping**

For each `hedge` or `forest-bank` row, aggregate raw final weights by world pixel with `max`, create
the `>=254` core, and call the existing `erodeMeadowEntryMask8` repeatedly. Recompute the existing
clump-run metric after each erosion and stop at the first p95 `<=0.30` and maximum `<=0.50`:

```ts
for (let erosionCount = 0; erosionCount <= 15; erosionCount += 1) {
  if (p95 <= 0.30 && maximum <= 0.50) break;
  retainedCore = erodeMeadowEntryMask8(retainedCore, width, height);
}
```

Derive every cap request from the frozen raw matrix. For an original core pixel absent from the
retained core, cap only matching contributions with `rawFinalWeight>=254` to `191`. Union repeated
requests with `Math.min(rawFinalWeight, 191)`. Do not change sub-254 weights. Return exact erosion,
core-count, contribution-count, request-hash, raw-hash, and shaped-hash provenance. Throw when no
count through 15 passes.

- [ ] **Step 4: Implement tree continuity and unique-pixel coverage shaping**

Build missing-slice and coverage requests from the same frozen raw matrix. Use this comparator
literally; positive numeric priority is later and therefore sorts first:

```ts
const compareContribution = (left, right) =>
  right.rawFinalWeight - left.rawFinalWeight ||
  right.organicSignal - left.organicSignal ||
  right.edgeWeight - left.edgeWeight ||
  right.ownerPriority - left.ownerPriority ||
  left.insertId.localeCompare(right.insertId) ||
  left.worldIndex - right.worldIndex;
```

For each evaluable slice lacking raw weight `>=32`, choose the first row-local candidate with
`edgeWeight>=32` and request weight `32`. Then project those requests, choose one winner for each
remaining unweighted world pixel, and request the minimum number of distinct pixels needed for
`ceil(0.25 * eligiblePixelCount)`. Never choose a low-envelope contribution or count two
contributions at one pixel twice.

Derive all six row request sets before applying any. Union requests per contribution with
`Math.max(rawFinalWeight, 32)`, apply once, then recompute all rows. Throw unless every final row is
within 25%–70%, every evaluable slice is weighted, the contour has more than one pair, and its
longest constant ratio is `<=0.50`. `silverpine-wall-B-south` must produce zero requests and identical
raw/shaped hashes.

- [ ] **Step 5: Integrate shaped weights and exact provenance into the bake result**

Call the shaper exactly once after all sixteen intersections have produced raw contributions and
before building per-insert/per-owner weight maps. Aggregate only `shapedWeights` into the existing
composition; continue choosing a tone by shaped weight and insert-ID tie-break exactly as before.
Add `rawWeightSha256`, shaped `weightSha256`, `topology`, the globally unioned request inventory, and
stable request hashes to returned intersection/row provenance. Keep the four enriched owner IDs and
all unchanged panel identities.

Run focused GREEN:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts
```

- [ ] **Step 6: Prove the rejected real rows close without generating art**

Render the current preserved bytes into a fresh temporary root with the existing uncommitted review
adapter, but do not edit or stage that adapter in Task 2:

```bash
MEADOW_TOPOLOGY_REVIEW_ROOT="$(rtk mktemp -d /private/tmp/gliese-meadow-topology.XXXXXX)"
rtk bun tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  --mode candidate \
  --assemble-sources \
  --contact-sheets \
  --source-review \
  --output-root "$MEADOW_TOPOLOGY_REVIEW_ROOT"
```

Read the emitted `decoration-candidate.json` and require all ten shaped rows to pass their unchanged
thresholds. Pin exact raw/shaped hashes and requests in the ignored report; assert all nine former
failures close and B-south remains a no-op. Inspect the clean overview and ten row crops only to
catch a topology implementation that passes numbers while creating a visible rectangle. If any row
or native crop fails, stop and revise Task 2 code; do not generate an image or weaken a metric.

- [ ] **Step 7: Run no-drift gates and commit only topology code**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts
rtk bun run check
rtk bunx prettier --check \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts
rtk bunx eslint \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts
rtk git diff --exit-code -- \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.ts \
  artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png \
  artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json \
  artifacts/meadow-entry/painted-v2/exports/ \
  src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts \
  public/game/assets/regions/meadow-entry-painted-v2/
rtk shasum -a 256 \
  tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk git diff --check
```

The `shasum` output must exact-match the two pinned values above. The tool files already contain
rejected Task 3 work, so do not expect the overall working tree to be clean. Stage exactly the two
bake files:

```bash
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts
rtk git diff --cached --name-status
rtk git commit -m "fix(art): shape Meadow forest topology"
```

- [ ] **Step 8: Obtain independent review before any image call**

Review the exact Task 2 commit for immutable raw-matrix semantics, smallest sparse erosion, sub-254
preservation, envelope-capable tree candidates, unique-world-pixel coverage, no row feedback,
request/hash provenance, no-op B-south, all ten real row gates, non-mutation, and exact two-file
scope. Fix every valid finding in a separate commit and obtain re-review. Task 3 cannot begin until
this review is GREEN.

---

### Task 3: Re-evaluate preserved sources, replace invalid-scale inserts, and stop at the interim gate

**Files:**
- Replace unconditionally with new bounded attempts:
  - `artifacts/meadow-entry/painted-v2/source-inserts/raw/camera-underlay-crossroads-north-blocked-hedge.png`
  - `artifacts/meadow-entry/painted-v2/source-inserts/camera-underlay-crossroads-north-blocked-hedge.png`
  - `artifacts/meadow-entry/painted-v2/source-inserts/camera-underlay-crossroads-north-blocked-hedge.json`
  - `artifacts/meadow-entry/painted-v2/source-inserts/raw/camera-underlay-crossroads-south-blocked-woodland.png`
  - `artifacts/meadow-entry/painted-v2/source-inserts/camera-underlay-crossroads-south-blocked-woodland.png`
  - `artifacts/meadow-entry/painted-v2/source-inserts/camera-underlay-crossroads-south-blocked-woodland.json`
- Replace only when shaped objective/native review still fails:
  - presentation IDs `camera-underlay-sundrop-north`, `camera-underlay-sundrop-south`,
    `camera-underlay-crossroads-north`, `camera-underlay-crossroads-south`, `sundrop-north`, and
    `sundrop-south` at their existing raw/normalized/JSON paths;
  - insert IDs `camera-underlay-sundrop-south-blocked-hedge`,
    `camera-underlay-crossroads-south-blocked-hedge`, and
    `camera-underlay-crossroads-north-blocked-woodland` at their existing paths.
- Modify:
  `tools/render-meadow-entry-painted-v2-enrichment-review.ts`
- Modify:
  `tools/render-meadow-entry-painted-v2-enrichment-review.test.ts`
- Modify after approval only:
  `artifacts/meadow-entry/painted-v2/provenance.json`
- Replace review evidence under:
  `docs/superpowers/reports/img/hpa-586-painted-v2-enrichment/forest-interim/`
- Report:
  `.superpowers/sdd/2026-08-14-meadow-entry-painted-pilot-forest-enrichment/task-3-report.md`
  (ignored)

**Restart state:**

- Commit `0caefd1` is a withdrawn source checkpoint; its prior user answer does not approve a new
  topology-shaped assembly.
- The current dirty five-insert attempt-3 bytes, manifests, two review-tool files, and rebuilt
  evidence are rejected audit history. Record exact hashes and diffs before overwriting or extending
  them. Do not reset, clean, restore, or stage them as approval.
- Attempt 3 of `camera-underlay-crossroads-north-blocked-hedge` is invalid at
  `2.064516129032258x`; attempt 3 of
  `camera-underlay-crossroads-south-blocked-woodland` is invalid at `2.04211869814933x`. Their next
  calls are attempt 4, not attempt 1.
- Task 2's topology commit, real ten-row GREEN, unchanged-package proof, and independent GREEN review
  are prerequisites. No image call is allowed before all four are recorded.

**Interfaces:**

The review payload consumes Task 2's result directly. It must expose, without recomputation:

```ts
blockedSceneryBake: {
  intersections: readonly {
    blockerId: string;
    insertId: string;
    rawWeightSha256: string;
    weightSha256: string;
  }[];
  rows: readonly {
    blockerId: string;
    rawWeightSha256: string;
    weightSha256: string;
    topology: MeadowEntryPaintedV2SceneryTopologyProvenance;
  }[];
  formulas: Readonly<Record<string, string>>;
}
```

Normalization preflight is exact:

```text
coverScale = max(3200 / rawWidth, 1664 / rawHeight)
accept only when coverScale <= 2
equivalent minimum raw dimensions: width >= 1600 and height >= 832
```

- [ ] **Step 1: Extend the dirty review adapter with genuine RED coverage**

First record the current two-file diff and hashes in the ignored report. Extend the existing direct
`node:test` suite to require raw/shaped hashes, sparse/tree topology provenance, request hashes, all
ten passing final rows, and a normalization preflight failure containing the exact offending ID and
scale. Construct immutable synthetic manifest copies from the recorded attempt-3 fields so this
regression remains after the live files are replaced:

```ts
assert.throws(
  () => assertReviewSourceTransform(northHedgeManifest),
  /camera-underlay-crossroads-north-blocked-hedge.*2\.064516129032258/
);
assert.throws(
  () => assertReviewSourceTransform(southWoodlandManifest),
  /camera-underlay-crossroads-south-blocked-woodland.*2\.04211869814933/
);
```

Run the correct direct test command, not the Vitest command that previously skipped this suite:

```bash
rtk bun test tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
```

Expected RED is limited to the missing transform guard and missing topology assertions. Do not call
image generation to make this test green. Wire the guard into normal candidate/source-review mode;
do not add a bypass flag.

- [ ] **Step 2: Seal the preserved-byte reuse decision from Task 2 evidence**

Use Task 2's temporary-root output as the one permitted preserved-byte evaluation. Verify its input
hashes still equal the current presentation/insert paths, then copy its per-input verdicts,
raw/shaped metrics, and original-detail findings into the Task 3 report. Do not rerun candidate mode
after the transform guard is active: the two known invalid manifests must truthfully stop that path.

Reuse a preserved presentation source or one of the three valid-scale inserts only when Task 2's
full native review, seams/handoffs, protected/live overlays, q40/q80, raw/shaped topology, unchanged
row thresholds, and region language passed. Record the exact reuse and correction lists before any
image call. Rejection of the combined assembly alone is not permission to regenerate a passing
source. If any input hash drifted since Task 2, stop and repeat Task 2's no-generation evaluation
against the new bytes before classifying it.

- [ ] **Step 3: Generate the two mandatory scale replacements, then only proven visual failures**

Use `imagegen` once per input, with distinct calls and no masks/atlases/control rasters. Generate
attempt 4 for the north hedge and south woodland first. Prompts keep the approved regional language:

```text
north hedge: low organic region-correct brush/reeds; no trunks, canopy mass, path, building,
             landmark, label, repeated stamp, straight bar, or rectangular frame
south woodland: irregular Wildwood broadleaf surface with varied undergrowth, roots, ferns,
                leaf litter and soft canopy depth; no path, prop, label, repeated tree stamp,
                straight material band, or rectangular frame
```

Inspect each raw at original resolution before normalization. Reject immediately when width is below
1600, height is below 832, or native pixels show a forbidden motif. If attempt 4 fails, make at most
one attempt 5 for that same input; reaching attempt 5 without a passing raw stops Task 3.

Only after both mandatory replacements pass may the reuse audit trigger other calls. Preserve this
dependency order: underlay north then south, Sundrop detail north then south, then the remaining
underlay-owned inserts. Feed only accepted adjacent art pixels to a dependent call. The report lists
every call and why it was necessary.

- [ ] **Step 4: Normalize accepted raws and append truthful histories**

Normalize with uniform cover scale and deterministic center crop. Record native/resized/crop
dimensions, exact scale, kernel, raw/normalized SHA-256 and bytes, prompt, supplied art-reference
paths/hashes, model result ID, attempt number, rejection reason, and original-detail verdict. Do not
overwrite a normalized or manifest path until the raw passes both native and `<=2x` preflight.

Keep insert paths exact:

```text
artifacts/meadow-entry/painted-v2/source-inserts/raw/<insert-id>.png
artifacts/meadow-entry/painted-v2/source-inserts/<insert-id>.png
artifacts/meadow-entry/painted-v2/source-inserts/<insert-id>.json
```

- [ ] **Step 5: Rebuild and inspect the complete interim evidence inventory**

After every selected replacement has a valid transform, run candidate mode for the first time under
the new hard guard:

```bash
rtk bun tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  --mode candidate \
  --assemble-sources \
  --contact-sheets \
  --source-review \
  --output-root docs/superpowers/reports/img/hpa-586-painted-v2-enrichment/forest-interim
```

Require:

- six presentation reviews, five insert reviews, and five native crops per input;
- four enriched-owner previews, both underlay seams, family handoff, Sundrop pair sides, four Hero
  House edges, matched Sundrop richness, Wildwood forest lane, and full overview;
- all five exact 67-tile sheets and unchanged minimum/median energy floors;
- all sixteen intersections with q40/q80 plus raw/shaped hashes;
- all ten rows within 25%–70%, all four sparse rows at p95 `<=0.30` and maximum `<=0.50`, all six
  tree rows with complete evaluable-slice coverage and non-uniform contours;
- explicit sparse erosion/cap and tree repair/coverage request inventories, with B-south a no-op;
- zero mutation outside `sceneryAllowed`, no edge-envelope bypass, no insert rectangle, no grid,
  no straight dark bar, and no tree/trunk on open traversable ground.

Inspect every PNG at original detail. A metric pass does not override a visible rectangle, repeated
stamp, false collision cue, or abrupt material boundary.

- [ ] **Step 6: Run focused, storage, and no-write gates**

```bash
rtk bun test tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts
rtk bun run art:storage:meadow-entry
rtk git lfs fsck
rtk bun run check
rtk bunx prettier --check \
  tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk bunx eslint \
  tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk git diff --exit-code -- \
  artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png \
  artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json \
  artifacts/meadow-entry/painted-v2/exports/ \
  src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts \
  public/game/assets/regions/meadow-entry-painted-v2/
rtk git diff --check
```

- [ ] **Step 7: Stop at `NEEDS_CONTEXT` for explicit interim approval**

Provide absolute paths for the overview, six panel reviews, five insert reviews, seams, matched
Sundrop view, Wildwood crop, ten row crops, topology inventory, and five density sheets. State the
reuse list, call count, attempt numbers, exact transforms, all raw/shaped hashes, shaping requests,
and row metrics. Do not infer approval. Do not generate connector/Crossroads detail or its two
inserts, bind root approval, stage, commit, publish, or run the texture probe before the user's
explicit verdict.

- [ ] **Step 8: After approval, bind metadata and commit only the interim inventory**

Record the exact answer and UTC-second timestamp in the six presentation manifests, five insert
manifests, root provenance, report, and ledger. Repeat Step 6 after metadata binding. Inspect
`rtk git diff --cached --name-status` and exclude every superseded/rejected-only path. Commit:

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
Inspect each raw at original resolution and reject it before normalization unless it is at least
`1600×832`, needs no more than `2x` cover scale, and contains no literal mask/frame/bar language.

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
- exact compositor-returned q40/q80 plus raw/shaped weight hashes for every intersection, common
  coverage for every row, sparse erosion/cap provenance, tree repair/coverage request provenance,
  hedge/forest-bank p95 and maximum clump-run ratios, and tree-wall continuous-contour
  metrics/hashes;
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
  counts/q40/q80/raw/shaped weight hashes, exact common per-row eligible/weighted counts and
  coverage, sparse erosion/core/cap request inventories, tree missing-slice/coverage promotion
  inventories, immutable request-union hashes, hedge/forest-bank clump-run metrics, tree-wall
  continuous-contour metrics/profile hashes, changed-pixel counts, and decoded-RGBA hashes for the
  four enriched owning sources.

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
- Modify:
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
- immutable raw contribution shaping, exact sparse/tree request inventories, edge-envelope-capable
  promotions, unique-world-pixel coverage, and no row-order feedback;
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
   clumps, immutable raw-to-shaped request provenance, deterministic percentile/weight/source
   hashes, and 25–70% row coverage; hedge and forest-bank rows use the exact `>=254` clump threshold,
   smallest passing erosion, saturated-only cap `191`, p95 `<=0.30`, and maximum `<=0.50`;
   tree-wall rows promote only existing `edgeWeight>=32` contributions to exactly `32`, count unique
   world pixels, have complete weighted-slice coverage over every evaluable slice, explicit nullable
   entries for mask/envelope-caused non-evaluable slices, more than one contour pair, longest
   constant-contour run `<=0.50`, and no visible source rectangle;
4. production finalizer and review assembly share the same priority-stack path, and existing
   underlay, family, detail-feather, and pair-correction boundaries remain exact;
5. Hero House, gameplay controls, nine-panel registry, two runtime crops, ownership, routes,
   fallback behavior, and camera envelope remain frozen;
6. exports, proofs, approval, runtime data, storage, LFS, builds, E2E, and the exact two-texture probe
   are green; and
7. the final browser evidence is visibly richer and smoother, Silverpine/Wildwood read as natural
   forest edges, and the user explicitly approves the result.
