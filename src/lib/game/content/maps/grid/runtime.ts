import type { MapTileGrid, WorldMapDefinition } from '$lib/game/content/maps/types';
import type { NavigationGrid } from '$lib/game/core/navigation';

import {
	applyTileOverlays,
	buildGridNavigationGrid,
	buildGridTileLayers,
	type GridTileLayers
} from './layers';

export type GridWorldMap = WorldMapDefinition & { readonly tileGrid: MapTileGrid };

interface ResolvedGrid {
	readonly terrain: readonly string[];
	layers?: GridTileLayers;
	navigation?: NavigationGrid;
}

// Keyed by the compiled grid, then by which story overlays are live, so a map
// compiles its tiles and collision once per story state.
const resolvedGrids = new WeakMap<MapTileGrid, Map<string, ResolvedGrid>>();

export function isGridWorldMap(map: WorldMapDefinition): map is GridWorldMap {
	return map.tileGrid !== undefined;
}

export function resolveGridTileLayers(map: GridWorldMap): GridTileLayers {
	const resolved = resolveGrid(map);
	resolved.layers ??= buildGridTileLayers(resolved.terrain);
	return resolved.layers;
}

export function resolveGridNavigationGrid(map: GridWorldMap): NavigationGrid {
	const resolved = resolveGrid(map);
	resolved.navigation ??= buildGridNavigationGrid(map.id, resolved.terrain, map.tileGrid.buildings);
	return resolved.navigation;
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
