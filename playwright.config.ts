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
