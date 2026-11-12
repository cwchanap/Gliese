# HPA-836 — Keyboard menu and quiet field interaction (design spec)

**Status:** Proposed, documentation-only draft; implementation and validation pending.
**Linear:** https://linear.app/cwchanap/issue/HPA-836/make-the-menu-reachable-from-the-keyboard-and-stop-empty-interact
**Delivery:** One ticket, one PR. Keep this spec, implementation plan, eventual code, and tests in the same PR.
**Related:** HPA-818 is a duplicate; HPA-760 and HPA-816 already addressed other NPC reachability defects.

## Problem and verified code ownership

The November 11 prologue UAT found that the menu is visually hidden, keyboard users cannot enter it, focused UI buttons leak Enter/Space into world interaction, empty-ground interaction opens a full system dialogue, the dialogue container has a white browser focus outline, and Gear does not follow the expected Escape/back hierarchy.

| Observed symptom | Existing owner / cause |
| --- | --- |
| Invisible Menu | GameShell.svelte: .jrpg-command-toggle uses opacity: 0 except hover/focus; the button is already mounted. |
| Escape and I do not open menu/Gear | GameShell.svelte: handleGlobalKeydown only closes an open command grid on Escape and toggles the map on M. |
| Focused Enter/Space also interacts with the world | WorldScene.ts: Phaser registers E, SPACE and ENTER as interact keys and polls JustDown; Svelte native button focus does not prevent Phaser from seeing the same physical key. |
| Empty ground opens “Traveler: No one is nearby.” | WorldScene.handleInteractInput reaches interactWithNearbyNpc(undefined), which constructs a fallback dialogue and status. |
| South-road sealed gate gives no useful reason | The existing text-grid terrain legend represents a sealed gate with the blocking ! glyph; the southern-frontier chunk places it on the south road, but interaction does not distinguish that tile from empty ground. |
| White dialogue frame on keyboard entry | DialoguePanel.svelte focuses the non-modal dialog root (tabindex=-1); no root-only outline reset exists, though focused choice buttons have intentional focus styles. |
| Escape after Gear behaves like an unexpected exit | GameShell closes the command grid before opening an overlay and restores focus to the Menu toggle rather than preserving the menu-origin back step. |

The current Phaser↔Svelte HUD bridge, menu focus lattice, single-overlay pause owner, and test setup are sufficient. Do not add a new input manager, modal router, or navigation stack.

## UX contract

### Visible entry points

- Keep the existing Menu button in the upper-right HUD cluster always visible in normal field play (not opacity-hidden). Add a visually clear **Esc** key cap inside the same button; keep the accessible name localized as Menu and expose aria-keyshortcuts="Escape". Preserve the existing small-window placement and avoid overlap with the quest ledger.
- Escape from an idle, ready field opens the existing command grid. Opening by keyboard focuses the first enabled command tile so arrow keys and native Enter work immediately. The Menu button still works with mouse, Tab+Enter and Tab+Space.
- I directly opens the existing BagScreen with its **gear** tab selected, without first opening the command grid. M retains its map behavior and can close the map that it opened. Do not claim shortcuts for Q/C/B/J.
- Ignore repeat keydown, Ctrl/Meta/Alt shortcuts, editable controls, title, battles, dialogue, and unrelated modal surfaces. Preserve existing start/load/confirmation behavior.

### Escape is a one-level back action

| Current surface | Escape action | Focus/pause result |
| --- | --- | --- |
| Ready field, no overlay | Open command grid | Focus first enabled command; field paused. |
| Command grid | Close grid | Restore focus to Menu toggle; field resumes. |
| Gear opened from command grid | Close Gear, reveal command grid | Focus Gear command tile (fallback first enabled tile); field stays paused. |
| Gear opened directly with I | Close Gear | Return to field; restore sensible focus, field resumes. |
| Other command-grid screens | Close topmost screen, reveal command grid | Same one-level back behavior; no new nested navigation model. |
| Map opened directly with M | M or Escape closes the map | Return to field; field resumes. |
| Existing dialogue, title prompt, save confirmation, active battle | Preserve each existing owner’s behavior | No background command grid appears. |

This needs only a small “opened from command” provenance/return flag for the one active overlay, not a stack. Where closing an overlay returns to the command grid, hand pause ownership back to the existing settings/command owner without briefly resuming world simulation. Reset the return flag on direct-shortcut or title/modal entry. Focus after Svelte has mounted the destination; do not restore focus to a detached command tile.

Guard the global key handler against already handled/default-prevented events, because overlay/dialogue key handlers and the global handler see the same bubbling Escape. Escape must never close Gear **and** reopen or close another layer on the same keydown.

### Focused UI activation vs world interaction

- Native Enter or Space on a focused enabled HUD button activates **that button only**. Do not solve this by relying solely on event.preventDefault; Phaser already observes raw keyboard events.
- At WorldScene’s interaction boundary, consume the relevant Phaser JustDown edge but ignore Enter/Space world interaction when focus is inside an actionable HTML control / HUD surface. Preserve E and unfocused Enter/Space world interaction in normal field play.
- Keep movement and interaction paused while an existing overlay is active. An ignored UI activation must not turn into a delayed world interaction when the overlay closes.
- Preserve existing dialogue choice keyboard behavior, shop interactions, and gamepad behavior without expanding gamepad scope.

### Field interaction result order

When the player presses the existing interact key, keep the current successful cases and use the first applicable action:

1. Interactable story NPC or shop contact: existing story/shop dialogue.
2. Nearby discovery: existing discovery/quest action.
3. Ambient villager: existing localized “They have nothing to say” behavior when a genuine ambient NPC is in range (HPA-760).
4. Facing a *nearby sealed gate*: emit **one localized field status**, “The way is barred for now.” No dialogue panel.
5. Empty ground / no applicable target: **no-op**. Do not allocate a dialogue session, publish a “No one nearby” status, or hide the HUD.

For the prologue, detect the actual **! sealed-gate glyph** in the current text-grid map directly ahead of the player within one interaction step, using existing grid coordinates and facing. Do not classify every blocked tile, palisade, cliff or closed door as a sealed gate. The Southern Frontier’s gate-south-road is the required example; preserve any existing static/ruins gate behavior without inventing a new general-purpose interaction registry. Use active map/story-state data, not a hardcoded single-world coordinate.

### Dialogue focus styling

- Keep DialoguePanel’s focused dialog root for keyboard capture and its explicit Tab trap.
- Remove only the browser-default outline from the dialog root while focused; keep visible focus treatment on actual choice/action buttons. Do not globally disable focus-visible styling.

### Localization

Add status.wayBarred to the existing en, ja and zh-Hant message catalogs and retain locale-parity coverage. “Esc” is a physical key glyph, not newly authored translated prose; the Menu button itself keeps using existing localized ui.menu. Do not edit story prose or generated Rust catalogs.

## Minimal architecture / scope guard

**Expected code owners:** GameShell.svelte, WorldScene.ts, DialoguePanel.svelte, the three locale message files, and existing browser-component/scene/E2E tests. A tiny pure helper is acceptable only if a scene test otherwise cannot exercise sealed-gate facing cleanly; prefer an existing local method.

**Do not change:** save schema, quest IDs, character dialogue, map geometry, art, SFX, HUD screen inventory, battle controls, Gamepad mapping, Tauri/Rust, or CI structure. No compatibility shims for a pre-release hobby project.

## Acceptance criteria (end to end)

1. **macOS and Windows desktop:** New Run/Continue with only the keyboard; Escape visibly opens the menu, arrows move command focus, Enter opens Gear, first Escape returns to menu, second Escape returns to field. No mouse required.
2. **Shortcut parity:** From a ready field, I opens Gear directly and Escape returns to the field; M still opens/closes Map; neither shortcut fires in title/dialogue/battle/editable/modal contexts.
3. **Focused activation:** Tab to the always-visible Menu toggle and activate with Enter and Space in separate attempts; each opens the menu without starting a “Traveler” dialogue. Enter on a focused Gear tile opens Gear only.
4. **Quiet empty-ground interaction:** E, Space and Enter in clear empty ground do not open dialogue or change field status. Real NPCs, ambient villagers, discoveries and shops retain their existing actions.
5. **Sealed gate:** Facing the south-road ! tile, press E: a one-line localized barred status appears and no dialogue is mounted. Facing ordinary impassable terrain does **not** report a sealed gate.
6. **Visual and focus:** Compare against the HPA-836 Linear UAT screenshot (the ticket contains an observed-state screenshot, not an approved new mockup) and existing Heroic HUD references. The Menu control/key cap is visible without hover, does not overlap the right ledger at normal and minimum desktop window sizes, the dialog root has no white rectangle, and focused actionable buttons still have visible keyboard selection.
7. **Language:** Run the new gate status in en, ja, and zh-Hant and keep existing localized menu/Gear chrome correct.
8. **Regression:** Existing save, shop, dialogue, battle, and map interaction flows still pass. CI can cover other targets; manual end-to-end acceptance is required for macOS and Windows only.

**Not yet validated:** this planning PR adds documents only. Test execution and screenshots are required when the implementation is added to this same PR.
