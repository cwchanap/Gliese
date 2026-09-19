import { type Locale } from '$lib/game/i18n/locales';
import { loadPreferences, savePreferences, type UiPreferences } from '$lib/game/i18n/preferences';
import { derived, readable, writable } from 'svelte/store';

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

/** OS-level prefers-reduced-motion setting; stays false outside the browser. */
const osReducedMotionStore = readable(false, (set) => {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
	const query = window.matchMedia('(prefers-reduced-motion: reduce)');
	set(query.matches);
	const onChange = (event: MediaQueryListEvent) => set(event.matches);
	query.addEventListener('change', onChange);
	return () => query.removeEventListener('change', onChange);
});

/** Effective reduced motion: the saved preference OR the OS setting. */
export const motionReduced = derived(
	[preferencesStore, osReducedMotionStore],
	([$preferences, $osReducedMotion]) => $preferences.motion === 'reduced' || $osReducedMotion
);

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
