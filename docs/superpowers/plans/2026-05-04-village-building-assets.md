# Village Building Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and wire a transparent village building sprite sheet so the meadow village exterior uses building art instead of Phaser rectangle blocks.

**Architecture:** Add a dedicated environment asset sheet, keep frame metadata centralized in `src/lib/game/content/assets.ts`, preload it in `BootScene`, and render mapped landmark images in `WorldScene`. The existing landmark coordinates, display sizes, doorway markers, transitions, NPCs, pickups, and encounters remain unchanged.

**Tech Stack:** TypeScript, Phaser, SvelteKit, Bun, Vitest, generated PNG assets, Codex image generation, project `2d-game-asset-workflow` alpha inspection scripts.

---

## File Structure

- Create `static/game/assets/village-buildings.png`
  - Transparent 2x2 building sheet with four frames.
- Modify `src/lib/game/content/assets.ts`
  - Add `villageBuildingAsset`, `VillageBuildingFrameName`, and `getVillageBuildingFrameName(...)`.
- Modify `src/lib/game/content/assets.test.ts`
  - Add metadata and landmark-frame lookup tests.
- Modify `src/lib/game/phaser/scenes/BootScene.ts`
  - Preload `villageBuildingAsset`.
- Modify `src/lib/game/phaser/scenes/WorldScene.ts`
  - Register building frames and render building images for landmarks.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`
  - Update preload and landmark rendering expectations.

---

### Task 1: Generate And Verify Building Sheet

**Files:**

- Create: `static/game/assets/village-buildings.png`

- [ ] **Step 1: Generate the building sheet**

Use the image generation tool with this exact prompt:

```text
SNES-inspired pixel art sprite sheet for a 2D top-down action JRPG village, transparent background, fixed 2x2 grid, no baked checkerboard, no background matte, production-ready game asset sheet.

Canvas target: 1024x1024. Four equal 512x512 cells.

Top-left cell: cozy small hero house, warm wood walls, red-brown roof, centered front door, readable top-down JRPG silhouette.
Top-right cell: larger guild hall civic building, broader roof, sturdy timber and stone accents, small guild sign above front door, readable top-down JRPG silhouette.
Bottom-left cell: item shop, friendly storefront, striped awning or sign silhouette, centered front door, readable top-down JRPG silhouette.
Bottom-right cell: reusable villager house, modest home variant, warm roof, centered front door, readable top-down JRPG silhouette.

Style: clean 16-bit JRPG pixel art, warm peaceful village palette, crisp edges, no shadows outside transparent asset bounds, no text lettering, no characters, no props outside buildings.
```

Save the generated PNG to:

```text
static/game/assets/village-buildings.png
```

- [ ] **Step 2: Inspect real alpha**

Run:

```bash
python3 .codex/skills/2d-game-asset-workflow/scripts/inspect_png_alpha.py static/game/assets/village-buildings.png
```

Expected: output reports `"size": [1024, 1024]`, an alpha channel, `alpha_min` is `0`, and `transparent_pixels` is greater than `0`. Regenerate the asset with the same prompt when the size is not `[1024, 1024]`.

- [ ] **Step 3: Clean opaque border background when alpha inspection fails**

When Step 2 reports a fully opaque PNG, run:

```bash
python3 .codex/skills/2d-game-asset-workflow/scripts/remove_border_background.py static/game/assets/village-buildings.png /tmp/village-buildings-transparent.png
cp /tmp/village-buildings-transparent.png static/game/assets/village-buildings.png
python3 .codex/skills/2d-game-asset-workflow/scripts/inspect_png_alpha.py static/game/assets/village-buildings.png
```

Expected after cleanup: output reports `"size": [1024, 1024]`, an alpha channel, `alpha_min` is `0`, and `transparent_pixels` is greater than `0`.

- [ ] **Step 4: Commit the verified asset**

```bash
git add static/game/assets/village-buildings.png
git commit -m "Add village building sprite sheet"
```

---

### Task 2: Add Building Asset Metadata

**Files:**

- Modify: `src/lib/game/content/assets.ts`
- Modify: `src/lib/game/content/assets.test.ts`

- [ ] **Step 1: Write failing metadata tests**

In `src/lib/game/content/assets.test.ts`, add these imports:

```ts
import { meadowEntryMap } from '$lib/game/content/maps';
```

Extend the existing assets import with:

```ts
	getVillageBuildingFrameName,
	villageBuildingAsset,
	type VillageBuildingFrameName,
```

Add this block after the starter pack tests:

```ts
const requiredBuildingFrames: VillageBuildingFrameName[] = [
	'heroHouse',
	'guildHall',
	'itemShop',
	'villagerHouse'
];

describe('village building asset metadata', () => {
	it('loads village building art from a fixed 2x2 sheet', () => {
		expect(villageBuildingAsset).toMatchObject({
			key: 'village-buildings',
			path: '/game/assets/village-buildings.png',
			cellWidth: 512,
			cellHeight: 512,
			columns: 2
		});
		expect(villageBuildingAsset.frames).toEqual({
			heroHouse: { x: 0, y: 0, w: 512, h: 512 },
			guildHall: { x: 512, y: 0, w: 512, h: 512 },
			itemShop: { x: 0, y: 512, w: 512, h: 512 },
			villagerHouse: { x: 512, y: 512, w: 512, h: 512 }
		});
	});

	it('maps every meadow building landmark to a building frame', () => {
		expect(getVillageBuildingFrameName('hero-house-exterior')).toBe('heroHouse');
		expect(getVillageBuildingFrameName('guild-hall-exterior')).toBe('guildHall');
		expect(getVillageBuildingFrameName('item-shop-exterior')).toBe('itemShop');
		expect(getVillageBuildingFrameName('villager-house-1-exterior')).toBe('villagerHouse');
		expect(getVillageBuildingFrameName('villager-house-2-exterior')).toBe('villagerHouse');
		expect(getVillageBuildingFrameName('villager-house-3-exterior')).toBe('villagerHouse');
		expect(getVillageBuildingFrameName('unknown-landmark')).toBeUndefined();

		for (const landmark of meadowEntryMap.landmarks ?? []) {
			expect(requiredBuildingFrames).toContain(getVillageBuildingFrameName(landmark.id));
		}
	});
});
```

- [ ] **Step 2: Run metadata tests and verify they fail**

Run:

```bash
bun run test:unit -- src/lib/game/content/assets.test.ts
```

Expected: FAIL because `villageBuildingAsset`, `VillageBuildingFrameName`, and `getVillageBuildingFrameName` do not exist.

- [ ] **Step 3: Add asset metadata implementation**

In `src/lib/game/content/assets.ts`, add this block after `StarterPackFrameName`:

```ts
export const villageBuildingAsset = {
	key: 'village-buildings',
	path: '/game/assets/village-buildings.png',
	cellWidth: 512,
	cellHeight: 512,
	columns: 2,
	frames: {
		heroHouse: { x: 0, y: 0, w: 512, h: 512 },
		guildHall: { x: 512, y: 0, w: 512, h: 512 },
		itemShop: { x: 0, y: 512, w: 512, h: 512 },
		villagerHouse: { x: 512, y: 512, w: 512, h: 512 }
	}
} as const;

export type VillageBuildingFrameName = keyof typeof villageBuildingAsset.frames;

const villageLandmarkFrames: Record<string, VillageBuildingFrameName> = {
	'hero-house-exterior': 'heroHouse',
	'guild-hall-exterior': 'guildHall',
	'item-shop-exterior': 'itemShop',
	'villager-house-1-exterior': 'villagerHouse',
	'villager-house-2-exterior': 'villagerHouse',
	'villager-house-3-exterior': 'villagerHouse'
};

export function getVillageBuildingFrameName(
	landmarkId: string
): VillageBuildingFrameName | undefined {
	return villageLandmarkFrames[landmarkId];
}
```

- [ ] **Step 4: Run metadata tests and verify they pass**

Run:

```bash
bun run test:unit -- src/lib/game/content/assets.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit metadata changes**

```bash
git add src/lib/game/content/assets.ts src/lib/game/content/assets.test.ts
git commit -m "Add village building asset metadata"
```

---

### Task 3: Preload Building Sheet

**Files:**

- Modify: `src/lib/game/phaser/scenes/BootScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Write failing preload test**

In the `BootScene` test named `preloads the static and animation sheets`, update the asset import:

```ts
const { animationPackAsset, starterPackAsset, villageBuildingAsset } =
	await import('$lib/game/content/assets');
```

Add this assertion after the existing preload assertions:

```ts
expect(scene.load.image).toHaveBeenCalledWith(villageBuildingAsset.key, villageBuildingAsset.path);
```

- [ ] **Step 2: Run scene tests and verify preload test fails**

Run:

```bash
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL because `BootScene.preload()` does not load `villageBuildingAsset`.

- [ ] **Step 3: Preload village building asset**

In `src/lib/game/phaser/scenes/BootScene.ts`, update the import:

```ts
import {
	animationPackAsset,
	starterPackAsset,
	villageBuildingAsset
} from '$lib/game/content/assets';
```

Update `preload()`:

```ts
preload() {
	this.load.image(starterPackAsset.key, starterPackAsset.path);
	this.load.image(animationPackAsset.key, animationPackAsset.path);
	this.load.image(villageBuildingAsset.key, villageBuildingAsset.path);
}
```

- [ ] **Step 4: Run scene tests and verify they pass**

Run:

```bash
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit preload changes**

```bash
git add src/lib/game/phaser/scenes/BootScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Preload village building sheet"
```

---

### Task 4: Render Building Images For Landmarks

**Files:**

- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Write failing landmark rendering test**

In `src/lib/game/phaser/scenes/scenes.test.ts`, update the test named `renders village building landmarks before doorway markers`.

Replace the first three expectations in that test with:

```ts
expect(scene.add.image).toHaveBeenCalledWith(384, 1_312, 'village-buildings', 'heroHouse');
expect(scene.add.image).toHaveBeenCalledWith(800, 1_088, 'village-buildings', 'guildHall');
expect(scene.add.image).toHaveBeenCalledWith(832, 1_472, 'village-buildings', 'itemShop');
expect(scene.add.image).toHaveBeenCalledWith(352, 1_024, 'village-buildings', 'villagerHouse');
expect(scene.add.image).toHaveBeenCalledWith(576, 1_568, 'village-buildings', 'villagerHouse');
expect(scene.add.image).toHaveBeenCalledWith(1_056, 1_344, 'village-buildings', 'villagerHouse');
expect(scene.add.rectangle).not.toHaveBeenCalledWith(384, 1_312, 192, 128, 0x5b4636, 0.9);
expect(scene.add.rectangle).not.toHaveBeenCalledWith(384, 1_376, 192, 24, 0x2f241c, 0.95);
```

Keep the existing label assertion:

```ts
expect(scene.add.text).toHaveBeenCalledWith(384, 1_252, "Hero's House", {
	color: '#f8fafc',
	fontSize: '12px'
});
```

Keep the existing doorway assertions:

```ts
expect(scene.add.image).toHaveBeenCalledWith(384, 1_408, 'starter-pack', 'doorwayTile');
expect(scene.add.image).toHaveBeenCalledWith(800, 1_168, 'starter-pack', 'doorwayTile');
expect(scene.add.image).toHaveBeenCalledWith(2_304, 1_280, 'starter-pack', 'doorwayTile');
```

Add display-size assertions:

```ts
const buildingMarkers = phaserState.imageMarkers.filter(
	(marker) =>
		marker.frame === 'heroHouse' ||
		marker.frame === 'guildHall' ||
		marker.frame === 'itemShop' ||
		marker.frame === 'villagerHouse'
);
expect(buildingMarkers).toHaveLength(6);
expect(
	buildingMarkers.find((marker) => marker.frame === 'heroHouse')?.setDisplaySize
).toHaveBeenCalledWith(192, 128);
expect(
	buildingMarkers.find((marker) => marker.frame === 'guildHall')?.setDisplaySize
).toHaveBeenCalledWith(256, 160);
expect(
	buildingMarkers.find((marker) => marker.frame === 'itemShop')?.setDisplaySize
).toHaveBeenCalledWith(192, 128);
```

- [ ] **Step 2: Run scene tests and verify landmark test fails**

Run:

```bash
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL because `WorldScene` still renders landmark rectangles instead of `village-buildings` images.

- [ ] **Step 3: Register building frames**

In `src/lib/game/phaser/scenes/WorldScene.ts`, update the asset import to include:

```ts
	getVillageBuildingFrameName,
	villageBuildingAsset,
```

In `create()`, after `this.registerStarterPackFrames();`, add:

```ts
this.registerVillageBuildingFrames();
```

Add this method after `registerStarterPackFrames()`:

```ts
private registerVillageBuildingFrames() {
	const texture = this.textures.get(villageBuildingAsset.key);

	for (const [frameName, frame] of Object.entries(villageBuildingAsset.frames)) {
		if (!texture.has(frameName)) {
			texture.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);
		}
	}
}
```

- [ ] **Step 4: Render building images for landmarks**

Replace `renderLandmarks(map: WorldMapDefinition)` with:

```ts
private renderLandmarks(map: WorldMapDefinition) {
	for (const landmark of map.landmarks ?? []) {
		const frameName = getVillageBuildingFrameName(landmark.id);

		if (frameName) {
			this.add
				.image(landmark.x, landmark.y, villageBuildingAsset.key, frameName)
				.setDisplaySize(landmark.width, landmark.height);
		}

		const label = this.add.text(landmark.x, landmark.y - landmark.height / 2 + 4, landmark.label, {
			color: '#f8fafc',
			fontSize: '12px'
		}) as OverlayMarker;
		label.setOrigin?.(0.5, 0);
	}
}
```

- [ ] **Step 5: Run scene tests and verify they pass**

Run:

```bash
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit WorldScene rendering changes**

```bash
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Render village building landmark art"
```

---

### Task 5: Full Verification

**Files:**

- Modify only to fix verification failures in the files already touched by this plan.

- [ ] **Step 1: Verify asset alpha**

Run:

```bash
python3 .codex/skills/2d-game-asset-workflow/scripts/inspect_png_alpha.py static/game/assets/village-buildings.png
```

Expected: output reports an alpha channel, `alpha_min` is `0`, and `transparent_pixels` is greater than `0`.

- [ ] **Step 2: Run targeted tests**

Run:

```bash
bun run test:unit -- src/lib/game/content/assets.test.ts src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run full unit tests**

Run:

```bash
bun run test:unit
```

Expected: PASS.

- [ ] **Step 4: Run Svelte and TypeScript checks**

Run:

```bash
bun run check
```

Expected: PASS with 0 errors and 0 warnings.

- [ ] **Step 5: Run production build**

Run:

```bash
bun run build
```

Expected: PASS.

- [ ] **Step 6: Run targeted formatting check for changed source files**

Run:

```bash
bunx prettier --check src/lib/game/content/assets.ts src/lib/game/content/assets.test.ts src/lib/game/phaser/scenes/BootScene.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts docs/superpowers/plans/2026-05-04-village-building-assets.md
```

Expected: PASS.

- [ ] **Step 7: Commit verification fixes**

When Steps 1-6 required code fixes, commit the exact fixed files:

```bash
git add static/game/assets/village-buildings.png src/lib/game/content/assets.ts src/lib/game/content/assets.test.ts src/lib/game/phaser/scenes/BootScene.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts docs/superpowers/plans/2026-05-04-village-building-assets.md
git commit -m "Stabilize village building asset wiring"
```

When no fixes were needed after prior task commits, do not create an empty commit.

---

## Manual QA Checklist

- [ ] Refresh `http://localhost:5173/game`.
- [ ] Confirm Hero's House uses building art instead of the brown rectangle block.
- [ ] Confirm the Guild, Item Shop, and three villager houses use building art.
- [ ] Confirm text labels remain readable.
- [ ] Confirm doorway markers remain visible and separate.
- [ ] Enter and exit at least one house and confirm the return doorway loop remains fixed.
- [ ] Confirm road enemies and ruins transition still behave as before.

---

## Self-Review Notes

- Spec coverage:
  - Transparent generated sheet: Task 1 and Task 5.
  - Four building frames: Task 1 and Task 2.
  - Centralized metadata: Task 2.
  - Boot preload: Task 3.
  - WorldScene rendering: Task 4.
  - Preserve layout/transitions/gameplay: Task 4 tests plus manual QA.
  - Alpha verification: Task 1 and Task 5.
  - Check/build verification: Task 5.
- Incomplete-step scan: no deferred implementation steps or vague test instructions are intentionally present.
- Type consistency:
  - `villageBuildingAsset`, `VillageBuildingFrameName`, and `getVillageBuildingFrameName` are introduced in Task 2 before BootScene and WorldScene use them.
