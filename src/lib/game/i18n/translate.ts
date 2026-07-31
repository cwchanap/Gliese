import type { Locale } from '$lib/game/i18n/locales';
import { en, type EnglishMessages } from '$lib/game/i18n/messages/en';
import { ja } from '$lib/game/i18n/messages/ja';
import { zhHant } from '$lib/game/i18n/messages/zh-Hant';
import type { DeepPartial, MessageParams, MessagePath } from '$lib/game/i18n/messages/types';

export type MessageKey = MessagePath<EnglishMessages>;

const partialMessages = {
	'zh-Hant': zhHant,
	ja
} satisfies Record<Exclude<Locale, 'en'>, DeepPartial<EnglishMessages>>;

export function t(locale: Locale, key: MessageKey, params: MessageParams = {}): string {
	const localized = readMessage(getLocaleMessages(locale), key);
	const source = localized ?? readMessage(en, key);

	if (source === undefined) {
		return `[${key}]`;
	}

	return interpolate(source, params);
}

function getLocaleMessages(locale: Locale): EnglishMessages | DeepPartial<EnglishMessages> {
	switch (locale) {
		case 'en':
			return en;
		case 'zh-Hant':
			return partialMessages['zh-Hant'];
		case 'ja':
			return partialMessages.ja;
	}

	const exhaustiveLocale: never = locale;
	return exhaustiveLocale;
}

function readMessage(source: unknown, key: string): string | undefined {
	let current = source;

	for (const segment of key.split('.')) {
		if (!isRecord(current)) return undefined;
		current = current[segment];
	}

	return typeof current === 'string' ? current : undefined;
}

function interpolate(message: string, params: MessageParams): string {
	return message.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, paramName: string) => {
		const value = params[paramName];
		return value === undefined ? match : String(value);
	});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
