# HPA-674 Battle Aftermath — Design Spec

> Planning-only draft for [HPA-674](https://linear.app/cwchanap/issue/HPA-674/fix-battle-aftermath-stuck-return-spot-flee-re-engage-defeat-hp-and). Implement the four fixes on **this same PR** after review.

## Problem and scope

The 2026-10-31 prologue UAT found four battle-aftermath problems: Grik can return from battle inside obstructed terrain (run-stopping), defeat leaves him at 1 HP, fleeing can retrigger the same pack, and arena sprites incorrectly cover one another.

This is a focused combat-flow repair, not a world-navigation, save-schema, or presentation rewrite. No new art or SFX is required.

## Verified baseline on main

- `WorldScene.startBattle` currently sets the battle `returnPosition` from enemy home + two tiles (not the player's encounter-start location). `findHeroAttackTarget` executes before enemy steering, and suppression currently happens only inside `startBattle` for 1,500 ms.
- `resolveEnemyMovementTarget` already computes the bounded-pack acquisition inputs `playerWithinLeash` and `canAcquire`, with chase/return/idle movement. But the two crawler encounters `threshold-crawlers` and `core-crawlers` have **no `combatBounds`**. Those use unconditional chase, and `canEnemyAttackPlayer` currently returns true when bounds are absent.
- `applyBattleResultToSaveState` in `core/battle.ts` handles victory, fleeing, and defeat centrally. `normalizePlayerPosition` in `save/save-state.ts` already handles resting-position walkability with story gates; it does not import `core/battle.ts` at runtime.
- `applyBattleDefeat` currently sets wake-up HP to 1. The canonical max HP comes from `deriveEffectiveStats(getHeroBaseStats(player), equipment).maxHp`.
- `BattleScene` currently renders hero/enemy sprites, enemy health bars, and hit arcs without actor depth sorting. Its sprites have default 0.5 origins and unequal display heights: hero 90 px, thornback boar 108 px, boar king 168 px. The hero's lunge tween also moves its sprite outside the regular movement handler.
- `tests/e2e/game.e2e.ts` already covers entering and leaving a battle through the summary, and its runtime probes depend on compiled `WorldScene` details.

## Decisions

### 1. Use the player's origin; normalize centrally and unconditionally

- In `WorldScene.startBattle` capture the player's actual `x`, `y`, and facing at the moment of encounter, not an offset from the enemy's home. Keep the existing `BattleReturnPosition` contract; deleting it is unrelated churn.
- Export and reuse `normalizePlayerPosition` from `save-state.ts`; **do not** add another walkability algorithm or encounter return-coordinate table.
- Call the normalizer **once for every outcome** from `applyBattleResultToSaveState`, on the **final** application save state's `mapId`, `player`, and **resulting** `quests`. Normalize after victory/defeat quest progression and scripted respawn are applied, so the final story-gated geometry is authoritative. No conditional geometry-change detection in Phaser.
- Existing walkable coordinates must remain unchanged. If invalid, choose the existing nearest-walkable solution and retain the normal map-spawn fallback.

### 2. Flee: bounded packs require grace AND observed exit

Use the existing `RecentlyFledEncounter` (encounter ID plus global loop timestamp) and **one ephemeral boolean**, `fledPackExited` (name illustrative), reset alongside `recentlyFled` in `WorldScene.create`. Do not persist immunity or add new battle-result fields.

- Increase minimum grace to approximately 4,000 ms.
- For packs **with combat bounds**, protection continues while the minimum grace has not elapsed **or** until the player has been observed outside that pack's existing acquisition condition. Reuse `playerWithinLeash && canAcquire` from steering; record the exit when that conjunction is false. Compute/observe that condition before the protected pack's steering returns early, so the flag can actually become true. Do not invent a second geometry algorithm or reset the timer continuously.
- For packs **without combat bounds** (the two ruins crawler encounters), use **grace-only protection**. There is no authored leash/aggro pocket against which to prove an exit. Do not add such bounds in HPA-674: it would change crawler chase design. These packs may re-engage after grace if the player remains near them. The five-second stationary guarantee in this ticket applies to the **boar-king bounded encounter**, not unbounded crawlers.
- Apply protection consistently in `findHeroAttackTarget`, `resolveEnemyMovementTarget` (protected enemy returns to home or idles), `canEnemyAttackPlayer` (even unbounded enemies must not attack during protection), and the final `startBattle` guard. Keep other packs active.
- When a bounded pack has been exited and the minimum grace has passed, normal chasing/acquisition returns. Clear this transient state simply via the normal `WorldScene.create` reset on subsequent map/scene transitions.

This prevents the original issue where a protected closest target gets selected, `startBattle` declines, and the early return freezes all enemy updates in that frame.

### 3. Defeat: full effective HP, unchanged story handling

Continue to honor the Shrine of Aurora or a scripted objective's `respawn`, inventory effects, `lose-battle` event, and summary. Change wake-up `player.hp` to:

```ts
deriveEffectiveStats(getHeroBaseStats(saveState.player), saveState.equipment).maxHp
```

This includes level and equipped max-HP bonuses. Update the defeat comment and assertions. No free Rest heal, boss rebalance, or new persistence shape.

### 4. Y-sort by **sprite feet**, not center Y

- Use the actor's sprite foot coordinate `y + displayHeight / 2` because the source sprite origin is 0.5; the actual display heights differ by actor. Use real content dimensions (or Phaser `displayHeight`) in tests, not uniform placeholders.
- Introduce a single local `syncActorDepths()` pass in `BattleScene.update` after the valid-player/payload/result guard and **before** flee/hit-stop early returns. This handles tweened Y as well as ordinary movement without adding depth hooks at individual movement sites. The first update establishes creation depths; keep the pass once per frame.
- Give existing health-bar rectangles and short-lived slash/impact arcs one named, fixed overlay depth safely above the tallest actor feet position in the 504 px arena.
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
