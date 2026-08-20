# Complete World Background and Layout Redesign

**Date:** 2026-08-19

**Status:** Approved in chat; external-review changes incorporated

**Classification:** Architectural world revision

**Owning workflow:** `gliese-world-expansion` with `2d-game-asset-workflow` for approved art production

## Player-facing outcome

Every playable map receives a proved spatial layout and a complete painterly background. The Meadow overworld becomes a coherent landscape shaped by a river, forests, foothills, wetlands, coast, settlements, and optional exploration loops. The seven building interiors retain their already-authored room programs and receive targeted geometry changes only where route, scale, clearance, or visual-composition proof shows a miss. The Ruins Threshold and Ruins Core become visually and spatially distinct dungeon stages.

Static scenery is baked into complete map backgrounds. Gameplay objects and collision remain live. The result must not expose crop overlap, duplicated scenery, obstacle overlays, hard region boundaries, or a mixture of painted and legacy presentation within one map.

## Scope and map inventory

All ten current maps are in scope:

1. `meadow-entry`
2. `hero-house`
3. `guild-hall`
4. `item-shop`
5. `villager-house-1`
6. `villager-house-2`
7. `villager-house-3`
8. `shrine-of-aurora-interior`
9. `ruins-threshold`
10. `ruins-core`

`meadow-entry` remains exactly 6400×6400 pixels, or 200×200 cells at 32 pixels per cell. Existing interior layouts are the baseline rather than disposable scaffolding. Interior and ruins dimensions may change only when a documented layout proof shows that the current geometry cannot satisfy an approved route, clearance, encounter, scale, or composition requirement. Each interior remains one connected floor on one existing map ID.

## Preserved gameplay contracts

The redesign preserves:

- all ten map IDs;
- the existing story and quest sequence;
- transition destinations and semantic entrance/exit relationships;
- quest, shop, NPC, enemy, encounter, pickup, discovery, and dialogue identities;
- required interaction semantics;
- save compatibility for durable progression state;
- current movement, camera, combat, interaction, and transition mechanics.

Coordinates, map dimensions other than Meadow, room layouts, routes, collision rectangles, encounter placements, interaction approaches, and non-durable spawn positions may change through the coordinate-first redesign, but compliant current geometry is preserved. A package may not move geometry merely to make generated art fit.

If a saved coordinate becomes invalid after the redesign, the existing `normalizePlayerPosition` policy remains authoritative: clamp to map bounds, resolve to the nearest walkable tile when possible, and use that map's existing `spawn` as the terminal fallback. Every map's `spawn` must be proved walkable. No parallel safe-arrival registry, save-schema change, or new progression identity is introduced.

## Story and content boundary

This work does not rewrite story prose, quests, shops, NPC identities, or combat rules. Existing story requirements constrain location purpose and required encounters. Any prose change routes separately through `gliese-story-writer`.

The layout may strengthen environmental storytelling but may not introduce a new canonical character, quest state, reward, locked gate, or narrative outcome through art alone.

## Spatial design

### Meadow Entry

Meadow Entry remains a single 6400×6400 overworld with a coherent watershed and travel network.

- **Silverpine:** elevated foothills, ridges, rock faces, conifers, overlooks, and the river source.
- **River system:** a continuous river descends from Silverpine, passes through the central world, creates bridges and a ford, then widens into Mistfen and coastal water. Its banks, tributaries, islands, and drainage must remain spatially and visually coherent.
- **Wildwood:** dense layered forest, clear trails, glades, fallen trees, and optional woodland loops.
- **Sundrop Village:** orchards, gardens, varied yards, clustered trees, a readable main street, and small public spaces.
- **Crossroads:** a designed central plaza where mountain, forest, village, river, and coast routes visibly meet.
- **Mistfen:** wet lowland with pools, reeds, muddy routes, raised crossings, and foggy vegetation.
- **Tidewatch and coast:** cliffs, beaches, tidal pools, rock shelves, and a stronger harbor or coastal-settlement identity.

Natural features shape navigation. Bridges, fords, passes, overlooks, and optional loops are part of the route design. Swimming, climbing, jumping, or another new traversal mechanic is out of scope.

Every critical destination remains reachable. Optional routes may reward exploration but may not alter the existing story sequence.

### Building interiors

`VILLAGE_INTERIOR_LAYOUTS` is the starting contract. Its current room programs, doors, NPC approaches, and occupant themes are retained unless a focused proof demonstrates a specific failure. The functional names below are acceptance outcomes; they do not require renaming an existing room or splitting it into a new authored node when the current space already satisfies the outcome.

Each interior has a readable outer silhouette, clear entrance axis, quiet interaction approaches, connected rooms, and a distinct functional identity.

- **Hero House:** the existing bedroom, study, hall, and living/kitchen program must read as foyer, living room, kitchen and dining area, bedroom, study corner, storage, personal clutter, and warm domestic lighting.
- **Guild Hall:** the existing records hall, common hall, Guild Master office, training hall, quartermaster room, and lobby must read as public reception, quest-board and trophy area, gathering hall, office, equipment storage, and training or briefing area.
- **Item Shop:** the existing sales floor, counter approach, displays, stockroom, office, and service corridor must read as retail, packing/work, storage, and merchant space.
- **Villager House 1:** the existing Lynn/family program remains the family-oriented home.
- **Villager House 2:** the existing Toma/workshop program remains the craft-oriented home.
- **Villager House 3:** the existing Io/archive-study program remains the older or traveler-oriented household.
- **Aurora Shrine:** processional entrance, central worship space, side alcoves, reflective or luminous focal element, altar approach, and service or storage space.

The three villager-house themes are already reconciled by the current occupant bindings and `VILLAGE_INTERIOR_LAYOUTS`. Reopen a theme only if a story-source audit finds a concrete contradiction; prose changes still route separately through `gliese-story-writer`.

No building uses a second floor, separate room-loading map, interior compiler, room graph, or new scene framework.

### Ruins

- **Ruins Threshold:** overgrown upper ruins with collapsed courtyards, broken halls, alternate loops, readable encounter spaces, and a strong descent to the core.
- **Ruins Core:** darker enclosed architecture, stronger depth, ritual chambers, constrained routes, and a distinct final encounter space.

The two maps must differ in silhouette, palette, lighting, route rhythm, and environmental density while preserving their existing progression relationship.

## Owning sources

Layout remains authored by the current repository sources:

- Meadow regions and connectors: hand-authored `RegionFragment` modules under `src/lib/game/content/maps/regions/` and registration in `src/lib/game/content/maps/meadow-entry.ts`.
- Sundrop tile-level geometry: `src/lib/game/content/maps/regions/village-layered.ts` and its existing compiler path.
- Building interiors and ruins: direct `WorldMapDefinition` sources in `src/lib/game/content/maps.ts`.
- Shared map contracts: `src/lib/game/content/maps/types.ts`.

No generalized map editor, procedural generator, new layered-interior model, or replacement authoring framework is part of this program.

## Visual ownership

The current ownership machinery is extended rather than replaced:

- `MapInteriorProp` and `MapGroundPatch` gain the same optional `visual?: MapVisualOwnership` hook already used by blockers, outdoor decor, and fences;
- `validateMapBackgroundOwnership` validates ownership for blockers, decor, fences, interior props, and ground patches;
- base-tile-layer visibility is selected at map-package level because the default terrain grid is not an individually owned record;
- background selection resolves the complete required texture set for one map before committing presentation;
- if any required base or foreground descriptor is unavailable, invalid, or render-failed, already-created images from that package are destroyed and the whole map uses legacy tiles and static visuals.

This is a small generic extension of the existing background-selection seam. It is not a new map authoring framework, and it must not be implemented as ten copied map-specific selectors.

### Baked presentation

Complete backgrounds own all noninteractive static visuals:

- terrain and paths;
- water, riverbanks, beaches, cliffs, ridges, and rock formations;
- trees, shrubs, flowers, roots, reeds, and other vegetation;
- outdoor buildings and noninteractive architectural detail;
- interior floors, walls, rugs, shelves, tables, beds, counters, dishes, books, tools, plants, and decorative clutter;
- static ruins architecture, debris, moss, and environmental damage;
- noninteractive lighting and shadow treatment.

### Live runtime objects

The runtime continues to own:

- player, NPCs, ambient actors, and enemies;
- encounters and combat state;
- pickups, rewards, discoveries, and quest state;
- shops and dialogue interactions;
- doors, transitions, arrival semantics, and interaction markers;
- animated or stateful effects;
- invisible collision and navigation constraints;
- collision debug rendering.

Generated backgrounds must not bake actors, pickups, transition markers, interaction prompts, encounter sprites, false doors, or other stateful objects.

### Foreground occlusion

Sparse transparent foreground art is permitted only when an overhang must correctly occlude the player, such as a tree canopy top or arch. It must:

- derive from the same approved master and coordinate system;
- contain only occluding pixels with transparent empty space;
- never duplicate ground, buildings, or collision silhouettes;
- never function as a live obstacle overlay;
- have explicit source and runtime bounds;
- fail together with the base package for that map.

## Art direction

The visual style is grounded storybook fantasy in the current painterly top-down JRPG perspective. The world is richer but remains readable.

Decoration works at three scales:

1. **Large forms:** river bends, ridgelines, forest masses, cliffs, courtyards, room walls, and major furniture groupings.
2. **Medium forms:** tree and rock clusters, gardens, bridges, pools, ruins, tables, shelving, rugs, and work areas.
3. **Small texture:** flowers, leaf litter, roots, pebbles, tools, dishes, books, cloth, cracks, moss, and controlled light variation.

Rules:

- Natural decoration is clustered, asymmetric, and composition-led rather than uniformly scattered.
- Forests use varied silhouettes, scale, density, and grouping rather than repeated tree stamps.
- Mountains and cliffs read as continuous landforms, not blocker bars or rectangular inserts.
- The river remains continuous across source panels and runtime exports.
- Region boundaries use broad changes in vegetation, soil, elevation, moisture, and light rather than hard material seams.
- Paths remain readable through value separation, edge treatment, and negative space.
- Important interaction clearances stay visually quiet.
- Interiors use distinct palettes and lighting while retaining one scale and camera perspective.
- Architectural repetition may establish rhythm; natural repetition may not look stamped.
- Generated frames, macro rectangles, crop boundaries, duplicate landmarks, false walls, and false doors are rejection conditions.

## Coordinate-first production workflow

Final image generation does not begin until the corresponding layout package is approved.

For each map or map package:

1. Inventory immutable gameplay IDs, current geometry, room/route programs, and semantic requirements.
2. Diff the current layout against the approved requirements, preserve compliant geometry, and author only the changes needed to close documented failures in the owning source.
3. Render layout, collision, route, transition, interaction-clearance, and stateful-object controls.
4. Prove critical and optional navigation using composed runtime collision.
5. Obtain explicit layout approval.
6. Build generation references from approved controls and the shared art bible.
7. Generate distinct source candidates with exact prompt and reference provenance.
8. Assemble one canonical continuous master for the map.
9. Inspect the master at overview, gameplay-camera, seam, interaction, and native-detail scales.
10. Obtain explicit art approval.
11. Publish runtime exports and bind exact hashes, dimensions, controls, and source provenance in review mode for that map package.
12. Verify runtime, map-local fallback, browser, save, and native behavior while the package remains non-default.

Generated art never becomes authoritative geometry. If art conflicts with approved geometry, correct or regenerate the art.

## Runtime packaging

### Meadow Entry

Meadow Entry has one canonical continuous 6400×6400 master. Runtime publication slices it into four exact, non-overlapping 3200×3200 base textures:

- northwest: `{ x: 0, y: 0, width: 3200, height: 3200 }`
- northeast: `{ x: 3200, y: 0, width: 3200, height: 3200 }`
- southwest: `{ x: 0, y: 3200, width: 3200, height: 3200 }`
- southeast: `{ x: 3200, y: 3200, width: 3200, height: 3200 }`

These exports are literal slices of the same decoded master. Runtime rectangles do not overlap. Adjacent source edge pixels must remain continuous because no blend zone exists.

The replacement package retires the current overlapping camera-safe pilot crop contract. `validateMeadowEntryCropContract` and `tools/generate-meadow-entry-runtime.ts` are retargeted to the four exact bounds above, and the replacement manifest has no `MeadowEntryOverlap` rows. Existing 1920×1080 camera-envelope tests remain, but assert coverage by the union of the four slices rather than shared pixels. The historical two-crop pilot and its evidence remain available for comparison until replacement acceptance; they are not reused as the new package contract.

The existing `painted-v2-2x2` texture-probe candidate is the mandatory pre-generation budget gate: exactly four retained 3200×3200 textures, WebGL available, `MAX_TEXTURE_SIZE >= 3200`, and no context loss. A new master is not generated until that probe passes in the target browser/runtime environment.

### Interiors

Each interior uses one complete base background at its exact approved pixel dimensions. The texture's width and height must each be at most 3200 pixels unless a new explicit texture probe approves a larger bound. A map may add one sparse transparent foreground occlusion export only when its approved layout proves the need. Interiors use the generic map package and ownership contract; they do not inherit `MeadowEntryOverlap`, Meadow authoring regions, or the Meadow crop-manifest model.

### Ruins

Each ruins map has one canonical master. A single runtime texture may be no larger than 3200×3200 under the currently approved probe. If either master dimension exceeds 3200 pixels, publication uses the same literal, non-overlapping regular-grid slice rule as Meadow, with edge slices cropped to the remaining master bounds. Runtime overlap is forbidden; a different bound requires a new named probe and explicit approval before generation.

## Runtime selection and fallback

Background selection is per map and all-or-nothing.

- When every required base and foreground texture for a map loads, the complete painted presentation is selected and legacy tiles/static prop visuals are suppressed.
- If any required texture is missing, malformed, dimensionally invalid, or fails to render, the complete legacy presentation is restored for that map.
- A map never displays a mixture of painted quadrants and legacy ground.
- Fallback does not change collision, transitions, actors, encounters, pickups, quests, or save state.
- Diagnostics identify the selected map package, required texture IDs, successful IDs, failure status, and final presentation mode.

The implementation generalizes the current review-mode selection seam to a registry keyed by `mapId`. Each entry declares its required base and optional foreground descriptors as one package. The renderer evaluates the package conjunction before suppressing the base tile layer, ground patches, blockers, decor, fences, or interior props. Per-crop success remains diagnostic evidence only; it cannot select a mixed presentation.

The current painted Meadow package remains available until its replacement has passed publication and runtime acceptance. It is an explicit historical partial-coverage comparison, not a conforming complete-map package: its two required textures still succeed or fail as one transaction, but it retains the legacy base layer outside their union. Once Meadow geometry changes, it is opt-in only. No intermediate package becomes the default merely because some maps are finished.

## Program decomposition

This program is too large for one implementation batch. It is delivered as five approval-gated packages:

1. **Layout and runtime foundation**
   - Inventory all ten maps and diff their current room, route, ID, transition, encounter, and interaction contracts against this design.
   - Preserve layouts that already pass; change only geometry with a documented failing proof. Meadow's missing continuous watershed and crossings are the known geometry gap. The existing expanded Ruins shells remain unless composed-collision navigation proof exposes a specific miss.
   - Treat the current Lynn/family, Toma/workshop, and Io/archive-study themes as closed unless story sources prove a contradiction.
   - Extend visual ownership to interior props and ground patches, add package-level base-tile suppression, and establish generic map-local all-or-nothing fallback before any new art is generated.
   - Produce Meadow overview and per-map graybox/control renders and prove routes, collision, transitions, encounters, interaction approaches, and existing save recovery through `normalizePlayerPosition` and walkable `map.spawn` values.
   - This is the first implementation plan. It performs no final image generation.

2. **Meadow art package**
   - Establish the final shared art reference.
   - Re-run and pass the named `painted-v2-2x2` texture probe before master generation.
   - Produce and approve the continuous Meadow master.
   - Review all regions, handoffs, routes, river crossings, building approaches, and four runtime edges.
   - Retarget the crop/runtime generator to four exact non-overlapping slices and bind the package in review mode under the existing opt-in flag; do not make it default.

3. **Interior art package**
   - Produce seven complete interior masters in reviewable batches.
   - Review functional readability, room identity, baked decoration, door approaches, and NPC approaches.
   - Bind each completed interior through the generic per-map review-mode selector with ownership validation, diagnostics, and one required-texture fault proof; do not make it default.

4. **Ruins art package**
   - Produce Threshold and Core independently.
   - Review route clarity, encounter arenas, progression, atmosphere, and distinction.
   - Bind each completed ruins map in review mode using one texture when both dimensions are at most 3200, otherwise the shared non-overlapping grid rules; include ownership, diagnostics, and one required-texture fault proof.

5. **Runtime publication and acceptance**
   - Verify all already-published review-mode exports and provenance as one release candidate.
   - Confirm the generic selection, diagnostics, preload, fallback, and suppression contract covers all ten maps without copied Meadow-specific selectors.
   - Enable the production default only after every required map package is complete and approved.
   - Complete automated, browser, save/reload, failure, and native acceptance.

Each package receives its own narrow implementation plan and report. Art packages may refine their own generation prompts and review inventories, but may not change the shared ownership, no-overlap, fallback, or gameplay-contract rules without revising this design.

## Validation

### Layout validation

- Map IDs and required content identities remain present and unique.
- Every transition has a reachable approach and valid safe arrival.
- Every required NPC, shop, pickup, discovery, encounter, and quest interaction has a reachable clearance.
- Critical routes and documented optional loops are navigable under composed runtime collision.
- Bridges, fords, passes, doors, counters, and corridors meet explicit player-clearance requirements.
- No required route proof uses an all-open collision grid.
- Saved positions outside new valid space recover to the documented safe arrival for that map.
- Layout-review reports classify each map as `preserved` or `changed` and record the exact failing proof that justified every geometry change.

### Art validation

- Canonical PNG dimensions, color space, alpha policy, bytes, and SHA-256 are recorded.
- Source prompts, references, transforms, attempt history, and rejection reasons are recorded.
- Static art contains no baked live/stateful object.
- Runtime base rectangles do not overlap.
- Adjacent exports match the continuous master exactly.
- Region and room boundaries have no visible crop, frame, grid, or material discontinuity.
- No false door, wall, bridge, path, pickup, NPC, or interaction cue appears.
- Overview and native-detail review both pass.

### Runtime validation

- Required assets preload exactly once and dimensions match descriptors.
- Healthy selection suppresses legacy static presentation for that map.
- Each individual required-texture fault restores the complete legacy presentation for that map.
- A failed multi-texture package renders zero images from that package and never suppresses the legacy base tile layer, ground patches, or static visual collections.
- Collision and gameplay objects remain unchanged between healthy and fallback presentation.
- Browser walkthrough uses a 1920×1080 viewport and samples every exterior camera route and every interior.
- The walkthrough covers all map transitions, representative NPC/shop/quest interactions, encounters, pickups, save, reload, and resumed navigation.
- A final Tauri desktop smoke verifies rendering, input, transitions, and persisted save behavior separately from browser evidence.

## Acceptance walkthrough

The final acceptance route begins at Hero House, visits the major Sundrop interiors, follows the village road through Crossroads, traverses the river crossing, Wildwood, Silverpine, Mistfen, and Tidewatch/coast, then enters Ruins Threshold and proceeds to Ruins Core. It must:

- enter and exit all seven interiors;
- interact with a representative NPC, shop, quest, pickup, and discovery;
- cross every major natural route feature;
- trigger representative encounters in the overworld and both ruins maps;
- save in Meadow, reload, and continue from a valid coordinate;
- exercise healthy painted selection;
- inject one required-texture failure per package class and prove complete map-local fallback;
- finish without visible overlap, crop boundary, missing background, legacy static overlay, false collision cue, or blocked required route.

## Non-goals

- Story, dialogue-prose, quest, shop, combat, or progression redesign.
- New traversal mechanics.
- Multi-floor interiors or separate room loading.
- A procedural map generator, generalized map editor, room compiler, or new authoring framework.
- Animated water, dynamic weather, day/night simulation, destructible scenery, or mutable furniture.
- Replacing gameplay sprites, HUD, battle presentation, or save schema unless a later approved package establishes a separate requirement.
- Runtime overlapping crop planes or live static-obstacle decoration over healthy painted maps.

## Approved decisions

The user approved these decisions in chat:

- all ten maps are included;
- gameplay identities and progression remain while spatial layouts may change;
- grounded storybook-fantasy density;
- all noninteractive static scenery is baked;
- interiors use one expanded connected floor;
- Meadow remains 6400×6400;
- natural features shape navigation without new movement mechanics;
- coordinate-first inventory, proof, and targeted redesign rather than art-first repaint, blind geometry replacement, or modular overlapping planes;
- staged package delivery with explicit layout and visual approval gates;
- non-overlapping runtime exports and complete map-local fallback;
- the visual-language and decoration rules in this document.
