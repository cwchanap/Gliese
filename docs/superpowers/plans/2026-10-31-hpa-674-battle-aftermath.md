# HPA-674 Battle Aftermath — Implementation Plan

> **For implementation agents:** Continue on **this same draft PR**, not a second implementation PR. Write focused failing regressions before each production fix. Checkboxes are planned work, not completed work.

**Issue:** [HPA-674](https://linear.app/cwchanap/issue/HPA-674/fix-battle-aftermath-stuck-return-spot-flee-re-engage-defeat-hp-and)

**Design:** [`2026-10-31-hpa-674-battle-aftermath-design.md`](../specs/2026-10-31-hpa-674-battle-aftermath-design.md)

**Goal:** Eliminate blocked battle returns, immediate post-flee re-engagement, 1-HP defeat recovery, and incorrect arena sprite overlap.

**Architecture:** `WorldScene` owns overworld acquisition and enemy steering; `core/battle.ts` applies outcomes and normalizes final positions; `save-state.ts` remains the sole navigation normalizer; `BattleScene` owns local actor depth. No new framework, schema, renderer, or art pipeline.

**Stack:** TypeScript, Phaser 4, Svelte 5, Vite, Vitest, Playwright, Bun, Tauri.

## Scope discipline

- Use one PR for this one ticket: continue on `docs/hpa-674-battle-aftermath-plan`, replacing the planning-only draft with implementation and tests before marking it ready.
- Reuse the existing movement, stat, save, quest, test, and renderer helpers. No duplicated navigation policy, per-encounter return-point registry, or exhaustive encounter × story-state matrix.
- Do not alter unrelated UAT findings, rebalance enemies, add persistence fields, or rewrite historical spec files.
- No new art/SFX. If such work is truly needed, make it a separate art task later.

## Task 1 — Player-origin return with unconditional final normalization

**Files:**
- `src/lib/game/phaser/scenes/WorldScene.ts`
- `src/lib/game/core/battle.ts`
- `src/lib/game/save/save-state.ts`
- `src/lib/game/phaser/scenes/scenes.test.ts`
- `src/lib/game/core/battle.test.ts`

- [ ] Add a RED `WorldScene.startBattle` test asserting the `returnPosition` equals Grik's own x/y/facing at the moment combat starts. Reuse existing `scenes.test.ts` fixtures; no multi-encounter sweep.
- [ ] Add two RED pure `applyBattleResultToSaveState` tests: a valid walkable return remains identical; a blocked Mistfen-area return is nudged to a walkable position using the current map/story geometry. Check the returned coordinates with the existing navigation owner instead of hard-coding a replacement tile.
- [ ] In `WorldScene.startBattle`, capture `this.buildSaveState()` once and set the return coordinates from `this.player`, not from `enemy.homeX/homeY`.
- [ ] Export the existing `normalizePlayerPosition` from `save-state.ts`; keep its current behavior, collision radius, and nearest-walkable fallback. Do not write a new resolver.
- [ ] Refactor `applyBattleResultToSaveState` to select the outcome-specific `BattleApplication` first (victory/fled/defeat), then **unconditionally** normalize `application.saveState.player` with `application.saveState.mapId` and **application.saveState.quests**. Preserve its summary and every other save-state field.
- [ ] Rerun the three regressions. Confirm existing scripted respawn and victory/quest tests remain green.

**Outcome:** No enemy-home offset can strand Grik; final return points are validated in one pure battle-result owner for every outcome.

## Task 2 — Minimal pack-scoped flee disengagement

**Files:** `src/lib/game/phaser/scenes/WorldScene.ts`, `src/lib/game/phaser/scenes/scenes.test.ts`.

- [ ] Replace the old 1,500 ms-only expectation in `suppresses the fled encounter until the re-engage grace period expires` with a RED bounded boar-king test: no chase or battle after 5+ seconds stationary; leave its real acquisition zone and return after grace -> normal re-engagement.
- [ ] Add a check that a different pack is not suppressed and that a protected closest target does not make `WorldScene.update` skip other enemy updates.
- [ ] Add one no-bounds `threshold-crawlers` or `core-crawlers` regression. During grace the crawler must not chase or attack, even though current `canEnemyAttackPlayer` returns true without bounds; after grace the crawler follows the existing unrestricted chase policy.
- [ ] Set `recentlyFledGraceMs` to approximately 4,000 ms and add **one** transient `fledPackExited` flag (or equivalent), reset in `WorldScene.create` beside `recentlyFled`.
- [ ] For bounded packs, reuse `playerWithinLeash` and `canAcquire` already computed by `resolveEnemyMovementTarget`. **Observe exit before returning early for protection**: flag exit when the player is no longer inside `playerWithinLeash && canAcquire`; the flag stays set once observed.
- [ ] Implement a small `isFledPackProtected(enemy, time)` guard keyed by the saved encounter ID: bounded packs remain protected while grace remains or exit has not yet been observed; **unbounded packs use grace only**. No extra map data or new geometry algorithm.
- [ ] Apply it in `findHeroAttackTarget`, `resolveEnemyMovementTarget` (protected pack returns/ idles), `canEnemyAttackPlayer` (explicit protection check, including no-bounds packs), and `startBattle` (last safety guard). Pass the current frame time as needed rather than adding another clock.
- [ ] Verify normal map/scene resets clear the transient flag. Do not add a bespoke reset/cleanup framework.
- [ ] Repeat boar-king and crawler tests. The ticket's **five-second stationary acceptance applies to the bounded boar king**; for unbounded crawlers the explicitly accepted behavior is grace-only, as their existing content has no finite acquisition pocket.

**Outcome:** Boar king does not restart the fight while Grik stays put, and deliberate exit/re-entry restores combat. Ruins crawlers use their current chase design after grace.

## Task 3 — Full effective HP on defeat

**Files:** `src/lib/game/core/battle.ts`, `src/lib/game/core/battle.test.ts`, `src/lib/game/phaser/scenes/scenes.test.ts`.

- [ ] Update the existing defeat test in `battle.test.ts` (around line 347) and field re-entry/autosave test in `scenes.test.ts` (around line 7505) to expect full HP rather than 1.
- [ ] Include an additional RED leveled/equipped case to pin `deriveEffectiveStats(getHeroBaseStats(saveState.player), saveState.equipment).maxHp`.
- [ ] Update `applyBattleDefeat` and its doc comment; preserve the scripted captain `lose-battle` quest progression, existing Shrine/scripted spawn coordinates, inventory, and summary semantics.
- [ ] Rerun the affected tests without adding a new heal command or save migration.

**Outcome:** Grik wakes at the correct story location with full level-and-equipment-adjusted HP.

## Task 4 — Sort battle actors by displayed feet

**Files:** `src/lib/game/phaser/scenes/BattleScene.ts`, `src/lib/game/phaser/scenes/scenes.test.ts`.

- [ ] Add RED ordering tests that use the authored display heights (hero 90 px, thornback 108 px, boar king 168 px). Assert a lower **foot** renders in front even when center-Y sorting would give a different result; reverse the actor positions and confirm ordering reverses.
- [ ] Extend `createAnimatedMarker` with `setDepth` and displayed-height behavior (other existing mocks already support depth where needed). Extend overlay mocks only where necessary.
- [ ] Add one local `syncActorDepths()` and call it **once near the top of `BattleScene.update`**, after payload/player/result guards and before flee/hit-stop early returns. Depth must be calculated as `y + displayHeight / 2`, not `10 + y`; this includes tweened Y without per-movement-site hooks.
- [ ] Use named scene constants for any depth offsets and for a fixed overlay depth above actor feet within the 504 px arena. Apply that depth to existing enemy health bars and the existing slash/impact arcs at creation.
- [ ] Validate that actor sorting and overlays remain correct across regular movement, hit stop, and lunge frames. Do not add shadows, target rings, floating text, or a generic depth manager.

**Outcome:** Boar king/boar and Grik overlap naturally, and existing attack/HP overlays stay readable.

## Task 5 — Verification and manual UAT

- [ ] Focused RED-to-green tests:

```bash
bun run test:unit -- --run src/lib/game/core/battle.test.ts src/lib/game/save/save-state.test.ts src/lib/game/phaser/scenes/scenes.test.ts
```

- [ ] Full checks:

```bash
bun run test:unit -- --run
bun run check
bun run lint
bun run world:check:navigation
bun run build
```

- [ ] **Targeted Playwright E2E (not optional):** the existing battle → summary → field test must still work. It also exercises the compiled-`WorldScene` runtime probe behavior.

```bash
bunx playwright test --project=gate --grep "encounter opens battle scene"
```

Run after `bun run build`. If the bundled test-probe regex fails due to source changes, fix the test-only harness in the same PR without loosening product assertions. `bun run test` is an optional broader smoke run, not necessary for this single-ticket fix.

- [ ] Manual UAT: clear Mistfen pond toads and Silverpine corridor/bridge wolves, then move immediately; no stuck return.
- [ ] Flee boar king, stand still for 5+ seconds (no chase/restart); move outside its acquisition pocket and back, then confirm re-engagement.
- [ ] Lose an ordinary fight and scripted Sun-Crest captain; verify effective max HP, original spawn and quest outcome.
- [ ] Approach boar king/thornback above and below; verify hero/monster feet ordering and readability of existing health bars and hit flashes.
- [ ] Record tested commit and actual automated/manual results in **this PR**. Mark ready for review only when the fixes are implemented and accepted; update Linear HPA-674 as work proceeds.

## Acceptance

- [ ] No blocked battle return (normal and normalized fallback)
- [ ] Boar-king five-second stationary flee and deliberate exit/re-entry pass
- [ ] Unbounded crawler grace-only protection prevents chase and attack during grace
- [ ] Full effective max HP on defeat without lost story events
- [ ] Feet-based battle actor ordering and readable existing overlays
- [ ] Unit, type/lint/build, navigation, targeted Playwright, and manual UAT results recorded
- [ ] Exactly one HPA-674 PR; no unrelated UAT fixes, art, or audio

**Current status:** Implemented and tested on this PR (commits `b4c603a`–`a5acd08`, plus test-harness `711d225`); automated checks, targeted Playwright, and manual UAT results are recorded in `.superpowers/sdd/2026-10-31-hpa-674-battle-aftermath/task-*-report.md`. Final-review minor findings were addressed in the fix wave that followed.
