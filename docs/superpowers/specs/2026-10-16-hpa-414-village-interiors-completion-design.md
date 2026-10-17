# HPA-414 Village Interiors Completion Design

## Problem

HPA-414 was written when Hero House, Item Shop, Shrine of Aurora, and Villager Houses 1-3 were still compact one-room interiors. That implementation premise is obsolete.

HPA-586 and the later painted-interior work already delivered the coordinate-first V2 interiors, generated navigation, direct `WorldMapDefinition` content, production painted packages, live interactions, and the Blacksmith expansion. The resulting eight-interior runtime package was reviewed on 2026-08-31 in `docs/superpowers/reports/2026-08-29-complete-eight-village-interiors-runtime-review.md` and received an **APPROVED** verdict.

Therefore HPA-414 should not recreate either the migration or the acceptance matrix that already approved it.

## Why HPA-414 still needs a current-main pass

The 2026-08-31 approval predates changes that touch the exact HPA-414 contracts around saving and the Item Shop:

- `d8167fc` — slot-based saves and title/save flow;
- `146956d` — Heroic shop presentation and shop interaction changes;
- `06025d1` — save migration/backups and load-picker changes.

Those changes do not justify re-authoring the interiors, but they do justify re-verifying the approved result on current `main`.

## Decision

Treat HPA-414 as a **targeted re-verification and closure slice**.

The HPA-414 PR will:

1. preserve the approved V2 interior implementation;
2. re-run the existing structural, semantic, asset, navigation, and all-eight runtime owners on current `main`;
3. focus any new coverage on post-2026-08-31 risk, especially save/reload and Mira's Item Shop flow;
4. fix only concrete defects that reproduce in the product, not route-helper flake;
5. append the HPA-414 result to the existing approved runtime review instead of creating a second acceptance report;
6. add the concise HPA-495 final validation note under `docs/superpowers/specs/` that HPA-495 itself requires;
7. close HPA-414 and, if no incomplete children remain, HPA-397.

## Existing owners to reuse

The current repository already owns the relevant contracts:

- `src/lib/game/content/maps/layouts/village-interiors-v2.ts` — room/corridor/wall/door/spawn/exit/NPC-approach geometry;
- `src/lib/game/content/maps.ts` — direct map definitions and fallback content;
- `src/lib/game/content/maps/layouts/meadow-entry-v2.ts` and `src/lib/game/content/maps/regions/village.ts` — exterior/interior round trips;
- `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts` — navigation inputs;
- `src/lib/game/content/backgrounds/village-interior-packages.ts` and `map-background-registry.ts` — painted package/fallback ownership;
- `src/lib/game/content/backgrounds/map-background-registry.test.ts` — existing all-eight contract matrix;
- `src/lib/game/content/maps/layouts/layouts.test.ts` — pinned per-layout geometry;
- `src/lib/game/core/battle.ts` / `battle.test.ts` — Shrine defeat relocation through `applyBattleDefeat(...)`;
- `tests/e2e/game.e2e.ts` — all-eight painted/fallback runtime journey plus the older HPA-586 graybox route tests;
- `docs/superpowers/reports/2026-08-29-complete-eight-village-interiors-runtime-review.md` — approved runtime evidence and command history.

Do not copy those contracts into a new HPA-414 inventory or add an issue-specific six-ID runtime constant/test matrix.

## Acceptance scope

### Hero House

Keep the current bedroom, study, living/kitchen, and hall program. Re-verify entry, meaningful traversal, authored exit/re-entry, and save/reload at a valid interior position.

There is no separate "home-state" gameplay contract to preserve; Hero House follows the same interior runtime contract as the other non-shop residences.

### Item Shop

Keep the current sales floor, stockroom/office, service circulation, Mira interaction, and shop inventory/state rules.

This map receives the most focused re-verification because the approved 2026-08-31 journey predates the slot-save and Heroic shop changes. The current all-eight data has no `persistAfterStep` for Item Shop, so a mid-interior save/reload after the Mira interaction is the one targeted coverage addition worth considering if the existing helper supports it cleanly.

### Shrine of Aurora

Keep the current ceremonial layout, story interactions, painted package, exterior round trip, and save/reload behavior.

Defeat relocation remains unit-owned: `applyBattleDefeat(...)` must continue to move a defeated player to `shrineOfAuroraInteriorMap.spawn`, use the Shrine's current `spawnDirection`, and set HP to 1. Do not add a browser respawn harness for this contract.

### Villager Houses 1-3

Re-verify their current routes, resident/Io interactions, exterior round trips, save/reload, and painted/fallback presentation.

Their distinctness remains a design/controller-review criterion. Existing layout tests already pin each house's authored geometry separately; do not add a weak synthetic `layout A !== layout B` assertion.

## Browser validation ownership

`test('all eight painted village interiors')` in `tests/e2e/game.e2e.ts` is the broader release-gate journey for this slice. It covers the six HPA-414 maps plus Guild Hall and Blacksmith with authored routes/interactions, painted and missing-base fallback phases, re-entry, and save/reload.

It is **not core-CI-enforced**:

- core CI does not run Playwright E2E;
- the all-eight test belongs to the `exhaustive` Playwright project;
- the Asset Integrity workflow that runs exhaustive E2E is manual-only while LFS budget constraints remain.

Therefore HPA-414 must run the all-eight journey locally and record the exact commit SHA used for the result.

`tests/e2e/complete-world-layout-journey.e2e.ts` remains Meadow-only and must not gain another interior loop.

## Flake-versus-product rule

The older `HPA-586 interior graybox: <mapId>` route tests are already quarantined in Playwright's `flaky` project because route-walking failures vary by map/run.

A browser route failure counts as a **product defect only when a manual keyboard or controller walk reproduces the same failure**.

- If manual repro confirms the problem, add/tighten the smallest RED regression and make the smallest production fix.
- If manual repro does not confirm it, treat it as harness/helper flake and fix only the source-derived route helper/case data.
- Do not move production walls, collision, spawn, or interaction geometry merely to satisfy a flaky route helper.

If the broader all-eight release-gate journey passes and still covers the product behaviors exercised by the quarantined graybox loop, remove the redundant graybox loop in this PR rather than carrying two six-map route owners indefinitely.

## HPA-495 final validation evidence

HPA-495's own design asks for one concise dated note under `docs/superpowers/specs/` after HPA-414 Batch 1.

The honest evidence is:

- the 2026-08-23 interior redesign and subsequent HPA-586 completion were authored under the `gliese-world-expansion` workflow;
- that work exercised routing across residential, commercial, and ceremonial interiors;
- no reusable skill defect requiring a change has been demonstrated;
- HPA-414 itself is a re-verification slice and does not claim new authoring activity;
- the existing greenfield region/dungeon limitation remains unchanged.

Do not put this process note into a new acceptance-report matrix.

## Verification commands

Use strict/non-mutating validation for this acceptance slice:

```bash
bun run test:unit -- --run
bun run world:check:navigation
bun run art:validate:village-interiors
bun run story:check:strict
bun run check
bun run lint
bun run build:tauri
bun run build && bunx playwright test --project=exhaustive -g "all eight painted village interiors"
bun run tauri build
```

`build:tauri` already includes `story:check:strict`, so the final consolidated run does not need to repeat both unless the earlier semantic pass changed story data.

## Art boundary

No new art generation belongs in HPA-414. Existing painted packages are the approved baseline.

If re-verification exposes a visual defect that genuinely requires new generated art, create a separate art task. Keep this PR limited to verification, test/harness cleanup, and any demonstrated runtime wiring fix.

## Non-goals

- redoing HPA-586 coordinate design;
- recreating the original Batch 1 / Batch 2 migration sequence;
- creating a second six-map acceptance report;
- copying current coordinates/packages/zones into HPA-414 prose;
- adding a generic interior framework, compiler, room graph, compatibility layer, or second map source;
- changing save schema, story content, quests, economy, or dialogue without a demonstrated defect;
- adding a browser Shrine defeat test;
- adding new generated art;
- editing production geometry for a route failure that cannot be manually reproduced.

## Delivery shape

Use one PR for HPA-414. Implementation continues on this branch after plan review.

A successful implementation should be small: re-run approved owners, add only targeted post-approval coverage, delete redundant flaky coverage when the broader owner supersedes it, append the current-main result to the existing runtime review, add the HPA-495 final validation note, and close the roadmap work.
