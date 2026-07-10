# Sundrop Village Layered Map Authoring — Design

**Status:** Approved (brainstorm)
**Date:** 2026-07-07
**Linear:** [HPA-132](https://linear.app/cwchanap/issue/HPA-132) — Prototype layered map authoring for Sundrop Village from a fresh main branch
**Supersedes:** PR #11 (coordinate-rectangle approach). Keep PR #11 open until this merges, then close as superseded.

## 1. Goal

Replace Sundrop Village's 847-line hand-authored coordinate-rectangle source (`src/lib/game/content/maps/regions/village.ts`) with a Godot/Tiled-style layered authoring model: **paint/read space first, compile to rectangles second.**

Player-facing route is unchanged:

`Home Yard → Well Plaza → Market Yard / North Residences / Shrine Garden / East Gate`

The Phaser runtime and the existing `RegionFragment` model are untouched — the layered source compiles down to the same rectangle types (`groundPatches`, `blockers`, `mapDecor`, …) that `mergeRegions` already consumes.

## 2. Scope

**In scope:** village interior only; layered source types; compiler; village layered source; `village.ts` swap; relocation of non-village blockers out of `village.ts`; layered tests.

**Out of scope (non-goals, from HPA-132):** no Godot; no `WorldScene` rewrite; no other region migration; no new gameplay / save / HUD / discovery / pickup systems; no hand-authored village hedge rectangles as source of truth.

## 3. Brainstorm decisions — four spec gaps resolved against the codebase

The HPA-132 spec is detailed but silent on four points that materially affect file structure and the authoring model. Each was resolved against the actual `RegionFragment` shape (`src/lib/game/content/maps/regions/types.ts`) and the current `village.ts` content.

### Gap A — Out-of-grid content relocates (not passthrough)

`village.ts` currently owns ~22 rectangles that fall **outside** the proposed village grid (`x: 240–2032`, `y: 4360–5896`, i.e. `origin {240, 4360}` + 56×48 tiles of 32px) and outside the village's conceptual boundary. They are not village-interior content and relocate to their correct homes:

| Content | Today | Relocates to | Why |
|---|---|---|---|
| 5× `meadow-*-boundary` (town-hedge) | `village.ts` blockers | new `meadowBoundsRegion` (in `meadow-entry.ts`) | meadow-global, spans whole 6400² world |
| `sundrop-southwest-ocean` | `village.ts` blockers | `meadowBoundsRegion` | meadow-global |
| 16× `corridor-wall-*` exit-corridor dogleg | `village.ts` blockers | `paths.ts` (`pathsRegion`) | companion to the existing `link-village-crossroads` ground patch; load-bearing for spawn-to-crossroads reachability |
| `village-corridor-waymarker` decor | `village.ts` decor | `paths.ts` (`pathsRegion`) | sits in the corridor at x=2120, outside the village grid |

**Result:** `village.ts` becomes purely `compileLayeredRegion(sundropVillageLayered)` with zero hand-authored overrides — matching the spec's intent ("no hand-authored coordinate hedge source").

Blast radius is low: only `village.ts` and `maps.test.ts` reference these ids (`maps.test.ts:2339` filters `corridor-wall-*`; `:1172` asserts hedge kinds; `:1581` asserts spawn-to-crossroads reachability). All assertions remain valid once kinds and the corridor walls are preserved through the relocation. This is a targeted improvement to a pre-existing organization smell (global boundaries never belonged in `village.ts`), not a region migration — it stays inside the "do not migrate all regions" non-goal.

The grid boundary at `x=2032` / `y=4360` is a natural seam: every genuine village-interior primitive falls inside it; every out-of-grid item is one of the non-village cases above.

### Gap B — Decor expressiveness via a compiler glyph table

A single-glyph-per-tile decor layer cannot express three things the current village decor carries: varied render sizes (fountain 180×150 vs poleLantern 100×200), foreground depth (`village-hanging-lantern`), and per-piece collision sub-rects (poleLantern visual 100×200 / collision 50×60 at the base).

**Resolution:** each decor glyph maps, via a compiler glyph table, to `{ frame, renderWidth, renderHeight, depth? }`. The decor layer paints only anchor cells; the table supplies geometry. Anchor convention is **center-tile** (matches how `village-layout.test.ts` already treats decor `x,y` as centers). Collision sub-rects for big decor are **auto-derived from the glyph table footprint** and emitted on the decor object as `decor.collision` (the existing `MapDecor.collision` shape), so `WorldScene`'s decor-collision handling is unchanged. Of the ~16 village decor pieces, 9 are pure visual, 7 carry collision (auto-derived), 1 needs foreground depth (`h`).

### Gap C — Legend completeness

The spec's decor legend omitted two frames in the sheet and overloaded one glyph. Final legend adds `F` fountain and `D` hedgeTopiary, and splits the lantern glyph: `l` → poleLantern, `h` → hangingLantern (`depth:'foreground'` baked into the `h` table entry).

### Gap D — Retire `village-layout.test.ts`, port its durable invariants

`src/lib/game/content/maps/regions/village-layout.test.ts` hardcodes room centers, a main-route polyline, and a `villageDecorRoles` map keyed by the exact `village-*` decor ids — it is the pure expression of the coordinate-soup model being removed. HPA-132's requirement 6 ("keep existing tests passing") lists the `maps.test.ts` invariants but does **not** list this file, so it is implicitly disposable.

Two of its invariants are durable and not covered by the spec's new connectivity tests; they port into `village-layered.test.ts`:

1. Side rewards sit off the main route (`village-market-cache`, `village-shrine-cache` ≥160px from the route) → re-expressed as grid walkable-distance from the cache tile to the nearest route tile.
2. Path-texture-off navigation (main route flanked by visible solids within 320px) → re-expressed as route tiles adjacent to collision/building glyphs.

The `maps.test.ts` suite (`:1172` hedge-kind, `:1581` spawn-to-crossroads reachability, `:1666` gameplay-object reachability, bounds, duplicate IDs, decor-frame validity) remains and must pass.

### Gap E — Grid origin is fractional in tiles (accepted, non-issue)

`origin: { x: 240, y: 4_360 }` is `7.5 × 136.25` tiles. The grid is local; compiled world coords are `origin + tile*32` and carry a fractional-tile offset from "round" multiples of 32. This is fine — Phaser renders at arbitrary pixel coordinates, and existing village content is not on 32px boundaries either (`x=700` etc.), so no system assumes world-tile alignment. Recorded here as an explicit decision, not a surprise.

## 4. Architecture

### 4.1 Layered source types — `src/lib/game/content/maps/layered/types.ts`

```ts
export interface LayeredRegionSource<
  K extends MapDecor['textureKey'] = MapDecor['textureKey'],
  F extends MapDecor['frameName'] = MapDecor['frameName']
> {
  readonly idPrefix: string;  // prepended to generated IDs (blockers, ground patches, decor)
  readonly tileSize: 32;
  readonly origin: { x: number; y: number };
  readonly width: number;   // tiles
  readonly height: number;  // tiles
  readonly layers: {
    readonly terrain:   readonly string[]; // each string length === width; array length === height
    readonly paths:     readonly string[];
    readonly collision: readonly string[];
    readonly decor:     readonly string[];
    readonly regions:   readonly string[];
  };
  readonly decorGlyphTable: Record<string, DecorGlyphSpec<K, F>>;  // region-supplied
  readonly objects: {
    readonly landmarks?:  LayeredLandmark[];
    readonly transitions?: LayeredTransition[];
    readonly pickups?:     LayeredPickup[];
    readonly ambientNpcs?: LayeredAmbientNpc[];
    readonly discoveries?: LayeredDiscovery[];
  };
}
```

Layer rows are ASCII strings of exactly `width` chars; each layer has exactly `height` rows. Local tile `(col, row)` → world center `(origin.x + col*32 + 16, origin.y + row*32 + 16)`. Object types carry tile coords `(col, row)`; the compiler maps to world coords.

### 4.2 Glyph legends

**Terrain:** `.` grass · `g` sand (maps to `sandTile`) · `w` water
**Paths:** `.` none · `p` pathTile · `c` plazaStoneTile · `a` autumnLeafTile · `s` seaTile
**Collision (produces `blockers[]`):** `.` walkable · `#` garden-hedge · `B` building footprint (garden-hedge, landmark-linked) · `W` ocean · `G` future-gate · `T` standalone large obstacle (garden-hedge; rare/standalone — village v1 does not use it)
**Regions:** `.` none · `H` home yard · `P` well plaza · `M` market yard · `N` north residences · `S` shrine garden · `E` east gate · `C` crossroads road

**Decor** (glyph → frame, render size, optional depth, optional collision footprint). All `textureKey: villageDressingAsset.key`, `mode: 'image'`:

| Glyph | Frame | renderW×H | depth | collision footprint (W×H) |
|---|---|---|---|---|
| `f` | flowerBed | 150×120 | — | — |
| `m` | marketStall | 240×190 | — | — |
| `b` | festivalBanner | 160×220 | — | — |
| `s` | scarecrow | 120×170 | — | — |
| `D` | hedgeTopiary | 120×140 | — | — |
| `F` | fountain | 180×150 | — | — |
| `A` | gateArch | 220×200 | — | — |
| `l` | poleLantern | 100×200 | — | 50×60 |
| `h` | hangingLantern | 110×130 | foreground | — |
| `o` | offeringStand | 180×180 | — | 80×60 |
| `t` | stoneLantern | 180×180 | — | 80×60 |
| `M` | autumnMaple | 220×280 | — | 70×70 |

Render sizes and collision footprints are taken verbatim from the current `village.ts`. **Collision rule:** decor collision is auto-derived from the table footprint and emitted as `decor.collision` (not as a separate blocker), preserving the existing runtime shape. The collision-layer `T` glyph is reserved for standalone obstacles not tied to a decor visual.

Note: `M` appears in two layers (decor `M` autumnMaple; region `M` market yard). They are distinct layers, so the glyph overload is safe and matches the spec.

### 4.3 Compiler — `src/lib/game/content/maps/layered/compile-layered-region.ts`

```ts
export function compileLayeredRegion<
  K extends MapDecor['textureKey'],
  F extends MapDecor['frameName']
>(source: LayeredRegionSource<K, F>): RegionFragment
```

Pure, deterministic. Emits (all in world coords):

- **groundPatches** — per row, run-length merge contiguous cells sharing the same path/terrain tile glyph into one `MapGroundPatch` (`{id, x, y, width, height, tile}`). Ids derived deterministically from `layer + row + startCol`.
- **blockers** — from the collision layer: merge contiguous same-kind runs horizontally into one `MapBlocker`. `#`/`B`/`T` → `garden-hedge`; `W` → `ocean`; `G` → `future-gate`.
- **mapDecor** — from the decor layer via the glyph table: `{id, textureKey, frameName, x, y, width, height, mode:'image', depth?, collision?}`. `collision` populated from the table footprint, centered horizontally on the anchor tile, positioned at the sprite base. **Validation:** throws if a decor glyph sits on a non-`.` collision tile (decor must not overlap a wall).
- **landmarks / transitions / pickups / ambientNpcs / discoveries** — from `objects.*`, tile→world mapped.

The compiler is generic over `LayeredRegionSource`; the decor glyph table is **region-supplied** (part of the layered source's contract, since other regions may use different dressing sheets), so the compiler stays region-agnostic. For the village the table maps to `villageDressingAsset`.

### 4.4 Village layered source — `src/lib/game/content/maps/regions/village-layered.ts`

A `LayeredRegionSource` with `origin { x: 240, y: 4_360 }`, `width: 56`, `height: 48`, `tileSize: 32`, populated by re-authoring the current village content onto the 32px grid: object centers quantized to the nearest tile, walls redrawn as grid-aligned hedges, and a few objects re-placed to resolve overlaps the quantization introduced (see the review report's "Spatial adjustments during Task 8"). This file is the human-reviewable artifact — five compact layer maps instead of 800 lines of coordinates. Because geometry is re-authored (not bit-preserved), the human visual review (§7) is the load-bearing acceptance gate.

### 4.5 Village swap — `src/lib/game/content/maps/regions/village.ts`

```ts
import { compileLayeredRegion } from '$lib/game/content/maps/layered/compile-layered-region';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
export const villageRegion: RegionFragment = compileLayeredRegion(sundropVillageLayered);
```

### 4.6 Relocations

- **New `meadowBoundsRegion`** (5 town-hedge boundaries + ocean) added to `mergeRegions([...])` in `meadow-entry.ts`.
- **`pathsRegion`** gains the 16 `corridor-wall-*` blockers + the `village-corridor-waymarker` decor, companion to `link-village-crossroads`.

## 5. Testing

**New files:**

- `src/lib/game/content/maps/layered/compile-layered-region.test.ts`
  - every layer has exactly `width × height` cells (row length and count)
  - tile→world mapping correctness
  - groundPatch / blocker run-length merging determinism
  - decor glyph table coverage (every decor glyph resolves; unknown glyph throws)
  - decor collision auto-derivation (`decor.collision` present iff table entry has a footprint)
  - compiled output is deterministic across repeated calls

- `src/lib/game/content/maps/regions/village-layered.test.ts`
  - required region glyphs present: `H`, `P`, `M`, `N`, `S`, `E`, `C`
  - walkable connectivity from `H` to each of `P`, `M`, `N`, `S`, `E`, `C` (BFS over non-collision cells)
  - `village-market-cache` inside the market region; `village-shrine-cache` inside the shrine region
  - every object (landmark, transition, pickup, ambient npc, discovery) sits on a valid region or road tile
  - **ported:** caches off the main route (grid walkable-distance)
  - **ported:** main route flanked by visible solids (route tiles adjacent to collision/building glyphs)
  - **no hand-authored hedge source:** static authoring guard — assert `village.ts` source contains no rectangle literals (no `blockers:`/`groundPatches:`/`mapDecor:` keys), only the compile call

**Existing (must still pass, untouched):** `maps.test.ts` (bounds, duplicate IDs, hedge-kind `:1172`, transition reachability, spawn-to-crossroads reachability `:1581`, gameplay-object reachability `:1666`, decor-frame validity, pickup validity) + e2e boot/save + `bun run check` + `bun run lint`.

`village-layout.test.ts` is **deleted**; its durable invariants are ported as above.

## 6. Acceptance criteria (from HPA-132)

- Village source of truth is a layered map, not manual blocker/ground-patch arrays. ✓ §4.5
- `village.ts` becomes small and generated from `village-layered.ts`. ✓ §4.5
- The layered source is human-reviewable without reading hundreds of coordinates. ✓ §4.4 (ASCII layers)
- The game still runs on Phaser and the current `RegionFragment` runtime model. ✓ §4.3
- The village feels less messy than PR #11 because space is authored as layers first. ✓ §3 Gap B
- Full validation passes: `bun run test:unit -- --run`, `bun run check`, `bun run lint`, `bun run test:e2e`. ✓ §5

## 7. Visual review

`docs/superpowers/reports/2026-07-04-sundrop-layered-village-review.md` (filename date per HPA-132 §7), committed to git (not gitignored). Includes screenshots or linked artifacts for:

1. Home Yard
2. Well Plaza
3. Market Yard
4. Shrine Garden
5. East Gate
6. A muted-path / debug view showing collision/building/room shape guiding navigation

## 8. Branching & PR handling

- Branch `hpa-layered-sundrop-village` off `main` (not PR #11).
- Open a new PR from this branch.
- Keep PR #11 open until the new PR merges; then close PR #11 as superseded, referencing the layered-map PR.
