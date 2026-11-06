# HPA-760 — Round 2 Human Playtest Reliability Design

**Issue:** https://linear.app/cwchanap/issue/HPA-760  
**Baseline inspected:** `main` at `39a9e5b5ce460abde3e9114f3a5f9cee7022c55c` (2026-11-02)  
**Status:** Design proposal only; no gameplay implementation in this planning PR.

## Problem and evidence boundary

The November 4 round-2 keyboard playtest found a first-quest wayfinding failure (forge), two visually wider-than-traversable Hero House doorways, misleading E-key targeting/fallback, an NPC/table trap, hero occlusion under the HUD, and wallet/playtime display discrepancies. The same ticket also records outdated shop-name E2E expectations.

The forge report was produced in a headless setup and **does not prove a true soft-lock**. Treat it as a strong first-quest usability failure: a normal player must be able to identify the correct building, approach its door, enter, and speak to Oren without coordinate hunting. Before moving the layout, test current trigger-aware reachability and confirm the route with a short normal keyboard walk; capture any accidental neighbor transition.

The code confirms several concrete risk points:

| Player report | Current owning code | Assessment |
| --- | --- | --- |
| Forge hard to find/enter | `content/maps/overworld/chunks/sundrop.ts` (`F` footprint, `f` door anchor), `overworld/places.ts`, grid navigation in `grid/layers.ts`, `core/navigation.ts` | Building footprint is blocked and its door is a separate anchor. Check the continuous player-radius-clear street-to-door approach; do not infer an impossible route from the headless test alone. |
| World map tiny, multiple unlabeled objective circles | `ui/AreaMapScreen.svelte` renders the entire overworld in one SVG viewBox; `core/area-map.ts` only targets the *current* map's quest NPCs | The Oren objective is inside `blacksmith-interior`, so the overworld needs a readable entrance-level hint. No new map subsystem required. |
| Hero House exit and bedroom narrow | `content/maps/layouts/village-interiors-v2.ts`, generated navigation source, `content/maps.ts` | Visible apertures, collision clearance, player radius, transition trigger, and painted geometry need to agree in both travel directions. |
| E chooses Mott instead of indicated Tikka | `WorldScene.findNearbyNpc` sorts eligible interactable NPCs by distance only | Facing is not part of selection. HUD nearby hint and E must use the *same* chosen target and must clear stale hints. |
| “No one is nearby” beside villagers | `overworld/places.ts` and interior `ambientNpcs` vs. `WorldScene.findNearbyNpc` | Ambient villagers are drawn but not interactable story NPCs. Show an honest noninteractive-villager response; don't invent full conversations. |
| Wedged near Tikka and living-room table | `content/maps.ts`: Tikka at (192,432); V2 living-table collision x 224–336, y 400–464; `core/collision.ts` | The gap is at/near player clearance threshold. First try a small authored NPC/prop placement correction, not a new physics engine. |
| HUD covers hero | `ui/FieldHud.svelte` has a large absolutely positioned top-left hero card | Need low-cost spatial occlusion behavior, not a full HUD redesign. |
| Loading HUD shows 30G for a 20G new run | `ui-bridge/store.ts` hardcodes 30; `save/save-state.ts` creates a 20G wallet | The copied 30G value is provisional for all starts; hide false numeric HUD values until the first authoritative `ready` publish, including Continue. |
| Load picker keeps 00:00 | `save/playtime.ts` counts live seconds; `WorldScene.buildSlotRecord` samples only when writing; `ui/SaveScreen.svelte` reads the last stored slot duration | Existing autosaves are frequent, but the displayed `h:mm` format is ambiguous. Check actual save path, slot age and dev-run suppression before changing persistence. |
| Shop E2E expects “Mira's Item Shop” | `tests/e2e/game.e2e.ts` has old name in shop fixture plus heading/dialog assertions | Test-only rename drift: preserve current product-facing “Mira's Herb Hut”. |

**Review evidence addendum (2026-11-05):** `resolveMovementSegment` is axis-separated and does not assist sideways movement toward narrow doorways; existing E2E comments describe 16px clearance-eroded door lanes. `findNearbyNpc` already serves prompt, shop, and E, but chooses by distance and can leave a stale “X nearby” status when a non-shop target disappears. The entire overworld is displayed in `AreaMapScreen` while the minimap uses a player-local viewport. `formatPlaytimeSeconds` is `h:mm` rather than `mm:ss`. The 30G initial HUD placeholder is used for Continue too, so changing it to 20G alone is insufficient.

The forge `f` is near the neighbor-house `b` door; automatic triggers fire within player radius + 18px, but existing anchor reachability ignores door triggers. A trigger-avoiding route check is justified. **Do not assume every route necessarily crosses `b` without proving it**; the walkable glyph grid has other approaches.

**Second review (2026-11-05):** Prefer source-owned Hero House doorway clearance over changing the global movement resolver; remove camera-padding experiments in favor of an edge-triggered HUD card fade. The reported neighbor-door conflict is a legitimate *visible-path design defect*, but not logically an inescapable transition: a source-grid navigation pass using 16px cells, 12px obstacle clearance and a 30px avoidance circle finds an alternate south-side approach. Its shortest near-miss is only about 34px from the neighbor door center, so merely “technically reachable” is not a satisfactory player experience. Fix the visible route and test a comfortable clearance margin rather than accepting a brittle hairline detour. Final proof remains a real keyboard playthrough.

**Latest review (third pass):** Generating an Oren entrance marker is insufficient while the global fog filter hides it; treat active one-hop entrance guidance as a narrowly scoped known hint, and frame it in the Area Map alongside the player. Pin the *authored dirt connector* as well as trigger-safe movement, because swapping dirt and grass leaves collision/navigation unchanged.

## Decision: one focused implementation PR for this issue

The subsequent implementation continues **on the same HPA-760 PR**, after review of these planning docs. Fix player-visible contracts in the existing map, interaction, HUD, and save owners. Reuse current navigation generation, Svelte/Phaser bridge, story gates, shop identity, and slot storage. Do not split one Linear ticket into several PRs.

This work is not an opportunity for a general interaction framework, map authoring rewrite, autosave service, collision engine replacement, new quest routing system, or full UI restyle.

### 1. First-quest forge: visibly safe connector and pre-discovery quest guidance

- Preserve the exterior/interior transition, Oren, and practice-spear identities. The visible eastward dirt connector from neighboring hut door \`b\` to forge door \`f\` crosses \`b\`'s automatic activation circle (player radius 12px + transition radius 18px). The player can find a south-side detour, but the apparent route is misleading.
- Correct **authored Sundrop dirt/path glyphs** so the natural, visibly continuous approach travels south of \`b\` with comfortable trigger clearance before turning toward \`f\`. Shifting the path exactly one 32px tile south is only a candidate; verify the centerline and normal keyboard deviations against the 30px activation radius and grid obstacle clearance. Move building/door anchors only if the painted connector cannot be repaired otherwise; no new image/SFX assets here.
- Protect **both source presentation and traversal**. An unconstrained flood-fill still passes if it finds the existing obscure detour. Grass (\`.\`) and dirt (\`,\`) are both walkable in \`grid/legend.ts\`; repainting one to the other leaves \`buildGridNavigationGrid\` unchanged. Therefore the focused \`world.test.ts\` regression must:
  1. Read the authoritative Sundrop glyph rows (\`sundropChunk.terrain\`) and pin a **small number of key authored corridor/turn glyphs**, including the removal of the misleading old connector; restoring the old connector must fail the test.
  2. Verify the corresponding **intended walk-line/segments**, not merely existence of any reachable route: each part is walkable with player/obstacle clearance and remains outside every unrelated active auto-transition's trigger (with an intentional margin).
  3. Retain preview and keyboard acceptance as checks that the route looks obvious in real artwork. No generalized path planner or global map invariant.
- Add a one-hop **known quest entrance hint** for an active \`talk-to-npc\` objective whose eligible target is in a directly connected interior. Resolve it from \`map.transitions\`, \`maps[transition.toMapId]\` and \`applyStoryGates\` for the current quest progress, and label it using that destination's localized area name (e.g. **Sundrop Forge**), not an unhelpful generic quest title.
- **Crucial fog exception:** \`buildAreaMapState\` currently applies \`isWorldPositionRevealed\` to *all* marker candidates. Mark **only** an active, story-valid one-hop entrance hint as **known quest guidance** (e.g. a local optional \`knownQuestEntrance\` flag) and let *that marker alone* bypass the fog marker filter. This must **not** reveal terrain cells or expose other transitions, ordinary discoveries, or hidden current-map quest targets. Remove the hint as soon as the objective completes or is no longer eligible. Do not change the exploration data model.
- **Area Map framing:** \`FieldHud\`'s minimap stays a small 6×6-cell local window; it need not show the far-away forge immediately. The separately opened \`AreaMapScreen\` must frame **both the player at the home exit and the known quest entrance**, using a small pure clamped viewport helper in \`core/area-map.ts\` shared with the minimap. At the current baseline those points are about **1,191px apart** (home exit \`(4464,7312)\`, forge \`(5648,7184)\`), exceeding the minimap's 768px span. The Area Map needs a wider, still local viewBox with margin sufficient for **the rendered localized entrance label**, not merely the marker center; preserve SVG readability, keyboard/gamepad focus, and ordinary fog. No freeform pan/zoom UI or world-wide default.

**Acceptance:** From a fresh New Run, after Mott and exiting home, the player can open the Area Map and see a legible, labeled **Sundrop Forge** hint **before its terrain is explored**, with the hero and hint visible in the same local view. The ordinary unrevealed markers remain hidden. The visibly authored dirt connector safely leads a keyboard player into the forge instead of the neighboring hut, Oren grants the practice spear, and negative/inactive-objective tests prevent premature hinting.

### 2. Narrow doors: adjust authored layout, not the global movement resolver

- The repeated “sweet spot” is consistent with 16px clearance-eroded navigation cells and the axis-separated `resolveMovementSegment` behavior, but changing that **shared resolver** would add lateral movement across the entire world and risk unintentional transitions. **Do not introduce a global corner nudge for HPA-760.**
- Start with the minimal **source-owned Hero House** adjustment in `VILLAGE_INTERIOR_LAYOUTS['hero-house']`: widen the bedroom/front usable passage where necessary, tentatively by one 16px navigation cell, by changing the actual wall-divider/end rectangles and corresponding door-zone geometry (not the door metadata alone). Re-run the navigation generator and its strict check.
- Match the **painted visible opening**: do not let extra collision-clearance make the player pass through a visibly solid doorframe. If a proposed +16px aperture contradicts approved painted art, prefer a smaller compatible adjustment and record the remaining limitation; any truly required image edit is a *separate art task* rather than silent new artwork in this PR.
- Add/extend focused V2 layout/navigation regressions and manually cross the exterior and bedroom doors from reasonable visible offsets in both directions. Spot-check other interiors through the existing E2E owners; do not widen them without a confirmed need.

**Acceptance:** Hero House visibly open doorbands are traversable without pixel-hunting, with walls still solid; no shared movement behavior change or unnecessary art generation.

### 3. Fix stale NPC hints and targeting in the *existing* shared wiring

- `WorldScene.findNearbyNpc` already feeds `updateNpcDialogue`, E, and nearby shop selection. Preserve this wiring. The current function ranks by distance only, and `updateNpcDialogue` does not clear a stale non-shop “X nearby” status when the target disappears. That stale line may explain “Tikka nearby” followed by Mott dialogue; reproduce the sequence before assuming competing resolvers.
- Extract **only the selection rule** into a tiny pure `core/` spatial helper using candidate position, radius and stable ID; filter by range, prefer facing, then distance, then ID. Use it for eligible interactable NPCs and ambient-villager proximity, not a second NPC system. Leave discovery selection unchanged unless reuse is trivial.
- Update the hint when target/facing/range changes and clear stale nearby prose without overwriting significant dialogue/quest status. Avoid per-frame full HUD publishes. E and hint should reflect the same selected candidate at input time.
- For visible noninteractable `MapAmbientNpc`, return a single localized “busy / nothing to say” fallback (all three locales) when faced/interacted with; no full dialogue content and no quest progress. Retain existing shop, dialogue sequencing and story gates.

**Acceptance:** Mott/Tikka prompt matches the dialogue opened by E, stale hints clear, and ambient villagers receive a truthful fallback.

### 4. Eliminate the living-room wedge using authored clearance

- Reproduce the pinch near Tikka's authored position and the living-table collider; check NPC circle + player radius + table edge, and nearby furniture.
- Prefer a small Tikka position or prop-collision adjustment that maintains her story role and walk-up interaction. Preserve room composition and decoration whenever possible.
- Check that a player can walk into **and back out of** reachable narrow locations; prevent isolated traps without weakening collision globally.

**Acceptance:** Keyboard movement in all four directions can escape the prior wedge from a real approach; Tikka remains reachable for conversation.

### 5. HUD and save-display truthfulness

- **Portrait occlusion:** Avoid adding camera padding to small painted rooms; it exposes blank background and changes framing. Extend the existing `WorldScene` → `HudState` publish path with a single `heroOccluded` boolean, updated **only when entering/exiting** the top-left hero-card region in camera/screen coordinates. `HudState` also has a full producer in `src/lib/game/phaser/scenes/BattleScene.ts`; initialize the boolean to `false` there and in `ui-bridge/store.ts`, and update typed HudState fixtures/constructors so all full producers remain type-safe. Carry the field through every `WorldScene.publishHudState` emission. Start from a conservative desktop envelope near `x < 420, y < 240` but calibrate against actual `FieldHud` CSS (left offset 2.125rem, max-width 23.125rem, responsive breakpoints). A fixed envelope is not an exact DOM rect; verify narrow/short viewports to avoid fading unnecessarily. Fade the `.hero-card` while covered (e.g., `opacity: 0.35`) and restore on exit. Avoid DOM measurement from Phaser, camera-bounds edits, continuous full-HUD events or a new bridge.
- **Startup gold:** `ui-bridge/store.ts` is provisional for both New Run and Continue. Hide `FieldHud` numeric values (or FieldHud itself) until `hudState.ready` and align the unused placeholder 30G with the current 20G new-run source for internal consistency; do **not** render this placeholder for a resumed 150G wallet. Preserve an honest loading state and command enablement.
- **Playtime:** `getPlaytimeSeconds` already feeds `WorldScene.buildSlotRecord` on existing autosaves and manual saves. Check `?startMap=` save suppression, slot age, last saved timestamp, `h:mm` display ambiguity (`00:04` is four minutes), and headless clock. If persisted values are correct, label hours/minutes explicitly (or use an unambiguous `h:mm:ss` format); **do not add periodic autosaves or a schema migration** without evidence of missing persistence.
- Preserve manual save/Tauri flush and failure semantics.

**Acceptance:** Hero is visible behind the top-left card with no room-edge camera drift; New Run and Continue never show false loading wallet figures; freshly saved slot displays unambiguous actual elapsed playtime.

### 6. Fix shop E2E rename drift without changing the shop

- Fix stale `Mira's Item Shop` strings in `tests/e2e/game.e2e.ts` (fixture, heading and dialog name), explicitly asserting the current visible `Mira's Herb Hut`. Preserve IDs, inventory, buy/sell behavior, and authored dialog.
- Other `Mira's Item Shop` occurrences in `src/lib/game/GameShell.svelte.spec.ts` are caller-supplied HudState fixture names, **not necessarily production rename drift**; avoid unrelated fixture churn.
- The painted Item Shop case belongs to Playwright **`exhaustive`**, not `gate`. Run its targeted E2E plus any relevant gate shop tests.

## Verification ownership, risks and scope limits

- Add focused regressions in the existing Sundrop `world.test.ts` / grid navigation owners (**authored corridor glyph invariants plus safe intended walk-line**, so restoring the old dirt path fails), `core/area-map.test.ts` (**fresh home-exit fog exception for only the active one-hop Oren hint**, inactive/completed and ordinary hidden-target negatives, clamped view including player + entrance), and a focused rendered Area Map test (**label + marker actually inside the displayed viewBox**). Reuse existing map/layout/navigation tests (door clearance), and scene/NPC, save and HUD tests (including both HudState scene producers). Do not copy map registries or build new frameworks.
- Playwright owner split: `Item Shop painted interior` is in **`exhaustive`**, `Hero House painted interior preserves runtime` is in **`flaky`**, and `gate` covers general gameplay. Run the focused owning tests and real keyboard acceptance. Route-helper flakiness alone is not proof of an authored collision bug.
- Required player proof: keyboard New Run → Oren/practice spear, visual door clearance, Mott/Tikka interaction and stale hint, ambient fallback, no table wedge, portrait fade (including common viewport breakpoints), no premature wallet values, and persisted slot time with clear units.
- **Risks:** A local 16px door edit may not match painted wall openings; a dirt path shifted only 32px below `b` can leave too little clearance; a flood-fill that ignores glyph authorship can pass with the wrong visible route; the Area Map can still crop the hint's text even if its center is technically inside the viewBox; a fog bypass applied to all quest markers would reveal secrets; and a fixed HUD overlap envelope may over-fade outside the actual responsive card. Verify these with current navigation and screenshots rather than hardcoding the reviewer’s suggested coordinates as facts.
- Keep **one Linear issue and one draft PR** for planning + subsequent implementation. Do not introduce global collision nudging, camera bounds insets, new image art/SFX, story dialogue, save schemas, compatibility layers or broad workflow machinery. If an art edit proves necessary, scope it to a separate art task.
- These remain planning documents: no gameplay implementation or test run is claimed.

