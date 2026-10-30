import type { MapGridBuilding } from '$lib/game/content/maps/types';

import { GRID_BUILDING_TYPES, type GridBuildingType } from './buildings';
import { GRID_TILE_SIZE } from './compile';

/**
 * Sprites drawn over a text-grid map: buildings, and props that stand taller than
 * their tile (trees, rocks, the palisade). Each one stands on the bottom edge of its
 * footprint. The part above the footprint's top edge draws over actors, so Grik
 * walks behind roofs and treetops; the rest draws under them.
 *
 * The art lives in `art/overworld/objects/<frame>.png` at the size drawn here, and
 * `bun run map:tileset` packs it into one sheet (`GRID_OBJECT_SHEET`).
 */

/** Width and height in px of each piece of object art. */
export const GRID_OBJECT_SIZES: Readonly<Record<string, readonly [number, number]>> = {
	shrine: [251, 241],
	lodge: [394, 262],
	'herb-hut': [215, 210],
	'grik-home': [251, 215],
	forge: [251, 242],
	'hut-a': [215, 237],
	'hut-b': [215, 220],
	'hut-c': [215, 203],
	'small-hut-a': [115, 146],
	'small-hut-b': [115, 121],
	watchtower: [96, 210],
	'sacred-tree': [170, 166],
	'tree-broad': [48, 49],
	'tree-pine': [48, 68],
	'tree-twisted': [48, 52],
	bush: [40, 33],
	boulder: [38, 29],
	rocks: [38, 28],
	totem: [46, 74],
	'drying-rack': [48, 37],
	well: [78, 83],
	'fire-pit': [50, 36],
	garden: [132, 105],
	'dead-tree-a': [89, 104],
	'dead-tree-b': [72, 104],
	'dead-tree-c': [83, 96],
	'dead-tree-d': [63, 84],
	...Object.fromEntries(
		Array.from({ length: 14 }, (_, index) => [`palisade-${index}`, [32, 66] as const])
	)
};

/** The palisade strip repeats every 14 tiles, one slice per tile. */
const PALISADE_SLICES = 14;

/** Props drawn on every tile of a glyph: art variants (picked by map position) and drop in px. */
const TILE_PROPS: Readonly<Record<string, { frames: readonly string[]; drop: number }>> = {
	Y: {
		frames: ['tree-broad', 'tree-broad', 'tree-pine', 'tree-pine', 'tree-twisted', 'bush'],
		drop: 4
	},
	R: { frames: ['boulder', 'rocks'], drop: 0 },
	I: { frames: ['totem'], drop: 2 },
	X: { frames: ['drying-rack'], drop: 2 },
	'*': { frames: ['fire-pit'], drop: 6 },
	D: { frames: ['dead-tree-a', 'dead-tree-b', 'dead-tree-c', 'dead-tree-d'], drop: 4 }
};

/** The palisade, and the sealed gates in it until gate art exists. */
const PALISADE_GLYPHS = 'P!';

export interface GridObject {
	readonly frame: string;
	/** Centre of the sprite's bottom edge, in map px. */
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	/** Map y in px: the part of the sprite above it draws over actors, the rest under them. */
	readonly overheadY: number;
}

interface Box {
	readonly col: number;
	readonly row: number;
	readonly width: number;
	readonly height: number;
}

/** Every object on the map, sorted from north to south so later ones draw in front. */
export function buildGridObjects(
	terrain: readonly string[],
	buildings: readonly MapGridBuilding[]
): GridObject[] {
	const objects: GridObject[] = [];
	const variants = new Map<GridBuildingType, number>();
	for (const building of buildings) {
		const art = GRID_BUILDING_TYPES[building.type];
		const index = variants.get(building.type) ?? 0;
		variants.set(building.type, index + 1);
		objects.push(
			standing(art.frames[index % art.frames.length]!, building, art.drop, {
				width: building.width * GRID_TILE_SIZE * art.scale
			})
		);
	}

	for (const box of components(terrain, 'O')) {
		objects.push(standing('well', box, 6, { width: box.width * GRID_TILE_SIZE + 14 }));
	}
	for (const box of components(terrain, 'V')) {
		// The falls pour over the cliff band and splash into the river below it.
		objects.push(
			standing('waterfall', box, 12, {
				width: box.width * GRID_TILE_SIZE + 16,
				height: box.height * GRID_TILE_SIZE + 28
			})
		);
	}
	for (const box of components(terrain, '%')) {
		objects.push(
			standing('garden', box, 4, {
				width: box.width * GRID_TILE_SIZE + 4,
				height: box.height * GRID_TILE_SIZE + 10
			})
		);
	}

	for (const [row, line] of terrain.entries()) {
		for (let col = 0; col < line.length; col += 1) {
			const glyph = line[col]!;
			const tile = { col, row, width: 1, height: 1 };
			if (PALISADE_GLYPHS.includes(glyph)) {
				// Consecutive slices along a row, so a wall reads as one strip.
				objects.push(standing(`palisade-${(col + 3 * row) % PALISADE_SLICES}`, tile, 4));
				continue;
			}
			const prop = TILE_PROPS[glyph];
			if (!prop) continue;
			objects.push(
				standing(prop.frames[variantIndex(col, row, prop.frames.length)]!, tile, prop.drop)
			);
		}
	}

	return objects.sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * A sprite centred on a footprint and standing `drop` px below its bottom edge.
 * Without a size it is drawn at the art's own size; with only a width, its height
 * follows the art's aspect.
 */
function standing(
	frame: string,
	footprint: {
		readonly col: number;
		readonly row: number;
		readonly width: number;
		readonly height: number;
	},
	drop: number,
	size: { readonly width?: number; readonly height?: number } = {}
): GridObject {
	const art = GRID_OBJECT_SIZES[frame];
	if (!art) throw new Error(`no object art "${frame}"`);
	const width = Math.round(size.width ?? art[0]);
	return {
		frame,
		x: (footprint.col + footprint.width / 2) * GRID_TILE_SIZE,
		y: (footprint.row + footprint.height) * GRID_TILE_SIZE + drop,
		width,
		height: Math.round(size.height ?? (width * art[1]) / art[0]),
		overheadY: footprint.row * GRID_TILE_SIZE
	};
}

/** A stable pseudo-random variant for a tile, so neighbouring props differ. */
function variantIndex(col: number, row: number, count: number): number {
	return (((col * 73_856_093) ^ (row * 19_349_663)) >>> 0) % count;
}

/** The 4-connected groups of a glyph, with their bounding boxes. */
function components(terrain: readonly string[], glyph: string): Box[] {
	const seen = new Set<string>();
	const boxes: Box[] = [];
	for (const [row, line] of terrain.entries()) {
		for (let col = 0; col < line.length; col += 1) {
			if (line[col] !== glyph || seen.has(`${col},${row}`)) continue;
			const cells: [number, number][] = [];
			const queue: [number, number][] = [[col, row]];
			seen.add(`${col},${row}`);
			while (queue.length > 0) {
				const [c, r] = queue.pop()!;
				cells.push([c, r]);
				for (const [nc, nr] of [
					[c + 1, r],
					[c - 1, r],
					[c, r + 1],
					[c, r - 1]
				] as const) {
					if (terrain[nr]?.[nc] !== glyph || seen.has(`${nc},${nr}`)) continue;
					seen.add(`${nc},${nr}`);
					queue.push([nc, nr]);
				}
			}
			const cols = cells.map(([c]) => c);
			const rows = cells.map(([, r]) => r);
			const left = Math.min(...cols);
			const top = Math.min(...rows);
			boxes.push({
				col: left,
				row: top,
				width: Math.max(...cols) - left + 1,
				height: Math.max(...rows) - top + 1
			});
		}
	}
	return boxes;
}

/** Width of the packed object sheet; rows of art fill it left to right, tallest first. */
const SHEET_WIDTH = 1024;

/** Where each piece of art sits on the packed sheet. */
function packSheet(sizes: Readonly<Record<string, readonly [number, number]>>) {
	const frames: Record<string, { x: number; y: number; w: number; h: number }> = {};
	const order = Object.entries(sizes).sort(
		([a, [, ah]], [b, [, bh]]) => bh - ah || a.localeCompare(b)
	);
	let x = 0;
	let y = 0;
	let rowHeight = 0;
	for (const [frame, [w, h]] of order) {
		if (x + w > SHEET_WIDTH) {
			x = 0;
			y += rowHeight;
			rowHeight = 0;
		}
		frames[frame] = { x, y, w, h };
		x += w;
		rowHeight = Math.max(rowHeight, h);
	}
	return { frames, width: SHEET_WIDTH, height: y + rowHeight };
}

const sheet = packSheet(GRID_OBJECT_SIZES);

export const GRID_OBJECT_SHEET = {
	key: 'grid-objects',
	path: '/game/assets/overworld/objects.png',
	width: sheet.width,
	height: sheet.height,
	frames: sheet.frames
} as const;
