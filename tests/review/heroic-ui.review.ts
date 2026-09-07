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
