# HPA-840 — Responsive interior camera and compact HUD implementation plan

**Design:** [HPA-840 responsive resize design](../specs/2026-11-18-hpa-840-responsive-resize-design.md)  
**Linear:** https://linear.app/cwchanap/issue/HPA-840/fix-window-resizing-recentre-interiors-and-fit-the-hud-to-small  
**Base inspected:** `main` at `745c06934c00ac664f0980ac7fa13780382cb775` (2026-11-18). Recheck the latest `main` before coding.  
**PR policy:** **Exactly one PR for HPA-840.** This draft PR contains the spec and plan now. Add implementation, tests and screenshots to **this same branch/PR**; do not open a second implementation PR.  
**Current state:** Plan only; no implementation, CI execution, browser E2E, or screenshot verification has been performed.


**Review reconciled:** https://github.com/cwchanap/Gliese/pull/68#pullrequestreview-5967994112 (all six findings adopted with Skill/Shop restricted to regression/smallest necessary fixes).

## Design constraints

- Keep Phaser 4, Svelte 5, the existing `WorldScene` and `BattleScene` owners, `GameShell` input/overlay flow, `HudState`, focus lattice, and current UI components. No new abstraction or dependency.
- Keep **one compact field tier (height <= 719px)** in the existing FieldHud/GameShell CSS, with its **TypeScript `heroCardZone` occlusion twin**. The CommandGrid's own <=559px breakpoint is separate and stays intact.
- Keep HPA-836 Escape/I/M/focus, HPA-841 Quest-chain wrapping and existing prologue gameplay. HPA-694 LFS/CI gate restoration stays separate.
- No new art, SFX, translations, save data or separate implementation PR. This single draft PR remains documentation-only until coding begins.

## File ownership

| File | Minimal implementation scope |
| --- | --- |
| `src/lib/game/phaser/scenes/WorldScene.ts` | Reuse `getCenteredCameraBounds()` in a scale resize listener; unregister on shutdown/destroy; no manual camera-scroll reconciliation |
| `src/lib/game/core/hud-occlusion.ts` | Match `heroCardZone()` to the rendered compact card at <=719px, including top/left offset |
| `src/lib/game/core/hud-occlusion.test.ts` | Update existing zone boundaries and false-positive assertions |
| `src/lib/game/ui/FieldHud.svelte` | Refactor existing 559px block to the one 719px compact tier: portrait + HP, one-line objective, hidden minimap, compact wallet |
| `src/lib/game/GameShell.svelte` | Refactor existing short-height Menu anchor at 719px; don't change shortcuts or focus |
| `src/lib/game/ui/heroic-ui.css` | Change shared `.heroic-window` outer scrolling/overflow once, keeping header and inner body bounds |
| `src/lib/game/ui/QuestJournal.svelte` | Remove outer scroll rules; keep title/Close and scroll inner quest lists/details |
| `src/lib/game/ui/SaveScreen.svelte` | Remove root overflow and slot `flex:none` overrides; fixed header/footer, scrolling slot body |
| `src/lib/game/ui/SystemScreen.svelte` | Delete overrides disabling `.heroic-rows` scrolling; fixed header/category access |
| `src/lib/game/ui/BagScreen.svelte` | Remove outer scrolling; preserve visible rail/title/Close with scrolling inventory content |
| `src/lib/game/ui/AreaMapScreen.svelte` | Keep header/Close and bound map SVG + body; change “The Wilds” label only if reproduced |
| `src/lib/game/ui/SkillScreen.svelte` | Shared-window regression target; only local scroll fix if tests fail |
| `src/lib/game/ui/ShopScreen.svelte` | Full-screen scroll regression target; smallest scroll fix needed to keep title/Back/purchase controls; no HPA-839 business logic |
| `src/lib/game/phaser/scenes/scenes.test.ts` | Extend existing WorldScene interior camera bounds test and BattleScene-style scale listener test |
| `src/lib/game/GameShell.svelte.spec.ts` | Extend existing overlay `it.each` geometry, scroll, focus checks at compact/intermediate heights |
| `tests/e2e/game.e2e.ts` | Extend existing HUD overlap test and add persistent live-interior-resize gate with camera runtime probe |

## Step 0 — reproduce failure and lock test expectations

1. Reconfirm latest `main` and HPA-840 / HPA-836 / HPA-841 status before implementation. Reuse existing tests, ids and mock fixtures rather than constructing a new test harness.
2. Using an MCP-controlled web browser with real interior assets, capture baseline screenshots + camera/DOM rectangles at 1280×720 → 1920×1080 (Lodge, house, forge), and the field, menu, map and overlays at 640×360. This evidence is a baseline, not an acceptance substitute.
3. Inspect CSS of `hud-party-panel` and calculated `heroCardZone()` at 640×360, 1280×719 and 1280×720. Document compact card dimensions/offsets from the actual rendered box; avoid guessed numbers.
4. Add reproducible failing tests **in the existing files** for camera listener, compact HUD + occlusion and overlay scroll containment. Favor stable assertions and `scrollIntoView` over fixed timeouts.

## Step 1 — camera bounds only

1. In `WorldScene.create()`, after existing `startFollow`, attach one `const onResize = () => { const b = getCenteredCameraBounds(width,height); cameras.main.setBounds(b.x,b.y,b.width,b.height) }`. The local map dimensions are captured per scene creation.
2. Use existing scene cleanup for `this.scale.off('resize', onResize)` on shutdown/destroy, like `BattleScene` already does. Prevent stale callbacks after a map transition or restart.
3. **Do not** add manual scroll/follow alignment: Phaser's camera pre-render clamps to the new bounds on the next rendered frame even if `simulationPaused` stops player movement. If an automated test disproves this on the actual Phaser build, demonstrate the regression before considering an additional fix.
4. In `scenes.test.ts`, extend `centers rebuilt interior maps inside larger camera viewports` and the existing resize spy pattern: capture `resize` from `scale.on`, update **`phaserState.mainCamera.width/height`** (the helper reads those values), invoke the callback, assert `setBounds`; emit `shutdown` and verify `scale.off('resize', sameFn)`. Cover a new create with different map dimensions.

## Step 2 — one compact HUD/occlusion breakpoint

1. Refactor `FieldHud.svelte`'s existing `@media (max-height: 559px)` to `719px` rather than adding a competing block. Show compact portrait and HP meter; visually hide name/level but preserve their accessible text (no `display:none` on the sole accessible copy); hide XP/stats and minimap. Reduce quest banner to the objective and wallet to a small chip. Preserve a completed-prologue message if there is no active quest.
2. Refactor `GameShell.svelte`'s 559px Menu-anchor block to the same `719px` tier, moving the Menu chip into space formerly occupied by the minimap. Keep PromptGlyph/focus/click/Escape handlers unchanged. Remove now-dead minimap-specific compact CSS. Keep `CommandGrid.svelte`'s separate <=559px layout unchanged.
3. In `core/hud-occlusion.ts`, update `heroCardZone(viewWidth,viewHeight)`'s <=559 branch to <=719 and size its width/height **from the compact CSS's measured occupied bounding box including offsets**, leaving a minimal protective margin. The narrower portrait/tall case still applies to >719px screens. No Svelte viewport store is introduced.
4. Update `hud-occlusion.test.ts` at 640×360, 1280×719 and 1280×720; assert no false hero fading where the old desktop card used to extend. Use an actual browser `hud-party-panel` rectangle plus `heroCardZone` assertion to guard CSS/TS drift, and verify that hidden portions remain available to accessibility where applicable.
5. Extend `game.e2e.ts`'s existing `mobile HUD stacks without overlapping controls`: leave 390×844 portrait behavior intact; at 640×360, assert minimap hidden, Menu/hero/objective/wallet/status onscreen with no pairwise overlap. Sum **only distinct visible card/control rectangles** (not parent `hud-side-panel`) and assert <=1/3 of viewport area. `M` still opens the full map.

## Step 3 — smaller menu fixes mostly by removing conflicting rules

1. In `heroic-ui.css`, make the shared `.heroic-window` itself bounded/clipped instead of a whole-window scroll area. Keep headers non-shrinking and content `min-height:0` so it scrolls **inside**. Verify Area Map, System and Skill after this shared change; do not blindly clip all children.
2. **SystemScreen:** remove local `.heroic-rows { overflow: visible }` and `@media (max-height:600px) .system-content { flex: none; min-height:auto }` opt-outs; rely on existing `.heroic-rows { overflow-y:auto }`, keep the header/Back and rail visible. Only modify short-height flex sizing if the test still fails.
3. **SaveScreen:** remove whole `.save-screen` overflow and responsive `flex:none` on `.save-slots`; scroll slots internally with header/Back/footer fixed. Preserve overwrite confirmation and the third slot's keyboard/pointer access.
4. **QuestJournal:** replace <=900px whole-`.quest-screen` scrolling with a fixed outer screen, a compact fixed title/Close region and bounded scrollable rail/details. Preserve HPA-841 wrapping.
5. **BagScreen:** remove whole-`.bag-screen` overflow at <=559px/<=900px while retaining column stacking; make existing grid/worn/detail regions individually scrollable and leave category/Close accessible.
6. **AreaMap:** keep the header/Close outside `.jrpg-area-map-body` and cap map SVG inside its bounded body; test indoor/outdoor fog, labels and marker focus. Change the oversized “The Wilds” label only on reproduced failure.
7. **Skill/Shop:** run the same overlay test after the shared CSS change. If Shop's <=1200px/short-height `overflow-y:auto` or Skill's window sizing moves navigation offscreen, make only the minimal local scroll-containment fix. Do not change Shop items, costs or purchases.
8. Check Japanese and Traditional Chinese labels at 640×360. If 600px legacy rules remain for Save/System/Shop, check 1280×640 explicitly; avoid expanding them merely for consistent breakpoint numbers.

## Step 4 — persistent automated regression gate + MCP E2E

**Tests to commit in this same PR (not a one-off test script):**

1. `scenes.test.ts`: camera setBounds after resize, correct camera-width/height mock, and listener cleanup after shutdown. Include reload/transition check.
2. `GameShell.svelte.spec.ts`: extend existing overlay `it.each` for **Map, Save, Skill, Quest, System, Bag/Gear and Shop**. At 640×360 and 1280×640 check heading + Back/Close rectangle before and after scrolling the last focusable item; verify `document.scrollingElement.scrollTop === 0`, actions clickable, focus unchanged. Include a compact Japanese locale case; Traditional Chinese label width checks as targeted browser assertions.
3. `game.e2e.ts`: one persistent interior gate using `?startMap=guild-hall`, `hero-house`, `blacksmith-interior` and existing `installRuntimeProbes(page, { captureFacing: true })`/`__glieseActiveSceneCamera`: live resize 1280×720 → 1920×1080 → 640×360, verify `worldView` centering on each axis smaller than the viewport, then move Grik; extend existing HUD geometry test for compact field. Also cover accessible area-map shortcut.
4. Update existing `hud-occlusion.test.ts` with 719/720 boundary values and false-fade tests, plus the browser DOM-vs-zone assertion in the existing component/E2E harness.

**Run and collect evidence:**

- Run `bun run check`, `bun run lint`, `bun run test:unit -- --run`, relevant component-browser specs and `bun run build`. Record results rather than assuming success.
- **MCP-driven browser E2E is the end-to-end acceptance executor** on one web platform. Use the persisted E2E scenarios and real assets; check resize, walking and overlay final action paths, including 640×360, 1280×640, 1280×719, 1280×720 and 1920×1080. Also validate 390×844 portrait baseline. Do not make CI recovery from HPA-694 a prerequisite for this plan's implementation.
- Attach **MCP screenshots** for indoor resize before/after, field HUD and every compact menu including Skill/Shop, plus indoor/outdoor maps. Since HPA-840 has no approved UI mockup (only UAT failure recording), validate screenshots against ticket's written visual requirements and DOM geometry. No human acceptance criterion.

## End-to-end acceptance checklist (all required before merge)

- [ ] **Persistent camera test + MCP E2E:** Guild Hall, hero house and forge centre properly after 1280×720 → 1920×1080 → 640×360; hero moves after each resize; callback is unregistered on shutdown, and map transitions use the new map's dimensions.
- [ ] **Persistent compact HUD test + MCP E2E:** 640×360 hides minimap, preserves portrait/HP/objective/Menu and accessible identity, all visible distinct HUD/control rectangles stay in viewport without overlapping and total <= 1/3 area; `M` still opens Area Map.
- [ ] **TS/CSS occlusion test:** At 640×360, 1280×719 and 1280×720 the rendered hero card fits its `heroCardZone`; no old oversized zone fades the hero spuriously.
- [ ] **Persistent overlay matrix + MCP E2E:** At 640×360 and 1280×640 Quest, Save/Load, System, Bag/Gear, Map, Skill and Shop retain title and Back/Close while inner content scrolls to the last actionable item; third save slot/last option/last equipment action clickable; page scroll remains at zero; keyboard/pad focus paths preserved.
- [ ] **Area Map test:** Indoor/outdoor map, marker labels, legend and Back/Close fit at 640×360 and 1920×1080. Only modify “The Wilds” label if its baseline reproduces a defect.
- [ ] **MCP visual screenshot acceptance:** 640×360, 1280×640, 1280×719, 1280×720 and 1920×1080 screenshots and automated bounding-box checks demonstrate no clipped/overlapping controls and match written ticket UI intent; 390×844 portrait unchanged; screenshot evidence linked in PR.
- [ ] **Automated suites:** Relevant unit, Svelte/browser, Playwright E2E, typecheck, lint and build pass. Report unrelated Git LFS CI blockers under HPA-694, not as false HPA-840 test passes.
- [ ] **Scope:** No extra art/SFX tasks, new framework, gameplay changes or additional PR.

## Completion handoff

Add implementation, test changes and screenshot evidence to **this existing draft PR #68**, not a second PR. Mark ready for review only after the persistent test gate and MCP acceptance criteria pass. No human approval step and no standalone manual acceptance task.
