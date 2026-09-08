import { expect, test } from '@playwright/test';

// Heroic UI review captures target the mockup canvas size; every later
// capture case must assert this before screenshotting.
test('review viewport matches the mockup canvas', async ({ page }) => {
	expect(page.viewportSize()).toEqual({ width: 1440, height: 900 });
});

test('root boots the game shell', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();
});

// Reaches System through the real menu path (Menu → System) and captures the
// Heroic System surface for source/runtime comparison at 1440×900.
test('System screen capture through the menu path', async ({ page }) => {
	await page.goto('/');
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

	// Let the Heroic entrance animation (280ms) finish before capturing.
	await page.waitForTimeout(400);

	await page.screenshot({
		path: 'docs/visual-references/heroic-ui/runtime/10-system.png'
	});
});
