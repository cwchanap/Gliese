import { describe, expect, it } from 'vitest';

import {
	LANGUAGE_PREFERENCE_STORAGE_KEY,
	loadLanguagePreference,
	resolveInitialLocale,
	saveLanguagePreference
} from '$lib/game/i18n/preferences';
import type { SaveStorage } from '$lib/game/save/storage';

function createMemoryStorage(initial: Record<string, string> = {}): SaveStorage {
	const values = new Map(Object.entries(initial));
	return {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, value),
		removeItem: (key) => values.delete(key)
	};
}

describe('language preferences', () => {
	it('loads a valid saved locale override', () => {
		const storage = createMemoryStorage({ [LANGUAGE_PREFERENCE_STORAGE_KEY]: 'ja' });

		expect(loadLanguagePreference(storage)).toBe('ja');
		expect(resolveInitialLocale({ storage, languages: ['en-US'] })).toBe('ja');
	});

	it('ignores invalid saved values and falls back to detection', () => {
		const storage = createMemoryStorage({ [LANGUAGE_PREFERENCE_STORAGE_KEY]: 'fr-CA' });

		expect(loadLanguagePreference(storage)).toBeNull();
		expect(resolveInitialLocale({ storage, languages: ['zh-TW'] })).toBe('zh-Hant');
	});

	it('saves and clears language preference separately from the game save key', () => {
		const storage = createMemoryStorage();

		saveLanguagePreference('zh-Hant', storage);
		expect(storage.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY)).toBe('zh-Hant');

		saveLanguagePreference(null, storage);
		expect(storage.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY)).toBeNull();
	});
});
