# Braided Entry Layout Design

## Summary

Redesign `meadow-entry` again as a denser hybrid district. The lower-left village should
feel like a small JRPG town with braided streets, pocket courtyards, alleys, and short
dead ends. The upper-right route should feel like the town thinning into a branching
wilderness and ruins approach. The map remains `200x200` tiles and keeps the current
building, NPC, shop, quest, and transition behavior.

This pass also replaces the oversized wall presentation. Barriers should fit the
environment: low village walls, fences, hedges, broken stone edges, and ruin blocks instead
of large repeated slabs.

## Goals

- Make `meadow-entry` visibly more branching and less open.
- Preserve all existing town interiors and transition targets.
- Keep the town readable as a hub, not a confusing random maze.
- Create multiple useful routes between hero house, guild, shop, villager houses, and the
  east exit.
- Turn enemy areas into side branches and pockets instead of broad combat fields.
- Replace the current huge wall look with environment-scaled modular art.
- Keep the implementation in the existing TypeScript map content and Phaser rendering path.

## Non-Goals

- No new quest, save, shop, dialogue, or inventory behavior.
- No new map editor or external layout file.
- No procedural generation.
- No new puzzle mechanics in this pass.
- No Svelte HUD changes unless implementation exposes a display-only issue.

## Topology

Use a **Braided District** layout.

The village district occupies the lower-left portion of the map, roughly
`x=480..3200`, `y=4000..5900`. It should no longer be a large loop with buildings inside
it. Instead, it should be a street graph with three mostly parallel east-west routes:

- **North civic lane:** villager house 1, guild approach, villager house 3, and an east
  gate connection.
- **Middle market lane:** hero house, central courtyard, item shop, and east exit.
- **South service lane:** villager house 2, back alleys, and a southern loop returning
  toward shop or hero house.

Short north-south alleys connect those lanes at several points. The player should usually
see two possible directions at an intersection. Dead ends are allowed only when they create
a future-use pocket, a readable yard, or a small scenic reveal.

The upper-right route occupies roughly `x=3200..6100`, `y=1200..4200`. It should act as a
branching transition from town to ruins:

- A narrow east gate leaves the village.
- The route splits into a north brush lane and a south brush lane.
- Each lane has one combat pocket that gives enemies room to move without needing
  pathfinding.
- The lanes reconnect before the ruins stair.
- The final stair approach bends at least once instead of being a straight corridor.

## Village Street Plan

Keep these important interaction points near their current coordinates:

- Hero house transition near `x=640`, `y=5248`.
- Guild hall transition near `x=1600`, `y=4352`.
- Item shop transition near `x=2240`, `y=5120`.
- Villager house 1 near `x=960`, `y=4552`.
- Villager house 2 near `x=1460`, `y=5512`.
- Villager house 3 near `x=2800`, `y=4552`.

Reshape the paths around them:

- Put hero house in a small home pocket with exits north, east, and south.
- Put guild hall on a civic courtyard reached by both a north lane and a middle connector.
- Put the shop on a market corner with one direct lane and one back-alley lane.
- Put villager house 2 on the south service lane so it is not floating in open grass.
- Use short wall/fence/hedge partitions to split open grass into lots, yards, and alleys.
- Keep a clear east exit near `x=3200`, but make it feel like a gate rather than a wide
  empty opening.

## Wilderness And Ruins Approach

The town exit should lead into a tighter outdoor route:

- From the east gate, a short path reaches a split.
- North lane: brush-heavy, one slime pocket, optional overlook dead end.
- South lane: narrower service trail, one slime pocket, reconnects before ruins.
- Center connector: small cross trail between the two lanes.
- Final approach: a bent corridor toward the ruins stair at about `x=5760`, `y=960`.

The third meadow slime should sit near the final approach or in a side pocket before the
ruins stair, not in a large open field.

## Barrier Art Direction

The current wall reads too large and visually harsh. Replace it with a sheet that supports
environment-scale pieces:

- **Town low wall:** warm gray stone, about chest height, with grass softened edges.
- **Town hedge/fence:** small repeated boundary pieces for yards and alleys.
- **Broken ruin wall:** darker cracked stone for the ruins approach and ruin maps.
- **Future gate:** readable but not neon-heavy; ancient sealed marker rather than a giant
  purple slab.
- **Stone stair:** keep the stair clear, but match the stone palette.

The asset should be modular and tile cleanly at blocker sizes. Prefer smaller cells such as
`64x64` or `96x96` over the current large `256x256` source cells. Long blockers should look
like repeated low wall segments, not stretched monoliths.

## Technical Model

Continue using `groundPatches`, `blockers`, `fences`, `forestDecor`, `combatBounds`, and
transition markers in `src/lib/game/content/maps.ts`.

Implementation should adjust content first:

- Replace broad town roads with more but smaller road patches.
- Add wall/fence/hedge partitions as map blockers or existing fence records.
- Move combat bounds and encounters into branch pockets.
- Preserve every current transition id and arrival where possible.
- Keep ruins transitions and quest gates unchanged.

Rendering should adjust only as needed for better barrier art:

- Keep `environmentDressingAsset` as the barrier sheet registry or replace it with a
  better-scaled equivalent.
- Register frames in `WorldScene` and render blockers using image-based/tiled art.
- Keep collision rectangle-based so behavior remains predictable.

## Testing

Content tests should assert:

- All existing village transition ids remain present and in bounds.
- `meadow-entry` keeps `200x200` dimensions.
- New route patches and blockers stay in map bounds.
- Every transition arrival remains outside blockers.
- The city has multiple branch roads and enough blockers/fences to prevent large open
  areas from returning.
- Combat bounds contain the meadow slime encounter ids.

Scene tests should assert:

- Environment dressing frames are registered.
- City blockers render with the new town wall or hedge frame.
- Ruin blockers render with the ruin wall frame.
- Stair transitions render with the stone stair frame.
- Blockers still stop player movement while required door/gate approaches remain passable.

Expected focused checks:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected completion checks:

```sh
bun run check
bun run build
bun run test
```

Run a browser smoke test on the dev server after implementation to confirm the route feels
less open in the entry area and that the player can still reach the ruins stair.
