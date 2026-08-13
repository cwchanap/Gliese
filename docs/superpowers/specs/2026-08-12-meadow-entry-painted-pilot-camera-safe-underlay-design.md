# Meadow Entry painted pilot camera-safe underlay design

**Date:** 2026-08-12

**Status:** Approved camera-underlay design and detail-feather correction; implementation pending

**Amends:** `2026-08-10-meadow-entry-painted-background-pilot-design.md` and
`2026-08-11-meadow-entry-painted-background-pr2b-pilot-art.md`

**2026-08-13 correction:** Native-resolution Task 3 inspection proved that hard-copying the five
detail panels recreates visible rectangular boundaries over the continuous underlay. The approved
correction keeps every detail source file immutable while compositing a deterministic `128px`
inward feather at each derived detail-panel perimeter. The exact contract appears under
“Detail-panel precedence.”

## Purpose

The PR2b painted Meadow pilot loads and renders its approved art correctly, but the Task 10
browser review exposed a visual coverage defect. The three opaque runtime crops are narrower
than a normal `1920×1080` camera view. Their exact rectangular edges therefore reveal the
always-rendered fallback tile ground at Hero House, along the village–Crossroads connector, and
at the Crossroads plane boundary.

This is not a texture-placement, alpha, overlap, or fallback-restoration bug. The exported crop
pixels match the approved master, the crop overlaps are byte-identical, and all three base
textures are opaque. The pilot partition itself is too small for its approved camera route.

This amendment replaces those narrow runtime islands with a continuous, route-scoped painted
master underlay and two camera-safe runtime crops. It keeps the five accepted detailed source
panels, all gameplay geometry, and the pilot-only runtime flag. It does not expand PR2b into the
full `6400×6400` PR3 production package.

## Scope classification

This work is a `revision` under the Gliese world-expansion workflow:

- presentation coverage and art assembly change;
- runtime descriptor and ownership inventories change;
- gameplay geometry, collisions, actors, transitions, rewards, and saves do not change;
- normal gameplay remains fallback-first unless `?meadowPaintedPilot=on` is present.

## Evidence behind the change

At DPR 1 and zoom 1, the required Task 10 viewport exposes `1920×1080` world pixels. Meadow
Entry is `6400×6400`, so the centered camera scroll is clamped to `x=0…4480` and `y=0…5320`.

The failed views demonstrate the mismatch:

| Review point | Visible world rectangle |
| --- | --- |
| Hero House `(704,5920)` | `[0,1920) × [5320,6400)` |
| Connector `(2200,4688)` | `[1240,3160) × [4148,5228)` |
| Connector `(2600,4688)` | `[1640,3560) × [4148,5228)` |
| Crossroads mouth `(3264,4688)` | `[2304,4224) × [4148,5228)` |
| Waystone `(3500,4100)` | `[2540,4460) × [3560,4640)` |

The current runtime crops are:

| Crop | Bounds | Dimensions |
| --- | --- | --- |
| Sundrop | `(256,3968)–(2880,6144)` | `2624×2176` |
| Connector | `(2592,4480)–(3392,4896)` | `800×416` |
| Crossroads | `(2880,2816)–(4608,4768)` | `1728×1952` |

Those boundaries exactly match the rectangular edges in the rejected captures. The fallback
ground is expected outside those rectangles because `WorldScene.renderGround` always renders at
depth `-10`, below the current base backgrounds at depths `-9`, `-8.999`, and `-8.998`.

## Scope boundary

### Included

- The full camera envelope swept by the approved Hero House → Sundrop main street → Villager
  House 1 → village–Crossroads connector → Crossroads Waystone → return journey.
- All nine Task 10 browser review positions.
- A continuous painted presentation beneath the five existing detailed pilot panels.
- Region-aware safe-fill terrain throughout the full rectangular crop union, including the crop
  margins that intersect Mistfen, Silverpine, Wildwood, and Tidewatch outside the approved route.
- Two final runtime base crops, their overlap, provenance, approval, ownership, diagnostics, and
  fault behavior.

### Excluded

- Camera-safe coverage for the optional Crossroads exits toward Mistfen, Tidewatch, Silverpine,
  or Wildwood beyond the current pilot journey.
- A full-world opaque master or final runtime partition.
- Default activation of painted mode.
- Foreground planes, new live props, new collision, new NPCs, or gameplay-coordinate changes.
- PR3 production activation.

World areas outside the two-crop union remain deliberate fallback and must not be described as
camera-safe pilot coverage. Off-route areas inside the rectangular crop union are painted
safe-fill margins: they are not approved camera-route coverage, but they must preserve the owning
region's material identity and live visual semantics because pilot-mode players can still enter
them.

## Runtime crop contract

The three existing runtime crops are replaced by exactly two opaque base crops cut from one
flattened master:

| Crop ID | Bounds `(left, top, right, bottom)` | Dimensions | Plane | Draw order |
| --- | --- | --- | --- | ---: |
| `painted-v2-sundrop-camera-base` | `(0,3200,3200,6400)` | `3200×3200` | base | 0 |
| `painted-v2-crossroads-camera-base` | `(2368,2240,5568,5440)` | `3200×3200` | base | 10 |

The crop intersection is `(2368,3200,3200,5440)`, an `832×2240` region. The Crossroads crop is
the declared runtime overlap owner. The route-mouth proof uses the contained rectangle
`(3072,4608,3200,4768)`, which is `128×160` and crosses the eastbound route.

Both exports are cut from the same approved flattened master. Every pixel in their intersection
must therefore be byte-identical. The base plane remains fully opaque inside both crop bounds and
the master remains transparent outside their union.

No extra runtime underlay plane is introduced. Shipping the underlay as additional planes would
increase texture count, overdraw, draw-order complexity, and the fallback matrix. The underlay is
an assembly input only; runtime receives the two flattened crops.

## Camera-envelope contract

A new pure contract defines the approved pilot route as a polyline of existing authored or
already-proven journey points. It includes:

- Hero House arrival and world-edge camera clamp;
- the west and south Sundrop lanes used for the main-street pickup;
- Villager House 1 frontage and return;
- the eastbound main-street/connector segment;
- the Crossroads handoff;
- the north/east Waystone approach and return path.

For each segment, the validator sweeps a `1920×1080`, zoom-1 camera rectangle along the segment.
It expands the player segment by half a viewport (`960px` horizontally and `540px` vertically),
applies the same `6400×6400` world-edge clamping used by Phaser, then expands only non-clamped
camera edges by the browser route driver's existing `18px` reach residual. The union of the two
approved runtime crops must contain every resulting camera rectangle. The route includes the
complete westbound return and save position, not only the outbound Waystone leg.

This pure contract is a conservative geometric proof for the authored keyboard route and its
allowed settle residual; it is not a proof of Phaser's transient smooth-follow state. With
`startFollow(..., 0.14, 0.14)`, camera x/y can lag different route legs at a corner and therefore
need not lie on the current segment. The browser journey must separately sample the live camera
world view throughout Meadow traversal and prove every sampled `1920×1080` rectangle is contained
by the same crop union. The contract must fail when:

- either crop is removed or narrowed;
- a route segment, its `18px` reach residual, a live camera sample, or a review center escapes the
  crop union;
- the viewport is enlarged without a corresponding coverage review;
- a caller attempts to label an excluded biome exit as pilot-camera-safe.

## Source-panel contract

Four quiet terrain panels establish the continuous underlay:

| Panel ID | Bounds | Dimensions | Role |
| --- | --- | --- | --- |
| `camera-underlay-sundrop-north` | `(0,3200)–(3200,4864)` | `3200×1664` | Sundrop north terrain |
| `camera-underlay-sundrop-south` | `(0,4736)–(3200,6400)` | `3200×1664` | Sundrop south terrain |
| `camera-underlay-crossroads-north` | `(2368,2240)–(5568,3904)` | `3200×1664` | Crossroads north terrain |
| `camera-underlay-crossroads-south` | `(2368,3776)–(5568,5440)` | `3200×1664` | Crossroads south terrain |

The two Sundrop panels overlap vertically by `128px`; the two Crossroads panels do the same. The
two panel families overlap by `832px` horizontally throughout their shared y range.

“Sundrop” and “Crossroads” name crop/assembly families, not a license to paint each rectangle as
one biome. Their broad bounds intersect neighboring region envelopes. Within those margins the
panels follow the exact region and connector masks: Mistfen stays wet and muted, Silverpine keeps
its autumn/shrine ground language, Wildwood remains forest floor, and Tidewatch remains coastal
sand/sea-edge terrain. The panels may simplify detail, but may not replace those margins with
Sundrop grass or Crossroads cobble.

The existing detail panels remain byte-immutable assembly inputs:

- `sundrop-north`;
- `sundrop-south`;
- `hero-house-frontage`;
- `village-crossroads-connector`;
- `crossroads`.

Their hashes, normalized bytes, dimensions, and provenance remain pinned. They continue to paint
above the underlay so the accepted building frontage, street, connector, and Waystone detail is
preserved. Immutability applies to those source artifacts. It does not require every derived
master pixel at a detail-panel perimeter to equal its source pixel: the perimeter is deliberately
composited by the deterministic feather below, while the inset core remains exact.

## Art direction for the underlay

The new panels use the already approved painted-v2 visual direction:

- orthographic top-down/three-quarter presentation;
- warm late-morning light from the upper left;
- cultivated Sundrop greens, compacted earth, and readable route wear;
- a gradual transition toward the brighter Crossroads cobble and packed earth;
- region-correct Mistfen, Silverpine, Wildwood, and Tidewatch materials in off-route crop margins;
- broad material zones with quiet live-content clearances;
- no repeated tile motif at `1920×1080`;
- no baked buildings, actors, pickups, labels, doors, collision props, or stateful content;
- no water, tall vegetation, or false wall cues inside live route and interaction clearances.

Generation uses the approved concept, exact control overlays, protected/live masks, route masks,
region/connector masks, and neighboring accepted panel pixels as references. Each panel is
generated in a distinct built-in image-generation call. Raw outputs, prompts, reference hashes,
native dimensions, normalization transforms, and final hashes are recorded separately.

Normalization is uniform and never stretched. A scale greater than `2×` is rejected; the panel
must be regenerated. Splitting a panel changes the sealed four-panel contract and therefore
requires a design amendment rather than an implementation-time exception. No exception is
inherited from the earlier concept-only approval.

## Deterministic underlay assembly

Underlay composition is a separate deterministic phase before existing detail panels are
composited.
It uses decoded RGBA bytes and integer weight math so the same inputs always produce identical
master pixels.

### North/south family seams

Within each family, the `128px` north/south intersection is blended linearly by world y:

- north weight is 1 at the top edge and 0 at the bottom edge;
- south weight is the inverse;
- for shared-row index `i=0…127`, each RGB channel is
  `floor((north × (127-i) + south × i + 63) / 127)`;
- output alpha is always 255.

Thus the first and last shared rows exactly equal their owning source edge, avoiding a one-pixel
step. For Sundrop those rows are world y `4736` and `4863`; for Crossroads they are `3776` and
`3903`.

### Sundrop/Crossroads material handoff

Across the `832px` east–west family intersection `(2368…3200)`, the assembled Sundrop family and
assembled Crossroads family are blended linearly by world x:

- Sundrop owns x `2368`;
- Crossroads owns x `3199`;
- for shared-column index `i=0…831`, each RGB channel is
  `floor((Sundrop × (831-i) + Crossroads × i + 415) / 831)`;
- output alpha remains 255.

The full `832px` handoff is reviewed as a material transition, not merely as a hash-equal runtime
overlap. The existing connector detail panel is then composited within its current bounds at its
current priority using the same detail-edge policy as every other detail panel.

### Detail-panel precedence

After the underlay is complete, the five existing detail panels are processed in their unchanged
ascending-priority order. Each panel uses a `128px` inward smoothstep feather. Let `d` be the
minimum integer distance from a panel pixel to any of the panel's four inclusive perimeter edges,
and let `D = 127`:

- `q = clamp(d, 0, D)`;
- `n = q² × (3D - 2q)`;
- `w = floor((255n + floor(D³ / 2)) / D³)`;
- for each RGB channel,
  `out = floor((current × (255-w) + detail × w + 127) / 255)`;
- output alpha is `255` throughout the approved crop union.

This gives exact, testable endpoints: a perimeter pixel has `w=0` and therefore equals the
already-composed master; an inset pixel at distance `127` has `w=255` and therefore equals the
immutable detail source. Pixels farther inward also equal the source. “`128px` feather” therefore
names the inclusive distance indices `0…127`, not a `128px` semi-transparent border outside the
panel.

Later-priority detail panels feather over the current master, which already includes every
lower-priority panel. This preserves deterministic priority without a hard last-owner rectangle.
The source PNGs are never mutated. In an overlap, an exact later-panel core still wins; its feather
retains the composed lower-priority result according to the same integer weight.

Master provenance records the exact policy string
`ascending-priority-source-over-current-master-with-128px-inset-smoothstep-feather`, feather width
`128`, last inset index `127`, the integer formula, ordered detail IDs and hashes, underlay inputs,
blend bounds, and assembly order. It states separately that source bytes are immutable, derived
edge pixels are blended, and detail pixels are exact where edge distance is at least `127` unless
an even later detail panel composites over them.

## Visual ownership and failure behavior

Visual ownership is regenerated from the current HPA-586 source catalog and the two exact crop
bounds. A fallback-only visual may list one or more alternative complete owner crops:

- it is hidden when at least one complete owner crop rendered successfully;
- a visual fully contained by both crops remains hidden if either healthy crop owns it;
- a visual unique to a failed crop returns to its existing live representation;
- stateful content never becomes fallback-only;
- collision remains active regardless of texture success.

The supported failure modes remain:

- pilot disabled: zero painted assets and the complete existing fallback world;
- `regionalBackground=off`: zero painted preload/draw and no texture-failure diagnostic;
- missing or wrong-sized crop: that descriptor fails closed and its uniquely owned visuals return;
- render fault: identical fail-closed ownership restoration;
- one failed crop plus one healthy crop: the healthy crop remains visible and continues to own
  only the sources it completely covers.

A deliberate fault view may expose tile ground. That is valid diagnostic behavior. Normal pilot
views with both crops healthy may not expose tile ground anywhere inside the approved camera
envelope.

## Publication and provenance

The artifact pipeline remains controls → source panels → master → exports → proofs → approval →
generated runtime data. Every stage retains its no-write `--check` mode. Crop review budgets need
one explicit stabilization pass because they depend on the new encoded exports: a temporary-root
preflight measures both crops under the provisional controls; the manifest is then updated to the
measured whole-MiB ceilings, controls are regenerated and reapproved, and the finalizer is rerun
so master provenance binds the final control fingerprint. Only then may the package publish to
the tracked export/runtime roots. This is a bounded two-pass sequence, not an export/reapproval
loop.

Publication is fail-closed:

- all four new panel provenance records must validate;
- all five existing detail hashes must match their current approvals;
- every detail panel must fit its registered bounds and be at least `255px` on each axis so the
  `0…127` feather endpoints exist;
- the final master must pass camera-crop opacity and outside-union transparency;
- both exports must match exact master extractions;
- the runtime overlap must contain zero differing pixels;
- proof and approval inventories must match the new two-crop package;
- runtime generation cannot run from a stale approval.

No partial package is approved or wired. If generation, assembly, budget, texture, or visual review
fails, the existing pilot package remains superseded evidence and normal gameplay remains the
unchanged fallback mode.

## Texture and size gates

Two `3200×3200` opaque RGBA textures decode to exactly `81,920,000` bytes in aggregate
(`78.125 MiB`). This is below the four-texture `3200×3200` probe that retained all textures without
context loss, but that comparison is evidence, not acceptance.

The final two exported files must be probed together in the real browser. Acceptance requires:

- both uploads succeed;
- both unique texture IDs remain retained;
- `contextLost=false`;
- decoded dimensions are exactly `3200×3200`;
- hashes and encoded byte counts match the approved exports;
- no upload or WebGL error is reported.

The package keeps an aggregate encoded hard cap of `64 MiB`. After temporary-root preflight
exports exist, each crop's review threshold is set to the smallest whole-MiB ceiling at or above
its measured encoded size (`ceil(bytes / MiB) × MiB`); the two review thresholds and exact bytes
are recorded in the manifest and report. The hard cap is not raised automatically. Exceeding it
stops the amendment for repartitioning or art optimization.

The unstable sixteen-texture `1600×1600` candidate remains rejected evidence and is not used as a
fallback partition.

## Test strategy

Implementation follows test-driven development.

### Pure and package tests

Initial failing tests pin:

- four exact underlay panel rows and five immutable detail-panel rows;
- two exact runtime crops and their single overlap;
- deterministic north/south and east/west blend results on synthetic pixels;
- detail-feather endpoint behavior: perimeter pixels equal the pre-detail master, distance `127`
  pixels equal the detail source, and a midpoint equals the specified integer formula;
- overlap behavior in which a later-priority detail panel composites over the already-composed
  lower-priority result;
- unchanged hashes for all five detail source PNGs, unchanged master alpha counts, and identical
  master bytes across two assemblies from identical inputs;
- structural boundary samples proving every detail-panel outer edge equals the pre-detail master;
- the complete route, its `18px` reach residual, the static swept camera-envelope containment
  contract, and negative cases;
- master opacity inside both crops and transparency outside their union;
- exact export dimensions, extraction equality, overlap equality, and budgets;
- exact approval, provenance, proof, and generated-runtime inventories;
- fail-closed stale and mutation behavior for all `--check` paths.

### Runtime tests

Runtime tests pin:

- exactly two pilot preload assets and two successful render completions;
- unchanged flag priority and default fallback selection;
- correct placement, dimensions, base plane, and draw orders;
- ownership restoration for each individual missing/wrong-sized/render-faulted crop;
- collision and stateful content remaining live;
- no special renderer branch for underlay art.

### Gameplay and browser tests

The stabilized Task 8 journey remains the real-input gameplay contract. Only its expected painted
asset inventory changes from three to two. It must still prove:

- Hero House transition and return;
- Sundrop main-street pickup;
- live Lynn interaction in Villager House 1;
- connector traversal;
- Crossroads Waystone discovery;
- return, save, reload, exact return position, and facing;
- collision under deliberate crop failure.

The same browser test records the live Phaser camera world view during every Meadow movement
frame. It rejects any non-`1920×1080` sample or any sampled rectangle that leaves the approved
two-crop union. This runtime sample is the smooth-follow/corner-lag proof; the pure envelope test
does not claim that responsibility.

The focused pilot journeys must pass individually and with the existing bounded repeat evidence.
Full unit, E2E, check, lint, browser build, Tauri frontend build, storage/LFS, and diff checks run
before visual approval.

## Native-detail art proofs

Before runtime publication, original-resolution proof artifacts show:

- all four new underlay panels;
- both `128px` north/south source seams;
- the full `832px` Sundrop/Crossroads material transition;
- every boundary where an existing detail panel feathers into the underlay or a lower-priority
  detail composite;
- every intersected region/connector material boundary, including all off-route safe-fill margins;
- protected/live-content overlays;
- collision/control overlays;
- the flattened master across every approved camera rectangle;
- both runtime exports and their exact overlap.

Any visible seam, macro-rectangle, blur mismatch, duplicate live object, false wall, transparent
hole, or ambiguous route clearance rejects the package before browser wiring.

The rejected hard-copy master hash
`c6ce56d67ebab7edc0744b8b8f3321401530c80664cafa3245f7dd468154b137` and its per-edge metric table
are recorded in the ignored Task 3 report before replacement. For one boundary sample, RGB step is
the arithmetic mean of the three absolute channel differences across adjacent pixels normal to
the registered edge. The edge mean and p95 use all visible boundary samples after excluding
segments covered by a later-priority detail panel. The comparison distribution uses same-direction
adjacent-pixel steps whose midpoints lie `1…32px` on either side of those same visible segments,
excluding the registered edge itself and any later-priority detail coverage. Boundary-gradient
excess is `max(0, edge mean - comparison mean)`.

For every detail perimeter with visible samples, the corrected master must reduce that excess by
at least `75%` relative to the recorded hard-copy baseline, and its edge p95 may not exceed `1.25×`
the p95 of its comparison distribution. A perimeter wholly covered by later-priority art has no
final-master metric and is covered instead by the ordered-composition unit test. These metrics are
regression guards, not substitutes for original-detail inspection; a visible rectangle still
rejects the package even when the numeric gate passes.

## Task 10 replacement visual gate

The rejected Task 10 set remains documented as superseded diagnostic evidence. It is not committed
as accepted art.

After the revised package and runtime data pass all automated gates, recapture the same nine views
from scratch:

1. Hero House frontage;
2. Sundrop main street;
3. connector village mouth;
4. connector midpoint;
5. connector Crossroads mouth;
6. Crossroads Waystone;
7. collision boundary;
8. matched pilot-disabled fallback;
9. one missing-crop fallback.

Captures use a fresh build, named headed Playwright session, `1920×1080`, DPR 1, zoom 100%, and
the exact non-interactive review bar. Every normal painted view is inspected at original detail.

The visual gate fails on any:

- visible runtime or source-panel rectangle;
- exposed repeated fallback tile ground inside the approved envelope;
- seam, double-darkening, or material jump;
- stretch, excessive blur, or mismatched detail frequency;
- baked live object, duplicate visual, false door, or invisible collision;
- ambiguous route or interaction clearance;
- debug overlay in a normal capture;
- missing or incorrect review bar.

PR2b stops at explicit user approval of this replacement capture set. Approval does not activate
painted mode by default and does not begin PR3 automatically.

## Acceptance criteria

The amendment is complete only when:

- the four new underlay panels and five immutable detail panels assemble deterministically;
- detail sources retain their approved hashes, their inset cores remain exact, and their derived
  `128px` perimeters satisfy the smoothstep contract without visible rectangles;
- the flattened master is opaque throughout both runtime crops and transparent elsewhere;
- the two `3200×3200` exports have exact, byte-identical overlap pixels;
- the static `1920×1080` route envelope (including the `18px` reach residual) and every sampled
  live smooth-follow camera rectangle are fully contained by the crop union;
- controls, ownership, provenance, approval, proofs, generated data, and runtime copies agree;
- both exact runtime textures retain in a fresh browser probe without context loss;
- the stabilized real-input gameplay journey and deliberate failure cases pass;
- all automated, storage, browser, and Tauri frontend gates pass;
- all replacement Task 10 normal captures show continuous painted terrain with no exposed crop
  boundary or fallback grid;
- the user explicitly approves the replacement visual evidence.

The full Meadow Entry painted replacement remains a separate PR3 deliverable.
