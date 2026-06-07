# HUD Arcane-Glass Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current dark-purple JRPG HUD with a cohesive "Astral Codex" refined arcane-glass look (full HUD + overlays + dialogue), with rich/cinematic motion and a reduced-motion fallback.

**Architecture:** Tailwind v4 CSS-first. Design tokens go in an `@theme` block in `src/app.css`; heavy "material" + motion treatments become named classes in a global `@layer components` block in `src/app.css`; Svelte components point markup at those tokens/classes and shed their old per-component `.jrpg-*` styles. Behavior, focus management, i18n, the Phaser bridge, and `HudState` are untouched.

**Tech Stack:** Svelte 5 (runes), Tailwind v4 (`@tailwindcss/vite`), TypeScript, Vitest (+ vitest-browser-svelte), Playwright, `@fontsource/cinzel` + `@fontsource/spectral`, bun.

**Reference spec:** `docs/superpowers/specs/2026-06-06-hud-arcane-glass-redesign-design.md`

---

## A note on TDD for this plan

Most of this work is visual CSS, which can't be driven by red-green unit tests. The regression net is: **existing component specs + `bun run check` + `bun run lint` + svelte-autofixer must stay green at every task boundary, and all `data-testid`/class hooks listed in the spec's Guardrails must survive.** The only new *logic* is the low-HP pulse flag (Task 6), which is written test-first. Treat "verify" steps as the discipline: no task is "done" until its verification passes and it is committed.

## Guardrails (must survive every task)

- **Test IDs:** `hud-location-panel`, `hud-minimap`, `hud-party-panel`, `hud-side-panel`, `inventory-slot-grid`, `inventory-slot`, `shop-buy-grid`, `shop-sell-grid`, `area-map-svg`, `area-map-player`, `area-map-selected`.
- **Class hooks asserted by tests:** `jrpg-window`, `jrpg-window-header`, `jrpg-side-rail`, `jrpg-dialogue-panel`.
- No edits to `src/lib/game/ui-bridge/events.ts`, `store.ts`, `WorldScene.ts`, or `HudState`.

## File Structure

- **Modify** `package.json` — add `@fontsource/cinzel`, `@fontsource/spectral` deps.
- **Modify** `src/main.ts` — import the bundled font CSS.
- **Modify** `src/app.css` — add `@theme` tokens, `@layer components` classes, `@keyframes`, and a `prefers-reduced-motion` block. This is the design-system core.
- **Modify** `src/lib/game/GameShell.svelte` — re-point markup at tokens/component classes; reposition menu button; add low-HP flag; shrink the `<style>` block to component-local rules only.
- **Modify** `src/lib/game/DialoguePanel.svelte` — restyle to the shared glass language.
- **Modify** `src/lib/game/GameShell.svelte.spec.ts` — add low-HP pulse assertions (Task 6).

---

### Task 1: Bundle Cinzel + Spectral fonts

**Files:**
- Modify: `package.json`
- Modify: `src/main.ts`

- [ ] **Step 1: Add the font packages**

Run:

```bash
bun add @fontsource/cinzel @fontsource/spectral
```

Expected: both appear under `dependencies` in `package.json`; `bun.lock` updated.

- [ ] **Step 2: Import the needed weights in `src/main.ts`**

Add these imports at the very top of `src/main.ts`, above the existing imports:

```ts
import '@fontsource/cinzel/500.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/spectral/400.css';
import '@fontsource/spectral/500.css';
import '@fontsource/spectral/600.css';
```

- [ ] **Step 3: Verify the app still builds**

Run: `bun run check`
Expected: PASS (no type errors). The fonts are not yet referenced by any style — that's Task 2.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock src/main.ts
git commit -m "Bundle Cinzel and Spectral fonts for HUD redesign"
```

---

### Task 2: Add the arcane-glass token layer to `src/app.css`

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: Replace the contents of `src/app.css` with the import + token block**

`src/app.css` currently contains only `@import 'tailwindcss';`. Replace the whole file with:

```css
@import 'tailwindcss';

@theme {
	/* Surfaces */
	--color-ink: #0a0712;
	--color-panel-glass: rgba(22, 18, 38, 0.82);
	--color-panel-glass-strong: rgba(18, 15, 32, 0.94);

	/* Framing + text */
	--color-frame: rgba(243, 210, 122, 0.34);
	--color-frame-strong: rgba(243, 210, 122, 0.62);
	--color-parchment: #f6efe0;
	--color-muted: #b6a9c8;

	/* Jewel accents */
	--color-gold: #f3d27a;
	--color-gold-bright: #ffe6a8;
	--color-sapphire: #6ab4f5;
	--color-emerald: #5fd89b;
	--color-amber: #ffc857;
	--color-rose: #f0617a;
	--color-lumen: #cfe3ff;

	/* Type */
	--font-display: 'Cinzel', 'Trajan Pro', serif;
	--font-body: 'Spectral', 'Georgia', serif;

	/* Frame radius (tighter than the old 0.35rem) */
	--radius-arcane: 0.28rem;
}
```

- [ ] **Step 2: Verify Tailwind compiles the tokens**

Run: `bun run check`
Expected: PASS. (Token utilities like `text-gold` now exist but aren't used yet.)

- [ ] **Step 3: Commit**

```bash
git add src/app.css
git commit -m "Add arcane-glass design tokens to Tailwind theme"
```

---

### Task 3: Add the component-class + motion layer to `src/app.css`

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: Append the component layer, keyframes, and reduced-motion block**

Append the following to the end of `src/app.css` (after the `@theme` block from Task 2):

```css
@layer components {
	/* ---- Arcane glass material ---------------------------------------- */
	.glass-panel,
	.glass-panel-strong {
		position: relative;
		color: var(--color-parchment);
		border: 1px solid var(--color-frame);
		border-radius: var(--radius-arcane);
		background:
			radial-gradient(120% 90% at 12% 8%, rgba(123, 142, 214, 0.16), transparent 56%),
			linear-gradient(150deg, var(--color-panel-glass), rgba(8, 6, 16, 0.92));
		box-shadow:
			0 18px 44px rgba(0, 0, 0, 0.5),
			inset 0 0 0 1px rgba(8, 6, 16, 0.6),
			inset 0 1px 0 rgba(255, 246, 224, 0.08);
		backdrop-filter: blur(10px);
	}

	.glass-panel-strong {
		background:
			radial-gradient(120% 90% at 12% 8%, rgba(123, 142, 214, 0.2), transparent 56%),
			linear-gradient(150deg, var(--color-panel-glass-strong), rgba(8, 6, 16, 0.96));
		box-shadow:
			0 34px 100px rgba(0, 0, 0, 0.6),
			inset 0 0 0 1px rgba(8, 6, 16, 0.66),
			inset 0 1px 0 rgba(255, 246, 224, 0.1);
		backdrop-filter: blur(16px);
	}

	/* Faint grain overlay shared by glass surfaces */
	.glass-panel::after,
	.glass-panel-strong::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		opacity: 0.05;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
	}

	/* ---- Filigree corner ornaments ----------------------------------- */
	.filigree-frame {
		position: relative;
	}
	.filigree-frame::before,
	.filigree-frame::after {
		content: '';
		position: absolute;
		width: 0.9rem;
		height: 0.9rem;
		pointer-events: none;
		border: 1px solid var(--color-frame-strong);
		opacity: 0.7;
	}
	.filigree-frame::before {
		top: 0.28rem;
		left: 0.28rem;
		border-right: 0;
		border-bottom: 0;
		border-top-left-radius: var(--radius-arcane);
	}
	.filigree-frame::after {
		right: 0.28rem;
		bottom: 0.28rem;
		border-left: 0;
		border-top: 0;
		border-bottom-right-radius: var(--radius-arcane);
	}

	/* ---- Arcane meter (HP / XP) -------------------------------------- */
	.arcane-meter {
		position: relative;
		display: block;
		height: 0.5rem;
		overflow: hidden;
		border: 1px solid rgba(255, 246, 224, 0.16);
		border-radius: 999px;
		background: rgba(8, 6, 16, 0.74);
	}
	.arcane-meter > span {
		position: relative;
		display: block;
		height: 100%;
		transition: width 260ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.arcane-meter > span::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			100deg,
			transparent 30%,
			rgba(255, 255, 255, 0.45) 50%,
			transparent 70%
		);
		transform: translateX(-120%);
		animation: arcane-sheen 2.8s ease-in-out infinite;
	}
	.arcane-meter-hp > span {
		background: linear-gradient(90deg, #2f9b6e, var(--color-emerald));
	}
	.arcane-meter-xp > span {
		background: linear-gradient(90deg, #2f6fb0, var(--color-sapphire));
	}

	/* ---- Glass button (glint sweep) --------------------------------- */
	.glass-button {
		position: relative;
		overflow: hidden;
		border: 1px solid var(--color-frame);
		border-radius: var(--radius-arcane);
		background: rgba(255, 246, 224, 0.06);
		color: var(--color-parchment);
		font-family: var(--font-display);
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background 160ms ease;
	}
	.glass-button::before {
		content: '';
		position: absolute;
		inset: 0;
		transform: translateX(-130%);
		background: linear-gradient(
			100deg,
			transparent 35%,
			rgba(255, 246, 224, 0.28) 50%,
			transparent 65%
		);
		transition: transform 520ms ease;
		pointer-events: none;
	}
	.glass-button:hover:not(:disabled),
	.glass-button:focus-visible {
		border-color: var(--color-frame-strong);
		background: rgba(243, 210, 122, 0.12);
		outline: none;
	}
	.glass-button:hover:not(:disabled)::before,
	.glass-button:focus-visible::before {
		transform: translateX(130%);
	}
	.glass-button:disabled {
		cursor: not-allowed;
		opacity: 0.42;
	}

	/* ---- Jeweled inventory/shop cell -------------------------------- */
	.jeweled-cell {
		position: relative;
		border: 1px solid rgba(255, 246, 224, 0.14);
		border-radius: 0.85rem;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			box-shadow 160ms ease;
	}
	.jeweled-cell-emerald {
		background: linear-gradient(145deg, rgba(28, 69, 62, 0.5), rgba(10, 7, 18, 0.86));
	}
	.jeweled-cell-sapphire {
		background: linear-gradient(145deg, rgba(25, 59, 88, 0.52), rgba(10, 7, 18, 0.86));
	}
	.jeweled-cell-amber {
		background: linear-gradient(145deg, rgba(86, 60, 22, 0.52), rgba(10, 7, 18, 0.86));
	}
	.jeweled-cell-action:hover {
		transform: translateY(-2px);
		border-color: var(--color-frame-strong);
		box-shadow:
			0 12px 28px rgba(0, 0, 0, 0.3),
			0 0 18px rgba(243, 210, 122, 0.18);
	}

	/* ---- Cinematic entrance for overlays ---------------------------- */
	.arcane-window-enter {
		animation: arcane-window-rise 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	.arcane-stagger > * {
		animation: arcane-fade-up 320ms ease both;
	}
	.arcane-stagger > *:nth-child(1) { animation-delay: 60ms; }
	.arcane-stagger > *:nth-child(2) { animation-delay: 120ms; }
	.arcane-stagger > *:nth-child(3) { animation-delay: 180ms; }
	.arcane-stagger > *:nth-child(4) { animation-delay: 240ms; }

	/* ---- State flourishes ------------------------------------------- */
	.arcane-low-hp {
		animation: arcane-danger-pulse 1.1s ease-in-out infinite;
	}
	.arcane-coin-flash {
		animation: arcane-coin-flash 600ms ease;
	}
	.arcane-halo {
		animation: arcane-halo 2.4s ease-in-out infinite;
		transform-origin: center;
	}
}

@keyframes arcane-sheen {
	0%, 60% { transform: translateX(-120%); }
	100% { transform: translateX(120%); }
}
@keyframes arcane-window-rise {
	from { opacity: 0; transform: translateY(14px) scale(0.985); }
	to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes arcane-fade-up {
	from { opacity: 0; transform: translateY(8px); }
	to { opacity: 1; transform: translateY(0); }
}
@keyframes arcane-danger-pulse {
	0%, 100% { box-shadow: 0 0 0 rgba(240, 97, 122, 0); }
	50% { box-shadow: 0 0 22px rgba(240, 97, 122, 0.55); }
}
@keyframes arcane-coin-flash {
	0% { color: var(--color-gold-bright); text-shadow: 0 0 16px rgba(255, 230, 168, 0.85); }
	100% { color: var(--color-gold); text-shadow: none; }
}
@keyframes arcane-halo {
	0%, 100% { opacity: 0.35; transform: scale(1); }
	50% { opacity: 0.8; transform: scale(1.18); }
}

@media (prefers-reduced-motion: reduce) {
	.arcane-meter > span::after,
	.glass-button::before,
	.arcane-window-enter,
	.arcane-stagger > *,
	.arcane-low-hp,
	.arcane-coin-flash,
	.arcane-halo {
		animation: none !important;
		transition: none !important;
		transform: none !important;
	}
}
```

- [ ] **Step 2: Verify it compiles**

Run: `bun run check`
Expected: PASS.

- [ ] **Step 3: Verify lint/format is clean**

Run: `bun run lint`
Expected: PASS (prettier + eslint). If prettier rewrites `app.css`, re-stage it.

- [ ] **Step 4: Commit**

```bash
git add src/app.css
git commit -m "Add arcane-glass component classes, keyframes, and reduced-motion layer"
```

---

### Task 4: Restyle the always-on HUD (location, minimap, party, side rail, menu, field status)

**Files:**
- Modify: `src/lib/game/GameShell.svelte` (markup in the `<section class="game-shell">` block, ~lines 791–935; `<style>` block ~1753–2619)

This task re-points the always-on HUD markup at the new tokens/component classes and removes the corresponding old `.jrpg-*` rules. Do NOT touch the overlay windows yet (Task 5). Keep every `data-testid` and `aria-*` attribute exactly as-is.

- [ ] **Step 1: Set the shell font to the body serif**

In `src/lib/game/GameShell.svelte`, change the root `<section>` inline font (currently `style="font-family: 'Avenir Next Condensed', ...;"`) to:

```svelte
<section
	class="game-shell relative h-screen w-screen overflow-hidden bg-ink font-body text-parchment"
>
```

Remove the now-redundant `style="font-family: ...;"` attribute and the old `bg-[#060816] text-slate-50` classes.

- [ ] **Step 2: Re-point the location plate**

Replace the location panel `<section>` (the `data-testid="hud-location-panel"` block) classes so it uses `glass-panel filigree-frame` plus positioning utilities, keeping the test id and aria-label. Example:

```svelte
<section
	data-testid="hud-location-panel"
	class="glass-panel filigree-frame jrpg-location-panel"
	aria-label={$hudState.areaMap.name}
>
	<p class="jrpg-location-name font-display">{$hudState.areaMap.name}</p>
	<p class="jrpg-location-sub">{t($locale, 'ui.regionSubline')}</p>
</section>
```

Keep `jrpg-location-panel` as a thin positioning-only class (defined in Step 8).

- [ ] **Step 3: Re-point the minimap as an astral chart + add player halo**

On the `data-testid="hud-minimap"` `<section>`, swap the panel classes to `glass-panel filigree-frame jrpg-minimap-panel`. Inside the SVG, wrap the existing player `<circle class="jrpg-minimap-player">` so a halo renders behind it:

```svelte
<circle
	class="jrpg-minimap-player-halo arcane-halo"
	cx={$hudState.areaMap.player.x}
	cy={$hudState.areaMap.player.y}
	r="120"
/>
<circle
	class="jrpg-minimap-player"
	cx={$hudState.areaMap.player.x}
	cy={$hudState.areaMap.player.y}
	r="62"
/>
```

(The halo circle is purely decorative; leave existing marker markup unchanged.)

- [ ] **Step 4: Re-point the party panel meters**

On `data-testid="hud-party-panel"`, swap to `glass-panel filigree-frame jrpg-party-panel`. Change the two `<div class="jrpg-meter">` wrappers to the arcane meter:

```svelte
<div class="jrpg-party-meter jrpg-party-meter-hp">
	<div>
		<span>{t($locale, 'ui.hp')}</span>
		<span class="tabular-nums">{$hudState.hp}/{$hudState.maxHp}</span>
	</div>
	<div class="arcane-meter arcane-meter-hp"><span style={`width: ${hpPercent}%`}></span></div>
</div>
<div class="jrpg-party-meter jrpg-party-meter-xp">
	<div>
		<span>{t($locale, 'ui.xp')}</span>
		<span class="tabular-nums">{$hudState.xp}/{xpTarget}</span>
	</div>
	<div class="arcane-meter arcane-meter-xp"><span style={`width: ${xpPercent}%`}></span></div>
</div>
```

(The low-HP pulse class is added in Task 6, not here.)

- [ ] **Step 5: Relocate gold into a coin token + restyle side rail**

On `data-testid="hud-side-panel"` keep the `jrpg-side-hud` class. Change the gold panel to a coin token using `glass-panel`, and the active-quest panel to `glass-panel filigree-frame`:

```svelte
<div class="glass-panel jrpg-coin-token">
	<span class="font-display tabular-nums">{$hudState.wallet.coins}{t($locale, 'ui.goldSuffix')}</span>
</div>
{#if $hudState.quests.main}
	<section class="glass-panel filigree-frame jrpg-active-quest-panel">
		<p class="jrpg-label font-display">{t($locale, 'ui.activeQuest')}</p>
		<h2 class="font-display">{$hudState.quests.main.title}</h2>
		<p>{$hudState.quests.main.objective}</p>
		{#if $hudState.quests.side.length > 0}
			<span>{t($locale, 'ui.sideActive', { count: $hudState.quests.side.length })}</span>
		{/if}
	</section>
{/if}
```

- [ ] **Step 6: Reposition + restyle the menu toggle**

Change the menu button to `glass-button` and move its anchor into the top-right cluster (see Step 8 for the `.jrpg-menu-anchor` reposition):

```svelte
<button
	bind:this={menuButton}
	type="button"
	class="glass-button jrpg-command-toggle"
	onclick={() => (commandOpen ? closeCommand() : openCommand())}
	aria-expanded={commandOpen}
	aria-controls="game-command-panel"
>
	{t($locale, 'ui.menu')}
</button>
```

- [ ] **Step 7: Restyle the field-status pill**

Change the field-status `<div>` to use the glass panel, and add a Svelte `{#key}` wrapper so it re-animates on text change:

```svelte
{#key $hudState.status}
	<div
		class="glass-panel jrpg-field-status arcane-window-enter"
		role="status"
		aria-label={t($locale, 'ui.fieldStatus')}
		aria-live="polite"
	>
		{$hudState.status}
	</div>
{/key}
```

- [ ] **Step 8: Trim the `<style>` block for these elements**

In the `<style>` block, delete the old colour/border/background/shadow rules now provided by the component classes, and KEEP only positioning/sizing/typography for the thin `jrpg-*` helpers. Specifically:

- Delete the `.game-shell { --jrpg-* ... }` custom-property block (tokens now come from `@theme`).
- Delete the shared `.jrpg-hud-panel, .jrpg-command-box, .jrpg-field-status { border/background/box-shadow }` rule's border/background/shadow (those elements now carry `glass-panel`).
- Keep `.jrpg-location-panel`, `.jrpg-minimap-panel`, `.jrpg-party-panel`, `.jrpg-side-hud`, `.jrpg-active-quest-panel`, `.jrpg-field-status`, `.jrpg-menu-anchor` as **position/size only**.
- Reposition `.jrpg-menu-anchor` to align with the top-right cluster:

```css
.jrpg-menu-anchor {
	position: absolute;
	top: 0.9rem;
	right: 11.4rem;
	z-index: 30;
}
```

- Replace `.jrpg-gold-panel` with `.jrpg-coin-token` (position + padding + gold text only):

```css
.jrpg-coin-token {
	justify-self: end;
	padding: 0.4rem 0.78rem;
	border-radius: var(--radius-arcane);
	color: var(--color-gold);
	font-size: 1.1rem;
	font-weight: 700;
}
```

- Add the minimap halo style:

```css
.jrpg-minimap-player-halo {
	fill: rgba(240, 97, 122, 0.5);
}
```

- Update any remaining `var(--jrpg-*)` references in kept rules to the new `var(--color-*)`/`var(--radius-arcane)` names. (e.g. `var(--jrpg-text)` → `var(--color-parchment)`, `var(--jrpg-amber)` → `var(--color-gold)`, `var(--jrpg-muted)` → `var(--color-muted)`, `var(--jrpg-radius)` → `var(--radius-arcane)`.)

> Note: the overlay windows still reference `var(--jrpg-*)` until Task 5. To avoid breaking them mid-task, temporarily keep the `--jrpg-*` custom properties on `.game-shell` and remove them in Task 5 Step 6. (Simplest: leave the `:root`-style var block in place this task, delete in Task 5.)

- [ ] **Step 9: Run the autofixer on the component**

Use the Svelte MCP `svelte-autofixer` on `src/lib/game/GameShell.svelte`. Apply fixes until it returns no issues.

- [ ] **Step 10: Verify specs + types**

Run: `bun run check`
Expected: PASS.

Run: `bun run test:unit -- --run src/lib/game/GameShell.svelte.spec.ts`
Expected: PASS (all `hud-*` test ids still resolve).

- [ ] **Step 11: Commit**

```bash
git add src/app.css src/lib/game/GameShell.svelte
git commit -m "Restyle always-on HUD with arcane-glass panels and motion"
```

---

### Task 5: Restyle the overlay windows (command, inventory, shop, quest log, area map, battle summary)

**Files:**
- Modify: `src/lib/game/GameShell.svelte` (overlay markup ~937–1751; `<style>` block)

Keep `jrpg-window`, `jrpg-window-header`, `jrpg-side-rail`, and all overlay `data-testid`s exactly as-is. These are class hooks/selectors used by tests.

- [ ] **Step 1: Glass-ify the command panel**

On the `id="game-command-panel"` `<aside>`, replace `jrpg-command-box` background/border styling by adding `glass-panel-strong` to the class list (keep `jrpg-command-box` for positioning). Change every `.jrpg-command-action` and `.jrpg-small-button` to also carry `glass-button`. Add `arcane-stagger` to the `.jrpg-command-list` container so the actions reveal in sequence.

- [ ] **Step 2: Glass-ify the shared window shell**

For each overlay dialog that uses `class="jrpg-window ..."` (battle summary, inventory, area map, quest log, shop), add `glass-panel-strong arcane-window-enter` to the class list, keeping `jrpg-window` (+ any `jrpg-window-narrow`/`jrpg-area-map-window`). Add `font-display` to each `.jrpg-window-title` and `arcane-stagger` to each `.jrpg-window-body` that should reveal its children in sequence (inventory layout, battle summary body).

- [ ] **Step 3: Jewel the tabs and slots**

- Change `.jrpg-tab` buttons to also carry `glass-button` (keep `jrpg-tab`/`jrpg-tab-active` for the active state).
- Replace the long inline gradient/border utility strings on inventory slots, shop buy cells, and shop sell cells with the jeweled-cell classes:
  - consumable slot / sell cell → `jeweled-cell jeweled-cell-emerald jeweled-cell-action`
  - equipment slot → `jeweled-cell jeweled-cell-sapphire jeweled-cell-action`
  - key item slot → `jeweled-cell jeweled-cell-amber`
  - shop buy cell → `jeweled-cell jeweled-cell-amber` + `jeweled-cell-action` when `canBuyShopItem(item)`
  Keep the existing `getInventorySlotClass` helper but have it return the jeweled-cell variant strings instead of the old gradient strings. Preserve `data-testid="inventory-slot"`, the grids' test ids, and the badge/equipped/key sub-spans (only their colour utilities may change to `text-emerald`/`text-sapphire`/`text-amber`/`border-gold/30` token utilities).

- [ ] **Step 4: Cinematic battle summary banner**

In the battle-summary dialog, wrap the outcome label so victory/defeat shimmers using the gold animation. Change the `<p class="jrpg-label">` outcome line to:

```svelte
<p class="jrpg-label font-display {battleSummary.outcome === 'victory' ? 'arcane-coin-flash' : ''}">
	{battleSummary.outcome === 'victory'
		? t($locale, 'ui.battleVictory')
		: t($locale, 'ui.battleDefeat')}
</p>
```

Add `arcane-stagger` to the summary's stat-list container so lines reveal in sequence. Keep the `jrpg-window jrpg-window-narrow` hooks.

- [ ] **Step 5: Glass tooltips + minor token swaps**

Add `glass-panel-strong` to the three `.jrpg-tooltip` elements. Across the overlay markup, swap leftover hard-coded `text-slate-*`/`text-cyan-*`/`bg-white/*` accent utilities to the new token utilities where it improves cohesion (`text-parchment`, `text-muted`, `text-gold`, `text-sapphire`, `text-emerald`, `border-frame`). Do not change structure, text content, or test ids.

- [ ] **Step 6: Finish trimming `<style>` + remove temporary vars**

- Update the `.jrpg-window`, `.jrpg-window-header`, `.jrpg-tab`, `.jrpg-side-rail`, `.jrpg-grid-*`, `.jrpg-tooltip`, `.jrpg-empty-state`, `.area-map-*` rules: delete background/border/shadow now provided by component classes, keep layout/size; update remaining `var(--jrpg-*)` → new token names.
- Delete the temporary `--jrpg-*` custom-property block left on `.game-shell` from Task 4 Step 8.
- Run a grep to confirm no stale references remain:

Run: `grep -n "jrpg-" src/lib/game/GameShell.svelte | grep -i "var(--jrpg"`
Expected: no output.

- [ ] **Step 7: Autofixer**

Run Svelte MCP `svelte-autofixer` on `src/lib/game/GameShell.svelte` until clean.

- [ ] **Step 8: Verify specs + types**

Run: `bun run check`
Expected: PASS.

Run: `bun run test:unit -- --run src/lib/game/GameShell.svelte.spec.ts`
Expected: PASS (window/side-rail/slot/grid test ids + class hooks intact).

- [ ] **Step 9: Commit**

```bash
git add src/app.css src/lib/game/GameShell.svelte
git commit -m "Restyle HUD overlay windows with arcane-glass and cinematic reveals"
```

---

### Task 6: Add the low-HP pulse (test-first) + level-up shimmer + coin flash

**Files:**
- Modify: `src/lib/game/GameShell.svelte.spec.ts`
- Modify: `src/lib/game/GameShell.svelte`

- [ ] **Step 1: Write the failing test for the low-HP pulse**

Add to `src/lib/game/GameShell.svelte.spec.ts`. Match the file's existing render/HUD-state helper pattern (locate how other tests push `gliese:hud-state`; reuse that helper). The assertion:

```ts
it('pulses the party panel when HP is critically low', async () => {
	render(GameShell);
	// emit a hud-state with hp at 20% of maxHp using the same helper the
	// other tests use to dispatch gliese:hud-state
	await emitHudState({ hp: 10, maxHp: 50 });
	const party = page.getByTestId('hud-party-panel');
	await expect.element(party).toHaveClass(/arcane-low-hp/);

	await emitHudState({ hp: 40, maxHp: 50 });
	await expect.element(party).not.toHaveClass(/arcane-low-hp/);
});
```

If the existing spec has no reusable `emitHudState` helper, write the test using the same inline dispatch the neighbouring tests use (copy their setup verbatim, changing only `hp`/`maxHp`).

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test:unit -- --run src/lib/game/GameShell.svelte.spec.ts -t "critically low"`
Expected: FAIL (class `arcane-low-hp` not present).

- [ ] **Step 3: Add the derived flag + class**

In `src/lib/game/GameShell.svelte` script, add near the other `$derived` declarations:

```ts
const lowHp = $derived($hudState.maxHp > 0 && $hudState.hp / $hudState.maxHp <= 0.25);
```

On the `data-testid="hud-party-panel"` element, append `arcane-low-hp` conditionally:

```svelte
class={`glass-panel filigree-frame jrpg-party-panel ${lowHp ? 'arcane-low-hp' : ''}`}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun run test:unit -- --run src/lib/game/GameShell.svelte.spec.ts -t "critically low"`
Expected: PASS.

- [ ] **Step 5: Add coin-flash on wallet change**

Add a `$state` tracker + `$effect` that toggles a flash flag when `coins` changes:

```ts
let coinFlash = $state(false);
let lastCoins = $hudState.wallet.coins;
$effect(() => {
	const coins = $hudState.wallet.coins;
	if (coins !== lastCoins) {
		lastCoins = coins;
		coinFlash = true;
		const id = setTimeout(() => (coinFlash = false), 600);
		return () => clearTimeout(id);
	}
});
```

Apply to the coin token span:

```svelte
<span class={`font-display tabular-nums ${coinFlash ? 'arcane-coin-flash' : ''}`}>
	{$hudState.wallet.coins}{t($locale, 'ui.goldSuffix')}
</span>
```

- [ ] **Step 6: Add level-up shimmer**

Reuse the same pattern keyed on `$hudState.level`: when level increases, add `arcane-coin-flash` (gold shimmer) to the party header level span for ~600ms. Implement with a `levelUpFlash` `$state` + `$effect` mirroring Step 5, applied to the `<span>{t($locale, 'ui.levelAbbrev')} {$hudState.level}</span>` element.

- [ ] **Step 7: Autofixer + full type/lint check**

Run Svelte MCP `svelte-autofixer` on `src/lib/game/GameShell.svelte` until clean.

Run: `bun run check && bun run lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/game/GameShell.svelte src/lib/game/GameShell.svelte.spec.ts
git commit -m "Add low-HP pulse, coin flash, and level-up shimmer to HUD"
```

---

### Task 7: Restyle the dialogue panel

**Files:**
- Modify: `src/lib/game/DialoguePanel.svelte`

Keep the `jrpg-dialogue-panel` class hook (asserted by `DialoguePanel.svelte.spec.ts`).

- [ ] **Step 1: Re-point the dialogue markup**

In `src/lib/game/DialoguePanel.svelte`, add `glass-panel-strong filigree-frame arcane-window-enter` to the `<dialog>` (keep `jrpg-dialogue-panel`). Set the speaker to `font-display`, the line to `font-body`. Change the action/secondary/choice buttons to carry `glass-button` (keep `jrpg-dialogue-choice`/`jrpg-dialogue-action` only if still referenced by styles you keep; otherwise replace).

```svelte
<dialog
	class="jrpg-dialogue-panel glass-panel-strong filigree-frame arcane-window-enter pointer-events-auto absolute bottom-4 left-4 z-[70] m-0 font-body text-parchment"
	aria-label={dialogue.speaker}
	bind:this={panel}
	open
	tabindex="-1"
	onkeydown={handleKeydown}
>
```

- [ ] **Step 2: Trim the `<style>` block**

Delete the `.jrpg-dialogue-panel` border/background/box-shadow rule (now from `glass-panel-strong`); keep its `width`. Delete the `.jrpg-dialogue-choice`/`.jrpg-dialogue-action` border/background rules now covered by `glass-button`; keep only padding/shape/size specifics not covered. Update the speaker colour to `var(--color-gold)` and any `--jrpg-amber` fallback to `--color-gold`.

- [ ] **Step 3: Autofixer**

Run Svelte MCP `svelte-autofixer` on `src/lib/game/DialoguePanel.svelte` until clean.

- [ ] **Step 4: Verify the dialogue spec**

Run: `bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/DialoguePanel.svelte
git commit -m "Restyle dialogue panel with arcane-glass language"
```

---

### Task 8: Full verification + manual visual pass

**Files:** none (verification only)

- [ ] **Step 1: Full unit suite**

Run: `bun run test:unit -- --run`
Expected: PASS (all projects).

- [ ] **Step 2: Lint + types**

Run: `bun run check && bun run lint`
Expected: PASS.

- [ ] **Step 3: E2E suite**

Run: `bun run test:e2e`
Expected: PASS.

- [ ] **Step 4: Manual visual pass (browser)**

Run: `bun run dev`, then walk through and eyeball:
- Idle HUD: glass panels, filigree corners, Cinzel titles, Spectral body, coin token, minimap halo pulse.
- Drop HP ≤25% → party panel red pulse; restore → pulse stops.
- Open/close each overlay (command, inventory, shop, quest log, area map) → window rise + staggered reveal; tab/slot hover glints.
- Trigger a battle → battle summary victory shimmer + staggered stats; then defeat path.
- Open dialogue → glass panel + glint buttons.
- Toggle OS "reduce motion" → confirm animations are neutralized.

- [ ] **Step 5: Manual Tauri pass (backdrop-blur over canvas)**

Run: `bun run tauri dev`. Confirm `backdrop-blur` panels render correctly over the live Phaser canvas and performance is acceptable (per spec risk). If blur is too costly, reduce blur radius in `.glass-panel`/`.glass-panel-strong` and re-verify.

- [ ] **Step 6: Final commit (only if Step 5 required a tweak)**

```bash
git add src/app.css
git commit -m "Tune glass blur for Tauri canvas performance"
```

---

## Self-Review

**Spec coverage:**
- Material/frame → Tasks 3 (`glass-panel`, `filigree-frame`) + applied in 4/5/7. ✓
- Color tokens → Task 2. ✓
- Typography (Cinzel + Spectral, offline) → Task 1 + token in Task 2 + applied 4/5/7. ✓
- Always-on HUD rethink (menu reposition, coin token, quest scroll, minimap halo, field-status) → Task 4. ✓
- Overlay windows → Task 5. ✓
- Motion (overlay reveal, meters, glint, halo, level-up, coin flash, field status, reduced-motion) → Tasks 3 (keyframes/reduced-motion) + 4/5/6. ✓
- Dialogue panel → Task 7. ✓
- Guardrails (test ids, class hooks, no bridge edits) → enforced per-task + Task 8. ✓
- Testing (check/lint/unit/e2e/autofixer/manual + Tauri blur) → Task 8. ✓

**Placeholder scan:** No "TBD"/"add appropriate X". The one intentionally-flexible spot — reusing the spec's existing `emitHudState` helper in Task 6 — gives an explicit fallback (copy neighbouring test setup verbatim). Hex values are concrete.

**Type consistency:** `lowHp`, `coinFlash`, `levelUpFlash` are `$derived`/`$state`; class names (`arcane-low-hp`, `arcane-coin-flash`, `glass-panel`, `glass-panel-strong`, `filigree-frame`, `arcane-meter`/`-hp`/`-xp`, `glass-button`, `jeweled-cell`/`-emerald`/`-sapphire`/`-amber`/`-action`, `arcane-window-enter`, `arcane-stagger`, `arcane-halo`) are defined in Task 3 and referenced consistently in 4–7.
