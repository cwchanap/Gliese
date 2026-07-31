# HPA-399 Full Meadow-Entry Authoring Package — Design

> Issue: HPA-399, “Produce the full meadow-entry control master, visual master, and regional exports.”
>
> Baseline: `main` at `3f16a17b2adbe25d9271ff4bc000b24d4cdf6beb`, including merged HPA-398 / PR #16.
>
> Delivery: a short two-PR stack under HPA-399. The first PR locks source-derived controls and crop contracts. The second PR adds the approved visual masters and all deterministic exports. HPA-399 does not register or integrate the non-village exports at runtime.

## Problem

HPA-398 established the reusable runtime contract for independent base and foreground background planes, collision-preserving live fallbacks, exact render diagnostics, and a complete Sundrop Village obstacle proof. HPA-399 must now produce the authoring package that lets HPA-406 integrate the rest of the `meadow-entry` outdoor map without independently designing or generating disconnected regions.

The target map is `200×200` tiles at `32px`, so the world-space authoring canvas is exactly `6400×6400` pixels. The live composed map remains authoritative for gameplay, but its current shape is not sufficient as a full-map art source:

- `mergeRegions(...)` preserves object geometry but discards semantic source-region ownership;
- non-village static visual geometry is split across `groundPatches`, `blockers`, `mapDecor`, and `fences`;
- HPA-398 runtime ownership exists only for `MapBlocker`, while many trees, reeds, rocks, deadfall, canopies, fog volumes, walls, and environmental props are represented as `MapDecor`;
- building exteriors and major gates are live semantic visuals and must not be accidentally baked with nearby static dressing;
- Sundrop Village already has approved HPA-398 base and foreground assets whose bytes, fingerprints, evidence, and historical inputs must remain immutable;
- placing unintegrated regional exports under `public/` would alter the shipped application before HPA-406 owns runtime registration;
- direct per-region production would allow lighting, palette, road alignment, and overlap pixels to drift.

HPA-399 therefore needs a deterministic authoring layer above the live map, not a second gameplay map and not an expansion of the runtime renderer.

## Approved decisions

The design dialogue locked these decisions:

1. Use a global-master-first workflow with one canonical `6400×6400` base authoring master and one canonical `6400×6400` sparse foreground master.
2. Allow controlled regional refinement only as source-masked edits applied back to the canonical masters.
3. Never accept an independently produced regional master and never directly retouch a runtime crop.
4. Keep HPA-399 authoring-only. Runtime registration, descriptor insertion, and live visual suppression for non-village regions remain HPA-406 work.
5. Preserve the approved HPA-398 Sundrop base and foreground files byte-for-byte. Treat them as immutable predecessor overlays, not HPA-399 outputs.
6. Produce a Sundrop underlay export from the global base master so the existing feathered HPA-398 base blends into the new surrounding world without changing its bytes.
7. Use explicit authoring-region and bake-disposition registries rather than inferring semantic ownership from bounding boxes.
8. Use half-open integer world rectangles, `32px`-aligned crop edges, and a minimum `128px` shared overlap at every declared handoff.
9. Generate every HPA-399 export from the approved master bytes through one deterministic exporter.
10. Keep approved masters and exports outside `public/` until HPA-406 promotes exact bytes into runtime paths.
11. Deliver the control package and art package as two reviewable PRs under the one Linear ticket.
12. Preserve all HPA-307 and HPA-398 tools, fixed inventories, generated fingerprints, reports, and evidence directories without modification unless a separate migration is explicitly approved.

## Goals

- Generate a complete, reviewable full-map control package from live map sources.
- Preserve one exact world-to-pixel coordinate system across controls, masters, crops, and runtime integration.
- Restore semantic region provenance that is currently lost during map composition.
- Classify every visual-capable source object as baked, foreground-eligible, protected live, or control-only.
- Produce one coherent base material system and one coherent foreground occlusion system for the full opening map.
- Preserve continuous roads, terrain transitions, connector mouths, and handoff pixels.
- Provide HPA-406 with immutable, fingerprinted, directly consumable regional assets.
- Fail fast when gameplay geometry, source files, crop contracts, predecessor assets, or approved art bytes drift.
- Keep buildings, NPCs, pickups, transitions, encounters, discoveries, story gates, and stateful or animated objects live.
- Preserve hidden authoritative collision; no collision is derived from raster pixels.

## Non-goals

- No runtime registration or rendering integration for Crossroads, connector roads, Coast, Mistfen, Silverpine, or Wildwood.
- No extension of `WorldScene` visual-ownership behavior for `MapDecor` or fences.
- No gameplay route, collision, encounter, transition, reward, or room-graph redesign.
- No replacement or regeneration of the HPA-398 Sundrop base or foreground assets.
- No building exterior, gate, NPC, pickup, transition, encounter, discovery, quest object, stateful object, or animated object baking.
- No independently generated regional art.
- No interior artwork.
- No day/night, weather, seasonal, parallax, or animated baked-background variants.
- No use of PNG pixels as semantic or collision truth.
- No final whole-map runtime, traversal, fallback, GPU, or save acceptance; HPA-406 and HPA-411 own those gates.

## Authoritative sources

The following remain gameplay truth:

- `src/lib/game/content/maps/meadow-entry.ts` — final region composition and `6400×6400` world contract;
- `src/lib/game/content/maps/regions/*.ts` — Coast, Crossroads, Mistfen, Paths, Silverpine, Village, and Wildwood source fragments;
- `src/lib/game/content/maps/regions/village-layered.ts` and `compileLayeredRegion(...)` — Sundrop authored geometry;
- `collectStrictCollisionRects(...)`, `collectLandmarkRects(...)`, and doorway carving in `save-state.ts` — collision and protected-building geometry matching runtime movement/save behavior;
- `PLAYER_COLLISION_RADIUS` — movement clearance expansion;
- HPA-398 ownership, control, approval, provenance, and production assets — approved Sundrop visual behavior;
- `WorldScene` plane depths from HPA-398 — base `-9`, live world `0`, foreground `100`, collision debug `10_000`.

The authoring registry introduced by HPA-399 adds provenance and visual-production intent. It does not replace or override any gameplay source.

## Coordinate contract

### World and master coordinates

The authoring coordinate system is fixed:

```text
world bounds: [0, 6400) × [0, 6400)
origin: top-left
+x: right
+y: down
scale: 1 world pixel = 1 master pixel
tile size: 32px
```

Runtime map rectangles remain center-based. Authoring and crop manifests serialize rectangles as half-open edge bounds:

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

All serialized crop edges must be integers, multiples of `32`, inside the full master, and have positive dimensions. The exporter rejects fractional, inverted, clipped, or out-of-bounds rectangles.

### Pixel identity

For every HPA-399-produced asset, pixel `(localX, localY)` maps to:

```text
masterX = crop.left + localX
masterY = crop.top + localY
```

No resampling, rotation, perspective transform, non-uniform scale, color correction, sharpening, or crop-local retouch is permitted during export. Runtime PNGs are direct decoded-pixel crops of the approved master followed only by deterministic PNG encoding.

## Authoring-region registry

Add an authoring-only registry:

```text
src/lib/game/content/backgrounds/meadow-entry-authoring-layout.ts
```

It defines these semantic regions:

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
```

Each entry contains:

```ts
interface MeadowEntryAuthoringRegion {
  id: MeadowEntryAuthoringRegionId;
  sourceRefs: readonly MeadowEntrySourceRef[];
  reviewBounds: PixelBounds;
  materialProfile: MeadowEntryMaterialProfileId;
  neighbors: readonly MeadowEntryAuthoringRegionId[];
}
```

A `MeadowEntrySourceRef` identifies one live source by type and exact ID:

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

- every referenced ID must resolve against the assembled `meadowEntryMap`;
- every resolved visual/gameplay source must have exactly one primary authoring region;
- a source may appear in an additional connector or handoff review set, but secondary membership never changes primary ownership;
- connector sources remain explicit; they are not assigned by “nearest region” heuristics;
- `reviewBounds` are checked-in, `32px`-aligned envelopes and are included in the authoring fingerprint;
- the `outer-boundary` region owns map-edge controls but has no independent runtime export.

This registry restores provenance without changing `RegionFragment`, `WorldMapDefinition`, or runtime map composition.

## Bake-disposition registry

Add:

```text
src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts
```

The registry classifies every visual-capable source:

```ts
type MeadowEntryBakeDisposition =
  | { mode: 'base-underlay' }
  | {
      mode: 'base-static';
      margins: Insets;
      motif: string;
    }
  | {
      mode: 'base-and-foreground';
      baseMargins: Insets;
      foregroundMargins: Insets;
      frontCutoffPx: number;
      motif: string;
    }
  | {
      mode: 'protected-live';
      protectionMargins: Insets;
      reason: string;
    }
  | {
      mode: 'control-only';
      reason: string;
    };
```

Each entry contains an exact source reference and primary authoring region.

Default policies are deliberately strict:

- all `groundPatches` are `base-underlay`;
- all landmarks and their doorway approaches are `protected-live`;
- all transitions, NPCs, ambient NPCs, pickups, encounters, combat bounds, and discoveries are `protected-live` or `control-only`;
- all major building, shrine, cave, castle, and story-gate visuals remain `protected-live`;
- a blocker, fence, or decor item may be baked only through an explicit registry entry;
- colliding decor may be baked visually while its collision remains live and authoritative;
- non-colliding low-profile decor may be baked into base;
- canopies, hedge tops, wall fronts, arches, tall reeds, and approved branches may use `base-and-foreground`;
- fog or other partially transparent environmental treatment must be explicitly classified and may not silently disappear into the master;
- omission from the registry is an error, not an implicit live or baked default.

HPA-399 uses this registry to generate controls and art masks. HPA-406 later decides how corresponding live visuals are suppressed, retained, or represented as fallback. HPA-399 does not change runtime ownership metadata.

## Fingerprinting

The control package records three fingerprints:

### Gameplay source fingerprint

Canonical SHA-256 over the assembled live map inputs relevant to art:

- map dimensions and spawn;
- ground patches;
- blockers, including visual ownership metadata already introduced by HPA-398;
- decor and decor collision;
- fences;
- landmarks and carved entrances;
- transitions;
- NPCs and ambient NPCs;
- pickups;
- encounters and combat bounds;
- discoveries;
- player collision radius;
- source file hashes for all region and collision-helper files.

Collections are sorted by source type and ID. Authoring order alone does not change the fingerprint.

### Authoring contract fingerprint

Canonical SHA-256 over:

- authoring-region registry;
- bake-disposition registry;
- crop registry;
- overlap ownership and draw order;
- material profiles;
- mask expansion constants;
- size-budget formulas;
- master dimensions and alpha policies.

### Combined control fingerprint

SHA-256 over the two fingerprints plus immutable predecessor inputs:

- approved HPA-398 control fingerprint;
- approved HPA-398 base SHA-256;
- approved HPA-398 foreground SHA-256;
- required HPA-307 artifact hashes that HPA-398 already treats as historical source inputs.

Any drift invalidates the HPA-399 approval and blocks finalization or export.

## Full-map control package

Add one deterministic command:

```sh
bun run art:controls:meadow-entry
```

It writes only a fixed inventory under:

```text
docs/superpowers/reports/img/hpa-399/controls/
```

Required artifacts:

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

All SVG artifacts use `viewBox="0 0 6400 6400"`.

### Terrain and path intent

Derived from every `groundPatch`, including tile/material identity, plus source region and connector membership. Overlaps are not flattened into anonymous color; the manifest preserves each contributing source ID.

### Collision

Derived through the same strict and landmark collision collectors used by save normalization, expanded by `PLAYER_COLLISION_RADIUS`. It includes blocker, fence, decor collision, and doorway-carved landmark geometry.

The mask is a review and alignment control only. Runtime collision remains live.

### Building footprints and entrances

Landmark footprints are protected. Entrance controls combine carved doorway geometry with transition approach clearances. Foundation/contact shadow treatment may enter an explicit shallow base margin but cannot paint a wall, door, stair, threshold blocker, or false entrance.

### Encounters and combat bounds

Encounter anchors and full combat rectangles remain visible in controls. Base texture may vary inside them, but foreground treatment must preserve enemy and pickup readability and cannot create false walls or hidden chokepoints.

### Rewards, discoveries, and semantic anchors

Controls include spawn, NPC, ambient NPC, pickup, discovery, transition, encounter, landmark, and major live-decor anchors. Protected extents use type-specific dimensions declared in one source module rather than duplicated ad hoc across renderers.

### Forbidden-tall and foreground-eligible masks

`forbidden-tall` is conservative. It covers:

- all walkable space;
- player-radius-expanded routes;
- transition and doorway approaches;
- NPC, pickup, encounter, discovery, and reward interaction clearances;
- live object footprints;
- any region-specific visibility corridor identified in the registry.

`foreground-eligible` is produced only from explicit `base-and-foreground` entries after subtracting protected-live geometry. Foreground pixels outside this mask are forbidden.

### Handoffs

The handoff mask shows every declared crop intersection and every semantic route crossing between authoring regions. It distinguishes route continuity, base-material continuity, and foreground continuity.

## Crop registry and manifest

Add a checked-in crop registry:

```text
src/lib/game/content/backgrounds/meadow-entry-crop-manifest.ts
```

The fixed export set is:

```ts
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

### Crop derivation

Each crop names a fixed set of authoring regions and source references. Its rectangle is derived deterministically:

1. compute the edge envelope of the declared source and review bounds;
2. expand by `128px`;
3. snap outward to the `32px` grid;
4. clamp to `[0,6400)`;
5. compare against the checked-in approved rectangle;
6. fail when the derived and approved rectangles differ.

This provides deterministic derivation while keeping the exact reviewed crop rectangles under source control.

The `sundrop-village-underlay` rectangle is the exact HPA-398 village bounds:

```text
left=256, top=4352, right=2048, bottom=5888
width=1792, height=1536
```

It contains base underpaint from the global master and no HPA-399 foreground export. At runtime, HPA-406 must render it before the immutable HPA-398 base so the approved `64px` feather blends into the new world.

### Manifest fields

Each crop contains:

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

Texture keys and filenames are stable API for HPA-406 and cannot be renamed without invalidating approval.

### Overlap contract

Every declared neighbor pair has an overlap entry:

```ts
interface MeadowEntryOverlap {
  id: string;
  firstCropId: MeadowEntryCropId;
  secondCropId: MeadowEntryCropId;
  bounds: PixelBounds;
  minimumWidthOrHeight: 128;
  planePolicy: 'base-only' | 'base-and-foreground';
  ownerCropId: MeadowEntryCropId;
}
```

Rules:

- the overlap is the exact intersection of the two approved crop rectangles;
- every route handoff has at least a `128px` shared strip;
- all overlap pixels are direct samples of the same master coordinates;
- decoded RGBA must be byte-identical across both exports for every plane present in both crops;
- overlaps involving `sundrop-village-underlay` are `base-only`; the immutable HPA-398 foreground remains the village foreground owner;
- `ownerCropId` defines runtime creation and visual-ownership order, not different pixels;
- corner overlaps are validated in two dimensions;
- a source edit affecting an overlap requires regeneration of every crop intersecting that master area.

## Sundrop predecessor integration

HPA-398 remains a separate immutable visual overlay.

### Immutable inputs

HPA-399 records and validates:

- `public/game/assets/regions/sundrop-village-base.png`;
- `public/game/assets/regions/sundrop-village-foreground.png`;
- `sundropVillageBackgroundsApproval`;
- HPA-398 control and provenance fingerprints;
- the exact Sundrop world rectangle;
- the existing HPA-398 base alpha function and `64px` feather.

No HPA-399 command may write to these files or to `docs/superpowers/reports/img/hpa-307/` or `docs/superpowers/reports/img/hpa-398/`.

### Underlay and review composition

The global HPA-399 base master is opaque across the complete map, including beneath Sundrop. The `sundrop-village-underlay` crop comes directly from that master.

The global HPA-399 foreground master excludes the immutable HPA-398 foreground pixels. A derived full-map review composite renders:

1. HPA-399 base master;
2. HPA-398 Sundrop base at its exact world position;
3. HPA-399 foreground master;
4. HPA-398 Sundrop foreground at its exact world position;
5. protected live-object review silhouettes.

This derived composite is evidence, not a third authoring master and not a runtime asset.

The acceptance test verifies that the HPA-398 decoded pixels and hashes remain unchanged and that its feathered edge produces a continuous result over the new underlay.

## Visual master contract

### Base master

```text
artifacts/meadow-entry/hpa-399/masters/meadow-entry-base-master.png
```

Requirements:

- exactly `6400×6400` RGBA;
- alpha is `255` at every pixel;
- orthographic top-down view with no perspective tilt;
- one upper-left daylight direction compatible with approved Sundrop;
- continuous road centerlines and material transitions;
- regional material profiles without abrupt crop-local style changes;
- low-profile static obstacle art aligned to the bake-disposition controls;
- foundation/contact shadow treatment inside approved margins;
- quiet detail on routes, entrances, encounters, rewards, and transition throats;
- no text, signs, invented buildings, false entrances, or gameplay geometry.

### Foreground master

```text
artifacts/meadow-entry/hpa-399/masters/meadow-entry-foreground-master.png
```

Requirements:

- exactly `6400×6400` RGBA;
- transparent outside the foreground-eligible mask;
- decoded RGB is zero wherever alpha is zero;
- contains only approved hedge tops, tree canopies, wall fronts, arches, reeds, branches, and similar occlusion treatment;
- contains no live building, gate, NPC, pickup, encounter, transition, discovery, story object, or animated/stateful visual;
- respects per-entry front cutoffs derived from player display height and collision radius;
- never hides a complete enemy, reward, route, transition, or interaction point.

### Material profiles

The checked-in authoring registry names stable profiles:

- Sundrop underlay: warm green village transition compatible with HPA-398;
- Crossroads: worn cobblestone, festival-road earth, and mixed regional cues;
- Tidewatch Coast: sand, salt grass, shoreline, tidepool, driftwood, and low rock;
- Mistfen: mud, shallow pools, damp roots, reeds, deadfall, and low fog-ground treatment;
- Silverpine: autumn floor, ceremonial path, terrace stone, pine, maple, and shrine approach;
- Wildwood: forest floor, roots, brush, combat-pocket framing, and cave approach;
- connectors: gradual interpolation between their two endpoint profiles.

Profiles constrain palette, texture scale, value range, and detail density. They do not define gameplay geometry.

## Production and refinement workflow

### Initial global candidate

The first complete candidate establishes:

- overall composition;
- lighting direction;
- palette;
- road and terrain continuity;
- region-to-region material transitions;
- global detail hierarchy.

A generated or manually painted candidate may begin below native resolution, but normalization permits only:

- one reviewed exact-ratio crop;
- uniform scaling;
- deterministic compositing;
- no non-uniform scaling or local geometric warping.

The transform and native candidate dimensions are recorded.

### Controlled regional refinement

A region may be refined only when:

- the current full master has already been reviewed;
- the exact source-derived edit mask is recorded;
- protected-live, forbidden-tall, and non-target regions are excluded;
- the replacement is normalized through a recorded transform;
- the edit is composited into the canonical full master;
- every affected crop and overlap is regenerated.

Refinement output never becomes an independent accepted master. A disconnected crop cannot be copied directly into the export directory.

### Atomic finalization

Finalization writes to temporary paths, validates the complete candidate package, then atomically replaces the canonical master files. A failure leaves the last approved package untouched.

Required provenance includes:

- control fingerprints;
- source file hashes;
- predecessor hashes;
- tool and Sharp versions;
- native candidate hashes and dimensions;
- normalization transform;
- masks and mask hashes;
- generation prompts or manual-production declaration;
- each refinement mask, transform, source, and output hash;
- final master hashes and byte counts.

## Export package

Approved artifacts live outside `public/`:

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

The Sundrop underlay has no foreground file. Every other crop has a foreground PNG, even when it is fully transparent, so HPA-406 can rely on stable filenames and dimensions. A fully transparent foreground must still satisfy zero-RGB and budget rules.

Add commands:

```sh
bun run art:controls:meadow-entry
bun run art:finalize:meadow-entry
bun run art:export:meadow-entry
bun run art:proof:meadow-entry
bun run art:validate:meadow-entry
```

`art:export:meadow-entry` refuses to run when:

- controls are stale;
- predecessor hashes drift;
- approved master hashes do not match approval data;
- master dimensions or alpha policies fail;
- the crop manifest is stale;
- any requested output path is outside the fixed inventory.

HPA-406 promotes exact approved export bytes to runtime paths. It must not recompress, resize, recolor, or independently regenerate them.

## Size budgets

No Git LFS contract currently exists, so every tracked file must remain below GitHub's practical `100MiB` single-file boundary.

Master budgets:

| Asset | Review target | Hard limit |
| --- | ---: | ---: |
| Base master | `64 MiB` | `95 MiB` |
| Foreground master | `24 MiB` | `48 MiB` |
| All regional exports combined | `96 MiB` | `160 MiB` |

Per-crop budgets are generated deterministically from crop area:

```text
base review = max(1 MiB, ceil(64 MiB × cropArea / masterArea))
base hard   = max(2 MiB, ceil(95 MiB × cropArea / masterArea))

foreground review = max(512 KiB, ceil(24 MiB × cropArea / masterArea))
foreground hard   = max(1 MiB, ceil(48 MiB × cropArea / masterArea))
```

Review-target exceptions require a recorded reason in approval data. Hard limits cannot be exceeded without a new design review.

## Approval contract

Add:

```text
src/lib/game/content/approvals/meadow-entry-art-package.ts
```

It records:

- combined control fingerprint;
- base master SHA-256 and size exception;
- foreground master SHA-256 and size exception;
- exact crop manifest SHA-256;
- per-export SHA-256, dimensions, and exceptions;
- provenance file hashes;
- evidence report path.

Approvals are data, not test snapshots. Updating an approval requires explicit native-resolution review of the complete master before any crop is accepted.

## Validation

### Control tests

- every source reference resolves;
- every visual-capable source has exactly one bake disposition;
- every source has one primary authoring region;
- protected-live objects never receive baked ownership;
- authoring region and crop bounds stay inside `6400×6400`;
- derived crop rectangles equal approved checked-in rectangles;
- every declared handoff intersection is at least `128px`;
- all controls use the fixed output inventory;
- repeated control export is byte-identical;
- HPA-307 and HPA-398 evidence and approval inputs remain unchanged.

### Master tests

- exact `6400×6400` RGBA dimensions;
- base alpha is fully opaque;
- foreground RGB is zero outside positive alpha;
- foreground alpha is zero outside the eligible mask;
- protected-live and forbidden-tall violations are zero;
- static obstacle paint covers its declared control extent;
- route, doorway, transition, encounter, and reward clearances remain visually unobstructed;
- approved hashes and budgets match.

Pixel tests cannot prove artistic quality. Native-resolution visual review remains an explicit gate.

### Export tests

- every manifest file exists;
- dimensions equal crop bounds;
- decoded crop pixels equal the corresponding master pixels;
- all declared base and foreground overlap pixels are byte-identical;
- no crop extends beyond the master;
- filenames, texture keys, plane metadata, draw order, and source fingerprints match;
- transparent foregrounds have zero RGB;
- provenance lists every input and transform;
- regeneration from unchanged masters is byte-identical;
- no export or master path exists under `public/`.

### Review proofs

Generate:

- full control composite;
- full base master;
- full foreground master on checkerboard;
- full review composite including immutable Sundrop overlays;
- each region at native resolution;
- every connector and handoff at native resolution;
- protected-live overlay;
- collision overlay;
- foreground eligibility and forbidden-tall overlays;
- every overlap pair with difference image;
- Sundrop feather-over-underlay proofs on all four edges.

### Repository gates

Before final acceptance:

```sh
bun run art:controls:meadow-entry
bun run art:validate:meadow-entry
bun run check
bun run lint
bun run test:unit -- --run
bun run build
bun run tauri build
```

HPA-399 does not claim runtime traversal, fallback, save/reload, controller feel, GPU residency, or complete opening-map performance. Those claims begin after HPA-406 integration.

## Error handling

- Every writer has a fixed allowlist and rejects writes into HPA-307, HPA-398, `public/`, or unrelated paths.
- Every generated text file uses canonical ordering and normalized newlines.
- Master and export writes are temporary and atomic.
- An unresolved source ID reports source type, ID, expected region, and registry file.
- A crop failure reports crop ID, approved bounds, derived bounds, and contributing sources.
- An overlap failure reports both crop IDs, plane, master coordinates, and first differing pixel.
- A protected-mask violation reports source ID, source type, master coordinates, and intersecting bake entry.
- A stale fingerprint blocks finalization rather than silently refreshing approval data.
- A hard budget failure leaves previous approved bytes untouched.
- Source-master corrections regenerate the global master and every intersecting export; the tooling never patches a disconnected crop.

## PR stack

### PR 1 — Source contract, controls, and crop manifest

Deliver:

- reviewed design document;
- authoring-region registry;
- bake-disposition registry;
- crop and overlap registry;
- deterministic controls;
- generated control fingerprint;
- fixed inventories and output guards;
- control, completeness, crop, overlap, and predecessor-freeze tests;
- full control review evidence.

Review gate: approve the complete global control package and exact crop contract before any HPA-399 art is accepted.

### PR 2 — Visual masters and approved export package

Deliver:

- canonical base master;
- canonical foreground master;
- Sundrop underlay;
- all regional and connector exports;
- finalizer, exporter, proof, and validation tools;
- master and export approvals;
- provenance and native-resolution evidence;
- master, mask, overlap, budget, and reproducibility tests;
- final validation report.

Review gate: approve the complete full-map master and immutable Sundrop overlay composition before accepting any individual runtime export.

## Risks and mitigations

### Full-map candidate loses small geometry

A `6400×6400` world contains narrow `64px` roads and small transition throats.

Mitigation: source masks remain authoritative, normalization forbids warping, quiet-route controls are overlaid at native resolution, and local refinements are allowed only through controlled masks applied to the full master.

### Regional refinements drift stylistically

Mitigation: every refinement starts from the current master, uses the same material profile and lighting contract, and is accepted only after recomposition and complete overlap regeneration.

### HPA-398 village and new world do not blend

Mitigation: produce the exact Sundrop underlay from the global base master, render it below the immutable feathered HPA-398 base, and review all four edge proofs in the derived full-map composition.

### Static decor ownership is incomplete

Mitigation: omission is a hard error. Every blocker, fence, and decor object must receive an explicit disposition before control approval.

### Art package silently changes runtime size

Mitigation: HPA-399 stores outputs outside `public/`. HPA-406 deliberately promotes and registers exact approved exports and owns runtime memory/loading decisions.

### Repository becomes too large

Mitigation: master and package budgets are fixed before production, every file stays below `100MiB`, and no unapproved candidates are retained in the final branch.

## Definition of done

HPA-399 is complete when:

- one command deterministically regenerates the full source-derived control package and crop manifest;
- the authoring registry accounts for every gameplay region, connector, handoff, and visual-capable source;
- one approved opaque `6400×6400` base master and one approved sparse `6400×6400` foreground master define the non-live environmental surface;
- immutable HPA-398 Sundrop assets remain byte-identical and blend over the approved Sundrop underlay;
- every Crossroads, connector, Coast, Mistfen, Silverpine, Wildwood, and Sundrop-underlay export is derived from the approved master package;
- all neighboring HPA-399 overlap pixels are byte-identical;
- protected live objects, gameplay clearances, collision controls, dimensions, fingerprints, alpha policies, provenance, and budgets pass;
- check, lint, unit, browser build, and Tauri build gates pass;
- HPA-406 can consume the exact approved export bytes without redesigning, regenerating, or interpreting the art package.
