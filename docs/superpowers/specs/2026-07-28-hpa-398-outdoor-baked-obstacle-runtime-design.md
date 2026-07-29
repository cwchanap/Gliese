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

- Add explicit `always` and `fallback-only` blocker visual modes.
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
- `fallback-only` renders live art unless every ID in
  `ownerBackgroundIds` belongs to an image that completed the guarded render
  step successfully.

`ownerBackgroundIds` is plural by design. A low obstacle may name only the base;
a split hedge, wall, root, or rock treatment may name both base and foreground.

### Pure validation

Add pure validation and decision helpers outside Phaser:

```ts
validateMapBackgroundOwnership(map: WorldMapDefinition): void

validateSundropObstacleCoverage(
  map: WorldMapDefinition,
  manifest: readonly SundropObstacleOwnershipEntry[]
): void

shouldRenderBlockerVisual(
  blocker: MapBlocker,
  successfulBackgroundIds: ReadonlySet<string>
): boolean
```

The generic `validateMapBackgroundOwnership(...)` rejects:

- duplicate background image IDs;
- a fallback-only blocker with an empty owner list;
- duplicate IDs within one owner list;
- an owner ID that is absent from the assembled map.

The Sundrop-specific `validateSundropObstacleCoverage(...)` separately rejects:

- a manifest ID that does not resolve against the final assembled blocker list;
- a Sundrop-owned blocker whose complete painted extent for either owned plane,
  calculated from its source-derived rectangle plus that plane's approved
  per-side margins, is not covered by the owning Sundrop image.

The generic owner-graph validator contains no Sundrop crop or manifest
assumptions. The coverage validator receives the manifest explicitly and derives
the crop from the final Sundrop descriptors.

Base seam/shadow margins and foreground occlusion margins are independent,
explicit `{ top, right, bottom, left }` values. They are not symmetrically
inferred and the validator does not silently clip them. A blocker touching a
crop edge must declare zero outward margin on that side for every owned plane;
if its approved art needs to extend outside the crop, it is ineligible for
HPA-398 ownership.

The discriminated union makes owner lists unavailable on `always` values.
Existing maps remain unchanged because omitted visual metadata defaults to
`always`.

## Rendering layers

HPA-398 uses fixed scene depths:

| Layer | Depth |
| --- | ---: |
| Fallback tile ground | `-10` |
| Baked base images | `-9` |
| Existing live world objects | `0` |
| Baked foreground images | `100` |
| Existing discovery markers | `1_000` |
| Collision debug overlay | `10_000` |

The Svelte HUD is outside the Phaser canvas and remains above every world layer.
Other existing special depths remain authoritative; HPA-398 does not normalize
them to the general live-world depth.

“Existing live world objects” includes the current foreground `MapDecor` and
interior-prop groups. Those objects keep their existing depth `0` and
creation-order relationship to the player; HPA-398 does not migrate their
depths. The baked foreground deliberately sits above them at `100`, so its alpha
must be zero across their full protected footprints.

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

`WorldRenderOptions` gains one typed field:

```ts
regionalBackgroundFault: {
  backgroundId: string;
  mode: 'render';
} | null;
```

`backgroundId` is always a `MapBackgroundImage.id`, never a Phaser texture key.
`parseWorldRenderOptions(...)` is the only raw-query parser; BootScene and
WorldScene consume its typed result rather than parsing the fault independently.
Malformed values and unsupported modes resolve to `null`.

This changes the disabled-mode diagnostic surface deliberately. Existing
single-asset BootScene and Playwright expectations migrate from one enabled
completion to two, while disabled mode retains zero preload completions and now
also expects one ordered WorldScene `disabled` entry for each of the two
descriptors.

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
7. Trigger the matching developer-only `render` fault, when requested, after
   retaining the created image reference and before configuration.
8. Set center origin, exact display size, and fixed plane depth.
9. Add the descriptor ID to `successfulBackgroundIds` only after every render
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

Because every selected blocker owns the base, base failure plus foreground
success keeps the valid foreground plane and restores live fallbacks for all 21
selected blockers. Foreground failure plus base success keeps the valid base
plane and restores live fallbacks for exactly the seven multi-owner blockers;
the 14 base-only blockers remain suppressed. The resulting degraded-mode
duplication is intentional. In both asymmetric states, collision readability
takes precedence over matching the normal composite. Scene and browser tests
assert both cases explicitly.

### Diagnostics

Keep the existing BootScene preload timing/completion diagnostic. Add a
separate WorldScene diagnostic module:

```text
src/lib/game/phaser/regional-background-plane-render-diagnostics.ts
```

Its public event and payload contracts are:

```ts
export const REGIONAL_BACKGROUND_PLANE_RENDER_DIAGNOSTIC_EVENT =
  'gliese:regional-background-plane-render-diagnostic';

export interface RegionalBackgroundPlaneRenderDiagnosticEntry {
  id: string;
  textureKey: string;
  plane: MapBackgroundPlane;
  expectedDimensions: { width: number; height: number };
  observedDimensions: { width: number; height: number } | null;
  status: RegionalBackgroundRenderStatus;
}

export interface RegionalBackgroundPlaneRenderDiagnostic {
  mapId: string;
  regionalBackgroundsEnabled: boolean;
  entries: readonly RegionalBackgroundPlaneRenderDiagnosticEntry[];
  successfulBackgroundIds: readonly string[];
}
```

`entries` preserves descriptor order and `successfulBackgroundIds` is sorted.
This event is distinct from the existing
`gliese:regional-background-renderer-diagnostic` preload/capability event.
Vitest and the Playwright evidence listener import this contract rather than
redeclaring it.

Missing textures, invalid dimensions, and render exceptions each emit exactly
one map-context warning per affected descriptor per scene creation. Warnings
include the descriptor ID, plane, texture key, and map ID; dimension warnings
also include expected and actual values.

### Deterministic render-failure seam

Extend the developer-only URL parser with:

```text
?regionalBackgroundFault=<background-id>:render
```

The URL's `<background-id>` is the descriptor ID used by blocker ownership, not
the texture key.

The recognized `render` fault throws inside the same guarded descriptor render
operation immediately after Phaser image creation and before image
configuration. This keeps one deterministic URL fault mode while exercising
partial-image cleanup in the real browser harness. Unknown IDs or fault modes
are ignored. The parameter does not alter saves, preferences, or production
defaults.

Scene unit tests separately cover image creation throwing before an object
exists and a post-creation exception destroying the retained partial image.

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

The renderer retains the current per-kind fallback implementation. HPA-398 does
not need a second fallback sprite system:

- `garden-hedge` uses `village-hedge/hedgeSegment`;
- `town-hedge` uses `forest-dressing/treeCluster`;
- wall/gate kinds retain their existing environment frames;
- `ocean` retains its existing collision-only render branch; HPA-398 does not
  broaden into an all-map metadata migration for ocean blockers.

## Sundrop ownership manifest

Add the checked-in TypeScript source manifest:

```text
src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.ts
```

Each entry contains:

- exact blocker ID;
- approved visual motif (`hedge`, `low-wall`, or `root-rock`);
- owning background IDs;
- explicit per-side base seam/shadow margins;
- whether foreground occlusion is required and, when it is, explicit per-side
  foreground margins.

The source manifest does not duplicate blocker rectangles. Map assembly and
art-control export resolve each exact ID against the assembled blocker list,
which derives `corridor-wall-2b` from `pathsRegion` in `paths.ts`. The generated
`village-obstacle-ownership.json` records those resolved rectangles for review
and provenance.

Runtime ownership is applied only after `mergeRegions(...)` has combined
`villageRegion`, `pathsRegion`, the other regional fragments, and the meadow
boundaries. The applicator resolves and stamps exact IDs on
`merged.blockers`. Both `validateMapBackgroundOwnership(...)` and
`validateSundropObstacleCoverage(...)` run immediately after that post-merge
stamping and before `meadowEntryMap` is exported or `addEnglishMapText(...)`
runs. Applying ownership inside `villageRegion` is forbidden because it cannot
reach `corridor-wall-2b`.

The manifest is shared by:

- map assembly, which applies `fallback-only` visual metadata;
- art-control export;
- provenance hashing;
- ownership and coverage tests.

Runtime code performs no position-, prefix-, or kind-based ownership inference.
The manifest contains exact IDs.

Only blockers whose complete per-plane painted extents—source rectangle plus
the applicable explicit margins—fit inside the Sundrop crop are eligible. In
particular, `village-block-0-37`, `village-block-0-49`, and
`village-block-46-2` intersect the HPA-307 alpha-feather bands and remain
`always`; neither generated obstacle mask may include them. Outer `town-hedge`
boundaries, any straddling connector blocker, and every other unlisted blocker
also remain `always`.

The selected set is locked to the current 20 eligible compiled village
blockers plus the one fully covered connector blocker `corridor-wall-2b`. Of
these 21 blockers, 14 are base-only and seven horizontal hedge/low-wall runs
are base-plus-foreground. The exact motif and owner assignments are:

| Motif | Owner images | Exact blocker IDs |
| --- | --- | --- |
| Hedge | `sundrop-village-base-image` + `sundrop-village-foreground-image` | `village-block-2-2`, `village-block-2-49`, `village-block-3-2`, `corridor-wall-2b` |
| Hedge | `sundrop-village-base-image` only | `village-block-3-51`, `village-block-4-2`, `village-block-32-2`, `village-block-33-49` |
| Low wall | `sundrop-village-base-image` + `sundrop-village-foreground-image` | `village-block-10-35`, `village-block-19-2`, `village-block-19-30` |
| Low wall | `sundrop-village-base-image` only | `village-block-4-35`, `village-block-11-35`, `village-block-20-2`, `village-block-20-34`, `village-block-25-20` |
| Root/rock | `sundrop-village-base-image` only | `village-block-32-8`, `village-block-32-24`, `village-block-32-33`, `village-block-33-24`, `village-block-41-24` |

The checked-in manifest repeats this exact inventory as structured data. A
future layered-source change that renames, adds, removes, or reshapes one of
these blockers fails validation until the design, controls, art, and provenance
are deliberately regenerated.

The assembled-map validators prove the exact 21-entry inventory, the
14-base-only/7-base-plus-foreground split, that every manifest entry resolves,
and that every declared owner resolves. This catches generated blocker-ID drift
when the layered collision source changes.

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

Protected geometry for a collision-bearing live decor object is the union of
its unexpanded full sprite rectangle, its collision rectangle expanded uniformly
outward by the `12px` player collision radius, and any authored approach
clearance. HPA-398 extracts:

```ts
export const PLAYER_COLLISION_RADIUS = 12;
```

into `src/lib/game/core/collision.ts`. `WorldScene` and save normalization
replace their two mirrored private literals with this shared value; art-control
export switches from the save-normalization constant to the shared contract as
well. For each Sundrop stone lantern, the `180×180` sprite footprint is
therefore protected in full; its bottom-aligned `80×60` collision footprint is
retained and expanded by `12px` on every side in the control data.

The hero renders at a source-derived `90px` display height with centered
origin. The foreground front-overlap allowance is therefore:

```ts
heroDisplayHeight / 2 - PLAYER_COLLISION_RADIUS = 90 / 2 - 12 = 33px
```

For each of the seven horizontal base-plus-foreground blockers, the foreground
validator requires alpha `0` below world
`blocker.bottom - 33px`. This lets the foreground cover the hero while the hero
is behind the blocker without clipping the hero while standing immediately in
front of it. The exporter derives `heroDisplayHeight` from the shared actor
asset contract rather than maintaining an independent literal.

The nine vertical hedge/low-wall runs are base-only. A single fixed foreground
plane cannot prove front-versus-behind ordering along a vertical run without
segmenting the art or adding runtime depth sorting, both outside HPA-398.

The protected live-object inventory is generated from the final assembled map
and shared runtime display-dimension contracts, not maintained as a list of
names. It covers:

- the full render rectangle of every placed `MapDecor` intersecting the crop,
  regardless of whether it has collision;
- full landmark exterior rectangles plus doorway clearances;
- full NPC, ambient-NPC, and pickup display rectangles plus their authored
  interaction/approach clearances;
- other static or stateful live-object footprints at depth `100` or below.

The defined `hangingLantern` decor glyph currently has no Sundrop placements, so
it contributes no protected rectangle; a future placement is included
automatically. Discovery marker bodies remain readable at their existing depth
`1_000`, above the baked foreground, while their route and interaction
clearances remain protected.

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

- Base is canonical RGBA and preserves the HPA-307 feathered alpha profile at
  every pixel.
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

The existing singular approval module becomes:

```text
src/lib/game/content/approvals/sundrop-village-backgrounds.ts
```

It stores one approved combined HPA-398 control fingerprint and independent
base and foreground approval records. Each plane record owns its PNG SHA-256,
budget decision, and evidence-report path. Changing either output requires
updating that plane's hash; changing ownership, masks, margins, or protected
geometry invalidates the shared fingerprint and therefore both approvals.

## Deterministic HPA-398 art controls

The HPA-307 exporter, command, fixed filename list, output directory, and
historical artifacts are frozen. HPA-398 adds a separate exporter and command:

```text
tools/export-sundrop-village-obstacle-controls.ts
bun run art:controls:village-obstacles
```

The new exporter owns a separate fixed filename allowlist and may write only
under:

```text
docs/superpowers/reports/img/hpa-398/
```

New or revised artifacts include:

| Artifact | Purpose |
| --- | --- |
| `village-obstacle-ownership.json` | Exact blocker IDs, motifs, owners, bounds, margins |
| `village-obstacle-base-mask.svg` | Pixels eligible for base RGB modification |
| `village-obstacle-foreground-mask.svg` | Pixels eligible for foreground alpha/color |
| `village-obstacle-protected-mask.svg` | Routes, doors, rewards, handoffs, buildings, and live-object exclusions |
| `village-obstacle-composite-control.svg` | Text-free generation/alignment reference |
| `village-obstacle-control-manifest.json` | Coordinate contract, hashes, and source fingerprint |

The HPA-398 fingerprint includes:

- the frozen HPA-307 control fingerprint and artifact hashes;
- all new HPA-398 geometry/control inputs;
- the exact ownership/motif manifest;
- permitted base and foreground masks;
- protected masks;
- seam/shadow margins;
- the immutable HPA-307 base-alpha rule;
- source asset hashes.

Changing any owner, motif, blocker geometry, margin, protected footprint, or
source image invalidates the approved fingerprint. Running the HPA-398 exporter
never rewrites an HPA-307 artifact.

## Image-production pipeline

The current HPA-307 production PNG is the immutable ground input.

1. Regenerate and review HPA-398 control artifacts.
2. Use the built-in image-generation workflow with the current ground as the
   style reference and the text-free control image as the exact placement guide.
   Generate obstacle silhouettes only on a flat `#ff00ff` chroma background;
   generated terrain, roads, buildings, characters, shadows, labels, and guides
   are forbidden.
3. Archive the unmodified generated RGB image as
   `village-obstacle-chroma-source.png`, then remove the chroma locally with the
   imagegen skill's `remove_chroma_key.py` helper. Archive the resulting RGBA
   `village-obstacle-layer.png` and reject it unless it has real transparency,
   transparent corners, plausible coverage, and no magenta fringe.
4. Normalize the obstacle layer with uniform centered cropping and scaling
   only; non-uniform scaling is
   forbidden.
5. Deterministically construct `village-obstacle-candidate.png`: its RGB is the
   normalized obstacle layer alpha-composited over the immutable HPA-307 ground.
   Before compositing, a fixed `16px` inward linear alignment feather reduces
   obstacle-layer alpha to `0` at the final permitted base-mask pixel and reaches
   full contribution at distance `17px`. Fully transparent candidate pixels
   retain the ground source RGB. Mask geometry and ownership are unchanged.
6. Deterministically composite candidate RGB into the base only where the
   permitted base mask allows. Base alpha is never taken from the candidate or
   forced to `255`; it remains exactly
   `sundropVillageBackgroundAlpha(x, y, width, height)` everywhere, including
   the feather bands.
7. Build the transparent foreground only where the foreground mask allows.
   Every foreground pixel is additionally clipped by the horizontal
   blocker-specific `bottom - 33px` front-safe cutoff. Its candidate alpha is
   modulated as
   `Math.round(candidateAlpha * sundropVillageBackgroundAlpha(...) / 255)` so
   foreground edges cannot form a hard seam against the feathered base.
8. Subtract protected routes, approaches, handoffs, rewards, building
   footprints, and live-object footprints from both permitted masks.
9. Finalize canonical PNGs and emit provenance.

“Pixel-identical outside the mask” means decoded RGBA pixel bytes are identical
to the HPA-307 ground input outside the permitted base mask. PNG file bytes may
change because deterministic recompression rewrites chunks.

Inside the base mask, RGB may change but alpha may not. The base validator
requires the HPA-307 feather function's exact alpha value at every pixel.

The foreground validator requires alpha `0` outside the permitted foreground
mask and forbids non-transparent pixels in protected areas. It also proves that
all foreground pixels belong to the seven approved horizontal blockers, obey
each blocker-specific front-safe cutoff, and do not exceed the HPA-307 edge
alpha profile. The three feather-band `always` blockers and all nine vertical
base-only hedge/low-wall runs must have zero foreground-mask coverage.

This is an automated CI gate, not only a provenance statistic. Implementation
adds:

```text
src/lib/game/content/sundrop-village-obstacle-assets.test.ts
```

The test decodes both production assets and asserts exact dimensions and
approved hashes, base pixel identity outside the base mask, the exact HPA-307
base-alpha profile everywhere, foreground alpha `0` outside the foreground
mask, foreground alpha `0` throughout the protected mask, front-safe cutoff and
edge-alpha compliance, exclusion of the three feather-band blockers, the exact
21/14/7 ownership inventory, and the asset budgets. It is included in
`art:validate:village` and the standard one-shot unit suite.

The production provenance records:

- HPA-307 input path, size, dimensions, SHA-256, and decoded-pixel SHA-256;
- control fingerprint and every control artifact hash;
- exact image-generation prompt;
- raw chroma-source path, size, dimensions, and SHA-256;
- extracted obstacle-layer path, size, dimensions, alpha facts, and SHA-256;
- normalization transform;
- constructed candidate path, dimensions, encoded/decoded hashes, and
  source-backed alpha-composite contract;
- mask hashes and margins;
- base and foreground output hashes, dimensions, encoded bytes, and
  decoded-pixel hashes;
- changed/unchanged base pixel counts;
- base-alpha violation count, which must be zero;
- foreground opaque/translucent/transparent pixel counts;
- protected-area violation count, which must be zero.

## Asset budgets

The HPA-307 base budget remains the base-plane policy:

| Asset | Review target | Hard limit |
| --- | ---: | ---: |
| Base PNG | `4 MiB` | `8 MiB` |
| Foreground PNG | `2 MiB` | `4 MiB` |
| Combined | — | `12 MiB` |

The HPA-307 production base is currently `7,601,173` bytes (`7.25 MiB`), leaving
only `787,435` bytes below the `8 MiB` base hard limit. The existing documented
visual-quality exception may carry forward for a base above `4 MiB`, but the
implementation initially preserves every hard limit.

If the obstacle composite exceeds the base limit, the recovery order is:

1. simplify masked base detail and shadows without changing geometry or alpha;
2. move eligible horizontal detail into the sparse foreground within its
   approved mask and cutoff;
3. return to design review if neither is sufficient.

No implementation step may raise a hard limit automatically. Any increase
requires explicit design approval and a recorded exception before the affected
asset is accepted.

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
- `always`, base-only fallback, and multi-owner fallback;
- all owners successful;
- each owner failing independently;
- empty, duplicate, missing, and stale owner IDs;
- generic owner-graph validation independent of Sundrop;
- exact Sundrop ownership-manifest coverage against the assembled map;
- exact 21-entry, 14-base-only, and 7-base-plus-foreground inventory;
- per-plane margin-expanded coverage, edge-zero margins, and straddling blocker
  rejection;
- horizontal foreground front-safe cutoff and feather-profile alpha;
- zero ownership and zero base/foreground-mask coverage for the three
  feather-band `always` blockers;
- zero foreground coverage for every vertical base-only blocker;
- collision helpers receive the same blockers in every visual mode;
- plane-to-depth mapping;
- render-option and render-fault parsing, including descriptor-ID versus
  texture-key behavior and malformed values.

### Map and compiler tests

Prove:

- layered village blocker IDs remain stable or explicitly update the manifest;
- a dedicated final-assembly test fails when any manifest ID is absent after a
  layered recompile or region merge;
- post-merge ownership resolves `corridor-wall-2b` from `pathsRegion`;
- both ownership validators run after post-merge stamping and before
  `meadowEntryMap` export;
- runtime movement, save normalization, and art-control export use the same
  `PLAYER_COLLISION_RADIUS = 12` constant;
- generated protected inventory covers every placed in-crop `MapDecor`,
  landmark exterior, NPC/ambient-NPC body, and pickup body according to its
  runtime display rectangle;
- selected ownership is applied only to exact manifest entries;
- `village-block-0-37`, `village-block-0-49`, and `village-block-46-2`
  remain `always`;
- unlisted village, connector, and outer-boundary blockers remain `always`;
- the `meadow-west-boundary` keeps its full `6400px` extent and existing live
  tree-cluster fallback;
- merge uniqueness still covers both background descriptors;
- base and foreground descriptors share exact source-derived bounds.

### Scene tests

Cover:

- ground `-10`, base `-9`, live world `0`, foreground `100`, discovery markers
  `1_000`, debug `10_000`;
- both planes rendered successfully;
- backgrounds disabled with two ordered `disabled` diagnostic entries;
- missing base while foreground succeeds, with the foreground retained and
  all 21 selected live fallbacks rendered;
- missing foreground while base succeeds, with the base retained, the seven
  multi-owner live fallbacks rendered, and the 14 base-only blockers
  suppressed;
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
- complete live fallback for all 21 selected blockers when backgrounds are
  disabled or the base fails;
- live fallback for exactly the seven multi-owner blockers when only the
  foreground fails, while the 14 valid base-only blockers remain suppressed;
- `always` blockers remain visible;
- identical movement collision in every visual mode;
- collision debug remains above both planes and includes fallback-only
  blockers;
- a hero immediately south/in front of a representative horizontal blocker is
  not clipped by foreground art;
- a hero north/behind the same blocker is occluded by its foreground art.

### Browser E2E and visual evidence

Extend the existing HPA-307 headed-browser controller rather than create an
unrelated harness.

Capture and inspect:

- normal base+foreground mode;
- background-disabled fallback;
- missing base while foreground succeeds, including the retained foreground
  plus all 21 live fallbacks;
- missing foreground while base succeeds, including the retained base plus
  exactly seven multi-owner live fallbacks while the 14 base-only blockers
  remain suppressed;
- wrong-sized base;
- wrong-sized foreground;
- base render failure;
- foreground render failure;
- collision-debug mode;
- combined disabled+collision mode;
- each named village district;
- front/behind/after positions at representative horizontal hedge and low-wall
  occlusion points, plus base-only root/rock and vertical-run inspection;
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
completions, two ordered WorldScene `disabled` entries, and complete live
fallback.

The p95 gate is device-local evidence, not a wall-clock CI assertion.

## Required commands and gates

The final PR runs:

```text
art-control regeneration and fingerprint stability
asset integrity and provenance tests
bun run check
bun run lint
bun run test:unit -- --run
bun run build
bun run test:e2e
bun run tauri build
git diff --check
```

`bun run build` is the browser-development compatibility gate. It intentionally
uses the browser story fixture and may contain story prose, so its `dist/`
output is not shippable. `bun run tauri build` is the authoritative release
artifact gate: Tauri invokes `bun run build:tauri` through
`beforeBuildCommand`, which performs strict story checking, the Tauri-mode Vite
build, and the no-frontend-story-prose assertion.

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
- an explicit statement that hedge, low-wall, and root/rock are paint motifs
  while every one of the 21 selected live fallbacks remains
  `village-hedge/hedgeSegment`;
- automated gate output;
- per-failure diagnostic evidence;
- visual captures and inspection notes;
- an explicit note that foreground succeeds/base fails plus all 21 live hedge
  fallbacks is intentional degraded duplication;
- an explicit note that base succeeds/foreground fails plus the seven
  multi-owner live hedge fallbacks is intentional degraded duplication, while
  the 14 valid base-only blockers remain suppressed;
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

Before checkpoint 4 removes the old runtime asset, the implementation plan
enumerates and migrates every live `sundrop-village-background` path/texture
reference and every literal descriptor-ID reference to
`sundrop-village-regional-background` in the asset registry, map definitions,
approval modules, active tools, scene/unit tests, and E2E harness. Historical
HPA-307 reports and evidence remain untouched.

No implementation checkpoint changes Linear status or posts detailed evidence
without separate user authorization.

## Acceptance mapping

| Linear requirement | Design proof |
| --- | --- |
| Collision and visual presentation independently configurable | `MapBlockerVisual`, pure decision helper, unchanged collision consumers |
| No duplicate normal obstacle art | successful-owner suppression plus exact selected-blocker scene/E2E counts |
| Every fallback restores readable obstacles | all-owner success rule and full live fallback matrix |
| Foreground occludes the player correctly | seven horizontal owners, source-derived `33px` front-safe cutoff, feather-modulated alpha, and front/behind/after captures |
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
