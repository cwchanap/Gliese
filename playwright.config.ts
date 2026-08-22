import { defineConfig } from '@playwright/test';

// HPA-399/PR1 regional-background proof cases depend on retired V1 LFS art.
// Keep the generic gameplay E2E suite while the V2 map work replaces those proofs.
const retiredV1RegionalBackgroundProofs =
	/(regional background (load failure|missing foreground|wrong-sized base|wrong-sized foreground|alternative ownership|base render failure|foreground render failure|enabled capture|collision capture)|regional foreground runtime (hedge|low-wall) (behind|front) proof|entry map boots with no game console errors)/;

export default defineConfig({
	workers: 1,
	grepInvert: retiredV1RegionalBackgroundProofs,
	use: {
		baseURL: 'http://127.0.0.1:4173',
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure'
	},
	webServer: {
		command: 'bun run preview -- --host 127.0.0.1 --port 4173',
		port: 4173,
		reuseExistingServer: true
	},
	testDir: 'tests/e2e',
	testMatch: '**/*.e2e.{ts,js}'
});
