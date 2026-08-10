# HPA-586 Meadow Entry V2 Graybox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current object-first Meadow Entry and village interiors with an approved coordinate-first outdoor and interior graybox while preserving all existing gameplay identities and behavior.

**Architecture:** Keep Meadow Entry as the existing composition of `RegionFragment` sources, keep Sundrop terrain/path/decor grids in the existing layered source, and keep village interiors as direct `WorldMapDefinition` values. Add two small coordinate modules plus a top-left-to-centre conversion helper. `village-layered.ts` remains the tile-layer owner; `village.ts` composes pixel-positioned landmarks, transitions, pickups, and ambient NPCs from approved coordinates so the design is not forced through the layered compiler's tile-centre object contract. Deliver Tasks 1–4 as the outdoor graybox PR, merge it, then deliver Tasks 5–9 as the interior graybox PR. Final art is outside both PRs.

**Tech Stack:** TypeScript, Svelte 5 + Vite, Phaser, Vitest, Playwright, Tauri.

## Global Constraints

- Preserve Meadow Entry at exactly `200 × 200` tiles (`6400 × 6400` px).
- Expand Sundrop Village to exactly `80 × 68` tiles at origin `{ x: 256, y: 3968 }`.
- Preserve current map IDs, NPC IDs, dialogue IDs, shop IDs, transition IDs, encounter IDs, pickup IDs, discovery IDs, quest behavior, and save schema.
- Treat HPA-400 as the functional baseline; do not reopen or revert its collision constants or save-position normalization.
- Use top-left `[x, y, width, height]` for design constants and convert to the repository's centre-based `MapRect` only at the map-owner boundary.
- Structural rectangles align to the 32 px grid. Prop visuals and narrow prop collision strips may use 8 px increments after structural geometry is accepted.
- Use the current `WorldMapDefinition`, `RegionFragment`, `LayeredRegionSource`, `groundPatches`, `blockers`, `interiorProps`, and transition contracts.
- Do not extend `LayeredRegionSource` or `compileLayeredRegion(...)` merely to represent pixel-positioned village objects.
- Do not add `LayeredInteriorSource`, a room compiler, a procedural map generator, an editor integration, or a compatibility layer.
- Do not add final Meadow Entry PNGs or final interior art.
- Keep HPA-406/HPA-496 assets and generated files in repository history, but remove their images and fallback ownership from the active Meadow Entry graybox composition.
- The future base-art contract remains four `3200 × 3200` chunks covering the exact world; HPA-586 validates the coordinate contract but does not create those PNGs.
- Interactive NPC approaches use shared runtime radii; do not restate `29` and `48` as unexplained literals in tests.
- Do not create final-art follow-up tickets until both graybox PRs are manually accepted.

## Review Corrections Incorporated

The outdoor PR is larger than the map-coordinate edits alone because V1 backgrounds are wired into active composition tests, renderer tests, E2E failure-injection proofs, village retouch controls, preview tooling, and old district-graph tests. The implementation must migrate that surface intentionally rather than discover it after the map rewrite.

The approved decisions are:

1. **V2 `regions` is neutral during graybox.** Keep all cells `.`. Do not introduce the proposed `A/B/G/M/P/K/H/C/S` lot glyph set. Lots and functional regions live in `layouts/meadow-entry-v2.ts`; the old `H/P/M/N/G/S/E/C` district contract belongs to the superseded V1 art workflow.
2. **V1 active-map proofs are retired, not adapted to V2.** Keep static generated V1 projection tests and generic renderer/background/PNG/compositing fixtures. Remove or rewrite tests and package commands whose only purpose is to prove the obsolete 56×48 live village or its active background package.
3. **Pure layout tests own pure geometry failures.** Approach-to-road connectivity, lane continuity, footprint clearance, route-rectangle continuity, and door/return trigger clearance fail before an 80×68 grid is authored.
4. **Authoring guidance changes in the outdoor PR.** The ownership split and structure-before-art rule must be canonical before the interior PR begins.
5. **Graybox emptiness is allowed.** Outside named roads and retained destination fragments, open live floor is expected. Review rejects blocked routes, active blurred V1 bases, compressed building placement, broken doors/returns, and unreadable seams; it does not judge final biome richness.
6. **No room compiler.** Explicit wall arrays remain intentionally repetitive and reviewable for seven maps.

## Delivery Branches

After this documentation PR merges:

```text
Tasks 1–4: agent/hpa-586-outdoor-graybox
Tasks 5–9: agent/hpa-586-interior-graybox
```

Create the interior branch from `main` only after the outdoor PR is merged, because it consumes the shared exterior-door constants and revised village ownership introduced by Tasks 1–4.

---

## File Structure

### New files

```text
src/lib/game/content/maps/layouts/geometry.ts
src/lib/game/content/maps/layouts/meadow-entry-v2.ts
src/lib/game/content/maps/layouts/village-interiors-v2.ts
src/lib/game/content/maps/layouts/layouts.test.ts
```

Responsibilities:

- `geometry.ts`: immutable point/rectangle types, explicit top-left-to-centre conversion, rectangle touch/overlap, containment, and minimum-clearance calculations only.
- `meadow-entry-v2.ts`: world bounds, base chunks, region envelopes, route rectangles, village bounds, public spaces, lots, footprints, doors, return arrivals, and building-to-road ownership.
- `village-interiors-v2.ts`: exact bounds, rooms, corridors, doors, wall rectangles, spawns, exits, NPC approaches, and prop zones for seven direct interiors.
- `layouts.test.ts`: pure coordinate invariants independent of Phaser and map compilation.

### Outdoor PR files

```text
src/lib/game/content/maps/layouts/geometry.ts
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
package.json
.agents/skills/gliese-world-expansion/references/authoring.md
```

The outdoor PR removes only V1 tests whose subject is the obsolete live 56×48 geometry/package:

```text
src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
src/lib/game/content/backgrounds/sundrop-village-obstacle-controls.test.ts
src/lib/game/content/maps/layered/village-art-controls.test.ts
src/lib/game/content/sundrop-village-obstacle-assets.test.ts
```

Keep `sundrop-village-png.test.ts` and `sundrop-village-obstacle-composite.test.ts`: they exercise reusable PNG validation/compositing with synthetic inputs and do not depend on the live V2 source. Rewrite `sundrop-village-retouch.test.ts` to retain only source-independent helper tests and remove V1 source/hash/fingerprint assertions.

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

### Task 1: Add explicit layout primitives and complete pure geometry contracts

**Files:**
- Create: `src/lib/game/content/maps/layouts/geometry.ts`
- Create: `src/lib/game/content/maps/layouts/meadow-entry-v2.ts`
- Create: `src/lib/game/content/maps/layouts/layouts.test.ts`

**Interfaces:**
- Consumes: centre-based `MapRect`, `PLAYER_COLLISION_RADIUS`, and `NORMALIZE_TRANSITION_RADIUS`.
- Produces: `LayoutPoint`, `LayoutRect`, `NamedLayoutRect`, `point(...)`, `rect(...)`, `namedRect(...)`, `toMapRect(...)`, `rectContains(...)`, `rectsTouchOrOverlap(...)`, `rectClearance(...)`, `pointInsideRect(...)`, `MEADOW_ENTRY_V2_WORLD`, `MEADOW_ENTRY_V2_BASE_CHUNKS`, `MEADOW_ENTRY_V2_ROUTES`, `SUNDROP_VILLAGE_V2`, `SUNDROP_VILLAGE_V2_PUBLIC_SPACES`, `SUNDROP_VILLAGE_V2_BUILDINGS`, `SUNDROP_VILLAGE_APPROACH_ROADS`, and `VILLAGE_INTERIOR_EXTERIORS`.

- [ ] **Step 1: Write the failing pure-coordinate tests**

Create `src/lib/game/content/maps/layouts/layouts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { PLAYER_COLLISION_RADIUS } from '$lib/game/core/collision';
import { NORMALIZE_TRANSITION_RADIUS } from '$lib/game/save/save-state';
import {
	MEADOW_ENTRY_V2_BASE_CHUNKS,
	MEADOW_ENTRY_V2_ROUTES,
	MEADOW_ENTRY_V2_WORLD,
	SUNDROP_VILLAGE_APPROACH_ROADS,
	SUNDROP_VILLAGE_V2,
	SUNDROP_VILLAGE_V2_BUILDINGS,
	SUNDROP_VILLAGE_V2_PUBLIC_SPACES,
	VILLAGE_INTERIOR_EXTERIORS
} from './meadow-entry-v2';
import {
	pointInsideRect,
	rectClearance,
	rectContains,
	rectsOverlap,
	rectsTouchOrOverlap
} from './geometry';

function expectStructuralGrid(value: { x: number; y: number; width: number; height: number }) {
	for (const [name, number] of Object.entries(value)) {
		expect(number, name).toBeGreaterThanOrEqual(0);
		expect(number % 32, `${name}=${number}`).toBe(0);
	}
}

describe('HPA-586 Meadow Entry V2 layout', () => {
	it('keeps the world at 6400 × 6400 and doubles the village area', () => {
		expect(MEADOW_ENTRY_V2_WORLD).toEqual({ x: 0, y: 0, width: 6400, height: 6400 });
		expect(SUNDROP_VILLAGE_V2).toMatchObject({
		origin: { x: 256, y: 3968 },
		widthTiles: 80,
		heightTiles: 68,
		bounds: { x: 256, y: 3968, width: 2560, height: 2176 }
	});
		expect((2560 * 2176) / (1792 * 1536)).toBeGreaterThanOrEqual(2);
	});

	it('partitions the future mandatory base over the exact world bounds', () => {
		for (const chunk of MEADOW_ENTRY_V2_BASE_CHUNKS) {
			expectStructuralGrid(chunk);
			expect(rectContains(MEADOW_ENTRY_V2_WORLD, chunk)).toBe(true);
		}
		for (let left = 0; left < MEADOW_ENTRY_V2_BASE_CHUNKS.length; left += 1) {
			for (let right = left + 1; right < MEADOW_ENTRY_V2_BASE_CHUNKS.length; right += 1) {
				expect(rectsOverlap(MEADOW_ENTRY_V2_BASE_CHUNKS[left]!, MEADOW_ENTRY_V2_BASE_CHUNKS[right]!)).toBe(false);
			}
		}
		expect(
			MEADOW_ENTRY_V2_BASE_CHUNKS.reduce(
				(total, chunk) => total + chunk.width * chunk.height,
				0
			)
		).toBe(MEADOW_ENTRY_V2_WORLD.width * MEADOW_ENTRY_V2_WORLD.height);
	});

	it('keeps footprints inside non-overlapping lots with at least 96 px between footprints', () => {
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

	it('connects every building approach to its named public road', () => {
		for (const [buildingKey, roadKey] of Object.entries(SUNDROP_VILLAGE_APPROACH_ROADS)) {
			const building = SUNDROP_VILLAGE_V2_BUILDINGS[buildingKey as keyof typeof SUNDROP_VILLAGE_V2_BUILDINGS];
			const road = SUNDROP_VILLAGE_V2_PUBLIC_SPACES[
				roadKey as keyof typeof SUNDROP_VILLAGE_V2_PUBLIC_SPACES
			];
			expect(rectsTouchOrOverlap(building.approach, road), buildingKey).toBe(true);
		}
	});

	it('runs both side lanes from Main Street to Southern Meadow Lane and through South Lane', () => {
		const { mainStreet, southLane, southernMeadowLane, westLane, eastLane } = SUNDROP_VILLAGE_V2_PUBLIC_SPACES;
		for (const lane of [westLane, eastLane]) {
			expect(lane.y).toBe(mainStreet.y + mainStreet.height);
			expect(lane.y + lane.height).toBe(southernMeadowLane.y);
			expect(rectsTouchOrOverlap(lane, mainStreet)).toBe(true);
			expect(rectsTouchOrOverlap(lane, southLane)).toBe(true);
			expect(rectsTouchOrOverlap(lane, southernMeadowLane)).toBe(true);
		}
	});

	it('connects the village, Crossroads, and all four destination mouths as rectangles', () => {
		const routes = MEADOW_ENTRY_V2_ROUTES;
		expect(rectsTouchOrOverlap(routes.villageMainStreet, routes.villageToCrossroads)).toBe(true);
		expect(rectsTouchOrOverlap(routes.villageToCrossroads, routes.crossroadsPlaza)).toBe(true);
		expect(rectsTouchOrOverlap(routes.crossroadsPlaza, routes.crossroadsNorthTrunk)).toBe(true);
		expect(rectsTouchOrOverlap(routes.crossroadsNorthTrunk, routes.crossroadsToMistfen)).toBe(true);
		expect(rectsTouchOrOverlap(routes.crossroadsNorthTrunk, routes.crossroadsToSilverpine)).toBe(true);
		expect(rectsTouchOrOverlap(routes.crossroadsPlaza, routes.crossroadsToWildwood)).toBe(true);
		expect(rectsTouchOrOverlap(routes.crossroadsPlaza, routes.crossroadsToCoast)).toBe(true);
	});

	it('keeps every return outside its footprint and beyond the transition re-trigger envelope', () => {
		const triggerClearance = PLAYER_COLLISION_RADIUS + NORMALIZE_TRANSITION_RADIUS;
		for (const exterior of Object.values(VILLAGE_INTERIOR_EXTERIORS)) {
			expect(pointInsideRect(exterior.returnArrival, exterior.footprint)).toBe(false);
			expect(
				Math.hypot(
					exterior.returnArrival.x - exterior.door.x,
					exterior.returnArrival.y - exterior.door.y
				)
			).toBeGreaterThan(triggerClearance);
		}
	});

	it('publishes one exterior contract for every village interior', () => {
		expect(Object.keys(VILLAGE_INTERIOR_EXTERIORS).sort()).toEqual([
		'guild-hall',
		'hero-house',
		'item-shop',
		'shrine-of-aurora-interior',
		'villager-house-1',
		'villager-house-2',
		'villager-house-3'
	]);
	});
});
```

- [ ] **Step 2: Run the test and verify module-resolution failure**

```bash
bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts
```

Expected: FAIL because the layout modules do not exist.

- [ ] **Step 3: Implement geometry primitives**

Create `src/lib/game/content/maps/layouts/geometry.ts`:

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

export function rectsTouchOrOverlap(left: LayoutRect, right: LayoutRect): boolean {
	return (
		left.x <= right.x + right.width &&
		left.x + left.width >= right.x &&
		left.y <= right.y + right.height &&
		left.y + left.height >= right.y
	);
}

export function rectClearance(left: LayoutRect, right: LayoutRect): number {
	const gapX = Math.max(left.x - (right.x + right.width), right.x - (left.x + left.width), 0);
	const gapY = Math.max(left.y - (right.y + right.height), right.y - (left.y + left.height), 0);
	return Math.hypot(gapX, gapY);
}

export function pointInsideRect(point: LayoutPoint, value: LayoutRect): boolean {
	return (
		point.x >= value.x &&
		point.x <= value.x + value.width &&
		point.y >= value.y &&
		point.y <= value.y + value.height
	);
}
```

Do not add clipping, room inference, route generation, object placement, or grid painting.

- [ ] **Step 4: Implement the outdoor coordinate constants**

Create `src/lib/game/content/maps/layouts/meadow-entry-v2.ts` with the exact values in the coordinate spec. At minimum, expose these records without deriving or guessing values:

```ts
export const MEADOW_ENTRY_V2_WORLD = rect(0, 0, 6400, 6400);

export const MEADOW_ENTRY_V2_BASE_CHUNKS = [
	rect(0, 0, 3200, 3200),
	rect(3200, 0, 3200, 3200),
	rect(0, 3200, 3200, 3200),
	rect(3200, 3200, 3200, 3200)
] as const;

export const MEADOW_ENTRY_V2_REGION_ENVELOPES = {
	mistfen: rect(384, 384, 2816, 3712),
	silverpine: rect(2432, 384, 2048, 2432),
	crossroads: rect(2880, 2816, 1728, 1952),
	wildwood: rect(4320, 256, 1824, 5312),
	coast: rect(3328, 4768, 2816, 1376),
	village: rect(256, 3968, 2560, 2176)
} as const;

export const MEADOW_ENTRY_V2_ROUTES = {
	villageMainStreet: rect(256, 4608, 2560, 160),
	villageToCrossroads: rect(2816, 4608, 448, 160),
	crossroadsPlaza: rect(3264, 3680, 1024, 1088),
	crossroadsNorthTrunk: rect(3680, 2816, 192, 864),
	crossroadsToMistfen: rect(3072, 3072, 608, 160),
	crossroadsToSilverpine: rect(3680, 2432, 192, 384),
	crossroadsToWildwood: rect(4288, 4144, 704, 160),
	crossroadsToCoast: rect(4128, 4768, 192, 800)
} as const;

export const SUNDROP_VILLAGE_V2 = {
	origin: point(256, 3968),
	widthTiles: 80,
	heightTiles: 68,
	bounds: MEADOW_ENTRY_V2_REGION_ENVELOPES.village
} as const;

export const SUNDROP_VILLAGE_V2_PUBLIC_SPACES = {
	mainStreet: MEADOW_ENTRY_V2_ROUTES.villageMainStreet,
	westLane: rect(256, 4768, 128, 1248),
	eastLane: rect(2688, 4768, 128, 1248),
	southLane: rect(256, 5376, 2560, 128),
	southernMeadowLane: rect(256, 6016, 2560, 128),
	villageGreen: rect(1152, 4800, 704, 512),
	greenNorthStep: rect(1344, 4768, 320, 32),
	greenSouthStep: rect(1344, 5312, 320, 64),
	well: rect(1408, 4960, 192, 192)
} as const;
```

Use this exact building table:

| Key | Lot | Footprint | Door | Approach | Return |
|---|---|---|---|---|---|
| `villagerHouse1` | `[384,4064,576,448]` | `[512,4128,320,224]` | `(672,4352)` | `[608,4352,128,256]` | `(672,4416,down)` |
| `villagerHouse2` | `[1088,4064,576,448]` | `[1216,4128,320,224]` | `(1376,4352)` | `[1312,4352,128,256]` | `(1376,4416,down)` |
| `guildHall` | `[1888,4032,800,480]` | `[1984,4096,576,288]` | `(2272,4384)` | `[2208,4384,128,224]` | `(2272,4448,down)` |
| `itemShop` | `[384,4832,704,448]` | `[480,4896,448,256]` | `(704,5152)` | `[640,5152,128,224]` | `(704,5216,down)` |
| `blacksmith` | `[1952,4832,736,448]` | `[2048,4896,416,256]` | `(2272,5152)` | `[2208,5152,128,224]` | no interior |
| `heroHouse` | `[384,5536,704,416]` | `[480,5600,448,224]` | `(704,5824)` | `[640,5824,128,192]` | `(704,5888,down)` |
| `villagerHouse3` | `[1184,5536,576,416]` | `[1312,5600,320,224]` | `(1472,5824)` | `[1408,5824,128,192]` | `(1472,5888,down)` |
| `shrine` | `[1888,5504,800,448]` | `[2080,5568,384,256]` | `(2272,5824)` | `[2208,5824,128,192]` | `(2272,5888,down)` |

Each building record includes its existing `landmarkId`, existing transition ID where applicable, label key, map ID, lot, footprint, door, approach, and return arrival. `blacksmith` has no map ID, transition ID, or return arrival.

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

`VILLAGE_INTERIOR_EXTERIORS` contains only the seven maps with interiors and carries each map's footprint, door, and return arrival from the same building record.

- [ ] **Step 5: Run and pass the pure coordinate suite**

```bash
bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the coordinate contract**

```bash
git add src/lib/game/content/maps/layouts
git commit -m "test(layout): add HPA-586 coordinate contracts"
```

---

### Task 2: Rebuild Sundrop Village and retire V1 live-source contracts

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
- Modify: `package.json`
- Modify: `.agents/skills/gliese-world-expansion/references/authoring.md`
- Delete: the four V1-only live-geometry test files listed under File Structure.

**Interfaces:**
- Consumes: Task 1 layout constants and `compileLayeredRegion(...)` for terrain/path/collision/decor only.
- Produces: an 80×68 layered path/decor source with neutral region labels, directly composed pixel-positioned village objects, new-run spawn `{ x: 704, y: 5888 }`, exterior returns derived from one coordinate source, and canonical authoring guidance that matches the new ownership split.

- [ ] **Step 1: Inventory every V1/live-source dependency before editing**

Run:

```bash
rg -l \
  'sundropVillageLayered|SUNDROP_VILLAGE_(BASE|FOREGROUND)|SUNDROP_OCCLUSION|PR1_BACKGROUND|fallback-only' \
  src tests tools package.json
```

Classify every result into exactly one group:

1. **Active V2 consumer to rewrite:** `village.ts`, `village-layered.test.ts`, `maps.test.ts`, `soft-maze.test.ts`, `scenes.test.ts`, `game.e2e.ts`, preview tests.
2. **Reusable generic test to keep:** `background-ownership.test.ts`, `sundrop-village-png.test.ts`, `sundrop-village-obstacle-composite.test.ts`, synthetic two-plane/alternative-owner scene tests, generic preview rendering tests, and source-independent retouch helper tests.
3. **Historical static projection to keep:** generated HPA-406 arrays and `meadow-entry-runtime.test.ts`.
4. **V1-only live-geometry proof to remove or rewrite:** exact retouch hashes/fingerprints, exact 56×48 control fingerprints, obstacle ownership/control/asset proofs, active-map Sundrop background fault and occlusion cases.

Do not begin the 80×68 rewrite until every search result is classified in the outdoor PR notes.

- [ ] **Step 2: Replace old district/graph tests with V2 structural tests**

In `village-layered.test.ts`, remove assertions tied to:

- `H/P/M/N/G/S/E/C` room adjacency;
- exact 56×48 dimensions;
- exact V1 base/foreground rectangles;
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
	expect(sundropVillageLayered.layers.regions).toEqual(Array.from({ length: 68 }, () => '.'.repeat(80)));
});

it('keeps pixel-positioned objects out of the tile-centre compiler contract', () => {
	expect(sundropVillageLayered.objects).toEqual({});
});
```

In `soft-maze.test.ts`, delete village assertions that derive room bounds from old region glyphs. Replace village-specific shortcut/lane expectations with the Task 1 route constants and `expectRouteClear(...)` coverage in `maps.test.ts`. Keep non-village shortcut tests that still express current gameplay intent.

In `preview.test.ts`, stop using the live village as the fixture for static region-colour coverage. Use a tiny local `LayeredRegionSource` fixture containing the known legacy glyphs so `REGION_FILL` and unknown-magenta behavior remain generically tested while the live V2 `regions` layer stays neutral.

- [ ] **Step 3: Run the focused tests and verify failure against the old source**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps/regions/soft-maze.test.ts \
  src/lib/game/content/maps/layered/preview.test.ts \
  src/lib/game/content/maps.test.ts
```

Expected: FAIL on origin, dimensions, neutral regions, object ownership, landmarks, and transition anchors.

- [ ] **Step 4: Replace the village layer dimensions and path ranges**

In `village-layered.ts` set:

```ts
origin: { x: 256, y: 3968 },
width: 80,
height: 68,
```

Author five 80-character × 68-row layers. Keep `terrain`, `collision`, and `regions` entirely `.` for the first graybox. Use these inclusive zero-based path ranges:

| Glyph | Rows | Columns |
|---|---:|---:|
| `p` | `20–24` | `0–79` |
| `p` | `25–63` | `0–3` |
| `p` | `25–63` | `76–79` |
| `p` | `44–47` | `0–79` |
| `p` | `64–67` | `0–79` |
| `p` | `12–19` | `11–14` |
| `p` | `12–19` | `33–36` |
| `p` | `13–19` | `61–64` |
| `p` | `37–43` | `12–15` |
| `p` | `37–43` | `61–64` |
| `p` | `58–63` | `12–15` |
| `p` | `58–63` | `36–39` |
| `p` | `58–63` | `61–64` |
| `c` | `26–41` | `28–49` |
| `c` | `25` | `34–43` |
| `c` | `42–43` | `34–43` |

Add only four non-colliding graybox decor anchors: gate arch `A` at `(77,22)`, pole lantern `l` at `(31,34)` and `(46,34)`, and flower bed `f` at `(9,53)`. Keep `objects: {}`.

- [ ] **Step 5: Compose village objects directly in `village.ts`**

Remove the V1 Sundrop background imports and `createLayeredRegionBackground(...)` calls. Compile the layered source once, then override pixel-positioned fields from Task 1 constants:

```ts
const layered = compileLayeredRegion(sundropVillageLayered);
const buildings = SUNDROP_VILLAGE_V2_BUILDINGS;

function buildingLandmark(
	building: (typeof buildings)[keyof typeof buildings]
): NonNullable<RegionFragment['landmarks']>[number] {
	return {
		...toMapRect(building.landmarkId, building.footprint),
		labelKey: building.labelKey
	};
}

export const villageRegion: RegionFragment = {
	...layered,
	landmarks: [
		buildingLandmark(buildings.villagerHouse1),
		buildingLandmark(buildings.villagerHouse2),
		buildingLandmark(buildings.guildHall),
		buildingLandmark(buildings.itemShop),
		buildingLandmark(buildings.blacksmith),
		buildingLandmark(buildings.heroHouse),
		buildingLandmark(buildings.villagerHouse3),
		buildingLandmark(buildings.shrine),
		{
			...toMapRect('sundrop-well', SUNDROP_VILLAGE_V2_PUBLIC_SPACES.well),
			labelKey: 'content.maps.landmarks.sundrop-well.label'
		}
	],
	transitions: [
		{ id: buildings.heroHouse.transitionId, ...buildings.heroHouse.door, toMapId: 'hero-house', showMarker: false, arrival: { x: 256, y: 224, facing: 'up' } },
		{ id: buildings.itemShop.transitionId, ...buildings.itemShop.door, toMapId: 'item-shop', showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } },
		{ id: buildings.villagerHouse1.transitionId, ...buildings.villagerHouse1.door, toMapId: 'villager-house-1', showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } },
		{ id: buildings.villagerHouse2.transitionId, ...buildings.villagerHouse2.door, toMapId: 'villager-house-2', showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } },
		{ id: buildings.guildHall.transitionId, ...buildings.guildHall.door, toMapId: 'guild-hall', showMarker: false, arrival: { x: 384, y: 480, facing: 'up' } },
		{ id: buildings.shrine.transitionId, ...buildings.shrine.door, toMapId: 'shrine-of-aurora-interior', showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } },
		{ id: buildings.villagerHouse3.transitionId, ...buildings.villagerHouse3.door, toMapId: 'villager-house-3', showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } }
	],
	pickups: [
		{ id: 'village-market-cache', x: 1040, y: 5104, itemId: 'field-potion', quantity: 1 },
		{ id: 'village-shrine-cache', x: 2576, y: 5744, itemId: 'sunleaf-salve', quantity: 1 }
	],
	ambientNpcs: [
		{ id: 'village-wanderer', x: 1424, y: 4880, frameName: 'travelerNpc' },
		{ id: 'village-woodcutter', x: 1008, y: 4560, frameName: 'woodcutterNpc' },
		{ id: 'village-pilgrim', x: 2032, y: 5984, frameName: 'pilgrimNpc' },
		{ id: 'village-crier', x: 1680, y: 5136, frameName: 'crierNpc' }
	]
};
```

Do not import direct interior maps into `village.ts`; generic map tests synchronize inbound arrivals.

The compact inbound arrivals shown above are intentional for the outdoor PR. Do not update them to the future interior-blueprint spawns until Tasks 6–8. Note this explicitly in the commit body so a reviewer does not “correct” them early.

- [ ] **Step 6: Derive new-run spawn and exterior returns from Task 1**

In `maps.ts`, replace each interior outbound transition's exterior `arrival` with the corresponding shared `returnArrival`.

In `meadow-entry.ts`, set:

```ts
spawn: { x: 704, y: 5888 },
spawnDirection: 'up',
```

- [ ] **Step 7: Retire V1 live-geometry proof contracts without deleting reusable utility tests**

Delete:

```text
src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
src/lib/game/content/backgrounds/sundrop-village-obstacle-controls.test.ts
src/lib/game/content/maps/layered/village-art-controls.test.ts
src/lib/game/content/sundrop-village-obstacle-assets.test.ts
```

Rewrite `sundrop-village-retouch.test.ts` so it no longer imports the live `sundropVillageLayered`, runs the 1792×1536 approved-image `beforeAll`, or asserts V1 fingerprints/hashes. Retain focused synthetic tests for:

- `measureSundropVillageIdenticalDeltaRuns(...)`;
- `sundropVillageEdgeGuardStrength(...)`;
- any other helper whose inputs are supplied entirely by the test.

Keep `sundrop-village-png.test.ts` and `sundrop-village-obstacle-composite.test.ts` unchanged; their synthetic inputs still validate reusable PNG/compositing behavior.

Remove these V1 package-script entrypoints from `package.json` so the inactive pipeline is not advertised against the live V2 source:

```text
art:controls:village
art:controls:village-obstacles
art:rasterize:village
art:finalize:village-obstacles
art:proof:village-obstacles
art:validate:village
```

Keep `preview:village`; it remains a valid live path/collision preview even though the V2 region-label layer is neutral.

Update `maps.test.ts` to replace the exact 24-background/72-blocker/69-decor/6-fence composition assertion with the V2 active-map contract introduced in Task 3.

Do not create a 56×48 compatibility source, district snapshot, feature flag, or dual runtime map.

- [ ] **Step 8: Update canonical world-expansion guidance now**

In `.agents/skills/gliese-world-expansion/references/authoring.md`, replace the claim that `village.ts` is only a thin compiler/background wrapper with:

```md
## Sundrop Village Ownership

`village-layered.ts` owns Sundrop terrain, path, collision, neutral region-label,
and tile-decor grids. `village.ts` composes the resulting fragment with
pixel-positioned landmarks, transitions, pickups, ambient NPCs, and background
planes from shared coordinate constants. Do not force pixel-positioned objects
through the layered compiler's tile-centre object contract.

## Structure Before Art

For a substantial spatial revision, define and review functional bounds, lots,
rooms, corridors, walls, doors, routes, transition approaches, and NPC
approaches before generating final art or placing decorative content. Prove the
geometry with a walkable graybox first. Final art conforms to accepted collision
and route geometry; do not move authoritative geometry merely to fit an
accidental image.
```

Do not create another skill, template, schema, or approval workflow.

- [ ] **Step 9: Run all village/source tests, not only the new layout test**

```bash
bun run test:unit -- --run \
  src/lib/game/content/agent-skills.test.ts \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps/regions/soft-maze.test.ts \
  src/lib/game/content/maps/layered/preview.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-png.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-retouch.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-composite.test.ts \
  src/lib/game/content/maps.test.ts
```

Expected: PASS after old district and V1 active-map assumptions are removed while reusable utilities remain covered.

- [ ] **Step 10: Commit the sparse village and ownership migration**

```bash
git add -A \
  src/lib/game/content/maps/layouts \
  src/lib/game/content/maps/regions \
  src/lib/game/content/maps/layered/preview.test.ts \
  src/lib/game/content/backgrounds \
  src/lib/game/content/sundrop-village-obstacle-assets.test.ts \
  src/lib/game/content/maps.ts \
  src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/content/maps.test.ts \
  package.json \
  .agents/skills/gliese-world-expansion/references/authoring.md
git commit -m "feat(world): rebuild Sundrop Village graybox" -m "Keep current compact interior arrivals until the interior graybox PR."
```

---

### Task 3: Re-author routes and migrate the complete active-background test surface

**Files:**
- Modify: `src/lib/game/content/maps/regions/paths.ts`
- Modify: `src/lib/game/content/maps/regions/crossroads.ts`
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `tests/e2e/game.e2e.ts`

**Interfaces:**
- Consumes: Task 1 route constants, existing destination fragments, generic renderer/background-ownership fixtures, and the V1 dependency inventory from Task 2.
- Produces: one readable route network, clean seams into retained destinations, an active Meadow map with zero V1 backgrounds, live blockers/decor/fences, and test coverage that distinguishes historical V1 modules from the playable V2 composition.

- [ ] **Step 1: Add failing active-composition assertions**

In `maps.test.ts` add:

```ts
it('uses the V2 live graybox instead of the V1 semantic background package', () => {
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

Replace the old exact V1 composition test rather than keeping both contracts.

Add exact route-patch assertions for all eight `MEADOW_ENTRY_V2_ROUTES` values after converting them through `toMapRect(...)`.

- [ ] **Step 2: Run map, scene, and E2E collection to expose the full blast radius**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
bun run test:e2e -- --list
```

Expected before migration: map and live-Sundrop scene assertions fail, and the E2E list still contains V1 load-failure, dimension-fault, render-fault, alternative-owner, occlusion, and evidence cases.

- [ ] **Step 3: Replace the shared path fragment**

Replace `paths.ts` ground patches with centre-based conversions of these exact top-left rectangles:

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

Use `pathTile` for every patch. Delete the old `corridorWalls` array and leave `blockers: []`. Keep one non-colliding waymarker at `{ x: 3040, y: 4544 }`, outside the 160 px connector.

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
- retain IDs and localized keys;
- keep only castle gate, waystone, and non-colliding lanterns at `{ x: 3488, y: 3904 }` and `{ x: 4064, y: 3904 }`.

- [ ] **Step 5: Remove V1 backgrounds and ownership from active composition**

In `meadow-entry.ts` remove active imports/calls for:

- `applyVisualOwnership`;
- `validateMapBackgroundOwnership`;
- `activeMeadowEntryRuntimeVisualOwners`;
- `meadowEntryRuntimeBackgroundImages`;
- `applySundropObstacleOwnership`;
- `validateSundropObstacleCoverage`.

Compose direct merged arrays:

```ts
export const meadowEntryMap: WorldMapDefinition = addEnglishMapText({
	id: openingMapId,
	width: 200,
	height: 200,
	spawnDirection: 'up',
	spawn: { x: 704, y: 5888 },
	landmarks: merged.landmarks,
	transitions: merged.transitions,
	groundPatches: merged.groundPatches,
	blockers: merged.blockers,
	fences: merged.fences,
	mapDecor: merged.mapDecor,
	combatBounds: merged.combatBounds,
	encounters: merged.encounters,
	npcs: merged.npcs,
	ambientNpcs: merged.ambientNpcs,
	pickups: merged.pickups,
	discoveries: merged.discoveries,
	backgroundImages: merged.backgroundImages
});
```

`village.ts` contributes no background and no other active fragment owns one, so `merged.backgroundImages` is empty.

- [ ] **Step 6: Migrate scene tests by ownership, not by blanket deletion**

In `scenes.test.ts`:

Keep:

- synthetic `registerTwoPlaneBackgroundTestMap()` tests;
- synthetic alternative-owner tests;
- generic missing texture, wrong dimensions, render-failure, draw-order, and fallback-selection behavior;
- generic renderer diagnostics.

Remove or replace live-Sundrop expectations for:

- exact V1 village bounds `256..2048 × 4352..5888`;
- exact Sundrop texture keys and display size `1792×1536`;
- exact selected fallback IDs and segment counts;
- exact V1 background transform ordering.

Add one active-map test:

```ts
it('renders the Meadow Entry V2 graybox with no regional background planes', async () => {
	const target = installPlaneDiagnosticListener();
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	try {
		scene.create({ mapId: 'meadow-entry' });
		expect(target.diagnostics).toHaveLength(1);
		expect(target.diagnostics[0]).toMatchObject({
			mapId: 'meadow-entry',
			entries: [],
			successfulBackgroundIds: [],
			selectedFallbackBlockerIds: [],
			selectedFallbackDecorIds: [],
			selectedFallbackFenceIds: []
		});
	} finally {
		target.restore();
	}
});
```

- [ ] **Step 7: Remove V1 active-map E2E proof cases**

In `tests/e2e/game.e2e.ts`, remove imports/constants/helpers and tests whose only subject is the active V1 Meadow package:

- `SUNDROP_OCCLUSION_CONTROL_INPUTS` and `SUNDROP_OCCLUSION_PROOF_CASES`;
- PR1 background descriptor/status tables;
- Sundrop base/foreground load-abort cases;
- wrong-dimension base/foreground cases;
- V1 render-fault cases;
- alternative-owner active-Wildwood case;
- V1 foreground occlusion loop;
- V1 enabled/disabled evidence screenshot matrix.

Do not remove generic boot, movement diagnostics, transition, encounter, shop, save, HUD, or map tests.

Keep `meadow-entry-runtime.test.ts` unchanged; it verifies the historical static generated projection module, not active playable composition.

- [ ] **Step 8: Extend route tests through retained destination seams**

Use the existing `expectRouteClear(...)` helper for these exact routes:

```ts
expectRouteClear(meadowEntryMap, [
	{ x: 704, y: 5888 },
	{ x: 320, y: 5888 },
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

If a retained destination object blocks one route, move that object within its existing functional area; do not bend a route to preserve accidental V1 art coordinates.

- [ ] **Step 9: Run the full unit suite after the migration**

```bash
bun run test:unit -- --run
```

Expected: PASS. This full run is required because the V1 coupling crossed map, background, preview, art-control, scene, and save test areas.

- [ ] **Step 10: Commit the route and active-composition migration**

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

**Interfaces:**
- Consumes: completed outdoor graybox and current Playwright save/position fixtures.
- Produces: a browser-tested continuous route, zero-background active-map diagnostics, native-scale screenshots, and a written human-approval boundary.

- [ ] **Step 1: Add the active-map zero-background E2E**

Start from `{ x: 704, y: 5888 }`, capture the regional-background plane diagnostic, and assert:

```ts
expect(diagnostic).toMatchObject({
	mapId: 'meadow-entry',
	entries: [],
	successfulBackgroundIds: [],
	selectedFallbackBlockerIds: [],
	selectedFallbackDecorIds: [],
	selectedFallbackFenceIds: []
});
```

Also assert the canvas and field HUD are ready and movement from the new spawn succeeds.

- [ ] **Step 2: Add one continuous outdoor route E2E**

Use direct save injection only to start at the new spawn. Drive real input through:

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

At each seam assert movement diagnostics do not report a blocked request for the intended direction. Retain one pickup, one discovery, one encounter, one gated transition, and one save/reload assertion from the existing HPA-406 route.

- [ ] **Step 3: Run all browser tests**

```bash
bun run test:e2e
```

Expected: PASS after V1-only cases are removed and V2 route coverage is added.

- [ ] **Step 4: Run repository validation**

```bash
bun run test:unit -- --run
bun run check
bun run lint
bun run build
bun run build:tauri
```

Expected: all commands pass. Do not run or refresh Meadow or V1 village art approval commands because no approved art input is being changed.

- [ ] **Step 5: Capture native-scale screenshots with the explicit graybox bar**

Capture the five named images at 100% browser scale. Use `?mapDebug=collision` only for `outdoor-collision.png`.

Human acceptance rules:

- Open floor outside named roads and retained destination fragments is expected during graybox.
- Reject blocked routes, active V1 blurred bases, compressed village placement, broken doors/returns, overlapping lots/footprints, and unreadable connector seams.
- `wildwood-live-graybox.png` proves retained destination decor still renders and the stretched V1 base is absent; it is not a finished-biome review.
- Do not reject this PR for missing final grass variation, canopy richness, forest density, shoreline polish, or regional blending. Those belong to the V2 final-art ticket.

- [ ] **Step 6: Perform the packaged Tauri outdoor walkthrough**

```bash
bun run tauri dev
```

Walk the same route and verify input, transitions, save/reload, and live geometry. Record the result in the outdoor PR body; do not add a separate evidence ledger.

- [ ] **Step 7: Commit E2E and review artifacts**

```bash
git add tests/e2e/game.e2e.ts docs/superpowers/reports/img/hpa-586
git commit -m "test(world): validate Meadow Entry V2 graybox"
```

Open the outdoor implementation PR as a draft and obtain layout approval before beginning final art or the interior PR.

---

# Interior Graybox PR

### Task 5: Add seven explicit interior blueprints and wall contracts

**Files:**
- Create: `src/lib/game/content/maps/layouts/village-interiors-v2.ts`
- Modify: `src/lib/game/content/maps/layouts/layouts.test.ts`

**Interfaces:**
- Consumes: Task 1 geometry primitives and shared runtime NPC radii.
- Produces: `VillageInteriorLayout`, `VILLAGE_INTERIOR_LAYOUTS`, exact wall arrays, exact NPC approaches, and prop zones. This module is coordinate data only; it does not compile maps.

- [ ] **Step 1: Add failing interior-layout invariants using shared radii**

Append to `layouts.test.ts`:

```ts
import {
	NPC_INTERACTION_RADIUS,
	NPC_PACK_COLLISION_RADIUS,
	PLAYER_COLLISION_RADIUS
} from '$lib/game/core/collision';
import { VILLAGE_INTERIOR_LAYOUTS } from './village-interiors-v2';

it('keeps every interior rectangle inside its map and every approach valid', () => {
	const minimumApproach = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const maximumApproach = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;

	for (const layout of Object.values(VILLAGE_INTERIOR_LAYOUTS)) {
		const bounds = { x: 0, y: 0, width: layout.widthTiles * 32, height: layout.heightTiles * 32 };
		expect(layout.fullFloor).toEqual(bounds);
		for (const group of [layout.rooms, layout.corridors, layout.doors, layout.propZones]) {
			for (const value of Object.values(group)) {
				expect(rectContains(bounds, value)).toBe(true);
			}
		}
		for (const wall of layout.walls) {
			expect(rectContains(bounds, wall)).toBe(true);
		}
		for (const { npc, approach } of Object.values(layout.npcApproaches)) {
			const distance = Math.hypot(npc.x - approach.x, npc.y - approach.y);
			expect(distance).toBeGreaterThanOrEqual(minimumApproach);
			expect(distance).toBeLessThanOrEqual(maximumApproach);
		}
	}
});
```

- [ ] **Step 2: Run and verify missing-module failure**

```bash
bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts
```

Expected: FAIL because `village-interiors-v2.ts` does not exist.

- [ ] **Step 3: Define the data shape**

Create `village-interiors-v2.ts`:

```ts
import type { LayoutPoint, LayoutRect, NamedLayoutRect } from './geometry';

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
}
```

- [ ] **Step 4: Populate exact room, door, spawn, approach, and prop-zone records**

Use these exact map contracts from the coordinate spec:

| Map | Tiles | Spawn | Exit | Interactive NPC / approach |
|---|---:|---:|---:|---|
| `guild-hall` | `32×26` | `(512,736)` | `(512,816)` | Master `(800,144)/(800,184)`; Quartermaster `(816,528)/(816,568)` |
| `hero-house` | `22×18` | `(352,480)` | `(352,560)` | none |
| `item-shop` | `26×20` | `(416,544)` | `(416,624)` | Mira `(416,320)/(416,360)` |
| `shrine-of-aurora-interior` | `24×22` | `(384,608)` | `(384,688)` | none |
| `villager-house-1` | `20×18` | `(320,480)` | `(320,560)` | Lynn `(160,416)/(200,416)` |
| `villager-house-2` | `22×18` | `(352,480)` | `(352,560)` | Toma `(192,192)/(232,192)` |
| `villager-house-3` | `20×20` | `(320,544)` | `(320,624)` | Io `(160,192)/(200,192)` |

Copy the exact room, corridor, opening, and prop-zone rectangles from sections 7–13 of `docs/superpowers/specs/2026-08-09-meadow-entry-v2-coordinate-design.md` without renaming keys or changing values.

Use explicit wall arrays. The Guild Hall walls are:

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

The remaining six wall arrays remain explicit literals following the same rule: outer wall bands, named divider segments, and only the openings listed in the spec. Do not generate them from rooms.

- [ ] **Step 5: Add wall/opening and map-uniqueness tests**

For each layout:

- every wall is inside bounds;
- no wall overlaps an opening rectangle;
- spawn and exit are outside wall rectangles with player-radius padding;
- each named room is connected to the entrance through listed corridors/openings;
- the three villager houses have unequal normalized room and wall signatures.

- [ ] **Step 6: Run and pass pure layout tests**

```bash
bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts
```

Expected: PASS.

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

**Interfaces:**
- Consumes: `VILLAGE_INTERIOR_LAYOUTS['guild-hall']`, Task 1 exterior contract, existing `expectRouteClear(...)`, shared NPC radii, and HPA-400 save normalization.
- Produces: a 32×26 Guild Hall with complete floor coverage, explicit walls/doors, preserved Guild behavior, and reachable NPC approaches.

- [ ] **Step 1: Write failing Guild Hall contracts**

Assert dimensions, spawn, exit, exterior return, NPC identity, full floor, every wall ID, and inbound arrival:

```ts
expect(guildHallMap).toMatchObject({
	width: 32,
	height: 26,
	spawnDirection: 'up',
	spawn: { x: 512, y: 736 }
});
expect(guildHallMap.transitions[0]).toMatchObject({
	id: 'guild-hall-to-meadow',
	x: 512,
	y: 816,
	arrival: { x: 2272, y: 4448, facing: 'down' }
});
```

- [ ] **Step 2: Run the focused map test and verify failure**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: FAIL against the HPA-400 24×18 connected-zone map.

- [ ] **Step 3: Re-author Guild Hall directly in `maps.ts`**

Use:

- one full `cobblestoneTile` patch covering 1024×832;
- room/corridor patches from the layout constants;
- every explicit wall converted to a `ruin-wall` blocker;
- spawn `(512,736)` and exit `(512,816)`;
- Guild Master `(800,144)`, approach `(800,184)`;
- Quartermaster `(816,528)`, approach `(816,568)`;
- exterior return `(2272,4448,down)`;
- preserved NPC/dialogue/shop/transition IDs;
- only function-identifying props inside approved prop zones.

- [ ] **Step 4: Synchronize the village inbound arrival**

In `village.ts`, set `meadow-to-guild-hall` arrival to `{ x: 512, y: 736, facing: 'up' }` while preserving its exterior door coordinate and ID.

- [ ] **Step 5: Add route and interaction assertions**

Use `expectRouteClear(...)` from spawn to:

```text
Guild Master approach: (800,184)
Quartermaster approach: (816,568)
Records Hall: (320,192)
Training Hall: (704,368)
Exit: (512,816)
```

Assert NPC approach distances using shared radii, not literal bounds.

- [ ] **Step 6: Update scene, save, and E2E fixtures**

- Scene tests use the new two NPC approach points.
- Save-state test serializes a point inside a collidable Guild prop and asserts normalization moves it outside all wall/prop collisions.
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

Expected: PASS.

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

### Task 7: Rebuild Hero House and Item Shop grayboxes

**Files:**
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

**Interfaces:**
- Consumes: Hero House and Item Shop layouts and Task 6 direct-map pattern.
- Produces: a three-zone home, a four-zone shop, complete floors, explicit walls, preserved Mira shop behavior, and synchronized inbound arrivals.

- [ ] **Step 1: Add failing map contracts**

Assert:

```text
hero-house: 22×18, spawn (352,480), exit (352,560)
item-shop: 26×20, spawn (416,544), exit (416,624)
```

Assert Mira remains `shopkeeper-mira` with dialogue `shopkeeper-mira` and shop `miras-item-shop` at `(416,320)` with approach `(416,360)`.

- [ ] **Step 2: Run `maps.test.ts` and verify both maps fail**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Re-author Hero House**

Use the exact rooms/walls from the layout module, full authored floor, hall/room patches, existing transition ID, exterior return `(704,5888,down)`, and minimal bed/study/living/kitchen props inside approved zones.

- [ ] **Step 4: Re-author Item Shop**

Use the exact rooms/walls, full floor, service corridor, sales floor, Mira and customer approach, counter visual/collision, display shelves, stock shelves, office desk, ambient customer, existing dialogue/shop IDs, and exterior return `(704,5216,down)`.

- [ ] **Step 5: Synchronize inbound arrivals**

```text
meadow-to-hero-house: (352,480), facing up
meadow-to-item-shop:  (416,544), facing up
```

- [ ] **Step 6: Add routes and interaction tests**

Hero routes reach bedroom, study, living area, and exit. Item routes reach Mira's approach, stockroom, office, both display aisles, and exit. Assert the counter collision leaves the shared-radius interaction point clear.

- [ ] **Step 7: Run focused tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit both interiors**

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

**Interfaces:**
- Consumes: the four remaining interior layouts and existing NPC/dialogue IDs.
- Produces: a ceremonial Shrine and three structurally distinct homes with complete floors, explicit walls/doors, preserved interactions, and synchronized arrivals.

- [ ] **Step 1: Add failing dimension and floor contracts**

Assert:

```text
shrine-of-aurora-interior: 24×22, spawn (384,608), exit (384,688)
villager-house-1:           20×18, spawn (320,480), exit (320,560)
villager-house-2:           22×18, spawn (352,480), exit (352,560)
villager-house-3:           20×20, spawn (320,544), exit (320,624)
```

Assert the three house room/wall signatures are unequal.

- [ ] **Step 2: Run map tests and verify failure**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Re-author Shrine of Aurora**

Use exact layout/walls and complete floor. Add only altar/offerings, nave benches, side-room lamps, archive shelf, and entrance treatment. Preserve exterior return `(2272,5888,down)`.

- [ ] **Step 4: Re-author Villager House 1 as a family home**

Keep `villager-lynn` at `(160,416)` with approach `(200,416)`. Use bed, family table, kitchen shelf, and storage crates. Preserve family ambient NPC ID at `(480,416)` and exterior return `(672,4416,down)`.

- [ ] **Step 5: Re-author Villager House 2 as a craft home**

Keep `villager-toma` at `(192,192)` with approach `(232,192)`. Use workshop table/storage, bedroom, and living table. Preserve neighbor ambient NPC ID at `(512,416)` and exterior return `(1376,4416,down)`.

- [ ] **Step 6: Re-author Villager House 3 as an archive home**

Keep `villager-io` at `(160,192)` with approach `(200,192)`. Use archive shelves, reading table, bedroom/storage, and sitting room. Preserve neighbor ambient NPC ID at `(480,480)` and exterior return `(1472,5888,down)`.

- [ ] **Step 7: Synchronize inbound arrivals**

Set all four village transitions to the exact interior spawns above while preserving IDs and exterior coordinates.

- [ ] **Step 8: Add route and uniqueness tests**

For each map, use `expectRouteClear(...)` from spawn to every named room centre, interactive NPC approach, and exit. Compare normalized room and wall arrays across the three houses and assert no pair is equal.

- [ ] **Step 9: Run focused validation**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit remaining interiors**

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

**Interfaces:**
- Consumes: all seven graybox maps and the authoring correction already merged in the outdoor PR.
- Produces: complete browser/Tauri walkthroughs and final HPA-586 approval evidence. No new skill or authoring decision remains in this task.

- [ ] **Step 1: Extend E2E coverage across all seven interiors**

Use one parameterized table. For each building:

1. start outside at the shared door/return contract;
2. enter with real input;
3. reach every named room;
4. interact with every changed NPC;
5. open and close Quartermaster and Item Shop interfaces where applicable;
6. exit to the exact exterior return;
7. verify first movement does not immediately re-enter.

Perform one Guild Hall save/reload.

- [ ] **Step 2: Run all focused and repository tests**

```bash
bun run test:unit -- --run
bun run test:e2e
bun run check
bun run lint
bun run build
bun run build:tauri
```

Expected: all commands pass.

- [ ] **Step 3: Capture native-scale interior screenshots**

Capture the six named images at 100% scale. Use collision debug only for `interior-collision.png`; all other images show normal graybox presentation.

- [ ] **Step 4: Perform the combined web walkthrough**

Walk the full outdoor route and every interior in one normal browser session. Verify no V1 background renders, no playable interior cell relies only on the implicit fallback floor, every room is readable before final dressing, all shops/dialogues work, and every round trip is stable.

- [ ] **Step 5: Perform the combined packaged Tauri walkthrough**

```bash
bun run tauri dev
```

Repeat the combined happy path with controller input and one save/reload.

- [ ] **Step 6: Self-review HPA-586 completion**

Confirm:

- no placeholder or provisional coordinate remains in layout modules;
- outdoor and interior geometry match the coordinate spec;
- V1 assets remain historical but inactive;
- V1-only active-map proof tests are gone while generic renderer, PNG/compositing, and static projection tests remain;
- no new framework, compatibility source, or compiler was introduced;
- final-art ticket boundaries are concrete.

- [ ] **Step 7: Commit final validation**

```bash
git add tests/e2e/game.e2e.ts docs/superpowers/reports/img/hpa-586
git commit -m "test(world): validate HPA-586 grayboxes"
```

Open the interior implementation PR as a draft. HPA-586 may move to Done only after both graybox PRs are merged and the native-scale screenshots are accepted.

---

# Final Follow-up Tickets After HPA-586

Create these only after graybox acceptance:

1. **Meadow Entry V2 final base and foreground art** — produce the mandatory full-world base partition, optional region overlays, texture preflight, runtime registration, and native-scale acceptance.
2. **Guild Hall final interior treatment** — replace graybox surfaces and minimal props without moving accepted geometry.
3. **Remaining village interior final treatment** — finish Hero House, Item Shop, Shrine, and three houses from accepted plans.
4. **V1 runtime/tool cleanup** — remove superseded HPA-406 preloads, generated activation, inactive V1 village art tools/source, and obsolete ownership only after V2 art is live.

Final art conforms to accepted geometry. Authoritative collision, routes, doors, and interaction approaches must not be moved merely to fit an accidental generated image.
