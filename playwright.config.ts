import { defineConfig } from '@playwright/test';

// HPA-399/PR1 regional-background proof cases depend on retired V1 LFS art.
// Keep the generic gameplay E2E suite while the V2 map work replaces those proofs.
const retiredV1RegionalBackgroundProofs =
	/(regional background (load failure|missing foreground|wrong-sized base|wrong-sized foreground|alternative ownership|base render failure|foreground render failure|enabled capture|collision capture)|regional foreground runtime (hedge|low-wall) (behind|front) proof|entry map boots with no game console errors)/;

// Known-flaky route-walking e2e tests: pre-existing timing/precision failures
// on CI runners (hero gets stuck at collision boundaries, route segments not
// axis-aligned). Isolated into the `flaky` project so the `gate` project can
// run blocking in the Asset Integrity workflow without these masking real
// regressions. `bun run test:e2e` (no --project) still runs both, matching
// prior local behavior.
//
// The HPA-586 interior graybox tests are parameterized over 7 interiors and
// all share the same route-walking flakiness — which specific case fails is
// non-deterministic across runs (shrine-of-aurora in one run, hero-house in
// another), so the whole describe title is matched rather than one case.
const flakyRouteWalkTests =
	/(Crossroads gameplay loop|traverses every map in fallback mode|Hero House painted interior preserves runtime|complete world layout journey renders approved Meadow art|HPA-586 interior graybox)/;

const exhaustivePaintedInteriorTests =
	/^(?!.*Blacksmith painted interior).*painted (?:village )?interiors?/i;

export default defineConfig({
	workers: 1,
	// Route-walking e2e tests are timing-sensitive on CI runners; allow
	// retries there but keep zero retries locally for fast feedback.
	retries: process.env.CI ? 2 : 0,
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
	testMatch: '**/*.e2e.{ts,js}',
	projects: [
		{
			name: 'gate',
			grepInvert: [
				retiredV1RegionalBackgroundProofs,
				flakyRouteWalkTests,
				exhaustivePaintedInteriorTests
			]
		},
		{
			name: 'exhaustive',
			grep: exhaustivePaintedInteriorTests,
			grepInvert: [retiredV1RegionalBackgroundProofs, flakyRouteWalkTests]
		},
		{
			name: 'flaky',
			grep: flakyRouteWalkTests,
			grepInvert: retiredV1RegionalBackgroundProofs
		}
	]
});
