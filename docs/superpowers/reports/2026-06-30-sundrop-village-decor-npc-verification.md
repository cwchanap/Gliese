# Sundrop Village Decor And NPC Verification

## Summary

HPA-110 asks for Sundrop Village to replace mixed decor and NPC filler with a smaller role-based set for the six named village spaces. The checked-out `src/lib/game/content/maps/regions/village.ts` already contains the requested 17 decor objects and four route-guiding ambient NPCs, while `src/lib/game/content/maps/regions/village-layout.test.ts` already assigns roles to every village decor object, so this task is verification-only.

No gameplay, content, decor, NPC, coordinate, transition, blocker, ground-patch, test, asset, system, or Svelte files were changed for this verification.

## Role-Based Decor

| Decor id | Current role | Motif |
| --- | --- | --- |
| `village-plaza-fountain` | `anchor` | well/plaza anchor |
| `village-hanging-lantern` | `plaza-frame` | plaza frame |
| `village-plaza-flowers-west` | `plaza-frame` | plaza frame |
| `village-plaza-flowers-east` | `plaza-frame` | plaza frame |
| `village-market-stall` | `market-identity` | market identity |
| `village-market-banner` | `market-threshold` | market threshold |
| `village-field-scarecrow` | `field-background` | field background |
| `village-blacksmith-topiary` | `dead-end-frame` | blacksmith side frame |
| `village-north-lantern-west` | `north-threshold` | north residence threshold |
| `village-north-lantern-east` | `guild-threshold` | guild threshold |
| `village-shrine-offering` | `shrine-symbol` | shrine symbol |
| `village-stone-lantern` | `shrine-symbol` | shrine symbol |
| `village-shrine-maple` | `hide-reward` | shrine reward concealment |
| `village-gate-arch` | `exit-threshold` | east-gate threshold |
| `village-gate-lantern-a` | `exit-threshold` | east-gate threshold |
| `village-gate-lantern-b` | `exit-threshold` | east-gate threshold |
| `village-corridor-waymarker` | `crossroads-breadcrumb` | Crossroads route breadcrumb |

## Route-Guiding Ambient NPCs

| NPC id | Current position | Frame | Route meaning |
| --- | --- | --- | --- |
| `village-wanderer` | `(1140, 5000)` | `travelerNpc` | near Well Plaza |
| `village-woodcutter` | `(560, 5260)` | `woodcutterNpc` | near Market/Blacksmith side |
| `village-pilgrim` | `(1100, 5780)` | `pilgrimNpc` | near Shrine Garden |
| `village-crier` | `(1540, 4620)` | `crierNpc` | near East Gate |

## Test Coverage

- `village-layout.test.ts` assigns all 17 village decor ids a role through `villageDecorRoles`.
- `village-layout.test.ts` rejects any `village-*` decor object without an assigned role.
- `maps.test.ts` includes ambient NPCs in spawn reachability proximity checks.
- `maps.test.ts` validates every ambient NPC frame and map bounds.
- `maps.test.ts` prevents ambient NPCs from being authored inside solid rects.

## Acceptance Criteria Check

- No village decor object lacks a role.
- The well/plaza remains the main visual anchor.
- Market, shrine, and gate each have distinct motifs.
- NPCs already guide route meaning near the well plaza, market/blacksmith side, shrine garden, and east gate.
- HPA-111 can proceed from this verified reduced decor/NPC baseline without reworking decor or ambient NPC placement.

## Verification Commands

```sh
rtk sed -n '90,345p' src/lib/game/content/maps/regions/village.ts
rtk sed -n '34,52p' src/lib/game/content/maps/regions/village-layout.test.ts
rtk sed -n '193,205p' src/lib/game/content/maps/regions/village-layout.test.ts
rtk sed -n '1700,1845p' src/lib/game/content/maps.test.ts
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps.test.ts
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps.test.ts
```

The focused layout and map-content tests passed, and the TypeScript diff was empty.
