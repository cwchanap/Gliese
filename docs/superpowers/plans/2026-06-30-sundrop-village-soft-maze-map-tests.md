# Sundrop Village Soft-Maze And Map Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update broader Sundrop Village map tests so soft-maze and reward assertions follow the deterministic village manifests instead of local pre-manifest fixtures.

**Architecture:** Keep runtime village content unchanged. Make `soft-maze.test.ts` consume the HPA-112 room and corridor manifests, and add an explicit side-pocket reward id assertion to `village-layout.test.ts`.

**Tech Stack:** TypeScript, Vitest server tests, existing Svelte/Vite path aliases.

---

## File Structure

- Modify: `src/lib/game/content/maps/regions/soft-maze.test.ts`
  - Responsibility: broader soft-maze geometric invariants for village lanes, room skips, shortcuts, and transition reachability.
- Modify: `src/lib/game/content/maps/regions/village-layout.test.ts`
  - Responsibility: focused deterministic village layout assertions, including side rewards and decor roles.
- Do not modify: `src/lib/game/content/maps.test.ts`
  - Existing map validity and reachability tests already pass and remain verification-only for HPA-114.
- Do not modify: `src/lib/game/content/maps/regions/village.ts`
  - Runtime village map content must stay unchanged.
- Do not modify: `src/lib/game/content/maps/regions/rooms.ts`
  - HPA-112 room/corridor manifest source of truth.
- Do not modify: `src/lib/game/content/maps/regions/route-scenes.ts`
  - HPA-112 route-scene manifest source of truth.
- Do not modify: `src/lib/game/content/maps/regions/decor-roles.ts`
  - HPA-112 decor-role manifest source of truth.

## Task 1: Wire Soft-Maze Village Fixtures To Manifests

**Files:**
- Modify: `src/lib/game/content/maps/regions/soft-maze.test.ts`

- [ ] **Step 1: Confirm the current focused suite passes before changing tests**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts
```

Expected: PASS with `1 passed` test file and `3 passed` tests. This is a
test-authoring cleanup task; current runtime map data already satisfies the
soft-maze invariants.

- [ ] **Step 2: Import the village manifest types and data**

In `src/lib/game/content/maps/regions/soft-maze.test.ts`, update the import
block from:

```ts
import { describe, expect, it } from 'vitest';
import { meadowEntryMap, type WorldMapDefinition } from '$lib/game/content/maps';
```

to:

```ts
import { describe, expect, it } from 'vitest';
import { meadowEntryMap, type WorldMapDefinition } from '$lib/game/content/maps';
import { type VillageCorridorId, type VillageRoomId, villageCorridors, villageRooms } from './rooms';
```

- [ ] **Step 3: Add manifest-backed room and corridor helpers**

After `type LaneSegment = { from: Pt; to: Pt };`, add:

```ts
type RoomRectSize = { width: number; height: number };

const villageRoomSizes: Record<VillageRoomId, RoomRectSize> = {
	'village-home-yard-room': { width: 420, height: 180 },
	'village-well-plaza-room': { width: 500, height: 420 },
	'village-market-yard-room': { width: 560, height: 300 },
	'village-north-residences-room': { width: 860, height: 390 },
	'village-shrine-garden-room': { width: 520, height: 320 },
	'village-east-gate-room': { width: 520, height: 280 }
};

const villageSoftMazeCorridorIds: readonly VillageCorridorId[] = [
	'village-home-to-plaza',
	'village-plaza-to-market',
	'village-plaza-to-shrine'
];

function routeToLaneSegments(route: readonly Pt[]): LaneSegment[] {
	return route.slice(0, -1).map((from, index) => ({ from, to: route[index + 1] }));
}
```

These helpers preserve the existing rectangular room-skip behavior while making
the ids come from the HPA-112 manifest. The selected corridor ids intentionally
exclude `village-east-gate-to-crossroads-road` because the preserved
`corridor-wall-*` dogleg is covered by broader route and connectivity tests.

- [ ] **Step 4: Replace local room bounds with manifest-derived room bounds**

Inside `describe('village maze — compact hamlet invariants', () => { ... })`,
replace the existing `villageRoomBounds` constant:

```ts
const villageRoomBounds: Rect[] = [
	{ id: 'village-plaza-room', x: 1_000, y: 5_160, width: 500, height: 420 },
	{ id: 'village-home-yard', x: 700, y: 5_585, width: 420, height: 180 },
	{ id: 'village-blacksmith-yard', x: 400, y: 5_280, width: 360, height: 300 },
	{ id: 'village-north-courtyard', x: 1_120, y: 4_690, width: 620, height: 200 },
	{ id: 'village-guild-forecourt', x: 1_460, y: 5_040, width: 360, height: 180 },
	{ id: 'village-shrine-garden', x: 1_200, y: 5_660, width: 520, height: 320 },
	{ id: 'village-hidden-pocket', x: 1_520, y: 5_620, width: 300, height: 260 },
	{ id: 'village-gate-road', x: 1_760, y: 4_440, width: 520, height: 120 }
];
```

with:

```ts
const villageRoomBounds: Rect[] = villageRooms.map((room) => {
	const size = villageRoomSizes[room.id];
	return {
		id: room.id,
		x: room.center.x,
		y: room.center.y,
		width: size.width,
		height: size.height
	};
});
```

- [ ] **Step 5: Replace local lane segments with manifest-derived lane segments**

Still inside `describe('village maze — compact hamlet invariants', () => { ... })`,
replace the existing `villageLanes` constant:

```ts
const villageLanes: Array<{ from: Pt; to: Pt }> = [
	// South lane: home yard → plaza (narrow vertical corridor)
	{ from: { x: 780, y: 5_490 }, to: { x: 800, y: 5_390 } },
	// Market lane: plaza → blacksmith yard (bounded by market walls)
	{ from: { x: 930, y: 5_045 }, to: { x: 650, y: 5_045 } },
	// Shrine path: plaza → shrine garden (narrow vertical corridor)
	{ from: { x: 1_100, y: 5_370 }, to: { x: 1_100, y: 5_500 } }
];
```

with:

```ts
const villageLanes: LaneSegment[] = villageCorridors
	.filter((corridor) => villageSoftMazeCorridorIds.includes(corridor.id))
	.flatMap((corridor) => routeToLaneSegments(corridor.route));
```

Keep the existing lane-cap history comment and `keeps village corridor width ≤
360px outside rooms` assertion. If this exact manifest-derived geometry exposes
a real width regression, report `DONE_WITH_CONCERNS` instead of changing
runtime map data.

- [ ] **Step 6: Run the soft-maze test**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts
```

Expected: PASS with `1 passed` test file and `3 passed` tests.

- [ ] **Step 7: Commit the soft-maze manifest wiring**

Run:

```sh
rtk git add src/lib/game/content/maps/regions/soft-maze.test.ts
rtk git commit -m "test: use village manifests in soft-maze checks"
```

Expected: one commit containing only `src/lib/game/content/maps/regions/soft-maze.test.ts`.

## Task 2: Lock Side-Pocket Reward IDs

**Files:**
- Modify: `src/lib/game/content/maps/regions/village-layout.test.ts`

- [ ] **Step 1: Add expected village cache ids**

In `src/lib/game/content/maps/regions/village-layout.test.ts`, add this constant
after `expectedSpawnToCrossroadsBeatIds` and before `expectedVillageDecorRoles`:

```ts
const expectedVillageCacheIds = ['village-market-cache', 'village-shrine-cache'];
```

- [ ] **Step 2: Add the explicit side-pocket reward id assertion**

Inside `describe('side rewards are off the main route', () => { ... })`, add
this test before the existing `it.each(villageCaches)` distance test:

```ts
it('uses the authored side-pocket reward ids', () => {
	expect(villageCaches.map((cache) => cache.id).sort()).toEqual(expectedVillageCacheIds);
});
```

The full section should read:

```ts
describe('side rewards are off the main route', () => {
	const villageCaches = (map.pickups ?? []).filter((p) => p.id.startsWith('village-'));

	it('uses the authored side-pocket reward ids', () => {
		expect(villageCaches.map((cache) => cache.id).sort()).toEqual(expectedVillageCacheIds);
	});

	it.each(villageCaches)('$id is at least 160px from the main route', (cache) => {
		expect(
			distancePointToPolyline({ x: cache.x, y: cache.y }, villageMainRoute)
		).toBeGreaterThanOrEqual(160);
	});
});
```

- [ ] **Step 3: Run the village layout test**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected: PASS with `1 passed` test file and `17 passed` tests.

- [ ] **Step 4: Commit the side-pocket reward id guard**

Run:

```sh
rtk git add src/lib/game/content/maps/regions/village-layout.test.ts
rtk git commit -m "test: lock sundrop side-pocket reward ids"
```

Expected: one commit containing only `src/lib/game/content/maps/regions/village-layout.test.ts`.

## Task 3: Verify HPA-114 Scope

**Files:**
- Verify: `src/lib/game/content/maps/regions/soft-maze.test.ts`
- Verify: `src/lib/game/content/maps/regions/village-layout.test.ts`
- Verify unchanged: `src/lib/game/content/maps.test.ts`
- Verify unchanged: `src/lib/game/content/maps/regions/village.ts`
- Verify unchanged: `src/lib/game/content/maps/regions/rooms.ts`
- Verify unchanged: `src/lib/game/content/maps/regions/route-scenes.ts`
- Verify unchanged: `src/lib/game/content/maps/regions/decor-roles.ts`

- [ ] **Step 1: Run the HPA-114 focused verification command**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts src/lib/game/content/maps.test.ts
```

Expected: PASS with `3 passed` test files.

- [ ] **Step 2: Confirm implementation diff scope**

Run:

```sh
rtk git diff --name-status HEAD~2..HEAD
```

Expected output:

```text
M	src/lib/game/content/maps/regions/soft-maze.test.ts
M	src/lib/game/content/maps/regions/village-layout.test.ts
```

- [ ] **Step 3: Confirm runtime, manifest, and map validity files are untouched**

Run:

```sh
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/rooms.ts src/lib/game/content/maps/regions/route-scenes.ts src/lib/game/content/maps/regions/decor-roles.ts src/lib/game/content/maps.test.ts
```

Expected: no output.

- [ ] **Step 4: Confirm removed ids are not kept alive in the changed tests**

Run:

```sh
rtk rg -n "village-lane-(west|north|east|south)-ring|village-lane-[wes]-spoke|\\b(vp|vn|vw|ve|vs)-" src/lib/game/content/maps/regions/soft-maze.test.ts src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected: only the explicit banned-id set and banned-prefix regex already present in `village-layout.test.ts`; no soft-maze matches.

- [ ] **Step 5: Final status check**

Run:

```sh
rtk git status --short --branch
```

Expected: clean branch after the HPA-114 test commits.
