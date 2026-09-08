import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	DEFAULT_PREFERENCES,
	PREFERENCES_STORAGE_KEY,
	loadPreferences,
	savePreferences,
	type UiPreferences
} from '$lib/game/i18n/preferences';
import { setSaveStorage, type SaveStorage } from '$lib/game/save/storage';

function createMemoryStorage(initial: Record<string, string> = {}): SaveStorage {
	const values = new Map(Object.entries(initial));
	return {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, value),
		removeItem: (key) => values.delete(key)
	};
}

function stubNavigatorLanguages(languages: readonly string[]): void {
	vi.stubGlobal('navigator', { languages });
}

describe('preferences', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		setSaveStorage(undefined);
	});

	it('loads a valid JSON preferences record', () => {
		const record: UiPreferences = {
			locale: 'ja',
			textSpeed: 'instant',
			motion: 'reduced',
			promptMode: 'pad'
		};
		const storage = createMemoryStorage({
			[PREFERENCES_STORAGE_KEY]: JSON.stringify(record)
		});

		expect(loadPreferences(storage)).toEqual(record);
	});

	it('falls back to defaults (with detected locale) on malformed JSON', () => {
		stubNavigatorLanguages(['zh-TW']);
		const storage = createMemoryStorage({ [PREFERENCES_STORAGE_KEY]: '{not json' });

		expect(loadPreferences(storage)).toEqual({ ...DEFAULT_PREFERENCES, locale: 'zh-Hant' });
	});

	it('falls back to defaults when the JSON record has invalid field values', () => {
		const storage = createMemoryStorage({
			[PREFERENCES_STORAGE_KEY]:
				'{"locale":"de","textSpeed":"ludicrous","motion":"sometimes","promptMode":"voice"}'
		});

		expect(loadPreferences(storage)).toEqual(DEFAULT_PREFERENCES);
	});

	it('migrates the old raw locale string to a defaults record keeping the locale', () => {
		const storage = createMemoryStorage({ [PREFERENCES_STORAGE_KEY]: 'ja' });

		expect(loadPreferences(storage)).toEqual({ ...DEFAULT_PREFERENCES, locale: 'ja' });
	});

	it('falls back to defaults when nothing is stored, detecting the locale from the browser', () => {
		stubNavigatorLanguages(['ja-JP', 'en-US']);

		expect(loadPreferences(createMemoryStorage())).toEqual({
			...DEFAULT_PREFERENCES,
			locale: 'ja'
		});
	});

	it('falls back to the default locale when detection finds no supported language', () => {
		stubNavigatorLanguages(['fr-FR', 'de-DE']);

		expect(loadPreferences(createMemoryStorage())).toEqual(DEFAULT_PREFERENCES);
	});

	it('returns defaults when no storage is wired', () => {
		setSaveStorage(undefined);

		expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
	});

	it('saves the record as a JSON document under the preferences key', () => {
		const storage = createMemoryStorage();
		const record: UiPreferences = {
			locale: 'zh-Hant',
			textSpeed: 'slow',
			motion: 'on',
			promptMode: 'keys'
		};

		savePreferences(record, storage);

		expect(storage.getItem(PREFERENCES_STORAGE_KEY)).toBe(JSON.stringify(record));
	});

	it('round-trips save then load', () => {
		const storage = createMemoryStorage();
		const record: UiPreferences = { ...DEFAULT_PREFERENCES, textSpeed: 'instant' };

		savePreferences(record, storage);

		expect(loadPreferences(storage)).toEqual(record);
	});

	it('tolerates a missing storage on save', () => {
		const record: UiPreferences = { ...DEFAULT_PREFERENCES };

		expect(() => savePreferences(record, undefined)).not.toThrow();
	});
});
