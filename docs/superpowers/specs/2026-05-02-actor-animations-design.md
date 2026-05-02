# Actor Animations Design

## Overview

Add real frame-by-frame attack, walk, and death animations for the current playable hero and both current enemies in the Phaser JRPG slice. The feature should improve game feel without changing combat math, save data, inventory, progression, map transitions, or HUD contracts.

Animations are down-facing only for this pass. Movement in every direction uses the same down-facing walk cycle, matching the current front-facing starter art and keeping the art scope focused.

## Goals

- Generate a new matching pixel-art animation sheet for the hero, slime scout, and ruins warden.
- Render hero and enemy actors as Phaser sprites with real animation clips.
- Play hero walk, attack, idle, and dead animations from existing movement and combat state.
- Play enemy idle, walk, attack, and death-disappear animations from existing encounter state.
- Delay hiding defeated enemies until their disappearance animation completes.
- Keep all gameplay rules and save serialization unchanged.

## Non-Goals

- Four-direction animation.
- New manual attack input.
- New game-over, restart, or death recovery flow.
- Persistent enemy corpses.
- Changing map, combat, item, loot, or progression rules.
- Replacing terrain, UI, pickup, or doorway art.

## Asset Strategy

Use a companion animation sheet instead of expanding the existing starter sheet in place.

- Keep `static/game/assets/starter-pack.png` as the source for terrain, UI, pickups, doorway, and static fallback art.
- Add `static/game/assets/animation-pack.png` for actor animation frames.
- Generate the new sheet in a pixel-art style that matches the existing starter pack.
- Preserve current `starter-pack.png` frame coordinates and tests.

The animation sheet should contain down-facing rows for:

- Hero: idle, walk, attack, dead.
- Slime scout: idle, walk, attack, dead-disappear.
- Ruins warden: idle, walk, attack, dead-disappear.

Frame counts can be modest, but each clip must have at least two frames. The hero dead clip should end on a held collapsed pose. Enemy death clips should visibly transition out before the marker is hidden.

## Content Definitions

`src/lib/game/content/assets.ts` remains the source of truth for asset metadata. It should define:

- animation sheet key and path
- actor ids for hero, slime scout, and ruins warden
- actor display sizes
- frame rectangles for each actor animation frame
- animation clips with frame names, frame rate, and repeat behavior
- enemy id to actor animation mapping

`WorldScene` must not hard-code animation frame coordinates. It should consume the definitions from `assets.ts`.

## Phaser Scene Design

`WorldScene` will register frames from both the static starter pack and the animation pack. Hero and enemy markers become `Phaser.GameObjects.Sprite` instances. Pickups, terrain, transitions, health bars, attack flashes, and victory overlays stay on their current object types.

The scene should create Phaser animations only when they do not already exist. This avoids duplicate animation registration when maps restart or scenes are recreated.

Suggested helper boundaries inside `WorldScene`:

- register animation pack frames
- ensure actor animations
- create hero sprite
- create enemy sprite
- play hero animation
- play enemy animation
- update movement animation state
- handle enemy death animation completion

These helpers should stay in the Phaser integration layer. Pure `core/` modules remain unchanged.

## Runtime Behavior

Hero behavior:

- Idle plays when the hero has no movement vector.
- Walk plays whenever the movement vector is non-zero, regardless of facing direction.
- Attack interrupts idle or walk for one short non-looping clip when auto-attack lands.
- After attack, the next update returns the hero to idle or walk based on current movement.
- Dead plays when HP reaches 0.
- After hero death, normal movement and combat updates stop. No game-over UI is added.

Enemy behavior:

- Idle plays when an enemy is alive but not moving.
- Walk plays while the enemy is chasing the hero.
- Attack plays once when an enemy lands a contact hit.
- Dead-disappear plays once when the enemy reaches 0 HP.
- The enemy marker and health bars hide after the dead-disappear animation completes.
- Once defeated, an enemy should not return to idle, walk, or attack animation.

Boss behavior:

- The ruins warden uses its own animation frames and display size.
- Existing phase-two tint behavior remains.
- Enrage and animation state should not conflict; tint can continue applying to the sprite.

## Combat And Save Flow

Combat remains authoritative. Animations react to resolved events; they do not decide whether a hit lands.

Enemy defeat still:

- marks the encounter defeated
- adds the cleared encounter id
- resolves and awards drops
- applies XP reward
- publishes the existing status
- triggers victory state for the boss encounter

Only the enemy marker and health bar hiding should be delayed until the disappearance clip completes. If the test/mock runtime cannot observe animation completion, the scene may fall back to hiding immediately after scheduling the dead animation.

Save state remains unchanged. Cleared enemies loaded from a save should not render an active enemy animation.

## Testing

Add focused unit coverage rather than pixel-perfect visual tests:

- asset metadata includes required hero, slime scout, and ruins warden animation clips
- required clips contain valid frame references
- hero and enemy actors are created as sprites with animation-capable methods
- movement starts hero walk animation
- stopping returns hero to idle
- hero auto-attack plays attack animation
- enemy chase plays walk animation
- enemy contact hit plays attack animation
- enemy defeat plays dead-disappear and hides marker/health bars after completion
- hero reaching 0 HP plays dead and stops further movement/combat updates

Manual verification:

- run `bun run test:unit`
- start the game route
- verify `/game` in the meadow and boss maps shows walk, attack, and disappearance animations

## Risks

- Generated art may not align perfectly with current actor scale. Mitigation: keep actor display sizes in metadata and adjust only definitions.
- Phaser animation events can be awkward in mocked unit tests. Mitigation: isolate completion handling and allow immediate fallback in mocks.
- Attack clips may be overwritten by movement state too quickly. Mitigation: add a short animation lock or completion-based guard around non-looping clips.
- Enemy death timing could delay status or rewards in an undesirable way. Mitigation: keep gameplay completion immediate and delay only visual hiding.
