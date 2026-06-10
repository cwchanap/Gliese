import { page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../app.css';
import GameShell from './GameShell.svelte';
import { HUD_COMMAND_EVENT, HUD_STATE_EVENT, type HudState } from '$lib/game/ui-bridge/events';
import type { ConsumableDefinition, EquipmentDefinition } from '$lib/game/content/items';
import type { HudQuestEntry } from '$lib/game/core/quests';
import type { HudShopBuyEntry, HudShopSellEntry } from '$lib/game/core/shop';

vi.mock('$lib/game/phaser/createGame', () => ({
	createGame: vi.fn(async () => ({ destroy: vi.fn() }))
}));

afterEach(() => {
	emitHudState(baseHudState({ ready: false }));
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
		canResume: false,
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
		const commands: unknown[] = [];
		const handleCommand = (event: Event) => commands.push((event as CustomEvent).detail);
		window.addEventListener(HUD_COMMAND_EVENT, handleCommand);

		try {
			render(GameShell);
			emitHudState({
				...baseHudState(),
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
			});

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
		} finally {
			window.removeEventListener(HUD_COMMAND_EVENT, handleCommand);
		}
	});

	it('renders every victory section including quest progress rows', async () => {
		render(GameShell);
		emitHudState({
			...baseHudState(),
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
		});

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
		emitHudState(baseHudState({ canResume: true }));

		await page.getByRole('button', { name: /menu/i }).click();
		await expect.element(page.getByRole('button', { name: /save game/i })).toBeVisible();

		emitHudState(
			baseHudState({
				canResume: true,
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
		emitHudState({
			...baseHudState({
				canResume: true,
				nearbyShop: {
					shopId: 'miras-item-shop',
					name: "Mira's Item Shop",
					merchantName: 'Mira'
				}
			}),
			battle: { phase: 'active', summary: null }
		});

		await page.getByRole('button', { name: /menu/i }).click();

		await expect.element(page.getByRole('button', { name: /quests/i })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: /map/i })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: /inventory/i })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: /shop/i })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: /resume save/i })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: /save game/i })).toBeDisabled();
		await expect.element(page.getByRole('button', { name: /use heal/i })).toBeEnabled();
	});

	it('disables equipped item removal while battle is locked', async () => {
		const commands: unknown[] = [];
		const handleCommand = (event: Event) => commands.push((event as CustomEvent).detail);
		window.addEventListener(HUD_COMMAND_EVENT, handleCommand);

		try {
			render(GameShell);
			emitHudState(hudStateWithEquippedWeapon());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: /inventory/i }).click();
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
		} finally {
			window.removeEventListener(HUD_COMMAND_EVENT, handleCommand);
		}
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
	it('opens and closes the command menu', async () => {
		render(GameShell);
		emitHudState(baseHudState({ heals: 2 }));

		const menuButton = page.getByRole('button', { name: /menu/i });
		await menuButton.click();
		await page.getByRole('button', { name: /use heal/i }).click();

		await page.getByRole('button', { name: /close/i }).click();
		await expect.element(menuButton).toHaveAttribute('aria-expanded', 'false');
	});

	it('emits heal command when use heal is clicked', async () => {
		const commands: unknown[] = [];
		const handleCommand = (event: Event) => commands.push((event as CustomEvent).detail);
		window.addEventListener(HUD_COMMAND_EVENT, handleCommand);

		try {
			render(GameShell);
			emitHudState(baseHudState({ heals: 2 }));

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: /use heal/i }).click();

			expect(commands).toContainEqual({ type: 'heal' });
		} finally {
			window.removeEventListener(HUD_COMMAND_EVENT, handleCommand);
		}
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
		await page.getByRole('button', { name: /inventory/i }).click();

		await expect.element(page.getByRole('tab', { name: /consumables/i })).toBeVisible();
		await expect
			.element(page.getByRole('tab', { name: /consumables/i }))
			.toHaveAttribute('aria-selected', 'true');

		await page.getByRole('tab', { name: /equipment/i }).click();
		await expect
			.element(page.getByRole('tab', { name: /equipment/i }))
			.toHaveAttribute('aria-selected', 'true');
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
		await page.getByRole('button', { name: /quests/i }).click();

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
		await page.getByRole('button', { name: /quests/i }).click();

		await expect.element(page.getByText(/no side quests active/i)).toBeVisible();
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
});

describe('GameShell battle summary defeat', () => {
	it('renders defeat summary with defeat-specific message and no drops', async () => {
		render(GameShell);
		emitHudState({
			...baseHudState(),
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
		});

		const summary = page.getByRole('dialog', { name: /battle summary/i });
		await expect.element(summary).toBeVisible();
		await expect.element(summary.getByText(/no item drops/i)).toBeVisible();
		await expect.element(summary.getByText(/returned to the shrine/i)).toBeVisible();
	});
});

describe('GameShell save and resume', () => {
	it('emits save command when Save Game is clicked', async () => {
		const commands: unknown[] = [];
		const handleCommand = (event: Event) => commands.push((event as CustomEvent).detail);
		window.addEventListener(HUD_COMMAND_EVENT, handleCommand);

		try {
			render(GameShell);
			emitHudState(baseHudState());

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: /save game/i }).click();

			expect(commands).toContainEqual({ type: 'save' });
		} finally {
			window.removeEventListener(HUD_COMMAND_EVENT, handleCommand);
		}
	});

	it('emits resume-save when Resume Save is clicked', async () => {
		const commands: unknown[] = [];
		const handleCommand = (event: Event) => commands.push((event as CustomEvent).detail);
		window.addEventListener(HUD_COMMAND_EVENT, handleCommand);

		try {
			render(GameShell);
			emitHudState(baseHudState({ canResume: true }));

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: /resume save/i }).click();

			expect(commands).toContainEqual({ type: 'resume-save' });
		} finally {
			window.removeEventListener(HUD_COMMAND_EVENT, handleCommand);
		}
	});
});

describe('GameShell inventory actions', () => {
	it('uses a consumable item on double-click', async () => {
		const commands: unknown[] = [];
		const handleCommand = (event: Event) => commands.push((event as CustomEvent).detail);
		window.addEventListener(HUD_COMMAND_EVENT, handleCommand);

		try {
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
			await page.getByRole('button', { name: /inventory/i }).click();

			await page.getByRole('article', { name: /Field Potion/i }).dblClick();

			expect(commands).toContainEqual({ type: 'use-item', itemId: 'field-potion' });
		} finally {
			window.removeEventListener(HUD_COMMAND_EVENT, handleCommand);
		}
	});

	it('equips an unequipped item on double-click', async () => {
		const commands: unknown[] = [];
		const handleCommand = (event: Event) => commands.push((event as CustomEvent).detail);
		window.addEventListener(HUD_COMMAND_EVENT, handleCommand);

		try {
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
			await page.getByRole('button', { name: /inventory/i }).click();
			await page.getByRole('tab', { name: /equipment/i }).click();

			await page.getByRole('article', { name: /Practice Sword/i }).dblClick();

			expect(commands).toContainEqual({ type: 'equip-item', itemId: 'practice-sword' });
		} finally {
			window.removeEventListener(HUD_COMMAND_EVENT, handleCommand);
		}
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
		await page.getByRole('button', { name: /inventory/i }).click();
		await page.getByRole('tab', { name: /key items/i }).click();

		await expect.element(page.getByRole('article', { name: /Ancient Key/i })).toBeVisible();
	});
});

describe('GameShell shop actions', () => {
	it('buys an item on double-click when affordable', async () => {
		const commands: unknown[] = [];
		const handleCommand = (event: Event) => commands.push((event as CustomEvent).detail);
		window.addEventListener(HUD_COMMAND_EVENT, handleCommand);

		try {
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
		} finally {
			window.removeEventListener(HUD_COMMAND_EVENT, handleCommand);
		}
	});

	it('sells an item on double-click', async () => {
		const commands: unknown[] = [];
		const handleCommand = (event: Event) => commands.push((event as CustomEvent).detail);
		window.addEventListener(HUD_COMMAND_EVENT, handleCommand);

		try {
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
		} finally {
			window.removeEventListener(HUD_COMMAND_EVENT, handleCommand);
		}
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

	it('does not open area map when another overlay is open', async () => {
		render(GameShell);
		emitHudState(baseHudState());

		await page.getByRole('button', { name: /menu/i }).click();
		const closeCommand = page.getByRole('button', { name: /close/i });
		await expect.element(closeCommand).toBeVisible();

		await userEvent.keyboard('m');
		await expect.element(closeCommand).toBeVisible();
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
		await page.getByRole('button', { name: /quests/i }).click();

		await expect.element(page.getByText(/Thin the Village Slimes/)).toBeVisible();
		await expect.element(page.getByText(/available from guild master/i)).toBeVisible();
	});
});

describe('GameShell error handling', () => {
	it('shows error banner when game fails to load', async () => {
		const { createGame } = await import('$lib/game/phaser/createGame');
		vi.mocked(createGame).mockRejectedValueOnce(new Error('test error'));

		render(GameShell);

		await expect.element(page.getByText(/unable to start the game shell/i)).toBeVisible();
	});
});
