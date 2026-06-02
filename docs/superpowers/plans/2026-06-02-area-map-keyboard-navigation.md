# Area Map Keyboard Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `M` keyboard shortcut that toggles the existing enlarged area map, and make its markers keyboard-navigable (Tab-cycle, highlight, show the selected name).

**Architecture:** All changes live in the Svelte layer. The area map's open/close state and pause wiring already live in `GameShell.svelte`; we add a `window` keydown handler for `M`, make each SVG marker focusable so the dialog's existing Tab focus-trap cycles through them, and add a "Selected: {name}" caption. No Phaser, `HudCommand`, or `HudState` changes; the `core/area-map.ts` data layer is untouched.

**Tech Stack:** Svelte 5 (runes mode), TypeScript, Vitest browser-component tests (`vitest-browser-svelte`, real Chromium), project i18n helper (`t()` with `{{token}}` interpolation across `en` / `ja` / `zh-Hant`).

**Spec:** `docs/superpowers/specs/2026-06-01-area-map-keyboard-navigation-design.md`

---

## File Structure

All work touches existing files — no new files.

- `src/lib/game/i18n/messages/en.ts` — add the `ui.areaMapSelectedMarker` source string (also defines the `MessageKey` type).
- `src/lib/game/i18n/messages/ja.ts` — add the Japanese translation (required by the locale-parity test).
- `src/lib/game/i18n/messages/zh-Hant.ts` — add the Traditional Chinese translation (required by the locale-parity test).
- `src/lib/game/GameShell.svelte` — the only behavioral/markup file:
  - new `handleGlobalKeydown` + `isEditableTarget` helpers and an `onMount` window listener (`M` shortcut),
  - `focusedMarkerId` state + `focusedMarkerLabel` derived,
  - focusable marker `<g>` markup, the `getAreaMapFocusableElements` SVG-safe fix, the caption markup, focus reset in `closeAreaMap`/`releaseOverlayPause`, and CSS.
- `src/lib/game/DialoguePanel.svelte.spec.ts` — new tests for the `M` shortcut and marker focus, and an update to the existing area-map focus-trap test (which currently assumes Close is the only focusable element).

**Where things are today (anchors, line numbers approximate and will drift as you edit):**
- Overlay state flags: `commandOpen`, `inventoryOpen`, `shopOpen`, `questLogOpen`, `areaMapOpen` — `GameShell.svelte:56-60`.
- `battleLocked` derived — `GameShell.svelte:78`.
- `openAreaMap` / `closeAreaMap` — `GameShell.svelte:169-182`.
- `releaseOverlayPause` — `GameShell.svelte:196-209`.
- `getAreaMapFocusableElements` — `GameShell.svelte:379-387`.
- Existing `onMount` — `GameShell.svelte:723-752`.
- Marker `{#each}` block — `GameShell.svelte:1387-1397`.
- Legend block — `GameShell.svelte:1409-1412`.
- `.area-map-marker` CSS — `GameShell.svelte:2261-2297`.
- Test fixture `createReadyHudState` (2 markers: "Hero's House" building, then "Investigate the Ruins" quest) — `DialoguePanel.svelte.spec.ts:72`.
- Existing area-map focus-trap test to UPDATE — `DialoguePanel.svelte.spec.ts:376` (`'keeps keyboard focus in the area map and closes it with Escape'`).

**Run a single browser-component test file (one-shot):**
```sh
bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts
```
**Run a single server test file (one-shot):**
```sh
bun run test:unit -- --run src/lib/game/i18n/translate.test.ts
```

---

## Task 1: Add the `ui.areaMapSelectedMarker` i18n string

The caption shows the focused marker's name. `en.ts` is the source of truth for the `MessageKey` type; `translate.test.ts` has a parity test asserting `ja` and `zh-Hant` have **exactly** the same leaf paths as `en`, so the key must be added to all three locales.

**Files:**
- Modify: `src/lib/game/i18n/messages/en.ts` (in the `ui` object, near `currentPosition`)
- Modify: `src/lib/game/i18n/messages/ja.ts` (in the `ui` object, near `currentPosition`)
- Modify: `src/lib/game/i18n/messages/zh-Hant.ts` (in the `ui` object, near `currentPosition`)
- Test: `src/lib/game/i18n/translate.test.ts` (existing parity test + one new assertion)

- [ ] **Step 1: Add a failing assertion to the translate test**

In `src/lib/game/i18n/translate.test.ts`, inside `describe('translation lookup', ...)`, add this test (place it after the existing `'resolves English UI and content messages'` test):

```ts
it('interpolates the selected area-map marker name in every locale', () => {
	expect(t('en', 'ui.areaMapSelectedMarker', { name: "Hero's House" })).toBe(
		"Selected: Hero's House"
	);
	expect(t('ja', 'ui.areaMapSelectedMarker', { name: "Hero's House" })).toContain("Hero's House");
	expect(t('zh-Hant', 'ui.areaMapSelectedMarker', { name: "Hero's House" })).toContain(
		"Hero's House"
	);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```sh
bun run test:unit -- --run src/lib/game/i18n/translate.test.ts
```
Expected: FAIL. The new test fails (English value is the missing-key fallback `[ui.areaMapSelectedMarker]`), AND the existing `'keeps non-English dictionaries aligned with English source keys'` test will fail once you add the key to `en` only — that parity test is your guard for Step 3/4.

- [ ] **Step 3: Add the English source string**

In `src/lib/game/i18n/messages/en.ts`, in the `ui` object, add the key immediately after `currentPosition: 'Current position',`:

```ts
		currentPosition: 'Current position',
		areaMapSelectedMarker: 'Selected: {{name}}',
```

- [ ] **Step 4: Add the Japanese and Traditional Chinese strings**

In `src/lib/game/i18n/messages/ja.ts`, in the `ui` object, after `currentPosition: '現在位置',`:

```ts
		currentPosition: '現在位置',
		areaMapSelectedMarker: '選択中: {{name}}',
```

In `src/lib/game/i18n/messages/zh-Hant.ts`, in the `ui` object, after `currentPosition: '目前位置',`:

```ts
		currentPosition: '目前位置',
		areaMapSelectedMarker: '已選擇：{{name}}',
```

- [ ] **Step 5: Run the test to verify it passes**

Run:
```sh
bun run test:unit -- --run src/lib/game/i18n/translate.test.ts
```
Expected: PASS (both the new interpolation test and the existing parity test).

- [ ] **Step 6: Commit**

```sh
git add src/lib/game/i18n/messages/en.ts src/lib/game/i18n/messages/ja.ts src/lib/game/i18n/messages/zh-Hant.ts src/lib/game/i18n/translate.test.ts
git commit -m "feat(i18n): add areaMapSelectedMarker string for area map caption"
```

---

## Task 2: Add the `M` shortcut to toggle the area map

A `window` keydown listener in `GameShell.svelte` toggles the area map, guarded against text inputs, modifier keys, key auto-repeat, battle, and other open overlays. It reuses the existing `openAreaMap` / `closeAreaMap` (which already manage pause and focus).

**Files:**
- Modify: `src/lib/game/GameShell.svelte` (add helpers + an `onMount` listener)
- Test: `src/lib/game/DialoguePanel.svelte.spec.ts` (new tests)

- [ ] **Step 1: Write the failing tests**

In `src/lib/game/DialoguePanel.svelte.spec.ts`, find the existing test `it('opens the area map from the command menu and closes it', ...)` and add these four tests immediately before it (so all area-map tests sit together):

```ts
	it('toggles the area map with the M key', async () => {
		render(GameShell);
		emitHudState(createReadyHudState());

		await userEvent.keyboard('m');

		const mapDialog = page.getByRole('dialog', { name: 'Sundrop Meadows map' });
		await expect.element(mapDialog).toBeVisible();

		await userEvent.keyboard('m');

		expect(
			document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')
		).toBeNull();
	});

	it('ignores the M shortcut during battle', async () => {
		render(GameShell);
		emitHudState(createReadyHudState({ battle: { phase: 'active', summary: null } }));

		await userEvent.keyboard('m');

		expect(
			document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')
		).toBeNull();
	});

	it('ignores the M shortcut while another overlay is open', async () => {
		render(GameShell);
		emitHudState(createReadyHudState());

		await page.getByRole('button', { name: 'Menu' }).click();
		await userEvent.keyboard('m');

		expect(
			document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')
		).toBeNull();
		await expect.element(page.getByRole('region', { name: 'Command' })).toBeVisible();
	});

	it('ignores the M shortcut when a modifier key is held', async () => {
		render(GameShell);
		emitHudState(createReadyHudState());

		await userEvent.keyboard('{Control>}m{/Control}');

		expect(
			document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')
		).toBeNull();
	});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```sh
bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts
```
Expected: FAIL. `'toggles the area map with the M key'` fails (no listener; the dialog never appears). The three "ignores" tests pass vacuously today (the dialog never opens) but exist to lock in the guards once Step 3 lands.

- [ ] **Step 3: Add the keydown handler and window listener**

In `src/lib/game/GameShell.svelte`, add these two functions immediately after `closeAreaMap` (after `GameShell.svelte:182`):

```ts
	function isEditableTarget(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;
		const tag = target.tagName;
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
	}

	function handleGlobalKeydown(event: KeyboardEvent) {
		if (event.key !== 'm' && event.key !== 'M') return;
		if (event.ctrlKey || event.metaKey || event.altKey) return;
		if (event.repeat) return;
		if (isEditableTarget(event.target)) return;

		if (areaMapOpen) {
			event.preventDefault();
			closeAreaMap();
			return;
		}

		const otherOverlayOpen = commandOpen || inventoryOpen || shopOpen || questLogOpen;
		if (otherOverlayOpen || battleLocked || !$hudState.ready) return;

		event.preventDefault();
		openAreaMap();
	}
```

Then register the listener by adding a second `onMount` directly after the existing `onMount` block closes (after `GameShell.svelte:752`, before the `</script>` tag):

```ts
	onMount(() => {
		window.addEventListener('keydown', handleGlobalKeydown);
		return () => window.removeEventListener('keydown', handleGlobalKeydown);
	});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
```sh
bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts
```
Expected: PASS (all four new tests, plus the existing area-map tests unchanged).

- [ ] **Step 5: Commit**

```sh
git add src/lib/game/GameShell.svelte src/lib/game/DialoguePanel.svelte.spec.ts
git commit -m "feat(area-map): toggle the area map with the M shortcut"
```

---

## Task 3: Make area-map markers keyboard-focusable

Each marker `<g>` becomes `role="button"`, `tabindex="0"`, with an `aria-label`. The dialog's existing Tab focus-trap (`handleAreaMapDialogKeydown` + `getAreaMapFocusableElements`) then cycles Close → markers → wrap. `getAreaMapFocusableElements` currently filters on `element.offsetParent`, which is unreliable for SVG; switch it to an SVG-safe visibility check. A `:focus-visible` style highlights the focused marker.

**Files:**
- Modify: `src/lib/game/GameShell.svelte` (marker markup, focus-trap helper, CSS)
- Test: `src/lib/game/DialoguePanel.svelte.spec.ts` (UPDATE the existing focus-trap test)

- [ ] **Step 1: Update the existing focus-trap test to the new behavior**

In `src/lib/game/DialoguePanel.svelte.spec.ts`, replace the entire existing test `it('keeps keyboard focus in the area map and closes it with Escape', ...)` (`DialoguePanel.svelte.spec.ts:376`) with:

```ts
	it('cycles keyboard focus through the area map markers and closes it with Escape', async () => {
		render(GameShell);
		emitHudState(createReadyHudState());

		await page.getByRole('button', { name: 'Menu' }).click();
		await page.getByRole('button', { name: 'Map' }).click();

		const mapDialog = page.getByRole('dialog', { name: 'Sundrop Meadows map' });
		await expect.element(mapDialog).toBeVisible();

		const closeButton = mapDialog.getByRole('button', { name: 'Close' });
		const heroMarker = mapDialog.getByRole('button', { name: "Hero's House" });
		const ruinsMarker = mapDialog.getByRole('button', { name: 'Investigate the Ruins' });

		await expect.element(closeButton).toHaveFocus();

		// Tab walks Close -> first marker -> second marker -> wraps to Close.
		await userEvent.keyboard('{Tab}');
		await expect.element(heroMarker).toHaveFocus();
		await userEvent.keyboard('{Tab}');
		await expect.element(ruinsMarker).toHaveFocus();
		await userEvent.keyboard('{Tab}');
		await expect.element(closeButton).toHaveFocus();

		// Shift+Tab from Close wraps back to the last marker.
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
		await expect.element(ruinsMarker).toHaveFocus();

		await userEvent.keyboard('{Escape}');

		expect(
			document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')
		).toBeNull();
		await expect.element(page.getByRole('button', { name: 'Menu' })).toHaveFocus();
	});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```sh
bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts
```
Expected: FAIL at `await expect.element(heroMarker).toHaveFocus()` — markers are not focusable yet, so Tab stays on Close.

- [ ] **Step 3: Make the marker `<g>` focusable**

In `src/lib/game/GameShell.svelte`, replace the marker `{#each}` block (`GameShell.svelte:1387-1397`):

```svelte
							{#each $hudState.areaMap.markers as marker (marker.id)}
								<g
									class={`area-map-marker area-map-marker-${marker.kind} ${
										marker.emphasis ? 'area-map-marker-emphasis' : ''
									}`}
									transform={`translate(${marker.x} ${marker.y})`}
								>
									<circle r={marker.emphasis ? 64 : 48} />
									<text x="76" y="18">{marker.label}</text>
								</g>
							{/each}
```

with:

```svelte
							{#each $hudState.areaMap.markers as marker (marker.id)}
								<g
									class={`area-map-marker area-map-marker-${marker.kind} ${
										marker.emphasis ? 'area-map-marker-emphasis' : ''
									}`}
									transform={`translate(${marker.x} ${marker.y})`}
									role="button"
									tabindex="0"
									aria-label={marker.label}
								>
									<circle r={marker.emphasis ? 64 : 48} />
									<text x="76" y="18">{marker.label}</text>
								</g>
							{/each}
```

- [ ] **Step 4: Make the focus-trap helper SVG-safe**

In `src/lib/game/GameShell.svelte`, in `getAreaMapFocusableElements` (`GameShell.svelte:379-387`), replace the `.filter(...)` line:

```ts
		).filter((element) => element.offsetParent !== null && element.tabIndex >= 0);
```

with (SVG elements have no `offsetParent`; `getClientRects()` works for both HTML and SVG):

```ts
		).filter((element) => element.getClientRects().length > 0 && element.tabIndex >= 0);
```

- [ ] **Step 5: Add the focus-highlight CSS**

In `src/lib/game/GameShell.svelte`, immediately after the `.area-map-marker text { ... }` rule (`GameShell.svelte:2265-2272`), add:

```css
	.area-map-marker {
		cursor: pointer;
		outline: none;
	}

	.area-map-marker:focus-visible circle {
		stroke: #fff7df;
		stroke-width: 30;
		filter: drop-shadow(0 0 30px rgba(255, 247, 223, 0.9));
	}

	.area-map-marker:focus-visible text {
		fill: #ffffff;
	}
```

- [ ] **Step 6: Run the test to verify it passes**

Run:
```sh
bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts
```
Expected: PASS (the updated focus-trap test cycles Close → markers → wrap; all other area-map tests still pass).

- [ ] **Step 7: Commit**

```sh
git add src/lib/game/GameShell.svelte src/lib/game/DialoguePanel.svelte.spec.ts
git commit -m "feat(area-map): make map markers keyboard-focusable via the focus trap"
```

---

## Task 4: Show the selected marker name caption

A `focusedMarkerId` state tracks the focused marker (set via `onfocus`/`onblur`), and a derived label feeds a caption rendered near the legend. The caption clears when the map closes.

**Files:**
- Modify: `src/lib/game/GameShell.svelte` (state, derived, marker handlers, caption markup, focus reset, CSS)
- Test: `src/lib/game/DialoguePanel.svelte.spec.ts` (new test)

- [ ] **Step 1: Write the failing test**

In `src/lib/game/DialoguePanel.svelte.spec.ts`, add this test immediately after the `'cycles keyboard focus through the area map markers...'` test from Task 3:

```ts
	it('shows the selected marker name when a map marker is focused', async () => {
		render(GameShell);
		emitHudState(createReadyHudState());

		await page.getByRole('button', { name: 'Menu' }).click();
		await page.getByRole('button', { name: 'Map' }).click();

		const mapDialog = page.getByRole('dialog', { name: 'Sundrop Meadows map' });
		await expect.element(mapDialog).toBeVisible();

		await userEvent.keyboard('{Tab}'); // focuses the first marker (Hero's House)

		await expect
			.element(mapDialog.getByTestId('area-map-selected'))
			.toHaveTextContent("Selected: Hero's House");
	});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```sh
bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts
```
Expected: FAIL — no element with `data-testid="area-map-selected"` exists.

- [ ] **Step 3: Add the focused-marker state and derived label**

In `src/lib/game/GameShell.svelte`, add the state declaration directly after `let areaMapOpen = $state(false);` (`GameShell.svelte:60`):

```ts
	let focusedMarkerId = $state<string | null>(null);
```

Add the derived label after the `battleSummary` derived (`GameShell.svelte:79`):

```ts
	const focusedMarkerLabel = $derived(
		$hudState.areaMap.markers.find((marker) => marker.id === focusedMarkerId)?.label ?? null
	);
```

- [ ] **Step 4: Wire the marker focus/blur handlers**

In `src/lib/game/GameShell.svelte`, in the marker `<g>` (edited in Task 3), add `onfocus`/`onblur` handlers after the `aria-label` attribute:

```svelte
									role="button"
									tabindex="0"
									aria-label={marker.label}
									onfocus={() => (focusedMarkerId = marker.id)}
									onblur={() => {
										if (focusedMarkerId === marker.id) focusedMarkerId = null;
									}}
```

- [ ] **Step 5: Reset the caption when the map closes**

In `closeAreaMap` (`GameShell.svelte:177-182`), add the reset before `resumeForOverlay`:

```ts
	function closeAreaMap() {
		if (!areaMapOpen) return;
		areaMapOpen = false;
		focusedMarkerId = null;
		resumeForOverlay('areaMap');
		void restoreAreaMapFocus();
	}
```

In `releaseOverlayPause` (`GameShell.svelte:196-209`), add the reset alongside the other overlay resets (after `areaMapOpen = false;`):

```ts
		questLogOpen = false;
		areaMapOpen = false;
		focusedMarkerId = null;
		pauseOwner = null;
```

- [ ] **Step 6: Add the caption markup**

In `src/lib/game/GameShell.svelte`, immediately after the legend block (`GameShell.svelte:1409-1412`, the closing `</div>` of `jrpg-area-map-legend`), add:

```svelte
						<p
							class="jrpg-area-map-selected"
							data-testid="area-map-selected"
							aria-live="polite"
						>
							{#if focusedMarkerLabel}
								{t($locale, 'ui.areaMapSelectedMarker', { name: focusedMarkerLabel })}
							{/if}
						</p>
```

- [ ] **Step 7: Add the caption CSS**

In `src/lib/game/GameShell.svelte`, immediately after the `.jrpg-area-map-legend i { ... }` rule (`GameShell.svelte:2324-2330`), add:

```css
	.jrpg-area-map-selected {
		min-height: 1.1rem;
		margin-top: 0.5rem;
		color: #fff7df;
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
```

- [ ] **Step 8: Run the test to verify it passes**

Run:
```sh
bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts
```
Expected: PASS (the caption test, plus all earlier area-map tests).

- [ ] **Step 9: Commit**

```sh
git add src/lib/game/GameShell.svelte src/lib/game/DialoguePanel.svelte.spec.ts
git commit -m "feat(area-map): show selected marker name caption on focus"
```

---

## Task 5: Full verification

Confirm the whole change set type-checks, lints, and passes the full unit suite together (no cross-file regressions).

**Files:** none modified (verification only, unless fixes are needed).

- [ ] **Step 1: Type-check and lint**

Run:
```sh
bun run check
bun run lint
```
Expected: both pass with no errors. If `bun run lint` reports formatting issues, run `bun run format` and re-run `bun run lint`. (Note: the Svelte MCP `svelte-autofixer` may be run over the edited `GameShell.svelte` markup as an extra check.)

- [ ] **Step 2: Run the full unit suite (one-shot)**

Run:
```sh
bun run test:unit -- --run
```
Expected: PASS. Pay attention to `src/lib/game/DialoguePanel.svelte.spec.ts`, `src/lib/game/i18n/translate.test.ts`, and `src/lib/game/core/area-map.test.ts` (the last is unchanged and must still pass).

- [ ] **Step 3: Commit any formatting fixes (only if Step 1 changed files)**

```sh
git add -A
git commit -m "style: apply formatting for area map keyboard navigation"
```

---

## Self-Review Notes (for the implementer)

- **Spec coverage:** Task 2 = `M` shortcut (Decision A); Tasks 3 = Tab-cycle focusable markers + the `getAreaMapFocusableElements` SVG fix (Decision B); Task 4 = "Selected: {name}" caption; Task 1 = the single new i18n key in all three locales. Out-of-scope items (world map, authored descriptions, arrow-key nav, click-to-travel) are intentionally not implemented.
- **No `HudState`/`HudCommand`/Phaser changes:** confirmed — nothing in this plan edits `ui-bridge/events.ts`, `core/area-map.ts`, or `phaser/`.
- **Behavior change to an existing test is intentional:** `DialoguePanel.svelte.spec.ts:376` asserted Tab stayed on Close because Close was the only focusable element. Task 3 Step 1 replaces it; this is expected, not a regression.
- **Naming consistency:** `focusedMarkerId` (state) and `focusedMarkerLabel` (derived) are used identically in Task 4 Steps 3, 4, 5, 6. The i18n key `ui.areaMapSelectedMarker` and param `name` match between Task 1 and Task 4 Step 6.
