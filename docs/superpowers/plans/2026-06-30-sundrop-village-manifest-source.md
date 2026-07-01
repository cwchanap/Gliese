# Sundrop Village Manifest Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create HPA-112 Sundrop Village authoring manifests for rooms, route-scene beats, and decor roles, then make the focused village tests consume those manifests.

**Architecture:** Keep gameplay map data in `village.ts` unchanged. Add three pure TypeScript manifest modules under `src/lib/game/content/maps/regions/` and update `village-layout.test.ts` so future layout/decor assertions read from those modules instead of local test constants.

**Tech Stack:** TypeScript content manifests, Vitest server tests, existing Svelte/Vite alias resolution.

---

## File Structure

- Create: `src/lib/game/content/maps/regions/rooms.ts`
  - Responsibility: exported deterministic village room, corridor, and main-route manifests.
- Create: `src/lib/game/content/maps/regions/route-scenes.ts`
  - Responsibility: exported `spawn-to-crossroads` route-scene beat manifest.
- Create: `src/lib/game/content/maps/regions/decor-roles.ts`
  - Responsibility: exported village decor id to role manifest.
- Modify: `src/lib/game/content/maps/regions/village-layout.test.ts`
  - Responsibility: consume the new manifests and assert HPA-112 manifest hygiene.

## Task 1: Add Manifest Modules And Migrate Village Layout Tests

**Files:**
- Create: `src/lib/game/content/maps/regions/rooms.ts`
- Create: `src/lib/game/content/maps/regions/route-scenes.ts`
- Create: `src/lib/game/content/maps/regions/decor-roles.ts`
- Modify: `src/lib/game/content/maps/regions/village-layout.test.ts`

- [ ] **Step 1: Update the test to import manifests and add hygiene assertions**

Modify the import block at the top of `src/lib/game/content/maps/regions/village-layout.test.ts` to include the new manifest imports:

```ts
import { describe, expect, it } from 'vitest';
import { meadowEntryMap, type WorldMapDefinition } from '$lib/game/content/maps';
import { villageDecorRoles } from './decor-roles';
import { villageCorridors, villageMainRoute, villageRooms } from './rooms';
import { spawnToCrossroadsRouteScene } from './route-scenes';
```

Delete the existing local `villageRooms`, `villageMainRoute`, and `villageDecorRoles` constants from `village-layout.test.ts`.

Add these manifest expectation constants after `distanceToRect(...)` and before `describe('village deterministic layout', ...)`:

```ts
const expectedVillageRoomIds = [
	'village-home-yard-room',
	'village-well-plaza-room',
	'village-market-yard-room',
	'village-north-residences-room',
	'village-shrine-garden-room',
	'village-east-gate-room'
];

const expectedVillageCorridorIds = [
	'village-home-to-plaza',
	'village-plaza-to-market',
	'village-plaza-to-north-residences',
	'village-plaza-to-shrine',
	'village-plaza-to-east-gate',
	'village-east-gate-to-crossroads-road'
];

const expectedSpawnToCrossroadsBeatIds = [
	'home-yard-origin',
	'well-plaza-choice',
	'east-gate-threshold',
	'crossroads-road-breadcrumb'
];

const expectedVillageDecorRoles = [
	'anchor',
	'crossroads-breadcrumb',
	'dead-end-frame',
	'exit-threshold',
	'field-background',
	'guild-threshold',
	'hide-reward',
	'market-identity',
	'market-threshold',
	'north-threshold',
	'plaza-frame',
	'shrine-symbol'
];

const removedVillageManifestIds = new Set([
	'village-lane-west-ring',
	'village-lane-north-ring',
	'village-lane-east-ring',
	'village-lane-south-ring',
	'village-lane-w-spoke',
	'village-lane-e-spoke',
	'village-lane-s-spoke'
]);

function collectVillageManifestIds(): string[] {
	return [
		...villageRooms.map((room) => room.id),
		...villageCorridors.flatMap((corridor) => [
			corridor.id,
			corridor.fromRoomId,
			corridor.toRoomId
		]),
		spawnToCrossroadsRouteScene.id,
		...spawnToCrossroadsRouteScene.beats.flatMap((beat) => [
			beat.id,
			beat.roomId || '',
			...(beat.boundaryIds || [])
		]),
		...Object.keys(villageDecorRoles)
	].filter((id) => id.length > 0);
}
```

Add this test block as the first child inside `describe('village deterministic layout', () => { ... })`, before the existing `describe('named rooms exist', ...)` block:

```ts
	describe('authoring manifests', () => {
		it('exports the deterministic HPA-112 room ids', () => {
			expect(villageRooms.map((room) => room.id)).toEqual(expectedVillageRoomIds);
		});

		it('exports the deterministic HPA-112 corridor ids', () => {
			expect(villageCorridors.map((corridor) => corridor.id)).toEqual(expectedVillageCorridorIds);
		});

		it('exports the spawn-to-crossroads route-scene beats', () => {
			expect(spawnToCrossroadsRouteScene.id).toBe('spawn-to-crossroads');
			expect(spawnToCrossroadsRouteScene.beats.map((beat) => beat.id)).toEqual(
				expectedSpawnToCrossroadsBeatIds
			);
		});

		it('keeps decor roles inside the HPA-112 role set', () => {
			expect([...new Set(Object.values(villageDecorRoles))].sort()).toEqual(
				expectedVillageDecorRoles
			);
		});

		it('does not reference removed micro-hedges or ring-spoke ids', () => {
			const manifestIds = collectVillageManifestIds();
			expect(manifestIds.filter((id) => /^(vp|vn|vw|ve|vs)-/.test(id))).toEqual([]);
			expect(manifestIds.filter((id) => removedVillageManifestIds.has(id))).toEqual([]);
		});
	});
```

- [ ] **Step 2: Run the test and verify it fails because manifest modules do not exist yet**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected: FAIL with an import resolution error for `./decor-roles`, `./rooms`, or `./route-scenes`.

- [ ] **Step 3: Create the decor role manifest**

Create `src/lib/game/content/maps/regions/decor-roles.ts`:

```ts
export const villageDecorRoles = {
	'village-plaza-fountain': 'anchor',
	'village-hanging-lantern': 'plaza-frame',
	'village-plaza-flowers-west': 'plaza-frame',
	'village-plaza-flowers-east': 'plaza-frame',
	'village-market-stall': 'market-identity',
	'village-market-banner': 'market-threshold',
	'village-field-scarecrow': 'field-background',
	'village-blacksmith-topiary': 'dead-end-frame',
	'village-north-lantern-west': 'north-threshold',
	'village-north-lantern-east': 'guild-threshold',
	'village-shrine-offering': 'shrine-symbol',
	'village-stone-lantern': 'shrine-symbol',
	'village-shrine-maple': 'hide-reward',
	'village-gate-arch': 'exit-threshold',
	'village-gate-lantern-a': 'exit-threshold',
	'village-gate-lantern-b': 'exit-threshold',
	'village-corridor-waymarker': 'crossroads-breadcrumb'
} as const;

export type VillageDecorId = keyof typeof villageDecorRoles;
export type VillageDecorRole = (typeof villageDecorRoles)[VillageDecorId];
```

- [ ] **Step 4: Create the room and corridor manifest**

Create `src/lib/game/content/maps/regions/rooms.ts`:

```ts
export type VillagePoint = { x: number; y: number };

export type VillageRoomId =
	| 'village-home-yard-room'
	| 'village-well-plaza-room'
	| 'village-market-yard-room'
	| 'village-north-residences-room'
	| 'village-shrine-garden-room'
	| 'village-east-gate-room';

export type VillageRoomDefinition = {
	id: VillageRoomId;
	center: VillagePoint;
	radius: number;
};

export const villageRooms: readonly VillageRoomDefinition[] = [
	{ id: 'village-home-yard-room', center: { x: 700, y: 5_585 }, radius: 260 },
	{ id: 'village-well-plaza-room', center: { x: 1_000, y: 5_160 }, radius: 320 },
	{ id: 'village-market-yard-room', center: { x: 650, y: 5_045 }, radius: 320 },
	{ id: 'village-north-residences-room', center: { x: 1_050, y: 4_860 }, radius: 420 },
	{ id: 'village-shrine-garden-room', center: { x: 1_200, y: 5_660 }, radius: 340 },
	{ id: 'village-east-gate-room', center: { x: 1_660, y: 4_430 }, radius: 260 }
];

export type VillageCorridorId =
	| 'village-home-to-plaza'
	| 'village-plaza-to-market'
	| 'village-plaza-to-north-residences'
	| 'village-plaza-to-shrine'
	| 'village-plaza-to-east-gate'
	| 'village-east-gate-to-crossroads-road';

export type VillageCorridorEndpointId = VillageRoomId | 'crossroads-road';

export type VillageCorridorDefinition = {
	id: VillageCorridorId;
	fromRoomId: VillageCorridorEndpointId;
	toRoomId: VillageCorridorEndpointId;
	route: readonly VillagePoint[];
};

export const villageCorridors: readonly VillageCorridorDefinition[] = [
	{
		id: 'village-home-to-plaza',
		fromRoomId: 'village-home-yard-room',
		toRoomId: 'village-well-plaza-room',
		route: [
			{ x: 700, y: 5_600 },
			{ x: 780, y: 5_390 },
			{ x: 1_000, y: 5_160 }
		]
	},
	{
		id: 'village-plaza-to-market',
		fromRoomId: 'village-well-plaza-room',
		toRoomId: 'village-market-yard-room',
		route: [
			{ x: 1_000, y: 5_160 },
			{ x: 650, y: 5_045 }
		]
	},
	{
		id: 'village-plaza-to-north-residences',
		fromRoomId: 'village-well-plaza-room',
		toRoomId: 'village-north-residences-room',
		route: [
			{ x: 1_000, y: 5_160 },
			{ x: 1_050, y: 4_860 }
		]
	},
	{
		id: 'village-plaza-to-shrine',
		fromRoomId: 'village-well-plaza-room',
		toRoomId: 'village-shrine-garden-room',
		route: [
			{ x: 1_000, y: 5_160 },
			{ x: 1_100, y: 5_420 },
			{ x: 1_200, y: 5_660 }
		]
	},
	{
		id: 'village-plaza-to-east-gate',
		fromRoomId: 'village-well-plaza-room',
		toRoomId: 'village-east-gate-room',
		route: [
			{ x: 1_000, y: 5_160 },
			{ x: 1_460, y: 4_900 },
			{ x: 1_660, y: 4_430 }
		]
	},
	{
		id: 'village-east-gate-to-crossroads-road',
		fromRoomId: 'village-east-gate-room',
		toRoomId: 'crossroads-road',
		route: [
			{ x: 1_660, y: 4_430 },
			{ x: 2_120, y: 4_440 }
		]
	}
];

export const villageMainRoute: readonly VillagePoint[] = [
	{ x: 700, y: 5_600 },
	{ x: 780, y: 5_390 },
	{ x: 1_000, y: 5_160 },
	{ x: 1_460, y: 4_900 },
	{ x: 1_660, y: 4_430 },
	{ x: 2_120, y: 4_440 }
];
```

- [ ] **Step 5: Create the route-scene manifest**

Create `src/lib/game/content/maps/regions/route-scenes.ts`:

```ts
import type { VillagePoint, VillageRoomId } from './rooms';

export type VillageRouteSceneId = 'spawn-to-crossroads';

export type VillageRouteSceneBeatId =
	| 'home-yard-origin'
	| 'well-plaza-choice'
	| 'east-gate-threshold'
	| 'crossroads-road-breadcrumb';

export type VillageRouteSceneBeat = {
	id: VillageRouteSceneBeatId;
	point: VillagePoint;
	roomId?: VillageRoomId;
	boundaryIds?: readonly string[];
};

export type VillageRouteSceneDefinition = {
	id: VillageRouteSceneId;
	beats: readonly VillageRouteSceneBeat[];
};

export const spawnToCrossroadsRouteScene: VillageRouteSceneDefinition = {
	id: 'spawn-to-crossroads',
	beats: [
		{
			id: 'home-yard-origin',
			roomId: 'village-home-yard-room',
			point: { x: 700, y: 5_600 },
			boundaryIds: ['village-home-yard-west-fence', 'village-home-yard-east-fence']
		},
		{
			id: 'well-plaza-choice',
			roomId: 'village-well-plaza-room',
			point: { x: 1_000, y: 5_160 },
			boundaryIds: ['village-plaza-fountain-collision']
		},
		{
			id: 'east-gate-threshold',
			roomId: 'village-east-gate-room',
			point: { x: 1_660, y: 4_430 },
			boundaryIds: ['village-gate-arch', 'village-gate-lantern-a-collision']
		},
		{
			id: 'crossroads-road-breadcrumb',
			point: { x: 2_120, y: 4_440 },
			boundaryIds: ['corridor-wall-2a', 'corridor-wall-10b', 'village-corridor-waymarker-collision']
		}
	]
};

export const villageRouteScenes: readonly VillageRouteSceneDefinition[] = [spawnToCrossroadsRouteScene];
```

- [ ] **Step 6: Run the focused village-layout test**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected: PASS with the `village deterministic layout` suite passing.

- [ ] **Step 7: Commit the manifest source change**

Run:

```sh
rtk git add src/lib/game/content/maps/regions/rooms.ts src/lib/game/content/maps/regions/route-scenes.ts src/lib/game/content/maps/regions/decor-roles.ts src/lib/game/content/maps/regions/village-layout.test.ts
rtk git commit -m "feat: add sundrop village manifests"
```

Expected: one commit containing only the three new manifest modules and `village-layout.test.ts`.

## Task 2: Verify Manifest Scope And Broader Map Tests

**Files:**
- Verify: `src/lib/game/content/maps/regions/rooms.ts`
- Verify: `src/lib/game/content/maps/regions/route-scenes.ts`
- Verify: `src/lib/game/content/maps/regions/decor-roles.ts`
- Verify: `src/lib/game/content/maps/regions/village-layout.test.ts`

- [ ] **Step 1: Run the HPA-112 focused verification command**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts src/lib/game/content/maps.test.ts
```

Expected: PASS with `3 passed` test files.

- [ ] **Step 2: Confirm source scope is limited to HPA-112 files**

Run:

```sh
rtk git diff --name-status HEAD~1..HEAD
```

Expected output contains only:

```text
A	src/lib/game/content/maps/regions/decor-roles.ts
A	src/lib/game/content/maps/regions/rooms.ts
A	src/lib/game/content/maps/regions/route-scenes.ts
M	src/lib/game/content/maps/regions/village-layout.test.ts
```

- [ ] **Step 3: Confirm runtime village data is untouched**

Run:

```sh
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts
```

Expected: no output.

- [ ] **Step 4: Final status check**

Run:

```sh
rtk git status --short --branch
```

Expected: the branch is clean after the manifest source commit.
