import { maps } from '$lib/game/content/maps';
import { buildGridMapPixels } from '$lib/game/content/maps/grid/map-image';
import { isGridWorldMap } from '$lib/game/content/maps/grid/runtime';

const images = new Map<string, string | null>();

/**
 * A data URL of a grid map's terrain at one pixel per tile, for the area map and
 * minimap to draw under their fog of war; null for maps without a tile grid.
 * Built once per map.
 */
export function areaMapTerrainImage(mapId: string): string | null {
	const cached = images.get(mapId);
	if (cached !== undefined) return cached;
	const map = maps[mapId];
	let url: string | null = null;
	if (map && isGridWorldMap(map) && typeof document !== 'undefined') {
		const { width, height, pixels } = buildGridMapPixels(
			map.tileGrid.terrain,
			map.tileGrid.buildings
		);
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d');
		if (context) {
			context.putImageData(new ImageData(pixels, width, height), 0, 0);
			url = canvas.toDataURL();
		}
	}
	images.set(mapId, url);
	return url;
}
