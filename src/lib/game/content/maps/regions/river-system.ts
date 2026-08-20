import {
	MEADOW_ENTRY_V2_CROSSINGS,
	MEADOW_ENTRY_V2_RIVER_SEGMENTS
} from '$lib/game/content/maps/layouts/meadow-entry-v2';
import { toMapRect } from '$lib/game/content/maps/layouts/layout-rects';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

const groundPatches = MEADOW_ENTRY_V2_RIVER_SEGMENTS.map(({ id, rect: bounds }) => ({
	...toMapRect(`${id}-water`, bounds),
	tile: 'seaTile' as const
}));

const blockers = MEADOW_ENTRY_V2_RIVER_SEGMENTS.map(({ id, rect: bounds }) => ({
	...toMapRect(`${id}-collision`, bounds),
	kind: 'ocean' as const
}));

const crossingPatches = Object.entries(MEADOW_ENTRY_V2_CROSSINGS).map(([id, bounds]) => ({
	...toMapRect(`${id}-path`, bounds),
	tile: 'pathTile' as const
}));

export const riverSystemRegion: RegionFragment = {
	groundPatches: [...groundPatches, ...crossingPatches],
	blockers
};
