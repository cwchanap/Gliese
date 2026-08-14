# Meadow Entry painted pilot enrichment and handoff revision design

**Date:** 2026-08-13

**Status:** Design sections approved; written-spec review pending

**Amends:** `2026-08-12-meadow-entry-painted-pilot-camera-safe-underlay-design.md`

## Purpose

The camera-safe painted Meadow pilot now covers its approved browser journey without exposing
fallback tiles, but its replacement Task 8 visual gate was rejected. The normal runtime captures
show two presentation defects:

1. broad terrain areas are too sparse because the prior art direction over-applied the requirement
   for quiet ground; and
2. the Sundrop connector and Crossroads materials meet too abruptly even though the underlying
   crop and panel overlaps are structurally covered.

This revision enriches the painted ground with non-interactive regional microdetail and repairs the
connector-to-Crossroads handoff at the source-art and assembly levels. It does not change gameplay
geometry or add runtime planes.

## Scope classification

This work is a `revision` under the Gliese world-expansion workflow:

- approved presentation source bytes and their deterministic assembly change;
- runtime crop geometry, texture count, camera envelope, background selection, and fallback rules
  remain unchanged;
- collision, routes, transitions, actors, pickups, discoveries, saves, and live props remain
  authoritative and unchanged;
- painted mode remains pilot-only behind `?meadowPaintedPilot=on`.

## Evidence and diagnosis

The current underlay assembler already blends both `128px` north/south intersections and the
`832px` Sundrop/Crossroads family intersection. The current detail compositor also makes every
detail-panel perimeter equal the pre-detail surface through a deterministic `128px` inward
feather. Those contracts prevent a literal uncovered crop edge, but they do not guarantee that
route centerlines, material ratios, brush scale, value, or decoration frequency evolve naturally
inside an overlapping pair.

The rejected normal captures at connector village mouth, connector midpoint, and connector
Crossroads mouth therefore remain authoritative evidence. They show large low-detail fields and a
rapid shift from green packed-earth terrain to bright Crossroads cobble. The rejected evidence must
remain uncommitted and its hashes must be recorded as superseded in the eventual replacement
report.

## Frozen runtime and gameplay contracts

The following remain exact:

- runtime crop `painted-v2-sundrop-camera-base` at `(0,3200)–(3200,6400)`;
- runtime crop `painted-v2-crossroads-camera-base` at `(2368,2240)–(5568,5440)`;
- two opaque base textures and no foreground or additional underlay texture;
- the approved `1920×1080`, DPR-1, zoom-1 camera envelope and browser journey;
- the current background ownership, preload, diagnostic, missing-texture, and render-fault
  behavior;
- every gameplay control fingerprint input, including collision and live-content clearances.

Any change to those contracts requires a separate design amendment. Art must conform to gameplay;
gameplay must not move to accommodate generated pixels.

## Source-art revision

Exactly eight presentation sources are superseded with new attempts at their current stable paths:

- `camera-underlay-sundrop-north`;
- `camera-underlay-sundrop-south`;
- `camera-underlay-crossroads-north`;
- `camera-underlay-crossroads-south`;
- `sundrop-north`;
- `sundrop-south`;
- `village-crossroads-connector`;
- `crossroads`.

The accepted `hero-house-frontage` detail remains byte-pinned. Its core is an intentionally quiet
door and building approach, and the live building covers most of the corresponding runtime view.
Repainting it would add risk without materially improving the requested open-terrain richness.

All nine registry IDs, bounds, roles, and assembly priorities remain unchanged. Replacing a source
does not erase history: each new panel manifest and root provenance record the former accepted
attempt, rejection reason, old hashes, new prompt and references, normalization transform, new
hashes, and fresh approval state.

## Decoration contract

All new decoration is baked, low-profile, and non-interactive. It enriches terrain without
claiming collision, interaction, ownership, or state.

Region language is:

- **Sundrop:** clover, small flowers, scattered pebbles, varied grass, and worn path shoulders;
- **connector:** wheel-rut wear, compacted-soil variation, small stones, and sparse wildflowers;
- **Crossroads:** mixed gravel and cobble, weeds between stones, dry grass, and edge flowers;
- **neighboring margins:** the existing region-correct marsh ground, leaf litter, forest-floor
  texture, fern texture, coastal sand, or coastal gravel where the owning masks require it.

The eligible decoration area is the two-crop union minus protected/live, building, transition,
interaction, and route-core masks, with a `32px` outward safety dilation around those exclusions.
Within each fully reviewed `512×512` tile that contains at least 50% eligible area, native-detail
inspection must identify at least two visually distinct microdetail cluster types. Repeated grids,
regular stamp spacing, one repeated dominant motif, or large empty eligible fields fail the gate.

Route shoulders may contain subtle ground-level wear and sparse vegetation outside the dilated
clearance, but path centers and every live approach remain flat, readable, and unobstructed. The art
must not bake lamps, fences, signs, crates, barrels, buildings, trees, gates, doors, pickups,
actors, labels, tall vegetation, water, or any other cue that could imply live state or collision.

## Paired-detail continuity contracts

The regenerated Sundrop pair has this exact intersection:

```text
sundrop-north ∩ sundrop-south
= (256,4928)–(2880,5056)
= 2624×128 pixels
```

The north/south fields, paths, route shoulders, grass density, and lighting must remain continuous
through the full intersection. No horizontal line produced by an abrupt color, brush-scale,
detail-density, or path-width change may reveal the panel boundary.

The existing detail-source intersection is exact:

```text
village-crossroads-connector ∩ crossroads
= (2880,4480)–(3392,4768)
= 512×288 pixels
```

The regenerated pair must preserve one continuous east-west path centerline and width throughout
that intersection. Packed earth must evolve through mixed dirt, gravel, sparse stone, and cobble;
grass and flowers must taper rather than stop. Lighting direction, average value, brush scale,
edge sharpness, and texture frequency must change gradually. A straight, rectangular, or
mask-shaped boundary is a rejection even if no crop edge is exposed.

Sundrop south is generated only after Sundrop north passes native inspection, and its reference
pack includes the accepted north panel's actual `2624×128` overlap. Crossroads is generated only
after a connector candidate passes native inspection, and its reference pack includes the accepted
connector's actual `512×288` overlap pixels and adjacent underlay pixels. Each generated pair is
still permitted to differ; deterministic assembly owns the final transition.

## Axis-aligned paired-detail blend

The underlay blend policy remains unchanged. The generic `128px` detail perimeter feather remains
unchanged for the pinned Hero House detail and for non-overlapping portions of the regenerated
details.

Final assembly declares two sealed paired-detail policies:

| Pair | Intersection | Blend axis | Direction |
| --- | --- | --- | --- |
| Sundrop north/south | `(256,4928)–(2880,5056)` (`2624×128`) | `y` | north to south |
| connector/Crossroads | `(2880,4480)–(3392,4768)` (`512×288`) | `x` | west to east |

Inside each intersection, final assembly uses this axis-aligned blend:

1. clone the same pre-pair surface twice;
2. composite the first panel onto one clone with the existing detail feather;
3. composite the second panel onto the other clone with the existing detail feather;
4. blend first-panel pixels into second-panel pixels across the complete declared axis using the
   existing integer cubic smoothstep convention;
5. write those blended pixels only inside the declared intersection.

The first endpoint equals the first-panel composite exactly, the second endpoint equals the
second-panel composite exactly, weights are monotonic, alpha remains 255, and pixels outside the
intersection are unaffected by the special policy. No runtime layer is added.

## Generation and normalization

Each of the eight sources uses a distinct built-in image-generation call. Calls are ordered as:

1. Sundrop north underlay, then Sundrop south underlay using the accepted north overlap;
2. Crossroads north underlay, then Crossroads south underlay using the accepted north overlap;
3. Sundrop north detail, then Sundrop south detail using the accepted north overlap;
4. connector detail, then Crossroads detail using the accepted connector overlap.

Reference packs include the approved concept, region palette, actual neighboring panel pixels,
route geometry, and clearance information. High-contrast rectangular control atlases must not be
presented as literal scenery references; masks remain authoritative for QA and may be converted to
soft annotations for generation. Every used reference path and SHA-256 is recorded.

Normalization remains uniform scale plus deterministic center crop with no stretch. Any candidate
requiring more than `2×` uniform upscaling is rejected. Accepted files must have exact registry
dimensions, four channels, alpha 255 everywhere, and canonical PNG chunks. Broad deterministic
cleanup rectangles, semantic-pad flattening, or unrecorded pixel patching are forbidden. A failed
candidate is regenerated instead.

## Review evidence

The source-art gate contains:

- eight full-panel native-resolution reviews;
- five native crops per panel: four quadrants plus center;
- both `128px` north/south underlay intersections;
- the `832px` family handoff;
- the complete `2624×128` Sundrop detail intersection and enlarged west/center/east crops;
- the complete `512×288` connector/Crossroads intersection and enlarged west/middle/east crops;
- a protected/live clearance atlas;
- a `512×512` decoration-density contact sheet covering every eligible review tile;
- region-material and route-centerline overlays shown separately from clean art.

Control-colored overlays are diagnostic and cannot substitute for clean native art. The source
gate requires explicit user approval before master publication.

## Deterministic verification

Tests must establish genuine RED before production changes and then cover:

- the eight superseded hashes and the still-pinned Hero House detail hash;
- exact dimensions, canonical encoding, opacity, provenance, and normalization limits;
- both sealed transition bounds, axes, directions, and participating IDs;
- paired-detail blend endpoint equality, monotonic weights, non-mutation outside each intersection,
  opacity, determinism, and stale-policy rejection;
- unchanged underlay overlap behavior and unchanged generic detail feather behavior;
- unchanged gameplay control fingerprint and exact two-crop manifest;
- rebuilt master alpha coverage, exports, overlap equality, proof bindings, approval inventory,
  runtime descriptors, storage policy, and LFS integrity;
- no-write `--check` behavior for every active art writer.

The relevant focused art suites, `bun run check`, changed-file Prettier and ESLint, `bun run build`,
`bun run build:tauri`, `git diff --check`, storage validation, and `git lfs fsck` must pass. A whole
repository lint failure is acceptable only when it is demonstrated to come exclusively from
preserved unrelated untracked evidence and every changed text file passes targeted checks.

## Runtime verification and final gate

Because the approved texture bytes change, the camera-safe two-texture candidate receives one new
fail-closed browser texture probe. A setup-only sandbox bind failure permits one narrow localhost
retry; upload failure, wrong retention, context loss, or any real WebGL error stops publication.

The existing painted-pilot E2E journey is rerun at `1920×1080`, DPR 1. Every sampled exterior
camera rectangle must remain covered by the unchanged crop union, and the healthy and per-crop
fallback ownership assertions remain exact.

The browser visual gate replaces all nine rejected captures and adds native-detail connector
handoff crops to the report. Normal views must show no source rectangle, material jump,
double-darkening, fallback exposure, blur mismatch, repeated stamp, false collision cue, clearance
ambiguity, debug overlay, or incorrect review bar. Diagnostic views must remain explicitly
labelled and truthful.

The replacement report records exact hashes, dimensions, capture settings, source/package
approvals, texture decision, and the user's explicit verdict with a UTC-second timestamp. No
approval is inferred, and no Task 9 or PR3 work begins before that verdict.

## Failure handling and rollback

The currently published package remains the comparison baseline until the replacement package and
runtime evidence pass every gate. Rejected candidates and screenshots are retained as evidence but
are not published as approvals. A failed source is regenerated; the compositor, masks, geometry,
or tolerances are not weakened to make it pass.

If either revised detail pair still cannot achieve a natural handoff after five bounded correction
rounds, the task stops for a new design decision. It must not add a bridge plane, live decoration,
runtime texture, coordinate change, or undocumented exception.

## Out of scope

- live decorative props or new collision;
- buildings, NPCs, pickups, discoveries, encounters, transitions, or save changes;
- camera-safe expansion beyond the approved route and two-crop union;
- a full-world PR3 master or default painted-mode activation;
- new art-generation, authoring, or runtime frameworks;
- changes to the pinned Hero House detail source.

## Acceptance summary

The revision is ready to replace the current package only when:

1. the eight new sources satisfy the decoration, clearance, and continuity contracts;
2. the special intersection blend and all unchanged assembly contracts pass deterministic tests;
3. package generation, approval, storage, static, build, E2E, and texture gates pass;
4. fresh normal browser views are richer and both paired-detail handoffs read as one continuous
   landscape at native detail; and
5. the user explicitly approves the final evidence.
