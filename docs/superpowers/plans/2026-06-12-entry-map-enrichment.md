# Entry Map Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the opening overworld `meadow-entry` into a dense six-region JRPG world — enriching the existing village and forest, and adding four story-foreshadowing regions (Mistfen Marsh, Tidewatch Coast & Ferry Crossing, Silverpine Shrine Path, Crossroads & Sealed Castle Gate), each scenic, ambient, and visibly gated.

**Architecture:** Three behavior-preserving engine refactors first — a generalized `mapDecor` render+collision layer (replacing the forest-only path), a dedicated `terrain-tiles.png` ground tileset with an expanded `MapGroundTile`, and per-region authoring modules under `content/maps/`. New art is generated via the Codex CLI and declared in `assets.ts`. Region content is then authored module-by-module, validated by an extended `maps.test.ts` integrity harness.

**Tech Stack:** TypeScript, Svelte 5 (runes), Phaser 4, Vitest (server + browser projects), Playwright, bun.

**Spec:** `docs/superpowers/specs/2026-06-12-entry-map-enrichment-design.md`

---

## Important notes for the implementer

- **Branch:** All work happens on the existing `entry-map-enrichment` branch (already checked out). Verify with `git branch --show-current` → `entry-map-enrichment`.
- **Coordinate system:** The world is 6,400 × 6,400px (200 × 200 tiles @ 32px). All map rects are **center-based**: `{ x, y, width, height }` means a box centered on `(x, y)`. Origin is top-left, +y points **down**. Player spawns at `(700, 5600)` in the village (south-center). (Originally `(1536, 5550)`; moved during the compact-cluster repositioning in commit 9480172.)
- **Decor coordinates are starting values.** Tasks 13–18 give concrete coordinates that satisfy the test harness (in-bounds, valid frames). They are intended to be **visually tuned in `bun run dev`** — nudge positions/sizes freely; the unit tests guarantee the invariants stay correct. Do not treat the exact pixel values as sacred.
- **Codex image generation:** Asset tasks delegate image generation to the Codex CLI (it has the image tool). If Codex is unavailable, use the `imagegen` skill as a fallback. Generated PNGs go in `public/game/assets/`. The `assets.ts` frame declarations + unit tests do **not** require the image to exist (they only check coordinate math), so engine/test tasks are never blocked on art. Runtime visuals require the PNG; verify those during the manual walkthrough (Task 20).
- **Test commands:**
  - One-shot unit run: `bun run test:unit -- --run`
  - Single file: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`
  - Type check: `bun run check`
  - Lint: `bun run lint`
  - e2e: `bun run test:e2e`
- **Commit after every task.** Co-author trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

## Phase 1 — Engine foundation (behavior-preserving)

### Task 1: Extract map types into `content/maps/types.ts` and add `MapDecor`

**Files:**
- Create: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps.ts` (remove the moved type bodies; import + re-export from the new module)
- Test: `src/lib/game/content/maps.test.ts` (existing suite is the regression guard)

- [ ] **Step 1: Create the types module.** Create `src/lib/game/content/maps/types.ts` and move every `Map*` interface/type currently declared at the top of `maps.ts` (lines ~11–152: `MapTransition`, `MapTransitionMarker`, `MapEncounter`, `MapPickup`, `MapNpcRole`, `MapNpc`, `MapLandmark`, `MapRect`, `MapGroundTile`, `MapGroundPatch`, `MapBlockerKind`, `MapBlocker`, `MapCombatBounds`, `MapForestZone`, `MapFenceSegment`, `MapInteriorPropDepth`, `MapInteriorProp`, `MapAmbientNpcRole`, `MapAmbientNpc`, `WorldMapDefinition`) into it verbatim. **Delete** `MapForestDecor` (it is replaced by `MapDecor`). Keep `MapForestZone` (still used for enemy leashing). Add the new decor type and field.

Top of the new file:

```ts
import type {
	InteriorPropFrameName,
	NpcFrameName,
	StarterPackFrameName
} from '$lib/game/content/assets';
import type { NpcDialogueId } from '$lib/game/content/dialogue';
import type { DefinitionRegistry, MapDefinition } from '$lib/game/core/types';
import { t, type MessageKey } from '$lib/game/i18n/translate';
```

(Drop the now-unused `ForestDressingFrameName` import.)

Add this decor type (replacing `MapForestDecor`):

```ts
export type MapDecorDepth = 'floor' | 'furniture' | 'foreground';

export interface MapDecor extends MapRect {
	textureKey: string;
	frameName: string;
	depth?: MapDecorDepth;
	mode?: 'image' | 'tile';
	collision?: MapRect;
	alpha?: number;
}
```

In `WorldMapDefinition`, replace the `forestDecor?: MapForestDecor[];` field with:

```ts
	mapDecor?: MapDecor[];
```

Keep `forestZone?: MapForestZone;`. Also move the `WorldMapDefinitionSource`, `MapNpcSource`, `MapLandmarkSource` helper types and the `addEnglishMapText` function **out** of `types.ts` — they stay in `maps.ts` for now (Task 12 relocates `addEnglishMapText`). Export `MapGroundTile` as before:

```ts
export type MapGroundTile = Extract<
	StarterPackFrameName,
	'grassTile' | 'pathTile' | 'ruinsFloorTile' | 'stoneWallTile'
>;
```

(Task 5 widens this once the dedicated tileset exists.)

- [ ] **Step 2: Re-export from `maps.ts`.** At the top of `src/lib/game/content/maps.ts`, delete the moved type declarations and replace them with a re-export so existing import paths keep working:

```ts
export type {
	MapTransition,
	MapTransitionMarker,
	MapEncounter,
	MapPickup,
	MapNpcRole,
	MapNpc,
	MapLandmark,
	MapRect,
	MapGroundTile,
	MapGroundPatch,
	MapBlockerKind,
	MapBlocker,
	MapCombatBounds,
	MapForestZone,
	MapFenceSegment,
	MapInteriorPropDepth,
	MapInteriorProp,
	MapAmbientNpcRole,
	MapAmbientNpc,
	MapDecor,
	MapDecorDepth,
	WorldMapDefinition
} from '$lib/game/content/maps/types';

import type {
	MapDecor,
	MapGroundTile,
	WorldMapDefinition,
	MapLandmark,
	MapNpc
} from '$lib/game/content/maps/types';
```

Keep the existing `meadowEntryMap` and other map objects in `maps.ts`. Update the `forestDecor:` block in `meadowEntryMap` (lines ~509–526) to `mapDecor:` with the migrated shape (done fully in Task 2 — for now just rename the key and the two entries to satisfy the type; the render still uses the old path until Task 2).

> NOTE: To keep Task 1 strictly type-only, temporarily leave `meadowEntryMap`'s two canopy entries under a `mapDecor` array using the `MapDecor` shape but keep `WorldScene` reading `forestDecor` will break. To avoid a broken intermediate, **do Task 1 and Task 2 back-to-back without running the app between them** (unit tests still pass after Task 2). Commit them together if subagent review prefers a green app.

- [ ] **Step 3: Type check.** Run: `bun run check`. Expected: passes (WorldScene still references `MapForestDecor`/`forestDecor` — those errors are resolved in Task 2; if doing tasks separately, expect WorldScene type errors here and clear them in Task 2).

- [ ] **Step 4: Commit.**

```bash
git add src/lib/game/content/maps/types.ts src/lib/game/content/maps.ts
git commit -m "refactor: extract map types to maps/types.ts; add MapDecor type

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Generalized `mapDecor` render + collision; migrate & remove forest decor

**Files:**
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/content/maps.ts` (migrate the two canopy entries)
- Modify: `src/lib/game/content/maps.test.ts` (migrate `forestDecor` assertions → `mapDecor`)
- Modify: `src/lib/game/content/assets.test.ts` (migrate the `forestDecor` loop → `mapDecor`)

- [ ] **Step 1: Migrate the canopy entries in `maps.ts`.** Replace the `forestDecor: [...]` block (lines ~509–526) of `meadowEntryMap` with:

```ts
	mapDecor: [
		{
			id: 'wildwood-north-canopy',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 5_360,
			y: 360,
			width: 960,
			height: 160,
			mode: 'tile',
			collision: { id: 'wildwood-north-canopy-collision', x: 5_360, y: 360, width: 960, height: 160 }
		},
		{
			id: 'wildwood-east-canopy',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 6_120,
			y: 1_020,
			width: 160,
			height: 900,
			mode: 'tile',
			collision: { id: 'wildwood-east-canopy-collision', x: 6_120, y: 1_020, width: 160, height: 900 }
		}
	],
```

Add `import { forestDressingAsset } from '$lib/game/content/assets';` to `maps.ts` if not already imported (it imports types from assets; add the value import).

- [ ] **Step 2: Write the failing collision/render expectation.** In `maps.test.ts`, replace the `forestDecor` snapshot test (around line 1333) with a `mapDecor` test:

```ts
it('keeps the two wildwood canopies as colliding map decor', () => {
	const canopies = (meadowEntryMap.mapDecor ?? []).filter((decor) =>
		decor.id.startsWith('wildwood-')
	);
	expect(canopies).toHaveLength(2);
	for (const canopy of canopies) {
		expect(canopy.frameName).toBe('treeCluster');
		expect(canopy.mode).toBe('tile');
		expect(canopy.collision).toBeDefined();
	}
});
```

Update the other `forestDecor` references in `maps.test.ts` (lines ~745, ~1146, ~1356, ~1364) and `assets.test.ts` (line ~167) to read `meadowEntryMap.mapDecor` instead. For the `assets.test.ts` loop, the frame now lives in `decor.textureKey`/`decor.frameName`; assert the frame exists in the matching asset (forest-dressing for these two):

```ts
for (const decor of meadowEntryMap.mapDecor ?? []) {
	if (decor.textureKey === forestDressingAsset.key) {
		expect(forestDressingAsset.frames).toHaveProperty(decor.frameName);
	}
}
```

- [ ] **Step 3: Run tests to verify failure.** Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`. Expected: FAIL (WorldScene still defines `forestDecor`; `mapDecor` not rendered yet — type errors / assertion failures).

- [ ] **Step 4: Add `renderMapDecor` + collision in WorldScene; remove forest-decor code.** In `src/lib/game/phaser/scenes/WorldScene.ts`:

Update the type import block (lines ~24–40) — remove `MapForestDecor`, add `MapDecor`:

```ts
	type MapDecor,
	type MapForestZone,
```

Replace `renderForestDressing` (lines ~1818–1843) with:

```ts
	private renderMapDecor(map: WorldMapDefinition, depths: Array<MapDecorDepth>) {
		for (const decor of map.mapDecor ?? []) {
			const depth = decor.depth ?? 'furniture';

			if (!depths.includes(depth)) {
				continue;
			}

			const object =
				(decor.mode ?? 'image') === 'tile'
					? this.add.tileSprite(
							decor.x,
							decor.y,
							decor.width,
							decor.height,
							decor.textureKey,
							decor.frameName
						)
					: this.add
							.image(decor.x, decor.y, decor.textureKey, decor.frameName)
							.setDisplaySize(decor.width, decor.height);

			if (decor.alpha !== undefined) {
				object.setAlpha(decor.alpha);
			}
		}
	}
```

Add `MapDecorDepth` to the type imports. Replace the render-order call at line ~446 (`this.renderForestDressing(map);`) with:

```ts
		this.renderMapDecor(map, ['floor', 'furniture']);
```

After the foreground interior props line (~470 `this.renderInteriorProps(map, ['foreground']);`) add:

```ts
		this.renderMapDecor(map, ['foreground']);
```

Replace `isPlayerMovementBlockedByForestDecor` (lines ~2238–2268) and delete `getForestTreeCollisionRects`, `splitForestTreeCollisionRect`, and `doRectsOverlap` (lines ~2302–2344). Add the generalized decor collision check:

```ts
	private isPlayerMovementBlockedByMapDecor(
		currentX: number,
		currentY: number,
		targetX: number,
		targetY: number
	): boolean {
		const map = this.resolveMap(this.mapId);

		return (map.mapDecor ?? []).some((decor) => {
			if (!decor.collision) {
				return false;
			}

			const bounds = this.getMapRectBounds(decor.collision);

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

In `isPlayerMovementBlocked` (lines ~2079–2086), replace the `isPlayerMovementBlockedByForestDecor(...)` line with:

```ts
			this.isPlayerMovementBlockedByMapDecor(currentX, currentY, targetX, targetY)
```

- [ ] **Step 5: Run tests + check.** Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts src/lib/game/content/assets.test.ts` then `bun run check`. Expected: PASS, no type errors.

- [ ] **Step 6: Run the scene tests** (they reference `forestZone`, which we kept). Run: `bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts`. Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/content/assets.test.ts
git commit -m "feat: generalize map decor render+collision; migrate forest decor

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Ocean blockers become collision-only

**Files:**
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts` (`renderBlockers` ocean case)
- Test: `src/lib/game/phaser/scenes/scenes.test.ts` (add a render smoke assertion if a harness exists; otherwise rely on manual)

- [ ] **Step 1: Make ocean render invisible (collision-only).** In `renderBlockers` (lines ~1853–1891), change the `case 'ocean':` so it no longer draws an opaque blue rectangle (the new `seaTile` ground tile provides the water color; a shoreline-foam decor provides the edge). Replace:

```ts
				case 'ocean':
					this.add.rectangle(blocker.x, blocker.y, blocker.width, blocker.height, 0x1d5f9f, 0.92);
					break;
```

with:

```ts
				case 'ocean':
					// Collision-only: the seaTile ground tile + shoreline-foam decor provide the visuals.
					break;
```

Leave `getBlockerFrameName`'s `case 'ocean'` throw as-is (it is never reached now).

- [ ] **Step 2: Type check + unit run.** Run: `bun run check` then `bun run test:unit -- --run`. Expected: PASS. The existing SW ocean sliver still blocks movement (collision path unchanged).

- [ ] **Step 3: Commit.**

```bash
git add src/lib/game/phaser/scenes/WorldScene.ts
git commit -m "feat: render ocean blockers as collision-only

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Phase 2 — New ground tiles

### Task 4: Declare the `terrain-tiles` asset and widen `MapGroundTile`

**Files:**
- Modify: `src/lib/game/content/assets.ts`
- Modify: `src/lib/game/content/maps/types.ts` (`MapGroundTile`)
- Test: `src/lib/game/content/assets.test.ts`

- [ ] **Step 1: Write the failing parity test.** Add to `assets.test.ts`:

```ts
import { terrainTilesAsset } from '$lib/game/content/assets';

describe('terrainTilesAsset', () => {
	const required = [
		'grassTile',
		'pathTile',
		'ruinsFloorTile',
		'stoneWallTile',
		'seaTile',
		'sandTile',
		'marshMudTile',
		'autumnLeafTile',
		'cobblestoneTile'
	] as const;

	it('declares every required ground tile', () => {
		for (const name of required) {
			expect(terrainTilesAsset.frames).toHaveProperty(name);
		}
	});

	it('keeps every frame inside the sheet bounds', () => {
		const cols = terrainTilesAsset.columns;
		const sheetWidth = cols * terrainTilesAsset.cellWidth;
		for (const frame of Object.values(terrainTilesAsset.frames)) {
			expect(frame.x).toBeGreaterThanOrEqual(0);
			expect(frame.y).toBeGreaterThanOrEqual(0);
			expect(frame.x + frame.w).toBeLessThanOrEqual(sheetWidth);
		}
	});
});
```

- [ ] **Step 2: Run to verify failure.** Run: `bun run test:unit -- --run src/lib/game/content/assets.test.ts`. Expected: FAIL — `terrainTilesAsset` is not exported.

- [ ] **Step 3: Declare the asset.** Add to `src/lib/game/content/assets.ts` (after `starterPackAsset`). The sheet is one row of nine 256×256 cells:

```ts
export const terrainTilesAsset = {
	key: 'terrain-tiles',
	path: '/game/assets/terrain-tiles.png',
	cellWidth: 256,
	cellHeight: 256,
	columns: 9,
	frames: {
		grassTile: { x: 0, y: 0, w: 256, h: 256 },
		pathTile: { x: 256, y: 0, w: 256, h: 256 },
		ruinsFloorTile: { x: 512, y: 0, w: 256, h: 256 },
		stoneWallTile: { x: 768, y: 0, w: 256, h: 256 },
		seaTile: { x: 1_024, y: 0, w: 256, h: 256 },
		sandTile: { x: 1_280, y: 0, w: 256, h: 256 },
		marshMudTile: { x: 1_536, y: 0, w: 256, h: 256 },
		autumnLeafTile: { x: 1_792, y: 0, w: 256, h: 256 },
		cobblestoneTile: { x: 2_048, y: 0, w: 256, h: 256 }
	}
} as const;

export type TerrainTileFrameName = keyof typeof terrainTilesAsset.frames;
```

- [ ] **Step 4: Widen `MapGroundTile`.** In `src/lib/game/content/maps/types.ts`, change the import and the type:

```ts
import type { TerrainTileFrameName } from '$lib/game/content/assets';
// ...
export type MapGroundTile = TerrainTileFrameName;
```

(Remove the old `Extract<StarterPackFrameName, ...>` definition. Keep the other assets imports.)

- [ ] **Step 5: Run tests + check.** Run: `bun run test:unit -- --run src/lib/game/content/assets.test.ts` then `bun run check`. Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/lib/game/content/assets.ts src/lib/game/content/maps/types.ts src/lib/game/content/assets.test.ts
git commit -m "feat: declare terrain-tiles asset and widen MapGroundTile

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Wire the terrain tileset to `terrain-tiles.png` + generate the art

**Files:**
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts` (`terrainTileIndexes`, `terrainFrames`, `ensureTerrainTilesetTexture`, `getGroundFrameName` import path)
- Modify: `src/lib/game/content/assets.ts` (`getGroundFrameName` returns `MapGroundTile`)
- Modify: `src/lib/game/phaser/scenes/BootScene.ts` (preload)
- Create: `public/game/assets/terrain-tiles.png` (via Codex)

- [ ] **Step 1: Expand the tileset index maps in WorldScene.** Replace `terrainTileIndexes` (lines ~261–276) and `terrainFrames` (lines ~277–282):

```ts
	private static readonly terrainTileIndexes: Record<MapGroundTile, number> = {
		grassTile: 0,
		pathTile: 1,
		ruinsFloorTile: 2,
		stoneWallTile: 3,
		seaTile: 4,
		sandTile: 5,
		marshMudTile: 6,
		autumnLeafTile: 7,
		cobblestoneTile: 8
	};
	private static readonly terrainFrames: MapGroundTile[] = [
		'grassTile',
		'pathTile',
		'ruinsFloorTile',
		'stoneWallTile',
		'seaTile',
		'sandTile',
		'marshMudTile',
		'autumnLeafTile',
		'cobblestoneTile'
	];
```

Import `MapGroundTile` and `terrainTilesAsset` into WorldScene. Remove the now-unneeded `StarterPackFrameName` reliance in these two members.

- [ ] **Step 2: Source the tileset canvas from `terrain-tiles.png`.** In `ensureTerrainTilesetTexture` (lines ~1558–1599), change the source image + frame lookups from `starterPackAsset` to `terrainTilesAsset`:

```ts
		const sourceImage = this.textures.get(terrainTilesAsset.key)?.source?.[0]?.image;
		// ...
		for (const [index, frameName] of WorldScene.terrainFrames.entries()) {
			const frame = terrainTilesAsset.frames[frameName];
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
```

- [ ] **Step 3: Update `getGroundFrameName` return type.** In `assets.ts`, change its signature to return `MapGroundTile` and import that type (it already returns `'grassTile'`/`'ruinsFloorTile'`, both valid). Update WorldScene's import accordingly.

- [ ] **Step 4: Preload the new sheet.** In `BootScene.ts`, import `terrainTilesAsset` and add to `preload()`:

```ts
		this.load.image(terrainTilesAsset.key, terrainTilesAsset.path);
```

- [ ] **Step 5: Type check + unit run.** Run: `bun run check` then `bun run test:unit -- --run`. Expected: PASS.

- [ ] **Step 6: Generate the art via Codex.** Delegate to the Codex CLI with this prompt; save output to `public/game/assets/terrain-tiles.png`:

> A seamless top-down JRPG ground-tile sheet: a single horizontal row of nine square tiles, each tile 256×256px, drawn to tile edge-to-edge without seams, soft painterly autumn-overcast lighting matching a cozy 2D RPG. Tiles left to right: (1) lush green grass, (2) packed dirt path, (3) cracked ancient stone ruins floor, (4) grey stone wall block, (5) calm sea water with gentle ripples, (6) pale wet beach sand, (7) dark green-brown marsh mud with shallow puddles, (8) green grass strewn with orange and red fallen autumn leaves, (9) fitted grey cobblestone plaza. No text, no watermark. Final image 2304×256px.

- [ ] **Step 7: Verify it loads.** Run `bun run dev`, open `http://localhost:5173`, confirm the village ground still renders (grass/path/cobblestone) with no missing-texture console errors. Stop the dev server.

- [ ] **Step 8: Commit.**

```bash
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/content/assets.ts src/lib/game/phaser/scenes/BootScene.ts public/game/assets/terrain-tiles.png
git commit -m "feat: source terrain tileset from terrain-tiles.png with 9 ground tiles

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Phase 3 — Decor art packs

Each pack follows the same wiring pattern: declare the asset in `assets.ts`, add a `register<Pack>Frames()` method in WorldScene + call it in `create()` alongside the other `register*` calls (lines ~435–442), preload it in `BootScene`, and add a frame-bounds test in `assets.test.ts`. Codex generates the PNG.

### Task 6: Coast dressing pack

**Files:** `src/lib/game/content/assets.ts`, `src/lib/game/phaser/scenes/WorldScene.ts`, `src/lib/game/phaser/scenes/BootScene.ts`, `src/lib/game/content/assets.test.ts`, `public/game/assets/coast-dressing.png`

- [ ] **Step 1: Write the failing test.** Add to `assets.test.ts`:

```ts
import { coastDressingAsset } from '$lib/game/content/assets';

describe('coastDressingAsset', () => {
	it('declares the coastal props', () => {
		for (const name of [
			'torii',
			'ferryShrine',
			'fishingBoat',
			'fishingNet',
			'tidePool',
			'driftwood',
			'jetty',
			'shorelineFoam'
		]) {
			expect(coastDressingAsset.frames).toHaveProperty(name);
		}
	});
});
```

- [ ] **Step 2: Run to verify failure.** Run: `bun run test:unit -- --run src/lib/game/content/assets.test.ts`. Expected: FAIL.

- [ ] **Step 3: Declare the asset** in `assets.ts` (3 columns × 3 rows of 256px cells):

```ts
export const coastDressingAsset = {
	key: 'coast-dressing',
	path: '/game/assets/coast-dressing.png',
	cellWidth: 256,
	cellHeight: 256,
	columns: 3,
	frames: {
		torii: { x: 0, y: 0, w: 256, h: 256 },
		ferryShrine: { x: 256, y: 0, w: 256, h: 256 },
		fishingBoat: { x: 512, y: 0, w: 256, h: 256 },
		fishingNet: { x: 0, y: 256, w: 256, h: 256 },
		tidePool: { x: 256, y: 256, w: 256, h: 256 },
		driftwood: { x: 512, y: 256, w: 256, h: 256 },
		jetty: { x: 0, y: 512, w: 256, h: 256 },
		shorelineFoam: { x: 256, y: 512, w: 256, h: 256 }
	}
} as const;

export type CoastDressingFrameName = keyof typeof coastDressingAsset.frames;
```

- [ ] **Step 4: Register + preload.** In WorldScene add:

```ts
	private registerCoastDressingFrames() {
		const texture = this.textures.get(coastDressingAsset.key);

		for (const [frameName, frame] of Object.entries(coastDressingAsset.frames)) {
			if (!texture.has(frameName)) {
				texture.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);
			}
		}
	}
```

Call `this.registerCoastDressingFrames();` in `create()` with the other register calls. Import `coastDressingAsset`. In `BootScene.ts`: `this.load.image(coastDressingAsset.key, coastDressingAsset.path);` + import.

- [ ] **Step 5: Run tests + check.** Run: `bun run test:unit -- --run src/lib/game/content/assets.test.ts` then `bun run check`. Expected: PASS.

- [ ] **Step 6: Generate the art via Codex** → `public/game/assets/coast-dressing.png`:

> A 3×3 grid sheet of top-down JRPG coastal prop sprites, each centered in its own 256×256 transparent cell, soft painterly overcast seaside lighting matching a cozy 2D RPG. Props: (1) a weathered red wooden torii gate standing in shallow water; (2) a small ruined stone ferry-crossing shrine; (3) a beached wooden fishing boat; (4) a draped fishing net with cork floats; (5) a rocky tide pool with water; (6) a pile of driftwood logs; (7) a short wooden jetty/dock section; (8) a soft strip of pale shoreline sea-foam; (9) leave blank/transparent. Transparent background, no text, no watermark. Final image 768×768px.

- [ ] **Step 7: Commit.**

```bash
git add src/lib/game/content/assets.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/BootScene.ts src/lib/game/content/assets.test.ts public/game/assets/coast-dressing.png
git commit -m "feat: add coast-dressing decor pack

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Shrine dressing pack

**Files:** same pattern as Task 6, for `shrineDressingAsset` → `public/game/assets/shrine-dressing.png`

- [ ] **Step 1: Failing test** in `assets.test.ts` requiring frames `silverShrineGate`, `stoneLantern`, `offeringStand`, `amuletRack`, `silverpine`, `autumnMaple`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Declare** `shrineDressingAsset` (3 columns × 2 rows, 256px cells):

```ts
export const shrineDressingAsset = {
	key: 'shrine-dressing',
	path: '/game/assets/shrine-dressing.png',
	cellWidth: 256,
	cellHeight: 256,
	columns: 3,
	frames: {
		silverShrineGate: { x: 0, y: 0, w: 256, h: 256 },
		stoneLantern: { x: 256, y: 0, w: 256, h: 256 },
		offeringStand: { x: 512, y: 0, w: 256, h: 256 },
		amuletRack: { x: 0, y: 256, w: 256, h: 256 },
		silverpine: { x: 256, y: 256, w: 256, h: 256 },
		autumnMaple: { x: 512, y: 256, w: 256, h: 256 }
	}
} as const;

export type ShrineDressingFrameName = keyof typeof shrineDressingAsset.frames;
```

- [ ] **Step 4: Register + preload** (`registerShrineDressingFrames`, BootScene load, imports).
- [ ] **Step 5: Run tests + check → PASS.**
- [ ] **Step 6: Generate the art via Codex** → `public/game/assets/shrine-dressing.png`:

> A 3×2 grid sheet of top-down JRPG shrine prop sprites, each centered in its own 256×256 transparent cell, soft painterly autumn light, cozy 2D RPG style. Props: (1) a large ornate sealed silver-white shrine gate, closed, with a faint glowing seal; (2) a stone lantern (tōrō); (3) a wooden offering stand with coins; (4) a rack of hanging paper amulets (omamori); (5) a tall silver-needled pine tree; (6) a vivid red autumn maple tree. Transparent background, no text, no watermark. Final image 768×512px.

- [ ] **Step 7: Commit** (`feat: add shrine-dressing decor pack`).

---

### Task 8: Marsh dressing pack

**Files:** same pattern, for `marshDressingAsset` → `public/game/assets/marsh-dressing.png`

- [ ] **Step 1: Failing test** requiring frames `witchwoodGate`, `deadTree`, `toxicBloom`, `reeds`, `marshRock`, `fog`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Declare** `marshDressingAsset` (3 columns × 2 rows, 256px cells):

```ts
export const marshDressingAsset = {
	key: 'marsh-dressing',
	path: '/game/assets/marsh-dressing.png',
	cellWidth: 256,
	cellHeight: 256,
	columns: 3,
	frames: {
		witchwoodGate: { x: 0, y: 0, w: 256, h: 256 },
		deadTree: { x: 256, y: 0, w: 256, h: 256 },
		toxicBloom: { x: 512, y: 0, w: 256, h: 256 },
		reeds: { x: 0, y: 256, w: 256, h: 256 },
		marshRock: { x: 256, y: 256, w: 256, h: 256 },
		fog: { x: 512, y: 256, w: 256, h: 256 }
	}
} as const;

export type MarshDressingFrameName = keyof typeof marshDressingAsset.frames;
```

- [ ] **Step 4: Register + preload** (`registerMarshDressingFrames`, BootScene load, imports).
- [ ] **Step 5: Run tests + check → PASS.**
- [ ] **Step 6: Generate the art via Codex** → `public/game/assets/marsh-dressing.png`:

> A 3×2 grid sheet of top-down JRPG marsh prop sprites, each centered in its own 256×256 transparent cell, dim foggy painterly light, cozy-but-eerie 2D RPG style. Props: (1) a withered thorn-tangled sealed gate of dead wood with a dark seal; (2) a dead twisted leafless tree; (3) a cluster of glowing toxic purple blooms; (4) tall marsh reeds; (5) a moss-covered marsh boulder; (6) a soft translucent white fog/mist cloud meant for low-opacity layering. Transparent background, no text, no watermark. Final image 768×512px.

- [ ] **Step 7: Commit** (`feat: add marsh-dressing decor pack`).

---

### Task 9: Crossroads/village dressing pack

**Files:** same pattern, for `crossroadsDressingAsset` → `public/game/assets/crossroads-dressing.png`

- [ ] **Step 1: Failing test** requiring frames `castleGate`, `waystone`, `hangingLantern`, `poleLantern`, `festivalBanner`, `marketStall`, `flowerBed`.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Declare** `crossroadsDressingAsset` (3 columns × 3 rows, 256px cells):

```ts
export const crossroadsDressingAsset = {
	key: 'crossroads-dressing',
	path: '/game/assets/crossroads-dressing.png',
	cellWidth: 256,
	cellHeight: 256,
	columns: 3,
	frames: {
		castleGate: { x: 0, y: 0, w: 256, h: 256 },
		waystone: { x: 256, y: 0, w: 256, h: 256 },
		hangingLantern: { x: 512, y: 0, w: 256, h: 256 },
		poleLantern: { x: 0, y: 256, w: 256, h: 256 },
		festivalBanner: { x: 256, y: 256, w: 256, h: 256 },
		marketStall: { x: 512, y: 256, w: 256, h: 256 },
		flowerBed: { x: 0, y: 512, w: 256, h: 256 }
	}
} as const;

export type CrossroadsDressingFrameName = keyof typeof crossroadsDressingAsset.frames;
```

- [ ] **Step 4: Register + preload** (`registerCrossroadsDressingFrames`, BootScene load, imports).
- [ ] **Step 5: Run tests + check → PASS.**
- [ ] **Step 6: Generate the art via Codex** → `public/game/assets/crossroads-dressing.png`:

> A 3×3 grid sheet of top-down JRPG town prop sprites, each centered in its own 256×256 transparent cell, warm painterly overcast light, cozy 2D RPG style. Props: (1) a grand ornate sealed castle gate bearing a dragon crest, closed, with a white line painted on the ground before it; (2) a stone waystone signpost with directional arms; (3) a hanging paper festival lantern; (4) a standing pole festival lantern; (5) a fabric festival banner on a pole; (6) a wooden market stall with an awning and goods; (7) a small flower bed; (8) and (9) leave blank/transparent. Transparent background, no text, no watermark. Final image 768×768px.

- [ ] **Step 7: Commit** (`feat: add crossroads-dressing decor pack`).

---

### Task 10: Ambient NPC frames

**Files:** `src/lib/game/content/assets.ts` (extend `npcPackAsset`), `src/lib/game/content/assets.test.ts`, `public/game/assets/npc-pack.png` (regenerate wider)

- [ ] **Step 1: Failing test.** Add to `assets.test.ts` a check that `npcPackAsset.frames` includes `fisherNpc`, `travelerNpc`, `pilgrimNpc`, `woodcutterNpc`, `crierNpc`.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Extend `npcPackAsset`.** Add the new 96×96 cells to the right of the existing three (the sheet becomes 8 columns wide):

```ts
	frames: {
		miraItemShopNpc: { x: 0, y: 0, w: 96, h: 96 },
		quartermasterNpc: { x: 96, y: 0, w: 96, h: 96 },
		guildMasterNpc: { x: 192, y: 0, w: 96, h: 96 },
		fisherNpc: { x: 288, y: 0, w: 96, h: 96 },
		travelerNpc: { x: 384, y: 0, w: 96, h: 96 },
		pilgrimNpc: { x: 480, y: 0, w: 96, h: 96 },
		woodcutterNpc: { x: 576, y: 0, w: 96, h: 96 },
		crierNpc: { x: 672, y: 0, w: 96, h: 96 }
	}
```

`NpcPackFrameName` updates automatically (it is `keyof typeof npcPackAsset.frames`), so `isNpcPackFrameName` and `MapAmbientNpc.frameName` accept the new names.

- [ ] **Step 4: Run tests + check → PASS.**

- [ ] **Step 5: Regenerate `npc-pack.png` via Codex** (preserve the existing three on the left):

> A horizontal sheet of eight top-down JRPG character sprites, each centered in its own 96×96 transparent cell, front-facing, painterly cozy 2D RPG style with consistent proportions and lighting. Left to right: (1) a friendly female shopkeeper in an apron; (2) a gruff male quartermaster with a tabard; (3) an older male guild master with a cloak; (4) a coastal fisher in oilskins and boots; (5) a road traveler with a backpack and walking staff; (6) a shrine pilgrim in white robes; (7) a woodcutter with an axe over the shoulder; (8) a town crier with a hand-bell. Transparent background, no text, no watermark. Final image 768×96px.

> NOTE: If regenerating drifts the first three sprites off-style, instead create `npc-pack-2.png` for frames 4–8 as a separate `npcPackAsset` is not supported by `isNpcPackFrameName`; prefer the single-sheet regen and verify the existing village NPCs still look right in `bun run dev`.

- [ ] **Step 6: Commit** (`feat: add ambient NPC frames to npc-pack`).

---

## Phase 4 — Region authoring

The entry map is decomposed into per-region fragment modules. Each module exports arrays of map content scoped to its region. `meadow-entry.ts` concatenates them.

### Task 11: Region fragment scaffolding + extract existing village & wildwood

**Files:**
- Create: `src/lib/game/content/maps/regions/types.ts`
- Create: `src/lib/game/content/maps/regions/village.ts`
- Create: `src/lib/game/content/maps/regions/wildwood.ts`
- Create: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.ts` (import `meadowEntryMap` from the new module; move `addEnglishMapText` + source helper types)
- Test: `src/lib/game/content/maps.test.ts`

- [ ] **Step 1: Define the fragment type.** Create `src/lib/game/content/maps/regions/types.ts`:

```ts
import type {
	MapAmbientNpc,
	MapBlocker,
	MapCombatBounds,
	MapDecor,
	MapEncounter,
	MapFenceSegment,
	MapGroundPatch,
	MapLandmark,
	MapNpc,
	MapPickup,
	MapTransition
} from '$lib/game/content/maps/types';

/** Source landmark/npc lack the resolved English `label`/`name`; addEnglishMapText fills them. */
export type RegionLandmark = Omit<MapLandmark, 'label'>;
export type RegionNpc = Omit<MapNpc, 'name'>;

export interface RegionFragment {
	landmarks?: RegionLandmark[];
	transitions?: MapTransition[];
	groundPatches?: MapGroundPatch[];
	blockers?: MapBlocker[];
	mapDecor?: MapDecor[];
	fences?: MapFenceSegment[];
	ambientNpcs?: MapAmbientNpc[];
	npcs?: RegionNpc[];
	pickups?: MapPickup[];
	encounters?: MapEncounter[];
	combatBounds?: MapCombatBounds[];
}
```

- [ ] **Step 2: Move `addEnglishMapText` + source helper types into `meadow-entry.ts`.** Create `src/lib/game/content/maps/meadow-entry.ts`. Move the `WorldMapDefinitionSource`, `MapNpcSource`, `MapLandmarkSource` types and the `addEnglishMapText` function here from `maps.ts`. Add a fragment-composition helper:

```ts
import { forestDressingAsset } from '$lib/game/content/assets';
import { t } from '$lib/game/i18n/translate';
import type { WorldMapDefinition } from '$lib/game/content/maps/types';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';
import { villageRegion } from '$lib/game/content/maps/regions/village';
import { wildwoodRegion } from '$lib/game/content/maps/regions/wildwood';

export const openingMapId = 'meadow-entry';

const interiorDoor = { x: 256, y: 336 } as const; // shared by interiors; keep export below

function mergeRegions(fragments: RegionFragment[]): Required<
	Pick<
		RegionFragment,
		| 'landmarks'
		| 'transitions'
		| 'groundPatches'
		| 'blockers'
		| 'mapDecor'
		| 'fences'
		| 'ambientNpcs'
		| 'npcs'
		| 'pickups'
		| 'encounters'
		| 'combatBounds'
	>
> {
	const pick = <K extends keyof RegionFragment>(key: K) =>
		fragments.flatMap((fragment) => fragment[key] ?? []);

	return {
		landmarks: pick('landmarks'),
		transitions: pick('transitions'),
		groundPatches: pick('groundPatches'),
		blockers: pick('blockers'),
		mapDecor: pick('mapDecor'),
		fences: pick('fences'),
		ambientNpcs: pick('ambientNpcs'),
		npcs: pick('npcs'),
		pickups: pick('pickups'),
		encounters: pick('encounters'),
		combatBounds: pick('combatBounds')
	} as never;
}

// addEnglishMapText moved here (verbatim from maps.ts), typed against the merged source.
```

Move `addEnglishMapText` verbatim. Then assemble the map:

```ts
const merged = mergeRegions([villageRegion, wildwoodRegion /* + new regions added in later tasks */]);

export const meadowEntryMap: WorldMapDefinition = addEnglishMapText({
	id: openingMapId,
	width: 200,
	height: 200,
	spawnDirection: 'up',
	spawn: { x: 700, y: 5_600 },
	landmarks: merged.landmarks,
	transitions: merged.transitions,
	groundPatches: merged.groundPatches,
	blockers: merged.blockers,
	mapDecor: merged.mapDecor,
	fences: merged.fences,
	ambientNpcs: merged.ambientNpcs,
	npcs: merged.npcs,
	pickups: merged.pickups,
	encounters: merged.encounters,
	combatBounds: merged.combatBounds
});
```

- [ ] **Step 3: Populate `village.ts` and `wildwood.ts` by moving the existing meadow content.** Split the current `meadowEntryMap` literal in `maps.ts` (landmarks/transitions/groundPatches/blockers/mapDecor/fences/encounters/combatBounds) between the two region files by location:
  - **`village.ts` (`villageRegion: RegionFragment`)** — everything at y ≥ 4,400 / x ≤ 3,400: the six house + well + blacksmith + shrine landmarks; their transitions; the `sundrop-*` ground patches; the `sundrop-home-fence` / plaza fences; the SW ocean sliver blocker; the four perimeter boundary blockers (keep them here for now).
  - **`wildwood.ts` (`wildwoodRegion: RegionFragment`)** — the NE forest content: `whispering-cave` landmark; the `meadow-to-whispering-cave-ruins-threshold` transition; the `sundrop-forest-road-east/north`, `wildwood-*`, `whispering-cave-*`, `sundrop-cave-pocket` ground patches; the two `wildwood-*-canopy` `mapDecor` entries; the three `meadow-slime-*` encounters; the three `*-combat-pocket` combat bounds.

Each file imports asset values it needs (`forestDressingAsset` in `wildwood.ts`) and types from `regions/types`.

- [ ] **Step 4: Point `maps.ts` at the new module.** In `maps.ts`, delete the `meadowEntryMap` literal and the moved helpers/`addEnglishMapText`; add:

```ts
export { meadowEntryMap, openingMapId } from '$lib/game/content/maps/meadow-entry';
```

Keep `interiorDoor` usage for interiors in `maps.ts` (re-declare it locally there, since interiors still live in `maps.ts`). Ensure the `maps` registry still references `meadowEntryMap`.

- [ ] **Step 5: Run the full suite + check.** Run: `bun run test:unit -- --run` then `bun run check`. Expected: PASS — the composed `meadowEntryMap` must be content-identical to before (same ids, coords). Fix any ordering/label mismatches the existing assertions catch.

- [ ] **Step 6: Commit.**

```bash
git add src/lib/game/content/maps src/lib/game/content/maps.ts
git commit -m "refactor: compose meadow-entry from per-region fragments (village, wildwood)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: Add the region-integrity test harness

**Files:** `src/lib/game/content/maps.test.ts`

This harness is the safety net for all region authoring. Write it before adding new regions so each subsequent task turns assertions green.

- [ ] **Step 1: Add the harness tests.** Append to `maps.test.ts`:

```ts
import {
	coastDressingAsset,
	crossroadsDressingAsset,
	forestDressingAsset,
	marshDressingAsset,
	shrineDressingAsset,
	terrainTilesAsset,
	villageBuildingAsset
} from '$lib/game/content/assets';

const decorAssetFrames: Record<string, Record<string, unknown>> = {
	[forestDressingAsset.key]: forestDressingAsset.frames,
	[coastDressingAsset.key]: coastDressingAsset.frames,
	[shrineDressingAsset.key]: shrineDressingAsset.frames,
	[marshDressingAsset.key]: marshDressingAsset.frames,
	[crossroadsDressingAsset.key]: crossroadsDressingAsset.frames
};

describe('meadow-entry region integrity', () => {
	it('keeps every ground patch tile within the terrain tileset', () => {
		for (const patch of meadowEntryMap.groundPatches ?? []) {
			expect(terrainTilesAsset.frames).toHaveProperty(patch.tile);
			expectRectInsideMap(patch);
		}
	});

	it('points every decor frame at a real asset frame and stays in-bounds', () => {
		for (const decor of meadowEntryMap.mapDecor ?? []) {
			const frames = decorAssetFrames[decor.textureKey];
			expect(frames).toBeDefined();
			expect(frames).toHaveProperty(decor.frameName);
			expectRectInsideMap(decor);
			if (decor.collision) {
				expectRectInsideMap(decor.collision);
			}
		}
	});

	it('keeps every landmark in-bounds with a translated label', () => {
		for (const landmark of meadowEntryMap.landmarks ?? []) {
			expectRectInsideMap(landmark);
			expectEnglishMessage(landmark.labelKey);
		}
	});

	it('resolves every transition target to a known map', () => {
		for (const transition of meadowEntryMap.transitions) {
			expect(maps).toHaveProperty(transition.toMapId);
		}
	});

	it('references real items from every pickup', () => {
		for (const pickup of meadowEntryMap.pickups ?? []) {
			expect(() => getItem(pickup.itemId)).not.toThrow();
			expect(pickup.quantity).toBeGreaterThan(0);
		}
	});

	it('seals three foreshadow gates with future-gate collision', () => {
		const sealedGateIds = ['witchwood-gate-block', 'silver-shrine-gate-block', 'castle-gate-block'];
		const gateBlockers = (meadowEntryMap.blockers ?? []).filter((blocker) =>
			sealedGateIds.includes(blocker.id)
		);
		expect(gateBlockers).toHaveLength(3);
		for (const gate of gateBlockers) {
			expect(gate.kind).toBe('future-gate');
		}
	});
});
```

> The "three foreshadow gates" assertion fails until Tasks 13–16 add those blockers. That is intentional — it tracks remaining region work. Mark this assertion `it.skip(...)` if your executor requires every task to end fully green, then un-skip it in Task 16.

- [ ] **Step 2: Run.** Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts`. Expected: the in-bounds/decor/landmark/transition/pickup assertions PASS; the sealed-gate one FAILs (or is skipped) until Task 16.

- [ ] **Step 3: Commit.**

```bash
git add src/lib/game/content/maps.test.ts
git commit -m "test: add meadow-entry region integrity harness

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 13: Mistfen Marsh region (NW) — fully worked template

**Files:**
- Create: `src/lib/game/content/maps/regions/mistfen.ts`
- Modify: `src/lib/game/content/maps/meadow-entry.ts` (add to `mergeRegions`)
- Modify: `src/lib/game/i18n/messages/{en,ja,zh-Hant}.ts` (landmark label — see Task 19; you may stub `en` here and complete all locales in Task 19)
- Test: covered by the Task 12 harness

This is the reference implementation. Tasks 14–16 follow the same structure for their regions.

- [ ] **Step 1: Create the region fragment.** Create `src/lib/game/content/maps/regions/mistfen.ts`:

```ts
import { marshDressingAsset, terrainTilesAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

export const mistfenRegion: RegionFragment = {
	groundPatches: [
		{ id: 'mistfen-basin', x: 1_250, y: 1_750, width: 2_000, height: 2_300, tile: 'marshMudTile' },
		{ id: 'mistfen-pool-west', x: 800, y: 1_400, width: 420, height: 300, tile: 'seaTile' },
		{ id: 'mistfen-pool-east', x: 1_700, y: 2_100, width: 360, height: 280, tile: 'seaTile' },
		{ id: 'mistfen-approach-path', x: 2_150, y: 2_750, width: 360, height: 64, tile: 'pathTile' }
	],
	landmarks: [
		{
			id: 'witchwood-gate',
			x: 1_200,
			y: 620,
			width: 360,
			height: 300,
			labelKey: 'content.maps.landmarks.witchwood-gate.label'
		}
	],
	mapDecor: [
		{
			id: 'witchwood-gate-sprite',
			textureKey: marshDressingAsset.key,
			frameName: 'witchwoodGate',
			x: 1_200,
			y: 620,
			width: 384,
			height: 384,
			mode: 'image'
		},
		{
			id: 'mistfen-dead-tree-west',
			textureKey: marshDressingAsset.key,
			frameName: 'deadTree',
			x: 620,
			y: 1_120,
			width: 200,
			height: 240,
			mode: 'image',
			collision: { id: 'mistfen-dead-tree-west-collision', x: 620, y: 1_180, width: 80, height: 70 }
		},
		{
			id: 'mistfen-dead-tree-east',
			textureKey: marshDressingAsset.key,
			frameName: 'deadTree',
			x: 1_900,
			y: 1_500,
			width: 200,
			height: 240,
			mode: 'image',
			collision: { id: 'mistfen-dead-tree-east-collision', x: 1_900, y: 1_560, width: 80, height: 70 }
		},
		{
			id: 'mistfen-toxic-bloom',
			textureKey: marshDressingAsset.key,
			frameName: 'toxicBloom',
			x: 1_040,
			y: 2_000,
			width: 150,
			height: 150,
			mode: 'image'
		},
		{
			id: 'mistfen-reeds-1',
			textureKey: marshDressingAsset.key,
			frameName: 'reeds',
			x: 1_500,
			y: 1_300,
			width: 240,
			height: 200,
			mode: 'tile'
		},
		{
			id: 'mistfen-marsh-rock',
			textureKey: marshDressingAsset.key,
			frameName: 'marshRock',
			x: 720,
			y: 2_300,
			width: 170,
			height: 140,
			mode: 'image',
			collision: { id: 'mistfen-marsh-rock-collision', x: 720, y: 2_320, width: 120, height: 90 }
		},
		{
			id: 'mistfen-fog',
			textureKey: marshDressingAsset.key,
			frameName: 'fog',
			x: 1_250,
			y: 1_750,
			width: 2_000,
			height: 2_300,
			mode: 'tile',
			depth: 'foreground',
			alpha: 0.35
		}
	],
	ambientNpcs: [{ id: 'mistfen-forager', x: 1_120, y: 2_400, frameName: 'travelerNpc' }],
	pickups: [{ id: 'mistfen-salve', x: 880, y: 2_500, itemId: 'sunleaf-salve', quantity: 1 }],
	blockers: [
		{ id: 'witchwood-gate-block', x: 1_200, y: 470, width: 384, height: 96, kind: 'future-gate' }
	]
};
```

- [ ] **Step 2: Register the region.** In `meadow-entry.ts`, import `mistfenRegion` and add it to the `mergeRegions([...])` array.

- [ ] **Step 3: Add the English landmark label (stub).** In `src/lib/game/i18n/messages/en.ts`, inside `maps.landmarks`, add:

```ts
				'witchwood-gate': { label: 'Witchwood Gate' },
```

(Mirror to `ja.ts` and `zh-Hant.ts` now, or batch all locales in Task 19 — but `en` is required immediately so `expectEnglishMessage` passes.)

- [ ] **Step 4: Run the harness + check.** Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts` then `bun run check`. Expected: PASS (marsh decor/landmark/pickup in-bounds, label resolves).

- [ ] **Step 5: Commit.**

```bash
git add src/lib/game/content/maps/regions/mistfen.ts src/lib/game/content/maps/meadow-entry.ts src/lib/game/i18n/messages/en.ts
git commit -m "feat: add Mistfen Marsh region

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 14: Silverpine Shrine Path region (N)

**Files:** Create `src/lib/game/content/maps/regions/silverpine.ts`; modify `meadow-entry.ts`, `en.ts`. Same structure as Task 13.

- [ ] **Step 1: Create the fragment.** `silverpineRegion: RegionFragment` with this content (tunable coords; bounds x 2,300–4,200, y 300–2,900):

```ts
import { shrineDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

export const silverpineRegion: RegionFragment = {
	groundPatches: [
		{ id: 'silverpine-stair-path', x: 3_100, y: 1_600, width: 70, height: 2_400, tile: 'pathTile' },
		{ id: 'silverpine-grove-floor', x: 3_100, y: 900, width: 1_400, height: 1_000, tile: 'autumnLeafTile' },
		{ id: 'silverpine-shrine-terrace', x: 3_000, y: 520, width: 900, height: 360, tile: 'cobblestoneTile' }
	],
	landmarks: [
		{
			id: 'silver-shrine-gate',
			x: 3_000,
			y: 480,
			width: 420,
			height: 320,
			labelKey: 'content.maps.landmarks.silver-shrine-gate.label'
		}
	],
	mapDecor: [
		{ id: 'silver-shrine-gate-sprite', textureKey: shrineDressingAsset.key, frameName: 'silverShrineGate', x: 3_000, y: 480, width: 420, height: 420, mode: 'image' },
		{ id: 'silverpine-lantern-west', textureKey: shrineDressingAsset.key, frameName: 'stoneLantern', x: 2_700, y: 760, width: 120, height: 180, mode: 'image', collision: { id: 'silverpine-lantern-west-collision', x: 2_700, y: 820, width: 70, height: 70 } },
		{ id: 'silverpine-lantern-east', textureKey: shrineDressingAsset.key, frameName: 'stoneLantern', x: 3_300, y: 760, width: 120, height: 180, mode: 'image', collision: { id: 'silverpine-lantern-east-collision', x: 3_300, y: 820, width: 70, height: 70 } },
		{ id: 'silverpine-offering', textureKey: shrineDressingAsset.key, frameName: 'offeringStand', x: 3_000, y: 720, width: 150, height: 150, mode: 'image' },
		{ id: 'silverpine-amulet-rack', textureKey: shrineDressingAsset.key, frameName: 'amuletRack', x: 2_840, y: 1_120, width: 160, height: 170, mode: 'image' },
		{ id: 'silverpine-tree-1', textureKey: shrineDressingAsset.key, frameName: 'silverpine', x: 2_540, y: 1_300, width: 220, height: 300, mode: 'image', collision: { id: 'silverpine-tree-1-collision', x: 2_540, y: 1_400, width: 90, height: 80 } },
		{ id: 'silverpine-maple-1', textureKey: shrineDressingAsset.key, frameName: 'autumnMaple', x: 3_640, y: 1_400, width: 240, height: 300, mode: 'image', collision: { id: 'silverpine-maple-1-collision', x: 3_640, y: 1_500, width: 90, height: 80 } },
		{ id: 'silverpine-maple-2', textureKey: shrineDressingAsset.key, frameName: 'autumnMaple', x: 2_700, y: 1_900, width: 240, height: 300, mode: 'image', collision: { id: 'silverpine-maple-2-collision', x: 2_700, y: 2_000, width: 90, height: 80 } }
	],
	ambientNpcs: [{ id: 'silverpine-pilgrim', x: 3_100, y: 1_150, frameName: 'pilgrimNpc' }],
	pickups: [{ id: 'silverpine-tonic', x: 2_900, y: 1_700, itemId: 'field-potion', quantity: 1 }],
	blockers: [
		{ id: 'silver-shrine-gate-block', x: 3_000, y: 340, width: 420, height: 96, kind: 'future-gate' }
	]
};
```

- [ ] **Step 2: Register + label.** Add `silverpineRegion` to `mergeRegions`. Add `'silver-shrine-gate': { label: 'Silver Shrine Gate' },` to `en.ts` `maps.landmarks`.
- [ ] **Step 3: Run harness + check → PASS.**
- [ ] **Step 4: Commit** (`feat: add Silverpine Shrine Path region`).

---

### Task 15: Tidewatch Coast & Ferry Crossing region (S/SE)

**Files:** Create `src/lib/game/content/maps/regions/coast.ts`; modify `meadow-entry.ts`, `en.ts`. Bounds x 2,900–6,350, y 5,200–6,350; sea band along the south.

- [ ] **Step 1: Create the fragment.** `coastRegion: RegionFragment`:

```ts
import { coastDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

export const coastRegion: RegionFragment = {
	groundPatches: [
		{ id: 'coast-sea', x: 4_600, y: 6_180, width: 3_000, height: 360, tile: 'seaTile' },
		{ id: 'coast-sand', x: 4_600, y: 5_840, width: 3_000, height: 360, tile: 'sandTile' },
		{ id: 'coast-approach-path', x: 4_200, y: 5_500, width: 64, height: 360, tile: 'pathTile' }
	],
	landmarks: [
		{
			id: 'ferry-crossing',
			x: 3_600,
			y: 5_720,
			width: 360,
			height: 320,
			labelKey: 'content.maps.landmarks.ferry-crossing.label'
		}
	],
	mapDecor: [
		{ id: 'coast-torii', textureKey: coastDressingAsset.key, frameName: 'torii', x: 4_200, y: 6_160, width: 320, height: 360, mode: 'image' },
		{ id: 'coast-ferry-shrine', textureKey: coastDressingAsset.key, frameName: 'ferryShrine', x: 3_600, y: 5_720, width: 320, height: 300, mode: 'image', collision: { id: 'coast-ferry-shrine-collision', x: 3_600, y: 5_760, width: 200, height: 140 } },
		{ id: 'coast-boat', textureKey: coastDressingAsset.key, frameName: 'fishingBoat', x: 5_000, y: 5_900, width: 260, height: 180, mode: 'image', collision: { id: 'coast-boat-collision', x: 5_000, y: 5_900, width: 200, height: 120 } },
		{ id: 'coast-net', textureKey: coastDressingAsset.key, frameName: 'fishingNet', x: 4_700, y: 5_780, width: 180, height: 160, mode: 'image' },
		{ id: 'coast-tidepool', textureKey: coastDressingAsset.key, frameName: 'tidePool', x: 5_400, y: 6_040, width: 220, height: 160, mode: 'image' },
		{ id: 'coast-driftwood', textureKey: coastDressingAsset.key, frameName: 'driftwood', x: 4_000, y: 5_900, width: 200, height: 130, mode: 'image' },
		{ id: 'coast-jetty', textureKey: coastDressingAsset.key, frameName: 'jetty', x: 4_900, y: 6_180, width: 220, height: 320, mode: 'image' },
		{ id: 'coast-foam', textureKey: coastDressingAsset.key, frameName: 'shorelineFoam', x: 4_600, y: 6_000, width: 3_000, height: 80, mode: 'tile', depth: 'floor' }
	],
	ambientNpcs: [{ id: 'coast-fisher', x: 4_500, y: 5_780, frameName: 'fisherNpc' }],
	pickups: [{ id: 'coast-salve', x: 5_300, y: 5_820, itemId: 'sunleaf-salve', quantity: 1 }],
	blockers: [
		{ id: 'coast-sea-wall', x: 4_600, y: 6_320, width: 3_000, height: 80, kind: 'ocean' }
	]
};
```

- [ ] **Step 2: Register + label.** Add `coastRegion` to `mergeRegions`. Add `'ferry-crossing': { label: 'Ferry Crossing' },` to `en.ts`.
- [ ] **Step 3: Run harness + check → PASS.** (Note `coast-sea-wall` is an `ocean` blocker — collision-only after Task 3 — keeping the player out of the water.)
- [ ] **Step 4: Commit** (`feat: add Tidewatch Coast & Ferry Crossing region`).

---

### Task 16: Crossroads & Sealed Castle Gate region (center)

**Files:** Create `src/lib/game/content/maps/regions/crossroads.ts`; modify `meadow-entry.ts`, `en.ts`. Bounds x 2,500–4,500, y 2,900–5,000.

- [ ] **Step 1: Create the fragment.** `crossroadsRegion: RegionFragment`:

```ts
import { crossroadsDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

export const crossroadsRegion: RegionFragment = {
	groundPatches: [
		{ id: 'crossroads-plaza', x: 3_500, y: 4_000, width: 900, height: 900, tile: 'cobblestoneTile' },
		{ id: 'crossroads-festival-road', x: 3_500, y: 3_350, width: 120, height: 1_400, tile: 'pathTile' },
		{ id: 'crossroads-gate-terrace', x: 3_500, y: 3_020, width: 700, height: 300, tile: 'cobblestoneTile' }
	],
	landmarks: [
		{
			id: 'castle-gate',
			x: 3_500,
			y: 2_980,
			width: 480,
			height: 320,
			labelKey: 'content.maps.landmarks.castle-gate.label'
		},
		{
			id: 'crossroads-waystone',
			x: 3_500,
			y: 4_000,
			width: 120,
			height: 150,
			labelKey: 'content.maps.landmarks.crossroads-waystone.label'
		}
	],
	mapDecor: [
		{ id: 'castle-gate-sprite', textureKey: crossroadsDressingAsset.key, frameName: 'castleGate', x: 3_500, y: 2_980, width: 512, height: 420, mode: 'image' },
		{ id: 'crossroads-waystone-sprite', textureKey: crossroadsDressingAsset.key, frameName: 'waystone', x: 3_500, y: 4_000, width: 140, height: 180, mode: 'image', collision: { id: 'crossroads-waystone-collision', x: 3_500, y: 4_040, width: 90, height: 80 } },
		{ id: 'crossroads-lantern-west', textureKey: crossroadsDressingAsset.key, frameName: 'poleLantern', x: 3_360, y: 3_500, width: 110, height: 220, mode: 'image', collision: { id: 'crossroads-lantern-west-collision', x: 3_360, y: 3_580, width: 50, height: 60 } },
		{ id: 'crossroads-lantern-east', textureKey: crossroadsDressingAsset.key, frameName: 'poleLantern', x: 3_640, y: 3_500, width: 110, height: 220, mode: 'image', collision: { id: 'crossroads-lantern-east-collision', x: 3_640, y: 3_580, width: 50, height: 60 } },
		{ id: 'crossroads-banner', textureKey: crossroadsDressingAsset.key, frameName: 'festivalBanner', x: 3_200, y: 4_200, width: 150, height: 240, mode: 'image' },
		{ id: 'crossroads-stall', textureKey: crossroadsDressingAsset.key, frameName: 'marketStall', x: 3_820, y: 4_200, width: 260, height: 200, mode: 'image', collision: { id: 'crossroads-stall-collision', x: 3_820, y: 4_240, width: 220, height: 120 } },
		{ id: 'crossroads-flowers', textureKey: crossroadsDressingAsset.key, frameName: 'flowerBed', x: 3_200, y: 3_800, width: 180, height: 150, mode: 'image' },
		{ id: 'crossroads-hanging-lantern', textureKey: crossroadsDressingAsset.key, frameName: 'hangingLantern', x: 3_500, y: 3_700, width: 120, height: 140, mode: 'image', depth: 'foreground' }
	],
	ambientNpcs: [
		{ id: 'crossroads-crier', x: 3_400, y: 4_000, frameName: 'crierNpc' },
		{ id: 'crossroads-traveler', x: 3_700, y: 4_300, frameName: 'travelerNpc' }
	],
	blockers: [
		{ id: 'castle-gate-block', x: 3_500, y: 2_840, width: 480, height: 96, kind: 'future-gate' }
	]
};
```

- [ ] **Step 2: Register + labels.** Add `crossroadsRegion` to `mergeRegions`. Add to `en.ts` `maps.landmarks`:

```ts
				'castle-gate': { label: 'Sealed Castle Gate' },
				'crossroads-waystone': { label: 'Crossroads Waystone' },
```

- [ ] **Step 3: Un-skip the sealed-gate harness assertion** (from Task 12) — all three sealed gates now exist. Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts` then `bun run check`. Expected: PASS, including the three-gate assertion.

- [ ] **Step 4: Commit** (`feat: add Crossroads & Sealed Castle Gate region`).

---

### Task 17: Connectivity paths between Crossroads and every region

**Files:** Modify `src/lib/game/content/maps/regions/crossroads.ts` (add link patches) or create `src/lib/game/content/maps/regions/paths.ts`; modify `meadow-entry.ts` if a new fragment is added.

- [ ] **Step 1: Add the linking ground patches.** Create `src/lib/game/content/maps/regions/paths.ts` with a `pathsRegion: RegionFragment` containing the connecting lanes (all `pathTile`, tunable):

```ts
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

export const pathsRegion: RegionFragment = {
	groundPatches: [
		// Village (NE corner ~2,400,5,000) → Crossroads plaza (SW ~3,050,4,450)
		{ id: 'link-village-crossroads', x: 2_750, y: 4_700, width: 900, height: 64, tile: 'pathTile' },
		{ id: 'link-village-crossroads-v', x: 3_050, y: 4_550, width: 64, height: 360, tile: 'pathTile' },
		// Crossroads → Coast (south to ~4,200,5,500)
		{ id: 'link-crossroads-coast', x: 3_900, y: 4_700, width: 900, height: 64, tile: 'pathTile' },
		{ id: 'link-crossroads-coast-v', x: 4_200, y: 5_100, width: 64, height: 900, tile: 'pathTile' },
		// Crossroads → Mistfen (NW to ~2,150,2,750)
		{ id: 'link-crossroads-mistfen', x: 2_800, y: 3_500, width: 64, height: 1_100, tile: 'pathTile' },
		{ id: 'link-crossroads-mistfen-h', x: 2_500, y: 2_950, width: 700, height: 64, tile: 'pathTile' },
		// Crossroads → Silverpine (north festival road already climbs; bridge the gap)
		{ id: 'link-crossroads-silverpine', x: 3_300, y: 2_950, width: 500, height: 64, tile: 'pathTile' },
		// Crossroads → Wildwood (east to the existing forest road at ~4,200,5,347)
		{ id: 'link-crossroads-wildwood', x: 4_000, y: 4_300, width: 64, height: 1_100, tile: 'pathTile' }
	]
};
```

- [ ] **Step 2: Register.** Add `pathsRegion` to `mergeRegions` in `meadow-entry.ts`.

- [ ] **Step 3: Run harness + check → PASS** (every patch tile valid + in-bounds).

- [ ] **Step 4: Commit** (`feat: connect crossroads to every region with paths`).

---

## Phase 5 — Localization, integration, verification

### Task 18: Enrich the existing Village & Wildwood regions

**Files:** Modify `src/lib/game/content/maps/regions/village.ts` and `src/lib/game/content/maps/regions/wildwood.ts`.

- [ ] **Step 1: Add village decor + ambient life.** Append to `villageRegion.mapDecor` (reusing `crossroadsDressingAsset` for stalls/lanterns/flowers and `shrineDressingAsset` for maples) and `villageRegion.ambientNpcs`. Concrete starters (tunable; village bounds x ≤ 3,400, y ≥ 4,400):

```ts
		{ id: 'village-maple-1', textureKey: shrineDressingAsset.key, frameName: 'autumnMaple', x: 1_180, y: 5_100, width: 220, height: 280, mode: 'image', collision: { id: 'village-maple-1-collision', x: 1_180, y: 5_190, width: 80, height: 70 } },
		{ id: 'village-stall', textureKey: crossroadsDressingAsset.key, frameName: 'marketStall', x: 1_900, y: 5_500, width: 240, height: 190, mode: 'image', collision: { id: 'village-stall-collision', x: 1_900, y: 5_540, width: 200, height: 110 } },
		{ id: 'village-flowers', textureKey: crossroadsDressingAsset.key, frameName: 'flowerBed', x: 1_536, y: 5_640, width: 160, height: 130, mode: 'image' },
		{ id: 'village-hanging-lantern', textureKey: crossroadsDressingAsset.key, frameName: 'hangingLantern', x: 1_536, y: 5_200, width: 110, height: 130, mode: 'image', depth: 'foreground' }
```

Add ambient villagers, e.g. `{ id: 'village-wanderer', x: 1_700, y: 5_700, frameName: 'travelerNpc' }`. Import `crossroadsDressingAsset` and `shrineDressingAsset` in `village.ts`.

- [ ] **Step 2: Thicken the Wildwood.** Append to `wildwoodRegion.mapDecor` (reuse `forestDressingAsset` `treeCluster`/`brush`/`forestFloor` + `shrineDressingAsset` `autumnMaple`) more trees/brush and an ambient woodcutter `{ id: 'wildwood-woodcutter', x: 5_000, y: 1_100, frameName: 'woodcutterNpc' }`. Keep new decor inside the NE region and clear of the slime combat pockets and the cave transition.

- [ ] **Step 3: Run harness + check → PASS.**

- [ ] **Step 4: Commit** (`feat: enrich village and wildwood with decor and ambient life`).

---

### Task 19: Complete localization for all new labels

**Files:** `src/lib/game/i18n/messages/en.ts`, `src/lib/game/i18n/messages/ja.ts`, `src/lib/game/i18n/messages/zh-Hant.ts`; `src/lib/game/i18n/locales.test.ts` (regression guard)

- [ ] **Step 1: Ensure all five landmark labels exist in `en.ts`** (`witchwood-gate`, `silver-shrine-gate`, `ferry-crossing`, `castle-gate`, `crossroads-waystone`) under `maps.landmarks`.

- [ ] **Step 2: Mirror them in `ja.ts`.** Add under `maps.landmarks`:

```ts
				'witchwood-gate': { label: '魔女の森の門' },
				'silver-shrine-gate': { label: '白銀神殿の門' },
				'ferry-crossing': { label: '渡し場' },
				'castle-gate': { label: '封印された城門' },
				'crossroads-waystone': { label: '辻の道標' }
```

- [ ] **Step 3: Mirror them in `zh-Hant.ts`.** Add under `maps.landmarks`:

```ts
				'witchwood-gate': { label: '魔女森之門' },
				'silver-shrine-gate': { label: '白銀神殿之門' },
				'ferry-crossing': { label: '渡口' },
				'castle-gate': { label: '封印城門' },
				'crossroads-waystone': { label: '十字路道標' }
```

- [ ] **Step 4: Run the i18n suite.** Run: `bun run test:unit -- --run src/lib/game/i18n/locales.test.ts src/lib/game/i18n/translate.test.ts`. Expected: PASS (locale parity holds).

- [ ] **Step 5: Commit** (`feat: localize new entry-map landmark labels (en/ja/zh-Hant)`).

---

### Task 20: e2e smoke test + full verification + manual walkthrough

**Files:** `tests/e2e/` (add a smoke spec), no source changes expected.

- [ ] **Step 1: Add an entry-map render smoke test.** Create/extend an e2e spec asserting the game boots on the entry map with no console errors. Follow the existing e2e style (use `bun run test:e2e -- --grep` names already in the suite as a template). Minimal shape:

```ts
import { expect, test } from '@playwright/test';

test('entry map boots with no console errors', async ({ page }) => {
	const errors: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') errors.push(msg.text());
	});
	await page.goto('/');
	await page.waitForSelector('canvas');
	await page.waitForTimeout(1_500);
	expect(errors).toEqual([]);
});
```

- [ ] **Step 2: Run the full unit suite.** Run: `bun run test:unit -- --run`. Expected: PASS.

- [ ] **Step 3: Type check + lint.** Run: `bun run check` then `bun run lint`. Expected: PASS (run `bun run format` if lint reports formatting).

- [ ] **Step 4: Run e2e.** Run: `bun run test:e2e`. Expected: PASS.

- [ ] **Step 5: Manual walkthrough.** Run `bun run dev`, then walk from the village spawn through the Crossroads to each region. Verify: ground tiles render (sea/sand/marsh/cobblestone/autumn), decor appears at the right places, the three sealed gates block movement, ambient NPCs and pickups show, the coast water blocks the player, no missing-texture warnings in the console. Visually tune decor coordinates as needed (re-run `bun run test:unit -- --run src/lib/game/content/maps.test.ts` after any data edits). Stop the dev server.

- [ ] **Step 6: Commit** any tuning + the e2e test.

```bash
git add -A
git commit -m "test: add entry-map boot smoke test; finalize region tuning

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-review checklist (completed by plan author)

- **Spec coverage:** Scope/regions/terrain/liveliness/architecture all mapped — engine (Tasks 1–5), ocean tweak (Task 3), terrain tiles (Tasks 4–5), decor packs (Tasks 6–10), six regions (Tasks 11, 13–18), connectivity (Task 17), i18n (Tasks 13–16 stubs + Task 19), tests (Tasks 12, 20), non-goals respected (no new combat/items/dungeons).
- **Placeholders:** None — every code step shows full code; decor coordinates are concrete (explicitly tunable) rather than "TBD".
- **Type consistency:** `MapDecor`/`MapDecorDepth`, `RegionFragment`, `terrainTilesAsset`/`MapGroundTile`, `renderMapDecor`/`isPlayerMovementBlockedByMapDecor`, and asset frame names are used consistently across tasks. `forestZone` deliberately retained (enemy leashing); only `forestDecor` removed.
- **Ordering:** Engine before regions; asset declarations precede runtime use; the integrity harness (Task 12) precedes new-region tasks so each turns assertions green.
