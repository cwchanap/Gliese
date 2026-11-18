# HPA-840 — Responsive interior camera and compact HUD implementation plan

**Design:** [HPA-840 responsive resize design](../specs/2026-11-18-hpa-840-responsive-resize-design.md)  
**Linear:** https://linear.app/cwchanap/issue/HPA-840/fix-window-resizing-recentre-interiors-and-fit-the-hud-to-small  
**Base inspected:** `main` at `745c06934c00ac664f0980ac7fa13780382cb775` (2026-11-18). Recheck the latest `main` before coding.  
**PR policy:** **Exactly one PR for HPA-840.** This draft PR contains the spec and plan now. Add implementation, tests and screenshots to **this same branch/PR**; do not open a second implementation PR.  
**Current state:** Plan only; no implementation, CI execution, browser E2E, or screenshot verification has been performed.

## Design constraints

- Keep the existing Phaser 4 `WorldScene` and `BattleScene`, Svelte 5 screen components, `GameShell` input/overlay ownership, focus lattice, `HudState` and responsive CSS. This is a layout/lifecycle fix, not a UI rewrite.
- No new packages, framework layers, viewport stores, camera adapters, translated strings, save migrations, gameplay features, art or sound. Existing prologue assets only.
- HPA-841 already owns Quest step-chain wrapping and HPA-836 owns Menu/Escape/I/M behavior. Preserve those fixes. HPA-694 separately owns Git LFS and CI E2E restoration.

## File ownership

| File | Change |
| --- | --- |
| `src/lib/game/phaser/scenes/WorldScene.ts` | Reapply map-aware centred camera bounds and follow alignment on canvas resize; remove listener on shutdown/destroy |
| `src/lib/game/ui/FieldHud.svelte` | Compact <720px-high hero/HUD display; hide minimap but retain objective and HP |
| `src/lib/game/GameShell.svelte` | Reposition visible Menu chip when minimap is hidden; preserve input/focus |
| `src/lib/game/ui/QuestJournal.svelte` | Fixed compact title + Close and internal rail/detail scrolling |
| `src/lib/game/ui/SaveScreen.svelte` | Fixed header/Back/footer and internally scrolling save-slot list |
| `src/lib/game/ui/SystemScreen.svelte` | Bound settings list, keep heading, Back and categories accessible |
| `src/lib/game/ui/BagScreen.svelte` | Gear/Bag: fixed title, categories and Close; internal content scrolling |
| `src/lib/game/ui/AreaMapScreen.svelte` | Bound map SVG/body; keep header/Close; correct oversized indoor exit label only if reproduced |
| `src/lib/game/ui/heroic-ui.css` | Touch only if a generic existing window rule needs a shared fix; prefer scoped component styles |
| `src/lib/game/phaser/scenes/scenes.test.ts` | Camera lifecycle/geometry regression tests, if current Phaser mock supports resize |
| `src/lib/game/GameShell.svelte.spec.ts` and existing screen specs | Responsive visibility, clipping, keyboard/pad focus tests |
| `tests/e2e/game.e2e.ts` | Trusted browser resize/navigation scenarios; screenshot and bounding-rect assertions |

## Step 0 — baseline and failure capture

1. Refresh `main` and recheck HPA-840 status, HPA-841 completion and relevant component ownership. Do not change completed-ticket behavior.
2. In an **MCP-controlled web browser** with working existing interior assets, capture a baseline at 1280x720 in Hunters' Lodge and then resize to 1920x1080. Record room/canvas bounds and a screenshot showing the interior offset. Repeat in Grik's house and the forge.
3. At 640x360, record screenshots of field, Quest, Save, System, Gear/Bag and indoor Area Map. Inspect `getBoundingClientRect()` for hero, minimap, quest, Menu, titles, Back buttons, panel bounds and third save slot. Record whether the indoor exit label is actually oversized before changing its text scaling.
4. Add one focused red test per broken ownership area (camera resize; compact HUD; scroll-safe navigation). Reuse existing selectors/`data-testid` where available; add only a stable selector where there is none. Avoid fixed sleeps.

## Step 1 — make WorldScene recalculate camera bounds on resize

1. In `WorldScene.create()`, after the initial `getCenteredCameraBounds(width,height)` and `startFollow(this.player,...)`, register a resize callback against `this.scale`. Capture the current map's width/height from that create invocation so the callback cannot accidentally use a later map.
2. On resize, call the same `getCenteredCameraBounds(width,height)` (which reads the new camera viewport), then `cameras.main.setBounds(x,y,width,height)`. Reconcile the current follow position immediately so resizing while paused does not show one stale frame; preserve the existing smoothing policy for normal movement. Do not teleport the hero or modify world coordinates.
3. Register cleanup for this particular callback in the existing scene `shutdown`/`destroy` cleanup closure (and avoid double registration after scene restart). Existing `WorldScene` transitions still do a new `create` for the active map.
4. Regression checks: small room centres after 1280x720 → 1920x1080 → 640x360; camera remains clamped for larger rooms; resizing during an open menu then closing keeps the correct view; overworld/battle visuals and movement are unchanged.

## Step 2 — compact the field HUD below 720px height

1. Under a single component-scoped `@media (max-height: 719px)` rule, leave only the portrait and HP meter in `.hero-card`: visually hide name, level badge, XP meter and stats; reduce padding and card footprint. Prefer a class on the XP meter if the existing two meter elements need stable distinction.
2. Hide `.minimap-card` at this breakpoint, keeping `HudState.areaMap` and the `M` shortcut exactly as is.
3. Reduce `.quest-banner` to one objective line: hide eyebrow and title when a live quest exists. For the no-active-quest/completed-prologue case, keep the existing completion text visible rather than producing a blank card. Keep the wallet as a small chip.
4. In `GameShell.svelte` change only the short-height `.jrpg-menu-anchor` position now that the minimap is hidden; place Menu near the right edge and measure its distance from the hero/quest panels. Keep PromptGlyph, visible state, clicks, focus, Escape and gamepad behavior unchanged.
5. At 640x360 assert all HUD/visible Menu bounding boxes stay within the viewport and do not intersect. For the non-command field, compute the area of the union of visible HUD bounding boxes (clipped to viewport) and assert it is no greater than one third of the viewport. Include an actual screenshot check of the visible player and uncluttered gameplay centre.

## Step 3 — make each menu's content scroll *inside* a bounded frame

Apply the simplest changes in the owners below. Reuse `min-height: 0` / `overflow-y: auto` on flex/grid children, `flex: none` on headers, and a short-height breakpoint. Do not introduce a shared modal controller, and avoid visual changes at 1280x720 or 1920x1080.

1. **QuestJournal:** At compact sizes, structure header/title and Close as always-visible navigation, while quest entries, optional chapter block and detail/objective chain scroll in bounded regions. Remove the existing compact rule that scrolls the whole `.quest-screen`. Keep selected-quest and arrow navigation; preserve HPA-841 objective wrapping rather than duplicating it.
2. **SaveScreen (save and load modes):** Stop scrolling the entire `.save-screen` at short height; reserve room for `.save-header` and `.save-footer`. Make `.save-slots` the scrolling middle region; stack cards in a narrow viewport without `min-height: 15rem` forcing the whole page. Ensure the third slot remains clickable after inner scroll; preserve focus and overwrite confirmation.
3. **SystemScreen:** Bound the outer `.system-screen` and preserve `.system-header` / Back; make `.heroic-rows` scroll internally. Keep category rail/focus, all preferences and row labels functional. Account for smaller horizontal rail and wrapped options.
4. **BagScreen (Gear and Bag):** The current responsive `.bag-screen` scrolls its entire surface. Pin title, category tabs and Close in the compact presentation; let item grid, worn equipment and details scroll inside their respective content region. Use existing item selection, wear/remove, focus and button handlers. Do not remove inventory details or add a separate mobile Gear component.
5. **AreaMapScreen:** Keep header/Close outside `.jrpg-area-map-body`. Constrain SVG height by available body space in short windows and scroll legend/content internally if necessary. Test both indoor and outdoor local-map geometry. If the prior “The Wilds” exit label still overflows, adjust only the existing font-size/marker rendering parameters and validate every marker remains legible and focusable.
6. Run visual checks for Japanese and Traditional Chinese labels at 640x360 to catch new clipping without adding translations.

## Step 4 — automated tests, E2E and visual checks

1. Run `bun run check`, `bun run lint`, `bun run test:unit -- --run` and `bun run build` (or the repository's equivalent scripts) and targeted Svelte browser specs. Keep failures clearly attributable to HPA-840.
2. Use **browser MCP E2E** against a web build with accessible interior PNGs; this single web platform is sufficient because the change is not platform-specific. Play a saved indoor scenario, resize live across 1280x720 / 1920x1080 / 640x360, and verify camera, movement and map switching. Exercise the actual Menu → Quest/Save/System/Gear/Bag routes, plus direct `M` → Area Map.
3. For each menu, scroll to its final item, assert Back/Close remains in the viewport and clickable without scrolling `document.scrollingElement`, then verify focus return and that the game resumes. For System, click the last option. For Save, reach the third slot. For Gear, select a lower inventory slot and reach its action.
4. Capture and attach **before/after screenshots** of indoor camera and the 640x360 field, plus one screenshot per compact menu and indoor/outdoor maps at 640x360 and representative 1920x1080 views. Compare visually via MCP against ticket requirements (no approved mockup exists). Record automated bounding-box results and screenshots in a short PR validation report/comment. No human acceptance criterion.
5. Re-run the existing trusted `tests/e2e/game.e2e.ts` cases that touch resize/menu navigation. HPA-694's unrelated LFS/CI restoration must not be mixed into this PR; if the general CI E2E job cannot fetch assets, run in an existing image-equipped environment and report that limitation rather than claiming CI passed.

## End-to-end acceptance checklist (blocking implementation merge)

- [ ] **MCP E2E / camera:** Inside Hunters' Lodge, Grik's house and forge, resize live 1280x720 → 1920x1080 → 640x360 → 1280x720; each room stays correctly centred/clamped, hero remains controllable and no stale listener changes the next room.
- [ ] **MCP E2E / HUD:** At 640x360 with the field unobstructed by open menus, portrait and HP remain visible, minimap is hidden, active quest displays objective only (or completed state when appropriate), and visible Menu + HUD rectangles neither overlap nor leave the viewport. HUD covers <= 1/3 of the field. `M` still opens the map.
- [ ] **MCP E2E / menus:** At 640x360 Quest, Save, System, Gear, Bag and Area Map display title and Back/Close throughout internal scrolling. The third save slot and final settings/inventory actions are reachable with keyboard/pointer; the browser page never scrolls.
- [ ] **MCP E2E / map:** Indoor and outdoor map content and exit labels fit at 640x360 and 1920x1080, and marker focus/navigation continues to work.
- [ ] **MCP screenshots / visual:** Screenshot review for 640x360, 1280x720 and 1920x1080 against Linear's written design requirements (ticket attachment is failure evidence, not a mockup); no clipped labels, overlapping HUD panels, or cropped controls. Attach generated screenshots/report to this PR.
- [ ] **Regression:** Existing prologue gameplay, HPA-836 keyboard navigation, HPA-841 Quest formatting, overworld camera and battle resizing still work in MCP E2E on web.
- [ ] **Automated suites:** Relevant unit/component/browser tests, typecheck, lint and build pass; report any external CI asset/LFS blockage separately. No new art, SFX, save format or platform-specific code.

## Completion handoff

Keep all implementation commits on `plan/hpa-840-responsive-interiors-hud`. Update this same draft PR with checked evidence and screenshots. Mark ready for review only after the automated checks above have passed. No split PR, separate visual-review ticket, or art/SFX task is needed.
