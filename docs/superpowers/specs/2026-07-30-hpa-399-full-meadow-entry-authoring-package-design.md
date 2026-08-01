# HPA-399 Full Meadow-Entry Authoring Package — Design

> Issue: HPA-399, “Produce the full meadow-entry control master, visual master, and regional exports.”
>
> Baseline: `main` at `3f16a17b2adbe25d9271ff4bc000b24d4cdf6beb`, including merged HPA-398 / PR #16.
>
> Delivery: PR #17 is **PR 0 — design lock**. Implementation PR 1 locks source-derived controls, exact crop/overlap/coverage tables, authoring ownership, and binary storage. Implementation PR 2 adds the approved visual masters and deterministic exports through that storage contract. HPA-399 never registers or integrates non-village exports at runtime.

## Problem

HPA-398 established reusable base and foreground background planes, collision-preserving blocker fallbacks, exact render diagnostics, and a complete Sundrop Village obstacle proof. HPA-399 must now produce the authoring package that lets HPA-406 integrate the rest of `meadow-entry` without independently designing or generating disconnected regions.

The map is `200×200` tiles at `32px`, so its world-space authoring canvas is exactly `6400×6400` pixels. The live composed map remains authoritative for gameplay, but it is not sufficient as a full-map art source:

- `mergeRegions(...)` preserves object geometry but discards semantic source-region ownership;
- non-village static visuals are split across `groundPatches`, `blockers`, `mapDecor`, and `fences`;
- HPA-398 runtime ownership exists only for `MapBlocker`, while many trees, reeds, rocks, deadfall, canopies, fog volumes, walls, and environmental props are `MapDecor`;
- building exteriors and major gates are live semantic visuals and must not be baked accidentally;
- Sundrop Village already has approved HPA-398 base and foreground bytes, fingerprints, and evidence that must remain immutable;
- direct per-region production would allow lighting, palette, route alignment, and overlap pixels to drift;
- the repository has no `.gitattributes` Git LFS contract and does not ignore `artifacts/`, so repeatedly committing regenerated masters through ordinary Git would permanently multiply binary history;
- existing HPA-307/HPA-398 raster evidence already demonstrates that ordinary-Git image history grows materially even for a small fraction of the map.

HPA-399 therefore needs a deterministic authoring layer above the live map, not a second gameplay map and not an expansion of the runtime renderer.

## Approved decisions

1. Use a global-master-first workflow with one canonical `6400×6400` base master and one canonical `6400×6400` sparse foreground master.
2. Allow regional refinement only as source-masked edits applied back to the canonical masters.
3. Never accept an independently produced regional master and never directly retouch a runtime crop.
4. Keep HPA-399 authoring-only. Runtime registration, descriptor insertion, and non-village live-visual suppression remain HPA-406 work.
5. Preserve the approved HPA-398 Sundrop base and foreground files byte-for-byte as immutable predecessor overlays.
6. Produce a Sundrop underlay from the global base master so the existing feathered HPA-398 base blends into the new world without changing its bytes.
7. Restore semantic provenance through explicit authoring-region and bake-disposition registries rather than bounding-box inference.
8. Use half-open world rectangles, coverage-preserving integer mask bounds, and `32px`-aligned crop edges.
9. Define `MEADOW_ENTRY_MIN_HANDOFF_PX = 128` as the shared handoff-overlap contract.
10. Treat `sundrop-village-underlay` as a deliberate exact-bounds crop exception; it is not expanded by the handoff margin.
11. Require implementation PR 1 to commit and review the complete exact crop, overlap, runtime-coverage, route-mouth, and corner tables before any master work starts.
12. Do not require runtime crops to tile all `6400×6400` pixels blindly. Instead, require every baked source and every declared baked-runtime coverage area to be covered by at least one crop; every intentionally uncovered area must be explicitly classified as fallback-tile territory.
13. Generate every HPA-399 export from approved master bytes through one deterministic exporter.
14. Keep unintegrated exports outside `public/`; HPA-406 promotes or materializes exact approved bytes into runtime paths.
15. Make binary-storage selection and native-proof storage a hard gate before PR 2. Git LFS is preferred; content-addressed external storage is supported; ordinary Git requires an explicit history-cost exception.
16. Treat Git LFS as an actual bootstrap and CI contract, not a `.gitattributes` line alone.
17. Preserve all HPA-307 and HPA-398 tools, inventories, fingerprints, reports, and evidence directories unless a separate migration is approved.

## Goals

- Generate a complete reviewable full-map control package from live map sources.
- Preserve one exact world-to-pixel coordinate system across controls, masters, crops, and runtime integration.
- Restore semantic region provenance lost during composition.
- Classify every visual-capable source as baked, foreground-eligible, protected live, runtime-fallback-only, or control-only.
- Produce one coherent base material system and one coherent foreground occlusion system.
- Preserve continuous roads, terrain transitions, connector mouths, and overlap pixels.
- Provide HPA-406 with immutable, fingerprinted, directly consumable exports and explicit ownership obligations.
- Fail fast when gameplay geometry, source files, crop contracts, predecessor assets, storage configuration, or approved art bytes drift.
- Keep buildings, NPCs, pickups, transitions, encounters, discoveries, story gates, and stateful or animated objects live.
- Preserve hidden authoritative collision; no collision is derived from raster pixels.
- Prevent silent gaps where a source is declared baked but no runtime export contains it.

## Non-goals

- No runtime registration or rendering integration for Crossroads, connectors, Coast, Mistfen, Silverpine, or Wildwood.
- No `WorldScene` ownership extension for `MapDecor` or fences inside HPA-399.
- No gameplay route, collision, encounter, transition, reward, or room-graph redesign.
- No replacement or regeneration of HPA-398 Sundrop assets.
- No baking of building exteriors, gates, NPCs, pickups, transitions, encounters, discoveries, quest objects, stateful objects, or animated objects.
- No independent regional art masters.
- No interior artwork.
- No day/night, weather, seasonal, parallax, or animated baked variants.
- No PNG pixels as semantic or collision truth.
- No final whole-map runtime, traversal, fallback, GPU, or save acceptance; HPA-406 and HPA-411 own those gates.

The `MapDecor`/fence non-goal is a delivery boundary, not a claim that no runtime work is needed. Any HPA-399 bake disposition that replaces a live `MapDecor` or fence visual creates an explicit HPA-406 obligation to add equivalent suppression and fallback ownership. If HPA-406 cannot support that contract, implementation PR 1 must classify the source as `protected-live` before art production.

## Authoritative sources and rendering order

The following remain gameplay truth:

- `src/lib/game/content/maps/meadow-entry.ts` — final composition, inline `meadowBoundsRegion`, and the `6400×6400` world contract;
- `meadowBoundsRegion` inside `meadow-entry.ts` — all four world-edge blockers plus `sundrop-southwest-ocean-patch` and its ocean blocker;
- `src/lib/game/content/maps/regions/*.ts` — Coast, Crossroads, Mistfen, Paths, Silverpine, Village, and Wildwood source fragments;
- `src/lib/game/content/maps/regions/village-layered.ts` and `compileLayeredRegion(...)` — Sundrop authored geometry;
- `collectStrictCollisionRects(...)`, `collectLandmarkRects(...)`, and doorway carving in `save-state.ts` — movement/save-aligned collision and protected-building geometry;
- `PLAYER_COLLISION_RADIUS` — movement-clearance expansion;
- HPA-398 ownership, controls, approvals, provenance, and production assets — approved Sundrop behavior.

Runtime rendering order is:

| Layer/pass | Depth/order |
| --- | --- |
| Fallback tilemap ground | depth `-10` |
| Baked base images | depth `-9` |
| Ordinary live sprites/world objects | default depth `0` |
| Player | default depth `0`, created before the live-foreground decor pass |
| Live `MapDecor` with `depth: 'foreground'` | still Phaser depth `0`, rendered after the player by insertion order |
| Baked foreground images | depth `100` |
| Existing discovery markers | depth `1_000` |
| Collision debug overlay | depth `10_000` |

“Live world `0`” never describes the fallback tilemap layer. Live foreground decor is not a separate numeric plane: it remains at depth `0` and relies on insertion order. Consequently, protected-live foreground decor would render below baked foreground depth `100`. HPA-399 must subtract the full protected-live foreground-decor footprint from the baked foreground-eligible mask unless HPA-406 explicitly changes that runtime relationship.

Discovery markers remain depth-backed above baked foreground, but foreground masks must still preserve discovery, reward, and interaction readability rather than relying on depth alone.

The HPA-399 authoring registry adds provenance and visual-production intent. It never replaces gameplay data.

## Coordinate and rasterization contract

```text
world bounds: 0 ≤ x < 6400 and 0 ≤ y < 6400
origin: top-left
+x: right
+y: down
scale: 1 world pixel = 1 master pixel
tile size: 32px
```

Runtime rectangles remain center-based. Authoring and crop manifests serialize half-open edge bounds:

```ts
interface PixelBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
```

A valid half-open rectangle obeys:

```text
0 ≤ left < right ≤ 6400
0 ≤ top < bottom ≤ 6400
```

A right or bottom edge of `6400` is valid and is required to cover the final pixel column or row.

Raw source conversion is exact and may produce half-pixels:

```text
rawLeft   = x - width / 2
rawTop    = y - height / 2
rawRight  = x + width / 2
rawBottom = y + height / 2
```

Control-mask rasterization uses coverage-preserving integerization:

```text
pixelLeft   = floor(rawLeft)
pixelTop    = floor(rawTop)
pixelRight  = ceil(rawRight)
pixelBottom = ceil(rawBottom)
```

The resulting integer bounds remain half-open. This preserves every touched source pixel and prevents odd-size rectangles from losing a half-pixel edge. Manifests record both raw edge values and integer raster bounds so reviewers can distinguish source geometry from raster expansion. Margin expansion is applied to raw bounds before `floor`/`ceil`; clipping occurs only where a contract explicitly allows it.

Crop rectangles follow a different contract: their final edges must be integers, multiples of `32`, positive in area, and satisfy the half-open world inequalities above.

For every exported pixel:

```text
masterX = crop.left + localX
masterY = crop.top + localY
```

No resampling, rotation, perspective transform, non-uniform scale, color correction, sharpening, or crop-local retouch is allowed during export. Runtime PNGs are direct decoded-pixel crops followed only by deterministic PNG encoding.

## Authoring-region registry

Add:

```text
src/lib/game/content/backgrounds/meadow-entry-authoring-layout.ts
```

```ts
type MeadowEntryAuthoringRegionId =
  | 'sundrop-village'
  | 'crossroads'
  | 'tidewatch-coast'
  | 'mistfen'
  | 'silverpine'
  | 'wildwood'
  | 'connector-village-crossroads'
  | 'connector-crossroads-coast'
  | 'connector-crossroads-mistfen'
  | 'connector-crossroads-silverpine'
  | 'connector-crossroads-wildwood'
  | 'outer-boundary';

interface MeadowEntryAuthoringRegion {
  id: MeadowEntryAuthoringRegionId;
  sourceRefs: readonly MeadowEntrySourceRef[];
  reviewBounds: PixelBounds;
  materialProfile: MeadowEntryMaterialProfileId;
  neighbors: readonly MeadowEntryAuthoringRegionId[];
}
```

A source reference identifies an exact live item:

```ts
type MeadowEntrySourceRef =
  | { sourceType: 'ground-patch'; sourceId: string }
  | { sourceType: 'blocker'; sourceId: string }
  | { sourceType: 'decor'; sourceId: string }
  | { sourceType: 'fence'; sourceId: string }
  | { sourceType: 'landmark'; sourceId: string }
  | { sourceType: 'transition'; sourceId: string }
  | { sourceType: 'npc'; sourceId: string }
  | { sourceType: 'ambient-npc'; sourceId: string }
  | { sourceType: 'pickup'; sourceId: string }
  | { sourceType: 'encounter'; sourceId: string }
  | { sourceType: 'combat-bounds'; sourceId: string }
  | { sourceType: 'discovery'; sourceId: string };
```

### Hand-authored partitions, not computed fragment envelopes

`reviewBounds` are explicit hand-authored spatial partitions. They are **not** computed from the union of every source rectangle in a fragment. Source files frequently contain cross-region roads or visual outliers whose raw bounding box is much larger than the intended visual region.

General crop derivation starts from declared `reviewBounds` and explicit coverage attachments, never from an unfiltered fragment bounding box.

Each source must satisfy exactly one of these:

1. its rasterized bounds are contained by its primary region’s `reviewBounds`;
2. it declares explicit `crossRegionCoverage` bounds and secondary review regions;
3. it is split into checked-in coverage sub-bounds for authoring controls without changing gameplay geometry;
4. it is re-owned to the appropriate connector or region;
5. it is classified `runtime-fallback-only` or `control-only` with a reviewed reason.

Implementation PR 1 must run a cross-region-outlier audit. `sundrop-forest-road-east` in `wildwood.ts` is a mandatory reviewed example: its large geometry must not inflate the Wildwood crop by raw source-envelope inference.

Rules:

- every reference resolves against assembled `meadowEntryMap`;
- every resolved source has exactly one primary authoring region;
- secondary endpoint/handoff review membership never changes primary ownership;
- connectors are explicit, never inferred by nearest-region heuristics;
- checked-in `reviewBounds` are `32px` aligned and fingerprinted;
- `outer-boundary` owns map-edge controls and fallback/baked coverage decisions but has no implicit runtime export;
- any required outer-boundary export is added explicitly by PR 1 as a base-only `outer-boundary-*` crop.

### `pathsRegion` primary ownership

Sources authored in `paths.ts` primary-own to explicit connector regions, not to endpoint regions:

| `pathsRegion` source | Primary authoring region |
| --- | --- |
| `link-village-crossroads`, `link-village-crossroads-v`, `village-crossroads-nook`, every `corridor-wall-*`, `village-corridor-waymarker` | `connector-village-crossroads` |
| `link-crossroads-coast`, `link-crossroads-coast-v` | `connector-crossroads-coast` |
| `link-crossroads-mistfen`, `link-crossroads-mistfen-h` | `connector-crossroads-mistfen` |
| `link-crossroads-silverpine` | `connector-crossroads-silverpine` |
| `link-crossroads-wildwood` | `connector-crossroads-wildwood` |

The registry stores exact IDs, not prefix inference. Endpoint regions may include these sources only as secondary handoff-review members. Completeness validation rejects duplicate primary ownership and missing `pathsRegion` assignments.

## Bake-disposition and HPA-406 consumer contract

Add:

```text
src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts
```

```ts
type MeadowEntryBakeDisposition =
  | { mode: 'base-underlay' }
  | { mode: 'base-static'; margins: Insets; motif: string }
  | {
      mode: 'base-and-foreground';
      baseMargins: Insets;
      foregroundMargins: Insets;
      frontCutoffPx: number;
      motif: string;
    }
  | { mode: 'protected-live'; protectionMargins: Insets; reason: string }
  | { mode: 'runtime-fallback-only'; reason: string }
  | { mode: 'control-only'; reason: string };
```

Each entry contains an exact source reference, source type, primary region, and HPA-406 runtime obligation:

```ts
type MeadowEntryRuntimeOwnershipRequirement =
  | 'existing-blocker-fallback'
  | 'extend-decor-fallback'
  | 'extend-fence-fallback'
  | 'remain-live'
  | 'fallback-tile'
  | 'none';
```

Strict policies:

- every `groundPatch` must be explicitly `base-underlay` or `runtime-fallback-only`; there is no implicit default;
- ordinary regional roads and terrain intent should normally be `base-underlay`;
- outer-boundary or unreachable-margin patches may be `runtime-fallback-only` only with explicit visual review and coverage evidence;
- `sundrop-southwest-ocean-patch` must be covered by a base crop or explicitly approved as runtime fallback; it may not disappear from completeness checks;
- landmarks and doorway approaches are `protected-live`;
- transitions, NPCs, ambient NPCs, pickups, encounters, combat bounds, and discoveries are explicitly `protected-live` or `control-only`;
- combat bounds and discoveries are not visual bake candidates, but receive explicit `control-only` dispositions so completeness validation proves intentional handling;
- major buildings, shrines, caves, castle elements, and story gates remain `protected-live`;
- a blocker, fence, or decor item may be baked only through an explicit registry entry;
- colliding decor may be baked visually while collision remains live;
- low-profile non-colliding decor may enter base;
- canopies, hedge tops, wall fronts, arches, tall reeds, and approved branches may use `base-and-foreground`;
- every baked blocker must map to the existing HPA-398 fallback model or an explicit HPA-406 blocker obligation;
- every baked decor/fence entry must declare `extend-decor-fallback` or `extend-fence-fallback` for HPA-406;
- if the runtime obligation is rejected or cannot preserve visible fallback on disabled, missing, invalid, or failed assets, PR 1 reclassifies the source `protected-live` before approval;
- protected-live foreground decor footprints are subtracted from the baked foreground mask;
- omission is an error, not an implicit live or baked default.

### Foreground cutoff

Use one shared derivation rather than per-region literals:

```ts
export const MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX =
  getActorAnimationAsset('hero').displaySize.height / 2 - PLAYER_COLLISION_RADIUS;
```

Implementation PR 1 asserts this equals `SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX`; at the baseline both resolve to `33px`. A bake entry may use a smaller conservative cutoff only through an explicit reviewed exception. It may never silently exceed the shared value.

HPA-399 uses the registry to generate controls and masks. HPA-406 consumes the same fingerprinted dispositions when implementing suppression/fallback; it does not invent a second ownership list.

## Fingerprinting

The control package records three SHA-256 fingerprints.

### Gameplay source fingerprint

Canonicalize and hash:

- map dimensions and spawn;
- inline `meadowBoundsRegion` sources;
- ground patches;
- blockers, including HPA-398 visual ownership;
- decor and decor collision;
- fences;
- landmarks and carved entrances;
- transitions;
- NPCs and ambient NPCs;
- pickups;
- encounters and combat bounds;
- discoveries;
- player collision radius and shared foreground cutoff inputs;
- source hashes for region and collision-helper files.

Collections sort by source type and ID, so authoring order alone does not change the fingerprint.

### Authoring contract fingerprint

Canonicalize and hash:

- authoring-region registry and explicit `pathsRegion` mapping;
- cross-region-outlier declarations;
- bake-disposition and runtime-obligation registry;
- runtime baked-versus-fallback coverage table;
- exact crop and overlap registries;
- overlap ownership and draw order;
- filename and texture-key conventions;
- `MEADOW_ENTRY_MIN_HANDOFF_PX`;
- material profiles;
- rasterization and mask constants;
- binary-storage and proof-storage modes and configuration;
- master, per-crop, and aggregate budget formulas;
- master dimensions and alpha policies.

### Combined control fingerprint

Hash both fingerprints plus immutable predecessor inputs:

- approved HPA-398 control fingerprint;
- approved HPA-398 base SHA-256;
- approved HPA-398 foreground SHA-256;
- required historical HPA-307 artifact hashes.

Any drift blocks finalization and export.

## Full-map control package

Add:

```sh
bun run art:controls:meadow-entry
```

It writes only this fixed ordinary-Git inventory under `docs/superpowers/reports/img/hpa-399/controls/`:

```text
meadow-entry-control-manifest.json
meadow-entry-composite-control.svg
meadow-entry-terrain-path-mask.svg
meadow-entry-region-mask.svg
meadow-entry-collision-mask.svg
meadow-entry-building-footprint-mask.svg
meadow-entry-entrance-transition-mask.svg
meadow-entry-encounter-combat-mask.svg
meadow-entry-reward-discovery-mask.svg
meadow-entry-semantic-anchor-mask.svg
meadow-entry-protected-live-mask.svg
meadow-entry-forbidden-tall-mask.svg
meadow-entry-foreground-eligible-mask.svg
meadow-entry-handoff-mask.svg
meadow-entry-runtime-base-coverage-mask.svg
meadow-entry-runtime-fallback-coverage-mask.svg
meadow-entry-bake-ownership.json
meadow-entry-crop-manifest.json
```

All SVGs use `viewBox="0 0 6400 6400"`. These controls remain compact vector/JSON evidence; native raster proofs follow the binary-proof contract below.

### Terrain and paths

Derive from every `groundPatch`, preserving tile/material identity, primary region, connector membership, disposition, and contributing source IDs.

### Collision

Use the same strict and landmark collectors as save normalization, expanded by `PLAYER_COLLISION_RADIUS`. Include blockers, fences, decor collision, and doorway-carved landmark geometry. Apply the shared raw-edge and floor/ceil rasterization contract. The mask is alignment control only; runtime collision remains live.

### Buildings and entrances

Protect landmark footprints. Combine doorway carving with transition-approach clearances. Foundation/contact shadows may enter explicit shallow margins but cannot paint walls, doors, stairs, thresholds, blockers, or false entrances.

### Encounters, rewards, and anchors

Show encounter anchors, combat rectangles, spawn, NPCs, pickups, discoveries, transitions, landmarks, and major live decor. Protected extents come from one shared source module rather than renderer-local constants.

### Forbidden tall and foreground eligible

`forbidden-tall` conservatively covers:

- all walkable space;
- player-radius-expanded routes;
- transition and doorway approaches;
- NPC, pickup, encounter, discovery, and reward clearances;
- live object footprints;
- protected-live foreground-decor footprints;
- region-specific visibility corridors.

`foreground-eligible` comes only from explicit `base-and-foreground` entries after subtracting protected-live geometry. Foreground pixels outside the mask are forbidden. Discovery markers render above foreground, but their full approach/readability areas remain excluded from foreground paint.

### Runtime base coverage

The full base master is opaque across all `6400×6400` pixels, but the runtime crop union is not assumed to tile the full world automatically.

Implementation PR 1 must publish a `MEADOW_ENTRY_RUNTIME_COVERAGE` table that partitions relevant world space into:

```ts
type MeadowEntryRuntimeCoverage =
  | { mode: 'baked'; bounds: PixelBounds; cropIds: readonly MeadowEntryCropId[] }
  | { mode: 'fallback-tile'; bounds: PixelBounds; reason: string };
```

Requirements:

- every `base-underlay`, `base-static`, or `base-and-foreground` source extent is contained by the union of named base crops;
- every declared authoring-region `reviewBounds` pixel intended to use baked art is contained by the base-crop union;
- every intentionally uncovered pixel is represented in the fallback coverage mask with a reason;
- no source may be declared baked while falling only in fallback coverage;
- no runtime gap is accepted merely because the master contains paint there;
- `outer-boundary` may remain fallback tile where deliberately unreachable or visually irrelevant, but any camera-visible/reviewed edge area must be assigned baked coverage or explicitly accepted as fallback;
- PR 1 may add explicit base-only `outer-boundary-*` crops when needed to close source or edge coverage.

The control report includes area totals for:

- full master;
- union of base crops;
- baked runtime coverage;
- fallback runtime coverage;
- uncovered error area, which must be zero within the declared coverage partition.

### Handoffs

Show every crop intersection, route crossing, and declared corner group. Distinguish route continuity, base-material continuity, foreground continuity, and baked-to-fallback boundaries.

## Crop and overlap registry

Add:

```text
src/lib/game/content/backgrounds/meadow-entry-crop-manifest.ts
```

```ts
export const MEADOW_ENTRY_MIN_HANDOFF_PX = 128;

type MeadowEntryCropDerivation =
  | { mode: 'expanded-review-bounds'; expansionPx: typeof MEADOW_ENTRY_MIN_HANDOFF_PX }
  | { mode: 'exact-bounds' };
```

The minimum required crop IDs are:

```ts
type RequiredMeadowEntryCropId =
  | 'sundrop-village-underlay'
  | 'village-crossroads-connector'
  | 'crossroads'
  | 'crossroads-coast-connector'
  | 'tidewatch-coast'
  | 'crossroads-mistfen-connector'
  | 'mistfen'
  | 'crossroads-silverpine-connector'
  | 'silverpine'
  | 'crossroads-wildwood-connector'
  | 'wildwood';
```

Implementation PR 1 may add reviewed base-only `outer-boundary-*` crop IDs to close runtime source/edge coverage. Once PR 1 is approved, the complete crop ID union becomes fixed API.

### General crop derivation

Every crop except Sundrop underlay uses `expanded-review-bounds`:

1. start from hand-authored declared `reviewBounds` plus any explicit coverage attachments;
2. expand by `MEADOW_ENTRY_MIN_HANDOFF_PX`;
3. snap outward to the `32px` grid;
4. apply declared world-edge clamping where necessary;
5. compare the checked-in approved rectangle with the **post-clamp** candidate;
6. fail if the approved rectangle differs from the post-clamp candidate.

Raw source fragment bounding boxes are never used as the starting envelope unless explicitly declared as reviewed coverage attachments.

### Legal edge clamping

World-edge clamping is legal only when declared:

```ts
interface MeadowEntryEdgeClamp {
  sides: readonly ('left' | 'right' | 'top' | 'bottom')[];
  reason: string;
}
```

Rules:

- clamping may only move candidate edges to `0` or `6400`;
- the manifest records pre-clamp and post-clamp bounds;
- the approved crop equals the post-clamp candidate;
- undeclared or silent clipping is an error;
- Coast and other edge-adjacent crops are expected to exercise this path when expansion exceeds the world.

### Sundrop exact-bounds exception

`sundrop-village-underlay` uses `exact-bounds`; it does **not** receive the `128px` expansion:

```text
left=256, top=4352, right=2048, bottom=5888
width=1792, height=1536
```

This prevents underlay ownership from expanding implicitly beyond the reviewed HPA-398 surface. The exception does not weaken handoff validation: every neighbor crop that meets the underlay must extend far enough into these exact bounds to create a declared base-only intersection at least `MEADOW_ENTRY_MIN_HANDOFF_PX` wide or high along the applicable route mouth.

The underlay contains base paint only. HPA-406 renders all intersecting HPA-399 base crops first, then renders the immutable HPA-398 base above them.

### Repairing a failed handoff

If a derived pair does not provide the required `128px` route-mouth overlap, PR 1 must use one of these explicit levers:

1. enlarge or reposition the hand-authored `reviewBounds` of one or both crops;
2. attach an explicit cross-region coverage bound;
3. change primary/secondary crop membership;
4. add a dedicated connector or `outer-boundary-*` crop.

The change updates the authoring-contract fingerprint and must be re-reviewed. Gameplay geometry and master pixels are not changed merely to satisfy a crop contract.

### Mandatory PR 1 crop and overlap tables

PR 0 does not invent unreviewed coordinates for the non-Sundrop crops. PR 1 must commit exact checked-in tables before control approval:

```ts
export const MEADOW_ENTRY_APPROVED_CROPS: readonly MeadowEntryApprovedCrop[];
export const MEADOW_ENTRY_APPROVED_OVERLAPS: readonly MeadowEntryOverlap[];
export const MEADOW_ENTRY_RUNTIME_COVERAGE: readonly MeadowEntryRuntimeCoverage[];
```

The PR 1 review includes a human-readable table containing, for every crop:

- derivation mode;
- exact `left/top/right/bottom`;
- expected dimensions;
- hand-authored review bounds and explicit coverage attachments;
- pre-clamp and post-clamp candidate bounds;
- edge-clamp reason, if any;
- neighbors and overlap IDs;
- draw order;
- filename and texture keys;
- source and runtime coverage responsibilities.

It also publishes every overlap rectangle, route mouth, plane policy, owner, baked/fallback boundary, and any triple/corner intersection.

Art finalization and PR 2 are blocked until:

- all crop bounds satisfy `0 ≤ left < right ≤ 6400` and `0 ≤ top < bottom ≤ 6400`;
- all crop edges are `32px` aligned;
- all required baked sources are covered;
- all route handoffs satisfy `MEADOW_ENTRY_MIN_HANDOFF_PX`;
- every non-empty three-crop intersection is either rejected or assigned an explicit `cornerGroupId` with two-dimensional pixel validation;
- baked and fallback coverage masks partition their declared scope without unexplained gaps;
- reviewers approve the complete crop/overlap/coverage tables and control images.

### Stable filenames, texture keys, and draw order

Filenames are exact:

```text
<crop-id>-base.png
<crop-id>-foreground.png
```

The Sundrop underlay and any base-only outer-boundary crop have no foreground filename. Texture keys are exact:

```text
meadow-entry-<crop-id>-base
meadow-entry-<crop-id>-foreground
```

`drawOrder` is scoped within a semantic plane; plane depth, not `drawOrder`, separates base from foreground. Required values are:

| Crop | `drawOrder` |
| --- | ---: |
| `sundrop-village-underlay` | `0` |
| `village-crossroads-connector` | `100` |
| `crossroads-coast-connector` | `110` |
| `crossroads-mistfen-connector` | `120` |
| `crossroads-silverpine-connector` | `130` |
| `crossroads-wildwood-connector` | `140` |
| `crossroads` | `200` |
| `tidewatch-coast` | `210` |
| `mistfen` | `220` |
| `silverpine` | `230` |
| `wildwood` | `240` |

Any added `outer-boundary-*` base crop uses a reviewed value in `10..90` and renders before connector and destination crops.

All HPA-399 base crops render before the immutable HPA-398 Sundrop base overlay. HPA-399 foreground crops render at foreground depth in the same deterministic order. The immutable HPA-398 foreground renders after HPA-399 foreground where their review composition intersects. HPA-399 crop overlaps must be pixel-identical, so draw order may resolve ownership/diagnostics but may never encode different overlap artwork.

### Crop manifest

```ts
interface MeadowEntryCropManifestEntry {
  id: MeadowEntryCropId;
  derivation: MeadowEntryCropDerivation;
  reviewBounds: PixelBounds;
  coverageAttachments: readonly PixelBounds[];
  preClampBounds: PixelBounds;
  edgeClamp: MeadowEntryEdgeClamp | null;
  bounds: PixelBounds;
  expectedDimensions: { width: number; height: number };
  baseFilename: string;
  foregroundFilename: string | null;
  textureKeys: { base: string; foreground: string | null };
  drawOrder: number;
  sourceRegionIds: readonly MeadowEntryAuthoringRegionId[];
  neighborIds: readonly MeadowEntryCropId[];
  overlapIds: readonly string[];
  alphaPolicy: {
    base: 'opaque';
    foreground: 'sparse-eligible-mask' | null;
  };
  sizeBudgets: {
    baseReviewBytes: number;
    baseHardBytes: number;
    foregroundReviewBytes: number | null;
    foregroundHardBytes: number | null;
  };
}
```

### Overlap manifest

```ts
interface MeadowEntryOverlap {
  id: string;
  firstCropId: MeadowEntryCropId;
  secondCropId: MeadowEntryCropId;
  bounds: PixelBounds;
  minimumSharedPixels: typeof MEADOW_ENTRY_MIN_HANDOFF_PX;
  planePolicy: 'base-only' | 'base-and-foreground';
  ownerCropId: MeadowEntryCropId;
  cornerGroupId?: string;
}
```

Rules:

- overlap bounds equal the exact crop intersection;
- every route handoff has at least `MEADOW_ENTRY_MIN_HANDOFF_PX` shared pixels;
- overlap pixels are direct samples of identical master coordinates;
- decoded RGBA is byte-identical across both exports for every shared plane;
- Sundrop-underlay overlaps are base-only;
- `ownerCropId` defines runtime ownership/diagnostic order, not different pixels;
- corner overlaps validate in two dimensions;
- edits regenerate every crop intersecting the modified master area.

## Sundrop predecessor integration

HPA-399 records and validates:

- `public/game/assets/regions/sundrop-village-base.png`;
- `public/game/assets/regions/sundrop-village-foreground.png`;
- `sundropVillageBackgroundsApproval`;
- HPA-398 controls and provenance;
- exact Sundrop world bounds;
- the HPA-398 base alpha function and `64px` feather;
- `SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX`.

No HPA-399 command may write those files or any HPA-307/HPA-398 evidence directory.

The HPA-399 base master is opaque beneath Sundrop. The HPA-399 foreground master excludes HPA-398 village foreground pixels. Review composition renders:

1. all HPA-399 base crops/full base master;
2. immutable HPA-398 Sundrop base;
3. all HPA-399 foreground/full foreground master;
4. immutable HPA-398 Sundrop foreground;
5. protected-live review silhouettes.

This composite is evidence, not another master or runtime asset. Tests verify predecessor hashes remain unchanged and all four feathered edges blend over the exact underlay.

## Visual master contract

### Base master

Logical artifact:

```text
artifacts/meadow-entry/hpa-399/masters/meadow-entry-base-master.png
```

Requirements:

- exactly `6400×6400` RGBA;
- alpha `255` everywhere;
- orthographic top-down, no perspective tilt;
- one upper-left daylight direction compatible with Sundrop;
- continuous roads and material transitions;
- regional material language without crop-local style breaks;
- low-profile static obstacles aligned to controls;
- foundation/contact shadows only inside approved margins;
- quiet detail on routes, entrances, encounters, rewards, and transition throats;
- no text, signs, invented buildings, false entrances, or gameplay geometry.

Any “fog-ground” appearance in the opaque base is painted opaque material/value treatment. It never uses base alpha. Translucent Mistfen fog must remain a protected live foreground `MapDecor` or receive an explicit `base-and-foreground` disposition plus HPA-406 fallback ownership; it cannot silently migrate into the base master.

### Foreground master

Logical artifact:

```text
artifacts/meadow-entry/hpa-399/masters/meadow-entry-foreground-master.png
```

Requirements:

- exactly `6400×6400` RGBA;
- transparent outside the eligible mask;
- zero decoded RGB wherever alpha is zero;
- only approved hedge tops, canopies, wall fronts, arches, reeds, branches, and similar occlusion;
- no live building, gate, NPC, pickup, encounter, transition, discovery, story object, or animated/stateful visual;
- shared front cutoff derived from hero display height and `PLAYER_COLLISION_RADIUS`;
- no pixels over protected-live foreground-decor footprints;
- never hide a complete enemy, reward, route, transition, or interaction point.

### Material profiles

- Sundrop underlay: warm village transition compatible with HPA-398;
- Crossroads: worn cobblestone, festival-road earth, mixed regional cues;
- Tidewatch Coast: sand, salt grass, shoreline, tidepool, driftwood, low rock;
- Mistfen: mud, shallow pools, damp roots, reeds, deadfall, and opaque low fog-color ground treatment; translucent fog remains live or foreground-classified;
- Silverpine: autumn floor, ceremonial path, terrace stone, pine, maple, shrine approach;
- Wildwood: forest floor, roots, brush, combat framing, cave approach;
- connectors: gradual interpolation between endpoint profiles;
- fallback-only outer boundary: current tilemap material remains intentional and is shown explicitly in review proofs.

Profiles constrain palette, texture scale, value range, and density, never gameplay geometry.

## Production, refinement, and provenance

The first global candidate establishes composition, lighting, palette, road continuity, material transitions, and detail hierarchy.

A candidate may begin below native resolution, but normalization permits only one reviewed exact-ratio crop, uniform scaling, and deterministic compositing. No non-uniform scaling or local geometric warping is permitted.

A region may be refined only when:

- the current full master has been reviewed;
- an exact source-derived edit mask is recorded;
- protected-live, forbidden-tall, and non-target regions are excluded;
- the replacement uses a recorded transform;
- the edit is composited into the canonical full master;
- every affected crop and overlap is regenerated.

Candidate and refinement images remain untracked working files until a final approved package is selected. A disconnected crop can never become an accepted master or export.

Finalization writes temporary outputs, validates the complete package, then atomically replaces the approved logical artifacts. Failure leaves the last approved package untouched.

Provenance records:

- control, source, predecessor, and storage-configuration hashes;
- finalizer, exporter, Sharp, and relevant runtime/tool versions;
- generation provider, model identifier, model/version string, invocation tool/version, and settings;
- seed when the provider exposes one, otherwise an explicit `seed: null` plus `seedUnavailable: true`;
- prompt text/hash, reference-image hashes, masks, transforms, and native candidate dimensions/hashes;
- manual-production declaration when no generative model is used;
- every refinement source, edit mask, transform, output hash, and affected crop set;
- final master/export hashes, storage object identifiers, and byte counts.

Reproducibility claims distinguish deterministic source tooling from generative recreation. Missing provider seeds or nondeterministic model behavior do not invalidate provenance, but the report must not claim byte-reproducible generation when only finalization/export are deterministic.

## Binary master/export and proof storage gate

The baseline repository has no `.gitattributes`, and `artifacts/` is not ignored. Therefore implementation PR 2 may not add master, export, or native-resolution proof PNGs until PR 1 selects and validates one durable mode.

The chosen mode applies to:

- `artifacts/meadow-entry/hpa-399/**/*.png`;
- native-resolution full-master proofs;
- native-resolution region/connector proofs;
- overlap difference images;
- Sundrop feather edge proofs;
- any other raster evidence whose aggregate or replacement churn is material.

Compact SVG/JSON controls, Markdown reports, and explicitly capped contact sheets may remain ordinary Git. Native proofs must never fall through to ordinary Git accidentally.

### Mode A — Git LFS, preferred

PR 1 must implement and prove all of the following:

- install/document the developer prerequisite for Git LFS and run `git lfs install` in setup;
- add `.gitattributes` patterns for master/export PNGs and the selected proof/evidence PNG namespace;
- configure CI checkout with LFS materialization enabled, for example `actions/checkout` with `lfs: true`, or an equivalent explicit `git lfs pull` flow;
- run `git lfs fsck`, verify pointer form in Git, verify required objects exist, and verify a clean materialized checkout;
- fail with a clear prerequisite error when LFS is unavailable; never silently commit full PNG blobs to ordinary Git;
- document how HPA-406 and release CI materialize and hash the exact objects.

Mode A cannot be selected merely by adding `.gitattributes`; its local and CI bootstrap must pass in PR 1.

### Mode B — Content-addressed external storage

Before Mode B can be selected, PR 1 must define and validate:

- the durable storage provider/location and immutable content-addressed object IDs;
- authentication and CI access rules;
- a deterministic materialization command and cache directory;
- `.gitignore` rules preventing materialized PNGs from entering ordinary Git;
- offline/error behavior and precise missing-object diagnostics;
- hash verification for every master, export, and native proof;
- retention/availability expectations for HPA-406 and future branch checkouts.

Commit manifests, hashes, provenance, approval data, and materialization tooling; do not commit the external PNG bytes.

### Mode C — Ordinary Git by explicit exception

Ordinary Git is not the expected decision. It requires a reviewed exception that:

- explicitly accepts permanent repository-history growth;
- proves every tracked blob is below the `95 MiB` transport ceiling;
- commits only the final approved package and explicitly capped proof images, never intermediate candidates or refinements;
- rewrites/squashes pre-merge PR history so superseded package bytes do not remain in the branch;
- records aggregate package size and expected future replacement cost;
- proves no LFS pointer or external object is expected by CI.

Current HPA-398 village density projects the full base master into roughly the `100–110 MiB` range at similar compression. That estimate is not an acceptance measurement, but it makes Mode C likely unavailable without harmful quality reduction. PR 1 should treat Modes A and B as the real decision space unless measured final bytes prove otherwise without changing the visual contract.

Storage mode is part of the authoring-contract fingerprint. Changing it invalidates approval.

### Proof policy

Native-resolution proofs use the selected Mode A or B storage by default. Mode C may include them only under its explicit aggregate-history exception.

Ordinary Git may retain compact review summaries only when PR 1 defines deterministic caps, for example:

- contact sheets at an approved review resolution;
- small difference thumbnails;
- SVG overlays and JSON metrics;
- no full `6400×6400` duplicate composite.

CI may also publish discardable workflow artifacts for native proofs, but the approval manifest must record source hashes and whether evidence is durable or ephemeral. Ephemeral CI evidence cannot be the sole long-term approval record unless the project explicitly accepts its retention policy.

## Export package

The logical package namespace is:

```text
artifacts/meadow-entry/hpa-399/
  masters/
    meadow-entry-base-master.png
    meadow-entry-foreground-master.png
  exports/
    <crop-id>-base.png
    <crop-id>-foreground.png
  provenance/
    meadow-entry-master-provenance.json
    meadow-entry-export-provenance.json
    meadow-entry-crop-manifest.json
```

The selected storage mode determines whether these paths are LFS-backed, materialized from external storage, or accepted through the ordinary-Git exception. The namespace itself is stable.

Commands:

```sh
bun run art:controls:meadow-entry
bun run art:finalize:meadow-entry
bun run art:export:meadow-entry
bun run art:proof:meadow-entry
bun run art:validate:meadow-entry
```

The exporter refuses stale controls, predecessor drift, approval mismatch, invalid dimensions/alpha, stale manifests, unselected storage/proof modes, unavailable objects, or paths outside the fixed inventory.

HPA-406 promotes or materializes exact approved export bytes. It must not resize, recompress, recolor, or regenerate them.

## Size budgets

A decoded `6400×6400` RGBA master is `163,840,000` bytes, or `156.25 MiB`. The ordinary-Git `95 MiB` transport ceiling is not an art-quality hard limit.

Operational compressed-PNG master budgets are:

| Asset | Review target | Hard limit |
| --- | ---: | ---: |
| Base master | `128 MiB` | `192 MiB` |
| Foreground master | `48 MiB` | `96 MiB` |

The higher base review target avoids making the design’s own `100–110 MiB` projection require an exception before production starts.

### Per-crop budgets

For ordinary crops:

```text
base review = max(1 MiB, ceil(128 MiB × cropArea / masterArea))
base hard   = max(2 MiB, ceil(192 MiB × cropArea / masterArea))

foreground review = max(512 KiB, ceil(48 MiB × cropArea / masterArea))
foreground hard   = max(1 MiB, ceil(96 MiB × cropArea / masterArea))
```

The `sundrop-village-underlay` has a dedicated predecessor-compatible budget:

```text
review target = 4 MiB
hard limit    = 8 MiB
```

It is expected to be lower-detail underpaint than the HPA-398 base above it. Exceeding its review target requires a recorded exception; exceeding `8 MiB` requires design review.

Any added low-detail `outer-boundary-*` crop receives its own explicit reviewed budget rather than inheriting a destination-region density assumption.

### Aggregate export budgets

Overlaps duplicate pixels, so aggregate budgets are derived from the frozen crop table rather than from master area alone.

PR 1 computes:

```text
exportAreaRatio = sum(all crop areas, including overlaps) / masterArea
aggregateBaseReview = sum(each baseReviewBytes)
aggregateBaseHard   = sum(each baseHardBytes)
aggregateForegroundReview = sum(each non-null foregroundReviewBytes)
aggregateForegroundHard   = sum(each non-null foregroundHardBytes)
aggregatePackageReview = aggregateBaseReview + aggregateForegroundReview
aggregatePackageHard   = aggregateBaseHard + aggregateForegroundHard
```

The manifest records `exportAreaRatio`, overlap area, and all aggregate values. There is no independent fixed aggregate number that can contradict the per-crop formulas. Measured package bytes must be below the computed aggregate hard limit. Review-target exceptions are recorded at the smallest responsible scope rather than hidden by aggregate headroom.

Under Mode C, each tracked blob must additionally stay below `95 MiB`; exceeding that ceiling disqualifies ordinary Git rather than rejecting otherwise valid art.

## Approval contract

Add:

```text
src/lib/game/content/approvals/meadow-entry-art-package.ts
```

Record:

- combined control fingerprint;
- selected master/export and proof storage modes plus configuration hashes;
- base and foreground master hashes, sizes, and exceptions;
- exact crop, overlap, coverage, and clamp-table hashes;
- `exportAreaRatio` and aggregate budget calculations;
- per-export hashes, dimensions, draw orders, texture keys, and exceptions;
- provenance hashes and generative/manual production metadata;
- external object identifiers or LFS pointer/object validation where applicable;
- durable proof object hashes and/or CI artifact retention declaration;
- evidence report path.

Approvals are data, not snapshots. Updating them requires native-resolution review of the complete master before any crop is accepted.

## Validation

### Control and registry tests

- every source reference resolves;
- inline `meadowBoundsRegion` sources are included;
- every source has one primary authoring region;
- every `pathsRegion` source matches the exact connector mapping;
- every cross-region outlier is contained, split, re-owned, attached, or explicitly fallback/control-only;
- every visual-capable source has exactly one bake disposition and runtime obligation;
- every ground patch is `base-underlay` or `runtime-fallback-only`;
- non-visual semantic controls such as combat bounds and discoveries have explicit `control-only` dispositions;
- protected-live objects never receive baked ownership;
- every baked decor/fence entry names an HPA-406 fallback obligation;
- raw and floor/ceil raster bounds preserve source coverage;
- all region and crop bounds satisfy the half-open world inequalities;
- Sundrop underlay uses exact bounds and no expansion;
- derived general crops equal approved post-clamp rectangles;
- every edge clamp is declared with sides and reason;
- the full crop, overlap, and runtime-coverage tables are present and reviewed;
- every baked source is covered by at least one base crop;
- every intentional fallback area appears in the fallback coverage mask;
- unexplained coverage area is zero;
- every handoff satisfies `MEADOW_ENTRY_MIN_HANDOFF_PX`, including Sundrop base-only overlaps;
- every triple/corner intersection is empty or explicitly grouped and validated;
- filenames, texture keys, plane-scoped draw orders, and HPA-398 overlay order match the stable convention;
- repeated control export is byte-identical;
- storage modes are selected and their bootstrap/configuration passes;
- HPA-307 and HPA-398 inputs remain unchanged.

### Master tests

- exact `6400×6400` RGBA dimensions;
- base fully opaque, including Mistfen fog-color ground treatment;
- no translucent fog is present in base alpha;
- foreground zero RGB outside positive alpha;
- foreground alpha zero outside eligible mask;
- no foreground pixels overlap protected-live foreground decor;
- shared foreground cutoff matches HPA-398 and all entry exceptions are conservative;
- no protected-live or forbidden-tall violations;
- static obstacle paint covers declared extents;
- route, doorway, transition, encounter, discovery, and reward clearances remain visually unobstructed;
- approved hashes and operational budgets match.

Pixel tests cannot prove artistic quality; native-resolution visual review remains mandatory.

### Export tests

- every manifest asset exists or materializes through the selected storage mode;
- dimensions equal crop bounds;
- decoded crop pixels equal master pixels;
- all shared overlap pixels are byte-identical;
- no crop exceeds master bounds;
- filenames, texture keys, plane metadata, draw order, and fingerprints match;
- transparent foregrounds have zero RGB;
- runtime baked and fallback coverage match the approved partition;
- provenance lists every input and transform;
- regeneration from unchanged masters is byte-identical;
- no runtime master/export is under `public/` during HPA-399;
- LFS pointers/objects or external content-addressed objects validate when selected;
- native proof storage follows the selected proof policy;
- ordinary Git contains no unapproved binary package or native proof set.

### Review proofs

Generate:

- full controls;
- base master;
- foreground on checkerboard;
- immutable-Sundrop composite;
- every region and connector at native resolution;
- every intentional baked-to-fallback boundary;
- runtime base/fallback coverage overlays;
- protected/collision/eligibility overlays;
- every overlap difference image;
- all declared corner-group proofs;
- all declared edge-clamp proofs;
- four Sundrop feather-over-underlay edge proofs.

### Repository gates

```sh
bun run art:controls:meadow-entry
bun run art:validate:meadow-entry
bun run check
bun run lint
bun run test:unit -- --run
bun run build
bun run tauri build
```

Additionally:

- Mode A runs LFS installation/preflight, pointer checks, `git lfs fsck`, object availability, and clean materialization;
- Mode B runs deterministic materialization, ignore guards, and hash verification;
- Mode C runs ordinary-Git blob, proof, and aggregate-history guards;
- proof storage validates durable objects or explicitly declared CI retention.

HPA-399 does not claim runtime traversal, fallback, save/reload, controller feel, GPU residency, or complete opening-map performance.

## Error handling

- Writers use fixed allowlists and reject HPA-307, HPA-398, `public/`, and unrelated paths.
- Generated text uses canonical ordering and normalized newlines.
- Master/export writes are temporary and atomic.
- Unresolved sources report type, ID, expected region, and registry file.
- Duplicate/missing `pathsRegion` ownership reports the exact ID and expected connector.
- Cross-region outlier failures report source ID, raw bounds, primary review bounds, and missing coverage declaration.
- Rasterization failures report raw and integerized bounds.
- Crop failures report crop ID, derivation mode, review/attachment bounds, pre/post-clamp bounds, and contributors.
- Undeclared clamp failures report side and out-of-world extent.
- Handoff failures report the legal repair options and the review bounds that must change.
- Coverage failures report baked source ID or unexplained world rectangle plus the missing crop/fallback classification.
- Overlap failures report both crops, plane, master coordinate, and first differing pixel.
- Corner failures report all participating crops and `cornerGroupId`.
- Protected-mask failures report source, coordinate, and intersecting bake entry.
- Runtime-obligation failures report source type, ID, disposition, and missing HPA-406 capability.
- Storage failures report mode, object/path, expected hash, and materialization state.
- Budget failures report per-crop and aggregate calculations, including `exportAreaRatio`.
- Stale fingerprints block finalization rather than refreshing approvals.
- Hard-budget failures leave approved bytes untouched.
- Source corrections regenerate the global master and every intersecting export; tooling never patches a disconnected crop.

## PR stack and gates

### PR 0 — Design lock (PR #17)

Deliver this reviewed design only. It defines contracts and implementation gates but does not invent exact non-Sundrop crop coordinates, choose storage without bootstrap evidence, or add assets.

### Implementation PR 1 — Source contract, controls, exact crop/coverage tables, and storage gate

Deliver:

- authoring-region registry and exact `pathsRegion` primary mapping;
- explicit inline `meadowBoundsRegion` ownership;
- cross-region-outlier audit and coverage declarations;
- bake-disposition and HPA-406 runtime-obligation registry;
- raw-edge/floor-ceil rasterization helpers;
- exact approved crop, overlap, clamp, corner, and runtime-coverage tables;
- any required base-only `outer-boundary-*` crops;
- `MEADOW_ENTRY_MIN_HANDOFF_PX`;
- stable filenames, texture keys, and plane-scoped draw orders;
- arithmetic-closing per-crop and aggregate budget calculations;
- deterministic controls and generated fingerprint;
- fixed inventories and guards;
- selected Mode A or Mode B binary/proof storage with real local/CI bootstrap;
- Mode C only if a separately reviewed measured exception is approved;
- completeness, coverage, crop, overlap, clamp, corner, predecessor-freeze, and storage tests;
- full control review evidence.

PR 1 cannot be approved and no master work may begin until:

- the full crop/overlap/clamp/corner/coverage tables are frozen and reviewable;
- every baked source and every intentional fallback area is accounted for;
- all handoffs and corners pass;
- every baked decor/fence item has an accepted HPA-406 fallback obligation;
- Mode A or B is operational in CI and developer setup, or Mode C has an explicit measured exception;
- native proof storage is resolved;
- budget formulas close arithmetically against the frozen crop set.

### Implementation PR 2 — Visual masters and approved exports

Deliver through the selected storage mode:

- canonical base and foreground masters;
- Sundrop underlay;
- all regional, connector, and required edge exports;
- finalizer, exporter, proof, and validation tools;
- approvals, provenance, and native-resolution evidence;
- master, mask, coverage, overlap, clamp, corner, storage, budget, and reproducibility tests;
- final validation report.

Review gate: approve the full-map master, explicit fallback boundaries, and immutable Sundrop overlay composition before accepting any individual export.

## Risks and mitigations

### Small geometry is lost

A `6400×6400` world contains narrow `64px` routes, odd-sized source rectangles, and small transition throats.

Mitigation: source masks remain authoritative, floor/ceil rasterization preserves coverage, normalization forbids warping, native-resolution controls remain visible, and refinements use controlled masks on the full master.

### Fragment envelopes distort crop partitions

Mitigation: review bounds are hand-authored partitions. Raw fragment envelopes never drive crops automatically. Cross-region outliers must be attached, split, re-owned, or explicitly fallback/control-only.

### Runtime base coverage is incomplete

Mitigation: PR 1 publishes baked and fallback coverage masks, covers every baked source, and may add base-only edge crops. Unexplained coverage area is a hard failure.

### Crop contracts are approved too late

Mitigation: PR 1 must publish exact crop, overlap, route-mouth, edge-clamp, corner, and coverage tables and blocks all art until they pass review.

### Regional refinements drift

Mitigation: refinements start from the current master, retain material/lighting contracts, and require recomposition plus complete overlap regeneration.

### Sundrop does not blend

Mitigation: use an exact, unexpanded underlay below immutable feathered HPA-398 bytes; neighboring crops still provide validated `128px` base-only intersections; review all four edges.

### Static ownership is incomplete

Mitigation: omission is a hard error. Every blocker, fence, decor, ground patch, and semantic control receives an explicit disposition. Baked decor/fences are prohibited unless HPA-406 accepts the corresponding fallback obligation.

### Live foreground decor conflicts with baked foreground

Mitigation: live foreground decor remains depth `0` after-player insertion order, below baked depth `100`; its footprint is therefore protected and removed from HPA-399 foreground eligibility unless HPA-406 deliberately changes ownership/order.

### Mistfen fog violates base alpha

Mitigation: base fog appearance is opaque paint only. Translucent fog remains live or uses explicit foreground ownership and fallback.

### Budget formulas contradict overlap-heavy crops

Mitigation: aggregate budgets are the sum of frozen per-crop budgets and explicitly record `exportAreaRatio`. No fixed aggregate number can contradict the crop formulas.

### Git history or evidence becomes permanently large

Mitigation: PR 2 is blocked on binary and proof storage. Git LFS requires full bootstrap; external storage requires deterministic materialization; ordinary Git is likely disqualified by projected base size and requires explicit measured approval.

## Definition of done

HPA-399 is complete when:

- one command regenerates the full controls and crop manifest deterministically;
- every region, connector, handoff, inline boundary source, and cross-region outlier is accounted for;
- baked and fallback runtime coverage are explicit with no unexplained gaps;
- one approved opaque base master and one approved sparse foreground master define the non-live environmental surface;
- a durable binary-storage mode is selected, validated, and fingerprinted;
- immutable HPA-398 Sundrop assets remain byte-identical and blend over the underlay;
- every Crossroads, connector, Coast, Mistfen, Silverpine, Wildwood, Sundrop-underlay, and required edge export derives from the approved masters;
- all neighboring overlap pixels are byte-identical;
- protected live objects, live foreground decor, gameplay clearances, collision controls, dimensions, fingerprints, alpha policies, provenance, storage, and budgets pass;
- check, lint, unit, browser build, and Tauri build gates pass;
- HPA-406 can consume exact approved bytes without redesigning, regenerating, recompressing, or inventing a second ownership model.
