# Meadow Entry Painted Pilot Forest Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected sparse Meadow presentation candidate with richer ground detail and
natural forest depth baked only into ten already-blocked scenery belts, while preserving the
approved two-texture runtime, camera envelope, gameplay geometry, pinned Hero House source, and
all existing boundary-compositor contracts.

**Architecture:** Keep the completed pair compositor and exact 67-tile ground-eligibility contract
as prerequisites. Add one sealed, source-catalog-validated blocked-scenery contract and one pure
preassembly bake. Seven approval-bound hedge/woodland insert images are blended into four owning
decoded presentation sources through exact class masks and a 15px inward smoothstep. The existing
nine-panel assembler then runs unchanged in its established order: underlay north/south blends,
family handoff, detail feather, and paired-detail corrections. Publication continues to emit the
same two opaque 3200×3200 runtime textures.

**Tech Stack:** TypeScript, Vitest, Bun, Sharp, canonical RGBA/PNG helpers, built-in image
generation, Git LFS, Phaser 4, Playwright.

## Prerequisite and supersession state

- The approved design is
  `docs/superpowers/specs/2026-08-13-meadow-entry-painted-pilot-enrichment-handoff-design.md`.
- The completed compositor work from old Task 1 remains authoritative at commits `939ac71` and
  `a6593d7`.
- The completed exact 67-tile eligibility work from old Task 2 remains authoritative through
  commit `d374f3d`. It must not be changed to make generated art pass.
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

  decorationAllowed = groundAllowed | sceneryAllowed
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

---

### Task 1: Seal the blocked-scenery source contract before image generation

**Files:**
- Create:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts`
- Create:
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

- [ ] **Step 1: Inventory and freeze the rejected checkpoint**

Record current `rtk git status --short`, every dirty presentation PNG/JSON SHA-256, the attempt-2
master hash, the rejected browser/review image hashes, and rejection text in the ignored task report
and ledger. Do not copy or stage rejected bytes. Assert the pinned Hero House hash before proceeding.

- [ ] **Step 2: Write literal-contract RED tests**

Test exact blocker order, IDs, bounds, languages/classes, exact seven insert rows and paths, unique
IDs, owning bounds/priorities, and the exact sixteen intersections. Test rejection for:

- missing, extra, reordered, duplicate, or renamed blocker/insert rows;
- a selected source that is no longer catalog type `blocker`;
- catalog bounds that differ by one pixel;
- an insert bound or priority that differs from its owning source panel;
- a missing, extra, cross-class, or duplicate source/class coverage row;
- an insert for Sundrop north, either Sundrop detail, Hero House, or connector;
- any mutation of the nine source-panel registry rows.

Run the focused RED before creating production exports:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts
```

Expected RED: module/exports are absent; existing pilot tests remain green.

- [ ] **Step 3: Implement the frozen constants and validator**

Resolve catalog records through `collectMeadowEntrySourceCatalog()`. Intersect each literal blocker
with each of the nine panel bounds, discard empty intersections, and map every non-empty
intersection to exactly one same-owner/same-class insert. Freeze all exported arrays and nested
bounds. Do not read image bytes, create masks, or alter the source-panel registry here.

- [ ] **Step 4: Run focused GREEN and static gates**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts
rtk bun run check
rtk bunx prettier --check \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts
rtk bunx eslint \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts
rtk git diff --check
```

- [ ] **Step 5: Commit Task 1**

```bash
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts
rtk git commit -m "feat(art): seal Meadow blocked scenery contract"
```

---

### Task 2: Implement the pure preassembly scenery bake with synthetic TDD

**Files:**
- Create:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts`
- Create:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.ts`
- Modify:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts`
- Verify unchanged:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.ts`
- Verify unchanged:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts`
- Report:
  `.superpowers/sdd/2026-08-14-meadow-entry-painted-pilot-forest-enrichment/task-2-report.md`
  (ignored)

**Interfaces:**

```ts
export interface MeadowEntryPaintedV2SceneryMaskSet {
  readonly width: 6400;
  readonly height: 6400;
  readonly selectedBlockers: Uint8Array;
  readonly otherProtected: Uint8Array;
  readonly groundAllowed: Uint8Array;
  readonly sceneryAllowed: Uint8Array;
  readonly hedgeAllowed: Uint8Array;
  readonly woodlandAllowed: Uint8Array;
  readonly decorationAllowed: Uint8Array;
  readonly sourceHashes: Readonly<Record<string, string>>;
}

export interface DecodedMeadowEntryPaintedV2SceneryInsert {
  readonly id: string;
  readonly sceneryClass: MeadowEntryPaintedV2SceneryClass;
  readonly owningSourceId: string;
  readonly bounds: PixelBounds;
  readonly rgba: DecodedMeadowEntryRgba;
}

export interface MeadowEntryPaintedV2SceneryBakeResult {
  readonly panels: readonly MeadowEntryDetailDecodedPanel[];
  readonly enrichedSourceSha256: Readonly<Record<string, string>>;
  readonly changedPixelCount: number;
  readonly classChangedPixelCounts: Readonly<Record<MeadowEntryPaintedV2SceneryClass, number>>;
}

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

The implementation formula is exact:

```text
E0 = classAllowed
E(k+1) = { p in E(k) | every pixel in p's 3x3 neighborhood is in E(k) }
sceneryInsetDistance(p) = max k such that p is in E(k)
sceneryWeight = meadowEntryDetailFeatherWeight(min(sceneryInsetDistance(p), 15), 15)
enrichedSource = blendMeadowEntryDetailChannel(originalSource, insertSource, sceneryWeight)
```

- [ ] **Step 1: Write erosion, precedence, and blending RED tests**

Use tiny synthetic masks with an outer blocker edge and an irregular protected hole. Pin:

- `E0` equals the supplied binary class mask;
- every `E(k+1)` pixel has all nine pixels of its 3×3 neighborhood in `E(k)`;
- distance is zero at outer edges and hole edges, and caps at 15;
- weight equals `meadowEntryDetailFeatherWeight(min(distance, 15), 15)`;
- weight is zero on the boundary and 255 at inward depth 15;
- channel output equals `blendMeadowEntryDetailChannel(original, insert, weight)`;
- alpha remains 255 where the source is opaque;
- hedge and woodland masks are disjoint and application order cannot change output;
- pixels outside `sceneryAllowed`, within `otherProtected`, and in a wrong class remain byte-exact;
- all inputs remain unmutated and two runs are byte-identical;
- missing/extra insert rows fail before any pixel composition.

Run RED:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts
```

- [ ] **Step 2: Implement mask construction from current owning sources**

Build the production mask set by reusing the crop union, ownership/source catalog, existing control
renderers, route-core derivation, and exported `MEADOW_ENTRY_PROTECTION_MARGINS`. Omit only the ten
selected blocker IDs from `otherProtected`. Assert all masks are binary, exact 6400×6400, class
masks are disjoint, and `decorationAllowed === groundAllowed | sceneryAllowed` pixel-for-pixel.
Compute and return SHA-256 for every source raster and derivation input without changing the
gameplay control fingerprint. Extend the existing enrichment-review eligibility result with these
named masks and hashes; keep its 67-row `groundAllowed` tile inventory, bounds, counts, baseline,
and floors byte-for-byte unchanged.

- [ ] **Step 3: Implement the pure source-local bake**

Validate the coverage matrix before reading pixels. For each insert, sample local coordinates from
its owning source bounds and blend only where the matching class mask is set. Clone only the four
affected decoded sources:

```text
camera-underlay-sundrop-south
camera-underlay-crossroads-north
camera-underlay-crossroads-south
crossroads
```

Return every other decoded panel with byte-identical RGBA data. Hash the four enriched decoded RGBA
buffers. Do not encode them or overwrite normalized presentation PNGs.

- [ ] **Step 4: Add a synthetic full-assembly integration test**

Feed enriched synthetic sources into the existing underlay/detail assembly. Prove:

- source-local scenery changes survive within the mask;
- existing north/south blends and family handoff still own their boundaries;
- ordinary detail perimeter equality and both pair corrections remain exact;
- no pixel outside `sceneryAllowed` differs from assembly of the same presentation sources without
  inserts;
- no insert rectangle edge appears as a hard-copy boundary.

Do not wire the production finalizer yet; the seven approved insert files do not exist.

- [ ] **Step 5: Run focused GREEN and static gates**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
rtk bun run check
rtk bunx prettier --check \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts
rtk bunx eslint \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts
rtk git diff --check
```

The existing published master SHA must remain unchanged in this task.

- [ ] **Step 6: Commit Task 2**

```bash
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts
rtk git commit -m "feat(art): add Meadow blocked scenery bake"
```

---

### Task 3: Generate six presentation sources and five underlay inserts, then stop at the interim gate

**Files:**
- Replace raw/normalized PNG and panel JSON for:
  - `camera-underlay-sundrop-north`
  - `camera-underlay-sundrop-south`
  - `camera-underlay-crossroads-north`
  - `camera-underlay-crossroads-south`
  - `sundrop-north`
  - `sundrop-south`
- Create raw/normalized PNG and JSON for:
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

**Interfaces:**
- Six distinct presentation calls plus five distinct insert calls: exactly eleven first-attempt
  calls in this task.
- Presentation calls receive concept/palette, current panel, adjacent accepted painted pixels, and
  prose constraints only.
- Hedge calls receive only art references and the hedge language; woodland calls receive only art
  references and the regional woodland language. No mask/atlas/control reference is supplied.
- The temporary assembly uses the five inserts through Task 2's exact masks while retaining pinned
  Hero House and current connector/Crossroads detail bytes.

- [ ] **Step 1: Write review-tool RED coverage before generation**

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
  visible insert rectangle, protected overlap, or insufficient tile energy.

Run RED before any image call:

```bash
rtk bun run test:unit -- --run \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts
```

- [ ] **Step 2: Generate and inspect the four underlays in dependency order**

Use four distinct built-in image-generation calls:

1. Sundrop north;
2. Sundrop south using accepted north overlap pixels;
3. Crossroads north;
4. Crossroads south using accepted north overlap pixels.

Inspect raw output at original resolution before normalization. Reject broad grass-only fields,
trees/trunks on open ground, square pads, source frames, repeated stamp grids, straight material
bars, buildings, props, labels, and false doors. Normalize only candidates that pass raw review.

- [ ] **Step 3: Generate and inspect Sundrop north/south detail**

Use two distinct calls in north-then-south order. Require three visible motif families in the
representative main-street view while keeping route cores and building approaches quiet. Sundrop
must contain no baked tree or trunk. Inspect the full `2624×128` pair overlap and west/center/east
crops before acceptance.

- [ ] **Step 4: Generate and inspect the five underlay inserts**

Use five distinct calls. Insert canvases may contain their class across the whole image because the
deterministic mask owns visibility. Require organic irregular surfaces and reject any literal mask
shape, straight hedge bar, repeated tree stamp, landmark silhouette, path, building, label, or live
prop. Hedge excludes trunks/canopy; woodland shows at least two depth cues and shifts from
Silverpine conifer character northward to Wildwood broadleaf character southward.

- [ ] **Step 5: Normalize and write truthful per-input provenance**

For each accepted input record raw/normalized hashes, bytes, dimensions, exact uniform transform,
prompt, supplied reference paths/hashes, model availability, attempts and rejection reasons. Keep
presentation attempts monotonically numbered from their existing histories; insert histories begin
at attempt 1. Store inserts only at:

```text
artifacts/meadow-entry/painted-v2/source-inserts/raw/<insert-id>.png
artifacts/meadow-entry/painted-v2/source-inserts/<insert-id>.png
artifacts/meadow-entry/painted-v2/source-inserts/<insert-id>.json
```

- [ ] **Step 6: Build the temporary interim assembly and inspect all evidence**

Run the review writer in a temporary output root. The production master, exports, approval, runtime
assets, and public files must remain unchanged. Require all 67 rows to meet the energy floor and
human richness contract. Inspect every review image at original detail. Confirm the insert bake is
visible in Wildwood, invisible outside `sceneryAllowed`, and does not create a rectangle edge.

- [ ] **Step 7: Stop at `NEEDS_CONTEXT` for explicit interim approval**

Provide absolute paths for the full overview, six panel reviews, five insert reviews, seams,
Sundrop matched comparison, Wildwood forest-lane crop, blocker inventory, and all five density
sheets. State exact call count and attempts. Do not infer approval. Do not generate connector,
Crossroads detail, or the two Crossroads detail inserts. Do not bind root approval, stage, commit,
publish, or run the texture probe before the user's explicit verdict.

- [ ] **Step 8: After approval, bind metadata and commit only the interim inventory**

Record the user's answer and UTC-second timestamp in six panel JSONs, five insert JSONs, root
provenance, report, and ledger. Run focused review/scenery tests, storage, LFS, static, targeted
format/lint, and diff checks. Stage only approved Task 3 files and review evidence:

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

- [ ] **Step 3: Normalize, provenance-bind, and assemble all fifteen inputs in a temporary root**

The full candidate has exactly eight presentation inputs and seven insert inputs. Run the same
preassembly bake and unchanged ordinary assembly. Do not overwrite normalized presentation PNGs
with enriched bytes. Root draft provenance records all input histories but remains
`pending-final-source-gate`.

- [ ] **Step 4: Inspect the complete evidence inventory**

Require and inspect:

- eight presentation reviews and seven insert reviews at native detail;
- four enriched-source previews;
- both underlay seams, family handoff, full Sundrop pair, full connector/Crossroads pair, and all
  side/corner crops;
- ten clean blocker-row before/after crops plus one labelled overlay;
- five exact 67-tile sheets and inventory JSON;
- full master, temporary two-crop exports, Silverpine tree-wall, Wildwood forest-lane, coast hedge,
  Mistfen hedge, Hero House, and matched Sundrop/connector views;
- no grid, source rectangle, false blocker, duplicate prop, material jump, double darkening, alpha
  hole, blur mismatch, or lost route readability.

- [ ] **Step 5: Stop at `NEEDS_CONTEXT` for explicit final source approval**

Return absolute paths and one-line inspection verdicts. State attempts per input and exact scaling.
Do not publish master/package/runtime bytes, stage, or commit until the user explicitly approves.

- [ ] **Step 6: After approval, bind metadata and commit Task 4**

Record answer and UTC timestamp in two panel manifests, two insert manifests, root provenance,
report, and ledger. Run focused source/review/scenery tests, storage, LFS, check, targeted
Prettier/ESLint, and diff-check. Commit only final-source files and evidence:

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
Also add finalizer-level synthetic assertions that both detail-pair midpoints receive the sealed
pair correction, all four pair edges equal the ordinary composite, and the correction runs
immediately after each pair's second priority. These must fail against the current manual detail
loop before it is replaced.

- [ ] **Step 2: Decode and enrich before ordinary assembly**

Decode all nine panels and seven inserts. Call `enrichMeadowEntryPaintedV2Sources` once. Feed its
returned panels into the existing assembly helpers. Replace the finalizer's manual per-detail
`compositeMeadowEntryDetailPanel` loop with the already-sealed
`compositeMeadowEntryDetailPanels` priority-stack helper so both declared pair corrections run
immediately after their second members. Do not change its formulas, widths, pair table, or ordering.
Keep normalized presentation and insert PNG bytes untouched. Assert runtime crop opacity and
outside-pilot transparency exactly as before.

- [ ] **Step 3: Extend deterministic provenance**

Root provenance contains:

- `blockedSceneryInserts`: exact seven rows with IDs/classes/paths/bounds/owners/priorities,
  raw/normalized/provenance hashes, attempts, approval answer, reviewer, and timestamp;
- `blockedSceneryBake`: exact sixteen coverage rows, selected/other-protected/ground/scenery/hedge/
  woodland/decoration mask hashes, source-catalog hash, formulas/helper IDs, 15px inset cap,
  changed-pixel counts, and exact decoded-RGBA hashes for the four enriched owning sources.

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
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
rtk bun run check
rtk git diff --check
```

Capture `rtk git status --short` before and after `--check`; require no mutation.

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

Require status unchanged across all `--check` commands.

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
Prettier/ESLint, LFS fsck, and diff-check. Commit:

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
- complete provenance, proof, approval, storage, and LFS bindings for all fifteen art inputs;
- unchanged nine-panel registry, two-crop runtime, control fingerprint semantics, gameplay,
  fallbacks, collision, routes, and pinned Hero House;
- truthful review/probe/browser reports and no accidental staging of rejected evidence.

For each valid finding, capture a genuine RED, apply the smallest scoped fix, rerun focused and
cumulative gates, commit separately, and obtain a re-review. Do not treat a report assertion as
evidence unless its underlying artifact/test reproduces.

- [ ] **Step 4: Close the continuation ledger**

Record final commit range, all gate results, master/export/runtime hashes and bytes, probe facts,
browser evidence, explicit user verdict, review findings/fixes, remaining concerns, and exact
preserved rejected artifacts. Verify tracked worktree cleanliness and report any unrelated
untracked files without modifying them.

## Definition of Done

The forest-enrichment revision is complete only when all of the following are true:

1. all eight presentation sources and seven inserts have independent, truthful histories and fresh
   approvals;
2. exact 67-tile ground richness and all ten blocked scenery belts pass objective and native-detail
   review;
3. the preassembly bake changes only `sceneryAllowed`, has zero edge weight, full inward weight,
   deterministic hashes, and no visible source rectangle;
4. existing underlay, family, detail-feather, and pair-correction boundaries remain exact;
5. Hero House, gameplay controls, nine-panel registry, two runtime crops, ownership, routes,
   fallback behavior, and camera envelope remain frozen;
6. exports, proofs, approval, runtime data, storage, LFS, builds, E2E, and the exact two-texture probe
   are green; and
7. the final browser evidence is visibly richer and smoother, Silverpine/Wildwood read as natural
   forest edges, and the user explicitly approves the result.
