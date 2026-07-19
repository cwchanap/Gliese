import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
