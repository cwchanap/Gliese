# Entry Map Hard Blockout Rework Plan

> **Purpose:** Replace the current “open field + long path strips + local props” structure with a true JRPG soft-maze blockout. This is not another enrichment pass. This is a navigation-silhouette pass.

## Core diagnosis

The entry map still does not feel hugely different because the macro skeleton has not changed enough.

The current PR added discoveries, route-scene manifests, soft-maze tests, physical boundary objects, room declarations, and playtest reports. That is useful. But it is still mostly patching the original map. The player still feels large open areas, props placed on top of terrain, and roads that read as painted paths rather than necessary corridors.

The next agent must stop optimizing for:

```txt
more objects
more tests
more manifests
more screenshots
more claims
```

The next agent must optimize for:

```txt
Can the player follow the route if path textures are invisible?
Does the camera show a shaped corridor or just open grass?
Does each road have continuous edges?
Does each region have a threshold?
Does each side reward require a real detour?
```

## Story grounding

Astelia is not a normal open world. It is a memory topology where space is arranged by narrative distance, route home, gates, ferry crossing, names, bells, torii, shrine paths, sealed thresholds, and memory geometry. The map should feel like a symbolic memory maze, not a decorative field.

---

# Non-goals

- Do not add new gameplay systems.
- Do not add new save-state fields.
- Do not add new HUD behavior.
- Do not add new discoveries.
- Do not add new pickups.
- Do not add more decorative props before the blockout is approved.
- Do not write another optimistic playtest report before the geometry changes.
- Do not consider a test passing as proof that the map feels different.
- Do not continue making small local adjustments to the existing path strips.

---

# New design rule

## The path-texture-off test

Every route must be understandable with path textures ignored.

If `pathTile`, `sandTile`, `autumnLeafTile`, `marshMudTile`, and `cobblestoneTile` were visually muted, the player should still understand where to go because of:

- fences
- hedges
- tree walls
- reed walls
- rock walls
- water
- buildings
- gates
- cliffs
- coastline
- lantern pairs
- shrine thresholds
- corridor silhouettes

If a route only works because a path texture is painted on open ground, it fails.

---

# Target map identity

The entry map should become this:

```txt
[Village Plaza]
      ↓
[Fenced Village Lane]
      ↓
[Crossroads Hub]
   ↙    ↓     ↘      ↗
Mistfen Coast Wildwood Silverpine
   ↓     ↓      ↓       ↓
Gate  Ferry   Cave   Shrine Gate
```

But visually and physically, it should feel like:

```txt
room → corridor → threshold → fork → side pocket → reveal → gate/vista
```

---

# Phase 1 — Hard blockout only

## Goal

Create a new navigational silhouette before adding any more flavor.

Only use:

- `blockers`
- `fences`
- `mapDecor` with collision
- large tree/reed/rock/water/hedge boundaries
- ground patches only to define rooms/corridors, not as proof of direction

Do not add:

- pickups
- discoveries
- new NPCs
- more decorative one-off props
- new lore
- new tests beyond temporary blockout checks

## Required outcome

The map should have **less walkable ambiguity**.

The player should no longer feel that they can wander across a giant empty meadow. Large open walkable areas should exist only where intentionally named:

- Village Plaza
- Crossroads Hub
- Coast Beach Room
- Shrine Terrace
- Wildwood Combat Rooms
- Mistfen Basin Pockets

Everything else should be corridor, threshold, side pocket, or blocked background.

---

# Phase 2 — Redraw the route skeleton

The current `paths.ts` still defines the old connector-strip skeleton. Do not merely add props around these strips. Redraw them as shaped corridors.

## 2.1 Village → Crossroads

### Current issue

The route is still mostly a horizontal connector plus one short vertical connector.

### New target

```txt
Village Plaza
  ↓
fenced lane
  ↘
rest-stop side room
  ↗
narrow lane
  ↓
Crossroads mouth
```

### Required blockout changes

- Replace the single broad connector feeling with two narrower lane segments.
- Add continuous left/right fences.
- Add a visible side-room bulge.
- Leave a deliberate opening into the side room.
- Add background field blockers so the surrounding grass reads as inaccessible field, not empty traversable terrain.

### Required IDs

Suggested:

```ts
village-lane-west-fence-a
village-lane-east-fence-a
village-lane-west-fence-b
village-lane-east-fence-b
village-field-boundary-north
village-field-boundary-south
village-reststop-room-boundary
village-crossroads-mouth
```

### Acceptance

- The player naturally follows the lane even without seeing path tiles.
- The rest stop is a true side room, not just a patch beside open grass.
- The player cannot cut a giant diagonal through empty field to bypass the authored lane.

---

## 2.2 Crossroads Hub

### Current issue

Crossroads has motif cues and some hedges/fences, but it still risks reading as an open plaza floating in grass. A few boundaries are not enough to define a strong hub-room silhouette.

### New target

Crossroads should be the only large open hub. Every exit should be a visible doorway.

```txt
             Castle Gate
                 ↑
           white-line road
                 ↑
Mistfen ← [Waystone Hub] → Wildwood
       ↖       ↓       ↗
      Silverpine     Coast
```

### Required blockout changes

- Add a stronger perimeter ring around the hub.
- Leave five deliberate exit gaps.
- Move directional cues to the mouth of each exit, not the center.
- Castle route should be a ceremonial blocked axis.
- Coast/Mistfen/Silverpine/Wildwood exits should each have distinct threshold geometry.

### Required exit mouths

```ts
crossroads-coast-mouth
crossroads-mistfen-mouth
crossroads-silverpine-mouth
crossroads-wildwood-mouth
crossroads-castle-mouth
```

### Acceptance

- Screenshot from Crossroads center shows at least four readable exits.
- Each exit has a physical mouth, not just a path patch.
- The hub is open by design; surrounding grass is not accidentally walkable everywhere.
- Castle Gate reads as visible-but-forbidden.

---

## 2.3 Crossroads → Coast

### Current issue

The latest Coast has a real fork, shrine landing, tidepool pocket, fences, and driftwood boundary objects. That is good, but the region may still feel broad because the underlying coast is still a large sand/sea strip.

### New target

```txt
Crossroads coast mouth
      ↓
bounded sandy approach
      ↓
fork room
   ↙       ↘
Ferry     Tidepool side pocket
Shrine       ↓
   ↘       Jetty vista
```

### Required blockout changes

- Make the coast approach a narrow sandy corridor before it opens.
- Make the fork room visually obvious.
- Make Ferry Shrine a room with a front approach, not an object on open sand.
- Make the Tidepool a side pocket with partial enclosure.
- Make the Jetty a narrow neck/vista, not just a prop on a beach.

### Required IDs

```ts
coast-approach-wall-west
coast-approach-wall-east
coast-fork-room-boundary-west
coast-fork-room-boundary-east
coast-shrine-room-boundary
coast-tidepool-pocket-boundary
coast-jetty-neck-left
coast-jetty-neck-right
```

### Acceptance

- From the approach, the player sees a fork before seeing all of Coast.
- The Ferry Shrine and Tidepool are separate choices.
- The Jetty is visible as a destination but reached through a constrained approach.
- The beach remains scenic, but not an unstructured open rectangle.

---

## 2.4 Crossroads → Mistfen

### Current issue

Mistfen now has reed walls, safe-curve paths, fog layers, pool blockers, and gate walls. But it may still read as a basin with objects unless the corridor shape is much stronger.

### New target

```txt
Mistfen threshold
    ↓
reed corridor
    ↘
east-pool side pocket
    ↗
deadfall bend
    ↓
fog choke
    ↓
Witchwood Gate
```

### Required blockout changes

- Turn the basin into a winding playable channel.
- Make pools function as real obstacles.
- Use reed walls as continuous route boundaries, not decorative clusters.
- Create at least two bends.
- Gate approach must narrow before opening to the Witchwood Gate room.

### Required IDs

```ts
mistfen-entry-choke-west
mistfen-entry-choke-east
mistfen-reed-corridor-wall-north
mistfen-reed-corridor-wall-south
mistfen-pool-pocket-mouth
mistfen-deadfall-bend-wall
mistfen-gate-choke-west
mistfen-gate-choke-east
```

### Acceptance

- The player cannot cross the basin in a straight line.
- The route bends at least twice.
- The side pocket is visible but not on the main route.
- The gate is approached through a narrowing fog/reed corridor.

---

## 2.5 Crossroads → Silverpine

### Current issue

Silverpine may still feel like a vertical strip with shrine props. The vertical road needs stronger stair/height art and a more evident switchback silhouette.

### New target

```txt
lower shrine threshold
    ↑
lantern gate 1
    ↖
offering grove side room
    ↗
lantern gate 2
    ↑
wide shrine terrace
    ↑
sealed shrine gate
```

### Required blockout changes

- Make the path a switchback, not a straight vertical climb.
- Add tree/rock boundaries on both sides.
- Create lantern-pair thresholds.
- Make Offering Grove a real side room.
- Make the terrace visibly wider and calmer.

### Required IDs

```ts
silverpine-lower-wall-west
silverpine-lower-wall-east
silverpine-switchback-wall-west
silverpine-switchback-wall-east
silverpine-lantern-gate-lower
silverpine-lantern-gate-upper
silverpine-offering-grove-boundary
silverpine-terrace-boundary-west
silverpine-terrace-boundary-east
```

### Acceptance

- The route reads as a ceremonial climb.
- The player follows a switchback rather than a straight strip.
- The Offering Grove is optional but obvious.
- Shrine Gate is visible before it blocks progress.

---

## 2.6 Crossroads → Wildwood

### Current issue

Wildwood has the most wall-like work, but long north-south forest travel still needs more authored bends and stronger encounter staging.

### New target

```txt
forest threshold
    ↓
woodcutter warning room
    ↘
side clearing reward
    ↗
combat room 1
    ↓
narrow canopy bend
    ↓
combat room 2
    ↓
cave neck
    ↓
Whispering Cave
```

### Required blockout changes

- Add at least two bends in the Wildwood route.
- Break the long north-south climb.
- Make combat pockets actual rooms with entrances/exits.
- Side clearing must be behind tree/brush cover, not simply beside the road.
- Cave approach should narrow dramatically.

### Required IDs

```ts
wildwood-threshold-gate-left
wildwood-threshold-gate-right
wildwood-lower-bend-wall
wildwood-side-clearing-mouth
wildwood-side-clearing-boundary
wildwood-combat-room-1-entrance
wildwood-combat-room-1-exit
wildwood-canopy-bend-left
wildwood-canopy-bend-right
wildwood-cave-neck-left
wildwood-cave-neck-right
```

### Acceptance

- The player sees danger before combat.
- The forest route is not a straight road with props.
- At least one side clearing is spatially off-route.
- The cave approach feels more constrained and ominous than the lower forest.

---

# Phase 3 — Remove or shrink large accidental open areas

## Goal

Large open walkable grass should be intentional, not leftover.

## Task

Create a list of named open rooms:

```ts
const allowedOpenRooms = [
  'village-plaza-room',
  'crossroads-hub-room',
  'coast-beach-room',
  'silverpine-terrace-room',
  'wildwood-combat-room',
  'mistfen-basin-pocket'
];
```

Any large walkable area not in this list should be broken up with:

- hedges
- fences
- trees
- water
- cliffs
- rocks
- walls
- ruins
- reed barriers

## Acceptance

- Walking between regions feels like moving through corridors and rooms.
- Empty grass reads as background, not playable invitation.
- The player is rarely unsure whether they should cut across a field.

---

# Phase 4 — Blockout review before decoration

The agent must stop after blockout and provide proof before adding props.

## Required review artifacts

Create:

`docs/superpowers/reports/2026-06-21-entry-map-hard-blockout-review.md`

For each route:

```md
## Route: Crossroads → Wildwood

Path texture off screenshot:
Normal screenshot:
Route diagram:
Can the route be followed without path texture?
Where are the left/right boundaries?
Where is the first threshold?
Where is the first side room?
Where is the first reveal?
Remaining open-field leak:
Patch needed:
```

## Screenshot requirement

Screenshots must be reviewable in the PR.

Do not put them in a gitignored folder. Local-only screenshot reports do not prove the change to reviewers.

## Acceptance

- At least one screenshot per route with path textures visually minimized, hidden, or ignored.
- At least one top-down route diagram.
- The reviewer can tell the route changed without reading code.
- Human review approves blockout before decoration resumes.

---

# Phase 5 — Only after blockout approval: prop-role pass

Do not place decorative props until the blockout works.

Every prop must have one role:

```ts
type DecorDesignRole =
  | 'wall'
  | 'threshold'
  | 'breadcrumb'
  | 'frame-landmark'
  | 'hide-reward'
  | 'block-shortcut'
  | 'signal-biome'
  | 'story-symbol'
  | 'vista';
```

## Rules

- `wall`: must have collision or an adjacent blocker.
- `threshold`: must sit at an entrance/exit.
- `breadcrumb`: must be visible from the previous beat.
- `frame-landmark`: must improve the view of an anchor.
- `hide-reward`: must have a payoff nearby and off-route.
- `block-shortcut`: must close an obvious cut-across path.
- `signal-biome`: must be near a region transition.
- `story-symbol`: must reference route home, gate, ferry, bell, torii, shrine, white line, forest danger, or memory topology.
- `vista`: must frame a destination or future route.

## Acceptance

- Any prop without a role is deleted.
- Repeated props are reduced unless they form a readable wall or rhythm.
- Decoration no longer looks random because every object supports movement, framing, or story.

---

# Phase 6 — Reward pass

Only after the blockout and prop-role passes:

- Move pickups into side rooms.
- Remove pickups from main road centerlines.
- Use rewards to teach detours.
- Keep gate/vista discoveries as narrative payoffs.
- Do not overuse consumables as the only reward type.

## Rules

- Side reward must be at least 160px from the main route polyline.
- Reward must be framed by decor or room boundary.
- Reward must not be invisible or unfair.
- Each route should have only one clear optional reward unless the route is intentionally dense.

## Acceptance

- The player understands why they found the reward.
- Rewards feel discovered, not sprinkled.

---

# Phase 7 — Update tests to enforce blockout, not props

Keep existing soft-maze tests, but add stronger “path texture off” invariants.

## Test 1: Route still works without ground-patch interest

Create a version of route-interest logic that ignores ground patches entirely.

```ts
function interestPointsWithoutGroundPatches(map: WorldMapDefinition): Pt[] {
  // landmarks, blockers, fences, colliding decor, NPCs, gates, discoveries
  // but no groundPatches
}
```

Acceptance:

- [ ] Every route still has threshold/hook/reveal/payoff beats without counting ground patches.

## Test 2: Corridor boundary continuity

For each corridor sample:

- left boundary within N px
- right boundary within N px
- except inside named open rooms

Current tests do some of this through expected boundary IDs. Strengthen them by checking continuity over the entire route, not just declared samples.

## Test 3: Open-field leak detector

Sample route-adjacent areas. Fail if a player can walk too far off the corridor without hitting a boundary.

Pseudo-rule:

```ts
for each route sample:
  probe perpendicular left/right every 64px up to 640px
  expect a solid boundary before open-field budget is exceeded
```

## Test 4: Shortcut closure

For each pair of major rooms, define forbidden straight-line shortcuts. Assert they are blocked by at least one boundary.

Examples:

- Village → Coast direct diagonal
- Crossroads → Witchwood Gate direct cut
- Crossroads → Whispering Cave direct cut
- Silverpine → Mistfen direct cut

## Test 5: Side-room detour test

A side room must have:

- one entrance mouth
- one payoff
- boundary on at least two sides
- payoff off main route
- visible cue from main route

---

# Phase 8 — Final acceptance gate

The pass is not complete until a human reviewer says the screenshots look meaningfully different.

## Merge bar

- [ ] The map route silhouette changed.
- [ ] Each route can be followed without path textures.
- [ ] Large open grass is reduced or clearly backgrounded.
- [ ] Road edges are continuous enough to guide movement.
- [ ] Crossroads is the only large open hub.
- [ ] Coast has a true fork and bounded shrine/tidepool/jetty rooms.
- [ ] Mistfen is a winding reed/pool maze-lite.
- [ ] Silverpine is a switchback ceremonial climb.
- [ ] Wildwood has bends, forest threshold, combat rooms, and a cave neck.
- [ ] Props are role-based, not decorative scatter.
- [ ] Rewards are in side rooms.
- [ ] Reviewable screenshots are committed or linked.
- [ ] Full validation passes:

```bash
bun run test:unit -- --run
bun run check
bun run lint
bun run test:e2e
```

---

# Final instruction to the agent

Do not make another bigger diff.

Make the map feel different.

First change the navigational silhouette.  
Then prove it with screenshots.  
Only then decorate.

The strongest practical test is:

> Can the player follow the route with path textures off?

If the answer is no, the map is still an open field with decoration.
