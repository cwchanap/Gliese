# Sundrop Village Layout Tests Design

## Summary

HPA-113 asks for focused tests that lock the deterministic six-space Sundrop
Village layout and prevent regressions to hedge-grid or random-prop authoring.
The current checkout already contains `src/lib/game/content/maps/regions/village-layout.test.ts`,
and HPA-112 moved its room, route, and decor constants into authoring manifests.

Most of HPA-113 is already covered by the current test suite:

- named-room structure is checked through `villageRooms`
- side rewards are checked against `villageMainRoute`
- route samples are checked for nearby boundaries
- random `village-*` decor fails unless it has a role

The remaining gap is HPA-113 Test 3 as written: the test file checks removed
micro-hedge ids in authoring manifests, but it does not directly assert that
runtime `map.blockers` avoid the old `vp-*`, `vn-*`, `vw-*`, `ve-*`, and
`vs-*` blocker prefixes.

## Scope

Modify:

- `src/lib/game/content/maps/regions/village-layout.test.ts`

Do not change:

- `src/lib/game/content/maps/regions/village.ts`
- `src/lib/game/content/maps/regions/rooms.ts`
- `src/lib/game/content/maps/regions/route-scenes.ts`
- `src/lib/game/content/maps/regions/decor-roles.ts`
- broader map tests, gameplay content, assets, systems, Svelte files, or e2e
  tests

## Test Design

Add one runtime blocker assertion to the existing `village deterministic layout`
suite.

The assertion should inspect `map.blockers ?? []` and fail if any blocker id
starts with one of the removed technical micro-hedge prefixes:

- `vp-`
- `vn-`
- `vw-`
- `ve-`
- `vs-`

The check should live near the existing authoring-manifest hygiene test or in a
small dedicated section such as `describe('no old micro-hedges', ...)`. Keeping
it in `village-layout.test.ts` is important because HPA-113 is specifically
about the focused deterministic village layout suite.

The check should not forbid preserved `corridor-wall-*` ids. Those blockers are
the load-bearing gate-to-Crossroads dogleg documented in `village.ts` and
referenced by the HPA-112 route-scene manifest; they are not the old
village-interior micro-hedges.

## Existing Coverage To Preserve

Do not rewrite the HPA-112 manifest structure back to local constants. Keep the
current imports from:

- `./decor-roles`
- `./rooms`
- `./route-scenes`

Preserve the existing tests that cover:

- HPA-112 room, corridor, route-scene beat, and decor-role manifest ids
- every room having a ground patch, visual cue, and landmark/payoff/exit/anchor
- every `village-*` pickup staying at least 160px off the main route
- main-route samples having visible boundary support
- every `village-*` decor object having a role

## Verification

Run the focused HPA-113 test:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
```

Then run the broader focused map suite used by the surrounding Sundrop tasks:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts src/lib/game/content/maps.test.ts
```

Inspect the diff to confirm the implementation is test-only and does not touch
runtime map data.
