# HPA-840 — Responsive interior camera, compact field HUD and scroll-safe menus (design)

**Linear:** https://linear.app/cwchanap/issue/HPA-840/fix-window-resizing-recentre-interiors-and-fit-the-hud-to-small  
**Source reviewed:** Gliese `main` at commit `745c06934c00ac664f0980ac7fa13780382cb775` (2026-11-18).  
**Delivery:** One ticket, one draft PR for design, plan, subsequent implementation and verification. This initial revision is documentation-only.  
**Visual reference:** The Linear attachment is a *failure/UAT recording*, not an approved target mockup. Use reproducible browser screenshots as visual evidence.

## Problem and current ownership

The prologue's interior camera bounds are calculated from map dimensions in `WorldScene.create()` using `getCenteredCameraBounds()`. Unlike `BattleScene.centerArena()`, `WorldScene` does not currently subscribe to Phaser's scale resize event. Consequently the bounds were correct at creation but can be wrong after a window grows, especially where a small interior should be centred with negative camera bounds padding.

The current field HUD is absolutely positioned in `FieldHud.svelte`. Its short-height media query reduces dimensions but still shows portrait, HP, XP, stats, a minimap, full quest text and wallet. `GameShell.svelte` moves the Menu chip inward to avoid the minimap, consuming more scarce horizontal space.

The existing Svelte menu screens mix internal scrolling with scrolling/clipping of the entire screen: `QuestJournal` becomes full-screen scroll at <=900px; `SaveScreen` scrolls its whole surface; `SystemScreen` has unconstrained rows at short heights; `BagScreen` has a scrolling root in responsive layouts; `AreaMapScreen` already has an internal scroll region but its shared outer window may also scroll. This can move the page title and Back control out of sight. HPA-841 has already addressed Quest step-chain text wrapping; do not redo that ticket.

## Chosen design

### 1. Resize the *existing* WorldScene camera, not the world

- Keep `Phaser.Scale.RESIZE`, the existing camera follow and `getCenteredCameraBounds(width, height)`. Do not introduce a camera service, separate interior scene, zoom system or saved viewport state.
- On each `WorldScene.create()`, capture the active map dimensions (`map.width * tileSize` and `map.height * tileSize`) and install one `scale.on('resize', callback)` that reapplies the calculated bounds for the new canvas viewport.
- Immediately reconcile the camera position/follow target so an interior appears centred even while paused and on the first rendered frame after resize. A small map should be centred without exposing blank margins; a large map should retain follow/clamping behavior. Do not overwrite the player's world position.
- Remove that precise listener on `shutdown` and `destroy` alongside the existing cleanup. Map transitions and story-gate restarts re-register for the newly active map, not an obsolete map's dimensions. Avoid duplicate listeners.
- Reuse the same centering policy on initialization and subsequent resize. Do not change overworld or battle camera policies unless the regression tests reveal an actual breakage.

### 2. Compact *existing* field HUD below 720 px viewport height

Use a CSS-only compact presentation on `FieldHud.svelte` (the source `HudState` and existing bridge stay unchanged):

| Element | Normal-height field | Compact field (height < 720px) |
| --- | --- | --- |
| Hero card | Portrait, name, level, HP, XP, ATK, DEF | Small portrait + HP bar/value only; hide XP, extra stats, name and level badge visually |
| Minimap | Current medallion and location label | Hide the medallion/card; the existing **M** shortcut still opens Area Map |
| Quest banner | Eyebrow, title and objective | Objective line only when active; for a completed prologue without objective, show the existing completion text |
| Wallet | Existing coin display | Keep, but compact to a non-overlapping corner chip |
| Menu | Existing visible button and keyboard glyph | Move to clear top-right space freed by hiding minimap; keep accessible button, keyboard/pad hints and focus behavior |

- Keep `CommandGrid`'s separate compact behavior and the HPA-836 Escape/I/M pathways untouched. Do not hide a running battle HUD.
- At 640x360 with the command grid closed, the union of visible field HUD panels must obstruct no more than one third of the rendered field area. Compute bounding rectangles in the automated browser check, and verify the screenshot shows usable gameplay space, including the player.
- Menu, HP, quest, wallet, dialogue and status must not collide. Avoid adding a reactive viewport store or JS layout measurements; use existing Svelte markup plus scoped height media queries.
- Preserve readable contrast and existing localization/wrapping for all supported languages.

### 3. Bound menu surfaces to the game viewport; scroll content, not navigation

Preserve the current full-bleed Heroic aesthetic and each screen's focus/close handlers. Where a screen uses the entire viewport, `inset: 0` already bounds it; for the Area Map dialog, `max-height: calc(100vh - 2rem)` already bounds the frame. Fix internal layout/overflow rather than introducing a shared modal framework.

- **Quest:** Keep title and Close permanently visible in a compact header/navigation region; give quest entries, chapter information and details their own bounded scroll region as needed. Do not restore the old horizontal overflow of objective chains; HPA-841 owns its wrapping rules.
- **Save/Load:** Header (including Back) and footer/confirmation remain visible. Make the save-slot collection the scrolling body, not the entire full-bleed screen. The third slot must remain reachable at 640x360 with pointer, keyboard and pad navigation.
- **System:** Keep the title/Back region and category access reachable; bound `heroic-rows` as the internal scroll area. Preserve existing preference behavior and rail focus lattice.
- **Gear/Bag:** Reuse `BagScreen`; keep category/Close controls and the title accessible at short heights. Let the inventory grid, worn equipment and detail panels scroll internally where needed, without moving the full screen or trapping action buttons below a clipped edge.
- **Area Map:** Keep the header/Close outside `.jrpg-area-map-body`, bound the SVG and marker/legend section to available body space, and ensure the indoor and outdoor local views fit both 640x360 and 1920x1080. The earlier report of cropped indoor map / oversized “The Wilds” label is *unverified*: reproduce first, then adjust only existing SVG sizing/marker-label scaling if needed. Do not change map geometry, exploration/fog data, marker IDs or coordinate mapping.
- Favor local CSS changes in the affected Svelte files; touch `heroic-ui.css` only for a rule truly shared across screens.

### 4. Focus, responsiveness and narrow scope

- On opening/resizing an overlay, its close button remains visible and clickable without browser-page scrolling. List navigation may scroll *inside* that overlay; keyboard/pad focus targets may be scrolled into view.
- A 640x360 viewport is the lower supported UI target. At 1280x720 and 1920x1080 preserve existing spatial hierarchy and desktop appearance.
- Use CSS `min-height: 0` on flex/grid children with internal overflow and `flex: none` on fixed headers/footers as appropriate. No new Svelte stores, resize observer, overlay router, saved preferences, game content, images, audio or translations are required.
- Work only within this single PR; implementation and tests get added to this branch after design review. No compatibility layer is required for a hobby project without released users.

## End-to-end acceptance contract (to execute during implementation)

All criteria must be verified by **MCP-driven browser E2E** using the real game and supported one-platform web build (cross-platform code only). Capture screenshot artifacts and assert DOM/Phaser geometry; do not rely on human sign-off.

1. Starting inside Hunters' Lodge, Grik's house and the forge at 1280x720, resize to 1920x1080, then down to 640x360 and back. Each interior stays centred according to the room's dimensions and the player's camera follow; no top-left pinning or blank margins, and Grik can move after each resize.
2. At 640x360 and command closed, the minimap is not visible; portrait + HP and one objective line remain; Menu is accessible and does not overlap other HUD panels; at least 2/3 of the viewport remains unobstructed by HUD panels. `M` still opens/closes Area Map.
3. At 640x360, open Quest, Save, System, Gear, Bag and Area Map through the existing UI; in each, title and Back/Close remain in the viewport while scrolling any list to the final item. Save slot 3 and all System option controls are reachable, operable and focus-visible. Document/body itself does not scroll.
4. At 640x360 and 1920x1080, the indoor and outdoor Area Map local views, legend and exit labels are not clipped, and marker navigation remains operational. Validate the previously reported oversized “The Wilds” label if reproducible.
5. Screenshots at each viewport show the intended hierarchy. Because no target mockup is attached to HPA-840, automated screenshot/DOM geometry checks are the visual oracle; store or attach screenshots to the PR. Existing 1280x720 controls, keyboard/pad focus behavior and overworld/battle resizing do not regress.
6. Existing unit, component-browser, type, lint, build and relevant Playwright E2E checks pass. The repository's broader CI E2E/LFS restoration belongs to HPA-694; use a working asset-equipped MCP browser environment for HPA-840's E2E evidence and report any external asset blocker explicitly.

## Files likely involved

`src/lib/game/phaser/scenes/WorldScene.ts`, `src/lib/game/ui/FieldHud.svelte`, `src/lib/game/GameShell.svelte`, `src/lib/game/ui/{QuestJournal,SaveScreen,SystemScreen,BagScreen,AreaMapScreen}.svelte`, and targeted tests (`src/lib/game/phaser/scenes/scenes.test.ts`, `src/lib/game/GameShell.svelte.spec.ts`, existing screen component specs, `tests/e2e/game.e2e.ts`).

**Out of scope:** new art/SFX, content/text changes, old-map/LFS cleanup (HPA-694), battle tuning (HPA-837), unrelated menu/input redesign, new game data structures and save format changes.
