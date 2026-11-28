import { maps } from '$lib/game/content/maps';
import { buildGridMapPixels } from '$lib/game/content/maps/grid/map-image';
import { isGridWorldMap, resolveGridTerrain } from '$lib/game/content/maps/grid/runtime';

const images = new Map<string, string | null>();

/**
 * A data URL of a grid map's terrain at one pixel per tile, for the area map and
 * minimap to draw under their fog of war; null for maps without a tile grid.
 * `overlayIds` are the story overlays live on the field (`HudAreaMapState.terrainOverlays`),
 * so the raid's fire shows on the map too. Built once per map and overlay set.
 */
export function areaMapTerrainImage(
	mapId: string,
	overlayIds: readonly string[] = []
): string | null {
	const key = [mapId, ...overlayIds].join('|');
	const cached = images.get(key);
	if (cached !== undefined) return cached;
	const map = maps[mapId];
	let url: string | null = null;
	if (map && isGridWorldMap(map) && typeof document !== 'undefined') {
		const live = new Set(overlayIds);
		const terrain = resolveGridTerrain({
			...map,
			tileOverlays: (map.tileOverlays ?? []).filter((overlay) => live.has(overlay.id))
		});
		const { width, height, pixels } = buildGridMapPixels(terrain, map.tileGrid.buildings);
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d');
		if (context) {
			context.putImageData(new ImageData(pixels, width, height), 0, 0);
			url = canvas.toDataURL();
		}
	}
	images.set(key, url);
	return url;
}
