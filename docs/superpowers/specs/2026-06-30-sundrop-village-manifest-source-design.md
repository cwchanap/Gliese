# Sundrop Village Manifest Source Design

## Summary

HPA-112 asks for authoring manifests that describe the deterministic Sundrop
Village instead of leaving room, route-scene, and decor-role knowledge embedded
inside tests and comments. The current checkout already has the right village
layout data, but the requested manifest files do not exist:

- `src/lib/game/content/maps/regions/rooms.ts`
- `src/lib/game/content/maps/regions/route-scenes.ts`
- `src/lib/game/content/maps/regions/decor-roles.ts`

This task should create those manifest modules and update the focused village
tests to consume them. It should not alter the authored `village.ts` map layout
or runtime behavior.

## Scope

Create:

- `src/lib/game/content/maps/regions/rooms.ts`
- `src/lib/game/content/maps/regions/route-scenes.ts`
- `src/lib/game/content/maps/regions/decor-roles.ts`

Modify:

- `src/lib/game/content/maps/regions/village-layout.test.ts`

Do not change `src/lib/game/content/maps/regions/village.ts`, gameplay content,
pickup placement, transitions, blockers, ground patches, decor coordinates,
NPCs, assets, systems, or Svelte files.

## Manifest Content

`rooms.ts` will export deterministic village room and corridor manifests.

The room ids will be exactly:

- `village-home-yard-room`
- `village-well-plaza-room`
- `village-market-yard-room`
- `village-north-residences-room`
- `village-shrine-garden-room`
- `village-east-gate-room`

Each room will carry the current test geometry: center point and radius. The
market room will use the HPA-112 name `market-yard` even though the current
test-local id is `market-lane`.

The corridor ids will be exactly:

- `village-home-to-plaza`
- `village-plaza-to-market`
- `village-plaza-to-north-residences`
- `village-plaza-to-shrine`
- `village-plaza-to-east-gate`
- `village-east-gate-to-crossroads-road`

Each corridor will include from/to room ids and a small route-point list drawn
from the current deterministic route samples.

`route-scenes.ts` will export a `spawn-to-crossroads` route scene with these
beat ids in order:

- `home-yard-origin`
- `well-plaza-choice`
- `east-gate-threshold`
- `crossroads-road-breadcrumb`

The route-scene beat points should match the current spawn, plaza, east-gate,
and Crossroads breadcrumb samples. Boundary ids may reference the preserved
`corridor-wall-*` dogleg because those are load-bearing outside the village
interior; they are not removed micro-hedges.

`decor-roles.ts` will export the current 17 village decor role mappings from
`village-layout.test.ts`, with role values limited to the HPA-112 role set:

- `anchor`
- `plaza-frame`
- `market-identity`
- `market-threshold`
- `field-background`
- `dead-end-frame`
- `north-threshold`
- `guild-threshold`
- `shrine-symbol`
- `hide-reward`
- `exit-threshold`
- `crossroads-breadcrumb`

## Test Updates

`village-layout.test.ts` will import the new manifests instead of defining
`villageRooms`, `villageMainRoute`, and `villageDecorRoles` locally.

The existing behavior assertions should remain:

- every named room has a ground patch, visual cue, and landmark/payoff/exit/anchor
- every `village-*` pickup stays at least 160px from the main route
- main-route samples have a visible boundary nearby
- every current `village-*` decor object has an assigned role

Add manifest hygiene assertions:

- room ids match the six HPA-112 room ids
- corridor ids match the six HPA-112 corridor ids
- `spawn-to-crossroads` beats match the four HPA-112 beat ids
- manifest ids do not reference removed `vp-*`, `vn-*`, `vw-*`, `ve-*`, or
  `vs-*` micro-hedges
- manifest ids do not reference removed ring/spoke ground-patch ids such as
  `village-lane-west-ring`, `village-lane-north-ring`, `village-lane-east-ring`,
  `village-lane-south-ring`, `village-lane-w-spoke`, `village-lane-e-spoke`, or
  `village-lane-s-spoke`

No report artifact is needed for HPA-112 because this task has an actual missing
source surface to create.

## Verification

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts src/lib/game/content/maps.test.ts
```

Also inspect `git diff` to confirm only the three manifest modules and
`village-layout.test.ts` changed.

No full gameplay or e2e test is required unless runtime map data or Svelte files
change, which is outside this design.
