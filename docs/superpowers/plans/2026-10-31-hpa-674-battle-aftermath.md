# HPA-674 Battle Aftermath — Implementation Plan

> **For implementation agents:** Continue on the same branch. Write focused failing regressions before production fixes. Checkboxes below are the original implementation checklist; current verification is recorded at the end.

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

- [ ] Add a RED `WorldScene.startBattle` test asserting the captured save contains Grik's own x/y/facing at the moment combat starts. Reuse existing `scenes.test.ts` fixtures; no multi-encounter sweep.
- [ ] Add two RED pure `applyBattleResultToSaveState` tests: a valid walkable return remains identical; a blocked Mistfen-area return is nudged to a walkable position using the current map/story geometry. Check the returned coordinates with the existing navigation owner instead of hard-coding a replacement tile.
- [ ] In `WorldScene.startBattle`, capture `this.buildSaveState()` once; its player fields hold the return coordinates instead of an `enemy.homeX/homeY` offset.
- [ ] Export the existing `normalizePlayerPosition` from `save-state.ts`; keep its current behavior, collision radius, and nearest-walkable fallback. Do not write a new resolver.
- [ ] Refactor `applyBattleResultToSaveState` to select the outcome-specific `BattleApplication` first (victory/fled/defeat), then **unconditionally** normalize `application.saveState.player` with `application.saveState.mapId` and **application.saveState.quests**. Preserve its summary and every other save-state field.
- [ ] Rerun the three regressions. Confirm existing scripted respawn and victory/quest tests remain green.

**Outcome:** No enemy-home offset can place Grik inside blocking terrain; final return points are checked in one pure battle-result owner for every outcome. Reachability after a story overlay splits the map remains a separate, deferred navigation issue.

## Task 2 — Minimal pack-scoped flee disengagement

**Files:** `src/lib/game/phaser/scenes/WorldScene.ts`, `src/lib/game/phaser/scenes/scenes.test.ts`.

- [ ] Replace the old 1,500 ms-only expectation in `suppresses the fled encounter until the re-engage grace period expires` with a RED bounded boar-king test: no chase or battle after 5+ seconds stationary; leave its real acquisition zone and return after grace -> normal re-engagement.
- [ ] Add a check that a different pack is not suppressed and that a protected closest target does not make `WorldScene.update` skip other enemy updates.
- [ ] Add one no-bounds `threshold-crawlers` or `core-crawlers` regression. During grace the crawler must not chase or attack, even though current `canEnemyAttackPlayer` returns true without bounds; after grace the crawler follows the existing unrestricted chase policy.
- [ ] Set grace to approximately 4,000 ms of active simulation and reset transient acquisition-zone state in `WorldScene.create`.
- [ ] For bounded packs, reuse `playerWithinLeash` and `canAcquire`; count an exit only after observing the player inside, even if the battle return starts outside. Show the localized re-engagement cue.
- [ ] Implement `isFledPackProtected(enemy)` keyed by encounter ID: bounded packs remain protected while grace remains or exit has not yet been observed; **unbounded packs use grace only**.
- [ ] Apply it in `findHeroAttackTarget`, `resolveEnemyMovementTarget` and `canEnemyAttackPlayer`. The redundant `startBattle` guard was removed.
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

**Files:** `src/lib/game/content/assets.ts`, `src/lib/game/content/assets.test.ts`, `src/lib/game/phaser/scenes/BattleScene.ts`, `src/lib/game/phaser/scenes/scenes.test.ts`.

- [ ] Add RED ordering tests that use the authored display heights (hero 90 px, thornback 108 px, boar king 168 px). Assert a lower **foot** renders in front even when center-Y sorting would give a different result; reverse the actor positions and confirm ordering reverses.
- [ ] Extend `createAnimatedMarker` with `setDepth` and displayed-height behavior (other existing mocks already support depth where needed). Extend overlay mocks only where necessary.
- [ ] Register one local `syncActorDepths()` on `postupdate`, and remove it at shutdown. Use per-frame, authored ground-contact coordinates and displayed height, so empty frame margins, attack effects, and tweened Y are handled.
- [ ] Derive the fixed overlay depth from the maximum authored actor display height. Apply it to existing enemy health bars and slash/impact arcs at creation.
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

- [ ] Walkable battle return (normal and normalized fallback); split-region reachability remains deferred
- [ ] Boar-king five-second stationary flee and deliberate exit/re-entry pass
- [ ] Unbounded crawler grace-only protection prevents chase and attack during grace
- [ ] Full effective max HP on defeat without lost story events
- [ ] Feet-based battle actor ordering and readable existing overlays
- [ ] Unit, type/lint/build, navigation, targeted Playwright, and manual UAT results recorded
- [ ] Exactly one HPA-674 PR; no unrelated UAT fixes, art, or audio

**Current status:** Earlier work is in commits `b4c603a`–`a5acd08`, fixture update `711d225`, regression follow-up `975917a`, and `postupdate` depth synchronization `e968996`. The current review fixes are uncommitted.

**Automated verification of the working tree:** 1,159 unit tests passed; `bun run check`, `bun run lint`, and `bun run world:check:navigation` passed. A browser-mode Vite build to a temporary directory passed, and the targeted battle-summary gate passed against that build. The new boar-flee and re-engagement E2E passed three consecutive runs. A broader pre-anchor Playwright run had 11 passes and 18 failures across the gate, exhaustive and flaky projects; the gate rerun before adding the new E2E had 9 passes and the same 12 failures, all reproduced against committed `e968996`. Other failures include stale interior/object expectations and a Guild Hall route timeout. Five fixture-dependent tests also failed before `711d225` because their version-9 save was rejected and Continue stayed disabled.

**Browser UAT (isolated seeded saves and instrumented input):**

- Ordinary boar and scripted captain defeats both returned Grik to the shrine at 24/24 HP while wearing a +4 HP vest; the captain defeat advanced the quest to “The Old Tunnel.”
- After victories over the Mistfen pool toads and the Silverpine corridor and bridge wolves, Grik moved immediately from the captured return positions. The bridge path was clear for approximately 125 px before a normal obstacle stopped further movement.
- A boar-king flee displayed the exit-and-return cue. Grik stayed in the pocket for more than five seconds without a restart, crossed outside the acquisition area, then re-entered and started a new battle.
- Seeded boar-king and thornback battles were visually inspected while Grik approached from above and below; foreground ordering changed with the ground-contact points and health bars remained visible. This was a headless browser pass using screenshots, not a full unseeded playthrough.
