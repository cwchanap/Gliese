# HPA-414 Village Interiors Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close HPA-414 by re-verifying the already-approved eight-interior runtime result on current `main`, focusing new work only on post-2026-08-31 save/shop risk and proven defects.

**Architecture:** Keep the current direct-map + `VILLAGE_INTERIOR_LAYOUTS` + generated-navigation + painted-package architecture unchanged. Reuse the existing all-eight tests and approved runtime review; do not recreate migration batches, acceptance matrices, or issue-specific runtime abstractions.

**Tech Stack:** TypeScript, Phaser 4, Svelte 5, Vitest, Playwright, Bun, Tauri/Rust.

**Spec:** `docs/superpowers/specs/2026-10-16-hpa-414-village-interiors-completion-design.md`

## Global Constraints

- Keep HPA-414 as one PR. Continue implementation on this branch/PR; do not open a second implementation PR.
- Preserve current V2 maps/layouts/packages unless a manually reproduced product defect proves a change is necessary.
- Preserve existing map, transition, NPC, dialogue, shop, story, defeat-relocation, item, and save identities.
- Do not add an interior framework, compiler, room graph, compatibility path, second map source, or HPA-414-specific runtime abstraction.
- Do not create a new six-map acceptance report, coordinate inventory, test matrix, or production `HPA_414_MAP_IDS` constant.
- No new image generation belongs in this task. A genuine new-art need becomes a separate art task.
- Do not change save schema unless current valid saves demonstrably cannot represent accepted behavior.
- Do not manufacture RED tests for already-green behavior.
- A route-walking failure authorizes a production layout/collision change only when the same failure reproduces manually with keyboard or controller.

## What changed since the approved baseline

The existing all-eight runtime review was approved on 2026-08-31. Re-verification is justified by later changes touching HPA-414's save/shop contracts:

- `d8167fc` — slot-based saves;
- `146956d` — Heroic shop changes;
- `06025d1` — save migration/backups and load-picker changes.

The implementation should spend effort on those risks rather than re-documenting unchanged geometry.

---

### Task 1: Re-run Existing Structural, Asset, and Semantic Owners

**Review/reuse:**

- `src/lib/game/content/backgrounds/map-background-registry.test.ts`
- `src/lib/game/content/maps/layouts/layouts.test.ts`
- `src/lib/game/content/maps.test.ts`
- `src/lib/game/core/battle.test.ts`
- `src/lib/game/content/shops.test.ts`
- `src/lib/game/content/dialogue.test.ts`
- `src/lib/game/save/save-state.test.ts`
- `src/lib/game/phaser/scenes/scenes.test.ts`
- `docs/superpowers/reports/2026-08-29-complete-eight-village-interiors-runtime-review.md`

- [ ] **Step 1: Run the current-main unit and generated-data checks**

```bash
bun run test:unit -- --run
bun run world:check:navigation
bun run art:validate:village-interiors
bun run story:check:strict
```

Expected: the existing all-eight structural/package matrix, pinned layout tests, battle relocation regression, shop/dialogue/save tests, navigation generation check, real interior asset validation, and strict story consistency are green.

- [ ] **Step 2: Do not rebuild a contract inventory**

Use the existing all-eight matrix and pinned layout tests as source of truth. Do not copy dimensions, coordinates, zones, package IDs, or six-map lists into new HPA-414 prose/tests unless a current failure proves an owner is actually missing.

- [ ] **Step 3: Triage any failure by owner**

If an existing unit/asset/navigation test fails, add or tighten the smallest regression only when current coverage is insufficient, then make the smallest fix. Avoid unrelated cleanup.

---

### Task 2: Target the Post-2026-08-31 Save and Item Shop Risk

**Review/test:**

- `tests/e2e/game.e2e.ts`
- `src/lib/game/save/slots.ts`
- `src/lib/game/save/save-state.ts`
- save-related tests
- `src/lib/game/content/shops.ts`
- `src/lib/game/content/shops.test.ts`
- relevant HUD/shop tests

**Interfaces:**

- saves created inside an HPA-414 interior resume on the same map at a playable position;
- Item Shop still reaches Mira and opens the same canonical shop after Heroic UI changes;
- a slot save made after the Mira interaction resumes inside Item Shop without losing valid shop/inventory state;
- Hero House has no special home-state contract beyond ordinary interior save/reload;
- Shrine defeat relocation stays unit-owned by `applyBattleDefeat(...)` and `battle.test.ts`.

- [ ] **Step 1: Inspect existing all-eight persistence coverage**

Confirm which `INTERIOR_GRAYBOX_CASES` have `persistAfterStep`. Hero House and Item Shop currently have none, so their all-eight save happens after re-entry at the spawn.

- [ ] **Step 2: Add only the targeted Item Shop persistence assertion if the helper fits cleanly**

Prefer the smallest data-driven change in the existing all-eight case data: persist after Mira's interaction/approach so the existing `saveInteriorCheckpointAndReload(...)` path exercises a mid-interior slot save after the shop flow.

Do not add a parallel HPA-414 test. Do not add equivalent mid-route persistence to Hero House merely for symmetry; it has no mutable interaction that creates the same post-approval risk.

- [ ] **Step 3: Run the focused semantic tests again**

Run the nearest save/shop/unit tests plus `story:check:strict` only if story-facing data changed.

If a genuine save/shop defect appears, capture it with the smallest RED regression first, then fix only that defect.

---

### Task 3: Run the Existing All-Eight Release-Gate Journey and Simplify E2E Ownership

**Files:**

- Review/modify: `tests/e2e/game.e2e.ts`
- Review only: `playwright.config.ts`
- Keep Meadow-only: `tests/e2e/complete-world-layout-journey.e2e.ts`

**Interfaces:**

- `test('all eight painted village interiors')` is the broader local release-gate journey for HPA-414.
- It is not core-CI-enforced; HPA-414 records the exact commit SHA used for the local result.
- The quarantined `HPA-586 interior graybox: <mapId>` loop is redundant if the all-eight journey remains a behavioral superset and passes.

- [ ] **Step 1: Build and run the exhaustive all-eight journey explicitly**

```bash
bun run build && bunx playwright test --project=exhaustive -g "all eight painted village interiors"
```

Record the tested commit SHA and result.

- [ ] **Step 2: Apply the flake-versus-product rule**

For any route/collision/approach/transition failure:

1. reproduce the same route manually with keyboard or controller;
2. if manual repro succeeds, treat the failure as harness flake and fix only source-derived route helper/case data;
3. if manual repro fails the same way, add/tighten the smallest RED regression and make the smallest production fix.

Never move production geometry only to satisfy a flaky helper.

- [ ] **Step 3: Remove redundant graybox coverage when the superset is proven**

Compare the quarantined `HPA-586 interior graybox` loop against the passing all-eight route/interactions/save/re-entry coverage.

If all-eight remains a behavioral superset, delete the graybox loop and its now-unused dedicated plumbing. Keep shared case data/helpers that the all-eight journey still uses.

If a unique product assertion exists, preserve that assertion in the broader owner instead of retaining a second six-map loop.

- [ ] **Step 4: Re-run the exhaustive all-eight journey after any E2E cleanup**

Use the same explicit command and record the final commit SHA/result.

---

### Task 4: Manual Controller/Packaged Acceptance and Evidence Closure

**Files:**

- Append: `docs/superpowers/reports/2026-08-29-complete-eight-village-interiors-runtime-review.md`
- Create: `docs/superpowers/specs/2026-10-16-hpa-495-final-world-expansion-validation.md`
- Review only unless a real reusable defect exists: `.agents/skills/gliese-world-expansion/`

- [ ] **Step 1: Controller walk in web**

Run:

```bash
bun run dev
```

With a controller, walk the six HPA-414 interiors and verify entry, route readability, required interaction, and exit. Villager-house distinctness is assessed here visually/spatially; do not add a synthetic layouts-differ test.

- [ ] **Step 2: Build and test packaged Tauri**

Run:

```bash
bun run tauri build
```

Launch the packaged artifact and repeat the controller smoke walk. This is the packaged-asset/gamepad proof; `build:tauri` alone is only the frontend Tauri-mode build.

- [ ] **Step 3: Append one dated HPA-414 re-verification section to the existing approved report**

Do **not** create a second acceptance report.

Append a compact section containing:

- current commit SHA;
- reason for re-verification: slot saves, Heroic shop/UI, save migration/backups;
- exact commands and results;
- whether Item Shop mid-interior persistence was added and its result;
- all-eight release-gate result;
- web + packaged controller result;
- any real product fix versus harness-only fix;
- whether the redundant graybox loop was removed.

- [ ] **Step 4: Add the HPA-495 final validation note where its own spec requires it**

Create a concise dated note under `docs/superpowers/specs/` summarizing:

- routing exercised by the 2026-08-23/HPA-586 interior authoring work;
- concrete reusable gaps observed: none requiring a skill change, unless this pass proves otherwise;
- smallest corrections made, if any;
- HPA-414 itself was re-verification, not new authoring;
- greenfield region/dungeon limit remains unchanged.

Do not edit the skill merely to mention HPA-414.

---

### Task 5: Final Verification and Roadmap Closure

- [ ] **Step 1: Run final checks**

```bash
bun run check
bun run lint
bun run test:unit -- --run
bun run world:check:navigation
bun run art:validate:village-interiors
bun run build:tauri
bun run build && bunx playwright test --project=exhaustive -g "all eight painted village interiors"
```

`build:tauri` already runs `story:check:strict`, so a separate final strict-story command is unnecessary unless story files changed during implementation.

The packaged artifact must also have been built with:

```bash
bun run tauri build
```

for the Task 4 controller acceptance.

- [ ] **Step 2: Review the diff for accidental scope**

Confirm there is no new framework, compatibility layer, save version, second acceptance report, duplicate six-map test owner, story/economy expansion, or generated art. Production changes must map to manually reproduced defects.

- [ ] **Step 3: Update this same draft PR**

Summarize the appended re-verification result, exact tested SHA, any focused save/shop coverage added, any real fix, E2E helper cleanup, HPA-495 note, and final commands. Do not create another PR.

- [ ] **Step 4: Close Linear only after acceptance**

After implementation is reviewed and merged, mark HPA-414 Done. If HPA-397 has no other incomplete child work, mark HPA-397 Done.
