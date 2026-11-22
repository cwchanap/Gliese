# HPA-694 — Single-PR implementation plan: legacy map cleanup + E2E CI

**Issue:** https://linear.app/cwchanap/issue/HPA-694/remove-old-painted-map-leftovers-and-run-e2e-tests-in-ci  
**Design:** docs/superpowers/specs/2026-11-22-hpa-694-legacy-map-e2e-ci-design.md  
**Execution model:** One PR for this whole ticket. This document and the design are its first commits; implementation must continue on this branch, not in follow-up PRs.  
**Scope:** Code and test cleanup; existing art-byte migration only; no new art or SFX.

## Preconditions and repository baseline

1. Rebase the feature branch onto latest **main** before coding. Read the existing **CLAUDE.md**, relevant map/grid tests, and the HPA-694 Linear description. Check whether a recent main change already removed any candidate path.
2. Inventory active references using **git grep** or **rg** across **src**, **tests**, **tools**, and **.github**, separating *real runtime usage* from tests of retired APIs.
3. Record the current single-platform web visual baseline via automated screenshots at **1280×720** (overworld near Sundrop, painted Guild Hall or Blacksmith interior, tunnel/ruins) and save states/fixtures for repeatable comparison. Use a browser MCP interaction path when gathering acceptance evidence.
4. **Hard blocker:** verify a trusted working checkout contains the **nine complete interior PNG files** with correct dimensions and non-pointer signatures. Preserve a source checksum manifest for validation; do not rely on the depleted Git LFS service. Do **not** remove .gitattributes or push substituted art until bytes are available.
5. Capture the current E2E inventory before pruning: run **bunx playwright test --list** (or inspect the full test list if local assets prevent execution). Classify each test as live gameplay, retired V1 proof, stale route, or dead review harness, with a reason for deletion.

Useful preflight commands:

~~~sh
git fetch origin main
git grep -n -E 'landmarks|fences|mapDecor|MapLandmark|MapFenceSegment'
git grep -n -E 'coastDressingAsset|crossroadsDressingAsset|forestDressingAsset|fenceDressingAsset|marshDressingAsset|shrineDressingAsset|villageDressingAsset|villageBuildingAsset|villageHedgeAsset'
git lfs ls-files
bunx playwright test --list
~~~

**Exit gate:** An auditable inventory identifies what is dead and what interiors/grid/tunnel require. Real interior PNGs are available before the storage conversion proceeds.

## Task 1 — Remove dead outdoor authoring/collision/rendering

Files to examine and update:

- **src/lib/game/content/maps/types.ts** — delete unused MapLandmark, MapFenceSegment, MapDecor union/depth and unreferenced authoring fields/types; simplify NavigationGridOwnedSource only for unused source values. Retain MapRect, the active blockers, interior props and backgrounds.
- **src/lib/game/content/maps.ts** and **content/maps/text.ts** — remove stale exports and landmark text translation without changing active map/NPC/transition content.
- **src/lib/game/content/maps/navigation.ts** — remove fence/decor/landmark obstacle handling; retain blockers, interior props, NPCs and authoritative grid navigation.
- **src/lib/game/save/save-state.ts** and core navigation helpers — prune dead landmark-doorway and fence/decor collision helpers where only obsolete maps reference them. Do not add backward-compatibility transformations for unused map shapes.
- **src/lib/game/phaser/scenes/WorldScene.ts** — remove renderLandmarks, renderMapDecor, renderFences and dead fence/landmark collision/debug/diagnostic logic. Simplify blocker switch cases only where genuinely unreferenced. Keep grid rendering, interior painted backgrounds, ruin wall/future gate, ground-patch and interior-prop paths.
- **src/lib/game/content/maps/background-ownership.ts**, diagnostic types and map/navigation/renderer tests — narrow only where removal makes a field unreachable; preserve the working interior-package contract.

Test-first where practical: update focused map navigation, collision, scene and save-state tests to assert the **remaining** semantics, then remove implementation and redundant assertions. Do not retain tests that instantiate removed fields as a compatibility shim.

Verify:

~~~sh
bun run check
bun run test:unit -- --run src/lib/game/content/maps/navigation.test.ts
bun run test:unit -- --run
~~~

**Exit gate:** No dead outdoor fields or rendering branches remain, and existing live maps (including interior and tunnel) keep their collision, story gates, transition IDs, and save semantics.

## Task 2 — Delete verified-unused sprite sheets

1. Cross-check candidate nine sheet definitions against **BootScene.ts**, **WorldScene.ts**, **content/assets.ts**, current grid objects/tileset generation, and any UI imports.
2. Remove each confirmed-unused PNG, its asset descriptor/type/frame helper, its preload, and asset metadata tests; never delete **environment-dressing** merely because the old exterior sheets are gone.
3. Check source-art inputs under **art/** before removing them: keep inputs needed to regenerate the current text-grid atlas; delete only clearly dead painted-map inputs in scope.
4. Run asset/frame tests and boot smoke tests to rule out Phaser missing-texture placeholders.

Verify:

~~~sh
bun run check
bun run test:unit -- --run src/lib/game/content/assets.test.ts
bun run build
~~~

**Exit gate:** No unused dressing sheet is preloaded; no new missing-texture errors; the current grid object sheet and ruin/tunnel dressing still render.

## Task 3 — Convert nine existing interior PNGs from LFS

1. Copy **real bytes** from the verified working machine into the existing **public/game/assets/interiors/** paths. Confirm PNG signature and original dimensions; compare each checksum with the trusted source. A Git LFS pointer beginning with **version https://git-lfs.github.com/spec/v1** is an immediate failure.
2. Remove the interior PNG rule from **.gitattributes** (delete the file if otherwise empty). Remove remaining LFS setup/config only where now unnecessary. Stage the existing PNGs as ordinary Git content, avoiding any history rewrite and avoiding renamed paths.
3. Check staged Git blobs, not merely working-tree files: ensure **git show :path** begins with PNG bytes and not the LFS pointer header. Check all nine staged images.
4. On a separate clean checkout of the feature branch with **GIT_LFS_SKIP_SMUDGE=1**, run the interior byte tests and build. Confirm that the repo is not attempting LFS network requests.

Example validation:

~~~sh
git lfs ls-files
git diff --cached -- .gitattributes
git show :public/game/assets/interiors/hero-house-base.png | head -c 8 | od -An -tx1
bun run test:unit -- --run src/lib/game/content/village-interior-assets.asset.test.ts
bun run build
~~~

The sample path above is illustrative: use the **actual** nine committed names from the asset manifest. Do not assume a name until the inventory confirms it.

**Exit gate:** Nine existing art images are normal Git blobs; a clean clone succeeds without LFS bandwidth and produces the same interior visuals.

## Task 4 — Simplify Playwright and remove stale tests

1. In **tests/e2e/game.e2e.ts**, identify and remove only retired V1 painted-regional proofs, old meadow-era route walks that no longer represent valid player paths, and obsolete test-only diagnostics/fixtures.
2. Keep a deterministic minimum prologue path: fresh start; walking/door transition to an interior; interaction with a nearby NPC; a shop or quest action; battle and return; save/continue; collision assertions. Reuse existing valid flows, including current HPA-839/HPA-840 regressions, instead of building a duplicate test framework.
3. Repair tests flaking because of stale route coordinates, timing, or pointer state when they still cover meaningful current behavior. Remove those with no current behavior worth testing; **no quarantined or continue-on-error lane**.
4. Delete **tests/review/** and **playwright.review.config.ts** in full. Remove stale regional diagnostic test listeners if nothing live consumes them.
5. Reduce **playwright.config.ts** to **one suite**: no retired-proof grepInvert, no **gate/exhaustive/flaky** partitions, no old filtered projects. Keep Chromium, failure screenshots/traces and explicit preview lifecycle. Set **reuseExistingServer** false in CI; retain local convenience if needed.
6. Execute **bunx playwright test --list** and confirm the retained suite is nonempty and every listed test covers a supported, current user flow.

Verify:

~~~sh
bun run build
bunx playwright test --list
bunx playwright test --workers=2 --reporter=list
~~~

**Exit gate:** One Playwright command runs every retained test; no stale route or retired art fixture silently survives; no ignored flaky failures.

## Task 5 — Merge asset checks and blocking E2E into ordinary CI

1. Remove **CI_SKIP_LFS_ASSET_TESTS** from **.github/workflows/ci.yml** and the associated skip/exclude logic in **vite.config.ts**. The existing unit-test job now executes PNG-byte tests as part of normal unit coverage.
2. Add one **e2e** job to **.github/workflows/ci.yml** with checkout (normal Git blobs), Bun setup, frozen install, Playwright Chromium + Linux dependencies, one production build, Playwright run, and failure artifact upload. No LFS checkout, manual dispatch, sharding, or extra caching/orchestrator.
3. Make that job run on **every PR push including drafts** and **main** pushes, independently of the existing non-draft guards for other jobs. Keep the current build/lint/type, JS unit, Rust lint/build/unit, strict story, and coverage behavior.
4. Remove the old **.github/workflows/asset-integrity.yml** after migrating any still useful asset test assertion into ordinary CI. Avoid redundant builds inside the same E2E job.
5. Read the actual GitHub Actions duration for the E2E job. Aim for **≤10 min** end-to-end with modest workers and one browser. Trim redundant or invalid tests before considering advanced CI architecture. Preserve a strict failure status and upload failure screenshots/traces.

Suggested job outline:

~~~yaml
e2e:
  name: Playwright E2E
  runs-on: ubuntu-24.04
  timeout-minutes: 12
  steps:
    - uses: actions/checkout@v4
      with:
        persist-credentials: false
    - uses: oven-sh/setup-bun@v2
      with:
        bun-version: latest
    - run: bun install --frozen-lockfile --ignore-scripts
    - run: bunx playwright install --with-deps chromium
    - run: bun run build
    - run: bunx playwright test --workers=2 --reporter=list
    - if: ${{ !cancelled() }}
      uses: actions/upload-artifact@v4
      with:
        name: playwright-e2e-report
        path: |
          playwright-report/
          test-results/
~~~

The outline is illustrative. Reuse the existing project conventions; do not create a second build command in **package.json** just for CI. Use CI timing to confirm the performance contract rather than assuming it.

**Exit gate:** E2E and image-byte unit tests are mandatory checks on PRs, including draft PR pushes for the E2E job. No LFS/manual workflow and no CI-only asset skip remains.

## Task 6 — Refresh operational documentation

- **docs/stories/prologue.md**: correct the current implementation/status and follow-up descriptions for the actual audio, visual pipeline and real-time battle; keep story beats unchanged.
- **CLAUDE.md** and only other directly relevant live instructions: describe the text-grid overworld, preserved painted interiors, ordinary-Git art, single Playwright config, and CI E2E.
- Keep historical completed plans as archives rather than rewriting history.

**Exit gate:** No current operational instruction tells contributors to use removed map fields, obsolete art sheets, LFS-dependent Asset Integrity, or the deleted review harness.

## Task 7 — E2E and visual acceptance before ready-for-review

Automate acceptance; do not use a human verification checkbox.

1. Through **MCP browser/test tooling**, run the current web build from a known fixture: begin a new run; leave the house; navigate Sundrop; enter and exit a painted interior; interact/shop; start and finish an encounter; save/continue; and verify return positions and no console asset-load errors. Attach traces/results and relevant browser screenshots to the PR.
2. Compare **same-viewport, same-state screenshots** against main for an overworld sample, a painted interior and the tunnel/ruins. Where animated sprites would cause false diffs, use deterministic state or mask just those regions; do not ignore structural/collision/texture differences. There is no ticket UI mockup, so this is the visual-parity check.
3. Use **GitHub MCP** to inspect PR Actions/check results: validate the blocking E2E job and asset unit tests, a successful run on a draft PR push, the elapsed E2E duration, and the preserved JS/Rust jobs. If CI fails, fix in **this same PR**.
4. Verify negative-path behavior with a deliberately broken E2E assertion in a temporary local/nonfinal run: the command exits nonzero and CI's configuration would fail the job, with trace/screenshot uploaded. Remove the deliberate failure before final commit.
5. Confirm the diff has no runtime feature addition, no art/SFX generation, no old LFS pointers and no untracked generated screenshots or reports. Screenshots belong in CI artifacts or an ignored **.artifacts/** directory, not committed to the repo.

Acceptance matrix:

| Category | Automated assertion | Evidence |
| --- | --- | --- |
| Code cleanup | Zero live references to retired map fields/sheets | Git search + unit/build results |
| Existing assets | Nine real PNG blobs, clean checkout with LFS disabled | Byte/header/dimension test + clean-clone build |
| Gameplay | Full minimal prologue journey and live transition/collision/save | MCP-driven browser E2E trace |
| Visual parity | Overworld, painted interior and tunnel screenshots match main's composition | Automated screenshot comparison via MCP |
| CI | Every PR, including draft, runs one blocking E2E lane; no manual/LFS lane | GitHub MCP Actions run and check conclusion |
| Runtime | E2E job approximately 10 min or less; full existing CI green | GitHub Actions job duration and check statuses |
| Scope | No code unrelated to dead-map, art-byte migration, test/CI and doc cleanup | PR diff review via GitHub MCP |

## Implementation and PR policy

- **Exactly one PR for HPA-694**: continue from this planning branch; do not open sequential task PRs.
- Rebase onto main before implementation and re-check the unused-code inventory.
- Do not start art or SFX generation in this ticket. HPA-704 and other art tasks remain separate.
- Do not mark the task implemented, ready to merge or E2E-accepted while the real interior PNGs are unavailable or the CI/screenshot evidence is missing.
- On completion, update HPA-694 in Linear with the PR link and verification summary; do not close the issue solely because planning documents exist.
