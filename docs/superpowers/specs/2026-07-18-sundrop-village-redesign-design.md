# Sundrop Village Redesign — Design

> HPA-238. Branch: `jack65786656/hpa-238-redesign-and-implement-sundrop-village-using-the-layered-map`.
> Scope of this spec: phases 1–3 (preview tooling, design contract, region/collision blockout).
> Phases 4–8 (terrain, objects, decor, visual review, walkthrough) follow in the same branch
> after the blockout preview is approved.

## Problem

The village compiles from `src/lib/game/content/maps/regions/village-layered.ts` through
`compileLayeredRegion`, and the layered infrastructure itself is sound. The *level design*
is not. Four defects, each measured from the current source:

1. **Paths do the navigation work.** The `p` route glyph covers 22.3% of walkable cells
   (543 / 2434) and forms slabs, not corridors: rows 8–15 × cols 18–40 is a solid 23×8
   field, the widest horizontal run is 31 tiles, the tallest vertical run is 21 tiles.
2. **Rooms have no boundaries.** The `collision` layer is a perimeter rectangle plus
   scattered fragments — 143 horizontal runs, of which **136 are shorter than 3 tiles**.
   `N` and `S` are unbounded rectangles that exist only as region labels.
3. **No enforced room graph.** Nothing prevents an accidental adjacency that turns the
   layout into a ring road.
4. **A one-tile chokepoint already exists on the critical route.** Composing the village
   collision layer with the external `paths.ts` corridor walls, the only route from East
   Gate to the corridor is `col 44` at `row 4`. See "Corridor geometry" below.

Total painted coverage (34.3%) is *not* itself the problem, and `c` (4.2%) and `a` (7.8%)
forming blobs is correct — those are room floors the issue explicitly asks for.

## Constraints (from the issue)

- Keep the existing 56×48, 32px layered source; keep origin `{x: 256, y: 4352}`.
- Do not edit `village.ts` beyond its existing `compileLayeredRegion` call.
- Do not modify the layered compiler to solve a level-design problem.
- Do not move global meadow bounds or the village→crossroads corridor.
- Preserve existing semantic IDs and target maps.
- No new assets, gameplay systems, discoveries, encounters, save fields, or HUD behavior.
- Do not weaken design tests to accept the current map.

## Corridor geometry (verified, load-bearing)

The village occupies px `x 256..2048`, `y 4352..5888`.

**Coordinate convention:** `MapBlocker.x`/`.y` are rect **centers**, not top-left corners
(`WorldScene.ts:2274`: `left = landmark.x - landmark.width / 2`; the compiler emits
`x: (start.x + end.x) / 2`). Footprints below are computed on that basis. Reading them as
top-left shifts every result ~3 cols east and ~2 rows south.

Three `paths.ts` walls intrude into the village grid:

| Wall | Pixel rect | In-grid footprint |
| --- | --- | --- |
| `corridor-wall-2b` | x1775 y4510 170×64 | cols 44–50, rows 3–5 (substantially 45–49 × 4–5) |
| `corridor-wall-3b` | x2010 y4225 64×270 | cols 53–55, row 0 |
| `corridor-wall-5a` | x2040 y4225 64×270 | cols 54–55, row 0 |

### The existing chokepoint

Composing village collision with these walls (`#` village, `X` external, `!` both):

```
     890123456789012345      free horizontal runs, cols 38–55
  2  #####......#######      row 2:  43-48(6)
  3  .....#.....#..#...      row 3:  38-42(5)  44-48(5)  50-51(2)  53-55(3)
  4  .....#.XXXX!..#...      row 4:  38-42(5)  44-44(1)  50-51(2)  53-55(3)
  5  .......XXXXX......      row 5:  38-44(7)  50-55(6)
```

The village wall at cols 43 and 49 interlocks with external `2b` at cols 45–49, leaving
`col 44` as the sole passage at row 4. Cols 38–42 look open at rows 3–5 but dead-end against
the row-2 shell wall. **No source-only test can see this** — it exists only in the composed
picture, which is why the contract needs an integration assertion (test A7).

### Resolution

Move the village's row-2 shell gap from cols 43–48 to **cols 40–42**. Rows 3–5 are free
across cols 3–42, so this yields a clean 3-wide channel clearing `2b` entirely. This edits
village-owned collision only; `paths.ts` is untouched and the corridor does not move. The
player meets the soft maze slightly further west.

`2b` then sits *inside* the East Gate room as a natural obstacle, which suits that room's
intended funnel silhouette.

### Other consequences

- "East Gate" is a geometric misnomer — it is the north-east corner — but the ID is
  preserved per the semantic-ID constraint.
- **Exclusion zones.** The village collision layer must leave **cols 44–50 rows 3–5** and
  **cols 53–55 row 0** empty, letting `paths.ts` own them. Asserted by test A6.
- **Open east shell.** `collision` rows 5–8 have no wall at col 52 — the only solid is col 2
  — so cols 3–55 form one unbroken band across the full village width, reachable to the east
  grid edge. `2b` covers row 5 at cols 44–50, but **rows 6–8 are covered by nothing**.
  Phase 3 closes this deliberately as part of the `E` boundary.

## Phase 1 — Preview tooling

`tools/preview-layered-region.ts`.

Two functions, because the composed view needs an input the generic renderer must not have:

```ts
// Generic. Pure, source-only, works for any layered region.
renderLayeredPreviews(source: LayeredRegionSource): Map<string, string>

// Composed. Takes explicit overlay blockers; no implicit pathsRegion import.
renderComposedCollision(source: LayeredRegionSource, overlays: readonly MapBlocker[]): string
```

A thin CLI calls both and writes to `docs/superpowers/reports/img/hpa-238/`, passing
`pathsRegion.blockers` as the overlay. Keeping the overlay a parameter rather than an import
means the generic renderer stays pure and reusable for regions with no external walls, and
the composed view can be reused later for any region that acquires them.

Outputs:

| File | Content |
| --- | --- |
| `village-regions.svg` | region layer, one fill per room glyph, room labels |
| `village-collision.svg` | collision layer only |
| `village-terrain-paths.svg` | terrain + paths layers |
| `village-designer.svg` | combined: regions tinted, collision solid, decor glyphs, object anchors |
| `village-designer-muted.svg` | same, paths desaturated — the "readable without paths" view |
| `village-composed-collision.svg` | village collision + `paths.ts` walls, the picture test A7 asserts |
| `village-objects.md` | landmark/transition/pickup/NPC table derived from source coords |

Wired as `bun run preview:village` in `package.json`.

Determinism: fixed color table, sorted iteration order, no timestamps or absolute paths.
A unit test (`preview-layered-region.test.ts`) asserts (a) rendering the same source twice
is byte-identical, (b) every layer glyph present in the source appears in the legend, so a
new glyph cannot render as silent whitespace.

The generator is presentation-only. It must not import from `compile-layered-region.ts` for
anything other than types — previews render the *source*, so a compiler bug cannot hide a
design defect. The composed view is not an exception to this: it takes overlay blockers as
an argument, so it still never reads compiler output.

**The 2026-07-04 report is not touched.** `img/village-layered-designer-view.svg` is a
historical record of that review's moment — commit `86d5393` exists specifically to mark
that report's images as historical references. Repointing it at a regenerated artifact would
make it silently misdescribe itself as later phases re-run the generator. New output goes to
`img/hpa-238/`; the old file and its links stay exactly as they are.

## Phase 2 — Design contract

New tests in `village-layered.test.ts`; existing tests retained.

**Introducing `G` touches four hard-coded glyph lists, not one.** The current test file
repeats the room set in four places, and all must include `G` or the new room is silently
excluded from the invariants that matter most:

| Site | Current | Effect if missed |
| --- | --- | --- |
| `village-layered.test.ts:59` `MAIN_ROUTE_REGIONS` | `H P N E C` | Guild excluded from main-route flanking + cache-distance checks |
| `village-layered.test.ts:138` `it.each` | `H P M N S E C` | no assertion that `G` exists at all |
| `village-layered.test.ts:149` connectivity targets | `P M N S E C` | `H`→`G` connectivity never checked |
| `village-layered.test.ts:183` `regionGlyphs` | `H P M N S E C` | objects in `G` fail the region-or-path check |

Phase 2 replaces all four with shared constants (`ROOM_GLYPHS`, `CRITICAL_ROUTE_GLYPHS`)
exported from one place, so the next room added cannot repeat this.

**Tests land in two waves.** The contract constrains things that phases 3, 4, and 5 author
separately, so introducing it all at once would leave the suite red between phases — the
`p` cap would fail from Phase 2 until Phase 4, for instance. Wave A depends only on
`regions` + `collision` and lands with the Phase 3 blockout. Wave B depends on `paths` and
object placement and lands with phases 4–5. This sequences the contract; it does not weaken
it, and no test is skipped or marked pending.

**Representation.** Every test operates on the **source layers**
(`layers.collision`, `layers.regions`, `layers.paths`), consistent with the existing
`walkableCells()` helper — never on `compileLayeredRegion` output. Landmark rects and
decor-collision rects are compiler outputs and are therefore invisible to these tests by
construction; test A5's "unreachable pocket" cannot be tripped by the well, the fountain, or
the lantern collision boxes. Test A7 is the deliberate exception and composes `pathsRegion`.

### Parameters

| Parameter | Value | Rationale |
| --- | --- | --- |
| Critical-route corridor width | ≥ 3 tiles | issue §4 |
| Secondary / pocket approach width | ≥ 2 tiles | issue §4 |
| Room opening width | ≥ 3 critical, ≥ 2 secondary | issue §3 |
| Min collision run length | ≥ 3 tiles, **maximal in either axis** | kills the 136 micro-fragments |
| Route `p` coverage | ≤ 12% of walkable | current 22.3% — binding |
| Route `p` thickness | no 5×5 block entirely `p` | current map has a 23×8 slab — binding |
| Floor `c` / `a` containment | `c` ⊆ P∪G, `a` ⊆ S | terrain identity, not navigation |
| Total painted coverage | ≤ 40% | backstop; current 34.3%, non-binding by itself |
| Transition approach clearance | ≥ 2 free walkable tiles along the approach axis | issue §5 |
| Cache distance from main route | ≥ 5 tiles | existing test, retained |

Bounding path *thickness* rather than run length is deliberate: a legitimate 3×20 corridor
has a 20-tile run along its axis but is only 3 thick, so a run-length cap would reject good
corridors and a 5×5 inscribed-square cap does not.

**Collision runs are maximal in either axis.** A cell satisfies the ≥3 rule if its maximal
horizontal run *or* its maximal vertical run is ≥ 3. Without this, the col-2 perimeter — one
tile wide, 42 tiles tall — reads as 42 separate one-tile horizontal runs and fails. No
perimeter exemption is needed once the rule is stated per-axis.

**Transition approach direction.** `LayeredTransition` carries `arrival` (the
destination-side facing) but no outgoing direction, so "in front of" is otherwise undefined.
The approach axis is derived: a transition belongs to the landmark whose rect it sits
nearest, and the approach direction is the cardinal direction from that landmark's center
toward the transition. Clearance is then measured along that axis. This needs no new field
and no compiler change; the derivation lives in the test file.

### The room graph

**Definition of adjacency.** Rooms are separated by a one-tile divider that openings pierce,
so neither raw region-cell contact nor global BFS reachability expresses what we mean —
the first calls rooms non-adjacent despite an opening, the second makes the graph a
trivial star. The test uses reachability restricted to the pair:

> Rooms `A` and `B` are **adjacent** iff some walkable cell labelled `A` is 4-connected to
> some walkable cell labelled `B` by a chain of walkable cells whose labels are all in
> `{A, B, unlabelled}`.

"Walkable" means `layers.collision[row][col] === '.'`; "labelled" means the cell's glyph in
`layers.regions`; "unlabelled" is `.` (divider and interstitial cells). This makes an
opening the *only* way two rooms become adjacent, which is exactly the property tests A2 and
A3 constrain the width of.

The test asserts the graph equals **exactly** this edge set — no more, no less:

```
H–P   H–M   H–S        home is the return hub
P–M   P–N   P–S        plaza is the navigation hub
N–G   G–E   E–C        the spine's north half
```

- critical route: `H → P → N → G → E → C`
- west loop: `H → M → P → H`
- shrine loop: `H → S → P → H`

"No ring road" falls out as a consequence rather than needing its own heuristic: `M` and `S`
never touch, and `N/G/E` never touch `M/S`. Any accidental extra adjacency fails the test.

### Wave A — structural (lands with Phase 3)

| # | Test |
| --- | --- |
| A1 | room adjacency graph equals the 9-edge set exactly |
| A2 | every opening meets its width class (≥3 critical, ≥2 secondary) |
| A3 | no critical-route tile has a cross-section narrower than 3 |
| A4 | every collision run is ≥ 3 tiles, maximal in either axis |
| A5 | no unreachable walkable pocket (BFS from spawn covers all walkable cells) |
| A6 | exclusion zones (cols 44–50 rows 3–5; cols 53–55 row 0) are empty in village source |
| A7 | **integration:** composing village collision with `pathsRegion` blockers, the critical route is ≥3 wide end to end and `E` reaches `C` |
| A8 | west and shrine loops both exist and are distinct simple cycles |
| A9 | every landmark, decor glyph, and object anchor sits on a walkable cell of its owning room |
| A10 | no object **footprint** (padded) intersects an opening cell or a critical-route cell |

A9 is in Wave A, not Wave B: `compileLayeredRegion` throws when a landmark *or a decor glyph*
sits on a collision glyph, so a blockout that strands either breaks the *build*, not just a
test.

### A10 — footprint containment

A9 only checks anchor cells, and anchors are single tiles while buildings are not.
`hero-house-exterior` is 235×246px ≈ 7×8 tiles, and `WorldScene` blocks player movement
against landmark rects (`isPlayerMovementBlockedByLandmark`, WorldScene.ts:2186) and decor
collision rects, padded by `playerRadius = 12`. A landmark placed at a legal anchor can
therefore seal a 3-tile opening while every other Wave A test passes.

A10 closes this **from the source**, not from compiled output. Landmark `width`/`height`,
`DecorGlyphSpec.collision`, and the tile geometry are all already in
`LayeredRegionSource`, so the footprint is computable without touching WorldScene:

> For every landmark, every decor glyph carrying `collision`, and every ambient NPC, the
> footprint rect expanded by 12px must not intersect any opening cell or any critical-route
> cell.

A footprint **may** overlap solid cells — a building sitting partly inside a hedge or
divider blocks nothing that was passable. Only openings and route cells are protected. This
matters for fit: `shrine-of-aurora` is 246×333px ≈ 7.7×10.4 tiles and `S` is only 11 rows
tall, so centered at row 38 it spans rows 32.8–43.2 and necessarily overlaps the row-32
divider. That is legal; what it must not do is reach cols 30–31 at row 32, the `P–S`
opening. A10 constrains *where* the large landmarks sit rather than whether they fit.

Deliberately conservative in the safe direction: `getLandmarkCollisionRects` carves a
doorway out of the full bounds, so treating a landmark as its solid rect over-blocks rather
than under-blocks. Extracting WorldScene's collision geometry into a shared pure module
would give an exact answer, but that is a map-system change and the issue scopes this work
to level design; the conservative source-level test buys the same protection without it.

### Route definition (A3, A7, A10)

Wave A runs before the path layer is re-authored, so "critical-route tile" cannot mean a
`p` cell. It is defined structurally:

> The **critical route** is the union of the room interiors of `H`, `P`, `N`, `G`, `E`, `C`
> and the five opening cell-sets connecting them, restricted to walkable cells.

Width is measured along a concrete traversal: take the BFS-shortest walkable path from the
`H` centroid to the `C` centroid; at each cell on it, measure the maximal free run
perpendicular to the local direction of travel. A3 asserts that run is ≥ 3 everywhere.

**Occupancy rule.** `pathsRegion` blockers are not grid-aligned, so A7 needs a tile rule:
a tile counts as blocked iff a blocker rect covers **more than 50% of the tile's area**.
This is why `corridor-wall-2b` is listed both as bounding box (cols 44–50, rows 3–5) and as
substantial footprint (cols 45–49, rows 4–5) — A7 uses the latter.

### Wave B — content (lands with phases 4–5)

| # | Test |
| --- | --- |
| B1 | route `p` coverage ≤ 12% |
| B2 | no 5×5 block entirely `p` |
| B3 | floor containment: `c` ⊆ P∪G, `a` ⊆ S |
| B4 | total painted coverage ≤ 40% |
| B5 | transition approach clearance ≥ 2 along the derived axis |
| B6 | every object reachable by BFS from spawn |
| B7 | no landmark rects overlap; no object sits inside a landmark rect |
| B8 | cache-region ownership and ≥5-tile main-route distance (existing tests) |

## Phase 3 — Region and collision blockout

Approach: **spine + pockets**. One legible critical spine with Market and Shrine hanging off
as pockets that each rejoin at a second point, making them real loops rather than dead ends.

### Room extents

Uniform model: every pair of rooms is separated by a **one-tile divider** pierced by exactly
one opening. Ranges are inclusive. The outer shell stays at col 2 / col 52 / row 2 / row 44.

| Room | Cols | Rows |
| --- | --- | --- |
| `C` Crossroads Corridor | 38–48 | 0–1 |
| `E` East Gate | 36–50 | 3–9 |
| `G` Guild Forecourt | 36–48 | 11–18 |
| `N` North Residences | 14–34 | 8–18 |
| `M` Market / Blacksmith | 5–18 | 20–31 |
| `P` Well Plaza | 20–33 | 20–31 |
| `H` Home Yard | 6–22 | 33–43 |
| `S` Shrine Garden | 24–44 | 33–43 |

### Openings

Every graph edge gets exactly one opening. Critical-route openings are 3 wide; secondary
openings are 2–3.

| Edge | Divider | Opening | Width | Class |
| --- | --- | --- | --- | --- |
| `H–P` | row 32 | cols 20–22 | 3 | critical |
| `P–N` | row 19 | cols 26–28 | 3 | critical |
| `N–G` | col 35 | rows 14–16 | 3 | critical |
| `G–E` | row 10 | cols 42–44 | 3 | critical |
| `E–C` | row 2 | cols 40–42 | 3 | critical |
| `H–M` | row 32 | cols 8–9 | 2 | secondary |
| `P–M` | col 19 | rows 25–27 | 3 | secondary |
| `P–S` | row 32 | cols 30–31 | 2 | secondary |
| `H–S` | col 23 | rows 36–37 | 2 | secondary |

### Forced-solid segments

Each prevents an adjacency absent from the graph. All are asserted by A1 rather than
trusted:

| Segment | Prevents |
| --- | --- |
| row 19, cols 14–18 | `M–N` — would let `H→M→N→G→E` bypass the plaza |
| col 35, rows 8–10 | `E–N` — `N` rows 8–18 and `E` rows 3–9 overlap at rows 8–9 |
| cols 34–51, rows 19–32 | `G–S` — the east flank; Guild would drain into the Shrine |
| row 2, all but cols 40–42 | uncontrolled north exits |
| rows 6–8, col 52 | the open east shell |

### Plaza asymmetry

`P` is the hub, so it carries **four** openings — one per graph edge (`H`, `M`, `N`, `S`).
Three are 3 wide and one is 2, and two of them (`H–P` and `P–S`) share the south edge. The
asymmetry therefore does *not* come from every opening differing; it comes from:

- the **south edge carrying two openings of different widths** — 3 at cols 20–22, 2 at
  cols 30–31 — set off-center against each other rather than mirrored
- the **north neck being the narrowest exit relative to its wall length**, pinching a
  14-wide room down to a 3-wide passage
- the **west mouth sitting low** (rows 25–27 of a 20–31 room) rather than centered

Composition, not opening count, is what stops it reading as a hedge box. A2 enforces the
widths; the off-center placement is a review-gate judgement, not a test.

### Silhouette requirements

Each room gets a distinct boundary treatment so the village reads with paths hidden:

- `H` — enclosed yard, opens north and east; Hero House anchors the west side
- `M` — narrow working lane, long unbroken west wall, stalls breaking the east edge
- `P` — irregular pentagon, widest at the well, no two openings the same width
- `N` — dense, building masses form the boundary rather than hedge
- `G` — wide institutional forecourt, single deep approach
- `S` — soft organic edge, tree masses instead of hedge runs
- `E` — funnel narrowing toward the corridor mouth, with external `2b` as an interior obstacle

Boundaries use runs of ≥ 3 tiles throughout, replacing the 136 sub-3-tile fragments.

### Object holding positions

Phase 3 relocates objects, because it must. Several current anchors fall outside every
proposed room — `item-shop-exterior` (8,18), `villager-house-1-exterior` (19,3),
`villager-house-2-exterior` (29,4), `blacksmith` (4,28), `villager-house-3-exterior` (40,31)
— and `compileLayeredRegion` throws when a landmark sits on a collision glyph. Leaving them
put would break the build between phases 3 and 5, not merely fail a test.

Phase 3 therefore moves every object to a **valid holding position** inside its owning room,
satisfying A9. Final compositional placement — anchoring sightlines, standing NPCs beside
routes, siting rewards as deliberate detours — remains Phase 5. IDs and target maps are
preserved throughout.

Ownership table:

| Object | Room |
| --- | --- |
| `hero-house-exterior` + `meadow-to-hero-house` | `H` |
| `item-shop-exterior` + `meadow-to-item-shop` | `M` |
| `blacksmith` | `M` |
| `village-market-cache`, `village-woodcutter` | `M` |
| `sundrop-well`, `village-wanderer` | `P` |
| `villager-house-1-exterior` + `meadow-to-villager-house-1` | `N` |
| `villager-house-2-exterior` + `meadow-to-villager-house-2` | `N` |
| `guild-hall-exterior` + `meadow-to-guild-hall` | `G` |
| `shrine-of-aurora` + `meadow-to-shrine-of-aurora` | `S` |
| `villager-house-3-exterior` + `meadow-to-villager-house-3` | `S` |
| `village-shrine-cache`, `village-pilgrim` | `S` |
| `village-crier` | `E` |

### Stranded decor

`buildMapDecor` throws on the same condition as landmarks — a decor glyph over a collision
glyph. Four of the sixteen current glyphs strand under the new blockout:

| Glyph | Cell | Why |
| --- | --- | --- |
| `A` gateArch | (44, 2) | row 2 solid outside cols 40–42 |
| `l` poleLantern | (47, 2) | same |
| `h` hangingLantern | (23, 19) | `N`\|`P` divider, outside the cols 26–28 opening |
| `s` scarecrow | (3, 37) | west of `H` (cols 6–22) |

Phase 3 relocates these four to valid cells in the nearest owning room. `A` and `l` follow
the moved gate to cols 40–42; the rest are holding positions pending the Phase 6 decor pass.

### What Phase 3 does not touch

`paths` keeps its current content — the stale path layer will disagree with the new rooms
until Phase 4, so intermediate previews look wrong on purpose. The "readable without paths"
judgement happens against `village-designer-muted.svg`, which is exactly the view that
ignores it.

Decor is **not** frozen, but is only relocated where the blockout strands it. The general
rule for Phase 3: it does whatever is needed to make the map *compile and traverse*, and
nothing that makes it *look good* — composition is phases 4–6.

## Verification

Per stage: regenerate previews, review the muted designer view, run
`bun run test:unit -- --run src/lib/game/content/maps/regions/village-layered.test.ts`.

At the end of phases 1–3: `bun run check`, `bun run lint`, full `bun run test:unit -- --run`.
Wave A must be green; Wave B does not exist yet. The e2e suite and the in-game walkthrough
belong to phases 7–8.

Automated tests do not constitute completion — the issue is explicit about this, and the
blockout gate is a human preview review.

---

## As-built reconciliation (post-implementation, 2026-07-19)

The body above is the design as authored *before* the blockout. Implementing Wave A
surfaced defects that moved rooms, gates, and objects, and changed two test definitions.
The values below are authoritative and supersede the corresponding sections above; the
prose is left intact as the design record. The mechanical source of truth is the compiled
`meadowEntryMap` and the A1–A11 contract in `village-layered.test.ts`.

**Room extents (final).** Outer shell `{c0:2, c1:52, r0:2, r1:46}`. Inclusive ranges:

| Room | Cols | Rows |
| --- | --- | --- |
| `C` Crossroads Corridor | 38–48 | 0–2 |
| `E` East Gate | 36–50 | 3–9 |
| `G` Guild | 36–50 | 11–31 |
| `N` North Commons | 4–34 | 4–18 |
| `M` Market | 3–19 | 20–31 |
| `P` Plaza | 21–33 | 20–31 |
| `H` Home Yard | 4–23 | 33–45 |
| `S` Shrine | 25–48 | 33–45 |

`C` grew to three rows and meets `E` **directly** — row 2 is `C`'s own bottom row, row 3 is
`E`'s top row, no divider. The north gate is therefore 11 wide, not 3. Gate jambs at cols 37
and 49 (rows 0–1) stay solid, or `C` leaks to the outside ring. The perimeter is sealed:
rooms no longer touch the meadow margin outside the shell (367 such cells are correctly
unreachable — A5 scopes reachability to village cells).

**Openings (v1).** Critical (on the H→C route, ≥3 wide): `H-P` 21–23/32 · `N-P` 26–28/19 ·
`G-N` 35/14–16 · `E-G` 48–50/10 · `C-E` 38–48/2. Secondary (≥2): `H-M` 4–5/32 · `M-P`
20/20–22 · `P-S` 30–31/32 · `H-S` 24/36–37. Superseded by v3 — see "Revisions" below.

**Spawn.** Moved to world `(624, 5776)` — two tiles south of the relocated hero-house door,
facing up at it — because the redesign moved the hero house over the old spawn, which
`normalizePlayerPosition` was rescuing to `(784, 5520)`.

**Villager-house-3.** Relocated to grid `(43, 38)` (world x 1648) to clear both of the
shrine's gate approaches; its door, interior return arrival, and exterior landmark moved with
it. `village-shrine-cache` moved to `(41, 44)` to avoid being entombed under it.

**A10 (changed).** The plan's A10 measured landmark *footprints* (`footprintTiles`, area
overlap) against every walkable cell of the six route rooms. That is not the game's collision
rule (which is *tile-centre inside a rect padded by the player radius*), and a route BFS'd on
the bare collision layer walks straight through a building (the layer under a landmark reads
`.`). As built, A10 protects the **critical gate throats and their walkable approach cells**,
measured against the composed `meadowEntryMap` rects — the check that actually catches a
building sealing a gate.

**A11 (added, not in the original plan).** Full per-room passability: flood-fill from the
spawn under the composed collision rule and require every room's reachable-standable count to
equal its total-standable count and be non-zero. Added because the village became impassable
twice during implementation — a building's rendered rect sat on the cells its own room used to
reach its own gate — a defect class A1–A10 cannot see, because they read the collision *layer*
and the layer was fine both times.

## Revisions

### v2 — building spacing, sparse decor, open bands (superseded in part)

Three rounds of human visual-gate feedback ("chaotic and crowded", "still too crowded",
"the obstacles don't look natural", "check for overlap"):

- **Buildings re-spaced.** Three pairs sat wall-to-wall (item-shop + blacksmith in `M`, the
  two north houses in `N`, shrine + villager-house-3 in `S`). Redistributed to one or two
  well-separated buildings per room. Buildings are landmark rects, not collision glyphs, so
  this left the room/gate skeleton untouched.
- **Decor thinned.** Decor sprites render far larger than their one-tile anchor — a maple is
  ~7×9 tiles, a market stall ~7×6 — so the grouped pass had props overlapping buildings and
  each other. Reduced to nine sparse, disjoint glyphs.
- **A12 added.** `compileLayeredRegion` validates only that an object's *anchor tile* is
  walkable; it does **not** check sprite overlap. A12 closes that gap in the contract, since
  the compiler will not.
- **Open bands (reverted in v3).** The eight compartments were opened into three bands. This
  read better but collapsed the room graph — see below.

### v3 — partial spurs (current)

The issue was rewritten to *"Complete Sundrop Village logical layout and control-map
blockout"*, with final environmental artwork split out to HPA-307 (baked regional background
rendering). Two consequences for this spec:

1. **Scope.** Tile terrain is explicitly fallback/control rendering. Decor stays sparse by
   policy, not just by taste — chasing visual richness is now an explicit non-goal, which
   retroactively justifies the v2 decor thinning.
2. **The route graph is normative.** The issue spells out the target route structure, and it
   is exactly the nine edges this spec already specified. The v2 band layout violated it:
   every room sharing a band abutted every other, giving **12** edges — it gained `E-N`,
   `E-P`, `G-P`, `M-N` and lost `H-P`, which is on the critical route. That also pushed the
   village toward the ring road the acceptance criteria forbid.

v3 keeps the nine-edge skeleton but cuts each divider back to a **partial spur**: a boundary
is implied by a short wall stub rather than enclosed by a full-height one, so a gate is a
street the room opens onto rather than a slot punched through a wall. This satisfies the
openness feedback and the route graph simultaneously — the failure mode of both earlier
attempts.

**Openings (v3).** Critical (≥3): `H-P` 20–23/32 · `N-P` 24–29/19 · `G-N` 35/14–18 · `E-G`
48–50/10 · `C-E` 38–48/2. Secondary (≥2): `H-M` 4–7/32 · `M-P` 20/20–24 · `P-S` 29–32/32 ·
`H-S` 24/36–40. Every gate is wider than its class minimum, so the width classes in the
contract are the floor the layout may not drop under, not a description of it.

**`E-G` was not widened.** A first draft pulled it west to col 46; A10 rejected it, because
row 11 cols 46–47 are under the guild hall — walkable on the collision layer, unstandable
once the landmark composes in. The gate stayed at 48–50. This is A10 doing exactly the job
it was rewritten for.

**Openness is a collision-layer property here, not a decor one.** The rooms were always
large (`N` is 31×15, `S` 24×13); what read as cramped was full-height dividers slicing the
space plus, before v2, building and decor density. v3 changes only the collision layer.
