# Area Map Design

## Summary

Add a persisted, fog-of-war **Area Map** to the Gliese JRPG slice. The feature starts from
the user's minimap request, but the approved first pass is a collapsed, pause-style map
overlay rather than an always-visible corner minimap.

The map should help the player understand the current area without turning into a radar.
It shows discovered terrain, the player's position, exits/buildings, and active quest
destinations when relevant. It does not show every enemy or pickup in this pass.

## Goals

- Add a `Map` action to the existing Menu flow.
- Open the map as a pause-style overlay, matching Quest Log and Inventory behavior.
- Persist explored map areas per save.
- Reveal fog with a circular radius around the player as they move.
- Show the current area shape, player position, discovered exits/buildings, and important
  quest markers.
- Keep Phaser as the source of runtime game truth and Svelte as the owner of overlay UI.
- Keep the implementation testable through pure exploration logic, HUD payload tests,
  Svelte component tests, and a small e2e smoke test.

## Non-Goals

- No always-visible corner minimap in the first pass.
- No world map spanning multiple areas.
- No enemy radar or pickup radar.
- No pathfinding, route drawing, or turn-by-turn directions.
- No authored illustrated map art.
- No old-save migration; Gliese is still in prototype phase, so save version/key can bump.

## User Flow

The command menu gains a `Map` action. Choosing it closes the command menu, pauses the
field, and opens a full-screen modal overlay.

The overlay includes:

- Current area name.
- Scaled current-area map panel.
- Revealed cells drawn as muted terrain/path/building shapes.
- Unrevealed space drawn as dark fog.
- Player marker.
- Discovered exits and buildings as simple labeled markers.
- Active quest destination marker only when it belongs to the current map and the location
  has already been revealed.

The player can close the overlay with the close button, `Esc`, or the dimmed background.
Closing resumes gameplay if the map overlay owns the pause state. On narrow screens, the
map should fill most of the viewport and keep labels minimal enough to avoid clutter.

## Architecture

Use the existing Phaser-to-Svelte HUD bridge.

`WorldScene` owns:

- current `mapId`
- player world position
- current map dimensions
- discovered exploration cells per map
- marker candidates derived from map content and quest state
- save-state updates when exploration changes

`GameShell.svelte` owns:

- map menu action and overlay open/close state
- pause/resume behavior for the map overlay
- accessible modal behavior
- rendering the area map from the HUD payload

This keeps the feature aligned with existing Quest Log, Inventory, Shop, and Dialogue
boundaries. Phaser publishes facts; Svelte renders the player-facing interface.

## Exploration Model

Add a pure exploration module under `src/lib/game/core/` to keep cell math out of
`WorldScene` and `GameShell.svelte`.

Use a coarse grid over world coordinates, with an initial target cell size of `128` world
units. Revealed cells are stored as stable string keys such as `column,row`.

The model should expose helpers for:

- building a cell key from grid coordinates
- converting world position to grid position
- revealing all cells whose centers fall inside a circular radius around the player
- merging newly revealed cells into existing map exploration
- checking whether a world position or marker is revealed

The first implementation uses a `320` world-unit reveal radius. With `128` world-unit
cells, that exposes the player's immediate surroundings without revealing the whole area
on entry.

## Save State

Extend `SaveState` with persisted exploration data:

```ts
mapExploration: Record<string, string[]>;
```

Each key is a map id and each value is a sorted list of revealed cell keys. Save parsing
must validate that the value is a plain record of string arrays. When building a save,
`WorldScene` includes the current exploration state.

Because this is prototype-phase Gliese work, this pass bumps both `SAVE_STORAGE_KEY` and
the save `version` instead of migrating earlier saves.

Exploration should not trigger a full write every animation frame. `WorldScene` should
only publish and persist when a reveal call adds at least one new cell. The existing
storage adapter already coalesces writes, so the gameplay side only needs to avoid
needless save-state churn.

## HUD Payload

Extend `HudState` with an `areaMap` payload shaped for rendering, not gameplay logic.

The payload should include:

- map id
- localized area name
- world width and height
- exploration cell size
- revealed cell keys for the current map
- player position
- markers for discovered buildings, exits, and current-map quest destinations

Markers should be minimal records: id, kind, x/y, label, and optional emphasis. Svelte
should not import game content directly to discover map geometry.

Quest markers should be conservative in the first pass. They only appear when the active
quest has a known destination on the current map and that destination is already revealed.

## Rendering

Render the area map in Svelte using SVG. SVG naturally handles scaling, marker placement,
and fog cells without requiring canvas lifecycle code.

The visual language should stay quiet and JRPG-like:

- dark modal frame consistent with existing `jrpg-window` styling
- revealed map space in muted greens/grays/browns
- fog as dark low-detail cells
- player marker in a clear bright accent
- exits/buildings in restrained icon-like marks with labels
- active quest destination with a stronger accent

The overlay must not put persistent top-left/top-right HUD ledgers over the map. Since the
map is a modal, the map content should be the dominant surface while it is open.

## Testing

Add focused tests for the pure exploration model:

- world position to cell key conversion
- circular reveal includes expected nearby cells
- reveal merge is stable and sorted
- marker reveal checks work at cell boundaries

Add save-state tests:

- new saves include an empty `mapExploration` record
- valid exploration data parses
- malformed exploration data is rejected

Add HUD payload tests for:

- current map dimensions and player position are included
- markers are built from current-map landmarks/transitions
- quest markers are filtered to current map and revealed destinations

Add Svelte/component coverage for:

- opening the map overlay from Menu
- closing the overlay by close action
- rendering fog, player marker, and at least one discovered marker

Add an e2e smoke test:

- boot the game
- open Menu
- open Map
- assert the area map overlay appears
- close it and confirm the field HUD is usable again

Expected focused checks:

```sh
bun run test:unit -- --run src/lib/game/core/map-exploration.test.ts
bun run test:unit -- --run src/lib/game/save/save-state.test.ts
```

Expected completion checks:

```sh
bun run check
bun run test
```

Run the Svelte MCP autofixer on any `.svelte` edits during implementation before claiming
the work is done.
