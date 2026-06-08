import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../app.css';
import GameShell from './GameShell.svelte';
import { HUD_COMMAND_EVENT, HUD_STATE_EVENT, type HudState } from '$lib/game/ui-bridge/events';

vi.mock('$lib/game/phaser/createGame', () => ({
	createGame: vi.fn(async () => ({ destroy: vi.fn() }))
}));

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
