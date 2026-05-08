import { defineConfig } from '@playwright/test';

export default defineConfig({
	workers: 1,
	use: {
		baseURL: 'http://127.0.0.1:4173'
	},
	webServer: {
		command: 'bun run preview -- --host 127.0.0.1 --port 4173',
		port: 4173,
		reuseExistingServer: true
	},
	testDir: 'tests/e2e',
	testMatch: '**/*.e2e.{ts,js}'
});
