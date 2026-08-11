# Meadow Entry Painted Background PR2a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Remove the 24 dead regional textures from the active runtime, regenerate Meadow Entry art controls from the accepted HPA-586 geometry, and prepare a deterministic painted-v2 pilot pipeline without committing scenic art.

**Architecture:** Keep HPA-399 as immutable historical evidence. Repoint only the active art-writing commands to artifacts/meadow-entry/painted-v2, reuse the live Meadow Entry source catalog and pure PNG/provenance utilities, add explicit pilot crop and ownership inputs, and finish dependency injection in the crop validator. The runtime ends PR2a with zero selected regional textures and the existing HPA-586 tile/live presentation unchanged.

**Tech Stack:** TypeScript, Phaser 4, Vitest, Sharp, Git LFS, Vite, Tauri.

## Global Constraints

- Work from reviewed PR1 commit 709e4b6 and preserve the approved design at docs/superpowers/specs/2026-08-10-meadow-entry-painted-background-pilot-design.md.
- Do not generate or commit concept art, source panels, masters, pilot exports, or runtime scenic PNGs in PR2a.
- Keep artifacts/meadow-entry/hpa-399/** and src/lib/game/content/approvals/meadow-entry-art-package.ts byte-for-byte unchanged.
- Keep src/lib/game/content/generated/meadow-entry-runtime.ts as historical generated evidence; do not reactivate meadowEntryRuntimeBackgroundImages.
- Do not add art-map-adapters, PackageConfiguration, a selectable HPA-399/painted-v2 CLI mode, or another map renderer.
- Reuse meadow-entry-source-catalog.ts, meadow-entry-png.ts, meadow-entry-master-provenance.ts, applyVisualOwnership, and validateMapBackgroundOwnership.
- Preserve the default map registry, collision, routes, actors, transitions, interactions, save version, and current graybox fallback.
- Use test-first RED then focused GREEN for every task. Commit only after the named verification passes.
- If a full unit run fails only because the Chromium/WebGL probe cannot bind localhost in the sandbox, rerun that same command once with narrow local-port escalation and record both results.

## REUSE / EXTEND / NEW Inventory

| Concern | Classification | Concrete owner |
| --- | --- | --- |
| Live source catalog and exact assembled-map join | REUSE unchanged | src/lib/game/content/backgrounds/meadow-entry-source-catalog.ts |
| PNG normalization and canonical encoding | REUSE unchanged | src/lib/game/content/backgrounds/meadow-entry-png.ts |
| Generation/refinement provenance validators | REUSE unchanged | src/lib/game/content/backgrounds/meadow-entry-master-provenance.ts |
| Authoring regions and review seals | EXTEND in place | src/lib/game/content/backgrounds/meadow-entry-authoring-layout.ts |
| Control input/render/fingerprint path | EXTEND in place | src/lib/game/content/backgrounds/meadow-entry-controls.ts and tools/export-meadow-entry-art-controls.ts |
| Bake ownership validation | EXTEND in place | src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts |
| Crop validation | EXTEND by dependency injection | src/lib/game/content/backgrounds/meadow-entry-crop-manifest.ts |
| Pilot crop/coverage data | NEW | src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.ts |
| Painted-v2 controls approval | NEW | src/lib/game/content/approvals/meadow-entry-painted-v2-controls.ts |
| Active finalization/export/approval roots | EXTEND by direct constant replacement | tools/finalize-meadow-entry-masters.ts, tools/export-meadow-entry-regions.ts, tools/approve-meadow-entry-art-package.ts |
| Runtime descriptor generator | Defer implementation to PR2b | tools/generate-meadow-entry-runtime.ts |
| Background selection and map transform | Defer implementation to PR2b | src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.ts and src/lib/game/content/maps/meadow-entry-painted-backgrounds.ts |
| Historical storage contract | REUSE exact literals | src/lib/game/content/backgrounds/meadow-entry-storage.ts |
| Painted-v2 storage contract | NEW beside historical contract | src/lib/game/content/backgrounds/meadow-entry-storage.ts |

## Fixed Painted-v2 Pilot Data

PR2a establishes the data contract but not the PNGs.

### Runtime crops

| Crop ID | Bounds L,T,R,B | Dimensions | Base filename | Texture key | Draw order |
| --- | --- | --- | --- | --- | --- |
| painted-v2-sundrop-village | 256,3968,2880,6144 | 2624×2176 | painted-v2-sundrop-village-base.png | meadow-entry-painted-v2-sundrop-village-base | 0 |
| painted-v2-village-crossroads-connector | 2592,4480,3392,4896 | 800×416 | painted-v2-village-crossroads-connector-base.png | meadow-entry-painted-v2-village-crossroads-connector-base | 10 |
| painted-v2-crossroads | 2880,2816,4608,4768 | 1728×1952 | painted-v2-crossroads-base.png | meadow-entry-painted-v2-crossroads-base | 20 |

All three pilot crops are opaque base-only planes. Their common runtime root is public/game/assets/regions/meadow-entry-painted-v2/. Foreground support remains generic in the data model, but PR2a and PR2b do not commit a pilot foreground plane.

### Reviewed authoring regions

The six principal bounds must equal MEADOW_ENTRY_V2_REGION_ENVELOPES:

| Region | L,T,R,B |
| --- | --- |
| sundrop-village | 256,3968,2816,6144 |
| crossroads | 2880,2816,4608,4768 |
| mistfen | 384,384,3200,4096 |
| silverpine | 2432,384,4480,2816 |
| wildwood | 4320,256,6144,5568 |
| tidewatch-coast | 3328,4768,6144,6144 |

Connector review bounds are the exact live route/seam union expanded by MEADOW_ENTRY_MIN_HANDOFF_PX on every side and clamped to the world:

| Connector | L,T,R,B |
| --- | --- |
| connector-village-crossroads | 2688,4480,3392,4896 |
| connector-crossroads-coast | 4000,4640,4448,5696 |
| connector-crossroads-mistfen | 2112,2624,3808,3360 |
| connector-crossroads-silverpine | 3296,2208,4000,2944 |
| connector-crossroads-wildwood | 4160,3648,5120,4432 |

The outer-boundary control remains 0,0,6400,6400.

---

### Task 1: Remove dead runtime texture registrations and public PNGs

**Files:**
- Modify: src/lib/game/content/assets.ts
- Modify: src/lib/game/content/assets.test.ts
- Modify: src/lib/game/phaser/scenes/BootScene.ts
- Modify: src/lib/game/phaser/scenes/scenes.test.ts
- Modify: src/lib/game/content/maps.test.ts
- Modify: src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts
- Delete: public/game/assets/regions/sundrop-village-base.png
- Delete: public/game/assets/regions/sundrop-village-foreground.png
- Delete: public/game/assets/regions/meadow-entry/*.png

**Interfaces:**
- regionalBackgroundAssets remains a readonly RegionalBackgroundPreloadAsset array for the generic preload seam, but is empty at the end of PR2a.
- meadowEntryRuntimeBackgroundAssets and sundropRegionalBackgroundAssets cease to be active assets.ts dependencies.
- Every map in maps keeps backgroundImages empty.

- [ ] **Step 1: Write the failing baseline tests**

Change assets.test.ts to require:

    expect(regionalBackgroundAssets).toEqual([]);

Change scenes.test.ts so BootScene preload queues no path under /game/assets/regions/ by default, reports zero completions with null timing, and still queues every non-regional sheet.

Add a maps.test.ts invariant:

    expect(Object.values(maps).every((map) => (map.backgroundImages ?? []).length === 0)).toBe(true);

Replace the stale `EXPECTED_ACTIVE_RUNTIME_ASSETS` contract in
meadow-entry-runtime-assets.asset.test.ts with two explicit assertions: all 22 HPA-399 export
bytes still match their committed approval rows under `artifacts/meadow-entry/hpa-399/exports`, and
the retired `public/game/assets/regions/meadow-entry` plus the two Sundrop public files do not
exist. Do not rename historical exports to active assets.

- [ ] **Step 2: Run the focused RED**

Run:

    bun run test:unit -- --run \
      src/lib/game/content/assets.test.ts \
      src/lib/game/content/maps.test.ts \
      src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts \
      src/lib/game/phaser/scenes/scenes.test.ts

Expected RED: the registry still contains 24 assets and BootScene queues them.

- [ ] **Step 3: Remove only active registrations**

Delete the two historical imports/spreads from assets.ts. Keep the historical TypeScript runtime and approvals available to their provenance tests. Update BootScene's stale 7.6 MB comment to state that PR2a has no selected regional assets until PR2b supplies a mode selection.

- [ ] **Step 4: Delete only public runtime copies**

Delete the 24 named public PNGs. Before deletion, record SHA-256 for:

    artifacts/meadow-entry/hpa-399/lfs-canary.png
    src/lib/game/content/approvals/meadow-entry-art-package.ts

Recompute after deletion and require exact equality.

- [ ] **Step 5: Run focused GREEN**

Run the Step 2 command. Expected: all selected files pass and no regional image is queued.

- [ ] **Step 6: Commit**

    git add src/lib/game/content/assets.ts src/lib/game/content/assets.test.ts \
      src/lib/game/phaser/scenes/BootScene.ts src/lib/game/phaser/scenes/scenes.test.ts \
      src/lib/game/content/maps.test.ts \
      src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts \
      public/game/assets/regions
    git commit -m "chore(world): remove dead Meadow background preloads"

---

### Task 2: Regenerate the HPA-586 authoring layout

**Files:**
- Modify: src/lib/game/content/backgrounds/meadow-entry-authoring-layout.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts
- Modify: tools/propose-meadow-entry-authoring-layout.ts
- Test: src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts
- Test: src/lib/game/content/maps/layouts/layouts.test.ts

**Interfaces:**
- MEADOW_ENTRY_AUTHORING_REGIONS remains the single live authoring registry.
- MEADOW_ENTRY_REVIEWED_AUTHORING_REGIONS_SHA256 and MEADOW_ENTRY_REVIEWED_PRIMARY_SOURCE_OWNERS_SHA256 remain independent reviewed seals.
- Principal bounds come from MEADOW_ENTRY_V2_REGION_ENVELOPES; connector bounds come from MEADOW_ENTRY_V2_ROUTE_PATCHES plus the fixed 128 px handoff.

- [ ] **Step 1: Add exact V2 envelope and connector tests**

In meadow-entry-authoring-layout.test.ts import MEADOW_ENTRY_V2_REGION_ENVELOPES and assert the exact tables above. Assert each connector contains its owned route/seam rectangles plus 128 px context where not world-clamped.

- [ ] **Step 2: Run RED**

    bun run test:unit -- --run \
      src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts \
      src/lib/game/content/maps/layouts/layouts.test.ts

Expected RED: five principal envelopes and connector review bounds still carry the predecessor coordinates.

- [ ] **Step 3: Replace the live bounds and refresh only live seals**

Update MEADOW_ENTRY_AUTHORING_REGIONS to the fixed tables. Re-run the module's exact source-containment/outlier diagnostics. Keep primary owners explicit; if a widened V2 region makes an old cross-region resolution unnecessary, remove that resolution rather than retaining a false exception. Recompute the two live SHA-256 seals only after inspecting the sorted rows.

Update propose-meadow-entry-authoring-layout.ts so its candidate regions and output root describe painted-v2 and no longer write under hpa-399.

- [ ] **Step 4: Run GREEN**

Run the Step 2 command. Expected: exact envelopes, source join, outlier resolution, and route ownership all pass.

- [ ] **Step 5: Commit**

    git add src/lib/game/content/backgrounds/meadow-entry-authoring-layout.ts \
      src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts \
      tools/propose-meadow-entry-authoring-layout.ts
    git commit -m "refactor(world): align Meadow art controls to V2"

---

### Task 3: Add the explicit painted-v2 pilot crop contract

**Files:**
- Create: src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.ts
- Create: src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-crop-manifest.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts

**Interfaces:**

Add these reusable validator inputs:

    export type MeadowEntryCoverageMode = 'full-world' | 'partial';

    export interface MeadowEntryFallbackRequirement {
      readonly bounds: PixelBounds;
      readonly reason: string;
    }

    export interface MeadowEntryCropContractValidationOptions {
      readonly crops?: readonly MeadowEntryApprovedCrop[];
      readonly overlaps?: readonly MeadowEntryOverlap[];
      readonly runtimeCoverage?: readonly MeadowEntryRuntimeCoverage[];
      readonly budgetSummary?: MeadowEntryCropBudgetSummary;
      readonly bakeOwnership?: readonly MeadowEntryBakeOwnershipEntry[];
      readonly requiredFallbacks?: readonly MeadowEntryFallbackRequirement[];
      readonly coverageMode?: MeadowEntryCoverageMode;
    }

Defaults must preserve the sealed HPA-399 behavior: full-world coverage, MEADOW_ENTRY_BAKE_OWNERSHIP, and the historical southwest-ocean fallback requirement.

The new module exports:

    MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS
    MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS
    MEADOW_ENTRY_PAINTED_V2_PILOT_RUNTIME_COVERAGE
    MEADOW_ENTRY_PAINTED_V2_PILOT_FALLBACK_REQUIREMENTS
    MEADOW_ENTRY_PAINTED_V2_PILOT_BUDGET_SUMMARY

Keep this module immutable data-only and do not import the later painted ownership table from it.
Task 3 validates dependency injection with synthetic ownership rows; Task 5 performs the first full
painted-v2 validation by supplying `MEADOW_ENTRY_PAINTED_V2_BAKE_OWNERSHIP`. This avoids a crop ↔
ownership import cycle and prevents the new module from silently falling back to V1 defaults.

Use the three fixed crop rows. Declare two base-only overlaps:

- painted-v2-sundrop-village ↔ painted-v2-village-crossroads-connector:
  2592,4480,2880,4896; owner painted-v2-village-crossroads-connector.
- painted-v2-village-crossroads-connector ↔ painted-v2-crossroads:
  2880,4480,3392,4768; owner painted-v2-crossroads.

All three crop records use `derivation: { mode: 'exact-bounds' }`, `reviewBounds` and
`preClampBounds` equal to `bounds`, an empty `coverageAttachments` array, `edgeClamp: null`, an
opaque base, and null foreground filename/key/budgets. Use these exact source-region rows:

- painted-v2-sundrop-village: connector-village-crossroads, sundrop-village, wildwood;
- painted-v2-village-crossroads-connector: connector-village-crossroads, crossroads,
  sundrop-village;
- painted-v2-crossroads: connector-crossroads-mistfen, connector-crossroads-wildwood,
  connector-village-crossroads, crossroads, silverpine, wildwood.

Name the overlaps `painted-v2-overlap-sundrop-connector` and
`painted-v2-overlap-connector-crossroads`. The first route mouth is
`2816,4608,2880,4768` with shared axis `y`; the second is `2880,4608,3264,4768` with shared axis
`x`. Neighbor and overlap ID arrays must be the exact symmetric projection of those two rows.

The partial runtime coverage is the following non-overlapping union partition; `cropIds` follow
crop draw order:

| Bounds L,T,R,B | cropIds |
| --- | --- |
| 2880,2816,4608,4480 | painted-v2-crossroads |
| 256,3968,2880,4480 | painted-v2-sundrop-village |
| 256,4480,2592,4896 | painted-v2-sundrop-village |
| 2592,4480,2880,4896 | painted-v2-sundrop-village; painted-v2-village-crossroads-connector |
| 2880,4480,3392,4768 | painted-v2-village-crossroads-connector; painted-v2-crossroads |
| 3392,4480,4608,4768 | painted-v2-crossroads |
| 2880,4768,3392,4896 | painted-v2-village-crossroads-connector |
| 256,4896,2880,6144 | painted-v2-sundrop-village |

The pilot supplies no fallback rows and an empty fallback-requirement list; fallback outside this
partial union is a runtime selection behavior, not fabricated coverage data.

Budgets:

- Sundrop base: 20 MiB review, 32 MiB hard.
- Connector base: 4 MiB review, 8 MiB hard.
- Crossroads base: 16 MiB review, 24 MiB hard.
- Aggregate base: 40 MiB review, 64 MiB hard; all foreground budgets are zero.

The exact summary is exportAreaRatio `0.229875`, overlapArea `267264`, aggregate base review/hard
`40 MiB`/`64 MiB`, and aggregate foreground review/hard `0`/`0`.

- [ ] **Step 1: Write RED tests for injected behavior**

Add tests proving:

- supplied bakeOwnership is used instead of MEADOW_ENTRY_BAKE_OWNERSHIP;
- partial mode validates every crop/overlap/budget/coverage row, requires coverage union and summed
  area to equal the crop union with no overlap, and does not require 6400×6400 equality;
- partial mode with an empty fallback requirement list does not invoke the V1 southwest assertion;
- a supplied fallback requirement must match bounds and non-empty reason;
- default options retain every existing V1 test.

Also assert that importing the painted-v2 crop module performs no validation against V1 ownership
and that explicit synthetic ownership is required in its focused contract test.

- [ ] **Step 2: Run RED**

    bun run test:unit -- --run \
      src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts

Expected RED: the new module is missing and baked-source/full-world/fallback logic remains hard-coded.

- [ ] **Step 3: Implement the minimum dependency injection**

Thread only the three new inputs into the existing internal validators. In partial mode replace the
master-area target with `unionArea(crops.map(({ bounds }) => bounds))` and skip only implicit V1
fallback assumptions; retain ID uniqueness, dimensions, alpha policy, overlap geometry, budgets,
bounds containment, runtime-coverage validation, and baked-source containment.

- [ ] **Step 4: Run GREEN**

Run Step 2. Then run the unchanged historical crop tests alone to prove default behavior did not weaken.

- [ ] **Step 5: Commit**

    git add src/lib/game/content/backgrounds/meadow-entry-crop-manifest.ts \
      src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts
    git commit -m "feat(world): define painted Meadow pilot crops"

---

### Task 4: Verify historical and painted-v2 LFS contracts independently

**Files:**
- Modify: .gitattributes
- Modify: src/lib/game/content/backgrounds/meadow-entry-storage.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-storage.test.ts
- Modify: tools/verify-meadow-entry-art-storage.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-storage-verifier.test.ts
- Create: artifacts/meadow-entry/painted-v2/lfs-canary.png

**Interfaces:**

Keep MEADOW_ENTRY_ART_STORAGE as the exact HPA-399 record for historical callers. Add:

    export const MEADOW_ENTRY_PAINTED_V2_ART_STORAGE = {
      mode: 'git-lfs',
      sourcePattern: 'artifacts/meadow-entry/painted-v2/**/*.png',
      runtimePattern: 'public/game/assets/regions/meadow-entry-painted-v2/**/*.png',
      canaryPath: 'artifacts/meadow-entry/painted-v2/lfs-canary.png'
    } as const;

Add exact .gitattributes rows for both new patterns. Copy the existing transparent 1×1 canary
bytes into the new path; do not generate scenic content.

- [ ] **Step 1: Write RED tests**

Require separate validators and separate check-attr probes for historical asset, historical proof,
painted-v2 source, and painted-v2 runtime patterns. Require both canaries to be LFS pointers in the
index and materialized transparent PNGs in the worktree.

- [ ] **Step 2: Run RED**

    bun run test:unit -- --run \
      src/lib/game/content/backgrounds/meadow-entry-storage.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-storage-verifier.test.ts

- [ ] **Step 3: Implement exact contracts and attributes**

Do not turn the two records into a root-selectable config. verifyMeadowEntryArtStorage verifies both
fixed records.

- [ ] **Step 4: Run GREEN and real storage verification**

    bun run test:unit -- --run \
      src/lib/game/content/backgrounds/meadow-entry-storage.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-storage-verifier.test.ts
    bun run art:storage:meadow-entry
    git lfs fsck

- [ ] **Step 5: Commit**

    git add .gitattributes artifacts/meadow-entry/painted-v2/lfs-canary.png \
      src/lib/game/content/backgrounds/meadow-entry-storage.ts \
      src/lib/game/content/backgrounds/meadow-entry-storage.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-storage-verifier.test.ts \
      tools/verify-meadow-entry-art-storage.ts
    git commit -m "chore(art): track painted Meadow assets with LFS"

---

### Task 5: Add the reviewed painted-v2 ownership inventory and control inputs

**Files:**
- Modify: src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-controls.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-controls.test.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-controls-exporter.test.ts
- Modify: tools/export-meadow-entry-art-controls.ts
- Modify: tools/approve-meadow-entry-controls.ts
- Create: src/lib/game/content/backgrounds/meadow-entry-painted-v2-controls-approval.test.ts
- Create: src/lib/game/content/approvals/meadow-entry-painted-v2-controls.ts
- Create: docs/superpowers/reports/2026-08-11-painted-v2-controls.md
- Preserve unchanged: src/lib/game/content/approvals/meadow-entry-controls.ts

**Interfaces:**

Reuse MeadowEntryBakeOwnershipEntry and its existing disposition/runtimeRequirement unions for a
separately sealed full source-catalog review:

    export const MEADOW_ENTRY_PAINTED_V2_BAKE_OWNERSHIP:
      readonly MeadowEntryBakeOwnershipEntry[];
    export const MEADOW_ENTRY_REVIEWED_PAINTED_V2_BAKE_OWNERSHIP_SHA256: string;

Every live catalog source gets one sorted explicit row. Pin the 153 ground-patch source keys wholly
contained by at least one fixed pilot crop as a reviewed literal set with `base-underlay` plus
`fallback-tile`; the SHA-256 of sorted `sourceKey\n` rows at PR1 is
`ab450e19860cf3beb73f4972aefadd830535cff48339761d05bd6fc7237c453e`. The other 37 ground patches
use `runtime-fallback-only` plus `fallback-tile`. Production code reads the reviewed literal set;
it must not infer disposition from geometry at module load. The independent test recomputes the
candidate set from the fixed crops/current catalog, requires count 153 and the hash above, and then
requires exact equality with the reviewed literal set so future geometry drift fails closed.

Reviewed painted visuals use base-static plus the existing blocker/decor fallback requirement.
Everything else uses protected-live, runtime-fallback-only, or control-only with the matching
existing runtimeRequirement. Buildings, transitions, NPCs, ambient NPCs, enemies, pickups,
discoveries, quest/stateful objects, landmarks, and unreviewed blockers/decor/fences remain live.
Do not infer blocker/decor/fence disposition from geometry.

The only base-static pilot visual rows use `{ top: 8, right: 8, bottom: 8, left: 8 }` margins. The
blocker motif is `painted-stone-wall`; all four decor motifs are `painted-low-profile-decor`:

- blocker:silverpine-wall-B-south with existing-blocker-fallback;
- decor:village-decor-22-77 with extend-decor-fallback;
- decor:village-decor-28-25 with extend-decor-fallback;
- decor:village-decor-28-53 with extend-decor-fallback;
- decor:village-decor-53-22 with extend-decor-fallback.

All other blocker/decor/fence rows remain live. The runtime generator in PR2b derives complete
owner-crop requirements from these reviewed rows and the three injected pilot crops.

Pin the containment proof in the ownership test:

| Source | Margin-expanded bounds L,T,R,B | Complete pilot owner crops |
| --- | --- | --- |
| blocker:silverpine-wall-B-south | 3140,2870,3540,2950 | painted-v2-crossroads |
| decor:village-decor-22-77 | 2618,4580,2854,4796 | painted-v2-sundrop-village; painted-v2-village-crossroads-connector |
| decor:village-decor-28-25 | 1014,4772,1130,4988 | painted-v2-sundrop-village |
| decor:village-decor-28-53 | 1910,4772,2026,4988 | painted-v2-sundrop-village |
| decor:village-decor-53-22 | 893,5612,1059,5748 | painted-v2-sundrop-village |

The 64 px right expansion of the village crop and 96 px left expansion of the connector are
intentional: they make the boundary decor a complete owner in either identical master-derived
crop. Do not shrink these bounds back to the region envelope or route rectangle.

The active MeadowEntryControlInputs.storage field becomes
typeof MEADOW_ENTRY_PAINTED_V2_ART_STORAGE. Historical approval modules retain their committed
HPA-399 storage hash and are not rebuilt from active controls.

- [ ] **Step 1: Add RED inventory and controls tests**

Require exact one-to-one sorted coverage of collectMeadowEntrySourceCatalog(), exact primary owner agreement, valid pilot crop IDs, no stateful/live-required source marked baked, and an independent SHA-256 seal.

Change control-input tests to require the V2 authoring registry, pilot crops, pilot coverage, pilot ownership, and a fresh combined fingerprint. Require exporter paths:

    artifacts/meadow-entry/painted-v2/controls
    src/lib/game/content/generated/meadow-entry-painted-v2-art-control.ts

Repoint tools/approve-meadow-entry-controls.ts directly to those controls and to
src/lib/game/content/approvals/meadow-entry-painted-v2-controls.ts. Its evidence path must be the
new painted-v2 controls report, never the HPA-399 report. Add --check so the control approval
payload is recomputed and compared without rewriting reviewer metadata or touching the filesystem.

- [ ] **Step 2: Run RED**

    bun run test:unit -- --run \
      src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-controls.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-controls-exporter.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-controls-approval.test.ts

Expected RED: no painted ownership table exists and controls still target hpa-399.

- [ ] **Step 3: Implement and review the exact table**

Add the explicit rows and seal. Before building controls, call `validateMeadowEntryCropContract`
with all five painted-v2 crop inputs, including the painted ownership table, `coverageMode:
'partial'`, and the empty fallback requirement list. Update buildMeadowEntryControlInputs to build
the active painted-v2 contract. Keep rendering/fingerprint algorithms unchanged. Repoint exporter
destinations directly; do not add a package argument.

Generate controls:

    bun tools/export-meadow-entry-art-controls.ts

Review all 18 files and write docs/superpowers/reports/2026-08-11-painted-v2-controls.md with the
exact source fingerprint, authoring seal, ownership seal, crop inventory, storage hash, commands,
and review result. Then run tools/approve-meadow-entry-controls.ts with the reviewer and a
captured UTC-second timestamp. The painted-v2 approval module contains the new combined
fingerprint, crop-manifest hash, ownership hash, storage hash, reviewer, timestamp, and PR2a
evidence path. Do not edit the historical approval.

    REVIEWED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    bun tools/approve-meadow-entry-controls.ts \
      --reviewed-by chanwaichan \
      --reviewed-at "$REVIEWED_AT"
    bun tools/approve-meadow-entry-controls.ts --check

- [ ] **Step 4: Prove deterministic check mode**

    bun tools/export-meadow-entry-art-controls.ts --check

Run it twice and confirm git status is identical before/after.

- [ ] **Step 5: Run GREEN**

Run the Step 2 command plus:

    bun run test:unit -- --run \
      src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts

- [ ] **Step 6: Commit**

    git add artifacts/meadow-entry/painted-v2/controls \
      src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts \
      src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-controls.ts \
      src/lib/game/content/backgrounds/meadow-entry-controls.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-controls-exporter.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-controls-approval.test.ts \
      src/lib/game/content/generated/meadow-entry-painted-v2-art-control.ts \
      src/lib/game/content/approvals/meadow-entry-painted-v2-controls.ts \
      tools/export-meadow-entry-art-controls.ts tools/approve-meadow-entry-controls.ts \
      docs/superpowers/reports/2026-08-11-painted-v2-controls.md
    git commit -m "feat(world): export HPA-586 painted controls"

---

### Task 6: Repoint active write tools and add no-write verification

**Files:**
- Modify: tools/finalize-meadow-entry-masters.ts
- Modify: tools/export-meadow-entry-regions.ts
- Modify: tools/render-meadow-entry-art-proofs.ts
- Modify: tools/approve-meadow-entry-art-package.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-exporter.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-master-finalizer-cli.test.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-export-regions-cli.test.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts
- Modify: src/lib/game/content/backgrounds/meadow-entry-art-package-validator.test.ts
- Create: src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts
- Modify: package.json

**Interfaces:**

- DEFAULT_OUTPUT_ROOT becomes artifacts/meadow-entry/painted-v2 in finalization and export CLIs.
- Approval writes src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts.
- Existing explicit output-root arguments remain review/work destinations.
- The active regional exporter reads masters/meadow-entry-painted-v2-pilot-base-master.png, uses
  MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS/OVERLAPS, and publishes identical bytes to both exports/ and
  public/game/assets/regions/meadow-entry-painted-v2/.
- exportMeadowEntryRegions accepts an optional foreground master and requires it only when at least
  one supplied crop declares a foreground plane. The base-only pilot never fabricates a full
  transparent foreground PNG.
- Every active writer supports --check and performs no mkdir/write/rename/rm.
- --check recomputes expected bytes/object data and compares with checked-in output; missing or stale output fails.
- Existing --validate-only for single-plane finalization remains supported and no-write.
- The existing `art:proof:meadow-entry` script keeps its name but its default inputs/output root
  become painted-v2. The CLI accepts `--check`; historical HPA-399 proof descriptors remain
  importable as frozen test data but are no longer the active writer defaults.

The active painted-v2 proof inventory is exactly six PNG/JSON sidecar pairs under
`artifacts/meadow-entry/painted-v2/proofs/`:

    pilot-assembly-master-transparency
    pilot-assembly-base-coverage
    pilot-assembly-protected-live
    pilot-assembly-ownership
    pilot-assembly-overlap-sundrop-connector
    pilot-assembly-overlap-connector-crossroads

- [ ] **Step 1: Add no-write RED tests with filesystem spies**

For each command, seed a temporary matching snapshot, call --check, assert success and zero mutating
filesystem calls. Then alter one byte and require a stale error. Add parser tests rejecting --check
combined with publication-only review flags. The proof tests must also reject the deleted public
Sundrop/HPA-399 paths in active defaults and assert the exact six painted-v2 proof IDs above.

- [ ] **Step 2: Run RED**

    bun run test:unit -- --run \
      src/lib/game/content/backgrounds/meadow-entry-master-finalizer-cli.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-export-regions-cli.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts

Expected RED: export and approval lack --check, roots still point to hpa-399, and finalizer cannot compare checked-in bytes.

- [ ] **Step 3: Implement direct painted-v2 destinations**

Change constants, allowlists, generated comments, exporter/proof inputs and publication paths, and
package scripts. Inject the painted crop/overlap/control inputs into the existing pure proof
renderers; do not fork their image algorithms. Do not add a package selector. Keep the historical
validator and historical approval tests read-only; where they currently rebuild from live
controls, change them to verify their committed hashes/allowlists rather than asking the active
painted-v2 writer to reproduce HPA-399.

- [ ] **Step 4: Run GREEN**

Run Step 2 and the historical art-package validator unit file. Actual painted-v2 --check commands are expected to fail as missing until PR2b commits art; parser/no-write fixture tests must pass now.

- [ ] **Step 5: Commit**

    git add package.json tools/finalize-meadow-entry-masters.ts \
      tools/export-meadow-entry-regions.ts tools/render-meadow-entry-art-proofs.ts \
      tools/approve-meadow-entry-art-package.ts \
      src/lib/game/content/backgrounds/meadow-entry-exporter.ts \
      src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
      src/lib/game/content/backgrounds/*cli.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-art-package-validator.test.ts
    git commit -m "refactor(art): retarget Meadow writers to painted v2"

---

### Task 7: Establish the cleaned texture-probe baseline

**Files:**
- Modify: tools/probe-meadow-entry-texture-safety.ts
- Modify: tools/probe-meadow-entry-texture-safety.test.ts
- Modify: src/lib/game/content/meadow-entry-texture-safety-probe-unit.test.ts
- Modify: src/lib/game/content/meadow-entry-texture-safety-probe-orchestration.test.ts
- Modify: src/lib/game/content/meadow-entry-texture-safety-probe.test.ts
- Create: docs/superpowers/reports/2026-08-11-painted-v2-zero-texture-baseline.md

**Interfaces:**

Replace the hard-coded 22-export assumption with:

    export interface TextureSafetyProbeInput {
      readonly label: string;
      readonly assets: readonly TextureSafetyAsset[];
      readonly expectedRetainedTextures: number;
    }

    export async function runMeadowEntryTextureSafetyProbe(
      input: TextureSafetyProbeInput,
      repositoryRoot?: string
    ): Promise<TextureSafetyProbeReport>;

The PR2a CLI invokes a fixed zero-baseline input. Zero assets is a valid proceed result only for label painted-v2-clean-baseline and expectedRetainedTextures 0.

- [ ] **Step 1: Write RED tests**

Require an injected zero-asset report, an injected candidate report, exact expected retention, unique IDs, correct failure classification, and no import of meadowEntryArtPackageApproval.

- [ ] **Step 2: Run RED**

    bun run test:unit -- --run \
      src/lib/game/content/meadow-entry-texture-safety-probe-unit.test.ts \
      src/lib/game/content/meadow-entry-texture-safety-probe-orchestration.test.ts \
      src/lib/game/content/meadow-entry-texture-safety-probe.test.ts \
      tools/probe-meadow-entry-texture-safety.test.ts

- [ ] **Step 3: Implement the injected probe**

Retain the one-context upload logic, WebGL metadata, structured setup failure, and deterministic JSON. Remove the historical approval import and the fixed count 22.

- [ ] **Step 4: Capture baseline evidence**

    bun run world:probe:meadow-entry-textures

Record: active registry count 0, selected asset count 0, retained texture count 0, renderer/MAX_TEXTURE_SIZE when available, command, date, platform, and any narrow localhost escalation.

- [ ] **Step 5: Run GREEN**

Run Step 2 and verify the report document contains no claim about 3200/1600 candidates; that belongs to PR2b.

- [ ] **Step 6: Commit**

    git add tools/probe-meadow-entry-texture-safety.ts \
      tools/probe-meadow-entry-texture-safety.test.ts \
      src/lib/game/content/meadow-entry-texture-safety-probe*.test.ts \
      docs/superpowers/reports/2026-08-11-painted-v2-zero-texture-baseline.md
    git commit -m "test(world): establish zero-texture Meadow baseline"

---

### Task 8: PR2a cumulative validation and review gate

**Files:**
- Create: docs/superpowers/reports/2026-08-11-meadow-entry-painted-pr2a-validation.md
- Verify: all files changed by Tasks 1–7

- [ ] **Step 1: Verify immutable historical bytes**

Compare the pre-Task-1 hashes for artifacts/meadow-entry/hpa-399/lfs-canary.png and src/lib/game/content/approvals/meadow-entry-art-package.ts. Run:

    git diff 709e4b6 -- artifacts/meadow-entry/hpa-399 \
      src/lib/game/content/approvals/meadow-entry-art-package.ts

Expected: empty.

- [ ] **Step 2: Run focused PR2a tests**

    bun run test:unit -- --run \
      src/lib/game/content/assets.test.ts \
      src/lib/game/content/maps.test.ts \
      src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts \
      src/lib/game/phaser/scenes/scenes.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts \
      src/lib/game/content/maps/layouts/layouts.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-controls.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-controls-exporter.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-controls-approval.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-storage.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-storage-verifier.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-master-finalizer-cli.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-export-regions-cli.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-approval-cli.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-art-package-validator.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
      src/lib/game/content/meadow-entry-texture-safety-probe-unit.test.ts \
      src/lib/game/content/meadow-entry-texture-safety-probe-orchestration.test.ts \
      src/lib/game/content/meadow-entry-texture-safety-probe.test.ts \
      tools/probe-meadow-entry-texture-safety.test.ts

- [ ] **Step 3: Run repository gates**

    bun run test:unit -- --run
    bun run check
    bun run lint
    bun run build
    bun run build:tauri
    git diff --check

- [ ] **Step 4: Independent review**

Review for:

- zero active regional texture registrations and zero active map backgrounds;
- no scenic PNG except the transparent canary;
- exact V2 region/crop tables;
- preserved V1 validator defaults and immutable approvals;
- no-write behavior with filesystem mutation spies;
- no package selector or new renderer;
- clean Git LFS materialization.

Fix every Critical or Important finding with a new RED/GREEN commit and rerun the affected gates.

- [ ] **Step 5: Write the validation report**

Record exact commands/counts, baseline probe output, immutable hashes, review verdict, and PR2b dependency. End with:

    PR2a ready for review; PR2b must start from the reviewed PR2a head.

- [ ] **Step 6: Commit the validation evidence**

    git add docs/superpowers/reports/2026-08-11-meadow-entry-painted-pr2a-validation.md
    git commit -m "docs(world): validate painted Meadow PR2a"
