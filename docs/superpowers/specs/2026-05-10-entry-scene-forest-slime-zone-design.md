# Entry Scene Forest Slime Zone Design

## Summary

Redesign `meadow-entry` so the peaceful village and slime combat space read as separate areas inside the same map. The village stays in the western half of the entry scene, gains fence boundaries with gate openings, and no longer has loose item pickups on the ground. The slimes move into a dedicated eastern forest zone with stronger forest visuals and leash behavior that keeps them from wandering into the village.

This is a single-map redesign. It does not add a separate forest map or a transition between village and forest.

## Goals

- Keep the forest as a zone within `meadow-entry`.
- Move the three meadow slimes from the village road into the forest zone.
- Enhance the forest area visually so it reads as a distinct combat space.
- Prevent meadow slimes from moving outside the forest zone.
- Make meadow slimes chase the hero only for a short distance, then return to their home points when the hero escapes.
- Remove the current item pickups from the village ground in `meadow-entry`.
- Add village fencing that visually separates the village from the wider meadow while preserving usable gates and building entrances.
- Preserve the existing quest and transition flow, including the ruins route gate.

## Non-Goals

- No separate forest map.
- No new save migration. This prototype can reject older save versions if the save shape changes outside this redesign.
- No new pathfinding system.
- No changes to combat math, enemy stats, loot tables, shops, NPC dialogue, or quest rewards.
- No full external tilemap authoring pipeline.
- No Svelte HUD changes are expected.

## Content Model

`src/lib/game/content/maps.ts` remains the source of truth for `meadow-entry` layout.

Add map-level metadata for zone and obstacle layout:

- `forestZone`: a rectangle inside `meadow-entry` that defines the allowed meadow-slime area.
- `fences`: rectangular fence segments around the village, with gaps for walking paths and building approaches.
- `forestDecor`: sprite-backed landmarks used for forest trees, brush, and boundary dressing.

The three existing meadow slime encounter ids stay stable:

- `meadow-slime-west`
- `meadow-slime-center`
- `meadow-slime-east`

Keeping those ids preserves current quest progress references and cleared-encounter flags. Only their coordinates move into the forest.

Remove all `meadow-entry` pickups from the entry scene. Ruins pickups stay unchanged.

## Entry Layout

The village remains clustered around the current western building coordinates. Fence segments frame the village cluster and leave intentional openings:

- a south/west opening near the hero house spawn approach
- a central/east opening toward the forest and ruins road
- clear access to all exterior door transitions

The forest zone sits east of the village, before the ruins transition. Slimes spawn inside the forest at separated home points, leaving enough space for the hero to enter, trigger short chases, retreat, and re-engage.

The ruins transition remains on the far east side and keeps its existing quest requirement. The current `requiresClear: true` behavior remains, so living `meadow-entry` enemies still block that transition.

## Forest Visuals

First pass visual enhancement uses Phaser-rendered map dressing plus a small transparent forest asset sheet rather than a full-map background image. This keeps the existing tilemap renderer and camera behavior intact while still giving the forest dedicated art.

Create `public/game/assets/forest-dressing.png` with compact top-down JRPG forest frames:

- `treeCluster`: dense tree mass for forest boundaries
- `brush`: lower obstacle/dressing around clearings
- `forestFloor`: darker, leafier ground accent used inside the forest zone
- `forestEntrance`: a readable opening near the village road

Register the sheet through `src/lib/game/content/assets.ts` and preload it in `BootScene`. The asset must be verified for real transparency before wiring:

- has alpha channel
- `alpha_min` is `0`
- transparent pixel count is greater than `0`

## Slime Leash Behavior

Each meadow slime has a home position equal to its encounter spawn point.

Runtime behavior:

1. If the hero is inside or near the forest and within the slime's aggro radius, the slime chases.
2. The chase stops when the hero exceeds the leash radius from the slime home point or leaves the forest zone.
3. A returning slime moves back toward its home point.
4. A slime inside attack reach can still attack normally.
5. Slime movement is clamped to the forest rectangle, so slimes cannot drift into the village or across the ruins road.

This behavior applies to the meadow-entry slimes. Ruins slimes and the ruins boss keep the existing chase behavior.

## Fences And Collision

Fence segments are rendered as world objects and treated as player collision blockers. They reuse the existing rectangle-collision pattern used by building landmarks, with small focused helpers for fence-specific rectangle lookup.

Fence collision must not block:

- the hero's initial spawn and movement away from the house
- exterior building doorways
- the route from village to forest
- the route from forest to the ruins transition

Fence collision should be authored as separate rectangles instead of trying to infer a single village boundary. This makes gate openings explicit and easier to test.

## Runtime Architecture

`WorldScene` remains the runtime coordinator.

Expected changes:

- Render forest dressing and fences after terrain and before actors where appropriate.
- Register and render the new forest dressing frames.
- Include fence rectangles in player collision checks.
- Add per-enemy movement mode for meadow slimes: idle, chase, return.
- Keep encounter ids, combat, health bars, attack cooldowns, death handling, loot, quest progress, and save building behavior unchanged.

Pure data belongs in map/content definitions. Runtime movement decisions belong in `WorldScene`.

## Testing

Update content tests to assert:

- `meadow-entry` has no pickups.
- Meadow slime encounters are inside the forest zone.
- The forest zone and fence segments are bounded by the map.
- Fence segments have stable ids and valid dimensions.

Update scene tests to assert:

- Fence objects render and block player movement.
- Doorway and gate paths remain reachable.
- Meadow slimes stay within the forest zone while chasing.
- Meadow slimes return toward their home positions after the hero escapes.
- Ruins slimes keep their existing movement behavior.

Run targeted checks first:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Then run the repo verification baseline:

```sh
bun run check
bun run test
```

If Svelte files are edited, run the required Svelte autofixer before completing the work.

## Acceptance Criteria

- The entry scene visibly separates village and forest within `meadow-entry`.
- Village-ground pickups are gone from `meadow-entry`.
- The village has fence boundaries with usable openings.
- Meadow slimes spawn in the forest and cannot leave it.
- Meadow slimes chase briefly and return home once the hero escapes.
- Existing quests, shops, interiors, and ruins transition behavior continue to work.
