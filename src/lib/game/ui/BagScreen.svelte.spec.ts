import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../../app.css';
import GameShell from '$lib/game/GameShell.svelte';

vi.mock('$lib/game/phaser/createGame', () => ({
	createGame: vi.fn(async () => ({ destroy: vi.fn() }))
}));
import { HUD_STATE_EVENT } from '$lib/game/ui-bridge/events';
import type { HudState } from '$lib/game/ui-bridge/events';

function emitHudState(state: HudState) {
	window.dispatchEvent(new CustomEvent(HUD_STATE_EVENT, { detail: state }));
}

function baseHudState(overrides: Partial<HudState> = {}): HudState {
	return {
		ready: true,
		mapId: 'overworld',
		areaMap: {
			mapId: 'overworld',
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
		heroOccluded: false,
		nearbyShop: null,
		shop: null,
		dialogue: null,
		battle: { phase: 'none', summary: null, active: null },
		quests: { main: null, completed: [], total: 0 },
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

function insideViewport(r: DOMRect, width: number, height: number): boolean {
	return r.top >= 0 && r.left >= 0 && r.bottom <= height && r.right <= width;
}

// Entrance animations (heroic-anim, 280ms) must settle before measuring.
async function settleEntrance() {
	await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
	await new Promise((resolve) => setTimeout(resolve, 400));
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

	describe('BagScreen equipped badge', () => {
		it('keeps the EQUIPPED badge visible, clear of the slot label, and unclipped at every viewport', async () => {
			render(GameShell);
			emitHudState(baseHudState(fullyEquipped));
			// HPA-841 visual contract: label and badge never intersect at desktop
			// (1440×900), default (1280×720), or compact (640×360) sizes.
			for (const [width, height] of [
				[1440, 900],
				[1280, 720],
				[640, 360]
			] as const) {
				await page.viewport(width, height);
				window.scrollTo(0, 0);
				await page.getByRole('button', { name: /menu/i }).click();
				await page.getByRole('button', { name: 'Bag' }).click();
				await expect.element(page.getByTestId('inventory-slot-grid')).toBeVisible();
				await settleEntrance();

				// Equipment slots (with their labels) live on the Gear tab.
				await page.getByRole('tab', { name: 'Gear' }).click();
				await expect.element(page.getByTestId('inventory-slot-grid')).toBeVisible();

				// Badge and slot label live in different rows: no two rects intersect.
				const slots = Array.from(document.querySelectorAll<HTMLElement>('.bag-slot')).filter(
					(slot) => slot.querySelector('.bag-slot-pos') && slot.querySelector('.bag-slot-worn')
				);
				expect(slots.length).toBeGreaterThan(0);
				const intersects = (a: DOMRect, b: DOMRect) =>
					a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
				for (const slot of slots) {
					const label = slot.querySelector<HTMLElement>('.bag-slot-pos')!.getBoundingClientRect();
					const badge = slot.querySelector<HTMLElement>('.bag-slot-worn')!.getBoundingClientRect();
					expect(
						intersects(label, badge),
						`label ${JSON.stringify(label.toJSON())} vs badge ${JSON.stringify(badge.toJSON())} at ${width}×${height}`
					).toBe(false);
				}

				// Visibility/bounds contract (HPA-841): a hidden, zero-sized,
				// offscreen, or clipped badge/label must fail too — each element
				// renders (visibility and opacity checked), has positive size,
				// and fits both the viewport and the panel that clips it
				// (bag-grid-scroll has overflow-y: auto). At desktop sizes the
				// strict in-viewport check runs as-is; at 640×360 the bag is a
				// designed scrolling column (BagScreen max-height: 559px query:
				// scroll instead of clip), so each slot is scrolled into view
				// first — reachability is the contract, mirroring the journal's
				// Close control.
				const clip = document
					.querySelector<HTMLElement>('.bag-grid-scroll')!
					.getBoundingClientRect();
				const compact = height <= 559;
				for (const slot of slots) {
					if (compact) slot.scrollIntoView({ block: 'nearest' });
					for (const [name, el] of [
						['label', slot.querySelector<HTMLElement>('.bag-slot-pos')!],
						['badge', slot.querySelector<HTMLElement>('.bag-slot-worn')!]
					] as const) {
						expect(
							el.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }),
							`${name} visible at ${width}×${height}`
						).toBe(true);
						const r = el.getBoundingClientRect();
						expect(r.width, `${name} width at ${width}×${height}`).toBeGreaterThan(0);
						expect(r.height, `${name} height at ${width}×${height}`).toBeGreaterThan(0);
						expect(
							insideViewport(r, width, height),
							`${name} inside ${width}×${height}: ${JSON.stringify(r.toJSON())}`
						).toBe(true);
						expect(
							r.top >= clip.top &&
								r.left >= clip.left &&
								r.right <= clip.right &&
								r.bottom <= clip.bottom,
							`${name} inside clipping panel at ${width}×${height}: ${JSON.stringify(r.toJSON())} vs ${JSON.stringify(clip.toJSON())}`
						).toBe(true);
					}
				}

				// Close the Bag and the command grid beneath it (Escape returns to
				// the grid) so the next viewport re-opens it cleanly.
				await userEvent.keyboard('{Escape}');
				await vi.waitFor(() =>
					expect(page.getByTestId('inventory-slot-grid').elements()).toHaveLength(0)
				);
				await userEvent.keyboard('{Escape}');
				await vi.waitFor(() =>
					expect(page.getByRole('region', { name: 'Command' }).elements()).toHaveLength(0)
				);
			}
		});
	});
});
