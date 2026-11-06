# HPA-760 — Round 2 Human Playtest Reliability Implementation Plan

> **Implementation PR:** Continue on the same HPA-760 draft PR used for design review. One ticket = one implementation PR; no follow-up PR for substeps.

**Goal:** Make the first Sundrop quest playable by a normal keyboard user, make doors/interactions agree with what is displayed, remove the Tikka/table trap and hero/HUD overlap, correct wallet/playtime presentation, and update the renamed Mira shop E2E assertions.

**Design:** `docs/superpowers/specs/2026-11-05-hpa-760-round-2-playtest-reliability-design.md`

**Baseline:** `main` at `39a9e5b5ce460abde3e9114f3a5f9cee7022c55c` (2026-11-02). The November 4 headless forge session is evidence of frustrating wayfinding, **not** proof that the door is impossible to enter.

**Tech:** Svelte 5, Phaser, TypeScript, Bun, Vitest, Playwright, grid-map/navigation source generators, existing save slots.

**Review incorporated (Nov 5, three rounds):** Prioritize **local authored doorway and Sundrop corridor fixes**, an edge-triggered top-left `heroOccluded` fade, stale NPC hint cleanup, correct Playwright `exhaustive`/`flaky` ownership, readiness-gated wallet display, and investigating `h:mm` playtime before changing storage. Do **not** add global collision nudging or camera padding. Treat exact suggested 16px path/door coordinates as proposals to validate against paint and real navigation, not unquestioned fixes. **Third-review gap closed:** the active one-hop forge entrance is known quest guidance visible through fog, and the Area Map frames it from the home exit; the connector test pins authored path glyphs as well as safe movement, so an invisible detour cannot make a broken dirt path look green.


## Constraints and acceptance policy

- [ ] Keep **all** HPA-760 findings in **this one PR**. Do not add a new issue or split the fixes merely for code ownership.
- [ ] Start with an observed keyboard reproduction and isolate failures to the smallest existing source owner. If a complaint does not reproduce, record that explicitly; don't force a speculative physics/layout rewrite.
- [ ] Preserve map IDs, transition IDs, named anchors used by quests, NPC dialogue IDs, shop IDs, item IDs, quest rewards, save records, and active story gates.
- [ ] No new art or SFX in this implementation. If a painted door or forge sprite must change, scope generation to a separate art task; do not secretly slip image generation into coding.
- [ ] Preserve source-of-truth boundaries: Sundrop glyph grid → grid runtime; V2 interior geometry → generated navigation; `WorldScene` → game state; `FieldHud`/`AreaMapScreen` → UI; existing save slots → persistence.
- [ ] No new generalized quest router, map authoring framework, navigation engine, event bus, autosave infrastructure, legacy-save migration, or backwards-compatibility code.
- [ ] A bot-only route failure is not sufficient reason to move walls. Use real keyboard/controller evidence and focused deterministic checks before geometry changes.
- [ ] Keep PR **draft** until implementation/tests/manual acceptance are actually complete.

## Task 0 — Baseline proof and source-owned constraints

**Read:** HPA-760, both review threads, `CLAUDE.md`, `grid/layers.ts`, `village-interiors-v2.ts`, `WorldScene.ts`, and the current design.

- [ ] Use **normal New Run**, no `?startMap=`, to confirm Mott → exterior door → forge `f` → Oren. The obvious current dirt connector leads through nearby villager-house door `b`'s **30px automatic trigger**; record a short route/camera screenshot and which approach a player naturally follows.
- [ ] Note that a source-grid route *can* avoid `b` when intentionally detouring south (16px cells, 12px grid clearance). This disproves a universal forced-transition claim but **does not** make the visible path usable. The intended route should have safe trigger clearance with comfortable tolerance, not a 2–4px near-miss.
- [ ] Check actual Hero House painted front/bedroom opening geometry against `heroHouseWalls`, `doors`, `PLAYER_COLLISION_RADIUS` and generated navigation; note plausible **up to 16px** localized expansion without walking through painted doorframes.
- [ ] For NPC reports, reproduce the existing **stale “Tikka nearby”** status and current range-only selector; check ambient-only villagers and the Tikka/table wedge.
- [ ] Record top-left hero/card overlap at a common desktop and narrow viewport. The portrait card's CSS dimensions vary by responsive breakpoint.
- [ ] Verify playtime with a real save after >60 seconds, correct slot index, normal vs dev boot, clock/slot time and the current **`h:mm`** rendering.

**Gate:** This is focused evidence for existing owners, not permission for broad physics, camera, or save architecture changes.

## Task 1 — Fix the independent shop test drift (low risk)

**Owner:** `tests/e2e/game.e2e.ts`.

- [ ] Update the three stale `Mira's Item Shop` fixture/heading/dialog expectations to the **literal canonical** `Mira's Herb Hut`; preserve shop and NPC IDs, stock, buying and selling.
- [ ] Do **not** mass-replace matching text in `src/lib/game/GameShell.svelte.spec.ts`: those occurrences are caller-supplied HudState fixtures, not necessarily production naming regressions. Change a fixture only if its tested contract requires canonical naming.
- [ ] Run the **`exhaustive`** owner: `bun run test:e2e -- --project=exhaustive --grep "Item Shop painted interior"`. Run relevant `gate` shop tests separately. The painted case is not `gate`-owned.

**Gate:** The production shop label stays unchanged and the correct owning E2E passes.

## Task 2 — Fix the authored forge connector, pre-discovery hint and Area Map framing

**Existing owners:** `src/lib/game/content/maps/overworld/chunks/sundrop.ts`, `overworld/places.ts`, `content/maps/grid/layers.ts` / `overworld/world.test.ts`, `core/area-map.ts` / `core/area-map.test.ts`, `ui/AreaMapScreen.svelte`, `ui/FieldHud.svelte`.

- [ ] Fix the **visible dirt/path connector** that currently guides a player east across neighbor-house door `b` toward forge `f`. Change the minimum Sundrop source glyphs so the obvious route turns south around `b` and then east to `f`; keep existing building/door anchors and authored art identities. One 32px row shift is only a proposal: an uninterrupted line only 32px from a 30px transition trigger has almost no safety margin. Aim for a comfortable real-controller margin (e.g. ≥48px where geometry permits); verify rendered path and clearance, not arbitrary hardcoding.
- [ ] **Test source presentation, not just possible navigation:** `grid/legend.ts` makes `.` grass and `,` dirt both walkable, so `findUnreachablePoints` / generic route BFS cannot detect a reverted dirt connector. In the existing `world.test.ts`, pin a **small number of author-defined corridor glyph/turn waypoints** in `sundropChunk.terrain` (including that old misleading dirt segment is gone). Assert those form the **intended painted route**; reverting to the current old connector must make the test fail.
- [ ] Separately verify the **walk-line/segments along those selected authored points** are traversable on the actual 16px clearance grid with no irrelevant active door trigger encountered (30px activation radius plus a deliberate tolerance). No general pathfinder or “all doors in all maps” invariant. Keep `bun run map:preview -- --chunk sundrop` and real keyboard screenshots as visual truth.
- [ ] **Add an active, known one-hop entrance hint:** In `core/area-map.ts`, if the current `talk-to-npc` objective points to an NPC in a directly connected, **story-active** interior, return that transition as a quest entrance hint. Reuse `map.transitions`, `maps[toMapId]`, `applyStoryGates`, and the destination's localized area name (e.g. **Sundrop Forge**) rather than introducing quest routing or another map registry.
- [ ] **Make that hint visible before discovery:** `buildAreaMapState` currently filters every marker through `isWorldPositionRevealed`. Mark **only the active one-hop entrance hint** as known guidance (small optional marker flag such as `knownQuestEntrance`), then allow only that flagged marker to pass the fog filter. Preserve existing reveal rules for ordinary exits/landmarks, discoveries and *current-map hidden quest targets*. Do not reveal fog terrain or change save/exploration data. When the objective is inactive, completed, or story-gated away, the hint disappears.
- [ ] **Frame player + destination in the opened Area Map:** From the **fresh home exit**, player is at ~(4464,7312) and forge entrance ~(5648,7184), ~1,191px apart. The minimap's existing 768px player-local window cannot show both; **leave the minimap small and local**. Share its pure clamped viewBox helper with `AreaMapScreen`, but calculate a larger still-local Area Map view that includes **player, active known entrance marker, and readable localized label with padding**. Avoid returning to a 12,288px whole-world view. Preserve marker focus, accessible name, fog and SVG aspect ratio; ensure the actual rendered label is not clipped near the right edge.
- [ ] **Required unit coverage:** Using `questStateAt('collect-practice-spear')`, current story-gated overworld map, and only `revealCellsAroundPoint` near the home exit, assert the forge known hint exists despite an unrevealed forge cell, has localized **Sundrop Forge** label, and no other hidden ordinary marker leaks. Assert existing current-map hidden-target tests stay unchanged. Add negative cases for different/inactive/completed objectives and story-gated NPC absence.
- [ ] **Required view/render coverage:** Check the pure computed local Area Map view contains both player/home exit and full forge label at readable scale; add a focused existing Playwright/component render check for `area-map-svg` `viewBox`, labeled marker and visibly rendered text within the map frame. A marker in payload but clipped out of view does **not** pass.
- [ ] Run focused `world.test.ts`, `core/area-map.test.ts`, map preview, and manual Mott → forge → Oren → practice spear acceptance.

**Gate:** A newly exited player **already sees the labeled forge destination in the Area Map**, while unexplored terrain and unrelated markers remain hidden; the **visible authored dirt path** and physical keyboard route avoid wrong-door activation. Restoring old path glyphs or reverting fog guidance would fail the regressions.

## Task 3 — Fix only Hero House authored doorway clearance

**Source owner:** `src/lib/game/content/maps/layouts/village-interiors-v2.ts`, generated navigation source/runtime, and existing map/layout tests.

- [ ] **Do not change `resolveMovementSegment`** or introduce a global corner nudge for this issue. The shared physics code serves every map and can unexpectedly drift into unrelated door triggers. Prefer local source data.
- [ ] Adjust the Hero House **bedroom and front-door wall openings** to provide the clearance players see in the painted image. Target roughly one extra 16px navigation cell of usable clearance where required, by changing actual wall endpoints and corresponding `doors` geometry (the door rectangles alone do not change blockers).
- [ ] Verify exact fit with painted art before writing the proposed 16px change. Do not clear a currently solid-painted doorframe. If the artwork cannot support a wider walkable opening, keep the collision honest and record that an art-generation/edit task is a separate deliverable.
- [ ] Run `bun run world:generate:navigation` and `bun run world:check:navigation`, commit generated files when altered, and cover both directions plus reasonable off-center offsets in existing layout/navigation tests.
- [ ] Verify normal keyboard Hero House exit/entry and bedroom passage. Spot-check Item Shop and relevant `flaky`/painted E2E without widening other interiors without repro.

**Gate:** Clear visible doorway traversal with honest wall collision and **no global movement behavior change**.

## Task 4 — Repair current shared selection + stale hint; keep E truthful

**Owner:** `WorldScene.findNearbyNpc`, `updateNpcDialogue`, `handleInteractInput`; a tiny pure helper in `core/`.

- [ ] Reproduce “Tikka nearby” → E opens Mott: prompt and E already call the same `findNearbyNpc`, so verify a stale free-text hint from `updateNpcDialogue` before blaming two separate selectors. Check Mott/Tikka overlapping reach and orientation.
- [ ] **Require** a pure, unit-tested selection helper for only candidate ranking (generic `id`/`x`/`y`/`radius`), called by existing `findNearbyNpc`. Filter in-range; prefer facing; then distance; then stable ID. Reuse for ambient `MapAmbientNpc` proximity without building a second interaction manager.
- [ ] In `updateNpcDialogue`, refresh/clear “X nearby” when target/facing/range changes even without nearby shop, but preserve meaningful non-proximity status where appropriate and avoid full HUD publishing each frame. Ensure E and displayed hint resolve the same candidate at action time.
- [ ] On E facing an ambient-only villager, display a **single localized** “They have nothing to say” / “busy” fallback instead of “No one is nearby”, with i18n parity across `en`, `ja`, `zh-Hant`. No authored character dialogue or quest progression. Keep true empty-space fallback.
- [ ] Do not rebuild the existing shop/dialogue wiring; preserve quest progress, story-gates, and stale async dialogue cancellation. Reuse the helper for discoveries only if trivial and safe.
- [ ] Cover two-NPC facing, stale-target disappearance, deterministic ties, ambient-only, none-in-range, Mira shop reach, and quest event behavior in existing unit/scene/E2E owners.

**Gate:** The prompt, E target, and merchant proximity are consistent, and visible ambient NPCs get truthful feedback.

## Task 5 — Remove the Tikka/table wedging point

**Owner:** `src/lib/game/content/maps.ts` NPC placement, with `VILLAGE_INTERIOR_LAYOUTS['hero-house'].propCollisions` as the existing geometry owner.

- [ ] Inspect the authored Tikka position (192,432), living-table collision (x 224–336, y 400–464), and the effective player + NPC clearance. Reproduce the inward route and blocked escape direction.
- [ ] Move Tikka to a nearby meaningful walk-up spot **or** shrink/relocate only the offending table collision to match painted art. Prefer whichever avoids a cul-de-sac while preserving dialogue and story-gate semantics.
- [ ] Verify walk-in/walk-out at the previous wedge, all four directions, and the normal prologue conversation. Add focused regression checks in the existing map/navigation owner.

**Gate:** No reachable trap remains between Tikka and the table; Tikka is still talkable.

## Task 6 — Edge-triggered HUD visibility; truthful loading and playtime

**Owners:** `src/lib/game/phaser/scenes/WorldScene.ts`, **`src/lib/game/phaser/scenes/BattleScene.ts`**, `ui-bridge/events.ts`, `ui-bridge/store.ts`, `ui/FieldHud.svelte`, `GameShell.svelte`, `save/playtime.ts`, `SaveScreen.svelte`, and existing typed HudState fixtures.

- [ ] **Hero visibility:** Do **not** pad `getCenteredCameraBounds` or force scroll on a map smaller than the viewport (reveals empty dark margins). Determine the player center in game-screen coordinates; update one `HudState.heroOccluded` boolean **only at zone entry/exit**, not every frame. In `FieldHud`, add a `.hero-card-occluded` class (e.g., `opacity: 0.35`) and remove it on exit; initialize the flag as `false` in the provisional store.
- [ ] Start with a conservative top-left overlap envelope near desktop `screenX < 420 && screenY < 240` **only if it matches the actual card**, whose desktop CSS is top/left 2.125rem and `width: min(23.125rem, 100vw - 2rem)`. Check responsive (≤720px) and short-height (≤559px) layouts. Correct approximate thresholds if the card is not there; avoid DOM queries/resize listeners unless the simple envelope visibly fails.
- [ ] Do not broadcast player screen coordinates or full HUD state every frame. Leverage existing `WorldScene.publishHudState` only when the boolean changes; ensure every later field HUD publication includes the flag. **`BattleScene` also emits a full typed `HudState`**: supply `heroOccluded: false` there, initialize it as `false` in `ui-bridge/store.ts`, and update all directly constructed typed fixtures/tests so the required field compiles and cannot leak stale field occlusion through a battle.
- [ ] **Wallet:** Hide `FieldHud` numeric values or the component while `hudState.ready === false`, including Continue. For internal consistency, correct the provisional store's obsolete 30G to current new-run 20G, but **never display the provisional amount** before the first authoritative publish. Check both a fresh 20G run and a resumed save with a different wallet.
- [ ] **Playtime:** Existing `WorldScene.buildSlotRecord` samples `getPlaytimeSeconds`. Check normal vs `?startMap=` boot, slot timestamp/index, headless clock and `h:mm` formatting. If the record is correct, use explicit hours/minutes or unambiguous `h:mm:ss` in display and tests; do **not** add periodic autosaves, save schema changes or migration paths without a real missing-write repro.
- [ ] Preserve Tauri manual-save flush/failure handling and verify elapsed time is not double-counted after Continue.

**Gate:** Hero visible in top-left without camera drift, no wrong wallet flash, and an honest, unambiguous persisted slot playtime.

## Task 7 — Focused regressions + actual keyboard acceptance

**Baseline checks:**

    bun run check
    bun run lint
    bun run world:check:navigation
    bun run test:unit -- --run

**Playwright owning tests:**

    bun run test:e2e -- --project=gate
    bun run test:e2e -- --project=exhaustive --grep "Item Shop painted interior"
    bun run test:e2e -- --project=flaky --grep "Hero House painted interior preserves runtime"

- [ ] After geometry changes, run the existing relevant interior navigation/painted verification and `bun run art:validate:village-interiors` when appropriate. The full `exhaustive` + `flaky` sweep is **not newly required just to test a global movement change**, because this plan **does not change global movement**; expand targeted coverage only for concrete failures.
- [ ] Keep a lean keyboard E2E covering fresh Mott → correct forge → Oren → spear, but do not replace real manual acceptance with a route-script-only proof. **Include an Area Map assertion at the home exit:** the known forge hint and its full localized label render within the readable SVG viewBox while unrelated unrevealed markers remain hidden. The unit test must fail if that known-hint fog exception is removed; the authored-path test must fail if the former dirt connector is restored.
- [ ] Manually verify visually guided forge approach with a comfortable trigger margin; both Hero House door openings; Mott/Tikka hint/E; ambient fallback; Tikka/table escape; hero occlusion fade on desktop and narrow viewport; New Run and Continue wallets; and actual saved playtime units.
- [ ] Record tests run, exact tested SHA, short screenshot/keyboard evidence, and any art limitation in **this same PR**. Do not claim implementation or passing tests until they actually run.
- [ ] Run `bun run story:check:strict` if story-referencing content changes; localized UI fallback should not require full story authoring.

**Gate:** HPA-760 acceptance evidence is complete without general movement/camera redesign.

## Proposed reviewer checklist

| Finding | Evidence | Source owner |
| --- | --- | --- |
| Forge route wrongly enters neighbor | **Authored dirt-connector glyph pins**, safe intended walk-line (not arbitrary detour), Mott → Oren keyboard proof | Sundrop glyphs/transitions |
| Oren hint hidden before discovering forge | **Home-exit fog-only fixture**, active-known-entrance exemption, inactive/completed negatives, rendered marker **and label in Area Map viewBox** | `core/area-map.ts`, `AreaMapScreen.svelte` |
| Hero House door sweet spot | Wall/door layout clearance and painted alignment; both directions | V2 Hero House + generated navigation |
| E chooses wrong/stale NPC | Pure facing selection and stale hint regression | Existing WorldScene selector |
| Ambient ignored | One truthful localized fallback | WorldScene + i18n |
| Tikka/table wedge | Can walk in, out and interact | Authored NPC/prop |
| Portrait hides hero | Edge-triggered card fade, responsive proof, no camera drift | WorldScene HudState + FieldHud |
| 30G / Continue wrong values | Readiness-gated numeric HUD; provisional wallet corrected | GameShell / HUD store |
| 00:00 playtime ambiguity | Real saved slot, clear duration units | Existing playtime formatter |
| Mira shop test drift | Literal Herb Hut in actual `exhaustive` owner | E2E fixture/assertions |

**Review risks:** A +16px local opening can disagree with the painted doorframe; a dirt glyph shifted one tile south can still approach an unintended 30px trigger, and a generic walkability-only test will not notice if the painted path is reverted; a new objective marker may be discarded by fog or its text clipped outside a player-only Area Map viewBox; a fixed `heroOccluded` envelope can over-fade at responsive breakpoints. Validate those specific risks rather than adding generic infrastructure.

## Stop conditions

Stop when the ticket's player-facing contracts pass. **No global movement nudge** and **no camera bounds inset**; don't add pathfinding frameworks, new map-authoring systems, new persistence infrastructure, new gameplay dialogue or broad HUD redesign. Don't widen unrelated interiors without reproduction. Any new/edited image art or SFX is a **separately scoped task** (not mixed into code implementation); keep **one PR for HPA-760** and leave the PR draft until code and evidence are actually completed.

**Docs-only status:** These instructions document what to implement later in this same PR. No tests, keyboard playthrough, or gameplay fixes have been executed as part of these planning revisions.

