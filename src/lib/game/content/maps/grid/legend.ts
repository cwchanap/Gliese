/**
 * The global terrain legend for text-grid maps. One glyph is one 32px tile, and
 * the glyph alone decides both what is drawn and whether it blocks movement.
 *
 * `layer: 'canopy'` tiles draw above actors (forest, pines and reeds); everything else
 * draws on the ground layer. `autotile` terrains pick one of 16 edge tiles from
 * their N/E/S/W neighbours (see `tileset.ts`); the rest use a single tile. Props
 * taller than a tile (trees, rocks, the palisade, fire) bake as plain ground and are drawn
 * as sprites over it (see `objects.ts`).
 *
 * Keep the table in CLAUDE.md ("Overworld grid maps") in sync when adding a glyph.
 */
export interface TerrainDefinition {
	readonly name: string;
	readonly blocks: boolean;
	readonly layer: 'ground' | 'canopy';
	readonly autotile: boolean;
	/** Other glyphs an autotile terrain joins with instead of drawing an edge. */
	readonly connects?: string;
}

export const TERRAIN_LEGEND = {
	'.': { name: 'grass', blocks: false, layer: 'ground', autotile: false },
	',': { name: 'dirt path', blocks: false, layer: 'ground', autotile: true, connects: '=H*O' },
	':': { name: 'sand', blocks: false, layer: 'ground', autotile: true, connects: '~' },
	'=': { name: 'bridge', blocks: false, layer: 'ground', autotile: true, connects: ',' },
	H: { name: 'stairs', blocks: false, layer: 'ground', autotile: false },
	T: { name: 'dense forest', blocks: true, layer: 'canopy', autotile: true },
	Y: { name: 'lone tree', blocks: true, layer: 'ground', autotile: false },
	'~': { name: 'water', blocks: true, layer: 'ground', autotile: true, connects: '=V' },
	'#': { name: 'cliff', blocks: true, layer: 'ground', autotile: true, connects: 'H' },
	'^': { name: 'mountain', blocks: true, layer: 'ground', autotile: true },
	P: { name: 'palisade', blocks: true, layer: 'ground', autotile: true, connects: '!' },
	'!': { name: 'sealed gate', blocks: true, layer: 'ground', autotile: false },
	'%': { name: 'fenced garden', blocks: true, layer: 'ground', autotile: true },
	R: { name: 'rock', blocks: true, layer: 'ground', autotile: false },
	O: { name: 'well', blocks: true, layer: 'ground', autotile: true },
	'*': { name: 'fire pit', blocks: true, layer: 'ground', autotile: false },
	I: { name: 'totem', blocks: true, layer: 'ground', autotile: false },
	X: { name: 'drying rack', blocks: true, layer: 'ground', autotile: false },
	'&': { name: 'fire', blocks: true, layer: 'ground', autotile: false },
	';': { name: 'marsh water', blocks: true, layer: 'ground', autotile: true, connects: '=D' },
	'"': { name: 'reeds', blocks: true, layer: 'canopy', autotile: true },
	D: { name: 'dead tree', blocks: true, layer: 'ground', autotile: false },
	A: { name: 'pine forest', blocks: true, layer: 'canopy', autotile: true },
	_: { name: 'rock terrace', blocks: false, layer: 'ground', autotile: true },
	V: { name: 'waterfall', blocks: true, layer: 'ground', autotile: false },
	'/': { name: 'broken palisade', blocks: true, layer: 'ground', autotile: false }
} as const satisfies Record<string, TerrainDefinition>;

export type TerrainGlyph = keyof typeof TERRAIN_LEGEND;

/** The ground drawn under canopy tiles, buildings, and anchors with no walkable neighbour. */
export const BASE_GLYPH: TerrainGlyph = '.';

/** In a story overlay, keeps the terrain underneath. */
export const OVERLAY_KEEP_GLYPH = '-';

export function isTerrainGlyph(glyph: string): glyph is TerrainGlyph {
	return Object.hasOwn(TERRAIN_LEGEND, glyph);
}
