import { page, userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../../app.css';
import GameShell from '$lib/game/GameShell.svelte';

vi.mock('$lib/game/phaser/createGame', () => ({
	createGame: vi.fn(async () => ({ destroy: vi.fn() }))
}));
import { HUD_COMMAND_EVENT, HUD_STATE_EVENT } from '$lib/game/ui-bridge/events';
import type { HudOpenShop, HudState } from '$lib/game/ui-bridge/events';
import type { HudShopBuyEntry, HudShopSellEntry } from '$lib/game/core/shop';
import type { ConsumableDefinition, EquipmentDefinition } from '$lib/game/content/items';
import { updatePreferences } from '$lib/game/i18n/store';

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
		wallet: { coins: 500 },
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

function mockConsumable(): ConsumableDefinition {
	return {
		id: 'field-potion',
		nameKey: 'items.fieldPotion.name',
		descriptionKey: 'items.fieldPotion.description',
		name: 'Field Potion',
		description: 'Restores a small amount of HP.',
		iconPath: '/game/assets/items/field-potion.png',
		stackable: true,
		basePrice: 10,
		type: 'consumable',
		effect: { type: 'heal', amount: 15 }
	} as unknown as ConsumableDefinition;
}

function mockEquipment(): EquipmentDefinition {
	return {
		id: 'practice-sword',
		nameKey: 'items.practiceSword.name',
		descriptionKey: 'items.practiceSword.description',
		name: 'Practice Sword',
		description: 'A wooden training blade.',
		iconPath: '/game/assets/items/practice-sword.png',
		stackable: false,
		basePrice: 20,
		type: 'equipment',
		slot: 'weapon'
	} as unknown as EquipmentDefinition;
}

function buyEntry(index: number, overrides: Partial<HudShopBuyEntry> = {}): HudShopBuyEntry {
	return {
		stockId: `potion-stock-${index}`,
		itemId: 'field-potion',
		name: `Field Potion ${index + 1}`,
		description: 'Restores a small amount of HP.',
		iconPath: '/game/assets/items/field-potion.png',
		kind: 'consumable',
		price: 10,
		availability: { mode: 'unlimited' },
		item: mockConsumable(),
		...overrides
	};
}

function sellEntry(index: number, overrides: Partial<HudShopSellEntry> = {}): HudShopSellEntry {
	return {
		sellId: `equipment:practice-sword:${index}`,
		itemId: 'practice-sword',
		name: `Practice Sword ${index + 1}`,
		description: 'A wooden training blade.',
		iconPath: '/game/assets/items/practice-sword.png',
		kind: 'equipment',
		quantity: 1,
		price: 5,
		item: mockEquipment(),
		...overrides
	};
}

// Populated shop: 18 buy rows overflow the stock viewport even in the widest
// short-landscape column count, and 6 sell rows exercise the second tab.
const stockedShop: HudOpenShop = {
	shopId: 'miras-item-shop',
	name: "Mira's Item Shop",
	merchantName: 'Mira',
	description: 'Potions, tonics and traveling gear — Sundrop prices, always.',
	buy: Array.from({ length: 18 }, (_, index) => buyEntry(index)),
	sell: Array.from({ length: 6 }, (_, index) => sellEntry(index))
};

function withCommands(fn: (commands: unknown[]) => Promise<void> | void): Promise<void> {
	const commands: unknown[] = [];
	const handleCommand = (event: Event) => commands.push((event as CustomEvent).detail);
	window.addEventListener(HUD_COMMAND_EVENT, handleCommand);
	try {
		const result = fn(commands);
		return result instanceof Promise
			? result.finally(() => window.removeEventListener(HUD_COMMAND_EVENT, handleCommand))
			: (Promise.resolve().finally(() =>
					window.removeEventListener(HUD_COMMAND_EVENT, handleCommand)
				) as Promise<void>);
	} catch (err) {
		window.removeEventListener(HUD_COMMAND_EVENT, handleCommand);
		throw err;
	}
}

function insideViewport(r: DOMRect, width: number, height: number): boolean {
	return r.top >= 0 && r.left >= 0 && r.bottom <= height && r.right <= width;
}

function rectsIntersect(a: DOMRect, b: DOMRect): boolean {
	return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function insideRect(inner: DOMRect, outer: DOMRect): boolean {
	return (
		inner.top >= outer.top - 0.5 &&
		inner.left >= outer.left - 0.5 &&
		inner.bottom <= outer.bottom + 0.5 &&
		inner.right <= outer.right + 0.5
	);
}

// Element rect clipped by every ancestor that can clip (overflow
// hidden/auto/scroll/clip): getBoundingClientRect alone misses content
// scrolled past an overflow:hidden ancestor's fold.
function visibleRect(el: HTMLElement): DOMRect {
	const r = el.getBoundingClientRect();
	let top = r.top;
	let left = r.left;
	let bottom = r.bottom;
	let right = r.right;
	for (let parent = el.parentElement; parent; parent = parent.parentElement) {
		const { overflowX, overflowY } = getComputedStyle(parent);
		const clipsY = overflowY !== 'visible';
		const clipsX = overflowX !== 'visible';
		if (!clipsY && !clipsX) continue;
		const pr = parent.getBoundingClientRect();
		if (clipsY) {
			top = Math.max(top, pr.top);
			bottom = Math.min(bottom, pr.bottom);
		}
		if (clipsX) {
			left = Math.max(left, pr.left);
			right = Math.min(right, pr.right);
		}
	}
	return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
}

// Entrance animations (heroic-anim, 280ms) must settle before measuring.
async function settleEntrance() {
	await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
	await new Promise((resolve) => setTimeout(resolve, 400));
}

afterEach(async () => {
	emitHudState(baseHudState({ ready: false }));
	updatePreferences({ locale: 'en' });
	await page.viewport(1280, 720);
});

describe('ShopScreen compact short-landscape containment (HPA-840 task 3d)', () => {
	function shopScreen(): HTMLElement {
		return document.querySelector<HTMLElement>('.shop-screen')!;
	}

	async function openShop() {
		emitHudState(baseHudState({ shop: stockedShop }));
		await expect.element(page.getByTestId('shop-buy-grid')).toBeVisible();
		await settleEntrance();
		// Park the real pointer off the tiles: it keeps its position across
		// cases, and Chrome re-hit-tests it on scroll/DOM changes — a stray
		// tile mouseenter re-shows the tooltip after focus/blur clears it.
		await userEvent.hover(document.querySelector<HTMLElement>('.shop-header')!);
	}

	it.each([
		[640, 360],
		[1280, 640]
	])(
		'keeps title, merchant name, tabs and Close pinned in parallel columns while stock and detail scroll at %d×%d',
		async (width, height) => {
			await withCommands(async (commands) => {
				await page.viewport(width, height);
				window.scrollTo(0, 0);
				render(GameShell);
				await openShop();

				const screen = shopScreen();
				const title = screen.querySelector<HTMLElement>('.shop-title')!;
				const merchant = screen.querySelector<HTMLElement>('.shop-merchant-name')!;
				const purse = screen.querySelector<HTMLElement>('[data-testid="shop-purse"]')!;
				const close = screen.querySelector<HTMLElement>('.shop-rail-close')!;
				const tabs = Array.from(screen.querySelectorAll<HTMLElement>('.shop-mode'));
				const scroll = screen.querySelector<HTMLElement>('.shop-grid-scroll')!;

				// Short landscape stays in compact parallel columns — not the
				// stacked scrolling column that narrow/tall viewports keep.
				expect(getComputedStyle(screen).flexDirection).toBe('row');

				// Chrome must be visible *now*, not reachable only after an inner
				// scroll: visibleRect walks every clipping ancestor, so the purse
				// fails here if the portrait panel holds it below .shop-rail-top's
				// fold (task-3d review finding).
				for (const [name, el] of [
					['title', title],
					['merchant name', merchant],
					['purse', purse],
					['close', close],
					...tabs.map((tab, i) => [`tab ${i}`, tab] as const)
				] as const) {
					const elRect = el.getBoundingClientRect();
					const clipped = visibleRect(el);
					expect(
						clipped.height >= elRect.height - 0.5 && clipped.width >= elRect.width - 0.5,
						`${name} clipped by an ancestor at ${width}×${height}: el ${JSON.stringify(elRect.toJSON())} visible ${JSON.stringify(clipped.toJSON())}`
					).toBe(true);
					expect(insideViewport(elRect, width, height), `${name} inside ${width}×${height}`).toBe(
						true
					);
				}

				// The panel scrolls internally; the screen and document never do.
				expect(getComputedStyle(scroll).overflowY).toBe('auto');
				expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);
				expect(screen.scrollHeight).toBeLessThanOrEqual(screen.clientHeight + 1);
				scroll.scrollTop = scroll.scrollHeight;
				expect(scroll.scrollTop).toBeGreaterThan(0);

				// The final stock tile is reachable inside the clip panel while
				// title and Close stayed pinned.
				const tiles = screen.querySelectorAll<HTMLElement>('.shop-tile');
				const last = tiles[tiles.length - 1]!;
				const clip = scroll.getBoundingClientRect();
				const lastRect = last.getBoundingClientRect();
				expect(lastRect.top).toBeGreaterThanOrEqual(clip.top);
				expect(lastRect.bottom).toBeLessThanOrEqual(clip.bottom);
				expect(insideViewport(lastRect, width, height)).toBe(true);
				expect(insideViewport(title.getBoundingClientRect(), width, height)).toBe(true);
				expect(insideViewport(close.getBoundingClientRect(), width, height)).toBe(true);
				expect(document.documentElement.scrollTop).toBe(0);
				expect(document.body.scrollTop).toBe(0);

				// Buying the final stock row works: tile select, then the detail
				// action scrolls into reach inside the detail panel.
				last.click();
				const detail = screen.querySelector<HTMLElement>('.shop-detail')!;
				let action: HTMLElement | null = null;
				await vi.waitFor(() => {
					action = detail.querySelector<HTMLElement>('.shop-detail-action');
					expect(action).not.toBeNull();
				});
				expect((action as HTMLButtonElement | null)?.disabled).toBe(false);
				action!.scrollIntoView({ block: 'nearest' });
				expect(
					insideViewport(action!.getBoundingClientRect(), width, height),
					`detail action reachable at ${width}×${height}`
				).toBe(true);
				action!.click();
				expect(commands).toContainEqual({
					type: 'buy-shop-item',
					shopId: 'miras-item-shop',
					stockId: 'potion-stock-17'
				});

				// Sell tab stays reachable and functional in the compact rail.
				const sellTab = tabs[1]!;
				sellTab.scrollIntoView({ block: 'nearest' });
				sellTab.click();
				await expect.element(page.getByTestId('shop-sell-grid')).toBeVisible();
				const sellTiles = screen.querySelectorAll<HTMLElement>('.shop-tile');
				sellTiles[0]!.click();
				let sellAction: HTMLElement | null = null;
				await vi.waitFor(() => {
					sellAction = screen.querySelector<HTMLElement>('.shop-detail-action');
					expect(sellAction).not.toBeNull();
				});
				sellAction!.scrollIntoView({ block: 'nearest' });
				sellAction!.click();
				expect(commands).toContainEqual({ type: 'sell-inventory-item', itemId: 'practice-sword' });

				// Close still emits close-shop.
				close.click();
				expect(commands).toContainEqual({ type: 'close-shop' });
			});
		}
	);

	it.each([
		// Short-landscape column bands keep every tile a usable width (even
		// with a ~17px classic scrollbar): 2 columns ≤771px, 3 columns
		// 772–891px, 4 columns above. In short landscape the Buy/Sell tabs are
		// stacked vertically (rows 0 and 1, col 0), so the 18 stock tiles start
		// at row 2 and end at 2 + floor(17 / columns).
		[640, 360, 2, '10', '1'],
		[832, 560, 3, '7', '2']
	] as const)(
		'renders %3$d stock columns synchronized with the focus lattice at %d×%d',
		async (width, height, columns, lastRow, lastCol) => {
			await page.viewport(width, height);
			window.scrollTo(0, 0);
			render(GameShell);
			await openShop();

			const screen = shopScreen();
			const gridEl = screen.querySelector<HTMLElement>('[data-testid="shop-buy-grid"]')!;
			expect(getComputedStyle(gridEl).gridTemplateColumns.split(' ')).toHaveLength(columns);

			const scroll = screen.querySelector<HTMLElement>('.shop-grid-scroll')!;
			expect(
				scroll.scrollWidth,
				`horizontal overflow at ${width}×${height} (scrollWidth ${scroll.scrollWidth} > clientWidth ${scroll.clientWidth})`
			).toBeLessThanOrEqual(scroll.clientWidth + 1);

			// Stacked Buy/Sell tabs in short landscape sit at (0,0) and (1,0)
			// so directional Down from Buy lands on Sell before entering stock.
			const buyTab = document.getElementById('shop-buy-tab')!;
			const sellTab = document.getElementById('shop-sell-tab')!;
			expect(buyTab.getAttribute('data-focus-row')).toBe('0');
			expect(buyTab.getAttribute('data-focus-column')).toBe('0');
			expect(sellTab.getAttribute('data-focus-row')).toBe('1');
			expect(sellTab.getAttribute('data-focus-column')).toBe('0');

			// Focus geometry mirrors the rendered columns: 18 stocked potions
			// end at 2 + floor(17 / columns), col 17 % columns.
			const tiles = Array.from(screen.querySelectorAll<HTMLElement>('.shop-tile'));
			const lastTile = tiles[tiles.length - 1]!;
			expect(lastTile.getAttribute('data-focus-row')).toBe(lastRow);
			expect(lastTile.getAttribute('data-focus-column')).toBe(lastCol);
		}
	);

	it.each([
		// Portrait and taller narrow layouts keep the stacked column.
		[390, 844],
		[832, 760]
	])('keeps the stacked scrolling column at %d×%d', async (width, height) => {
		await page.viewport(width, height);
		window.scrollTo(0, 0);
		render(GameShell);
		await openShop();

		const screen = shopScreen();
		expect(getComputedStyle(screen).flexDirection).toBe('column');
		expect(getComputedStyle(screen).overflowY).toBe('auto');
		// Merchant portrait stays on the stacked rail.
		expect(screen.querySelector('.shop-portrait-frame')).not.toBeNull();
		expect(
			getComputedStyle(screen.querySelector<HTMLElement>('.shop-portrait-frame')!).display
		).not.toBe('none');
	});

	it.each(['ja', 'zh-Hant'] as const)(
		'keeps shop chrome inside 640×360 and 832×560 with %s text',
		async (locale) => {
			updatePreferences({ locale });
			for (const [width, height] of [
				[640, 360],
				[832, 560]
			] as const) {
				await page.viewport(width, height);
				window.scrollTo(0, 0);
				const { unmount } = render(GameShell);
				await openShop();

				const screen = shopScreen();
				expect(
					screen.scrollWidth,
					`horizontal overflow at ${width}×${height} (${locale})`
				).toBeLessThanOrEqual(screen.clientWidth + 1);
				for (const [name, el] of [
					['title', screen.querySelector<HTMLElement>('.shop-title')!],
					['merchant name', screen.querySelector<HTMLElement>('.shop-merchant-name')!],
					['purse', screen.querySelector<HTMLElement>('[data-testid="shop-purse"]')!],
					['close', screen.querySelector<HTMLElement>('.shop-rail-close')!],
					['buy tab', document.getElementById('shop-buy-tab')!],
					['sell tab', document.getElementById('shop-sell-tab')!]
				] as const) {
					const elRect = el.getBoundingClientRect();
					const clipped = visibleRect(el);
					expect(
						clipped.height >= elRect.height - 0.5 && clipped.width >= elRect.width - 0.5,
						`${name} clipped by an ancestor at ${width}×${height} (${locale}): el ${JSON.stringify(elRect.toJSON())} visible ${JSON.stringify(clipped.toJSON())}`
					).toBe(true);
					expect(
						insideViewport(elRect, width, height),
						`${name} inside ${width}×${height} (${locale}): ${JSON.stringify(elRect.toJSON())}`
					).toBe(true);
				}
				unmount();
			}
		}
	);

	it.each([
		[640, 360],
		[832, 560]
	])(
		'keeps tab keyboard navigation and the focus tooltip working at %d×%d',
		async (width, height) => {
			await page.viewport(width, height);
			window.scrollTo(0, 0);
			render(GameShell);
			await openShop();

			// Arrow keys move focus AND selection between Buy/Sell tabs.
			const buyTab = document.getElementById('shop-buy-tab')!;
			buyTab.focus();
			expect(document.activeElement).toBe(buyTab);
			await userEvent.keyboard('{ArrowRight}');
			const sellTab = document.getElementById('shop-sell-tab')!;
			expect(document.activeElement).toBe(sellTab);
			expect(sellTab.getAttribute('aria-selected')).toBe('true');
			await expect.element(page.getByTestId('shop-sell-grid')).toBeVisible();
			await userEvent.keyboard('{ArrowLeft}');
			expect(document.activeElement).toBe(buyTab);
			expect(buyTab.getAttribute('aria-selected')).toBe('true');
			await expect.element(page.getByTestId('shop-buy-grid')).toBeVisible();

			// Focusing a stock tile raises the tooltip inside the window; the
			// tooltip leaves the tile and Close button clickable (it is
			// pointer-events:none) and stays inside the viewport.
			const tile = document.querySelector<HTMLElement>('[data-focus-id="shop-buy-0"]')!;
			tile.focus();
			const tooltip = await vi.waitFor(() => {
				const el = document.querySelector<HTMLElement>('.shop-tooltip');
				expect(el).not.toBeNull();
				return el!;
			});
			expect(tooltip.textContent).toContain('Field Potion 1');
			expect(getComputedStyle(tooltip).pointerEvents).toBe('none');
			expect(insideViewport(tooltip.getBoundingClientRect(), width, height)).toBe(true);

			// Moving focus away hides the tooltip again.
			buyTab.focus();
			await vi.waitFor(() => {
				expect(document.querySelector('.shop-tooltip')).toBeNull();
			});
		}
	);

	// HPA-839 task 4: the tooltip re-anchored inside .shop-main must never
	// reach the detail column's Buy/Sell action. The old screen-anchored
	// bottom-right tooltip covered it outright. 1024×768 is the stacked
	// layout (width ≤ 1200) where an in-flow tooltip pushes the detail
	// panel down on hover — caught only by measuring .shop-detail while the
	// tooltip appears and hides.
	it.each([
		[640, 360],
		[832, 560],
		[1024, 768],
		[1280, 720]
	])(
		'keeps the tooltip inside the stock column and clear of the detail action at %d×%d',
		async (width, height) => {
			await withCommands(async (commands) => {
				await page.viewport(width, height);
				window.scrollTo(0, 0);
				render(GameShell);
				await openShop();

				const screen = shopScreen();
				const main = screen.querySelector<HTMLElement>('.shop-main')!;
				const detail = screen.querySelector<HTMLElement>('.shop-detail')!;

				// Buy: focus raises the tooltip, click selects so the detail
				// action is live at the same time.
				const buyTile = screen.querySelector<HTMLElement>('[data-focus-id="shop-buy-0"]')!;
				const detailTopBeforeBuy = detail.offsetTop;
				buyTile.focus();
				buyTile.click();
				const buyTooltip = await vi.waitFor(() => {
					const el = main.querySelector<HTMLElement>('.shop-tooltip');
					expect(el).not.toBeNull();
					return el!;
				});
				const buyAction = await vi.waitFor(() => {
					const el = screen.querySelector<HTMLElement>('.shop-detail-action');
					expect(el).not.toBeNull();
					return el!;
				});
				buyAction.scrollIntoView({ block: 'nearest' });

				expect(
					insideRect(buyTooltip.getBoundingClientRect(), main.getBoundingClientRect()),
					`buy tooltip inside .shop-main at ${width}×${height}: ${JSON.stringify(buyTooltip.getBoundingClientRect().toJSON())}`
				).toBe(true);
				expect(
					rectsIntersect(buyTooltip.getBoundingClientRect(), buyAction.getBoundingClientRect()),
					`buy tooltip overlaps detail action at ${width}×${height}: ${JSON.stringify(buyTooltip.getBoundingClientRect().toJSON())} vs ${JSON.stringify(buyAction.getBoundingClientRect().toJSON())}`
				).toBe(false);

				// The tooltip must not take layout space: the detail panel does
				// not move when it appears or hides. offsetTop is measured
				// against .shop-main, so it is stable across scroll position.
				expect(
					detail.offsetTop,
					`tooltip appearing moved .shop-detail at ${width}×${height}: ${detailTopBeforeBuy} → ${detail.offsetTop}`
				).toBe(detailTopBeforeBuy);
				// scrollIntoView can slide the parked header away in the
				// stacked layout — re-park so no tile sits under the pointer
				// when blur clears the tooltip.
				await userEvent.hover(screen.querySelector('.shop-header')!);
				buyTile.blur();
				await vi.waitFor(() => {
					expect(main.querySelector('.shop-tooltip')).toBeNull();
				});
				expect(
					detail.offsetTop,
					`tooltip hiding moved .shop-detail at ${width}×${height}: ${detailTopBeforeBuy} → ${detail.offsetTop}`
				).toBe(detailTopBeforeBuy);

				// The action is a real click target: a pointer click on it lands
				// on the button and emits the buy command.
				buyTile.focus();
				await userEvent.click(page.elementLocator(buyAction));
				expect(commands).toContainEqual({
					type: 'buy-shop-item',
					shopId: 'miras-item-shop',
					stockId: 'potion-stock-0'
				});

				// Sell tab: same geometry on the second panel.
				document.getElementById('shop-sell-tab')!.click();
				await expect.element(page.getByTestId('shop-sell-grid')).toBeVisible();
				const sellTile = screen.querySelector<HTMLElement>('[data-focus-id="shop-sell-0"]')!;
				const detailTopBeforeSell = detail.offsetTop;
				sellTile.focus();
				sellTile.click();
				const sellTooltip = await vi.waitFor(() => {
					const el = main.querySelector<HTMLElement>('.shop-tooltip');
					expect(el).not.toBeNull();
					return el!;
				});
				const sellAction = await vi.waitFor(() => {
					const el = screen.querySelector<HTMLElement>('.shop-detail-action');
					expect(el).not.toBeNull();
					return el!;
				});
				sellAction.scrollIntoView({ block: 'nearest' });

				expect(
					insideRect(sellTooltip.getBoundingClientRect(), main.getBoundingClientRect()),
					`sell tooltip inside .shop-main at ${width}×${height}`
				).toBe(true);
				expect(
					rectsIntersect(sellTooltip.getBoundingClientRect(), sellAction.getBoundingClientRect()),
					`sell tooltip overlaps detail action at ${width}×${height}`
				).toBe(false);
				expect(
					detail.offsetTop,
					`sell tooltip moved .shop-detail at ${width}×${height}: ${detailTopBeforeSell} → ${detail.offsetTop}`
				).toBe(detailTopBeforeSell);

				await userEvent.click(page.elementLocator(sellAction));
				expect(commands).toContainEqual({
					type: 'sell-inventory-item',
					itemId: 'practice-sword'
				});
			});
		}
	);

	// Localized meta text wraps differently; the clamp must hold in every
	// shipped dictionary at the tightest layout.
	it.each(['ja', 'zh-Hant'] as const)(
		'keeps the localized tooltip inside the stock column at 640×360 (%s)',
		async (locale) => {
			updatePreferences({ locale });
			await page.viewport(640, 360);
			window.scrollTo(0, 0);
			render(GameShell);
			await openShop();

			const screen = shopScreen();
			const main = screen.querySelector<HTMLElement>('.shop-main')!;
			const tile = screen.querySelector<HTMLElement>('[data-focus-id="shop-buy-0"]')!;
			tile.focus();
			const tooltip = await vi.waitFor(() => {
				const el = main.querySelector<HTMLElement>('.shop-tooltip');
				expect(el).not.toBeNull();
				return el!;
			});
			expect(
				insideRect(tooltip.getBoundingClientRect(), main.getBoundingClientRect()),
				`localized tooltip inside .shop-main at 640×360 (${locale}): ${JSON.stringify(tooltip.getBoundingClientRect().toJSON())}`
			).toBe(true);
			expect(insideViewport(tooltip.getBoundingClientRect(), 640, 360)).toBe(true);
		}
	);
});
