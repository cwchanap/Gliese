import { expect, test } from '@playwright/test';

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

	await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
	await expect(page.getByText(/Field Potion/i)).toBeVisible();

	await page.getByRole('tab', { name: 'Equipment' }).click();
	await expect(page.getByRole('heading', { name: 'Training Sword' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Equipped' })).toBeVisible();
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

	await expect(page.getByRole('heading', { name: 'Field Potion' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Use' })).toBeEnabled();
});
