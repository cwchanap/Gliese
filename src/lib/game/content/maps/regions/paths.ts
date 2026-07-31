import { villageDressingAsset } from '$lib/game/content/assets';
import type { MapBlocker, MapDecor } from '$lib/game/content/maps/types';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

const corridorWalls: MapBlocker[] = [
	{ id: 'corridor-wall-2a', x: 1_750, y: 4_190, width: 220, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-2b', x: 1_775, y: 4_510, width: 170, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-3a', x: 1_690, y: 4_225, width: 64, height: 220, kind: 'garden-hedge' },
	{ id: 'corridor-wall-3b', x: 2_010, y: 4_225, width: 64, height: 270, kind: 'garden-hedge' },
	{ id: 'corridor-wall-4a', x: 2_025, y: 3_940, width: 370, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-4b', x: 2_040, y: 4_260, width: 330, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-5a', x: 2_040, y: 4_225, width: 64, height: 270, kind: 'garden-hedge' },
	{ id: 'corridor-wall-5b', x: 2_360, y: 4_225, width: 64, height: 270, kind: 'garden-hedge' },
	{ id: 'corridor-wall-6a', x: 2_375, y: 4_190, width: 370, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-6b', x: 2_375, y: 4_510, width: 370, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-7a', x: 2_390, y: 4_225, width: 64, height: 270, kind: 'garden-hedge' },
	{ id: 'corridor-wall-7b', x: 2_710, y: 4_225, width: 64, height: 270, kind: 'garden-hedge' },
	{ id: 'corridor-wall-8a', x: 2_725, y: 3_940, width: 370, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-8b', x: 2_725, y: 4_260, width: 370, height: 64, kind: 'garden-hedge' },
	{ id: 'corridor-wall-9a', x: 2_740, y: 4_250, width: 64, height: 300, kind: 'garden-hedge' },
	{ id: 'corridor-wall-10b', x: 3_050, y: 4_560, width: 300, height: 64, kind: 'garden-hedge' }
];

const corridorWaymarker: MapDecor = {
	id: 'village-corridor-waymarker',
	textureKey: villageDressingAsset.key,
	frameName: 'poleLantern',
	x: 2_120,
	y: 4_440,
	width: 100,
	height: 200,
	mode: 'image',
	collision: {
		id: 'village-corridor-waymarker-collision',
		x: 2_120,
		y: 4_510,
		width: 50,
		height: 60
	}
};

export const pathsRegion: RegionFragment = {
	groundPatches: [
		{ id: 'link-village-crossroads', x: 2_750, y: 4_700, width: 900, height: 64, tile: 'pathTile' },
		{
			id: 'village-crossroads-nook',
			x: 2_980,
			y: 4_820,
			width: 240,
			height: 220,
			tile: 'autumnLeafTile'
		},
		{
			id: 'link-village-crossroads-v',
			x: 3_050,
			y: 4_550,
			width: 64,
			height: 360,
			tile: 'pathTile'
		},
		{ id: 'link-crossroads-coast', x: 3_900, y: 4_700, width: 900, height: 64, tile: 'pathTile' },
		{ id: 'link-crossroads-coast-v', x: 4_200, y: 5_100, width: 64, height: 900, tile: 'pathTile' },
		{ id: 'link-crossroads-mistfen', x: 3_050, y: 3_150, width: 64, height: 820, tile: 'pathTile' },
		{
			id: 'link-crossroads-mistfen-h',
			x: 2_690,
			y: 2_750,
			width: 740,
			height: 64,
			tile: 'pathTile'
		},
		{
			id: 'link-crossroads-silverpine',
			x: 3_300,
			y: 2_950,
			width: 500,
			height: 64,
			tile: 'pathTile'
		},
		{
			id: 'link-crossroads-wildwood',
			x: 4_000,
			y: 4_300,
			width: 64,
			height: 1_100,
			tile: 'pathTile'
		}
	],
	blockers: corridorWalls,
	mapDecor: [corridorWaymarker]
};
