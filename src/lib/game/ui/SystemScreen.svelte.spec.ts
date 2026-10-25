import { page, userEvent } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../../app.css';
import SystemScreen from '$lib/game/ui/SystemScreen.svelte';
import { PREFERENCES_STORAGE_KEY } from '$lib/game/i18n/preferences';
import { getActivePreferences, initializePreferences } from '$lib/game/i18n/store';
import { setSaveStorage, type SaveStorage } from '$lib/game/save/storage';

function createMemoryStorage(initial: Record<string, string> = {}): SaveStorage {
	const values = new Map(Object.entries(initial));
	return {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, value),
		removeItem: (key) => values.delete(key)
	};
}

let storage: SaveStorage;

function stubMatchMedia(matchesReducedMotion: boolean) {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: matchesReducedMotion && query === '(prefers-reduced-motion: reduce)',
		media: query,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		onchange: null,
		dispatchEvent: () => false
	}));
}

describe('SystemScreen', () => {
	beforeEach(async () => {
		storage = createMemoryStorage();
		setSaveStorage(storage);
		initializePreferences();
		// Pin a desktop viewport: the rail orientation follows the real
		// matchMedia result, which inherits whatever the previous spec file
		// left behind.
		await page.viewport(1280, 720);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		setSaveStorage(undefined);
	});

	it('renders rows with English / Normal / Quiet / On / Auto selected', async () => {
		render(SystemScreen, { props: { open: true, onClose: vi.fn(), onkeydown: vi.fn() } });

		const dialog = page.getByRole('dialog');
		await expect.element(dialog).toBeVisible();

		const selectedByRow = [
			['system-language-row', 'English'],
			['system-text-speed-row', 'Normal'],
			['system-hud-density-row', 'Quiet'],
			['system-motion-row', 'On'],
			['system-prompts-row', 'Auto']
		] as const;
		for (const [testId, name] of selectedByRow) {
			const option = page.getByTestId(testId).getByRole('button', { name, exact: true });
			await expect.element(option).toHaveAttribute('aria-pressed', 'true');
		}
	});

	it('disables Full density with the unavailable explanation', async () => {
		render(SystemScreen, { props: { open: true, onClose: vi.fn(), onkeydown: vi.fn() } });

		const full = page.getByRole('button', { name: 'Full', exact: true });
		await expect.element(full).toBeDisabled();
		await expect
			.element(full)
			.toHaveAttribute('aria-describedby', 'system-density-full-unavailable');
	});

	it('the Audio rail jumps to the Sound row, and Off persists', async () => {
		render(SystemScreen, { props: { open: true, onClose: vi.fn(), onkeydown: vi.fn() } });

		await page.getByRole('tab', { name: 'Audio' }).click();
		const on = page.getByRole('button', { name: 'On', exact: true }).nth(1);
		await expect.element(on).toHaveFocus();

		await page.getByRole('button', { name: 'Off', exact: true }).click();
		expect(getActivePreferences().sound).toBe('off');
		expect(JSON.parse(storage.getItem(PREFERENCES_STORAGE_KEY)!).sound).toBe('off');
	});

	it('exposes the Display rail as a focusable selected tab with roving arrows', async () => {
		render(SystemScreen, { props: { open: true, onClose: vi.fn(), onkeydown: vi.fn() } });

		const display = page.getByRole('tab', { name: 'Display' });
		await expect.element(display).toHaveAttribute('aria-selected', 'true');
		await expect.element(display).toHaveAttribute('tabindex', '0');

		// Roving: arrows move focus among the tabs, and the Audio and Input
		// shortcuts never claim selection — they only jump to their rows.
		await display.element().focus();
		const input = page.getByRole('tab', { name: 'Input' });
		await input.element().focus();
		await expect.element(input).toHaveAttribute('tabindex', '-1');
		await expect.element(input).toHaveAttribute('aria-selected', 'false');

		const audio = page.getByRole('tab', { name: 'Audio' });
		await display.element().focus();
		await userEvent.keyboard('{ArrowDown}');
		await expect.element(audio).toHaveFocus();
		await userEvent.keyboard('{ArrowDown}');
		await expect.element(input).toHaveFocus();
		await userEvent.keyboard('{ArrowUp}');
		await expect.element(audio).toHaveFocus();
	});

	it('selecting a language updates preferences and persists the JSON record', async () => {
		render(SystemScreen, { props: { open: true, onClose: vi.fn(), onkeydown: vi.fn() } });

		await page.getByRole('button', { name: '日本語' }).click();

		expect(getActivePreferences().locale).toBe('ja');
		expect(JSON.parse(storage.getItem(PREFERENCES_STORAGE_KEY)!)).toEqual({
			locale: 'ja',
			textSpeed: 'normal',
			motion: 'on',
			promptMode: 'auto',
			sound: 'on'
		});
	});

	it('selecting Reduced marks the dialog motion-reduced', async () => {
		render(SystemScreen, { props: { open: true, onClose: vi.fn(), onkeydown: vi.fn() } });

		await page.getByRole('button', { name: 'Reduced' }).click();

		await expect.element(page.getByRole('dialog')).toHaveClass(/heroic-motion-reduced/);
	});

	it('OS prefers-reduced-motion forces motion-reduced while the preference is On', async () => {
		stubMatchMedia(true);
		render(SystemScreen, { props: { open: true, onClose: vi.fn(), onkeydown: vi.fn() } });

		await expect.element(page.getByRole('dialog')).toHaveClass(/heroic-motion-reduced/);
		expect(getActivePreferences().motion).toBe('on');
	});

	it('Input rail focuses the Prompts row', async () => {
		render(SystemScreen, { props: { open: true, onClose: vi.fn(), onkeydown: vi.fn() } });

		await page.getByRole('tab', { name: 'Input' }).click();

		await expect.element(page.getByRole('button', { name: 'Auto' })).toHaveFocus();
	});

	it('roves the rail on the horizontal axis at narrow widths', async () => {
		await page.viewport(640, 600);
		try {
			render(SystemScreen, { props: { open: true, onClose: vi.fn(), onkeydown: vi.fn() } });

			// The rail renders as a 3-column row at ≤900px; roving follows.
			await expect
				.element(page.getByRole('tablist'))
				.toHaveAttribute('aria-orientation', 'horizontal');

			const display = page.getByRole('tab', { name: 'Display' });
			const audio = page.getByRole('tab', { name: 'Audio' });
			await display.element().focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect.element(audio).toHaveFocus();
			await userEvent.keyboard('{ArrowLeft}');
			await expect.element(display).toHaveFocus();
		} finally {
			await page.viewport(1280, 720);
		}
	});

	it('does not render when closed', async () => {
		render(SystemScreen, { props: { open: false, onClose: vi.fn(), onkeydown: vi.fn() } });

		expect(page.getByRole('dialog').elements()).toHaveLength(0);
	});
});
