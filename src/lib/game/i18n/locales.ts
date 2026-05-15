export const supportedLocales = ['en', 'zh-Hant', 'ja'] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = 'en';

export const localeLabels: Record<Locale, string> = {
	en: 'English',
	'zh-Hant': 'Traditional Chinese',
	ja: 'Japanese'
};

const supportedLocaleSet = new Set<string>(supportedLocales);

export function isSupportedLocale(value: string): value is Locale {
	return supportedLocaleSet.has(value);
}

export function normalizeLocale(value: string | null | undefined): Locale | null {
	const normalized = value?.trim();
	if (!normalized) return null;
	if (isSupportedLocale(normalized)) return normalized;

	const lower = normalized.toLowerCase();
	if (lower === 'en' || lower.startsWith('en-')) return 'en';
	if (lower === 'ja' || lower.startsWith('ja-')) return 'ja';
	if (lower === 'zh-hant' || lower.startsWith('zh-hant-')) return 'zh-Hant';
	if (lower === 'zh-tw' || lower === 'zh-hk' || lower === 'zh-mo') return 'zh-Hant';
	if (lower.startsWith('zh-tw-') || lower.startsWith('zh-hk-') || lower.startsWith('zh-mo-')) {
		return 'zh-Hant';
	}

	return null;
}

export function detectSupportedLocale(
	languages: readonly string[] = getNavigatorLanguages()
): Locale {
	for (const language of languages) {
		const locale = normalizeLocale(language);
		if (locale) return locale;
	}

	return defaultLocale;
}

function getNavigatorLanguages(): readonly string[] {
	if (typeof navigator === 'undefined') return [];
	return navigator.languages.length > 0
		? navigator.languages
		: [navigator.language].filter(Boolean);
}
