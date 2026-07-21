import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
import { compileLayeredRegion } from '$lib/game/content/maps/layered/compile-layered-region';
import {
	bfsPath,
	maximalRun,
	perpendicularRun,
	roomAdjacency,
	type Cell
} from '$lib/game/content/maps/layered/geometry';
import { tileCoverage } from '$lib/game/content/maps/layered/preview';
import { pathsRegion } from '$lib/game/content/maps/regions/paths';
import { meadowEntryMap } from '$lib/game/content/maps';
import {
	collectLandmarkRects,
	collectStrictCollisionRects,
	isInsideAnyCollisionRect
} from '$lib/game/save/save-state';

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
		for (const [dc, dr] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) {
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

// --- Ported invariants from village-layout.test.ts (spec §5 Gap D) ---

const ROOM_GLYPHS = ['H', 'P', 'M', 'N', 'G', 'S', 'E', 'C'] as const;
const CRITICAL_ROUTE_GLYPHS = ['H', 'P', 'N', 'G', 'E', 'C'] as const;

const MAIN_ROUTE_REGIONS = new Set<string>(CRITICAL_ROUTE_GLYPHS);

function mainRoutePathTiles(src = sundropVillageLayered): Set<string> {
	const walkable = walkableCells(src);
	const tiles = new Set<string>();
	for (let row = 0; row < src.height; row++) {
		for (let col = 0; col < src.width; col++) {
			const region = src.layers.regions[row][col];
			const path = src.layers.paths[row][col];
			if (MAIN_ROUTE_REGIONS.has(region) && path !== '.' && walkable.has(`${col}:${row}`)) {
				tiles.add(`${col}:${row}`);
			}
		}
	}
	return tiles;
}

function bfsDistanceToNearest(start: string, walkable: Set<string>, targets: Set<string>): number {
	if (targets.has(start)) return 0;
	const seen = new Set<string>([start]);
	const queue: Array<{ cell: string; dist: number }> = [{ cell: start, dist: 0 }];
	while (queue.length) {
		const { cell, dist } = queue.shift()!;
		const [colStr, rowStr] = cell.split(':');
		const col = Number(colStr);
		const row = Number(rowStr);
		for (const [dc, dr] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) {
			const next = `${col + dc}:${row + dr}`;
			if (!walkable.has(next) || seen.has(next)) continue;
			seen.add(next);
			if (targets.has(next)) return dist + 1;
			queue.push({ cell: next, dist: dist + 1 });
		}
	}
	return Number.POSITIVE_INFINITY;
}

function nearestCollisionDistance(col: number, row: number, src = sundropVillageLayered): number {
	let best = Number.POSITIVE_INFINITY;
	for (let r = 0; r < src.height; r++) {
		const line = src.layers.collision[r];
		for (let c = 0; c < src.width; c++) {
			if (line[c] !== '.') {
				const dist = Math.max(Math.abs(c - col), Math.abs(r - row));
				if (dist < best) best = dist;
			}
		}
	}
	return best;
}

function nearestLandmarkDistance(col: number, row: number, src = sundropVillageLayered): number {
	let best = Number.POSITIVE_INFINITY;
	for (const lm of src.objects.landmarks ?? []) {
		const halfW = lm.width / 2 / src.tileSize;
		const halfH = lm.height / 2 / src.tileSize;
		const dx = Math.max(Math.abs(col - lm.col) - halfW, 0);
		const dy = Math.max(Math.abs(row - lm.row) - halfH, 0);
		const dist = Math.max(dx, dy);
		if (dist < best) best = dist;
	}
	return best;
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

	it.each(ROOM_GLYPHS)('regions layer contains glyph %s', (glyph) => {
		expect(sundropVillageLayered.layers.regions.some((r) => r.includes(glyph))).toBe(true);
	});

	it('connects H by walkable path to P, M, N, S, E, C', () => {
		const walkable = walkableCells();
		const start = firstGlyphCell('H', 'regions');
		const reachable = bfsReachable(`${start.col}:${start.row}`, walkable);
		for (const glyph of ROOM_GLYPHS.filter((g) => g !== 'H')) {
			const target = firstGlyphCell(glyph, 'regions');
			expect(reachable.has(`${target.col}:${target.row}`), `H not connected to ${glyph}`).toBe(
				true
			);
		}
	});

	it('keeps village-market-cache inside the market region', () => {
		const cache = sundropVillageLayered.objects.pickups!.find(
			(p) => p.id === 'village-market-cache'
		)!;
		expect(sundropVillageLayered.layers.regions[cache.row][cache.col]).toBe('M');
	});

	it('keeps village-shrine-cache inside the shrine region', () => {
		const cache = sundropVillageLayered.objects.pickups!.find(
			(p) => p.id === 'village-shrine-cache'
		)!;
		expect(sundropVillageLayered.layers.regions[cache.row][cache.col]).toBe('S');
	});

	it('places every transition, pickup, and ambient npc on a region glyph or a path tile', () => {
		const all = [
			...(sundropVillageLayered.objects.transitions ?? []).map((o) => ({
				...o,
				kind: 'transition'
			})),
			...(sundropVillageLayered.objects.pickups ?? []).map((o) => ({ ...o, kind: 'pickup' })),
			...(sundropVillageLayered.objects.ambientNpcs ?? []).map((o) => ({
				...o,
				kind: 'ambient'
			}))
		];
		const regionGlyphs = new Set<string>(ROOM_GLYPHS);
		const pathGlyphs = new Set(['p', 'c', 'a', 's']);
		for (const obj of all) {
			const region = sundropVillageLayered.layers.regions[obj.row][obj.col];
			const path = sundropVillageLayered.layers.paths[obj.row][obj.col];
			const ok = regionGlyphs.has(region) || pathGlyphs.has(path);
			expect(
				ok,
				`${obj.kind} ${obj.id} at (${obj.col},${obj.row}) not on a region or path tile`
			).toBe(true);
		}
	});

	it('compiles deterministically', () => {
		const a = JSON.stringify(compileLayeredRegion(sundropVillageLayered));
		const b = JSON.stringify(compileLayeredRegion(sundropVillageLayered));
		expect(a).toBe(b);
	});

	it('village.ts has no hand-authored blockers/groundPatches/mapDecor literals', () => {
		const villageSourcePath = fileURLToPath(new URL('./village.ts', import.meta.url));
		const raw = readFileSync(villageSourcePath, 'utf8');
		// Strip comments so words like "blockers:" in a comment don't
		// trip the guard — we only care about actual object-literal keys.
		const source = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
		expect(source, 'village.ts must compile from the layered source').not.toMatch(/\bblockers\s*:/);
		expect(source).not.toMatch(/\bgroundPatches\s*:/);
		expect(source).not.toMatch(/\bmapDecor\s*:/);
		expect(source).not.toMatch(/\blandmarks\s*:/);
		expect(source).not.toMatch(/\btransitions\s*:/);
		expect(source).not.toMatch(/\bpickups\s*:/);
		expect(source).not.toMatch(/\bambientNpcs\s*:/);
	});

	// Ported from village-layout.test.ts — spec §5 Gap D requires these two
	// durable invariants be re-expressed in grid terms and asserted here.

	it('keeps village caches off the main route (walkable distance ≥ 5 tiles)', () => {
		const walkable = walkableCells();
		const routeTiles = mainRoutePathTiles();
		const caches = sundropVillageLayered.objects.pickups!.filter(
			(p) => p.id === 'village-market-cache' || p.id === 'village-shrine-cache'
		);
		expect(caches).toHaveLength(2);
		for (const cache of caches) {
			const dist = bfsDistanceToNearest(`${cache.col}:${cache.row}`, walkable, routeTiles);
			expect(
				dist,
				`${cache.id} at (${cache.col},${cache.row}) is only ${dist} walkable tiles from the main route`
			).toBeGreaterThanOrEqual(5);
		}
	});

	it('flanks the main route with visible solids within 10 tiles (320px)', () => {
		const routeTiles = mainRoutePathTiles();
		expect(routeTiles.size, 'main route should have path tiles').toBeGreaterThan(0);
		for (const cell of routeTiles) {
			const [colStr, rowStr] = cell.split(':');
			const col = Number(colStr);
			const row = Number(rowStr);
			const collisionDist = nearestCollisionDistance(col, row);
			const landmarkDist = nearestLandmarkDistance(col, row);
			const nearest = Math.min(collisionDist, landmarkDist);
			expect(
				nearest,
				`route tile (${col},${row}) has no visible solid within 10 tiles`
			).toBeLessThanOrEqual(10);
		}
	});
});

// --- Wave A design contract (HPA-238) --------------------------------------
// The geometric invariants the redesign must hold. Every assertion reads the
// committed layered source and the compiled meadowEntryMap without mutating
// either. The map is final: a red bar here is a real map defect (or a
// transcription error in a constant below), never license to loosen the check.

const V = sundropVillageLayered;
const DIMS = { width: V.width, height: V.height };
const PLAYER_RADIUS = 12;

// roomAdjacency emits sorted "a-b" edge keys. These nine are exactly the
// room-to-room connections the redesign requires — no more, no fewer.
const EXPECTED_EDGES = ['C-E', 'E-G', 'G-N', 'H-M', 'H-P', 'H-S', 'M-P', 'N-P', 'P-S'];

function cellsIn(c0: number, c1: number, r0: number, r1: number): Cell[] {
	const out: Cell[] = [];
	for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) out.push({ col: c, row: r });
	return out;
}

// Openings derived mechanically from the committed collision layer. Critical
// gates sit on the H→C main route and need three walkable tiles; secondary
// gates need two. C and E meet directly — row 2 is C's own bottom row and row
// 3 is E's top row — so the C-E "opening" cells are room cells, not divider
// cells.
const OPENINGS: Array<{ edge: string; cells: Cell[]; critical: boolean }> = [
	{ edge: 'H-P', cells: cellsIn(21, 23, 32, 32), critical: true },
	{ edge: 'N-P', cells: cellsIn(26, 28, 19, 19), critical: true },
	{ edge: 'G-N', cells: cellsIn(35, 35, 14, 16), critical: true },
	{ edge: 'E-G', cells: cellsIn(48, 50, 10, 10), critical: true },
	{ edge: 'C-E', cells: cellsIn(38, 48, 2, 2), critical: true },
	{ edge: 'H-M', cells: cellsIn(4, 5, 32, 32), critical: false },
	{ edge: 'M-P', cells: cellsIn(20, 20, 20, 22), critical: false },
	{ edge: 'P-S', cells: cellsIn(30, 31, 32, 32), critical: false },
	{ edge: 'H-S', cells: cellsIn(24, 24, 36, 37), critical: false }
];

const isWalkableTile = (col: number, row: number): boolean =>
	row >= 0 && row < V.height && col >= 0 && col < V.width && V.layers.collision[row][col] === '.';
const isSolidTile = (col: number, row: number): boolean =>
	row >= 0 && row < V.height && col >= 0 && col < V.width && V.layers.collision[row][col] !== '.';

function roomCentroid(glyph: string): Cell {
	const cells: Cell[] = [];
	for (let r = 0; r < V.height; r++)
		for (let c = 0; c < V.width; c++)
			if (V.layers.regions[r][c] === glyph && isWalkableTile(c, r)) cells.push({ col: c, row: r });
	const col = Math.round(cells.reduce((sum, cell) => sum + cell.col, 0) / cells.length);
	const row = Math.round(cells.reduce((sum, cell) => sum + cell.row, 0) / cells.length);
	return cells.find((cell) => cell.col === col && cell.row === row) ?? cells[0];
}

// The game's real standability rule, measured against the fully composed
// meadowEntryMap: a tile is standable iff its centre is not inside any
// collision or landmark rect padded by the player radius. This is the only
// predicate that sees building and decor rects — the collision layer
// (isWalkableTile) does not — so A10/A11 use it to catch a building that seals
// a room even though the layer looks fine.
const composedRects = [
	...collectStrictCollisionRects(meadowEntryMap),
	...collectLandmarkRects(meadowEntryMap)
];
const isStandableTile = (col: number, row: number): boolean =>
	col >= 0 &&
	row >= 0 &&
	col < V.width &&
	row < V.height &&
	!isInsideAnyCollisionRect(
		V.origin.x + col * V.tileSize + V.tileSize / 2,
		V.origin.y + row * V.tileSize + V.tileSize / 2,
		composedRects,
		PLAYER_RADIUS
	);

// A3 and A7 are the same route-width check under different walkability
// predicates (collision layer alone vs. collision layer minus the external
// corridor walls). One helper, called twice — identical assertions and
// threshold.
function assertMainRouteWidth(walkable: (col: number, row: number) => boolean): void {
	const route = bfsPath(roomCentroid('H'), roomCentroid('C'), walkable, DIMS);
	expect(route, 'no walkable H→C main route').not.toBeNull();
	const narrow = route!
		.filter((_, index) => perpendicularRun(route!, index, walkable, DIMS) < 3)
		.map((cell) => `(${cell.col},${cell.row})`);
	expect(narrow, 'main-route cells narrower than 3 tiles').toEqual([]);
}

describe('sundrop village — Wave A design contract', () => {
	it('A1 — room adjacency equals the nine authored edges exactly', () => {
		const edges = roomAdjacency(V.layers.regions, V.layers.collision, [...ROOM_GLYPHS]);
		expect([...edges].sort()).toEqual(EXPECTED_EDGES);
	});

	it.each(OPENINGS)('A2 — opening $edge meets its width class', ({ edge, cells, critical }) => {
		const width = cells.filter((cell) => isWalkableTile(cell.col, cell.row)).length;
		expect(width, `${edge} walkable width`).toBeGreaterThanOrEqual(critical ? 3 : 2);
	});

	it('A3 — no cell on the main route is narrower than 3 tiles', () => {
		assertMainRouteWidth(isWalkableTile);
	});

	it('A4 — every collision cell belongs to a run of at least 3 on one axis', () => {
		const fragments: string[] = [];
		for (let r = 0; r < V.height; r++)
			for (let c = 0; c < V.width; c++) {
				if (!isSolidTile(c, r)) continue;
				const longest = Math.max(
					maximalRun(isSolidTile, c, r, 'horizontal', V.width, V.height),
					maximalRun(isSolidTile, c, r, 'vertical', V.width, V.height)
				);
				if (longest < 3) fragments.push(`(${c},${r})=${longest}`);
			}
		expect(fragments, 'collision fragments shorter than 3 tiles').toEqual([]);
	});

	it('A5 — every walkable village cell is reachable from the Home Yard', () => {
		const walkable = walkableCells();
		const start = roomCentroid('H');
		const reachable = bfsReachable(`${start.col}:${start.row}`, walkable);
		// The layered source keeps a meadow margin outside the sealed shell
		// {c0:2,c1:52,r0:2,r1:46}; those cells are correctly unreachable now
		// that the perimeter is closed. Scope the check to village cells.
		const shell = { c0: 2, c1: 52, r0: 2, r1: 46 };
		const pockets: string[] = [];
		for (let r = 0; r < V.height; r++)
			for (let c = 0; c < V.width; c++) {
				if (!isWalkableTile(c, r)) continue;
				const inRoom = V.layers.regions[r][c] !== '.';
				const inShell = c >= shell.c0 && c <= shell.c1 && r >= shell.r0 && r <= shell.r1;
				if (!inRoom && !inShell) continue;
				if (!reachable.has(`${c}:${r}`)) pockets.push(`(${c},${r})`);
			}
		expect(pockets, 'unreachable walkable pockets inside the village').toEqual([]);
	});

	it('A6 — the external corridor attachment cells stay walkable', () => {
		// paths.ts attaches the crossroads corridor along the village's NE edge;
		// the village collision layer must leave those mouths open.
		const solid: string[] = [];
		for (let c = 44; c <= 50; c++)
			for (let r = 3; r <= 5; r++) if (isSolidTile(c, r)) solid.push(`(${c},${r})`);
		for (let c = 53; c <= 55; c++) if (isSolidTile(c, 0)) solid.push(`(${c},0)`);
		expect(solid, 'corridor-attachment cells that are walled off').toEqual([]);
	});

	it('A7 — the main route survives composition with the external corridor walls', () => {
		const blocked = new Set<string>();
		for (const blocker of pathsRegion.blockers ?? [])
			for (const { col, row } of tileCoverage(blocker, V)) blocked.add(`${col}:${row}`);
		const composed = (col: number, row: number) =>
			isWalkableTile(col, row) && !blocked.has(`${col}:${row}`);
		assertMainRouteWidth(composed);
	});

	it('A8 — the market and shrine loops give the H↔plaza spine a redundant route', () => {
		// The point of two loops (west H–M–P, shrine H–S–P) off the H–P spine is
		// redundant connectivity. Seal the direct H–P gate: H must still reach P
		// through a loop. This is the property A1's exact edge set does NOT
		// guarantee — if H–P were a bridge (a linear village), this fails.
		const hpGate = new Set(cellsIn(21, 23, 32, 32).map((c) => `${c.col}:${c.row}`));
		const spineSealed = (col: number, row: number) =>
			isWalkableTile(col, row) && !hpGate.has(`${col}:${row}`);
		expect(
			bfsPath(roomCentroid('H'), roomCentroid('P'), spineSealed, DIMS),
			'H→P has no loop route once the direct gate is sealed'
		).not.toBeNull();
		// And the two loops are distinct: the market is reachable without the
		// shrine, and the shrine without the market.
		const notShrine = (col: number, row: number) =>
			isWalkableTile(col, row) && V.layers.regions[row][col] !== 'S';
		const notMarket = (col: number, row: number) =>
			isWalkableTile(col, row) && V.layers.regions[row][col] !== 'M';
		expect(
			bfsPath(roomCentroid('H'), roomCentroid('M'), notShrine, DIMS),
			'west loop: H→M without the shrine'
		).not.toBeNull();
		expect(
			bfsPath(roomCentroid('H'), roomCentroid('S'), notMarket, DIMS),
			'shrine loop: H→S without the market'
		).not.toBeNull();
	});

	it('A9 — every object and decor glyph sits on a walkable collision cell', () => {
		const offenders: string[] = [];
		const objects = [
			...(V.objects.landmarks ?? []),
			...(V.objects.transitions ?? []),
			...(V.objects.pickups ?? []),
			...(V.objects.ambientNpcs ?? [])
		];
		for (const object of objects)
			if (!isWalkableTile(object.col, object.row))
				offenders.push(`${object.id}@(${object.col},${object.row})`);
		for (let r = 0; r < V.height; r++)
			for (let c = 0; c < V.width; c++)
				if (V.layers.decor[r][c] !== '.' && !isWalkableTile(c, r))
					offenders.push(`decor '${V.layers.decor[r][c]}'@(${c},${r})`);
		expect(offenders, 'objects or decor on collision cells').toEqual([]);
	});

	it('A10 — no building or decor blocks a critical gate throat or its approaches', () => {
		// A bare collision-layer route is the wrong thing to protect: BFS on the
		// layer alone walks straight through a building's footprint, because the
		// layer under a landmark is '.'. What must stay clear is each critical
		// gate throat AND the cells immediately beyond it on both sides — the
		// exact check that was missing when a building twice sealed a room whose
		// collision layer looked fine. Protect the opening cells and their
		// walkable orthogonal neighbours; require every one standable under the
		// composed rule.
		const protectedCells = new Set<string>();
		for (const opening of OPENINGS) {
			if (!opening.critical) continue;
			for (const cell of opening.cells) {
				protectedCells.add(`${cell.col}:${cell.row}`);
				for (const [dc, dr] of [
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1]
				] as const) {
					const c = cell.col + dc;
					const r = cell.row + dr;
					if (isWalkableTile(c, r)) protectedCells.add(`${c}:${r}`);
				}
			}
		}
		const blocked: string[] = [];
		for (const key of protectedCells) {
			const [col, row] = key.split(':').map(Number);
			if (!isStandableTile(col, row)) blocked.push(`(${col},${row})`);
		}
		expect(blocked, 'critical gate cells made unstandable by a building or decor').toEqual([]);
	});

	it('A11 — every room is fully reachable from the spawn under the composed collision rule', () => {
		const spawnCol = Math.floor((meadowEntryMap.spawn.x - V.origin.x) / V.tileSize);
		const spawnRow = Math.floor((meadowEntryMap.spawn.y - V.origin.y) / V.tileSize);
		expect(isStandableTile(spawnCol, spawnRow), 'spawn tile is standable').toBe(true);
		const seen = new Set<string>([`${spawnCol}:${spawnRow}`]);
		const queue: Cell[] = [{ col: spawnCol, row: spawnRow }];
		while (queue.length) {
			const { col, row } = queue.shift()!;
			for (const [dc, dr] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			] as const) {
				const nc = col + dc;
				const nr = row + dr;
				const key = `${nc}:${nr}`;
				if (seen.has(key) || !isStandableTile(nc, nr)) continue;
				seen.add(key);
				queue.push({ col: nc, row: nr });
			}
		}
		for (const glyph of ROOM_GLYPHS) {
			let standable = 0;
			let reachable = 0;
			for (let r = 0; r < V.height; r++)
				for (let c = 0; c < V.width; c++) {
					if (V.layers.regions[r][c] !== glyph || !isStandableTile(c, r)) continue;
					standable++;
					if (seen.has(`${c}:${r}`)) reachable++;
				}
			expect(standable, `room ${glyph} has no standable cells`).toBeGreaterThan(0);
			expect(reachable, `room ${glyph} has standable-but-unreachable cells`).toBe(standable);
		}
	});

	it('A12 — no two village sprite rects (building or decor) overlap', () => {
		// compileLayeredRegion checks only that each object's ANCHOR tile is
		// walkable; it does NOT check that the sprites it renders stay disjoint.
		// Decor sprites are far larger than their one-tile anchor (a maple is
		// ~7×9 tiles), so without this guard a prop silently renders on top of a
		// building or another prop. Every village sprite must be fully disjoint.
		// Scope to the village window — other regions (e.g. mistfen fog) layer
		// their decor on purpose.
		const inWindow = (x: number, y: number): boolean =>
			x >= V.origin.x &&
			x <= V.origin.x + V.width * V.tileSize &&
			y >= V.origin.y &&
			y <= V.origin.y + V.height * V.tileSize;
		const sprites: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];
		for (const lm of meadowEntryMap.landmarks ?? [])
			if (inWindow(lm.x, lm.y))
				sprites.push({ id: lm.id, x: lm.x, y: lm.y, w: lm.width, h: lm.height });
		for (const d of meadowEntryMap.mapDecor ?? [])
			if (inWindow(d.x, d.y)) sprites.push({ id: d.id, x: d.x, y: d.y, w: d.width, h: d.height });
		const overlaps: string[] = [];
		for (let i = 0; i < sprites.length; i++)
			for (let j = i + 1; j < sprites.length; j++) {
				const a = sprites[i];
				const b = sprites[j];
				const ox = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2);
				const oy = Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2);
				if (ox > 0 && oy > 0)
					overlaps.push(`${a.id} <-> ${b.id} (${Math.round((ox * oy) / 1024)} tiles²)`);
			}
		expect(overlaps, 'village building/decor sprites that overlap').toEqual([]);
	});
});
