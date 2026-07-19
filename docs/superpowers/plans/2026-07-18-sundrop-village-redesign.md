# Sundrop Village Redesign — Phases 1–3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build deterministic preview tooling and a spatial design contract for Sundrop Village, then re-author its region and collision layers into a readable spine-and-pockets layout.

**Architecture:** A pure SVG renderer in `src/lib/game/content/maps/layered/preview.ts` (testable by vitest) with a thin fs CLI in `tools/`. Pure geometry helpers in `layered/geometry.ts` back a two-wave test contract in `village-layered.test.ts`. The blockout itself is generated from an extents/openings table by a throwaway script, then committed as literal layer strings.

**Tech Stack:** TypeScript, Vitest, Bun. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-07-18-sundrop-village-redesign-design.md`

## Global Constraints

- Keep the 56×48, 32px layered source; origin stays `{x: 256, y: 4352}`.
- Do not edit `village.ts` beyond its existing `compileLayeredRegion` call.
- Do not modify `compile-layered-region.ts` to solve a level-design problem.
- Do not edit `paths.ts` — external corridor walls are out of scope.
- Preserve every existing semantic ID and `toMapId`.
- No new assets, gameplay systems, discoveries, encounters, save fields, or HUD behavior.
- Do not weaken a design test to accept the map. If a test fails, change the map.
- `MapBlocker.x`/`.y` are rect **centers**, not top-left corners.
- Wave B tests are **out of scope** for this plan (phases 4–5).

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/game/content/maps/layered/preview.ts` | **Create.** Pure SVG/Markdown renderers. No fs, no compiler import. |
| `src/lib/game/content/maps/layered/preview.test.ts` | **Create.** Determinism + legend coverage. |
| `src/lib/game/content/maps/layered/geometry.ts` | **Create.** Pure grid geometry: adjacency, runs, tile occupancy, footprints, BFS. |
| `src/lib/game/content/maps/layered/geometry.test.ts` | **Create.** Helpers tested on synthetic fixtures. |
| `tools/preview-layered-region.ts` | **Create.** Thin CLI: call renderers, write files. |
| `src/lib/game/content/maps/regions/village-layered.ts` | **Modify.** New `regions`/`collision` layers; relocated objects and decor. |
| `src/lib/game/content/maps/regions/village-layered.test.ts` | **Modify.** Shared glyph constants; Wave A assertions. |
| `package.json` | **Modify.** Add `preview:village`. |

---

### Task 1: Pure preview renderer

**Files:**
- Create: `src/lib/game/content/maps/layered/preview.ts`
- Test: `src/lib/game/content/maps/layered/preview.test.ts`

**Interfaces:**
- Consumes: `LayeredRegionSource` from `./types`.
- Produces: `renderRegionsSvg`, `renderCollisionSvg`, `renderTerrainPathsSvg`, `renderDesignerSvg(source, options)`, `renderObjectsMarkdown`, `renderLayeredPreviews(source): Map<string, string>`, and exported constants `CELL`, `REGION_FILL`, `UNKNOWN_FILL`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/game/content/maps/layered/preview.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
import {
	UNKNOWN_FILL,
	renderLayeredPreviews,
	renderRegionsSvg
} from '$lib/game/content/maps/layered/preview';

function glyphsIn(rows: readonly string[]): string[] {
	const seen = new Set<string>();
	for (const row of rows) for (const g of row) if (g !== '.') seen.add(g);
	return [...seen].sort();
}

describe('layered region preview renderer', () => {
	it('renders byte-identical output for the same source twice', () => {
		const a = renderLayeredPreviews(sundropVillageLayered);
		const b = renderLayeredPreviews(sundropVillageLayered);
		expect([...a.keys()].sort()).toEqual([...b.keys()].sort());
		for (const [name, content] of a) {
			expect(content, `${name} is not deterministic`).toBe(b.get(name));
		}
	});

	it('produces every promised preview file', () => {
		const files = [...renderLayeredPreviews(sundropVillageLayered).keys()].sort();
		expect(files).toEqual([
			'village-collision.svg',
			'village-designer-muted.svg',
			'village-designer.svg',
			'village-objects.md',
			'village-regions.svg',
			'village-terrain-paths.svg'
		]);
	});

	it('lists every region glyph present in the source in the legend', () => {
		const svg = renderRegionsSvg(sundropVillageLayered);
		for (const glyph of glyphsIn(sundropVillageLayered.layers.regions)) {
			expect(svg, `glyph ${glyph} missing from legend`).toContain(`&#160;${glyph}&#160;`);
		}
	});

	it('renders an unmapped glyph in the loud placeholder colour rather than blank', () => {
		const patched = {
			...sundropVillageLayered,
			layers: {
				...sundropVillageLayered.layers,
				regions: sundropVillageLayered.layers.regions.map((row, i) =>
					i === 0 ? 'Z'.repeat(sundropVillageLayered.width) : row
				)
			}
		};
		expect(renderRegionsSvg(patched)).toContain(UNKNOWN_FILL);
	});

	it('renders the object table with one row per landmark', () => {
		const md = renderLayeredPreviews(sundropVillageLayered).get('village-objects.md')!;
		for (const landmark of sundropVillageLayered.objects.landmarks ?? []) {
			expect(md).toContain(landmark.id);
		}
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/game/content/maps/layered/preview.test.ts`
Expected: FAIL — `Failed to resolve import ".../layered/preview"`.

- [ ] **Step 3: Write the renderer**

Create `src/lib/game/content/maps/layered/preview.ts`:

```ts
import type { LayeredRegionSource } from '$lib/game/content/maps/layered/types';

/** Pixels per tile in generated SVGs. */
export const CELL = 12;

/** Loud magenta for a glyph with no colour mapping — never render blank. */
export const UNKNOWN_FILL = '#ff00ff';

export const REGION_FILL: Record<string, string> = {
	H: '#7fb069',
	P: '#e6b85c',
	M: '#c98b5e',
	N: '#8e9aaf',
	G: '#a487c4',
	S: '#d98ca5',
	E: '#6fb3c4',
	C: '#9aa07f'
};

const PATH_FILL: Record<string, string> = {
	p: '#cbb994',
	c: '#a8a29e',
	a: '#c98a5b',
	s: '#7bb0c9'
};

const TERRAIN_FILL: Record<string, string> = { g: '#d9c9a3', w: '#5b8fa8' };

const COLLISION_FILL = '#3f3f46';
const BACKGROUND_FILL = '#faf9f7';
const LEGEND_HEIGHT = 22;

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function cell(col: number, row: number, fill: string, opacity = 1): string {
	const alpha = opacity === 1 ? '' : ` opacity="${opacity}"`;
	return `<rect x="${col * CELL}" y="${row * CELL}" width="${CELL}" height="${CELL}" fill="${fill}"${alpha}/>`;
}

function glyphsIn(rows: readonly string[]): string[] {
	const seen = new Set<string>();
	for (const row of rows) for (const g of row) if (g !== '.') seen.add(g);
	return [...seen].sort();
}

function header(source: LayeredRegionSource, title: string): string[] {
	const w = source.width * CELL;
	const h = source.height * CELL + LEGEND_HEIGHT;
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
		`<title>${escapeXml(title)}</title>`,
		`<rect width="${w}" height="${h}" fill="${BACKGROUND_FILL}"/>`
	];
}

/**
 * Legend entries are wrapped in non-breaking spaces so a test can assert
 * `&#160;X&#160;` and match a whole glyph rather than any incidental
 * occurrence of that letter elsewhere in the document.
 */
function footer(source: LayeredRegionSource, entries: readonly string[]): string[] {
	const y = source.height * CELL + 15;
	const out: string[] = [];
	let x = 4;
	for (const entry of entries) {
		out.push(
			`<text x="${x}" y="${y}" font-family="monospace" font-size="10" fill="#27272a">&#160;${escapeXml(entry)}&#160;</text>`
		);
		x += (entry.length + 2) * 6 + 8;
	}
	out.push('</svg>');
	return out;
}

function paintLayer(
	source: LayeredRegionSource,
	rows: readonly string[],
	fills: Record<string, string>,
	opacity = 1
): string[] {
	const out: string[] = [];
	for (let row = 0; row < source.height; row++) {
		for (let col = 0; col < source.width; col++) {
			const glyph = rows[row][col];
			if (glyph === '.') continue;
			out.push(cell(col, row, fills[glyph] ?? UNKNOWN_FILL, opacity));
		}
	}
	return out;
}

export function renderRegionsSvg(source: LayeredRegionSource): string {
	return [
		...header(source, 'regions'),
		...paintLayer(source, source.layers.regions, REGION_FILL),
		...footer(source, glyphsIn(source.layers.regions))
	].join('\n');
}

export function renderCollisionSvg(source: LayeredRegionSource): string {
	return [
		...header(source, 'collision'),
		...paintLayer(
			source,
			source.layers.collision,
			Object.fromEntries(glyphsIn(source.layers.collision).map((g) => [g, COLLISION_FILL]))
		),
		...footer(source, glyphsIn(source.layers.collision))
	].join('\n');
}

export function renderTerrainPathsSvg(source: LayeredRegionSource): string {
	return [
		...header(source, 'terrain + paths'),
		...paintLayer(source, source.layers.terrain, TERRAIN_FILL),
		...paintLayer(source, source.layers.paths, PATH_FILL),
		...footer(source, [...glyphsIn(source.layers.terrain), ...glyphsIn(source.layers.paths)])
	].join('\n');
}

export function renderDesignerSvg(
	source: LayeredRegionSource,
	options: { readonly mutePaths: boolean }
): string {
	const out = [
		...header(source, options.mutePaths ? 'designer (paths muted)' : 'designer'),
		...paintLayer(source, source.layers.regions, REGION_FILL, 0.45),
		...paintLayer(source, source.layers.paths, PATH_FILL, options.mutePaths ? 0.12 : 0.75),
		...paintLayer(
			source,
			source.layers.collision,
			Object.fromEntries(glyphsIn(source.layers.collision).map((g) => [g, COLLISION_FILL]))
		)
	];
	for (const landmark of source.objects.landmarks ?? []) {
		const w = landmark.width / source.tileSize;
		const h = landmark.height / source.tileSize;
		out.push(
			`<rect x="${(landmark.col - w / 2 + 0.5) * CELL}" y="${(landmark.row - h / 2 + 0.5) * CELL}" width="${w * CELL}" height="${h * CELL}" fill="none" stroke="#1c1917" stroke-width="1.5"/>`
		);
	}
	const marks: Array<[readonly { col: number; row: number }[], string]> = [
		[source.objects.transitions ?? [], '#dc2626'],
		[source.objects.pickups ?? [], '#16a34a'],
		[source.objects.ambientNpcs ?? [], '#2563eb']
	];
	for (const [items, colour] of marks) {
		for (const item of items) {
			out.push(
				`<circle cx="${(item.col + 0.5) * CELL}" cy="${(item.row + 0.5) * CELL}" r="${CELL * 0.35}" fill="${colour}"/>`
			);
		}
	}
	for (let row = 0; row < source.height; row++) {
		for (let col = 0; col < source.width; col++) {
			const glyph = source.layers.decor[row][col];
			if (glyph === '.') continue;
			out.push(
				`<text x="${col * CELL + 2}" y="${row * CELL + CELL - 2}" font-family="monospace" font-size="${CELL - 2}" fill="#0c0a09">${escapeXml(glyph)}</text>`
			);
		}
	}
	return [...out, ...footer(source, glyphsIn(source.layers.regions))].join('\n');
}

export function renderObjectsMarkdown(source: LayeredRegionSource): string {
	const lines = ['# Layered objects', '', '| Kind | ID | Col | Row | Region | Detail |', '| --- | --- | --- | --- | --- | --- |'];
	const at = (col: number, row: number) => source.layers.regions[row][col];
	for (const l of source.objects.landmarks ?? []) {
		lines.push(`| landmark | \`${l.id}\` | ${l.col} | ${l.row} | ${at(l.col, l.row)} | ${l.width}×${l.height}px |`);
	}
	for (const t of source.objects.transitions ?? []) {
		lines.push(`| transition | \`${t.id}\` | ${t.col} | ${t.row} | ${at(t.col, t.row)} | → ${t.toMapId} |`);
	}
	for (const p of source.objects.pickups ?? []) {
		lines.push(`| pickup | \`${p.id}\` | ${p.col} | ${p.row} | ${at(p.col, p.row)} | ${p.itemId} ×${p.quantity} |`);
	}
	for (const n of source.objects.ambientNpcs ?? []) {
		lines.push(`| npc | \`${n.id}\` | ${n.col} | ${n.row} | ${at(n.col, n.row)} | ${n.frameName} |`);
	}
	return lines.join('\n') + '\n';
}

export function renderLayeredPreviews(source: LayeredRegionSource): Map<string, string> {
	return new Map([
		['village-regions.svg', renderRegionsSvg(source)],
		['village-collision.svg', renderCollisionSvg(source)],
		['village-terrain-paths.svg', renderTerrainPathsSvg(source)],
		['village-designer.svg', renderDesignerSvg(source, { mutePaths: false })],
		['village-designer-muted.svg', renderDesignerSvg(source, { mutePaths: true })],
		['village-objects.md', renderObjectsMarkdown(source)]
	]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/game/content/maps/layered/preview.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/content/maps/layered/preview.ts src/lib/game/content/maps/layered/preview.test.ts
git commit -m "feat(maps): deterministic layered region preview renderer"
```

---

### Task 2: Composed-collision view and CLI

**Files:**
- Modify: `src/lib/game/content/maps/layered/preview.ts`
- Modify: `src/lib/game/content/maps/layered/preview.test.ts`
- Create: `tools/preview-layered-region.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1's renderers; `MapBlocker` from `$lib/game/content/maps/types`.
- Produces: `renderComposedCollisionSvg(source, overlays: readonly MapBlocker[]): string`, and `tileCoverage(rect, source): Array<{col, row}>` used again by Task 3's A7.

The overlay is a **parameter**, never an import, so the generic renderer stays pure and reusable for regions with no external walls.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/game/content/maps/layered/preview.test.ts`:

```ts
import { renderComposedCollisionSvg } from '$lib/game/content/maps/layered/preview';
import type { MapBlocker } from '$lib/game/content/maps/types';

describe('composed collision view', () => {
	const overlay: MapBlocker[] = [
		// Centred on the village tile (col 10, row 10): origin 256+10*32+16 = 592.
		{ id: 'test-overlay', x: 592, y: 4_688, width: 32, height: 32, kind: 'garden-hedge' }
	];

	it('is deterministic', () => {
		expect(renderComposedCollisionSvg(sundropVillageLayered, overlay)).toBe(
			renderComposedCollisionSvg(sundropVillageLayered, overlay)
		);
	});

	it('paints the overlay tile distinctly from village collision', () => {
		const withOverlay = renderComposedCollisionSvg(sundropVillageLayered, overlay);
		const without = renderComposedCollisionSvg(sundropVillageLayered, []);
		expect(withOverlay).not.toBe(without);
		expect(withOverlay).toContain('#b91c1c');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/game/content/maps/layered/preview.test.ts`
Expected: FAIL — `renderComposedCollisionSvg is not a function`.

- [ ] **Step 3: Add the composed renderer**

Append to `src/lib/game/content/maps/layered/preview.ts`:

```ts
import type { MapBlocker } from '$lib/game/content/maps/types';

const OVERLAY_FILL = '#b91c1c';

/**
 * Tiles a non-grid-aligned rect occupies. A tile counts as covered when the
 * rect overlaps more than half its area — the same rule the A7 contract test
 * uses, so preview and assertion never disagree.
 *
 * `rect.x`/`.y` are CENTRES, matching MapBlocker throughout the codebase.
 */
export function tileCoverage(
	rect: { x: number; y: number; width: number; height: number },
	source: LayeredRegionSource
): Array<{ col: number; row: number }> {
	const left = rect.x - rect.width / 2;
	const right = rect.x + rect.width / 2;
	const top = rect.y - rect.height / 2;
	const bottom = rect.y + rect.height / 2;
	const size = source.tileSize;
	const area = size * size;
	const out: Array<{ col: number; row: number }> = [];
	for (let row = 0; row < source.height; row++) {
		for (let col = 0; col < source.width; col++) {
			const cl = source.origin.x + col * size;
			const ct = source.origin.y + row * size;
			const ox = Math.max(0, Math.min(right, cl + size) - Math.max(left, cl));
			const oy = Math.max(0, Math.min(bottom, ct + size) - Math.max(top, ct));
			if (ox * oy > area * 0.5) out.push({ col, row });
		}
	}
	return out;
}

export function renderComposedCollisionSvg(
	source: LayeredRegionSource,
	overlays: readonly MapBlocker[]
): string {
	const out = [
		...header(source, 'composed collision (village + overlays)'),
		...paintLayer(
			source,
			source.layers.collision,
			Object.fromEntries(glyphsIn(source.layers.collision).map((g) => [g, COLLISION_FILL]))
		)
	];
	for (const blocker of overlays) {
		for (const { col, row } of tileCoverage(blocker, source)) {
			out.push(cell(col, row, OVERLAY_FILL, 0.85));
		}
	}
	return [...out, ...footer(source, ['village', 'overlay'])].join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/game/content/maps/layered/preview.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Write the CLI**

Create `tools/preview-layered-region.ts`:

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
	renderComposedCollisionSvg,
	renderLayeredPreviews
} from '$lib/game/content/maps/layered/preview';
import { pathsRegion } from '$lib/game/content/maps/regions/paths';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';

const outDir = join(process.cwd(), 'docs/superpowers/reports/img/hpa-238');
mkdirSync(outDir, { recursive: true });

const files = new Map(renderLayeredPreviews(sundropVillageLayered));
files.set(
	'village-composed-collision.svg',
	renderComposedCollisionSvg(sundropVillageLayered, pathsRegion.blockers ?? [])
);

for (const [name, content] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
	writeFileSync(join(outDir, name), content, 'utf8');
	console.log(`wrote ${name}`);
}
```

- [ ] **Step 6: Wire the script**

In `package.json`, add to `scripts` after `"preview"`:

```json
"preview:village": "bun tools/preview-layered-region.ts",
```

- [ ] **Step 7: Run the CLI and confirm output**

Run: `bun run preview:village`
Expected: seven `wrote …` lines. Then confirm re-running changes nothing:

```bash
bun run preview:village && git status --short docs/superpowers/reports/img/hpa-238
```

Expected: files listed as untracked on the first run; after `git add`, a second run leaves the tree clean — proving determinism on disk, not just in memory.

- [ ] **Step 8: Commit**

```bash
git add src/lib/game/content/maps/layered/preview.ts src/lib/game/content/maps/layered/preview.test.ts tools/preview-layered-region.ts package.json docs/superpowers/reports/img/hpa-238
git commit -m "feat(maps): composed-collision preview and preview:village CLI"
```

---

### Task 3: Pure geometry helpers

**Files:**
- Create: `src/lib/game/content/maps/layered/geometry.ts`
- Test: `src/lib/game/content/maps/layered/geometry.test.ts`

**Interfaces:**
- Produces: `type Solid = (col: number, row: number) => boolean`; `roomAdjacency(regions, collision, glyphs): Set<string>`; `maximalRun(solid, col, row, axis): number`; `bfsPath(start, goal, walkable, dims): Array<{col,row}> | null`; `perpendicularRun(path, index, walkable, dims): number`; `footprintTiles(centreCol, centreRow, widthPx, heightPx, padPx, tileSize): Array<{col,row}>`.

Tested on synthetic fixtures, never on the village — a helper that only works on one map is not a helper.

- [ ] **Step 1: Write the failing test**

Create `src/lib/game/content/maps/layered/geometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
	bfsPath,
	footprintTiles,
	maximalRun,
	perpendicularRun,
	roomAdjacency
} from '$lib/game/content/maps/layered/geometry';

const solidFrom = (rows: readonly string[]) => (col: number, row: number) =>
	rows[row]?.[col] === '#';
const walkableFrom = (rows: readonly string[]) => (col: number, row: number) =>
	rows[row]?.[col] !== undefined && rows[row][col] !== '#';

describe('roomAdjacency', () => {
	it('reports two rooms adjacent only through an opening in their divider', () => {
		const regions = ['AAA.BBB', 'AAA.BBB', 'AAA.BBB'];
		const sealed = ['...#...', '...#...', '...#...'];
		const pierced = ['...#...', '.......', '...#...'];
		expect(roomAdjacency(regions, sealed, ['A', 'B'])).toEqual(new Set());
		expect(roomAdjacency(regions, pierced, ['A', 'B'])).toEqual(new Set(['A-B']));
	});

	it('does not route adjacency through a third room', () => {
		const regions = ['AAABBBCCC'];
		const collision = ['.........'];
		// A touches B, B touches C, but A must not be reported adjacent to C.
		expect(roomAdjacency(regions, collision, ['A', 'B', 'C'])).toEqual(
			new Set(['A-B', 'B-C'])
		);
	});
});

describe('maximalRun', () => {
	const rows = ['.###.', '..#..', '..#..'];
	it('measures the horizontal run through a cell', () => {
		expect(maximalRun(solidFrom(rows), 2, 0, 'horizontal', 5, 3)).toBe(3);
	});
	it('measures the vertical run through a cell', () => {
		expect(maximalRun(solidFrom(rows), 2, 0, 'vertical', 5, 3)).toBe(3);
	});
	it('reports 1 for an isolated solid cell', () => {
		expect(maximalRun(solidFrom(['#.']), 0, 0, 'horizontal', 2, 1)).toBe(1);
	});
});

describe('bfsPath and perpendicularRun', () => {
	const rows = ['.....', '.###.', '.....'];
	const dims = { width: 5, height: 3 };

	it('finds a route around an obstacle', () => {
		const path = bfsPath({ col: 0, row: 1 }, { col: 4, row: 1 }, walkableFrom(rows), dims);
		expect(path).not.toBeNull();
		expect(path![0]).toEqual({ col: 0, row: 1 });
		expect(path![path!.length - 1]).toEqual({ col: 4, row: 1 });
	});

	it('returns null when no route exists', () => {
		const sealed = ['..#..', '..#..', '..#..'];
		expect(bfsPath({ col: 0, row: 0 }, { col: 4, row: 0 }, walkableFrom(sealed), dims)).toBeNull();
	});

	it('measures the free cross-section perpendicular to travel', () => {
		const open = ['.....', '.....', '.....'];
		const path = bfsPath({ col: 0, row: 1 }, { col: 4, row: 1 }, walkableFrom(open), dims)!;
		// Travelling east along row 1, the perpendicular (vertical) free run is 3.
		expect(perpendicularRun(path, 2, walkableFrom(open), dims)).toBe(3);
	});
});

describe('footprintTiles', () => {
	it('covers the tiles a centred rect occupies, including padding', () => {
		// 32px rect centred on tile (5,5), no padding => exactly that tile.
		expect(footprintTiles(5, 5, 32, 32, 0, 32)).toEqual([{ col: 5, row: 5 }]);
	});

	it('expands by the padding radius', () => {
		const tiles = footprintTiles(5, 5, 32, 32, 12, 32);
		expect(tiles).toContainEqual({ col: 4, row: 5 });
		expect(tiles).toContainEqual({ col: 6, row: 5 });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/game/content/maps/layered/geometry.test.ts`
Expected: FAIL — cannot resolve `.../layered/geometry`.

- [ ] **Step 3: Write the helpers**

Create `src/lib/game/content/maps/layered/geometry.ts`:

```ts
export type Solid = (col: number, row: number) => boolean;
export type Walkable = (col: number, row: number) => boolean;
export interface Cell {
	readonly col: number;
	readonly row: number;
}
export interface Dims {
	readonly width: number;
	readonly height: number;
}

const STEPS: ReadonlyArray<readonly [number, number]> = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
];

/**
 * Rooms A and B are adjacent iff a walkable A-cell is 4-connected to a
 * walkable B-cell through cells labelled only A, B, or nothing. Restricting
 * the flood to the pair is what stops adjacency leaking through a third room
 * and collapsing the graph into a star.
 */
export function roomAdjacency(
	regions: readonly string[],
	collision: readonly string[],
	glyphs: readonly string[]
): Set<string> {
	const height = regions.length;
	const width = regions[0]?.length ?? 0;
	const walkable = (col: number, row: number) =>
		row >= 0 && row < height && col >= 0 && col < width && collision[row][col] === '.';
	const found = new Set<string>();

	for (let i = 0; i < glyphs.length; i++) {
		for (let j = i + 1; j < glyphs.length; j++) {
			const a = glyphs[i];
			const b = glyphs[j];
			const seen = new Set<string>();
			const queue: Cell[] = [];
			for (let row = 0; row < height; row++) {
				for (let col = 0; col < width; col++) {
					if (regions[row][col] === a && walkable(col, row)) {
						queue.push({ col, row });
						seen.add(`${col}:${row}`);
					}
				}
			}
			let hit = false;
			while (queue.length > 0 && !hit) {
				const { col, row } = queue.shift()!;
				for (const [dc, dr] of STEPS) {
					const nc = col + dc;
					const nr = row + dr;
					if (!walkable(nc, nr) || seen.has(`${nc}:${nr}`)) continue;
					const glyph = regions[nr][nc];
					if (glyph === b) {
						hit = true;
						break;
					}
					if (glyph === a || glyph === '.') {
						seen.add(`${nc}:${nr}`);
						queue.push({ col: nc, row: nr });
					}
				}
			}
			if (hit) found.add([a, b].sort().join('-'));
		}
	}
	return found;
}

/** Length of the maximal unbroken solid run through (col,row) along one axis. */
export function maximalRun(
	solid: Solid,
	col: number,
	row: number,
	axis: 'horizontal' | 'vertical',
	width: number,
	height: number
): number {
	if (!solid(col, row)) return 0;
	const [dc, dr] = axis === 'horizontal' ? [1, 0] : [0, 1];
	let length = 1;
	for (let k = 1; ; k++) {
		const c = col + dc * k;
		const r = row + dr * k;
		if (c < 0 || r < 0 || c >= width || r >= height || !solid(c, r)) break;
		length++;
	}
	for (let k = 1; ; k++) {
		const c = col - dc * k;
		const r = row - dr * k;
		if (c < 0 || r < 0 || c >= width || r >= height || !solid(c, r)) break;
		length++;
	}
	return length;
}

export function bfsPath(
	start: Cell,
	goal: Cell,
	walkable: Walkable,
	dims: Dims
): Cell[] | null {
	const key = (c: Cell) => `${c.col}:${c.row}`;
	if (!walkable(start.col, start.row) || !walkable(goal.col, goal.row)) return null;
	const prev = new Map<string, string>();
	const seen = new Set<string>([key(start)]);
	const queue: Cell[] = [start];
	while (queue.length > 0) {
		const current = queue.shift()!;
		if (current.col === goal.col && current.row === goal.row) {
			const path: Cell[] = [];
			let node: string | undefined = key(current);
			while (node) {
				const [c, r] = node.split(':');
				path.unshift({ col: Number(c), row: Number(r) });
				node = prev.get(node);
			}
			return path;
		}
		for (const [dc, dr] of STEPS) {
			const next = { col: current.col + dc, row: current.row + dr };
			if (
				next.col < 0 ||
				next.row < 0 ||
				next.col >= dims.width ||
				next.row >= dims.height ||
				!walkable(next.col, next.row) ||
				seen.has(key(next))
			) {
				continue;
			}
			seen.add(key(next));
			prev.set(key(next), key(current));
			queue.push(next);
		}
	}
	return null;
}

/**
 * Free cross-section at path[index], measured perpendicular to the local
 * direction of travel. This is the operative definition of "route width":
 * a 3-wide corridor stays 3 however long it runs.
 */
export function perpendicularRun(
	path: readonly Cell[],
	index: number,
	walkable: Walkable,
	dims: Dims
): number {
	const here = path[index];
	const other = path[index + 1] ?? path[index - 1] ?? here;
	const travelHorizontal = other.col !== here.col;
	const [dc, dr] = travelHorizontal ? [0, 1] : [1, 0];
	let run = 1;
	for (const sign of [1, -1]) {
		for (let k = 1; ; k++) {
			const c = here.col + dc * k * sign;
			const r = here.row + dr * k * sign;
			if (c < 0 || r < 0 || c >= dims.width || r >= dims.height || !walkable(c, r)) break;
			run++;
		}
	}
	return run;
}

/**
 * Tiles covered by a rect centred on a tile centre and expanded by `padPx`.
 * Used to check that a building footprint clears an opening — WorldScene
 * blocks movement against landmark rects padded by its player radius.
 */
export function footprintTiles(
	centreCol: number,
	centreRow: number,
	widthPx: number,
	heightPx: number,
	padPx: number,
	tileSize: number
): Cell[] {
	const cx = centreCol * tileSize + tileSize / 2;
	const cy = centreRow * tileSize + tileSize / 2;
	const left = cx - widthPx / 2 - padPx;
	const right = cx + widthPx / 2 + padPx;
	const top = cy - heightPx / 2 - padPx;
	const bottom = cy + heightPx / 2 + padPx;
	const out: Cell[] = [];
	for (let row = Math.floor(top / tileSize); row <= Math.floor((bottom - 1) / tileSize); row++) {
		for (let col = Math.floor(left / tileSize); col <= Math.floor((right - 1) / tileSize); col++) {
			if (col >= 0 && row >= 0) out.push({ col, row });
		}
	}
	return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/game/content/maps/layered/geometry.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/content/maps/layered/geometry.ts src/lib/game/content/maps/layered/geometry.test.ts
git commit -m "feat(maps): pure grid geometry helpers for the layered design contract"
```

---

### Task 4: Re-author the blockout

**Files:**
- Modify: `src/lib/game/content/maps/regions/village-layered.ts`
- Modify: `src/lib/game/content/maps/regions/village-layered.test.ts` (glyph constants only)

**Interfaces:**
- Consumes: nothing from earlier tasks at runtime; uses Task 2's CLI for review.
- Produces: `regions` layer containing `G`; all objects and decor on walkable cells of their owning room.

This task delivers a map that **compiles and traverses**. Composition is phases 4–6.

- [ ] **Step 1: Generate the layers**

Write the generator to the scratchpad (it is throwaway; the committed artifact is the literal strings it prints). Save as `scratchpad/gen-blockout.ts`:

```ts
const W = 56, H = 48;
const SHELL = { c0: 2, c1: 52, r0: 2, r1: 44 };
const ROOMS: Record<string, { c: [number, number]; r: [number, number] }> = {
	C: { c: [38, 48], r: [0, 1] },  E: { c: [36, 50], r: [3, 9] },
	G: { c: [36, 48], r: [11, 18] }, N: { c: [14, 34], r: [8, 18] },
	M: { c: [5, 18], r: [20, 31] },  P: { c: [20, 33], r: [20, 31] },
	H: { c: [6, 22], r: [33, 43] },  S: { c: [24, 44], r: [33, 43] }
};
const EDGES: Array<[string, string, number, number, number, number]> = [
	['H','P',20,22,32,32], ['P','N',26,28,19,19], ['N','G',35,35,14,16],
	['G','E',42,44,10,10], ['E','C',40,42,2,2],   ['H','M',8,9,32,32],
	['P','M',19,19,25,27], ['P','S',30,31,32,32], ['H','S',23,23,36,37]
];
const openings = new Set<string>();
for (const [, , c0, c1, r0, r1] of EDGES)
	for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) openings.add(`${c}:${r}`);

const roomAt = (c: number, r: number) =>
	Object.entries(ROOMS).find(([, x]) => c >= x.c[0] && c <= x.c[1] && r >= x.r[0] && r <= x.r[1])?.[0] ?? '.';
const outsideShell = (c: number, r: number) =>
	c < SHELL.c0 || c > SHELL.c1 || r < SHELL.r0 || r > SHELL.r1;
// Outside the shell is ungoverned meadow, so it stays walkable; inside, a cell
// is solid unless it belongs to a room or pierces a divider as an opening.
const isSolid = (c: number, r: number) =>
	!outsideShell(c, r) && roomAt(c, r) === '.' && !openings.has(`${c}:${r}`);

const regions: string[] = [], collision: string[] = [];
for (let r = 0; r < H; r++) {
	let rg = '', cl = '';
	for (let c = 0; c < W; c++) { rg += roomAt(c, r); cl += isSolid(c, r) ? '#' : '.'; }
	regions.push(rg); collision.push(cl);
}
const emit = (name: string, rows: string[]) =>
	console.log(`\n${name}: [\n${rows.map((r) => `\t\t\t\t'${r}'`).join(',\n')}\n\t\t\t],`);
emit('collision', collision);
emit('regions', regions);
```

Run: `bun scratchpad/gen-blockout.ts`

- [ ] **Step 2: Paste the layers into the source**

Replace the `collision:` and `regions:` arrays in
`src/lib/game/content/maps/regions/village-layered.ts` with the generated output.
Leave `terrain`, `paths`, and `decorGlyphTable` untouched.

- [ ] **Step 3: Relocate stranded objects**

`compileLayeredRegion` throws when a landmark, transition, pickup, or NPC sits on a
collision glyph. Set these `col`/`row` values, which place each object on a walkable cell
of its owning room per the spec's ownership table:

| Object | col | row | Room |
| --- | --- | --- | --- |
| `hero-house-exterior` | 11 | 38 | H |
| `meadow-to-hero-house` | 11 | 42 | H |
| `item-shop-exterior` | 10 | 24 | M |
| `meadow-to-item-shop` | 10 | 28 | M |
| `blacksmith` | 9 | 29 | M |
| `village-market-cache` | 6 | 21 | M |
| `village-woodcutter` | 13 | 26 | M |
| `sundrop-well` | 26 | 25 | P |
| `village-wanderer` | 23 | 28 | P |
| `villager-house-1-exterior` | 18 | 12 | N |
| `meadow-to-villager-house-1` | 18 | 16 | N |
| `villager-house-2-exterior` | 28 | 12 | N |
| `meadow-to-villager-house-2` | 28 | 16 | N |
| `guild-hall-exterior` | 42 | 14 | G |
| `meadow-to-guild-hall` | 42 | 17 | G |
| `shrine-of-aurora` | 36 | 38 | S |
| `meadow-to-shrine-of-aurora` | 36 | 42 | S |
| `villager-house-3-exterior` | 27 | 37 | S |
| `meadow-to-villager-house-3` | 27 | 41 | S |
| `village-shrine-cache` | 43 | 43 | S |
| `village-pilgrim` | 31 | 40 | S |
| `village-crier` | 39 | 7 | E |

- [ ] **Step 4: Relocate stranded decor**

Four decor glyphs land on newly-solid cells. In the `decor` layer, clear each old
position and set the new one:

| Glyph | Old | New | Room |
| --- | --- | --- | --- |
| `A` gateArch | (44, 2) | (41, 4) | E |
| `l` poleLantern | (47, 2) | (40, 6) | E |
| `h` hangingLantern | (23, 19) | (27, 22) | P |
| `s` scarecrow | (3, 37) | (8, 35) | H |

- [ ] **Step 5: Add `G` to the four hard-coded glyph lists**

In `src/lib/game/content/maps/regions/village-layered.test.ts`, replace the four
duplicated room sets with shared constants declared once near the top:

```ts
const ROOM_GLYPHS = ['H', 'P', 'M', 'N', 'G', 'S', 'E', 'C'] as const;
const CRITICAL_ROUTE_GLYPHS = ['H', 'P', 'N', 'G', 'E', 'C'] as const;
```

Then use them at each site:
- line ~59 `MAIN_ROUTE_REGIONS` → `new Set(CRITICAL_ROUTE_GLYPHS)`
- line ~138 `it.each([...])` → `it.each(ROOM_GLYPHS)`
- line ~149 connectivity targets → `ROOM_GLYPHS.filter((g) => g !== 'H')`
- line ~183 `regionGlyphs` → `new Set(ROOM_GLYPHS)`

- [ ] **Step 6: Verify it compiles and existing tests pass**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/village-layered.test.ts`
Expected: PASS. A throw naming a specific object or decor glyph means a coordinate in
step 3 or 4 is wrong — fix the coordinate, never the compiler.

- [ ] **Step 7: Regenerate previews and review**

```bash
bun run preview:village
```

Open `docs/superpowers/reports/img/hpa-238/village-designer-muted.svg`.
**This is the Phase 3 review gate.** Judge: does the village read as rooms without paths?
Is each room's silhouette distinct? Are there one-tile squeezes?

Known issue to raise at this gate: the generator makes every non-room cell solid, so
rows 3–7 × cols 2–35 is a single 34×5 wall mass, and walkable area drops from 2434 to
~1216 tiles. That is a legitimate blockout skeleton but not a finished silhouette —
decide here whether to carve interior detail now or defer it to the decor pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/game/content/maps/regions/village-layered.ts src/lib/game/content/maps/regions/village-layered.test.ts docs/superpowers/reports/img/hpa-238
git commit -m "feat(maps): re-author Sundrop Village region and collision blockout"
```

---

### Task 5: Wave A design contract

**Files:**
- Modify: `src/lib/game/content/maps/regions/village-layered.test.ts`

**Interfaces:**
- Consumes: Task 3's `roomAdjacency`, `maximalRun`, `bfsPath`, `perpendicularRun`, `footprintTiles`; Task 2's `tileCoverage`.

Every assertion should pass against Task 4's blockout. Any that fails is a defect in the
map, not in the test — fix the layer.

- [ ] **Step 1: Write the Wave A tests**

Add to `src/lib/game/content/maps/regions/village-layered.test.ts`. **The `import`
statements go at the top of the file with the existing imports** — only the `describe`
block and its helper consts are appended. `ROOM_GLYPHS` and `CRITICAL_ROUTE_GLYPHS` come
from Task 4 step 5 and are already in this file.

```ts
import {
	bfsPath,
	footprintTiles,
	maximalRun,
	perpendicularRun,
	roomAdjacency
} from '$lib/game/content/maps/layered/geometry';
import { tileCoverage } from '$lib/game/content/maps/layered/preview';
import { pathsRegion } from '$lib/game/content/maps/regions/paths';

const V = sundropVillageLayered;
const DIMS = { width: V.width, height: V.height };
const PLAYER_RADIUS = 12;

const EXPECTED_EDGES = new Set([
	'H-P', 'H-M', 'H-S', 'M-P', 'N-P', 'P-S', 'G-N', 'E-G', 'C-E'
]);

const OPENINGS: Array<{ edge: string; cells: Array<{ col: number; row: number }>; critical: boolean }> = [
	{ edge: 'H-P', cells: cellsIn(20, 22, 32, 32), critical: true },
	{ edge: 'N-P', cells: cellsIn(26, 28, 19, 19), critical: true },
	{ edge: 'G-N', cells: cellsIn(35, 35, 14, 16), critical: true },
	{ edge: 'E-G', cells: cellsIn(42, 44, 10, 10), critical: true },
	{ edge: 'C-E', cells: cellsIn(40, 42, 2, 2), critical: true },
	{ edge: 'H-M', cells: cellsIn(8, 9, 32, 32), critical: false },
	{ edge: 'M-P', cells: cellsIn(19, 19, 25, 27), critical: false },
	{ edge: 'P-S', cells: cellsIn(30, 31, 32, 32), critical: false },
	{ edge: 'H-S', cells: cellsIn(23, 23, 36, 37), critical: false }
];

function cellsIn(c0: number, c1: number, r0: number, r1: number) {
	const out: Array<{ col: number; row: number }> = [];
	for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) out.push({ col: c, row: r });
	return out;
}

const isWalkable = (col: number, row: number) =>
	row >= 0 && row < V.height && col >= 0 && col < V.width && V.layers.collision[row][col] === '.';
const isSolidCell = (col: number, row: number) =>
	row >= 0 && row < V.height && col >= 0 && col < V.width && V.layers.collision[row][col] !== '.';

function roomCentroid(glyph: string) {
	const cells: Array<{ col: number; row: number }> = [];
	for (let r = 0; r < V.height; r++)
		for (let c = 0; c < V.width; c++)
			if (V.layers.regions[r][c] === glyph && isWalkable(c, r)) cells.push({ col: c, row: r });
	const col = Math.round(cells.reduce((s, x) => s + x.col, 0) / cells.length);
	const row = Math.round(cells.reduce((s, x) => s + x.row, 0) / cells.length);
	return cells.find((x) => x.col === col && x.row === row) ?? cells[0];
}

const CRITICAL_ROUTE_CELLS = (() => {
	const set = new Set<string>();
	for (let r = 0; r < V.height; r++)
		for (let c = 0; c < V.width; c++)
			if (
				(CRITICAL_ROUTE_GLYPHS as readonly string[]).includes(V.layers.regions[r][c]) &&
				isWalkable(c, r)
			)
				set.add(`${c}:${r}`);
	for (const opening of OPENINGS)
		if (opening.critical) for (const cell of opening.cells) set.add(`${cell.col}:${cell.row}`);
	return set;
})();

describe('Wave A — spatial design contract', () => {
	it('A1: room adjacency graph equals the intended edge set exactly', () => {
		expect(roomAdjacency(V.layers.regions, V.layers.collision, [...ROOM_GLYPHS])).toEqual(
			EXPECTED_EDGES
		);
	});

	it.each(OPENINGS)('A2: opening $edge meets its width class', ({ cells, critical }) => {
		const walkable = cells.filter((c) => isWalkable(c.col, c.row));
		expect(walkable.length).toBeGreaterThanOrEqual(critical ? 3 : 2);
	});

	it('A3: no critical-route cell is narrower than 3 tiles', () => {
		const path = bfsPath(roomCentroid('H'), roomCentroid('C'), isWalkable, DIMS);
		expect(path, 'no walkable route from H to C').not.toBeNull();
		for (let i = 0; i < path!.length; i++) {
			const width = perpendicularRun(path!, i, isWalkable, DIMS);
			expect(
				width,
				`route cell (${path![i].col},${path![i].row}) is only ${width} tiles wide`
			).toBeGreaterThanOrEqual(3);
		}
	});

	it('A4: every collision run is at least 3 tiles along one axis', () => {
		for (let r = 0; r < V.height; r++) {
			for (let c = 0; c < V.width; c++) {
				if (!isSolidCell(c, r)) continue;
				const longest = Math.max(
					maximalRun(isSolidCell, c, r, 'horizontal', V.width, V.height),
					maximalRun(isSolidCell, c, r, 'vertical', V.width, V.height)
				);
				expect(longest, `collision fragment at (${c},${r})`).toBeGreaterThanOrEqual(3);
			}
		}
	});

	it('A5: every walkable cell is reachable from the Home Yard', () => {
		const start = roomCentroid('H');
		const seen = new Set<string>([`${start.col}:${start.row}`]);
		const queue = [start];
		while (queue.length > 0) {
			const { col, row } = queue.shift()!;
			for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
				const next = { col: col + dc, row: row + dr };
				if (!isWalkable(next.col, next.row) || seen.has(`${next.col}:${next.row}`)) continue;
				seen.add(`${next.col}:${next.row}`);
				queue.push(next);
			}
		}
		for (let r = 0; r < V.height; r++)
			for (let c = 0; c < V.width; c++)
				if (isWalkable(c, r))
					expect(seen.has(`${c}:${r}`), `(${c},${r}) is an unreachable pocket`).toBe(true);
	});

	it('A6: exclusion zones owned by paths.ts are empty in the village source', () => {
		for (let c = 44; c <= 50; c++)
			for (let r = 3; r <= 5; r++)
				expect(isSolidCell(c, r), `village wall at (${c},${r}) fights corridor-wall-2b`).toBe(false);
		for (let c = 53; c <= 55; c++)
			expect(isSolidCell(c, 0), `village wall at (${c},0) fights corridor-wall-3b/5a`).toBe(false);
	});

	it('A7: the critical route survives composition with paths.ts walls', () => {
		const blocked = new Set<string>();
		for (const blocker of pathsRegion.blockers ?? [])
			for (const { col, row } of tileCoverage(blocker, V)) blocked.add(`${col}:${row}`);
		const composed = (col: number, row: number) =>
			isWalkable(col, row) && !blocked.has(`${col}:${row}`);
		const path = bfsPath(roomCentroid('H'), roomCentroid('C'), composed, DIMS);
		expect(path, 'E does not reach C once external walls are composed in').not.toBeNull();
		for (let i = 0; i < path!.length; i++) {
			const width = perpendicularRun(path!, i, composed, DIMS);
			expect(
				width,
				`composed route cell (${path![i].col},${path![i].row}) is only ${width} tiles wide`
			).toBeGreaterThanOrEqual(3);
		}
	});

	it('A8: the west and shrine loops exist and are distinct', () => {
		const withoutPlaza = (col: number, row: number) =>
			isWalkable(col, row) && V.layers.regions[row][col] !== 'P';
		// H reaches M and S without passing through the plaza, so each pocket
		// has a second way in — that is what makes them loops, not dead ends.
		expect(bfsPath(roomCentroid('H'), roomCentroid('M'), withoutPlaza, DIMS)).not.toBeNull();
		expect(bfsPath(roomCentroid('H'), roomCentroid('S'), withoutPlaza, DIMS)).not.toBeNull();
		const withoutHome = (col: number, row: number) =>
			isWalkable(col, row) && V.layers.regions[row][col] !== 'H';
		expect(bfsPath(roomCentroid('P'), roomCentroid('M'), withoutHome, DIMS)).not.toBeNull();
		expect(bfsPath(roomCentroid('P'), roomCentroid('S'), withoutHome, DIMS)).not.toBeNull();
	});

	it('A9: every object and decor glyph sits on a walkable cell', () => {
		const objects = [
			...(V.objects.landmarks ?? []).map((o) => ({ id: o.id, col: o.col, row: o.row })),
			...(V.objects.transitions ?? []).map((o) => ({ id: o.id, col: o.col, row: o.row })),
			...(V.objects.pickups ?? []).map((o) => ({ id: o.id, col: o.col, row: o.row })),
			...(V.objects.ambientNpcs ?? []).map((o) => ({ id: o.id, col: o.col, row: o.row }))
		];
		for (const o of objects)
			expect(isWalkable(o.col, o.row), `${o.id} at (${o.col},${o.row}) is on collision`).toBe(true);
		for (let r = 0; r < V.height; r++)
			for (let c = 0; c < V.width; c++)
				if (V.layers.decor[r][c] !== '.')
					expect(isWalkable(c, r), `decor '${V.layers.decor[r][c]}' at (${c},${r})`).toBe(true);
	});

	it('A10: no padded object footprint intrudes on an opening or the critical route', () => {
		const protectedCells = new Set(CRITICAL_ROUTE_CELLS);
		for (const opening of OPENINGS)
			for (const cell of opening.cells) protectedCells.add(`${cell.col}:${cell.row}`);

		for (const landmark of V.objects.landmarks ?? []) {
			for (const { col, row } of footprintTiles(
				landmark.col, landmark.row, landmark.width, landmark.height, PLAYER_RADIUS, V.tileSize
			)) {
				expect(
					protectedCells.has(`${col}:${row}`),
					`${landmark.id} footprint covers protected cell (${col},${row})`
				).toBe(false);
			}
		}

		for (let r = 0; r < V.height; r++) {
			for (let c = 0; c < V.width; c++) {
				const glyph = V.layers.decor[r][c];
				const spec = glyph === '.' ? undefined : V.decorGlyphTable[glyph];
				if (!spec?.collision) continue;
				for (const { col, row } of footprintTiles(
					c, r, spec.collision.width, spec.collision.height, PLAYER_RADIUS, V.tileSize
				)) {
					expect(
						protectedCells.has(`${col}:${row}`),
						`decor '${glyph}' at (${c},${r}) blocks protected cell (${col},${row})`
					).toBe(false);
				}
			}
		}
	});
});
```

- [ ] **Step 2: Run the contract**

Run: `bun run test:unit -- --run src/lib/game/content/maps/regions/village-layered.test.ts`
Expected: PASS. Each failure names the offending cell or object.

**A10 is expected to fail on the first run.** `shrine-of-aurora` is ~7.7×10.4 tiles and
`S` is 11 rows tall, so its footprint is genuinely hard to place. Move the landmark within
its room until it clears; do not relax the test.

- [ ] **Step 3: Full validation**

```bash
bun run check
bun run lint
bun run test:unit -- --run
```

Expected: all pass. `bun run lint` failing on formatting is fixed with `bun run format`.

- [ ] **Step 4: Regenerate previews and commit**

```bash
bun run preview:village
git add src/lib/game/content/maps/regions/village-layered.test.ts src/lib/game/content/maps/regions/village-layered.ts docs/superpowers/reports/img/hpa-238
git commit -m "test(maps): Wave A spatial design contract for Sundrop Village"
```

---

## Out of scope

Phases 4–8 and the Wave B tests (`p` coverage ≤12%, no 5×5 `p` block, floor containment,
transition clearance, object reachability, landmark overlap) are deliberately excluded.
The `paths` layer keeps its current content throughout this plan, so intermediate previews
will disagree with the new rooms — judge the blockout against
`village-designer-muted.svg`, which mutes paths to 0.12 opacity for exactly this reason.
