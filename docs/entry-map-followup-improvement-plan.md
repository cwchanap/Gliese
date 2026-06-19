# Entry Map Follow-up Improvement Plan

## Purpose

This plan is for the next agent pass on PR #10, `feat: entry-map exploration enrichment`.

The current PR adds useful exploration infrastructure: `MapDiscovery`, localized lore/warning text, `seenDiscoveries`, area-map discovery pins, and a few extra pickups/decor objects. That is good foundation work.

However, the visible spatial experience is still too subtle. The next pass should focus on **camera-scale exploration design**, not more architecture. The player should immediately feel stronger curiosity, route choice, and payoff while walking the world.

The target is not “more objects everywhere.” The target is:

> The player repeatedly thinks: “What is that? Can I go there? What is over there?”

---

## Goal for the Next Revision

When walking these five routes, the map should feel meaningfully different from before:

1. Spawn → Crossroads
2. Crossroads → Coast
3. Crossroads → Mistfen
4. Crossroads → Silverpine
5. Crossroads → Wildwood

Each route should have:

- at least one visible approach clue before the destination
- at least one optional branch, side pocket, or route choice
- at least one payoff that is not placed directly on the main road
- no long “just walking through grass/path” segment
- stronger camera-scale visual composition

---

# Phase 0 — Stop Expanding Systems for Now

Do **not** add more engine/UI abstractions until the map itself feels better.

## Tasks

- [ ] Do not add new save fields, HUD states, marker types, or discovery systems in this pass.
- [ ] Keep `MapDiscovery` as-is unless there is a clear bug.
- [ ] Reduce overlapping planning docs. Keep one execution plan and the audit/playtest reports.
- [ ] Move duplicate/background docs out of the main execution path, or clearly mark them as background.
- [ ] Fill in `docs/superpowers/reports/2026-06-17-entry-map-playtest.md`; it should no longer say pending.

## Acceptance Criteria

- [ ] The playtest report has real findings for all five routes.
- [ ] Future agents have one obvious source of truth.
- [ ] No new engine scope is introduced in this phase.

---

# Phase 1 — Fix the Tests So They Catch Empty Routes

The current route-interest test is too weak if it only checks whether **any** sample point along a route is near interest. A long route can pass because one endpoint is near a landmark.

Replace the helper with a stricter version.

## Option A: Every Sample Must Be Near Interest

```ts
function everySampleHasInterest(
  a: Pt,
  b: Pt,
  points: Pt[],
  stepPx: number,
  radius: number
): boolean {
  return segmentSamples(a, b, stepPx).every((sample) =>
    points.some((point) => Math.hypot(point.x - sample.x, point.y - sample.y) <= radius)
  );
}
```

## Option B: Enforce Maximum Empty Gap

```ts
function maxEmptyGapAlongSegment(
  a: Pt,
  b: Pt,
  points: Pt[],
  stepPx: number,
  radius: number
): number {
  let currentGap = 0;
  let maxGap = 0;

  for (const sample of segmentSamples(a, b, stepPx)) {
    const hasNearbyInterest = points.some(
      (point) => Math.hypot(point.x - sample.x, point.y - sample.y) <= radius
    );

    if (hasNearbyInterest) {
      currentGap = 0;
    } else {
      currentGap += stepPx;
      maxGap = Math.max(maxGap, currentGap);
    }
  }

  return maxGap;
}
```

Recommended rule:

```ts
expect(maxEmptyGapAlongSegment(a, b, points, 256, 650)).toBeLessThanOrEqual(700);
```

## Improve `interestPoints`

Include:

- landmarks
- pickups
- NPCs / ambient NPCs
- encounters
- discoveries
- future-gate blockers
- important decor IDs from `regionDesignManifest`, because visual breadcrumbs matter even if they are not interactive

## Acceptance Criteria

- [ ] If `village-waymarker` is removed, the Spawn → Crossroads test fails.
- [ ] If `wildwood-staging-brush` is removed, the Crossroads → Wildwood test fails.
- [ ] If `crossroads-cache` is removed, the Crossroads payoff test fails.
- [ ] Failure messages name the route and approximate empty point.

---

# Phase 2 — Make Visible Spatial Changes Route by Route

## 2.1 Spawn → Crossroads: Make the First Journey Feel Authored

Current issue: the route has a new pickup/decor, but it still mostly reads as the same connector path.

## Tasks

- [ ] Add a small **roadside rest-stop** between village and Crossroads.
- [ ] Make it visible from the main path, not hidden off-screen.
- [ ] Use a ground patch that bulges off the road.
- [ ] Place the reward at the back of the side nook, not directly on the road.
- [ ] Add a second breadcrumb closer to Crossroads so the route does not feel like “one object, then empty walk.”

Suggested structure:

```txt
village path
   →
roadside lantern / flowers
   ↘
    small side nook + pickup
   →
crossroads approach breadcrumb
   →
crossroads
```

Suggested coordinate zones:

```txt
main breadcrumb: around (2700, 4700)
side nook: around (2980, 4820)
crossroads approach breadcrumb: around (3200, 4450)
```

Possible content:

- `poleLantern`
- `flowerBed`
- `marketStall` remnant, if visually appropriate
- `travelerNpc`
- `field-potion` or `sunleaf-salve`

## Acceptance Criteria

- [ ] The side nook is visible from the main path.
- [ ] The player must make a small detour to get the payoff.
- [ ] The route has no long empty segment under the stricter route-interest test.

---

## 2.2 Crossroads: Make It Read as a Real Hub

Current issue: Crossroads has a payoff now, but it still needs stronger directional language. It should teach the player how the world is organized.

## Tasks

- [ ] Make the waystone visually central to route decisions.
- [ ] Add directional cues around the hub:
  - Coast direction: sand, net, driftwood, or foam clue.
  - Mistfen direction: reeds, fog, toxic bloom, or dead-tree clue.
  - Silverpine direction: lantern, shrine, autumn leaf, or stone clue.
  - Wildwood direction: brush, trees, or darker forest-floor clue.
- [ ] Make the market-stall side nook visible and optional.
- [ ] Strengthen Castle Gate as a sequence:
  - festival banner / lantern
  - white-line warning discovery
  - sealed castle gate

## Acceptance Criteria

- [ ] Standing in Crossroads, the player can visually infer at least three outgoing directions.
- [ ] The market-stall nook is a real optional space, not just a pickup near a stall.
- [ ] Castle Gate feels like a future destination, not a random blocker.

---

## 2.3 Crossroads → Coast: Create an Actual Fork

Current issue: Coast has nice props, but the approach is too linear. It should become a small exploration triangle.

## Target Layout

```txt
crossroads
   ↓
coast approach
   ↙       ↘
ferry shrine   beach / tidepool
      ↘       ↙
          jetty
```

## Tasks

- [ ] Add a visible west fork from the coast approach toward the ferry shrine.
- [ ] Add ground patches so the fork is readable, not just walkable grass.
- [ ] Move or tune `ferry-shrine-lore` so the player can interact with it from the front of the shrine.
- [ ] Keep the tidepool reward as an east/shoreline detour.
- [ ] Make the jetty dead-end feel intentional:
  - foam/driftwood leading toward it
  - discovery at the end
  - pickup slightly off the planks or at the edge

Suggested coordinate zones:

```txt
fork start: around (4200, 5500)
ferry shrine route: toward (3600, 5720)
shore/tidepool route: toward (5300, 5820) / (5400, 6040)
jetty end: around (4900, 6180)
```

## Acceptance Criteria

- [ ] Coast has three distinct nodes: ferry shrine, tidepool reward, jetty.
- [ ] The player chooses shrine-first or shore-first before reaching the beach.
- [ ] The jetty has both scenic value and a payoff.

---

## 2.4 Mistfen: Make Sparse Feel Intentional, Not Under-Authored

Current issue: Mistfen has atmosphere but not enough readable exploration shape.

## Target Layout

```txt
marsh entrance
   →
fog / reeds
   ↘
    east-pool side pocket + reward
   ↗
toxic bloom trail
   →
witchwood warning
   →
sealed gate
```

## Tasks

- [ ] Use reeds, dead trees, marsh rocks, pools, and toxic blooms to create a soft S-curve path.
- [ ] Make `mistfen-cache` feel hidden in a side pocket, not randomly placed.
- [ ] Move the forager near the region entrance or along the safe approach so they act as a clue.
- [ ] Add fog density near the Witchwood Gate.
- [ ] Make the gate buildup visible:
  - toxic bloom trail
  - dead tree / reeds
  - warning discovery
  - gate

## Acceptance Criteria

- [ ] Mistfen has a clear main route and a clear optional side pocket.
- [ ] The gate is foreshadowed before arrival.
- [ ] The region remains quiet but not empty.

---

## 2.5 Silverpine: Make It Feel Like a Ceremonial Climb

Current issue: Silverpine has good shrine ingredients, but it needs stronger vertical progression.

## Tasks

- [ ] Add or tune ground patches so the connection from Crossroads to the shrine path is visually continuous.
- [ ] Create a lantern cadence:
  - lower approach
  - mid-climb
  - terrace entrance
- [ ] Add an offering/side grove nook.
- [ ] Place `silverpine-offering-cache` in that nook, not on the direct path.
- [ ] Reposition `silverpine-pilgrim` so they face or imply movement toward the shrine/gate.
- [ ] Make the final terrace wider and calmer than the approach, so the gate reveal feels earned.

Suggested structure:

```txt
lower shrine path
   →
lantern cadence
   ↘
    offering side grove + reward
   ↗
terrace
   →
sealed shrine gate
```

## Acceptance Criteria

- [ ] The route visually reads as an ascent.
- [ ] There is a distinct side grove or offering nook.
- [ ] The shrine gate is visible as a destination before it blocks progress.

---

## 2.6 Wildwood: Add Danger Pacing and a True Side Pocket

Current issue: Wildwood has combat but still feels like a long linear corridor.

## Tasks

- [ ] Add a danger staging area before the first combat pocket.
- [ ] Add a visible side pocket near the grove.
- [ ] Put `wildwood-grove-cache` behind brush/tree cover in that pocket.
- [ ] Add visual danger cues before combat:
  - darker forest floor
  - dense brush
  - broken sign
  - claw-mark warning discovery
  - canopy narrowing
- [ ] Make the cave approach escalate visually.
- [ ] Do not change existing slime IDs, combat bounds, or ruins transition requirements.

Suggested structure:

```txt
forest approach
   →
safe staging clue
   ↘
    side pocket + hidden reward
   ↗
combat pockets
   →
cave warning
   →
whispering cave / ruins gate
```

## Acceptance Criteria

- [ ] Player sees danger before combat starts.
- [ ] Wildwood has an optional reward that is spatially off the main route.
- [ ] Cave approach is more ominous than lower Wildwood.

---

# Phase 3 — Improve Discovery Marker Presentation

Current issue: pulsing circles for every discovery can feel like UI noise, especially if multiple are visible at once.

## Option A: Nearby-Only Marker

- [ ] Render or reveal marker only when the player is within ~180px.
- [ ] Keep the discovery object itself visible through decor/landmark composition.

## Option B: Subtle Object Affordance

- [ ] Keep marker very low alpha.
- [ ] Avoid strong pulsing.
- [ ] Use marker only to highlight small/ambiguous objects.

## Option C: No World Marker for Obvious Landmarks

- [ ] Major landmarks like Ferry Shrine, Castle Gate, Witchwood Gate, and Shrine Gate do not need pulsing markers.
- [ ] Small signs or hidden lore objects can keep markers.

## Acceptance Criteria

- [ ] Normal camera view does not show multiple pulsing circles at once.
- [ ] Discoveries remain findable.
- [ ] The map feels like a world, not a checklist.

---

# Phase 4 — Manual Playtest With Evidence

Update:

`docs/superpowers/reports/2026-06-17-entry-map-playtest.md`

For each route, fill this template:

```md
## Route: Crossroads → Coast

Screenshots / capture:

Time to first visible hook:
Time to first route choice:
Time to first payoff:
Longest empty-feeling walk:
Confusing collision:
Objects that looked interactive but were not:
Objects that were interactive but visually unclear:
Patch applied:
```

Required evidence:

- [ ] screenshot or short capture for Spawn → Crossroads
- [ ] screenshot or short capture for Crossroads → Coast
- [ ] screenshot or short capture for Crossroads → Wildwood
- [ ] notes for Mistfen
- [ ] notes for Silverpine

## Acceptance Criteria

- [ ] The playtest report is no longer pending.
- [ ] It names the three weakest remaining areas.
- [ ] The three weakest areas are either patched or explicitly deferred with a reason.

---

# Phase 5 — Final Validation Before Merge

Do not call the PR complete until all are true:

- [ ] Stricter route-interest tests pass.
- [ ] Every intentional dead end has a non-landmark payoff or discovery.
- [ ] Crossroads has hub payoff and directional language.
- [ ] Coast has a visible fork and three-node structure.
- [ ] Mistfen has an eerie main path plus side pocket.
- [ ] Silverpine has a ceremonial climb plus side grove.
- [ ] Wildwood has danger staging plus side reward.
- [ ] Discovery markers do not visually spam the world.
- [ ] Playtest report has real route observations and evidence.
- [ ] Full validation passes:

```bash
bun run test:unit -- --run
bun run check
bun run lint
bun run test:e2e
```

---

# Final Instruction to the Agent

Do not treat this as a prop scatter pass.

The map should create a loop of:

```txt
visible hook → route choice → payoff → next hook
```

The PR already added enough supporting mechanics. The next revision needs forks, side pockets, approach sequences, stronger landmarks, and less empty connector walking.
