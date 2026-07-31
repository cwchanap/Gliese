# Shrine Interior Respawn Design

## Goal

Add an enterable Shrine of Aurora interior and make battle defeat return the hero to the Shrine instead of the meadow village spawn.

## Scope

- Add a new interior map for the existing `shrine-of-aurora` meadow landmark.
- Add a meadow transition into the Shrine and a Shrine doorway back to the meadow.
- Decorate the Shrine interior with the existing interior prop sheet and starter-pack tiles; no new asset generation is required.
- Change defeat application so a returned battle defeat saves the hero inside the Shrine with 1 HP.
- Update visible defeat copy from "Returned to the village" to Shrine-focused wording in every locale.

## Map Design

The new map id is `shrine-of-aurora-interior`. It follows the existing 16x12 village interior pattern:

- Spawn: centered in the lower half, facing up.
- Exit: the shared `interiorDoor` at the bottom returns to the meadow near the Shrine entrance.
- Props: a quiet ritual room using existing `hearthLamp`, `rug`, `plant`, `bench`, `papers`, and `bookshelf` frames.
- Collision: shrine furniture and lamps block movement; rug and papers stay walkable floor dressing.
- NPCs: none in this pass, so the room functions as a calm recovery location rather than a new dialogue hub.

## Respawn Behavior

`applyBattleDefeat` should no longer target `openingMapId`. It should target the Shrine interior map:

- `mapId`: `shrine-of-aurora-interior`
- `player.hp`: `1`
- `player.x/y`: the Shrine interior spawn coordinates
- `player.facing`: the Shrine interior spawn direction
- Encounter clear flags, rewards, XP, and coins remain unchanged on defeat.

This keeps the current blocking battle summary flow intact. The player dismisses the summary, returns to exploration, and is already inside the Shrine.

## Testing

- Content tests assert the meadow has a Shrine transition and the Shrine interior is registered with props and an exit.
- Battle application tests assert defeat returns to `shrine-of-aurora-interior` with 1 HP and does not clear the source encounter.
- Scene tests assert entering the Shrine from the meadow and exiting back uses the normal restart/save transition path.
- Localization tests or existing type checks ensure the renamed defeat message key remains present in all three locale files.

## Out of Scope

- New Shrine-specific prop artwork.
- New Shrine NPC dialogue.
- Healing, save-point, or blessing mechanics beyond the defeat respawn destination.
