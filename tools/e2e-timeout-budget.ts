const MODULE_LOAD_MS = Date.now();

/**
 * Milliseconds since the Playwright run began. globalSetup stamps
 * PLAYWRIGHT_RUN_START_MS on the runner env, which worker processes inherit;
 * when tests run without that setup, module load — a few seconds after the
 * run starts — is the approximation.
 */
function runElapsedMs(): number {
	const runStart = Number(process.env.PLAYWRIGHT_RUN_START_MS) || MODULE_LOAD_MS;
	return Date.now() - runStart;
}

/**
 * CI-aware bounds for explicit timeouts. The config raises the suite defaults
 * on CI (test 120s, expect 30s — keep in sync with playwright.config.ts), so
 * an explicit bound tuned for the tighter local defaults must not shrink the
 * CI budget. testTimeout also keeps one test from holding the whole suite and
 * keeps the failure on the hanging test rather than a global-timeout
 * interrupt: an early runaway is cut three minutes before the
 * workflow-provided PLAYWRIGHT_GLOBAL_TIMEOUT_MS would end the run so queued
 * tests still get a slice, and a late-starting test is capped ten seconds
 * under the run time it actually has left so its own timeout fires first. The
 * floor under that cap is only a sliver — a real floor like 30s would hand
 * the kill back to the global deadline once under ~40s remained, and 0 would
 * disable the test timeout entirely.
 */
export function testTimeout(ms: number): number {
	if (!process.env.CI) return ms;
	const budget = Number(process.env.PLAYWRIGHT_GLOBAL_TIMEOUT_MS || 12 * 60_000);
	const hogCap = budget - 180_000;
	const deadlineCap = budget - runElapsedMs() - 10_000;
	return Math.min(Math.max(ms, 120_000), Math.max(1_000, Math.min(hogCap, deadlineCap)));
}

export function expectTimeout(ms: number): number {
	return process.env.CI ? Math.max(ms, 30_000) : ms;
}
