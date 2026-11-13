# HPA-836 — Keyboard menu and quiet field interaction implementation plan

**Design:** [Review-reconciled HPA-836 spec](../specs/2026-11-12-hpa-836-keyboard-menu-interaction-design.md)
**Linear:** https://linear.app/cwchanap/issue/HPA-836/make-the-menu-reachable-from-the-keyboard-and-stop-empty-interact
**GitHub review:** https://github.com/cwchanap/Gliese/pull/66
**PR strategy:** **One ticket, one existing draft PR #66.** Implement and validate in this same PR. Do not create a separate implementation PR.
**State:** Documentation-only revision following the latest design review; no implementation, tests, screenshots or desktop smoke checks performed yet.

## Scope and code ownership

Keep the existing Svelte/Phaser bridge, GameShell menu/focus helpers, WorldScene interaction logic and current test frameworks. No new modal router, input framework, focus store, interaction registry or gameplay asset work.

| Existing file | Intended work |
| --- | --- |
| src/lib/game/GameShell.svelte | Always-visible Menu + PromptGlyph; keydown/keyup shielding for enabled focused HTML buttons; guarded Esc/I/M; origin-aware leaveOverlay / pause / focus behavior |
| src/lib/game/phaser/scenes/WorldScene.ts | Quiet empty-ground fallback; ambient NPC then sealed-gate status; drain E/Space/Enter JustDown edges while paused — **no document.activeElement guard** |
| src/lib/game/content/maps/grid/runtime.ts | Reuse existing cached, story-overlaid terrain; expose resolveGridTerrain and a small pure facesSealedGate helper |
| src/lib/game/DialoguePanel.svelte | Reset the focused root outline only; retain intentional button/choice focus styles |
| src/lib/game/i18n/messages/{en,ja,zh-Hant}.ts | Add status.wayBarred and remove both dead noOneNearby keys from each locale |
| src/lib/game/GameShell.svelte.spec.ts | Existing browser test owner for keyboard button activation, Esc/I/M, focus-loss-after-equip and overlay provenance |
| src/lib/game/content/maps/grid/runtime.test.ts | Existing node test owner for pure gate-facing geometry/story-overlay behavior |
| src/lib/game/phaser/scenes/scenes.test.ts | Existing node scene test owner for no-op/ambient/gate status and paused key-edge draining |
| src/lib/game/DialoguePanel.svelte.spec.ts | Browser focus-outline regression, if not already covered |
| tests/e2e/game.e2e.ts | Real/trusted keyboard reproduction of native button activation, Esc ladder, empty-ground and sealed-gate behaviors |

No changes to map geometry, generated grids, quest/story prose, save schema, SFX, sprites, CI workflows, gamepad bindings or Tauri/Rust code. Back/Cancel **destinations** intentionally become consistent across Escape, buttons and pad B; this is not a gamepad remapping.

## Step 1 — lock in failing regressions (RED)

1. **First reproduce the most important bug with real input in Playwright**, not the mocked scene keyboard:
   - Fresh playable field; Tab until Menu has focus; trusted page.keyboard.press('Enter') should open Command with no Traveler dialogue. Repeat from fresh field with page.keyboard.press('Space').
   - Focus a Command tile, press Enter, verify its target overlay opens. Capture failure on baseline: Phaser's captured Enter/Space prevents browser-native activation.
   - Verify the focused control receives exactly one activation, not a delayed world interaction after closing the menu.
2. In **GameShell.svelte.spec.ts** (already exists), install a temporary window keydown **and keyup** listener that calls preventDefault like the current Phaser capture layer. On a focused enabled Menu/command button, assert native keyboard activation still occurs after GameShell's root handler stops propagation. Cover Enter keydown and Space keyup separately, plus an unfocused-field control case.
3. In the same browser spec, cover Escape → Command → Gear → Escape → Command → Escape → Field; direct I → Gear → Escape → Field; direct M → Map → M/Escape → Field; and a command-origin Map/Save/Skill/Shop/Quest/System close returning to Command. Test with both on-screen Back and pad-cancel paths where the existing harness supports them.
4. **Regress symptom #6 specifically:** select an equipment item, focus its Equip action, equip it so the button disappears and focus is left on document.body, then press Escape. It must close Gear on the **first** press even though the dialog key handler never received the event.
5. In the existing node scene harness, assert empty-ground E has no dialogue/status update; ambient-only E preserves “They have nothing to say”; faced ! gate E emits only barred status; E on ordinary P/^ blockers does not. Add a paused E-edge test: press E while paused, resume, advance a frame, and ensure no interaction occurred.
6. In existing grid runtime node tests, pin the actual southern-frontier TPP!!!PPT gate rows and negative P/^ cells; verify an active terrain overlay that removes ! changes the pure helper's answer. Use existing world map / tile-grid fixtures instead of copying coordinates into implementation code.
7. In a browser component test, verify the focused dialogue root has no browser outline but focused action/choice buttons still have an obvious selection indicator.

**Test ownership correction:** GameShell tests belong in **GameShell.svelte.spec.ts**, not DialoguePanel.svelte.spec.ts. Scene mocks cannot reproduce native button activation because they do not have Phaser's real window keyboard capture. The trusted Playwright test is the critical red/green check.

## Step 2 — fix focused Enter/Space in GameShell, before world handling

1. On the root <section class="game-shell"> add an onkeydown and onkeyup listener shared by a tiny local handler. If the event key is Enter or Space and its focused target is an **enabled** native button, [role="button"] or [role="tab"], call **event.stopPropagation()** (not preventDefault). Leave all other events untouched. Native Enter and Space button click behavior must survive; Phaser's window listeners must never see these particular events.
2. When consuming those UI-owned key events, setLastInputModality('keys') so an automatic PromptGlyph switches correctly after keyboard use. Do not synthesize button .click() from the handler.
3. Keep ordinary world interaction on E and unfocused Enter/Space. Avoid DOM-focus checks inside WorldScene: they cross the Svelte/Phaser owner boundary and cannot repair Phaser-cancelled native clicks.
4. Test keyup specifically: Space normally activates a button on **keyup**, and Phaser can cancel captured keyup too. Check a focused Command tile, not only the Menu button.

## Step 3 — implement guarded Escape/I/M and one-level returns

1. Remove the opacity:0 desktop hiding rule for .jrpg-command-toggle. Import and render existing PromptGlyph mode={$preferences.promptMode} keys="Esc" pad="Start" (gamepad button 9 maps to menu). Hide the glyph from the button's accessible name and retain the existing localized "Menu"; add aria-keyshortcuts="Escape". Reuse existing classes, focus styling and responsive position.
2. In handleGlobalKeydown:
   - Return on defaultPrevented, repeat, Ctrl/Meta/Alt, or editable target.
   - Let DialoguePanel own Escape during dialogue, and ignore field menu shortcuts during battle. Do **not** call handlePadCancel in battle because its battle branch means Flee.
   - Escape: if a suitable field overlay or Command is open, perform one level of the **existing handlePadCancel** close path; otherwise open Command only on a ready playing field.
   - I: from a ready field with no other surface, call openInventory('gear').
   - M: preserve the existing direct-map toggle and modal guard, including M closing an already-open Map.
   - Let title/load/confirmation-specific close handlers keep ownership. Do not reopen Command on the same bubbling Escape that closed a modal.
3. When keyboard opens Command, await tick and focus the first enabled [data-focus-id^="field-cmd-"] tile; existing arrow lattice and native button activation do the rest.
4. Reuse **rememberOverlayFocus**, **overlayFocusRestoreTarget** and existing pauseOwner rather than adding a new origin flag. Ensure **all** command-grid overlay openers, including AreaMap, Skill and Save, remember their opener *before* commandOpen is false. The existing inventory/shop/quest/system openers should remain consistent.
5. Use one small shared **leaveOverlay(owner)** for close paths. If the recorded opener was a field-command tile, set commandOpen=true and transfer pauseOwner back to "settings" without resume; after tick focus the originating tile by its stable data-focus-id, falling back to the first enabled tile. Detect origin by a stable field-cmd-* attribute even if Svelte detached its former parent; do **not** rely solely on detachedElement.closest('#game-command-panel'). For a direct opener, resume and restore original valid focus (otherwise Menu).
6. Route the Close/Back buttons and pad B through those same close paths so they agree with Escape. Keep Save overwrite-cancel's existing special case and do not force title/system, battle or dialogue through field returns. Existing focused-dialog Escape handlers may call preventDefault; global handler must respect it and never close twice.
7. Update prior tests that assumed a Menu-origin Map closes straight to the field. Direct M Map still closes to field.

**Pause invariant:** Opening Command from the field issues one pause. Transition Command → Gear → Command transfers one owner without resume/re-pause. Only returning to field resumes. This is testable via the existing HUD command events.

## Step 4 — quiet interactions, pure gate check, and edge drain

1. In WorldScene.update, when simulationPaused, call the existing hasInteractJustDown() to consume all registered interact-key edges, then return. This prevents **E** pressed during a paused overlay from firing on resume. Do not add a new input queue or a polling system.
2. In handleInteractInput/interactWithNearbyNpc preserve the existing NPC / discovery / ambient routing (HPA-760). For an **ambient** NPC, preserve its localized single response. When nothing is in range, do **not** create an empty-ground dialogue or publish noOneNearby status.
3. In content/maps/grid/runtime.ts, expose **resolveGridTerrain(map)** using the cached resolveGrid's active overlay result, plus a pure **facesSealedGate** check for the glyph at one short interaction step ahead along facing, with the existing 32px grid and bounds. The helper must reject P, ^ and any other blocked tiles. Use the active map (already story-gated), not a constant south-road coordinate.
4. When no NPC, discovery or ambient interaction applies, call the pure helper from WorldScene. If the actor genuinely faces !, publish status.wayBarred and return without dialogue. Otherwise return silently. Scene wiring tests and pure grid tests should both pass.
5. Remove both **status.noOneNearby** and **content.dialogue.system.noOneNearby** from en/ja/zh-Hant when their last call sites are removed. The search of current app files found the only live use in WorldScene; historic design docs can remain unchanged. Add localized **status.wayBarred** to all three; run existing locale parity tests.

## Step 5 — minimal dialogue visual fix

1. Add .jrpg-dialogue-panel:focus { outline: none; } scoped to the dialog root. Keep tabindex=-1 and the Tab trap; do not globally suppress focus styles or delete button :focus-visible rules.
2. Inspect the always-visible Menu + device-aware prompt and focused dialogue at 1280×720 and the minimum native desktop window size. Use the attached Linear screenshot as **UAT defect evidence**, not an approved new mockup; use existing Heroic UI references for intended styling. Adjust only existing responsive layout spacing if necessary.
3. No new images or SFX are required. Should artwork become necessary, use a separate art ticket, not this coding PR.

## Step 6 — verification and acceptance

### Automated verification (after implementation only)

~~~sh
bun run test:unit -- --run src/lib/game/GameShell.svelte.spec.ts src/lib/game/DialoguePanel.svelte.spec.ts src/lib/game/content/maps/grid/runtime.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/i18n/messages/locale-parity.test.ts
bun run check
bun run lint
bun run build
bun run test:e2e -- --grep "keyboard menu|sealed gate|focused|Escape"
bun run test:unit -- --run
~~~

Use the actual new E2E test titles or run the full E2E suite if the grep differs. Retain existing prologue NPC, shop, dialogue, save, map, and battle regressions. Record the tested commit SHA and real pass/fail output; **this design-only revision does not claim tests were run**.

### Manual end-to-end acceptance — macOS and Windows only

- On **macOS** and **Windows** Tauri builds, New Run and Continue: keyboard-only Escape → Command → arrows/Enter to Gear → Escape returns to Command → Escape returns to field. Repeat I direct Gear and M direct Map; verify pause/resume, shortcut guards and no double-back.
- Tab to Menu, press Enter to open it, return, then Tab/Space. Repeat Enter on a Command tile. None may open Traveler dialogue. A focused button must activate even with Phaser's real keyboard capture registered.
- Equip a real item in Gear such that its action button unmounts; verify **first Escape** works despite focus on body. Repeat using visible Back and pad B to confirm consistent destination (mapping unchanged).
- Check E, Enter, Space in clear field (no popup or new status), ambient villager (existing fallback), story NPC/discovery/shop (existing functionality), and south-road sealed ! gate (localized one-line barred status, no modal). Confirm ordinary P and ^ terrain does not show "barred". Check E during a paused overlay does not fire on resume.
- Switch between en, ja and zh-Hant for the gate message. Open a dialogue with keyboard: no white root focus rectangle; actual controls still have clear focus.
- **Visual check** Menu and prompt at standard and minimum native window sizes against the HPA-836 Linear screenshot and available existing Heroic mockup/reference UI. Ensure no collision with quest ledger or field HUD.

Android/Linux: CI coverage only where available; no manual acceptance required.

### Done when

1. Trusted keyboard Playwright regression for focused Enter/Space button activation fails on baseline and passes after the fix; GameShell browser tests cover both keydown/keyup and overlay hierarchy.
2. Gear-first-Escape-after-equip works from **body focus**. Menu-origin and direct-origin Back/Escape have the agreed destinations without world pause-state flicker.
3. World interaction stays functional for NPCs, ambient NPCs, discoveries and shops; genuinely empty ground is silent and paused E cannot leak into resume.
4. The real faced ! gate alone shows localized status, with P/^ negatives and overlay-sensitive pure-helper coverage.
5. Focus/visual behavior and three locales pass; macOS/Windows native acceptance is recorded.
6. The implementation, tests, reviewer follow-ups and their verification evidence remain in **PR #66**. No extra PR for this task.

**Out of scope:** HPA-837 battle pacing, HPA-838 battle controls, HPA-839 auto-equip, HPA-840 resize system redesign, HPA-841 ending, HPA-704 art icons, new images/SFX, gamepad remapping and backward-compatibility machinery.
