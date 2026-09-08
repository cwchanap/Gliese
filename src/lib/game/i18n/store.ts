import { type Locale } from '$lib/game/i18n/locales';
import { loadPreferences, savePreferences, type UiPreferences } from '$lib/game/i18n/preferences';
import { derived, writable } from 'svelte/store';

let activePreferences: UiPreferences = loadPreferences();
const preferencesStore = writable<UiPreferences>(activePreferences);

/** Svelte-readable view of the full preferences record. */
export const preferences = {
	subscribe: preferencesStore.subscribe
};

/** Locale view of the same record (kept for existing `$locale` consumers). */
export const locale = {
	subscribe: derived(preferencesStore, ($preferences) => $preferences.locale).subscribe
};

export function initializePreferences(): UiPreferences {
	activePreferences = loadPreferences();
	preferencesStore.set(activePreferences);
	return activePreferences;
}

export function getActivePreferences(): UiPreferences {
	return activePreferences;
}

export function getActiveLocale(): Locale {
	return activePreferences.locale;
}

export function updatePreferences(patch: Partial<UiPreferences>): void {
	activePreferences = { ...activePreferences, ...patch };
	preferencesStore.set(activePreferences);
	savePreferences(activePreferences);
}

export function setActiveLocale(value: Locale): void {
	updatePreferences({ locale: value });
}
