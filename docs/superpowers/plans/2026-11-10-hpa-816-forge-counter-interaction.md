# HPA-816 — Oren counter interaction implementation plan

**Design:** [2026-11-10-hpa-816-forge-counter-interaction-design.md](../specs/2026-11-10-hpa-816-forge-counter-interaction-design.md)
**Issue:** https://linear.app/cwchanap/issue/HPA-816/i-cant-talk-to-oren-across-his-own-workbench
**PR strategy:** Exactly **one PR for HPA-816**. Start with design/plan as a draft; add implementation and tests to this **same branch/PR**, not a second implementation PR.
**State:** Plan only — no code or tests have been executed for this proposal.

## Files and approach

| File | Expected change |
| --- | --- |
| `src/lib/game/content/maps/layouts/village-interiors-v2.ts` | Move only Oren's `npcApproaches.oren.npc` from `(448,416)` to provisional `(448,436)`, subject to visual validation. Keep `approach`, counter and exits unchanged. |
| `src/lib/game/content/maps/layouts/layouts.test.ts` | Update Oren pinned coordinate and assert usable margin for interior NPC approach geometry; keep existing reachability/collision checks. |
| `src/lib/game/content/maps.test.ts` | Only update a fixture if the existing content contract asserts Oren's old coordinate; do not add duplicate fixtures needlessly. |
| `src/lib/game/phaser/scenes/scenes.test.ts` | Reproduce the counter walk-up and verify hint, E dialogue, shop choice, and out-of-range behavior. |

**No expected production changes** to `WorldScene.ts`, `core/interaction.ts`, `core/collision.ts`, shop/story data, navigation generator, or art assets.

## Task 1 — pin the failing behavior before the layout change

Extend the existing “starts Oren dialogue and opens the Sundrop Forge shop” scene coverage, or add one adjacent targeted regression:

1. Create the normal `blacksmith-interior` scene.
2. Set Grik at `(448, 482)`, the measured customer-side collision stop rather than the historical test's `(448, 480)`. Verify the point is walkable in the real `blacksmith-interior-navigation` grid (do not assume a teleport makes it walkable).
3. Assert that current main fails to select Oren at this point (the documented 66px versus 65px mismatch). The test should be red *before* the coordinate change.
4. After the fix, assert HUD displays `Oren nearby`; pressing E starts Oren dialogue; selecting `shop` opens `sundrop-forge`. Keep existing quest completion behavior as an invariant.
5. Check a nearby but not pixel-perfect customer position, e.g. `(448, 496)`, and a clearly distant position, e.g. `(448, 560)`. Confirm out-of-range does not trigger Oren.
6. Preserve existing status/dialogue tests that guard stale proximity hints and matching E targets.

Prefer a **small scene test** over creating a new end-to-end harness. If reaching `(448,482)` from normal movement differs from the earlier Linear measurement, derive the real stopped point using the game's navigation/movement resolver and update the test accordingly.

## Task 2 — local geometry fix

In `VILLAGE_INTERIOR_LAYOUTS['blacksmith-interior']`, try:

~~~ts
npcApproaches: {
  oren: { npc: point(448, 436), approach: point(448, 480) }
}
~~~

Do **not** touch the authored `serviceCounter` collision or navigation source. `content/maps.ts` consumes this NPC placement directly.

Before finalizing, verify the new Oren collision circle does not push the player away from the normal customer approach, and that his sprite remains credibly behind the low counter in the painted view. If needed, adjust only the same local NPC coordinate and document the measured margin and reason. Avoid any global interaction radius change.

## Task 3 — inexpensive regression contract

In the existing interior layout/content tests, add a compact contract:

- For each named `npcApproaches` placement, locate the corresponding actual map NPC (match by authored anchor, not by assuming the layout key matches dialogue ID).
- Confirm the authored approach remains in the reachable interior walkable region.
- Compute effective reach from existing `PLAYER_COLLISION_RADIUS` + `NPC_INTERACTION_RADIUS` + the real sprite-family collision radius (`NPC_PACK_COLLISION_RADIUS` or `STARTER_NPC_COLLISION_RADIUS`).
- Require a meaningful positive approach margin (suggested **at least 12px**, subject to checking current authored interiors). This would have failed Oren's previous 64px versus 65px 1px margin and should pass after the local repositioning.
- Keep this as one small data test. Do not introduce a general geometry framework or duplicate engine logic.

For Oren, retain a separate scene-level regression at the real `y≈482` collision stop, because the static authored approach is `y=480` and can otherwise conceal the problem again.

## Task 4 — validate gameplay and no regressions

Run focused checks first:

~~~sh
bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/scenes.test.ts
bun run check
bun run lint
bun run build
bun run test:e2e -- --grep "Blacksmith Oren equipment shop"
~~~

Then make one manual keyboard smoke pass:

1. Start a **normal New Run** (not only a `?startMap=` teleport), follow the first quest to Sundrop Forge, and enter via the HPA-815 repaired route.
2. Walk **straight toward the service counter**, stop when collision blocks the approach, and press E. Confirm Oren's nearby label and story dialogue.
3. Choose Shop; confirm shop opens, then exit and retry interaction after returning.
4. Inspect Oren against the painted counter, the player's collision, and (if available) the graybox fallback. Record screenshot(s) and any mismatch without generating replacement art.

Do not claim passing checks until they actually run. Test failure due to unrelated baseline issues should be recorded, not silently waived.

## Exit criteria and review handoff

- Reproduction test is red before the change and green after it.
- The normal customer-side walk has >=12px reliable interaction margin and the front-counter status/E/shop route works.
- No move-through-counter, sprite-on-counter, duplicate target, stale status, or out-of-range talk regression.
- Targeted tests, check, lint, build, e2e and one keyboard smoke are reported with outcomes.
- PR body links both planning docs, describes the final single local geometry change, and provides observed validation evidence.

**Do not include** HPA-818 Gear keyboard changes, new images, SFX, generic NPC interaction overrides, or other village cleanup in this PR.
