import type { MapTileGrid, WorldMapDefinition } from '$lib/game/content/maps/types';
import type { NavigationGrid } from '$lib/game/core/navigation';
import type { Direction } from '$lib/game/core/types';

import { GRID_TILE_SIZE } from './compile';
import {
	applyTileOverlays,
	buildGridNavigationGrid,
	buildGridTileLayers,
	type GridTileLayers
} from './layers';
import { buildGridObjects, type GridObject } from './objects';

export type GridWorldMap = WorldMapDefinition & { readonly tileGrid: MapTileGrid };

interface ResolvedGrid {
	readonly terrain: readonly string[];
	layers?: GridTileLayers;
	objects?: GridObject[];
	navigation?: NavigationGrid;
}

// Keyed by the compiled grid, then by which story overlays are live, so a map
// compiles its tiles, objects and collision once per story state.
const resolvedGrids = new WeakMap<MapTileGrid, Map<string, ResolvedGrid>>();

export function isGridWorldMap(map: WorldMapDefinition): map is GridWorldMap {
	return map.tileGrid !== undefined;
}

export function resolveGridTileLayers(map: GridWorldMap): GridTileLayers {
	const resolved = resolveGrid(map);
	resolved.layers ??= buildGridTileLayers(resolved.terrain);
	return resolved.layers;
}

export function resolveGridObjects(map: GridWorldMap): readonly GridObject[] {
	const resolved = resolveGrid(map);
	resolved.objects ??= buildGridObjects(resolved.terrain, map.tileGrid.buildings);
	return resolved.objects;
}

export function resolveGridNavigationGrid(map: GridWorldMap): NavigationGrid {
	const resolved = resolveGrid(map);
	resolved.navigation ??= buildGridNavigationGrid(map.id, resolved.terrain, map.tileGrid.buildings);
	return resolved.navigation;
}

export function resolveGridTerrain(map: GridWorldMap): readonly string[] {
	return resolveGrid(map).terrain;
}

const sealedGateGlyph = '!';

const gateFacingOffsets: Record<Direction, { x: number; y: number }> = {
	up: { x: 0, y: -GRID_TILE_SIZE },
	down: { x: 0, y: GRID_TILE_SIZE },
	left: { x: -GRID_TILE_SIZE, y: 0 },
	right: { x: GRID_TILE_SIZE, y: 0 }
};

export function facesSealedGate(
	map: WorldMapDefinition,
	x: number,
	y: number,
	facing: Direction
): boolean {
	if (!isGridWorldMap(map)) return false;
	const offset = gateFacingOffsets[facing];
	const col = Math.floor((x + offset.x) / GRID_TILE_SIZE);
	const row = Math.floor((y + offset.y) / GRID_TILE_SIZE);
	return resolveGridTerrain(map)[row]?.[col] === sealedGateGlyph;
}

/** `map` should already be story-gated (see `applyStoryGates`), so only live overlays apply. */
function resolveGrid(map: GridWorldMap): ResolvedGrid {
	const overlays = map.tileOverlays ?? [];
	const key = overlays.map((overlay) => overlay.id).join('|');
	let byOverlays = resolvedGrids.get(map.tileGrid);
	if (!byOverlays) {
		byOverlays = new Map();
		resolvedGrids.set(map.tileGrid, byOverlays);
	}
	let resolved = byOverlays.get(key);
	if (!resolved) {
		resolved = { terrain: applyTileOverlays(map.tileGrid.terrain, overlays) };
		byOverlays.set(key, resolved);
	}
	return resolved;
}
