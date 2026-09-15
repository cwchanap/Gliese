import { page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../app.css';
import GameShell from './GameShell.svelte';
import { HUD_COMMAND_EVENT, HUD_STATE_EVENT, type HudState } from '$lib/game/ui-bridge/events';
import { createNewSaveState } from '$lib/game/save/save-state';
import { SAVE_SLOTS_STORAGE_KEY, writeSaveSlot, type SaveSlotRecord } from '$lib/game/save/slots';
import { setLastInputModality } from '$lib/game/core/gamepad';
import { PREFERENCES_STORAGE_KEY } from '$lib/game/i18n/preferences';
import { updatePreferences } from '$lib/game/i18n/store';
import type { ConsumableDefinition, EquipmentDefinition } from '$lib/game/content/items';
import type { HudQuestEntry, HudQuestOffer } from '$lib/game/core/quests';
import type { HudShopBuyEntry, HudShopSellEntry } from '$lib/game/core/shop';

vi.mock('$lib/game/phaser/createGame', () => ({
	createGame: vi.fn(async () => ({ destroy: vi.fn() }))
}));

afterEach(async () => {
	emitHudState(baseHudState({ ready: false }));
	localStorage.removeItem(SAVE_SLOTS_STORAGE_KEY);
	localStorage.removeItem(PREFERENCES_STORAGE_KEY);
	updatePreferences({ motion: 'on', textSpeed: 'normal', promptMode: 'auto' });
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
		battle: { phase: 'none', summary: null, active: null },
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

function mockSideQuest(): HudQuestEntry {
	return {
		questId: 'thin-village-slimes',
		title: 'Thin Village Slimes',
		type: 'side',
		status: 'active',
		description: 'Clear the slimes gathering on the village road.',
		objective: 'Defeat slimes near the village.',
		progress: { current: 2, target: 3, label: 'Village slimes defeated' },
		rewardSummary: '6 XP / 12 coins / 1 item'
	};
}

function mockGuildOffer(): HudQuestOffer {
	return {
		questId: 'thin-ruins-slimes',
		title: 'Thin Ruins Slimes',
		description: 'Reduce the slime presence inside the ruin threshold.',
		objective: 'Defeat slimes in the ruins.',
		rewardSummary: '8 XP / 16 coins / 1 item'
	};
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
		// hands focus back (fallback: the menu button) — never <body>.
		emitHudState(baseHudState());
		await expect.element(menuButton).toHaveFocus();
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
								artPath: '/game/assets/heroic-ui/enemies/slime-scout.png'
							}
						],
						ribbon: [
							{ unitId: 'hero', readyAt: 0 },
							{ unitId: 'encounter:unit:0', readyAt: 200 }
						],
						feed: [
							{ id: 1, kind: 'hit', amount: 4, subject: 'Slime Scout' },
							{ id: 2, kind: 'hurt', amount: 2, subject: 'Liam' }
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
			await expect.element(page.getByTestId('battle-tile-heal')).toBeVisible();
			await expect.element(page.getByTestId('battle-tile-item')).toBeVisible();
			await expect.element(page.getByTestId('battle-tile-flee')).toBeVisible();
			// Field chrome is hidden during battle (mockup composition).
			expect(page.getByTestId('hud-party-panel').elements()).toHaveLength(0);
			expect(page.getByRole('button', { name: /menu/i }).elements()).toHaveLength(0);
		});

		it('marks the current target and cycles via plate click', async () => {
			await withCommands(async (commands) => {
				render(GameShell);
				emitHudState(baseHudState(activeBattle()));

				const plate = page.getByTestId('battle-plate');
				await expect.element(plate).toHaveAttribute('aria-pressed', 'true');

				await plate.click();

				expect(commands).toContainEqual({ type: 'battle-cycle-target', direction: 1 });
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
				artPath: '/game/assets/heroic-ui/enemies/slime-scout.png'
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
							{ id: 2, kind: 'hurt', amount: 2, subject: 'Liam' },
							{ id: 3, kind: 'heal', amount: 6, subject: 'Liam' },
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
					battle: { phase: 'active', summary: null, active: null }
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

	it('closes the command grid on Escape and returns focus to the menu button', async () => {
		render(GameShell);
		emitHudState(baseHudState({ heals: 2 }));

		const menuButton = page.getByRole('button', { name: /menu/i });
		await menuButton.click();
		// Rest stays on the grid (Bag/Gear would navigate to an overlay).
		await page.getByRole('button', { name: 'Rest' }).click();
		await expect.element(page.getByRole('button', { name: 'Rest' })).toHaveFocus();

		await userEvent.keyboard('{Escape}');
		expect(page.getByRole('button', { name: 'Rest' }).elements()).toHaveLength(0);
		await expect.element(menuButton).toHaveFocus();
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

			// Opening the grid itself pauses the game; Skill adds no further command.
			const fieldCommands = commands.filter(
				(command) => (command as { type?: string }).type !== 'pause-game'
			);
			expect(fieldCommands).toEqual([]);

			await userEvent.keyboard('{Escape}');
			expect(dialog.elements()).toHaveLength(0);
			await expect.element(page.getByRole('button', { name: /menu/i })).toHaveFocus();
		});
	});
});

describe('GameShell inventory', () => {
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

	it('restores field focus after closing the quest journal', async () => {
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

		const menuButton = page.getByRole('button', { name: /menu/i });
		await menuButton.click();
		await page.getByRole('button', { name: 'Quest', exact: true }).click();
		const questDialog = page.getByRole('dialog', { name: /quest log/i });
		await expect.element(questDialog).toBeVisible();

		await userEvent.keyboard('{Escape}');
		expect(questDialog.elements()).toHaveLength(0);
		// Final review: closing the journal used to drop focus to body.
		await expect.element(menuButton).toHaveFocus();
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
					side: [],
					completed: [],
					guildOffer: null
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
	it('differentiates main, side, and offered quests in the roster', async () => {
		render(GameShell);
		emitHudState(
			baseHudState({
				quests: {
					main: mockMainQuest(),
					side: [mockSideQuest()],
					completed: [],
					guildOffer: {
						giverNpcId: 'guild-master',
						giverName: 'Guild Master',
						quests: [mockGuildOffer()]
					}
				}
			})
		);

		const questDialog = await openQuestLog();
		const main = questDialog.getByTestId('quest-entry-main');
		const side = questDialog.getByTestId('quest-entry-side');
		const offer = questDialog.getByTestId('quest-entry-offer');

		await expect.element(main).toBeVisible();
		await expect.element(side).toBeVisible();
		await expect.element(offer).toBeVisible();

		// Main quest is selected by default (cream-gold treatment); the offer
		// row carries the dimmed offered treatment.
		await expect.element(main).toHaveClass(/quest-entry-selected/);
		await expect.element(side).not.toHaveClass(/quest-entry-selected/);
		await expect.element(offer).toHaveClass(/quest-entry-offered/);
		await expect.element(offer.getByText('Offered')).toBeVisible();

		// Selecting another entry moves the selection.
		await side.click();
		await expect.element(side).toHaveClass(/quest-entry-selected/);
		await expect.element(main).not.toHaveClass(/quest-entry-selected/);
	});

	it('renders the selected quest detail with objective chain and rewards', async () => {
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

		const questDialog = await openQuestLog();
		const detail = questDialog.getByTestId('quest-detail');
		await expect.element(detail).toBeVisible();

		// Objective chain: one node per main-quest objective, current first.
		const chainNodes = questDialog.getByTestId('quest-chain-node').elements();
		expect(chainNodes).toHaveLength(2);
		await expect.element(detail.getByText('Ruins Warden', { exact: true })).toBeVisible();
		expect(
			chainNodes.filter((node) => node.classList.contains('quest-chain-node-current'))
		).toHaveLength(1);

		// Reward cards render structured values from the quest definition.
		await expect.element(detail.getByTestId('quest-reward-xp')).toHaveTextContent('15');
		await expect.element(detail.getByTestId('quest-reward-coins')).toHaveTextContent('35');
		await expect.element(detail.getByTestId('quest-reward-item')).toHaveTextContent('x1');

		// Giver comes from the static quest content, with the map location line
		// under the name; the map-context card pins the same location.
		await expect.element(detail.getByText('Guild Master Arlen')).toBeVisible();
		await expect
			.element(questDialog.getByTestId('quest-giver-location'))
			.toHaveTextContent('Guild Hall');
		await expect.element(questDialog.getByTestId('quest-map-pin')).toHaveTextContent('Guild Hall');

		// Live objective progress from the HUD payload.
		await expect.element(detail.getByText(/Clues found: 1 \/ 3/)).toBeVisible();
		// The live objective sentence renders in the detail panel.
		await expect.element(detail.getByText('Enter the ruins and investigate.')).toBeVisible();
	});

	it('renders chapter progress from real main-quest objectives', async () => {
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

		const questDialog = await openQuestLog();
		const panel = questDialog.getByTestId('quest-chapter-progress');
		await expect.element(panel).toBeVisible();

		// Percentage = completed / total main-quest objectives (the mock's
		// objective falls back to the first chain node → 0 of 2 done).
		await expect.element(panel.getByText('0%')).toBeVisible();

		// One row per main-quest objective; exactly one current row.
		const rows = questDialog.getByTestId('quest-progress-row').elements();
		expect(rows).toHaveLength(2);
		expect(rows.filter((row) => row.classList.contains('quest-chapter-row-current'))).toHaveLength(
			1
		);
		await expect.element(panel.getByText('Guild Master')).toBeVisible();
		await expect.element(panel.getByText('Ruins Warden')).toBeVisible();

		// The current row's count is the real live HUD progress.
		await expect.element(panel.getByText('1 / 3')).toBeVisible();
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
							x: 2_560,
							y: 6_016,
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
	const summaryState = {
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
	} as const;

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
				bustPath: '/game/assets/heroic-ui/busts/quartermaster-vale.png',
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
		await expect.element(page.getByTestId('quest-entry-offer').getByText('Offered')).toBeVisible();
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
	let stubPad: { buttons: Array<{ pressed: boolean }>; axes: number[] };

	function installPadStub() {
		stubPad = {
			buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
			axes: [0, 0]
		};
		vi.stubGlobal('navigator', { getGamepads: () => [stubPad] });
	}

	function padFrames(count = 2): Promise<void> {
		return new Promise((resolve) => {
			const step = (remaining: number) =>
				remaining <= 0 ? resolve() : requestAnimationFrame(() => step(remaining - 1));
			step(count);
		});
	}

	async function press(buttonIndex: number) {
		stubPad.buttons[buttonIndex].pressed = true;
		await padFrames();
		stubPad.buttons[buttonIndex].pressed = false;
		await padFrames();
	}

	async function tiltAxis(x: number, y: number) {
		stubPad.axes = [x, y];
		await padFrames();
		stubPad.axes = [0, 0];
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

	it('drives the UI from a pad in a sparse gamepad slot', async () => {
		stubPad = {
			buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
			axes: [0, 0]
		};
		// Browsers pad disconnected slots with null (final-review finding 7).
		vi.stubGlobal('navigator', { getGamepads: () => [null, null, stubPad] });
		render(GameShell);
		emitHudState(baseHudState());

		await press(9);
		await expect.element(page.getByRole('button', { name: 'Bag' })).toBeVisible();
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

		// Rest below Gear is disabled (heals: 0): focus stays.
		await tiltAxis(0, 0.8);
		expect(focusedFocusId()).toBe('field-cmd-gear');

		await tiltAxis(0, -0.8);
		expect(focusedFocusId()).toBe('field-cmd-gear');

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
							x: 2_560,
							y: 6_016,
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
									artPath: '/game/assets/heroic-ui/enemies/slime-scout.png'
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
		expect(glyphTextIn(hints!)).toEqual(['keys:↵', 'keys:↵']);
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
								artPath: '/game/assets/heroic-ui/enemies/slime-scout.png'
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
