# Sundrop Village Side-Pocket Rewards Verification

## Summary

HPA-111 asks for Sundrop Village rewards to teach side-room detours instead of rewarding the direct spawn-to-East-Gate route. The checked-out `src/lib/game/content/maps/regions/village.ts` already contains the requested `village-market-cache` and `village-shrine-cache` pickups, and `village-corridor-cache` is absent, so this task is verification-only.

No gameplay, content, pickup, item, coordinate, transition, blocker, ground-patch, decor, NPC, test, asset, system, or Svelte files were changed for this verification.

## Side-Pocket Rewards

| Pickup id | Current position | Item id | Quantity | Side-room lesson |
| --- | --- | --- | --- | --- |
| `village-market-cache` | `(430, 5380)` | `field-potion` | `1` | check the Market/Blacksmith Yard detour |
| `village-shrine-cache` | `(1560, 5650)` | `sunleaf-salve` | `1` | check the Shrine Garden detour |

## Removal Check

`village-corridor-cache` is absent from `src/lib/game/content/maps/regions/village.ts`, so the current village no longer rewards the exit corridor.

## Item Definitions

- `field-potion` is already defined in `src/lib/game/content/items.ts`.
- `sunleaf-salve` is already defined in `src/lib/game/content/items.ts`.

## Test Coverage

- `village-layout.test.ts` checks every `village-*` pickup is at least 160px from the main spawn-to-East-Gate route.
- `maps.test.ts` validates pickup item ids, positive quantities, stable ids, and map bounds.
- `maps.test.ts` includes pickups in gameplay-object reachability checks from spawn.
- `maps.test.ts` prevents pickups from being authored inside blocker, fence, landmark, or colliding decor solid rects.

## Acceptance Criteria Check

- Both rewards are already inside side rooms.
- Neither reward sits on the direct route from spawn to East Gate.
- The market reward teaches the player to check the Market/Blacksmith Yard.
- The shrine reward teaches the player to check the Shrine Garden.
- Relevant item ids already exist; no new items were invented.
- HPA-112 can proceed from this verified side-pocket reward baseline without reworking reward placement.

## Verification Commands

```sh
rtk sed -n '330,365p' src/lib/game/content/maps/regions/village.ts
rtk rg -n "village-corridor-cache" src/lib/game/content/maps/regions/village.ts
rtk rg -n "'field-potion'|'sunleaf-salve'" src/lib/game/content/items.ts
rtk sed -n '144,158p' src/lib/game/content/maps/regions/village-layout.test.ts
rtk sed -n '1404,1445p' src/lib/game/content/maps.test.ts
rtk sed -n '1666,1726p' src/lib/game/content/maps.test.ts
rtk sed -n '1774,1838p' src/lib/game/content/maps.test.ts
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps.test.ts
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/items.ts src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps.test.ts
```

The focused layout and map-content tests passed, and the TypeScript diff was empty.
