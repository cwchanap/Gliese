# Meadow Entry Painted Background Pilot — Design

- **Date:** 2026-08-10
- **Status:** Approved in conversation; implementation planning pending
- **Branch:** `codex/hpa-586-painted-background-pilot`
- **Depends on:** HPA-586 Meadow Entry V2 coordinate and interior work

## Decision

Replace Meadow Entry's visible graybox presentation with a new HPA-586-native painted
background package. The package uses a coherent `6400×6400` world composition, large baked
base art, optional foreground occlusion art, and the existing live gameplay geometry.

Delivery is staged:

1. remove the dead historical runtime preload and regenerate HPA-586-native controls;
2. establish one full-world concept master for palette, biome, route, and landmark coherence;
3. produce and integrate a native-detail review pilot for Sundrop Village, the Hero House
   frontage, the village–Crossroads connector, and Crossroads;
4. obtain visual approval in the running game;
5. extend the approved treatment to Wildwood, Mistfen, Silverpine, Tidewatch Coast, and the
   remaining handoff areas;
6. activate the final mandatory whole-world base only after all world coverage and acceptance
   gates pass.

The pilot may be exercised in a development review mode, but it is not the final production
replacement. Normal production activation must not ship a patchwork in which semantic region
images are the only base beneath painted areas.

## Player-facing outcome

Meadow Entry should read as one authored fantasy landscape rather than a tile grid:

- roads have irregular edges, wear, stones, and material transitions;
- grasslands have broad color structure rather than one repeated texture;
- village lots feel cultivated and inhabited;
- Crossroads is visually important before the player reads its label;
- terrain, fields, water, woods, and built areas transition naturally;
- live characters, buildings, rewards, enemies, and interactions remain crisp and readable;
- no visual detail implies collision that does not exist.

The final target is a warm painterly pixel-diorama presentation. It borrows broad composition
principles from richly illustrated tactical-RPG overworlds while remaining recognizably Gliese.

## Problem

HPA-586 deliberately disabled the historical Meadow Entry art while rebuilding authoritative
outdoor and interior coordinates. The current runtime therefore exposes:

- visibly repeated grass and path tiles;
- long rectangular ground-patch edges;
- large empty lawns between isolated sprites;
- sharp material seams at region handoffs;
- sparse ambient dressing that cannot establish place at a `1920×1080` camera view;
- a mismatch between detailed buildings/landmarks and flat surrounding terrain.

The historical HPA-496/HPA-406 package proves that large baked art and regional export tooling
can work, but its pixels are not suitable as the replacement. They were authored for the older
geometry, have a muddy low-contrast finish, and are intentionally inactive under HPA-586.

## Reference research

Official Unicorn Overlord material describes and shows a high-detail 2D overworld with freely
traversed, visually distinct countries and settlements:

- official site: <https://unicorn-overlord.com/index.html>
- official PlayStation page and screenshots:
  <https://www.playstation.com/en-us/games/unicorn-overlord/>

The project will use only high-level lessons inferred from those references:

- compose large terrain masses before adding small detail;
- use winding routes and landmark silhouettes for navigation;
- differentiate biomes through palette, material, foliage, and density;
- layer foreground vegetation and structures to create depth;
- keep interaction markers and characters legible against scenic art.

Official screenshots are moodboard references only. They are not generation inputs, training
material supplied by this project, or assets to reproduce. Prompts must not request an exact
Vanillaware or Unicorn Overlord style. The requested direction is described generically as a
warm, hand-painted fantasy overworld with pixel-diorama readability.

## Goals

- Create a coherent full-world visual concept at the exact HPA-586 world aspect and bounds.
- Produce native-detail baked base art for the approved pilot areas.
- Add foreground occlusion only where it materially improves depth.
- Preserve current coordinates, collision, routes, transitions, saves, and stateful gameplay.
- Reuse the repository's pure control, provenance, crop, render, fallback, and diagnostic helpers;
  retarget active art-writing commands directly to painted-v2 without a dual-package abstraction.
- Review the result at normal `100%` browser scale before extending the art direction.
- Keep tile and live-decor fallback available throughout pilot development.
- Make the final full-world partition decision from measured browser and Tauri texture results.

## Non-goals

- Redesigning HPA-586 world or interior coordinates.
- Moving collision into image pixels or deriving collision from art.
- Baking NPCs, enemies, pickups, discoveries, doors, labels, or quest state.
- Copying Unicorn Overlord artwork, characters, landmarks, palette values, or exact style.
- Treating the pilot as the final whole-world replacement.
- Repainting interiors in this slice.
- Replacing Phaser's map model, regional composition, save schema, or input system.
- Removing fallback tiles before the final package is complete.

## Approaches considered

### A. Repaint the historical HPA-496 master

This is the fastest path to new pixels, but it preserves obsolete geometry and much of the
old muddy visual structure. It also makes provenance ambiguous because the historical package
is a frozen predecessor. Rejected.

### B. Create a new HPA-586-native master and staged pilot — selected

Generate fresh art from current controls, preserve live gameplay sources, validate a focused
pilot in the running game, then extend the approved treatment across the full world. This has
the highest initial setup cost but produces the strongest visual result without compromising
geometry. Selected.

### C. Enhance the existing tile and decor layers

Add more tiles, sprites, blending overlays, and procedural variation while retaining the
graybox rendering model. This is cheaper, but the grid remains visible and the result does not
meet the requested large-background-art target. Rejected.

## Source ownership

### Authoritative gameplay inputs

The following remain authoritative and are never inferred from the generated image:

- `src/lib/game/content/maps/meadow-entry.ts`;
- the active `RegionFragment` modules under `src/lib/game/content/maps/regions/`;
- `src/lib/game/content/maps/regions/village-layered.ts` and its compiler;
- HPA-586 layout constants under `src/lib/game/content/maps/layouts/`;
- strict blocker, landmark, fence, decor-collision, transition, NPC, encounter, pickup, combat,
  discovery, and route contracts;
- live Phaser player and interaction state.

### New art package

The new package must use a new versioned namespace. It must not overwrite or amend the approved
historical HPA-496/HPA-399 artifacts.

The source package root is:

```text
artifacts/meadow-entry/painted-v2/
  concept/
  controls/
  source-panels/
  masters/
  exports/
  proofs/
  provenance.json
```

Runtime candidates use this distinct asset namespace:

```text
public/game/assets/regions/meadow-entry-painted-v2/
```

The implementation plan defines the exact inventory and script names within those fixed roots.
Historical paths remain immutable. There is no `art-map-adapters/` layer in the current runtime,
and painted-v2 must not resurrect one. HPA-406 deliberately deleted that zero-consumer adapter;
runtime data continues to flow through generated TypeScript descriptors and visual-ownership
helpers.

### Frozen predecessor and tooling reuse contract

HPA-399/HPA-496 is committed historical evidence, not a second live art-writing target. This work
does not add a `PackageConfiguration` abstraction or thread package roots through pure modules.
Instead:

- `artifacts/meadow-entry/hpa-399/**` and
  `src/lib/game/content/approvals/meadow-entry-art-package.ts` remain byte-for-byte immutable;
- their existing historical validation tests remain as provenance evidence;
- active CLI root constants and approval destinations are repointed directly to painted-v2;
- existing explicit output-path arguments remain usable, but no command gains a selectable
  HPA-399/painted-v2 mode;
- `meadow-entry-png.ts`, `meadow-entry-master-provenance.ts`, and other buffer/object validators
  with no package roots are reused unchanged;
- historical regeneration, if ever required, is a separate maintenance task using the historical
  implementation rather than a permanent branch in the new pipeline.

This is an extension of the useful machinery, not a fork of every `meadow-entry-*` module and not
an in-place rewrite of approved predecessor data. PR 2a/2b use the following boundary:

| Concern | Required action for painted-v2 |
| --- | --- |
| Source catalog | Reuse `meadow-entry-source-catalog.ts` unchanged. It already rebuilds from the live fragments and `meadowEntryMap` and fails closed when the join drifts. |
| Authoring regions and control masks | Regenerate `meadow-entry-authoring-layout.ts` from HPA-586 envelopes, then reuse the existing control renderer/export path with new fingerprints and review seals. |
| Bake and runtime visual ownership | Extend `meadow-entry-bake-ownership.ts` and `maps/background-ownership.ts` with a separately reviewed painted-v2 pilot inventory and seal. |
| PNG and provenance validation | Reuse `meadow-entry-png.ts` and `meadow-entry-master-provenance.ts` unchanged; they operate on supplied bytes, paths, and provenance objects. |
| Finalization and export | Reuse the existing pure finalizer/exporter helpers. Repoint the active CLI defaults and approval destination directly to painted-v2; do not add a package switch. |
| Crop contract | Inject painted-v2 pilot crops and ownership into `validateMeadowEntryCropContract`; leave its sealed V1 defaults untouched and add the selected whole-world grid only in PR 3. |
| Runtime descriptor generation | Extend the `tools/generate-meadow-entry-runtime.ts` pattern to emit `src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated.ts`, projected by a thin `meadow-entry-painted-v2-runtime.ts` wrapper. Never reactivate `meadowEntryRuntimeBackgroundImages`. |
| Review flag, preload, render, diagnostics, and probe | Extend `world-render-options.ts`, `BootScene.ts`, the pure map-selection seam described below, renderer diagnostics, and `tools/probe-meadow-entry-texture-safety.ts`. |
| Approval, check mode, and LFS verification | Repoint `approve-meadow-entry-art-package.ts` to a new painted-v2 approval destination; retain the existing control-export `--check`; add no-write checks to the remaining painted-v2 write commands; extend `.gitattributes` and restructure `meadow-entry-storage.ts` so its exact V1 literals and new LFS patterns are independently verified. |

The implementation plan must name the concrete files from this table. A new abstraction is
justified only where more than one live caller actually uses it.

## Runtime baseline cleanup — PR 2a first

The current runtime registry contains 24 historical regional PNGs: two
`sundropRegionalBackgroundAssets` plus 22 `meadowEntryRuntimeBackgroundAssets`. The committed files
under `public/game/assets/regions/` occupy approximately `112 MB`, `BootScene` preloads them by
default, and the current map registry has zero maps with a non-empty `backgroundImages` list. They
therefore consume download, decode, and texture resources without any possible draw owner. Texture
preflight measured on top of that baseline would be misleading.

Before regenerating controls or running the painted-v2 texture probe, PR 2a must:

- remove both historical groups from `regionalBackgroundAssets` in `assets.ts` and remove any
  registry exports that have no remaining non-runtime consumer;
- delete `public/game/assets/regions/sundrop-village-base.png`,
  `public/game/assets/regions/sundrop-village-foreground.png`, and
  `public/game/assets/regions/meadow-entry/**`;
- update asset/preload tests and the stale BootScene byte-count comment;
- prove default boot queues zero regional background textures while every active map still uses
  its current tile/live fallback;
- retain `artifacts/meadow-entry/hpa-399/**`, historical generated data needed by its tests, and
  `src/lib/game/content/approvals/meadow-entry-art-package.ts` unchanged as the provenance record;
- run the texture probe only after this cleanup so `3200×3200` versus `1600×1600` evidence measures
  painted-v2 rather than painted-v2 plus dead predecessor textures.

## Art-control package

The art source must be bound to a fresh fingerprint computed from the current HPA-586 checkout.
The control package includes at least:

- exact `6400×6400` world bounds;
- region and biome envelopes;
- path and ground-material masks;
- strict and landmark collision masks expanded by player radius;
- building footprints and doorway approaches;
- transition and route-throat clearances;
- NPC, ambient NPC, enemy, pickup, discovery, and combat protected areas;
- foreground-eligible and forbidden-tall masks;
- material and lighting notes;
- pilot review bounds and final full-world coverage bounds.

The existing source catalog is already rebuilt from the current fragments and `meadowEntryMap` at
module load and already fails closed on join drift. Reuse it. The real first control task is to
regenerate authoring envelopes from `MEADOW_ENTRY_V2_REGION_ENVELOPES` and the live HPA-586 layout
constants before any panel generation or texture probe.

Five of six principal envelopes changed. The implementation plan carries this exact comparison so
the one matching village rectangle cannot be mistaken for evidence that V1 envelopes are partly
authoritative:

| Region | V1 authoring `(L,T,R,B)` | Active V2 `(L,T,R,B)` |
| --- | --- | --- |
| Sundrop Village | `256,3968,2816,6144` | `256,3968,2816,6144` |
| Crossroads | `2912,2624,4416,4768` | `2880,2816,4608,4768` |
| Mistfen | `224,416,2560,3104` | `384,384,3200,4096` |
| Silverpine | `2176,256,3808,3008` | `2432,384,4480,2816` |
| Wildwood | `3840,256,6400,4928` | `4320,256,6144,5568` |
| Tidewatch Coast | `2784,4448,6400,6400` | `3328,4768,6144,6144` |

Historical approval fingerprints and reviewed ownership seals cannot be reused. Any source missing
from the live catalog, stale source-to-control join, or V1/V2 envelope mismatch fails before
generation, finalization, or approval.

## Staged art production

### Stage 1 — coherent world concept

Create a `6400×6400` concept canvas that establishes:

- all major biome color zones;
- village, connector, Crossroads, destination, water, and forest masses;
- route continuity and landmark emphasis;
- upper-left lighting direction;
- global value hierarchy and atmospheric progression.

The concept may originate at a smaller native generation size and be normalized onto the
`6400×6400` review canvas. It is composition evidence, not a production texture. It may not be
approved as runtime art merely because it fills the canvas.

### Stage 2 — native-detail pilot

Generate native-detail source panels covering:

- `sundrop-village-underlay`;
- the Hero House frontage and spawn view inside that village area;
- `village-crossroads-connector`;
- `crossroads`.

Panel generation uses the current geometry-control raster as the primary image reference and
the approved concept as a secondary composition/color reference. Official third-party game
screenshots are not passed to the generator.

Each raw candidate records:

- tool and model identifier;
- complete prompt;
- reference-artifact hashes;
- native output dimensions;
- crop rectangle, if any;
- uniform normalization scale;
- manual cleanup operations;
- final source-panel hash.

No candidate may be stretched. A uniform resize greater than `2×` requires explicit visual
approval; the default response is to regenerate or split the panel. Cropping may discard bleed
but may not cut required route, edge, or landmark context.

The built-in image-generation tool is the default generator. Generated output is raw material,
not an integration-ready asset. Mask review and manual cleanup are mandatory.

### Stage 3 — full-world production

After pilot approval, apply the same material, lighting, and detail hierarchy to the remaining
world panels. Assemble and review a complete native production master before normal runtime
activation.

## Visual direction

### Shared treatment

- Orthographic top-down/three-quarter map view matching the existing camera and sprites.
- Warm late-morning light from the upper left.
- Crisp shape boundaries near live sprites; no uniform oil-paint blur.
- Broad material zones first, medium wear and edge structure second, small detail last.
- Calmer values and lower detail on critical routes, door approaches, NPC standing areas, and
  transition throats.
- Richer detail at non-walkable margins, gardens, field edges, foundations, and biome borders.
- No visible repeated tile motif within a normal `1920×1080` camera view.
- Ground detail may suggest softness, age, moisture, or cultivation, but never a false wall.

### Sundrop Village and Hero House frontage

- warm cultivated greens and compacted soil;
- irregular dirt and cobble path edges;
- field rows, drainage, flower traces, stones, leaf litter, and foundation wear;
- painted contact shadows around live buildings;
- a welcoming garden clearing at Hero House;
- an unmistakable calm route from spawn to the Hero House door;
- no baked replacement buildings or false doors.

### Village–Crossroads connector

- a scenic narrowing lane rather than a rectangular strip;
- thinning cultivated vegetation toward the travel corridor;
- low stones, path wear, ground flowers, and painted lantern-footing shadows;
- continuous material handoff at both ends;
- no tall baked obstruction inside the route envelope.

### Crossroads

- a high-contrast cobble/packed-earth plaza centered on the live Waystone;
- radial travel wear that explains all outgoing routes;
- village, field, coast, wetland, pine, and forest material cues at their respective mouths;
- readable ambient-NPC and interaction spaces;
- enough local contrast to make the Crossroads a landmark without requiring its label.

## Baked, foreground, and live ownership

| Baked into base art | Optional foreground art | Must remain live |
| --- | --- | --- |
| grass, soil, cobble, field rows, water surface, terrain blending | tree canopies the player passes behind | player, NPCs, ambient NPCs, enemies |
| low weeds, flowers, moss, stones, leaf litter | roof/eave overlap approved by mask | buildings, doors, transition markers |
| path wear, erosion, drainage, wheel ruts | arches and tall foliage with valid alpha | pickups, discoveries, quest objects |
| foundation wear and contact shadows | local fog/brush where gameplay remains readable | collision-bearing or stateful props |
| non-interactive low-profile dressing | approved landmark occlusion | labels, UI, combat and save state |

Collision creation is unconditional regardless of visual ownership or plane success.

Live blockers, decor, and fences may be suppressed only when an approved background owner has
rendered successfully. A source without complete ownership remains live. Stateful content never
uses fallback-only ownership.

Painted-v2 ownership is re-reviewed from the fresh HPA-586 source catalog for the pilot crops. It
does not inherit `MEADOW_ENTRY_REVIEWED_BAKE_OWNERSHIP_SHA256`, historical Sundrop obstacle
predecessor lists, or any V1 ownership fingerprint. The new table has its own review seal, keeps
every stateful source live, and fails closed when the current catalog and reviewed inventory do not
join exactly.

## Pilot crop-validation posture

`validateMeadowEntryCropContract` already accepts injected crops, overlaps, runtime coverage, and
budget summaries. PR 2a finishes that dependency injection rather than adding painted-v2 crops to
the sealed V1 defaults:

- add an injected `bakeOwnership` input and use it in baked-source containment validation instead
  of the module-level `MEADOW_ENTRY_BAKE_OWNERSHIP`;
- make required fallback rectangles/reasons caller-supplied instead of hardcoding the historical
  southwest-ocean fallback assertion;
- add an explicit coverage mode while preserving current V1 defaults and tests.

The painted-v2 pilot uses partial coverage mode. It validates every pilot crop, overlap, budget,
pilot baked-source containment, and supplied pilot coverage entry, but it does not assert that the
pilot union equals the full `6400×6400` master. Everything outside the selected pilot descriptors
continues through the runtime tile/live fallback; PR 2b does not manufacture a full-world rectangle
partition merely to satisfy a V1 validator. PR 3 switches to full-world coverage mode, requires
exact master-area equality, and supplies its own explicit fallback requirements.

## Master and runtime partition

The final base covers exactly `[0, 0, 6400, 6400]` with no transparent holes. PR 2b records texture
support, load/decode behavior, and encoded-cost preflight in the browser and normal Tauri runtime;
PR 3 selects the final partition after the complete production master exists.

Candidate order follows the HPA-586 coordinate design:

1. first measure a `2×2` partition of `3200×3200` base chunks;
2. use a `4×4` partition of `1600×1600` chunks if platform, memory, decode, or file-size evidence
   rejects `2×2`;
3. keep world coordinates, one-to-one scale, deterministic ordering, and exact coverage in either
   partition.

The source master may be assembled from smaller overlapping production panels. Runtime partition
does not dictate generation-panel size. Source-panel seams are removed in the master before
runtime chunks are exported.

Adjacent production source panels share at least `128px` in master coordinates. Each overlap has
one declared assembly owner, and the stitched master is reviewed at native resolution before any
runtime partition is exported. Runtime chunks are always cut from that assembled master so both
sides of a runtime boundary derive from identical approved pixels.

Optional foreground art may use semantic crops when that minimizes transparent texture waste.
Every foreground crop has explicit bounds, dimensions, draw order, ownership, and overlap proof.

## Pilot runtime mode

The partial pilot is a review mode, not normal production activation.

The pilot is enabled only through `?meadowPaintedPilot=on`, resolved alongside the existing world
render options. Without that exact value it is disabled. `regionalBackground=off` has higher
priority: when both parameters are present, painted pilot preload and draw are disabled too, and
that deliberate disabled state is not reported as a texture failure. The mode must satisfy these
rules:

- default gameplay remains the current HPA-586 fallback until full-world approval;
- the pilot uses the real `WorldScene`, camera, collision, actors, transitions, and interactions;
- the mode cannot be mistaken for the final complete package;
- automated tests cover both pilot-on and fallback/default behavior;
- PR 3 activation changes the default descriptor-selection data from fallback to the approved
  whole-world set; it does not require removing a renderer branch.

This exception permits focused visual review without violating the final mandatory-base contract.

### Painted descriptor selection and pure map transform

The active `meadowEntryMap.backgroundImages` remains the result of the current region merge and
therefore remains empty in default HPA-586 gameplay. The historical
`meadowEntryRuntimeBackgroundImages` export stays inactive.

PR 2b adds `meadow-entry-painted-v2.generated.ts` plus the thin
`meadow-entry-painted-v2-runtime.ts` wrapper containing the pilot assets, descriptors, and reviewed
visual owners. A small immutable selection record chooses `fallback`, `pilot`, or eventually
`production` descriptor data. This runtime selection record is not the rejected art-tooling
`PackageConfiguration`.

The integration seam is a pure, Node-testable
`applyMeadowEntryPaintedBackgrounds(map, options): WorldMapDefinition` under `content/maps/`, called by
`WorldScene.resolveMap` after the registry lookup. The function:

1. returns non-Meadow maps and disabled selections unchanged;
2. shallow-clones Meadow Entry when painted data is selected;
3. attaches the selected generated background descriptors;
4. applies reviewed ownership to blockers, map decor, and fences through `applyVisualOwnership`
   without mutating the source map;
5. validates the resulting descriptor/ownership join with `validateMapBackgroundOwnership`.

`BootScene` resolves the same selection record to queue only its asset list and include those keys
in existing load diagnostics. The scene renderer remains the existing generic regional-background
path; it receives an already transformed map and contains no pilot-specific ownership logic.
Unit tests cover flag off, flag on, `meadowPaintedPilot=on&regionalBackground=off`, non-Meadow
identity, exact descriptor attachment, all three ownership source types, immutability, and bad joins.

When and only when the effective PR 2b selection is enabled, successful descriptor IDs suppress the
matching painted-v2 visual-owner rows. Missing or failed pilot planes leave the unchanged map tiles
and live visuals visible. PR 3 activates production by changing the default selection record to the
approved whole-world descriptor set; the same pure transform and generic renderer stay in place.

## Runtime rendering

The existing render architecture remains:

```text
fallback ground tile layer
  → successful painted base planes
  → live lower decor/fences/blockers not owned by successful art
  → live landmarks and interior-floor/furniture props
  → player, NPCs, encounters, transitions, pickups, discoveries, live foreground decor
  → painted foreground planes at the existing foreground background depth
  → high-depth interaction markers and collision debug overlay when requested
```

This is the effective depth stack, not the method-call order. Painted foreground pixels may cover
the player and default-depth live decor only inside the approved foreground-eligible mask. Live
sources that must appear above those pixels stay outside the mask unless the implementation plan
adds and tests an explicit higher-depth contract for that source type.

`BootScene` preloads only the assets enabled for the selected mode. `WorldScene` attempts each
descriptor independently, records observed dimensions, applies deterministic depth, and emits the
existing regional-background diagnostics with the effective mode, successful background IDs, and
selected live fallbacks.

No art-loading failure may remove collision or stateful content.

## Failure behavior

### Pilot

- Missing, malformed, wrong-sized, or failed pilot base art falls back to the current tile/live
  presentation and emits a diagnostic.
- Failed foreground art restores any corresponding live foreground visual.
- A failed ownership join fails validation before runtime assets are approved.

### Final package

- A missing or malformed mandatory base chunk is a build/validation error.
- Optional foreground failure may restore approved live visuals.
- Any transparent base hole, wrong coordinate, wrong scale, overlap seam, stale control hash, or
  unapproved source suppression fails closed.
- Existing saves remain valid because no save-state schema changes.

## Deterministic finalization and storage

Image generation is intentionally nondeterministic; approved output publication is not.

Repository tooling must:

- normalize color space and alpha deterministically;
- strip nondeterministic metadata;
- use pinned PNG encoder/optimizer settings;
- validate dimensions and alpha policy;
- calculate byte size and SHA-256 from final committed bytes;
- publish source, exports, provenance, and approval atomically;
- regenerate runtime descriptors from approved manifests;
- support a `--check` mode that performs no writes;
- validate Git LFS tracking and materialization for large artifacts.

`tools/export-meadow-entry-art-controls.ts` already provides a no-write `--check`; PR 2a reuses it.
Equivalent validation-only modes are added only to the active write commands that still lack one,
including approval, master finalization, and regional export. `meadow-entry-storage.ts` is
restructured so frozen HPA-399 literals and painted-v2 LFS patterns are asserted independently,
without turning storage paths into a general package configuration.

Size budgets are measured during implementation preflight and recorded before final approval.
Lossy or quantized variants require side-by-side visual review against the unquantized source.

## Automated validation

Validation is deliberately split so the pilot does not pretend to certify a package that does not
yet exist.

### PR 2a baseline and control gates

PR 2a contains no generated scenic art. Its focused tests prove:

- all 24 dead runtime PNG registrations and public files are removed while frozen artifact and
  approval bytes remain unchanged;
- default boot queues zero regional background assets and all active maps retain tile/live
  fallback;
- the six principal authoring envelopes equal `MEADOW_ENTRY_V2_REGION_ENVELOPES` and the current
  source catalog still resolves exactly against the assembled map;
- painted-v2 controls and review seals are deterministic;
- injected crop validation uses the supplied bake ownership, partial coverage does not invoke V1
  whole-world or southwest-fallback assumptions, and existing V1 defaults retain their tests;
- active write commands support validation-only execution without modifying outputs;
- frozen HPA-399 and new painted-v2 LFS paths/materialization are checked independently;
- the texture probe begins from the cleaned zero-regional-texture baseline.

PR 2a passes its focused unit tests, check, lint, and browser/Tauri frontend builds before PR 2b
starts.

### PR 2b pilot-art and integration gates

The PR 2b implementation plan includes focused tests for:

- the fresh HPA-586 control fingerprint, regenerated authoring envelopes, and exact current source
  inventory;
- exact pilot semantic bounds, painted-v2 assets, generated descriptors, and package-specific
  provenance;
- full-world concept dimensions and provenance, without treating the concept as runtime art;
- deterministic pilot candidate normalization and pilot source/runtime-crop dimensions;
- pilot base opacity and any included foreground alpha eligibility;
- protected live-content exclusion and an exact pilot ownership join against the new review seal;
- successful ownership selection plus missing texture, wrong dimensions, base render failure, and
  foreground render failure returning to graybox/live fallback;
- flag off, flag on, and `meadowPaintedPilot=on&regionalBackground=off`, with the latter skipping
  both preload and draw;
- collision, pilot routes, transitions, interactions, rewards, discoveries, and save/reload
  remaining unchanged in focused unit and browser E2E coverage;
- browser visual captures at the required pilot views;
- browser build and Tauri frontend build.

The PR 2b texture probe records measured browser and normal-Tauri evidence for representative
`3200×3200` and `1600×1600` candidates. It does not select the final grid, require concurrent
retention of a nonexistent whole-world package, or turn final partition equality into a pilot
gate. A packaged Tauri build/window launch may be recorded when the environment supports it, but
it is not a routine PR 2b acceptance gate.

### PR 3 final-package gates

PR 3 adds the expensive and whole-world checks:

- exact `[0, 0, 6400, 6400]` mandatory-base coverage and selected partition equality;
- source-panel assembly overlap and seam equality before runtime crops are cut;
- dimensions, alpha, hashes, and concurrent WebGL retention for every final base and foreground
  texture;
- the full reviewed ownership inventory and fail-closed production-art validator;
- the default selection record activating the full production descriptor set through the same map
  transform and renderer;
- repo-wide automated, browser, packaged-Tauri, and native walkthrough acceptance.

The full production-art validator remains a deliberate PR 3 art-approval gate rather than a
routine PR 2b test.

## Manual and visual acceptance

Review every capture at `1920×1080`, device pixel ratio `1`, browser zoom `100%`, with no debug
overlay except the dedicated collision image.

Required pilot captures:

1. Hero House frontage and spawn route;
2. Sundrop Village main street/market context;
3. village–Crossroads connector midpoint and both mouths;
4. Crossroads Waystone plaza;
5. one foreground-occlusion example, if foreground art is included;
6. collision overlay at one representative painted/live ownership boundary;
7. pilot-disabled fallback at a matching camera position;
8. missing-plane fallback evidence.

Manual movement covers spawn → village → connector → Crossroads → connector → village, crossing
both handoffs in both directions and interacting with one live NPC, pickup, transition, and
discovery where available. One save/reload verifies that art integration did not alter state.

PR 2b must pass the Tauri frontend build. A packaged Tauri build/window launch and native pilot
walkthrough are useful additional evidence when the execution environment supports them, but they
do not block the pilot visual-direction decision. If the environment can launch but cannot safely
control the native window, report packaged build/window launch as PASS and the native
movement/visual walkthrough as BLOCKED. Do not convert a locked-GUI launch into a functional
acceptance claim. Packaged build and real native walkthrough acceptance become mandatory for the
final PR 3 activation.

The pilot is visually approved only when:

- the grid is not perceptible in normal play;
- the route remains immediately legible;
- painted shadows and live sprites agree;
- no seam, double-darkening, transparent hole, duplicate visual, or invisible collision appears;
- buildings and actors remain sharper than their surroundings;
- the approved warm daytime mood holds across all pilot views;
- the result is materially better than both the current graybox and the historical muddy master.

## Acceptance criteria

The staged pilot is complete when:

- a coherent `6400×6400` concept exists with recorded provenance;
- all approved pilot areas have native-detail source and runtime art;
- pilot review mode uses real gameplay and preserves default fallback mode;
- controls, assets, descriptors, ownership, and provenance are deterministic and validated;
- focused pilot unit and browser E2E tests pass;
- check, lint, browser build, and Tauri frontend build pass;
- texture preflight records comparative `2×2` and `4×4` evidence without selecting the final
  partition;
- required screenshots and movement evidence are inspected;
- the user explicitly approves the pilot's visual quality.

The final Meadow Entry replacement is not complete until:

- every remaining world region is refined to the approved pilot quality;
- the mandatory base covers the exact world at one-to-one scale;
- all final chunks and optional foregrounds pass size, texture, overlap, alpha, ownership, and
  provenance gates;
- the default selection record activates the approved whole-world descriptors through the same
  pure transform used by the pilot;
- the entire outdoor route and representative stateful gameplay pass in browser and Tauri;
- packaged Tauri build/window launch and a real native walkthrough pass;
- subjective whole-world visual review is approved.

## Delivery sequence

### PR 1 — design and implementation plan

- this approved design;
- measured implementation tasks, file ownership, validation commands, and review gates;
- an explicit `REUSE`/`EXTEND`/`NEW` inventory for every reuse-table row above;
- the painted-v2 generated-module boundary and exact BootScene/`resolveMap` integration seam.

The next implementation plan covers PR 2a and PR 2b as separate reviewable changes. It stops at
the pilot visual-approval gate.

### PR 2a — runtime hygiene and HPA-586 controls

- delete dead historical public runtime assets and preload registrations;
- regenerate the six principal authoring envelopes from HPA-586;
- export painted-v2 controls and new test-owned seals;
- finish crop-validator dependency injection and partial-coverage mode;
- repoint active write-tool roots, add missing no-write checks, and extend `.gitattributes` plus
  fixed LFS verification;
- establish the clean texture-probe baseline;
- remain Node-testable and contain no generated scenic art.

### PR 2b — concept, pilot art, and integration

- full-world concept;
- native pilot source/final art;
- generated runtime descriptors and data-driven selection;
- pure map transformation at `WorldScene.resolveMap` plus BootScene asset selection;
- pilot review mode, fallback behavior, and texture evidence;
- focused automated and visual evidence.

### PR 3 — full-world refinement and activation

- remaining production panels;
- final master and selected mandatory-base partition;
- final foreground crops and ownership;
- normal runtime activation by changing the default descriptor-selection data;
- whole-world automated, visual, browser, and Tauri acceptance.

PR 3 receives a separate implementation plan after the pilot is approved. This design supplies
its constraints, but the pilot plan must not silently expand into full-world production.

## Resulting architecture

```text
HPA-586 geometry + current live gameplay sources
                      │
                      ▼
          painted-v2 art controls + fingerprint
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
  6400×6400 concept        native source panels
          │                       │
          └───────────┬───────────┘
                      ▼
          reviewed production master(s)
                      │
           deterministic finalizer/exporter
                      │
          ┌───────────┴────────────┐
          ▼                        ▼
 mandatory base partition   optional foreground crops
          │                        │
          └───────────┬────────────┘
                      ▼
 generated runtime descriptors + approved ownership
                      │
                      ▼
     fallback / pilot / production selection data
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
  BootScene asset list      pure map transform
                                    │
                                    ▼
                       generic WorldScene renderer
                      │
                      └── live collision and stateful gameplay remain authoritative
```
