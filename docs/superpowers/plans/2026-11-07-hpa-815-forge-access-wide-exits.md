# HPA-815 — Implementation plan: forge lane and wide interior exits

**Status:** Planning only. This document and its design spec are review artifacts, not evidence of an implementation or a test pass.
**Linear:** https://linear.app/cwchanap/issue/HPA-815/the-forge-is-enterable-but-only-by-sliding-along-a-wall-through-a-one
**Design:** ../specs/2026-11-07-hpa-815-forge-access-wide-exits-design.md
**Delivery:** Complete implementation on **this same draft PR** after review; do not create a second PR for HPA-815.

## Baseline and ownership

- **HPA-760 / merged PR #62** already provides a labeled forge map hint and a first connector reroute. Retain both.
- **HPA-817** already covers generic open-grass corner sliding. Do not change movement physics here.
- **HPA-816** (Oren through workbench) and **HPA-818** (inventory/Esc) remain independent.
- **Sundrop terrain source:** src/lib/game/content/maps/overworld/chunks/sundrop.ts
- **Composed grid and route tests:** src/lib/game/content/maps/overworld/world.test.ts
- **Interior door widths:** src/lib/game/content/maps/layouts/village-interiors-v2.ts (read-only authoritative data)
- **Map transition metadata:** src/lib/game/content/maps/types.ts and src/lib/game/content/maps.ts
- **Runtime transition detection:** src/lib/game/phaser/scenes/WorldScene.ts
- **Tests:** src/lib/game/content/maps/transition-trigger.test.ts (new, small), src/lib/game/phaser/scenes/scenes.test.ts
- **No generated art, asset/SFX edits, story beats or new save fields.**

## Step 1 — RED route regression from real Sundrop geometry

In **world.test.ts**, start with a failing regression for the known squeeze. Use the current story-gated overworld, **buildGridNavigationGrid**, **isWalkable**, the existing **FORGE_CORRIDOR** source glyph checks and actual door transitions.

- Define a few fixed sections around the hut-2/tree pinch and the northbound turn to f. At each section check **three adjacent 32px tile-center tracks** across the direction of travel, not just one successful path. The composed 16px navigation grid must accept the player's clearance.
- Assert a continuous intended route from the open village lane to f without entering the 30px trigger of b or any other building. Include the reverse direction for leaving the forge.
- Keep source glyph pins so a regression to the visibly misleading straight connector cannot pass a BFS that merely finds some alternate grass path.
- Establish that the existing source fails the new minimum-width assertion before changing the map. Do not label a raw empty tile as traversable without checking eroded collision.

## Step 2 — smallest possible authored-map edit

Edit **sundropChunk.terrain** around the forge approach only. Inspect the isolated **Y** at local (43,43) and the row-41/42/43 path in the local chunk. Prefer relocating/removing that existing blocking tree and adjusting a handful of dirt glyphs so the **visible path center** passes through the middle of a three-tile-wide corridor below hut 2, then turns toward f without drawing the player into b.

Re-run Step 1. If any section remains sub-width under composed collision, adjust the immediately adjacent glyphs; do not solve this by changing global collision constants, geometry code or the hut's unrelated story anchor.

Capture **bun run map:preview -- --chunk sundrop** (or the equivalent supported invocation for the current script) and a live walk screenshot. Confirm no change in raid overlay access or misleading old paint. If a replacement graphic is genuinely necessary, create a separate art task rather than embedding art generation here; do not silently accept painted collision mismatch.

## Step 3 — RED tests for wide exit behavior

Add a small pure helper test (suggested: **src/lib/game/content/maps/transition-trigger.test.ts**) using the **real VILLAGE_INTERIOR_LAYOUTS**. For each 128px south-facing exterior door (blacksmith, shrine, houses 1–3):

- Door center, door-left+16px and door-right-16px at exit y must activate.
- Player center outside the playable doorway left/right boundaries must not activate.
- Same x but beyond the existing 30px vertical trigger depth must not activate.
- The wide-door positions must also be walkable at the normal 12px player radius.

Include at least one legacy 64px interior exit and an overworld point entrance to prove the original circular rule remains intact.

Add a focused scene integration test in **scenes.test.ts** that positions the player across the blacksmith's 128px exit and verifies **WorldScene.update** restarts to the overworld with the existing centered **overworldDoorArrival**. Repeat for shrine and a representative villager house (or use a small table if it keeps the test simpler). Include a no-activation check outside the jamb and a battle-return anti-bounce check.

Tests should fail at off-center wide exits before implementation.

## Step 4 — minimal trigger metadata and shared detection

1. Add **triggerWidthPx?: number** to the **MapTransition** interface, documented as a width used only for the currently authored horizontal exterior openings; retain existing x/y, marker, arrival, requiresClear and other fields.
2. In **maps.ts**, set it from each **VILLAGE_INTERIOR_LAYOUTS[mapId].doors.exterior.width** for the five 128px exits only. Do not copy hard-coded magic x-range numbers or add it to the 64px exits.
3. Implement one pure **isTransitionTriggered** helper. When width is absent, preserve the current 30px circle. When width is present, accept x across half the door width minus PLAYER_COLLISION_RADIUS, plus the existing ±MAP_TRANSITION_TRIGGER_RADIUS depth around exit y. Do not fire through the neighboring wall.
4. Reuse the helper in both the regular **tryTransition** loop and **battleReturnTransitions** initialization. Leave suppression, encounter clearance, scene restart, spawn/arrival and persistence untouched.
5. Keep any collision debug overlay consistent with the new activation region if used for inspection; do not change player-visible markers.

Re-run tests, including legacy map/transition cases; repair only regressions attributable to this change.

## Step 5 — gameplay acceptance, screenshots and CI

Perform a **real held-key** route rather than teleporting directly to door coordinates:

1. New Run → speak with Mott → leave Hero House.
2. Open the Area Map; verify the active objective still shows Sundrop Forge before map exploration.
3. Follow the visibly painted lane to the forge, without entering villager-house-2 or wedging at a tree.
4. Enter; walk to Oren's currently supported interaction position (do not conflate this with HPA-816).
5. Approach the exterior opening from three interior horizontal positions; each reachable band must exit on the first walk. Re-enter, verify overworld arrival stays outside the 30px entrance trigger, and try shrine/one villager house.
6. Repeat with the relevant raid/story state to confirm no unintended wall or gate openings.

Run and report the actual results:

~~~bash
bun run test:unit -- --run src/lib/game/content/maps/overworld/world.test.ts src/lib/game/content/maps/transition-trigger.test.ts src/lib/game/phaser/scenes/scenes.test.ts
bun run test:unit -- --run
bun run world:check:navigation
bun run check
bun run lint
bun run build
# Run the relevant existing Playwright field/blacksmith route test(s) and record their names.
~~~

For the implementation PR description, record tested commit SHA, pass/fail totals, screenshots (map preview + real in-game forge entry/exit) and any environment-specific test skips. CI green alone does not replace the held-key acceptance.

## Completion checklist

- [ ] The first quest's forge route is **at least three actual walkable tiles wide** at its constrained sections, with collision-aware tests guarding against regression.
- [ ] Authored visible connector points toward f and stays safely away from b.
- [ ] Five 128px interior doors exit from every realistically traversable part of the painted opening; legacy point doors remain unchanged.
- [ ] No wall-side accidental exit or immediate exterior re-entry.
- [ ] Current quest, NPC, map IDs, save records, arrival points, and artwork remain compatible.
- [ ] Targeted/full checks and held-key UAT completed and evidenced.
- [ ] Implementation committed into this PR; only then mark it ready for review and update the Linear status.

## Risks, stop conditions, follow-ups

- If the three-tile requirement cannot be achieved by small source edits without contradicting visible art, document the exact conflict and open a **separate art-generation ticket**; do not expand the code ticket into a repaint.
- If a trigger location is physically blocked by navigation geometry, fix its source doorway geometry rather than widening triggers through walls.
- Any new Oren dialogue/counter fix, keyboard shortcut work or generalized interaction rewrite belongs to its existing separate ticket, not HPA-815.
