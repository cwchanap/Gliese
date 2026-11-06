# HPA-760 — Round 2 Human Playtest Reliability Implementation Plan

> **Implementation PR:** Continue on the same HPA-760 draft PR used for design review. One ticket = one implementation PR; no follow-up PR for substeps.

**Goal:** Make the first Sundrop quest playable by a normal keyboard user, make doors/interactions agree with what is displayed, remove the Tikka/table trap and hero/HUD overlap, correct wallet/playtime presentation, and update the renamed Mira shop E2E assertions.

**Design:** `docs/superpowers/specs/2026-11-05-hpa-760-round-2-playtest-reliability-design.md`

**Baseline:** `main` at `39a9e5b5ce460abde3e9114f3a5f9cee7022c55c` (2026-11-02). The November 4 headless forge session is evidence of frustrating wayfinding, **not** proof that the door is impossible to enter.

**Tech:** Svelte 5, Phaser, TypeScript, Bun, Vitest, Playwright, grid-map/navigation source generators, existing save slots.

**Review incorporated (Nov 5):** This plan now prioritizes trigger-aware forge navigation, an optional *tested* global corner-nudge before per-door geometry edits, explicit cleanup of stale NPC hints, correct Playwright `exhaustive`/`flaky` ownership, gating provisional HUD values on `ready`, and diagnosing `h:mm` playtime before touching persistence. The global movement/camera alternatives are **not pre-approved without behavior/regression proof**.


## Constraints and acceptance policy

- [ ] Keep **all** HPA-760 findings in **this one PR**. Do not add a new issue or split the fixes merely for code ownership.
- [ ] Start with an observed keyboard reproduction and isolate failures to the smallest existing source owner. If a complaint does not reproduce, record that explicitly; don't force a speculative physics/layout rewrite.
- [ ] Preserve map IDs, transition IDs, named anchors used by quests, NPC dialogue IDs, shop IDs, item IDs, quest rewards, save records, and active story gates.
- [ ] No new art or SFX in this implementation. If a painted door or forge sprite must change, scope generation to a separate art task; do not secretly slip image generation into coding.
- [ ] Preserve source-of-truth boundaries: Sundrop glyph grid → grid runtime; V2 interior geometry → generated navigation; `WorldScene` → game state; `FieldHud`/`AreaMapScreen` → UI; existing save slots → persistence.
- [ ] No new generalized quest router, map authoring framework, navigation engine, event bus, autosave infrastructure, legacy-save migration, or backwards-compatibility code.
- [ ] A bot-only route failure is not sufficient reason to move walls. Use real keyboard/controller evidence and focused deterministic checks before geometry changes.
- [ ] Keep PR **draft** until implementation/tests/manual acceptance are actually complete.

## Task 0 — Short, targeted baseline proof (not another 45-minute exploration)

**Read:** HPA-760, current code owners, `core/navigation.ts`, `grid/layers.ts`, `WorldScene`, the approved design spec and existing Playwright classification.

- [ ] On a clean **normal New Run** (no `?startMap=`), use keyboard Mott → home exit → village → `sundrop-forge-door` → Oren. The forge (`f`) is close to neighbor door (`b`); note whether its **automatic transition radius** forces the player into the neighbor or whether a different readable path already works.
- [ ] Confirm Hero House front/bedroom “sweet spot” on current 16px clearance-eroded navigation cells. Record which offset/axis fails; the axis-separated movement resolver is a known suspect.
- [ ] Position player near both Tikka/Mott; explicitly check whether a **stale “Tikka nearby” status** remains after the nearest eligible NPC changes, and whether E selects the same candidate at that instant. Check ambient-only villages.
- [ ] Try the living-table wedge; record camera/card overlap in a small interior at common viewport sizes.
- [ ] Reproduce the save-slot playtime report: inspect direct/dev boot vs normal New Run, actual slot index and last save time, `getPlaytimeSeconds`, the `h:mm` formatter, and headless clock. Under 60s legitimately renders `00:00`; 4 minutes renders `00:04`, so test more than a minute.
- [ ] Document before/after in the same PR using short notes/screenshots; preserve the original playtest friction even if it isn't a formal soft-lock.

**Gate:** Reproduction classifies root cause; it does not authorize a global code change without safety tests.

## Task 1 — Fix the independent shop test drift (low risk)

**Owner:** `tests/e2e/game.e2e.ts`.

- [ ] Update the three stale `Mira's Item Shop` fixture/heading/dialog expectations to the **literal canonical** `Mira's Herb Hut`; preserve shop and NPC IDs, stock, buying and selling.
- [ ] Do **not** mass-replace matching text in `src/lib/game/GameShell.svelte.spec.ts`: those occurrences are caller-supplied HudState fixtures, not necessarily production naming regressions. Change a fixture only if its tested contract requires canonical naming.
- [ ] Run the **`exhaustive`** owner: `bun run test:e2e -- --project=exhaustive --grep "Item Shop painted interior"`. Run relevant `gate` shop tests separately. The painted case is not `gate`-owned.

**Gate:** The production shop label stays unchanged and the correct owning E2E passes.

## Task 2 — Solve the forge route and destination marker (minimal sources)

**Inspect:** `src/lib/game/content/maps/overworld/chunks/sundrop.ts` (`f` forge, `b` neighbor house, racks `X`), `overworld/places.ts`, `grid/layers.ts`, `core/navigation.ts`, `core/area-map.ts`, `ui/AreaMapScreen.svelte` and `ui/FieldHud.svelte`.

- [ ] Add a **trigger-aware** route regression: a player-radius-clear route to the forge `f` must not enter another *active unrelated* transition's radius (30px for the current rules). The existing `findUnreachablePoints` reaches anchors without considering door activation. Add a small optional avoided-point predicate/radius only if it simplifies the current grid test; otherwise keep the check local to `world.test.ts`.
- [ ] Scope any all-door invariant to currently relevant Sundrop entrances and story state. Do not require that **all future door anchors** can be reached without crossing *any* other door trigger; this could reject intentional transition chains. Also test actual arrival/door trigger semantics, not merely walkable center cells.
- [ ] Check for a route around the neighbor door before touching the chunk. If the approach is still blocked or unreasonably confusing, move the **fewest authored Sundrop glyphs** around the forge/hut/trees/racks while keeping drawn door faces aligned; preview via `bun run map:preview -- --chunk sundrop`.
- [ ] In `getObjectiveTargets`/`buildMainQuestMarkers`, if a `talk-to-npc` objective has no eligible target on the current map, check directly connected `map.transitions` to a gated target NPC in `maps[transition.toMapId]` (using `applyStoryGates` and current quest progress). Return the one-hop entrance marker. No generic route graph.
- [ ] Share a tiny pure clamped local viewBox helper from `core/area-map.ts` between the existing `FieldHud` minimap and `AreaMapScreen`, using suitable spans. Area map door markers already have labels; make them readable at local scale and keep focus/ARIA. Emphasize the current forge entrance in minimap (instead of undifferentiated gold rings).
- [ ] Unit tests: current destination Oren yields highlighted forge entrance; completed/other objective does not; local viewport stays in bounds; relevant Sundrop route avoids unrelated door activation.
- [ ] Manually confirm Mott → forge → Oren → practice spear.

**Gate:** Reachable *and discoverable* forge; no accidental neighbor interior while using intended approach.

## Task 3 — Prove or reject a shared corner-nudge for narrow doors

**Primary owner:** `src/lib/game/core/navigation.ts` and `src/lib/game/core/navigation.test.ts`. **Fallback authored owner:** `VILLAGE_INTERIOR_LAYOUTS['hero-house']`.

- [ ] Reproduce the movement failure in Hero House's exterior/bedroom door (the E2E already describes two-cell, 16px clearance-eroded lanes). Prefer a shared fix over hand widening every 64px opening.
- [ ] Prototype the smallest bounded **cardinal-only** correction inside `resolveMovementSegment`: when requested forward movement is blocked, probe up to ~16–20px sideways on either side and move at most the normal frame step **only if both the lateral and forward swept segments stay valid**. Do not silently teleport toward a door, nudge while input is diagonal/zero, or bypass a solid wall/corner. A nudge that would trigger the wrong nearby door is a failed candidate.
- [ ] Test correct center/off-center crossing, tight corners, dead ends, obstacles, NPC/prop collisions, diagonal input, no input, and no movement into blocked cells, **before accepting a global resolver change**.
- [ ] Re-run relevant `gate`, `exhaustive` and `flaky` route-walking tests after a global movement change; compare any flaky helper failure against manual keyboard behavior.
- [ ] Only if visible door bands still fail after a collision-safe nudge (or the nudge is unsafe), make the smallest Hero House source `walls`/`doors`/exit correction in `village-interiors-v2.ts` and regenerate `bun run world:generate:navigation` and `bun run world:check:navigation`.
- [ ] Confirm exterior and bedroom crossings both ways from realistic offsets, plus existing Item Shop and villager house door interactions. Preserve map/transition IDs.

**Gate:** Door passages no longer require invisible precision; no ghost-wall crossing or regressions in the shared movement system.

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

## Task 6 — Fix provisional HUD, investigate playtime, and protect hero visibility

**Owners:** `GameShell.svelte`/`FieldHud.svelte`, `WorldScene.getCenteredCameraBounds`, `ui-bridge/store.ts`, `save/playtime.ts`, `SaveScreen.svelte`, existing save slot writer.

- [ ] **Loading gold:** `GameShell` currently renders `FieldHud` when not in battle/dialogue even while `$hudState.ready` is false. Gate numerical field content or the component on `ready`; if the whole component is hidden, keep an honest loading label. Do **not** simply replace hardcoded `coins: 30` with `20`: Continue could hold 150G, and the placeholder would still lie. Verify both New Run and Continue, with no initial coin flash.
- [ ] **Portrait:** Test a *minimal* top-left camera bounds inset using real small-room screenshots and viewport sizes. The current bounds center small maps and do not add padding for larger-than-viewport rooms; a large inset can reveal blank `#1a1f2b` margins. Reject that option if it makes gameplay less legible; instead use a small card fade/yield on actual overlap with clearly owned player screen coordinates and measured responsive DOM card bounds. No per-frame full HUD publish.
- [ ] **Playtime:** `getPlaytimeSeconds` is already sampled in `buildSlotRecord`, with multiple normal autosave triggers. Inspect `resetPlaytime`, actual slot writes, dev `?startMap=` save suppression, slot age and headless clock. The formatter is **`h:mm`**, so `00:04` is 4 minutes and `00:00` means under a minute or unsaved time. Add explicit hour/minute units if the stored data is correct (update formatter tests and relevant i18n/UX copy). Only fix a true missing save path with a minimal existing lifecycle write; **no timer-based periodic autosave unless a reproducible normal-play case demands it**, no schema migration.
- [ ] Verify newly written/resumed **manual and autosave** slot durations after several minutes, that no time is double counted, and existing Tauri flush/failure guarantees stay intact.

**Gate:** No false loading wallet for New Run/Continue, hero visible in small rooms, and persisted slot elapsed time is accurate and unambiguous.

## Task 7 — Run the actual owning test projects and final manual acceptance

**Focused build and static checks:**

    bun run check
    bun run lint
    bun run world:check:navigation
    bun run test:unit -- --run

**Playwright ownership (the test command rebuilds before each Playwright invocation):**

    bun run test:e2e -- --project=gate
    bun run test:e2e -- --project=exhaustive --grep "Item Shop painted interior"
    bun run test:e2e -- --project=flaky --grep "Hero House painted interior preserves runtime"

- [ ] Run the **full** `exhaustive` and `flaky` projects after any global movement resolver change; these are not optional just because `gate` passed. Distinguish route-helper flakiness from gameplay regressions using the keyboard proof, and record both outcomes.
- [ ] Add/reuse one lean keyboard Playwright journey New Run → Mott → enter forge → Oren → spear without another giant pathfinding harness.
- [ ] Manually verify both Hero House openings, Mott/Tikka hint and E, ambient feedback, Tikka/table escape, hero visibility, correct startup/Continue wallet, genuinely persisted slot playtime, and current Mira label/shop flows.
- [ ] Run `bun run map:preview -- --chunk sundrop` for grid edits, `bun run world:generate:navigation` / `bun run world:check:navigation` for V2 geometry edits, and `bun run art:validate:village-interiors` if interior geometry/asset bounds change.
- [ ] Run `bun run story:check:strict` only if story references/content change; one localized UI fallback need not invent story prose. Preserve the existing story gate contract.
- [ ] Update this *same* PR with tested commit SHA, exact command results, screenshot evidence, any rejected movement/camera hypotheses, and residual risks; leave it draft until implementation completes.

**Gate:** All player-facing cases meet the HPA-760 issue, with correct test-project ownership and no unverified claims.

## Proposed reviewer checklist

| Finding | Evidence | Primary owner |
| --- | --- | --- |
| Forge route + accidental neighbor entry | Trigger-avoiding path plus real Mott → Oren journey | Sundrop grid / transitions |
| Door sweet spot | Realistic offsets, no clipping; regression across other interiors | Core movement resolver, V2 layout fallback |
| E targets wrong NPC | Stale-hint cleared and shared pure facing selection | WorldScene + tiny `core/` helper |
| Ambient villagers ignored | One truthful localized fallback | WorldScene / i18n |
| Tikka/table wedge | Walk in and safely walk out | Authored NPC/prop geometry |
| Portrait occlusion | Hero still visible with no huge blank camera border | Camera bounds trial / FieldHud fallback |
| 30G placeholder | No stale numeric HUD for New Run or Continue | GameShell `ready` |
| 00:00 playtime | Real saved record and explicit `h:mm` semantics | Playtime / SaveScreen; persistence only if broken |
| Mira name drift | Literal Herb Hut assertion in actual exhaustive owner | E2E fixture/assertions |

**Risks:** Global movement nudging affects all route-walking tests and can inadvertently activate nearby doors; camera insets can reveal blank room margins; unconditional all-door avoidance tests can falsely reject intended transitions. Treat each as a **testable candidate** rather than guaranteed fix.

## Stop conditions

Stop scope growth once the above player contracts pass. Do **not** add a general mini-map pathfinder, NPC-dialogue authoring pass, world art rebake beyond changed source requirements, save-service rewrite, full UI redesign, or backwards-compatibility work. If art itself is the blocker, log it as a separately scoped asset-generation task instead of mixing it with implementation.

**Planning-only PR note:** Creating these documents does not run unit tests, Playwright, or manual game acceptance; those belong to the subsequent implementation work within this same draft PR.
