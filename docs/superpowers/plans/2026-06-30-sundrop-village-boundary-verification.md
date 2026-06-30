# Sundrop Village Boundary Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the HPA-109 verification report proving the checked-out Sundrop Village blockers already use place-named boundaries instead of the old technical micro-hedge grid.

**Architecture:** Treat `src/lib/game/content/maps/regions/village.ts` as the authored blocker source of truth and the existing village layout/soft-maze tests as the readability and reachability guards. The implementation creates one Markdown report with boundary-group evidence and does not change game content, tests, assets, systems, or Svelte files.

**Tech Stack:** Markdown documentation, TypeScript map content for source inspection, bun/vitest for the existing focused layout and soft-maze tests.

---

## File Structure

- Create: `docs/superpowers/reports/2026-06-30-sundrop-village-boundary-verification.md`
  - Responsibility: HPA-109 verification artifact with current place-named boundary evidence.
- Read-only reference: `src/lib/game/content/maps/regions/village.ts`
  - Responsibility: authored Sundrop Village blocker ids, coordinates, dimensions, and comments.
- Read-only reference: `src/lib/game/content/maps/regions/village-layout.test.ts`
  - Responsibility: existing visible-boundary and six-space readability guard.
- Read-only reference: `src/lib/game/content/maps/regions/soft-maze.test.ts`
  - Responsibility: existing compact hamlet lane width and transition reachability guard.

## Task 1: Reconfirm HPA-109 Boundary Evidence

**Files:**
- Read: `src/lib/game/content/maps/regions/village.ts`
- Read: `src/lib/game/content/maps/regions/village-layout.test.ts`
- Read: `src/lib/game/content/maps/regions/soft-maze.test.ts`

- [ ] **Step 1: Confirm the workspace is clean**

Run:

```sh
rtk git status --short --branch
```

Expected: the branch may be ahead of origin, but no staged or unstaged files are listed before the report is created.

- [ ] **Step 2: Inspect current blocker definitions**

Run:

```sh
rtk sed -n '545,850p' src/lib/game/content/maps/regions/village.ts
```

Expected place-named boundary evidence:

- global meadow boundaries: `meadow-north-boundary`, `meadow-south-boundary`, `meadow-west-boundary`, `meadow-east-boundary`
- village outer boundary with northeast gate open: `village-outer-north-west`, `village-outer-north-east`, `village-outer-west`, `village-outer-south`, `village-outer-east-lower`
- home yard fences: `village-home-yard-west-fence`, `village-home-yard-east-fence`, `village-home-yard-south-fence`
- plaza frame hedges: `village-plaza-nw-hedge`, `village-plaza-ne-hedge`, `village-plaza-west-hedge`, `village-plaza-east-hedge`
- market/blacksmith lane boundaries: `village-market-lane-north-wall`, `village-market-lane-south-wall`, `village-blacksmith-yard-south-wall`
- north residence lane boundaries: `village-north-lane-north-wall`, `village-north-lane-south-wall-west`, `village-north-lane-south-wall-east`
- guild/east-gate bend boundaries: `village-guild-forecourt-east-wall`, `village-east-bend-west-wall`, `village-east-bend-east-wall`
- gate-road walls: `village-gate-road-north-wall`, `village-gate-road-south-wall`
- shrine/hidden-pocket boundaries: `village-shrine-garden-west-wall`, `village-shrine-garden-south-wall`, `village-hidden-pocket-east-wall`, `village-hidden-pocket-north-wall`
- preserved load-bearing Crossroads dogleg: `corridor-wall-2a` through `corridor-wall-10b`

- [ ] **Step 3: Confirm old technical blocker ids are absent**

Run:

```sh
rtk rg -n "id: '(vp-|vn-|vw-|ve-|vs-)" src/lib/game/content/maps/regions/village.ts
rtk rg -n "junction[- ]?nose|junction.*nose|id: '.*nose" src/lib/game/content/maps/regions/village.ts
```

Expected: no output from either command, with `rg` exit code `1` for each command because none of the old technical blocker ids or junction-nose ids are present.

- [ ] **Step 4: Inspect the existing visible-boundary layout guard**

Run:

```sh
rtk sed -n '150,205p' src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected evidence:

- `solids` includes blockers, fences, landmarks, and colliding decor while ignoring ground patches
- `has a visible boundary within 320px at each main-route sample` checks visible boundary proximity along the main route
- the test keeps route readability tied to actual solids instead of ground-patch textures

- [ ] **Step 5: Inspect compact hamlet reachability coverage**

Run:

```sh
rtk sed -n '130,210p' src/lib/game/content/maps/regions/soft-maze.test.ts
```

Expected evidence:

- `villageRoomBounds` includes the open room spaces around the plaza, home yard, blacksmith yard, north courtyard, guild forecourt, shrine garden, hidden pocket, and gate road
- `villageLanes` traces the home-to-plaza, plaza-to-market, and plaza-to-shrine connecting lanes
- tests cover village lane width outside rooms and every building transition reachable from the plaza

## Task 2: Create The Verification Report

**Files:**
- Create: `docs/superpowers/reports/2026-06-30-sundrop-village-boundary-verification.md`

- [ ] **Step 1: Add the report**

Create `docs/superpowers/reports/2026-06-30-sundrop-village-boundary-verification.md` with exactly this content:

```md
# Sundrop Village Boundary Verification

## Summary

HPA-109 asks for Sundrop Village to replace the older technical micro-hedge blocker grid with fewer, larger, place-named boundaries. The checked-out `src/lib/game/content/maps/regions/village.ts` already uses place-named boundary groups, and the old `vp-*`, `vn-*`, `vw-*`, `ve-*`, `vs-*`, and junction-nose ids are absent, so this task is verification-only.

No gameplay, content, blocker, coordinate, transition, ground-patch, decor, NPC, test, asset, system, or Svelte files were changed for this verification.

## Place-Named Boundary Groups

| Boundary group | Current ids in `village.ts` | Status |
| --- | --- | --- |
| Global meadow boundaries | `meadow-north-boundary`, `meadow-south-boundary`, `meadow-west-boundary`, `meadow-east-boundary` | Present |
| Village outer boundary with northeast gate open | `village-outer-north-west`, `village-outer-north-east`, `village-outer-west`, `village-outer-south`, `village-outer-east-lower` | Present |
| Home yard fences | `village-home-yard-west-fence`, `village-home-yard-east-fence`, `village-home-yard-south-fence` | Present |
| Plaza frame hedges with intentional openings | `village-plaza-nw-hedge`, `village-plaza-ne-hedge`, `village-plaza-west-hedge`, `village-plaza-east-hedge` | Present |
| Market and blacksmith lane boundaries | `village-market-lane-north-wall`, `village-market-lane-south-wall`, `village-blacksmith-yard-south-wall` | Present |
| North residence lane boundaries | `village-north-lane-north-wall`, `village-north-lane-south-wall-west`, `village-north-lane-south-wall-east` | Present |
| Guild/east-gate bend boundaries | `village-guild-forecourt-east-wall`, `village-east-bend-west-wall`, `village-east-bend-east-wall` | Present |
| Gate-road north/south walls | `village-gate-road-north-wall`, `village-gate-road-south-wall` | Present |
| Shrine garden and hidden-pocket boundaries | `village-shrine-garden-west-wall`, `village-shrine-garden-south-wall`, `village-hidden-pocket-east-wall`, `village-hidden-pocket-north-wall` | Present |
| Preserved Crossroads dogleg | `corridor-wall-2a` through `corridor-wall-10b` | Present and intentionally load-bearing outside the village interior |

## Removed Technical Blocker Ids

The following HPA-109 technical blocker families are absent from `src/lib/game/content/maps/regions/village.ts`:

- `vp-*`
- `vn-*`
- `vw-*`
- `ve-*`
- `vs-*`
- junction-nose blockers

## Acceptance Criteria Check

- The village uses place-named boundaries instead of hedge-grid fragments.
- Navigation from spawn to building transitions and East Gate remains covered by existing focused layout and compact hamlet reachability tests.
- The visible-boundary test keeps the main route readable without depending on ground-patch texture paths.
- The preserved `corridor-wall-*` dogleg is outside the village interior and remains intentionally load-bearing for the village-to-Crossroads route.
- HPA-110 can proceed from this verified place-named boundary baseline without reworking blockers.

## Verification Commands

```sh
rtk sed -n '545,850p' src/lib/game/content/maps/regions/village.ts
rtk rg -n "id: '(vp-|vn-|vw-|ve-|vs-)" src/lib/game/content/maps/regions/village.ts
rtk rg -n "junction[- ]?nose|junction.*nose|id: '.*nose" src/lib/game/content/maps/regions/village.ts
rtk sed -n '150,205p' src/lib/game/content/maps/regions/village-layout.test.ts
rtk sed -n '130,210p' src/lib/game/content/maps/regions/soft-maze.test.ts
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts
```

The old-id searches returned no matches, the focused layout and soft-maze tests passed, and the TypeScript diff was empty.
```

- [ ] **Step 2: Confirm only the report was added**

Run:

```sh
rtk git status --short
```

Expected:

```text
one untracked path for docs/superpowers/reports/2026-06-30-sundrop-village-boundary-verification.md
```

## Task 3: Verify And Commit

**Files:**
- Verify: `docs/superpowers/reports/2026-06-30-sundrop-village-boundary-verification.md`

- [ ] **Step 1: Run the focused layout and soft-maze tests**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts
```

Expected: PASS with `2 passed` test files and `13 passed` tests.

- [ ] **Step 2: Confirm the implementation is report-only**

Run:

```sh
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts
```

Expected: no output.

- [ ] **Step 3: Inspect the report diff**

Run:

```sh
rtk git diff -- docs/superpowers/reports/2026-06-30-sundrop-village-boundary-verification.md
```

Expected: the diff only adds the Markdown report from Task 2.

If the report is still untracked and the command prints no output, inspect it directly with:

```sh
rtk sed -n '1,220p' docs/superpowers/reports/2026-06-30-sundrop-village-boundary-verification.md
```

Then stage the report and inspect the cached diff:

```sh
rtk git diff --cached -- docs/superpowers/reports/2026-06-30-sundrop-village-boundary-verification.md
```

- [ ] **Step 4: Commit the verification report**

Run:

```sh
rtk git add docs/superpowers/reports/2026-06-30-sundrop-village-boundary-verification.md
rtk git commit -m "docs: verify sundrop village boundaries"
```

Expected: one commit containing only `docs/superpowers/reports/2026-06-30-sundrop-village-boundary-verification.md`.

- [ ] **Step 5: Final status check**

Run:

```sh
rtk git status --short --branch
```

Expected: the branch is clean after the verification report commit.
