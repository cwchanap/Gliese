import type { MapGridBuilding, MapTileOverlay } from '$lib/game/content/maps/types';
import {
	compileNavigationGrid,
	isWalkable,
	type NavigationGrid,
	type NavigationMaskSource
} from '$lib/game/core/navigation';

import { GRID_TILE_SIZE } from './compile';
import {
	BASE_GLYPH,
	TERRAIN_LEGEND,
	isTerrainGlyph,
	type TerrainDefinition,
	type TerrainGlyph
} from './legend';
import { EDGE_E, EDGE_N, EDGE_S, EDGE_W, tileIdFor } from './tileset';

/** Collision is resolved on half-tile cells, with the same clearance as the interiors. */
export const GRID_NAVIGATION_CELL_SIZE = 16;
export const GRID_NAVIGATION_CLEARANCE = 12;

/** Phaser tile data: one tile id per cell, -1 for an empty canopy cell. */
export interface GridTileLayers {
	readonly ground: number[][];
	readonly canopy: number[][];
}

/** The terrain with each overlay's cells written over it, in order. */
export function applyTileOverlays(
	terrain: readonly string[],
	overlays: readonly MapTileOverlay[]
): string[] {
	if (overlays.length === 0) return [...terrain];
	const grid = terrain.map((line) => [...line]);
	for (const overlay of overlays) {
		for (const cell of overlay.cells) grid[cell.row]![cell.col] = cell.glyph;
	}
	return grid.map((line) => line.join(''));
}

export function buildGridTileLayers(terrain: readonly string[]): GridTileLayers {
	const baseTile = tileIdFor(BASE_GLYPH);
	const ground: number[][] = [];
	const canopy: number[][] = [];
	for (const [row, line] of terrain.entries()) {
		const groundRow: number[] = [];
		const canopyRow: number[] = [];
		for (let col = 0; col < line.length; col += 1) {
			const glyph = terrainGlyphAt(terrain, col, row);
			const definition = TERRAIN_LEGEND[glyph];
			const tile = tileIdFor(glyph, definition.autotile ? edgeMask(terrain, col, row, glyph) : 0);
			if (definition.layer === 'canopy') {
				groundRow.push(baseTile);
				canopyRow.push(tile);
			} else {
				groundRow.push(tile);
				canopyRow.push(-1);
			}
		}
		ground.push(groundRow);
		canopy.push(canopyRow);
	}
	return { ground, canopy };
}

/**
 * Which neighbours an autotile joins: the same glyph, a glyph in its `connects`
 * list, or the map edge (so terrain runs off the map without a border).
 */
export function edgeMask(
	terrain: readonly string[],
	col: number,
	row: number,
	glyph: TerrainGlyph
): number {
	const connects = (TERRAIN_LEGEND[glyph] as TerrainDefinition).connects ?? '';
	const joins = (neighbour: string | undefined) =>
		neighbour === undefined || neighbour === glyph || connects.includes(neighbour);
	return (
		(joins(neighbourAt(terrain, col, row - 1)) ? EDGE_N : 0) |
		(joins(neighbourAt(terrain, col + 1, row)) ? EDGE_E : 0) |
		(joins(neighbourAt(terrain, col, row + 1)) ? EDGE_S : 0) |
		(joins(neighbourAt(terrain, col - 1, row)) ? EDGE_W : 0)
	);
}

export function buildGridNavigationSource(
	mapId: string,
	terrain: readonly string[],
	buildings: readonly MapGridBuilding[]
): NavigationMaskSource {
	const scale = GRID_TILE_SIZE / GRID_NAVIGATION_CELL_SIZE;
	const blocked = terrain.map((line, row) =>
		[...line].map((_, col) => TERRAIN_LEGEND[terrainGlyphAt(terrain, col, row)].blocks)
	);
	for (const building of buildings) {
		for (let row = building.row; row < building.row + building.height; row += 1) {
			for (let col = building.col; col < building.col + building.width; col += 1) {
				blocked[row]![col] = true;
			}
		}
	}
	const rows = blocked.flatMap((line) => {
		const cells = line.map((isBlocked) => (isBlocked ? '#' : '.').repeat(scale)).join('');
		return Array<string>(scale).fill(cells);
	});
	return {
		id: `${mapId}-grid-navigation`,
		mapId,
		cellSizePx: GRID_NAVIGATION_CELL_SIZE,
		widthCells: (terrain[0]?.length ?? 0) * scale,
		heightCells: terrain.length * scale,
		clearancePx: GRID_NAVIGATION_CLEARANCE,
		rows
	};
}

export function buildGridNavigationGrid(
	mapId: string,
	terrain: readonly string[],
	buildings: readonly MapGridBuilding[]
): NavigationGrid {
	return compileNavigationGrid(buildGridNavigationSource(mapId, terrain, buildings));
}

/**
 * Names of the points the player cannot walk to from `from`, flood-filling the
 * navigation grid (so gaps narrower than two tiles count as closed). A point
 * counts as reached when a reached cell centre lies within `reachPx` of it.
 */
export function findUnreachablePoints(
	grid: NavigationGrid,
	from: { readonly x: number; readonly y: number },
	points: readonly { readonly name: string; readonly x: number; readonly y: number }[],
	reachPx = 24
): string[] {
	const size = grid.cellSizePx;
	const reached = new Uint8Array(grid.widthCells * grid.heightCells);
	const walkable = (col: number, row: number) =>
		col >= 0 &&
		row >= 0 &&
		col < grid.widthCells &&
		row < grid.heightCells &&
		isWalkable(grid, col * size + size / 2, row * size + size / 2);
	const start = { col: Math.floor(from.x / size), row: Math.floor(from.y / size) };
	const queue = walkable(start.col, start.row) ? [start] : [];
	if (queue.length > 0) reached[start.row * grid.widthCells + start.col] = 1;
	for (let index = 0; index < queue.length; index += 1) {
		const cell = queue[index]!;
		for (const [dc, dr] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		] as const) {
			const col = cell.col + dc;
			const row = cell.row + dr;
			if (!walkable(col, row) || reached[row * grid.widthCells + col]) continue;
			reached[row * grid.widthCells + col] = 1;
			queue.push({ col, row });
		}
	}
	const radius = Math.ceil(reachPx / size);
	return points
		.filter((point) => {
			const centre = { col: Math.floor(point.x / size), row: Math.floor(point.y / size) };
			for (let row = centre.row - radius; row <= centre.row + radius; row += 1) {
				for (let col = centre.col - radius; col <= centre.col + radius; col += 1) {
					if (row < 0 || col < 0 || row >= grid.heightCells || col >= grid.widthCells) continue;
					if (!reached[row * grid.widthCells + col]) continue;
					const dx = col * size + size / 2 - point.x;
					const dy = row * size + size / 2 - point.y;
					if (dx * dx + dy * dy <= reachPx * reachPx) return false;
				}
			}
			return true;
		})
		.map((point) => point.name);
}

function neighbourAt(terrain: readonly string[], col: number, row: number): string | undefined {
	return terrain[row]?.[col];
}

function terrainGlyphAt(terrain: readonly string[], col: number, row: number): TerrainGlyph {
	const glyph = terrain[row]![col]!;
	if (!isTerrainGlyph(glyph))
		throw new Error(`row ${row} col ${col}: unknown terrain glyph "${glyph}"`);
	return glyph;
}
