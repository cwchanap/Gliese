import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	DEFAULT_PREFERENCES,
	PREFERENCES_STORAGE_KEY,
	type UiPreferences
} from '$lib/game/i18n/preferences';
import {
	getActiveLocale,
	getActivePreferences,
	initializePreferences,
	locale,
	preferences,
	setActiveLocale,
	updatePreferences
} from '$lib/game/i18n/store';
import { setSaveStorage, type SaveStorage } from '$lib/game/save/storage';

function createMemoryStorage(initial: Record<string, string> = {}): SaveStorage {
	const values = new Map(Object.entries(initial));
	return {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, value),
		removeItem: (key) => values.delete(key)
	};
}

describe('preferences store', () => {
	let storage: SaveStorage;

	beforeEach(() => {
		storage = createMemoryStorage();
		setSaveStorage(storage);
		initializePreferences();
	});

	afterEach(() => {
		setSaveStorage(undefined);
	});

	it('initializes from the saved JSON record and publishes it', () => {
		const record: UiPreferences = {
			locale: 'ja',
			textSpeed: 'instant',
			motion: 'reduced',
			promptMode: 'keys'
		};
		storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(record));

		const published: UiPreferences[] = [];
		const unsubscribe = preferences.subscribe((value) => published.push(value));

		expect(initializePreferences()).toEqual(record);
		expect(getActivePreferences()).toEqual(record);
		expect(published.at(-1)).toEqual(record);

		unsubscribe();
	});

	it('exposes locale as a view of the same record', () => {
		storage.setItem(
			PREFERENCES_STORAGE_KEY,
			JSON.stringify({ ...DEFAULT_PREFERENCES, locale: 'ja' })
		);

		const published: string[] = [];
		const unsubscribe = locale.subscribe((value) => published.push(value));

		initializePreferences();
		expect(published.at(-1)).toBe('ja');
		expect(getActiveLocale()).toBe('ja');

		unsubscribe();
	});

	it('setActiveLocale delegates to updatePreferences and persists the record', () => {
		const published: UiPreferences[] = [];
		const unsubscribe = preferences.subscribe((value) => published.push(value));

		setActiveLocale('zh-Hant');

		const expected: UiPreferences = { ...DEFAULT_PREFERENCES, locale: 'zh-Hant' };
		expect(getActivePreferences()).toEqual(expected);
		expect(getActiveLocale()).toBe('zh-Hant');
		expect(JSON.parse(storage.getItem(PREFERENCES_STORAGE_KEY)!)).toEqual(expected);
		expect(published.at(-1)).toEqual(expected);

		unsubscribe();
	});

	it('updatePreferences patches a single field and persists the merged record', () => {
		updatePreferences({ textSpeed: 'instant' });

		const expected: UiPreferences = { ...DEFAULT_PREFERENCES, textSpeed: 'instant' };
		expect(getActivePreferences()).toEqual(expected);
		expect(getActiveLocale()).toBe('en');
		expect(JSON.parse(storage.getItem(PREFERENCES_STORAGE_KEY)!)).toEqual(expected);
	});

	it('keeps unspecified fields when updating repeatedly', () => {
		updatePreferences({ promptMode: 'pad' });
		updatePreferences({ motion: 'reduced' });

		expect(getActivePreferences()).toEqual({
			...DEFAULT_PREFERENCES,
			motion: 'reduced',
			promptMode: 'pad'
		});
		expect(JSON.parse(storage.getItem(PREFERENCES_STORAGE_KEY)!)).toEqual({
			...DEFAULT_PREFERENCES,
			motion: 'reduced',
			promptMode: 'pad'
		});
	});
});
