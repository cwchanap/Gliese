# HPA-836 — Keyboard menu and quiet field interaction implementation plan

**Design:** [Review-reconciled HPA-836 spec](../specs/2026-11-12-hpa-836-keyboard-menu-interaction-design.md)
**Linear:** https://linear.app/cwchanap/issue/HPA-836/make-the-menu-reachable-from-the-keyboard-and-stop-empty-interact
**GitHub reviews:** [initial design review](https://github.com/cwchanap/Gliese/pull/66#pullrequestreview-5886187185) · [follow-up review](https://github.com/cwchanap/Gliese/pull/66#pullrequestreview-5887639294)
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
3. In the same browser spec, cover Escape → Command → Gear → Escape → Command → Escape → Field; direct I → Gear → Escape → Field; direct M → Map → M/Escape → Field; and a command-origin Map/Save/Skill/Quest/System close returning to Command; a shop opened through an NPC returns to the field. Test with both on-screen Back and pad-cancel paths where the existing harness supports them. **macOS WebKit pointer case:** click Menu, mouse-click Gear (or another command) without relying on browser focus, then Close/Back must return to that exact command tile. If Command was keyboard-opened with a different tile focused before the pointer click, return to the *clicked* tile, not the stale focused tile. Preserve existing pad Start tests that expect initial focus to remain unset.
4. **Regress symptom #6 specifically:** select an equipment item, focus its Equip action, equip it so the button disappears and focus is left on document.body, then press Escape. It must close Gear on the **first** press even though the dialog key handler never received the event.
5. In the existing node scene harness, assert empty-ground E has no dialogue/status update; ambient-only E preserves “They have nothing to say”; faced ! gate E emits only barred status; E on ordinary P/^ blockers does not. Add a paused E-edge test: press E while paused, resume, advance a frame, and ensure no interaction occurred.
6. In existing grid runtime node tests, pin the actual southern-frontier TPP!!!PPT gate rows, a **one-tile-thick ! gate** from Silverpine/Wildwood East, and negative P/^ cells; verify an active terrain overlay that removes ! changes the pure helper's answer. Verify non-grid maps safely bypass detection. Test a **32px facing probe** from collision-limited player coordinates; it must cross the ~16px clearance margin but not skip a one-tile gate. Use existing world map / tile-grid fixtures instead of copying coordinates into implementation code.
7. In browser component tests, verify the focused dialogue root has no browser outline but focused action/choice buttons still have an obvious selection indicator. Add a **640×360** bounding-box regression asserting the visible Menu toggle (including PromptGlyph) does not intersect the minimap, quest HUD or left hero card; also check 1280×720. Test Escape on a Save overwrite confirmation while Save's Close button or dialog root has focus: it must cancel the confirmation before closing Save.

**Test ownership correction:** GameShell tests belong in **GameShell.svelte.spec.ts**, not DialoguePanel.svelte.spec.ts. Scene mocks cannot reproduce native button activation because they do not have Phaser's real window keyboard capture. The trusted Playwright test is the critical red/green check.

## Step 2 — fix focused Enter/Space in GameShell, before world handling

1. On the root <section class="game-shell"> add onkeydown and onkeyup listeners shared by a tiny local handler. For Enter/Space, use `event.target.closest('button, [role="button"], [role="tab"]')` (when target is an Element) and reject any target matching `:disabled, [aria-disabled="true"]`, including non-native role controls. Only for an **enabled** control call **event.stopPropagation()** (not preventDefault). Leave other events untouched. Native Enter and Space button click behavior must survive; Phaser's window listeners must never see these particular events. Do not synthesize clicks.
2. When consuming those UI-owned key events, setLastInputModality('keys') so an automatic PromptGlyph switches correctly after keyboard use. Do not synthesize button .click() from the handler.
3. Keep ordinary world interaction on E and unfocused Enter/Space. Avoid DOM-focus checks inside WorldScene: they cross the Svelte/Phaser owner boundary and cannot repair Phaser-cancelled native clicks.
4. Test keyup specifically: Space normally activates a button on **keyup**, and Phaser can cancel captured keyup too. Check a focused Command tile, not only the Menu button.

## Step 3 — implement guarded Escape/I/M and one-level returns

1. Remove the opacity:0 desktop hiding rule for .jrpg-command-toggle. Import and render existing PromptGlyph mode={$preferences.promptMode} keys="Esc" pad="Start" (gamepad button 9 maps to menu). Hide the glyph from the button's accessible name and retain the localized "Menu"; add aria-keyshortcuts="Escape". **Correct the existing HUD overlap**: `.jrpg-menu-anchor` currently has right:15rem at 1280×720 (overlaps the minimap by ~8px), and the <=720px rule puts it at right:0.75rem, directly over the minimap at 640×360. Start with ~right:16.5rem at normal desktop size and ~right:12.25rem under max-height:559px, then use DOM rectangles to validate no overlap with the minimap, quest banner **or left hero card** at 1280×720 and 640×360; adjust values minimally as measured. Reuse existing classes and focus styling.
2. In handleGlobalKeydown:
   - Return on defaultPrevented, repeat, Ctrl/Meta/Alt, or editable target.
   - Let DialoguePanel own Escape during dialogue, and ignore field menu shortcuts during battle. Do **not** call handlePadCancel in battle because its battle branch means Flee.
   - Escape: if a suitable field overlay or Command is open, perform one level of the **existing handlePadCancel** close path; otherwise open Command only on a ready playing field.
   - I: from a ready field with no other surface, call openInventory('gear').
   - M: preserve the existing direct-map toggle and modal guard, including M closing an already-open Map.
   - Let title/load/confirmation-specific close handlers keep ownership. Do not reopen Command on the same bubbling Escape that closed a modal.
3. When **Escape or keyboard-activated Menu** opens Command, await tick and focus the first enabled [data-focus-id^="field-cmd-"] tile; existing arrow lattice and native button activation do the rest. **Do not auto-focus on mouse click or gamepad Start**, whose existing pad tests expect initial focus to remain `null`/unset (e.g. `GameShell.svelte.spec.ts` around 3220 and 3756). A keyboard click can be identified from its activation path (e.g. click.detail===0) without adding state.
4. Reuse **rememberOverlayFocus**, **overlayFocusRestoreTarget** and existing pauseOwner rather than adding a new origin flag. **WKWebView pointer fix:** In the sole CommandGrid callback `handleFieldCommand(command)`, programmatically focus the matching enabled `[data-focus-id="field-cmd-${command}"]` button **before** calling the overlay opener, so `rememberOverlayFocus()` stores the actual pointer-clicked tile even when WebKit leaves `document.activeElement` on body or an earlier tile. (Passing that tile explicitly to rememberOverlayFocus is also acceptable, but avoid new state.) Ensure **all** command-grid overlay openers, including AreaMap, Skill and Save, remember this opener *before* commandOpen is false. Direct I/M, merchant Shop and title System still remember their real opener. Keep Rest/other non-overlay actions unchanged.
5. Use one small shared **leaveOverlay(owner)** for close paths. If the recorded opener was a field-command tile, set commandOpen=true and transfer pauseOwner back to "settings" without resume; after tick focus the originating tile by its stable data-focus-id, falling back to the first enabled tile. Detect origin by a stable field-cmd-* attribute even if Svelte detached its former parent; do **not** rely solely on detachedElement.closest('#game-command-panel'). For a direct opener, resume and restore original valid focus (otherwise Menu).
6. Route the Close/Back buttons and pad B through those same close paths so they agree with Escape. **Fix Save overwrite precedence:** `handleSaveDialogKeydown` currently calls `closeSave()` directly on Escape, bypassing `handlePadCancel()`'s special handling of the nested overwrite alertdialog. For Escape, delegate to `handlePadCancel()` so the prompt cancels first, whether focus is on the Save Close button, Save root, or alertdialog, without closing the underlying Save screen; keep event.preventDefault and avoid bubbling a second close. Do not force title System, battle or dialogue through field returns.
7. **Update existing expectations across surfaces**, not just Map, because one-level return intentionally changes behavior. In `GameShell.svelte.spec.ts`, review/adjust the current **Skill** (~912–935), **Bag** (~1108–1122), **Quest** (~1372–1393), **Map** (~1617–1630) and **System** (~2821–2836) close/focus tests. Replace expectations of `menuButton` focus/field resume immediately after closing a command-origin overlay with restored Command grid + originating tile, while direct-entry behavior still returns to field. Preserve pad Start initial-focus tests (~3220, ~3756), and confirm no pause/resume flicker. In `tests/e2e/game.e2e.ts`, update **area map opened from Menu** (~11990), **language preference** (~12007), **full-HP potion** (~12043) and **quest journal** (~14435) flows that assume a close returns straight to field (including status-visibility and Menu re-click semantics). Rework the user-facing flow, not just assertions, when a second Escape/Back is now required.

**Pause invariant:** Opening Command from the field issues one pause. Transition Command → Gear → Command transfers one owner without resume/re-pause. Only returning to field resumes. This is testable via the existing HUD command events.

## Step 4 — quiet interactions, pure gate check, and edge drain

1. In WorldScene.update, when simulationPaused, call the existing hasInteractJustDown() to consume all registered interact-key edges, then return. This prevents **E** pressed during a paused overlay from firing on resume. Do not add a new input queue or a polling system.
2. In handleInteractInput/interactWithNearbyNpc preserve the existing NPC / discovery / ambient routing (HPA-760). For an **ambient** NPC, preserve its localized single response. When nothing is in range, do **not** create an empty-ground dialogue or publish noOneNearby status.
3. In content/maps/grid/runtime.ts, expose **resolveGridTerrain(map)** using the cached resolveGrid's active overlay result, plus a pure **facesSealedGate** check for the glyph at **32px (GRID_TILE_SIZE)** ahead along facing. Existing navigation has 16px cells and 12px clearance, leaving the actor ~16px outside ! boundary at a normal walk-up; a <=16px probe would miss it. A 32px probe should reach the one-tile-thick gates without skipping them. **Use isGridWorldMap(map) to guard the caller before resolveGridTerrain**; interiors and ruins are not text-grid maps. Reject P, ^ and all other blocked tiles, and use the active story-gated map rather than a hardcoded south-road coordinate.
4. When no NPC, discovery or ambient interaction applies, call the pure helper from WorldScene. If the actor genuinely faces !, publish status.wayBarred and return without dialogue. Otherwise return silently. Scene wiring tests and pure grid tests should both pass.
5. Remove both **status.noOneNearby** and **content.dialogue.system.noOneNearby** from en/ja/zh-Hant when their last call sites are removed. Update **existing** `scenes.test.ts` expectations that assert `No one nearby` / `Traveler: No one is nearby.` (currently around 9330–9347, 9849–9864, 9976–9991, 10009–10018, 10071–10085): empty ground must produce no new HUD state/dialogue, while an ambient-only response still works. Preserve nearby-NPC selector tests and any negative `not.toHaveBeenLastCalledWith(...)` assertions that remain meaningful. Historic design docs can remain unchanged. Add localized **status.wayBarred** to all three; run existing locale parity tests.

## Step 5 — minimal dialogue visual fix

1. Add .jrpg-dialogue-panel:focus { outline: none; } scoped to the dialog root. Keep tabindex=-1 and the Tab trap; do not globally suppress focus styles or delete button :focus-visible rules.
2. Inspect the always-visible Menu + device-aware prompt and focused dialogue at **1280×720 and 640×360**. The Menu-minimap overlap is already demonstrated by existing styles, so correcting the anchor is **required in this PR**, not optional visual polish. Pair the visual check with browser component bounding-box non-overlap assertions at 640×360 (and standard desktop). Use the attached Linear screenshot as **UAT defect evidence**, not an approved new mockup; use existing Heroic UI references for intended styling.
3. No new images or SFX are required. Should artwork become necessary, use a separate art ticket, not this coding PR.

## Step 6 — verification and acceptance

### Automated verification (after implementation only)

~~~sh
bun run test:unit -- --run src/lib/game/GameShell.svelte.spec.ts src/lib/game/DialoguePanel.svelte.spec.ts src/lib/game/content/maps/grid/runtime.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/i18n/messages/locale-parity.test.ts
bun run check
bun run lint
bun run build
bun run test:unit -- --run
bun run test:e2e
~~~

**Run the full existing Playwright E2E suite**, not only a filtered grep: several existing Menu-return tests change intentionally, alongside keyboard-capture/gate tests. Specifically inspect the four named E2E flows listed in Step 3.7 and the five component close tests, plus the existing `scenes.test.ts` noOneNearby expectations listed in Step 4.5. Retain prologue NPC, shop, dialogue, save, map, and battle regressions. Record tested commit SHA and real pass/fail output; **this documentation revision does not claim tests were run**.

### Manual end-to-end acceptance — macOS and Windows only

- On **macOS** and **Windows** Tauri builds, New Run and Continue: keyboard-only Escape → Command → arrows/Enter to Gear → Escape returns to Command → Escape returns to field. Repeat I direct Gear and M direct Map; verify pause/resume, shortcut guards and no double-back. On **macOS WKWebView**, also mouse-click Menu → Gear, then Back and verify the actual clicked command tile is restored; repeat with a different previously focused tile. Gamepad Start must preserve existing no-auto-focus behavior.
- Tab to Menu, press Enter to open it, return, then Tab/Space. Repeat Enter on a Command tile. None may open Traveler dialogue. A focused button must activate even with Phaser's real keyboard capture registered.
- Equip a real item in Gear such that its action button unmounts; verify **first Escape** works despite focus on body. Repeat using visible Back and pad B to confirm consistent destination (mapping unchanged). Open a Save overwrite prompt and press Escape with focus on both the confirmation and Save Close/root: the prompt closes first; Save remains open.
- Check E, Enter, Space in clear field (no popup or new status), ambient villager (existing fallback), story NPC/discovery/shop (existing functionality), and south-road sealed ! gate (localized one-line barred status, no modal). Confirm ordinary P and ^ terrain does not show "barred". Check E during a paused overlay does not fire on resume.
- Switch between en, ja and zh-Hant for the gate message. Open a dialogue with keyboard: no white root focus rectangle; actual controls still have clear focus.
- **Visual check** Menu and prompt at **1280×720 and 640×360** against the HPA-836 Linear screenshot and available existing Heroic mockup/reference UI. Check no collision with right minimap/quest banner **or left hero card**, and save a screenshot/test result on both desktop targets.

Android/Linux: CI coverage only where available; no manual acceptance required.

### Done when

1. Trusted keyboard Playwright regression for focused Enter/Space button activation fails on baseline and passes after the fix; GameShell browser tests cover both keydown/keyup and overlay hierarchy.
2. Gear-first-Escape-after-equip works from **body focus**. Menu-origin and direct-origin Back/Escape have the agreed destinations without world pause-state flicker.
3. World interaction stays functional for NPCs, ambient NPCs, discoveries and shops; genuinely empty ground is silent and paused E cannot leak into resume.
4. The real faced ! gate alone shows localized status, with P/^ negatives, a **one-tile-thick gate** case, a 32px clearance-aware probe and a non-grid map guard.
5. Focus/visual behavior and three locales pass; Menu/minimap/hero bounding boxes do not overlap at 640×360; macOS/Windows native acceptance includes pointer-origin return, Save overwrite Escape and gamepad Start focus invariants.
6. The implementation, tests, reviewer follow-ups and their verification evidence remain in **PR #66**. No extra PR for this task.

**Out of scope:** HPA-837 battle pacing, HPA-838 battle controls, HPA-839 auto-equip, HPA-840 resize system redesign, HPA-841 ending, HPA-704 art icons, new images/SFX, gamepad remapping and backward-compatibility machinery.
