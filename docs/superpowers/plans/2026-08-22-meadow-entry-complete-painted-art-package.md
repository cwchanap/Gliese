# Meadow Entry Complete Painted Art Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce, approve, and bind one continuous 6400×6400 painted Meadow Entry master as four
exact non-overlapping 3200×3200 review-mode textures without changing gameplay geometry or making
painted mode the default.

**Architecture:** Preserve the existing `meadow-entry-painted-v2-legacy` package, sources,
approvals, and two overlapping camera crops as a historical comparison. Add a separately named
`meadow-entry-painted-v2-complete` package whose controls are derived from the Package 1 geometry,
whose generated source panels assemble into one continuous opaque master, and whose runtime exports
are literal northwest/northeast/southwest/southeast slices. Reuse the generic map-local atomic
selection and fallback seam completed in Package 1; no new renderer branch is introduced.

**Tech Stack:** TypeScript, Vitest, Bun, Sharp, canonical RGBA/PNG helpers, built-in image
generation, Git LFS, Phaser 4, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-19-complete-world-background-and-layout-redesign-design.md`

## Global Constraints

- Keep `meadow-entry` exactly 200×200 cells and 6400×6400 pixels. Do not change map geometry,
  collision, transitions, actors, encounters, pickups, discoveries, quests, shops, or save state.
- Preserve the historical `meadow-entry-painted-v2-legacy` package, its two crop rectangles, its
  overlapping proof inventory, and its approvals. New controls and art use a `complete` namespace.
- The new package ID is exactly `meadow-entry-painted-v2-complete` and remains review-only through
  `?mapBackgroundReview=meadow-entry-painted-v2-complete`. `?meadowPaintedPilot=on` continues to
  select only the legacy package.
- Keep `MEADOW_ENTRY_DEFAULT_PAINTED_MODE` as `fallback`. Do not enable a production default.
- The complete master is one canonical opaque 6400×6400 PNG. Runtime exports are four literal,
  non-overlapping base slices: northwest `(0,0)–(3200,3200)`, northeast
  `(3200,0)–(6400,3200)`, southwest `(0,3200)–(3200,6400)`, and southeast
  `(3200,3200)–(6400,6400)`.
- The complete package has no foreground textures and no `MeadowEntryOverlap` rows. Adjacent
  runtime edge pixels must equal the corresponding master pixels exactly.
- Run and pass the `painted-v2-2x2` probe before the first image-generation call: four successful
  3200×3200 uploads, four retained textures, WebGL available, `MAX_TEXTURE_SIZE >= 3200`, and no
  context loss.
- Baked presentation may include terrain, water, bridges, forest, hedges, cliffs, mountains,
  flowers, and other non-stateful natural decoration. It must not bake actors, pickups, encounters,
  discoveries, labels, signs, chests, duplicate buildings, false doors, false paths, false bridges,
  or false interaction cues.
- Preserve readable paths and visually quiet interaction/transition approaches. Collision remains
  authoritative; correct art rather than moving collision to fit an image.
- Natural decoration must be clustered, asymmetric, and composition-led. Reject rectangular
  obstacle strips, repeated tree stamps, visible panel/crop grids, material seams, and overlay-like
  decoration.
- Every generated raster must use the built-in image generation tool. Record prompt, references,
  attempt number, rejection reason, native bytes/dimensions/hash, normalization transform, and
  normalized bytes/dimensions/hash. Maximum five attempts per source.
- Normalize with one uniform cover scale plus deterministic center crop. Reject transparent/matte
  sources and any source requiring more than `2x` uniform upscaling.
- Keep runtime PNGs and durable source PNGs under existing Git LFS patterns. Before each commit,
  inspect staged paths and LFS pointers. Preserve unrelated untracked `.playwright-cli/`, `output/`,
  reports, and PNG evidence.
- Use `rtk` for shell commands. Use `apply_patch` for manual text edits; generated artifacts may be
  written by their owning tools.

---

### Task 1: Separate Historical and Complete Control/Crop Contracts

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-controls.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-controls.test.ts`
- Modify: `tools/export-meadow-entry-art-controls.ts`
- Modify: `tools/approve-meadow-entry-controls.ts`
- Modify: `package.json`
- Create: `src/lib/game/content/approvals/meadow-entry-painted-v2-complete-controls.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-controls-approval.test.ts`
- Create: `artifacts/meadow-entry/painted-v2/complete/controls/` (generated)
- Modify: `docs/superpowers/reports/2026-08-19-complete-world-layout-foundation.md`

**Interfaces:**
- Preserve: every existing `MEADOW_ENTRY_PAINTED_V2_PILOT_*` export and its exact values.
- Produce:

```ts
export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS: readonly MeadowEntryApprovedCrop[];
export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_OVERLAPS: readonly MeadowEntryOverlap[];
export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_COVERAGE:
	readonly MeadowEntryRuntimeCoverage[];
export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_FALLBACK_REQUIREMENTS:
	readonly MeadowEntryFallbackRequirement[];
export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_BUDGET_SUMMARY: MeadowEntryCropBudgetSummary;

export type MeadowEntryControlPackage = 'legacy' | 'complete';
export function buildMeadowEntryControlInputs(
	map?: WorldMapDefinition,
	packageName?: MeadowEntryControlPackage
): MeadowEntryControlInputs;
```

- `complete` uses exact IDs `painted-v2-complete-northwest`, `-northeast`, `-southwest`, and
  `-southeast`; filenames append `-base.png`; texture keys prefix
  `meadow-entry-painted-v2-complete-`; draw orders are `0`, `10`, `20`, and `30`.
- `MEADOW_ENTRY_PAINTED_V2_COMPLETE_OVERLAPS` and fallback requirements are empty. Runtime coverage
  contains the four exact quadrant bounds, one crop ID per row. Export-area ratio is `1` and overlap
  area is `0`.
- `export-meadow-entry-art-controls.ts --package complete` writes only beneath
  `artifacts/meadow-entry/painted-v2/complete/controls/` and generates
  `src/lib/game/content/generated/meadow-entry-painted-v2-complete-art-control.ts`.
- `approve-meadow-entry-controls.ts --package complete` writes only the new complete approval module
  and binds the Package 1 validation report as evidence. The legacy mode retains its existing paths.
- Add `art:controls:meadow-entry-complete` and
  `art:validate:meadow-entry-complete-controls` scripts. Do not change the meaning of the existing
  legacy scripts.

- [ ] **Step 1: Write RED crop-contract tests**

Add assertions that the complete crop set is exactly four 3200×3200 rectangles, covers the
6400×6400 world exactly once, has pairwise intersection area zero, has no overlaps/foreground
filenames/fallback rows, and uses unique IDs, texture keys, and draw orders. Assert the pilot exports
remain byte-for-byte deep-equal to their current fixture.

- [ ] **Step 2: Run focused RED**

Run:

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts
```

Expected: FAIL because the complete exports do not exist.

- [ ] **Step 3: Add the complete crop constants without editing pilot constants**

Use the exact four bounds and names from Interfaces. Reuse `freezeCrop`, `freezeRuntimeCoverage`,
and the existing crop validator. Do not add a generalized crop framework.

- [ ] **Step 4: Write RED package-aware control exporter/approval tests**

Prove `--package complete` selects the complete crop union and destination root, rejects unknown
packages and cross-namespace destinations, and never writes the legacy approval. Prove legacy mode
still reads its historical crop contract.

- [ ] **Step 5: Implement package-aware control export and approval**

Keep the default argument `legacy` so historical commands do not silently change meaning. Add the
explicit complete package path, generate the new complete control module, and retain fail-closed
hash checking in both namespaces.

- [ ] **Step 6: Generate and review complete controls**

Run:

```bash
rtk bun tools/export-meadow-entry-art-controls.ts --package complete
rtk bun tools/export-meadow-entry-art-controls.ts --package complete --check
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts src/lib/game/content/backgrounds/meadow-entry-controls.test.ts src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-controls-approval.test.ts
```

Inspect the overview, route core, collision, protected-live, building, transition, and semantic
anchor controls against the approved Package 1 geometry. Record the current fingerprint and all
control paths in the layout-foundation report.

- [ ] **Step 7: Seal the complete control approval after review**

After the controls match the approved graybox, run:

```bash
reviewed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
rtk bun tools/approve-meadow-entry-controls.ts --package complete --reviewed-by chanwaichan --reviewed-at "$reviewed_at"
rtk bun tools/export-meadow-entry-art-controls.ts --package complete --check
```

- [ ] **Step 8: Make the historical pilot reproducible from its own sealed snapshot**

The legacy scenery/finalizer tests must not compare their approved bounds or control fingerprint to
the changed live map. Add an immutable legacy source snapshot derived from the existing pilot
scenery table and approval modules; validate its internal IDs, bounds, masks, hashes, and provenance
without consulting the Package 1 source catalog. Keep the new complete controls/live-catalog tests
as the authority for current geometry. Restore the exact approved
`village-crossroads-connector` normalized LFS object when its provenance hash is available; do not
change the pinned hash to match an unexplained working-tree byte sequence.

Run the fifteen painted-v2 pilot test files as a group. Expected: the legacy snapshot/finalizer is
green, and any remaining failure names a missing approved LFS object rather than current river or
Wildwood geometry.

- [ ] **Step 9: Verify and commit Task 1**

Run focused tests, the fifteen-file legacy pilot group, `rtk bun run check`, targeted
Prettier/ESLint, `rtk git diff --check`, and inspect staged LFS pointers. Commit:

```bash
rtk git commit -m "feat(art): define complete Meadow controls"
```

---

### Task 2: Re-run and Seal the Four-Texture Safety Gate

**Files:**
- Modify: `tools/probe-meadow-entry-texture-safety.ts`
- Modify: `tools/probe-meadow-entry-texture-safety.test.ts`
- Create: `artifacts/meadow-entry/painted-v2/complete/proofs/texture-probe/browser-3200.json`
- Create: `docs/superpowers/reports/2026-08-22-meadow-entry-painted-v2-complete-validation.md`

**Interfaces:**
- Extend probe parsing with optional
  `--report-root artifacts/meadow-entry/painted-v2/complete/proofs/texture-probe`.
- The candidate remains exactly `painted-v2-2x2`; do not add another texture candidate or change its
  representative metadata.

- [ ] **Step 1: Write RED argument/destination tests**

Assert the new report root is repository-relative, remains under
`artifacts/meadow-entry/painted-v2/`, rejects traversal/absolute paths, and does not overwrite the
legacy `proofs/texture-probe/browser-3200.json`.

- [ ] **Step 2: Run RED and implement the narrow report-root option**

Run the probe unit test, implement only the destination override, then rerun it green.

- [ ] **Step 3: Run the mandatory browser probe**

Run:

```bash
rtk bun tools/probe-meadow-entry-texture-safety.ts --candidate painted-v2-2x2 --report-root artifacts/meadow-entry/painted-v2/complete/proofs/texture-probe
```

Stop the package if `decision !== "proceed"`, `assetCount !== 4`, `successfulUploads !== 4`,
`retainedTextures !== 4`, `webglAvailable !== true`, `maxTextureSize < 3200`, or
`contextLost !== false`.

- [ ] **Step 4: Record the exact probe evidence and commit**

Write the command, browser/renderer, texture limit, hashes, byte totals, and decision into the new
validation report. Run focused tests and static checks. Commit:

```bash
rtk git commit -m "test(art): seal Meadow four-texture preflight"
```

No image generation may occur before this commit is green.

---

### Task 3: Define the Complete Master Source and Provenance Contract

**Files:**
- Create: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete.test.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts`
- Create: `tools/normalize-meadow-entry-painted-v2-complete-source.ts`
- Create: `tools/normalize-meadow-entry-painted-v2-complete-source.test.ts`
- Create: `artifacts/meadow-entry/painted-v2/complete/reference/` (generated)
- Create: `artifacts/meadow-entry/painted-v2/complete/source-panels/{raw,normalized,provenance}/`

**Interfaces:**
- Produce `MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS` with twelve exact landscape panels:

```text
north-west       (0,0)–(2432,1792)
north-center     (1984,0)–(4416,1792)
north-east       (3968,0)–(6400,1792)
north-mid-west   (0,1536)–(2432,3328)
north-mid-center (1984,1536)–(4416,3328)
north-mid-east   (3968,1536)–(6400,3328)
south-mid-west   (0,3072)–(2432,4864)
south-mid-center (1984,3072)–(4416,4864)
south-mid-east   (3968,3072)–(6400,4864)
south-west       (0,4608)–(2432,6400)
south-center     (1984,4608)–(4416,6400)
south-east       (3968,4608)–(6400,6400)
```

- Every normalized panel is opaque 2432×1792. Horizontal overlap is 448 pixels and vertical
  overlap is 256 pixels. Assembly is row-major using the existing content-aware seam helper with a
  maximum 96-pixel half-width, then canonical PNG encoding.
- Produce:

```ts
export interface MeadowEntryPaintedV2CompleteAssemblyInput {
	readonly controlFingerprint: string;
	readonly panels: Readonly<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>>;
	readonly provenance: Readonly<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>>;
}

export async function assembleMeadowEntryPaintedV2CompleteMaster(
	input: MeadowEntryPaintedV2CompleteAssemblyInput
): Promise<{ readonly masterPng: Buffer; readonly provenanceJson: Buffer }>;
```

- [ ] **Step 1: Write RED panel-grid tests**

Assert exact bounds/dimensions/paths, full-world union coverage, every internal neighbor overlap,
no uncovered pixel, deterministic row-major priority, unique IDs, and no references to legacy
source-panel paths.

- [ ] **Step 2: Implement and verify the panel catalog**

Add the literal table and frozen values. Run the focused test green.

- [ ] **Step 3: Write RED assembly tests**

Use synthetic opaque panels with distinct colors and route-like lines. Assert deterministic output,
6400×6400 opacity, full coverage, content-aware handoffs in both axes, no change outside overlap
bands, canonical PNG chunks, and fail-closed handling for missing panels, wrong dimensions,
transparency, stale source hashes, or a stale complete control fingerprint.

- [ ] **Step 4: Implement the complete assembly using existing PNG/seam helpers**

Export the narrow content-aware handoff helper from the existing underlay module rather than
copying its algorithm. Do not change the legacy finalizer or its sealed formulas.

- [ ] **Step 5: Write and implement normalization tests**

The CLI accepts exactly one declared panel ID plus raw input path. It computes a uniform cover scale,
rejects scale above `2`, center-crops to 2432×1792, forces sRGB opaque RGBA, canonical-encodes the
PNG, and writes one provenance JSON atomically beneath the complete namespace.

- [ ] **Step 6: Establish and approve the shared art reference**

Use image generation to create one art-direction reference, using the currently accepted organic
Meadow master and its clean native detail crops as visual references. Prompt:

```text
Top-down 2D JRPG environment painting, cohesive SNES-era shapes with modern painterly detail.
Lush asymmetric forest clusters, varied tree silhouettes, soft mountain and cliff landforms,
continuous clear river water and natural banks, flower and grass clusters, warm Sundrop meadow,
cooler Wildwood and Silverpine vegetation, damp Mistfen atmosphere, coastal stone and sand.
Readable roads and crossings through value separation and negative space. Natural composition,
no rectangular obstacle strips, no repeated stamps, no tile grid, no text, no UI, no characters,
no buildings, no doors, no signs, no chests, no pickups, no checkerboard, no matte border.
```

Record every reference path and prompt. Present the reference to the user and stop until explicit
approval. Do not generate the twelve production panels before that approval.

- [ ] **Step 7: Commit the source contract and approved reference**

Run focused tests and static checks, validate LFS pointers, and commit:

```bash
rtk git commit -m "feat(art): define complete Meadow source grid"
```

---

### Task 4: Generate, Assemble, and Review the Continuous Master

**Files:**
- Create: twelve raw/normalized/provenance source triples under
  `artifacts/meadow-entry/painted-v2/complete/source-panels/`
- Create: `artifacts/meadow-entry/painted-v2/complete/masters/meadow-entry-painted-v2-complete-base-master.png`
- Create: `artifacts/meadow-entry/painted-v2/complete/provenance/meadow-entry-painted-v2-complete-master.json`
- Create: `tools/finalize-meadow-entry-painted-v2-complete.ts`
- Create: `tools/finalize-meadow-entry-painted-v2-complete.test.ts`
- Create: `tools/render-meadow-entry-painted-v2-complete-review.ts`
- Create: `tools/render-meadow-entry-painted-v2-complete-review.test.ts`
- Update: `docs/superpowers/reports/2026-08-22-meadow-entry-painted-v2-complete-validation.md`
- Create: `docs/superpowers/reports/img/hpa-586-painted-v2-complete/` (generated review evidence)

**Interfaces:**
- The finalizer supports normal write and `--check`, writes atomically, and binds the complete
  control fingerprint, all twelve source/provenance hashes, master dimensions/hash/bytes, assembly
  formulas, and rejection history.
- Review generation emits: full overview; region panels for Sundrop, Crossroads, Wildwood,
  Silverpine, Mistfen, coast, and river; route/collision/protected-live overlays; all six internal
  source-handoff bands; all four master edges; all four runtime quadrant edges; Hero House and every
  building approach; bridge/ford details; and five native-decoration density samples.

- [ ] **Step 1: Generate panels one at a time with bounded prompts**

For each catalog row, use the approved shared reference plus adjacent accepted source panels when
available. Add only that row's region/route notes from the complete controls to the common prompt.
Never pass SVG controls, masks, rectangle atlases, or route overlays to image generation. Limit each
row to five attempts and normalize every accepted attempt with the Task 3 CLI.

- [ ] **Step 2: Reject objective source failures before assembly**

Reject any panel with a non-opaque/matte border, >2× normalization, duplicate building/door/live
object, false path/crossing, visible rectangular obstacle strip, repeated stamp grid, or mismatch
against its quiet-clearance inventory. Record the rejection and continue within the five-attempt
budget.

- [ ] **Step 3: Write RED finalizer/review tests**

Assert fail-closed source/provenance hashes, exact control fingerprint, one 6400×6400 opaque master,
canonical encoding, complete evidence inventory, edge-pixel extraction from the same decoded master,
and no dependency on pilot crops/overlaps/approved master hash.

- [ ] **Step 4: Implement finalizer and review renderer**

Reuse the Task 3 assembly and existing control-overlay/proof helpers. Do not mutate the historical
pilot finalizer, approved master constant, or organic-scenery approval.

- [ ] **Step 5: Assemble and render the candidate**

Run:

```bash
rtk bun tools/finalize-meadow-entry-painted-v2-complete.ts
rtk bun tools/finalize-meadow-entry-painted-v2-complete.ts --check
rtk bun tools/render-meadow-entry-painted-v2-complete-review.ts
rtk bun tools/render-meadow-entry-painted-v2-complete-review.ts --check
```

- [ ] **Step 6: Self-review and correct only at the art owner**

Inspect overview, native detail, routes, river continuity, building approaches, region handoffs,
source seams, and all master edges. Regenerate or replace only failing source panels; do not change
geometry, masks, collision, or acceptance thresholds to accept a candidate.

- [ ] **Step 7: Obtain explicit user art approval**

Present the overview plus representative native detail, river crossing, forest boundary, village
approach, and seam evidence. Stop until the user approves the master. Rejected candidates remain
documented and unapproved.

- [ ] **Step 8: Commit the approved master package inputs**

After approval, rerun finalizer/review `--check`, focused tests, `bun run check`, Prettier/ESLint,
diff check, and LFS-pointer inspection. Commit:

```bash
rtk git commit -m "feat(art): assemble complete Meadow master"
```

---

### Task 5: Export Four Literal Runtime Slices and Seal Approval

**Files:**
- Create: `tools/export-meadow-entry-painted-v2-complete.ts`
- Create: `tools/export-meadow-entry-painted-v2-complete.test.ts`
- Create: `public/game/assets/regions/meadow-entry-painted-v2/painted-v2-complete-{northwest,northeast,southwest,southeast}-base.png`
- Create: `artifacts/meadow-entry/painted-v2/complete/provenance/meadow-entry-painted-v2-complete-export.json`
- Create: `tools/approve-meadow-entry-painted-v2-complete-art-package.ts`
- Create: `tools/approve-meadow-entry-painted-v2-complete-art-package.test.ts`
- Create: `src/lib/game/content/approvals/meadow-entry-painted-v2-complete-art-package.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete.generated.ts`
- Modify: `tools/generate-meadow-entry-runtime.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts`
- Modify: `package.json`

**Interfaces:**
- The exporter accepts normal write and `--check`, decodes the approved master once, slices the four
  exact crop bounds, canonical-encodes each slice, and records master/source rectangles and hashes.
- `generate-meadow-entry-runtime.ts --package complete` consumes only the complete approval and
  emits four base descriptors with empty `visualOwners` because `coverage: 'full-map'` suppresses
  all five static presentation collections transactionally.
- The approval binds: complete control fingerprint, master, master provenance, export provenance,
  four runtime exports, complete crop manifest, texture-probe report, review proof inventory, and
  the validation report.
- Add `art:export:meadow-entry-complete`, `art:check:meadow-entry-complete-export`,
  `art:approve:meadow-entry-complete`, `art:check:meadow-entry-complete-approval`,
  `art:validate:meadow-entry-complete`, and `world:generate:meadow-entry-painted-v2-complete`
  scripts. Complete validation runs controls, probe evidence, finalizer, export, approval, runtime
  generator, and proof checks in fail-closed order.

- [ ] **Step 1: Write RED literal-slice tests**

For each export, decode and assert exact 3200×3200 dimensions and byte-for-byte RGBA equality with
the corresponding master rectangle. Assert no pair overlaps and every master pixel belongs to
exactly one export.

- [ ] **Step 2: Implement exporter and run write/check**

Use existing canonical PNG helpers and atomic writes. Run the exporter twice; the second `--check`
must report no drift.

- [ ] **Step 3: Write RED approval/generator tests**

Assert the approval fails closed on any control/master/export/provenance/probe/proof drift. Assert
the generated descriptors use exact IDs, texture keys, public paths, bounds, dimensions, base plane,
draw orders, and no visual-owner rows.

- [ ] **Step 4: Implement approval and complete runtime generation**

Do not change the legacy approval or generated module. Add the explicit complete generation mode and
new output module.

- [ ] **Step 5: Seal the approved package**

After the Task 4 user approval, run:

```bash
reviewed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
rtk bun tools/approve-meadow-entry-painted-v2-complete-art-package.ts --reviewed-by chanwaichan --reviewed-at "$reviewed_at"
rtk bun tools/approve-meadow-entry-painted-v2-complete-art-package.ts --check
rtk bun tools/generate-meadow-entry-runtime.ts --package complete
rtk bun tools/generate-meadow-entry-runtime.ts --package complete --check
```

- [ ] **Step 6: Verify and commit Task 5**

Run focused tests/static checks and inspect all runtime PNGs as LFS pointers. Commit:

```bash
rtk git commit -m "feat(art): publish complete Meadow runtime slices"
```

---

### Task 6: Bind the Complete Package in Review Mode

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts`
- Modify: `src/lib/game/content/maps/meadow-entry-painted-backgrounds.ts`
- Modify: `src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts`
- Modify: `src/lib/game/phaser/scenes/BootScene.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts`

**Interfaces:**
- Produce `MEADOW_ENTRY_PAINTED_V2_COMPLETE_PACKAGE_ID` and
  `MEADOW_ENTRY_PAINTED_V2_COMPLETE_PACKAGE` with `coverage: 'full-map'`, four assets/backgrounds,
  and empty visual owners.
- Add both legacy and complete packages to `MAP_BACKGROUND_PACKAGE_REGISTRY`.
- Review query selection uses the generic exact package ID. The pilot alias remains legacy-only.
- Diagnostics report `paintedMode: 'complete'` for the selected complete package while retaining
  `pilot` and `fallback` values.

- [ ] **Step 1: Write RED selection/preload/map tests**

Prove complete selection requires the exact review ID, selects all four textures once, applies all
four descriptors, carries full-map coverage, leaves fallback/default unchanged, and rejects requests
that select both Meadow packages.

- [ ] **Step 2: Implement registry/binding changes**

Reuse the Package 1 generic selection/application path. Do not add a Meadow-only renderer branch.

- [ ] **Step 3: Write RED renderer atomicity tests**

Prove healthy complete presentation suppresses legacy ground, ground patches, blockers, decor,
fences, and interior props while preserving collision and stateful objects. For each of the four
required textures, inject missing/malformed/render-failed status and assert zero package images plus
complete legacy restoration.

- [ ] **Step 4: Implement diagnostic classification only**

The renderer already handles full-map atomicity. Add only the complete package classification and
any descriptor fixtures required by the tests.

- [ ] **Step 5: Verify and commit Task 6**

Run the runtime/map/scene/diagnostic tests, `bun run check`, targeted lint/format, and diff check.
Commit:

```bash
rtk git commit -m "feat(world): bind complete Meadow review package"
```

---

### Task 7: Complete Visual, Fallback, and Repository Acceptance

**Files:**
- Create: `tests/e2e/meadow-entry-painted-v2-complete.e2e.ts`
- Modify: `tests/e2e/complete-world-layout-journey.e2e.ts`
- Update: `docs/superpowers/reports/2026-08-22-meadow-entry-painted-v2-complete-validation.md`
- Create: runtime evidence beneath `docs/superpowers/reports/img/hpa-586-painted-v2-complete/runtime/`

**Acceptance route:** Start at Hero House; traverse Sundrop, Crossroads, the river crossing,
Wildwood, Silverpine, Mistfen, and coast; inspect all four runtime edges and every source-handoff
region; save/reload in Meadow; and return to a valid route coordinate.

- [ ] **Step 1: Write the review-mode E2E contract**

Boot with `?mapBackgroundReview=meadow-entry-painted-v2-complete`, assert painted diagnostics select
all four exact background IDs, legacy static overlays are absent, collision/live objects remain, and
the default URL still uses fallback.

- [ ] **Step 2: Add one fault case per required texture**

Inject each texture failure independently through the existing test seam. Assert presentation mode
`fallback`, zero selected background IDs, all legacy static collections restored, and unchanged
collision/stateful IDs.

- [ ] **Step 3: Run focused and Package 1 regression suites**

Run all complete-package unit tests plus the exact 14-file Package 1 suite and renderer tests. The
Package 1 total remains 477/477 unless a test is intentionally added to those files; report exact
new totals.

- [ ] **Step 4: Run browser visual acceptance at 1920×1080**

Capture overview/native views for all regions, four runtime edges, river crossings, building
approaches, forest/mountain boundaries, and missing-texture fallback. Reject any visible overlap,
seam, crop boundary, overlay obstacle, false cue, or missing background.

- [ ] **Step 5: Run repository verification**

Run:

```bash
rtk bun run art:validate:meadow-entry-controls
rtk bun run art:validate:meadow-entry
rtk bun run art:validate:meadow-entry-complete-controls
rtk bun run art:validate:meadow-entry-complete
rtk bun run test:unit -- --run
rtk bun run check
rtk bun run lint
rtk bun run build
rtk bun run test:e2e -- --grep "complete Meadow|complete world layout journey"
rtk git diff --check
```

Expected: the Package 1-induced historical-art drift failures are replaced by passing legacy
snapshot and complete-package checks. The four base-branch failures are all in adjacent Meadow art
coverage: restore a provenance-pinned artifact or correct a stale fixture/evidence path only when
the current source proves the expected value. Do not update a hash merely to match unexplained bytes,
and do not weaken a fail-closed assertion. The full unit suite must be green before branch finishing;
otherwise record the exact unresolved artifact and stop.

- [ ] **Step 6: Run final whole-branch review**

Review the entire branch against the complete-world spec. Reject geometry changes, default-mode
changes, historical approval rewrites, nonliteral runtime crops, missing fault cases, or visual
evidence gaps. Fix valid findings and rerun their owning gates.

- [ ] **Step 7: Record final evidence and commit**

Update the validation report with exact commands/results, hashes, runtime diagnostics, user approval,
rejection history, LFS growth, and remaining external native/Tauri gate if any. Commit:

```bash
rtk git commit -m "test(world): validate complete Meadow art package"
```

Do not merge, push, or make the package production-default without separate explicit authorization.
