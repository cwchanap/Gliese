# Asset Integrity CI Runtime Optimization Design

**Date:** 2026-09-05

## Summary

Reduce the asset-sensitive pull-request feedback loop from roughly 66 minutes to a practical fast gate without deleting regression coverage.

Keep the existing single Asset Integrity workflow, one Git LFS checkout, and the repository's regex-based Playwright project model. The optimization has four primary levers:

1. skip only the single 6400×6400 deterministic assembly proof on the PR/manual-fast path;
2. keep one representative painted-interior render on the blocking gate while moving the remaining painted-interior journeys to an exhaustive non-PR project;
3. isolate per-test route helper state before enabling fully-parallel Playwright scheduling;
4. measure worker count on the actual hosted runner instead of assuming runner CPU capacity in the design.

Known-flaky route walking stays isolated. The workflow gains observable timing, bounded execution, PR-only superseded-run cancellation, and a manual `gate-only` lane for reproducible runner-side tuning.

## Baseline

Representative PR #38 Asset Integrity run `33993795682` took about 66 minutes:

- LFS-dependent asset unit tests: about 6.2 minutes.
  - `meadow-entry-painted-v2-complete-assembly.test.ts`: about 368 seconds.
  - `assembles deterministic opaque canonical 6400×6400 output with both-axis handoffs`: about 362 seconds by itself.
- Vite build: about 2 seconds.
- Blocking Playwright gate: 41 tests, one worker, about 28.9 minutes.
- Known-flaky Playwright project: 10 tests, one worker, about 29.3 minutes.
- Playwright CI retries are globally configured to two retries.
- The gate's dot reporter exposes almost no useful per-test timing information.

The bottlenecks are therefore the single master-assembly proof and serialized browser journeys, not build time or LFS checkout.

## Goals

1. Target a successful PR Asset Integrity run of **15 minutes or less**.
2. Treat **20 minutes as the hard acceptance ceiling**. If the PR fast path remains above 20 minutes after measured worker tuning, stop and revisit gate scope/concurrency; do not automatically add sharding.
3. Preserve every current non-retired Playwright test in `gate`, `exhaustive`, or `flaky`.
4. Preserve the exact 6400×6400 deterministic assembly proof outside the fast path.
5. Keep representative painted rendering on the PR gate, specifically **Blacksmith painted interior preserves baked composition and collision**.
6. Keep other representative gameplay coverage on the PR gate: boot/runtime integration, shop, battle, graybox/runtime checks, and the continuous Meadow outdoor-route proof unless already classified flaky.
7. Keep local `bun run test:e2e` comprehensive when no `--project` is supplied.
8. Keep one workflow, one runner, and one LFS checkout.
9. Make runner/runtime evidence observable enough to choose Playwright workers from measurement.
10. Bound runaway jobs while preserving the slower non-PR full lane.

## Non-goals

- Fix the underlying route-walking precision/flakiness beyond removing the cross-test mutable-state leak required for parallel safety.
- Rewrite or split `tests/e2e/game.e2e.ts`.
- Replace Playwright or Vitest.
- Introduce Playwright tags solely for this task.
- Add a custom duration database, historical balancer, or CI orchestrator.
- Add GitHub Actions matrix sharding or duplicate LFS downloads.
- Add build-artifact fan-out between runners.
- Change `.github/workflows/ci.yml`.
- Change game runtime behavior or production assets.
- Move every slow test off the PR gate merely because it has a large timeout.
- Centralize the duplicated LFS Vitest filename list in `vite.config.ts` in this PR. That duplication is acknowledged as follow-up maintenance, not frozen as permanent architecture.

## Design Principles

### Classify by purpose, with one deliberate representative exception

The repository already classifies E2E tests with title regexes plus `grep`/`grepInvert`. Extend that machinery rather than introducing tags.

Future painted-interior journeys should default to `exhaustive`, **except one deliberately named representative render** retained on `gate`. That single carve-out is not a closed list of all interiors.

### PR gate remains representative

The PR lane answers: **does the changed asset-bearing build still boot and do representative game and asset-render interactions work?**

The non-PR exhaustive lane answers: **do the remaining expensive authored painted-interior journeys and the full master-assembly proof still work?**

Byte-level asset assertions alone are not sufficient; at least one painted interior must render through Phaser on the blocking PR path.

### Parallelism requires test isolation first

`tests/e2e/game.e2e.ts` carries module-level mutable `previousRouteSettleTolerance`. `runBrowserRoute` reads it into `startTolerance`, then updates it after each route. Serial file execution makes that deterministic; `--fully-parallel` does not.

Before enabling fully-parallel scheduling, add:

```ts
test.beforeEach(() => {
	previousRouteSettleTolerance = AXIS_SETTLE_TOLERANCE;
});
```

This preserves within-test route chaining while preventing one test from inheriting another test's terminal tolerance.

### Worker count is a measured output, not a design constant

Repository defaults stay:

```ts
workers: 1,
retries: process.env.CI ? 2 : 0,
```

Asset Integrity may override gate workers, but the final count is chosen from hosted-runner measurement after route-state isolation.

Start with two workers. If two are stable and meet the target/ceiling, keep two. If they miss the target or remain unstable, compare against `min(4, nproc)` through the manual gate-only lane. Choose the smallest stable measured count that meets the hard ceiling.

Do not reduce retries merely to claim a faster success path; retry cost is paid only on failure.

## Playwright Project Partition

`playwright.config.ts` will expose `gate`, `exhaustive`, and `flaky`.

Keep `flakyRouteWalkTests` unchanged.

Keep this existing painted render on `gate`:

```text
Blacksmith painted interior preserves baked composition and collision
```

Use a broad future-facing exhaustive matcher with that one representative exclusion:

```ts
const exhaustivePaintedInteriorTests =
	/^(?!.*Blacksmith painted interior).*painted (?:village )?interiors?/i;
```

Projects:

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

Partition priority:

1. retired V1 -> excluded;
2. known flaky -> `flaky`;
3. Blacksmith painted representative -> `gate`;
4. other painted-interior journeys -> `exhaustive`;
5. all other non-retired tests -> `gate`.

For the reviewed 51-test baseline, the expected partition is:

```text
34 gate
7 exhaustive
10 flaky
51 total
```

Counts may grow as `main` gains tests, but the partition must remain disjoint and complete.

## 6400×6400 Assembly Proof

Do not use a Vitest `-t` whitelist in workflow YAML. Add one environment-controlled skip next to the expensive case:

```ts
const skipExhaustiveAssembly = process.env.CI_SKIP_EXHAUSTIVE_ASSEMBLY === '1';
```

Apply `it.skipIf(skipExhaustiveAssembly)` only to `assembles deterministic opaque canonical 6400×6400 output with both-axis handoffs`; leave its callback/assertions/timeout unchanged.

Fast paths set `CI_SKIP_EXHAUSTIVE_ASSEMBLY=1`:

- pull request;
- manual `workflow_dispatch` with `lanes=gate-only`.

Full paths keep the proof enabled:

- push to `main`;
- weekly schedule;
- manual `workflow_dispatch` with `lanes=full`.

The existing five-file workflow selection remains unchanged in this PR. Its duplication with `vite.config.ts` is follow-up maintenance.

## Dependency Installation

The repository currently runs:

```json
"prepare": "playwright install || echo '' && husky"
```

Change it to:

```json
"prepare": "playwright install chromium || echo '' && husky"
```

Gliese's browser tests use Chromium; normal contributor/core-CI installs should not fetch all Playwright browser families.

Asset Integrity still uses:

```sh
bun install --frozen-lockfile --ignore-scripts
bunx playwright install --with-deps chromium
```

`--ignore-scripts` is hygiene, not a primary runtime lever.

## Workflow Dispatch and Measurement

Extend `workflow_dispatch`:

```yaml
workflow_dispatch:
  inputs:
    lanes:
      description: Asset Integrity lanes to run
      required: true
      default: full
      type: choice
      options: [full, gate-only]
    gate_workers:
      description: Gate workers for runner-side measurement
      required: true
      default: '2'
      type: choice
      options: ['2', '4']
```

`gate-only` reproduces the PR fast path on a hosted runner without requiring a PR push. `gate_workers` allows 2-vs-4 measurement without another code change.

## Workflow Structure

Keep one Asset Integrity job and one LFS checkout.

Before expensive tests, print runner resources:

```sh
echo "nproc=$(nproc)"
free -m
```

Keep the five-file asset-unit command and set:

```yaml
CI_SKIP_EXHAUSTIVE_ASSEMBLY: >-
  ${{ (github.event_name == 'pull_request' ||
       (github.event_name == 'workflow_dispatch' && inputs.lanes == 'gate-only'))
      && '1' || '0' }}
```

Gate runs on every event with:

```sh
bunx playwright test \
  --project=gate \
  --workers="$GATE_WORKERS" \
  --fully-parallel \
  --reporter=list
```

Do **not** pass `--retries`; use configured CI retries.

For normal events, `GATE_WORKERS` is the committed measured default. Manual dispatch uses `inputs.gate_workers`.

Set gate step `timeout-minutes: 25` as a safety bound; acceptance remains <=20 minutes total for the successful PR path.

PR/manual gate-only path:

1. common setup;
2. asset units with master proof skipped;
3. build;
4. gate;
5. gate report upload.

Full non-PR path:

1. common setup;
2. full asset units;
3. build;
4. gate;
5. gate report upload;
6. exhaustive, one worker, blocking;
7. exhaustive report upload;
8. flaky, one worker, non-blocking;
9. flaky report upload.

## Concurrency and Timeouts

Use:

```yaml
concurrency:
  group: asset-integrity-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

Only superseded PR runs are cancelled. Push/schedule/manual full runs remain valuable evidence.

Add job-level:

```yaml
timeout-minutes: 120
```

A 45-minute whole-job timeout is **not** adopted because the measured full non-PR baseline is already about 66 minutes. The 120-minute cap removes the default six-hour hang window while leaving full-lane headroom; gate has the tighter 25-minute step bound.

## Reporting

Keep per-project uploads because each Playwright invocation overwrites `playwright-report/` and `test-results/`.

- upload gate immediately after gate;
- upload exhaustive immediately after exhaustive;
- upload flaky immediately after flaky;
- retain seven days;
- do not merge reports.

Use `--reporter=list` on gate so Actions logs show completed test names and durations rather than only dots.

## Measurement Protocol

Local parallel execution is only a sanity check.

1. Make route state deterministic.
2. Verify the partition.
3. Run a local two-worker gate once for obvious concurrency defects.
4. Push implementation.
5. Run `workflow_dispatch` with `lanes=gate-only`, `gate_workers=2`.
6. Record `nproc`, memory, asset-unit duration, gate duration, retries, upload duration, and total.
7. If two workers are stable and total <=15m, keep two.
8. If total is >15m but <=20m, optionally measure four when `nproc >= 4`; keep the smaller stable count unless four materially improves the result.
9. If two workers exceed 20m, measure four when runner capacity permits.
10. If no stable measured candidate meets <=20m, stop and revisit gate classification/concurrency. One worker is diagnostic baseline, not a pre-approved fallback.
11. Commit the measured normal-event default and run the real PR path once for final acceptance.

## Failure Semantics

### PR / manual gate-only

- LFS/unit checks: blocking; full 6400×6400 proof skipped.
- Build: blocking.
- gate: blocking, configured retries retained.
- exhaustive/flaky: not run.

### Full non-PR

- LFS/unit checks including full proof: blocking.
- Build: blocking.
- gate: blocking.
- exhaustive: blocking, one worker.
- flaky: non-blocking, one worker.

## Follow-up: Centralize LFS Unit Selection

`vite.config.ts` and `asset-integrity.yml` currently duplicate the LFS asset-test filename set. This is a real maintenance hazard, but it is orthogonal to the measured runtime optimization.

After PR #40 lands, centralize the existing list behind the Vite-owned configuration/environment path so the workflow can invoke the selected LFS suite without duplicating filenames. This is not a PR #40 merge prerequisite.

## Acceptance Criteria

1. `previousRouteSettleTolerance` resets before every Playwright test before fully-parallel scheduling is enabled.
2. `gate`, `exhaustive`, and `flaky` are disjoint and complete for non-retired E2E tests.
3. Blacksmith painted-interior render remains on `gate`.
4. Future painted-interior titles default to `exhaustive` except that representative.
5. Hero House remains owned by `flaky`.
6. Reviewed baseline partition is 34 gate + 7 exhaustive + 10 flaky = 51.
7. PR/manual gate-only skip only the 6400×6400 proof; full events keep it.
8. PR/manual gate-only omit exhaustive and flaky.
9. Gate uses `--fully-parallel` and a worker count selected from hosted-runner measurement.
10. Gate does not override retries.
11. Gate uses list reporter; workflow logs print `nproc` and memory.
12. `workflow_dispatch(lanes=gate-only)` reproduces the PR fast lane and supports 2-vs-4 worker measurement.
13. Superseded runs are cancelled only for pull requests.
14. Job timeout is 120 minutes; gate timeout is 25 minutes.
15. Asset Integrity uses `--ignore-scripts` plus explicit Chromium installation.
16. Package `prepare` installs Chromium only.
17. Repository-level `workers: 1` remains unchanged.
18. Local `bun run test:e2e` remains comprehensive.
19. Existing retired-V1 and flaky classifier semantics remain intact.
20. Representative successful PR runtime is <=20 minutes; <=15 minutes is target.
21. If no stable measured worker candidate meets <=20 minutes, stop for design reassessment rather than accepting a known-slow fallback or adding sharding.
22. No game runtime or production asset output changes are included.

## Rejected / Deferred Alternatives

- **Closed exhaustive title list:** rejected; future painted interiors should default to exhaustive.
- **Vitest title whitelist in YAML:** rejected; it duplicates test titles into CI.
- **Matrix sharding/build fan-out:** rejected for this pass.
- **Fixed two-worker acceptance:** rejected; two is the initial candidate, not the answer.
- **One-worker fallback:** rejected as a pre-approved fallback because the known one-worker gate is already near 29 minutes before reclassification.
- **45-minute whole-job timeout:** rejected because the current full lane is already about 66 minutes.
- **LFS list centralization in this PR:** deferred as a maintenance follow-up.