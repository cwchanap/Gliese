# Phaser JRPG Vertical Slice Design

## Summary

Build a small, desktop-first 2D action JRPG vertical slice in TypeScript using SvelteKit and Phaser.

The first playable build targets a 1-2 week scope:

- top-down field combat
- one controllable hero
- a tiny roaming overworld connected to one hostile area
- visible enemies on the map
- light XP and level progression
- anywhere save
- one boss or elite encounter that closes the slice

The design must be scalable so future expansion can add maps, enemies, NPCs, equipment, party systems, and broader progression without rewriting the runtime boundary.

## Goals

- Ship a playable browser build quickly.
- Keep combat readable and responsive on desktop keyboard controls.
- Use Phaser for rendering and simulation instead of building a custom engine first.
- Keep content scope intentionally tiny while making systems data-driven.
- Separate game runtime, app shell, and persistence cleanly enough to grow later.

## Non-Goals For The First Slice

- full party combat
- mobile-first controls
- random encounters
- large overworld exploration
- deep quest chains
- inventory complexity
- multiple weapon classes
- complex combo combat
- online or cloud save

## Product Shape

The first slice should feel like a compact action-RPG with JRPG framing:

- The player starts in a very small overworld area near a camp or village edge.
- One NPC provides the minimal narrative push toward the hostile area.
- The player walks into a connected combat region rather than loading into separate battles.
- Enemies are visible in the world and attack in real time.
- The player can attack, dash or dodge, use one simple heal or consumable, gain XP, level up once, and defeat a boss or elite.

Strict content cap:

- 1 hero
- 1 overworld map
- 1 hostile region or dungeon-like map
- 2 normal enemy types
- 1 boss or elite
- 1 NPC interaction path
- 1 consumable category
- 1 core weapon style

## Architecture

Use SvelteKit for the application shell and Phaser for the gameplay runtime.

### Responsibility Split

SvelteKit owns:

- routes and page structure
- title and menu screens outside the core game loop
- settings and save-slot UI
- loading and error presentation
- shell-level overlays if needed

Phaser owns:

- rendering
- input inside the game world
- player movement
- combat simulation
- enemy AI
- camera
- collision
- map transitions inside the gameplay runtime

Shared TypeScript modules own:

- save data types
- player stats
- content definitions
- progression formulas
- map metadata
- event contracts between the UI shell and the game runtime

### Integration Boundary

Create a Svelte component such as `GameShell.svelte` that mounts Phaser into a container element with `onMount`.

Rules:

- Phaser is initialized only in the browser.
- Cleanup is returned from `onMount` so the game instance is destroyed on unmount.
- Svelte components do not host game logic.
- Phaser scenes do not own route-level UI concerns.

Recommended project shape:

- `src/routes/` for SvelteKit pages
- `src/lib/game/phaser/` for Phaser runtime code
- `src/lib/game/core/` for engine-agnostic rules and domain models
- `src/lib/game/content/` for enemies, items, maps, and stat tuning
- `src/lib/game/save/` for persistence
- `src/lib/game/ui-bridge/` for runtime-to-shell events and commands

## Scene Strategy

Use a deliberately small scene model.

Recommended scenes:

- `BootScene` for startup and asset registration
- `WorldScene` for exploration and field combat
- optional lightweight `UIScene` only if specific HUD elements belong inside the canvas

Do not split exploration and combat into separate battle scenes for the first slice. One continuous top-down scene keeps the runtime simpler and matches the chosen game feel.

## Core Systems

### Player Controller

Owns:

- movement
- facing direction
- dash timing
- attack input handling
- invulnerability windows
- interaction triggers

The controller should expose a small state surface, not embed progression or UI logic.

### Combat System

Owns:

- hit detection
- damage resolution
- cooldowns
- knockback
- death handling
- combat timing transitions

Combat should be parameter-driven so enemy and weapon tuning can change without editing scene flow.

### Enemy System

Each enemy uses a small state machine:

- idle
- chase
- attack
- recover
- dead

The first slice should favor simple telegraphed behavior over sophisticated AI.

### Progression System

Owns:

- XP thresholds
- level-up rules
- stat growth

The first slice only needs light progression, likely one level-up with small HP and attack improvement. The formulas should still be data-based so future classes or characters can reuse the same system.

### World And Map System

Owns:

- map loading
- collision layers
- spawn points
- interactables
- enemy placement
- transition points

Even if maps are tiny, map metadata should be separated from scene code.

### Save System

Owns:

- serializing normalized game state
- loading and validating saved state
- fallback behavior for missing or corrupt save data

Save data must describe game state, not raw scene internals.

### UI Bridge

Defines the interface between Phaser and Svelte.

Phaser emits events such as:

- `hpChanged`
- `xpChanged`
- `levelChanged`
- `inventoryChanged`
- `playerDied`
- `saveCompleted`

Svelte sends commands such as:

- `pauseGame`
- `resumeGame`
- `saveNow`
- `openMenu`

## Rendering And Input

- Desktop browser is the primary target.
- Keyboard-first controls are the design baseline.
- Use a top-down camera following the player with light smoothing.
- Use tilemap-style world composition.
- Use simple arcade-style collision and overlap checks.
- Use a straightforward melee strike or attack arc rather than a combo tree.
- Prefer visible telegraphs and readable hitboxes over animation complexity.

## Persistence

Use browser-local persistence for the first slice.

The save payload must include:

- save version
- current map id
- player position
- facing direction
- current level and XP
- current HP and derived combat stats
- consumable counts
- cleared encounter or defeated enemy flags
- narrative or progression flags

Behavior:

- If no save exists, start a new run at the default spawn.
- If the save is invalid or corrupt, log the issue in development and fall back to a clean new game path.
- Saving can be invoked anywhere, but only serialized canonical game state is stored.

## Data-Driven Content

Even though the first slice is tiny, core content should be expressed as data:

- enemy definitions
- item definitions
- player stat growth
- XP thresholds
- map spawn data
- boss tuning

This keeps expansion cheap later and prevents `WorldScene` from turning into a hard-coded content dump.

## Testing Strategy

Test pure logic aggressively and Phaser glue minimally.

Unit test candidates:

- XP progression
- level-up calculations
- damage formulas
- save serialization and validation
- content schema parsing or validation

Integration test target:

- a basic Playwright smoke test that confirms the game route boots and the canvas mounts

The purpose is to keep correctness in pure TypeScript modules wherever possible, instead of trying to deeply test canvas behavior first.

## Failure Handling

- Missing content definitions should fail loudly in development.
- Save corruption should not trap the player in a broken state.
- Runtime initialization failure should surface a clear shell-level error rather than a blank page.
- Map or spawn mismatches should fall back to a safe default spawn in development builds where possible.

## Scalability Path

This design should scale without changing the runtime boundary.

Likely future expansions:

- more maps and transition points
- more enemy archetypes
- additional weapons or skills
- multiple NPCs and quests
- equipment and inventory growth
- party systems
- richer save slots and settings

The key scaling rule is unchanged:

- Phaser remains the game runtime.
- Svelte remains the application shell.
- shared domain modules remain the contract between them.

## Initial Implementation Priorities

Build in this order:

1. Phaser mounting inside a Svelte game route
2. Player movement, camera, and collision
3. World map and hostile region scaffolding
4. Basic enemy behavior and attack resolution
5. HUD and UI bridge
6. XP, leveling, and one consumable
7. Save and load
8. Boss encounter and polish

## Success Criteria

The first playable build is successful if:

- the player can load the game in a desktop browser
- move through a small overworld into a hostile area
- fight visible enemies in real time
- gain XP and level up at least once
- save from the field and reload correctly
- defeat a boss or elite that clearly ends the slice
