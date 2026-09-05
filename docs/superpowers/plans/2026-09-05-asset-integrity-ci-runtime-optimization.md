# Asset Integrity CI Runtime Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the asset-sensitive pull-request workflow from roughly 66 minutes to a target of 15 minutes or less, with 20 minutes as the hard acceptance ceiling, while preserving exhaustive and flaky regression coverage outside the PR fast path.

**Architecture:** Keep the existing single Asset Integrity workflow and one Git LFS checkout. Extend the existing Playwright title-regex partition to `gate`, `exhaustive`, and `flaky`; classify painted-interior journeys with one broad regex; conditionally skip only the single 6400×6400 Vitest proof on pull requests; and run the same two-worker gate command on every Asset Integrity event. Exhaustive and flaky Playwright projects remain non-PR only.

**Tech Stack:** GitHub Actions, Bun, Playwright 1.59.x, Vitest 4.1.x, Vite, Git LFS

**Spec:** `docs/superpowers/specs/2026-09-05-asset-integrity-ci-runtime-optimization-design.md`

## Global Constraints

- Continue implementation on this same PR/branch; do not open a second implementation PR.
- Keep one Asset Integrity workflow, one job, and one LFS checkout.
- Do not modify game runtime code or production asset output.
- Do not split `tests/e2e/game.e2e.ts`.
- Do not add Playwright tags, dynamic balancing, a custom CI orchestrator, matrix sharding, or build-artifact fan-out.
- Do not change `.github/workflows/ci.yml`, `vite.config.ts`, or `package.json`.
- Keep retired-V1 exclusions and `flakyRouteWalkTests` unchanged.
- Keep repository-level `workers: 1` unchanged.
- Every Asset Integrity `gate` invocation uses `--workers=2 --retries=1 --fully-parallel`.
- PR Asset Integrity omits Playwright `exhaustive`, Playwright `flaky`, and the full 6400×6400 assembly proof.
- Non-PR Asset Integrity retains the full assembly proof plus gate, exhaustive, and flaky coverage.
- Local `bun run test:e2e` without `--project` remains comprehensive.
- Representative successful PR runtime must be <=20 minutes; target <=15 minutes.
- If two-worker execution is unstable, fall back to one worker and revisit scope/runtime; do not auto-add sharding.

---

## File Structure

**Modify:**

- `playwright.config.ts` — add `exhaustivePaintedInteriorTests` and the `exhaustive` project; keep the three projects disjoint.
- `src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts` — conditionally skip only the existing 6400×6400 proof.
- `.github/workflows/asset-integrity.yml` — add concurrency, skip lifecycle scripts, set the assembly skip env by event, run the two-worker gate on every event, and run exhaustive/flaky only outside PRs.

---

### Task 1: Add a future-facing Playwright exhaustive classifier

**Files:**
- Modify: `playwright.config.ts`

**Interfaces:**
- Consumes: `retiredV1RegionalBackgroundProofs`, `flakyRouteWalkTests`.
- Produces: `exhaustivePaintedInteriorTests` and project `exhaustive`.
- Contract: flaky wins over exhaustive on overlap; every other non-retired test lands in gate.

- [ ] **Step 1: Capture the current baseline**

```sh
bunx playwright test --list --project=gate
bunx playwright test --list --project=flaky
```

PR #38 baseline: 41 gate, 10 flaky. If current counts differ, record them before editing.

- [ ] **Step 2: Add the broad classifier**

```ts
const exhaustivePaintedInteriorTests = /painted (village )?interiors?/;
```

This covers individual painted-interior journeys and `all eight painted village interiors`. Hero House also matches, but remains flaky because exhaustive explicitly inverts `flakyRouteWalkTests`.

- [ ] **Step 3: Replace the project array**

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

Leave unchanged:

```ts
workers: 1,
retries: process.env.CI ? 2 : 0,
```

- [ ] **Step 4: Verify the partition**

```sh
bunx playwright test --list --project=gate
bunx playwright test --list --project=exhaustive
bunx playwright test --list --project=flaky
bunx playwright test --list
```

PR #38 baseline expectation:

```text
33 gate
8 exhaustive
10 flaky
51 total selections
```

Check semantics, not only counts:

```text
Hero House painted interior -> flaky only
all eight painted village interiors -> exhaustive only
other painted-interior journeys -> exhaustive only
boot/shop/battle/Blacksmith graybox/continuous Meadow outdoor route -> gate
```

- [ ] **Step 5: Commit**

```sh
git add playwright.config.ts
git commit -m "test: classify painted interior e2e as exhaustive"
```

---

### Task 2: Skip only the full 6400×6400 assembly proof on PRs

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts`

**Interfaces:**
- Consumes: `process.env.CI_SKIP_EXHAUSTIVE_ASSEMBLY`.
- Contract: only the full-master test is conditional; every other current or future case in this file runs normally.

- [ ] **Step 1: Capture the five-test baseline**

```sh
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts
```

Expected: 5 passed. This is intentionally slow and is the one pre-change full-proof run.

- [ ] **Step 2: Add the skip condition above the describe block**

```ts
const skipExhaustiveAssembly = process.env.CI_SKIP_EXHAUSTIVE_ASSEMBLY === '1';
```

- [ ] **Step 3: Apply `it.skipIf` only to the full-master case**

```ts
it.skipIf(skipExhaustiveAssembly)(
	'assembles deterministic opaque canonical 6400×6400 output with both-axis handoffs',
	async () => {
		// existing body unchanged
	},
	450_000
);
```

Keep the body, assertions, buffers, and timeout unchanged.

- [ ] **Step 4: Verify PR mode without title filtering**

```sh
CI_SKIP_EXHAUSTIVE_ASSEMBLY=1 bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts
```

Expected: 4 passed, 1 skipped.

- [ ] **Step 5: Verify non-PR/default mode**

```sh
CI_SKIP_EXHAUSTIVE_ASSEMBLY=0 bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts
```

Expected: 5 passed.

- [ ] **Step 6: Commit**

```sh
git add src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts
git commit -m "test: allow PRs to skip full meadow assembly proof"
```

---

### Task 3: Reshape Asset Integrity around the fast gate

**Files:**
- Modify: `.github/workflows/asset-integrity.yml`

**Interfaces:**
- Consumes: `CI_SKIP_EXHAUSTIVE_ASSEMBLY`, projects `gate`, `exhaustive`, `flaky`.
- Produces: one PR fast path and one non-PR full path using the same gate command.

- [ ] **Step 1: Add superseded-run cancellation**

```yaml
concurrency:
  group: asset-integrity-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

- [ ] **Step 2: Skip package lifecycle scripts**

Replace dependency install with:

```yaml
- name: Install dependencies
  run: bun install --frozen-lockfile --ignore-scripts
```

Keep:

```yaml
- name: Install Playwright Chromium
  run: bunx playwright install --with-deps chromium
```

- [ ] **Step 3: Keep the existing five-file unit command; add only the event env**

```yaml
- name: Run LFS-dependent asset unit tests
  run: |
    bun run test:unit -- --run \
      src/lib/game/content/village-interior-assets.asset.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-art-proofs.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-pilot.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-underlay-assembly.test.ts \
      src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts
  env:
    CI_SKIP_EXHAUSTIVE_ASSEMBLY: ${{ github.event_name == 'pull_request' && '1' || '0' }}
```

Do not add `-t` filters or a second assembly invocation.

- [ ] **Step 4: Use one gate command on every Asset Integrity event**

```yaml
run: bunx playwright test --project=gate --workers=2 --retries=1 --fully-parallel
```

Do not add a PR condition around it.

- [ ] **Step 5: Keep the gate report immediately after gate**

Keep artifact name `asset-integrity-gate-report` and seven-day retention before later Playwright invocations overwrite results.

- [ ] **Step 6: Add blocking exhaustive Playwright for non-PR events**

```yaml
- name: Run exhaustive painted-interior e2e
  if: ${{ github.event_name != 'pull_request' }}
  run: bunx playwright test --project=exhaustive --workers=1 --retries=1
```

Then upload immediately:

```yaml
- name: Upload exhaustive Playwright report
  if: ${{ !cancelled() && github.event_name != 'pull_request' }}
  uses: actions/upload-artifact@v4
  with:
    name: asset-integrity-exhaustive-report
    path: |
      playwright-report/
      test-results/
    retention-days: 7
```

- [ ] **Step 7: Keep flaky diagnostic coverage non-PR and single-worker**

```yaml
- name: Run known-flaky route-walking e2e (non-blocking)
  if: ${{ !cancelled() && github.event_name != 'pull_request' }}
  continue-on-error: true
  run: bunx playwright test --project=flaky --workers=1
```

Keep configured CI retries for flaky. Apply the same non-PR condition to the existing flaky report upload.

- [ ] **Step 8: Review both event paths**

PR must run:

```text
LFS setup -> five-file units with heavy case skipped -> build -> 2-worker gate -> gate report
```

Non-PR must run:

```text
LFS setup -> five-file units with heavy case enabled -> build -> same 2-worker gate -> gate report -> exhaustive(1 worker) -> report -> flaky(1 worker, non-blocking) -> report
```

- [ ] **Step 9: Commit**

```sh
git add .github/workflows/asset-integrity.yml
git commit -m "ci: shorten asset integrity pull request gate"
```

---

### Task 4: Prove parallelism and measure the PR runtime

**Files:**
- Verify all three implementation files.

**Interfaces:**
- Produces: completed local two-worker proof plus one representative PR Actions timing.

- [ ] **Step 1: Static validation**

```sh
bun run lint
bun run check
bunx playwright test --list --project=gate
bunx playwright test --list --project=exhaustive
bunx playwright test --list --project=flaky
bunx playwright test --list
CI_SKIP_EXHAUSTIVE_ASSEMBLY=1 bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts
```

Expected: lint/check exit 0; partition remains complete; assembly file reports 4 passed + 1 skipped in PR mode.

- [ ] **Step 2: Build and run the exact parallel gate before CI is used as the first concurrency proof**

```sh
bun run build
bunx playwright test --project=gate --workers=2 --retries=1 --fully-parallel
```

Expected: gate passes and Playwright reports two workers. This must be a completed run, not merely a startup observation.

If it is unstable under two workers:

```text
reproduce once -> retry with one worker -> document -> reassess gate scope/runtime -> do not add sharding
```

- [ ] **Step 3: Inspect scope**

```sh
git diff --check
git diff --name-only main...HEAD
```

Expected implementation scope: the three planned implementation files plus these existing spec/plan docs; no runtime/assets/core-CI/package/vite changes.

- [ ] **Step 4: Trigger the real PR timing run on this same PR**

PR #40 is draft while planning and Asset Integrity skips draft PR jobs. After implementation and local verification, mark PR #40 ready for review. `ready_for_review` is already an Asset Integrity trigger and the implementation changes match its path filters.

Do not use a non-PR `workflow_dispatch` run as the PR timing measurement because non-PR execution intentionally includes exhaustive/flaky lanes.

- [ ] **Step 5: Measure and enforce the runtime gate**

Record setup, asset-unit, gate, artifact-upload, and total Asset Integrity durations.

```text
<=15m       target met
>15m <=20m  acceptable; record actual result
>20m        not complete; revisit remaining gate cost before merge
```

Do not automatically add sharding when the hard ceiling fails.

- [ ] **Step 6: Commit only verification-driven corrections**

If verification required changes, commit those changes. Otherwise do not create an empty verification commit.

---

## Self-Review Checklist

- [ ] Exhaustive uses `/painted (village )?interiors?/`, not a closed title list.
- [ ] Exhaustive inverts flaky, keeping Hero House in flaky only.
- [ ] Representative non-painted gameplay remains on gate even when slow.
- [ ] No Vitest title whitelist appears in YAML.
- [ ] Only the 6400×6400 case uses `CI_SKIP_EXHAUSTIVE_ASSEMBLY`.
- [ ] Asset Integrity keeps its existing five-file unit selection.
- [ ] Gate uses the same 2-worker/1-retry/fully-parallel command on every event.
- [ ] Exhaustive and flaky are non-PR only and single-worker.
- [ ] Exact two-worker gate completes before the PR wall-clock run is treated as concurrency proof.
- [ ] The 20-minute hard ceiling does not auto-trigger sharding.
