# Game Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Gliese's visible HUD, command menu, dialogue panel, inventory, shop, and quest log into the approved traditional JRPG Corner Ledger + Command Box layout.

**Architecture:** Keep the existing Phaser-to-Svelte HUD bridge unchanged. Implement the redesign in Svelte DOM surfaces with shared CSS variables and class primitives inside `GameShell.svelte` and `DialoguePanel.svelte`, with only localized UI key additions for new labels.

**Tech Stack:** Svelte 5 runes mode, TypeScript, Vite, Tailwind CSS import, Vitest browser component tests, Playwright e2e, Bun.

---

## File Structure

- Modify `src/lib/game/i18n/messages/en.ts`: add UI labels used by the command box and field status prompt.
- Modify `src/lib/game/i18n/messages/ja.ts`: add matching Japanese UI labels.
- Modify `src/lib/game/i18n/messages/zh-Hant.ts`: add matching Traditional Chinese UI labels.
- Modify `src/lib/game/i18n/translate.test.ts`: assert the new keys and dictionary alignment.
- Modify `src/lib/game/DialoguePanel.svelte.spec.ts`: add browser-component coverage for the command box, field status prompt, modal frame classes, and dialogue frame class.
- Modify `src/lib/game/GameShell.svelte`: implement JRPG theme variables, corner ledgers, right-side command box, field status prompt, and shared framed-window classes for inventory/shop/quest log.
- Modify `src/lib/game/DialoguePanel.svelte`: restyle the bottom dialogue panel to match the JRPG frame language while preserving interaction behavior.
- Modify `tests/e2e/game.e2e.ts`: update layout assertions and keep menu/inventory/shop/Japanese flows passing.

## Task 1: Add Localized Layout Labels

**Files:**

- Modify: `src/lib/game/i18n/messages/en.ts`
- Modify: `src/lib/game/i18n/messages/ja.ts`
- Modify: `src/lib/game/i18n/messages/zh-Hant.ts`
- Test: `src/lib/game/i18n/translate.test.ts`

- [ ] **Step 1: Write the failing translation test**

In `src/lib/game/i18n/translate.test.ts`, extend the `includes current GameShell UI source strings` test:

```ts
expect(t('en', 'ui.command')).toBe('Command');
expect(t('en', 'ui.fieldStatus')).toBe('Field status');
expect(t('ja', 'ui.command')).toBe('コマンド');
expect(t('zh-Hant', 'ui.command')).toBe('指令');
```

- [ ] **Step 2: Run the focused translation test and verify it fails**

Run: `bun run test:unit -- --run src/lib/game/i18n/translate.test.ts`

Expected: FAIL with missing markers or type errors for `ui.command` and `ui.fieldStatus`.

- [ ] **Step 3: Add English UI keys**

In `src/lib/game/i18n/messages/en.ts`, add these keys inside the `ui` object after `systemMenu`:

```ts
command: 'Command',
fieldStatus: 'Field status',
```

- [ ] **Step 4: Add Japanese UI keys**

In `src/lib/game/i18n/messages/ja.ts`, add matching keys inside the `ui` object after `systemMenu`:

```ts
command: 'コマンド',
fieldStatus: 'フィールド状態',
```

- [ ] **Step 5: Add Traditional Chinese UI keys**

In `src/lib/game/i18n/messages/zh-Hant.ts`, add matching keys inside the `ui` object after `systemMenu`:

```ts
command: '指令',
fieldStatus: '場地狀態',
```

- [ ] **Step 6: Run the focused translation test and verify it passes**

Run: `bun run test:unit -- --run src/lib/game/i18n/translate.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/game/i18n/messages/en.ts src/lib/game/i18n/messages/ja.ts src/lib/game/i18n/messages/zh-Hant.ts src/lib/game/i18n/translate.test.ts
git commit -m "test: add localized JRPG layout labels"
```

## Task 2: Add Browser Tests For Command Box And Field Status

**Files:**

- Modify: `src/lib/game/DialoguePanel.svelte.spec.ts`
- Modify later in Task 3: `src/lib/game/GameShell.svelte`

- [ ] **Step 1: Write failing command/status tests**

In `src/lib/game/DialoguePanel.svelte.spec.ts`, add these tests after `renders a Settings language selector and applies Japanese selection`:

```ts
it('opens a JRPG command box and keeps status in a field prompt', async () => {
	render(GameShell);
	emitHudState(createReadyHudState({ status: 'HP already full' }));

	await page.getByRole('button', { name: 'Menu' }).click();

	const commandBox = page.getByRole('region', { name: 'Command' });
	await expect.element(commandBox).toBeVisible();
	await expect.element(commandBox.getByRole('button', { name: 'Inventory' })).toBeVisible();
	await expect.element(commandBox.getByRole('button', { name: 'Quests' })).toBeVisible();
	await expect.element(commandBox.getByRole('button', { name: 'Save Game' })).toBeVisible();
	await expect
		.element(page.getByRole('status', { name: 'Field status' }))
		.toHaveTextContent('HP already full');

	expect(document.getElementById('game-settings-panel')).toBeNull();
});

it('keeps the command box above the dialogue-safe lower playfield', async () => {
	render(GameShell);
	emitHudState(createReadyHudState({ status: 'Ready' }));

	await page.getByRole('button', { name: 'Menu' }).click();

	const commandBounds = page
		.getByRole('region', { name: 'Command' })
		.element()
		.getBoundingClientRect();

	expect(commandBounds.bottom).toBeLessThan(window.innerHeight * 0.78);
});
```

- [ ] **Step 2: Run the focused component spec and verify it fails**

Run: `bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts`

Expected: FAIL because the command region, field status role, and removed `game-settings-panel` behavior do not exist yet.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/lib/game/DialoguePanel.svelte.spec.ts
git commit -m "test: cover JRPG command HUD layout"
```

## Task 3: Implement Corner Ledgers, Command Box, And Field Status

**Files:**

- Modify: `src/lib/game/GameShell.svelte`
- Test: `src/lib/game/DialoguePanel.svelte.spec.ts`

- [ ] **Step 1: Rename the settings state locally to command state**

In `src/lib/game/GameShell.svelte`, rename the local state and functions so the UI code reflects the new command box:

```ts
let commandOpen = $state(false);

function openCommand() {
	if (commandOpen) return;
	commandOpen = true;
	pauseForOverlay('settings');
}

function closeCommand() {
	if (!commandOpen) return;
	commandOpen = false;
	resumeForOverlay('settings');
}
```

Make these exact replacements throughout `src/lib/game/GameShell.svelte`:

```txt
settingsOpen -> commandOpen
openSettings -> openCommand
closeSettings -> closeCommand
#game-settings-panel -> #game-command-panel
```

After the replacements, keep these behaviors in the renamed code:

```ts
function openCommand() {
	if (commandOpen) return;
	commandOpen = true;
	pauseForOverlay('settings');
}

function closeCommand() {
	if (!commandOpen) return;
	commandOpen = false;
	resumeForOverlay('settings');
}

function releaseOverlayPause() {
	const owner = pauseOwner;
	const wasShopOpen = shopOpen;
	commandOpen = false;
	inventoryOpen = false;
	shopOpen = false;
	questLogOpen = false;
	pauseOwner = null;

	if (wasShopOpen) requestCloseShop();

	if (owner !== null) requestResumeGame();
}
```

Replace the menu button click handler:

```svelte
onclick={() => (settingsOpen ? closeSettings() : openSettings())}
```

with:

```svelte
onclick={() => (commandOpen ? closeCommand() : openCommand())}
```

Keep the `OverlayPauseOwner` value as `'settings'` to avoid a HUD command type change. This is internal naming only.

- [ ] **Step 2: Replace the normal-play HUD markup**

In `src/lib/game/GameShell.svelte`, replace the current menu button, quest tracker, player status, settings backdrop, and settings panel markup with this structure. Keep the surrounding Phaser mount, load error, dialogue, inventory, quest log, and shop blocks in place.

```svelte
<div class="pointer-events-auto absolute top-4 right-4 z-30 sm:top-6 sm:right-6">
	<button
		bind:this={menuButton}
		type="button"
		class="jrpg-command-toggle"
		onclick={() => (commandOpen ? closeCommand() : openCommand())}
		aria-expanded={commandOpen}
		aria-controls="game-command-panel"
	>
		{t($locale, 'ui.menu')}
	</button>
</div>

{#if $hudState.quests.main}
	<section class="jrpg-ledger jrpg-quest-ledger" aria-label={t($locale, 'ui.questTracker')}>
		<p class="jrpg-label">{t($locale, 'ui.mainQuest')}</p>
		<p class="jrpg-ledger-title">{$hudState.quests.main.objective}</p>
		{#if $hudState.quests.side.length > 0}
			<p class="jrpg-ledger-subtitle">
				{t($locale, 'ui.sideActive', { count: $hudState.quests.side.length })}
			</p>
		{/if}
	</section>
{/if}

<section class="jrpg-ledger jrpg-hero-ledger" aria-label={t($locale, 'ui.playerStatus')}>
	<div class="jrpg-level-mark">
		<span>{t($locale, 'ui.levelAbbrev')}</span>
		<strong>{$hudState.level}</strong>
	</div>
	<div class="jrpg-ledger-bars">
		<div class="jrpg-meter-row jrpg-meter-row-hp">
			<div class="jrpg-meter-copy">
				<span>{t($locale, 'ui.hp')}</span>
				<span>{$hudState.hp} / {$hudState.maxHp}</span>
			</div>
			<div class="jrpg-meter"><span style={`width: ${hpPercent}%`}></span></div>
		</div>
		<div class="jrpg-meter-row jrpg-meter-row-xp">
			<div class="jrpg-meter-copy">
				<span>{t($locale, 'ui.xp')}</span>
				<span>{$hudState.xp} / {xpTarget}</span>
			</div>
			<div class="jrpg-meter"><span style={`width: ${xpPercent}%`}></span></div>
		</div>
	</div>
</section>

<div
	class="jrpg-field-status"
	role="status"
	aria-label={t($locale, 'ui.fieldStatus')}
	aria-live="polite"
>
	{$hudState.status}
</div>

{#if commandOpen}
	<div class="absolute inset-0 z-30 bg-black/20 backdrop-blur-[1px]" role="presentation" onclick={closeCommand}></div>
	<aside
		id="game-command-panel"
		class="jrpg-command-box"
		role="region"
		aria-label={t($locale, 'ui.command')}
	>
		<div class="jrpg-command-heading">
			<p class="jrpg-label">{t($locale, 'ui.command')}</p>
			<button type="button" class="jrpg-small-button" onclick={closeCommand}>
				{t($locale, 'ui.close')}
			</button>
		</div>
		<div class="jrpg-command-list">
			<button type="button" class="jrpg-command-action" onclick={openQuestLog} disabled={!$hudState.ready}>
				{t($locale, 'ui.quests')}
			</button>
			<button type="button" class="jrpg-command-action" onclick={openInventory} disabled={!$hudState.ready}>
				{t($locale, 'ui.inventory')}
			</button>
			<button
				type="button"
				class="jrpg-command-action"
				onclick={openShop}
				disabled={!$hudState.ready || !$hudState.nearbyShop}
			>
				{t($locale, 'ui.shop')}
			</button>
			<button
				type="button"
				class="jrpg-command-action"
				onclick={resumeSaveFromMenu}
				disabled={!$hudState.ready || !$hudState.canResume}
			>
				{t($locale, 'ui.resumeSave')}
			</button>
			<button type="button" class="jrpg-command-action" onclick={saveFromMenu} disabled={!$hudState.ready}>
				{t($locale, 'ui.saveGame')}
			</button>
			<button
				type="button"
				class="jrpg-command-action"
				onclick={requestHeal}
				disabled={!$hudState.ready || $hudState.heals < 1}
			>
				{t($locale, 'ui.useHeal')}
			</button>
		</div>
		<label class="jrpg-system-row">
			<span>{t($locale, 'ui.language')}</span>
			<select
				value={$locale}
				onchange={(event) => setActiveLocale(event.currentTarget.value as Locale)}
			>
				{#each supportedLocales as option (option)}
					<option value={option}>{localeLabels[option]}</option>
				{/each}
			</select>
		</label>
	</aside>
{/if}
```

- [ ] **Step 3: Add JRPG theme and HUD CSS**

In the `<style>` block of `src/lib/game/GameShell.svelte`, add these classes after the `:global(.game-stage canvas)` rule:

```css
.game-shell {
	--jrpg-ink: #070916;
	--jrpg-panel: rgba(9, 13, 31, 0.93);
	--jrpg-panel-strong: rgba(8, 11, 27, 0.97);
	--jrpg-frame: rgba(244, 229, 184, 0.24);
	--jrpg-frame-strong: rgba(244, 229, 184, 0.42);
	--jrpg-text: #fff7df;
	--jrpg-muted: rgba(255, 247, 223, 0.68);
	--jrpg-cyan: #9fe7ff;
	--jrpg-emerald: #9ff7cb;
	--jrpg-amber: #ffd37a;
	--jrpg-radius: 0.55rem;
	--jrpg-shadow: 0 18px 48px rgba(0, 0, 0, 0.38);
}

.jrpg-ledger,
.jrpg-command-box,
.jrpg-field-status {
	position: absolute;
	border: 1px solid var(--jrpg-frame);
	background: linear-gradient(145deg, var(--jrpg-panel), rgba(12, 18, 42, 0.88));
	color: var(--jrpg-text);
	box-shadow:
		var(--jrpg-shadow),
		inset 0 1px 0 rgba(255, 255, 255, 0.08);
	backdrop-filter: blur(14px);
}

.jrpg-label {
	margin: 0;
	font-size: 0.62rem;
	font-weight: 900;
	letter-spacing: 0.18em;
	color: var(--jrpg-cyan);
	text-transform: uppercase;
}

.jrpg-hero-ledger {
	top: 1rem;
	left: 1rem;
	z-index: 20;
	display: grid;
	width: min(22rem, calc(50vw - 1.5rem));
	grid-template-columns: auto minmax(0, 1fr);
	gap: 0.8rem;
	border-radius: var(--jrpg-radius);
	padding: 0.7rem;
	pointer-events: none;
}

.jrpg-quest-ledger {
	top: 1rem;
	right: 1rem;
	z-index: 20;
	width: min(23rem, calc(50vw - 1.5rem));
	border-radius: var(--jrpg-radius);
	padding: 0.7rem 0.85rem;
	pointer-events: none;
}

.jrpg-level-mark {
	display: grid;
	min-width: 3.2rem;
	place-items: center;
	border: 1px solid rgba(244, 229, 184, 0.18);
	border-radius: 0.45rem;
	background: rgba(255, 255, 255, 0.07);
}

.jrpg-level-mark span {
	font-size: 0.58rem;
	font-weight: 900;
	letter-spacing: 0.16em;
	color: var(--jrpg-muted);
}

.jrpg-level-mark strong {
	font-size: 1.25rem;
	line-height: 1;
}

.jrpg-ledger-title {
	margin: 0.2rem 0 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 0.9rem;
	font-weight: 900;
	color: var(--jrpg-text);
}

.jrpg-ledger-subtitle {
	margin: 0.2rem 0 0;
	font-size: 0.78rem;
	font-weight: 800;
	color: var(--jrpg-emerald);
}

.jrpg-meter-row {
	display: grid;
	gap: 0.28rem;
}

.jrpg-ledger-bars {
	display: grid;
	gap: 0.55rem;
}

.jrpg-meter-copy {
	display: flex;
	justify-content: space-between;
	gap: 0.5rem;
	font-size: 0.68rem;
	font-weight: 900;
	letter-spacing: 0.12em;
	color: var(--jrpg-muted);
}

.jrpg-meter {
	height: 0.48rem;
	overflow: hidden;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.12);
}

.jrpg-meter span {
	display: block;
	height: 100%;
	border-radius: inherit;
	transition: width 180ms ease;
}

.jrpg-meter-row-hp .jrpg-meter span {
	background: linear-gradient(90deg, #f05268, #ffd36e);
}

.jrpg-meter-row-xp .jrpg-meter span {
	background: linear-gradient(90deg, #5ed8ff, #8fa8ff);
}

.jrpg-command-toggle {
	border: 1px solid var(--jrpg-frame);
	border-radius: var(--jrpg-radius);
	background: var(--jrpg-panel-strong);
	padding: 0.7rem 0.9rem;
	color: var(--jrpg-text);
	font-size: 0.72rem;
	font-weight: 900;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	box-shadow: var(--jrpg-shadow);
	transition:
		transform 160ms ease,
		border-color 160ms ease;
}

.jrpg-command-toggle:hover,
.jrpg-command-toggle:focus-visible {
	border-color: var(--jrpg-frame-strong);
	transform: translateY(-1px);
	outline: none;
}

.jrpg-command-box {
	top: 5.2rem;
	right: 1rem;
	z-index: 40;
	width: min(19rem, calc(100vw - 2rem));
	max-height: calc(100vh - 13rem);
	overflow-y: auto;
	border-radius: var(--jrpg-radius);
	padding: 0.85rem;
}

.jrpg-command-heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
}

.jrpg-command-list {
	display: grid;
	gap: 0.45rem;
	margin-top: 0.75rem;
}

.jrpg-command-action,
.jrpg-small-button {
	border: 1px solid rgba(244, 229, 184, 0.18);
	background: rgba(255, 255, 255, 0.07);
	color: var(--jrpg-text);
	font-weight: 900;
	transition:
		transform 160ms ease,
		border-color 160ms ease,
		background 160ms ease;
}

.jrpg-command-action {
	border-radius: 0.42rem;
	padding: 0.68rem 0.75rem;
	text-align: left;
	font-size: 0.82rem;
	letter-spacing: 0.12em;
	text-transform: uppercase;
}

.jrpg-small-button {
	border-radius: 999px;
	padding: 0.42rem 0.65rem;
	font-size: 0.62rem;
	letter-spacing: 0.12em;
	text-transform: uppercase;
}

.jrpg-command-action:hover:not(:disabled),
.jrpg-command-action:focus-visible,
.jrpg-small-button:hover,
.jrpg-small-button:focus-visible {
	border-color: var(--jrpg-frame-strong);
	background: rgba(244, 229, 184, 0.12);
	transform: translateX(2px);
	outline: none;
}

.jrpg-command-action:disabled {
	cursor: not-allowed;
	opacity: 0.45;
}

.jrpg-system-row {
	display: grid;
	gap: 0.45rem;
	margin-top: 0.85rem;
	border-top: 1px solid rgba(244, 229, 184, 0.14);
	padding-top: 0.85rem;
	color: var(--jrpg-muted);
	font-size: 0.68rem;
	font-weight: 900;
	letter-spacing: 0.12em;
	text-transform: uppercase;
}

.jrpg-system-row select {
	border: 1px solid rgba(244, 229, 184, 0.18);
	border-radius: 0.42rem;
	background: rgba(0, 0, 0, 0.28);
	padding: 0.55rem 0.65rem;
	color: var(--jrpg-text);
	font-size: 0.86rem;
	font-weight: 800;
	letter-spacing: 0;
	text-transform: none;
}

.jrpg-field-status {
	right: 1rem;
	bottom: 23%;
	z-index: 20;
	max-width: min(24rem, calc(100vw - 2rem));
	border-radius: 999px;
	padding: 0.52rem 0.75rem;
	font-size: 0.8rem;
	font-weight: 900;
	color: var(--jrpg-cyan);
	pointer-events: none;
}

@media (max-width: 720px) {
	.jrpg-hero-ledger,
	.jrpg-quest-ledger {
		left: 0.75rem;
		right: 0.75rem;
		width: auto;
	}

	.jrpg-quest-ledger {
		top: 5.4rem;
	}

	.jrpg-command-toggle {
		padding: 0.6rem 0.72rem;
	}

	.jrpg-command-box {
		top: auto;
		right: 0.75rem;
		bottom: 25%;
		width: min(16rem, calc(100vw - 1.5rem));
		max-height: 42vh;
	}

	.jrpg-field-status {
		right: 0.75rem;
		bottom: 20%;
		left: 0.75rem;
		max-width: none;
	}
}
```

- [ ] **Step 4: Run the focused component spec and verify Task 2 tests pass**

Run: `bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts`

Expected: PASS.

- [ ] **Step 5: Run Svelte check**

Run: `bun run check`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/GameShell.svelte
git commit -m "feat: add JRPG command HUD layout"
```

## Task 4: Add Browser Tests For Shared Framed Windows

**Files:**

- Modify: `src/lib/game/DialoguePanel.svelte.spec.ts`
- Modify later in Task 5: `src/lib/game/GameShell.svelte`

- [ ] **Step 1: Add failing framed-window tests**

In `src/lib/game/DialoguePanel.svelte.spec.ts`, add this test after `renders inventory equipment badges with localized slot labels`:

```ts
it('uses the shared JRPG window frame for inventory and quest log overlays', async () => {
	render(GameShell);
	emitHudState(
		createReadyHudState({
			quests: {
				main: {
					questId: 'investigate-the-ruins',
					title: 'Investigate the Ruins',
					objective: 'Talk to the Guild Master.',
					progress: { label: 'Guild Master spoken to', current: 0, target: 1 },
					rewardSummary: '8 XP / 20 coins'
				},
				side: [],
				completed: [],
				guildOffer: null
			}
		})
	);

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Inventory' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' }).element();
	expect(inventoryDialog.classList.contains('jrpg-window')).toBe(true);
	expect(inventoryDialog.querySelector('.jrpg-window-header')).not.toBeNull();
	expect(inventoryDialog.querySelector('.jrpg-side-rail')).not.toBeNull();

	await page.getByRole('button', { name: 'Close' }).click();
	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Quests' }).click();

	const questDialog = page.getByRole('dialog', { name: 'Quest Log' }).element();
	expect(questDialog.classList.contains('jrpg-window')).toBe(true);
	expect(questDialog.querySelector('.jrpg-window-header')).not.toBeNull();
});
```

- [ ] **Step 2: Run the focused component spec and verify it fails**

Run: `bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts`

Expected: FAIL because the shared window classes are not applied yet.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/lib/game/DialoguePanel.svelte.spec.ts
git commit -m "test: cover shared JRPG window frames"
```

## Task 5: Restyle Inventory, Shop, Quest Log, Tooltips, And Responsive Grids

**Files:**

- Modify: `src/lib/game/GameShell.svelte`
- Test: `src/lib/game/DialoguePanel.svelte.spec.ts`
- Test: `tests/e2e/game.e2e.ts`

- [ ] **Step 1: Add shared window CSS**

In the `<style>` block of `src/lib/game/GameShell.svelte`, add these classes after the command HUD CSS:

```css
.jrpg-modal-backdrop {
	position: absolute;
	inset: 0;
	z-index: 50;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.52);
	padding: 1rem;
	backdrop-filter: blur(3px);
}

.jrpg-window {
	position: relative;
	z-index: 10;
	display: grid;
	max-height: calc(100vh - 2rem);
	width: min(76rem, calc(100vw - 2rem));
	grid-template-rows: auto minmax(0, 1fr);
	overflow: hidden;
	border: 1px solid var(--jrpg-frame);
	border-radius: var(--jrpg-radius);
	background: linear-gradient(145deg, var(--jrpg-panel-strong), rgba(17, 21, 42, 0.96));
	color: var(--jrpg-text);
	box-shadow:
		0 34px 100px rgba(0, 0, 0, 0.58),
		inset 0 1px 0 rgba(255, 255, 255, 0.08);
	backdrop-filter: blur(16px);
}

.jrpg-window-narrow {
	width: min(64rem, calc(100vw - 2rem));
}

.jrpg-window-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1rem;
	border-bottom: 1px solid rgba(244, 229, 184, 0.14);
	padding: 1rem;
}

.jrpg-window-title {
	margin: 0.2rem 0 0;
	font-size: clamp(1.25rem, 3vw, 1.9rem);
	font-weight: 900;
	color: var(--jrpg-text);
	letter-spacing: 0.08em;
	text-transform: uppercase;
}

.jrpg-tab-list {
	display: grid;
	gap: 0.45rem;
	margin-top: 0.85rem;
}

.jrpg-tab-list-three {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

.jrpg-tab-list-two {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.jrpg-tab {
	border: 1px solid rgba(244, 229, 184, 0.16);
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.06);
	padding: 0.58rem 0.7rem;
	color: var(--jrpg-muted);
	font-size: 0.68rem;
	font-weight: 900;
	letter-spacing: 0.12em;
	text-transform: uppercase;
}

.jrpg-tab-active {
	border-color: var(--jrpg-frame-strong);
	background: rgba(244, 229, 184, 0.13);
	color: var(--jrpg-text);
}

.jrpg-window-body {
	min-height: 0;
	overflow-y: auto;
	padding: 1rem;
}

.jrpg-inventory-layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 14rem;
	gap: 1rem;
	overflow: hidden;
}

.jrpg-grid-frame,
.jrpg-side-rail,
.jrpg-quest-section {
	border: 1px solid rgba(244, 229, 184, 0.14);
	border-radius: var(--jrpg-radius);
	background: rgba(255, 255, 255, 0.055);
}

.jrpg-grid-frame {
	min-height: 0;
	overflow: hidden;
}

.jrpg-grid-scroll {
	height: 100%;
	min-height: 21rem;
	overflow-y: auto;
	padding: 0.85rem;
}

.jrpg-slot-grid {
	display: grid;
	grid-template-columns: repeat(6, minmax(0, 1fr));
	gap: 0.65rem;
}

.jrpg-side-rail {
	display: grid;
	gap: 0.75rem;
	align-content: start;
	padding: 0.85rem;
}

.jrpg-side-stat,
.jrpg-equipped-row,
.jrpg-quest-card {
	border: 1px solid rgba(244, 229, 184, 0.12);
	border-radius: 0.45rem;
	background: rgba(0, 0, 0, 0.16);
	padding: 0.65rem;
}

.jrpg-tooltip {
	position: absolute;
	right: 1rem;
	bottom: 1rem;
	z-index: 20;
	max-width: 18rem;
	border: 1px solid var(--jrpg-frame);
	border-radius: var(--jrpg-radius);
	background: var(--jrpg-panel-strong);
	padding: 0.75rem;
	color: var(--jrpg-text);
	box-shadow: var(--jrpg-shadow);
	pointer-events: none;
}

.jrpg-empty-state {
	display: flex;
	min-height: 12rem;
	align-items: center;
	justify-content: center;
	border: 1px dashed rgba(244, 229, 184, 0.2);
	border-radius: var(--jrpg-radius);
	background: rgba(255, 255, 255, 0.04);
	padding: 2rem;
	text-align: center;
	color: var(--jrpg-muted);
	font-size: 0.82rem;
	font-weight: 900;
	letter-spacing: 0.12em;
	text-transform: uppercase;
}

@media (max-width: 900px) {
	.jrpg-inventory-layout {
		grid-template-columns: 1fr;
		overflow-y: auto;
	}

	.jrpg-side-rail {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 640px) {
	.jrpg-modal-backdrop {
		align-items: stretch;
		padding: 0.5rem;
	}

	.jrpg-window {
		max-height: calc(100vh - 1rem);
		width: calc(100vw - 1rem);
	}

	.jrpg-window-header {
		padding: 0.85rem;
	}

	.jrpg-window-body {
		padding: 0.75rem;
	}

	.jrpg-slot-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.5rem;
	}

	.jrpg-side-rail {
		grid-template-columns: 1fr;
	}
}
```

- [ ] **Step 2: Apply the shared window shell to Inventory**

In the inventory overlay, replace the outer backdrop and dialog classes with:

```svelte
<div class="jrpg-modal-backdrop" role="presentation">
	<div class="absolute inset-0 cursor-default" role="presentation" onclick={closeInventory}></div>
	<div
		bind:this={inventoryDialog}
		class="jrpg-window"
		aria-labelledby="inventory-heading"
		aria-modal="true"
		role="dialog"
		tabindex="-1"
		onkeydown={handleInventoryDialogKeydown}
	>
```

Replace the inventory header wrapper with:

```svelte
<div class="jrpg-window-header">
	<div>
		<p class="jrpg-label">{t($locale, 'ui.fieldPack')}</p>
		<h2 id="inventory-heading" class="jrpg-window-title">{t($locale, 'ui.inventory')}</h2>
	</div>
	<button
		bind:this={inventoryCloseButton}
		type="button"
		class="jrpg-small-button"
		onclick={closeInventory}
	>
		{t($locale, 'ui.close')}
	</button>
</div>
```

Change the inventory tab wrapper to:

```svelte
<div class="jrpg-tab-list jrpg-tab-list-three" role="tablist" aria-label={t($locale, 'ui.inventorySections')}>
```

For each inventory tab button, use this class expression:

```svelte
class={`jrpg-tab ${activeInventoryTab === 'consumables' ? 'jrpg-tab-active' : ''}`}
```

Use the same pattern for `equipment` and `keyItems`.

Replace the inventory body layout with:

```svelte
<div class="jrpg-window-body jrpg-inventory-layout">
	<div class="jrpg-grid-frame">
		<div id="inventory-tab-panel" class="jrpg-grid-scroll" role="tabpanel" aria-labelledby={`inventory-${activeInventoryTab}-tab`}>
			<div
				data-testid="inventory-slot-grid"
				class="jrpg-slot-grid"
				aria-label={t($locale, 'ui.inventorySlotsLabel', {
					section: getInventoryTabLabel(activeInventoryTab)
				})}
			>
```

Keep the existing inventory slot rendering, badge logic, double-click handlers, and tooltip state.

Change the inventory stats/equipment `<aside>` class to:

```svelte
<aside class="jrpg-side-rail">
```

Change the inventory tooltip class to:

```svelte
class="jrpg-tooltip"
```

- [ ] **Step 3: Apply the shared window shell to Quest Log**

In the quest log overlay, replace the backdrop and dialog shell with:

```svelte
<div class="jrpg-modal-backdrop" role="presentation">
	<div class="absolute inset-0 cursor-default" role="presentation" onclick={closeQuestLog}></div>
	<div
		bind:this={questLogDialog}
		class="jrpg-window jrpg-window-narrow"
		aria-labelledby="quest-log-heading"
		aria-modal="true"
		role="dialog"
		tabindex="-1"
	>
```

Replace the header with:

```svelte
<div class="jrpg-window-header">
	<div>
		<p class="jrpg-label">{t($locale, 'ui.fieldJournal')}</p>
		<h2 id="quest-log-heading" class="jrpg-window-title">{t($locale, 'ui.questLog')}</h2>
	</div>
	<button
		bind:this={questLogCloseButton}
		type="button"
		class="jrpg-small-button"
		onclick={closeQuestLog}
	>
		{t($locale, 'ui.close')}
	</button>
</div>
```

Set the quest log body class to:

```svelte
<div class="jrpg-window-body">
```

Change each Main/Side section root to include `jrpg-quest-section`, and each quest article to include `jrpg-quest-card`.

- [ ] **Step 4: Apply the shared window shell to Shop**

In the shop overlay, replace the backdrop and dialog shell with:

```svelte
<div class="jrpg-modal-backdrop" role="presentation">
	<div class="absolute inset-0 cursor-default" role="presentation" onclick={closeShop}></div>
	<div
		bind:this={shopDialog}
		class="jrpg-window jrpg-window-narrow"
		aria-labelledby="shop-heading"
		aria-modal="true"
		role="dialog"
		tabindex="-1"
		onkeydown={handleShopDialogKeydown}
	>
```

Replace the shop header with:

```svelte
<div class="jrpg-window-header">
	<div>
		<p class="jrpg-label">
			{$hudState.shop?.merchantName ??
				$hudState.nearbyShop?.merchantName ??
				t($locale, 'ui.merchant')}
		</p>
		<h2 id="shop-heading" class="jrpg-window-title">
			{$hudState.shop?.name ?? $hudState.nearbyShop?.name ?? t($locale, 'ui.shop')}
		</h2>
		<p class="mt-2 text-sm font-black tracking-[0.08em] text-[var(--jrpg-amber)]">
			{t($locale, 'ui.coins', { coins: $hudState.wallet.coins })}
		</p>
	</div>
	<button bind:this={shopCloseButton} type="button" class="jrpg-small-button" onclick={closeShop}>
		{t($locale, 'ui.close')}
	</button>
</div>
```

Change the shop tab wrapper to:

```svelte
<div class="jrpg-tab-list jrpg-tab-list-two" role="tablist" aria-label={t($locale, 'ui.shopSections')}>
```

Use `jrpg-tab` and `jrpg-tab-active` for Buy/Sell tab buttons.

Set the shop body panel class to:

```svelte
class="jrpg-window-body"
```

Change buy and sell grids to:

```svelte
class="jrpg-slot-grid"
```

Keep `data-testid="shop-buy-grid"` and `data-testid="shop-sell-grid"` unchanged.

Change shop tooltip classes to:

```svelte
class="jrpg-tooltip"
```

Change shop empty states to use `jrpg-empty-state`.

- [ ] **Step 5: Run the focused component spec**

Run: `bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts`

Expected: PASS.

- [ ] **Step 6: Run Svelte check**

Run: `bun run check`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/game/GameShell.svelte
git commit -m "feat: restyle JRPG menu windows"
```

## Task 6: Restyle Dialogue Panel With JRPG Frame

**Files:**

- Modify: `src/lib/game/DialoguePanel.svelte.spec.ts`
- Modify: `src/lib/game/DialoguePanel.svelte`

- [ ] **Step 1: Add failing dialogue frame test**

In `src/lib/game/DialoguePanel.svelte.spec.ts`, add this test inside `describe('DialoguePanel.svelte', ...)` after `stretches across the full viewport width`:

```ts
it('uses the JRPG dialogue frame class', async () => {
	renderDialogue();

	const panel = page.getByRole('dialog', { name: 'Guild Master Arlen' }).element();

	expect(panel.classList.contains('jrpg-dialogue-panel')).toBe(true);
});
```

- [ ] **Step 2: Run the focused component spec and verify it fails**

Run: `bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts`

Expected: FAIL because `jrpg-dialogue-panel` is not applied yet.

- [ ] **Step 3: Replace the DialoguePanel classes**

In `src/lib/game/DialoguePanel.svelte`, change the `<dialog>` class to:

```svelte
class="jrpg-dialogue-panel pointer-events-auto absolute inset-x-0 bottom-0 z-[70] m-0 w-screen
max-w-none text-slate-50"
```

Change the speaker label class to:

```svelte
class="jrpg-dialogue-speaker"
```

Change the dialogue line class to:

```svelte
class="jrpg-dialogue-line"
```

Change choice button classes to:

```svelte
class="jrpg-dialogue-choice"
```

Change the Next button class to:

```svelte
class="jrpg-dialogue-action"
```

Change the Close button class to:

```svelte
class="jrpg-dialogue-action jrpg-dialogue-action-secondary"
```

- [ ] **Step 4: Add DialoguePanel CSS**

Add this `<style>` block at the end of `src/lib/game/DialoguePanel.svelte`:

```svelte
<style>
	.jrpg-dialogue-panel {
		border: 1px solid rgba(244, 229, 184, 0.28);
		border-right: 0;
		border-bottom: 0;
		border-left: 0;
		border-radius: 0.8rem 0.8rem 0 0;
		background: linear-gradient(145deg, rgba(8, 11, 27, 0.98), rgba(15, 20, 40, 0.96));
		padding: 1rem;
		color: #fff7df;
		box-shadow:
			0 -24px 70px rgba(0, 0, 0, 0.48),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(14px);
	}

	.jrpg-dialogue-speaker {
		margin: 0;
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.18em;
		color: #9fe7ff;
		text-transform: uppercase;
	}

	.jrpg-dialogue-line {
		min-height: 3rem;
		margin: 0;
		color: #fff7df;
		font-size: clamp(1rem, 2vw, 1.12rem);
		line-height: 1.65;
	}

	.jrpg-dialogue-choice,
	.jrpg-dialogue-action {
		border: 1px solid rgba(244, 229, 184, 0.2);
		background: rgba(255, 255, 255, 0.07);
		color: #fff7df;
		font-weight: 900;
		transition:
			border-color 160ms ease,
			background 160ms ease,
			transform 160ms ease;
	}

	.jrpg-dialogue-choice {
		border-radius: 0.5rem;
		padding: 0.65rem 0.75rem;
		text-align: left;
		font-size: 0.84rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.jrpg-dialogue-action {
		border-radius: 999px;
		padding: 0.55rem 0.9rem;
		font-size: 0.7rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.jrpg-dialogue-action-secondary {
		color: rgba(255, 247, 223, 0.78);
	}

	.jrpg-dialogue-choice:hover,
	.jrpg-dialogue-choice:focus-visible,
	.jrpg-dialogue-action:hover,
	.jrpg-dialogue-action:focus-visible {
		border-color: rgba(244, 229, 184, 0.42);
		background: rgba(244, 229, 184, 0.12);
		transform: translateY(-1px);
		outline: none;
	}
</style>
```

- [ ] **Step 5: Run the focused component spec**

Run: `bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts`

Expected: PASS.

- [ ] **Step 6: Run Svelte check**

Run: `bun run check`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/game/DialoguePanel.svelte src/lib/game/DialoguePanel.svelte.spec.ts
git commit -m "feat: restyle JRPG dialogue frame"
```

## Task 7: Update E2E Layout Coverage

**Files:**

- Modify: `tests/e2e/game.e2e.ts`

- [ ] **Step 1: Update boot layout assertions**

In `tests/e2e/game.e2e.ts`, update `game route boots` to assert the command box layout after opening Menu:

```ts
test('game route boots', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	const viewport = page.viewportSize();
	const statusPanel = page.getByRole('region', { name: 'Player status' });
	const questTracker = page.getByRole('region', { name: 'Quest tracker' });
	await expect(statusPanel).toBeVisible();
	await expect(questTracker).toBeVisible();

	const statusBox = await statusPanel.boundingBox();
	const questBox = await questTracker.boundingBox();
	expect(statusBox?.x).toBeLessThan(40);
	expect(statusBox?.y).toBeLessThan(40);
	expect(questBox?.y).toBeLessThan(40);
	expect((questBox?.x ?? 0) + (questBox?.width ?? 0)).toBeGreaterThan((viewport?.width ?? 0) - 40);

	await page.getByRole('button', { name: 'Menu' }).click();
	const commandBox = page.getByRole('region', { name: 'Command' });
	await expect(commandBox).toBeVisible();
	const commandBounds = await commandBox.boundingBox();
	expect((commandBounds?.y ?? 0) + (commandBounds?.height ?? 0)).toBeLessThan(
		(viewport?.height ?? 0) * 0.78
	);
});
```

- [ ] **Step 2: Update menu-driven tests to use the command box**

Where tests click Menu and then a command, scope the second click to the command region:

```ts
await page.getByRole('button', { name: 'Menu' }).click();
await page
	.getByRole('region', { name: 'Command' })
	.getByRole('button', { name: 'Inventory' })
	.click();
```

Apply this pattern to Inventory, Quests, Shop, Resume Save, and Save Game command clicks in `tests/e2e/game.e2e.ts`.

- [ ] **Step 3: Update Japanese language flow**

In `language preference shows Japanese chrome and keeps Japanese selected`, after selecting Japanese and reopening Menu, use:

```ts
await page.getByRole('button', { name: 'メニュー' }).click();
await page
	.getByRole('region', { name: 'コマンド' })
	.getByRole('button', { name: '持ち物' })
	.click();
```

After closing inventory, reopen the command region and assert:

```ts
await page.getByRole('button', { name: 'メニュー' }).click();
await expect(page.getByLabel('言語')).toHaveValue('ja');
```

- [ ] **Step 4: Run focused e2e tests**

Run: `bun run build`

Expected: PASS.

Run: `bun run test:e2e -- --grep "game route boots|inventory overlay opens from the menu|language preference shows Japanese chrome|shop overlay opens near a merchant"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/game.e2e.ts
git commit -m "test: update JRPG layout e2e flows"
```

## Task 8: Full Verification And Visual Review

**Files:**

- No planned source edits.

- [ ] **Step 1: Run Svelte check**

Run: `bun run check`

Expected: PASS.

- [ ] **Step 2: Run full tests**

Run: `bun run test`

Expected: PASS.

- [ ] **Step 3: Start the dev server**

Run: `bun run dev -- --host 127.0.0.1 --port 5173`

Expected: Vite reports a local URL on `http://127.0.0.1:5173/`.

- [ ] **Step 4: Open the app in the browser and inspect the layout**

Use the browser on `http://127.0.0.1:5173/`.

Check:

- hero ledger is top-left and not covering the player center,
- quest ledger is top-right,
- command box opens on the right and stays above the dialogue safe zone,
- field status appears near the right edge above dialogue,
- dialogue remains full-width at the bottom,
- inventory, shop, and quest log use the same framed-window style,
- inventory and shop grids remain 6 columns on desktop,
- Japanese language flow still uses localized command and inventory labels.

- [ ] **Step 5: Stop the dev server**

Stop the `bun run dev` session after visual review is complete.

- [ ] **Step 6: Final status**

Run: `git status --short --branch`

Expected: branch contains only the planned commits and no uncommitted source changes.
