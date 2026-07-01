# Sundrop Village Soft-Maze And Map Tests Design

## Summary

HPA-114 asks for broader map and soft-maze tests to follow the deterministic
Sundrop Village layout rather than preserving the old hedge-grid. The current
checkout already passes the focused HPA-114 verification command:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts src/lib/game/content/maps.test.ts
```

The remaining issue is not a runtime reachability failure. It is test-authoring
drift: `soft-maze.test.ts` still carries local village room and lane fixtures
with pre-manifest names, even though HPA-112 introduced `rooms.ts` and
`route-scenes.ts` as the new authoring manifest surface.

This task should be a test-only update that makes the broader soft-maze tests
consume the new village manifest names and adds an explicit assertion for the
two side-pocket reward ids requested by HPA-114.

## Scope

Modify:

- `src/lib/game/content/maps/regions/soft-maze.test.ts`
- `src/lib/game/content/maps/regions/village-layout.test.ts`

Verify but do not modify:

- `src/lib/game/content/maps.test.ts`
- `src/lib/game/content/maps/regions/rooms.ts`
- `src/lib/game/content/maps/regions/route-scenes.ts`
- `src/lib/game/content/maps/regions/decor-roles.ts`
- `src/lib/game/content/maps/regions/village.ts`

Do not change gameplay map data, blockers, transitions, pickups, decor, NPCs,
assets, systems, Svelte files, or e2e tests.

## Soft-Maze Test Design

`soft-maze.test.ts` should import the HPA-112 village room and corridor
manifests from `./rooms`.

The local village room skip bounds should be derived from `villageRooms` so the
test reports the HPA-112 ids:

- `village-home-yard-room`
- `village-well-plaza-room`
- `village-market-yard-room`
- `village-north-residences-room`
- `village-shrine-garden-room`
- `village-east-gate-room`

The soft-maze width test can still use rectangular skip bounds, but the ids
should come from the manifest rather than local pre-manifest names. If the
implementation needs rectangular bounds rather than circular radii, keep a small
local size map keyed by `VillageRoomId` and combine it with each manifest room's
center. This preserves current geometric behavior while making the names follow
the deterministic manifest.

The local village lane segment list should be replaced with segments derived
from `villageCorridors`. Only the short village-interior corridors should be
used for the soft-maze width invariant:

- `village-home-to-plaza`
- `village-plaza-to-market`
- `village-plaza-to-shrine`

Do not include the preserved gate-to-Crossroads dogleg in this width test. That
dogleg uses `corridor-wall-*` ids by design and is validated by broader
connectivity and route tests.

The existing transition reachability test in `soft-maze.test.ts` should remain.
It already validates village interior transitions against the real obstacle
field and should not be weakened.

## Village Layout Test Design

`village-layout.test.ts` already verifies every `village-*` pickup is at least
160px off the main route. Add one explicit side-pocket id assertion before that
distance check so HPA-114 cannot pass with a renamed or removed side reward:

- `village-market-cache`
- `village-shrine-cache`

The distance test should continue to use the existing `villageMainRoute`
manifest and should not hard-code old ring/spoke ids.

## Map Test Design

`maps.test.ts` should remain verification-only unless implementation discovers a
real failing assertion. Current map validity tests already cover:

- spawn-to-transition reachability through blockers
- full-obstacle reachability for gameplay objects
- stable pickup ids and valid item ids
- absence of unrelated map data regressions

No `maps.test.ts` patch is planned.

## Removed Id Guard

After implementation, the likely affected test/manifests should not reference
removed ring/spoke ids except inside explicit banned-id sets, and should not
reference old `vp-*`, `vn-*`, `vw-*`, `ve-*`, or `vs-*` micro-hedge blocker ids.

The preserved `corridor-wall-*` ids are allowed. They describe the load-bearing
gate-to-Crossroads dogleg, not the old village-interior hedge grid.

## Verification

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts src/lib/game/content/maps.test.ts
```

Also inspect:

```sh
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/rooms.ts src/lib/game/content/maps/regions/route-scenes.ts src/lib/game/content/maps/regions/decor-roles.ts src/lib/game/content/maps.test.ts
```

Expected: no runtime map, manifest, or `maps.test.ts` diff unless a real failure
is found and documented during implementation.
