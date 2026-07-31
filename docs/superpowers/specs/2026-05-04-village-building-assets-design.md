# Village Building Assets Design

## Summary

Replace the temporary Phaser rectangle/text building placeholders in `meadow-entry` with a generated transparent building sprite sheet.

The first asset pass covers exterior buildings only. It does not add interior props, collision, shops, quests, layout changes, or new interaction behavior.

## Goals

- Generate one transparent building sheet for village exterior art.
- Add four building frames: Hero's House, Guild Hall, Item Shop, and Villager House.
- Preserve the current village landmark coordinates, dimensions, transitions, and safe return arrivals.
- Centralize asset metadata in `src/lib/game/content/assets.ts`.
- Wire the new art into `WorldScene` without changing gameplay semantics.
- Verify real PNG transparency before wiring the asset.

## Non-Goals

- No interior furniture or room dressing.
- No currency, shop UI, buying, or selling.
- No new collisions or path blocking.
- No generated full-village background image.
- No changes to NPC dialogue or map transition behavior.
- No replacement for the existing terrain, actor, item, or animation sheets.

## Asset Package

Create `static/game/assets/village-buildings.png`.

The sheet uses a fixed 2x2 grid with transparent background:

| Frame           | Purpose                                       |
| --------------- | --------------------------------------------- |
| `heroHouse`     | Cozy small home for the hero's house          |
| `guildHall`     | Larger civic guild building                   |
| `itemShop`      | Readable storefront/shop silhouette           |
| `villagerHouse` | Reusable home variant for all villager houses |

The sheet uses SNES-inspired top-down JRPG pixel art with a warm peaceful village palette. Buildings must have readable roof, wall, and door silhouettes at the current runtime display sizes.

## Runtime Wiring

Add a new asset manifest in `src/lib/game/content/assets.ts`, separate from `starterPackAsset`, with:

- asset key
- public path
- frame rectangles
- frame name type
- lookup from map landmark id to building frame

`BootScene` preloads the new sheet.

`WorldScene` registers the building frames and renders landmark images in place of the current building body/threshold rectangles. The existing text labels stay above buildings for readability, but the generated building art is the primary visual signal.

Display sizes preserve the current landmark footprint dimensions:

- Hero's House: `192 x 128`
- Guild: `256 x 160`
- Item Shop: `192 x 128`
- Villager House: `160 x 112`

Doorway markers remain separate transition objects using the existing `doorwayTile` art.

## Verification

Before wiring the generated image:

- inspect the PNG alpha channel
- confirm it has an alpha channel
- confirm `alpha_min` is `0`
- confirm transparent pixel count is greater than `0`

Code verification includes:

- asset metadata tests for frame existence and valid rectangles
- scene tests proving `WorldScene` renders building images for landmarks
- existing transition tests proving doorway behavior is unchanged
- targeted Phaser scene test run
- `bun run check`
- `bun run build`

## Scope Guardrails

This pass is complete when the village exterior shows generated building art for the four exterior building categories and the existing game flow still works.

Do not change map layout, return arrival coordinates, encounter placement, NPC dialogue, or shop mechanics while wiring this asset.
