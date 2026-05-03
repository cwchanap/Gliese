# Village Interiors And NPCs Design

## Summary

Enrich the JRPG entry scene by turning `meadow-entry` into a peaceful village exterior with connected interiors and lightweight NPC dialogue.

The hero starts on an ordinary day in a typical RPG village, visits or passes the Guild for mission context, and then heads east along the road toward the ruins. The existing ruins progression and combat loop remain intact.

## Goals

- Make the opening feel like a peaceful village instead of only a combat field.
- Add separate interior maps for the Guild, Hero's house, Item Shop, and three villager houses.
- Add static NPCs with short proximity-triggered dialogue lines.
- Use the existing `WorldScene` map transition model for building doors.
- Keep enemies away from the domestic village area while preserving combat on the road to the ruins.
- Keep the implementation data-driven so future dialogue, quests, and shops can build on the same content model.

## Non-Goals

- No quest flags or branching mission state.
- No shop buying, selling, currency, or shop UI.
- No cutscenes or scripted movement.
- No collision system for building walls or furniture.
- No authored external map files.
- No final art requirement for buildings, interiors, or NPC sprites.
- No save schema change.

## Player Flow

The opening flow should become:

1. The hero begins in or near Hero's house.
2. The player exits into the village exterior.
3. The player can enter the Guild, Item Shop, and three villager houses.
4. NPCs provide short lines that establish the village and the ruins guild mission.
5. The player follows the eastern road away from the homes.
6. Existing slime encounters appear farther along that road, before the ruins threshold.
7. The current ruin sequence continues: `meadow-entry -> ruins-threshold -> ruins-core`.

The village area should feel safe. Combat should begin only after the player leaves the residential and civic cluster.

## Content Model

Extend `WorldMapDefinition` with an optional `npcs` collection. Maps without NPCs omit the collection.

Each NPC should include:

- stable `id`
- `x` and `y` world coordinates
- display `name`
- short `dialogue` line
- `role`, using `guild`, `shopkeeper`, `villager`, or `home`
- `frameName`, defaulting to an existing placeholder frame until dedicated NPC art exists

Add these new maps to the existing `maps` registry:

- `hero-house`
- `guild-hall`
- `item-shop`
- `villager-house-1`
- `villager-house-2`
- `villager-house-3`

Each interior map should be `16 x 12` tiles, with a clear spawn point and a return transition to `meadow-entry`. The Guild, Item Shop, and three villager houses each include one NPC. Hero's house may have no NPC.

## Exterior Layout

`meadow-entry` remains the entry map, but its layout changes from a simple meadow path into a village plus road.

Initial placement:

- western or southwestern area: Hero's house and villager houses
- central area: Guild, presented as the main civic building
- near the central path: Item Shop
- eastern road: route toward the ruins and existing combat ramp
- far eastern edge: transition to `ruins-threshold`

Doorway markers use the existing `doorwayTile` frame. Building footprints and signs use existing starter-pack frames, simple tile patterns, text labels, or Phaser primitives as first-pass placeholders.

## Interior Layout

Interior maps are compact `16 x 12` tilemap rooms.

Initial interiors:

- `hero-house`: quiet starting location or returnable home space.
- `guild-hall`: includes a guild NPC who frames the mission to investigate the ruins.
- `item-shop`: includes a shopkeeper NPC and visual shop dressing, but no buying or selling.
- `villager-house-1`: villager flavor line.
- `villager-house-2`: villager flavor line.
- `villager-house-3`: villager flavor line.

Interior art should reuse existing tile frames for now. The purpose of this pass is to establish navigable places and story context, not final decoration.

## Runtime Behavior

Keep `WorldScene` as the single exploration and combat scene.

Runtime additions:

- Render NPC markers for the active map's `npcs`.
- Detect when the hero enters a small radius around an NPC.
- Publish that NPC's dialogue through the existing HUD status field.
- Track the currently nearby NPC so the same line is not republished every frame.
- Clear or replace the dialogue status naturally when the player moves to another NPC, collects an item, enters combat, or changes maps.
- Continue rendering transitions with the existing `MapTransition` system.

NPC dialogue is proximity-triggered only. There is no interaction button in this pass.

## Save And Compatibility

The save format remains unchanged. It already stores `mapId`, player coordinates, facing, progression, inventory, equipment, and world flags.

Existing saves from the old `meadow-entry` may load into coordinates that no longer match the revised village layout. That is acceptable for this pass. If the implementation makes old coordinates especially poor, clamp or reposition only as a narrow compatibility fix without introducing a full migration.

## Testing

Add or update tests for:

- every new interior map exists in the map registry
- all map ids, transition ids, and NPC ids are stable and unique where required
- every exterior building transition points to the intended interior
- every interior return transition points back to `meadow-entry`
- spawn, transition, pickup, encounter, and NPC coordinates stay within map bounds
- `meadow-entry` places enemies away from the village cluster and preserves the ruins transition
- `WorldScene` renders NPC markers for maps with NPC definitions
- `WorldScene` publishes NPC dialogue when the hero enters proximity and does not spam the same dialogue every frame
- existing boot, transition, pickup, combat, and inventory tests still pass

No Svelte changes are expected. If Svelte files are edited during implementation, run the required Svelte autofixer loop before completing the work.

## Scope Guardrails

This pass is complete when the player can move through a peaceful village, enter and leave each interior, see static NPCs, receive short dialogue lines, and continue to the existing ruins combat flow.

Do not add currency, shop transactions, quest state, collision, branching dialogue, or new art generation as part of this spec.
