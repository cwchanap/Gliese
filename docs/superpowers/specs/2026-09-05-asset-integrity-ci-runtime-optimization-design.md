# Asset Integrity CI Runtime Optimization Design

**Date:** 2026-09-05

## Summary

Reduce the asset-sensitive pull-request feedback loop from roughly 66 minutes to a practical fast gate without deleting regression coverage. Keep the existing single Asset Integrity workflow and single Git LFS checkout, but change which expensive checks run on pull requests and allow the representative Playwright gate to use two workers.

The design reuses the repository's existing title-regex Playwright classification model rather than introducing tags or a new orchestrator. Exhaustive painted-interior journeys are classified by a future-facing rule, the single 6400×6400 assembly proof is conditionally skipped inside its existing Vitest file on pull requests, and known-flaky route walking remains isolated in the existing `flaky` project.

## Baseline

Representative PR #38 run `33993795682` took about 66 minutes:

- LFS-dependent asset unit tests: about 6.2 minutes.
  - `meadow-entry-painted-v2-complete-assembly.test.ts`: about 368 seconds.
  - `assembles deterministic opaque canonical 6400×6400 output with both-axis handoffs`: about 362 seconds by itself.
- Vite build: about 2 seconds.
- Blocking Playwright gate: 41 tests, one worker, about 28.9 minutes.
- Known-flaky Playwright project: 10 tests, one worker, about 29.3 minutes.
- CI retries are globally configured to two retries.
- Failure/retry artifacts were large: roughly 509 MB for the gate and 1.2 GB for the flaky run.

The problem is therefore cadence and serialization, not build time.

## Goals

1. Target a successful PR Asset Integrity run of **15 minutes or less**.
2. Treat **20 minutes as the hard acceptance ceiling**. If a representative successful PR run remains above 20 minutes, stop and revisit the classification/concurrency design; do not automatically add sharding.
3. Preserve every current non-retired Playwright test in `gate`, `exhaustive`, or `flaky`.
4. Preserve the exact 6400×6400 deterministic assembly proof outside the PR fast path.
5. Keep representative gameplay coverage on the PR gate, including boot/runtime integration, shop, battle, Blacksmith graybox entrance, and the continuous Meadow outdoor-route proof even where an individual test has a long timeout budget.
6. Keep local `bun run test:e2e` comprehensive when no `--project` is supplied.
7. Keep one workflow, one runner, and one LFS checkout.

## Non-goals

- Fix route-walking precision/flakiness.
- Rewrite or split `tests/e2e/game.e2e.ts`.
- Replace Playwright or Vitest.
- Introduce Playwright tags solely for this task.
- Add a custom test-duration database, historical balancer, or CI orchestrator.
- Add GitHub Actions matrix sharding or duplicate LFS downloads.
- Add build-artifact fan-out between runners.
- Change `.github/workflows/ci.yml`.
- Change game runtime behavior or production assets.
- Move every slow test off the PR gate merely because it has a large timeout.

## Design Principles

### Classify by purpose, not current title inventory

The repository already classifies E2E tests with title regexes plus `grep`/`grepInvert`. Extend that machinery with a semantic painted-interior rule instead of enumerating today's interior names.

This prevents a future `Foo painted interior ...` journey from silently falling back into the PR gate and gradually rebuilding the long feedback loop.

### PR gate remains representative

The PR lane answers: **does the changed asset-bearing build still boot and do representative gameplay/asset interactions work?**

The non-PR exhaustive lane answers: **do the expensive authored painted-interior journeys and full master-assembly proof still work?**

Slow does not automatically mean exhaustive. Representative outdoor routing, shops, battle, and focused graybox/runtime tests stay on the gate unless they are explicitly classified as painted-interior exhaustive coverage or known-flaky coverage.

### Use one runner with conservative parallelism

The Asset Integrity workflow continues to perform one LFS checkout. The gate uses two Playwright workers with fully-parallel scheduling because most E2E cases live in one large file and Playwright otherwise parallelizes primarily at file level.

Do not start with four workers. If the exact two-worker command proves unstable, the fallback is one worker plus a runtime/design reassessment, not matrix sharding.

## Playwright Project Partition

`playwright.config.ts` will expose three projects: `gate`, `exhaustive`, and `flaky`.

Repository defaults remain:

```ts
workers: 1,
retries: process.env.CI ? 2 : 0,
```

Those defaults continue to govern ordinary local runs and any project invocation that does not override them.

### Existing flaky classifier

Keep `flakyRouteWalkTests` unchanged as the source of truth for known route-walking instability.

### Exhaustive classifier

Add:

```ts
const exhaustivePaintedInteriorTests = /painted (village )?interiors?/;
```

This deliberately matches both individual titles such as `Guild Hall painted interior ...` and aggregate titles such as `all eight painted village interiors`.

`Hero House painted interior preserves runtime, reload, and fallback contracts` also matches this broad rule, but it is already owned by `flakyRouteWalkTests`. The exhaustive project must therefore invert the flaky classifier.

### Projects

Use this partition:

```ts
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
```

Partition contract for every non-retired E2E test:

1. known-flaky route walking -> `flaky`;
2. otherwise, painted-interior journey -> `exhaustive`;
3. otherwise -> `gate`.

`bunx playwright test --list` is the contract check. For the PR #38 baseline the expected partition is 33 gate + 8 exhaustive + 10 flaky = 51 non-retired project selections. If `main` gains tests, exact counts may change, but the selections must remain disjoint and complete.

## 6400×6400 Assembly Proof

Do not use a Vitest `-t` whitelist in workflow YAML. The existing assembly test file has five cases today; copying four titles into CI would create a second classifier that future tests could silently miss.

Instead, add one explicit environment-controlled skip next to the single expensive case in `meadow-entry-painted-v2-complete-assembly.test.ts`:

```ts
const skipExhaustiveAssembly = process.env.CI_SKIP_EXHAUSTIVE_ASSEMBLY === '1';

it.skipIf(skipExhaustiveAssembly)(
	'assembles deterministic opaque canonical 6400×6400 output with both-axis handoffs',
	async () => {
		// existing test body unchanged
	},
	450_000
);
```

Only that test is conditional. The other four cases remain normal `it(...)` tests.

The Asset Integrity unit step keeps its existing five-file list. Set `CI_SKIP_EXHAUSTIVE_ASSEMBLY=1` only for pull-request events; leave it false/unset for `push` to `main`, schedule, and manual runs. Therefore:

- PR: four lightweight complete-assembly cases run; the 6400×6400 proof is reported skipped.
- non-PR: all five cases run, including the full proof.
- ordinary local test runs: all five run by default.

No new test file and no `vite.config.ts` change are needed.

## Workflow Structure

Keep `.github/workflows/asset-integrity.yml` as the only Asset Integrity workflow.

### Common setup

Keep one LFS checkout, LFS pointer verification, Bun setup, explicit Chromium installation, and one Vite build.

Change dependency installation to:

```sh
bun install --frozen-lockfile --ignore-scripts
```

The repository `prepare` script explicitly executes `playwright install`, so `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` cannot prevent that explicit all-browser download. Asset Integrity does not need Husky lifecycle setup; the workflow installs the required Chromium explicitly afterward.

### Asset-unit step

Keep the current five file arguments exactly as the unit-test selection boundary and add an event-derived environment value:

```yaml
env:
  CI_SKIP_EXHAUSTIVE_ASSEMBLY: ${{ github.event_name == 'pull_request' && '1' || '0' }}
```

Do not duplicate the assembly test invocation and do not add test-title matching to YAML.

### Gate command on every Asset Integrity event

Use the same command for PR, `push`, schedule, and manual events:

```sh
bunx playwright test --project=gate --workers=2 --retries=1 --fully-parallel
```

This is an Asset Integrity workflow override, not a repository-wide default. `workers: 1` remains in `playwright.config.ts`.

Using one gate command for every event avoids separate PR/non-PR orchestration and ensures the same blocking gate behavior is exercised before and after merge.

### Pull-request path

For a non-draft asset-relevant PR:

1. common setup;
2. existing five-file asset unit command with the 6400×6400 case conditionally skipped;
3. build;
4. two-worker `gate` command;
5. gate report upload.

Do not run Playwright `exhaustive` or `flaky`.

### Non-PR path

For `push` to `main`, weekly schedule, and `workflow_dispatch`:

1. common setup;
2. existing five-file asset unit command with the full 6400×6400 case enabled;
3. build;
4. the same two-worker `gate` command;
5. gate report upload;
6. Playwright `exhaustive` with one worker, blocking;
7. exhaustive report upload;
8. Playwright `flaky` with one worker, non-blocking;
9. flaky report upload.

## Concurrency

Add:

```yaml
concurrency:
  group: asset-integrity-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

The primary benefit is stopping superseded long PR runs from consuming runner/LFS time.

## Parallelism Proof Before Runtime Acceptance

Do not let the representative GitHub Actions wall-clock run be the first time the new scheduling mode executes.

After the classifier change and build, run the exact gate command once:

```sh
bun run build
bunx playwright test --project=gate --workers=2 --retries=1 --fully-parallel
```

This run must complete successfully before the task relies on the 2-worker design. Merely confirming that two workers start is useful diagnostics but is not sufficient completion evidence.

If the exact command is unstable under two workers:

1. fall back to one worker;
2. re-measure;
3. revisit which truly exhaustive tests belong off the PR critical path if the PR lane then exceeds 20 minutes;
4. do not introduce matrix sharding automatically.

## Reporting

Keep per-project uploads because each Playwright invocation replaces `playwright-report/` and `test-results/`.

- upload gate artifacts immediately after gate;
- on non-PR events, upload exhaustive artifacts immediately after exhaustive;
- upload flaky artifacts immediately after flaky;
- keep seven-day retention;
- do not add report merging.

## Failure Semantics

### PR

- LFS/unit checks: blocking; full 6400×6400 case skipped.
- Build: blocking.
- `gate`: blocking.
- `exhaustive`: not run.
- `flaky`: not run.

### Non-PR

- LFS/unit checks including full 6400×6400 proof: blocking.
- Build: blocking.
- `gate`: blocking with the same two-worker/one-retry command.
- `exhaustive`: blocking, one worker.
- `flaky`: non-blocking, one worker.

## Acceptance Criteria

1. `gate`, `exhaustive`, and `flaky` form a complete, intentional partition of all non-retired E2E selections.
2. `exhaustivePaintedInteriorTests` uses `/painted (village )?interiors?/` rather than a closed interior-name list.
3. `exhaustive` inverts `flakyRouteWalkTests`, so Hero House remains owned only by `flaky`.
4. Future painted-interior journey titles following the current naming convention default to `exhaustive`, not `gate`.
5. Pull requests do not run Playwright `exhaustive` or `flaky`.
6. Pull requests run the existing five-file asset-unit command but skip only the full 6400×6400 test through `CI_SKIP_EXHAUSTIVE_ASSEMBLY`.
7. Non-PR events run the full 6400×6400 proof without a separate title whitelist or duplicate test command.
8. Every Asset Integrity `gate` invocation uses exactly two workers, one retry, and fully-parallel scheduling.
9. Repository-level `workers: 1` remains unchanged.
10. The exact two-worker gate command is executed successfully before runtime acceptance is evaluated.
11. `bun run test:e2e` without `--project` continues to select all three projects locally.
12. Existing retired-V1 exclusions and the existing flaky matcher remain intact.
13. Asset Integrity dependency installation uses `bun install --frozen-lockfile --ignore-scripts` and still installs Chromium explicitly.
14. A newer commit to the same PR cancels an older in-progress Asset Integrity run.
15. A representative successful PR Asset Integrity run completes in **20 minutes or less**, with **15 minutes or less** as the target.
16. No game runtime or production asset output changes are included.

## Rejected Alternatives

### Closed exhaustive title list

Rejected because every future painted interior would require another config edit and otherwise fall back into the PR gate.

### Vitest `-t` whitelist in YAML

Rejected because it duplicates test names into CI and silently omits future cases added to the same file.

### Split the assembly test file

Valid, but not chosen. A single `it.skipIf` environment gate changes fewer implementation files than splitting the test and updating file-level test registries, while keeping the existing Asset Integrity file selection intact.

### GitHub Actions matrix sharding / build fan-out

Rejected for this pass because it duplicates setup/LFS cost or requires additional artifact orchestration.

### Four or more Playwright workers

Rejected initially because the Phaser/route tests are timing-sensitive and a 2-vCPU hosted runner can become contention-bound.

### Splitting `game.e2e.ts`

Deferred. Fully-parallel scheduling is sufficient to test whether the current file organization can meet the runtime target without a structural E2E rewrite.
