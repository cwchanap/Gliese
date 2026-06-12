import { expect, test, type Page } from '@playwright/test';

type HudStateSnapshot = {
	status?: string;
	nearbyShop?: { shopId?: string; merchantName?: string } | null;
};

type GlieseProbeWindow = Window & {
	__glieseLastHudState?: HudStateSnapshot;
};

function commandBox(page: Page, name = 'Command') {
	return page.getByRole('region', { name });
}

function fieldStatus(page: Page) {
	return page.getByRole('status', { name: 'Field status' });
}

function createQuestFixture() {
	return {
		entries: {
			'investigate-the-ruins': {
				status: 'active',
				currentObjectiveId: 'talk-to-guild-master',
				progress: 0,
				rewardApplied: false,
				countedSourceIds: []
			}
		},
		completedObjectives: {}
	};
}

type SaveFixtureOverrides = Partial<{
	mapId: string;
	player: {
		level: number;
		xp: number;
		hp: number;
		attack: number;
		x: number;
		y: number;
		facing: string;
	};
	inventory: {
		stacks: { itemId: string; quantity: number }[];
		equipment: string[];
	};
	equipment: {
		weapon: string | null;
		head: string | null;
		body: string | null;
		hands: string | null;
		accessory: string | null;
	};
	wallet: { coins: number };
}>;

function createSaveFixture(overrides: SaveFixtureOverrides = {}) {
	return {
		version: 6,
		mapExploration: {},
		mapId: overrides.mapId ?? 'meadow-entry',
		player: overrides.player ?? {
			level: 1,
			xp: 0,
			hp: 20,
			attack: 3,
			x: 256,
			y: 144,
			facing: 'down'
		},
		flags: {
			clearedEncounters: [],
			clearedEncounterUnitCounts: {},
			collectedPickups: [],
			resolvedEncounterDrops: {}
		},
		inventory: overrides.inventory ?? {
			stacks: [{ itemId: 'field-potion', quantity: 1 }],
			equipment: ['training-sword']
		},
		equipment: overrides.equipment ?? {
			weapon: 'training-sword',
			head: null,
			body: null,
			hands: null,
			accessory: null
		},
		wallet: overrides.wallet ?? { coins: 30 },
		shops: {
			stock: {
				'guild-quartermaster': {
					'iron-cap': 1,
					'grip-wraps': 1,
					'traveler-vest': 1
				}
			}
		},
		quests: createQuestFixture()
	};
}

function injectSave(page: Page, save: ReturnType<typeof createSaveFixture>) {
	return page.addInitScript((encoded) => {
		window.localStorage.setItem('gliese.save.v6', encoded);
	}, JSON.stringify(save));
}

test('game route boots', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	const viewport = page.viewportSize();
	const locationPanel = page.getByTestId('hud-location-panel');
	const minimap = page.getByTestId('hud-minimap');
	const partyPanel = page.getByTestId('hud-party-panel');
	const questTracker = page.getByTestId('hud-side-panel');
	await expect(locationPanel).toBeVisible();
	await expect(minimap).toBeVisible();
	await expect(partyPanel).toBeVisible();
	await expect(questTracker).toBeVisible();

	const locationBox = await locationPanel.boundingBox();
	const minimapBox = await minimap.boundingBox();
	const partyBox = await partyPanel.boundingBox();
	const questBox = await questTracker.boundingBox();
	expect(locationBox?.x).toBeLessThan(40);
	expect(locationBox?.y).toBeLessThan(40);
	expect(minimapBox?.y).toBeLessThan(40);
	expect((minimapBox?.x ?? 0) + (minimapBox?.width ?? 0)).toBeGreaterThan(
		(viewport?.width ?? 0) - 40
	);
	expect(partyBox?.x).toBeLessThan(40);
	expect((partyBox?.y ?? 0) + (partyBox?.height ?? 0)).toBeGreaterThan(
		(viewport?.height ?? 0) - 40
	);
	expect((questBox?.x ?? 0) + (questBox?.width ?? 0)).toBeGreaterThan((viewport?.width ?? 0) - 40);
	expect((questBox?.y ?? 0) + (questBox?.height ?? 0)).toBeGreaterThan(
		(viewport?.height ?? 0) - 40
	);

	await page.getByRole('button', { name: 'Menu' }).click();
	await expect(commandBox(page)).toBeVisible();
	const commandBounds = await commandBox(page).boundingBox();
	expect((commandBounds?.y ?? 0) + (commandBounds?.height ?? 0)).toBeLessThan(
		(viewport?.height ?? 0) * 0.78
	);
});

test('encounter opens battle scene and returns through battle summary', async ({ page }) => {
	const save = createSaveFixture({
		player: {
			level: 1,
			xp: 0,
			hp: 200,
			attack: 50,
			x: 4_960,
			y: 960,
			facing: 'down'
		}
	});

	await injectSave(page, save);
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();

	const battleSummary = page.getByRole('dialog', { name: /battle summary/i });
	await expect(battleSummary).toBeVisible({ timeout: 30_000 });
	await expect(battleSummary.getByText(/Enemies defeated: (?:[1-9]|10)/i)).toBeVisible();
	await battleSummary.getByRole('button', { name: /continue/i }).click();
	await expect(battleSummary).toHaveCount(0);
	await expect(fieldStatus(page)).toContainText('Returned from battle');
});

test('mobile HUD stacks without overlapping controls', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();

	const viewport = page.viewportSize();
	const menuButton = page.getByRole('button', { name: 'Menu' });
	const locationPanel = page.getByTestId('hud-location-panel');
	const minimap = page.getByTestId('hud-minimap');
	const partyPanel = page.getByTestId('hud-party-panel');
	const questTracker = page.getByTestId('hud-side-panel');
	const fieldStatusMessage = fieldStatus(page);
	await expect(menuButton).toBeVisible();
	await expect(locationPanel).toBeVisible();
	await expect(minimap).toBeVisible();
	await expect(partyPanel).toBeVisible();
	await expect(questTracker).toBeVisible();
	await expect(fieldStatusMessage).toBeVisible();

	const menuBox = await menuButton.boundingBox();
	const locationBox = await locationPanel.boundingBox();
	const minimapBox = await minimap.boundingBox();
	const partyBox = await partyPanel.boundingBox();
	const questBox = await questTracker.boundingBox();
	const fieldStatusBox = await fieldStatusMessage.boundingBox();
	expect(menuBox).not.toBeNull();
	expect(locationBox).not.toBeNull();
	expect(minimapBox).not.toBeNull();
	expect(partyBox).not.toBeNull();
	expect(questBox).not.toBeNull();
	expect(fieldStatusBox).not.toBeNull();
	const locationRight = locationBox!.x + locationBox!.width;
	const minimapBottom = minimapBox!.y + minimapBox!.height;
	const partyTop = partyBox!.y;
	const questBottom = questBox!.y + questBox!.height;
	const questRight = questBox!.x + questBox!.width;
	const fieldStatusRight = fieldStatusBox!.x + fieldStatusBox!.width;
	expect(locationRight).toBeLessThan(minimapBox!.x - 8);
	expect(menuBox!.y).toBeGreaterThan(minimapBottom + 8);
	expect(questBottom).toBeLessThan(partyTop - 8);
	expect(questRight).toBeLessThanOrEqual((viewport?.width ?? 0) - 8);
	expect(fieldStatusBox!.width).toBeLessThan((viewport?.width ?? 0) * 0.75);
	expect(fieldStatusRight).toBeLessThanOrEqual((viewport?.width ?? 0) - 8);
});

test('inventory overlay opens from the menu', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Inventory' }).click();

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
	const fieldPotionSlot = inventoryDialog.getByLabel('Field Potion');
	await expect(fieldPotionSlot.getByRole('img', { name: 'Field Potion' })).toBeVisible();
	await expect(fieldPotionSlot.getByText('Restores 8 HP.')).toHaveCount(0);
	await expect(fieldPotionSlot.getByRole('button', { name: 'Use' })).toHaveCount(0);

	await page.getByRole('tab', { name: 'Equipment' }).click();
	await expect(inventoryDialog.getByTestId('inventory-slot')).toHaveCount(24);
	const trainingSwordSlot = inventoryDialog.getByLabel('Training Sword');
	await expect(trainingSwordSlot).toBeVisible();
	await expect(trainingSwordSlot.getByRole('img', { name: 'Training Sword' })).toBeVisible();
	await expect(trainingSwordSlot.getByRole('button', { name: /Equip|Equipped/ })).toHaveCount(0);
	await expect(trainingSwordSlot.getByText('Equipped')).toBeVisible();
});

test('area map opens from the menu and closes back to field HUD', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Map' }).click();

	const mapDialog = page.getByRole('dialog', { name: /map$/i });
	await expect(mapDialog).toBeVisible();
	await expect(mapDialog.getByTestId('area-map-svg')).toBeVisible();
	await expect(mapDialog.getByTestId('area-map-player')).toBeVisible();

	await mapDialog.getByRole('button', { name: 'Close' }).click();
	await expect(mapDialog).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
	await expect(fieldStatus(page)).toBeVisible();
});

test('language preference shows Japanese chrome and keeps Japanese selected', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	let languageSelect = page.getByLabel('Language');
	await expect(languageSelect).toBeVisible();
	await languageSelect.selectOption('ja');
	languageSelect = page.getByLabel('言語');
	await expect(languageSelect).toHaveValue('ja');
	await page.getByRole('button', { name: '閉じる' }).click();
	await expect(languageSelect).toHaveCount(0);

	await page.getByRole('button', { name: 'メニュー' }).click();
	await commandBox(page, 'コマンド').getByRole('button', { name: '持ち物' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: '持ち物' });
	await expect(inventoryDialog).toBeVisible();
	await expect(inventoryDialog.getByRole('heading', { name: '持ち物' })).toBeVisible();
	await expect(inventoryDialog.getByRole('tab', { name: '消耗品' })).toBeVisible();
	await inventoryDialog.getByRole('button', { name: '閉じる' }).click();

	await page.getByRole('button', { name: 'メニュー' }).click();
	await expect(page.getByLabel('言語')).toHaveValue('ja');
});

test('full hp potions explain why they cannot be consumed', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Inventory' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	const fieldPotionSlot = inventoryDialog.getByLabel('Field Potion');
	await expect(fieldPotionSlot).toBeVisible();
	await expect(fieldPotionSlot.getByRole('button', { name: 'Use' })).toHaveCount(0);
	await fieldPotionSlot.hover();
	await expect(page.getByRole('tooltip')).toContainText('Restores 8 HP.');
	await fieldPotionSlot.dblclick();
	await inventoryDialog.getByRole('button', { name: 'Close' }).click();
	await page.getByRole('button', { name: 'Menu' }).click();
	await expect(fieldStatus(page)).toContainText('HP already full');
});

test('double-clicking unequipped equipment equips it from inventory', async ({ page }) => {
	const save = createSaveFixture({
		inventory: {
			stacks: [{ itemId: 'field-potion', quantity: 1 }],
			equipment: ['training-sword', 'iron-cap']
		}
	});

	await injectSave(page, save);
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Inventory' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	await page.getByRole('tab', { name: 'Equipment' }).click();
	const ironCapSlot = inventoryDialog.getByLabel('Iron Cap');
	await expect(ironCapSlot.getByRole('img', { name: 'Iron Cap' })).toBeVisible();
	await expect(ironCapSlot.getByText('head')).toBeVisible();
	await ironCapSlot.dblclick();
	await expect(ironCapSlot.getByText('Equipped')).toBeVisible();
});

test('shop overlay opens near a merchant and supports buying and selling', async ({ page }) => {
	const save = createSaveFixture({
		mapId: 'item-shop',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 256, y: 144, facing: 'up' }
	});

	await page.addInitScript((encoded) => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseLastHudState = undefined;
		window.addEventListener('gliese:hud-state', (event) => {
			probeWindow.__glieseLastHudState = (event as CustomEvent<HudStateSnapshot>).detail;
		});
		window.localStorage.setItem('gliese.save.v6', encoded);
	}, JSON.stringify(save));
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;

		return state?.nearbyShop?.shopId === 'miras-item-shop' || state?.status?.startsWith('Mira:');
	});
	await page.getByRole('button', { name: 'Menu' }).click();
	const shopButton = commandBox(page).getByRole('button', { name: 'Shop' });
	await expect(shopButton).toBeEnabled();
	await shopButton.click();

	await expect(page.getByRole('heading', { name: "Mira's Item Shop" })).toBeVisible();
	await expect(page.getByText('Coins: 30')).toBeVisible();
	const buyGrid = page.getByTestId('shop-buy-grid');
	await expect
		.soft(
			await buyGrid.evaluate(
				(element) => getComputedStyle(element).gridTemplateColumns.split(' ').length
			)
		)
		.toBe(6);
	const fieldPotionBuyTile = buyGrid.getByLabel('Field Potion', { exact: true });
	await expect(fieldPotionBuyTile.getByRole('img', { name: 'Field Potion' })).toBeVisible();
	await expect(fieldPotionBuyTile.getByText('Restores 8 HP.')).toHaveCount(0);
	await expect(fieldPotionBuyTile.getByRole('button', { name: 'Buy' })).toHaveCount(0);
	await fieldPotionBuyTile.hover();
	await expect(page.getByRole('tooltip')).toContainText('Restores 8 HP.');

	await fieldPotionBuyTile.dblclick();
	await expect(page.getByText('Coins: 20')).toBeVisible();

	await page.getByRole('tab', { name: 'Sell' }).click();
	const sellGrid = page.getByTestId('shop-sell-grid');
	await expect
		.soft(
			await sellGrid.evaluate(
				(element) => getComputedStyle(element).gridTemplateColumns.split(' ').length
			)
		)
		.toBe(6);
	const fieldPotionSellTile = sellGrid.getByLabel('Field Potion', { exact: true });
	await expect(fieldPotionSellTile.getByRole('img', { name: 'Field Potion' })).toBeVisible();
	await expect(fieldPotionSellTile.getByText('Restores 8 HP.')).toHaveCount(0);
	await expect(fieldPotionSellTile.getByRole('button', { name: 'Sell' })).toHaveCount(0);
	await fieldPotionSellTile.hover();
	await expect(page.getByRole('tooltip')).toContainText('Restores 8 HP.');
	await fieldPotionSellTile.dblclick();
	await expect(page.getByText('Coins: 25')).toBeVisible();
});

test('interact key shop purchase appears in inventory', async ({ page }) => {
	const save = createSaveFixture({
		mapId: 'item-shop',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 256, y: 144, facing: 'up' }
	});

	await page.addInitScript((encoded) => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseLastHudState = undefined;
		window.addEventListener('gliese:hud-state', (event) => {
			probeWindow.__glieseLastHudState = (event as CustomEvent<HudStateSnapshot>).detail;
		});
		window.localStorage.setItem('gliese.save.v6', encoded);
	}, JSON.stringify(save));
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;

		return state?.nearbyShop?.shopId === 'miras-item-shop' || state?.status?.startsWith('Mira:');
	});

	await page.locator('canvas').click();
	await page.keyboard.press('e', { delay: 50 });

	const miraDialog = page.getByRole('dialog', { name: 'Mira' });
	await expect(miraDialog).toBeVisible();
	await expect(miraDialog.getByRole('button', { name: 'Next' })).toHaveCount(0);
	await miraDialog.getByRole('button', { name: 'Shop' }).click();

	const shopDialog = page.getByRole('dialog', { name: "Mira's Item Shop" });
	await expect(shopDialog).toBeVisible();
	await shopDialog
		.getByTestId('shop-buy-grid')
		.getByLabel('Field Potion', { exact: true })
		.dblclick();
	await expect(shopDialog.getByText('Coins: 20')).toBeVisible();
	await shopDialog.getByRole('button', { name: 'Close' }).click();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Inventory' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	const fieldPotionSlot = inventoryDialog.getByLabel('Field Potion');
	await expect(inventoryDialog.getByTestId('inventory-slot')).toHaveCount(24);
	await expect(fieldPotionSlot).toBeVisible();
	await expect(fieldPotionSlot.getByText('x2')).toBeVisible();
});

test('quest log shows main quest and accepts Guild side quests', async ({ page }) => {
	const save = createSaveFixture({
		mapId: 'guild-hall',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 192, y: 144, facing: 'up' }
	});

	await page.addInitScript((encoded) => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseLastHudState = undefined;
		window.addEventListener('gliese:hud-state', (event) => {
			probeWindow.__glieseLastHudState = (event as CustomEvent<HudStateSnapshot>).detail;
		});
		window.localStorage.setItem('gliese.save.v6', encoded);
	}, JSON.stringify(save));
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
	await expect(page.getByText('Talk to the Guild Master')).toBeVisible();
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;
		return state?.status?.includes('Guild Master');
	});

	await page.locator('canvas').click();
	await page.keyboard.press('e', { delay: 50 });
	const guildMasterDialog = page.getByRole('dialog', { name: 'Guild Master Arlen' });
	await expect(guildMasterDialog).toBeVisible({ timeout: 10_000 });
	await expect(guildMasterDialog.getByText(/eastern ruins are stirring/i)).toBeVisible();
	await guildMasterDialog.getByRole('button', { name: 'Next' }).click();
	await guildMasterDialog.getByRole('button', { name: 'Next' }).click();
	await guildMasterDialog.getByRole('button', { name: 'Quest' }).click();
	await guildMasterDialog.getByRole('button', { name: 'Thin Village Slimes' }).click();
	await expect(guildMasterDialog.getByText(/Defeat slimes near the village/i)).toBeVisible();
	await guildMasterDialog.getByRole('button', { name: 'Accept' }).click();
	await expect(guildMasterDialog).toHaveCount(0);

	await page.getByRole('button', { name: 'Menu' }).click();
	await expect(fieldStatus(page)).toContainText(/^Quest accepted\.?$/);
	await expect(page.getByRole('button', { name: 'Guild Quests' })).toHaveCount(0);
	await commandBox(page).getByRole('button', { name: 'Quests', exact: true }).click();

	const questDialog = page.getByRole('dialog', { name: 'Quest Log' });
	await expect(questDialog).toBeVisible();
	await expect(questDialog.getByText('Investigate the Ruins')).toBeVisible();
	await expect(questDialog.getByText('Defeat the ruins warden in the ruins core.')).toBeVisible();
	await expect(questDialog.getByText('Thin Village Slimes')).toBeVisible();
	await expect(questDialog.getByText('Village slimes defeated: 0 / 3')).toBeVisible();
});
