import { villageDressingAsset } from '$lib/game/content/assets';
import { rect, toMapRect } from '$lib/game/content/maps/layouts/layout-rects';
import type { MapDecor } from '$lib/game/content/maps/types';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

const corridorWaymarker: MapDecor = {
	id: 'village-corridor-waymarker',
	textureKey: villageDressingAsset.key,
	frameName: 'poleLantern',
	x: 3_040,
	y: 4_544,
	width: 100,
	height: 200,
	mode: 'image'
};

export const pathsRegion: RegionFragment = {
	groundPatches: [
		{ ...toMapRect('village-to-crossroads', rect(2_816, 4_608, 448, 160)), tile: 'pathTile' },
		{ ...toMapRect('crossroads-to-mistfen', rect(3_072, 3_072, 608, 160)), tile: 'pathTile' },
		{ ...toMapRect('crossroads-to-silverpine', rect(3_680, 2_432, 192, 384)), tile: 'pathTile' },
		{ ...toMapRect('crossroads-to-wildwood', rect(4_288, 4_144, 704, 160)), tile: 'pathTile' },
		{ ...toMapRect('crossroads-to-coast', rect(4_128, 4_768, 192, 800)), tile: 'pathTile' }
	],
	blockers: [],
	mapDecor: [corridorWaymarker]
};
