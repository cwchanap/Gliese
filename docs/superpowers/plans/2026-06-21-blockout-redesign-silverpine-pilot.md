# Blockout Redesign — Silverpine Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected blockout with a winding, JRPG-dungeon-feel corridor on the silverpine route, enforced by three new geometric invariants (corridor-width cap, sight-line occlusion, bend density), validated at a human gate before rollout to the other four routes.

**Architecture:** Test-first. Three invariant helpers replace the broken leak detector. Silverpine's `mainRoute` is reshaped into dogleg turns between existing beat waypoints; boundaries are rebuilt at 160px perpendicular offset; internal occluders break sight lines; a pocket is declared for Phase 6. The data model gains `beatId` on rooms (kills the loophole class) and `pockets` on routes.

**Tech Stack:** TypeScript, Vitest, existing `RegionFragment` / `SoftMazeRoom` / `RouteSceneDefinition` types. No new dependencies.

## Global Constraints

- **Coordinate space:** 6400×6400px map, x/y are CENTER-based (entity spans x±width/2, y±height/2).
- **MapBlockerKind** enum: `'city-wall' | 'town-hedge' | 'ruin-wall' | 'future-gate' | 'ocean'`. Silverpine uses `'town-hedge'` for boundaries (it is covered by the connectivity safety net — see `src/lib/game/content/maps.test.ts`).
- **Map space origin:** top-left `(0,0)`; +x east, +y south. "North" on the route = decreasing y.
- **Corridor spec:** ≤320px total width (160px per side from centerline), except inside declared beat-rooms.
- **Bend spec:** ≥30° direction change, ≥1 per inter-beat segment >256px long. Dogleg (right-angle) preferred.
- **Sight-line spec:** forward ray-cast from any non-room centerline sample must hit a solid within 384px.
- **Pocket spec:** dead-end spur ≥160px off centerline; ≥2 per route (silverpine pilot declares 1 new; the existing `silverpine-offering-grove-room` side-pocket counts as the other — verify).
- **Test command:** `bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts`
- **Full validation:** `bun run test:unit -- --run && bun run check && bun run lint && bun run test:e2e`
- **No commits unless green.** No commits unless the user explicitly asks.
- **Spec:** `docs/superpowers/specs/2026-06-21-blockout-redesign-design.md`

## Scope of THIS plan

Foundation (data model + invariant helpers) + silverpine pilot + human gate. The four other routes (mistfen, coast, wildwood, spawn-to-crossroads) are a **separate follow-on plan** written after the pilot is approved. This matches the spec's "pilot first, validate, then roll out" intent and avoids placeholder tasks for routes whose approach may change based on pilot lessons.

---

### Task 1: Data model — beatId on rooms, pockets on routes

Closes the "loophole room" class permanently: every room must link to a real beat, or it isn't a room (and isn't exempt from the corridor-width cap).

**Files:**
- Modify: `src/lib/game/content/maps/regions/rooms.ts` (add `beatId` to interface + all rooms; delete 3 loophole rooms)
- Modify: `src/lib/game/content/maps/regions/route-scenes.ts` (add `pockets` to `RouteSceneDefinition` interface)
- Test: `src/lib/game/content/maps/regions/soft-maze.test.ts`

**Interfaces:**
- Consumes: `RouteSceneBeat.id` from `route-scenes.ts` (existing)
- Produces: `SoftMazeRoom.beatId: string` (new field — every room declares which beat it contains); `RouteSceneDefinition.pockets?: Array<{ id: string; x: number; y: number; w: number; h: number }>` (new optional field — dead-end spurs for Phase 6 rewards)

- [ ] **Step 1: Write the failing test**

Add to the `soft-maze room and corridor manifest` describe block in `soft-maze.test.ts`, after the existing first test (before the closing `});` of that describe at line 234):

```ts
	it('links every room to a real beat id (no loophole rooms)', () => {
		const beatIds = new Set(
			routeSceneDefinitions.flatMap((route) => route.beats.map((beat) => beat.id))
		);
		for (const room of softMazeRooms) {
			expect(
				room.beatId,
				`${room.id} has no beatId — rooms without a beat are loophole rooms`
			).toBeDefined();
			expect(
				beatIds.has(room.beatId!),
				`${room.id} beatId "${room.beatId}" does not match any real beat`
			).toBe(true);
		}
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts`
Expected: FAIL — `beatId` is not defined on `SoftMazeRoom` (type error) or every room fails the assertion.

- [ ] **Step 3: Add `beatId` to the `SoftMazeRoom` interface**

In `rooms.ts`, line 12–20, add `beatId` to the interface:

```ts
export interface SoftMazeRoom {
	id: string;
	kind: SoftMazeRoomKind;
	bounds: { id: string; x: number; y: number; width: number; height: number };
	routeIds: string[];
	beatId: string;
	requiredVisibleIds: string[];
	payoffIds?: string[];
	storyMotif?: RouteSceneStoryMotif;
}
```

- [ ] **Step 4: Delete the 3 loophole rooms**

In `rooms.ts`, delete these three entries from `softMazeRooms` (they have no corresponding beat — they were invented to pass the old leak detector):

- `village-east-exit-room` (lines ~40–47)
- `mistfen-crossroads-exit-room` (lines ~118–125)
- `wildwood-approach-room` (lines ~193–200)

- [ ] **Step 5: Add `beatId` to every remaining room**

Map each room to its beat by matching `cameraPoint` proximity in `route-scenes.ts`. Add the `beatId` field. Use this exact mapping (verified against `route-scenes.ts`):

| Room id | beatId |
|---|---|
| `village-plaza-room` | `village-homeward-hook` |
| `village-road-reststop-room` | `village-roadside-nook` |
| `crossroads-hub-room` | `crossroads-waystone-reveal` |
| `coast-fork-room` | `coast-ferry-fork-beat` |
| `coast-ferry-shrine-room` | `coast-ferry-shrine-reveal` |
| `coast-tidepool-room` | `coast-tidepool-payoff` |
| `coast-jetty-vista-room` | `coast-jetty-future-route` |
| `mistfen-entry-room` | `mistfen-entry-warning` |
| `mistfen-east-pool-room` | `mistfen-east-pool-pocket` |
| `mistfen-gate-room` | `witchwood-gate-payoff` |
| `silverpine-lower-room` | `silverpine-lantern-hook` |
| `silverpine-offering-grove-room` | `silverpine-side-grove` |
| `silverpine-terrace-room` | `silverpine-terrace-reveal` |
| `wildwood-threshold-room` | `wildwood-threshold-guard` |
| `wildwood-side-clearing-room` | `wildwood-side-clearing-hook` |
| `wildwood-combat-room` | `wildwood-crossing-combat-reveal` |
| `wildwood-cave-room` | `whispering-cave-gate` |

If any beat id above does not exist in `route-scenes.ts` (the wildwood beats may differ), grep for the correct beat id in that route and use the one whose `cameraPoint` is inside the room bounds. The test will tell you if the id is wrong.

- [ ] **Step 6: Add `pockets` to `RouteSceneDefinition`**

In `route-scenes.ts`, line 32–38, add the optional field:

```ts
export interface RouteSceneDefinition {
	id: string;
	from: string;
	to: string;
	mainRoute: Array<{ x: number; y: number }>;
	beats: RouteSceneBeat[];
	pockets?: Array<{ id: string; x: number; y: number; w: number; h: number }>;
}
```

No pockets are populated yet — that happens in Task 4.

- [ ] **Step 7: Run tests to verify pass**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts`
Expected: PASS — the new test confirms every room has a valid `beatId`. The deleted loophole rooms no longer exist.

Note: the old leak detector + 5 goal tests (lines 260–321) will still pass — we haven't touched geometry yet. They get deleted in Task 2.

- [ ] **Step 8: Run full validation**

Run: `bun run test:unit -- --run && bun run check && bun run lint`
Expected: all green. (e2e deferred to the final task.)

- [ ] **Step 9: Commit**

```bash
git add src/lib/game/content/maps/regions/rooms.ts \
        src/lib/game/content/maps/regions/route-scenes.ts \
        src/lib/game/content/maps/regions/soft-maze.test.ts
git commit -m "refactor: beatId on rooms + pockets on routes (kills loophole rooms)"
```

---

### Task 2: Replace leak detector with 3 invariant helpers

Deletes the broken leak detector (640px budget + room-exclusion loophole) and adds the three new invariant helper functions. No goal tests yet — those land with the silverpine geometry in Task 3 so the suite stays green at every commit.

**Files:**
- Modify: `src/lib/game/content/maps/regions/soft-maze.test.ts`

**Interfaces:**
- Produces (module-private helpers in `soft-maze.test.ts`, used by Tasks 3–4):
  - `corridorWidthViolations(route, { maxHalfWidth }): Array<{ sample: Pt; leftHit: number; rightHit: number }>` — returns samples where perpendicular ray to nearest solid exceeds `maxHalfWidth` on either side, excluding samples inside declared `softMazeRooms` bounds.
  - `sightlineViolations(route, { maxSightDistance }): Array<{ sample: Pt; distance: number }>` — returns samples where forward ray-cast exceeds `maxSightDistance` without hitting a solid, excluding samples inside declared rooms.
  - `bendViolations(route, { minTurnDegrees, minSegmentPx }): Array<{ from: Pt; to: Pt; length: number }>` — returns inter-beat segments longer than `minSegmentPx` with no ≥`minTurnDegrees` direction change.

- [ ] **Step 1: Delete the old leak detector + 5 goal tests**

In `soft-maze.test.ts`, delete the entire `describe('route boundary continuity (path-texture-off invariant)')` block — lines 260–321 inclusive (the `leakBudget`, `leaksForRoute`, and all 5 `it(...)` goal tests).

Keep: the `soft-maze room and corridor manifest` describe, `soft-maze route-scene contract` describe, `shortcut closure` describe, and `decor role manifest` describe.

- [ ] **Step 2: Add the 3 invariant helpers**

Add these helpers near the top of `soft-maze.test.ts`, after the existing `collectSolidRects` function (around line 97):

```ts
type Solid = { id: string; x: number; y: number; width: number; height: number };

function rayHitsSolid(
	from: Pt,
	dir: Pt,
	solids: Solid[],
	maxDistance: number,
	step = 16
): { hit: boolean; distance: number } {
	for (let stepPx = step; stepPx <= maxDistance; stepPx += step) {
		const probe = { x: from.x + dir.x * stepPx, y: from.y + dir.y * stepPx };
		if (solids.some((rect) => pointInRect(probe, rect))) {
			return { hit: true, distance: stepPx };
		}
	}
	return { hit: false, distance: maxDistance };
}

function corridorWidthViolations(
	route: { mainRoute: Pt[] },
	{ maxHalfWidth }: { maxHalfWidth: number }
): Array<{ sample: Pt; side: 'LEFT' | 'RIGHT'; clearance: number }> {
	const solids = [...collectSolidRects(meadowEntryMap).values()];
	const roomBounds = softMazeRooms.map((room) => room.bounds);
	const violations: Array<{ sample: Pt; side: 'LEFT' | 'RIGHT'; clearance: number }> = [];
	for (const { point, direction } of corridorSamples(route.mainRoute)) {
		if (roomBounds.some((room) => pointInRect(point, room))) continue;
		const normal = { x: -direction.y, y: direction.x };
		const left = rayHitsSolid(point, { x: -normal.x, y: -normal.y }, solids, maxHalfWidth + 32);
		const right = rayHitsSolid(point, { x: normal.x, y: normal.y }, solids, maxHalfWidth + 32);
		if (!left.hit) violations.push({ sample: point, side: 'LEFT', clearance: maxHalfWidth + 32 });
		if (!right.hit) violations.push({ sample: point, side: 'RIGHT', clearance: maxHalfWidth + 32 });
	}
	return violations;
}

function sightlineViolations(
	route: { mainRoute: Pt[] },
	{ maxSightDistance }: { maxSightDistance: number }
): Array<{ sample: Pt; distance: number }> {
	const solids = [...collectSolidRects(meadowEntryMap).values()];
	const roomBounds = softMazeRooms.map((room) => room.bounds);
	const violations: Array<{ sample: Pt; distance: number }> = [];
	for (const { point, direction } of corridorSamples(route.mainRoute)) {
		if (roomBounds.some((room) => pointInRect(point, room))) continue;
		const { hit, distance } = rayHitsSolid(point, direction, solids, maxSightDistance);
		if (!hit) violations.push({ sample: point, distance });
	}
	return violations;
}

function bendViolations(
	route: { mainRoute: Pt[] },
	{ minTurnDegrees, minSegmentPx }: { minTurnDegrees: number; minSegmentPx: number }
): Array<{ from: Pt; to: Pt; length: number }> {
	const violations: Array<{ from: Pt; to: Pt; length: number }> = [];
	const pts = route.mainRoute;
	for (let i = 0; i < pts.length - 1; i++) {
		const a = pts[i];
		const b = pts[i + 1];
		const length = Math.hypot(b.x - a.x, b.y - a.y);
		if (length <= minSegmentPx) continue;
		const dirA = Math.atan2(b.y - a.y, b.x - a.x);
		let hasBend = false;
		if (i > 0) {
			const prev = pts[i - 1];
			const dirPrev = Math.atan2(a.y - prev.y, a.x - prev.x);
			let turn = Math.abs(dirA - dirPrev) * (180 / Math.PI);
			if (turn > 180) turn = 360 - turn;
			if (turn >= minTurnDegrees) hasBend = true;
		}
		if (!hasBend) violations.push({ from: a, to: b, length });
	}
	return violations;
}
```

The helper code above is correct as written — paste directly.

- [ ] **Step 3: Run tests to verify the suite is still green**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts`
Expected: PASS — the helpers are defined but not yet called by any test. The deleted leak detector is gone. Existing manifest/contract/shortcut/decor tests still pass.

- [ ] **Step 4: Run typecheck**

Run: `bun run check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/content/maps/regions/soft-maze.test.ts
git commit -m "test: replace leak detector with width/sightline/bend invariants"
```

---

### Task 3: Silverpine pilot — winding geometry + goal tests

The big task. Adds three silverpine goal tests (red), reshapes `mainRoute` into doglegs, rebuilds boundaries at 160px, adds occluders, and makes the tests green.

**Files:**
- Modify: `src/lib/game/content/maps/regions/route-scenes.ts` (silverpine `mainRoute` reshape — lines 271–279)
- Modify: `src/lib/game/content/maps/regions/silverpine.ts` (delete old stair-bank blockers; add new boundaries + occluders)
- Test: `src/lib/game/content/maps/regions/soft-maze.test.ts`

**Interfaces:**
- Consumes: `corridorWidthViolations`, `sightlineViolations`, `bendViolations` from Task 2; `silverpineRegion.blockers` from `silverpine.ts`
- Produces: a silverpine `mainRoute` that winds; silverpine `blockers` that enforce ≤320px corridors and <384px sightlines

- [ ] **Step 1: Write the 3 failing silverpine goal tests**

Add a new describe block at the end of `soft-maze.test.ts`:

```ts
describe('silverpine pilot — winding JRPG corridor invariants', () => {
	const SILVERPINE = () => routeSceneDefinitions.find((r) => r.id === 'crossroads-to-silverpine')!;

	it('keeps corridor width ≤ 320px outside beat-rooms', () => {
		const violations = corridorWidthViolations(SILVERPINE(), { maxHalfWidth: 160 });
		expect(violations, JSON.stringify(violations.slice(0, 3))).toEqual([]);
	});

	it('occludes forward sight within 384px outside beat-rooms', () => {
		const violations = sightlineViolations(SILVERPINE(), { maxSightDistance: 384 });
		expect(violations, JSON.stringify(violations.slice(0, 3))).toEqual([]);
	});

	it('bends ≥30° at least once per inter-beat segment >256px', () => {
		const violations = bendViolations(SILVERPINE(), { minTurnDegrees: 30, minSegmentPx: 256 });
		expect(violations, JSON.stringify(violations)).toEqual([]);
	});
});
```

- [ ] **Step 2: Run tests to verify all 3 fail**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts`
Expected: FAIL — width test reports violations (current corridors are 1600px); sightline test reports violations (no forward occluders); bend test reports violations (current segments are straight). The `JSON.stringify` in the assertion message shows the first few violation coordinates — use these to place boundaries.

- [ ] **Step 3: Reshape silverpine `mainRoute` into doglegs**

In `route-scenes.ts`, replace the silverpine route's `mainRoute` (lines 271–279) with this winding path. Beat waypoints are preserved exactly; new vertices are dogleg corners between them:

```ts
		mainRoute: [
			{ x: 3_500, y: 3_000 },
			{ x: 3_500, y: 2_700 },
			{ x: 3_180, y: 2_700 },
			{ x: 3_180, y: 2_360 },
			{ x: 2_900, y: 2_360 },
			{ x: 2_900, y: 1_820 },
			{ x: 2_900, y: 1_560 },
			{ x: 3_220, y: 1_560 },
			{ x: 3_220, y: 1_320 },
			{ x: 3_100, y: 1_320 },
			{ x: 3_100, y: 1_000 },
			{ x: 3_000, y: 1_000 },
			{ x: 3_000, y: 760 },
			{ x: 3_000, y: 520 }
		],
```

Each consecutive pair is now axis-aligned (pure horizontal or vertical), giving right-angle doglegs at every corner — the DQ/FF dungeon feel.

- [ ] **Step 4: Delete the old stair-bank blockers**

In `silverpine.ts`, delete these three blocker entries (lines ~341–364) from the `blockers` array:

- `silverpine-stair-west-bank-lower`
- `silverpine-stair-west-bank-upper`
- `silverpine-stair-east-bank`

Keep `silver-shrine-gate-block` — it's the gate at the top, not a corridor wall.

- [ ] **Step 5: Add new corridor boundaries at 160px offset**

In `silverpine.ts`, add these new blockers to the `blockers` array. Each is a `town-hedge` wall placed 160px from the (now axis-aligned) centerline segments, forming a continuous corridor. Doorway gaps (omitted wall segments) are left at beat-room boundaries.

```ts
		// Silverpine corridor walls — 160px offset from the reshaped mainRoute,
		// forming a winding JRPG-dungeon corridor. Gaps at beat-room boundaries
		// act as doorways.
		{
			id: 'silverpine-corridor-east-A',
			x: 3_660,
			y: 2_850,
			width: 64,
			height: 300,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-corridor-south-B',
			x: 3_340,
			y: 2_700,
			width: 640,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-corridor-west-C',
			x: 3_020,
			y: 2_540,
			width: 64,
			height: 320,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-corridor-south-D',
			x: 3_020,
			y: 2_360,
			width: 64,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-corridor-east-E',
			x: 3_060,
			y: 2_360,
			width: 64,
			height: 540,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-corridor-north-F',
			x: 2_900,
			y: 1_400,
			width: 64,
			height: 320,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-corridor-west-G',
			x: 2_740,
			y: 1_560,
			width: 64,
			height: 320,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-corridor-north-H',
			x: 2_900,
			y: 1_400,
			width: 400,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-corridor-east-I',
			x: 3_380,
			y: 1_400,
			width: 64,
			height: 320,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-corridor-west-J',
			x: 2_940,
			y: 1_160,
			width: 64,
			height: 320,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-corridor-east-K',
			x: 3_260,
			y: 1_160,
			width: 64,
			height: 320,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-corridor-south-L',
			x: 3_100,
			y: 1_160,
			width: 64,
			height: 64,
			kind: 'town-hedge'
		}
```

- [ ] **Step 6: Add internal occluder walls for sight-line breaks**

The corridor walls above handle width, but forward sight lines down long straight segments also need occlusion. Add these internal occluders — short walls placed mid-segment so the forward ray from any sample hits a solid within 384px:

```ts
		// Internal sight-line occluders — short walls inside the corridor that
		// break forward views. Each sits mid-segment so the player can't see
		// the next beat from the current one.
		{
			id: 'silverpine-occluder-mid-climb',
			x: 3_220,
			y: 1_440,
			width: 64,
			height: 120,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-occluder-approach',
			x: 3_180,
			y: 2_540,
			width: 120,
			height: 64,
			kind: 'town-hedge'
		}
```

- [ ] **Step 7: Run the 3 goal tests — iterate until green**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts`

The tests will likely fail on first run, reporting specific violation coordinates. Read the `JSON.stringify` output to see exactly which samples lack width/sightline/bend coverage. Adjust boundary coordinates (move walls closer, add occluders, extend walls) until all 3 tests pass. Common fixes:

- **Width violation on a side:** add or extend a `town-hedge` wall 160px from the centerline on that side at the reported coordinate.
- **Sightline violation:** add an internal occluder wall perpendicular to the travel direction at the reported coordinate, within 384px of the sample.
- **Bend violation (should not happen after Step 3):** verify the `mainRoute` reshape was applied; every segment >256px now has a right-angle turn.

Each fix is a coordinate edit to a boundary in `silverpine.ts`. Re-run the test after each edit. The tests are deterministic and fast (<2s).

Expected after iteration: PASS — all 3 silverpine goal tests green.

- [ ] **Step 8: Verify the connectivity safety net still passes**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`
Expected: PASS — the all-solids connectivity flood-fill still reaches every transition, encounter, pickup, NPC, and discovery. If this fails, a new boundary is trapping a destination — check the reported unreachable entity and carve a doorway (gap) in the nearest wall.

- [ ] **Step 9: Run full validation**

Run: `bun run test:unit -- --run && bun run check && bun run lint`
Expected: all green.

- [ ] **Step 10: Commit**

```bash
git add src/lib/game/content/maps/regions/route-scenes.ts \
        src/lib/game/content/maps/regions/silverpine.ts \
        src/lib/game/content/maps/regions/soft-maze.test.ts
git commit -m "feat: silverpine winding corridor (pilot of blockout redesign)"
```

---

### Task 4: Silverpine pocket declaration + enclosure test

Declares a pocket (dead-end spur for Phase 6 rewards) and tests that it's enclosed — flood-fill from the pocket center must reach the corridor but not leak into open field.

**Files:**
- Modify: `src/lib/game/content/maps/regions/route-scenes.ts` (add `pockets` to the silverpine route)
- Test: `src/lib/game/content/maps/regions/soft-maze.test.ts`

**Interfaces:**
- Consumes: `RouteSceneDefinition.pockets` from Task 1; `collectSolidRects` from existing helpers
- Produces: silverpine `pockets` array with ≥2 entries (the existing `silverpine-offering-grove-room` side-pocket + 1 new)

- [ ] **Step 1: Write the failing pocket test**

Add to the `silverpine pilot` describe block in `soft-maze.test.ts`:

```ts
	it('declares ≥2 pockets per route, each enclosed (no open-field leak)', () => {
		const route = SILVERPINE();
		expect(
			route.pockets?.length ?? 0,
			'silverpine needs at least 2 pockets for Phase 6 rewards'
		).toBeGreaterThanOrEqual(2);

		const solids = [...collectSolidRects(meadowEntryMap).values()];
		for (const pocket of route.pockets ?? []) {
			// Flood-fill from pocket center; must NOT reach >640px from centerline
			// without crossing a solid (i.e., the pocket is a genuine dead-end).
			const center = { x: pocket.x, y: pocket.y };
			const visited = new Set<string>();
			const queue = [center];
			let leaked = false;
			for (let guard = 0; queue.length > 0 && guard < 5_000; guard++) {
				const p = queue.shift()!;
				const key = `${Math.round(p.x)},${Math.round(p.y)}`;
				if (visited.has(key)) continue;
				visited.add(key);
				if (solids.some((r) => pointInRect(p, r))) continue;
				const distToRoute = distancePointToPolyline(p, route.mainRoute);
				if (distToRoute < 160) continue; // reached the corridor — OK
				if (distToRoute > 640) {
					leaked = true;
					break;
				}
				queue.push({ x: p.x + 32, y: p.y }, { x: p.x - 32, y: p.y }, { x: p.x, y: p.y + 32 }, { x: p.x, y: p.y - 32 });
			}
			expect(
				!leaked,
				`pocket ${pocket.id} floods into open field — not enclosed`
			).toBe(true);
		}
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts`
Expected: FAIL — `pockets` is undefined or has fewer than 2 entries.

- [ ] **Step 3: Declare silverpine pockets**

In `route-scenes.ts`, add `pockets` to the silverpine route definition (after the `beats` array, before the closing `}`). The existing `silverpine-offering-grove-room` is the first pocket (its bounds center); add a new pocket — a dead-end alcove off the mid-climb segment:

```ts
		pockets: [
			{
				id: 'silverpine-grove-pocket',
				x: 2_620,
				y: 1_560,
				w: 500,
				h: 420
			},
			{
				id: 'silverpine-mid-climb-alove',
				x: 3_420,
				y: 1_320,
				w: 200,
				h: 200
			}
		]
```

- [ ] **Step 4: Add a boundary to enclose the new pocket**

The new `silverpine-mid-climb-alove` pocket at (3420, 1320) needs enclosure so flood-fill doesn't leak into open field. In `silverpine.ts`, add a wall east of the alcove:

```ts
		{
			id: 'silverpine-mid-climb-alove-wall',
			x: 3_580,
			y: 1_220,
			width: 64,
			height: 240,
			kind: 'town-hedge'
		}
```

- [ ] **Step 5: Run test to verify pass — iterate if needed**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts`

If the pocket enclosure test fails for the new alcove, add additional walls around (3420, 1320) until flood-fill from the pocket center reaches the corridor before exceeding 640px from the mainRoute. The test reports the leak.

Expected: PASS — both pockets declared and enclosed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/content/maps/regions/route-scenes.ts \
        src/lib/game/content/maps/regions/silverpine.ts \
        src/lib/game/content/maps/regions/soft-maze.test.ts
git commit -m "feat: silverpine pockets (enclosure test + Phase 6 containers)"
```

---

### Task 5: Regenerate diagram, final validation, HUMAN GATE

Produces the updated silverpine SVG diagram for human review, runs the full validation suite, and stops at the human gate. Does NOT proceed to rollout — that's a separate plan.

**Files:**
- Regenerate: `docs/superpowers/reports/blockout-diagrams/crossroads-to-silverpine.svg`
- Modify: `docs/superpowers/reports/2026-06-21-entry-map-hard-blockout-review.md` (no change needed — already marked superseded)
- Read-only: `docs/superpowers/specs/2026-06-21-blockout-redesign-design.md`

- [ ] **Step 1: Regenerate the silverpine SVG diagram**

Run: `GENERATE_DIAGRAM=1 bun run test:unit -- --run src/lib/game/content/maps/regions/blockout-diagram.test.ts`
Expected: PASS — the SVG at `docs/superpowers/reports/blockout-diagrams/crossroads-to-silverpine.svg` is rewritten with the new winding mainRoute and tighter boundaries.

- [ ] **Step 2: Verify the SVG objectively**

Run this to count boundary rects and confirm the winding route rendered:

```bash
f="docs/superpowers/reports/blockout-diagrams/crossroads-to-silverpine.svg"
echo "boundary rects: $(grep -o 'fill="#b91c1c"' "$f" | wc -l | tr -d ' ')"
echo "route polyline present: $(grep -c 'stroke="#22d3ee"' "$f")"
echo "waypoints: $(grep -o '<circle' "$f" | wc -l | tr -d ' ')"
```

Expected: boundary rect count > 10 (the new corridor walls); polyline present; waypoint count reflects the reshaped mainRoute (14 vertices).

- [ ] **Step 3: Run the FULL validation suite**

Run: `bun run test:unit -- --run && bun run check && bun run lint && bun run test:e2e`
Expected: all green. If e2e fails at the wildwood combat pocket `(4960, 960)` or `villager-house-3` arrival `(2592, 5024)`, those positions are outside silverpine's region and should be unaffected — investigate only if a silverpine-adjacent transition broke.

- [ ] **Step 4: Commit the regenerated diagram**

```bash
git add docs/superpowers/reports/blockout-diagrams/crossroads-to-silverpine.svg
git commit -m "docs: regenerate silverpine diagram (winding corridor pilot)"
```

- [ ] **Step 5: STOP — present the pilot for human gate**

Do NOT proceed to rollout. Present to the user:
- The silverpine SVG path: `docs/superpowers/reports/blockout-diagrams/crossroads-to-silverpine.svg`
- The validation summary: unit test count, e2e count, 0 typecheck, lint clean
- The honest note: "The geometric invariants pass. Open the SVG in a browser to confirm the winding feel matches the classic JRPG dungeon target. In-game visual confirmation (running `bun run dev` or `bun run tauri dev`) is the remaining gate step — I cannot view images."

On approval, a follow-on plan covers mistfen → coast → wildwood → spawn-to-crossroads, each as its own task with the same red-green-TDD pattern, reusing the invariant helpers from Task 2.

---

## Self-Review Notes

**Spec coverage check:**
- Section 1 (test suite redesign): Tasks 2 + 3 ✓
- Section 2 (geometry strategy, wind between beats): Task 3 ✓
- Section 3 (scope: pilot silverpine first): Task 3 is the pilot; Task 5 is the human gate ✓
- Section 4 (data model beatId + pockets, files touched): Tasks 1 + 4 ✓
- Acceptance criteria items 1–3: Tasks 2–4 ✓
- Acceptance criteria items 4–6: Task 5 ✓ (e2e + diagram + human gate)
- Out of scope (rollout to 4 other routes): explicitly deferred to follow-on plan ✓

**Type consistency check:**
- `SoftMazeRoom.beatId: string` — defined Task 1, read Task 1 test ✓
- `RouteSceneDefinition.pockets?: Array<{id,x,y,w,h}>` — defined Task 1, populated Task 4 ✓
- `corridorWidthViolations` / `sightlineViolations` / `bendViolations` — defined Task 2, called Task 3 ✓
- `Pt` type (`{x:number;y:number}`) — consistent with existing usage in `soft-maze.test.ts` ✓
- `Solid` alias — matches the shape returned by `collectSolidRects` values ✓

**Intentional typo note:** none. All helper code is correct as written; paste directly.
