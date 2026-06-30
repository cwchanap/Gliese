# Sundrop Village Ground Patch Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the HPA-108 verification report proving the checked-out Sundrop Village ground patches already use the requested room-and-lane layout instead of the old ring/spoke layout.

**Architecture:** Treat `src/lib/game/content/maps/regions/village.ts` as the authored ground-patch source of truth and the existing village layout tests as the readability/reachability guard. The implementation creates one Markdown report with evidence tables and does not change game content, tests, assets, systems, or Svelte files.

**Tech Stack:** Markdown documentation, TypeScript map content for source inspection, bun/vitest for the existing focused layout test.

---

## File Structure

- Create: `docs/superpowers/reports/2026-06-30-sundrop-village-ground-patch-verification.md`
  - Responsibility: HPA-108 verification artifact with requested vs. current ground-patch evidence.
- Read-only reference: `src/lib/game/content/maps/regions/village.ts`
  - Responsibility: authored Sundrop Village ground-patch ids, coordinates, dimensions, and tiles.
- Read-only reference: `src/lib/game/content/maps/regions/village-layout.test.ts`
  - Responsibility: existing six-space readability guard.
- Read-only reference: `src/lib/game/content/maps/regions/soft-maze.test.ts`
  - Responsibility: existing compact hamlet lane width and transition reachability guard.

## Task 1: Reconfirm HPA-108 Ground-Patch Evidence

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

- [ ] **Step 2: Inspect current ground-patch definitions**

Run:

```sh
rtk sed -n '416,545p' src/lib/game/content/maps/regions/village.ts
```

Expected room-and-lane ground-patch evidence:

- `village-home-yard` is `(700, 5585)`, `420x180`, `pathTile`
- `village-south-lane` is `(780, 5390)`, `120x380`, `pathTile`
- `sundrop-plaza-stone` is `(1000, 5160)`, `500x420`, `plazaStoneTile`
- `village-market-lane` is `(650, 5045)`, `560x120`, `pathTile`
- `village-blacksmith-yard` is `(400, 5280)`, `360x300`, `pathTile`
- `village-north-lane` is `(1050, 4860)`, `860x120`, `pathTile`
- `village-north-courtyard` is `(1120, 4690)`, `620x200`, `pathTile`
- `village-guild-forecourt` is `(1460, 5040)`, `360x180`, `plazaStoneTile`
- `village-east-bend` is `(1500, 4760)`, `140x420`, `pathTile`
- `village-gate-road` is `(1760, 4440)`, `520x120`, `pathTile`
- `village-shrine-path` is `(1100, 5420)`, `120x440`, `pathTile`
- `village-shrine-garden` is `(1200, 5660)`, `520x320`, `autumnLeafTile`
- `village-hidden-offering-pocket` is `(1520, 5620)`, `300x260`, `autumnLeafTile`

- [ ] **Step 3: Confirm old ring/spoke patch ids are absent**

Run:

```sh
rtk rg -n "village-lane-west-ring|village-lane-north-ring|village-lane-east-ring|village-lane-south-ring|village-lane-w-spoke|village-lane-e-spoke|village-lane-s-spoke|village-lane-blacksmith-spur|village-lane-itemshop-spur|village-lane-vh2-spur|village-lane-exit-corridor" src/lib/game/content/maps/regions/village.ts
```

Expected: no output, with `rg` exit code `1` because none of the old patch ids are present.

- [ ] **Step 4: Inspect the existing six-space layout guard**

Run:

```sh
rtk sed -n '1,220p' src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected evidence:

- `villageRooms` includes `home-yard`, `well-plaza`, `market-lane`, `north-residences`, `shrine-garden`, and `east-gate`
- `villageMainRoute` runs from the home yard through the plaza and east gate toward Crossroads
- side-reward and decor-role assertions are already present

- [ ] **Step 5: Inspect compact hamlet reachability coverage**

Run:

```sh
rtk sed -n '130,210p' src/lib/game/content/maps/regions/soft-maze.test.ts
```

Expected evidence:

- `villageRoomBounds` includes the open room spaces around the plaza, home yard, blacksmith yard, north courtyard, guild forecourt, shrine garden, hidden pocket, and gate road
- `villageLanes` traces the home-to-plaza, plaza-to-market, and plaza-to-shrine connecting lanes
- tests cover village lane width outside rooms and transition reachability from the plaza

## Task 2: Create The Verification Report

**Files:**
- Create: `docs/superpowers/reports/2026-06-30-sundrop-village-ground-patch-verification.md`

- [ ] **Step 1: Add the report**

Create `docs/superpowers/reports/2026-06-30-sundrop-village-ground-patch-verification.md` with exactly this content:

```md
# Sundrop Village Ground Patch Verification

## Summary

HPA-108 asks for Sundrop Village to replace the older ring/spoke ground-patch layout with deterministic room-and-lane patches. The checked-out `src/lib/game/content/maps/regions/village.ts` already contains the requested room-and-lane patch list, and the old ring/spoke patch ids are absent, so this task is verification-only.

No gameplay, content, ground-patch, coordinate, transition, blocker, decor, NPC, test, asset, system, or Svelte files were changed for this verification.

## Room-And-Lane Ground Patches

| Patch id | Requested position | Requested size | Current `village.ts` | Tile | Status |
| --- | --- | --- | --- | --- | --- |
| `village-home-yard` | `(700, 5585)` | `420x180` | `(700, 5585)`, `420x180` | `pathTile` | Match |
| `village-south-lane` | `(780, 5390)` | `120x380` | `(780, 5390)`, `120x380` | `pathTile` | Match |
| `sundrop-plaza-stone` | `(1000, 5160)` | `500x420` | `(1000, 5160)`, `500x420` | `plazaStoneTile` | Match |
| `village-market-lane` | `(650, 5045)` | `560x120` | `(650, 5045)`, `560x120` | `pathTile` | Match |
| `village-blacksmith-yard` | `(400, 5280)` | `360x300` | `(400, 5280)`, `360x300` | `pathTile` | Match |
| `village-north-lane` | `(1050, 4860)` | `860x120` | `(1050, 4860)`, `860x120` | `pathTile` | Match |
| `village-north-courtyard` | `(1120, 4690)` | `620x200` | `(1120, 4690)`, `620x200` | `pathTile` | Match |
| `village-guild-forecourt` | `(1460, 5040)` | `360x180` | `(1460, 5040)`, `360x180` | `plazaStoneTile` | Match |
| `village-east-bend` | `(1500, 4760)` | `140x420` | `(1500, 4760)`, `140x420` | `pathTile` | Match |
| `village-gate-road` | `(1760, 4440)` | `520x120` | `(1760, 4440)`, `520x120` | `pathTile` | Match |
| `village-shrine-path` | `(1100, 5420)` | `120x440` | `(1100, 5420)`, `120x440` | `pathTile` | Match |
| `village-shrine-garden` | `(1200, 5660)` | `520x320` | `(1200, 5660)`, `520x320` | `autumnLeafTile` | Match |
| `village-hidden-offering-pocket` | `(1520, 5620)` | `300x260` | `(1520, 5620)`, `300x260` | `autumnLeafTile` | Match |

## Removed Ring/Spoke Patch Ids

The following HPA-108 ring/spoke patch ids are absent from `src/lib/game/content/maps/regions/village.ts`:

- `village-lane-west-ring`
- `village-lane-north-ring`
- `village-lane-east-ring`
- `village-lane-south-ring`
- `village-lane-w-spoke`
- `village-lane-e-spoke`
- `village-lane-s-spoke`
- `village-lane-blacksmith-spur`
- `village-lane-itemshop-spur`
- `village-lane-vh2-spur`
- `village-lane-exit-corridor`

## Acceptance Criteria Check

- The village no longer uses a square ring road ground-patch structure.
- The main player route already reads as `Home Yard -> Well Plaza -> East Gate`.
- Market, north residences/guild, and shrine garden remain side choices.
- Spawn and all village transitions remain covered by existing focused layout and compact hamlet reachability tests.
- HPA-109 can proceed from this verified room-and-lane ground-patch baseline without reworking ground patches.

## Verification Commands

```sh
rtk sed -n '416,545p' src/lib/game/content/maps/regions/village.ts
rtk rg -n "village-lane-west-ring|village-lane-north-ring|village-lane-east-ring|village-lane-south-ring|village-lane-w-spoke|village-lane-e-spoke|village-lane-s-spoke|village-lane-blacksmith-spur|village-lane-itemshop-spur|village-lane-vh2-spur|village-lane-exit-corridor" src/lib/game/content/maps/regions/village.ts
rtk sed -n '1,220p' src/lib/game/content/maps/regions/village-layout.test.ts
rtk sed -n '130,210p' src/lib/game/content/maps/regions/soft-maze.test.ts
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts
```

The old-id search returned no matches, the targeted layout test passed, and the TypeScript diff was empty.
```

- [ ] **Step 2: Confirm only the report was added**

Run:

```sh
rtk git status --short
```

Expected:

```text
one untracked path for docs/superpowers/reports/2026-06-30-sundrop-village-ground-patch-verification.md
```

## Task 3: Verify And Commit

**Files:**
- Verify: `docs/superpowers/reports/2026-06-30-sundrop-village-ground-patch-verification.md`

- [ ] **Step 1: Run the targeted layout test**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected: PASS with `1 passed` test file and `10 passed` tests.

- [ ] **Step 2: Confirm the implementation is report-only**

Run:

```sh
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts
```

Expected: no output.

- [ ] **Step 3: Inspect the report diff**

Run:

```sh
rtk git diff -- docs/superpowers/reports/2026-06-30-sundrop-village-ground-patch-verification.md
```

Expected: the diff only adds the Markdown report from Task 2.

- [ ] **Step 4: Commit the verification report**

Run:

```sh
rtk git add docs/superpowers/reports/2026-06-30-sundrop-village-ground-patch-verification.md
rtk git commit -m "docs: verify sundrop village ground patches"
```

Expected: one commit containing only `docs/superpowers/reports/2026-06-30-sundrop-village-ground-patch-verification.md`.

- [ ] **Step 5: Final status check**

Run:

```sh
rtk git status --short --branch
```

Expected: the branch is clean after the verification report commit.
