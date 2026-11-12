# HPA-836 — Keyboard menu and quiet field interaction implementation plan

**Design:** [HPA-836 design spec](../specs/2026-11-12-hpa-836-keyboard-menu-interaction-design.md)
**Linear:** https://linear.app/cwchanap/issue/HPA-836/make-the-menu-reachable-from-the-keyboard-and-stop-empty-interact
**PR strategy:** **One ticket, one PR.** Extend this draft PR with implementation and tests; do not open a separate implementation PR.
**State:** Planning only; no code changed and no tests or desktop smoke checks claimed.

## Delivery boundaries

Stay inside the existing Svelte/Phaser architecture, current single-overlay pause owner, menu focus lattice, scene test harness, browser-component tests and Playwright suite. The task is not an invitation to replace keyboard routing, rebuild the HUD, or add custom controls.

| File | Expected edit |
| --- | --- |
| src/lib/game/GameShell.svelte | Always-visible Menu + Esc key cap; Escape/I keyboard routing; menu-origin return behavior; focus/pause handoff. |
| src/lib/game/phaser/scenes/WorldScene.ts | Prevent focused Enter/Space from triggering world interaction; remove empty-target fallback; return barred status for a genuinely faced ! gate. |
| src/lib/game/DialoguePanel.svelte | Dialog-root-only focus outline reset, preserving choice/button focus styles. |
| src/lib/game/i18n/messages/{en,ja,zh-Hant}.ts | Localized status.wayBarred message; use existing locale infrastructure. |
| src/lib/game/DialoguePanel.svelte.spec.ts | Extend existing GameShell/DialoguePanel browser-component coverage for keyboard navigation, focus, and Escape hierarchy. |
| src/lib/game/phaser/scenes/scenes.test.ts | Extend scene interaction tests for empty ground, ambient NPC, sealed gate and focused Enter/Space; preserve existing NPC/discovery assertions. |
| tests/e2e/game.e2e.ts | Add focused keyboard field/menu/Gear and gate interaction regression using existing trusted keyboard helpers. |
| src/lib/game/i18n/messages/locale-parity.test.ts | Existing coverage should pick up added locale keys; change only if necessary. |

Do not change generated navigation grids, map art/layout, story Rust generated code, save format, or CI jobs.

## Step 1 — reproduce the failures first

1. In existing GameShell browser-component coverage, add a failing test: ready field + Escape must open Command, focus a selectable tile, and arrow/Enter must activate Gear.
2. Add a focused case: tabbing to the Menu button, pressing Enter and then Space in separate fresh runs invokes the button exactly once each and does not generate world interaction. Use the scene test for the Phaser side, not only a Svelte button-click assertion.
3. Cover Escape from Gear when launched through Menu: first Escape returns to Command, second closes it. Verify that I from the field opens Gear directly and Escape closes to field. Preserve the M-map tests.
4. Extend a WorldScene test with (a) no NPC/discovery/ambient/gate in reach, (b) a real ambient NPC, (c) the authored southern-frontier ! gate faced from the accessible side, and (d) an ordinary blocking tile. On baseline, the empty case should fail because it creates the “No one nearby” session, while the gate case should fail because the one-line status is missing.
5. Add a dialogue DOM-focused test that confirms the dialog root remains focused while its computed outline is absent; choice/action focus still has an intentional visible style. Prefer existing browser-component tooling.

Do not invent a second scene harness. Where tests use mocked Phaser keyboard keys, ensure JustDown is exercised rather than bypassing the input boundary under test.

## Step 2 — menu entry, keyboard routing and back stack without a stack

In GameShell.svelte:

1. Remove the opacity-zero desktop hiding rule for .jrpg-command-toggle. Keep existing z-index, hover/focus treatment, responsive anchoring and a high-contrast label. Add a small Esc key cap (aria-hidden) plus aria-keyshortcuts="Escape"; retain localized ui.menu as the accessible name. Inspect overlap with the quest ledger.
2. Expand handleGlobalKeydown to handle Escape and I alongside existing M, after honoring event.defaultPrevented, modifier/repeat/editable guards, active mode, ready state, dialogue, battle, and overlay ownership. Escape from the field calls openCommand; I calls openInventory('gear'); M retains its current special map toggle.
3. On opening the command grid via keyboard, await the existing Svelte tick and focus the first enabled command tile (already marked data-focus-id). Arrow-key lattice and browser-native Enter/Space must do the activation; avoid synthetic global Enter/Space key handlers.
4. Record only whether the one overlay was opened from a command-grid tile. On close, if command-origin, switch the existing pause owner back to settings and remount/focus Command (prefer the originating tile); otherwise close directly to the field and resume. Do not create a generic route history, modal stack, or second store.
5. In each existing overlay Escape handler, keep event.preventDefault and ensure the global keydown handler cannot process the same key a second time. Keep Title, dialogue, battle, load picker, save overwrite confirmation, and gamepad semantics unchanged.
6. Adapt existing tests that previously expected Map-from-menu to return only to the Menu toggle; **menu-origin close now returns to the command grid**. Direct M-map close still returns to field. Ensure input focus never lands in a detached command-grid node.

Implementation note: pauseForOverlay already transfers ownership without a second requestPauseGame; when returning from Gear, use the same ownership model rather than resume+pause on the same Escape.

## Step 3 — prevent key leakage at the Phaser interaction boundary

In WorldScene.ts:

1. Keep registered E/SPACE/ENTER interact keys. In the existing hasInteractJustDown/handleInteractInput boundary, consume JustDown edges for all keys, but suppress **Enter/Space** when the current DOM focus is a real actionable UI element (e.g. button / explicit button role). The Phaser window listener can see keys even when the Svelte handler called preventDefault; do not rely on propagation alone.
2. Test the focused-control path and the ordinary field path separately, including the potential delayed input edge when opening/closing a menu. Keep world interaction working when focus is on the game field (not on a HUD button).
3. After searching existing NPCs and discoveries, preserve the ambient-NPC response, then check for an actual faced sealed-gate glyph **!** in the current text-grid terrain one step ahead of the player (the Southern Frontier gate-south-road is the test fixture). Reuse terrain tile dimensions, map coordinates and facing, with a short reach bound; avoid a global “any collision means barred” rule.
4. When that check succeeds, publish status.wayBarred through the existing HUD status method; **do not** create a dialogue session. If no interaction target exists, return silently without publishHudState and without allocating a transient fallback dialogue.
5. Remove or narrow the now-unreachable noOneNearby fallback in interactWithNearbyNpc. Do not alter the nearby NPC selector, HPA-760 ambient behavior, story scene loading, or discovery quest updates.

Keep this in WorldScene unless a single tiny pure gate-facing helper materially improves tests; do not create an interaction-target framework.

## Step 4 — localized text and visual polish

1. Add status.wayBarred in en (“The way is barred for now.”), ja (natural Japanese equivalent) and zh-Hant (natural Traditional Chinese equivalent). Run the existing locale parity tests.
2. Add a scoped .jrpg-dialogue-panel:focus { outline: none; } or equivalent root-only rule. Preserve the existing :focus-visible styling for selectable dialogue choices/action controls; do not remove focus or the Tab trap.
3. Visually inspect the always-visible Menu control at 1280×720 and the desktop app’s minimum supported window size. Compare the current result to the HPA-836 attached UAT screenshot, plus existing Heroic UI styling. The attachment documents the defect; it is **not** a replacement approved mockup.
4. No images, sprites, UI icons from image-generation tools or SFX are required. If new artwork later proves essential, put production in a separate art task, not this coding PR.

## Step 5 — regression and acceptance

### Automated checks

Run from repo root after code lands:

~~~sh
bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/i18n/messages/locale-parity.test.ts
bun run check
bun run lint
bun run build
bun run test:e2e -- --grep "keyboard menu|sealed gate|focused"
~~~

Use the final actual names of added E2E tests for the grep, or run the whole E2E suite if names differ. Also run the full one-shot unit suite and existing relevant prologue interaction E2E once focused tests pass. Record observed results with commit SHA; the document-only draft itself has not been tested.

### Manual end-to-end acceptance — macOS and Windows

- Launch the native Tauri build on **macOS** and **Windows**, New Run/Continue. Keep hands off the mouse: Escape → arrows → Enter on Gear → Escape back to Command → Escape to field. Repeat with I direct Gear and M direct Map; check world simulation pause/resume.
- Tab to Menu, press Enter; return to field, tab/focus Menu and press Space. Neither should create a Traveler dialogue. Verify ordinary E on a reachable NPC/discovery still works.
- At a real empty patch, press E, Enter and Space: no popup, no fabricated status. At the south-road sealed gate, face the ! tiles and press E: a single localized status appears. Facing a cliff/palisade must not show that status.
- Switch en, ja and zh-Hant and inspect the gate line. Keyboard-open an actual dialogue: no thin white root rectangle, but selected choices/buttons retain visible focus.
- Check **visual layout** against the Linear ticket’s attached UAT screenshot (not a design mockup) and current in-repo Heroic UI references at standard and minimum supported desktop window sizes. Confirm Menu/Esc key cap is visible and does not overlap quest/HUD content.
- For other OS targets, rely on existing CI where available; no Android or Linux manual acceptance steps.

### Done when

1. All six HPA-836 player-facing problems are covered by automated regression tests and native desktop smoke checks.
2. The two-step Escape hierarchy and I shortcut work with no focus or pause-state leakage; existing M, dialogues, NPCs, shops and quests remain functional.
3. The blocked road response is limited to a faced actual gate, and ordinary empty-space interaction is silent.
4. Localization matches across three supported languages, with visibly correct focus treatment and Menu placement.
5. Validation evidence and any follow-up review changes stay in **this one HPA-836 PR**. No new art/SFX, runtime infrastructure or compatibility layers.

**Out of scope:** HPA-837 battle pacing, HPA-838 flee/hotkeys, HPA-839 gear auto-equip, HPA-840 resize fixes beyond a visual smoke, HPA-841 prologue ending, gamepad key remaps, and the separate HPA-704 item-icon art task.
