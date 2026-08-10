# HPA-586 Meadow Entry V2 Coordinate Design

Linear: HPA-586

Classification: `revision`

Status: coordinate master and graybox contract

## Decision

Re-author Meadow Entry and all seven village interiors from explicit spatial blueprints before producing replacement environment art or continuing the HPA-414 interior rollout.

HPA-400 remains the accepted functional baseline. Preserve its map IDs, NPC IDs, dialogue and shop contracts, transition IDs, save behavior, collision constants, and loaded-position normalization. HPA-586 replaces the spatial presentation built on top of that baseline; it does not reopen or revert HPA-400.

The selected approach is:

1. keep Meadow Entry at 200×200 tiles, or 6400×6400 px;
2. enlarge Sundrop Village from 56×48 tiles to 80×68 tiles inside the existing world;
3. retain stable non-village destination anchors unless a connector fails the graybox walkthrough;
4. define lots, footprints, entrances, roads, rooms, corridors, walls, doors, NPC approaches, and prop zones before placement work;
5. deactivate the current HPA-406/HPA-496 baked visuals during the graybox because they encode superseded geometry;
6. use existing live terrain, blockers, landmarks, props, transitions, and collision for the graybox;
7. require a future mandatory base package to cover the complete 6400×6400 world, with semantic region art limited to optional overlays;
8. keep the current `RegionFragment`, layered-village, and direct-interior authoring models; add no room graph, map compiler, procedural generator, or interior-specific skill.

## Player-facing outcome

- Sundrop Village is materially larger and more open.
- Buildings have lots, yards, front approaches, and meaningful separation.
- The village connects to Crossroads through one readable main road rather than a maze of corrective hedge segments.
- Crossroads clearly branches toward Mistfen, Silverpine, Wildwood, and Tidewatch Coast.
- The outer forest no longer depends on a blurred image enlarged across a large region.
- Every pixel of the final outdoor map is covered by a mandatory base layer.
- Every village interior has an authored floor and recognizable architecture before furniture is added.
- Guild Hall reads as rooms connected by a corridor, not as functional labels implied by scattered props.

## Problems this resolves

1. Current village interiors reveal the shared non-Meadow fallback floor because their maps have no complete authored floor or background.
2. The current Sundrop layered source is 1792×1536 px and feels compressed relative to the 6400×6400 world.
3. The outer-east forest image is visibly blurred and texturally inconsistent.
4. The current semantic crop package does not form one complete rectangular base over the entire map.
5. The existing village and Guild Hall evolved through object placement and corrective collision edits before an architectural master was locked.
6. Exterior door and return coordinates are manually repeated across village and interior sources, which has already required one-off arrival corrections.

## Non-goals

- No new story, dialogue, quest, encounter, reward, economy, or NPC behavior.
- No rewrite of HPA-400 history or compatibility path for its old coordinates.
- No final Meadow Entry art package or final interior furnishing pass in HPA-586.
- No `LayeredInteriorSource`, room graph, door graph, compiler, procedural map generator, editor migration, or generic workflow engine.
- No mandatory `gliese-interior-designer` skill.
- No new approval database, coordinate schema file, screenshot matrix, or provenance system.
- No wholesale relocation of Mistfen, Silverpine, Wildwood, or Tidewatch Coast unless the walkable graybox proves a concrete route defect.
- No deletion of HPA-406/HPA-496 artifacts during the graybox; they remain historical inputs until replacement art is accepted.

---

# 1. Coordinate convention

All design rectangles use top-left coordinates:

```text
[x, y, width, height]
```

- World bounds, region envelopes, roads, lots, footprints, approaches, rooms, corridors, walls, and doors align to the existing 32 px tile grid.
- Prop visuals and narrow prop collision strips may use 8 px increments after structural geometry is accepted.
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

The implementation may add one small conversion helper. It must not infer rooms, walls, doors, routes, or object placement.

## 1.1 Circulation and interaction widths

| Structure | Minimum clear width |
|---|---:|
| Outdoor main road | 160 px |
| Outdoor connector trunk | 160 px |
| Village secondary lane | 96 px |
| Guild Hall main corridor | 128 px |
| Other interior corridor | 96 px |
| Interior doorway | 64 px |
| NPC interaction approach | 64×64 px clear square |

Current NPC-pack interaction is valid when the player centre is at least 29 px and at most 48 px from the NPC centre. All changed NPC approach points use 40 px separation.

---

# 2. Approaches considered

## A. Patch the current coordinates and crops

Rejected. It preserves the object-first process, accumulated connector-wall corrections, and semantic crops as the base-coverage mechanism.

## B. Coordinate-first revision using existing runtime primitives — selected

Keep the current world size and runtime model. Author explicit rectangles and routes, prove them in a walkable graybox, and produce final art only after the structure is accepted.

## C. Replace authoring with Tiled, LDtk, or a new room framework

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
| Sundrop main street | `[256, 4608, 2560, 160]` |
| Village → Crossroads | `[2816, 4608, 448, 160]` |
| Crossroads plaza | `[3264, 3680, 1024, 1088]` |
| Crossroads north trunk | `[3680, 2816, 192, 864]` |
| Crossroads → Mistfen | `[3072, 3072, 608, 160]` |
| Crossroads → Silverpine | `[3680, 2432, 192, 384]` |
| Crossroads → Wildwood | `[4288, 4144, 704, 160]` |
| Crossroads → Coast | `[4128, 4768, 192, 800]` |

Existing destination paths continue from the four route mouths. HPA-586 may adjust only the first local segment or an obstructing object when a seam fails.

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

## 4.4 Lots, footprints, doors, and approaches

| Structure | Lot `[x, y, w, h]` | Footprint `[x, y, w, h]` | Door centre | Approach `[x, y, w, h]` |
|---|---:|---:|---:|---:|
| Villager House 1 | `[384, 4064, 576, 448]` | `[512, 4128, 320, 224]` | `(672, 4352)` | `[608, 4352, 128, 256]` |
| Villager House 2 | `[1088, 4064, 576, 448]` | `[1216, 4128, 320, 224]` | `(1376, 4352)` | `[1312, 4352, 128, 256]` |
| Guild Hall | `[1888, 4032, 800, 480]` | `[1984, 4096, 576, 288]` | `(2272, 4384)` | `[2208, 4384, 128, 224]` |
| Item Shop | `[384, 4832, 704, 448]` | `[480, 4896, 448, 256]` | `(704, 5152)` | `[640, 5152, 128, 224]` |
| Blacksmith | `[1952, 4832, 736, 448]` | `[2048, 4896, 416, 256]` | `(2272, 5152)` | `[2208, 5152, 128, 224]` |
| Hero House | `[384, 5536, 704, 416]` | `[480, 5600, 448, 224]` | `(704, 5824)` | `[640, 5824, 128, 192]` |
| Villager House 3 | `[1184, 5536, 576, 416]` | `[1312, 5600, 320, 224]` | `(1472, 5824)` | `[1408, 5824, 128, 192]` |
| Shrine of Aurora | `[1888, 5504, 800, 448]` | `[2080, 5568, 384, 256]` | `(2272, 5824)` | `[2208, 5824, 128, 192]` |

### Secondary outdoor zones

| Zone | Rectangle `[x, y, w, h]` |
|---|---:|
| Guild notice yard | `[1952, 4416, 320, 128]` |
| Blacksmith work yard | `[2464, 4896, 160, 320]` |
| Hero side garden | `[960, 5600, 96, 256]` |
| Shrine west garden | `[1952, 5568, 96, 320]` |
| Shrine east garden | `[2496, 5568, 128, 320]` |

## 4.5 Exterior transition and return anchors

| Map | Exterior door | Return arrival |
|---|---:|---:|
| `hero-house` | `(704, 5824)` | `(704, 5888, down)` |
| `guild-hall` | `(2272, 4384)` | `(2272, 4448, down)` |
| `item-shop` | `(704, 5152)` | `(704, 5216, down)` |
| `villager-house-1` | `(672, 4352)` | `(672, 4416, down)` |
| `villager-house-2` | `(1376, 4352)` | `(1376, 4416, down)` |
| `villager-house-3` | `(1472, 5824)` | `(1472, 5888, down)` |
| `shrine-of-aurora-interior` | `(2272, 5824)` | `(2272, 5888, down)` |

New-run spawn is `(704, 5888)`, facing up, derived from the Hero House entrance.

## 4.6 Placement rules

- Every footprint is inside its lot; lots do not overlap.
- Every approach connects a door to a public road.
- At least 96 px of usable space remains between neighboring footprints.
- No prop occupies the first 96 px outside a door.
- The central green remains free of buildings and large collidable decor.
- Ambient NPCs do not stand inside route throats.
- Pickups remain off the critical route and at least five walkable tiles from Main Street.

---

# 5. Outdoor background contract

The future replacement package uses a mandatory base partition covering the exact world bounds:

| Chunk | Rectangle `[x, y, w, h]` |
|---|---:|
| Northwest | `[0, 0, 3200, 3200]` |
| Northeast | `[3200, 0, 3200, 3200]` |
| Southwest | `[0, 3200, 3200, 3200]` |
| Southeast | `[3200, 3200, 3200, 3200]` |

The four rectangles are non-overlapping and cover exactly 6400×6400. A 4×4 split into 1600×1600 chunks is permitted only if a measured texture or file-size probe rejects the 2×2 package.

## 5.1 Responsibilities

Mandatory base:

- fills every map pixel;
- owns ground colour, terrain transitions, shore, marsh, paths, and stable non-occluding scenery;
- renders at 1:1 world scale;
- fails validation when a required chunk is absent or has wrong dimensions.

Optional overlays may own canopy, roofs, eaves, fog, foreground brush, and landmark occlusion. Semantic region images may not be the only base beneath a region.

## 5.2 Quality rules

- Review at 100% display scale.
- Do not enlarge a source image beyond 2× without explicit visual approval.
- Do not stretch one small donor across a forest region.
- Break repetition through shape, density, spacing, and overlay variation rather than blur or procedural noise.
- Optional overlay failure may restore live visuals; mandatory base failure is an error.

## 5.3 Graybox treatment of V1 art

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
- Guild Master station `[704, 80, 192, 112]`;
- training equipment `[704, 320, 192, 96]`;
- Quartermaster station `[672, 504, 224, 80]`;
- lobby notice/benches `[384, 704, 256, 64]`.

Counter and desk collision may be narrower than their sprites to preserve the 40 px interaction approaches.

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

Prop zones: counter visual `[224, 312, 384, 48]`, counter collision `[224, 336, 384, 8]`, west display `[96, 384, 96, 128]`, east display `[640, 384, 96, 128]`, stock shelves `[96, 96, 192, 96]`, office desk `[560, 96, 160, 96]`.

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

Prop zones: work table `[96, 112, 160, 96]`, workshop storage `[96, 224, 192, 48]`, bedroom `[496, 96, 128, 160]`, living table `[224, 384, 192, 96]`.

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

Prop zones: archive shelves `[80, 96, 144, 192]`, reading table `[96, 384, 160, 96]`, bedroom `[432, 96, 112, 160]`, sitting `[320, 416, 192, 128]`.

---

# 14. Architectural wall contract

For every interior:

1. map edges are wall bands except at the exterior door;
2. gaps between named rooms are walls except at listed openings;
3. unused pockets outside named rooms are blocked as service/structure space;
4. every wall has an explicit ID and rectangle;
5. no wall is inferred from furniture;
6. door openings are verified before props are added;
7. route tests use player-radius-expanded collision.

Exact wall-segment arrays live in the implementation plan. The room and opening rectangles in this spec remain the architectural source of truth if a wall-segment typo is found.

---

# 15. Source ownership

| Concern | Owning source |
|---|---|
| Geometry primitives and top-left conversion | `src/lib/game/content/maps/layouts/geometry.ts` |
| Outdoor bounds, routes, lots, footprints, doors, and returns | `src/lib/game/content/maps/layouts/meadow-entry-v2.ts` |
| Interior rooms, walls, doors, approaches, and prop zones | `src/lib/game/content/maps/layouts/village-interiors-v2.ts` |
| Sundrop terrain, path, collision, region-label, and decor grids | `src/lib/game/content/maps/regions/village-layered.ts` |
| Sundrop fragment composition, pixel-positioned landmarks, transitions, pickups, and ambient NPCs | `src/lib/game/content/maps/regions/village.ts` |
| Shared outdoor connector corridors | `src/lib/game/content/maps/regions/paths.ts` |
| Crossroads local geometry | `src/lib/game/content/maps/regions/crossroads.ts` |
| Meadow Entry composition | `src/lib/game/content/maps/meadow-entry.ts` |
| Direct interior maps | `src/lib/game/content/maps.ts` |
| Rendering, movement, and save normalization | existing runtime contracts |
| Final Meadow Entry art | follow-up ticket after HPA-586 approval |

The layered compiler remains unchanged. Pixel-positioned village objects are composed in `village.ts` from shared coordinate constants instead of being forced through the compiler’s tile-centre object coordinates. The layout modules are coordinate data consumed by existing owners; they are not a second map registry and contain no dialogue, encounters, state, rendering logic, or automatic room compilation.

---

# 16. Graybox delivery

## Outdoor slice

- Rebuild the 80×68 layered ground/decor source.
- Compose building landmarks, transitions, pickups, and ambient NPCs directly in `village.ts` from shared coordinates.
- Draw roads and lots with existing ground tiles.
- Use current building sprites, live collision, and minimal decor.
- Replace the village-to-Crossroads wall maze with named route rectangles.
- Keep stable destination content in place.
- Remove V1 baked images from active map composition.

## Interior slice

- Add full-map explicit ground coverage.
- Add room/corridor floor patches.
- Add explicit walls and door gaps.
- Place transitions, spawns, NPCs, and interaction approaches.
- Add only props required to identify function.
- Do not perform final dressing or final background generation.

Review at native scale: full map, village, village-to-Crossroads seam, Wildwood live graybox, Guild Hall, Hero House, Item Shop, Shrine, one villager house, and collision overlays for the village route and Guild Hall.

---

# 17. Acceptance

## Automated

- All structural rectangles are positive, in bounds, and grid-aligned.
- Four future base chunks are pairwise non-overlapping and cover exactly 6400×6400.
- Village lots do not overlap; every footprint is inside its lot.
- Every door approach reaches a public road; exterior return positions are clear.
- West and east village lanes connect all three horizontal road bands.
- Crossroads reaches all four destination mouths.
- Existing destination IDs and gameplay content remain registered.
- No V1 background ID is active in `meadowEntryMap.backgroundImages`.
- Every interior has explicit full-floor coverage.
- Every room, NPC approach, and exit is reachable.
- NPC approaches are outside body collision and inside interaction range.
- No prop blocks a door, spawn, required route, or approach.
- Existing shop, dialogue, quest, transition, and save identities remain unchanged.

## Manual

Outdoor:

1. start outside Hero House;
2. use the west lane to reach South Lane and Main Street;
3. inspect the village green and building spacing;
4. cross the village-to-Crossroads connector both ways;
5. reach Mistfen, Silverpine, Wildwood, and Tidewatch Coast and return;
6. exercise one encounter, pickup, discovery, gated transition, and save/reload.

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

- Coordinate helpers and outdoor layout constants.
- 80×68 Sundrop layered grids.
- Pixel-positioned village object composition.
- Reworked village-to-Crossroads route and stable destination seams.
- V1 baked backgrounds inactive.
- Outdoor tests and native-scale screenshots.

## PR 3 — interior grayboxes

- Seven interior coordinate constants.
- Complete floors, walls, doors, routes, NPC approaches, and minimal props.
- Interior tests, web/Tauri walkthrough, and screenshots.
- One small world-expansion skill correction requiring structure before art.

HPA-586 closes after PR 2 and PR 3 are accepted.

---

# 19. Follow-up boundaries

Create only after HPA-586 graybox approval:

1. produce and integrate full-coverage Meadow Entry V2 base and foreground art;
2. finish Guild Hall surfaces, walls, and furniture without moving accepted geometry;
3. finish Hero House, Item Shop, Shrine, and villager-house art from accepted grayboxes;
4. remove superseded HPA-406 preloads, generated activation, and obsolete fallback ownership only after V2 art is live.

Final art conforms to accepted geometry. Authoritative geometry must not be moved merely to fit an accidental generated image.
