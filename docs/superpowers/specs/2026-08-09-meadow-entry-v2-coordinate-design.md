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
5. deactivate the current HPA-406/HPA-496 baked visuals during the graybox because they encode the superseded geometry;
6. use existing live terrain, blockers, landmarks, props, transitions, and collision for the graybox;
7. require a future mandatory base package to cover the complete 6400×6400 world, with semantic region art limited to optional overlays;
8. keep direct `WorldMapDefinition` authoring and the existing Sundrop layered source; add no room graph, map compiler, procedural generator, or interior-specific skill.

## Player-facing outcome

The opening map should read as a deliberately composed place rather than a collection of independently positioned destinations.

- Sundrop Village is materially larger and more open.
- Buildings have lots, yards, front approaches, and meaningful separation.
- The village connects to Crossroads through one readable main road rather than a maze of corrective hedge segments.
- Crossroads clearly branches toward Mistfen, Silverpine, Wildwood, and Tidewatch Coast.
- The outer forest no longer depends on a blurred image enlarged across a large region.
- Every pixel of the final outdoor map is covered by a mandatory base layer.
- Every village interior has an authored floor and recognisable architecture before furniture is added.
- Guild Hall reads as rooms connected by a corridor, not as functional labels implied by scattered props.

## Problems this design resolves

1. Current village interiors reveal the shared non-Meadow fallback floor because their maps have no complete authored floor or background.
2. The current Sundrop layered source is 1792×1536 px and feels compressed relative to the 6400×6400 world.
3. The outer-east forest image is visibly blurred and texturally inconsistent.
4. The current semantic crop package does not form one complete rectangular base over the entire map.
5. The existing village and Guild Hall evolved through object placement and corrective collision edits before an architectural master was locked.
6. Exterior door and return coordinates are manually repeated across `village-layered.ts` and `maps.ts`, which has already required several one-off arrival corrections.

## Non-goals

- No new story, dialogue, quest, encounter, reward, economy, or NPC behavior.
- No rewrite of HPA-400 history or compatibility path for its old coordinates.
- No final Meadow Entry art package in HPA-586.
- No final interior furniture pass in HPA-586.
- No `LayeredInteriorSource`, room graph, door graph, compiler, procedural map generator, or generic workflow engine.
- No migration of Meadow Entry to Tiled, LDtk, or another external editor.
- No mandatory `gliese-interior-designer` skill.
- No new approval database, coordinate schema file, screenshot matrix, or provenance system.
- No wholesale relocation of Mistfen, Silverpine, Wildwood, or Tidewatch Coast unless the walkable graybox proves a concrete route defect.
- No deletion of the HPA-406/HPA-496 artifacts during the graybox; they remain historical inputs until replacement art is accepted.

---

# 1. Coordinate convention

## 1.1 Design rectangles

All tables in this document use top-left rectangles:

```text
[x, y, width, height]
```

- `x` and `y` identify the top-left edge.
- Rectangle edges align to the existing 32 px tile grid.
- A one-tile wall is 32 px thick.
- A door or point may have a half-tile centre because it is centred inside a 32 px wall opening.
- Outdoor coordinates are world coordinates.
- Interior coordinates are local to that map.

## 1.2 Runtime conversion

Repository `MapRect` values are centre-based. A design rectangle converts as:

```ts
{
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
  width: rect.width,
  height: rect.height
}
```

The implementation may use one tiny conversion helper so authors keep writing top-left architectural rectangles. It must not infer rooms, walls, doors, or routes.

## 1.3 Circulation and interaction widths

| Structure | Minimum clear width |
|---|---:|
| Outdoor main road | 160 px |
| Outdoor connector trunk | 160 px |
| Village secondary lane | 96 px |
| Guild Hall main corridor | 128 px |
| Other interior corridor | 96 px |
| Interior doorway | 64 px |
| NPC interaction approach | 64×64 px clear square |

For current NPC-pack actors, a named player approach point must be at least 29 px from the NPC centre to clear body collision and no more than 48 px away to remain interactable. This design uses 40 px separation for all changed interactive NPCs.

A decorative sprite may visually overhang a route only when its collision and opaque body do not reduce the required clear width.

---

# 2. Approaches considered

## A. Patch the current coordinates and crops

Enlarge the village locally, add a few floor images, and fill visible crop holes.

Rejected because it preserves the same object-first process, the current connector-wall accumulation, and semantic crops as the base-coverage mechanism.

## B. Coordinate-first revision using existing runtime primitives — selected

Keep the current world size and runtime model. Author explicit rectangles and routes, prove them in a walkable graybox, and produce final art only after the structure is accepted.

This is the smallest approach that fixes the root cause.

## C. Replace authoring with Tiled, LDtk, or a new room framework

Deferred. These tools could improve visual editing later, but HPA-586 does not justify a new importer, schema, migration, or editor workflow. The current primitives are sufficient for one deliberate map.

---

# 3. Meadow Entry outdoor master

## 3.1 World bounds

```text
[0, 0, 6400, 6400]
```

Retain the existing 200×200 tile map. The problem is spatial allocation and visual coverage, not total world capacity.

## 3.2 Functional region envelopes

These rectangles are design envelopes. They may overlap at connectors and do not define texture crops.

| Region | Envelope `[x, y, w, h]` | Treatment |
|---|---:|---|
| Mistfen | `[384, 384, 2816, 3712]` | Retain its major landmark, encounters, and internal route unless a connector fails |
| Silverpine | `[2432, 384, 2048, 2432]` | Retain its shrine approach and internal route |
| Crossroads | `[2880, 2816, 1728, 1952]` | Re-author its route geometry and village handoff |
| Wildwood | `[4320, 256, 1824, 5312]` | Retain gameplay anchors; replace the visual package later |
| Tidewatch Coast | `[3328, 4768, 2816, 1376]` | Retain its ferry, beach, and encounter anchors |
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

Every route edge has a named corridor, a width, and two explicit anchors.

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

Existing regional paths continue from the four destination mouths. HPA-586 may adjust the first local segment inside a destination to create a clean seam, but it does not reposition the destination’s stable content by default.

## 3.4 Route ownership

- `village-layered.ts` owns village roads up to `village-east-gate`.
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

The current village is 56×48 tiles. V2 has approximately 2.02 times its area while remaining inside Meadow Entry.

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

The layout is intentionally sparse. The central green is open, the blacksmith receives a work yard, the shrine receives its own garden, and every residence has a private lot rather than sharing one visual cluster.

## 4.3 Roads and public spaces

| Structure | Rectangle `[x, y, w, h]` |
|---|---:|
| Main Street | `[256, 4608, 2560, 160]` |
| South Lane | `[256, 5376, 2560, 128]` |
| Southern Meadow Lane | `[256, 6016, 2560, 128]` |
| Village Green | `[1152, 4800, 704, 512]` |
| Well footprint | `[1408, 4960, 192, 192]` |

Main Street is the single strong east-west axis. North and south lots connect through explicit approach paths rather than a network of full-height hedge compartments.

## 4.4 Lots, footprints, doors, and approaches

| Structure | Lot `[x, y, w, h]` | Building footprint `[x, y, w, h]` | Door centre | Approach path `[x, y, w, h]` |
|---|---:|---:|---:|---:|
| Villager House 1 | `[384, 4064, 576, 448]` | `[512, 4128, 320, 224]` | `(672, 4352)` | `[624, 4352, 96, 256]` |
| Villager House 2 | `[1088, 4064, 576, 448]` | `[1216, 4128, 320, 224]` | `(1376, 4352)` | `[1328, 4352, 96, 256]` |
| Guild Hall | `[1888, 4032, 800, 480]` | `[1984, 4096, 576, 288]` | `(2272, 4384)` | `[2208, 4384, 128, 224]` |
| Item Shop | `[384, 4832, 704, 448]` | `[480, 4896, 448, 256]` | `(704, 5152)` | `[656, 5152, 96, 224]` |
| Blacksmith | `[1952, 4832, 736, 448]` | `[2048, 4896, 416, 256]` | `(2256, 5152)` | `[2208, 5152, 96, 224]` |
| Hero House | `[384, 5536, 704, 416]` | `[480, 5600, 448, 224]` | `(704, 5824)` | `[656, 5824, 96, 192]` |
| Villager House 3 | `[1184, 5536, 576, 416]` | `[1312, 5600, 320, 224]` | `(1472, 5824)` | `[1424, 5824, 96, 192]` |
| Shrine of Aurora | `[1888, 5504, 800, 448]` | `[2080, 5568, 384, 256]` | `(2272, 5824)` | `[2208, 5824, 128, 192]` |

### Secondary outdoor zones

| Zone | Rectangle `[x, y, w, h]` | Purpose |
|---|---:|---|
| Guild notice yard | `[1952, 4416, 320, 128]` | Civic notice and waiting space, clear of the approach |
| Blacksmith work yard | `[2464, 4896, 160, 320]` | Forge props and material storage |
| Hero side garden | `[960, 5600, 96, 256]` | Small private garden, no route collision |
| Shrine west garden | `[1952, 5568, 96, 320]` | Lantern and hedge zone |
| Shrine east garden | `[2496, 5568, 128, 320]` | Offering and tree zone |

## 4.5 Exterior transition and arrival anchors

The door is the transition anchor. Return arrivals sit 64 px outside the footprint, on the approach path, and face away from the building.

| Map | Exterior door | Return arrival |
|---|---:|---:|
| `hero-house` | `(704, 5824)` | `(704, 5888, down)` |
| `guild-hall` | `(2272, 4384)` | `(2272, 4448, down)` |
| `item-shop` | `(704, 5152)` | `(704, 5216, down)` |
| `villager-house-1` | `(672, 4352)` | `(672, 4416, down)` |
| `villager-house-2` | `(1376, 4352)` | `(1376, 4416, down)` |
| `villager-house-3` | `(1472, 5824)` | `(1472, 5888, down)` |
| `shrine-of-aurora-interior` | `(2272, 5824)` | `(2272, 5888, down)` |

New-run spawn:

```text
(704, 5888), facing up
```

It is derived from the Hero House entrance rather than carried forward as an independent literal.

## 4.6 Village placement rules

- A building sprite must remain inside its approved footprint.
- Its collision footprint must remain inside the building footprint.
- A lot must not overlap another lot.
- An approach path must connect the door to a public road.
- At least 96 px of usable exterior space remains between neighboring building footprints.
- No prop may occupy the first 96 px outside a door.
- The central green remains free of buildings and large collidable decor.
- Ambient NPCs may use public space but may not stand inside a route throat.
- Pickups remain off the critical route and at least five walkable tiles from Main Street.

---

# 5. Outdoor background and visual-quality contract

## 5.1 Mandatory base coverage

The replacement art package must include a mandatory base partition covering the exact world bounds.

Default partition:

| Chunk | Rectangle `[x, y, w, h]` |
|---|---:|
| Northwest | `[0, 0, 3200, 3200]` |
| Northeast | `[3200, 0, 3200, 3200]` |
| Southwest | `[0, 3200, 3200, 3200]` |
| Southeast | `[3200, 3200, 3200, 3200]` |

These four non-overlapping rectangles form exactly 6400×6400 px.

A 4×4 split into 1600×1600 chunks is permitted only if a measured texture or file-size probe rejects the 2×2 package. Changing the split must not change coverage, coordinates, or visual composition.

## 5.2 Base and overlay responsibilities

Mandatory base:

- fills every map pixel;
- owns ground colour, large terrain transitions, shore, marsh, paths, and stable non-occluding scenery;
- renders at 1:1 world scale;
- fails validation when a required chunk is absent or has the wrong dimensions.

Optional overlays:

- tree canopy;
- roofs and eaves;
- fog;
- foreground brush;
- landmark-specific occlusion;
- region accent details.

Semantic regional images may be overlays, but they may not be the only base beneath their region.

## 5.3 Native-scale quality rules

- Review at 100% display scale.
- Do not enlarge a source image beyond 2× without an explicit visual approval.
- Do not stretch one small donor across a whole forest region.
- Large forest masses use repeated native-resolution tree, brush, and floor forms with deliberate edge composition.
- Repetition must be broken through shape, density, spacing, and overlay variation rather than blur or procedural noise.
- Optional overlay failure restores live visuals where needed.
- Mandatory base failure is a validation error, not an accepted fallback mode.

## 5.4 Graybox treatment of V1 art

The HPA-406/HPA-496 runtime images encode the superseded coordinates. During HPA-586 graybox review:

- they remain in the repository as historical artifacts;
- they are not active on `meadow-entry`;
- live terrain, buildings, blockers, fences, and decor render instead;
- their ownership mappings do not suppress live graybox visuals;
- no replacement final PNG is generated in HPA-586.

---

# 6. Interior architecture rules

## 6.1 Shared rules

- Every playable interior has one explicit full-map ground patch.
- Secondary ground patches communicate room and corridor zones during graybox review.
- The renderer’s implicit non-Meadow fill may exist underneath, but no cell may rely on it as its only authored floor.
- Internal walls are explicit 32 px blocker rectangles.
- Main corridors are at least 128 px in Guild Hall and 96 px elsewhere.
- Doors are normally 64–128 px wide.
- Every room is reachable from the entrance without crossing furniture collision.
- Interactive NPCs have one named approach point that is outside body collision and inside interaction range.
- Decorative furniture is added only inside approved prop zones after the room graph passes.
- Existing IDs and gameplay behavior are preserved.

## 6.2 Graybox palette

Reuse existing terrain and blocker assets:

| Meaning | Graybox representation |
|---|---|
| Full authored floor | `cobblestoneTile` |
| Corridor / lobby | `pathTile` |
| Secondary/private room distinction | `plazaStoneTile` or `sandTile` |
| Internal wall | `ruin-wall` blocker |
| Door | explicit gap plus existing doorway transition marker |

This palette is temporary and intentionally not final interior art.

---

# 7. Guild Hall blueprint

## 7.1 Bounds

```text
32 × 26 tiles
1024 × 832 px
```

## 7.2 Plan

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

## 7.3 Rooms and corridors

| Structure | Rectangle `[x, y, w, h]` |
|---|---:|
| Records / Quest Hall | `[64, 64, 352, 256]` |
| Common Hall | `[64, 352, 352, 288]` |
| Main spine corridor | `[448, 64, 128, 608]` |
| Guild Master office | `[608, 64, 352, 192]` |
| Training Hall | `[608, 288, 352, 160]` |
| Quartermaster room | `[608, 480, 352, 160]` |
| Entrance lobby | `[352, 672, 320, 128]` |

## 7.4 Door openings

| Connection | Opening `[x, y, w, h]` |
|---|---:|
| Records ↔ spine | `[416, 144, 32, 96]` |
| Common Hall ↔ spine | `[416, 448, 32, 96]` |
| Guild Master ↔ spine | `[576, 112, 32, 96]` |
| Training ↔ spine | `[576, 320, 32, 96]` |
| Quartermaster ↔ spine | `[576, 512, 32, 96]` |
| Exterior | `[480, 800, 64, 32]` |

## 7.5 Anchors

| Anchor | Point |
|---|---:|
| Spawn / inbound arrival | `(512, 736)`, facing up |
| Outbound transition | `(512, 816)` |
| Guild Master | `(800, 144)` |
| Guild Master approach | `(800, 184)` |
| Quartermaster | `(816, 528)` |
| Quartermaster approach | `(816, 568)` |
| West ambient member | `(160, 544)` |
| East ambient member | `(704, 368)` |

## 7.6 Prop zones

| Zone | Rectangle `[x, y, w, h]` |
|---|---:|
| Records shelves | `[80, 80, 112, 176]` |
| Quest board / records desk | `[224, 80, 160, 96]` |
| Common table and seating | `[128, 416, 224, 128]` |
| Guild Master station | `[704, 80, 192, 112]` |
| Training equipment | `[704, 320, 192, 96]` |
| Quartermaster station | `[672, 504, 224, 80]` |
| Lobby notice / benches | `[384, 704, 256, 64]` |

Furniture remains inside these zones and outside the named approach points, door openings, and required routes. Counter and desk collision must be narrower than their visual sprites when necessary to preserve the 40 px interaction approach.

---

# 8. Hero House blueprint

## 8.1 Bounds

```text
22 × 18 tiles
704 × 576 px
```

## 8.2 Plan

```text
┌───────────────┬─────────┬───────────────┐
│ Bedroom       │ Hall    │ Study/Storage │
├───────────────┴────┬────┴───────────────┤
│                    Living / Kitchen      │
└──────────────────────┬───────────────────┘
                       Exit
```

## 8.3 Geometry

| Structure | Rectangle `[x, y, w, h]` |
|---|---:|
| Bedroom | `[64, 64, 208, 192]` |
| Hall | `[304, 64, 96, 224]` |
| Study / storage | `[432, 64, 208, 192]` |
| Living / kitchen | `[64, 288, 576, 256]` |
| Bedroom door | `[272, 128, 32, 64]` |
| Study door | `[400, 128, 32, 64]` |
| Hall opening to living | `[304, 256, 96, 32]` |
| Exterior door | `[320, 544, 64, 32]` |

## 8.4 Anchors and prop zones

| Item | Value |
|---|---:|
| Spawn | `(352, 480)`, facing up |
| Exit | `(352, 560)` |
| Bed zone | `[96, 96, 128, 96]` |
| Study desk / shelf zone | `[480, 96, 128, 128]` |
| Living table zone | `[224, 352, 160, 96]` |
| Kitchen / storage zone | `[480, 352, 128, 128]` |

---

# 9. Item Shop blueprint

## 9.1 Bounds

```text
26 × 20 tiles
832 × 640 px
```

## 9.2 Plan

```text
┌────────────────┬────────────┬────────────────┐
│ Stockroom      │ Service    │ Office         │
│                │ corridor   │                │
├────────────────┴──────┬─────┴────────────────┤
│     customer aisle    │ customer aisle       │
│           ┌──────── Counter ────────┐         │
│           │      Shopkeeper         │         │
│                 Sales Floor                   │
└────────────────────────┬──────────────────────┘
                         Exit
```

## 9.3 Geometry

| Structure | Rectangle `[x, y, w, h]` |
|---|---:|
| Stockroom | `[64, 64, 256, 160]` |
| Service corridor | `[352, 64, 128, 192]` |
| Office | `[512, 64, 256, 160]` |
| Sales floor | `[64, 256, 704, 352]` |
| Stockroom door | `[320, 112, 32, 64]` |
| Office door | `[480, 112, 32, 64]` |
| Service opening to sales | `[352, 224, 128, 32]` |
| Exterior door | `[384, 608, 64, 32]` |

## 9.4 Anchors and prop zones

| Item | Value |
|---|---:|
| Spawn | `(416, 544)`, facing up |
| Exit | `(416, 624)` |
| Shopkeeper Mira | `(416, 320)` |
| Customer approach | `(416, 360)` |
| Counter visual zone | `[224, 312, 384, 48]` |
| Counter collision strip | `[224, 336, 384, 8]` |
| West display zone | `[96, 384, 96, 128]` |
| East display zone | `[640, 384, 96, 128]` |
| Stock shelves | `[96, 96, 192, 96]` |
| Office desk | `[560, 96, 160, 96]` |
| Ambient customer | `(224, 480)` |

The counter’s thin collision strip visually separates Mira and the customer while leaving the named approach outside player-radius-expanded collision and within the 48 px interaction limit.

---

# 10. Shrine of Aurora blueprint

## 10.1 Bounds

```text
24 × 22 tiles
768 × 704 px
```

## 10.2 Plan

```text
          ┌────────────────────┐
          │   Inner Sanctum    │
┌─────────┴───┬────────────┬───┴─────────┐
│ Preparation │    Nave    │ Archive     │
│             │            │             │
└─────────────┴──────┬─────┴─────────────┘
                 Entrance Hall
                       │
                      Exit
```

## 10.3 Geometry

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
| Nave → entrance opening | `[320, 544, 128, 32]` |
| Exterior door | `[352, 672, 64, 32]` |

## 10.4 Anchors and prop zones

| Item | Value |
|---|---:|
| Spawn | `(384, 608)`, facing up |
| Exit | `(384, 688)` |
| Altar / offerings | `[288, 96, 192, 96]` |
| Nave benches | `[256, 352, 256, 128]` |
| Preparation props | `[80, 320, 96, 128]` |
| Archive shelves | `[592, 288, 96, 160]` |
| Entrance lamps | `[288, 592, 192, 64]` |

---

# 11. Villager House 1 blueprint

Theme: family home.

## 11.1 Bounds and geometry

```text
20 × 18 tiles
640 × 576 px
```

| Structure | Rectangle `[x, y, w, h]` |
|---|---:|
| Bedroom | `[64, 64, 192, 192]` |
| Hall | `[288, 64, 96, 224]` |
| Storage | `[416, 64, 160, 192]` |
| Living / kitchen | `[64, 288, 512, 256]` |
| Bedroom door | `[256, 128, 32, 64]` |
| Storage door | `[384, 128, 32, 64]` |
| Hall opening to living | `[288, 256, 96, 32]` |
| Exterior door | `[288, 544, 64, 32]` |

## 11.2 Anchors and prop zones

| Item | Value |
|---|---:|
| Spawn | `(320, 480)`, facing up |
| Exit | `(320, 560)` |
| Villager Lynn | `(160, 416)` |
| Lynn approach | `(200, 416)` |
| Family ambient NPC | `(480, 416)` |
| Bed zone | `[80, 96, 144, 96]` |
| Family table zone | `[224, 352, 192, 96]` |
| Kitchen zone | `[448, 320, 96, 128]` |
| Storage zone | `[432, 96, 112, 128]` |

---

# 12. Villager House 2 blueprint

Theme: craft worker’s home.

## 12.1 Bounds and geometry

```text
22 × 18 tiles
704 × 576 px
```

| Structure | Rectangle `[x, y, w, h]` |
|---|---:|
| Workshop | `[64, 64, 256, 224]` |
| Hall | `[352, 64, 96, 256]` |
| Bedroom | `[480, 64, 160, 224]` |
| Living area | `[64, 320, 576, 224]` |
| Workshop door | `[320, 128, 32, 96]` |
| Bedroom door | `[448, 128, 32, 96]` |
| Hall opening to living | `[352, 288, 96, 32]` |
| Exterior door | `[320, 544, 64, 32]` |

## 12.2 Anchors and prop zones

| Item | Value |
|---|---:|
| Spawn | `(352, 480)`, facing up |
| Exit | `(352, 560)` |
| Villager Toma | `(192, 192)` |
| Toma approach | `(232, 192)` |
| Neighbor ambient NPC | `(512, 416)` |
| Work table zone | `[96, 112, 160, 96]` |
| Workshop storage | `[96, 224, 192, 48]` |
| Bedroom zone | `[496, 96, 128, 160]` |
| Living table zone | `[224, 384, 192, 96]` |

---

# 13. Villager House 3 blueprint

Theme: reader and amateur archivist.

## 13.1 Bounds and geometry

```text
20 × 20 tiles
640 × 640 px
```

| Structure | Rectangle `[x, y, w, h]` |
|---|---:|
| Archive / study | `[64, 64, 192, 256]` |
| Hall | `[288, 64, 96, 288]` |
| Bedroom / storage | `[416, 64, 160, 256]` |
| Sitting room | `[64, 352, 512, 256]` |
| Archive door | `[256, 128, 32, 96]` |
| Bedroom door | `[384, 128, 32, 96]` |
| Hall opening to sitting room | `[288, 320, 96, 32]` |
| Exterior door | `[288, 608, 64, 32]` |

## 13.2 Anchors and prop zones

| Item | Value |
|---|---:|
| Spawn | `(320, 544)`, facing up |
| Exit | `(320, 624)` |
| Villager Io | `(160, 192)` |
| Io approach | `(200, 192)` |
| Neighbor ambient NPC | `(480, 480)` |
| Archive shelves | `[80, 96, 144, 192]` |
| Reading table | `[96, 384, 160, 96]` |
| Bedroom zone | `[432, 96, 112, 160]` |
| Sitting zone | `[320, 416, 192, 128]` |

---

# 14. Architectural wall contract

For every interior:

1. the map edge is a 32 px wall band except at the exterior door;
2. the 32 px gaps between named rooms are walls except at listed openings;
3. unused pockets outside the named rooms are blocked as solid service/structure space;
4. wall blockers use explicit IDs and top-left rectangles;
5. no wall rectangle is inferred from furniture;
6. door openings are verified before props are added;
7. the route test samples player-radius-expanded collision rather than checking only visual overlap.

The implementation plan lists the exact wall segments. The document’s room and opening rectangles remain the architectural source of truth if a wall-segment typo is found.

---

# 15. Ownership and source boundaries

| Concern | Owning source |
|---|---|
| Outdoor coordinate constants and shared exterior anchors | `src/lib/game/content/maps/layouts/meadow-entry-v2.ts` |
| Interior room, wall, door, and approach constants | `src/lib/game/content/maps/layouts/village-interiors-v2.ts` |
| Top-left to centre conversion | `src/lib/game/content/maps/layouts/geometry.ts` |
| Sundrop tile layers, building objects, and village transitions | `src/lib/game/content/maps/regions/village-layered.ts` |
| Village fragment wrapper | `src/lib/game/content/maps/regions/village.ts` |
| Shared connector corridors | `src/lib/game/content/maps/regions/paths.ts` |
| Crossroads local geometry | `src/lib/game/content/maps/regions/crossroads.ts` |
| Outdoor composition | `src/lib/game/content/maps/meadow-entry.ts` |
| Direct interior `WorldMapDefinition` values | `src/lib/game/content/maps.ts` |
| Rendering and movement behavior | existing `WorldScene` contracts |
| Save normalization | existing save-state contracts |
| Final Meadow Entry art | follow-up art ticket after HPA-586 approval |

The two layout modules are authoritative coordinate constants consumed by the current map sources. They are not a second map registry and do not contain dialogue, encounters, state, rendering logic, or automatic room compilation.

---

# 16. Graybox delivery

## 16.1 Outdoor graybox

- Rebuild the 80×68 village layered source.
- Draw roads and lots using existing ground tiles.
- Use current building sprites at approved footprints.
- Use live blockers, fences, and minimal decor.
- Replace the village-to-Crossroads wall maze with the named corridor rectangles.
- Keep stable destination content in place.
- Remove V1 baked images from the active map composition.
- Preserve all content IDs and transition behavior.

## 16.2 Interior graybox

- Add full-map explicit ground coverage.
- Add room and corridor floor patches.
- Add explicit wall blockers and door gaps.
- Place transitions, spawns, NPCs, and interaction approaches.
- Add only the minimum props necessary to identify function.
- Do not perform final furniture dressing or generate final background art.

## 16.3 Review artifacts

Capture native-scale screenshots for:

1. full Meadow Entry overview;
2. Sundrop Village at normal camera scale;
3. village-to-Crossroads handoff;
4. Wildwood with V1 blurred art inactive;
5. Guild Hall full layout;
6. Hero House;
7. Item Shop;
8. Shrine of Aurora;
9. one representative villager house;
10. collision-debug overlays for the village route and Guild Hall.

Screenshots are review aids, not a permanent evidence database.

---

# 17. Automated acceptance

## 17.1 Coordinate contracts

- All rectangle edges align to 32 px.
- Every rectangle has positive dimensions.
- Every rectangle is inside its map or world bounds.
- The four base chunks are pairwise non-overlapping and their area equals 6400×6400.
- Village lots do not overlap.
- Every footprint is inside its lot.
- Every approach connects a door to a road.
- Exterior return arrivals are on their approach paths and clear of building collision.

## 17.2 Outdoor playability

- New-run spawn is valid.
- Main Street reaches Crossroads.
- Crossroads reaches all four destination mouths.
- Existing destination transitions, encounters, pickups, discoveries, and landmarks remain registered.
- Every changed connector mouth is walkable in both directions.
- No inactive V1 background ID appears in `meadowEntryMap.backgroundImages`.
- Live blockers, fences, and decor remain visible when V1 backgrounds are inactive.

## 17.3 Interior playability

- Every interior has explicit full-map floor coverage.
- Every room is reachable from spawn through listed doors/corridors.
- Every outbound transition is reachable.
- Inbound arrivals equal the target map’s spawn and direction.
- Every NPC approach is outside body collision and inside interaction range.
- No prop collision overlaps a door, required route, spawn, or approach.
- Shop, dialogue, quest, transition, and save IDs remain unchanged.
- Representative saves in Guild Hall and Meadow Entry reload to valid walkable positions.

---

# 18. Manual acceptance walkthrough

## Outdoor

1. Start outside Hero House.
2. Walk the southern lane and inspect the increased spacing.
3. Enter the village green and confirm the well reads as the central anchor.
4. Walk Main Street from its west end to the east gate.
5. Cross the village-to-Crossroads connector in both directions.
6. From Crossroads, reach Mistfen, Silverpine, Wildwood, and Tidewatch Coast and return.
7. Exercise one encounter, pickup, discovery, and gated transition representative of the preserved regions.
8. Save and reload in Wildwood or Crossroads.

## Interiors

For each of the seven interiors:

1. enter from its exterior door;
2. traverse every room and corridor;
3. verify no implicit fallback floor is visible;
4. approach every interactive NPC;
5. exercise the Guild and Item Shop interactions where applicable;
6. return outside without immediate re-trigger or collision trap.

Perform one normal web walkthrough and one packaged Tauri walkthrough after both graybox PRs are combined.

---

# 19. Delivery sequence

## PR 1 — this design package

- Coordinate master.
- Implementation plan.
- No runtime changes.

## PR 2 — outdoor graybox

- Coordinate helpers and outdoor layout constants.
- 80×68 Sundrop layered source.
- Shared exterior anchors.
- Reworked village-to-Crossroads route.
- Stable destination seams.
- V1 baked backgrounds inactive.
- Outdoor tests and screenshots.

## PR 3 — interior grayboxes

- Seven interior coordinate constants.
- Complete floors, walls, doors, routes, NPC approaches, and minimal props.
- Interior tests, web/Tauri walkthrough, and screenshots.
- One small world-expansion skill correction describing structure-before-art.

HPA-586 closes after PR 2 and PR 3 are accepted.

---

# 20. Follow-up implementation boundaries

After HPA-586 approval, create focused tickets for:

1. producing and integrating full-coverage Meadow Entry V2 base and foreground art;
2. finishing Guild Hall surfaces, walls, and furniture from the approved graybox;
3. finishing Hero House, Item Shop, Shrine, and villager-house art from the approved grayboxes;
4. cleaning out superseded HPA-406 runtime preloads and generated activation only after replacement art is live.

The coordinate master remains valid across those tickets. Final art must conform to the geometry; geometry must not be moved merely to fit an accidental generated image.
