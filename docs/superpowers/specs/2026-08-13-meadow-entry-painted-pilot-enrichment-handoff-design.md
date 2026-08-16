# Meadow Entry painted pilot enrichment and handoff revision design

**Date:** 2026-08-13

**Status:** Language-aware topology amendment written; awaiting user review

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
field with insufficient environmental structure. The replacement art therefore adds two baked
layers to the same two base textures: richer ground-level decoration across eligible traversable
terrain, plus mask-scoped forest/hedge inserts inside a sealed inventory of existing blocker belts.
The inserts are deterministic preassembly source composites, not runtime planes. The underlay,
detail-feather, and pair-correction stages therefore remain the final owners of panel boundaries.
No runtime prop, collision shape, ownership rule, texture plane, or crop changes as part of this
amendment.

**2026-08-15 execution-order amendment:** Review found that the review writer already used the
sealed pair-corrected priority stack while the production finalizer still called the singular
detail compositor. The production finalizer must switch to the same priority-stack helper and pass
synthetic parity tests before any further image generation or human art gate. This code-only change
temporarily makes the branch non-publishable because checked-in master/export/runtime bytes remain
the comparison baseline until the approved scenery bake is published. Review therefore uses a
temporary-root production-equivalent assembly, and every pre-publication task proves the checked-in
package stayed byte-identical. The amendment also removes the unused full-canvas decoration union,
limits the public mask result to five retained rasters, and replaces the unsuitable tree-wall
clump-gap metric with a continuous but non-uniform contour-profile gate.

**2026-08-15 rejected corrected-bake gate:** The fresh five-insert correction removed the visible
dark rectangle bars, but it did not satisfy the deterministic bake contract and the user rejected
it. A full row audit corrected the interim report's understated count: four sparse-clump rows exceed
their p95/maximum limits, and five of six tree-wall rows have at least one evaluable slice without
weight `>=32`. Therefore nine of ten blocker rows fail; only `silverpine-wall-B-south` passes every
row gate. Two normalized inserts also violate the existing `<=2x` limit. The rejected source bytes,
temporary assembly, evidence, prompts, transforms, and hashes remain audit history. The next
revision changes the compositor topology rather than weakening a metric or guessing with another
unbounded art pass.

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

- **Sundrop:** clover, clustered small flowers, scattered pebbles, varied grass, low scrub, fallen
  leaves, and worn path shoulders; Sundrop has no approved tree-belt footprint inside the crop and
  therefore receives no baked tree or trunk;
- **connector:** wheel-rut wear, compacted-soil variation, small stones, low scrub, fallen leaves,
  and sparse wildflowers;
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
2. **Blocked scenery belts.** A second art-assembly raster permits dense shrubs, roots, ferns,
   forest-floor shadow, and woodland depth inside a sealed set of current non-navigable blocker
   footprints. Rows reviewed as `tree-wall` or `forest-bank` may also receive varied trunk rhythm
   and dark canopy-interior texture. Rows reviewed as `hedge` remain region-correct low brush or
   reeds and do not become a forest.

The exact in-crop scenery inventory is:

| Source ID | Exact source bounds | Reviewed language |
| --- | --- | --- |
| `coast-crossroads-mouth-bank` | `(3168,4900)–(3232,5300)` | `hedge` |
| `mistfen-entry-bank-east` | `(3068,2600)–(3132,3100)` | `hedge` |
| `silverpine-wall-A-east` | `(3628,2700)–(3692,3000)` | `tree-wall` |
| `silverpine-wall-A-west` | `(3308,2700)–(3372,3000)` | `tree-wall` |
| `silverpine-wall-B-north` | `(3148,2558)–(3532,2622)` | `tree-wall` |
| `silverpine-wall-B-south` | `(3148,2878)–(3532,2942)` | `tree-wall` |
| `silverpine-wall-C-east` | `(3308,2540)–(3372,2780)` | `tree-wall` |
| `silverpine-wall-C-west` | `(2988,2540)–(3052,2780)` | `tree-wall` |
| `wildwood-forest-lane-west-bank` | `(4968,3200)–(5032,5300)` | `forest-bank` |
| `wildwood-north-climb-west-bank` | `(5368,1950)–(5432,3050)` | `forest-bank` |

These ten literal rows are resolved through the existing Meadow Entry source catalog, intersected
with the unchanged two-crop union, and clipped to their exact blocker rectangles with no outward
dilation. The fixture pins the sorted IDs, reviewed languages, resolved bounds, source-catalog hash,
and mask hash. Any row, bounds, or catalog change fails closed. The inventory does not amend
painted-v2 runtime ownership. It intentionally contains no Sundrop or connector tree belt; those
views become richer through the ground-detail field instead of false visual blockers.

The scenery-belt inventory and its source hashes are emitted in art provenance and review metadata,
not added to the runtime ownership table or gameplay controls. Protected live decor—including
authored individual tree, gate, sign, pickup, actor, and landmark sprites—remains excluded.

Inside a tree-wall or forest-bank belt, trunks, dark canopy interiors, and other high-contrast
collision cues remain inside the exact blocked footprint. The deterministic inward feather reaches
zero at the outer boundary of each class-mask union, so the surrounding ground remains unchanged and
no rectangular strip is exposed. The art may imply a continuous forest behind live tree sprites,
but must not reproduce an authored sprite's exact silhouette, position, or landmark identity.
Existing live visuals remain distinct and render unchanged above the background.

Mask precedence is exact. Let `selectedBlockers` be the rasterized union of the ten literal rows.
Let `otherProtected` be the protected/live sources rerendered from the ownership catalog while
omitting only those ten blocker IDs; overlapping protected decor, landmarks, buildings, transitions,
rewards/discoveries, semantic anchors, and route-core pixels remain present. Then:

```text
groundAllowed = cropUnion & !protectedLive & !building & !transition
                & !rewardDiscovery & !semanticAnchor & !routeCore

sceneryAllowed = cropUnion & selectedBlockers & !otherProtected & !building & !transition
                 & !rewardDiscovery & !semanticAnchor & !routeCore
```

The selected blocker omission is the only protected-mask exception. Every overlapping non-selected
source still wins. `groundAllowed` alone owns the exact 67-tile inventory, the per-tile and median
energy floors, and the open-ground motif-family review. `sceneryAllowed` owns only the deterministic
insert bake plus the ten blocker-row and Wildwood reviews. These art-package masks and their source
hashes do not enter the gameplay control fingerprint or runtime ownership table. A diagnostic
overlay that needs their union computes `groundAllowed | sceneryAllowed` while rendering and does
not retain or provenance-bind another full-canvas raster.

One catalog-backed builder consumes `buildMeadowEntryControlInputs()` once and owns the derivation
of `insideCropUnion`, `protectedLive`, `selectedBlockers`, `otherProtected`, `buildingFootprint`,
`entranceTransition`, `rewardDiscovery`, `semanticAnchor`, `routeCore`, `groundAllowed`,
`sceneryAllowed`, and both class masks. Its public result retains only these five `6400×6400`
rasters plus `sourceHashes`: `otherProtected`, `groundAllowed`, `sceneryAllowed`, `hedgeAllowed`, and
`woodlandAllowed`. Builder-local intermediates are created through one reusable scratch
raster/accumulator path: each is derived, hashed into `sourceHashes`, applied to the retained output
accumulators, then discarded or reused. Tests prove precedence at sealed source-backed coordinates
and through final outputs rather than retaining eight additional full-resolution arrays.

The builder reuses the exported `MEADOW_ENTRY_PROTECTION_MARGINS`; it does not parse a rendered SVG.
Decoration eligibility consumes that builder's `groundAllowed` byte-for-byte as `eligible` and
copies only the retained diagnostic masks it actually needs rather than independently deriving
terrain insets. Control SVGs remain rendered evidence of the same catalog input, not a second raster
authority. No second uniform dilation and no new control SVG is introduced.

Implementation exposes that existing margin constant as a read-only exported contract and reuses
it directly; it must not copy the four numbers into a second decoration-only constant.

The route-core exclusion is derived in memory by that same builder from the `ground-patch` records
already present in `buildMeadowEntryControlInputs().sourceCatalog`. Each catalog-backed source bound
is inset by the exported `MEADOW_ENTRY_PROTECTION_MARGINS`, and non-positive results are discarded.
This leaves the path core quiet while allowing low-profile decoration on eligible path shoulders.
The catalog/source hashes and derivation policy are recorded in review metadata. The rendered
`meadow-entry-terrain-path-mask.svg` is downstream evidence only and is never parsed as input.

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

No image-generation call may start until both the paired-detail correction and the blocked-scenery
bake pass synthetic RED-to-GREEN tests. A synthetic `128px` Sundrop fixture is mandatory because it
is the narrow case that exposes both underlay wash-out and a false midpoint claim from the rejected
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

A separate synthetic scenery fixture pins:

- the seven literal insert rows, two exact classes, sealed source bounds, and owning priorities;
- a complete matrix from every selected blocker/source-panel intersection to exactly one matching
  class insert, with rejection of a missing or extra source/class intersection;
- source-local mask blending before assembly, with no mutation outside the matching class mask;
- unchanged Crossroads north/south and Sundrop/Crossroads underlay blends after source enrichment;
- unchanged ordinary `128px` detail perimeter and paired-detail corrections after source
  enrichment;
- disjoint hedge/woodland row masks and rejection of a cross-class overlap;
- repeated 8-neighbor erosion around both an outer blocker edge and an irregular protected hole;
- edge-envelope weight zero at either boundary and `255` at inward depth `15`; separately, exact
  owner-relative detail limiting, organic percentile/smoothstep weight, final multiplicative weight
  that may remain below `255` at that depth, opacity, and no mutation outside the matching class
  mask;
- deterministic repeated output and rejection of a stale row, mask, class, overlap bound, helper
  formula, or source binding.

If either synthetic fixture cannot pass, generation stops for a design correction. Art correction
rounds must not be spent compensating for a defective compositor or scenery mask, and neither the
Sundrop pair policy nor the scenery-boundary policy may be silently removed.

The gate also covers the real assembly call sites. Before generation, the production finalizer's
manual singular-detail loop is replaced by the sealed `compositeMeadowEntryDetailPanels`
priority-stack helper already used by review assembly. A temporary-root assembly of the same current
source bytes must produce the same decoded master and identical pair-stage configuration/formula
provenance through both call paths, including both pair corrections. The checked-in master, exports,
approval module, generated runtime module, package textures, and public textures remain byte-frozen
at this stage. Because the new finalizer source intentionally describes pixels not yet published,
ordinary production `--check` is expected to report a stale master until final publication; this
intermediate branch state is explicitly non-publishable and every pre-publication task uses scoped
no-write checks against those frozen paths. A temporary staged-state test pins both the frozen
published hash and the differing pair-corrected future hash; final publication removes that
inequality assertion and restores normal master/`--check` equality.

## Generation and normalization

Only after the compositor-first gate and production/review parity gate pass, the latest preserved
bytes are evaluated through the corrected assembly. A presentation source or supplementary
blocked-scenery insert receives a distinct built-in image-generation call only when its corrected
native or assembled evidence still fails. A complete all-source replacement would require fifteen
distinct calls, but the implementation must not spend a cosmetic call on a preserved source that
already passes. Every changed input remains an approval-bound assembly input with its own monotonic
attempt history; inserts never become registry panels or runtime textures.

When regeneration is required, presentation calls are ordered as:

1. Sundrop north underlay, then Sundrop south underlay using the accepted north overlap;
2. Crossroads north underlay, then Crossroads south underlay using the accepted north overlap;
3. Sundrop north detail, then Sundrop south detail using the accepted north overlap;
4. connector detail, then Crossroads detail using the accepted connector overlap.

The supplementary insert inventory is:

| Insert ID | Class | Exact world bounds | Owning source / priority | Generated before |
| --- | --- | --- | --- | --- |
| `camera-underlay-sundrop-south-blocked-hedge` | `hedge` | `(0,4736)–(3200,6400)` | `camera-underlay-sundrop-south` / `1` | interim gate |
| `camera-underlay-crossroads-north-blocked-hedge` | `hedge` | `(2368,2240)–(5568,3904)` | `camera-underlay-crossroads-north` / `2` | interim gate |
| `camera-underlay-crossroads-south-blocked-hedge` | `hedge` | `(2368,3776)–(5568,5440)` | `camera-underlay-crossroads-south` / `3` | interim gate |
| `camera-underlay-crossroads-north-blocked-woodland` | `woodland` | `(2368,2240)–(5568,3904)` | `camera-underlay-crossroads-north` / `2` | interim gate |
| `camera-underlay-crossroads-south-blocked-woodland` | `woodland` | `(2368,3776)–(5568,5440)` | `camera-underlay-crossroads-south` / `3` | interim gate |
| `crossroads-blocked-hedge` | `hedge` | `(2880,2816)–(4608,4768)` | `crossroads` / `50` | final gate, after final Crossroads detail |
| `crossroads-blocked-woodland` | `woodland` | `(2880,2816)–(4608,4768)` | `crossroads` / `50` | final gate, after final Crossroads detail |

The exact sixteen blocker/source-panel intersections collapse to those seven unique insert rows:

- Sundrop-south hedge → `coast-crossroads-mouth-bank`;
- Crossroads-north hedge → `mistfen-entry-bank-east`;
- Crossroads-south hedge → `coast-crossroads-mouth-bank`;
- Crossroads-north woodland → all six selected Silverpine rows plus both selected Wildwood rows
  listed above;
- Crossroads-south woodland → `wildwood-forest-lane-west-bank`;
- Crossroads-detail hedge → `mistfen-entry-bank-east`;
- Crossroads-detail woodland → `silverpine-wall-A-east`, `silverpine-wall-A-west`, and
  `silverpine-wall-B-south`.

Each insert is generated as an organic, continuous regional surface without literal mask
rectangles, paths, buildings, props, labels, or landmarks. A `hedge` insert contains low
region-correct brush or reeds and explicitly excludes trunks and canopy masses. A `woodland` insert
contains varied tree rhythm, undergrowth, roots, ferns, leaf litter, irregular value masses, and
soft depth shadow. Crossroads-family woodland surfaces evolve from Silverpine conifer language in
the north toward Wildwood broadleaf language in the south without a straight material boundary.
Uniform normalization produces the exact row dimensions with the same `<=2x`, opaque canonical
RGBA contract as a panel. An insert may contain its scenery class across its full temporary canvas
because deterministic assembly exposes it only through the matching class mask.

The seven inserts use stable, package-owned paths:

```text
artifacts/meadow-entry/painted-v2/source-inserts/raw/<insert-id>.png
artifacts/meadow-entry/painted-v2/source-inserts/<insert-id>.png
artifacts/meadow-entry/painted-v2/source-inserts/<insert-id>.json
```

The sealed `RAW_SCENERY_INSERTS` registry uses those three `source-inserts/` paths literally for
every row. Tests reject any alias to an owning presentation source under `source-panels/`, even when
the aliased image has matching bounds or dimensions.

Their raw and normalized bytes, prompt, references, transform, exact class, owning source and
priority, mask hash, attempt history, and approval state are stored as seven literal rows in root
provenance under `blockedSceneryInserts`. They are included in package approval and storage checks
but are not registered in `MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS`, exported as runtime textures, or
copied into `public/`.

The in-memory enriched source bytes are not written back over the eight normalized presentation
PNGs. Root assembly provenance instead records a `blockedSceneryBake` section containing the exact
coverage matrix, class-mask hashes, erosion and blend formulas, helper identifiers, and decoded-RGBA
SHA-256 for each of the four affected owning sources before ordinary assembly. This keeps the
ground-only presentation candidates independently reviewable while making the final master fully
reproducible.

Image-generation references are art-only: the approved concept, region palette, the current source
panel as a composition reference, actual neighboring panel pixels, and accepted painted detail.
Route coordinates and clearance requirements are stated in the prompt and verified afterward, but
control SVGs, mask rasters, rectangular atlases, and blocked-scenery overlays are not supplied as
image references. This prevents guide geometry from becoming visible grid or rectangle artifacts.
Those controls remain authoritative deterministic QA and assembly inputs. Every reference actually
supplied to a call is recorded by path and SHA-256.

Final-panel prompts remain ground-only: quiet route cores, open approaches, no trees or tall objects
on walkable ground, no duplicate landmark or live-prop silhouette, no rectangular hedge row, and no
regular stamp grid. Insert prompts use their exact class contract above. A complete candidate that
clears the texture-energy floor but still reads as one broad grass field fails the human gate.

### Deterministic blocked-scenery bake

The bake runs on decoded source-panel bytes before ordinary nine-panel assembly. `hedgeAllowed`
contains the two `hedge` rows, while `woodlandAllowed` contains the six `tree-wall` and two
`forest-bank` rows. The original source gate proved that a full-surface insert behind a rectilinear
blocker mask can still read as a dark bar even when the mask perimeter has a `15px` feather. The
corrected contract therefore keeps the gameplay-derived masks as immutable eligibility bounds but
adds two deterministic visual operations inside them: owner-relative tone matching and an
art-derived organic clump field. It does not widen, move, or otherwise mutate a blocker.

All local means use an odd square window clipped to the insert bounds. A channel or luma mean is the
integer half-up mean of the included samples. Luma is exact integer sRGB luma:

```text
luma(r, g, b) = floor((54*r + 183*g + 19*b + 128) / 256)
boxMean(source, p, radius) = halfUpMean(source[q] for q in clipped square p +/- radius)
```

For each eligible sample pixel and RGB channel, broad source value is removed before blending. Hedge
detail is capped at `32` channel steps; woodland detail is capped at `48`. Implementations may build
prefix sums over a whole source once, but they evaluate local means and write output only for the
sealed blocker/source sample sets:

```text
detailLimit(hedge) = 32
detailLimit(woodland) = 48
insertMeanC(p) = boxMean(insertC, p, 31)
insertDetailC(p) = clamp(insertC(p) - insertMeanC(p), -detailLimit(class), detailLimit(class))
toneMatchedInsertC(p) = clamp(originalSourceC(p) + insertDetailC(p), 0, 255)
```

The organic field is derived from the accepted insert art rather than random noise or a hand-painted
mask. For every exact blocker/source-panel intersection, compute:

```text
nearLuma(p) = boxMean(insertLuma, p, 15)
farLuma(p) = boxMean(insertLuma, p, 63)
organicSignal(p) = abs(nearLuma(p) - farLuma(p))
```

The sample set for an intersection is its exact blocker bounds intersected with its owning source
bounds, then filtered by the matching class mask and all higher-precedence exclusions. `q40` and
`q80` use nearest-rank percentiles over the sorted integer signal values, with zero-based index
`ceil(percentile * sampleCount) - 1`. An intersection with fewer than `64` samples or `q40 == q80`
fails before composition; it is not rescued with coordinate noise. Between those thresholds, the
organic clump weight uses an integer half-up cubic smoothstep:

```text
t(p) = clamp(halfUp(255 * (organicSignal(p) - q40) / (q80 - q40)), 0, 255)
organicWeight(p) = meadowEntryDetailFeatherWeight(t(p), 255)
```

When blocker intersections overlap for the same insert, their organic weights combine with `max`,
making the result independent of blocker-row order. The unchanged repeated 8-neighbor erosion then
supplies the outer eligibility feather:

```text
E0 = classAllowed
E(k+1) = { p in E(k) | every pixel in p's 3x3 neighborhood is in E(k) }
sceneryInsetDistance(p) = max k such that p is in E(k)
edgeWeight(p) = meadowEntryDetailFeatherWeight(min(sceneryInsetDistance(p), 15), 15)
sceneryWeight(p) = halfUp(edgeWeight(p) * organicWeight(p) / 255)
enrichedSourceC(p) = blendMeadowEntryDetailChannel(
  originalSourceC(p),
  toneMatchedInsertC(p),
  sceneryWeight(p)
)
```

The edge envelope remains zero at the outer boundary of each class-mask union and around every hole
made by a higher-precedence live/protected mask. Where two same-class blocker rows cross, their union
is intentionally continuous. The envelope can reach `255` at inward depth `15`, but the final weight
reaches `255` only in an organic clump core. Each insert is sampled in local coordinates of its exact
owning source; its bounds and dimensions remain identical to that source. A source pixel is enriched
only when its world pixel belongs to the matching class mask. Hedge and woodland masks remain
disjoint, so their application order cannot change the output.

The writer records percentile thresholds and a weight-raster SHA-256 for every blocker/source
intersection. It also constructs one diagnostic world-space weight raster per literal blocker row by
taking the `max` of its matching intersection weights. In every row raster, pixels with final weight
at least `32` must cover between `25%` and `70%` of the eligible, non-protected row area. Orientation
is the longer bounds axis. Structural metrics then depend on the row language:

- `hedge` and `forest-bank` rows use the sparse-clump gate. For every one-pixel transverse slice
  across the short axis, compute the longest contiguous run at weight `>=254` along the unexcluded
  long-axis samples, divided by that slice's unexcluded sample count. Slices with fewer than `64`
  unexcluded samples fail. The nearest-rank p95 of those run ratios must be at most `0.30`, and the
  absolute maximum must be at most `0.50`.
- `tree-wall` rows use a continuous-contour gate because gameplay owns a continuous impassable wall.
  For each long-axis slice, compute the maximum edge-envelope weight over its eligible,
  non-protected pixels. A slice is evaluable only when that maximum is at least `32`; under the
  sealed 15px smoothstep this begins at inward depth `4` (`edgeWeight=45`), so the mandatory
  zero/low-weight end feather is excluded rather than declared a false gap. Every evaluable slice
  must contain at least one pixel with final weight `>=32`; therefore
  `weightedSliceCount === evaluableSliceCount`. A non-evaluable slice is a deterministic
  mask/envelope fact, not an organic gap; it may occur at an outer feather or inside a frozen
  same-class/protected-mask intersection and is recorded explicitly. For each evaluable slice,
  record the nearest and farthest thresholded depth along the short axis as one `(nearDepth,
  farDepth)` contour pair. The profile stores `null` for each non-evaluable slice, so identical-pair
  runs reset across those gaps. Across evaluable slices the profile must contain more than one
  distinct pair, and the longest run of an identical contour pair divided by the total evaluable
  slice count must be at most `0.50`. The ordered nullable profile receives its own SHA-256.

The first gate prevents hedges and forest banks from becoming full-length bars. The second preserves
the visual continuity of a collision wall while rejecting a uniform inserted rectangle. It does not
ban every straight path-side edge because the sealed blocker geometry is intentionally axis-aligned.
Native-detail review remains authoritative for natural hedge, bank, and forest-wall readability.

### Language-aware topology shaping

The rejected gate proves that source generation cannot reliably satisfy row topology through the
existing `edgeWeight * organicWeight` multiplication alone. The input art is organic, but a narrow
`64px` blocker belt can still contain a long saturated core, while a masked tree-wall intersection
can contain no thresholded pixel in an otherwise evaluable slice. The revised bake therefore adds
one deterministic row-topology stage after raw per-intersection contributions are calculated and
before owner-priority tone composition. The existing integer luma, clipped box means, `q40`/`q80`,
smoothstep, `15px` edge envelope, class detail caps, masks, bounds, and coverage matrix remain exact.

Each eligible contribution retains its literal blocker-row ID, insert ID, owning source ID, owner
priority, world index, raw final weight, organic signal, edge weight, and owner-relative tone. The
complete immutable collection is the raw contribution matrix. Row shaping may adjust only the
contribution weight. It cannot invent a tone, sample outside an insert intersection, change alpha,
widen a mask, or touch a protected pixel.

#### Sparse hedge and forest-bank shaping

For a `hedge` or `forest-bank` row, aggregate the raw contribution weights by world pixel using the
existing `max` rule. Build a saturated-core mask from aggregate weights `>=254`. Repeatedly apply the
existing 8-neighbour erosion, constrained to the row's eligible pixels, and recompute the exact
clump-run metrics. Stop at the smallest erosion count from `0` through the existing edge-envelope
depth `15` for which p95 is `<=0.30` and the maximum is `<=0.50`. For every original saturated-core
pixel excluded by that retained core, cap each matching sparse contribution whose raw weight is
`>=254` at `191`; every contribution below `254` remains unchanged. The `191` cap is an observable
reduction below three-quarter alpha, not a one-step threshold dodge, while preserving medium-weight
source texture and the unchanged `finalWeight>=32` coverage calculation. Failure to pass within 15
erosions is a hard source/compositor failure.

If two saturated matching contributions cover a demoted world pixel, both are capped so a
lower-priority source cannot refill the removed core. Sparse cap requests are derived independently
from the immutable raw contribution matrix, unioned per contribution with `min(rawWeight, 191)`, and
applied once. Applying the same cap more than once is idempotent. The row result records the raw and
shaped weight hashes, erosion count, original/retained core counts, and demoted-pixel count.

#### Tree-wall continuity and coverage shaping

For a `tree-wall` row, first derive evaluable slices exactly as before. A promotion-capable
contribution must belong to that literal row and already have `edgeWeight>=32`; this preserves the
existing zero/low-weight edge envelope and guarantees that promotion never exceeds the envelope.
For each evaluable slice without raw weight `>=32`, select one promotion-capable contribution by the
following descending tuple: raw final weight, organic signal, edge weight, owner priority; break
remaining ties by insert ID and then world index in ascending order. A higher numeric owner priority
is later in the sealed assembly and therefore wins that tuple. Promote only that selected
contribution to weight `32`.

After accounting for those missing-slice requests, compute the row's projected coverage over unique
world pixels. If it remains below `25%`, choose one winning promotion-capable contribution for each
remaining currently-unweighted eligible world pixel using the same tuple, sort those unique-pixel
winners by that tuple, and promote the minimum number of distinct world pixels needed to reach
`ceil(0.25 * eligiblePixelCount)`. Rows whose projected post-repair coverage is already at or above
`25%` receive no coverage-fill requests. A missing-slice repair still runs when raw coverage was
already above the lower bound. A promotion is exactly `max(rawWeight, 32)` and never changes an
already-higher weight. If the row lacks enough promotion-capable distinct world pixels to reach the
lower bound, the bake fails.

This is a subtle continuity floor, not a solid replacement strip: promoted pixels use existing
source-derived tones, add at most the threshold weight, and are chosen from the strongest available
organic contributions. The shaped row must still satisfy `weightedSliceCount ===
evaluableSliceCount`, contain more than one contour pair, keep the longest constant contour ratio at
`<=0.50`, and stay within the common `25%`–`70%` coverage range. If an evaluable slice has no eligible
source contribution, or the shaped contour remains uniform, the bake fails instead of fabricating a
pixel or weakening the gate.

Every tree-wall row derives its requests from the same immutable raw contribution matrix; one row's
projected or applied result never feeds another row's selection. Requests are unioned per
contribution with `max(rawWeight, 32)` and applied once, after which all six tree-wall metrics are
recomputed from the single shaped matrix. This makes overlapping tree-wall rows order-independent
and idempotent. The sealed sparse and tree-wall blocker rows share no eligible world pixel; contract
validation asserts that fact before shaping so cap and promotion requests cannot conflict if the
table drifts. If any final shaped row fails coverage, slice, or contour limits, the bake fails rather
than iterating or feeding one row's output back into another.

Final shaped contributions enter the existing insert/owner priority-stack composition unchanged.
Published row metrics are computed from shaped weights, while the raw metrics, request inventories,
and raw/shaped hashes remain in provenance for audit.

#### Rejected-gate audit and normalization consequence

The rejected candidate's exact row audit is binding regression input:

| Row group | Failure |
| --- | --- |
| Coast and Mistfen hedges | p95 `0.46875` / `0.53125`; maxima `0.53125` |
| Both Wildwood forest banks | p95 `0.484375` / `0.4375`; maxima `0.53125` |
| Silverpine A-east, A-west, B-north, C-east, C-west | weighted slices below evaluable slices |
| Silverpine C-east additionally | coverage `0.05550621669626998`, below `0.25` |
| Silverpine B-south | passes and must remain a no-op topology-shaping example |

The current `camera-underlay-crossroads-north-blocked-hedge` (`2.064516129032258x`) and
`camera-underlay-crossroads-south-blocked-woodland` (`2.04211869814933x`) normalized candidates are
rejected independently of their visual quality.
After the topology stage is GREEN, preserved source bytes are evaluated once. Only those two scale
failures, plus any source that still fails native review after shaping, may consume another bounded
generation attempt. A raw insert is normalizable only when both dimensions permit the canonical
`3200x1664` cover transform at `<=2x`—at least `1600px` wide and `832px` high. Attempts continue from
their recorded attempt number and still stop at five; no history is reset.

`enrichMeadowEntryPaintedV2Sources` returns those thresholds, intersection weight-raster hashes,
formula identifiers, changed-pixel counts, class counts, enriched-source hashes, and a discriminated
row-metric result. Every row includes blocker ID, language/class, eligible/weighted counts, coverage,
and weight hash. `hedge`/`forest-bank` rows return `metricKind: 'clump-runs'`, transverse-slice count,
p95 ratio, and maximum ratio. `tree-wall` rows return `metricKind: 'continuous-contour'`,
evaluable/non-evaluable/weighted slice counts, evaluable-segment count, distinct contour-pair count, longest
constant-contour-run ratio, and nullable contour-profile hash. Tests consume this returned
provenance directly; they do not reimplement the percentile, run-ratio, or contour-profile
calculations to make assertions.

A sealed coverage matrix is derived from the ten blocker rows and all nine panel bounds. Every
non-empty selected-blocker/source-panel intersection must have exactly one insert with the same
source bounds and matching class. The seven-row table above is the only valid result. This is why no
Sundrop-north, Sundrop-detail, Hero House, or connector insert exists: current source geometry
produces no matching scenery intersection for those sources. Missing, extra, or cross-class rows
fail before reading image bytes.

Only after those seven in-memory source composites are complete does the ordinary assembly run. The
Crossroads north/south `128px` axis blend and Sundrop/Crossroads `832px` family blend join enriched
underlays; the `128px` detail feather composites enriched Crossroads; and the two paired-detail
corrections run immediately after their respective second-priority members. Before any image gate,
both the review writer and production finalizer must use this same sealed priority-stack helper and
prove byte-identical results for the same decoded inputs. No insert rectangle is ever copied
directly into the master. Pixels outside `sceneryAllowed` are therefore byte-identical to an
assembly of the same eight replacement sources without inserts, and all existing panel-boundary
guarantees remain applicable to the final master. Alpha remains 255 wherever the base master is
opaque.

The bake reuses the existing canonical PNG, `blendMeadowEntryAxisPairPixel`,
`compositeMeadowEntryDetailPanel`, `meadowEntryDetailFeatherWeight`, and
`blendMeadowEntryDetailChannel` paths. Its bounded local-mean, percentile, smoothstep, and structural
metric helpers are specific to this seven-insert contract; it adds no generic authoring framework,
cleanup rectangle, runtime plane, random field, or mutable gameplay data.

After the four underlays, Sundrop north/south details, and the five underlay-owned class inserts pass
their source checks, work pauses at an interim assembled checkpoint. First, the latest preserved
bytes are re-evaluated through the corrected compositor; only sources that still fail are
regenerated, each with its own bounded attempt history. A temporary-root production-equivalent
assembly then uses those six panel candidates and five inserts with the still-pinned Hero House,
connector, and Crossroads bytes. It produces the two temporary crops, a full-master overview, native
crops for all four Sundrop intersection sides and all four Hero House edges, one matched Sundrop
ground-richness view, and one Wildwood forest-lane view proving that the masked bake is visible. The
seventh and eighth final-panel calls and the two Crossroads detail inserts do not begin until that
assembled evidence has an explicit user verdict.

The interim checkpoint does not rerun the GPU texture probe. It retains the same two `3200×3200`
decoded textures and therefore cannot exercise a different retention or maximum-texture-size
contract; final encoded bytes and decode/upload timing are not yet stable. The existing probe is
rerun once against the final two exports, where it provides actionable evidence.

Normalization remains uniform scale plus deterministic center crop with no stretch. Any candidate
requiring more than `2×` uniform upscaling is rejected. Accepted files must have exact registry
dimensions, four channels, alpha 255 everywhere, and canonical PNG chunks. Broad deterministic
cleanup rectangles, semantic-pad flattening, or unrecorded pixel patching are forbidden. The exact
blocked-scenery bake above is the sole mask-scoped composition exception. A failed candidate is
regenerated instead.

## Review evidence

The source-art gate contains:

- eight full-panel native-resolution reviews;
- five native crops per panel: four quadrants plus center;
- seven full native-resolution blocked-scenery-insert reviews and five native crops per insert;
- four native-resolution enriched-source previews for Sundrop south underlay, Crossroads north
  underlay, Crossroads south underlay, and Crossroads detail;
- both `128px` north/south underlay intersections;
- the `832px` family handoff;
- the complete `2624×128` Sundrop detail intersection and enlarged west/center/east crops;
- the complete `512×288` connector/Crossroads intersection and enlarged west/middle/east crops;
- all four sides and all four corners of each paired-detail intersection at native resolution;
- all four Hero House frontage edges against the regenerated Sundrop south surround;
- a protected/live clearance atlas;
- a literal ten-row blocked-scenery inventory with reviewed language, resolved bounds, applicable
  insert IDs/classes, source-catalog hash, and mask hash;
- one labelled blocked-scenery overlay plus one clean before/after native crop for each of the ten
  exact blocker rows;
- a clean full-master overview proving that the seven inserts do not appear as source rectangles;
- matched before/after native views at identical world coordinates for Sundrop main street,
  connector midpoint, a Silverpine tree wall, and the Wildwood forest lane;
- exactly five numbered `512×512` decoration-density contact sheets covering the pinned 67 tiles;
- region-material and route-centerline overlays shown separately from clean art.

Control-colored overlays are diagnostic and cannot substitute for clean native art. The source
gate requires explicit user approval before master publication. In the clean evidence, Sundrop main
street and the connector midpoint must each show at least three of their declared regional
ground-motif families without obscuring the route. All six `tree-wall` rows and both `forest-bank`
rows must read as organic woodland depth rather than a repeated line of identical trees. The two
`hedge` rows must remain low Coast/Mistfen brush or reeds rather than trees. Human review rejects any
full panel dominated by undifferentiated grass, a regular stamp grid, an exposed insert rectangle,
duplicated live-prop silhouette, or visual narrowing of an authored route.

## Deterministic verification

Tests must establish genuine RED before production changes and then cover:

- the eight superseded presentation hashes, seven new insert rows and hashes, and the still-pinned
  Hero House detail hash;
- exact dimensions, canonical encoding, opacity, provenance, and `<=2x` normalization limits for
  all eight presentation sources and seven inserts;
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
- the exact literal ten-row blocked-scenery inventory, reviewed language, resolved bounds, crop
  intersections, source-catalog hash, and mask hash;
- the exact seven insert IDs, classes, paths, bounds, owning source priorities, attempt histories,
  and root `blockedSceneryInserts` provenance rows, with missing, duplicate, reordered, or renamed
  rows rejected;
- the exact four affected-source decoded-RGBA hashes and complete `blockedSceneryBake` provenance,
  including local-mean radii, class detail limits, percentile thresholds, smoothstep formula,
  per-intersection weight-raster hashes and structural metrics, while the normalized presentation
  PNGs remain byte-identical to their approved ground-only rows;
- exact derivation of `selectedBlockers`, `otherProtected`, `groundAllowed`, `sceneryAllowed`,
  `hedgeAllowed`, and `woodlandAllowed`, including builder-local intermediate hashes and overlap
  fixtures proving that every non-selected protected/live, building, transition,
  reward/discovery, semantic-anchor, and route-core pixel still wins;
- a public mask result containing exactly the five retained rasters plus source hashes, with any
  diagnostic ground/scenery union derived only at its rendering call site;
- rejection when a scenery row extends beyond its exact blocker/crop intersection or when any
  protected omission other than the ten sealed blocker IDs is requested;
- the exact sixteen blocker/source-panel intersections and their seven unique source/class insert
  rows, source-local preassembly blend, disjoint hedge/woodland masks, and rejection of a missing,
  extra, cross-class, or bounds-mismatched insert;
- unchanged north/south and family axis blends, ordinary Crossroads detail feathering, both
  paired-detail corrections, and final perimeter metrics after enriched sources enter assembly;
- exact clipped half-up box means evaluated only for eligible sample pixels, integer luma,
  owner-relative detail caps, the shared exported nearest-rank helper for median, p95, `q40`, and
  `q80`, tie/undersized-intersection rejection, `meadowEntryDetailFeatherWeight(t, 255)` for organic
  smoothstep, order-independent `max`
  aggregation, repeated 8-neighbor erosion, zero class-mask boundary weight, edge-envelope reach at
  inward depth `15`, the common `25%`–`70%` coverage gate, hedge/forest-bank clump-run limits,
  tree-wall envelope-threshold evaluability, explicit mask-caused non-evaluable slices, complete
  weighting of every evaluable slice, and non-uniform nullable contour-profile limits, alpha preservation,
  deterministic repeated output, and byte non-mutation outside `sceneryAllowed`;
- a sparse-row RED fixture whose raw saturated belt exceeds both run limits, exact smallest-count
  8-neighbour erosion, cap `191` on removed core contributions, unchanged sub-`254` weights,
  unchanged `>=32` coverage, overlap refill prevention, immutable-matrix request union,
  idempotence, and hard failure if 15 erosions cannot pass;
- a tree-wall RED fixture with both missing evaluable slices and sub-`25%` coverage, exact stable
  contribution ranking including later numeric owner priority, `edgeWeight>=32` capability,
  unique-world-pixel counting, minimum promotion counts, promotion weight exactly `32`,
  immutable-matrix request union across overlapping rows, no-op behavior for passing
  `silverpine-wall-B-south`, complete shaped-slice coverage, non-uniform contour validation, and hard
  failure when an evaluable slice has no capable contribution or too few capable pixels remain for
  the coverage floor;
- raw and shaped row hashes plus sparse erosion/demotion and tree continuity/coverage-promotion
  provenance, including an exact regression over the rejected ten-row metric inventory proving all
  nine failures close without changing masks, bounds, thresholds, tones, or protected pixels;
- hard pre-normalization rejection when either raw insert dimension would require a cover scale
  above `2x`, including the rejected `2.064516129032258x` and `2.04211869814933x` transforms;
- exact reuse of the existing canonical PNG, exported `rgbStep`, shared nearest-rank,
  `blendMeadowEntryAxisPairPixel`, `compositeMeadowEntryDetailPanel`,
  `compositeMeadowEntryDetailPanels`,
  `meadowEntryDetailFeatherWeight`, and `blendMeadowEntryDetailChannel` helpers rather than copied
  formulas;
- production-finalizer/review-writer parity on the sealed priority-stack assembly before any image
  gate, with the pre-publication temporary result pinned and all checked-in package/runtime paths
  proven unchanged;
- unchanged nine-row source-panel registry and proof that no insert becomes a source-panel row,
  runtime descriptor, runtime/public asset, foreground plane, or gameplay ownership row;
- unchanged gameplay control fingerprint and exact two-crop manifest;
- rebuilt master alpha coverage, exports, overlap equality, proof bindings, approval inventory,
  runtime descriptors, storage policy, and LFS integrity, with package approval binding all seven
  insert raw/normalized/provenance triples;
- all ten proof PNG/JSON pairs binding the current master, controls, crop manifest, all nine
  presentation panels, all seven inserts, and `blockedSceneryBake` provenance;
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

The browser visual gate replaces all nine rejected captures, adds normal Silverpine tree-wall and
Wildwood forest-lane captures, and adds native-detail handoff crops and a full-master overview to
the report. Normal views must show no source rectangle, material jump, double-darkening, fallback
exposure, blur mismatch, repeated stamp, false collision cue, clearance ambiguity, debug overlay,
or incorrect review bar. Hero House frontage, Sundrop main street, connector village mouth,
connector midpoint, connector Crossroads mouth, and Crossroads Waystone must each show deliberate
regional layering rather than a single grass texture. Sundrop and connector views prove ground
richness and must not contain a baked tree or trunk. The Silverpine and Wildwood views must show a
natural forest edge with at least two distinguishable depth cues—for example canopy interior plus
varied trunks/undergrowth—while the traversable route remains unambiguous. Coast and Mistfen hedge
rows are verified in their clean native master crops. The collision-only, matched-fallback, and
deliberate render-fault diagnostic views are recaptured and remain explicitly labelled and truthful.

At least four matched before/after browser captures use identical save state, camera center,
viewport, DPR, zoom, and review-bar placement: Sundrop main street, connector midpoint, Silverpine
tree wall, and Wildwood forest lane. These comparisons are presentation evidence only; the rejected
baseline remains unapproved and the new result still requires a fresh user verdict.

The replacement report records exact hashes, dimensions, capture settings, source/package
approvals, texture decision, and the user's explicit verdict with a UTC-second timestamp. No
approval is inferred, and no Task 9 or PR3 work begins before that verdict.

## Failure handling and rollback

The currently published package remains the comparison baseline until the replacement package and
runtime evidence pass every gate. Rejected candidates and screenshots are retained as evidence but
are not published as approvals. The first approved interim candidate and its source-only correction
are explicitly superseded because both exposed the literal blocker shape. The five-insert
corrected-bake candidate is also rejected: its visible bars are gone, but nine blocker rows and two
normalization transforms remain noncompliant. Further source generation resumes only after the
language-aware topology compositor gate is green. The eligibility masks,
gameplay geometry, protected precedence, energy floors, and runtime tolerances are not weakened to
make it pass.

Each of the eight revised presentation sources and seven blocked-scenery inserts permits at most five
bounded generation attempts, recorded independently so one stubborn input cannot consume or conceal
another input's correction history. A failed ground panel is regenerated without changing its
geometry. A repeated, flat, or regionally wrong forest surface regenerates only its owning insert.
The rejected north-hedge and south-woodland scale transforms are regenerated after compositor GREEN
even if their imagery otherwise passes. All other current insert bytes are reused when their shaped
metrics and native review pass; rejection of the assembly does not justify cosmetic regeneration.
If deterministic tests reveal pixels outside `sceneryAllowed`, the bake implementation is corrected
and retested; art is not used to conceal a mask/compositor defect.

If any input reaches its limit, either revised detail pair still cannot achieve a natural handoff,
or the exact belts cannot produce convincing forest depth, the task stops for a new design decision.
It must not widen a blocker mask, admit a new blocker, add trees to open Sundrop/connector ground,
add a bridge plane, introduce live decoration or another runtime texture, move coordinates, or add
an undocumented exception.

## Out of scope

- live decorative props or new collision;
- baked trees or trunks on Sundrop or connector traversable ground;
- buildings, NPCs, pickups, discoveries, encounters, transitions, or save changes;
- camera-safe expansion beyond the approved route and two-crop union;
- a full-world PR3 master or default painted-mode activation;
- any new runtime texture, foreground layer, source-panel registry row, or public asset for the seven
  blocked-scenery inserts;
- a generic art-generation, cleanup, authoring, or runtime framework beyond the bounded seven-insert
  bake defined here;
- changes to the pinned Hero House detail source.

## Acceptance summary

The revision is ready to replace the current package only when:

1. the eight replacement presentation sources satisfy the ground-detail, clearance, and continuity
   contracts, including three visible motif families in the representative Sundrop and connector
   views;
2. the seven approval-bound inserts produce organic tree/forest depth in all eight woodland rows and
   region-correct low brush/reeds in both hedge rows, with no visible insert rectangle or mutation
   outside `sceneryAllowed`;
3. the edge-feathered pair correction, production/review assembly parity, scenery bake, exact
   perimeter and boundary metrics, density floors, mask precedence, hedge/forest-bank clump gates,
   tree-wall continuous-contour gates, raw-to-shaped topology provenance, `<=2x` normalization, and
   all unchanged assembly contracts pass deterministic tests;
4. package generation, approval, storage, static, build, E2E, and two-texture probe gates pass with
   the runtime and gameplay contracts frozen;
5. fresh normal and matched before/after browser views are visibly richer, both paired-detail
   handoffs read as one continuous landscape, and Silverpine/Wildwood read as forest rather than a
   stamped border; and
6. the user explicitly approves the final evidence.
