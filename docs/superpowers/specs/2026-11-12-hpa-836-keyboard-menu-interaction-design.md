# HPA-836 — Keyboard menu and quiet field interaction (design spec)

**Status:** Review-reconciled proposal; implementation and validation pending.
**Linear:** https://linear.app/cwchanap/issue/HPA-836/make-the-menu-reachable-from-the-keyboard-and-stop-empty-interact
**PR:** https://github.com/cwchanap/Gliese/pull/66
**Reviews addressed:** [first review](https://github.com/cwchanap/Gliese/pull/66#pullrequestreview-5886187185) and [follow-up review](https://github.com/cwchanap/Gliese/pull/66#pullrequestreview-5887639294) (2026-11-13 UTC).
**Delivery:** One ticket, **one existing draft PR** for spec, plan, implementation, tests, and verification. HPA-818 is a duplicate; HPA-760 and HPA-816 handled separate NPC reachability issues.

## Problem and corrected root causes

| UAT symptom | Verified existing owner / cause | Design response |
| --- | --- | --- |
| Menu invisible except hover/focus | GameShell.svelte sets .jrpg-command-toggle to opacity: 0 on desktop | Always show the existing button, with a device-aware PromptGlyph hint |
| Esc and I cannot open field UI | GameShell.handleGlobalKeydown handles M and closing an open command grid, but not field Esc/I | Guarded Esc/I/M handling in GameShell |
| Enter/Space on focused Menu or command tile activates world instead of button | WorldScene registers Phaser ENTER/SPACE via addKey, which captures browser key events and cancels their native button activation. Merely ignoring interaction inside WorldScene does not fix the cancelled click | Stop keydown **and keyup** propagation on GameShell's root for enabled, focused button-like controls, *without* preventDefault |
| Empty ground creates “Traveler: No one is nearby.” | WorldScene.interactWithNearbyNpc(undefined) creates a fallback dialogue/status | Preserve ambient NPC fallback, but no-op for genuinely empty ground; remove now-unused localized noOneNearby keys |
| South-road sealed gate is silent/indistinguishable | The existing text-grid ! glyph is a blocking sealed gate, but interaction checks no gate-facing condition | Inspect active/story-overlaid terrain directly ahead and publish one localized status; no dialogue |
| Thin white outline around keyboard-opened dialogue | DialoguePanel focuses its dialog root; root browser outline remains | Remove outline on focused **root only**; retain button/choice focus |
| First Escape fails after equipping Gear | When an Equip action disappears after the item becomes worn, focus may fall to document.body. Escape is handled only on the Gear dialog, so its handler never fires | A window-level Escape back action handles the active overlay even when focus is on body |

The existing **Phaser↔Svelte event bridge**, Svelte command grid, menu focus lattice, single pause owner and overlay focus-restoration slot remain the implementation. No input manager, modal router, interaction registry, general navigation stack or new save data.

## User-visible behavior

### Visible Menu and shortcuts

- The existing top-right Menu toggle is visible without hover in normal field play. Render a **PromptGlyph** inside it using the existing prompt preferences (keys="Esc", pad="Start" for the existing gamepad Start/Menu action). Keep the localized accessible name **Menu**, e.g. aria-label and an aria-hidden glyph wrapper; expose aria-keyshortcuts="Escape". Reuse existing glyph styling rather than create a custom keycap.
- From an idle ready field: **Escape opens the command grid**, then focuses the first enabled command tile after Svelte mounts it. A keyboard-activated Menu button does likewise; **mouse clicks and gamepad Start must not forcibly change focus** (the existing pad Start focus tests depend on this). Arrows move through the existing grid; native Enter/Space activates the focused tile.
- **I opens Gear** directly, using the existing inventory overlay with the gear tab. **M still opens/closes Map** directly; closing a command-origin Map returns to the command grid.
- Ignore repeated keys, Ctrl/Meta/Alt shortcuts, editable targets, title, dialogues, battles and unrelated modal surfaces. Escape must not turn into battle Flee, and I must not open Gear over an existing dialogue.

### Escape, on-screen Back and gamepad B agree

| Active surface | Back result | Focus/pause |
| --- | --- | --- |
| Ready field | Escape opens Command | First enabled tile; field paused |
| Command grid | Escape/Back closes grid | Menu toggle; field resumes |
| Gear, Map, Quest, Save, Skill, or System opened from Command | Back closes **only that overlay** and restores Command | Original command tile (fallback first enabled); field remains paused |
| Shop opened by talking to a merchant | Back closes Shop | Returns to the field; preserves existing merchant interaction |
| Gear directly opened with I or Map directly opened with M | Back closes the overlay | Field resumes; restore previous valid element or Menu toggle |
| Dialogue, title prompt/load confirmation, active battle or battle summary | Keep existing owner behavior | No background Command screen; never route Escape through battle Flee |

Choose **consistent close behavior**: Escape, the on-screen Close/Back button, and pad B all use the same one-level overlay close path. This intentionally changes the destination of a command-origin Back action, **not gamepad mapping or battle controls**. No separate Escape-only stack is needed.

Reuse GameShell's existing rememberOverlayFocus / overlayFocusRestoreTarget and pauseOwner. **WebKit/WKWebView mouse clicks do not reliably focus clicked buttons**: in the sole CommandGrid callback, handleFieldCommand(command), programmatically focus its corresponding enabled `[data-focus-id="field-cmd-${command}"]` tile **before** invoking an overlay opener (or explicitly pass that tile to the existing focus recorder). Thus keyboard, macOS pointer and pad selections all record the actual command, not a stale activeElement/body. Direct I/M and merchant-opened Shop still capture their own opener. When an overlay opens, save its opener before unmounting the command grid. On close, recognize a stored command tile by its stable data-focus-id (or its command-grid ancestry while attached). Reopen Command and transfer pause ownership to "settings" without an intermediate resume, then tick and focus the matching tile; otherwise resume and restore existing focus. **Do not assume a detached element still has a #game-command-panel ancestor.** This uses the existing focus slot; no new provenance flag or general history stack.

Escape handling must be **global and topmost-first**, rather than dependent on overlay DOM focus. Reuse the existing handlePadCancel close ordering for active overlays, with these guards: return for already default-prevented events and editable inputs; explicitly skip dialogue and battle (dialogue owns its Escape and handlePadCancel would flee during battle); preserve title/confirmation ownership; no double-processing an overlay-level Escape. **Save overwrite confirmation takes precedence:** make handleSaveDialogKeydown's Escape invoke the same handlePadCancel path, which cancels the overwrite alertdialog before closing Save, even when focus is on Save's Close button/root or has fallen to body. From field with no overlay, Escape opens Command.

### Focused UI activation: fix the event before Phaser

Phaser captures registered ENTER and SPACE events. When those key events reach Phaser's window listeners, it can call preventDefault and cancel the browser's native button click; checking document.activeElement inside WorldScene is too late.

Add **one narrow keydown and keyup handler on GameShell's root**:

- For Enter or Space, find the nearest actionable ancestor using `event.target.closest('button, [role="button"], [role="tab"]')` when target is an Element, and **exclude** any `:disabled` or `[aria-disabled="true"]` control. Call **stopPropagation**, not preventDefault, only for the remaining enabled controls. Let browser-native activation happen (Enter keydown, Space keyup), without Phaser seeing an interact key or latching a JustDown edge. Non-native role controls keep their existing activation behavior; do not synthesize extra clicks.
- Call setLastInputModality('keys') for the swallowed keyboard events so auto PromptGlyph presentation remains accurate.
- Leave E, unfocused Enter/Space, field movement, dialogue-specific keys, text inputs and other events alone. Do not introduce synthetic button clicks or keyboard input relays.
- The root handler is deliberately on the Svelte boundary; **WorldScene must not query the DOM** to decide whether UI controls own focus.

WorldScene still needs to drain its existing interact-key JustDown edges when simulationPaused, before returning from update, so a press of **E** during a paused overlay cannot fire when the field resumes.

### Interaction precedence and sealed gate

Preserve the current successful actions:

1. Interactable NPC or merchant: existing NPC/shop dialogue.
2. Nearby discovery: existing discovery action and quest progression.
3. Ambient NPC: existing localized “They have nothing to say” one-line fallback (HPA-760 behavior).
4. Facing a nearby actual **!** sealed-gate terrain tile: publish only status.wayBarred (“The way is barred for now.”).
5. No matching action: **no-op** — no dialogue, no status publish, no HUD hide.

The source of truth for the gate is the story-overlaid, cached text-grid terrain in src/lib/game/content/maps/grid/runtime.ts. **Guard with isGridWorldMap(map) before resolving terrain**; interior/ruins maps are not grid maps. Expose a small resolveGridTerrain(map) accessor using the existing resolveGrid result, with a pure facesSealedGate helper probing **32px (one GRID_TILE_SIZE) ahead along facing**, rather than <=16px: half-tile navigation cells have 12px clearance and the player can stop ~16px before the gate boundary. This must check only the ! glyph (southern-frontier.ts rows containing TPP!!!PPT); P palisades, ^ mountains, cliffs and unrelated blockers are negative cases. No hardcoded south-road coordinates, new gate data model or global blocked-tile fallback. The helper must reflect live story overlays so a gate that later opens stops reporting “barred”. Test a **one-tile-thick ! gate** (e.g. Silverpine/Wildwood East) as well as the two-row Southern Frontier gate, and ensure a 32px probe cannot skip the one-tile gate.

### Dialogue focus, locales and visual presentation

- Keep DialoguePanel's root tabindex=-1, focus ownership and Tab trap. Apply .jrpg-dialogue-panel:focus { outline: none; } **only to the dialog root**; preserve focused choice/action button styling.
- Add status.wayBarred to en, ja and zh-Hant. Remove the now-dead status.noOneNearby and content.dialogue.system.noOneNearby keys from all three locales (search before removal to avoid unexpected live references). Keep locale-parity coverage. No story prose or generated Rust files.
- **Fix the known Menu/minimap overlap as part of this ticket**, not only if a later screenshot looks wrong. The current Menu anchor `right:15rem` overlaps the right HUD at 1280×720; the <=720px rule `right:0.75rem` places Menu directly on top of the minimap at the **640×360 native minimum**. Start with ~`right:16.5rem` at desktop width and ~`right:12.25rem` for short (<=559px high) windows, then verify Menu, minimap, quest banner **and left hero card** bounding boxes are non-overlapping at 1280×720 and 640×360. Keep responsive behavior usable between those sizes. Compare against the existing Heroic HUD and HPA-836 Linear UAT screenshot (defect evidence, not an approved replacement mockup).

## Minimal code and test owners

- **GameShell.svelte:** root button-key shielding, Esc/I/M routing, shared one-level leaveOverlay behavior, focus/pause handoff and PromptGlyph Menu.
- **WorldScene.ts:** empty-ground no-op, ambient/gate precedence and paused E-edge drain — **no DOM focus guard**.
- **content/maps/grid/runtime.ts (+ its existing runtime.test.ts):** expose active terrain and pure gate-facing helper.
- **DialoguePanel.svelte; en/ja/zh-Hant catalogs:** root-only focus outline and localized gate status/dead-key removal.
- **GameShell.svelte.spec.ts (existing):** keyboard hierarchy, Enter/Space browser-capture behavior, focus-on-body-after-equip, macOS-style pointer selection/return, preserved pad Start focus behavior, Save overwrite Escape precedence and Menu-versus-minimap bounding boxes at 640×360; update existing Skill/Bag/Quest/Map/System close assertions to the new origin-aware behavior. DialoguePanel.svelte.spec.ts remains for root focus styling only.
- **scenes.test.ts; tests/e2e/game.e2e.ts:** scene wiring/edge draining, revise all existing empty-ground `noOneNearby` assertions to expect no-op, and use *trusted real keyboard* E2E for capture, menu path and gate. Update existing Map/locale/HP-potion/Quest E2E flows that assumed Close returns directly to the field; run the **full E2E suite**.

No changes to map layout, art, SFX, generated navigation grids, save schema, battle handling, HUD screen set, Tauri/Rust runtime or CI structure. If genuinely new art/SFX is needed later, use a **separate art task** rather than mixing generation into this coding PR.

## Acceptance criteria — macOS and Windows end to end

1. Native Tauri **macOS and Windows** builds: from New Run and Continue, Escape opens Menu, arrows focus Gear, Enter opens it, first Escape returns to Menu, second Escape returns to field. On-screen Back and pad B follow the same origin-aware close destination. On **macOS WKWebView**, mouse-click Menu -> Gear and mouse-click a different command after a keyboard opening; Back returns to the **actual clicked** tile, not a stale tile or the field. Gamepad Start preserves the existing initial focus behavior.
2. I from a ready field opens Gear directly; Escape returns to the field. M still toggles a directly opened Map. Neither hotkey opens a new screen from title, dialogue, battle, editable input or unrelated overlay.
3. Tab to the visible Menu button; pressing trusted Enter **and** trusted Space in separate attempts opens Menu exactly once with **no Traveler dialogue**. Focus a command tile, press Enter; native button activation opens the right screen rather than being cancelled by Phaser.
4. Equip an item from Gear until the focused Equip action disappears and DOM focus falls to body; the **first Escape** still closes Gear and returns to its origin, with valid focus and no pause leak.
5. In empty field space, E/Enter/Space does **nothing** and shows no new status. NPCs, discoveries, ambient villagers and shops still behave normally. Press E during a paused overlay, then close it: no delayed interaction.
6. Facing the actual south-road **!** gate, E produces just the localized one-line barred status. The 32px probe reaches an adjacent one-tile-thick gate but never acts on an interior/ruins non-grid map. Facing P or ^ terrain does not report barred. Confirm the gate action does not open a dialogue.
7. en, ja and zh-Hant messages and the locale-parity test pass. The dialogue root has no white browser outline, while actionable buttons/choices keep a visible focus state.
8. **Visual check and automated geometry:** compare the Menu control at 1280×720 and **640×360** with the Linear ticket's UAT screenshot and existing Heroic UI references; use browser-component bounding-box assertions to confirm Menu does **not** overlap the minimap, quest banner or hero card at 640×360 (plus a standard-size check).
9. Relevant component, pure helper, scene and **full** Playwright E2E regression tests pass, including updated existing Skill/Bag/Quest/Map/System screen-close tests and Map/locale/HP-potion/Quest E2E tests. Save overwrite Escape cancels the confirmation, not the whole Save screen. No unrelated game behavior changes. Android/Linux need no manual acceptance; use CI where available.

**State:** documentation only, not yet implemented or tested. All subsequent changes go into PR #66.
