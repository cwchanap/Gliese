# Meadow Entry organic baked-scenery correction design

**Date:** 2026-08-17

**Status:** Written after design approval; awaiting user review

**Amends:** `2026-08-13-meadow-entry-painted-pilot-enrichment-handoff-design.md`

## Decision

The rejected Task 8 visual gate is a source-art and composition defect, not a camera or runtime
defect. The final background will continue to bake hedge, tree-wall, and forest-bank scenery into
the existing two base textures. It will not add runtime planes or move gameplay geometry.

Every visible blocker row in the sealed Meadow scenery inventory is corrected, not only the three
rejected camera views. The two runtime crops, crop geometry, collision, routes, transitions,
background ownership, save behavior, and fallback behavior remain frozen.

## Rejected evidence

The current Hero House and connector captures show tile-like obstacle rows at the camera perimeter
and repeated hedge/fence strips. The Wildwood capture shows the stronger failure: long rectangular
forest bands, straight material splits, and a hard lower edge. Those captures remain rejection
evidence and cannot be reused as approval.

The correction must remove all of the following from normal painted-mode views:

- repeated live-looking tree or hedge sprites;
- straight inserted bars or source rectangles;
- regular stamp cadence;
- hard forest-to-ground material boundaries;
- duplicate obstacles caused by a baked image and a visible fallback sprite representing the same
  source.

## Ownership

Gameplay remains authoritative:

- blocker rectangles continue to own collision;
- live actors, pickups, discoveries, doors, transitions, landmarks, and other stateful content stay
  live;
- the painted package owns only presentation;
- existing fallback visuals remain available when a painted crop is unavailable and are suppressed
  for their exact owner while the painted crop is healthy.

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

The current exact blocker clipping is what exposes narrow rectangular bands. The replacement bake
uses two presentation zones while keeping the collision core unchanged.

### Collision core

The exact blocker footprint is the only place where the generated donor may contribute solid trunks,
dense roots, dark canopy interiors, or other high-contrast impassable cues. Core pixels remain
subject to existing building, transition, route-core, reward/discovery, semantic-anchor, and
protected-live exclusions.

### Blend apron

A `48px` presentation apron is derived deterministically around each blocker union with a
Chebyshev-distance dilation. The apron may
receive only low-profile foliage, leaf litter, soft shadow, grass, reeds, and ground-level branch
texture. It may not receive trunks, solid hedge faces, walls, or other collision cues.

The apron is clipped by crop coverage and subtracts route core, buildings, transitions,
rewards/discoveries, semantic anchors, and protected-live sources. Apron contribution weight is
capped at `96/255`; its per-channel donor residual is capped at `12`, and its luma shift from the
pre-scenery background is capped at `16`. The organic donor weight and distance feather both reach
zero at the `48px` boundary. These literal limits are global and cannot be tuned per row or
screenshot. Pixels outside the resulting core-plus-apron mask remain byte-identical to an assembly
without scenery inserts.

This gives the obstacle a natural visual shoulder without claiming collision outside its authored
core. It also removes the requirement that a 64-pixel blocker belt display a full rectangular forest
face from edge to edge.

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

The ordinary panel priority stack, pair correction, underlay seams, and two-crop export contract stay
unchanged. Only the scenery contribution mask and the seven donor images change.

Tests must prove:

1. the sealed ten-row blocker inventory and exact collision bounds are unchanged;
2. high-contrast obstacle cues occur only inside the collision core;
3. apron contributions obey the exact `48px`, `96/255`, per-channel `12`, and luma `16` limits and
   never intersect protected or route-core pixels;
4. contribution weight is zero at the final outer boundary and no scenery pixel changes outside the
   core-plus-apron union;
5. the result is deterministic and input-order independent;
6. no exact repeated tile/stamp signature is present along a row or between rows;
7. healthy painted ownership suppresses the corresponding fallback visual, while missing/faulted
   painted crops restore it;
8. the master still exports exactly two opaque 3200x3200 textures with the existing overlap and
   descriptor structure.

Structural checks do not replace native visual review.

## Review and approval gates

Before publication, review at original detail:

- every one of the seven normalized donor canvases;
- every one of the ten blocker rows, including ends, intersections, and the full apron;
- a clean full-master overview;
- Hero House frontage, connector village mouth, connector Crossroads mouth, Silverpine tree wall,
  and Wildwood forest lane;
- collision-only and missing/faulted fallback diagnostics separately from normal captures.

Normal captures fail on any source rectangle, straight bar, repeated stamp, exposed fallback tile or
sprite, duplicate obstacle, false blocker, obscured route, material jump, or hard apron boundary.
Silverpine and Wildwood must show at least two natural forest-depth cues while traversal remains
unambiguous.

The workflow stops at a fresh `NEEDS_CONTEXT` gate. Approval must be an explicit user answer captured
with a UTC-second timestamp after the user sees the final images. No prior approval or rejected image
may be carried forward.

## Error handling

- A generation, normalization, topology, boundary, ownership, export, or visual failure rejects only
  the owning attempt and preserves its provenance.
- A compositor or mask failure is fixed in code before spending another image-generation attempt.
- No gate is weakened to accept generated art.
- If the final background cannot look organic while preserving collision and protected-route
  contracts, stop and return `NEEDS_CONTEXT`; do not change gameplay.

## Out of scope

- new runtime texture planes or foreground layers;
- collision, route, transition, map, camera, or save changes;
- new gameplay decorations or interactions;
- replacing buildings, NPCs, landmarks, pickups, or doors;
- a generic scenery authoring framework beyond this sealed Meadow correction.

## Definition of done

The correction is complete only when all ten blocker rows use approved organic generated scenery,
the master contains no visible rectangular or repeated obstacle strips, runtime ownership prevents
duplicates, all deterministic/package/browser gates pass, and the user explicitly approves the fresh
visual inventory.
