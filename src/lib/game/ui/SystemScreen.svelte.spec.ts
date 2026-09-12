import { page } from 'vitest/browser';
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
	beforeEach(() => {
		storage = createMemoryStorage();
		setSaveStorage(storage);
		initializePreferences();
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

	it('disables the Audio rail with the unavailable explanation', async () => {
		render(SystemScreen, { props: { open: true, onClose: vi.fn(), onkeydown: vi.fn() } });

		const audio = page.getByRole('tab', { name: 'Audio' });
		await expect.element(audio).toBeDisabled();
		await expect.element(audio).toHaveAttribute('aria-describedby', 'system-audio-unavailable');
	});

	it('selecting a language updates preferences and persists the JSON record', async () => {
		render(SystemScreen, { props: { open: true, onClose: vi.fn(), onkeydown: vi.fn() } });

		await page.getByRole('button', { name: '日本語' }).click();

		expect(getActivePreferences().locale).toBe('ja');
		expect(JSON.parse(storage.getItem(PREFERENCES_STORAGE_KEY)!)).toEqual({
			locale: 'ja',
			textSpeed: 'normal',
			motion: 'on',
			promptMode: 'auto'
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

	it('does not render when closed', async () => {
		render(SystemScreen, { props: { open: false, onClose: vi.fn(), onkeydown: vi.fn() } });

		expect(page.getByRole('dialog').elements()).toHaveLength(0);
	});
});
