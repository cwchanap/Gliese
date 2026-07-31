# Interior Decoration Design

## Summary

Make the village interiors feel cozy, functional, and populated without changing the
core exploration architecture. The pass decorates `hero-house`, `guild-hall`,
`item-shop`, and all three villager houses with data-driven props, selective
furniture collision, and a mixed population of interactable and ambient NPCs.

`WorldScene` remains the exploration renderer and coordinator. Svelte HUD behavior,
save schema, quests, shops, and map transitions stay within their current contracts.

## Goals

- Make interiors read as lived-in places instead of sparse rooms.
- Give each room a distinct purpose and personality.
- Add one compact interior prop sprite sheet for reusable JRPG furniture and details.
- Keep prop placement authored in map content instead of hardcoded scene branches.
- Support ambient background NPCs without giving every person dialogue or collision.
- Add a small number of interactable villager occupants through the existing
  Rust-owned story catalog and browser fixture dialogue path.
- Preserve clear movement lanes to exits, NPCs, and shop/guild interactions.

## Non-Goals

- No save schema change.
- No new quests, objectives, rewards, shops, or HUD commands.
- No Svelte UI changes.
- No full-room background images.
- No authored external tilemap files.
- No combat, inventory, equipment, or economy changes.
- No broad collision redesign outside the interior props needed for this pass.

## Content Model

Extend `WorldMapDefinition` with two optional collections.

`interiorProps` describes placed furniture and room details:

- stable `id`
- `x` and `y` world coordinates
- `width` and `height` display size
- `frameName` referencing the interior prop sheet
- optional `depth` tier for flat, normal, or foreground rendering
- optional collision rectangle for solid furniture

`ambientNpcs` describes visible background people:

- stable `id`
- `x` and `y` world coordinates
- `frameName` using existing or new NPC art
- optional display size override
- optional facing or flavor role if useful for future expansion

Ambient NPCs are visual population only. They are excluded from proximity dialogue,
shop opening, quest progress, and movement collision unless a later pass promotes
one to the existing `npcs` collection.

Normal `npcs` remain the contract for interactable characters. Any new villager
dialogue should be authored in the `story/` package, compiled into the Rust story
catalog, represented in the browser fixture used outside Tauri, and referenced by
the NPC `dialogueId`. Do not add story prose directly to frontend rendering code.

## Room Plan

### Hero House

The hero house should feel like a quiet base. Add a bed, rug, small table, shelf,
storage chest or crates, and a few supply details. It does not need a required
interactable NPC. The room should keep a clear path from spawn to the exit and
should not introduce story gating.

### Guild Hall

The guild hall should read as the civic mission hub. Keep the guild master and
quartermaster interactable. Add a notice board, desks, benches, records, weapon
rack or training gear, and a couple ambient guild members. Movement should remain
clear to both interactable NPCs and the exit.

### Item Shop

The item shop should make Mira's store legible before the player opens the shop.
Keep Mira interactable. Add a counter, shelf rows, display goods, crates or barrels,
and one ambient shopper. The counter and shelf rows may block movement, but the
player must still be able to approach Mira and leave the room cleanly.

### Villager Houses

The three villager houses should be distinct rather than cloned:

- family home: table, chairs or bench, rug, bed, warm storage details
- artisan home: work table, crates, shelf, tools or records
- elder/story home: bookshelves, papers, lamp or hearth, quiet seating

Add one interactable villager per house, plus at most one ambient family or neighbor
figure where it improves the room. Dialogue stays short and flavor-focused.

## Asset Package

Create `public/game/assets/interior-props.png` with a transparent background and
central metadata in `src/lib/game/content/assets.ts`.

Initial frames should cover:

- bed
- table
- chair or bench
- bookshelf
- shop counter
- notice board
- rug
- crate stack
- barrel
- display shelf
- papers or records
- weapon rack or training dummy
- lamp, hearth, or warm home detail
- small plant or decorative object

The sheet should be compact and reusable across all interiors. The implementation
should verify real transparency before wiring the asset, matching the existing asset
quality checks used for generated PNGs.

## Rendering And Collision

`BootScene` preloads the interior prop sheet. `WorldScene` registers its frames and
renders active-map interior props after ground tiles and before normal actors.

Rendering order:

1. ground tilemap
2. rugs and flat props
3. solid furniture
4. player, normal NPCs, and ambient NPCs
5. foreground props only where a tall object needs to overlap actors

Collision is selective. Large solid props such as counters, beds, tables, shelves,
and crate stacks block movement through their authored collision rectangles. Flat
props such as rugs, papers, and decorative floor details do not block movement.

Movement blocking should reuse the existing point/rectangle style helpers where
practical. The implementation should keep exits, spawn points, NPC approach paths,
and shop/dialogue interaction distances unobstructed.

## Data Flow

The active map definition owns all room decoration data. At scene creation,
`WorldScene` resolves the active map, renders ground, props, blockers, landmarks,
transitions, pickups, normal NPCs, and ambient NPCs. Ambient NPCs do not publish HUD
state. Interactable NPCs continue using the existing `MapNpc` and dialogue flow.

The save file does not record props or ambient NPCs because they are static content.

## Testing

Add or update tests for:

- interior prop asset metadata has valid frame rectangles
- every `interiorProps` id is stable and unique within its map
- every prop frame name resolves to the prop asset manifest
- every prop and prop collision rectangle is inside map bounds
- every ambient NPC id is unique and bounded
- normal NPC and ambient NPC ids do not collide
- interior exits, spawn points, and interactable NPC approach positions remain clear
- `WorldScene` registers and renders the interior prop sheet
- flat props do not block movement
- solid furniture blocks movement where authored
- ambient NPCs render but do not trigger dialogue or shop behavior
- existing transition, shop, NPC dialogue, and save behavior remain unchanged

Verification should include the targeted content and scene tests, then `bun run check`
and `bun run build`.

No Svelte edits are expected. If implementation touches Svelte files, run the
required Svelte autofixer loop before completion.

## Acceptance Criteria

- All six village interiors look more lived-in and purpose-specific.
- Hero house feels cozy without adding required interaction.
- Guild hall and item shop remain easy to read functionally.
- Villager homes are visually distinct and have short flavor dialogue.
- Ambient NPCs add population without creating unnecessary dialogue load.
- Player movement to exits, interactable NPCs, and shop access remains reliable.
- No save migration is required.
- Existing gameplay flows to the village, ruins, combat, shops, and dialogue still
  work after the pass.
