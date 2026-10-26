import { TERRAIN_LEGEND, type TerrainGlyph } from './legend';

/**
 * Fixed tile ids for the grid-map tileset image (`GRID_TILESET.path`).
 *
 * The image is 16 tiles wide. Row 0 holds the single-tile terrains, one per
 * column in `SINGLE_TILE_GLYPHS` order. Every autotile terrain owns a full row
 * after that, in `AUTOTILE_GLYPHS` order, and its column is the edge mask:
 * N = 1, E = 2, S = 4, W = 8, with a bit set when that neighbour is the same
 * terrain (so column 15 is the fully surrounded centre tile and column 0 an
 * isolated tile).
 *
 * Both lists are append-only: art is drawn against these positions, so
 * reordering them would scramble every map.
 */
export const SINGLE_TILE_GLYPHS = [
	'.',
	'Y',
	'H',
	'!',
	'R',
	'*',
	'I',
	'X',
	'&'
] as const satisfies readonly TerrainGlyph[];

export const AUTOTILE_GLYPHS = [
	',',
	':',
	'T',
	'~',
	'=',
	'#',
	'^',
	'P',
	'%',
	'O'
] as const satisfies readonly TerrainGlyph[];

export const EDGE_N = 1;
export const EDGE_E = 2;
export const EDGE_S = 4;
export const EDGE_W = 8;

const COLUMNS = 16;

export const GRID_TILESET = {
	key: 'grid-tiles',
	path: '/game/assets/overworld/tiles.png',
	tileSize: 32,
	columns: COLUMNS,
	rows: 1 + AUTOTILE_GLYPHS.length
} as const;

/** Tile id for a terrain glyph; `mask` is the edge mask and only matters for autotiles. */
export function tileIdFor(glyph: TerrainGlyph, mask = 0): number {
	if (TERRAIN_LEGEND[glyph].autotile) {
		const row = (AUTOTILE_GLYPHS as readonly string[]).indexOf(glyph);
		if (row < 0) throw new Error(`autotile glyph "${glyph}" has no tileset row`);
		return (row + 1) * COLUMNS + mask;
	}
	const column = (SINGLE_TILE_GLYPHS as readonly string[]).indexOf(glyph);
	if (column < 0) throw new Error(`glyph "${glyph}" has no tileset column`);
	return column;
}
