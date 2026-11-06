# HPA-760 — Round 2 Human Playtest Reliability Implementation Plan

> **Implementation PR:** Continue on the same HPA-760 draft PR used for design review. One ticket = one implementation PR; no follow-up PR for substeps.

**Goal:** Make the first Sundrop quest playable by a normal keyboard user, make doors/interactions agree with what is displayed, remove the Tikka/table trap and hero/HUD overlap, correct wallet/playtime presentation, and update the renamed Mira shop E2E assertions.

**Design:** `docs/superpowers/specs/2026-11-05-hpa-760-round-2-playtest-reliability-design.md`

**Baseline:** `main` at `39a9e5b5ce460abde3e9114f3a5f9cee7022c55c` (2026-11-02). The November 4 headless forge session is evidence of frustrating wayfinding, **not** proof that the door is impossible to enter.

**Tech:** Svelte 5, Phaser, TypeScript, Bun, Vitest, Playwright, grid-map/navigation source generators, existing save slots.

## Constraints and acceptance policy

- [ ] Keep **all** HPA-760 findings in **this one PR**. Do not add a new issue or split the fixes merely for code ownership.
- [ ] Start with an observed keyboard reproduction and isolate failures to the smallest existing source owner. If a complaint does not reproduce, record that explicitly; don't force a speculative physics/layout rewrite.
- [ ] Preserve map IDs, transition IDs, named anchors used by quests, NPC dialogue IDs, shop IDs, item IDs, quest rewards, save records, and active story gates.
- [ ] No new art or SFX in this implementation. If a painted door or forge sprite must change, scope generation to a separate art task; do not secretly slip image generation into coding.
- [ ] Preserve source-of-truth boundaries: Sundrop glyph grid → grid runtime; V2 interior geometry → generated navigation; `WorldScene` → game state; `FieldHud`/`AreaMapScreen` → UI; existing save slots → persistence.
- [ ] No new generalized quest router, map authoring framework, navigation engine, event bus, autosave infrastructure, legacy-save migration, or backwards-compatibility code.
- [ ] A bot-only route failure is not sufficient reason to move walls. Use real keyboard/controller evidence and focused deterministic checks before geometry changes.
- [ ] Keep PR **draft** until implementation/tests/manual acceptance are actually complete.

## Task 0 — Capture the pre-fix behavior and choose the smallest fix

**Read:** Linear HPA-760, `CLAUDE.md`, `.agents/skills/gliese-world-expansion/SKILL.md`, existing tests and the design above.

- [ ] Run `bun run dev`, a genuinely fresh **New Run**, and keyboard-only steps: speak to Old Mott → leave Hero House → follow the forge objective → attempt its south-facing door → enter and speak to Oren. Screenshot the village/forge door and note which steps are reliable vs. frustrating.
- [ ] In Hero House: test front exit and bedroom door at center and reasonable off-center approaches; stand near Mott/Tikka while facing each; attempt E next to a decorative villager; walk into/out of Tikka's table gap; move Grik under the top-left hero card.
- [ ] Create a save after several minutes of play; quit/reopen load picker; note whether “00:00” is a true metadata bug, an early autosave whose timestamp predates the play session, or a manual-save formatting issue.
- [ ] Record viewport and actual player/door positions when available. Compare collision debug overlay (`WorldScene` render option) to visible art before adjusting geometry.
- [ ] Write a short before/after evidence note in the PR description or the existing review/report folder; avoid a large second acceptance spreadsheet.

**Gate:** Do not claim a confirmed forge soft-lock if the normal keyboard route works.

## Task 1 — Fix the independent shop test drift (low risk)

**Change:** `tests/e2e/game.e2e.ts`.

- [ ] Replace all stale **“Mira's Item Shop”** expectations: current test fixture (~line 1971), heading (~line 12025), and dialog name (~line 12119). Confirm there are no additional stale references.
- [ ] Keep an explicit expected player-facing **“Mira's Herb Hut”** string. Do not change production shop names, inventory/buy/sell, or story dialogue solely to make tests green.
- [ ] Run the focused Mira shop E2E in the `gate` Playwright project. Check the existing tests still exercise opening, buying, selling, and closing.

**Gate:** Shop UI matches the existing build and its current displayed name.

## Task 2 — Make the forge the clear and reachable first destination

**Read/change only if required:**
- `src/lib/game/content/maps/overworld/chunks/sundrop.ts` — forge footprint (`F`), forge door (`f`), neighboring hut/fence/trees/paths;
- `src/lib/game/content/maps/overworld/places.ts` — existing door transition and arrival;
- `src/lib/game/content/maps/grid/layers.ts` and `src/lib/game/core/navigation.ts` — diagnose, don't rewrite globally;
- `src/lib/game/core/area-map.ts` and `src/lib/game/ui/AreaMapScreen.svelte` — destination marker and readable local map.

- [ ] Inspect/verify street-to-door walkability using the **existing** grid mask, the player radius, the transition trigger, and the actual keyboard path. If blocked or visually misleading, edit the fewest Sundrop grid cells around the forge/neighbor junction and keep the door on the painted south face.
- [ ] Make the active `collect-practice-spear` objective point to the overworld-to-blacksmith entrance: derive a **one-hop** target from the active NPC objective and existing interior/transition data. Reuse existing map-marker structures, not a new route data model.
- [ ] Mark the current objective entrance distinctly in the minimap/area map and show its useful label (e.g., “Forge”). Avoid three identical gold rings that require blind trial-and-error.
- [ ] Improve the overworld area map default framing so the revealed **local village** and its doors are readable; retain a simple whole-world overview if necessary, without a general pan/zoom framework. Preserve focus and accessible marker labels.
- [ ] Add the smallest deterministic reachability/marker assertions to `src/lib/game/content/maps/overworld/world.test.ts` and/or `src/lib/game/core/area-map.test.ts`, reusing existing map fixtures. Avoid a duplicate hand-maintained forge coordinate list.
- [ ] Use `bun run map:preview -- --chunk sundrop` when grid cells move, then manually walk from home to forge.

**Gate:** New Run → Mott → village forge → Oren → practice spear works by keyboard, with a legible destination and no accidental neighboring-house transition.

## Task 3 — Align the first two painted doors with movement

**Geometry owner:** `src/lib/game/content/maps/layouts/village-interiors-v2.ts`.  
**Generation owner:** `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts` plus `tools/generate-navigation-runtime.ts`.

- [ ] Compare the painted Hero House exterior/bedroom openings against `heroHouseWalls`, `doors`, `heroHouseMap.transitions`, generated navigation cell size/clearance, and `PLAYER_COLLISION_RADIUS`.
- [ ] Change the **source layout** minimally so center and reasonable visible off-center approaches work from **both sides**. Don't reduce the global player radius or let the player cross visibly solid wall art.
- [ ] Regenerate navigation via `bun run world:generate:navigation` and commit the changed generated runtime file(s), if any; run `bun run world:check:navigation`.
- [ ] Update/extend the nearest authored layout/navigation tests rather than building another all-interior regression matrix.
- [ ] Verify bedroom, exterior exit/re-entry, and representative unaffected interiors through existing acceptance journeys.

**Gate:** Players don't need trial-and-error pixel alignment to pass visibly open doorways; wall collision remains honest.

## Task 4 — Make E, NPC prompt, and ambient response agree

**Owner:** `src/lib/game/phaser/scenes/WorldScene.ts`, with a tiny pure selection helper only if it substantially improves unit testing.

- [ ] Reproduce Mott vs. Tikka selection with the current `findNearbyNpc`: it currently chooses nearest eligible NPC, regardless of facing. Define one deterministic selection contract: in-range, prefer in-facing-direction, then proximity, then stable ID.
- [ ] Use the **same result** for `updateNpcDialogue`'s “X nearby” hint and `handleInteractInput` / `interactWithNearbyNpc`. Recompute on change of facing/target and clear a stale nearby message when the candidate disappears.
- [ ] Retain shop reachability, story-gated NPC membership, transient-fallback handling, and dialogue request sequencing.
- [ ] For noninteractable `ambientNpcs` (on overworld and in interior maps), provide a short localized no-dialogue / busy response if the player faces a visible nearby villager. Keep “No one is nearby” for genuinely empty spaces.
- [ ] Cover targeting both ways (Mott/Tikka), facing a decoration-only villager, out-of-range fallback, quest progress, and Mira shop proximity with focused scene/unit/E2E tests. If new i18n keys are needed, update English/Japanese/Traditional Chinese parity together.

**Gate:** Prompt and E refer to the same eligible person; ambient villagers do not appear invisible to interaction messaging.

## Task 5 — Remove the Tikka/table wedging point

**Owner:** `src/lib/game/content/maps.ts` NPC placement, with `VILLAGE_INTERIOR_LAYOUTS['hero-house'].propCollisions` as the existing geometry owner.

- [ ] Inspect the authored Tikka position (192,432), living-table collision (x 224–336, y 400–464), and the effective player + NPC clearance. Reproduce the inward route and blocked escape direction.
- [ ] Move Tikka to a nearby meaningful walk-up spot **or** shrink/relocate only the offending table collision to match painted art. Prefer whichever avoids a cul-de-sac while preserving dialogue and story-gate semantics.
- [ ] Verify walk-in/walk-out at the previous wedge, all four directions, and the normal prologue conversation. Add focused regression checks in the existing map/navigation owner.

**Gate:** No reachable trap remains between Tikka and the table; Tikka is still talkable.

## Task 6 — Correct HUD overlap and save metadata

**Read/change:**
- `src/lib/game/ui/FieldHud.svelte`, `src/lib/game/phaser/scenes/WorldScene.ts`, `src/lib/game/ui-bridge/events.ts` / `store.ts`;
- `src/lib/game/save/save-state.ts` (new-wallet source), `playtime.ts`, `slots.ts`, and `ui/SaveScreen.svelte`.

- [ ] Hero overlay: determine actual hero screen coordinates from the active camera; make the top-left hero card yield when it obscures the sprite. Prefer a boolean transition with an opacity class; no per-frame full HUD broadcast and no unrelated CSS redesign. Test common desktop and narrow viewports.
- [ ] Wallet: replace hardcoded loading `coins: 30` with authoritative new-run `wallet.coins` (20G today); assert initial and ready HUD values agree. Keep the loading screen honest even before Phaser publishes.
- [ ] Playtime: confirm when `resetPlaytime` is called and when `buildSlotRecord` samples the value. If the slot stays at 00:00 because no later autosave occurred, add a **bounded** checkpoint at sensible intervals or a lifecycle save flush using the existing `writeAutosave` path; don't write every frame or invent new storage. Continue to display persisted slot duration, not fake “live” time for a slot that was never saved.
- [ ] Unit-test elapsed time and resume/reset semantics with a controllable clock. E2E test a run of >2 minutes (time controlled when practical), an actual persisted save, and load-picker display after reload. Exercise both autosave and manual slot paths without changing schema.
- [ ] Preserve existing Tauri save flush/failure logic; don't introduce a second save-state owner.

**Gate:** Hero visible behind top-left HUD, first loading gold 20G, and saved slot playtime accurately reflects real elapsed saved duration.

## Task 7 — Finish targeted regression and human acceptance

**Run focused commands first:**

    bun run check
    bun run lint
    bun run world:check:navigation
    bun run test:unit -- --run
    bun run test:e2e -- --project=gate --grep "Mira|Shop|Forge|HPA-760"

Also run the current relevant existing interior tests and `bun run art:validate:village-interiors` if interior layout/painted bounds changed. Run `bun run story:check:strict` only if story references/content changed; this ticket should not need new NPC prose. Record exact tested commit and commands in the PR.

- [ ] Add/reuse one **player-facing** Playwright keyboard journey covering fresh start → Mott → exterior → forge → Oren → spear; don't create a giant parallel route-walking harness. Keep route helper flakiness distinct from actual gameplay regression.
- [ ] Validate both Hero House doors; Mott/Tikka target selection; ambient villager messaging; living-room escape; hero visibility; gold; save slot playtime; current Mira shop name.
- [ ] Exercise already-supported keyboard + gamepad focus for any area-map UI changes.
- [ ] Capture final comparison screenshots or a short video of forge approach, door passability, and hero/HUD overlap.
- [ ] Update the existing PR description with outcomes, **manual** evidence, test commands/results, deviations, and remaining risks. Keep it draft until all acceptance gates pass.

## Proposed reviewer checklist

| Finding | Proof required | Primary owner |
| --- | --- | --- |
| Forge impossible/hard to enter | Actual New Run keyboard path to Oren; readable destination | Sundrop grid + entrance / area map |
| Narrow front and bedroom doors | Cross both ways from realistic offsets | V2 Hero House layout + generated navigation |
| E picks Mott vs. Tikka | Prompt and dialog match facing | `WorldScene` target resolver |
| No one nearby beside villagers | Ambient-specific truthful fallback | `WorldScene` / i18n |
| Wedged by Tikka and furniture | Walk into previous location and exit | NPC/prop authored geometry |
| Portrait hides hero | Hero remains visible at top-left screen position | `FieldHud` / minimal HUD signal |
| 30G vs 20G | Initial placeholder and new wallet equal | HUD store / save source |
| 00:00 after minutes | Persist and re-open elapsed slot time | Playtime + existing slot writer |
| Old Mira name in tests | Existing shop tests pass on canonical visible name | `tests/e2e/game.e2e.ts` |

## Stop conditions

Stop scope growth once the above player contracts pass. Do **not** add a general mini-map pathfinder, NPC-dialogue authoring pass, world art rebake beyond changed source requirements, save-service rewrite, full UI redesign, or backwards-compatibility work. If art itself is the blocker, log it as a separately scoped asset-generation task instead of mixing it with implementation.

**Planning-only PR note:** Creating these documents does not run unit tests, Playwright, or manual game acceptance; those belong to the subsequent implementation work within this same draft PR.
