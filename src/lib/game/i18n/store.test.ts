import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	LANGUAGE_PREFERENCE_STORAGE_KEY,
	loadLanguagePreference
} from '$lib/game/i18n/preferences';
import { getActiveLocale, initializeLocale, locale, setActiveLocale } from '$lib/game/i18n/store';
import { setSaveStorage, type SaveStorage } from '$lib/game/save/storage';

function createMemoryStorage(initial: Record<string, string> = {}): SaveStorage {
	const values = new Map(Object.entries(initial));
	return {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, value),
		removeItem: (key) => values.delete(key)
	};
}

describe('locale store', () => {
	let storage: SaveStorage;

	beforeEach(() => {
		storage = createMemoryStorage();
		setSaveStorage(storage);
		setActiveLocale('en');
	});

	afterEach(() => {
		setActiveLocale('en');
		setSaveStorage(undefined);
	});

	it('initializes from saved preference and publishes the locale', () => {
		storage.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, 'ja');
		const published: string[] = [];
		const unsubscribe = locale.subscribe((value) => published.push(value));

		expect(initializeLocale()).toBe('ja');
		expect(getActiveLocale()).toBe('ja');
		expect(published.at(-1)).toBe('ja');

		unsubscribe();
	});

	it('updates the active locale and saves the preference', () => {
		const published: string[] = [];
		const unsubscribe = locale.subscribe((value) => published.push(value));

		setActiveLocale('zh-Hant');

		expect(getActiveLocale()).toBe('zh-Hant');
		expect(loadLanguagePreference(storage)).toBe('zh-Hant');
		expect(published).toEqual(['en', 'zh-Hant']);

		unsubscribe();
	});
});
