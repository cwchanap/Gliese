# HPA-238 — Sundrop Village controller walkthrough

> Driven through Playwright MCP against `bun run dev` (browser mode, localStorage saves) at
> commit `74f297f` + the arrival fixes recorded below. Movement was issued as held arrow-key
> bursts; position was read back by forcing a `save` HudCommand and reading the persisted
> player coords, so every position below is the game's own state, not an inference.
>
> This substitutes for a hand-played pass. It exercises routes, transitions, collision and
> save/reload faithfully. It does **not** judge feel — animation, camera, readability at
> native scale — so the subjective half of Phase 7 still wants human eyes.

## Defects found

### 1. Three interior return arrivals landed inside a padded blocker — FIXED

`WorldScene` refuses any move that would leave the player intersecting a blocker. An arrival
point that already intersects one is therefore a **hard lock**: every direction is refused.

| Interior | Old arrival | Blocked by | New arrival |
| --- | --- | --- | --- |
| `shrine-of-aurora-interior` | (1424, 5816) | south perimeter wall, row 46 (padded from y 5812) | (1464, 5788) |
| `villager-house-3` | (816, 4952) | row-19 spur wall (padded from y 4948) | (856, 4920) |
| `guild-hall` | (1616, 5080) | blacksmith, relocated into the guild ward by the v2 pass (padded from y 5075) | (1656, 5040) |

The shrine one was hit live — the player exited the shrine and could not move in any
direction, and the save then recorded that position, so the run was unrecoverable.

All three sat in standable bands too shallow to hold the conventional 40px-south arrival, so
each was offset **east** instead, keeping >30px from its door (`playerRadius` 12 +
`transitionRadius` 18) so the first step out does not re-enter.

**Why nothing caught it:** the layered contract (A1–A12) validates the village *source*, and
these arrivals live in the interior map definitions. `maps.test.ts` asserted the arrival
constants but only as hardcoded values — it never checked them against the collision rule.
Closed by a new contract, `interior return arrivals are standable`, which asserts for all 8
meadow-bound arrivals that each is standable under the real composed rule and clears its
door's trigger radius.

### 2. The shrine splits room S into halves joined by a ~4px lane — OPEN, needs a decision

`shrine-of-aurora` is 246×333px. Room `S` is 13 rows (416px). The building leaves a ~50px
standable band along the south — and its own door sits in the middle of that band.

Measured across the band (x 1280–1570, composed rule, 30px trigger radius):

```
y 5750-5762   blocked by the shrine footprint
y 5764-5806   standable, but 12-16 of 74 sample points are inside the door trigger
y 5808-5811   standable AND clear of the door   <-- the only bypass
y 5812+       blocked by the south perimeter
```

So crossing room S east↔west without being pulled into the shrine means threading a ~4px lane
hugging the perimeter wall. In practice the player always enters the shrine — reproduced
three times by the navigation controller. The shrine reward cache sits in the east half, so
the shrine loop forces this crossing.

This is a building-placement issue from the v2 spacing pass, not a v3 regression, and the
contract permits it: A11 only requires rooms be *reachable*, and A3/A10 protect the critical
route, which does not pass through S.

Fixing it means moving a building, which needs the visual gate — so it is left open. Options:
1. Move `shrine-of-aurora` north so it sits flush against the row-32 divider, widening the
   south band to ~74px (the ticket's own "buildings form the boundary rather than hedge").
2. Move the shrine door to the building's west or east face.
3. Accept it — the shrine is a dead-end detour, so being funnelled into it is arguably fine.

## Route log

Critical route `Home → Plaza → North → Guild → East Gate → Crossroads` completed, with the
last five legs recording **zero snags**.

| Leg | Result |
| --- | --- |
| Spawn (624, 5776), Home Yard | ok |
| hero-house enter / return (624, 5752) | ok |
| `H-P` gate → Well Plaza | ok |
| `M-P` gate → Market | ok |
| `village-market-cache` | reached |
| item-shop enter / return (496, 5336) | ok |
| `H-M` gate → Home Yard | ok |
| `H-S` gate → Shrine Garden | ok |
| shrine enter / return (1464, 5788) | ok after fix; all 4 directions move |
| `village-shrine-cache` | reached |
| `N-P` gate → North Residences | ok |
| villager-house-2 enter / return (1168, 4920) | ok |
| villager-house-3 enter / return (856, 4920) | ok after fix |
| `G-N` gate → Guild ward | ok |
| guild-hall enter / return (1656, 5040) | ok after fix |
| `E-G` gate → East Gate | ok |
| East Gate → Crossroads corridor | ok |

Snags recorded elsewhere were all **building walls** — the item shop's east wall, the hero
house's west wall, the shrine's west wall — which the controller routed around. No snag was
on a hedge spur or gate corner.

## Save / reload

Reloading starts a **new run at the spawn** with `canResume: true`; the saved position is
restored by the explicit Resume action, not automatically. Verified at the Well Plaza:
persisted (942, 5300) → after `resume-save`, scene at (942, 5300), exact.

## Not covered

- `villager-house-1` enter/return — the controller re-entered villager-house-3 en route.
- `P-S` gate traversal end-to-end (the route reached the Plaza via `H-P` instead).
- Save/reload individually at Home Yard, Shrine and East Gate. The mechanism was verified
  once at the Plaza and is the same code path, but the issue names four checkpoints.
- Encounters, NPC dialogue, and shop flows — covered by the Playwright e2e suite, not here.
- Subjective feel: camera, animation, spatial reveal, readability at native scale.
