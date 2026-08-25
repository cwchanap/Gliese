# Meadow Collision, Live Assets, and Interior Redesign

**Date:** 2026-08-23

**Status:** Approved

**Classification:** Architectural world revision

**Owning workflow:** `gliese-world-expansion`, with `2d-game-asset-workflow` and `imagegen` after layout approval

## Relationship to the complete-world design

This document revises the approved
`2026-08-19-complete-world-background-and-layout-redesign-design.md` decisions for:

- Meadow Entry collision;
- Meadow exterior building and NPC placement;
- exterior building visual ownership;
- player and human-NPC art;
- all seven village-interior layouts and painted presentation.

Those subjects are no longer frozen. Where the two documents conflict, this document is
authoritative. The existing complete-world design remains authoritative for the approved Meadow
visual direction and for later Ruins work. Ruins layout, Ruins art, and enemy art are not part of
this revision.

## Player-facing outcome

The approved Meadow background remains the visual baseline, but its collision, building lots,
door approaches, and character placement match what the player sees. Rivers, forests, cliffs, and
other impassable terrain have smooth, intentional boundaries instead of broad invisible
rectangles. Buildings and characters remain live objects, are repositioned onto authored anchors,
and are regenerated in the same painterly top-down style as the landscape.

All seven interiors receive new coordinate-first layouts and complete painted backgrounds. Static
floors, walls, furniture, lighting, and clutter are baked into each map package. Actors, pickups,
transitions, and interactions remain live. A painted map never mixes with stray legacy static
sprites.

## Scope

The revision covers:

1. the complete 6400x6400 `meadow-entry` map;
2. every Meadow terrain-collision boundary and critical route;
3. every exterior building and building-adjacent transition in Meadow;
4. every human NPC visible in Meadow or the seven village interiors;
5. the player-character world and battle animation art;
6. `hero-house`;
7. `guild-hall`;
8. `item-shop`;
9. `villager-house-1`;
10. `villager-house-2`;
11. `villager-house-3`;
12. `shrine-of-aurora-interior`.

The revision may change Meadow building lots, footprints, doors, roads, NPC coordinates, interior
dimensions, room geometry, furniture zones, and non-durable spawn or arrival coordinates. It may
selectively regenerate or inpaint portions of the Meadow background where the approved geometry
requires a different lot, route, or terrain boundary.

## Preserved gameplay contracts

The revision preserves:

- the 6400x6400 Meadow world extent;
- every existing map ID;
- story, quest, shop, dialogue, pickup, discovery, encounter, and progression identities;
- transition destinations and semantic entrance/exit relationships;
- existing NPC identities and interaction roles;
- current combat and traversal abilities;
- the player collision radius and character/NPC interaction radii;
- the player's `idle`, `walk`, `attack`, and `dead` animation behaviors and timing;
- save-schema compatibility for durable progression state;
- the existing nearest-walkable-position and map-spawn fallback policy.

Coordinate changes are allowed only through an approved control layout. Generated art must fit the
approved geometry. Geometry must not be moved opportunistically to rescue a generated image.

## Reuse and genuinely new work

This revision extends the current repository paths:

- `MeadowEntryControlInputs`, `meadow-entry-authoring-layout.ts`, and
  `meadow-entry-proof-renderer.ts` remain the outdoor control, region, crop, overlay, and proof path;
- `VILLAGE_INTERIOR_LAYOUTS` remains the seven-interior room, wall, door, spawn, approach, and prop
  authoring table;
- `MapBackgroundPackageDefinition`, background ownership, and `WorldScene`'s transactional package
  rendering remain the per-map painted/legacy activation path;
- `PlayerMovementDiagnostic` events and the existing Playwright movement harness remain the runtime
  proof seam;
- `generate-meadow-entry-runtime.ts` supplies the committed `// @generated` plus `--check` pattern;
- existing layout tests remain the base for route, clearance, approach, and distinctness validation.

The smallest genuinely new capabilities are:

- one pure shared navigation module in `core/navigation.ts`;
- one 16px `NavigationMaskSource` format and deterministic runtime-grid generator;
- one narrow village-interior package builder over existing layouts and package definitions;
- the approved revised layouts and generated background/building/character assets.

No replacement Meadow control system, map editor, room graph, scene framework, or second background
package model is introduced.

## Coordinate-first outdoor foundation

Meadow remains one connected overworld with the existing regional identities and destination
relationships. The current painterly background establishes the approved palette, material
density, biome richness, lighting, and top-down perspective.

The existing Meadow control package is extended as the source of truth for:

- walkable terrain;
- water, forest, cliff, mountain, and other impassable terrain;
- road and path corridors;
- bridges, ferry approaches, and crossing clearances;
- building lots and structure footprints;
- door and return-arrival anchors;
- NPC activity and player-approach anchors;
- spawns, transitions, pickups, discoveries, encounters, and proof routes;
- the four Meadow background crop boundaries.

The control package must expose reviewable overlays at full-map and camera-crop scale. The old
eight broad river rectangles and four broad crossing rectangles are reference evidence, not the
new collision source.

The outdoor redesign preserves the current biome arrangement and overall travel network. Local
roads, lots, banks, and clearings may move when needed to make the approved background and live
objects compose naturally. Every critical destination remains reachable without adding swimming,
climbing, jumping, or another traversal mechanic.

## Navigation-grid architecture

### Resolution and meaning

Each revised map receives an authored static-terrain mask compiled to a deterministic navigation
grid with 16x16 world-pixel cells. Meadow therefore compiles to 400x400 cells.

This is an intentional change to the existing Meadow renderer-mask material contract. Its current
version pins `walkableSpaceTileSizePx` to 32. The implementation must:

- change renderer walkability from 32px to 16px;
- bump `MeadowEntryRendererMaskMaterialContract.version`;
- re-pin its implementation SHA and every reviewed control/art SHA invalidated by that contract
  change;
- regenerate and re-approve the affected control, export, proof, and runtime artifacts.

The 16px value is navigation resolution, not map-tile resolution. `WorldMapDefinition.width` and
`height`, `MEADOW_ENTRY_TILE_SIZE_PX`, `MeadowEntryControlInputs.tileSizePx`, and
`LayeredRegionSource.tileSize` remain in the existing 32px map-authoring units. Camera bounds and
world dimensions continue to use those 32px units. No second 32px runtime collision grid remains
authoritative after the 16px navigation package is active.

The authored mask describes raw impassable static terrain. Compilation applies the existing
12-pixel player clearance and produces player-centre walkability. The generated grid is the runtime
contract; runtime code does not read or infer collision from painted-image pixels.

### Authored format and compilation point

The navigation source uses dimension-checked glyph rows, following the repository's existing
layered collision convention:

- `.` is raw open terrain;
- `#` is raw blocked terrain;
- one glyph represents one 16x16 navigation cell;
- Meadow has exactly 400 rows of exactly 400 glyphs.

Meadow's rows live in
`src/lib/game/content/backgrounds/meadow-entry-navigation-source.ts` and extend the existing
`MeadowEntryControlInputs`/authoring-layout/proof-renderer path. They do not create a second outdoor
control package. The control renderer expands the rows into reviewable raw-collision and
player-centre-walkability overlays for approval gate 1.

Interior navigation rows are produced by the shared village-interior builder from each approved
`VILLAGE_INTERIOR_LAYOUTS` entry, including walls and prop collisions. A map may add a reviewed
explicit glyph override only when its approved geometry cannot be represented by those sources.

`tools/generate-navigation-runtime.ts` validates the sources, applies the 12px clearance rule, and
emits committed `// @generated` data at
`src/lib/game/content/generated/navigation-grids.generated.ts`. It supports `--check`; matching
`world:generate:navigation` and `world:check:navigation` package scripts make stale output fail CI.
This extends the established `generate-meadow-entry-runtime.ts` pattern rather than inventing a
runtime image parser.

### Ownership

The grid owns static collision supplied by terrain and baked scenery:

- water and wetland barriers;
- forest, cliff, mountain, and world-edge barriers;
- interior walls;
- collidable baked furniture and fixtures.

Live structures retain separate collision and doorway openings. Interactable-NPC collision remains
live and radius-based; ambient NPCs preserve their current non-blocking behavior. Pickups,
discoveries, encounters, and transitions remain live interaction anchors. No live decorative
obstacle sprites are reintroduced over the painted background.

### Shared resolution path

The shared navigation contract lives in `src/lib/game/core/navigation.ts`. It is pure TypeScript and
has no Phaser or DOM dependency. It owns the canonical `NavigationGrid`, `NavigationObstacle`, and
world-point types and exports the equivalent of:

- `compileNavigationGrid(source)`;
- `isWalkable(grid, x, y)`;
- `resolveMovementSegment(grid, obstacles, from, to, radius)`;
- `findNearestWalkablePosition(grid, obstacles, point, radius)`.

Exact parameter packaging may follow repository style, but those four responsibilities stay in one
module and receive direct unit tests.

`WorldScene.resolvePlayerCollision`, `normalizePlayerPosition`, diagnostics, and authoring
validation must delegate to this contract. Existing rectangle collectors may remain only as adapters
that produce shared `NavigationObstacle` inputs; they may not independently decide walkability or
reimplement doorway, escape-aware, clearance, or nearest-position rules.

Movement must test every grid cell crossed by a movement segment so the player cannot tunnel
through a narrow bank at a low frame rate. A blocked diagonal may resolve along one open axis, but
must not snag on an otherwise straight approved route.

Runtime movement queries only the cells crossed by the current segment plus nearby live colliders.
It may not scan the full grid or read image pixels per frame.

Save recovery searches outward from an invalid coordinate for the nearest valid player-centre cell.
The current map spawn remains the terminal fallback. Every spawn and arrival must be proved valid.

### Required proofs

The compiled package must prove:

- every spawn, arrival, transition, NPC approach, pickup, discovery, and encounter anchor is valid;
- every critical route has continuous walkable cells with required clearance;
- every bridge and doorway connects walkable space on both sides;
- water, cliffs, dense forest, buildings, walls, and collidable furniture cannot be crossed;
- collision does not extend visibly into an approved road, door, bridge, or activity area;
- the committed generated grid is current with the reviewed navigation source under `--check`.

## Meadow exterior composition

Every building receives an intentional clear lot connected to the road network. Doors terminate
paths naturally. Structure footprints, cast shadows, labels, NPCs, trees, and water may not overlap
accidentally. Building moves update the following as one coordinate change:

- lot;
- footprint and live collider;
- visual anchor and display size;
- door transition;
- exterior return arrival;
- approach corridor;
- associated NPC activity anchors;
- background lot or path treatment.

Sundrop must read as a designed settlement rather than buildings placed independently over a field.
Its civic, commercial, residential, craft, and shrine areas need distinct composition while staying
connected to the existing story route. Other Meadow NPCs receive activity anchors appropriate to
their region instead of arbitrary open-ground coordinates.

## Live exterior-building art

Exterior buildings remain transparent live assets. They are not baked into the Meadow background.

The regenerated set covers every visible frame currently supplied through the village landmark
asset contract, including:

- Hero House;
- Guild Hall;
- Item Shop;
- three visually distinct villager homes;
- blacksmith;
- Shrine of Aurora;
- Whispering Cave entrance;
- Sundrop well.

Any other visible structure retained as a live landmark after the control-layout review must either
join the matching live-asset set or have an explicit ownership decision. It may not silently retain
a mismatched placeholder.

Each building asset must:

- use the approved Meadow perspective, palette, lighting direction, texture density, and edge
  softness;
- have a distinct readable silhouette appropriate to its function;
- contain only the structure and its cast shadow, with no grass, path, water, or other local ground;
- use a tight transparent crop with clean alpha and no matte fringe;
- define a bottom-centre visual origin and a separate gameplay footprint;
- support normal world-depth sorting so the player and NPCs pass naturally in front of and behind
  it;
- fit the approved lot and footprint without changing geometry after generation.

The three villager homes may not reuse one frame with only tint or minor decoration changes.

Persistent landmark text is removed from roofs in normal play. Landmark labels and localization
keys remain available to the area map and existing accessibility/UI consumers. This revision does
not add a replacement proximity-caption or world-marker system.

## Live character art

The player and every visible human NPC used by Meadow or the seven interiors are regenerated as one
coherent character family. Costumes, silhouettes, and props may distinguish roles, but scale,
perspective, outline treatment, palette, and lighting must match each other and the Meadow art.

The player retains four frames for each existing clip:

- idle;
- walk;
- attack;
- dead.

Frame names, clip semantics, frame rates, repeats, combat use, and collision radius stay stable.
Display size may be tuned during the approved graybox/contact-sheet review, but visual size does not
change the gameplay collider.

The regenerated `attack` row must become the source for the existing hero attack clip. The current
placeholder wiring that reuses walk frames for the hero attack is replaced without changing the
clip key, timing, repeat policy, or combat behavior.

NPCs remain live independently positioned sprites. NPC IDs, names, dialogue, quests, shops, roles,
interaction radii, and frame-to-role mappings remain stable. NPC animation is not introduced by
this revision. Every interactable NPC needs an unobstructed player approach. Ambient and
interactable NPCs must both sit on intentional, visually walkable activity locations.

## Interior redesign

All seven interiors are reopened for full coordinate redesign. Their current room programs inform
the new layouts but no current wall, divider, room size, or prop coordinate is frozen.

### Scale and current camera behavior

The redesign uses a hybrid scale:

- Guild Hall and the Shrine are larger landmark interiors that may scroll lightly.
- Hero House, Item Shop, and the three villager homes remain compact but must fill the standard
  runtime viewport more effectively than the current small checkerboard islands.

Compact maps should use intentional room proportions and approved larger dimensions rather than
adding empty floor merely to fill the screen. This revision changes layout dimensions and
composition, not `WorldScene` camera zoom. The current centered bounds and player-follow behavior
remain authoritative. The graybox review must approve map dimensions at representative runtime
viewports before art generation.

### Functional programs

- **Hero House:** entrance, living kitchen, bedroom, study, storage, and personal details.
- **Guild Hall:** public lobby, quest or records area, Guild Master station, quartermaster, gathering
  area, and training space.
- **Item Shop:** sales floor, readable counter approach, displays, stockroom, and work or office
  space.
- **Villager House 1:** family-oriented cottage.
- **Villager House 2:** artisan home and workshop.
- **Villager House 3:** scholar, archive, or traveler-oriented home.
- **Shrine of Aurora:** processional nave, altar, preparation alcove, archive, and reflective or
  luminous focal area.

Each map remains one connected floor on its existing map ID. No second floor, separate room-loading
map, room graph, procedural generator, or generalized editor is introduced.

### Clearance and anchors

Primary routes must be at least 96 pixels wide. Secondary passages and doors must be at least 64
pixels wide. Every map needs:

- one clear entrance axis from spawn to exit;
- connected functional spaces;
- deliberate furniture zones;
- unobstructed NPC interaction approaches;
- a valid exit and return transition;
- valid player and NPC anchors outside static collision;
- adequate camera-edge clearance.

### Painted ownership

Each interior package contains:

- one exact-size opaque base background;
- an optional exact-size transparent foreground for tall walls or furniture that should occlude the
  player;
- one authored collision mask and compiled 16-pixel navigation grid;
- one manifest recording map ID, dimensions, image hashes, and navigation-grid metadata.

One shared builder in `src/lib/game/content/backgrounds/village-interior-package.ts` consumes a
`VillageInteriorLayout`, map ID, image descriptors, navigation-mask source, and visual-ownership
entries. It produces the map's `MapBackgroundPackageDefinition` inputs and compiled navigation
package through one code path. The seven interiors are seven data entries, not seven copied package
implementations.

This builder extends `VILLAGE_INTERIOR_LAYOUTS`, `MapBackgroundPackageDefinition`, and the current
background-ownership machinery. It does not replace the direct-map authoring model or introduce a
general room compiler.

Floors, walls, rugs, furniture, storage, lighting, clutter, and environmental storytelling are baked
into these images. Player, NPCs, pickups, transitions, and interactions remain live.

When an interior painted package is active, all legacy static tiles, walls, and prop sprites are
suppressed. If any required descriptor or texture is unavailable or invalid, that map uses its
complete legacy visual path. Partial painted/legacy composition is forbidden.

Legacy fallback tiles, walls, and props must be regenerated or repositioned from the same approved
layout controls. Fallback presentation may be simpler, but it may not resurrect the frozen interior
coordinates or contradict the revised navigation grid.

## Art-production rules

No final image generation begins for a delivery slice before that slice's coordinate controls,
navigation overlays, building lots where applicable, NPC anchors, and graybox are approved. Meadow
is approved as one complete-map slice; each interior is approved independently.

The approved Meadow background is the style reference and visual baseline. Meadow generation is
limited to the locations where new geometry needs aligned terrain, paths, banks, or clear lots. The
four-crop runtime remains authoritative; generated work must not introduce overlap, duplicate
features, hard seams, or color discontinuity across crop boundaries.

Building, NPC, and hero candidates are reviewed as contact sheets before atlas assembly. Generated
assets are normalized deterministically, alpha-validated, dimension-validated, fingerprinted, and
reviewed at both native size and runtime display size.

Art review rejects:

- rectangular ground remnants around transparent assets;
- mismatched perspective or lighting;
- repeated house silhouettes;
- blurry or haloed alpha edges;
- buildings whose doors do not align with approved anchors;
- characters with inconsistent scale or ground contact;
- background edits that reduce the approved biome richness;
- any live decorative obstacle layer added to compensate for a background miss.

## Runtime packaging and fallback

The existing four-crop Meadow background runtime is extended, not replaced. The revised visual
inventory is versioned as:

- Meadow background descriptors;
- Meadow navigation grid;
- live exterior-building atlas and frame manifest;
- human-NPC atlas and frame manifest;
- updated hero animation frames;
- seven independent interior base/foreground packages;
- seven independent interior navigation grids.

Visual activation is atomic per map. A map may use its complete painted package or its complete
legacy visual path. It may not mix painted terrain with unsuppressed legacy static scenery. Revised
geometry and navigation remain authoritative in either visual mode so gameplay has one coordinate
system.

Required runtime assets must be preloaded before package selection. Dimensions, map IDs, texture
keys, draw order, crop bounds, frame bounds, and generated-navigation freshness are validated before
the map is declared painted-ready.

SHA-256 review pins are limited to external image bytes, manifests, and the existing Meadow
control/art contracts that already require them. TypeScript layouts and navigation glyph sources are
versioned by git and protected by deterministic generated-output `--check`; this revision does not
add manually reviewed per-layout SHA constants or a second chain of layout fingerprints.

Navigation artifacts must remain compact enough to bundle with the map definition and support
constant-time cell lookup. No runtime canvas readback, full-map collision scan, or network-loaded
collision source is permitted.

## Delivery phases

### Phase 1: shared navigation, no visual change

Extract the current collision behavior into `core/navigation.ts`, adapt `WorldScene` and save
normalization to it, and add parity tests before changing geometry, grid resolution, or art. Existing
maps continue to use their current rectangle inputs during this phase; maps without an authored grid
receive a bounds-sized all-open grid plus those existing obstacles. This phase must finish green and
independently reviewable.

### Phase 2: Meadow collision and exterior composition

Extend the existing Meadow control package, move renderer walkability to 16px, re-pin the affected
contracts, author the Meadow navigation source, reposition exterior buildings and NPCs, regenerate
live exterior/character assets, and selectively align the approved background. Meadow approval is a
complete-map gate because its four crops and route network are one visual/navigation composition.

### Phase 3: interiors, one map at a time

Extend the existing interior-layout and generic background-package paths through the shared builder.
Complete Hero House first as the end-to-end package proof, then process the remaining six interiors
individually. Each map may activate its complete painted package while unfinished maps retain their
complete legacy presentation. The revision is not complete until all seven pass.

## Approval gates

The following gates repeat for the active delivery slice. Meadow is one slice; each interior is one
slice. They are not a requirement to finish all eight maps before the first review.

Implementation follows these mandatory gates:

1. **Coordinate control:** the active slice's layout, building lots where applicable, NPC anchors,
   and navigation overlays.
2. **Layout review:** outdoor composition, critical routes, doors, approaches, room programs,
   interior scale, and behavior under the current camera bounds/follow policy.
3. **Live-asset review:** building, NPC, and hero contact sheets on transparent and representative
   Meadow/interior backgrounds.
4. **Painted-art review:** revised Meadow regions plus each interior base/foreground package.
5. **Runtime review:** movement, depth sorting, transitions, interactions, fallback, save reload,
   and visual evidence at the actual runtime resolution.

A rejected gate returns to its owning source. Art is corrected to approved geometry; approved
geometry is not moved merely to accept an image candidate.

## Risks and mitigations

- **32px-to-16px contract churn:** enumerate every invalidated control, approval, export, proof, and
  runtime artifact before changing the contract; regenerate and re-approve them in Phase 2.
- **Runtime/save collision drift:** finish the pure navigation extraction and parity suite before
  enabling a navigation grid; both consumers must use the same module and fixtures.
- **Geometry/art drift:** retain coordinate and runtime-overlay approval before generation; reject
  art that requires unapproved coordinate movement.
- **Partial painted/legacy composition:** keep per-map transactional package activation and exercise
  missing/invalid texture paths for every package shape.
- **Generated-character inconsistency:** approve contact sheets at native and runtime scale before
  atlas assembly; validate alpha, frame bounds, and role mappings deterministically.
- **Resource-sensitive aggregate tests:** keep focused functional gates mandatory and report any
  aggregate resource failure separately without treating it as a pass.

## Validation and acceptance

### Outdoor collision

- The player cannot enter painted water, cliffs, dense forest, mountains, or building footprints.
- The player can traverse the full approved width of roads, bridges, ferry approaches, lots, and
  doorway approaches without invisible blocking or edge snagging.
- Each biome boundary receives runtime movement proof at representative camera crops.
- The complete critical-route suite crosses every region and returns to Sundrop.

### Exterior placement and art

- No building, cast shadow, label, or character overlaps water, trees, cliffs, or another structure
  unintentionally.
- Every building door aligns visually and mechanically with its approach and transition.
- All three villager homes are visibly distinct.
- Buildings, NPCs, and the player share a coherent scale and painterly style with the background.
- Runtime depth examples prove characters in front of and behind representative structures.

### Interiors

- Every functional room or zone is readable without labels.
- Every spawn, exit, passage, NPC approach, and required interaction is reachable.
- Static collision matches walls and furniture without invisible barriers.
- Exit/re-entry and save/reload preserve a valid player position.
- No painted map shows checkerboard floor, legacy wall strips, or stray prop overlays.
- Compact interiors fill the viewport intentionally; landmark interiors scroll without exposing
  voids or camera-edge artifacts.

### Packaging and fallback

- Every manifest dimension and external-image hash matches its approved package.
- Generated navigation modules pass `--check` against committed glyph/layout sources.
- Meadow crop seams remain invisible at native camera scale.
- Missing required art causes a complete per-map legacy visual fallback.
- The fallback remains playable with revised coordinates and navigation.

### Regression and verification

Verification includes:

- deterministic navigation-grid compilation tests;
- shared runtime/save navigation tests;
- map validation for anchors, route continuity, dimensions, generated-grid freshness, and ownership;
- asset frame, alpha, and manifest tests;
- focused WorldScene movement, depth, interaction, and fallback tests;
- exit/re-entry and save-normalization tests for all seven interiors;
- `bun run check`;
- `bun run lint`;
- one-shot unit tests;
- `bun run build`;
- targeted Playwright traversal and runtime screenshots.

The current layout suite contains deliberate freezes that this revision supersedes:

- `documents the two Guild Hall room centers replaced by named reachable approaches` is rewritten
  around the approved Guild Hall geometry and reachable interaction anchors;
- `freezes the seven current room programs and their composed-collision routes` is replaced with
  assertions for the approved dimensions/programs plus shared navigation continuity;
- `keeps the three villager homes architecturally distinct` remains required and is updated only for
  the new approved signatures.

The existing general invariants for spawn/exit reachability, room connectivity, NPC approaches,
door clearance, and distinct home programs remain regression requirements.

Image-heavy aggregate suites that are already resource-sensitive must be reported separately from
focused functional verification. A resource-related aggregate failure may not be represented as a
functional pass, and it does not waive the focused acceptance suite.

## Out of scope

This revision does not add:

- a new map or second interior floor;
- new story prose, quests, shops, NPC identities, or dialogue;
- swimming, climbing, jumping, or another traversal mechanic;
- enemy-art redesign;
- Ruins layout or background redesign;
- combat-system changes;
- NPC animation;
- a general map editor, procedural generator, generalized collision-geometry editor, room graph, or
  new scene framework.

## Completion definition

The revision is complete only when the coordinate controls, 16-pixel navigation grids, repositioned
live objects, regenerated live assets, seven painted interiors, atomic fallback behavior, focused
automated tests, and runtime visual/movement evidence are all approved. Source or unit-test claims
without current runtime evidence are insufficient.
