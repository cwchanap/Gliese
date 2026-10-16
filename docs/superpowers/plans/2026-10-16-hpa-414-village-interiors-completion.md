# HPA-414 Village Interiors Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close HPA-414 against the current V2 interior implementation by proving the six originally named village interiors preserve their distinct layouts, navigation, interactions, round trips, save/reload behavior, painted presentation, and HPA-495 authoring guidance.

**Architecture:** Keep the current direct-map + `VILLAGE_INTERIOR_LAYOUTS` + generated-navigation + painted-package architecture unchanged. This is an acceptance/reconciliation slice. Reuse existing unit/E2E infrastructure and fix only demonstrated gaps; do not re-run the obsolete one-room migration design.

**Tech Stack:** TypeScript, Phaser 4, Svelte 5, Vitest, Playwright, Bun, Tauri/Rust story integration.

**Spec:** `docs/superpowers/specs/2026-10-16-hpa-414-village-interiors-completion-design.md`

## Global Constraints

- Keep HPA-414 as one PR. Continue implementation on this branch/PR after design review; do not open a second implementation PR.
- Target only `hero-house`, `item-shop`, `shrine-of-aurora-interior`, and `villager-house-1/2/3` unless a shared regression necessarily touches another interior.
- Preserve current V2 coordinates and painted packages unless a failing acceptance check proves a concrete defect.
- Preserve existing map, transition, NPC, dialogue, shop, story, respawn, quest, item, and save identities.
- Do not add an interior framework, compiler, room graph, compatibility path, or HPA-414-specific runtime abstraction.
- Do not create duplicate Batch 1 / Batch 2 runtime sources. The old batches are acceptance groupings only.
- No new image generation belongs in this task. If a genuine art replacement is required, scope it as a separate art task and keep this PR on runtime/acceptance wiring.
- Because the feature implementation already exists, do **not** manufacture RED tests for behavior that is already green. For every concrete defect found, first add or tighten the smallest failing regression test, then make the smallest production fix.
- Do not change the save schema for this ticket unless current valid saves demonstrably cannot represent the accepted behavior.

## Review Focus

Reviewers should reject scope that recreates work already delivered by HPA-586 or the painted-interior completion work. The important question is whether the six maps satisfy the original HPA-414 player contract on current `main`, not whether the historical migration steps can be reenacted.

---

### Task 1: Prove the Six-Map Structural Baseline

**Files:**

- Review: `src/lib/game/content/maps/layouts/village-interiors-v2.ts`
- Review: `src/lib/game/content/maps/layouts/meadow-entry-v2.ts`
- Review: `src/lib/game/content/maps/regions/village.ts`
- Review: `src/lib/game/content/maps.ts`
- Review: `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts`
- Review: `src/lib/game/content/backgrounds/village-interior-packages.ts`
- Review: `src/lib/game/content/backgrounds/map-background-registry.ts`
- Test/modify only if coverage is missing: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Test/modify only if coverage is missing: `src/lib/game/content/maps.test.ts`
- Test/modify only if coverage is missing: `src/lib/game/content/backgrounds/map-background-registry.test.ts`

**Interfaces:**

- The six stable map IDs remain direct `WorldMapDefinition` entries.
- Every Meadow Entry inbound transition arrives at the target map's current spawn contract.
- Every interior exit returns to its authored Meadow Entry arrival.
- Navigation and production background registration exist exactly once per target map.
- Villager Houses 1/2/3 keep distinct geometry/programs.

- [ ] **Step 1: Inventory the current six-map contracts**

Record the six map IDs and, for each, its layout dimensions, spawn, exit, exterior return, functional-zone names, NPC approach anchors, navigation source, and production painted package. Use repository sources as truth; do not copy coordinates from the July HPA-414 description.

- [ ] **Step 2: Run the existing focused structural tests**

Run:

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/content/backgrounds/map-background-registry.test.ts
bun run world:check:navigation
```

Expected: current V2 geometry, transition contracts, navigation, and package registration are green.

- [ ] **Step 3: Cover only an actual missing invariant**

If the existing tests do not data-drive all six HPA-414 targets for one of the interfaces above, extend the nearest existing test rather than creating an HPA-414-only harness. Prefer a local test-only array of the six IDs; do not add a production `HPA_414_MAP_IDS` constant.

If a real defect appears, capture it with the smallest failing assertion before changing production code.

- [ ] **Step 4: Re-run GREEN**

Re-run the commands from Step 2 and confirm no target map is missing, duplicated, unreachable at spawn, or wired to a stale return coordinate.

---

### Task 2: Prove Functional Semantics and Save Safety

**Files:**

- Review/test: `src/lib/game/content/shops.ts`
- Review/test: `src/lib/game/content/shops.test.ts`
- Review/test: `src/lib/game/content/dialogue.ts`
- Review/test: `src/lib/game/content/dialogue.test.ts`
- Review/test: `src/lib/game/core/battle.ts`
- Review/test: `src/lib/game/core/battle.test.ts`
- Review/test: `src/lib/game/save/save-state.ts`
- Review/test: `src/lib/game/save/save-state.test.ts`
- Review/test: `src/lib/game/phaser/scenes/WorldScene.ts`
- Review/test: `src/lib/game/phaser/scenes/scenes.test.ts`
- Review/test as needed: `src/lib/game/story/browser-fixture.ts`

**Interfaces:**

- Hero House remains a valid player-home interior and reload location.
- Item Shop keeps Mira's existing dialogue/shop behavior and stock semantics.
- Shrine keeps the existing defeat-respawn/story behavior while using its current V2 spawn/layout.
- Villager House 3 keeps Io's map-scoped dialogue/story behavior.
- Any valid save on a target interior reloads to a playable point under existing normalization rules.

- [ ] **Step 1: Run semantic regression tests**

Run:

```bash
bun run test:unit -- --run \
  src/lib/game/content/shops.test.ts \
  src/lib/game/content/dialogue.test.ts \
  src/lib/game/core/battle.test.ts \
  src/lib/game/save/save-state.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
bun run story:check
```

- [ ] **Step 2: Check current coordinates against semantic consumers**

Search for target-map literal coordinates or stale pre-V2 assumptions in shop/dialogue/respawn/save/scene tests. Replace only stale coordinate coupling that disagrees with the current owning layout source. Do not move layout geometry to satisfy an old test fixture.

- [ ] **Step 3: Fix defects test-first**

For each demonstrated defect, tighten the existing nearest regression test to RED, then make the smallest code/data fix. Do not bundle unrelated refactors.

- [ ] **Step 4: Re-run GREEN**

Repeat Step 1 and the focused test that captured each defect.

---

### Task 3: Add One Durable Six-Interior Runtime Journey

**Files:**

- Modify: `tests/e2e/complete-world-layout-journey.e2e.ts`
- Modify only if an existing helper is insufficient: `tests/e2e/helpers/game.ts`
- Review: `tests/e2e/game.e2e.ts`

**Interfaces:**

- One existing Playwright journey becomes the durable end-to-end owner for the six-map HPA-414 route.
- It validates entry, a meaningful reachable point/interaction, exit, and save/reload without creating a new E2E harness.

- [ ] **Step 1: Inspect existing interior browser coverage**

Reuse current journey probes, save seeding, movement diagnostics, background diagnostics, and save-screen helpers. Do not copy them into a new spec file.

- [ ] **Step 2: Add the smallest missing six-map loop**

Extend `complete-world-layout-journey.e2e.ts` with one data-driven test covering:

1. Hero House — enter/reach the current home route/exit;
2. Item Shop — reach Mira and prove the shop action is available;
3. Shrine — reach the central shrine route and preserve the current respawn target contract;
4. Villager House 1 — reach its representative resident/activity route;
5. Villager House 2 — reach its distinct workshop/residential route;
6. Villager House 3 — reach Io/archive-study route.

For each map, assert the active map ID and painted production presentation, then exercise the authored exit. Perform one save/reload on each target map or use the existing data-driven save helper if it already provides equivalent per-map coverage.

Do not add screenshot-golden assertions; screenshots may be captured as review evidence, not pixel-level tests.

- [ ] **Step 3: Run the focused browser journey**

Run:

```bash
bun run test:e2e -- --grep "village interiors"
```

If the repository's E2E naming requires a different existing grep after implementation, document the exact final command in the acceptance report.

- [ ] **Step 4: Fix only proven runtime gaps**

Any collision, approach, transition, painted/fallback, or save defect discovered by the journey gets a focused RED regression before the smallest fix. Avoid broad visual/layout redesign.

---

### Task 4: Record HPA-495 Field Validation and Acceptance Evidence

**Files:**

- Create: `docs/superpowers/reports/2026-10-16-hpa-414-village-interiors-acceptance.md`
- Review: `.agents/skills/gliese-world-expansion/SKILL.md`
- Review: `.agents/skills/gliese-world-expansion/references/authoring.md`
- Review: `.agents/skills/gliese-world-expansion/references/validation.md`
- Modify the skill/reference files only if the real acceptance pass exposes a reusable routing or validation defect.

- [ ] **Step 1: Use the current world-expansion guidance as written**

Follow the skill to locate the direct-map, V2 layout, transition, navigation, package, and validation owners used by Tasks 1-3.

- [ ] **Step 2: Record the field-validation outcome**

The report should contain a compact matrix for the six maps with: structural result, semantic result, browser result, save/reload result, painted/fallback result, and any fix made.

Also record one of:

- `No skill change required` — preferred when current guidance routed the work correctly; or
- one concrete reusable guidance defect and the smallest documentation correction made in this PR.

Do not add process prose merely to claim the skill was field-validated.

- [ ] **Step 3: Capture controller acceptance**

Walk the six interiors with a controller in web and packaged Tauri. Record pass/fail notes in the report. Keep screenshots optional and review-oriented; do not introduce an evidence framework.

---

### Task 5: Final Verification and Roadmap Closure

**Files:**

- All files changed by Tasks 1-4.
- Linear: HPA-414; parent HPA-397 after merge/acceptance.

- [ ] **Step 1: Run final repository checks**

Run:

```bash
bun run check
bun run lint
bun run test:unit -- --run
bun run world:check:navigation
bun run story:check
bun run build
bun run build:tauri
bun run test:e2e -- --grep "village interiors"
```

Also run the repository's existing village-interior art validator command if it is not already part of an aggregate script, and record the exact command/result in the acceptance report.

- [ ] **Step 2: Review the diff for accidental redesign**

Confirm the implementation contains no new framework, compatibility layer, save version, quests/economy, or new generated art. Production-code changes should correspond one-to-one with demonstrated acceptance defects.

- [ ] **Step 3: Update the same draft PR**

Summarize the six-map results, any concrete fixes, HPA-495 field-validation outcome, and final commands in the existing HPA-414 PR. Do not create another PR.

- [ ] **Step 4: Close Linear only after acceptance**

After the implementation is reviewed and merged, mark HPA-414 Done. If HPA-397 has no other incomplete child work at that point, mark HPA-397 Done as the roadmap closure step.
