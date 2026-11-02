# HPA-674 Battle Aftermath — Design Spec

> Design and review decisions for [HPA-674](https://linear.app/cwchanap/issue/HPA-674/fix-battle-aftermath-stuck-return-spot-flee-re-engage-defeat-hp-and).

## Problem and scope

The 2026-10-31 prologue UAT found four battle-aftermath problems: Grik can return from battle inside obstructed terrain (run-stopping), defeat leaves him at 1 HP, fleeing can retrigger the same pack, and arena sprites incorrectly cover one another.

This is a focused combat-flow repair, not a world-navigation, save-schema, or presentation rewrite. No new art or SFX is required.

## Original baseline on main, before HPA-674

- `WorldScene.startBattle` set the battle `returnPosition` from enemy home + two tiles (not the player's encounter-start location). `findHeroAttackTarget` executed before enemy steering, and suppression happened only inside `startBattle` for 1,500 ms.
- `resolveEnemyMovementTarget` already computed the bounded-pack acquisition inputs `playerWithinLeash` and `canAcquire`, with chase/return/idle movement. But the two crawler encounters `threshold-crawlers` and `core-crawlers` have **no `combatBounds`**. Those use unconditional chase, and `canEnemyAttackPlayer` returned true when bounds were absent.
- `applyBattleResultToSaveState` in `core/battle.ts` handles victory, fleeing, and defeat centrally. `normalizePlayerPosition` in `save/save-state.ts` already handles resting-position walkability with story gates; it does not import `core/battle.ts` at runtime.
- `applyBattleDefeat` set wake-up HP to 1. The canonical max HP comes from `deriveEffectiveStats(getHeroBaseStats(player), equipment).maxHp`.
- `BattleScene` rendered hero/enemy sprites, enemy health bars, and hit arcs without actor depth sorting. Its sprites have default 0.5 origins and unequal display heights: hero 90 px, thornback boar 108 px, boar king 168 px. The hero's lunge tween also moves its sprite outside the regular movement handler.
- `tests/e2e/game.e2e.ts` already covers entering and leaving a battle through the summary, and its runtime probes depend on compiled `WorldScene` details.

## Decisions

### 1. Use the player's origin; normalize centrally and unconditionally

- In `WorldScene.startBattle` capture the player's actual `x`, `y`, and facing in the battle-start save snapshot, not an offset from the enemy's home. Review replaced the duplicate `BattleReturnPosition` field with this single source of truth.
- Export and reuse `normalizePlayerPosition` from `save-state.ts`; **do not** add another walkability algorithm or encounter return-coordinate table.
- Call the normalizer **once for every outcome** from `applyBattleResultToSaveState`, on the **final** application save state's `mapId`, `player`, and **resulting** `quests`. Normalize after victory/defeat quest progression and scripted respawn are applied, so the final story-gated geometry is authoritative. No conditional geometry-change detection in Phaser.
- Existing walkable coordinates must remain unchanged. If invalid, choose the existing nearest-walkable solution and retain the normal map-spawn fallback.
- Suppress transitions overlapping a battle return until the player leaves and re-enters their activation radius, so clearing an encounter on the ruins stairs does not immediately change maps.
- Review reproduced a separately scoped limitation: an overworld position at `(5960, 6888)` reachable before the raid normalizes into a 28-cell isolated pocket under the raid overlay. The raid intentionally creates disconnected regions, and the old position alone cannot identify the correct side; story-aware local recovery was deferred for a dedicated navigation design.

### 2. Flee: bounded packs require grace AND observed exit

Use the existing `RecentlyFledEncounter` (encounter ID), a transient acquisition-zone state, and an active-simulation grace countdown, reset in `WorldScene.create`. Do not persist immunity or add new battle-result fields.

- Use approximately 4,000 ms of active world simulation; paused, story, and dialogue time does not consume grace.
- For packs **with combat bounds**, protection continues while the minimum grace has not elapsed **or** until the player has entered and subsequently exited the pack's existing acquisition condition. Reuse `playerWithinLeash && canAcquire` from steering. A return that starts outside does not itself count as an exit. Display a localized cue explaining the necessary approach/retreat/return.
- For packs **without combat bounds** (the two ruins crawler encounters), use **grace-only protection**. There is no authored leash/aggro pocket against which to prove an exit. Do not add such bounds in HPA-674: it would change crawler chase design. These packs may re-engage after grace if the player remains near them. The five-second stationary guarantee in this ticket applies to the **boar-king bounded encounter**, not unbounded crawlers.
- Apply protection consistently in `findHeroAttackTarget`, `resolveEnemyMovementTarget` (protected enemy returns to home or idles), and `canEnemyAttackPlayer` (even unbounded enemies must not attack during protection). Keep other packs active; the redundant `startBattle` guard was removed.
- When a bounded pack has been exited and the minimum grace has passed, normal chasing/acquisition returns and the transient record is cleared. Scene recreation also resets the state.

This prevents the original issue where a protected closest target gets selected, `startBattle` declines, and the early return freezes all enemy updates in that frame.

### 3. Defeat: full effective HP, unchanged story handling

Continue to honor the Shrine of Aurora or a scripted objective's `respawn`, inventory effects, `lose-battle` event, and summary. Change wake-up `player.hp` to:

```ts
deriveEffectiveStats(getHeroBaseStats(saveState.player), saveState.equipment).maxHp
```

This includes level and equipped max-HP bonuses. Update the defeat comment and assertions. No free Rest heal, boss rebalance, or new persistence shape.

### 4. Y-sort by **sprite feet**, not center Y

- Author ground-contact Y coordinates for each actor animation frame, excluding effects, weapons and mouth appendages below the feet. With centered sprite origins, depth is `y + displayHeight * (groundContactY / frameHeight - 0.5)`. Use actual display sizes and frame data in tests.
- Register one `syncActorDepths()` pass on the `postupdate` event and remove it on shutdown. It observes animation frames and tweened Y after normal update, including movement, hit stop, and lunge frames.
- Give existing health-bar rectangles and short-lived slash/impact arcs one fixed overlay depth above the arena plus half the maximum authored actor display height.
- Extend only the test mocks that need `setDepth` or displayed height. Do not invent shadow sprites, target rings, floating text, images, or a generic render-layer manager.

## Smallest useful tests

| Area | Focused regression | Manual acceptance |
| --- | --- | --- |
| Return | One `WorldScene.startBattle` test requires the original player's x/y/facing. Two pure `applyBattleResultToSaveState` tests assert a walkable return remains unchanged and a genuinely blocked Mistfen return is normalized. | Win Mistfen toads and Silverpine wolves; walk immediately. |
| Flee | Extend the boar-king scene test: 5+ seconds stationary -> no chase/battle; exit and re-enter -> re-engages; another pack stays active. Include one no-bounds crawler test that confirms grace-only and no attack during grace. | Flee boar king; stand still 5 s; leave pocket and return deliberately. |
| Defeat | Ordinary and scripted loss tests assert correct respawn, unchanged story effects, and effective maximum HP including an equipped bonus. Update old 1-HP expectations. | Wake with full HP after ordinary and captain defeats. |
| Depth | Depth comparisons use actual hero/boar heights; Y crossover reverses ordering and existing health bars/effects remain visible above actors. | Grik in front when his feet are lower than the boar king's. |
| E2E | Run existing `encounter opens battle scene and returns through battle summary` Playwright test. | Battle flow still returns to the field. |

Do not add an exhaustive encounter × story-state matrix, tests that reproduce every obsolete home-offset coordinate, or conditional geometry-change detection. The three return tests prove the relevant behavior more directly.

## Non-goals / delivery policy

- **One ticket, one PR:** commit implementation and tests to this draft PR; no second implementation PR.
- No new art/SFX in this coding task. Any genuinely needed new assets belong in a separate art task.
- No other UAT bugs, enemy balancing, save migration/backward compatibility, encounter framework, or new global immunity system.
- Historical HPA-414 plans encode 1-HP defeat recovery; the current HPA-674 decision intentionally supersedes that behavior. Do not rewrite old plans.
- The draft is not implementation-complete until automated checks, targeted Playwright E2E, and manual UAT are done.
