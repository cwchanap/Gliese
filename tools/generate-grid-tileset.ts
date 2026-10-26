/**
 * Writes the placeholder grid-map tileset: flat colours with a darker band on
 * every autotile edge, so maps read clearly until real art replaces the image.
 * The layout (which tile id draws what) lives in `content/maps/grid/tileset.ts`.
 *
 *   bun run map:tileset
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

import { BASE_GLYPH, type TerrainGlyph } from '$lib/game/content/maps/grid/legend';
import {
	AUTOTILE_GLYPHS,
	EDGE_E,
	EDGE_N,
	EDGE_S,
	EDGE_W,
	GRID_TILESET,
	SINGLE_TILE_GLYPHS,
	tileIdFor
} from '$lib/game/content/maps/grid/tileset';

type Rgb = readonly [number, number, number];

const FILL: Record<TerrainGlyph, Rgb> = {
	'.': [104, 156, 74],
	',': [186, 150, 98],
	':': [222, 204, 150],
	'=': [150, 104, 60],
	H: [168, 160, 150],
	T: [34, 82, 44],
	Y: [44, 104, 52],
	'~': [58, 120, 170],
	'#': [120, 98, 82],
	'^': [110, 110, 120],
	P: [112, 78, 48],
	'!': [150, 60, 40],
	'%': [96, 120, 52],
	R: [132, 132, 136],
	O: [90, 100, 120],
	'*': [70, 60, 56],
	I: [176, 120, 70],
	X: [160, 128, 84],
	'&': [236, 110, 30]
};

const size = GRID_TILESET.tileSize;
const width = GRID_TILESET.columns * size;
const height = GRID_TILESET.rows * size;
const pixels = Buffer.alloc(width * height * 4);

function shade([r, g, b]: Rgb, factor: number): Rgb {
	return [Math.round(r * factor), Math.round(g * factor), Math.round(b * factor)];
}

function fillRect(tile: number, x: number, y: number, w: number, h: number, color: Rgb) {
	const left = (tile % GRID_TILESET.columns) * size;
	const top = Math.floor(tile / GRID_TILESET.columns) * size;
	for (let py = y; py < y + h; py += 1) {
		for (let px = x; px < x + w; px += 1) {
			const offset = ((top + py) * width + left + px) * 4;
			pixels[offset] = color[0];
			pixels[offset + 1] = color[1];
			pixels[offset + 2] = color[2];
			pixels[offset + 3] = 255;
		}
	}
}

function fillCircle(tile: number, radius: number, color: Rgb) {
	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			const dx = x + 0.5 - size / 2;
			const dy = y + 0.5 - size / 2;
			if (dx * dx + dy * dy <= radius * radius) fillRect(tile, x, y, 1, 1, color);
		}
	}
}

function drawSingle(glyph: (typeof SINGLE_TILE_GLYPHS)[number]) {
	const tile = tileIdFor(glyph);
	const color = FILL[glyph];
	fillRect(tile, 0, 0, size, size, FILL[BASE_GLYPH]);
	if (glyph === BASE_GLYPH) return;
	switch (glyph) {
		case 'Y':
		case 'R':
			fillCircle(tile, 13, color);
			return;
		case '*':
			fillCircle(tile, 12, color);
			fillCircle(tile, 6, FILL['&']);
			return;
		case 'H':
			fillRect(tile, 0, 0, size, size, color);
			for (let y = 2; y < size; y += 8) fillRect(tile, 0, y, size, 3, shade(color, 0.7));
			return;
		case 'I':
			fillRect(tile, 11, 2, 10, 28, color);
			return;
		case 'X':
			fillRect(tile, 4, 6, 4, 24, color);
			fillRect(tile, 24, 6, 4, 24, color);
			fillRect(tile, 4, 8, 24, 4, color);
			return;
		default:
			fillRect(tile, 2, 2, size - 4, size - 4, color);
	}
}

function drawAutotile(glyph: (typeof AUTOTILE_GLYPHS)[number]) {
	const color = FILL[glyph];
	const edge = shade(color, 0.62);
	const band = 4;
	for (let mask = 0; mask < 16; mask += 1) {
		const tile = tileIdFor(glyph, mask);
		fillRect(tile, 0, 0, size, size, color);
		if (!(mask & EDGE_N)) fillRect(tile, 0, 0, size, band, edge);
		if (!(mask & EDGE_S)) fillRect(tile, 0, size - band, size, band, edge);
		if (!(mask & EDGE_W)) fillRect(tile, 0, 0, band, size, edge);
		if (!(mask & EDGE_E)) fillRect(tile, size - band, 0, band, size, edge);
	}
}

for (const glyph of SINGLE_TILE_GLYPHS) drawSingle(glyph);
for (const glyph of AUTOTILE_GLYPHS) drawAutotile(glyph);

const out = join(process.cwd(), 'public', GRID_TILESET.path);
mkdirSync(dirname(out), { recursive: true });
await sharp(pixels, { raw: { width, height, channels: 4 } })
	.png({ compressionLevel: 9 })
	.toFile(out);
console.log(`wrote ${out} (${width}×${height})`);
