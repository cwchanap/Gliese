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
});
