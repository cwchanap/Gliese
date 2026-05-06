import { expect, test } from '@playwright/test';

type HudStateSnapshot = {
	status?: string;
	nearbyShop?: { shopId?: string; merchantName?: string } | null;
};

type GlieseProbeWindow = Window & {
	__glieseLastHudState?: HudStateSnapshot;
};

test('game route boots', async ({ page }) => {
	await page.goto('/game');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
});

test('inventory overlay opens from the menu', async ({ page }) => {
	await page.goto('/game');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Inventory' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	const inventorySlotGrid = inventoryDialog.getByTestId('inventory-slot-grid');
	await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
	await expect(inventoryDialog.getByTestId('inventory-slot')).toHaveCount(24);
	await expect
		.soft(
			await inventorySlotGrid.evaluate(
				(element) => getComputedStyle(element).gridTemplateColumns.split(' ').length
			)
		)
		.toBe(6);
	await expect
		.soft(
			await inventorySlotGrid.evaluate(
				(element) => getComputedStyle(element).gridTemplateRows.split(' ').length
			)
		)
		.toBe(4);
	await expect(inventoryDialog.getByLabel('Field Potion')).toBeVisible();

	await page.getByRole('tab', { name: 'Equipment' }).click();
	await expect(inventoryDialog.getByTestId('inventory-slot')).toHaveCount(24);
	await expect(inventoryDialog.getByLabel('Training Sword')).toBeVisible();
	await expect(inventoryDialog.getByRole('button', { name: 'Equipped' })).toBeVisible();
});

test('full hp potions explain why they cannot be consumed', async ({ page }) => {
	await page.goto('/game');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	const healButton = page.getByRole('button', { name: 'Use Heal' });

	await expect(healButton).toBeEnabled();
	await healButton.click();
	await expect(page.getByText('HP already full')).toBeVisible();

	await page.getByRole('button', { name: 'Inventory' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	const fieldPotionSlot = inventoryDialog.getByLabel('Field Potion');
	await expect(fieldPotionSlot).toBeVisible();
	await expect(fieldPotionSlot.getByRole('button', { name: 'Use' })).toBeEnabled();
});

test('shop overlay opens near a merchant and supports buying and selling', async ({ page }) => {
	const save = {
		version: 3,
		mapId: 'item-shop',
		player: {
			level: 1,
			xp: 0,
			hp: 20,
			attack: 3,
			x: 256,
			y: 144,
			facing: 'up'
		},
		flags: { clearedEncounters: [], collectedPickups: [], resolvedEncounterDrops: {} },
		inventory: {
			stacks: [{ itemId: 'field-potion', quantity: 1 }],
			equipment: ['training-sword']
		},
		equipment: {
			weapon: 'training-sword',
			head: null,
			body: null,
			hands: null,
			accessory: null
		},
		wallet: { coins: 30 },
		shops: {
			stock: {
				'guild-quartermaster': {
					'iron-cap': 1,
					'grip-wraps': 1,
					'traveler-vest': 1
				}
			}
		}
	};

	await page.addInitScript((encoded) => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseLastHudState = undefined;
		window.addEventListener('gliese:hud-state', (event) => {
			probeWindow.__glieseLastHudState = (event as CustomEvent<HudStateSnapshot>).detail;
		});
		window.localStorage.setItem('gliese.save.v3', encoded);
	}, JSON.stringify(save));
	await page.goto('/game');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Resume Save' }).click();
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;

		return state?.nearbyShop?.shopId === 'miras-item-shop' || state?.status?.startsWith('Mira:');
	});
	await page.getByRole('button', { name: 'Menu' }).click();
	const shopButton = page.getByRole('button', { name: 'Shop' });
	await expect(shopButton).toBeEnabled();
	await shopButton.click();

	await expect(page.getByRole('heading', { name: "Mira's Item Shop" })).toBeVisible();
	await expect(page.getByText('Coins: 30')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Field Potion', exact: true })).toBeVisible();

	await page.getByRole('button', { name: 'Buy Field Potion', exact: true }).click();
	await expect(page.getByText('Coins: 20')).toBeVisible();

	await page.getByRole('tab', { name: 'Sell' }).click();
	await page.getByRole('button', { name: 'Sell Field Potion', exact: true }).click();
	await expect(page.getByText('Coins: 25')).toBeVisible();
});

test('interact key shop purchase appears in inventory', async ({ page }) => {
	const save = {
		version: 3,
		mapId: 'item-shop',
		player: {
			level: 1,
			xp: 0,
			hp: 20,
			attack: 3,
			x: 256,
			y: 144,
			facing: 'up'
		},
		flags: { clearedEncounters: [], collectedPickups: [], resolvedEncounterDrops: {} },
		inventory: {
			stacks: [{ itemId: 'field-potion', quantity: 1 }],
			equipment: ['training-sword']
		},
		equipment: {
			weapon: 'training-sword',
			head: null,
			body: null,
			hands: null,
			accessory: null
		},
		wallet: { coins: 30 },
		shops: {
			stock: {
				'guild-quartermaster': {
					'iron-cap': 1,
					'grip-wraps': 1,
					'traveler-vest': 1
				}
			}
		}
	};

	await page.addInitScript((encoded) => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseLastHudState = undefined;
		window.addEventListener('gliese:hud-state', (event) => {
			probeWindow.__glieseLastHudState = (event as CustomEvent<HudStateSnapshot>).detail;
		});
		window.localStorage.setItem('gliese.save.v3', encoded);
	}, JSON.stringify(save));
	await page.goto('/game');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Resume Save' }).click();
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;

		return state?.nearbyShop?.shopId === 'miras-item-shop' || state?.status?.startsWith('Mira:');
	});

	await page.locator('canvas').click();
	await page.keyboard.press('KeyE');

	const shopDialog = page.getByRole('dialog', { name: "Mira's Item Shop" });
	await expect(shopDialog).toBeVisible();
	await shopDialog.getByRole('button', { name: 'Buy Field Potion', exact: true }).click();
	await expect(shopDialog.getByText('Coins: 20')).toBeVisible();
	await shopDialog.getByRole('button', { name: 'Close' }).click();

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Inventory' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	const fieldPotionSlot = inventoryDialog.getByLabel('Field Potion');
	await expect(inventoryDialog.getByTestId('inventory-slot')).toHaveCount(24);
	await expect(fieldPotionSlot).toBeVisible();
	await expect(fieldPotionSlot.getByText('x2')).toBeVisible();
});
