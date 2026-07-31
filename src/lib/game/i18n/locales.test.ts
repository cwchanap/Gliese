import { describe, expect, it } from 'vitest';

import {
	detectSupportedLocale,
	isSupportedLocale,
	normalizeLocale,
	supportedLocales
} from '$lib/game/i18n/locales';

describe('locales', () => {
	it('declares the supported locales in selector order', () => {
		expect(supportedLocales).toEqual(['en', 'zh-Hant', 'ja']);
		expect(isSupportedLocale('en')).toBe(true);
		expect(isSupportedLocale('zh-Hant')).toBe(true);
		expect(isSupportedLocale('ja')).toBe(true);
		expect(isSupportedLocale('zh-CN')).toBe(false);
	});

	it.each([
		['en-US', 'en'],
		['en-GB', 'en'],
		['zh-Hant', 'zh-Hant'],
		['zh-TW', 'zh-Hant'],
		['zh-HK', 'zh-Hant'],
		['zh-MO', 'zh-Hant'],
		['ja-JP', 'ja'],
		['fr-CA', null],
		['zh-CN', null]
	] as const)('normalizes %s', (input, expected) => {
		expect(normalizeLocale(input)).toBe(expected);
	});

	it('detects the first supported browser language', () => {
		expect(detectSupportedLocale(['fr-CA', 'ja-JP', 'en-US'])).toBe('ja');
		expect(detectSupportedLocale(['fr-CA', 'zh-HK', 'en-US'])).toBe('zh-Hant');
		expect(detectSupportedLocale(['fr-CA'])).toBe('en');
		expect(detectSupportedLocale([])).toBe('en');
	});

	it('normalizes extended Chinese locale prefixes', () => {
		expect(normalizeLocale('zh-tw-TW')).toBe('zh-Hant');
		expect(normalizeLocale('zh-hk-HK')).toBe('zh-Hant');
		expect(normalizeLocale('zh-mo-MO')).toBe('zh-Hant');
	});

	it('falls back to default locale when navigator is unavailable', () => {
		expect(detectSupportedLocale(undefined)).toBe('en');
	});

	it('returns null for empty or whitespace-only input', () => {
		expect(normalizeLocale('')).toBeNull();
		expect(normalizeLocale('   ')).toBeNull();
		expect(normalizeLocale(null)).toBeNull();
		expect(normalizeLocale(undefined)).toBeNull();
	});

	it('normalizes zh-hant with an extended prefix', () => {
		expect(normalizeLocale('zh-hant-TW')).toBe('zh-Hant');
	});
});
