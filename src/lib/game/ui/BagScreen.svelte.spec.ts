import { page, userEvent } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../../app.css';
import GameShell from '$lib/game/GameShell.svelte';

vi.mock('$lib/game/phaser/createGame', () => ({
	createGame: vi.fn(async () => ({ destroy: vi.fn() }))
}));
import { HUD_COMMAND_EVENT, HUD_STATE_EVENT } from '$lib/game/ui-bridge/events';
import type { HudState } from '$lib/game/ui-bridge/events';
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

// Enough consumables to overflow the slot viewport even at 1280×640's
// six-column grid, so .bag-grid-scroll is provably the scroller.
const stockedBag: Partial<HudState> = {
	inventory: {
		...fullyEquipped.inventory!,
		consumables: Array.from({ length: 30 }, (_, index) => ({
			itemId: 'field-potion',
			name: 'Field Potion',
			description: 'Restores HP.',
			iconPath: '/game/assets/items/field-potion.png',
			quantity: index + 1
		})),
		equipment: [
			...fullyEquipped.inventory!.equipment,
			{
				itemId: 'rusty-dagger',
				name: 'Rusty Dagger',
				description: 'A spare blade.',
				iconPath: '/game/assets/items/rusty-dagger.png',
				slot: 'weapon' as const,
				equipped: false,
				modifiers: { attack: 1 }
			}
		]
	}
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
				const compact = height <= 559;
				for (const slot of slots) {
					if (compact) slot.scrollIntoView({ block: 'nearest' });
					// Re-read after each scrollIntoView: scrolling moves the clipping
					// panel's viewport-relative bounds, so a rect captured before the
					// loop goes stale after the first scroll.
					const clip = document
						.querySelector<HTMLElement>('.bag-grid-scroll')!
						.getBoundingClientRect();
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

describe('BagScreen compact short-landscape containment (HPA-840 task 3c)', () => {
	function bagScreen(): HTMLElement {
		return document.querySelector<HTMLElement>('.bag-screen')!;
	}

	async function openBag() {
		await page.getByRole('button', { name: /menu/i }).click();
		await page.getByRole('button', { name: 'Bag' }).click();
		await expect.element(page.getByTestId('inventory-slot-grid')).toBeVisible();
		await settleEntrance();
	}

	it.each([
		[640, 360],
		[832, 560],
		[1280, 640]
	])(
		'keeps rail, title and Close pinned in parallel columns while the slot grid scrolls at %d×%d',
		async (width, height) => {
			await withCommands(async (commands) => {
				await page.viewport(width, height);
				window.scrollTo(0, 0);
				render(GameShell);
				emitHudState(baseHudState(stockedBag));
				await openBag();

				const screen = bagScreen();
				const title = screen.querySelector<HTMLElement>('.bag-title')!;
				const close = screen.querySelector<HTMLElement>('.bag-rail-close')!;
				const scroll = screen.querySelector<HTMLElement>('.bag-grid-scroll')!;

				// Short landscape stays in compact parallel columns — not the
				// ≤900px stacked scrolling column that narrow/tall keeps.
				expect(getComputedStyle(screen).flexDirection).toBe('row');
				for (const card of screen.querySelectorAll<HTMLElement>('.bag-rail-card')) {
					expect(
						insideViewport(card.getBoundingClientRect(), width, height),
						`rail card ${card.textContent} inside ${width}×${height}`
					).toBe(true);
				}
				expect(insideViewport(title.getBoundingClientRect(), width, height)).toBe(true);
				expect(insideViewport(close.getBoundingClientRect(), width, height)).toBe(true);

				// The slot viewport is usable — never shrunk below one 6.6rem
				// slot — and it is the scroller, not the screen or document.
				expect(scroll.clientHeight).toBeGreaterThanOrEqual(104);
				expect(getComputedStyle(scroll).overflowY).toBe('auto');
				expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);
				expect(screen.scrollHeight).toBeLessThanOrEqual(screen.clientHeight + 1);
				scroll.scrollTop = scroll.scrollHeight;
				expect(scroll.scrollTop).toBeGreaterThan(0);

				// After the inner scroll the last slot renders fully inside the
				// clip panel, and title/Close stayed pinned.
				const slots = screen.querySelectorAll<HTMLElement>('.bag-slot');
				const last = slots[slots.length - 1]!;
				const clip = scroll.getBoundingClientRect();
				const lastRect = last.getBoundingClientRect();
				expect(lastRect.top).toBeGreaterThanOrEqual(clip.top);
				expect(lastRect.bottom).toBeLessThanOrEqual(clip.bottom);
				expect(insideViewport(lastRect, width, height)).toBe(true);
				expect(insideViewport(title.getBoundingClientRect(), width, height)).toBe(true);
				expect(insideViewport(close.getBoundingClientRect(), width, height)).toBe(true);
				expect(document.documentElement.scrollTop).toBe(0);
				expect(document.body.scrollTop).toBe(0);

				// All five worn remove controls are operable — and reaching
				// them never scrolls the pinned title or Close offscreen.
				const removes = Array.from(screen.querySelectorAll<HTMLElement>('.bag-worn-remove'));
				expect(removes).toHaveLength(5);
				for (const remove of removes) {
					remove.scrollIntoView({ block: 'nearest' });
					expect(
						insideViewport(remove.getBoundingClientRect(), width, height),
						`worn remove ${remove.getAttribute('aria-label')} reachable at ${width}×${height}`
					).toBe(true);
					expect((remove as HTMLButtonElement).disabled).toBe(false);
					expect(
						insideViewport(title.getBoundingClientRect(), width, height),
						`title still pinned after reaching ${remove.getAttribute('aria-label')}`
					).toBe(true);
					expect(
						insideViewport(close.getBoundingClientRect(), width, height),
						`Close still pinned after reaching ${remove.getAttribute('aria-label')}`
					).toBe(true);
				}
				removes[0]!.click();
				expect(commands).toContainEqual({ type: 'unequip-slot', slot: 'head' });
				expect(insideViewport(title.getBoundingClientRect(), width, height)).toBe(true);
				expect(insideViewport(close.getBoundingClientRect(), width, height)).toBe(true);
			});
		}
	);

	it.each([
		// Short-landscape column bands keep each slot ≥6.6rem (105.6px) wide
		// even with a ~17px classic scrollbar: 2 columns ≤771px, 3 columns
		// at 772–891px (see the boundary audit below for the full width sweep).
		[640, 360, 2, '14', '1'],
		[832, 560, 3, '9', '2']
	] as const)(
		'renders %2$d readable columns with 6.6rem slots and full-size badges at %d×%d',
		async (width, height, columns, lastRow, lastCol) => {
			await page.viewport(width, height);
			window.scrollTo(0, 0);
			render(GameShell);
			emitHudState(baseHudState(stockedBag));
			await openBag();

			const screen = bagScreen();
			const gridEl = screen.querySelector<HTMLElement>('.bag-slot-grid')!;
			expect(getComputedStyle(gridEl).gridTemplateColumns.split(' ')).toHaveLength(columns);
			const slot = gridEl.querySelector<HTMLElement>('.bag-slot')!;
			const slotRect = slot.getBoundingClientRect();
			expect(
				slotRect.width,
				`slot width at ${width}×${height}: ${slotRect.width}px`
			).toBeGreaterThanOrEqual(105.6);
			// 6.6rem height: subpixel rounding lands at 105.59.
			expect(slotRect.height).toBeGreaterThanOrEqual(105.5);

			// Focus geometry mirrors the rendered columns: only filled slots
			// carry focus ids, so the 30 stocked potions end at the last cell.
			const focusSlots = screen.querySelectorAll<HTMLElement>('[data-focus-id^="bag-slot-"]');
			const lastFocus = focusSlots[focusSlots.length - 1]!;
			expect(lastFocus.getAttribute('data-focus-row')).toBe(lastRow);
			expect(lastFocus.getAttribute('data-focus-column')).toBe(lastCol);

			await page.getByRole('tab', { name: 'Gear' }).click();
			await expect.element(page.getByTestId('inventory-slot-grid')).toBeVisible();

			// Slot label and EQUIPPED badge render at their default readable
			// size (≥8px) and fully inside their own slot — not shrunk or
			// clipped against the panel edge.
			const labeled = Array.from(screen.querySelectorAll<HTMLElement>('.bag-slot')).filter(
				(el) => el.querySelector('.bag-slot-pos') && el.querySelector('.bag-slot-worn')
			);
			expect(labeled.length).toBeGreaterThan(0);
			for (const el of labeled) {
				el.scrollIntoView({ block: 'nearest' });
				const slotRect = el.getBoundingClientRect();
				for (const [name, badgeEl] of [
					['label', el.querySelector<HTMLElement>('.bag-slot-pos')!],
					['badge', el.querySelector<HTMLElement>('.bag-slot-worn')!]
				] as const) {
					expect(
						parseFloat(getComputedStyle(badgeEl).fontSize),
						`${name} font-size at ${width}×${height}`
					).toBeGreaterThanOrEqual(8);
					const r = badgeEl.getBoundingClientRect();
					expect(
						r.left >= slotRect.left && r.right <= slotRect.right + 1,
						`${name} inside slot at ${width}×${height}: ${JSON.stringify(r.toJSON())} vs ${JSON.stringify(slotRect.toJSON())}`
					).toBe(true);
				}
			}
		}
	);

	// Boundary audit (review finding): the rendered column count must keep
	// every slot ≥6.6rem (105.6px) wide across the whole short-landscape
	// width range — including when a ~17px Windows WebView2 classic scrollbar
	// occupies `.bag-grid-scroll` (headless Chromium hides overlay scrollbars
	// unless styled via ::-webkit-scrollbar) — and the grid must never clip
	// horizontally.
	it.each([
		640, 641, 700, 771, 772, 774, 775, 891, 892, 900, 901, 1000, 1011, 1012, 1014, 1015, 1128, 1131,
		1132, 1280
	])(
		'keeps every slot at least 6.6rem wide without horizontal clipping at %d×360 (even with a 17px classic scrollbar)',
		async (width) => {
			await page.viewport(width, 360);
			window.scrollTo(0, 0);
			render(GameShell);
			emitHudState(baseHudState(stockedBag));
			await openBag();

			const screen = bagScreen();
			const scroll = screen.querySelector<HTMLElement>('.bag-grid-scroll')!;
			const gridEl = screen.querySelector<HTMLElement>('.bag-slot-grid')!;
			const slot = gridEl.querySelector<HTMLElement>('.bag-slot')!;
			const slotWidth = slot.getBoundingClientRect().width;
			const columns = getComputedStyle(gridEl).gridTemplateColumns.split(' ').length;
			// Headless Chromium launches with --hide-scrollbars (0px track),
			// whereas Windows WebView2 reserves ~17px from .bag-grid-scroll.clientWidth.
			const unreservedScrollbar = Math.max(0, 17 - (scroll.offsetWidth - scroll.clientWidth));
			const webview2SlotWidth = slotWidth - unreservedScrollbar / columns;
			expect(
				webview2SlotWidth,
				`slot width ${webview2SlotWidth}px (raw ${slotWidth}px, ${columns} cols) at ${width}×360 — grid inner ${scroll.clientWidth}px`
			).toBeGreaterThanOrEqual(105.6);
			expect(
				scroll.scrollWidth,
				`horizontal overflow at ${width}×360 (scrollWidth ${scroll.scrollWidth} > clientWidth ${scroll.clientWidth})`
			).toBeLessThanOrEqual(scroll.clientWidth + 1);
		}
	);

	// Mid-height band audit (architecture review): the ≤559px block shrinks
	// .bag-grid-scroll to 0.6rem padding, and the 560–719px landscape block
	// must keep the same padding and 17px-scrollbar headroom so every slot
	// stays ≥6.6rem across the mid-height band too.
	it.each([
		[640, 560],
		[640, 719],
		[755, 560],
		[772, 560],
		[832, 560],
		[891, 719],
		[892, 719],
		[1000, 640]
	])(
		'keeps every slot at least 6.6rem wide without horizontal clipping at %d×%d',
		async (width, height) => {
			await page.viewport(width, height);
			window.scrollTo(0, 0);
			render(GameShell);
			emitHudState(baseHudState(stockedBag));
			await openBag();

			const screen = bagScreen();
			const scroll = screen.querySelector<HTMLElement>('.bag-grid-scroll')!;
			const gridEl = screen.querySelector<HTMLElement>('.bag-slot-grid')!;
			const slotWidth = gridEl
				.querySelector<HTMLElement>('.bag-slot')!
				.getBoundingClientRect().width;
			const columns = getComputedStyle(gridEl).gridTemplateColumns.split(' ').length;
			const unreservedScrollbar = Math.max(0, 17 - (scroll.offsetWidth - scroll.clientWidth));
			const webview2SlotWidth = slotWidth - unreservedScrollbar / columns;
			expect(
				webview2SlotWidth,
				`slot width ${webview2SlotWidth}px (raw ${slotWidth}px, ${columns} cols) at ${width}×${height} — grid inner ${scroll.clientWidth}px`
			).toBeGreaterThanOrEqual(105.6);
			expect(
				scroll.scrollWidth,
				`horizontal overflow at ${width}×${height} (scrollWidth ${scroll.scrollWidth} > clientWidth ${scroll.clientWidth})`
			).toBeLessThanOrEqual(scroll.clientWidth + 1);
		}
	);

	it('keeps rendered columns consistent with the focus lattice at fractional viewport widths', async () => {
		// Fractional widths (e.g. 754.5px, reachable via browser zoom) fell
		// between the CSS band min-width lower bound and the JS max-width
		// chain: CSS rendered the base 6 columns while bagGridColumns computed
		// 3, so the focus lattice targeted wrong tiles on ~50px slots
		// (b666231 review). page.viewport rounds to integers, so an iframe at
		// 754.5px supplies the fractional CSS viewport while the component's
		// MediaQuery still reads the top-level viewport (754px → 2 columns).
		await page.viewport(754, 360);
		window.scrollTo(0, 0);

		const iframe = document.createElement('iframe');
		iframe.style.cssText = 'position:absolute;inset:0;width:754.5px;height:360px;border:0;';
		document.body.appendChild(iframe);
		const iframeDoc = iframe.contentDocument!;
		for (const node of document.head.querySelectorAll('style,link[rel="stylesheet"]')) {
			iframeDoc.head.appendChild(node.cloneNode(true));
		}
		const { mount, unmount } = await import('svelte');
		let shell: ReturnType<typeof mount> | undefined;
		try {
			shell = mount(GameShell, { target: iframeDoc.body });

			let menu: HTMLElement | undefined;
			await vi.waitFor(() => {
				emitHudState(baseHudState(stockedBag));
				menu = Array.from(iframeDoc.querySelectorAll('button')).find((b) =>
					/menu/i.test(b.textContent ?? '')
				);
				expect(menu, 'Menu button inside iframe').toBeTruthy();
			});
			menu!.click();
			let bag: HTMLElement | undefined;
			await vi.waitFor(() => {
				bag = Array.from(iframeDoc.querySelectorAll('button')).find((b) =>
					(b.textContent ?? '').includes('Bag')
				);
				expect(bag, 'Bag tile inside iframe command grid').toBeTruthy();
			});
			bag!.click();
			await vi.waitFor(() => {
				expect(
					iframeDoc.querySelector('[data-testid="inventory-slot-grid"]'),
					'bag grid inside iframe'
				).not.toBeNull();
			});
			await settleEntrance();

			const gridEl = iframeDoc.querySelector<HTMLElement>('.bag-slot-grid')!;
			const renderedColumns = getComputedStyle(gridEl).gridTemplateColumns.split(' ').length;
			const focusSlots = iframeDoc.querySelectorAll<HTMLElement>('[data-focus-id^="bag-slot-"]');
			const last = focusSlots[focusSlots.length - 1]!; // 30 stocked potions → index 29
			expect(+last.dataset.focusColumn!, 'last focus column vs rendered columns').toBe(
				29 % renderedColumns
			);
			expect(+last.dataset.focusRow!, 'last focus row vs rendered columns').toBe(
				Math.floor(29 / renderedColumns)
			);
			expect(
				gridEl.querySelector<HTMLElement>('.bag-slot')!.getBoundingClientRect().width,
				'slot width at 754.5px'
			).toBeGreaterThanOrEqual(105.6);
		} finally {
			// Removing the iframe alone skips Svelte teardown — the mounted
			// shell would keep its parent-window key listeners alive.
			if (shell) await unmount(shell);
			iframe.remove();
		}
	});

	it.each([
		[640, 360],
		[832, 560]
	])('keeps the detail action reachable and working at %d×%d', async (width, height) => {
		await withCommands(async (commands) => {
			await page.viewport(width, height);
			window.scrollTo(0, 0);
			render(GameShell);
			emitHudState(baseHudState(stockedBag));
			await openBag();

			await page.getByRole('tab', { name: 'Gear' }).click();
			await page.getByRole('button', { name: 'Rusty Dagger' }).click();

			const screen = bagScreen();
			const title = screen.querySelector<HTMLElement>('.bag-title')!;
			const close = screen.querySelector<HTMLElement>('.bag-rail-close')!;
			const action = document.querySelector<HTMLElement>('.bag-detail-action')!;
			action.scrollIntoView({ block: 'nearest' });
			expect(insideViewport(action.getBoundingClientRect(), width, height)).toBe(true);
			// Reaching the action must not scroll the pinned chrome away.
			expect(insideViewport(title.getBoundingClientRect(), width, height)).toBe(true);
			expect(insideViewport(close.getBoundingClientRect(), width, height)).toBe(true);
			expect((action as HTMLButtonElement).disabled).toBe(false);
			action.click();
			expect(commands).toContainEqual({ type: 'equip-item', itemId: 'rusty-dagger' });
			expect(document.documentElement.scrollTop).toBe(0);
		});
	});

	it.each([
		[640, 360],
		[832, 560]
	])(
		'keeps the five worn tiles disjoint and inside the Worn panel at %d×%d',
		async (width, height) => {
			await page.viewport(width, height);
			window.scrollTo(0, 0);
			render(GameShell);
			emitHudState(baseHudState(fullyEquipped));
			await openBag();

			const screen = bagScreen();
			const worn = screen.querySelector<HTMLElement>('[data-testid="inventory-worn"]')!;
			const wornRect = worn.getBoundingClientRect();
			const tiles = Array.from(worn.querySelectorAll<HTMLElement>('.bag-worn-tile')).map((el) =>
				el.getBoundingClientRect()
			);
			expect(tiles).toHaveLength(5);
			for (const rect of tiles) {
				expect(rect.width).toBeGreaterThan(0);
				expect(rect.height).toBeGreaterThan(0);
				expect(rect.left).toBeGreaterThanOrEqual(wornRect.left - 1);
				expect(rect.right).toBeLessThanOrEqual(wornRect.right + 1);
				expect(rect.top).toBeGreaterThanOrEqual(wornRect.top - 1);
				expect(rect.bottom).toBeLessThanOrEqual(wornRect.bottom + 1);
				expect(insideViewport(rect, width, height)).toBe(true);
			}
			for (let i = 0; i < tiles.length; i += 1) {
				for (let j = i + 1; j < tiles.length; j += 1) {
					const a = tiles[i]!;
					const b = tiles[j]!;
					expect(
						a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom,
						`worn tiles ${i} vs ${j} overlap at ${width}×${height}`
					).toBe(false);
				}
			}
		}
	);

	it('keeps keyboard navigation working across the rail tabs at 640×360', async () => {
		await page.viewport(640, 360);
		render(GameShell);
		emitHudState(baseHudState(stockedBag));
		await openBag();

		const potions = document.getElementById('inventory-potions-tab')!;
		potions.focus();
		await expect.element(page.getByRole('tab', { name: 'Potions' })).toHaveFocus();
		await userEvent.keyboard('{ArrowDown}');
		await expect.element(page.getByRole('tab', { name: 'Gear' })).toHaveFocus();
	});

	it.each([
		[390, 844],
		[832, 760]
	])('keeps the stacked scrolling column on narrow/tall %d×%d', async (width, height) => {
		await page.viewport(width, height);
		window.scrollTo(0, 0);
		render(GameShell);
		emitHudState(baseHudState(fullyEquipped));
		await openBag();

		expect(getComputedStyle(bagScreen()).flexDirection).toBe('column');
	});

	it.each([
		[640, 360],
		[832, 560]
	])(
		'keeps rail labels and Close unclipped in Japanese and Traditional Chinese at %d×%d',
		async (width, height) => {
			await page.viewport(width, height);
			window.scrollTo(0, 0);
			render(GameShell);
			emitHudState(baseHudState(fullyEquipped));
			await page.getByRole('button', { name: /menu/i }).click();
			await page.getByRole('button', { name: 'Bag' }).click();
			await expect.element(page.getByTestId('inventory-slot-grid')).toBeVisible();
			await settleEntrance();

			// Locale-specific rail labels prove Svelte flushed each locale into
			// the DOM before geometry is read — a bare updatePreferences() only
			// schedules the re-render (same stale-en bug the Quest fix solved).
			const potionsLabel = { en: 'Potions', ja: 'ポーション', 'zh-Hant': '藥水' } as const;
			const lootLabel = { en: 'Loot', ja: '戦利品', 'zh-Hant': '戰利品' } as const;
			try {
				for (const locale of ['ja', 'zh-Hant'] as const) {
					updatePreferences({ locale });
					await expect.element(page.getByRole('tab', { name: potionsLabel[locale] })).toBeVisible();
					await expect.element(page.getByRole('tab', { name: lootLabel[locale] })).toBeVisible();
					const screen = bagScreen();
					for (const card of screen.querySelectorAll<HTMLElement>('.bag-rail-card')) {
						expect(
							insideViewport(card.getBoundingClientRect(), width, height),
							`rail card ${card.textContent} inside ${width}×${height} (${locale})`
						).toBe(true);
						expect(
							card.scrollWidth <= card.clientWidth + 1,
							`rail card ${card.textContent} not clipped at ${width}×${height} (${locale})`
						).toBe(true);
					}
					const close = screen.querySelector<HTMLElement>('.bag-rail-close')!;
					expect(
						insideViewport(close.getBoundingClientRect(), width, height),
						`Close inside ${width}×${height} (${locale})`
					).toBe(true);
					const title = screen.querySelector<HTMLElement>('.bag-title')!;
					expect(
						insideViewport(title.getBoundingClientRect(), width, height),
						`title inside ${width}×${height} (${locale})`
					).toBe(true);
				}
			} finally {
				updatePreferences({ locale: 'en' });
				await expect.element(page.getByRole('tab', { name: 'Potions' })).toBeVisible();
			}
		}
	);
});
