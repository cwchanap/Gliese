# Entry Scene Forest Slime Zone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `meadow-entry` so village pickups are gone, the village is fenced, and meadow slimes live inside a bounded forest zone with short leash behavior.

**Architecture:** Keep `meadow-entry` as one map. Add map content metadata for `forestZone`, `fences`, and `forestDecor`; register a compact transparent forest dressing asset; have `WorldScene` render the new dressing and use map data for fence collision plus meadow-only slime leash movement.

**Tech Stack:** TypeScript, Phaser 4, Svelte/Vite, Vitest, Bun, existing Gliese content/core/runtime split.

---

## File Structure

- Modify `src/lib/game/content/maps.ts`: add rectangle-based map metadata types, remove meadow pickups, move meadow slimes, add forest/fence/decor data.
- Modify `src/lib/game/content/maps.test.ts`: update exact meadow-entry expectations and add forest/fence validity assertions.
- Create `public/game/assets/forest-dressing.png`: transparent 2x2 forest dressing sheet.
- Modify `src/lib/game/content/assets.ts`: add `forestDressingAsset` metadata and `ForestDressingFrameName`.
- Modify `src/lib/game/content/assets.test.ts`: verify the new forest asset manifest.
- Modify `src/lib/game/phaser/scenes/BootScene.ts`: preload the forest dressing asset.
- Modify `src/lib/game/phaser/scenes/WorldScene.ts`: register/render forest dressing, render fences, block fence collision, and leash meadow slimes.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`: update render expectations and add fence/leash regression tests.

Use these shared layout constants in content:

```ts
forestZone: {
	id: 'east-forest',
	x: 1_760,
	y: 1_280,
	width: 896,
	height: 640,
	aggroRadius: 220,
	leashRadius: 360
}
```

Move meadow slimes to:

```ts
encounters: [
	{ id: 'meadow-slime-west', x: 1_536, y: 1_280, enemyId: 'slime-scout' },
	{ id: 'meadow-slime-center', x: 1_760, y: 1_344, enemyId: 'slime-scout' },
	{ id: 'meadow-slime-east', x: 1_984, y: 1_280, enemyId: 'slime-scout' }
];
```

Author village fence segments as center-based rectangles:

```ts
fences: [
	{ id: 'village-fence-north-west', x: 392, y: 848, width: 432, height: 32 },
	{ id: 'village-fence-north-east', x: 920, y: 848, width: 320, height: 32 },
	{ id: 'village-fence-west', x: 176, y: 1_296, width: 32, height: 832 },
	{ id: 'village-fence-south-west', x: 232, y: 1_744, width: 112, height: 32 },
	{ id: 'village-fence-south-center', x: 752, y: 1_744, width: 320, height: 32 },
	{ id: 'village-fence-south-east', x: 1_080, y: 1_744, width: 272, height: 32 },
	{ id: 'village-fence-east-north', x: 1_216, y: 1_024, width: 32, height: 320 },
	{ id: 'village-fence-east-south', x: 1_216, y: 1_568, width: 32, height: 352 }
];
```

Add forest decor as center-based rectangles:

```ts
forestDecor: [
	{ id: 'forest-floor', x: 1_760, y: 1_280, width: 820, height: 560, frameName: 'forestFloor' },
	{ id: 'forest-canopy-north', x: 1_760, y: 928, width: 896, height: 96, frameName: 'treeCluster' },
	{
		id: 'forest-canopy-south',
		x: 1_760,
		y: 1_632,
		width: 896,
		height: 96,
		frameName: 'treeCluster'
	},
	{
		id: 'forest-canopy-west-north',
		x: 1_280,
		y: 1_088,
		width: 96,
		height: 256,
		frameName: 'treeCluster'
	},
	{
		id: 'forest-canopy-west-south',
		x: 1_280,
		y: 1_512,
		width: 96,
		height: 176,
		frameName: 'treeCluster'
	},
	{
		id: 'forest-canopy-east',
		x: 2_240,
		y: 1_280,
		width: 96,
		height: 640,
		frameName: 'treeCluster'
	},
	{
		id: 'forest-entrance',
		x: 1_328,
		y: 1_280,
		width: 128,
		height: 144,
		frameName: 'forestEntrance'
	},
	{ id: 'forest-brush-clearing', x: 1_760, y: 1_504, width: 320, height: 96, frameName: 'brush' }
];
```

### Task 1: Map Content And Tests

**Files:**

- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps.test.ts`

- [ ] **Step 1: Write failing content tests**

In `src/lib/game/content/maps.test.ts`, add these helpers near the top of the file after imports:

```ts
type CenterRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

function expectRectInsideMap(rect: CenterRect, map = meadowEntryMap) {
	expect(rect.width).toBeGreaterThan(0);
	expect(rect.height).toBeGreaterThan(0);
	expect(rect.x - rect.width / 2).toBeGreaterThanOrEqual(0);
	expect(rect.y - rect.height / 2).toBeGreaterThanOrEqual(0);
	expect(rect.x + rect.width / 2).toBeLessThanOrEqual(map.width * 32);
	expect(rect.y + rect.height / 2).toBeLessThanOrEqual(map.height * 32);
}

function expectPointInsideRect(point: { x: number; y: number }, rect: CenterRect) {
	expect(point.x).toBeGreaterThanOrEqual(rect.x - rect.width / 2);
	expect(point.x).toBeLessThanOrEqual(rect.x + rect.width / 2);
	expect(point.y).toBeGreaterThanOrEqual(rect.y - rect.height / 2);
	expect(point.y).toBeLessThanOrEqual(rect.y + rect.height / 2);
}
```

Replace the meadow encounter expectation in `declares a village spawn, peaceful building doors, road encounters, and ruins exit` with:

```ts
expect(meadowEntryMap.encounters).toEqual([
	{ id: 'meadow-slime-west', x: 1_536, y: 1_280, enemyId: 'slime-scout' },
	{ id: 'meadow-slime-center', x: 1_760, y: 1_344, enemyId: 'slime-scout' },
	{ id: 'meadow-slime-east', x: 1_984, y: 1_280, enemyId: 'slime-scout' }
]);
```

Replace `keeps meadow enemies east of the village cluster` with:

```ts
it('keeps meadow enemies inside the bounded forest zone', () => {
	expect(meadowEntryMap.forestZone).toEqual({
		id: 'east-forest',
		x: 1_760,
		y: 1_280,
		width: 896,
		height: 640,
		aggroRadius: 220,
		leashRadius: 360
	});
	expectRectInsideMap(meadowEntryMap.forestZone!);

	for (const encounter of meadowEntryMap.encounters ?? []) {
		expectPointInsideRect(encounter, meadowEntryMap.forestZone!);
	}
});
```

Update `defines valid placed pickups with stable ids and item ids` so the meadow expectation is:

```ts
expect(maps['meadow-entry'].pickups ?? []).toEqual([]);
```

Add this test after the forest-zone test:

```ts
it('defines village fences and forest dressing inside the meadow map bounds', () => {
	expect(meadowEntryMap.fences).toEqual([
		{ id: 'village-fence-north-west', x: 392, y: 848, width: 432, height: 32 },
		{ id: 'village-fence-north-east', x: 920, y: 848, width: 320, height: 32 },
		{ id: 'village-fence-west', x: 176, y: 1_296, width: 32, height: 832 },
		{ id: 'village-fence-south-west', x: 232, y: 1_744, width: 112, height: 32 },
		{ id: 'village-fence-south-center', x: 752, y: 1_744, width: 320, height: 32 },
		{ id: 'village-fence-south-east', x: 1_080, y: 1_744, width: 272, height: 32 },
		{ id: 'village-fence-east-north', x: 1_216, y: 1_024, width: 32, height: 320 },
		{ id: 'village-fence-east-south', x: 1_216, y: 1_568, width: 32, height: 352 }
	]);
	expect(meadowEntryMap.forestDecor?.map((decor) => decor.frameName)).toEqual([
		'forestFloor',
		'treeCluster',
		'treeCluster',
		'treeCluster',
		'treeCluster',
		'treeCluster',
		'forestEntrance',
		'brush'
	]);

	const ids = [
		...(meadowEntryMap.fences ?? []).map((fence) => fence.id),
		...(meadowEntryMap.forestDecor ?? []).map((decor) => decor.id)
	];
	expect(new Set(ids).size).toBe(ids.length);

	for (const fence of meadowEntryMap.fences ?? []) {
		expectRectInsideMap(fence);
	}

	for (const decor of meadowEntryMap.forestDecor ?? []) {
		expectRectInsideMap(decor);
	}
});
```

- [ ] **Step 2: Run content tests to verify failure**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: fail because `forestZone`, `fences`, and `forestDecor` are missing, meadow pickups still exist, and slime coordinates still use the road positions.

- [ ] **Step 3: Implement map metadata and meadow layout**

In `src/lib/game/content/maps.ts`, change the import to include the forest frame type:

```ts
import type { ForestDressingFrameName, NpcFrameName } from '$lib/game/content/assets';
```

Add these interfaces after `MapLandmark`:

```ts
export interface MapRect {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface MapForestZone extends MapRect {
	aggroRadius: number;
	leashRadius: number;
}

export type MapFenceSegment = MapRect;

export interface MapForestDecor extends MapRect {
	frameName: ForestDressingFrameName;
}
```

Extend `WorldMapDefinition`:

```ts
	forestZone?: MapForestZone;
	fences?: MapFenceSegment[];
	forestDecor?: MapForestDecor[];
```

In `meadowEntryMap`, remove the current `pickups` array, add the shared `forestZone`, `fences`, and `forestDecor` blocks from this plan, and replace `encounters` with the new forest coordinates.

- [ ] **Step 4: Run content tests to verify pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit content model**

Run:

```sh
git add src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts
git commit -m "feat: define meadow forest zone"
```

### Task 2: Forest Asset Manifest And Preload

**Files:**

- Create: `public/game/assets/forest-dressing.png`
- Modify: `src/lib/game/content/assets.ts`
- Modify: `src/lib/game/content/assets.test.ts`
- Modify: `src/lib/game/phaser/scenes/BootScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Write failing asset and preload tests**

In `src/lib/game/content/assets.test.ts`, extend the import:

```ts
	forestDressingAsset,
	type ForestDressingFrameName,
```

Add:

```ts
const requiredForestFrames: ForestDressingFrameName[] = [
	'treeCluster',
	'brush',
	'forestFloor',
	'forestEntrance'
];
```

Add this describe block before `npc pack metadata`:

```ts
describe('forest dressing asset metadata', () => {
	it('loads compact forest art from a fixed 2x2 sheet', () => {
		expect(forestDressingAsset).toMatchObject({
			key: 'forest-dressing',
			path: '/game/assets/forest-dressing.png',
			cellWidth: 256,
			cellHeight: 256,
			columns: 2
		});
		expect(forestDressingAsset.frames).toEqual({
			treeCluster: { x: 0, y: 0, w: 256, h: 256 },
			brush: { x: 256, y: 0, w: 256, h: 256 },
			forestFloor: { x: 0, y: 256, w: 256, h: 256 },
			forestEntrance: { x: 256, y: 256, w: 256, h: 256 }
		});
	});

	it('covers every meadow forest decor frame reference', () => {
		for (const decor of meadowEntryMap.forestDecor ?? []) {
			expect(requiredForestFrames).toContain(decor.frameName);
		}
	});
});
```

In the BootScene preload test in `src/lib/game/phaser/scenes/scenes.test.ts`, extend the asset import and assertion:

```ts
const {
	animationPackAsset,
	forestDressingAsset,
	npcPackAsset,
	starterPackAsset,
	villageBuildingAsset
} = await import('$lib/game/content/assets');
```

```ts
expect(scene.load.image).toHaveBeenCalledWith(forestDressingAsset.key, forestDressingAsset.path);
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/assets.test.ts src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: fail because `forestDressingAsset` is not exported and BootScene does not preload it.

- [ ] **Step 3: Create the transparent forest asset**

Generate or draw `public/game/assets/forest-dressing.png` as a transparent `512 x 512` PNG with this 2x2 frame layout:

```text
top-left: treeCluster
top-right: brush
bottom-left: forestFloor
bottom-right: forestEntrance
```

Use this prompt if generating the asset:

```text
SNES-inspired top-down JRPG forest dressing sprite sheet, transparent background, fixed 2x2 grid, each cell 256x256 pixels. Top-left dense tree cluster boundary, top-right low brush patch, bottom-left leafy dark forest floor accent, bottom-right readable forest entrance opening with trees framing a path. Pixel art, clean silhouettes, no baked checkerboard, no matte background, production-ready game asset sheet.
```

Verify alpha:

```sh
python3 .codex/skills/2d-game-asset-workflow/scripts/inspect_png_alpha.py public/game/assets/forest-dressing.png
```

Expected: output reports an alpha channel, `alpha_min` is `0`, and `transparent_pixels` is greater than `0`.

- [ ] **Step 4: Add manifest and preload implementation**

In `src/lib/game/content/assets.ts`, add after `villageBuildingAsset`:

```ts
export const forestDressingAsset = {
	key: 'forest-dressing',
	path: '/game/assets/forest-dressing.png',
	cellWidth: 256,
	cellHeight: 256,
	columns: 2,
	frames: {
		treeCluster: { x: 0, y: 0, w: 256, h: 256 },
		brush: { x: 256, y: 0, w: 256, h: 256 },
		forestFloor: { x: 0, y: 256, w: 256, h: 256 },
		forestEntrance: { x: 256, y: 256, w: 256, h: 256 }
	}
} as const;

export type ForestDressingFrameName = keyof typeof forestDressingAsset.frames;
```

In `src/lib/game/phaser/scenes/BootScene.ts`, import `forestDressingAsset` and preload it:

```ts
this.load.image(forestDressingAsset.key, forestDressingAsset.path);
```

- [ ] **Step 5: Run asset/preload tests to verify pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/assets.test.ts src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit asset manifest**

Run:

```sh
git add public/game/assets/forest-dressing.png src/lib/game/content/assets.ts src/lib/game/content/assets.test.ts src/lib/game/phaser/scenes/BootScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat: add forest dressing asset"
```

### Task 3: Forest And Fence Rendering

**Files:**

- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Write failing render tests**

In `src/lib/game/phaser/scenes/scenes.test.ts`, add after `renders village building landmarks before doorway markers`:

```ts
it('registers and renders meadow forest dressing before actors', async () => {
	const { forestDressingAsset } = await import('$lib/game/content/assets');
	const { meadowEntryMap } = await import('$lib/game/content/maps');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: meadowEntryMap.id });

	expect(scene.textures.get).toHaveBeenCalledWith(forestDressingAsset.key);
	for (const [frameName, frame] of Object.entries(forestDressingAsset.frames)) {
		expect(phaserState.textureMock.add).toHaveBeenCalledWith(
			frameName,
			0,
			frame.x,
			frame.y,
			frame.w,
			frame.h
		);
	}

	expect(scene.add.image).toHaveBeenCalledWith(1_760, 1_280, 'forest-dressing', 'forestFloor');
	expect(scene.add.image).toHaveBeenCalledWith(1_328, 1_280, 'forest-dressing', 'forestEntrance');
	expect(phaserState.imageMarkers.filter((marker) => marker.frame === 'treeCluster')).toHaveLength(
		5
	);

	const forestFloor = phaserState.imageMarkers.find((marker) => marker.frame === 'forestFloor');
	expect(forestFloor?.setDisplaySize).toHaveBeenCalledWith(820, 560);

	const firstForestCallIndex = vi
		.mocked(scene.add.image)
		.mock.calls.findIndex(
			([x, y, texture, frame]) =>
				x === 1_760 && y === 1_280 && texture === 'forest-dressing' && frame === 'forestFloor'
		);
	const firstHeroCallOrder = vi.mocked(scene.add.sprite).mock.invocationCallOrder[0];
	const firstForestCallOrder = vi.mocked(scene.add.image).mock.invocationCallOrder[
		firstForestCallIndex
	];
	expect(firstForestCallOrder).toBeLessThan(firstHeroCallOrder);
});

it('renders village fence segments as world rectangles', async () => {
	const { meadowEntryMap } = await import('$lib/game/content/maps');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: meadowEntryMap.id });

	for (const fence of meadowEntryMap.fences ?? []) {
		expect(scene.add.rectangle).toHaveBeenCalledWith(
			fence.x,
			fence.y,
			fence.width,
			fence.height,
			0x6f5132,
			0.95
		);
	}
});
```

- [ ] **Step 2: Run scene tests to verify failure**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: fail because forest frames are not registered/rendered and fences are not drawn.

- [ ] **Step 3: Register forest frames and render map dressing**

In `WorldScene.ts`, import `forestDressingAsset` and the new map types:

```ts
	forestDressingAsset,
```

```ts
	type MapFenceSegment,
	type MapForestDecor,
	type MapForestZone,
```

In `create`, call the new register/render methods:

```ts
this.registerForestDressingFrames();
```

Place the render calls after `this.renderGround(map);` and before `this.renderLandmarks(map);`:

```ts
this.renderForestDressing(map);
this.renderFences(map);
```

Add methods next to the existing frame registration and render methods:

```ts
private registerForestDressingFrames() {
	const texture = this.textures.get(forestDressingAsset.key);

	for (const [frameName, frame] of Object.entries(forestDressingAsset.frames)) {
		if (!texture.has(frameName)) {
			texture.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);
		}
	}
}

private renderForestDressing(map: WorldMapDefinition) {
	for (const decor of map.forestDecor ?? []) {
		this.add
			.image(decor.x, decor.y, forestDressingAsset.key, decor.frameName)
			.setDisplaySize(decor.width, decor.height);
	}
}

private renderFences(map: WorldMapDefinition) {
	for (const fence of map.fences ?? []) {
		this.add.rectangle(fence.x, fence.y, fence.width, fence.height, 0x6f5132, 0.95);
	}
}
```

- [ ] **Step 4: Run scene tests to verify pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit rendering**

Run:

```sh
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat: render meadow forest and fences"
```

### Task 4: Fence Collision

**Files:**

- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Write failing fence collision tests**

In `src/lib/game/phaser/scenes/scenes.test.ts`, add after the building collision tests:

```ts
it('blocks player movement through village fence segments', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'meadow-entry' });
	Object.assign(phaserState.playerMarker, { x: 1_164, y: 1_024 });
	phaserState.cursorKeys.right.isDown = true;

	scene.update(0, 250);

	expect(phaserState.playerMarker.x).toBe(1_164);
	expect(phaserState.playerMarker.y).toBe(1_024);
});

it('keeps the central east fence gate open toward the forest', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'meadow-entry' });
	Object.assign(phaserState.playerMarker, { x: 1_184, y: 1_280 });
	phaserState.cursorKeys.right.isDown = true;

	scene.update(0, 250);

	expect(phaserState.playerMarker.x).toBeGreaterThan(1_184);
	expect(phaserState.playerMarker.y).toBe(1_280);
});

it('keeps the hero house south fence opening passable', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'meadow-entry' });
	Object.assign(phaserState.playerMarker, { x: 384, y: 1_704 });
	phaserState.cursorKeys.down.isDown = true;

	scene.update(0, 250);

	expect(phaserState.playerMarker.x).toBe(384);
	expect(phaserState.playerMarker.y).toBeGreaterThan(1_704);
});
```

- [ ] **Step 2: Run scene tests to verify failure**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: fail because fences render but do not block movement.

- [ ] **Step 3: Include fences in player collision checks**

In `WorldScene.ts`, update `isPlayerMovementBlocked`:

```ts
return (
	this.isPlayerMovementBlockedByNpc(currentX, currentY, targetX, targetY) ||
	this.isPlayerMovementBlockedByLandmark(currentX, currentY, targetX, targetY) ||
	this.isPlayerMovementBlockedByFence(currentX, currentY, targetX, targetY)
);
```

Add these helpers near landmark collision helpers:

```ts
private isPlayerMovementBlockedByFence(
	currentX: number,
	currentY: number,
	targetX: number,
	targetY: number
): boolean {
	const map = this.resolveMap(this.mapId);

	return (map.fences ?? []).some((fence) => {
		const bounds = this.getMapRectBounds(fence);

		return this.isPlayerMovementBlockedByRect(
			currentX,
			currentY,
			targetX,
			targetY,
			bounds,
			bounds
		);
	});
}

private getMapRectBounds(rect: MapFenceSegment | MapForestDecor | MapForestZone): LandmarkCollisionBounds {
	const left = rect.x - rect.width / 2;
	const right = rect.x + rect.width / 2;
	const top = rect.y - rect.height / 2;
	const bottom = rect.y + rect.height / 2;

	return {
		left,
		right,
		top,
		bottom,
		centerX: rect.x,
		centerY: rect.y
	};
}
```

- [ ] **Step 4: Run scene tests to verify pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit fence collision**

Run:

```sh
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat: block meadow village fences"
```

### Task 5: Meadow Slime Leash Behavior

**Files:**

- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Write failing leash behavior tests**

In `src/lib/game/phaser/scenes/scenes.test.ts`, add before the boss movement test:

```ts
it('keeps meadow slimes inside the forest zone while chasing', async () => {
	const { meadowEntryMap } = await import('$lib/game/content/maps');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		enemies: Array<{ x: number; y: number; movementMode: string }>;
	};

	scene.create({ mapId: meadowEntryMap.id });
	Object.assign(phaserState.playerMarker, { x: 1_360, y: 1_280 });

	scene.update(0, 1_000);

	const forestZone = meadowEntryMap.forestZone!;
	const left = forestZone.x - forestZone.width / 2;
	for (const enemy of sceneState.enemies) {
		expect(enemy.x).toBeGreaterThanOrEqual(left);
	}
	expect(sceneState.enemies[0]!.movementMode).toBe('chase');
});

it('returns meadow slimes home after the hero escapes the forest', async () => {
	const { meadowEntryMap } = await import('$lib/game/content/maps');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		enemies: Array<{ x: number; y: number; homeX: number; homeY: number; movementMode: string }>;
	};

	scene.create({ mapId: meadowEntryMap.id });
	Object.assign(phaserState.playerMarker, { x: 1_420, y: 1_280 });
	scene.update(0, 1_000);

	const chasedX = sceneState.enemies[0]!.x;
	Object.assign(phaserState.playerMarker, { x: 900, y: 1_280 });
	scene.update(1_000, 1_000);

	expect(sceneState.enemies[0]!.movementMode).toBe('return');
	expect(sceneState.enemies[0]!.x).toBeGreaterThan(chasedX);
	expect(sceneState.enemies[0]!.x).toBeLessThanOrEqual(sceneState.enemies[0]!.homeX);
	expect(sceneState.enemies[0]!.y).toBe(sceneState.enemies[0]!.homeY);
});

it('keeps ruins slimes on the existing direct chase behavior', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		enemies: Array<{ x: number; movementMode: string }>;
	};

	scene.create({ mapId: 'ruins-threshold' });
	Object.assign(phaserState.playerMarker, { x: 256, y: 480 });

	scene.update(0, 1_000);

	expect(sceneState.enemies[0]!.x).toBeLessThan(416);
	expect(sceneState.enemies[0]!.movementMode).toBe('chase');
});
```

- [ ] **Step 2: Run scene tests to verify failure**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: fail because enemies do not expose `homeX`, `homeY`, or `movementMode`, meadow slimes always chase directly, and they are not clamped to the forest zone.

- [ ] **Step 3: Add enemy movement state**

In `WorldScene.ts`, add:

```ts
type EnemyMovementMode = 'idle' | 'chase' | 'return';
```

Extend `EnemyInstance`:

```ts
homeX: number;
homeY: number;
movementMode: EnemyMovementMode;
```

In `setupEncounters`, initialize:

```ts
homeX: encounter.x,
homeY: encounter.y,
movementMode: 'idle',
```

- [ ] **Step 4: Implement meadow-only leash target resolution**

Add helpers near `getEnemyMoveSpeed`:

```ts
private resolveEnemyMovementTarget(enemy: EnemyInstance): { x: number; y: number } | undefined {
	if (!this.player) {
		return undefined;
	}

	const map = this.resolveMap(this.mapId);
	const forestZone = map.forestZone;

	if (!forestZone || enemy.definition.id !== 'slime-scout') {
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
	const playerInsideForest = this.isPointInsideMapRect(
		this.player.x,
		this.player.y,
		forestZone,
		WorldScene.playerRadius
	);
	const canChase =
		playerInsideForest &&
		distanceToPlayer <= forestZone.aggroRadius &&
		playerDistanceFromHome <= forestZone.leashRadius;

	if (canChase) {
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

private isPointInsideMapRect(x: number, y: number, rect: MapForestZone, padding = 0): boolean {
	const bounds = this.getMapRectBounds(rect);

	return (
		x >= bounds.left - padding &&
		x <= bounds.right + padding &&
		y >= bounds.top - padding &&
		y <= bounds.bottom + padding
	);
}

private clampPointToMapRect(
	x: number,
	y: number,
	rect: MapForestZone,
	padding = 0
): { x: number; y: number } {
	const bounds = this.getMapRectBounds(rect);

	return {
		x: Math.min(Math.max(x, bounds.left + padding), bounds.right - padding),
		y: Math.min(Math.max(y, bounds.top + padding), bounds.bottom - padding)
	};
}
```

Update `getMapRectBounds` type so it accepts `MapForestZone`:

```ts
private getMapRectBounds(
	rect: MapFenceSegment | MapForestDecor | MapForestZone
): LandmarkCollisionBounds {
```

- [ ] **Step 5: Replace direct enemy chase movement with target-based movement**

In `updateEnemyBehavior`, replace the current `distanceToPlayer` chase block with:

```ts
let chaseDistance = 0;
const movementTarget = this.resolveEnemyMovementTarget(enemy);

if (movementTarget) {
	const distanceToTarget = Phaser.Math.Distance.Between(
		movementTarget.x,
		movementTarget.y,
		enemy.x,
		enemy.y
	);

	if (distanceToTarget > 0) {
		const chaseStep =
			this.getEnemyMoveSpeed(enemy) * (Math.min(delta, WorldScene.maxMovementDeltaMs) / 1000);
		chaseDistance = Math.min(
			chaseStep,
			enemy.movementMode === 'chase'
				? Math.max(0, distanceToTarget - WorldScene.enemyAttackReach)
				: distanceToTarget
		);
		const directionX = (movementTarget.x - enemy.x) / distanceToTarget;
		const directionY = (movementTarget.y - enemy.y) / distanceToTarget;
		let nextX = enemy.x + directionX * chaseDistance;
		let nextY = enemy.y + directionY * chaseDistance;
		const map = this.resolveMap(this.mapId);

		if (map.forestZone && enemy.definition.id === 'slime-scout') {
			const clamped = this.clampPointToMapRect(
				nextX,
				nextY,
				map.forestZone,
				WorldScene.enemyRadius
			);
			nextX = clamped.x;
			nextY = clamped.y;
		}

		enemy.x = nextX;
		enemy.y = nextY;
		enemy.marker.x = enemy.x;
		enemy.marker.y = enemy.y;
		this.updateEnemyHealthBar(enemy);
	}
}
```

Keep the existing `updateEnemyMovementAnimation`, contact-distance, attack cooldown, hit, and HUD logic after this block.

- [ ] **Step 6: Run scene tests to verify pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit leash behavior**

Run:

```sh
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat: leash meadow slimes to forest"
```

### Task 6: Final Verification And Browser Review

**Files:**

- Modify only if verification finds defects in touched files.

- [ ] **Step 1: Run focused verification**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts src/lib/game/content/assets.test.ts src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: pass.

- [ ] **Step 2: Run repo checks**

Run:

```sh
bun run check
bun run test
```

Expected: both pass.

- [ ] **Step 3: Start the local app**

Run:

```sh
bun run dev -- --host 127.0.0.1 --port 5174
```

Expected: Vite serves the app on `http://127.0.0.1:5174`.

- [ ] **Step 4: Verify the live route is reachable**

Run:

```sh
curl -I http://127.0.0.1:5174/game
```

Expected: `HTTP/1.1 200 OK`.

- [ ] **Step 5: Inspect in browser**

Open `http://127.0.0.1:5174/game` with the in-app browser and verify:

- the village pickups are gone
- the village fence appears and gates are passable
- the forest reads visually as a separate area east of the village
- slimes stay inside the forest
- slimes stop chasing and return when the hero retreats
- the hero can still enter buildings and reach the ruins route after clearing slimes and satisfying quest requirements

- [ ] **Step 6: Commit verification fixes or create final commit**

If Step 5 required fixes, commit them:

```sh
git add src/lib/game/content src/lib/game/phaser public/game/assets
git commit -m "fix: polish entry forest zone"
```

If there were no fixes after the Task 5 commit, do not create an empty commit.
