# Sundrop Village Coordinate Verification Design

## Summary

HPA-107 asks for deterministic landmark and exterior transition coordinates in Sundrop Village. The current checked-out `village.ts` already matches the coordinates listed in Linear, so this task should be handled as verification rather than another layout edit.

Create a standalone report proving the current coordinates satisfy HPA-107 before moving to HPA-108.

## Scope

Create `docs/superpowers/reports/2026-06-30-sundrop-village-coordinate-verification.md`.

Review `src/lib/game/content/maps/regions/village.ts` and the existing `src/lib/game/content/maps/regions/village-layout.test.ts`.

Do not change gameplay content, coordinates, transitions, target map IDs, blockers, decor, NPCs, tests, systems, assets, or Svelte files.

## Report Content

The report will include two evidence tables:

- landmark coordinates requested by HPA-107 vs. current `village.ts`
- exterior transition coordinates requested by HPA-107 vs. current `village.ts`

Every row should show a match. If any row does not match during implementation, stop and treat that as a blocker instead of editing layout data under this verification task.

The report will also state:

- all existing interior target map IDs remain unchanged
- no layout/content files were modified
- the building arrangement already reads as home at bottom, well center, market/blacksmith west, residences/guild north/east, shrine southeast, and east gate toward the world
- HPA-108 can proceed from this verified coordinate baseline

## Verification

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
```

Also inspect `git diff` to confirm the implementation is report-only.

No full gameplay or e2e test is required unless a non-report file changes, which is outside this design.
