# HPA-406 Meadow-Entry Outdoor Runtime Integration Design

**Status:** Approved in brainstorming; pending written-spec review  
**Linear:** HPA-406  
**Repository:** `cwchanap/Gliese`  
**Date:** 2026-08-03

## 1. Purpose

Integrate every approved non-village `meadow-entry` outdoor base and foreground export into the Phaser runtime while preserving the frozen gameplay geometry, hidden collision, live semantic objects, fallback presentation, save behavior, and cross-region handoffs.

This work consumes, rather than redesigns:

- the HPA-399 source catalog, crop/overlap/runtime-coverage manifests, bake ownership, fingerprints, and storage contract;
- the HPA-496 approved masters, regional exports, approval inventory, provenance, dimensions, hashes, and deterministic validation commands;
- the HPA-514 Story Integration Catalog and deterministic fingerprint;
- the HPA-495 Area Expansion Packet and world-expansion skill workflow;
- the HPA-398 regional base/foreground renderer and fallback behavior proven in Sundrop Village.

The final result is one coherent opening map whose Village, Crossroads, connector roads, Tidewatch Coast, Mistfen, Silverpine, Wildwood, and east forest boundary render from approved artwork without changing their gameplay semantics.

## 2. Delivery policy

HPA-406 maps to exactly **one Linear ticket and one pull request**.

The ticket's three checkpoints remain internal commit, validation, evidence, and approval gates inside that single PR:

1. Crossroads and connector seam proof;
2. Tidewatch Coast and Silverpine;
3. Mistfen and Wildwood.

The PR remains draft while checkpoints are incomplete and becomes ready for review only after all three checkpoints and the complete command gate pass.

Do not open a separate PR for a region, checkpoint, runtime foundation, or skill adjustment under HPA-406. If the work can no longer remain reviewable as one PR, stop and rescope the remaining work into new Linear tickets with independent acceptance criteria before continuing implementation.

## 3. Dependency workflow

HPA-514 and HPA-495 each retain their own one-ticket/one-PR delivery.

HPA-406 cannot approve an Area Expansion Packet until the HPA-514 Story Integration Catalog and fingerprint are available. HPA-495 cannot complete until its skills have production field evidence. Resolve that dependency as follows:

1. Merge the HPA-514 PR.
2. Open the single HPA-495 PR with the baseline skills, packet template, pressure tests, and repository-tool bindings.
3. Open or develop the single HPA-406 draft PR from the HPA-495 branch, temporarily targeting that branch while the runtime checkpoints field-test the skills.
4. Execute all three HPA-406 checkpoints while the HPA-495 PR remains open. Put every reusable skill correction and its failing regression scenario into the existing HPA-495 PR, not HPA-406.
5. Merge HPA-495 after the required field evidence and all reusable skill corrections discovered by HPA-406 are accepted.
6. Rebase or retarget the same HPA-406 PR onto `main`, rerun the complete validation gate, and move it out of draft only after all checkpoints pass.

If HPA-495 must merge before HPA-406 finishes and a later checkpoint discovers a new reusable skill defect, create a new Linear ticket and one new PR for that post-HPA-495 skill correction. Do not open a second PR under HPA-495.

This workflow preserves one PR per ticket while satisfying both field-validation and reusable-gap requirements.

## 4. Goals

- Register and preload all approved non-village base and foreground exports.
- Derive runtime descriptors from the frozen crop and approval manifests rather than copying coordinates or metadata manually.
- Respect approved overlap ownership and draw order on both base and foreground planes.
- Assign baked static visuals to authoritative runtime owners while collision remains live and hidden.
- Preserve buildings, NPCs, pickups, discoveries, encounters, combat bounds, transitions, story gates, and other stateful content as live objects.
- Restore readable live or tile fallback visuals when a required baked base does not render.
- Allow a valid base to remain when its optional foreground is missing or invalid.
- Prevent seams, holes, double-darkening, duplicated live art, floating foregrounds, invisible obstacles, and abrupt quality shifts.
- Produce deterministic evidence for all rendering modes and continuous traversal routes.
- Field-test the HPA-495 skills without adding local undocumented integration knowledge.

## 5. Non-goals

- No crop, overlap, route-mouth, corner, clamp, gameplay geometry, or source-ownership changes.
- No visual-master regeneration, regional retouching, or independent per-region art correction.
- No route, encounter, gate, building function, NPC role, story, spoiler, or audio redesign.
- No complex-interior work.
- No final whole-map performance sign-off; HPA-411 owns that independent gate.
- No permanent runtime feature flag or checkpoint activation framework solely for development sequencing.
- No duplicate runtime source of truth for crop geometry or artwork metadata.

## 6. Current runtime foundation

The existing runtime already provides the core mechanics needed by this ticket:

- `RegionFragment.backgroundImages` are merged into `meadowEntryMap`;
- `BootScene` preloads `regionalBackgroundAssets`;
- `WorldScene` renders base and foreground images;
- image existence, source dimensions, render failure, and disabled mode are diagnosed;
- successful background IDs control blocker fallback visibility;
- hidden collision remains independent of whether its live visual renders;
- Sundrop Village proves one base/foreground pair and fallback-only blockers.

HPA-406 should extend these contracts narrowly rather than replacing the renderer.

## 7. Manifest-driven runtime package

### 7.1 Inputs

Add a deterministic runtime-package generator that consumes the repository's approved TypeScript contracts directly:

- `MEADOW_ENTRY_APPROVED_CROPS`;
- `MEADOW_ENTRY_APPROVED_OVERLAPS`;
- `MEADOW_ENTRY_BAKE_OWNERSHIP`;
- the meadow-entry source catalog;
- `meadowEntryArtPackageApproval`.

Do not parse proof screenshots or manually maintained duplicate JSON when an authoritative TypeScript source exists.

### 7.2 Output

Generate a committed runtime module with only runtime-facing data:

```ts
interface RuntimeBackgroundAsset {
  id: string;
  cropId: string;
  plane: 'base' | 'foreground';
  textureKey: string;
  path: string;
  sha256: string;
  width: number;
  height: number;
  drawOrder: number;
}

interface RuntimeVisualOwner {
  sourceId: string;
  ownerBackgroundId: string;
}

interface MeadowEntryRuntimePackage {
  version: 1;
  controlFingerprint: string;
  assets: readonly RuntimeBackgroundAsset[];
  backgrounds: readonly MapBackgroundImage[];
  ownership: {
    blockers: readonly RuntimeVisualOwner[];
    decor: readonly RuntimeVisualOwner[];
    fences: readonly RuntimeVisualOwner[];
  };
}
```

Recommended files:

```text
tools/generate-meadow-entry-runtime-package.ts
src/lib/game/content/generated/meadow-entry-runtime-package.ts
public/game/assets/regions/meadow-entry/*.png
```

The generator must:

1. verify the approved control fingerprint;
2. verify every required export's SHA-256, dimensions, crop ID, plane, texture key, and draw order;
3. calculate world-space descriptors from crop bounds;
4. materialize the exact approved export bytes in the public runtime namespace;
5. publish generated data and assets atomically;
6. support a non-mutating `--check` mode;
7. fail when generated TypeScript or runtime PNGs are stale;
8. fail closed on unsupported package versions or incomplete ownership.

Add package commands:

```text
world:generate:meadow-entry-runtime
world:validate:meadow-entry-runtime
```

### 7.3 Coordinate conversion

For an approved crop with pixel bounds `{ left, top, right, bottom }`:

```text
width  = right - left
height = bottom - top
x      = left + width / 2
y      = top + height / 2
```

The generated descriptor must exactly match the approved dimensions and texture key. No region file should restate these values manually.

## 8. Background ordering

### 8.1 Descriptor contract

Extend `MapBackgroundImage` with explicit approved ordering:

```ts
interface MapBackgroundImage extends MapRect {
  textureKey: string;
  plane: 'base' | 'foreground';
  drawOrder: number;
  dependsOnBackgroundId?: string;
}
```

Use these orders:

- approved Sundrop underlay: `0`;
- east forest boundary base: `10`;
- existing HPA-398 Sundrop base and foreground: `50`;
- connector crops: `100` through `140`;
- Crossroads and destination regions: `200` through `240`.

### 8.2 Depth calculation

Preserve the existing broad depth bands while adding a small deterministic order offset:

```ts
const BACKGROUND_ORDER_SCALE = 10_000;

baseDepth = BASE_BACKGROUND_DEPTH + drawOrder / BACKGROUND_ORDER_SCALE;
foregroundDepth = FOREGROUND_BACKGROUND_DEPTH + drawOrder / BACKGROUND_ORDER_SCALE;
```

The approved maximum order of `240` produces an offset of `0.024`, keeping all images within their existing base or foreground band. Base artwork remains above tile ground but below live gameplay objects; foreground artwork remains above the player but below HUD/debug overlays.

Tests must prove that each HPA-399 overlap's `ownerCropId` renders above the other crop on every plane allowed by its plane policy. Runtime insertion order must not decide seam ownership accidentally.

## 9. Foreground dependency and partial failure

Every foreground crop depends on its matching base descriptor through `dependsOnBackgroundId`.

Runtime behavior:

| Base | Foreground | Result |
| --- | --- | --- |
| rendered | rendered | normal layered presentation |
| rendered | missing, invalid, or failed | keep base; omit foreground; record degraded state |
| missing, invalid, or failed | available | suppress foreground; restore base-owned live fallback |
| disabled | disabled | use existing tile and live fallback presentation |

Use the exact diagnostic status `blocked-by-base` when an otherwise available foreground is deliberately suppressed because its base did not render.

A missing foreground must not disable a valid base, change collision, or restore a complete live obstacle sprite over artwork already present in the base. This prevents floating canopies and duplicate full-height visuals.

## 10. Generic fallback visual ownership

### 10.1 Shared type

Generalize the current blocker-only visual contract:

```ts
type RuntimeVisualOwnership =
  | { mode: 'always' }
  | {
      mode: 'fallback-only';
      ownerBackgroundIds: readonly string[];
    };
```

Apply it to:

- `MapBlocker`;
- `MapDecor`;
- `MapFenceSegment`.

Use one shared decision helper for all three render paths. Collision attached to a blocker or decor remains active regardless of visual ownership.

The array shape remains compatible with the existing Sundrop contract, but every new HPA-406 ownership entry resolves to exactly one authoritative base background ID.

### 10.2 Ownership generation

For every HPA-399 source whose runtime requirement is:

- `existing-blocker-fallback`;
- `extend-decor-fallback`;
- `extend-fence-fallback`;

resolve one authoritative **base** owner:

1. obtain the source bounds and frozen visual margins from the bake-ownership entry;
2. find approved base crops that fully contain the required visual bounds;
3. prefer crops whose `sourceRegionIds` include the source's approved primary region;
4. choose the containing candidate with the highest approved draw order;
5. verify that the choice is consistent with overlap ownership;
6. fail generation if no unique authoritative owner can be established.

A source should not list every overlapping neighbor. A neighboring crop failure must not restore unrelated live art.

Sources marked `remain-live`, `fallback-tile`, `none`, `control-only`, `protected-live`, or other non-baked dispositions must be handled exhaustively and must never be silently hidden.

### 10.3 Live semantic objects

The ownership adapter must not attach fallback-only visual ownership to:

- buildings and their entrances;
- NPCs or ambient NPCs;
- pickups and discoveries;
- encounters and combat bounds;
- transitions;
- stateful or animated gates;
- story-controlled objects.

These remain live and behaviorally unchanged.

## 11. Map composition

Attach the generated HPA-406 backgrounds and ownership results at the assembled `meadowEntryMap` boundary rather than manually restating crop layers in each gameplay region.

This is important because connector crops and the east forest boundary span multiple source fragments. They are runtime composition layers derived from the approved global master, not new gameplay regions or new semantic owners.

Existing region fragments remain authoritative for their gameplay objects and collision geometry.

The HPA-496 `sundrop-village-underlay` renders beneath the existing HPA-398 Sundrop base. It supports the global seam but does not replace the reviewed village artwork or rewrite existing village ownership.

## 12. Internal checkpoint sequence inside one PR

### 12.1 Checkpoint 1 — Crossroads and connector seam proof

Implement the shared runtime package, draw ordering, generic ownership, and foreground dependency, then integrate:

- Sundrop underlay;
- Village–Crossroads connector;
- Crossroads–Coast connector;
- Crossroads–Mistfen connector;
- Crossroads–Silverpine connector;
- Crossroads–Wildwood connector;
- Crossroads.

Required acceptance:

- Village ↔ Crossroads traversal succeeds in both directions;
- every connector mouth renders correctly in enabled and fallback modes;
- overlap owner ordering matches the manifest;
- castle and story gates remain live;
- no former Sundrop boundary quality jump remains;
- all three HPA-495 outdoor skills are exercised and their decisions recorded.

Checkpoint 1 should be represented by focused commits and its own evidence report, not a separate PR.

### 12.2 Checkpoint 2 — Tidewatch Coast and Silverpine

Integrate Tidewatch Coast and Silverpine using the already-proven runtime path.

Coast acceptance:

- shoreline, sand, tidepool, rock, driftwood, Ferry Shrine, and jetty artwork align;
- ocean collision, NPCs, rewards, discoveries, shrine and jetty semantics remain live;
- the full route is walkable in both directions;
- foreground separation remains readable.

Silverpine acceptance:

- autumn terrain, ceremonial paths, offering grove, terrace, shrine approach, and canopy/arch foreground align;
- Silver Shrine Gate and all stateful restrictions remain live;
- the offering-grove detour and gate route work in both directions.

No new renderer architecture should be added at this checkpoint unless a documented failing HPA-495 regression scenario proves the shared design insufficient.

### 12.3 Checkpoint 3 — Mistfen and Wildwood

Integrate Mistfen, Wildwood, and the east forest boundary crop.

Mistfen acceptance:

- marsh, pool, reed, root, deadfall, fog-ground, and silhouette layers align;
- hidden collision remains forgiving through narrow passages;
- Witchwood Gate, side pocket, rewards, discoveries, NPCs, and state changes remain live.

Wildwood acceptance:

- forest floor, tree/root boundaries, brush, side clearing, combat framing, cave approach, and canopy align;
- enemies, pickups, routes, and Cave transition remain readable beneath foreground;
- combat movement, aggro, leash, and bounds behave unchanged.

At the end of Checkpoint 3, a coverage test must report zero unintegrated approved non-village crops.

## 13. Validation architecture

### 13.1 Generated package tests

Prove that:

- every runtime export matches the HPA-496 approval record;
- crop bounds convert to exact center coordinates;
- dimensions, texture keys, planes, and draw orders match the frozen manifest;
- every runtime asset has exactly one descriptor;
- generated output is byte-deterministic;
- stale generated files fail `--check`;
- unsupported versions fail closed.

### 13.2 Ownership tests

Prove that:

- every blocker/decor/fence fallback requirement is resolved;
- all non-baked requirements are handled explicitly;
- every owned source has exactly one base owner;
- no owned source points to a foreground ID;
- a neighboring crop failure does not restore unrelated visuals;
- protected-live and semantic objects remain live;
- visual suppression never changes collision.

### 13.3 Scene tests

Extend the existing scene tests to cover:

- draw-order depth calculation;
- overlap owner ordering;
- foreground `blocked-by-base` behavior;
- valid-base/invalid-foreground behavior;
- successful background ID selection;
- blocker, decor, and fence fallback;
- no duplicate live obstacle art;
- collision invariance across all rendering modes.

### 13.4 Map and route tests

Extend the existing geometric route and collision sampling patterns rather than relying only on screenshots.

Add tests for:

- every connector mouth;
- bidirectional route samples;
- transition and gate clearances;
- Mistfen narrow passages;
- Coast and Silverpine detours;
- Wildwood combat-area movement;
- protected-live object positions;
- representative save/reload coordinates.

### 13.5 Browser and walkthrough evidence

For each checkpoint, capture:

- enabled;
- disabled;
- missing base;
- invalid base dimensions;
- base render failure;
- missing foreground;
- invalid foreground dimensions;
- foreground render failure;
- collision overlay;
- save/reload;
- continuous controller traversal.

Deterministic probe coordinates may be used for visual captures, but route acceptance must include actual controller movement rather than teleport-only screenshots.

## 14. Evidence layout

```text
docs/superpowers/reports/hpa-406/
  checkpoint-1-crossroads-connectors.md
  checkpoint-2-coast-silverpine.md
  checkpoint-3-mistfen-wildwood.md
  defects.json
  checkpoint-1/
  checkpoint-2/
  checkpoint-3/
```

Each checkpoint report records:

- the Area Expansion Packet and approval used;
- the HPA-514 fingerprint, source beat IDs, character IDs, and semantic locations;
- HPA-399 and HPA-496 fingerprints and artifact paths;
- skills loaded and why;
- decisions, commands, and manifests consumed;
- human visual approvals;
- skill gaps, rationalizations, and deviations;
- regression scenarios added to HPA-495 or to an explicitly rescoped follow-up ticket if HPA-495 has already merged;
- provenance and asset locations;
- defects routed upstream;
- residual risks.

## 15. Defect routing

HPA-406 must classify defects rather than correcting upstream sources locally:

- incorrect crop, overlap, route mouth, ownership, or geometry → HPA-399 contract amendment;
- incorrect pixels, alpha, lighting, material continuity, export, hash, or provenance → HPA-496 correction;
- stale or unsupported story, character, location, gate, spoiler, or audio requirement → HPA-514 correction;
- reusable workflow gap while HPA-495 is open → failing scenario and smallest correction in the single HPA-495 PR;
- reusable workflow gap after HPA-495 merges → new Linear ticket and one PR;
- runtime registration, ordering, ownership application, diagnostics, fallback, or walkthrough defect → HPA-406.

No region-specific exception should bypass this routing.

## 16. Command gate

The final HPA-406 PR must pass:

```bash
bun run world:validate:meadow-entry-runtime
bun run art:validate:meadow-entry
bun run test
bun run check
bun run lint
bun run build
bun run build:tauri
```

It must also pass focused asset-integrity, scene, save, skill-regression, and region-walkthrough gates introduced by this ticket.

HPA-406 records load/render diagnostics and obvious regressions, but HPA-411 owns the independent complete-map performance budget and sign-off.

## 17. Risks and mitigations

### Excessive PR size

Mitigation: preserve one PR but organize it into three checkpoint commit groups, separate reports, focused test gates, and explicit approvals. If it becomes unreviewable, rescope at the Linear-ticket level before adding more implementation.

### Duplicate visual restoration

Mitigation: assign one authoritative base owner per baked source and never use foreground success to suppress a complete live fallback.

### Accidental seam ordering

Mitigation: derive depth from approved draw order and test every declared overlap owner.

### Floating foregrounds

Mitigation: make every foreground depend on its paired base and emit `blocked-by-base` when suppressed.

### Hidden semantic changes

Mitigation: generated ownership is exhaustive, protected-live content cannot be hidden, and map behavior tests compare existing IDs, collision, routes, state, and saves.

### Stale upstream contracts

Mitigation: validate HPA-514, HPA-399, and HPA-496 fingerprints before each checkpoint and fail rather than infer requirements.

### Hidden manual workflow knowledge

Mitigation: execute every checkpoint through HPA-495, record deviations, and fix reusable gaps through regression scenarios in HPA-495's single PR or an explicitly rescoped follow-up ticket if that PR has already merged.

## 18. Acceptance criteria

HPA-406 is complete when:

- exactly one HPA-406 PR contains all work;
- every approved non-village base and foreground export is registered and rendered from manifest-derived descriptors;
- runtime bytes, dimensions, hashes, texture keys, draw order, and fingerprint match the approved package;
- all overlaps follow approved owner ordering;
- no seam, hole, double-darkening, collision drift, invisible obstacle, duplicated live art, or abrupt fallback-quality shift remains;
- foreground failure never unfairly hides enemies, rewards, routes, gates, or transitions;
- buildings, NPCs, pickups, discoveries, encounters, combat bounds, transitions, gates, and stateful content behave unchanged;
- every baked blocker/decor/fence requirement has one authoritative base owner and every non-baked requirement remains explicit;
- enabled, disabled, missing, invalid, render-failed, partial-foreground, collision-overlay, save/reload, and traversal evidence exists for every checkpoint;
- continuous traversal succeeds from Village through Crossroads to every destination and back;
- each checkpoint consumed a current HPA-514 fingerprint and approved HPA-495 Area Expansion Packet;
- every reusable skill gap was corrected through a documented regression scenario in the active HPA-495 PR or an explicitly rescoped follow-up ticket;
- the full command gate passes;
- HPA-411 can begin without additional regional integration work.
