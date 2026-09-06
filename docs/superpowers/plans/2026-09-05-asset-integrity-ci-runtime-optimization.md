# Asset Integrity CI Runtime Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Asset Integrity pull-request feedback from roughly 66 minutes to a target of 15 minutes or less, with 20 minutes as the hard acceptance ceiling, while preserving representative painted rendering on PRs and exhaustive/flaky coverage outside the fast path.

**Architecture:** Keep one Asset Integrity workflow, one job, and one LFS checkout. Make `game.e2e.ts` safe for fully-parallel scheduling, extend the existing Playwright regex partition with one representative painted-interior carve-out, conditionally skip only the 6400×6400 master assembly proof on fast lanes, and choose gate workers from hosted-runner measurement. Keep project artifacts separate and use a manual gate-only dispatch path for repeatable tuning.

**Tech Stack:** GitHub Actions, Bun, Playwright 1.59.x, Vitest 4.1.x, Vite, Git LFS

**Spec:** `docs/superpowers/specs/2026-09-05-asset-integrity-ci-runtime-optimization-design.md`

## Global Constraints

- Continue implementation on PR #40 / `plan/e2e-ci-runtime-optimization`; do not open another implementation PR.
- Keep one Asset Integrity workflow, one job, and one Git LFS checkout.
- Do not modify game runtime behavior or production asset output.
- Do not split `tests/e2e/game.e2e.ts`.
- Do not add Playwright tags, dynamic duration balancing, a custom CI orchestrator, matrix sharding, or build-artifact fan-out.
- Keep `retiredV1RegionalBackgroundProofs` and `flakyRouteWalkTests` unchanged.
- Keep repository-level `workers: 1` and `retries: process.env.CI ? 2 : 0`.
- Keep **Blacksmith painted interior preserves baked composition and collision** on the blocking gate.
- Future painted-interior journeys default to exhaustive except that deliberate representative.
- PR and manual `gate-only` runs skip only the 6400×6400 master assembly proof and omit exhaustive/flaky.
- Full push/schedule/manual runs keep the master assembly proof plus gate, exhaustive, and flaky.
- Gate uses fully-parallel scheduling only after per-test route tolerance is reset.
- Do not pass `--retries` to gate; configured CI retries remain authoritative.
- Final normal-event gate worker count is chosen from hosted-runner measurement, not hard-coded by acceptance criteria.
- Successful PR Asset Integrity runtime must be <=20 minutes; <=15 minutes is the target.
- `vite.config.ts` LFS-list centralization is acknowledged but deferred from this PR.

---

## File Structure

**Modify:**

- `tests/e2e/game.e2e.ts` — reset route-settle module state in `test.beforeEach` before fully-parallel scheduling.
- `playwright.config.ts` — add exhaustive classifier/project while preserving one Blacksmith painted-interior representative on gate.
- `src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts` — gate only the existing 6400×6400 proof.
- `.github/workflows/asset-integrity.yml` — add fast/full dispatch lanes, runner diagnostics, bounded timeouts, PR-only cancellation, measured-worker gate, and non-PR exhaustive/flaky conditions.
- `package.json` — narrow the `prepare` Playwright install to Chromium.

**Do not modify in this PR:**

- `.github/workflows/ci.yml`
- `vite.config.ts`
- production game/runtime files
- production asset bytes

---

### Task 0: Isolate route helper state before parallel scheduling

**Files:**
- Modify: `tests/e2e/game.e2e.ts`

**Interfaces:**
- Consumes: existing `AXIS_SETTLE_TOLERANCE`, module-level `previousRouteSettleTolerance`.
- Produces: deterministic per-test initial route tolerance while preserving within-test route chaining.

- [ ] **Step 1: Confirm the mutable cross-test state**

Verify the file still contains:

```ts
let previousRouteSettleTolerance = AXIS_SETTLE_TOLERANCE;
```

and that `runBrowserRoute` still reads it into `startTolerance` and writes it after successful completion.

- [ ] **Step 2: Add a per-test reset before any fully-parallel config change**

Place once at module scope after the mutable declaration:

```ts
test.beforeEach(() => {
	previousRouteSettleTolerance = AXIS_SETTLE_TOLERANCE;
});
```

Do not reset inside `runBrowserRoute`; later routes in the same test may inherit the immediately preceding route's settle tolerance.

- [ ] **Step 3: Type-load the E2E file through Playwright**

```sh
bunx playwright test --list --project=gate
bunx playwright test --list --project=flaky
```

Expected: commands exit 0 and project counts are unchanged because this task changes state initialization only.

- [ ] **Step 4: Commit**

```sh
git add tests/e2e/game.e2e.ts
git commit -m "test: isolate route state for parallel e2e"
```

---

### Task 1: Add exhaustive partition while keeping one painted render on gate

**Files:**
- Modify: `playwright.config.ts`

**Interfaces:**
- Consumes: `retiredV1RegionalBackgroundProofs`, `flakyRouteWalkTests`.
- Produces: `exhaustivePaintedInteriorTests` and project `exhaustive`.
- Contract: Blacksmith representative -> gate; flaky wins on overlap; all other painted interiors -> exhaustive.

- [ ] **Step 1: Capture the current project list**

```sh
bunx playwright test --list --project=gate
bunx playwright test --list --project=flaky
```

Record current counts before editing.

- [ ] **Step 2: Add the future-facing exhaustive matcher with one representative exclusion**

```ts
const exhaustivePaintedInteriorTests =
	/^(?!.*Blacksmith painted interior).*painted (?:village )?interiors?/i;
```

Do not enumerate the other seven interior names.

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

- [ ] **Step 4: Verify counts and ownership**

```sh
bunx playwright test --list --project=gate
bunx playwright test --list --project=exhaustive
bunx playwright test --list --project=flaky
bunx playwright test --list
```

Reviewed 51-test baseline expectation:

```text
34 gate
7 exhaustive
10 flaky
51 total selections
```

Confirm from list output:

```text
Blacksmith painted interior preserves baked composition and collision -> gate only
Hero House painted interior preserves runtime... -> flaky only
all eight painted village interiors... -> exhaustive only
other painted-interior journeys -> exhaustive only
boot/shop/battle/continuous Meadow outdoor route -> gate unless already flaky
```

- [ ] **Step 5: Commit**

```sh
git add playwright.config.ts
git commit -m "test: partition exhaustive painted interior e2e"
```

---

### Task 2: Skip only the 6400×6400 master proof on fast lanes

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts`

**Interfaces:**
- Consumes: `process.env.CI_SKIP_EXHAUSTIVE_ASSEMBLY`.
- Produces: one conditional expensive case; all sibling tests remain unconditional.

- [ ] **Step 1: Run the existing file once before editing**

```sh
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts
```

Expected current baseline: 5 passed.

- [ ] **Step 2: Add the explicit environment switch**

```ts
const skipExhaustiveAssembly = process.env.CI_SKIP_EXHAUSTIVE_ASSEMBLY === '1';
```

- [ ] **Step 3: Apply `it.skipIf` only to the expensive test**

For the existing test named:

```text
assembles deterministic opaque canonical 6400×6400 output with both-axis handoffs
```

change only its declaration from:

```ts
it(
```

to:

```ts
it.skipIf(skipExhaustiveAssembly)(
```

Leave its existing callback body, assertions, and `450_000` timeout unchanged. Do not conditionally skip the other four cases.

- [ ] **Step 4: Verify fast mode**

```sh
CI_SKIP_EXHAUSTIVE_ASSEMBLY=1 bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts
```

Expected: 4 passed, 1 skipped.

- [ ] **Step 5: Verify full/default mode**

```sh
CI_SKIP_EXHAUSTIVE_ASSEMBLY=0 bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts
```

Expected: 5 passed.

- [ ] **Step 6: Commit**

```sh
git add src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts
git commit -m "test: gate full meadow assembly proof"
```

---

### Task 3: Fix install scope and make Asset Integrity observable/tunable

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/asset-integrity.yml`

**Interfaces:**
- Consumes: projects `gate`, `exhaustive`, `flaky`; env `CI_SKIP_EXHAUSTIVE_ASSEMBLY`.
- Produces: manual `lanes`/`gate_workers` inputs, PR-fast/full lane conditions, runner diagnostics, bounded timeout, and a reporter suitable for worker tuning.

- [ ] **Step 1: Narrow the repository prepare browser install**

Replace:

```json
"prepare": "playwright install || echo '' && husky"
```

with:

```json
"prepare": "playwright install chromium || echo '' && husky"
```

This does not replace Asset Integrity's explicit `--with-deps` installation; it prevents normal installs elsewhere from fetching Firefox/WebKit unnecessarily.

- [ ] **Step 2: Add manual lane and worker inputs**

Replace bare `workflow_dispatch:` with:

```yaml
workflow_dispatch:
  inputs:
    lanes:
      description: Asset Integrity lanes to run
      required: true
      default: full
      type: choice
      options:
        - full
        - gate-only
    gate_workers:
      description: Gate workers for runner-side measurement
      required: true
      default: '2'
      type: choice
      options:
        - '2'
        - '4'
```

- [ ] **Step 3: Add PR-only superseded-run cancellation**

```yaml
concurrency:
  group: asset-integrity-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

Do not use unconditional `true`; push/schedule/manual full evidence must not be cancelled by a newer event.

- [ ] **Step 4: Bound the job and report runner resources**

At job level:

```yaml
timeout-minutes: 120
```

After Bun setup:

```yaml
- name: Report runner resources
  run: |
    echo "nproc=$(nproc)"
    free -m
```

The 120-minute bound replaces the default six-hour hang window while remaining above the measured ~66-minute full baseline.

- [ ] **Step 5: Skip lifecycle scripts only in Asset Integrity**

```yaml
- name: Install dependencies
  run: bun install --frozen-lockfile --ignore-scripts
```

Keep:

```yaml
- name: Install Playwright Chromium
  run: bunx playwright install --with-deps chromium
```

Do not present `--ignore-scripts` as a major runtime lever.

- [ ] **Step 6: Keep the existing five-file unit command and set fast-mode env**

Keep the current five filenames exactly in this PR.

```yaml
env:
  CI_SKIP_EXHAUSTIVE_ASSEMBLY: >-
    ${{ (github.event_name == 'pull_request' ||
         (github.event_name == 'workflow_dispatch' && inputs.lanes == 'gate-only'))
        && '1' || '0' }}
```

No `-t` title whitelist and no duplicate assembly command.

- [ ] **Step 7: Add an initial normal-event gate worker default**

At job scope:

```yaml
env:
  DEFAULT_GATE_WORKERS: '2'
```

This is an initial candidate, not an acceptance requirement. Task 4 may change it to `'4'` if hosted-runner measurement supports that choice.

- [ ] **Step 8: Run gate on every event with measured/dispatch workers and configured retries**

```yaml
- name: Run Playwright e2e gate (blocking)
  timeout-minutes: 25
  env:
    GATE_WORKERS: >-
      ${{ github.event_name == 'workflow_dispatch'
          && inputs.gate_workers
          || env.DEFAULT_GATE_WORKERS }}
  run: |
    bunx playwright test \
      --project=gate \
      --workers="$GATE_WORKERS" \
      --fully-parallel \
      --reporter=list
```

Do not pass `--retries`; `playwright.config.ts` already supplies two CI retries.

- [ ] **Step 9: Keep gate upload immediately after gate**

Keep:

```yaml
name: asset-integrity-gate-report
path: |
  playwright-report/
  test-results/
retention-days: 7
```

- [ ] **Step 10: Add exhaustive only for full lanes**

```yaml
- name: Run exhaustive painted-interior e2e
  if: >-
    ${{ !cancelled() &&
        github.event_name != 'pull_request' &&
        (github.event_name != 'workflow_dispatch' || inputs.lanes == 'full') }}
  run: bunx playwright test --project=exhaustive --workers=1
```

Do not pass a retry override. Upload immediately as `asset-integrity-exhaustive-report` using the same full-lane condition plus `!cancelled()`.

- [ ] **Step 11: Restrict flaky to the same full lanes and keep it non-blocking**

```yaml
- name: Run known-flaky route-walking e2e (non-blocking)
  if: >-
    ${{ !cancelled() &&
        github.event_name != 'pull_request' &&
        (github.event_name != 'workflow_dispatch' || inputs.lanes == 'full') }}
  continue-on-error: true
  run: bunx playwright test --project=flaky --workers=1
```

Keep configured retries and upload its report immediately.

- [ ] **Step 12: Review event control flow**

Expected PR:

```text
LFS -> install -> runner resources -> asset units (master skipped) -> build
-> gate -> gate report
```

Expected manual `gate-only`:

```text
same fast path, with gate_workers chosen from dispatch input
```

Expected push/schedule/manual `full`:

```text
LFS -> install -> runner resources -> full asset units -> build
-> gate -> gate report -> exhaustive -> report -> flaky(non-blocking) -> report
```

- [ ] **Step 13: Commit**

```sh
git add package.json .github/workflows/asset-integrity.yml
git commit -m "ci: make asset integrity fast path measurable"
```

---

### Task 4: Verify partition, measure hosted workers, and lock the final default

**Files:**
- Verify/possibly adjust: `.github/workflows/asset-integrity.yml`
- Verify: `playwright.config.ts`
- Verify: `tests/e2e/game.e2e.ts`
- Verify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts`
- Verify: `package.json`

**Interfaces:**
- Consumes: manual `lanes=gate-only`, `gate_workers=2|4`, list reporter, runner diagnostics.
- Produces: one measured committed `DEFAULT_GATE_WORKERS` and representative PR timing evidence.

- [ ] **Step 1: Static verification**

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

Expected:

```text
lint/check exit 0
34 gate / 7 exhaustive / 10 flaky for the reviewed baseline, or an explained current-main count change
all selections disjoint and complete
4 assembly tests passed + 1 skipped in fast mode
```

- [ ] **Step 2: Run a local concurrency sanity check**

```sh
bun run build
bunx playwright test \
  --project=gate \
  --workers=2 \
  --fully-parallel \
  --reporter=list
```

Expected: completes successfully. Treat this only as local sanity, not hosted-runner worker evidence.

- [ ] **Step 3: Run hosted gate-only with two workers**

Push implementation, then dispatch Asset Integrity with:

```text
lanes=gate-only
gate_workers=2
```

Record:

```text
nproc
available memory
asset-unit duration
gate duration
number of retries
artifact-upload duration
total job duration
```

The run must finish; a startup observation is not measurement evidence.

- [ ] **Step 4: Decide whether four-worker measurement is warranted**

```text
2 workers stable and total <=15m:
  keep DEFAULT_GATE_WORKERS='2'; no 4-worker run required

2 workers stable and total >15m but <=20m:
  if nproc >= 4, run gate-only with gate_workers=4 and compare;
  otherwise keep 2 and record the <=20m result

2 workers total >20m:
  if nproc >= 4, measure gate_workers=4;
  otherwise stop for design reassessment

2 workers unstable after Task 0 isolation:
  if nproc >= 4, measure 4 once;
  if no stable candidate <=20m, stop for design reassessment
```

Do not use one worker as an automatic acceptance fallback; the prior one-worker gate was about 28.9 minutes before this reclassification.

- [ ] **Step 5: Commit the measured normal-event worker default if it changes**

If four workers are selected, change:

```yaml
DEFAULT_GATE_WORKERS: '4'
```

and commit:

```sh
git add .github/workflows/asset-integrity.yml
git commit -m "ci: lock measured asset gate worker count"
```

If two remains selected, do not create an empty commit.

- [ ] **Step 6: Verify the real PR path**

Mark PR #40 ready for review and run/synchronize the actual PR Asset Integrity path with the committed default.

Record:

```text
<=15m       target met
>15m <=20m  acceptable; record actual result
>20m        stop; PR is not complete
```

Do not substitute the manual gate-only run for final PR-path acceptance.

- [ ] **Step 7: Verify scope**

```sh
git diff --check
git diff --name-only main...HEAD
```

Expected implementation files:

```text
.github/workflows/asset-integrity.yml
package.json
playwright.config.ts
src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly.test.ts
tests/e2e/game.e2e.ts
```

plus the existing design/plan docs. No game runtime or production asset files.

---

## Self-Review Checklist

- [ ] `previousRouteSettleTolerance` resets in `test.beforeEach` before fully-parallel scheduling.
- [ ] Blacksmith painted-interior render remains in gate.
- [ ] Exhaustive broadly owns other painted-interior journeys and inverts flaky.
- [ ] Reviewed baseline is 34 gate / 7 exhaustive / 10 flaky = 51.
- [ ] No Playwright retry override is added to gate/exhaustive; configured CI retries remain authoritative.
- [ ] Only the 6400×6400 case is conditionally skipped.
- [ ] Manual `gate-only` reproduces PR lane control flow.
- [ ] Manual worker input permits hosted 2-vs-4 measurement without a code push.
- [ ] PR-only cancellation does not cancel push/schedule/manual runs.
- [ ] Job timeout is 120m; gate timeout is 25m.
- [ ] Gate uses `--reporter=list`, and logs include `nproc`/memory.
- [ ] Asset Integrity uses `--ignore-scripts` plus explicit Chromium-with-deps install.
- [ ] `package.json` prepare installs Chromium only.
- [ ] Per-project artifacts upload before the next Playwright invocation.
- [ ] Final normal worker default is supported by hosted-runner evidence.
- [ ] PR total <=20m; <=15m is target.
- [ ] No matrix/sharding is introduced.
- [ ] The duplicated Vite/workflow LFS file list is documented as follow-up rather than permanent architecture.