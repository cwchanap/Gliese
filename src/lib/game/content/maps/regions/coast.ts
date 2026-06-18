import { coastDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

export const coastRegion: RegionFragment = {
	groundPatches: [
		{ id: 'coast-sea', x: 4_600, y: 6_180, width: 3_000, height: 360, tile: 'seaTile' },
		{ id: 'coast-sand', x: 4_600, y: 5_840, width: 3_000, height: 360, tile: 'sandTile' },
		{ id: 'coast-approach-path', x: 4_200, y: 5_500, width: 64, height: 360, tile: 'pathTile' }
	],
	landmarks: [
		{
			id: 'ferry-crossing',
			x: 3_600,
			y: 5_720,
			width: 360,
			height: 320,
			labelKey: 'content.maps.landmarks.ferry-crossing.label'
		}
	],
	mapDecor: [
		{
			id: 'coast-torii',
			textureKey: coastDressingAsset.key,
			frameName: 'torii',
			x: 4_200,
			y: 6_160,
			width: 320,
			height: 360,
			mode: 'image'
		},
		{
			id: 'coast-ferry-shrine',
			textureKey: coastDressingAsset.key,
			frameName: 'ferryShrine',
			x: 3_600,
			y: 5_720,
			width: 320,
			height: 300,
			mode: 'image',
			collision: { id: 'coast-ferry-shrine-collision', x: 3_600, y: 5_760, width: 200, height: 140 }
		},
		{
			id: 'coast-boat',
			textureKey: coastDressingAsset.key,
			frameName: 'fishingBoat',
			x: 5_000,
			y: 5_900,
			width: 260,
			height: 180,
			mode: 'image',
			collision: { id: 'coast-boat-collision', x: 5_000, y: 5_900, width: 200, height: 120 }
		},
		{
			id: 'coast-net',
			textureKey: coastDressingAsset.key,
			frameName: 'fishingNet',
			x: 4_700,
			y: 5_780,
			width: 180,
			height: 160,
			mode: 'image'
		},
		{
			id: 'coast-tidepool',
			textureKey: coastDressingAsset.key,
			frameName: 'tidePool',
			x: 5_400,
			y: 6_040,
			width: 220,
			height: 160,
			mode: 'image'
		},
		{
			id: 'coast-driftwood',
			textureKey: coastDressingAsset.key,
			frameName: 'driftwood',
			x: 4_000,
			y: 5_900,
			width: 200,
			height: 130,
			mode: 'image'
		},
		{
			id: 'coast-jetty',
			textureKey: coastDressingAsset.key,
			frameName: 'jetty',
			x: 4_900,
			y: 6_180,
			width: 220,
			height: 320,
			mode: 'image'
		},
		{
			id: 'coast-foam',
			textureKey: coastDressingAsset.key,
			frameName: 'shorelineFoam',
			x: 4_600,
			y: 6_000,
			width: 3_000,
			height: 80,
			mode: 'tile',
			depth: 'floor'
		},
		{
			id: 'coast-approach-net',
			textureKey: coastDressingAsset.key,
			frameName: 'fishingNet',
			x: 4_200,
			y: 5_300,
			width: 160,
			height: 140,
			mode: 'image'
		}
	],
	ambientNpcs: [{ id: 'coast-fisher', x: 4_500, y: 5_780, frameName: 'fisherNpc' }],
	pickups: [
		{ id: 'coast-salve', x: 5_300, y: 5_820, itemId: 'sunleaf-salve', quantity: 1 },
		{ id: 'coast-jetty-catch', x: 4_900, y: 6_120, itemId: 'field-potion', quantity: 1 }
	],
	blockers: [{ id: 'coast-sea-wall', x: 4_600, y: 6_320, width: 3_000, height: 80, kind: 'ocean' }]
};
