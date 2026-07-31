# Braided Entry Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework `meadow-entry` into a denser braided town and branching ruins approach while replacing oversized wall art with smaller modular environment dressing.

**Architecture:** Keep the map authored in `src/lib/game/content/maps.ts` using the existing `groundPatches`, `blockers`, `fences`, `forestDecor`, and `combatBounds` metadata. Keep collision rectangle-based in `WorldScene`, but select better-scaled image frames for town walls, hedges, ruin walls, gates, and stairs. Replace the existing PNG at the same public path so Phaser preload behavior remains stable.

**Tech Stack:** TypeScript, Phaser, Svelte/Vite, Vitest, Playwright/browser smoke, Bun, Pillow for PNG asset generation.

---

## File Structure

- Modify `src/lib/game/content/maps.test.ts`: add the new topology expectations for braided roads, blocker density, hedge blockers, and moved combat pockets.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`: update blocker frame expectations from `cityWall` to orientation-aware `townWall*` frames and add a hedge blocker case.
- Modify `src/lib/game/content/assets.ts`: change `environmentDressingAsset` from a `256x256` four-frame sheet to a smaller modular sheet.
- Modify `src/lib/game/content/maps.ts`: replace the simple loop-style entry roads with braided town roads, tighter blockers, hedge blockers, and branch combat pockets.
- Modify `src/lib/game/phaser/scenes/WorldScene.ts`: render `city-wall` blockers with horizontal/vertical town wall frames and render `town-hedge` blockers with horizontal/vertical hedge frames.
- Replace `public/game/assets/environment-dressing.png`: generate a transparent modular sheet with smaller cells.

## Task 1: Test The Denser Entry Contract

**Files:**

- Modify: `src/lib/game/content/maps.test.ts`
- Test: `src/lib/game/content/maps.test.ts`

- [ ] **Step 1: Add expected braided topology assertions**

Update the opening map tests so `meadowEntryMap.groundPatches` expects named roads such as:

```ts
'village-home-pocket';
'village-north-civic-lane';
'village-middle-market-lane';
'village-south-service-lane';
'village-east-gate-neck';
'outskirts-north-brush-lane';
'outskirts-south-brush-lane';
'ruins-final-stair-run';
```

Add assertions that the entry has at least `20` ground patches and at least `20` combined blockers/fences.

- [ ] **Step 2: Add hedge blocker expectations**

Extend the model map type test with:

```ts
{
	id: 'model-test-hedge',
	x: 720,
	y: 320,
	width: 160,
	height: 48,
	kind: 'town-hedge'
}
```

Then assert:

```ts
expect(modelTestMap.blockers?.map((blocker) => blocker.kind)).toEqual([
	'city-wall',
	'town-hedge',
	'future-gate'
]);
```

- [ ] **Step 3: Run the focused map test and verify RED**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: FAIL because `town-hedge` is not part of `MapBlockerKind` yet and the current map still declares the simpler route.

## Task 2: Test The Smaller Environment Dressing Frames

**Files:**

- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Update scene support blockers**

Add a hedge blocker to `registerSceneSupportTestMap()`:

```ts
{
	id: 'scene-support-hedge',
	x: 288,
	y: 224,
	width: 128,
	height: 32,
	kind: 'town-hedge'
}
```

- [ ] **Step 2: Update frame expectations**

Replace city wall expectations with orientation-aware frames:

```ts
expect(scene.add.tileSprite).toHaveBeenCalledWith(
	160,
	96,
	32,
	160,
	'environment-dressing',
	'townWallVertical'
);
expect(scene.add.tileSprite).toHaveBeenCalledWith(
	288,
	224,
	128,
	32,
	'environment-dressing',
	'townHedgeHorizontal'
);
```

Keep `futureGate`, `ruinWall`, and `stoneStair` expectations stable.

- [ ] **Step 3: Run the focused scene test and verify RED**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL because `town-hedge`, `townWallVertical`, and `townHedgeHorizontal` are not implemented yet.

## Task 3: Implement Asset Metadata And Rendering

**Files:**

- Modify: `src/lib/game/content/assets.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Extend blocker kinds**

In `src/lib/game/content/maps.ts`, change:

```ts
export type MapBlockerKind = 'city-wall' | 'ruin-wall' | 'future-gate';
```

to:

```ts
export type MapBlockerKind = 'city-wall' | 'town-hedge' | 'ruin-wall' | 'future-gate';
```

- [ ] **Step 2: Replace environment frame metadata**

In `src/lib/game/content/assets.ts`, define the environment sheet as `96x96` cells with these frames:

```ts
frames: {
	townWallHorizontal: { x: 0, y: 0, w: 96, h: 96 },
	townWallVertical: { x: 96, y: 0, w: 96, h: 96 },
	townHedgeHorizontal: { x: 192, y: 0, w: 96, h: 96 },
	townHedgeVertical: { x: 288, y: 0, w: 96, h: 96 },
	ruinWall: { x: 0, y: 96, w: 96, h: 96 },
	futureGate: { x: 96, y: 96, w: 96, h: 96 },
	stoneStair: { x: 192, y: 96, w: 96, h: 96 }
}
```

- [ ] **Step 3: Select blocker frames by kind and orientation**

In `WorldScene.getBlockerFrameName`, return:

```ts
if (blocker.kind === 'future-gate') return 'futureGate';
if (blocker.kind === 'ruin-wall') return 'ruinWall';
const suffix = blocker.width >= blocker.height ? 'Horizontal' : 'Vertical';
if (blocker.kind === 'town-hedge') return `townHedge${suffix}` as EnvironmentDressingFrameName;
return `townWall${suffix}` as EnvironmentDressingFrameName;
```

- [ ] **Step 4: Run the focused scene test and verify GREEN for rendering**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS after the map content task is complete, or fail only on missing map expectations before Task 4.

## Task 4: Author The Braided Entry Map

**Files:**

- Modify: `src/lib/game/content/maps.ts`
- Test: `src/lib/game/content/maps.test.ts`

- [ ] **Step 1: Replace simple town roads with braided routes**

Replace the `meadowEntryMap.groundPatches` town portion with small roads and courtyards:

```ts
{ id: 'village-home-pocket', x: 640, y: 5_200, width: 512, height: 288, tile: 'pathTile' }
{ id: 'village-north-civic-lane', x: 1_280, y: 4_552, width: 1_280, height: 128, tile: 'pathTile' }
{ id: 'village-middle-market-lane', x: 1_520, y: 5_040, width: 1_760, height: 128, tile: 'pathTile' }
{ id: 'village-south-service-lane', x: 1_560, y: 5_520, width: 1_360, height: 128, tile: 'pathTile' }
{ id: 'village-east-gate-neck', x: 3_200, y: 4_928, width: 640, height: 128, tile: 'pathTile' }
```

Add north/south alleys and compact courts so guild, shop, and villager door approaches are on connected roads.

- [ ] **Step 2: Replace broad blockers with smaller partitions**

Keep the outer district frame where needed, but add smaller partitions:

```ts
{ id: 'village-home-yard-north-wall', x: 640, y: 4_960, width: 352, height: 48, kind: 'town-hedge' }
{ id: 'village-guild-court-west-wall', x: 1_248, y: 4_288, width: 48, height: 352, kind: 'city-wall' }
{ id: 'village-market-yard-south-hedge', x: 2_160, y: 5_312, width: 544, height: 48, kind: 'town-hedge' }
```

Use short blockers and fences to break open yards without blocking required door arrivals.

- [ ] **Step 3: Move combat into branch pockets**

Move meadow encounters into branch pockets:

```ts
{ id: 'meadow-slime-west', x: 4_160, y: 3_520, enemyId: 'slime-scout' }
{ id: 'meadow-slime-center', x: 4_640, y: 4_912, enemyId: 'slime-scout' }
{ id: 'meadow-slime-east', x: 5_520, y: 2_080, enemyId: 'slime-scout' }
```

Update `combatBounds` so each encounter remains inside its assigned pocket.

- [ ] **Step 4: Run the focused map test and verify GREEN**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: PASS.

## Task 5: Generate And Verify The Modular PNG

**Files:**

- Replace: `public/game/assets/environment-dressing.png`
- Test: `.codex/skills/2d-game-asset-workflow/scripts/inspect_png_alpha.py`

- [ ] **Step 1: Generate the sheet**

Use a deterministic Pillow script to write a `384x192` transparent PNG with seven modular frames:
town horizontal wall, town vertical wall, town horizontal hedge, town vertical hedge, ruin wall, future gate, and stone stair.

- [ ] **Step 2: Inspect alpha**

Run:

```sh
python3 .codex/skills/2d-game-asset-workflow/scripts/inspect_png_alpha.py public/game/assets/environment-dressing.png
```

Expected: `has_alpha` is `true`, `alpha_min` is `0`, and `transparent_pixels` is greater than `0`.

## Task 6: Format, Verify, Smoke, And Commit

**Files:**

- Modify all touched source, test, doc, and PNG files.

- [ ] **Step 1: Format/check changed code**

Run:

```sh
bunx prettier --check docs/superpowers/plans/2026-05-18-braided-entry-layout.md src/lib/game/content/assets.ts src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git diff --check
```

- [ ] **Step 2: Run project verification**

Run:

```sh
bun run check
bun run build
bun run test
```

- [ ] **Step 3: Browser smoke**

Use the running dev server at `http://127.0.0.1:5175/` to inspect the entry layout, confirm the wall art is smaller, and verify the player can still reach `ruins-threshold`.

- [ ] **Step 4: Commit**

Run:

```sh
git add docs/superpowers/plans/2026-05-18-braided-entry-layout.md public/game/assets/environment-dressing.png src/lib/game/content/assets.ts src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat: braid entry layout and refine wall art"
```
