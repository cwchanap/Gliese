# HPA-586 Meadow Entry V2 Graybox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current object-first Meadow Entry and village interiors with an approved coordinate-first outdoor and interior graybox while preserving all existing gameplay identities and behavior.

**Architecture:** Keep Meadow Entry as the existing composition of `RegionFragment` sources, keep Sundrop terrain/path/decor grids in the existing layered source, and keep village interiors as direct `WorldMapDefinition` values. Add two small coordinate modules plus a top-left-to-centre helper in `layout-rects.ts`. `village-layered.ts` remains the tile-grid owner; `village.ts` composes pixel-positioned landmarks, transitions, pickups, and ambient NPCs from approved coordinates. Deliver Tasks 1–4 as the outdoor graybox PR, merge it, then deliver Tasks 5–9 as the interior graybox PR. Final art is outside both PRs.

**Tech Stack:** TypeScript, Svelte 5 + Vite, Phaser, Vitest, Playwright, Tauri.

## Global Constraints

- Preserve Meadow Entry at exactly `200 × 200` tiles (`6400 × 6400` px).
- Expand Sundrop Village to exactly `80 × 68` tiles at origin `{ x: 256, y: 3968 }`.
- Preserve current map IDs, NPC IDs, dialogue IDs, shop IDs, transition IDs, encounter IDs, pickup IDs, discovery IDs, quest behavior, and save schema.
- Treat HPA-400 as the functional baseline; do not reopen or revert its collision constants or save-position normalization.
- Use top-left `[x, y, width, height]` for design constants and convert to centre-based `MapRect` only at map-owner boundaries.
- Structural rectangles align to the 32 px grid. Prop visuals and narrow prop-collision strips may use 8 px increments after structural geometry is accepted.
- Use the current `WorldMapDefinition`, `RegionFragment`, `LayeredRegionSource`, `groundPatches`, `blockers`, `interiorProps`, and transition contracts.
- Reuse `bfsPath(...)` and `hasWidePath(...)` from `src/lib/game/content/maps/layered/geometry.ts`; do not create another graph or width algorithm.
- Do not extend `LayeredRegionSource` or `compileLayeredRegion(...)` merely to represent pixel-positioned village objects.
- Do not add `LayeredInteriorSource`, a room compiler, a wall generator, a procedural map generator, an editor integration, or a compatibility source.
- Do not add final Meadow Entry PNGs or final interior art.
- Keep HPA-406/HPA-496 assets and generated files in repository history, but remove their images and fallback ownership from the active Meadow Entry graybox composition.
- Do not add executable base-chunk constants in HPA-586. The final-art ticket chooses and validates the texture partition after real preflight.
- Interactive NPC approaches use shared runtime radii; tests do not restate the `29–48` interval as magic values.
- Do not create final-art follow-up tickets until both graybox PRs are manually accepted.

## Review Resolutions

The implementation incorporates these repository-backed corrections:

1. Keep route-width and path-connectivity proofs by reusing `hasWidePath(...)` and `bfsPath(...)` over authored path cells plus composed collision. An all-open collision-grid predicate is explicitly forbidden because it would pass trivially.
2. Use aspect-safe village building footprints because landmark width/height drives `setDisplaySize(...)`. Do not ship the previous 1.5×–2.2× horizontal stretching.
3. Record explicit prop-collision envelopes and reject NPC/approach overlap in the pure interior-layout tests.
4. Move the two collidable lanterns and flower bed outside the Village Green, building footprints, and route throats; add tests for their complete sprite and collision rectangles.
5. Update both `.agents/skills/gliese-world-expansion/references/authoring.md` and `CLAUDE.md` in the outdoor PR. `AGENTS.md` is a symlink and needs no separate edit.
6. Inventory both symbolic V1 dependencies and hard-coded V1 coordinate snapshots before editing.
7. Keep the full-base requirement in the design, but defer the exact 2×2/4×4 partition and executable coverage test to the final-art ticket.
8. Name the helper `layout-rects.ts`, use a non-corner `rectsConnect(...)` predicate, and avoid a generic `pointInsideRect` name that can be confused with centre-based runtime/test helpers.
9. Preserve `expectRouteHasNoEmptyStretch(...)`. Named road ground patches count as route interest; open floor away from named routes is allowed. If the invariant fails, extend a named route patch rather than adding random decorative filler.
10. Keep explicit wall arrays. Seven direct interiors do not justify a room compiler.

## Delivery Branches

After this documentation PR merges:

```text
Tasks 1–4: agent/hpa-586-outdoor-graybox
Tasks 5–9: agent/hpa-586-interior-graybox
```

Create the interior branch from `main` only after the outdoor PR merges. It consumes the shared exterior-door constants and revised village ownership introduced by Tasks 1–4.

---

## File Structure

### New files

```text
src/lib/game/content/maps/layouts/layout-rects.ts
src/lib/game/content/maps/layouts/meadow-entry-v2.ts
src/lib/game/content/maps/layouts/village-interiors-v2.ts
src/lib/game/content/maps/layouts/layouts.test.ts
```

Responsibilities:

- `layout-rects.ts`: immutable top-left point/rectangle types, explicit centre conversion, containment, positive-area overlap, non-corner connectivity, clearance, and expanded-point checks only.
- `meadow-entry-v2.ts`: world bounds, region envelopes, route rectangles, village bounds, public spaces, lots, aspect-safe footprints, doors, approaches, return arrivals, and building-to-road ownership.
- `village-interiors-v2.ts`: exact bounds, rooms, corridors, doors, wall rectangles, spawns, exits, NPC approaches, prop zones, and prop-collision envelopes for seven direct interiors.
- `layouts.test.ts`: pure coordinate invariants independent of Phaser and map compilation.

### Outdoor PR files

```text
CLAUDE.md
.agents/skills/gliese-world-expansion/references/authoring.md
package.json
src/lib/game/content/maps/layouts/layout-rects.ts
src/lib/game/content/maps/layouts/meadow-entry-v2.ts
src/lib/game/content/maps/layouts/layouts.test.ts
src/lib/game/content/maps/regions/village-layered.ts
src/lib/game/content/maps/regions/village-layered.test.ts
src/lib/game/content/maps/regions/village.ts
src/lib/game/content/maps/regions/paths.ts
src/lib/game/content/maps/regions/crossroads.ts
src/lib/game/content/maps/regions/soft-maze.test.ts
src/lib/game/content/maps/layered/preview.test.ts
src/lib/game/content/maps/meadow-entry.ts
src/lib/game/content/maps.test.ts
src/lib/game/content/maps.ts
src/lib/game/content/backgrounds/sundrop-village-retouch.test.ts
src/lib/game/phaser/scenes/scenes.test.ts
tests/e2e/game.e2e.ts
```

The outdoor PR removes only V1 tests whose subject is the obsolete live 56×48 geometry/package:

```text
src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
src/lib/game/content/backgrounds/sundrop-village-obstacle-controls.test.ts
src/lib/game/content/maps/layered/village-art-controls.test.ts
src/lib/game/content/sundrop-village-obstacle-assets.test.ts
```

Keep `sundrop-village-png.test.ts` and `sundrop-village-obstacle-composite.test.ts`: they use synthetic inputs and still validate reusable PNG/compositing behavior. Rewrite `sundrop-village-retouch.test.ts` to retain source-independent helpers and remove V1 source/hash/fingerprint assertions.

Do not delete V1 PNGs, generated modules, approval records, or captured proof artifacts in HPA-586. Their remaining source/tool cleanup belongs to the final V1 cleanup ticket after V2 art is live.

### Interior PR files

```text
src/lib/game/content/maps/layouts/village-interiors-v2.ts
src/lib/game/content/maps/layouts/layouts.test.ts
src/lib/game/content/maps.ts
src/lib/game/content/maps/regions/village.ts
src/lib/game/content/maps.test.ts
src/lib/game/phaser/scenes/scenes.test.ts
src/lib/game/save/save-state.test.ts
tests/e2e/game.e2e.ts
```

---

# Outdoor Graybox PR

### Task 1: Add layout-rectangle primitives and the outdoor coordinate contract

**Files:**
- Create: `src/lib/game/content/maps/layouts/layout-rects.ts`
- Create: `src/lib/game/content/maps/layouts/meadow-entry-v2.ts`
- Create: `src/lib/game/content/maps/layouts/layouts.test.ts`

**Interfaces:**
- Consumes: centre-based `MapRect`, `PLAYER_COLLISION_RADIUS`, `NORMALIZE_TRANSITION_RADIUS`, `villageBuildingAsset`, and `getVillageBuildingFrameName(...)`.
- Produces: `LayoutPoint`, `LayoutRect`, `NamedLayoutRect`, `point(...)`, `rect(...)`, `namedRect(...)`, `toMapRect(...)`, `rectContains(...)`, `rectsOverlap(...)`, `rectsConnect(...)`, `rectClearance(...)`, `layoutRectContainsPoint(...)`, `expandedLayoutRectContainsPoint(...)`, `MEADOW_ENTRY_V2_WORLD`, `MEADOW_ENTRY_V2_ROUTES`, `SUNDROP_VILLAGE_V2`, `SUNDROP_VILLAGE_V2_PUBLIC_SPACES`, `SUNDROP_VILLAGE_V2_BUILDINGS`, `SUNDROP_VILLAGE_APPROACH_ROADS`, and `VILLAGE_INTERIOR_EXTERIORS`.

- [ ] **Step 1: Write the failing pure-coordinate tests**

Create `layouts.test.ts` with these contracts:

```ts
import { describe, expect, it } from 'vitest';

import {
	getVillageBuildingFrameName,
	villageBuildingAsset
} from '$lib/game/content/assets';
import { PLAYER_COLLISION_RADIUS } from '$lib/game/core/collision';
import { NORMALIZE_TRANSITION_RADIUS } from '$lib/game/save/save-state';
import {
	MEADOW_ENTRY_V2_ROUTES,
	MEADOW_ENTRY_V2_WORLD,
	SUNDROP_VILLAGE_APPROACH_ROADS,
	SUNDROP_VILLAGE_V2,
	SUNDROP_VILLAGE_V2_BUILDINGS,
	SUNDROP_VILLAGE_V2_PUBLIC_SPACES,
	VILLAGE_INTERIOR_EXTERIORS
} from './meadow-entry-v2';
import {
	layoutRectContainsPoint,
	rectClearance,
	rectContains,
	rectsConnect,
	rectsOverlap
} from './layout-rects';

function expectStructuralGrid(value: { x: number; y: number; width: number; height: number }) {
	for (const [name, number] of Object.entries(value)) {
		expect(number, name).toBeGreaterThanOrEqual(0);
		expect(number % 32, `${name}=${number}`).toBe(0);
	}
}

it('keeps the world and enlarged village bounds stable', () => {
	expect(MEADOW_ENTRY_V2_WORLD).toEqual({ x: 0, y: 0, width: 6400, height: 6400 });
	expect(SUNDROP_VILLAGE_V2).toMatchObject({
		origin: { x: 256, y: 3968 },
		widthTiles: 80,
		heightTiles: 68,
		bounds: { x: 256, y: 3968, width: 2560, height: 2176 }
	});
	expect((2560 * 2176) / (1792 * 1536)).toBeGreaterThanOrEqual(2);
});

it('keeps footprints inside non-overlapping lots with 96 px clearance', () => {
	const buildings = Object.values(SUNDROP_VILLAGE_V2_BUILDINGS);
	for (const building of buildings) {
		expectStructuralGrid(building.lot);
		expectStructuralGrid(building.footprint);
		expectStructuralGrid(building.approach);
		expect(rectContains(SUNDROP_VILLAGE_V2.bounds, building.lot)).toBe(true);
		expect(rectContains(building.lot, building.footprint)).toBe(true);
		expect(rectContains(SUNDROP_VILLAGE_V2.bounds, building.approach)).toBe(true);
	}
	for (let left = 0; left < buildings.length; left += 1) {
		for (let right = left + 1; right < buildings.length; right += 1) {
			expect(rectsOverlap(buildings[left]!.lot, buildings[right]!.lot)).toBe(false);
			expect(rectClearance(buildings[left]!.footprint, buildings[right]!.footprint)).toBeGreaterThanOrEqual(96);
		}
	}
});

it('keeps building display rectangles within five percent of native frame aspect', () => {
	for (const building of Object.values(SUNDROP_VILLAGE_V2_BUILDINGS)) {
		const frameName = getVillageBuildingFrameName(building.landmarkId);
		expect(frameName, building.landmarkId).toBeDefined();
		const frame = villageBuildingAsset.frames[frameName!];
		const nativeAspect = frame.w / frame.h;
		const displayAspect = building.footprint.width / building.footprint.height;
		expect(Math.abs(displayAspect / nativeAspect - 1), building.landmarkId).toBeLessThanOrEqual(0.05);
	}
});

it('connects every approach to a named road without accepting corner-only contact', () => {
	for (const [buildingKey, roadKey] of Object.entries(SUNDROP_VILLAGE_APPROACH_ROADS)) {
		const building = SUNDROP_VILLAGE_V2_BUILDINGS[
			buildingKey as keyof typeof SUNDROP_VILLAGE_V2_BUILDINGS
		];
		const road = SUNDROP_VILLAGE_V2_PUBLIC_SPACES[
			roadKey as keyof typeof SUNDROP_VILLAGE_V2_PUBLIC_SPACES
		];
		expect(rectsConnect(building.approach, road), buildingKey).toBe(true);
	}
	expect(rectsConnect(rect(0, 0, 32, 32), rect(32, 32, 32, 32))).toBe(false);
});

it('runs both side lanes through all three road bands', () => {
	const { mainStreet, southLane, southernMeadowLane, westLane, eastLane } = SUNDROP_VILLAGE_V2_PUBLIC_SPACES;
	for (const lane of [westLane, eastLane]) {
		expect(lane.y).toBe(mainStreet.y + mainStreet.height);
		expect(lane.y + lane.height).toBe(southernMeadowLane.y);
		expect(rectsConnect(lane, mainStreet)).toBe(true);
		expect(rectsConnect(lane, southLane)).toBe(true);
		expect(rectsConnect(lane, southernMeadowLane)).toBe(true);
	}
});

it('connects the village, Crossroads, and all four destination mouths', () => {
	const routes = MEADOW_ENTRY_V2_ROUTES;
	expect(rectsConnect(routes.villageMainStreet, routes.villageToCrossroads)).toBe(true);
	expect(rectsConnect(routes.villageToCrossroads, routes.crossroadsPlaza)).toBe(true);
	expect(rectsConnect(routes.crossroadsPlaza, routes.crossroadsNorthTrunk)).toBe(true);
	expect(rectsConnect(routes.crossroadsNorthTrunk, routes.crossroadsToMistfen)).toBe(true);
	expect(rectsConnect(routes.crossroadsNorthTrunk, routes.crossroadsToSilverpine)).toBe(true);
	expect(rectsConnect(routes.crossroadsPlaza, routes.crossroadsToWildwood)).toBe(true);
	expect(rectsConnect(routes.crossroadsPlaza, routes.crossroadsToCoast)).toBe(true);
});

it('keeps every return outside its footprint and beyond the re-trigger envelope', () => {
	const triggerClearance = PLAYER_COLLISION_RADIUS + NORMALIZE_TRANSITION_RADIUS;
	for (const exterior of Object.values(VILLAGE_INTERIOR_EXTERIORS)) {
		expect(layoutRectContainsPoint(exterior.footprint, exterior.returnArrival)).toBe(false);
		expect(
			Math.hypot(
				exterior.returnArrival.x - exterior.door.x,
				exterior.returnArrival.y - exterior.door.y
			)
		).toBeGreaterThan(triggerClearance);
	}
});
```

Do not add a base-chunk partition test in HPA-586.

- [ ] **Step 2: Run and verify missing-module failure**

```bash
bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts
```

Expected: FAIL because the layout modules do not exist.

- [ ] **Step 3: Implement `layout-rects.ts`**

```ts
import type { MapRect } from '$lib/game/content/maps/types';

export interface LayoutPoint {
	readonly x: number;
	readonly y: number;
}

export interface LayoutRect extends LayoutPoint {
	readonly width: number;
	readonly height: number;
}

export interface NamedLayoutRect extends LayoutRect {
	readonly id: string;
}

export function point(x: number, y: number): LayoutPoint {
	return { x, y };
}

export function rect(x: number, y: number, width: number, height: number): LayoutRect {
	return { x, y, width, height };
}

export function namedRect(id: string, x: number, y: number, width: number, height: number): NamedLayoutRect {
	return { id, x, y, width, height };
}

export function toMapRect(id: string, value: LayoutRect): MapRect {
	return {
		id,
		x: value.x + value.width / 2,
		y: value.y + value.height / 2,
		width: value.width,
		height: value.height
	};
}

export function rectContains(outer: LayoutRect, inner: LayoutRect): boolean {
	return (
		inner.x >= outer.x &&
		inner.y >= outer.y &&
		inner.x + inner.width <= outer.x + outer.width &&
		inner.y + inner.height <= outer.y + outer.height
	);
}

export function rectsOverlap(left: LayoutRect, right: LayoutRect): boolean {
	return (
		left.x < right.x + right.width &&
		left.x + left.width > right.x &&
		left.y < right.y + right.height &&
		left.y + left.height > right.y
	);
}

export function rectsConnect(left: LayoutRect, right: LayoutRect): boolean {
	if (rectsOverlap(left, right)) return true;
	const sharedVerticalEdge =
		(left.x + left.width === right.x || right.x + right.width === left.x) &&
		Math.max(left.y, right.y) < Math.min(left.y + left.height, right.y + right.height);
	const sharedHorizontalEdge =
		(left.y + left.height === right.y || right.y + right.height === left.y) &&
		Math.max(left.x, right.x) < Math.min(left.x + left.width, right.x + right.width);
	return sharedVerticalEdge || sharedHorizontalEdge;
}

export function rectClearance(left: LayoutRect, right: LayoutRect): number {
	const gapX = Math.max(left.x - (right.x + right.width), right.x - (left.x + left.width), 0);
	const gapY = Math.max(left.y - (right.y + right.height), right.y - (left.y + left.height), 0);
	return Math.hypot(gapX, gapY);
}

export function layoutRectContainsPoint(value: LayoutRect, candidate: LayoutPoint): boolean {
	return (
		candidate.x >= value.x &&
		candidate.x <= value.x + value.width &&
		candidate.y >= value.y &&
		candidate.y <= value.y + value.height
	);
}

export function expandedLayoutRectContainsPoint(
	value: LayoutRect,
	candidate: LayoutPoint,
	padding: number
): boolean {
	return (
		candidate.x >= value.x - padding &&
		candidate.x <= value.x + value.width + padding &&
		candidate.y >= value.y - padding &&
		candidate.y <= value.y + value.height + padding
	);
}
```

Do not add clipping, room inference, route generation, object placement, or grid painting.

- [ ] **Step 4: Implement exact outdoor coordinate constants**

Create `meadow-entry-v2.ts` using the spec’s world, envelopes, routes, public spaces, and this exact building table:

| Key | Lot | Footprint | Door | Approach | Return |
|---|---|---|---|---|---|
| `villagerHouse1` | `[384,4064,576,448]` | `[544,4096,256,288]` | `(672,4384)` | `[608,4384,128,224]` | `(672,4448,down)` |
| `villagerHouse2` | `[1088,4064,576,448]` | `[1248,4096,256,288]` | `(1376,4384)` | `[1312,4384,128,224]` | `(1376,4448,down)` |
| `guildHall` | `[1888,4032,800,480]` | `[2048,4032,448,384]` | `(2272,4416)` | `[2208,4416,128,192]` | `(2272,4480,down)` |
| `itemShop` | `[384,4832,704,448]` | `[544,4864,320,320]` | `(704,5184)` | `[640,5184,128,192]` | `(704,5248,down)` |
| `blacksmith` | `[1952,4832,736,448]` | `[2112,4864,320,320]` | `(2272,5184)` | `[2208,5184,128,192]` | no interior |
| `heroHouse` | `[384,5536,704,416]` | `[576,5568,256,288]` | `(704,5856)` | `[640,5856,128,160]` | `(704,5920,down)` |
| `villagerHouse3` | `[1184,5536,576,416]` | `[1344,5568,256,288]` | `(1472,5856)` | `[1408,5856,128,160]` | `(1472,5920,down)` |
| `shrine` | `[1888,5504,800,448]` | `[2112,5536,320,320]` | `(2272,5856)` | `[2208,5856,128,160]` | `(2272,5920,down)` |

Each record carries its existing `landmarkId`, label key, map ID, transition ID where applicable, lot, footprint, door, approach, and return arrival. `blacksmith` has no map ID, transition ID, or return arrival.

Add:

```ts
export const SUNDROP_VILLAGE_APPROACH_ROADS = {
	villagerHouse1: 'mainStreet',
	villagerHouse2: 'mainStreet',
	guildHall: 'mainStreet',
	itemShop: 'southLane',
	blacksmith: 'southLane',
	heroHouse: 'southernMeadowLane',
	villagerHouse3: 'southernMeadowLane',
	shrine: 'southernMeadowLane'
} as const;
```

`VILLAGE_INTERIOR_EXTERIORS` contains only the seven maps with interiors and carries each map’s footprint, door, and return arrival from the same record.

- [ ] **Step 5: Run and pass the pure coordinate suite**

```bash
bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts
```

- [ ] **Step 6: Commit the coordinate contract**

```bash
git add src/lib/game/content/maps/layouts
git commit -m "test(layout): add HPA-586 coordinate contracts"
```

---

### Task 2: Rebuild Sundrop Village and migrate the complete V1 village surface

**Files:**
- Modify: `src/lib/game/content/maps/regions/village-layered.ts`
- Modify: `src/lib/game/content/maps/regions/village-layered.test.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps/regions/soft-maze.test.ts`
- Modify: `src/lib/game/content/maps/layered/preview.test.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/content/backgrounds/sundrop-village-retouch.test.ts`
- Modify: `.agents/skills/gliese-world-expansion/references/authoring.md`
- Modify: `CLAUDE.md`
- Modify: `package.json`
- Delete: the four V1-only live-geometry tests listed under File Structure.

**Interfaces:**
- Consumes: Task 1 constants, `compileLayeredRegion(...)`, `bfsPath(...)`, `hasWidePath(...)`, `collectStrictCollisionRects(...)`, and `collectLandmarkRects(...)`.
- Produces: an 80×68 layered path/decor source with neutral region labels, aspect-safe pixel objects, new-run spawn `{ x: 704, y: 5920 }`, shared exterior returns, preserved road-width proofs, and canonical authoring guidance.

- [ ] **Step 1: Inventory symbolic and coordinate coupling before editing**

Run both passes:

```bash
rg -n \
  'sundropVillageLayered|SUNDROP_VILLAGE_(BASE|FOREGROUND)|SUNDROP_OCCLUSION|PR1_BACKGROUND|activeMeadowEntry|fallback-only' \
  src tests tools package.json CLAUDE.md .agents

rg -n \
  '1792|1536|1152|5120|624|5712|4352|5888|sundropVillageBounds|hero-house-exterior|guild-hall-exterior|item-shop-exterior|villager-house-[123]-exterior|shrine-of-aurora' \
  src/lib/game/content/maps.test.ts \
  src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/phaser/scenes/scenes.test.ts \
  tests/e2e/game.e2e.ts
```

Classify every result:

1. **Active V2 consumer to rewrite:** map composition, village source/tests, map tests, scene tests, E2E, preview tests, spawn comments, and hard-coded landmark snapshots.
2. **Reusable generic test to keep:** background ownership, synthetic two-plane/alternative-owner scene tests, PNG validation, obstacle compositing, generic preview behavior, and source-independent retouch helpers.
3. **Historical static projection to keep:** generated HPA-406 arrays and `meadow-entry-runtime.test.ts`.
4. **V1-only live proof to remove or rewrite:** exact 56×48 art controls, ownership manifests, retouch hashes, live active-map load/render/occlusion evidence, and exact V1 sprite/bounds snapshots.

Record the classification in the outdoor PR body before changing the source.

- [ ] **Step 2: Replace old district tests with V2 structural tests**

In `village-layered.test.ts` remove contracts tied to:

- `H/P/M/N/G/S/E/C` room adjacency;
- exact 56×48 dimensions;
- V1 base/foreground rectangles;
- V1 object coordinates and decor fingerprints.

Add:

```ts
it('uses the approved 80 × 68 V2 bounds', () => {
	expect(sundropVillageLayered.origin).toEqual({ x: 256, y: 3968 });
	expect(sundropVillageLayered.width).toBe(80);
	expect(sundropVillageLayered.height).toBe(68);
});

it('keeps every layer dimensionally complete', () => {
	for (const [name, rows] of Object.entries(sundropVillageLayered.layers)) {
		expect(rows, name).toHaveLength(68);
		for (const [row, value] of rows.entries()) {
			expect(value.length, `${name}:${row}`).toBe(80);
		}
	}
});

it('uses no district glyph contract during the V2 graybox', () => {
	expect(sundropVillageLayered.layers.regions).toEqual(
		Array.from({ length: 68 }, () => '.'.repeat(80))
	);
});

it('keeps pixel-positioned objects out of the tile-centre compiler contract', () => {
	expect(sundropVillageLayered.objects).toEqual({});
});
```

In `soft-maze.test.ts`, remove village assertions derived from old region glyphs. Keep non-village shortcut tests. In `preview.test.ts`, use a tiny local fixture for legacy region-colour and unknown-magenta behavior instead of the live neutral village.

- [ ] **Step 3: Run focused tests and verify failure against V1**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps/regions/soft-maze.test.ts \
  src/lib/game/content/maps/layered/preview.test.ts \
  src/lib/game/content/maps.test.ts
```

Expected: FAIL on origin, dimensions, neutral regions, object ownership, landmarks, transitions, and spawn snapshots.

- [ ] **Step 4: Author the 80×68 path/decor layers**

Set:

```ts
origin: { x: 256, y: 3968 },
width: 80,
height: 68,
```

Keep `terrain`, `collision`, and `regions` entirely `.` for the first graybox. Use these inclusive zero-based path ranges:

| Glyph | Rows | Columns |
|---|---:|---:|
| `p` | `20–24` | `0–79` |
| `p` | `25–63` | `0–3` |
| `p` | `25–63` | `76–79` |
| `p` | `44–47` | `0–79` |
| `p` | `64–67` | `0–79` |
| `p` | `13–19` | `11–14` |
| `p` | `13–19` | `33–36` |
| `p` | `14–19` | `61–64` |
| `p` | `38–43` | `12–15` |
| `p` | `38–43` | `61–64` |
| `p` | `59–63` | `12–15` |
| `p` | `59–63` | `36–39` |
| `p` | `59–63` | `61–64` |
| `c` | `26–41` | `28–49` |
| `c` | `25` | `34–43` |
| `c` | `42–43` | `34–43` |

Add exactly four decor anchors:

```text
A at (77,22)
l at (25,28)
l at (53,28)
f at (22,53)
```

Keep `objects: {}`.

- [ ] **Step 5: Preserve painted-route width and connectivity proofs**

Reuse `bfsPath(...)` and `hasWidePath(...)` from `layered/geometry.ts`.

Define the walkable road predicate as:

```ts
const compiled = compileLayeredRegion(sundropVillageLayered);
const composedCollision = [
	...collectStrictCollisionRects(meadowEntryMap),
	...collectLandmarkRects(meadowEntryMap)
];
const isPaintedRoadCell = (col: number, row: number) => {
	const pathGlyph = sundropVillageLayered.layers.paths[row]?.[col] ?? '.';
	if (pathGlyph === '.' || sundropVillageLayered.layers.collision[row]?.[col] !== '.') return false;
	const x = sundropVillageLayered.origin.x + col * 32 + 16;
	const y = sundropVillageLayered.origin.y + row * 32 + 16;
	return !isInsideAnyCollisionRect(x, y, composedCollision, PLAYER_COLLISION_RADIUS);
};
```

Do **not** call `hasWidePath(...)` with `collision === '.'` as the sole predicate; the entire empty village would pass.

Assert:

- Main Street west-to-east has a 5-tile-wide painted path.
- West and east lanes have at least a 3-tile-wide painted path from Main Street through South Lane to Southern Meadow Lane.
- `bfsPath(...)` reaches a painted approach cell for every building from the Hero House frontage.
- Every approach cell selected for a door is outside the landmark collision after doorway carving.

Use helpers that choose tile centres inside each approach rectangle instead of hard-coding boundary door points as grid cells.

- [ ] **Step 6: Validate the four decor anchors**

Compile the layered source and assert:

- no decor sprite rectangle overlaps a building footprint;
- no decor collision rectangle overlaps a building footprint;
- neither pole-lantern collision overlaps the Village Green or a required route rectangle;
- the flower bed sprite stays outside the Hero House footprint;
- the gate arch has no collision and may visually span Main Street;
- village decor sprites remain pairwise non-overlapping.

- [ ] **Step 7: Compose village objects directly in `village.ts`**

Remove V1 Sundrop background imports and `createLayeredRegionBackground(...)` calls. Compile the grid once, then override landmarks, transitions, pickups, and ambient NPCs from Task 1 constants.

Preserve current IDs. Use these compact inbound arrivals until the interior PR:

```text
hero-house:                  (256,224,up)
item-shop:                   (256,288,up)
villager-house-1:            (256,288,up)
villager-house-2:            (256,288,up)
guild-hall:                  (384,480,up)
shrine-of-aurora-interior:   (256,288,up)
villager-house-3:            (256,288,up)
```

Keep the two pickup IDs and four ambient-NPC IDs, but place them outside building footprints, road throats, and decor sprites.

- [ ] **Step 8: Derive the new-run spawn and exterior returns**

In `maps.ts`, replace each interior outbound transition’s exterior arrival with its shared `returnArrival`.

In `meadow-entry.ts`:

```ts
spawn: { x: 704, y: 5920 },
spawnDirection: 'up',
```

Update the old Hero House coordinate comment instead of leaving a misleading `(624,5712)` explanation.

- [ ] **Step 9: Retire only V1 live-geometry proof contracts**

Delete:

```text
src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
src/lib/game/content/backgrounds/sundrop-village-obstacle-controls.test.ts
src/lib/game/content/maps/layered/village-art-controls.test.ts
src/lib/game/content/sundrop-village-obstacle-assets.test.ts
```

Rewrite `sundrop-village-retouch.test.ts` to keep only synthetic/source-independent helper tests. Keep `sundrop-village-png.test.ts` and `sundrop-village-obstacle-composite.test.ts` unchanged.

Remove these inactive V1 package-script entrypoints:

```text
art:controls:village
art:controls:village-obstacles
art:rasterize:village
art:finalize:village-obstacles
art:proof:village-obstacles
art:validate:village
```

Keep `preview:village`.

- [ ] **Step 10: Update both canonical authoring surfaces**

Update `.agents/skills/gliese-world-expansion/references/authoring.md` and the matching Content/Data Model paragraph in `CLAUDE.md`:

```md
## Sundrop Village Ownership

`village-layered.ts` owns Sundrop terrain, path, collision, neutral region-label,
and tile-decor grids. `village.ts` composes the resulting fragment with
pixel-positioned landmarks, transitions, pickups, ambient NPCs, and eventual
background planes from shared coordinate constants. Do not force pixel-positioned
objects through the layered compiler's tile-centre object contract.

## Structure Before Art

For a substantial spatial revision, define and review functional bounds, lots,
rooms, corridors, walls, doors, routes, transition approaches, and NPC approaches
before generating final art or placing decorative content. Prove the geometry with
a walkable graybox first.
```

`AGENTS.md` is a symlink to `CLAUDE.md`; edit `CLAUDE.md` only.

- [ ] **Step 11: Run all village/source tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/agent-skills.test.ts \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps/layered/geometry.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps/regions/soft-maze.test.ts \
  src/lib/game/content/maps/layered/preview.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-png.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-retouch.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-composite.test.ts \
  src/lib/game/content/maps.test.ts
```

- [ ] **Step 12: Commit the sparse village and ownership migration**

```bash
git add -A \
  CLAUDE.md \
  .agents/skills/gliese-world-expansion/references/authoring.md \
  package.json \
  src/lib/game/content/maps/layouts \
  src/lib/game/content/maps/regions \
  src/lib/game/content/maps/layered/preview.test.ts \
  src/lib/game/content/backgrounds \
  src/lib/game/content/sundrop-village-obstacle-assets.test.ts \
  src/lib/game/content/maps.ts \
  src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/content/maps.test.ts
git commit -m "feat(world): rebuild Sundrop Village graybox" \
  -m "Keep compact interior arrivals until the interior graybox PR."
```

---

### Task 3: Re-author routes and migrate the active-background proof surface

**Files:**
- Modify: `src/lib/game/content/maps/regions/paths.ts`
- Modify: `src/lib/game/content/maps/regions/crossroads.ts`
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `tests/e2e/game.e2e.ts`

**Interfaces:**
- Consumes: Task 1 route constants, existing destination fragments, generic renderer/background fixtures, and Task 2’s dependency inventory.
- Produces: one readable route network, clean destination seams, an active Meadow map with zero V1 backgrounds, runtime-faithful route assertions, and test coverage that separates historical V1 modules from playable V2 composition.

- [ ] **Step 1: Add failing active-composition assertions**

In `maps.test.ts`:

```ts
it('uses the live V2 graybox instead of the V1 semantic package', () => {
	expect(meadowEntryMap.backgroundImages ?? []).toEqual([]);
	for (const visual of [
		...(meadowEntryMap.blockers ?? []),
		...(meadowEntryMap.mapDecor ?? []),
		...(meadowEntryMap.fences ?? [])
	]) {
		expect(visual.visual?.mode).not.toBe('fallback-only');
	}
});
```

Replace the exact V1 24-background / 72-blocker / 69-decor / 6-fence assertion rather than keeping both contracts.

- [ ] **Step 2: Strengthen `expectRouteClear(...)` once**

The current helper checks blockers, interior props, and NPC bodies but misses fences, collidable map decor, and landmarks. Refactor it to build:

```ts
const routeCollisionRects = [
	...collectStrictCollisionRects(map),
	...collectLandmarkRects(map)
];
```

Check every sampled point against those carved collision rectangles with `PLAYER_COLLISION_RADIUS`, then keep the existing interior-prop and NPC checks. This makes all HPA-586 outdoor and interior route tests reflect runtime landmark doorway collision.

- [ ] **Step 3: Replace the shared path fragment**

Use these top-left rectangles, converted through `toMapRect(...)`:

```text
village-to-crossroads       [2816, 4608, 448, 160]
crossroads-to-mistfen       [3072, 3072, 608, 160]
mistfen-seam-horizontal     [2400, 3072, 672, 160]
mistfen-seam-vertical       [2240, 2752, 160, 480]
crossroads-to-silverpine    [3680, 2432, 192, 384]
silverpine-seam             [3424, 2336, 352, 192]
crossroads-to-wildwood      [4288, 4144, 704, 160]
wildwood-seam               [4704, 3776, 192, 384]
crossroads-to-coast         [4128, 4768, 192, 800]
```

Use `pathTile` for every patch. Delete the old `corridorWalls` array and leave `blockers: []`. Keep one non-colliding waymarker at `{ x: 3040, y: 4544 }`, outside the connector.

- [ ] **Step 4: Replace Crossroads local geometry**

In `crossroads.ts`:

- add `crossroads-plaza` from `[3264, 3680, 1024, 1088]` using `cobblestoneTile`;
- add `crossroads-north-trunk` from `[3680, 2816, 192, 864]` using `pathTile`;
- keep `crossroads-waystone` at `{ x: 3776, y: 4224, width: 120, height: 150 }`;
- move `castle-gate` and its sprite to `{ x: 4176, y: 2976, width: 480, height: 320 }`;
- move `crossroads-waystone-sign` to `{ x: 3904, y: 4224 }`;
- move `castle-gate-warning` to `{ x: 4176, y: 3200 }`;
- move `crossroads-cache` to `{ x: 4032, y: 4480 }`;
- move `crossroads-crier` to `{ x: 3584, y: 4384 }`;
- move `crossroads-traveler` to `{ x: 4032, y: 4384 }`;
- remove old plaza hedges and fences for the graybox;
- keep only castle gate, waystone, and non-colliding lanterns at `{ x: 3488, y: 3904 }` and `{ x: 4064, y: 3904 }`.

Preserve all IDs and localized keys.

- [ ] **Step 5: Remove V1 backgrounds and ownership from active composition**

In `meadow-entry.ts` remove active imports/calls for:

- `applyVisualOwnership`;
- `validateMapBackgroundOwnership`;
- `activeMeadowEntryRuntimeVisualOwners`;
- `meadowEntryRuntimeBackgroundImages`;
- `applySundropObstacleOwnership`;
- `validateSundropObstacleCoverage`.

Compose direct merged arrays. `village.ts` contributes no background and no other active fragment owns one, so `merged.backgroundImages` is empty.

- [ ] **Step 6: Migrate scene tests by ownership**

Keep:

- synthetic two-plane renderer tests;
- synthetic alternative-owner tests;
- generic missing-texture, wrong-dimension, render-failure, draw-order, fallback-selection, and diagnostic behavior.

Remove or replace live-Sundrop expectations for:

- V1 bounds `256..2048 × 4352..5888`;
- Sundrop texture keys and `1792×1536` display size;
- exact V1 fallback IDs and segment counts;
- exact V1 background transform ordering.

Add one active-map test asserting Meadow Entry emits no regional background entries and no selected fallback visuals.

- [ ] **Step 7: Retire V1 active-map E2E proof cases**

Remove imports/helpers/tests whose only subject is the active V1 Meadow package:

- `SUNDROP_OCCLUSION_CONTROL_INPUTS` and proof cases;
- PR1 background tables;
- Sundrop load-abort, wrong-dimension, render-fault, alternative-owner, occlusion, and enabled/disabled screenshot matrices.

Do not remove generic boot, movement, transition, encounter, shop, save, HUD, or map tests. Keep `meadow-entry-runtime.test.ts` unchanged as historical static projection coverage.

- [ ] **Step 8: Add runtime-faithful route tests**

Use the strengthened `expectRouteClear(...)` for:

```ts
expectRouteClear(meadowEntryMap, [
	{ x: 704, y: 5920 },
	{ x: 320, y: 5920 },
	{ x: 320, y: 4688 },
	{ x: 3264, y: 4688 },
	{ x: 3776, y: 4688 },
	{ x: 3776, y: 4224 }
], 'hero house to crossroads');

expectRouteClear(meadowEntryMap, [
	{ x: 3776, y: 4224 },
	{ x: 3776, y: 3136 },
	{ x: 3072, y: 3136 },
	{ x: 2320, y: 3136 },
	{ x: 2320, y: 2784 }
], 'crossroads to Mistfen seam');

expectRouteClear(meadowEntryMap, [
	{ x: 3776, y: 4224 },
	{ x: 3776, y: 2432 },
	{ x: 3440, y: 2432 }
], 'crossroads to Silverpine seam');

expectRouteClear(meadowEntryMap, [
	{ x: 3776, y: 4224 },
	{ x: 4800, y: 4224 },
	{ x: 4800, y: 3808 }
], 'crossroads to Wildwood seam');

expectRouteClear(meadowEntryMap, [
	{ x: 3776, y: 4224 },
	{ x: 4224, y: 4224 },
	{ x: 4224, y: 5520 }
], 'crossroads to Tidewatch Coast seam');
```

If a retained destination object blocks one route, move that object within its current functional area; do not bend a route to preserve accidental V1 art coordinates.

- [ ] **Step 9: Preserve route-interest coverage explicitly**

Keep `expectRouteHasNoEmptyStretch(...)`. Ground-patch centres count as interest, so every named route segment must be represented by a continuous route patch. Open floor outside named routes is allowed and is not judged by this invariant.

If the test reports a gap, extend or split the relevant named path patch. Do not add random decor merely to satisfy the radius check.

- [ ] **Step 10: Run the full unit suite**

```bash
bun run test:unit -- --run
```

This full run is mandatory because V1 coupling crosses map, background, preview, art-control, scene, save, and authoring-guard tests.

- [ ] **Step 11: Commit the route and active-composition migration**

```bash
git add \
  src/lib/game/content/maps/regions/paths.ts \
  src/lib/game/content/maps/regions/crossroads.ts \
  src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts \
  tests/e2e/game.e2e.ts
git commit -m "feat(world): rework Meadow Entry route graybox"
```

---

### Task 4: Validate and publish the outdoor graybox slice

**Files:**
- Modify: `tests/e2e/game.e2e.ts`
- Create during review: `docs/superpowers/reports/img/hpa-586/outdoor-overview.png`
- Create during review: `docs/superpowers/reports/img/hpa-586/sundrop-village.png`
- Create during review: `docs/superpowers/reports/img/hpa-586/village-crossroads.png`
- Create during review: `docs/superpowers/reports/img/hpa-586/wildwood-live-graybox.png`
- Create during review: `docs/superpowers/reports/img/hpa-586/outdoor-collision.png`

- [ ] **Step 1: Add the active-map zero-background E2E**

Start at `{ x: 704, y: 5920 }`. Assert one Meadow Entry renderer diagnostic with:

```ts
{
	mapId: 'meadow-entry',
	entries: [],
	successfulBackgroundIds: [],
	selectedFallbackBlockerIds: [],
	selectedFallbackDecorIds: [],
	selectedFallbackFenceIds: []
}
```

Also assert the canvas/HUD are ready and movement from the spawn succeeds.

- [ ] **Step 2: Add one continuous outdoor route E2E**

Use direct save injection only for the initial spawn, then drive real input through:

```text
Hero House frontage
→ west village lane
→ Main Street
→ Crossroads
→ Mistfen seam
→ Crossroads
→ Silverpine seam
→ Crossroads
→ Wildwood seam
→ Crossroads
→ Tidewatch Coast seam
→ Crossroads
→ Sundrop Village
```

Retain one pickup, discovery, encounter, gated transition, and save/reload assertion.

- [ ] **Step 3: Run all browser tests**

```bash
bun run test:e2e
```

- [ ] **Step 4: Run repository validation**

```bash
bun run test:unit -- --run
bun run check
bun run lint
bun run build
bun run build:tauri
```

Do not run or refresh inactive V1 art approval commands.

- [ ] **Step 5: Capture native-scale screenshots with the explicit graybox bar**

Capture at 100% browser scale. Use collision debug only for `outdoor-collision.png`.

Reject:

- blocked or sub-width roads;
- active V1 blurred bases;
- stretched building sprites;
- compressed village spacing;
- broken doors/returns;
- decor inside footprints, the green, or route throats;
- unreadable destination seams.

Do not reject for missing final grass variation, canopy density, forest richness, shoreline polish, or regional blending. `wildwood-live-graybox.png` proves retained live decor and absence of the stretched V1 base; it is not finished-biome approval.

- [ ] **Step 6: Perform the packaged Tauri outdoor walkthrough**

```bash
bun run tauri dev
```

Walk the same route and verify input, transitions, save/reload, and live collision. Record the result in the PR body; do not add another evidence ledger.

- [ ] **Step 7: Commit validation artifacts**

```bash
git add tests/e2e/game.e2e.ts docs/superpowers/reports/img/hpa-586
git commit -m "test(world): validate Meadow Entry V2 graybox"
```

Open the outdoor implementation PR as a draft and obtain layout approval before beginning final art or the interior PR.

---

# Interior Graybox PR

### Task 5: Add seven explicit interior blueprints, walls, and prop collisions

**Files:**
- Create: `src/lib/game/content/maps/layouts/village-interiors-v2.ts`
- Modify: `src/lib/game/content/maps/layouts/layouts.test.ts`

**Interfaces:**
- Consumes: Task 1 rectangle helpers and shared runtime radii.
- Produces: `VillageInteriorLayout`, `VILLAGE_INTERIOR_LAYOUTS`, exact wall arrays, exact NPC approaches, prop zones, and prop-collision envelopes. This module is coordinate data only.

- [ ] **Step 1: Add failing interior-layout invariants**

Extend `layouts.test.ts`:

```ts
import {
	NPC_INTERACTION_RADIUS,
	NPC_PACK_COLLISION_RADIUS,
	PLAYER_COLLISION_RADIUS
} from '$lib/game/core/collision';
import { VILLAGE_INTERIOR_LAYOUTS } from './village-interiors-v2';

it('keeps every interior rectangle in bounds and every approach clear', () => {
	const minimumApproach = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const maximumApproach = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;

	for (const layout of Object.values(VILLAGE_INTERIOR_LAYOUTS)) {
		const bounds = rect(0, 0, layout.widthTiles * 32, layout.heightTiles * 32);
		expect(layout.fullFloor).toEqual(bounds);
		for (const group of [
			layout.rooms,
			layout.corridors,
			layout.doors,
			layout.propZones,
			layout.propCollisions
		]) {
			for (const value of Object.values(group)) expect(rectContains(bounds, value)).toBe(true);
		}
		for (const wall of layout.walls) expect(rectContains(bounds, wall)).toBe(true);

		for (const { npc, approach } of Object.values(layout.npcApproaches)) {
			const distance = Math.hypot(npc.x - approach.x, npc.y - approach.y);
			expect(distance).toBeGreaterThanOrEqual(minimumApproach);
			expect(distance).toBeLessThanOrEqual(maximumApproach);
			for (const zone of Object.values(layout.propZones)) {
				expect(layoutRectContainsPoint(zone, approach)).toBe(false);
			}
			for (const collision of Object.values(layout.propCollisions)) {
				expect(expandedLayoutRectContainsPoint(collision, npc, PLAYER_COLLISION_RADIUS)).toBe(false);
				expect(expandedLayoutRectContainsPoint(collision, approach, PLAYER_COLLISION_RADIUS)).toBe(false);
			}
		}
	}
});
```

Also assert:

- no wall overlaps an opening rectangle;
- spawn and exit are clear with player-radius padding;
- every named room connects to the entrance;
- the three villager houses have unequal normalized room/wall signatures.

- [ ] **Step 2: Run and verify missing-module failure**

```bash
bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts
```

- [ ] **Step 3: Define the data shape**

```ts
export interface VillageInteriorLayout {
	readonly widthTiles: number;
	readonly heightTiles: number;
	readonly fullFloor: LayoutRect;
	readonly rooms: Readonly<Record<string, LayoutRect>>;
	readonly corridors: Readonly<Record<string, LayoutRect>>;
	readonly doors: Readonly<Record<string, LayoutRect>>;
	readonly walls: readonly NamedLayoutRect[];
	readonly spawn: LayoutPoint;
	readonly exit: LayoutPoint;
	readonly npcApproaches: Readonly<
		Record<string, { readonly npc: LayoutPoint; readonly approach: LayoutPoint }>
	>;
	readonly propZones: Readonly<Record<string, LayoutRect>>;
	readonly propCollisions: Readonly<Record<string, LayoutRect>>;
}
```

- [ ] **Step 4: Populate exact map contracts**

| Map | Tiles | Spawn | Exit | Interactive NPC / approach |
|---|---:|---:|---:|---|
| `guild-hall` | `32×26` | `(512,736)` | `(512,816)` | Master `(800,144)/(800,184)`; Quartermaster `(816,528)/(816,568)` |
| `hero-house` | `22×18` | `(352,480)` | `(352,560)` | none |
| `item-shop` | `26×20` | `(416,544)` | `(416,624)` | Mira `(416,320)/(416,360)` |
| `shrine-of-aurora-interior` | `24×22` | `(384,608)` | `(384,688)` | none |
| `villager-house-1` | `20×18` | `(320,480)` | `(320,560)` | Lynn `(160,416)/(200,416)` |
| `villager-house-2` | `22×18` | `(352,480)` | `(352,560)` | Toma `(192,192)/(232,192)` |
| `villager-house-3` | `20×20` | `(320,544)` | `(320,624)` | Io `(160,192)/(200,192)` |

Copy room, corridor, door, and prop-zone rectangles from the coordinate spec exactly.

Interaction-critical prop collisions:

```ts
const interactionPropCollisions = {
	guildMasterDesk: rect(728, 160, 144, 8),
	quartermasterCounter: rect(696, 544, 176, 8),
	miraCounter: rect(224, 336, 384, 8),
	tomaWorkbench: rect(112, 128, 160, 32),
	ioWestArchiveShelves: rect(80, 96, 48, 192)
} as const;
```

- [ ] **Step 5: Add explicit wall arrays**

Use the existing explicit wall contract. Guild Hall walls are:

```ts
[
	namedRect('guild-hall-wall-north', 0, 0, 1024, 64),
	namedRect('guild-hall-wall-west', 0, 64, 64, 736),
	namedRect('guild-hall-wall-east', 960, 64, 64, 736),
	namedRect('guild-hall-wall-south-west', 0, 800, 480, 32),
	namedRect('guild-hall-wall-south-east', 544, 800, 480, 32),
	namedRect('guild-hall-records-spine-north', 416, 64, 32, 80),
	namedRect('guild-hall-records-spine-south', 416, 240, 32, 80),
	namedRect('guild-hall-common-spine-north', 416, 352, 32, 96),
	namedRect('guild-hall-common-spine-south', 416, 544, 32, 96),
	namedRect('guild-hall-office-spine-north', 576, 64, 32, 48),
	namedRect('guild-hall-office-spine-south', 576, 208, 32, 48),
	namedRect('guild-hall-training-spine-north', 576, 288, 32, 32),
	namedRect('guild-hall-training-spine-south', 576, 416, 32, 32),
	namedRect('guild-hall-quartermaster-spine-north', 576, 480, 32, 32),
	namedRect('guild-hall-quartermaster-spine-south', 576, 608, 32, 32),
	namedRect('guild-hall-records-common-divider', 64, 320, 384, 32),
	namedRect('guild-hall-common-lobby-divider', 64, 640, 384, 32),
	namedRect('guild-hall-office-training-divider', 576, 256, 384, 32),
	namedRect('guild-hall-training-quartermaster-divider', 576, 448, 384, 32),
	namedRect('guild-hall-quartermaster-lobby-divider', 576, 640, 384, 32),
	namedRect('guild-hall-lobby-west-service', 64, 672, 288, 128),
	namedRect('guild-hall-lobby-east-service', 672, 672, 288, 128)
]
```

The remaining six maps use explicit outer wall bands and divider segments with only the openings listed in the spec. Do not generate them from rooms.

- [ ] **Step 6: Run and pass pure layout tests**

```bash
bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts
```

- [ ] **Step 7: Commit the interior coordinate contract**

```bash
git add src/lib/game/content/maps/layouts
git commit -m "feat(world): add village interior blueprints"
```

---

### Task 6: Rebuild Guild Hall as the reference architectural graybox

**Files:**
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Modify: `tests/e2e/game.e2e.ts`

- [ ] **Step 1: Add failing Guild Hall contracts**

Assert 32×26 bounds, spawn `(512,736)`, exit `(512,816)`, full floor, every wall ID, preserved NPC/shop identities, and exterior return `(2272,4480,down)`.

- [ ] **Step 2: Run and verify failure against HPA-400 layout**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

- [ ] **Step 3: Re-author Guild Hall directly in `maps.ts`**

Use:

- one full `cobblestoneTile` floor;
- room/corridor patches from layout constants;
- explicit `ruin-wall` blockers;
- Guild Master `(800,144)`, approach `(800,184)`, desk collision `[728,160,144,8]`;
- Quartermaster `(816,528)`, approach `(816,568)`, counter collision `[696,544,176,8]`;
- preserved dialogue, quest, shop, transition, and NPC IDs;
- only function-identifying props inside approved zones.

- [ ] **Step 4: Synchronize inbound arrival**

Set `meadow-to-guild-hall` arrival to `{ x: 512, y: 736, facing: 'up' }`.

- [ ] **Step 5: Add route and interaction assertions**

Use the strengthened `expectRouteClear(...)` from spawn to both NPC approaches, Records Hall, Training Hall, and exit. Assert NPC/approach clearance against prop collision with shared radii.

- [ ] **Step 6: Update scene, save, and E2E fixtures**

- Scene tests use the two new approaches.
- Save-state test normalizes a point inside a collidable Guild prop.
- Guild quest E2E starts at `(800,184)`.

- [ ] **Step 7: Run Guild-focused validation**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts \
  src/lib/game/save/save-state.test.ts
bun run test:e2e
```

- [ ] **Step 8: Commit the reference interior**

```bash
git add \
  src/lib/game/content/maps.ts \
  src/lib/game/content/maps/regions/village.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts \
  src/lib/game/save/save-state.test.ts \
  tests/e2e/game.e2e.ts
git commit -m "feat(world): rebuild Guild Hall architecture"
```

---

### Task 7: Rebuild Hero House and Item Shop

**Files:**
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Add failing map contracts**

```text
hero-house: 22×18, spawn (352,480), exit (352,560), return (704,5920,down)
item-shop:  26×20, spawn (416,544), exit (416,624), return (704,5248,down)
```

Assert Mira remains `shopkeeper-mira` with shop `miras-item-shop` at `(416,320)`, approach `(416,360)`, and counter collision `[224,336,384,8]`.

- [ ] **Step 2: Re-author both direct maps**

Use exact floors, rooms, walls, doors, zones, and minimal props from the layout module. Synchronize village inbound arrivals to their new spawns.

- [ ] **Step 3: Add routes and interaction tests**

Hero routes reach bedroom, study, living area, and exit. Item routes reach Mira, stockroom, office, both display aisles, and exit. The counter leaves both Mira and the approach clear after player-radius expansion.

- [ ] **Step 4: Run focused tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
```

- [ ] **Step 5: Commit both interiors**

```bash
git add \
  src/lib/game/content/maps.ts \
  src/lib/game/content/maps/regions/village.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat(world): rebuild home and shop interiors"
```

---

### Task 8: Rebuild Shrine and three distinct villager houses

**Files:**
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Add failing dimension, floor, and return contracts**

```text
shrine-of-aurora-interior: 24×22, spawn (384,608), exit (384,688), return (2272,5920,down)
villager-house-1:           20×18, spawn (320,480), exit (320,560), return (672,4448,down)
villager-house-2:           22×18, spawn (352,480), exit (352,560), return (1376,4448,down)
villager-house-3:           20×20, spawn (320,544), exit (320,624), return (1472,5920,down)
```

Assert the three house room/wall signatures are unequal.

- [ ] **Step 2: Re-author Shrine and House 1**

Use exact layouts and explicit walls. Preserve Lynn `(160,416)` / approach `(200,416)` and existing IDs.

- [ ] **Step 3: Re-author House 2 with a clear workbench**

Keep Toma `(192,192)` / approach `(232,192)`. Use workbench visual `[96,96,192,64]` and collision `[112,128,160,32]`; neither point may enter the player-padded collision.

- [ ] **Step 4: Re-author House 3 with clear archive shelving**

Keep Io `(160,192)` / approach `(200,192)`. Use west shelves visual/collision `[80,96,48,192]`; neither point may enter the player-padded collision.

- [ ] **Step 5: Synchronize inbound arrivals**

Set all four village transitions to the exact interior spawns while preserving IDs and exterior door coordinates.

- [ ] **Step 6: Add route and uniqueness tests**

For each map, route from spawn to every named room, changed NPC approach, and exit. Assert no pair of villager houses has the same normalized room/wall signature.

- [ ] **Step 7: Run focused validation**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
```

- [ ] **Step 8: Commit remaining interiors**

```bash
git add \
  src/lib/game/content/maps.ts \
  src/lib/game/content/maps/regions/village.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat(world): rebuild shrine and village houses"
```

---

### Task 9: Close the graybox validation loop

**Files:**
- Modify: `tests/e2e/game.e2e.ts`
- Create during review: `docs/superpowers/reports/img/hpa-586/guild-hall.png`
- Create during review: `docs/superpowers/reports/img/hpa-586/hero-house.png`
- Create during review: `docs/superpowers/reports/img/hpa-586/item-shop.png`
- Create during review: `docs/superpowers/reports/img/hpa-586/shrine.png`
- Create during review: `docs/superpowers/reports/img/hpa-586/villager-house-2.png`
- Create during review: `docs/superpowers/reports/img/hpa-586/interior-collision.png`

- [x] **Step 1: Extend E2E across all seven interiors**

Use one parameterized table. For each building:

1. start outside at the shared return/door contract;
2. enter with real input;
3. reach every named room;
4. interact with every changed NPC;
5. open and close Quartermaster and Item Shop interfaces where applicable;
6. exit to the exact exterior return;
7. verify first movement does not immediately re-enter.

Perform one Guild Hall save/reload.

- [x] **Step 2: Run complete validation**

```bash
bun run test:unit -- --run
bun run test:e2e
bun run check
bun run lint
bun run build
bun run build:tauri
```

- [x] **Step 3: Capture native-scale interior screenshots**

Capture the six named images at 100% scale. Use collision debug only for `interior-collision.png`.

- [x] **Step 4: Perform combined web and Tauri walkthroughs**

Verify:

- no V1 background renders;
- no playable interior cell relies only on the implicit fallback floor;
- every room is readable before final dressing;
- all shops/dialogues work;
- every exterior/interior round trip is stable;
- every NPC approach is visibly outside collidable furniture.

Run the same happy path under:

```bash
bun run tauri dev
```

Result: the complete web walkthrough passed, the release `.app` and DMG were built, and the
exact packaged executable opened an on-screen native window. The native route/input/save-reload
walkthrough remains **BLOCKED** because this environment cannot safely isolate the user's Tauri
save or control the native window; no native walkthrough pass is claimed.

- [x] **Step 5: Self-review HPA-586 completion**

Confirm:

- no placeholder coordinate remains;
- outdoor and interior geometry match the coordinate spec;
- building sprites are not stretched beyond the 5% aspect budget;
- V1 assets remain historical but inactive;
- V1-only active-map proof tests are gone while generic renderer, PNG/compositing, and static projection tests remain;
- no room compiler, compatibility source, or executable art-partition config was introduced;
- final-art ticket boundaries are concrete.

- [x] **Step 6: Commit final validation**

```bash
git add tests/e2e/game.e2e.ts docs/superpowers/reports/img/hpa-586
git commit -m "test(world): validate HPA-586 grayboxes"
```

Open the interior implementation PR as a draft. HPA-586 may move to Done only after both graybox PRs are merged and native-scale screenshots are accepted.

---

# Final Follow-up Tickets After HPA-586

Create these only after graybox acceptance:

1. **Meadow Entry V2 full-coverage art** — measure texture/file constraints, select a deterministic partition, produce the mandatory base and optional overlays, validate exact 6400×6400 coverage, and register runtime assets.
2. **Guild Hall final interior treatment** — replace graybox surfaces and minimal props without moving accepted geometry.
3. **Remaining village interior final treatment** — finish Hero House, Item Shop, Shrine, and three houses from accepted plans.
4. **V1 runtime/tool cleanup** — remove superseded HPA-406 preloads, generated activation, inactive V1 village tools/source, and obsolete ownership only after V2 art is live.

Final art conforms to accepted geometry. Authoritative collision, routes, doors, and interaction approaches must not be moved merely to fit an accidental generated image.
