import { describe, expect, it } from 'vitest';
import { getTextSpeedMs, getVisibleText, resolveDialogueConfirm } from './text-reveal';

describe('getTextSpeedMs', () => {
	it('maps slow to the slowest reveal cadence', () => {
		expect(getTextSpeedMs('slow')).toBe(40);
	});

	it('maps normal to the standard reveal cadence', () => {
		expect(getTextSpeedMs('normal')).toBe(20);
	});

	it('maps instant to zero delay', () => {
		expect(getTextSpeedMs('instant')).toBe(0);
	});
});

describe('getVisibleText', () => {
	const line = 'The eastern ruins are stirring again.';

	it('slices the line to the revealed character count at slow speed', () => {
		expect(getVisibleText(line, 12, 'slow')).toBe(line.slice(0, 12));
	});

	it('slices the line to the revealed character count at normal speed', () => {
		expect(getVisibleText(line, 5, 'normal')).toBe(line.slice(0, 5));
	});

	it('renders the full line at instant speed regardless of the count', () => {
		expect(getVisibleText(line, 0, 'instant')).toBe(line);
		expect(getVisibleText(line, 3, 'instant')).toBe(line);
	});

	it('clamps counts beyond the line length', () => {
		expect(getVisibleText(line, 999, 'normal')).toBe(line);
		expect(getVisibleText(line, 0, 'slow')).toBe('');
	});

	it('keeps surrogate pairs intact instead of splitting them', () => {
		expect(getVisibleText('a🌟b', 2, 'normal')).toBe('a🌟');
	});
});

describe('resolveDialogueConfirm', () => {
	it('completes the reveal first while the line is partially revealed', () => {
		expect(resolveDialogueConfirm({ visibleCharacters: 0, totalCharacters: 10 })).toBe('reveal');
		expect(resolveDialogueConfirm({ visibleCharacters: 9, totalCharacters: 10 })).toBe('reveal');
	});

	it('advances only once the line is fully revealed', () => {
		expect(resolveDialogueConfirm({ visibleCharacters: 10, totalCharacters: 10 })).toBe('advance');
		expect(resolveDialogueConfirm({ visibleCharacters: 12, totalCharacters: 10 })).toBe('advance');
	});
});
