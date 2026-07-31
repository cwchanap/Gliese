# Large Room Tilemap Camera Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the current three-room game flow while rendering each room as a much larger tilemap world with smooth fullscreen camera follow.

**Architecture:** Keep `WorldMapDefinition.width` and `height` as tile counts with one global `32px` tile size. Replace ground image spam with a generated uniform terrain tileset texture plus a Phaser tilemap layer. Keep hero, enemies, transitions, saves, and HUD events as world objects on top of the tilemap.

**Tech Stack:** TypeScript, Phaser 4, SvelteKit, Vitest, bun.

---

## File Structure

- Modify `src/lib/game/content/maps.ts`: enlarge per-room tile dimensions and move spawns, transitions, arrivals, and encounters into the new world spaces.
- Modify `src/lib/game/phaser/scenes/WorldScene.ts`: add tilemap terrain rendering, use a generated `32px` ground tileset texture, keep camera bounds derived from active room size, and switch `startFollow` to smooth follow.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`: extend the Phaser mock with tilemap APIs, update expectations for large room coordinates and smooth camera follow, and preserve combat/transition coverage.
- Do not modify Svelte files in this plan. If a later implementation touches `.svelte`, run the Svelte autofixer required by repository instructions before completing.

## Constants To Use

- Global tile size: `32`.
- Camera lerp: `0.14` for both x and y.
- Terrain tileset texture key: `starter-ground-tiles`.
- Terrain tile indexes:
  - `1`: `grassTile`
  - `2`: `pathTile`
  - `3`: `ruinsFloorTile`
  - `4`: `stoneWallTile`

---

### Task 1: Enlarge Room Content Coordinates

**Files:**

- Modify: `src/lib/game/content/maps.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Write failing tests for large room dimensions and new camera bounds**

In `src/lib/game/phaser/scenes/scenes.test.ts`, update the existing camera test to assert large room bounds and smooth follow:

```ts
it('sets up smooth camera follow and keyboard controls for the player marker', async () => {
	const { WorldScene } = await import('./WorldScene');
	const { meadowEntryMap } = await import('$lib/game/content/maps');
	const scene = new WorldScene();

	scene.create({ mapId: meadowEntryMap.id });

	expect(meadowEntryMap).toMatchObject({ width: 320, height: 320 });
	expect(scene.cameras.main.setBounds).toHaveBeenCalledWith(0, 0, 10_240, 10_240);
	expect(scene.cameras.main.startFollow).toHaveBeenCalledWith(
		phaserState.playerMarker,
		true,
		0.14,
		0.14
	);
	expect(scene.input.keyboard?.createCursorKeys).toHaveBeenCalledOnce();
	expect(scene.input.keyboard?.addKeys).toHaveBeenCalledWith({
		left: 'A',
		right: 'D',
		up: 'W',
		down: 'S'
	});
});
```

Add a new test for the smaller `ruins-core` room:

```ts
it('sets smaller camera bounds for the ruins core room', async () => {
	const { WorldScene } = await import('./WorldScene');
	const { ruinsCoreMap } = await import('$lib/game/content/maps');
	const scene = new WorldScene();

	scene.create({ mapId: ruinsCoreMap.id });

	expect(ruinsCoreMap).toMatchObject({ width: 80, height: 80 });
	expect(scene.cameras.main.setBounds).toHaveBeenCalledWith(0, 0, 2_560, 2_560);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run
```

Expected: FAIL because map dimensions are still small and `startFollow` only receives `(player, true)`.

- [ ] **Step 3: Update map dimensions and coordinates**

Replace the three map definitions in `src/lib/game/content/maps.ts` with these values, preserving existing exports and registry shape:

```ts
export const meadowEntryMap: WorldMapDefinition = {
	id: openingMapId,
	width: 320,
	height: 320,
	spawnDirection: 'right',
	spawn: { x: 256, y: 5_120 },
	transitions: [
		{
			x: 9_984,
			y: 5_120,
			toMapId: 'ruins-threshold',
			arrival: { x: 256, y: 5_120, facing: 'right' }
		}
	],
	encounter: { x: 5_120, y: 5_120, enemyId: 'slime-scout' }
};

export const ruinsThresholdMap: WorldMapDefinition = {
	id: 'ruins-threshold',
	width: 320,
	height: 320,
	spawnDirection: 'right',
	spawn: { x: 256, y: 5_120 },
	transitions: [
		{
			x: 128,
			y: 5_120,
			toMapId: openingMapId,
			arrival: { x: 9_856, y: 5_120, facing: 'left' }
		},
		{
			x: 9_984,
			y: 5_120,
			toMapId: 'ruins-core',
			arrival: { x: 256, y: 1_280, facing: 'right' }
		}
	]
};

export const ruinsCoreMap: WorldMapDefinition = {
	id: 'ruins-core',
	width: 80,
	height: 80,
	spawnDirection: 'right',
	spawn: { x: 256, y: 1_280 },
	transitions: [
		{
			x: 128,
			y: 1_280,
			toMapId: 'ruins-threshold',
			arrival: { x: 9_856, y: 5_120, facing: 'left' }
		}
	],
	encounter: { x: 1_600, y: 1_280, enemyId: 'ruins-warden', completion: 'victory' }
};
```

- [ ] **Step 4: Add smooth camera follow constant and call**

In `src/lib/game/phaser/scenes/WorldScene.ts`, add this static field near `tileSize`:

```ts
private static readonly cameraFollowLerp = 0.14;
```

Replace:

```ts
this.cameras.main.startFollow(this.player, true);
```

with:

```ts
this.cameras.main.startFollow(
	this.player,
	true,
	WorldScene.cameraFollowLerp,
	WorldScene.cameraFollowLerp
);
```

- [ ] **Step 5: Run tests to verify dimension and camera tests pass or fail only on tilemap expectations not yet added**

Run:

```bash
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run
```

Expected: the camera-related assertions pass. Existing combat and transition tests may fail because they still use old coordinates; update them in Task 3.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add src/lib/game/content/maps.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Expand room dimensions and smooth camera follow"
```

---

### Task 2: Replace Ground Images With Phaser Tilemap Rendering

**Files:**

- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Extend the Phaser scene mock with tilemap APIs**

In `src/lib/game/phaser/scenes/scenes.test.ts`, inside `vi.hoisted`, add these mocks near `textureMock`:

```ts
const tilemapLayer = {
	setDepth: vi.fn(() => tilemapLayer)
};
const tilemap = {
	addTilesetImage: vi.fn(() => ({ name: 'starter-ground-tiles' })),
	createLayer: vi.fn(() => tilemapLayer)
};
```

Add `make` to `SceneMock`:

```ts
make = {
	tilemap: vi.fn(() => tilemap)
};
```

Return `tilemap` and `tilemapLayer` from the hoisted state object, and reset their mocks in `reset()`:

```ts
tilemap.addTilesetImage.mockClear();
tilemap.createLayer.mockClear();
tilemapLayer.setDepth.mockClear();
```

- [ ] **Step 2: Write failing tilemap rendering test**

Replace the first WorldScene render test with this version:

```ts
it('renders tilemap ground, a hero sprite, and encounter art for the resolved map', async () => {
	const { WorldScene } = await import('./WorldScene');
	const { meadowEntryMap } = await import('$lib/game/content/maps');
	const scene = new WorldScene();

	scene.create({ mapId: meadowEntryMap.id });

	expect(scene.make.tilemap).toHaveBeenCalledWith({
		data: expect.any(Array),
		tileWidth: 32,
		tileHeight: 32
	});
	const tilemapCall = scene.make.tilemap.mock.calls[0]?.[0];
	expect(tilemapCall.data).toHaveLength(320);
	expect(tilemapCall.data[0]).toHaveLength(320);
	expect(phaserState.tilemap.addTilesetImage).toHaveBeenCalledWith(
		'starter-ground-tiles',
		'starter-ground-tiles',
		32,
		32
	);
	expect(phaserState.tilemap.createLayer).toHaveBeenCalledWith('ground', expect.anything(), 0, 0);
	expect(scene.add.image).toHaveBeenCalledWith(
		meadowEntryMap.spawn.x,
		meadowEntryMap.spawn.y,
		'starter-pack',
		'hero'
	);
	expect(scene.add.image).toHaveBeenCalledWith(5_120, 5_120, 'starter-pack', 'slimeScout');
	expect(scene.add.image).toHaveBeenCalledWith(9_984, 5_120, 'starter-pack', 'doorwayTile');
	expect(scene.cameras.main.setBackgroundColor).toHaveBeenCalledWith('#1a1f2b');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run
```

Expected: FAIL because `renderGround()` still calls `this.add.image()` in loops and `scene.make.tilemap` is not used.

- [ ] **Step 4: Add tilemap helper types and constants**

In `src/lib/game/phaser/scenes/WorldScene.ts`, update the asset import to include the frame type:

```ts
import {
	getEnemyFrameName,
	getGroundFrameName,
	starterPackAsset,
	type StarterPackFrameName
} from '$lib/game/content/assets';
```

Add these types near `OverlayMarker`:

```ts
type TilemapLayer = {
	setDepth?: (depth: number) => unknown;
};
```

Add these static fields near `tileSize`:

```ts
private static readonly terrainTilesetKey = 'starter-ground-tiles';
private static readonly terrainTileIndexes: Record<StarterPackFrameName, number> = {
	hero: 0,
	slimeScout: 0,
	ruinsWarden: 0,
	healFlask: 0,
	grassTile: 1,
	pathTile: 2,
	ruinsFloorTile: 3,
	stoneWallTile: 4,
	doorwayTile: 0,
	encounterTile: 0,
	hudFrame: 0,
	hpIcon: 0,
	xpIcon: 0,
	titleBadge: 0
};
private static readonly terrainFrames: StarterPackFrameName[] = [
	'grassTile',
	'pathTile',
	'ruinsFloorTile',
	'stoneWallTile'
];
```

- [ ] **Step 5: Add a generated tileset texture method**

Add this method below `registerStarterPackFrames()`:

```ts
private ensureTerrainTilesetTexture() {
	if (this.textures.exists?.(WorldScene.terrainTilesetKey)) {
		return;
	}

	const sourceTexture = this.textures.get(starterPackAsset.key);
	const sourceImage = sourceTexture.getSourceImage?.() as CanvasImageSource | undefined;

	if (!sourceImage || typeof document === 'undefined') {
		return;
	}

	const canvas = document.createElement('canvas');
	canvas.width = WorldScene.terrainFrames.length * WorldScene.tileSize;
	canvas.height = WorldScene.tileSize;
	const context = canvas.getContext('2d');

	if (!context) {
		return;
	}

	for (const [index, frameName] of WorldScene.terrainFrames.entries()) {
		const frame = starterPackAsset.frames[frameName];
		context.drawImage(
			sourceImage,
			frame.x,
			frame.y,
			frame.w,
			frame.h,
			index * WorldScene.tileSize,
			0,
			WorldScene.tileSize,
			WorldScene.tileSize
		);
	}

	this.textures.addCanvas?.(WorldScene.terrainTilesetKey, canvas);
}
```

If TypeScript reports missing optional methods on `this.textures`, introduce a narrow local type:

```ts
const textureManager = this.textures as typeof this.textures & {
	exists?: (key: string) => boolean;
	addCanvas?: (key: string, source: HTMLCanvasElement) => unknown;
};
```

Then use `textureManager.exists`, `textureManager.get`, and `textureManager.addCanvas`.

- [ ] **Step 6: Replace `renderGround()` with tilemap rendering**

Replace the current `renderGround(map: WorldMapDefinition)` method with:

```ts
private renderGround(map: WorldMapDefinition) {
	this.ensureTerrainTilesetTexture();

	const data = this.buildGroundTileData(map);
	const tilemap = this.make.tilemap({
		data,
		tileWidth: WorldScene.tileSize,
		tileHeight: WorldScene.tileSize
	});
	const tileset = tilemap.addTilesetImage(
		WorldScene.terrainTilesetKey,
		WorldScene.terrainTilesetKey,
		WorldScene.tileSize,
		WorldScene.tileSize
	);

	if (!tileset) {
		return;
	}

	const layer = tilemap.createLayer('ground', tileset, 0, 0) as TilemapLayer | null;
	layer?.setDepth?.(-10);
}
```

Add this helper immediately after it:

```ts
private buildGroundTileData(map: WorldMapDefinition) {
	const baseFrame = getGroundFrameName(map.id);
	const baseTile = WorldScene.terrainTileIndexes[baseFrame];
	const pathTile = WorldScene.terrainTileIndexes.pathTile;
	const stoneTile = WorldScene.terrainTileIndexes.stoneWallTile;

	return Array.from({ length: map.height }, (_, row) =>
		Array.from({ length: map.width }, (_, column) => {
			if (map.id === openingMapId && Math.abs(row - Math.floor(map.height / 2)) <= 1) {
				return pathTile;
			}

			if (map.id !== openingMapId && (row === 0 || column === 0 || row === map.height - 1 || column === map.width - 1)) {
				return stoneTile;
			}

			return baseTile;
		})
	);
}
```

- [ ] **Step 7: Run the scene tests**

Run:

```bash
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run
```

Expected: tilemap render test passes. Some old-coordinate tests may still fail until Task 3.

- [ ] **Step 8: Commit Task 2**

Run:

```bash
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Render large rooms with Phaser tilemaps"
```

---

### Task 3: Update Gameplay Tests For Large-Room Coordinates

**Files:**

- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Update combat coordinate tests**

Replace all `meadow-entry` player placements that use `{ x: 304, y: 96 }` for the slime encounter with:

```ts
Object.assign(phaserState.playerMarker, { x: 5_120, y: 5_120 });
```

Replace all `ruins-core` boss placements that use `{ x: 304, y: 96 }` with:

```ts
Object.assign(phaserState.playerMarker, { x: 1_600, y: 1_280 });
```

In the boss chase test, replace:

```ts
Object.assign(phaserState.playerMarker, { x: 120, y: 96 });
```

with:

```ts
Object.assign(phaserState.playerMarker, { x: 1_416, y: 1_280 });
```

Replace:

```ts
expect(sceneState.enemy.x).toBeLessThan(304);
```

with:

```ts
expect(sceneState.enemy.x).toBeLessThan(1_600);
```

Replace:

```ts
Object.assign(phaserState.playerMarker, { x: sceneState.enemy.x, y: 96 });
```

with:

```ts
Object.assign(phaserState.playerMarker, { x: sceneState.enemy.x, y: 1_280 });
```

- [ ] **Step 2: Update transition tests**

In the meadow-to-threshold test, replace the exit coordinate:

```ts
Object.assign(phaserState.playerMarker, { x: 9_984, y: 5_120 });
```

Expect arrival:

```ts
player: expect.objectContaining({
	x: 256,
	y: 5_120,
	facing: 'right'
});
```

In the threshold-to-meadow test, replace the player coordinate:

```ts
Object.assign(phaserState.playerMarker, { x: 128, y: 5_120 });
```

Expect arrival:

```ts
player: expect.objectContaining({
	x: 9_856,
	y: 5_120,
	facing: 'left'
});
```

Add a new transition test for threshold-to-core:

```ts
it('moves from the threshold into the smaller ruins core room', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'ruins-threshold' });
	Object.assign(phaserState.playerMarker, { x: 9_984, y: 5_120 });

	scene.update(0, 16);

	expect(scene.scene.restart).toHaveBeenCalledWith({
		reason: 'transition',
		saveState: expect.objectContaining({
			mapId: 'ruins-core',
			player: expect.objectContaining({
				x: 256,
				y: 1_280,
				facing: 'right'
			})
		})
	});
});
```

- [ ] **Step 3: Run the scene tests**

Run:

```bash
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run
```

Expected: all scene tests pass.

- [ ] **Step 4: Commit Task 3**

Run:

```bash
git add src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Update scene tests for large room coordinates"
```

---

### Task 4: Verify Typecheck, Unit Tests, And Build

**Files:**

- No planned source changes.

- [ ] **Step 1: Run full unit tests**

Run:

```bash
bun run test:unit -- --run
```

Expected: PASS.

- [ ] **Step 2: Run SvelteKit/TypeScript check**

Run:

```bash
bun run check
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
bun run build
```

Expected: PASS.

- [ ] **Step 4: Fix any verification failures with the smallest scoped patch**

If TypeScript complains about Phaser texture manager methods, use this exact local type inside `ensureTerrainTilesetTexture()`:

```ts
const textureManager = this.textures as typeof this.textures & {
	exists?: (key: string) => boolean;
	addCanvas?: (key: string, source: HTMLCanvasElement) => unknown;
};
```

Then call `textureManager.exists?.(...)`, `textureManager.get(...)`, and `textureManager.addCanvas?.(...)`.

If tests fail because `textureMock.getSourceImage` is missing, add this to the mock:

```ts
getSourceImage: vi.fn(() => undefined);
```

This keeps tests in Node from depending on browser canvas behavior.

- [ ] **Step 5: Commit verification fixes if any were needed**

If files changed:

```bash
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Fix tilemap verification issues"
```

If no files changed, do not create an empty commit.

---

### Task 5: Manual Runtime Check

**Files:**

- No planned source changes.

- [ ] **Step 1: Start the dev server**

Run:

```bash
bun run dev
```

Expected: Vite serves the app at `http://localhost:5173`.

- [ ] **Step 2: Open `/game` in the in-app browser**

Navigate to:

```text
http://localhost:5173/game
```

Expected:

- The viewport fills the screen.
- The hero appears in the large `meadow-entry` room.
- Moving with WASD or arrow keys pans the camera smoothly.
- The hero remains centered except near room boundaries.
- The slime encounter appears around the middle of the meadow path.
- After clearing the slime, reaching the far-right transition enters `ruins-threshold`.

- [ ] **Step 3: Stop the dev server**

Stop the dev server with Ctrl-C in its terminal session.

---

## Self-Review Notes

- Spec coverage: the plan preserves multiple rooms, uses variable room dimensions, keeps a global `32px` tile size, uses Phaser tilemaps, updates content coordinates, smooths camera follow, and keeps save/transition behavior.
- Placeholder scan: no placeholders remain.
- Type consistency: `terrainTilesetKey`, `terrainTileIndexes`, `terrainFrames`, `cameraFollowLerp`, and `buildGroundTileData()` are consistently named across tasks.
