# Sundrop Layered Village Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Sundrop Village's hand-authored coordinate rectangles with a paint-first layered source that compiles to the existing `RegionFragment` runtime model.

**Architecture:** A new `layered/` subsystem defines a `LayeredRegionSource` (ASCII grid layers + objects + a decor glyph table) and a pure `compileLayeredRegion` compiler that emits a `RegionFragment` (groundPatches, blockers, mapDecor, objects). `village.ts` becomes a one-line compile call. Non-village blockers currently misfiled in `village.ts` (global meadow boundaries, ocean, exit-corridor walls) relocate to their correct fragments.

**Tech Stack:** TypeScript, Vitest (node `server` project for non-svelte tests), Phaser runtime (unchanged), Bun.

**Spec:** `docs/superpowers/specs/2026-07-07-sundrop-layered-village-design.md`

## Global Constraints

- Branch from `main`, name `hpa-layered-sundrop-village`. Do not merge PR #11.
- Svelte 5 runes mode project-wide; TypeScript strict.
- Tile size is fixed at `32`. Village grid: `origin { x: 240, y: 4_360 }`, `width: 56`, `height: 48`.
- Tile `(col, row)` world center = `(256 + col*32, 4376 + row*32)` (i.e. `origin + col*32 + 16`).
- Landmarks use **center** x/y (per `maps.test.ts:1203`).
- All compiled village-internal blockers are `kind: 'garden-hedge'`. Global meadow boundaries stay `town-hedge`; ocean stays `ocean`.
- Runtime model (`RegionFragment`, `WorldScene`) is unchanged: the layered source compiles down to the same rectangle *types* (`groundPatches`, `blockers`, `mapDecor`, …) that `mergeRegions` already consumes. The player-facing route (Home Yard → Well Plaza → Market / North / Shrine / East Gate) is preserved.
- **Geometry is re-authored onto the 32px grid, not bit-preserved.** Object centers are quantized to the nearest tile (`tileCenter = origin + col*32 + 16`); walls are grid-aligned hedges; a few objects were re-placed during Task 8 to resolve overlaps the quantization introduced (see `docs/superpowers/reports/2026-07-04-sundrop-layered-village-review.md` §"Spatial adjustments during Task 8"). Pre-refactor pixel coordinates are therefore *not* reproduced exactly. Because the layout changed, **the human visual review (Task 9, spec §7) is the load-bearing acceptance gate** before merge — green tests prove the new layout's internal consistency, not behavioral preservation of the old one.
- No comments in code unless asked. Follow existing file conventions (tabs, import order).
- Validation gate before any task is "done": `bun run test:unit -- --run`, `bun run check`, `bun run lint`.

---

## File Structure

**Create:**
- `src/lib/game/content/maps/layered/types.ts` — `LayeredRegionSource` + object types + `DecorGlyphSpec`.
- `src/lib/game/content/maps/layered/compile-layered-region.ts` — pure compiler.
- `src/lib/game/content/maps/layered/compile-layered-region.test.ts` — compiler unit tests.
- `src/lib/game/content/maps/regions/village-layered.ts` — the village layered source (the reviewable artifact).
- `src/lib/game/content/maps/regions/village-layered.test.ts` — village source tests.

**Modify:**
- `src/lib/game/content/maps/regions/village.ts` — collapses to a compile call.
- `src/lib/game/content/maps/regions/paths.ts` — gains the 16 exit-corridor walls + corridor waymarker decor.
- `src/lib/game/content/maps/meadow-entry.ts` — adds `meadowBoundsRegion` to `mergeRegions`.

**Delete:**
- `src/lib/game/content/maps/regions/village-layout.test.ts` — retired (invariants ported to `village-layered.test.ts`).

---

## Task 1: Layered source types

**Files:**
- Create: `src/lib/game/content/maps/layered/types.ts`

**Interfaces:**
- Produces: `LayeredRegionSource`, `DecorGlyphSpec`, `LayeredLandmark`, `LayeredTransition`, `LayeredPickup`, `LayeredAmbientNpc`, `LayeredDiscovery` (consumed by Task 2's compiler and Task 7's village source).

- [ ] **Step 1: Write the type module**

```ts
import type { MapDecorDepth } from '$lib/game/content/maps/types';

export interface DecorGlyphSpec {
	readonly frame: string;
	readonly textureKey: string;
	readonly renderWidth: number;
	readonly renderHeight: number;
	readonly depth?: MapDecorDepth;
	readonly collision?: { readonly width: number; readonly height: number };
}

export interface LayeredLandmark {
	readonly id: string;
	readonly col: number;
	readonly row: number;
	readonly width: number;
	readonly height: number;
	readonly labelKey: string;
}

export interface LayeredTransition {
	readonly id: string;
	readonly col: number;
	readonly row: number;
	readonly toMapId: string;
	readonly showMarker?: boolean;
	readonly arrival?: {
		readonly x: number;
		readonly y: number;
		readonly facing: 'up' | 'down' | 'left' | 'right';
	};
}

export interface LayeredPickup {
	readonly id: string;
	readonly col: number;
	readonly row: number;
	readonly itemId: string;
	readonly quantity: number;
}

export interface LayeredAmbientNpc {
	readonly id: string;
	readonly col: number;
	readonly row: number;
	readonly frameName: string;
}

export interface LayeredDiscovery {
	readonly id: string;
	readonly col: number;
	readonly row: number;
	readonly labelKey: string;
	readonly descriptionKey: string;
}

export interface LayeredRegionSource {
	readonly tileSize: 32;
	readonly origin: { readonly x: number; readonly y: number };
	readonly width: number;
	readonly height: number;
	readonly layers: {
		readonly terrain: readonly string[];
		readonly paths: readonly string[];
		readonly collision: readonly string[];
		readonly decor: readonly string[];
		readonly regions: readonly string[];
	};
	readonly decorGlyphTable: Record<string, DecorGlyphSpec>;
	readonly objects: {
		readonly landmarks?: readonly LayeredLandmark[];
		readonly transitions?: readonly LayeredTransition[];
		readonly pickups?: readonly LayeredPickup[];
		readonly ambientNpcs?: readonly LayeredAmbientNpc[];
		readonly discoveries?: readonly LayeredDiscovery[];
	};
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `bun run check`
Expected: PASS (no errors; module is importable, types resolve).

- [ ] **Step 3: Commit**

```bash
git add src/lib/game/content/maps/layered/types.ts
git commit -m "feat(maps): add layered region source types"
```

---

## Task 2: Compiler — dimensions, coordinate mapping, ground patches

**Files:**
- Create: `src/lib/game/content/maps/layered/compile-layered-region.ts`
- Test: `src/lib/game/content/maps/layered/compile-layered-region.test.ts`

**Interfaces:**
- Consumes: `LayeredRegionSource` and types from Task 1; `RegionFragment` from `$lib/game/content/maps/regions/types`; `MapGroundPatch` from `$lib/game/content/maps/types`.
- Produces: `compileLayeredRegion(source: LayeredRegionSource): RegionFragment` (groundPatches populated in this task; blockers/mapDecor/objects added in Tasks 3–5).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { compileLayeredRegion } from '$lib/game/content/maps/layered/compile-layered-region';
import type { LayeredRegionSource } from '$lib/game/content/maps/layered/types';

const dot = (width: number): string => '.'.repeat(width);

function makeSource(overrides: Partial<LayeredRegionSource> & { width?: number; height?: number } = {}): LayeredRegionSource {
	const width = overrides.width ?? 4;
	const height = overrides.height ?? 3;
	const blank = { terrain: Array.from({ length: height }, () => dot(width)), paths: Array.from({ length: height }, () => dot(width)), collision: Array.from({ length: height }, () => dot(width)), decor: Array.from({ length: height }, () => dot(width)), regions: Array.from({ length: height }, () => dot(width)) };
	return {
		tileSize: 32,
		origin: { x: 240, y: 4_360 },
		width,
		height,
		layers: blank,
		decorGlyphTable: {},
		objects: {},
		...overrides,
		layers: { ...blank, ...(overrides.layers ?? {}) }
	} as LayeredRegionSource;
}

describe('compileLayeredRegion — dimensions and ground patches', () => {
	it('throws when any layer row count != height', () => {
		const src = makeSource({ height: 3, layers: { terrain: ['....', '....'], paths: Array.from({ length: 3 }, () => '....'), collision: Array.from({ length: 3 }, () => '....'), decor: Array.from({ length: 3 }, () => '....'), regions: Array.from({ length: 3 }, () => '....') } });
		expect(() => compileLayeredRegion(src)).toThrow(/terrain.*height/);
	});

	it('throws when any layer row width != width', () => {
		const src = makeSource({ width: 4, layers: { terrain: ['...', '....', '....'], paths: Array.from({ length: 3 }, () => '....'), collision: Array.from({ length: 3 }, () => '....'), decor: Array.from({ length: 3 }, () => '....'), regions: Array.from({ length: 3 }, () => '....') } });
		expect(() => compileLayeredRegion(src)).toThrow(/width/);
	});

	it('maps a single path glyph to one ground patch at the correct world center', () => {
		const paths = ['pp..', '....', '....'];
		const src = makeSource({ width: 4, height: 3, layers: { paths, terrain: Array.from({ length: 3 }, () => dot(4)), collision: Array.from({ length: 3 }, () => dot(4)), decor: Array.from({ length: 3 }, () => dot(4)), regions: Array.from({ length: 3 }, () => dot(4)) }, origin: { x: 240, y: 4360 } });
		const out = compileLayeredRegion(src);
		expect(out.groundPatches).toHaveLength(1);
		const patch = out.groundPatches![0];
		expect(patch.tile).toBe('pathTile');
		expect(patch.x).toBe(256 + 0 * 32); // col 0 center
		expect(patch.y).toBe(4376 + 0 * 32); // row 0 center
		expect(patch.width).toBe(64); // 2 tiles
		expect(patch.height).toBe(32);
	});

	it('merges contiguous same-tile runs but splits on tile change', () => {
		const paths = ['pca.', '....', '....'];
		const src = makeSource({ width: 4, height: 3, layers: { paths, terrain: Array.from({ length: 3 }, () => dot(4)), collision: Array.from({ length: 3 }, () => dot(4)), decor: Array.from({ length: 3 }, () => dot(4)), regions: Array.from({ length: 3 }, () => dot(4)) } });
		const out = compileLayeredRegion(src);
		expect(out.groundPatches).toHaveLength(3);
		expect(out.groundPatches!.map((p) => p.tile)).toEqual(['pathTile', 'plazaStoneTile', 'autumnLeafTile']);
	});

	it('terrain grass produces no patch; terrain water produces a seaTile patch', () => {
		const terrain = ['.w..', '....', '....'];
		const src = makeSource({ width: 4, height: 3, layers: { terrain, paths: Array.from({ length: 3 }, () => dot(4)), collision: Array.from({ length: 3 }, () => dot(4)), decor: Array.from({ length: 3 }, () => dot(4)), regions: Array.from({ length: 3 }, () => dot(4)) } });
		const out = compileLayeredRegion(src);
		expect(out.groundPatches).toEqual([{ id: expect.any(String), x: 256 + 1 * 32, y: 4376, width: 32, height: 32, tile: 'seaTile' }]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/game/content/maps/layered/compile-layered-region.test.ts`
Expected: FAIL — `compileLayeredRegion` not defined.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { LayeredRegionSource } from '$lib/game/content/maps/layered/types';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';
import type { MapGroundPatch } from '$lib/game/content/maps/types';

const PATH_TILE: Record<string, string> = {
	p: 'pathTile',
	c: 'plazaStoneTile',
	a: 'autumnLeafTile',
	s: 'seaTile'
};
const TERRAIN_TILE: Record<string, string> = {
	g: 'sandTile',
	w: 'seaTile'
};

interface Run {
	readonly tile: string;
	readonly row: number;
	readonly startCol: number;
	readonly endCol: number;
}

function assertDimensions(source: LayeredRegionSource, layerName: string, rows: readonly string[]): void {
	if (rows.length !== source.height) {
		throw new Error(`layer ${layerName} has ${rows.length} rows, expected ${source.height}`);
	}
	for (let i = 0; i < rows.length; i++) {
		if (rows[i].length !== source.width) {
			throw new Error(`layer ${layerName} row ${i} has width ${rows[i].length}, expected ${source.width}`);
		}
	}
}

function tileCenter(source: LayeredRegionSource, col: number, row: number): { x: number; y: number } {
	return {
		x: source.origin.x + col * source.tileSize + 16,
		y: source.origin.y + row * source.tileSize + 16
	};
}

function buildGroundPatches(source: LayeredRegionSource): MapGroundPatch[] {
	assertDimensions(source, 'terrain', source.layers.terrain);
	assertDimensions(source, 'paths', source.layers.paths);
	// Resolve each cell's tile: path layer takes precedence over terrain.
	const cellTile: string[] = new Array(source.width * source.height).fill('');
	for (let row = 0; row < source.height; row++) {
		for (let col = 0; col < source.width; col++) {
			const t = TERRAIN_TILE[source.layers.terrain[row][col]];
			if (t) cellTile[row * source.width + col] = t;
		}
	}
	for (let row = 0; row < source.height; row++) {
		for (let col = 0; col < source.width; col++) {
			const p = PATH_TILE[source.layers.paths[row][col]];
			if (p) cellTile[row * source.width + col] = p;
		}
	}
	// Merge contiguous same-tile runs per row.
	const patches: MapGroundPatch[] = [];
	for (let row = 0; row < source.height; row++) {
		let runStart = -1;
		let runTile = '';
		for (let col = 0; col <= source.width; col++) {
			const tile = col < source.width ? cellTile[row * source.width + col] : '';
			if (tile !== '' && tile === runTile) continue;
			if (runStart >= 0) {
				const start = tileCenter(source, runStart, row);
				const end = tileCenter(source, col - 1, row);
				patches.push({
					id: `ground-${row}-${runStart}`,
					x: start.x,
					y: start.y,
					width: end.x - start.x + source.tileSize,
					height: source.tileSize,
					tile: runTile as MapGroundPatch['tile']
				});
			}
			runStart = tile !== '' ? col : -1;
			runTile = tile;
		}
	}
	return patches;
}

export function compileLayeredRegion(source: LayeredRegionSource): RegionFragment {
	assertDimensions(source, 'collision', source.layers.collision);
	assertDimensions(source, 'decor', source.layers.decor);
	assertDimensions(source, 'regions', source.layers.regions);
	return { groundPatches: buildGroundPatches(source) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/game/content/maps/layered/compile-layered-region.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/content/maps/layered/compile-layered-region.ts src/lib/game/content/maps/layered/compile-layered-region.test.ts
git commit -m "feat(maps): layered compiler dimensions and ground patches"
```

---

## Task 3: Compiler — blockers from collision layer

**Files:**
- Modify: `src/lib/game/content/maps/layered/compile-layered-region.ts`
- Test: `src/lib/game/content/maps/layered/compile-layered-region.test.ts`

**Interfaces:**
- Produces: `compileLayeredRegion` now also returns `blockers: MapBlocker[]`.

- [ ] **Step 1: Add failing tests**

Append to the test file's top-level `describe` or add a new `describe` block:

```ts
describe('compileLayeredRegion — blockers', () => {
	it('emits a garden-hedge blocker for a # run', () => {
		const collision = ['##..', '....', '....'];
		const src = makeSource({ width: 4, height: 3, layers: { collision, terrain: Array.from({ length: 3 }, () => dot(4)), paths: Array.from({ length: 3 }, () => dot(4)), decor: Array.from({ length: 3 }, () => dot(4)), regions: Array.from({ length: 3 }, () => dot(4)) } });
		const out = compileLayeredRegion(src);
		expect(out.blockers).toHaveLength(1);
		expect(out.blockers![0]).toMatchObject({ kind: 'garden-hedge', x: 256, y: 4376, width: 64, height: 32 });
	});

	it('maps B and T to garden-hedge, W to ocean, G to future-gate', () => {
		const collision = ['B.T.', 'W.G.', '....'];
		const src = makeSource({ width: 4, height: 3, layers: { collision, terrain: Array.from({ length: 3 }, () => dot(4)), paths: Array.from({ length: 3 }, () => dot(4)), decor: Array.from({ length: 3 }, () => dot(4)), regions: Array.from({ length: 3 }, () => dot(4)) } });
		const out = compileLayeredRegion(src);
		const byKind = new Map(out.blockers!.map((b) => [b.kind, b]));
		expect(byKind.has('garden-hedge')).toBe(true);
		expect(byKind.has('ocean')).toBe(true);
		expect(byKind.has('future-gate')).toBe(true);
	});

	it('merges adjacent same-kind runs horizontally', () => {
		const collision = ['##B#', '....', '....'];
		const src = makeSource({ width: 4, height: 3, layers: { collision, terrain: Array.from({ length: 3 }, () => dot(4)), paths: Array.from({ length: 3 }, () => dot(4)), decor: Array.from({ length: 3 }, () => dot(4)), regions: Array.from({ length: 3 }, () => dot(4)) } });
		const out = compileLayeredRegion(src);
		// # # B # -> run1: ## (garden-hedge), run2: B (garden-hedge), run3: # (garden-hedge)
		expect(out.blockers!.filter((b) => b.kind === 'garden-hedge')).toHaveLength(3);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/game/content/maps/layered/compile-layered-region.test.ts`
Expected: FAIL — `out.blockers` is `undefined`.

- [ ] **Step 3: Implement blocker compilation**

Add the kind map and a `buildBlockers` function, then include `blockers` in the returned fragment. Insert near the other constants in `compile-layered-region.ts`:

```ts
import type { MapBlocker } from '$lib/game/content/maps/types';

const COLLISION_KIND: Record<string, string> = {
	'#': 'garden-hedge',
	B: 'garden-hedge',
	T: 'garden-hedge',
	W: 'ocean',
	G: 'future-gate'
};

function buildBlockers(source: LayeredRegionSource): MapBlocker[] {
	const blockers: MapBlocker[] = [];
	for (let row = 0; row < source.height; row++) {
		const line = source.layers.collision[row];
		let runStart = -1;
		let runKind = '';
		for (let col = 0; col <= line.length; col++) {
			const glyph = col < line.length ? line[col] : '.';
			const kind = COLLISION_KIND[glyph] ?? '';
			if (kind !== '' && kind === runKind) continue;
			if (runStart >= 0) {
				const start = tileCenter(source, runStart, row);
				const end = tileCenter(source, col - 1, row);
				blockers.push({
					id: `block-${row}-${runStart}`,
					x: start.x,
					y: start.y,
					width: end.x - start.x + source.tileSize,
					height: source.tileSize,
					kind: runKind as MapBlocker['kind']
				});
			}
			runStart = kind !== '' ? col : -1;
			runKind = kind;
		}
	}
	return blockers;
}
```

Update the `compileLayeredRegion` return:

```ts
	return { groundPatches: buildGroundPatches(source), blockers: buildBlockers(source) };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/game/content/maps/layered/compile-layered-region.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/content/maps/layered/compile-layered-region.ts src/lib/game/content/maps/layered/compile-layered-region.test.ts
git commit -m "feat(maps): layered compiler emits blockers from collision layer"
```

---

## Task 4: Compiler — mapDecor from decor glyph table

**Files:**
- Modify: `src/lib/game/content/maps/layered/compile-layered-region.ts`
- Test: `src/lib/game/content/maps/layered/compile-layered-region.test.ts`

**Interfaces:**
- Produces: `compileLayeredRegion` now also returns `mapDecor: MapDecor[]`, with `decor.collision` auto-derived from the glyph table footprint.

- [ ] **Step 1: Add failing tests**

```ts
describe('compileLayeredRegion — mapDecor', () => {
	it('emits a decor object per decor glyph using the glyph table', () => {
		const decor = ['l...', '....', '....'];
		const decorGlyphTable = {
			l: { frame: 'poleLantern', textureKey: 'village-dressing', renderWidth: 100, renderHeight: 200, collision: { width: 50, height: 60 } }
		};
		const src = makeSource({ width: 4, height: 3, layers: { decor, terrain: Array.from({ length: 3 }, () => dot(4)), paths: Array.from({ length: 3 }, () => dot(4)), collision: Array.from({ length: 3 }, () => dot(4)), regions: Array.from({ length: 3 }, () => dot(4)) }, decorGlyphTable });
		const out = compileLayeredRegion(src);
		expect(out.mapDecor).toHaveLength(1);
		const d = out.mapDecor![0];
		expect(d).toMatchObject({ textureKey: 'village-dressing', frameName: 'poleLantern', mode: 'image', width: 100, height: 200 });
		expect(d.x).toBe(256);
		expect(d.y).toBe(4376);
		expect(d.collision).toMatchObject({ width: 50, height: 60 });
	});

	it('throws on an unknown decor glyph', () => {
		const decor = ['z...', '....', '....'];
		const src = makeSource({ width: 4, height: 3, layers: { decor, terrain: Array.from({ length: 3 }, () => dot(4)), paths: Array.from({ length: 3 }, () => dot(4)), collision: Array.from({ length: 3 }, () => dot(4)), regions: Array.from({ length: 3 }, () => dot(4)) }, decorGlyphTable: {} });
		expect(() => compileLayeredRegion(src)).toThrow(/unknown decor glyph/);
	});

	it('emits depth when the glyph table specifies it', () => {
		const decor = ['h...', '....', '....'];
		const decorGlyphTable = {
			h: { frame: 'hangingLantern', textureKey: 'village-dressing', renderWidth: 110, renderHeight: 130, depth: 'foreground' as const }
		};
		const src = makeSource({ width: 4, height: 3, layers: { decor, terrain: Array.from({ length: 3 }, () => dot(4)), paths: Array.from({ length: 3 }, () => dot(4)), collision: Array.from({ length: 3 }, () => dot(4)), regions: Array.from({ length: 3 }, () => dot(4)) }, decorGlyphTable });
		const out = compileLayeredRegion(src);
		expect(out.mapDecor![0].depth).toBe('foreground');
		expect(out.mapDecor![0].collision).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/game/content/maps/layered/compile-layered-region.test.ts`
Expected: FAIL — `out.mapDecor` is `undefined`.

- [ ] **Step 3: Implement decor compilation**

Add import and `buildMapDecor` in `compile-layered-region.ts`:

```ts
import type { MapDecor } from '$lib/game/content/maps/types';

function buildMapDecor(source: LayeredRegionSource): MapDecor[] {
	const decor: MapDecor[] = [];
	for (let row = 0; row < source.height; row++) {
		const line = source.layers.decor[row];
		for (let col = 0; col < line.length; col++) {
			const glyph = line[col];
			if (glyph === '.') continue;
			const spec = source.decorGlyphTable[glyph];
			if (!spec) throw new Error(`unknown decor glyph "${glyph}" at col ${col} row ${row}`);
			const center = tileCenter(source, col, row);
			const base: MapDecor = {
				id: `decor-${row}-${col}`,
				textureKey: spec.textureKey as MapDecor['textureKey'],
				frameName: spec.frame as MapDecor['frameName'],
				x: center.x,
				y: center.y,
				width: spec.renderWidth,
				height: spec.renderHeight,
				mode: 'image',
				...(spec.depth ? { depth: spec.depth } : {}),
				...(spec.collision
					? {
							collision: {
								id: `decor-${row}-${col}-collision`,
								x: center.x,
								y: center.y + (spec.renderHeight / 2) - (spec.collision.height / 2),
								width: spec.collision.width,
								height: spec.collision.height
							}
						}
					: {})
			} as MapDecor;
			decor.push(base);
		}
	}
	return decor;
}
```

Update the `compileLayeredRegion` return:

```ts
	return {
		groundPatches: buildGroundPatches(source),
		blockers: buildBlockers(source),
		mapDecor: buildMapDecor(source)
	};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/game/content/maps/layered/compile-layered-region.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/content/maps/layered/compile-layered-region.ts src/lib/game/content/maps/layered/compile-layered-region.test.ts
git commit -m "feat(maps): layered compiler emits decor from glyph table"
```

---

## Task 5: Compiler — objects (landmarks, transitions, pickups, ambientNpcs, discoveries)

**Files:**
- Modify: `src/lib/game/content/maps/layered/compile-layered-region.ts`
- Test: `src/lib/game/content/maps/layered/compile-layered-region.test.ts`

**Interfaces:**
- Produces: `compileLayeredRegion` returns the full `RegionFragment` including `landmarks`, `transitions`, `pickups`, `ambientNpcs`, `discoveries` mapped from `source.objects`.

- [ ] **Step 1: Add failing tests**

```ts
describe('compileLayeredRegion — objects', () => {
	it('maps landmarks, transitions, pickups, and ambient npcs to world coords', () => {
		const src = makeSource({
			width: 4,
			height: 3,
			origin: { x: 240, y: 4360 },
			objects: {
				landmarks: [{ id: 'lm-1', col: 1, row: 1, width: 235, height: 246, labelKey: 'content.maps.landmarks.hero-house-exterior.label' }],
				transitions: [{ id: 't-1', col: 2, row: 0, toMapId: 'hero-house', arrival: { x: 256, y: 224, facing: 'up' } }],
				pickups: [{ id: 'p-1', col: 0, row: 0, itemId: 'field-potion', quantity: 1 }],
				ambientNpcs: [{ id: 'a-1', col: 3, row: 2, frameName: 'travelerNpc' }]
			}
		});
		const out = compileLayeredRegion(src);
		expect(out.landmarks![0]).toMatchObject({ id: 'lm-1', x: 256 + 32, y: 4376 + 32, width: 235, height: 246 });
		expect(out.transitions![0]).toMatchObject({ id: 't-1', x: 256 + 64, y: 4376, toMapId: 'hero-house' });
		expect(out.pickups![0]).toMatchObject({ id: 'p-1', x: 256, y: 4376, itemId: 'field-potion', quantity: 1 });
		expect(out.ambientNpcs![0]).toMatchObject({ id: 'a-1', x: 256 + 96, y: 4376 + 64, frameName: 'travelerNpc' });
	});

	it('is deterministic across repeated calls', () => {
		const src = makeSource({
			width: 4,
			height: 3,
			layers: {
				terrain: Array.from({ length: 3 }, () => dot(4)),
				paths: ['pp..', 'cc..', '....'],
				collision: ['##..', '..##', '....'],
				decor: Array.from({ length: 3 }, () => dot(4)),
				regions: Array.from({ length: 3 }, () => dot(4))
			}
		});
		const a = JSON.stringify(compileLayeredRegion(src));
		const b = JSON.stringify(compileLayeredRegion(src));
		expect(a).toBe(b);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/game/content/maps/layered/compile-layered-region.test.ts`
Expected: FAIL — `out.landmarks` is `undefined`.

- [ ] **Step 3: Implement object mapping**

Add to `compile-layered-region.ts`:

```ts
export function compileLayeredRegion(source: LayeredRegionSource): RegionFragment {
	assertDimensions(source, 'collision', source.layers.collision);
	assertDimensions(source, 'decor', source.layers.decor);
	assertDimensions(source, 'regions', source.layers.regions);
	const objects = source.objects;
	const landmarks = objects.landmarks?.map((lm) => {
		const c = tileCenter(source, lm.col, lm.row);
		return { id: lm.id, x: c.x, y: c.y, width: lm.width, height: lm.height, labelKey: lm.labelKey };
	});
	const transitions = objects.transitions?.map((t) => {
		const c = tileCenter(source, t.col, t.row);
		return { id: t.id, x: c.x, y: c.y, toMapId: t.toMapId, ...(t.showMarker !== undefined ? { showMarker: t.showMarker } : {}), ...(t.arrival ? { arrival: t.arrival } : {}) };
	});
	const pickups = objects.pickups?.map((p) => {
		const c = tileCenter(source, p.col, p.row);
		return { id: p.id, x: c.x, y: c.y, itemId: p.itemId, quantity: p.quantity };
	});
	const ambientNpcs = objects.ambientNpcs?.map((n) => {
		const c = tileCenter(source, n.col, n.row);
		return { id: n.id, x: c.x, y: c.y, frameName: n.frameName };
	});
	const discoveries = objects.discoveries?.map((d) => {
		const c = tileCenter(source, d.col, d.row);
		return { id: d.id, x: c.x, y: c.y, labelKey: d.labelKey, descriptionKey: d.descriptionKey };
	});
	return {
		groundPatches: buildGroundPatches(source),
		blockers: buildBlockers(source),
		mapDecor: buildMapDecor(source),
		...(landmarks ? { landmarks } : {}),
		...(transitions ? { transitions } : {}),
		...(pickups ? { pickups } : {}),
		...(ambientNpcs ? { ambientNpcs } : {}),
		...(discoveries ? { discoveries } : {})
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/game/content/maps/layered/compile-layered-region.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Run check + lint**

Run: `bun run check && bun run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/content/maps/layered/compile-layered-region.ts src/lib/game/content/maps/layered/compile-layered-region.test.ts
git commit -m "feat(maps): layered compiler maps objects to world coords"
```

---

## Task 6: Relocate global meadow bounds and exit-corridor walls

This task moves non-village content out of `village.ts` first, so that the village swap in Task 8 does not change the merged `meadowEntryMap`. After this task, `village.ts` still exports the village interior by hand-authoring (unchanged) — only the global/corridor pieces have moved. All existing tests must still pass.

**Files:**
- Modify: `src/lib/game/content/maps/regions/village.ts` — remove the 5 `meadow-*-boundary` blockers, `sundrop-southwest-ocean` blocker, the 16 `corridor-wall-*` blockers, and the `village-corridor-waymarker` decor.
- Modify: `src/lib/game/content/maps/regions/paths.ts` — add `blockers` (the 16 corridor walls) and `mapDecor` (the waymarker).
- Modify: `src/lib/game/content/maps/meadow-entry.ts` — add `meadowBoundsRegion` and include it in `mergeRegions`.

**Interfaces:**
- Produces: `pathsRegion` now carries `blockers` + `mapDecor`; a new `meadowBoundsRegion` fragment. `village.ts` is smaller but still hand-authored until Task 8.

- [ ] **Step 1: Add the corridor walls + waymarker to `paths.ts`**

In `src/lib/game/content/maps/regions/paths.ts`, import the dressing asset and the needed types, then add the blockers + decor. The full new file:

```ts
import { villageDressingAsset } from '$lib/game/content/assets';
import type { MapBlocker, MapDecor } from '$lib/game/content/maps/types';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

const corridorWalls: MapBlocker[] = [
	{ id: 'corridor-wall-2a', x: 1_750, y: 4_190, width: 220, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-2b', x: 1_775, y: 4_510, width: 170, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-3a', x: 1_690, y: 4_225, width: 64, height: 220, kind: 'garden-hedge' },
	{ id: 'corridor-wall-3b', x: 2_010, y: 4_225, width: 64, height: 270, kind: 'garden-hedge' },
	{ id: 'corridor-wall-4a', x: 2_025, y: 3_940, width: 370, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-4b', x: 2_040, y: 4_260, width: 330, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-5a', x: 2_040, y: 4_225, width: 64, height: 270, kind: 'garden-hedge' },
	{ id: 'corridor-wall-5b', x: 2_360, y: 4_225, width: 64, height: 270, kind: 'garden-hedge' },
	{ id: 'corridor-wall-6a', x: 2_375, y: 4_190, width: 370, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-6b', x: 2_375, y: 4_510, width: 370, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-7a', x: 2_390, y: 4_225, width: 64, height: 270, kind: 'garden-hedge' },
	{ id: 'corridor-wall-7b', x: 2_710, y: 4_225, width: 64, height: 270, kind: 'garden-hedge' },
	{ id: 'corridor-wall-8a', x: 2_725, y: 3_940, width: 370, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-8b', x: 2_725, y: 4_260, width: 370, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-9a', x: 2_740, y: 4_250, width: 64, height: 300, kind: 'garden-hedge' },
	{ id: 'corridor-wall-10b', x: 3_050, y: 4_560, width: 300, height: 64, kind: 'garden-hedge' }
];

const corridorWaymarker: MapDecor = {
	id: 'village-corridor-waymarker',
	textureKey: villageDressingAsset.key,
	frameName: 'poleLantern',
	x: 2_120,
	y: 4_440,
	width: 100,
	height: 200,
	mode: 'image',
	collision: { id: 'village-corridor-waymarker-collision', x: 2_120, y: 4_520, width: 50, height: 60 }
};

export const pathsRegion: RegionFragment = {
	groundPatches: [
		// Village (NE corner ~2,400,5,000) → Crossroads plaza (SW ~3,050,4,450)
		{ id: 'link-village-crossroads', x: 2_750, y: 4_700, width: 900, height: 64, tile: 'pathTile' },
		{ id: 'village-crossroads-nook', x: 2_980, y: 4_820, width: 240, height: 220, tile: 'autumnLeafTile' },
		{ id: 'link-village-crossroads-v', x: 3_050, y: 4_550, width: 64, height: 360, tile: 'pathTile' },
		{ id: 'link-crossroads-coast', x: 3_900, y: 4_700, width: 900, height: 64, tile: 'pathTile' },
		{ id: 'link-crossroads-coast-v', x: 4_200, y: 5_100, width: 64, height: 900, tile: 'pathTile' },
		{ id: 'link-crossroads-mistfen', x: 3_050, y: 3_150, width: 64, height: 820, tile: 'pathTile' },
		{ id: 'link-crossroads-mistfen-h', x: 2_690, y: 2_750, width: 740, height: 64, tile: 'pathTile' },
		{ id: 'link-crossroads-silverpine', x: 3_300, y: 2_950, width: 500, height: 64, tile: 'pathTile' },
		{ id: 'link-crossroads-wildwood', x: 4_000, y: 4_300, width: 64, height: 1_100, tile: 'pathTile' }
	],
	blockers: corridorWalls,
	mapDecor: [corridorWaymarker]
};
```

- [ ] **Step 2: Add `meadowBoundsRegion` to `meadow-entry.ts`**

Add the new fragment (above the `merged` declaration) and include it in `mergeRegions`. Insert after the imports:

```ts
const meadowBoundsRegion: RegionFragment = {
	blockers: [
		{ id: 'meadow-north-boundary', x: 3_200, y: 32, width: 6_400, height: 64, kind: 'town-hedge' },
		{ id: 'meadow-south-boundary', x: 3_200, y: 6_368, width: 6_400, height: 64, kind: 'town-hedge' },
		{ id: 'meadow-west-boundary', x: 32, y: 3_200, width: 64, height: 6_400, kind: 'town-hedge' },
		{ id: 'meadow-east-boundary', x: 6_368, y: 3_200, width: 64, height: 6_400, kind: 'town-hedge' },
		{ id: 'sundrop-southwest-ocean', x: 114, y: 6_311, width: 100, height: 50, kind: 'ocean' }
	],
	groundPatches: [{ id: 'sundrop-southwest-ocean-patch', x: 114, y: 6_311, width: 100, height: 50, tile: 'seaTile' }]
};
```

Update the `mergeRegions` call:

```ts
const merged = mergeRegions([
	villageRegion,
	wildwoodRegion,
	mistfenRegion,
	silverpineRegion,
	coastRegion,
	crossroadsRegion,
	pathsRegion,
	meadowBoundsRegion
]);
```

- [ ] **Step 3: Remove the relocated content from `village.ts`**

In `src/lib/game/content/maps/regions/village.ts`, delete:
- The 5 `meadow-*-boundary` blockers and `sundrop-southwest-ocean` blocker from the `blockers` array.
- The `sundrop-southwest-ocean-patch` from `groundPatches`.
- All 16 `corridor-wall-*` blockers from the `blockers` array.
- The `village-corridor-waymarker` entry from `mapDecor`.
- Update the doc comment at the top of the file to remove the "NE exit corridor (corridor-wall-*) is preserved" paragraph (the corridor now lives in `paths.ts`).

Leave all other village content (landmarks, the remaining decor, ambientNpcs, pickups, transitions, groundPatches, and the village-internal blockers) untouched — Task 8 replaces the rest.

- [ ] **Step 4: Run the full suite**

Run: `bun run test:unit -- --run && bun run check && bun run lint`
Expected: PASS — the merged `meadowEntryMap` is unchanged because every relocated id is still present, now from a different fragment. `maps.test.ts:1172` (4 town-hedge boundaries), `:1181` (>40 garden-hedge, corridor walls still contribute), `:1194` (ocean), `:1581` (spawn-to-crossroads) all still hold.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/content/maps/regions/paths.ts src/lib/game/content/maps/meadow-entry.ts src/lib/game/content/maps/regions/village.ts
git commit -m "refactor(maps): relocate meadow bounds and corridor walls out of village"
```

---

## Task 7: Village layered source (TDD-driven authoring)

Author `village-layered.ts` against the test suite. The grid params, decor glyph table, and objects are deterministic translations of the current `village.ts`; the five ASCII layers are authored from the room/wall/road specification below and refined until the connectivity tests pass.

**Files:**
- Create: `src/lib/game/content/maps/regions/village-layered.ts`
- Create: `src/lib/game/content/maps/regions/village-layered.test.ts`

**Interfaces:**
- Consumes: `LayeredRegionSource` (Task 1), `compileLayeredRegion` (Tasks 2–5).
- Produces: `sundropVillageLayered: LayeredRegionSource` (consumed by Task 8's `village.ts`).

### Village grid + object coordinates (deterministic translation)

Grid: `origin { x: 240, y: 4_360 }`, `width: 56`, `height: 48`, `tileSize: 32`. Tile `(col,row)` → world center `(256 + col*32, 4376 + row*32)`.

**Objects** (shipped positions; original deterministic-translation values in parens where they moved during Task 8 overlap/cluster-bounds fixes — see `docs/superpowers/reports/2026-07-04-sundrop-layered-village-review.md` §"Spatial adjustments during Task 8"):

| Object | id | col | row | extras |
|---|---|---|---|---|
| landmark | hero-house-exterior | 14 | 33 | 235×246, labelKey `content.maps.landmarks.hero-house-exterior.label` |
| landmark | item-shop-exterior | 8 | 18 | 246×235, `…item-shop-exterior.label` |
| landmark | blacksmith | 4 | 28 | 235×226, `…blacksmith.label` |
| landmark | villager-house-1-exterior | 19 | 3 (was 1) | 226×205, `…villager-house-1-exterior.label` |
| landmark | villager-house-2-exterior | 29 | 4 (was 1) | 338×261, `…villager-house-2-exterior.label` |
| landmark | guild-hall-exterior | 38 | 16 | 307×277, `…guild-hall-exterior.label` |
| landmark | sundrop-well | 23 | 25 | 141×160, `…sundrop-well.label` |
| landmark | shrine-of-aurora | 29 | 37 | 246×333, `…shrine-of-aurora.label` |
| landmark | villager-house-3-exterior | 40 | 31 | 184×333, `…villager-house-3-exterior.label` |
| transition | meadow-to-hero-house | 14 | 37 | toMapId `hero-house`, arrival `{x:256,y:224,facing:'up'}` |
| transition | meadow-to-item-shop | 8 | 22 | toMapId `item-shop`, arrival `{x:256,y:288,facing:'up'}` |
| transition | meadow-to-villager-house-1 | 19 | 14 | toMapId `villager-house-1`, arrival `{x:256,y:288,facing:'up'}` |
| transition | meadow-to-villager-house-2 | 29 | 13 | toMapId `villager-house-2`, arrival `{x:256,y:288,facing:'up'}` |
| transition | meadow-to-guild-hall | 38 | 21 | toMapId `guild-hall`, arrival `{x:256,y:288,facing:'up'}` |
| transition | meadow-to-shrine-of-aurora | 29 | 42 | toMapId `shrine-of-aurora-interior`, arrival `{x:256,y:288,facing:'up'}` |
| transition | meadow-to-villager-house-3 | 40 | 37 | toMapId `villager-house-3`, arrival `{x:256,y:288,facing:'up'}` |
| pickup | village-market-cache | 11 | 27 (was 5,31) | itemId `field-potion`, qty 1 — moved off the blacksmith landmark rect |
| pickup | village-shrine-cache | 41 | 40 | itemId `sunleaf-salve`, qty 1 |
| ambientNpc | village-wanderer | 26 | 19 (was 28) | frameName `travelerNpc` — moved off a hedge wall |
| ambientNpc | village-woodcutter | 10 | 28 | frameName `woodcutterNpc` |
| ambientNpc | village-pilgrim | 26 | 43 (was 44) | frameName `pilgrimNpc` |
| ambientNpc | village-crier | 40 | 8 | frameName `crierNpc` |

**Decor glyphs** (placed on the decor layer at the tile, resolved through the glyph table; shipped positions, original in parens where moved):

| glyph | tile (col,row) | frame | render W×H | depth | collision footprint |
|---|---|---|---|---|---|
| F | 23,27 | fountain | 180×150 | — | — |
| h | 23,19 | hangingLantern | 110×130 | foreground | — |
| f | 18,29 | flowerBed | 150×120 | — | — |
| f | 28,29 | flowerBed | 150×120 | — | — |
| m | 12,23 | marketStall | 240×190 | — | — |
| b | 16,17 | festivalBanner | 160×220 | — | — |
| s | 3,37 (was 2,37) | scarecrow | 120×170 | — | — |
| D | 7,33 | hedgeTopiary | 120×140 | — | — |
| l | 16,15 | poleLantern | 100×200 | — | 50×60 |
| l | 36,12 | poleLantern | 100×200 | — | 50×60 |
| l | 41,3 (was 41,2) | poleLantern | 100×200 | — | 50×60 |
| l | 47,2 | poleLantern | 100×200 | — | 50×60 |
| o | 25,39 | offeringStand | 180×180 | — | 80×60 |
| t | 33,39 | stoneLantern | 180×180 | — | 80×60 |
| M | 40,35 (was 40,34) | autumnMaple | 220×280 | — | 70×70 — moved so its collision footprint no longer seals the villager-house-3 transition |
| A | 44,2 | gateArch | 220×200 | — | — |

### Layer authoring specification (rectangles; later entries overwrite earlier within a layer)

Each entry is `{ glyph, cols: [a,b], rows: [c,d] }` inclusive. Cells not listed are `.`. Regions, paths, and collision layers must each be rendered to exactly 48 rows of 56 chars.

**REGIONS** (rooms + roads):
- H: cols 6–20, rows 36–42
- south lane: cols 14–16, rows 30–35
- P: cols 20–32, rows 22–29
- M: cols 6–19, rows 22–29
- M↔P doorway: cols 19–20, rows 25–26
- north lane: cols 25–27, rows 16–21
- N: cols 18–40, rows 8–15
- shrine connector: cols 25–27, rows 30–33
- S: cols 22–40, rows 34–43
- east bend: cols 33–40, rows 16–21
- N→E link: cols 40–42, rows 5–8
- E: cols 40–48, rows 5–8
- C: cols 44–48, rows 2–4

**PATHS** (tile per region; road tiles use `p` except P=`c`, S=`a`):
- H: `p` cols 6–20, rows 36–42
- south lane: `p` cols 14–16, rows 30–35
- P: `c` cols 20–32, rows 22–29
- M: `p` cols 6–19, rows 22–29
- M↔P doorway: `p` cols 19–20, rows 25–26
- north lane: `p` cols 25–27, rows 16–21
- N: `p` cols 18–40, rows 8–15
- shrine connector: `p` cols 25–27, rows 30–33
- S: `a` cols 22–40, rows 34–43
- east bend: `p` cols 33–40, rows 16–21
- N→E link: `p` cols 40–42, rows 5–8
- E: `p` cols 40–48, rows 5–8
- C: `p` cols 44–48, rows 2–4

**TERRAIN**: all `.` (grass). Author 48 rows of `.`×56. (village v1 uses no garden/water terrain; the relocated ocean lives in `meadowBoundsRegion`.)

**DECOR**: place the glyphs from the decor table at their tiles; every other cell `.`.

**COLLISION** (hedges with doorways). The exit is the NE gate (cols 44–48, rows 2–4); it connects to the relocated corridor in `paths.ts`:
- North wall: `#` row 2, cols 2–43 and cols 49–55
- West wall: `#` col 2, rows 2–45
- South wall: `#` row 45, cols 2–52
- East wall lower: `#` col 52, rows 9–45
- East wall upper (above gate zone): `#` col 52, rows 2–4
- M/P divider: `#` col 19, rows 22–24 and rows 27–29 (doorway at rows 25–26)
- H/S divider: `#` col 21, rows 34–35 and rows 39–42 (doorway at rows 36–38)
- South lane flanks: `#` col 13, rows 30–35 and col 17, rows 30–35
- North lane flanks: `#` col 24, rows 16–21 and col 28, rows 16–21
- Shrine connector flanks: `#` col 24, rows 30–33 and col 28, rows 30–33
- P north opening frame: `#` cols 20–24, row 21 and cols 28–32, row 21 (leave cols 25–27 open as the north-lane mouth)
- P south opening frame: `#` cols 20–24, row 30 and cols 28–32, row 30 (leave cols 25–27 open)
- East bend flanks: `#` col 32, rows 16–21 (already covered by P east edge) and col 41, rows 9–21
- Gate zone walls flanking C: `#` col 43, rows 3–8 and col 49, rows 3–8 (leave cols 44–48 as the gate corridor)

If a connectivity test fails, adjust doorway gaps (move a `#` to `.`) — never move a region glyph out of its room. Re-run the tests until green.

- [ ] **Step 1: Write the failing test suite**

```ts
import { describe, expect, it } from 'vitest';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
import { compileLayeredRegion } from '$lib/game/content/maps/layered/compile-layered-region';

function walkableCells(src = sundropVillageLayered): Set<string> {
	const blocked = new Set<string>();
	for (let row = 0; row < src.height; row++) {
		for (let col = 0; col < src.width; col++) {
			const g = src.layers.collision[row][col];
			if (g !== '.') blocked.add(`${col}:${row}`);
		}
	}
	const walkable = new Set<string>();
	for (let row = 0; row < src.height; row++) {
		for (let col = 0; col < src.width; col++) {
			if (!blocked.has(`${col}:${row}`)) walkable.add(`${col}:${row}`);
		}
	}
	return walkable;
}

function bfsReachable(start: string, walkable: Set<string>): Set<string> {
	const seen = new Set<string>([start]);
	const queue = [start];
	while (queue.length) {
		const [colStr, rowStr] = queue.shift()!.split(':');
		const col = Number(colStr);
		const row = Number(rowStr);
		for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
			const next = `${col + dc}:${row + dr}`;
			if (walkable.has(next) && !seen.has(next)) {
				seen.add(next);
				queue.push(next);
			}
		}
	}
	return seen;
}

function firstGlyphCell(glyph: string, layer: 'regions'): { col: number; row: number } {
	const rows = sundropVillageLayered.layers[layer];
	for (let row = 0; row < rows.length; row++) {
		const col = rows[row].indexOf(glyph);
		if (col >= 0) return { col, row };
	}
	throw new Error(`glyph ${glyph} not found in ${layer}`);
}

describe('sundrop village layered source', () => {
	it('every layer has exactly width × height cells', () => {
		for (const [name, rows] of Object.entries(sundropVillageLayered.layers)) {
			expect(rows, `${name} row count`).toHaveLength(sundropVillageLayered.height);
			for (let i = 0; i < rows.length; i++) {
				expect(rows[i].length, `${name} row ${i} width`).toBe(sundropVillageLayered.width);
			}
		}
	});

	it.each(['H', 'P', 'M', 'N', 'S', 'E', 'C'] as const)('regions layer contains glyph %s', (glyph) => {
		expect(sundropVillageLayered.layers.regions.some((r) => r.includes(glyph))).toBe(true);
	});

	it('connects H by walkable path to P, M, N, S, E, C', () => {
		const walkable = walkableCells();
		const start = firstGlyphCell('H', 'regions');
		const reachable = bfsReachable(`${start.col}:${start.row}`, walkable);
		for (const glyph of ['P', 'M', 'N', 'S', 'E', 'C'] as const) {
			const target = firstGlyphCell(glyph, 'regions');
			expect(reachable.has(`${target.col}:${target.row}`), `H not connected to ${glyph}`).toBe(true);
		}
	});

	it('keeps village-market-cache inside the market region', () => {
		const cache = sundropVillageLayered.objects.pickups!.find((p) => p.id === 'village-market-cache')!;
		expect(sundropVillageLayered.layers.regions[cache.row][cache.col]).toBe('M');
	});

	it('keeps village-shrine-cache inside the shrine region', () => {
		const cache = sundropVillageLayered.objects.pickups!.find((p) => p.id === 'village-shrine-cache')!;
		expect(sundropVillageLayered.layers.regions[cache.row][cache.col]).toBe('S');
	});

	it('places every transition and pickup on a region glyph or a path tile', () => {
		const all = [
			...(sundropVillageLayered.objects.transitions ?? []).map((o) => ({ ...o, kind: 'transition' })),
			...(sundropVillageLayered.objects.pickups ?? []).map((o) => ({ ...o, kind: 'pickup' }))
		];
		const regionGlyphs = new Set(['H', 'P', 'M', 'N', 'S', 'E', 'C']);
		const pathGlyphs = new Set(['p', 'c', 'a', 's']);
		for (const obj of all) {
			const region = sundropVillageLayered.layers.regions[obj.row][obj.col];
			const path = sundropVillageLayered.layers.paths[obj.row][obj.col];
			const ok = regionGlyphs.has(region) || pathGlyphs.has(path);
			expect(ok, `${obj.kind} ${obj.id} at (${obj.col},${obj.row}) not on a region or path tile`).toBe(true);
		}
	});

	it('compiles deterministically', () => {
		const a = JSON.stringify(compileLayeredRegion(sundropVillageLayered));
		const b = JSON.stringify(compileLayeredRegion(sundropVillageLayered));
		expect(a).toBe(b);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/village-layered.test.ts`
Expected: FAIL — `sundropVillageLayered` not defined.

- [ ] **Step 3: Generate the layer arrays from the rectangle spec**

Write a throwaway generator that stamps the spec rectangles onto 48×56 grids and prints ready-to-paste TS array literals. Create `scripts/render-village-layers.mjs`:

```js
const WIDTH = 56, HEIGHT = 48;
const blank = () => Array.from({ length: HEIGHT }, () => Array.from({ length: WIDTH }, () => '.'));
const stamp = (grid, glyph, [c0, c1], [r0, r1]) => {
	for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[r][c] = glyph;
};
const stampCell = (grid, glyph, col, row) => { grid[row][col] = glyph; };
const toLines = (grid) => grid.map((row) => row.join(''));
const print = (name, lines) => {
	console.log(`\t\t${name}: [`);
	for (const l of lines) console.log(`\t\t\t'${l}',`);
	console.log('\t\t],');
};

const regions = blank();
stamp(regions, 'H', [6, 20], [36, 42]);
stamp(regions, 'P', [20, 32], [22, 29]);
stamp(regions, 'M', [6, 19], [22, 29]);
stamp(regions, 'N', [18, 40], [8, 15]);
stamp(regions, 'S', [22, 40], [34, 43]);
stamp(regions, 'E', [40, 48], [5, 8]);
stamp(regions, 'C', [44, 48], [2, 4]);
stamp(regions, 'M', [5, 5], [31, 31]); // ensure market-cache tile is M
stamp(regions, 'S', [41, 41], [40, 40]); // ensure shrine-cache tile is S

const paths = blank();
stamp(paths, 'p', [6, 20], [36, 42]);
stamp(paths, 'c', [20, 32], [22, 29]);
stamp(paths, 'p', [6, 19], [22, 29]);
stamp(paths, 'p', [18, 40], [8, 15]);
stamp(paths, 'a', [22, 40], [34, 43]);
stamp(paths, 'p', [40, 48], [5, 8]);
stamp(paths, 'p', [44, 48], [2, 4]);
stamp(paths, 'p', [14, 16], [30, 35]); // south lane
stamp(paths, 'p', [25, 27], [16, 21]); // north lane
stamp(paths, 'p', [25, 27], [30, 33]); // shrine connector
stamp(paths, 'p', [33, 40], [16, 21]); // east bend
stamp(paths, 'p', [19, 20], [25, 26]); // M<->P doorway
stamp(paths, 'p', [5, 5], [31, 31]);
stamp(paths, 'a', [41, 41], [40, 40]);

const collision = blank();
stamp(collision, '#', [2, 43], [2, 2]); // north wall (gap 44-48 = gate)
stamp(collision, '#', [49, 55], [2, 2]);
stamp(collision, '#', [2, 2], [2, 45]); // west wall
stamp(collision, '#', [2, 52], [45, 45]); // south wall
stamp(collision, '#', [52, 52], [9, 45]); // east wall lower
stamp(collision, '#', [52, 52], [2, 4]); // east wall upper
stamp(collision, '#', [19, 19], [22, 24]); // M/P divider
stamp(collision, '#', [19, 19], [27, 29]);
stamp(collision, '#', [21, 21], [34, 35]); // H/S divider
stamp(collision, '#', [21, 21], [39, 42]);
stamp(collision, '#', [13, 13], [30, 35]); // south lane flanks
stamp(collision, '#', [17, 17], [30, 35]);
stamp(collision, '#', [24, 24], [16, 21]); // north lane flanks
stamp(collision, '#', [28, 28], [16, 21]);
stamp(collision, '#', [24, 24], [30, 33]); // shrine connector flanks
stamp(collision, '#', [28, 28], [30, 33]);
stamp(collision, '#', [20, 24], [21, 21]); // P north frame (mouth 25-27)
stamp(collision, '#', [28, 32], [21, 21]);
stamp(collision, '#', [20, 24], [30, 30]); // P south frame
stamp(collision, '#', [28, 32], [30, 30]);
stamp(collision, '#', [41, 41], [9, 21]); // east bend east flank
stamp(collision, '#', [43, 43], [2, 4]); // gate corridor flanks (C rows only)
stamp(collision, '#', [49, 49], [2, 4]);

const decor = blank();
stampCell(decor, 'F', 23, 27);
stampCell(decor, 'h', 23, 19);
stampCell(decor, 'f', 18, 29);
stampCell(decor, 'f', 28, 29);
stampCell(decor, 'm', 12, 23);
stampCell(decor, 'b', 16, 17);
stampCell(decor, 's', 2, 37);
stampCell(decor, 'D', 7, 33);
stampCell(decor, 'l', 16, 15);
stampCell(decor, 'l', 36, 12);
stampCell(decor, 'l', 41, 2);
stampCell(decor, 'l', 47, 2);
stampCell(decor, 'o', 25, 39);
stampCell(decor, 't', 33, 39);
stampCell(decor, 'M', 40, 34);
stampCell(decor, 'A', 44, 2);

const terrain = blank(); // all grass

print('terrain', toLines(terrain));
print('paths', toLines(paths));
print('collision', toLines(collision));
print('decor', toLines(decor));
print('regions', toLines(regions));
```

Run: `node scripts/render-village-layers.mjs`
Expected: five printed array literals, each 48 rows of 56 chars.

- [ ] **Step 4: Author the village layered source**

Create `src/lib/game/content/maps/regions/village-layered.ts`. Paste the generator's five array outputs into `layers`, and add the decor glyph table + objects (from the tables earlier in this task). The result:

```ts
import { villageDressingAsset } from '$lib/game/content/assets';
import type { LayeredRegionSource } from '$lib/game/content/maps/layered/types';

export const sundropVillageLayered: LayeredRegionSource = {
	tileSize: 32,
	origin: { x: 240, y: 4_360 },
	width: 56,
	height: 48,
	layers: {
		// Paste the five arrays emitted by scripts/render-village-layers.mjs here.
		terrain: [/* … */],
		paths: [/* … */],
		collision: [/* … */],
		decor: [/* … */],
		regions: [/* … */]
	},
	decorGlyphTable: {
		f: { frame: 'flowerBed', textureKey: villageDressingAsset.key, renderWidth: 150, renderHeight: 120 },
		m: { frame: 'marketStall', textureKey: villageDressingAsset.key, renderWidth: 240, renderHeight: 190 },
		b: { frame: 'festivalBanner', textureKey: villageDressingAsset.key, renderWidth: 160, renderHeight: 220 },
		s: { frame: 'scarecrow', textureKey: villageDressingAsset.key, renderWidth: 120, renderHeight: 170 },
		D: { frame: 'hedgeTopiary', textureKey: villageDressingAsset.key, renderWidth: 120, renderHeight: 140 },
		F: { frame: 'fountain', textureKey: villageDressingAsset.key, renderWidth: 180, renderHeight: 150 },
		A: { frame: 'gateArch', textureKey: villageDressingAsset.key, renderWidth: 220, renderHeight: 200 },
		l: { frame: 'poleLantern', textureKey: villageDressingAsset.key, renderWidth: 100, renderHeight: 200, collision: { width: 50, height: 60 } },
		h: { frame: 'hangingLantern', textureKey: villageDressingAsset.key, renderWidth: 110, renderHeight: 130, depth: 'foreground' },
		o: { frame: 'offeringStand', textureKey: villageDressingAsset.key, renderWidth: 180, renderHeight: 180, collision: { width: 80, height: 60 } },
		t: { frame: 'stoneLantern', textureKey: villageDressingAsset.key, renderWidth: 180, renderHeight: 180, collision: { width: 80, height: 60 } },
		M: { frame: 'autumnMaple', textureKey: villageDressingAsset.key, renderWidth: 220, renderHeight: 280, collision: { width: 70, height: 70 } }
	},
	objects: {
		landmarks: [
			{ id: 'hero-house-exterior', col: 14, row: 33, width: 235, height: 246, labelKey: 'content.maps.landmarks.hero-house-exterior.label' },
			{ id: 'item-shop-exterior', col: 8, row: 18, width: 246, height: 235, labelKey: 'content.maps.landmarks.item-shop-exterior.label' },
			{ id: 'blacksmith', col: 4, row: 28, width: 235, height: 226, labelKey: 'content.maps.landmarks.blacksmith.label' },
			{ id: 'villager-house-1-exterior', col: 19, row: 1, width: 226, height: 205, labelKey: 'content.maps.landmarks.villager-house-1-exterior.label' },
			{ id: 'villager-house-2-exterior', col: 29, row: 1, width: 338, height: 261, labelKey: 'content.maps.landmarks.villager-house-2-exterior.label' },
			{ id: 'guild-hall-exterior', col: 38, row: 16, width: 307, height: 277, labelKey: 'content.maps.landmarks.guild-hall-exterior.label' },
			{ id: 'sundrop-well', col: 23, row: 25, width: 141, height: 160, labelKey: 'content.maps.landmarks.sundrop-well.label' },
			{ id: 'shrine-of-aurora', col: 29, row: 37, width: 246, height: 333, labelKey: 'content.maps.landmarks.shrine-of-aurora.label' },
			{ id: 'villager-house-3-exterior', col: 40, row: 31, width: 184, height: 333, labelKey: 'content.maps.landmarks.villager-house-3-exterior.label' }
		],
		transitions: [
			{ id: 'meadow-to-hero-house', col: 14, row: 37, toMapId: 'hero-house', showMarker: false, arrival: { x: 256, y: 224, facing: 'up' } },
			{ id: 'meadow-to-item-shop', col: 8, row: 22, toMapId: 'item-shop', showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } },
			{ id: 'meadow-to-villager-house-1', col: 19, row: 14, toMapId: 'villager-house-1', showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } },
			{ id: 'meadow-to-villager-house-2', col: 29, row: 13, toMapId: 'villager-house-2', showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } },
			{ id: 'meadow-to-guild-hall', col: 38, row: 21, toMapId: 'guild-hall', showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } },
			{ id: 'meadow-to-shrine-of-aurora', col: 29, row: 42, toMapId: 'shrine-of-aurora-interior', showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } },
			{ id: 'meadow-to-villager-house-3', col: 40, row: 37, toMapId: 'villager-house-3', showMarker: false, arrival: { x: 256, y: 288, facing: 'up' } }
		],
		pickups: [
			{ id: 'village-market-cache', col: 5, row: 31, itemId: 'field-potion', quantity: 1 },
			{ id: 'village-shrine-cache', col: 41, row: 40, itemId: 'sunleaf-salve', quantity: 1 }
		],
		ambientNpcs: [
			{ id: 'village-wanderer', col: 28, row: 19, frameName: 'travelerNpc' },
			{ id: 'village-woodcutter', col: 10, row: 28, frameName: 'woodcutterNpc' },
			{ id: 'village-pilgrim', col: 26, row: 44, frameName: 'pilgrimNpc' },
			{ id: 'village-crier', col: 40, row: 8, frameName: 'crierNpc' }
		]
	}
};
```

After pasting, delete `scripts/render-village-layers.mjs` (it was a dev aid).

- [ ] **Step 5: Run tests and iterate the collision layer until connectivity passes**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/village-layered.test.ts`
Expected: PASS once layers are correctly rendered. If `connects H …` fails, open up the relevant doorway in the collision layer (change a `#` to `.`) and re-run. Do not change region glyphs to fix connectivity.

- [ ] **Step 6: Run check + lint**

Run: `bun run check && bun run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/game/content/maps/regions/village-layered.ts src/lib/game/content/maps/regions/village-layered.test.ts
git commit -m "feat(maps): add layered Sundrop Village source"
```

---

## Task 8: Swap village.ts to compiled output; retire the old layout test

**Files:**
- Modify: `src/lib/game/content/maps/regions/village.ts` — replace entire contents with the compile call.
- Delete: `src/lib/game/content/maps/regions/village-layout.test.ts`

**Interfaces:**
- Produces: `villageRegion` is now the compiled fragment; the `village-layered.test.ts` "no hand-authored literals" test (Task 7) now passes against the real `village.ts`.

- [ ] **Step 1: Replace `village.ts` with the compile call**

```ts
import { compileLayeredRegion } from '$lib/game/content/maps/layered/compile-layered-region';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

/**
 * Village region — Sundrop Village. Authored as a layered map
 * (`village-layered.ts`) and compiled to a `RegionFragment` here.
 * Non-village blockers (global meadow boundaries, ocean, exit-corridor
 * walls) live in `meadow-entry.ts` and `paths.ts`.
 */
export const villageRegion: RegionFragment = compileLayeredRegion(sundropVillageLayered);
```

- [ ] **Step 2: Delete the retired test**

```bash
rm src/lib/game/content/maps/regions/village-layout.test.ts
```

- [ ] **Step 3: Add the no-hand-authored guard test to `village-layered.test.ts`**

Append to the `village-layered.test.ts` `describe` block (this test could only pass once `village.ts` is the compile call):

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));

// …inside the describe block, add:

	it('village.ts contains no hand-authored rectangle literals', () => {
		const villageTs = readFileSync(resolve(__dirname, 'village.ts'), 'utf8');
		expect(villageTs).not.toMatch(/\bblockers\s*:/);
		expect(villageTs).not.toMatch(/\bgroundPatches\s*:/);
		expect(villageTs).not.toMatch(/\bmapDecor\s*:/);
	});
```

- [ ] **Step 4: Run the full validation suite**

Run: `bun run test:unit -- --run && bun run check && bun run lint`
Expected: PASS — including `maps.test.ts` (`:1172` hedge-kind, `:1181` >40 garden-hedge, `:1194` ocean, `:1581` spawn-to-crossroads, `:1666` gameplay-object reachability), the new layered tests, and the no-hand-authored guard.

- [ ] **Step 5: Run e2e**

Run: `bun run test:e2e`
Expected: PASS — boot/save flows unaffected; the compiled village renders and the spawn-to-crossroads route is walkable.

- [ ] **Step 6: Commit**

```bash
git add -A src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/village-layered.test.ts
git commit -m "feat(maps): compile Sundrop Village from layered source"
```

---

## Task 9: Visual review report

**Files:**
- Create: `docs/superpowers/reports/2026-07-04-sundrop-layered-village-review.md` (filename date per HPA-132 §7).

- [ ] **Step 1: Boot the game and capture screenshots**

Run: `bun run tauri dev` (or `bun run dev` for browser). Navigate to each area and capture: Home Yard, Well Plaza, Market Yard, Shrine Garden, East Gate, plus a debug view (enable any collision/region overlay, or describe the collision layer from `sundropVillageLayered.layers.collision` as an ASCII inset). Save screenshots under `docs/superpowers/reports/img/` (committed, not gitignored).

- [ ] **Step 2: Write the report**

Document each screenshot with the tile coordinates and confirm the player-facing route `Home Yard → Well Plaza → Market / North Residences / Shrine Garden / East Gate` is walkable. Note any visual adjustments made during Task 7 iteration.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/reports/2026-07-04-sundrop-layered-village-review.md docs/superpowers/reports/img/
git commit -m "docs: sundrop layered village visual review"
```

---

## Final acceptance

- [ ] `bun run test:unit -- --run` passes
- [ ] `bun run check` passes
- [ ] `bun run lint` passes
- [ ] `bun run test:e2e` passes
- [ ] `village.ts` is the 3-line compile call
- [ ] `village-layout.test.ts` is deleted
- [ ] Open the PR from `hpa-layered-sundrop-village`; reference HPA-132; note PR #11 will be closed as superseded on merge
