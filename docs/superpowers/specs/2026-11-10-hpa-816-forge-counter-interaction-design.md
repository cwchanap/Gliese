# HPA-816 — Oren's forge counter interaction (design spec)

**Status:** Implemented and verified on the HPA-816 branch.
**Linear:** https://linear.app/cwchanap/issue/HPA-816/i-cant-talk-to-oren-across-his-own-workbench
**Reviews:** [root-cause correction](https://github.com/cwchanap/Gliese/pull/65#pullrequestreview-5853651066); [implementation safeguards](https://github.com/cwchanap/Gliese/pull/65#pullrequestreview-5863664605)
**Related, separate:** HPA-815 (forge access), HPA-760 (NPC selection/status), HPA-818 (Gear shortcuts).
**Delivery:** One ticket, one existing draft PR (#65) for spec, plan, implementation, and tests.

## Problem and corrected diagnosis

In the Round 3 playtest, walking straight up to Oren's Blacksmith counter and pressing E returned “Traveler: No one is nearby.” Circling around the west end of the counter worked. The original plan proposed moving Oren toward the customer side; the design review found that would violate the authored collision-clearance contract and place his rendered feet in front of the painted counter.

| Element | Current baseline |
| --- | --- |
| Oren's NPC position | `(448, 416)` |
| Authored customer approach | `(448, 480)` |
| Counter collision | `rect(284, 440, 324, 18)` (top-left layout coordinates) |
| NPC interaction threshold | `PLAYER_COLLISION_RADIUS 12 + NPC_INTERACTION_RADIUS 36 + NPC_PACK_COLLISION_RADIUS 17 = 65px` |
| Observed normal walk stop | ~`y=482` → distance 66px, one pixel **out** of range |
| Existing scene-test seed | `(448, 480)` → 64px, just **in** range; misses bug |

The immediate failure is caused by **16px navigation-grid quantization and 12px clearance**, not a missing interaction binding. The current counter covers grid cell centres on rows 27 and 28; clearance also blocks the next row, so a normal northward walk stops at or just south of `y=480` (depending on frame size). Even the authored `(448, 480)` approach has only 1px of reach margin.

`WorldScene.updateNpcDialogue`, `handleInteractInput`, the shop/dialogue reach check, and `selectNearbyCandidate` already use the same NPC selector. Widening interaction globally would hide the actual geometry issue and affect every NPC.

## Decision — shrink the local counter collision by 2px; do not move Oren

Change only `VILLAGE_INTERIOR_LAYOUTS['blacksmith-interior'].propCollisions.serviceCounter` from

~~~ts
serviceCounter: rect(284, 440, 324, 18)
~~~

to

~~~ts
serviceCounter: rect(284, 440, 324, 16)
~~~

Keep Oren at **`(448, 416)`**, his customer approach at `(448, 480)`, and the counter's `propZones.serviceCounter` unchanged.

**Why this specific change:**

- Navigation rows are marked blocked when their 16px cell **centre** lies inside an authored collision rectangle (upper boundary inclusive, bottom exclusive). Reducing the bottom from `y=458` to `y=456` frees the cell centred at `y=456`.
- After the existing 12px nav clearance, the first walkable player-centre row moves toward `y=464`; expected keyboard stopping positions at common frame steps are ~`y=464–466` instead of `y=480–485`.
- From Oren at `y=416`, that is ~48–50px, giving ~15–17px of real interaction margin under the unchanged 65px threshold.
- The remaining collision strip `y=440–456` stays within the reviewed painted workbench `y≈438–457`. Oren's placement remains visually behind the counter and still meets existing NPC-clearance tests.
- A player-circle edge at `y≈452–454` may overlap up to ~4–5px of the painted bottom shadow; **inspect this** in an actual game screenshot, rather than claiming perfect visual parity from the numbers alone.

This is a deliberately local correction to how the counter occupies the 16px navigation grid, not a new collision rule.

### Required generated artifact

The running game uses the checked-in `src/lib/game/content/generated/navigation-grids.generated.ts` bitset through `content/maps.ts`. Changing the layout **without regenerating the bitset leaves runtime movement unchanged**. After the source edit, run:

~~~sh
bun run world:generate:navigation
bun run world:check:navigation
~~~

Commit the changed generated grid alongside the source and tests. Do **not** hand-edit bytes. Existing navigation-source and generated-runtime checks must pass. Because the core CI workflow does not currently run `world:check:navigation`, add a **small test in the existing `content/maps.test.ts` interior registration coverage** that compares the Blacksmith generated grid with `compileNavigationGrid(buildVillageInteriorNavigationSource({ mapId: 'blacksmith-interior', layout: VILLAGE_INTERIOR_LAYOUTS['blacksmith-interior'] }))`. Reuse existing imports; do not create a new CI job or global generator framework.

## Decisions retained and alternatives rejected

- **Keep:** one PR, layout as source of truth, unchanged `WorldScene` / `core/interaction.ts` / global collision constants, unchanged shop/quest/dialogue IDs and existing story flow.
- **Reject previous recommendation (`Oren → (448, 436)`):** the padded counter collision spans approximately `y=428–470`, so the new NPC centre would be inside it, failing `layouts.test.ts` and leaving Oren in front of the base-only painted counter (there is no foreground plane to hide the sprite).
- **Reject global reach increase, per-NPC reach overrides, or a new interaction framework:** unnecessary for the verified defect.
- **Reject moving the entire counter or removing its collision:** only trim the excess that changes grid-cell occupancy; keep the authored visible solid counter.
- **If the 2px trim looks wrong in-game:** stop and reassess the **smallest** counter/nav-art alignment adjustment in the same PR. Do not silently substitute the rejected Oren relocation, add an NPC collision exemption, or commission replacement art. If genuinely new image art is needed, create a **separate art-generation task**.

## Acceptance criteria

1. **Normal approach:** from the Blacksmith spawn, holding up into the front of the service counter (not walking around it or teleporting behind it) stops Grik comfortably inside normal interaction reach with at least **12px margin** at the tested frame step.
2. **HUD/E/shop:** “Oren nearby” appears; pressing E opens Oren dialogue and the existing first-quest talk objective; Shop still opens `sundrop-forge`. Status, E, and shop must resolve the same target.
3. **Real grid in release:** source layout and committed generated navigation bitset agree; `world:check:navigation` passes and runtime movement actually reaches the new stopping band.
4. **Boundaries:** a clearly distant player still cannot speak to Oren; other NPCs, quest logic, and collision rules are unchanged.
5. **Visual:** Oren remains behind the painted counter, player does not visually walk through the main workbench, movement does not wedge, and the graybox fallback remains usable.
6. **Scope:** no changes for HPA-818, HPA-815 geometry, new images, SFX, or save format.

## Verification strategy

- **Extend**, don't duplicate, the existing `layouts.test.ts` “keeps every interior rectangle in bounds and every approach clear” loop: use the real compiled interior grid and `walk()` toward each NPC. Assert the stopping distance plus one normal 4px movement step fits inside the existing 65px reach. Its prior Oren-specific `64` approach allowance stays as an authored-coordinate contract, not a waiver for failed runtime walk-up.
- Update the Blacksmith counter-collision pin (`height: 18 → 16`) in the existing layout test.
- **Scene regression:** replace the artificially favourable `(448,480)` setup with held upward movement from spawn at `delta=17ms` per update. Old grid should fail (stops ~`y=482.16`); new grid should pass (stops ~`y=465.84`). Assert status → E → Oren dialogue → shop, with one clearly out-of-range control.
- **E2E:** update the existing “Blacksmith Oren equipment shop” test to approach the counter from the **front** instead of the legacy `(384,400)` staging point behind it. Start the held-`w` collision probe from the centre aisle (e.g. `(448,512)` or spawn), **not** `approachNpcWithTrustedKeyboard` at `(448,480)`; that helper returns as soon as the 65px interaction distance is reached, before the player walks into the counter. Require player arrival **north of y=480** after held-up movement, then interact and preserve purchase/save/reload coverage.
- **Manual:** one normal New Run → forge → walk straight to counter → E → Shop smoke, with a screenshot for the painted workbench and a brief fallback check when practical. Verify ~4–5px overlap against the bottom shadow does not look like clipping.
- Run focused unit tests, relevant E2E, type check, lint, build, and the navigation-generation check; report observed results separately.

**Verification (2026-11-11):** the focused navigation, layout, map, and scene suites pass
(420 tests); the full unit suite passes 1290/1290; `svelte-check`, `lint`, and
`world:check:navigation` pass. The Oren E2E was not run because port 4173 is occupied by another
preview server.

**Out of scope:** new NPC interaction shapes, global radius changes, custom pathfinding, map redesign, keyboard inventory shortcuts, localization/story rewriting, audio/art generation, and compatibility migrations.
