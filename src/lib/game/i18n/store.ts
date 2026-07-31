import { defaultLocale, type Locale } from '$lib/game/i18n/locales';
import { resolveInitialLocale, saveLanguagePreference } from '$lib/game/i18n/preferences';
import { writable } from 'svelte/store';

let activeLocale: Locale = defaultLocale;
const localeStore = writable<Locale>(activeLocale);

export const locale = {
	subscribe: localeStore.subscribe
};

export function initializeLocale(): Locale {
	activeLocale = resolveInitialLocale();
	localeStore.set(activeLocale);
	return activeLocale;
}

export function getActiveLocale(): Locale {
	return activeLocale;
}

export function setActiveLocale(locale: Locale): void {
	activeLocale = locale;
	localeStore.set(locale);
	saveLanguagePreference(locale);
}
