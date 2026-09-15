import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../../app.css';
import GameShell from '$lib/game/GameShell.svelte';

vi.mock('$lib/game/phaser/createGame', () => ({
	createGame: vi.fn(async () => ({ destroy: vi.fn() }))
}));
import { HUD_STATE_EVENT } from '$lib/game/ui-bridge/events';
import type { HudState } from '$lib/game/core/types';

function emitHudState(state: HudState) {
	window.dispatchEvent(new CustomEvent(HUD_STATE_EVENT, { detail: state }));
}

function baseHudState(overrides: Partial<HudState> = {}): HudState {
	return {
		ready: true,
		mapId: 'meadow-entry',
		areaMap: {
			mapId: 'meadow-entry',
			name: 'Sundrop Meadows',
			worldWidth: 6_400,
			worldHeight: 6_400,
			cellSize: 128,
			revealedCells: [],
			player: { x: 0, y: 0 },
			markers: []
		},
		hp: 12,
		maxHp: 20,
		level: 1,
		xp: 0,
		attack: 4,
		defense: 0,
		heals: 1,
		status: 'Ready',
		wallet: { coins: 30 },
		nearbyShop: null,
		shop: null,
		dialogue: null,
		battle: { phase: 'none', summary: null, active: null },
		quests: { main: null, side: [], completed: [], guildOffer: null },
		inventory: {
			consumables: [],
			equipment: [],
			keyItems: [],
			equipped: { weapon: null, head: null, body: null, hands: null, accessory: null }
		},
		...overrides
	};
}

function equippedItem(
	itemId: string,
	name: string,
	slot: 'weapon' | 'head' | 'body' | 'hands' | 'accessory'
) {
	return {
		itemId,
		name,
		description: 'Gear.',
		iconPath: `/game/assets/items/${itemId}.png`,
		slot,
		equipped: true,
		modifiers: { attack: 1 }
	};
}

const fullyEquipped: Partial<HudState> = {
	inventory: {
		consumables: [
			{
				itemId: 'field-potion',
				name: 'Field Potion',
				description: 'Restores HP.',
				iconPath: '/game/assets/items/field-potion.png',
				quantity: 3
			}
		],
		equipment: [
			equippedItem('training-sword', 'Training Sword', 'weapon'),
			equippedItem('iron-cap', 'Iron Cap', 'head'),
			equippedItem('traveler-vest', 'Traveler Vest', 'body'),
			equippedItem('grip-wraps', 'Grip Wraps', 'hands'),
			equippedItem('meadow-charm', 'Meadow Charm', 'accessory')
		],
		keyItems: [],
		equipped: {
			weapon: 'training-sword',
			head: 'iron-cap',
			body: 'traveler-vest',
			hands: 'grip-wraps',
			accessory: 'meadow-charm'
		}
	}
};

function inViewport(selector: string, height: number): boolean {
	return Array.from(document.querySelectorAll<HTMLElement>(selector)).every((el) => {
		const r = el.getBoundingClientRect();
		return r.top >= 0 && r.bottom <= height && r.height > 0;
	});
}

describe('BagScreen short viewports', () => {
	// Short-height compaction (final-review finding 4): the desktop column
	// layout overflows below ~560px — rail cards + Close run past the bottom
	// edge and the WORN panel's fixed-size tiles (with their remove buttons)
	// clip under overflow:hidden.
	for (const [width, height] of [
		[1440, 360],
		[1000, 360]
	] as const) {
		it(`keeps rail, close, grid, Worn remove buttons, and detail inside ${width}×${height}`, async () => {
			await page.viewport(width, height);
			window.scrollTo(0, 0);
			render(GameShell);
			emitHudState(baseHudState(fullyEquipped));

			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Bag' }).click();
			await expect.element(page.getByTestId('inventory-slot-grid')).toBeVisible();
			await expect.element(page.getByTestId('inventory-worn')).toBeVisible();

			// Sanity: the fixture equips all five slots.
			const labels = Array.from(document.querySelectorAll('.bag-worn-remove')).map((el) =>
				el.getAttribute('aria-label')
			);
			expect(labels, JSON.stringify(labels)).toHaveLength(5);

			const railCards = Array.from(document.querySelectorAll<HTMLElement>('.bag-rail-card'));
			const closeRect = document
				.querySelector<HTMLElement>('.bag-rail-close')!
				.getBoundingClientRect();
			for (const card of railCards) {
				const r = card.getBoundingClientRect();
				expect(r.top, `rail card ${card.textContent} top`).toBeGreaterThanOrEqual(0);
				expect(r.bottom, `rail card ${card.textContent} bottom`).toBeLessThanOrEqual(height);
			}
			// Close sits below the tabs without overlapping them.
			const lastTabBottom = Math.max(
				...railCards.map((card) => card.getBoundingClientRect().bottom)
			);
			expect(closeRect.top).toBeGreaterThanOrEqual(lastTabBottom);
			expect(closeRect.bottom).toBeLessThanOrEqual(height);

			expect(inViewport('.bag-worn-remove', height)).toBe(true);
			expect(inViewport('.bag-worn-tile', height)).toBe(true);

			const grid = document.querySelector<HTMLElement>('.bag-grid-panel')!;
			expect(grid.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
			expect(grid.getBoundingClientRect().bottom).toBeLessThanOrEqual(height);

			const detail = document.querySelector<HTMLElement>('[data-testid="inventory-detail"]')!;
			expect(detail.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
			expect(detail.getBoundingClientRect().bottom).toBeLessThanOrEqual(height);
		});
	}
});
