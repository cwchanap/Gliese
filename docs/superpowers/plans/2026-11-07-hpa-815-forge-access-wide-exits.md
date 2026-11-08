# HPA-815 — Implementation plan: forge lane and interior exits

**Status:** Review-reconciled **planning only**, no runtime fix or test result claimed.
**Linear:** https://linear.app/cwchanap/issue/HPA-815/the-forge-is-enterable-but-only-by-sliding-along-a-wall-through-a-one
**Design:** ../specs/2026-11-07-hpa-815-forge-access-wide-exits-design.md
**Reviews:** https://github.com/cwchanap/Gliese/pull/64#issuecomment-6718253897 and https://github.com/cwchanap/Gliese/pull/64#pullrequestreview-5817013627
**Delivery:** Continue on **this same draft PR #64** after review; one ticket → one PR.

## Ownership / current state

- PR #62 / HPA-760 already delivered forge map hint and an authored dirt connector. HPA-817's generic movement corner-slide fix is done; retain both.
- HPA-816 (Oren interaction) and HPA-818 (keyboard access) are separate tickets. Do not combine them here.
- **src/lib/game/content/maps/overworld/chunks/sundrop.ts:** one source-grid edit to lane / isolated tree.
- **src/lib/game/content/maps/overworld/world.test.ts:** existing source glyph pins, corridor walk sampling, raid route; add local three-track and reverse-direction coverage.
- **src/lib/game/content/maps/layouts/village-interiors-v2.ts:** authoritative exterior doorway rectangles; **read**, do not redesign or alter.
- **src/lib/game/content/maps/types.ts**, **src/lib/game/content/maps.ts:** optional `triggerRect` and assignments from the **eight** existing exterior layout rectangles.
- **src/lib/game/core/navigation.ts** and **navigation.test.ts:** shared pure predicate and door-slide veto using transition zones; use existing `walk()`.
- **src/lib/game/phaser/scenes/WorldScene.ts**, **scenes.test.ts:** actual transition, battle-return suppression, debug overlay, corner-slide call-site integration.
- No art/SFX, save migration, new routing engine, new helper file or changes to global collision constants.

## Task 1 — RED route checks, then minimal glyph edit

**Tests first:** Extend the **Sundrop forge connector** block in `world.test.ts`:

1. Define a few fixed **constrained lane sections** south/east of hut 2. With the current story-gated map, check that each section has **three parallel traversable 32px-spaced tracks**, using the **real composed 16px navigation grid** (12px clearance already applied), not just glyphs.
2. Preserve and revise `FORGE_CORRIDOR` tile pins and the existing sampled polyline; ensure its painted centerline and parallel tracks remain safe from other doors, especially `b`. Restrict ±32px offsets to the straight pinch section (not the sharp turn or doorway), so the test checks actual player clearance rather than inventing a too-wide turn.
3. Use existing `walk()` from **core/navigation-test-utils.ts** to confirm held-key movement along meaningful straight segments **in both directions**; preserve the existing raid-state reachability test.
4. Confirm the old one-tile squeeze fails before editing the map.

**Minimal implementation:** Remove the blocking `Y` at local Sundrop **(43,43)**; do not relocate it. Paint row 43's visible connector east toward column 48, then north via column 48 on rows 42/41 into `f`. **Erase the now-obsolete dirt on row 42, columns 43–47, back to grass**—those tiles are confirmed as `,` in the current source and would otherwise paint a redundant parallel dirt line one tile above the new intended route. Update `FORGE_CORRIDOR` glyph pins to assert new row-43 dirt, row-42 grass at columns 43–47, and the column-48 turn. Adjust *only* the smallest other local glyphs if the composed-grid test proves needed. Preserve other trees, `b`/`f` anchors, building footprints, door triggers and story overlays.

**Acceptance:** The revised path is visibly obvious, traversable and locally three tracks wide. The change must not funnel the player into villager-house-2. One source edit is a hypothesis until a passing probe and screenshot verify it. A three-track rule applies **only** to this first-quest corridor, not the world map globally.

## Task 2 — RED pure transition and corner-slide tests

Add tests to the **existing `core/navigation.test.ts`**, not a new `content/maps/transition-trigger.test.ts`.

1. **New predicate:** `isInTransitionZone(transition, p)` returns true for the existing 30px circle around `x/y`, or the player center inside an optional top-left `triggerRect`. Test an absent rect, the off-center portion of a 128px doorway, outside-edge points, and preservation of circle behavior.
2. **Real layout integration:** For each of the **eight** `VILLAGE_INTERIOR_LAYOUTS` exterior exits, run `walk()` **down** on the actual generated interior navigation grid from **collision-walkable** left, center and right positions just north of the opening. Check the final point is in the shared zone; include that narrow 64px exits behave as before. Use the real `doors.exterior` rect from the layout and its centered `exit` point. Do not assert that a point *inside a painted doorway but blocked by a wall/player-radius clearance* should be walkable.
3. **HPA-817 jamb regression:** Blacksmith `doors.exterior = (384,672,128,32)`, center `(448,688)`. Starting around `(393,660)` and moving south, confirm corner-slide can progress toward the reachable opening without a false **newly-entered unrelated door zone** veto. Continue the simulated walk to an active transition; guard against premature activation above the south wall. Contrast with the rejected width-band case whose rectangle would have started at y=658.
4. **NEW off-center-heading RED case:** For the blacksmith rect `{x:384,y:672,width:128,height:32}`, with `from=(396,670)` and southward `to=(396,674)`, a candidate corner-slide ending inside the rect must not be vetoed as unrelated. Using center `(448,688)` yields `dot=72 < cross=208` and fails; nearest-point `(396,672)` yields `dot=8 > cross=0` and passes. Assert a lateral push past that doorway is still vetoed; if `from` is already inside the same rect, handle the zero-length clamped vector without accidentally vetoing an ongoing move wholly within that doorway.
5. Keep existing `entersUnrelatedDoorZone` tests for the heading cone and “newly entered zone” behavior; adjust fixtures to the new transition-like structural type without weakening them.

**Acceptance:** These tests fail at wide off-center exits / the planned corner-zone gap before code changes, then pass after. No redundant scene matrix required.

## Task 3 — source-derived rects and core-owned shared zone predicate

1. In **src/lib/game/content/maps/types.ts**, add `MapTransition.triggerRect?: LayoutRect`, documented as **top-left** `x/y/width/height` authored geometry, *not* `MapRect` centered coordinates. A type-only import of `LayoutRect` is valid **here in content**, not in core. Do not use `toMapRect`.
2. In **src/lib/game/content/maps.ts**, add `triggerRect: <layout>.doors.exterior` to **all eight** existing interior→overworld transitions (hero-house, guild-hall, item-shop, blacksmith, shrine, houses 1–3). Their existing `x/y`, `arrival`, IDs and destinations stay unchanged; no width-specific exception list.
3. In **src/lib/game/core/navigation.ts**, define `TransitionZoneTarget extends NavigationPoint` with **inline readonly** `triggerRect?: { x: number; y: number; width: number; height: number }`. No content-layer imports or mapping adapter in core; `MapTransition` is compatible structurally. Add pure `isInTransitionZone(transition: TransitionZoneTarget, playerPoint: NavigationPoint)` using the existing **30px circular** rule OR direct `triggerRect` containment. Core may use its existing `isPointInsideRect` only after translating top-left coordinates to `{left,right,top,bottom}`, or simply compare the top-left bounds. Do not subtract player radius from the rect or expand y by 30px (that brings the HPA-817 jamb bug back). Avoid an optional per-call radius unless an existing real consumer needs one—this issue has one fixed canonical 30px radius.
4. Update **`entersUnrelatedDoorZone`** to call the shared predicate for both candidate `destination` and straight `to`, **retaining the existing heading-cone rule but changing its aim point**: for `triggerRect`, clamp the movement origin `from` to the closest point on the top-left rectangle; for point-only doors, continue aiming at `(door.x,door.y)`. Calculate the existing dot/cross heading test against that target, and **retain the “newly enters zone although straight push misses” veto**. If the origin is already inside the rectangle, clamping yields a zero vector; permit a move where `from`, `to` and `destination` remain inside the same doorway rect rather than treating zero heading as unrelated. Keep lateral pushes into other/unintended door zones vetoed. It now accepts transition-like definitions, not separately a point list and a radius. Change the matching **`WorldScene.resolvePlayerCollision`** call site.
5. Apply that same predicate to **`WorldScene.tryTransition`** and **both initialization and clearing** of `battleReturnTransitions` to keep re-entry protection in sync with actual off-center door activation.
6. In the **collision debug overlay** draw the existing circular stroke plus an extra stroke rect for `triggerRect` when present. Do not change player-facing transition markers.

**Acceptance:** The *four* consuming contexts agree: actual entry/exit, battle-return suppression, corner-slide veto and debug display. All legacy transitions without rects use the exact same circle as before; a valid off-center south push to a wide doorway is not rejected because its center is far away horizontally.

## Task 4 — minimal WorldScene wiring tests

Extend existing **`src/lib/game/phaser/scenes/scenes.test.ts`**:

- **One off-center wide exit:** start in blacksmith interior, place hero at a physically reachable off-center position within the doorway, call `WorldScene.update`; expect transition to overworld with **existing** `overworldDoorArrival('blacksmith-interior')`. Also verify no transition from an adjacent wall-side point outside both circle and rect. Pure tests already cover the other seven interiors.
- **One battle-return case:** extend the existing “waits for the player to leave and re-enter a cleared transition after battle” case, or add a small nearby targeted case, with an off-center wide exit. Confirm that returning from battle inside the rect is suppressed until fully leaving the **union zone**, then allows re-entry. Ensure neither point-circle-only clearing nor changed arrival semantics bypass this.
- The jamb-slide itself is primarily a **pure navigation test** using real interior geometry, not a separate suite of mocked scene cases.

**No** 5×3 WorldScene integration grid: the actual eight-layout / three-offset behavior is already covered by `walk()` and the shared predicate.

## Task 5 — validation and one real gameplay smoke

**Manual smoke (single path):** New Run → Mott/first quest → use visible forge connector → enter forge → leave from an off-center walkable doorway position. Confirm no accidental villager-house-2 entry or corner wedge. Capture one useful screenshot/route note and tested SHA. No manual screenshot requirement for every interior; existing raid route automation stands.

**Automated gates (actual results to be recorded after implementation):**

~~~bash
bun run test:unit -- --run src/lib/game/content/maps/overworld/world.test.ts src/lib/game/core/navigation.test.ts src/lib/game/phaser/scenes/scenes.test.ts
bun run test:unit -- --run
bun run check
bun run lint
bun run build
# Run the relevant existing field/forge Playwright test(s) if available; record their names/results.
~~~

`bun run world:check:navigation` may be run as a sanity check, but it validates the generated interior grid and **does not prove** a Sundrop path or transition logic fix; the layout is not being changed. If run, do not substitute it for the tests above.

## Completion criteria (not yet met)

- [ ] Source glyphs and composed nav tests show an honest ≥3-track *local* forge route to/from the doorstep, clear of hut 2's door, with row 42 columns 43–47 reverted to grass so there is only one painted dirt connector.
- [ ] All eight interiors' actual walkable exterior openings trigger on left/center/right; existing point/circle transitions retain old behavior.
- [ ] HPA-817 jamb-slide regression at blacksmith (around 393,660) **and off-center forward-heading example (396,670 → 396,674)** are covered, including a lateral-veto negative and zero-vector-inside-rect case, without introducing early/adjacent-wall exits.
- [ ] All four trigger consumers share consistent behavior, including `battleReturnTransitions` and debug overlay.
- [ ] Focused/full checks pass with recorded command output, and a keyboard New Run→forge→off-center-exit smoke succeeds.
- [ ] Add tested commit and evidence to this existing PR; mark ready only after implementing, and do **not** close HPA-815 for documentation alone.

## Scope guard / why this is smaller

Accepted the first PR review's six main findings, plus the follow-up review's **nearest-rectangle-point heading fix**, **core-only structural `TransitionZoneTarget` type**, and **obsolete row-42 dirt cleanup**: **no new test/helper file**, all eight door rectangles, shared core predicate, explicit corner-slide veto, reuse `walk()`, two focused scene wiring tests, one manual smoke. The highest-risk interaction is with HPA-817, not speculative new graphics. If art changes are truly necessary, create a **separate art task**; do not merge art generation into this coding issue.

Do not add a shape framework, migrate saves, change base player collision, or fold HPA-816/HPA-818 into this PR.
