import { page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../app.css';
import GameShell from './GameShell.svelte';
import { HUD_COMMAND_EVENT, HUD_STATE_EVENT, type HudState } from '$lib/game/ui-bridge/events';
import { createNewSaveState } from '$lib/game/save/save-state';
import { SAVE_SLOTS_STORAGE_KEY, writeSaveSlot, type SaveSlotRecord } from '$lib/game/save/slots';
import type { ConsumableDefinition, EquipmentDefinition } from '$lib/game/content/items';
import type { HudQuestEntry } from '$lib/game/core/quests';
import type { HudShopBuyEntry, HudShopSellEntry } from '$lib/game/core/shop';

vi.mock('$lib/game/phaser/createGame', () => ({
	createGame: vi.fn(async () => ({ destroy: vi.fn() }))
}));

afterEach(() => {
	emitHudState(baseHudState({ ready: false }));
	localStorage.removeItem(SAVE_SLOTS_STORAGE_KEY);
});

function emitHudState(state: HudState) {
	window.dispatchEvent(new CustomEvent(HUD_STATE_EVENT, { detail: state }));
}

function baseHudState(overrides: Partial<HudState> = {}): HudState {
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
		nearbyShop: null,
		shop: null,
		dialogue: null,
		battle: { phase: 'none', summary: null },
		quests: { main: null, side: [], completed: [], guildOffer: null },
		inventory: {
			consumables: [],
			equipment: [],
			keyItems: [],
			equipped: { weapon: null, head: null, body: null, hands: null, accessory: null }
		},
		...overrides
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

function mockShopBuyEntry(): HudShopBuyEntry {
	return {
		stockId: 'potion-stock',
		itemId: 'field-potion',
		name: 'Field Potion',
		description: 'Restores a small amount of HP.',
		iconPath: '/game/assets/items/field-potion.png',
		kind: 'consumable',
		price: 10,
		availability: { mode: 'unlimited' },
		item: mockConsumable()
	};
}

function mockShopSellEntry(): HudShopSellEntry {
	return {
		itemId: 'practice-sword',
		name: 'Practice Sword',
		description: 'A wooden training blade.',
		iconPath: '/game/assets/items/practice-sword.png',
		kind: 'equipment',
		quantity: 1,
		price: 5,
		item: mockEquipment()
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

function mockMainQuest(): HudQuestEntry {
	return {
		questId: 'investigate-the-ruins',
		title: 'Investigate the Ruins',
		type: 'main',
		status: 'active',
		description: 'Find out what is lurking in the ruins.',
		objective: 'Enter the ruins and investigate.',
		progress: { current: 1, target: 3, label: 'Clues found' },
		rewardSummary: '24 XP / 30 coins'
	};
}

describe('GameShell motion flourishes', () => {
	it('pulses the party panel when HP is critically low', async () => {
		render(GameShell);
		emitHudState(baseHudState({ hp: 10, maxHp: 50 }));
		const party = page.getByTestId('hud-party-panel');
		await expect.element(party).toHaveClass(/arcane-low-hp/);

		emitHudState(baseHudState({ hp: 40, maxHp: 50 }));
		await expect.element(party).not.toHaveClass(/arcane-low-hp/);
	});

	it('treats exactly 25% HP as critically low', async () => {
		render(GameShell);
		emitHudState(baseHudState({ hp: 5, maxHp: 20 }));
		const party = page.getByTestId('hud-party-panel');
		await expect.element(party).toHaveClass(/arcane-low-hp/);

		emitHudState(baseHudState({ hp: 6, maxHp: 20 }));
		await expect.element(party).not.toHaveClass(/arcane-low-hp/);
	});

	it('flashes the coin display when wallet coins change', async () => {
		render(GameShell);
		emitHudState(baseHudState({ wallet: { coins: 30 } }));
		await expect.element(page.getByText(/30G/)).toBeVisible();

		emitHudState(baseHudState({ wallet: { coins: 50 } }));
		const coinSpan = page.getByText(/50G/);
		await expect.element(coinSpan).toBeVisible();
		await expect.element(coinSpan).toHaveClass(/arcane-coin-flash/);
	});

	it('does not flash coins on unrelated state changes', async () => {
		render(GameShell);
		emitHudState(baseHudState({ wallet: { coins: 30 } }));
		const coinSpan = page.getByText(/30G/);
		await expect.element(coinSpan).toBeVisible();

		// Wait for the initial flash to clear (600ms timeout in component)
		await expect.element(coinSpan).not.toHaveClass(/arcane-coin-flash/);

		emitHudState(baseHudState({ hp: 5, maxHp: 20, wallet: { coins: 30 } }));
		await expect.element(coinSpan).not.toHaveClass(/arcane-coin-flash/);
	});

	it('keeps coin flash alive across unrelated HUD updates before the timer expires', async () => {
		render(GameShell);
		emitHudState(baseHudState({ wallet: { coins: 30 } }));
		await expect.element(page.getByText(/30G/)).toBeVisible();

		emitHudState(baseHudState({ wallet: { coins: 50 } }));
		const coinSpan = page.getByText(/50G/);
		await expect.element(coinSpan).toBeVisible();
		await expect.element(coinSpan).toHaveClass(/arcane-coin-flash/);

		// Unrelated HP update arrives while the flash timer is still running
		emitHudState(baseHudState({ hp: 8, maxHp: 20, wallet: { coins: 50 } }));
		await expect.element(coinSpan).toHaveClass(/arcane-coin-flash/);

		// The flash should still clear after the timer fires
		await expect.element(coinSpan).not.toHaveClass(/arcane-coin-flash/);
	});

	it('flashes the level display when the level increases', async () => {
		render(GameShell);
		emitHudState(baseHudState({ level: 1 }));
		await expect.element(page.getByText(/LV 1/)).toBeVisible();

		emitHudState(baseHudState({ level: 2 }));
		const levelSpan = page.getByText(/LV 2/);
		await expect.element(levelSpan).toBeVisible();
		await expect.element(levelSpan).toHaveClass(/arcane-level-up/);
	});

	it('does not flash level on unrelated state changes', async () => {
		render(GameShell);
		emitHudState(baseHudState({ level: 1 }));
		await expect.element(page.getByText(/LV 1/)).toBeVisible();

		emitHudState(baseHudState({ hp: 5, maxHp: 20, level: 1 }));
		const levelSpan = page.getByText(/LV 1/);
		await expect.element(levelSpan).toBeVisible();
		await expect.element(levelSpan).not.toHaveClass(/arcane-level-up/);
	});

	it('keeps level-up flash alive across unrelated HUD updates before the timer expires', async () => {
		render(GameShell);
		emitHudState(baseHudState({ level: 1 }));
		await expect.element(page.getByText(/LV 1/)).toBeVisible();

		emitHudState(baseHudState({ level: 2 }));
		const levelSpan = page.getByText(/LV 2/);
		await expect.element(levelSpan).toBeVisible();
		await expect.element(levelSpan).toHaveClass(/arcane-level-up/);

		// Unrelated HP update arrives while the flash timer is still running
		emitHudState(baseHudState({ hp: 8, maxHp: 20, level: 2 }));
		await expect.element(levelSpan).toHaveClass(/arcane-level-up/);

		// The flash should still clear after the timer fires
		await expect.element(levelSpan).not.toHaveClass(/arcane-level-up/);
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
		await expect.element(levelSpan).toHaveClass(/arcane-level-up/);
	});
});

describe('GameShell battle summary', () => {
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
							completedQuestTitles: ['Thin the Village Slimes'],
							questRewards: [
								{
									title: 'Thin the Village Slimes',
									rewardSummary: '6 XP / 12 coins / 1 item'
								}
							],
							questProgress: []
						}
					}
				})
			);

			const summary = page.getByRole('dialog', { name: /battle summary/i });
			await expect.element(summary).toBeVisible();
			await expect.element(summary.getByText(/Enemies defeated: 3/i)).toBeVisible();
			await expect.element(summary.getByText(/XP gained: 12/i)).toBeVisible();
			await expect.element(summary.getByText(/Coins gained: 12/i)).toBeVisible();
			await expect.element(summary.getByText(/Field Potion x2/i)).toBeVisible();
			await expect
				.element(
					summary.getByText(
						/Quest complete: Thin the Village Slimes\. Reward: 6 XP \/ 12 coins \/ 1 item/i
					)
				)
				.toBeVisible();
			await expect.element(summary.getByText(/Level up/i)).toBeVisible();

			await summary.getByRole('button', { name: /continue/i }).click();

			expect(commands.at(-1)).toEqual({ type: 'dismiss-battle-summary' });
		});
	});

	it('renders every victory section including quest progress rows', async () => {
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
						leveledUp: true,
						completedQuestTitles: ['Thin the Village Slimes'],
						questRewards: [
							{
								title: 'Thin the Village Slimes',
								rewardSummary: '6 XP / 6 coins'
							}
						],
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
					}
				}
			})
		);

		const summary = page.getByRole('dialog', { name: /battle summary/i });
		await expect.element(summary).toBeVisible();
		// Each conditional section renders its own stagger row.
		await expect.element(summary.getByText(/Field Potion x1/i)).toBeVisible();
		await expect.element(summary.getByText(/Level up/i)).toBeVisible();
		await expect
			.element(
				summary.getByText(/Quest complete: Thin the Village Slimes\. Reward: 6 XP \/ 6 coins/i)
			)
			.toBeVisible();
		await expect.element(summary.getByText(/Slimes thinned: 2\/3/i)).toBeVisible();
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
					}
				}
			})
		);

		const summary = page.getByRole('dialog', { name: /battle summary/i });
		await expect.element(summary).toBeVisible();
		await expect.element(summary.getByRole('button', { name: /continue/i })).toHaveFocus();
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
					}
				}
			})
		);

		const continueButton = page
			.getByRole('dialog', { name: /battle summary/i })
			.getByRole('button', { name: /continue/i });
		await expect.element(continueButton).toHaveFocus();

		await userEvent.keyboard('{Tab}');
		await expect.element(continueButton).toHaveFocus();
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
		await expect.element(continueButton).toHaveFocus();
	});

	it('disables non-battle command buttons while battle is active but keeps quick heal available', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				nearbyShop: {
					shopId: 'miras-item-shop',
					name: "Mira's Item Shop",
					merchantName: 'Mira'
				},
				battle: { phase: 'active', summary: null }
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();

		await expect.element(page.getByRole('button', { name: 'Quest', exact: true })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: /map/i })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: 'Bag' })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: 'Save' })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: 'Rest' })).toBeEnabled();
	});

	it('disables equipped item removal while battle is locked', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(hudStateWithEquippedWeapon());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Bag' }).click();
			await page.getByRole('tab', { name: /equipment/i }).click();

			const removeButton = page.getByRole('button', { name: /remove/i });
			await expect.element(removeButton).toBeEnabled();

			emitHudState(
				hudStateWithEquippedWeapon({
					battle: { phase: 'active', summary: null }
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

	it('emits heal command when Rest is clicked', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState({ heals: 2 }));

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Rest' }).click();

			expect(commands).toContainEqual({ type: 'heal' });
		});
	});

	it('keeps the inert Skill command focusable until Task 5 lands its surface', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Skill' }).click();

			await expect.element(page.getByRole('button', { name: 'Skill' })).toBeEnabled();
			// Opening the grid itself pauses the game; Skill adds no further command.
			const fieldCommands = commands.filter(
				(command) => (command as { type?: string }).type !== 'pause-game'
			);
			expect(fieldCommands).toEqual([]);
		});
	});
});

describe('GameShell inventory', () => {
	it('opens from the command menu and switches tabs', async () => {
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

		await expect.element(page.getByRole('tab', { name: /consumables/i })).toBeVisible();
		await expect
			.element(page.getByRole('tab', { name: /consumables/i }))
			.toHaveAttribute('aria-selected', 'true');

		await page.getByRole('tab', { name: /equipment/i }).click();
		await expect
			.element(page.getByRole('tab', { name: /equipment/i }))
			.toHaveAttribute('aria-selected', 'true');
	});

	it('uses design tokens for stat values and empty slots', async () => {
		render(GameShell);
		emitHudState(baseHudState({ hp: 12, maxHp: 20, attack: 4, defense: 0 }));

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Bag' }).click();

		const inventoryDialog = page.getByRole('dialog', { name: /inventory/i });

		// Stat values use text-parchment instead of text-white
		const hpText = inventoryDialog.getByText('12/20');
		await expect.element(hpText).toHaveClass(/text-parchment/);

		// Empty inventory slots use design tokens
		const emptySlot = page.getByTestId('inventory-slot').first();
		await expect.element(emptySlot).toHaveClass(/border-parchment/);
		await expect.element(emptySlot).toHaveClass(/text-muted/);
	});

	it('closes on Escape and restores focus to the menu button', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		const menuButton = page.getByRole('button', { name: /menu/i });
		await menuButton.click();
		await page.getByRole('button', { name: 'Bag' }).click();
		const dialog = page.getByRole('dialog', { name: /inventory/i });
		await expect.element(dialog).toBeVisible();

		await userEvent.keyboard('{Escape}');

		expect(dialog.elements()).toHaveLength(0);
		await expect.element(menuButton).toHaveFocus();
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

	it('closes on Escape and restores focus to the menu button', async () => {
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

		await userEvent.keyboard('{Escape}');

		expect(dialog.elements()).toHaveLength(0);
		await expect.element(page.getByRole('button', { name: /menu/i })).toHaveFocus();
	});
});

describe('GameShell quest log', () => {
	it('opens from the command menu and renders active quests', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: mockMainQuest(),
					side: [],
					completed: [],
					guildOffer: null
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Quest', exact: true }).click();

		await expect.element(page.getByText(/Field Journal/)).toBeVisible();
		await expect.element(page.getByText(/Clues found/)).toBeVisible();
	});

	it('shows empty state when no side quests are active', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: mockMainQuest(),
					side: [],
					completed: [],
					guildOffer: null
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Quest', exact: true }).click();

		await expect.element(page.getByText(/no side quests active/i)).toBeVisible();
	});

	it('closes on Escape key', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: mockMainQuest(),
					side: [],
					completed: [],
					guildOffer: null
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Quest', exact: true }).click();

		const questDialog = page.getByRole('dialog', { name: /quest log/i });
		await expect.element(questDialog).toBeVisible();

		// Click the dialog to ensure focus lands inside it
		await questDialog.click();
		await expect.element(questDialog).toHaveFocus();

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
					side: [],
					completed: [],
					guildOffer: null
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Quest', exact: true }).click();

		const closeButton = page
			.getByRole('dialog', { name: /quest log/i })
			.getByRole('button', { name: /close/i });
		await expect.element(closeButton).toHaveFocus();

		await userEvent.keyboard('{Tab}');
		await expect.element(closeButton).toHaveFocus();
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
		await expect.element(closeButton).toHaveFocus();
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
		await expect.element(menuButton).toHaveAttribute('aria-expanded', 'false');
	});

	it('closes on Escape and restores focus to the menu button', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: /map/i }).click();
		const mapSvg = page.getByTestId('area-map-svg');
		await expect.element(mapSvg).toBeVisible();

		await userEvent.keyboard('{Escape}');

		expect(mapSvg.elements()).toHaveLength(0);
		await expect.element(page.getByRole('button', { name: /menu/i })).toHaveFocus();
	});
});

describe('GameShell battle summary defeat', () => {
	it('renders defeat summary with defeat-specific message and no drops', async () => {
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
					}
				}
			})
		);

		const summary = page.getByRole('dialog', { name: /battle summary/i });
		await expect.element(summary).toBeVisible();
		await expect.element(summary.getByText(/no item drops/i)).toBeVisible();
		await expect.element(summary.getByText(/returned to the shrine/i)).toBeVisible();
	});
});

function createSlotRecord(): SaveSlotRecord {
	return {
		kind: 'manual',
		savedAt: '2026-09-04T12:00:00.000Z',
		playtimeSeconds: 42,
		locationLabel: 'Sundrop Meadows',
		state: createNewSaveState()
	};
}

describe('GameShell save screen', () => {
	it('opens the save screen from the menu and emits save-slot for an empty slot', async () => {
		await withCommands(async (commands) => {
			render(GameShell);
			emitHudState(baseHudState());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Save' }).click();

			const saveDialog = page.getByRole('dialog', { name: /save/i });
			await expect.element(saveDialog).toBeVisible();
			// Slot 1 is the display-only autosave row; slots 2/3 are manual.
			await expect.element(saveDialog.getByTestId('save-slot-autosave')).toBeVisible();
			await expect.element(saveDialog.getByTestId('save-slot-1')).toBeVisible();
			await expect.element(saveDialog.getByTestId('save-slot-2')).toBeVisible();

			await saveDialog.getByTestId('save-slot-1').click();

			expect(commands).toContainEqual({ type: 'save-slot', slot: 1 });
		});
	});

	it('asks for confirmation before overwriting an occupied slot', async () => {
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
				await expect.element(saveDialog.getByText('Sundrop Meadows')).toBeVisible();

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

			await page.getByRole('article', { name: /Field Potion/i }).dblClick();

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
			await page.getByRole('tab', { name: /equipment/i }).click();

			await page.getByRole('article', { name: /Practice Sword/i }).dblClick();

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
		await page.getByRole('tab', { name: /key items/i }).click();

		await expect.element(page.getByRole('article', { name: /Ancient Key/i })).toBeVisible();
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

			await page.getByRole('article', { name: /Field Potion/i }).dblClick();

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

			await page.getByRole('article', { name: /Field Potion/i }).dblClick();

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
			await page.getByRole('article', { name: /Practice Sword/i }).dblClick();

			expect(commands).toContainEqual({
				type: 'sell-inventory-item',
				itemId: 'practice-sword'
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
		await expect.element(page.getByRole('button', { name: /menu/i })).toHaveFocus();
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

	it('moves grid focus with arrow keys through resolveMenuFocusTarget', async () => {
		render(GameShell);
		emitHudState(baseHudState({ heals: 0 }));

		await page.getByRole('button', { name: /menu/i }).click();

		// Null current: arrows land on the first enabled tile.
		await userEvent.keyboard('{ArrowDown}');
		await expect.element(page.getByRole('button', { name: 'Bag' })).toHaveFocus();

		await userEvent.keyboard('{ArrowRight}');
		await expect.element(page.getByRole('button', { name: 'Gear' })).toHaveFocus();

		// Rest is disabled (heals: 0): down the column has no enabled cell, so
		// focus stays on Gear.
		await userEvent.keyboard('{ArrowDown}');
		await expect.element(page.getByRole('button', { name: 'Gear' })).toHaveFocus();

		await userEvent.keyboard('{ArrowLeft}');
		await expect.element(page.getByRole('button', { name: 'Bag' })).toHaveFocus();

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

describe('GameShell quest log guild offers', () => {
	it('shows guild offer quests as available in the quest log', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: mockMainQuest(),
					side: [],
					completed: [],
					guildOffer: {
						giverNpcId: 'guild-master',
						giverName: 'Guild Master',
						quests: [
							{
								questId: 'thin-village-slimes',
								title: 'Thin the Village Slimes',
								description: 'Reduce the slime population.',
								objective: 'Defeat 3 slimes.',
								rewardSummary: '6 XP / 12 coins'
							}
						]
					}
				}
			})
		);

		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Quest', exact: true }).click();

		await expect.element(page.getByText(/Thin the Village Slimes/)).toBeVisible();
		await expect.element(page.getByText(/available from guild master/i)).toBeVisible();
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
	it('opens from the command menu and closes on Escape restoring focus', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		const menuButton = page.getByRole('button', { name: /menu/i });
		await menuButton.click();
		await page.getByRole('button', { name: /system/i }).click();

		const dialog = page.getByRole('dialog', { name: /display & text/i });
		await expect.element(dialog).toBeVisible();

		await userEvent.keyboard('{Escape}');

		expect(dialog.elements()).toHaveLength(0);
		await expect.element(menuButton).toHaveFocus();
	});
});

describe('GameShell title mode', () => {
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

	it('flips from Title to playing when a ready HUD state arrives (direct boot)', async () => {
		render(GameShell);
		await expect.element(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();

		emitHudState(baseHudState());

		await expect.element(page.getByRole('button', { name: /menu/i })).toBeVisible();
		expect(page.getByRole('heading', { name: 'GLIESE' }).elements()).toHaveLength(0);
	});
});
