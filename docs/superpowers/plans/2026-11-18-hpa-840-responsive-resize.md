# HPA-840 — Responsive interior camera and compact HUD implementation plan

**Design:** [HPA-840 responsive resize design](../specs/2026-11-18-hpa-840-responsive-resize-design.md)  
**Linear:** https://linear.app/cwchanap/issue/HPA-840/fix-window-resizing-recentre-interiors-and-fit-the-hud-to-small  
**Base inspected:** `main` at `745c06934c00ac664f0980ac7fa13780382cb775` (2026-11-18). Recheck the latest `main` before coding.  
**PR policy:** **Exactly one PR for HPA-840.** This draft PR contains the spec and plan now. Add implementation, tests and screenshots to **this same branch/PR**; do not open a second implementation PR.  
**Current state:** Plan only; no implementation, CI execution, browser E2E, or screenshot verification has been performed.


**Review reconciled:** https://github.com/cwchanap/Gliese/pull/68#pullrequestreview-5967994112 (all six findings adopted with Skill/Shop restricted to regression/smallest necessary fixes).
**Second review reconciled:** https://github.com/cwchanap/Gliese/pull/68#pullrequestreview-5968584846. Three valid follow-ups addressed: conflicting 560–719px HUD rules, unworkable 640×360 vertical menu stacks, and duplicate acceptance passes. The review's CLI-only proposal is adapted to retain MCP-driven E2E acceptance while reusing one persisted Playwright/Vitest execution path.

## Design constraints

- Reuse Phaser 4 `WorldScene` camera bounds, Svelte 5 components, GameShell input/overlay, `HudState`, existing focus lattice and CSS. This is a layout/lifecycle fix, not a UI rewrite.
- One <=719px compact field HUD tier **and** a matched `heroCardZone` occlusion twin. Raise `FieldHud`'s older `(max-width:832px) and (min-height:560px)` rule to min-height 720px so the two position policies do not both apply. Keep CommandGrid's independent <=559px rule.
- For short **landscape**, keep Bag, Quest and Shop in constrained parallel columns with internal scrolling; do not vertically stack 3 large full-sized sections in a 360px-tall viewport. Retain portrait stacking as appropriate for 390×844.
- Keep HPA-836 Escape/I/M and focus, HPA-841 quest wrapping, HPA-839 shop business rules and HPA-694's LFS/CI restoration outside this ticket. No art, SFX, text changes, save changes, new library or second PR.
- Persist regression scenarios in existing Vitest/Playwright tests and use **MCP to execute the end-to-end acceptance** on the same web test harness, collecting screenshots there. Do not create a second parallel manual browser pass.

## File ownership

| File | Minimal change |
| --- | --- |
| `src/lib/game/phaser/scenes/WorldScene.ts` | Register one resize callback after startFollow, reapply `getCenteredCameraBounds`, unregister in cleanup |
| `src/lib/game/core/hud-occlusion.ts` + `.test.ts` | Size compact `heroCardZone` to actual CSS card at <=719px; guard 719/720 transition and false fades |
| `src/lib/game/ui/FieldHud.svelte` | Reuse existing short-height tier at <=719; **raise portrait min-height 560 → 720**; hide minimap; put quest/wallet below Menu |
| `src/lib/game/GameShell.svelte` | Relocate Menu in compact tier; preserve key/pad handlers, verify localized glyph geometry |
| `src/lib/game/ui/heroic-ui.css` | Bound shared `.heroic-window`; inner scroll only, no global modal framework |
| `src/lib/game/ui/QuestJournal.svelte` | Short-landscape side-by-side rail/detail, chapter/entries/detail inner scroll, fixed rail Close |
| `src/lib/game/ui/BagScreen.svelte` | Compact landscape rail/main/side with usable grid width; bounded worn/grid/detail regions; portrait stack preserved |
| `src/lib/game/ui/ShopScreen.svelte` | **Required** short-landscape compact rail/stock/detail fix, not optional; preserve Buy/Sell, shop actions and focus grid |
| `src/lib/game/ui/SaveScreen.svelte` | `save-slots` explicitly `overflow-y:auto`, fixed header/footer; no root scroll |
| `src/lib/game/ui/SystemScreen.svelte` | Remove local overrides disabling row scroll; fixed header/Back |
| `src/lib/game/ui/AreaMapScreen.svelte` | Fixed header; bounded map content; label changes only on reproduced bug |
| `src/lib/game/ui/SkillScreen.svelte` | Fixed header and shared window scroll-regression check; minimum local adjustment |
| `src/lib/game/phaser/scenes/scenes.test.ts` | Extend existing camera bounds and scale listener tests |
| `src/lib/game/GameShell.svelte.spec.ts` | **Update existing** 833×560/832×560/640×560/640×559 localized HUD tests and overlay table with Shop-specific opener |
| `src/lib/game/ui/BagScreen.svelte.spec.ts` | Preserve equipped-badge, slot scroll and worn-remove geometry at 640×360; update scroll-to-reach assertions if necessary |
| `tests/e2e/game.e2e.ts` | Persist live interior resize, HUD visibility/area and area-map shortcut tests; screenshots from same E2E run |

## Step 0 — make reproducible failing tests first

1. Refresh latest main, HPA-840 and related tickets before implementation. Work on this same branch; no additional PR.
2. Start with the existing `scenes.test.ts`, `GameShell.svelte.spec.ts`, `BagScreen.svelte.spec.ts` and `game.e2e.ts` fixtures, adding red assertions for the broken camera, compact HUD, Menu overlap and overlay scroll containment. **No separate MCP browser baseline is a prerequisite** for writing tests.
3. In browser specs, measure the actual compact `hud-party-panel` and `jrpg-menu-anchor` dimensions in `en`, `ja`, `zh-Hant` at 640×360, 640×559/560, 832×560, 833×560 and 1280×719/720. Derive `heroCardZone()` from the rendered box, not guessed numbers.
4. Capture before/after images **inside the persisted E2E flow** when running it through MCP after implementation, not as a second manual acceptance suite. Reproduce “The Wilds” label issue before editing font/marker logic.

## Step 1 — camera bounds only

1. In `WorldScene.create()`, after existing `startFollow`, attach one `const onResize = () => { const b = getCenteredCameraBounds(width,height); cameras.main.setBounds(b.x,b.y,b.width,b.height) }`. The local map dimensions are captured per scene creation.
2. Use existing scene cleanup for `this.scale.off('resize', onResize)` on shutdown/destroy, like `BattleScene` already does. Prevent stale callbacks after a map transition or restart.
3. **Do not** add manual scroll/follow alignment: Phaser's camera pre-render clamps to the new bounds on the next rendered frame even if `simulationPaused` stops player movement. If an automated test disproves this on the actual Phaser build, demonstrate the regression before considering an additional fix.
4. In `scenes.test.ts`, extend `centers rebuilt interior maps inside larger camera viewports` and the existing resize spy pattern: capture `resize` from `scale.on`, update **`phaserState.mainCamera.width/height`** (the helper reads those values), invoke the callback, assert `setBounds`; emit `shutdown` and verify `scale.off('resize', sameFn)`. Cover a new create with different map dimensions.

## Step 2 — one compact HUD/occlusion breakpoint, no competing portrait CSS

1. Refactor the existing `FieldHud.svelte` `@media(max-height:559px)` to <=719px. **Also change its `@media(max-width:832px) and (min-height:560px)` to min-height:720px**, otherwise 560–719px narrow windows activate both layout modes and override compact positions. Retain the older narrow-portrait rules for heights >=720px. Do not change `CommandGrid`'s independent 559px breakpoint.
2. Compact `.hero-card` to portrait + HP while preserving name/level for assistive tech (use visually-hidden CSS, not `display:none` for the only accessible string). Visually hide XP/stats and `.minimap-card`; remove dead `.minimap-medallion` short-height rules. Only show current quest objective or completed-prologue text. Shrink wallet.
3. Refactor `GameShell.svelte`'s existing short-height Menu rule to <=719px and place Menu at the upper right. **Place the compact `.heroic-side-hud` (quest + wallet) below the actual Menu chip**; with minimap hidden the old `top:.75rem` would collide. Use rect assertions with keyboard/pad glyphs in all three locales and test narrow mid-height windows.
4. Update `core/hud-occlusion.ts`'s <=559 branch to <=719 with dimensions matching visible compact card and its margins. Keep tall narrow-portrait branch. Test 640×360, 1280×719 and 1280×720, including hero positions previously falsely dimmed by 412×240.
5. **Update, do not discard** the existing `GameShell.svelte.spec.ts` localized `it.each` of 833×560, 832×560, 640×560, 640×559: it currently expects visible minimap; change expected hidden minimap under 720 and assert Menu does not intersect `.heroic-side-hud` / `.quest-banner` / `.wallet-pill` or hero card. Keep 390×844 portrait and 1280×720 desktop tests. In `game.e2e.ts`, sum distinct HUD/card/control boxes at 640×360 (exclude parent wrappers) and assert <=1/3 screen, non-overlap, Menu/HP/objective visible, `M` opens map.

## Step 3 — scroll containment with viable 640×360 landscape geometry

**Shared rule:** In `heroic-ui.css`, bound/clip the `.heroic-window` frame once; ensure its scrollable body has `min-height:0`. Explicitly set `flex:none` on each actual `.system-header`, `.jrpg-area-map-header`, and `.skill-header`. Do not assume all headers are immediate children of `.heroic-window`.

**Landscape vs portrait:** Keep existing narrow/tall or portrait stacking (e.g. 832×760 and 390×844); introduce a **later short-landscape-only** override (e.g. `max-height:719px` plus `min-aspect-ratio:1/1`) for Bag, Quest and Shop so 640×360 and 832×560 use compact parallel columns. Alternatively gate original stacking on portrait OR >=720px height. Override padding/gaps/rail/side widths **together** and measure center grid width; fixed Bag side `25rem` and Shop detail `23rem` cannot fit 640px. Keep current component DOM and focus lattice; no new tab/router.

1. **QuestJournal:** At 640×360, keep `.quest-rail` and `.quest-detail` side-by-side with reduced left rail width and `min-height:0`. Keep rail header fixed and `.quest-rail-close` fixed at **rail bottom**, not assumed part of `<header>`; let `.quest-rail-entries` and the seven-row `.quest-chapter` scroll within the available height while `.quest-detail` scrolls independently. Remove landscape `flex:none` and root `overflow-y:auto` opt-outs. Test all seven checklist rows remain readable after inner scroll and HPA-841 chain wrapping remains correct.
2. **BagScreen:** At 640×360, keep compact rail/main/side parallel, with a narrow rail, shrinkable center `min-width:0`, and a bounded narrower `.bag-side` rather than stacked `flex:none` panels. The 6.6rem slots and their label/equipped badges need a usable `.bag-grid-scroll` viewport; never shrink it below a slot and assume clipped items are reachable. Make worn/detail internals scroll as needed while rail category tabs/Close and Bag title remain visible. Update `BagScreen.svelte.spec.ts` equipped-badge/slot scroll tests and verify all five worn-remove buttons remain operable. Preserve existing 1000×360 and 390×844 cases; any change to grid column count must match the existing `bagGridColumns` focus geometry.
3. **ShopScreen (required fix):** At 640×360, do not stack the 14rem merchant portrait, grid and detail. Use narrow rail/main/detail, with scrollable stock and detail, always-visible merchant name, Buy/Sell tabs, Close and shop title. Condense or hide decorative portrait for short landscape if necessary, not business controls. Keep Buy/Sell and shop-detail action reachable, `shopGridColumns` and actual CSS grid columns synchronized, and HPA-839 prices/tooltips unaffected.
4. **SaveScreen:** Explicit `.save-slots { overflow-y:auto; min-height:0; flex:1 }` (currently `overflow:visible`); delete root `overflow-y:auto` and the responsive `.save-slots {flex:none}` overrides. Set `.save-header, .save-footer {flex:none}`. Verify title/Back/footer stay onscreen as slot 3 scrolls into view, including overwrite confirmation and load mode.
5. **SystemScreen:** Remove `.heroic-rows { overflow:visible }` and short-height `.system-content { flex:none; min-height:auto }` overrides; `.heroic-rows` already scrolls in shared CSS. Keep header and category rail visible; scroll to last option inside.
6. **AreaMap/Skill:** Keep nonshrinking map/skill headers and bounded internal body. Map SVG/legend/marker navigation must remain usable indoor and outdoor at 640×360 and 1920×1080. Only change oversized “The Wilds” label if reproduced.
7. **Portrait and localization:** Preserve 390×844 portrait layout; inspect Japanese/Traditional Chinese longer text at 640×360 and 832×560. Keep responsive adjustments local and concise; avoid a new overlay framework.

## Step 4 — checked-in tests; one MCP-driven acceptance execution

**Persist all regressions in existing harnesses:**

1. `scenes.test.ts`: extend `centers rebuilt interior maps...` with captured resize callback, update `phaserState.mainCamera.width/height`, invoke and assert new `setBounds`, then emit shutdown and assert `scale.off('resize', sameFn)`. Ensure a new scene uses new map dims. Register callback after `startFollow` to preserve probe assumptions.
2. `GameShell.svelte.spec.ts`: update the current localized 833/832/640×559/560 HUD table; add 719/720 breakpoint tests. Extend overlay `it.each` with **per-row opener helpers**, because Shop is opened by a populated `HudState.shop` fixture and Bag/Gear are distinct inventory paths rather than standard tile-only dialogs. Check Quest, Save/Load, Map, System, Skill, Bag/Gear, Shop at 640×360 and 1280×640: heading/Back remain visible before and after scrolling final action inside panel; document scrollTop=0; focus/keyboard and actual action work. Run en/ja/zh-Hant geometry checks.
3. `BagScreen.svelte.spec.ts`: keep 1000×360 horizontally compact and 640×360 equipped label/badge clipping regressions, ensure a slot scrolls into the *inner grid*, and the worn remove controls and detail action can be reached without moving Close/Bag title.
4. `game.e2e.ts`: real-game camera gate for `?startMap=guild-hall`, `hero-house`, `blacksmith-interior` (using existing `installRuntimeProbes` /`__glieseActiveSceneCamera`); live 1280×720 → 1920×1080 → 640×360, check small-room axes centre and player can move. Extend existing HUD test for hidden minimap, M shortcut, compact area sum and no overlaps; preserve 390×844 portrait baseline. Use screenshot capture **in these same scenarios**.
5. `hud-occlusion.test.ts`: test <=719 zone and >719 fallback, no stale-card fading, and browser rect agreement.

**Execute once:** After implementation run `bun run check`, `bun run lint`, `bun run test:unit -- --run`, relevant component specs, `bun run build` and the checked-in Playwright E2E. Run the **E2E acceptance via MCP** against these same persisted scenarios, in one shared browser:

1. Launch Chrome/Chromium with CDP open, e.g. `chrome --remote-debugging-port=9333 about:blank`, and attach the MCP browser tools to `http://127.0.0.1:9333`.
2. Run the checked-in scenarios inside that same browser: `HPA840_SHARED_CDP=http://127.0.0.1:9333 bun run test:e2e -- <scenario names>`. The suite's `beforeEach` (guarded by the env var) asserts every Playwright target lives in the shared browser, so the run only counts as MCP evidence when the attach succeeds.
3. Screenshots land in `docs/superpowers/reports/img/hpa-840-responsive` by default; override with `HPA840_EVIDENCE_ROOT=<dir>`.

A default `bun run test:e2e` run still counts as a test result, but not as MCP acceptance — the MCP browser must be the browser Playwright drives. This meets the MCP acceptance requirement without a separate duplicate manual E2E/baseline pass. One web platform is sufficient. If asset-dependent CI remains unavailable, record it under HPA-694 rather than declaring a pass.

**Visual evidence:** Attach screenshot set generated by the persisted Playwright/MCP test run for 640×360 compact HUD and all menus (Bag/Gear, Quest, Shop, Save, System, Map, Skill), indoor before/after resize, 1280×640, 1280×719/720, 1920×1080 and portrait 390×844. Compare screenshots against HPA-840's written requirements (the ticket has failure footage, not an approved mockup). No human-approval criterion.

## End-to-end acceptance checklist (all required before merge)

- [ ] **Camera:** Committed WorldScene resize/cleanup tests pass and **MCP-driven Playwright E2E** proves guild-hall, hero house and forge stay centred/clamped through 1280×720 → 1920×1080 → 640×360, with hero movement after each resize.
- [ ] **Compact HUD:** 640×360 minimap hidden, portrait/HP/objective/Menu/wallet visible without overlap, right-side HUD below Menu, <=1/3 total distinct HUD area, `M` opens Map; correct at 640×559/560, 832×560, 833×560, and 1280×719/720 across en/ja/zh-Hant.
- [ ] **Occlusion:** Actual CSS card bounds fit `heroCardZone` at <=719/720 boundary and no false fade in the old 412×240 area.
- [ ] **Menus:** Persisted browser tests and **MCP-run E2E** verify at 640×360 and 1280×640 that Quest, Bag/Gear, Shop, Save/Load, System, Area Map and Skill keep title and Back/Close onscreen while inner lists scroll to the last actionable item. No document scroll or focus loss.
- [ ] **Inventory/quests/shop details:** Bag slot label/equipped badge fully visible after grid scroll, five worn remove buttons usable, seven quest checklist rows reachable, Shop Buy/Sell/confirmation action reachable, Save slot 3 and final System choice actionable. Desktop/portrait unaffected.
- [ ] **Visual screenshot check:** From the existing MCP-driven Playwright run, capture and inspect before/after resized interiors and all short-height overlays at 640×360 plus 1280×640, 1280×719/720, 1920×1080 and 390×844; attach evidence to PR. No target mockup is supplied, so compare against the ticket's observable UI requirements and geometry assertions.
- [ ] **Other checks:** Typecheck, lint, build, unit, component browser and persisted E2E pass. HPA-694 LFS/CI blockers reported separately; no art/SFX, new architecture, gameplay changes or second PR.

## Completion handoff

Add implementation, test changes and screenshot evidence to **this existing draft PR #68**, not a second PR. Mark ready for review only after the persistent test gate and MCP acceptance criteria pass. No human approval step and no standalone manual acceptance task.
