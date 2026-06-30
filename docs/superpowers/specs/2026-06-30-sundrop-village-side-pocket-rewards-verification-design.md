# Sundrop Village Side-Pocket Rewards Verification Design

## Summary

HPA-111 asks to move Sundrop Village exploration rewards out of the direct
spawn-to-East-Gate route and into side pockets that teach the player to inspect
the Market/Blacksmith Yard and Shrine Garden. The current checked-out
`village.ts` already contains the requested side-pocket reward ids and
coordinates, and `village-corridor-cache` is absent, so this task should be
handled as verification rather than another reward-placement edit.

Create a standalone report proving the current reward placement satisfies
HPA-111 before moving to the next HPA-105 child task.

## Scope

Create `docs/superpowers/reports/2026-06-30-sundrop-village-side-pocket-rewards-verification.md`.

Review `src/lib/game/content/maps/regions/village.ts`,
`src/lib/game/content/items.ts`, the existing side-reward coverage in
`src/lib/game/content/maps/regions/village-layout.test.ts`, and map-level pickup
validation in `src/lib/game/content/maps.test.ts`.

Do not change gameplay content, pickup ids, pickup coordinates, item ids,
quantities, transitions, blockers, ground patches, decor, NPCs, tests, systems,
assets, or Svelte files.

## Report Content

The report will include three evidence sections:

- a reward-placement table showing `village-market-cache` at `(430, 5380)` with
  `field-potion` quantity `1`, and `village-shrine-cache` at `(1560, 5650)` with
  `sunleaf-salve` quantity `1`
- a removal check showing `village-corridor-cache` is absent from the current
  village source
- a validation-coverage note showing existing tests keep village rewards off the
  main route, require real item ids and positive quantities, keep pickups
  reachable from spawn, and prevent pickups from being authored inside solid
  rects

Every evidence row should match the current source. If either side-pocket reward
is missing, any coordinate/item/quantity differs from HPA-111, or
`village-corridor-cache` appears during implementation, stop and treat that as a
blocker instead of editing content under this verification task.

The report will also state:

- both rewards are already inside side rooms
- neither reward sits on the direct spawn-to-East-Gate route
- the market reward teaches the Market/Blacksmith Yard detour
- the shrine reward teaches the Shrine Garden detour
- `field-potion` and `sunleaf-salve` already exist in `items.ts`
- no layout/content/test files were modified
- HPA-112 can proceed from this verified side-pocket reward baseline

## Verification

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps.test.ts
```

Also inspect `git diff` for `src/lib/game/content/maps/regions/village.ts`,
`src/lib/game/content/items.ts`,
`src/lib/game/content/maps/regions/village-layout.test.ts`, and
`src/lib/game/content/maps.test.ts` to confirm the implementation is report-only.

No full gameplay or e2e test is required unless a non-report file changes, which
is outside this design.
