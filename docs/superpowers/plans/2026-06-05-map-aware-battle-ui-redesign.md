# Map-Aware Battle UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Gliese battles with map-aware image backgrounds, a larger arena, and more expressive attack effects while preserving the existing real-time combat and result handoff.

**Architecture:** Keep `BattleScene` as the transient combat/presentation scene and keep `WorldScene` as the permanent save-state coordinator. Centralize battle background asset metadata and map-to-environment selection in `src/lib/game/content/assets.ts`, preload the images in `BootScene`, and have `BattleScene` render presentation layers before actors and effects.

**Tech Stack:** TypeScript, Phaser, Vite, Svelte 5 HUD bridge, Bun, Vitest, Playwright/manual browser smoke.

---

## Scope Check

This is one implementation slice. Asset metadata, background preload, larger arena math,
and attack effects all change the same `BattleScene` presentation path and should land
together. It does not change rewards, quest progress, defeat behavior, or the blocking
summary handoff.

## File Structure

- Modify `src/lib/game/content/assets.ts`: add `battleBackgroundAssets`,
  `BattleEnvironmentId`, `getBattleEnvironmentId()`, and `getBattleBackgroundAsset()`.
- Modify `src/lib/game/content/assets.test.ts`: prove environment selection, fallback,
  and asset metadata.
- Modify `src/lib/game/phaser/scenes/BootScene.ts`: preload battle background images.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`: expect preloads, larger arena
  spawn positions, environment background rendering, camera centering, and attack FX.
- Modify `src/lib/game/phaser/scenes/BattleScene.ts`: enlarge arena, render the selected
  background, add presentation layers, add slash/impact effects, add a short hit-stop,
  and keep result behavior unchanged.
- Create `public/game/assets/battle-ruins.png`: ruins battle background.
- Create `public/game/assets/battle-meadow.png`: meadow battle background.
- Create `public/game/assets/battle-neutral.png`: neutral fallback background.

## Task 1: Battle Environment Asset Metadata

**Files:**
- Modify: `src/lib/game/content/assets.test.ts`
- Modify: `src/lib/game/content/assets.ts`

- [ ] **Step 1: Write failing asset metadata tests**

In `src/lib/game/content/assets.test.ts`, add these imports to the existing import from
`$lib/game/content/assets`:

```ts
	battleBackgroundAssets,
	getBattleBackgroundAsset,
	getBattleEnvironmentId,
```

Then add this test block after the starter pack tests:

```ts
describe('battle background asset metadata', () => {
	it('defines map-aware battle background assets', () => {
		expect(battleBackgroundAssets).toEqual({
			meadow: {
				key: 'battle-background-meadow',
				path: '/game/assets/battle-meadow.png'
			},
			ruins: {
				key: 'battle-background-ruins',
				path: '/game/assets/battle-ruins.png'
			},
			neutral: {
				key: 'battle-background-neutral',
				path: '/game/assets/battle-neutral.png'
			}
		});
	});

	it('maps source maps to battle environments with a neutral fallback', () => {
		expect(getBattleEnvironmentId('meadow-entry')).toBe('meadow');
		expect(getBattleEnvironmentId('ruins-threshold')).toBe('ruins');
		expect(getBattleEnvironmentId('ruins-core')).toBe('ruins');
		expect(getBattleEnvironmentId('hero-house')).toBe('neutral');
		expect(getBattleEnvironmentId('unknown-map')).toBe('neutral');
	});

	it('returns the background asset for the resolved environment', () => {
		expect(getBattleBackgroundAsset('ruins-core')).toBe(battleBackgroundAssets.ruins);
		expect(getBattleBackgroundAsset('villager-house-1')).toBe(battleBackgroundAssets.neutral);
	});
});
```

- [ ] **Step 2: Run the failing asset tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/assets.test.ts
```

Expected: FAIL because `battleBackgroundAssets`, `getBattleEnvironmentId`, and
`getBattleBackgroundAsset` are not exported yet.

- [ ] **Step 3: Add battle background metadata**

In `src/lib/game/content/assets.ts`, add this block after `starterPackAsset`:

```ts
export const battleBackgroundAssets = {
	meadow: {
		key: 'battle-background-meadow',
		path: '/game/assets/battle-meadow.png'
	},
	ruins: {
		key: 'battle-background-ruins',
		path: '/game/assets/battle-ruins.png'
	},
	neutral: {
		key: 'battle-background-neutral',
		path: '/game/assets/battle-neutral.png'
	}
} as const;

export type BattleEnvironmentId = keyof typeof battleBackgroundAssets;

const battleEnvironmentByMapId: Partial<Record<string, BattleEnvironmentId>> = {
	'meadow-entry': 'meadow',
	'ruins-threshold': 'ruins',
	'ruins-core': 'ruins'
};

export function getBattleEnvironmentId(mapId: string): BattleEnvironmentId {
	return battleEnvironmentByMapId[mapId] ?? 'neutral';
}

export function getBattleBackgroundAsset(mapId: string) {
	return battleBackgroundAssets[getBattleEnvironmentId(mapId)];
}
```

- [ ] **Step 4: Run the asset tests again**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/assets.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit metadata**

Run:

```sh
git add src/lib/game/content/assets.ts src/lib/game/content/assets.test.ts
git commit -m "Add battle background asset metadata"
```

## Task 2: Battle Background Assets And Preload

**Files:**
- Create: `public/game/assets/battle-ruins.png`
- Create: `public/game/assets/battle-meadow.png`
- Create: `public/game/assets/battle-neutral.png`
- Modify: `src/lib/game/phaser/scenes/BootScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Generate/import battle background images**

Create three 16:9 PNG images under `public/game/assets/`:

```text
public/game/assets/battle-ruins.png
public/game/assets/battle-meadow.png
public/game/assets/battle-neutral.png
```

Use these art directions:

```text
battle-ruins.png: SNES-inspired 2D JRPG battle background, 16:9, top-down three-quarter stone ruins arena, broken pillars near edges, faint teal cracks in stone, darker vignette edges, readable open center, no characters, no text, no UI.

battle-meadow.png: SNES-inspired 2D JRPG battle background, 16:9, top-down three-quarter grassy clearing, dirt path curves near edges, small flowers and shrubs at corners, warm village-adventure palette, readable open center, no characters, no text, no UI.

battle-neutral.png: SNES-inspired 2D JRPG battle background, 16:9, top-down three-quarter simple packed-earth training ground, muted stone border near edges, readable open center, no characters, no text, no UI.
```

These images do not require transparency, so no alpha-cleanup pass is needed.

- [ ] **Step 2: Write failing preload expectations**

In the `BootScene` preload test in `src/lib/game/phaser/scenes/scenes.test.ts`, add
`battleBackgroundAssets` to the imported assets:

```ts
			battleBackgroundAssets,
```

Then add these expectations after the existing image preload expectations:

```ts
		for (const asset of Object.values(battleBackgroundAssets)) {
			expect(scene.load.image).toHaveBeenCalledWith(asset.key, asset.path);
		}
```

- [ ] **Step 3: Run the failing scene tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL because `BootScene.preload()` does not load the battle backgrounds yet.

- [ ] **Step 4: Preload battle backgrounds**

In `src/lib/game/phaser/scenes/BootScene.ts`, add `battleBackgroundAssets` to the import
from `$lib/game/content/assets`, then add this loop at the end of `preload()`:

```ts
		for (const asset of Object.values(battleBackgroundAssets)) {
			this.load.image(asset.key, asset.path);
		}
```

- [ ] **Step 5: Run the preload tests again**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit assets and preload**

Run:

```sh
git add public/game/assets/battle-ruins.png public/game/assets/battle-meadow.png public/game/assets/battle-neutral.png src/lib/game/phaser/scenes/BootScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Add battle background assets"
```

## Task 3: Larger Map-Aware Battle Arena

**Files:**
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/phaser/scenes/BattleScene.ts`

- [ ] **Step 1: Write failing scene tests for larger arena and background rendering**

Update the existing `BattleScene` test named
`spawns real generated enemies around the compact arena` to
`spawns real generated enemies around the larger battle arena`, and change the expected
spawn fragments to:

```ts
		expect(state.enemies.map((enemy) => ({ x: enemy.x, y: enemy.y }))).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ x: 448 }),
				expect.objectContaining({ y: 74 }),
				expect.objectContaining({ x: 790 }),
				expect.objectContaining({ x: 106 })
			])
		);
```

Update the camera-centering tests:

```ts
	it('centers the larger arena when the canvas matches the arena size', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		Object.assign(scene.scale, { width: 896, height: 504 });

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 4, defense: 0 }
		});

		expect(phaserState.mainCamera.scrollX).toBe(0);
		expect(phaserState.mainCamera.scrollY).toBe(0);
	});

	it('offsets the camera to center the larger arena on a larger canvas', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();
		Object.assign(scene.scale, { width: 1280, height: 720 });

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 4, defense: 0 }
		});

		expect(phaserState.mainCamera.scrollX).toBe(-192);
		expect(phaserState.mainCamera.scrollY).toBe(-108);
	});
```

Add this new test inside `describe('BattleScene')`:

```ts
	it('renders the source-map battle background before actors', async () => {
		const { battleBackgroundAssets } = await import('$lib/game/content/assets');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'ruins-core',
			sourceEncounterId: 'ruins-warden',
			sourceEnemyId: 'ruins-warden',
			returnPosition: { mapId: 'ruins-core', x: 4_992, y: 3_200, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 4, defense: 0 }
		});

		expect(scene.add.image).toHaveBeenCalledWith(
			448,
			252,
			battleBackgroundAssets.ruins.key
		);
		expect(phaserState.imageMarkers[0]?.setDisplaySize).toHaveBeenCalledWith(896, 504);
		const backgroundCallOrder = vi.mocked(scene.add.image).mock.invocationCallOrder[0];
		const heroCallOrder = vi.mocked(scene.add.sprite).mock.invocationCallOrder[0];
		expect(backgroundCallOrder).toBeLessThan(heroCallOrder);
	});
```

- [ ] **Step 2: Run the failing scene tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL because the arena is still `640x360` and no background image is rendered.

- [ ] **Step 3: Enlarge the arena and render the selected background**

In `src/lib/game/phaser/scenes/BattleScene.ts`, add `getBattleBackgroundAsset` to the
asset import. Change the arena constant:

```ts
	private static readonly arena = { width: 896, height: 504, padding: 48 };
```

Replace the two floor rectangles in `create()` with:

```ts
		this.createBattleBackdrop(payload.sourceMapId);
```

Add this method:

```ts
	private createBattleBackdrop(sourceMapId: string) {
		const background = getBattleBackgroundAsset(sourceMapId);
		this.add
			.image(
				BattleScene.arena.width / 2,
				BattleScene.arena.height / 2,
				background.key
			)
			.setDisplaySize(BattleScene.arena.width, BattleScene.arena.height);
		this.add.rectangle(
			BattleScene.arena.width / 2,
			BattleScene.arena.height / 2,
			BattleScene.arena.width,
			BattleScene.arena.height,
			0x07130f,
			0.18
		);
		this.add.rectangle(
			BattleScene.arena.width / 2,
			BattleScene.arena.height / 2,
			BattleScene.arena.width - 54,
			BattleScene.arena.height - 54,
			0xf8d78f,
			0.08
		);
	}
```

Update `createHero()` so the hero starts at the arena center:

```ts
		this.player = this.add.sprite(
			BattleScene.arena.width / 2,
			BattleScene.arena.height / 2,
			animationPackAsset.key,
			heroAnimation.clips.idle.frames[0]
		) as ActorMarker;
```

Update `getEnemySpawnPositions()` radius values:

```ts
		const radiusX = 342;
		const radiusY = 178;
```

- [ ] **Step 4: Run the larger arena tests again**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit larger arena/background rendering**

Run:

```sh
git add src/lib/game/phaser/scenes/BattleScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Render map-aware battle arenas"
```

## Task 4: Attack Slash, Impact FX, And Hit-Stop

**Files:**
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/phaser/scenes/BattleScene.ts`

- [ ] **Step 1: Extend the Phaser test mock for tweens and camera shake**

In `phaserState.mainCamera`, add:

```ts
		shake: vi.fn()
```

In `phaserState.reset()`, add:

```ts
			mainCamera.shake.mockClear();
```

In `SceneMock`, add:

```ts
		tweens = {
			add: vi.fn((config: { onComplete?: () => void }) => {
				config.onComplete?.();
				return config;
			})
		};
```

- [ ] **Step 2: Write failing tests for hero and enemy attack effects**

Add these tests inside `describe('BattleScene')`:

```ts
	it('plays slash and impact presentation when the hero attacks', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 1, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 448, y: 252 });
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number }>;
			hitStopUntil: number;
		};
		state.enemies[0]!.x = 458;
		state.enemies[0]!.y = 252;

		scene.update(0, 16);

		expect(scene.add.arc).toHaveBeenCalled();
		expect(phaserState.mainCamera.shake).toHaveBeenCalledWith(80, 0.004);
		expect(scene.tweens.add).toHaveBeenCalled();
		expect(state.hitStopUntil).toBe(70);
	});

	it('skips movement updates during hit-stop but keeps time advancing afterward', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 1, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 448, y: 252 });
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number }>;
			hitStopUntil: number;
		};
		state.enemies[0]!.x = 458;
		state.enemies[0]!.y = 252;
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 16);
		const xDuringStrike = phaserState.playerMarker.x;
		scene.update(20, 16);

		expect(phaserState.playerMarker.x).toBe(xDuringStrike);
		scene.update(80, 16);
		expect(phaserState.playerMarker.x).toBeGreaterThan(xDuringStrike);
	});

	it('plays a compact impact pulse when an enemy attacks the hero', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { BattleScene } = await import('./BattleScene');
		const scene = new BattleScene();

		scene.create({
			saveState: createNewSaveState(),
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			enemyCount: 1,
			hero: { hp: 20, maxHp: 20, attack: 1, defense: 0 }
		});
		Object.assign(phaserState.playerMarker, { x: 448, y: 252 });
		const state = scene as unknown as {
			enemies: Array<{ x: number; y: number; attackCooldownUntil: number }>;
		};
		state.enemies[0]!.x = 448;
		state.enemies[0]!.y = 252;
		state.enemies[0]!.attackCooldownUntil = 0;
		vi.mocked(scene.add.arc).mockClear();

		scene.update(0, 16);

		expect(scene.add.arc).toHaveBeenCalledWith(448, 252, 12, 0, Math.PI * 2, false, 0xff6b6b, 0.65);
		expect(phaserState.mainCamera.shake).toHaveBeenCalledWith(60, 0.003);
	});
```

- [ ] **Step 3: Run the failing FX tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL because slash/impact effects, tween calls, camera shake, and hit-stop do
not exist yet.

- [ ] **Step 4: Add presentation marker types and hit-stop state**

In `BattleScene.ts`, extend `OverlayMarker` with:

```ts
	setAlpha?: (alpha: number) => unknown;
	setOrigin?: (x: number, y?: number) => unknown;
```

Add constants:

```ts
	private static readonly hitStopMs = 70;
	private static readonly heroLungeDistance = 18;
```

Add state:

```ts
	private hitStopUntil = 0;
```

Reset it in `resetRuntimeState()`:

```ts
		this.hitStopUntil = 0;
```

At the start of `update()` after the pending-result guard, add:

```ts
		this.updateHitReactions(time);

		if (time < this.hitStopUntil) {
			return;
		}
```

Remove the earlier duplicate `this.updateHitReactions(time);` call if this creates two
calls in the method.

- [ ] **Step 5: Add hero and enemy effect methods**

Add these methods to `BattleScene.ts`:

```ts
	private playHeroAttackPresentation(target: BattleEnemyInstance, time: number) {
		if (!this.player) {
			return;
		}

		this.hitStopUntil = Math.max(this.hitStopUntil, time + BattleScene.hitStopMs);
		const dx = target.x - this.player.x;
		const dy = target.y - this.player.y;
		const distance = Math.max(Math.hypot(dx, dy), 1);
		const lungeX = (dx / distance) * BattleScene.heroLungeDistance;
		const lungeY = (dy / distance) * BattleScene.heroLungeDistance;
		const startX = this.player.x;
		const startY = this.player.y;
		const angle = Math.atan2(dy, dx);

		this.tweens.add({
			targets: this.player,
			x: startX + lungeX,
			y: startY + lungeY,
			duration: 70,
			yoyo: true,
			ease: 'Sine.easeOut'
		});

		const slash = this.add.arc(
			(startX + target.x) / 2,
			(startY + target.y) / 2,
			26,
			-Math.PI / 3,
			Math.PI / 3,
			false,
			0xfff0a8,
			0.85
		) as OverlayMarker;
		slash.setOrigin?.(0.5);
		slash.setScale(1.25, 0.55);

		this.tweens.add({
			targets: slash,
			alpha: 0,
			scaleX: 1.8,
			scaleY: 0.75,
			duration: 120,
			ease: 'Sine.easeOut',
			onComplete: () => slash.setVisible(false)
		});

		const impact = this.add.arc(
			target.x,
			target.y,
			14,
			0,
			Math.PI * 2,
			false,
			0xffffff,
			0.75
		) as OverlayMarker;
		this.tweens.add({
			targets: impact,
			alpha: 0,
			scaleX: 1.8,
			scaleY: 1.8,
			duration: 100,
			ease: 'Sine.easeOut',
			onComplete: () => impact.setVisible(false)
		});

		this.cameras.main.shake?.(80, 0.004);
		void angle;
	}

	private playEnemyAttackPresentation(enemy: BattleEnemyInstance) {
		if (!this.player) {
			return;
		}

		const impact = this.add.arc(
			this.player.x,
			this.player.y,
			12,
			0,
			Math.PI * 2,
			false,
			0xff6b6b,
			0.65
		) as OverlayMarker;
		this.tweens.add({
			targets: impact,
			alpha: 0,
			scaleX: 1.6,
			scaleY: 1.6,
			duration: 100,
			ease: 'Sine.easeOut',
			onComplete: () => impact.setVisible(false)
		});
		this.cameras.main.shake?.(60, 0.003);
		void enemy;
	}
```

If TypeScript reports that `shake` is not present on the camera type, use:

```ts
		this.cameras.main.shake(80, 0.004);
```

Phaser's `Camera` type includes `shake`; the optional call is only needed if the local
mock typing forces it.

- [ ] **Step 6: Trigger the effects from attacks**

In `tryHeroAttack()`, after `this.setHeroAnimation('attack', false);`, add:

```ts
		this.playHeroAttackPresentation(target, time);
```

In `enemyAttackHero()`, after `this.playEnemyAnimation(enemy, 'attack', false);`, add:

```ts
		this.playEnemyAttackPresentation(enemy);
```

- [ ] **Step 7: Run FX tests again**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit attack presentation**

Run:

```sh
git add src/lib/game/phaser/scenes/BattleScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Add battle attack presentation effects"
```

## Task 5: Full Verification And Browser Smoke

**Files:**
- Modify only files needed to fix failures found by verification.

- [ ] **Step 1: Run focused unit tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/content/assets.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run Svelte and TypeScript checks**

Run:

```sh
bun run check
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```sh
bun run build
```

Expected: PASS and `dist/` generated.

- [ ] **Step 4: Start the dev server**

Run:

```sh
bun run dev
```

Expected: Vite serves the app, usually at `http://localhost:5173/`.

- [ ] **Step 5: Browser smoke test**

Open the app in the browser and enter at least one meadow battle and one ruins battle.
Verify:

- the canvas is nonblank
- `meadow-entry` battles use `battle-meadow.png`
- `ruins-threshold` or `ruins-core` battles use `battle-ruins.png`
- actors are centered and readable in the larger `896x504` arena
- enemy health bars track enemies after movement
- hero attacks show lunge, slash, impact, camera shake, and short hit-stop
- enemy attacks show the compact red impact pulse
- the blocking victory/defeat summary still gates return to exploration

- [ ] **Step 6: Commit any verification fixes**

If verification required fixes, commit them:

```sh
git add src/lib/game/content/assets.ts src/lib/game/content/assets.test.ts src/lib/game/phaser/scenes/BootScene.ts src/lib/game/phaser/scenes/BattleScene.ts src/lib/game/phaser/scenes/scenes.test.ts public/game/assets/battle-ruins.png public/game/assets/battle-meadow.png public/game/assets/battle-neutral.png
git commit -m "Fix battle UI verification issues"
```

If no fixes were needed, do not create an empty commit.
