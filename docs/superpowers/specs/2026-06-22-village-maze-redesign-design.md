# Village Maze Redesign — Design Spec

**Date:** 2026-06-22
**Branch:** `feat/entry-map-enrichment`
**Supersedes:** The village portions of the rejected Phase 1-4 blockout (commits `657ebff`, `6147944`)
**Predecessor:** `2026-06-21-blockout-redesign-design.md` (silverpine pilot — this spec applies the same principles to the entry village)

## Problem

The entry village (Sundrop Village) suffers from three issues the player feels immediately:

1. **Too spread out:** 8 landmarks scattered across ~2300×1300px of open grass. Buildings are 500-1000px apart with nothing between them.
2. **Route too open:** The spawn→crossroads path is a wide diagonal through open field — the player can see the entire village and the exit at once. No exploration, no discovery.
3. **Lacks identity:** Sparse decor (6 pieces total), 1 NPC, no ground tile distinction. Reads as "generic grass field with buildings," not "Sundrop Village."

## Target Feel

**Compact hamlet + maze-like exploration.** Think a tiny JRPG starting village (Pallet Town density) where hedge walls and building facades form an interconnected lane network. The player navigates winding paths, hits intersections with choices, discovers buildings down alleys, and finds minor dead-ends with rewards. The village takes 2-3 minutes to fully map, not 30 seconds.

Key property: **explore to find.** Some buildings (item-shop, villager houses) are tucked behind hedges and not visible from the plaza. The player must walk down alleys and turn corners to discover them.

## Scope

**Full spawn-to-crossroads experience:**
- Village cluster (all 8 landmarks repositioned into ~1200×1000px)
- Hedge maze network (interconnected lanes, ring road, dead-ends)
- Exit corridor (village gate → winding dogleg path → crossroads hub)
- Identity layer (ground tiles, decor, NPCs)

**Out of scope:**
- Interior maps (hero-house, guild-hall, etc.) — unchanged
- Other routes (silverpine already piloted; mistfen/coast/wildwood deferred)
- New gameplay systems, quests, or dialogue trees
- New sprite sheet assets — all decor uses existing frames

---

## 1. Village Cluster Layout

### Footprint

The village compresses from ~2300×1300px to **~1200×1000px** in the SW corner of the 6400×6400 map. Approximate bounds: x∈[400, 1600], y∈[4600, 5600].

### 5 Building Blocks

Buildings are grouped into 5 blocks separated by winding lanes:

| Block | Buildings | Character |
|---|---|---|
| A (NW) | item-shop, villager-house-1 | Commercial + residential, tucked away |
| B (N) | villager-house-2 | Residential, north edge |
| C (NE) | guild-hall + exit gate | Civic, on the main path to the exit |
| D (SW) | hero-house, blacksmith | Player's home, spawn point |
| E (SE) | villager-house-3 | Residential, near the exit approach |

The **plaza** (well, market stall, hanging lantern) sits at the intersection of blocks B/D/E — the village hub.

### Interconnected Lane Network

Lanes form a **ring road** around the village interior, with **cross-lanes** cutting through the middle:

- **Ring road:** hero-house (D) → west lane → Block A → north lane → Block B → Block C → east lane → Block E → south lane → back to D. The player can walk clockwise or counterclockwise.
- **Cross-lane 1:** Plaza → Block A (westward)
- **Cross-lane 2:** Plaza → Block C/exit (northeastward)

At each lane intersection, the player faces a **navigation choice** (left/right/straight). Multiple routes exist between any two points — the player is never funneled into a single path.

### Navigation Choices at Key Junctions

- **SW junction** (near hero-house): go N (toward shop/v-h1) or E (toward plaza)
- **Plaza intersection** (4-way): N (guild/exit), S (shrine/hero), E (v-h3), W (shop/blacksmith)
- **NW junction**: go E (toward v-h2/guild) or S (toward plaza)
- **NE junction**: go S (toward v-h3/plaza) or W (back toward v-h2)

### What the Player Sees from the Plaza

From the plaza, the player sees: the well, the guild-hall (NE), and the shrine (south nook). Everything else is hidden behind hedges — the item-shop, villager houses, and blacksmith are discovered by exploring side alleys.

---

## 2. Hedge Maze Network

### Wall Material

All maze walls are `town-hedge` blockers (64px thick). These are already in the collision system and covered by the connectivity safety net.

### Lane Dimensions

- **Lane width:** 192-256px total (96-128px per side from centerline). Narrower than the silverpine corridors (320px) to create an intimate village feel.
- **Hedge thickness:** 64px (opaque, blocks movement and sight).

### Outer Perimeter

A continuous `town-hedge` wall encloses the entire village cluster. The only gaps are:
- Building doorways (transitions to interior maps)
- The NE exit gate

The player cannot wander into open grass from inside the village.

### Junction Design — Sight-Line Occlusion

At every intersection, **hedge noses** (short 32-64px hedge segments extending into the lane corner) block the perpendicular view. The player must physically walk to the junction and turn to see what's down each path.

Three junction types:

1. **T-junction** (most common): Player approaches and must choose left or right. A hedge nose on the corner blocks view of one branch until they commit.
2. **Dogleg corner**: The lane turns 90°. An inside-corner hedge blocks the view around the bend.
3. **Plaza crossroad** (the only 4-way): All four approaches have hedge noses. From any approach, you see only the plaza itself, not the three other exits.

### Maze Feel Property

At no point inside the village can the player see more than ~1 lane segment ahead (~256px). Every intersection forces a navigation decision. The ring road prevents true stuck-ness (you can always loop around), but sight-line occlusion means you never know what's around the next corner until you commit.

---

## 3. Dead-End System

### Major Dead-Ends (3)

Each leads to a building, branching off the ring road or a cross-lane:

1. **Blacksmith spur** — short alley off Block D, west of hero-house
2. **Item-shop alley** — winding path off Block A, screened so it's invisible from the plaza
3. **Villager-house-2 spur** — short lane off Block B, north edge

### Minor Dead-Ends (6-8)

Short hedge-enclosed spurs (100-200px deep) scattered through the lane network, branching off main lanes through a ~128px gap. Each is a "what's down here?" moment:

**With rewards (2-3):**
- A hidden coin pouch behind a flower bed (west lane, off Block D)
- A field potion tucked behind a tree (cross-lane, near Block B)
- A small chest at the end of a blind alley behind guild-hall

**With atmosphere only (3-4):**
- A quiet garden nook with an autumn maple (`autumnMaple` frame) — north spur off plaza
- A dead-end behind item-shop with crates/storage decor
- A tiny shrine alcove off the south lane (`stoneLantern` or `offeringStand` frame)
- A well-trodden path behind v-house-3 that dead-ends at a garden patch

**With NPC (1-2):**
- A villager NPC (`woodcutterNpc` frame) at the end of a dead-end, muttering flavor dialogue
- A child NPC (`travelerNpc` frame) chasing something around a blind corner

### Total Path Summary

1 ring road + 2 cross-lanes + 3 major dead-ends (buildings) + 6-8 minor dead-ends (texture) = **the full branching network**.

---

## 4. Exit Corridor (Village Gate → Crossroads)

### Village Gate

- A visible gap in the perimeter hedge, flanked by `castleGate` decor pieces on either side (visual threshold, no collision).
- Path tiles change at the gate line: `pathTile` inside (village), bare dirt/grass outside.
- **Threshold beat:** Camera point positioned so the player sees the road stretching ahead for the first time.

### Winding Corridor

Spans ~1900×600px from the village's NE gate (~x1600, y4600) to the crossroads hub (~x3500, y4000).

- **Geometry:** Axis-aligned dogleg path (reuses silverpine approach), ≤320px wide, hedge walls at ±160px perpendicular offset.
- **3-4 dogleg turns** over the ~1900px length. Each turn hides the next segment.
- **Thematic gradient:** Hedges near the village (civilized) → mixed hedges and scattered trees mid-corridor (transition) → trees and rocks near the crossroads (wild). Hedge walls thin out and are replaced by tree collision decor in the final stretch.
- **Final approach:** The last 200px widens from 320px to 400px as it opens into the crossroads hub — a visual release after the enclosed corridor.

### Beats Repositioned

| Beat | New Position | Purpose |
|---|---|---|
| `village-homeward-hook` | Inside village (hero-house/plaza) | Hook — stays in the village |
| `village-fenced-lane-threshold` | The gate | Threshold — leaving town, road ahead visible |
| `village-roadside-nook` | Mid-corridor waymarker (~40% along) | Fork — signpost/waymarker decor, road forks ahead |
| `village-roadside-cache-payoff` | Dead-end pocket off corridor (~70% along) | Payoff — field potion pickup down a short spur |

### Corridor Dead-Ends (1-2)

- The cache pocket (above) — hedge-enclosed spur with the pickup
- A scenic clearing (~50% along) — wider pocket off the lane with an `autumnMaple` tree and a view back toward the village. No reward, just atmosphere.

---

## 5. Identity Layer

### Ground Tiles

| Zone | Tile | Effect |
|---|---|---|
| Village lanes | `pathTile` | Worn dirt path — "people walk here" |
| Plaza | `pathTile` (wider patch) | Small paved square |
| Dead-end pockets | bare grass | Contrast with lanes — "off the path" |
| Behind buildings (interior of hedge pockets) | bare grass | Wild patches |
| Exit corridor (near village) | `pathTile` | Continuity — the road leads out |
| Exit corridor (near crossroads) | bare dirt | Road thins — civilization fading |

### Decor — Concentrated at Decision Points

Every screen inside the village should show at least 1 decor piece. Decor serves as navigation landmarks ("turn left at the maple").

| Location | Frame | Asset | Purpose |
|---|---|---|---|
| Plaza center | (landmark) | — | Well — village heart, visible from all 4 approaches |
| Plaza perimeter | `marketStall` | crossroadsDressing | Commerce, life |
| Plaza | `hangingLantern` | crossroadsDressing | Foreground depth, warm glow |
| Plaza | `flowerBed` (×2) | crossroadsDressing | Color, warmth |
| Plaza | `festivalBanner` | crossroadsDressing | Festive identity — "Sundrop Festival" |
| Each lane junction | `poleLantern` | crossroadsDressing | Wayfinding — warm light at each decision |
| Gate posts (×2) | `poleLantern` | crossroadsDressing | Exit is lit, marked |
| Item-shop alley | `flowerBed` | crossroadsDressing | "Something commercial down here" |
| Dead-end pockets | `autumnMaple` / `flowerBed` / `stoneLantern` / `offeringStand` | shrine/crossroadsDressing | Each pocket gets 1 signature piece |
| Mid-corridor waymarker | `poleLantern` | crossroadsDressing | Junction marker on the exit road |

### NPC Life (4 ambient NPCs)

| NPC | Frame | Location | Role |
|---|---|---|---|
| Plaza wanderer | `travelerNpc` | Near well, pacing | First sign of life (existing `village-wanderer`, repositioned) |
| Junction woodcutter | `woodcutterNpc` | A T-junction in the lane network | Living signpost — flavor dialogue about the village |
| Dead-end villager | `fisherNpc` or `travelerNpc` | End of a minor dead-end | Rewards exploration with world lore |
| Gate crier | `crierNpc` | Near exit gate | Warns about danger — tutorial beat before leaving |

### Identity Arc

- **Spawn** (hero-house): quiet, domestic. Flowers, hanging lantern.
- **Plaza**: the warm heart. Well, stall, NPCs, festival banner, flowers. The "I'm home" moment.
- **Lanes**: intimate, exploratory. Pole lanterns guide, hedges enclose, dead-ends reward.
- **Gate**: the emotional pivot. Warm village behind, unknown road ahead. Crier NPC warns.
- **Corridor**: thinning decor, widening view. The world opens up.

---

## 6. Testing Strategy

### Bug Fix Prerequisite

`bendViolations` helper flags segment 0 if >256px (no previous segment to compute a turn from). Fix: skip `i=0` explicitly. This was flagged in the silverpine final review.

### Village Maze Tests (5 new goal tests)

The village maze is a **branching lane network**, not a single route. The existing helpers (`corridorWidthViolations`, `sightlineViolations`) work on a `mainRoute` polyline. For the village, tests sample a **synthetic lane set** — an array of axis-aligned segments covering every lane in the maze — rather than a single `mainRoute`.

| Test | Method | Threshold |
|---|---|---|
| Village lane width | Sample each lane segment; perpendicular ray to nearest solid | ≤256px total (128px per side), outside declared rooms |
| Village cross-zone occlusion | At each junction, perpendicular ray hits a hedge nose | ≤64px (sight blocked right at the corner) |
| Village dead-end count | Flood-fill dead-end detector | ≥9 dead-ends (3 major + ≥6 minor) |
| Village ring connectivity | Flood-fill from any lane point | 0 isolated lane sections |
| Building accessibility | `collectSolidRects` flood-fill from plaza | All 6+ transitions reachable |

**Width test detail:** A village lane set (array of `{from: Pt, to: Pt}` axis-aligned segments) is defined in the test file. Each segment is sampled every 48px. At each sample, rays cast left and right (perpendicular to segment direction) must hit a solid within 128px+32px tolerance, excluding samples inside declared room bounds.

**Cross-zone occlusion detail:** At each junction point (where two or more lanes meet), rays cast perpendicular to each approach direction must hit a hedge nose within 64px. This is what prevents seeing from one zone into another through the junction.

### Exit Corridor Tests (3 goal tests, reusing silverpine helpers)

| Test | Threshold |
|---|---|
| `corridorWidthViolations` | ≤320px (maxHalfWidth: 160) |
| `sightlineViolations` | <384px forward |
| `bendViolations` | ≥30° per >256px segment (after i=0 fix) |

### Safety Nets (must stay green)

- All-solids connectivity flood-fill (`maps.test.ts`) — every transition, pickup, NPC, discovery reachable
- Critical routes (`maps.test.ts`) — fixtures updated for new village geometry
- `soft-maze` manifest + contract tests — rooms, beats, corridors consistent with new layout
- e2e suite — hero-house entry, item-shop shopping, villager-house-3 arrival

### Human Verification

1. Open `spawn-to-crossroads.svg` — confirm compact cluster, maze lanes, winding exit
2. Run `bun run dev` — walk the village: maze feel? Can you find the item-shop? Does the exit build anticipation?
3. Confirm postcard moments: plaza warmth, dead-end discoveries, gate threshold

---

## 7. Files Touched

| File | Changes |
|---|---|
| `src/lib/game/content/maps/regions/village.ts` | Reposition all landmarks, add hedge maze walls, add decor, add NPCs, update ground tiles |
| `src/lib/game/content/maps/regions/route-scenes.ts` | Reshape `spawn-to-crossroads` mainRoute to dogleg path; reposition beats; add corridor pockets |
| `src/lib/game/content/maps/regions/rooms.ts` | Update village room bounds for new cluster; update beatIds if beat positions change |
| `src/lib/game/content/maps/regions/soft-maze.test.ts` | 5 new village maze goal tests; 3 exit corridor goal tests; fix `bendViolations` i=0 edge case |
| `src/lib/game/content/maps.test.ts` | Update critical route fixtures for new village geometry |
| `src/lib/game/content/maps/regions/blockout-diagram.test.ts` | Regenerate `spawn-to-crossroads.svg` |
| `src/lib/game/content/maps/regions/types.ts` | No changes expected (existing types suffice) |

---

## 8. Dependencies on Prior Work

- **Task 1 (beatId on rooms):** Village rooms already have `beatId`. Bounds will be updated.
- **Task 2 (invariant helpers):** `corridorWidthViolations`, `sightlineViolations`, `bendViolations` are available for the exit corridor portion. Village maze tests use a **lane set sampler** (new test-local helper) rather than the route-based helpers, because the maze is a branching network, not a single polyline.
- **Silverpine pilot learnings:** Dogleg path approach, paired wall technique, and iteration methodology are proven. The village applies the same toolkit with different thresholds and thematic material.
- **`bendViolations` i=0 bug:** Must be fixed before village tests can run cleanly (the village's first lane segment will exceed 256px).
