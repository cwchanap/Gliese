import { page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../app.css';
import GameShell from './GameShell.svelte';
import {
	HUD_COMMAND_EVENT,
	HUD_STATE_EVENT,
	emitPrologueEnd,
	type HudState
} from '$lib/game/ui-bridge/events';
import { createNewSaveState } from '$lib/game/save/save-state';
import {
	SAVE_SLOTS_BACKUP_STORAGE_KEY,
	SAVE_SLOTS_STORAGE_KEY,
	loadSaveSlots,
	saveSlotsUnreadable,
	writeSaveSlot,
	type SaveSlotRecord
} from '$lib/game/save/slots';
import { setSaveStorage } from '$lib/game/save/storage';
import { setLastInputModality } from '$lib/game/core/gamepad';
import { PREFERENCES_STORAGE_KEY } from '$lib/game/i18n/preferences';
import { updatePreferences } from '$lib/game/i18n/store';
import { t } from '$lib/game/i18n/translate';
import type { ConsumableDefinition, EquipmentDefinition } from '$lib/game/content/items';
import { AREA_MAP_MARKER_FONT_PX, getAreaName } from '$lib/game/core/area-map';
import { heroCardZone } from '$lib/game/core/hud-occlusion';
import { anchorPoint } from '$lib/game/content/maps/overworld/world';
import { buildHudQuestState, type HudQuestEntry } from '$lib/game/core/quests';
import { questStateAt } from '$lib/game/core/quests.fixtures';
import { get } from 'svelte/store';
import { hudState } from '$lib/game/ui-bridge/store';
import { createGame } from '$lib/game/phaser/createGame';
import type { HudShopBuyEntry, HudShopSellEntry } from '$lib/game/core/shop';

vi.mock('$lib/game/phaser/createGame', () => ({
	createGame: vi.fn(async () => ({ destroy: vi.fn() }))
}));

afterEach(async () => {
	emitHudState(baseHudState({ ready: false }));
	localStorage.removeItem(SAVE_SLOTS_STORAGE_KEY);
	localStorage.removeItem(PREFERENCES_STORAGE_KEY);
	// Tests that wire a failing adapter must not leak it into later specs.
	setSaveStorage(globalThis.localStorage);
	updatePreferences({
		locale: 'en',
		motion: 'on',
		textSpeed: 'normal',
		promptMode: 'auto',
		sound: 'on'
	});
	setLastInputModality('keys');
	vi.unstubAllGlobals();
	await page.viewport(1280, 720);
});

function emitHudState(state: HudState) {
	window.dispatchEvent(new CustomEvent(HUD_STATE_EVENT, { detail: state }));
}

function baseHudState(overrides: Partial<HudState> = {}): HudState {
	return {
		ready: true,
		mapId: 'overworld',
		areaMap: {
			mapId: 'overworld',
			name: 'Sundrop Meadows',
			worldWidth: 6_400,
			worldHeight: 6_400,
			cellSize: 128,
			revealedCells: ['12,43', '16,45'],
			player: { x: 1_536, y: 5_600 },
			markers: []
		},
		hp: 12,
		maxHp: 20,
		level: 1,
		xp: 0,
		attack: 4,
		defense: 0,
		heals: 1,
		status: 'Battle victory',
		wallet: { coins: 30 },
		heroOccluded: false,
		nearbyShop: null,
		shop: null,
		dialogue: null,
		battle: { phase: 'none', summary: null, active: null },
		quests: { main: null, completed: [], total: 0 },
		inventory: {
			consumables: [],
			equipment: [],
			keyItems: [],
			equipped: { weapon: null, head: null, body: null, hands: null, accessory: null }
		},
		...overrides
	};
}

function conversationDialogue(id: string): HudState['dialogue'] {
	return {
		id,
		npcId: 'npc-mira',
		speaker: 'Mira',
		line: 'Welcome!',
		lineIndex: 0,
		lineCount: 1,
		mode: 'conversation',
		choices: [],
		canClose: true
	};
}

function hudStateWithEquippedWeapon(overrides: Partial<HudState> = {}): HudState {
	return baseHudState({
		inventory: {
			consumables: [],
			equipment: [
				{
					itemId: 'practice-sword',
					name: 'Practice Sword',
					description: 'A wooden training blade.',
					iconPath: '/game/assets/items/practice-sword.png',
					slot: 'weapon',
					equipped: true,
					modifiers: { attack: 1 }
				}
			],
			keyItems: [],
			equipped: {
				weapon: 'practice-sword',
				head: null,
				body: null,
				hands: null,
				accessory: null
			}
		},
		...overrides
	});
}

function mockConsumable(): ConsumableDefinition {
	return {
		id: 'field-potion',
		nameKey: 'items.fieldPotion.name',
		descriptionKey: 'items.fieldPotion.description',
		name: 'Field Potion',
		description: 'Restores a small amount of HP.',
		iconPath: '/game/assets/items/field-potion.png',
		stackable: true,
		basePrice: 10,
		type: 'consumable',
		effect: { type: 'heal', amount: 15 }
	} as unknown as ConsumableDefinition;
}

function mockEquipment(): EquipmentDefinition {
	return {
		id: 'practice-sword',
		nameKey: 'items.practiceSword.name',
		descriptionKey: 'items.practiceSword.description',
		name: 'Practice Sword',
		description: 'A wooden training blade.',
		iconPath: '/game/assets/items/practice-sword.png',
		stackable: false,
		basePrice: 20,
		type: 'equipment',
		slot: 'weapon'
	} as unknown as EquipmentDefinition;
}

function mockShopBuyEntry(overrides: Partial<HudShopBuyEntry> = {}): HudShopBuyEntry {
	return {
		stockId: 'potion-stock',
		itemId: 'field-potion',
		name: 'Field Potion',
		description: 'Restores a small amount of HP.',
		iconPath: '/game/assets/items/field-potion.png',
		kind: 'consumable',
		price: 10,
		availability: { mode: 'unlimited' },
		item: mockConsumable(),
		...overrides
	};
}

function mockShopSellEntry(overrides: Partial<HudShopSellEntry> = {}): HudShopSellEntry {
	return {
		sellId: 'equipment:practice-sword:0',
		itemId: 'practice-sword',
		name: 'Practice Sword',
		description: 'A wooden training blade.',
		iconPath: '/game/assets/items/practice-sword.png',
		kind: 'equipment',
		quantity: 1,
		price: 5,
		item: mockEquipment(),
		...overrides
	};
}

function withCommands(fn: (commands: unknown[]) => Promise<void> | void): Promise<void> {
	const commands: unknown[] = [];
	const handleCommand = (event: Event) => commands.push((event as CustomEvent).detail);
	window.addEventListener(HUD_COMMAND_EVENT, handleCommand);
	try {
		const result = fn(commands);
		return result instanceof Promise
			? result.finally(() => window.removeEventListener(HUD_COMMAND_EVENT, handleCommand))
			: (Promise.resolve().finally(() =>
					window.removeEventListener(HUD_COMMAND_EVENT, handleCommand)
				) as Promise<void>);
	} catch (err) {
		window.removeEventListener(HUD_COMMAND_EVENT, handleCommand);
		throw err;
	}
}

async function withSaveSlotWriter(run: () => Promise<void>) {
	const handleSaveSlot = (event: Event) => {
		const command = (event as CustomEvent).detail as { type?: string; slot?: 1 | 2 };
		if (command?.type === 'save-slot' && command.slot) {
			writeSaveSlot(command.slot, createSlotRecord());
		}
	};
	window.addEventListener(HUD_COMMAND_EVENT, handleSaveSlot);
	try {
		await run();
	} finally {
		window.removeEventListener(HUD_COMMAND_EVENT, handleSaveSlot);
	}
}

async function expectFieldStageFocus() {
	const stage = document.querySelector<HTMLElement>('.game-stage');
	expect(stage).not.toBeNull();
	await expect.element(stage!).toHaveFocus();
}

function mockMainQuest(overrides: Partial<HudQuestEntry> = {}): HudQuestEntry {
	return {
		questId: 'prologue-proving-morning',
		title: 'The Proving Morning',
		status: 'active',
		description: 'Gather your gear and report to Borak.',
		objective: 'Talk to Old Mott by the hearth.',
		objectiveId: 'talk-to-mott',
		progress: { current: 0, target: 1, label: 'Spoke with Old Mott' },
		rewardSummary: '10 coins',
		...overrides
	};
}

function mockCompletedQuest(overrides: Partial<HudQuestEntry> = {}): HudQuestEntry {
	return mockMainQuest({
		status: 'completed',
		objective: 'Report to Borak at the lodge.',
		objectiveId: 'report-to-borak',
		progress: { current: 1, target: 1, label: 'Reported to Borak' },
		...overrides
	});
}

async function openQuestLog() {
	await page.getByRole('button', { name: /menu/i }).click();
	await page.getByRole('button', { name: 'Quest', exact: true }).click();
	return page.getByRole('dialog', { name: /quest log/i });
}

describe('GameShell motion flourishes', () => {
	it('pulses the party panel when HP is critically low', async () => {
		render(GameShell);
		emitHudState(baseHudState({ hp: 10, maxHp: 50 }));
		const party = page.getByTestId('hud-party-panel');
		await expect.element(party).toHaveClass(/heroic-low-hp/);

		emitHudState(baseHudState({ hp: 40, maxHp: 50 }));
		await expect.element(party).not.toHaveClass(/heroic-low-hp/);
	});

	it('measures the XP bar against the real level threshold, not a hardcoded one', async () => {
		// Progression thresholds come from getXpForLevel — level 1 levels at
		// 5 XP, level 2 at 15; the HUD previously displayed 12/24.
		render(GameShell);
		emitHudState(baseHudState({ level: 1, xp: 3 }));
		const party = page.getByTestId('hud-party-panel');
		await expect.element(party.getByText('3/5')).toBeVisible();

		emitHudState(baseHudState({ level: 2, xp: 7 }));
		await expect.element(party.getByText('7/15')).toBeVisible();
	});

	it('treats exactly 25% HP as critically low', async () => {
		render(GameShell);
		emitHudState(baseHudState({ hp: 5, maxHp: 20 }));
		const party = page.getByTestId('hud-party-panel');
		await expect.element(party).toHaveClass(/heroic-low-hp/);

		emitHudState(baseHudState({ hp: 6, maxHp: 20 }));
		await expect.element(party).not.toHaveClass(/heroic-low-hp/);
	});

	it('flashes the coin display when wallet coins change', async () => {
		render(GameShell);
		emitHudState(baseHudState({ wallet: { coins: 30 } }));
		await expect.element(page.getByText(/30G/)).toBeVisible();

		emitHudState(baseHudState({ wallet: { coins: 50 } }));
		const coinSpan = page.getByText(/50G/);
		await expect.element(coinSpan).toBeVisible();
		await expect.element(coinSpan).toHaveClass(/heroic-coin-flash/);
	});

	it('does not flash coins on unrelated state changes', async () => {
		render(GameShell);
		emitHudState(baseHudState({ wallet: { coins: 30 } }));
		const coinSpan = page.getByText(/30G/);
		await expect.element(coinSpan).toBeVisible();

		// Wait for the initial flash to clear (600ms timeout in component)
		await expect.element(coinSpan).not.toHaveClass(/heroic-coin-flash/);

		emitHudState(baseHudState({ hp: 5, maxHp: 20, wallet: { coins: 30 } }));
		await expect.element(coinSpan).not.toHaveClass(/heroic-coin-flash/);
	});

	it('keeps coin flash alive across unrelated HUD updates before the timer expires', async () => {
		render(GameShell);
		emitHudState(baseHudState({ wallet: { coins: 30 } }));
		await expect.element(page.getByText(/30G/)).toBeVisible();

		emitHudState(baseHudState({ wallet: { coins: 50 } }));
		const coinSpan = page.getByText(/50G/);
		await expect.element(coinSpan).toBeVisible();
		await expect.element(coinSpan).toHaveClass(/heroic-coin-flash/);

		// Unrelated HP update arrives while the flash timer is still running
		emitHudState(baseHudState({ hp: 8, maxHp: 20, wallet: { coins: 50 } }));
		await expect.element(coinSpan).toHaveClass(/heroic-coin-flash/);

		// The flash should still clear after the timer fires
		await expect.element(coinSpan).not.toHaveClass(/heroic-coin-flash/);
	});

	it('flashes the level display when the level increases', async () => {
		render(GameShell);
		emitHudState(baseHudState({ level: 1 }));
		await expect.element(page.getByText(/LV 1/)).toBeVisible();

		emitHudState(baseHudState({ level: 2 }));
		const levelSpan = page.getByText(/LV 2/);
		await expect.element(levelSpan).toBeVisible();
		await expect.element(levelSpan).toHaveClass(/heroic-level-up/);
	});

	it('does not flash level on unrelated state changes', async () => {
		render(GameShell);
		emitHudState(baseHudState({ level: 1 }));
		await expect.element(page.getByText(/LV 1/)).toBeVisible();

		emitHudState(baseHudState({ hp: 5, maxHp: 20, level: 1 }));
		const levelSpan = page.getByText(/LV 1/);
		await expect.element(levelSpan).toBeVisible();
		await expect.element(levelSpan).not.toHaveClass(/heroic-level-up/);
	});

	it('keeps level-up flash alive across unrelated HUD updates before the timer expires', async () => {
		render(GameShell);
		emitHudState(baseHudState({ level: 1 }));
		await expect.element(page.getByText(/LV 1/)).toBeVisible();

		emitHudState(baseHudState({ level: 2 }));
		const levelSpan = page.getByText(/LV 2/);
		await expect.element(levelSpan).toBeVisible();
		await expect.element(levelSpan).toHaveClass(/heroic-level-up/);

		// Unrelated HP update arrives while the flash timer is still running
		emitHudState(baseHudState({ hp: 8, maxHp: 20, level: 2 }));
		await expect.element(levelSpan).toHaveClass(/heroic-level-up/);

		// The flash should still clear after the timer fires
		await expect.element(levelSpan).not.toHaveClass(/heroic-level-up/);
	});

	it('flashes level again after a decrease (e.g. save resume) followed by an increase', async () => {
		render(GameShell);
		emitHudState(baseHudState({ level: 3 }));
		await expect.element(page.getByText(/LV 3/)).toBeVisible();

		// Simulate loading an older save at level 1
		emitHudState(baseHudState({ level: 1 }));
		await expect.element(page.getByText(/LV 1/)).toBeVisible();

		// Level up from the restored save – should flash
		emitHudState(baseHudState({ level: 2 }));
		const levelSpan = page.getByText(/LV 2/);
		await expect.element(levelSpan).toBeVisible();
		await expect.element(levelSpan).toHaveClass(/heroic-level-up/);
	});
});

describe('GameShell hero-card occlusion and readiness', () => {
	it('dims the hero card while the hero stands inside its screen zone', async () => {
		render(GameShell);
		emitHudState(baseHudState({ heroOccluded: true }));
		const party = page.getByTestId('hud-party-panel');
		await expect.element(party).toHaveClass(/hero-card-occluded/);

		emitHudState(baseHudState({ heroOccluded: false }));
		await expect.element(party).not.toHaveClass(/hero-card-occluded/);
	});

	it('hides provisional numeric values until the first authoritative publish', async () => {
		render(GameShell);
		await page.getByRole('button', { name: /new run/i }).click();
		await expect.element(page.getByTestId('hud-party-panel')).not.toBeInTheDocument();
		expect(document.body.textContent).not.toContain('30G');
		expect(document.body.textContent).not.toContain('20G');

		emitHudState(baseHudState({ wallet: { coins: 20 } }));
		await expect.element(page.getByText(/20G/)).toBeVisible();
	});
});

describe('GameShell battle summary', () => {
	it('restores focus to the field HUD after the summary is dismissed', async () => {
		render(GameShell);
		emitHudState(baseHudState());
		const menuButton = page.getByRole('button', { name: /menu/i });
		await expect.element(menuButton).toBeVisible();
		await menuButton.element().focus();

		emitHudState(
			baseHudState({
				battle: {
					phase: 'summary',
					summary: {
						outcome: 'victory',
						enemiesDefeated: 1,
						xpGained: 4,
						coinsGained: 2,
						drops: [],
						leveledUp: false,
						completedQuestTitles: [],
						questRewards: [],
						questProgress: []
					},
					active: null
				}
			})
		);
		const summary = page.getByTestId('battle-summary');
		await expect.element(summary).toBeVisible();
		await expect.element(summary.getByTestId('battle-summary-continue')).toHaveFocus();

		// WorldScene clears the summary; the field HUD remounts and the shell
		// hands focus back to the stage — never <body> or Menu (which would
		// swallow the player's next Enter/Space).
		emitHudState(baseHudState());
		await expectFieldStageFocus();
	});

	it('renders a blocking victory summary and dismisses it through the HUD bridge', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(
				baseHudState({
					battle: {
						phase: 'summary',
						summary: {
							outcome: 'victory',
							enemiesDefeated: 3,
							xpGained: 12,
							coinsGained: 12,
							drops: [{ itemId: 'field-potion', name: 'Field Potion', quantity: 2 }],
							leveledUp: true,
							completedQuestTitles: [],
							questRewards: [
								{
									title: 'Thin the Village Slimes',
									rewardSummary: '6 XP / 12 coins / 1 item'
								}
							],
							questProgress: []
						},
						active: null
					}
				})
			);

			const summary = page.getByTestId('battle-summary');
			await expect.element(summary).toBeVisible();
			await expect.element(summary).toHaveTextContent(/victory/i);
			await expect.element(summary.getByTestId('battle-stat-xp')).toHaveTextContent('12');
			await expect.element(summary.getByTestId('battle-stat-coins')).toHaveTextContent('12');
			await expect.element(summary.getByTestId('battle-stat-drop')).toHaveTextContent('x2');
			await expect.element(summary.getByTestId('battle-stat-foes')).toHaveTextContent('3');
			await expect.element(summary).toHaveTextContent(/Level up/i);
			// Quest pill falls back to the reward grant title.
			await expect
				.element(summary.getByTestId('battle-summary-quest'))
				.toHaveTextContent('Thin the Village Slimes');

			await summary.getByTestId('battle-summary-continue').click();

			expect(commands.at(-1)).toEqual({ type: 'dismiss-battle-summary' });
		});
	});

	it('renders the quest pill with live progress dots', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				battle: {
					phase: 'summary',
					summary: {
						outcome: 'victory',
						enemiesDefeated: 2,
						xpGained: 8,
						coinsGained: 6,
						drops: [{ itemId: 'field-potion', name: 'Field Potion', quantity: 1 }],
						leveledUp: false,
						completedQuestTitles: [],
						questRewards: [],
						questProgress: [
							{
								questId: 'thin-the-village-slimes',
								title: 'Thin the Village Slimes',
								progressLabel: 'Slimes thinned',
								previousProgress: 1,
								currentProgress: 2,
								target: 3
							}
						]
					},
					active: null
				}
			})
		);

		const pill = page.getByTestId('battle-summary-quest');
		await expect.element(pill).toHaveTextContent('Thin the Village Slimes');
		const dots = pill.element()?.querySelectorAll('i') ?? [];
		expect(dots).toHaveLength(3);
		expect(
			Array.from(dots).filter((dot) => dot.classList.contains('battle-summary-dot-on'))
		).toHaveLength(2);
	});

	it('moves keyboard focus to the summary continue action when the summary appears', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				battle: {
					phase: 'summary',
					summary: {
						outcome: 'victory',
						enemiesDefeated: 1,
						xpGained: 4,
						coinsGained: 3,
						drops: [],
						leveledUp: false,
						completedQuestTitles: [],
						questRewards: [],
						questProgress: []
					},
					active: null
				}
			})
		);

		const summary = page.getByTestId('battle-summary');
		await expect.element(summary).toBeVisible();
		await expect.element(summary.getByTestId('battle-summary-continue')).toHaveFocus();
	});

	it('traps tab focus inside the battle summary while command controls are behind it', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await expect.element(page.getByRole('button', { name: 'Save' })).toBeVisible();

		emitHudState(
			baseHudState({
				battle: {
					phase: 'summary',
					summary: {
						outcome: 'defeat',
						enemiesDefeated: 0,
						xpGained: 0,
						coinsGained: 0,
						drops: [],
						leveledUp: false,
						completedQuestTitles: [],
						questRewards: [],
						questProgress: []
					},
					active: null
				}
			})
		);

		const continueButton = page
			.getByTestId('battle-summary')
			.getByTestId('battle-summary-continue');
		await expect.element(continueButton).toHaveFocus();

		await userEvent.keyboard('{Tab}');
		await expect.element(continueButton).toHaveFocus();
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
		await expect.element(continueButton).toHaveFocus();
	});

	describe('GameShell battle HUD', () => {
		function activeBattle(hpOverrides: { hp?: number; maxHp?: number } = {}): Partial<HudState> {
			return {
				hp: 12,
				maxHp: 20,
				attack: 4,
				defense: 1,
				heals: 1,
				inventory: {
					consumables: [
						{
							itemId: 'field-potion',
							name: 'Field Potion',
							description: 'Restores HP.',
							iconPath: '/icon.png',
							quantity: 3
						}
					],
					equipment: [],
					keyItems: [],
					equipped: { weapon: null, head: null, body: null, hands: null, accessory: null }
				},
				battle: {
					phase: 'active',
					summary: null,
					active: {
						targetUnitId: 'encounter:unit:0',
						enemies: [
							{
								unitId: 'encounter:unit:0',
								enemyId: 'slime-scout',
								name: 'Slime Scout',
								hp: 5,
								maxHp: 8,
								defeated: false,
								artPath: '/game/assets/heroic-ui/enemies/forest-wolf.png'
							}
						],
						ribbon: [
							{ unitId: 'hero', readyAt: 0 },
							{ unitId: 'encounter:unit:0', readyAt: 200 }
						],
						feed: [
							{ id: 1, kind: 'hit', amount: 4, subject: 'Slime Scout' },
							{ id: 2, kind: 'hurt', amount: 2, subject: 'Grik' }
						],
						heals: 1,
						items: 3,
						flee: { status: 'idle', progress: 0 },
						now: 0
					}
				},
				...hpOverrides
			};
		}

		it('replaces the field HUD with the battle HUD while a battle is active', async () => {
			render(GameShell);
			emitHudState(baseHudState(activeBattle()));

			await expect.element(page.getByTestId('battle-hud')).toBeVisible();
			await expect.element(page.getByTestId('battle-ribbon')).toBeVisible();
			expect(page.getByTestId('battle-plate').elements()).toHaveLength(1);
			await expect.element(page.getByTestId('battle-hero-plate')).toBeVisible();
			await expect.element(page.getByTestId('battle-feed')).toBeVisible();
			// Feed updates are announced politely without stealing focus.
			await expect.element(page.getByTestId('battle-feed')).toHaveAttribute('role', 'log');
			await expect.element(page.getByTestId('battle-feed')).toHaveAttribute('aria-live', 'polite');
			await expect.element(page.getByTestId('battle-tile-heal')).toBeVisible();
			await expect.element(page.getByTestId('battle-tile-item')).toBeVisible();
			await expect.element(page.getByTestId('battle-tile-flee')).toBeVisible();
			// Field chrome is hidden during battle (mockup composition).
			expect(page.getByTestId('hud-party-panel').elements()).toHaveLength(0);
			expect(page.getByRole('button', { name: /menu/i }).elements()).toHaveLength(0);
		});

		it('marks the current target and selects it via plate click', async () => {
			await withCommands(async (commands) => {
				render(GameShell);
				emitHudState(baseHudState(activeBattle()));

				const plate = page.getByTestId('battle-plate');
				await expect.element(plate).toHaveAttribute('aria-pressed', 'true');

				await plate.click();

				expect(commands).toContainEqual({
					type: 'battle-select-target',
					unitId: 'encounter:unit:0'
				});
			});
		});

		function swarmBattle(count: number, targetUnitId: string): Partial<HudState> {
			const enemies = Array.from({ length: count }, (_, index) => ({
				unitId: `encounter:unit:${index}`,
				enemyId: 'slime-scout',
				name: `Slime Scout ${index + 1}`,
				hp: 5,
				maxHp: 8,
				defeated: false,
				artPath: '/game/assets/heroic-ui/enemies/forest-wolf.png'
			}));
			const base = activeBattle();
			return {
				...base,
				battle: {
					phase: 'active',
					summary: null,
					active: {
						targetUnitId,
						enemies,
						ribbon: [
							{ unitId: 'hero', readyAt: 0 },
							...enemies.map((enemy) => ({ unitId: enemy.unitId, readyAt: 100 }))
						],
						feed: [
							{ id: 1, kind: 'hit', amount: 4, subject: 'Slime Scout' },
							{ id: 2, kind: 'hurt', amount: 2, subject: 'Grik' },
							{ id: 3, kind: 'heal', amount: 6, subject: 'Grik' },
							{ id: 4, kind: 'defeat', amount: 0, subject: 'Slime Scout' }
						],
						heals: 1,
						items: 3,
						flee: { status: 'idle', progress: 0 },
						now: 0
					}
				}
			};
		}

		it('bounds the plate stack and feed inside short viewports', async () => {
			render(GameShell);
			emitHudState(baseHudState(swarmBattle(10, 'encounter:unit:9')));

			// Short viewports get a compact, internally scrollable plate stack
			// and a bounded feed — the shell's overflow: clip makes any
			// off-viewport interactive box unreachable (Playwright click hangs).
			await page.viewport(640, 360);
			try {
				window.scrollTo(0, 0);

				const platesBox = document.querySelector<HTMLElement>('[data-testid="battle-plates"]');
				expect(platesBox).not.toBeNull();
				const boxRect = platesBox!.getBoundingClientRect();
				expect(boxRect.top).toBeGreaterThanOrEqual(0);
				expect(boxRect.bottom).toBeLessThanOrEqual(360);

				const plates = [...document.querySelectorAll<HTMLElement>('[data-testid="battle-plate"]')];
				expect(plates).toHaveLength(10);

				// The stack scrolls internally, so every plate is reachable:
				// scrollIntoView (what a Playwright click performs) lands each
				// one inside the viewport.
				for (const [index, plate] of plates.entries()) {
					plate.scrollIntoView({ block: 'nearest' });
					const rect = plate.getBoundingClientRect();
					expect(rect.top, `plate ${index}`).toBeGreaterThanOrEqual(0);
					expect(rect.bottom, `plate ${index}`).toBeLessThanOrEqual(360);
				}

				// The selected target stays visible: cycling the target scrolls
				// the newly selected plate back into view without manual
				// scrolling.
				emitHudState(baseHudState(swarmBattle(10, 'encounter:unit:0')));
				const newTarget = plates[0]!;
				await vi.waitFor(() => {
					expect(newTarget.getAttribute('aria-pressed')).toBe('true');
				});
				expect(newTarget.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
				expect(newTarget.getBoundingClientRect().bottom).toBeLessThanOrEqual(360);

				// The feed stays fully on-screen too.
				const feed = document.querySelector<HTMLElement>('[data-testid="battle-feed"]')!;
				const feedRect = feed.getBoundingClientRect();
				expect(feedRect.top).toBeGreaterThanOrEqual(0);
				expect(feedRect.bottom).toBeLessThanOrEqual(360);

				// Same bounds hold at a wide short viewport (width-independent fix).
				await page.viewport(1000, 360);
				expect(platesBox!.getBoundingClientRect().bottom).toBeLessThanOrEqual(360);
				expect(feed.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
			} finally {
				await page.viewport(1280, 720);
			}
		});

		it('disables the Heal tile at full HP even with charges left', async () => {
			render(GameShell);
			emitHudState(baseHudState(activeBattle({ hp: 20, maxHp: 20 })));

			await expect.element(page.getByTestId('battle-tile-heal')).toBeDisabled();
		});

		it('dispatches heal, item, and flee commands from the battle tiles', async () => {
			await withCommands(async (commands) => {
				render(GameShell);
				emitHudState(baseHudState(activeBattle()));

				await page.getByTestId('battle-tile-heal').click();
				await page.getByTestId('battle-tile-item').click();
				await page.getByTestId('battle-tile-flee').click();

				expect(commands).toContainEqual({ type: 'heal' });
				expect(commands).toContainEqual({ type: 'use-item', itemId: 'field-potion' });
				expect(commands).toContainEqual({ type: 'battle-flee' });
			});
		});
	});

	it('disables equipped item removal while battle is locked', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(hudStateWithEquippedWeapon());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Bag' }).click();

			const removeButton = page.getByRole('button', { name: /remove/i });
			await expect.element(removeButton).toBeEnabled();

			emitHudState(
				hudStateWithEquippedWeapon({
					battle: {
						phase: 'active',
						summary: null,
						active: {
							targetUnitId: null,
							enemies: [],
							ribbon: [{ unitId: 'hero', readyAt: 0 }],
							feed: [],
							heals: 0,
							items: 0,
							flee: { status: 'idle', progress: 0 },
							now: 0
						}
					}
				})
			);

			await expect.element(removeButton).toBeDisabled();
			const removeElement = removeButton.element();
			if (!(removeElement instanceof HTMLButtonElement)) {
				throw new TypeError('Expected equipped item removal control to be a button');
			}
			removeElement.disabled = false;
			removeElement.click();

			expect(commands).not.toContainEqual({ type: 'unequip-slot', slot: 'weapon' });
		});
	});
});

describe('GameShell field status', () => {
	it('re-animates the status text when the status changes', async () => {
		render(GameShell);
		emitHudState(baseHudState({ status: 'Exploring' }));
		await expect.element(page.getByText(/Exploring/)).toBeVisible();

		emitHudState(baseHudState({ status: 'Battle start' }));
		await expect.element(page.getByText(/Battle start/)).toBeVisible();
	});

	it('keeps the status live region announcing while the command grid is open', async () => {
		// Rest at full HP: WorldScene answers with a status change, but the
		// grid covers the field HUD — the live region must stay mounted and
		// in the accessibility tree (final-review finding 8).
		render(GameShell);
		emitHudState(baseHudState({ status: 'Ready', heals: 2 }));

		await page.getByRole('button', { name: /menu/i }).click();
		await expect.element(page.getByRole('button', { name: 'Heal' })).toBeVisible();

		const region = document.querySelector<HTMLElement>('[role="status"]')!;
		emitHudState(baseHudState({ status: 'Already at full HP', heals: 2 }));

		await vi.waitFor(() => {
			expect(region.textContent).toContain('Already at full HP');
		});
		expect(document.querySelector('[role="status"]')).toBe(region);
		expect(region.getAttribute('aria-live')).toBe('polite');
		// Offscreen while the grid is open, but rendered — not display:none.
		expect(region.getClientRects().length).toBeGreaterThan(0);
	});

	it('suppresses the status pill background while the status is empty', async () => {
		render(GameShell);
		emitHudState(baseHudState({ status: 'Ready' }));
		await expect.element(page.getByText('Ready')).toBeVisible();
		const region = document.querySelector<HTMLElement>('[role="status"]')!;
		expect(region.classList.contains('heroic-field-status-empty')).toBe(false);

		// Nonempty → empty: the live region stays mounted for announcements,
		// but the empty pill must not paint a floating card on the field.
		emitHudState(baseHudState({ status: '' }));
		await vi.waitFor(() => {
			expect(region.classList.contains('heroic-field-status-empty')).toBe(true);
		});
		expect(getComputedStyle(region).backgroundImage).toBe('none');
		expect(region.getAttribute('aria-live')).toBe('polite');
		expect(region.getClientRects().length).toBeGreaterThan(0);
	});
});

describe('GameShell command menu', () => {
	it('toggles the command grid and reports expansion state', async () => {
		render(GameShell);
		emitHudState(baseHudState({ heals: 2 }));

		const menuButton = page.getByRole('button', { name: /menu/i });
		await menuButton.click();
		await expect.element(page.getByRole('button', { name: 'Bag' })).toBeVisible();
		await expect.element(menuButton).toHaveAttribute('aria-expanded', 'true');

		await menuButton.click();
		expect(page.getByRole('button', { name: 'Bag' }).elements()).toHaveLength(0);
		await expect.element(menuButton).toHaveAttribute('aria-expanded', 'false');
	});

	it('closes the command grid on Escape and returns focus to the field stage', async () => {
		render(GameShell);
		emitHudState(baseHudState({ heals: 2 }));

		const menuButton = page.getByRole('button', { name: /menu/i });
		await menuButton.click();
		// Rest stays on the grid (Bag/Gear would navigate to an overlay).
		await page.getByRole('button', { name: 'Heal' }).click();
		await expect.element(page.getByRole('button', { name: 'Heal' })).toHaveFocus();

		await userEvent.keyboard('{Escape}');
		expect(page.getByRole('button', { name: 'Heal' }).elements()).toHaveLength(0);
		await expectFieldStageFocus();
	});

	it('emits heal command when Heal is clicked', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState({ heals: 2 }));

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Heal' }).click();

			expect(commands).toContainEqual({ type: 'heal' });
		});
	});

	it('disables Heal without potions and explains why accessibly', async () => {
		render(GameShell);
		emitHudState(baseHudState({ heals: 0 }));

		await page.getByRole('button', { name: /menu/i }).click();
		const heal = page.getByRole('button', { name: 'Heal', exact: true });
		await expect.element(heal).toBeDisabled();
		await expect.element(heal).toHaveAttribute('aria-describedby', 'field-cmd-heal-unavailable');
		await expect.element(page.getByText('No potions')).toBeInTheDocument();
		expect(heal.element().getAttribute('title')).toBe('No potions');
	});

	it('opens the honest Skill surface with no-skills copy and no game command', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Skill' }).click();

			const dialog = page.getByRole('dialog', { name: 'Skill', exact: true });
			await expect.element(dialog).toBeVisible();
			await expect
				.element(dialog.getByTestId('skill-empty'))
				.toHaveTextContent(/no skills learned yet/i);

			// Opening the grid pauses the game; opening Skill re-sends pause-game
			// because the pause owner changes (settings → skill) — the re-send is
			// what clears transient field status under overlays.
			expect(commands).toEqual([{ type: 'pause-game' }, { type: 'pause-game' }]);

			await userEvent.keyboard('{Escape}');
			expect(dialog.elements()).toHaveLength(0);
			const commandPanel = page.getByRole('region', { name: 'Command' });
			await expect.element(commandPanel).toBeVisible();
			await expect
				.element(commandPanel.getByRole('button', { name: 'Skill', exact: true }))
				.toHaveFocus();
		});
	});
});

describe('GameShell pause ownership status handoff', () => {
	// The WorldScene clears its field status when pause-game arrives; these
	// tests pin the shell's half of the contract: an overlay switch while the
	// world is already paused must re-send the pause so stale field copy
	// ("Recovered HP", "Saved") cannot leak into the Save screen's footer.
	it('re-sends pause-game when Save opens from the Command grid after a heal', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState({ status: 'Recovered HP', heals: 1 }));

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Save', exact: true }).click();
			await expect.element(page.getByRole('dialog', { name: /save/i })).toBeVisible();

			// settings → save is an owner change while already paused: the
			// second pause-game is what lets the scene clear 'Recovered HP'.
			expect(commands).toEqual([{ type: 'pause-game' }, { type: 'pause-game' }]);
		});
	});

	it('re-sends pause-game when Save reopens from the Command grid after a previous save', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState({ status: 'Saved' }));

			await page.getByRole('button', { name: /menu/i }).click();
			const saveTile = page.getByRole('button', { name: 'Save', exact: true });
			await saveTile.click();
			const dialog = page.getByRole('dialog', { name: /save/i });
			await expect.element(dialog).toBeVisible();

			// Escape closes Save; the Save tile's return path re-opens the grid
			// without a resume, so the next Save open is still an owner change.
			await userEvent.keyboard('{Escape}');
			await expect.element(saveTile).toBeVisible();
			await saveTile.click();
			await expect.element(dialog).toBeVisible();

			// menu + save + reopen: three pause-games. Two would let the stale
			// 'Saved' message survive into the reopened Save screen's footer.
			expect(commands).toEqual([
				{ type: 'pause-game' },
				{ type: 'pause-game' },
				{ type: 'pause-game' }
			]);
		});
	});

	it('completes the pendingSave row refresh across the Command → Heal → Save owner transition', async () => {
		render(GameShell);
		emitHudState(baseHudState({ status: 'Recovered HP', heals: 1 }));

		await page.getByRole('button', { name: /menu/i }).click();
		const saveTile = page.getByRole('button', { name: 'Save', exact: true });
		await saveTile.click();
		const saveDialog = page.getByRole('dialog', { name: /save/i });
		await expect.element(saveDialog).toBeVisible();

		// The owner change re-sent pause-game, and the scene answers with the
		// status-clear publish while the Save screen is already open. That
		// publish lands before any slot is chosen, so pendingSave is still off.
		emitHudState(baseHudState({ status: '' }));

		// The deferred manual write: choosing an empty slot arms pendingSave;
		// the save-result publish is what completes it and refreshes the rows.
		await withSaveSlotWriter(async () => {
			await saveDialog.getByTestId('save-slot-2').click();
			emitHudState(baseHudState({ status: 'Saved' }));

			// The rows reloaded: re-clicking slot 2 now raises the overwrite
			// confirmation instead of silently writing again.
			await saveDialog.getByTestId('save-slot-2').click();
			await expect.element(saveDialog.getByTestId('confirm-overwrite')).toBeVisible();
			await saveDialog.getByRole('button', { name: /back/i }).last().click();
		});
		expect(saveDialog.getByTestId('confirm-overwrite').elements()).toHaveLength(0);
	});
});

function installWindowKeyCapture() {
	const seen: string[] = [];
	const capture = (event: Event) => {
		const { key } = event as KeyboardEvent;
		if (key !== 'Enter' && key !== ' ') return;
		seen.push(`${event.type}:${key}`);
		(event as KeyboardEvent).preventDefault();
	};
	window.addEventListener('keydown', capture);
	window.addEventListener('keyup', capture);
	return {
		seen,
		remove() {
			window.removeEventListener('keydown', capture);
			window.removeEventListener('keyup', capture);
		}
	};
}

describe('GameShell keyboard activation under captured keys', () => {
	it('Enter keydown still natively activates the focused Menu button', async () => {
		const capture = installWindowKeyCapture();
		try {
			render(GameShell);
			emitHudState(baseHudState());

			const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
			await expect.element(menuButton).toBeVisible();
			menuButton.element().focus();

			await userEvent.keyboard('{Enter}');

			expect(capture.seen).toEqual([]);
			await expect.element(page.getByRole('region', { name: 'Command' })).toBeVisible();
			await expect.element(menuButton).toHaveAttribute('aria-expanded', 'true');
		} finally {
			capture.remove();
		}
	});

	it('Space keyup still natively activates the focused Menu button', async () => {
		const capture = installWindowKeyCapture();
		try {
			render(GameShell);
			emitHudState(baseHudState());

			const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
			await expect.element(menuButton).toBeVisible();
			menuButton.element().focus();

			await userEvent.keyboard(' ');

			expect(capture.seen).toEqual([]);
			await expect.element(page.getByRole('region', { name: 'Command' })).toBeVisible();
			await expect.element(menuButton).toHaveAttribute('aria-expanded', 'true');
		} finally {
			capture.remove();
		}
	});

	it('Enter keydown still natively activates a focused command tile', async () => {
		const capture = installWindowKeyCapture();
		try {
			render(GameShell);
			emitHudState(baseHudState());

			await page.getByRole('button', { name: /menu/i }).click();
			const mapTile = page.getByRole('button', { name: 'Map' });
			await expect.element(mapTile).toBeVisible();
			mapTile.element().focus();

			await userEvent.keyboard('{Enter}');

			expect(capture.seen).toEqual([]);
			await expect.element(page.getByTestId('area-map-svg')).toBeVisible();
		} finally {
			capture.remove();
		}
	});

	it('Space keyup still natively activates a focused command tile', async () => {
		const capture = installWindowKeyCapture();
		try {
			render(GameShell);
			emitHudState(baseHudState());

			await page.getByRole('button', { name: /menu/i }).click();
			const mapTile = page.getByRole('button', { name: 'Map' });
			await expect.element(mapTile).toBeVisible();
			mapTile.element().focus();

			await userEvent.keyboard(' ');

			expect(capture.seen).toEqual([]);
			await expect.element(page.getByTestId('area-map-svg')).toBeVisible();
		} finally {
			capture.remove();
		}
	});

	it('lets captured keys through to the field when no shell control is focused', async () => {
		const capture = installWindowKeyCapture();
		try {
			render(GameShell);
			emitHudState(baseHudState());
			await expect.element(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
			(document.activeElement as HTMLElement | null)?.blur();
			expect(document.activeElement).toBe(document.body);

			await userEvent.keyboard('{Enter}');
			await userEvent.keyboard(' ');

			expect(capture.seen).toEqual(['keydown:Enter', 'keyup:Enter', 'keydown: ', 'keyup: ']);
			expect(page.getByRole('region', { name: 'Command' }).elements()).toHaveLength(0);
		} finally {
			capture.remove();
		}
	});

	it('does not activate a disabled command tile', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState({ heals: 0 }));

			await page.getByRole('button', { name: /menu/i }).click();
			const restTile = page.getByRole('button', { name: 'Heal' });
			await expect.element(restTile).toBeDisabled();
			restTile.element().focus();

			await userEvent.keyboard('{Enter}');

			expect(commands).not.toContainEqual({ type: 'heal' });
		});
	});

	it('prevents repeated Enter and Space keydowns on focused controls from cascading clicks', async () => {
		const capture = installWindowKeyCapture();
		try {
			render(GameShell);
			emitHudState(baseHudState());

			const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
			await expect.element(menuButton).toBeVisible();
			menuButton.element().focus();

			const repeatEnter = new KeyboardEvent('keydown', {
				key: 'Enter',
				repeat: true,
				bubbles: true,
				cancelable: true
			});
			menuButton.element().dispatchEvent(repeatEnter);
			expect(repeatEnter.defaultPrevented).toBe(true);
			expect(capture.seen).toEqual([]);
			expect(page.getByRole('region', { name: 'Command' }).elements()).toHaveLength(0);

			const repeatSpace = new KeyboardEvent('keydown', {
				key: ' ',
				repeat: true,
				bubbles: true,
				cancelable: true
			});
			menuButton.element().dispatchEvent(repeatSpace);
			expect(repeatSpace.defaultPrevented).toBe(true);
			expect(capture.seen).toEqual([]);
		} finally {
			capture.remove();
		}
	});

	it('lets Enter and Space reach the field after closing Command or Gear', async () => {
		const capture = installWindowKeyCapture();
		try {
			render(GameShell);
			emitHudState(baseHudState());

			await userEvent.keyboard('{Escape}');
			await expect.element(page.getByRole('region', { name: 'Command' })).toBeVisible();
			await userEvent.keyboard('{Escape}');
			await expectFieldStageFocus();

			await userEvent.keyboard(' ');
			await userEvent.keyboard('{Enter}');
			expect(page.getByRole('region', { name: 'Command' }).elements()).toHaveLength(0);
			expect(capture.seen).toEqual(['keydown: ', 'keyup: ', 'keydown:Enter', 'keyup:Enter']);

			capture.seen.length = 0;
			await userEvent.keyboard('i');
			await expect.element(page.getByRole('dialog', { name: 'Inventory' })).toBeVisible();
			await userEvent.keyboard('{Escape}');
			await expectFieldStageFocus();

			await userEvent.keyboard(' ');
			expect(page.getByRole('region', { name: 'Command' }).elements()).toHaveLength(0);
			expect(capture.seen).toEqual(['keydown: ', 'keyup: ']);
		} finally {
			capture.remove();
		}
	});

	it('lets keyup reach the field if keydown was unshielded and focus moved onto a button', async () => {
		const capture = installWindowKeyCapture();
		try {
			render(GameShell);
			emitHudState(baseHudState());

			const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
			await expect.element(menuButton).toBeVisible();
			const stage = document.querySelector<HTMLElement>('.game-stage')!;
			stage.focus();

			stage.dispatchEvent(
				new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
			);
			menuButton.element().focus();
			menuButton
				.element()
				.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true }));

			expect(capture.seen).toEqual(['keydown: ', 'keyup: ']);
		} finally {
			capture.remove();
		}
	});

	it('swallows keyup when its keydown was shielded on a button that then moved focus', async () => {
		const capture = installWindowKeyCapture();
		try {
			render(GameShell);
			emitHudState(baseHudState());

			const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
			await expect.element(menuButton).toBeVisible();
			menuButton.element().focus();

			menuButton
				.element()
				.dispatchEvent(
					new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
				);
			const stage = document.querySelector<HTMLElement>('.game-stage')!;
			stage.focus();
			stage.dispatchEvent(
				new KeyboardEvent('keyup', { key: 'Enter', bubbles: true, cancelable: true })
			);

			expect(capture.seen).toEqual([]);
		} finally {
			capture.remove();
		}
	});

	it('lets keyup reach the field when only repeats landed on a control', async () => {
		const capture = installWindowKeyCapture();
		try {
			render(GameShell);
			emitHudState(baseHudState());

			const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
			await expect.element(menuButton).toBeVisible();
			const stage = document.querySelector<HTMLElement>('.game-stage')!;
			stage.focus();

			stage.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
			);
			menuButton.element().focus();
			const repeatEnter = new KeyboardEvent('keydown', {
				key: 'Enter',
				repeat: true,
				bubbles: true,
				cancelable: true
			});
			menuButton.element().dispatchEvent(repeatEnter);
			expect(repeatEnter.defaultPrevented).toBe(true);
			menuButton
				.element()
				.dispatchEvent(
					new KeyboardEvent('keyup', { key: 'Enter', bubbles: true, cancelable: true })
				);

			expect(capture.seen).toEqual(['keydown:Enter', 'keyup:Enter']);
		} finally {
			capture.remove();
		}
	});

	it('keeps repeats shielded when a control-owned keydown moves focus to the field', async () => {
		const capture = installWindowKeyCapture();
		try {
			render(GameShell);
			emitHudState(baseHudState());

			const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
			await expect.element(menuButton).toBeVisible();
			menuButton.element().focus();

			menuButton
				.element()
				.dispatchEvent(
					new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
				);
			const stage = document.querySelector<HTMLElement>('.game-stage')!;
			stage.focus();
			const repeatEnter = new KeyboardEvent('keydown', {
				key: 'Enter',
				repeat: true,
				bubbles: true,
				cancelable: true
			});
			stage.dispatchEvent(repeatEnter);
			expect(repeatEnter.defaultPrevented).toBe(true);
			stage.dispatchEvent(
				new KeyboardEvent('keyup', { key: 'Enter', bubbles: true, cancelable: true })
			);

			expect(capture.seen).toEqual([]);
		} finally {
			capture.remove();
		}
	});

	it('releases the shield when the activated control unmounts before keyup', async () => {
		const capture = installWindowKeyCapture();
		try {
			render(GameShell);
			await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

			// No save data: Enter on New Run activates on keydown and unmounts
			// the focused button, so the release lands on <body> — outside the
			// shell's keyup listener. The shield must not survive into the field.
			const newRun = page.getByRole('button', { name: /new run/i });
			newRun.element().focus();
			await userEvent.keyboard('{Enter}');

			await expect.element(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
			expect(document.activeElement).toBe(document.body);

			document.querySelector<HTMLElement>('.game-stage')!.focus();
			await userEvent.keyboard('{Enter}');

			expect(capture.seen).toEqual(['keyup:Enter', 'keydown:Enter', 'keyup:Enter']);
		} finally {
			capture.remove();
		}
	});

	it('stops held-key repeats that bypass the shell after the control unmounts', async () => {
		const capture = installWindowKeyCapture();
		try {
			render(GameShell);
			await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

			// Enter on New Run unmounts the focused button on keydown; while the
			// key is still held its repeats retarget <body> — outside the
			// section's handlers — and would reach Phaser as a phantom fresh
			// down. They must be stopped for as long as the press is owned.
			const newRun = page.getByRole('button', { name: /new run/i });
			newRun.element().focus();
			await userEvent.keyboard('{Enter>}');
			await expect.element(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
			expect(document.activeElement).toBe(document.body);

			const repeatEnter = new KeyboardEvent('keydown', {
				key: 'Enter',
				repeat: true,
				bubbles: true,
				cancelable: true
			});
			document.body.dispatchEvent(repeatEnter);

			expect(capture.seen).toEqual([]);

			await userEvent.keyboard('{/Enter}');
			document.body.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
			);

			expect(capture.seen).toEqual(['keyup:Enter', 'keydown:Enter']);
		} finally {
			capture.remove();
		}
	});
});

describe('GameShell overlay return paths', () => {
	it('walks the Escape ladder: field → Command → Gear → Command → field', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState());

			await userEvent.keyboard('{Escape}');
			const commandPanel = page.getByRole('region', { name: 'Command' });
			await expect.element(commandPanel).toBeVisible();
			await expect.element(page.getByRole('button', { name: 'Bag' })).toHaveFocus();

			page.getByRole('button', { name: 'Gear' }).element().focus();
			await userEvent.keyboard('{Enter}');
			const inventory = page.getByRole('dialog', { name: 'Inventory' });
			await expect.element(inventory).toBeVisible();

			commands.length = 0;
			await userEvent.keyboard('{Escape}');
			expect(inventory.elements()).toHaveLength(0);
			await expect.element(commandPanel).toBeVisible();
			await expect.element(page.getByRole('button', { name: 'Gear' })).toHaveFocus();
			expect(commands).not.toContainEqual({ type: 'resume-game' });

			await userEvent.keyboard('{Escape}');
			expect(commandPanel.elements()).toHaveLength(0);
			await expectFieldStageFocus();
			expect(commands).toContainEqual({ type: 'resume-game' });
		});
	});

	it('opens Gear directly with I and returns to the field on Escape', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await userEvent.keyboard('i');

		const inventory = page.getByRole('dialog', { name: 'Inventory' });
		await expect.element(inventory).toBeVisible();
		await expect
			.element(page.getByRole('tab', { name: 'Gear' }))
			.toHaveAttribute('aria-selected', 'true');

		await userEvent.keyboard('{Escape}');
		expect(inventory.elements()).toHaveLength(0);
		expect(page.getByRole('region', { name: 'Command' }).elements()).toHaveLength(0);
		await expectFieldStageFocus();
	});

	it('toggles the Map overlay with M and returns to the field on M and on Escape', async () => {
		render(GameShell);
		emitHudState(baseHudState());
		const mapSvg = page.getByTestId('area-map-svg');

		await userEvent.keyboard('m');
		await expect.element(mapSvg).toBeVisible();

		await userEvent.keyboard('m');
		expect(mapSvg.elements()).toHaveLength(0);
		await expectFieldStageFocus();

		await userEvent.keyboard('m');
		await expect.element(mapSvg).toBeVisible();

		await userEvent.keyboard('{Escape}');
		expect(mapSvg.elements()).toHaveLength(0);
		await expectFieldStageFocus();
	});

	it.each([
		{ tile: 'Map', dialogName: /map$/i, closeName: 'Close' },
		{ tile: 'Save', dialogName: /save/i, closeName: 'Back' },
		{ tile: 'Skill', dialogName: 'Skill', closeName: 'Back' },
		{ tile: 'Quest', dialogName: /quest log/i, closeName: 'Close' },
		{ tile: 'System', dialogName: /display & text/i, closeName: 'Close' }
	])(
		'returns from $tile to the command grid with its tile focused via the on-screen Back',
		async ({ tile, dialogName, closeName }) => {
			render(GameShell);
			emitHudState(baseHudState());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: tile, exact: true }).click();
			const overlay = page.getByRole('dialog', { name: dialogName });
			await expect.element(overlay).toBeVisible();

			await overlay.getByRole('button', { name: closeName, exact: true }).click();

			expect(overlay.elements()).toHaveLength(0);
			const commandPanel = page.getByRole('region', { name: 'Command' });
			await expect.element(commandPanel).toBeVisible();
			await expect
				.element(commandPanel.getByRole('button', { name: tile, exact: true }))
				.toHaveFocus();
		}
	);

	it.each([{ open: 'pointer' as const }, { open: 'keyboard' as const }])(
		'returns to the pointer-clicked command tile, not stale keyboard focus ($open-opened Command)',
		async ({ open }) => {
			render(GameShell);
			emitHudState(baseHudState());

			const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
			if (open === 'keyboard') {
				await expect.element(menuButton).toBeVisible();
				menuButton.element().focus();
				await userEvent.keyboard('{Enter}');
			} else {
				await menuButton.click();
			}
			const commandPanel = page.getByRole('region', { name: 'Command' });
			await expect.element(commandPanel).toBeVisible();

			page.getByRole('button', { name: 'Bag' }).element().focus();
			commandPanel
				.getByRole('button', { name: 'Gear', exact: true })
				.element()
				.dispatchEvent(new MouseEvent('click', { bubbles: true }));

			const inventory = page.getByRole('dialog', { name: 'Inventory' });
			await expect.element(inventory).toBeVisible();
			await inventory.getByRole('button', { name: /Close$/ }).click();

			expect(inventory.elements()).toHaveLength(0);
			await expect.element(commandPanel).toBeVisible();
			await expect
				.element(commandPanel.getByRole('button', { name: 'Gear', exact: true }))
				.toHaveFocus();
		}
	);

	it('returns a shop opened by an NPC to the field', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				shop: {
					shopId: 'miras-item-shop',
					name: "Mira's Item Shop",
					merchantName: 'Mira',
					buy: [mockShopBuyEntry()],
					sell: []
				}
			})
		);

		const shop = page.getByRole('dialog', { name: "Mira's Item Shop" });
		await expect.element(shop).toBeVisible();

		const clearShopOnClose = (event: Event) => {
			if ((event as CustomEvent).detail?.type === 'close-shop') {
				emitHudState(baseHudState());
			}
		};
		window.addEventListener(HUD_COMMAND_EVENT, clearShopOnClose);
		try {
			await shop.getByRole('button', { name: 'Close' }).click();

			expect(shop.elements()).toHaveLength(0);
			expect(page.getByRole('region', { name: 'Command' }).elements()).toHaveLength(0);
			await expectFieldStageFocus();
		} finally {
			window.removeEventListener(HUD_COMMAND_EVENT, clearShopOnClose);
		}
	});
});

describe('GameShell inventory', () => {
	it('emits pause-game when the Bag overlay opens', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Bag' }).click();
			await expect.element(page.getByRole('tab', { name: /potions/i })).toBeVisible();

			// The field must stop moving under the overlay (review: the command
			// was filtered out of assertions instead of being asserted).
			expect(commands).toContainEqual({ type: 'pause-game' });
		});
	});

	it('opens from the command menu and switches categories', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				inventory: {
					consumables: [
						{
							itemId: 'field-potion',
							name: 'Field Potion',
							description: 'Restores HP.',
							iconPath: '/icon.png',
							quantity: 3
						}
					],
					equipment: [
						{
							itemId: 'practice-sword',
							name: 'Practice Sword',
							description: 'A blade.',
							iconPath: '/icon.png',
							slot: 'weapon',
							equipped: false,
							modifiers: { attack: 1 }
						}
					],
					keyItems: [],
					equipped: { weapon: null, head: null, body: null, hands: null, accessory: null }
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Bag' }).click();

		await expect.element(page.getByRole('tab', { name: /potions/i })).toBeVisible();
		await expect
			.element(page.getByRole('tab', { name: /potions/i }))
			.toHaveAttribute('aria-selected', 'true');

		await page.getByRole('tab', { name: /gear/i }).click();
		await expect
			.element(page.getByRole('tab', { name: /gear/i }))
			.toHaveAttribute('aria-selected', 'true');
	});

	it('renders exactly 24 bag slots per category, with Loot as an honest empty grid', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				inventory: {
					consumables: [
						{
							itemId: 'field-potion',
							name: 'Field Potion',
							description: 'Restores HP.',
							iconPath: '/icon.png',
							quantity: 3
						}
					],
					equipment: [],
					keyItems: [
						{
							itemId: 'meadow-token',
							name: 'Meadow Token',
							description: 'A village keepsake.',
							iconPath: '/icon.png',
							quantity: 1
						}
					],
					equipped: { weapon: null, head: null, body: null, hands: null, accessory: null }
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Bag' }).click();

		const slots = page.getByTestId('inventory-slot');
		await expect.element(slots).toHaveLength(24);

		await page.getByRole('tab', { name: /key/i }).click();
		await expect.element(slots).toHaveLength(24);

		// No material item type exists: Loot is a fixed empty grid.
		await page.getByRole('tab', { name: /loot/i }).click();
		await expect.element(slots).toHaveLength(24);
		expect(page.getByRole('button', { name: /token/i }).elements()).toHaveLength(0);
	});

	it('deep-links the Gear command to the bag Gear category', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Gear', exact: true }).click();

		const dialog = page.getByRole('dialog', { name: /inventory/i });
		await expect.element(dialog).toBeVisible();
		await expect
			.element(page.getByRole('tab', { name: /gear/i }))
			.toHaveAttribute('aria-selected', 'true');
	});

	it('renders the five equipment positions around the paper doll', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Bag' }).click();

		const worn = page.getByTestId('inventory-worn');
		for (const position of ['Head', 'Weapon', 'Body', 'Hands', 'Accessory']) {
			await expect.element(worn.getByText(position, { exact: true })).toBeVisible();
		}
		await expect.element(worn.getByTestId('inventory-paper-doll')).toBeVisible();
	});

	it('shows a selected slot in the detail panel with its action', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(
				baseHudState({
					inventory: {
						consumables: [
							{
								itemId: 'field-potion',
								name: 'Field Potion',
								description: 'Restores HP.',
								iconPath: '/icon.png',
								quantity: 3
							}
						],
						equipment: [],
						keyItems: [],
						equipped: { weapon: null, head: null, body: null, hands: null, accessory: null }
					}
				})
			);

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Bag' }).click();

			const dialog = page.getByRole('dialog', { name: /inventory/i });
			const detail = dialog.getByTestId('inventory-detail');
			await expect.element(detail).toHaveTextContent(/select an item/i);

			await page.getByRole('button', { name: /Field Potion/i }).click();
			await expect.element(detail.getByText(/Field Potion/i)).toBeVisible();

			await detail.getByRole('button', { name: /drink/i }).click();
			expect(commands).toContainEqual({ type: 'use-item', itemId: 'field-potion' });
		});
	});

	it('closes on Escape and returns focus to the Bag command tile', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Bag' }).click();
		const dialog = page.getByRole('dialog', { name: /inventory/i });
		await expect.element(dialog).toBeVisible();

		await userEvent.keyboard('{Escape}');

		expect(dialog.elements()).toHaveLength(0);
		const commandPanel = page.getByRole('region', { name: 'Command' });
		await expect.element(commandPanel).toBeVisible();
		await expect
			.element(commandPanel.getByRole('button', { name: 'Bag', exact: true }))
			.toHaveFocus();
	});
});

describe('GameShell shop', () => {
	it('auto-opens when shop state arrives and renders buy stock', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				shop: {
					shopId: 'miras-item-shop',
					name: "Mira's Item Shop",
					merchantName: 'Mira',
					buy: [mockShopBuyEntry()],
					sell: []
				}
			})
		);

		await expect.element(page.getByTestId('shop-buy-grid')).toBeVisible();
	});

	it('renders sell tab when sellable items are available', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				shop: {
					shopId: 'miras-item-shop',
					name: "Mira's Item Shop",
					merchantName: 'Mira',
					buy: [mockShopBuyEntry()],
					sell: [mockShopSellEntry()]
				}
			})
		);

		await expect.element(page.getByTestId('shop-buy-grid')).toBeVisible();

		await page.getByRole('tab', { name: /sell/i }).click();
		await expect.element(page.getByTestId('shop-sell-grid')).toBeVisible();
	});

	it('labels sold-out stock as Sold out instead of Not enough', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				wallet: { coins: 0 },
				shop: {
					shopId: 'miras-item-shop',
					name: "Mira's Item Shop",
					merchantName: 'Mira',
					buy: [
						mockShopBuyEntry({
							price: 999,
							availability: { mode: 'finite', remaining: 0 }
						})
					],
					sell: []
				}
			})
		);

		const dialog = page.getByRole('dialog', { name: "Mira's Item Shop" });
		await dialog.getByTestId('shop-buy-grid').getByRole('button', { name: 'Field Potion' }).click();

		const action = dialog.getByTestId('shop-detail').getByRole('button');
		await expect.element(action).toBeDisabled();
		await expect.element(action).toHaveTextContent('Sold out');
	});

	it('renders duplicate equipment copies as separate selectable sell rows', async () => {
		// Two Iron Caps (e.g. bought from two shops) share one itemId — keying
		// rows by itemId collides, so rows key on the per-instance sellId.
		render(GameShell);
		const capA = mockShopSellEntry({
			sellId: 'equipment:iron-cap:0',
			itemId: 'iron-cap',
			name: 'Iron Cap'
		});
		const capB = mockShopSellEntry({
			sellId: 'equipment:iron-cap:1',
			itemId: 'iron-cap',
			name: 'Iron Cap'
		});
		emitHudState(
			baseHudState({
				shop: {
					shopId: 'miras-item-shop',
					name: "Mira's Item Shop",
					merchantName: 'Mira',
					buy: [],
					sell: [capA, capB]
				}
			})
		);

		const dialog = page.getByRole('dialog', { name: "Mira's Item Shop" });
		await dialog.getByRole('tab', { name: 'Sell', exact: true }).click();
		const tiles = dialog.getByTestId('shop-sell-grid').getByRole('button', { name: 'Iron Cap' });
		expect(tiles.elements()).toHaveLength(2);

		await withCommands(async (commands) => {
			await tiles.nth(1).click();
			await dialog.getByTestId('shop-detail').getByRole('button').click();
			expect(
				commands.filter((command) => (command as { type: string }).type === 'sell-inventory-item')
			).toEqual([expect.objectContaining({ itemId: 'iron-cap' })]);
		});
	});

	it.each(['detail', 'double-click'])(
		'keeps Escape working after the final sale via %s',
		async (mode) => {
			render(GameShell);
			const shop = {
				shopId: 'miras-item-shop',
				name: "Mira's Item Shop",
				merchantName: 'Mira',
				buy: [],
				sell: [mockShopSellEntry()]
			};
			const updateShop = (event: Event) => {
				const command = (event as CustomEvent).detail;
				if (command.type === 'sell-inventory-item') {
					emitHudState(baseHudState({ shop: { ...shop, sell: [] } }));
				} else if (command.type === 'close-shop') {
					emitHudState(baseHudState());
				}
			};
			window.addEventListener(HUD_COMMAND_EVENT, updateShop);
			try {
				emitHudState(baseHudState({ shop }));
				const dialog = page.getByRole('dialog', { name: "Mira's Item Shop" });
				await dialog.getByRole('tab', { name: 'Sell', exact: true }).click();
				const item = dialog.getByRole('button', { name: 'Practice Sword', exact: true });
				if (mode === 'detail') {
					await item.click();
					await dialog.getByTestId('shop-detail').getByRole('button').click();
				} else {
					await item.dblClick();
				}
				await expect.element(dialog.getByRole('button', { name: /Close/ })).toHaveFocus();
				await userEvent.keyboard('{Escape}');
				expect(dialog.elements()).toHaveLength(0);
				await expectFieldStageFocus();
			} finally {
				window.removeEventListener(HUD_COMMAND_EVENT, updateShop);
			}
		}
	);

	it('excludes tabindex -1 buttons from shop focus trap', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				shop: {
					shopId: 'miras-item-shop',
					name: "Mira's Item Shop",
					merchantName: 'Mira',
					buy: [mockShopBuyEntry()],
					sell: [mockShopSellEntry()]
				}
			})
		);

		await expect.element(page.getByTestId('shop-buy-grid')).toBeVisible();

		// When Buy tab is active, Sell tab has tabindex="-1" and must NOT be
		// considered focusable by the Tab trap — otherwise focus escapes.
		const sellTab = page.getByRole('tab', { name: /sell/i });
		await expect.element(sellTab).toHaveAttribute('tabindex', '-1');

		// Tabbing from the last truly focusable element should wrap, not escape
		const dialog = page.getByRole('dialog', { name: /Mira's Item Shop/i });
		const buyTab = page.getByRole('tab', { name: /buy/i });
		// Click to focus the Buy tab
		await buyTab.click();
		await expect.element(buyTab).toHaveFocus();

		// Simulate Tab — focus should wrap back to the first element inside the dialog
		await userEvent.keyboard('{Tab}');
		// Focus should still be inside the dialog, not on the body or outside
		const focused = document.activeElement;
		expect(focused).toBeTruthy();
		expect(dialog.element()?.contains(focused)).toBe(true);
	});

	it('closes on Escape and restores focus to the field stage', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				shop: {
					shopId: 'miras-item-shop',
					name: "Mira's Item Shop",
					merchantName: 'Mira',
					buy: [mockShopBuyEntry()],
					sell: []
				}
			})
		);

		const dialog = page.getByRole('dialog', { name: /Mira's Item Shop/i });
		await expect.element(dialog).toBeVisible();

		// Simulate the WorldScene side of the bridge: a close-shop command clears
		// the shop HUD state. Without this the auto-open effect would re-open the
		// dialog immediately after Escape (test env has no game to clear it).
		const clearShopOnClose = (event: Event) => {
			if ((event as CustomEvent).detail?.type === 'close-shop') {
				window.removeEventListener(HUD_COMMAND_EVENT, clearShopOnClose);
				emitHudState(baseHudState());
			}
		};
		window.addEventListener(HUD_COMMAND_EVENT, clearShopOnClose);

		try {
			await userEvent.keyboard('{Escape}');

			expect(dialog.elements()).toHaveLength(0);
			await expectFieldStageFocus();
		} finally {
			window.removeEventListener(HUD_COMMAND_EVENT, clearShopOnClose);
		}
	});
});

describe('GameShell quest log', () => {
	it('opens from the command menu and renders active quests', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: mockMainQuest(),
					completed: [],
					total: 1
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Quest', exact: true }).click();

		await expect.element(page.getByText(/Field Journal/)).toBeVisible();
		await expect.element(page.getByText(/Spoke with Old Mott/)).toBeVisible();
	});

	it('shows the empty hint when the journal has no quests', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Quest', exact: true }).click();

		await expect.element(page.getByText(/no quests in the journal yet/i)).toBeVisible();
	});

	it('restores focus to the Quest command tile after closing the journal', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: mockMainQuest(),
					completed: [],
					total: 1
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Quest', exact: true }).click();
		const questDialog = page.getByRole('dialog', { name: /quest log/i });
		await expect.element(questDialog).toBeVisible();

		await userEvent.keyboard('{Escape}');
		expect(questDialog.elements()).toHaveLength(0);
		// Final review: closing the journal used to drop focus to body.
		const commandPanel = page.getByRole('region', { name: 'Command' });
		await expect.element(commandPanel).toBeVisible();
		await expect
			.element(commandPanel.getByRole('button', { name: 'Quest', exact: true }))
			.toHaveFocus();
	});

	it('closes on Escape key', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: mockMainQuest(),
					completed: [],
					total: 1
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Quest', exact: true }).click();

		const questDialog = page.getByRole('dialog', { name: /quest log/i });
		await expect.element(questDialog).toBeVisible();

		// Opening the journal moves focus to its close button (overlay owns focus).
		await expect.element(questDialog.getByRole('button', { name: /close/i })).toHaveFocus();

		await userEvent.keyboard('{Escape}');

		// Dialog is removed from DOM via {#if}, so no elements match
		expect(questDialog.elements()).toHaveLength(0);
	});

	it('traps tab focus inside the quest log dialog', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: mockMainQuest(),
					completed: [],
					total: 1
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Quest', exact: true }).click();

		const questDialog = page.getByRole('dialog', { name: /quest log/i });
		const closeButton = questDialog.getByRole('button', { name: /close/i });
		await expect.element(closeButton).toHaveFocus();

		// Tab wraps from the last focusable (close) to the first quest entry.
		await userEvent.keyboard('{Tab}');
		await expect.element(questDialog.getByTestId('quest-entry-main')).toHaveFocus();
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
		await expect.element(closeButton).toHaveFocus();
	});
});

describe('GameShell heroic quest journal', () => {
	it("labels the quest giver by the NPC's region, not the whole map", async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: mockMainQuest({
						questId: 'prologue-trial-tracks',
						title: 'First Trial: Tracks',
						objectiveId: 'meet-lirra-forest'
					}),
					completed: [],
					total: 7
				}
			})
		);

		const questDialog = await openQuestLog();
		// Lirra stands at the Wildwood's edge on the overworld — not 'The Wilds'.
		await expect
			.element(questDialog.getByTestId('quest-giver-location'))
			.toHaveTextContent('The Wildwood');
	});

	it('lists the current chapter above finished ones in the roster', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: mockMainQuest({
						questId: 'prologue-trial-tracks',
						title: 'Trial of Tracks',
						objectiveId: 'meet-lirra-forest'
					}),
					completed: [mockCompletedQuest()],
					total: 2
				}
			})
		);

		const questDialog = await openQuestLog();
		const main = questDialog.getByTestId('quest-entry-main');
		const completed = questDialog.getByTestId('quest-entry-completed');

		await expect.element(main).toBeVisible();
		await expect.element(completed).toBeVisible();
		await expect.element(completed.getByText('Done')).toBeVisible();

		// The current chapter is selected by default.
		await expect.element(main).toHaveClass(/quest-entry-selected/);
		await expect.element(completed).not.toHaveClass(/quest-entry-selected/);

		// Selecting another entry moves the selection.
		await completed.click();
		await expect.element(completed).toHaveClass(/quest-entry-selected/);
		await expect.element(main).not.toHaveClass(/quest-entry-selected/);
	});

	it('renders the selected quest detail with objective chain and rewards', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: mockMainQuest(),
					completed: [],
					total: 1
				}
			})
		);

		const questDialog = await openQuestLog();
		const detail = questDialog.getByTestId('quest-detail');
		await expect.element(detail).toBeVisible();

		// Objective chain: one node per quest objective, the current one marked.
		const chainNodes = questDialog.getByTestId('quest-chain-node').elements();
		expect(chainNodes).toHaveLength(4);
		await expect.element(detail.getByText('Oren', { exact: true })).toBeVisible();
		expect(
			chainNodes.filter((node) => node.classList.contains('quest-chain-node-current'))
		).toHaveLength(1);

		// Reward cards render structured values from the quest definition.
		await expect.element(detail.getByTestId('quest-reward-coins')).toHaveTextContent('10');
		expect(detail.getByTestId('quest-reward-xp').elements()).toHaveLength(0);

		// The giver is the first talk objective's NPC, with the map location line
		// under the name; the map-context card pins the same location. The name
		// also appears in the objective chain, so match the giver-name element.
		await expect.element(detail.getByTestId('quest-giver-name')).toHaveTextContent('Old Mott');
		await expect
			.element(questDialog.getByTestId('quest-giver-location'))
			.toHaveTextContent("Grik's House");
		await expect
			.element(questDialog.getByTestId('quest-map-pin'))
			.toHaveTextContent("Grik's House");

		// Live objective progress from the HUD payload.
		await expect.element(detail.getByText(/Spoke with Old Mott: 0 \/ 1/)).toBeVisible();
		// The live objective sentence renders in the detail panel.
		await expect.element(detail.getByText('Talk to Old Mott by the hearth.')).toBeVisible();

		// The objective chain wraps instead of clipping its nodes.
		const chainTops = new Set(
			questDialog
				.getByTestId('quest-chain-node')
				.elements()
				.map((node) => Math.round(node.getBoundingClientRect().top))
		);
		expect(chainTops.size).toBeGreaterThan(1);

		// The giver block keeps name + location but no misleading caption.
		await expect.element(detail.getByText('Turned in by')).not.toBeInTheDocument();
	});

	it('keeps the seven-quest checklist and localized chain labels after a locale switch', async () => {
		// The checklist tracks the whole main chain at quest level, so a locale
		// switch retranslates its titles without moving the completion state;
		// the detail view's objective chain still matches by objective id.
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: mockMainQuest({
						objectiveId: 'collect-herb-pouch',
						objective: 'Collect the herb pouch from Mira.'
					}),
					completed: [],
					total: 7
				}
			})
		);

		const questDialog = await openQuestLog();
		const panel = questDialog.getByTestId('quest-chapter-progress');
		await expect.element(panel.getByText('0%')).toBeVisible();
		expect(questDialog.getByTestId('quest-progress-row').elements()).toHaveLength(7);

		try {
			updatePreferences({ locale: 'ja' });

			// After the switch the dialog's localized name no longer matches
			// /quest log/i — re-resolve the panel by testid from the page root.
			const jaPanel = page.getByTestId('quest-chapter-progress');
			await expect.element(jaPanel.getByText('0%')).toBeVisible();
			const rows = jaPanel.getByTestId('quest-progress-row').elements();
			expect(rows.map((row) => row.classList.contains('quest-chapter-row-current'))).toEqual([
				true,
				false,
				false,
				false,
				false,
				false,
				false
			]);
			// Quest titles localize with the active locale.
			await expect.element(jaPanel.getByText('第一の試練：足跡')).toBeVisible();
			// Chain labels in the detail view localize with the active locale
			// (the chain list, not the giver-name paragraph below it).
			const jaDetail = page.getByTestId('quest-detail');
			await expect.element(jaDetail.getByRole('list').getByText('モット爺')).toBeVisible();
			await expect.element(jaDetail.getByText('ミラ')).toBeVisible();
		} finally {
			updatePreferences({ locale: 'en' });
		}
	});

	it('tracks quest-level percent across the seven-quest checklist', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: mockMainQuest({
						questId: 'prologue-trial-boar-king',
						title: 'Third Trial: The Boar King',
						objectiveId: 'meet-drogg-north-gate',
						progress: { current: 0, target: 1, label: 'Met Drogg' }
					}),
					completed: [
						mockCompletedQuest({ questId: 'prologue-proving-morning' }),
						mockCompletedQuest({ questId: 'prologue-trial-tracks' }),
						mockCompletedQuest({ questId: 'prologue-trial-mistfen' })
					],
					total: 7
				}
			})
		);

		const questDialog = await openQuestLog();
		const panel = questDialog.getByTestId('quest-chapter-progress');
		await expect.element(panel).toBeVisible();

		// Percentage = completed quests / chain total (3 of 7 → 43%).
		await expect.element(panel.getByText('43%')).toBeVisible();

		// One row per main quest, titled from the localized quest content; the
		// rows before the active quest are done and the active one is current.
		const rows = questDialog.getByTestId('quest-progress-row').elements();
		expect(rows).toHaveLength(7);
		expect(rows.map((row) => row.classList.contains('quest-chapter-row-done'))).toEqual([
			true,
			true,
			true,
			false,
			false,
			false,
			false
		]);
		const currentRows = rows.filter((row) => row.classList.contains('quest-chapter-row-current'));
		expect(currentRows).toHaveLength(1);
		await expect.element(panel.getByText('The Proving Morning')).toBeVisible();
		await expect.element(panel.getByText('Third Trial: The Boar King')).toBeVisible();

		// The current row's count is the real live HUD progress.
		await expect.element(panel.getByText('0 / 1')).toBeVisible();

		// Completing the chain with main cleared keeps the panel at 100%.
		emitHudState(
			baseHudState({
				quests: {
					main: null,
					completed: [
						'prologue-proving-morning',
						'prologue-trial-tracks',
						'prologue-trial-mistfen',
						'prologue-trial-boar-king',
						'prologue-hunters-name',
						'prologue-raid',
						'prologue-escape'
					].map((questId) => mockCompletedQuest({ questId: questId as HudQuestEntry['questId'] })),
					total: 7
				}
			})
		);
		await expect
			.element(page.getByTestId('quest-chapter-progress').getByText('100%'))
			.toBeVisible();
		const doneRows = page
			.getByTestId('quest-progress-row')
			.elements()
			.filter((row) => row.classList.contains('quest-chapter-row-done'));
		expect(doneRows).toHaveLength(7);
		expect(
			page
				.getByTestId('quest-progress-row')
				.elements()
				.filter((row) => row.classList.contains('quest-chapter-row-current'))
		).toHaveLength(0);
	});

	it('marks checklist rows done only for quests the HUD reports completed when no main quest is active', async () => {
		// The save validator accepts a state with no active main quest; a
		// hand-edited save can load one with fewer than seven completions.
		// Rows must mirror the completed set, not the absent chain position.
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: null,
					completed: [mockCompletedQuest({ questId: 'prologue-proving-morning' })],
					total: 7
				}
			})
		);

		const questDialog = await openQuestLog();
		const rows = questDialog.getByTestId('quest-progress-row').elements();
		expect(rows).toHaveLength(7);
		expect(rows.map((row) => row.classList.contains('quest-chapter-row-done'))).toEqual([
			true,
			false,
			false,
			false,
			false,
			false,
			false
		]);
		expect(rows.filter((row) => row.classList.contains('quest-chapter-row-current'))).toHaveLength(
			0
		);
		await expect.element(questDialog.getByText('14%')).toBeVisible();
	});
});

describe('GameShell area map', () => {
	it('opens and closes from the command menu', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		const menuButton = page.getByRole('button', { name: /menu/i });
		await menuButton.click();
		await page.getByRole('button', { name: /map/i }).click();
		await expect.element(menuButton).toHaveAttribute('aria-expanded', 'false');
		await expect.element(page.getByTestId('area-map-svg')).toBeVisible();

		await page.getByRole('button', { name: /close/i }).click();
		await expect.element(menuButton).toHaveAttribute('aria-expanded', 'true');
	});

	it('closes on Escape and returns focus to the Map command tile', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: /map/i }).click();
		const mapSvg = page.getByTestId('area-map-svg');
		await expect.element(mapSvg).toBeVisible();

		await userEvent.keyboard('{Escape}');

		expect(mapSvg.elements()).toHaveLength(0);
		const commandPanel = page.getByRole('region', { name: 'Command' });
		await expect.element(commandPanel).toBeVisible();
		await expect
			.element(commandPanel.getByRole('button', { name: 'Map', exact: true }))
			.toHaveFocus();
	});

	it('renders markers with kind styling and focus selection', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				areaMap: {
					...baseHudState().areaMap,
					revealedCells: ['12,43', '16,45', '20,47'],
					markers: [
						{ id: 'guild-hall', kind: 'building', x: 1_536, y: 5_504, label: 'Guild Hall' },
						{
							id: 'ruins-gate',
							kind: 'quest',
							x: 2_048,
							y: 5_504,
							label: 'Ruins Gate',
							emphasis: true
						}
					]
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: /map/i }).click();
		const svg = page.getByTestId('area-map-svg');
		await expect.element(svg).toBeVisible();

		expect(svg.getByTestId('area-map-marker').elements()).toHaveLength(2);
		const markerClasses = svg
			.getByTestId('area-map-marker')
			.elements()
			.map((marker) => marker.getAttribute('class') ?? '');
		expect(
			markerClasses.filter((className) => className.includes('area-map-marker-quest'))
		).toHaveLength(1);
		expect(
			markerClasses.filter((className) => className.includes('area-map-marker-emphasis'))
		).toHaveLength(1);

		// Focusing a marker announces it in the live selection line.
		await svg.getByRole('img', { name: 'Ruins Gate' }).click();
		await expect.element(page.getByTestId('area-map-selected')).toHaveTextContent('Ruins Gate');
	});

	it.each(['en', 'ja', 'zh-Hant'] as const)(
		'frames the player and a known quest entrance with its rendered label (%s)',
		async (locale) => {
			const label = getAreaName(locale, 'blacksmith-interior');
			render(GameShell);
			emitHudState(
				baseHudState({
					areaMap: {
						...baseHudState().areaMap,
						worldWidth: 12_288,
						worldHeight: 12_288,
						player: { x: 4_464, y: 7_312 },
						markers: [
							{
								id: 'overworld-to-hero-house',
								kind: 'exit',
								x: 4_464,
								y: 7_280,
								label: 'Hero House'
							},
							{
								id: 'overworld-to-blacksmith-interior',
								kind: 'exit',
								x: 5_648,
								y: 7_184,
								label,
								emphasis: true,
								knownQuestEntrance: true
							}
						]
					}
				})
			);

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: /map/i }).click();
			const svg = page.getByTestId('area-map-svg');
			await expect.element(svg).toBeVisible();

			const svgEl = svg.element() as SVGSVGElement;
			const [viewX, viewY, viewWidth, viewHeight] = (svgEl.getAttribute('viewBox') ?? '')
				.split(' ')
				.map(Number);
			expect(viewWidth).toBeLessThan(12_288);
			for (const point of [
				{ x: 4_464, y: 7_312 },
				{ x: 5_648, y: 7_184 }
			]) {
				expect(point.x).toBeGreaterThanOrEqual(viewX);
				expect(point.x).toBeLessThanOrEqual(viewX + viewWidth);
				expect(point.y).toBeGreaterThanOrEqual(viewY);
				expect(point.y).toBeLessThanOrEqual(viewY + viewHeight);
			}

			const marker = svgEl.querySelector<SVGGElement>(
				'[data-focus-id="map-marker-overworld-to-blacksmith-interior"]'
			);
			expect(marker).not.toBeNull();
			const markerText = marker?.querySelector('text');
			expect(markerText?.textContent).toBe(label);
			const frame = svgEl.getBoundingClientRect();
			const labelBox = markerText!.getBoundingClientRect();
			expect(labelBox.width).toBeGreaterThan(0);
			expect(labelBox.left).toBeGreaterThanOrEqual(frame.left);
			expect(labelBox.top).toBeGreaterThanOrEqual(frame.top);
			expect(labelBox.right).toBeLessThanOrEqual(frame.right + 1);
			expect(labelBox.bottom).toBeLessThanOrEqual(frame.bottom + 1);
		}
	);

	it.each(['en', 'ja', 'zh-Hant'] as const)(
		'scales small-room marker labels so they stay readable inside the frame (%s)',
		async (locale) => {
			const label = {
				en: 'The Proving Morning',
				ja: '証明の朝の試練',
				'zh-Hant': '證明之晨的試煉'
			}[locale];
			render(GameShell);
			emitHudState(
				baseHudState({
					mapId: 'hero-house',
					areaMap: {
						...baseHudState().areaMap,
						mapId: 'hero-house',
						name: "Grik's Home",
						worldWidth: 704,
						worldHeight: 576,
						player: { x: 352, y: 480 },
						markers: [
							{ id: 'hero-house-exit', kind: 'exit', x: 640, y: 300, label: 'Sundrop' },
							{ id: 'top-exit', kind: 'exit', x: 120, y: 40, label },
							{
								id: 'quest-pin',
								kind: 'quest',
								x: 560,
								y: 240,
								label,
								emphasis: true
							}
						]
					}
				})
			);

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: /map/i }).click();
			const svg = page.getByTestId('area-map-svg');
			await expect.element(svg).toBeVisible();

			const svgEl = svg.element() as SVGSVGElement;
			const [viewX, viewY, viewWidth, viewHeight] = (svgEl.getAttribute('viewBox') ?? '')
				.split(' ')
				.map(Number);
			// The frame still covers the whole room, growing only to fit labels.
			expect(viewX).toBeLessThanOrEqual(0);
			expect(viewY).toBeLessThanOrEqual(0);
			expect(viewX + viewWidth).toBeGreaterThanOrEqual(704);
			expect(viewY + viewHeight).toBeGreaterThanOrEqual(576);

			const frame = svgEl.getBoundingClientRect();
			// Assert the fixtures rendered: an empty querySelectorAll would
			// otherwise skip every label assertion below.
			for (const id of ['hero-house-exit', 'top-exit', 'quest-pin']) {
				expect(
					svgEl.querySelector(`[data-focus-id="map-marker-${id}"]`),
					`marker ${id}`
				).not.toBeNull();
			}
			for (const markerEl of svgEl.querySelectorAll<SVGGElement>(
				'[data-testid="area-map-marker"]'
			)) {
				const text = markerEl.querySelector('text');
				expect(text).not.toBeNull();
				const box = text!.getBoundingClientRect();
				// Room-scale glyphs, not the fixed overworld size.
				expect(Number(text!.getAttribute('font-size'))).toBeLessThan(AREA_MAP_MARKER_FONT_PX);
				expect(box.width).toBeGreaterThan(0);
				expect(box.left).toBeGreaterThanOrEqual(frame.left - 1);
				expect(box.top).toBeGreaterThanOrEqual(frame.top - 1);
				expect(box.right).toBeLessThanOrEqual(frame.right + 1);
				expect(box.bottom).toBeLessThanOrEqual(frame.bottom + 1);
			}
		}
	);

	it('keeps a revealed offscreen marker out of the local frame and tab order', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				areaMap: {
					...baseHudState().areaMap,
					worldWidth: 12_288,
					worldHeight: 12_288,
					player: { x: 4_464, y: 7_312 },
					markers: [
						{
							id: 'overworld-to-hero-house',
							kind: 'exit',
							x: 4_464,
							y: 7_280,
							label: 'Hero House'
						},
						{
							id: 'overworld-to-blacksmith-interior',
							kind: 'exit',
							x: 5_648,
							y: 7_184,
							label: 'Sundrop Forge'
						}
					]
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: /map/i }).click();
		const svg = page.getByTestId('area-map-svg');
		await expect.element(svg).toBeVisible();

		const svgEl = svg.element() as SVGSVGElement;
		const [viewX, , viewWidth] = (svgEl.getAttribute('viewBox') ?? '').split(' ').map(Number);
		expect(5_648).toBeGreaterThan(viewX + viewWidth);

		expect(
			svgEl.querySelector('[data-focus-id="map-marker-overworld-to-hero-house"]')
		).not.toBeNull();
		expect(
			svgEl.querySelector('[data-focus-id="map-marker-overworld-to-blacksmith-interior"]')
		).toBeNull();

		await userEvent.keyboard('{Tab}');
		await expect.element(svg.getByRole('img', { name: 'Hero House' })).toHaveFocus();
	});

	it('traps focus inside the map dialog while paused', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				areaMap: {
					...baseHudState().areaMap,
					markers: [{ id: 'guild-hall', kind: 'building', x: 1_536, y: 5_504, label: 'Guild Hall' }]
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: /map/i }).click();
		const mapDialog = page.getByRole('dialog');
		const closeButton = mapDialog.getByRole('button', { name: /close/i });

		// Opening the paused overlay moves focus to its close button.
		await expect.element(closeButton).toHaveFocus();

		// Tab wraps from the header close button to the first map marker.
		await userEvent.keyboard('{Tab}');
		await expect.element(mapDialog.getByTestId('area-map-marker').first()).toHaveFocus();
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
		await expect.element(closeButton).toHaveFocus();
	});

	it('moves focus between area map markers using arrow keys', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				areaMap: {
					...baseHudState().areaMap,
					worldWidth: 12_288,
					worldHeight: 12_288,
					player: { x: 4_464, y: 7_312 },
					markers: [
						{
							id: 'overworld-to-hero-house',
							kind: 'exit',
							x: 4_464,
							y: 7_280,
							label: 'Hero House'
						},
						{
							id: 'overworld-to-blacksmith-interior',
							kind: 'exit',
							x: 5_648,
							y: 7_184,
							label: 'Sundrop Forge',
							knownQuestEntrance: true
						}
					]
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: /map/i }).click();
		const mapDialog = page.getByRole('dialog');
		await expect.element(mapDialog).toBeVisible();

		// Tab to move focus from close button to first marker
		await userEvent.keyboard('{Tab}');
		const heroHouse = mapDialog.getByRole('img', { name: 'Hero House' });
		const forge = mapDialog.getByRole('img', { name: 'Sundrop Forge' });
		await expect.element(heroHouse).toHaveFocus();

		// ArrowUp moves focus northward from Hero House to Sundrop Forge
		await userEvent.keyboard('{ArrowUp}');
		await expect.element(forge).toHaveFocus();

		// ArrowDown moves focus southward from Sundrop Forge back to Hero House
		await userEvent.keyboard('{ArrowDown}');
		await expect.element(heroHouse).toHaveFocus();
	});
});

describe('GameShell battle summary defeat', () => {
	it('renders defeat summary with defeat-specific message and no stat cards', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				battle: {
					phase: 'summary',
					summary: {
						outcome: 'defeat',
						enemiesDefeated: 0,
						xpGained: 0,
						coinsGained: 0,
						drops: [],
						leveledUp: false,
						completedQuestTitles: [],
						questRewards: [],
						questProgress: []
					},
					active: null
				}
			})
		);

		const summary = page.getByTestId('battle-summary');
		await expect.element(summary).toBeVisible();
		await expect.element(summary.getByTestId('battle-summary-continue')).toBeVisible();
		await expect.element(summary).toHaveTextContent(/returned to the shrine/i);
		expect(summary.getByTestId('battle-stat-xp').elements()).toHaveLength(0);
	});
});

describe('GameShell battle summary on short viewports', () => {
	// Fourth review: at the 360px-tall Tauri minimum the emblem/stats/Continue
	// stack ran past the clipped shell — Continue unreachable by pointer.
	const summaryState: Partial<HudState> = {
		battle: {
			phase: 'summary',
			summary: {
				outcome: 'victory',
				enemiesDefeated: 3,
				xpGained: 12,
				coinsGained: 12,
				drops: [{ itemId: 'field-potion', name: 'Field Potion', quantity: 2 }],
				leveledUp: true,
				completedQuestTitles: [],
				questRewards: [
					{ title: 'Thin the Village Slimes', rewardSummary: '6 XP / 12 coins / 1 item' }
				],
				questProgress: []
			},
			active: null
		}
	};

	async function expectContinueReachable(width: number, height: number) {
		await page.viewport(width, height);
		try {
			window.scrollTo(0, 0);
			render(GameShell);
			emitHudState(baseHudState(summaryState));

			const continueButton = page
				.getByTestId('battle-summary')
				.getByTestId('battle-summary-continue');
			await expect.element(continueButton).toBeVisible();

			const rect = continueButton.element().getBoundingClientRect();
			expect(rect.top).toBeGreaterThanOrEqual(0);
			expect(rect.bottom).toBeLessThanOrEqual(height);
			expect(rect.left).toBeGreaterThanOrEqual(0);
			expect(rect.right).toBeLessThanOrEqual(width);

			// Reachable means clickable, not merely laid out.
			await continueButton.click();
		} finally {
			await page.viewport(1280, 720);
		}
	}

	it('keeps Continue visible and clickable at 640×360', async () => {
		await expectContinueReachable(640, 360);
	});

	it('keeps Continue visible and clickable at 1440×360', async () => {
		await expectContinueReachable(1440, 360);
	});
});

function createSlotRecord(): SaveSlotRecord {
	return {
		kind: 'manual',
		savedAt: '2026-09-04T12:00:00.000Z',
		playtimeSeconds: 42,
		state: createNewSaveState()
	};
}

describe('GameShell save screen', () => {
	it("labels save slots by the saved player's region", async () => {
		const door = anchorPoint('wildwood-lirra-forest');
		writeSaveSlot(1, {
			...createSlotRecord(),
			state: {
				...createNewSaveState(),
				mapId: 'overworld',
				player: { ...createNewSaveState().player, x: door.x, y: door.y }
			}
		});
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Save' }).click();

		const saveDialog = page.getByRole('dialog', { name: /save/i });
		await expect.element(saveDialog).toBeVisible();
		// The record stands in the Wildwood, not at the overworld's generic name.
		await expect.element(saveDialog.getByText('The Wildwood')).toBeVisible();
	});

	it('opens the save screen from the menu and emits save-slot for an empty slot', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Save' }).click();

			const saveDialog = page.getByRole('dialog', { name: /save/i });
			await expect.element(saveDialog).toBeVisible();
			expect(commands).toContainEqual({ type: 'pause-game' });
			await expect.element(saveDialog.getByTestId('save-slot-autosave')).toBeVisible();
			await expect.element(saveDialog.getByTestId('save-slot-1')).toBeVisible();
			await expect.element(saveDialog.getByTestId('save-slot-2')).toBeVisible();

			await saveDialog.getByTestId('save-slot-1').click();

			expect(commands).toContainEqual({ type: 'save-slot', slot: 1 });
		});
	});

	it('saves directly into an empty slot without asking for confirmation', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Save' }).click();

			const saveDialog = page.getByRole('dialog', { name: /save/i });
			await expect.element(saveDialog).toBeVisible();

			// Overwrite confirmation only fires for an existing record; empty slot saves directly.
			await saveDialog.getByTestId('save-slot-2').click();

			expect(commands).toContainEqual({ type: 'save-slot', slot: 2 });
		});
	});

	it('renders slot playtime as h:mm:ss on the save screen', async () => {
		writeSaveSlot(1, { ...createSlotRecord(), playtimeSeconds: 96 });
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Save' }).click();

		const saveDialog = page.getByRole('dialog', { name: /save/i });
		await expect.element(saveDialog).toBeVisible();
		await expect.element(saveDialog.getByTestId('save-slot-1')).toHaveTextContent('0:01:36');
	});

	it('shows persisted playtime as h:mm:ss on the title Continue card', async () => {
		writeSaveSlot(1, { ...createSlotRecord(), playtimeSeconds: 3661 });
		render(GameShell);

		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: /continue/i }))
			.toHaveTextContent('1:01:01');
	});

	it('moves overwrite-dialog focus: entry on the primary, Tab trapped, cancel restores the slot', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Save' }).click();

		const saveDialog = page.getByRole('dialog', { name: /save/i });
		await expect.element(saveDialog).toBeVisible();

		// Write slot 1, then click it again to raise the overwrite alertdialog.
		await withSaveSlotWriter(async () => {
			await saveDialog.getByTestId('save-slot-1').click();
			emitHudState(baseHudState({ status: 'Saved.' }));
			await saveDialog.getByTestId('save-slot-1').click();
			const confirmButton = saveDialog.getByTestId('confirm-overwrite');
			await expect.element(confirmButton).toBeVisible();

			// Focus entry: primary action owns focus while the alertdialog is open.
			await expect.element(confirmButton).toHaveFocus();

			// Shift+Tab from the alertdialog container itself wraps to the LAST
			// control instead of escaping the aria-modal surface.
			const confirmDialog = saveDialog.getByRole('alertdialog').element() as HTMLElement;
			confirmDialog.focus();
			await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
			await expect.element(confirmButton).toHaveFocus();

			// Tab is trapped within the alertdialog's two buttons.
			const cancel = saveDialog.getByRole('button', { name: /back/i }).last();
			await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
			await expect.element(cancel).toHaveFocus();
			await userEvent.keyboard('{Tab}');
			await expect.element(confirmButton).toHaveFocus();
			await userEvent.keyboard('{Tab}');
			await expect.element(cancel).toHaveFocus();

			// Cancel restores focus to the slot that opened the dialog.
			await cancel.click();
			await expect.element(saveDialog.getByTestId('save-slot-1')).toHaveFocus();
			expect(saveDialog.getByTestId('confirm-overwrite').elements()).toHaveLength(0);
		});
	});

	it('Escape inside the overwrite alertdialog cancels it without closing the Save screen', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Save' }).click();

		const saveDialog = page.getByRole('dialog', { name: /save/i });
		await expect.element(saveDialog).toBeVisible();

		await withSaveSlotWriter(async () => {
			await saveDialog.getByTestId('save-slot-1').click();
			emitHudState(baseHudState({ status: 'Saved.' }));
			await saveDialog.getByTestId('save-slot-1').click();
			await expect.element(saveDialog.getByTestId('confirm-overwrite')).toBeVisible();

			// Escape must be swallowed by the alertdialog: it cancels the prompt
			// and returns focus to the slot rather than closing the whole screen.
			await userEvent.keyboard('{Escape}');
			expect(saveDialog.getByTestId('confirm-overwrite').elements()).toHaveLength(0);
			await expect.element(saveDialog).toBeVisible();
			await expect.element(saveDialog.getByTestId('save-slot-1')).toHaveFocus();

			// A second Escape now reaches the screen-level handler and closes it.
			await userEvent.keyboard('{Escape}');
			expect(saveDialog.elements()).toHaveLength(0);
		});
	});

	it.each([
		{
			focusName: 'the Save screen Back button',
			focus: async (saveDialog: ReturnType<typeof page.getByRole>) => {
				saveDialog.element().querySelector<HTMLElement>('.save-back')?.focus();
			}
		},
		{
			focusName: 'the Save dialog root',
			focus: async (saveDialog: ReturnType<typeof page.getByRole>) => {
				saveDialog.element().focus();
			}
		}
	])('Escape cancels the overwrite prompt first when $focusName has focus', async ({ focus }) => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Save' }).click();

		const saveDialog = page.getByRole('dialog', { name: /save/i });
		await expect.element(saveDialog).toBeVisible();

		await withSaveSlotWriter(async () => {
			await saveDialog.getByTestId('save-slot-1').click();
			emitHudState(baseHudState({ status: 'Saved.' }));
			await saveDialog.getByTestId('save-slot-1').click();
			await expect.element(saveDialog.getByTestId('confirm-overwrite')).toBeVisible();

			await focus(saveDialog);
			await userEvent.keyboard('{Escape}');

			expect(saveDialog.getByTestId('confirm-overwrite').elements()).toHaveLength(0);
			await expect.element(saveDialog).toBeVisible();

			await userEvent.keyboard('{Escape}');
			expect(saveDialog.elements()).toHaveLength(0);
		});
	});

	it('blocks pointer input to the underlying screen while the overwrite alertdialog is open', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Save' }).click();

			const saveDialog = page.getByRole('dialog', { name: /save/i });
			await expect.element(saveDialog).toBeVisible();

			await withSaveSlotWriter(async () => {
				// Fill slot 1 — WorldScene defers the write to the post-render tick
				// and publishes HUD state when it lands — then click it again to
				// raise the overwrite alertdialog.
				await saveDialog.getByTestId('save-slot-1').click();
				emitHudState(baseHudState({ status: 'Saved.' }));
				await saveDialog.getByTestId('save-slot-1').click();
				const alertDialog = saveDialog.getByRole('alertdialog');
				await expect.element(alertDialog).toBeVisible();
				await expect.element(alertDialog).toHaveAttribute('aria-modal', 'true');

				commands.length = 0;

				// force: true dispatches real input at the element's coordinates, so
				// the modal scrim still receives the click — the covered control must not.
				await saveDialog.getByTestId('save-slot-2').click({ force: true });
				await saveDialog.getByRole('button', { name: /back/i }).first().click({ force: true });

				expect(commands).toHaveLength(0);
				await expect.element(alertDialog).toBeVisible();
				await expect.element(saveDialog).toBeVisible();
			});
		});
	});

	it('shows a just-written record and asks to overwrite when the same slot is clicked again', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Save' }).click();

			const saveDialog = page.getByRole('dialog', { name: /save/i });
			await expect.element(saveDialog).toBeVisible();

			// Emulate WorldScene: it writes the slot synchronously while handling
			// the save-slot command event, before control returns to the UI.
			const emulateWorldSceneSave = (event: Event) => {
				const command = (event as CustomEvent).detail as { type?: string; slot?: 1 | 2 };
				if (command?.type === 'save-slot' && command.slot) {
					writeSaveSlot(command.slot, createSlotRecord());
				}
			};
			window.addEventListener(HUD_COMMAND_EVENT, emulateWorldSceneSave);
			try {
				// Save to the first manual slot (display slot 2).
				await saveDialog.getByTestId('save-slot-1').click();
				expect(commands).toContainEqual({ type: 'save-slot', slot: 1 });

				// Post-save HUD publish, as WorldScene emits after writing.
				emitHudState(baseHudState({ status: 'Saved.' }));

				// The slot list must reflect the new record immediately.
				await expect.element(saveDialog.getByText("Grik's House")).toBeVisible();

				// Clicking the same occupied slot again must ask before overwriting.
				await saveDialog.getByTestId('save-slot-1').click();
				await expect.element(saveDialog.getByTestId('confirm-overwrite')).toBeVisible();

				await saveDialog.getByTestId('confirm-overwrite').click();
			} finally {
				window.removeEventListener(HUD_COMMAND_EVENT, emulateWorldSceneSave);
			}

			const saveCommands = commands.filter(
				(command) => (command as { type?: string }).type === 'save-slot'
			);
			expect(saveCommands).toEqual([
				{ type: 'save-slot', slot: 1 },
				{ type: 'save-slot', slot: 1 }
			]);
		});
	});
});

describe('GameShell inventory actions', () => {
	it('uses a consumable item on double-click', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(
				baseHudState({
					inventory: {
						consumables: [
							{
								itemId: 'field-potion',
								name: 'Field Potion',
								description: 'Restores HP.',
								iconPath: '/icon.png',
								quantity: 3
							}
						],
						equipment: [],
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

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Bag' }).click();

			await page.getByRole('button', { name: /Field Potion/i }).dblClick();

			expect(commands).toContainEqual({ type: 'use-item', itemId: 'field-potion' });
		});
	});

	it('equips an unequipped item on double-click', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(
				baseHudState({
					inventory: {
						consumables: [],
						equipment: [
							{
								itemId: 'practice-sword',
								name: 'Practice Sword',
								description: 'A blade.',
								iconPath: '/icon.png',
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

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Bag' }).click();
			await page.getByRole('tab', { name: /gear/i }).click();

			await page.getByRole('button', { name: /Practice Sword/i }).dblClick();

			expect(commands).toContainEqual({ type: 'equip-item', itemId: 'practice-sword' });
		});
	});

	it('renders key items in the key items tab', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				inventory: {
					consumables: [],
					equipment: [],
					keyItems: [
						{
							itemId: 'ancient-key',
							name: 'Ancient Key',
							description: 'Opens the ruins gate.',
							iconPath: '/icon.png',
							quantity: 1
						}
					],
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

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Bag' }).click();
		await page.getByRole('tab', { name: /key/i }).click();

		await expect.element(page.getByRole('button', { name: /Ancient Key/i })).toBeVisible();
	});

	it('closes Gear on the first Escape after the Equip action unmounts under focus', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			const sword = {
				itemId: 'practice-sword',
				name: 'Practice Sword',
				description: 'A blade.',
				iconPath: '/icon.png',
				slot: 'weapon' as const,
				equipped: false,
				modifiers: { attack: 1 }
			};
			const inventory = (equipped: boolean) => ({
				consumables: [],
				equipment: [{ ...sword, equipped }],
				keyItems: [],
				equipped: {
					weapon: equipped ? 'practice-sword' : null,
					head: null,
					body: null,
					hands: null,
					accessory: null
				}
			});
			emitHudState(baseHudState({ inventory: inventory(false) }));

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Gear', exact: true }).click();
			const dialog = page.getByRole('dialog', { name: 'Inventory' });
			await expect.element(dialog).toBeVisible();

			await dialog.getByRole('button', { name: 'Practice Sword' }).click();
			const equip = dialog.getByRole('button', { name: /equip/i });
			await expect.element(equip).toBeVisible();
			await equip.click();
			expect(commands).toContainEqual({ type: 'equip-item', itemId: 'practice-sword' });

			emitHudState(baseHudState({ inventory: inventory(true) }));
			await expect.poll(() => document.activeElement).toBe(document.body);

			await userEvent.keyboard('{Escape}');
			expect(dialog.elements()).toHaveLength(0);
			const commandPanel = page.getByRole('region', { name: 'Command' });
			await expect.element(commandPanel).toBeVisible();
			await expect
				.element(commandPanel.getByRole('button', { name: 'Gear', exact: true }))
				.toHaveFocus();
		});
	});
});

describe('GameShell shop actions', () => {
	it('buys an item on double-click when affordable', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(
				baseHudState({
					wallet: { coins: 30 },
					shop: {
						shopId: 'miras-item-shop',
						name: "Mira's Item Shop",
						merchantName: 'Mira',
						buy: [mockShopBuyEntry()],
						sell: []
					}
				})
			);

			await page.getByRole('button', { name: 'Field Potion', exact: true }).dblClick();

			expect(commands).toContainEqual({
				type: 'buy-shop-item',
				shopId: 'miras-item-shop',
				stockId: 'potion-stock'
			});
		});
	});

	it('does not emit buy command when wallet cannot afford the item', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(
				baseHudState({
					wallet: { coins: 0 },
					shop: {
						shopId: 'miras-item-shop',
						name: "Mira's Item Shop",
						merchantName: 'Mira',
						buy: [mockShopBuyEntry()],
						sell: []
					}
				})
			);

			await page.getByRole('button', { name: 'Field Potion', exact: true }).dblClick();

			expect(commands).not.toContainEqual(expect.objectContaining({ type: 'buy-shop-item' }));
		});
	});

	it('sells an item on double-click', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(
				baseHudState({
					wallet: { coins: 30 },
					shop: {
						shopId: 'miras-item-shop',
						name: "Mira's Item Shop",
						merchantName: 'Mira',
						buy: [mockShopBuyEntry()],
						sell: [mockShopSellEntry()]
					}
				})
			);

			await page.getByRole('tab', { name: /sell/i }).click();
			await page.getByRole('button', { name: 'Practice Sword', exact: true }).dblClick();

			expect(commands).toContainEqual({
				type: 'sell-inventory-item',
				itemId: 'practice-sword'
			});
		});
	});
});

describe('GameShell heroic shop', () => {
	function mockVestBuyEntry(): HudShopBuyEntry {
		return {
			stockId: 'vest-stock',
			itemId: 'traveler-vest',
			name: 'Traveler Vest',
			description: 'Light armor for long walks.',
			iconPath: '/game/assets/items/traveler-vest.png',
			kind: 'equipment',
			price: 45,
			availability: { mode: 'finite', remaining: 1 },
			item: {
				...mockEquipment(),
				id: 'traveler-vest',
				slot: 'body',
				modifiers: { maxHp: 4 }
			} as unknown as EquipmentDefinition,
			preview: {
				slot: 'body',
				replacedItemId: null,
				before: { maxHp: 20, attack: 4, defense: 0 },
				after: { maxHp: 24, attack: 4, defense: 0 }
			},
			owned: 0
		};
	}

	function vestShopState(coins: number): Partial<HudState> {
		return {
			wallet: { coins },
			shop: {
				shopId: 'guild-quartermaster',
				name: 'Guild Quartermaster',
				merchantName: 'Quartermaster Vale',
				description: 'Guild-approved gear for new ruins assignments.',
				bustPath: '/game/assets/heroic-ui/busts/quartermaster.png',
				buy: [mockVestBuyEntry()],
				sell: []
			}
		};
	}

	it('renders the merchant identity, purse, and canonical deltas for an unaffordable pick', async () => {
		render(GameShell);
		emitHudState(baseHudState(vestShopState(30)));

		const dialog = page.getByRole('dialog', { name: 'Guild Quartermaster' });
		await expect
			.element(dialog.getByRole('heading', { name: 'Guild Quartermaster' }))
			.toBeVisible();
		// Merchant art + flavor line + purse (wallet before).
		await expect
			.element(dialog.getByRole('img', { name: 'Quartermaster Vale, merchant portrait' }))
			.toBeVisible();
		await expect
			.element(dialog.getByText('Guild-approved gear for new ruins assignments.'))
			.toBeVisible();
		await expect.element(dialog.getByTestId('shop-purse')).toBeVisible();

		await dialog.getByRole('button', { name: 'Traveler Vest', exact: true }).click();

		// Canonical stat deltas from previewEquipmentSwap.
		const maxHpDelta = dialog.getByTestId('shop-delta-maxHp');
		await expect.element(maxHpDelta).toHaveTextContent('20');
		await expect.element(maxHpDelta).toHaveTextContent('24');
		const purseAfter = dialog.getByTestId('shop-purse-after');
		await expect.element(purseAfter).toHaveTextContent('30');
		await expect.element(purseAfter).toHaveTextContent('-15');

		// Unaffordable: the action is a disabled "Not enough" plate.
		const action = dialog.getByRole('button', { name: 'Not enough' });
		await expect.element(action).toBeDisabled();
	});

	it('buys an affordable selection from the detail action', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState(vestShopState(45)));

			const dialog = page.getByRole('dialog', { name: 'Guild Quartermaster' });
			await dialog.getByRole('button', { name: 'Traveler Vest', exact: true }).click();

			const action = dialog.getByRole('button', { name: 'Buy' });
			await expect.element(action).toBeEnabled();
			await action.click();

			expect(commands).toContainEqual({
				type: 'buy-shop-item',
				shopId: 'guild-quartermaster',
				stockId: 'vest-stock'
			});
		});
	});
});

describe('GameShell keyboard shortcuts', () => {
	it('opens area map with M key', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await userEvent.keyboard('m');

		await expect.element(page.getByTestId('area-map-svg')).toBeVisible();
	});

	it('closes area map with M key when already open', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await userEvent.keyboard('m');
		await expect.element(page.getByTestId('area-map-svg')).toBeVisible();

		await userEvent.keyboard('m');
		await expectFieldStageFocus();
	});

	it('does not open area map when the command grid is open', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		const bagCommand = page.getByRole('button', { name: 'Bag' });
		await expect.element(bagCommand).toBeVisible();

		await userEvent.keyboard('m');
		await expect.element(bagCommand).toBeVisible();
		expect(page.getByTestId('area-map-svg').elements()).toHaveLength(0);
	});

	it('does not open area map with M while the save screen is open', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		const saveDialog = page.getByRole('dialog', { name: /save/i });
		await expect.element(saveDialog).toBeVisible();

		await userEvent.keyboard('m');

		expect(page.getByTestId('area-map-svg').elements()).toHaveLength(0);
		await expect.element(saveDialog).toBeVisible();
	});

	it('does not open area map with M during dialogue', async () => {
		render(GameShell);
		emitHudState(baseHudState({ dialogue: conversationDialogue('dialogue-m-guard') }));
		await expect.element(page.getByRole('dialog', { name: 'Mira' })).toBeVisible();

		await userEvent.keyboard('m');

		expect(page.getByTestId('area-map-svg').elements()).toHaveLength(0);
		await expect.element(page.getByRole('dialog', { name: 'Mira' })).toBeVisible();
	});

	function lockedBattle(phase: 'active' | 'summary'): Partial<HudState> {
		if (phase === 'summary') {
			return {
				battle: {
					phase,
					summary: {
						outcome: 'victory',
						enemiesDefeated: 1,
						xpGained: 4,
						coinsGained: 2,
						drops: [],
						leveledUp: false,
						completedQuestTitles: [],
						questRewards: [],
						questProgress: []
					},
					active: null
				}
			};
		}
		return {
			battle: {
				phase,
				summary: null,
				active: {
					targetUnitId: 'encounter:unit:0',
					enemies: [
						{
							unitId: 'encounter:unit:0',
							enemyId: 'slime-scout',
							name: 'Slime Scout',
							hp: 5,
							maxHp: 8,
							defeated: false,
							artPath: '/game/assets/heroic-ui/enemies/forest-wolf.png'
						}
					],
					ribbon: [{ unitId: 'hero', readyAt: 0 }],
					feed: [],
					heals: 1,
					items: 0,
					flee: { status: 'idle', progress: 0 },
					now: 0
				}
			}
		};
	}

	it.each(['active', 'summary'] as const)(
		'never emits battle-flee on Escape while a battle is in the $phase phase',
		async (phase) => {
			await withCommands(async (commands) => {
				render(GameShell);
				emitHudState(baseHudState(lockedBattle(phase)));
				const battleSurface = page.getByTestId(
					phase === 'active' ? 'battle-hud' : 'battle-summary'
				);
				await expect.element(battleSurface).toBeVisible();

				await userEvent.keyboard('{Escape}');

				expect(commands).not.toContainEqual({ type: 'battle-flee' });
				expect(commands).not.toContainEqual({ type: 'dismiss-battle-summary' });
				expect(page.getByRole('region', { name: 'Command' }).elements()).toHaveLength(0);
				await expect.element(battleSurface).toBeVisible();
			});
		}
	);

	it.each(['i', 'm'] as const)('ignores $key while a dialogue is open', async (key) => {
		render(GameShell);
		emitHudState(baseHudState({ dialogue: conversationDialogue('dialogue-hotkey-guard') }));
		const dialogue = page.getByRole('dialog', { name: 'Mira' });
		await expect.element(dialogue).toBeVisible();

		await userEvent.keyboard(key);

		expect(page.getByRole('dialog', { name: 'Inventory' }).elements()).toHaveLength(0);
		expect(page.getByTestId('area-map-svg').elements()).toHaveLength(0);
		await expect.element(dialogue).toBeVisible();
	});

	it.each(['active', 'summary'] as const)(
		'ignores I and M while a battle is in the $phase phase',
		async (phase) => {
			render(GameShell);
			emitHudState(baseHudState(lockedBattle(phase)));
			const battleSurface = page.getByTestId(phase === 'active' ? 'battle-hud' : 'battle-summary');
			await expect.element(battleSurface).toBeVisible();

			await userEvent.keyboard('im');

			expect(page.getByRole('dialog', { name: 'Inventory' }).elements()).toHaveLength(0);
			expect(page.getByTestId('area-map-svg').elements()).toHaveLength(0);
			await expect.element(battleSurface).toBeVisible();
		}
	);

	it('ignores I, M and Escape on the Title screen', async () => {
		render(GameShell);
		emitHudState(baseHudState({ ready: false }));
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		await userEvent.keyboard('im{Escape}');

		expect(page.getByRole('dialog', { name: 'Inventory' }).elements()).toHaveLength(0);
		expect(page.getByTestId('area-map-svg').elements()).toHaveLength(0);
		expect(page.getByRole('region', { name: 'Command' }).elements()).toHaveLength(0);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
	});

	it('ignores I and M while another overlay surface is open', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await userEvent.keyboard('{Escape}');
		const commandPanel = page.getByRole('region', { name: 'Command' });
		await expect.element(commandPanel).toBeVisible();

		await userEvent.keyboard('i');
		expect(page.getByRole('dialog', { name: 'Inventory' }).elements()).toHaveLength(0);
		await expect.element(commandPanel).toBeVisible();

		await page.getByRole('button', { name: 'Save', exact: true }).click();
		const saveDialog = page.getByRole('dialog', { name: /save/i });
		await expect.element(saveDialog).toBeVisible();

		await userEvent.keyboard('im');
		expect(page.getByRole('dialog', { name: 'Inventory' }).elements()).toHaveLength(0);
		expect(page.getByTestId('area-map-svg').elements()).toHaveLength(0);
		await expect.element(saveDialog).toBeVisible();
	});

	it('ignores repeated and modified Escape, I, and M presses', async () => {
		render(GameShell);
		emitHudState(baseHudState());
		await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();

		for (const init of [
			{ key: 'Escape', repeat: true },
			{ key: 'Escape', ctrlKey: true },
			{ key: 'Escape', metaKey: true },
			{ key: 'Escape', altKey: true },
			{ key: 'Escape', shiftKey: true },
			{ key: 'i', repeat: true },
			{ key: 'i', ctrlKey: true },
			{ key: 'i', metaKey: true },
			{ key: 'i', altKey: true },
			{ key: 'I', shiftKey: true },
			{ key: 'm', repeat: true },
			{ key: 'm', ctrlKey: true },
			{ key: 'm', metaKey: true },
			{ key: 'm', altKey: true },
			{ key: 'M', shiftKey: true }
		]) {
			window.dispatchEvent(
				new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })
			);
		}

		expect(page.getByRole('region', { name: 'Command' }).elements()).toHaveLength(0);
		expect(page.getByRole('dialog', { name: 'Inventory' }).elements()).toHaveLength(0);
		expect(page.getByTestId('area-map-svg').elements()).toHaveLength(0);
	});

	it('ignores hotkeys while the event target is an editable field', async () => {
		render(GameShell);
		emitHudState(baseHudState());
		await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();

		const input = document.createElement('input');
		document.body.appendChild(input);
		const editable = document.createElement('div');
		editable.contentEditable = 'true';
		document.body.appendChild(editable);
		try {
			input.focus();
			await userEvent.keyboard('im{Escape}');
			expect(input.value).toBe('im');
			expect(page.getByRole('dialog', { name: 'Inventory' }).elements()).toHaveLength(0);
			expect(page.getByTestId('area-map-svg').elements()).toHaveLength(0);
			expect(page.getByRole('region', { name: 'Command' }).elements()).toHaveLength(0);

			editable.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'i', bubbles: true, cancelable: true })
			);
			editable.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'm', bubbles: true, cancelable: true })
			);
			expect(page.getByRole('dialog', { name: 'Inventory' }).elements()).toHaveLength(0);
			expect(page.getByTestId('area-map-svg').elements()).toHaveLength(0);
		} finally {
			input.remove();
			editable.remove();
		}
	});

	it('routes Escape to the dialogue close path without opening the command grid', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState({ dialogue: conversationDialogue('dialogue-escape-guard') }));
			await expect.element(page.getByRole('dialog', { name: 'Mira' })).toBeVisible();

			await userEvent.keyboard('{Escape}');

			expect(commands).toContainEqual({ type: 'dialogue-close' });
			expect(page.getByRole('region', { name: 'Command' }).elements()).toHaveLength(0);
			expect(commands).not.toContainEqual({ type: 'resume-game' });
		});
	});

	it('moves arrows through revealed dialogue choices like the pad does', async () => {
		updatePreferences({ textSpeed: 'instant' });
		render(GameShell);
		emitHudState(
			baseHudState({
				dialogue: {
					id: 'dialogue-choice-keys',
					npcId: 'npc-mira',
					speaker: 'Mira',
					line: 'What will you do?',
					lineIndex: 0,
					lineCount: 1,
					mode: 'choice',
					choices: [
						{ id: 'shop', label: 'Shop', kind: 'trade' },
						{ id: 'leave', label: 'Leave', kind: 'leave' }
					],
					canClose: true
				}
			})
		);
		const panel = page.getByRole('dialog', { name: 'Mira' });
		await expect.element(panel.getByRole('button', { name: 'Shop' })).toBeEnabled();

		const prevented: Record<string, boolean> = {};
		const listener = (event: Event) => {
			const key = (event as KeyboardEvent).key;
			if (key.startsWith('Arrow')) prevented[key] = (event as KeyboardEvent).defaultPrevented;
		};
		window.addEventListener('keydown', listener);

		try {
			await userEvent.keyboard('{ArrowDown}');
			await expect.element(panel.getByRole('button', { name: 'Shop' })).toHaveFocus();
			await expect
				.element(panel.getByRole('button', { name: 'Shop' }))
				.toHaveAttribute('data-selected', 'true');

			await userEvent.keyboard('{ArrowDown}');
			await expect.element(panel.getByRole('button', { name: 'Leave' })).toHaveFocus();

			await userEvent.keyboard('{ArrowUp}');
			await expect.element(panel.getByRole('button', { name: 'Shop' })).toHaveFocus();
		} finally {
			window.removeEventListener('keydown', listener);
		}

		// Even while routing the lattice, arrows stay swallowed (no Phaser).
		expect(prevented).toEqual({ ArrowDown: true, ArrowUp: true });
	});

	it('moves bag grid focus with arrow keys while the bag overlay is open', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				inventory: {
					consumables: [
						{
							itemId: 'potion-a',
							name: 'Potion A',
							description: 'Restores HP.',
							iconPath: '/icon.png',
							quantity: 1
						},
						{
							itemId: 'potion-b',
							name: 'Potion B',
							description: 'Restores HP.',
							iconPath: '/icon.png',
							quantity: 1
						},
						{
							itemId: 'potion-c',
							name: 'Potion C',
							description: 'Restores HP.',
							iconPath: '/icon.png',
							quantity: 1
						}
					],
					equipment: [],
					keyItems: [],
					equipped: { weapon: null, head: null, body: null, hands: null, accessory: null }
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Bag' }).click();
		const dialog = page.getByRole('dialog', { name: /inventory/i });
		await expect.element(dialog).toBeVisible();

		// Arrows drive the bag lattice (final review: they were command-grid only).
		await userEvent.keyboard('{ArrowDown}');
		await expect.element(page.getByRole('button', { name: 'Potion A' })).toHaveFocus();
		await userEvent.keyboard('{ArrowRight}');
		await expect.element(page.getByRole('button', { name: 'Potion B' })).toHaveFocus();
	});

	it('keeps arrow keys on the bag tab rail roving instead of grid-moving', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Bag' }).click();

		const potionsTab = page.getByRole('tab', { name: /potions/i });
		await potionsTab.click();
		await expect.element(potionsTab).toHaveFocus();

		await userEvent.keyboard('{ArrowRight}');
		await expect.element(page.getByRole('tab', { name: /gear/i })).toHaveFocus();
	});

	it('owns arrow keys during every dialogue mode so they never reach Phaser', async () => {
		// Conversation mode exposes no focusable lattice node (Next/Close are
		// bar prompts); the dialogue must still swallow arrows — Phaser treats
		// an un-prevented window keydown as movement input.
		render(GameShell);
		for (const mode of ['conversation', 'system', 'choice'] as const) {
			emitHudState(
				baseHudState({
					dialogue: {
						id: `dialogue-${mode}`,
						npcId: 'npc-mira',
						speaker: 'Mira',
						line: 'Welcome!',
						lineIndex: 0,
						lineCount: 1,
						mode,
						choices: mode === 'choice' ? [{ id: 'shop', label: 'Shop', kind: 'trade' }] : [],
						canClose: true
					}
				})
			);
			await expect.element(page.getByRole('dialog', { name: 'Mira' })).toBeVisible();

			const prevented: Record<string, boolean> = {};
			const listener = (event: Event) => {
				const key = (event as KeyboardEvent).key;
				if (key.startsWith('Arrow')) prevented[key] = (event as KeyboardEvent).defaultPrevented;
			};
			window.addEventListener('keydown', listener);
			try {
				// Choices stay disabled mid-reveal at normal speed — the hardest
				// case: no focusable node, focus sits on the panel itself.
				await userEvent.keyboard('{ArrowUp}{ArrowDown}{ArrowLeft}{ArrowRight}');
			} finally {
				window.removeEventListener('keydown', listener);
			}

			expect(prevented, `mode: ${mode}`).toEqual({
				ArrowUp: true,
				ArrowDown: true,
				ArrowLeft: true,
				ArrowRight: true
			});
		}
	});

	it('swallows held-arrow key repeats during dialogue so Phaser never sees them', async () => {
		// Phaser reads raw window keydowns; a held arrow repeats with
		// event.repeat=true and must stay prevented or the hero walks
		// mid-conversation. userEvent.keyboard cannot emit repeats, so this
		// dispatches the synthetic repeat event directly.
		render(GameShell);
		emitHudState(
			baseHudState({
				dialogue: {
					id: 'dialogue-conversation',
					npcId: 'npc-mira',
					speaker: 'Mira',
					line: 'Welcome!',
					lineIndex: 0,
					lineCount: 1,
					mode: 'conversation',
					choices: [],
					canClose: true
				}
			})
		);
		await expect.element(page.getByRole('dialog', { name: 'Mira' })).toBeVisible();

		for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
			const repeat = new KeyboardEvent('keydown', {
				key,
				repeat: true,
				bubbles: true,
				cancelable: true
			});
			window.dispatchEvent(repeat);
			expect(repeat.defaultPrevented, key).toBe(true);
		}
	});

	it('moves keyboard arrows along the Title cards', async () => {
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		// Pad directions already rove Title; keyboard arrows share the reducer.
		// Initial focus is the primary card (no save data → New Run, column 1).
		await userEvent.keyboard('{ArrowRight}');
		await expect.element(page.getByRole('button', { name: /system/i })).toHaveFocus();

		await userEvent.keyboard('{ArrowLeft}');
		await expect.element(page.getByRole('button', { name: /new run/i })).toHaveFocus();

		// Row edge: left of New Run is the disabled Continue — focus stays.
		await userEvent.keyboard('{ArrowLeft}');
		await expect.element(page.getByRole('button', { name: /new run/i })).toHaveFocus();
	});

	it('moves grid focus with arrow keys through resolveMenuFocusTarget', async () => {
		render(GameShell);
		emitHudState(baseHudState({ heals: 0 }));

		await page.getByRole('button', { name: /menu/i }).click();

		// Null current: arrows land on the first enabled tile.
		await userEvent.keyboard('{ArrowDown}');
		await expect.element(page.getByRole('button', { name: 'Bag' })).toHaveFocus();

		await userEvent.keyboard('{ArrowRight}');
		await expect.element(page.getByRole('button', { name: 'Gear' })).toHaveFocus();

		// Rest is disabled (heals: 0): down from Gear has no aligned cell, so
		// the uneven-grid fallback moves to the nearest enabled tile below —
		// Skill.
		await userEvent.keyboard('{ArrowDown}');
		await expect.element(page.getByRole('button', { name: 'Skill' })).toHaveFocus();

		// Right from Skill skips the disabled Rest tile and lands on Save.
		await userEvent.keyboard('{ArrowRight}');
		await expect.element(page.getByRole('button', { name: 'Save' })).toHaveFocus();

		// Edge stays on the current tile.
		await userEvent.keyboard('{ArrowRight}');
		await expect.element(page.getByRole('button', { name: 'System' })).toHaveFocus();
		await userEvent.keyboard('{ArrowRight}');
		await expect.element(page.getByRole('button', { name: 'System' })).toHaveFocus();
	});
});

describe('GameShell error handling', () => {
	it('shows error banner when game fails to load', async () => {
		const { createGame } = await import('$lib/game/phaser/createGame');
		vi.mocked(createGame).mockReset().mockRejectedValueOnce(new Error('test error'));

		render(GameShell);

		// Phaser mounts only after committing to a run from the Title screen.
		await page.getByRole('button', { name: /new run/i }).click();

		await expect.element(page.getByText(/unable to start the game shell/i)).toBeVisible();
	});
});

describe('GameShell system screen', () => {
	function focusedFocusId(): string | null {
		return document.activeElement instanceof Element
			? (document.activeElement.getAttribute('data-focus-id') ?? null)
			: null;
	}

	it('emits pause-game when the System overlay opens', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: /system/i }).click();
			await expect.element(page.getByRole('dialog', { name: /display & text/i })).toBeVisible();

			expect(commands).toContainEqual({ type: 'pause-game' });
		});
	});

	it('opens from the command menu and closes on Escape back to the System tile', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: /system/i }).click();

		const dialog = page.getByRole('dialog', { name: /display & text/i });
		await expect.element(dialog).toBeVisible();

		await userEvent.keyboard('{Escape}');

		expect(dialog.elements()).toHaveLength(0);
		const commandPanel = page.getByRole('region', { name: 'Command' });
		await expect.element(commandPanel).toBeVisible();
		await expect
			.element(commandPanel.getByRole('button', { name: 'System', exact: true }))
			.toHaveFocus();
	});

	it('steps keyboard focus down the settings rows with the density row removed', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: /system/i }).click();
		const dialog = page.getByRole('dialog', { name: /display & text/i });
		await expect.element(dialog).toBeVisible();

		// The density row is gone: Down walks the remaining four rows in order
		// (language → text speed → motion → prompts → sound) with no gap.
		await dialog.getByRole('button', { name: 'English' }).element().focus();
		await userEvent.keyboard('{ArrowDown}');
		expect(focusedFocusId()).toBe('system-speed-slow');
		await userEvent.keyboard('{ArrowDown}');
		expect(focusedFocusId()).toBe('system-motion-on');
		await userEvent.keyboard('{ArrowDown}');
		expect(focusedFocusId()).toBe('system-prompt-auto');
		await userEvent.keyboard('{ArrowDown}');
		expect(focusedFocusId()).toBe('system-sound-on');
	});
});

describe('GameShell title mode', () => {
	it('shows one Select hint and prologue captions on the title screen', async () => {
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		// One prompt only: the duplicate Enter hint is gone.
		const hints = Array.from(document.querySelectorAll<HTMLElement>('.title-hint'));
		expect(hints).toHaveLength(1);
		expect(hints[0]!.textContent).toContain('Select');

		// The pill and New Run subtitle read the prologue, not a stale chapter.
		expect(document.querySelector('.title-chapter-pill')?.textContent).toBe('Sundrop · Prologue');
		const newRunCard = page.getByRole('button', { name: /new run/i });
		await expect.element(newRunCard).toHaveTextContent('Prologue');
		expect(document.querySelector('.title-screen')?.textContent).not.toContain('Chapter I');
	});

	it('keeps the New Run confirmation below the action cards at every viewport', async () => {
		writeSaveSlot(0, { ...createSlotRecord(), kind: 'autosave' });
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		// HPA-841 visual contract: the confirmation never overlaps the cards at
		// desktop (1440×900), default (1280×720), or compact (640×360) sizes.
		for (const [width, height] of [
			[1440, 900],
			[1280, 720],
			[640, 360]
		] as const) {
			await page.viewport(width, height);
			window.scrollTo(0, 0);
			await page.getByRole('button', { name: /new run/i }).click();
			const confirm = page.getByRole('alertdialog');
			await expect.element(confirm).toBeVisible();
			// Let the title's heroic entrance settle so the measured rects are
			// the laid-out ones, not mid-animation frames.
			await new Promise((resolve) => setTimeout(resolve, 320));
			const confirmBox = (confirm.elements()[0] as HTMLElement).getBoundingClientRect();
			expect(
				confirmBox.top >= 0 &&
					confirmBox.left >= 0 &&
					confirmBox.bottom <= height &&
					confirmBox.right <= width,
				`confirm inside ${width}×${height}: ${JSON.stringify(confirmBox.toJSON())}`
			).toBe(true);

			const cardBoxes = Array.from(document.querySelectorAll<HTMLElement>('.title-card')).map(
				(card) => card.getBoundingClientRect()
			);
			expect(cardBoxes).toHaveLength(3);
			for (const card of cardBoxes) {
				const overlaps =
					confirmBox.left < card.right &&
					card.left < confirmBox.right &&
					confirmBox.top < card.bottom &&
					card.top < confirmBox.bottom;
				expect(
					overlaps,
					`confirm ${JSON.stringify(confirmBox.toJSON())} vs card ${JSON.stringify(card.toJSON())}`
				).toBe(false);
			}
			// Below the row, not above or beside it.
			expect(confirmBox.top).toBeGreaterThanOrEqual(
				Math.max(...cardBoxes.map((card) => card.bottom))
			);

			// Cancel so the next viewport raises a fresh confirmation.
			await userEvent.keyboard('{Escape}');
			await vi.waitFor(() => expect(page.getByRole('alertdialog').elements()).toHaveLength(0));
		}
	});

	it("names the Continue subtitle after the saved player's region", async () => {
		const door = anchorPoint('sundrop-grik-home-door');
		writeSaveSlot(0, {
			...createSlotRecord(),
			kind: 'autosave',
			playtimeSeconds: 100,
			state: {
				...createNewSaveState(),
				mapId: 'overworld',
				player: { ...createNewSaveState().player, x: door.x, y: door.y }
			}
		});
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: /continue/i }))
			.toHaveTextContent('Sundrop');
	});

	it('lands on Title without mounting Phaser and opens System straight from Title', async () => {
		render(GameShell);

		// No HUD state has arrived: the shell must stay on Title and Phaser must
		// not mount until the player commits to Continue / New Run.
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: /new run/i })).toBeVisible();
		await expect.element(page.getByRole('button', { name: /continue/i })).toBeDisabled();
		expect(document.querySelector('canvas')).toBeNull();

		// System is usable from Title without booting the game.
		await page.getByRole('button', { name: /system/i }).click();
		await expect.element(page.getByRole('dialog', { name: /display & text/i })).toBeVisible();
		expect(document.querySelector('canvas')).toBeNull();
		await page.getByRole('button', { name: /close/i }).click();

		// Committing to a run swaps Title for the game shell.
		await page.getByRole('button', { name: /new run/i }).click();
		await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();
		expect(page.getByRole('heading', { name: 'GLIESE' }).elements()).toHaveLength(0);
	});

	it('labels save slots with the active-locale area name, not the save-time one', async () => {
		updatePreferences({ locale: 'ja' });
		writeSaveSlot(1, createSlotRecord());
		render(GameShell);
		try {
			await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
			// The slot was written with an English locationLabel; the active
			// locale is ja, so the label must come from the map id.
			await expect.element(page.getByText(/グリクの家/)).toBeVisible();
		} finally {
			updatePreferences({ locale: 'en' });
		}
	});

	it('opens a Load picker on Continue and resumes the picked slot', async () => {
		writeSaveSlot(1, createSlotRecord());
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		await page.getByRole('button', { name: /continue/i }).click();

		// Continue must not boot the newest save directly: manual slots stay
		// unreachable without a picker (review finding 2).
		const loadDialog = page.getByRole('dialog', { name: /load/i });
		await expect.element(loadDialog).toBeVisible();
		expect(document.querySelector('canvas')).toBeNull();

		await loadDialog.getByTestId('save-slot-1').click();
		await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();
	});

	it('lets the Load picker reach an autosave slot too', async () => {
		writeSaveSlot(0, { ...createSlotRecord(), kind: 'autosave' });
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		await page.getByRole('button', { name: /continue/i }).click();
		const loadDialog = page.getByRole('dialog', { name: /load/i });
		await expect.element(loadDialog).toBeVisible();

		await loadDialog.getByTestId('save-slot-0').click();
		await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();
	});

	it('asks before overwriting the autosave on New Run', async () => {
		writeSaveSlot(0, { ...createSlotRecord(), kind: 'autosave' });
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		await page.getByRole('button', { name: /new run/i }).click();
		const confirm = page.getByRole('alertdialog');
		await expect.element(confirm).toBeVisible();
		expect(document.querySelector('canvas')).toBeNull();

		await confirm.getByTestId('confirm-new-run').click();
		await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();
	});

	it('starts a New Run without asking when no autosave exists', async () => {
		writeSaveSlot(1, createSlotRecord());
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		await page.getByRole('button', { name: /new run/i }).click();
		expect(page.getByRole('alertdialog').elements()).toHaveLength(0);
		await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();
	});

	it('New Run against an unreadable envelope confirms, discards, and unblocks saving', async () => {
		// A corrupt envelope whose forensic backup cannot be secured keeps the
		// write block armed; the title flow must clear it via the New Run
		// confirmation (review: only the storage primitive was tested).
		const values = new Map<string, string>([[SAVE_SLOTS_STORAGE_KEY, '{"version":4,"bad":true}']]);
		const blockedBackupStorage = {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => {
				if (key === SAVE_SLOTS_BACKUP_STORAGE_KEY) throw new Error('quota');
				values.set(key, value);
			},
			removeItem: (key: string) => void values.delete(key)
		};
		setSaveStorage(blockedBackupStorage);

		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
		expect(saveSlotsUnreadable(blockedBackupStorage)).toBe(true);

		await page.getByRole('button', { name: /new run/i }).click();
		const confirm = page.getByRole('alertdialog');
		await expect.element(confirm).toBeVisible();
		await confirm.getByTestId('confirm-new-run').click();
		await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();

		// The discard cleared the write block, so the run's autosaves land
		// instead of failing with only a console error.
		expect(saveSlotsUnreadable(blockedBackupStorage)).toBe(false);
		writeSaveSlot(0, { ...createSlotRecord(), kind: 'autosave' }, blockedBackupStorage);
		expect(loadSaveSlots(blockedBackupStorage).slots[0]?.kind).toBe('autosave');
	});

	it('restores focus to the System card after closing System from Title', async () => {
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		const systemCard = page.getByRole('button', { name: /system/i });
		await systemCard.click();
		const dialog = page.getByRole('dialog', { name: /display & text/i });
		await expect.element(dialog).toBeVisible();

		await page.getByRole('button', { name: /close/i }).click();
		expect(dialog.elements()).toHaveLength(0);
		// Final review: Title-mode System close used to drop focus to body.
		await expect.element(systemCard).toHaveFocus();
	});

	it('closes System opened from Title on Escape even after focus falls to body', async () => {
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		const systemCard = page.getByRole('button', { name: /system/i });
		await systemCard.click();
		const dialog = page.getByRole('dialog', { name: /display & text/i });
		await expect.element(dialog).toBeVisible();

		(document.activeElement as HTMLElement | null)?.blur();
		expect(document.activeElement).toBe(document.body);

		await userEvent.keyboard('{Escape}');
		expect(dialog.elements()).toHaveLength(0);
		await expect.element(systemCard).toHaveFocus();
	});

	it('keeps the three cards and prompts visible and non-overlapping at 640×360', async () => {
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		// The app's configured minimum window (tauri.conf.json).
		await page.viewport(640, 360);

		const selectors = [
			'[data-focus-id="title-continue"]',
			'[data-focus-id="title-new-run"]',
			'[data-focus-id="title-system"]',
			'.title-hints'
		];
		const rects = selectors.map((selector) => {
			const element = document.querySelector<HTMLElement>(selector);
			expect(element).not.toBeNull();
			return element!.getBoundingClientRect();
		});
		// Visible = laid out with a real box at this viewport (display:none or
		// clipped-away elements collapse to an empty rect).
		for (const [index, rect] of rects.entries()) {
			expect(rect.width, selectors[index]).toBeGreaterThan(0);
			expect(rect.height, selectors[index]).toBeGreaterThan(0);
		}
		for (const [_index, rect] of rects.entries()) {
			expect(rect.top).toBeGreaterThanOrEqual(0);
			expect(rect.left).toBeGreaterThanOrEqual(0);
			expect(rect.bottom).toBeLessThanOrEqual(360);
			expect(rect.right).toBeLessThanOrEqual(640);
		}

		const overlaps: string[] = [];
		for (let i = 0; i < rects.length; i += 1) {
			for (let j = i + 1; j < rects.length; j += 1) {
				const a = rects[i];
				const b = rects[j];
				if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
					overlaps.push(`${selectors[i]} overlaps ${selectors[j]}`);
				}
			}
		}
		expect(overlaps).toEqual([]);
	});

	it('flips from Title to playing when a ready HUD state arrives (direct boot)', async () => {
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		emitHudState(baseHudState());

		await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();
		expect(page.getByRole('heading', { name: 'GLIESE' }).elements()).toHaveLength(0);
	});
});

describe('GameShell pad layer', () => {
	let pads: Array<{ buttons: Array<{ pressed: boolean }>; axes: number[] }>;

	function installPadStub(padCount = 1) {
		pads = Array.from({ length: padCount }, () => ({
			buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
			axes: [0, 0]
		}));
		vi.stubGlobal('navigator', { getGamepads: () => pads });
	}

	function padFrames(count = 2): Promise<void> {
		return new Promise((resolve) => {
			const step = (remaining: number) =>
				remaining <= 0 ? resolve() : requestAnimationFrame(() => step(remaining - 1));
			step(count);
		});
	}

	async function press(buttonIndex: number, padIndex = 0) {
		const pad = pads[padIndex]!;
		pad.buttons[buttonIndex].pressed = true;
		await padFrames();
		pad.buttons[buttonIndex].pressed = false;
		await padFrames();
	}

	async function tiltAxis(x: number, y: number, padIndex = 0) {
		const pad = pads[padIndex]!;
		pad.axes = [x, y];
		await padFrames();
		pad.axes = [0, 0];
		await padFrames();
	}

	function focusedFocusId(): string | null {
		// Map markers are focusable SVG nodes, so this can't be an HTMLElement
		// check.
		return document.activeElement instanceof Element
			? (document.activeElement.getAttribute('data-focus-id') ?? null)
			: null;
	}

	it('menu button toggles the command grid', async () => {
		installPadStub();
		render(GameShell);
		emitHudState(baseHudState());

		await press(9);
		await expect.element(page.getByRole('button', { name: 'Bag' })).toBeVisible();

		await press(9);
		expect(page.getByRole('button', { name: 'Bag' }).elements()).toHaveLength(0);
	});

	it('maps battle pad buttons: A heals, B flees, X uses the item', async () => {
		installPadStub();
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(
				baseHudState({
					hp: 12,
					maxHp: 20,
					heals: 1,
					inventory: {
						consumables: [
							{
								itemId: 'field-potion',
								name: 'Field Potion',
								description: 'Restores HP.',
								iconPath: '/icon.png',
								quantity: 3
							}
						],
						equipment: [],
						keyItems: [],
						equipped: { weapon: null, head: null, body: null, hands: null, accessory: null }
					},
					battle: {
						phase: 'active',
						summary: null,
						active: {
							targetUnitId: 'encounter:unit:0',
							enemies: [
								{
									unitId: 'encounter:unit:0',
									enemyId: 'slime-scout',
									name: 'Slime Scout',
									hp: 5,
									maxHp: 8,
									defeated: false,
									artPath: '/game/assets/heroic-ui/enemies/forest-wolf.png'
								}
							],
							ribbon: [
								{ unitId: 'hero', readyAt: 0 },
								{ unitId: 'encounter:unit:0', readyAt: 200 }
							],
							feed: [],
							heals: 1,
							items: 3,
							flee: { status: 'idle', progress: 0 },
							now: 0
						}
					}
				})
			);
			await expect.element(page.getByTestId('battle-tile-heal')).toBeVisible();

			await press(0); // A (confirm) → Heal tile
			await press(1); // B (cancel) → Flee tile
			await press(2); // X (action) → Item tile

			expect(commands).toContainEqual({ type: 'heal' });
			expect(commands).toContainEqual({ type: 'battle-flee' });
			expect(commands).toContainEqual({ type: 'use-item', itemId: 'field-potion' });
		});
	});

	it('Start cannot raise the command grid behind an open dialogue', async () => {
		installPadStub();
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState({ dialogue: conversationDialogue('dialogue-start-guard') }));
			const panel = page.getByRole('dialog', { name: 'Mira' });
			await expect.element(panel).toBeVisible();

			await press(9);

			expect(commands).toEqual([]);
			expect(page.getByRole('button', { name: 'Bag' }).elements()).toHaveLength(0);
			await expect.element(panel).toBeVisible();
		});
	});

	it('drives the UI from a pad in a sparse gamepad slot', async () => {
		installPadStub();
		// Browsers pad disconnected slots with null (final-review finding 7).
		vi.stubGlobal('navigator', { getGamepads: () => [null, null, pads[0]] });
		render(GameShell);
		emitHudState(baseHudState());

		await press(9, 0);
		await expect.element(page.getByRole('button', { name: 'Bag' })).toBeVisible();
	});

	it('drives the UI from an active pad in slot 1 behind an idle pad in slot 0', async () => {
		installPadStub(2);
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState({ dialogue: conversationDialogue('dialogue-slot-1') }));
			const panel = page.getByRole('dialog', { name: 'Mira' });
			await expect.element(panel).toBeVisible();

			// Slot 0 sits idle the whole time; slot 1's confirm reveals, then
			// advances the dialogue (final review: find-first ignored it).
			await press(0, 1);
			await press(0, 1);

			expect(commands).toContainEqual({ type: 'dialogue-advance' });
		});
	});

	it('registers inputs from pads in slots 0 and 2 with a hole between', async () => {
		installPadStub(3);
		vi.stubGlobal('navigator', { getGamepads: () => [pads[0], null, pads[2]] });
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState({ dialogue: conversationDialogue('dialogue-two-pads') }));
			const panel = page.getByRole('dialog', { name: 'Mira' });
			await expect.element(panel).toBeVisible();

			// Slot 0 confirms the line through; slot 2's B closes it. Both
			// disconnected-slot-straddling pads must register.
			await press(0, 0);
			await press(0, 0);
			expect(commands).toContainEqual({ type: 'dialogue-advance' });

			await press(1, 2);
			expect(commands).toContainEqual({ type: 'dialogue-close' });
		});
	});

	it('opens the command grid on Pad A without auto-focusing a tile', async () => {
		installPadStub();
		render(GameShell);
		emitHudState(baseHudState());

		const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
		await expect.element(menuButton).toBeVisible();
		menuButton.element().focus();

		await press(0);
		await expect.element(page.getByRole('region', { name: 'Command' })).toBeVisible();
		expect(focusedFocusId() ?? '').not.toMatch(/^field-cmd-/);
		await expect.element(menuButton).toHaveFocus();
	});

	it('moves focus through the 4×2 command grid with the left stick', async () => {
		installPadStub();
		render(GameShell);
		emitHudState(baseHudState({ heals: 0 }));

		await press(9);
		// Null current: the first direction lands on the first enabled tile.
		await tiltAxis(0.8, 0);
		expect(focusedFocusId()).toBe('field-cmd-bag');

		await tiltAxis(0.8, 0);
		expect(focusedFocusId()).toBe('field-cmd-gear');

		// Rest below Gear is disabled (heals: 0): the fallback moves to the
		// nearest enabled tile below — Skill.
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('field-cmd-skill');

		// Up from Skill is aligned with Bag's column.
		await tiltAxis(0, -0.8);
		expect(focusedFocusId()).toBe('field-cmd-bag');

		await tiltAxis(0.8, 0);
		await tiltAxis(0.8, 0);
		expect(focusedFocusId()).toBe('field-cmd-quest');
	});

	it('moves through the 6-column bag grid with the left stick', async () => {
		installPadStub();
		render(GameShell);
		emitHudState(
			baseHudState({
				inventory: {
					consumables: Array.from({ length: 7 }, (_, index) => ({
						itemId: `potion-${index}`,
						name: `Potion ${index}`,
						description: 'Restores HP.',
						iconPath: '/icon.png',
						quantity: 1
					})),
					equipment: [],
					keyItems: [],
					equipped: { weapon: null, head: null, body: null, hands: null, accessory: null }
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Bag' }).click();
		await expect.element(page.getByTestId('inventory-slot-grid')).toBeVisible();

		await tiltAxis(0.8, 0);
		expect(focusedFocusId()).toBe('bag-slot-0');
		for (let column = 1; column <= 5; column += 1) {
			await tiltAxis(0.8, 0);
			expect(focusedFocusId()).toBe(`bag-slot-${column}`);
		}

		// Right edge stays on the last column; back left to column 0, then down
		// the column to the second-row item (bag-slot-6).
		await tiltAxis(0.8, 0);
		expect(focusedFocusId()).toBe('bag-slot-5');
		for (let column = 4; column >= 0; column -= 1) {
			await tiltAxis(-0.8, 0);
			expect(focusedFocusId()).toBe(`bag-slot-${column}`);
		}
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('bag-slot-6');
	});

	it('confirm invokes the bag detail action from the focus lattice', async () => {
		installPadStub();
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(
				baseHudState({
					inventory: {
						consumables: [
							{
								itemId: 'field-potion',
								name: 'Field Potion',
								description: 'Restores HP.',
								iconPath: '/icon.png',
								quantity: 3
							}
						],
						equipment: [],
						keyItems: [],
						equipped: { weapon: null, head: null, body: null, hands: null, accessory: null }
					}
				})
			);

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Bag' }).click();
			await expect.element(page.getByTestId('inventory-slot-grid')).toBeVisible();

			// Select the item row, then walk down to the A-labelled action.
			await tiltAxis(0, 0.8);
			expect(focusedFocusId()).toBe('bag-slot-0');
			await press(0);
			await tiltAxis(0, 0.8);
			expect(focusedFocusId()).toBe('bag-detail-action');
			await press(0);

			expect(commands).toContainEqual({ type: 'use-item', itemId: 'field-potion' });
		});
	});

	it('confirm invokes the shop Buy action from the focus lattice', async () => {
		installPadStub();
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(
				baseHudState({
					wallet: { coins: 30 },
					shop: {
						shopId: 'miras-item-shop',
						name: "Mira's Item Shop",
						merchantName: 'Mira',
						buy: [mockShopBuyEntry()],
						sell: []
					}
				})
			);
			await expect.element(page.getByTestId('shop-buy-grid')).toBeVisible();

			// Tabs → stock tile → (A selects) → detail action (A buys).
			await tiltAxis(0, 0.8);
			expect(focusedFocusId()).toBe('shop-tab-buy');
			await tiltAxis(0, 0.8);
			expect(focusedFocusId()).toBe('shop-buy-0');
			await press(0);
			await tiltAxis(0, 0.8);
			expect(focusedFocusId()).toBe('shop-detail-action');
			await press(0);

			expect(commands).toContainEqual({
				type: 'buy-shop-item',
				shopId: 'miras-item-shop',
				stockId: 'potion-stock'
			});
		});
	});

	it('directions move between area map markers laid out by geography', async () => {
		installPadStub();
		render(GameShell);
		emitHudState(
			baseHudState({
				areaMap: {
					...baseHudState().areaMap,
					markers: [
						{ id: 'guild-hall', kind: 'building', x: 1_536, y: 5_504, label: 'Guild Hall' },
						{
							id: 'ruins-gate',
							kind: 'quest',
							x: 2_048,
							y: 5_504,
							label: 'Ruins Gate',
							emphasis: true
						}
					]
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: /map/i }).click();
		await expect.element(page.getByTestId('area-map-svg')).toBeVisible();

		// Null current lands on the topmost marker (y-order); the two markers
		// share a height band, so right/left walks them by x-rank.
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('map-marker-guild-hall');
		await tiltAxis(0.8, 0);
		expect(focusedFocusId()).toBe('map-marker-ruins-gate');
		await tiltAxis(-0.8, 0);
		expect(focusedFocusId()).toBe('map-marker-guild-hall');
	});

	it('LB/RB cycles the bag category tabs', async () => {
		installPadStub();
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Bag' }).click();
		await expect.element(page.getByTestId('inventory-slot-grid')).toBeVisible();

		await press(5);
		await expect
			.element(page.getByRole('tab', { name: /gear/i }))
			.toHaveAttribute('aria-selected', 'true');

		await press(4);
		await expect
			.element(page.getByRole('tab', { name: /potions/i }))
			.toHaveAttribute('aria-selected', 'true');
	});

	it('confirm reveals/advances dialogue and cancel closes it', async () => {
		installPadStub();
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(
				baseHudState({
					dialogue: {
						id: 'dialogue-1',
						npcId: 'npc-mira',
						speaker: 'Mira',
						line: 'Welcome to the shop!',
						lineIndex: 0,
						lineCount: 1,
						mode: 'conversation',
						choices: [],
						canClose: true
					}
				})
			);
			const panel = page.getByRole('dialog', { name: 'Mira' });
			await expect.element(panel).toBeVisible();

			// First confirm reveals the typewriter line; second advances.
			await press(0);
			await press(0);
			expect(commands).toContainEqual({ type: 'dialogue-advance' });

			await press(1);
			expect(commands).toContainEqual({ type: 'dialogue-close' });
		});
	});

	it('left/right D-pad emits battle-cycle-target commands', async () => {
		installPadStub();
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(
				baseHudState({
					battle: {
						phase: 'active',
						summary: null,
						active: {
							targetUnitId: 'encounter:unit:0',
							enemies: [
								{
									unitId: 'encounter:unit:0',
									enemyId: 'slime-scout',
									name: 'Slime Scout',
									hp: 5,
									maxHp: 8,
									defeated: false,
									artPath: '/game/assets/heroic-ui/enemies/forest-wolf.png'
								}
							],
							ribbon: [
								{ unitId: 'hero', readyAt: 0 },
								{ unitId: 'encounter:unit:0', readyAt: 200 }
							],
							feed: [],
							heals: 1,
							items: 1,
							flee: { status: 'idle', progress: 0 },
							now: 0
						}
					}
				})
			);
			await expect.element(page.getByTestId('battle-hud')).toBeVisible();

			await press(14);
			await press(15);

			expect(commands).toContainEqual({ type: 'battle-cycle-target', direction: -1 });
			expect(commands).toContainEqual({ type: 'battle-cycle-target', direction: 1 });
		});
	});

	it('pad input flips Auto prompt glyphs to pad; a key flips them back', async () => {
		installPadStub();
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Bag' }).click();
		await expect.element(page.getByTestId('inventory-slot-grid')).toBeVisible();
		// Blur the auto-focused close button so the confirm press has no click target.
		(document.activeElement as HTMLElement | null)?.blur();

		const glyph = () =>
			document.querySelector<HTMLElement>('kbd[data-prompt]')?.getAttribute('data-prompt');
		expect(glyph()).toBe('keys');

		await press(0);
		expect(glyph()).toBe('pad');

		await userEvent.keyboard('{Shift}');
		expect(glyph()).toBe('keys');
	});

	it('polls in Title mode: stick moves card focus and confirm starts a run', async () => {
		installPadStub();
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		// Initial focus lands on the primary card (no save data → New Run).
		expect(focusedFocusId()).toBe('title-new-run');

		await tiltAxis(0.8, 0);
		expect(focusedFocusId()).toBe('title-system');

		// Left skips the disabled Continue card back to New Run.
		await tiltAxis(-0.8, 0);
		await tiltAxis(-0.8, 0);
		expect(focusedFocusId()).toBe('title-new-run');

		await press(0);
		await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();
		expect(page.getByRole('heading', { name: 'GLIESE' }).elements()).toHaveLength(0);
	});

	it('title focus columns match the visual card order when save data exists', async () => {
		installPadStub();
		writeSaveSlot(1, createSlotRecord());
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		// Visual row is [Continue | New Run | System]; Continue is primary.
		expect(focusedFocusId()).toBe('title-continue');

		// Right walks the row visually left-to-right: Continue → New Run → System.
		await tiltAxis(0.8, 0);
		expect(focusedFocusId()).toBe('title-new-run');
		await tiltAxis(0.8, 0);
		expect(focusedFocusId()).toBe('title-system');

		// Left from Continue hits the row edge — it must not reach New Run.
		document.querySelector<HTMLElement>('[data-focus-id="title-continue"]')?.focus();
		await tiltAxis(-0.8, 0);
		expect(focusedFocusId()).toBe('title-continue');

		// Left from System walks back through New Run to Continue.
		document.querySelector<HTMLElement>('[data-focus-id="title-system"]')?.focus();
		await tiltAxis(-0.8, 0);
		expect(focusedFocusId()).toBe('title-new-run');
		await tiltAxis(-0.8, 0);
		expect(focusedFocusId()).toBe('title-continue');
	});

	it('focuses the first Save slot card, navigates the cards, and confirms the slot', async () => {
		installPadStub();
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Save', exact: true }).click();
			const saveDialog = page.getByRole('dialog', { name: /save/i });
			await expect.element(saveDialog).toBeVisible();

			// Initial focus is the A-labelled slot card, not the Back control.
			expect(focusedFocusId()).toBe('save-slot-1');

			await tiltAxis(0.8, 0);
			expect(focusedFocusId()).toBe('save-slot-2');

			await tiltAxis(-0.8, 0);
			await press(0);
			expect(commands).toContainEqual({ type: 'save-slot', slot: 1 });
		});
	});

	it('moves pad focus across dialogue choice rows and confirms the focused choice', async () => {
		installPadStub();
		updatePreferences({ textSpeed: 'instant' });
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(
				baseHudState({
					dialogue: {
						id: 'dialogue-choices',
						npcId: 'npc-mira',
						speaker: 'Mira',
						line: 'What will you do?',
						lineIndex: 0,
						lineCount: 1,
						mode: 'choice',
						choices: [
							{ id: 'shop', label: 'Shop', kind: 'trade' },
							{ id: 'leave', label: 'Leave', kind: 'leave' }
						],
						canClose: true
					}
				})
			);
			const panel = page.getByRole('dialog', { name: 'Mira' });
			await expect.element(panel).toBeVisible();

			await tiltAxis(0, 0.8);
			expect(focusedFocusId()).toBe('dialogue-choice-0');
			await tiltAxis(0, 0.8);
			expect(focusedFocusId()).toBe('dialogue-choice-1');
			await expect
				.element(panel.getByRole('button', { name: 'Leave' }))
				.toHaveAttribute('data-selected', 'true');

			await press(0);
			expect(commands).toContainEqual({ type: 'dialogue-choose', choiceId: 'leave' });
		});
	});

	it('keeps pad focus inside the save overwrite alertdialog and routes B to its Back', async () => {
		installPadStub();
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState());

			await withSaveSlotWriter(async () => {
				await page.getByRole('button', { name: /menu/i }).click();
				await page.getByRole('button', { name: 'Save', exact: true }).click();
				const saveDialog = page.getByRole('dialog', { name: /save/i });
				await expect.element(saveDialog).toBeVisible();

				// Fill slot 1 — WorldScene defers the write to the post-render tick
				// and publishes HUD state when it lands — then re-pick it to raise
				// the overwrite alertdialog.
				await saveDialog.getByTestId('save-slot-1').click();
				emitHudState(baseHudState({ status: 'Saved.' }));
				await saveDialog.getByTestId('save-slot-1').click();
				const confirmButton = saveDialog.getByTestId('confirm-overwrite');
				await expect.element(confirmButton).toBeVisible();
				await expect.element(confirmButton).toHaveFocus();
				commands.length = 0;

				// Up must stay on the prompt — before the scope fix it fell through to
				// the save-slot-2 card hidden behind the scrim.
				await press(12);
				expect(focusedFocusId()).toBe('save-overwrite-confirm');

				// A activates the prompt's confirm (save-slot 1), never the covered
				// slot-2 card (which would emit save-slot 2).
				await press(0);
				expect(commands).toEqual([{ type: 'save-slot', slot: 1 }]);
				await expect.element(saveDialog.getByTestId('save-slot-1')).toHaveFocus();

				// Reopen the prompt: B routes to its Back, not the screen's closeSave.
				await saveDialog.getByTestId('save-slot-1').click();
				await expect.element(saveDialog.getByTestId('confirm-overwrite')).toBeVisible();
				await press(1);
				expect(saveDialog.getByTestId('confirm-overwrite').elements()).toHaveLength(0);
				await expect.element(saveDialog).toBeVisible();
				await expect.element(saveDialog.getByTestId('save-slot-1')).toHaveFocus();
			});
		});
	});

	it('tracks the shop grid’s 2-column short-landscape geometry for pad navigation at 640×360', async () => {
		installPadStub();
		await page.viewport(640, 360);
		render(GameShell);
		emitHudState(
			baseHudState({
				wallet: { coins: 30 },
				shop: {
					shopId: 'miras-item-shop',
					name: "Mira's Item Shop",
					merchantName: 'Mira',
					buy: Array.from({ length: 4 }, (_, index) => ({
						...mockShopBuyEntry(),
						stockId: `stock-${index}`,
						itemId: `item-${index}`,
						name: `Item ${index}`
					})),
					sell: []
				}
			})
		);
		await expect.element(page.getByTestId('shop-buy-grid')).toBeVisible();

		// At 640×360 the short-landscape shop stacks Buy above Sell and renders
		// 2 stock columns: Down from Buy visits Sell, then item 0, and item 2
		// sits directly below item 0 (4-column math would jump to the
		// nonexistent shop-buy-4 / stall).
		document.querySelector<HTMLElement>('[data-focus-id="shop-tab-buy"]')?.focus();
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('shop-tab-sell');
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('shop-buy-0');
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('shop-buy-2');

		// The detail action sits below the last tile's column; A selects the
		// last tile, then Down reaches it in the same 2-column geometry.
		document.querySelector<HTMLElement>('[data-focus-id="shop-buy-3"]')?.focus();
		await press(0);
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('shop-detail-action');
	});

	it('tracks the bag grid’s 2-column short-landscape geometry for pad navigation at 640×360', async () => {
		installPadStub();
		await page.viewport(640, 360);
		render(GameShell);
		emitHudState(
			baseHudState({
				inventory: {
					consumables: Array.from({ length: 5 }, (_, index) => ({
						itemId: `potion-${index}`,
						name: `Potion ${index}`,
						description: 'Restores HP.',
						iconPath: '/icon.png',
						quantity: 1
					})),
					equipment: [],
					keyItems: [],
					equipped: { weapon: null, head: null, body: null, hands: null, accessory: null }
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Bag' }).click();
		await expect.element(page.getByTestId('inventory-slot-grid')).toBeVisible();

		// At 640×360 the short-landscape bag renders 2 columns (6.6rem slot
		// width): item 2 sits directly below item 0 (wider-column math would
		// stall the Down move).
		document.querySelector<HTMLElement>('[data-focus-id="bag-slot-0"]')?.focus();
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('bag-slot-2');

		// The detail action sits below the last tile's column; A selects the
		// last slot, then Down reaches it in the same 2-column geometry.
		document.querySelector<HTMLElement>('[data-focus-id="bag-slot-4"]')?.focus();
		await press(0);
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('bag-detail-action');
	});

	it('tracks the command grid’s 2-column breakpoint at 640×600', async () => {
		installPadStub();
		await page.viewport(640, 600);
		render(GameShell);
		emitHudState(baseHudState());

		await press(9);
		// Tall narrow viewports render 2 columns: Quest sits directly below
		// Bag (4-column math would land on Skill instead).
		await tiltAxis(0.8, 0);
		expect(focusedFocusId()).toBe('field-cmd-bag');
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('field-cmd-quest');

		// Right still walks the rendered row: Bag → Gear.
		document.querySelector<HTMLElement>('[data-focus-id="field-cmd-bag"]')?.focus();
		await tiltAxis(0.8, 0);
		expect(focusedFocusId()).toBe('field-cmd-gear');
	});

	it('keeps the command grid’s independent 4-column layout at 640×559', async () => {
		installPadStub();
		await page.viewport(640, 559);
		render(GameShell);
		emitHudState(baseHudState());

		await press(9);
		// CommandGrid owns its own <=559px short rule (independent of the
		// compact HUD breakpoint): the 4×2 grid puts Skill directly below
		// Bag, where 2-column math would land on Quest.
		await tiltAxis(0.8, 0);
		expect(focusedFocusId()).toBe('field-cmd-bag');
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('field-cmd-skill');
	});

	it('stacks the manual Save slots into a column at 640×360', async () => {
		installPadStub();
		await withCommands(async (commands) => {
			await page.viewport(640, 360);
			render(GameShell);
			emitHudState(baseHudState());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Save', exact: true }).click();
			const saveDialog = page.getByRole('dialog', { name: /save/i });
			await expect.element(saveDialog).toBeVisible();
			expect(focusedFocusId()).toBe('save-slot-1');

			// Single-column stack: Right stalls at the row edge; Down reaches
			// slot 2 rendered underneath (horizontal coords inverted that).
			await tiltAxis(0.8, 0);
			expect(focusedFocusId()).toBe('save-slot-1');
			await tiltAxis(0, 0.8);
			expect(focusedFocusId()).toBe('save-slot-2');

			await tiltAxis(0, -0.8);
			expect(focusedFocusId()).toBe('save-slot-1');
			await press(0);
			expect(commands).toContainEqual({ type: 'save-slot', slot: 1 });
		});
	});

	it('stacks the Title cards into a column at 640×600', async () => {
		installPadStub();
		writeSaveSlot(1, createSlotRecord());
		await page.viewport(640, 600);
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		// Narrow + tall renders a vertical stack: Down walks Continue → New
		// Run → System, Right stalls on the single column.
		expect(focusedFocusId()).toBe('title-continue');
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('title-new-run');
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('title-system');
		await tiltAxis(0.8, 0);
		expect(focusedFocusId()).toBe('title-system');

		await tiltAxis(0, -0.8);
		expect(focusedFocusId()).toBe('title-new-run');
	});

	it('steps pad focus down the settings rows past the removed density row', async () => {
		installPadStub();
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: /system/i }).click();
		const dialog = page.getByRole('dialog', { name: /display & text/i });
		await expect.element(dialog).toBeVisible();

		await dialog.getByRole('button', { name: 'English' }).element().focus();
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('system-speed-slow');
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('system-motion-on');
		await tiltAxis(0, -0.8);
		expect(focusedFocusId()).toBe('system-speed-slow');
	});

	it('reorients the System rail horizontally at 640×600', async () => {
		installPadStub();
		await page.viewport(640, 600);
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		await page.getByRole('button', { name: /system/i }).click();
		const system = page.getByRole('dialog', { name: /display/i });
		await expect.element(system).toBeVisible();
		await expect
			.element(system.getByRole('tablist'))
			.toHaveAttribute('aria-orientation', 'horizontal');

		// Pad: Right/Left traverse the rail cards; Down drops into the settings
		// column below; Up returns.
		document.querySelector<HTMLElement>('[data-focus-id="system-rail-display"]')?.focus();
		await tiltAxis(0.8, 0);
		expect(focusedFocusId()).toBe('system-rail-audio');
		await tiltAxis(-0.8, 0);
		expect(focusedFocusId()).toBe('system-rail-display');
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('system-locale-en');
		await tiltAxis(0, -0.8);
		expect(focusedFocusId()).toBe('system-rail-display');

		// Keyboard roving follows the same axis: Right stays inside the rail,
		// Down falls through to the lattice and into the settings rows.
		await userEvent.keyboard('{ArrowRight}');
		expect(focusedFocusId()).toBe('system-rail-audio');
		await userEvent.keyboard('{ArrowLeft}');
		expect(focusedFocusId()).toBe('system-rail-display');
		await userEvent.keyboard('{ArrowDown}');
		expect(focusedFocusId()).toBe('system-locale-en');
	});

	it.each([
		{
			tile: 'gear',
			tilts: [[0.8, 0]],
			overlay: () => page.getByRole('dialog', { name: 'Inventory' })
		},
		{
			tile: 'quest',
			tilts: [
				[0.8, 0],
				[0.8, 0]
			],
			overlay: () => page.getByRole('dialog', { name: /quest log/i })
		},
		{
			tile: 'map',
			tilts: [
				[0.8, 0],
				[0.8, 0],
				[0.8, 0]
			],
			overlay: () => page.getByRole('dialog', { name: /map$/i })
		},
		{
			tile: 'skill',
			tilts: [[0, 0.8]],
			overlay: () => page.getByRole('dialog', { name: 'Skill' })
		},
		{
			tile: 'save',
			tilts: [
				[0.8, 0],
				[0.8, 0],
				[0, 0.8]
			],
			overlay: () => page.getByRole('dialog', { name: /save/i })
		},
		{
			tile: 'system',
			tilts: [
				[0.8, 0],
				[0.8, 0],
				[0.8, 0],
				[0, 0.8]
			],
			overlay: () => page.getByRole('dialog', { name: /display & text/i })
		}
	])(
		'B from a command-origin $tile overlay returns to the grid with its tile focused',
		async ({ tile, tilts, overlay }) => {
			installPadStub();
			render(GameShell);
			emitHudState(baseHudState());

			await press(9);
			await tiltAxis(0.8, 0);
			expect(focusedFocusId()).toBe('field-cmd-bag');
			for (const [x, y] of tilts) {
				await tiltAxis(x, y);
			}
			expect(focusedFocusId()).toBe(`field-cmd-${tile}`);

			await press(0);
			await expect.element(overlay()).toBeVisible();

			await press(1);
			expect(overlay().elements()).toHaveLength(0);
			await expect.element(page.getByRole('region', { name: 'Command' })).toBeVisible();
			expect(focusedFocusId()).toBe(`field-cmd-${tile}`);
		}
	);
});

describe('GameShell prompt glyph honesty', () => {
	function glyphTextIn(root: HTMLElement): string[] {
		return Array.from(root.querySelectorAll('kbd[data-prompt]')).map(
			(glyph) => `${glyph.getAttribute('data-prompt')}:${glyph.textContent}`
		);
	}

	it('keys mode shows honest keyboard glyphs on the Title hints', async () => {
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		const hints = document.querySelector<HTMLElement>('.title-hints');
		expect(glyphTextIn(hints!)).toEqual(['keys:↵']);
	});

	it('keys mode shows Enter on slot cards and Esc on Back; pad mode shows A/B', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		const saveDialog = page.getByRole('dialog', { name: /save/i });
		await expect.element(saveDialog).toBeVisible();

		const slotCard = saveDialog.getByTestId('save-slot-1').element() as HTMLElement;
		expect(glyphTextIn(slotCard)).toContain('keys:↵');
		const back = document.querySelector<HTMLElement>('.save-back')!;
		expect(glyphTextIn(back)).toEqual(['keys:Esc']);

		updatePreferences({ promptMode: 'pad' });
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(glyphTextIn(slotCard)).toContain('pad:A');
		expect(glyphTextIn(back)).toEqual(['pad:B']);
	});

	it('battle Heal shows the keyboard path that actually heals (Enter, not A)', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				battle: {
					phase: 'active',
					summary: null,
					active: {
						targetUnitId: 'encounter:unit:0',
						enemies: [
							{
								unitId: 'encounter:unit:0',
								enemyId: 'slime-scout',
								name: 'Slime Scout',
								hp: 5,
								maxHp: 8,
								defeated: false,
								artPath: '/game/assets/heroic-ui/enemies/forest-wolf.png'
							}
						],
						ribbon: [
							{ unitId: 'hero', readyAt: 0 },
							{ unitId: 'encounter:unit:0', readyAt: 200 }
						],
						feed: [],
						heals: 1,
						items: 1,
						flee: { status: 'idle', progress: 0 },
						now: 0
					}
				}
			})
		);
		const healTile = page.getByTestId('battle-tile-heal');
		await expect.element(healTile).toBeVisible();
		(healTile.element() as HTMLElement).focus();
		await expect.element(healTile).toHaveFocus();

		// The glyph names the honest binding — keyboard 'a' is a movement key,
		// and Enter on the focused tile really does heal.
		const glyph = document.querySelector<HTMLElement>(
			'[data-testid="battle-tile-heal"] kbd[data-prompt]'
		);
		expect(glyph?.getAttribute('data-prompt')).toBe('keys');
		expect(glyph?.textContent).toBe('↵');
		await withCommands(async (commands) => {
			await userEvent.keyboard('{Enter}');
			expect(commands).toContainEqual({ type: 'heal' });
		});
	});
});

describe('GameShell reduced motion', () => {
	it('saved preference=reduced stops field animations with the OS query unreduced', async () => {
		updatePreferences({ motion: 'reduced' });
		render(GameShell);
		emitHudState(baseHudState({ hp: 10, maxHp: 50 }));

		const shell = document.querySelector<HTMLElement>('.game-shell');
		expect(shell).not.toBeNull();
		expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false);
		expect(shell).toHaveClass(/heroic-motion-reduced/);

		// The low-HP pulse lives in app.css on a field surface — the global
		// class must silence it, not just the screens that used to opt in.
		const party = page.getByTestId('hud-party-panel');
		await expect.element(party).toHaveClass(/heroic-low-hp/);
		expect(getComputedStyle(party.element() as HTMLElement).animationName).toBe('none');
	});

	it('keeps the low-HP pulse with the preference On and no OS reduction', async () => {
		render(GameShell);
		emitHudState(baseHudState({ hp: 10, maxHp: 50 }));

		const shell = document.querySelector<HTMLElement>('.game-shell');
		expect(shell!.classList.contains('heroic-motion-reduced')).toBe(false);
		const party = page.getByTestId('hud-party-panel');
		await expect.element(party).toHaveClass(/heroic-low-hp/);
		expect(getComputedStyle(party.element() as HTMLElement).animationName).toBe(
			'heroic-danger-pulse'
		);
	});
});

describe('GameShell menu toggle placement', () => {
	it('keeps the Menu toggle visible with its device prompt glyph at desktop size', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
		await expect.element(menuButton).toBeVisible();
		await expect.element(menuButton).toHaveAttribute('aria-keyshortcuts', 'Escape');
		const glyph = menuButton.element().querySelector<HTMLElement>('.heroic-prompt-glyph');
		expect(glyph).not.toBeNull();
		expect(glyph!.getAttribute('aria-hidden')).not.toBe('true');
		expect(glyph!.parentElement!.getAttribute('aria-hidden')).toBe('true');
		expect(Number(getComputedStyle(menuButton.element()).opacity)).toBe(1);
	});

	it('gives the aria-hidden Menu glyph wrapper a real box so Esc cannot leak into the accessible name', async () => {
		await page.viewport(1280, 720);
		render(GameShell);
		emitHudState(baseHudState());

		// Native WKWebView inspection showed the Menu AXButton title as
		// `ESC MENU`: WebKit folds `display: contents` descendants into the
		// name computation even through aria-hidden. AreaMapScreen avoids the
		// leak because its glyph wrapper is inline-flex, a real box — the
		// Menu wrapper must make one too.
		const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
		await expect.element(menuButton).toBeVisible();

		const glyph = menuButton.element().querySelector<HTMLElement>('.heroic-prompt-glyph');
		expect(glyph).not.toBeNull();
		expect(glyph!.textContent?.trim()).toBe('Esc');
		const wrapper = glyph!.parentElement!;
		expect(wrapper.classList.contains('menu-glyph')).toBe(true);
		expect(wrapper.getAttribute('aria-hidden')).toBe('true');
		expect(getComputedStyle(wrapper).display).not.toBe('contents');

		const glyphBox = glyph!.getBoundingClientRect();
		expect(glyphBox.width).toBeGreaterThan(0);
		expect(glyphBox.height).toBeGreaterThan(0);
		const wrapperBox = wrapper.getBoundingClientRect();
		expect(wrapperBox.width).toBeGreaterThan(0);
		expect(wrapperBox.height).toBeGreaterThan(0);
		expect(wrapperBox.left).toBeLessThanOrEqual(glyphBox.left);
		expect(wrapperBox.top).toBeLessThanOrEqual(glyphBox.top);
		expect(wrapperBox.right).toBeGreaterThanOrEqual(glyphBox.right);
		expect(wrapperBox.bottom).toBeGreaterThanOrEqual(glyphBox.bottom);
	});

	it.each([{ width: 560 }, { width: 480 }] as const)(
		'hides the Menu glyph wrapper box at $width px wide so no empty flex gap remains',
		async ({ width }) => {
			await page.viewport(width, 640);
			render(GameShell);
			emitHudState(baseHudState());

			const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
			await expect.element(menuButton).toBeVisible();
			const wrapper = menuButton.element().querySelector<HTMLElement>('.menu-glyph');
			expect(wrapper).not.toBeNull();
			// An inline-flex wrapper would stay an empty flex item under the
			// glyph's own display:none and leave a stray 0.55rem gap; hiding
			// the wrapper removes the box entirely.
			expect(getComputedStyle(wrapper!).display).toBe('none');
			expect(wrapper!.getClientRects().length).toBe(0);
			const glyph = wrapper!.querySelector<HTMLElement>('.heroic-prompt-glyph');
			expect(glyph!.getClientRects().length).toBe(0);
		}
	);

	it.each(
		(
			[
				{ width: 833, height: 560 },
				{ width: 832, height: 560 },
				{ width: 640, height: 560 },
				{ width: 640, height: 559 }
			] as const
		).flatMap((viewport) =>
			(['en', 'zh-Hant', 'ja'] as const).map((locale) => ({
				...viewport,
				locale,
				promptMode: 'pad' as const
			}))
		)
	)(
		'does not intersect the compact field HUD cards at $width×$height ($locale/$promptMode), prompt glyph included',
		async ({ width, height, locale, promptMode }) => {
			updatePreferences({ locale, promptMode });
			await page.viewport(width, height);
			render(GameShell);
			emitHudState(baseHudState({ quests: { main: mockMainQuest(), completed: [], total: 1 } }));

			const menuButton = page.getByRole('button', { name: t(locale, 'ui.menu'), exact: true });
			await expect.element(menuButton).toBeVisible();
			expect(Number(getComputedStyle(menuButton.element()).opacity)).toBeGreaterThan(0);

			// Every viewport in this matrix is under 720px tall: compact mode
			// removes the minimap box entirely rather than shrinking it.
			const minimap = page.getByTestId('hud-minimap').element() as HTMLElement;
			expect(getComputedStyle(minimap).display).toBe('none');
			expect(minimap.getClientRects().length).toBe(0);

			const glyph = menuButton.element().querySelector<HTMLElement>('.heroic-prompt-glyph');
			expect(glyph).not.toBeNull();
			expect(glyph!.textContent?.trim()).toBe(promptMode === 'pad' ? 'Start' : 'Esc');
			const glyphBox = glyph!.getBoundingClientRect();
			expect(glyphBox.width).toBeGreaterThan(0);
			expect(glyphBox.height).toBeGreaterThan(0);
			expect(Number(getComputedStyle(glyph!).opacity)).toBeGreaterThan(0);

			const menuBox = menuButton.element().getBoundingClientRect();
			const union = {
				left: Math.min(menuBox.left, glyphBox.left),
				right: Math.max(menuBox.right, glyphBox.right),
				top: Math.min(menuBox.top, glyphBox.top),
				bottom: Math.max(menuBox.bottom, glyphBox.bottom)
			};
			const surfaces = [
				{ id: 'hud-side-panel', element: page.getByTestId('hud-side-panel').element() },
				{ id: 'hud-party-panel', element: page.getByTestId('hud-party-panel').element() },
				{
					id: 'quest-banner',
					element: document.querySelector<HTMLElement>('.quest-banner')
				},
				{
					id: 'wallet-pill',
					element: document.querySelector<HTMLElement>('.wallet-pill')
				}
			];
			for (const surface of surfaces) {
				expect(surface.element, surface.id).not.toBeNull();
				const box = (surface.element as HTMLElement).getBoundingClientRect();
				const intersects = !(
					union.right <= box.left ||
					union.left >= box.right ||
					union.bottom <= box.top ||
					union.top >= box.bottom
				);
				expect(
					intersects,
					`${surface.id} ${JSON.stringify(box)} vs menu union ${JSON.stringify(union)}`
				).toBe(false);
			}

			// The compact side HUD anchors below the actual Menu chip: the old
			// top:.75rem pin collided once the minimap left the column.
			const sideHudBox = (
				page.getByTestId('hud-side-panel').element() as HTMLElement
			).getBoundingClientRect();
			expect(
				union.bottom,
				`menu union ${JSON.stringify(union)} vs side HUD ${JSON.stringify(sideHudBox)}`
			).toBeLessThanOrEqual(sideHudBox.top);
		}
	);
});

describe('GameShell compact HUD layout (HPA-840)', () => {
	function rectOf(element: HTMLElement): DOMRect {
		return element.getBoundingClientRect();
	}

	function rectsIntersect(a: DOMRect, b: DOMRect): boolean {
		return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
	}

	function compactSurfaces() {
		return {
			party: page.getByTestId('hud-party-panel').element() as HTMLElement,
			menuAnchor: document.querySelector<HTMLElement>('.jrpg-menu-anchor')!,
			sideHud: page.getByTestId('hud-side-panel').element() as HTMLElement,
			questBanner: document.querySelector<HTMLElement>('.quest-banner')!,
			wallet: document.querySelector<HTMLElement>('.wallet-pill')!,
			minimap: page.getByTestId('hud-minimap').element() as HTMLElement
		};
	}

	it.each(
		(
			[
				{ width: 640, height: 360 },
				{ width: 640, height: 559 },
				{ width: 640, height: 560 },
				{ width: 832, height: 560 },
				{ width: 833, height: 560 },
				{ width: 640, height: 719 },
				{ width: 832, height: 719 },
				{ width: 1280, height: 719 },
				{ width: 390, height: 650 }
			] as const
		).flatMap((viewport) =>
			(['en', 'ja', 'zh-Hant'] as const).map((locale) => ({ ...viewport, locale }))
		)
	)(
		'lays out the compact HUD below the Menu chip at $width×$height ($locale)',
		async ({ width, height, locale }) => {
			updatePreferences({ locale });
			await page.viewport(width, height);
			render(GameShell);
			emitHudState(baseHudState({ quests: { main: mockMainQuest(), completed: [], total: 1 } }));

			await expect.element(page.getByTestId('hud-party-panel')).toBeVisible();
			await expect.element(page.getByTestId('hud-side-panel')).toBeVisible();
			const { party, menuAnchor, sideHud, questBanner, wallet, minimap } = compactSurfaces();

			// Compact mode drops the minimap, the XP meter, and the stat row
			// entirely: no leftover boxes to collide with.
			expect(getComputedStyle(minimap).display).toBe('none');
			expect(minimap.getClientRects().length).toBe(0);
			expect(party.querySelector<HTMLElement>('.hero-stats')!.getClientRects().length).toBe(0);
			const xpMeter = Array.from(party.querySelectorAll<HTMLElement>('.hero-meter')).find((meter) =>
				meter.querySelector('.hero-meter-label-xp')
			)!;
			expect(xpMeter.getClientRects().length).toBe(0);

			// The hero name is the card's only accessible identification string:
			// clipped to a 1px box, never display:none.
			const heroName = party.querySelector<HTMLElement>('.hero-name')!;
			expect(heroName.getClientRects().length).toBeGreaterThan(0);
			expect(heroName.getBoundingClientRect().width).toBeLessThanOrEqual(1);
			expect(getComputedStyle(heroName).display).not.toBe('none');

			// The level badge is likewise visually hidden but keeps its
			// accessible level string (the sr-only "LV n" inside it).
			const levelBadge = party.querySelector<HTMLElement>('.hero-level')!;
			expect(levelBadge.getBoundingClientRect().width).toBeLessThanOrEqual(1);
			expect(getComputedStyle(levelBadge).display).not.toBe('none');
			expect(levelBadge.querySelector('.sr-only')?.textContent).toContain('1');

			// The compact tracker shows only the current objective — no eyebrow
			// or quest title line.
			expect(
				document.querySelector<HTMLElement>('.quest-banner-eyebrow')!.getClientRects().length
			).toBe(0);
			expect(questBanner.querySelector('h2')!.getClientRects().length).toBe(0);
			expect(
				questBanner.querySelector<HTMLElement>('.quest-banner-objective')!.getClientRects().length
			).toBeGreaterThan(0);

			// Every visible compact surface stays inside the viewport.
			const named = [
				['party', party],
				['menu', menuAnchor],
				['sideHud', sideHud],
				['questBanner', questBanner],
				['wallet', wallet]
			] as const;
			for (const [id, element] of named) {
				const rect = rectOf(element);
				expect(rect.width, `${id} width`).toBeGreaterThan(0);
				expect(rect.height, `${id} height`).toBeGreaterThan(0);
				expect(rect.top, `${id} top`).toBeGreaterThanOrEqual(0);
				expect(rect.left, `${id} left`).toBeGreaterThanOrEqual(0);
				expect(
					rect.bottom,
					`${id} bottom ${JSON.stringify(rect)} vs ${width}×${height}`
				).toBeLessThanOrEqual(height);
				expect(
					rect.right,
					`${id} right ${JSON.stringify(rect)} vs ${width}×${height}`
				).toBeLessThanOrEqual(width);
			}

			// Menu sits above the side HUD and clear of every card.
			const pairs = [
				['menu', menuAnchor, 'sideHud', sideHud],
				['menu', menuAnchor, 'party', party],
				['menu', menuAnchor, 'questBanner', questBanner],
				['menu', menuAnchor, 'wallet', wallet],
				['party', party, 'sideHud', sideHud]
			] as const;
			for (const [idA, a, idB, b] of pairs) {
				expect(rectsIntersect(rectOf(a), rectOf(b)), `${idA} vs ${idB} at ${width}×${height}`).toBe(
					false
				);
			}
			expect(rectOf(menuAnchor).bottom).toBeLessThanOrEqual(rectOf(sideHud).top);

			// CSS/TypeScript agreement: heroCardZone() tracks the rendered
			// compact card plus its intended minimal margin — never the stale
			// 412×240 desktop box. Measured on the full viewport×locale matrix:
			// card right edge 254.39 (slack 9.6), bottom 84.38 (slack 11.6, which
			// also covers the level badge's ~6px overhang below the card edge).
			const zone = heroCardZone(width, height);
			const cardBox = rectOf(party);
			expect(zone.width, `zone width vs ${JSON.stringify(cardBox)}`).toBeGreaterThanOrEqual(
				cardBox.right
			);
			expect(zone.height, `zone height vs ${JSON.stringify(cardBox)}`).toBeGreaterThanOrEqual(
				cardBox.bottom
			);
			expect(zone.width - cardBox.right, 'right-edge slack').toBeLessThanOrEqual(16);
			expect(zone.height - cardBox.bottom, 'bottom-edge slack').toBeLessThanOrEqual(16);
		}
	);

	it.each([
		// CommandGrid keeps its independent breakpoints: <=559px tall renders
		// the 4×2 grid, the 560–719 band (and tall portrait) renders 2×4.
		{ width: 640, height: 559, columns: 4 },
		{ width: 640, height: 560, columns: 2 },
		{ width: 640, height: 600, columns: 2 },
		{ width: 640, height: 719, columns: 2 },
		{ width: 640, height: 720, columns: 2 },
		{ width: 390, height: 650, columns: 2 }
	])(
		'renders the opened command menu in $columns columns at $width×$height',
		async ({ width, height, columns }) => {
			await page.viewport(width, height);
			render(GameShell);
			emitHudState(baseHudState({ quests: { main: mockMainQuest(), completed: [], total: 1 } }));
			await expect.element(page.getByRole('button', { name: 'Menu' })).toBeVisible();
			await page.getByRole('button', { name: 'Menu' }).click();
			const commandMenu = page.getByRole('region', { name: 'Command' });
			await expect.element(commandMenu).toBeVisible();

			const tiles = commandMenu.getByRole('button').elements() as HTMLElement[];
			expect(tiles.length).toBe(8);
			const tops = tiles.map((tile) => tile.getBoundingClientRect().top);
			const rowZero = tops.filter((top) => Math.abs(top - tops[0]) < 2);
			expect(rowZero.length, `first-row tile count ${JSON.stringify(tops)}`).toBe(columns);

			// Pad focus geometry must mirror the rendered grid: Quest is
			// index 2 → row 0 col 2 in 4 columns, row 1 col 0 in 2 columns.
			const quest = tiles.find((tile) => tile.dataset.focusId === 'field-cmd-quest')!;
			expect(quest.dataset.focusColumn).toBe(columns === 4 ? '2' : '0');
			expect(quest.dataset.focusRow).toBe(columns === 4 ? '0' : '1');
		}
	);

	it.each([
		{ width: 640, height: 360 },
		{ width: 390, height: 559 },
		{ width: 500, height: 400 },
		{ width: 640, height: 600 },
		{ width: 390, height: 650 }
	])(
		'keeps the opened command menu onscreen and clear of the compact HUD at $width×$height',
		async ({ width, height }) => {
			await page.viewport(width, height);
			render(GameShell);
			emitHudState(baseHudState({ quests: { main: mockMainQuest(), completed: [], total: 1 } }));
			await expect.element(page.getByRole('button', { name: 'Menu' })).toBeVisible();

			await page.getByRole('button', { name: 'Menu' }).click();
			const commandMenu = page.getByRole('region', { name: 'Command' });
			await expect.element(commandMenu).toBeVisible();

			const menuRect = (commandMenu.element() as HTMLElement).getBoundingClientRect();
			expect(menuRect.width).toBeGreaterThan(0);
			expect(menuRect.height).toBeGreaterThan(0);
			expect(menuRect.top, `menu top ${JSON.stringify(menuRect)}`).toBeGreaterThanOrEqual(0);
			expect(menuRect.left, `menu left ${JSON.stringify(menuRect)}`).toBeGreaterThanOrEqual(0);
			expect(menuRect.bottom, `menu bottom ${JSON.stringify(menuRect)}`).toBeLessThanOrEqual(
				height
			);
			expect(menuRect.right, `menu right ${JSON.stringify(menuRect)}`).toBeLessThanOrEqual(width);

			const others = [
				['party', page.getByTestId('hud-party-panel').element() as HTMLElement],
				['menuChip', document.querySelector<HTMLElement>('.jrpg-menu-anchor')!],
				['sideHud', page.getByTestId('hud-side-panel').element() as HTMLElement]
			] as const;
			for (const [id, element] of others) {
				expect(
					rectsIntersect(menuRect, rectOf(element)),
					`command menu vs ${id} at ${width}×${height}`
				).toBe(false);
			}

			// Every tile keeps a real onscreen box (clipped-away tiles hang
			// pointer input in the real shell, which clips overflow).
			for (const button of commandMenu.getByRole('button').elements() as HTMLElement[]) {
				const tile = button.getBoundingClientRect();
				expect(tile.width).toBeGreaterThan(0);
				expect(tile.bottom).toBeLessThanOrEqual(height);
				expect(tile.right).toBeLessThanOrEqual(width);
			}
		}
	);

	it.each([{ width: 390, height: 559 }])(
		'keeps every command tile and icon inside the menu frame and clear of the side HUD at $width×$height',
		async ({ width, height }) => {
			// Architecture review: at 390×559 the 13.5rem side-HUD reserve left
			// ~174px for four tiles — the outer menu rect still passed its
			// viewport gate while tile/icon content overflowed past its frame.
			await page.viewport(width, height);
			render(GameShell);
			emitHudState(baseHudState({ quests: { main: mockMainQuest(), completed: [], total: 1 } }));
			await page.getByRole('button', { name: 'Menu' }).click();
			const commandMenu = page.getByRole('region', { name: 'Command' });
			await expect.element(commandMenu).toBeVisible();

			const menuRect = (commandMenu.element() as HTMLElement).getBoundingClientRect();
			const tiles = commandMenu.getByRole('button').elements() as HTMLElement[];
			expect(tiles.length).toBe(8);
			for (const tile of tiles) {
				const tileRect = tile.getBoundingClientRect();
				expect(
					tileRect.left >= menuRect.left - 1 && tileRect.right <= menuRect.right + 1,
					`tile ${tile.dataset.focusId} inside menu x at ${width}×${height}: ${JSON.stringify(tileRect)} vs ${JSON.stringify(menuRect)}`
				).toBe(true);
				expect(
					tileRect.top >= menuRect.top - 1 && tileRect.bottom <= menuRect.bottom + 1,
					`tile ${tile.dataset.focusId} inside menu y at ${width}×${height}`
				).toBe(true);
				const icon = tile.querySelector<HTMLElement>('.heroic-cmd-icon')!;
				const iconRect = icon.getBoundingClientRect();
				expect(
					iconRect.left >= tileRect.left - 1 && iconRect.right <= tileRect.right + 1,
					`icon inside ${tile.dataset.focusId} at ${width}×${height}: ${JSON.stringify(iconRect)} vs ${JSON.stringify(tileRect)}`
				).toBe(true);
				// The label must not paint past its tile either.
				const label = tile.querySelector<HTMLElement>('.heroic-cmd-label')!;
				expect(
					label.scrollWidth <= label.clientWidth + 1,
					`label clipped inside ${tile.dataset.focusId} at ${width}×${height}`
				).toBe(true);
			}

			// The menu still cannot reach under the compact side HUD.
			const sideHud = page.getByTestId('hud-side-panel').element() as HTMLElement;
			expect(
				rectsIntersect(menuRect, rectOf(sideHud)),
				`command menu vs sideHud at ${width}×${height}`
			).toBe(false);
			expect(document.documentElement.scrollTop + document.body.scrollTop).toBe(0);
		}
	);

	it('keeps only the completed-prologue line when the tracker has no objective', async () => {
		await page.viewport(640, 360);
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: { main: null, completed: [mockCompletedQuest()], total: 1 }
			})
		);
		await expect.element(page.getByTestId('hud-side-panel')).toBeVisible();

		const questBanner = document.querySelector<HTMLElement>('.quest-banner')!;
		expect(questBanner).not.toBeNull();
		// The completed banner carries no objective line, so its heading (the
		// prologue-complete text) is the one string that stays visible.
		expect(questBanner.querySelector('.quest-banner-objective')).toBeNull();
		expect(questBanner.querySelector('h2')!.getClientRects().length).toBeGreaterThan(0);
		expect(questBanner.textContent).toContain(t('en', 'ui.prologueComplete'));
	});

	it('keeps every compact HUD rect onscreen, disjoint, and under a third of the 640×360 field', async () => {
		await page.viewport(640, 360);
		render(GameShell);
		emitHudState(baseHudState({ quests: { main: mockMainQuest(), completed: [], total: 1 } }));
		await expect.element(page.getByTestId('hud-party-panel')).toBeVisible();

		// Distinct visible HUD/control rectangles only — wrappers already
		// represented by their children (side HUD, hud-top/hud-row) are skipped,
		// as is the removed minimap.
		const surfaces = [
			['hud-party-panel', page.getByTestId('hud-party-panel').element() as HTMLElement],
			['jrpg-menu-anchor', document.querySelector<HTMLElement>('.jrpg-menu-anchor')!],
			['quest-banner', document.querySelector<HTMLElement>('.quest-banner')!],
			['wallet-pill', document.querySelector<HTMLElement>('.wallet-pill')!],
			['field-status', document.querySelector<HTMLElement>('.heroic-field-status')!]
		] as const;
		const rects = surfaces.map(([id, element]) => [id, rectOf(element)] as const);
		for (const [id, rect] of rects) {
			expect(rect.width, `${id} width`).toBeGreaterThan(0);
			expect(rect.height, `${id} height`).toBeGreaterThan(0);
			expect(rect.top, `${id} top`).toBeGreaterThanOrEqual(0);
			expect(rect.left, `${id} left`).toBeGreaterThanOrEqual(0);
			expect(rect.bottom, `${id} bottom ${JSON.stringify(rect)}`).toBeLessThanOrEqual(360);
			expect(rect.right, `${id} right ${JSON.stringify(rect)}`).toBeLessThanOrEqual(640);
		}
		for (let i = 0; i < rects.length; i += 1) {
			for (let j = i + 1; j < rects.length; j += 1) {
				const [idA, a] = rects[i];
				const [idB, b] = rects[j];
				expect(
					rectsIntersect(a, b),
					`${idA} ${JSON.stringify(a)} overlaps ${idB} ${JSON.stringify(b)}`
				).toBe(false);
			}
		}
		const totalArea = rects.reduce((sum, [, rect]) => sum + rect.width * rect.height, 0);
		expect(totalArea).toBeLessThanOrEqual((640 * 360) / 3);
	});

	it('keeps the full desktop HUD at 1280×720', async () => {
		await page.viewport(1280, 720);
		render(GameShell);
		emitHudState(baseHudState({ quests: { main: mockMainQuest(), completed: [], total: 1 } }));

		await expect.element(page.getByTestId('hud-minimap')).toBeVisible();
		const party = page.getByTestId('hud-party-panel').element() as HTMLElement;
		expect(rectOf(party).width).toBeGreaterThan(300);
		expect(
			party.querySelector<HTMLElement>('.hero-name')!.getBoundingClientRect().width
		).toBeGreaterThan(1);
		expect(
			party.querySelector<HTMLElement>('.hero-stats')!.getClientRects().length
		).toBeGreaterThan(0);
		expect(
			document.querySelector<HTMLElement>('.quest-banner h2')!.getClientRects().length
		).toBeGreaterThan(0);
		// 720 is outside the compact breakpoint: the desktop occlusion zone.
		expect(heroCardZone(1280, 720)).toEqual({ width: 412, height: 240 });
	});

	it('keeps the narrow-portrait HUD at 390×844', async () => {
		await page.viewport(390, 844);
		render(GameShell);
		emitHudState(baseHudState({ quests: { main: mockMainQuest(), completed: [], total: 1 } }));

		await expect.element(page.getByTestId('hud-minimap')).toBeVisible();
		expect(
			document.querySelector<HTMLElement>('.quest-banner h2')!.getClientRects().length
		).toBeGreaterThan(0);
		const party = page.getByTestId('hud-party-panel').element() as HTMLElement;
		expect(
			party.querySelector<HTMLElement>('.hero-name')!.getBoundingClientRect().width
		).toBeGreaterThan(1);
	});

	it.each([
		// Height 719 stays compact at every width; height 720 hands off to
		// narrow-portrait (width <=832) or desktop (width >=833). These pin
		// the same CSS boundaries heroCardZone() implements.
		{ width: 640, height: 719, mode: 'compact', zone: { width: 264, height: 96 } },
		{ width: 832, height: 719, mode: 'compact', zone: { width: 264, height: 96 } },
		{ width: 1280, height: 719, mode: 'compact', zone: { width: 264, height: 96 } },
		{ width: 640, height: 720, mode: 'narrow', zone: { width: 326, height: 222 } },
		{ width: 832, height: 720, mode: 'narrow', zone: { width: 326, height: 222 } },
		{ width: 833, height: 720, mode: 'desktop', zone: { width: 412, height: 240 } },
		{ width: 1280, height: 720, mode: 'desktop', zone: { width: 412, height: 240 } }
	])(
		'switches $width×$height to the $mode card layout with the matching occlusion zone',
		async ({ width, height, mode, zone }) => {
			await page.viewport(width, height);
			render(GameShell);
			emitHudState(baseHudState({ quests: { main: mockMainQuest(), completed: [], total: 1 } }));

			await expect.element(page.getByTestId('hud-party-panel')).toBeVisible();
			const party = page.getByTestId('hud-party-panel').element() as HTMLElement;
			const minimap = page.getByTestId('hud-minimap').element() as HTMLElement;
			const heroName = party.querySelector<HTMLElement>('.hero-name')!;
			const heroStats = party.querySelector<HTMLElement>('.hero-stats')!;

			if (mode === 'compact') {
				expect(getComputedStyle(minimap).display).toBe('none');
				expect(minimap.getClientRects().length).toBe(0);
				expect(heroName.getBoundingClientRect().width).toBeLessThanOrEqual(1);
				expect(heroStats.getClientRects().length).toBe(0);
			} else {
				await expect.element(page.getByTestId('hud-minimap')).toBeVisible();
				expect(heroName.getBoundingClientRect().width).toBeGreaterThan(1);
				expect(heroStats.getClientRects().length).toBeGreaterThan(0);
			}

			// CSS/TypeScript agreement on both sides of the boundary.
			expect(heroCardZone(width, height)).toEqual(zone);
			const cardBox = rectOf(party);
			expect(zone.width).toBeGreaterThanOrEqual(cardBox.right);
			expect(zone.height).toBeGreaterThanOrEqual(cardBox.bottom);
		}
	);
});

describe('GameShell prologue end card and return to title', () => {
	function endCard() {
		return page.getByRole('dialog', { name: /end of the prologue/i });
	}

	function loadPicker() {
		return page.getByRole('dialog', { name: /load/i });
	}

	function makePads() {
		const pads = Array.from({ length: 1 }, () => ({
			buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
			axes: [0, 0]
		}));
		vi.stubGlobal('navigator', { getGamepads: () => pads });
		return pads;
	}

	function padFrames(count = 2): Promise<void> {
		return new Promise((resolve) => {
			const step = (remaining: number) =>
				remaining <= 0 ? resolve() : requestAnimationFrame(() => step(remaining - 1));
			step(count);
		});
	}

	async function bootPlaying() {
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
		emitHudState(baseHudState());
		await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();
	}

	it('keeps the initial ready-boot promotion working before any return', async () => {
		const createGameMock = vi.mocked(createGame);
		const callsBefore = createGameMock.mock.calls.length;

		await bootPlaying();

		await vi.waitFor(() => expect(createGameMock.mock.calls.length).toBe(callsBefore + 1));
	});

	it('shows the completion card and returns to a refreshed Title that ignores late ready emits', async () => {
		const createGameMock = vi.mocked(createGame);
		writeSaveSlot(0, {
			...createSlotRecord(),
			kind: 'autosave',
			playtimeSeconds: 100,
			state: { ...createNewSaveState(), mapId: 'hero-house' }
		});
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: /continue/i }))
			.toHaveTextContent("Grik's House");
		await expect
			.element(page.getByRole('button', { name: /continue/i }))
			.toHaveTextContent('0:01:40');

		// The existing embedded-harness boot: a ready emit promotes to playing.
		emitHudState(baseHudState());
		await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();

		// The finished run's terminal autosave lands while the card is up.
		writeSaveSlot(0, {
			...createSlotRecord(),
			kind: 'autosave',
			playtimeSeconds: 555,
			state: { ...createNewSaveState(), mapId: 'overworld' }
		});
		emitPrologueEnd({ success: true });

		const card = endCard();
		await expect.element(card).toBeVisible();
		await expect.element(page.getByText('Thank you for playing')).toBeVisible();
		await expect.element(card).toHaveFocus();

		await userEvent.keyboard('{Enter}');

		// Title returns with the refreshed Continue subtitle, not the boot-time one.
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: /continue/i }))
			.toHaveTextContent('The Wilds');
		await expect
			.element(page.getByRole('button', { name: /continue/i }))
			.toHaveTextContent('0:09:15');
		expect(endCard().elements()).toHaveLength(0);

		// The stale run payload was reset: the shell reads not-ready on Title.
		expect(get(hudState).ready).toBe(false);

		// A late ready emit from the dying scene must not remount the old run.
		const callsBefore = createGameMock.mock.calls.length;
		emitHudState(baseHudState());
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
		expect(page.getByRole('button', { name: /menu/i }).elements()).toHaveLength(0);
		expect(createGameMock.mock.calls.length).toBe(callsBefore);
	});

	it('a held Enter press dismisses once, and its release cannot open Load or reactivate Title', async () => {
		await bootPlaying();
		emitPrologueEnd({ success: true });
		const card = endCard();
		await expect.element(card).toBeVisible();

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
		expect(loadPicker().elements()).toHaveLength(0);

		// The key is still held: repeats must not re-trigger anything.
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true }));
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true }));

		// The release must be consumed, not left to click the focused Title card.
		const release = new KeyboardEvent('keyup', { key: 'Enter', cancelable: true });
		window.dispatchEvent(release);
		expect(release.defaultPrevented).toBe(true);
		expect(loadPicker().elements()).toHaveLength(0);
		expect(endCard().elements()).toHaveLength(0);
	});

	it('a trusted Space press/release cannot dismiss the card and then click the focused Title card', async () => {
		await bootPlaying();
		emitPrologueEnd({ success: true });
		const card = endCard();
		await expect.element(card).toBeVisible();

		// userEvent produces trusted input: the release fires real default
		// actions over whatever is focused — the Title Continue card by now.
		await userEvent.keyboard('{Space}');

		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
		expect(loadPicker().elements()).toHaveLength(0);
		expect(endCard().elements()).toHaveLength(0);
	});

	it('a pad confirm dismisses the card once and cannot then re-trigger Title', async () => {
		const pads = makePads();
		await bootPlaying();
		emitPrologueEnd({ success: true });
		const card = endCard();
		await expect.element(card).toBeVisible();

		pads[0]!.buttons[0]!.pressed = true;
		await padFrames();
		pads[0]!.buttons[0]!.pressed = false;
		await padFrames();

		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
		expect(loadPicker().elements()).toHaveLength(0);
		await padFrames();
		expect(loadPicker().elements()).toHaveLength(0);
		expect(endCard().elements()).toHaveLength(0);
	});

	it('blocks Escape, I, M and pad Menu while the completion card is visible', async () => {
		const pads = makePads();
		await bootPlaying();
		emitPrologueEnd({ success: true });
		const card = endCard();
		await expect.element(card).toBeVisible();

		await userEvent.keyboard('{Escape}');
		await userEvent.keyboard('{I}');
		await userEvent.keyboard('{M}');
		pads[0]!.buttons[9]!.pressed = true;
		await padFrames();
		pads[0]!.buttons[9]!.pressed = false;
		await padFrames();

		await expect.element(card).toBeVisible();
		expect(page.getByRole('button', { name: 'Bag' }).elements()).toHaveLength(0);
		expect(document.querySelector('.bag-rail')).toBeNull();
		expect(document.querySelector('[data-focus-id^="field-command-"]')).toBeNull();

		// The terminal autosave's completion publish lands while the card is up:
		// field/menu input stays blocked even after the final flush.
		emitHudState(baseHudState({ status: 'Saved' }));
		await userEvent.keyboard('{Escape}');
		await userEvent.keyboard('{I}');
		pads[0]!.buttons[9]!.pressed = true;
		await padFrames();
		pads[0]!.buttons[9]!.pressed = false;
		await padFrames();

		await expect.element(card).toBeVisible();
		expect(page.getByRole('button', { name: 'Bag' }).elements()).toHaveLength(0);
		expect(document.querySelector('.bag-rail')).toBeNull();
		expect(document.querySelector('[data-focus-id^="field-command-"]')).toBeNull();
	});

	it('reports a failed terminal save on the card and still returns to Title', async () => {
		await bootPlaying();
		emitPrologueEnd({ success: false });

		const card = endCard();
		await expect.element(card).toBeVisible();
		await expect.element(page.getByText('Could not save')).toBeVisible();

		await card.click();
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
		expect(endCard().elements()).toHaveLength(0);
	});

	it('describes the card for screen readers: heading named, dismiss hint described', async () => {
		await bootPlaying();

		emitPrologueEnd({ success: true });
		const card = endCard();
		await expect.element(card).toBeVisible();
		const surface = card.elements()[0] as HTMLElement;
		expect(surface.getAttribute('aria-labelledby')).toBe('prologue-end-heading');
		// The dismiss hint is a described-by reference, so it is read with the
		// dialog name instead of only being visible text.
		expect(surface.getAttribute('aria-describedby')?.split(' ')).toEqual(['prologue-end-hint']);
		expect(document.getElementById('prologue-end-heading')).not.toBeNull();
		expect(document.getElementById('prologue-end-hint')).not.toBeNull();
	});

	it('announces a failed terminal save through the described-by warning', async () => {
		await bootPlaying();

		emitPrologueEnd({ success: false });
		const card = endCard();
		await expect.element(card).toBeVisible();
		await expect.element(page.getByText('Could not save')).toBeVisible();
		const failed = (card.elements()[0] as HTMLElement).getAttribute('aria-describedby') ?? '';
		expect(failed.split(' ')).toEqual(['prologue-end-warning', 'prologue-end-hint']);
		expect(document.getElementById('prologue-end-warning')).not.toBeNull();
	});

	it('Continue from the refreshed Title loads the finished run without repeating the card', async () => {
		const createGameMock = vi.mocked(createGame);
		writeSaveSlot(0, {
			...createSlotRecord(),
			kind: 'autosave',
			playtimeSeconds: 555,
			state: {
				...createNewSaveState(),
				mapId: 'overworld',
				quests: questStateAt(null)
			}
		});
		await bootPlaying();
		emitPrologueEnd({ success: true });
		await expect.element(endCard()).toBeVisible();
		await userEvent.keyboard('{Enter}');
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		await page.getByRole('button', { name: /continue/i }).click();
		const callsBefore = createGameMock.mock.calls.length;
		const picker = loadPicker();
		await expect.element(picker).toBeVisible();
		await picker.getByTestId('save-slot-0').click();

		// Playing again on the finished save: no card replay.
		await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();
		await vi.waitFor(() => expect(createGameMock.mock.calls.length).toBe(callsBefore + 1));
		expect(endCard().elements()).toHaveLength(0);
		expect(page.getByRole('heading', { name: 'GLIESE' }).elements()).toHaveLength(0);
	});

	it('closes an overlay already open when completion arrives and traps Tab on the card', async () => {
		await bootPlaying();

		// The finding's concrete case: the Bag is open when the terminal
		// autosave completes and the completion signal lands. Its controls
		// must not survive behind the card.
		await userEvent.keyboard('i');
		const inventory = page.getByRole('dialog', { name: 'Inventory' });
		await expect.element(inventory).toBeVisible();
		const bagClose = document.querySelector<HTMLElement>('.bag-rail-close')!;
		bagClose.focus();
		await expect.element(bagClose).toHaveFocus();

		emitPrologueEnd({ success: true });

		const card = endCard();
		await expect.element(card).toBeVisible();
		// The overlay is gone — no controls left to focus or activate behind
		// the card (local arrow handlers and native activation included).
		expect(inventory.elements()).toHaveLength(0);
		expect(document.querySelector('.bag-rail')).toBeNull();
		await expect.element(card).toHaveFocus();

		// Tab in either direction cannot rove to anything behind the card.
		await userEvent.keyboard('{Tab}');
		await expect.element(card).toHaveFocus();
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
		await expect.element(card).toHaveFocus();
	});
});

describe('HPA-841 visual geometry at three viewports', () => {
	const GEOMETRY_VIEWPORTS = [
		[1440, 900],
		[1280, 720],
		[640, 360]
	] as const;

	// Entrance animations (heroic-anim, 280ms) must settle before measuring.
	async function settleEntrance() {
		await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
		await new Promise((resolve) => setTimeout(resolve, 320));
	}

	function intersects(a: DOMRect, b: DOMRect): boolean {
		return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
	}

	function insideViewport(r: DOMRect, width: number, height: number): boolean {
		return r.top >= 0 && r.left >= 0 && r.bottom <= height && r.right <= width;
	}

	it('keeps the end card full-bleed with visible, non-overlapping copy at every viewport', async () => {
		render(GameShell);
		emitHudState(baseHudState());
		emitPrologueEnd({ success: true });
		const card = page.getByRole('dialog', { name: /end of the prologue/i });
		await expect.element(card).toBeVisible();

		// Visual reference: the spec's card diagram (heading over thanks over
		// hint on a full-screen scrim), not a mockup.
		for (const [width, height] of GEOMETRY_VIEWPORTS) {
			await page.viewport(width, height);
			window.scrollTo(0, 0);
			await settleEntrance();

			// The card surface covers the whole viewport (full-bleed scrim).
			const cardRect = (card.elements()[0] as HTMLElement).getBoundingClientRect();
			expect(cardRect.left, `card left at ${width}×${height}`).toBeLessThanOrEqual(0);
			expect(cardRect.top, `card top at ${width}×${height}`).toBeLessThanOrEqual(0);
			expect(cardRect.right, `card right at ${width}×${height}`).toBeGreaterThanOrEqual(width);
			expect(cardRect.bottom, `card bottom at ${width}×${height}`).toBeGreaterThanOrEqual(height);

			// Every copy line renders inside the viewport.
			const heading = document.getElementById('prologue-end-heading');
			const thanks = document.querySelector<HTMLElement>('.prologue-end-thanks');
			const hint = document.querySelector<HTMLElement>('.prologue-end-hint');
			expect(heading, 'card heading').not.toBeNull();
			expect(thanks, 'card thanks').not.toBeNull();
			expect(hint, 'card hint').not.toBeNull();
			for (const [name, el] of [
				['heading', heading!],
				['thanks', thanks!],
				['hint', hint!]
			] as const) {
				expect(
					insideViewport(el.getBoundingClientRect(), width, height),
					`${name} inside ${width}×${height}: ${JSON.stringify(el.getBoundingClientRect().toJSON())}`
				).toBe(true);
			}

			// The stacked copy lines never overlap each other.
			expect(
				intersects(heading!.getBoundingClientRect(), thanks!.getBoundingClientRect()),
				'heading vs thanks'
			).toBe(false);
			expect(
				intersects(thanks!.getBoundingClientRect(), hint!.getBoundingClientRect()),
				'thanks vs hint'
			).toBe(false);
		}
	});

	it('keeps the localized seven-quest journal unclipped at every viewport', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: mockMainQuest({
						objectiveId: 'collect-herb-pouch',
						objective: 'Collect the herb pouch from Mira.'
					}),
					completed: [],
					total: 7
				}
			})
		);

		// Open once in en; the journal retranslates live across the locale loop
		// (the Menu chip's label localizes too, so per-iteration reopening is
		// not locale-safe).
		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Quest', exact: true }).click();
		const questDialog = page.getByRole('dialog', { name: /quest log/i });
		await expect.element(questDialog).toBeVisible();

		for (const locale of ['en', 'ja', 'zh-Hant'] as const) {
			updatePreferences({ locale });
			// The checklist retranslates with the active locale: one row per
			// main quest, the localized first-quest title visible in en/ja/zh-Hant.
			const firstTitle = {
				en: 'The Proving Morning',
				ja: '第一の試練：足跡',
				'zh-Hant': '試煉之晨'
			}[locale];
			for (const [width, height] of GEOMETRY_VIEWPORTS) {
				await page.viewport(width, height);
				window.scrollTo(0, 0);
				await settleEntrance();

				// The dialog's accessible name localizes, so resolve the surface
				// by class for the non-en iterations.
				const screen = document.querySelector<HTMLElement>('.quest-screen')!;
				const screenRect = screen.getBoundingClientRect();
				expect(
					insideViewport(screenRect, width, height),
					`quest screen inside ${width}×${height} (${locale}): ${JSON.stringify(screenRect.toJSON())}`
				).toBe(true);

				// The seven-row checklist renders with no horizontal clipping in
				// the localized titles: every row fits its box and the viewport.
				const panel = page.getByTestId('quest-chapter-progress');
				await expect.element(panel).toBeVisible();
				await expect.element(panel.getByText(firstTitle)).toBeVisible();
				const rows = page.getByTestId('quest-progress-row').elements();
				expect(rows, `rows at ${width}×${height} (${locale})`).toHaveLength(7);
				for (const [index, row] of rows.entries()) {
					const el = row as HTMLElement;
					expect(
						el.scrollWidth <= el.clientWidth + 1,
						`row ${index} not clipped at ${width}×${height} (${locale}): scrollWidth ${el.scrollWidth} vs clientWidth ${el.clientWidth}`
					).toBe(true);
					expect(
						el.getBoundingClientRect().right <= width,
						`row ${index} inside ${width}×${height} (${locale})`
					).toBe(true);
				}

				// The rail's Close control stays reachable at every size: below
				// 900px the journal scrolls as a column, so reachability (what a
				// click performs) is the contract, mirroring the battle plates.
				const close = document.querySelector<HTMLElement>('.quest-rail-close')!;
				close.scrollIntoView({ block: 'nearest' });
				expect(
					insideViewport(close.getBoundingClientRect(), width, height),
					`close reachable at ${width}×${height} (${locale}): ${JSON.stringify(close.getBoundingClientRect().toJSON())}`
				).toBe(true);

				// The panel shows the chain progress (0% on a fresh run).
				await expect.element(panel.getByText('0%')).toBeVisible();
			}
		}

		await userEvent.keyboard('{Escape}');
		await vi.waitFor(() =>
			expect(page.getByTestId('quest-chapter-progress').elements()).toHaveLength(0)
		);
		updatePreferences({ locale: 'en' });
	});
});

describe('HPA-840 overlay containment on small viewports', () => {
	function insideViewport(r: DOMRect, width: number, height: number): boolean {
		return r.top >= 0 && r.left >= 0 && r.bottom <= height + 1 && r.right <= width + 1;
	}

	function expectDocumentUnscrolled() {
		expect(document.documentElement.scrollTop).toBe(0);
		expect(document.body.scrollTop).toBe(0);
	}

	// Fraction of the element's rect still visible after intersecting every
	// ancestor clip context (overflow auto/scroll/hidden/clip) and the
	// viewport — getBoundingClientRect alone misses ancestor clipping.
	function unclippedFraction(el: HTMLElement): number {
		const rect = el.getBoundingClientRect();
		const area = rect.width * rect.height;
		if (area <= 0) return 0;
		let x1 = rect.left;
		let y1 = rect.top;
		let x2 = rect.right;
		let y2 = rect.bottom;
		for (let anc = el.parentElement; anc; anc = anc.parentElement) {
			const s = getComputedStyle(anc);
			if (!/(auto|scroll|hidden|clip)/.test(`${s.overflowX} ${s.overflowY}`)) continue;
			const cr = anc.getBoundingClientRect();
			const cl = cr.left + anc.clientLeft;
			const ct = cr.top + anc.clientTop;
			x1 = Math.max(x1, cl);
			y1 = Math.max(y1, ct);
			x2 = Math.min(x2, cl + anc.clientWidth);
			y2 = Math.min(y2, ct + anc.clientHeight);
		}
		x1 = Math.max(x1, 0);
		y1 = Math.max(y1, 0);
		x2 = Math.min(x2, window.innerWidth);
		y2 = Math.min(y2, window.innerHeight);
		return (Math.max(0, x2 - x1) * Math.max(0, y2 - y1)) / area;
	}

	function expectUnclipped(el: HTMLElement, label: string) {
		expect(
			unclippedFraction(el),
			`${label} clipped (rect ${JSON.stringify(el.getBoundingClientRect().toJSON())})`
		).toBeGreaterThan(0.95);
	}

	// Whether the element's click point (rect center) survives ancestor clip
	// contexts and the viewport — the honest gate for scroll-content controls
	// taller than their panel, which can never reach ≥0.95 area visibility.
	function centerVisible(el: HTMLElement): boolean {
		const r = el.getBoundingClientRect();
		const cx = r.left + r.width / 2;
		const cy = r.top + r.height / 2;
		if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) return false;
		for (let anc = el.parentElement; anc; anc = anc.parentElement) {
			const s = getComputedStyle(anc);
			if (!/(auto|scroll|hidden|clip)/.test(`${s.overflowX} ${s.overflowY}`)) continue;
			const cr = anc.getBoundingClientRect();
			const cl = cr.left + anc.clientLeft;
			const ct = cr.top + anc.clientTop;
			if (cx < cl || cx > cl + anc.clientWidth || cy < ct || cy > ct + anc.clientHeight) {
				return false;
			}
		}
		return true;
	}

	function expectCenterVisible(el: HTMLElement, label: string) {
		expect(
			centerVisible(el),
			`${label} center clipped (rect ${JSON.stringify(el.getBoundingClientRect().toJSON())})`
		).toBe(true);
	}

	async function openFieldCommand(name: string | RegExp) {
		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name }).click();
	}

	it('keeps .save-slots overflow visible on desktop so the autosave halo and hover lift are unclipped', async () => {
		await page.viewport(1920, 1080);
		render(GameShell);
		emitHudState(baseHudState());

		await openFieldCommand('Save');
		const saveDialog = page.getByRole('dialog', { name: /save/i });
		await expect.element(saveDialog).toBeVisible();
		const slots = (saveDialog.element() as HTMLElement).querySelector<HTMLElement>('.save-slots')!;
		const style = getComputedStyle(slots);
		expect(style.overflowX).toBe('visible');
		expect(style.overflowY).toBe('visible');
	});

	it('keeps the Save header and footer pinned while the slot list scrolls at 640×360', async () => {
		await page.viewport(640, 360);
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState());

			await openFieldCommand('Save');
			const saveDialog = page.getByRole('dialog', { name: /save/i });
			await expect.element(saveDialog).toBeVisible();
			const screen = saveDialog.element() as HTMLElement;
			const header = screen.querySelector<HTMLElement>('.save-header')!;
			const footer = screen.querySelector<HTMLElement>('.save-footer')!;
			const slots = screen.querySelector<HTMLElement>('.save-slots')!;
			expect(insideViewport(header.getBoundingClientRect(), 640, 360)).toBe(true);
			expect(insideViewport(footer.getBoundingClientRect(), 640, 360)).toBe(true);

			// The slot grid is the scroller — not the screen or the document.
			expect(slots.scrollHeight).toBeGreaterThan(slots.clientHeight);
			slots.scrollTop = slots.scrollHeight;
			expect(slots.scrollTop).toBeGreaterThan(0);

			// Slot 3 scrolls into view while title, Back, and footer stay onscreen.
			const lastSlot = saveDialog.getByTestId('save-slot-2');
			expect(insideViewport(lastSlot.element().getBoundingClientRect(), 640, 360)).toBe(true);
			expect(insideViewport(header.getBoundingClientRect(), 640, 360)).toBe(true);
			expect(insideViewport(footer.getBoundingClientRect(), 640, 360)).toBe(true);
			expectDocumentUnscrolled();

			await lastSlot.click();
			expect(commands).toContainEqual({ type: 'save-slot', slot: 2 });
		});
	});

	it('keeps the overwrite confirmation inside the viewport at 640×360', async () => {
		await page.viewport(640, 360);
		render(GameShell);
		emitHudState(baseHudState());

		await openFieldCommand('Save');
		const saveDialog = page.getByRole('dialog', { name: /save/i });
		await expect.element(saveDialog).toBeVisible();
		const slots = (saveDialog.element() as HTMLElement).querySelector<HTMLElement>('.save-slots')!;
		slots.scrollTop = slots.scrollHeight;

		await withSaveSlotWriter(async () => {
			await saveDialog.getByTestId('save-slot-1').click();
			emitHudState(baseHudState({ status: 'Saved.' }));
			await saveDialog.getByTestId('save-slot-1').click();
			const confirm = saveDialog.getByTestId('confirm-overwrite');
			await expect.element(confirm).toBeVisible();
			expect(insideViewport(confirm.element().getBoundingClientRect(), 640, 360)).toBe(true);
			await confirm.click();
		});
	});

	it.each([
		[640, 360],
		[390, 844]
	])(
		'keeps the Load picker chrome pinned while the last slot scrolls into view at %d×%d',
		async (width, height) => {
			writeSaveSlot(0, { ...createSlotRecord(), kind: 'autosave' });
			writeSaveSlot(1, {
				...createSlotRecord(),
				state: { ...createNewSaveState(), mapId: 'hero-house' }
			});
			writeSaveSlot(2, {
				...createSlotRecord(),
				state: { ...createNewSaveState(), mapId: 'overworld' }
			});
			await page.viewport(width, height);
			render(GameShell);
			await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

			await page.getByRole('button', { name: /continue/i }).click();
			const loadDialog = page.getByRole('dialog', { name: /load/i });
			await expect.element(loadDialog).toBeVisible();
			const screen = loadDialog.element() as HTMLElement;
			const header = screen.querySelector<HTMLElement>('.save-header')!;
			const slots = screen.querySelector<HTMLElement>('.save-slots')!;
			expect(insideViewport(header.getBoundingClientRect(), width, height)).toBe(true);

			expect(slots.scrollHeight).toBeGreaterThan(slots.clientHeight);
			slots.scrollTop = slots.scrollHeight;
			expect(slots.scrollTop).toBeGreaterThan(0);

			const lastSlot = loadDialog.getByTestId('save-slot-2');
			expect(insideViewport(lastSlot.element().getBoundingClientRect(), width, height)).toBe(true);
			expect(insideViewport(header.getBoundingClientRect(), width, height)).toBe(true);
			expectDocumentUnscrolled();

			const createGameCallsBefore = vi.mocked(createGame).mock.calls.length;
			await lastSlot.click();
			await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();

			// The resumed run must carry the final slot's state — identical
			// records would let an off-by-one load slip through.
			await vi.waitFor(() => {
				const calls = vi.mocked(createGame).mock.calls;
				expect(calls.length).toBeGreaterThan(createGameCallsBefore);
				expect(calls.at(-1)?.[1]).toMatchObject({
					reason: 'resume',
					saveState: { mapId: 'overworld' }
				});
			});
		}
	);

	it.each([
		[640, 360],
		[1280, 640]
	])(
		'keeps the System header and rail pinned while the last option scrolls into view at %d×%d',
		async (width, height) => {
			await page.viewport(width, height);
			render(GameShell);
			emitHudState(baseHudState());

			await openFieldCommand(/system/i);
			const dialog = page.getByRole('dialog', { name: /display & text/i });
			await expect.element(dialog).toBeVisible();
			const screen = dialog.element() as HTMLElement;
			const header = screen.querySelector<HTMLElement>('.system-header')!;
			const rail = screen.querySelector<HTMLElement>('.heroic-rail')!;
			const rows = screen.querySelector<HTMLElement>('.heroic-rows')!;
			expect(insideViewport(header.getBoundingClientRect(), width, height)).toBe(true);
			expect(insideViewport(rail.getBoundingClientRect(), width, height)).toBe(true);

			// The settings rows scroll inside their own panel.
			expect(rows.scrollHeight).toBeGreaterThan(rows.clientHeight);
			rows.scrollTop = rows.scrollHeight;
			expect(rows.scrollTop).toBeGreaterThan(0);

			const soundOff = dialog.getByRole('button', { name: 'Off', exact: true });
			expect(insideViewport(soundOff.element().getBoundingClientRect(), width, height)).toBe(true);
			expect(insideViewport(header.getBoundingClientRect(), width, height)).toBe(true);
			expect(insideViewport(rail.getBoundingClientRect(), width, height)).toBe(true);
			expectDocumentUnscrolled();

			await soundOff.click();
			await expect.element(soundOff).toHaveAttribute('aria-pressed', 'true');
		}
	);

	it.each([
		[640, 360],
		[1920, 1080]
	])(
		'keeps the area map header pinned while the legend scrolls inside the map body at %d×%d',
		async (width, height) => {
			await page.viewport(width, height);
			render(GameShell);
			emitHudState(
				baseHudState({
					areaMap: {
						...baseHudState().areaMap,
						markers: [
							{ id: 'guild-hall', kind: 'building', x: 1_536, y: 5_504, label: 'Guild Hall' }
						]
					}
				})
			);

			await openFieldCommand(/map/i);
			const mapDialog = page.getByRole('dialog', { name: /map$/i });
			await expect.element(mapDialog).toBeVisible();
			const windowEl = mapDialog.element() as HTMLElement;
			const header = windowEl.querySelector<HTMLElement>('.jrpg-area-map-header')!;
			const body = windowEl.querySelector<HTMLElement>('.jrpg-area-map-body')!;
			const legend = windowEl.querySelector<HTMLElement>('.jrpg-area-map-legend')!;
			const windowRect = windowEl.getBoundingClientRect();
			expect(insideViewport(windowRect, width, height)).toBe(true);
			expect(insideViewport(header.getBoundingClientRect(), width, height)).toBe(true);
			await expect.element(page.getByTestId('area-map-svg')).toBeVisible();

			// When the body overflows it scrolls inside the window; the legend
			// stays reachable without moving the header or the document.
			body.scrollTop = body.scrollHeight;
			expect(insideViewport(legend.getBoundingClientRect(), width, height)).toBe(true);
			expect(insideViewport(header.getBoundingClientRect(), width, height)).toBe(true);
			expectDocumentUnscrolled();

			await mapDialog.getByRole('img', { name: 'Guild Hall' }).click();
			await expect.element(page.getByTestId('area-map-selected')).toHaveTextContent('Guild Hall');
		}
	);

	it('fully reveals the final Save slot’s action glyph at the end of the slot scroll at 640×360', async () => {
		writeSaveSlot(0, { ...createSlotRecord(), kind: 'autosave' });
		writeSaveSlot(1, createSlotRecord());
		writeSaveSlot(2, createSlotRecord());
		await page.viewport(640, 360);
		render(GameShell);
		emitHudState(baseHudState());

		await openFieldCommand('Save');
		const saveDialog = page.getByRole('dialog', { name: /save/i });
		await expect.element(saveDialog).toBeVisible();
		const screen = saveDialog.element() as HTMLElement;
		const header = screen.querySelector<HTMLElement>('.save-header')!;
		const slots = screen.querySelector<HTMLElement>('.save-slots')!;

		// Scroll to the grid's actual end, not an intermediate position.
		slots.scrollTop = slots.scrollHeight;
		const clip = slots.getBoundingClientRect();
		expect(slots.scrollTop).toBeGreaterThan(0);
		expect(slots.scrollTop + slots.clientHeight).toBeGreaterThanOrEqual(slots.scrollHeight - 1);

		// The final slot's Enter-glyph prompt is fully inside the clip box
		// and the viewport — it can always be revealed, never stranded.
		const lastSlot = saveDialog.getByTestId('save-slot-2');
		const glyph = lastSlot.element().querySelector<HTMLElement>('.save-slot-prompt')!;
		expect(glyph).not.toBeNull();
		const glyphRect = glyph.getBoundingClientRect();
		const centerX = glyphRect.left + glyphRect.width / 2;
		const centerY = glyphRect.top + glyphRect.height / 2;
		expect(glyphRect.top, 'glyph top inside clip').toBeGreaterThanOrEqual(clip.top);
		expect(glyphRect.bottom, 'glyph bottom inside clip').toBeLessThanOrEqual(clip.bottom + 1);
		expect(insideViewport(glyphRect, 640, 360)).toBe(true);
		expect(
			document.elementFromPoint(centerX, centerY)?.closest('[data-testid="save-slot-2"]')
		).not.toBeNull();

		// Title/Back/footer stay pinned; the slot still operates — the
		// occupied slot raises the overwrite confirmation.
		expect(insideViewport(header.getBoundingClientRect(), 640, 360)).toBe(true);
		expectDocumentUnscrolled();
		await lastSlot.click();
		await expect.element(saveDialog.getByTestId('confirm-overwrite')).toBeVisible();
	});

	it('keeps the Skill header and body inside the window at 640×360', async () => {
		await page.viewport(640, 360);
		render(GameShell);
		emitHudState(baseHudState());

		await openFieldCommand('Skill');
		const skillDialog = page.getByRole('dialog', { name: 'Skill' });
		await expect.element(skillDialog).toBeVisible();
		const windowEl = skillDialog.element() as HTMLElement;
		const header = windowEl.querySelector<HTMLElement>('.skill-header')!;
		const empty = windowEl.querySelector<HTMLElement>('.skill-empty')!;
		expect(insideViewport(windowEl.getBoundingClientRect(), 640, 360)).toBe(true);
		expect(insideViewport(header.getBoundingClientRect(), 640, 360)).toBe(true);
		expect(insideViewport(empty.getBoundingClientRect(), 640, 360)).toBe(true);
		expectDocumentUnscrolled();

		await skillDialog.getByRole('button', { name: /back/i }).click();
		expect(skillDialog.elements()).toHaveLength(0);
	});

	// A live mid-chain state: five completed chapters plus the raid, so the
	// rail roster overflows its slice and the seven-row checklist must scroll.
	function emitMidChainQuests() {
		emitHudState(
			baseHudState({
				quests: buildHudQuestState({
					state: questStateAt('repel-the-soldiers'),
					locale: 'en'
				})
			})
		);
	}

	it.each([
		[640, 360],
		[832, 560],
		[1280, 640]
	])(
		'keeps the quest journal title and Close pinned while the rail and detail scroll at %d×%d',
		async (width, height) => {
			await page.viewport(width, height);
			render(GameShell);
			emitMidChainQuests();

			const questDialog = await openQuestLog();
			await expect.element(questDialog).toBeVisible();
			const screen = questDialog.element() as HTMLElement;
			const rail = screen.querySelector<HTMLElement>('.quest-rail')!;
			const title = screen.querySelector<HTMLElement>('.quest-title')!;
			const close = screen.querySelector<HTMLElement>('.quest-rail-close')!;
			const entries = screen.querySelector<HTMLElement>('.quest-rail-entries')!;
			const chapter = screen.querySelector<HTMLElement>('.quest-chapter')!;
			const detail = screen.querySelector<HTMLElement>('.quest-detail')!;

			// Short landscape keeps the rail and detail side by side, each
			// bounded inside the viewport.
			expect(getComputedStyle(screen).flexDirection).toBe('row');
			expect(insideViewport(rail.getBoundingClientRect(), width, height)).toBe(true);
			expect(insideViewport(title.getBoundingClientRect(), width, height)).toBe(true);
			expect(insideViewport(close.getBoundingClientRect(), width, height)).toBe(true);
			expect(insideViewport(detail.getBoundingClientRect(), width, height)).toBe(true);

			// The roster scrolls inside its own slice of the rail.
			expect(entries.scrollHeight).toBeGreaterThan(entries.clientHeight);
			entries.scrollTop = entries.scrollHeight;
			expect(entries.scrollTop).toBeGreaterThan(0);
			expect(insideViewport(title.getBoundingClientRect(), width, height)).toBe(true);
			expect(insideViewport(close.getBoundingClientRect(), width, height)).toBe(true);

			// The seven-row chapter checklist scrolls inside the rail; every row
			// — including the seventh — becomes readable while title and Close
			// stay pinned.
			const chapterRows = questDialog.getByTestId('quest-progress-row').elements();
			expect(chapterRows).toHaveLength(7);
			expect(chapter.scrollHeight).toBeGreaterThan(chapter.clientHeight);
			chapter.scrollTop = chapter.scrollHeight;
			expect(chapter.scrollTop).toBeGreaterThan(0);
			expect(insideViewport(chapterRows[6]!.getBoundingClientRect(), width, height)).toBe(true);
			expect(insideViewport(title.getBoundingClientRect(), width, height)).toBe(true);
			expect(insideViewport(close.getBoundingClientRect(), width, height)).toBe(true);

			// The detail column scrolls independently; the document never moves.
			expect(detail.scrollHeight).toBeGreaterThan(detail.clientHeight);
			detail.scrollTop = detail.scrollHeight;
			expect(detail.scrollTop).toBeGreaterThan(0);
			expect(insideViewport(detail.getBoundingClientRect(), width, height)).toBe(true);
			expectDocumentUnscrolled();

			// Actions still work: a completed chapter can be selected.
			await questDialog.getByTestId('quest-entry-completed').first().click();
			await expect
				.element(questDialog.getByTestId('quest-entry-completed').first())
				.toHaveClass(/quest-entry-selected/);
		}
	);

	it.each([
		[1280, 719],
		[640, 360]
	])(
		'keeps the quest roster free of horizontal overflow with unclipped progress rings at %d×%d',
		async (width, height) => {
			await page.viewport(width, height);
			render(GameShell);
			emitMidChainQuests();

			const questDialog = await openQuestLog();
			await expect.element(questDialog).toBeVisible();
			const screen = questDialog.element() as HTMLElement;
			const entries = screen.querySelector<HTMLElement>('.quest-rail-entries')!;
			const chapter = screen.querySelector<HTMLElement>('.quest-chapter')!;

			// Locale-specific rail strings prove Svelte flushed each locale into
			// the DOM before geometry is read — a bare updatePreferences() only
			// schedules the re-render.
			const chapterLabel = {
				en: 'Chapter Progress',
				ja: '章の進行状況',
				'zh-Hant': '章節進度'
			} as const;
			const doneLabel = { en: 'Done', ja: '完了', 'zh-Hant': '已完成' } as const;

			try {
				for (const loc of ['en', 'ja', 'zh-Hant'] as const) {
					updatePreferences({ locale: loc });
					await expect.element(page.getByText(chapterLabel[loc])).toBeVisible();
					await expect.element(page.getByText(doneLabel[loc]).first()).toBeVisible();

					// The roster scrolls vertically only — no horizontal scrollbar,
					// so the right-hand progress rings are never clipped by the
					// entries/rail overflow edges.
					expect(
						entries.scrollWidth,
						`entries x-overflow at ${width}×${height} (${loc})`
					).toBeLessThanOrEqual(entries.clientWidth + 1);
					expect(
						chapter.scrollWidth,
						`chapter x-overflow at ${width}×${height} (${loc})`
					).toBeLessThanOrEqual(chapter.clientWidth + 1);
					// The real clipper is the entries scrollport: the client box is
					// the border box minus borders and any classic scrollbar track.
					const entriesBox = entries.getBoundingClientRect();
					const clipLeft = entriesBox.left + entries.clientLeft;
					const clipRight = entriesBox.right - (entries.offsetWidth - entries.clientWidth);
					for (const ring of entries.querySelectorAll<HTMLElement>('.quest-ring')) {
						const r = ring.getBoundingClientRect();
						expect(r.left, `ring left (${loc})`).toBeGreaterThanOrEqual(clipLeft - 1);
						expect(r.right, `ring right (${loc})`).toBeLessThanOrEqual(clipRight + 1);
					}
					// Chapter row labels truncate inside their own boxes too.
					for (const row of chapter.querySelectorAll<HTMLElement>('.quest-chapter-row')) {
						expect(row.scrollWidth, `chapter row x-overflow (${loc})`).toBeLessThanOrEqual(
							row.clientWidth + 1
						);
					}
				}
			} finally {
				updatePreferences({ locale: 'en' });
				await expect.element(page.getByText('Chapter Progress')).toBeVisible();
			}
		}
	);

	it('keeps the quest chain wrapped inside the detail column at 640×360', async () => {
		await page.viewport(640, 360);
		render(GameShell);
		emitMidChainQuests();

		const questDialog = await openQuestLog();
		await expect.element(questDialog).toBeVisible();
		const detail = questDialog.getByTestId('quest-detail');
		const nodes = detail.getByTestId('quest-chain-node').elements();
		expect(nodes.length).toBeGreaterThan(1);

		// Every chain node sits inside the detail column's box and the chain
		// wraps to more than one row rather than clipping (HPA-841).
		const detailBox = detail.element().getBoundingClientRect();
		const tops = new Set<number>();
		for (const node of nodes) {
			const rect = node.getBoundingClientRect();
			expect(rect.left).toBeGreaterThanOrEqual(detailBox.left);
			expect(rect.right).toBeLessThanOrEqual(detailBox.right + 1);
			tops.add(Math.round(rect.top));
		}
		expect(tops.size).toBeGreaterThan(1);
	});

	it.each([
		[390, 844],
		[832, 760]
	])('keeps the quest journal stacked under the document at %d×%d', async (width, height) => {
		await page.viewport(width, height);
		render(GameShell);
		emitMidChainQuests();

		const questDialog = await openQuestLog();
		await expect.element(questDialog).toBeVisible();
		const screen = questDialog.element() as HTMLElement;
		// Portrait and taller narrow viewports keep the single-column stack.
		expect(getComputedStyle(screen).flexDirection).toBe('column');
		expect(getComputedStyle(screen).overflowY).toBe('auto');
		// The rail stacks above the detail, both spanning the screen's inner width.
		const railRect = screen.querySelector<HTMLElement>('.quest-rail')!.getBoundingClientRect();
		const detailRect = screen.querySelector<HTMLElement>('.quest-detail')!.getBoundingClientRect();
		expect(railRect.top).toBeLessThan(detailRect.top);
		expect(Math.round(railRect.left)).toBe(Math.round(detailRect.left));
	});

	// ---- Task 4 integration gate: one uniform contract per overlay --------
	// Every named overlay must hold the same invariants at both compact
	// landscape sizes: chrome (heading + Back/Close) stays pinned inside the
	// window and the viewport, overflow scrolls inside its own panel (never
	// the document), focus starts inside the dialog and Tab stays trapped,
	// and the final action still fires.
	function expectChrome(screen: HTMLElement, els: (HTMLElement | null)[], w: number, h: number) {
		const screenRect = screen.getBoundingClientRect();
		expect(
			insideViewport(screenRect, w, h),
			`overlay window ${JSON.stringify(screenRect.toJSON())} inside ${w}×${h}`
		).toBe(true);
		for (const el of els) {
			expect(el).toBeTruthy();
			// Clip-aware: chrome must survive ancestor overflow clipping, not
			// just sit inside raw viewport coordinates.
			expectUnclipped(el!, `chrome ${el!.className}`);
		}
		expectDocumentUnscrolled();
	}

	async function expectFocusInsideAndTrapped(screen: HTMLElement) {
		expect(screen.contains(document.activeElement)).toBe(true);
		// Same focusable definition as trapTabFocus, so first/last here are the
		// exact boundary elements the trap wraps between.
		const focusable = [
			...screen.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		].filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0);
		expect(focusable.length).toBeGreaterThan(0);
		// Single-control surfaces (e.g. Skill's lone Back) wrap onto themselves.
		const first = focusable[0]!;
		const last = focusable.at(-1)!;
		// Last → Tab wraps to first; first → Shift+Tab wraps to last. Real
		// focus moves only through the trap's own keydown handling.
		last.focus();
		expect(document.activeElement).toBe(last);
		await userEvent.keyboard('{Tab}');
		expect(document.activeElement).toBe(first);
		first.focus();
		expect(document.activeElement).toBe(first);
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
		expect(document.activeElement).toBe(last);
	}

	// Scrolls the panel to its end when it overflows; returns whether it
	// scrolled. Larger viewports legitimately fit some panels without
	// overflow — the gate is that the final action is reachable either way.
	function scrollPanelToEnd(el: HTMLElement): boolean {
		if (el.scrollHeight <= el.clientHeight) return false;
		el.scrollTop = el.scrollHeight;
		expect(el.scrollTop).toBeGreaterThan(0);
		return true;
	}

	// Geometry must be measured after the ~280ms heroic-anim entrance; mid-
	// flight the window's rect is transformed and can read slightly larger
	// than the viewport. The settled conditions are real: any running CSS
	// animation/transition inside the overlay must finish, then the window's
	// rect must be identical across two consecutive frames (both bounded —
	// never a fixed sleep).
	async function settleOverlayEntrance(screen: HTMLElement) {
		const animations = screen.getAnimations({ subtree: true });
		await Promise.race([
			Promise.all(animations.map((a) => a.finished.catch(() => {}))),
			new Promise((resolve) => setTimeout(resolve, 2_000))
		]);
		await new Promise<void>((resolve) => {
			let last = '';
			const deadline = performance.now() + 1_000;
			const probe = () => {
				const r = screen.getBoundingClientRect();
				const now = `${r.x},${r.y},${r.width},${r.height}`;
				if (now === last || performance.now() > deadline) return resolve();
				last = now;
				requestAnimationFrame(probe);
			};
			requestAnimationFrame(probe);
		});
	}

	function stockedBagHud(): HudState {
		return baseHudState({
			inventory: {
				consumables: Array.from({ length: 30 }, (_, index) => ({
					itemId: 'field-potion',
					name: 'Field Potion',
					description: 'Restores HP.',
					iconPath: '/game/assets/items/field-potion.png',
					quantity: index + 1
				})),
				equipment: [
					{
						itemId: 'training-sword',
						name: 'Training Sword',
						description: 'A blade.',
						iconPath: '/game/assets/items/training-sword.png',
						slot: 'weapon' as const,
						equipped: true,
						modifiers: { attack: 1 }
					},
					{
						itemId: 'rusty-dagger',
						name: 'Rusty Dagger',
						description: 'A spare blade.',
						iconPath: '/game/assets/items/rusty-dagger.png',
						slot: 'weapon' as const,
						equipped: false,
						modifiers: { attack: 1 }
					}
				],
				keyItems: [],
				equipped: {
					weapon: 'training-sword',
					head: null,
					body: null,
					hands: null,
					accessory: null
				}
			}
		});
	}

	interface OverlayCase {
		name: string;
		// Runs before render() (e.g. seeding save slots the title reads at
		// mount).
		prepare?: () => void | Promise<void>;
		// Opens the overlay and returns its screen root element.
		open: () => Promise<HTMLElement>;
		// Runs the per-overlay scroll + action portion; chrome/focus/document
		// assertions run around it in the shared test body.
		exercise: (screen: HTMLElement, w: number, h: number) => Promise<void>;
		// HUD command the final action must emit (when the action crosses the
		// bridge — internal-only actions like quest selection omit this).
		expectCommand?: Record<string, unknown>;
	}

	const hpa840Overlays: OverlayCase[] = [
		{
			name: 'Quest',
			open: async () => {
				emitHudState(
					baseHudState({
						quests: buildHudQuestState({
							state: questStateAt('repel-the-soldiers'),
							locale: 'en'
						})
					})
				);
				const dialog = await openQuestLog();
				await expect.element(dialog).toBeVisible();
				return dialog.element() as HTMLElement;
			},
			exercise: async (screen) => {
				scrollPanelToEnd(screen.querySelector<HTMLElement>('.quest-rail-entries')!);
				scrollPanelToEnd(screen.querySelector<HTMLElement>('.quest-chapter')!);
				scrollPanelToEnd(screen.querySelector<HTMLElement>('.quest-detail')!);
				const completed = page.getByTestId('quest-entry-completed');
				expect(completed.elements().length).toBeGreaterThan(0);
				// Browser-backed click scrolls the entry into view and fires a
				// real pointer activation — not a raw el.click().
				const first = completed.first();
				await first.click();
				await expect.element(first).toHaveClass(/quest-entry-selected/);
				expectCenterVisible(first.element() as HTMLElement, 'quest completed entry');
			}
		},
		{
			name: 'Save',
			open: async () => {
				emitHudState(baseHudState());
				await openFieldCommand('Save');
				const dialog = page.getByRole('dialog', { name: /save/i });
				await expect.element(dialog).toBeVisible();
				return dialog.element() as HTMLElement;
			},
			exercise: async (screen) => {
				scrollPanelToEnd(screen.querySelector<HTMLElement>('.save-slots')!);
				const lastSlot = page.getByTestId('save-slot-2');
				await lastSlot.click();
				// The 240px slot card exceeds the slot list's 640×360 slice, so
				// the honest gate is its click point inside the clip, not ≥95%
				// area visibility.
				expectCenterVisible(lastSlot.element() as HTMLElement, 'save slot 3');
			},
			expectCommand: { type: 'save-slot', slot: 2 }
		},
		{
			name: 'Load',
			prepare: () => {
				// The title reads the slots at mount — Continue only enables
				// when at least one record exists. Distinct states per slot
				// prove the picked slot's record is the one resumed.
				writeSaveSlot(0, { ...createSlotRecord(), kind: 'autosave' });
				writeSaveSlot(1, {
					...createSlotRecord(),
					state: { ...createNewSaveState(), mapId: 'hero-house' }
				});
				writeSaveSlot(2, {
					...createSlotRecord(),
					state: { ...createNewSaveState(), mapId: 'overworld' }
				});
			},
			open: async () => {
				await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
				await page.getByRole('button', { name: /continue/i }).click();
				const dialog = page.getByRole('dialog', { name: /load/i });
				await expect.element(dialog).toBeVisible();
				return dialog.element() as HTMLElement;
			},
			exercise: async (screen) => {
				scrollPanelToEnd(screen.querySelector<HTMLElement>('.save-slots')!);
				const createGameCallsBefore = vi.mocked(createGame).mock.calls.length;
				await page.getByTestId('save-slot-2').click();
				// Loading slot 3 starts the run — the field HUD returns (the
				// dialog unmounts, so no post-click geometry here).
				await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();
				await vi.waitFor(() => {
					const calls = vi.mocked(createGame).mock.calls;
					expect(calls.length).toBeGreaterThan(createGameCallsBefore);
					expect(calls.at(-1)?.[1]).toMatchObject({
						reason: 'resume',
						saveState: { mapId: 'overworld' }
					});
				});
			}
		},
		{
			name: 'Map',
			open: async () => {
				emitHudState(
					baseHudState({
						areaMap: {
							...baseHudState().areaMap,
							markers: [
								{ id: 'guild-hall', kind: 'building', x: 1_536, y: 5_504, label: 'Guild Hall' }
							]
						}
					})
				);
				await openFieldCommand(/map/i);
				const dialog = page.getByRole('dialog', { name: /map$/i });
				await expect.element(dialog).toBeVisible();
				return dialog.element() as HTMLElement;
			},
			exercise: async (screen) => {
				const body = screen.querySelector<HTMLElement>('.jrpg-area-map-body')!;
				const legend = screen.querySelector<HTMLElement>('.jrpg-area-map-legend')!;
				body.scrollTop = body.scrollHeight;
				expectUnclipped(legend, 'area map legend');
				await page.getByRole('img', { name: 'Guild Hall' }).click();
				await vi.waitFor(() =>
					expect(
						screen.querySelector<HTMLElement>('[data-testid="area-map-selected"]')!.textContent
					).toContain('Guild Hall')
				);
			}
		},
		{
			name: 'System',
			open: async () => {
				emitHudState(baseHudState());
				await openFieldCommand(/system/i);
				const dialog = page.getByRole('dialog', { name: /display & text/i });
				await expect.element(dialog).toBeVisible();
				return dialog.element() as HTMLElement;
			},
			exercise: async (screen, w, h) => {
				// Deferred item: the last rail card must not be clipped by the
				// window's overflow:clip edge (≈8px bleed was suspected).
				const windowRect = screen.getBoundingClientRect();
				const railCards = screen.querySelectorAll<HTMLElement>('.heroic-rail-card');
				expect(railCards.length).toBe(3);
				for (const card of railCards) {
					const r = card.getBoundingClientRect();
					expect(r.left).toBeGreaterThanOrEqual(windowRect.left - 1);
					expect(r.right).toBeLessThanOrEqual(windowRect.right + 1);
					expect(r.top).toBeGreaterThanOrEqual(windowRect.top - 1);
					expect(r.bottom).toBeLessThanOrEqual(windowRect.bottom + 1);
					expect(insideViewport(r, w, h)).toBe(true);
				}

				scrollPanelToEnd(screen.querySelector<HTMLElement>('.heroic-rows')!);
				const soundOff = page.getByRole('button', { name: 'Off', exact: true });
				expectUnclipped(soundOff.element() as HTMLElement, 'sound Off segment');
				await soundOff.click();
				await expect.element(soundOff).toHaveAttribute('aria-pressed', 'true');
			}
		},
		{
			name: 'Skill',
			open: async () => {
				emitHudState(baseHudState());
				await openFieldCommand('Skill');
				const dialog = page.getByRole('dialog', { name: 'Skill' });
				await expect.element(dialog).toBeVisible();
				return dialog.element() as HTMLElement;
			},
			exercise: async (screen) => {
				const empty = screen.querySelector<HTMLElement>('.skill-empty')!;
				expect(empty).toBeTruthy();
				// Skill's honest action is Back — activated through the real
				// locator, not a raw el.click().
				const back = page
					.getByRole('dialog', { name: 'Skill' })
					.getByRole('button', { name: /back/i });
				expectUnclipped(back.element() as HTMLElement, 'skill Back');
				await back.click();
				await vi.waitFor(() => expect(screen.isConnected).toBe(false));
			}
		},
		{
			name: 'Bag',
			open: async () => {
				emitHudState(stockedBagHud());
				await openFieldCommand('Bag');
				const dialog = page.getByRole('dialog', { name: /inventory/i });
				await expect.element(dialog).toBeVisible();
				return dialog.element() as HTMLElement;
			},
			exercise: async (screen) => {
				const scroll = screen.querySelector<HTMLElement>('.bag-grid-scroll')!;
				scrollPanelToEnd(scroll);
				const slots = screen.querySelectorAll<HTMLElement>('[data-testid="inventory-slot"]');
				// 30 stocked consumables render one slot each in the Bag tab grid.
				expect(slots.length).toBe(30);
				// The last filled potion slot scrolls into view inside the grid —
				// the locator click performs the real pointer activation.
				const lastFilled = page.getByRole('button', { name: 'Field Potion' }).last();
				expectUnclipped(lastFilled.element() as HTMLElement, 'last potion slot');
				await lastFilled.click();
				const detail = screen.querySelector<HTMLElement>('[data-testid="inventory-detail"]')!;
				await vi.waitFor(() => expect(detail.textContent).toContain('Field Potion'));
				const action = page
					.getByRole('dialog', { name: /inventory/i })
					.getByRole('button', { name: /drink/i });
				expectUnclipped(action.element() as HTMLElement, 'bag detail action');
				await action.click();
			},
			expectCommand: { type: 'use-item', itemId: 'field-potion' }
		},
		{
			name: 'Gear',
			open: async () => {
				emitHudState(stockedBagHud());
				await openFieldCommand('Gear');
				const dialog = page.getByRole('dialog', { name: /inventory/i });
				await expect.element(dialog).toBeVisible();
				await expect
					.element(dialog.getByRole('tab', { name: /gear/i }))
					.toHaveAttribute('aria-selected', 'true');
				return dialog.element() as HTMLElement;
			},
			exercise: async (screen) => {
				scrollPanelToEnd(screen.querySelector<HTMLElement>('.bag-grid-scroll')!);
				const dagger = page.getByRole('button', { name: 'Rusty Dagger' });
				await dagger.click();
				expectUnclipped(dagger.element() as HTMLElement, 'rusty dagger slot');
				const detail = screen.querySelector<HTMLElement>('[data-testid="inventory-detail"]')!;
				await vi.waitFor(() => expect(detail.textContent).toContain('Rusty Dagger'));
				const action = page
					.getByRole('dialog', { name: /inventory/i })
					.getByRole('button', { name: /equip/i });
				expectUnclipped(action.element() as HTMLElement, 'gear detail action');
				await action.click();
			},
			expectCommand: { type: 'equip-item', itemId: 'rusty-dagger' }
		},
		{
			name: 'Shop',
			open: async () => {
				emitHudState(
					baseHudState({
						shop: {
							shopId: 'miras-item-shop',
							name: "Mira's Item Shop",
							merchantName: 'Mira',
							buy: Array.from({ length: 18 }, (_, i) =>
								mockShopBuyEntry({
									stockId: `potion-stock-${i}`,
									name: `Field Potion ${i + 1}`,
									item: { ...mockConsumable(), name: `Field Potion ${i + 1}` }
								})
							),
							sell: [mockShopSellEntry()]
						}
					})
				);
				const dialog = page.getByRole('dialog', { name: "Mira's Item Shop" });
				await expect.element(dialog).toBeVisible();
				return dialog.element() as HTMLElement;
			},
			exercise: async (screen) => {
				scrollPanelToEnd(screen.querySelector<HTMLElement>('.shop-grid-scroll')!);
				const lastTile = page.getByRole('button', { name: 'Field Potion 18' });
				await lastTile.click();
				expectUnclipped(lastTile.element() as HTMLElement, 'last buy tile');
				const detail = screen.querySelector<HTMLElement>('[data-testid="shop-detail"]')!;
				await vi.waitFor(() => expect(detail.textContent).toContain('Field Potion 18'));
				const buy = page
					.getByRole('dialog', { name: "Mira's Item Shop" })
					.getByRole('button', { name: /buy/i });
				expectUnclipped(buy.element() as HTMLElement, 'shop detail action');
				await buy.click();
			},
			expectCommand: {
				type: 'buy-shop-item',
				shopId: 'miras-item-shop',
				stockId: 'potion-stock-17'
			}
		}
	];

	function overlayChromeFor(screen: HTMLElement, name: string): (HTMLElement | null)[] {
		switch (name) {
			case 'Quest':
				return [
					screen.querySelector<HTMLElement>('.quest-title'),
					screen.querySelector<HTMLElement>('.quest-rail-close')
				];
			case 'Save':
			case 'Load':
				return [
					screen.querySelector<HTMLElement>('.save-heading'),
					screen.querySelector<HTMLElement>('.save-back')
				];
			case 'Map':
				return [
					screen.querySelector<HTMLElement>('.jrpg-area-map-header'),
					screen.querySelector<HTMLElement>('.jrpg-area-map-close')
				];
			case 'System':
				return [
					screen.querySelector<HTMLElement>('.system-header'),
					screen.querySelector<HTMLElement>('.heroic-chip-button')
				];
			case 'Skill':
				return [
					screen.querySelector<HTMLElement>('.skill-header'),
					screen.querySelector<HTMLElement>('.skill-back')
				];
			case 'Bag':
			case 'Gear':
				return [
					screen.querySelector<HTMLElement>('.bag-title'),
					screen.querySelector<HTMLElement>('.bag-rail-close')
				];
			case 'Shop':
				return [
					screen.querySelector<HTMLElement>('.shop-title'),
					screen.querySelector<HTMLElement>('.shop-rail-close')
				];
			default:
				return [];
		}
	}

	it.each(
		hpa840Overlays.flatMap((overlay) =>
			(
				[
					[640, 360],
					[1280, 640]
				] as const
			).map(([width, height]) => ({ ...overlay, width, height }))
		)
	)(
		'$name keeps chrome pinned, scrolls inside its panel, traps focus and acts at $width×$height',
		async ({ name, prepare, open, exercise, expectCommand, width, height }) => {
			await page.viewport(width, height);
			const commands: unknown[] = [];
			const handleCommand = (event: Event) => commands.push((event as CustomEvent).detail);
			window.addEventListener(HUD_COMMAND_EVENT, handleCommand);
			try {
				await prepare?.();
				render(GameShell);
				const screen = await open();
				await settleOverlayEntrance(screen);
				await expectFocusInsideAndTrapped(screen);
				const chrome = overlayChromeFor(screen, name);
				expectChrome(screen, chrome, width, height);

				await exercise(screen, width, height);

				if (expectCommand) {
					expect(commands).toContainEqual(expectCommand);
				}

				// After exercising, chrome is still pinned and the document
				// never scrolled (skip when the exercise closed the overlay —
				// Skill Back and Load both unmount the dialog). Focus must also
				// remain inside the modal surface after the action lands.
				if (screen.isConnected) {
					expectChrome(screen, chrome, width, height);
					expect(
						screen.contains(document.activeElement),
						`focus escaped ${name} after its action (now on ${document.activeElement?.tagName})`
					).toBe(true);
				}
				expectDocumentUnscrolled();
			} finally {
				window.removeEventListener(HUD_COMMAND_EVENT, handleCommand);
			}
		}
	);

	it.each(
		hpa840Overlays
			.filter((overlay) => overlay.name !== 'Load')
			.flatMap((overlay) => (['ja', 'zh-Hant'] as const).map((locale) => ({ ...overlay, locale })))
	)(
		'$name keeps heading and Back/Close unclipped in $locale at 640×360',
		async ({ name, prepare, open, locale }) => {
			await page.viewport(640, 360);
			await prepare?.();
			render(GameShell);
			// Open under the default 'en' so localized command tiles are found,
			// then switch live — chrome labels re-render in place.
			const screen = await open();
			await settleOverlayEntrance(screen);
			const backEl = overlayChromeFor(screen, name)[1]!;
			const enText = backEl.textContent;
			updatePreferences({ locale });
			await vi.waitFor(() => {
				// Wait until the close/back label actually re-translated before
				// measuring geometry.
				expect(backEl.textContent).not.toBe(enText);
			});
			expectChrome(screen, overlayChromeFor(screen, name), 640, 360);
			expect(screen.contains(document.activeElement)).toBe(true);
		}
	);

	it.each(['ja', 'zh-Hant'] as const)(
		'keeps quest keyboard navigation and chrome working in %s at 832×560',
		async (locale) => {
			await page.viewport(832, 560);
			render(GameShell);
			emitHudState(
				baseHudState({
					quests: buildHudQuestState({
						state: questStateAt('repel-the-soldiers'),
						locale: 'en'
					})
				})
			);
			const dialog = await openQuestLog();
			await expect.element(dialog).toBeVisible();
			const screen = dialog.element() as HTMLElement;
			await settleOverlayEntrance(screen);

			// Keyboard: the rail entries form a single-column focus lattice;
			// ArrowDown moves to the next row and the move stays inside the
			// scrollable roster.
			const entries = screen.querySelectorAll<HTMLElement>('[data-focus-id^="quest-row-"]');
			expect(entries.length).toBeGreaterThan(1);
			entries[0]!.focus();
			expect(document.activeElement).toBe(entries[0]);
			await userEvent.keyboard('{ArrowDown}');
			const moved = document.activeElement as HTMLElement;
			expect(moved.dataset.focusId).toMatch(/^quest-row-/);
			expect(Number(moved.dataset.focusRow)).toBe(Number(entries[0]!.dataset.focusRow) + 1);
			expect(screen.contains(moved)).toBe(true);

			// Live locale switch keeps title and Close unclipped at this
			// size (deferred ja/zh-Hant item).
			const closeEl = screen.querySelector<HTMLElement>('.quest-rail-close')!;
			const enText = closeEl.textContent;
			updatePreferences({ locale });
			await vi.waitFor(() => {
				expect(closeEl.textContent).not.toBe(enText);
			});
			expectChrome(screen, overlayChromeFor(screen, 'Quest'), 832, 560);
		}
	);
});
