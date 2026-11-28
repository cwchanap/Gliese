import type { MapGridBuilding } from '$lib/game/content/maps/types';

import type { TerrainGlyph } from './legend';

/** Colour of each terrain on the area map and minimap, as 0xRRGGBB. */
export const GRID_MAP_COLORS: Readonly<Record<TerrainGlyph, number>> = {
	'.': 0x6f8f3e,
	',': 0xb08850,
	':': 0xd9c68a,
	'=': 0x8a5a32,
	H: 0x9a7a50,
	T: 0x2f5a2a,
	Y: 0x4f7a35,
	'~': 0x3f86a8,
	'#': 0x8a6a45,
	'^': 0x7d7468,
	P: 0x6b4a2a,
	'!': 0xa33b2b,
	'%': 0x7f9a45,
	R: 0x8d8a82,
	O: 0x9a9488,
	'*': 0xb08850,
	I: 0x6b4a2a,
	X: 0x8a6a40,
	'&': 0xd8642a,
	';': 0x3f5a3f,
	'"': 0x7a7a45,
	D: 0x4a4535,
	A: 0x2b4a4a,
	_: 0x9a9a90,
	V: 0xa8d8e8,
	'/': 0x5a3a22
};

/** Building footprints on the map: a roof colour. */
const BUILDING_MAP_COLOR = 0xa0683a;

/**
 * The map as an RGBA image with one pixel per tile, for the area map and the
 * minimap to draw under their fog of war.
 */
export function buildGridMapPixels(
	terrain: readonly string[],
	buildings: readonly MapGridBuilding[]
): { width: number; height: number; pixels: Uint8ClampedArray<ArrayBuffer> } {
	const height = terrain.length;
	const width = terrain[0]?.length ?? 0;
	const pixels = new Uint8ClampedArray(width * height * 4);
	const paint = (col: number, row: number, color: number) => {
		const offset = (row * width + col) * 4;
		pixels[offset] = (color >> 16) & 0xff;
		pixels[offset + 1] = (color >> 8) & 0xff;
		pixels[offset + 2] = color & 0xff;
		pixels[offset + 3] = 0xff;
	};
	for (const [row, line] of terrain.entries()) {
		for (let col = 0; col < width; col += 1) {
			paint(col, row, GRID_MAP_COLORS[line[col] as TerrainGlyph] ?? GRID_MAP_COLORS['.']);
		}
	}
	for (const building of buildings) {
		for (let row = building.row; row < building.row + building.height; row += 1) {
			for (let col = building.col; col < building.col + building.width; col += 1) {
				// A story overlay's fire over a hut (the raid) stays fire on the map.
				if (terrain[row]?.[col] === '&') continue;
				paint(col, row, BUILDING_MAP_COLOR);
			}
		}
	}
	return { width, height, pixels };
}
