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
	// The CI job is capped at 20 minutes, much of it setup Playwright never
	// sees. The workflow passes the job budget left after setup (minus a
	// reserve for the build and the report upload) as
	// PLAYWRIGHT_GLOBAL_TIMEOUT_MS, so a shared boot failure ends the run
	// here — Playwright writes its report and the upload step still runs.
	// Twelve minutes is the fallback when the variable is unset.
	globalTimeout: process.env.CI
		? Number(process.env.PLAYWRIGHT_GLOBAL_TIMEOUT_MS || 12 * 60_000)
		: 0,
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
