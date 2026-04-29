import { expect, test } from '@playwright/test';

test('game route boots', async ({ page }) => {
	await page.goto('/game');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
});
