import { expect, test, type Page } from '@playwright/test';
import { startNewRunFromTitle } from '../e2e/helpers/game';

// A real serialized SaveState (createNewSaveState()) used to seed slot records
// so the captures exercise the same filled-card treatments as the mockups.
const SEED_SAVE_STATE =
	'{"version":9,"mapId":"meadow-entry","player":{"level":1,"xp":0,"hp":20,"attack":3,"x":704,"y":5920,"facing":"up"},"flags":{"clearedEncounters":[],"clearedEncounterUnitCounts":{},"collectedPickups":[],"resolvedEncounterDrops":{}},"inventory":{"stacks":[{"itemId":"field-potion","quantity":1}],"equipment":["training-sword"]},"equipment":{"weapon":"training-sword","head":null,"body":null,"hands":null,"accessory":null},"wallet":{"coins":30},"shops":{"stock":{"guild-quartermaster":{"iron-cap":1,"grip-wraps":1,"traveler-vest":1},"sundrop-forge":{"training-sword":1,"iron-cap":1,"grip-wraps":1,"traveler-vest":1}}},"quests":{"entries":{"investigate-the-ruins":{"status":"active","currentObjectiveId":"talk-to-guild-master","progress":0,"rewardApplied":false,"countedSourceIds":[]}},"completedObjectives":{}},"mapExploration":{},"seenDiscoveries":[]}';

// Bag capture seed: the same state with a filled field pack (mockup shows a
// stocked Potions rail plus a worn weapon for the paper-doll panel).
const BAG_SAVE_STATE = JSON.stringify({
	...JSON.parse(SEED_SAVE_STATE),
	inventory: {
		stacks: [
			{ itemId: 'field-potion', quantity: 3 },
			{ itemId: 'greater-field-potion', quantity: 1 },
			{ itemId: 'ember-tonic', quantity: 2 },
			{ itemId: 'ruin-draught', quantity: 1 },
			{ itemId: 'sunleaf-salve', quantity: 1 },
			{ itemId: 'meadow-token', quantity: 1 }
		],
		equipment: ['training-sword']
	}
});

// Shop capture seed: parked at Blacksmith Oren's approach point inside the
// forge (canonical tests/e2e shop path: seeded Continue → interact → dialogue
// Shop action). The default 30-coin purse cannot afford the 45-coin Traveler
// Vest, so the mockup composition (dimmed tile, 20 → 24 MAX HP delta,
// "purse after 30 → -15", disabled action) reproduces exactly.
const SHOP_SAVE_STATE = JSON.stringify({
	...JSON.parse(SEED_SAVE_STATE),
	mapId: 'blacksmith-interior',
	player: { level: 1, xp: 0, hp: 20, attack: 3, x: 448, y: 480, facing: 'up' }
});

// Dialogue capture seed: parked at Mira's approach point inside the item shop
// (canonical approach from village-interiors-v2: npc 416,320 / approach 416,360)
// so the capture matches the source mockup's NPC.
const DIALOGUE_SAVE_STATE = JSON.stringify({
	...JSON.parse(SEED_SAVE_STATE),
	mapId: 'item-shop',
	player: { level: 1, xp: 0, hp: 20, attack: 3, x: 416, y: 360, facing: 'up' }
});

// Quest capture seed: the SEED state parked at the Guild Master's counter
// (canonical tests/e2e quest path) so the journal opens on the live main
// quest and the offered side quest can be accepted through real dialogue.
const QUEST_SAVE_STATE = JSON.stringify({
	...JSON.parse(SEED_SAVE_STATE),
	mapId: 'guild-hall',
	player: { level: 1, xp: 0, hp: 20, attack: 3, x: 800, y: 184, facing: 'up' }
});

// Side-quest progress for the victory pill: the mockup's victory shows the
// "Thin Village Slimes" pill, so the battle seeds carry that quest active.
const BATTLE_QUESTS = {
	entries: {
		'investigate-the-ruins': {
			status: 'active',
			currentObjectiveId: 'talk-to-guild-master',
			progress: 0,
			rewardApplied: false,
			countedSourceIds: []
		},
		'thin-village-slimes': {
			status: 'active',
			currentObjectiveId: 'defeat-village-slimes',
			progress: 0,
			rewardApplied: false,
			countedSourceIds: []
		}
	},
	completedObjectives: {}
};

// Battle capture seed: parked on the meadow slime encounter (canonical
// encounter e2e path). Low attack keeps the fight alive for the capture;
// the large HP pool absorbs the slime counterattacks that feed the feed.
const BATTLE_SAVE_STATE = JSON.stringify({
	...JSON.parse(SEED_SAVE_STATE),
	player: { level: 1, xp: 0, hp: 200, attack: 1, x: 4_960, y: 960, facing: 'down' },
	quests: BATTLE_QUESTS
});

// Victory capture seed: same spot, overwhelming attack so the encounter
// resolves into the victory summary (and advances the side-quest pill).
const VICTORY_SAVE_STATE = JSON.stringify({
	...JSON.parse(SEED_SAVE_STATE),
	player: { level: 1, xp: 0, hp: 200, attack: 50, x: 4_960, y: 960, facing: 'down' },
	quests: BATTLE_QUESTS
});

function seedStateRecord(state: string) {
	return {
		kind: 'autosave' as const,
		savedAt: new Date().toISOString(),
		playtimeSeconds: 6120,
		locationLabel: 'Sundrop Meadows',
		state: JSON.parse(state)
	};
}

function seedRecord(kind: 'autosave' | 'manual', playtimeSeconds: number, locationLabel: string) {
	// playtimeSeconds is formatted as h:mm; 6120 -> "01:42", 3480 -> "00:58".
	return {
		kind,
		savedAt:
			kind === 'autosave'
				? new Date().toISOString()
				: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
		playtimeSeconds,
		locationLabel,
		state: JSON.parse(SEED_SAVE_STATE)
	};
}

function seedSaveSlots(page: Page, slots: unknown[]) {
	return page.addInitScript(
		(encoded) => window.localStorage.setItem('gliese.saves.v1', encoded),
		JSON.stringify({ version: 1, slots })
	);
}

// Heroic UI review captures target the mockup canvas size; every later
// capture case must assert this before screenshotting.
test('review viewport matches the mockup canvas', async ({ page }) => {
	expect(page.viewportSize()).toEqual({ width: 1440, height: 900 });
});

// The root URL lands on the Title screen: Phaser is NOT mounted until the
// player commits to Continue / New Run, so no canvas exists yet.
test('root boots to the Title screen without mounting Phaser', async ({ page }) => {
	await page.goto('/');

	const wordmark = page.locator('.title-wordmark');
	await expect(wordmark).toHaveText('GLIESE');
	await expect(page.locator('.title-chapter-pill')).toContainText('Verdant Region');
	await expect(page.getByRole('button', { name: /Continue/i })).toBeDisabled();
	await expect(page.getByRole('button', { name: /New Run/i })).toBeVisible();
	await expect(page.getByRole('button', { name: /System/ })).toBeVisible();
	await expect(page.locator('canvas')).toHaveCount(0);
});

// Reaches System through a running game (Title → New Run → Menu → System) and
// captures the Heroic System surface for source/runtime comparison at 1440×900.
// Keeps the Task 2 capture framing: the dialog over a freshly booted run.
test('System screen capture through the menu path', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: /New Run/i }).click();
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'System', exact: true }).click();

	const dialog = page.getByRole('dialog', { name: /display & text/i });
	await expect(dialog).toBeVisible();

	// Structural defaults: English / Normal / Quiet / On / Auto, Full unavailable.
	await expect(dialog.getByRole('button', { name: 'English', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(dialog.getByRole('button', { name: 'Normal' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(dialog.getByRole('button', { name: 'Quiet' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(dialog.getByRole('button', { name: 'On', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(dialog.getByRole('button', { name: 'Auto' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(dialog.getByRole('button', { name: 'Full', exact: true })).toBeDisabled();

	// Let the Heroic entrance + stagger settle fully (last row: 300ms delay +
	// 320ms duration ≈ 620ms) before capturing.
	await page.waitForTimeout(700);

	await page.screenshot({
		path: 'docs/visual-references/heroic-ui/runtime/10-system.png'
	});
});

// Field capture: reached through a real New Run, then the Menu toggle opens
// the Heroic 4×2 command grid over the Quiet field HUD (mockup composition:
// hero card + grid left, minimap medallion + quest banner + wallet right).
// A fresh New Run has no active main quest, so the quest banner stays hidden;
// banner rendering is covered structurally by the unit specs.
test('Field HUD capture through a real New Run', async ({ page }) => {
	await startNewRunFromTitle(page);

	await page.getByRole('button', { name: 'Menu' }).click();
	const commandGrid = page.getByRole('region', { name: 'Command' });
	await expect(commandGrid).toBeVisible();

	// The eight field commands in their exact plan order (Bag, Gear, Quest,
	// Map, Skill, Rest, Save, System) with button roles.
	const expectedCommands = ['Bag', 'Gear', 'Quest', 'Map', 'Skill', 'Rest', 'Save', 'System'];
	const focusIds = await commandGrid
		.locator('[data-focus-id]')
		.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-focus-id')));
	expect(focusIds).toEqual(expectedCommands.map((command) => `field-cmd-${command.toLowerCase()}`));
	for (const name of expectedCommands) {
		await expect(commandGrid.getByRole('button', { name, exact: true })).toBeVisible();
	}
	await expect(commandGrid.getByRole('button')).toHaveCount(8);

	// Quiet layout: hero card (name/HP), minimap medallion with location pill,
	// and the wallet pill.
	const heroCard = page.getByTestId('hud-party-panel');
	await expect(heroCard).toBeVisible();
	await expect(heroCard).toContainText('Liam');
	await expect(heroCard).toContainText('HP');
	await expect(heroCard).toContainText('XP');
	const minimap = page.getByTestId('hud-minimap');
	await expect(minimap).toBeVisible();
	await expect(minimap).toContainText('Sundrop Meadows');
	await expect(page.getByTestId('hud-side-panel').getByText(/\d+G/)).toBeVisible();
	// The transient status pill stays a playing-HUD surface only; the mockup's
	// grid-open composition has no bottom-center pill, so it is gated on
	// commandOpen in FieldHud and must be hidden here.
	await expect(page.getByRole('status', { name: 'Field status' })).toBeHidden();
	// Fresh runs auto-activate the main quest, so the banner renders (mockup).
	const questBanner = page.getByTestId('hud-side-panel');
	await expect(questBanner).toContainText('Main Quest');
	await expect(questBanner).toContainText('Investigate the Ruins');

	// Demonstrate the selected-state grammar (mockup shows Bag selected):
	// focus a command so the tan fill + ink icon + gold border/glow renders.
	const bagCommand = commandGrid.getByRole('button', { name: 'Bag', exact: true });
	await bagCommand.focus();
	await expect(bagCommand).toBeFocused();
	// Park the pointer off-UI: the Menu toggle reveals on hover, and the click
	// above leaves the cursor sitting on it.
	await page.mouse.move(720, 450);

	// Let the entrance animation settle before capturing.
	await page.waitForTimeout(700);

	await page.screenshot({
		path: 'docs/visual-references/heroic-ui/runtime/02-field.png'
	});
});

// Title capture: the full Heroic title surface with key art, crest, wordmark,
// chapter pill, and the three action cards. A newest autosave slot is seeded so
// Continue renders as the selected cream-gold card (mockup composition:
// "Sundrop Meadows · 01:42").
test('Title screen capture', async ({ page }) => {
	await seedSaveSlots(page, [seedRecord('autosave', 6120, 'Sundrop Meadows'), null, null]);
	await page.goto('/');

	const wordmark = page.locator('.title-wordmark');
	await expect(wordmark).toHaveText('GLIESE');

	// Structural layout: key art behind, crest above the wordmark, chapter pill,
	// then the Continue / New Run / System card row, then the prompt hints.
	await expect(page.locator('.title-key-art')).toBeVisible();
	await expect(page.locator('.title-crest svg')).toBeVisible();
	await expect(page.locator('.title-chapter-pill')).toContainText('Chapter I');

	// Selected-card treatment: Continue is the enabled cream-gold primary card.
	const continueCard = page.locator('.title-card-primary');
	await expect(continueCard).toContainText('Continue');
	await expect(continueCard).toContainText('Sundrop Meadows · 01:42');
	await expect(page.getByRole('button', { name: /Continue/i })).toBeEnabled();
	await expect(page.getByRole('button', { name: /New Run/i })).toBeVisible();
	await expect(page.getByRole('button', { name: /System/ })).toBeVisible();
	await expect(page.locator('.title-hints .title-hint')).toHaveCount(2);
	await expect(page.locator('canvas')).toHaveCount(0);

	await page.waitForTimeout(700);

	await page.screenshot({
		path: 'docs/visual-references/heroic-ui/runtime/01-title.png'
	});
});

// Save capture: reached through the real game flow (New Run → Menu → Save Game).
// A manual record is seeded in the middle slot so its filled info panel renders
// like the mockup composition (autosave + manual + empty).
test('Save screen capture through the menu path', async ({ page }) => {
	await seedSaveSlots(page, [null, seedRecord('manual', 3480, 'Ruins Threshold'), null]);
	await page.goto('/');
	await page.getByRole('button', { name: /New Run/i }).click();
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Save', exact: true }).click();

	const dialog = page.getByRole('dialog', { name: /^Save$/i });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('Waystone')).toBeVisible();

	// Structural layout: display-only autosave row plus two manual slots.
	await expect(dialog.getByTestId('save-slot-autosave')).toBeVisible();
	await expect(dialog.getByTestId('save-slot-1')).toBeVisible();
	await expect(dialog.getByTestId('save-slot-2')).toBeVisible();
	await expect(dialog.getByTestId('save-slot-1')).toContainText('Ruins Threshold');
	await expect(dialog.getByRole('button', { name: 'Back' })).toBeVisible();

	await page.waitForTimeout(700);

	await page.screenshot({
		path: 'docs/visual-references/heroic-ui/runtime/09-save.png'
	});
});

// Bag capture: reached through the real flow (seeded autosave → Continue →
// Menu → Bag) so the Potions rail renders stocked like the source mockup.
// Selecting a potion demonstrates the gold selected treatment and the detail
// panel with its primary action, mirroring the source composition.
test('Bag screen capture through the menu path', async ({ page }) => {
	await seedSaveSlots(page, [
		{
			kind: 'autosave',
			savedAt: new Date().toISOString(),
			playtimeSeconds: 6120,
			locationLabel: 'Sundrop Meadows',
			state: JSON.parse(BAG_SAVE_STATE)
		},
		null,
		null
	]);
	await page.goto('/');
	await page.getByRole('button', { name: /Continue/i }).click();
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Bag', exact: true }).click();

	const dialog = page.getByRole('dialog', { name: 'Inventory', exact: true });
	await expect(dialog).toBeVisible();

	// Rail: Potions/Gear/Key/Loot, Potions active; wallet pill from the seed.
	for (const category of ['Potions', 'Gear', 'Key', 'Loot']) {
		await expect(dialog.getByRole('tab', { name: category, exact: true })).toBeVisible();
	}
	await expect(dialog.getByRole('tab', { name: 'Potions', exact: true })).toHaveAttribute(
		'aria-selected',
		'true'
	);
	await expect(dialog.getByText('Field Pack')).toBeVisible();
	await expect(dialog.getByLabel('Coins: 30')).toBeVisible();

	// Exactly 24 fixed slots; five stocked potions + worn gear render as tiles.
	await expect(dialog.getByTestId('inventory-slot')).toHaveCount(24);
	await expect(dialog.getByRole('button', { name: 'Field Potion', exact: true })).toBeVisible();

	// WORN panel: paper doll with the five equipment positions around it and
	// the seeded weapon equipped.
	const worn = dialog.getByTestId('inventory-worn');
	await expect(worn).toBeVisible();
	await expect(worn.getByTestId('inventory-paper-doll')).toBeVisible();
	for (const position of ['Head', 'Weapon', 'Body', 'Hands', 'Accessory']) {
		await expect(worn.getByText(position, { exact: true })).toBeVisible();
	}
	await expect(worn.getByRole('button', { name: 'Remove Training Sword' })).toBeVisible();

	// Select the Greater Field Potion (source mockup's selected slot): gold
	// selected treatment + detail panel with the primary action.
	await dialog.getByRole('button', { name: 'Greater Field Potion', exact: true }).click();
	const detail = dialog.getByTestId('inventory-detail');
	await expect(detail.getByText('Greater Field Potion')).toBeVisible();
	await expect(detail.getByRole('button', { name: 'Use' })).toBeVisible();

	await page.waitForTimeout(700);

	await page.screenshot({
		path: 'docs/visual-references/heroic-ui/runtime/03-bag.png'
	});
});

// Skill regression capture: the source shows no Skill screen, so this is a
// structural regression capture of the honest empty surface through the real
// Field command grid.
test('Skill screen regression capture through the menu path', async ({ page }) => {
	await startNewRunFromTitle(page);

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Skill', exact: true }).click();

	const dialog = page.getByRole('dialog', { name: 'Skill', exact: true });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByTestId('skill-empty')).toHaveText('No skills learned yet');
	await expect(dialog.getByRole('button', { name: 'Back' })).toBeVisible();

	await page.waitForTimeout(700);

	await page.screenshot({
		path: 'docs/visual-references/heroic-ui/runtime/skill-regression.png'
	});
});

// Quest journal capture: reached through the real gameplay path (seeded
// Continue inside the Guild Hall → accept the Thin Village Slimes offer via
// Arlen's dialogue → Field grid → Quest command). The roster then shows the
// main quest plus an active side quest, and the detail panel renders the
// objective chain and reward tiles.
test('Quest journal capture through the guild side-quest flow', async ({ page }) => {
	await seedSaveSlots(page, [
		{
			kind: 'autosave',
			savedAt: new Date().toISOString(),
			playtimeSeconds: 6120,
			locationLabel: 'Guild Hall',
			state: JSON.parse(QUEST_SAVE_STATE)
		},
		null,
		null
	]);
	// The multi-confirm dialogue flow assumes instant reveal (click = advance);
	// at the normal speed the first confirm only completes the reveal.
	await page.addInitScript(() =>
		window.localStorage.setItem(
			'gliese.preferences.v1',
			JSON.stringify({ locale: 'en', textSpeed: 'instant', motion: 'on', promptMode: 'auto' })
		)
	);
	await page.goto('/');
	await page.getByRole('button', { name: /Continue/i }).click();
	await expect(page.locator('canvas')).toBeVisible();

	// Talk to Arlen and accept the offered Guild side quest.
	await page.locator('canvas').click();
	await page.keyboard.press('e', { delay: 50 });
	const dialogue = page.getByRole('dialog', { name: 'Guild Master Arlen' });
	await expect(dialogue).toBeVisible({ timeout: 10_000 });
	await dialogue.getByRole('button', { name: 'Next' }).click();
	await dialogue.getByRole('button', { name: 'Next' }).click();
	await dialogue.getByRole('button', { name: 'Quest' }).click();
	await dialogue.getByRole('button', { name: 'Thin Village Slimes' }).click();
	await dialogue.getByRole('button', { name: 'Accept' }).click();
	await expect(dialogue).toHaveCount(0);

	// Field grid → Quest command.
	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Quest', exact: true }).click();

	const dialog = page.getByRole('dialog', { name: 'Quest Log' });
	await expect(dialog).toBeVisible();

	// Roster: main quest preselected (cream-gold treatment), the accepted
	// side quest below it.
	const main = dialog.getByTestId('quest-entry-main');
	await expect(main).toContainText('Investigate the Ruins');
	await expect(main).toHaveClass(/quest-entry-selected/);
	await expect(dialog.getByTestId('quest-entry-side')).toContainText('Thin Village Slimes');

	// Detail: objective chain (talk + warden, warden current after accepting)
	// plus the three structured reward tiles.
	const detail = dialog.getByTestId('quest-detail');
	await expect(detail).toBeVisible();
	await expect(detail.getByText('Ruins Warden', { exact: true })).toBeVisible();
	await expect(dialog.getByTestId('quest-chain-node')).toHaveCount(2);
	await expect(dialog.locator('.quest-chain-node-current')).toHaveCount(1);
	await expect(dialog.getByTestId('quest-reward-xp')).toBeVisible();
	await expect(dialog.getByTestId('quest-reward-coins')).toBeVisible();
	await expect(dialog.getByTestId('quest-reward-item')).toBeVisible();

	await page.waitForTimeout(700);

	await page.screenshot({
		path: 'docs/visual-references/heroic-ui/runtime/05-quest.png'
	});
});

// Area map regression capture: the source shows no area-map canvas, so this
// is a structural regression capture through the real Field grid command.
// The fog/revealed-cell/player/marker logic is untouched; only the chrome
// moved to the Heroic window vocabulary.
test('Area map regression capture through the menu path', async ({ page }) => {
	await startNewRunFromTitle(page);

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Map', exact: true }).click();

	const dialog = page.getByRole('dialog', { name: /Sundrop Meadows map/ });
	await expect(dialog).toBeVisible();

	// Regression guards: fog, player marker, two-entry legend, and the close
	// action all survive the chrome swap.
	await expect(dialog.getByTestId('area-map-svg')).toBeVisible();
	await expect(dialog.locator('.area-map-fog')).toHaveCount(1);
	await expect(dialog.getByTestId('area-map-player')).toBeVisible();
	await expect(dialog.locator('.jrpg-area-map-legend span')).toHaveCount(2);
	await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible();

	await page.waitForTimeout(700);

	await page.screenshot({
		path: 'docs/visual-references/heroic-ui/runtime/map-regression.png'
	});
});

// Shop capture: reached through the real gameplay path (seeded Continue inside
// the forge → interact with Oren → dialogue Shop action). Selecting the
// unaffordable Traveler Vest must render the merchant rail, the dimmed stock
// tile, the canonical stat deltas, the purse-after debt, and a disabled action.
test('Shop screen capture through the merchant dialogue path', async ({ page }) => {
	await seedSaveSlots(page, [
		{
			kind: 'autosave',
			savedAt: new Date().toISOString(),
			playtimeSeconds: 6120,
			locationLabel: 'Sundrop Forge',
			state: JSON.parse(SHOP_SAVE_STATE)
		},
		null,
		null
	]);
	await page.goto('/');
	await page.getByRole('button', { name: /Continue/i }).click();
	await expect(page.locator('canvas')).toBeVisible();

	// Talk to Oren and enter the shop through the dialogue action (the Heroic
	// command grid has no Shop tile).
	await page.locator('canvas').click();
	await page.keyboard.press('e', { delay: 50 });
	const dialogue = page.getByRole('dialog', { name: 'Blacksmith Oren' });
	await expect(dialogue).toBeVisible();
	await dialogue.getByRole('button', { name: 'Shop' }).click();

	const shop = page.getByRole('dialog', { name: 'Sundrop Forge' });
	await expect(shop).toBeVisible();

	// Merchant identity rail: bust art, name, flavor line, purse (before).
	await expect(shop.getByRole('img', { name: 'Blacksmith Oren, merchant portrait' })).toBeVisible();
	await expect(shop.getByText('Blacksmith Oren', { exact: true })).toBeVisible();
	await expect(
		shop.getByText('Village-forged equipment for the road beyond Sundrop.')
	).toBeVisible();
	await expect(shop.getByLabel('Coins: 30')).toBeVisible();

	// Buy/Sell tabs with Buy active.
	await expect(shop.getByRole('tab', { name: 'Buy', exact: true })).toHaveAttribute(
		'aria-selected',
		'true'
	);

	// Select the unaffordable Traveler Vest (mockup composition).
	await shop.getByRole('button', { name: 'Traveler Vest', exact: true }).click();
	const detail = shop.getByTestId('shop-detail');
	await expect(detail.getByText('Traveler Vest')).toBeVisible();

	// Canonical stat deltas from previewEquipmentSwap: MAX HP 20 → 24.
	await expect(detail.getByTestId('shop-delta-maxHp')).toContainText('20');
	await expect(detail.getByTestId('shop-delta-maxHp')).toContainText('24');

	// Wallet after: 30 coins - 45 price = -15 (mockup rose debt row).
	await expect(detail.getByTestId('shop-purse-after')).toContainText('30');
	await expect(detail.getByTestId('shop-purse-after')).toContainText('-15');

	// Unaffordable: the action is a disabled "Not enough" plate.
	await expect(shop.getByRole('button', { name: 'Not enough' })).toBeDisabled();

	await page.waitForTimeout(700);

	await page.screenshot({
		path: 'docs/visual-references/heroic-ui/runtime/04-shop.png'
	});
});

// Battle capture: reached through the real encounter flow (seeded autosave on
// the meadow slime encounter → Continue → hero closes into reach → BattleScene).
// Structural assertions cover the mockup composition: TURN/AUTO ribbon, enemy
// plates, hero plate, combat feed, and the Heal/Item/Flee tiles.
test('Battle HUD capture through a real encounter', async ({ page }) => {
	await seedSaveSlots(page, [seedStateRecord(BATTLE_SAVE_STATE), null, null]);
	await page.goto('/');
	await page.getByRole('button', { name: /Continue/i }).click();

	const battleHud = page.getByTestId('battle-hud');
	await expect(battleHud).toBeVisible({ timeout: 30_000 });

	// Field chrome is replaced by the battle surface.
	await expect(page.getByTestId('hud-party-panel')).toHaveCount(0);

	await expect(page.getByTestId('battle-ribbon')).toBeVisible();
	await expect(page.getByTestId('battle-ribbon')).toContainText(/turn/i);
	await expect(page.getByTestId('battle-ribbon')).toContainText(/auto/i);
	expect(await page.getByTestId('battle-plate').count()).toBeGreaterThanOrEqual(1);
	await expect(page.getByTestId('battle-plate').first()).toContainText('Slime Scout');
	await expect(page.getByTestId('battle-hero-plate')).toBeVisible();
	await expect(page.getByTestId('battle-hero-plate')).toContainText('Liam');
	await expect(page.getByTestId('battle-tiles')).toBeVisible();
	for (const tile of ['heal', 'item', 'flee']) {
		await expect(page.getByTestId(`battle-tile-${tile}`)).toBeVisible();
	}
	// Plate art ships with the plates.
	await expect(page.getByTestId('battle-plate').first().locator('img')).toBeVisible();

	// Let the entrance animation settle before capturing.
	await page.waitForTimeout(700);

	await page.screenshot({
		path: 'docs/visual-references/heroic-ui/runtime/07-battle.png'
	});
});

// Victory capture: same encounter path with an overwhelming attack so the
// battle resolves into the Heroic victory summary through the real flow.
test('Victory summary capture through a real encounter', async ({ page }) => {
	await seedSaveSlots(page, [seedStateRecord(VICTORY_SAVE_STATE), null, null]);
	await page.goto('/');
	await page.getByRole('button', { name: /Continue/i }).click();

	const summary = page.getByTestId('battle-summary');
	await expect(summary).toBeVisible({ timeout: 30_000 });

	// Stat cards, quest pill, and the single Continue action (mockup layout).
	await expect(summary).toContainText(/victory/i);
	await expect(summary.getByTestId('battle-stat-xp')).toBeVisible();
	await expect(summary.getByTestId('battle-stat-coins')).toBeVisible();
	await expect(summary.getByTestId('battle-stat-drop')).toBeVisible();
	await expect(summary.getByTestId('battle-stat-foes')).toBeVisible();
	await expect(summary.getByTestId('battle-summary-quest')).toContainText('Thin Village Slimes');
	await expect(summary.getByTestId('battle-summary-continue')).toContainText('Continue');
	await expect(summary.getByRole('button', { name: /continue/i })).toHaveCount(1);

	await page.waitForTimeout(700);

	await page.screenshot({
		path: 'docs/visual-references/heroic-ui/runtime/08-victory.png'
	});
});

// Dialogue capture: reached through a real NPC interaction (seeded Continue at
// Mira's approach → interact key → live story dialogue). The session npcId
// must drive the neutral bust lookup — no speaker-string matching — and the
// reveal grammar must hold: confirm completes the line first, the next confirm
// advances into the choice treatment (stacked column above the bar).
test('Dialogue capture through a real NPC interaction', async ({ page }) => {
	await seedSaveSlots(page, [
		{
			kind: 'autosave',
			savedAt: new Date().toISOString(),
			playtimeSeconds: 6120,
			locationLabel: 'Item Shop',
			state: JSON.parse(DIALOGUE_SAVE_STATE)
		},
		null,
		null
	]);
	await page.goto('/');
	// Instant reveal keeps the capture deterministic; the reveal grammar itself
	// (confirm completes, second confirm advances, choices gated) is covered by
	// the DialoguePanel unit specs.
	await page.addInitScript(() =>
		window.localStorage.setItem(
			'gliese.preferences.v1',
			JSON.stringify({ locale: 'en', textSpeed: 'instant', motion: 'on', promptMode: 'auto' })
		)
	);
	await page.getByRole('button', { name: /Continue/i }).click();
	await expect(page.locator('canvas')).toBeVisible();

	// Real NPC interaction: the interact key opens the live story dialogue.
	await page.locator('canvas').click();
	await page.keyboard.press('e', { delay: 50 });
	const dialogue = page.getByRole('dialog', { name: 'Mira' });
	await expect(dialogue).toBeVisible({ timeout: 10_000 });

	// Presentation identity: npcId 'shopkeeper-mira' resolves the neutral bust.
	const bust = dialogue.getByRole('img', { name: 'Mira, dialogue portrait' });
	await expect(bust).toBeVisible();
	expect(await bust.getAttribute('src')).toBe('/game/assets/heroic-ui/busts/mira.png');

	// Name plate + prompt grammar (mockup: gold pill, A Next / B Close / ▼).
	await expect(dialogue.locator('.jrpg-dialogue-speaker')).toContainText('Mira');
	await expect(dialogue.getByRole('button', { name: 'Next' })).toBeVisible();
	await expect(dialogue.getByRole('button', { name: 'Close' })).toBeVisible();

	const line = dialogue.locator('.jrpg-dialogue-line');
	const fullLine = 'Fresh tonics are on the shelf. The guild already stocked your field kit today.';
	await expect(line).toHaveText(fullLine);

	// Line-progress dots mirror the line count; single-line session → one dot on.
	const dots = dialogue.locator('.jrpg-dialogue-dot');
	await expect(dots).toHaveCount(1);
	await expect(dots.first()).toHaveClass(/jrpg-dialogue-dot-on/);

	// Confirm advances the terminal line into the choice treatment.
	await dialogue.getByRole('button', { name: 'Next' }).click();
	await expect(dialogue.locator('.jrpg-dialogue-choice')).toHaveCount(1);
	const shopChoice = dialogue.getByRole('button', { name: 'Shop' });
	await expect(shopChoice).toBeVisible();
	await expect(shopChoice).toBeEnabled();
	// Mockup gilded list: the openShop choice carries the bag glyph (gold tint)
	// and the first row is the selected (cream-gold) row.
	await expect(shopChoice).toHaveAttribute('data-kind', 'trade');
	await expect(shopChoice.locator('svg')).toBeVisible();
	await expect(shopChoice).toHaveAttribute('data-selected', 'true');

	await page.waitForTimeout(700);

	await page.screenshot({
		path: 'docs/visual-references/heroic-ui/runtime/06-dialogue.png'
	});
});
