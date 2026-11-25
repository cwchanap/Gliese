// Stamps the instant the run began so testTimeout can cap a test against
// the budget it actually has LEFT: workers fork the runner's env at spawn,
// so the stamp reaches every test process. Without it a late-starting test
// would still get the whole suite budget and the global deadline — not the
// test's own timeout — would land the failure.
export default function globalSetup() {
	process.env.PLAYWRIGHT_RUN_START_MS = `${Date.now()}`;
}
