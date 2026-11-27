import { TERRAIN_LEGEND, type TerrainGlyph } from './legend';

/**
 * Fixed tile ids for the grid-map tileset image (`GRID_TILESET.path`).
 *
 * The image is a sheet of slots, 16 wide. Row 0 holds the single-tile
 * terrains, one per column in `SINGLE_TILE_GLYPHS` order. Every autotile
 * terrain owns a full row after that, in `AUTOTILE_GLYPHS` order, and its
 * column is the edge mask: N = 1, E = 2, S = 4, W = 8, with a bit set when
 * that neighbour is the same terrain (so column 15 is the fully surrounded
 * centre tile and column 0 an isolated tile).
 *
 * Each slot is a square of `TILE_VARIANTS` × `TILE_VARIANTS` tiles cut from one
 * continuous piece of art, and the map tile at (col, row) draws variant
 * (col % TILE_VARIANTS, row % TILE_VARIANTS). Ground textures therefore repeat
 * every `TILE_VARIANTS` tiles instead of every tile.
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
	'&',
	'D',
	'V',
	'/'
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
	'O',
	';',
	'"',
	'A',
	'_'
] as const satisfies readonly TerrainGlyph[];

export const EDGE_N = 1;
export const EDGE_E = 2;
export const EDGE_S = 4;
export const EDGE_W = 8;

export const TILE_VARIANTS = 8;

const SLOT_COLUMNS = 16;

/**
 * The row after the autotiles holds 16 Wang tiles of mountain rock. Every mountain
 * tile draws its rock from them, so peaks do not repeat on a fixed 8-tile lattice:
 * the map is cut into 8×8-tile blocks, each block edge gets one of two kinds from
 * its position, and a block draws the Wang tile whose four edges match. The
 * mountain's own autotile row then only holds its edges (grass and the mountain
 * foot over transparent rock), drawn on the `edges` layer above the rock.
 */
export const MOUNTAIN_ROCK_ROW = 1 + AUTOTILE_GLYPHS.length;
const SLOT_ROWS = MOUNTAIN_ROCK_ROW + 1;

export const GRID_TILESET = {
	key: 'grid-tiles',
	path: '/game/assets/overworld/tiles.png',
	tileSize: 32,
	slotColumns: SLOT_COLUMNS,
	slotRows: SLOT_ROWS,
	/** Tiles per image row and column, which is how Phaser counts tile ids. */
	columns: SLOT_COLUMNS * TILE_VARIANTS,
	rows: SLOT_ROWS * TILE_VARIANTS
} as const;

/** Slot index (row-major on the 16-wide slot sheet) of a glyph; `mask` only matters for autotiles. */
export function slotFor(glyph: TerrainGlyph, mask = 0): number {
	if (TERRAIN_LEGEND[glyph].autotile) {
		const row = (AUTOTILE_GLYPHS as readonly string[]).indexOf(glyph);
		if (row < 0) throw new Error(`autotile glyph "${glyph}" has no tileset row`);
		return (row + 1) * SLOT_COLUMNS + mask;
	}
	const column = (SINGLE_TILE_GLYPHS as readonly string[]).indexOf(glyph);
	if (column < 0) throw new Error(`glyph "${glyph}" has no tileset column`);
	return column;
}

/** Tile id for a glyph with edge `mask` drawn at map tile (col, row). */
export function tileIdFor(glyph: TerrainGlyph, mask: number, col: number, row: number): number {
	const slot = slotFor(glyph, mask);
	const tileRow = Math.floor(slot / SLOT_COLUMNS) * TILE_VARIANTS + (row % TILE_VARIANTS);
	const tileCol = (slot % SLOT_COLUMNS) * TILE_VARIANTS + (col % TILE_VARIANTS);
	return tileRow * GRID_TILESET.columns + tileCol;
}

/** Which of the two edge kinds a block edge gets: 1 or 0, stable for its position. */
function edgeKind(seed: number, a: number, b: number): number {
	let hash =
		(Math.imul(a, 374_761_393) + Math.imul(b, 668_265_263) + Math.imul(seed, 1_274_126_177)) | 0;
	hash = Math.imul(hash ^ (hash >>> 13), 1_274_126_177);
	return ((hash ^ (hash >>> 16)) >>> 8) & 1;
}

/** Wang tile index (N = 1, E = 2, S = 4, W = 8 when that edge is kind 1) of an 8×8-tile block. */
export function mountainRockWangIndex(blockCol: number, blockRow: number): number {
	return (
		edgeKind(1, blockCol, blockRow) |
		(edgeKind(2, blockCol + 1, blockRow) << 1) |
		(edgeKind(1, blockCol, blockRow + 1) << 2) |
		(edgeKind(2, blockCol, blockRow) << 3)
	);
}

/** Tile id of the mountain rock drawn at map tile (col, row). */
export function mountainRockTileId(col: number, row: number): number {
	const wang = mountainRockWangIndex(
		Math.floor(col / TILE_VARIANTS),
		Math.floor(row / TILE_VARIANTS)
	);
	const tileRow = MOUNTAIN_ROCK_ROW * TILE_VARIANTS + (row % TILE_VARIANTS);
	const tileCol = wang * TILE_VARIANTS + (col % TILE_VARIANTS);
	return tileRow * GRID_TILESET.columns + tileCol;
}
