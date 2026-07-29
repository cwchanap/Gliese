# HPA-398 Outdoor Baked-Obstacle Runtime and Sundrop Proof — Design

> Issue: HPA-398, “Build the outdoor baked-obstacle runtime and prove it in
> Sundrop Village.”
>
> Baseline: `main` at `4fb4ea6`, including the merged HPA-307 regional-background
> prototype.
>
> Delivery: one consolidated PR with checkpointed commits. HPA-398 absorbs the
> former HPA-401, HPA-402, and HPA-403 scopes; no replacement Linear issues are
> created for its internal checkpoints.

## Problem

HPA-307 proved that a source-derived, opaque `1792×1536` image can replace
Sundrop Village's fallback tile surface while the layered map remains
authoritative for gameplay. The current implementation deliberately keeps live
`garden-hedge` sprites visible because the HPA-307 background contains ground
only. That produces the remaining visual mismatch: the cohesive baked ground is
overlaid by repeated hedge sprites whose style and cadence do not belong to the
painted surface.

The current runtime also has no reusable way to solve that mismatch safely:

- `MapBackgroundImage` has an arbitrary numeric depth but no semantic plane;
- `WorldScene` does not retain which image descriptors actually rendered;
- a `MapBlocker` owns collision and implicitly owns one live visual;
- blocker collision and live rendering are coupled inside `renderBlockers(...)`;
- there is no regional foreground image plane above the player;
- disabling, losing, or invalidating baked obstacle art cannot selectively
  restore the matching live obstacle.

HPA-398 adds the reusable runtime contract and proves it in Sundrop without
changing the village room graph, routes, interactions, or building ownership.

## Approved decisions

The design dialogue locked these decisions:

1. Deliver HPA-398 through one consolidated PR, not a stacked PR series.
2. Extend the existing per-image descriptor model rather than replacing it with
   grouped regional-background objects.
3. Preserve the approved HPA-307 ground master. The HPA-398 base may change
   decoded pixel values only inside source-derived obstacle masks plus a small,
   recorded seam/shadow margin.
4. A fallback-only blocker whose visual spans more than one image is suppressed
   only when every declared owner image rendered successfully.
5. A missing, invalid, disabled, or failed owner restores the complete live
   obstacle, even if that creates minor duplication with another valid plane in
   a degraded mode.
6. Collision remains authoritative and independent of visual ownership.
7. Text-only design review is sufficient; no visual-companion workflow is used.

## Goals

- Add explicit `always`, `fallback-only`, and `hidden` blocker visual modes.
- Allow a fallback-only blocker to name one or more baked image owners.
- Track successful rendering by exact background image ID.
- Support source-aligned `base` and `foreground` regional planes.
- Keep valid planes independent: losing foreground must not remove a valid base.
- Render foreground obstacle art above the player but below collision debug and
  the Svelte HUD.
- Re-bake approved Sundrop blocker runs into coherent base/foreground art.
- Remove duplicate live hedge/wall sprites in normal mode.
- Restore readable live obstacles in every disabled or failed state.
- Preserve routes, doorway approaches, rewards, handoffs, interactions,
  minimap, saves, and performance.
- Produce deterministic art provenance and repeatable runtime evidence.

## Non-goals

- No other opening-map region.
- No global `6400×6400` authoring master or crop rollout.
- No route, encounter, quest, dialogue, or room-graph redesign.
- No building exterior baking.
- No live door, transition, NPC, pickup, encounter, quest object, animated
  object, or stateful object baking.
- No complex-interior work.
- No collision derived from raster pixels.
- No global replacement of `MapDecor`, fence, landmark, or interior-prop
  rendering.
- No day/night, weather, parallax, seasonal, or animated baked variants.
- No save-schema or player-preference change.

## Current authoritative sources

The following remain authoritative after HPA-398:

- `src/lib/game/content/maps/regions/village-layered.ts` — Sundrop tile, route,
  collision, decor, room, and semantic-object authoring;
- `compileLayeredRegion(...)` — compiled ground, blocker, decor, and object
  geometry;
- `meadowEntryMap` — final composed map and cross-region collision context;
- `WorldScene` movement and collision methods — live movement truth;
- save-normalization geometry — persisted-position recovery truth;
- the HPA-307 art-control exporter — the starting coordinate and provenance
  contract.

The Sundrop canvas remains:

| Property | Value |
| --- | ---: |
| World origin | `{ x: 256, y: 4352 }` |
| Tile size | `32px` |
| Tile dimensions | `56×48` |
| Pixel dimensions | `1792×1536` |
| World center | `{ x: 1152, y: 5120 }` |
| World bounds | `(256, 4352)` through `(2048, 5888)` |

## Map model

### Semantic background planes

Replace the arbitrary descriptor depth with an explicit plane:

```ts
export type MapBackgroundPlane = 'base' | 'foreground';

export interface MapBackgroundImage extends MapRect {
  textureKey: string;
  plane: MapBackgroundPlane;
}
```

`createLayeredRegionBackground(...)` continues to derive center and dimensions
from the layered source. It accepts `plane` rather than `depth`. There is no
descriptor-level numeric-depth escape hatch in HPA-398.

The HPA-307 Sundrop descriptor is migrated immediately; no compatibility form
with both `depth` and `plane` is retained.

### Blocker visual ownership

Add a discriminated visual contract:

```ts
export type MapBlockerVisual =
  | { mode: 'always' }
  | { mode: 'hidden' }
  | {
      mode: 'fallback-only';
      ownerBackgroundIds: readonly string[];
    };

export interface MapBlocker extends MapRect {
  kind: MapBlockerKind;
  label?: string;
  visual?: MapBlockerVisual;
}
```

Semantics:

- omitted `visual` is equivalent to `{ mode: 'always' }`;
- `always` renders the existing live blocker art in every mode;
- `hidden` never renders live blocker art, but still participates in collision,
  normalization, debug overlays, and art controls;
- `fallback-only` renders live art unless every ID in
  `ownerBackgroundIds` belongs to an image that completed the guarded render
  step successfully.

`ownerBackgroundIds` is plural by design. A low obstacle may name only the base;
a split hedge, wall, root, or rock treatment may name both base and foreground.

### Pure validation

Add pure validation and decision helpers outside Phaser:

```ts
validateMapBackgroundOwnership(map: WorldMapDefinition): void

shouldRenderBlockerVisual(
  blocker: MapBlocker,
  successfulBackgroundIds: ReadonlySet<string>
): boolean
```

Validation rejects:

- duplicate background image IDs;
- a fallback-only blocker with an empty owner list;
- duplicate IDs within one owner list;
- an owner ID that is absent from the assembled map;
- an ownership assignment that targets a blocker ID absent from the assembled
  map;
- a Sundrop-owned blocker whose full rectangle is not covered by the owning
  Sundrop image bounds.

The discriminated union makes owner lists unavailable on `always` and `hidden`
values. Existing maps remain unchanged because omitted visual metadata defaults
to `always`.

## Rendering layers

HPA-398 uses fixed scene depths:

| Layer | Depth |
| --- | ---: |
| Fallback tile ground | `-10` |
| Baked base images | `-9` |
| Existing live world objects | `0` |
| Baked foreground images | `100` |
| Collision debug overlay | `10_000` |

The Svelte HUD is outside the Phaser canvas and remains above every world layer.

The foreground image is a sparse transparent plane. Its protected masks prevent
it from painting over buildings, doors, NPC/pickup approaches, stateful objects,
or unrelated live foreground decor. Depth `100` therefore supplies deliberate
player occlusion only where foreground pixels exist.

Image creation order is not used as the layer contract. Both base and foreground
may be created during the guarded background-render pass so blocker suppression
can depend on actual render success; fixed depths provide the visual order.

## Runtime data flow

### BootScene

The central asset registry contains both Sundrop plane assets. Boot behavior
remains controlled by `resolveWorldRenderOptions()`:

- enabled mode queues both assets;
- `?regionalBackground=off` queues neither asset;
- preload diagnostics report the exact number of completed regional image
  loads;
- a loader failure retains the existing key/path `console.error`.

Enabled Sundrop expects two successful regional load completions. Disabled mode
expects zero.

### WorldScene background render

At each `WorldScene.create(...)`:

1. reset scene-local background render state;
2. render fallback tile ground;
3. process every background descriptor independently;
4. record exact successful IDs;
5. render live floor/furniture content and blocker fallbacks;
6. create the player and remaining live semantic objects;
7. render existing live foreground content;
8. render the collision-debug overlay when requested.

Each descriptor follows one guarded operation:

1. If regional backgrounds are disabled, record `disabled` and stop.
2. Confirm the texture key exists.
3. Reject Phaser's `__MISSING` placeholder.
4. Read immutable source or base-frame pixel dimensions.
5. Reject dimensions that do not exactly match the descriptor.
6. Create the image.
7. Set center origin, exact display size, and fixed plane depth.
8. Add the descriptor ID to `successfulBackgroundIds` only after every render
   step succeeds.

If any creation/configuration step throws, destroy the partially created image
when one exists, record `render-failed`, emit one contextual warning, and
continue scene creation.

### Per-image status

The render result for each descriptor is one of:

```ts
type RegionalBackgroundRenderStatus =
  | 'disabled'
  | 'rendered'
  | 'missing-texture'
  | 'invalid-dimensions'
  | 'render-failed';
```

Base and foreground status are independent. A valid base remains visible if
foreground fails. A valid foreground may remain visible if base fails. Blocker
fallback uses owner success, not an all-or-nothing regional switch.

### Diagnostics

Keep the existing BootScene preload timing/completion diagnostic. Add a
WorldScene render diagnostic event with:

- `mapId`;
- whether regional backgrounds are enabled;
- one ordered entry per descriptor containing ID, texture key, plane, expected
  dimensions, observed dimensions when available, and final status;
- sorted `successfulBackgroundIds`.

Missing textures, invalid dimensions, and render exceptions each emit exactly
one map-context warning per affected descriptor per scene creation. Warnings
include the descriptor ID, plane, texture key, and map ID; dimension warnings
also include expected and actual values.

### Deterministic render-failure seam

Extend the developer-only URL parser with:

```text
?regionalBackgroundFault=<background-id>:render
```

The recognized `render` fault throws inside the same guarded descriptor render
operation immediately before Phaser image creation. Unknown IDs or fault modes
are ignored. The parameter does not alter saves, preferences, or production
defaults. It exists so the real browser acceptance harness can prove the
render-exception fallback path rather than claiming it from a unit mock alone.

Missing and wrong-sized asset cases continue to use scoped browser request
interception, not additional runtime flags.

## Blocker rendering and collision independence

`renderBlockers(...)` receives `successfulBackgroundIds` and delegates the
decision to `shouldRenderBlockerVisual(...)`.

Visual selection does not change the blocker array and is never consulted by:

- player movement collision;
- save-position normalization;
- collision-debug rendering;
- art-control collection;
- route and soft-maze tests.

`hidden` therefore means visually hidden, not absent from gameplay.

The renderer retains the current per-kind fallback implementation. HPA-398 does
not need a second fallback sprite system:

- `garden-hedge` uses `village-hedge/hedgeSegment`;
- `town-hedge` uses `forest-dressing/treeCluster`;
- wall/gate kinds retain their existing environment frames;
- `ocean` retains its existing collision-only render branch; HPA-398 does not
  broaden into an all-map metadata migration for ocean blockers.

## Sundrop ownership manifest

Add a checked-in source manifest for the HPA-398 vertical slice. Each entry
contains:

- exact blocker ID;
- approved visual motif (`hedge`, `low-wall`, or `root-rock`);
- owning background IDs;
- source-derived blocker rectangle;
- base seam/shadow margin;
- whether foreground occlusion is required.

The manifest is shared by:

- map assembly, which applies `fallback-only` visual metadata;
- art-control export;
- provenance hashing;
- ownership and coverage tests.

Runtime code performs no position-, prefix-, or kind-based ownership inference.
The manifest contains exact IDs.

Only blockers whose complete rectangles and approved visual extents fit inside
the Sundrop crop are eligible. Outer `town-hedge` boundaries, any straddling
connector blocker, and every unlisted blocker remain `always`.

The selected set is locked to the current 23 compiled village blockers plus the
one fully covered connector blocker `corridor-wall-2b`. The exact motif and
owner assignments are:

| Motif | Owner images | Exact blocker IDs |
| --- | --- | --- |
| Hedge | `sundrop-village-base-image` + `sundrop-village-foreground-image` | `village-block-0-37`, `village-block-0-49`, `village-block-2-2`, `village-block-2-49`, `village-block-3-2`, `village-block-3-51`, `village-block-4-2`, `village-block-32-2`, `village-block-33-49`, `village-block-46-2`, `corridor-wall-2b` |
| Low wall | `sundrop-village-base-image` + `sundrop-village-foreground-image` | `village-block-4-35`, `village-block-11-35`, `village-block-10-35`, `village-block-19-2`, `village-block-19-30`, `village-block-20-2`, `village-block-20-34`, `village-block-25-20` |
| Root/rock | `sundrop-village-base-image` only | `village-block-32-8`, `village-block-32-24`, `village-block-32-33`, `village-block-33-24`, `village-block-41-24` |

The checked-in manifest repeats this exact inventory as structured data. A
future layered-source change that renames, adds, removes, or reshapes one of
these blockers fails validation until the design, controls, art, and provenance
are deliberately regenerated.

The assembled-map validator proves that every manifest entry resolves and that
every declared owner resolves. This catches generated blocker-ID drift when the
layered collision source changes.

## Sundrop static-obstacle scope

The primary baked obstacle source is the collision layer compiled from
`sundropVillageLayered`. The only `pathsRegion` blocker in the selected set is
the fully covered `corridor-wall-2b`; every other connector blocker is
unselected.

The motif manifest may vary the painted treatment along approved collision runs:

- clipped village hedges;
- low stone or timber walls;
- root/rock borders.

This variation does not add collision. Every motif occupies an already
authoritative blocker rectangle and preserves the current route graph.

The following remain live in HPA-398:

- building exteriors and labels;
- doors and transitions;
- NPCs, ambient NPCs, pickups, encounters, discoveries, and quest objects;
- market stall, flower beds, gate arch, shrine topiaries, and other `MapDecor`;
- the two collision-bearing Sundrop stone lantern decor entries;
- fences, landmark art, and all stateful or animated objects.

The blocker ownership contract is intentionally not generalized to `MapDecor`
in this ticket.

Fallback visuals remain the current live hedge sprites for all three motifs.
Degraded modes are therefore collision-readable but are not required to match
the normal baked motif exactly; this is the approved safety-first fallback.

## Collision alignment policy

Current authored collision is the baseline and HPA-398 plans no collision
changes. Baked art must align to it.

The issue allows forgiving inset collision when a test-backed adjustment is
needed, but that allowance is not used speculatively. If visual review finds a
blocker that cannot be aligned without a collision change, implementation
returns to design review with:

- the exact blocker ID;
- current and proposed bounds;
- route, doorway, reward, and handoff impact;
- focused movement and normalization tests.

No collision inset is introduced silently as an art-production convenience.

## Art assets

The runtime assets are:

```text
public/game/assets/regions/sundrop-village-base.png
public/game/assets/regions/sundrop-village-foreground.png
```

Both are exactly `1792×1536`.

- Base is canonical opaque RGBA.
- Foreground is canonical RGBA with transparency and is fully transparent
  outside approved foreground masks.
- The old `sundrop-village-background.png` runtime asset is removed after the
  runtime descriptor, asset registry, active tests, commands, and HPA-398 report
  references are migrated.
- Historical HPA-307 report artifacts remain intact and may continue to name
  the retired HPA-307 runtime path as historical evidence.

Descriptor IDs and texture keys remain separate contracts:

| Plane | Descriptor ID used by blocker ownership | Phaser texture key |
| --- | --- | --- |
| Base | `sundrop-village-base-image` | `sundrop-village-base` |
| Foreground | `sundrop-village-foreground-image` | `sundrop-village-foreground` |

## Deterministic art-control extension

Extend the HPA-307 control package under a new HPA-398 report directory:

```text
docs/superpowers/reports/img/hpa-398/
```

New or revised artifacts include:

| Artifact | Purpose |
| --- | --- |
| `village-obstacle-ownership.json` | Exact blocker IDs, motifs, owners, bounds, margins |
| `village-obstacle-base-mask.svg` | Pixels eligible for opaque base modification |
| `village-obstacle-foreground-mask.svg` | Pixels eligible for foreground alpha/color |
| `village-obstacle-protected-mask.svg` | Routes, doors, rewards, handoffs, buildings, and live-object exclusions |
| `village-obstacle-composite-control.svg` | Text-free generation/alignment reference |
| `village-obstacle-control-manifest.json` | Coordinate contract, hashes, and source fingerprint |

The HPA-398 fingerprint includes:

- all HPA-307 geometry/control inputs;
- the exact ownership/motif manifest;
- permitted base and foreground masks;
- protected masks;
- seam/shadow margins;
- source asset hashes.

Changing any owner, motif, blocker geometry, margin, protected footprint, or
source image invalidates the approved fingerprint.

## Image-production pipeline

The current HPA-307 production PNG is the immutable ground input.

1. Regenerate and review HPA-398 control artifacts.
2. Use the built-in image-generation workflow to edit/generate an aligned
   obstacle candidate from the current ground and the text-free control image.
3. Archive the exact prompt and candidate hash.
4. Normalize with uniform scaling and cropping only; non-uniform scaling is
   forbidden.
5. Deterministically composite candidate pixels into the base only where the
   permitted base mask allows.
6. Build the transparent foreground only where the foreground mask allows.
7. Subtract protected routes, approaches, handoffs, rewards, building
   footprints, and live-object footprints from both permitted masks.
8. Finalize canonical PNGs and emit provenance.

“Pixel-identical outside the mask” means decoded RGBA pixel bytes are identical
to the HPA-307 ground input outside the permitted base mask. PNG file bytes may
change because deterministic recompression rewrites chunks.

The foreground validator requires alpha `0` outside the permitted foreground
mask and forbids non-transparent pixels in protected areas.

The production provenance records:

- HPA-307 input path, size, dimensions, SHA-256, and decoded-pixel SHA-256;
- control fingerprint and every control artifact hash;
- exact image-generation prompt;
- raw candidate path, size, dimensions, and SHA-256;
- normalization transform;
- mask hashes and margins;
- base and foreground output hashes, dimensions, encoded bytes, and
  decoded-pixel hashes;
- changed/unchanged base pixel counts;
- foreground opaque/translucent/transparent pixel counts;
- protected-area violation count, which must be zero.

## Asset budgets

The HPA-307 base budget remains the base-plane policy:

| Asset | Review target | Hard limit |
| --- | ---: | ---: |
| Base PNG | `4 MiB` | `8 MiB` |
| Foreground PNG | `2 MiB` | `4 MiB` |
| Combined | — | `12 MiB` |

The existing documented visual-quality exception may carry forward for a base
above `4 MiB`, but neither per-asset hard limit nor the combined hard limit may
be exceeded.

Two decoded `1792×1536` RGBA textures cost:

```text
2 × 1792 × 1536 × 4 = 22,020,096 bytes ≈ 21.0 MiB
```

This is the raw decoded pixel allocation, not a claim about total browser or GPU
residency.

## Test strategy

### Pure unit tests

Cover:

- omitted visual metadata defaults to `always`;
- `always`, `hidden`, base-only fallback, and multi-owner fallback;
- all owners successful;
- each owner failing independently;
- empty, duplicate, missing, and stale owner IDs;
- exact ownership-manifest coverage;
- fully covered versus straddling blocker rejection;
- collision helpers receive the same blockers in every visual mode;
- plane-to-depth mapping;
- render-option and render-fault parsing.

### Map and compiler tests

Prove:

- layered village blocker IDs remain stable or explicitly update the manifest;
- selected ownership is applied only to exact manifest entries;
- unlisted village, connector, and outer-boundary blockers remain `always`;
- the `meadow-west-boundary` keeps its full `6400px` extent and existing live
  tree-cluster fallback;
- merge uniqueness still covers both background descriptors;
- base and foreground descriptors share exact source-derived bounds.

### Scene tests

Cover:

- ground `-10`, base `-9`, live world `0`, foreground `100`, debug `10_000`;
- both planes rendered successfully;
- backgrounds disabled;
- missing base;
- missing foreground;
- wrong-sized base;
- wrong-sized foreground;
- missing-placeholder texture;
- base render exception;
- foreground render exception;
- partial-image cleanup after an exception;
- one contextual warning per failed descriptor;
- independent per-image diagnostic status;
- successful-ID sorting and reset on scene restart;
- no duplicate selected blocker sprites in normal mode;
- complete live fallback for every selected blocker in each failed mode;
- `always` blockers remain visible;
- `hidden` blockers remain invisible;
- identical movement collision in every visual mode;
- collision debug remains above both planes and includes hidden/fallback-only
  blockers.

### Browser E2E and visual evidence

Extend the existing HPA-307 headed-browser controller rather than create an
unrelated harness.

Capture and inspect:

- normal base+foreground mode;
- background-disabled fallback;
- missing base;
- missing foreground;
- wrong-sized base;
- wrong-sized foreground;
- base render failure;
- foreground render failure;
- collision-debug mode;
- combined disabled+collision mode;
- each named village district;
- before/behind/after positions at representative hedge, low-wall, and
  root/rock occlusion points;
- north, south, east, and west crop edges;
- the Crossroads continuation and return.

The controller repeats the source-derived village route, including:

- all building entrance/exit round trips;
- market and shrine reward pockets;
- every district connection;
- East Gate and north Crossroads handoffs;
- representative save/reload checkpoints at Home Yard, Well Plaza, Shrine
  Garden, and East Gate;
- area-map/minimap inspection.

Each movement burst continues to verify authoritative saved map ID, position,
facing, and relevant pickup state.

### Performance evidence

Enabled mode must show:

- two exact production image requests;
- two successful preload completions;
- two `1792×1536` descriptor render successes;
- WebGL `MAX_TEXTURE_SIZE >= 1792`, with `2048` or greater recorded as the
  preferred margin, or successful Canvas decode/draw;
- no WebGL context loss or uncaught page error;
- no texture re-upload across interior round trips;
- no sustained reference-device p95 walking-frame regression greater than
  `2 ms` versus background-disabled mode over the same route.

Disabled mode must show zero regional image requests, zero regional preload
completions, and complete live fallback.

The p95 gate is device-local evidence, not a wall-clock CI assertion.

## Required commands and gates

The final PR runs:

```text
art-control regeneration and fingerprint stability
asset integrity and provenance tests
bun run check
bun run lint
bun run test:unit -- --run
bun run test:e2e
bun run build
bun run tauri build
git diff --check
```

Server tests may use the established uncontended
`--project server --no-file-parallelism` invocation if heavy image tests exceed
their normal timeout when run concurrently.

The Tauri build must still pass strict story generation and the
no-frontend-story-prose assertion.

## Acceptance report

Commit:

```text
docs/superpowers/reports/2026-07-28-hpa-398-outdoor-baked-obstacle-validation.md
```

The report contains:

- final scope and commit;
- source/control fingerprint;
- asset and decoded-pixel hashes;
- size-budget results;
- ownership inventory;
- automated gate output;
- per-failure diagnostic evidence;
- visual captures and inspection notes;
- controller route and save/reload results;
- load, texture-size, upload/decode, memory, and frame-time evidence;
- an explicit statement of whether any native-device limitations remain.

## One-PR delivery sequence

The consolidated PR uses reviewable commits in this order:

1. pure map contracts, validation, and tests;
2. WorldScene/BootScene planes, success tracking, diagnostics, fallback, and
   scene tests;
3. Sundrop ownership manifest and extended art controls;
4. approved base/foreground assets and provenance;
5. Sundrop runtime migration and focused E2E;
6. full walkthrough, performance evidence, acceptance report, and final fixes.

No implementation checkpoint changes Linear status or posts detailed evidence
without separate user authorization.

## Acceptance mapping

| Linear requirement | Design proof |
| --- | --- |
| Collision and visual presentation independently configurable | `MapBlockerVisual`, pure decision helper, unchanged collision consumers |
| No duplicate normal obstacle art | successful-owner suppression plus exact selected-blocker scene/E2E counts |
| Every fallback restores readable obstacles | all-owner success rule and full live fallback matrix |
| Foreground occludes the player correctly | fixed foreground depth, sparse alpha mask, before/behind/after captures |
| Missing foreground does not disable base | per-image guarded render and independent status |
| Existing gameplay remains correct | source-derived controller, rewards, handoffs, minimap, and save/reload gates |
| Performance remains correct | encoded/decoded budgets, exact request/load counts, texture limit, re-upload, and p95 evidence |
| Full automated/build gates pass | unit, scene, E2E, check, lint, web build, Tauri build, art and provenance gates |

## Definition of done

HPA-398 is complete when normal Sundrop rendering shows the preserved HPA-307
ground plus coherent baked static-obstacle art with correct foreground
occlusion and no duplicate selected live obstacle sprites; every disabled,
missing, invalid, and failed owner state restores complete readable live
fallback without changing collision; all source-derived gameplay,
asset-integrity, build, walkthrough, and performance gates pass; and the
evidence is committed in the HPA-398 acceptance report.
