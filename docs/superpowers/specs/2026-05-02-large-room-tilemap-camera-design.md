# Large Room Tilemap Camera Design

## Summary

Expand the existing Phaser JRPG vertical slice by keeping the current multi-room progression while making each room much larger. Each room remains a separate map (`meadow-entry`, `ruins-threshold`, `ruins-core`), but the camera follows the hero through a large world instead of showing an entire tiny room at once.

The initial implementation should use Phaser tilemaps for room rendering, because the target sizes are too large for one image object per tile.

## Goals

- Preserve the current room-to-room structure: `meadow-entry -> ruins-threshold -> ruins-core`.
- Keep one global tile size of `32px` for every room so tile art, hero scale, doors, and encounter distances stay consistent.
- Allow each room to define its own tile dimensions.
- Make the viewport occupy the full screen.
- Smoothly follow the hero with the camera, centering the hero when possible and clamping near room edges.
- Move transition and encounter coordinates into the larger room coordinate spaces.

## Non-Goals

- Do not replace the game with one continuous overworld.
- Do not introduce a full external map authoring pipeline in this pass.
- Do not add new collision systems, pathfinding, or procedural content beyond what is needed to render large tilemap rooms.
- Do not change the save format beyond preserving existing room id and player world coordinates.

## Room Dimensions

Room dimensions are expressed in tiles. Pixel dimensions are derived from the global `32px` tile size.

| Room              | Tile Size | Tile Dimensions | Pixel Dimensions |
| ----------------- | --------- | --------------- | ---------------- |
| `meadow-entry`    | `32px`    | `320 x 320`     | `10240 x 10240`  |
| `ruins-threshold` | `32px`    | `320 x 320`     | `10240 x 10240`  |
| `ruins-core`      | `32px`    | `80 x 80`       | `2560 x 2560`    |

The map definition model should continue to own `width` and `height` as tile counts. `WorldScene` should derive pixel bounds with:

```ts
const width = map.width * WorldScene.tileSize;
const height = map.height * WorldScene.tileSize;
```

## Rendering Architecture

Replace the current `renderGround()` image-object loop with a Phaser tilemap renderer.

The first pass can generate tile index grids from existing map definitions rather than loading external map files. This keeps the content source of truth in TypeScript while moving rendering to Phaser's scalable tilemap layer path.

Expected rendering flow:

1. Register the starter-pack frames or tileset source needed by the tilemap.
2. Generate a 2D tile index grid for the active room.
3. Create a Phaser tilemap from the generated grid.
4. Create one ground layer from the tilemap.
5. Render transitions, enemies, hero, overlays, and HUD bridge behavior as separate world objects as they work today.

The implementation should keep tilemap-specific logic isolated behind a small helper or dedicated method so external map loading can be added later without rewriting combat, saving, or HUD code.

## Camera And Viewport

`GameShell.svelte` already provides a fullscreen shell and `createGame()` already uses `Phaser.Scale.RESIZE`. Preserve that behavior.

For each room, `WorldScene` should:

- Set camera bounds to the active room's pixel dimensions.
- Start smooth follow on the hero, using fixed lerp values rather than exact locked tracking.
- Keep the camera clamped to room bounds so the hero is centered in open space and naturally offset near edges.

The camera behavior should remain room-local. Transitioning to another room restarts the scene with the next room's bounds and arrival coordinates.

## Content Placement

Transition and encounter coordinates must be updated from the current tiny-map values to meaningful positions inside the larger rooms.

Initial placement guideline:

- Spawn points should be near the logical entrance side of each room, not at the absolute corner.
- Exit transitions should sit near the corresponding far edge of the room.
- Encounters should be placed along the intended path between spawn and exit.
- `ruins-core` should keep the boss encounter and victory completion behavior.

This design intentionally does not require a full collision or authored-path system yet. The larger rooms can initially be open movement spaces with visual ground variation.

## Save And Transition Behavior

The existing save model can remain valid because it stores:

- `mapId`
- player `x`
- player `y`
- player facing
- progression and cleared encounter flags

Transition save state should continue to write the destination `mapId` plus arrival coordinates. The arrival coordinates must be valid for the destination room's larger dimensions.

Existing saves from tiny rooms may load into old coordinates near the top-left of the larger room. That is acceptable for this pass unless a migration requirement is added later.

## Testing

Update or add tests for:

- Tilemap/layer creation for the active room.
- Camera bounds derived from each room's tile dimensions and the global `32px` tile size.
- Smooth camera follow arguments.
- Movement clamping against the active room's pixel bounds.
- Transition behavior using the new large-room coordinates.
- Boss/victory behavior still working in `ruins-core`.

Svelte changes are not expected for the initial implementation. If Svelte files are edited, run the required Svelte autofixer before completing the work.

## Open Decisions Resolved

- The game keeps multiple rooms instead of moving to one continuous world.
- Rooms may have different dimensions.
- Tile size remains global and identical for all rooms.
- Initial implementation uses Phaser tilemaps rather than image-per-tile rendering.
- `ruins-core` starts smaller than the first two rooms.
