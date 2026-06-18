# Entry-Map Exploration Audit — 2026-06-17

**Map:** `meadow-entry` (200×200 tiles × 32 px = 6400×6400 px)
**Player spawn:** `{ x: 1536, y: 5550 }` (village center, near `sundrop-well`)
**Source files audited:**
- `src/lib/game/content/maps/regions/village.ts`
- `src/lib/game/content/maps/regions/crossroads.ts`
- `src/lib/game/content/maps/regions/coast.ts`
- `src/lib/game/content/maps/regions/mistfen.ts`
- `src/lib/game/content/maps/regions/silverpine.ts`
- `src/lib/game/content/maps/regions/wildwood.ts`
- `src/lib/game/content/maps/regions/paths.ts`
- `src/lib/game/content/maps/meadow-entry.ts`

---

## Route 1: Spawn → Crossroads

**Purpose:** Orient the player from their home village into the wider world. This corridor introduces the game's tone and establishes Crossroads as the social hub.

**Anchor:** Crossroads plaza at approx. `(3500, 4000)` — cobblestone ground patch `crossroads-plaza` (900×900 px, `cobblestoneTile`), waystone landmark `crossroads-waystone` at `(3500, 4000)`, and castle-gate landmark `castle-gate` at `(3500, 2980)` looming to the north.

**Approach clues:**
- The `sundrop-north-lane` ground patch (`x: 1536, y: 4800, width: 64`) provides a visible northward path tile starting inside the village plaza.
- The `sundrop-northeast-branch` patch (`x: 2176, y: 4797`) angles the road east toward Crossroads.
- The connector segment `link-village-crossroads` in `paths.ts` (`x: 2750, y: 4700, width: 900, height: 64`) and `link-village-crossroads-v` (`x: 3050, y: 4550, height: 360`) close the gap to the plaza.
- `crossroads-festival-road` (`x: 3500, y: 3350, width: 120, height: 1400`) creates a strong visual axis toward the castle gate from the plaza.
- The `crossroads-banner` decor (`festivalBanner` at `x: 3200, y: 4200`) and `crossroads-hanging-lantern` (`x: 3500, y: 3700`) add atmospheric read from a distance.

**Optional branches:**
- From village: the item-shop (`meadow-to-item-shop` at `x: 2138, y: 4717`) and villager houses 2 (`x: 1011, y: 4712`) and 3 (`x: 2592, y: 4912`) are reachable as side detours before the main road.
- The `blacksmith` landmark (`x: 595, y: 4877`) and `shrine-of-aurora` (`x: 1050, y: 5872`) offer early-game lore stops.

**Payoffs:**
- Village landmarks: guild-hall, item-shop, hero-house, shrine-of-aurora — all with interior transitions.
- Ambient NPCs: `village-wanderer` (`x: 1700, y: 5700`, `travelerNpc`), `crossroads-crier` (`x: 3400, y: 4000`), `crossroads-traveler` (`x: 3700, y: 4300`).
- Decorative density: market stall (`village-stall`), flower bed (`village-flowers`), hanging lantern, maple tree — the village is visually rich.

**MISSING PAYOFF — Crossroads has no pickup.**
The crossroads plaza (`crossroads-plaza` cobblestone, 900×900 at `(3500, 4000)`) contains zero `pickups` entries. The `crossroadsRegion` fragment declares no `pickups` field at all. Every other destination region (coast, mistfen, silverpine) has at least one collectible. Reaching Crossroads after the journey from spawn yields no tangible reward beyond ambient NPC flavor — no consumable, no key item, nothing to pick up. This is the most traversed point on the map and the weakest payoff per unit of player foot-traffic.

**Empty-feeling segments:**
- The `paths.ts` connector `link-village-crossroads` (`x: 2750, y: 4700, width: 900, height: 64`) is a bare 900 px horizontal strip with no decor, no NPC, and no encounter. A player walking east from the village to Crossroads crosses nearly 750 px of undifferentiated grass with nothing to interact with.

**Collision risks:**
- The `crossroads-waystone-collision` body (`x: 3500, y: 4040, width: 90, height: 80`) sits dead-center in the plaza. If two ambient NPCs (`crier` at `x: 3400` and `traveler` at `x: 3700`) both move toward the waystone, they can converge on the collision box and visually clip — minor, but worth noting.

**Recommended fix:** Add one pickup to the Crossroads plaza — e.g., a `field-potion` or vendor token at approximately `(3700, 3800)` (northeast of the waystone, clear of collision boxes). This closes the only region with zero collectibles and rewards players for making the journey.

---

## Route 2: Crossroads → Coast

**Purpose:** Deliver a contrast biome — open sea air, fishing culture, and a ferry-crossing landmark that hints at future travel. The route SE from Crossroads is the game's primary "destination" for casual exploration.

**Anchor:** Ferry-crossing shrine at `(3600, 5720)` and the coast sea patch at `(4600, 6180, 3000×360)`. The `torii` decor (`x: 4200, y: 6160`) provides an iconic vertical silhouette visible from the approach path.

**Approach clues:**
- `link-crossroads-coast` in `paths.ts` (`x: 3900, y: 4700, width: 900`) connects plaza eastward.
- `link-crossroads-coast-v` (`x: 4200, y: 5100, width: 64, height: 900`) descends south to the coastal sand strip.
- `coast-approach-path` in `coast.ts` (`x: 4200, y: 5500, width: 64, height: 360`) continues the descent to the sand.
- The `coast-foam` decor tile (`shorelineFoam` at `y: 6000, width: 3000`) provides a persistent horizon cue.
- `coast-driftwood` (`x: 4000, y: 5900`) appears near the top of the coast region as a visual teaser.

**Optional branches:**
- **MISSING OPTIONAL BRANCH.** Once the player turns south from Crossroads onto the Coast path (via `link-crossroads-coast-v` at `x: 4200`), there are no side-paths, no detour landmarks, and no alternative route. The full 1260 px descent from `y: 4700` to `y: 5960` (coast sand) is a linear corridor. No branch leads to the `coast-boat` (`x: 5000, y: 5900`) from inland — it's only accessible by walking along the shore after arrival. A westward fork from the descent path toward the `coast-ferry-shrine` (`x: 3600, y: 5720`) would create a choice: dock first, or walk the sand.

**Payoffs:**
- `coast-salve` pickup: `sunleaf-salve` at `(5300, 5820)` — tucked east of the `coast-net` decor near the tidepool.
- Ambient NPC: `coast-fisher` at `(4500, 5780)`.
- Decor: `coast-boat` (`fishingBoat`), `coast-net`, `coast-tidepool`, `coast-jetty` — visually dense shoreline.
- Landmark: `ferry-crossing` with `coast-ferry-shrine` sprite and collision.

**Empty-feeling segments:**
- The horizontal `link-crossroads-coast` strip (`x: 3900, y: 4700, width: 900, height: 64`) — 900 px of bare path — has no flanking decor, no NPC, and no reason to slow down. It parallels the wildwood road and is easily confused with it.

**Collision risks:**
- `coast-boat-collision` (`x: 5000, y: 5900, width: 200, height: 120`) and `coast-ferry-shrine-collision` (`x: 3600, y: 5760, width: 200, height: 140`) are large obstacles in a narrow-ish sand strip. A player walking the full coast width must zigzag around them, which can feel awkward without clear visual guidance.

**Recommended fix:** Add a short eastward fork off `link-crossroads-coast-v` at roughly `y: 5400` that leads toward the `coast-ferry-shrine` `(3600, 5720)` as an alternate entry point, giving players a branch choice before the main descent reaches the shore.

---

## Route 3: Crossroads → Mistfen

**Purpose:** Introduce the game's dark/hazard biome. Mistfen (NW of map) is swampy, fog-shrouded, and gated at `witchwood-gate` — a locked future-zone that signals "there is more here." This route creates tension through visual contrast with the village.

**Anchor:** `witchwood-gate` landmark at `(1200, 620)` with `witchwoodGate` sprite and `witchwood-gate-block` blocker (`kind: 'future-gate'`). The `mistfen-fog` decor tile (`alpha: 0.35`, covers `(1250, 1750, 2000×2300)`) is visible from a distance.

**Approach clues:**
- `link-crossroads-mistfen` in `paths.ts` (`x: 3050, y: 3150, width: 64, height: 820`) descends north from the crossroads plaza.
- `link-crossroads-mistfen-h` (`x: 2690, y: 2750, width: 740`) sweeps west to connect.
- `mistfen-approach-path` in `mistfen.ts` (`x: 2150, y: 2750, width: 360`) closes the gap into the basin.
- **MISSING APPROACH CLUE.** There is no visual landmark, NPC, or directional decor at the junction where `link-crossroads-mistfen` begins at `(3050, 3150)`. A player at the Crossroads plaza sees the festival-road heading north toward `castle-gate` and the cobblestone terrace. The unmarked western descent into Mistfen has no signpost, warning marker, or ambient NPC to draw the eye. Players can miss the turn entirely, especially since the path is 64 px wide and starts at the plaza's west edge. A signpost decor piece or an NPC at `(3050, 3400)` warning "the fen lies west" would make this turn legible.

**Optional branches:**
- `mistfen-marsh-rock` (`x: 720, y: 2300`) and `mistfen-toxic-bloom` (`x: 1040, y: 2000`) are scattered across the basin, passable as decor-only detours.
- `mistfen-pool-west` (`x: 800, y: 1400`, `seaTile`) and `mistfen-pool-east` (`x: 1700, y: 2100`) are navigable around — the pools form loose obstacles that define a west vs. east path through the basin.

**Payoffs:**
- `mistfen-salve` pickup: `sunleaf-salve` at `(880, 2500)` — reachable only by crossing most of the marsh basin.
- Ambient NPC: `mistfen-forager` at `(1120, 2400)`.
- `witchwood-gate` (future gated zone) at `(1200, 620)` — visual promise of locked content.
- Decor: `mistfen-dead-tree-west/east`, `toxicBloom`, `reeds`, `marshRock`, `fog` overlay.

**Empty-feeling segments:**
- The connector pair `link-crossroads-mistfen` + `link-crossroads-mistfen-h` covers ~1600 px of travel (from `x: 3050, y: 3150` down to `y: 2750`, then west to `x: 2150`) with no decor, NPC, or encounter along either segment. The 820 px vertical drop especially is a featureless path tile.

**Collision risks:**
- `mistfen-dead-tree-west-collision` (`x: 620, y: 1180, width: 80`) and `mistfen-marsh-rock-collision` (`x: 720, y: 2320, width: 120`) are both on the western side of the basin. Combined with `mistfen-pool-west` (`seaTile` blocker implied), the west bank of Mistfen accumulates collision pressure — a player hugging the west wall could get stuck in a cluster.

**Recommended fix:** Add a waymarker or warning NPC decor at the `(3050, 3400)` turn-off from Crossroads to signal the Mistfen route — this is the most critical missing approach cue on the map.

---

## Route 4: Crossroads → Silverpine

**Purpose:** Ascent to a serene mountain shrine zone. Silverpine (N of center, `y: 480–2800`) offers the game's most "sacred" atmosphere — autumn leaves, stone lanterns, a locked shrine gate — contrasting sharply with Mistfen's dread.

**Anchor:** `silver-shrine-gate` landmark at `(3000, 480)` with `silverShrineGate` sprite and `silver-shrine-gate-block` blocker (`future-gate`). The `silverpine-shrine-terrace` ground patch (`cobblestoneTile` at `x: 3000, y: 520`) and flanking stone lanterns (`silverpine-lantern-west/east` at `x: 2700/3300, y: 760`) frame the destination.

**Approach clues:**
- `crossroads-festival-road` in `crossroadsRegion` (`x: 3500, y: 3350, width: 120, height: 1400`) is already a strong north axis.
- `crossroads-gate-terrace` (`x: 3500, y: 3020, width: 700, height: 300, cobblestoneTile`) and `castle-gate` landmark (`x: 3500, y: 2980`) dominate the northern view — but these point toward the castle, not Silverpine.
- `link-crossroads-silverpine` in `paths.ts` (`x: 3300, y: 2950, width: 500`) branches west from the festival road to `x: 3050`, then presumably follows `link-crossroads-mistfen` northward before diverging. However, the Silverpine connector itself (`width: 500, height: 64` at `y: 2950`) only bridges from the festival road to roughly `x: 3050` — it does not extend to `x: 3000` where the stair path (`silverpine-stair-path` at `x: 3100, y: 1600`) begins. There is a gap between the connector's west end and the stair-path's south end (`y: 4000` — the stair covers `y: 1600` to `y: 4000` per `height: 2400`).
- The `silverpine-amulet-rack` decor (`x: 2840, y: 1120`) and `silverpine-tree-1/maple-1/maple-2` trees provide visual density in the grove zone that players can see once they enter the area, but there is no forward teaser visible from Crossroads.

**Optional branches:**
- Within the grove (`silverpine-grove-floor` at `x: 3100, y: 900, 1400×1000`), `silverpine-maple-1` (`x: 3640, y: 1400`) and `silverpine-maple-2` (`x: 2700, y: 1900`) flank the stair path — navigating around them offers a slight east vs. west choice within the grove.
- `silverpine-offering` (`x: 3000, y: 720`) and `silverpine-amulet-rack` (`x: 2840, y: 1120`) are optional inspect points before the gate.

**Payoffs:**
- `silverpine-tonic` pickup: `field-potion` at `(2900, 1700)` — hidden in the grove between the maple trees.
- Ambient NPC: `silverpine-pilgrim` at `(3100, 1150)`.
- `silver-shrine-gate` (future gated zone) — visual promise of locked content.
- Seasonal atmosphere: `autumnLeafTile` grove floor, stone lanterns, `offeringStand`, `amuletRack`.

**Empty-feeling segments:**
- The `link-crossroads-silverpine` horizontal connector (`x: 3300, y: 2950, width: 500, height: 64`) and the subsequent shared portion of `link-crossroads-mistfen` (`x: 3050, y: 3150`) are bare of decor. The approach to Silverpine blends visually with the Mistfen path until the stair-path begins at `y: 4000` — no distinguishing visual cue separates the two branches.

**Collision risks:**
- `silverpine-lantern-west-collision` (`x: 2700, y: 820`) and `silverpine-lantern-east-collision` (`x: 3300, y: 820`) flank the shrine terrace. Combined with `silverpine-tree-1-collision` (`x: 2540, y: 1400`) to the west, the approach narrows. Players heading directly for the gate may walk into a lantern collision box unexpectedly.

**Recommended fix:** Add a small directional decor piece (e.g., a torii or stone pillar) at approximately `(3200, 2950)` — the junction of `link-crossroads-silverpine` — to visually distinguish the Silverpine turn from the nearby Mistfen descent. This doubles as the missing approach cue for the grove.

---

## Route 5: Crossroads → Wildwood

**Purpose:** Lead the player to the combat zone — slime encounters, escalating difficulty pockets, and eventually the gated dungeon entrance (`ruins-threshold`). This is the game's action corridor.

**Anchor:** `whispering-cave` landmark at `(5960, 1800)` with `meadow-to-whispering-cave-ruins-threshold` transition (quest-gated: requires `talk-to-guild-master` objective of `investigate-the-ruins`). Three `slime-scout` encounters guard the approach: `meadow-slime-west` (`x: 4928, y: 960`), `meadow-slime-center` (`x: 5360, y: 1280`), `meadow-slime-east` (`x: 5920, y: 1600`).

**Approach clues:**
- `link-crossroads-wildwood` in `paths.ts` (`x: 4000, y: 4300, width: 64, height: 1100`) descends north from the Crossroads latitude.
- `sundrop-forest-road-east` in `wildwoodRegion` (`x: 4200, y: 5347, width: 2800, height: 70`) connects from the village east lane.
- `sundrop-forest-road-north` (`x: 5600, y: 3200, width: 70, height: 4300`) is the vertical spine climbing north to the cave.
- `wildwood-grove-tree-1` (`x: 4400, y: 3000`), `wildwood-grove-tree-2` (`x: 4900, y: 4300`), and `wildwood-grove-brush-1` (`x: 4650, y: 3650`) stagger the tree-line alongside the road, creating a "entering the forest" atmosphere.
- `wildwood-woodcutter` ambient NPC at `(4600, 3300)` — the only human figure in the forest corridor, providing early foreshadowing.
- Three combat pockets with ground patches: `wildwood-north-combat-pocket` at `(5120, 960)`, `wildwood-crossing-combat-pocket` at `(5360, 1280)`, `whispering-cave-combat-pocket` at `(5920, 1600)` — visual escalation visible as floor tiles change.

**Optional branches:**
- `wildwood-cave-branch` (`x: 5880, y: 1600, width: 520, height: 70`) breaks off the main north road to angle toward the cave — a minor fork.
- The three combat pockets are spatially staggered: approaching from the south road, the player can see the western pocket first and potentially avoid the center pocket by hugging the path edge.
- No significant alternate routes or scenic detours exist within the Wildwood zone itself once the forest road north begins.

**Payoffs:**
- Three `slime-scout` encounters (`meadow-slime-west/center/east`) — combat rewards.
- `meadow-to-whispering-cave-ruins-threshold` transition into the dungeon — the route's ultimate destination.
- `wildwood-woodcutter` ambient NPC for flavor.
- Decor: `wildwood-north-canopy` and `wildwood-east-canopy` (both `treeCluster` tiles with collision walls) frame the combat zone architecturally.

**Empty-feeling segments:**
- `link-crossroads-wildwood` (`x: 4000, y: 4300, width: 64, height: 1100`) is a 1100 px bare vertical path strip with no decor, no NPC, and no encounter. Combined with the featureless portion of `sundrop-forest-road-north` between `y: 3200` and the first combat pocket at `y: 960`, the player traverses approximately 2300 px of road between the Crossroads-area transition and the first slime encounter — nearly two full screen heights of empty corridor.

**Collision risks:**
- `wildwood-north-canopy-collision` (`x: 5360, y: 360, width: 960, height: 160`) and `wildwood-east-canopy-collision` (`x: 6120, y: 1020, width: 160, height: 900`) form a corner. Combined with the `meadow-east-boundary` blocker, the NE corner of the map is a tight collision box cluster. Players approaching `whispering-cave` from the south road may feel suddenly constrained.

**Recommended fix:** Add a decorative element — a broken signpost, skulls, or enemy tracks ground decor — at approximately `(4000, 3800)` on `link-crossroads-wildwood` to signal "entering dangerous territory" and break the 1100 px barren stretch. This does not require a pickup or NPC, just atmospheric decor that foreshadows combat.

---

## Top 5 Weakest Segments

**1. `paths.ts` connector `link-crossroads-wildwood` — Crossroads → Wildwood mid-approach (x: 4000, y: 3200–4300)**
1100 px of featureless 64 px-wide path tile with no decor, no NPC, and no encounter. Combined with the subsequent empty stretch of `sundrop-forest-road-north`, a player walks ~2300 px before seeing the first slime-scout. This is the longest dead zone on the map. *Category: paths.ts connector, empty-feeling route.*

**2. `crossroadsRegion` — no pickup at Crossroads plaza (x: 3500, y: 4000)**
Crossroads is the most-visited node on the map: every route passes through it. Despite having two ambient NPCs (`crossroads-crier`, `crossroads-traveler`), the richest decor set, and the `crossroads-waystone` landmark, there is zero pickup in `crossroadsRegion`. This is the only region among the five destinations without a collectible. *Category: missing payoff.*

**3. `paths.ts` connector `link-crossroads-mistfen` + `link-crossroads-mistfen-h` — Mistfen approach turn (x: 3050, y: 2750–3970)**
820 px vertical + 740 px horizontal connectors with no decor, NPC, or signage at the critical turn-off junction at `(3050, 3150)`. The Mistfen route is the hardest to discover because its entrance branches off the festival-road axis with no directional cue. *Category: missing approach clue + paths.ts connector.*

**4. `paths.ts` connector `link-crossroads-coast` — Crossroads → Coast horizontal (x: 3900–4800, y: 4700)**
900 px horizontal bare path strip. Although the Coast is visually the richest destination (dense decor, pickup, NPC, jetty), the approach corridor is indistinguishable from the Wildwood road junction and has no decor to hint at the sea ahead. *Category: paths.ts connector, missing approach clue.*

**5. `wildwoodRegion` — no optional branch within the combat corridor (x: 5600, y: 960–3200)**
Once a player enters the Wildwood combat corridor (forest road north), there is no detour, no scenic side-path, and no optional secondary objective. All three slime pockets are strung along a single spine. Players who want to avoid a fight have no navigation alternative, and players who clear the map have no reward differentiation. *Category: missing optional branch.*

---

## Summary of Mandated Findings

| Finding | Location | Evidence |
|---|---|---|
| **Missing payoff** | `crossroadsRegion` | No `pickups` field; zero collectibles in the region most traversed by all five routes. |
| **Missing approach clue** | Junction at `(3050, 3150)` — Mistfen turn-off | No decor, NPC, or signage at the point where `link-crossroads-mistfen` branches west from the festival-road axis. |
| **Missing optional branch** | Coast route — `link-crossroads-coast-v` descent (`x: 4200, y: 4700–5960`) | No fork or alternative path on the 1260 px descent; the route is fully linear from Crossroads to shore. |
| **Empty-feeling route** | `paths.ts` connectors throughout | All six path connectors in `paths.ts` are bare 64 px strips: no decor, NPC, or encounter on any connector segment. Combined, they account for the majority of the map's dead-zone travel time. |
