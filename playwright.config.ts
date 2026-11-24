import { defineConfig } from '@playwright/test';

// Single non-quarantined suite: every test in tests/e2e is a first-class,
// blocking check that runs fully parallel at zero retries. fullyParallel
// plus two CI workers lets the one spec file split across processes;
// locally it stays serial. Observation is per-page event listeners, so a
// test never inherits another worker's probe state.
export default defineConfig({
	fullyParallel: true,
	workers: process.env.CI ? 2 : 1,
	retries: 0,
	// The CI job is capped at 20 minutes and spends ~6 of them on setup. If a
	// shared boot failure makes every test burn its full timeout, the job cap
	// would cancel the run and skip the report upload. Ending the run here
	// (12 min, against ~9 for a healthy suite) lets Playwright write its
	// report and the upload step run.
	globalTimeout: process.env.CI ? 12 * 60_000 : 0,
	// Hosted runners split two Chromium workers over shared vCPUs, so Phaser
	// boot, HUD publishes and keyboard journeys run several times slower than
	// locally — bounds that are comfortable on a dev machine flake there.
	// Looser caps cost nothing while the suite is green; explicit per-test and
	// per-assert timeouts still win where a test sets them deliberately.
	timeout: process.env.CI ? 120_000 : 30_000,
	expect: { timeout: process.env.CI ? 30_000 : 5_000 },
	// CI keeps the terse dot output but also emits playwright-report/ for the
	// workflow's artifact upload; locally stays on the default list reporter.
	reporter: process.env.CI ? [['dot'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: 'http://127.0.0.1:4173',
		browserName: 'chromium',
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure'
	},
	webServer: {
		command: 'bun run preview -- --host 127.0.0.1 --port 4173',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	testDir: 'tests/e2e',
	testMatch: '**/*.e2e.{ts,js}'
});
