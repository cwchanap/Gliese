# HPA-586 Meadow Entry V2 Graybox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current object-first Meadow Entry and village interiors with an approved coordinate-first outdoor and interior graybox while preserving all existing gameplay identities and behavior.

**Architecture:** Keep Meadow Entry as the existing composition of `RegionFragment` sources, keep Sundrop’s terrain/path/decor grid in the existing layered source, and keep village interiors as direct `WorldMapDefinition` values. Add two small coordinate modules plus a top-left-to-centre conversion helper. `village-layered.ts` remains the tile-layer owner; `village.ts` composes landmarks, transitions, pickups, and ambient NPCs directly from the approved pixel coordinates so the design is not forced onto the layered compiler’s tile-centre object constraint. Deliver Tasks 1–4 as the outdoor graybox PR, merge it, then deliver Tasks 5–9 as the interior graybox PR. Do not generate final art in either PR.

**Tech Stack:** TypeScript, Svelte 5 + Vite, Phaser, Vitest, Playwright, Tauri.

## Global Constraints

- Preserve Meadow Entry at exactly `200 × 200` tiles (`6400 × 6400` px).
- Expand Sundrop Village to exactly `80 × 68` tiles at origin `{ x: 256, y: 3968 }`.
- Preserve current map IDs, NPC IDs, dialogue IDs, shop IDs, transition IDs, encounter IDs, pickup IDs, discovery IDs, quest behavior, and save schema.
- Treat HPA-400 as the functional baseline; do not reopen or revert its collision constants or save-position normalization.
- Use top-left `[x, y, width, height]` for design constants and convert to the repository’s centre-based `MapRect` only at the map-owner boundary.
- Structural rectangles align to the 32 px grid. Prop visuals and narrow collision strips may use 8 px increments after structural geometry is accepted.
- Use the current `WorldMapDefinition`, `RegionFragment`, `LayeredRegionSource`, `groundPatches`, `blockers`, `interiorProps`, and transition contracts.
- Do not extend `LayeredRegionSource` or `compileLayeredRegion(...)` merely to represent pixel-positioned village objects.
- Do not add `LayeredInteriorSource`, a room compiler, a procedural map generator, an editor integration, or a compatibility layer.
- Do not add final Meadow Entry PNGs or final interior art.
- Keep HPA-406/HPA-496 files in the repository, but remove their images and fallback ownership from the active Meadow Entry graybox composition.
- The future base-art contract remains four `3200 × 3200` chunks covering the exact world; HPA-586 validates the coordinate contract but does not create the PNGs.
- Interactive NPC approaches must be at least `29` px and at most `48` px from NPC centre; all new approaches use `40` px.
- Do not create final-art follow-up tickets until both graybox PRs are manually accepted.

## Delivery Branches

After this documentation PR merges:

```text
Tasks 1–4: agent/hpa-586-outdoor-graybox
Tasks 5–9: agent/hpa-586-interior-graybox
```

Create the interior branch from `main` only after the outdoor PR is merged, because it consumes the shared exterior-door constants introduced by Task 1.

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

- `geometry.ts`: immutable point/rectangle types and explicit top-left-to-centre conversion only.
- `meadow-entry-v2.ts`: world bounds, base chunks, region envelopes, route rectangles, village bounds, lots, footprints, doors, return arrivals, and public-space rectangles.
- `village-interiors-v2.ts`: exact bounds, rooms, corridors, doors, wall rectangles, spawns, exits, NPC approaches, and prop zones for seven direct interiors.
- `layouts.test.ts`: pure coordinate invariants independent of Phaser.

### Existing files changed by outdoor PR

```text
src/lib/game/content/maps/regions/village-layered.ts
src/lib/game/content/maps/regions/village-layered.test.ts
src/lib/game/content/maps/regions/village.ts
src/lib/game/content/maps/regions/paths.ts
src/lib/game/content/maps/regions/crossroads.ts
src/lib/game/content/maps/meadow-entry.ts
src/lib/game/content/maps.test.ts
src/lib/game/content/maps.ts
src/lib/game/phaser/scenes/scenes.test.ts
tests/e2e/game.e2e.ts
```

### Existing files changed by interior PR

```text
src/lib/game/content/maps.ts
src/lib/game/content/maps/regions/village.ts
src/lib/game/content/maps.test.ts
src/lib/game/phaser/scenes/scenes.test.ts
src/lib/game/save/save-state.test.ts
tests/e2e/game.e2e.ts
.agents/skills/gliese-world-expansion/references/authoring.md
```

---

# Outdoor Graybox PR

### Task 1: Add explicit layout primitives and Meadow Entry V2 coordinate contracts

**Files:**
- Create: `src/lib/game/content/maps/layouts/geometry.ts`
- Create: `src/lib/game/content/maps/layouts/meadow-entry-v2.ts`
- Create: `src/lib/game/content/maps/layouts/layouts.test.ts`

**Interfaces:**
- Consumes: existing centre-based `MapRect` from `src/lib/game/content/maps/types.ts`.
- Produces: `LayoutPoint`, `LayoutRect`, `NamedLayoutRect`, `point(...)`, `rect(...)`, `namedRect(...)`, `toMapRect(...)`, `rectContains(...)`, `rectsOverlap(...)`, `MEADOW_ENTRY_V2_WORLD`, `MEADOW_ENTRY_V2_BASE_CHUNKS`, `MEADOW_ENTRY_V2_ROUTES`, `SUNDROP_VILLAGE_V2`, `SUNDROP_VILLAGE_V2_PUBLIC_SPACES`, `SUNDROP_VILLAGE_V2_BUILDINGS`, and `VILLAGE_INTERIOR_EXTERIORS`.

- [ ] **Step 1: Write the pure coordinate tests first**

Create `src/lib/game/content/maps/layouts/layouts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_V2_BASE_CHUNKS,
	MEADOW_ENTRY_V2_WORLD,
	SUNDROP_VILLAGE_V2,
	SUNDROP_VILLAGE_V2_BUILDINGS,
	VILLAGE_INTERIOR_EXTERIORS
} from './meadow-entry-v2';
import { rectContains, rectsOverlap } from './geometry';

function expectStructuralGrid(rect: { x: number; y: number; width: number; height: number }) {
	for (const [name, value] of Object.entries(rect)) {
		expect(value, name).toBeGreaterThanOrEqual(0);
		expect(value % 32, `${name}=${value}`).toBe(0);
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

	it('keeps each building footprint inside a non-overlapping lot', () => {
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
			}
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

- [ ] **Step 2: Run the coordinate test and verify module resolution fails**

```bash
bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts
```

Expected: FAIL because `geometry.ts` and `meadow-entry-v2.ts` do not exist.

- [ ] **Step 3: Implement the geometry primitives**

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

export function namedRect(
	id: string,
	x: number,
	y: number,
	width: number,
	height: number
): NamedLayoutRect {
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
```

Do not add clipping, inference, room generation, object placement, or grid painting to this module.

- [ ] **Step 4: Implement the outdoor coordinate constants**

Create `src/lib/game/content/maps/layouts/meadow-entry-v2.ts` with these exact values:

```ts
import { point, rect } from './geometry';

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

export const MEADOW_ENTRY_V2_ROUTE_ANCHORS = {
	villageEastGate: point(2816, 4688),
	crossroadsWestMouth: point(3264, 4688),
	crossroadsCenter: point(3776, 4224),
	crossroadsNorthJunction: point(3776, 3136),
	mistfenMouth: point(3072, 3136),
	silverpineMouth: point(3776, 2432),
	wildwoodMouth: point(4992, 4224),
	coastMouth: point(4224, 5568)
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

export const SUNDROP_VILLAGE_V2_BUILDINGS = {
	villagerHouse1: {
		mapId: 'villager-house-1',
		transitionId: 'meadow-to-villager-house-1',
		landmarkId: 'villager-house-1-exterior',
		labelKey: 'content.maps.landmarks.villager-house-1-exterior.label',
		lot: rect(384, 4064, 576, 448),
		footprint: rect(512, 4128, 320, 224),
		door: point(672, 4352),
		approach: rect(608, 4352, 128, 256),
		returnArrival: { ...point(672, 4416), facing: 'down' as const }
	},
	villagerHouse2: {
		mapId: 'villager-house-2',
		transitionId: 'meadow-to-villager-house-2',
		landmarkId: 'villager-house-2-exterior',
		labelKey: 'content.maps.landmarks.villager-house-2-exterior.label',
		lot: rect(1088, 4064, 576, 448),
		footprint: rect(1216, 4128, 320, 224),
		door: point(1376, 4352),
		approach: rect(1312, 4352, 128, 256),
		returnArrival: { ...point(1376, 4416), facing: 'down' as const }
	},
	guildHall: {
		mapId: 'guild-hall',
		transitionId: 'meadow-to-guild-hall',
		landmarkId: 'guild-hall-exterior',
		labelKey: 'content.maps.landmarks.guild-hall-exterior.label',
		lot: rect(1888, 4032, 800, 480),
		footprint: rect(1984, 4096, 576, 288),
		door: point(2272, 4384),
		approach: rect(2208, 4384, 128, 224),
		returnArrival: { ...point(2272, 4448), facing: 'down' as const }
	},
	itemShop: {
		mapId: 'item-shop',
		transitionId: 'meadow-to-item-shop',
		landmarkId: 'item-shop-exterior',
		labelKey: 'content.maps.landmarks.item-shop-exterior.label',
		lot: rect(384, 4832, 704, 448),
		footprint: rect(480, 4896, 448, 256),
		door: point(704, 5152),
		approach: rect(640, 5152, 128, 224),
		returnArrival: { ...point(704, 5216), facing: 'down' as const }
	},
	blacksmith: {
		mapId: null,
		transitionId: null,
		landmarkId: 'blacksmith',
		labelKey: 'content.maps.landmarks.blacksmith.label',
		lot: rect(1952, 4832, 736, 448),
		footprint: rect(2048, 4896, 416, 256),
		door: point(2272, 5152),
		approach: rect(2208, 5152, 128, 224),
		returnArrival: null
	},
	heroHouse: {
		mapId: 'hero-house',
		transitionId: 'meadow-to-hero-house',
		landmarkId: 'hero-house-exterior',
		labelKey: 'content.maps.landmarks.hero-house-exterior.label',
		lot: rect(384, 5536, 704, 416),
		footprint: rect(480, 5600, 448, 224),
		door: point(704, 5824),
		approach: rect(640, 5824, 128, 192),
		returnArrival: { ...point(704, 5888), facing: 'down' as const }
	},
	villagerHouse3: {
		mapId: 'villager-house-3',
		transitionId: 'meadow-to-villager-house-3',
		landmarkId: 'villager-house-3-exterior',
		labelKey: 'content.maps.landmarks.villager-house-3-exterior.label',
		lot: rect(1184, 5536, 576, 416),
		footprint: rect(1312, 5600, 320, 224),
		door: point(1472, 5824),
		approach: rect(1408, 5824, 128, 192),
		returnArrival: { ...point(1472, 5888), facing: 'down' as const }
	},
	shrine: {
		mapId: 'shrine-of-aurora-interior',
		transitionId: 'meadow-to-shrine-of-aurora',
		landmarkId: 'shrine-of-aurora',
		labelKey: 'content.maps.landmarks.shrine-of-aurora.label',
		lot: rect(1888, 5504, 800, 448),
		footprint: rect(2080, 5568, 384, 256),
		door: point(2272, 5824),
		approach: rect(2208, 5824, 128, 192),
		returnArrival: { ...point(2272, 5888), facing: 'down' as const }
	}
} as const;

export const VILLAGE_INTERIOR_EXTERIORS = {
	'hero-house': SUNDROP_VILLAGE_V2_BUILDINGS.heroHouse,
	'guild-hall': SUNDROP_VILLAGE_V2_BUILDINGS.guildHall,
	'item-shop': SUNDROP_VILLAGE_V2_BUILDINGS.itemShop,
	'villager-house-1': SUNDROP_VILLAGE_V2_BUILDINGS.villagerHouse1,
	'villager-house-2': SUNDROP_VILLAGE_V2_BUILDINGS.villagerHouse2,
	'villager-house-3': SUNDROP_VILLAGE_V2_BUILDINGS.villagerHouse3,
	'shrine-of-aurora-interior': SUNDROP_VILLAGE_V2_BUILDINGS.shrine
} as const;
```

- [ ] **Step 5: Run and pass the pure coordinate tests**

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

### Task 2: Rebuild Sundrop Village as an 80×68 sparse layered graybox

**Files:**
- Modify: `src/lib/game/content/maps/regions/village-layered.ts`
- Modify: `src/lib/game/content/maps/regions/village-layered.test.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`

**Interfaces:**
- Consumes: Task 1 layout constants and existing `compileLayeredRegion(...)` for terrain/path/collision/decor only.
- Produces: an 80×68 layered ground/decor source, directly composed pixel-positioned village objects, new-run spawn `{ x: 704, y: 5888 }`, and exterior returns derived from one coordinate source.

- [ ] **Step 1: Replace old room-graph assertions with V2 structural assertions**

In `village-layered.test.ts`, remove assertions tied to the old `H/P/M/N/G/S/E/C` graph, old 56×48 dimensions, old exact background rectangle, and old decor. Add:

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

it('keeps pixel-positioned objects out of the tile-centre compiler contract', () => {
	expect(sundropVillageLayered.objects).toEqual({});
});
```

In `maps.test.ts`, import `villageRegion` and assert every shared building layout produces the exact landmark and door position in the composed fragment.

- [ ] **Step 2: Run focused tests and verify they fail against the old source**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps.test.ts
```

Expected: FAIL on origin, dimensions, object ownership, landmarks, and transition anchors.

- [ ] **Step 3: Replace the village layer dimensions and authoring ranges**

In `village-layered.ts` set:

```ts
origin: { x: 256, y: 3968 },
width: 80,
height: 68,
```

Author five 80-character × 68-row layers. Use these exact inclusive zero-based ranges:

| Layer | Glyph | Rows | Columns |
|---|---|---:|---:|
| `paths` | `p` | `20–24` | `0–79` |
| `paths` | `p` | `25–63` | `0–3` |
| `paths` | `p` | `25–63` | `76–79` |
| `paths` | `p` | `44–47` | `0–79` |
| `paths` | `p` | `64–67` | `0–79` |
| `paths` | `p` | `12–19` | `11–14` |
| `paths` | `p` | `12–19` | `33–36` |
| `paths` | `p` | `13–19` | `61–64` |
| `paths` | `p` | `37–43` | `12–15` |
| `paths` | `p` | `37–43` | `61–64` |
| `paths` | `p` | `58–63` | `12–15` |
| `paths` | `p` | `58–63` | `36–39` |
| `paths` | `p` | `58–63` | `61–64` |
| `paths` | `c` | `26–41` | `28–49` |
| `paths` | `c` | `25` | `34–43` |
| `paths` | `c` | `42–43` | `34–43` |

Keep all other `paths` cells `.`. Keep `terrain` and `collision` entirely `.` in the first graybox; building landmarks supply collision and the road network remains deliberately open.

Add only four non-colliding graybox decor anchors: gate arch `A` at `(77,22)`, pole lantern `l` at `(31,34)` and `(46,34)`, and flower bed `f` at `(9,53)`. Keep every other `decor` cell `.`.

Use these authoring-aid region ranges:

| Zone | Glyph | Rows | Columns |
|---|---|---:|---:|
| Villager House 1 lot | `A` | `3–16` | `4–21` |
| Villager House 2 lot | `B` | `3–16` | `26–43` |
| Guild lot | `G` | `2–16` | `51–75` |
| Item Shop lot | `M` | `27–40` | `4–25` |
| Village Green | `P` | `26–41` | `28–49` |
| Blacksmith lot | `K` | `27–40` | `53–75` |
| Hero House lot | `H` | `49–61` | `4–25` |
| Villager House 3 lot | `C` | `49–61` | `29–46` |
| Shrine lot | `S` | `48–61` | `51–75` |

Set `objects: {}`. The `regions` layer remains an authoring aid only.

- [ ] **Step 4: Compose village objects directly in `village.ts`**

Replace the background-wrapper implementation with:

```ts
import { compileLayeredRegion } from '$lib/game/content/maps/layered/compile-layered-region';
import { toMapRect } from '$lib/game/content/maps/layouts/geometry';
import {
	SUNDROP_VILLAGE_V2_BUILDINGS,
	SUNDROP_VILLAGE_V2_PUBLIC_SPACES
} from '$lib/game/content/maps/layouts/meadow-entry-v2';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

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
		{ id: buildings.heroHouse.transitionId, ...buildings.heroHouse.door, toMapId: buildings.heroHouse.mapId, showMarker: false, arrival: { x: 256, y: 224, facing: 'up' } },
		{ id: buildings.itemShop.transitionId, ...buildings.itemShop.door, toMapId: buildings.itemShop.mapId, showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } },
		{ id: buildings.villagerHouse1.transitionId, ...buildings.villagerHouse1.door, toMapId: buildings.villagerHouse1.mapId, showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } },
		{ id: buildings.villagerHouse2.transitionId, ...buildings.villagerHouse2.door, toMapId: buildings.villagerHouse2.mapId, showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } },
		{ id: buildings.guildHall.transitionId, ...buildings.guildHall.door, toMapId: buildings.guildHall.mapId, showMarker: false, arrival: { x: 384, y: 480, facing: 'up' } },
		{ id: buildings.shrine.transitionId, ...buildings.shrine.door, toMapId: buildings.shrine.mapId, showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } },
		{ id: buildings.villagerHouse3.transitionId, ...buildings.villagerHouse3.door, toMapId: buildings.villagerHouse3.mapId, showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } }
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

Do not import interior maps into `village.ts`; the explicit inbound arrivals avoid a circular dependency and are synchronized by generic map tests.

- [ ] **Step 5: Derive new-run spawn and exterior returns from Task 1**

In `maps.ts`, import `VILLAGE_INTERIOR_EXTERIORS`. Replace each interior outbound transition’s `arrival` with the corresponding shared `returnArrival`.

In `meadow-entry.ts`, set:

```ts
spawn: { x: 704, y: 5888 },
spawnDirection: 'up',
```

Do not change interior dimensions or the inbound arrivals in `village.ts` during the outdoor PR.

- [ ] **Step 6: Add composed-object assertions**

In `maps.test.ts`, for each `VILLAGE_INTERIOR_EXTERIORS` value assert:

- `villageRegion.landmarks` has exact centre, width, height, ID, and label key;
- `villageRegion.transitions` has exact door coordinates, ID, and target map;
- the target interior outbound return equals `returnArrival`;
- every return point is clear of landmark collision and more than the transition re-trigger radius from its door.

- [ ] **Step 7: Run focused tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps.test.ts
```

Expected: PASS after replacing old coordinate snapshots.

- [ ] **Step 8: Commit the sparse village graybox**

```bash
git add \
  src/lib/game/content/maps/layouts \
  src/lib/game/content/maps/regions/village-layered.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps/regions/village.ts \
  src/lib/game/content/maps.ts \
  src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/content/maps.test.ts
git commit -m "feat(world): rebuild Sundrop Village graybox"
```

---

### Task 3: Re-author the Crossroads route network and deactivate V1 baked visuals

**Files:**
- Modify: `src/lib/game/content/maps/regions/paths.ts`
- Modify: `src/lib/game/content/maps/regions/crossroads.ts`
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

**Interfaces:**
- Consumes: Task 1 route constants, existing destination fragments, and current renderer fallback behavior.
- Produces: one readable route network, clean seams into existing destination paths, an active map with no V1 baked backgrounds, and live visual ownership for blockers/decor/fences.

- [ ] **Step 1: Add failing active-composition assertions**

In `maps.test.ts`, add:

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

Add exact route assertions for the eight V2 route rectangles by converting them through `toMapRect(...)` and locating matching `groundPatches`.

- [ ] **Step 2: Run map and scene tests and verify V1 composition still fails**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL because V1 images and fallback ownership remain active.

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
- keep the waystone ID at `{ x: 3776, y: 4224, width: 120, height: 150 }`;
- move `castle-gate` and its sprite to `{ x: 4176, y: 2976, width: 480, height: 320 }`, east of the north trunk;
- move `crossroads-waystone-sign` to `{ x: 3904, y: 4224 }`;
- move `castle-gate-warning` to `{ x: 4176, y: 3200 }`;
- move `crossroads-cache` to `{ x: 4032, y: 4480 }`;
- move `crossroads-crier` to `{ x: 3584, y: 4384 }`;
- move `crossroads-traveler` to `{ x: 4032, y: 4384 }`;
- remove the old plaza hedges and fences for the graybox;
- retain IDs and localized label keys.

Keep only the castle gate, waystone, and two non-colliding lanterns as Crossroads decor. Place lanterns at `{ x: 3488, y: 3904 }` and `{ x: 4064, y: 3904 }`.

- [ ] **Step 5: Remove V1 backgrounds and fallback ownership from active composition**

In `meadow-entry.ts`:

1. remove imports of `applyVisualOwnership`, `validateMapBackgroundOwnership`, `activeMeadowEntryRuntimeVisualOwners`, `meadowEntryRuntimeBackgroundImages`, `applySundropObstacleOwnership`, and the Sundrop obstacle ownership validator;
2. keep `mergeRegions(...)` and the existing fragment list;
3. assign direct merged arrays:

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

Because `village.ts` no longer adds backgrounds and no other active fragment owns one, `merged.backgroundImages` is empty. Leave generated runtime modules, old assets, approval files, and preloads untouched.

- [ ] **Step 6: Extend route tests through preserved destination seams**

Use the existing `expectRouteClear(...)` helper:

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

If a retained destination object blocks one exact route, move that object within its existing functional area; do not move a route to preserve accidental V1 art coordinates.

- [ ] **Step 7: Run focused tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS. `meadow-entry-runtime.test.ts` remains unchanged and continues validating the historical V1 projection module even though that module is no longer active in `meadowEntryMap`.

- [ ] **Step 8: Commit the outdoor route and active-composition change**

```bash
git add \
  src/lib/game/content/maps/regions/paths.ts \
  src/lib/game/content/maps/regions/crossroads.ts \
  src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
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
- Produces: a browser-tested continuous route and native-scale screenshots for human approval.

- [ ] **Step 1: Update E2E starting coordinates and background expectation**

Replace fixtures that assume the old Hero House exterior or 22 rendered Meadow background planes. Assert the active Meadow map emits a regional-background diagnostic with zero entries and zero successful IDs, while the world remains playable from `{ x: 704, y: 5888 }`.

Keep historical runtime-projection unit tests unchanged.

- [ ] **Step 2: Add one continuous outdoor route E2E**

Use direct test positioning only to begin at the new spawn. Drive real input for:

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

At each seam assert movement diagnostics do not report a blocked request for the intended direction. Retain one pickup, one discovery, one encounter, and one save/reload assertion from the existing HPA-406 route.

- [ ] **Step 3: Run the browser route**

```bash
bun run test:e2e
```

Expected: all Playwright tests pass.

- [ ] **Step 4: Run repository validation**

```bash
bun run check
bun run lint
bun run build
bun run build:tauri
```

Expected: all commands pass. Do not run or refresh Meadow art approval commands because no approved art input is being changed.

- [ ] **Step 5: Capture the five native-scale review screenshots**

Run the normal web build with `?mapDebug=collision` only for the collision image. Capture at 100% browser scale. The Wildwood image must show live crisp decor rather than the blurred V1 background.

- [ ] **Step 6: Perform the packaged Tauri outdoor walkthrough**

```bash
bun run tauri dev
```

Walk the same route and verify input, transitions, save/reload, and live visual fallback. Record the result in the outdoor PR body; do not add a separate evidence ledger.

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
- Consumes: Task 1 geometry primitives.
- Produces: `VillageInteriorLayout`, `VILLAGE_INTERIOR_LAYOUTS`, exact wall arrays, exact NPC approaches, and prop zones. This module is coordinate data only; it does not compile a map.

- [ ] **Step 1: Add failing interior-layout invariants**

Append to `layouts.test.ts`:

```ts
import { VILLAGE_INTERIOR_LAYOUTS } from './village-interiors-v2';

it('keeps every interior rectangle inside its map and every approach valid', () => {
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
			expect(distance).toBeGreaterThanOrEqual(29);
			expect(distance).toBeLessThanOrEqual(48);
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
import { namedRect, point, rect } from './geometry';

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

- [ ] **Step 4: Add the exact Guild Hall layout and walls**

Use the room, corridor, door, spawn, exit, NPC, and prop values from the coordinate spec. Use these walls:

```ts
walls: [
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

NPC approaches:

```ts
npcApproaches: {
	'guild-master': { npc: point(800, 144), approach: point(800, 184) },
	'guild-quartermaster': { npc: point(816, 528), approach: point(816, 568) }
}
```

- [ ] **Step 5: Add the other six exact wall arrays**

```ts
const heroHouseWalls = [
	namedRect('hero-house-wall-north', 0, 0, 704, 64),
	namedRect('hero-house-wall-west', 0, 64, 64, 480),
	namedRect('hero-house-wall-east', 640, 64, 64, 480),
	namedRect('hero-house-wall-south-west', 0, 544, 320, 32),
	namedRect('hero-house-wall-south-east', 384, 544, 320, 32),
	namedRect('hero-house-bedroom-hall-north', 272, 64, 32, 64),
	namedRect('hero-house-bedroom-hall-south', 272, 192, 32, 64),
	namedRect('hero-house-study-hall-north', 400, 64, 32, 64),
	namedRect('hero-house-study-hall-south', 400, 192, 32, 64),
	namedRect('hero-house-living-divider-west', 64, 256, 240, 32),
	namedRect('hero-house-living-divider-east', 400, 256, 240, 32)
] as const;

const itemShopWalls = [
	namedRect('item-shop-wall-north', 0, 0, 832, 64),
	namedRect('item-shop-wall-west', 0, 64, 64, 544),
	namedRect('item-shop-wall-east', 768, 64, 64, 544),
	namedRect('item-shop-wall-south-west', 0, 608, 384, 32),
	namedRect('item-shop-wall-south-east', 448, 608, 384, 32),
	namedRect('item-shop-stock-corridor-north', 320, 64, 32, 48),
	namedRect('item-shop-stock-corridor-south', 320, 176, 32, 48),
	namedRect('item-shop-office-corridor-north', 480, 64, 32, 48),
	namedRect('item-shop-office-corridor-south', 480, 176, 32, 48),
	namedRect('item-shop-sales-divider-west', 64, 224, 288, 32),
	namedRect('item-shop-sales-divider-east', 480, 224, 288, 32)
] as const;

const shrineWalls = [
	namedRect('shrine-wall-north', 0, 0, 768, 64),
	namedRect('shrine-wall-west', 0, 64, 64, 608),
	namedRect('shrine-wall-east', 704, 64, 64, 608),
	namedRect('shrine-wall-south-west', 0, 672, 352, 32),
	namedRect('shrine-wall-south-east', 416, 672, 352, 32),
	namedRect('shrine-top-west-service', 64, 64, 160, 192),
	namedRect('shrine-top-east-service', 544, 64, 160, 192),
	namedRect('shrine-sanctum-divider-west', 224, 224, 96, 32),
	namedRect('shrine-sanctum-divider-east', 448, 224, 96, 32),
	namedRect('shrine-preparation-divider-north', 192, 256, 32, 96),
	namedRect('shrine-preparation-divider-south', 192, 448, 32, 64),
	namedRect('shrine-archive-divider-north', 544, 256, 32, 96),
	namedRect('shrine-archive-divider-south', 544, 448, 32, 64),
	namedRect('shrine-nave-lobby-west', 224, 544, 96, 32),
	namedRect('shrine-nave-lobby-east', 448, 544, 96, 32),
	namedRect('shrine-lower-west-service', 64, 512, 160, 160),
	namedRect('shrine-lobby-west-service', 224, 576, 32, 96),
	namedRect('shrine-lower-east-service', 544, 512, 160, 160),
	namedRect('shrine-lobby-east-service', 512, 576, 32, 96)
] as const;

const villagerHouse1Walls = [
	namedRect('villager-house-1-wall-north', 0, 0, 640, 64),
	namedRect('villager-house-1-wall-west', 0, 64, 64, 480),
	namedRect('villager-house-1-wall-east', 576, 64, 64, 480),
	namedRect('villager-house-1-wall-south-west', 0, 544, 288, 32),
	namedRect('villager-house-1-wall-south-east', 352, 544, 288, 32),
	namedRect('villager-house-1-bedroom-hall-north', 256, 64, 32, 64),
	namedRect('villager-house-1-bedroom-hall-south', 256, 192, 32, 64),
	namedRect('villager-house-1-storage-hall-north', 384, 64, 32, 64),
	namedRect('villager-house-1-storage-hall-south', 384, 192, 32, 64),
	namedRect('villager-house-1-living-divider-west', 64, 256, 224, 32),
	namedRect('villager-house-1-living-divider-east', 384, 256, 192, 32)
] as const;

const villagerHouse2Walls = [
	namedRect('villager-house-2-wall-north', 0, 0, 704, 64),
	namedRect('villager-house-2-wall-west', 0, 64, 64, 480),
	namedRect('villager-house-2-wall-east', 640, 64, 64, 480),
	namedRect('villager-house-2-wall-south-west', 0, 544, 320, 32),
	namedRect('villager-house-2-wall-south-east', 384, 544, 320, 32),
	namedRect('villager-house-2-workshop-hall-north', 320, 64, 32, 64),
	namedRect('villager-house-2-workshop-hall-south', 320, 224, 32, 64),
	namedRect('villager-house-2-bedroom-hall-north', 448, 64, 32, 64),
	namedRect('villager-house-2-bedroom-hall-south', 448, 224, 32, 64),
	namedRect('villager-house-2-living-divider-west', 64, 288, 288, 32),
	namedRect('villager-house-2-living-divider-east', 448, 288, 192, 32)
] as const;

const villagerHouse3Walls = [
	namedRect('villager-house-3-wall-north', 0, 0, 640, 64),
	namedRect('villager-house-3-wall-west', 0, 64, 64, 544),
	namedRect('villager-house-3-wall-east', 576, 64, 64, 544),
	namedRect('villager-house-3-wall-south-west', 0, 608, 288, 32),
	namedRect('villager-house-3-wall-south-east', 352, 608, 288, 32),
	namedRect('villager-house-3-archive-hall-north', 256, 64, 32, 64),
	namedRect('villager-house-3-archive-hall-south', 256, 224, 32, 96),
	namedRect('villager-house-3-bedroom-hall-north', 384, 64, 32, 64),
	namedRect('villager-house-3-bedroom-hall-south', 384, 224, 32, 96),
	namedRect('villager-house-3-sitting-divider-west', 64, 320, 224, 32),
	namedRect('villager-house-3-sitting-divider-east', 384, 320, 192, 32)
] as const;
```

Populate `VILLAGE_INTERIOR_LAYOUTS` with the exact room, corridor, door, spawn, exit, approach, and prop-zone values in the coordinate spec. Use these changed NPC pairs:

```ts
'item-shop': { 'shopkeeper-mira': { npc: point(416, 320), approach: point(416, 360) } }
'villager-house-1': { 'villager-lynn': { npc: point(160, 416), approach: point(200, 416) } }
'villager-house-2': { 'villager-toma': { npc: point(192, 192), approach: point(232, 192) } }
'villager-house-3': { 'villager-io': { npc: point(160, 192), approach: point(200, 192) } }
```

Hero House and Shrine use empty `npcApproaches` objects.

- [ ] **Step 6: Run and pass the pure layout suite**

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

In `maps.test.ts` assert:

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
expect(guildHallMap.groundPatches?.find(({ id }) => id === 'guild-hall-graybox-floor')).toEqual({
	id: 'guild-hall-graybox-floor',
	x: 512,
	y: 416,
	width: 1024,
	height: 832,
	tile: 'cobblestoneTile'
});
```

Assert every layout wall appears as a `ruin-wall` blocker with the centre-based equivalent rectangle.

- [ ] **Step 2: Run the map test and verify HPA-400 layout fails**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: FAIL on dimensions, spawn, transition, floor, and walls.

- [ ] **Step 3: Re-author the direct map from explicit layout data**

In `maps.ts`:

- set dimensions, spawn, and transition from the layout;
- add the full floor first;
- add room/corridor floor patches after it using `pathTile`, `plazaStoneTile`, and `sandTile`;
- map every `layout.walls` entry through `toMapRect(...)` and add `kind: 'ruin-wall'`;
- set Guild Master `{ x: 800, y: 144 }` and Quartermaster `{ x: 816, y: 528 }` while preserving identity fields;
- set ambient members at `{ x: 160, y: 544 }` and `{ x: 704, y: 368 }`.

Use only these essential graybox props:

```ts
[
	{ id: 'guild-hall-records-shelf', x: 128, y: 144, width: 64, height: 128, frameName: 'bookshelf', collision: { id: 'guild-hall-records-shelf-collision', x: 128, y: 144, width: 56, height: 112 } },
	{ id: 'guild-hall-quest-board', x: 320, y: 112, width: 112, height: 72, frameName: 'noticeBoard', collision: { id: 'guild-hall-quest-board-collision', x: 320, y: 128, width: 96, height: 32 } },
	{ id: 'guild-hall-common-rug', x: 240, y: 496, width: 224, height: 128, frameName: 'rug', depth: 'floor' },
	{ id: 'guild-hall-common-table', x: 240, y: 496, width: 96, height: 54, frameName: 'table', collision: { id: 'guild-hall-common-table-collision', x: 240, y: 496, width: 88, height: 44 } },
	{ id: 'guild-hall-master-desk', x: 800, y: 164, width: 160, height: 48, frameName: 'table', collision: { id: 'guild-hall-master-desk-collision', x: 800, y: 164, width: 144, height: 8 } },
	{ id: 'guild-hall-training-rack', x: 864, y: 368, width: 56, height: 96, frameName: 'weaponRack', collision: { id: 'guild-hall-training-rack-collision', x: 864, y: 368, width: 44, height: 80 } },
	{ id: 'guild-hall-quartermaster-counter', x: 816, y: 548, width: 192, height: 48, frameName: 'shopCounter', collision: { id: 'guild-hall-quartermaster-counter-collision', x: 816, y: 548, width: 176, height: 8 } },
	{ id: 'guild-hall-lobby-bench', x: 448, y: 736, width: 96, height: 34, frameName: 'bench', collision: { id: 'guild-hall-lobby-bench-collision', x: 448, y: 736, width: 86, height: 26 } }
]
```

- [ ] **Step 4: Update the village inbound arrival**

In `village.ts`, set the existing `meadow-to-guild-hall` arrival to:

```ts
arrival: { x: 512, y: 736, facing: 'up' }
```

Preserve its ID and exterior door coordinate.

- [ ] **Step 5: Add exact Guild routes and approach assertions**

```ts
expectRouteClear(guildHallMap, [
	{ x: 512, y: 736 },
	{ x: 512, y: 184 },
	{ x: 800, y: 184 }
], 'Guild Master office');

expectRouteClear(guildHallMap, [
	{ x: 512, y: 736 },
	{ x: 512, y: 568 },
	{ x: 816, y: 568 }
], 'Quartermaster room');

expectRouteClear(guildHallMap, [
	{ x: 512, y: 736 },
	{ x: 512, y: 192 },
	{ x: 320, y: 192 }
], 'records hall');

expectRouteClear(guildHallMap, [
	{ x: 512, y: 736 },
	{ x: 512, y: 368 },
	{ x: 704, y: 368 }
], 'training hall');

expectRouteClear(guildHallMap, [
	{ x: 512, y: 736 },
	{ x: 512, y: 816 }
], 'Guild Hall exit');
```

Assert each NPC approach distance is between the shared collision and interaction radii.

- [ ] **Step 6: Update scene, save, and E2E fixtures**

- Scene tests use `{ x: 800, y: 184 }` for Guild Master and `{ x: 816, y: 568 }` for Quartermaster interactions.
- Save-state test serializes a point inside `guild-hall-common-table-collision` and asserts normalization moves it outside all wall and prop collisions.
- E2E Guild quest fixture starts at `{ x: 800, y: 184 }`.

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
- Consumes: Hero House and Item Shop layouts, current identity fields, and Task 6 explicit map pattern.
- Produces: a three-zone home, a four-zone shop, complete floors, explicit walls, preserved Mira shop behavior, and synchronized inbound arrivals.

- [ ] **Step 1: Add failing map contracts**

Assert:

```text
hero-house: 22×18, spawn (352,480), exit (352,560)
item-shop: 26×20, spawn (416,544), exit (416,624)
```

Assert Mira remains `shopkeeper-mira` with dialogue `shopkeeper-mira` and shop `miras-item-shop` at `{ x: 416, y: 320 }`.

- [ ] **Step 2: Run `maps.test.ts` and verify both compact maps fail**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Re-author Hero House**

Use the exact layout. Add:

- full `cobblestoneTile` patch;
- hall `pathTile` patch;
- bedroom and study `plazaStoneTile` patches;
- every wall as `ruin-wall`;
- existing transition ID with exit `{ x: 352, y: 560 }` and exterior return `{ x: 704, y: 5888, facing: 'down' }`;
- bed at `{ x: 160, y: 144 }`, desk at `{ x: 544, y: 144 }`, table at `{ x: 304, y: 416 }`, and crates at `{ x: 544, y: 416 }`.

- [ ] **Step 4: Re-author Item Shop**

Use the exact layout. Add:

- full floor and room/corridor patches;
- every wall as `ruin-wall`;
- transition exit `{ x: 416, y: 624 }` and exterior return `{ x: 704, y: 5216, facing: 'down' }`;
- Mira at `{ x: 416, y: 320 }` and customer approach `{ x: 416, y: 360 }`;
- counter visual `{ x: 416, y: 336, width: 384, height: 48 }` with collision `{ x: 416, y: 340, width: 384, height: 8 }`;
- west and east shelves at `{ x: 144, y: 448 }` and `{ x: 688, y: 448 }`;
- stockroom shelf at `{ x: 192, y: 144 }`;
- office desk at `{ x: 640, y: 144 }`;
- ambient customer at `{ x: 224, y: 480 }`.

- [ ] **Step 5: Synchronize inbound arrivals in `village.ts`**

```text
meadow-to-hero-house: (352,480), facing up
meadow-to-item-shop:  (416,544), facing up
```

- [ ] **Step 6: Add route and interaction tests**

Hero routes: spawn to bedroom centre, study centre, living centre, and exit.

Item routes: spawn to customer approach, stockroom centre, office centre, both display aisles, and exit. Assert Mira approach distance is exactly `40` and clear of counter collision with player-radius padding.

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

### Task 8: Rebuild Shrine and the three distinct villager houses

**Files:**
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

**Interfaces:**
- Consumes: the four remaining interior layouts and existing NPC/dialogue IDs.
- Produces: a ceremonial Shrine and three structurally distinct homes with complete floors, walls, doors, and interaction approaches.

- [ ] **Step 1: Add failing dimension and floor contracts**

Assert:

```text
shrine-of-aurora-interior: 24×22, spawn (384,608), exit (384,688)
villager-house-1:           20×18, spawn (320,480), exit (320,560)
villager-house-2:           22×18, spawn (352,480), exit (352,560)
villager-house-3:           20×20, spawn (320,544), exit (320,624)
```

Assert all four full-floor IDs and that the three house room/wall coordinate signatures are unequal.

- [ ] **Step 2: Run map test and verify failure**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Re-author Shrine of Aurora**

Use the exact layout and walls. Add only altar/offerings, two nave bench rows, one lamp in each side room, an archive shelf, and complete room/lobby floor patches. Preserve exterior return `{ x: 2272, y: 5888, facing: 'down' }`.

- [ ] **Step 4: Re-author Villager House 1 as a family home**

Keep `villager-lynn` at `{ x: 160, y: 416 }` with approach `{ x: 200, y: 416 }`. Use bed, family table, kitchen shelf, and storage crates. Preserve family ambient NPC ID at `{ x: 480, y: 416 }`.

- [ ] **Step 5: Re-author Villager House 2 as a craft home**

Keep `villager-toma` at `{ x: 192, y: 192 }` with approach `{ x: 232, y: 192 }`. Use a workshop table and storage in the west room, a bed in the east room, and a living table below. Preserve neighbor ambient NPC ID at `{ x: 512, y: 416 }`.

- [ ] **Step 6: Re-author Villager House 3 as an archive home**

Keep `villager-io` at `{ x: 160, y: 192 }` with approach `{ x: 200, y: 192 }`. Use shelves in the archive, a reading table in the sitting room, and bed/storage in the east room. Preserve neighbor ambient NPC ID at `{ x: 480, y: 480 }`.

- [ ] **Step 7: Synchronize inbound arrivals in `village.ts`**

Set the four arrivals to the exact spawns above while preserving transition IDs.

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

### Task 9: Close the structure-first validation loop

**Files:**
- Modify: `.agents/skills/gliese-world-expansion/references/authoring.md`
- Modify: `tests/e2e/game.e2e.ts`
- Create during review: `docs/superpowers/reports/img/hpa-586/guild-hall.png`
- Create during review: `docs/superpowers/reports/img/hpa-586/hero-house.png`
- Create during review: `docs/superpowers/reports/img/hpa-586/item-shop.png`
- Create during review: `docs/superpowers/reports/img/hpa-586/shrine.png`
- Create during review: `docs/superpowers/reports/img/hpa-586/villager-house-2.png`
- Create during review: `docs/superpowers/reports/img/hpa-586/interior-collision.png`

**Interfaces:**
- Consumes: all seven accepted graybox maps and the existing world-expansion skill.
- Produces: one reusable structure-before-art instruction, complete browser/Tauri walkthroughs, and final HPA-586 approval evidence.

- [ ] **Step 1: Add the smallest reusable authoring correction**

Under `Direct Maps` and `Sundrop Village Layered Source` in `authoring.md`, add:

```md
## Structure Before Art

For a substantial spatial revision, define and review the functional bounds, lots,
rooms, corridors, walls, doors, routes, transition approaches, and NPC approaches
before generating final art or placing decorative content. Prove the geometry with
a walkable graybox first. Final art conforms to accepted collision and route
geometry; do not move authoritative geometry merely to fit an accidental image.
```

Do not create another skill, template, approval stage, or schema.

- [ ] **Step 2: Extend E2E coverage across all seven interiors**

Use existing save-state injection to start outside each building, then real input to:

1. enter;
2. reach each room;
3. interact with each changed NPC;
4. open and close Quartermaster and Item Shop interfaces;
5. exit to the exact exterior return;
6. verify first movement does not immediately re-enter;
7. perform one Guild Hall save/reload.

Keep one parameterized test table rather than seven copied test bodies.

- [ ] **Step 3: Run all focused and repository tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/agent-skills.test.ts \
  src/lib/game/content/maps/layouts/layouts.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts \
  src/lib/game/save/save-state.test.ts
bun run test:e2e
bun run check
bun run lint
bun run build
bun run build:tauri
```

Expected: all pass.

- [ ] **Step 4: Capture native-scale interior screenshots**

Capture the six named images at 100% scale. Use collision debug only for `interior-collision.png`; all other images show normal graybox presentation.

- [ ] **Step 5: Perform the combined web walkthrough**

Walk the full outdoor route and every interior in one normal browser session. Verify no V1 background renders, no default-only interior cell is visible, every room is readable before final furniture, all shops/dialogues work, and every round trip is stable.

- [ ] **Step 6: Perform the combined packaged Tauri walkthrough**

```bash
bun run tauri dev
```

Repeat the combined happy path with controller input and one save/reload.

- [ ] **Step 7: Self-review HPA-586 completion**

Confirm:

- no placeholder or provisional coordinate remains in the coordinate modules;
- outdoor and interior geometry match the coordinate spec;
- all V1 background files remain historical but inactive;
- no new framework or compatibility layer was introduced;
- final-art ticket boundaries are concrete.

- [ ] **Step 8: Commit final validation and skill correction**

```bash
git add \
  .agents/skills/gliese-world-expansion/references/authoring.md \
  tests/e2e/game.e2e.ts \
  docs/superpowers/reports/img/hpa-586
git commit -m "docs(skill): require structure-first map revisions"
```

Open the interior implementation PR as a draft. HPA-586 may move to Done only after both graybox PRs are merged and native-scale screenshots are accepted.

---

# Final Follow-up Tickets After HPA-586

Create these only after graybox acceptance:

1. **Meadow Entry V2 final base and foreground art** — produce the mandatory full-world base partition, region overlays, texture preflight, runtime registration, and replacement-art cleanup.
2. **Guild Hall final interior treatment** — replace graybox tiles/walls with final surfaces and furniture without moving accepted geometry.
3. **Remaining village interior final treatment** — finish Hero House, Item Shop, Shrine, and three houses from accepted plans.
4. **V1 runtime cleanup** — remove superseded HPA-406 preloads, generated active-crop projection, and obsolete fallback ownership only after V2 art is live.
