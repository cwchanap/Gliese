# Map-Aware Battle UI Redesign Design

## Summary

Redesign `BattleScene` so combat feels more like a dedicated JRPG battle space
instead of a flat placeholder arena. The battle remains a separate real-time Phaser
scene with the existing movement, auto-attack, victory, defeat, reward, and blocking
summary behavior intact.

The presentation changes are map-aware. `BattleScene` chooses a battle environment
from `sourceMapId`, starting with two shipped environments:

- `ruins` for dungeon maps such as `ruins-threshold` and `ruins-core`
- `meadow` for outdoor village-adjacent maps such as `meadow-entry`

Unknown or future maps use a neutral fallback until they get their own environment.

## Goals

- Add image-backed battle backgrounds instead of solid-color floor rectangles.
- Make the battle space larger and more open while preserving current combat rules.
- Pick the battle environment from the source map.
- Add more attractive attack presentation: lunge, slash arc, impact flash, camera
  shake, and short hit-stop.
- Keep text-heavy battle HUD and summary behavior in the existing Svelte HUD bridge.
- Keep permanent save-state application in `WorldScene`.
- Keep `BattleScene` responsible only for transient combat and presentation state.

## Non-Goals

- No command-battle or turn-based redesign.
- No change to battle rewards, quest progress, victory, defeat, or encounter clearing.
- No change to the blocking summary handoff.
- No party system.
- No new enemy behavior model or pathfinding system.
- No requirement to create unique battle backgrounds for every current map in this
  slice.

## Environment Selection

Add a small battle presentation model in `src/lib/game/content/assets.ts` that maps a
source map id to a battle environment id.

Initial mapping:

- `ruins-threshold` -> `ruins`
- `ruins-core` -> `ruins`
- `meadow-entry` -> `meadow`
- all other maps -> `neutral`

The mapping should be deterministic and testable without booting Phaser. It should keep
asset keys, public paths, and environment ids centralized rather than hardcoding image
paths inside `BattleScene`.

## Battle Background Assets

Ship image assets for the initial environments under `public/game/assets/`.

The backgrounds should be wide 16:9 images designed for a top-down/three-quarter JRPG
battle view. They should have enough empty center space for movement, with visual detail
kept toward edges and corners so actors remain readable.

Recommended first assets:

- `battle-ruins.png`: stone floor, broken ruins, faint glowing cracks, darker edge
  treatment
- `battle-meadow.png`: grassy clearing, dirt paths, village-adventure color, readable
  center lane

These are normal background images and do not need transparency. If any foreground
dressing or effect asset requires transparency, verify real alpha before wiring it.

## Arena Layout

Increase the arena from the current fixed `640x360` space to a larger 16:9 arena:
`896x504`.

The larger arena should:

- preserve the current real-time movement and auto-attack loop
- give the hero more room to kite and reposition
- spread enemy spawns farther apart
- keep enemy health bars attached to the correct units
- keep all actors within battle bounds

The camera should center and scale the arena so it fits both desktop and smaller browser
windows. The scene should not rely on CSS layout for battle coordinate math.

## Presentation Layers

`BattleScene` should render the battle image first, then add lightweight Phaser layers
for readability:

- subtle dark vignette or edge overlay
- soft shadow or contact ellipse under actors
- optional boundary markers or ground glow near arena edges
- enemy health bars above enemies
- slash and impact effects above actors

These layers are presentation-only. They should not change hit detection, cooldowns, or
result application.

## Attack Animation

Hero attacks keep the existing auto-attack trigger and hit resolution, but the visual
sequence becomes more expressive:

1. Target is selected using the current reach/cooldown rules.
2. Hero plays the existing attack animation.
3. Hero briefly lunges toward the target and eases back.
4. A curved slash arc appears between hero and target.
5. An impact flash appears at the target.
6. The camera shakes lightly.
7. A very short hit-stop freezes motion for readability.
8. Target hit reaction tint and death handling continue as they do today.

Enemy attacks use a smaller impact pulse at the hero position, plus the existing enemy
attack animation and hero invulnerability timing.

All effects must respect the existing combat result order: damage is still resolved by
the core combat helpers, and visual effects do not decide whether a hit succeeds.

## Data Flow

`WorldScene` continues to launch `BattleScene` with `BattleStartPayload`.
`BattleScene` reads `payload.sourceMapId`, resolves the battle environment, and renders
the matching presentation.

The result flow stays unchanged:

1. `BattleScene` builds a `BattleResult`.
2. `BattleScene` publishes a battle summary HUD state.
3. The Svelte HUD shows the blocking summary.
4. Dismissal returns to `WorldScene`.
5. `WorldScene` applies permanent save changes.

## Tests And Verification

Add or update tests for:

- battle environment selection by source map id
- fallback environment behavior
- larger enemy spawn positions staying inside the arena
- unchanged battle handoff/result behavior where existing tests cover it
- new asset manifest entries

Verification commands:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/content/assets.test.ts
bun run check
bun run build
```

Runtime verification should start the dev server and manually enter a battle in the
browser. Check that the canvas is nonblank, the background renders, actors are framed in
the larger arena, attack effects appear on contact, and the blocking summary still gates
return to exploration.
