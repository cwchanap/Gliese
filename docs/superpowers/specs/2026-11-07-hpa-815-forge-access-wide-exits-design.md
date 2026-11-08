# HPA-815 — Forge approach and interior exits (design, review-reconciled)

**Status:** Design proposal only; runtime implementation, tests, and manual UAT remain pending.
**Issue:** https://linear.app/cwchanap/issue/HPA-815/the-forge-is-enterable-but-only-by-sliding-along-a-wall-through-a-one
**PR:** https://github.com/cwchanap/Gliese/pull/64
**Baseline:** Gliese main after merged PR #62 (HPA-760); reconciled against the November 7/8 PR #64 design review (https://github.com/cwchanap/Gliese/pull/64#issuecomment-6718253897).

## What remains broken

Round-3 headless playtesting found that Grik could reach Oren's forge only by locating a narrow lane, and that he needed to align precisely with some interior exits. This establishes **significant first-quest friction, not a proven soft-lock**. HPA-760 / PR #62 already supplied the Area Map forge hint and rerouted an obviously misleading straight dirt connector. HPA-817 separately fixed an open-grass collision slide.

Two HPA-815 defects remain:

1. **Authored approach:** In **src/lib/game/content/maps/overworld/chunks/sundrop.ts**, the blocking tree \`Y\` at local tile (43, 43), just south of neighbor hut 2, pinches the route. The existing test in **world.test.ts** asserts one safe centerline but not three traversable side-by-side tracks. The neighboring hut door \`b\` must not activate while following the painted approach to forge door \`f\`.
2. **Wide interior exits:** **WorldScene.tryTransition** currently uses a 30px circle around each exit point. The blacksmith, shrine and villager houses 1–3 have 128×32 authored doorway openings, but an off-center player can reach the southern boundary without triggering exit.

**Crucial review discovery:** The circle is used not only by \`tryTransition\` and \`battleReturnTransitions\`, but also by the **HPA-817 corner-slide veto** (\`entersUnrelatedDoorZone\`) and the **debug overlay**. All four must share the new trigger semantics. The first proposal's \`|dy| ≤ 30\` wide horizontal band reached above the doorway wall; at the blacksmith, it would classify a slide from (393, 660) into the jamb as a newly entered door zone, recreating the wedge. That band design is **rejected**.

## Goals and invariants

- Clear, keyboard-traversable route into and out of the **first-quest forge**; keep known forge map hint, quest/story IDs and the same exterior/interior anchors.
- At the constrained forge connector, maintain a **local** three-adjacent-track width at 32px tile spacing under the **composed 16px navigation grid** and 12px clearance. This is an HPA-815 acceptance criterion, **not** a new global rule. Preserve the existing world-wide two-tile minimum.
- All **eight** currently authored village interior exterior exits work over their physically traversable doorway openings without widening the collision aperture or altering arrivals.
- Any 30px point transition remains valid as before: circle behavior is retained, not replaced.
- A corner slide must not accidentally enter an unrelated door zone; a player sliding along a door jamb toward the correct doorway must remain able to enter/exit.
- No new image art, audio, generalized movement/navigation system, save schema, or story changes. Keep HPA-816 and HPA-818 separate.

## Decision A — minimal source-grid edit in Sundrop

Try **deleting**, not relocating, the lone obstructing \`Y\` at local (43, 43). Shift the visible dirt path's route on row 43 east toward col 48, then north along the existing dirt on (48, 42) and (48, 41) to \`f\`; preserve \`b\`, \`f\`, hut footprints, other vegetation, raid/story overlays, and all stable IDs.

This is a **hypothesis requiring a real collision probe**: removing one glyph may be sufficient, but it is not yet demonstrated. Keep changes to the minimum source glyphs that pass the route test. Do not move the same tree elsewhere without measuring the new collision, or solve a local map problem by changing \`PLAYER_COLLISION_RADIUS\`, \`resolveMovementSegment\`, global lane widths, transitions or adding pathfinding.

Extend **src/lib/game/content/maps/overworld/world.test.ts**:

- Pin the intended \`FORGE_CORRIDOR\` glyphs, replacing its previous path waypoints with the visible revised route.
- Sample the existing route's polylines plus **±32px perpendicular tracks where the three-track width matters**. Check all tracks in the *composed* nav grid, not just the text glyphs, and check clearance against every unrelated door (especially \`b\`).
- Use existing \`walk()\` (same movement resolver) along straight route segments and in the reverse direction. Do not force ±32px tracks through sharp turn segments or across doorframes; define meaningful constrained sections.
- Keep the existing raid-state route test and HPA-817 wedge regression; a one-tile pinch and the misleading straight connector should fail the new tests.

Use the existing tile/glyph renderer. A map preview and a brief in-game smoke walk check whether the new route *looks* as usable as its collisions. If entirely new or replacement artwork proves necessary, split it into a separate **art-generation** task rather than expanding this coding ticket.

## Decision B — circular trigger OR authored exterior door rectangle

Use **\`MapTransition.triggerRect?: LayoutRect\`**, where \`LayoutRect\` is **top-left** \`{ x, y, width, height }\` as already authored by \`VILLAGE_INTERIOR_LAYOUTS[mapId].doors.exterior\`. It is **not** a centered \`MapRect\`; do not pass through \`toMapRect\` (which would offset x/y by half a width/height).

In **src/lib/game/content/maps.ts**, add \`triggerRect: <layout>.doors.exterior\` to **each of the eight** existing village interior exit transitions:

- Hero House
- Guild Hall
- Item Shop
- Blacksmith
- Villager House 1
- Villager House 2
- Villager House 3
- Shrine of Aurora

This avoids a five-door exception list that would be forgotten for future interiors. The original 64px door openings' collision-reachable area is already inside the 30px circle; these should experience no behavioral change, as verified in tests.

Implement a small pure **\`isInTransitionZone(transition, playerPoint)\`** predicate in existing **src/lib/game/core/navigation.ts**. Its semantics are:

1. **Existing circle:** distance from \`transition.x/y\` to player ≤ \`MAP_TRANSITION_TRIGGER_RADIUS\` (currently 30px).
2. **Optional authored rect:** player center is within \`triggerRect\` (top-left x/y, width/height); compare directly, no extra 12px expansion and no synthetic vertical band.
3. **Union:** trigger if either condition holds; when \`triggerRect\` is absent, behavior is precisely the old circle.

Use a **small structural type** accepted by the core predicate (center + optional rect) so core navigation does not depend on the content layer or import concrete \`MapTransition\` at runtime. Keep the content contract typed by \`LayoutRect\` (type-only import acceptable). Existing point-only tests/fixtures remain straightforward. The circle union deliberately preserves edge behavior that already existed; *newly covered off-center area* must be inside the authored opening, not above its wall.

Wire the shared predicate into **all four** existing call sites:

- \`WorldScene.tryTransition\` for actual map changes.
- \`WorldScene\` initialization and clearing of the \`battleReturnTransitions\` set (no immediate retrigger on a battle return).
- \`entersUnrelatedDoorZone\` / \`WorldScene.resolvePlayerCollision\` slide veto. It must accept transition definitions rather than a bare point list + independently computed radius; retain its existing forward-heading and *newly entered zone* rules, applying one shared zone predicate.
- Collision debug overlay. Draw the existing circle plus \`triggerRect\` when present, so debug visualization matches active behavior.

Keep the rest of \`tryTransition\` semantics intact (\`requiresClear\`, save building, arrival, story gates, transition markers). Do **not** broaden \`WorldScene\` geometry, add a new content/maps helper file, or create a configurable trigger-shape framework.

### High-risk geometry test: blacksmith jamb slide

The review gives a worked regression: at the blacksmith exit, \`triggerRect = { x: 384, y: 672, width: 128, height: 32 }\` and center \`(448, 688)\`. With the rejected ±30px vertical band, a southward push from \`(393, 660)\` could slide to about \`(397–409, 664)\`, enter the band while the straight target remains outside, and be vetoed.

With **circle OR actual rect**, those \`y=664\` destinations are outside the rect; the unrelated-door veto must not newly block the slide. Add a regression using actual collision and \`walk()\` from this jamb area, then continue the walk into the doorway until the transition becomes active. Verify the player does not trigger early while running along the wall; the pre-existing circular activation remains unchanged.

## Lean acceptance and validation

1. **Authored route tests:** source glyph pins, composed three-track corridor, both-direction \`walk()\` on straight sections, no unrelated door trigger, existing raid-state route.
2. **Pure trigger tests in existing \`core/navigation.test.ts\`:** circle fallback, rect-only off-center reach, bounds outside rect/door, original 64px exit, slide-veto behavior. For each of the eight interiors, start at left/center/right **collision-reachable** x positions near the exit, \`walk()\` downward on the real nav grid, then assert the resulting point is in the shared trigger zone. Reuse existing test helpers instead of inventing an E2E harness.
3. **Scene wiring:** one off-center actual exit through \`WorldScene.update\` with correct overworld arrival, plus one representative wide-door \`battleReturnTransitions\` suppression case added near the existing scene test. No 3×5 scene matrix.
4. **Explicit jamb-slide regression:** \`(393, 660)\` pushing south must be able to slide toward the blacksmith doorway rather than be blocked by the HPA-817 veto.
5. **One manual smoke walk:** New Run → first-quest forge → exit off-center. Capture useful evidence and note tested SHA; no mandatory full raid-state manual replay or screenshots for each interior. Keep applicable existing automated checks and a normal build/check/lint gate.

The \`world:check:navigation\` generator is optional for this change: no authored *interior navigation layout* changes are planned, so its passing result alone does **not** establish that the forge lane or trigger behavior works.

## Out of scope

HPA-817's generic corner-slide physics; HPA-816 Oren/counter interaction; HPA-818 keyboard shortcuts; village redesign, new authored art/SFX, save migrations, AI/pathfinding, new quest/story assets or duplicate implementation PRs. Keep this **one ticket / one PR**.

## Review disposition

Accepted PR #64 review findings 1–6: four call-site consistency including slide veto; actual rect ∪ circle instead of synthetic band; source-derived rects on all eight exits; core-owned predicate; reuse of \`walk()\` and a lean scene-test set; focused UAT and explicit jamb regression. The proposed tree deletion is accepted **as the first source edit to validate**, not as proof that the whole lane is already fixed.
