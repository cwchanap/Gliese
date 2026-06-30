# Sundrop Village Boundary Verification Design

## Summary

HPA-109 asks to replace Sundrop Village's old technical micro-hedge blocker grid
with fewer, larger, place-named boundaries. The current checked-out `village.ts`
already uses place-named village boundary groups, and the old `vp-*`, `vn-*`,
`vw-*`, `ve-*`, `vs-*`, and junction-nose blocker ids are absent, so this task
should be handled as verification rather than another blocker/layout edit.

Create a standalone report proving the current boundary layout satisfies HPA-109
before moving to the next HPA-105 child task.

## Scope

Create `docs/superpowers/reports/2026-06-30-sundrop-village-boundary-verification.md`.

Review `src/lib/game/content/maps/regions/village.ts`, the existing
`src/lib/game/content/maps/regions/village-layout.test.ts`, and the compact hamlet
reachability coverage in `src/lib/game/content/maps/regions/soft-maze.test.ts`.

Do not change gameplay content, blocker ids, blocker coordinates, blocker
dimensions, transitions, ground patches, decor, NPCs, tests, systems, assets, or
Svelte files.

## Report Content

The report will include two evidence sections:

- a table of current place-named boundary groups in `village.ts`, covering global
  meadow boundaries, village outer boundaries, home yard fences, plaza frame
  hedges, market/blacksmith boundaries, north lane boundaries, guild/east bend
  boundaries, gate-road walls, shrine/hidden-pocket boundaries, and the preserved
  load-bearing Crossroads dogleg
- a removal check for the old technical blocker ids named in HPA-109, showing
  that `vp-*`, `vn-*`, `vw-*`, `ve-*`, `vs-*`, and junction-nose ids are absent
  from the current source

Every evidence row should match the current source. If an old technical blocker
id is still present during implementation, stop and treat that as a blocker
instead of editing layout data under this verification task.

The report will also state:

- the current village already uses place-named boundaries instead of hedge-grid
  fragments
- navigation from spawn to building transitions and East Gate remains covered by
  existing focused layout and compact hamlet reachability tests
- the preserved `corridor-wall-*` dogleg is outside the village interior and is
  intentionally kept as the load-bearing village-to-Crossroads route
- no layout/content files were modified
- HPA-110 can proceed from this verified place-named boundary baseline

## Verification

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts
```

Also inspect `git diff` to confirm the implementation is report-only.

No full gameplay or e2e test is required unless a non-report file changes, which
is outside this design.
