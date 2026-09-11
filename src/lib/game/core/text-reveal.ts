import type { UiPreferences } from '$lib/game/i18n/preferences';

/** Per-character reveal cadence for the dialogue typewriter, in milliseconds. */
const TEXT_SPEED_MS: Record<UiPreferences['textSpeed'], number> = {
	slow: 40,
	normal: 20,
	instant: 0
};

export function getTextSpeedMs(speed: UiPreferences['textSpeed']): number {
	return TEXT_SPEED_MS[speed];
}

export function getVisibleText(
	text: string,
	visibleCharacters: number,
	speed: UiPreferences['textSpeed']
): string {
	if (speed === 'instant') return text;
	return Array.from(text).slice(0, Math.max(0, visibleCharacters)).join('');
}

export function resolveDialogueConfirm(input: {
	visibleCharacters: number;
	totalCharacters: number;
}): 'reveal' | 'advance' {
	return input.visibleCharacters < input.totalCharacters ? 'reveal' : 'advance';
}
