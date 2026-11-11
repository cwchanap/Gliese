# HPA-816 — Oren's forge counter interaction (design spec)

**Status:** Proposed design for review; implementation has not started.
**Linear:** https://linear.app/cwchanap/issue/HPA-816/i-cant-talk-to-oren-across-his-own-workbench
**Related:** HPA-815 (forge entrance/exit), HPA-760 (interaction feedback and NPC selection), HPA-818 (separate Gear keyboard UX).
**Target:** One issue, one PR, with this spec and its implementation plan updated in the same PR as the eventual fix.

## Problem and verified cause

In the Round 3 playtest, the player walked straight up to Oren behind the Blacksmith service counter and pressed E, but received “Traveler: No one is nearby.” Walking around the counter eventually worked. An existing Linear investigation reproduced the failure against main on 2026-11-07.

Current authored geometry and runtime:

| Item | Current geometry |
| --- | --- |
| Oren | `blacksmithLayout.npcApproaches.oren.npc = (448, 416)` |
| Intended customer approach | `blacksmithLayout.npcApproaches.oren.approach = (448, 480)` |
| Service counter collision | Rect `x=284, y=440, width=324, height=18` |
| Normal NPC reach | `PLAYER_COLLISION_RADIUS 12 + NPC_INTERACTION_RADIUS 36 + NPC_PACK_COLLISION_RADIUS 17 = 65px` |
| Actual normal upward walk | Navigation/collision stops around `(448, 482)`, **66px** from Oren |

Thus the designed customer approach is barely within reach on paper, but the normal walk-to-counter stopping position is **1px outside**. The problem is not a missing E binding or a separate dialogue selector: `WorldScene.updateNpcDialogue`, `handleInteractInput`, and shop/dialogue reach already resolve through `findNearbyNpc`.

Existing `scenes.test.ts` Oren coverage teleports the player to `(448, 480)`, which is 64px away and therefore narrowly passes. It does not model the normal movement stopping point.

## Goal

A player who approaches the counter normally from the entrance should reliably see “Oren nearby,” press E, receive his dialogue, complete the existing first-quest talk objective, and open the Sundrop Forge shop. No special sideways movement, coordinate hunting, or pixel-perfect positioning.

Preserve the visual impression of Oren standing **behind** the counter. The painted Blacksmith package and the fallback scene must agree with the authoritative layout and collision.

## Decision: correct local placement before changing interaction rules

**Preferred minimal change:** move Oren's authored NPC position **20px toward the customer side**, from `(448, 416)` to **`(448, 436)`** in `src/lib/game/content/maps/layouts/village-interiors-v2.ts`. Keep the customer approach `(448, 480)` and the service counter collision exactly as authored.

The computed change is deliberately small:

- At the observed `(448, 482)` normal stopping point, distance changes from 66px (1px outside) to 46px (**19px inside** normal reach).
- At `(448, 496)`, still near the counter, distance becomes 60px (5px inside).
- At `(448, 560)`, distance remains 124px (outside reach).
- Oren's center remains north of the collision strip starting at `y=440`; the NPC and counter may visually overlap at their edges, as is natural for a shopkeeper behind a counter.

This is a **candidate geometry adjustment**, not permission to silently break the painted scene. The implementation must inspect an in-game screenshot and a normal keyboard approach. If the repositioned sprite visibly crosses the front edge of the counter or interferes with navigation, revise the **local** geometry within this PR before accepting it. Do not call it fixed solely because a teleported unit test passes.

### Alternatives considered

- **Raise the global NPC interaction radius:** rejected. It changes every NPC's reach and risks talking through unrelated barriers.
- **Introduce per-NPC interaction overrides/rectangles:** deferred. They add schema/runtime complexity for an issue that has a straightforward local placement root cause. Reconsider only with concrete evidence that a geometry-only change cannot work.
- **Move or weaken the counter collision:** not preferred, because it can let the player walk into the visibly solid workbench; reserve this for a demonstrated mismatch between painted counter and collision.
- **Rewrite NPC dialogue/shop/quest flow:** rejected; the existing shared selection path already provides consistent behavior.

## Ownership and constraints

- **Geometry source of truth:** `src/lib/game/content/maps/layouts/village-interiors-v2.ts`; `content/maps.ts` already reads Oren's authored position from there. Do not duplicate a second Oren coordinate.
- **Existing engine:** `src/lib/game/phaser/scenes/WorldScene.ts` and `src/lib/game/core/interaction.ts` should need no changes.
- **No map redesign:** preserve forge entrance, exit trigger, service counter rectangle, navigation-grid source, doorway, shop stock, dialogue, quest IDs, and save data.
- **No assets:** no new art or SFX. If a new painted asset truly becomes necessary, scope art generation to a separate task rather than mixing it into this ticket.
- **No compatibility work:** there are no production users requiring save migration.

## Acceptance criteria

1. **Walk-up interaction:** a normal keyboard approach reaches the counter and leaves Grik comfortably within Oren's 65px interaction range, with at least ~12px margin at the observed stop. The current geometry's 1px shortfall is eliminated.
2. **Same target across UI and E:** “Oren nearby” appears; pressing E opens *Oren*, not “No one is nearby.” Choosing “Shop” still opens `sundrop-forge`, and the existing talk-to-Oren quest event remains intact.
3. **No remote talking:** standing substantially away from the counter still gives normal out-of-range behavior; other NPC behavior and selection ordering remain unchanged.
4. **Visual and collision parity:** Oren is visibly behind the counter in both painted and fallback views; player movement stays outside collision props and does not wedge.
5. **No unrelated scope:** HPA-818 keyboard behavior and HPA-815 exterior doorway changes are untouched.

## Review/verification evidence required

- A failing-before/passing-after regression using a **walk-reachable customer-side point** (especially `(448, 482)`), not solely the old seeded `(448, 480)` test.
- A small data-contract test over actual authored interior NPC approach coordinates and existing interaction constants, checking that a normal walk-up has an intentional margin rather than 1px luck.
- Targeted scene test for status → E dialogue → existing shop choice, plus out-of-range control.
- One manual keyboard smoke from the normal New Run route into the forge, including a screenshot and confirmation of the same behavior with the painted interior; verify fallback if available.
- Targeted unit/e2e checks, plus `bun run check` and `bun run lint`.

**Deliberately out of scope:** interaction-system refactor, new generic proximity API, pathfinding, world relayout, Gear keybindings, NPC/story copy changes, audio, art generation, and save migrations.
