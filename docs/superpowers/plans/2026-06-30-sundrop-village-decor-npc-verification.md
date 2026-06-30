# Sundrop Village Decor And NPC Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the HPA-110 verification report proving the checked-out Sundrop Village decor and ambient NPCs already use the requested reduced role-based set.

**Architecture:** Treat `src/lib/game/content/maps/regions/village.ts` as the authored decor/NPC source of truth, `src/lib/game/content/maps/regions/village-layout.test.ts` as the decor-role guard, and `src/lib/game/content/maps.test.ts` as the map-level ambient NPC validation guard. The implementation creates one Markdown report with evidence tables and does not change game content, tests, assets, systems, or Svelte files.

**Tech Stack:** Markdown documentation, TypeScript map content for source inspection, bun/vitest for the existing focused layout and map-content tests.

---

## File Structure

- Create: `docs/superpowers/reports/2026-06-30-sundrop-village-decor-npc-verification.md`
  - Responsibility: HPA-110 verification artifact with current role-based decor and route-guiding NPC evidence.
- Read-only reference: `src/lib/game/content/maps/regions/village.ts`
  - Responsibility: authored Sundrop Village decor ids, ambient NPC ids, coordinates, dimensions, frames, and comments.
- Read-only reference: `src/lib/game/content/maps/regions/village-layout.test.ts`
  - Responsibility: existing village decor role guard and six-space readability guard.
- Read-only reference: `src/lib/game/content/maps.test.ts`
  - Responsibility: existing map-level ambient NPC frame, bounds, reachability, and solid-overlap validation.

## Task 1: Reconfirm HPA-110 Decor And NPC Evidence

**Files:**
- Read: `src/lib/game/content/maps/regions/village.ts`
- Read: `src/lib/game/content/maps/regions/village-layout.test.ts`
- Read: `src/lib/game/content/maps.test.ts`

- [ ] **Step 1: Confirm the workspace is clean**

Run:

```sh
rtk git status --short --branch
```

Expected: the branch may be ahead of origin, but no staged or unstaged files are listed before the report is created.

- [ ] **Step 2: Inspect current decor and ambient NPC definitions**

Run:

```sh
rtk sed -n '90,345p' src/lib/game/content/maps/regions/village.ts
```

Expected role-based decor evidence:

- `village-plaza-fountain`
- `village-hanging-lantern`
- `village-plaza-flowers-west`
- `village-plaza-flowers-east`
- `village-market-stall`
- `village-market-banner`
- `village-field-scarecrow`
- `village-blacksmith-topiary`
- `village-north-lantern-west`
- `village-north-lantern-east`
- `village-shrine-offering`
- `village-stone-lantern`
- `village-shrine-maple`
- `village-gate-arch`
- `village-gate-lantern-a`
- `village-gate-lantern-b`
- `village-corridor-waymarker`

Expected route-guiding ambient NPC evidence:

- `village-wanderer` at `(1140, 5000)`, frame `travelerNpc`
- `village-woodcutter` at `(560, 5260)`, frame `woodcutterNpc`
- `village-pilgrim` at `(1100, 5780)`, frame `pilgrimNpc`
- `village-crier` at `(1540, 4620)`, frame `crierNpc`

- [ ] **Step 3: Inspect current decor role assignments**

Run:

```sh
rtk sed -n '34,52p' src/lib/game/content/maps/regions/village-layout.test.ts
rtk sed -n '193,205p' src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected evidence:

- `villageDecorRoles` assigns a role to each of the 17 HPA-110 decor ids
- the `no random decor` test asserts every `village-*` decor object is present in `villageDecorRoles`

- [ ] **Step 4: Inspect map-level ambient NPC validation**

Run:

```sh
rtk sed -n '1700,1845p' src/lib/game/content/maps.test.ts
```

Expected evidence:

- ambient NPCs are included in the spawn reachability proximity checks
- every ambient NPC must have a valid frame and stay in map bounds
- pickups, discoveries, and ambient NPCs must not be authored inside solid rects

## Task 2: Create The Verification Report

**Files:**
- Create: `docs/superpowers/reports/2026-06-30-sundrop-village-decor-npc-verification.md`

- [ ] **Step 1: Add the report**

Create `docs/superpowers/reports/2026-06-30-sundrop-village-decor-npc-verification.md` with exactly this content:

```md
# Sundrop Village Decor And NPC Verification

## Summary

HPA-110 asks for Sundrop Village to replace mixed decor and NPC filler with a smaller role-based set for the six named village spaces. The checked-out `src/lib/game/content/maps/regions/village.ts` already contains the requested 17 decor objects and four route-guiding ambient NPCs, while `src/lib/game/content/maps/regions/village-layout.test.ts` already assigns roles to every village decor object, so this task is verification-only.

No gameplay, content, decor, NPC, coordinate, transition, blocker, ground-patch, test, asset, system, or Svelte files were changed for this verification.

## Role-Based Decor

| Decor id | Current role | Motif |
| --- | --- | --- |
| `village-plaza-fountain` | `anchor` | well/plaza anchor |
| `village-hanging-lantern` | `plaza-frame` | plaza frame |
| `village-plaza-flowers-west` | `plaza-frame` | plaza frame |
| `village-plaza-flowers-east` | `plaza-frame` | plaza frame |
| `village-market-stall` | `market-identity` | market identity |
| `village-market-banner` | `market-threshold` | market threshold |
| `village-field-scarecrow` | `field-background` | field background |
| `village-blacksmith-topiary` | `dead-end-frame` | blacksmith side frame |
| `village-north-lantern-west` | `north-threshold` | north residence threshold |
| `village-north-lantern-east` | `guild-threshold` | guild threshold |
| `village-shrine-offering` | `shrine-symbol` | shrine symbol |
| `village-stone-lantern` | `shrine-symbol` | shrine symbol |
| `village-shrine-maple` | `hide-reward` | shrine reward concealment |
| `village-gate-arch` | `exit-threshold` | east-gate threshold |
| `village-gate-lantern-a` | `exit-threshold` | east-gate threshold |
| `village-gate-lantern-b` | `exit-threshold` | east-gate threshold |
| `village-corridor-waymarker` | `crossroads-breadcrumb` | Crossroads route breadcrumb |

## Route-Guiding Ambient NPCs

| NPC id | Current position | Frame | Route meaning |
| --- | --- | --- | --- |
| `village-wanderer` | `(1140, 5000)` | `travelerNpc` | near Well Plaza |
| `village-woodcutter` | `(560, 5260)` | `woodcutterNpc` | near Market/Blacksmith side |
| `village-pilgrim` | `(1100, 5780)` | `pilgrimNpc` | near Shrine Garden |
| `village-crier` | `(1540, 4620)` | `crierNpc` | near East Gate |

## Test Coverage

- `village-layout.test.ts` assigns all 17 village decor ids a role through `villageDecorRoles`.
- `village-layout.test.ts` rejects any `village-*` decor object without an assigned role.
- `maps.test.ts` includes ambient NPCs in spawn reachability proximity checks.
- `maps.test.ts` validates every ambient NPC frame and map bounds.
- `maps.test.ts` prevents ambient NPCs from being authored inside solid rects.

## Acceptance Criteria Check

- No village decor object lacks a role.
- The well/plaza remains the main visual anchor.
- Market, shrine, and gate each have distinct motifs.
- NPCs already guide route meaning near the well plaza, market/blacksmith side, shrine garden, and east gate.
- HPA-111 can proceed from this verified reduced decor/NPC baseline without reworking decor or ambient NPC placement.

## Verification Commands

```sh
rtk sed -n '90,345p' src/lib/game/content/maps/regions/village.ts
rtk sed -n '34,52p' src/lib/game/content/maps/regions/village-layout.test.ts
rtk sed -n '193,205p' src/lib/game/content/maps/regions/village-layout.test.ts
rtk sed -n '1700,1845p' src/lib/game/content/maps.test.ts
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps.test.ts
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps.test.ts
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
one untracked path for docs/superpowers/reports/2026-06-30-sundrop-village-decor-npc-verification.md
```

## Task 3: Verify And Commit

**Files:**
- Verify: `docs/superpowers/reports/2026-06-30-sundrop-village-decor-npc-verification.md`

- [ ] **Step 1: Run the focused layout and map-content tests**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps.test.ts
```

Expected: PASS with `2 passed` test files and `76 passed` tests.

- [ ] **Step 2: Confirm the implementation is report-only**

Run:

```sh
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps.test.ts
```

Expected: no output.

- [ ] **Step 3: Inspect the report diff**

Run:

```sh
rtk git diff -- docs/superpowers/reports/2026-06-30-sundrop-village-decor-npc-verification.md
```

Expected: the diff only adds the Markdown report from Task 2.

If the report is still untracked and the command prints no output, inspect it directly with:

```sh
rtk sed -n '1,220p' docs/superpowers/reports/2026-06-30-sundrop-village-decor-npc-verification.md
```

Then stage the report and inspect the cached diff:

```sh
rtk git diff --cached -- docs/superpowers/reports/2026-06-30-sundrop-village-decor-npc-verification.md
```

- [ ] **Step 4: Commit the verification report**

Run:

```sh
rtk git add docs/superpowers/reports/2026-06-30-sundrop-village-decor-npc-verification.md
rtk git commit -m "docs: verify sundrop village decor npcs"
```

Expected: one commit containing only `docs/superpowers/reports/2026-06-30-sundrop-village-decor-npc-verification.md`.

- [ ] **Step 5: Final status check**

Run:

```sh
rtk git status --short --branch
```

Expected: the branch is clean after the verification report commit.
