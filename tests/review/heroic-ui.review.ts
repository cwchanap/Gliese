import { expect, test, type Page } from '@playwright/test';

// A real serialized SaveState (createNewSaveState()) used to seed slot records
// so the captures exercise the same filled-card treatments as the mockups.
const SEED_SAVE_STATE =
	'{"version":9,"mapId":"meadow-entry","player":{"level":1,"xp":0,"hp":20,"attack":3,"x":704,"y":5920,"facing":"up"},"flags":{"clearedEncounters":[],"clearedEncounterUnitCounts":{},"collectedPickups":[],"resolvedEncounterDrops":{}},"inventory":{"stacks":[{"itemId":"field-potion","quantity":1}],"equipment":["training-sword"]},"equipment":{"weapon":"training-sword","head":null,"body":null,"hands":null,"accessory":null},"wallet":{"coins":30},"shops":{"stock":{"guild-quartermaster":{"iron-cap":1,"grip-wraps":1,"traveler-vest":1},"sundrop-forge":{"training-sword":1,"iron-cap":1,"grip-wraps":1,"traveler-vest":1}}},"quests":{"entries":{"investigate-the-ruins":{"status":"active","currentObjectiveId":"talk-to-guild-master","progress":0,"rewardApplied":false,"countedSourceIds":[]}},"completedObjectives":{}},"mapExploration":{},"seenDiscoveries":[]}';

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
	await page.getByRole('button', { name: 'Save Game' }).click();

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
