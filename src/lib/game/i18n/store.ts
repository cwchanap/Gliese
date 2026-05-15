import { defaultLocale, type Locale } from '$lib/game/i18n/locales';
import { resolveInitialLocale } from '$lib/game/i18n/preferences';

let activeLocale: Locale = defaultLocale;

export function initializeLocale(): Locale {
	activeLocale = resolveInitialLocale();
	return activeLocale;
}

export function getActiveLocale(): Locale {
	return activeLocale;
}
