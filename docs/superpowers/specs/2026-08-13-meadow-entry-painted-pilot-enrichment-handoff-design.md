# Meadow Entry painted pilot enrichment and handoff revision design

**Date:** 2026-08-13

**Status:** Forest-enrichment amendment direction approved on 2026-08-14; written amendment awaiting user review

**Amends:** `2026-08-12-meadow-entry-painted-pilot-camera-safe-underlay-design.md`

**2026-08-13 review corrections:** The first written draft proposed axis-blending two independently
feathered composites. Source review proved that recipe would wash the `128px` Sundrop overlap toward
the underlay. A first correction then proposed a full-strength source overwrite; review proved that
would replace the midpoint wash with hard seams around the intersection rectangle and would exempt
the failing pixels from perimeter equality.

The final contract keeps the ordinary, continuous feathered composite as its base and applies an
in-place, edge-feathered pair correction immediately after the second member of each declared pair.
The correction is zero on all four intersection edges and full-strength at the center. This differs
from the suggested `max(featherA, featherB)` weight: with a `128px` overlap and the existing `127px`
inset index, that expression reaches only `129/255` at the Sundrop midpoint and therefore retains
about half of the wash it is meant to remove. The corrected formula below preserves exact perimeter
equality, restores a pure pair-source midpoint, retains the fresh relative boundary-excess gate,
and requires synthetic compositor GREEN before generation.

**2026-08-14 forest-enrichment amendment:** The first six-source interim candidate cleared the
objective texture-energy floor but was rejected because the background still read as a broad grass
field with insufficient environmental structure. The replacement art may therefore bake richer
tree and forest scenery into the same two base textures. Forest scenery is confined to authored
blocked scenery belts; traversable fields, routes, approaches, and live clearances retain
ground-level detail only. No runtime prop, collision shape, ownership rule, texture plane, or crop
changes as part of this amendment.

## Purpose

The camera-safe painted Meadow pilot now covers its approved browser journey without exposing
fallback tiles, but its replacement Task 8 visual gate was rejected. The normal runtime captures
show two presentation defects:

1. broad terrain areas are too sparse because the prior art direction over-applied the requirement
   for quiet ground; and
2. the Sundrop connector and Crossroads materials meet too abruptly even though the underlying
   crop and panel overlaps are structurally covered.

This revision enriches the painted background with non-interactive regional microdetail, layered
forest-edge scenery, and a repaired connector-to-Crossroads handoff at the source-art and assembly
levels. It does not change gameplay geometry or add runtime planes.

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

All new decoration is baked and non-interactive. Ground-detail decoration remains low-profile.
Tree and forest masses are permitted only in the scenery-belt contract below, where authored
collision already prevents traversal. The background never creates a new claim about collision,
interaction, ownership, or state.

Region language is:

- **Sundrop:** clover, small flowers, scattered pebbles, varied grass, worn path shoulders, and
  orchard-like hedge or treeline depth along blocked village edges;
- **connector:** wheel-rut wear, compacted-soil variation, small stones, and sparse wildflowers;
- **Crossroads:** mixed gravel and cobble, weeds between stones, dry grass, edge flowers, and
  restrained woodland cues at the Wildwood-facing blocked edge;
- **neighboring margins:** the existing region-correct marsh ground, leaf litter, forest-floor
  texture, fern texture, roots, shrubs, layered canopy shadow, coastal sand, or coastal gravel where
  the owning masks require it.

### Two-layer decoration model

The background uses two distinct review layers:

1. **Ground-detail field.** The existing 67-tile eligibility inventory remains the contract for
   grass, flowers, pebbles, leaf litter, roots, ferns, low shrubs, path wear, and material variation.
   It continues to subtract protected/live, building, transition, reward/discovery, semantic-anchor,
   and route-core pixels.
2. **Blocked scenery belts.** A second review-only raster permits treelines, visible trunks,
   clustered canopy, dense shrubs, roots, ferns, forest-floor shadow, and woodland depth only within
   current non-navigable forest/hedge blocker footprints. The source inventory is a sorted,
   fail-closed selection from the existing reviewed Meadow Entry bake-ownership catalog: current
   blockers whose reviewed visual language is `hedge`, `tree-wall`, or `forest-bank`. It is
   intersected with the unchanged two-crop union and clipped to the exact blocker rectangles with
   no outward dilation. This selection does not amend painted-v2 runtime ownership.

The scenery-belt inventory and its source hashes are emitted in review metadata, not added to the
runtime ownership table or gameplay controls. A catalog or bounds change makes the review fixture
stale and stops generation. Protected live decor—including authored individual tree, gate, sign,
pickup, actor, and landmark sprites—remains excluded.

Inside a scenery belt, trunks, dark canopy interiors, and other high-contrast collision cues must
remain inside the exact blocked footprint. Softer leaf litter, grass blending, and canopy shadow may
blend into otherwise eligible ground, but cannot narrow a route or suggest an additional blocker.
The art may imply a continuous forest behind live tree sprites, but must not reproduce an authored
sprite's exact silhouette, position, or landmark identity. Existing live visuals remain distinct
and render unchanged above the background.

Decoration eligibility reuses the existing control SVGs. It subtracts the rendered protected-live,
building-footprint, entrance-transition, reward-discovery, and semantic-anchor masks from the
two-crop union. Those controls already encode the approved ownership clearances and
`PROTECTION_MARGINS` (`top: 32`, `right: 16`, `bottom: 16`, `left: 16`); no second uniform dilation
and no new control SVG is introduced.

Implementation exposes that existing margin constant as a read-only exported contract and reuses
it directly; it must not copy the four numbers into a second decoration-only constant.

The route-core exclusion is a review-only raster derived in memory from
`meadow-entry-terrain-path-mask.svg`. Each terrain rectangle is inset by the same existing
`PROTECTION_MARGINS`, and non-positive results are discarded. This leaves the path core quiet while
allowing low-profile decoration on eligible path shoulders. The derived raster, its source hashes,
and the derivation policy are recorded in review metadata, but it is not added to the control
inventory.

The eligibility inventory is computed before generation on a world-aligned `512×512` grid. A tile
qualifies when eligible pixels occupy at least 50% of the crop-union pixels clipped into that tile.
The current frozen controls, crop union, route-core derivation, and protection margins produce
exactly **67 qualifying tiles** in row-major order. The source-derived row counts are
`7 + 6 + 10 + 9 + 5 + 10 + 8 + 6 + 6`; 83 crop-union grid cells are inspected and 16 fail the
50% threshold. Their world bounds, clipped crop-union pixel counts, eligible pixel counts, and
rejected-master texture-energy values are pinned before any art call. Evidence is therefore
exactly five numbered contact sheets with `16 + 16 + 16 + 16 + 3` tiles; there is no guessed cap or
truncation path. This corrects the superseded 60-tile arithmetic after an independent
current-source audit and explicit user approval.

Each qualifying tile has an inexpensive objective floor before human review. Over eligible pixels,
the check reuses the existing `rgbStep` definition—the mean absolute RGB difference divided by
three—for every rightward and downward neighbor pair whose two pixels are eligible. The rejected
master's 67-tile baseline has minimum `1.5571045952962603` and median
`2.8948296408243195`. A candidate fails before visual review when any tile's mean step is below
`1.5`, or when the 67-tile median is below `3.1843126049067515` (110% of the rejected baseline
median). The full per-tile baseline remains in the pinned fixture and report so the calculation is
auditable. This metric is only a floor against flat fields; it does not approve noise, repeated
stamps, or visual richness.

After that floor passes, a human native-detail reviewer must identify at least two visually distinct
microdetail cluster types in every qualifying tile. Repeated grids, regular stamp spacing, one
repeated dominant motif, noisy texture added only to satisfy the metric, or large empty eligible
fields fail the human gate.

The 67-tile human pass is run only for a complete candidate set that has cleared the objective
floor. A later single-source correction rerenders and reinspects the qualifying tiles intersecting
that source plus its seam evidence; the final promoted set still receives one complete 67-tile
pass. Failed low-energy attempts never consume a full subjective review.

Route shoulders may contain subtle ground-level wear and sparse vegetation outside the existing and
derived exclusions, but path centers and every live approach remain flat, readable, and
unobstructed. Outside the blocked scenery-belt raster, the art must not bake lamps, fences, signs,
crates, barrels, buildings, trees, gates, doors, pickups, actors, labels, tall vegetation, water, or
any other cue that could imply live state or collision.

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

Final assembly declares two pair rows:

| First ID | Second ID | Intersection | Axis |
| --- | --- | --- | --- |
| `sundrop-north` | `sundrop-south` | `(256,4928)–(2880,5056)` (`2624×128`) | `y` |
| `village-crossroads-connector` | `crossroads` | `(2880,4480)–(3392,4768)` (`512×288`) | `x` |

The sealed configuration stores only `{ firstId, secondId, bounds, axis }`. Direction follows the
ordered IDs, and `lastIndex` is derived as intersection height minus one for `y` or width minus one
for `x`; neither derived value is duplicated as configuration data. A single generic axis-pair
helper owns this derivation and the linear color calculation. The existing underlay north/south
blend, the existing underlay family handoff, and this detail-pair correction all call that helper
instead of maintaining three near-identical blend loops.

Detail panels are still processed in ascending priority with the ordinary `128px` perimeter
feather. Immediately after the second participant of a pair is composited, the assembler revisits
only that pair's intersection. Its current pixels are the continuous ordinary composite. For each
intersection pixel, it calculates the pair-source color with the shared axis helper and blends that
color over the current pixel with one correction weight:

```text
axisPair(first, second, index, lastIndex)
  = floor((first * (lastIndex - index) + second * index + floor(lastIndex / 2)) / lastIndex)

correctionLastInsetIndex
  = min(127, floor((min(intersectionWidth, intersectionHeight) - 1) / 2))

correctionEdgeDistance
  = min(x - left, right - 1 - x, y - top, bottom - 1 - y)

correctionWeight
  = meadowEntryDetailFeatherWeight(correctionEdgeDistance, correctionLastInsetIndex)

out
  = blendMeadowEntryDetailChannel(ordinaryComposite, axisPair, correctionWeight)
```

For Sundrop, `index = y - 4928`, derived `lastIndex = 127`, and derived
`correctionLastInsetIndex = 63`; the center therefore reaches correction weight 255 instead of the
129 produced by `max(featherA, featherB)`. For connector/Crossroads, `index = x - 2880`, derived
`lastIndex = 511`, and derived `correctionLastInsetIndex = 127`. Alpha remains 255.

The pair source's first endpoint equals the first panel source and its second endpoint equals the
second panel source. The correction weight is exactly zero around all four intersection edges, so
the already-continuous ordinary composite and every visible panel perimeter remain byte-identical
there. It reaches 255 at the narrow Sundrop center and in the connector/Crossroads center, making
the midpoint a pure two-source mix rather than a washed mix with the underlay. Pixels outside the
intersections are unaffected. The operation is in-place after the ordinary composite, so no full
master clone, intersection snapshot, or runtime layer is required.

The third detail intersection remains intentionally undeclared:

```text
village-crossroads-connector ∩ sundrop-north
= (2592,4480)–(2880,5056)
```

There the target already contains full Sundrop detail and the ordinary connector feather performs
a detail-to-detail transition without underlay wash. Adding a third pair would overwrite correct
priority behavior.

Assembly provenance remains self-describing rather than relying on a version-token name. It stores
the two exact configuration rows plus the `axisPair`, `correctionLastInsetIndex`,
`correctionEdgeDistance`, `correctionWeight`, and `out` formulas above; it continues to bind all
source bytes by SHA-256. Direction and last index appear only as derived review values. Finalization
and `--check` fail when a row, formula, derivation, or source binding is missing or stale.

Every visible detail perimeter segment, including every segment inside either declared
intersection, must still equal the ordinary pre-correction surface exactly. There is no pair
exemption. The fixed historical hard-copy master hash and stale absolute Hero House metric literals
are removed because eight source byte sets change. The fresh relative gate remains blocking for
every visible perimeter:

```text
correctedExcess <= freshHardCopyExcess * 0.25
comparisonP95 == 0 ? edgeP95 == 0 : p95Ratio <= 1.30
```

The fresh hard-copy comparison is assembled in the test from the current accepted bytes, so source
replacement does not invalidate it. The `1.30` p95 ceiling preserves the known pinned Hero House
top value of `1.261905` while preventing a larger localized spike. In addition, all four sides of
both pair intersections are measured explicitly rather than relying on later-priority perimeter
filtering, and correction-edge pixels are byte-equal before and after the correction.

## Compositor-first TDD gate

No image-generation call may start until the pair table and edge-feathered pair correction pass
synthetic RED-to-GREEN tests. A synthetic `128px` Sundrop fixture is mandatory because it is the
narrow case that exposes both underlay wash-out and a false midpoint claim from the rejected
`max(featherA, featherB)` proposal.

Tests pin:

- exact pair IDs, bounds, and axes, with direction and last indices derived and asserted;
- the one shared axis helper used by both underlay transitions and paired details;
- first- and second-endpoint pair-source equality and monotonic linear axis weights;
- correction weight zero along every intersection edge and 255 at the synthetic Sundrop midpoint;
- byte equality between the ordinary composite and corrected output along all four edges;
- midpoint RGB composed only from the two source colors and unequal to the ordinary washed color;
- alpha 255;
- no mutation outside the declared intersection;
- deterministic repeated output;
- rejection of stale, missing, overlapping, or dimensionally invalid pair rows or formulas.

If this synthetic fixture cannot pass, generation stops for a design correction. Art correction
rounds must not be spent compensating for a defective compositor, and the Sundrop pair policy must
not be silently removed.

## Generation and normalization

Only after the compositor-first gate passes, each of the eight sources uses a distinct built-in
image-generation call. Calls are ordered as:

1. Sundrop north underlay, then Sundrop south underlay using the accepted north overlap;
2. Crossroads north underlay, then Crossroads south underlay using the accepted north overlap;
3. Sundrop north detail, then Sundrop south detail using the accepted north overlap;
4. connector detail, then Crossroads detail using the accepted connector overlap.

Reference packs include the approved concept, region palette, actual neighboring panel pixels,
route geometry, clearance information, and a softly annotated blocked-scenery-belt guide. That
guide distinguishes forest depth from traversable ground without exposing literal rectangles as
scenery. High-contrast rectangular control atlases must not be presented as literal scenery
references; masks remain authoritative for QA and may be converted to soft annotations for
generation. Every used reference path and SHA-256 is recorded.

Prompts require layered, non-repeating forest structure inside the annotated belts: irregular
treelines, varied canopy scale, visible trunk rhythm, undergrowth, roots, ferns, leaf litter, and
soft depth shadow. They also require quiet route cores, open approaches, no isolated trees on
walkable ground, no duplicate landmark or live-prop silhouette, no rectangular hedge row, and no
regular forest stamp grid. A source that clears the texture-energy floor but still reads as one
broad grass field fails the human gate.

After the four underlays and Sundrop north/south details—the first six revised sources—pass their
source checks, work pauses at an interim assembled checkpoint. A temporary-root assembly uses those
six candidates with the still-pinned Hero House, connector, and Crossroads bytes. It produces the
two temporary crops, native crops for all four Sundrop intersection sides and all four Hero House
edges, and one normal `1920×1080`, DPR-1, zoom-1 Sundrop browser capture. The seventh and eighth
generation calls do not begin until that assembled evidence has an explicit user verdict.

The interim checkpoint does not rerun the GPU texture probe. It retains the same two `3200×3200`
decoded textures and therefore cannot exercise a different retention or maximum-texture-size
contract; final encoded bytes and decode/upload timing are not yet stable. The existing probe is
rerun once against the final two exports, where it provides actionable evidence.

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
- all four sides and all four corners of each paired-detail intersection at native resolution;
- all four Hero House frontage edges against the regenerated Sundrop south surround;
- a protected/live clearance atlas;
- a blocked-scenery-belt inventory and overlay with every selected blocker source ID and bounds;
- native-detail crops for every scenery-belt component intersecting a reviewed panel edge or route;
- exactly five numbered `512×512` decoration-density contact sheets covering the pinned 67 tiles;
- region-material and route-centerline overlays shown separately from clean art.

Control-colored overlays are diagnostic and cannot substitute for clean native art. The source
gate requires explicit user approval before master publication. Human review rejects any full
panel dominated by undifferentiated grass, any forest belt that becomes a repeated row of identical
trees, any tree or trunk outside its allowed belt, or any visual narrowing of an authored route.

## Deterministic verification

Tests must establish genuine RED before production changes and then cover:

- the eight superseded hashes and the still-pinned Hero House detail hash;
- exact dimensions, canonical encoding, opacity, provenance, and normalization limits;
- both transition bounds, axes, participating IDs, derived directions/last indices, and
  self-describing formula provenance;
- shared axis-helper endpoint equality, monotonic linear weights, an ordinary-surface-independent
  midpoint, zero correction on all four intersection edges, non-mutation outside each
  intersection, opacity, determinism, and stale-row/formula rejection;
- unchanged underlay overlap behavior and unchanged generic detail feather behavior;
- exact ordinary-composite perimeter equality everywhere, including paired intersections;
- fresh relative `75%` excess reduction, the zero-comparison rule or `p95Ratio <= 1.30`, explicit
  four-side pair metrics, and all four pinned Hero House edge metrics, while removing only the
  superseded fixed hard-copy hash and stale absolute Hero literals;
- the exact 67-tile eligibility inventory, five-sheet partition, per-tile `1.5` energy floor, and
  median `3.1843126049067515` floor;
- the exact fail-closed blocked-scenery-belt source inventory, bounds, crop intersections, and
  review-mask hash, with no change to gameplay controls or runtime ownership rows;
- rejection when the scenery-belt derivation extends beyond its exact blocker/crop intersection or
  admits a protected-live decor source; tree/trunk placement outside the belt remains a mandatory
  native-detail human-review failure rather than an unreliable semantic-pixel classifier;
- unchanged gameplay control fingerprint and exact two-crop manifest;
- rebuilt master alpha coverage, exports, overlap equality, proof bindings, approval inventory,
  runtime descriptors, storage policy, and LFS integrity;
- no-write `--check` behavior for every active art writer.

The relevant focused art suites, `bun run check`, changed-file Prettier and ESLint, `bun run build`,
`bun run build:tauri`, `git diff --check`, storage validation, and `git lfs fsck` must pass. A whole
repository lint failure is acceptable only when it is demonstrated to come exclusively from
preserved unrelated untracked evidence and every changed text file passes targeted checks.

## Runtime verification and final gate

Because the approved texture bytes change, the existing
`painted-v2-camera-safe-pilot` two-texture probe is rerun after its two pinned encoded-byte and
SHA-256 rows are updated to the new exports. No third probe candidate or framework is added. A
setup-only sandbox bind failure permits one narrow localhost retry; upload failure, wrong
retention, context loss, or any real WebGL error stops publication.

The existing painted-pilot E2E journey is rerun at `1920×1080`, DPR 1. Every sampled exterior
camera rectangle must remain covered by the unchanged crop union, and the healthy and per-crop
fallback ownership assertions remain exact.

The browser visual gate replaces all nine rejected captures and adds native-detail connector
handoff crops to the report. Normal views must show no source rectangle, material jump,
double-darkening, fallback exposure, blur mismatch, repeated stamp, false collision cue, clearance
ambiguity, debug overlay, or incorrect review bar. Hero House frontage, Sundrop main street,
connector village mouth, connector midpoint, connector Crossroads mouth, and Crossroads Waystone
must each show deliberate regional layering rather than a single grass texture. Where a scenery
belt enters the camera, it must read as a natural forest edge with at least two distinguishable
depth layers—for example canopy plus trunks/undergrowth—while the traversable route remains
unambiguous. Diagnostic views must remain explicitly labelled and truthful.

The replacement report records exact hashes, dimensions, capture settings, source/package
approvals, texture decision, and the user's explicit verdict with a UTC-second timestamp. No
approval is inferred, and no Task 9 or PR3 work begins before that verdict.

## Failure handling and rollback

The currently published package remains the comparison baseline until the replacement package and
runtime evidence pass every gate. Rejected candidates and screenshots are retained as evidence but
are not published as approvals. A failed source is regenerated only after the synthetic compositor
gate is green; the compositor, masks, geometry, or tolerances are not weakened to make it pass.

Each revised source permits at most five bounded generation attempts, recorded independently so one
stubborn panel cannot consume or conceal another panel's correction history. If a source reaches
that limit, either revised detail pair still cannot achieve a natural handoff, or the decoration
contract still fails, the task stops for a new design decision. It must not add a bridge plane,
live decoration, runtime texture, coordinate change, or undocumented exception.

## Out of scope

- live decorative props or new collision;
- buildings, NPCs, pickups, discoveries, encounters, transitions, or save changes;
- camera-safe expansion beyond the approved route and two-crop union;
- a full-world PR3 master or default painted-mode activation;
- new art-generation, authoring, or runtime frameworks;
- changes to the pinned Hero House detail source.

## Acceptance summary

The revision is ready to replace the current package only when:

1. the eight new sources satisfy the ground-detail, blocked-forest-belt, clearance, and continuity
   contracts;
2. the edge-feathered pair correction, exact perimeter and boundary metrics, density floors, and all
   unchanged assembly contracts pass deterministic tests;
3. package generation, approval, storage, static, build, E2E, and texture gates pass;
4. fresh normal browser views are richer and both paired-detail handoffs read as one continuous
   landscape at native detail; and
5. the user explicitly approves the final evidence.
