import { afterEach, describe, expect, it, vi } from 'vitest';

import { expectTimeout, testTimeout } from './e2e-timeout-budget';

const RUN_BUDGET_MS = 720_000;
const NOW = new Date('2026-11-24T12:00:00.000Z');

/** Pins the run clock so `elapsed` ms of the CI budget are already spent. */
function atElapsed(elapsedMs: number) {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	vi.stubEnv('CI', '1');
	vi.stubEnv('PLAYWRIGHT_GLOBAL_TIMEOUT_MS', `${RUN_BUDGET_MS}`);
	vi.stubEnv('PLAYWRIGHT_RUN_START_MS', `${NOW.getTime() - elapsedMs}`);
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.useRealTimers();
});

describe('testTimeout', () => {
	it('returns the requested bound unchanged outside CI', () => {
		vi.stubEnv('CI', '');
		expect(testTimeout(45_000)).toBe(45_000);
	});

	it('floors the requested bound at the 120s suite default', () => {
		atElapsed(0);
		expect(testTimeout(60_000)).toBe(120_000);
		expect(testTimeout(300_000)).toBe(300_000);
	});

	it('holds an early runaway three minutes under the global budget', () => {
		atElapsed(60_000);
		expect(testTimeout(600_000)).toBe(RUN_BUDGET_MS - 180_000);
	});

	it('clamps a late-starting test to the remaining deadline', () => {
		// 20s left in the run: the cap is 10s, not a 30s floor that would
		// hand the kill back to the global timeout interrupt.
		atElapsed(RUN_BUDGET_MS - 20_000);
		expect(testTimeout(120_000)).toBe(10_000);
	});

	it('keeps a positive sliver once the deadline has already passed', () => {
		// setTimeout(0) would disable the cap; the run is over either way,
		// so the failure still lands on the test's own timeout.
		atElapsed(RUN_BUDGET_MS);
		expect(testTimeout(120_000)).toBe(1_000);
	});
});

describe('expectTimeout', () => {
	it('returns the requested bound unchanged outside CI', () => {
		vi.stubEnv('CI', '');
		expect(expectTimeout(5_000)).toBe(5_000);
	});

	it('floors the requested bound at the 30s suite default on CI', () => {
		atElapsed(0);
		expect(expectTimeout(5_000)).toBe(30_000);
		expect(expectTimeout(45_000)).toBe(45_000);
	});
});
