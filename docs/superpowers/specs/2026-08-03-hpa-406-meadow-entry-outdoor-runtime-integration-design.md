# HPA-406 Meadow-Entry Outdoor Runtime Integration Design

**Status:** Draft — awaiting design approval  
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
3. Open or develop the single HPA-406 draft PR from the HPA-495 branch, temporarily targeting that branch while Checkpoint 1 field-tests the skills.
4. Put reusable skill corrections and their failing regression scenarios into the existing HPA-495 PR, not HPA-406.
5. Merge HPA-495 after the required Checkpoint 1 field evidence and reusable corrections are accepted.
6. Rebase or retarget the same HPA-406 PR onto `main`, rerun the complete validation gate, and complete Checkpoints 2 and 3.

If HPA-495 has already merged when a later checkpoint discovers a new reusable skill defect, create a new Linear ticket and one new PR for that correction. Do not open a second PR under HPA-495.

Do not assume either prerequisite is ready from this document. Before implementation begins, read current Linear and GitHub state and require approved outputs, not merely an issue or branch name.

## 4. Goals

- Register and preload every approved non-village base and foreground export.
- Derive runtime descriptors from frozen crop and approval manifests rather than copying coordinates or metadata manually.
- Respect approved overlap ownership and draw order within both base and foreground planes.
- Preserve the frozen HPA-399 requirement that every HPA-399 crop renders below the immutable HPA-398 Sundrop overlay on the corresponding plane.
- Assign baked static visuals to authoritative runtime owners while collision remains live and hidden.
- Preserve buildings, NPCs, pickups, discoveries, encounters, combat bounds, transitions, story gates, and other stateful content as live objects.
- Restore readable live or tile fallback visuals when a required baked base does not render.
- Permit a valid base to remain when its optional foreground is missing or invalid.
- Prevent seams, holes, double-darkening, duplicated live art in normal mode, floating foregrounds, invisible obstacles, and abrupt quality shifts.
- Produce deterministic evidence for all required rendering modes and continuous traversal routes.
- Field-test HPA-495 skills without adding undocumented local integration knowledge.

## 5. Non-goals

- No crop, overlap, route-mouth, corner, clamp, gameplay geometry, or source-ownership changes.
- No visual-master regeneration, regional retouching, or independent per-region art correction.
- No route, encounter, gate, building function, NPC role, story, spoiler, or audio redesign.
- No complex-interior work.
- No final whole-map performance sign-off; HPA-411 owns that independent gate.
- No permanent runtime feature flag or checkpoint activation framework solely for development sequencing.
- No duplicate runtime source of truth for crop geometry or artwork metadata.
- No arbitrary descriptor-level raw Phaser depth escape hatch.
- No redesign of the immutable HPA-398 multi-owner fallback semantics in this ticket.

## 6. Current runtime facts

The existing runtime provides these foundations:

- `RegionFragment.backgroundImages` are merged into `meadowEntryMap`;
- `BootScene` preloads the static `regionalBackgroundAssets` registry;
- `WorldScene.renderRegionalBackgrounds` currently evaluates `backgroundImages` in one array-order pass;
- image existence, dimensions, disabled mode, and render failure are diagnosed;
- `successfulBackgroundIds` control blocker fallback visibility;
- `validateMapBackgroundOwnership` currently validates backgrounds and blockers only;
- `MapDecor` and `MapFenceSegment` have no visual-ownership field;
- diagnostics expose blocker fallback IDs and segment counts only;
- hidden collision remains independent of whether a live visual renders;
- Sundrop Village proves one base/foreground pair and intentional multi-owner blockers.

HPA-398 deliberately replaced arbitrary numeric descriptor depth with semantic `base` and `foreground` planes. HPA-406 preserves that decision: it does **not** restore a raw `depth` field. It adds constrained, generator-owned semantic ordering within each plane because HPA-399 introduces multiple approved crops whose frozen manifest already defines `drawOrder` and overlap ownership.

This is a deliberate API extension from one fixed depth per plane to deterministic ordering inside each plane. The renderer continues to own actual Phaser depth calculation.

## 7. Manifest-driven runtime package

### 7.1 Authoritative inputs

Add a deterministic runtime-package generator that consumes the repository's approved TypeScript contracts directly:

- `MEADOW_ENTRY_APPROVED_CROPS`;
- `MEADOW_ENTRY_APPROVED_OVERLAPS`;
- `MEADOW_ENTRY_BAKE_OWNERSHIP`;
- the meadow-entry source catalog;
- `meadowEntryArtPackageApproval`.

Do not parse proof screenshots or introduce manually maintained duplicate crop JSON when authoritative TypeScript sources exist.

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

  // Exact HPA-399 combined control fingerprint.
  controlFingerprint: string;

  // HPA-406 SHA-256 over the canonical HPA-496 runtime export inventory.
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
3. verify every required export's SHA-256, dimensions, crop ID, plane, texture key, filename, and draw order;
4. derive stable runtime IDs, paths, and world-space descriptors using the mappings below;
5. resolve all new baked visual owners;
6. materialize exact approved export bytes in the public runtime namespace;
7. publish generated data and assets atomically;
8. support a non-mutating `--check` mode;
9. fail when generated TypeScript or runtime PNGs are stale;
10. fail closed on unsupported versions, duplicate identities, missing dependencies, or incomplete ownership.

Add package commands:

```text
world:generate:meadow-entry-runtime
world:validate:meadow-entry-runtime
```

### 7.3 Stable identity mapping

The HPA-398 identities remain unchanged:

| Meaning | Background ID | Texture key | Runtime path |
| --- | --- | --- | --- |
| Sundrop base | `sundrop-village-base-image` | `sundrop-village-base` | existing HPA-398 path |
| Sundrop foreground | `sundrop-village-foreground-image` | `sundrop-village-foreground` | existing HPA-398 path |

For every HPA-399 export, use these pure mappings:

```ts
textureKey = approvedCrop.textureKeys[plane]
backgroundId = `${textureKey}-image`
runtimePath = `/game/assets/regions/meadow-entry/${approvedFilename}`
```

For example:

```text
cropId:       crossroads
plane:        base
textureKey:   meadow-entry-crossroads-base
backgroundId: meadow-entry-crossroads-base-image
runtimePath:  /game/assets/regions/meadow-entry/crossroads-base.png
```

The background ID—not the crop ID and not the texture key—is the identifier used by:

- `MapBackgroundImage.id`;
- `dependsOnBackgroundId`;
- `ownerBackgroundIds`;
- render diagnostics;
- render-fault injection query parameters;
- checkpoint evidence.

Validation must prove that background IDs and texture keys are globally unique across all HPA-398 and HPA-406 descriptors.

### 7.4 Fingerprint definitions

`controlFingerprint` is exactly the frozen HPA-399 `combinedControlFingerprint`. It represents controls, crop/overlap/runtime coverage, ownership, and the other inputs already included by HPA-399. HPA-406 does not recompute it from a different field set.

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

Including `combinedControlFingerprint` inside this payload intentionally binds the approved visual inventory to the exact control revision it was produced from, even though the runtime package also exposes `controlFingerprint` separately for direct diagnostics.

The HPA-514 Story Integration Catalog fingerprint belongs to the Area Expansion Packet and checkpoint evidence. It is not folded into the visual runtime package fingerprint.

### 7.5 Coordinate model

Use the existing HPA-399 geometry helpers rather than reimplementing coordinate math:

```ts
sourceBounds = toRawPixelBounds(sourceRect)
requiredBounds = expandByInsets(sourceBounds, frozenOwnershipMargins)
eligible = containsBounds(crop.bounds, rasterizeCoverageBounds(requiredBounds))
```

Crop descriptor coordinates remain:

```text
width  = right - left
height = bottom - top
x      = left + width / 2
y      = top + height / 2
```

The ownership calculation and descriptor calculation must share the same center-based-to-pixel-bounds conversion path. Containment uses inclusive outer edges (`<=`/`>=`), matching HPA-399 `containsBounds`; therefore an object exactly on a crop edge with zero outward margin remains eligible.

Tests must cover half-pixel centers, rasterization, zero-margin edge contact, positive outward margins, and a source that becomes ineligible only after its frozen margin is applied.

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

Because artifact and runtime files are byte-identical, their Git LFS pointers must reference the same content OID. The storage verifier must prove:

- both paths are LFS tracked;
- neither path is committed as a raw large Git blob;
- artifact and runtime SHA-256 values match;
- their LFS OIDs match;
- every runtime file is materialized for build and CI.

This avoids duplicating the remote content-addressed LFS object, although a developer checkout and final build contain a second materialized copy at the runtime path. That local and packaged-size cost is explicit and is measured by HPA-406 diagnostics and the later HPA-411 performance gate.

Do not use symlinks or hard links: they are not a stable cross-platform public-asset contract for browser, CI, and Tauri builds. Do not rely on an uncommitted build-time copy that makes development or packaging depend on hidden local preparation.

### 8.3 Checkpoint publication policy

The generator validates and materializes the **full approved runtime inventory** beginning with Checkpoint 1. This avoids a temporary package format or checkpoint flag.

Internal checkpoint commits may attach cumulative descriptor subsets to `meadowEntryMap` while implementation proceeds, but the generated inventory and preload registry are complete from the first runtime-package checkpoint. The final PR state attaches every approved descriptor. No checkpoint selector remains in production code.

The increased preload weight is therefore present from Checkpoint 1 and must be visible in diagnostics. HPA-411 retains final performance acceptance.

## 9. Background descriptor ordering

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

For HPA-399 crops, the generator copies these frozen values from the HPA-399 crop manifest:

- Sundrop underlay: `0`;
- east forest boundary base: `10`;
- connector crops: `100` through `140`;
- Crossroads and destination regions: `200` through `240`.

The immutable HPA-398 Sundrop base and foreground are not HPA-399 crops and have no crop-manifest `drawOrder`. HPA-406 assigns one fixed runtime adapter value:

```ts
const HPA398_SUNDROP_OVERLAY_DRAW_ORDER = 1_000;
```

Both HPA-398 Sundrop descriptors use `1_000`. This preserves the frozen seam contract:

- every HPA-399 base crop renders before the immutable HPA-398 Sundrop base overlay;
- every HPA-399 foreground crop renders before the immutable HPA-398 Sundrop foreground overlay where they intersect.

No other runtime-only descriptor order may be introduced without an explicit reviewed contract amendment.

### 9.2 Uniqueness and deterministic order

The generator rejects duplicate `(plane, drawOrder)` pairs among published descriptors. Base and foreground are separate semantic planes, so the two HPA-398 descriptors may both use `1_000` because their planes differ.

Equal depth inside one plane is forbidden because Phaser insertion order would otherwise become an implicit seam-ownership rule.

Descriptors are sorted by:

1. ascending `drawOrder`;
2. ascending background ID only as a deterministic serialization safeguard.

The second key must never resolve a valid draw-order tie because ties inside a plane are rejected.

### 9.3 Depth calculation and API migration

Use the existing `MAP_BACKGROUND_DEPTHS` constants and a bounded order offset:

```ts
const BACKGROUND_ORDER_SCALE = 10_000;

type BackgroundDepthInput = Pick<MapBackgroundImage, 'plane' | 'drawOrder'>;

function getMapBackgroundDepth(background: BackgroundDepthInput): number {
  return MAP_BACKGROUND_DEPTHS[background.plane] + background.drawOrder / BACKGROUND_ORDER_SCALE;
}
```

The approved maximum runtime order of `1_000` produces an offset of `0.1`. This keeps all base images inside the existing base band above tile ground and below live gameplay objects, and all foreground images inside the existing foreground band above the player but below HUD/debug overlays.

This changes the public helper from:

```ts
getMapBackgroundDepth(plane: MapBackgroundPlane)
```

to the descriptor-based input above. Implementation must migrate:

- the `WorldScene` render call;
- direct unit-test calls;
- e2e expectations that compare recorded depths;
- proof or validation utilities that derive or assert background depths.

`bun run check` and focused search must show no remaining plane-only call site.

Validation rejects negative values, values above `1_000`, non-integers, and any descriptor order not supplied by the HPA-399 generator or the single HPA-398 overlay constant.

Tests prove that each HPA-399 overlap's `ownerCropId` renders above the other crop on every plane allowed by its plane policy. Runtime insertion order never decides seam ownership.

## 10. Two-phase runtime render algorithm

`WorldScene.renderRegionalBackgrounds` must no longer depend on `backgroundImages` array order for base/foreground dependency resolution.

### 10.1 Pre-render validation

Before creating an image:

- index all descriptors by background ID;
- reject duplicate IDs;
- require every foreground descriptor to declare `dependsOnBackgroundId`;
- require the dependency to exist in the same map/package;
- require the dependency descriptor to use plane `base`;
- require matching crop identity for generated HPA-399 base/foreground pairs;
- require the HPA-398 foreground to depend on `sundrop-village-base-image`;
- reject dependency cycles or foreground-to-foreground dependencies.

The generator performs the same checks before publication, and map validation repeats them after composition.

### 10.2 Phase 1 — bases

When regional backgrounds are enabled:

1. select all `plane: 'base'` descriptors;
2. sort them by approved within-plane order;
3. evaluate missing texture, invalid dimensions, injected render failure, and rendered status;
4. add only rendered base IDs to `successfulBackgroundIds`.

When regional backgrounds are disabled, every base and foreground descriptor receives `disabled`; dependency evaluation does not convert disabled foregrounds to `blocked-by-base`.

### 10.3 Phase 2 — foregrounds

After every base has a terminal result:

1. select all `plane: 'foreground'` descriptors;
2. sort them by approved within-plane order;
3. if `dependsOnBackgroundId` is absent from `successfulBackgroundIds`, emit `blocked-by-base`, do not inspect or create the foreground image, and do not add its ID to the success set;
4. otherwise evaluate missing texture, invalid dimensions, injected render failure, and rendered status normally;
5. add only rendered foreground IDs to `successfulBackgroundIds`.

Extend `RegionalBackgroundRenderStatus` with:

```ts
| 'blocked-by-base'
```

It joins the existing `disabled`, `rendered`, `missing-texture`, `invalid-dimensions`, and `render-failed` statuses. It is not a parallel diagnostic channel.

A `blocked-by-base` entry has `observedDimensions: null`, no `renderTransform`, and a diagnostic reason containing the missing dependency ID.

### 10.4 Phase 3 — fallback selection

Only after both render phases finish:

1. evaluate blocker, decor, and fence visual ownership against the final success set;
2. emit selected fallback diagnostics;
3. return the final `successfulBackgroundIds` to the remaining render paths.

Fallback visibility must never be calculated from a partial success set.

## 11. Generic visual ownership

### 11.1 Map-model changes

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

### 11.2 Generic ownership validation

Expand the validator source to include every owned collection:

```ts
type MapBackgroundOwnershipSource = Pick<
  WorldMapDefinition,
  'backgroundImages' | 'blockers' | 'mapDecor' | 'fences'
>;
```

`validateMapBackgroundOwnership` must validate fallback-only entries in all three visual collections:

- the owner list is non-empty;
- owner IDs are unique;
- every owner ID exists in `backgroundImages`;
- the item ID is unique within its collection;
- generated HPA-406 entries obey the single-base-owner package invariant.

The generic validator does **not** impose single ownership globally because HPA-398 deliberately has multi-owner entries.

### 11.3 Existing HPA-398 multi-owner compatibility

The immutable HPA-398 Sundrop ownership manifest deliberately uses both base and foreground owners for obstacles with foreground treatment. Its existing rule remains:

```ts
renderLive = !ownerBackgroundIds.every((id) => successfulBackgroundIds.has(id))
```

Therefore, for those pre-existing dual-owner entries only, a foreground failure while the base succeeds restores the full live obstacle. This predecessor behavior is preserved intentionally and may visually overlap the surviving base artwork in partial-foreground mode.

The HPA-406 rule that foreground failure must not restore a complete live obstacle applies only to **new HPA-406-generated single-base-owner entries**. Changing the HPA-398 predecessor behavior requires a separate reviewed contract amendment or ticket.

Normal fully rendered mode must remain duplicate-free for both predecessor and new entries.

### 11.4 HPA-406 single-owner invariant

Every new HPA-406-generated blocker, decor, or fence fallback entry has exactly one authoritative **base** owner.

This is enforced twice:

1. by the runtime-package generator before publication;
2. by an HPA-406 generated-package validator used by `world:validate:meadow-entry-runtime`.

It is not imposed on the pre-existing HPA-398 manifest.

For every HPA-399 source whose runtime requirement is:

- `existing-blocker-fallback`;
- `extend-decor-fallback`;
- `extend-fence-fallback`;

resolve its owner as follows:

1. obtain source bounds and frozen visual margins from the bake-ownership entry using the shared coordinate helpers;
2. find approved base crops that fully contain the required visual bounds;
3. prefer crops whose `sourceRegionIds` include the source's approved primary region;
4. choose the containing candidate with the highest approved draw order;
5. if multiple candidates tie at the highest order, fail;
6. validate overlap consistency as defined below;
7. fail generation if one unique authoritative base owner cannot be established.

### 11.5 Precise overlap consistency

For an approved overlap between two candidate base crops:

- if **both** crops fully contain the source's required visual bounds, the selected owner must equal that overlap's `ownerCropId`;
- if only one crop fully contains the required visual bounds, that crop is the only eligible owner and the partial overlap does not create a competing owner;
- if neither crop fully contains the required visual bounds, that overlap is irrelevant to owner selection.

This makes `ownerCropId` authoritative where both crops are true alternatives without incorrectly requiring a partially overlapping higher-order crop to own a source it cannot fully cover.

### 11.6 Unresolved baked source behavior

An unresolved or ambiguous baked source is a hard build failure:

- the generator exits non-zero;
- no new generated module or runtime PNG package is published;
- `--check` fails;
- CI fails;
- the source is not silently left live, silently hidden, or assigned a default owner.

The defect is routed to HPA-399 if the frozen ownership/crop contract is insufficient, or to HPA-406 if the runtime adapter is incorrect.

Sources marked `remain-live`, `fallback-tile`, `none`, `control-only`, `protected-live`, or another non-baked disposition must be handled exhaustively and never silently hidden.

### 11.7 Live semantic objects

The ownership adapter must not attach fallback-only visual ownership to:

- buildings and entrances;
- NPCs or ambient NPCs;
- pickups and discoveries;
- encounters and combat bounds;
- transitions;
- stateful or animated gates;
- story-controlled objects.

These remain live and behaviorally unchanged.

## 12. Pure map composition pipeline

Apply generated data at the assembled `meadowEntryMap` boundary. Region fragments remain authoritative for gameplay objects and collision geometry and must not be mutated.

The composition sequence is:

```ts
const merged = mergeRegions(fragments);

const existingBackgrounds = applyHpa398RuntimeOrdering(
  merged.backgroundImages,
  HPA398_SUNDROP_OVERLAY_DRAW_ORDER
);

const backgrounds = appendGeneratedBackgrounds(
  existingBackgrounds,
  meadowEntryRuntimePackage.backgrounds
);

const sundropOwnedBlockers = applySundropObstacleOwnership(merged.blockers);

const blockers = applyGeneratedVisualOwnership(
  sundropOwnedBlockers,
  meadowEntryRuntimePackage.ownership.blockers,
  { rejectAlreadyOwned: true }
);

const mapDecor = applyGeneratedVisualOwnership(
  merged.mapDecor,
  meadowEntryRuntimePackage.ownership.decor,
  { rejectAlreadyOwned: true }
);

const fences = applyGeneratedVisualOwnership(
  merged.fences,
  meadowEntryRuntimePackage.ownership.fences,
  { rejectAlreadyOwned: true }
);

const ownershipSource = { backgrounds, blockers, mapDecor, fences };

validateMapBackgroundDependencies(ownershipSource);
validateMapBackgroundOwnership(ownershipSource);
validateGeneratedMeadowEntryOwnership(ownershipSource, meadowEntryRuntimePackage);
validateSundropObstacleCoverage(ownershipSource, SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP);
```

Normative behavior:

- generated backgrounds are appended; they do not replace the HPA-398 pair;
- the HPA-496 Sundrop underlay is appended as a distinct HPA-399 base crop below the HPA-398 base;
- `applySundropObstacleOwnership` runs before generated ownership;
- the generated package must not target an already-owned HPA-398 blocker; that is a hard conflict, not a silent skip or overwrite;
- generated ownership helpers return new arrays and new changed objects only;
- source region arrays and objects remain structurally unchanged;
- validators run against the final composed arrays;
- final `meadowEntryMap` receives the composed `backgroundImages`, `blockers`, `mapDecor`, and `fences`.

Tests must prove input immutability, no HPA-398 ownership overwrite, and deterministic output independent of fragment-array object identity.

## 13. Preload, diagnostics, and e2e migration

### 13.1 Asset registry

The generated package exports the full approved runtime asset inventory. `regionalBackgroundAssets` becomes the combination of:

- the two existing HPA-398 assets;
- every generated HPA-406 asset.

The registry validates unique texture keys, unique background IDs, approved hashes, and materialized runtime paths.

`BootScene` continues to preload this registry when regional backgrounds are enabled. The disabled query mode still queues zero regional background images.

### 13.2 Completion-count expectations

Tests must not hard-code the predecessor count of `2`.

Use the registry as the source of truth:

```ts
const EXPECTED_REGIONAL_BACKGROUND_LOAD_COMPLETIONS = regionalBackgroundAssets.length;
```

Enabled preload tests expect that value. Disabled mode expects `0`. Individual injected load failures must assert the documented completion semantics rather than assuming a fixed package size.

### 13.3 Diagnostic payload

Preserve the existing blocker fields for compatibility and add optional fields:

```ts
interface RegionalBackgroundPlaneRenderDiagnostic {
  // existing fields
  selectedFallbackBlockerIds?: readonly string[];
  selectedFallbackBlockerSegmentCount?: number;

  // HPA-406 additive fields
  selectedFallbackDecorIds?: readonly string[];
  selectedFallbackFenceIds?: readonly string[];
  selectedFallbackFenceSegmentCount?: number;
}
```

Decor does not receive a segment count because each `MapDecor` entry renders as one authored object/tile operation. Fence segment count uses the same concrete tiling calculation used by the fence renderer.

Diagnostics and e2e tests must verify all three selected fallback collections after the final two-phase success set is known.

### 13.4 LFS materialization gate

Before build or Playwright execution in CI:

- Git LFS must be installed;
- the runtime namespace must be smudged/materialized;
- storage verification must reject pointer text presented as PNG bytes;
- a materialized runtime canary must be checked before `bun run build` and `bun run test:e2e`.

Add or extend a stable command such as:

```text
art:storage:meadow-entry-runtime
```

The final validation workflow invokes it before browser and Tauri builds.

## 14. Internal checkpoint sequence inside one PR

### 14.1 Checkpoint 1 — Crossroads and connector seam proof

Implement the shared runtime package, two-phase ordering, generic ownership, foreground dependency, and composition path, then attach:

- Sundrop underlay;
- Village–Crossroads connector;
- Crossroads–Coast connector;
- Crossroads–Mistfen connector;
- Crossroads–Silverpine connector;
- Crossroads–Wildwood connector;
- Crossroads.

The full approved asset inventory is already generated and preloaded at this checkpoint, but only this cumulative descriptor subset is attached to the map in the Checkpoint 1 commit group. Later checkpoint commits attach the remaining descriptors. No activation flag survives in final code.

Required acceptance:

- Village ↔ Crossroads traversal succeeds in both directions;
- every connector mouth renders correctly in enabled and fallback modes;
- overlap owner ordering matches the manifest;
- both immutable Sundrop overlays render above all HPA-399 crops;
- castle and story gates remain live;
- no former Sundrop boundary quality jump remains;
- all three HPA-495 outdoor skills are exercised and their decisions recorded.

Checkpoint 1 is represented by focused commits and its own evidence report, not a separate PR.

### 14.2 Checkpoint 2 — Tidewatch Coast and Silverpine

Attach Tidewatch Coast and Silverpine using the proven runtime path.

Coast acceptance:

- shoreline, sand, tidepool, rock, driftwood, Ferry Shrine, and jetty artwork align;
- ocean collision, NPCs, rewards, discoveries, shrine and jetty semantics remain live;
- the full route is walkable in both directions;
- foreground separation remains readable.

Silverpine acceptance:

- autumn terrain, ceremonial paths, offering grove, terrace, shrine approach, and canopy/arch foreground align;
- Silver Shrine Gate and stateful restrictions remain live;
- the offering-grove detour and gate route work in both directions.

No new renderer architecture should be added at this checkpoint unless a documented failing HPA-495 regression scenario proves the shared design insufficient.

### 14.3 Checkpoint 3 — Mistfen and Wildwood

Attach Mistfen, Wildwood, and the east forest boundary crop.

Mistfen acceptance:

- marsh, pool, reed, root, deadfall, fog-ground, and silhouette layers align;
- hidden collision remains forgiving through narrow passages;
- Witchwood Gate, side pocket, rewards, discoveries, NPCs, and state changes remain live.

Wildwood acceptance:

- forest floor, tree/root boundaries, brush, side clearing, combat framing, cave approach, and canopy align;
- enemies, pickups, routes, and Cave transition remain readable beneath foreground;
- combat movement, aggro, leash, and bounds behave unchanged.

At the end of Checkpoint 3, a coverage test reports zero unintegrated approved non-village crops.

## 15. Validation architecture

### 15.1 Generated-package tests

Prove that:

- every runtime export matches the HPA-496 approval record;
- identity and path mappings are exact;
- crop bounds convert to exact center coordinates;
- dimensions, texture keys, planes, and manifest draw orders match frozen inputs;
- both HPA-398 overlays use only the fixed runtime adapter order `1_000`;
- `(plane, drawOrder)` pairs are unique;
- every foreground has one valid base dependency;
- every runtime asset has exactly one descriptor;
- generated output is byte-deterministic;
- stale generated files fail `--check`;
- unsupported versions fail closed;
- control and art-package fingerprints match their definitions.

### 15.2 Ownership and composition tests

Prove that:

- every blocker/decor/fence fallback requirement is resolved;
- all non-baked requirements are handled explicitly;
- every new HPA-406-owned source has exactly one base owner;
- existing HPA-398 multiple-owner entries remain valid and unchanged;
- no generated ownership targets an already-owned HPA-398 source;
- no new owned source points to a foreground ID;
- neighboring crop failure does not restore unrelated visuals;
- protected-live and semantic objects remain live;
- visual suppression never changes collision;
- ambiguous or unresolved ownership fails generation without partial publication;
- composition helpers do not mutate merged region inputs.

### 15.3 Scene and diagnostic tests

Extend existing scene tests to cover:

- constrained depth calculation using `MAP_BACKGROUND_DEPTHS`;
- unique within-plane ordering and insertion-order independence;
- base phase always completes before foreground evaluation;
- overlap owner ordering;
- HPA-398 overlay ordering above the full HPA-399 crop band;
- `RegionalBackgroundRenderStatus` addition `blocked-by-base`;
- blocked foreground exclusion from `successfulBackgroundIds`;
- valid-base/invalid-foreground behavior;
- HPA-406 single-base-owner fallback behavior;
- preserved HPA-398 dual-owner foreground-failure behavior;
- blocker, decor, and fence fallback through the shared helper;
- additive diagnostic fields;
- no duplicate live obstacle art in fully rendered normal mode;
- collision invariance across rendering modes.

### 15.4 Map, route, and save tests

Extend existing geometric route and collision sampling patterns rather than relying only on screenshots.

Add tests for:

- every connector mouth;
- bidirectional route samples;
- transition and gate clearances;
- Mistfen narrow passages and edge-margin ownership cases;
- Coast and Silverpine detours;
- Wildwood combat-area movement;
- protected-live object positions;
- representative save/reload coordinates.

### 15.5 Mandatory visual evidence

The Linear ticket requires region-by-region captures. For each included region or connector group, the mandatory core matrix is:

- enabled;
- disabled;
- missing base;
- invalid base dimensions;
- partial foreground (missing or invalid foreground, chosen to exercise that region's foreground contract);
- collision overlay.

These are mandatory and cannot be replaced by unit tests alone.

### 15.6 Representative checkpoint evidence

The following expensive or synthetic cases are mandatory once per checkpoint using a representative crop selected in the report:

- injected base render failure;
- injected foreground render failure;
- foreground `blocked-by-base`;
- save/reload;
- continuous controller traversal covering every route owned by the checkpoint.

Automated scene tests still cover every terminal status and descriptor class. Extra exploratory captures are optional and should be added only for an observed defect or review question.

Deterministic probe coordinates may be used for visual captures, but route acceptance includes actual controller movement rather than teleport-only screenshots.

## 16. Evidence layout

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
- exact descriptor and asset inventory consumed;
- skills loaded and why;
- decisions, commands, and manifests consumed;
- human visual approvals;
- skill gaps, rationalizations, and deviations;
- regression scenarios added to HPA-495 or an explicitly rescoped follow-up ticket if HPA-495 has merged;
- provenance and asset locations;
- defects routed upstream;
- residual risks, including any preserved HPA-398 partial-foreground fallback overlap observed.

## 17. Defect routing

HPA-406 classifies defects rather than correcting upstream sources locally:

- incorrect crop, overlap, route mouth, ownership, or geometry → HPA-399 contract amendment;
- incorrect pixels, alpha, lighting, material continuity, export, hash, provenance, or approved inventory → HPA-496 correction;
- stale or unsupported story, character, location, gate, spoiler, or audio requirement → HPA-514 correction;
- reusable workflow gap while HPA-495 is open → failing scenario and smallest correction in the single HPA-495 PR;
- reusable workflow gap after HPA-495 merges → new Linear ticket and one PR;
- runtime registration, identity mapping, ordering, dependencies, ownership application, diagnostics, fallback, storage publication, or walkthrough defect → HPA-406.

No region-specific exception bypasses this routing.

## 18. Command gate

The final HPA-406 PR must pass:

```bash
bun run art:storage:meadow-entry-runtime
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

The PR must also pass focused asset-integrity, LFS/materialization, scene, save, skill-regression, and region-walkthrough gates introduced by this ticket.

HPA-406 records preload and render diagnostics and obvious regressions, but HPA-411 owns the independent complete-map performance budget and sign-off.

## 19. Risks and mitigations

### Excessive PR size

Preserve one PR but organize it into three checkpoint commit groups, separate reports, focused test gates, and explicit approvals. If it becomes unreviewable, rescope at the Linear-ticket level before adding more implementation.

### Dependency-order race

Use explicit base and foreground render phases. Never infer dependency success from descriptor array order.

### Identity drift

Generate background IDs, texture keys, paths, ownership references, diagnostics, and fault-injection IDs from one pure mapping and validate global uniqueness.

### Frozen Sundrop seam-order violation

Use the single fixed HPA-398 overlay order `1_000`, validate it above the complete HPA-399 crop band on both planes, and reject any alternative runtime-only order.

### Duplicate visual restoration

Assign one authoritative base owner per new HPA-406 baked source. Preserve and explicitly report immutable HPA-398 dual-owner partial-foreground fallback behavior rather than silently changing it.

### Accidental seam ordering

Derive HPA-399 order from the frozen manifest, reject equal within-plane order, and test every declared overlap owner. Do not depend on array insertion order.

### Floating foregrounds

Require every foreground to depend on a base, render bases first, and emit `blocked-by-base` without creating the foreground image.

### Large runtime asset duplication and preload

Commit runtime copies as LFS pointers, require identical LFS OIDs with approved artifacts, validate materialization before builds, expose full preload counts from Checkpoint 1, and leave final performance sign-off to HPA-411.

### Hidden semantic changes

Generated ownership is exhaustive, protected-live content cannot be hidden, composition is pure, and map behavior tests compare existing IDs, collision, routes, state, and saves.

### Evidence overload

Keep the ticket-mandated six-mode region matrix, but require injected render failures, blocked dependencies, save/reload, and traversal once per checkpoint rather than for every crop.

### Stale upstream contracts

Validate HPA-514, HPA-399, and HPA-496 fingerprints before each checkpoint and fail rather than infer requirements.

### Hidden manual workflow knowledge

Execute checkpoints through HPA-495, record deviations, and fix reusable gaps through regression scenarios in HPA-495's single PR or an explicitly rescoped follow-up ticket after merge.

## 20. Acceptance criteria

HPA-406 is complete when:

- exactly one HPA-406 PR contains all work;
- every approved non-village base and foreground export is registered and rendered from manifest-derived descriptors;
- runtime IDs, paths, bytes, dimensions, hashes, texture keys, manifest draw order, control fingerprint, and art-package fingerprint match approved inputs;
- every foreground dependency is valid and base evaluation completes before foreground rendering;
- `blocked-by-base` foregrounds are not created and are excluded from the success set;
- every HPA-399 crop renders below the immutable HPA-398 Sundrop overlay on the corresponding plane;
- every `(plane, drawOrder)` pair is unique and all HPA-399 overlaps follow approved owner ordering;
- map composition appends generated backgrounds, preserves HPA-398 ownership, and does not mutate region inputs;
- no seam, hole, double-darkening, collision drift, invisible obstacle, duplicated live art in normal mode, or abrupt fallback-quality shift remains;
- HPA-406 foreground failure does not restore complete live art when its base rendered;
- immutable HPA-398 dual-owner foreground-failure behavior remains unchanged and is documented in partial-foreground evidence;
- buildings, NPCs, pickups, discoveries, encounters, combat bounds, transitions, gates, and stateful content behave unchanged;
- every new baked blocker/decor/fence requirement has one authoritative base owner, existing HPA-398 ownership remains intact, and every non-baked requirement remains explicit;
- unresolved baked ownership or missing base dependency fails before partial package publication;
- generic validation and diagnostics cover blockers, decor, and fences;
- preload and e2e completion expectations derive from the generated registry rather than a hard-coded predecessor count;
- artifact and runtime PNGs are byte-identical, LFS tracked, materialized in CI, and share the same content OID;
- the mandatory six-mode region evidence and representative per-checkpoint failure/save/traversal evidence exist;
- continuous traversal succeeds from Village through Crossroads to every destination and back;
- each checkpoint consumes a current HPA-514 fingerprint and approved HPA-495 Area Expansion Packet;
- every reusable skill gap is corrected through a documented regression scenario in the active HPA-495 PR or an explicitly rescoped follow-up ticket;
- the full command gate passes;
- HPA-411 can begin without additional regional integration work.
