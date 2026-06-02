import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../app.css';
import DialoguePanel from '$lib/game/DialoguePanel.svelte';
import GameShell from '$lib/game/GameShell.svelte';
import { en } from '$lib/game/i18n/messages/en';
import { getActiveLocale, setActiveLocale } from '$lib/game/i18n/store';
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
	speaker: 'Guild Master Arlen',
	line: 'Choose the Guild work you want to review.',
	lineIndex: 0,
	lineCount: 1,
	mode: 'choice',
	canClose: true,
	choices: [
		{ id: 'quest:thin-village-slimes', label: 'Thin Village Slimes' },
		{ id: 'close', label: 'Close' }
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
		canResume: false,
		status: 'Ready',
		wallet: { coins: 30 },
		nearbyShop: null,
		shop: null,
		dialogue: null,
		battle: {
			phase: 'none',
			summary: null
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
		mockedSetActiveLocale.mockClear();
	});

	afterEach(() => {
		setDialogueLabels(originalCloseLabel, originalNextLabel);
		setActiveLocale('en');
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
		await page.getByRole('button', { name: 'Close' }).first().click();

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

	it('keeps dialogue in a lower plaza message box instead of full-width chrome', async () => {
		renderDialogue();

		const bounds = page
			.getByRole('dialog', { name: 'Guild Master Arlen' })
			.element()
			.getBoundingClientRect();

		expect(bounds.bottom).toBeGreaterThan(window.innerHeight - 24);
		expect(bounds.width).toBeLessThan(window.innerWidth * 0.75);
		expect(bounds.left).toBeGreaterThanOrEqual(12);
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
			const secondChoice = page.getByRole('button', { name: 'Close' }).last();

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
		const { onchoose } = renderDialogue();
		const closeChoices = page.getByRole('button', { name: 'Close' });

		expect(closeChoices.elements()).toHaveLength(2);
		await closeChoices.last().click();

		expect(onchoose).toHaveBeenCalledOnce();
		expect(onchoose).toHaveBeenCalledWith('close');
	});

	it('renders Close and Next from the active locale messages', async () => {
		setDialogueLabels('Dismiss', 'Advance');
		renderDialogue(conversationDialogue);

		await expect.element(page.getByRole('button', { name: 'Dismiss' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Advance' })).toBeVisible();
	});

	it('renders Japanese labels when the active locale is Japanese', async () => {
		setActiveLocale('ja');
		mockedSetActiveLocale.mockClear();
		renderDialogue(conversationDialogue);

		await expect.element(page.getByRole('button', { name: '閉じる' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: '次へ' })).toBeVisible();
	});

	it('renders a Settings language selector and applies Japanese selection', async () => {
		render(GameShell);

		await page.getByRole('button', { name: 'Menu' }).click();

		const languageSelector = page.getByLabelText('Language');
		await expect.element(languageSelector).toBeVisible();

		const selectElement = languageSelector.element() as HTMLSelectElement;
		expect([...selectElement.options].map((option) => [option.value, option.label])).toEqual([
			['en', 'English'],
			['zh-Hant', 'Traditional Chinese'],
			['ja', 'Japanese']
		]);

		selectElement.value = 'ja';
		selectElement.dispatchEvent(new Event('change', { bubbles: true }));

		expect(mockedSetActiveLocale).toHaveBeenCalledWith('ja');
		expect(getActiveLocale()).toBe('ja');
	});

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

		await expect
			.element(page.getByTestId('hud-location-panel'))
			.toHaveTextContent('Sundrop Meadows');
		await expect.element(page.getByTestId('hud-minimap')).toHaveTextContent('Area Map');
		await expect.element(page.getByTestId('hud-party-panel')).toHaveTextContent('LIAM');
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
		emitHudState(createReadyHudState({ battle: { phase: 'active', summary: null } }));

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

		expect(document.querySelector('[role="dialog"][aria-label="Sundrop Meadows map"]')).toBeNull();
		await expect.element(page.getByRole('button', { name: 'Menu' })).toHaveFocus();
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
		const inventoryButton = page.getByRole('button', { name: 'Inventory' });
		await expect.element(inventoryButton).toBeEnabled();
		await inventoryButton.click();
		await page.getByRole('tab', { name: 'Equipment' }).click();

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
});
