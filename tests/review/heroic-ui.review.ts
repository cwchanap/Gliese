import { expect, test } from '@playwright/test';

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
// chapter pill, and the three action cards.
test('Title screen capture', async ({ page }) => {
	await page.goto('/');

	const wordmark = page.locator('.title-wordmark');
	await expect(wordmark).toHaveText('GLIESE');

	// Structural layout: key art behind, crest above the wordmark, chapter pill,
	// then the Continue / New Run / System card row, then the prompt hints.
	await expect(page.locator('.title-key-art')).toBeVisible();
	await expect(page.locator('.title-crest svg')).toBeVisible();
	await expect(page.locator('.title-chapter-pill')).toContainText('Chapter I');
	await expect(page.getByRole('button', { name: /Continue/i })).toBeDisabled();
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
test('Save screen capture through the menu path', async ({ page }) => {
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
	await expect(dialog.getByRole('button', { name: 'Back' })).toBeVisible();

	await page.waitForTimeout(700);

	await page.screenshot({
		path: 'docs/visual-references/heroic-ui/runtime/09-save.png'
	});
});
