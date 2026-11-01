# HPA-674 Battle Aftermath — Implementation Plan

> **For implementation agents:** Execute the following steps on the **existing HPA-674 draft PR branch**, not in a second PR. Add regression tests before the related production fix. Checkbox state represents planned work, not completed work.

**Issue:** [HPA-674](https://linear.app/cwchanap/issue/HPA-674/fix-battle-aftermath-stuck-return-spot-flee-re-engage-defeat-hp-and)

**Design:** [`2026-10-31-hpa-674-battle-aftermath-design.md`](../specs/2026-10-31-hpa-674-battle-aftermath-design.md)

**Goal:** Remove the battle return-position soft-lock, ensure fleeing really disengages a pack, make defeat recovery playable, and fix arena sprite overlap.

**Architecture:** Keep `WorldScene` as the only owner of overworld encounter acquisition/steering; keep `core/battle.ts` as the battle-result authority; reuse existing navigation and effective-stat helpers; update `BattleScene` rendering locally. No new service, state machine, asset pipeline, or save version.

**Stack:** TypeScript, Phaser, Vitest, SvelteKit, Bun.

## Working agreements

- **Single PR:** the two design docs are the first commits; continue production code and tests on `docs/hpa-674-battle-aftermath-plan` (branch may be renamed if desired, without opening another PR).
- Work in these files unless a focused regression proves another owner is required:
  - `src/lib/game/phaser/scenes/WorldScene.ts`
  - `src/lib/game/phaser/scenes/BattleScene.ts`
  - `src/lib/game/core/battle.ts`
  - `src/lib/game/save/save-state.ts`
  - `src/lib/game/core/battle.test.ts`
  - `src/lib/game/save/save-state.test.ts` and/or `src/lib/game/phaser/scenes/scenes.test.ts`
- Use real map navigation and quest gate definitions. Do not hard-code fixes for individual pack IDs.
- Update current behavior/tests, not old planning documents. Do not add backward compatibility for an unshipped game.
- No new artwork or SFX. If needed, plan those in a separate task.

## Task 1 — Pin the walkable return-position regression

**Owners:** `WorldScene.ts`, `scenes.test.ts`, optionally `save-state.test.ts`.

- [ ] Add a focused WorldScene regression that shows why `enemy.homeY + tileSize * 2` fails for at least Mistfen toads, Silverpine corridor/bridge wolves and the fleeing Sun-Crest captain.
- [ ] Expand into one data-driven test using actual overworld encounter definitions and representative authored story-gate/quest states (reuse `questStateAt`). Verify that a started battle retains the player's original walkable position and that the resulting return coordinate passes the map's resting-position navigation check.
- [ ] Include one deliberately obstructed input to verify nearest-walkable fallback, and one already-walkable input to verify coordinates do not shift.
- [ ] Confirm the test fails on current behavior before fixing production code.

**Implementation:**

- [ ] In `WorldScene.startBattle` capture `this.buildSaveState()` once. Build the return position from the player coordinates/facing instead of enemy-home coordinates.
- [ ] Reuse `normalizePlayerPosition` from `save-state.ts` (make it exported if needed). Do not implement a second nearest-walkable algorithm.
- [ ] On field re-entry after a battle result, validate the final position against the resulting quest-gated map when the quest result changes map geometry; leave all other scene transitions unaffected.
- [ ] Run focused tests and check that the old blocked-offset cases now pass.

**Important:** The player-origin position is the normal answer. Navigation normalization is a safety net, not a replacement for the player-origin decision.

## Task 2 — Make fled packs stop acquiring the player

**Owners:** `WorldScene.ts`, `scenes.test.ts`.

- [ ] Update/extend the existing `suppresses the fled encounter until the re-engage grace period expires` regression. From a boar-king flee return, advance WorldScene to >5,000 ms with stationary Grik; assert no restart and no chase.
- [ ] Assert that the same encounter's acquisition is suppressed through both the hero's automatic proximity trigger and the enemy's movement/attack loop.
- [ ] Assert other packs remain able to engage normally.
- [ ] Move Grik outside that pack's authored acquisition region, then back inside after the grace window; assert normal battle acquisition resumes. Test this without save/load or scene restart.
- [ ] Confirm these assertions fail on the existing 1,500 ms-only behavior.

**Implementation:**

- [ ] Raise `recentlyFledGraceMs` from 1,500 to about 4,000.
- [ ] Track transient per-return exit satisfaction (e.g. `hasExitedFledAggro`) alongside existing `recentlyFled`. No change to `RecentlyFledEncounter`, `SaveState`, or `BattleResult`.
- [ ] Define a small local protection predicate keyed to `recentlyFled.encounterId`, enforcing both minimum grace time and an observed exit from the matching pack's real acquisition bounds.
- [ ] Exclude the protected pack in `findHeroAttackTarget` so the world update does not prematurely return after a suppressed battle start.
- [ ] Use the same predicate in `resolveEnemyMovementTarget` / `updateEnemyBehavior`: steer that pack to its current return/idle behavior; never chase/attack during protection.
- [ ] Keep `startBattle` as the final suppression guard; reset transient protection on map/scene exit or a different encounter.
- [ ] Do not solve the issue by perpetually resetting a timer or teleporting the player away from the enemy.

**Exit condition:** Five seconds standing still causes no repeated boar-king battle; leaving and re-entering restores normal play.

## Task 3 — Restore full HP after defeat

**Owners:** `core/battle.ts`, `core/battle.test.ts`.

- [ ] Add RED expectations for both ordinary and scripted losses: correct authored respawn, unchanged quest effects/progress, and full effective HP.
- [ ] Include a leveled hero with an equipped +max-HP item, proving the expected HP uses `deriveEffectiveStats(getHeroBaseStats(saveState.player), saveState.equipment).maxHp` rather than just `startingPlayer.baseHp`.
- [ ] Replace `hp: 1` in `applyBattleDefeat` with the derived effective max and update its doc comment.
- [ ] Keep `lose-battle` quest dispatch, scripted respawn, inventory and summary behavior exactly as before.
- [ ] Run `battle.test.ts` and any existing Shrine/save tests that encode the old 1-HP expectation. Update those behavioral assertions as appropriate.

**Exit condition:** Losing to the boar king or the captain cannot leave Grik at 1 HP; destination and story beats still work.

## Task 4 — Set local Y-depth on existing battle sprites

**Owners:** `BattleScene.ts`, `scenes.test.ts`.

- [ ] Add RED renderer-level assertions for overlapping actors: hero Y below enemy Y => hero depth greater; reversed Y => reversed ordering.
- [ ] Update the Phaser test markers (`createAnimatedMarker` and overlay mocks) to support `setDepth` and inspect set values.
- [ ] Set sprite depth from Y for the hero and every enemy during creation and after movement. Ensure early-return frames (flee channel or hit-stop) do not permanently retain stale actor ordering.
- [ ] Set existing enemy HP bar and attack/impact arc depths above the actor range; test their relative depth.
- [ ] Do not add shadows, target rings, new sprite assets, new floating combat text, or a generic depth manager. `BattleScene` currently does not own those objects.

**Exit condition:** Grik is visible in front of boar enemies when lower in the arena; bars and hit flashes remain readable.

## Task 5 — Verify and finish the same PR

- [ ] Run focused tests first:

```bash
bun run test:unit -- --run src/lib/game/core/battle.test.ts src/lib/game/save/save-state.test.ts src/lib/game/phaser/scenes/scenes.test.ts
```

- [ ] Run the normal repository checks:

```bash
bun run test:unit -- --run
bun run check
bun run lint
bun run world:check:navigation
bun run build
```

- [ ] Manual UAT on a local build: win Mistfen pond toads and Silverpine bridge/corridor wolves, then immediately walk in each direction from the return point; no obstruction/soft-lock.
- [ ] Flee from boar king and stand still for at least 5 seconds; no fight restart. Move outside aggro, return, and confirm combat can start again.
- [ ] Lose an ordinary fight and the scripted captain encounter; confirm full HP at the correct respawn and no skipped story effects.
- [ ] Approach boar king and thornback boar from above and below in BattleScene; confirm sorting flips correctly and effects/health bars remain visible.
- [ ] Record tested commit and concise manual UAT results in the PR description. Mark the *same* PR ready for review only after tests and UAT pass. Update the Linear ticket when the implementation is actually delivered.

## Deliverable/acceptance checklist

- [ ] No post-battle blocked return spot in sampled authored encounters/states
- [ ] No same-pack re-engagement after 5 seconds stationary following flee
- [ ] Same pack can re-engage normally after leaving/re-entering its aggro zone
- [ ] Full effective HP after defeat, with original quest/respawn semantics
- [ ] Y-sorted battle sprites and legible existing overlays
- [ ] Focused and full checks pass; manual UAT documented
- [ ] Exactly one GitHub PR for HPA-674, no unrelated UAT changes

**Current status:** Design and implementation plan only; no runtime code or test changes have been made by this document.
