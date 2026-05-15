import {
	defaultLocale,
	detectSupportedLocale,
	isSupportedLocale,
	type Locale
} from '$lib/game/i18n/locales';
import { getSaveStorage, type SaveStorage } from '$lib/game/save/storage';

export const LANGUAGE_PREFERENCE_STORAGE_KEY = 'gliese.preferences.v1';

export function loadLanguagePreference(
	storage: SaveStorage | undefined = getSaveStorage()
): Locale | null {
	const value = storage?.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY);
	return value && isSupportedLocale(value) ? value : null;
}

export function saveLanguagePreference(
	locale: Locale | null,
	storage: SaveStorage | undefined = getSaveStorage()
): void {
	if (!storage) return;
	if (locale === null) {
		storage.removeItem(LANGUAGE_PREFERENCE_STORAGE_KEY);
		return;
	}
	storage.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, locale);
}

export function resolveInitialLocale({
	storage = getSaveStorage(),
	languages
}: {
	storage?: SaveStorage;
	languages?: readonly string[];
} = {}): Locale {
	return loadLanguagePreference(storage) ?? detectSupportedLocale(languages) ?? defaultLocale;
}
