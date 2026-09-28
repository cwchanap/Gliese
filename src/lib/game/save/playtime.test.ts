import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatPlaytimeSeconds, getPlaytimeSeconds, resetPlaytime } from './playtime';

describe('playtime tracker', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-04T12:00:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('seeds resumed playtime from the slot record and accumulates from there', () => {
		resetPlaytime(3661);

		expect(getPlaytimeSeconds()).toBe(3661);

		vi.advanceTimersByTime(90_000);
		expect(getPlaytimeSeconds()).toBe(3751);
	});

	it('starts a new run from zero', () => {
		resetPlaytime(3661);
		resetPlaytime();

		expect(getPlaytimeSeconds()).toBe(0);
	});
});

describe('formatPlaytimeSeconds', () => {
	it('formats as zero-padded h:mm', () => {
		expect(formatPlaytimeSeconds(0)).toBe('00:00');
		expect(formatPlaytimeSeconds(59)).toBe('00:00');
		expect(formatPlaytimeSeconds(3661)).toBe('01:01');
		expect(formatPlaytimeSeconds(360_000)).toBe('100:00');
	});
});
