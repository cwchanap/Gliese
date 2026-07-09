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

describe('sundrop village layered source', () => {
	it('every layer has exactly width × height cells', () => {
		for (const [name, rows] of Object.entries(sundropVillageLayered.layers)) {
			expect(rows, `${name} row count`).toHaveLength(sundropVillageLayered.height);
			for (let i = 0; i < rows.length; i++) {
				expect(rows[i].length, `${name} row ${i} width`).toBe(sundropVillageLayered.width);
			}
		}
	});

	it.each(['H', 'P', 'M', 'N', 'S', 'E', 'C'] as const)(
		'regions layer contains glyph %s',
		(glyph) => {
			expect(sundropVillageLayered.layers.regions.some((r) => r.includes(glyph))).toBe(true);
		}
	);

	it('connects H by walkable path to P, M, N, S, E, C', () => {
		const walkable = walkableCells();
		const start = firstGlyphCell('H', 'regions');
		const reachable = bfsReachable(`${start.col}:${start.row}`, walkable);
		for (const glyph of ['P', 'M', 'N', 'S', 'E', 'C'] as const) {
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
		const regionGlyphs = new Set(['H', 'P', 'M', 'N', 'S', 'E', 'C']);
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
		const source = readFileSync(villageSourcePath, 'utf8');
		expect(source, 'village.ts must compile from the layered source').not.toMatch(/\bblockers\s*:/);
		expect(source).not.toMatch(/\bgroundPatches\s*:/);
		expect(source).not.toMatch(/\bmapDecor\s*:/);
		expect(source).not.toMatch(/\blandmarks\s*:/);
		expect(source).not.toMatch(/\btransitions\s*:/);
		expect(source).not.toMatch(/\bpickups\s*:/);
		expect(source).not.toMatch(/\bambientNpcs\s*:/);
	});
});
