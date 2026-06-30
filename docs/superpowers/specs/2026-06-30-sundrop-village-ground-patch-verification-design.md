# Sundrop Village Ground Patch Verification Design

## Summary

HPA-108 asks to replace the old Sundrop Village ring/spoke ground-patch layout with
a deterministic room-and-lane layout. The current checked-out `village.ts` already
matches the requested room patch list from Linear, and the old ring/spoke patch ids
are absent, so this task should be handled as verification rather than another
layout edit.

Create a standalone report proving the current ground-patch layout satisfies HPA-108
before moving to the next HPA-105 child task.

## Scope

Create `docs/superpowers/reports/2026-06-30-sundrop-village-ground-patch-verification.md`.

Review `src/lib/game/content/maps/regions/village.ts`, the existing
`src/lib/game/content/maps/regions/village-layout.test.ts`, and the compact hamlet
coverage in `src/lib/game/content/maps/regions/soft-maze.test.ts`.

Do not change gameplay content, ground-patch ids, coordinates, dimensions, tiles,
transitions, blockers, decor, NPCs, tests, systems, assets, or Svelte files.

## Report Content

The report will include two evidence sections:

- a table of the 13 room-and-lane ground patches requested by HPA-108, showing
  the current `village.ts` id, coordinate, size, and tile for each patch
- a removal check for the old ring/spoke ids named in HPA-108, showing that they
  are absent from the current source

Every requested room-and-lane row should match the current source. If any row does
not match during implementation, stop and treat that as a blocker instead of
editing layout data under this verification task.

The report will also state:

- the current village already reads as `Home Yard -> Well Plaza -> East Gate`
- market, north residences/guild, and shrine garden are side choices
- spawn and all village transitions remain covered by existing reachability tests
- no layout/content files were modified
- HPA-109 can proceed from this verified room-and-lane ground-patch baseline

## Verification

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
```

Also inspect `git diff` to confirm the implementation is report-only.

No full gameplay or e2e test is required unless a non-report file changes, which
is outside this design.
