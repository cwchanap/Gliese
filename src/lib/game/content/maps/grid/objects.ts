import type { MapGridBuilding } from '$lib/game/content/maps/types';

import { GRID_BUILDING_TYPES, type GridBuildingArt, type GridBuildingType } from './buildings';
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
	waterfall: [144, 132],
	'fire-a': [44, 55],
	'fire-b': [44, 55],
	'fire-c': [44, 47],
	'fire-d': [44, 47],
	'smoke-a': [140, 229],
	'smoke-b': [160, 216],
	'hut-burning': [215, 236],
	...Object.fromEntries(
		Array.from({ length: 14 }, (_, index) => [`palisade-${index}`, [32, 66] as const])
	),
	...Object.fromEntries(
		Array.from({ length: 14 }, (_, index) => [`palisade-broken-${index}`, [32, 78] as const])
	)
};

/**
 * Props drawn on every tile of a glyph: art variants (picked by map position), drop in px,
 * and how far in px each one may shift off the tile centre, so a patch is not a grid.
 */
const TILE_PROPS: Readonly<
	Record<string, { frames: readonly string[]; drop: number; jitter?: number }>
> = {
	Y: {
		frames: ['tree-broad', 'tree-broad', 'tree-pine', 'tree-pine', 'tree-twisted', 'bush'],
		drop: 4
	},
	R: { frames: ['boulder', 'rocks'], drop: 0 },
	I: { frames: ['totem'], drop: 2 },
	X: { frames: ['drying-rack'], drop: 2 },
	'*': { frames: ['fire-pit'], drop: 6 },
	D: { frames: ['dead-tree-a', 'dead-tree-b', 'dead-tree-c', 'dead-tree-d'], drop: 4 },
	'&': { frames: ['fire-a', 'fire-b', 'fire-c', 'fire-d'], drop: 4, jitter: 5 }
};

/**
 * Walls cut from a seamless strip, one slice per tile (`slices` per repeat): the palisade, the
 * sealed gates in it until gate art exists, and the palisade the raid broke through.
 */
const STRIPS: Readonly<Record<string, { frame: string; slices: number; drop: number }>> = {
	P: { frame: 'palisade', slices: 14, drop: 4 },
	'!': { frame: 'palisade', slices: 14, drop: 4 },
	'/': { frame: 'palisade-broken', slices: 14, drop: 0 }
};

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
	// Tiles under a burning building: its own art shows the flames.
	const burnt = new Set<string>();
	for (const building of buildings) {
		const art: GridBuildingArt = GRID_BUILDING_TYPES[building.type];
		const index = variants.get(building.type) ?? 0;
		variants.set(building.type, index + 1);
		const burning = art.burning !== undefined && covers(terrain, building, '&');
		const sprite = standing(
			burning ? art.burning! : art.frames[index % art.frames.length]!,
			building,
			art.drop,
			{ width: building.width * GRID_TILE_SIZE * art.scale }
		);
		objects.push(sprite);
		if (!burning) continue;
		objects.push(smokeRising(sprite, index));
		for (let row = building.row; row < building.row + building.height; row += 1) {
			for (let col = building.col; col < building.col + building.width; col += 1) {
				burnt.add(`${col},${row}`);
			}
		}
	}

	for (const box of components(terrain, 'O')) {
		objects.push(standing('well', box, 6, { width: box.width * GRID_TILE_SIZE + 14 }));
	}
	for (const box of components(terrain, 'V')) {
		// The falls pour over the cliff band and splash into the river below it.
		objects.push(standing('waterfall', box, 12, { width: box.width * GRID_TILE_SIZE * 1.5 }));
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
			const strip = STRIPS[glyph];
			if (strip) {
				// Consecutive slices along a row, so a wall reads as one strip.
				const slice = (col + 3 * row) % strip.slices;
				objects.push(standing(`${strip.frame}-${slice}`, tile, strip.drop));
				continue;
			}
			const prop = TILE_PROPS[glyph];
			if (!prop || burnt.has(`${col},${row}`)) continue;
			const object = standing(
				prop.frames[variantIndex(col, row, prop.frames.length)]!,
				tile,
				prop.drop
			);
			const jitter = prop.jitter ?? 0;
			objects.push({
				...object,
				x: object.x + (variantIndex(row, col, 2 * jitter + 1) - jitter),
				y: object.y + (variantIndex(col + 7, row, jitter + 1) - jitter)
			});
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

/** True when every tile of a footprint is `glyph` (a story overlay painted over it). */
function covers(terrain: readonly string[], box: Box, glyph: string): boolean {
	for (let row = box.row; row < box.row + box.height; row += 1) {
		for (let col = box.col; col < box.col + box.width; col += 1) {
			if (terrain[row]?.[col] !== glyph) return false;
		}
	}
	return true;
}

/**
 * A smoke plume rising from behind a burning roof. It stands well above the roof's
 * base, so the roof draws in front of its foot. All of it draws under actors, so it
 * never hides Grik or the soldiers in the street north of the hut.
 */
function smokeRising(roof: GridObject, variant: number): GridObject {
	const frame = variant % 2 === 0 ? 'smoke-a' : 'smoke-b';
	const [width, height] = GRID_OBJECT_SIZES[frame]!;
	const y = Math.round(roof.y - roof.height * 0.7);
	const x = roof.x + Math.round(roof.width * 0.1);
	return { frame, x, y, width, height, overheadY: y - height };
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
