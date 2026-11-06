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

## Decision: one focused implementation PR for this issue

The subsequent implementation continues **on the same HPA-760 PR**, after review of these planning docs. Fix player-visible contracts in the existing map, interaction, HUD, and save owners. Reuse current navigation generation, Svelte/Phaser bridge, story gates, shop identity, and slot storage. Do not split one Linear ticket into several PRs.

This work is not an opportunity for a general interaction framework, map authoring rewrite, autosave service, collision engine replacement, new quest routing system, or full UI restyle.

### 1. First-quest forge: discoverable, accessible, and correctly targeted

- Preserve the existing exterior-to-`blacksmith-interior` transition identity and Oren/practice-spear quest identity.
- Trace the **actual walkable** route from Grik's home/village path to the south-facing forge entrance at `sundrop-forge-door`. Check the neighboring hut/fence/tree clearance with the current player radius and grid mask. Adjust the minimum source-owned Sundrop cells/door approach only if keyboard repro proves a pinch or false-looking entrance.
- Ensure the art entrance, `f` anchor, and navigation mask agree. Do **not** enlarge a collision hole blindly beyond the drawn entrance. A real new/edited sprite must be a separate art task, not generated inside this gameplay fix.
- Add a useful first-quest entrance-level indication: when the active objective is to speak to Oren in an interior, the overworld shows the forge **door/entrance** as the intended destination, rather than treating all doors as indistinguishable gold circles. Prefer the current one-hop transition data and quest objective IDs; no generic multi-map route planner.
- Improve `AreaMapScreen` readability around the local village (e.g., a bounded, player-local default view with the existing full-world view retained as an overview if needed). Preserve keyboard/gamepad focus and visible marker labels. Keep the minimap focused, but distinguish the current quest entrance from ordinary door markers.

**Acceptance:** Starting a fresh New Run, a keyboard-only player talks to Mott, exits the house, identifies the forge destination, enters its real south door without side-shuffling/accidental neighbor-house entry, speaks to Oren, and receives the practice spear. An authored navigation check must show a reachable approach, but automated routing cannot replace the manual keyboard check.

### 2. Doorway collision matches visible openings

- Treat `VILLAGE_INTERIOR_LAYOUTS['hero-house']` as the geometry owner: front exit opening and bedroom divider opening, adjacent wall rectangles, live prop blockers, and exit trigger.
- Compare the painted visible passable band against the generated navigation grid and physical player-radius clearance. Adjust only the relevant wall/door/transition geometry; regenerate via `bun run world:generate:navigation` and commit the generated result if changed.
- Validate several reasonable approach offsets and both sides of each opening. The player should be guided through a visibly open doorway without needing a hidden one-pixel sweet spot.
- Preserve all map/transition/story IDs and untouched interiors.

**Acceptance:** A normal keyboard player crosses Hero House's exterior and bedroom doors both ways from multiple positions inside the *visibly open* band. Collision still blocks the painted solid walls. The existing interior navigation/round-trip tests stay green.

### 3. One truthful NPC target for prompt and E

- Replace the distance-only selection with a **small shared target resolver** that uses available NPCs in interaction range and favors the NPC in the player's facing direction; use stable proximity/ID tie breaking. Do not silently start a different NPC's dialogue after showing another NPC's “nearby” status.
- Reuse that resolver for HUD hint, shop proximity, and interaction. Refresh/clear a stale “X nearby” hint as target/facing/range changes; avoid republishing the entire HUD on every movement tick if nothing meaningful changed.
- Handle visually present `ambientNpcs` separately: pressing E while facing one can show a localized “They are busy / have nothing to say” fallback (without granting quest progress). Use “No one is nearby” only when no visible candidate is in useful range.
- Do not fabricate new story conversations or alter Rust-generated story content to solve ambient behavior.

**Acceptance:** With Mott and Tikka both in range, facing Tikka makes both the prompt and E select Tikka; facing Mott selects Mott. Outdoor and house ambient villagers no longer cause a demonstrably false “No one is nearby” line. Dialogue, shop, and quest-gate behavior stays intact.

### 4. Eliminate the living-room wedge using authored clearance

- Reproduce the pinch near Tikka's authored position and the living-table collider; check NPC circle + player radius + table edge, and nearby furniture.
- Prefer a small Tikka position or prop-collision adjustment that maintains her story role and walk-up interaction. Preserve room composition and decoration whenever possible.
- Check that a player can walk into **and back out of** reachable narrow locations; prevent isolated traps without weakening collision globally.

**Acceptance:** Keyboard movement in all four directions can escape the prior wedge from a real approach; Tikka remains reachable for conversation.

### 5. HUD and save-display truthfulness

- **Hero visibility:** When the player sprite's *screen position* overlaps the top-left portrait card, make the card yield (e.g., a controlled opacity reduction). Use the existing scene/UI bridge with an overlap boolean updated only on threshold changes, or an equally small current-owner solution. Do not push high-frequency world coordinates through the whole HUD merely to animate this class.
- **Initial gold:** Remove the copied 30G value from `ui-bridge/store.ts`; initialize from the authoritative 20G new-save wallet (or one existing shared content constant). A loading placeholder must not lie about the wallet.
- **Playtime:** First verify `resetPlaytime`, actual `buildSlotRecord` calls, and whether an idle run has no autosave after its first minute. If confirmed, use the **minimum** bounded checkpoint/lifecycle update needed to keep displayed *persisted* slot playtime credible; no per-frame disk writes, schema migration, or derived “live elapsed” mislabeled as already saved. Continue to preserve manual save semantics and Tauri flush guarantees.

**Acceptance:** Player remains visible while moving beneath the portrait, new-game loading and in-game gold agree, and a save slot written/reopened after a few minutes reflects elapsed time. Backgrounding/returning and manual vs. auto slot behavior must not duplicate elapsed time.

### 6. Fix shop E2E rename drift without changing the shop

- Update the old shop name in `tests/e2e/game.e2e.ts` (shop fixture and heading/dialog assertions; verify all occurrences).
- Assert the **visible canonical** “Mira's Herb Hut”, not a dynamically read value that would pass if the app silently renamed itself again.
- Do not rename the shop IDs, inventory state, items, buy/sell behavior, or dialogue contracts.

## Verification ownership and scope limits

**Smallest useful tests:** map/nav reachability and door clearance in existing map/layout/navigation owners; target-selection/ambient fallback unit or scene coverage; existing `tests/e2e/game.e2e.ts` for the first playable quest path and shop heading; save/HUD tests for startup wallet and persisted playtime.

**Critical proof:** a real keyboard play from new run through Mott → forge → Oren, plus Mott/Tikka and living-room wedge reproduction, observed with screenshots/video and noted viewport. A fake route-helper failure alone must not justify changing authored geometry.

**Guardrails:**
- One Linear issue, one draft PR that later contains its implementation.
- No new image art, SFX, NPC prose, rendering architecture, map compiler, global collision-radius change, save schema, or compatibility layer.
- Preserve the current `gate` / `exhaustive` / `flaky` Playwright ownership; don't make a previously quarantined route walk a blocking test without a stable real-player repro.
- If painted art itself must change, create a separate art-generation task later (reusing an available Graveyard ticket per project process) and keep code changes distinct.
- No claim that these fixes are implemented or validated by this document-only PR.
