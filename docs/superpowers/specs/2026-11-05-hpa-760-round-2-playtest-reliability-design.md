# HPA-760 — Round 2 Human Playtest Reliability Design

**Issue:** https://linear.app/cwchanap/issue/HPA-760  
**Baseline inspected:** `main` at `39a9e5b5ce460abde3e9114f3a5f9cee7022c55c` (2026-11-02)  
**Status:** Design proposal only; no gameplay implementation in this planning PR.

## Problem and evidence boundary

The November 4 round-2 keyboard playtest found a first-quest wayfinding failure (forge), two visually wider-than-traversable Hero House doorways, misleading E-key targeting/fallback, an NPC/table trap, hero occlusion under the HUD, and wallet/playtime display discrepancies. The same ticket also records outdated shop-name E2E expectations.

The forge report was produced in a headless setup and **does not prove a true soft-lock**. Treat it as a strong first-quest usability failure: a normal player must be able to identify the correct building, approach its door, enter, and speak to Oren without coordinate hunting. Before changing the collision layout, reproduce by a normal keyboard walk and capture the approach/transition.

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
| Loading HUD shows 30G for a 20G new run | `ui-bridge/store.ts` hardcodes 30; `save/save-state.ts` creates a 20G wallet | Confirmed duplicated initial-value bug. Derive the loading value from the new-save source. |
| Load picker keeps 00:00 | `save/playtime.ts` counts live seconds; `WorldScene.buildSlotRecord` samples only when writing; `ui/SaveScreen.svelte` reads the last stored slot duration | Likely stale save metadata when a run continues without a later save. Reproduce across actual saves before changing persistence cadence. |
| Shop E2E expects “Mira's Item Shop” | `tests/e2e/game.e2e.ts` has old name in shop fixture plus heading/dialog assertions | Test-only rename drift: preserve current product-facing “Mira's Herb Hut”. |

**Review evidence addendum (2026-11-05):** `resolveMovementSegment` is axis-separated and does not assist sideways movement toward narrow doorways; existing E2E comments describe 16px clearance-eroded door lanes. `findNearbyNpc` already serves prompt, shop, and E, but chooses by distance and can leave a stale “X nearby” status when a non-shop target disappears. The entire overworld is displayed in `AreaMapScreen` while the minimap uses a player-local viewport. `formatPlaytimeSeconds` is `h:mm` rather than `mm:ss`. The 30G initial HUD placeholder is used for Continue too, so changing it to 20G alone is insufficient.

The forge `f` is near the neighbor-house `b` door; automatic triggers fire within player radius + 18px, but existing anchor reachability ignores door triggers. A trigger-avoiding route check is justified. **Do not assume every route necessarily crosses `b` without proving it**; the walkable glyph grid has other approaches. Global corner nudging and camera padding are hypotheses to test, not mandatory fixes without regressions/visual checks.

## Decision: one focused implementation PR for this issue

The subsequent implementation continues **on the same HPA-760 PR**, after review of these planning docs. Fix player-visible contracts in the existing map, interaction, HUD, and save owners. Reuse current navigation generation, Svelte/Phaser bridge, story gates, shop identity, and slot storage. Do not split one Linear ticket into several PRs.

This work is not an opportunity for a general interaction framework, map authoring rewrite, autosave service, collision engine replacement, new quest routing system, or full UI restyle.

### 1. First-quest forge: discoverable, accessible, and correctly targeted

- Preserve forge exterior/interior transition and Oren/practice-spear IDs. Test a real keyboard path from Grik's home to the south-facing `sundrop-forge-door` (`f`) **without automatically entering** neighbor hut `sundrop-neighbor-hut-2-door` (`b`). Account for player clearance, the 30px automatic door trigger and current story gates.
- Extend the existing navigation reachability helper only if useful to avoid specified **active unrelated door triggers**. Test forge and currently important Sundrop entrances; don't impose a universal “never cross any door trigger” invariant on future maps where chained transitions may be intended. Check for an existing safe route before relocating a hut/path; adjust minimal Sundrop cells only if genuinely needed.
- Existing door markers in `core/area-map.ts` already have labels. Make the active `talk-to-npc` objective highlight a one-hop entrance transition when its eligible target NPC lives in a directly connected interior (`maps[toMapId]` after `applyStoryGates`), instead of showing no objective marker on the overworld. Keep the current quest entrance visually distinguishable on the minimap from ordinary circles; no route-planner.
- Reuse `FieldHud`'s existing clamped local minimap viewBox math through a small pure shared helper in `core/area-map.ts`, with an appropriate larger local span for `AreaMapScreen`. Preserve accessible marker labels and keyboard/gamepad focus. No general zoom/pan system or new artwork.

**Acceptance:** Fresh keyboard New Run → Mott → home exit → forge approach **without accidental neighbor transition** → Oren → practice spear, supported by a trigger-aware navigation regression. Don't call the headless report a proven soft-lock.

### 2. Narrow doors: test a shared movement fix before editing every layout

- Clearance-eroded 16px navigation cells and the axis-separated `resolveMovementSegment` explain why a visually 64px door can feel like a narrow alignment puzzle. Test a small, **bounded corner nudge** in the existing pure `core/navigation.ts` as a first candidate instead of changing Hero House and every later room separately.
- Only for blocked *cardinal* input, probe nearby offsets of at most ~16–20px and move laterally by **no more than the normal frame step** if the lateral sweep **and the intended forward sweep** both remain collision-safe. Do not nudge across painted walls, toward an unintended doorway trigger, around dead ends, or while ordinary movement succeeds.
- Write pure navigation tests for legitimate door lanes, solid walls, corners, ambiguous offsets, NPC/prop blockers, and diagonal/zero input. Since `WorldScene` also uses the resolver outdoors, recheck overworld movement and all relevant route-walking E2E projects.
- If actual visible Hero House bedroom/exterior openings still disagree with traversal after a safe nudge, minimally adjust `VILLAGE_INTERIOR_LAYOUTS['hero-house']`'s source geometry and regenerate navigation; do not change global player radius.

**Acceptance:** Both doors work from reasonable visible offsets in both directions without allowing clipping. Global nudge is **conditional on reproducing the problem and proving safe behavior**.

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

- **Portrait occlusion:** First visually evaluate a minimal top-left camera bounds inset in `WorldScene.getCenteredCameraBounds`; it may expose large blank margins in small rooms, so don't assume this is the solution. If it degrades presentation, prefer a narrowly scoped fading/opacity behavior for `FieldHud`'s portrait card on actual screen overlap, with an explicit owner for Phaser player screen coordinates and responsive DOM card rectangle. No continuous full-HUD event stream or broad HUD rewrite.
- **Startup gold:** `ui-bridge/store.ts` is provisional for both New Run and Continue. Hide `FieldHud` numeric values (or FieldHud itself) until `hudState.ready` so neither a new 20G wallet nor a resumed 150G wallet flashes the wrong figure. Preserve a truthful loading indication and current command disabled state.
- **Playtime:** `getPlaytimeSeconds` feeds `WorldScene.buildSlotRecord` on existing autosaves/manual saves; first check whether the repro used `?startMap=` (which suppresses save writes), which slot was viewed, the last real write, headless clock, and the `h:mm` formatter (`00:04` means 4 minutes). Prefer visible explicit hour/minute units if the stored value is correct. **Do not add a timer-driven autosave or new schema** unless a normal-run reproducible missing persistence path justifies it.
- Keep existing manual save/Tauri flush guarantees.

**Acceptance:** Hero remains visible in the top-left without distorting small interiors, both New Run and Continue show only authoritative wallet values, and a freshly written slot displays understandable persisted elapsed time.

### 6. Fix shop E2E rename drift without changing the shop

- Fix stale `Mira's Item Shop` strings in `tests/e2e/game.e2e.ts` (fixture, heading and dialog name), explicitly asserting the current visible `Mira's Herb Hut`. Preserve IDs, inventory, buy/sell behavior, and authored dialog.
- Other `Mira's Item Shop` occurrences in `src/lib/game/GameShell.svelte.spec.ts` are caller-supplied HudState fixture names, **not necessarily production rename drift**; avoid unrelated fixture churn.
- The painted Item Shop case belongs to Playwright **`exhaustive`**, not `gate`. Run its targeted E2E plus any relevant gate shop tests.

## Verification ownership, risks and scope limits

- Add focused pure regressions to `core/navigation.test.ts` (only if the global nudge proves useful), existing Sundrop `world.test.ts` / grid navigation tests (avoid unintended transition triggers), `core/area-map.test.ts` (local viewBox and Oren one-hop marker), and existing scene/NPC, save and HUD tests. Avoid parallel test frameworks or copied map-ID inventories.
- E2E ownership matters: `Item Shop painted interior` runs in **`exhaustive`**; `Hero House painted interior preserves runtime` is in **`flaky`**, while `gate` covers the general gameplay suite. After any global movement change, run `gate`, `exhaustive` and `flaky` and triage flaky route-helper failures against manual keyboard behavior, not just automation.
- Required final evidence: genuine keyboard New Run → Oren and practice spear, Hero House door clearance, Mott/Tikka interaction, ambient fallback, no table wedge, player visibility, correct loading/readied wallet, and persisted playtime with explicit units.
- **Risks:** Global corner nudges can alter all route walks and may accidentally activate doors if not sweep-tested; camera padding can expose painted-background margins; a universal “all other door triggers must be avoided” rule can reject intentional future transitions. Keep these conditional and focused.
- Keep **one Linear issue and one draft PR** for planning + subsequent implementation. Do not create new art, SFX, dialogue scripts, broad navigation frameworks, save schema changes, compatibility branches, or extra approval scaffolding. If artwork itself needs generation, scope it in a **separate art task**.
- These are planning docs; no gameplay implementation or test run is claimed.

