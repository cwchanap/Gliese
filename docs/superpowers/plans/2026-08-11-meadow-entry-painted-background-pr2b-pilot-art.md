# Meadow Entry Painted Background PR2b Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Create, finalize, integrate, and visually validate a large painted-background pilot for Sundrop Village, Hero House frontage, the village–Crossroads lane, and Crossroads while keeping default gameplay on the HPA-586 graybox.

**Architecture:** Build one coherent 6400×6400 concept and five native-detail source panels, assemble those panels into a transparent-outside-pilot 6400×6400 working master, and cut three opaque base-only runtime crops from that assembly. Generate immutable descriptor/ownership data, select it through a fallback/pilot/production record, apply it with one pure map transform at WorldScene.resolveMap, and let the existing generic background renderer handle success and fallback. BootScene preloads only the selected pilot assets. PR2b stops at explicit user visual approval; PR3 owns the complete opaque master and default activation.

**Tech Stack:** Built-in image generation, TypeScript, Sharp, Phaser 4, Vitest, Playwright, Vite, Tauri, Git LFS.

## Dependency and Stop Conditions

- Start from the reviewed PR2a head, not directly from PR1 commit 709e4b6.
- Confirm PR2a has zero active regional assets, fresh painted-v2 controls, the three-crop partial contract, no-write tool support, and clean LFS verification.
- Use the imagegen skill and built-in image-generation tool for concept and panel candidates. Use the 2d-game-asset-workflow and gliese-world-expansion skills for asset preparation and runtime wiring.
- Stop after the concept review if its composition, route hierarchy, palette, or upper-left lighting direction is rejected.
- Stop after the native pilot visual review if the user does not explicitly approve the painted direction. Do not begin PR3 or generate remaining world regions.
- Do not pass third-party game screenshots to image generation. The approved concept and HPA-586 control exports are the only image references.
- Do not modify gameplay geometry to fit art. Regenerate or clean the art.
- Do not add a foreground pilot asset. Keep foreground-capable types and failure tests, but leave all live canopies/eaves/tall props live for this first visual decision.
- Do not change the save schema.

## Fixed Art Inventory

All package paths are below artifacts/meadow-entry/painted-v2/.

### Concept

| Path | Required final dimensions | Runtime |
| --- | --- | --- |
| concept/meadow-entry-painted-v2-concept.png | 6400×6400 | Never |
| concept/meadow-entry-painted-v2-concept-provenance.json | text | Never |

The concept may begin at a smaller generated size, but its provenance must record the exact crop and uniform normalization scale. It is composition evidence only.

### Native-detail source panels

| Panel ID | Master bounds L,T,R,B | Final dimensions | Assembly priority |
| --- | --- | --- | --- |
| sundrop-north | 256,3968,2880,5056 | 2624×1088 | 10 |
| sundrop-south | 256,4928,2880,6144 | 2624×1216 | 20 |
| hero-house-frontage | 384,5312,1280,6144 | 896×832 | 30 |
| village-crossroads-connector | 2592,4480,3392,4896 | 800×416 | 40 |
| crossroads | 2880,2816,4608,4768 | 1728×1952 | 50 |

Raw candidates live in source-panels/raw/<panel-id>.png. Deterministically normalized, manually reviewed panels live in source-panels/<panel-id>.png. Each has source-panels/<panel-id>.json with generation and cleanup provenance.

The north/south village panels overlap by 128 px. Hero House frontage deliberately overrides the southern panel inside its bounds. The connector owns its overlap with Sundrop; Crossroads owns its overlap with the connector. The assembly order above encodes those owners.

### Working master and runtime exports

| Path | Dimensions | Alpha policy |
| --- | --- | --- |
| masters/meadow-entry-painted-v2-pilot-base-master.png | 6400×6400 | transparent outside pilot; opaque throughout every runtime crop |
| exports/painted-v2-sundrop-village-base.png | 2624×2176 | opaque |
| exports/painted-v2-village-crossroads-connector-base.png | 800×416 | opaque |
| exports/painted-v2-crossroads-base.png | 1728×1952 | opaque |

Runtime copies use the same three filenames under public/game/assets/regions/meadow-entry-painted-v2/. Runtime and package export bytes must be identical.

### Conservative reviewed live/baked boundary

The pilot paints terrain, ground materials, path wear, low environmental dressing, and the following explicitly reviewed visual sources:

- blocker:silverpine-wall-B-south → crossroads;
- decor:village-decor-22-77 → sundrop-village plus village-crossroads-connector;
- decor:village-decor-28-25 → sundrop-village;
- decor:village-decor-28-53 → sundrop-village;
- decor:village-decor-53-22 → sundrop-village.

Every other blocker, decor, and fence remains live. In particular, live buildings, castle gate, Waystone, lanterns, corridor waymarker, actors, enemies, pickups, discoveries, transitions, doors, and all stateful content stay live. Collision remains unconditional for the one baked blocker.

## Generated Runtime Boundary

PR2b creates:

    src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts
    src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.ts
    src/lib/game/content/maps/meadow-entry-painted-backgrounds.ts

The generated module contains approved descriptors and visual-owner rows only. The thin runtime wrapper projects immutable selections:

    export type MeadowEntryPaintedMode = 'fallback' | 'pilot' | 'production';

    export interface MeadowEntryPaintedSelection {
      readonly mode: MeadowEntryPaintedMode;
      readonly assets: readonly RegionalBackgroundPreloadAsset[];
      readonly backgrounds: readonly MapBackgroundImage[];
      readonly visualOwners: readonly MeadowEntryRuntimeVisualOwner[];
    }

    export const MEADOW_ENTRY_DEFAULT_PAINTED_MODE: MeadowEntryPaintedMode = 'fallback';

    export interface MeadowEntryPaintedSelectionOptions {
      readonly regionalBackgrounds: boolean;
      readonly meadowPaintedPilot: boolean;
    }

    export function resolveMeadowEntryPaintedSelection(
      options: MeadowEntryPaintedSelectionOptions
    ): MeadowEntryPaintedSelection;

Keep this options interface in the content layer. `WorldRenderOptions` is structurally compatible;
the runtime wrapper must not import from the Phaser layer.

Selection rules:

1. regionalBackgrounds false always returns the empty fallback selection.
2. meadowPaintedPilot true returns pilot while PR2b default is fallback.
3. Otherwise return the selection named by MEADOW_ENTRY_DEFAULT_PAINTED_MODE.
4. Production exists as an empty, fail-closed record until PR3 supplies approved descriptors.

---

### Task 1: Lock the source-panel and pilot assembly contract

**Files:**
- Create: src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.ts
- Create: src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts
- Verify: src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.ts
- Verify: src/lib/game/content/maps/layouts/meadow-entry-v2.ts

**Interfaces:**

    export interface MeadowEntryPaintedV2SourcePanel {
      readonly id: string;
      readonly bounds: PixelBounds;
      readonly expectedDimensions: { readonly width: number; readonly height: number };
      readonly assemblyPriority: number;
      readonly rawPath: string;
      readonly normalizedPath: string;
      readonly provenancePath: string;
    }

    export const MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS: readonly MeadowEntryPaintedV2SourcePanel[];
    export const MEADOW_ENTRY_PAINTED_V2_PILOT_MASTER_PATH: string;
    export const MEADOW_ENTRY_PAINTED_V2_RUNTIME_ROOT: string;

- [ ] **Step 1: Write RED contract tests**

Assert the five exact rows, unique IDs/paths/priorities, dimensions equal bounds, north/south overlap exactly 128 px, Hero frontage containment in Sundrop, and exact coverage of every pixel in all three runtime crops by at least one panel.

Assert every panel and crop is inside MEADOW_ENTRY_V2_WORLD; Crossroads equals its active V2
envelope; Sundrop contains its active V2 envelope and expands only its right edge by 64 px; the
connector contains MEADOW_ENTRY_V2_ROUTES.villageToCrossroads and overlaps both neighbors. Pin the
8 px margin-expanded `village-decor-22-77` bounds `2618,4580,2854,4796` inside both Sundrop and
connector crops so either identical master-derived crop is a complete runtime owner.

- [ ] **Step 2: Run RED**

    bun run test:unit -- --run \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts \
      src/lib/game/content/maps/layouts/layouts.test.ts

Expected RED: the panel module does not exist.

- [ ] **Step 3: Implement immutable data only**

Use Object.freeze or readonly literal records. Do not add generation or runtime logic here.

- [ ] **Step 4: Run GREEN and commit**

    bun run test:unit -- --run \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts
    git add src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts
    git commit -m "feat(art): define painted Meadow pilot panels"

---

### Task 2: Generate and approve the coherent whole-world concept

**Files:**
- Create: artifacts/meadow-entry/painted-v2/concept/meadow-entry-painted-v2-concept.png
- Create: artifacts/meadow-entry/painted-v2/concept/meadow-entry-painted-v2-concept-provenance.json
- Create: artifacts/meadow-entry/painted-v2/provenance.json
- Create: docs/superpowers/reports/img/hpa-586-painted-v2-pilot/concept-overview.png

**Required skill action:** Announce and use imagegen. Inspect the returned image before any normalization or acceptance.

- [ ] **Step 1: Prepare references**

Use the 6400×6400 composite control, terrain/path mask, region mask, collision mask, building/transition mask, protected-live mask, and semantic-anchor mask from artifacts/meadow-entry/painted-v2/controls. Do not use HPA-399 pixels or third-party screenshots.

- [ ] **Step 2: Generate the concept**

Prompt for:

- orthographic top-down/three-quarter JRPG map;
- warm late-morning light from upper left;
- cultivated warm green Sundrop, cobble/earth Crossroads, cool wet Mistfen, autumn Silverpine, deep Wildwood, bright Tidewatch coast;
- immediately legible routes and calm interaction clearances;
- crisp shapes rather than oil-paint blur;
- no baked buildings, characters, doors, labels, UI, enemies, pickups, or false walls.

- [ ] **Step 3: Normalize deterministically**

Use normalizeMeadowEntryMasterCandidate with an explicit MeadowEntryNormalizationTransform and expected output 6400×6400. Reject non-uniform scaling. If scale exceeds 2×, regenerate unless the user explicitly approves that concept-only scale.

- [ ] **Step 4: Record provenance**

Record tool/model, complete prompt, every reference path/hash, raw dimensions/hash, transform, normalized hash/bytes, and zero manual cleanup or the exact cleanup operations.

- [ ] **Step 5: Visual review gate**

Inspect at full map and native detail. Verify biome masses, route continuity, value hierarchy, and lighting. Present concept-overview.png to the user. Do not generate source panels until the user approves the concept.

- [ ] **Step 6: Commit approved concept**

    git add artifacts/meadow-entry/painted-v2/concept \
      artifacts/meadow-entry/painted-v2/provenance.json \
      docs/superpowers/reports/img/hpa-586-painted-v2-pilot/concept-overview.png
    git commit -m "art(world): establish painted Meadow concept"

---

### Task 3: Generate the five native-detail source panels

**Files:**
- Create: artifacts/meadow-entry/painted-v2/source-panels/raw/*.png
- Create: artifacts/meadow-entry/painted-v2/source-panels/*.png
- Create: artifacts/meadow-entry/painted-v2/source-panels/*.json
- Modify: artifacts/meadow-entry/painted-v2/provenance.json
- Create: docs/superpowers/reports/img/hpa-586-painted-v2-pilot/panel-review-*.png

**Required skill action:** Use imagegen separately for each bounded panel so every generated result has one unambiguous control crop and provenance row.

- [ ] **Step 1: Create per-panel reference crops**

Crop the approved composite control and relevant masks to each fixed panel bound at one-to-one master coordinates. Include 128 px overlap context where specified. Use the concept crop only as secondary color/composition guidance.

- [ ] **Step 2: Generate Sundrop north and south**

Require cultivated grass/soil, irregular paths, field rows, drainage, flowers, stones, leaf litter, and painted building-footprint contact shadows. Exclude buildings/doors and keep routes/approaches quiet.

- [ ] **Step 3: Generate Hero House frontage**

Require a welcoming garden clearing, calm spawn-to-door route, foundation wear that fits the live house footprint, and no baked house or false doorway.

- [ ] **Step 4: Generate connector and Crossroads**

Connector: scenic narrowing, thinning cultivation, path wear, ground flowers, and lantern-footing shadows without tall obstruction.

Crossroads: cobble/packed-earth plaza centered around an empty live-Waystone footprint, radial route wear, biome cues at mouths, and clear NPC/interaction space.

- [ ] **Step 5: Normalize and clean**

For each panel:

- validate native dimensions and exact uniform transform;
- reject stretch and scale greater than 2× without explicit approval;
- normalize sRGB/RGBA with existing pure PNG utilities;
- manually remove baked buildings, actors, false walls, blocked doorways, text, obvious generator seams, and protected-mask violations;
- record before/after hashes and exact cleanup operations.

- [ ] **Step 6: Native-detail review**

Inspect every normalized panel at 100%. Inspect both village overlap strips and the connector/Crossroads handoff side by side. Regenerate or clean any repeated-grid motif, blur, seam, false collision cue, or scale mismatch.

- [ ] **Step 7: Commit panels**

    git add artifacts/meadow-entry/painted-v2/source-panels \
      artifacts/meadow-entry/painted-v2/provenance.json \
      docs/superpowers/reports/img/hpa-586-painted-v2-pilot/panel-review-*.png
    git commit -m "art(world): paint Meadow pilot panels"

---

### Task 4: Assemble, validate, and export the partial pilot master

**Files:**
- Create: src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.ts
- Create: src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts
- Create: tools/finalize-meadow-entry-painted-v2-pilot.ts
- Create: src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts
- Create: artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png
- Create: artifacts/meadow-entry/painted-v2/exports/*.png
- Create: artifacts/meadow-entry/painted-v2/proofs/pilot-assembly-*.png
- Create: artifacts/meadow-entry/painted-v2/proofs/pilot-assembly-*.json
- Modify: artifacts/meadow-entry/painted-v2/provenance.json
- Copy generated export bytes to: public/game/assets/regions/meadow-entry-painted-v2/*.png
- Verify: tools/render-meadow-entry-art-proofs.ts

**Interfaces:**

    export interface MeadowEntryPaintedV2PilotAssemblyInput {
      readonly panels: Readonly<Record<string, Buffer>>;
      readonly panelProvenance: Readonly<Record<string, MeadowEntryGenerationProvenance>>;
      readonly controlFingerprint: string;
      readonly approvedControlFingerprint: string;
    }

    export async function assembleMeadowEntryPaintedV2Pilot(
      input: MeadowEntryPaintedV2PilotAssemblyInput
    ): Promise<{
      readonly masterPng: Buffer;
      readonly provenanceJson: Buffer;
    }>;

- [ ] **Step 1: Write RED pure tests**

Use tiny synthetic panels to prove:

- assembly follows priority order;
- outside-pilot pixels are transparent;
- every runtime crop is fully opaque;
- source-panel dimensions and hashes fail closed;
- rerunning produces byte-identical PNG/provenance;
- --check performs no writes and rejects one-byte drift.

Extend the active export CLI fixture tests to prove that exports come from the assembled master
through exportMeadowEntryRegions, both approved overlap slices are byte-identical, and runtime-copy
bytes equal package-export bytes.

- [ ] **Step 2: Run RED**

    bun run test:unit -- --run \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts

- [ ] **Step 3: Implement with reused utilities**

Reuse normalizeMeadowEntryMasterCandidate, encodeCanonicalMeadowEntryPng, decodeMeadowEntryRgba,
and generation provenance validators. Create a transparent 6400×6400 RGBA canvas; do not weaken
MEADOW_ENTRY_MASTER_POLICY or call the full opaque-master finalizer. Keep crop extraction in the
already repointed regional exporter.

- [ ] **Step 4: Finalize real art**

    bun tools/finalize-meadow-entry-painted-v2-pilot.ts
    bun tools/export-meadow-entry-regions.ts
    bun tools/render-meadow-entry-art-proofs.ts
    bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
    bun tools/export-meadow-entry-regions.ts --check
    bun tools/render-meadow-entry-art-proofs.ts --check

Inspect the full partial master on transparency, every crop, overlap, and protected-live overlay. Confirm all three exports are opaque and within fixed budgets.

- [ ] **Step 5: Run GREEN and commit**

    bun run test:unit -- --run \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts
    git add src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer* \
      tools/finalize-meadow-entry-painted-v2-pilot.ts \
      artifacts/meadow-entry/painted-v2/masters \
      artifacts/meadow-entry/painted-v2/exports \
      artifacts/meadow-entry/painted-v2/proofs \
      artifacts/meadow-entry/painted-v2/provenance.json \
      public/game/assets/regions/meadow-entry-painted-v2
    git commit -m "feat(art): finalize painted Meadow pilot"

---

### Task 5: Approve the package and generate painted-v2 runtime data

**Files:**
- Create: src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts
- Modify: tools/approve-meadow-entry-art-package.ts
- Modify: tools/generate-meadow-entry-runtime.ts
- Create: src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts
- Create: src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.ts
- Create: src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts
- Create: src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts
- Modify: package.json

**Generated descriptors:**

| ID | Runtime path | Center x,y | Width×height | Plane/order |
| --- | --- | --- | --- | --- |
| meadow-entry-painted-v2-sundrop-village-base-image | /game/assets/regions/meadow-entry-painted-v2/painted-v2-sundrop-village-base.png | 1568,5056 | 2624×2176 | base/0 |
| meadow-entry-painted-v2-village-crossroads-connector-base-image | /game/assets/regions/meadow-entry-painted-v2/painted-v2-village-crossroads-connector-base.png | 2992,4688 | 800×416 | base/10 |
| meadow-entry-painted-v2-crossroads-base-image | /game/assets/regions/meadow-entry-painted-v2/painted-v2-crossroads-base.png | 3744,3792 | 1728×1952 | base/20 |

Refactor the generator around this structural input; it is dependency injection for the one active
writer, not a CLI-selectable package abstraction:

    export interface MeadowEntryRuntimeGenerationInput {
      readonly crops: readonly MeadowEntryApprovedCrop[];
      readonly bakeOwnership: readonly MeadowEntryBakeOwnershipEntry[];
      readonly approvedExports: readonly {
        cropId: string;
        path: string;
        width: number;
        height: number;
        plane: MapBackgroundPlane;
        textureKey: string;
        drawOrder: number;
      }[];
      readonly runtimeRoot: string;
    }

    export function collectMeadowEntryRuntimeData(
      input: MeadowEntryRuntimeGenerationInput
    ): MeadowEntryRuntimeData;

The executable supplies only painted-v2 crop, ownership, approval-export, and runtime-root
constants and always writes `meadow-entry-painted-v2.generated.ts`. Remove its hard-coded imports
of HPA-399 approval/crops and the historical Sundrop blocker exclusion. Historical generator tests
may pass explicit fixtures to the pure collector but cannot change the active destination.

- [ ] **Step 1: Write generator/runtime RED tests**

Require the exact three descriptors, exact runtime paths, exact package hashes/dimensions, exact
baked owner rows from the fixed conservative boundary, deterministic source rendering, and
--check stale/missing behavior. Require the boundary decor to produce two complete owner-crop rows
and every other reviewed visual to produce the exact single crop listed in PR2a.

Require fallback/pilot/production selections, fallback default, flag priority, structural immutability, and no import of the historical generated runtime module.

- [ ] **Step 2: Run RED**

    bun run test:unit -- --run \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts

- [ ] **Step 3: Approve fixed package bytes**

Run storage verification, control --check, pilot finalizer --check, export --check, then:

    REVIEWED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    bun tools/approve-meadow-entry-art-package.ts \
      --reviewed-by chanwaichan \
      --reviewed-at "$REVIEWED_AT"
    bun tools/approve-meadow-entry-art-package.ts --check

The approval must inventory concept, five normalized source panels, pilot master, three exports, proofs, provenance, storage hash, and fresh control fingerprint. Raw candidates remain provenance inputs but are not runtime descriptors.

- [ ] **Step 4: Generate the new module**

Extend the existing generator pattern, but emit only:

    src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts

Do not overwrite src/lib/game/content/generated/meadow-entry-runtime.ts and do not add a package switch.

- [ ] **Step 5: Run GREEN**

    bun tools/generate-meadow-entry-runtime.ts
    bun tools/generate-meadow-entry-runtime.ts --check
    bun run test:unit -- --run \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts

- [ ] **Step 6: Commit**

    git add package.json tools/approve-meadow-entry-art-package.ts \
      tools/generate-meadow-entry-runtime.ts \
      src/lib/game/content/approvals/meadow-entry-painted-v2-art-package.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime*.test.ts
    git commit -m "feat(world): generate painted Meadow runtime data"

---

### Task 6: Add the pure Meadow Entry map transform

**Files:**
- Create: src/lib/game/content/maps/meadow-entry-painted-backgrounds.ts
- Create: src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts
- Test: src/lib/game/content/maps/background-ownership.test.ts

**Interface:**

    export interface ApplyMeadowEntryPaintedBackgroundOptions {
      readonly selection: MeadowEntryPaintedSelection;
    }

    export function applyMeadowEntryPaintedBackgrounds(
      map: WorldMapDefinition,
      options: ApplyMeadowEntryPaintedBackgroundOptions
    ): WorldMapDefinition;

- [ ] **Step 1: Write RED transform tests**

Cover:

- non-Meadow identity;
- fallback identity;
- pilot shallow clone with exact descriptors;
- blocker, decor, and fence assignment using synthetic reviewed rows;
- real pilot blocker/decor assignments;
- no mutation of source map or nested arrays;
- reject duplicate owner rows, missing source IDs, pre-existing visual overwrite, and missing descriptor IDs;
- validateMapBackgroundOwnership called on the result;
- missing/failed texture behavior remains a renderer concern, not a transform mutation.

- [ ] **Step 2: Run RED**

    bun run test:unit -- --run \
      src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts \
      src/lib/game/content/maps/background-ownership.test.ts

- [ ] **Step 3: Implement the pure transform**

Split generated owners by sourceType, call applyVisualOwnership on blockers/mapDecor/fences with rejectExisting true, attach selection.backgrounds, then call validateMapBackgroundOwnership. Return the original object for both identity cases.

- [ ] **Step 4: Run GREEN and commit**

    bun run test:unit -- --run \
      src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts \
      src/lib/game/content/maps/background-ownership.test.ts
    git add src/lib/game/content/maps/meadow-entry-painted-backgrounds.ts \
      src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts
    git commit -m "feat(world): apply painted Meadow backgrounds"

---

### Task 7: Wire selection into URL options, preload, map resolution, and diagnostics

**Files:**
- Modify: src/lib/game/phaser/world-render-options.ts
- Modify: src/lib/game/phaser/world-render-options.test.ts
- Modify: src/lib/game/phaser/scenes/BootScene.ts
- Modify: src/lib/game/phaser/scenes/WorldScene.ts
- Modify: src/lib/game/phaser/scenes/scenes.test.ts
- Modify: src/lib/game/phaser/regional-background-plane-render-diagnostics.ts
- Modify: src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts
- Modify: src/lib/game/phaser/renderer-diagnostics.ts
- Modify: src/lib/game/phaser/renderer-diagnostics.test.ts

**Interfaces:**

WorldRenderOptions adds:

    meadowPaintedPilot: boolean;

It is true only for exact meadowPaintedPilot=on. regionalBackground=off has higher priority through resolveMeadowEntryPaintedSelection.

RegionalBackgroundPlaneRenderDiagnostic adds:

    paintedMode: MeadowEntryPaintedMode;

The preload diagnostic also records the same effective mode and only selected keys.

- [ ] **Step 1: Write URL/selection RED tests**

Test default, exact on, malformed values, repeated values, combined off+pilot, collision debug, movement diagnostics, and render-fault parsing.

- [ ] **Step 2: Write BootScene RED tests**

Require:

- default queues zero painted assets;
- pilot on queues exactly three selected assets;
- pilot on plus regional off queues zero;
- diagnostics count only selected assets;
- deliberate off mode emits zero completions without texture-failure status.

- [ ] **Step 3: Write WorldScene RED tests**

Require resolveMap to call the pure transform after registry lookup. Cover default fallback, pilot descriptors, non-Meadow maps, exact successful IDs, missing texture, wrong dimensions, injected render failure, live fallback restoration, collision still present for the baked blocker, and paintedMode in diagnostics.

Use exact ownership cases: a failed Crossroads plane restores
`blocker:silverpine-wall-B-south`; a failed Sundrop plane restores
`decor:village-decor-28-25`; `decor:village-decor-22-77` stays suppressed when either of its two
complete overlap crops succeeds and returns live only when both fail. Collision for the blocker is
present in every case.

- [ ] **Step 4: Run RED**

    bun run test:unit -- --run \
      src/lib/game/phaser/world-render-options.test.ts \
      src/lib/game/phaser/renderer-diagnostics.test.ts \
      src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
      src/lib/game/phaser/scenes/scenes.test.ts

- [ ] **Step 5: Implement the single seam**

BootScene resolves selection once and queues selection.assets. WorldScene already resolves render options before resolveMap; make resolveMap:

    const source = maps[mapId ?? openingMapId] ?? maps[openingMapId];
    return applyMeadowEntryPaintedBackgrounds(source, {
      selection: resolveMeadowEntryPaintedSelection(this.renderOptions)
    });

Keep renderRegionalBackgrounds generic. Do not add pilot-specific drawing branches.

- [ ] **Step 6: Run GREEN and commit**

Run Step 4.

    git add src/lib/game/phaser/world-render-options* \
      src/lib/game/phaser/renderer-diagnostics* \
      src/lib/game/phaser/regional-background-plane-render-diagnostics* \
      src/lib/game/phaser/scenes/BootScene.ts \
      src/lib/game/phaser/scenes/WorldScene.ts \
      src/lib/game/phaser/scenes/scenes.test.ts
    git commit -m "feat(world): enable painted Meadow pilot mode"

---

### Task 8: Add focused browser gameplay and fallback proof

**Files:**
- Modify: tests/e2e/game.e2e.ts
- Create: docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-browser.md

**Test titles:**

    Meadow painted pilot selects only approved planes and preserves live fallbacks
    Meadow painted pilot preserves the village Crossroads gameplay loop

- [ ] **Step 1: Write the pilot-selection RED test**

Install the existing preload and plane-render diagnostic listeners before page load. Open:

    /?meadowPaintedPilot=on&movementDiagnostics=on

Assert mode pilot, exactly three successful IDs, correct dimensions, no missing/render failures,
and expected live fallback IDs. Reload with regionalBackground=off and assert zero
selected/preloaded/drawn planes with no failure diagnostic. Inject a missing Crossroads plane and
prove the Silverpine wall visual returns while its collision remains; inject a Sundrop render fault
and prove `village-decor-28-25` returns. Also prove the boundary decor remains suppressed when its
other complete owner crop succeeds.

- [ ] **Step 2: Write the gameplay-loop RED test**

Seed only at the normal Meadow spawn. Reuse the browser-local route driver to cover:

- Hero House frontage and door approach;
- Sundrop main street and one live NPC interaction;
- one live pickup;
- village → connector → Crossroads;
- Crossroads Waystone discovery;
- connector → village return;
- one save/reload with exact player/state proof.

Assert movement diagnostics remain collision-faithful and no coordinate is injected after the initial save seed.

- [ ] **Step 3: Run RED**

    bun run test:e2e -- --grep "Meadow painted pilot"

Expected RED before Task 7 integration or before built assets are present.

- [ ] **Step 4: Make only evidence-backed route corrections**

Use current HPA-586 route constants. Do not widen collision tolerances, teleport, mutate player coordinates, or weaken existing outdoor tests.

- [ ] **Step 5: Run GREEN**

    bun run test:e2e -- --grep "Meadow painted pilot"

Record test count, timings, selected IDs, failure-mode results, and save/reload evidence.

- [ ] **Step 6: Commit**

    git add tests/e2e/game.e2e.ts \
      docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-browser.md
    git commit -m "test(world): validate painted Meadow pilot"

---

### Task 9: Measure 3200 and 1600 texture candidates

**Files:**
- Modify: tools/probe-meadow-entry-texture-safety.ts
- Modify: tools/probe-meadow-entry-texture-safety.test.ts
- Create: artifacts/meadow-entry/painted-v2/proofs/texture-probe/representative-3200.png
- Create: artifacts/meadow-entry/painted-v2/proofs/texture-probe/representative-1600.png
- Create: artifacts/meadow-entry/painted-v2/proofs/texture-probe/browser-3200.json
- Create: artifacts/meadow-entry/painted-v2/proofs/texture-probe/browser-1600.json
- Create: docs/superpowers/reports/2026-08-11-meadow-entry-painted-texture-preflight.md

**Interfaces:**

Add fixed candidate-set inputs:

    painted-v2-2x2: four unique asset records referencing the 3200×3200 representative;
    painted-v2-4x4: sixteen unique asset records referencing the 1600×1600 representative.

The representative PNGs are deterministic proof assets derived from approved pilot base pixels by mirrored tiling and crop. They are not runtime art and do not claim whole-world coverage.

- [ ] **Step 1: Add RED candidate-set tests**

Require exact dimensions, unique logical IDs, retained count 4/16, encoded bytes, per-upload duration, aggregate duration, renderer, MAX_TEXTURE_SIZE, context loss, and separate decision per set.

- [ ] **Step 2: Generate deterministic representatives**

Use canonical PNG encoding. Validate opacity and hash. Do not upscale a runtime descriptor or add these paths to BootScene.

- [ ] **Step 3: Run browser probes**

    bun tools/probe-meadow-entry-texture-safety.ts --candidate painted-v2-2x2
    bun tools/probe-meadow-entry-texture-safety.ts --candidate painted-v2-4x4

Retain all candidate textures concurrently in one context per run. Record any localhost escalation.

- [ ] **Step 4: Record normal Tauri pilot evidence**

    bun run build:tauri
    bun run tauri dev --config '{"build":{"devUrl":"http://localhost:5173/?meadowPaintedPilot=on"}}'

Use the configured desktop companion/MCP when available to inspect the real Tauri window and the same three pilot load/render diagnostics. Record decoded dimensions, successful IDs, renderer behavior, and visible result. If the GUI is locked, report build/window launch PASS and native diagnostic/walkthrough BLOCKED; do not claim functional Tauri evidence.

- [ ] **Step 5: Write the comparison report**

Compare 4×3200 and 16×1600 encoded bytes, upload times, retention, context loss, and platform facts. Explicitly state that PR2b does not select the final partition.

- [ ] **Step 6: Commit**

    git add tools/probe-meadow-entry-texture-safety.ts \
      tools/probe-meadow-entry-texture-safety.test.ts \
      artifacts/meadow-entry/painted-v2/proofs/texture-probe \
      docs/superpowers/reports/2026-08-11-meadow-entry-painted-texture-preflight.md
    git commit -m "test(art): measure painted Meadow textures"

---

### Task 10: Capture and inspect pilot visual evidence

**Files:**
- Create: docs/superpowers/reports/img/hpa-586-painted-v2-pilot/hero-house-frontage.png
- Create: docs/superpowers/reports/img/hpa-586-painted-v2-pilot/sundrop-main-street.png
- Create: docs/superpowers/reports/img/hpa-586-painted-v2-pilot/connector-village-mouth.png
- Create: docs/superpowers/reports/img/hpa-586-painted-v2-pilot/connector-midpoint.png
- Create: docs/superpowers/reports/img/hpa-586-painted-v2-pilot/connector-crossroads-mouth.png
- Create: docs/superpowers/reports/img/hpa-586-painted-v2-pilot/crossroads-waystone.png
- Create: docs/superpowers/reports/img/hpa-586-painted-v2-pilot/collision-boundary.png
- Create: docs/superpowers/reports/img/hpa-586-painted-v2-pilot/fallback-matched-camera.png
- Create: docs/superpowers/reports/img/hpa-586-painted-v2-pilot/missing-plane-fallback.png
- Create: docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-visual-review.md

**Required skill action:** Use the Playwright skill and its CLI workflow. Use a named headed session, fresh build, DPR 1, browser zoom 100%, and 1920×1080 viewport.

- [ ] **Step 1: Capture pilot views**

Use meadowPaintedPilot=on. Keep debug overlays off except collision-boundary.png. Include a non-interactive review bar:

    HPA-586 • PAINTED PILOT • BROWSER • 100%

- [ ] **Step 2: Capture matched fallback**

At the same Crossroads camera/player position, reload without meadowPaintedPilot=on and capture fallback-matched-camera.png.

- [ ] **Step 3: Capture missing-plane fallback**

Use the existing fault path or intercepted missing texture. Show that the affected crop returns to tiles/live visuals while collision and state remain.

- [ ] **Step 4: Inspect every PNG at original detail**

Reject any capture with:

- visible grid/repeated tile motif;
- stretched or blurred art;
- baked building, character, label, or false door;
- seam or double-darkening;
- transparent base hole;
- duplicate baked/live visual;
- invisible collision;
- route or interaction clearance ambiguity;
- debug overlay in a normal capture;
- missing/wrong review bar.

- [ ] **Step 5: Present the visual gate**

Show the accepted images to the user and ask for explicit painted-direction approval. Record approve/reject plus requested changes. Do not start PR3 automatically.

- [ ] **Step 6: Commit accepted evidence**

    git add docs/superpowers/reports/img/hpa-586-painted-v2-pilot \
      docs/superpowers/reports/2026-08-11-meadow-entry-painted-pilot-visual-review.md
    git commit -m "docs(art): capture painted Meadow pilot"

---

### Task 11: PR2b cumulative verification and final review

**Files:**
- Create: docs/superpowers/reports/2026-08-11-meadow-entry-painted-pr2b-validation.md
- Verify: every PR2b source, art, generated, runtime, test, and evidence file

- [ ] **Step 1: Run every no-write package gate**

    bun tools/export-meadow-entry-art-controls.ts --check
    bun tools/approve-meadow-entry-controls.ts --check
    bun tools/finalize-meadow-entry-painted-v2-pilot.ts --check
    bun tools/export-meadow-entry-regions.ts --check
    bun tools/render-meadow-entry-art-proofs.ts --check
    bun tools/approve-meadow-entry-art-package.ts --check
    bun tools/generate-meadow-entry-runtime.ts --check
    bun run art:storage:meadow-entry
    git lfs fsck

Record git status before and after; it must be identical.

- [ ] **Step 2: Run focused unit tests**

    bun run test:unit -- --run \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer-cli.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime-generator.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts \
      src/lib/game/content/assets.test.ts \
      src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts \
      src/lib/game/content/maps/background-ownership.test.ts \
      src/lib/game/phaser/world-render-options.test.ts \
      src/lib/game/phaser/renderer-diagnostics.test.ts \
      src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
      src/lib/game/phaser/scenes/scenes.test.ts \
      tools/probe-meadow-entry-texture-safety.test.ts

- [ ] **Step 3: Run full automated gates**

    bun run test:unit -- --run
    bun run test:e2e
    bun run check
    bun run lint
    bun run build
    bun run build:tauri
    git diff --check

- [ ] **Step 4: Inspect package/runtime equality**

Verify the three export hashes equal their public runtime copies and approval rows. Verify the concept is absent from runtime assets. Verify default BootScene queues zero painted assets and pilot mode queues exactly three.

- [ ] **Step 5: Independent code and art review**

Code review must confirm:

- generated module/thin wrapper/pure transform boundaries;
- no renderer branch, package selector, art adapter, teleport, or save change;
- correct off-mode priority and failure restoration;
- collision remains unconditional;
- all historical HPA-399 bytes remain unchanged.

Art review must confirm the Task 10 checklist and material improvement over both graybox and muddy historical art.

Fix every Critical or Important code finding with RED/GREEN evidence. Regenerate rather than code around any material art defect.

- [ ] **Step 6: Write the final report**

Record exact test counts/timings, build results, no-write checks, LFS status, probe measurements, Tauri status, screenshot inventory, review findings, and the user's visual verdict.

End with exactly one of:

    PAINTED PILOT APPROVED — write a separate PR3 implementation plan.

or:

    PAINTED PILOT NOT APPROVED — retain fallback default and revise pilot art only.

- [ ] **Step 7: Commit the final validation evidence**

    git add docs/superpowers/reports/2026-08-11-meadow-entry-painted-pr2b-validation.md
    git commit -m "docs(world): validate painted Meadow pilot"
