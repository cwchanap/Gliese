import { expect, type Page } from '@playwright/test';

export async function startNewRunFromTitle(page: Page) {
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();
}
