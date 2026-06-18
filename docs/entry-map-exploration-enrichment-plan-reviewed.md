# Entry Map Exploration Enrichment Plan — Reviewed Version

> **Purpose:** This is a second-pass plan for making `meadow-entry` feel exploratory, dense, directed, and rewarding. It assumes the first entry-map enrichment work already added the six-region structure, `mapDecor`, terrain tiles, per-region modules, and content tests.

## Self-review summary

The first draft had the right direction, but it mixed three scopes together:

1. **Content pass:** Make existing regions more interesting using current primitives.
2. **Authoring-system pass:** Add metadata and tests that help agents design better maps.
3. **Engine/UI pass:** Add a new `MapDiscovery` interaction primitive and optional area-map markers.

That is too risky for one uninterrupted implementation pass. This reviewed plan splits the work into a safer sequence:

- First, audit and improve the map using existing primitives.
- Then add authoring metadata and deterministic tests.
- Only then add `MapDiscovery` if the map still needs non-item, non-NPC lore/interact points.

The first draft also proposed route-interest tests using rough straight lines. That can create false positives because players follow paths and obstacles, not straight-line geometry. This version uses authored route polylines and samples along each segment.

The first draft also under-specified collision review. The existing structural connectivity tests may ignore local obstacles like landmarks, fences, and decor collisions, while runtime movement does consider them. This version adds a lightweight manual collision audit and optional deterministic sample checks around critical routes.

Finally, this reviewed plan adds explicit stop conditions. The agent should not keep adding decorations until the map is noisy. The goal is not more content everywhere; the goal is clear curiosity, choice, payoff, and pacing.

---

## Goal

Improve `meadow-entry` from a visually enriched six-region overworld into a motivated exploration space.

The player should encounter at least one of the following every 10–20 seconds of normal movement:

- a visible curiosity hook
- a route choice
- a payoff
- a danger cue
- a lore hint
- a strong visual reveal
- a navigation cue toward the next region

## Non-goals

- Do not add new dungeons, interiors, chapters, enemies, or major systems unless explicitly scoped.
- Do not remove existing village, guild, shop, ruins, or main-quest progression.
- Do not solve emptiness by scattering random props everywhere.
- Do not make the critical route visually confusing.
- Do not require new generated art for the MVP content pass.

## Design rules

Every major region should have:

1. **Anchor:** A major landmark or visual destination.
2. **Approach:** Clues that lead the player toward the anchor before they arrive.
3. **Choice:** At least one optional branch, side nook, fork, or detour.
4. **Payoff:** Every intentional dead end must reward the player somehow.
5. **Exit hook:** The player should leave with a clue pointing to another region or mystery.
6. **Purposeful negative space:** Empty space must create safety, mood, contrast, anticipation, or framing.

Payoff types:

```ts
type ExplorationPayoffKind =
  | 'item'
  | 'lore'
  | 'vista'
  | 'npc'
  | 'combat'
  | 'future-gate'
  | 'shortcut'
  | 'navigation';
```

---

# Phase 1 — Audit before editing

## Task 1: Create a baseline exploration audit

**Create:**

- `docs/superpowers/reports/2026-06-17-entry-map-exploration-audit.md`

**Steps:**

- [ ] Review the current `meadow-entry` region modules:
  - `src/lib/game/content/maps/regions/village.ts`
  - `src/lib/game/content/maps/regions/paths.ts`
  - `src/lib/game/content/maps/regions/crossroads.ts`
  - `src/lib/game/content/maps/regions/coast.ts`
  - `src/lib/game/content/maps/regions/mistfen.ts`
  - `src/lib/game/content/maps/regions/silverpine.ts`
  - `src/lib/game/content/maps/regions/wildwood.ts`
- [ ] Build a route graph from spawn to all major regions.
- [ ] For each route, list:
  - route purpose
  - visible anchor
  - approach clues
  - optional branches
  - payoffs
  - empty-feeling segments
  - collision risks
  - confusing visual language
- [ ] Identify the top 5 weakest segments.

Use this template:

```md
## Route: Spawn → Crossroads

Purpose:

Anchor:

Approach clues:

Optional branches:

Payoffs:

Empty-feeling segments:

Collision risks:

One recommended fix:
```

**Acceptance criteria:**

- The audit names exact route segments, not vague regions.
- The audit identifies at least:
  - one missing payoff
  - one missing approach clue
  - one missing optional branch
  - one route that risks feeling empty
- No code is changed in this task.

---

# Phase 2 — Content-only MVP pass

Use existing primitives first: `groundPatches`, `mapDecor`, `landmarks`, `pickups`, `ambientNpcs`, `blockers`, `fences`, `combatBounds`, and `encounters`.

Do **not** add `MapDiscovery` yet. This phase should prove how far the map can improve without engine/UI changes.

## Task 2: Strengthen Village → Crossroads approach

**Modify:**

- `src/lib/game/content/maps/regions/village.ts`
- `src/lib/game/content/maps/regions/paths.ts`

**Design intent:** The player should feel pulled from the village toward the Crossroads by visible breadcrumbs, not by an empty connector path.

**Steps:**

- [ ] Add one visual waymarker between the village and Crossroads.
- [ ] Add one small side nook near the connector path.
- [ ] Add one payoff in or near the side nook using an existing item pickup or existing interactable primitive.
- [ ] Add one ambient NPC or existing decor composition that implies travel toward the Crossroads.
- [ ] Add visual breadcrumbs such as lanterns, flowers, broken cart-like decor, or market remnants using existing assets.
- [ ] Keep the critical path readable and uncluttered.

**Acceptance criteria:**

- Spawn → Crossroads has at least two authored interest points before the player reaches Crossroads.
- At least one interest point is optional and slightly off the most direct route.
- The direct path remains visually clear.

## Task 3: Make Crossroads the navigation heart

**Modify:**

- `src/lib/game/content/maps/regions/crossroads.ts`

**Design intent:** Crossroads should not merely be a decorated plaza. It should teach the player that this is the world hub.

**Steps:**

- [ ] Reposition or add existing decor so the waystone/signpost clearly sits at the route decision point.
- [ ] Add or adjust ambient NPC placement:
  - crier near the waystone or festival road
  - traveler near an outgoing path
- [ ] Add one optional nook behind or beside the market stall.
- [ ] Add one payoff in the optional nook.
- [ ] Strengthen the Castle Gate approach with a visible sequence:
  - festival banner or lantern clue
  - white-line/gate warning visual
  - sealed gate / future-gate blocker
- [ ] Do not block the outgoing routes to coast, silverpine, mistfen, or wildwood.

**Acceptance criteria:**

- Crossroads visibly points toward at least three regions.
- Castle Gate reads as an intentional future hook, not a random wall.
- The player can find one optional reward without leaving Crossroads.

## Task 4: Shape Tidewatch Coast into a three-node exploration space

**Modify:**

- `src/lib/game/content/maps/regions/coast.ts`

**Design intent:** Coast should form an exploration triangle:

```txt
ferry shrine
   ↘
    tidepool / side reward
   ↗
jetty / sea-route dead end
```

**Steps:**

- [ ] Ensure ferry shrine, tidepool, and jetty are spatially distinct.
- [ ] Place the pickup so it rewards checking the tidepool, rocks, or shoreline side area, not simply walking the main path.
- [ ] Make the jetty a clear scenic dead end.
- [ ] Add approach clues before the player reaches the sea: sand transition, nets, driftwood, foam, or boat.
- [ ] Keep ocean collision visually understandable.

**Acceptance criteria:**

- Coast has at least three recognizable nodes: shrine, side reward, jetty.
- Jetty dead end has a payoff or strong future-route implication.
- The coast foreshadows future story without adding a new map.

## Task 5: Shape Mistfen Marsh into a fog-maze-lite

**Modify:**

- `src/lib/game/content/maps/regions/mistfen.ts`

**Design intent:** Mistfen should remain quiet and eerie, but quiet should not mean empty.

**Steps:**

- [ ] Use reeds, dead trees, marsh rocks, and toxic blooms to form a curved approach toward Witchwood Gate.
- [ ] Add one optional side pocket off the main approach.
- [ ] Put a payoff in the side pocket using an existing pickup or visual/lore proxy.
- [ ] Place toxic blooms as breadcrumb clues, not random decoration.
- [ ] Use fog placement/alpha to make the gate approach feel different from the marsh entrance.
- [ ] Keep ambient life sparse by design.

**Acceptance criteria:**

- Mistfen has one clear main approach and one optional side pocket.
- Witchwood Gate has foreshadowing and visual buildup.
- The region feels intentionally eerie rather than under-authored.

## Task 6: Shape Silverpine into a ceremonial climb

**Modify:**

- `src/lib/game/content/maps/regions/silverpine.ts`

**Design intent:** Silverpine should feel like a shrine ascent, not a straight path with props.

**Steps:**

- [ ] Create a lantern cadence along the shrine path.
- [ ] Add one side grove or offering nook.
- [ ] Place the pickup in the side grove or offering nook, not directly on the main path.
- [ ] Reposition pilgrim NPC so they appear to be facing or approaching the shrine.
- [ ] Make the final shrine terrace feel more open than the approach.
- [ ] Keep the sealed shrine gate readable as the anchor.

**Acceptance criteria:**

- Silverpine has approach, side grove, payoff, and sealed-gate destination.
- The path feels like a climb/ascent.
- The shrine gate is visible as a goal before it blocks progress.

## Task 7: Add danger pacing to Wildwood

**Modify:**

- `src/lib/game/content/maps/regions/wildwood.ts`

**Design intent:** Wildwood already has combat. This pass should make danger legible before the player is in it.

**Steps:**

- [ ] Add a safe camp, trail sign, or woodcutter staging point before the combat pockets.
- [ ] Add one optional brush-hidden side reward.
- [ ] Increase visual density near the cave to show escalation.
- [ ] Preserve existing slime encounter IDs, combat bounds, and quest-gated ruins transition unless tests are intentionally updated.
- [ ] Keep combat pockets readable and not blocked by new decor collisions.

**Acceptance criteria:**

- Wildwood teaches danger before combat.
- At least one optional reward exists off the main route.
- Existing ruins progression remains intact.

---

# Phase 3 — Authoring metadata and quality tests

Add deterministic data-level checks that prevent future sparse maps. These should be content tests, not screenshot tests.

## Task 8: Add region design metadata

**Modify:**

- `src/lib/game/content/maps/regions/types.ts`
- all region modules
- `src/lib/game/content/maps.test.ts`

Add:

```ts
export interface RegionDesignMeta {
  id: string;
  name: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  emotion: string;
  anchorIds: string[];
  approachClueIds: string[];
  optionalBranchIds: string[];
  payoffIds: string[];
  exitHookIds: string[];
  density: 'quiet' | 'medium' | 'dense';
}
```

Then:

```ts
export interface RegionFragment {
  meta?: RegionDesignMeta;
  // existing fields unchanged
}
```

**Steps:**

- [ ] Add `meta` to every region module.
- [ ] Keep `meta` out of runtime rendering unless needed.
- [ ] Add tests that require each major region to declare:
  - at least one anchor
  - at least one payoff
  - at least one approach clue
  - at least one exit hook
- [ ] Allow `pathsRegion` to use a lighter metadata requirement because it is connector infrastructure.

**Acceptance criteria:**

- Every major region states its design intent in code.
- Tests catch regions that have scenery but no payoff or player question.

## Task 9: Add authored route-interest tests using route polylines

**Modify:**

- `src/lib/game/content/maps.test.ts`

Do not use one straight line between start and destination if the player path bends. Use authored polylines:

```ts
const explorationRoutes = [
  {
    id: 'spawn-to-crossroads',
    points: [
      { x: 1536, y: 5550 },
      { x: 2750, y: 4700 },
      { x: 3500, y: 4000 }
    ]
  },
  {
    id: 'crossroads-to-coast',
    points: [
      { x: 3500, y: 4000 },
      { x: 3900, y: 4700 },
      { x: 4200, y: 5500 },
      { x: 4600, y: 5840 }
    ]
  }
];
```

**Steps:**

- [ ] Sample every route segment at fixed intervals, such as 350px.
- [ ] For each sample, look for interest within 550–700px.
- [ ] Interest may include:
  - landmarks
  - pickups
  - encounters
  - ambient NPCs
  - interactive NPCs
  - future-gate blockers
  - important decor IDs named in metadata
  - discoveries, if added later
- [ ] Make failure messages name the route and approximate empty point.

**Acceptance criteria:**

- Long empty-feeling route segments are detected.
- Tests are robust to small coordinate tuning.
- Tests do not require screenshots or browser runtime.

## Task 10: Add dead-end payoff tests

**Modify:**

- `src/lib/game/content/maps.test.ts`

Create an authored list of intentional dead ends:

```ts
const authoredDeadEnds = [
  { id: 'coast-jetty', endpoint: { x: 4900, y: 6180 }, radius: 260 },
  { id: 'mistfen-witchwood-gate', endpoint: { x: 1200, y: 620 }, radius: 300 },
  { id: 'silverpine-shrine-gate', endpoint: { x: 3000, y: 480 }, radius: 300 },
  { id: 'castle-gate', endpoint: { x: 3500, y: 2980 }, radius: 300 }
];
```

**Steps:**

- [ ] Count nearby payoffs:
  - pickups
  - landmarks
  - future-gate blockers
  - ambient/interactive NPCs
  - discoveries, if added later
- [ ] Assert each dead end has at least one nearby payoff.
- [ ] For future-gate dead ends, require at least one story-facing element nearby, not only a blocker.

**Acceptance criteria:**

- The map cannot add a dead end that has no reason to visit.
- Future gates read as foreshadowing destinations, not just collision rectangles.

## Task 11: Add critical-route collision sanity checks

**Modify:**

- `src/lib/game/content/maps.test.ts`

**Steps:**

- [ ] For critical route polylines, sample points every 32–64px.
- [ ] Check that sample points do not sit inside blockers.
- [ ] Optionally also check against decor collision/fence/landmark bounding boxes using a conservative radius.
- [ ] Keep this test limited to the critical route, not every possible shortcut.

**Acceptance criteria:**

- The test catches accidental blocker placement on main routes.
- It does not become a brittle full navigation simulation.

---

# Phase 4 — Optional `MapDiscovery` primitive

Only do this phase if the content-only pass still lacks lore, warnings, or vista payoffs that cannot be represented well with existing primitives.

## Task 12: Add lightweight map discoveries

**Modify:**

- `src/lib/game/content/maps/types.ts`
- `src/lib/game/content/maps/text.ts`
- locale files under `src/lib/game/i18n/messages/`
- `src/lib/game/phaser/scenes/WorldScene.ts`
- HUD/event types if needed
- `src/lib/game/content/maps.test.ts`

Add:

```ts
export type MapDiscoveryKind =
  | 'sign'
  | 'lore'
  | 'vista'
  | 'secret'
  | 'warning'
  | 'foreshadow';

export interface MapDiscovery {
  id: string;
  x: number;
  y: number;
  radius?: number;
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  kind: MapDiscoveryKind;
  revealMarker?: boolean;
}
```

Add to `WorldMapDefinition`:

```ts
discoveries?: MapDiscovery[];
```

**Steps:**

- [ ] Render a small subtle marker for discoveries or reuse an existing transition/marker style.
- [ ] Let the player interact with discoveries using the existing interact key path.
- [ ] Show text using the existing dialogue/status system.
- [ ] Make discoveries repeatable unless persistence is easy and low-risk.
- [ ] Add translations in all supported locales.
- [ ] Add tests for bounds, message-key parity, and valid discovery kinds.

**Suggested discoveries:**

- Crossroads waystone: navigation hint.
- Castle white line: warning / foreshadow.
- Ferry shrine: night bell / ferry route lore.
- Coast jetty: sea route not yet available.
- Witchwood Gate: poison mist warning.
- Silverpine amulet rack: shrine/pact foreshadowing.
- Wildwood cave sign: danger warning.

**Acceptance criteria:**

- Discoveries add meaningful non-item rewards.
- They do not interfere with NPC dialogue, shops, battle, or transitions.
- The map is still playable if discovery markers are ignored.

## Task 13: Optional area-map markers for major discoveries

**Modify:**

- `src/lib/game/core/area-map.ts`
- relevant HUD tests

**Steps:**

- [ ] Add marker kind `discovery`.
- [ ] Only show discoveries where `revealMarker === true`.
- [ ] Keep markers hidden until their world position has been revealed.
- [ ] Avoid marker clutter: only major discoveries should appear.

**Acceptance criteria:**

- Major discoveries can become map pins after exploration.
- Minor secrets remain unmarked.
- Quest markers remain visually dominant.

---

# Phase 5 — Manual playtest and tuning

## Task 14: Timed playtest report

**Create:**

- `docs/superpowers/reports/2026-06-17-entry-map-playtest.md`

Run:

```bash
bun run dev
```

Walk these routes:

1. Spawn → Village plaza → Crossroads
2. Crossroads → Coast → Jetty → Tidepool
3. Crossroads → Mistfen → Witchwood Gate
4. Crossroads → Silverpine → Shrine Gate
5. Crossroads → Wildwood → Whispering Cave

For each route, record:

```md
## Route

Time to first curiosity:
Time to first choice:
Time to first payoff:
Empty-feeling segments:
Confusing collisions:
Objects that look interactive but are not:
Objects that are interactive but not visible enough:
One patch recommendation:
```

**Steps:**

- [ ] Record at least one note per route.
- [ ] Patch the three worst issues.
- [ ] Re-run focused unit tests.
- [ ] Re-run the route manually if a patch changed collisions or path readability.

**Acceptance criteria:**

- No route feels like a long plain walk.
- Every region has at least one optional thing worth checking.
- No future gate feels like an accidental invisible wall.

---

# Phase 6 — Final validation

## Task 15: Run validation

Run:

```bash
bun run test:unit -- --run
bun run check
bun run lint
bun run test:e2e
```

**Steps:**

- [ ] Fix all failures.
- [ ] Confirm new tests fail meaningfully if a payoff is removed.
- [ ] Confirm fresh-save boot still works.
- [ ] Confirm existing ruins quest progression still works.

## Task 16: Final self-review report

**Create:**

- `docs/superpowers/reports/2026-06-17-entry-map-exploration-final.md`

Use:

```md
# Entry Map Exploration Final Review

## What changed

## Strongest exploration beats

## Remaining weak segments

## Risks

## Follow-up ideas
```

**Acceptance criteria:**

- The report names at least three improved exploration beats.
- The report honestly names any remaining sparse or awkward areas.
- No code changes are hidden after the final report.

---

# Stop conditions

Stop adding content when all are true:

- Each region has an anchor, approach, choice, payoff, and exit hook.
- Every intentional dead end has a payoff.
- Major routes pass the route-interest tests.
- Manual playtest no longer reports long empty-feeling walks.
- Critical routes remain readable and navigable.
- The map feels denser without becoming visually noisy.

# Agent review checklist

Before finalizing, answer:

- [ ] Does every region have an anchor?
- [ ] Does every region have approach clues?
- [ ] Does every region have at least one optional choice?
- [ ] Does every intentional dead end have a payoff?
- [ ] Does every future gate have foreshadowing beyond collision?
- [ ] Are rewards placed off the main path often enough to teach exploration?
- [ ] Are collisions understandable from visuals?
- [ ] Do tests check exploration quality, not just coordinate validity?
- [ ] Did manual playtest confirm the map feels more alive?
- [ ] Did the agent stop before the map became cluttered?
