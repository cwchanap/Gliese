# Restrictive City And Ruins Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Gliese's outdoor maps to `200x200` tiles and reshape them into a readable city district loop plus puzzle-ready ruin shells.

**Architecture:** Keep map authoring in `src/lib/game/content/maps.ts`. Add small map metadata for ground patches, blockers, transition marker presentation, and route combat bounds, then adapt `WorldScene` to render and collide with those records through the existing rectangle helpers. Preserve the Svelte HUD bridge, save schema, quest flow, shop flow, dialogue flow, and compact interiors.

**Tech Stack:** TypeScript, Phaser 4, Svelte 5, Vite, Vitest, Playwright, Bun.

---

## File Structure

- Modify `src/lib/game/content/maps.ts`: extend map content types; author the `200x200` outdoor city and ruin layouts; keep compact interiors unchanged.
- Modify `src/lib/game/phaser/scenes/WorldScene.ts`: render ground patches, static blockers, stair markers, and route combat bounds; reuse existing transition and collision flows.
- Modify `src/lib/game/content/maps.test.ts`: update map-size, bounds, route, blocker, combat-bound, and stair-marker assertions.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`: add synthetic scene tests for new rendering/collision primitives and update camera, transition, and route-collision expectations.
- Do not modify Svelte files unless implementation discovers a HUD-only display issue. If Svelte changes occur, run the Svelte autofixer before completion.

## Task 1: Add Map Metadata Types

**Files:**
- Modify: `src/lib/game/content/maps.ts`
- Test: `src/lib/game/content/maps.test.ts`

- [ ] **Step 1: Add a failing type-contract test**

Add this import to `src/lib/game/content/maps.test.ts`:

```ts
import type { WorldMapDefinition } from '$lib/game/content/maps';
```

Add this test near the top of the `describe('opening map content', () => { ... })` block:

```ts
it('supports authored ground patches, blockers, stair markers, and route combat bounds', () => {
	const modelTestMap: WorldMapDefinition = {
		id: 'model-test',
		width: 200,
		height: 200,
		spawnDirection: 'down',
		spawn: { x: 320, y: 320 },
		transitions: [
			{
				id: 'model-test-stair',
				x: 640,
				y: 640,
				toMapId: 'hero-house',
				marker: 'stair'
			}
		],
		groundPatches: [
			{
				id: 'model-test-path',
				x: 320,
				y: 320,
				width: 320,
				height: 96,
				tile: 'pathTile'
			}
		],
		blockers: [
			{
				id: 'model-test-wall',
				x: 480,
				y: 320,
				width: 64,
				height: 320,
				kind: 'city-wall'
			},
			{
				id: 'model-test-future-gate',
				x: 640,
				y: 320,
				width: 96,
				height: 64,
				kind: 'future-gate',
				label: 'Future switch gate'
			}
		],
		combatBounds: [
			{
				id: 'model-test-combat-pocket',
				x: 800,
				y: 320,
				width: 480,
				height: 320,
				encounterIds: ['model-test-slime'],
				aggroRadius: 240,
				leashRadius: 420
			}
		]
	};

	expect(modelTestMap.transitions[0].marker).toBe('stair');
	expect(modelTestMap.groundPatches?.[0]).toMatchObject({
		id: 'model-test-path',
		tile: 'pathTile'
	});
	expect(modelTestMap.blockers?.map((blocker) => blocker.kind)).toEqual([
		'city-wall',
		'future-gate'
	]);
	expect(modelTestMap.combatBounds?.[0].encounterIds).toEqual(['model-test-slime']);
});
```

- [ ] **Step 2: Run the test and verify the type failure**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: FAIL with TypeScript errors that `marker`, `groundPatches`, `blockers`, or `combatBounds` are not known map properties.

- [ ] **Step 3: Extend the map content types**

In `src/lib/game/content/maps.ts`, update the asset import:

```ts
import type {
	ForestDressingFrameName,
	NpcFrameName,
	StarterPackFrameName
} from '$lib/game/content/assets';
```

Add these types after `export interface MapRect`:

```ts
export type MapTransitionMarker = 'doorway' | 'stair';

export type MapGroundTile = Extract<
	StarterPackFrameName,
	'grassTile' | 'pathTile' | 'ruinsFloorTile' | 'stoneWallTile'
>;

export interface MapGroundPatch extends MapRect {
	tile: MapGroundTile;
}

export type MapBlockerKind = 'city-wall' | 'ruin-wall' | 'future-gate';

export interface MapBlocker extends MapRect {
	kind: MapBlockerKind;
	label?: string;
}

export interface MapCombatBounds extends MapRect {
	encounterIds: string[];
	aggroRadius: number;
	leashRadius: number;
}
```

Add `marker` to `MapTransition`:

```ts
	marker?: MapTransitionMarker;
```

Add the new optional arrays to `WorldMapDefinition`:

```ts
	groundPatches?: MapGroundPatch[];
	blockers?: MapBlocker[];
	combatBounds?: MapCombatBounds[];
```

- [ ] **Step 4: Run the map content test**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: PASS for the new model test. Existing map-content assertions may still pass because no production map values changed in this task.

- [ ] **Step 5: Commit**

```sh
git add src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts
git commit -m "test: define restrictive map metadata contract"
```

## Task 2: Add Scene Support For Patches, Blockers, Stairs, And Combat Bounds

**Files:**
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Add failing synthetic scene tests**

In `src/lib/game/phaser/scenes/scenes.test.ts`, add this helper inside the `describe('WorldScene', () => { ... })` block:

```ts
async function registerSceneSupportTestMap() {
	const { maps } = await import('$lib/game/content/maps');

	maps['scene-support-test'] = {
		id: 'scene-support-test',
		width: 20,
		height: 20,
		spawnDirection: 'right',
		spawn: { x: 96, y: 96 },
		transitions: [
			{
				id: 'scene-support-stair',
				x: 320,
				y: 96,
				toMapId: 'hero-house',
				marker: 'stair',
				arrival: { x: 256, y: 224, facing: 'up' }
			}
		],
		groundPatches: [
			{ id: 'scene-support-path', x: 96, y: 96, width: 160, height: 96, tile: 'pathTile' },
			{ id: 'scene-support-stone', x: 320, y: 96, width: 96, height: 96, tile: 'stoneWallTile' }
		],
		blockers: [
			{ id: 'scene-support-blocker', x: 160, y: 96, width: 32, height: 160, kind: 'city-wall' },
			{
				id: 'scene-support-gate',
				x: 224,
				y: 224,
				width: 96,
				height: 32,
				kind: 'future-gate',
				label: 'Future gate'
			}
		],
		combatBounds: [
			{
				id: 'scene-support-combat',
				x: 320,
				y: 320,
				width: 320,
				height: 320,
				encounterIds: ['scene-support-slime'],
				aggroRadius: 120,
				leashRadius: 180
			}
		],
		encounters: [{ id: 'scene-support-slime', x: 320, y: 320, enemyId: 'slime-scout' }]
	};
}
```

Add these tests near the existing tilemap/rendering tests:

```ts
it('renders authored ground patches and stair markers from map metadata', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	await registerSceneSupportTestMap();

	scene.create({ mapId: 'scene-support-test' });

	const tilemapCall = vi.mocked(scene.make.tilemap).mock.calls[0]![0]!;
	const tilemapData = tilemapCall.data as number[][];
	expect(tilemapData[3][3]).toBe(1);
	expect(tilemapData[3][10]).toBe(3);
	expect(scene.add.rectangle).toHaveBeenCalledWith(320, 106, 44, 8, 0x4b5563, 0.95);
	expect(scene.add.rectangle).toHaveBeenCalledWith(320, 96, 36, 8, 0x9ca3af, 0.95);
	expect(scene.add.rectangle).toHaveBeenCalledWith(320, 86, 28, 8, 0xd1d5db, 0.95);
});

it('renders and blocks authored map blockers', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	await registerSceneSupportTestMap();

	scene.create({ mapId: 'scene-support-test' });
	Object.assign(phaserState.playerMarker, { x: 96, y: 96 });
	phaserState.cursorKeys.right.isDown = true;

	scene.update(0, 250);

	expect(scene.add.rectangle).toHaveBeenCalledWith(160, 96, 32, 160, 0x4b5563, 0.92);
	expect(scene.add.rectangle).toHaveBeenCalledWith(224, 224, 96, 32, 0x7c3aed, 0.82);
	expect(phaserState.playerMarker.x).toBe(96);
	expect(phaserState.playerMarker.y).toBe(96);
});

it('leashes enemies with route combat bounds instead of a single forest zone', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	await registerSceneSupportTestMap();

	scene.create({ mapId: 'scene-support-test' });
	Object.assign(phaserState.playerMarker, { x: 640, y: 640 });

	scene.update(0, 250);

	expect(phaserState.enemyMarker.x).toBeLessThan(340);
	expect(phaserState.enemyMarker.y).toBeLessThan(340);
});
```

- [ ] **Step 2: Run scene tests and verify failures**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL because ground patches are ignored, blockers are not rendered/collidable, stair markers still use doorway images, and `combatBounds` is not read.

- [ ] **Step 3: Implement ground patch rendering**

In `WorldScene.ts`, import the new types:

```ts
	type MapBlocker,
	type MapCombatBounds,
	type MapGroundPatch,
	type MapRect,
```

Change `buildGroundTileData` so authored patches override generated base tiles:

```ts
	private buildGroundTileData(map: WorldMapDefinition) {
		const baseTile = WorldScene.terrainTileIndexes[getGroundFrameName(map.id)];
		const pathTile = WorldScene.terrainTileIndexes.pathTile;
		const stoneTile = WorldScene.terrainTileIndexes.stoneWallTile;
		const centerRow = Math.floor(map.height / 2);

		return Array.from({ length: map.height }, (_, row) =>
			Array.from({ length: map.width }, (_, column) => {
				const patchTile = this.findGroundPatchTile(map, column, row);

				if (patchTile) {
					return WorldScene.terrainTileIndexes[patchTile];
				}

				if (map.id === openingMapId && Math.abs(row - centerRow) <= 1) {
					return pathTile;
				}

				if (
					map.id !== openingMapId &&
					(row === 0 || column === 0 || row === map.height - 1 || column === map.width - 1)
				) {
					return stoneTile;
				}

				return baseTile;
			})
		);
	}

	private findGroundPatchTile(
		map: WorldMapDefinition,
		column: number,
		row: number
	): MapGroundPatch['tile'] | undefined {
		const patches = map.groundPatches ?? [];
		const x = (column + 0.5) * WorldScene.tileSize;
		const y = (row + 0.5) * WorldScene.tileSize;

		for (let index = patches.length - 1; index >= 0; index -= 1) {
			const patch = patches[index]!;
			if (this.isPointInsideGenericMapRect(x, y, patch)) {
				return patch.tile;
			}
		}

		return undefined;
	}
```

- [ ] **Step 4: Implement blocker rendering and collision**

Call `renderBlockers(map)` after `renderFences(map)` and before `renderLandmarks(map)`:

```ts
		this.renderFences(map);
		this.renderBlockers(map);
		this.renderLandmarks(map);
```

Add rendering helpers near `renderFences`:

```ts
	private renderBlockers(map: WorldMapDefinition) {
		for (const blocker of map.blockers ?? []) {
			const fill = this.getBlockerFill(blocker);
			this.add.rectangle(blocker.x, blocker.y, blocker.width, blocker.height, fill.color, fill.alpha);
		}
	}

	private getBlockerFill(blocker: MapBlocker) {
		if (blocker.kind === 'future-gate') {
			return { color: 0x7c3aed, alpha: 0.82 };
		}

		if (blocker.kind === 'ruin-wall') {
			return { color: 0x59616f, alpha: 0.92 };
		}

		return { color: 0x4b5563, alpha: 0.92 };
	}
```

Add blocker collision into `isPlayerMovementBlocked`:

```ts
			this.isPlayerMovementBlockedByFence(currentX, currentY, targetX, targetY) ||
			this.isPlayerMovementBlockedByBlocker(currentX, currentY, targetX, targetY) ||
			this.isPlayerMovementBlockedByForestDecor(currentX, currentY, targetX, targetY)
```

Add the collision helper:

```ts
	private isPlayerMovementBlockedByBlocker(
		currentX: number,
		currentY: number,
		targetX: number,
		targetY: number
	): boolean {
		const map = this.resolveMap(this.mapId);

		return (map.blockers ?? []).some((blocker) => {
			const bounds = this.getMapRectBounds(blocker);

			return this.isMovementBlockedByStrictRect(
				currentX,
				currentY,
				targetX,
				targetY,
				bounds,
				WorldScene.playerRadius
			);
		});
	}
```

- [ ] **Step 5: Implement stair transition markers**

Replace `renderTransitions` with:

```ts
	private renderTransitions(map: WorldMapDefinition) {
		for (const transition of map.transitions) {
			if (transition.showMarker === false) {
				continue;
			}

			if (transition.marker === 'stair') {
				this.renderStairTransition(transition.x, transition.y);
				continue;
			}

			this.add
				.image(transition.x, transition.y, starterPackAsset.key, 'doorwayTile')
				.setDisplaySize(40, 40);
		}
	}

	private renderStairTransition(x: number, y: number) {
		this.add.rectangle(x, y + 10, 44, 8, 0x4b5563, 0.95);
		this.add.rectangle(x, y, 36, 8, 0x9ca3af, 0.95);
		this.add.rectangle(x, y - 10, 28, 8, 0xd1d5db, 0.95);
	}
```

- [ ] **Step 6: Implement generic rect lookup and route combat bounds**

Change `getMapRectBounds` to accept the new rect types:

```ts
	private getMapRectBounds(
		rect: MapFenceSegment | MapForestDecor | MapForestZone | MapBlocker | MapCombatBounds
	): LandmarkCollisionBounds {
```

Add the generic point helper:

```ts
	private isPointInsideGenericMapRect(x: number, y: number, rect: MapRect, padding = 0): boolean {
		const left = rect.x - rect.width / 2;
		const right = rect.x + rect.width / 2;
		const top = rect.y - rect.height / 2;
		const bottom = rect.y + rect.height / 2;

		return x >= left - padding && x <= right + padding && y >= top - padding && y <= bottom + padding;
	}
```

Change `isPointInsideMapRect` and `clampPointToMapRect` to accept `MapRect`:

```ts
	private isPointInsideMapRect(x: number, y: number, rect: MapRect, padding = 0): boolean {
```

```ts
	private clampPointToMapRect(
		x: number,
		y: number,
		rect: MapRect,
		padding = 0
	): { x: number; y: number } {
```

Add a combat-bound resolver:

```ts
	private findCombatBoundsForEnemy(
		map: WorldMapDefinition,
		enemy: EnemyInstance
	): MapCombatBounds | undefined {
		return (map.combatBounds ?? []).find((bounds) => bounds.encounterIds.includes(enemy.id));
	}
```

Replace `resolveEnemyMovementTarget` with:

```ts
	private resolveEnemyMovementTarget(enemy: EnemyInstance): { x: number; y: number } | undefined {
		if (!this.player) {
			return undefined;
		}

		const map = this.resolveMap(this.mapId);
		const combatBounds = this.findCombatBoundsForEnemy(map, enemy) ?? map.forestZone;

		if (!combatBounds || enemy.definition.id !== 'slime-scout') {
			enemy.movementMode = 'chase';
			return { x: this.player.x, y: this.player.y };
		}

		const distanceToPlayer = Phaser.Math.Distance.Between(
			this.player.x,
			this.player.y,
			enemy.x,
			enemy.y
		);
		const playerDistanceFromHome = Phaser.Math.Distance.Between(
			this.player.x,
			this.player.y,
			enemy.homeX,
			enemy.homeY
		);
		const playerInsideBounds = this.isPointInsideMapRect(
			this.player.x,
			this.player.y,
			combatBounds,
			WorldScene.playerRadius
		);
		const playerWithinLeash =
			playerInsideBounds && playerDistanceFromHome <= combatBounds.leashRadius;
		const canAcquire = distanceToPlayer <= combatBounds.aggroRadius;
		const canContinueChase = enemy.movementMode === 'chase' && playerWithinLeash;

		if (playerWithinLeash && (canAcquire || canContinueChase)) {
			enemy.movementMode = 'chase';
			return { x: this.player.x, y: this.player.y };
		}

		if (Phaser.Math.Distance.Between(enemy.x, enemy.y, enemy.homeX, enemy.homeY) > 2) {
			enemy.movementMode = 'return';
			return { x: enemy.homeX, y: enemy.homeY };
		}

		enemy.movementMode = 'idle';
		return undefined;
	}
```

- [ ] **Step 7: Run scene tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS for the synthetic support tests and existing scene tests.

- [ ] **Step 8: Commit**

```sh
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat: support authored map blockers and stair markers"
```

## Task 3: Author The 200x200 City District Loop

**Files:**
- Modify: `src/lib/game/content/maps.ts`
- Test: `src/lib/game/content/maps.test.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Replace city map expectations with the new contract**

In `src/lib/game/content/maps.test.ts`, update the opening-map test to assert:

```ts
expect(meadowEntryMap.width).toBe(200);
expect(meadowEntryMap.height).toBe(200);
expect(meadowEntryMap.spawnDirection).toBe('down');
expect(meadowEntryMap.spawn).toEqual({ x: 640, y: 5_200 });
expect(meadowEntryMap.forestZone).toBeUndefined();
expect(meadowEntryMap.combatBounds?.map((bounds) => bounds.id)).toEqual([
	'city-west-combat-pocket',
	'city-center-combat-pocket',
	'city-east-combat-pocket'
]);
```

Add this city-specific assertion:

```ts
it('folds meadow combat into city route pockets instead of a separate forest arena', () => {
	expect(meadowEntryMap.forestZone).toBeUndefined();
	expect(meadowEntryMap.encounters).toEqual([
		{ id: 'meadow-slime-west', x: 3_200, y: 3_840, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-center', x: 4_128, y: 2_880, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-east', x: 5_120, y: 1_600, enemyId: 'slime-scout' }
	]);

	for (const bounds of meadowEntryMap.combatBounds ?? []) {
		expectRectInsideMap(bounds);
		for (const encounterId of bounds.encounterIds) {
			const encounter = meadowEntryMap.encounters?.find((candidate) => candidate.id === encounterId);
			expect(encounter).toBeDefined();
			expectPointInsideRect(encounter!, bounds);
		}
	}
});
```

- [ ] **Step 2: Run the map content test and verify it fails**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: FAIL because `meadow-entry` still has `80x80` dimensions, old coordinates, and `forestZone`.

- [ ] **Step 3: Update `meadowEntryMap` dimensions, spawn, buildings, transitions, and arrivals**

In `src/lib/game/content/maps.ts`, update these `meadowEntryMap` fields:

```ts
	width: 200,
	height: 200,
	spawnDirection: 'down',
	spawn: { x: 640, y: 5_200 },
```

Replace the `landmarks` coordinates with:

```ts
		{
			id: 'hero-house-exterior',
			x: 640,
			y: 5_088,
			width: 192,
			height: 174,
			labelKey: 'content.maps.landmarks.hero-house-exterior.label'
		},
		{
			id: 'guild-hall-exterior',
			x: 1_600,
			y: 4_256,
			width: 256,
			height: 228,
			labelKey: 'content.maps.landmarks.guild-hall-exterior.label'
		},
		{
			id: 'item-shop-exterior',
			x: 2_240,
			y: 4_960,
			width: 192,
			height: 200,
			labelKey: 'content.maps.landmarks.item-shop-exterior.label'
		},
		{
			id: 'villager-house-1-exterior',
			x: 960,
			y: 4_480,
			width: 160,
			height: 178,
			labelKey: 'content.maps.landmarks.villager-house-1-exterior.label'
		},
		{
			id: 'villager-house-2-exterior',
			x: 1_460,
			y: 5_440,
			width: 160,
			height: 178,
			labelKey: 'content.maps.landmarks.villager-house-2-exterior.label'
		},
		{
			id: 'villager-house-3-exterior',
			x: 2_800,
			y: 4_480,
			width: 160,
			height: 178,
			labelKey: 'content.maps.landmarks.villager-house-3-exterior.label'
		}
```

Replace `meadowEntryMap.transitions` with:

```ts
		{
			id: 'meadow-to-hero-house',
			x: 640,
			y: 5_168,
			toMapId: 'hero-house',
			showMarker: false,
			arrival: { x: 256, y: 224, facing: 'up' }
		},
		{
			id: 'meadow-to-guild-hall',
			x: 1_600,
			y: 4_352,
			toMapId: 'guild-hall',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-item-shop',
			x: 2_240,
			y: 5_040,
			toMapId: 'item-shop',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-1',
			x: 960,
			y: 4_552,
			toMapId: 'villager-house-1',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-2',
			x: 1_460,
			y: 5_512,
			toMapId: 'villager-house-2',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-3',
			x: 2_800,
			y: 4_552,
			toMapId: 'villager-house-3',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-ruins-threshold',
			x: 5_760,
			y: 960,
			toMapId: 'ruins-threshold',
			requiresClear: true,
			marker: 'stair',
			questRequirement: {
				questId: 'investigate-the-ruins',
				objectiveId: 'talk-to-guild-master'
			},
			arrival: { x: 512, y: 3_200, facing: 'right' }
		}
```

Update compact interior return arrivals:

```ts
heroHouseMap.transitions[0].arrival = { x: 640, y: 5_248, facing: 'down' };
guildHallMap.transitions[0].arrival = { x: 1_600, y: 4_432, facing: 'down' };
itemShopMap.transitions[0].arrival = { x: 2_240, y: 5_120, facing: 'down' };
villagerHouse1Map.transitions[0].arrival = { x: 960, y: 4_632, facing: 'down' };
villagerHouse2Map.transitions[0].arrival = { x: 1_460, y: 5_592, facing: 'down' };
villagerHouse3Map.transitions[0].arrival = { x: 2_800, y: 4_632, facing: 'down' };
```

Apply those values directly inside each existing interior map definition rather than assigning after declaration.

- [ ] **Step 4: Add city ground patches, blockers, route combat bounds, and encounters**

Remove `forestZone` from `meadowEntryMap`.

Replace `fences`, `forestDecor`, and `encounters`, then add `groundPatches`, `blockers`, and `combatBounds`:

```ts
	groundPatches: [
		{ id: 'city-loop-south-road', x: 1_650, y: 5_200, width: 2_300, height: 160, tile: 'pathTile' },
		{ id: 'city-loop-west-road', x: 640, y: 4_640, width: 160, height: 1_280, tile: 'pathTile' },
		{ id: 'city-loop-north-road', x: 1_760, y: 4_256, width: 2_560, height: 160, tile: 'pathTile' },
		{ id: 'city-loop-east-road', x: 2_880, y: 4_160, width: 160, height: 1_280, tile: 'pathTile' },
		{ id: 'city-outskirts-road', x: 4_320, y: 2_640, width: 2_900, height: 160, tile: 'pathTile' },
		{ id: 'city-ruins-road', x: 5_640, y: 1_760, width: 160, height: 1_760, tile: 'pathTile' },
		{ id: 'city-west-combat-ground', x: 3_200, y: 3_840, width: 720, height: 512, tile: 'pathTile' },
		{ id: 'city-center-combat-ground', x: 4_128, y: 2_880, width: 720, height: 512, tile: 'pathTile' },
		{ id: 'city-east-combat-ground', x: 5_120, y: 1_600, width: 800, height: 512, tile: 'pathTile' }
	],
	blockers: [
		{ id: 'city-west-district-wall', x: 320, y: 4_960, width: 64, height: 1_600, kind: 'city-wall' },
		{ id: 'city-south-district-wall', x: 1_600, y: 5_872, width: 2_560, height: 64, kind: 'city-wall' },
		{ id: 'city-north-district-wall', x: 1_600, y: 3_936, width: 2_560, height: 64, kind: 'city-wall' },
		{ id: 'city-east-district-wall-north', x: 3_200, y: 3_920, width: 64, height: 1_024, kind: 'city-wall' },
		{ id: 'city-east-district-wall-south', x: 3_200, y: 5_280, width: 64, height: 960, kind: 'city-wall' },
		{ id: 'city-outskirts-north-tree-line', x: 4_480, y: 2_160, width: 2_720, height: 96, kind: 'city-wall' },
		{ id: 'city-outskirts-south-tree-line', x: 4_480, y: 3_120, width: 2_720, height: 96, kind: 'city-wall' },
		{ id: 'city-ruins-approach-west-wall', x: 5_360, y: 1_760, width: 96, height: 1_760, kind: 'city-wall' },
		{ id: 'city-ruins-approach-east-wall', x: 6_016, y: 1_760, width: 96, height: 1_760, kind: 'city-wall' }
	],
	fences: [
		{ id: 'village-fence-south-west', x: 960, y: 5_648, width: 640, height: 32 },
		{ id: 'village-fence-south-east', x: 2_240, y: 5_648, width: 640, height: 32 },
		{ id: 'village-fence-west-north', x: 448, y: 4_512, width: 32, height: 736 },
		{ id: 'village-fence-west-south', x: 448, y: 5_360, width: 32, height: 384 },
		{ id: 'village-fence-east-north', x: 3_008, y: 4_448, width: 32, height: 640 },
		{ id: 'village-fence-east-south', x: 3_008, y: 5_280, width: 32, height: 512 }
	],
	forestDecor: [
		{ id: 'outskirts-tree-line-north', x: 4_480, y: 2_080, width: 2_560, height: 160, frameName: 'treeCluster' },
		{ id: 'outskirts-tree-line-south', x: 4_480, y: 3_200, width: 2_560, height: 160, frameName: 'treeCluster' },
		{ id: 'outskirts-brush-west-pocket', x: 3_200, y: 3_840, width: 560, height: 256, frameName: 'brush' },
		{ id: 'outskirts-brush-center-pocket', x: 4_128, y: 2_880, width: 560, height: 256, frameName: 'brush' },
		{ id: 'outskirts-brush-east-pocket', x: 5_120, y: 1_600, width: 640, height: 256, frameName: 'brush' }
	],
	combatBounds: [
		{
			id: 'city-west-combat-pocket',
			x: 3_200,
			y: 3_840,
			width: 720,
			height: 512,
			encounterIds: ['meadow-slime-west'],
			aggroRadius: 240,
			leashRadius: 420
		},
		{
			id: 'city-center-combat-pocket',
			x: 4_128,
			y: 2_880,
			width: 720,
			height: 512,
			encounterIds: ['meadow-slime-center'],
			aggroRadius: 240,
			leashRadius: 420
		},
		{
			id: 'city-east-combat-pocket',
			x: 5_120,
			y: 1_600,
			width: 800,
			height: 512,
			encounterIds: ['meadow-slime-east'],
			aggroRadius: 240,
			leashRadius: 420
		}
	],
	encounters: [
		{ id: 'meadow-slime-west', x: 3_200, y: 3_840, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-center', x: 4_128, y: 2_880, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-east', x: 5_120, y: 1_600, enemyId: 'slime-scout' }
	]
```

- [ ] **Step 5: Update city scene expectations**

In `src/lib/game/phaser/scenes/scenes.test.ts`, update camera bounds for `meadow-entry`:

```ts
expect(scene.cameras.main.setBounds).toHaveBeenCalledWith(0, 0, 6_400, 6_400);
```

Update the opening-map render test to expect `tilemapData` dimensions:

```ts
expect(tilemapData).toHaveLength(200);
expect(tilemapData[0]).toHaveLength(200);
```

Replace the opening-map render assertions with these coordinate checks:

```ts
expect(scene.add.sprite).toHaveBeenCalledWith(
	meadowEntryMap.spawn.x,
	meadowEntryMap.spawn.y,
	'animation-pack',
	'heroIdle0'
);
expect(scene.add.sprite).toHaveBeenCalledWith(3_200, 3_840, 'animation-pack', 'slimeScoutIdle0');
expect(scene.add.image).not.toHaveBeenCalledWith(5_760, 960, 'starter-pack', 'doorwayTile');
expect(scene.add.rectangle).toHaveBeenCalledWith(5_760, 970, 44, 8, 0x4b5563, 0.95);
expect(scene.add.rectangle).toHaveBeenCalledWith(5_760, 960, 36, 8, 0x9ca3af, 0.95);
expect(scene.add.rectangle).toHaveBeenCalledWith(5_760, 950, 28, 8, 0xd1d5db, 0.95);
```

Replace village landmark render expectations with:

```ts
expect(scene.add.image).toHaveBeenCalledWith(640, 5_088, 'village-buildings', 'heroHouse');
expect(scene.add.image).toHaveBeenCalledWith(1_600, 4_256, 'village-buildings', 'guildHall');
expect(scene.add.image).toHaveBeenCalledWith(2_240, 4_960, 'village-buildings', 'itemShop');
expect(scene.add.image).toHaveBeenCalledWith(960, 4_480, 'village-buildings', 'villagerHouse');
expect(scene.add.image).toHaveBeenCalledWith(1_460, 5_440, 'village-buildings', 'villagerHouse');
expect(scene.add.image).toHaveBeenCalledWith(2_800, 4_480, 'village-buildings', 'villagerHouse');
expect(scene.add.image).not.toHaveBeenCalledWith(640, 5_168, 'starter-pack', 'doorwayTile');
expect(scene.add.image).not.toHaveBeenCalledWith(1_600, 4_352, 'starter-pack', 'doorwayTile');
expect(scene.add.image).not.toHaveBeenCalledWith(2_240, 5_040, 'starter-pack', 'doorwayTile');
expect(scene.add.image).not.toHaveBeenCalledWith(960, 4_552, 'starter-pack', 'doorwayTile');
expect(scene.add.image).not.toHaveBeenCalledWith(1_460, 5_512, 'starter-pack', 'doorwayTile');
expect(scene.add.image).not.toHaveBeenCalledWith(2_800, 4_552, 'starter-pack', 'doorwayTile');
```

- [ ] **Step 6: Run focused tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS for city content and scene expectations; ruin-size assertions still fail only if they were already changed to expect `200x200` before Task 4.

- [ ] **Step 7: Commit**

```sh
git add src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat: reshape meadow entry into a large district loop"
```

## Task 4: Author The 200x200 Ruin Dungeon Shells

**Files:**
- Modify: `src/lib/game/content/maps.ts`
- Test: `src/lib/game/content/maps.test.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Update ruin map content tests**

In `src/lib/game/content/maps.test.ts`, update ruin expectations:

```ts
expect(ruinsThresholdMap.width).toBe(200);
expect(ruinsThresholdMap.height).toBe(200);
expect(ruinsCoreMap.width).toBe(200);
expect(ruinsCoreMap.height).toBe(200);
expect(ruinsThresholdMap.transitions.every((transition) => transition.marker === 'stair')).toBe(true);
expect(ruinsCoreMap.transitions.every((transition) => transition.marker === 'stair')).toBe(true);
expect(ruinsThresholdMap.blockers?.some((blocker) => blocker.kind === 'future-gate')).toBe(true);
expect(ruinsCoreMap.blockers?.some((blocker) => blocker.kind === 'future-gate')).toBe(true);
```

Use these threshold assertions:

```ts
expect(maps['ruins-threshold'].pickups).toEqual([
	{ id: 'ruins-threshold-cap', x: 1_728, y: 2_112, itemId: 'iron-cap', quantity: 1 },
	{ id: 'ruins-threshold-rune', x: 3_584, y: 4_384, itemId: 'threshold-rune', quantity: 1 },
	{ id: 'ruins-threshold-salve', x: 2_048, y: 4_800, itemId: 'sunleaf-salve', quantity: 2 }
]);
expect(maps['ruins-threshold'].encounters).toEqual([
	{ id: 'threshold-slime-west', x: 2_304, y: 3_200, enemyId: 'slime-scout' },
	{ id: 'threshold-slime-east', x: 4_096, y: 3_008, enemyId: 'slime-scout' }
]);
```

Use these core assertions:

```ts
expect(maps['ruins-core'].pickups).toEqual([
	{ id: 'ruins-core-mail', x: 2_240, y: 2_048, itemId: 'stone-mail', quantity: 1 },
	{ id: 'ruins-core-draught', x: 3_584, y: 4_544, itemId: 'ruin-draught', quantity: 1 }
]);
expect(maps['ruins-core'].encounters).toEqual([
	{ id: 'ruins-warden', x: 4_992, y: 3_200, enemyId: 'ruins-warden', completion: 'victory' }
]);
```

- [ ] **Step 2: Run map tests and verify ruin failures**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: FAIL because ruin maps are still `30x30`, transition markers are unset, and future-gate blockers are absent.

- [ ] **Step 3: Replace `ruinsThresholdMap` with the large threshold shell**

In `src/lib/game/content/maps.ts`, update `ruinsThresholdMap` to:

```ts
export const ruinsThresholdMap: WorldMapDefinition = {
	id: 'ruins-threshold',
	width: 200,
	height: 200,
	spawnDirection: 'right',
	spawn: { x: 512, y: 3_200 },
	transitions: [
		{
			id: 'threshold-to-meadow',
			x: 256,
			y: 3_200,
			toMapId: openingMapId,
			requiresClear: true,
			marker: 'stair',
			arrival: { x: 5_568, y: 960, facing: 'left' }
		},
		{
			id: 'threshold-to-core',
			x: 5_888,
			y: 3_200,
			toMapId: 'ruins-core',
			requiresClear: true,
			marker: 'stair',
			arrival: { x: 512, y: 3_200, facing: 'right' }
		}
	],
	groundPatches: [
		{ id: 'threshold-main-loop-west', x: 1_600, y: 3_200, width: 2_176, height: 192, tile: 'ruinsFloorTile' },
		{ id: 'threshold-main-loop-east', x: 4_224, y: 3_200, width: 2_560, height: 192, tile: 'ruinsFloorTile' },
		{ id: 'threshold-north-branch', x: 2_240, y: 2_048, width: 192, height: 1_920, tile: 'ruinsFloorTile' },
		{ id: 'threshold-south-branch', x: 3_584, y: 4_352, width: 192, height: 1_920, tile: 'ruinsFloorTile' },
		{ id: 'threshold-north-room', x: 1_728, y: 2_048, width: 832, height: 640, tile: 'ruinsFloorTile' },
		{ id: 'threshold-south-room', x: 3_584, y: 4_608, width: 960, height: 672, tile: 'ruinsFloorTile' },
		{ id: 'threshold-east-room', x: 4_864, y: 3_008, width: 832, height: 640, tile: 'ruinsFloorTile' }
	],
	blockers: [
		{ id: 'threshold-north-wall', x: 3_200, y: 1_184, width: 5_120, height: 128, kind: 'ruin-wall' },
		{ id: 'threshold-south-wall', x: 3_200, y: 5_216, width: 5_120, height: 128, kind: 'ruin-wall' },
		{ id: 'threshold-west-wall', x: 768, y: 3_200, width: 128, height: 3_840, kind: 'ruin-wall' },
		{ id: 'threshold-east-wall', x: 5_632, y: 3_200, width: 128, height: 3_840, kind: 'ruin-wall' },
		{ id: 'threshold-loop-divider-north', x: 3_040, y: 2_368, width: 128, height: 1_536, kind: 'ruin-wall' },
		{ id: 'threshold-loop-divider-south', x: 2_912, y: 4_032, width: 128, height: 1_280, kind: 'ruin-wall' },
		{
			id: 'threshold-future-gate-north',
			x: 2_240,
			y: 2_816,
			width: 256,
			height: 96,
			kind: 'future-gate',
			label: 'Future north switch gate'
		},
		{
			id: 'threshold-future-gate-east',
			x: 4_672,
			y: 3_200,
			width: 96,
			height: 320,
			kind: 'future-gate',
			label: 'Future east gate'
		}
	],
	pickups: [
		{ id: 'ruins-threshold-cap', x: 1_728, y: 2_112, itemId: 'iron-cap', quantity: 1 },
		{ id: 'ruins-threshold-rune', x: 3_584, y: 4_384, itemId: 'threshold-rune', quantity: 1 },
		{ id: 'ruins-threshold-salve', x: 2_048, y: 4_800, itemId: 'sunleaf-salve', quantity: 2 }
	],
	encounters: [
		{ id: 'threshold-slime-west', x: 2_304, y: 3_200, enemyId: 'slime-scout' },
		{ id: 'threshold-slime-east', x: 4_096, y: 3_008, enemyId: 'slime-scout' }
	]
};
```

- [ ] **Step 4: Replace `ruinsCoreMap` with the large core shell**

In `src/lib/game/content/maps.ts`, update `ruinsCoreMap` to:

```ts
export const ruinsCoreMap: WorldMapDefinition = {
	id: 'ruins-core',
	width: 200,
	height: 200,
	spawnDirection: 'right',
	spawn: { x: 512, y: 3_200 },
	transitions: [
		{
			id: 'core-to-threshold',
			x: 256,
			y: 3_200,
			toMapId: 'ruins-threshold',
			requiresClear: true,
			marker: 'stair',
			arrival: { x: 5_632, y: 3_200, facing: 'left' }
		}
	],
	groundPatches: [
		{ id: 'core-main-approach', x: 2_368, y: 3_200, width: 3_648, height: 192, tile: 'ruinsFloorTile' },
		{ id: 'core-north-side-room', x: 2_240, y: 2_048, width: 896, height: 704, tile: 'ruinsFloorTile' },
		{ id: 'core-south-side-room', x: 3_584, y: 4_544, width: 1_024, height: 704, tile: 'ruinsFloorTile' },
		{ id: 'core-boss-chamber', x: 4_992, y: 3_200, width: 1_024, height: 960, tile: 'ruinsFloorTile' },
		{ id: 'core-north-connector', x: 2_240, y: 2_624, width: 192, height: 1_280, tile: 'ruinsFloorTile' },
		{ id: 'core-south-connector', x: 3_584, y: 3_872, width: 192, height: 1_344, tile: 'ruinsFloorTile' }
	],
	blockers: [
		{ id: 'core-north-wall', x: 3_200, y: 1_184, width: 5_120, height: 128, kind: 'ruin-wall' },
		{ id: 'core-south-wall', x: 3_200, y: 5_216, width: 5_120, height: 128, kind: 'ruin-wall' },
		{ id: 'core-west-wall', x: 768, y: 3_200, width: 128, height: 3_840, kind: 'ruin-wall' },
		{ id: 'core-east-wall', x: 5_760, y: 3_200, width: 128, height: 3_840, kind: 'ruin-wall' },
		{ id: 'core-boss-approach-north', x: 4_352, y: 2_624, width: 128, height: 1_280, kind: 'ruin-wall' },
		{ id: 'core-boss-approach-south', x: 4_352, y: 3_776, width: 128, height: 1_280, kind: 'ruin-wall' },
		{
			id: 'core-future-gate-boss',
			x: 4_608,
			y: 3_200,
			width: 96,
			height: 448,
			kind: 'future-gate',
			label: 'Future boss gate'
		},
		{
			id: 'core-future-gate-south',
			x: 3_584,
			y: 3_936,
			width: 256,
			height: 96,
			kind: 'future-gate',
			label: 'Future south chamber gate'
		}
	],
	pickups: [
		{ id: 'ruins-core-mail', x: 2_240, y: 2_048, itemId: 'stone-mail', quantity: 1 },
		{ id: 'ruins-core-draught', x: 3_584, y: 4_544, itemId: 'ruin-draught', quantity: 1 }
	],
	encounters: [
		{ id: 'ruins-warden', x: 4_992, y: 3_200, enemyId: 'ruins-warden', completion: 'victory' }
	]
};
```

- [ ] **Step 5: Update scene expectations for ruin dimensions and transitions**

In `src/lib/game/phaser/scenes/scenes.test.ts`, update the ruins camera test:

```ts
expect(ruinsCoreMap.width).toBe(200);
expect(ruinsCoreMap.height).toBe(200);
expect(scene.cameras.main.setBounds).toHaveBeenCalledWith(0, 0, 6_400, 6_400);
```

Update ruin transition tests to use:

```ts
expect(ruinsThresholdMap.transitions).toEqual([
	expect.objectContaining({
		id: 'threshold-to-meadow',
		x: 256,
		y: 3_200,
		toMapId: 'meadow-entry',
		requiresClear: true,
		marker: 'stair',
		arrival: { x: 5_568, y: 960, facing: 'left' }
	}),
	expect.objectContaining({
		id: 'threshold-to-core',
		x: 5_888,
		y: 3_200,
		toMapId: 'ruins-core',
		requiresClear: true,
		marker: 'stair',
		arrival: { x: 512, y: 3_200, facing: 'right' }
	})
]);
```

- [ ] **Step 6: Run focused tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS for content bounds, ruin dimensions, stair markers, and existing transition behavior.

- [ ] **Step 7: Commit**

```sh
git add src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat: expand ruins into puzzle-ready shells"
```

## Task 5: Strengthen Traversal Regression Coverage

**Files:**
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Add comprehensive bounds checks for new metadata**

In `src/lib/game/content/maps.test.ts`, add this helper:

```ts
function expectPointInsideMap(point: { x: number; y: number }, map: { width: number; height: number }) {
	expect(point.x).toBeGreaterThanOrEqual(0);
	expect(point.y).toBeGreaterThanOrEqual(0);
	expect(point.x).toBeLessThanOrEqual(map.width * 32);
	expect(point.y).toBeLessThanOrEqual(map.height * 32);
}
```

Add this test:

```ts
it('keeps every authored outdoor layout primitive inside map bounds', () => {
	for (const map of [meadowEntryMap, ruinsThresholdMap, ruinsCoreMap]) {
		expectPointInsideMap(map.spawn, map);

		for (const transition of map.transitions) {
			expectPointInsideMap(transition, map);
			if (transition.arrival) {
				expectPointInsideMap(transition.arrival, maps[transition.toMapId]);
			}
		}

		for (const rect of [
			...(map.groundPatches ?? []),
			...(map.blockers ?? []),
			...(map.combatBounds ?? []),
			...(map.fences ?? []),
			...(map.forestDecor ?? []),
			...(map.landmarks ?? [])
		]) {
			expectRectInsideMap(rect, map);
		}

		for (const point of [...(map.encounters ?? []), ...(map.pickups ?? []), ...(map.npcs ?? [])]) {
			expectPointInsideMap(point, map);
		}
	}
});
```

- [ ] **Step 2: Add city passability scene tests**

In `src/lib/game/phaser/scenes/scenes.test.ts`, update or add these tests:

```ts
it('keeps the hero house exterior doorway reachable in the large city', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'meadow-entry' });
	Object.assign(phaserState.playerMarker, { x: 640, y: 5_200 });
	phaserState.cursorKeys.up.isDown = true;

	scene.update(0, 80);

	expect(scene.scene.restart).toHaveBeenCalledWith({
		reason: 'transition',
		saveState: expect.objectContaining({
			mapId: 'hero-house',
			player: expect.objectContaining({ x: 256, y: 224, facing: 'up' })
		})
	});
});

it('blocks city wall movement while leaving the ruins approach lane usable', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'meadow-entry' });
	Object.assign(phaserState.playerMarker, { x: 5_300, y: 1_760 });
	phaserState.cursorKeys.right.isDown = true;

	scene.update(0, 250);

	expect(phaserState.playerMarker.x).toBe(5_300);
	expect(phaserState.playerMarker.y).toBe(1_760);

	Object.assign(phaserState.playerMarker, { x: 5_640, y: 1_200 });
	phaserState.cursorKeys.right.isDown = false;
	phaserState.cursorKeys.up.isDown = true;

	scene.update(250, 250);

	expect(phaserState.playerMarker.y).toBeLessThan(1_200);
});
```

- [ ] **Step 3: Add ruin blocker and stair-transition scene tests**

Add:

```ts
it('blocks movement through ruin walls and future gates', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'ruins-core' });
	Object.assign(phaserState.playerMarker, { x: 4_520, y: 3_200 });
	phaserState.cursorKeys.right.isDown = true;

	scene.update(0, 250);

	expect(phaserState.playerMarker.x).toBe(4_520);
	expect(phaserState.playerMarker.y).toBe(3_200);
});

it('uses stair transitions without changing transition save behavior', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'ruins-threshold' });
	Object.assign(phaserState.playerMarker, { x: 5_888, y: 3_200 });

	scene.update(0, 16);

	expect(scene.scene.restart).toHaveBeenCalledWith({
		reason: 'transition',
		saveState: expect.objectContaining({
			mapId: 'ruins-core',
			player: expect.objectContaining({ x: 512, y: 3_200, facing: 'right' })
		})
	});
});
```

- [ ] **Step 4: Run focused tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "test: cover large map traversal blockers"
```

## Task 6: Full Verification And Browser Smoke

**Files:**
- Modify only if verification exposes a defect in files touched by Tasks 1-5.

- [ ] **Step 1: Run Svelte/TypeScript checks**

Run:

```sh
bun run check
```

Expected: PASS.

If it fails with stale generated worker configuration, run:

```sh
bun run gen
bun run check
```

Expected: PASS after regeneration.

- [ ] **Step 2: Run the full test suite**

Run:

```sh
bun run test
```

Expected: PASS for unit, browser-component, and Playwright tests.

- [ ] **Step 3: Run a local browser smoke**

Run:

```sh
bun run dev -- --host 127.0.0.1 --port 5175
```

Expected: Vite reports a reachable `http://127.0.0.1:5175/` URL.

In a second terminal, run:

```sh
curl -I http://127.0.0.1:5175/
```

Expected: `HTTP/1.1 200 OK`.

Open the URL and verify:

- The opening map starts in the larger city.
- The hero can enter and exit hero house, guild hall, item shop, and villager houses.
- Outdoor slimes appear along route pockets instead of a separate open forest arena.
- The ruins transition appears as stairs and still requires the Guild Master quest objective.
- `ruins-threshold` and `ruins-core` camera bounds feel large and restrictive.
- `ruins-warden` remains reachable and victory behavior still fires after defeat.

- [ ] **Step 4: Commit final verification fixes**

If Step 1, 2, or 3 required fixes, commit those fixes:

```sh
git add src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "fix: stabilize large map traversal"
```

Expected: no commit is created if no verification fixes were needed.
