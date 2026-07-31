# Actor Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real frame-by-frame down-facing idle, walk, attack, and death/disappearance animations for the hero, slime scout, and ruins warden.

**Architecture:** Keep `starter-pack.png` stable for terrain, UI, pickups, and fallback art. Add a companion `animation-pack.png` with declarative metadata in `src/lib/game/content/assets.ts`, load it in `BootScene`, and have `WorldScene` create animation-capable Phaser sprites for actors while leaving gameplay rules unchanged.

**Tech Stack:** TypeScript, Phaser 4, SvelteKit, Bun, Vitest, pixel-art raster asset generation.

---

## File Structure

- Modify `src/lib/game/content/assets.ts`: add animation sheet metadata, actor display sizes, grid-derived frame rectangles, clips, and enemy-to-actor lookup.
- Modify `src/lib/game/content/assets.test.ts`: validate animation metadata and clip frame references.
- Create `static/game/assets/animation-pack.png`: generated transparent pixel-art actor animation sheet.
- Modify `src/lib/game/phaser/scenes/BootScene.ts`: preload both static and animation sheets.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`: expand Phaser mocks for sprites/animations/events and cover animation behavior.
- Modify `src/lib/game/phaser/scenes/WorldScene.ts`: register animation frames, create actor sprites, play state-driven clips, and delay enemy hiding until death animation completion.

## Animation Sheet Contract

Use this exact grid so code and art stay aligned:

- File: `static/game/assets/animation-pack.png`
- Size: `768 x 2304`
- Cell size: `192 x 192`
- Columns: `4`
- Rows: `12`
- Background: transparent
- Direction: down-facing only
- Frame naming: `<actor><Clip><index>`, for example `heroWalk0`

Rows:

| Row | Actor       | Clip   | Frames |
| --- | ----------- | ------ | ------ |
| 0   | hero        | idle   | 4      |
| 1   | hero        | walk   | 4      |
| 2   | hero        | attack | 4      |
| 3   | hero        | dead   | 4      |
| 4   | slimeScout  | idle   | 4      |
| 5   | slimeScout  | walk   | 4      |
| 6   | slimeScout  | attack | 4      |
| 7   | slimeScout  | dead   | 4      |
| 8   | ruinsWarden | idle   | 4      |
| 9   | ruinsWarden | walk   | 4      |
| 10  | ruinsWarden | attack | 4      |
| 11  | ruinsWarden | dead   | 4      |

Clip settings:

- `idle`: `frameRate: 3`, `repeat: -1`
- `walk`: `frameRate: 6`, `repeat: -1`
- `attack`: `frameRate: 10`, `repeat: 0`
- `dead`: `frameRate: 8`, `repeat: 0`

Display sizes:

- hero: `44 x 60`
- slime scout: `44 x 44`
- ruins warden: `80 x 96`

## Task 1: Animation Metadata

**Files:**

- Modify: `src/lib/game/content/assets.ts`
- Modify: `src/lib/game/content/assets.test.ts`

- [ ] **Step 1: Write failing metadata tests**

Replace `src/lib/game/content/assets.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';

import {
	actorAnimationAssets,
	animationPackAsset,
	getActorAnimationAsset,
	getEnemyActorId,
	starterPackAsset,
	type ActorAnimationId,
	type ActorAnimationKey
} from '$lib/game/content/assets';

const requiredActors: ActorAnimationId[] = ['hero', 'slimeScout', 'ruinsWarden'];
const requiredClips: ActorAnimationKey[] = ['idle', 'walk', 'attack', 'dead'];

describe('starter pack asset frames', () => {
	it('keeps hero and potion frames large enough to avoid visible cropping', () => {
		expect(starterPackAsset.frames.hero).toEqual({ x: 90, y: 80, w: 235, h: 280 });
		expect(starterPackAsset.frames.healFlask).toEqual({ x: 1210, y: 145, w: 150, h: 215 });
	});
});

describe('animation pack metadata', () => {
	it('loads actor animation art from a companion sheet', () => {
		expect(animationPackAsset).toMatchObject({
			key: 'animation-pack',
			path: '/game/assets/animation-pack.png',
			cellWidth: 192,
			cellHeight: 192,
			columns: 4
		});
	});

	it('defines all required actor clips with valid frame references', () => {
		for (const actorId of requiredActors) {
			const actor = actorAnimationAssets[actorId];
			expect(actor.displaySize.width).toBeGreaterThan(0);
			expect(actor.displaySize.height).toBeGreaterThan(0);

			for (const clipName of requiredClips) {
				const clip = actor.clips[clipName];
				expect(clip.key).toBe(`${actorId}-${clipName}`);
				expect(clip.frameRate).toBeGreaterThan(0);
				expect(clip.frames).toHaveLength(4);

				for (const frameName of clip.frames) {
					expect(animationPackAsset.frames[frameName]).toEqual(
						expect.objectContaining({
							x: expect.any(Number),
							y: expect.any(Number),
							w: 192,
							h: 192
						})
					);
				}
			}
		}
	});

	it('maps enemies to their actor animation definitions', () => {
		expect(getEnemyActorId('slime-scout')).toBe('slimeScout');
		expect(getEnemyActorId('ruins-warden')).toBe('ruinsWarden');
		expect(getActorAnimationAsset('hero')).toBe(actorAnimationAssets.hero);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- src/lib/game/content/assets.test.ts --run`

Expected: FAIL because `animationPackAsset`, `actorAnimationAssets`, `getActorAnimationAsset`, `getEnemyActorId`, `ActorAnimationId`, and `ActorAnimationKey` are not exported.

- [ ] **Step 3: Implement metadata**

Append this implementation to `src/lib/game/content/assets.ts` after `getGroundFrameName`:

```ts
export const actorAnimationKeys = ['idle', 'walk', 'attack', 'dead'] as const;
export type ActorAnimationKey = (typeof actorAnimationKeys)[number];

export const actorAnimationIds = ['hero', 'slimeScout', 'ruinsWarden'] as const;
export type ActorAnimationId = (typeof actorAnimationIds)[number];

type AnimationFrameName = `${ActorAnimationId}${Capitalize<ActorAnimationKey>}${number}`;

type AnimationFrame = {
	x: number;
	y: number;
	w: number;
	h: number;
};

type ActorAnimationClip = {
	key: `${ActorAnimationId}-${ActorAnimationKey}`;
	frames: AnimationFrameName[];
	frameRate: number;
	repeat: number;
};

type ActorAnimationAsset = {
	id: ActorAnimationId;
	displaySize: { width: number; height: number };
	clips: Record<ActorAnimationKey, ActorAnimationClip>;
};

const animationCellSize = 192;
const animationFrameCount = 4;
const animationRows: Array<{ actorId: ActorAnimationId; clip: ActorAnimationKey }> = [
	{ actorId: 'hero', clip: 'idle' },
	{ actorId: 'hero', clip: 'walk' },
	{ actorId: 'hero', clip: 'attack' },
	{ actorId: 'hero', clip: 'dead' },
	{ actorId: 'slimeScout', clip: 'idle' },
	{ actorId: 'slimeScout', clip: 'walk' },
	{ actorId: 'slimeScout', clip: 'attack' },
	{ actorId: 'slimeScout', clip: 'dead' },
	{ actorId: 'ruinsWarden', clip: 'idle' },
	{ actorId: 'ruinsWarden', clip: 'walk' },
	{ actorId: 'ruinsWarden', clip: 'attack' },
	{ actorId: 'ruinsWarden', clip: 'dead' }
];

function capitalizeAnimationKey(key: ActorAnimationKey): Capitalize<ActorAnimationKey> {
	return `${key[0]!.toUpperCase()}${key.slice(1)}` as Capitalize<ActorAnimationKey>;
}

function buildAnimationFrames(): Record<AnimationFrameName, AnimationFrame> {
	return Object.fromEntries(
		animationRows.flatMap(({ actorId, clip }, row) =>
			Array.from({ length: animationFrameCount }, (_, column) => [
				`${actorId}${capitalizeAnimationKey(clip)}${column}`,
				{
					x: column * animationCellSize,
					y: row * animationCellSize,
					w: animationCellSize,
					h: animationCellSize
				}
			])
		)
	) as Record<AnimationFrameName, AnimationFrame>;
}

function buildClip(actorId: ActorAnimationId, clip: ActorAnimationKey): ActorAnimationClip {
	const frameRateByClip: Record<ActorAnimationKey, number> = {
		idle: 3,
		walk: 6,
		attack: 10,
		dead: 8
	};
	const repeatByClip: Record<ActorAnimationKey, number> = {
		idle: -1,
		walk: -1,
		attack: 0,
		dead: 0
	};

	return {
		key: `${actorId}-${clip}`,
		frames: Array.from(
			{ length: animationFrameCount },
			(_, index) => `${actorId}${capitalizeAnimationKey(clip)}${index}` as AnimationFrameName
		),
		frameRate: frameRateByClip[clip],
		repeat: repeatByClip[clip]
	};
}

function buildActorAnimationAsset(
	id: ActorAnimationId,
	displaySize: ActorAnimationAsset['displaySize']
): ActorAnimationAsset {
	return {
		id,
		displaySize,
		clips: {
			idle: buildClip(id, 'idle'),
			walk: buildClip(id, 'walk'),
			attack: buildClip(id, 'attack'),
			dead: buildClip(id, 'dead')
		}
	};
}

export const animationPackAsset = {
	key: 'animation-pack',
	path: '/game/assets/animation-pack.png',
	cellWidth: animationCellSize,
	cellHeight: animationCellSize,
	columns: animationFrameCount,
	frames: buildAnimationFrames()
} as const;

export const actorAnimationAssets: Record<ActorAnimationId, ActorAnimationAsset> = {
	hero: buildActorAnimationAsset('hero', { width: 44, height: 60 }),
	slimeScout: buildActorAnimationAsset('slimeScout', { width: 44, height: 44 }),
	ruinsWarden: buildActorAnimationAsset('ruinsWarden', { width: 80, height: 96 })
};

export function getEnemyActorId(enemyId: string): ActorAnimationId {
	if (enemyId === 'ruins-warden') {
		return 'ruinsWarden';
	}

	return 'slimeScout';
}

export function getActorAnimationAsset(actorId: ActorAnimationId): ActorAnimationAsset {
	return actorAnimationAssets[actorId];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- src/lib/game/content/assets.test.ts --run`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/content/assets.ts src/lib/game/content/assets.test.ts
git commit -m "Add actor animation metadata"
```

## Task 2: Generated Animation Sheet

**Files:**

- Create: `static/game/assets/animation-pack.png`

- [ ] **Step 1: Generate the animation sheet**

Use the project `2d-game-asset-workflow` skill and the available image generation tool. Prompt:

```text
Create a transparent-background pixel art sprite sheet for a fantasy JRPG. Exact canvas: 768 by 2304 pixels. Use a 4 column by 12 row grid, each cell exactly 192 by 192 pixels. Do not draw grid lines, labels, text, watermarks, or borders. Every character faces downward/front view. Match the style of a polished 32-bit pixel-art RPG starter pack: clean outlines, saturated colors, readable silhouettes, transparent background.

Rows 0-3: young brown-haired hero with blue scarf, small sword, leather boots. Row 0 idle cycle, 4 subtle breathing frames. Row 1 walk cycle, 4 stepping frames. Row 2 attack cycle, 4 sword slash frames. Row 3 dead cycle, 4 frames ending in a collapsed held pose.

Rows 4-7: glossy green slime scout. Row 4 idle wobble, 4 frames. Row 5 walk/hop cycle, 4 frames. Row 6 attack lunge, 4 frames. Row 7 death/disappear cycle, 4 frames ending with fading/splatter disappearance.

Rows 8-11: large mossy stone ruins warden golem with glowing orange core. Row 8 idle heavy breathing/core glow, 4 frames. Row 9 walk stomp cycle, 4 frames. Row 10 attack slam, 4 frames. Row 11 death/disappear cycle, 4 frames ending with crumbling/fading stones.

Keep every frame centered in its 192 by 192 cell. Keep the hero visually smaller than the slime and much smaller than the warden. Preserve consistent proportions within each actor across all frames.
```

Save the generated PNG to `static/game/assets/animation-pack.png`.

- [ ] **Step 2: Verify the asset exists and dimensions are correct**

Run: `file static/game/assets/animation-pack.png`

Expected: output includes `PNG image data, 768 x 2304`.

- [ ] **Step 3: Commit**

```bash
git add static/game/assets/animation-pack.png
git commit -m "Add actor animation sprite sheet"
```

## Task 3: BootScene Asset Loading

**Files:**

- Modify: `src/lib/game/phaser/scenes/BootScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Write failing preload test**

In `src/lib/game/phaser/scenes/scenes.test.ts`, add `load.image` to `SceneMock`:

```ts
load = {
	image: vi.fn()
};
```

Then add this test inside `describe('BootScene', ...)`:

```ts
it('preloads the static and animation sheets', async () => {
	const { animationPackAsset, starterPackAsset } = await import('$lib/game/content/assets');
	const { BootScene } = await import('./BootScene');
	const scene = new BootScene();

	scene.preload();

	expect(scene.load.image).toHaveBeenCalledWith(starterPackAsset.key, starterPackAsset.path);
	expect(scene.load.image).toHaveBeenCalledWith(animationPackAsset.key, animationPackAsset.path);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: FAIL because `BootScene.preload()` only loads `starterPackAsset`.

- [ ] **Step 3: Load the animation sheet**

Modify `src/lib/game/phaser/scenes/BootScene.ts`:

```ts
import * as Phaser from 'phaser';
import { animationPackAsset, starterPackAsset } from '$lib/game/content/assets';
import { openingMapId } from '$lib/game/content/maps';
import { WorldScene } from './WorldScene';

export class BootScene extends Phaser.Scene {
	static readonly key = 'boot';

	constructor() {
		super(BootScene.key);
	}

	preload() {
		this.load.image(starterPackAsset.key, starterPackAsset.path);
		this.load.image(animationPackAsset.key, animationPackAsset.path);
	}

	create() {
		this.scene.start(WorldScene.key, { mapId: openingMapId });
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/phaser/scenes/BootScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Load actor animation sheet"
```

## Task 4: Sprite Creation And Animation Registration

**Files:**

- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Expand scene mocks and write failing sprite registration test**

In `src/lib/game/phaser/scenes/scenes.test.ts`, update marker mocks so hero and enemy actors can be sprites:

```ts
function createAnimatedMarker() {
	const marker = {
		x: 0,
		y: 0,
		frame: undefined as string | undefined,
		visible: true,
		setDisplaySize: vi.fn(() => marker),
		setTint: vi.fn(() => marker),
		setVisible: vi.fn((visible: boolean) => {
			marker.visible = visible;
			return marker;
		}),
		play: vi.fn(() => marker),
		once: vi.fn(() => marker)
	};

	return marker;
}
```

Replace `playerMarker` and `enemyMarker` creation with `createAnimatedMarker()`.

Add these fields to `SceneMock`:

```ts
anims = {
	exists: vi.fn(() => false),
	create: vi.fn(),
	generateFrameNames: vi.fn((_key: string, config: { frames: string[] }) => config.frames)
};
```

Add `sprite` beside `image`:

```ts
sprite: vi.fn(createImage),
```

Update `createImage` actor routing so animation frames use the same hero and enemy markers:

```ts
function createImage(x: number, y: number, _texture: string, frame?: string) {
	if (frame === 'hero' || frame?.startsWith('hero')) {
		playerMarker.x = x;
		playerMarker.y = y;
		playerMarker.frame = frame;
		return playerMarker;
	}

	if (
		frame === 'slimeScout' ||
		frame === 'ruinsWarden' ||
		frame?.startsWith('slimeScout') ||
		frame?.startsWith('ruinsWarden')
	) {
		enemyMarker.x = x;
		enemyMarker.y = y;
		enemyMarker.frame = frame;
		return enemyMarker;
	}

	const marker = {
		x,
		y,
		frame,
		visible: true,
		setDisplaySize: vi.fn(() => marker),
		setVisible: vi.fn((visible: boolean) => {
			marker.visible = visible;
			return marker;
		})
	};
	imageMarkers.push(marker);
	return marker;
}
```

Then add this test in `describe('WorldScene', ...)`:

```ts
it('registers animation pack frames and creates animated hero and enemy sprites', async () => {
	const { animationPackAsset } = await import('$lib/game/content/assets');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'meadow-entry' });

	expect(scene.add.sprite).toHaveBeenCalledWith(256, 1_280, 'animation-pack', 'heroIdle0');
	expect(scene.add.sprite).toHaveBeenCalledWith(1_280, 1_280, 'animation-pack', 'slimeScoutIdle0');
	expect(phaserState.textureMock.add).toHaveBeenCalledWith(
		'heroIdle0',
		0,
		animationPackAsset.frames.heroIdle0.x,
		animationPackAsset.frames.heroIdle0.y,
		192,
		192
	);
	expect(scene.anims.create).toHaveBeenCalledWith(
		expect.objectContaining({ key: 'hero-idle', frameRate: 3, repeat: -1 })
	);
	expect(scene.anims.create).toHaveBeenCalledWith(
		expect.objectContaining({ key: 'slimeScout-idle', frameRate: 3, repeat: -1 })
	);
	expect(phaserState.playerMarker.play).toHaveBeenCalledWith('hero-idle', true);
	expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('slimeScout-idle', true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: FAIL because `WorldScene` uses `add.image` for actors and does not register animation frames.

- [ ] **Step 3: Implement sprite marker types and imports**

Modify the import from `assets.ts` in `WorldScene.ts`:

```ts
import {
	actorAnimationAssets,
	actorAnimationKeys,
	animationPackAsset,
	getActorAnimationAsset,
	getEnemyActorId,
	getGroundFrameName,
	starterPackAsset,
	type ActorAnimationKey,
	type StarterPackFrameName
} from '$lib/game/content/assets';
```

Replace `EnemyMarker` with:

```ts
type ActorMarker = {
	x: number;
	y: number;
	setDisplaySize: (width: number, height: number) => unknown;
	setTint: (color: number) => unknown;
	setVisible: (visible: boolean) => unknown;
	play: (key: string, ignoreIfPlaying?: boolean) => unknown;
	once: (event: string, callback: () => void) => unknown;
};
```

Change fields:

```ts
private enemyMarker?: ActorMarker;
private player?: ActorMarker;
```

- [ ] **Step 4: Add frame and animation registration helpers**

Add these methods to `WorldScene` near `registerStarterPackFrames()`:

```ts
private registerAnimationPackFrames() {
	const texture = this.textures.get(animationPackAsset.key);

	for (const [frameName, frame] of Object.entries(animationPackAsset.frames)) {
		if (!texture.has(frameName)) {
			texture.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);
		}
	}
}

private ensureActorAnimations() {
	for (const actor of Object.values(actorAnimationAssets)) {
		for (const clipName of actorAnimationKeys) {
			const clip = actor.clips[clipName];

			if (this.anims.exists(clip.key)) {
				continue;
			}

			this.anims.create({
				key: clip.key,
				frames: clip.frames.map((frame) => ({ key: animationPackAsset.key, frame })),
				frameRate: clip.frameRate,
				repeat: clip.repeat
			});
		}
	}
}

private playHeroAnimation(clipName: ActorAnimationKey, ignoreIfPlaying = true) {
	this.player?.play(getActorAnimationAsset('hero').clips[clipName].key, ignoreIfPlaying);
}

private playEnemyAnimation(clipName: ActorAnimationKey, ignoreIfPlaying = true) {
	if (!this.enemy) {
		return;
	}

	this.enemyMarker?.play(
		getActorAnimationAsset(getEnemyActorId(this.enemy.definition.id)).clips[clipName].key,
		ignoreIfPlaying
	);
}
```

- [ ] **Step 5: Use actor sprites in `create` and `setupEncounter`**

In `create`, call registration helpers before rendering ground:

```ts
this.registerStarterPackFrames();
this.registerAnimationPackFrames();
this.ensureActorAnimations();
this.ensureTerrainTilesetTexture();
```

Replace player image creation with:

```ts
const heroAnimation = getActorAnimationAsset('hero');
this.player = this.add.sprite(
	activeSave?.player.x ?? map.spawn.x,
	activeSave?.player.y ?? map.spawn.y,
	animationPackAsset.key,
	heroAnimation.clips.idle.frames[0]
) as ActorMarker;
this.player.setDisplaySize(heroAnimation.displaySize.width, heroAnimation.displaySize.height);
this.playHeroAnimation('idle');
```

In `setupEncounter`, replace enemy image creation with:

```ts
const actorId = getEnemyActorId(encounter.enemyId);
const actorAnimation = getActorAnimationAsset(actorId);
this.enemyMarker = this.add.sprite(
	encounter.x,
	encounter.y,
	animationPackAsset.key,
	actorAnimation.clips.idle.frames[0]
) as ActorMarker;
this.enemyMarker.setDisplaySize(
	actorAnimation.displaySize.width,
	actorAnimation.displaySize.height
);

if (!isCleared) {
	this.playEnemyAnimation('idle');
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Render actors as animated sprites"
```

## Task 5: Hero Animation State

**Files:**

- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Write failing hero behavior tests**

Add these tests to `describe('WorldScene', ...)`:

```ts
it('plays hero walk while moving and idle after stopping', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'meadow-entry' });
	phaserState.playerMarker.play.mockClear();
	phaserState.cursorKeys.right.isDown = true;

	scene.update(0, 100);

	expect(phaserState.playerMarker.play).toHaveBeenLastCalledWith('hero-walk', true);

	phaserState.playerMarker.play.mockClear();
	phaserState.cursorKeys.right.isDown = false;
	scene.update(100, 100);

	expect(phaserState.playerMarker.play).toHaveBeenLastCalledWith('hero-idle', true);
});

it('plays hero attack when auto attacking an enemy', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'meadow-entry' });
	phaserState.playerMarker.play.mockClear();
	Object.assign(phaserState.playerMarker, { x: 1_280, y: 1_280 });

	scene.update(0, 16);

	expect(phaserState.playerMarker.play).toHaveBeenCalledWith('hero-attack', false);
});

it('plays hero dead and stops movement when HP reaches zero', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		playerProgress: { level: number; xp: number; hp: number; attack: number };
	};

	scene.create({ mapId: 'ruins-core' });
	sceneState.playerProgress = { level: 1, xp: 0, hp: 1, attack: 3 };
	Object.assign(phaserState.playerMarker, { x: 640, y: 480 });
	phaserState.cursorKeys.right.isDown = true;

	scene.update(500, 16);
	const xAfterDeath = phaserState.playerMarker.x;
	scene.update(600, 1000);

	expect(phaserState.playerMarker.play).toHaveBeenCalledWith('hero-dead', false);
	expect(phaserState.playerMarker.x).toBe(xAfterDeath);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: FAIL because movement, attack, and death do not drive hero animation state yet.

- [ ] **Step 3: Add hero state fields**

Add fields to `WorldScene`:

```ts
private heroAnimationLockedUntil = 0;
private heroDefeated = false;
private heroVisualState: ActorAnimationKey = 'idle';
```

Reset them in `create`:

```ts
this.heroAnimationLockedUntil = 0;
this.heroDefeated = false;
this.heroVisualState = 'idle';
```

- [ ] **Step 4: Add hero animation helpers**

Add methods:

```ts
private setHeroAnimation(clipName: ActorAnimationKey, ignoreIfPlaying = true) {
	if (this.heroVisualState === clipName && ignoreIfPlaying) {
		return;
	}

	this.heroVisualState = clipName;
	this.playHeroAnimation(clipName, ignoreIfPlaying);
}

private updateHeroMovementAnimation(direction: { x: number; y: number }, time: number) {
	if (this.heroDefeated || time < this.heroAnimationLockedUntil) {
		return;
	}

	this.setHeroAnimation(direction.x !== 0 || direction.y !== 0 ? 'walk' : 'idle');
}

private playHeroAttackAnimation(time: number) {
	this.heroAnimationLockedUntil = time + 400;
	this.setHeroAnimation('attack', false);
}

private defeatHero() {
	if (this.heroDefeated) {
		return;
	}

	this.heroDefeated = true;
	this.setHeroAnimation('dead', false);
}
```

- [ ] **Step 5: Wire hero state into `update`**

Near the top of `update`, after the simulation pause guard, add:

```ts
if (this.heroDefeated) {
	return;
}
```

After resolving `direction`, call:

```ts
this.updateHeroMovementAnimation(direction, time);
```

When the hero auto-attack lands, before `showAttackFlash()`, add:

```ts
this.playHeroAttackAnimation(time);
```

In `updateEnemyBehavior`, after resolving damage and before publishing HUD state, add:

```ts
if (this.playerProgress.hp === 0) {
	this.defeatHero();
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Drive hero animation state"
```

## Task 6: Enemy Animation State And Death Completion

**Files:**

- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Write failing enemy animation tests**

Add these tests:

```ts
it('plays enemy walk while chasing and attack when contact damage lands', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		enemy: { x: number; y: number; attackCooldownUntil: number };
	};

	scene.create({ mapId: 'ruins-core' });
	phaserState.enemyMarker.play.mockClear();
	Object.assign(phaserState.playerMarker, { x: 456, y: 480 });

	scene.update(0, 1000);

	expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('ruinsWarden-walk', true);

	phaserState.enemyMarker.play.mockClear();
	Object.assign(phaserState.playerMarker, { x: sceneState.enemy.x, y: sceneState.enemy.y });
	sceneState.enemy.attackCooldownUntil = 0;
	scene.update(500, 16);

	expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('ruinsWarden-attack', false);
});

it('plays enemy dead animation before hiding encounter art and health bars', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	let deathCallback: (() => void) | undefined;
	phaserState.enemyMarker.once.mockImplementation((_event: string, callback: () => void) => {
		deathCallback = callback;
		return phaserState.enemyMarker;
	});

	scene.create({ mapId: 'meadow-entry' });
	Object.assign(phaserState.playerMarker, { x: 1_280, y: 1_280 });

	scene.update(0, 16);

	expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('slimeScout-dead', false);
	expect(phaserState.enemyMarker.setVisible).not.toHaveBeenCalledWith(false);

	deathCallback?.();

	expect(phaserState.enemyMarker.setVisible).toHaveBeenCalledWith(false);
	expect(phaserState.enemyHealthBarBg.setVisible).toHaveBeenCalledWith(false);
	expect(phaserState.enemyHealthBarFill.setVisible).toHaveBeenCalledWith(false);
});
```

Update the existing `defeats an enemy within the melee attack window and applies the xp reward` test. Replace:

```ts
expect(phaserState.enemyMarker.setVisible).toHaveBeenCalledWith(false);
```

with:

```ts
expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('slimeScout-dead', false);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: FAIL because enemy walk/attack/dead state and delayed hiding are not implemented.

- [ ] **Step 3: Add enemy visual state fields**

Add fields to `WorldScene`:

```ts
private enemyDeathAnimationPending = false;
private enemyVisualState: ActorAnimationKey = 'idle';
```

Reset them in `create`:

```ts
this.enemyDeathAnimationPending = false;
this.enemyVisualState = 'idle';
```

- [ ] **Step 4: Add enemy animation helpers**

Add methods:

```ts
private setEnemyAnimation(clipName: ActorAnimationKey, ignoreIfPlaying = true) {
	if (!this.enemy || this.enemy.defeated || this.enemyDeathAnimationPending) {
		return;
	}

	if (this.enemyVisualState === clipName && ignoreIfPlaying) {
		return;
	}

	this.enemyVisualState = clipName;
	this.playEnemyAnimation(clipName, ignoreIfPlaying);
}

private playEnemyDeathAnimation() {
	if (!this.enemy || this.enemyDeathAnimationPending) {
		return;
	}

	this.enemyDeathAnimationPending = true;
	this.enemyVisualState = 'dead';
	this.playEnemyAnimation('dead', false);

	const hideDefeatedEnemy = () => {
		this.enemyMarker?.setVisible(false);
		this.enemyHealthBarBg?.setVisible(false);
		this.enemyHealthBarFill?.setVisible(false);
	};

	const completionEvent = `animationcomplete-${getActorAnimationAsset(
		getEnemyActorId(this.enemy.definition.id)
	).clips.dead.key}`;

	if (this.enemyMarker?.once) {
		this.enemyMarker.once(completionEvent, hideDefeatedEnemy);
		return;
	}

	hideDefeatedEnemy();
}
```

- [ ] **Step 5: Wire enemy state into behavior**

In `finishEncounter`, replace immediate marker and health bar hiding:

```ts
this.enemyMarker?.setVisible(false);
this.enemyHealthBarBg?.setVisible(false);
this.enemyHealthBarFill?.setVisible(false);
```

with:

```ts
this.playEnemyDeathAnimation();
```

In `updateEnemyBehavior`, after moving the enemy and updating the health bar, add:

```ts
this.setEnemyAnimation(chaseDistance > 0 ? 'walk' : 'idle');
```

When enemy contact damage lands, before publishing HUD state, add:

```ts
this.setEnemyAnimation('attack', false);
```

- [ ] **Step 6: Preserve loaded cleared encounter behavior**

In `setupEncounter`, keep the existing `isCleared` block hiding the marker and health bars immediately. Do not play the dead animation for enemies already cleared in saved state.

- [ ] **Step 7: Run tests to verify they pass**

Run: `bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Drive enemy animation state"
```

## Task 7: Full Verification

**Files:**

- Review: `src/lib/game/content/assets.ts`
- Review: `src/lib/game/content/assets.test.ts`
- Review: `src/lib/game/phaser/scenes/BootScene.ts`
- Review: `src/lib/game/phaser/scenes/WorldScene.ts`
- Review: `src/lib/game/phaser/scenes/scenes.test.ts`
- Review: `static/game/assets/animation-pack.png`

- [ ] **Step 1: Run focused tests**

Run: `bun run test:unit -- src/lib/game/content/assets.test.ts src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: PASS.

- [ ] **Step 2: Run all unit tests**

Run: `bun run test:unit -- --run`

Expected: PASS.

- [ ] **Step 3: Run type checks**

Run: `bun run check`

Expected: PASS.

- [ ] **Step 4: Run formatter/linter check**

Run: `bun run lint`

Expected: PASS.

- [ ] **Step 5: Start dev server**

Run: `bun run dev`

Expected: dev server starts on `http://localhost:5173`.

- [ ] **Step 6: Manual game verification**

Open `http://localhost:5173/game` and verify:

- hero idles when still
- hero walks with arrow keys or WASD
- hero attack animation plays when near the slime
- slime disappearance animation plays before the slime hides
- entering ruins still works after slime defeat
- warden walk/attack/death animations play in the boss map
- hero dead animation plays if HP reaches 0
- HUD stats, inventory, save, and map transitions still behave as before

- [ ] **Step 7: Stop dev server**

Stop the running `bun run dev` process.

- [ ] **Step 8: Final commit if verification fixes were needed**

If Step 1-6 required additional fixes, commit them:

```bash
git add src/lib/game/content/assets.ts src/lib/game/content/assets.test.ts src/lib/game/phaser/scenes/BootScene.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts static/game/assets/animation-pack.png
git commit -m "Verify actor animation flow"
```
