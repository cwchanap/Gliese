# HUD Redesign — "Astral Codex" (Refined Arcane Glass)

**Date:** 2026-06-06
**Status:** Approved design, pending implementation plan
**Scope:** Full HUD — both the always-on in-game overlay and all popup windows.

## Goal

Replace the current dark-purple "JRPG window" HUD with a cohesive, polished
**refined arcane-glass** aesthetic ("Astral Codex"), themed around the game's
star name *Gliese*. The redesign is a visual + motion layer plus modest
repositioning. Game behavior, focus management, i18n, the Phaser ↔ Svelte
bridge, and all `HudState` data flow are **untouched**.

## Non-Goals

- No component decomposition of `GameShell.svelte` (the giant overlays stay in
  one file for this pass; a later refactor can split them out).
- No changes to game logic, save format, events, or the HUD data model.
- No new HUD features or data — only what is already surfaced in `HudState`.

## Decisions (locked)

| Topic | Decision |
| --- | --- |
| Aesthetic | "Astral Codex" — obsidian frosted-glass panels, gold filigree framing, jewel-tone light, faint celestial depth |
| Latitude | Restyle **+ rethink** — full latitude (reposition menu button, relocate gold to a coin token, quest panel as scroll plate) |
| Motion | Rich & cinematic, with a full `prefers-reduced-motion` fallback |
| Styling architecture | Tailwind v4 `@theme` tokens + Tailwind utilities for layout/one-offs + named component classes in a global `@layer components` block in `src/app.css` |
| Typography | **Cinzel** (display/titles/labels) + **Spectral** (body), both bundled offline via `@fontsource` (no CDN at runtime) |

## Architecture

The project is Tailwind v4 (CSS-first, `@import 'tailwindcss'` in `src/app.css`,
`@tailwindcss/vite`, no config file). The current HUD is already a hybrid of
Tailwind utilities + scoped `.jrpg-*` classes. This redesign formalizes that
split:

1. **Token layer — `@theme` in `src/app.css`.** Define the arcane-glass palette
   and design tokens as Tailwind theme variables so they generate utilities
   (`text-gold`, `border-sapphire/40`, etc.) and are usable from custom CSS.
   These supersede the per-component `--jrpg-*` vars.

2. **Component-class layer — global `@layer components` in `src/app.css`.** The
   heavy "material" and motion treatments that are verbose or impossible as
   utilities live here as named classes:
   - `glass-panel` / `glass-panel-strong` — layered obsidian gradient + radial
     sheen + grain overlay + frosted blur + double-edge (gold rim + inner stroke).
   - `filigree-frame` — corner ornaments via `::before`/`::after`
     (`clip-path`/gradients).
   - `arcane-meter` — HP/XP bar shell + animated fill + moving sheen.
   - `glass-button` — glass surface + glint-sweep on hover/focus.
   - `jeweled-cell` — inventory/shop slot with per-type accent glow.
   - `@keyframes` for sheen sweep, halo pulse, staggered reveal, level-up
     shimmer, status fade/slide.

3. **Markup layer — components.** `GameShell.svelte` and `DialoguePanel.svelte`
   point at the token utilities + component classes. Each component's `<style>`
   block shrinks to only genuinely component-local rules.

### Token set (initial)

- Base: `ink` (obsidian), `panel-glass` (translucent indigo), `panel-glass-strong`
- Accents: `gold` (framing / currency / primary), `sapphire` (XP / info),
  `emerald` (HP / positive), `amber` (warnings), `rose` (player marker / danger / low-HP)
- `lumen` — cinematic highlight/glow color
- Per-accent soft-glow shadow tokens + a grain/noise background token
- Radius token tightened slightly from the current `0.35rem` for a crisper frame

Exact hex values are an implementation detail to be tuned during build; they
evolve the existing `--jrpg-*` palette (cream→gold text, indigo glass, jewel
accents) rather than inventing an unrelated scheme.

## Component-by-component design

### Always-on HUD

- **Location plate** (top-left, `hud-location-panel`): engraved Cinzel title +
  Spectral region subline on a `glass-panel` with `filigree-frame` corners.
- **Minimap** (top-right, `hud-minimap`): reframed as an "astral chart" — subtle
  grid, glowing revealed cells, **pulsing player halo**, shimmering quest
  markers. SVG structure and `area-map`-style markers preserved.
- **Party panel** (bottom-left, `hud-party-panel`): portrait in a gold sigil-ring
  frame; HP (emerald) and XP (sapphire) use `arcane-meter` with animated fill +
  sheen; **low HP (<25%) triggers a red glow pulse**. Numerics use tabular figures.
- **Side rail** (bottom-right, `hud-side-panel`): gold **coin token** (relocated
  from the plain gold panel) with a soft flash on change + active-quest **scroll
  plate**.
- **Menu toggle** (`menuButton`): restyled as a glass sigil button and
  **repositioned** to sit cleanly within the top-right cluster instead of
  floating mid-edge.
- **Field status**: centered glass pill that **fades/slides when its text changes**.

### Overlay windows (command, inventory, shop, quest log, area map, battle summary)

- Unified `glass-panel-strong` "codex" windows (`jrpg-window`,
  `jrpg-window-header` class hooks preserved) with filigree headers, Cinzel
  titles, jeweled tabs, and `glass-button` actions with glint-sweep hover.
- Inventory/shop slots (`inventory-slot`, `inventory-slot-grid`, `shop-buy-grid`,
  `shop-sell-grid`) become `jeweled-cell`s with per-type accent glow
  (emerald = consumable, sapphire = equipment, amber = key/shop).
- Tooltips become floating glass cards.
- **Battle summary**: cinematic reveal — shimmering "Victory/Defeat" banner +
  staggered stat-line reveals.

### Dialogue panel (`DialoguePanel.svelte`)

Restyled to the same glass/filigree language (`jrpg-dialogue-panel` class hook
preserved); speaker label in Cinzel, line in Spectral, glass-button actions and
choices.

## Motion (rich / cinematic)

- **Overlay open:** backdrop fade + window scale/rise, with staggered children
  (header → tabs → body) via `animation-delay`.
- **Meters:** animated width + moving sheen; low-HP pulse.
- **Hover/focus:** glass lift, rim brighten, glint sweep across buttons.
- **Minimap:** player-halo pulse; quest-marker shimmer.
- **Level-up:** gold shimmer burst on the party panel.
- **Currency change:** coin-token flash.
- **Field status:** fade/slide on text change.
- **Reduced motion:** a single `@media (prefers-reduced-motion: reduce)` block
  disables/*neutralizes* all of the above (instant state changes, no sweeps,
  no pulses).

## Typography

Add `@fontsource/cinzel` and `@fontsource/spectral` as dependencies and import
the needed weights in `src/main.ts` (or `src/app.css`). Define them as the
display/body font tokens. Cinzel is used caps-only (titles, labels, tabs, hero
name, location); Spectral covers body text, descriptions, tooltips, dialogue
lines. Numeric HUD values use tabular figures.

## Guardrails / compatibility

These must be preserved so the unit + e2e suites keep passing:

- **Test IDs:** `hud-location-panel`, `hud-minimap`, `hud-party-panel`,
  `hud-side-panel`, `inventory-slot-grid`, `inventory-slot`, `shop-buy-grid`,
  `shop-sell-grid`, `area-map-svg`, `area-map-player`, `area-map-selected`.
- **Class hooks asserted by tests:** `jrpg-window`, `jrpg-window-header`,
  `jrpg-side-rail`, `jrpg-dialogue-panel`.
- All ARIA roles/labels, `aria-modal`, focus-trap behavior, tab roving, and
  keyboard handlers stay functionally identical.
- No changes to `ui-bridge/events.ts`, `store.ts`, `WorldScene`, or `HudState`.

## Testing

- `bun run check` (svelte-check) and `bun run lint` clean.
- `bun run test:unit -- --run` green (HUD component specs unchanged).
- `bun run test:e2e` green.
- Manual visual pass in `bun run dev` (browser) covering: idle HUD, low-HP pulse,
  each overlay open/close, battle summary victory + defeat, dialogue, and a
  `prefers-reduced-motion` check.
- Svelte MCP `svelte-autofixer` run on any modified `.svelte` markup.

## Risks

- **Cinzel/Spectral legibility at tiny sizes.** Mitigate: Spectral (not Cinzel)
  for all small/dense text; keep minimum sizes; tabular numerics.
- **Cinematic motion cost / distraction during play.** Mitigate: keep always-on
  motion subtle (only meters, halo, status); reserve heavy reveals for overlays;
  full reduced-motion fallback.
- **`backdrop-blur` performance over the Phaser canvas.** Mitigate: blur only on
  panels/overlays already using it; verify in the Tauri window, not just browser.
