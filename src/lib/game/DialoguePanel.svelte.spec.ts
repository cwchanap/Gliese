import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../app.css';
import DialoguePanel from '$lib/game/DialoguePanel.svelte';
import GameShell from '$lib/game/GameShell.svelte';
import { en } from '$lib/game/i18n/messages/en';
import { getActiveLocale, setActiveLocale, updatePreferences } from '$lib/game/i18n/store';
import { emitHudState, type HudDialogueState, type HudState } from '$lib/game/ui-bridge/events';

vi.mock('$lib/game/i18n/store', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/game/i18n/store')>();

	return {
		...actual,
		setActiveLocale: vi.fn((locale: 'en' | 'zh-Hant' | 'ja') => actual.setActiveLocale(locale))
	};
});

vi.mock('$lib/game/phaser/createGame', () => ({
	createGame: vi.fn(async () => ({ destroy: vi.fn() }))
}));

const dialogue: HudDialogueState = {
	id: 'npc:guild-master',
	npcId: 'guild-master',
	speaker: 'Guild Master Arlen',
	line: 'Choose the Guild work you want to review.',
	lineIndex: 0,
	lineCount: 1,
	mode: 'choice',
	canClose: true,
	choices: [
		{ id: 'quest:thin-village-slimes', label: 'Thin Village Slimes', kind: 'ask' },
		{ id: 'close', label: 'Close', kind: 'leave' }
	]
};

const conversationDialogue: HudDialogueState = {
	...dialogue,
	line: 'The Guild has work for a steady blade.',
	mode: 'conversation',
	choices: []
};

function renderDialogue(overrides: Partial<HudDialogueState> = {}) {
	const onadvance = vi.fn();
	const onclose = vi.fn();
	const onchoose = vi.fn();
	render(DialoguePanel, {
		props: {
			dialogue: { ...dialogue, ...overrides },
			onadvance,
			onclose,
			onchoose
		}
	});

	return { onadvance, onclose, onchoose };
}

const originalCloseLabel = en.ui.close;
const originalNextLabel = en.ui.next;
const originalTextSpeed = 'normal' as const;
const mockedSetActiveLocale = vi.mocked(setActiveLocale);
const mutableUiMessages = en.ui as { close: string; next: string };

function setDialogueLabels(close: string, next: string) {
	mutableUiMessages.close = close;
	mutableUiMessages.next = next;
}

function createReadyHudState(overrides: Partial<HudState> = {}): HudState {
	return {
		ready: true,
		mapId: 'meadow-entry',
		areaMap: {
			mapId: 'meadow-entry',
			name: 'Sundrop Meadows',
			worldWidth: 6_400,
			worldHeight: 6_400,
			cellSize: 128,
			revealedCells: ['12,43', '16,45'],
			player: { x: 1_536, y: 5_600 },
			markers: [
				{
					id: 'hero-house-exterior',
					kind: 'building',
					x: 531,
					y: 5_850,
					label: "Hero's House"
				},
				{
					id: 'investigate-the-ruins:talk-to-guild-master:meadow-entry',
					kind: 'quest',
					x: 2_048,
					y: 5_869,
					label: 'Investigate the Ruins',
					emphasis: true
				}
			]
		},
		hp: 18,
		maxHp: 18,
		level: 1,
		xp: 0,
		attack: 4,
		defense: 1,
		heals: 1,
		status: 'Ready',
		wallet: { coins: 30 },
		nearbyShop: null,
		shop: null,
		dialogue: null,
		battle: {
			phase: 'none',
			summary: null,
			active: null
		},
		quests: {
			main: null,
			side: [],
			completed: [],
			guildOffer: null
		},
		inventory: {
			consumables: [],
			equipment: [],
			keyItems: [],
			equipped: {
				weapon: null,
				head: null,
				body: null,
				hands: null,
				accessory: null
			}
		},
		...overrides
	};
}

describe('DialoguePanel.svelte', () => {
	beforeEach(() => {
		setDialogueLabels(originalCloseLabel, originalNextLabel);
		setActiveLocale('en');
		// Interaction tests want the full line and enabled choices immediately.
		updatePreferences({ textSpeed: 'instant' });
		mockedSetActiveLocale.mockClear();
	});

	afterEach(() => {
		setDialogueLabels(originalCloseLabel, originalNextLabel);
		setActiveLocale('en');
		updatePreferences({ textSpeed: originalTextSpeed });
		mockedSetActiveLocale.mockClear();
	});

	it('renders speaker text and choices', async () => {
		renderDialogue();

		await expect.element(page.getByRole('dialog', { name: 'Guild Master Arlen' })).toBeVisible();
		await expect.element(page.getByText('Choose the Guild work you want to review.')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Thin Village Slimes' })).toBeVisible();
	});

	it('emits choose and close callbacks', async () => {
		const { onchoose, onclose } = renderDialogue();

		await page.getByRole('button', { name: 'Thin Village Slimes' }).click();
		// Bar prompt order: the close choice renders in the choices column (first),
		// the B-glyph Close action on the bar (last).
		await page.getByRole('button', { name: 'Close' }).last().click();

		expect(onchoose).toHaveBeenCalledWith('quest:thin-village-slimes');
		expect(onclose).toHaveBeenCalledOnce();
	});

	it('focuses the panel on render and advances conversation dialogue with Enter', async () => {
		const { onadvance, onclose, onchoose } = renderDialogue(conversationDialogue);
		const panel = page.getByRole('dialog', { name: 'Guild Master Arlen' });

		await expect.element(panel).toHaveFocus();
		await userEvent.keyboard('{Enter}');

		expect(onadvance).toHaveBeenCalledOnce();
		expect(onclose).not.toHaveBeenCalled();
		expect(onchoose).not.toHaveBeenCalled();
	});

	it('closes with Escape when the panel has focus', async () => {
		const { onclose } = renderDialogue();

		await expect.element(page.getByRole('dialog', { name: 'Guild Master Arlen' })).toHaveFocus();
		await userEvent.keyboard('{Escape}');

		expect(onclose).toHaveBeenCalledOnce();
	});

	it('closes with Escape even when focus has left the panel', async () => {
		const { onclose } = renderDialogue();
		const event = new KeyboardEvent('keydown', {
			key: 'Escape',
			bubbles: true,
			cancelable: true
		});

		window.dispatchEvent(event);

		expect(onclose).toHaveBeenCalledOnce();
		expect(event.defaultPrevented).toBe(true);
	});

	it('keeps the dialogue composition anchored to the lower plaza like the mockup', async () => {
		// Earlier focus/click steps can leave the window scrolled; the dialog is
		// absolutely positioned in the document, so measurements need origin.
		window.scrollTo(0, 0);
		renderDialogue({ npcId: 'shopkeeper-mira', speaker: 'Mira' });

		const dialogPanel = page.getByRole('dialog', { name: 'Mira' }).element();
		const bust = dialogPanel.querySelector('.jrpg-dialogue-bust');
		const bar = dialogPanel.querySelector('.jrpg-dialogue-bar');
		expect(bust).not.toBeNull();
		expect(bar).not.toBeNull();

		const panelBounds = dialogPanel.getBoundingClientRect();
		const bustBounds = bust!.getBoundingClientRect();
		const barBounds = bar!.getBoundingClientRect();

		expect(panelBounds.bottom).toBeGreaterThan(window.innerHeight - 48);
		// Mockup insets: 44px side gutters, bust card flush-left of the bar.
		expect(bustBounds.left).toBeGreaterThanOrEqual(36);
		expect(bustBounds.right).toBeLessThan(barBounds.left);
		expect(barBounds.right).toBeGreaterThan(window.innerWidth - 56);
		// Name plate overlaps the bar's top edge like the mockup pill.
		const plate = dialogPanel.querySelector('.jrpg-dialogue-speaker');
		expect(plate).not.toBeNull();
		const plateBounds = plate!.getBoundingClientRect();
		expect(plateBounds.top).toBeLessThan(barBounds.top);
		expect(plateBounds.bottom).toBeGreaterThan(barBounds.top);
	});

	it('renders the neutral bust for the session npc id', async () => {
		renderDialogue({ npcId: 'shopkeeper-mira', speaker: 'Mira' });

		const bustImage = page.getByRole('img', { name: 'Mira, dialogue portrait' });
		await expect.element(bustImage).toBeVisible();
		expect(bustImage.element().getAttribute('src')).toBe('/game/assets/heroic-ui/busts/mira.png');
	});

	it('renders no bust for NPCs outside the neutral bust map', async () => {
		renderDialogue({ npcId: 'villager-lynn' });

		// Unsupported NPCs render no bust rather than guessing from the speaker string.
		expect(
			page
				.getByRole('dialog', { name: 'Guild Master Arlen' })
				.element()
				.querySelector('.jrpg-dialogue-bust')
		).toBeNull();
	});

	it('renders the gilded choice column above the bar like the mockup', async () => {
		// Mockup canvas: the composition claims are exact at 1440x900.
		page.viewport(1440, 900);
		await vi.waitFor(() => {
			expect(window.innerWidth).toBe(1440);
		});
		try {
			window.scrollTo(0, 0);
			renderDialogue();

			const dialogPanel = page.getByRole('dialog', { name: 'Guild Master Arlen' }).element();
			const bar = dialogPanel.querySelector('.jrpg-dialogue-bar');
			const choices = dialogPanel.querySelector('.jrpg-dialogue-choices');
			const firstRow = dialogPanel.querySelector('.jrpg-dialogue-choice');
			expect(choices).not.toBeNull();
			expect(firstRow).not.toBeNull();

			const panelBounds = dialogPanel.getBoundingClientRect();
			const barBounds = bar!.getBoundingClientRect();
			const choicesBounds = choices!.getBoundingClientRect();
			const rowBounds = firstRow!.getBoundingClientRect();

			// Mockup: column bottom sits 270px above the viewport floor with the
			// panel floor at 40px -> 230px above the panel floor; rows bleed off
			// the right viewport edge past the panel's 44px gutter (the column
			// carries the decorative bleed); rows are 23rem (368px) wide.
			expect(panelBounds.bottom - choicesBounds.bottom).toBeCloseTo(230, -1);
			expect(choicesBounds.right).toBeGreaterThan(panelBounds.right);
			expect(choicesBounds.right).toBeGreaterThan(window.innerWidth);
			expect(choicesBounds.bottom).toBeLessThan(barBounds.top);
			// Decorative column carries the full 23rem (368px) visual row
			// (sub-percent rendering drift tolerated).
			expect(choicesBounds.width).toBeLessThanOrEqual(368.5);
			expect(choicesBounds.width).toBeGreaterThan(356);
			// The button hitbox stops flush inside the viewport so the row stays
			// clickable under the shell's overflow: clip.
			expect(rowBounds.right).toBeLessThanOrEqual(window.innerWidth);
			expect(rowBounds.left).toBeGreaterThanOrEqual(0);
			// Hitbox = 23rem minus the 0.75rem offscreen bleed (drift tolerated).
			expect(rowBounds.width).toBeLessThanOrEqual(356.5);
			expect(rowBounds.width).toBeGreaterThan(344);
		} finally {
			page.viewport(414, 730);
		}
	});

	it('keeps every choice row inside a 640×360 viewport with three choices', async () => {
		// Quest-detail accept flows render three rows; the short-viewport
		// fallback must keep them all on-screen — the shell's overflow: clip
		// makes any off-viewport rect unreachable (Playwright click hangs).
		await page.viewport(640, 360);
		try {
			window.scrollTo(0, 0);
			renderDialogue({
				choices: [
					{ id: 'quest:accept', label: 'Accept the Commission', kind: 'trade' },
					{ id: 'quest:ask', label: 'Ask About the Ruins', kind: 'ask' },
					{ id: 'close', label: 'Leave', kind: 'leave' }
				]
			});

			const rows = [
				...page
					.getByRole('dialog', { name: 'Guild Master Arlen' })
					.element()
					.querySelectorAll('.jrpg-dialogue-choice')
			];
			expect(rows).toHaveLength(3);
			for (const [index, row] of rows.entries()) {
				const rect = row.getBoundingClientRect();
				expect(rect.height, `row ${index}`).toBeGreaterThan(0);
				expect(rect.top, `row ${index}`).toBeGreaterThanOrEqual(0);
				expect(rect.bottom, `row ${index}`).toBeLessThanOrEqual(360);
				expect(rect.left, `row ${index}`).toBeGreaterThanOrEqual(0);
				expect(rect.right, `row ${index}`).toBeLessThanOrEqual(640);
			}
		} finally {
			page.viewport(414, 730);
		}
	});

	it('renders per-kind leading icons like the mockup glyph list', async () => {
		renderDialogue({
			choices: [
				{ id: 'shop', label: 'Trade', kind: 'trade' },
				{ id: 'ask', label: 'Ask about the road', kind: 'ask' },
				{ id: 'close', label: 'Leave', kind: 'leave' },
				{ id: 'mystery', label: 'Mystery' }
			]
		});

		const rows = [
			...page
				.getByRole('dialog', { name: 'Guild Master Arlen' })
				.element()
				.querySelectorAll('.jrpg-dialogue-choice')
		];
		expect(rows.map((row) => row.getAttribute('data-kind'))).toEqual([
			'trade',
			'ask',
			'leave',
			'ask'
		]);
		for (const row of rows) {
			expect(row.querySelector('svg')).not.toBeNull();
		}
	});

	it('applies the gilded selected treatment to the first choice row', async () => {
		renderDialogue();
		const rows = [
			...page
				.getByRole('dialog', { name: 'Guild Master Arlen' })
				.element()
				.querySelectorAll('.jrpg-dialogue-choice')
		];

		// Mockup: the first row renders pre-selected (cream-gold, dark text).
		expect(rows[0]?.getAttribute('data-selected')).toBe('true');
		expect(rows[1]?.getAttribute('data-selected')).toBe('false');
		const style = getComputedStyle(rows[0]!);
		expect(style.backgroundImage).toContain('rgb(255, 246, 220)');
		expect(style.color).toBe('rgb(90, 61, 8)');
	});

	it('activates the gilded selection — not hardcoded row 0 — on panel Enter', async () => {
		const { onchoose } = renderDialogue();
		const panel = page.getByRole('dialog', { name: 'Guild Master Arlen' });
		await expect.element(panel).toHaveFocus();

		// Hovering row 2 moves the gild; focus stays on the panel.
		const secondChoice = page.getByRole('button', { name: 'Close' }).first();
		await userEvent.hover(secondChoice);
		expect(secondChoice.element().getAttribute('data-selected')).toBe('true');

		await userEvent.keyboard('{Enter}');
		expect(onchoose).toHaveBeenCalledOnce();
		expect(onchoose).toHaveBeenCalledWith('close');
		expect(onchoose).not.toHaveBeenCalledWith('quest:thin-village-slimes');
	});

	it('resets the gilded selection to the first row in a new choice session', async () => {
		const onadvance = vi.fn();
		const onclose = vi.fn();
		const onchoose = vi.fn();
		const { rerender } = render(DialoguePanel, {
			props: { dialogue: { ...dialogue }, onadvance, onclose, onchoose }
		});

		// Choosing a non-first row leaves the cursor on it within the session...
		await userEvent.hover(page.getByRole('button', { name: 'Close' }).first());
		expect(
			page
				.getByRole('dialog', { name: 'Guild Master Arlen' })
				.element()
				.querySelectorAll('.jrpg-dialogue-choice')[1]
				?.getAttribute('data-selected')
		).toBe('true');

		// ...but the next choice step (new dialogue id, still choice mode)
		// gilds the first row again like the mockup.
		await rerender({ dialogue: { ...dialogue, id: 'npc:guild-master:quest-detail' } });

		const rows = page
			.getByRole('dialog', { name: 'Guild Master Arlen' })
			.element()
			.querySelectorAll('.jrpg-dialogue-choice');
		expect(rows[0]?.getAttribute('data-selected')).toBe('true');
		expect(rows[1]?.getAttribute('data-selected')).toBe('false');
	});

	it('uses the JRPG dialogue frame class', async () => {
		renderDialogue();

		const panel = page.getByRole('dialog', { name: 'Guild Master Arlen' }).element();

		expect(panel.classList.contains('jrpg-dialogue-panel')).toBe(true);
	});

	it.each([
		['Enter', '{Enter}'],
		['Space', '{Space}']
	])(
		'selects the focused second choice with %s without leaking keydown to the window',
		async (_label, key) => {
			const { onchoose } = renderDialogue();
			const onWindowKeydown = vi.fn();
			const secondChoice = page.getByRole('button', { name: 'Close' }).first();

			window.addEventListener('keydown', onWindowKeydown);
			try {
				secondChoice.element().focus();
				await expect.element(secondChoice).toHaveFocus();
				await userEvent.keyboard(key);

				expect(onchoose).toHaveBeenCalledOnce();
				expect(onchoose).toHaveBeenCalledWith('close');
				expect(onchoose).not.toHaveBeenCalledWith('quest:thin-village-slimes');
				expect(onWindowKeydown).not.toHaveBeenCalled();
			} finally {
				window.removeEventListener('keydown', onWindowKeydown);
			}
		}
	);

	it('exposes the close choice by visible accessible name and emits its choice id', async () => {
		const { onchoose, onclose } = renderDialogue();
		const closeChoices = page.getByRole('button', { name: 'Close' });

		expect(closeChoices.elements()).toHaveLength(2);
		await closeChoices.first().click();

		expect(onchoose).toHaveBeenCalledOnce();
		expect(onchoose).toHaveBeenCalledWith('close');
		expect(onclose).not.toHaveBeenCalled();
	});

	it('renders Close and Next from the active locale messages', async () => {
		setDialogueLabels('Dismiss', 'Advance');
		renderDialogue(conversationDialogue);

		await expect.element(page.getByRole('button', { name: 'Dismiss' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Advance' })).toBeVisible();
	});

	it('renders the full line immediately at instant speed and advances on the first confirm', async () => {
		const { onadvance } = renderDialogue(conversationDialogue);
		const panel = page.getByRole('dialog', { name: 'Guild Master Arlen' });

		await expect.element(panel).toHaveFocus();
		expect(panel.element().querySelector('.jrpg-dialogue-line')?.textContent).toBe(
			conversationDialogue.line
		);

		await userEvent.keyboard('{Enter}');
		expect(onadvance).toHaveBeenCalledOnce();
	});

	it('reveals the line progressively and completes it on the first confirm at slow speed', async () => {
		updatePreferences({ textSpeed: 'slow' });
		const { onadvance } = renderDialogue(conversationDialogue);
		const panel = page.getByRole('dialog', { name: 'Guild Master Arlen' });
		const line = panel.element().querySelector('.jrpg-dialogue-line')!;

		await expect.element(panel).toHaveFocus();
		// Mid-typewriter: partial render, first confirm completes without advancing.
		expect(line.textContent!.length).toBeLessThan(conversationDialogue.line.length);

		await userEvent.keyboard('{Enter}');
		expect(line.textContent).toBe(conversationDialogue.line);
		expect(onadvance).not.toHaveBeenCalled();

		await userEvent.keyboard('{Enter}');
		expect(onadvance).toHaveBeenCalledOnce();
	});

	it('keeps choices inert until the line fully reveals', async () => {
		updatePreferences({ textSpeed: 'slow' });
		const { onchoose } = renderDialogue();
		const panel = page.getByRole('dialog', { name: 'Guild Master Arlen' });
		const firstChoice = page.getByRole('button', { name: 'Thin Village Slimes' });

		await expect.element(panel).toHaveFocus();
		expect(firstChoice.element()).toBeDisabled();

		// Enter at panel level is also inert mid-reveal...
		await userEvent.keyboard('{Enter}');
		expect(onchoose).not.toHaveBeenCalled();

		// ...and the choice unlocks only once the full line has rendered.
		await vi.waitFor(
			() => {
				expect(firstChoice.element()).toBeEnabled();
			},
			{ timeout: 4_000 }
		);

		await firstChoice.click();
		expect(onchoose).toHaveBeenCalledWith('quest:thin-village-slimes');
	});

	it('renders Japanese labels when the active locale is Japanese', async () => {
		setActiveLocale('ja');
		mockedSetActiveLocale.mockClear();
		renderDialogue(conversationDialogue);

		await expect.element(page.getByRole('button', { name: '閉じる' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: '次へ' })).toBeVisible();
	});

	it('applies a Japanese selection from the System screen language segments', async () => {
		render(GameShell);

		// Phaser mounts only after committing to a run from the Title screen.
		await page.getByRole('button', { name: /New Run/i }).click();
		await page.getByRole('button', { name: 'Menu' }).click();
		await page.getByRole('button', { name: 'System' }).click();

		const languageGroup = page.getByRole('group', { name: 'Language' });
		await expect.element(languageGroup).toBeVisible();

		await languageGroup.getByRole('button', { name: '日本語' }).click();

		expect(getActiveLocale()).toBe('ja');
	});

	it('opens a JRPG command box and keeps status in a field prompt', async () => {
		render(GameShell);
		emitHudState(createReadyHudState({ status: 'HP already full' }));

		await page.getByRole('button', { name: 'Menu' }).click();

		const commandBox = page.getByRole('region', { name: 'Command' });
		await expect.element(commandBox).toBeVisible();
		await expect.element(commandBox.getByRole('button', { name: 'Bag' })).toBeVisible();
		await expect
			.element(commandBox.getByRole('button', { name: 'Quest', exact: true }))
			.toBeVisible();
		await expect
			.element(commandBox.getByRole('button', { name: 'Save', exact: true }))
			.toBeVisible();
		// The mockup's grid-open composition has no status pill: it is gated on
		// commandOpen and comes back once the grid closes.
		expect(page.getByRole('status', { name: 'Field status' }).elements()).toHaveLength(0);

		await page.getByRole('button', { name: 'Menu' }).click();
		expect(page.getByRole('region', { name: 'Command' }).elements()).toHaveLength(0);
		await expect
			.element(page.getByRole('status', { name: 'Field status' }))
			.toHaveTextContent('HP already full');

		expect(document.getElementById('game-settings-panel')).toBeNull();
	});

	it('renders the Sundrop Meadows HUD clusters around the playfield', async () => {
		render(GameShell);
		emitHudState(
			createReadyHudState({
				quests: {
					main: {
						questId: 'investigate-the-ruins',
						title: 'Investigate the Ruins',
						type: 'main',
						status: 'active',
						description: 'Report to the Guild Master, then defeat the ruins warden.',
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

		await expect.element(page.getByTestId('hud-minimap')).toHaveTextContent('Sundrop Meadows');
		await expect.element(page.getByTestId('hud-party-panel')).toHaveTextContent('Liam');
		await expect.element(page.getByTestId('hud-side-panel')).toHaveTextContent('30G');
		await expect
			.element(page.getByTestId('hud-side-panel'))
			.toHaveTextContent('Investigate the Ruins');
	});

	it('toggles the area map with the M key', async () => {
		render(GameShell);
		emitHudState(createReadyHudState());

		await userEvent.keyboard('m');

		const mapDialog = page.getByRole('dialog', { name: 'Sundrop Meadows map' });
		await expect.element(mapDialog).toBeVisible();

		await userEvent.keyboard('m');

		expect(document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')).toBeNull();
	});

	it('ignores the M shortcut during battle', async () => {
		render(GameShell);
		emitHudState(createReadyHudState({ battle: { phase: 'active', summary: null, active: null } }));

		await userEvent.keyboard('m');

		expect(document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')).toBeNull();
	});

	it('ignores the M shortcut while another overlay is open', async () => {
		render(GameShell);
		emitHudState(createReadyHudState());

		await page.getByRole('button', { name: 'Menu' }).click();
		await userEvent.keyboard('m');

		expect(document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')).toBeNull();
		await expect.element(page.getByRole('region', { name: 'Command' })).toBeVisible();
	});

	it('ignores the M shortcut when a modifier key is held', async () => {
		render(GameShell);
		emitHudState(createReadyHudState());

		await userEvent.keyboard('{Control>}m{/Control}');
		expect(document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')).toBeNull();

		await userEvent.keyboard('{Alt>}m{/Alt}');
		expect(document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')).toBeNull();

		await userEvent.keyboard('{Meta>}m{/Meta}');
		expect(document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')).toBeNull();

		await userEvent.keyboard('{Shift>}m{/Shift}');
		expect(document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')).toBeNull();
	});

	it('ignores repeated M keydown events', async () => {
		render(GameShell);
		emitHudState(createReadyHudState());

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true, repeat: true }));

		expect(document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')).toBeNull();
	});

	it('ignores the M shortcut when an editable element is focused', async () => {
		render(GameShell);
		emitHudState(createReadyHudState());

		const input = document.createElement('input');
		input.type = 'text';
		document.body.appendChild(input);
		input.focus();

		window.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true })
		);

		expect(document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')).toBeNull();

		input.remove();
	});

	it('opens the area map from the command menu and closes it', async () => {
		render(GameShell);
		emitHudState(createReadyHudState());

		await page.getByRole('button', { name: 'Menu' }).click();
		await page.getByRole('button', { name: 'Map' }).click();

		const mapDialog = page.getByRole('dialog', { name: 'Sundrop Meadows map' });
		await expect.element(mapDialog).toBeVisible();
		await expect.element(mapDialog.getByText("Hero's House")).toBeVisible();
		await expect.element(mapDialog.getByText('Investigate the Ruins')).toBeVisible();

		// Markers should have role="img" for assistive technology semantics.
		const heroMarker = mapDialog.getByRole('img', { name: "Hero's House" });
		await expect.element(heroMarker).toBeInTheDocument();

		expect(mapDialog.element().querySelector('[data-testid="area-map-svg"]')).not.toBeNull();
		expect(mapDialog.element().querySelector('[data-testid="area-map-player"]')).not.toBeNull();

		await mapDialog.getByRole('button', { name: 'Close' }).click();

		expect(document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')).toBeNull();
		await expect.element(page.getByRole('button', { name: 'Menu' })).toHaveFocus();
	});

	it('cycles keyboard focus through the area map markers and closes it with Escape', async () => {
		render(GameShell);
		emitHudState(createReadyHudState());

		await page.getByRole('button', { name: 'Menu' }).click();
		await page.getByRole('button', { name: 'Map' }).click();

		const mapDialog = page.getByRole('dialog', { name: 'Sundrop Meadows map' });
		await expect.element(mapDialog).toBeVisible();

		const closeButton = mapDialog.getByRole('button', { name: 'Close' });
		const heroMarker = mapDialog.getByLabelText("Hero's House");
		const ruinsMarker = mapDialog.getByLabelText('Investigate the Ruins');

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

		expect(document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')).toBeNull();
		await expect.element(page.getByRole('button', { name: 'Menu' })).toHaveFocus();
	});

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

	it('clears the selected marker caption after closing and reopening with M', async () => {
		render(GameShell);
		emitHudState(createReadyHudState());

		await userEvent.keyboard('m');

		const mapDialog = page.getByRole('dialog', { name: 'Sundrop Meadows map' });
		await expect.element(mapDialog).toBeVisible();

		await userEvent.keyboard('{Tab}'); // focuses the first marker (Hero's House)
		await expect
			.element(mapDialog.getByTestId('area-map-selected'))
			.toHaveTextContent("Selected: Hero's House");

		await userEvent.keyboard('m'); // close
		expect(document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')).toBeNull();

		await userEvent.keyboard('m'); // reopen

		const reopened = page.getByRole('dialog', { name: 'Sundrop Meadows map' });
		await expect.element(reopened).toBeVisible();
		expect(reopened.getByTestId('area-map-selected').element().textContent?.trim()).toBe('');
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

	it('keeps every command tile inside a wide short viewport (1000×360)', async () => {
		render(GameShell);
		emitHudState(createReadyHudState());

		// The Tauri window is resizable; widths above the old ≤720px gate are
		// equally valid at the 640×360 floor, so the short-height fallback must
		// be width-independent — the shell's overflow: clip makes any
		// off-viewport tile unreachable (Playwright click hangs).
		await page.viewport(1000, 360);
		try {
			await page.getByRole('button', { name: 'Menu' }).click();

			const grid = page.getByRole('region', { name: 'Command' }).element();
			const gridRect = grid.getBoundingClientRect();
			expect(gridRect.top).toBeGreaterThanOrEqual(0);
			expect(gridRect.bottom).toBeLessThanOrEqual(360);
			expect(gridRect.right).toBeLessThanOrEqual(1000);

			const tiles = [...grid.querySelectorAll<HTMLElement>('[data-focus-id^="field-cmd-"]')];
			expect(tiles).toHaveLength(8);
			for (const tile of tiles) {
				const rect = tile.getBoundingClientRect();
				expect(rect.height, tile.dataset.focusId).toBeGreaterThan(0);
				expect(rect.top, tile.dataset.focusId).toBeGreaterThanOrEqual(0);
				expect(rect.bottom, tile.dataset.focusId).toBeLessThanOrEqual(360);
				expect(rect.right, tile.dataset.focusId).toBeLessThanOrEqual(1000);
			}
		} finally {
			page.viewport(414, 730);
		}
	});

	it('renders inventory equipment badges with localized slot labels', async () => {
		render(GameShell);
		emitHudState(
			createReadyHudState({
				inventory: {
					consumables: [],
					equipment: [
						{
							itemId: 'training-sword',
							name: 'Training Sword',
							description: 'A reliable starter blade.',
							iconPath: '/game/assets/items/training-sword.png',
							slot: 'weapon',
							equipped: false,
							modifiers: { attack: 1 }
						}
					],
					keyItems: [],
					equipped: {
						weapon: null,
						head: null,
						body: null,
						hands: null,
						accessory: null
					}
				}
			})
		);

		await page.getByRole('button', { name: 'Menu' }).click();
		const inventoryButton = page.getByRole('button', { name: 'Bag' });
		await expect.element(inventoryButton).toBeEnabled();
		await inventoryButton.click();
		await page.getByRole('tab', { name: 'Gear' }).click();

		const equipmentTile = document.querySelector<HTMLElement>('[aria-label="Training Sword"]');
		expect(equipmentTile).not.toBeNull();
		const badgeLabels = Array.from(equipmentTile!.querySelectorAll('span'), (badge) =>
			badge.textContent?.trim()
		);

		expect(badgeLabels).toContain('Weapon');
		expect(badgeLabels).not.toContain('weapon');
	});

	it('uses the shared JRPG window frame for inventory and quest log overlays', async () => {
		render(GameShell);
		emitHudState(
			createReadyHudState({
				quests: {
					main: {
						questId: 'investigate-the-ruins',
						title: 'Investigate the Ruins',
						type: 'main',
						status: 'active',
						description: 'Report to the Guild Master, then defeat the ruins warden.',
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
		await page.getByRole('button', { name: 'Bag' }).click();

		// The bag migrated to the full-bleed Heroic surface with its category rail.
		const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' }).element();
		expect(inventoryDialog.classList.contains('bag-screen')).toBe(true);
		expect(inventoryDialog.querySelector('.bag-rail')).not.toBeNull();
		expect(inventoryDialog.querySelector('[data-testid="inventory-worn"]')).not.toBeNull();

		await page.getByRole('button', { name: 'Close' }).click();
		await page.getByRole('button', { name: 'Menu' }).click();
		await page.getByRole('button', { name: 'Quest', exact: true }).click();

		const questDialog = page.getByRole('dialog', { name: 'Quest Log' }).element();
		// The quest journal migrated to the full-bleed Heroic surface with its
		// roster rail and detail panel.
		expect(questDialog.classList.contains('quest-screen')).toBe(true);
		expect(questDialog.querySelector('.quest-rail')).not.toBeNull();
		expect(questDialog.querySelector('[data-testid="quest-detail"]')).not.toBeNull();
	});
});
