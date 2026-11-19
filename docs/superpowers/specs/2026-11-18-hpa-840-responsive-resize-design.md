# HPA-840 — Responsive interior camera, compact field HUD and scroll-safe menus (design)

**Linear:** https://linear.app/cwchanap/issue/HPA-840/fix-window-resizing-recentre-interiors-and-fit-the-hud-to-small  
**Source reviewed:** Gliese `main` at commit `745c06934c00ac664f0980ac7fa13780382cb775` (2026-11-18).  
**Delivery:** One ticket, one draft PR for design, plan, subsequent implementation and verification. This initial revision is documentation-only.  
**Visual reference:** The Linear attachment is a *failure/UAT recording*, not an approved target mockup. Use reproducible browser screenshots as visual evidence.

## Review reconciliation (PR #68, 2026-11-18)

**Review:** https://github.com/cwchanap/Gliese/pull/68#pullrequestreview-5967994112

All six review findings are accepted with one scope clarification: **Shop and Skill are regression targets, not a new redesign**. Existing shared window styling can affect them; make the smallest local fix only if the tests expose a failure. The camera resize handler only reapplies bounds; do not add a camera scroll/follow reconciliation layer. Persistent automated tests are the regression gate, and **MCP-driven E2E plus screenshots** remain mandatory acceptance evidence.

## Problem and current ownership

- `WorldScene.create()` computes `getCenteredCameraBounds(mapWidth, mapHeight)` once; after the viewport changes, small interiors can stay pinned to an old corner. `BattleScene` already demonstrates `scale.on('resize', ...)` and listener cleanup.
- The 640×360 field HUD currently still shows a minimap and full status. `FieldHud.svelte` and `GameShell.svelte` already contain short-height CSS at **559px**. **`core/hud-occlusion.ts` is a coupled TypeScript twin**: `heroCardZone()` decides when the hero card fades. Its old 326×148 compact zone and 412×240 desktop zone will become wrong if CSS changes without updating the zone and its tests.
- Whole-surface scrolling comes both from `.heroic-window` in `heroic-ui.css` (affecting Area Map, System and Skill) and from responsive overflow on the Quest, Save, Bag and Shop screens. Several screens explicitly disable internal scrolling. A short viewport can push titles/Back offscreen.
- HPA-841 already addressed Quest chain text wrapping; HPA-836 owns Escape/I/M and focus restoration. Preserve both.

## Chosen design

### 1. Reuse existing camera bounds on each resize

- Keep `Phaser.Scale.RESIZE`, `WorldScene.getCenteredCameraBounds()`, the current player-follow settings and existing world positions. No camera service, custom camera interpolation, zoom subsystem or saved viewport state.
- Capture the current map's pixel width and height inside `WorldScene.create()`. Attach one `this.scale.on('resize', onResize)` callback that **only** recalculates and sets the camera bounds with `getCenteredCameraBounds(width, height)` and `cameras.main.setBounds(...)`.
- Phaser's camera pre-render updates/clamps scroll to those bounds on its next rendered frame, including when only gameplay simulation is paused behind a menu. Do **not** manually reset `scrollX`, `scrollY`, follow offset or player position, or introduce a second resize listener.
- Unsubscribe that exact handler on `shutdown` and `destroy` in the existing scene cleanup closure; ensure restarts/transitions do not retain listeners from the previous map. Copy `BattleScene`'s lifecycle pattern.
- Test newly centred small interiors, a large room's normal clamping, resizing with a menu open, and subsequent transitions. The existing `scenes.test.ts` mock supports `scale.on/off`.

### 2. One compact HUD tier below 720px *and* matching hero occlusion

Reuse/refactor the **existing** `@media (max-height: 559px)` blocks in `FieldHud.svelte` and `GameShell.svelte` as the single **`max-height: 719px`** tier, instead of adding conflicting styles at two heights. Delete obsolete compact minimap styling. `CommandGrid.svelte` can retain its independent 559px layout because it is a different UI.

| Element | Normal (720px height or more) | Compact (719px or less) |
| --- | --- | --- |
| Hero | Portrait, name, level, HP, XP, attack, defence | Compact portrait + HP meter/value; retain name/level for assistive tech with visually-hidden text, not `display:none` on their only accessible copy |
| Minimap | Current minimap/card | Hide visually; preserve the existing **M** command to open Area Map |
| Active quest | Eyebrow, title, objective | One objective line only; if no active objective and the prologue is complete, show existing completion text |
| Wallet | Current coin chip | Compact unobtrusive chip |
| Menu | Existing visible chip and shortcuts | Move into unused upper-right minimap area; keep accessible/focusable and no overlap |

- Keep `HudState`, Phaser/Svelte event bridge and gameplay behaviour unchanged. No new reactive viewport store or `ResizeObserver`.
- Update `core/hud-occlusion.ts` and `core/hud-occlusion.test.ts` **in the same implementation commit area**: make `heroCardZone(viewWidth, viewHeight)` use the new <=719px compact dimensions, measured against the actual rendered card (including its top/left offset) with a small margin. Preserve the narrower/taller-portrait branch for screens above 719px.
- Regression-test 640×360, **1280×719** and **1280×720**: the `hud-party-panel` browser rectangle fits the corresponding TS `heroCardZone` and only heroes actually near the new card cause fade. Validate no false fade in the old 412×240 region.
- At 640×360 with commands closed, visible **non-overlapping** card/control rectangles (hero, quest, wallet, Menu and status) must remain onscreen and sum to **no more than one third** of the field area. Do not double-count their wrapper `hud-side-panel`; no generic union-area engine is necessary. Screenshot-check that the player and centre of the field remain usable.
- Preserve the existing taller 390×844 portrait treatment and desktop appearance, and validate Japanese/Traditional Chinese text wrapping.

### 3. Replace outer scrolling with bounded inner scrolling

Use the existing `heroic-ui.css` shared window owner **because this is genuinely shared**. Replace `.heroic-window`'s whole-window `overflow-y: auto` with bounded/clipped frame behaviour, with non-shrinking header and `min-height: 0` scrollable body. No new modal framework. For full-screen views, keep their existing `inset:0` frame, pin header and Back/Close, and scroll only their existing content collections.

- **QuestJournal:** delete/replace the <=900px whole-`.quest-screen` scrolling; preserve sticky title/Close and bounded quest entries/details. Do not change HPA-841 objective-chain wrapping.
- **SaveScreen (save/load):** remove whole-`.save-screen` scrolling and responsive `flex:none` overrides that force `.save-slots` to spill. Keep header/Back/footer, with an internally scrollable slot list and reachable third slot.
- **SystemScreen:** remove local `.heroic-rows { overflow: visible }` and short-height `.system-content { flex: none; min-height: auto }` overrides; reuse the existing shared `.heroic-rows` internal scrolling while keeping title/Back and rail accessible.
- **BagScreen (Gear/Bag):** remove responsive whole-`.bag-screen` scrolling rules; retain category tabs, title and Close while existing inventory/worn/detail content scrolls internally. Keep every equipment action accessible.
- **AreaMapScreen:** keep the map header/Close outside `.jrpg-area-map-body`, and size the SVG/body within remaining height. Test indoor/outdoor labels, fog and marker keyboard focus. **Reproduce** the reported oversized “The Wilds” label before changing it.
- **SkillScreen:** shared `.heroic-window` change must preserve its existing header/Back and scrollable content. Small local adjustments only if a focused regression test fails.
- **ShopScreen:** current responsive `.shop-screen` also scrolls as a whole. Include it in overlay regression tests; apply the same minimal scroll containment where necessary to keep purchase actions and Back visible. Do not change shop pricing/items/tooltip (HPA-839).
- Avoid wholesale deletion of a responsive rule if it controls more than scrolling; preserve layout/columns/focus, and remove only conflicting overflow and flex opt-outs.

### 4. Breakpoints and controls

- At 640×360 and at least one intermediate **1280×640**, verify no height-gap between compact HUD and the existing 559px/600px/719px/720px menu rules. Also check 1280×719 and 1280×720 on the HUD boundary, plus 1920×1080 and 390×844.
- No document/body scrolling; inner lists can scroll to their last actionable item without moving title and Back/Close, or stealing focus. Preserve Svelte keyboard/gamepad focus lattice and HPA-836 modal close behaviour.
- No art/SFX, new strings, content, save changes, general responsive framework or second PR.

## Acceptance and persistent regression coverage

**Acceptance is MCP-driven E2E on one web platform**, backed by **checked-in automated tests** in the current harnesses. Screenshots supplement, not replace, assertions. This avoids a one-off unrepeatable visual pass and meets the project's E2E acceptance requirement.

1. **Camera lifecycle regression — `scenes.test.ts`.** Extend the existing interior `setBounds` test: capture the registered `resize` handler via `scale.on` mock, modify `phaserState.mainCamera.width/height` (not just `scene.scale`), invoke the handler, verify new bounds; after scene shutdown verify `scale.off('resize', sameHandler)`. Confirm no stale listener after map/scene recreation.
2. **Bounded overlays — `GameShell.svelte.spec.ts`.** Extend existing `it.each` overlay table for Map, Save, Skill, Quest, System, Gear/Bag and Shop. At 640×360 and 1280×640, assert title and Back/Close stay within viewport before and after `scrollIntoView()` on the final focusable item; `document.scrollingElement.scrollTop === 0`; focus/accessibility remains correct. Repeat compact-case checks in Japanese; include zh-Hant as targeted wrapping validation.
3. **Real-game E2E — `tests/e2e/game.e2e.ts`.** Reuse `?startMap=` entries for guild-hall, hero-house and blacksmith-interior plus `installRuntimeProbes`/`__glieseActiveSceneCamera`. Live-resize 1280×720 → 1920×1080 → 640×360, assert camera `worldView` centering on axes where room is smaller than viewport, then move Grik. Extend the existing HUD-bounding-box test to verify at 640×360: hidden minimap; non-overlapping visible panels/controls; sum area <= one third; `M` still opens Area Map.
4. **Occlusion calibration — `core/hud-occlusion.test.ts` plus browser assertion.** Verify TS zone for the 719/720 height boundary and the browser-rendered card containment at 640×360, 1280×719 and 1280×720; no false fading where the old oversized card used to be.
5. **MCP E2E execution and screenshots.** Run the persisted browser scenarios through MCP on the web build with current interior assets, check all specified viewports and overlay controls, capture/attach screenshots before/after for centred rooms, compact HUD, Map, Save, Quest, System, Gear/Bag, Skill and Shop. No approved target UI mockup is attached to HPA-840: check against its written acceptance plus automated geometry, not human approval.
6. Existing typecheck, lint, unit, browser component and build checks must pass. CI asset/LFS restoration is a separate HPA-694 ticket; do not merge that work into this PR. Report any unavailable asset-dependent CI checks explicitly rather than claiming a pass.

## Files likely involved

`src/lib/game/phaser/scenes/WorldScene.ts`, `src/lib/game/core/{hud-occlusion.ts,hud-occlusion.test.ts}`, `src/lib/game/ui/{FieldHud,QuestJournal,SaveScreen,SystemScreen,BagScreen,AreaMapScreen,SkillScreen,ShopScreen}.svelte`, `src/lib/game/GameShell.svelte`, `src/lib/game/ui/heroic-ui.css`, and current tests `src/lib/game/phaser/scenes/scenes.test.ts`, `src/lib/game/GameShell.svelte.spec.ts`, `tests/e2e/game.e2e.ts`.

**Out of scope:** new art/SFX, content/text changes, old-map/LFS cleanup (HPA-694), battle tuning (HPA-837), unrelated menu/input redesign, new game data structures and save-format changes.
