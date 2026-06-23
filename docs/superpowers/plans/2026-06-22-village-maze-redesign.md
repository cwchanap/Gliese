# Village Maze Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sprawling, identity-less entry village with a compact, maze-like hamlet — interconnected hedge lanes, hidden dead-ends, and a winding exit corridor — giving the player a 2-3 minute exploration experience instead of a 30-second open-field walk.

**Architecture:** Test-first. Five village maze goal tests enforce lane width, cross-zone occlusion, dead-end count, ring connectivity, and building accessibility. Three exit corridor tests (reusing silverpine helpers) enforce the winding path. Building repositioning happens first, then hedge walls iterate against deterministic tests, then decor/NPCs layer on top.

**Tech Stack:** TypeScript, Vitest, existing `RegionFragment` / `SoftMazeRoom` / `RouteSceneDefinition` types. No new dependencies.

## Global Constraints

- **Coordinate space:** 6400×6400px map, x/y are CENTER-based (entity spans x±width/2, y±height/2).
- **MapBlockerKind** enum: `'city-wall' | 'town-hedge' | 'ruin-wall' | 'future-gate' | 'ocean'`. Village maze uses `'town-hedge'` for all walls.
- **Map space origin:** top-left `(0,0)`; +x east, +y south.
- **Village lane spec:** ≤256px total width (128px per side), except inside declared rooms.
- **Village occlusion spec:** at every junction, perpendicular ray hits a hedge nose within 64px.
- **Corridor spec:** ≤320px total width (160px per side), sight-line <384px, bends ≥30° per >256px segment.
- **Dead-end spec:** ≥9 total (3 major building spurs + ≥6 minor texture spurs).
- **Available decor frames:** `castleGate`, `waystone`, `hangingLantern`, `poleLantern`, `festivalBanner`, `marketStall`, `flowerBed` (crossroadsDressing); `stoneLantern`, `offeringStand`, `amuletRack`, `silverpine`, `autumnMaple` (shrineDressing).
- **Available NPC frames:** `travelerNpc`, `woodcutterNpc`, `crierNpc`, `fisherNpc`, `pilgrimNpc`, `miraItemShopNpc`, `quartermasterNpc`, `guildMasterNpc`.
- **Test command:** `bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts`
- **Full validation:** `bun run test:unit -- --run && bun run check && bun run lint && bun run test:e2e`
- **No commits unless green.** No commits unless the user explicitly asks.
- **Spec:** `docs/superpowers/specs/2026-06-22-village-maze-redesign-design.md`

---

### Task 1: Fix `bendViolations` i=0 edge case + add village maze test helpers

Fixes a latent bug in the silverpine pilot's `bendViolations` (segment 0 is always flagged because it has no preceding segment) and adds the testing infrastructure the village maze goal tests need.

**Files:**
- Modify: `src/lib/game/content/maps/regions/soft-maze.test.ts`

**Interfaces:**
- Produces (module-private helpers in `soft-maze.test.ts`):
  - `sampleLaneSet(segments: Array<{from: Pt, to: Pt}>): Array<{point: Pt, direction: Pt}>` — samples points every 48px along multiple axis-aligned segments
  - `laneWidthViolations(segments, roomBounds, {maxHalfWidth})` — returns samples where perpendicular ray exceeds maxHalfWidth, excluding samples inside rooms
  - `junctionOcclusionViolations(junctions, approachDirs, {maxDistance})` — returns junction approaches where perpendicular ray exceeds maxDistance without hitting solid
  - `countDeadEnds(solids, laneSamples, {minDepth})` — flood-fill counts dead-end pockets reachable from lane samples

- [ ] **Step 1: Fix `bendViolations`**

In `soft-maze.test.ts`, change the loop start from `i = 0` to `i = 1` so the first segment is never flagged:

```ts
function bendViolations(
	route: { mainRoute: Pt[] },
	{ minTurnDegrees, minSegmentPx }: { minTurnDegrees: number; minSegmentPx: number }
): Array<{ from: Pt; to: Pt; length: number }> {
	const violations: Array<{ from: Pt; to: Pt; length: number }> = [];
	const pts = route.mainRoute;
	for (let i = 1; i < pts.length - 1; i++) {
		const a = pts[i];
		const b = pts[i + 1];
		const length = Math.hypot(b.x - a.x, b.y - a.y);
		if (length <= minSegmentPx) continue;
		const dirA = Math.atan2(b.y - a.y, b.x - a.x);
		const prev = pts[i - 1];
		const dirPrev = Math.atan2(a.y - prev.y, a.x - prev.x);
		let turn = Math.abs(dirA - dirPrev) * (180 / Math.PI);
		if (turn > 180) turn = 360 - turn;
		if (turn < minTurnDegrees) violations.push({ from: a, to: b, length });
	}
	return violations;
}
```

- [ ] **Step 2: Add the village lane-set helpers**

Add these helpers after the existing `bendViolations` function (around line 173):

```ts
type LaneSegment = { from: Pt; to: Pt };

function sampleLaneSet(segments: LaneSegment[]): Array<{ point: Pt; direction: Pt }> {
	const samples: Array<{ point: Pt; direction: Pt }> = [];
	const step = 48;
	for (const seg of segments) {
		const dx = seg.to.x - seg.from.x;
		const dy = seg.to.y - seg.from.y;
		const len = Math.hypot(dx, dy);
		if (len === 0) continue;
		const dir = { x: dx / len, y: dy / len };
		for (let d = step; d < len; d += step) {
			samples.push({
				point: { x: seg.from.x + dir.x * d, y: seg.from.y + dir.y * d },
				direction: dir
			});
		}
	}
	return samples;
}

function laneWidthViolations(
	segments: LaneSegment[],
	roomBounds: Rect[],
	{ maxHalfWidth }: { maxHalfWidth: number }
): Array<{ sample: Pt; side: 'LEFT' | 'RIGHT' }> {
	const solids = [...collectSolidRects(meadowEntryMap).values()];
	const violations: Array<{ sample: Pt; side: 'LEFT' | 'RIGHT' }> = [];
	for (const { point, direction } of sampleLaneSet(segments)) {
		if (roomBounds.some((room) => pointInRect(point, room))) continue;
		const normal = { x: -direction.y, y: direction.x };
		const left = rayHitsSolid(point, { x: -normal.x, y: -normal.y }, solids, maxHalfWidth + 32);
		const right = rayHitsSolid(point, { x: normal.x, y: normal.y }, solids, maxHalfWidth + 32);
		if (!left.hit) violations.push({ sample: point, side: 'LEFT' });
		if (!right.hit) violations.push({ sample: point, side: 'RIGHT' });
	}
	return violations;
}

function junctionOcclusionViolations(
	junctions: Array<{ point: Pt; approaches: Pt[] }>,
	{ maxDistance }: { maxDistance: number }
): Array<{ junction: Pt; direction: Pt }> {
	const solids = [...collectSolidRects(meadowEntryMap).values()];
	const violations: Array<{ junction: Pt; direction: Pt }> = [];
	for (const { point, approaches } of junctions) {
		for (const approach of approaches) {
			const { hit } = rayHitsSolid(point, approach, solids, maxDistance);
			if (!hit) violations.push({ junction: point, direction: approach });
		}
	}
	return violations;
}

function countDeadEnds(
	laneSamples: Array<{ point: Pt }>,
	{ minDepth }: { minDepth: number }
): number {
	const solids = [...collectSolidRects(meadowEntryMap).values()];
	const deadEnds = new Set<string>();
	const step = 32;
	for (const { point: start } of laneSamples) {
		const visited = new Set<string>();
		const queue = [start];
		let maxReach = 0;
		for (let guard = 0; queue.length > 0 && guard < 200; guard++) {
			const p = queue.shift()!;
			const key = `${Math.round(p.x / step) * step},${Math.round(p.y / step) * step}`;
			if (visited.has(key)) continue;
			visited.add(key);
			if (solids.some((r) => pointInRect(p, r))) continue;
			const dist = Math.hypot(p.x - start.x, p.y - start.y);
			if (dist > maxReach) maxReach = dist;
			if (maxReach > minDepth + 320) break;
			queue.push(
				{ x: p.x + step, y: p.y },
				{ x: p.x - step, y: p.y },
				{ x: p.x, y: p.y + step },
				{ x: p.x, y: p.y - step }
			);
		}
		if (maxReach >= minDepth && maxReach <= minDepth + 320) {
			deadEnds.add(`${Math.round(start.x / 64) * 64},${Math.round(start.y / 64) * 64}`);
		}
	}
	return deadEnds.size;
}
```

- [ ] **Step 3: Run tests to verify suite still green**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts`
Expected: PASS — the helpers are defined but not yet called. The `bendViolations` fix doesn't break the silverpine test (silverpine's segment 0 is 250px, under the 256px threshold).

- [ ] **Step 4: Run typecheck + lint**

Run: `bun run check && bun run lint`
Expected: 0 errors, lint clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/content/maps/regions/soft-maze.test.ts
git commit -m "test: fix bendViolations i=0 + add village lane-set helpers"
```

---

### Task 2: Reposition village buildings into compact cluster

Moves all 8 landmarks from their current spread positions into a ~1200×1000px cluster. Tears down old field boundaries and fences that no longer make sense. The village is temporarily "open" (no maze walls) — Task 3 adds the hedge network.

**Files:**
- Modify: `src/lib/game/content/maps/regions/village.ts` (landmarks, transitions, groundPatches, blockers, fences, decor, ambientNpcs, pickups)
- Modify: `src/lib/game/content/maps/regions/rooms.ts` (village room bounds)
- Modify: `src/lib/game/content/maps.test.ts` (spawn point, critical route fixtures)
- Modify: `src/lib/game/content/maps/regions/route-scenes.ts` (spawn-to-crossroads mainRoute + beats — provisional straight line for now; Task 4 reshapes it)

**Interfaces:**
- Consumes: existing `RegionFragment` shape
- Produces: compact village cluster with buildings in position, old boundaries removed

- [ ] **Step 1: Reposition landmarks**

In `village.ts`, replace the `landmarks` array with these new positions. All coordinates are CENTER-based:

```ts
	landmarks: [
		{
			id: 'hero-house-exterior',
			x: 700,
			y: 5_450,
			width: 294,
			height: 307,
			labelKey: 'content.maps.landmarks.hero-house-exterior.label'
		},
		{
			id: 'guild-hall-exterior',
			x: 1_400,
			y: 4_900,
			width: 384,
			height: 346,
			labelKey: 'content.maps.landmarks.guild-hall-exterior.label'
		},
		{
			id: 'item-shop-exterior',
			x: 600,
			y: 4_800,
			width: 307,
			height: 294,
			labelKey: 'content.maps.landmarks.item-shop-exterior.label'
		},
		{
			id: 'villager-house-1-exterior',
			x: 900,
			y: 4_750,
			width: 282,
			height: 256,
			labelKey: 'content.maps.landmarks.villager-house-1-exterior.label'
		},
		{
			id: 'villager-house-2-exterior',
			x: 1_200,
			y: 4_700,
			width: 422,
			height: 326,
			labelKey: 'content.maps.landmarks.villager-house-2-exterior.label'
		},
		{
			id: 'villager-house-3-exterior',
			x: 1_450,
			y: 5_250,
			width: 230,
			height: 416,
			labelKey: 'content.maps.landmarks.villager-house-3-exterior.label'
		},
		{
			id: 'sundrop-well',
			x: 1_000,
			y: 5_100,
			width: 141,
			height: 160,
			labelKey: 'content.maps.landmarks.sundrop-well.label'
		},
		{
			id: 'blacksmith',
			x: 500,
			y: 5_200,
			width: 294,
			height: 282,
			labelKey: 'content.maps.landmarks.blacksmith.label'
		},
		{
			id: 'shrine-of-aurora',
			x: 1_000,
			y: 5_400,
			width: 307,
			height: 416,
			labelKey: 'content.maps.landmarks.shrine-of-aurora.label'
		}
	],
```

- [ ] **Step 2: Reposition transitions to match new building positions**

Each transition's `(x, y)` should sit at the bottom-center of its building's exterior (the doorway). Replace the `transitions` array:

```ts
	transitions: [
		{
			id: 'meadow-to-hero-house',
			x: 700,
			y: 5_600,
			toMapId: 'hero-house',
			showMarker: false,
			arrival: { x: 256, y: 224, facing: 'up' }
		},
		{
			id: 'meadow-to-guild-hall',
			x: 1_400,
			y: 5_070,
			toMapId: 'guild-hall',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-item-shop',
			x: 600,
			y: 4_945,
			toMapId: 'item-shop',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-1',
			x: 900,
			y: 4_880,
			toMapId: 'villager-house-1',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-2',
			x: 1_200,
			y: 4_870,
			toMapId: 'villager-house-2',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-3',
			x: 1_450,
			y: 5_460,
			toMapId: 'villager-house-3',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-shrine-of-aurora',
			x: 1_000,
			y: 5_610,
			toMapId: 'shrine-of-aurora-interior',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		}
	],
```

- [ ] **Step 3: Replace groundPatches with compact cluster paths**

Delete all existing `groundPatches` entries (lines 217-317). Replace with:

```ts
	groundPatches: [
		{
			id: 'sundrop-plaza-stone',
			x: 1_000,
			y: 5_100,
			width: 400,
			height: 400,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'village-spawn-pocket',
			x: 700,
			y: 5_550,
			width: 300,
			height: 100,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-southwest-ocean-patch',
			x: 114,
			y: 6_311,
			width: 100,
			height: 50,
			tile: 'seaTile'
		}
	],
```

(Lane path tiles are added in Task 5 when exact lane positions are finalized.)

- [ ] **Step 4: Delete old village-specific blockers**

Delete these blocker entries from the `blockers` array (keep the 4 map-edge boundaries and the ocean):

- `village-field-boundary-south`
- `village-connector-east-bank`
- `village-field-boundary-north`

Keep: `meadow-north-boundary`, `meadow-south-boundary`, `meadow-west-boundary`, `meadow-east-boundary`, `sundrop-southwest-ocean`.

- [ ] **Step 5: Delete old village fences**

Replace the entire `fences` array with an empty array for now (Task 3 adds hedge walls; Task 5 adds decorative fences if needed):

```ts
	fences: []
```

- [ ] **Step 6: Reposition existing decor and NPCs**

Update existing decor positions to match the new cluster. Replace `mapDecor`, `ambientNpcs`, and `pickups`:

```ts
	mapDecor: [
		{
			id: 'village-hanging-lantern',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'hangingLantern',
			x: 1_000,
			y: 4_950,
			width: 110,
			height: 130,
			mode: 'image',
			depth: 'foreground'
		}
	],
	ambientNpcs: [{ id: 'village-wanderer', x: 1_000, y: 5_150, frameName: 'travelerNpc' }],
	pickups: [],
```

(The `village-roadside-cache` pickup moves to the exit corridor in Task 4.)

- [ ] **Step 7: Update room bounds in `rooms.ts`**

Replace `village-plaza-room` bounds and `village-road-reststop-room` bounds:

```ts
	{
		id: 'village-plaza-room',
		kind: 'safe',
		bounds: { id: 'village-plaza-room', x: 1_000, y: 5_100, width: 400, height: 400 },
		routeIds: ['spawn-to-crossroads'],
		beatId: 'village-homeward-hook',
		requiredVisibleIds: ['sundrop-well', 'guild-hall-exterior', 'village-wanderer'],
		storyMotif: 'homeward-road'
	},
```

Delete the `village-road-reststop-room` entry (it moves to the exit corridor in Task 4; add it back there).

- [ ] **Step 8: Update spawn-to-crossroads mainRoute (provisional)**

In `route-scenes.ts`, replace the `spawn-to-crossroads` mainRoute with a provisional straight path through the new cluster. The exact dogleg shaping happens in Task 4:

```ts
		mainRoute: [
			{ x: 700, y: 5_600 },
			{ x: 1_000, y: 5_100 },
			{ x: 1_600, y: 4_600 },
			{ x: 3_500, y: 4_000 }
		],
```

Update the beats' `cameraPoint` values to match:

```ts
			{
				id: 'village-homeward-hook',
				routeId: 'spawn-to-crossroads',
				cameraPoint: { x: 700, y: 5_500 },
				purpose: 'hook',
				expectedVisibleIds: ['hero-house-exterior', 'village-wanderer'],
				boundaryIds: [],
				storyMotif: 'homeward-road'
			},
```

Keep all 4 village beats but update their `cameraPoint` values to match the provisional route. The beats get their final corridor positions in Task 4. Update each beat's `cameraPoint`:

```ts
			{ id: 'village-homeward-hook', ... cameraPoint: { x: 700, y: 5_500 }, ... },
			{ id: 'village-fenced-lane-threshold', ... cameraPoint: { x: 1_500, y: 4_600 }, ... },
			{ id: 'village-roadside-nook', ... cameraPoint: { x: 2_200, y: 4_100 }, ... },
			{ id: 'village-roadside-cache-payoff', ... cameraPoint: { x: 2_900, y: 4_250 }, ... },
```

Update `expectedVisibleIds` and `boundaryIds` to empty arrays where the referenced decor/fences no longer exist. The soft-maze contract test requires a threshold beat — keeping all 4 beats avoids breaking it.

- [ ] **Step 9: Update spawn point and critical routes in `maps.test.ts`**

Update the spawn point:

```ts
		expect(meadowEntryMap.spawn).toEqual({ x: 700, y: 5_600 });
```

Update the spawn→crossroads critical route:

```ts
	describe('route: spawn → crossroads', () => {
		it('has no empty stretch longer than the gap tolerance', () => {
			expectRouteHasNoEmptyStretch('spawn → crossroads', [
				{ x: 700, y: 5_600 },
				{ x: 1_000, y: 5_100 },
				{ x: 1_600, y: 4_600 },
				{ x: 3_500, y: 4_000 }
			]);
		});
	});
```

- [ ] **Step 10: Run full validation**

Run: `bun run test:unit -- --run && bun run check && bun run lint`
Expected: all green. The connectivity safety net should pass since all transitions are in open grass (no maze walls yet). If it fails, a transition is inside a building's collision rect — adjust the transition y-value to be just below the building.

- [ ] **Step 11: Commit**

```bash
git add src/lib/game/content/maps/regions/village.ts \
        src/lib/game/content/maps/regions/rooms.ts \
        src/lib/game/content/maps/regions/route-scenes.ts \
        src/lib/game/content/maps.test.ts
git commit -m "refactor: reposition village buildings into compact cluster"
```

---

### Task 3: Village maze goal tests + hedge network (RED → GREEN)

The core task. Writes 4 village goal tests (red), builds the entire hedge maze network, iterates until green. Same pattern as silverpine Task 3 but with a lane-set sampler instead of a single-route polyline.

**Files:**
- Modify: `src/lib/game/content/maps/regions/village.ts` (add ~30 hedge wall blockers)
- Test: `src/lib/game/content/maps/regions/soft-maze.test.ts`

**Interfaces:**
- Consumes: `laneWidthViolations`, `junctionOcclusionViolations`, `countDeadEnds` from Task 1; repositioned buildings from Task 2
- Produces: a fully enclosed village maze with ring road, cross-lanes, junction noses, and dead-ends

- [ ] **Step 1: Define the village lane set and write the 4 failing goal tests**

Add a new describe block at the end of `soft-maze.test.ts`:

```ts
describe('village maze — compact hamlet invariants', () => {
	const roomBounds = softMazeRooms
		.filter((r) => r.id === 'village-plaza-room')
		.map((r) => r.bounds);

	const villageLanes: Array<{ from: Pt; to: Pt }> = [
		// Ring road (clockwise from SW)
		{ from: { x: 700, y: 5_400 }, to: { x: 700, y: 4_900 } },
		{ from: { x: 700, y: 4_900 }, to: { x: 750, y: 4_700 } },
		{ from: { x: 750, y: 4_700 }, to: { x: 1_200, y: 4_700 } },
		{ from: { x: 1_200, y: 4_700 }, to: { x: 1_350, y: 4_800 } },
		{ from: { x: 1_350, y: 4_800 }, to: { x: 1_400, y: 4_950 } },
		{ from: { x: 1_400, y: 4_950 }, to: { x: 1_450, y: 5_200 } },
		{ from: { x: 1_450, y: 5_200 }, to: { x: 1_300, y: 5_350 } },
		{ from: { x: 1_300, y: 5_350 }, to: { x: 800, y: 5_400 } },
		// Cross-lane: plaza → west (toward Block A)
		{ from: { x: 1_000, y: 5_100 }, to: { x: 800, y: 4_950 } },
		{ from: { x: 800, y: 4_950 }, to: { x: 750, y: 4_800 } },
		// Cross-lane: plaza → NE (toward Block C / exit)
		{ from: { x: 1_000, y: 5_100 }, to: { x: 1_200, y: 4_950 } },
		{ from: { x: 1_200, y: 4_950 }, to: { x: 1_350, y: 4_850 } },
		// Major dead-end spurs
		{ from: { x: 500, y: 5_200 }, to: { x: 450, y: 5_350 } },
		{ from: { x: 600, y: 4_800 }, to: { x: 450, y: 4_750 } },
		{ from: { x: 1_200, y: 4_700 }, to: { x: 1_200, y: 4_550 } },
		// Minor dead-end spurs (texture)
		{ from: { x: 850, y: 5_100 }, to: { x: 750, y: 5_150 } },
		{ from: { x: 1_150, y: 5_100 }, to: { x: 1_250, y: 5_050 } },
		{ from: { x: 1_000, y: 5_250 }, to: { x: 950, y: 5_350 } },
		{ from: { x: 1_300, y: 5_100 }, to: { x: 1_350, y: 5_000 } },
		{ from: { x: 1_400, y: 5_100 }, to: { x: 1_500, y: 5_150 } }
	];

	const junctions: Array<{ point: Pt; approaches: Pt[] }> = [
		{
			point: { x: 800, y: 5_400 },
			approaches: [
				{ x: 0, y: -1 },
				{ x: 1, y: 0 }
			]
		},
		{
			point: { x: 750, y: 4_750 },
			approaches: [
				{ x: 0, y: 1 },
				{ x: 1, y: 0 }
			]
		},
		{
			point: { x: 1_000, y: 5_100 },
			approaches: [
				{ x: 0, y: -1 },
				{ x: 0, y: 1 },
				{ x: -1, y: 0 },
				{ x: 1, y: 0 }
			]
		},
		{
			point: { x: 1_350, y: 4_850 },
			approaches: [
				{ x: -1, y: 0 },
				{ x: 0, y: 1 }
			]
		}
	];

	it('keeps village lane width ≤ 256px outside rooms', () => {
		const violations = laneWidthViolations(villageLanes, roomBounds, { maxHalfWidth: 128 });
		expect(violations, JSON.stringify(violations.slice(0, 3))).toEqual([]);
	});

	it('occludes cross-zone sight at every junction', () => {
		const violations = junctionOcclusionViolations(junctions, { maxDistance: 64 });
		expect(violations, JSON.stringify(violations.slice(0, 3))).toEqual([]);
	});

	it('has ≥9 dead-ends in the village maze', () => {
		const laneSamples = sampleLaneSet(villageLanes);
		const count = countDeadEnds(laneSamples, { minDepth: 96 });
		expect(count, `found ${count} dead-ends, need ≥9`).toBeGreaterThanOrEqual(9);
	});

	it('every building transition is reachable from the plaza', () => {
		const solids = [...collectSolidRects(meadowEntryMap).values()];
		const transitions = meadowEntryMap.transitions ?? [];
		for (const t of transitions) {
			const visited = new Set<string>();
			const queue = [{ x: 1_000, y: 5_100 }];
			let found = false;
			for (let guard = 0; queue.length > 0 && guard < 10_000; guard++) {
				const p = queue.shift()!;
				const key = `${Math.round(p.x / 32) * 32},${Math.round(p.y / 32) * 32}`;
				if (visited.has(key)) continue;
				visited.add(key);
				if (solids.some((r) => pointInRect(p, r))) continue;
				if (Math.hypot(p.x - t.x, p.y - t.y) < 64) {
					found = true;
					break;
				}
				queue.push(
					{ x: p.x + 32, y: p.y },
					{ x: p.x - 32, y: p.y },
					{ x: p.x, y: p.y + 32 },
					{ x: p.x, y: p.y - 32 }
				);
			}
			expect(found, `${t.id} unreachable from plaza`).toBe(true);
		}
	});
});
```

- [ ] **Step 2: Run tests to verify all 4 fail**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts`
Expected: FAIL — width test reports violations (no hedge walls yet); occlusion test reports violations (no noses); dead-end test reports 0; accessibility test may pass (no walls blocking).

- [ ] **Step 3: Add village perimeter wall**

In `village.ts`, add a continuous `town-hedge` perimeter around the cluster. The perimeter follows the approximate bounds x∈[350, 1650], y∈[4550, 5700], with a gap at the NE exit gate (~x1500, y4600). Add these blockers to the `blockers` array:

```ts
		// Village perimeter — continuous town-hedge enclosing the cluster.
		// Gap at NE for the exit gate (added in Task 4).
		{
			id: 'village-perimeter-north',
			x: 950,
			y: 4_550,
			width: 1_200,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'village-perimeter-west',
			x: 350,
			y: 5_100,
			width: 64,
			height: 1_100,
			kind: 'town-hedge'
		},
		{
			id: 'village-perimeter-south',
			x: 950,
			y: 5_700,
			width: 1_200,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'village-perimeter-east',
			x: 1_650,
			y: 5_100,
			width: 64,
			height: 1_100,
			kind: 'town-hedge'
		},
		{
			id: 'village-perimeter-ne-upper',
			x: 1_650,
			y: 4_700,
			width: 64,
			height: 250,
			kind: 'town-hedge'
		},
		{
			id: 'village-perimeter-ne-lower',
			x: 1_300,
			y: 4_550,
			width: 600,
			height: 64,
			kind: 'town-hedge'
		},
```

(The NE corner has a ~150px gap for the exit gate between the upper and lower segments. Adjust the gap width during Task 3 iteration — the lane width test will report if the gap is too wide.)

- [ ] **Step 4: Add ring-road hedge walls (paired, ±128px from lane centerlines)**

Add paired hedge walls flanking each ring-road lane segment. Each wall is a `town-hedge` placed 128px perpendicular to the lane direction. Start with these estimates and iterate:

```ts
		// Ring road walls — west lane (hero-house → Block A, vertical at x≈700)
		{ id: 'village-ring-west-a', x: 572, y: 5_150, width: 64, height: 500, kind: 'town-hedge' },
		{ id: 'village-ring-west-b', x: 828, y: 5_150, width: 64, height: 500, kind: 'town-hedge' },
		// Ring road walls — north lane (Block A → Block B → Block C, horizontal at y≈4700)
		{ id: 'village-ring-north-a', x: 950, y: 4_572, width: 700, height: 64, kind: 'town-hedge' },
		{ id: 'village-ring-north-b', x: 950, y: 4_828, width: 700, height: 64, kind: 'town-hedge' },
		// Ring road walls — east lane (Block C → Block E, vertical at x≈1400)
		{ id: 'village-ring-east-a', x: 1_272, y: 5_000, width: 64, height: 350, kind: 'town-hedge' },
		{ id: 'village-ring-east-b', x: 1_528, y: 5_000, width: 64, height: 350, kind: 'town-hedge' },
		// Ring road walls — south lane (Block E → Block D, horizontal at y≈5350)
		{ id: 'village-ring-south-a', x: 950, y: 5_222, width: 600, height: 64, kind: 'town-hedge' },
		{ id: 'village-ring-south-b', x: 950, y: 5_478, width: 600, height: 64, kind: 'town-hedge' },
```

- [ ] **Step 5: Add cross-lane walls and plaza junction noses**

Add walls for the 2 cross-lanes and hedge noses at the 4-way plaza junction:

```ts
		// Cross-lane: plaza → west — walls flanking the diagonal
		{ id: 'village-cross-west-a', x: 872, y: 5_000, width: 64, height: 200, kind: 'town-hedge' },
		{ id: 'village-cross-west-b', x: 928, y: 5_200, width: 64, height: 200, kind: 'town-hedge' },
		// Cross-lane: plaza → NE — walls flanking the diagonal
		{ id: 'village-cross-ne-a', x: 1_072, y: 4_900, width: 64, height: 200, kind: 'town-hedge' },
		{ id: 'village-cross-ne-b', x: 1_128, y: 5_100, width: 64, height: 200, kind: 'town-hedge' },
		// Plaza junction noses — block cross-zone sight at the 4-way intersection
		{ id: 'village-nose-plaza-n', x: 1_100, y: 4_950, width: 32, height: 64, kind: 'town-hedge' },
		{ id: 'village-nose-plaza-s', x: 900, y: 5_250, width: 32, height: 64, kind: 'town-hedge' },
		{ id: 'village-nose-plaza-w', x: 850, y: 5_050, width: 64, height: 32, kind: 'town-hedge' },
		{ id: 'village-nose-plaza-e', x: 1_150, y: 5_150, width: 64, height: 32, kind: 'town-hedge' },
```

- [ ] **Step 6: Add dead-end spur walls**

Add walls to enclose the 3 major and 6+ minor dead-ends. Each spur needs walls on 3 sides (the 4th opens to the lane):

```ts
		// Major dead-end: blacksmith spur (SW, off ring road)
		{ id: 'village-deadend-blacksmith-n', x: 500, y: 5_100, width: 200, height: 64, kind: 'town-hedge' },
		{ id: 'village-deadend-blacksmith-w', x: 350, y: 5_250, width: 64, height: 200, kind: 'town-hedge' },
		{ id: 'village-deadend-blacksmith-s', x: 500, y: 5_400, width: 200, height: 64, kind: 'town-hedge' },
		// Major dead-end: item-shop alley (NW, off Block A)
		{ id: 'village-deadend-shop-n', x: 500, y: 4_650, width: 200, height: 64, kind: 'town-hedge' },
		{ id: 'village-deadend-shop-w', x: 350, y: 4_750, width: 64, height: 200, kind: 'town-hedge' },
		{ id: 'village-deadend-shop-s', x: 500, y: 4_850, width: 200, height: 64, kind: 'town-hedge' },
		// Major dead-end: v-house-2 spur (N, off Block B)
		{ id: 'village-deadend-vh2-n', x: 1_200, y: 4_500, width: 200, height: 64, kind: 'town-hedge' },
		{ id: 'village-deadend-vh2-w', x: 1_050, y: 4_600, width: 64, height: 200, kind: 'town-hedge' },
		{ id: 'village-deadend-vh2-e', x: 1_350, y: 4_600, width: 64, height: 200, kind: 'town-hedge' },
		// Minor dead-end walls (6 short enclosure pairs — adjust during iteration)
		{ id: 'village-deadend-minor-1a', x: 720, y: 5_100, width: 64, height: 100, kind: 'town-hedge' },
		{ id: 'village-deadend-minor-1b', x: 820, y: 5_200, width: 64, height: 100, kind: 'town-hedge' },
		{ id: 'village-deadend-minor-2a', x: 1_280, y: 5_000, width: 64, height: 100, kind: 'town-hedge' },
		{ id: 'village-deadend-minor-2b', x: 1_180, y: 5_100, width: 64, height: 100, kind: 'town-hedge' },
		{ id: 'village-deadend-minor-3a', x: 930, y: 5_300, width: 100, height: 64, kind: 'town-hedge' },
		{ id: 'village-deadend-minor-3b', x: 1_030, y: 5_400, width: 100, height: 64, kind: 'town-hedge' },
		{ id: 'village-deadend-minor-4a', x: 1_380, y: 4_950, width: 64, height: 100, kind: 'town-hedge' },
		{ id: 'village-deadend-minor-4b', x: 1_480, y: 5_050, width: 64, height: 100, kind: 'town-hedge' },
		{ id: 'village-deadend-minor-5a', x: 1_450, y: 5_200, width: 64, height: 100, kind: 'town-hedge' },
		{ id: 'village-deadend-minor-5b', x: 1_550, y: 5_100, width: 64, height: 100, kind: 'town-hedge' },
		{ id: 'village-deadend-minor-6a', x: 580, y: 4_750, width: 64, height: 100, kind: 'town-hedge' },
		{ id: 'village-deadend-minor-6b', x: 680, y: 4_850, width: 64, height: 100, kind: 'town-hedge' },
```

- [ ] **Step 7: Run the 4 goal tests — iterate until green**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts`

The tests will likely fail on first run. Read the `JSON.stringify` output for exact violation coordinates. Adjust wall positions, add missing walls, or extend existing ones until all 4 tests pass. Common fixes:

- **Width violation on a side:** add or extend a `town-hedge` wall 128px from the lane centerline on that side.
- **Occlusion violation at a junction:** add or extend a hedge nose (32-64px segment) at the reported junction corner.
- **Dead-end count too low:** ensure each spur is enclosed on 3 sides with a single ~128px gap opening to the lane. If two spurs merge, separate them with an additional wall.
- **Accessibility failure:** a wall is trapping a transition doorway. Carve a gap (remove a wall section or split it) at the reported transition.

Each fix is a coordinate edit. Re-run after each edit. Tests are deterministic and fast (<3s).

Expected after iteration: PASS — all 4 village maze goal tests green.

- [ ] **Step 8: Verify connectivity safety net**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`
Expected: PASS — all transitions, pickups, NPCs, discoveries reachable. If a wall traps a destination, carve a doorway gap.

- [ ] **Step 9: Run full validation**

Run: `bun run test:unit -- --run && bun run check && bun run lint`
Expected: all green.

- [ ] **Step 10: Commit**

```bash
git add src/lib/game/content/maps/regions/village.ts \
        src/lib/game/content/maps/regions/soft-maze.test.ts
git commit -m "feat: village hedge maze network (ring road + cross-lanes + dead-ends)"
```

---

### Task 4: Exit corridor goal tests + winding path (RED → GREEN)

Reshapes the `spawn-to-crossroads` mainRoute from the village gate through a winding dogleg corridor to the crossroads hub. Reuses the silverpine invariant helpers.

**Files:**
- Modify: `src/lib/game/content/maps/regions/route-scenes.ts` (mainRoute reshape, beats)
- Modify: `src/lib/game/content/maps/regions/village.ts` (exit corridor walls, gate decor)
- Modify: `src/lib/game/content/maps/regions/rooms.ts` (add `village-road-reststop-room` back for the corridor)
- Test: `src/lib/game/content/maps/regions/soft-maze.test.ts`

**Interfaces:**
- Consumes: `corridorWidthViolations`, `sightlineViolations`, `bendViolations` from Task 1
- Produces: a winding exit corridor from village gate to crossroads

- [ ] **Step 1: Write the 3 failing exit corridor goal tests**

Add a new top-level describe block after the `village maze` describe in `soft-maze.test.ts` (do NOT nest it inside the village maze describe):

```ts
	describe('exit corridor — village gate to crossroads', () => {
		const ROUTE = () => routeSceneDefinitions.find((r) => r.id === 'spawn-to-crossroads')!;

		it('keeps corridor width ≤ 320px outside beat-rooms', () => {
			const violations = corridorWidthViolations(ROUTE(), { maxHalfWidth: 160 });
			expect(violations, JSON.stringify(violations.slice(0, 3))).toEqual([]);
		});

		it('occludes forward sight within 384px outside beat-rooms', () => {
			const violations = sightlineViolations(ROUTE(), { maxSightDistance: 384 });
			expect(violations, JSON.stringify(violations.slice(0, 3))).toEqual([]);
		});

		it('bends ≥30° at least once per inter-beat segment >256px', () => {
			const violations = bendViolations(ROUTE(), { minTurnDegrees: 30, minSegmentPx: 256 });
			expect(violations, JSON.stringify(violations)).toEqual([]);
		});
	});
```

- [ ] **Step 2: Run tests to verify all 3 fail**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts`
Expected: FAIL — the provisional straight mainRoute from Task 2 has no corridor walls and no bends.

- [ ] **Step 3: Reshape mainRoute into dogleg path**

In `route-scenes.ts`, replace the `spawn-to-crossroads` mainRoute with a winding path from the village gate (~x1500, y4600) to the crossroads hub (x3500, y4000):

```ts
		mainRoute: [
			{ x: 700, y: 5_600 },
			{ x: 1_000, y: 5_100 },
			{ x: 1_500, y: 4_600 },
			{ x: 1_500, y: 4_350 },
			{ x: 1_850, y: 4_350 },
			{ x: 1_850, y: 4_100 },
			{ x: 2_200, y: 4_100 },
			{ x: 2_200, y: 4_350 },
			{ x: 2_550, y: 4_350 },
			{ x: 2_550, y: 4_100 },
			{ x: 2_900, y: 4_100 },
			{ x: 2_900, y: 4_250 },
			{ x: 3_200, y: 4_250 },
			{ x: 3_500, y: 4_000 }
		],
```

- [ ] **Step 4: Re-add the exit corridor beats**

In `route-scenes.ts`, add back the corridor beats to the `spawn-to-crossroads` route's `beats` array:

```ts
			{
				id: 'village-fenced-lane-threshold',
				routeId: 'spawn-to-crossroads',
				cameraPoint: { x: 1_500, y: 4_600 },
				purpose: 'threshold',
				expectedVisibleIds: ['village-gate-lantern-a', 'village-gate-lantern-b'],
				boundaryIds: [],
				storyMotif: 'homeward-road'
			},
			{
				id: 'village-roadside-nook',
				routeId: 'spawn-to-crossroads',
				cameraPoint: { x: 2_200, y: 4_100 },
				purpose: 'fork',
				expectedVisibleIds: ['village-corridor-waymarker'],
				boundaryIds: [],
				storyMotif: 'homeward-road'
			},
			{
				id: 'village-roadside-cache-payoff',
				routeId: 'spawn-to-crossroads',
				cameraPoint: { x: 2_900, y: 4_250 },
				purpose: 'payoff',
				expectedVisibleIds: ['village-corridor-cache'],
				payoffIds: ['village-corridor-cache'],
				boundaryIds: [],
				storyMotif: 'homeward-road'
			},
```

- [ ] **Step 5: Add exit corridor walls**

In `village.ts`, add paired `town-hedge` walls at ±160px perpendicular offset for each corridor segment. Add these blockers:

```ts
		// Exit corridor walls — ±160px from the dogleg mainRoute
		// Segment: (1500,4600)→(1500,4350) vertical
		{ id: 'corridor-wall-1a', x: 1_340, y: 4_475, width: 64, height: 250, kind: 'town-hedge' },
		{ id: 'corridor-wall-1b', x: 1_660, y: 4_475, width: 64, height: 250, kind: 'town-hedge' },
		// Segment: (1500,4350)→(1850,4350) horizontal
		{ id: 'corridor-wall-2a', x: 1_675, y: 4_190, width: 350, height: 64, kind: 'town-hedge' },
		{ id: 'corridor-wall-2b', x: 1_675, y: 4_510, width: 350, height: 64, kind: 'town-hedge' },
		// Segment: (1850,4350)→(1850,4100) vertical
		{ id: 'corridor-wall-3a', x: 1_690, y: 4_225, width: 64, height: 250, kind: 'town-hedge' },
		{ id: 'corridor-wall-3b', x: 2_010, y: 4_225, width: 64, height: 250, kind: 'town-hedge' },
		// Segment: (1850,4100)→(2200,4100) horizontal
		{ id: 'corridor-wall-4a', x: 2_025, y: 3_940, width: 350, height: 64, kind: 'town-hedge' },
		{ id: 'corridor-wall-4b', x: 2_025, y: 4_260, width: 350, height: 64, kind: 'town-hedge' },
		// Segment: (2200,4100)→(2200,4350) vertical
		{ id: 'corridor-wall-5a', x: 2_040, y: 4_225, width: 64, height: 250, kind: 'town-hedge' },
		{ id: 'corridor-wall-5b', x: 2_360, y: 4_225, width: 64, height: 250, kind: 'town-hedge' },
		// Segment: (2200,4350)→(2550,4350) horizontal
		{ id: 'corridor-wall-6a', x: 2_375, y: 4_190, width: 350, height: 64, kind: 'town-hedge' },
		{ id: 'corridor-wall-6b', x: 2_375, y: 4_510, width: 350, height: 64, kind: 'town-hedge' },
		// Segment: (2550,4350)→(2550,4100) vertical
		{ id: 'corridor-wall-7a', x: 2_390, y: 4_225, width: 64, height: 250, kind: 'town-hedge' },
		{ id: 'corridor-wall-7b', x: 2_710, y: 4_225, width: 64, height: 250, kind: 'town-hedge' },
		// Segment: (2550,4100)→(2900,4100) horizontal
		{ id: 'corridor-wall-8a', x: 2_725, y: 3_940, width: 350, height: 64, kind: 'town-hedge' },
		{ id: 'corridor-wall-8b', x: 2_725, y: 4_260, width: 350, height: 64, kind: 'town-hedge' },
		// Segment: (2900,4100)→(2900,4250) vertical
		{ id: 'corridor-wall-9a', x: 2_740, y: 4_175, width: 64, height: 150, kind: 'town-hedge' },
		{ id: 'corridor-wall-9b', x: 3_060, y: 4_175, width: 64, height: 150, kind: 'town-hedge' },
		// Segment: (2900,4250)→(3200,4250) horizontal
		{ id: 'corridor-wall-10a', x: 3_050, y: 4_090, width: 300, height: 64, kind: 'town-hedge' },
		{ id: 'corridor-wall-10b', x: 3_050, y: 4_410, width: 300, height: 64, kind: 'town-hedge' },
```

- [ ] **Step 6: Add the corridor cache pickup and waymarker decor**

In `village.ts`, add to `pickups`:

```ts
	pickups: [
		{ id: 'village-corridor-cache', x: 2_900, y: 4_300, itemId: 'field-potion', quantity: 1 }
	],
```

Add to `mapDecor`:

```ts
		{
			id: 'village-corridor-waymarker',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'poleLantern',
			x: 2_200,
			y: 4_180,
			width: 110,
			height: 220,
			mode: 'image',
			collision: { id: 'village-corridor-waymarker-collision', x: 2_200, y: 4_260, width: 50, height: 60 }
		},
```

- [ ] **Step 7: Add corridor reststop room**

In `rooms.ts`, add back `village-road-reststop-room` with corridor-positioned bounds:

```ts
	{
		id: 'village-road-reststop-room',
		kind: 'side-pocket',
		bounds: { id: 'village-road-reststop-room', x: 2_900, y: 4_250, width: 300, height: 200 },
		routeIds: ['spawn-to-crossroads'],
		beatId: 'village-roadside-cache-payoff',
		requiredVisibleIds: ['village-corridor-cache'],
		payoffIds: ['village-corridor-cache'],
		storyMotif: 'homeward-road'
	},
```

- [ ] **Step 8: Run tests — iterate until green**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts`

The 3 exit corridor tests will likely need iteration. Read violation coordinates and adjust wall positions. Also verify the village maze tests still pass (corridor walls shouldn't interfere).

Expected: PASS — all village maze + exit corridor tests green.

- [ ] **Step 9: Update critical route fixtures in `maps.test.ts`**

Update the spawn→crossroads critical route to match the new 14-vertex mainRoute:

```ts
	describe('route: spawn → crossroads', () => {
		it('has no empty stretch longer than the gap tolerance', () => {
			expectRouteHasNoEmptyStretch('spawn → crossroads', [
				{ x: 700, y: 5_600 },
				{ x: 1_000, y: 5_100 },
				{ x: 1_500, y: 4_600 },
				{ x: 1_850, y: 4_350 },
				{ x: 2_200, y: 4_100 },
				{ x: 2_550, y: 4_350 },
				{ x: 2_900, y: 4_100 },
				{ x: 3_200, y: 4_250 },
				{ x: 3_500, y: 4_000 }
			]);
		});
	});
```

- [ ] **Step 10: Run full validation**

Run: `bun run test:unit -- --run && bun run check && bun run lint`
Expected: all green.

- [ ] **Step 11: Commit**

```bash
git add src/lib/game/content/maps/regions/route-scenes.ts \
        src/lib/game/content/maps/regions/village.ts \
        src/lib/game/content/maps/regions/rooms.ts \
        src/lib/game/content/maps/regions/soft-maze.test.ts \
        src/lib/game/content/maps.test.ts
git commit -m "feat: winding exit corridor (village gate → crossroads)"
```

---

### Task 5: Identity layer (decor, ground tiles, NPCs)

Adds the visual identity that makes the village read as "Sundrop Village": path tiles for all lanes, dense decor at decision points, 4 ambient NPCs, gate decor. No new goal tests — identity is verified at the human gate.

**Files:**
- Modify: `src/lib/game/content/maps/regions/village.ts` (mapDecor, ambientNpcs, groundPatches)

- [ ] **Step 1: Add lane path tiles**

In `village.ts`, add ground patches for each lane in the maze. These are `pathTile` rectangles matching the lane segments from Task 3's `villageLanes` definition:

```ts
		// Village lane path tiles — match the hedge maze lane network
		{ id: 'village-lane-west', x: 700, y: 5_150, width: 100, height: 500, tile: 'pathTile' },
		{ id: 'village-lane-north', x: 950, y: 4_700, width: 700, height: 100, tile: 'pathTile' },
		{ id: 'village-lane-east', x: 1_400, y: 5_000, width: 100, height: 350, tile: 'pathTile' },
		{ id: 'village-lane-south', x: 950, y: 5_350, width: 600, height: 100, tile: 'pathTile' },
		{ id: 'village-lane-cross-w', x: 800, y: 5_000, width: 200, height: 100, tile: 'pathTile' },
		{ id: 'village-lane-cross-ne', x: 1_200, y: 4_950, width: 200, height: 100, tile: 'pathTile' },
		// Dead-end spur tiles
		{ id: 'village-lane-blacksmith', x: 500, y: 5_250, width: 100, height: 200, tile: 'pathTile' },
		{ id: 'village-lane-shop', x: 500, y: 4_750, width: 100, height: 200, tile: 'pathTile' },
		{ id: 'village-lane-vh2', x: 1_200, y: 4_550, width: 100, height: 150, tile: 'pathTile' },
```

Adjust positions to match the finalized lane coordinates from Task 3's iteration.

- [ ] **Step 2: Add plaza and junction decor**

In `village.ts`, add decor pieces at decision points:

```ts
		// Plaza decor
		{
			id: 'village-market-stall',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'marketStall',
			x: 1_100,
			y: 5_100,
			width: 240,
			height: 190,
			mode: 'image',
			collision: { id: 'village-market-stall-collision', x: 1_100, y: 5_140, width: 200, height: 110 }
		},
		{
			id: 'village-festival-banner',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'festivalBanner',
			x: 900,
			y: 5_100,
			width: 200,
			height: 250,
			mode: 'image'
		},
		{
			id: 'village-plaza-flowers-1',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'flowerBed',
			x: 850,
			y: 5_200,
			width: 160,
			height: 130,
			mode: 'image'
		},
		{
			id: 'village-plaza-flowers-2',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'flowerBed',
			x: 1_150,
			y: 5_200,
			width: 160,
			height: 130,
			mode: 'image'
		},
		// Junction pole lanterns (one per major intersection)
		{
			id: 'village-lantern-junction-sw',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'poleLantern',
			x: 800,
			y: 5_400,
			width: 110,
			height: 220,
			mode: 'image',
			collision: { id: 'village-lantern-sw-collision', x: 800, y: 5_480, width: 50, height: 60 }
		},
		{
			id: 'village-lantern-junction-nw',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'poleLantern',
			x: 750,
			y: 4_750,
			width: 110,
			height: 220,
			mode: 'image',
			collision: { id: 'village-lantern-nw-collision', x: 750, y: 4_830, width: 50, height: 60 }
		},
		{
			id: 'village-lantern-junction-ne',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'poleLantern',
			x: 1_350,
			y: 4_850,
			width: 110,
			height: 220,
			mode: 'image',
			collision: { id: 'village-lantern-ne-collision', x: 1_350, y: 4_930, width: 50, height: 60 }
		},
		// Gate lanterns (flanking the exit)
		{
			id: 'village-gate-lantern-a',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'poleLantern',
			x: 1_400,
			y: 4_650,
			width: 110,
			height: 220,
			mode: 'image',
			collision: { id: 'village-gate-lantern-a-collision', x: 1_400, y: 4_730, width: 50, height: 60 }
		},
		{
			id: 'village-gate-lantern-b',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'poleLantern',
			x: 1_600,
			y: 4_650,
			width: 110,
			height: 220,
			mode: 'image',
			collision: { id: 'village-gate-lantern-b-collision', x: 1_600, y: 4_730, width: 50, height: 60 }
		},
		// Dead-end accents
		{
			id: 'village-maple-garden',
			textureKey: shrineDressingAsset.key,
			frameName: 'autumnMaple',
			x: 750,
			y: 5_150,
			width: 220,
			height: 280,
			mode: 'image',
			collision: { id: 'village-maple-garden-collision', x: 750, y: 5_240, width: 80, height: 70 }
		},
		{
			id: 'village-shrine-offering',
			textureKey: shrineDressingAsset.key,
			frameName: 'offeringStand',
			x: 950,
			y: 5_350,
			width: 200,
			height: 200,
			mode: 'image',
			collision: { id: 'village-shrine-offering-collision', x: 950, y: 5_400, width: 80, height: 60 }
		},
		{
			id: 'village-stone-lantern',
			textureKey: shrineDressingAsset.key,
			frameName: 'stoneLantern',
			x: 1_050,
			y: 5_350,
			width: 200,
			height: 200,
			mode: 'image',
			collision: { id: 'village-stone-lantern-collision', x: 1_050, y: 5_400, width: 80, height: 60 }
		},
```

Adjust positions to avoid overlapping with hedge walls from Task 3.

- [ ] **Step 3: Add 4 ambient NPCs**

Replace the `ambientNpcs` array:

```ts
	ambientNpcs: [
		{ id: 'village-wanderer', x: 1_000, y: 5_150, frameName: 'travelerNpc' },
		{ id: 'village-woodcutter', x: 800, y: 5_350, frameName: 'woodcutterNpc' },
		{ id: 'village-fisher', x: 500, y: 5_300, frameName: 'fisherNpc' },
		{ id: 'village-crier', x: 1_450, y: 4_750, frameName: 'crierNpc' }
	],
```

- [ ] **Step 4: Run full validation**

Run: `bun run test:unit -- --run && bun run check && bun run lint`
Expected: all green. If a decor collision rect blocks a lane or transition, adjust its position.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/content/maps/regions/village.ts
git commit -m "feat: village identity layer (path tiles, decor, 4 NPCs)"
```

---

### Task 6: Regenerate diagram, final validation, HUMAN GATE

Produces the updated `spawn-to-crossroads.svg` for human review, runs the full validation suite, and stops at the human gate.

**Files:**
- Regenerate: `docs/superpowers/reports/blockout-diagrams/spawn-to-crossroads.svg`
- Read-only: `docs/superpowers/specs/2026-06-22-village-maze-redesign-design.md`

- [ ] **Step 1: Regenerate the spawn-to-crossroads SVG diagram**

Run: `GENERATE_DIAGRAM=1 bun run test:unit -- --run src/lib/game/content/maps/regions/blockout-diagram.test.ts`
Expected: PASS — the SVG is rewritten with the compact village cluster and winding exit corridor.

- [ ] **Step 2: Verify the SVG objectively**

```bash
f="docs/superpowers/reports/blockout-diagrams/spawn-to-crossroads.svg"
echo "boundary rects: $(grep -o 'fill="#b91c1c"' "$f" | wc -l | tr -d ' ')"
echo "route polyline present: $(grep -c 'stroke="#22d3ee"' "$f")"
echo "waypoints: $(grep -o '<circle' "$f" | wc -l | tr -d ' ')"
```

Expected: boundary rect count > 30 (village maze walls + corridor walls); polyline present; waypoint count reflects the reshaped mainRoute (14 vertices).

- [ ] **Step 3: Run the FULL validation suite**

Run: `bun run test:unit -- --run && bun run check && bun run lint && bun run test:e2e`
Expected: all green. If e2e fails, investigate whether a village transition broke (hero-house entry, item-shop shopping, etc.).

- [ ] **Step 4: Commit the regenerated diagram**

```bash
git add docs/superpowers/reports/blockout-diagrams/
git commit -m "docs: regenerate spawn-to-crossroads diagram (village maze redesign)"
```

- [ ] **Step 5: STOP — present the village maze for human gate**

Do NOT proceed to other routes. Present to the user:
- The SVG path: `docs/superpowers/reports/blockout-diagrams/spawn-to-crossroads.svg`
- The validation summary: unit test count, e2e count, 0 typecheck, lint clean
- The honest note: "The geometric invariants pass. Open the SVG in a browser to confirm the compact cluster, maze lanes, and winding exit corridor. In-game visual confirmation (`bun run dev` or `bun run tauri dev`) is the remaining gate step — I cannot view images."

---

## Self-Review Notes

**Spec coverage check:**
- Section 1 (layout, 5 blocks, ring road): Task 2 (reposition) + Task 3 (maze walls) ✓
- Section 2 (hedge maze, lanes, junctions, occlusion): Task 3 ✓
- Section 3 (dead-ends, major + minor): Task 3 ✓
- Section 4 (exit corridor, gate, winding path, beats): Task 4 ✓
- Section 5 (identity, ground tiles, decor, NPCs): Task 5 ✓
- Section 6 (testing, 5 maze + 3 corridor + bug fix): Tasks 1-4 ✓
- Acceptance criteria (human gate): Task 6 ✓
- Out of scope (other routes, interiors): not touched ✓

**Type consistency check:**
- `LaneSegment = {from: Pt, to: Pt}` — defined Task 1, used Task 3 ✓
- `sampleLaneSet`, `laneWidthViolations`, `junctionOcclusionViolations`, `countDeadEnds` — defined Task 1, called Task 3 ✓
- `bendViolations` fix (i=1 start) — defined Task 1, called Task 4 ✓
- `corridorWidthViolations`, `sightlineViolations` — from silverpine pilot, called Task 4 ✓
- `Pt`, `Rect`, `Solid` types — consistent with existing usage ✓

**Known iteration needs:**
- Task 3 Step 7: hedge wall coordinates are starting estimates; expect 5-10 iterations
- Task 4 Step 8: corridor wall coordinates are starting estimates; expect 2-3 iterations
- Task 5 Step 2: decor positions may need adjustment to avoid overlapping hedges
