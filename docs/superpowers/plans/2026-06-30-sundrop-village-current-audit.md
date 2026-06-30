# Sundrop Village Current Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the HPA-106 current-state Sundrop Village audit report without changing gameplay layout data.

**Architecture:** Treat `src/lib/game/content/maps/regions/village.ts` and `src/lib/game/content/maps/regions/village-layout.test.ts` as the current source of truth. The implementation creates one Markdown report that records the keep/remove/caution list for later HPA-105 child tasks. No runtime, save-state, content-coordinate, asset, or test code changes are expected.

**Tech Stack:** Markdown docs, TypeScript map content for source inspection, bun/vitest only if a TypeScript comment edit becomes necessary.

---

## File Structure

- Create: `docs/superpowers/reports/2026-06-21-sundrop-village-current-audit.md`
  - Responsibility: HPA-106 audit artifact for the current checked-out village state.
- Read-only reference: `src/lib/game/content/maps/regions/village.ts`
  - Responsibility: authored Sundrop Village landmarks, decor, pickups, transitions, ground patches, and blockers.
- Read-only reference: `src/lib/game/content/maps/regions/village-layout.test.ts`
  - Responsibility: deterministic layout guard for named rooms, side rewards, path-boundary readability, and decor roles.
- Optional modify only if stale comments are found: `src/lib/game/content/maps/regions/village.ts`
  - Expected current result: no edit; existing comments already describe the deterministic six-space layout.

## Task 1: Reconfirm Current Village Evidence

**Files:**
- Read: `src/lib/game/content/maps/regions/village.ts`
- Read: `src/lib/game/content/maps/regions/village-layout.test.ts`

- [ ] **Step 1: Confirm the workspace is clean except prior committed plan work**

Run:

```sh
rtk git status --short --branch
```

Expected: branch may be ahead of origin, but no unstaged or staged files are listed.

- [ ] **Step 2: Inspect the village source header and current coordinates**

Run:

```sh
rtk sed -n '1,120p' src/lib/game/content/maps/regions/village.ts
```

Expected evidence:

- header names the authored flow as `home yard -> well plaza -> market lane / north residences / shrine garden / east gate`
- landmarks include Hero House at `(700, 5430)`, Item Shop at `(520, 4960)`, Blacksmith at `(380, 5260)`, Well at `(1000, 5160)`, Shrine at `(1180, 5560)`, and East/Guild-side structures near the north/east cluster

- [ ] **Step 3: Inspect rewards, ground patches, and blockers**

Run:

```sh
rtk sed -n '330,880p' src/lib/game/content/maps/regions/village.ts
```

Expected evidence:

- pickups are `village-market-cache` and `village-shrine-cache`
- no `village-corridor-cache` exists
- ground patch ids are room/lane names such as `village-home-yard`, `sundrop-plaza-stone`, `village-market-lane`, `village-north-lane`, `village-shrine-garden`, and `village-gate-road`
- blockers use place-named ids such as `village-outer-*`, `village-home-yard-*`, `village-plaza-*`, `village-market-*`, `village-north-*`, `village-east-*`, and `village-shrine-*`
- `corridor-wall-*` blockers remain only for the village-gate-to-crossroads dogleg

- [ ] **Step 4: Confirm old technical hedge ids are absent**

Run:

```sh
rtk rg -n "'(vp|vn|vw|ve|vs)-|village-corridor-cache|village-lane-(west|north|east|south)-ring|village-lane-[wes]-spoke" src/lib/game/content/maps/regions/village.ts
```

Expected: no matches.

- [ ] **Step 5: Confirm the deterministic layout test names the target spaces and decor roles**

Run:

```sh
rtk sed -n '1,220p' src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected evidence:

- `villageRooms` includes `home-yard`, `well-plaza`, `market-lane`, `north-residences`, `shrine-garden`, and `east-gate`
- `villageDecorRoles` assigns roles to all `village-*` decor
- tests assert side rewards are off the main route and every village decor object has an assigned role

## Task 2: Create The Audit Report

**Files:**
- Create: `docs/superpowers/reports/2026-06-21-sundrop-village-current-audit.md`

- [ ] **Step 1: Add the audit report**

Create `docs/superpowers/reports/2026-06-21-sundrop-village-current-audit.md` with exactly this content:

```md
# Sundrop Village Current Audit

## Summary

HPA-106 audits the current checked-out Sundrop Village state before later HPA-105 relayout tasks make any more changes. This branch is already ahead of the original HPA-105 problem statement: the village now uses a deterministic six-space layout, side-pocket rewards, room/lane ground patch names, and place-named boundaries instead of the older ring/spoke hedge grid.

No gameplay or layout data changes are part of this audit.

## Current Target Spaces

The current village reads as the intended six-space structure:

- **Home Yard**: player origin and safety pocket around Hero House.
- **Well Plaza**: central navigation anchor around `sundrop-well` and plaza decor.
- **Market Yard**: west detour for Item Shop, Blacksmith, market stall, and market cache.
- **North Residences**: north/east residence row and Guild Hall approach.
- **Shrine Garden**: southeast optional pocket with shrine decor and shrine cache.
- **East Gate**: northeast exit threshold toward the Crossroads dogleg.

## Keep

- Keep the compact southwest village footprint.
- Keep the spawn near Hero House at the south side of the village.
- Keep the well/plaza center as the main navigation anchor.
- Keep Item Shop and Blacksmith west of the plaza as a market-side detour.
- Keep residences and Guild Hall north/east of the plaza.
- Keep Shrine Garden southeast of the plaza as an optional spiritual pocket.
- Keep East Gate as the exit toward Crossroads.
- Keep `village-market-cache` and `village-shrine-cache` as side-pocket rewards.
- Keep place-named boundaries such as `village-home-yard-*`, `village-plaza-*`, `village-market-*`, `village-north-*`, `village-east-*`, and `village-shrine-*`.

## Already Removed Or Replaced

- The old `vp-*`, `vn-*`, `vw-*`, `ve-*`, and `vs-*` technical micro-hedge ids are absent from `village.ts`.
- The old ring/spoke ground-patch ids are absent from `village.ts`.
- The main-corridor reward has already been replaced by market and shrine side-pocket rewards.
- Village decor now has explicit room roles guarded by `src/lib/game/content/maps/regions/village-layout.test.ts`.

## Remaining Visual Risks

- The preserved `corridor-wall-*` dogleg is still dense. Keep it only as the load-bearing village-to-crossroads route; do not treat it as a model for the village interior.
- Later relayout work should avoid recreating hedge-grid clutter under new place names.
- Screenshots should continue to read as `Home Yard -> Well Plaza -> side spaces -> East Gate` without requiring test knowledge.
- New decor should have a clear room role before it is added.
- New rewards should stay in side pockets rather than on the main route.

## Stale Comment Review

`src/lib/game/content/maps/regions/village.ts` already describes the village as a deterministic six-space layout. The comments no longer describe a temporarily open village or require HPA-106 cleanup.

The `corridor-wall-*` comment is intentionally preserved because it explains why those remaining technical-looking ids are load-bearing for the route from the village gate to Crossroads.

## Source Evidence

- `src/lib/game/content/maps/regions/village.ts` owns the current village region.
- `src/lib/game/content/maps/regions/village-layout.test.ts` locks the six named spaces, side reward placement, visible route boundaries, and village decor roles.
- Linear issue `HPA-106` asks for a current audit, no gameplay/content layout changes, and stale comment cleanup only if needed.

## Follow-Up Use

Later HPA-105 child tasks should cite this audit when deciding whether to preserve, remove, or rename village elements. The guiding rule is: keep the six-space readable village, avoid resurrecting the hedge-grid, and only preserve dense corridor geometry where it is load-bearing for the Crossroads route.
```

- [ ] **Step 2: Confirm only the report was added**

Run:

```sh
rtk git status --short
```

Expected:

```text
?? docs/superpowers/reports/2026-06-21-sundrop-village-current-audit.md
```

## Task 3: Verify And Commit

**Files:**
- Verify: `docs/superpowers/reports/2026-06-21-sundrop-village-current-audit.md`

- [ ] **Step 1: Inspect the report diff**

Run:

```sh
rtk git diff -- docs/superpowers/reports/2026-06-21-sundrop-village-current-audit.md
```

Expected: the diff only adds the Markdown report from Task 2.

- [ ] **Step 2: Check for accidental TypeScript edits**

Run:

```sh
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected: no output.

- [ ] **Step 3: Skip runtime tests for report-only change**

Do not run unit, e2e, or Svelte checks for the Markdown-only audit. If Step 2 unexpectedly shows a TypeScript edit, first remove any accidental layout/content change; if a comment-only TypeScript edit remains, run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected for the optional test command: PASS.

- [ ] **Step 4: Commit the audit report**

Run:

```sh
rtk git add docs/superpowers/reports/2026-06-21-sundrop-village-current-audit.md
rtk git commit -m "docs: audit current sundrop village layout"
```

Expected: one commit containing only `docs/superpowers/reports/2026-06-21-sundrop-village-current-audit.md`.

- [ ] **Step 5: Final status check**

Run:

```sh
rtk git status --short --branch
```

Expected: working tree is clean; branch is ahead of origin by the design commit, this plan commit, and the audit-report commit.
