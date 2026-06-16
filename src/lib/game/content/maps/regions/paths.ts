import type { RegionFragment } from '$lib/game/content/maps/regions/types';

export const pathsRegion: RegionFragment = {
	groundPatches: [
		// Village (NE corner ~2,400,5,000) → Crossroads plaza (SW ~3,050,4,450)
		{ id: 'link-village-crossroads', x: 2_750, y: 4_700, width: 900, height: 64, tile: 'pathTile' },
		{
			id: 'link-village-crossroads-v',
			x: 3_050,
			y: 4_550,
			width: 64,
			height: 360,
			tile: 'pathTile'
		},
		// Crossroads → Coast (south to ~4,200,5,500)
		{ id: 'link-crossroads-coast', x: 3_900, y: 4_700, width: 900, height: 64, tile: 'pathTile' },
		{ id: 'link-crossroads-coast-v', x: 4_200, y: 5_100, width: 64, height: 900, tile: 'pathTile' },
		// Crossroads → Mistfen (NW to ~2,150,2,750). The vertical rises along the
		// plaza's west edge (x≈3050) to meet the crossroads, and the horizontal ties
		// into mistfen-approach-path at y≈2,750 — both seams overlap so the road is
		// visually continuous (guarded by the link-connectivity test).
		{
			id: 'link-crossroads-mistfen',
			x: 3_050,
			y: 3_150,
			width: 64,
			height: 820,
			tile: 'pathTile'
		},
		{
			id: 'link-crossroads-mistfen-h',
			x: 2_690,
			y: 2_750,
			width: 740,
			height: 64,
			tile: 'pathTile'
		},
		// Crossroads → Silverpine (north festival road already climbs; bridge the gap)
		{
			id: 'link-crossroads-silverpine',
			x: 3_300,
			y: 2_950,
			width: 500,
			height: 64,
			tile: 'pathTile'
		},
		// Crossroads → Wildwood (east to the existing forest road at ~4,200,5,347)
		{
			id: 'link-crossroads-wildwood',
			x: 4_000,
			y: 4_300,
			width: 64,
			height: 1_100,
			tile: 'pathTile'
		}
	]
};
