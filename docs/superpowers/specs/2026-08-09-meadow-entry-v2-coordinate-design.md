# HPA-586 Meadow Entry V2 Coordinate Design

Linear: HPA-586

Classification: `revision`

Status: coordinate master and graybox contract

## Decision

Re-author Meadow Entry and all seven village interiors from explicit spatial blueprints before producing replacement environment art or continuing the broad HPA-414 interior rollout.

HPA-400 remains the accepted functional baseline. Preserve its map IDs, NPC IDs, dialogue and shop contracts, transition IDs, save behavior, collision constants, and loaded-position normalization. HPA-586 replaces the spatial presentation built on top of that baseline; it does not reopen or revert HPA-400.

The selected approach is:

1. keep Meadow Entry at 200×200 tiles, or 6400×6400 px;
2. enlarge Sundrop Village from 56×48 tiles to 80×68 tiles inside the existing world;
3. retain stable non-village destination anchors unless a connector fails the graybox walkthrough;
4. define lots, display/collision footprints, entrances, roads, rooms, corridors, walls, doors, NPC approaches, prop zones, and prop-collision envelopes before placement work;
5. size village building footprints close to the native sprite aspect because `WorldScene.renderLandmarks(...)` uses landmark width and height as the rendered display size as well as the collision footprint;
6. deactivate the current HPA-406/HPA-496 baked visuals during the graybox because they encode superseded geometry;
7. use existing live terrain, blockers, landmarks, props, transitions, and collision for the graybox;
8. require the future outdoor art package to cover all 6400×6400 px, while leaving the exact texture partition to that art ticket’s measured preflight;
9. keep the current `RegionFragment`, layered-village, and direct-interior authoring models; add no room graph, map compiler, procedural generator, editor migration, or compatibility source.

## Player-facing outcome

- Sundrop Village is materially larger and more open.
- Buildings have lots, yards, front approaches, meaningful separation, and undistorted silhouettes.
- The village connects to Crossroads through one readable main road rather than a maze of corrective hedge segments.
- Crossroads clearly branches toward Mistfen, Silverpine, Wildwood, and Tidewatch Coast.
- The outer forest no longer depends on a blurred image enlarged across a large region.
- The future outdoor base covers every map pixel.
- Every village interior has an authored floor and recognizable architecture before furniture is added.
- Guild Hall reads as rooms connected by a corridor, not as functional labels implied by scattered props.

## Problems this design resolves

1. Current village interiors reveal the shared non-Meadow fallback floor because their maps have no complete authored floor or background.
2. The current Sundrop layered source is 1792×1536 px and feels compressed relative to the 6400×6400 world.
3. The outer-east forest image is visibly blurred and texturally inconsistent.
4. The current semantic crop package does not form one complete rectangular base over the entire map.
5. The existing village and Guild Hall evolved through object placement and corrective collision edits before an architectural master was locked.
6. Exterior door and return coordinates are manually repeated across village and interior sources, which has already required one-off arrival corrections.
7. Village landmark rectangles currently drive both collision and sprite display size, so spatial footprints must respect native building art proportions.

## Non-goals

- No new story, dialogue, quest, encounter, reward, economy, or NPC behavior.
- No rewrite of HPA-400 history or compatibility path for its old coordinates.
- No final Meadow Entry art package or final interior furnishing pass in HPA-586.
- No `LayeredInteriorSource`, room graph, door graph, wall generator, compiler, procedural map generator, editor migration, or generic workflow engine.
- No mandatory interior-design skill.
- No new approval database, coordinate schema file, screenshot matrix, or provenance system.
- No wholesale relocation of Mistfen, Silverpine, Wildwood, or Tidewatch Coast unless the walkable graybox proves a concrete route defect.
- No deletion of HPA-406/HPA-496 assets or generated records during the graybox; they remain historical inputs until replacement art is accepted.
- No runtime `MEADOW_ENTRY_V2_BASE_CHUNKS` constant before the final-art ticket measures real texture and file-size constraints.

---

# 1. Coordinate convention

All design rectangles use top-left coordinates:

```text
[x, y, width, height]
```

- World bounds, region envelopes, roads, lots, footprints, approaches, rooms, corridors, walls, and doors align to the existing 32 px tile grid.
- A door or point may sit on a tile boundary when it is centered in a wall opening.
- Prop visuals and narrow prop-collision strips may use 8 px increments after structural geometry is accepted.
- Outdoor coordinates are world coordinates; interior coordinates are local to each map.
- Repository `MapRect` values are centre-based, so a design rectangle converts as:

```ts
{
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
  width: rect.width,
  height: rect.height
}
```

The implementation may add one small `layout-rects.ts` module. It must not infer rooms, walls, doors, routes, or object placement.

## 1.1 Rectangle connection semantics

A spatial connection is valid only when rectangles either:

- overlap with positive area; or
- share a horizontal or vertical edge with positive length.

Corner-only contact is not connectivity.

## 1.2 Circulation and interaction widths

| Structure | Minimum clear width |
|---|---:|
| Outdoor main road | 160 px / 5 tiles |
| Outdoor connector trunk | 160 px / 5 tiles |
| Village secondary lane | 96 px / 3 tiles |
| Building approach | 96 px / 3 tiles |
| Guild Hall main corridor | 128 px |
| Other interior corridor | 96 px |
| Interior doorway | 64 px |
| NPC interaction approach | 64×64 px clear square |

Changed NPC approach points use 40 px separation. Tests derive the valid interval from the shared player, NPC body, and interaction radii instead of restating numeric limits.

---

# 2. Approaches considered

## A. Patch the current coordinates and crops

Rejected. It preserves the object-first process, accumulated connector-wall corrections, and semantic crops as the base-coverage mechanism.

## B. Coordinate-first revision using existing runtime primitives — selected

Keep the current world size and runtime model. Author explicit rectangles and routes, prove them in a walkable graybox, and produce final art only after the structure is accepted.

## C. Decouple every landmark into separate render and collision rectangles

Deferred. The immediate distortion can be removed by choosing aspect-safe footprint rectangles. A new landmark rendering contract is unnecessary unless a future building genuinely needs a materially different visual and collision silhouette.

## D. Replace authoring with Tiled, LDtk, or a room framework

Deferred. HPA-586 does not justify a new importer, schema, migration, or editor workflow.

---

# 3. Meadow Entry outdoor master

## 3.1 World bounds

```text
[0, 0, 6400, 6400]
```

Retain the existing 200×200 tile map. The problem is allocation and visual coverage, not total world capacity.

## 3.2 Functional region envelopes

These are design envelopes, not texture crops. They may overlap at connectors.

| Region | Envelope `[x, y, w, h]` | Treatment |
|---|---:|---|
| Mistfen | `[384, 384, 2816, 3712]` | Retain major landmark, encounters, and internal route unless a connector fails |
| Silverpine | `[2432, 384, 2048, 2432]` | Retain shrine approach and internal route |
| Crossroads | `[2880, 2816, 1728, 1952]` | Re-author route geometry and village handoff |
| Wildwood | `[4320, 256, 1824, 5312]` | Retain gameplay anchors; replace visual package later |
| Tidewatch Coast | `[3328, 4768, 2816, 1376]` | Retain ferry, beach, and encounter anchors |
| Sundrop Village V2 | `[256, 3968, 2560, 2176]` | Rebuild completely |

## 3.3 Route graph

```text
                         Silverpine
                             │
Mistfen ──────── north trunk │
                    \        │
                     Crossroads ───────── Wildwood / Whispering Cave
                          │
                          ├────────────── Tidewatch Coast
                          │
                    Sundrop Village
```

### Route anchors

| Anchor | Point `(x, y)` |
|---|---:|
| `village-east-gate` | `(2816, 4688)` |
| `crossroads-west-mouth` | `(3264, 4688)` |
| `crossroads-center` | `(3776, 4224)` |
| `crossroads-north-junction` | `(3776, 3136)` |
| `mistfen-mouth` | `(3072, 3136)` |
| `silverpine-mouth` | `(3776, 2432)` |
| `wildwood-mouth` | `(4992, 4224)` |
| `coast-mouth` | `(4224, 5568)` |

### Structural route rectangles

| Route | Rectangle `[x, y, w, h]` |
|---|---:|
| Sundrop Main Street | `[256, 4608, 2560, 160]` |
| Village → Crossroads | `[2816, 4608, 448, 160]` |
| Crossroads plaza | `[3264, 3680, 1024, 1088]` |
| Crossroads north trunk | `[3680, 2816, 192, 864]` |
| Crossroads → Mistfen | `[3072, 3072, 608, 160]` |
| Crossroads → Silverpine | `[3680, 2432, 192, 384]` |
| Crossroads → Wildwood | `[4288, 4144, 704, 160]` |
| Crossroads → Coast | `[4128, 4768, 192, 800]` |

Existing destination paths continue from the four route mouths. HPA-586 may adjust only the first local segment or an obstructing object when a seam fails.

## 3.4 Route ownership

- `village-layered.ts` owns village road cells up to `village-east-gate`.
- `paths.ts` owns the village-to-Crossroads connector and shared trunks.
- `crossroads.ts` owns the plaza and its immediate branch mouths.
- Each destination fragment owns its internal route after the named mouth.
- Collision remains live and independent of background art.

---

# 4. Sundrop Village V2

## 4.1 Bounds

```text
origin: (256, 3968)
size:   80 × 68 tiles
pixels: 2560 × 2176
bounds: [256, 3968, 2560, 2176]
```

This is approximately twice the area of the current 56×48 village while remaining inside Meadow Entry.

## 4.2 Composition

```text
NORTH

┌─────────────────┬─────────────────┬────────────────────────┐
│ Villager House 1│ Villager House 2│ Guild Hall + civic yard│
├─────────────────┴─────────────────┴────────────────────────┤
│                    Main Street → Crossroads                │
├───────────────────┬───────────────────┬────────────────────┤
│ Item Shop         │ Village Green     │ Blacksmith + yard  │
├───────────────────┴───────────────────┴────────────────────┤
│                         South Lane                         │
├───────────────────┬───────────────────┬────────────────────┤
│ Hero House        │ Villager House 3  │ Shrine of Aurora   │
├───────────────────┴───────────────────┴────────────────────┤
│                    Southern Meadow Lane                    │
└────────────────────────────────────────────────────────────┘
SOUTH
```

## 4.3 Roads and public spaces

| Structure | Rectangle `[x, y, w, h]` |
|---|---:|
| Main Street | `[256, 4608, 2560, 160]` |
| West village lane | `[256, 4768, 128, 1248]` |
| East village lane | `[2688, 4768, 128, 1248]` |
| South Lane | `[256, 5376, 2560, 128]` |
| Southern Meadow Lane | `[256, 6016, 2560, 128]` |
| Village Green | `[1152, 4800, 704, 512]` |
| Green north step | `[1344, 4768, 320, 32]` |
| Green south step | `[1344, 5312, 320, 64]` |
| Well footprint | `[1408, 4960, 192, 192]` |

West and east lanes join all three horizontal road bands. The green’s short north and south steps connect it to Main Street and South Lane.

## 4.4 Lots, aspect-safe footprints, doors, and approaches

`footprint` is both the landmark collision rectangle and the building sprite display rectangle in the current runtime. The following values therefore stay grid-aligned while remaining close to the native frame aspect.

| Structure | Lot `[x, y, w, h]` | Footprint `[x, y, w, h]` | Door centre | Approach `[x, y, w, h]` |
|---|---:|---:|---:|---:|
| Villager House 1 | `[384, 4064, 576, 448]` | `[544, 4096, 256, 288]` | `(672, 4384)` | `[608, 4384, 128, 224]` |
| Villager House 2 | `[1088, 4064, 576, 448]` | `[1248, 4096, 256, 288]` | `(1376, 4384)` | `[1312, 4384, 128, 224]` |
| Guild Hall | `[1888, 4032, 800, 480]` | `[2048, 4032, 448, 384]` | `(2272, 4416)` | `[2208, 4416, 128, 192]` |
| Item Shop | `[384, 4832, 704, 448]` | `[544, 4864, 320, 320]` | `(704, 5184)` | `[640, 5184, 128, 192]` |
| Blacksmith | `[1952, 4832, 736, 448]` | `[2112, 4864, 320, 320]` | `(2272, 5184)` | `[2208, 5184, 128, 192]` |
| Hero House | `[384, 5536, 704, 416]` | `[576, 5568, 256, 288]` | `(704, 5856)` | `[640, 5856, 128, 160]` |
| Villager House 3 | `[1184, 5536, 576, 416]` | `[1344, 5568, 256, 288]` | `(1472, 5856)` | `[1408, 5856, 128, 160]` |
| Shrine of Aurora | `[1888, 5504, 800, 448]` | `[2112, 5536, 320, 320]` | `(2272, 5856)` | `[2208, 5856, 128, 160]` |

### Native aspect check

| Frame | Native aspect | V2 footprint aspect | Relative difference |
|---|---:|---:|---:|
| Hero House `407×437` | 0.93 | `256×288` = 0.89 | 4.6% |
| Guild Hall `563×499` | 1.13 | `448×384` = 1.17 | 3.4% |
| Item Shop `430×445` | 0.97 | `320×320` = 1.00 | 3.5% |
| Villager House `403×449` | 0.90 | `256×288` = 0.89 | 1.0% |
| Blacksmith / Shrine | 1.00 | `320×320` = 1.00 | 0% |

The automated budget is at most 5% aspect difference. A future art pass may introduce a decoupled render rectangle only if this budget cannot represent a real building cleanly.

### Secondary outdoor zones

| Zone | Rectangle `[x, y, w, h]` |
|---|---:|
| Guild notice yard | `[1952, 4448, 224, 96]` |
| Blacksmith work yard | `[2464, 4896, 160, 320]` |
| Hero side garden | `[960, 5600, 96, 256]` |
| Shrine west garden | `[1952, 5568, 96, 320]` |
| Shrine east garden | `[2496, 5568, 128, 320]` |

## 4.5 Exterior transition and return anchors

| Map | Exterior door | Return arrival |
|---|---:|---:|
| `hero-house` | `(704, 5856)` | `(704, 5920, down)` |
| `guild-hall` | `(2272, 4416)` | `(2272, 4480, down)` |
| `item-shop` | `(704, 5184)` | `(704, 5248, down)` |
| `villager-house-1` | `(672, 4384)` | `(672, 4448, down)` |
| `villager-house-2` | `(1376, 4384)` | `(1376, 4448, down)` |
| `villager-house-3` | `(1472, 5856)` | `(1472, 5920, down)` |
| `shrine-of-aurora-interior` | `(2272, 5856)` | `(2272, 5920, down)` |

New-run spawn is `(704, 5920)`, facing up, derived from the Hero House return anchor.

## 4.6 Deliberate graybox decor anchors

These are the only tile-authored village decor anchors in the first outdoor graybox:

| Glyph | Grid `(col, row)` | World centre | Purpose |
|---|---:|---:|---|
| Gate arch `A` | `(77, 22)` | `(2736, 4688)` | Non-colliding east gateway over Main Street |
| Pole lantern `l` | `(25, 28)` | `(1072, 4880)` | West edge of the green district, outside road throats and footprints |
| Pole lantern `l` | `(53, 28)` | `(1968, 4880)` | East edge of the green district, outside road throats and footprints |
| Flower bed `f` | `(22, 53)` | `(976, 5680)` | Hero side garden, outside the Hero House footprint |

The two lantern collision rectangles must not intersect the Village Green, any building footprint, or a required route. The gate arch may visually span Main Street because it has no collision.

## 4.7 Placement rules

- Every footprint is inside its lot; lots do not overlap.
- Every footprint remains within 5% of its native building-frame aspect.
- Every approach shares a nonzero edge or positive-area overlap with its named public road.
- At least 96 px of clearance remains between every pair of building footprints.
- No prop occupies the first 96 px outside a door.
- The central green remains free of buildings and collidable decor.
- Ambient NPCs do not stand inside route throats.
- Pickups remain off the critical route and at least five walkable tiles from Main Street.
- Decor sprite rectangles and decor collision rectangles do not overlap building footprints.

---

# 5. Outdoor background contract

The final replacement package must provide a mandatory base that covers exactly `[0, 0, 6400, 6400]` with no transparent or uncovered gaps.

HPA-586 does **not** add chunk constants or PNG descriptors. The follow-up art ticket must perform real texture-size and file-size preflight before selecting the partition.

A 2×2 set of `3200×3200` chunks is the first candidate. A 4×4 set of `1600×1600` chunks is acceptable if measured platform or file constraints reject 2×2. Whichever partition is selected must:

- cover the exact world once;
- have deterministic coordinates and dimensions;
- render at 1:1 world scale;
- fail validation when a mandatory chunk is absent or malformed.

Optional overlays may own canopy, roofs, eaves, fog, foreground brush, and landmark occlusion. Semantic region images may not be the only base beneath a region.

## 5.1 Quality rules

- Review at 100% display scale.
- Do not enlarge a source image beyond 2× without explicit visual approval.
- Do not stretch one small donor across a forest region.
- Break repetition through shape, density, spacing, and overlay variation rather than blur or procedural noise.
- Optional overlay failure may restore live visuals; mandatory base failure is an error.

## 5.2 Graybox treatment of V1 art

During HPA-586:

- HPA-406/HPA-496 files remain historical artifacts in the repository;
- their images are not active on `meadow-entry`;
- live terrain, buildings, blockers, fences, and decor render instead;
- old ownership mappings do not suppress live graybox visuals;
- no replacement final PNG is generated.

---

# 6. Interior architecture contract

Shared rules:

- Every interior has one explicit full-map ground patch.
- Secondary patches identify rooms and corridors during graybox review.
- No playable cell relies solely on the renderer’s implicit non-Meadow floor.
- Internal walls are explicit `ruin-wall` blockers.
- Every room is reachable from the entrance without crossing furniture collision.
- Interactive NPCs have a named reachable approach point.
- Every collidable prop has an explicit collision envelope in the coordinate data.
- NPCs and approaches remain outside every prop-collision envelope after expansion by `PLAYER_COLLISION_RADIUS`.
- Approaches also remain outside visual prop zones; intentional counter presentation is represented by a narrower collision strip and a visual zone ending before the approach.
- Furniture is added only inside approved prop zones after doors and circulation pass.
- Existing IDs and gameplay behavior are preserved.

Graybox palette:

| Meaning | Representation |
|---|---|
| Full authored floor | `cobblestoneTile` |
| Corridor / lobby | `pathTile` |
| Secondary/private room | `plazaStoneTile` or `sandTile` |
| Wall | `ruin-wall` blocker |
| Door | explicit wall gap plus existing transition marker |

## 6.1 Interaction-critical prop envelopes

| Map / prop | Visual zone `[x, y, w, h]` | Collision envelope `[x, y, w, h]` | Approach |
|---|---:|---:|---:|
| Guild Master desk | `[704, 96, 192, 72]` | `[728, 160, 144, 8]` | `(800, 184)` |
| Quartermaster counter | `[672, 512, 224, 48]` | `[696, 544, 176, 8]` | `(816, 568)` |
| Mira counter | `[224, 312, 384, 40]` | `[224, 336, 384, 8]` | `(416, 360)` |
| Toma workbench | `[96, 96, 192, 64]` | `[112, 128, 160, 32]` | `(232, 192)` |
| Io west archive shelves | `[80, 96, 48, 192]` | `[80, 96, 48, 192]` | `(200, 192)` |

These values make the five previously conflicting approaches structurally clear before direct maps are authored.

---

# 7. Guild Hall blueprint

Bounds: `32×26` tiles, `1024×832` px.

```text
NORTH

┌────────────────────┬────────┬────────────────────┐
│ Records / Quest    │        │ Guild Master       │
│ Hall               │ Main   │ Office             │
├────────────────────┤ Spine  ├────────────────────┤
│                    │        │ Training Hall      │
│ Common Hall        │        ├────────────────────┤
│                    │        │ Quartermaster      │
├───────────────┬────┴────────┴────┬───────────────┤
│ solid service│   Entrance Lobby  │ solid service │
└───────────────┴────────┬─────────┴───────────────┘
                         Exit
SOUTH
```

| Structure | Rectangle `[x, y, w, h]` |
|---|---:|
| Records / Quest Hall | `[64, 64, 352, 256]` |
| Common Hall | `[64, 352, 352, 288]` |
| Main spine corridor | `[448, 64, 128, 608]` |
| Guild Master office | `[608, 64, 352, 192]` |
| Training Hall | `[608, 288, 352, 160]` |
| Quartermaster room | `[608, 480, 352, 160]` |
| Entrance lobby | `[352, 672, 320, 128]` |

| Connection | Opening `[x, y, w, h]` |
|---|---:|
| Records ↔ spine | `[416, 144, 32, 96]` |
| Common Hall ↔ spine | `[416, 448, 32, 96]` |
| Guild Master ↔ spine | `[576, 112, 32, 96]` |
| Training ↔ spine | `[576, 320, 32, 96]` |
| Quartermaster ↔ spine | `[576, 512, 32, 96]` |
| Exterior | `[480, 800, 64, 32]` |

| Anchor | Point |
|---|---:|
| Spawn | `(512, 736)`, facing up |
| Exit | `(512, 816)` |
| Guild Master | `(800, 144)` |
| Guild Master approach | `(800, 184)` |
| Quartermaster | `(816, 528)` |
| Quartermaster approach | `(816, 568)` |
| West ambient member | `(160, 544)` |
| East ambient member | `(704, 368)` |

Prop zones:

- records shelves `[80, 80, 112, 176]`;
- quest board/records desk `[224, 80, 160, 96]`;
- common table/seating `[128, 416, 224, 128]`;
- Guild Master station `[704, 96, 192, 72]`;
- training equipment `[704, 320, 192, 96]`;
- Quartermaster station `[672, 512, 224, 48]`;
- lobby notice/benches `[384, 704, 256, 64]`.

---

# 8. Hero House blueprint

Bounds: `22×18` tiles, `704×576` px.

| Structure | Rectangle `[x, y, w, h]` |
|---|---:|
| Bedroom | `[64, 64, 208, 192]` |
| Hall | `[304, 64, 96, 224]` |
| Study / storage | `[432, 64, 208, 192]` |
| Living / kitchen | `[64, 288, 576, 256]` |
| Bedroom door | `[272, 128, 32, 64]` |
| Study door | `[400, 128, 32, 64]` |
| Hall → living | `[304, 256, 96, 32]` |
| Exterior door | `[320, 544, 64, 32]` |

Spawn `(352, 480)` facing up; exit `(352, 560)`.

Prop zones: bed `[96, 96, 128, 96]`, study `[480, 96, 128, 128]`, living table `[224, 352, 160, 96]`, kitchen/storage `[480, 352, 128, 128]`.

---

# 9. Item Shop blueprint

Bounds: `26×20` tiles, `832×640` px.

| Structure | Rectangle `[x, y, w, h]` |
|---|---:|
| Stockroom | `[64, 64, 256, 160]` |
| Service corridor | `[352, 64, 128, 192]` |
| Office | `[512, 64, 256, 160]` |
| Sales floor | `[64, 256, 704, 352]` |
| Stockroom door | `[320, 112, 32, 64]` |
| Office door | `[480, 112, 32, 64]` |
| Service → sales | `[352, 224, 128, 32]` |
| Exterior door | `[384, 608, 64, 32]` |

| Anchor | Point |
|---|---:|
| Spawn | `(416, 544)`, facing up |
| Exit | `(416, 624)` |
| Shopkeeper Mira | `(416, 320)` |
| Customer approach | `(416, 360)` |
| Ambient customer | `(224, 480)` |

Prop zones: counter `[224, 312, 384, 40]`, west display `[96, 384, 96, 128]`, east display `[640, 384, 96, 128]`, stock shelves `[96, 96, 192, 96]`, office desk `[560, 96, 160, 96]`.

---

# 10. Shrine of Aurora blueprint

Bounds: `24×22` tiles, `768×704` px.

| Structure | Rectangle `[x, y, w, h]` |
|---|---:|
| Inner sanctum | `[224, 64, 320, 160]` |
| West preparation room | `[64, 256, 128, 256]` |
| Nave | `[224, 256, 320, 288]` |
| East archive | `[576, 256, 128, 256]` |
| Entrance hall | `[256, 576, 256, 96]` |
| Sanctum opening | `[320, 224, 128, 32]` |
| West room opening | `[192, 352, 32, 96]` |
| East room opening | `[544, 352, 32, 96]` |
| Nave → entrance | `[320, 544, 128, 32]` |
| Exterior door | `[352, 672, 64, 32]` |

Spawn `(384, 608)` facing up; exit `(384, 688)`.

Prop zones: altar `[288, 96, 192, 96]`, nave benches `[256, 352, 256, 128]`, preparation `[80, 320, 96, 128]`, archive `[592, 288, 96, 160]`, entrance lamps `[288, 592, 192, 64]`.

---

# 11. Villager House 1 blueprint

Theme: family home. Bounds: `20×18` tiles, `640×576` px.

| Structure | Rectangle `[x, y, w, h]` |
|---|---:|
| Bedroom | `[64, 64, 192, 192]` |
| Hall | `[288, 64, 96, 224]` |
| Storage | `[416, 64, 160, 192]` |
| Living / kitchen | `[64, 288, 512, 256]` |
| Bedroom door | `[256, 128, 32, 64]` |
| Storage door | `[384, 128, 32, 64]` |
| Hall → living | `[288, 256, 96, 32]` |
| Exterior door | `[288, 544, 64, 32]` |

Spawn `(320, 480)`; exit `(320, 560)`. Lynn `(160, 416)`; approach `(200, 416)`. Family ambient NPC `(480, 416)`.

Prop zones: bed `[80, 96, 144, 96]`, family table `[224, 352, 192, 96]`, kitchen `[448, 320, 96, 128]`, storage `[432, 96, 112, 128]`.

---

# 12. Villager House 2 blueprint

Theme: craft worker’s home. Bounds: `22×18` tiles, `704×576` px.

| Structure | Rectangle `[x, y, w, h]` |
|---|---:|
| Workshop | `[64, 64, 256, 224]` |
| Hall | `[352, 64, 96, 256]` |
| Bedroom | `[480, 64, 160, 224]` |
| Living area | `[64, 320, 576, 224]` |
| Workshop door | `[320, 128, 32, 96]` |
| Bedroom door | `[448, 128, 32, 96]` |
| Hall → living | `[352, 288, 96, 32]` |
| Exterior door | `[320, 544, 64, 32]` |

Spawn `(352, 480)`; exit `(352, 560)`. Toma `(192, 192)`; approach `(232, 192)`. Neighbor `(512, 416)`.

Prop zones: workbench `[96, 96, 192, 64]`, workshop storage `[96, 224, 192, 48]`, bedroom `[496, 96, 128, 160]`, living table `[224, 384, 192, 96]`.

---

# 13. Villager House 3 blueprint

Theme: reader and amateur archivist. Bounds: `20×20` tiles, `640×640` px.

| Structure | Rectangle `[x, y, w, h]` |
|---|---:|
| Archive / study | `[64, 64, 192, 256]` |
| Hall | `[288, 64, 96, 288]` |
| Bedroom / storage | `[416, 64, 160, 256]` |
| Sitting room | `[64, 352, 512, 256]` |
| Archive door | `[256, 128, 32, 96]` |
| Bedroom door | `[384, 128, 32, 96]` |
| Hall → sitting | `[288, 320, 96, 32]` |
| Exterior door | `[288, 608, 64, 32]` |

Spawn `(320, 544)`; exit `(320, 624)`. Io `(160, 192)`; approach `(200, 192)`. Neighbor `(480, 480)`.

Prop zones: west archive shelves `[80, 96, 48, 192]`, reading table `[96, 384, 160, 96]`, bedroom `[432, 96, 112, 160]`, sitting `[320, 416, 192, 128]`.

---

# 14. Architectural wall contract

For every interior:

1. map edges are wall bands except at the exterior door;
2. gaps between named rooms are walls except at listed openings;
3. unused pockets outside named rooms are blocked as service/structure space;
4. every wall has an explicit ID and rectangle;
5. no wall is inferred from furniture;
6. door openings are verified before props are added;
7. route tests use player-radius-expanded collision;
8. every collidable prop has an explicit envelope and does not trap an NPC or approach.

Exact wall-segment arrays live in the implementation plan. The room and opening rectangles in this spec remain the architectural source of truth if a wall-segment typo is found.

---

# 15. Source ownership

| Concern | Owning source |
|---|---|
| Top-left layout rectangles and conversion | `src/lib/game/content/maps/layouts/layout-rects.ts` |
| Outdoor bounds, routes, lots, footprints, doors, and returns | `src/lib/game/content/maps/layouts/meadow-entry-v2.ts` |
| Interior rooms, walls, doors, approaches, prop zones, and prop collisions | `src/lib/game/content/maps/layouts/village-interiors-v2.ts` |
| Sundrop terrain, path, collision, neutral region-label, and tile-decor grids | `src/lib/game/content/maps/regions/village-layered.ts` |
| Sundrop pixel-positioned landmarks, transitions, pickups, and ambient NPCs | `src/lib/game/content/maps/regions/village.ts` |
| Shared outdoor connector corridors | `src/lib/game/content/maps/regions/paths.ts` |
| Crossroads local geometry | `src/lib/game/content/maps/regions/crossroads.ts` |
| Meadow Entry composition | `src/lib/game/content/maps/meadow-entry.ts` |
| Direct interior maps | `src/lib/game/content/maps.ts` |
| Rendering, movement, and save normalization | existing runtime contracts |
| Final Meadow Entry art and selected texture partition | follow-up ticket after HPA-586 approval |

The layered compiler remains unchanged. Pixel-positioned village objects are composed in `village.ts` from shared coordinate constants instead of being forced through the compiler’s tile-centre coordinates. The layout modules are inert coordinate data consumed by existing owners; they are not a second map registry.

---

# 16. Graybox delivery

## Outdoor slice

- Rebuild the 80×68 layered path/decor source.
- Keep the live `regions` layer neutral (`.`) during graybox review.
- Compose aspect-safe building landmarks, transitions, pickups, and ambient NPCs directly in `village.ts`.
- Draw roads and approaches with existing ground tiles.
- Use current building sprites, live collision, and only the four approved decor anchors.
- Replace the village-to-Crossroads wall maze with named route rectangles.
- Keep stable destination content in place.
- Remove V1 baked images from active map composition.

## Interior slice

- Add full-map explicit ground coverage.
- Add room/corridor floor patches.
- Add explicit walls and door gaps.
- Place transitions, spawns, NPCs, interaction approaches, prop zones, and prop-collision envelopes.
- Add only props required to identify function.
- Do not perform final dressing or final background generation.

Review at native scale: full map, village, village-to-Crossroads seam, Wildwood live graybox, Guild Hall, Hero House, Item Shop, Shrine, one villager house, and collision overlays for the village route and Guild Hall.

---

# 17. Acceptance

## Automated

- All structural rectangles are positive, in bounds, and grid-aligned.
- Village lots do not overlap; every footprint is inside its lot.
- Every footprint stays within 5% of its native sprite aspect.
- Every pair of footprints has at least 96 px clearance.
- Every door approach shares a nonzero edge or positive-area overlap with its named public road.
- Corner-only rectangle contact does not count as connected.
- West and east village lanes connect all three horizontal road bands.
- `hasWidePath(...)` proves a 5-tile Main Street and at least 3-tile lanes on the authored path grid.
- `bfsPath(...)` proves a painted path from the spawn frontage to every building approach.
- Compiled-map route tests include strict collision, decor collision, fences, landmark doorway carving, interior props, and NPC bodies.
- Crossroads reaches all four destination mouths.
- Return positions are outside footprints and beyond the shared transition re-trigger envelope.
- The four graybox decor sprites and their collision envelopes avoid building footprints, the Village Green, and route throats.
- Existing destination IDs and gameplay content remain registered.
- No V1 background ID is active in `meadowEntryMap.backgroundImages`.
- Every interior has explicit full-floor coverage.
- Every room, NPC approach, and exit is reachable.
- NPC approaches are outside visual prop zones, outside player-padded prop collisions, outside body collision, and inside interaction range.
- No prop blocks a door, spawn, required route, or approach.
- Existing shop, dialogue, quest, transition, and save identities remain unchanged.

The final-art ticket—not HPA-586—owns executable texture-partition and full-base pixel-coverage validation.

## Manual

Outdoor:

1. start outside Hero House at `(704, 5920)`;
2. use the west lane to reach South Lane and Main Street;
3. inspect the village green, building spacing, and undistorted building silhouettes;
4. cross the village-to-Crossroads connector both ways;
5. reach Mistfen, Silverpine, Wildwood, and Tidewatch Coast and return;
6. exercise one encounter, pickup, discovery, gated transition, and save/reload.

Open live floor outside named roads and retained destination fragments is expected during the graybox. Reject blocked routes, active V1 blur, distorted buildings, compressed spacing, broken doors/returns, or unreadable seams. Do not reject for unfinished biome density or final terrain polish.

Interiors:

1. enter each of the seven buildings;
2. traverse every room and corridor;
3. verify no playable cell shows only the implicit fallback floor;
4. approach every interactive NPC and exercise both shops;
5. exit without immediate re-trigger or collision trap.

Complete one normal web walkthrough and one packaged Tauri walkthrough after both graybox slices are combined.

---

# 18. Delivery sequence

## PR 1 — design package

- This coordinate master.
- Task-by-task implementation plan.
- No runtime changes.

## PR 2 — outdoor graybox

- `layout-rects.ts` and outdoor layout constants.
- 80×68 Sundrop layered grids.
- Aspect-safe pixel-positioned village object composition.
- Reworked village-to-Crossroads route and stable destination seams.
- V1 baked backgrounds inactive.
- V1 live-proof migration, authoring guidance updates, outdoor tests, and native-scale screenshots.

## PR 3 — interior grayboxes

- Seven interior coordinate constants.
- Complete floors, walls, doors, routes, NPC approaches, prop zones, prop collisions, and minimal props.
- Interior tests, web/Tauri walkthrough, and screenshots.

HPA-586 closes after PR 2 and PR 3 are accepted.

---

# 19. Follow-up boundaries

Create only after HPA-586 graybox approval:

1. produce and integrate a measured full-coverage Meadow Entry V2 base and foreground package;
2. finish Guild Hall surfaces, walls, and furniture without moving accepted geometry;
3. finish Hero House, Item Shop, Shrine, and villager-house art from accepted grayboxes;
4. remove superseded HPA-406 preloads, generated activation, inactive V1 village tools/source, and obsolete fallback ownership only after V2 art is live.

Final art conforms to accepted geometry. Authoritative geometry must not be moved merely to fit an accidental generated image.
