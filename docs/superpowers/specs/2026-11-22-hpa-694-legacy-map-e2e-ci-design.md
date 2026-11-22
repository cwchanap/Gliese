# HPA-694 — Retire painted-overworld leftovers and restore PR E2E CI

**Status:** Proposed design / planning-only draft PR  
**Issue:** https://linear.app/cwchanap/issue/HPA-694/remove-old-painted-map-leftovers-and-run-e2e-tests-in-ci  
**Repository:** cwchanap/Gliese; implement in this same PR after design review  
**Baseline reviewed:** main, 2026-11-22

## Problem and success definition

Gliese's outdoor world now uses the text-grid overworld, but the previous painted-map renderer, authored fields, sprite sheets, and test selectors remain. The normal CI skips end-to-end checks, while Asset Integrity requires Git LFS image bytes that GitHub can no longer download within the current allowance.

Remove dead machinery instead of maintaining a compatibility path. Keep the prologue playable and visually unchanged, and put a small, blocking Playwright journey back on every PR with real interior PNGs committed as ordinary Git blobs.

Success is **one implementation PR**, no new visual assets or gameplay, no Git LFS runtime dependency, and a passing E2E job targeting roughly ten minutes or less.

## Verified current architecture

- **Overworld:** The current continent is the text-grid **overworld** composed by **content/maps/overworld/**. Its tile and object atlases use **grid/tileset.ts**, **grid/objects.ts**, **BootScene**, and **WorldScene**; these are live and must stay.
- **Interior/tunnel maps:** **content/maps.ts** still uses real **groundPatches**, **blockers** (notably ruin walls and future gates), **interiorProps**, painted **backgroundImages**, and **navigationGridOwnedSources**. Preserve all still-active pathways.
- **Legacy authored fields:** **content/maps/types.ts** still defines **landmarks**, **fences**, **mapDecor**, and their sheet-specific types. **WorldScene** still renders them, reports their diagnostic IDs, and includes collision/debug logic. **content/maps/navigation.ts** and **save/save-state.ts** still contain supporting obstacle/doorway code.
- **Dead boot assets:** **BootScene** imports nine likely-unused sheets: coast, crossroads, forest, fence, marsh, shrine, village dressing, village buildings, and village hedge. These are candidates, not an unconditional deletion list; confirm references first.
- **E2E config:** **playwright.config.ts** still uses retired V1 proof filters and the **gate**, **exhaustive**, and **flaky** projects. **playwright.review.config.ts** and **tests/review/** are separate old harnesses.
- **CI:** **.github/workflows/ci.yml** runs lint/build/unit/Rust but deliberately omits E2E. **asset-integrity.yml** is manual, checks out with LFS, and isolates additional asset and browser lanes. **vite.config.ts** uses **CI_SKIP_LFS_ASSET_TESTS** to omit PNG-byte tests from ordinary CI.
- **Git storage:** **.gitattributes** routes interior PNGs through LFS. The original real bytes are not recoverable from LFS pointer stubs; obtain them from a known-good local checkout.

## Design boundaries

### 1. Remove retired outdoor authoring and renderer paths

First inventory **current runtime references** in the live map registry, not old plans and tests. Remove only map fields that no active definition authors: **landmarks**, **fences**, and **mapDecor**, plus now-dead types and downstream functions.

Clean the whole reference chain: **WorldScene** draw/collision/debug/diagnostic helpers, **maps/navigation.ts**, **maps/text.ts**, **save/save-state.ts**, map type exports, background ownership/source names, fixtures, generated navigation assumptions, and associated unit tests. Do not preserve old save-shape compatibility solely for removed map fields: the project has no shipped users.

**Keep:** grid world and object rendering, interior painted backgrounds, ground patches, working blocker kinds and their collision, navigation grids, interior props, story gates, doors/transitions, future gates, and the ruin/tunnel route. Keep the general painted-background package system where interiors still use it. Avoid rewriting **WorldScene** as an unrelated refactor.

Remove old background diagnostic fields only when they have no live interior/debug consumer; update test types and collectors together to avoid misleading empty compatibility arrays.

### 2. Remove unused sprite sheets with proof

Candidate sheets:

1. coast-dressing
2. crossroads-dressing
3. forest-dressing
4. fence-dressing
5. marsh-dressing
6. shrine-dressing
7. village-dressing
8. village-building
9. village-hedge

For each, verify **no live map, grid atlas builder, UI, runtime import, or asset test depends on it** before deleting the asset file, metadata export, BootScene preload, and obsolete tests. If a frame remains in use, retain the minimum live definition or first migrate its use to the existing grid object path without redrawing art. Remove stale test cases testing only removed metadata.

**Preserve** the environment-dressing sheet for the tunnel's ruin wall/future gate and any other live references; do not confuse it with the retired dressing sheets.

### 3. Move all interior PNG bytes from LFS to ordinary Git

This is a **hard preflight**: collect the nine real **public/game/assets/interiors/** PNGs from a trusted machine that already has the objects, then compare dimensions and checksums with their approved source inventory. Verify every file has PNG bytes (not an LFS pointer or blank placeholder) before modifying tracking. If bytes are unavailable, do not fake a migration, delete the LFS pointers, substitute art, or assert the ticket is implementable end-to-end.

Once obtained, remove the PNG LFS tracking rule and all remaining repository LFS configuration, stage the real existing files as ordinary blobs, and prove a fresh clone with LFS smudging disabled still builds and renders the interiors. Existing screenshots are the visual baseline. This is file-storage migration, **not new art generation**.

### 4. One trustworthy E2E lane

- Remove retired V1 regional background proofs, meadow-era route walks, unused config filters, **tests/review/**, and **playwright.review.config.ts**.
- Replace three Playwright projects with **one ordinary test suite**. Repair genuinely useful flaky tests when economical; delete tests tied to obsolete behaviors or irreparable stale routes. Do not keep a nonblocking flaky lane.
- Keep a lean, deterministic, web-based prologue smoke path that covers **new game → field/overworld movement → interior transition and collision → interaction/shop/quest → combat and return → save/continue**; existing valid tests should be reused rather than duplicated. Keep targeted regression tests where they remain reliable and low cost.
- Use **playwright.config.ts** as the sole config, Chromium, bounded retries (prefer no retries for genuine deterministic tests), screenshot/trace artifacts on failure, and a preview web server that will not attach to an unrelated CI server.
- Add a single blocking E2E job to **.github/workflows/ci.yml** for **pull_request** and **push to main**, including draft PRs so the test runs when planning/implementation changes are pushed. Build and browser installation happen inside the job; avoid a new orchestrator or matrix.
- Run the previously LFS-dependent **village-interior-assets.asset.test.ts** with regular unit tests now that PNGs are normal Git blobs. Remove **CI_SKIP_LFS_ASSET_TESTS** and its **vite.config.ts** exception.
- Fold any still-useful asset-byte check into normal CI and delete **asset-integrity.yml**, rather than retaining a manual workflow. Keep the existing JS/Rust build, lint, type, story checks, coverage, and Rust unit tests.
- Target **≤10 minutes for the E2E job** on GitHub-hosted runners; check measured elapsed time. Prefer reducing stale E2E cases and repeated setup over complex caching or sharding.

### 5. Update only stale operational documentation

Refresh **docs/stories/prologue.md** status/follow-ups (including obsolete temporary-art, audio, and turn-based phrasing), **CLAUDE.md** references to retired rendering/testing paths, and any direct usage instructions that falsely claim Asset Integrity or LFS is required. Do not rewrite story content or unrelated historical design records.

## Risks and controls

| Risk | Control |
| --- | --- |
| Original LFS art unavailable | Block migration until trusted complete PNGs exist; never commit pointers as regular files |
| Hidden live asset use | Confirm actual runtime + atlas references before each removal; keep grid and interior/tunnel visuals |
| Removal breaks saved state or doorway logic | Remove old authoring references and dead helpers consistently; test new-game, save/continue, transitions |
| E2E remains flaky or takes too long | Keep one focused Chromium suite, deterministic fixtures and clear logs; measure CI wall time |
| Visual regression missed by green unit tests | Automated screenshot parity against main for selected overworld/interior/tunnel views |
| Scope inflation | No new art/SFX, WorldScene split, gameplay rebalance, additional browser platform, testing framework, or backward-compatibility adapter |

## Acceptance contract (implementation; not yet met by this planning PR)

1. A repository-wide reference check finds no live use of retired outdoor **landmarks/fences/mapDecor** and no unused boot-loaded sheet; kept fields and sheets have verified runtime consumers.
2. Nine interior PNG files are valid normal Git blobs in the PR. A fresh checkout with **GIT_LFS_SKIP_SMUDGE=1** can decode them, build, and render all painted interiors; no LFS download is needed.
3. **bun run lint**, **bun run check**, **bun run build**, **bun run test:unit -- --run**, Rust formatting/Clippy/strict story check/build/unit tests, and asset-byte tests all pass in the updated CI workflows.
4. **Every PR push, including draft PR pushes, triggers one blocking Chromium E2E job**, not a manual/nonblocking lane. Its measured elapsed time is around **10 minutes or less**. A deliberately failed key assertion makes CI red and uploads trace/screenshot evidence.
5. E2E acceptance is executed with **MCP-driven browser/test tooling** against the web build and verified through **GitHub MCP** checks for the CI run. Cover the full functional journey above plus interior collisions, transition and save/reload. One web platform is sufficient; no native/Tauri acceptance is required for this shared-web change.
6. **Visual parity** is checked using a reproducible screenshot comparison against the same viewport/state on main (overworld outside Sundrop, at least one painted interior, and tunnel/ruins). If no UI mockup exists, screenshot parity is the visual contract. Capture results in automated test artifacts; no human sign-off gate.
7. No **tests/review**, retired project filters, obsolete Asset Integrity workflow, or LFS-only unit skip remains; docs describe the actual code and CI. All implementation stays in **one PR** associated with HPA-694.

## Open implementation dependency

**The existing nine interior PNG binaries are required from a working local checkout.** This is a real blocker for completing the implementation, not a reason to split the ticket or pay for LFS. Planning can proceed without those bytes; runtime migration cannot.
