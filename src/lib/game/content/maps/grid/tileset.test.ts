import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { TERRAIN_LEGEND, type TerrainGlyph } from './legend';
import { AUTOTILE_GLYPHS, GRID_TILESET, SINGLE_TILE_GLYPHS, tileIdFor } from './tileset';

const legendGlyphs = Object.keys(TERRAIN_LEGEND) as TerrainGlyph[];

describe('grid tileset', () => {
	it('gives every legend glyph exactly one slot of the right kind', () => {
		const slotted = [...SINGLE_TILE_GLYPHS, ...AUTOTILE_GLYPHS];
		expect(new Set(slotted).size).toBe(slotted.length);
		expect([...slotted].sort()).toEqual([...legendGlyphs].sort());
		for (const glyph of AUTOTILE_GLYPHS) expect(TERRAIN_LEGEND[glyph].autotile, glyph).toBe(true);
		for (const glyph of SINGLE_TILE_GLYPHS)
			expect(TERRAIN_LEGEND[glyph].autotile, glyph).toBe(false);
		expect(SINGLE_TILE_GLYPHS.length).toBeLessThanOrEqual(GRID_TILESET.columns);
	});

	it('keeps tile ids fixed: singles on row 0, one row per autotile with the mask as column', () => {
		expect(tileIdFor('.')).toBe(0);
		expect(tileIdFor(',', 0)).toBe(16);
		expect(tileIdFor(',', 15)).toBe(31);
		expect(tileIdFor('O', 5)).toBe(GRID_TILESET.columns * AUTOTILE_GLYPHS.length + 5);
	});

	it('ships a tileset image with the declared grid', () => {
		const bytes = readFileSync(resolve('public', `.${GRID_TILESET.path}`));
		expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
		expect(bytes.readUInt32BE(16)).toBe(GRID_TILESET.columns * GRID_TILESET.tileSize);
		expect(bytes.readUInt32BE(20)).toBe(GRID_TILESET.rows * GRID_TILESET.tileSize);
	});

	it('documents every legend glyph in CLAUDE.md', () => {
		const guide = readFileSync(resolve('CLAUDE.md'), 'utf8');
		const documented = [...guide.matchAll(/^\| `(.)` +\|/gm)].map((match) => match[1]);
		expect([...documented].sort()).toEqual([...legendGlyphs].sort());
	});
});
