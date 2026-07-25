# Sundrop Village Baked Regional Background — Design

> HPA-307. Branch: `codex/hpa-307-baked-village-background`.
> Prerequisite: HPA-238 / PR #14 is merged into `main`.
> Scope: one complete Sundrop Village vertical slice: deterministic art-control exports,
> one approved regional master background, runtime integration, fallback/debug modes,
> performance review, and controller validation.

## Problem

HPA-238 established the definitive Sundrop Village gameplay geometry in
`src/lib/game/content/maps/regions/village-layered.ts`. The 56×48 layered source compiles
through `compileLayeredRegion(...)` and remains authoritative for:

- room and route geometry;
- collision and navigation;
- building, entrance, NPC, and pickup anchors;
- fallback terrain;
- minimap and regional logic.

The current runtime renders the opening map entirely from live tile ground, blockers,
buildings, decor, transitions, NPCs, and pickups. This is functionally correct but cannot
provide a cohesive, richly authored environmental surface without turning the map into a
dense collection of repeated tile and decor sprites.

HPA-307 adds a visual-only regional background layer. The art may enrich the approved
geometry, but it must not become a second source of gameplay truth or visually imply routes,
entrances, or obstacles that do not exist in the layered source.

## Approved direction

The prototype uses a **controlled single-master workflow**:

1. export exact art-control geometry from the approved layered source;
2. use that geometry as the reference for image generation;
3. clean and validate one coherent 1792×1536 Sundrop Village master;
4. render that master beneath all live objects;
5. retain the existing tile surface as an always-available fallback.

The background will be richer and more detailed than the current live sprite art. Detail is
concentrated around room boundaries, foundations, gardens, and non-walkable margins. Routes,
plazas, rewards, and doorway approaches remain visually calm and immediately readable.

The master is not divided into independently generated chunks. Runtime cropping is not
implemented in HPA-307; a supported-target texture-limit failure triggers a measured,
separately designed follow-up.

## Goals

- Render one coherent Sundrop Village background aligned to the 56×48 layered source.
- Keep collision, navigation, minimap, transitions, rewards, NPCs, and saves unchanged.
- Keep buildings and every interactive, animated, stateful, foreground, or
  collision-bearing object live.
- Generate deterministic, source-derived art-control masks at the exact master resolution.
- Detect stale art when the underlying control geometry changes.
- Provide URL-controlled fallback and collision-overlay validation modes.
- Produce repeatable visual, gameplay, loading, and GPU-memory evidence.

## Non-goals

- Redesigning the HPA-238 room graph, routes, collision behavior, anchors, or transition
  approaches.
- Refactoring `WorldScene` movement or changing save-position normalization semantics;
  HPA-307 reuses their existing pure geometry helpers without replacing either runtime.
- Baking buildings, doors, signs, labels, NPCs, pickups, quest objects, tall props, arches,
  trees, foreground objects, or animations.
- Migrating any opening-map region other than Sundrop Village.
- Adding HUD controls, settings UI, save fields, day/night variants, weather, or animation.
- Replacing the layered source, compiler, minimap, or fallback tile renderer.
- Generating independent visual chunks before approving a coherent regional master.

## Coordinate contract

The layered source defines:

| Property | Value |
| --- | ---: |
| World origin | `x: 256`, `y: 4352` |
| Tile size | `32px` |
| Width | `56` tiles / `1792px` |
| Height | `48` tiles / `1536px` |
| World center | `x: 1152`, `y: 5120` |

Art-control artifacts use a local top-left origin of `(0, 0)` and an exact
`1792×1536` canvas. Their manifest records the world origin, so local coordinates convert
to world coordinates by adding `(256, 4352)`.

No runtime implementation may separately hand-code the center or dimensions. A pure
layered-region background helper derives them from `origin`, `width`, `height`, and
`tileSize`; generated control metadata may repeat the resulting values for external art
tools.

### Placement contract

`MapBackgroundImage.x` and `.y` use the same **world-space center** convention as existing
`MapRect` values. The `(0, 0)` top-left convention applies only inside exported art-control
canvases. The source-derived helper is the only place where the two conventions meet:

```ts
function createRegionBackgroundImage(source, id, textureKey, depth = -9) {
  const width = source.width * source.tileSize;
  const height = source.height * source.tileSize;

  return {
    id,
    textureKey,
    x: source.origin.x + width / 2,
    y: source.origin.y + height / 2,
    width,
    height,
    depth
  };
}
```

For Sundrop Village this produces center `(1152, 5120)`, display size `1792×1536`, and
world edges `(256, 4352)` through `(2048, 5888)`. `WorldScene` makes the Phaser convention
explicit instead of depending on its default:

```ts
this.add
  .image(background.x, background.y, background.textureKey)
  .setOrigin(0.5, 0.5)
  .setDisplaySize(background.width, background.height)
  .setDepth(background.depth);
```

Neither the descriptor nor the renderer accepts a separately authored center, top-left, or
display size.

## Runtime architecture

### Map model

Add a generic visual-only map type:

```ts
interface MapBackgroundImage extends MapRect {
  textureKey: string;
  depth: number;
}
```

`WorldMapDefinition` and `RegionFragment` gain an optional
`backgroundImages?: MapBackgroundImage[]` collection. An array keeps the contract reusable
for future regions without changing the map model. HPA-307 supplies exactly one entry and
does not add runtime cropping.

The generic `mergeRegions(...)` path in `meadow-entry.ts` merges background descriptors in
the same way it merges ground, blockers, decor, and objects. The gameplay compiler does not
read the descriptors.

This requires four explicit `meadow-entry.ts` updates beyond adding the field to
`RegionFragment`:

1. add `backgroundImages` to the `MergedRegions` `Pick`;
2. initialize it with `fragments.flatMap((fragment) => fragment.backgroundImages ?? [])`;
3. pass it through `assertUniqueIds(...)`, because duplicate background IDs must fail rather
   than silently overwrite runtime state;
4. assign `backgroundImages: merged.backgroundImages` on `meadowEntryMap`.

### Source-derived village descriptor

`village.ts` continues to compile `sundropVillageLayered` for gameplay. It additionally
uses a pure helper to create the background descriptor from:

- the layered source bounds;
- the Sundrop regional background texture key;
- a stable background ID;
- an optional helper input for depth, which defaults to `-9`.

This is the only connection between the village source and the visual master. Gameplay code
never consults the background descriptor. The helper always materializes the required
`depth` field; the renderer has no second implicit depth default. A unit test calls the
helper without a depth argument and asserts `-9`.

### Asset registration and preload

The Sundrop background asset belongs in the existing central asset pipeline:

```text
public/game/assets/regions/sundrop-village-background.png
```

Its asset metadata includes:

- stable texture key;
- public path;
- the approved control-source fingerprint imported from the approval record;
- the approved final optimized PNG SHA-256 imported from the same record.

`BootScene` preloads registered regional backgrounds and retains its existing `loaderror`
diagnostic. `WorldScene` performs a second targeted availability check before rendering, so
the fallback remains explicit even when Phaser substitutes its missing-texture placeholder.
Expected texture dimensions come from the source-derived background descriptor rather than
duplicated asset constants. Dimension validation reads the immutable texture source or
base-frame pixel dimensions (`TextureSource.width/height` or
`frame.cutWidth/frame.cutHeight`) before any image is scaled; it must not inspect
`displayWidth` or `displayHeight` after `setDisplaySize(...)`.

### Render order

The world scene creates visual layers in this order:

1. fallback tile ground at depth `-10`;
2. available and enabled regional backgrounds at depth `-9`;
3. floor/furniture decor, fences, blockers, buildings, and other live world objects;
4. player, encounters, transitions, pickups, NPCs, and discoveries;
5. foreground decor;
6. optional collision debug overlay above normal world content.

In `WorldScene.create()`, `renderRegionalBackgrounds(map)` is inserted immediately after
`renderGround(map)` and before `renderMapDecor(map, ['floor', 'furniture'])`. Explicit depth
`-9`, rather than creation order, guarantees that all default-depth live objects remain
above the background.

The fallback ground is always constructed. A successful opaque regional image hides it
inside the village; an alpha-blended perimeter allows it to participate in edge blending.
The full opening-map tile data, including every compiled village `groundPatch`, remains
unchanged and is built on every scene creation. HPA-307 does not strip visually hidden
patches as an optimization because they remain authoritative for fallback rendering,
minimap semantics, and geometry-preserving regression tests.

### Developer modes

A small pure parser reads URL parameters once when `WorldScene` is created. The global
location access sits behind an injectable reader:

```ts
function resolveWorldRenderOptions(
  readSearch = () => globalThis.location?.search ?? ''
) {
  return parseWorldRenderOptions(readSearch());
}
```

`parseWorldRenderOptions(search: string)` contains the URL semantics. Tests pass a reader
lambda instead of mutating a jsdom/browser location.

| Parameter | Effect |
| --- | --- |
| default | regional background enabled |
| `?regionalBackground=off` | skip all regional backgrounds; show fallback tiles |
| `?mapDebug=collision` | show collision and footprint overlay above the world |
| both parameters | fallback tiles plus collision overlay |

Unknown values are ignored. These controls are developer-only and do not change HUD,
preferences, saves, or gameplay state.

In a browser, developers open the query URL directly. Tauri development uses the CLI's
configuration merge to override the fixed `build.devUrl`, for example:

```sh
bun run tauri dev --config \
  '{"build":{"devUrl":"http://localhost:5173/?regionalBackground=off&mapDebug=collision"}}'
```

This keeps one parser and one set of URL semantics in both hosts; no parallel environment
variable contract is introduced.

The collision debug overlay is drawn from the same resolved live collision inputs used by
`WorldScene`, not from a pre-rendered mask texture. It works for **any active map**, including
interiors reached by a scene restart. It draws map-edge limits, player-radius-expanded static
rectangles, landmark doorway carve-outs, interior-prop collision, and current NPC collision
circles, plus the live object footprints useful for alignment. The overlay therefore
visualizes current runtime truth while the exported masks remain independent art-production
evidence.

### Missing-asset behavior

If a registered background texture is unavailable, `WorldScene`:

1. emits exactly one recoverable `console.warn` map-context diagnostic per background
   descriptor per scene creation, containing background ID, texture key, and map ID;
2. skips the missing image;
3. leaves fallback tiles visible;
4. continues normal scene creation and gameplay.

No placeholder texture is rendered and no loading failure can disable collision or
interaction.

If the source texture exists but its intrinsic pixel dimensions differ from the descriptor,
`WorldScene` logs one diagnostic containing background ID, texture key, map ID, expected
dimensions, and actual dimensions; it then follows the same skip-and-fallback path.

The existing generic BootScene `console.error` may precede the WorldScene warning. “One
targeted diagnostic” refers to the map-context WorldScene warning; it does not require
suppressing Phaser's generic load failure, but repeated availability checks must not emit
additional targeted warnings for the same descriptor during one scene creation.

## Deterministic art-control export

### Inputs

The HPA-307 exporter reads only committed gameplay/control sources:

- `sundropVillageLayered`;
- the compiled village fragment where pixel footprints are required;
- the fully assembled `meadowEntryMap` as collision context, including corridor and
  village-to-crossroads geometry outside the regional canvas;
- stable asset-frame footprint metadata already used by the runtime.

It does not read or infer geometry from the generated background. Geometry queried from
`meadowEntryMap` is clipped to the village world rectangle
`(256, 4352)`–`(2048, 5888)` and then translated to the local `1792×1536` view box. The
exporter must not construct a synthetic 56×48 map for collision queries: doing so would
turn the four art-canvas edges into false world boundaries and incorrectly close the
Crossroads handoff.

### Outputs

The CLI writes reviewable artifacts under:

```text
docs/superpowers/reports/img/hpa-307/
```

The new CLI entry point is `tools/export-village-art-controls.ts`, exposed as
`bun run art:controls:village`. The existing `bun run preview:village` command remains the
HPA-238 historical-preview generator and continues writing only to `img/hpa-238/`.

| Artifact | Purpose |
| --- | --- |
| `village-region-mask.svg` | one color per semantic room |
| `village-layered-collision-mask.svg` | collision authored in the layered source |
| `village-composed-collision-mask.svg` | runtime player-center exclusion from layered, corridor, building, and collision-prop geometry |
| `village-terrain-path-mask.svg` | terrain and path material classes |
| `village-building-entrance-mask.svg` | live building footprints and protected doorway approaches |
| `village-object-anchors.svg` | color- and shape-coded landmarks, transitions, pickups, ambient NPCs, and decor anchors |
| `village-forbidden-tall-mask.svg` | traversable cells and protected approaches where tall art is forbidden |
| `village-art-control.svg` | combined image-generation and alignment reference |
| `village-art-control-manifest.json` | coordinate contract, semantic table, and source fingerprint |

`village-composed-collision-mask.svg` is a new HPA-307 composition, not a copy or rename of
HPA-238's `village-composed-collision.svg`. The HPA-238 renderer composes layered collision
with `pathsRegion.blockers` only. The HPA-307 renderer additionally includes live landmark
footprints and collision-bearing decor using the runtime collision geometry described
below.

Every SVG uses the exact `1792×1536` view box with no legend appended to the art canvas.
Legends, semantic IDs, and human-readable details live in metadata outside the canvas. The
combined image-generation reference contains no text that could be copied into the art.
`village-art-control.svg` is produced by a dedicated HPA-307 renderer that emits geometry
and color fills only; it does not call the existing text-bearing `renderDesignerSvg` and
contains no `<text>` elements.

The exporter treats the HPA-307 directory and filenames as invariants. In particular,
`village-composed-collision-mask.svg` must retain the `-mask` suffix and the exporter refuses
to write HPA-238's `village-composed-collision.svg` name or anything under `img/hpa-238/`.
After a successful run it prints a sorted artifact inventory containing each filename,
encoded byte size, and the single control-source fingerprint, so a local run is reviewable
without first opening the manifest.

### Exporter collision truth

HPA-307 reuses the existing pure save-normalization geometry rather than introducing a
collision refactor:

- `collectStrictCollisionRects(map)` supplies blockers, fences, and collision-bearing
  `mapDecor`;
- `collectLandmarkRects(map)` supplies landmark rectangles with the existing `56px`
  doorway and `18px` transition carve-outs;
- `isInsideAnyCollisionRect(x, y, rects, 12)` supplies the existing player-radius occupancy
  test.

The implementation may export the existing normalization constants so the exporter does not
copy `12`, `56`, or `18`, but it does not move `WorldScene` onto this point predicate or
rewrite its movement methods. `WorldScene` retains segment intersection, strict
current-inside behavior, landmark escape-aware behavior, and dynamic NPC collision.
Save normalization also retains its current behavior. A broader collision consolidation is
separate work and is not required by HPA-307.

The exporter passes the assembled `meadowEntryMap` to these helpers, converts their
center-based world rectangles to exact pixel geometry, applies the `12px` player-center
padding, clips the result to the Sundrop canvas, and only then translates to local
coordinates. Initial spawn, pickup, ambient-NPC, and interaction approaches are reserved
separately because they are live anchors rather than static collision.

`village-composed-collision-mask.svg` renders the resulting player-center exclusion
geometry. `village-forbidden-tall-mask.svg` derives traversability and clearance from that
same static occupancy model. This model is deliberately conservative and is not presented
as a replacement for directional runtime movement.

The HPA-238 `preview.ts` `tileCoverage(...)` helper remains preview-only and is not used by
either HPA-307 mask: its greater-than-50-percent area heuristic does not include the `12px`
player radius or doorway carve-outs. Because `tileCoverage(...)` is not exported, an
import-prohibition test would be vacuous. Behavioral tests instead assert observable
disagreement cases:

- for actual `corridor-wall-2b` (`x:1775`, `y:4510`, `width:170`), world point
  `(1682,4510)` / local mask point `(1426,158)` is excluded even though the HPA-238
  greater-than-50-percent cell heuristic would omit that sliver: village cell `(44,4)`
  overlaps only `6×32 = 192px²`, below its `512px²` threshold;
- world point `(1677,4510)` / local `(1421,158)`, `13px` beyond the same raw left edge,
  remains open;
- a synthetic `96×96` landmark centered at `(100,100)` with a matching transition at
  `(100,130)` leaves that transition center open, directly exercising the `56px` doorway
  and `18px` transition carve rather than relying on a current building whose trigger sits
  outside its footprint;
- world point `(1680,4352)` / local `(1424,0)` at the north village-to-Crossroads route
  remains open, proving the exporter used full-map context instead of synthetic regional
  bounds.

### Forbidden-tall-object mask

The forbidden-tall mask is derived from the static occupancy model above. It covers:

- every traversable cell;
- player-radius clearance around traversable routes;
- entrance and transition approach clearance;
- pickup, ambient-NPC, and initial-spawn approach areas.

The mask is conservative. It may forbid tall art in extra cells, but it must never permit
tall art where the player can walk or must interact. The final visual contract forbids
baked tall objects everywhere; this mask provides an additional geometry-specific control
and review aid.

The current village source has no discoveries. Saves also have no authored map anchors:
they persist the player's current coordinates. Named save/reload checks are walkthrough
checkpoints, not exporter inputs; protecting the full traversable area already protects
every valid save position.

### Fingerprint and stale-art detection

One pure `computeVillageArtControlFingerprint(source, inputs)` function computes a
deterministic SHA-256 fingerprint from a canonical serialization of:

- source origin, dimensions, and tile size;
- terrain, path, collision, decor, and region layers;
- semantic objects and their dimensions;
- external composed blockers;
- live building/prop footprint inputs used by the masks.

The exporter computes the fingerprint once per run and writes the current value to:

- the `computedControlFingerprint` field in `village-art-control-manifest.json`;
- the committed generated
  `src/lib/game/content/generated/sundrop-village-art-control.ts` constant.

The exporter creates `src/lib/game/content/generated/` when absent and emits
Prettier/ESLint-conforming TypeScript. The generated file is not added to `.prettierignore`
or ESLint ignores; normal repository checks validate it.

Approval is deliberately separate. A hand-maintained
`src/lib/game/content/approvals/sundrop-village-background.ts` record contains one approved
fingerprint/hash pair plus the evidence and machine-readable size-budget disposition:

```ts
export const sundropVillageBackgroundApproval = {
  approvedControlFingerprint: '...',
  approvedPngSha256: '...',
  sizeBudgetException: null, // non-empty string only when final bytes are > 4 MiB
  evidenceReport:
    'docs/superpowers/reports/2026-07-25-hpa-307-baked-background-validation.md'
} as const;
```

Neither the control exporter nor PNG finalizer may create or modify this approval record.
The regional asset catalog imports it rather than carrying copied hash literals.

Validation independently:

1. recomputes the current control fingerprint;
2. compares it with the exporter-written manifest and generated constant;
3. compares it with `approvedControlFingerprint`;
4. hashes the final committed PNG and compares it with `approvedPngSha256`.

Running `bun run art:controls:village` after a geometry change updates only the computed
values, so validation remains red until a reviewer compares the regenerated overlays
against the final master and updates the approval record. The failure message says:
“Regenerate controls, review master alignment, record evidence, then update the approved
fingerprint.” This makes visual re-approval a committed artifact rather than an unenforced
instruction.

The control fingerprint proves **geometry freshness**; `approvedPngSha256` proves the exact
reviewed PNG bytes. The finalizer prints the computed PNG digest but never approves it.
Re-optimizing or replacing the file therefore requires a new review and approval-record
update even when control geometry is unchanged.

The asset test requires `sizeBudgetException` to be `null` when the final bytes are at or
below `4,194,304`, a non-empty explanation when they are above that target, and rejects the
asset unconditionally above `8,388,608`. The validation report expands on the same
exception, but tests do not parse prose to discover whether approval exists.

The canonical serialization is structure-only and excludes source comments and formatting,
so comment-only edits do not invalidate the art. Any control-affecting glyph, footprint, or
anchor change intentionally requires regenerated overlays and re-approval. Re-approval does
not require regenerating the master when the updated overlays prove that the existing art
still aligns.

Generation order, JSON keys, line endings, colors, and SVG element order are fixed. Running
the exporter twice against the same source produces byte-identical text artifacts.

## Master-background production

### Generation workflow

The default production tool is Codex's built-in `image_gen`. It receives an exact-size
rasterization of `village-art-control.svg` as its reference image; the SVG remains the
authoritative vector artifact. The fixed prompt requests one complete, orthographic
top-down village master at the target `7:6` aspect ratio, with the approved palette,
upper-left lighting direction, baked/live exclusions, and route-preservation rules.

The built-in generator does not promise a fixed native output size. For every candidate the
validation report records the production tool, prompt, reference fingerprint, and complete
normalization transform: native width/height, crop `x/y/width/height` (or `none`), and final
uniform scale factor. Normalization happens in this order:

1. Generate the complete art-control set from the approved checkout.
2. Rasterize `village-art-control.svg` at exactly `1792×1536` and provide that raster as the
   image-to-image reference.
3. Generate one complete candidate with the fixed prompt.
4. If the candidate is not already `7:6`, select the largest in-bounds `7:6` crop that
   retains all required edge and handoff content after normalization. Record the crop
   rectangle. The crop may be positioned to preserve the authored composition; it is not
   assumed to be centered, and generated bleed may be discarded.
5. Reject and regenerate any candidate for which no such crop exists. Do not stretch it,
   pad it with invented content, or cut a required edge or route cue.
6. Uniformly scale the resulting `7:6` frame to `1792×1536`.
7. Only after crop and scale, compare it with collision, entrance, anchor, and
   forbidden-tall masks. Iterate or manually remove invented geometry, blocked approaches,
   false doors, text, tall props, and misleading route cues.
8. Create whole-map and close alignment overlays, then pass the normalized opaque master
   to the deterministic PNG finalizer.

This production crop is only normalization of raw generated material. It does not imply
runtime texture cropping, which remains outside HPA-307.

If built-in image generation is unavailable, the art-production slice stops and is resumed
in the Codex app. The workflow does not substitute a placeholder or silently switch to a
CLI generator. A different generator may be used only after explicit user authorization,
with its tool/version and native-output details added to the report.

The generated candidate is raw material, not an integration-ready asset. Manual cleanup and
mask-based review are mandatory.

### Asset finalization and repository budget

The checkout baseline at design review is approximately `14 MiB` under
`public/game/assets/`; the largest existing single asset is
`village-buildings.png` at `3,305,164` bytes, and the repository has no Git LFS
configuration. The new master is therefore a material repository-size increase rather than
a negligible sprite addition.

The checked-in PNG has a **review target of `4 MiB` (`4,194,304` bytes)** and a **hard
encoded abort limit of `8 MiB` (`8,388,608` bytes)**. A final artifact above the review
target but at or below the abort limit requires an explicit exception in the validation
report, including why further compression damaged the approved visual quality. A file above
the abort limit cannot be committed.

A repository finalization script owns the complete deterministic PNG pipeline:

1. accept the clean, normalized, fully opaque `1792×1536` master produced by the generation
   workflow;
2. remove nondeterministic/editor metadata;
3. begin with tier 0 (no RGB quantization), or apply the selected version-pinned nonzero
   quantization tier while preserving truecolor RGBA output;
4. apply the exact edge-alpha function below;
5. run the version-pinned lossless PNG optimizer;
6. validate final dimensions and every alpha value, then measure and hash **that final
   optimized artifact**.

The script first measures the tier-0 final artifact. If it exceeds the `4 MiB` target, the
operator either selects the next pinned quantization tier or records the permitted
visual-quality exception when the artifact is already at or below `8 MiB`. A result above
`8 MiB` must advance to the next tier. Every retry starts from the untouched clean opaque
master, then reapplies the feather, optimizer, validation, and measurement. It never
requantizes an already quantized image or measures an intermediate pre-feather file. Each
nonzero tier requires a visual comparison with the unquantized normalized master. If no
approved tier produces a valid file at or below `8 MiB`, finalization aborts without
replacing the committed asset and the candidate must be reworked or regenerated.

The implementation plan must pin the optimizer/quantizer version and arguments in repository
tooling; a developer-global binary with unspecified settings is not reproducible. A unit
asset check enforces dimensions, feather alpha, review-target/exception semantics, the hard
encoded-size limit, and the approved final PNG SHA-256. The finalizer prints the computed
digest for review but cannot create or update the approval record.

### Visual composition

The approved master provides:

- varied grass and packed soil;
- organic road edges and irregular cobblestone;
- worn tracks, erosion, drainage, moss, stones, weeds, and flowers;
- richer garden beds and shrine-season ground dressing;
- subtle ground relief that never implies false collision;
- foundation wear and contact shadows aligned to live footprints;
- strong regional character without changing the room graph.

Lighting is fixed from the upper left to remain coherent with the existing live sprites. The
palette is warm and lush, with a distinct autumn accent around the shrine.

Detail density follows navigation:

- **high detail:** room edges, non-walkable margins, foundations, gardens, and boundary
  transitions;
- **medium detail:** yards and secondary open spaces;
- **low detail:** critical routes, plazas, doorway approaches, reward approaches, and
  transition throats.

### Baked versus live contract

| Baked into the master | Must remain live |
| --- | --- |
| grass, soil, stone, road-edge variation | buildings and doors |
| low-profile weeds, flowers, moss, stones | NPCs, pickups, discoveries, and quest objects |
| tracks, erosion, and terrain blending | collision-bearing props |
| shrine-season ground dressing | trees, arches, and foreground overlap objects |
| foundation wear and contact shadows | animated or stateful objects |

The master contains no signs, labels, text, false entrances, building silhouettes, tall
objects, or visually collision-bearing structures.

### Regional edge treatment

The final RGBA master uses a deterministic inward edge-blend mask, up to two tiles
(`64px`) wide, so its grass and road materials blend into the existing opening-map tiles.
The blend is reviewed at every canvas edge and at the East Gate/Crossroads handoff. It must
not fade out required road or doorway cues prematurely.

The cleaned RGB master is fully opaque before this mask is applied. For each integer pixel
coordinate `(x, y)` on a `width × height` image, the shared generator/test function computes:

```text
d = min(x, y, width - 1 - x, height - 1 - y)
t = clamp(d / 64, 0, 1)
alpha = round(255 × (t² × (3 - 2t)))
```

This is a `64px` smoothstep feather. Corners use the single nearest-edge distance `d`; edge
alphas are not multiplied and no radial corner rule is applied. Pixel `0` on every edge is
transparent, pixel distance `64` and all interior pixels are opaque.

The finalizer and automated image test import the same pure alpha function. The test
recomputes every pixel's expected alpha, verifies exact equality, and retains the diagnostic
properties that edge-normal samples increase monotonically and no one-pixel jump exceeds
`32/255`. Perceptual color seams remain a human review gate because intentional terrain
variation makes a universal color-delta threshold misleading.

## Integration validation

### Unit and integration tests

Tests cover:

- exact center-based placement and source-derived `1792×1536` bounds;
- explicit Phaser `0.5, 0.5` origin and helper-defaulted `-9` depth;
- `RegionFragment` and opening-map background merging;
- deterministic controls and complete artifact inventory;
- static occupancy geometry matching the runtime rectangle/radius/doorway rules, including
  the concrete `corridor-wall-2b` points `(1682,4510)` (excluded) and `(1677,4510)` (open);
- the synthetic matching-landmark transition at `(100,130)` (open), plus full-map clipping
  that leaves `(1680,4352)` open at the north village-to-Crossroads route;
- computed manifest/generated fingerprint consistency, approved fingerprint freshness, and
  approved PNG hash freshness;
- background asset registration and BootScene preload;
- injectable URL-mode parsing;
- tile depth `-10`, background depth `-9`, and live-object ordering;
- enabled, disabled, invalid-query, missing-texture, and wrong-source-dimension paths;
- one targeted WorldScene `console.warn` per missing background per scene creation;
- exact edge alpha, the `4 MiB` review-target/exception rule, the hard `8 MiB` limit, and
  approved final PNG SHA-256;
- unchanged collision, transition, reward, NPC, minimap, and save contracts.

Existing map and scene tests remain authoritative for gameplay. Background tests must not
replace or weaken them.

### Browser and screenshot evidence

Playwright captures:

1. regional background enabled;
2. fallback tiles via `?regionalBackground=off`;
3. collision overlay via `?mapDebug=collision`;
4. fallback plus collision overlay;
5. simulated regional-background load failure.

The failure test registers a Playwright route **before navigation**:

```ts
await page.route(
  '**/game/assets/regions/sundrop-village-background.png',
  (route) => route.abort('failed')
);
```

It then loads the normal application entry point, captures the targeted console diagnostic,
and asserts that:

- the HUD reaches ready state and the canvas remains mounted;
- exactly one BootScene `console.error` identifies the intercepted asset load failure;
- exactly one targeted WorldScene `console.warn` identifies the background ID, texture key,
  and map ID;
- no other game-scoped error or duplicate targeted warning is emitted.

It does not stub a Phaser texture key, unregister a texture after boot, or add a production
test hook, so the real asset request, BootScene failure, and WorldScene skip paths are
exercised. The existing normal-boot test continues to require zero game console errors; the
expected BootScene error is scoped only to this deliberately intercepted test.
Chromium may additionally emit a generic `net::ERR_FAILED` resource message for the
intercepted URL. The test may filter that browser-generated message by exact URL and error
code, but it must not use a blanket console-error exclusion.

Review artifacts include whole-map alignment views and close crops for:

- Home Yard;
- Well Plaza;
- Market / Blacksmith loop;
- North Residences and Guild Forecourt;
- Shrine Garden and reward pocket;
- East Gate and Crossroads handoff;
- every building doorway and transition approach;
- all four regional canvas edges.

The load-failure run also saves a screenshot artifact beside the
`?regionalBackground=off` baseline. Human review of that pair—not DOM/canvas visibility
alone—is the evidence that fallback tile pixels are visible and no missing-texture
placeholder was drawn. The automated test proves continued boot and exact diagnostics; it
does not claim pixel-level fallback detection without an image assertion.

Landmark labels remain live because `renderLandmarks(...)` still draws them. Screenshot
reviewers must distinguish those runtime labels from forbidden baked text; the master itself
contains no labels.

### Continuous controller walkthrough

Repeat the HPA-238 route with the master enabled:

```text
Spawn → Plaza → Market reward → Home → Shrine reward → Plaza
→ North Residences → building entrances → Guild → East Gate
→ Crossroads → return to village
```

Enter and exit every village interior. Confirm no corner snagging, false route cue, hidden
transition, NPC obstruction, or misleading visual obstacle. Save and reload in Home Yard,
Well Plaza, Shrine Garden, and East Gate and confirm positions and navigation remain
unchanged.

### Loading and GPU review

The base decoded RGBA texture cost is:

```text
1792 × 1536 × 4 = 11,010,048 bytes ≈ 10.5 MiB
```

The evidence is committed to:

```text
docs/superpowers/reports/2026-07-25-hpa-307-baked-background-validation.md
```

The report records:

- final encoded asset size, the `4 MiB` review-target result or documented exception, and
  the hard `8 MiB` result;
- control-source fingerprint and final optimized PNG SHA-256;
- browser/Tauri load duration on the reference macOS device;
- actual Phaser renderer type;
- `WebGLRenderingContext.MAX_TEXTURE_SIZE` when the selected renderer is WebGL;
- texture upload count for WebGL or image decode count for Canvas;
- median and p95 frame time over the same controller route with background enabled and
  disabled.

There is no wall-clock CI threshold for local asset loading. The acceptance gate is
renderer-specific:

- WebGL reports a texture limit of at least `1792`, the master's longer axis;
- Canvas successfully decodes and draws the full `1792×1536` image;
- `2048` or greater is recorded as the preferred WebGL safety margin;
- the texture loads once during BootScene, with one upload for WebGL or one decode for
  Canvas;
- there is no sustained walking-frame regression greater than `2ms` at p95 on the reference
  device;
- no visible hitch or texture re-upload occurs when leaving and returning to the world
  scene.

The `~10.5 MiB` figure is the base decoded RGBA pixel allocation, not a claim about total
browser or GPU memory: staging copies, row alignment, and driver overhead may make actual
residency larger. The global texture manager intentionally retains the regional texture
across WorldScene restarts and interior round trips; validation must show one upload rather
than a new upload on every return.

The p95 limit is a **device-local acceptance gate**, not a wall-clock CI assertion. CI
enforces deterministic controls, fingerprint and asset checks, unit/integration behavior,
and the normal build gates; the report records hardware, browser, Tauri, and measurement
details for the manual timing comparison.

When the selected renderer is WebGL, a supported target must report
`MAX_TEXTURE_SIZE >= 1792` for HPA-307 to complete; the design does not assume a universal
`2048` minimum. A lower measured value makes the baked path unsupported on that target. If
an upload is consequently rejected—or any renderer fails to decode/register the
texture—the existing missing-texture path skips the image and leaves fallback tiles
visible. The target cannot claim baked-background acceptance until separate product work
resolves the constraint. Runtime cropping is **out of HPA-307 implementation scope**, and
implementers must not improvise partial crops in this issue.

## Error handling

| Failure | Required behavior |
| --- | --- |
| background request fails | emit the scoped BootScene error and targeted WorldScene warning; continue on tiles |
| texture exists with wrong dimensions | log dimensions; skip image; continue on tiles |
| fingerprint is stale | fail unit validation before integration |
| control output changes unexpectedly | deterministic artifact diff requires review |
| generated art drifts from masks | reject or clean candidate; do not alter gameplay geometry |
| edge seam is visible | revise edge blend; do not hide it with new live collision |
| WebGL limit is insufficient | mark the baked path unsupported for that target |
| texture upload or decode/register fails | follow missing-texture behavior and continue on tiles |

## Verification commands

Run the routine implementation checks from the repository root:

```sh
bun run art:controls:village
bun run check
bun run lint
bun run test:unit -- --run
bun run test:e2e
```

Run the full desktop release build once as the final acceptance gate, not after each edit:

```sh
bun run tauri build
```

The final report at
`docs/superpowers/reports/2026-07-25-hpa-307-baked-background-validation.md` additionally
records the controller walkthrough and browser/Tauri performance evidence. Automated gates
do not claim that the device-local p95 number is CI-portable.

## Alternatives considered

### Mask-driven material composition

Generate reusable grass, soil, stone, and shrine materials and assemble them
programmatically from masks. This provides excellent geometry safety but risks a procedural,
repetitive result that falls short of the approved rich authored surface.

### Independently generated regional chunks

Generate one image per village room or runtime chunk. This simplifies local iteration but
creates style, lighting, and seam inconsistencies and directly conflicts with HPA-307's
master-first requirement.

### Master-first runtime cropping

Generate and approve one coherent master, then crop it for runtime. This preserves visual
coherence but adds loading, seam, and bookkeeping complexity. HPA-307 rejects this as an
implementation path. If measured target evidence later requires it, that is separate
product/design work rather than an implicit contingency in this issue.

## Acceptance traceability

| HPA-307 acceptance requirement | Design mechanism |
| --- | --- |
| coherent rich regional surface | one generated and cleaned master |
| layered geometry remains authoritative | display-only background descriptor |
| live buildings and interactions | explicit baked/live contract and render ordering |
| exact route and doorway alignment | source-derived masks, overlays, and walkthrough |
| tile fallback/debug rendering | tiles always built; URL disable mode |
| missing-asset diagnostics | BootScene plus targeted WorldScene check |
| no visible seams | alpha edge blend and full-edge evidence |
| acceptable loading/GPU use | one-texture budget and measured performance report |
| full controller validation | repeated HPA-238 route and save/reload matrix |
| deterministic art controls | canonical output, source fingerprint, and final PNG digest |

## Definition of done

HPA-307 is complete when:

- the approved `1792×1536` master is committed and fingerprint-current;
- the encoded master meets the `4 MiB` review target or carries an explicit visual-quality
  exception, and is at or below the hard `8 MiB` limit after deterministic finalization;
- the committed master matches the manually approved PNG SHA-256;
- Sundrop Village renders it beneath unchanged live gameplay objects;
- fallback, collision-overlay, and missing-asset modes work;
- control masks and alignment evidence are deterministic and reviewable;
- unit, integration, E2E, lint, check, and Tauri build validation pass;
- controller traversal and save/reload checks pass with the background enabled;
- loading, texture limits, decoded memory, and frame behavior are documented;
- no visible seam, route drift, doorway obstruction, or invented interactive structure
  remains.
