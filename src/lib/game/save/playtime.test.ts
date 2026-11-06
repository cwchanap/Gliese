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

	it('does not double-count persisted seconds across a save/resume cycle', () => {
		resetPlaytime();
		vi.advanceTimersByTime(96_000);
		const persisted = getPlaytimeSeconds();
		expect(persisted).toBe(96);

		resetPlaytime(persisted);
		vi.advanceTimersByTime(30_000);
		expect(getPlaytimeSeconds()).toBe(126);
	});
});

describe('formatPlaytimeSeconds', () => {
	it('formats as unambiguous h:mm:ss', () => {
		expect(formatPlaytimeSeconds(0)).toBe('0:00:00');
		expect(formatPlaytimeSeconds(59)).toBe('0:00:59');
		expect(formatPlaytimeSeconds(96)).toBe('0:01:36');
		expect(formatPlaytimeSeconds(3480)).toBe('0:58:00');
		expect(formatPlaytimeSeconds(3661)).toBe('1:01:01');
		expect(formatPlaytimeSeconds(360_000)).toBe('100:00:00');
	});
});
