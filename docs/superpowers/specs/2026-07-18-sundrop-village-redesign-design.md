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

Structure: a pure `renderLayeredPreviews(source: LayeredRegionSource): Map<string, string>`
returning filename → file contents, plus a thin CLI writing to
`docs/superpowers/reports/img/hpa-238/`. The renderer takes any `LayeredRegionSource`, so
later regions get previews for free.

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
design defect. `village-composed-collision.svg` is the one exception: it reads `pathsRegion`
blockers, which is the point of that view.

**The 2026-07-04 report is not touched.** `img/village-layered-designer-view.svg` is a
historical record of that review's moment — commit `86d5393` exists specifically to mark
that report's images as historical references. Repointing it at a regenerated artifact would
make it silently misdescribe itself as later phases re-run the generator. New output goes to
`img/hpa-238/`; the old file and its links stay exactly as they are.

## Phase 2 — Design contract

New tests in `village-layered.test.ts`; existing tests retained, with the `it.each` room
enumeration gaining `G`.

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
| A9 | every landmark anchor sits on a walkable cell of its owning room (see ownership table) |

A9 is in Wave A, not Wave B: `compileLayeredRegion` throws when a landmark sits on a
collision glyph, so a blockout that strands a landmark breaks the *build*, not just a test.

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

Load-bearing — this is what stops the plaza reading as a symmetric hedge box. Its three
openings are all different widths and all on different edges: 3-wide west mouth into Market
(rows 25–27), 3-wide north neck into the residences (cols 26–28), 2-wide south opening into
the Shrine (cols 30–31). No two openings the same.

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

### What Phase 3 does not touch

`paths` and `decor` keep their current content. Intermediate previews will therefore look
wrong on purpose — the stale path layer will disagree with the new rooms until Phase 4. The
"readable without paths" judgement happens against `village-designer-muted.svg`, which is
exactly the view that ignores it.

## Verification

Per stage: regenerate previews, review the muted designer view, run
`bun run test:unit -- --run src/lib/game/content/maps/regions/village-layered.test.ts`.

At the end of phases 1–3: `bun run check`, `bun run lint`, full `bun run test:unit -- --run`.
Wave A must be green; Wave B does not exist yet. The e2e suite and the in-game walkthrough
belong to phases 7–8.

Automated tests do not constitute completion — the issue is explicit about this, and the
blockout gate is a human preview review.
