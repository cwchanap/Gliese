# Sundrop Village Coordinate Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the HPA-107 verification report proving the checked-out Sundrop Village landmark and transition coordinates already match the deterministic six-space layout request.

**Architecture:** Treat `src/lib/game/content/maps/regions/village.ts` as the coordinate source of truth and `src/lib/game/content/maps/regions/village-layout.test.ts` as the existing layout-readability guard. The implementation creates one Markdown report with evidence tables and does not change game content, tests, assets, systems, or Svelte files.

**Tech Stack:** Markdown documentation, TypeScript map content for source inspection, bun/vitest for the existing layout test.

---

## File Structure

- Create: `docs/superpowers/reports/2026-06-30-sundrop-village-coordinate-verification.md`
  - Responsibility: HPA-107 verification artifact with requested vs. current coordinate evidence.
- Read-only reference: `src/lib/game/content/maps/regions/village.ts`
  - Responsibility: authored Sundrop Village landmark and transition coordinates.
- Read-only reference: `src/lib/game/content/maps/regions/village-layout.test.ts`
  - Responsibility: existing six-space readability guard.

## Task 1: Reconfirm HPA-107 Coordinate Evidence

**Files:**
- Read: `src/lib/game/content/maps/regions/village.ts`
- Read: `src/lib/game/content/maps/regions/village-layout.test.ts`

- [ ] **Step 1: Confirm the workspace is clean**

Run:

```sh
rtk git status --short --branch
```

Expected: the branch may be ahead of origin, but no staged or unstaged files are listed before the report is created.

- [ ] **Step 2: Inspect current landmark coordinates**

Run:

```sh
rtk sed -n '1,120p' src/lib/game/content/maps/regions/village.ts
```

Expected landmark evidence:

- `hero-house-exterior` is `(700, 5430)`
- `item-shop-exterior` is `(520, 4960)`
- `blacksmith` is `(380, 5260)`
- `villager-house-1-exterior` is `(870, 4720)`
- `villager-house-2-exterior` is `(1180, 4660)`
- `guild-hall-exterior` is `(1460, 4900)`
- `sundrop-well` is `(1000, 5160)`
- `shrine-of-aurora` is `(1180, 5560)`
- `villager-house-3-exterior` is `(1520, 5380)`

- [ ] **Step 3: Inspect current exterior transition coordinates and target map IDs**

Run:

```sh
rtk sed -n '350,430p' src/lib/game/content/maps/regions/village.ts
```

Expected transition evidence:

- `meadow-to-hero-house` is `(700, 5555)` and targets `hero-house`
- `meadow-to-item-shop` is `(520, 5080)` and targets `item-shop`
- `meadow-to-villager-house-1` is `(870, 4825)` and targets `villager-house-1`
- `meadow-to-villager-house-2` is `(1180, 4795)` and targets `villager-house-2`
- `meadow-to-guild-hall` is `(1460, 5040)` and targets `guild-hall`
- `meadow-to-shrine-of-aurora` is `(1180, 5728)` and targets `shrine-of-aurora-interior`
- `meadow-to-villager-house-3` is `(1520, 5548)` and targets `villager-house-3`

- [ ] **Step 4: Inspect the existing six-space layout guard**

Run:

```sh
rtk sed -n '1,220p' src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected evidence:

- `villageRooms` includes `home-yard`, `well-plaza`, `market-lane`, `north-residences`, `shrine-garden`, and `east-gate`
- `villageMainRoute` runs from the home yard through the plaza, guild/east gate area, and toward Crossroads
- decor role and side-reward assertions are already present

## Task 2: Create The Verification Report

**Files:**
- Create: `docs/superpowers/reports/2026-06-30-sundrop-village-coordinate-verification.md`

- [ ] **Step 1: Add the report**

Create `docs/superpowers/reports/2026-06-30-sundrop-village-coordinate-verification.md` with exactly this content:

```md
# Sundrop Village Coordinate Verification

## Summary

HPA-107 asks for the Sundrop Village landmarks and exterior transition points to use the deterministic six-space layout coordinates. The checked-out `src/lib/game/content/maps/regions/village.ts` already matches the requested coordinates, so this task is verification-only.

No gameplay, content, coordinate, transition, test, asset, system, or Svelte files were changed for this verification.

## Landmark Coordinates

| Landmark | Requested | Current `village.ts` | Status |
| --- | --- | --- | --- |
| Hero House | `(700, 5430)` | `(700, 5430)` | Match |
| Item Shop | `(520, 4960)` | `(520, 4960)` | Match |
| Blacksmith | `(380, 5260)` | `(380, 5260)` | Match |
| Villager House 1 | `(870, 4720)` | `(870, 4720)` | Match |
| Villager House 2 | `(1180, 4660)` | `(1180, 4660)` | Match |
| Guild Hall | `(1460, 4900)` | `(1460, 4900)` | Match |
| Sundrop Well | `(1000, 5160)` | `(1000, 5160)` | Match |
| Shrine of Aurora | `(1180, 5560)` | `(1180, 5560)` | Match |
| Villager House 3 | `(1520, 5380)` | `(1520, 5380)` | Match |

## Exterior Transition Coordinates

| Transition | Target map | Requested | Current `village.ts` | Status |
| --- | --- | --- | --- | --- |
| Hero House | `hero-house` | `(700, 5555)` | `(700, 5555)` | Match |
| Item Shop | `item-shop` | `(520, 5080)` | `(520, 5080)` | Match |
| Villager House 1 | `villager-house-1` | `(870, 4825)` | `(870, 4825)` | Match |
| Villager House 2 | `villager-house-2` | `(1180, 4795)` | `(1180, 4795)` | Match |
| Guild Hall | `guild-hall` | `(1460, 5040)` | `(1460, 5040)` | Match |
| Shrine | `shrine-of-aurora-interior` | `(1180, 5728)` | `(1180, 5728)` | Match |
| Villager House 3 | `villager-house-3` | `(1520, 5548)` | `(1520, 5548)` | Match |

## Acceptance Criteria Check

- All existing interior target map IDs remain unchanged.
- All requested landmark coordinates match the current source.
- All requested exterior transition coordinates match the current source.
- The village arrangement already reads as home at bottom, well center, market/blacksmith west, residences/guild north/east, shrine southeast, and east gate toward the world.
- HPA-108 can proceed from this verified coordinate baseline without re-moving buildings or entrances.

## Verification Commands

```sh
rtk sed -n '1,120p' src/lib/game/content/maps/regions/village.ts
rtk sed -n '350,430p' src/lib/game/content/maps/regions/village.ts
rtk sed -n '1,220p' src/lib/game/content/maps/regions/village-layout.test.ts
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/village-layout.test.ts
```

The targeted layout test passed, and the TypeScript diff was empty.
```

- [ ] **Step 2: Confirm only the report was added**

Run:

```sh
rtk git status --short
```

Expected:

```text
?? docs/superpowers/reports/2026-06-30-sundrop-village-coordinate-verification.md
```

## Task 3: Verify And Commit

**Files:**
- Verify: `docs/superpowers/reports/2026-06-30-sundrop-village-coordinate-verification.md`

- [ ] **Step 1: Run the targeted layout test**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected: PASS with `1 passed` test file and `10 passed` tests.

- [ ] **Step 2: Confirm the implementation is report-only**

Run:

```sh
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected: no output.

- [ ] **Step 3: Inspect the report diff**

Run:

```sh
rtk git diff -- docs/superpowers/reports/2026-06-30-sundrop-village-coordinate-verification.md
```

Expected: the diff only adds the Markdown report from Task 2.

- [ ] **Step 4: Commit the verification report**

Run:

```sh
rtk git add docs/superpowers/reports/2026-06-30-sundrop-village-coordinate-verification.md
rtk git commit -m "docs: verify sundrop village coordinates"
```

Expected: one commit containing only `docs/superpowers/reports/2026-06-30-sundrop-village-coordinate-verification.md`.

- [ ] **Step 5: Final status check**

Run:

```sh
rtk git status --short --branch
```

Expected: working tree is clean; branch contains the HPA-107 design spec commit and verification report commit on top of the existing HPA-106 work.
