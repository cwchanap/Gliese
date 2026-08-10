import { villageDressingAsset } from '$lib/game/content/assets';
import { meadowEntryV2RoutePatchesFor } from '$lib/game/content/maps/layouts/meadow-entry-v2';
import { toMapRect } from '$lib/game/content/maps/layouts/layout-rects';
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

const sharedRoutePatches = meadowEntryV2RoutePatchesFor('paths').map(
	({ id, rect: layoutRect }) => ({ ...toMapRect(id, layoutRect), tile: 'pathTile' as const })
);

export const pathsRegion: RegionFragment = {
	groundPatches: sharedRoutePatches,
	blockers: [],
	mapDecor: [corridorWaymarker]
};
