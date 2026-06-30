# Sundrop Village Coordinate Verification

## Summary

HPA-107 asks for the Sundrop Village landmarks and exterior transition points to use the deterministic six-space layout coordinates. The checked-out `src/lib/game/content/maps/regions/village.ts` already matches the requested coordinates, so this task is verification-only.

No gameplay, content, coordinate, transition, layout, test, asset, system, or Svelte files were changed for this verification.

## Landmark Coordinates

| Landmark | Requested | Current `village.ts` | Status |
| --- | --- | --- | --- |
| Hero House | `(700, 5430)` | `(700, 5430)` | Match |
| Item Shop | `(520, 4960)` | `(520, 4960)` | Match |
| Blacksmith | `(380, 5260)` | `(380, 5260)` | Match |
| Villager House 1 | `(870, 4720)` | `(870, 4720)` | Match |
| Villager House 2 | `(1180, 4660)` | `(1180, 4660)` | Match |
| Guild Hall | `(1460, 4900)` | `(1460, 4900)` | Match |
| Sundrop Well | `(1000, 5160)` | `(1000, 5160)` | Match |
| Shrine of Aurora | `(1180, 5560)` | `(1180, 5560)` | Match |
| Villager House 3 | `(1520, 5380)` | `(1520, 5380)` | Match |

## Exterior Transition Coordinates

| Transition | Target map | Requested | Current `village.ts` | Status |
| --- | --- | --- | --- | --- |
| Hero House | `hero-house` | `(700, 5555)` | `(700, 5555)` | Match |
| Item Shop | `item-shop` | `(520, 5080)` | `(520, 5080)` | Match |
| Villager House 1 | `villager-house-1` | `(870, 4825)` | `(870, 4825)` | Match |
| Villager House 2 | `villager-house-2` | `(1180, 4795)` | `(1180, 4795)` | Match |
| Guild Hall | `guild-hall` | `(1460, 5040)` | `(1460, 5040)` | Match |
| Shrine | `shrine-of-aurora-interior` | `(1180, 5728)` | `(1180, 5728)` | Match |
| Villager House 3 | `villager-house-3` | `(1520, 5548)` | `(1520, 5548)` | Match |

## Acceptance Criteria Check

- All existing interior target map IDs remain unchanged.
- All requested landmark coordinates match the current source.
- All requested exterior transition coordinates match the current source.
- The village arrangement already reads as home at bottom, well center, market/blacksmith west, residences/guild north/east, shrine southeast, and east gate toward the world.
- HPA-108 can proceed from this verified coordinate baseline without re-moving buildings or entrances.

## Verification Commands

```sh
rtk sed -n '1,120p' src/lib/game/content/maps/regions/village.ts
rtk sed -n '350,430p' src/lib/game/content/maps/regions/village.ts
rtk sed -n '1,220p' src/lib/game/content/maps/regions/village-layout.test.ts
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/village-layout.test.ts
```

The targeted layout test passed, and the TypeScript diff was empty.
