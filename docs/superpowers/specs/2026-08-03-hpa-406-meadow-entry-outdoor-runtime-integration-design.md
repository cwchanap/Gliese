# HPA-406 Meadow-Entry Outdoor Runtime Integration Design

**Status:** Approved in brainstorming; review corrections applied  
**Linear:** HPA-406  
**Repository:** `cwchanap/Gliese`  
**Date:** 2026-08-03

## 1. Purpose

Integrate every approved non-village `meadow-entry` outdoor base and foreground export into the Phaser runtime while preserving frozen gameplay geometry, hidden collision, live semantic objects, fallback presentation, save behavior, and cross-region handoffs.

This work consumes, rather than redesigns:

- HPA-399 source catalog, crop/overlap/runtime-coverage manifests, bake ownership, fingerprints, and storage contract;
- HPA-496 approved masters, regional exports, approval inventory, provenance, dimensions, hashes, and deterministic validation commands;
- HPA-514 Story Integration Catalog and deterministic fingerprint;
- HPA-495 Area Expansion Packet and world-expansion skill workflow;
- HPA-398 regional base/foreground renderer and fallback behavior proven in Sundrop Village.

The final result is one coherent opening map whose Village, Crossroads, connector roads, Tidewatch Coast, Mistfen, Silverpine, Wildwood, and east forest boundary render from approved artwork without changing gameplay semantics.

## 2. Delivery policy

HPA-406 maps to exactly **one Linear ticket and one pull request**.

The three checkpoints are internal commit, validation, evidence, and approval gates inside that single PR:

1. Crossroads and connector seam proof;
2. Tidewatch Coast and Silverpine;
3. Mistfen and Wildwood.

The PR remains draft while checkpoints are incomplete and becomes ready for review only after all three checkpoints and the complete command gate pass.

Do not open a separate PR for a region, checkpoint, runtime foundation, or skill adjustment under HPA-406. If the work can no longer remain reviewable as one PR, stop and rescope the remaining work into new Linear tickets with independent acceptance criteria before continuing implementation.

## 3. Dependency workflow

HPA-514 and HPA-495 each retain their own one-ticket/one-PR delivery.

HPA-406 cannot approve an Area Expansion Packet until the HPA-514 Story Integration Catalog and fingerprint are available. HPA-495 cannot complete until its skills have production field evidence.

Resolve the dependency as follows:

1. Merge the HPA-514 PR.
2. Open the single HPA-495 PR with baseline skills, packet template, pressure tests, and repository-tool bindings.
3. Open or develop the single HPA-406 draft PR from the HPA-495 branch, temporarily targeting that branch while the runtime checkpoints field-test the skills.
4. Execute HPA-406 checkpoints while the HPA-495 PR remains open where practical. Put reusable skill corrections and their failing regression scenarios into the existing HPA-495 PR, not HPA-406.
5. Merge HPA-495 after its required field evidence and reusable corrections are accepted.
6. Rebase or retarget the same HPA-406 PR onto `main`, rerun the complete validation gate, and move it out of draft only after every checkpoint passes.

If HPA-495 has already merged when a later checkpoint discovers a new reusable skill defect, create a new Linear ticket and one new PR for that correction. Do not open a second PR under HPA-495.

Do not assume either prerequisite is ready from this document. Before implementation begins, read current Linear and GitHub state and require the approved outputs, not merely an issue or branch name.

## 4. Goals

- Register and preload every approved non-village base and foreground export.
- Derive runtime descriptors from frozen crop and approval manifests rather than copying coordinates or metadata manually.
- Respect approved overlap ownership and draw order within both base and foreground planes.
- Preserve the frozen HPA-399 requirement that every HPA-399 crop renders below the immutable HPA-398 Sundrop overlay on the corresponding plane.
- Assign baked static visuals to authoritative runtime owners while collision remains live and hidden.
- Preserve buildings, NPCs, pickups, discoveries, encounters, combat bounds, transitions, story gates, and other stateful content as live objects.
- Restore readable live or tile fallback visuals when a required baked base does not render.
- Allow a valid base to remain when its optional foreground is missing or invalid.
- Prevent seams, holes, double-darkening, duplicated live art, floating foregrounds, invisible obstacles, and abrupt quality shifts.
- Produce deterministic evidence for all rendering modes and continuous traversal routes.
- Field-test HPA-495 skills without adding undocumented local integration knowledge.

## 5. Non-goals

- No crop, overlap, route-mouth, corner, clamp, gameplay geometry, or source-ownership changes.
- No visual-master regeneration, regional retouching, or independent per-region art correction.
- No route, encounter, gate, building function, NPC role, story, spoiler, or audio redesign.
- No complex-interior work.
- No final whole-map performance sign-off; HPA-411 owns that independent gate.
- No permanent runtime feature flag or checkpoint activation framework solely for development sequencing.
- No duplicate runtime source of truth for crop geometry or artwork metadata.
- No arbitrary descriptor-level raw depth escape hatch.

## 6. Current runtime foundation

The existing runtime already provides the core mechanics needed by this ticket:

- `RegionFragment.backgroundImages` are merged into `meadowEntryMap`;
- `BootScene` preloads `regionalBackgroundAssets`;
- `WorldScene` renders base and foreground images;
- image existence, source dimensions, render failure, and disabled mode are diagnosed;
- successful background IDs control blocker fallback visibility;
- hidden collision remains independent of whether its live visual renders;
- Sundrop Village proves one base/foreground pair and fallback-only blockers.

HPA-398 intentionally replaced arbitrary numeric descriptor depth with semantic `base` and `foreground` planes. HPA-406 preserves that decision: it does **not** restore a raw `depth` field. It adds constrained semantic ordering within each plane because HPA-399 introduces multiple approved crops whose frozen manifest already defines `drawOrder` and overlap ownership.

This is a structural extension from one fixed depth per plane to deterministic ordering inside a plane, but the renderer still owns actual Phaser depth calculation.

## 7. Manifest-driven runtime package

### 7.1 Authoritative inputs

Add a deterministic runtime-package generator that consumes the repository's approved TypeScript contracts directly:

- `MEADOW_ENTRY_APPROVED_CROPS`;
- `MEADOW_ENTRY_APPROVED_OVERLAPS`;
- `MEADOW_ENTRY_BAKE_OWNERSHIP`;
- meadow-entry source catalog;
- `meadowEntryArtPackageApproval`.

Do not parse proof screenshots or introduce manually maintained duplicate crop JSON when an authoritative TypeScript source exists.

### 7.2 Output contract

Generate a committed runtime module containing only runtime-facing data:

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

  // Exact HPA-399 combined control fingerprint. This is not a new composite.
  controlFingerprint: string;

  // HPA-406 SHA-256 over the canonical HPA-496 approved runtime export inventory.
  artPackageFingerprint: string;

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

1. read the current HPA-399 combined control fingerprint;
2. require `meadowEntryArtPackageApproval.combinedControlFingerprint` to match it exactly;
3. verify every required export's SHA-256, dimensions, crop ID, plane, texture key, and draw order;
4. calculate world-space descriptors from crop bounds;
5. materialize exact approved export bytes in the public runtime namespace;
6. publish generated data and assets atomically;
7. support a non-mutating `--check` mode;
8. fail when generated TypeScript or runtime PNGs are stale;
9. fail closed on unsupported package versions or incomplete ownership.

Add package commands:

```text
world:generate:meadow-entry-runtime
world:validate:meadow-entry-runtime
```

### 7.3 Fingerprint definitions

`controlFingerprint` is exactly the frozen HPA-399 `combinedControlFingerprint`. It represents controls, crop/overlap/runtime coverage, ownership, and other inputs included by HPA-399's existing fingerprint contract. HPA-406 does not recompute it from a different field set.

`artPackageFingerprint` is computed by stable-serializing and hashing this HPA-496 approval subset, sorted by crop ID and plane:

```ts
{
  version: 1,
  combinedControlFingerprint,
  cropManifestSha256,
  masterProvenanceSha256,
  exportProvenanceSha256,
  exports: exports.map(({ cropId, plane, path, sha256, bytes, width, height, textureKey, drawOrder }) => ({
    cropId,
    plane,
    path,
    sha256,
    bytes,
    width,
    height,
    textureKey,
    drawOrder
  }))
}
```

The HPA-514 Story Integration Catalog fingerprint belongs to the Area Expansion Packet and checkpoint evidence. It is not folded into the visual runtime package fingerprint.

### 7.4 Coordinate conversion

For an approved crop with pixel bounds `{ left, top, right, bottom }`:

```text
width  = right - left
height = bottom - top
x      = left + width / 2
y      = top + height / 2
```

The generated descriptor must exactly match approved dimensions and texture key. No region file restates these values manually.

## 8. Runtime asset storage and publication

### 8.1 Source of truth

Approved source exports remain under:

```text
artifacts/meadow-entry/hpa-399/exports/*.png
```

They remain governed by HPA-496 approval, provenance, and Git LFS storage.

Runtime URLs are served from:

```text
public/game/assets/regions/meadow-entry/*.png
```

HPA-406 commits these runtime files as Git LFS pointers rather than raw Git blobs. Add a `.gitattributes` rule covering the runtime namespace.

### 8.2 Exact-byte materialization

The generator copies exact approved bytes from the artifact namespace into the runtime namespace and validates SHA-256 equality before atomic publication.

Because the artifact and runtime files are byte-identical, their Git LFS pointers must reference the same content OID. The storage verifier must prove:

- both paths are LFS tracked;
- neither path is committed as a raw large Git blob;
- artifact and runtime SHA-256 values match;
- their LFS OIDs match;
- every runtime file is materialized for build and CI.

This avoids duplicating the remote content-addressed LFS object, although a developer checkout and final build will contain a second materialized copy at the runtime path. That local and packaged-size cost is explicit and is measured by HPA-406 diagnostics and the later HPA-411 performance gate.

Do not use symlinks or hard links: they are not a stable cross-platform public-asset contract for browser, CI, and Tauri builds. Do not rely on an uncommitted build-time copy that makes development or packaging depend on hidden local preparation.

## 9. Background ordering

### 9.1 Descriptor contract

Extend `MapBackgroundImage` with semantic within-plane ordering and optional base dependency:

```ts
interface MapBackgroundImage extends MapRect {
  textureKey: string;
  plane: 'base' | 'foreground';
  drawOrder: number;
  dependsOnBackgroundId?: string;
}
```

`drawOrder` is not a raw Phaser depth and is not freely authored by region code.

For HPA-399 crops, the generator copies these values from the frozen HPA-399 crop manifest:

- Sundrop underlay: `0`;
- east forest boundary base: `10`;
- connector crops: `100` through `140`;
- Crossroads and destination regions: `200` through `240`.

The immutable HPA-398 Sundrop base and foreground are not HPA-399 crops and therefore have no crop-manifest `drawOrder`. HPA-406 assigns one fixed runtime adapter value:

```ts
const HPA398_SUNDROP_OVERLAY_DRAW_ORDER = 1_000;
```

Both HPA-398 Sundrop descriptors use `1_000`. This preserves the frozen HPA-399 seam contract:

- every HPA-399 base crop renders before the immutable HPA-398 Sundrop base overlay;
- every HPA-399 foreground crop renders before the immutable HPA-398 Sundrop foreground overlay where they intersect.

No other runtime-only descriptor order may be introduced without an explicit reviewed contract amendment.

### 9.2 Depth calculation

Use the existing `MAP_BACKGROUND_DEPTHS` constants and a bounded order offset:

```ts
const BACKGROUND_ORDER_SCALE = 10_000;

function getMapBackgroundDepth(background: MapBackgroundImage): number {
  return MAP_BACKGROUND_DEPTHS[background.plane] + background.drawOrder / BACKGROUND_ORDER_SCALE;
}
```

The approved maximum runtime order of `1_000` produces an offset of `0.1`. This keeps all base images inside the existing base band above tile ground and below live gameplay objects, and all foreground images inside the existing foreground band above the player but below HUD/debug overlays.

Validation must reject negative values, values above `1_000`, non-integers, and any descriptor order not supplied by the HPA-399 generator or the single HPA-398 overlay constant.

Tests must prove that each HPA-399 overlap's `ownerCropId` renders above the other crop on every plane allowed by its plane policy. Runtime insertion order must never decide seam ownership accidentally.

## 10. Foreground dependency and partial failure

Every foreground crop depends on its matching base descriptor through `dependsOnBackgroundId`. The HPA-398 Sundrop foreground also depends on the HPA-398 Sundrop base.

Runtime behavior:

| Base | Foreground | Result |
| --- | --- | --- |
| rendered | rendered | normal layered presentation |
| rendered | missing, invalid, or failed | keep base; omit foreground; record degraded state |
| missing, invalid, or failed | available | suppress foreground; restore base-owned live fallback |
| disabled | disabled | use existing tile and live fallback presentation |

Extend the existing `RegionalBackgroundRenderStatus` union with the exact status:

```ts
| 'blocked-by-base'
```

It joins the existing `disabled`, `rendered`, `missing-texture`, `invalid-dimensions`, and `render-failed` statuses. It is not a parallel diagnostic channel.

A missing foreground must not disable a valid base, change collision, or restore a complete live obstacle sprite over artwork already present in the base. This prevents floating canopies and duplicate full-height visuals.

## 11. Generic fallback visual ownership

### 11.1 Shared type and map-model changes

Replace the blocker-specific ownership type with a shared visual contract:

```ts
export type MapVisualOwnership =
  | { mode: 'always' }
  | {
      mode: 'fallback-only';
      ownerBackgroundIds: readonly string[];
    };

export interface MapBlocker extends MapRect {
  kind: MapBlockerKind;
  label?: string;
  visual?: MapVisualOwnership;
}

interface MapDecorBase extends MapRect {
  depth?: MapDecorDepth;
  mode?: 'image' | 'tile';
  collision?: MapRect;
  alpha?: number;
  visual?: MapVisualOwnership;
}

export interface MapFenceSegment extends MapRect {
  visual?: MapVisualOwnership;
}
```

This is a type generalization for blockers and a new optional field for decor and fences. Converting `MapFenceSegment` from a bare alias to an interface is intentional and source-compatible for existing fence literals.

Extract one shared helper:

```ts
shouldRenderOwnedVisual(
  visual: MapVisualOwnership | undefined,
  successfulBackgroundIds: ReadonlySet<string>
): boolean
```

Blocker, decor, and fence renderers use that helper. Collision attached to a blocker or decor remains active regardless of visual ownership.

### 11.2 Existing multiple-owner compatibility

The shared runtime contract retains `ownerBackgroundIds: readonly string[]` because the immutable HPA-398 Sundrop ownership manifest deliberately uses both base and foreground owners for obstacles with foreground treatment.

The existing global `validateMapBackgroundOwnership` behavior remains:

- owner list is non-empty;
- owner IDs are unique;
- every owner ID exists.

It must not globally require one owner, because that would invalidate HPA-398.

### 11.3 HPA-406 single-owner invariant

Every **new HPA-406-generated** blocker, decor, or fence fallback entry has exactly one authoritative **base** owner.

This is enforced twice:

1. by the runtime-package generator before publication;
2. by an HPA-406 generated-package validator used by `world:validate:meadow-entry-runtime`.

It is not imposed on the pre-existing HPA-398 manifest.

For every HPA-399 source whose runtime requirement is:

- `existing-blocker-fallback`;
- `extend-decor-fallback`;
- `extend-fence-fallback`;

resolve its owner as follows:

1. obtain source bounds and frozen visual margins from the bake-ownership entry;
2. find approved base crops that fully contain the required visual bounds;
3. prefer crops whose `sourceRegionIds` include the source's approved primary region;
4. choose the containing candidate with the highest approved draw order;
5. if multiple candidates tie at the highest order, fail;
6. validate overlap consistency as defined below;
7. fail generation if one unique authoritative base owner cannot be established.

### 11.4 Precise overlap consistency

For an approved overlap between two candidate base crops:

- if **both** crops fully contain the source's required visual bounds, the selected owner must equal that overlap's `ownerCropId`;
- if only one crop fully contains the required visual bounds, that crop is the only eligible owner and the partial overlap does not create a competing owner;
- if neither crop fully contains the required visual bounds, that overlap is irrelevant to the source's owner selection.

This makes `ownerCropId` authoritative where both crops are true alternatives without incorrectly requiring a partially overlapping higher-order crop to own a source it cannot fully cover.

### 11.5 Unresolved baked source behavior

An unresolved or ambiguous baked source is a hard build failure:

- generator exits non-zero;
- no new generated module or runtime PNG package is published;
- `--check` fails;
- CI fails;
- the source is not silently left live, silently hidden, or assigned a default owner.

The defect must be routed to HPA-399 if the frozen ownership/crop contract is insufficient, or to HPA-406 if the runtime adapter is incorrect.

Sources marked `remain-live`, `fallback-tile`, `none`, `control-only`, `protected-live`, or other non-baked dispositions must be handled exhaustively and must never be silently hidden.

### 11.6 Live semantic objects

The ownership adapter must not attach fallback-only visual ownership to:

- buildings and entrances;
- NPCs or ambient NPCs;
- pickups and discoveries;
- encounters and combat bounds;
- transitions;
- stateful or animated gates;
- story-controlled objects.

These remain live and behaviorally unchanged.

## 12. Map composition

Attach generated HPA-406 backgrounds and ownership results at the assembled `meadowEntryMap` boundary rather than manually restating crop layers in each gameplay region.

Connector crops and the east forest boundary span multiple source fragments. They are runtime composition layers derived from the approved global master, not new gameplay regions or semantic owners.

Existing region fragments remain authoritative for gameplay objects and collision geometry.

The HPA-496 `sundrop-village-underlay` renders beneath the existing HPA-398 Sundrop base. It supports the global seam but does not replace reviewed village artwork or rewrite existing village ownership.

## 13. Internal checkpoint sequence inside one PR

### 13.1 Checkpoint 1 — Crossroads and connector seam proof

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
- both immutable Sundrop overlays render above all HPA-399 crops;
- castle and story gates remain live;
- no former Sundrop boundary quality jump remains;
- all three HPA-495 outdoor skills are exercised and their decisions recorded.

Checkpoint 1 is represented by focused commits and its own evidence report, not a separate PR.

### 13.2 Checkpoint 2 — Tidewatch Coast and Silverpine

Integrate Tidewatch Coast and Silverpine using the proven runtime path.

Coast acceptance:

- shoreline, sand, tidepool, rock, driftwood, Ferry Shrine, and jetty artwork align;
- ocean collision, NPCs, rewards, discoveries, shrine and jetty semantics remain live;
- full route is walkable in both directions;
- foreground separation remains readable.

Silverpine acceptance:

- autumn terrain, ceremonial paths, offering grove, terrace, shrine approach, and canopy/arch foreground align;
- Silver Shrine Gate and stateful restrictions remain live;
- offering-grove detour and gate route work in both directions.

No new renderer architecture should be added at this checkpoint unless a documented failing HPA-495 regression scenario proves the shared design insufficient.

### 13.3 Checkpoint 3 — Mistfen and Wildwood

Integrate Mistfen, Wildwood, and the east forest boundary crop.

Mistfen acceptance:

- marsh, pool, reed, root, deadfall, fog-ground, and silhouette layers align;
- hidden collision remains forgiving through narrow passages;
- Witchwood Gate, side pocket, rewards, discoveries, NPCs, and state changes remain live.

Wildwood acceptance:

- forest floor, tree/root boundaries, brush, side clearing, combat framing, cave approach, and canopy align;
- enemies, pickups, routes, and Cave transition remain readable beneath foreground;
- combat movement, aggro, leash, and bounds behave unchanged.

At the end of Checkpoint 3, a coverage test reports zero unintegrated approved non-village crops.

## 14. Validation architecture

### 14.1 Generated package tests

Prove that:

- every runtime export matches the HPA-496 approval record;
- crop bounds convert to exact center coordinates;
- dimensions, texture keys, planes, and manifest draw orders match frozen inputs;
- both HPA-398 overlays use only the fixed runtime adapter order `1_000`;
- every runtime asset has exactly one descriptor;
- generated output is byte-deterministic;
- stale generated files fail `--check`;
- unsupported versions fail closed;
- control and art-package fingerprints match their definitions.

### 14.2 Ownership tests

Prove that:

- every blocker/decor/fence fallback requirement is resolved;
- all non-baked requirements are handled explicitly;
- every new HPA-406-owned source has exactly one base owner;
- existing HPA-398 multiple-owner entries remain valid;
- no new owned source points to a foreground ID;
- neighboring crop failure does not restore unrelated visuals;
- protected-live and semantic objects remain live;
- visual suppression never changes collision;
- ambiguous or unresolved ownership fails generation without partial publication.

### 14.3 Scene tests

Extend existing scene tests to cover:

- constrained draw-order depth calculation using `MAP_BACKGROUND_DEPTHS`;
- overlap owner ordering;
- HPA-398 overlay ordering above the full HPA-399 crop band;
- `RegionalBackgroundRenderStatus` addition `blocked-by-base`;
- valid-base/invalid-foreground behavior;
- successful background ID selection;
- blocker, decor, and fence fallback through the shared helper;
- no duplicate live obstacle art;
- collision invariance across rendering modes.

### 14.4 Map and route tests

Extend existing geometric route and collision sampling patterns rather than relying only on screenshots.

Add tests for:

- every connector mouth;
- bidirectional route samples;
- transition and gate clearances;
- Mistfen narrow passages;
- Coast and Silverpine detours;
- Wildwood combat-area movement;
- protected-live object positions;
- representative save/reload coordinates.

### 14.5 Browser and walkthrough evidence

For each checkpoint, capture:

- enabled;
- disabled;
- missing base;
- invalid base dimensions;
- base render failure;
- missing foreground;
- invalid foreground dimensions;
- foreground render failure;
- foreground blocked by base;
- collision overlay;
- save/reload;
- continuous controller traversal.

Deterministic probe coordinates may be used for visual captures, but route acceptance includes actual controller movement rather than teleport-only screenshots.

## 15. Evidence layout

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

- Area Expansion Packet and approval used;
- HPA-514 fingerprint, source beat IDs, character IDs, and semantic locations;
- HPA-399 control fingerprint and HPA-496 art-package fingerprint/artifact paths;
- skills loaded and why;
- decisions, commands, and manifests consumed;
- human visual approvals;
- skill gaps, rationalizations, and deviations;
- regression scenarios added to HPA-495 or an explicitly rescoped follow-up ticket if HPA-495 has merged;
- provenance and asset locations;
- defects routed upstream;
- residual risks.

## 16. Defect routing

HPA-406 classifies defects rather than correcting upstream sources locally:

- incorrect crop, overlap, route mouth, ownership, or geometry → HPA-399 contract amendment;
- incorrect pixels, alpha, lighting, material continuity, export, hash, provenance, or approved inventory → HPA-496 correction;
- stale or unsupported story, character, location, gate, spoiler, or audio requirement → HPA-514 correction;
- reusable workflow gap while HPA-495 is open → failing scenario and smallest correction in the single HPA-495 PR;
- reusable workflow gap after HPA-495 merges → new Linear ticket and one PR;
- runtime registration, ordering, ownership application, diagnostics, fallback, storage publication, or walkthrough defect → HPA-406.

No region-specific exception bypasses this routing.

## 17. Command gate

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

`bun run build:tauri` transitively runs `story:check:strict` and `story:assert-no-frontend-prose`, so the existing Rust story compiler freshness and frontend-prose boundary remain covered.

The planned HPA-406 implementation is TypeScript, documentation, approved PNG publication, and test/evidence work. Rust-specific commands are not mandatory when no Rust file changes. If the PR introduces any Rust or Cargo change, also run:

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

The PR must also pass focused asset-integrity, storage/LFS, scene, save, skill-regression, and region-walkthrough gates introduced by this ticket.

HPA-406 records load/render diagnostics and obvious regressions, but HPA-411 owns the independent complete-map performance budget and sign-off.

## 18. Risks and mitigations

### Excessive PR size

Preserve one PR but organize it into three checkpoint commit groups, separate reports, focused test gates, and explicit approvals. If it becomes unreviewable, rescope at the Linear-ticket level before adding more implementation.

### Frozen Sundrop seam-order violation

Use the single fixed HPA-398 overlay order `1_000`, validate it above the complete HPA-399 crop band on both planes, and reject any alternative runtime-only order.

### Duplicate visual restoration

Assign one authoritative base owner per new HPA-406 baked source while retaining immutable HPA-398 multi-plane ownership.

### Accidental seam ordering

Derive HPA-399 order from the frozen manifest and test every declared overlap owner. Do not depend on array insertion order.

### Floating foregrounds

Make every foreground depend on its paired base and emit `blocked-by-base` when suppressed.

### Large runtime asset duplication

Commit runtime copies as LFS pointers, require identical LFS OIDs with approved artifacts, acknowledge materialized checkout/build duplication, and leave final performance sign-off to HPA-411.

### Hidden semantic changes

Generated ownership is exhaustive, protected-live content cannot be hidden, and map behavior tests compare existing IDs, collision, routes, state, and saves.

### Stale upstream contracts

Validate HPA-514, HPA-399, and HPA-496 fingerprints before each checkpoint and fail rather than infer requirements.

### Hidden manual workflow knowledge

Execute checkpoints through HPA-495, record deviations, and fix reusable gaps through regression scenarios in HPA-495's single PR or an explicitly rescoped follow-up ticket after merge.

## 19. Acceptance criteria

HPA-406 is complete when:

- exactly one HPA-406 PR contains all work;
- every approved non-village base and foreground export is registered and rendered from manifest-derived descriptors;
- runtime bytes, dimensions, hashes, texture keys, manifest draw order, control fingerprint, and art-package fingerprint match approved inputs;
- every HPA-399 crop renders below the immutable HPA-398 Sundrop overlay on the corresponding plane;
- all HPA-399 overlaps follow approved owner ordering;
- no seam, hole, double-darkening, collision drift, invisible obstacle, duplicated live art, or abrupt fallback-quality shift remains;
- foreground failure never unfairly hides enemies, rewards, routes, gates, or transitions;
- buildings, NPCs, pickups, discoveries, encounters, combat bounds, transitions, gates, and stateful content behave unchanged;
- every new baked blocker/decor/fence requirement has one authoritative base owner, existing HPA-398 ownership remains intact, and every non-baked requirement remains explicit;
- unresolved baked ownership fails before partial package publication;
- artifact and runtime PNGs are byte-identical, LFS tracked, and share the same content OID;
- enabled, disabled, missing, invalid, render-failed, blocked-by-base, partial-foreground, collision-overlay, save/reload, and traversal evidence exists for every checkpoint;
- continuous traversal succeeds from Village through Crossroads to every destination and back;
- each checkpoint consumes a current HPA-514 fingerprint and approved HPA-495 Area Expansion Packet;
- every reusable skill gap is corrected through a documented regression scenario in the active HPA-495 PR or an explicitly rescoped follow-up ticket;
- the full command gate passes;
- HPA-411 can begin without additional regional integration work.
