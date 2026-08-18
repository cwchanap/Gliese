# Meadow Entry Organic Baked-Scenery Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all seven rejected Meadow scenery donors with organic generated hedge and woodland
art, blend their ten sealed blocker rows into the existing two base textures without rectangular
edges, and suppress the matching live blocker visuals while preserving gameplay geometry and
fallback behavior.

**Architecture:** Keep the existing five-mask, 15px core-weight, topology-shaping, pair-compositor,
camera-envelope, and two-crop runtime contracts sealed. Assemble immutable source panels into one
canonical `6400x6400` pre-scenery master first, then apply the deterministic core-and-apron scenery
pass exactly once in world coordinates. Use that result to review seven fresh donor images and switch
production finalization only after the user approves the exact candidate master. Publication then
extends the existing bake-ownership generator to the ten sealed blocker IDs and cuts the same two
runtime textures from that one master; no new plane, descriptor, collision, or renderer branch is
introduced.

**Tech Stack:** TypeScript, Vitest, Bun, Sharp, canonical RGBA/PNG helpers, built-in image
generation, Git LFS, Phaser 4, Playwright.

## Global Constraints

- The approved design is
  `docs/superpowers/specs/2026-08-17-meadow-entry-organic-baked-scenery-correction-design.md` at or
  after commit `88a12087658290cc7ed345e9de6983d7ba316009`.
- Classify this as a `revision` under `gliese-world-expansion`; collision, routes, transitions,
  actors, pickups, discoveries, encounters, saves, and camera geometry remain frozen.
- Use `2d-game-asset-workflow` for generated raster normalization and provenance, `imagegen` for
  every new donor raster, `superpowers:test-driven-development` for code changes, and
  `superpowers:verification-before-completion` before every completion claim.
- Keep exactly these two opaque runtime crops and no foreground plane:
  - `painted-v2-sundrop-camera-base`: `(0,3200)–(3200,6400)`, `3200x3200`, draw order `0`;
  - `painted-v2-crossroads-camera-base`: `(2368,2240)–(5568,5440)`, `3200x3200`, draw order `10`.
- Keep the sealed ten-row blocker inventory, bounds, languages, classes, and seven insert rows in
  `meadow-entry-painted-v2-scenery.ts` unchanged.
- Keep the existing core composition byte-for-byte unchanged: five public `6400x6400` masks,
  15px inward Chebyshev distance, q40/q80 organic signal, hedge detail cap `32`, woodland detail cap
  `48`, sparse/tree topology shaping, priority order, and row metrics.
- The apron is scratch-only. It has pre-exclusion radius `48`, near ramp `8`, maximum weight
  `96/255`, per-channel residual cap `12`, and final luma-shift cap `16`. It never enters topology
  shaping or any public control fingerprint.
- Subtract `otherProtected`, building footprints, transitions, rewards/discoveries, semantic
  anchors, and route core from the apron. No test may demand a full halo through an exclusion.
- Keep all raw and normalized source panels immutable during scenery composition. Ordinary underlay
  and detail assembly, pair correction, and feathering produce the canonical pre-scenery master.
  Apply core and apron after that assembly, once per world pixel.
- Retain source-panel and runtime-crop overlap for camera coverage. It must not create duplicate
  art ownership: candidate selection is global by
  `(weight desc, ownerPriority desc, insertId asc)`, every world pixel receives at most one scenery
  contribution, and the two exported crop overlap buffers must be byte-identical.
- High-contrast trunks, roots, hedge faces, and canopy interiors remain inside the exact blocker
  core. Apron pixels may contain only low foliage, leaf litter, grass, reeds, ground shadow, or
  ground-level branches.
- Replace all seven donor raw/normalized/provenance triples with seven distinct built-in generation
  calls. Permit at most five attempts per insert and record every attempt independently.
- Image generation receives accepted art pixels only: the owning normalized panel and one adjacent
  accepted normalized panel. Never provide a control SVG, mask raster, blocker overlay, rectangle
  atlas, route diagram, debug capture, or rejected runtime screenshot.
- Normalize with uniform cover scale and deterministic center crop, never stretch, output canonical
  opaque RGBA, and reject any raw requiring more than `2x` uniform upscaling.
- Extend visual ownership to all and only the ten sealed scenery blocker IDs through the existing
  bake-ownership/runtime generator. Every one is fully owned by
  `painted-v2-crossroads-camera-base`; the existing four decor owners remain unchanged.
- A healthy Crossroads crop hides each sealed live blocker. A missing or render-faulted Crossroads
  crop restores each blocker independently. A Sundrop-only fault does not restore those blockers.
- Keep Hero House outer-boundary strips and unrelated connector fence/decor sources out of this
  plan. Preserve and report them as separate blocking visual findings; do not claim overall branch
  visual approval while they remain unresolved.
- Preserve all existing untracked Task 8 images, reports, `.playwright-cli/`, attempt-2 evidence, and
  comparison directories. Before each commit, inspect `rtk git diff --cached --name-status` and
  stage only the current task inventory.
- Maintain the ignored ledger at
  `.superpowers/sdd/2026-08-17-meadow-entry-organic-baked-scenery-correction/progress.md`; record every
  RED, GREEN, image attempt, user gate, commit, blocker, hash, and no-write result.

## File Ownership Map

| Responsibility | Owning files |
| --- | --- |
| Sealed blocker/insert IDs, bounds, class, and owner priority | `meadow-entry-painted-v2-scenery.ts` and its test; verify only |
| Existing core bake, new scratch apron, row/topology provenance | `meadow-entry-painted-v2-scenery-bake.ts` and its test |
| Candidate-only source review and temporary master evidence | `tools/render-meadow-entry-painted-v2-enrichment-review.ts` and its test |
| Seven generated donor triples and generation history | `artifacts/meadow-entry/painted-v2/source-inserts/` |
| Production assembly and master/root provenance | painted-v2 pilot finalizer, master-provenance modules, and CLI |
| Exact visual-owner policy | `meadow-entry-bake-ownership.ts` and runtime generator |
| Two runtime exports, proofs, approval, and public copies | existing export/proof/approval/runtime writers and generated artifacts |
| Healthy/faulted runtime behavior | background-transform, Phaser scene, and painted-pilot E2E tests |
| Real texture upload decision | existing texture-probe tool, frozen JSON, and preflight report |
| Cause-scoped human visual gate | organic-scenery runtime captures and visual-review report |

These responsibilities form one dependent publication pipeline rather than independent subprojects:
the apron must pass before generation, generated bytes must be approved before finalization, and the
approved master must exist before ownership/package/runtime verification.

### Approved execution amendment — world-canonical overlap correction

The user rejected the first Task 2 candidate after native review showed conflicting decoration in
the overlap. At `2026-08-18T04:34:41Z` the user approved the following ruling:

1. preserve the seven accepted donor triples and all rejected-candidate evidence;
2. mark the first candidate master SHA
   `2e2ffb13522c5f956194e7213867468a499ffdbf6b02dc83909011fe5b421dd7` as rejected and never bind it
   as an approval;
3. reopen Task 1 for a focused compositor fix before resuming Task 2;
4. leave source panels byte-identical, assemble them first, then evaluate and apply one canonical
   world-space scenery result per eligible master pixel;
5. keep the overlap only for camera coverage and require exact exported-overlap equality;
6. rebuild candidate evidence under `world-canonical-v2/` so rejected evidence is not overwritten;
7. stop again at a fresh `NEEDS_CONTEXT` visual gate. No prior `yes` applies to the rebuilt master.

---

### Task 1: Add the deterministic organic-apron candidate compositor

**Files:**

- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts:41-169`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts:514-604`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts:1610-1980`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts`
- Modify: `tools/render-meadow-entry-painted-v2-enrichment-review.ts`
- Modify: `tools/render-meadow-entry-painted-v2-enrichment-review.test.ts`
- Verify unchanged: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts`
- Verify unchanged: `artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png`
- Report:
  `.superpowers/sdd/2026-08-17-meadow-entry-organic-baked-scenery-correction/task-1-report.md`
  (ignored)

**Interfaces:**

- Consumes: existing `MeadowEntryPaintedV2SceneryMaskSet`, one already-assembled canonical
  `6400x6400` RGBA master, decoded inserts, `meadowEntrySceneryInsetDistances`, and
  `meadowEntryDetailFeatherWeight`.
- Produces:

```ts
export const MEADOW_ENTRY_PAINTED_V2_ORGANIC_APRON_POLICY = Object.freeze({
  maximumDistance: 48,
  nearRampDistance: 8,
  maximumWeight: 96,
  maximumChannelResidual: 12,
  maximumLumaShift: 16
} as const);

export interface MeadowEntryPaintedV2SceneryApronProvenance {
  readonly policy: typeof MEADOW_ENTRY_PAINTED_V2_ORGANIC_APRON_POLICY;
  readonly candidateSha256: Readonly<Record<'hedge' | 'woodland', string>>;
  readonly allowedSha256: Readonly<Record<'hedge' | 'woodland', string>>;
  readonly distanceSha256: Readonly<Record<'hedge' | 'woodland', string>>;
  readonly weightSha256: string;
  readonly changedPixelCount: number;
  readonly classChangedPixelCounts: Readonly<Record<'hedge' | 'woodland', number>>;
}

export interface MeadowEntryPaintedV2OrganicWorldSceneryBakeResult
  extends MeadowEntryPaintedV2SceneryBakeResult {
  readonly master: DecodedMeadowEntryRgba;
  readonly apron: MeadowEntryPaintedV2SceneryApronProvenance;
  readonly selectedWorldPixelCount: number;
}

export function meadowEntrySceneryOutwardDistances(
  coreAllowed: Uint8Array,
  width: number,
  height: number,
  maximumDistance?: number
): Uint8Array;

export function enrichMeadowEntryPaintedV2WorldWithOrganicApron(
  preSceneryMaster: DecodedMeadowEntryRgba,
  inserts: readonly DecodedMeadowEntryPaintedV2SceneryInsert[],
  masks: MeadowEntryPaintedV2SceneryMaskSet,
  topologyBlockers?: readonly MeadowEntryPaintedV2SceneryBlocker[]
): MeadowEntryPaintedV2OrganicWorldSceneryBakeResult;
```

- The legacy source-panel entry points remain available only as regression or migration seams in
  this task. Candidate mode must assemble immutable source panels first and call the world entry
  point. The checked-in master and package remain byte-stable until Task 3.

- [ ] **Step 1: Record the immutable baseline**

Write current HEAD, tracked status, master/provenance/export hashes, all seven donor hashes, and the
five public mask hashes to the ignored report and ledger. Preserve the current untracked evidence.

```bash
rtk git rev-parse HEAD
rtk git status --short
rtk shasum -a 256 \
  artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png \
  artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json \
  artifacts/meadow-entry/painted-v2/exports/painted-v2-sundrop-camera-base.png \
  artifacts/meadow-entry/painted-v2/exports/painted-v2-crossroads-camera-base.png
```

- [ ] **Step 2: Write the apron RED tests**

Add tests with synthetic `9x9`, `17x17`, and real `6400x6400` masks. The focused RED must prove the
new exports do not exist before implementation and then pin all exact semantics:

```ts
expect(MEADOW_ENTRY_PAINTED_V2_ORGANIC_APRON_POLICY).toEqual({
  maximumDistance: 48,
  nearRampDistance: 8,
  maximumWeight: 96,
  maximumChannelResidual: 12,
  maximumLumaShift: 16
});

expect(outward[coreIndex]).toBe(0);
expect(outward[adjacentOutsideIndex]).toBe(1);
expect(outward[fortyEightStepsOutsideIndex]).toBe(48);
expect(outward[fortyNineStepsOutsideIndex]).toBe(49);
expect(apronWeight[coreBoundaryIndex]).toBe(0);
expect(apronWeight[outerBoundaryIndex]).toBe(0);
expect(Math.max(...apronWeight)).toBeLessThanOrEqual(96);
```

Also assert:

- all five public mask arrays and hashes are byte-identical before/after candidate composition;
- core row metrics, topology requests, and topology hash exactly equal the legacy
  `enrichMeadowEntryPaintedV2Sources` result;
- protected/route/building/transition/reward/discovery/semantic pixels have apron weight `0`;
- every changed apron channel differs from the pre-scenery owner by at most `12` and every apron
  luma differs by at most `16`;
- no pixel outside `coreAllowed | apronAllowed` changes;
- reversed decoded insert input order produces an identical world master and provenance hashes;
- the input master and all source-panel buffers remain byte-identical;
- synthetic overlapping inserts select one contribution by
  `(weight desc, ownerPriority desc, insertId asc)` and report one selected world pixel, not one per
  owner;
- no apron pixel appears in a topology request.

Run:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts
```

Expected: RED because the policy, outward-distance helper, provenance type, and organic candidate
entry point are absent.

- [ ] **Step 3: Implement the exact outward-distance and weight helpers**

Implement `meadowEntrySceneryOutwardDistances` by inverting the binary class mask, calling the
existing `meadowEntrySceneryInsetDistances` with cap `maximumDistance + 1`, and converting an
outside inset distance `d` to the 8-neighbour step count `d + 1`. Core pixels stay `0`; pixels beyond
the requested radius receive the sentinel `maximumDistance + 1`.

For each class and outside pixel with distance `1..48`, derive:

```ts
const nearFade = meadowEntryDetailFeatherWeight(Math.min(distance, 8), 8);
const farFade =
  255 - meadowEntryDetailFeatherWeight(Math.max(distance - 8, 0), 40);
const edgeWeight = Math.min(96, nearFade, farFade);
const finalWeight = halfUp(edgeWeight * organicWeight, 255);
```

For each sealed blocker/insert intersection, expand the exact intersection bounds by `48px`, clip to
the insert and world bounds, and reuse that intersection's existing core-derived q40/q80 values when
computing apron `organicWeight`. Build `apronAllowed` only after subtracting every existing
exclusion. Gather candidates in one world-indexed map across every insert and class. Hash candidate,
allowed, distance, and final sparse weight records with the existing stable SHA helpers. Keep these
arrays local and return only hashes/counts in provenance.

- [ ] **Step 4: Factor donor sampling without changing the core path**

Extract the existing owner-relative donor sampling into a private helper that accepts the donor
pixel, local means, canonical pre-scenery master pixel, and channel cap. Call it with cap `32/48` for
core and `12` for apron. Core and apron candidates use each insert's existing owner priority and
resolve all world-pixel collisions by `(weight desc, ownerPriority desc, insertId asc)`. Core wins
over apron before that comparator is applied.

Blend an apron channel using the existing half-up channel blender. Assert the resulting apron pixel
has per-channel delta `<=12` and luma delta `<=16` from the canonical pre-scenery master. Compose
the shaped core first, then apron, onto a clone of that master and return one world result plus
required apron provenance. Do not pass apron contributions to
`shapeMeadowEntryPaintedV2SceneryContributions`.

- [ ] **Step 5: Add candidate review mode without changing production finalization**

Update the review renderer to assemble the frozen underlay and detail panels first, clone/hash that
pre-scenery master, call `enrichMeadowEntryPaintedV2WorldWithOrganicApron`, and emit:

```text
organic-scenery-overview.png
organic-scenery-apron-overlay.png
organic-scenery-inventory.json
blocker-row-coast-crossroads-mouth-bank.png
blocker-row-mistfen-entry-bank-east.png
blocker-row-silverpine-wall-A-east.png
blocker-row-silverpine-wall-A-west.png
blocker-row-silverpine-wall-B-north.png
blocker-row-silverpine-wall-B-south.png
blocker-row-silverpine-wall-C-east.png
blocker-row-silverpine-wall-C-west.png
blocker-row-wildwood-forest-lane-west-bank.png
blocker-row-wildwood-north-climb-west-bank.png
insert-camera-underlay-sundrop-south-blocked-hedge-native.png
insert-camera-underlay-crossroads-north-blocked-hedge-native.png
insert-camera-underlay-crossroads-south-blocked-hedge-native.png
insert-camera-underlay-crossroads-north-blocked-woodland-native.png
insert-camera-underlay-crossroads-south-blocked-woodland-native.png
insert-crossroads-blocked-hedge-native.png
insert-crossroads-blocked-woodland-native.png
```

The JSON binds the policy, five unchanged mask hashes, scratch hashes/counts, legacy core topology
hash, ten row metrics, seven donor hashes, and candidate master hash. Add a renderer test that
rejects missing/extra rows, an apron hash not matching the candidate result, a public sixth mask,
and any output outside the requested review root.

Add an exact source immutability assertion and a synthetic overlap regression proving that two
inserts covering the same world pixel produce one selected contribution. Extract both approved
runtime crop rectangles from the candidate master and assert the geometric overlap buffers are
byte-identical.

- [ ] **Step 6: Run GREEN and package no-drift gates**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts
rtk bun test tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
rtk bun run check
rtk bunx prettier --check \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk bunx eslint \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk git diff --exit-code -- \
  artifacts/meadow-entry/painted-v2/masters/ \
  artifacts/meadow-entry/painted-v2/exports/ \
  artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts \
  public/game/assets/regions/meadow-entry-painted-v2/
rtk git diff --check
```

- [ ] **Step 7: Commit Task 1**

Stage only the four source/test files. Inspect the staged inventory and commit:

```bash
rtk git diff --cached --name-status
rtk git commit -m "feat(art): add organic Meadow scenery apron"
```

#### Task 1 fix round 2/5 — world-canonical overlap

This round is mandatory before Task 2 resumes. Capture a genuine RED that demonstrates two
overlapping source owners can currently write different scenery at one world coordinate. Replace
the candidate-only call path with the world-space entry point above; do not modify donor bytes,
panel bytes, masks, geometry, feather constants, runtime crops, or publication artifacts.

The focused GREEN must additionally prove:

- base/detail assembly output before scenery is unchanged from the sealed assembly helpers;
- each world index has at most one chosen core/apron candidate;
- input panel/master/insert buffers are not mutated;
- reversing insert order is byte-identical;
- the first rejected Task 2 candidate cannot satisfy the new overlap invariant;
- candidate review output is written only beneath `world-canonical-v2/`.

Append RED/GREEN evidence to the Task 1 report and ledger. Commit only the compositor/review-tool
source and tests in a separate commit:

```bash
rtk git diff --cached --name-status
rtk git commit -m "fix(art): make Meadow scenery world-canonical"
```

---

### Task 2: Generate all seven organic donors and stop at the visual gate

**Files:**

- Replace the seven raw PNGs under:
  `artifacts/meadow-entry/painted-v2/source-inserts/raw/`
- Replace the seven normalized PNGs and seven provenance JSON files under:
  `artifacts/meadow-entry/painted-v2/source-inserts/`
- Modify: `artifacts/meadow-entry/painted-v2/provenance.json`
- Add review inventory under:
  `docs/superpowers/reports/img/hpa-586-painted-v2-organic-scenery/`
- Modify only if evidence output needs a correction:
  `tools/render-meadow-entry-painted-v2-enrichment-review.ts`
- Modify only with a renderer correction:
  `tools/render-meadow-entry-painted-v2-enrichment-review.test.ts`
- Verify unchanged: `artifacts/meadow-entry/painted-v2/masters/`
- Verify unchanged: `artifacts/meadow-entry/painted-v2/exports/`
- Verify unchanged: `src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts`
- Report:
  `.superpowers/sdd/2026-08-17-meadow-entry-organic-baked-scenery-correction/task-2-report.md`
  (ignored)

**Interfaces:**

- Consumes: the seven sealed `MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS`, candidate compositor from
  Task 1, accepted source-panel PNGs, and built-in `imagegen`.
- Produces: seven approved raw/normalized/provenance triples plus one exact temporary candidate
  master hash and a cause-scoped review inventory. It does not publish the master or runtime assets.

- [ ] **Step 1: Seal the seven-call reference and prompt inventory**

Use these art-only reference pairs:

```text
camera-underlay-sundrop-south-blocked-hedge:
  camera-underlay-sundrop-south.png + sundrop-south.png
camera-underlay-crossroads-north-blocked-hedge:
  camera-underlay-crossroads-north.png + camera-underlay-crossroads-south.png
camera-underlay-crossroads-south-blocked-hedge:
  camera-underlay-crossroads-south.png + camera-underlay-crossroads-north.png
camera-underlay-crossroads-north-blocked-woodland:
  camera-underlay-crossroads-north.png + camera-underlay-crossroads-south.png
camera-underlay-crossroads-south-blocked-woodland:
  camera-underlay-crossroads-south.png + camera-underlay-crossroads-north.png
crossroads-blocked-hedge:
  camera-underlay-crossroads-north.png + camera-underlay-crossroads-south.png
crossroads-blocked-woodland:
  camera-underlay-crossroads-south.png + camera-underlay-crossroads-north.png
```

Use one distinct built-in call per insert. The shared prompt prefix is:

```text
Top-down hand-painted JRPG environmental surface matching the supplied Gliese Meadow Entry art.
Create one continuous contextual donor canvas with natural regional ground and organically embedded
obstacle scenery. Vary silhouette, spacing, depth, leaf color, shadow, and ground integration. No
path, building, door, actor, pickup, sign, landmark, label, sprite row, repeated stamp cadence,
rectangular frame, straight bar, tile grid, or debug overlay. Do not reproduce a supplied object;
match only palette, brushwork, scale, lighting, and terrain material.
```

Append exactly one class instruction:

```text
Hedge: low irregular Coast or Mistfen brush/reeds with soft ground integration, small natural gaps,
and no trunks or canopy mass.

Tree wall: varied impassable tree clusters with partial trunks, roots, understory, canopy shadow, and
irregular depth; no uniform strip or repeated tree row.

Forest bank: layered Wildwood edge with shrubs, ferns, leaf litter, roots, intermittent trunks, and
deep canopy shadow; no horizontal or vertical band.
```

Record exact prompt, prompt SHA, reference paths/hashes, model result ID, native dimensions, and
attempt number before normalization.

#### Approved retry-family amendment — 2026-08-18T01:30:58Z

The user approved one new attempt family only for
`camera-underlay-crossroads-north-blocked-hedge` after its original five attempts were rejected.
Preserve those five attempt records and findings. The amended family uses the path-free Crossroads
South underlay reference shown above and appends this exact suffix to the otherwise unchanged shared
prompt and Hedge instruction:

```text
Wide landscape donor canvas, at least 1600 pixels wide. No path, road, track, stone corridor, or
crossing anywhere in the image.
```

This amended family receives at most five fresh attempts. The scale limit, native-detail visual
gates, masks, geometry, apron constants, compositor policy, and all other insert recipes remain
unchanged. If the amended family passes, continue the remaining five inserts under their original
sealed recipes. If it exhausts five failures, stop again at `BLOCKED` without publication.

#### Approved South retry-family amendment — 2026-08-18T02:06:29Z

After the original `camera-underlay-crossroads-south-blocked-hedge` family exhausted five attempts
on the unchanged `2x` cover-scale gate, the user approved one new attempt family only for that
insert. Preserve those five rejected attempts and findings. The amended family uses the path-free
Crossroads North underlay reference shown above and appends the same exact suffix used by the
successful amended North family:

```text
Wide landscape donor canvas, at least 1600 pixels wide. No path, road, track, stone corridor, or
crossing anywhere in the image.
```

This South-only amended family receives at most five fresh attempts. The scale limit, native-detail
visual gates, masks, geometry, apron constants, compositor policy, and every remaining insert recipe
remain unchanged. If it passes, continue the remaining four inserts under their original sealed
recipes. If it exhausts five failures, stop again at `BLOCKED` without publication.

#### Approved woodland retry-family amendment — 2026-08-18T02:32:37Z

After `camera-underlay-crossroads-north-blocked-woodland` exhausted five original attempts on the
unchanged `2x` cover-scale gate, the user approved fresh attempt families for both 3200-by-1664
woodland inserts. Preserve the five rejected North attempts and their findings. Each amended family
uses the reciprocal path-free Crossroads underlay reference shown above and appends this exact suffix
to the otherwise unchanged shared prompt and Tree-wall instruction:

```text
Wide landscape donor canvas, at least 1600 pixels wide. No path, road, track, stone corridor, or
crossing anywhere in the image.
```

Each woodland family receives at most five fresh attempts. The `2x` scale limit, Tree-wall class
language, native-detail visual gates, masks, geometry, apron constants, compositor policy, and the
two remaining Crossroads insert recipes remain unchanged. If either woodland family exhausts five
failures, stop at `BLOCKED` without publication. If both pass, continue the remaining two inserts
under their original sealed recipes.

#### Approved portrait Crossroads retry-family amendment — 2026-08-18T03:02:11Z

After `crossroads-blocked-hedge` exhausted five original attempts because its Crossroads and
connector references repeatedly induced dominant path/corridor material, the user approved fresh
attempt families for both remaining 1728-by-1952 Crossroads inserts. Preserve those five rejected
hedge attempts and their findings. Each amended family uses the reciprocal path-free Crossroads
underlay references shown above and appends this exact suffix to its otherwise unchanged shared and
class-specific prompt:

```text
Tall portrait donor canvas, at least 1000 pixels wide and 1200 pixels tall. No path, road, track,
stone corridor, or crossing anywhere in the image.
```

Each portrait Crossroads family receives at most five fresh attempts. The `2x` scale limit, Hedge
and Forest-bank class language, native-detail visual gates, masks, geometry, apron constants, and
compositor policy remain unchanged. If either family exhausts five failures, stop at `BLOCKED`
without publication. If both pass, continue normalization and candidate evidence under the original
Task 2 gate.

- [ ] **Step 2: Generate and inspect seven fresh attempt-1 raws**

Call built-in image generation seven times, once per sealed insert. Inspect every raw at original
resolution before copying it to the target path. Reject a raw immediately for a visible frame,
straight bar, grid, repeated stamp, path/building/object cue, wrong class language, or a required
cover scale greater than `2x`.

If a raw fails, preserve its hash and finding in provenance/report and make a new distinct call for
that same insert. Stop the task at the fifth failed attempt for any one insert; do not alter geometry,
masks, apron constants, or gates.

- [ ] **Step 3: Normalize accepted raws deterministically**

For every accepted raw, apply uniform cover scale and deterministic center crop to the exact sealed
insert bounds. Write canonical opaque RGBA PNGs. Record this measured structure:

```ts
interface RecordedOrganicInsertTransform {
  readonly native: { readonly width: number; readonly height: number };
  readonly scaled: { readonly width: number; readonly height: number };
  readonly crop: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
  readonly output: { readonly width: number; readonly height: number };
  readonly scale: number;
  readonly kernel: 'lanczos3';
}
```

Bind raw/normalized bytes and SHA-256, prompt/reference hashes, attempt history, native-detail
verdict, and `pending-fresh-user-gate`.

- [ ] **Step 4: Assemble the exact temporary organic candidate**

Run candidate review mode without touching production master/export/runtime paths:

```bash
rtk bun tools/render-meadow-entry-painted-v2-enrichment-review.ts \
  --mode candidate \
  --assemble-sources \
  --contact-sheets \
  --source-review \
  --output-root docs/superpowers/reports/img/hpa-586-painted-v2-organic-scenery/world-canonical-v2
```

Require the inventory from Task 1 plus:

- all seven donor native reviews;
- all ten row crops with core/apron bounds labelled outside the art image;
- Coast/Mistfen hedge, Silverpine tree-wall, and Wildwood forest-bank camera crops;
- connector village-mouth hedge and connector Crossroads-mouth hedge crops;
- full-master overview, underlay seams, family handoff, route/protected overlay, and collision-only
  diagnostic;
- source handoff crops and the full runtime-crop overlap, with exact byte-equality result recorded;
- the temporary master SHA and exact five unchanged public mask hashes.

Inspect all images at original detail. A structural pass does not override a visible rectangle,
uniform stamp cadence, hard material edge, duplicate live sprite, false blocker, or obscured route.

- [ ] **Step 5: Run candidate gates and prove publication paths are frozen**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-enrichment-review.test.ts
rtk bun test tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk bun run art:storage:meadow-entry
rtk git lfs fsck
rtk bun run check
rtk git diff --exit-code -- \
  artifacts/meadow-entry/painted-v2/masters/ \
  artifacts/meadow-entry/painted-v2/exports/ \
  artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json \
  src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts \
  public/game/assets/regions/meadow-entry-painted-v2/
rtk git diff --check
```

- [ ] **Step 6: Stop at `NEEDS_CONTEXT` for explicit user approval**

Return absolute paths to the full overview, seven donor reviews, ten row crops, five cause-scoped
normal crops, and collision/fallback diagnostics. State every attempt count and normalization scale,
the temporary master SHA, all row metrics, apron hashes/counts, and the known out-of-scope Hero House
and connector-fence findings. Do not infer approval and do not stage, commit, publish, or regenerate
runtime files.

- [ ] **Step 7: After approval, bind the exact answer and commit Task 2**

Record the exact answer and UTC-second timestamp in all seven provenance files, root provenance,
report, and ledger. Preserve prior attempts as superseded history. Re-run Steps 4 and 5 and require
the temporary master SHA to remain identical after metadata binding.

Stage exactly seven raw PNGs, seven normalized PNGs, seven provenance JSON files, root provenance,
the final review inventory, and any Task-1 review-tool correction. Commit:

```bash
rtk git diff --cached --name-status
rtk git commit -m "art(world): regenerate organic Meadow scenery donors"
```

---

### Task 3: Switch finalization to the approved organic candidate and assemble the master

**Files:**

- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-master-provenance.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts`
- Modify: `tools/finalize-meadow-entry-painted-v2-pilot.ts`
- Regenerate: `artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png`
- Regenerate:
  `artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json`
- Modify: `artifacts/meadow-entry/painted-v2/provenance.json`
- Report:
  `.superpowers/sdd/2026-08-17-meadow-entry-organic-baked-scenery-correction/task-3-report.md`
  (ignored)

**Interfaces:**

- Consumes: the user-approved Task 2 donor bytes, candidate master SHA, and
  `enrichMeadowEntryPaintedV2WorldWithOrganicApron`.
- Produces: the production master and provenance with pixels exactly equal to the approved temporary
  candidate. It does not yet republish exports or runtime assets.

- [ ] **Step 1: Write integration RED tests**

Change the finalizer expectation from the legacy enrichment function to the organic candidate entry
point. Add tests that require:

```ts
const provenance = JSON.parse(result.provenanceJson.toString('utf8'));
expect(sha256(result.masterPng)).toBe(approvedCandidateMasterSha256);
expect(provenance.blockedSceneryBake.apron.policy).toEqual(
  MEADOW_ENTRY_PAINTED_V2_ORGANIC_APRON_POLICY
);
expect(provenance.blockedSceneryBake.apron.changedPixelCount).toBeGreaterThan(0);
expect(provenance.blockedSceneryBake.formulas.core).toEqual(legacyCoreFormulas);
```

Reject a missing apron provenance block, wrong policy literal, stale donor hash, public sixth mask,
core topology drift, or production master not equal to the approved Task 2 candidate. Keep existing
repeat-run byte equality, alpha, pair correction, source-panel inventory, and `--check` no-write tests.

Run the focused suite and observe RED because production still calls the legacy entry point.

- [ ] **Step 2: Wire only the approved organic entry point**

Keep source-panel decoding and ordinary underlay/detail assembly unchanged. After
`assembleMeadowEntryPaintedV2Underlay` and `compositeMeadowEntryDetailPanels` produce the canonical
pre-scenery master, call `enrichMeadowEntryPaintedV2WorldWithOrganicApron` exactly once. Extend
master/root provenance with the exact
policy, candidate/allowed/distance/weight hashes, class and total changed-pixel counts, and existing
core topology/row/formula fields. Preserve stable JSON order and every unrelated panel, control,
crop, overlap, generation-history, and approval field.

Update `assertSceneryEnrichmentBounds` to allow changes in either `sceneryAllowed` or the recomputed
apron-allowed union, while still requiring `otherProtected === 0`, zero alpha mutation, and byte
identity everywhere else.

- [ ] **Step 3: Generate and inspect the production master**

```bash
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
```

Require the generated master SHA to equal the Task 2 approved temporary master SHA. Inspect full
overview, all ten row crops, both crop seams, family handoff, Coast/Mistfen, Silverpine, Wildwood,
and connector hedge at native detail. Record Hero House and unrelated connector-fence findings as
out-of-scope blockers, not as a reason to mutate this task.

- [ ] **Step 4: Run GREEN and no-write verification**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts
MEADOW_ORGANIC_FINALIZER_BEFORE="$(rtk git status --short)"
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
MEADOW_ORGANIC_FINALIZER_AFTER="$(rtk git status --short)"
rtk test "$MEADOW_ORGANIC_FINALIZER_BEFORE" = "$MEADOW_ORGANIC_FINALIZER_AFTER"
rtk bun run check
rtk git diff --check
```

- [ ] **Step 5: Commit Task 3**

Stage only finalizer/provenance code and tests, the master PNG, master provenance, and root
provenance. Commit:

```bash
rtk git diff --cached --name-status
rtk git commit -m "feat(art): assemble organic Meadow scenery master"
```

---

### Task 4: Extend exact blocker ownership and republish the same two-texture package

**Files:**

- Modify: `src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts:1055-1075`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts`
- Modify: `src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts`
- Regenerate: `artifacts/meadow-entry/painted-v2/controls/`
- Regenerate: `artifacts/meadow-entry/painted-v2/exports/`
- Regenerate active proofs under: `artifacts/meadow-entry/painted-v2/proofs/`
- Regenerate: `artifacts/meadow-entry/painted-v2/provenance/`
- Regenerate: `src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts`
- Regenerate: `src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts`
- Regenerate: `public/game/assets/regions/meadow-entry-painted-v2/`
- Modify literal approval tests when generated hashes change:
  `src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts`
- Report:
  `.superpowers/sdd/2026-08-17-meadow-entry-organic-baked-scenery-correction/task-4-report.md`
  (ignored)

**Interfaces:**

- Consumes: the Task 3 master, exact ten-row registry, existing bake-ownership generator, controls
  exporter/approval, export/proof writers, package approval, and runtime generator.
- Produces: the same two runtime descriptors and exactly fourteen visual owners: ten sealed blockers
  plus the existing four decor rows.

- [ ] **Step 1: Write ownership and generated-inventory RED tests**

Add a literal expected blocker list:

```ts
const expectedOrganicBlockerOwners = [
  'coast-crossroads-mouth-bank',
  'mistfen-entry-bank-east',
  'silverpine-wall-A-east',
  'silverpine-wall-A-west',
  'silverpine-wall-B-north',
  'silverpine-wall-B-south',
  'silverpine-wall-C-east',
  'silverpine-wall-C-west',
  'wildwood-forest-lane-west-bank',
  'wildwood-north-climb-west-bank'
] as const;
```

Require every row to use `base-static`, `existing-blocker-fallback`, and the class-correct motif; to
resolve to exactly this owner crop:

```ts
{
  cropId: 'painted-v2-crossroads-camera-base',
  requiredBackgroundIds: ['meadow-entry-painted-v2-crossroads-camera-base-image']
}
```

Pin exactly fourteen generated visual owners, unchanged four decor rows, two background descriptors,
no insert asset, and no foreground descriptor. Reject missing/extra/reordered owner rows, a selected
blocker left `protected-live`, a nonselected blocker changed from its current policy, or a crop that
does not completely contain the source plus margins.

Run the focused suite and observe RED because only `silverpine-wall-B-south` is currently owned.

- [ ] **Step 2: Extend only the ten explicit painted-v2 policies**

Replace the single selected blocker entry in `PAINTED_V2_BASE_STATIC_POLICIES` with ten literal
entries. Use `painted-low-hedge` for the two hedge rows, `painted-tree-wall` for six tree-wall rows,
and `painted-forest-bank` for two forest-bank rows. Keep `BASE_MARGINS`,
`existing-blocker-fallback`, all unrelated policies, source order, and geometry unchanged. Update the
independent reviewed ownership SHA only after the literal test computes the new expected seal.

- [ ] **Step 3: Regenerate and approve controls**

Set `MEADOW_ORGANIC_USER_REVIEWED_AT` to the exact UTC-second timestamp already recorded at the
Task 2 user gate. Assert it matches all seven approved donor manifests and the root provenance; do
not replace it with the current clock time.

```bash
rtk bun tools/export-meadow-entry-art-controls.ts
rtk bun tools/approve-meadow-entry-controls.ts \
  --reviewed-by chanwaichan \
  --reviewed-at "$MEADOW_ORGANIC_USER_REVIEWED_AT"
rtk bun tools/approve-meadow-entry-controls.ts --check
```

Re-run the finalizer after the control fingerprint changes. The master pixel SHA must remain exactly
the Task 3 approved SHA; only control-bound provenance may change.

- [ ] **Step 4: Export, prove, approve, and generate runtime bytes**

```bash
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
rtk bun tools/export-meadow-entry-regions.ts
rtk bun tools/export-meadow-entry-regions.ts --check
rtk bun tools/render-meadow-entry-art-proofs.ts
rtk bun tools/render-meadow-entry-art-proofs.ts --check
rtk bun tools/approve-meadow-entry-art-package.ts \
  --reviewed-by chanwaichan \
  --reviewed-at "$MEADOW_ORGANIC_USER_REVIEWED_AT"
rtk bun tools/approve-meadow-entry-art-package.ts --check
rtk bun tools/generate-meadow-entry-runtime.ts
rtk bun tools/generate-meadow-entry-runtime.ts --check
```

Require two opaque `3200x3200` exports, one byte-identical overlap, public runtime bytes equal to
exports, ten active proof pairs, every sidecar bound to the current master/controls/crops/nine
panels/seven insert triples/apron provenance, and historical texture-probe evidence unchanged.

- [ ] **Step 5: Run focused package GREEN and all no-write checks**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-controls-approval.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-export-integration.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-artifact.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts \
  src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts
rtk bun run art:storage:meadow-entry
rtk git lfs fsck
rtk bun run check
rtk git diff --check
```

Capture status before and after every `--check` writer and require exact equality.

- [ ] **Step 6: Commit Task 4**

Stage only ownership code/tests and generated control/package/proof/runtime files. Commit:

```bash
rtk git diff --cached --name-status
rtk git commit -m "feat(art): publish organic Meadow scenery package"
```

---

### Task 5: Validate runtime ownership, faults, collision, and the frozen journey

**Files:**

- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `tests/e2e/game.e2e.ts`
- Modify:
  `docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-browser.md`
- Report:
  `.superpowers/sdd/2026-08-17-meadow-entry-organic-baked-scenery-correction/task-5-report.md`
  (ignored)

**Interfaces:**

- Consumes: the exact fourteen Task 4 visual owners and existing generic
  `shouldRenderOwnedVisual`/WorldScene background-success diagnostics.
- Produces: automated proof that healthy art hides all ten duplicate blockers, Crossroads failure
  restores them, Sundrop-only failure does not, and gameplay/collision remain unchanged.

- [ ] **Step 1: Add runtime ownership RED assertions**

In `scenes.test.ts`, assert normal pilot creation renders zero live obstacle visuals for the ten exact
IDs while collision rectangles remain registered. Add separate cases:

```ts
for (const sourceId of expectedOrganicBlockerOwners) {
  expect(healthyRenderedBlockerIds).not.toContain(sourceId);
}
expect(crossroadsFaultRenderedBlockerIds).toEqual(
  expect.arrayContaining(expectedOrganicBlockerOwners)
);
for (const sourceId of expectedOrganicBlockerOwners) {
  expect(sundropFaultRenderedBlockerIds).not.toContain(sourceId);
}
```

Also assert unrelated Hero House/connector fence/decor sources retain their existing live rendering.
Run the scene test and observe RED before updating its stale owner expectations.

- [ ] **Step 2: Update the two existing painted-pilot E2E titles only**

Keep the exact two titles and existing journey waypoints/tolerances. Update asset/provenance hashes
and add diagnostics that prove:

- exactly two approved `3200x3200` textures load;
- healthy mode reports all ten blocker owners suppressed;
- Crossroads missing-texture and render-fault modes restore all ten blocker visuals and retain
  collision;
- Sundrop-only fault does not restore the Crossroads-owned blockers;
- every sampled `1920x1080` exterior camera rectangle remains inside the same crop union;
- Hero House transition, pickup, Lynn interaction, Waystone discovery, return, save, and reload still
  complete without route or tolerance changes.

No teleport, waypoint tuning, retry increase, collision change, or tolerance widening is permitted.

- [ ] **Step 3: Run focused unit and browser GREEN**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/phaser/scenes/scenes.test.ts \
  src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts
rtk bun run test:e2e -- --grep "Meadow painted pilot"
rtk bun run test:e2e -- --grep "Meadow painted pilot" --repeat-each=2
rtk bun run check
rtk bunx prettier --check \
  tests/e2e/game.e2e.ts \
  docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-browser.md
rtk bunx eslint tests/e2e/game.e2e.ts
rtk git diff --check
```

Record exact selected/passed counts, durations, camera sample counts/extrema, fault diagnostics, and
save/reload result in both reports.

- [ ] **Step 4: Commit Task 5**

```bash
rtk git diff --cached --name-status
rtk git commit -m "test(world): validate organic Meadow scenery ownership"
```

---

### Task 6: Re-run the real two-texture browser safety probe

**Files:**

- Modify: `artifacts/meadow-entry/painted-v2/proofs/texture-probe/browser-camera-safe-pilot.json`
- Modify:
  `docs/superpowers/reports/2026-08-11-meadow-entry-painted-texture-preflight.md`
- Modify only when expected hashes/bytes change:
  `tools/probe-meadow-entry-texture-safety.test.ts`
- Report:
  `.superpowers/sdd/2026-08-17-meadow-entry-organic-baked-scenery-correction/task-6-report.md`
  (ignored)

**Interfaces:**

- Consumes: the same registered `painted-v2-camera-safe-pilot` probe candidate and the two new Task 4
  export hashes/bytes.
- Produces: one frozen real-browser decision for exactly two uploads and two retained textures.

- [ ] **Step 1: Capture hash-inventory RED**

Update the literal expected candidate assets to the new two export SHA-256 and byte counts. Run:

```bash
rtk bun test tools/probe-meadow-entry-texture-safety.test.ts
```

Expected: RED while the frozen browser JSON still binds the prior export bytes.

- [ ] **Step 2: Run exactly one real camera-safe candidate probe**

```bash
rtk bun tools/probe-meadow-entry-texture-safety.ts \
  --candidate painted-v2-camera-safe-pilot
```

If sandbox loopback setup fails before WebGL starts, record that setup stop and make one narrow
escalated retry. Do not retry a real upload/context-loss failure. Require `2/2` uploads, retained
count `2`, WebGL available, `MAX_TEXTURE_SIZE >= 3200`, `contextLost=false`, exact asset hashes/bytes,
and decision `proceed`. A real `stop` leaves Task 6 uncommitted and returns `NEEDS_CONTEXT`.

- [ ] **Step 3: Run probe and repository gates**

```bash
rtk bun test tools/probe-meadow-entry-texture-safety.test.ts
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-export-integration.test.ts
rtk bun run check
rtk git lfs fsck
rtk git diff --check
```

- [ ] **Step 4: Commit Task 6**

```bash
rtk git diff --cached --name-status
rtk git commit -m "test(art): verify organic Meadow texture safety"
```

---

### Task 7: Perform the cause-scoped headed visual review and stop for the final verdict

**Files:**

- Replace/add screenshots under:
  `docs/superpowers/reports/img/hpa-586-painted-v2-organic-scenery/runtime/`
- Modify:
  `docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-visual-review.md`
- Report:
  `.superpowers/sdd/2026-08-17-meadow-entry-organic-baked-scenery-correction/task-7-report.md`
  (ignored)

**Interfaces:**

- Consumes: the published package, Task 5 journey diagnostics, Task 6 proceeding probe, exact
  `1920x1080` DPR-1 zoom-1 camera, and a fresh named headed Playwright session.
- Produces: a user-reviewed visual verdict for this ten-row scenery amendment. It does not claim the
  out-of-scope Hero House/fence defects are resolved.

- [ ] **Step 1: Build and launch a fresh headed review session**

```bash
rtk bun run build
rtk bun run preview -- --host 127.0.0.1
```

Open `/?meadowPaintedPilot=on` in a fresh named headed Playwright session at `1920x1080`, DPR `1`,
zoom `1`. Inject the exact noninteractive review bar used by the prior Task 8 evidence and hide only
transient status text; do not hide gameplay visuals.

- [ ] **Step 2: Capture and inspect normal painted-mode evidence**

Capture these normal views, each as a distinct `1920x1080` PNG:

```text
coast-crossroads-mouth-hedge.png
mistfen-entry-bank-east.png
silverpine-wall-A.png
silverpine-wall-B.png
silverpine-wall-C.png
wildwood-forest-lane-west-bank.png
wildwood-north-climb-west-bank.png
connector-village-mouth.png
connector-crossroads-mouth.png
full-master-overview.png
```

Inspect every capture at original detail. Fail this amendment for any sealed row showing a source
rectangle, straight bar, repeated stamp, hard apron boundary, duplicate live blocker sprite, false
collision cue, obscured route, exposed fallback tile, material jump, blur, or stretch.

- [ ] **Step 3: Capture diagnostics separately**

Capture:

```text
collision-only.png
crossroads-missing-texture-fallback.png
crossroads-render-fault-fallback.png
sundrop-only-fault.png
hero-house-frontage-unresolved.png
connector-fence-unresolved.png
```

The first four prove ownership/fallback behavior. The last two are explicitly labelled unresolved
out-of-scope evidence and cannot be counted as a pass for this amendment or silently removed.

- [ ] **Step 4: Write the truthful review inventory**

Record for every PNG: absolute path, SHA-256, byte count, `1920x1080`, DPR `1`, zoom `1`, map/seed,
mode/fault, exact review-bar text, and original-detail verdict. Record:

- ten sealed scenery rows: pass/fail;
- runtime duplicate suppression: pass/fail;
- missing/fault fallback restoration: pass/fail;
- Hero House outer-boundary source: unresolved follow-up;
- connector fence/decor source: unresolved follow-up;
- overall painted-pilot branch: still rejected until those owning-source findings are resolved.

- [ ] **Step 5: Stop at `NEEDS_CONTEXT` for the user verdict**

Show the normal and diagnostic captures with absolute paths. State that approval covers only the
organic ten-row scenery correction and does not approve Hero House or unrelated connector sources.
Do not infer approval, start their follow-up design, stage, or commit.

- [ ] **Step 6: After explicit approval, record and commit the visual evidence**

Record the exact answer and UTC-second timestamp in both reports. Re-run:

```bash
rtk bun run build
rtk bun run check
rtk git diff --check
```

Stage only the Task 7 report and approved runtime screenshots; exclude `.playwright-cli/`, output,
prior rejected images, attempt-2 evidence, and ignored task report. Commit:

```bash
rtk git diff --cached --name-status
rtk git commit -m "docs(art): record organic Meadow scenery review"
```

The handoff must end with a separate design request for the unresolved Hero House outer-boundary and
connector fence/decor owning sources. Do not call the whole branch visually approved.

---

## Final Whole-Branch Verification

After all seven task commits and task-level reviews, run one whole-branch review against the design
and this plan. Require:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-scenery-bake.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts \
  src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
rtk bun test tools/render-meadow-entry-painted-v2-enrichment-review.test.ts
rtk bun test tools/probe-meadow-entry-texture-safety.test.ts
rtk bun run test:e2e -- --grep "Meadow painted pilot"
rtk bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
rtk bun tools/export-meadow-entry-regions.ts --check
rtk bun tools/render-meadow-entry-art-proofs.ts --check
rtk bun tools/approve-meadow-entry-controls.ts --check
rtk bun tools/approve-meadow-entry-art-package.ts --check
rtk bun tools/generate-meadow-entry-runtime.ts --check
rtk bun run art:storage:meadow-entry
rtk git lfs fsck
rtk bun run check
rtk bun run lint
rtk git diff --check
```

If whole-repository lint still reports only preserved untracked `.playwright-cli/*.yml`, record the
exact files and run targeted Prettier/ESLint on every changed source file; do not delete or stage the
preserved directory. Confirm the tracked worktree and index are clean and only pre-existing rejected
evidence remains untracked.
