# HPA-674 Battle Aftermath — Design Spec

> Planning-only draft for [HPA-674](https://linear.app/cwchanap/issue/HPA-674/fix-battle-aftermath-stuck-return-spot-flee-re-engage-defeat-hp-and). Implement all four fixes in **this same PR** after design review.

## Problem and priority

The 2026-10-31 prologue UAT identified four connected battle-exit defects. The blocking failure is that some encounters send Grik back to an obstructed point. Losing also returns Grik at 1 HP, fleeing can immediately restart the fight, and overlapping battle sprites render in creation order rather than foot-position order.

These are game-loop bugs, not a request to rebuild combat or world navigation. Keep the fix limited to HPA-674.

## Verified current-main behavior

- `WorldScene.startBattle` (around line 961 in `src/lib/game/phaser/scenes/WorldScene.ts`) records `returnPosition` as the enemy's `homeX` and `homeY + tileSize * 2`. This does not check the map's current walkability.
- `WorldScene.findHeroAttackTarget` runs before `updateEnemyBehavior`; `startBattle` alone has a 1,500 ms recently-fled guard. The target acquisition and enemy chase decisions can continue selecting the fled pack.
- `WorldScene.resolveEnemyMovementTarget` uses combat bounds and a chase/return/idle mode, but does not consider a recently fled encounter.
- `applyBattleDefeat` in `src/lib/game/core/battle.ts` explicitly sets `player.hp = 1`.
- `BattleScene` creates hero/enemy sprites, enemy health bars, and short-lived slash/impact arcs. Actors do not call `setDepth`. The current scene **does not** create shadow or target-ring objects; this task should not invent them.
- `save/save-state.ts` already contains collision-aware `normalizePlayerPosition`, based on `isPositionWalkable` and `findNearestWalkablePosition` with story gates. `core/stats.ts` owns `getHeroBaseStats` and `deriveEffectiveStats`.

## Design decisions

### 1. Return to the encounter-start position, then validate it

- Capture the current player's `x`/`y` and facing when `startBattle` fires, **not** an offset from the enemy's home.
- Reuse the existing save-position normalization implementation for the same map and quest/story state. Export/reuse `normalizePlayerPosition` if necessary rather than duplicating navigation policy or adding a new safe-return registry.
- The ordinary case must remain at exactly the original player coordinates. If a coordinate is obstructed, use the current nearest-walkable search; use the authored map spawn only if no walkable candidate exists.
- On application of a battle result, revalidate against the resulting story-gated map if quest advancement changes walkability. Do not alter the `BattleReturnPosition` schema or existing saves.
- Collision checks must use the same player radius and resting-position semantics as save recovery, not a new radius heuristic.

This addresses the Mistfen pond toads, Silverpine wolf packs, and the scripted Sun-Crest captain without encounter-specific coordinates.

### 2. Flee should create a temporary *encounter-scoped disengagement*, not just a timer

**Desired behavior:** Grik can flee and stand still for at least five seconds without the same encounter chasing or restarting. He can fight the pack again after moving away and reapproaching.

- Keep the current `RecentlyFledEncounter` payload (encounter ID + global Phaser loop time). Do not persist new flee flags or change the save schema.
- Increase the minimum re-engagement grace to approximately 4,000 ms.
- Add one transient `hasExitedFledAggro` flag (or equivalent) to `WorldScene`, reset when returning from a fled battle. Until both the grace window has elapsed **and** Grik has exited the relevant pack's acquisition zone at least once, this pack remains protected.
- Define exit from that pack's actual combat/aggro geometry (using its existing combat bounds, acquisition radius and home/position as applicable). Do **not** use a hard-coded global 200 px radius for all encounters. Once exit is observed, do not reset the timer every frame; normal acquisition resumes after the remaining grace.
- Apply the same protection predicate in **three places**: `findHeroAttackTarget` (so an automatically selected target does not consume the frame), enemy steering (the protected pack returns home or idles instead of chasing), and the `startBattle` safety guard. Other packs remain interactive.
- Reuse the existing enemy return/idle steering behavior. An enemy in protected return/idle mode must not attack Grik. Avoid long-lived immunity after Grik has genuinely exited and the grace has elapsed.
- Clear this ephemeral protection when leaving the map or starting an unrelated battle. No cross-session protection is required.

**Why four seconds alone is insufficient:** the hero may remain inside the pack's aggro region. At t=4.0s the same encounter would reacquire him, violating the issue's five-second stationary acceptance check.

### 3. Defeat restores effective maximum HP

On defeat, keep the existing Shrine of Aurora (or scripted objective `respawn`) destination, quest event, item handling, and summary behavior. Change only the HP returned to the field:

```ts
const maxHp = deriveEffectiveStats(
  getHeroBaseStats(saveState.player),
  saveState.equipment
).maxHp;
```

Use that `maxHp` for the wake-up `player.hp`. This includes level-based HP and currently equipped HP bonuses. Do not add free healing to the rest command, rebalance bosses, or change the save format. Update the stale comment and old 1-HP assertions.

### 4. Sort existing battle actors by feet (Y), keep overlays above them

- Give the hero and each enemy a deterministic sprite depth based on their current `y` (for example, `10 + y`), both at creation and after movement. An actor standing lower on screen must draw in front of an actor standing higher.
- Use a constant depth above the arena's actor Y range for enemy health bars and short-lived attack/impact arcs, so the new actor sort cannot obscure those overlays.
- Update the existing Phaser mock marker types/functions in `scenes.test.ts` to support `setDepth`; assert the relative ordering rather than relying on creation order.
- Do not introduce shadow sprites, new target rings, floating text systems, new images, audio, or a general rendering-layer framework. If any such game objects are introduced in a later ticket, they can follow the same ordering convention there.

## Regression and acceptance contract

| Case | Automated check | Manual acceptance |
| --- | --- | --- |
| Return position | A table-driven check across authored overworld encounters and available story-gate states asserts returned positions are walkable; original walkable coordinates remain unchanged. | After Mistfen pond toads and Silverpine bridge/corridor wolves, Grik walks immediately. |
| Flee | Simulate the boar-king pack for 5+ seconds with no input; verify no chase or restart; then leave/re-enter its acquisition zone and confirm eventual re-engagement. Also verify a different pack is not suppressed. | Flee boar king, stand still for 5 seconds, then move away and return deliberately. |
| Defeat | Ordinary and scripted loss tests expect full effective max HP, including an equipped HP bonus; quest destination/progress unchanged. | Lose a battle and wake at the authored point with full HP. |
| Depth | Hero below enemy has greater actor depth; reversing their Y reverses order; health bars and impact arcs remain above actors. | In melee below boar king/boar, Grik appears in front and attacks remain readable. |

## Non-goals and risk control

- **One ticket, one PR:** design documents first, implementation committed to the same draft PR. No separate implementation PR.
- No new art or SFX; if new assets become necessary, scope them into a separate art task, not this coding task.
- Do not fix the other prologue UAT findings here (backdrops, area map, resizing, end card, ambience, text, bridges, or Lirra staging).
- No new save schema, encounter framework, global immunity system, historical-document rewrites, or backward-compatibility layer.
- Keep gameplay tests close to existing `battle.test.ts`, `save-state.test.ts`, and `scenes.test.ts` owners. Prefer assertions about player movement and encounter decisions over test-only production APIs.
- The pre-existing HPA-414 design documents explicitly encode 1-HP defeat recovery. This new issue intentionally supersedes that old behavior; leave historical plans intact.

## Ready-for-review criteria

The implementation remains draft until the focused unit tests, type check/lint, and targeted manual UAT are green. The planning-only docs themselves do not claim the fixes have been implemented or tested.
