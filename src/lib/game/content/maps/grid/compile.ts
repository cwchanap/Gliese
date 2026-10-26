import type {
	MapGridBuilding,
	MapTileGrid,
	MapTileOverlay,
	StoryGated,
	WorldMapDefinition
} from '$lib/game/content/maps/types';

import { isGridBuildingType, type GridBuildingType } from './buildings';
import {
	BASE_GLYPH,
	isTerrainGlyph,
	OVERLAY_KEEP_GLYPH,
	TERRAIN_LEGEND,
	type TerrainGlyph
} from './legend';

export const GRID_TILE_SIZE = 32;

/**
 * One hand-authored block of the world, about 64×64 tiles. `terrain` and each
 * overlay's `rows` are text blocks with one glyph per tile (see `legend.ts`).
 */
export interface GridChunkSource {
	readonly id: string;
	/** Lowercase glyph → world-unique anchor name. Each glyph appears exactly once. */
	readonly anchors?: Readonly<Record<string, string>>;
	/** Glyph → building type. Each connected block of a glyph is one building. */
	readonly buildings?: Readonly<Record<string, GridBuildingType>>;
	readonly terrain: string;
	readonly overlays?: readonly GridOverlaySource[];
}

/** Story terrain for a chunk: `-` keeps the tile underneath, any legend glyph replaces it. */
export interface GridOverlaySource extends StoryGated {
	readonly id: string;
	readonly rows: string;
}

export interface GridWorldSource {
	readonly id: string;
	readonly width: number;
	readonly height: number;
	/** Terrain for every tile no chunk covers. */
	readonly fill: TerrainGlyph;
	readonly chunks: readonly {
		readonly chunk: GridChunkSource;
		readonly col: number;
		readonly row: number;
	}[];
}

export interface GridAnchor {
	readonly name: string;
	readonly col: number;
	readonly row: number;
	/** Tile centre in world pixels. */
	readonly x: number;
	readonly y: number;
}

export interface CompiledGridChunk {
	readonly id: string;
	readonly width: number;
	readonly height: number;
	readonly terrain: readonly string[];
	readonly buildings: readonly MapGridBuilding[];
	readonly anchors: readonly {
		readonly name: string;
		readonly col: number;
		readonly row: number;
	}[];
	readonly overlays: readonly MapTileOverlay[];
}

export interface CompiledGridWorld {
	readonly id: string;
	readonly width: number;
	readonly height: number;
	readonly grid: MapTileGrid;
	readonly overlays: readonly MapTileOverlay[];
	readonly anchors: Readonly<Record<string, GridAnchor>>;
}

/** Splits a text block into rows, dropping blank lines at either end and trailing spaces. */
export function parseGridRows(text: string): string[] {
	const rows = text.split('\n').map((row) => row.replace(/\s+$/, ''));
	while (rows.length > 0 && rows[0] === '') rows.shift();
	while (rows.length > 0 && rows.at(-1) === '') rows.pop();
	return rows;
}

export function compileGridChunk(source: GridChunkSource): CompiledGridChunk {
	const fail = (message: string): never => {
		throw new Error(`grid chunk "${source.id}": ${message}`);
	};
	const rows = parseGridRows(source.terrain);
	if (rows.length === 0) fail('terrain is empty');
	const width = rows[0]!.length;
	for (const [row, line] of rows.entries()) {
		if (line.length !== width) fail(`row ${row} has width ${line.length}, expected ${width}`);
	}

	const anchorNames = source.anchors ?? {};
	for (const glyph of Object.keys(anchorNames)) {
		if (!/^[a-z]$/.test(glyph)) fail(`anchor glyph "${glyph}" must be one lowercase letter`);
	}
	const buildingTypes = source.buildings ?? {};
	for (const [glyph, type] of Object.entries(buildingTypes)) {
		if (glyph.length !== 1 || /[a-z]/.test(glyph) || glyph === OVERLAY_KEEP_GLYPH) {
			fail(`building glyph "${glyph}" must be one character that is not a lowercase letter or "-"`);
		}
		if (isTerrainGlyph(glyph)) fail(`building glyph "${glyph}" is already a terrain glyph`);
		if (!isGridBuildingType(type)) fail(`building glyph "${glyph}" has unknown type "${type}"`);
	}

	const grid = rows.map((line) => [...line]);
	const anchorCells = new Map<string, { col: number; row: number }[]>();
	for (const [row, line] of grid.entries()) {
		for (const [col, glyph] of line.entries()) {
			if (isTerrainGlyph(glyph) || Object.hasOwn(buildingTypes, glyph)) continue;
			if (Object.hasOwn(anchorNames, glyph)) {
				const cells = anchorCells.get(glyph) ?? [];
				cells.push({ col, row });
				anchorCells.set(glyph, cells);
				continue;
			}
			fail(`row ${row} col ${col}: unknown glyph "${glyph}"`);
		}
	}

	const anchors = Object.entries(anchorNames).map(([glyph, name]) => {
		const cells = anchorCells.get(glyph) ?? [];
		if (cells.length !== 1) {
			fail(`anchor "${glyph}" (${name}) appears ${cells.length} times, expected exactly once`);
		}
		return { name, ...cells[0]! };
	});

	const buildings = collectBuildings(source.id, grid, buildingTypes, fail);

	// Anchors and buildings become plain terrain: anchors take the ground around
	// them, buildings sit on grass and block through their footprint.
	const terrain = grid.map((line) => [...line]);
	for (const anchor of anchors) {
		terrain[anchor.row]![anchor.col] = groundAround(grid, anchor.col, anchor.row);
	}
	for (const building of buildings) {
		for (let row = building.row; row < building.row + building.height; row += 1) {
			for (let col = building.col; col < building.col + building.width; col += 1) {
				terrain[row]![col] = BASE_GLYPH;
			}
		}
	}

	const overlayIds = new Set<string>();
	const overlays = (source.overlays ?? []).map((overlay) => {
		if (overlayIds.has(overlay.id)) fail(`overlay "${overlay.id}" is defined twice`);
		overlayIds.add(overlay.id);
		const overlayRows = parseGridRows(overlay.rows);
		if (overlayRows.length !== rows.length) {
			fail(`overlay "${overlay.id}" has ${overlayRows.length} rows, expected ${rows.length}`);
		}
		const cells: { col: number; row: number; glyph: string }[] = [];
		for (const [row, line] of overlayRows.entries()) {
			if (line.length !== width) {
				fail(`overlay "${overlay.id}" row ${row} has width ${line.length}, expected ${width}`);
			}
			for (const [col, glyph] of [...line].entries()) {
				if (glyph === OVERLAY_KEEP_GLYPH) continue;
				if (!isTerrainGlyph(glyph)) {
					fail(`overlay "${overlay.id}" row ${row} col ${col}: unknown glyph "${glyph}"`);
				}
				cells.push({ col, row, glyph });
			}
		}
		return {
			id: overlay.id,
			...(overlay.activeDuring ? { activeDuring: overlay.activeDuring } : {}),
			...(overlay.hiddenDuring ? { hiddenDuring: overlay.hiddenDuring } : {}),
			cells
		};
	});

	return {
		id: source.id,
		width,
		height: rows.length,
		terrain: terrain.map((line) => line.join('')),
		buildings,
		anchors,
		overlays
	};
}

/** Stitches chunks into one world map. Chunks may not overlap or leave the world. */
export function compileGridWorld(source: GridWorldSource): CompiledGridWorld {
	const fail = (message: string): never => {
		throw new Error(`grid world "${source.id}": ${message}`);
	};
	if (!Number.isSafeInteger(source.width) || source.width <= 0) fail('width must be positive');
	if (!Number.isSafeInteger(source.height) || source.height <= 0) fail('height must be positive');

	const terrain = Array.from({ length: source.height }, () =>
		Array<string>(source.width).fill(source.fill)
	);
	const owner = Array.from({ length: source.height }, () =>
		Array<string | null>(source.width).fill(null)
	);
	const buildings: MapGridBuilding[] = [];
	const overlays: MapTileOverlay[] = [];
	const anchors: Record<string, GridAnchor> = {};
	const chunkIds = new Set<string>();

	for (const placement of source.chunks) {
		const chunk = compileGridChunk(placement.chunk);
		if (chunkIds.has(chunk.id)) fail(`chunk "${chunk.id}" is placed twice`);
		chunkIds.add(chunk.id);
		const { col: left, row: top } = placement;
		if (!Number.isSafeInteger(left) || !Number.isSafeInteger(top)) {
			fail(`chunk "${chunk.id}" must be placed at whole tiles, got col ${left} row ${top}`);
		}
		if (
			left < 0 ||
			top < 0 ||
			left + chunk.width > source.width ||
			top + chunk.height > source.height
		) {
			fail(
				`chunk "${chunk.id}" (${chunk.width}×${chunk.height} at col ${left} row ${top}) is outside the ${source.width}×${source.height} world`
			);
		}
		for (let row = 0; row < chunk.height; row += 1) {
			for (let col = 0; col < chunk.width; col += 1) {
				const other = owner[top + row]![left + col];
				if (other)
					fail(`chunks "${other}" and "${chunk.id}" overlap at col ${left + col} row ${top + row}`);
				owner[top + row]![left + col] = chunk.id;
				terrain[top + row]![left + col] = chunk.terrain[row]![col]!;
			}
		}
		for (const building of chunk.buildings) {
			buildings.push({ ...building, col: building.col + left, row: building.row + top });
		}
		for (const overlay of chunk.overlays) {
			overlays.push({
				...overlay,
				id: `${chunk.id}-${overlay.id}`,
				cells: overlay.cells.map((cell) => ({ ...cell, col: cell.col + left, row: cell.row + top }))
			});
		}
		for (const anchor of chunk.anchors) {
			if (anchors[anchor.name]) fail(`anchor "${anchor.name}" is defined in more than one chunk`);
			const col = anchor.col + left;
			const row = anchor.row + top;
			anchors[anchor.name] = {
				name: anchor.name,
				col,
				row,
				x: col * GRID_TILE_SIZE + GRID_TILE_SIZE / 2,
				y: row * GRID_TILE_SIZE + GRID_TILE_SIZE / 2
			};
		}
	}

	return {
		id: source.id,
		width: source.width,
		height: source.height,
		grid: { terrain: terrain.map((line) => line.join('')), buildings },
		overlays,
		anchors
	};
}

/** The world as a playable map, starting at `spawnAnchor`. Placements are added on top. */
export function gridWorldMap(
	world: CompiledGridWorld,
	spawnAnchor: string,
	spawnDirection: WorldMapDefinition['spawnDirection']
): WorldMapDefinition & { readonly tileGrid: MapTileGrid } {
	const spawn = world.anchors[spawnAnchor];
	if (!spawn) throw new Error(`grid world "${world.id}": no spawn anchor "${spawnAnchor}"`);
	return {
		id: world.id,
		width: world.width,
		height: world.height,
		spawn: { x: spawn.x, y: spawn.y },
		spawnDirection,
		transitions: [],
		tileGrid: world.grid,
		tileOverlays: [...world.overlays]
	};
}

function collectBuildings(
	chunkId: string,
	grid: readonly (readonly string[])[],
	buildingTypes: Readonly<Record<string, GridBuildingType>>,
	fail: (message: string) => never
): MapGridBuilding[] {
	const seen = grid.map((line) => line.map(() => false));
	const counts = new Map<GridBuildingType, number>();
	const buildings: MapGridBuilding[] = [];
	for (const [row, line] of grid.entries()) {
		for (const [col, glyph] of line.entries()) {
			if (seen[row]![col] || !Object.hasOwn(buildingTypes, glyph)) continue;
			const cells = floodFill(grid, seen, col, row, glyph);
			const minCol = Math.min(...cells.map((cell) => cell.col));
			const maxCol = Math.max(...cells.map((cell) => cell.col));
			const minRow = Math.min(...cells.map((cell) => cell.row));
			const maxRow = Math.max(...cells.map((cell) => cell.row));
			const width = maxCol - minCol + 1;
			const height = maxRow - minRow + 1;
			if (cells.length !== width * height) {
				fail(`building "${glyph}" at row ${minRow} col ${minCol} is not a solid rectangle`);
			}
			const type = buildingTypes[glyph]!;
			const index = (counts.get(type) ?? 0) + 1;
			counts.set(type, index);
			buildings.push({
				id: `${chunkId}-${type}-${index}`,
				type,
				col: minCol,
				row: minRow,
				width,
				height
			});
		}
	}
	return buildings;
}

function floodFill(
	grid: readonly (readonly string[])[],
	seen: boolean[][],
	col: number,
	row: number,
	glyph: string
): { col: number; row: number }[] {
	const cells: { col: number; row: number }[] = [];
	const stack = [{ col, row }];
	seen[row]![col] = true;
	while (stack.length > 0) {
		const cell = stack.pop()!;
		cells.push(cell);
		for (const [dc, dr] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		] as const) {
			const next = { col: cell.col + dc, row: cell.row + dr };
			if (grid[next.row]?.[next.col] !== glyph || seen[next.row]![next.col]) continue;
			seen[next.row]![next.col] = true;
			stack.push(next);
		}
	}
	return cells;
}

/** The most common walkable terrain around a tile, so an anchor blends into its path or grass. */
function groundAround(
	grid: readonly (readonly string[])[],
	col: number,
	row: number
): TerrainGlyph {
	const counts = new Map<TerrainGlyph, number>();
	let best: TerrainGlyph = BASE_GLYPH;
	let bestCount = 0;
	for (const [dc, dr] of [
		[0, -1],
		[1, 0],
		[0, 1],
		[-1, 0],
		[1, -1],
		[1, 1],
		[-1, 1],
		[-1, -1]
	] as const) {
		const glyph = grid[row + dr]?.[col + dc];
		if (!glyph || !isTerrainGlyph(glyph) || TERRAIN_LEGEND[glyph].blocks) continue;
		const count = (counts.get(glyph) ?? 0) + 1;
		counts.set(glyph, count);
		if (count > bestCount) {
			best = glyph;
			bestCount = count;
		}
	}
	return best;
}
