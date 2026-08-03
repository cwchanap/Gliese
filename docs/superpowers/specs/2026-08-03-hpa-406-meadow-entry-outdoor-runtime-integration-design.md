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

Before implementation begins, read current Linear and GitHub state and require approved outputs, not merely an issue or branch name.

## 4. Goals

- Register every approved non-village base and foreground export in a deterministic runtime inventory.
- Keep approved inventory generation separate from runtime load-policy decisions.
- Derive runtime descriptors from frozen crop and approval manifests rather than copying coordinates or metadata manually.
- Respect approved overlap ownership and draw order within base and foreground planes.
- Preserve the frozen HPA-399 requirement that every HPA-399 crop renders below the immutable HPA-398 Sundrop overlay on the corresponding plane.
- Assign baked static visuals to authoritative runtime owners while collision remains live and hidden.
- Preserve buildings, NPCs, pickups, discoveries, encounters, combat bounds, transitions, story gates, and other stateful content as live objects.
- Restore readable live or tile fallback visuals when a required baked base does not render.
- Allow a valid base to remain when its optional foreground is missing or invalid.
- Prevent seams, holes, double-darkening, duplicated live art, floating foregrounds, invisible obstacles, and abrupt quality shifts.
- Measure the boot/load safety of the complete inventory during Checkpoint 1 before approving an eager full-map load policy.
- Produce deterministic evidence for rendering modes and continuous traversal routes.
- Field-test HPA-495 skills without adding undocumented local integration knowledge.

## 5. Non-goals

- No crop, overlap, route-mouth, corner, clamp, gameplay geometry, or source-ownership changes.
- No visual-master regeneration, regional retouching, or independent per-region art correction.
- No route, encounter, gate, building function, NPC role, story, spoiler, or audio redesign.
- No complex-interior work.
- No arbitrary descriptor-level raw depth escape hatch.
- No permanent checkpoint feature flag.
- No duplicate runtime source of truth for crop geometry or artwork metadata.
- No final whole-map performance sign-off; HPA-411 owns the independent final budget and packaged-runtime gate.
- No speculative streaming implementation unless the Checkpoint 1 safety gate rejects eager loading. If streaming is required, stop and create a dedicated Linear ticket and PR before continuing HPA-406.

## 6. Current runtime foundation

The existing runtime already provides:

- region-fragment `backgroundImages` merged into `meadowEntryMap`;
- a `regionalBackgroundAssets` preload registry;
- base and foreground image rendering in `WorldScene`;
- disabled, missing-texture, invalid-dimension, and render-failure diagnostics;
- successful-background IDs used for blocker fallback visibility;
- collision independent from visual ownership;
- one HPA-398 Sundrop base/foreground pair and reviewed multi-owner blockers.

HPA-398 intentionally replaced arbitrary numeric descriptor depth with semantic `base` and `foreground` planes. HPA-406 preserves that decision. It adds constrained ordering inside each semantic plane because HPA-399 introduces multiple approved crops with frozen `drawOrder` and overlap ownership.

This is a structural extension from one fixed depth per plane to deterministic ordering inside a plane, while the renderer remains the sole owner of Phaser depth calculation.

## 7. Background model split

Making `drawOrder` required directly on the existing fragment-level type would break `createLayeredRegionBackground` and `villageRegion`, which author the HPA-398 descriptors before runtime ordering is applied.

Split the model into authored and composed forms:

```ts
export type MapBackgroundPlane = 'base' | 'foreground';

export interface AuthoredMapBackgroundImage extends MapRect {
  textureKey: string;
  plane: MapBackgroundPlane;
}

export interface MapBackgroundImage extends AuthoredMapBackgroundImage {
  drawOrder: number;
  dependsOnBackgroundId?: string;
}
```

Type ownership:

- `RegionFragment.backgroundImages?: AuthoredMapBackgroundImage[]`;
- `createLayeredRegionBackground(...)` returns `AuthoredMapBackgroundImage`;
- `mergeRegions(...)` carries authored descriptors;
- `WorldMapDefinition.backgroundImages?: MapBackgroundImage[]` contains only fully composed, ordered descriptors;
- `applyHpa398RuntimeOrdering(...)` is the explicit widening step from the two authored HPA-398 descriptors to composed descriptors;
- generated HPA-399 descriptors are created directly as composed `MapBackgroundImage` values.

This enforces “ordering is not freely authored by region code” at the type boundary.

## 8. Manifest-driven runtime package

### 8.1 Authoritative inputs

The generator consumes the repository’s approved TypeScript contracts directly:

- `MEADOW_ENTRY_APPROVED_CROPS`;
- `MEADOW_ENTRY_APPROVED_OVERLAPS`;
- `MEADOW_ENTRY_BAKE_OWNERSHIP`;
- meadow-entry source catalog;
- `meadowEntryArtPackageApproval`.

Do not parse proof screenshots or add manually maintained duplicate crop JSON.

### 8.2 Stable ID, texture, filename, and URL mappings

For every HPA-496 export:

```ts
backgroundId = `${textureKey}-image`;
textureKey = approvedExport.textureKey;
filename = approvedCrop base/foreground filename;
runtimePath = `/game/assets/regions/meadow-entry/${filename}`;
```

Example:

```text
cropId: crossroads
plane: base
textureKey: meadow-entry-crossroads-base
backgroundId: meadow-entry-crossroads-base-image
filename: crossroads-base.png
runtimePath: /game/assets/regions/meadow-entry/crossroads-base.png
```

The mapping must be implemented as pure functions and tested against every approval entry.

The two HPA-398 descriptors retain their frozen identities:

```text
sundrop-village-base-image
sundrop-village-foreground-image
```

Ownership, dependencies, diagnostics, injected-fault query parameters, generated evidence, and map composition always reference **background descriptor IDs**. They never substitute crop IDs or texture keys.

Validation rejects duplicate background IDs or texture keys across the HPA-398 and HPA-406 inventories.

### 8.3 Unified asset element type

Use one loader-facing type for both predecessor and generated assets:

```ts
export interface RegionalBackgroundAsset {
  id: string;
  key: string;
  path: string;
  plane: MapBackgroundPlane;
  width: number;
  height: number;
  drawOrder: number;
  approvedControlFingerprint: string;
  approvedPngSha256: string;
  source: 'hpa-398' | 'hpa-496';
  cropId?: string;
  dependsOnBackgroundId?: string;
}
```

Field mapping:

- HPA-398 keeps its current `approvedControlFingerprint` and `approvedPngSha256` values, adds stable ID, plane, dimensions, fixed draw order, and the foreground dependency;
- HPA-496 uses the runtime-package `controlFingerprint` as `approvedControlFingerprint` and each export SHA-256 as `approvedPngSha256`;
- `key` is the Phaser texture key and must equal each composed descriptor’s `textureKey`;
- HPA-496 entries include `cropId`; HPA-398 entries omit it.

The generated package contains only HPA-406 data:

```ts
interface RuntimeVisualOwner {
  sourceId: string;
  ownerBackgroundId: string;
}

interface MeadowEntryRuntimePackage {
  version: 1;
  controlFingerprint: string;
  artPackageFingerprint: string;
  assets: readonly RegionalBackgroundAsset[];
  backgrounds: readonly MapBackgroundImage[];
  ownership: {
    blockers: readonly RuntimeVisualOwner[];
    decor: readonly RuntimeVisualOwner[];
    fences: readonly RuntimeVisualOwner[];
  };
}
```

The unified runtime inventory is assembled from:

```ts
const regionalBackgroundAssetInventory: readonly RegionalBackgroundAsset[] = [
  ...hpa398RegionalBackgroundAssets,
  ...meadowEntryRuntimePackage.assets
];
```

Tests replace the predecessor exact two-element assertion with:

- exact assertions for the two HPA-398 entries;
- exact generated-inventory assertions for HPA-406;
- unique ID/key/path validation for the combined inventory.

### 8.4 Generator responsibilities

The generator must:

1. read the current HPA-399 combined control fingerprint;
2. require `meadowEntryArtPackageApproval.combinedControlFingerprint` to match it exactly;
3. verify every export’s SHA-256, dimensions, crop ID, plane, texture key, filename, and draw order;
4. generate stable descriptor IDs and runtime URLs;
5. calculate world-space descriptors from approved crop bounds;
6. resolve generated visual ownership;
7. materialize exact approved export bytes in the runtime namespace;
8. publish generated data and assets atomically;
9. support non-mutating `--check` mode;
10. fail when generated TypeScript or runtime PNGs are stale;
11. fail closed on unsupported package versions, duplicate order, invalid dependencies, or incomplete ownership.

Recommended files:

```text
tools/generate-meadow-entry-runtime-package.ts
src/lib/game/content/generated/meadow-entry-runtime-package.ts
public/game/assets/regions/meadow-entry/*.png
```

Recommended commands:

```text
world:generate:meadow-entry-runtime
world:validate:meadow-entry-runtime
art:storage:meadow-entry-runtime
```

### 8.5 Fingerprints

`controlFingerprint` is exactly HPA-399’s frozen `combinedControlFingerprint`. HPA-406 does not recompute it from a different field set.

`artPackageFingerprint` is SHA-256 over a stable serialization of:

```ts
{
  version: 1,
  combinedControlFingerprint,
  cropManifestSha256,
  masterProvenanceSha256,
  exportProvenanceSha256,
  exports: exports
    .map(({ cropId, plane, path, sha256, bytes, width, height, textureKey, drawOrder }) => ({
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
    .sort(byCropIdThenPlane)
}
```

Including `combinedControlFingerprint` is deliberate: the art-package fingerprint binds the visual approval inventory to the exact control revision that authorized it.

The HPA-514 Story Integration Catalog fingerprint belongs to the Area Expansion Packet and checkpoint evidence. It is not folded into the visual runtime package fingerprint.

### 8.6 Coordinate model

Use existing HPA-399 geometry helpers rather than parallel arithmetic:

- `toRawPixelBounds` for center-based runtime rectangles;
- `rasterizeCoverageBounds` for half-open integer pixel bounds;
- `containsBounds` for inclusive containment;
- approved `Insets` for visual-margin expansion.

For crop descriptor conversion:

```text
width  = right - left
height = bottom - top
x      = left + width / 2
y      = top + height / 2
```

Tests cover:

- integer and half-pixel center conversion;
- a source exactly on a crop edge with zero outward margin;
- positive outward margins that cross an edge and make the crop ineligible;
- consistency with HPA-398 edge-margin coverage behavior.

No region file restates crop coordinates or dimensions manually.

## 9. Runtime asset storage

### 9.1 Source and runtime namespaces

Approved source exports remain under:

```text
artifacts/meadow-entry/hpa-399/exports/*.png
```

Runtime URLs are served from:

```text
public/game/assets/regions/meadow-entry/*.png
```

The generator copies exact approved bytes and verifies SHA-256 equality before atomic publication.

### 9.2 Deliberately split LFS policy

HPA-406 adds an LFS rule for only the new runtime namespace:

```text
public/game/assets/regions/meadow-entry/**/*.png filter=lfs diff=lfs merge=lfs -text
```

The existing sibling files:

```text
public/game/assets/regions/sundrop-village-base.png
public/game/assets/regions/sundrop-village-foreground.png
```

remain under the HPA-398 raw-blob policy. HPA-406 does not rewrite those merged predecessor files merely to make the parent directory uniform.

A future repository-wide regional-asset storage migration requires its own Linear ticket and PR.

### 9.3 Storage verification

The HPA-406 storage command targets only the new `meadow-entry/` runtime namespace and proves:

- source and runtime paths are LFS tracked where required;
- neither HPA-406 runtime path is committed as a raw large blob;
- artifact and runtime bytes have identical SHA-256;
- artifact and runtime LFS pointers have the same content OID;
- every runtime LFS file is materialized before build and e2e execution;
- pointer text is rejected when PNG bytes are expected.

The same command separately confirms that the two HPA-398 files exist as materialized raw PNGs and does not require LFS smudging for them.

Do not use symlinks or hard links. Do not rely on an uncommitted build-time copy.

## 10. Background ordering

### 10.1 Frozen and adapter orders

For HPA-399 crops, `drawOrder` is copied from the frozen crop manifest:

- Sundrop underlay: `0`;
- east forest boundary base: `10`;
- connector crops: `100` through `140`;
- Crossroads and destination regions: `200` through `240`.

The immutable HPA-398 descriptors are not HPA-399 crops. HPA-406 assigns one reviewed adapter value:

```ts
const HPA398_SUNDROP_OVERLAY_DRAW_ORDER = 1_000;
```

Both HPA-398 descriptors use `1_000`, on separate semantic planes. This preserves the frozen seam contract:

- every HPA-399 base crop renders before the HPA-398 base overlay;
- every HPA-399 foreground crop renders before the HPA-398 foreground overlay where they intersect.

No other runtime-only order may be introduced without an explicit reviewed contract amendment.

### 10.2 Uniqueness

The generator rejects duplicate `(plane, drawOrder)` pairs among composed descriptors. Equal depths inside one plane are forbidden because Phaser insertion order would otherwise become an implicit seam-ownership rule.

Descriptors sort by:

1. ascending `drawOrder`;
2. ascending background ID only as a deterministic serialization safeguard.

The second key never resolves a valid tie because same-plane ties are rejected.

### 10.3 Depth calculation

Use existing `MAP_BACKGROUND_DEPTHS` with a bounded semantic offset:

```ts
const BACKGROUND_ORDER_SCALE = 10_000;

type BackgroundDepthInput = Pick<MapBackgroundImage, 'plane' | 'drawOrder'>;

function getMapBackgroundDepth(background: BackgroundDepthInput): number {
  return MAP_BACKGROUND_DEPTHS[background.plane] + background.drawOrder / BACKGROUND_ORDER_SCALE;
}
```

The maximum approved runtime order `1_000` produces an offset of `0.1`:

- base images remain above tile ground at `-10` and below live gameplay objects;
- foreground images remain above the player and below marker depth `1_000` and collision-debug depth `10_000`.

Validation rejects negative orders, non-integers, values above `1_000`, and orders not supplied by the frozen manifest or HPA-398 adapter.

### 10.4 API migration surfaces

Changing `getMapBackgroundDepth(plane)` to descriptor input requires updates to:

- `WorldScene` render call;
- background-ownership unit tests;
- scene tests;
- regional-background diagnostic tests;
- e2e assertions that compare exact recorded depths;
- proof and validation utilities using `MAP_BACKGROUND_DEPTHS`;
- `src/lib/game/content/maps/regions/village-layered.test.ts` authored/composed comparisons;
- any `maps.test.ts` expectations over complete background descriptors.

The authored-background tests continue expecting no `drawOrder`. Production `meadowEntryMap.backgroundImages` expectations add the HPA-398 order and foreground dependency.

`bun run check` plus focused search must show no remaining plane-only helper call.

## 11. Two-phase runtime render algorithm

`WorldScene.renderRegionalBackgrounds` must not depend on input array order for base/foreground dependency resolution.

### 11.1 Pre-render validation

Before creating an image:

- index all descriptors by background ID;
- reject duplicate IDs;
- require every foreground descriptor to declare `dependsOnBackgroundId`;
- require the dependency to exist in the same composed map;
- require the dependency descriptor to use plane `base`;
- require matching crop identity for generated HPA-399 pairs;
- require the HPA-398 foreground to depend on `sundrop-village-base-image`;
- reject cycles and foreground-to-foreground dependencies.

The generator performs equivalent checks before publication, and map validation repeats them after composition.

### 11.2 Disabled mode

When regional backgrounds are disabled:

- every base and foreground descriptor receives `disabled`;
- no image is created;
- no descriptor enters `successfulBackgroundIds`;
- foreground descriptors do not become `blocked-by-base`;
- fallback selection runs against the empty success set.

### 11.3 Phase 1 — bases

When enabled:

1. select all base descriptors;
2. sort by approved order;
3. evaluate missing texture, invalid dimensions, injected render failure, and rendered status;
4. add only rendered base IDs to `successfulBackgroundIds`.

### 11.4 Phase 2 — foregrounds

After every base has a terminal result:

1. select all foreground descriptors;
2. sort by approved order;
3. if `dependsOnBackgroundId` is absent from the success set, emit `blocked-by-base`, do not inspect or create the image, and do not add its ID to the success set;
4. otherwise evaluate missing texture, invalid dimensions, injected render failure, and rendered status normally;
5. add only rendered foreground IDs to `successfulBackgroundIds`.

Extend `RegionalBackgroundRenderStatus` with:

```ts
| 'blocked-by-base'
```

A blocked entry has `observedDimensions: null`, no `renderTransform`, and a reason containing the dependency ID.

### 11.5 Phase 3 — fallback selection

Only after base and foreground phases finish:

1. evaluate blocker, decor, and fence ownership against the final success set;
2. emit selected fallback diagnostics;
3. return the final success set to subsequent render paths.

Fallback visibility is never calculated from a partial success set.

## 12. Generic visual ownership

### 12.1 Map-model changes

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

Converting `MapFenceSegment` from a bare alias to an interface is intentional and source-compatible for existing fence literals.

Use one helper:

```ts
shouldRenderOwnedVisual(
  visual: MapVisualOwnership | undefined,
  successfulBackgroundIds: ReadonlySet<string>
): boolean
```

Blocker, decor, and fence renderers use that helper. Collision remains active regardless of visual ownership.

### 12.2 Generic validation

Expand the validator source:

```ts
type MapBackgroundOwnershipSource = Pick<
  WorldMapDefinition,
  'backgroundImages' | 'blockers' | 'mapDecor' | 'fences'
>;
```

Validate fallback-only entries in all three collections:

- non-empty owner list;
- unique owner IDs;
- owner IDs exist in composed background descriptors;
- unique item IDs inside each collection.

The generic validator does not impose single ownership globally because HPA-398 deliberately has multi-owner entries.

### 12.3 Preserved HPA-398 multi-owner behavior

The HPA-398 Sundrop manifest uses both base and foreground owners for some obstacles. Its existing rule remains:

```ts
renderLive = !ownerBackgroundIds.every((id) => successfulBackgroundIds.has(id));
```

Therefore, for those predecessor entries only, a foreground failure while the base succeeds restores the complete live obstacle. This may overlap surviving base artwork in partial-foreground mode and is recorded as a preserved predecessor risk.

The rule that foreground failure must not restore a complete live obstacle applies only to new HPA-406 single-base-owner entries. Changing HPA-398 behavior requires a separate reviewed ticket or contract amendment.

Fully rendered normal mode remains duplicate-free for predecessor and new entries.

### 12.4 HPA-406 owner selection

Every new HPA-406-generated blocker, decor, or fence fallback entry has exactly one authoritative **base** owner.

Selection is deterministic:

1. convert the source to rasterized visual bounds using shared geometry helpers and frozen margins;
2. collect all approved base crops that fully contain those bounds;
3. choose the containing crop with the highest frozen `drawOrder`;
4. validate overlap and provenance consistency;
5. fail if no containing crop exists.

Primary region does **not** influence the winner. Globally unique same-plane draw order makes a highest-order tie unreachable; duplicate orders are rejected earlier.

Primary-region provenance is a post-selection cross-check:

- at least one fully containing candidate must list the source’s `primaryRegionId`; or
- when the selected higher-order crop does not list it, the selected crop must be `ownerCropId` of an approved overlap with a fully containing primary-region candidate.

If neither condition holds, fail as an HPA-399 ownership/provenance inconsistency.

Overlap consistency:

- if both crops fully contain the required bounds, the selected owner must equal their `ownerCropId`;
- if only one fully contains the bounds, it is the only eligible owner;
- if neither fully contains the bounds, that overlap is irrelevant.

### 12.5 Unresolved ownership

An unresolved or inconsistent baked source is a hard build failure:

- generator exits non-zero;
- no generated module or runtime PNG package is published;
- `--check` and CI fail;
- the source is not silently left live, hidden, or assigned a default owner.

Route an insufficient frozen contract to HPA-399 and an incorrect adapter to HPA-406.

Sources marked `remain-live`, `fallback-tile`, `none`, `control-only`, `protected-live`, or another non-baked disposition are handled exhaustively and never silently hidden.

### 12.6 Live semantic objects

Do not attach generated fallback ownership to:

- buildings and entrances;
- NPCs and ambient NPCs;
- pickups and discoveries;
- encounters and combat bounds;
- transitions;
- stateful or animated gates;
- story-controlled objects.

These remain live and behaviorally unchanged.

## 13. Pure map composition pipeline

Apply generated data at the assembled `meadowEntryMap` boundary. Region fragments remain authoritative and must not be mutated.

The following is the final PR state. Intermediate checkpoint commits may attach cumulative generated descriptor subsets, but no checkpoint selector remains in final code.

```ts
const merged = mergeRegions(fragments);

const existingBackgrounds = applyHpa398RuntimeOrdering(
  merged.backgroundImages,
  {
    drawOrder: HPA398_SUNDROP_OVERLAY_DRAW_ORDER,
    foregroundDependsOn: 'sundrop-village-base-image'
  }
);

const backgroundImages = appendGeneratedBackgrounds(
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

const ownershipSource = { backgroundImages, blockers, mapDecor, fences };

validateMapBackgroundDependencies(ownershipSource);
validateMapBackgroundOwnership(ownershipSource);
validateGeneratedMeadowEntryOwnership(ownershipSource, meadowEntryRuntimePackage);
validateSundropObstacleCoverage(ownershipSource, SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP);
```

Normative behavior:

- generated backgrounds append; they do not replace the HPA-398 pair;
- `applyHpa398RuntimeOrdering` changes only the two predecessor descriptors by adding fixed order and the foreground dependency;
- IDs, texture keys, geometry, planes, and paths remain unchanged;
- the Sundrop underlay is a distinct HPA-399 base crop below the HPA-398 base;
- Sundrop ownership applies before generated ownership;
- generated ownership targeting an already-owned HPA-398 blocker is a hard conflict;
- ownership helpers return new arrays and only clone changed objects;
- region-fragment inputs remain structurally unchanged;
- validators run against final composed arrays;
- final `meadowEntryMap` receives composed `backgroundImages`, `blockers`, `mapDecor`, and `fences`.

Tests prove input immutability, no HPA-398 ownership overwrite, and deterministic output independent of object identity.

## 14. Inventory and runtime load policy

### 14.1 Separate existence from loading

`regionalBackgroundAssetInventory` describes every approved asset that exists. `BootScene` must not directly interpret inventory membership as “load everything now.”

Introduce an explicit plan boundary:

```ts
export type RegionalBackgroundLoadStrategy = 'eager-map' | 'streamed';

export interface RegionalBackgroundLoadPlan {
  strategy: RegionalBackgroundLoadStrategy;
  assetIds: readonly string[];
  estimatedCompressedBytes: number;
  estimatedDecodedRgbaBytes: number;
  reason: string;
}

buildRegionalBackgroundLoadPlan({
  map,
  inventory,
  strategy
}): RegionalBackgroundLoadPlan;
```

`BootScene` queues only assets in the returned plan. Loader diagnostics record both inventory size and planned load size.

HPA-406 must implement the plan boundary even if the accepted final strategy is `eager-map`. This prevents the generated inventory, diagnostics, and ownership contracts from being coupled to one loading policy.

A `streamed` strategy is a supported type-level extension point, not implementation scope unless the safety gate rejects eager loading.

### 14.2 Full-inventory facts

The 22 HPA-496 exports contain:

```text
compressed PNG bytes: 109,509,947 bytes (104.44 MiB)
pixels: 98,893,824
decoded RGBA estimate: 395,575,296 bytes (377.25 MiB)
```

The existing HPA-398 pair adds another 21.00 MiB of decoded RGBA by dimensions, for an approximate combined decoded texture payload of **398.25 MiB**, before mipmaps, driver overhead, copies, or unrelated game textures.

These are deterministic inventory estimates and must be generated from approval metadata rather than copied as unchecked constants.

### 14.3 Checkpoint 1 load-safety gate

Checkpoint 1 generates and validates the full inventory, even though only the first cumulative map subset may be attached at that commit.

It must also run a dedicated full-inventory load probe and record:

- total compressed bytes;
- decoded RGBA estimate;
- largest texture dimensions;
- renderer type and queried `MAX_TEXTURE_SIZE` where available;
- queued and completed asset count;
- load/decode interval;
- boot-to-world-ready interval;
- loader errors;
- WebGL context-loss or out-of-memory symptoms;
- observable memory/residency signals where the platform exposes them;
- reference hardware/browser/build details.

The safety gate is not HPA-411’s final performance budget. It answers whether eager full-map loading is technically safe enough to continue the integration architecture.

Eager loading may be accepted only when:

- every texture fits the renderer limit;
- the complete probe reaches a playable world without loader failure, context loss, crash, or unrecoverable allocation failure;
- boot/load evidence is reviewed and explicitly accepts the eager policy for HPA-406;
- residual device risk is documented for HPA-411.

Do not invent an arbitrary millisecond or VRAM budget in HPA-406. HPA-411 owns final cross-build and hardware performance thresholds.

If the safety gate rejects eager loading:

1. stop Checkpoint 2;
2. create a dedicated Linear ticket and one PR for camera/crop-aware load and unload architecture;
3. make HPA-406 blocked by that ticket;
4. retain the HPA-406 inventory, IDs, descriptors, ownership, and diagnostics contracts;
5. resume HPA-406 only after a `streamed` load plan is available.

This avoids discovering an architectural boot failure only after full regional integration.

### 14.4 Checkpoint and final load behavior

During intermediate checkpoint commits:

- full inventory generation and validation are complete;
- the composed map may contain only the cumulative checkpoint descriptors;
- `eager-map` loads only assets referenced by the current composed map;
- a separate full-inventory probe exercises all approved assets for the safety gate.

In the final HPA-406 state:

- all approved descriptors are attached;
- no checkpoint flag remains;
- `eager-map` loads the complete map inventory only if Checkpoint 1 explicitly approved it;
- otherwise the prerequisite streaming ticket supplies the accepted `streamed` strategy.

## 15. Preload, diagnostics, and e2e migration

### 15.1 Boot integration

`BootScene` consumes `RegionalBackgroundLoadPlan`, not the complete inventory directly.

When regional backgrounds are disabled, the plan contains zero asset IDs and no regional images are queued.

When enabled, completion expectations derive from the plan:

```ts
expectedRegionalBackgroundLoadCompletions = loadPlan.assetIds.length;
```

Tests must not hard-code predecessor count `2` or assume inventory size equals load count.

### 15.2 Renderer diagnostic additions

Renderer-load diagnostics add:

- inventory asset count;
- planned asset count;
- estimated compressed bytes;
- estimated decoded RGBA bytes;
- load strategy;
- completion count.

Plane-render diagnostics preserve blocker fields and add:

```ts
selectedFallbackDecorIds?: readonly string[];
selectedFallbackFenceIds?: readonly string[];
selectedFallbackFenceSegmentCount?: number;
```

Decor has no segment count because each decor entry renders as one authored object/tile operation. Fence count uses the same concrete tiling calculation as the fence renderer.

Diagnostics and e2e tests verify all three fallback collections after the final two-phase success set is known.

### 15.3 LFS materialization gate

Before build or Playwright in CI:

- Git LFS is installed;
- `public/game/assets/regions/meadow-entry/**/*.png` is smudged/materialized;
- the storage verifier rejects pointer text as PNG bytes;
- a runtime canary is checked before `bun run build` and `bun run test:e2e`;
- predecessor raw Sundrop files are checked independently.

## 16. Internal checkpoint sequence

### 16.1 Checkpoint 1 — Crossroads, connectors, and load-safety proof

Implement:

- full inventory generation and validation;
- authored/composed background type split;
- stable IDs and unified asset type;
- load-plan boundary and full-inventory safety probe;
- constrained ordering and depth migration;
- two-phase render algorithm;
- generic ownership and diagnostics;
- pure map composition.

Attach cumulatively:

- Sundrop underlay;
- Village–Crossroads connector;
- Crossroads–Coast connector;
- Crossroads–Mistfen connector;
- Crossroads–Silverpine connector;
- Crossroads–Wildwood connector;
- Crossroads.

Acceptance:

- Village ↔ Crossroads traversal succeeds in both directions;
- every connector mouth renders correctly in enabled and fallback modes;
- overlap owner ordering matches the manifest;
- both HPA-398 overlays render above all HPA-399 crops;
- castle and story gates remain live;
- no former Sundrop boundary quality jump remains;
- full-inventory load-safety evidence produces an explicit eager/streaming decision;
- all three HPA-495 outdoor skills are exercised and recorded.

### 16.2 Checkpoint 2 — Tidewatch Coast and Silverpine

Proceed only after the load-safety gate has an accepted strategy.

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

No new renderer architecture is added here unless a documented failing HPA-495 regression scenario proves the shared design insufficient.

### 16.3 Checkpoint 3 — Mistfen and Wildwood

Integrate Mistfen, Wildwood, and east forest boundary crop.

Mistfen acceptance:

- marsh, pool, reed, root, deadfall, fog-ground, and silhouette layers align;
- hidden collision remains forgiving through narrow passages;
- Witchwood Gate, side pocket, rewards, discoveries, NPCs, and state changes remain live.

Wildwood acceptance:

- forest floor, tree/root boundaries, brush, side clearing, combat framing, cave approach, and canopy align;
- enemies, pickups, routes, and Cave transition remain readable beneath foreground;
- combat movement, aggro, leash, and bounds behave unchanged.

At Checkpoint 3 completion, coverage validation reports zero unintegrated approved non-village crops.

## 17. Validation architecture

### 17.1 Generated-package tests

Prove:

- every runtime export matches HPA-496 approval;
- stable ID/key/path mapping is exact;
- crop bounds convert to exact center coordinates;
- dimensions, planes, filenames, and manifest orders match frozen inputs;
- HPA-398 overlays use only order `1_000`;
- every runtime asset has exactly one descriptor;
- full inventory byte/pixel estimates match approval metadata;
- generated output is byte-deterministic;
- stale files fail `--check`;
- unsupported versions fail closed;
- control and art-package fingerprints match definitions.

### 17.2 Ownership tests

Prove:

- every blocker/decor/fence fallback requirement resolves;
- non-baked requirements are explicit;
- every new HPA-406 source has exactly one base owner;
- highest-order full containment determines ownership;
- primary-region provenance cross-checks pass;
- HPA-398 multi-owner entries remain valid;
- no new source points to a foreground owner;
- neighboring failure does not restore unrelated visuals;
- protected-live and semantic objects remain live;
- visual suppression never changes collision;
- ambiguous or inconsistent ownership fails before publication.

### 17.3 Scene and renderer tests

Cover:

- descriptor-based depth calculation;
- unique same-plane order;
- overlap owner ordering;
- HPA-398 overlay ordering;
- all bases evaluated before foregrounds;
- `blocked-by-base` status and success-set exclusion;
- valid-base/invalid-foreground behavior;
- blocker, decor, and fence fallback through the shared helper;
- HPA-398 partial-foreground predecessor behavior;
- collision invariance.

### 17.4 Map and type migration tests

Cover:

- authored Sundrop descriptors remain unordered at fragment level;
- composed Sundrop descriptors receive order and dependency;
- `village-layered.test.ts` authored exact equality remains valid;
- production map expectations include composed fields;
- fragment inputs remain unchanged;
- all connector mouths and route samples remain clear;
- representative transition, gate, combat, and save positions remain valid.

### 17.5 Load-plan and e2e tests

Cover:

- combined inventory shape and approval metadata;
- disabled plan queues zero;
- enabled completion count equals plan length;
- checkpoint subset and final map plans select referenced assets deterministically;
- full-inventory probe queues every approved asset;
- load diagnostics report inventory and planned estimates;
- LFS pointer text is rejected;
- eager safety evidence is reproducible.

## 18. Evidence policy

### 18.1 Mandatory region matrix

For every included region/crop group, capture the Linear-required visual modes:

- enabled;
- disabled;
- missing;
- invalid;
- partial foreground;
- collision overlay.

These captures prove local visual behavior and seam ownership.

### 18.2 Representative checkpoint scenarios

For each checkpoint, require at least one representative scenario for:

- injected base render failure;
- injected foreground render failure;
- `blocked-by-base`;
- save/reload;
- continuous controller traversal.

Do not multiply every synthetic failure across every crop unless a defect indicates wider sampling is needed.

### 18.3 Checkpoint 1 load evidence

Additionally record the full-inventory safety probe and explicit load-strategy decision.

Evidence layout:

```text
docs/superpowers/reports/hpa-406/
  checkpoint-1-crossroads-connectors.md
  checkpoint-1-load-safety.json
  checkpoint-2-coast-silverpine.md
  checkpoint-3-mistfen-wildwood.md
  defects.json
  checkpoint-1/
  checkpoint-2/
  checkpoint-3/
```

Each checkpoint report records:

- Area Expansion Packet and approval;
- HPA-514 fingerprint and references;
- HPA-399 control fingerprint;
- HPA-496 art-package fingerprint and paths;
- skills loaded and why;
- commands and manifests consumed;
- human visual approvals;
- skill gaps, rationalizations, and deviations;
- provenance and asset locations;
- upstream defect routing;
- residual risks.

## 19. Defect routing

- crop, overlap, route mouth, ownership, or geometry defect → HPA-399 amendment;
- pixels, alpha, lighting, material continuity, export, hash, provenance, or inventory defect → HPA-496 correction;
- story, character, location, gate, spoiler, or audio mismatch → HPA-514 correction;
- reusable skill gap while HPA-495 is open → failing scenario and correction in the single HPA-495 PR;
- reusable skill gap after HPA-495 merges → new Linear ticket and PR;
- eager load-safety rejection → new load/streaming architecture ticket and PR, blocking HPA-406;
- runtime registration, composition, ordering, ownership application, diagnostics, storage publication, or walkthrough defect → HPA-406.

No region-specific exception bypasses this routing.

## 20. Command gate

The final HPA-406 PR must pass:

```bash
bun run world:validate:meadow-entry-runtime
bun run art:validate:meadow-entry
bun run art:storage:meadow-entry-runtime
bun run test
bun run check
bun run lint
bun run build
bun run build:tauri
```

`build:tauri` transitively runs strict story freshness and frontend-prose checks.

If any Rust or Cargo file changes, also run:

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

The PR also passes focused asset-integrity, load-safety, storage/LFS, scene, save, skill-regression, and walkthrough gates.

HPA-411 retains final whole-map performance, packaged desktop, and hardware acceptance.

## 21. Risks and mitigations

### Eager texture residency

The approved exports estimate about 377.25 MiB decoded RGBA, about 398.25 MiB including the HPA-398 pair before overhead. Inventory and load policy are separated, and Checkpoint 1 must approve eager loading or trigger a streaming prerequisite.

### Frozen Sundrop seam order

Use one adapter order `1_000` and validate it above all HPA-399 crops on both planes.

### Fragment/composed type confusion

Use separate authored and composed background types with an explicit widening step.

### Owner-selection contradiction

Containment plus highest frozen order is the sole selector. Primary region is validation-only.

### Duplicate live restoration

Use one base owner for new HPA-406 entries while preserving reviewed HPA-398 multi-owner behavior.

### Accidental insertion-order seams

Reject duplicate same-plane order and test every overlap owner.

### Floating foregrounds

Evaluate all bases first and emit `blocked-by-base` for dependent foregrounds.

### Split asset storage policy

LFS-track only the new HPA-406 namespace and explicitly preserve raw predecessor siblings.

### Hidden semantic changes

Keep semantic objects live and compare IDs, collision, routes, state, and saves.

### Hidden manual workflow knowledge

Execute checkpoints through HPA-495 and close reusable gaps through documented regression scenarios.

## 22. Acceptance criteria

HPA-406 is complete when:

- exactly one HPA-406 PR contains all work;
- the full approved inventory is generated, validated, and stored deterministically;
- runtime loading occurs through an explicit accepted load plan rather than direct inventory iteration;
- Checkpoint 1 records the complete inventory’s compressed size, decoded estimate, load/decode behavior, renderer limits, and explicit eager/streaming decision;
- if eager loading is rejected, the required streaming ticket is completed before HPA-406 proceeds;
- every approved non-village descriptor is attached by final state;
- stable IDs, URLs, bytes, dimensions, hashes, texture keys, manifest order, control fingerprint, and art-package fingerprint match approved inputs;
- every HPA-399 crop renders below the HPA-398 overlay on its plane;
- all overlaps follow approved owner ordering;
- no seam, hole, double-darkening, collision drift, invisible obstacle, duplicate normal-mode live art, or abrupt fallback-quality shift remains;
- foreground failure does not restore full live visuals for new HPA-406 single-base-owner entries;
- preserved HPA-398 partial-foreground behavior is documented and tested;
- buildings, NPCs, pickups, discoveries, encounters, combat bounds, transitions, gates, and stateful content behave unchanged;
- every new baked blocker/decor/fence requirement has one authoritative base owner;
- unresolved ownership fails before partial publication;
- HPA-406 artifact/runtime files are byte-identical, LFS tracked, and share content OIDs;
- predecessor raw Sundrop assets remain valid and materialized;
- mandatory region captures and representative checkpoint failure/save/traversal evidence exist;
- continuous traversal succeeds from Village through Crossroads to every destination and back;
- each checkpoint consumes current HPA-514 and HPA-495 outputs;
- reusable skill gaps are resolved through documented scenarios;
- the full command gate passes;
- HPA-411 can begin without additional regional integration or load-policy ambiguity.
