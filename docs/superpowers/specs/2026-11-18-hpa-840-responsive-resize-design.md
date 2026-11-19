# HPA-840 — Responsive interior camera, compact field HUD and scroll-safe menus (design)

**Linear:** https://linear.app/cwchanap/issue/HPA-840/fix-window-resizing-recentre-interiors-and-fit-the-hud-to-small  
**Source reviewed:** Gliese `main` at commit `745c06934c00ac664f0980ac7fa13780382cb775` (2026-11-18).  
**Delivery:** One ticket, one draft PR for design, plan, subsequent implementation and verification. This initial revision is documentation-only.  
**Visual reference:** The Linear attachment is a *failure/UAT recording*, not an approved target mockup. Use reproducible browser screenshots as visual evidence.

## Review reconciliation (PR #68, 2026-11-18)

**Review:** https://github.com/cwchanap/Gliese/pull/68#pullrequestreview-5967994112

All six first-review findings remain accepted. **Skill is a regression target** for the shared-window change; **Shop requires the smallest short-landscape scroll-containment fix** after the second review exposed a concrete issue. Neither warrants a broader UI redesign. The camera resize handler only reapplies bounds; do not add a camera scroll/follow reconciliation layer. Persistent automated tests are the regression gate, and **MCP-driven E2E plus screenshots** remain mandatory acceptance evidence.

## Second design review reconciliation (2026-11-18)

[Latest PR #68 review](https://github.com/cwchanap/Gliese/pull/68#pullrequestreview-5968584846) identified three valid interactions omitted from the first revision:

1. **Competing HUD queries and Menu overlap:** The `@media (max-width:832px) and (min-height:560px)` field layout also applies at 560–719px and overrides the intended compact positioning. Raise its `min-height` to 720px. Once the minimap is hidden, put the right-hand quest/wallet HUD **below** the top-right Menu (measure the actual localized Menu button).
2. **Short landscape menu geometry:** At 640×360, preserving <=900px vertical stacking while removing outer scrolling **clips** Bag/Quest and Shop; Save also needs explicit inner slot overflow and fixed header/footer. Use short-landscape horizontal/column containment with bounded internal scroll; retain existing narrow-portrait behaviour. Cover Bag's existing Equipped-badge clipping test and Quest's seven-step checklist.
3. **Avoid duplicate acceptance execution:** First write persisted Vitest/Playwright regressions, then execute those same cases using the available **MCP-driven browser/test workflow** and capture screenshots during the E2E run. Do not require a separate MCP baseline pass and a second parallel manual E2E acceptance pass.

All three are adopted. The proposed **CLI-only replacement** for MCP is not adopted: project acceptance still requires an MCP-driven end-to-end run. This is a single execution path using the existing harness, not two different test suites or two manual sessions.

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

- Keep the single <=719px compact field tier in **the existing** `FieldHud.svelte` and `GameShell.svelte` short-height blocks, plus the matching `core/hud-occlusion.ts` zone. Do not layer another query over them. Raise `FieldHud.svelte`'s narrow-portrait `(max-width:832px) and (min-height:560px)` rule to `(max-width:832px) and (min-height:720px)`, so 560–719px widths do not activate competing flex/absolute positioning. `CommandGrid` can retain its independent 559/560px rule.
- **Hero:** show compact portrait and HP meter; visually hide name/level (retain accessible name/level), XP and stats. Size `heroCardZone()` to the measured visible hero card including top/left offsets, with a minimal margin, to prevent false fades. Pin 640×360, 1280×719, and 1280×720 with CSS/TS contract assertions.
- **Minimap:** hide `.minimap-card` under 720px, remove now-dead short-height medallion sizing. `M` continues opening the full Area Map.
- **Quest/wallet and Menu:** keep active objective (or completed-prologue text), plus compact coin chip. Move Menu into the top-right area freed by minimap, and position `.heroic-side-hud` **below Menu's bottom** rather than letting the quest banner/wallet jump into the same top-right slot when minimap disappears. Inspect actual `en`, `ja`, `zh-Hant` button sizes at 640×559, 640×560, 832×560, 833×560 and 1280×719/720; non-overlap is mandatory.
- At 640×360 with commands closed, all distinct visible HUD/control rectangles remain onscreen, do not overlap, and sum to <=1/3 of the field area. Do not count an outer wrapper and its children twice. Preserve 390×844 portrait and 1280×720 desktop baselines.

### 3. Replace outer scrolling with bounded inner scrolling

Maintain the current Heroic UI components and focus system. Fix `.heroic-window` **once** in `heroic-ui.css`: clip/bound the frame and let its existing child content scroll, not the frame. Set the real per-screen header to `flex:none` and scrollable child to `min-height:0`; there is no universal header direct child to pin, so verify `.system-header`, `.jrpg-area-map-header`, and `.skill-header` individually.

**Short landscape (especially 640×360) cannot fit three vertically stacked full-sized content regions.** Prefer horizontal/side-by-side columns with compact rail widths, margins and internal scrollers. The minimal change is to **override existing narrow-width column stacking only when height <=719px and the viewport is landscape** (e.g. `(max-height:719px) and (min-aspect-ratio:1/1)`), or equivalently gate it so both portrait and taller narrow screens retain their current layout. Do not accidentally alter the existing 832×760 or 390×844 stacked compositions. Verify actual CSS before choosing widths; fixed 25rem/23rem sidebars cannot fit a 640px canvas.

- **QuestJournal:** `.quest-rail-close` is at the **bottom of the rail**, not in its header. In landscape, keep rail and detail side-by-side with a bounded rail; scroll `.quest-rail-entries` and `.quest-chapter` internally, keep Close fixed at the rail bottom, and scroll `.quest-detail` independently. Do not keep the old <=900px `.quest-screen { flex-direction:column; overflow-y:auto }` + `.quest-detail {flex:none}` in 640×360. Preserve all seven localized chapter rows and HPA-841 chain wrapping. If portrait stacks, retain title/Close reachability without hiding detail.
- **BagScreen (Bag/Gear):** at 640×360, preserve compact landscape columns (or an equally compact two-region arrangement) with **narrow, measured widths** for rail and side; `.bag-main` must have a usable grid width. Remove full-screen scroll and the conflicting `flex:none`/stacking styles for this landscape only; make `.bag-grid-scroll` and the worn/detail content scroll internally. The 6.6rem item slot, slot-position label, equipped badge, worn-remove controls and detail action must stay usable. Preserve the existing 390×844 portrait arrangement; don't change inventory data or create a second UI.
- **ShopScreen:** this is a **known fix**, not merely speculative regression. Its <=1200px/short-height rule stacks a 14rem merchant portrait plus stock grid and detail, pushing Close/header offscreen at 640×360. Keep a compact landscape arrangement with narrow rail, stock grid and detail scroll; reduce/hide purely decorative merchant portrait if necessary while retaining merchant name, currency, Buy/Sell tabs and Close. Preserve buy/sell actions, tooltips and stock behaviour (HPA-839 remains separate). Existing `shopGridColumns` (`max-width:640px` → 3) must match the actual rendered stock columns; if CSS column count changes, update the existing MediaQuery/focus lattice in place, not a new navigation model.
- **Save/Load:** make `.save-slots {overflow-y:auto; min-height:0; flex:1}` explicitly; remove root `.save-screen {overflow-y:auto}` and responsive `.save-slots {flex:none}` opt-outs. Set `.save-header` and `.save-footer` to `flex:none` so the title, Back, status and overwrite confirmation remain visible. Scroll to slot 3 inside the list.
- **System:** remove `.heroic-rows {overflow:visible}` / `.system-content {flex:none}` opt-outs. Keep `.system-header {flex:none}` and category access visible; scroll `.heroic-rows` internally.
- **Area Map/Skill:** keep `.jrpg-area-map-header` / `.skill-header` non-shrinking and bound map/skill contents beneath them. Reproduce the reported oversized *The Wilds* label before editing markers. Keep Area Map fog, marker focus and both indoor/outdoor views intact.
- **Responsive changes elsewhere:** favor targeted CSS deletions/overrides rather than globally removing a rule that also owns columns or focus. Use CSS no more complex than needed for short-landscape and portrait separation.

### 4. Breakpoints and controls

- Validate existing 559/560, 600/601 and new 719/720 boundaries: `640×559`, `640×560`, `832×560`, `833×560`, `1280×640`, `1280×719`, `1280×720`, `1920×1080`, and 390×844 portrait. Keep `CommandGrid`'s independent 559px behaviour.
- No document/page scrolling; lists scroll to their last actionable item **inside** the visible menu without moving title and Back/Close. Preserve keyboard/pad focus, Svelte event wiring and HPA-836 return paths.
- No art, SFX, translations, additional runtime systems, camera service or extra PR.

## Acceptance and persistent regression coverage

Write and commit failing tests **before** layout changes. Reuse the existing tests and run them once through **MCP-driven execution of the checked-in Vitest-browser / Playwright end-to-end scenarios**. Screenshots are collected during that run, not from a separate manually repeated pass. Only a single web platform is required (no platform-specific code).

1. **Camera regression — `scenes.test.ts` and `game.e2e.ts`:** Capture the registered WorldScene `resize` handler, change camera width/height, assert `setBounds` and `scale.off('resize', same handler)` after shutdown. Using existing `?startMap=`/camera runtime probes, live-resize guild-hall, hero-house, blacksmith-interior 1280×720 → 1920×1080 → 640×360 and move the hero after each.
2. **HUD + occlusion regression — `GameShell.svelte.spec.ts`, `hud-occlusion.test.ts`, `game.e2e.ts`:** Assert compact card/TypeScript zone match and no false fades at 640×360, 1280×719/720; update the existing 833×560/832×560/640×560/640×559 localized Menu/hud-minimap geometry table to expect hidden minimap at <720 and non-overlap with side-hud/quest/wallet. Extend mobile-HUD E2E to assert <=1/3 distinct HUD area, Menu and objective visible, `M` map works. 390×844 normal portrait behaviour unchanged.
3. **Overlay regression — `GameShell.svelte.spec.ts` plus `BagScreen.svelte.spec.ts`:** Use per-overlay opener helpers: CommandGrid for Map/Save/Skill/Quest/System/Bag/Gear; open Shop with a populated `HudState.shop` fixture. At 640×360, 1280×640 and at 560/719 boundary viewports, assert heading and Back/Close remain in viewport while `scrollIntoView` reaches the last action, `document.scrollingElement.scrollTop===0`, and actions/keyboard focus work. Keep the existing `BagScreen` equipped label/badge and worn-remove visibility assertions and QuestJournal seven-row locale tests; update them to assert **scroll-to-reach** not all long lists simultaneously visible.
4. **Visual screenshots:** Capture inside the persisted Playwright end-to-end run: interior before/after resize, compact HUD and the bounded overlays, indoor/outdoor Map at 640×360 plus representative intermediate/desktop sizes. Compare to Linear's written requirements (its attached UAT is failure footage, not an approved mockup) and include evidence in this PR. Japanese and Traditional Chinese labels must not clip.
5. **Build gates:** Unit/Svelte browser specs, Playwright E2E, typecheck, lint and build must pass. Run the end-to-end acceptance with MCP invoking the existing harness (or driving the equivalent real-game browser checks) and save screenshots **without running a duplicate independent manual test suite**. HPA-694 separately owns LFS/CI restoration; report unavailable assets as a blocker rather than claiming success.

**No test execution or visual acceptance is claimed in this planning revision.**

## Files likely involved

`src/lib/game/phaser/scenes/WorldScene.ts`, `src/lib/game/core/{hud-occlusion.ts,hud-occlusion.test.ts}`, `src/lib/game/ui/{FieldHud,QuestJournal,SaveScreen,SystemScreen,BagScreen,AreaMapScreen,SkillScreen,ShopScreen}.svelte`, `src/lib/game/GameShell.svelte`, `src/lib/game/ui/heroic-ui.css`, and existing regression owners `src/lib/game/phaser/scenes/scenes.test.ts`, `src/lib/game/GameShell.svelte.spec.ts`, `src/lib/game/ui/BagScreen.svelte.spec.ts`, `tests/e2e/game.e2e.ts`.

**Out of scope:** new art/SFX, text/gameplay changes, HPA-694 LFS/CI restoration, HPA-837 battle tuning, HPA-839 shop prices/stock, HPA-836/841 redesign, new framework or save migration.
