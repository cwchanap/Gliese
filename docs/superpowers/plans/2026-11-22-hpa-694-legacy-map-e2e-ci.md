# HPA-694 — One-PR execution plan (review revision)

**Issue:** https://linear.app/cwchanap/issue/HPA-694/remove-old-painted-map-leftovers-and-run-e2e-tests-in-ci  
**Design:** `docs/superpowers/specs/2026-11-22-hpa-694-legacy-map-e2e-ci-design.md`  
**PR:** https://github.com/cwchanap/Gliese/pull/71  
**Policy:** All code, tests, docs and existing-image storage changes land in **this PR**. No new art/SFX, WorldScene split or compatibility adapter.

## Why the order changed

The original plan deleted rendering/navigation code **before** restoring CI. PR review found a measured 8m20s–9m40s gate step, a 28-minute exhaustive lane, a 25-minute flaky lane, two retry-only Blacksmith failures, and minified-bundle rewriting inside E2E tests. The reviewer also verified all nine real PNGs in a working checkout and located the existing manifest validator.

**New critical path:** **PNG blobs → prune/stabilize one E2E suite → blocking CI baseline → dead-code deletion → screenshot parity / docs**. This establishes the safety net *before* risky deletions. Capture measured CI timings rather than assuming the target is already met.

## Task 0 — Recheck main and preflight

1. Rebase PR #71 onto latest `main`, read `CLAUDE.md` and this ticket, then list current affected files and current Playwright tests (`bunx playwright test --list`). Confirm there is no merged work that supersedes the cleanup.
2. Confirm the implementation machine has **real bytes** for all nine `public/game/assets/interiors/**` PNGs; the PR reviewer reported all nine present in their checkout, but do not trust a different pointer-only checkout.
3. Read existing `src/lib/game/content/backgrounds/manifests/*.json`, `tools/validate-village-interior-art.ts` and `src/lib/game/content/village-interior-assets.asset.test.ts`. They already validate SHA-256, dimensions and decoded pixels. Do **not** create a second checksum manifest or pointer parser.
4. Record the original screenshot states to be compared later (same save seed and 1280×720 viewport): Sundrop overworld, Blacksmith painted interior and tunnel/ruins.
5. Confirm implementation touch points with search, including `core/area-map.ts`, `core/story-gates.ts`, `core/navigation.ts`, `save/save-state.ts`, `WorldScene.ts`, `content/assets.ts` and current grid code.

~~~sh
git fetch origin main
git grep -n -E 'landmarks|fences|mapDecor|MapLandmark|MapFenceSegment'
git grep -n -E 'town-hedge|garden-hedge|city-wall|ocean|getBlockerRuntimeRenderMode'
git grep -n -E 'coastDressingAsset|forestDressingAsset|villageHedgeAsset|villageBuildingAsset'
git lfs ls-files
bunx playwright test --list
~~~

**Exit:** Current main is reflected in the plan's deletions; real LFS image bytes and existing validators are identified. If bytes are missing only on this runner, obtain them from the working checkout **without** generating replacement art.

## Task 1 — Convert interior art to normal Git and unskip asset-byte tests

**Change:** `.gitattributes`, nine **existing** `public/game/assets/interiors/**` PNGs, `vite.config.ts`, `.github/workflows/ci.yml`. The image content and paths must not change.

Once real source objects are present:

~~~sh
git lfs untrack 'public/game/assets/interiors/**/*.png'
git rm .gitattributes             # only if now empty; it currently contains one LFS rule
git add --renormalize public/game/assets/interiors
bun run test:unit -- --run src/lib/game/content/village-interior-assets.asset.test.ts
~~~

- Remove `CI_SKIP_LFS_ASSET_TESTS` from the unit job and delete the associated `vite.config.ts` conditional exclude.
- Do not create a separate byte-signature script or extra manifest: the **existing asset test** rejects a pointer or altered PNG by SHA-256 and image-decoding requirements.
- Confirm with `git diff --stat` and staged blob/file type inspection that **all nine** images changed from LFS pointers to regular PNGs and that `git lfs ls-files` no longer lists them.
- On the first normal non-LFS CI checkout, the now-unskipped asset unit test is the clean-clone proof. There is no need to script another fresh clone.

**Exit:** Ordinary CI installs/builds with no LFS downloads and validates the nine unchanged interior images against existing manifests. Keep the current CI job's measured asset-test duration; historical runs varied from ~23 seconds to ~6m13s.

## Task 2 — Make the Playwright suite small, meaningful and robust

**Change:** `playwright.config.ts`, `tests/e2e/game.e2e.ts` and supporting probes/helpers only as necessary. Delete `playwright.review.config.ts` and `tests/review/`.

1. List the current test partition. Review reports **53 tests** (45 gate, 7 exhaustive, 1 flaky); do not assume these exact numbers if main has changed. Delete the seven expensive `exhaustive` painted-interior browser cases and the one stale `Hero House painted interior preserves runtime…` flaky case. Unit tests (`village-interior-package.test.ts`, manifest validator, navigation) cover the complete interior matrix.
2. Remove **11 harness-only tests**: the eight earlier Node-only route/probe self-tests (historically at lines 10381, 10405, 10424, 11608, 11624, 13345, 13382, 16105), plus **“Item Shop stockroom entry checks only its initial fixed-x northward phase”** (L10449), **“Ruins Threshold core-stair staging leaves the trusted transition envelope clear”** (L10513), and **“browser-local route correction paces an unblocked Guild Hall overshoot before reversing”** (L11661). The last one opens a browser solely to dispatch synthetic movement events for a retired walker, not to exercise real player behavior. If any surviving pure helper needs verification, use focused unit tests instead of keeping harness characterization inside E2E.
3. **Remove the `page.route('**/assets/WorldScene-*.js')` production-bundle rewrite, with explicit replacements for retained tests:**
   - **Drop without replacement** `__glieseSceneEncounterState` (no live browser-test consumer) and `__glieseTransitionGateState`: the Oren journey only reads its mapId and player x/y, available from `gliese:player-movement-diagnostic` (`mapId`, `resolvedPosition`). HUD still supplies map/battle state.
   - **Replace camera/facing** (`__glieseActiveSceneCamera`, `__glieseLastPlayerFacing`) with one small **typed WorldScene diagnostic event** carrying `{ mapId, facing, camera: { view, bounds } }` on initial camera readiness and after **actual resize camera updates**. Publish a snapshot *after* Phaser has updated `worldView` and `getBounds()`; do not expose the live camera object or build a general telemetry system. Update `waitForLiveCamera`/`liveCamera` and facing checks to read that last event, retaining the three HPA-840 interior resize tests and the Blacksmith facing assertion.
   - **Move the Oren journey trace and same-frame axis-threshold keyup out of the minified rewrite:** in `page.addInitScript`, subscribe to the existing synchronous `gliese:player-movement-diagnostic` event. Record each resolved position/mapId into `__glieseJourneyTrace`; when `__glieseAxisHold` crosses its threshold, clear the hold and dispatch the corresponding `keyup` **inside the listener** so CDP polling does not add overshoot. Start this journey with movement diagnostics enabled **before WorldScene starts**. Be careful: navigating directly to `/?movementDiagnostics=on` bypasses Title (`GameShell.svelte` uses `hasRenderOptionOverrides`), and `startNewRunFromTitle(page)` currently navigates to `/`. Add a small optional mode to the existing helper that loads `/`, waits for the actual Title, then adds the query with `history.replaceState` **before clicking New Run**; do not reload or skip the player's Title/New Run journey. Verify the option is observed when the game scene is created. No production-side test-control hooks are needed.
   - Delete obsolete rewrite regex, self-tests and global probe declarations; retain only the minimal event listeners needed by current tests. Assert the suite has **no `WorldScene-*.js` response interception**.
4. **Resolve the two known retry-only cases before setting `retries: 0`**:
   - Keep **“Blacksmith Oren equipment shop”** for shop behavior; make its starting state, route and interaction deterministic using existing `seedSaveSlots` and condition-based waits instead of brittle timing.
   - Keep **“Blacksmith painted interior preserves baked composition and collision”** as the one browser painted-interior proof; stabilize its positioning, asset/boot waits and movement assertions. Never merely delete this sole visual/collision browser coverage.
   - Recheck other retained slow or flaky tests in the **first measured CI run**; fix a meaningful test or remove obsolete duplication. Do not keep a silent flaky lane.
5. Existing journey coverage to retain, **not duplicate**: “proving morning keyboard journey reaches Oren” (new game/overworld/interior/NPC), “Blacksmith Oren equipment shop”, “encounter opens battle scene and returns through battle summary”, and “a seeded near-end saved run … Continue restores”. Reuse `tests/e2e/helpers/game.ts`' `seedSaveSlots`, `seedAutosaveSlot` and `continueFromTitle`.
6. Simplify `playwright.config.ts` to no named projects and no `grep`/`grepInvert` exclusions, **`fullyParallel: true`** (essential: all browser tests are in one file, and two CI workers otherwise still run that file serially), `retries: 0`, `workers: process.env.CI ? 2 : 1`, `reuseExistingServer: !process.env.CI`, Chromium, screenshots/trace on failure. Keep the **existing** `entry map boots with no game console errors` browser test (L11948), which the old retired-proof regex incorrectly excludes; removing the regex re-enables this precise Phaser asset-load/console guard. **Do not add a duplicate boot assertion**.
7. List and run the suite, confirm it has only current browser tests (the old ~37 estimate predates the three additional harness cuts and re-enabled boot test, so use the actual `--list` count). Ensure CI uses two workers **within the one E2E file** and a test does not inherit another worker's probe state. No intercept of minified `WorldScene-*.js` remains.

~~~sh
bunx playwright test --list
bun run test:e2e
~~~

**Exit:** One non-quarantined, fully parallel CI suite stable at zero retries, real Title/New Run and current journeys, retained boot-console check, replacement typed camera/facing snapshot plus synchronous movement trace/keyup, **no minified-bundle rewrite**, and no retired painted-regional/review content.

## Task 3 — Turn CI back into the safety net **before** cleanup

**Change:** `.github/workflows/ci.yml` and delete `.github/workflows/asset-integrity.yml`; reuse package scripts. The unit job already owns byte tests after Task 1.

1. Remove the three `if` guards that skip **build-and-lint**, **unit-test** and **rust-build-lint** for draft PRs. Their dependent Rust unit job then runs as well. All checks have the same draft/ready PR policy.
2. Add exactly **one blocking `e2e` job** to the existing workflow on PR and main push: normal checkout with no LFS; Bun + frozen install; Playwright Chromium system dependencies; **`bun run test:e2e`** (already builds once); upload screenshot/trace/report artifacts on failure or noncancellation.
3. Do not use `continue-on-error`, a separate flaky lane, a manual workflow, another browser matrix, caching/sharding architecture, or duplicated `bun run build` step.
4. Delete the obsolete Asset Integrity workflow after its existing asset tests are running in ordinary CI.
5. Push **before Task 4**. Use GitHub MCP to read the PR CI checks, `e2e` duration, retained JS/Rust results and asset unit-test duration. The review's old gate timing approaches/exceeds the 10-minute job target once checkout/install/build are included; allow **15 minutes for the first diagnostic run** so a 12–13-minute result reports timings instead of being killed at 12 minutes, then trim the retained suite toward the **≤10-minute target** without dropping meaningful coverage.
6. Do not begin dead-code deletion until the new CI job **passes on this draft PR**, including all unskipped checks. Treat ~10 minutes as a measured target, not a promise.

Recommended job shape (illustrative; keep current workflow conventions):

~~~yaml
e2e:
  name: Playwright E2E
  runs-on: ubuntu-24.04
  timeout-minutes: 15
  steps:
    - uses: actions/checkout@v4
      with:
        persist-credentials: false
    - uses: oven-sh/setup-bun@v2
      with:
        bun-version: latest
    - run: bun install --frozen-lockfile --ignore-scripts
    - run: bunx playwright install --with-deps chromium
    - run: bun run test:e2e
    - if: ${{ !cancelled() }}
      uses: actions/upload-artifact@v4
      with:
        name: playwright-e2e-report
        path: |
          playwright-report/
          test-results/
~~~

**Exit:** Full JS/Rust/unit/asset/E2E checks run on drafts and pass; E2E is blocking; run timing recorded via MCP.

## Task 4 — Delete obsolete map types and all consumers under the CI gate

**Change paths:** `src/lib/game/content/maps/types.ts`, `content/maps.ts`, `content/maps/text.ts`, `content/maps/navigation.ts`, `content/maps/background-ownership.ts` **and `content/maps/background-ownership.test.ts`**, `content/maps/blocker-rendering.ts` (delete), `src/lib/game/core/navigation.ts`, `core/area-map.ts`, `core/story-gates.ts`, `save/save-state.ts`, `phaser/scenes/WorldScene.ts`, tests.

1. Delete `landmarks`/`fences`/`mapDecor` fields and their old types/exports, visual ownership and navigation source entries. Update **`background-ownership.ts`**'s `MapBackgroundOwnershipSource` Pick and `validateMapBackgroundOwnership` to drop `mapDecor` and `fences` collections; adapt **`background-ownership.test.ts`**'s stale garden-hedge/decor/fence fixtures while retaining blocker/ground-patch/interior-prop ownership assertions. Replace old landmark area-map marker references with **nothing** (current maps do not author landmarks); preserve discovery and transition markers.
2. Narrow `MapBlockerKind` to `'ruin-wall' | 'future-gate'`. Delete town hedge, garden hedge, city wall and ocean cases and obsolete `blocker-rendering.ts`. Simplify blocker rendering, frame selection and related tests; keep `environmentDressingAsset`'s ruin wall/future gate (and other used) frames.
3. Delete fence/decor/landmark collision from `content/maps/navigation.ts`, `save/save-state.ts` and `core/navigation.ts`, including the landmark obstacle shape and doorway-cutout helpers. Keep grid navigation, strict blockers, interior-prop collision, NPCs, and actual transition/trigger geometry.
4. Delete `core/story-gates.ts`' dead `mapDecor` gated field, `content/maps/text.ts` landmark translator, and `core/area-map.ts`' dead landmark marker builder; simplify related test fixtures and regional diagnostic fields only where no live consumer remains.
5. Remove `WorldScene`'s landmark/fence/decor renderer, asset-frame registration, diagnostics, collision-debug overlays and old helper constants; **do not** split WorldScene or touch unrelated encounter/quest/battle paths.
6. Run focused navigation/area-map/save/story tests plus full unit/check/build and the new blocking CI E2E job. Push and confirm green before Task 5.

~~~sh
bun run check
bun run test:unit -- --run src/lib/game/content/maps/navigation.test.ts
bun run test:unit -- --run
bun run build
~~~

**Exit:** No dead map fields or blocker kinds remain; doors, grid movement, interior props and tunnel ruin/future-gate collision still work.

## Task 5 — Remove exactly the unused painted outdoor sheets

**Change:** `src/lib/game/content/assets.ts`, `phaser/scenes/BootScene.ts`, `phaser/scenes/WorldScene.ts`, `public/game/assets/` candidate images and asset metadata/tests.

- Confirm no live grid builder or renderer uses these nine: **coast-dressing, crossroads-dressing, forest-dressing, fence-dressing, marsh-dressing, shrine-dressing, village-dressing, village-building, village-hedge**. After Task 4's explicit blocker/landmark removal they should be dead.
- Remove their preloads, frame registration, asset/type definitions, files and obsolete metadata tests. Keep `environment-dressing`, grid `tiles.png`/`objects.png`, actor/NPC sheets, interior art and live ground patches.
- Run check/unit/build and the blocking CI suite on the new push. Assert there is no Phaser missing-texture placeholder or `loaderror` for remaining routes.

**Exit:** Nine dead sheets no longer load; surviving art and gameplay visually match the baseline.

## Task 6 — Narrow docs and one-off automated screenshot parity

1. Edit `CLAUDE.md` and only active contributor docs that describe removed fields, outdated LFS/Asset Integrity workflow, obsolete Playwright review harness or old map pipeline.
2. As HPA-694 specifically requests, correct the **few stale status/follow-up sentences** in `docs/stories/prologue.md` (old temporary-art/no-audio assumptions) but **do not** rewrite prose, combat mechanics, future story scope or unrelated historical plans.
3. One-off **MCP-driven browser comparison** at **1280×720**: in the same environment launch `main` and the PR branch with equivalent `seedAutosaveSlot` states, capture `page.screenshot` for (a) Sundrop overworld, (b) Blacksmith painted interior, (c) tunnel/ruins. Produce a temporary pixel/structure diff, accounting only for bounded animation-frame changes. Report comparison results and evidence in the PR body; **do not commit** golden screenshots or add `toHaveScreenshot` to the blocking lane.
4. Verify console logs for missing/misregistered textures in each sampled state.

**Exit:** Screenshots demonstrate unchanged layout/texture/collision context, and operational docs match the implemented paths without a new visual-golden CI burden.

## Task 7 — Automated acceptance and PR handoff

**No human acceptance gate; no second E2E suite.** Use MCP to verify the existing canonical E2E run and screenshot evidence, rather than re-running a duplicate custom journey or deliberately breaking Playwright assertions.

| Requirement | Automated acceptance / evidence |
| --- | --- |
| Asset bytes | **9** valid regular Git PNG blobs; existing SHA-256/RGBA/dimension tests run green on regular CI checkout without LFS |
| Code reduction | No retired landmark/fence/decor fields/renderers/collision; only still-used blocker kinds and art sheets; unit/type/build green |
| E2E gameplay | Existing suite covers new run/overworld/interior/NPC, shop, battle/return, save/continue; retained Blacksmith painted/collision browser proof passes with **0 retries** |
| Test integrity | `fullyParallel: true` actually uses two CI workers inside the single test file; no minified `WorldScene-*.js` intercept; existing boot-console check retained; typed camera/facing and movement trace; no 3-project filters, retired V1/exhaustive/flaky/review harness or ignored failures |
| CI | GitHub MCP confirms **all** draft PR checks (JS lint/check/build/unit/byte tests, Rust, blocking E2E) green and the E2E job measured near **≤10 min** |
| Visual parity | Browser MCP one-off fixed-state captures for the overworld, Blacksmith and tunnel, automated diff results recorded on PR; no UI mockup exists |
| Scope | Single HPA-694 PR only, no art/SFX creation, no unrelated refactor or native acceptance |

Any failed automated requirement is an implementation issue to address **within PR #71**. When all are green, update PR body with CI timing and comparison evidence, and update the linked Linear issue. Keep the PR draft and issue open until implementation passes; planning document changes alone do not meet acceptance.

## Explicitly not planned

No new gameplay feature, battle rebalance, artist task, generic telemetry/runner platform, test sharding, commit-history rewrite, compatibility preservation for removed map fields, arbitrary manual test, or mandatory native-platform acceptance.
