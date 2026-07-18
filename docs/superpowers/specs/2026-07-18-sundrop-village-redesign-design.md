# Sundrop Village Redesign — Design

> HPA-238. Branch: `jack65786656/hpa-238-redesign-and-implement-sundrop-village-using-the-layered-map`.
> Scope of this spec: phases 1–3 (preview tooling, design contract, region/collision blockout).
> Phases 4–8 (terrain, objects, decor, visual review, walkthrough) follow in the same branch
> after the blockout preview is approved.

## Problem

The village compiles from `src/lib/game/content/maps/regions/village-layered.ts` through
`compileLayeredRegion`, and the layered infrastructure itself is sound. The *level design*
is not. Three concrete defects, measured from the current source:

1. **Paths do the navigation work.** The `p` route glyph covers 22.3% of walkable cells
   (543 / 2434) and forms slabs, not corridors: rows 8–15 × cols 18–40 is a solid 23×8
   field, the widest horizontal run is 31 tiles, the tallest vertical run is 21 tiles.
2. **Rooms have no boundaries.** The `collision` layer is a perimeter rectangle plus
   scattered fragments — 143 horizontal runs, of which **136 are shorter than 3 tiles**.
   `N` and `S` are unbounded rectangles that exist only as region labels.
3. **No enforced room graph.** Nothing prevents an accidental adjacency that turns the
   layout into a ring road.

Note that total painted coverage (34.3%) is *not* itself the problem, and `c` (4.2%) and
`a` (7.8%) forming blobs is correct — those are room floors the issue explicitly asks for.

## Constraints (from the issue)

- Keep the existing 56×48, 32px layered source; keep origin `{x: 256, y: 4352}`.
- Do not edit `village.ts` beyond its existing `compileLayeredRegion` call.
- Do not modify the layered compiler to solve a level-design problem.
- Do not move global meadow bounds or the village→crossroads corridor.
- Preserve existing semantic IDs and target maps.
- No new assets, gameplay systems, discoveries, encounters, save fields, or HUD behavior.
- Do not weaken design tests to accept the current map.

### Corridor geometry (verified, load-bearing)

The village occupies px `x 256..2048`, `y 4352..5888`. The village→crossroads corridor is a
soft maze of hedges owned by `paths.ts`, sitting at cols 44–53, rows −14..+4 in village-tile
coordinates. `corridor-wall-2b` (x1775, y4510) lands **inside** the village grid at cols
45–50, row 4.

Consequences the blockout must respect:

- The exit vents **north** through the existing gap in `collision` row 2 at cols 43–48.
- "East Gate" is a geometric misnomer — it is the north-east corner — but the ID is
  preserved per the semantic-ID constraint.
- The village's own collision layer must not duplicate or fight the external corridor walls
  at cols 44–50, rows 0–5.

## Phase 1 — Preview tooling

`tools/preview-layered-region.ts`.

Structure: a pure `renderLayeredPreviews(source: LayeredRegionSource): Map<string, string>`
returning filename → file contents, plus a thin CLI that writes the map to
`docs/superpowers/reports/img/`. The renderer takes any `LayeredRegionSource`, not just the
village, so later regions get previews for free.

Outputs:

| File | Content |
| --- | --- |
| `village-regions.svg` | region layer, one fill per room glyph, room labels |
| `village-collision.svg` | collision layer only |
| `village-terrain-paths.svg` | terrain + paths layers |
| `village-designer.svg` | combined: regions tinted, collision solid, decor glyphs, object anchors |
| `village-designer-muted.svg` | same, paths desaturated — the "readable without paths" view |
| `village-objects.md` | landmark/transition/pickup/NPC table derived from source coords |

Determinism: fixed color table, sorted iteration order, no timestamps or absolute paths in
output. Re-running on an unchanged source produces byte-identical files, so a stale preview
shows up as a real diff. Wired as `bun run preview:village`.

The generator is presentation-only. It must not import from `compile-layered-region.ts` for
anything other than types — previews render the *source*, so a compiler bug cannot hide a
design defect.

## Phase 2 — Design contract

New tests in `village-layered.test.ts` (existing tests retained; the `it.each` room
enumeration gains `G`).

### Parameters

| Parameter | Value | Rationale |
| --- | --- | --- |
| Critical-route corridor width | ≥ 3 tiles | issue §4 |
| Secondary / pocket approach width | ≥ 2 tiles | issue §4 |
| Room opening width | ≥ 2 tiles, ≥ 3 on critical route | issue §3 |
| Min collision run length | ≥ 3 tiles | kills the 136 micro-fragments |
| Route `p` coverage | ≤ 12% of walkable | current 22.3% — binding |
| Route `p` thickness | no 5×5 block entirely `p` | current map has a 23×8 slab — binding |
| Floor `c` / `a` containment | `c` ⊆ P∪G, `a` ⊆ S | terrain identity, not navigation |
| Total painted coverage | ≤ 40% | backstop; current 34.3%, non-binding by itself |
| Transition approach clearance | ≥ 2 free walkable tiles in front | issue §5 |
| Cache distance from main route | ≥ 5 tiles | existing test, retained |

Bounding *thickness* rather than run length is deliberate: a legitimate 3×20 corridor has a
20-tile run along its axis but is only 3 thick, so a run-length cap would reject good
corridors and a 5×5 inscribed-square cap does not.

### The room graph

The strongest test asserts the room adjacency graph equals **exactly** this edge set —
no more, no less:

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

### Test list

Mapping the issue's eleven categories:

1. room connectivity and room graph → exact edge-set equality
2. minimum opening widths → every inter-room gap ≥ 2 (≥ 3 on critical route)
3. one-tile critical chokepoints → every critical-route tile has ≥ 3-wide cross-section
4. west and shrine exploration loops → both simple cycles exist and are distinct
5. landmark-to-region ownership → each landmark anchor sits on its expected glyph
6. transition approach clearance → ≥ 2 walkable tiles in front of each transition
7. NPC and reward reachability → BFS from spawn reaches every object
8. landmark/object overlap → no landmark rects overlap; no object inside a landmark rect
9. path coverage limits → the `p` / `c` / `a` parameters above
10. isolated collision fragments → every run ≥ 3 tiles; no unreachable walkable pocket
11. region ownership of caches → existing tests, retained

## Phase 3 — Region and collision blockout

Approach: **spine + pockets**. One legible critical spine with Market and Shrine hanging off
as pockets that each rejoin at a second point, making them real loops rather than dead ends.

Room extents on the 56×48 grid, keeping the existing outer shell at col 2 / col 52 / row 2 /
row 44:

| Room | Cols | Rows |
| --- | --- | --- |
| `H` Home Yard | 6–22 | 33–43 |
| `M` Market / Blacksmith | 5–18 | 20–31 |
| `P` Well Plaza | 20–33 | 21–32 (pinched to cols 24–30 at rows 21–23) |
| `N` North Residences | 14–36 | 8–18 |
| `G` Guild Forecourt | 36–48 | 10–18 |
| `E` East Gate | 40–50 | 4–9 |
| `C` Crossroads Corridor | 44–48 | 0–3 |
| `S` Shrine Garden | 25–44 | 33–43 |

### Plaza asymmetry

Load-bearing — this is what stops the plaza reading as a symmetric hedge box:

- fat **west mouth**, 3 wide at rows 25–27, into Market
- pinched 3-tile **north neck**, cols 26–28 at rows 19–20, into the residences
- narrow 2-tile **south opening**, cols 30–31 at row 32, into the Shrine

### Loop-closing links

The room extents above are room *bodies*; rooms are separated by a one-tile divider that the
openings pierce. The Plaza's three openings are specified above. The two remaining links both
close an exploration loop, so if either is omitted the corresponding pocket degrades to a
dead end and the room-graph test fails:

- **H–M**, 2 wide at row 32, cols 8–9 — closes the west loop `H → M → P → H`
- **H–S**, 2 wide at cols 23–24, rows 36–37 — closes the shrine loop `H → S → P → H`

### Walls the room graph forces

Two are easy to miss and both would silently create a ring road:

- **row 19, cols 14–18** must be solid, or Market touches North Residences and
  `H→M→N→G→E` bypasses the plaza entirely.
- **cols 34–51, rows 19–32** (the east flank) must be solid building or hedge mass, or
  Guild Forecourt drains straight down into the Shrine Garden.

### Silhouette requirements

Each room gets a distinct boundary treatment so the village reads with paths hidden:

- `H` — enclosed yard, opens north and east; Hero House anchors the west side
- `M` — narrow working lane, long unbroken west wall, stalls breaking the east edge
- `P` — irregular pentagon, widest at the well, no two openings the same width
- `N` — dense, building masses form the boundary rather than hedge
- `G` — wide institutional forecourt, single deep approach
- `S` — soft organic edge, tree masses instead of hedge runs
- `E` — funnel narrowing toward the corridor mouth

Boundaries use runs of ≥ 3 tiles throughout, replacing the 136 sub-3-tile fragments.

### What Phase 3 does not touch

`paths`, `decor`, and `objects` keep their current content. Intermediate previews will
therefore look wrong on purpose — object anchors will sit in odd places until Phase 5. The
"readable without paths" judgement happens against `village-designer-muted.svg`, which is
exactly the view that ignores the stale path layer.

## Verification

Per stage: regenerate previews, review the muted designer view, run
`bun run test:unit -- --run src/lib/game/content/maps/regions/village-layered.test.ts`.

At the end of phases 1–3: `bun run check`, `bun run lint`, full `bun run test:unit -- --run`.
The e2e suite and the in-game walkthrough belong to phases 7–8.

Automated tests do not constitute completion — the issue is explicit about this, and the
blockout gate is a human preview review.
