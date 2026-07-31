# HPA-399 Full Meadow-Entry Authoring Package — Design

> Issue: HPA-399, “Produce the full meadow-entry control master, visual master, and regional exports.”
>
> Baseline: `main` at `3f16a17b2adbe25d9271ff4bc000b24d4cdf6beb`, including merged HPA-398 / PR #16.
>
> Delivery: a short two-PR stack under HPA-399. PR 1 locks source-derived controls, crop contracts, and the binary-storage decision. PR 2 adds the approved visual masters and deterministic exports using that storage contract. HPA-399 does not register or integrate non-village exports at runtime.

## Problem

HPA-398 established reusable base and foreground background planes, collision-preserving live fallbacks, exact render diagnostics, and a complete Sundrop Village obstacle proof. HPA-399 must now produce the authoring package that lets HPA-406 integrate the rest of `meadow-entry` without independently designing or generating disconnected regions.

The target map is `200×200` tiles at `32px`, so the world-space authoring canvas is exactly `6400×6400` pixels. The live composed map remains authoritative for gameplay, but it is not sufficient as a full-map art source:

- `mergeRegions(...)` preserves object geometry but discards semantic source-region ownership;
- non-village static visuals are split across `groundPatches`, `blockers`, `mapDecor`, and `fences`;
- HPA-398 runtime ownership exists only for `MapBlocker`, while many trees, reeds, rocks, deadfall, canopies, fog volumes, walls, and environmental props are `MapDecor`;
- building exteriors and major gates are live semantic visuals and must not be baked accidentally;
- Sundrop Village already has approved HPA-398 base and foreground bytes, fingerprints, and evidence that must remain immutable;
- direct per-region production would allow lighting, palette, route alignment, and overlap pixels to drift;
- the repository currently has no `.gitattributes` Git LFS contract, and `.gitignore` does not exclude `artifacts/`, so committing repeatedly regenerated masters through ordinary Git would permanently multiply binary history.

HPA-399 therefore needs a deterministic authoring layer above the live map, not a second gameplay map and not an expansion of the runtime renderer.

## Approved decisions

1. Use a global-master-first workflow with one canonical `6400×6400` base master and one canonical `6400×6400` sparse foreground master.
2. Allow regional refinement only as source-masked edits applied back to the canonical masters.
3. Never accept an independently produced regional master and never directly retouch a runtime crop.
4. Keep HPA-399 authoring-only. Runtime registration, descriptor insertion, and non-village live-visual suppression remain HPA-406 work.
5. Preserve the approved HPA-398 Sundrop base and foreground files byte-for-byte as immutable predecessor overlays.
6. Produce a Sundrop underlay from the global base master so the existing feathered HPA-398 base blends into the new world without changing its bytes.
7. Restore semantic provenance through explicit authoring-region and bake-disposition registries rather than bounding-box inference.
8. Use half-open integer world rectangles and `32px`-aligned crop edges.
9. Define `MEADOW_ENTRY_MIN_HANDOFF_PX = 128` as the shared handoff-overlap contract.
10. Generate every HPA-399 export from approved master bytes through one deterministic exporter.
11. Keep unintegrated exports outside `public/`; HPA-406 promotes exact approved bytes into runtime paths.
12. Make binary-storage selection a hard gate before PR 2. Git LFS is preferred; content-addressed external storage is supported; ordinary Git requires an explicit history-cost exception.
13. Preserve all HPA-307 and HPA-398 tools, inventories, fingerprints, reports, and evidence directories unless a separate migration is approved.

## Goals

- Generate a complete reviewable full-map control package from live map sources.
- Preserve one exact world-to-pixel coordinate system across controls, masters, crops, and runtime integration.
- Restore semantic region provenance lost during composition.
- Classify every visual-capable source as baked, foreground-eligible, protected live, or control-only.
- Produce one coherent base material system and one coherent foreground occlusion system.
- Preserve continuous roads, terrain transitions, connector mouths, and overlap pixels.
- Provide HPA-406 with immutable, fingerprinted, directly consumable exports.
- Fail fast when gameplay geometry, source files, crop contracts, predecessor assets, storage configuration, or approved art bytes drift.
- Keep buildings, NPCs, pickups, transitions, encounters, discoveries, story gates, and stateful or animated objects live.
- Preserve hidden authoritative collision; no collision is derived from raster pixels.

## Non-goals

- No runtime registration or rendering integration for Crossroads, connectors, Coast, Mistfen, Silverpine, or Wildwood.
- No `WorldScene` ownership extension for `MapDecor` or fences.
- No gameplay route, collision, encounter, transition, reward, or room-graph redesign.
- No replacement or regeneration of HPA-398 Sundrop assets.
- No baking of building exteriors, gates, NPCs, pickups, transitions, encounters, discoveries, quest objects, stateful objects, or animated objects.
- No independent regional art masters.
- No interior artwork.
- No day/night, weather, seasonal, parallax, or animated baked variants.
- No PNG pixels as semantic or collision truth.
- No final whole-map runtime, traversal, fallback, GPU, or save acceptance; HPA-406 and HPA-411 own those gates.

## Authoritative sources

The following remain gameplay truth:

- `src/lib/game/content/maps/meadow-entry.ts` — final composition and `6400×6400` world contract;
- `src/lib/game/content/maps/regions/*.ts` — Coast, Crossroads, Mistfen, Paths, Silverpine, Village, and Wildwood source fragments;
- `src/lib/game/content/maps/regions/village-layered.ts` and `compileLayeredRegion(...)` — Sundrop authored geometry;
- `collectStrictCollisionRects(...)`, `collectLandmarkRects(...)`, and doorway carving in `save-state.ts` — movement/save-aligned collision and protected-building geometry;
- `PLAYER_COLLISION_RADIUS` — movement-clearance expansion;
- HPA-398 ownership, controls, approvals, provenance, and production assets — approved Sundrop behavior;
- `WorldScene` rendering depths — fallback tilemap ground `-10`, baked base `-9`, ordinary live sprites defaulting to `0`, baked foreground `100`, and collision debug `10_000`.

“Live world `0`” refers to default sprite/world-object depth. It does not describe the fallback tilemap layer, which explicitly renders at `-10`.

The HPA-399 authoring registry adds provenance and visual-production intent. It never replaces gameplay data.

## Coordinate contract

```text
world bounds: [0, 6400) × [0, 6400)
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

Conversion is exact:

```text
left   = x - width / 2
top    = y - height / 2
right  = x + width / 2
bottom = y + height / 2
```

All serialized crop edges must be integers, multiples of `32`, positive in area, and inside the full master. The exporter rejects fractional, inverted, clipped, or out-of-bounds rectangles.

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

Rules:

- every reference resolves against assembled `meadowEntryMap`;
- every resolved source has exactly one primary authoring region;
- secondary connector/handoff review membership never changes primary ownership;
- connectors are explicit, never inferred by nearest-region heuristics;
- checked-in `reviewBounds` are `32px` aligned and fingerprinted;
- `outer-boundary` owns map-edge controls but has no runtime export.

This restores provenance without changing `RegionFragment`, `WorldMapDefinition`, or runtime composition.

## Bake-disposition registry

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
  | { mode: 'control-only'; reason: string };
```

Each entry contains an exact source reference and primary region.

Strict policies:

- all `groundPatches` are `base-underlay`;
- landmarks and doorway approaches are `protected-live`;
- transitions, NPCs, ambient NPCs, pickups, encounters, combat bounds, and discoveries are explicitly `protected-live` or `control-only`;
- combat bounds and discoveries are not visual bake candidates, but they still receive explicit `control-only` dispositions so completeness validation proves they were intentionally handled;
- major buildings, shrines, caves, castle elements, and story gates remain `protected-live`;
- a blocker, fence, or decor item may be baked only through an explicit registry entry;
- colliding decor may be baked visually while collision remains live;
- low-profile non-colliding decor may enter base;
- canopies, hedge tops, wall fronts, arches, tall reeds, and approved branches may use `base-and-foreground`;
- fog or other transparent treatment must be explicitly classified;
- omission is an error, not an implicit live or baked default.

HPA-399 uses the registry to generate controls and masks. HPA-406 later decides runtime suppression and fallback behavior.

## Fingerprinting

The control package records three SHA-256 fingerprints.

### Gameplay source fingerprint

Canonicalize and hash:

- map dimensions and spawn;
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
- player collision radius;
- source hashes for region and collision-helper files.

Collections sort by source type and ID, so authoring order alone does not change the fingerprint.

### Authoring contract fingerprint

Canonicalize and hash:

- authoring-region registry;
- bake-disposition registry;
- crop registry;
- overlap ownership and draw order;
- `MEADOW_ENTRY_MIN_HANDOFF_PX`;
- material profiles;
- mask constants;
- binary-storage mode and configuration;
- size-budget formulas;
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

It writes only this fixed inventory under `docs/superpowers/reports/img/hpa-399/controls/`:

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
meadow-entry-bake-ownership.json
meadow-entry-crop-manifest.json
```

All SVGs use `viewBox="0 0 6400 6400"`.

### Terrain and paths

Derive from every `groundPatch`, preserving tile/material identity, primary region, connector membership, and contributing source IDs.

### Collision

Use the same strict and landmark collectors as save normalization, expanded by `PLAYER_COLLISION_RADIUS`. Include blockers, fences, decor collision, and doorway-carved landmark geometry. The mask is alignment control only; runtime collision remains live.

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
- region-specific visibility corridors.

`foreground-eligible` comes only from explicit `base-and-foreground` entries after subtracting protected-live geometry. Foreground pixels outside the mask are forbidden.

### Handoffs

Show every crop intersection and semantic route crossing. Distinguish route continuity, base-material continuity, and foreground continuity.

## Crop and overlap registry

Add:

```text
src/lib/game/content/backgrounds/meadow-entry-crop-manifest.ts
```

```ts
export const MEADOW_ENTRY_MIN_HANDOFF_PX = 128;

type MeadowEntryCropId =
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

Each crop rectangle is derived deterministically:

1. compute the declared source/review envelope;
2. expand by `MEADOW_ENTRY_MIN_HANDOFF_PX`;
3. snap outward to the `32px` grid;
4. clamp to `[0,6400)`;
5. compare with the checked-in approved rectangle;
6. fail if derived and approved bounds differ.

The Sundrop underlay is exactly:

```text
left=256, top=4352, right=2048, bottom=5888
width=1792, height=1536
```

It contains base underpaint only. HPA-406 renders it before the immutable HPA-398 base.

### Crop manifest

```ts
interface MeadowEntryCropManifestEntry {
  id: MeadowEntryCropId;
  bounds: PixelBounds;
  expectedDimensions: { width: number; height: number };
  baseFilename: string;
  foregroundFilename: string | null;
  textureKeys: { base: string; foreground: string | null };
  plane: { base: 'base'; foreground: 'foreground' | null };
  drawOrder: number;
  sourceRegionIds: readonly MeadowEntryAuthoringRegionId[];
  neighborIds: readonly MeadowEntryCropId[];
  overlapIds: readonly string[];
  sourceControlFingerprint: string;
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

Texture keys and filenames are stable HPA-406 APIs.

### Overlap manifest

```ts
interface MeadowEntryOverlap {
  id: string;
  firstCropId: MeadowEntryCropId;
  secondCropId: MeadowEntryCropId;
  bounds: PixelBounds;
  minimumWidthOrHeight: typeof MEADOW_ENTRY_MIN_HANDOFF_PX;
  planePolicy: 'base-only' | 'base-and-foreground';
  ownerCropId: MeadowEntryCropId;
}
```

Rules:

- overlap bounds equal the exact crop intersection;
- every route handoff has at least `MEADOW_ENTRY_MIN_HANDOFF_PX` shared pixels;
- overlap pixels are direct samples of identical master coordinates;
- decoded RGBA is byte-identical across both exports for every shared plane;
- Sundrop-underlay overlaps are base-only;
- `ownerCropId` defines runtime creation/ownership order, not different pixels;
- corner overlaps validate in two dimensions;
- edits regenerate every crop intersecting the modified master area.

## Sundrop predecessor integration

HPA-399 records and validates:

- `public/game/assets/regions/sundrop-village-base.png`;
- `public/game/assets/regions/sundrop-village-foreground.png`;
- `sundropVillageBackgroundsApproval`;
- HPA-398 controls and provenance;
- exact Sundrop world bounds;
- the HPA-398 base alpha function and `64px` feather.

No HPA-399 command may write those files or any HPA-307/HPA-398 evidence directory.

The HPA-399 base master is opaque beneath Sundrop. The HPA-399 foreground master excludes HPA-398 village foreground pixels. Review composition renders:

1. HPA-399 base master;
2. immutable HPA-398 Sundrop base;
3. HPA-399 foreground master;
4. immutable HPA-398 Sundrop foreground;
5. protected-live review silhouettes.

This composite is evidence, not another master or runtime asset. Tests verify predecessor hashes remain unchanged and all four feathered edges blend over the new underlay.

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
- per-entry front cutoffs derived from player display height and collision radius;
- never hide a complete enemy, reward, route, transition, or interaction point.

### Material profiles

- Sundrop underlay: warm village transition compatible with HPA-398;
- Crossroads: worn cobblestone, festival-road earth, mixed regional cues;
- Tidewatch Coast: sand, salt grass, shoreline, tidepool, driftwood, low rock;
- Mistfen: mud, shallow pools, damp roots, reeds, deadfall, low fog-ground treatment;
- Silverpine: autumn floor, ceremonial path, terrace stone, pine, maple, shrine approach;
- Wildwood: forest floor, roots, brush, combat framing, cave approach;
- connectors: gradual interpolation between endpoint profiles.

Profiles constrain palette, texture scale, value range, and density, never gameplay geometry.

## Production and refinement

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

Provenance records control/source/predecessor hashes, tool and Sharp versions, candidate dimensions and hashes, transforms, masks, prompts or manual-production declarations, refinements, final hashes, storage mode, and byte counts.

## Binary storage gate

The baseline repository has no `.gitattributes`, and `artifacts/` is not ignored. Therefore PR 2 may not add master or export PNGs until PR 1 selects and validates one durable storage mode.

### Mode A — Git LFS, preferred

- add `.gitattributes` for `artifacts/meadow-entry/hpa-399/**/*.png`;
- store PNG objects through Git LFS while JSON, TypeScript, Markdown, and small SVG controls remain ordinary Git;
- CI verifies pointer form, `git lfs fsck`, object availability, and clean checkout materialization;
- HPA-406 consumes materialized exact bytes and verifies hashes.

### Mode B — Content-addressed external storage

- keep masters and exports in a durable immutable content-addressed location;
- commit manifests, hashes, provenance, approval data, and a deterministic materialization command;
- CI fetches and verifies all required bytes;
- HPA-406 consumes only verified hashes and never regenerates or recompresses them.

### Mode C — Ordinary Git by explicit exception

Ordinary Git is not the default. It requires a reviewed design exception that:

- explicitly accepts permanent repository-history growth;
- proves every tracked blob is below the `95 MiB` transport ceiling;
- commits only the final approved package, never intermediate candidates or refinements;
- rewrites/squashes pre-merge PR history so superseded package bytes do not remain in the branch;
- records the aggregate package size and expected future replacement cost.

Storage mode is part of the authoring-contract fingerprint. Changing it invalidates approval.

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

The Sundrop underlay has no foreground file. Every other crop has a foreground PNG, even when fully transparent, so HPA-406 can rely on stable filenames and dimensions.

Commands:

```sh
bun run art:controls:meadow-entry
bun run art:finalize:meadow-entry
bun run art:export:meadow-entry
bun run art:proof:meadow-entry
bun run art:validate:meadow-entry
```

The exporter refuses stale controls, predecessor drift, approval mismatch, invalid dimensions/alpha, stale manifests, unselected storage mode, unavailable storage objects, or paths outside the fixed inventory.

HPA-406 promotes or materializes exact approved export bytes. It must not resize, recompress, recolor, or regenerate them.

## Size budgets

A decoded `6400×6400` RGBA master is `163,840,000` bytes, or `156.25 MiB`. Therefore `95 MiB` is an ordinary-Git transport ceiling, not an art-quality hard limit.

Operational compressed-PNG budgets are storage-mode independent:

| Asset | Review target | Hard limit |
| --- | ---: | ---: |
| Base master | `96 MiB` | `192 MiB` |
| Foreground master | `32 MiB` | `96 MiB` |
| All regional exports combined | `128 MiB` | `256 MiB` |

Per-crop budgets derive from crop area:

```text
base review = max(1 MiB, ceil(96 MiB × cropArea / masterArea))
base hard   = max(2 MiB, ceil(192 MiB × cropArea / masterArea))

foreground review = max(512 KiB, ceil(32 MiB × cropArea / masterArea))
foreground hard   = max(1 MiB, ceil(96 MiB × cropArea / masterArea))
```

Review-target exceptions require approval data. Operational hard limits require a new design review. Under Mode C, each tracked blob must additionally stay below `95 MiB`; exceeding that ceiling disqualifies ordinary Git rather than rejecting otherwise valid art.

## Approval contract

Add:

```text
src/lib/game/content/approvals/meadow-entry-art-package.ts
```

Record:

- combined control fingerprint;
- selected storage mode and storage-configuration hash;
- base and foreground master hashes, sizes, and exceptions;
- crop-manifest hash;
- per-export hashes, dimensions, and exceptions;
- provenance hashes;
- external object identifiers or LFS pointer/object validation where applicable;
- evidence report path.

Approvals are data, not snapshots. Updating them requires native-resolution review of the complete master before any crop is accepted.

## Validation

### Control tests

- every source reference resolves;
- every source has one primary authoring region;
- every visual-capable source has exactly one bake disposition;
- non-visual semantic controls such as combat bounds and discoveries have explicit `control-only` dispositions;
- protected-live objects never receive baked ownership;
- all region and crop bounds stay inside `6400×6400`;
- derived crops equal approved rectangles;
- every handoff satisfies `MEADOW_ENTRY_MIN_HANDOFF_PX`;
- repeated control export is byte-identical;
- storage mode is selected and configuration matches that mode;
- HPA-307 and HPA-398 inputs remain unchanged.

### Master tests

- exact `6400×6400` RGBA dimensions;
- base fully opaque;
- foreground zero RGB outside positive alpha;
- foreground alpha zero outside eligible mask;
- no protected-live or forbidden-tall violations;
- static obstacle paint covers declared extents;
- route, doorway, transition, encounter, and reward clearances remain visually unobstructed;
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
- provenance lists every input and transform;
- regeneration from unchanged masters is byte-identical;
- no master or export is under `public/`;
- LFS pointers/objects or external content-addressed objects validate when selected;
- ordinary Git contains no unapproved binary package when Mode C is not selected.

### Review proofs

Generate full controls, base, foreground-on-checkerboard, immutable-Sundrop composite, every region and connector at native resolution, protected/collision/eligibility overlays, every overlap difference image, and four Sundrop feather-over-underlay edge proofs.

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

- Mode A runs `git lfs fsck` and pointer/materialization checks;
- Mode B runs the deterministic materialization and hash-verification command;
- Mode C runs ordinary-Git blob and aggregate-history guards.

HPA-399 does not claim runtime traversal, fallback, save/reload, controller feel, GPU residency, or complete opening-map performance.

## Error handling

- Writers use fixed allowlists and reject HPA-307, HPA-398, `public/`, and unrelated paths.
- Generated text uses canonical ordering and normalized newlines.
- Master/export writes are temporary and atomic.
- Unresolved sources report type, ID, expected region, and registry file.
- Crop failures report crop ID, approved/derived bounds, and contributors.
- Overlap failures report both crops, plane, master coordinate, and first differing pixel.
- Protected-mask failures report source, coordinate, and intersecting bake entry.
- Storage failures report mode, object/path, expected hash, and materialization state.
- Stale fingerprints block finalization rather than refreshing approvals.
- Hard-budget failures leave approved bytes untouched.
- Source corrections regenerate the global master and every intersecting export; tooling never patches a disconnected crop.

## PR stack

### PR 1 — Source contract, controls, crop manifest, and storage gate

Deliver:

- reviewed design;
- authoring-region registry;
- bake-disposition registry;
- crop and overlap registry;
- `MEADOW_ENTRY_MIN_HANDOFF_PX`;
- deterministic controls and generated fingerprint;
- fixed inventories and guards;
- selected binary-storage mode and its configuration/tests;
- completeness, crop, overlap, predecessor-freeze, and storage tests;
- full control review evidence.

Review gate: approve the complete control package, crop contract, and storage mode before any HPA-399 art is accepted.

### PR 2 — Visual masters and approved exports

Deliver through the selected storage mode:

- canonical base and foreground masters;
- Sundrop underlay;
- all regional and connector exports;
- finalizer, exporter, proof, and validation tools;
- approvals, provenance, and native-resolution evidence;
- master, mask, overlap, storage, budget, and reproducibility tests;
- final validation report.

Review gate: approve the full-map master and immutable Sundrop overlay composition before accepting any individual export.

## Risks and mitigations

### Small geometry is lost

A `6400×6400` world contains narrow `64px` routes and small transition throats.

Mitigation: source masks remain authoritative, normalization forbids warping, native-resolution controls remain visible, and refinements use controlled masks on the full master.

### Regional refinements drift

Mitigation: refinements start from the current master, retain material/lighting contracts, and require recomposition plus complete overlap regeneration.

### Sundrop does not blend

Mitigation: render a direct global-master underlay below immutable feathered HPA-398 bytes and review all four edges.

### Static ownership is incomplete

Mitigation: omission is a hard error. Every blocker, fence, decor, and semantic control receives an explicit disposition.

### Runtime package silently grows

Mitigation: HPA-399 stays outside `public`; HPA-406 deliberately promotes exact exports and owns runtime loading/memory decisions.

### Git history becomes permanently large

Mitigation: PR 2 is blocked on the binary-storage gate. Git LFS is preferred; external content-addressed storage is supported; ordinary Git requires explicit acceptance, one final binary commit, pre-merge history cleanup, and a documented future replacement cost.

### Base master exceeds 95 MiB

Mitigation: `95 MiB` is only the Mode C transport ceiling. A larger valid master uses LFS or external storage and is judged against the `192 MiB` operational hard limit.

## Definition of done

HPA-399 is complete when:

- one command regenerates the full controls and crop manifest deterministically;
- every region, connector, handoff, and source is accounted for;
- one approved opaque base master and one approved sparse foreground master define the non-live environmental surface;
- a durable binary-storage mode is selected, validated, and fingerprinted;
- immutable HPA-398 Sundrop assets remain byte-identical and blend over the underlay;
- every Crossroads, connector, Coast, Mistfen, Silverpine, Wildwood, and Sundrop-underlay export derives from the approved masters;
- all neighboring overlap pixels are byte-identical;
- protected live objects, gameplay clearances, collision controls, dimensions, fingerprints, alpha policies, provenance, storage, and budgets pass;
- check, lint, unit, browser build, and Tauri build gates pass;
- HPA-406 can consume exact approved bytes without redesigning, regenerating, recompressing, or interpreting the art package.
