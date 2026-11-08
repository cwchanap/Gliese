# HPA-815 — Forge approach and wide interior exits (design)

**Status:** Proposed design for a documentation-only draft PR; implementation and playtesting are not yet done.
**Issue:** https://linear.app/cwchanap/issue/HPA-815/the-forge-is-enterable-but-only-by-sliding-along-a-wall-through-a-one
**Baseline:** Gliese main after merged PR #62 (HPA-760), and the November 7 follow-up on HPA-815.

## Problem and evidence

The first quest directs Grik to Oren's forge. Round-3 headless playtesting reached the forge only by finding a narrow band between the forge, the neighboring hut, and trees. The test harness makes navigation less precise than a real keyboard, so this is **not** evidence of a hard soft-lock; it is reliable evidence of avoidable first-quest friction.

PR #62 already rerouted the visible dirt connector away from the neighboring hut's door and added a labeled forge entrance hint on the Area Map. The follow-up inspection found two residual defects:

1. **Forge approach geometry.** In **src/lib/game/content/maps/overworld/chunks/sundrop.ts**, the lone blocking-tree glyph Y at local column 43, row 43 sits directly below hut 2. Collision clearance leaves a thin band rather than a comfortable route. The existing **world.test.ts** route checks prove one centerline traversable and far enough from unrelated transitions; they do not assert usable corridor width. A player walking west from the forge doorstep can still hit hut 2's doorway trigger.
2. **Interior exit activation.** **src/lib/game/phaser/scenes/WorldScene.ts** uses a point-distance threshold (30px = 12px player radius + 18px transition radius) for every transition. Yet **VILLAGE_INTERIOR_LAYOUTS** already defines 128px-wide exterior doorway rectangles for the blacksmith, Shrine of Aurora and villager houses 1–3. Their exit coordinates lie at the doorway center. Standing in the left or right walkable part of the painted doorway fails to exit.

Related work: HPA-817's open-grass corner-slide fix is completed; HPA-816 (talking to Oren across his counter) and HPA-818 (I/Esc shortcuts) are separate tasks. Do not reopen or absorb them.

## Goals

- A player following the visibly painted, first-quest route can approach, enter and leave the forge without pixel-perfect steering or an accidental hut transition.
- The approach's constrained segment is **at least three adjacent 32px walkable tiles (96px raw width)**, with clearance checked using the actual player radius and the current story-gated map.
- For each 128px exterior doorway, exiting works from left, middle and right **player-center positions that are physically reachable through the opening**.
- Existing narrow (64px) exits, overworld entrances, transition destinations, save behavior and battle-return anti-bounce behavior remain unchanged.
- One Linear issue, one PR, minimal source-owned changes, no new art or SFX.

## Decision A — repair the authored Sundrop lane, not movement physics

Modify **src/lib/game/content/maps/overworld/chunks/sundrop.ts** only where needed for the forge connector. Keep both anchors **sundrop-forge-door** (f) and **sundrop-neighbor-hut-2-door** (b), building footprints and story overlay semantics intact.

Start by shifting/removing the existing isolated Y obstruction at local (43, 43) and shaping the south-of-hut dirt/grass corridor so the obvious painted line crosses the open middle of a three-tile band, then turns north into f. Avoid a westward lane directly through b's 30px activation circle. Prefer the smallest glyph edit that keeps existing runtime sprites visually coherent; do **not** compensate by increasing walk speed, changing global collision radius, enlarging every door trigger, or introducing route/pathfinding machinery.

Verify the real composed grid, not only the raw text. **GRID_NAVIGATION_CELL_SIZE = 16**, **GRID_NAVIGATION_CLEARANCE = 12** and tree/building blockers can make a visually three-tile corridor functionally narrower. The local test should check three adjacent traversable tile-center tracks through the constrained segment, plus sustained movement and clearance from unrelated door triggers. Preserve the existing pinned intended connector glyphs, updating them for the new line; prevent a regression back to the original misleading straight path.

Outdoor terrain uses the existing glyph renderer; moving a tree glyph changes its existing sprite/ground placement without asking for new artwork. Capture a map preview and a painted/runtime screenshot. If the revised source visibly conflicts with any baked imagery or requires a replacement image, open **a separate art-generation task** rather than mixing art generation into this coding ticket.

## Decision B — give wide south-facing interior exits a source-derived activation width

Add a single **optional triggerWidthPx** field to **MapTransition** in **src/lib/game/content/maps/types.ts**. Keep **x/y** as the transition's authoritative center, preserving markers, arrival coordinates and all ordinary point transitions.

For the five **128px** south-facing exterior doorways only, set **triggerWidthPx** from the existing **layout.doors.exterior.width** in **src/lib/game/content/maps.ts**:

- blacksmith-interior
- shrine-of-aurora-interior
- villager-house-1
- villager-house-2
- villager-house-3

Do not change 64px Hero House, Guild Hall or Item Shop exits. Those keep the existing 30px circular rule, which is already wider than a collision-safe 64px doorway span.

Use one small pure **isTransitionTriggered(transition, playerPosition)** helper (suggested owner: **src/lib/game/content/maps/transition-trigger.ts**) for both **WorldScene.tryTransition** and initialization of **battleReturnTransitions**. For normal transitions retain the current circular distance. For a triggerWidthPx door use a horizontal collision-safe band:

~~~ts
Math.abs(player.x - transition.x) <= triggerWidthPx / 2 - PLAYER_COLLISION_RADIUS
  && Math.abs(player.y - transition.y) <= MAP_TRANSITION_TRIGGER_RADIUS
~~~

The horizontal player-center restriction prevents activation through the solid wall beside the painted opening. The vertical tolerance preserves the current activation depth. The feature is intentionally limited to the existing south-facing horizontal exits; no general-purpose polygon trigger framework is required. Keep **requiresClear** and anti-bounce checks exactly as before.

If the development collision probe finds a doorframe makes a candidate x physically unreachable, test the closest truly traversable x rather than forcing the trigger to cover solid geometry. Visual opening, collision and interaction must agree.

## Verification and acceptance

1. **Route contract:** update **src/lib/game/content/maps/overworld/world.test.ts** to pin the new visible connector and assert three parallel collision-safe tracks across the constrained lane and a continuous approach to f without touching b or another transition. A reverted one-tile pinch/tree must fail.
2. **Transition contract:** unit-test the helper on left/center/right player-center positions of all five wide doors, positions beyond both door jambs, the too-early y band, and an unchanged 64px/overworld point trigger. Check the real layouts, not invented width constants.
3. **Scene contract:** extend **src/lib/game/phaser/scenes/scenes.test.ts** to exercise at least the forge, shrine and one villager-house exit through **WorldScene.update** at multiple x positions. Verify the overworld arrival point, no unintended re-entry, and battle-return suppression.
4. **Manual keyboard UAT:** New Run → Mott → Area Map forge hint → normal continuous walk along painted dirt → forge → Oren → exit from left/middle/right, then another wide-door interior; capture map/door screenshots and the tested commit.
5. **Gates:** targeted Vitest, full unit tests, **bun run world:check:navigation**, **bun run check**, **bun run lint**, **bun run build**, and the existing relevant Playwright test(s). Record commands and results; do not mark them passed in this planning PR.

## Explicit non-goals

No redesign of the overworld or interior layout system; no new movement/corner-slide fix (HPA-817); no NPC counter interaction fix (HPA-816); no input shortcut fix (HPA-818); no asset generation; no new persistence fields, save migration, quest changes or duplicate PRs.

## Open implementation checks

- Prove the chosen three-tile lane in the composed 16px grid and with the current 12px player clearance. Its exact glyph edits should be driven by that test, not by a screenshot alone.
- Confirm a small source edit produces a consistent on-screen painted approach under all relevant story overlays.
- Confirm that wide-door trigger positions are walkable, and that the transition check does not fire outside a visible opening.
