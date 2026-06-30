# Sundrop Village Side-Pocket Rewards Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the HPA-111 verification report proving the checked-out Sundrop Village rewards already live in the requested side pockets.

**Architecture:** Treat `src/lib/game/content/maps/regions/village.ts` as the authored reward-placement source of truth, `src/lib/game/content/items.ts` as the item-id registry, `src/lib/game/content/maps/regions/village-layout.test.ts` as the side-route distance guard, and `src/lib/game/content/maps.test.ts` as the map-level pickup validation guard. The implementation creates one Markdown report and does not change gameplay content, tests, assets, systems, or Svelte files.

**Tech Stack:** Markdown documentation, TypeScript map and item content for source inspection, bun/vitest for the existing focused layout and map-content tests.

---

## File Structure

- Create: `docs/superpowers/reports/2026-06-30-sundrop-village-side-pocket-rewards-verification.md`
  - Responsibility: HPA-111 verification artifact with current side-pocket reward evidence.
- Read-only reference: `src/lib/game/content/maps/regions/village.ts`
  - Responsibility: authored Sundrop Village pickup ids, coordinates, item ids, and quantities.
- Read-only reference: `src/lib/game/content/items.ts`
  - Responsibility: item definitions for `field-potion` and `sunleaf-salve`.
- Read-only reference: `src/lib/game/content/maps/regions/village-layout.test.ts`
  - Responsibility: existing guard that every `village-*` pickup is at least 160px from the main route.
- Read-only reference: `src/lib/game/content/maps.test.ts`
  - Responsibility: existing map-level pickup item, quantity, reachability, bounds, and solid-overlap validation.

## Task 1: Reconfirm HPA-111 Reward Evidence

**Files:**
- Read: `src/lib/game/content/maps/regions/village.ts`
- Read: `src/lib/game/content/items.ts`
- Read: `src/lib/game/content/maps/regions/village-layout.test.ts`
- Read: `src/lib/game/content/maps.test.ts`

- [ ] **Step 1: Confirm the workspace is clean**

Run:

```sh
rtk git status --short --branch
```

Expected: the branch may be ahead of origin, but no staged or unstaged files are listed before the report is created.

- [ ] **Step 2: Inspect the current Sundrop Village pickups**

Run:

```sh
rtk sed -n '330,365p' src/lib/game/content/maps/regions/village.ts
```

Expected side-pocket reward evidence:

- `village-market-cache` at `(430, 5380)` with `itemId: 'field-potion'` and `quantity: 1`
- `village-shrine-cache` at `(1560, 5650)` with `itemId: 'sunleaf-salve'` and `quantity: 1`
- no `village-corridor-cache` entry in the inspected pickup list

- [ ] **Step 3: Confirm the removed corridor cache is absent from source**

Run:

```sh
rtk rg -n "village-corridor-cache" src/lib/game/content/maps/regions/village.ts
```

Expected: command exits with no matches.

- [ ] **Step 4: Inspect item definitions for the requested item ids**

Run:

```sh
rtk rg -n "'field-potion'|'sunleaf-salve'" src/lib/game/content/items.ts
```

Expected evidence:

- `field-potion` is defined in `items.ts`
- `sunleaf-salve` is defined in `items.ts`

- [ ] **Step 5: Inspect side-route and map-level pickup validation**

Run:

```sh
rtk sed -n '144,158p' src/lib/game/content/maps/regions/village-layout.test.ts
rtk sed -n '1404,1445p' src/lib/game/content/maps.test.ts
rtk sed -n '1666,1726p' src/lib/game/content/maps.test.ts
rtk sed -n '1774,1838p' src/lib/game/content/maps.test.ts
```

Expected evidence:

- `village-layout.test.ts` filters `village-*` pickups and asserts each one is at least 160px from `villageMainRoute`
- `maps.test.ts` verifies pickup ids are stable, item ids exist, quantities are positive, and coordinates are in bounds
- `maps.test.ts` includes pickups in gameplay-object reachability checks
- `maps.test.ts` prevents pickups from being authored inside solid rects

## Task 2: Create The Verification Report

**Files:**
- Create: `docs/superpowers/reports/2026-06-30-sundrop-village-side-pocket-rewards-verification.md`

- [ ] **Step 1: Add the report**

Create `docs/superpowers/reports/2026-06-30-sundrop-village-side-pocket-rewards-verification.md` with exactly this content:

```md
# Sundrop Village Side-Pocket Rewards Verification

## Summary

HPA-111 asks for Sundrop Village rewards to teach side-room detours instead of rewarding the direct spawn-to-East-Gate route. The checked-out `src/lib/game/content/maps/regions/village.ts` already contains the requested `village-market-cache` and `village-shrine-cache` pickups, and `village-corridor-cache` is absent, so this task is verification-only.

No gameplay, content, pickup, item, coordinate, transition, blocker, ground-patch, decor, NPC, test, asset, system, or Svelte files were changed for this verification.

## Side-Pocket Rewards

| Pickup id | Current position | Item id | Quantity | Side-room lesson |
| --- | --- | --- | --- | --- |
| `village-market-cache` | `(430, 5380)` | `field-potion` | `1` | check the Market/Blacksmith Yard detour |
| `village-shrine-cache` | `(1560, 5650)` | `sunleaf-salve` | `1` | check the Shrine Garden detour |

## Removal Check

`village-corridor-cache` is absent from `src/lib/game/content/maps/regions/village.ts`, so the current village no longer rewards the exit corridor.

## Item Definitions

- `field-potion` is already defined in `src/lib/game/content/items.ts`.
- `sunleaf-salve` is already defined in `src/lib/game/content/items.ts`.

## Test Coverage

- `village-layout.test.ts` checks every `village-*` pickup is at least 160px from the main spawn-to-East-Gate route.
- `maps.test.ts` validates pickup item ids, positive quantities, stable ids, and map bounds.
- `maps.test.ts` includes pickups in gameplay-object reachability checks from spawn.
- `maps.test.ts` prevents pickups from being authored inside blocker, fence, landmark, or colliding decor solid rects.

## Acceptance Criteria Check

- Both rewards are already inside side rooms.
- Neither reward sits on the direct route from spawn to East Gate.
- The market reward teaches the player to check the Market/Blacksmith Yard.
- The shrine reward teaches the player to check the Shrine Garden.
- Relevant item ids already exist; no new items were invented.
- HPA-112 can proceed from this verified side-pocket reward baseline without reworking reward placement.

## Verification Commands

```sh
rtk sed -n '330,365p' src/lib/game/content/maps/regions/village.ts
rtk rg -n "village-corridor-cache" src/lib/game/content/maps/regions/village.ts
rtk rg -n "'field-potion'|'sunleaf-salve'" src/lib/game/content/items.ts
rtk sed -n '144,158p' src/lib/game/content/maps/regions/village-layout.test.ts
rtk sed -n '1404,1445p' src/lib/game/content/maps.test.ts
rtk sed -n '1666,1726p' src/lib/game/content/maps.test.ts
rtk sed -n '1774,1838p' src/lib/game/content/maps.test.ts
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps.test.ts
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/items.ts src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps.test.ts
```

The focused layout and map-content tests passed, and the TypeScript diff was empty.
```

- [ ] **Step 2: Confirm only the report was added**

Run:

```sh
rtk git status --short
```

Expected:

```text
one untracked path for docs/superpowers/reports/2026-06-30-sundrop-village-side-pocket-rewards-verification.md
```

## Task 3: Verify And Commit

**Files:**
- Verify: `docs/superpowers/reports/2026-06-30-sundrop-village-side-pocket-rewards-verification.md`

- [ ] **Step 1: Run the focused layout and map-content tests**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps.test.ts
```

Expected: PASS with `2 passed` test files and `76 passed` tests.

- [ ] **Step 2: Confirm the implementation is report-only**

Run:

```sh
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/items.ts src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps.test.ts
```

Expected: no output.

- [ ] **Step 3: Inspect the report diff**

Run:

```sh
rtk git diff -- docs/superpowers/reports/2026-06-30-sundrop-village-side-pocket-rewards-verification.md
```

Expected: the diff only adds the Markdown report from Task 2.

If the report is still untracked and the command prints no output, inspect it directly with:

```sh
rtk sed -n '1,220p' docs/superpowers/reports/2026-06-30-sundrop-village-side-pocket-rewards-verification.md
```

Then stage the report and inspect the cached diff:

```sh
rtk git diff --cached -- docs/superpowers/reports/2026-06-30-sundrop-village-side-pocket-rewards-verification.md
```

- [ ] **Step 4: Commit the verification report**

Run:

```sh
rtk git add docs/superpowers/reports/2026-06-30-sundrop-village-side-pocket-rewards-verification.md
rtk git commit -m "docs: verify sundrop village reward pockets"
```

Expected: one commit containing only `docs/superpowers/reports/2026-06-30-sundrop-village-side-pocket-rewards-verification.md`.

- [ ] **Step 5: Final status check**

Run:

```sh
rtk git status --short --branch
```

Expected: the branch is clean after the verification report commit.
