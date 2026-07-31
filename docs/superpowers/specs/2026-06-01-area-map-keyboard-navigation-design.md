# Area Map: `M` Shortcut + Keyboard-Navigable Markers

**Date:** 2026-06-01
**Status:** Approved, ready for planning
**Builds on:** `docs/superpowers/specs/2026-05-19-area-map-design.md`

## Summary

The enlarged, annotated area map already exists. Opening **Menu → "Map"**
shows a full-screen dialog (`areaMapOpen` in `src/lib/game/GameShell.svelte`)
that pauses the game, draws fog-of-war, renders building/exit/quest markers
**each with a text label**, emphasizes the active main-quest marker, shows the
player's position, has a legend, and closes on Esc / backdrop / Close button.

This feature adds the two things that are genuinely missing relative to a
player who wants a quick, keyboard-driven annotated map:

1. **An `M` shortcut** that toggles the map open/closed (today the only entry
   point is the Menu → Map button).
2. **Keyboard-navigable markers** — Tab/Shift+Tab cycles focus through the
   markers, the focused marker is highlighted, and its name is surfaced.

The "annotated building/area" requirement (labels on the map) is already
satisfied by the existing rendering and is not re-implemented here.

## Scope

In scope:
- Add a client-side `window` keydown handler in `GameShell.svelte` for `M`.
- Make each area-map marker focusable and reachable via the dialog's existing
  Tab focus trap.
- Highlight the focused marker and show a "Selected: {name}" caption.

Out of scope (YAGNI):
- A world/region multi-area overview map.
- Authored marker descriptions or a per-marker detail panel.
- Arrow-key spatial navigation between markers.
- Mouse click-to-travel / fast-travel.

Explicitly **unchanged**:
- `src/lib/game/core/area-map.ts` and the `HudAreaMapState` shape.
- `src/lib/game/ui-bridge/events.ts` — **no new `HudCommand`, no `HudState`
  field**.
- `src/lib/game/phaser/scenes/WorldScene.ts` — **no Phaser changes**. Phaser's
  keyboard only captures WASD / arrows / E / Space / Enter, so `M` is free.

## Architecture decisions

### Decision A — the `M` shortcut lives in Svelte (not Phaser)

The map's open/close state (`areaMapOpen`) and its pause wiring
(`pauseForOverlay('areaMap')` / `resumeForOverlay('areaMap')`) already live in
`GameShell.svelte`. Handling `M` there toggles that state directly with no new
cross-runtime signalling.

Rejected alternative: own the key in `WorldScene` and push a toggle signal
through `HudState`. That would require a new `HudState` field plus a Svelte
effect to detect the signal — more moving parts for no benefit, since the
overlay/pause state is already Svelte-side.

### Decision B — Tab-cycle focusable markers (not arrow-key spatial nav)

Markers become focusable SVG elements, so the dialog's **existing** focus trap
(`handleAreaMapDialogKeydown` + `getAreaMapFocusableElements`) cycles through
them in DOM order with Tab/Shift+Tab. This reuses machinery that already
exists and is fully accessible.

Rejected alternative: arrow-key spatial selection (nearest marker in a
direction). It needs custom spatial math and a selection model separate from
DOM focus, which is overkill given the focused marker only needs to show its
name.

## Detailed design

### 1. `M` shortcut

Register a `window` `keydown` listener in `GameShell.svelte` (client-only, with
cleanup on teardown).

Act only when **all** of these hold:
- `event.key` is `m` or `M`.
- No `ctrlKey` / `metaKey` / `altKey` modifier.
- `event.repeat` is `false` (ignore key-hold auto-repeat).
- The event target is not an editable element (input / textarea /
  `isContentEditable`).

Behavior when the listener acts:
- If `areaMapOpen` is `true` → `closeAreaMap()`.
- Else, open **only if the Map button's own enabled conditions hold**
  (`$hudState.ready && !battleLocked`) **and no other overlay is open**
  (settings, inventory, shop, quest log, command/menu panel) → `openAreaMap()`.
- Call `event.preventDefault()` whenever the handler acts.

`openAreaMap` / `closeAreaMap` are reused as-is; they already manage pause and
focus. A small helper (e.g. `anyOverlayOpen()` derived from the existing
overlay `$state` flags) keeps the guard readable.

### 2. Keyboard-navigable markers

Current marker markup (`GameShell.svelte`, area-map dialog SVG):

```svelte
{#each $hudState.areaMap.markers as marker (marker.id)}
  <g class={`area-map-marker area-map-marker-${marker.kind} ${marker.emphasis ? 'area-map-marker-emphasis' : ''}`}
     transform={`translate(${marker.x} ${marker.y})`}>
    <circle r={marker.emphasis ? 64 : 48} />
    <text x="76" y="18">{marker.label}</text>
  </g>
{/each}
```

Changes per marker `<g>`:
- Add `tabindex="0"`, `role="button"`, `aria-label={marker.label}`.
- Add `onfocus`/`onblur` handlers that set/clear a component-level
  `focusedMarkerId` `$state`.
- Add a `area-map-marker-focused` class (or rely on `:focus-visible`) for the
  highlight.

Highlight: a `:focus-visible` style on `.area-map-marker` adds a halo/outline
and enlarges/bolds the label, surfacing the focused marker's name. The player
marker stays non-focusable.

**Focus-trap fix (required):** `getAreaMapFocusableElements` filters on
`element.offsetParent !== null`. `offsetParent` is always `null` for SVG
elements, so SVG markers would be silently excluded from the trap. Change this
**area-map-specific** helper (it is not shared with the inventory/shop traps)
to an SVG-safe visibility check, e.g. `element.getClientRects().length > 0`.
After the fix, Tab order is: Close button → marker 1 … marker N → wrap to Close.
Initial dialog focus remains the Close button (existing `focusAreaMapDialog`).

### 3. "Selected: {name}" caption

Render a caption near the legend showing the currently `focusedMarkerId`'s
label, e.g. `Selected: Hero's House`. When no marker is focused, the caption is
empty/hidden. This is visual reinforcement and a stable test hook; screen
readers are already served by each marker's `aria-label`.

### 4. i18n

One new UI string, `ui.areaMapSelectedMarker`, added to **all three** locale
files (`en`, `ja`, `zh-Hant`) per project rule. The value embeds the marker
name via the `{{name}}` interpolation token the other `ui.*` strings already
use — English value `Selected: {{name}}`, with equivalent `ja` / `zh-Hant`
translations. No other new strings: marker labels and the existing `ui.map` /
`ui.areaMap` / `ui.areaMapDialog` / `ui.currentPosition` / `ui.unexplored` keys
are reused. The caption renders `t($locale, 'ui.areaMapSelectedMarker', { name })`.

## Testing

Browser-component spec (`*.svelte.spec.ts`, runs in real Chromium so focus and
keyboard behavior are real). Extend the existing area-map coverage in
`src/lib/game/DialoguePanel.svelte.spec.ts` (or a focused new spec):

- Pressing `M` (window keydown) opens the map dialog.
- Pressing `M` again closes it; Esc still closes it.
- `M` is ignored while `battleLocked` and while another overlay is open.
- `M` is ignored when a modifier is held or `event.repeat` is true.
- Markers are focusable: the count of `tabindex="0"` markers inside
  `[data-testid="area-map-svg"]` equals the marker count.
- Tab from the Close button moves focus to a marker (trap includes markers).
- Focusing a marker shows the highlight and the "Selected: {name}" caption.

Unchanged:
- `src/lib/game/core/area-map.test.ts` — data layer is untouched.

Optional:
- An e2e (`tests/e2e/`) that presses `m` and asserts the map appears.

## Risks / notes

- **SVG focusability:** `tabindex` on SVG `<g>` is well supported in Chromium
  (the test runtime) and the Tauri webview; the `getClientRects` filter change
  is what actually makes the trap include them.
- **No double-handling of `M`:** Phaser does not bind `M`, so the Svelte
  window listener is the sole handler; no `preventDefault` race with the canvas.
- **Guarding open:** reuse the Map button's existing enabled predicate so the
  shortcut and the button stay consistent if those conditions change later.
