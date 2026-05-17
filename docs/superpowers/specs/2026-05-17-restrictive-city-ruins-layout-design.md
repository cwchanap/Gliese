# Restrictive City And Ruins Layout Design

## Summary

Redesign Gliese's outdoor exploration maps from open fields into larger, more restrictive
2D spaces. The first pass expands `meadow-entry`, `ruins-threshold`, and `ruins-core` to
`200x200` tiles each while preserving the compact village interiors. The city becomes a
readable district loop with streets, buildings, walls, and blockers. The ruins become a
puzzle-ready dungeon shell with loops, side chambers, stair-style transitions, and future
gate locations, but no puzzle mechanics yet.

The implementation should stay inside the current Phaser/Svelte architecture: map content
is authored in TypeScript, Phaser renders and collides with the world, and Svelte remains
the HUD/menu/dialogue layer.

## Goals

- Expand `meadow-entry`, `ruins-threshold`, and `ruins-core` to `200x200` tiles.
- Keep `hero-house`, `guild-hall`, `item-shop`, and villager houses at their current compact
  interior sizes.
- Make the city more restrictive while still readable as a settlement.
- Fold outdoor slime combat into the route instead of keeping a separate open forest arena.
- Make ruins more dungeon-like with loops, side chambers, blockers, and stair-style links.
- Reserve future puzzle-gate locations in the ruins without adding switches, keys, or puzzle
  state in this slice.
- Preserve the current quest, shop, NPC, combat, pickup, save, and dialogue behavior.

## Non-Goals

- No external map editor or Tiled/JSON map pipeline.
- No procedural map generator.
- No new puzzle mechanics, locked-door state, keys, switches, or save-schema changes.
- No rewrite of enemy AI or pathfinding.
- No redesign of Svelte HUD, dialogue, inventory, shop, or quest log UI.
- No expansion of compact interiors in this pass.

## Current Context

`src/lib/game/content/maps.ts` is the source of truth for map dimensions, spawns,
transitions, encounters, pickups, NPCs, landmarks, fences, forest dressing, and current
outdoor route gates.

`WorldScene.ts` derives pixel bounds from `map.width * 32` and `map.height * 32`,
builds generated tilemap ground, renders world dressing, and centralizes player blocking
through rectangle collision helpers. The current collision model already covers NPCs,
landmarks, fences, and forest tree clusters. The redesign should reuse this path rather
than creating a second collision system.

The current transition model already supports explicit destination arrivals. That remains
the correct mechanism for returning near entrances after moving between maps.

## Design References

The design borrows four level-design principles from the reviewed references:

- Use a clear critical path and readable flow for the city, so the player can predict where
  streets and blockers will lead.
- Treat loops and branches as deliberate pacing tools, not random maze density.
- Give dead ends a reason: pickup, enemy, visual reveal, future gate, or later shortcut.
- Block out and test traversal before spending effort on final art polish.

References:

- The Level Design Book, Flow: https://book.leveldesignbook.com/process/layout/flow
- The Level Design Book, Critical Path: https://book.leveldesignbook.com/process/layout/criticalpath
- The Level Design Book, Layout: https://book.leveldesignbook.com/process/layout
- GameDeveloper, Depicting the Level Design of a Legend of Zelda Dungeon:
  https://www.gamedeveloper.com/design/depicting-the-level-design-of-a-legend-of-zelda-dungeon
- Master The Dungeon, The Legend of Zelda and Dungeon Design:
  https://www.masterthedungeon.com/zelda-dungeon-design/

## Map Dimensions

All three outdoor maps use a shared `200x200` tile size. With the existing `32px` tile size,
each map is `6400x6400px`.

| Map | Current Tiles | New Tiles | New Pixel Size |
| --- | ---: | ---: | ---: |
| `meadow-entry` | `80x80` | `200x200` | `6400x6400` |
| `ruins-threshold` | `30x30` | `200x200` | `6400x6400` |
| `ruins-core` | `30x30` | `200x200` | `6400x6400` |

Compact interiors remain unchanged at `16x12` tiles for this pass.

## City Layout

`meadow-entry` becomes a district loop:

- Hero starts in a quiet residential district.
- Streets guide the player through hero house, villager houses, guild, item shop, and
  outward toward the ruins route.
- Buildings, fences, walls, tree masses, and other blockers shape movement into readable
  streets instead of a large open field.
- The city should stay forgiving: avoid hard maze density, frequent dead ends, or confusing
  one-tile corridors in the peaceful village area.
- Outdoor slime encounters move into route segments and side pockets. The old distinct
  forest combat pen should not return as a separate arena.
- The ruins route remains gated by the Guild Master quest objective and by clearing living
  meadow enemies.

Because enemy pathfinding is not in scope, combat pockets must be authored so meadow slimes
do not need to navigate around complex blocker layouts. If the existing single `forestZone`
leash no longer fits, replace it with simple route-combat bounds or place enemies in open
street pockets where direct chase behavior remains readable.

## Ruins Layout

`ruins-threshold` is the first dungeon shell:

- Entrance stair from the city.
- Clear main loop that teaches the player ruins are more restrictive than the city.
- Side chambers for current pickups and slime encounters.
- Choke points marked as future puzzle gates, implemented only as static blockers or
  metadata in this slice.
- Exit stair to `ruins-core`, using the existing transition system.

`ruins-core` is tighter and more climactic:

- Fewer town-like routes and more chamber turns.
- Side rooms for current pickups.
- A more deliberate boss approach leading to `ruins-warden`.
- The existing boss victory completion remains unchanged.
- Return stair to `ruins-threshold`, using explicit arrival coordinates.

The ruins should feel puzzle-ready, but puzzle logic is intentionally deferred.

## Technical Model

Keep map authoring in `content/maps.ts` for the first pass.

Allowed model changes:

- Add or generalize a reusable rectangular blocker concept for city blockers and ruin walls,
  building on the current `MapRect`/`fences` pattern.
- Add a transition presentation field so a transition can render as a stair while keeping
  existing transition behavior.
- Add optional future-gate metadata for ruins to make planned puzzle locations explicit in
  content and tests.
- Add simple route-combat bounds only if needed to preserve enemy readability without
  introducing pathfinding.

Avoid creating a full layout language, grid parser, or external authoring format in this
slice. If hand-authored `200x200` maps become too hard to maintain, a later task can add an
ASCII/grid helper after the desired layout is proven.

## Rendering And Collision

The current generated Phaser tilemap ground remains the rendering base. The first pass can
use generated path, grass, and stone-wall tiles plus existing static assets for landmarks,
fences, tree masses, and doorway/stair markers.

Player blocking stays centralized in `WorldScene.isPlayerMovementBlocked()` and should reuse
rectangle collision helpers. Static city and ruin blockers should not require a separate
physics system.

Stairs are visual transition markers only:

- City to `ruins-threshold`.
- `ruins-threshold` to city.
- `ruins-threshold` to `ruins-core`.
- `ruins-core` to `ruins-threshold`.

They should restart the scene through the existing transition save flow with explicit
destination arrivals.

## Save, Quest, And Runtime Behavior

No save-schema change is expected. Existing saves may land at old coordinates after the
map expansion; this prototype does not require legacy migration unless a later task asks
for it.

Preserve:

- Guild Master main quest gate for entering the ruins route.
- `requiresClear` behavior for transitions that require living enemies to be cleared.
- NPC/shop/dialogue contracts.
- Current pickup ids and encounter ids where practical, so quest and cleared-encounter
  behavior does not drift unnecessarily.
- `ruins-warden` victory completion in `ruins-core`.

## Testing

Content tests should assert:

- `meadow-entry`, `ruins-threshold`, and `ruins-core` are each `200x200`.
- Compact interiors remain `16x12`.
- Every spawn, transition, transition arrival, encounter, pickup, NPC, landmark, blocker,
  stair marker, future gate, and optional route-combat bound is inside map bounds.
- City content includes guild, shop, houses, folded-in outdoor combat encounters, and the
  gated ruins transition.
- Ruin maps include side rooms, pickup/enemy placements, future-gate markers, and stair-style
  transitions.

Scene tests should assert:

- Outdoor camera bounds become `6400x6400`.
- Compact interior centering still works.
- Rectangle blockers stop player movement.
- Required city openings remain passable, including building door approaches and the route
  toward ruins.
- Ruin stair transitions still restart through existing transition saves.
- Existing quest, shop, pickup, combat, and boss victory behavior remains intact.

Expected focused checks:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected full verification:

```sh
bun run check
bun run test
```

If Svelte files are edited during implementation, run the required Svelte autofixer before
completion.

## Acceptance Criteria

- `meadow-entry`, `ruins-threshold`, and `ruins-core` are `200x200` tile maps.
- City traversal is substantially more restrictive than the current open map but still reads
  as streets and districts.
- Outdoor combat is folded into the route instead of isolated in a separate open forest arena.
- Ruins read as puzzle-ready dungeon spaces with loops, side rooms, future gates, and stairs.
- Stair markers visually communicate map-to-map movement while preserving current transition
  behavior.
- The current save, quest, dialogue, shop, pickup, combat, and boss-victory flows continue
  to work.
