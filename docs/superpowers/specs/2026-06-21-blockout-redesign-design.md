# Entry Map Hard Blockout — Redesign

> **Supersedes** the Phase 4 blockout documented in
> `docs/superpowers/reports/2026-06-21-entry-map-hard-blockout-review.md`.
> That blockout was rejected at the human gate: corridors too wide, insufficient
> winding, no maze-like quality. This spec defines the replacement approach.

**Date:** 2026-06-21
**Branch:** `feat/entry-map-enrichment`
**Prior commits kept as history:** `657ebff`, `6147944` (the rejected blockout).

## Context — why redesign

The first blockout pass added boundaries to seal "leaks" (places where a
perpendicular probe from the route centerline found no wall within 640px). It
reached 0 leaks per route and passed its own test suite. The human gate
rejected it: "still too much space and need for finer detail and maze-like road
construction."

Measurement after rejection confirmed the instinct. Corridor widths along every
route, taken by ray-casting perpendicular from each centerline sample until
hitting a solid:

| Route | Median corridor width |
|---|---|
| spawn→crossroads | 1600px |
| crossroads→coast | 1600px |
| crossroads→mistfen | 1600px |
| crossroads→silverpine | 1600px |
| crossroads→wildwood | 1600px |

1600px equals the ray cap (800px each side). On more than half of every route
there is no wall within 800px in either direction. That is a plain, not a
corridor.

The old leak detector gave false confidence due to two escape hatches:

1. The 640px budget allowed a sample to "pass" if *some* wall existed within
   640px on *one* side — the other side could be infinite open field.
2. The "in-room" exclusion carved large open swaths as rooms, so most samples
   were never tested.

The first pass produced "guardrails on a highway," not a navigational silhouette.

## Target feel

**Classic JRPG dungeon (FF/DQ interiors).** Winding but readable. Corridors
192–320px wide. Long curves between landmarks, occasional forks to optional
rewards, rare dead-ends. Low disorientation, exploration-focused. Beats
(hooks, thresholds, reveals, payoffs) remain as navigational landmarks; the
winding happens *between* them.

**Terminology — "beat".** A beat is an existing waypoint in `route-scenes.ts`
with a narrative role: `hook`, `threshold`, `reveal`, or `payoff`. These are
the landmarks the player navigates between. "Between beats" means along the
centerline segment connecting two consecutive beat waypoints. "At a beat"
means the room-sized widening that contains a beat waypoint.

## Approach — wind between beats (Hybrid C)

Keep waypoints at beat locations as anchor landmarks. Reshape the path between
beats into S-curves or doglegs. Add internal sight-line occluders within long
segments. Place chokepoint doorways at beat boundaries; widen into rooms at the
beats themselves.

Dogleg-first (right-angle turns) matches the DQ/FF dungeon reference. Occasional
S-curves on longer segments avoid monotony.

## Section 1 — Test suite redesign (replaces the broken leak detector)

Three invariants encode "winding but readable JRPG corridor":

**Invariant 1 — Corridor width cap (replaces leak detector).**
At every 32px sample along each route's centerline, cast perpendicular rays
left and right until hitting a solid. Each ray must hit within **160px** (total
corridor ≤ 320px) *unless* the sample is inside a *declared* room rect in
`rooms.ts` AND that room is linked to a beat. No heuristic — rooms are
explicitly declared and beat-linked, everything else must be a corridor.

**Invariant 2 — Sight-line occlusion.**
From any centerline sample, ray-cast forward (along travel direction). Must hit
a solid within **384px**, unless the sample is inside a declared room. Forces
internal occluders — no long straight views down a corridor. Creates the
"winding" feel during forward motion.

**Invariant 3 — Bend density.**
Walking the centerline, count significant direction changes (turn ≥30°) per
inter-beat segment. Each segment longer than 256px must have **≥1 bend**. No
straight shots between beats. Forces the S-curve/dogleg shape.

**Deferred — Pocket enclosure.** Pockets are declared per route in
`route-scenes.ts`. Test counts declarations (≥2 per route) and flood-fills each
pocket center to confirm it doesn't leak into open field without crossing the
corridor. This invariant can land alongside Phase 6 reward placement rather
than blocking the blockout.

**What this replaces:** the old leak detector and its 5 per-route goal tests are
deleted. The all-solids connectivity safety net and shortcut-closure test in
`maps.test.ts` stay — they remain valid.

## Section 2 — Geometry strategy

**Repeating pattern per inter-beat segment:**

```
[Beat A room] → doorway (128-160px gap) → winding corridor (160px/side) → doorway → [Beat B room]
                        ↑                          ↑
                   chokepoint              ≥1 bend + internal occluder
```

**Winding shape.** Dogleg-first (right-angle turns); occasional S-curves on
longer segments. The centerline gets new vertices between existing beat
waypoints — beats stay as anchors, travel between them winds.

**Existing boundaries.** Most are torn down and rebuilt at ~160px from the
centerline. The first pass placed them ~640px out (hence 1600px corridors).
Thematic materials (village hedges, coast driftwood/fences, mistfen reeds,
silverpine stonework, wildwood brush) are reused, just repositioned closer in.
Biome identity is preserved; cavernous spacing is not.

**Loophole rooms corrected.** The three threshold rooms declared to pass the old
leak detector (`village-east-exit-room`, `mistfen-crossroads-exit-room`,
`wildwood-approach-room`) were width-cap evasion, not genuine beat locations.
Under the new spec, rooms must map to actual beats. Those three are
re-evaluated: kept only if they correspond to a real beat in `route-scenes.ts`;
otherwise deleted and replaced with proper corridors.

**Route-specific flavor:**
- **spawn→crossroads:** shortest; 1–2 doglegs; hedges hug tight
- **crossroads→coast:** the ferry/tidepool fork becomes a real branch with a pocket
- **crossroads→mistfen:** the two pools serve as natural occluders; toxic-bloom reveal is the dramatic room
- **crossroads→silverpine:** switchbacks are thematically correct — lean into zigzag climb
- **crossroads→wildwood:** longest, densest; most pockets and false branches; most work (was 40 leaks)

## Section 3 — Scope and sequencing

**Pilot first, validate, then roll out.** The pilot proves three things before
committing to the rest: the new 3-invariant test suite catches what it should;
the wind-between-beats geometry produces the target feel; the tear-down →
rebuild → verify workflow works end-to-end.

**Pilot route: `crossroads-to-silverpine`.** Medium length. Switchbacks are
thematically expected on a ceremonial climb, so success isn't fighting the
biome. Clear beat structure (threshold → lower shrine → lantern hook →
offering grove → terrace reveal) exercises the full room-doorway-corridor
pattern. If it reads as a tight zigzag dungeon-stair, the approach generalizes.

**Rollout order, each with a human checkpoint (diagram + in-game look):**
1. `silverpine` (pilot) → human confirms
2. `mistfen` (reuse pool-occluder pattern)
3. `coast` (introduces the fork-pocket pattern)
4. `wildwood` (longest/densest; apply all lessons)
5. `spawn-to-crossroads` (shortest; final cleanup)

**Handling existing work:**
- Checkpoint commits stand as history — no revert
- Old leak detector + 5 goal tests in `soft-maze.test.ts` deleted and replaced
- Connectivity safety net + shortcut-closure test stay
- Phase 4 review report marked superseded (this doc does that)
- Existing boundaries torn down and rebuilt during each route's turn

## Section 4 — Concrete spec, data model, files

**Geometry numbers:**

| Element | Spec |
|---|---|
| Room (at a beat) | 256–384px wide; must link to a declared beat in `route-scenes.ts` |
| Doorway | 128–160px gap in a wall, at every room ↔ corridor transition |
| Corridor | ≤320px total (160px per side from centerline) |
| Bend | ≥30° turn; ≥1 per 256px of inter-beat travel; dogleg preferred |
| Occluder | internal wall placing a solid within 384px of every forward ray-cast |
| Pocket (deferred to Phase 6 prep) | dead-end spur ≥160px off centerline; ≥2 per route; enclosed |

**Data model changes (kills the loophole class permanently):**
- `rooms.ts`: every room declares `beatId` it contains. No `beatId` → not a room → not exempt from width cap. Makes "is it a room?" ungameable.
- `route-scenes.ts`: add `pockets: Array<{id, x, y, w, h}>` per route so the pocket count + enclosure test has concrete data.

**Files touched (per route, in rollout order):**
- `src/lib/game/content/maps/regions/route-scenes.ts` — add bend vertices between beats; add pockets array
- `src/lib/game/content/maps/regions/rooms.ts` — rework to beat-linked; delete the 3 loophole rooms
- `src/lib/game/content/maps/regions/{silverpine,mistfen,coast,wildwood,village}.ts` — tear down old boundaries, rebuild closer + occluders + doorways
- `src/lib/game/content/maps/regions/soft-maze.test.ts` — delete leak detector + 5 goal tests; add 3 invariants + pocket enclosure check
- `src/lib/game/content/maps.test.ts` — update `criticalRoutes` if a centerline changes
- `src/lib/game/content/maps/regions/blockout-diagram.test.ts` — keep; enhance to render pockets
- `docs/superpowers/reports/2026-06-21-entry-map-hard-blockout-review.md` — mark superseded at top

**Risks watched per route:**
- Centerline changes can break e2e at `(4960, 960)` (wildwood combat pocket) and `villager-house-3` arrival at `(2592, 5024)` — re-verify per route
- Width cap and bend interact (inside of a tight turn can violate width) — tests run after geometry is built and will catch this; corner reliefs are carved explicitly rather than loosening the global cap
- Connectivity safety net must still pass after each route's rework

## Acceptance criteria

The redesign is complete when:
1. All three invariants pass on all five routes (corridor width ≤320px outside declared beat-rooms; forward sightline occluded within 384px; ≥1 bend per 256px of inter-beat segment).
2. Pocket declarations meet ≥2 per route and pass enclosure checks (deferred invariant; may land with Phase 6).
3. Connectivity safety net and shortcut-closure tests still pass.
4. e2e suite passes (12 tests); wildwood combat pocket and `villager-house-3` arrival positions verified intact.
5. Generated SVG diagrams visually show winding corridors with occluders (human confirms).
6. Human gate approves at least the pilot route's silhouette before rollout continues.

## Out of scope

- Phase 5 (prop-role pass) — gated on this redesign's approval, separate spec.
- Phase 6 (reward pass) — gated on Phase 5, separate spec. Pocket declarations land now so Phase 6 has containers to fill.
- New gameplay systems, NPCs, decorative scatter beyond what's needed for occlusion/doorways.
