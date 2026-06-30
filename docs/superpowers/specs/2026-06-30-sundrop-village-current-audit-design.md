# Sundrop Village Current Audit Design

## Summary

Create a current-state audit for HPA-106 that documents the checked-out Sundrop Village layout before any further relayout work. The audit will treat the current source as truth, not the older HPA-105 starting assumption.

## Scope

Create `docs/superpowers/reports/2026-06-21-sundrop-village-current-audit.md`.

Review `src/lib/game/content/maps/regions/village.ts` and nearby layout guard tests. Do not change gameplay content, coordinates, pickups, blockers, decor, NPCs, transitions, systems, or assets in this task.

Only update comments in `village.ts` if a final pass finds wording that contradicts the current deterministic six-space village.

## Audit Content

The report will document what to keep from the current checkout:

- compact southwest Sundrop cluster
- player spawn near Hero House
- well/plaza as the central anchor
- shop and blacksmith west of the plaza
- residences and guild approach north/east of the plaza
- Shrine Garden southeast of the plaza
- East Gate leading toward Crossroads
- side-pocket reward placement
- place-named boundaries that replaced technical micro-hedges

The report will also document what has already been removed or replaced:

- old `vp-*`, `vn-*`, `vw-*`, `ve-*`, and `vs-*` micro-hedges
- ring/spoke ground-patch names
- main-corridor reward placement
- decor without an explicit room role, as guarded by the current village layout test

Finally, it will call out follow-up caution areas for later HPA-105 child tasks:

- preserve the intentional `corridor-wall-*` dogleg only as the load-bearing village-to-crossroads route
- avoid reintroducing hedge-grid clutter under new names
- keep rewards off the main route
- make screenshots read as `Home Yard -> Well Plaza -> side spaces -> East Gate`

## Verification

Because this task only creates a Markdown audit report, verification is:

- inspect `git diff` for report-only changes
- if `village.ts` comments are changed, run `bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts`
- no full gameplay test is required unless layout data changes, which is outside this design
