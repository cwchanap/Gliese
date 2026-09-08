import {
	defaultLocale,
	detectSupportedLocale,
	isSupportedLocale,
	type Locale
} from '$lib/game/i18n/locales';
import { getSaveStorage, type SaveStorage } from '$lib/game/save/storage';

export const PREFERENCES_STORAGE_KEY = 'gliese.preferences.v1';

export type TextSpeed = 'slow' | 'normal' | 'instant';
export type MotionPreference = 'on' | 'reduced';
export type PromptMode = 'auto' | 'pad' | 'keys';

export type UiPreferences = {
	locale: Locale;
	textSpeed: TextSpeed;
	motion: MotionPreference;
	promptMode: PromptMode;
};

export const DEFAULT_PREFERENCES: UiPreferences = {
	locale: defaultLocale,
	textSpeed: 'normal',
	motion: 'on',
	promptMode: 'auto'
};

const TEXT_SPEEDS: readonly TextSpeed[] = ['slow', 'normal', 'instant'];
const MOTION_PREFERENCES: readonly MotionPreference[] = ['on', 'reduced'];
const PROMPT_MODES: readonly PromptMode[] = ['auto', 'pad', 'keys'];

function isTextSpeed(value: unknown): value is TextSpeed {
	return typeof value === 'string' && TEXT_SPEEDS.includes(value as TextSpeed);
}

function isMotionPreference(value: unknown): value is MotionPreference {
	return typeof value === 'string' && MOTION_PREFERENCES.includes(value as MotionPreference);
}

function isPromptMode(value: unknown): value is PromptMode {
	return typeof value === 'string' && PROMPT_MODES.includes(value as PromptMode);
}

function isUiPreferences(value: unknown): value is UiPreferences {
	if (typeof value !== 'object' || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.locale === 'string' &&
		isSupportedLocale(record.locale) &&
		isTextSpeed(record.textSpeed) &&
		isMotionPreference(record.motion) &&
		isPromptMode(record.promptMode)
	);
}

function fallbackPreferences(): UiPreferences {
	return { ...DEFAULT_PREFERENCES, locale: detectSupportedLocale() };
}

export function loadPreferences(
	storage: SaveStorage | undefined = getSaveStorage()
): UiPreferences {
	const raw = storage?.getItem(PREFERENCES_STORAGE_KEY);
	if (raw) {
		// The previous contract stored a bare locale string at this key; treat it
		// as the locale (with defaults for everything else) when it is supported.
		if (isSupportedLocale(raw)) return { ...DEFAULT_PREFERENCES, locale: raw };
		try {
			const parsed: unknown = JSON.parse(raw);
			if (typeof parsed === 'string') {
				if (isSupportedLocale(parsed)) return { ...DEFAULT_PREFERENCES, locale: parsed };
			} else if (isUiPreferences(parsed)) {
				return {
					locale: parsed.locale,
					textSpeed: parsed.textSpeed,
					motion: parsed.motion,
					promptMode: parsed.promptMode
				};
			}
		} catch {
			// Malformed JSON falls through to the defaults below.
		}
	}
	return fallbackPreferences();
}

export function savePreferences(
	value: UiPreferences,
	storage: SaveStorage | undefined = getSaveStorage()
): void {
	storage?.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(value));
}
