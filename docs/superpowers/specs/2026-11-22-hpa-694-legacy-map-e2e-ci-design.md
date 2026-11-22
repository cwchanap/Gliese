# HPA-694 — Remove retired painted-map paths and restore PR E2E

**State:** Revised design after PR #71 review; implementation not started.  
**Ticket:** https://linear.app/cwchanap/issue/HPA-694/remove-old-painted-map-leftovers-and-run-e2e-tests-in-ci  
**Implementation:** One PR only — continue on PR #71; no new art, SFX or gameplay redesign.  
**Baseline:** `main` as inspected 2026-11-22, cross-checked with PR #71 design review.

## Outcome and design choices

The outdoor world uses the text-grid overworld. Old painted-map fields, draw/collision paths and dressing-sheet preloads remain, while the independent LFS-dependent Asset Integrity workflow cannot provide routine PR E2E feedback.

**Decision:** Convert the nine existing interior PNGs to ordinary Git blobs, restore **one lean blocking Chromium E2E lane first**, then remove dead map code with that lane guarding every deletion. Reuse current helpers and byte validators; do not introduce another map model, testing framework, or compatibility adapter.

### Existing mechanisms to reuse

| Need | Existing implementation; do not duplicate |
| --- | --- |
| Verify nine PNGs | `src/lib/game/content/backgrounds/manifests/*.json` pins SHA-256 + dimensions. `tools/validate-village-interior-art.ts` verifies hashes, RGBA decoding, dimensions, opacity; `src/lib/game/content/village-interior-assets.asset.test.ts` asserts all registered manifests. The manifest SHA-256 hashes are the LFS content OIDs. |
| Verify plain Git checkout | CI's ordinary `actions/checkout` and the now-unskipped PNG asset unit test prove actual bytes were committed; no extra scratch checksum manifest or clean-clone ceremony. |
| Seed saves / Continue | `tests/e2e/helpers/game.ts`: `seedSaveSlots`, `seedAutosaveSlot`, `continueFromTitle`, `startNewRunFromTitle`. |
| Existing player journeys | `tests/e2e/game.e2e.ts` has “proving morning keyboard journey reaches Oren”, “Blacksmith Oren equipment shop”, “encounter opens battle scene and returns through battle summary”, and “a seeded near-end saved run … Continue restores”. Reuse these separate checks as the journey; don't add a duplicate monolithic test. |
| Observe gameplay | `player-movement-diagnostics.ts` emits position/map; `ui-bridge/events.ts`' `HudState` exposes map and battle. Add only a minimal runtime event for any indispensable remaining encounter/transition/facing probe. |
| Build + Playwright | `package.json` already defines `test:e2e` as build followed by Playwright; run it once in CI, not a separate build plus test. |

**Asset availability:** The PR reviewer inspected a working checkout and reports that all nine real LFS objects already exist there (PNG signatures present; example blacksmith manifest SHA-256 begins `604efdd3c9`). This removes the previously stated *unresolved* asset blocker. The implementation agent must still verify that its checkout has those real bytes before staging; a pointer-only checkout is not a suitable source. No replacement artwork is needed.

## Runtime boundaries

### Explicitly remove

- Authoring/visual/collision fields: `landmarks`, `fences`, `mapDecor`, `MapLandmark`, `MapFenceSegment`, `MapDecor`/`MapDecorDepth` and their legacy text resolution, event/gate, diagnostics, save, area-map and core navigation consumers.
- `MapBlockerKind` variants that no active map authors: `town-hedge`, `garden-hedge`, `city-wall`, `ocean`. The retained union is `'ruin-wall' | 'future-gate'`. Remove `content/maps/blocker-rendering.ts`, whose only distinction is the now-dead ocean case.
- `MapVisualSourceType` entries `'decor' | 'fence'` and `NavigationGridOwnedSource` entries `'fence' | 'map-decor'` (keep `blocker` and `interior-prop`; keep `ground-patch` for visual sources).
- Related references in `core/area-map.ts`, `core/story-gates.ts`, `core/navigation.ts` (including the `landmark` obstacle shape and doorway-rect helpers), `save/save-state.ts`, `content/maps/navigation.ts`, `WorldScene.ts`, `content/maps/text.ts`, `content/maps.ts`, and tests/fixtures.
- Nine now-dead boot/register sheets **after reference check**: coast, crossroads, forest, fence, marsh, shrine and village dressing; village buildings; village hedge. Delete unused files, metadata and frame tests as well as preloads.
- Dead blocker frame variants (`townHedge*`, `townWall*`), landmark drawing, fence/decor renderers and their diagnostic/debug branches.

The inventory above is grounded in the current runtime and review; re-run `git grep` against latest `main` before deletion to catch any intervening live use.

### Explicitly keep

- The text-grid overworld (`content/maps/overworld`, `grid/tileset.ts`, `grid/objects.ts`), object atlases and story overlays.
- Painted **interior** background packages, their nine existing PNGs and foreground, ground patches, interior props, compiled navigation, NPCs, door/transition and story semantics.
- Ruin-wall and future-gate blockers, their collision and their rendered frames from `environmentDressingAsset`; the tunnel still needs them.
- Existing saves, live battle/UI features, story content and playability. There are no production users, so no code for backward-compatible retired map fields.
- Separate future WorldScene splitting ticket; do not refactor scene ownership here.

## E2E scope and performance decision

The review reports historical Asset Integrity timings:

| Lane | Observed step time (2-worker gate) | Design action |
| --- | --- | --- |
| `gate` | 8m20s–9m40s **before** setup/build | Start from useful tests, remove harness-only cases and measure on first push |
| `exhaustive` | ~28 minutes, failed | Delete its seven slow painted-interior browser proofs |
| `flaky` | ~25 minutes | Delete the one stale Hero House painted-interior browser proof |

The old three-project configuration cannot be made one blocking suite merely by deleting the `projects` array: that would include ~40+ minutes of browser tests. The review found eight Node-only route/probe self-tests in `game.e2e.ts` to remove as well. After these cuts, expect roughly **37 browser tests**, subject to current `--list` and latest `main`.

**Keep browser proof:** “Blacksmith painted interior preserves baked composition and collision”, plus the Oren journey/interior transition; the existing manifest, interior-package and navigation unit tests cover the full eight-interior matrix. Retain the Oren equipment shop test and Blacksmith painted composition test **but first fix their documented retry-only failures**; `retries: 0` must not merely expose previously hidden flakes. If a current test still needs a probe, expose only that state through a small typed runtime diagnostic — **never rewrite `WorldScene-*.js` minified bundle responses via `page.route`**.

Playwright config: one project-free suite, `workers: process.env.CI ? 2 : 1`, `retries: 0`, `reuseExistingServer: !process.env.CI`, existing screenshot/trace-on-failure support, no retired grep filters, no `tests/review` harness. Keep console assertions for Phaser texture-load/missing-texture warnings as a cheap regression guard.

## CI and execution order

1. **Asset migration:** Use already-present real PNGs from a working checkout. `git lfs untrack 'public/game/assets/interiors/**/*.png'`, remove empty `.gitattributes`, and `git add --renormalize public/game/assets/interiors`. Preserve the exact paths and manifests; do not rewrite Git history. Unskip `village-interior-assets.asset.test.ts` in normal unit CI, drop `CI_SKIP_LFS_ASSET_TESTS` from `vite.config.ts` and CI.
2. **Safety net first:** Remove the slow/obsolete tests, fix the two known flaky kept tests, replace minified-bundle rewrite with minimal runtime diagnostics if necessary, simplify `playwright.config.ts`, add one blocking `e2e` job in `ci.yml` running **`bun run test:e2e`**. Remove all three `draft == false` CI guards so build/lint, unit and Rust test paths also run on draft PRs. Delete `asset-integrity.yml`. Push and get a **measured green CI baseline**.
3. **Then code deletion:** Remove unused map code and nine sheets in small commits, each protected by the blocking E2E + unit lane. Preserve active tunnel/interior paths.
4. **Narrow docs + parity:** Update only operational instructions referring to removed paths, tests, Git LFS and CI. Per ticket, correct factual status/follow-up sentences in `docs/stories/prologue.md` (audio and temporary-art claims), **without** editing the story or rewriting combat docs. Run a one-off automated screenshot comparison with fixed state/viewport against `main`.

CI E2E target remains **about ≤10 minutes for the E2E job**. It is not pre-proven: the historic gate alone nearly reaches that bound, and the PNG asset unit test has varied from ~23 seconds to ~6m13s. Measure both the E2E job and unit job on the first push; if E2E exceeds the target, trim or stabilize redundant tests rather than adding sharding, a new runner, or a nonblocking flaky lane.

## Visual comparison and acceptance

No UI mockup exists. A **one-off automated before/after comparison** of fixed **1280×720** screenshots from the same browser environment on `main` and the PR branch covers: Sundrop overworld, a painted Blacksmith interior and tunnel/ruins (especially ruin-wall/future-gate textures). Reuse `seedAutosaveSlot` fixtures, automate screenshot capture/diff, ignore *only* deterministic animation noise, and report results/links in the PR. Do not commit golden images or add GPU-sensitive pixel snapshots to CI.

**End-to-end acceptance is performed through MCP:** use GitHub MCP to inspect the **same canonical Playwright E2E CI run**, required status checks, duration and artifacts; use browser MCP for the one-off parity capture/inspection when available. Do not run a second custom journey duplicating CI or add a contrived failing assertion to test Playwright itself. One web platform is sufficient; no native acceptance is required.

Implementation acceptance (not met by this planning PR):

1. Only current `ruin-wall`/`future-gate` blockers and required grid/interior data paths remain; no stale map field or unused dressing sheet stays loaded. Type checks and focused navigation/area-map/save/unit tests pass.
2. Nine **real** interior PNG Git blobs pass existing manifest SHA-256/dimensions/RGBA validation in ordinary clean CI checkout; no Git LFS checkout or pointer-only files.
3. One deterministic Chromium Playwright suite covers current new-run, walking/interior, NPC/shop, battle/return, save/continue functionality using existing tests. It has **no minified-bundle response rewrite**, stale V1 proofs, old review harness, nonblocking flaky lane or project filters.
4. All CI jobs run on draft and ready PRs; blocking E2E green on this PR, with job runtime measured at approximately **≤10 min**. JS lint/check/build, unit + byte tests, Rust build/lint/unit and strict story checks stay green. CI evidence is examined through MCP.
5. Automated one-off screenshot comparison shows preserved composition, alignment and texture visibility in the three sample states; console reports no asset-load/missing-texture errors.
6. Only in-scope operational docs change; **one PR** for HPA-694, no art/SFX generation or gameplay changes, and no human acceptance gate.

## Risks kept visible

- **True bytes vs pointers:** reviewer verified nine images in a working checkout, not necessarily every CI or agent checkout. Existing SHA-256 asset test is the ultimate check once conversion is staged.
- **Historical test timing:** fast suite target is unverified until first post-pruning PR run; cut old expensive tests *before* enabling the gate.
- **Known retry-only flakes:** Oren shop and Blacksmith painted composition must be stabilized before `retries: 0` is enforced.
- **Fragile Vite bundle probe:** remove the rewrite entirely; if a retained browser assertion needs internal state, emit it from source code.
- **Slow asset byte validation:** baseline and investigate the ~6-minute tail without silently skipping asset tests.
- **Dead-code collateral:** explicit list does not justify removing the live environment-dressing/ruin/tunnel or grid object rendering paths.
