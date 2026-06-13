# Entry Map Enrichment — Design Spec

**Date:** 2026-06-12
**Status:** Approved (design); implementation plan pending
**Scope target:** The opening overworld map `meadow-entry` (`src/lib/game/content/maps.ts`)

---

## 1. Problem & Goal

The entry map (`meadow-entry`) is a 6,400 × 6,400px world (200 × 200 tiles @ 32px),
but authored content hugs two corners:

- **Sundrop Village** — bottom-left/center (x ≈ 330–2,600, y ≈ 4,600–6,300).
- **Wildwood → Whispering Cave → Ruins** — a thin forest strip top-right
  (x ≈ 4,200–6,400, y ≈ 360–2,000).

The remaining ~60% is flat grass with a single central path stripe. The world
reads as empty and undirected.

**Goal:** Redesign `meadow-entry` into a richer, denser JRPG overworld divided
into six themed regions. Each new region is **scenic + ambient** and visibly
**gated** ("coming later"), foreshadowing a future story chapter from
`docs/stories/high_level_plan.md`. No new playable interiors, dungeons, or
combat are added — the new regions tease future chapters without building them.

## 2. Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| **Scope** | Enrich + foreshadow. Themed regions with visibly locked gateways; no new interiors/dungeons/combat. |
| **Regions** | All six: existing Sundrop Village + Wildwood/Whispering Cave, plus new Mistfen Marsh, Tidewatch Coast & Ferry Crossing, Silverpine Shrine Path, Crossroads & Sealed Castle Gate. |
| **Terrain** | Hybrid — a few new ground tiles **and** per-region decor sprite packs. |
| **Liveliness** | Scenic + ambient life — decor, wandering ambient NPCs, labeled lore landmarks at sealed gates, item pickups. No new combat. |
| **Architecture** | Approach 2 — generalized `mapDecor` render path, dedicated `terrain-tiles.png` tileset, per-region authoring modules. |
| **Asset pipeline** | Generate new art via the Codex CLI (it has the image tool); `imagegen` skill is the fallback. |

## 3. Story grounding

The map is anchored so the **sea runs along the south edge**. This matches the
story bible: Hoshimiya Shrine was originally the ferry-crossing shrine (渡口祠)
of a small fishing village before the bay was reclaimed. The village therefore
sits as a former fishing hamlet just inland of the southwest bay, and the Ferry
Crossing lives naturally beside it. Season is the late-September → mid-October
typhoon-tail (damp, overcast, autumn foliage, sea-salt air), which unifies the
palette across regions.

Each new region foreshadows a chapter:

| Region | Chapter foreshadowed | Story hook |
|---|---|---|
| Mistfen Marsh | Ch.2 — Poison-Mist Witch / research-lab gassing | 毒霧 (poison mist) → marsh fog & toxic blooms |
| Tidewatch Coast & Ferry Crossing | Ch.3 — coastal/festival; Dragon-Crossing Festival | 渡口 ferry crossing, dragon pact, "remember the way home", the night bell you mustn't answer |
| Silverpine Shrine Path | Ch.4 — Silver Shrine / shrine-archive theft | 白銀神殿 silver shrine, 御守 amulet, dragon pact |
| Crossroads & Sealed Castle Gate | Ch.3 festival road + Ch.6/9 castle | festival route, the distant castle, dragon-crest currency, "do not cross the white line" (請勿越過白線) |

## 4. Spatial layout

World: 6,400 × 6,400px, origin top-left, +y downward. Player spawns in the
village at (1,536, 5,550) facing up.

```
┌──────────────────┬───────────────────┬────────────────────┐
│  MISTFEN MARSH   │  SILVERPINE        │  WILDWOOD →        │
│  (NW)            │  SHRINE PATH (N)   │  WHISPERING CAVE   │
│  ✦ Witchwood Gate│  ✦ Silver Shrine ⛩ │  (NE) — EXISTING   │
├──────────────────┴─────────┬─────────┴────────────────────┤
│                  CROSSROADS │ & SEALED CASTLE GATE (Center)│
│           waystone · lantern festival road · ✦ Castle Gate │
├──────────────────┬─────────┴───────────────────────────────┤
│  SUNDROP VILLAGE │  TIDEWATCH COAST & FERRY CROSSING (S/SE) │
│  (SW) — EXISTING │  渡口 torii ⛩                            │
│  the hub         │  ~~~~~~~~~~~~~ THE SEA ~~~~~~~~~~~~~~~~~~ │
└──────────────────┴──────────────────────────────────────────┘
✦ = sealed "coming later" gate (future-gate collision + ornate gate sprite + lore label)
```

**Approximate region bounds** (refined to exact pixels in the implementation plan):

| Region | Bounds (x, y) | Notes |
|---|---|---|
| Sundrop Village (SW) | x 100–2,900, y 4,400–6,350 | Existing; enrich. |
| Tidewatch Coast & Ferry (S/SE) | x 2,900–6,350, y 5,200–6,350 | Sea band along y ≈ 6,000–6,350. |
| Crossroads & Castle Gate (C) | x 2,500–4,500, y 2,900–5,000 | Hub; festival road runs north to the gate. |
| Wildwood → Whispering Cave (NE) | x 4,000–6,350, y 300–2,500 | Existing; enrich. |
| Silverpine Shrine Path (N) | x 2,300–4,200, y 300–2,900 | Stone-stair climb to the sealed shrine. |
| Mistfen Marsh (NW) | x 100–2,400, y 300–3,200 | Foggy basin. |

**Connectivity (the spine).** The Crossroads is where every path meets. New
path/cobblestone `groundPatches` connect:

- Village (NE corner) → Crossroads (SW corner)
- Crossroads → Coast (south)
- Crossroads → Silverpine (north festival road continues as stone stairs)
- Crossroads → Mistfen (north-west)
- Crossroads → Wildwood (reuses/extends the existing east-then-north road)

The player always passes through the lit, lively Crossroads to reach any region,
so the world reads as connected rather than as isolated corners.

## 5. Per-region content

### 5.1 Sundrop Village (SW, existing — enrich)
Keep all buildings, well, shrine, blacksmith, existing NPCs/transitions. Add:
expanded cobblestone plaza, autumn maples, hanging lanterns, market-stall decor,
flower patches, additional wandering villager ambient NPCs. Outcome: a dense,
lived-in hamlet rather than a sparse plaza.

### 5.2 Tidewatch Coast & Ferry Crossing (S/SE)
Ground gradient south→north: `sea` → `sand` → `grass`. Decor: a weathered
**torii standing in the shallows**, the ruined **ferry-crossing shrine (渡口)**,
tide pools, beached fishing boats, nets, driftwood, and a lantern-strung
**jetty** that dead-ends at the water (soft gate — "the sea route, not yet").
Ambient **fisher** NPC. Lore landmark label echoing the 御守 / the night bell
("the bell you mustn't turn back to"). Pickup: a salve/potion among the rocks.

### 5.3 Crossroads & Sealed Castle Gate (Center)
Cobblestone hub with a central **waystone/signpost**. A lantern-lined
**festival road** runs north to a great ornate **Castle Gate** (dragon-crest
motif; a painted **white line** before it — "請勿越過白線"). The gate is sealed:
ornate gate sprite + `future-gate` collision behind it + lore landmark label
pointing to the distant castle. Ambient travelers + a town-crier. This is the
map's connective heart.

### 5.4 Wildwood → Whispering Cave (NE, existing — enrich)
Thicken the thin forest strip: more tree clusters, brush, forest-floor patches,
autumn foliage, a trail signpost, a couple of ambient woodcutters. Existing
slime encounters, combat bounds, and the cave→ruins transition are untouched.

### 5.5 Silverpine Shrine Path (N)
A **stone-stair pilgrim path** climbing north through a silverpine/maple grove
to a **Sealed Silver Shrine Gate** (⛩, sealed: gate sprite + `future-gate`
collision + lore label). Stone lanterns, offering stands, amulet (御守) racks,
autumn maples. Ambient **pilgrim** NPC. Lore label hinting at 白銀神殿 and the
dragon pact. Pickup: an offering item (reuse an existing consumable).

### 5.6 Mistfen Marsh (NW)
A foggy basin: `marsh-mud` + shallow `sea`/water tiles, dead twisted trees,
toxic blooms, reeds, marsh rocks, and a translucent **fog overlay**
(foreground decor at low alpha). A **Sealed Witchwood Gate** (withered, thorned;
sealed: gate sprite + `future-gate` collision + lore label) points to Ch.2.
Deliberately near-lifeless and eerie — at most one lone forager ambient NPC.
Lore label hinting at 毒霧 (poison mist).

### 5.7 Gating & rewards summary
- **3 new sealed gates:** Castle (center), Silver Shrine (north), Witchwood (NW).
- **1 soft dead-end:** the coast jetty.
- **Existing quest gate:** Whispering Cave (unchanged).
- **Pickups** reuse existing item IDs (salves/potions). No new items.
- **No new combat.**

## 6. Engine / architecture changes (Approach 2)

### 6.A Generalized decor layer
- New `MapDecor` type in `content/maps/types.ts`:
  ```ts
  export type MapDecorDepth = 'floor' | 'furniture' | 'foreground';
  export interface MapDecor extends MapRect {
    textureKey: string;          // e.g. coastDressingAsset.key
    frameName: string;           // frame within that texture
    depth?: MapDecorDepth;       // default 'furniture'
    mode?: 'image' | 'tile';     // image (default) = setDisplaySize; tile = tileSprite
    collision?: MapRect;         // optional static collision body
    alpha?: number;              // optional, for fog/overlay decor
  }
  ```
- Add `mapDecor?: MapDecor[]` to `WorldMapDefinition`.
- New `WorldScene.renderMapDecor(map, depths)` replaces the forest-only render
  path: per decor, `mode === 'tile'` → `add.tileSprite`, else
  `add.image(...).setDisplaySize(...)`; apply `alpha`; depth-sort using the
  same 'floor'/'furniture'/'foreground' convention as interior props; register
  `collision` rects as static bodies (reuse the interior-prop collision pattern).
- **Migrate** the two existing `forestDecor` entries (both `treeCluster`
  tile-sprites) onto `mapDecor` with `textureKey = forestDressingAsset.key` and
  `mode: 'tile'`. Preserve the renderer's image-mode capability (the former
  `forestEntrance` special case) via `mode: 'image'` for future use. Remove the
  `MapForestDecor` type, the `forestDecor` field, and `renderForestDressing`
  (the `forestDressingAsset` and its `ForestDressingFrameName` stay).

### 6.B Dedicated ground tileset
- New asset `terrain-tiles.png` + `terrainTilesAsset` in `assets.ts`, decoupled
  from `starter-pack.png`. Frames (ground tile strip):
  `grass`, `path`, `ruinsFloor`, `stoneWall` (re-cut to match existing look),
  plus **`sea`, `sand`, `marshMud`, `autumnLeaf`, `cobblestone`**.
- Expand the `MapGroundTile` union, `WorldScene.terrainTileIndexes`, and
  `WorldScene.terrainFrames` to cover all nine tiles.
- `ensureTerrainTilesetTexture` sources from the new sheet.
  `buildGroundTileData` / `findGroundPatchTile` are unchanged (they key off
  `MapGroundTile` / `terrainTileIndexes`).

### 6.C Per-region authoring modules
- New directory `src/lib/game/content/maps/`:
  - `types.ts` — move the `Map*` interfaces here; add `MapDecor`.
  - `regions/village.ts`, `regions/coast.ts`, `regions/crossroads.ts`,
    `regions/wildwood.ts`, `regions/silverpine.ts`, `regions/mistfen.ts` — each
    exports its own arrays (`landmarks`, `transitions`, `groundPatches`,
    `blockers`, `mapDecor`, `ambientNpcs`, `pickups`, `fences`,
    `combatBounds`/`encounters` where relevant).
  - `meadow-entry.ts` — composes the region fragments into `meadowEntryMap`
    (concatenating arrays) and runs `addEnglishMapText`.
- `content/maps.ts` keeps the interiors + ruins maps and the `maps` registry,
  imports `meadowEntryMap`, and **re-exports the `Map*` types** from
  `maps/types.ts` so existing import paths
  (`$lib/game/content/maps`) keep working. Audit and update any imports that
  break.

### 6.D Coast water & sealed gates
- `ocean` blockers become **collision-only** (no opaque fill) so the new `sea`
  ground tile shows through; add a thin shoreline-foam `mapDecor` strip for the
  wet edge. The existing SW ocean sliver still works.
- Each sealed gate = ornate gate `mapDecor` image + a `future-gate` `blocker`
  (collision) + a `landmark` (floating lore label). No new blocker kind.

### 6.E i18n
- New landmark / lore-label `MessageKey`s for the three sealed gates, the ferry
  shrine, the waystone, and any new village/region landmarks, added to **all
  three** locale files (`en`, `ja`, `zh-Hant`) under `i18n/messages/`. Ambient
  NPCs render no name labels, so they need no keys.

## 7. New art assets

Generate via the Codex CLI (it has the image tool); fall back to the `imagegen`
skill if Codex is unavailable. After generation: save to
`public/game/assets/`, declare frame coordinates in `assets.ts`, register in
`WorldScene`. **Style for every prompt:** match existing packs — top-down /
slight 3⁄4 JRPG view, soft painterly shading, transparent (alpha) background,
soft overcast-autumn lighting, no text/watermark, sprites centered in even grid
cells.

### 7.1 `terrain-tiles.png` — ground tileset
> A seamless top-down JRPG ground-tile sheet, one row of square tiles, each tile
> 256×256px, designed to tile edge-to-edge without seams, soft painterly
> autumn-overcast lighting. Tiles in order: (1) lush green grass, (2) packed
> dirt path, (3) cracked ancient stone ruins floor, (4) grey stone wall block,
> (5) calm sea water with gentle ripples, (6) pale wet beach sand, (7) dark
> green-brown marsh mud with shallow puddles, (8) grass strewn with orange/red
> fallen autumn leaves, (9) fitted grey cobblestone plaza. Transparent margins,
> no text.

### 7.2 `coast-dressing.png` — coastal decor (256px grid)
> Top-down JRPG coastal prop sprites on transparent background, painterly,
> soft overcast seaside light: a weathered red wooden torii gate standing in
> shallow water; a small ruined stone ferry-crossing shrine; a beached wooden
> fishing boat; a draped fishing net with floats; a rocky tide pool;
> driftwood logs; a short wooden jetty/dock section; a strip of pale shoreline
> sea-foam. Each prop centered in its own 256×256 cell.

### 7.3 `shrine-dressing.png` — shrine-path decor (256px grid)
> Top-down JRPG shrine prop sprites on transparent background, painterly,
> autumn light: a large ornate sealed silver-white shrine gate (closed, faintly
> glowing seal); a stone lantern (tōrō); a wooden offering stand with coins; a
> rack of paper amulets (御守); a tall silver-needled pine; a vivid red autumn
> maple. Each prop centered in its own 256×256 cell.

### 7.4 `marsh-dressing.png` — marsh decor (256px grid)
> Top-down JRPG marsh prop sprites on transparent background, painterly, dim
> foggy light: a withered thorn-tangled sealed gate (dead wood, dark seal); a
> dead twisted leafless tree; a cluster of glowing toxic purple blooms; tall
> marsh reeds; a moss-covered marsh boulder; a soft translucent white fog/mist
> overlay tile (for low-alpha layering). Each element centered in its own
> 256×256 cell.

### 7.5 `crossroads-dressing.png` — crossroads/village decor (256px grid)
> Top-down JRPG town prop sprites on transparent background, painterly, warm
> overcast light: a grand ornate sealed castle gate with a dragon crest (closed,
> a white line painted on the ground before it); a stone waystone signpost with
> directional arms; a hanging paper festival lantern; a standing pole festival
> lantern; a fabric festival banner; a wooden market stall with awning and
> goods; a small flower bed. Each prop centered in its own 256×256 cell.
> (Village enrichment reuses these.)

### 7.6 `npc-pack` additions — ambient NPCs (96px cells)
> Extend the existing 96×96 top-down NPC sprite row with new characters,
> matching the current npc-pack style (front-facing, painterly, transparent
> background): a coastal fisher in oilskins; a road traveler with a pack; a
> shrine pilgrim in white robes; a woodcutter with an axe; a town crier with a
> bell. Regenerate `npc-pack.png` as a wider sheet (or add `npc-pack-2.png`)
> and add the new frame coordinates to `assets.ts`.

## 8. Testing

- **Unit — `maps.test.ts` (extend):** every transition target resolves to a real
  map; all three sealed gates present with `future-gate` collision; every
  `groundPatch.tile` is a valid `MapGroundTile`; every `mapDecor` frame exists in
  its declared texture; every pickup references a real item ID; decor & landmarks
  lie within map bounds; each region is reachable from the spawn via connected
  path patches.
- **Unit — `assets.test.ts` (extend):** new `terrain-tiles` and decor-pack frame
  coordinates lie within their sheet dimensions; `MapGroundTile` ↔
  `terrainTileIndexes` parity (every ground tile has an index and vice-versa).
- **i18n parity:** new `MessageKey`s exist in `en`, `ja`, `zh-Hant`.
- **e2e (light):** existing boot test stays green; add one smoke test asserting
  the enriched entry map renders with no console errors. Per the
  `playwright-e2e-coverage` guidance, data integrity stays in unit tests — avoid
  flaky walk-to-coordinate e2e.
- **Manual:** `bun run dev`, walk each region and each sealed gate.

## 9. Out of scope / non-goals

- No new playable interiors, dungeons, maps, or chapters.
- No new combat encounters or enemies.
- No new items, quests, dialogue trees, or shops.
- No procedural decor scatter (hand-placed only).
- No changes to the ruins maps or interior maps beyond import-path fixes.

## 10. Risks & mitigations

- **`maps.ts` refactor breaks imports.** Mitigate by re-exporting `Map*` types
  from `content/maps.ts` and auditing imports before finishing.
- **New ground tiles desync from the tileset texture.** Mitigate with the
  `assets.test.ts` parity test (tile ↔ index coverage).
- **Art style drift from generated assets.** Mitigate with the shared style
  preamble in every Codex prompt and a visual pass during manual testing;
  regenerate off-style sheets.
- **Map feels busy/cluttered.** Mitigate by keeping the Crossroads and paths
  visually clean and concentrating density at landmarks/gates, leaving travel
  lanes open.
