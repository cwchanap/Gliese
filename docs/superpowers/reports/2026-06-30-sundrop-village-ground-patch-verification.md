# Sundrop Village Ground Patch Verification

## Summary

HPA-108 asks for Sundrop Village to replace the older ring/spoke ground-patch layout with deterministic room-and-lane patches. The checked-out `src/lib/game/content/maps/regions/village.ts` already contains the requested room-and-lane patch list, and the old ring/spoke patch ids are absent, so this task is verification-only.

No gameplay, content, ground-patch, coordinate, transition, blocker, decor, NPC, test, asset, system, or Svelte files were changed for this verification.

## Room-And-Lane Ground Patches

| Patch id | Requested position | Requested size | Current `village.ts` | Tile | Status |
| --- | --- | --- | --- | --- | --- |
| `village-home-yard` | `(700, 5585)` | `420x180` | `(700, 5585)`, `420x180` | `pathTile` | Match |
| `village-south-lane` | `(780, 5390)` | `120x380` | `(780, 5390)`, `120x380` | `pathTile` | Match |
| `sundrop-plaza-stone` | `(1000, 5160)` | `500x420` | `(1000, 5160)`, `500x420` | `plazaStoneTile` | Match |
| `village-market-lane` | `(650, 5045)` | `560x120` | `(650, 5045)`, `560x120` | `pathTile` | Match |
| `village-blacksmith-yard` | `(400, 5280)` | `360x300` | `(400, 5280)`, `360x300` | `pathTile` | Match |
| `village-north-lane` | `(1050, 4860)` | `860x120` | `(1050, 4860)`, `860x120` | `pathTile` | Match |
| `village-north-courtyard` | `(1120, 4690)` | `620x200` | `(1120, 4690)`, `620x200` | `pathTile` | Match |
| `village-guild-forecourt` | `(1460, 5040)` | `360x180` | `(1460, 5040)`, `360x180` | `plazaStoneTile` | Match |
| `village-east-bend` | `(1500, 4760)` | `140x420` | `(1500, 4760)`, `140x420` | `pathTile` | Match |
| `village-gate-road` | `(1760, 4440)` | `520x120` | `(1760, 4440)`, `520x120` | `pathTile` | Match |
| `village-shrine-path` | `(1100, 5420)` | `120x440` | `(1100, 5420)`, `120x440` | `pathTile` | Match |
| `village-shrine-garden` | `(1200, 5660)` | `520x320` | `(1200, 5660)`, `520x320` | `autumnLeafTile` | Match |
| `village-hidden-offering-pocket` | `(1520, 5620)` | `300x260` | `(1520, 5620)`, `300x260` | `autumnLeafTile` | Match |

## Removed Ring/Spoke Patch Ids

The following HPA-108 ring/spoke patch ids are absent from `src/lib/game/content/maps/regions/village.ts`:

- `village-lane-west-ring`
- `village-lane-north-ring`
- `village-lane-east-ring`
- `village-lane-south-ring`
- `village-lane-w-spoke`
- `village-lane-e-spoke`
- `village-lane-s-spoke`
- `village-lane-blacksmith-spur`
- `village-lane-itemshop-spur`
- `village-lane-vh2-spur`
- `village-lane-exit-corridor`

## Acceptance Criteria Check

- The village no longer uses a square ring road ground-patch structure.
- The main player route already reads as `Home Yard -> Well Plaza -> East Gate`.
- Market, north residences/guild, and shrine garden remain side choices.
- Spawn and all village transitions remain covered by existing focused layout and compact hamlet reachability tests.
- HPA-109 can proceed from this verified room-and-lane ground-patch baseline without reworking ground patches.

## Verification Commands

```sh
rtk sed -n '416,545p' src/lib/game/content/maps/regions/village.ts
rtk rg -n "village-lane-west-ring|village-lane-north-ring|village-lane-east-ring|village-lane-south-ring|village-lane-w-spoke|village-lane-e-spoke|village-lane-s-spoke|village-lane-blacksmith-spur|village-lane-itemshop-spur|village-lane-vh2-spur|village-lane-exit-corridor" src/lib/game/content/maps/regions/village.ts
rtk sed -n '1,220p' src/lib/game/content/maps/regions/village-layout.test.ts
rtk sed -n '130,210p' src/lib/game/content/maps/regions/soft-maze.test.ts
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts
```

The old-id search returned no matches, the targeted layout test passed, and the TypeScript diff was empty.
