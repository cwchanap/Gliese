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
