# Meadow Entry organic baked-scenery correction design

**Date:** 2026-08-17

**Status:** Approved with world-canonical overlap correction at `2026-08-18T04:34:41Z`

**Amends:** `2026-08-13-meadow-entry-painted-pilot-enrichment-handoff-design.md`

## Decision

The rejected Task 8 visual gate combines source-art, composition, and visual-ownership defects. It
is not a camera, crop-geometry, collision, route, or gameplay-runtime defect. The final background
will continue to bake hedge, tree-wall, and forest-bank scenery into the existing two base textures.
It will not add runtime planes or move gameplay geometry.

Every visible blocker row in the sealed ten-row Meadow scenery inventory is corrected, not only the
Wildwood row that failed most visibly. The two runtime crops, crop geometry, collision, routes,
transitions, and save behavior remain frozen. Runtime visual ownership changes only by assigning all
ten already-baked blocker source IDs to their existing owner crops; no runtime plane or descriptor is
added.

The two runtime crops intentionally overlap so a `1920x1080` camera remains covered while crossing
between Sundrop and Crossroads. That coverage overlap is retained. It is not an art-authoring
boundary and must never cause two independently decorated versions of the same world coordinate.
The user rejected the first seven-donor candidate because scenery was baked into overlapping source
panels before assembly, which made different trees and ground transitions compete in the same world
area. That candidate and its approval state are superseded.

## Rejected evidence

The rejected Task 8 captures contain more than one defect owner. They must not be treated as seven
equivalent insert failures:

| Capture | Verified cause | This amendment |
| --- | --- | --- |
| Hero House frontage | live outer-boundary tree strips; no intersection with any sealed scenery row or insert | out of scope; remains a separate blocking visual issue |
| Connector village mouth | the sealed `coast-crossroads-mouth-bank` hedge intersects the right edge; unrelated live sources may also be visible | correct and suppress the sealed hedge only |
| Connector Crossroads mouth | sealed hedge contribution plus unrelated live fence strips | correct and suppress the sealed hedge only; fence issue remains separate |
| Wildwood forest lane | sealed `wildwood-forest-lane-west-bank` contribution plus unsuppressed live blocker visual | fully in scope |
| Silverpine tree wall | current visual passed, but only one of six baked wall sources is suppressed | regression gate for the corrected ownership table |

The current Hero House and connector captures therefore remain rejection evidence, but a successful
seven-insert correction cannot by itself make Hero House pass or remove an unrelated live fence.
Those out-of-inventory defects require a separate owning-source amendment before the overall branch
can receive final visual approval.

The correction must remove all of the following from normal painted-mode views:

- repeated live-looking tree or hedge sprites;
- straight inserted bars or source rectangles;
- regular stamp cadence;
- hard forest-to-ground material boundaries;
- duplicate obstacles caused by a baked image and a visible fallback sprite representing the same
  sealed scenery source.

## Ownership

Gameplay remains authoritative:

- blocker rectangles continue to own collision;
- live actors, pickups, discoveries, doors, transitions, landmarks, and other stateful content stay
  live;
- the painted package owns only presentation;
- existing fallback visuals remain available when a painted crop is unavailable;
- the generated visual-owner table is extended through the existing runtime generator so all ten
  sealed scenery source IDs are suppressed for their exact owner crops while those crops are healthy.

This is the only runtime-ownership amendment. Missing-texture and render-fault paths must restore
each affected live blocker independently. Unrelated blockers, decor, fences, and outer-boundary
visuals keep their current ownership.

The art may make an existing blocker legible. It may not imply a new blocker, door, pickup,
interaction, or route. Correct art to geometry; never move geometry to accommodate generated pixels.

## Source-art strategy

All seven package-owned hedge/woodland insert sources are superseded with fresh, distinct built-in
image-generation calls. Together they cover every one of the ten sealed blocker rows:

- two region-correct hedge rows;
- six Silverpine tree-wall rows;
- two Wildwood forest-bank rows.

Each call uses the accepted painted source panel and adjacent final terrain as composition/style
references. No control SVG, binary mask, rectangle atlas, blocker overlay, debug capture, or rejected
runtime screenshot is supplied to the model. The prompt asks for one continuous top-down regional
surface with natural obstacle scenery, varied silhouette and depth, and no paths, buildings, props,
labels, landmarks, tile sprites, repeated rows, or rectangular framing.

The generated insert remains a full contextual donor canvas. It is not copied wholesale into the
master and never becomes a runtime texture. Raw output, normalized output, prompt, reference hashes,
attempt history, transform, and native-detail verdict remain approval-bound provenance.

Generation is bounded to five attempts per insert. A failed call does not justify a mask, geometry,
runtime, or acceptance-policy change.

## Organic two-zone bake

The replacement composes an apron around the current bake; it does not replace the current mask or
topology pipeline. The five retained `6400x6400` rasters remain `otherProtected`, `groundAllowed`,
`sceneryAllowed`, `hedgeAllowed`, and `woodlandAllowed`. Apron eligibility, distance, weight, and
hashes are scratch data and are discarded after composition.

Source panels are immutable inputs to ordinary panel assembly. The base/detail priority stack,
pair correction, and feathering first produce one canonical `6400x6400` pre-scenery master. Core and
apron scenery are then evaluated and composited exactly once in world coordinates onto that master.
No raw or normalized source panel receives a scenery mutation, and no overlap area is decorated once
per source owner.

For each eligible world pixel, donor candidates are gathered from every intersecting sealed insert.
Exactly one candidate wins by `(weight desc, ownerPriority desc, insertId asc)`. The winner samples
its donor in insert-local coordinates, but its owner-relative tone is computed against the canonical
pre-scenery master pixel at that world coordinate. A world pixel may receive at most one final
scenery contribution across core and apron. Core remains higher authority than apron.

### Collision core

`coreAllowed` is the existing exact-blocker `sceneryAllowed` mask, unchanged. Its class masks,
`15px` inward Chebyshev inset distance, q40/q80 organic weight, class detail caps (`32` for hedge,
`48` for woodland), sparse-core shaping, tree-continuity shaping, priority stack, row metrics, and
provenance all remain authoritative and unchanged.

In the parent notation:

```text
coreAllowed = cropUnion & selectedBlockers & !otherProtected & !building & !transition
              & !rewardDiscovery & !semanticAnchor & !routeCore

coreEdgeWeight(p) = smoothstep255(min(insetDistance8(coreClass, p), 15), 15)
coreWeight(p) = halfUp(coreEdgeWeight(p) * organicWeight(p) / 255)
```

Topology shaping consumes only `coreWeight`. The exact blocker footprint remains the only place
where the donor may contribute solid trunks, dense roots, dark canopy interiors, or other
high-contrast impassable cues.

### Blend apron

A `48px` pre-exclusion presentation apron is derived around each class-specific `coreAllowed` union.
The existing eight-neighbor distance helper is reused on the inverted core field; no second distance
library is introduced. The `48px` value is an upper bound before exclusions, not a promise of a
visible `48px` shoulder toward a route or protected source.

```text
apronCandidate = dilate8(coreAllowed, 48) & !coreAllowed

apronAllowed = cropUnion & apronCandidate & !otherProtected & !building & !transition
               & !rewardDiscovery & !semanticAnchor & !routeCore

nearFade(p) = smoothstep255(min(outwardDistance8(coreAllowed, p), 8), 8)
farFade(p) = 255 - smoothstep255(max(outwardDistance8(coreAllowed, p) - 8, 0), 40)
apronEdgeWeight(p) = min(96, nearFade(p), farFade(p))
apronWeight(p) = halfUp(apronEdgeWeight(p) * organicWeight(p) / 255)
```

The apron may receive only low-profile foliage, leaf litter, soft shadow, grass, reeds, and
ground-level branch texture. It may not receive trunks, solid hedge faces, walls, or other collision
cues. On apron pixels, the donor residual is capped per channel at `12`, and the final luma shift
from the pre-scenery background is capped at `16`. The apron is composited after the shaped core
contribution on the canonical world master; it never enters sparse-core or tree-continuity shaping.

`nearFade` is zero at the core boundary, reaches the global `96/255` cap inside the apron, and
`farFade` reaches zero at the outer `48px` limit. This avoids a discontinuity with the parent's
zero-weight blocker edge without turning the 64px core into a full-weight bar. Pixels outside
`coreAllowed | apronAllowed` remain byte-identical to an assembly without scenery inserts.

This gives the obstacle a natural visual shoulder without claiming collision outside its authored
core. Route and protected exclusions may remove part or all of a local apron; no implementation or
visual test may demand a halo through those exclusions.

## Class language

- **Hedge:** low Coast/Mistfen brush or reeds with irregular height, small gaps, and soft ground
  integration. No trunks or canopy masses.
- **Tree wall:** varied tree clusters, partial trunks, roots, understory, canopy shadow, and irregular
  depth. The wall reads continuously impassable without becoming a uniform strip.
- **Forest bank:** layered Wildwood edge with shrubs, ferns, leaf litter, roots, intermittent trunks,
  and deeper canopy shadow. It must not form a horizontal or vertical rectangular band.

Every row must be visually distinct. Reusing the same exact tree cluster, hedge face, or cadence
across multiple rows fails the gate.

## Deterministic composition and guards

The panel registry, panel priority stack, panel bounds, two-crop export geometry, and source PNG bytes
stay unchanged. They run before the scenery pass. The user rejected the first world-canonical
candidate because the ordinary full-overlap axis crossfade still read as a large rectangular image
overlap. Therefore the handoff math is amended before any scenery contribution is applied.

Every sealed north/south, family, and detail-pair overlap uses one deterministic content-aware
multiband seam:

1. decode the two competing overlap rasters in canonical world coordinates;
2. compute an RGB L1 cost at every overlap pixel;
3. find one continuous minimum-cost seam along the declared axis by dynamic programming, allowing
   only `-1`, `0`, or `+1` cross-axis movement per step, charging `4` for either non-zero move, and
   resolving equal costs in `straight`, negative, positive order;
4. set `seamHalfWidth = min(96, floor(axisLength / 8))` and use the same value as the clamped box
   low-pass radius;
5. blend the low-frequency components across the full overlap with the existing endpoint-preserving
   half-up axis weight;
6. blend only the high-frequency residuals across the narrow band centered on the chosen seam, then
   clamp `low + residual` into opaque RGB;
7. preserve the first raster exactly at the first overlap endpoint and the second raster exactly at
   the final endpoint.

This replaces a broad transparent-looking content crossfade with a smooth palette transition and a
single continuous texture owner. It does not blur either source, rewrite a source panel, move a
landmark, change a gameplay mask, or add a runtime plane. Detail-pair correction still applies its
existing outer feather after the multiband seam, so every visible detail perimeter stays equal to the
pre-detail composite.

Opaque detail panels use the same frequency separation to avoid exposing their source rectangles.
For a detail panel, use a clamped box low-pass radius of
`max(1, min(64, floor(min(panelWidth, panelHeight) / 8)))`. Blend that detail low-frequency lighting
field from the pointwise current composite across the whole short dimension, with the final inset
`floor((min(panelWidth, panelHeight) - 1) / 2)`. Blend only the high-frequency residual with the
existing exact `128px` outer feather (`lastInsetIndex = 127`). This keeps every perimeter pixel equal
to the pre-detail composite, preserves the source detail at the center wherever an exact center
exists, prevents an earlier correction or scenery delta from diffusing into neighboring pixels, and
never mutates a source panel.

The existing core contribution and topology policy stay unchanged. This amendment adds only the
bounded apron scratch field and one world-canonical composition pass, supersedes the seven donor
images, and extends the generated visual-owner table to the ten sealed source IDs. It does not add a
public mask raster, runtime plane, or generic evaluator.

Tests must prove:

1. the sealed ten-row blocker inventory and exact collision bounds are unchanged;
2. high-contrast obstacle cues occur only inside the collision core, while the existing core row,
   contour, clump, and topology gates remain unchanged and green;
3. apron contributions obey the exact pre-exclusion `48px`, `96/255`, per-channel `12`, and luma `16` limits and
   never intersect protected or route-core pixels;
4. contribution weight is zero at the final outer boundary and no scenery pixel changes outside the
   core-plus-apron union;
5. the five retained full-resolution rasters remain the only public mask set; apron eligibility,
   distance, weight, and hashes are deterministic scratch evidence and are discarded after assembly;
6. the result is deterministic and input-order independent;
7. the pre-scenery assembled master is byte-identical whether or not scenery is requested; all raw
   and normalized source panels remain byte-identical; every eligible world pixel has zero or one
   selected scenery contribution, never one per overlapping source owner;
8. each sealed panel overlap has one deterministic continuous seam, exact endpoint pixels, no
   full-overlap high-frequency ghost blend, and identical output when its source array order is
   permuted back into the sealed IDs;
9. both runtime crops are cut from the same final master and every pixel in their geometric overlap
   is byte-identical; a mutation that makes any overlap pixel differ must fail closed;
10. the generated visual-owner inventory contains all and only the ten sealed scenery source IDs with
   their exact owner crop, healthy painted ownership suppresses each corresponding fallback visual,
   and a missing or faulted owner crop restores only its affected live blocker;
11. the master still exports exactly two opaque `3200x3200` textures with the existing overlap and
   descriptor structure.

The existing row metrics plus native-detail inspection remain the cadence and organic-shape gate.
This amendment does not introduce a second stamp detector or a parallel topology policy. Structural
checks do not replace native visual review.

## Review and approval gates

Before publication, review at original detail:

- every one of the seven normalized donor canvases;
- every one of the ten blocker rows, including ends, intersections, and the full apron;
- a clean full-master overview;
- the Coast/Mistfen hedge rows, connector village-mouth hedge, connector Crossroads-mouth hedge,
  Silverpine tree walls, and Wildwood forest banks at their exact owning-source bounds;
- collision-only and missing/faulted fallback diagnostics separately from normal captures.

Normal captures fail on any source rectangle, straight bar, repeated stamp, exposed fallback tile or
sprite, duplicate obstacle, false blocker, obscured route, material jump, or hard apron boundary.
Silverpine and Wildwood must show at least two natural forest-depth cues while traversal remains
unambiguous.

The review inventory must include native-detail crops of every source-panel handoff and the full
runtime-crop overlap. The same tree, hedge, shadow, and ground pixels must continue through those
regions without doubled motifs, ghosting, or a feathered content conflict. A visually plausible seam
does not override the exact byte-equality overlap gate.

The workflow stops at a fresh `NEEDS_CONTEXT` gate. Approval must be an explicit user answer captured
with a UTC-second timestamp after the user sees the final images. No prior approval or rejected image
may be carried forward.

Hero House frontage and any connector fence or outer-boundary strip must still be recaptured and
reported, but they are cause-scoped diagnostics rather than pass/fail evidence for a seven-insert
attempt. If they remain visible, the scenery correction may pass its own gate while the overall
painted-pilot visual gate remains rejected. A separate owning-source design and approval are required
before changing those sources or claiming final branch approval.

## Error handling

- A generation, normalization, topology, boundary, ownership, export, or visual failure rejects only
  the owning attempt and preserves its provenance.
- A compositor or mask failure is fixed in code before spending another image-generation attempt.
- An overlap-content failure rejects the assembled candidate, not the seven donor calls. Preserve
  the donor bytes and rebuild only after the world-canonical compositor passes RED/GREEN tests.
- No gate is weakened to accept generated art.
- If the final background cannot look organic while preserving collision and protected-route
  contracts, stop and return `NEEDS_CONTEXT`; do not change gameplay.

## Out of scope

- new runtime texture planes or foreground layers;
- collision, route, transition, map, camera, or save changes;
- new gameplay decorations or interactions;
- replacing buildings, NPCs, landmarks, pickups, or doors;
- correcting Hero House outer-boundary tree strips or unrelated connector fence/decor sources; these
  remain blocking follow-up findings rather than being silently accepted;
- a generic scenery authoring framework beyond this sealed Meadow correction.

## Definition of done

This amendment is complete only when all ten sealed blocker rows use approved organic generated
scenery, those rows contain no visible rectangular or repeated obstacle strips, runtime ownership
prevents duplicates for all ten exact source IDs, all deterministic/package/browser gates pass, and
the user explicitly approves the fresh cause-scoped visual inventory. This completion does not imply
overall painted-pilot visual approval: Hero House outer-boundary strips and unrelated connector
fence/decor findings must be resolved under their owning sources before the branch can pass its final
visual gate.
