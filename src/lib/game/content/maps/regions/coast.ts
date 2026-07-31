import { coastDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

export const coastRegion: RegionFragment = {
	groundPatches: [
		{ id: 'coast-sea', x: 4_600, y: 6_180, width: 3_000, height: 360, tile: 'seaTile' },
		{ id: 'coast-sand', x: 4_600, y: 5_840, width: 3_000, height: 360, tile: 'sandTile' },
		{ id: 'coast-approach-path', x: 4_200, y: 5_500, width: 64, height: 360, tile: 'pathTile' },
		{ id: 'coast-ferry-fork', x: 3_900, y: 5_520, width: 700, height: 64, tile: 'sandTile' },
		{ id: 'coast-shrine-landing', x: 3_600, y: 5_650, width: 420, height: 260, tile: 'sandTile' },
		{ id: 'coast-tidepool-pocket', x: 5_280, y: 5_940, width: 620, height: 280, tile: 'sandTile' }
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
			x: 4_240,
			y: 6_080,
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
			x: 5_160,
			y: 5_880,
			width: 260,
			height: 180,
			mode: 'image',
			collision: { id: 'coast-boat-collision', x: 5_160, y: 5_890, width: 200, height: 120 }
		},
		{
			id: 'coast-net',
			textureKey: coastDressingAsset.key,
			frameName: 'fishingNet',
			x: 5_240,
			y: 5_960,
			width: 180,
			height: 160,
			mode: 'image'
		},
		{
			id: 'coast-tidepool',
			textureKey: coastDressingAsset.key,
			frameName: 'tidePool',
			x: 5_440,
			y: 6_020,
			width: 220,
			height: 160,
			mode: 'image'
		},
		{
			id: 'coast-driftwood',
			textureKey: coastDressingAsset.key,
			frameName: 'driftwood',
			x: 3_920,
			y: 5_520,
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
			x: 4_120,
			y: 5_380,
			width: 160,
			height: 140,
			mode: 'image'
		},
		{
			id: 'coast-fork-west-driftwood-wall',
			textureKey: coastDressingAsset.key,
			frameName: 'driftwood',
			x: 3_830,
			y: 5_400,
			width: 300,
			height: 130,
			mode: 'image',
			collision: {
				id: 'coast-fork-west-driftwood-wall-collision',
				x: 3_830,
				y: 5_400,
				width: 260,
				height: 80
			}
		},
		{
			id: 'coast-shrine-pocket-boundary',
			textureKey: coastDressingAsset.key,
			frameName: 'driftwood',
			x: 3_420,
			y: 5_650,
			width: 220,
			height: 130,
			mode: 'image',
			collision: {
				id: 'coast-shrine-pocket-boundary-collision',
				x: 3_420,
				y: 5_650,
				width: 180,
				height: 80
			}
		},
		{
			id: 'coast-tidepool-rock-wall',
			textureKey: coastDressingAsset.key,
			frameName: 'driftwood',
			x: 5_650,
			y: 5_820,
			width: 260,
			height: 130,
			mode: 'image',
			collision: {
				id: 'coast-tidepool-rock-wall-collision',
				x: 5_650,
				y: 5_820,
				width: 220,
				height: 80
			}
		},
		{
			id: 'coast-jetty-neck',
			textureKey: coastDressingAsset.key,
			frameName: 'driftwood',
			x: 5_060,
			y: 6_000,
			width: 220,
			height: 130,
			mode: 'image',
			collision: { id: 'coast-jetty-neck-collision', x: 5_060, y: 6_000, width: 180, height: 80 }
		}
	],
	discoveries: [
		{
			id: 'ferry-shrine-lore',
			x: 3_600,
			y: 5_500,
			revealMarker: true,
			labelKey: 'content.maps.discoveries.ferry-shrine-lore.label',
			descriptionKey: 'content.maps.discoveries.ferry-shrine-lore.description'
		},
		{
			id: 'coast-jetty-foreshadow',
			x: 4_900,
			y: 6_180,
			revealMarker: false,
			labelKey: 'content.maps.discoveries.coast-jetty-foreshadow.label',
			descriptionKey: 'content.maps.discoveries.coast-jetty-foreshadow.description'
		}
	],
	ambientNpcs: [{ id: 'coast-fisher', x: 3_840, y: 5_570, frameName: 'fisherNpc' }],
	pickups: [
		{ id: 'coast-salve', x: 5_440, y: 5_930, itemId: 'sunleaf-salve', quantity: 1 },
		{ id: 'coast-jetty-catch', x: 4_760, y: 6_060, itemId: 'field-potion', quantity: 1 }
	],
	blockers: [
		{ id: 'coast-sea-wall', x: 4_600, y: 6_320, width: 3_000, height: 80, kind: 'ocean' },
		// South wall of the crossroads→coast exit mouth, giving the approach a
		// left/right boundary where it leaves the hub.
		{
			id: 'coast-crossroads-mouth-bank',
			x: 3_500,
			y: 4_650,
			width: 64,
			height: 400,
			kind: 'town-hedge'
		},
		// West bank of the lower coast approach so the sandy corridor reads as a
		// lane rather than open beach.
		{
			id: 'coast-approach-west-bank',
			x: 4_080,
			y: 5_950,
			width: 64,
			height: 450,
			kind: 'town-hedge'
		}
	],
	fences: [
		{ id: 'coast-approach-west-fence', x: 4_020, y: 5_250, width: 32, height: 520 },
		{ id: 'coast-approach-east-fence', x: 4_380, y: 5_250, width: 32, height: 520 },
		{ id: 'coast-fork-east-field-fence', x: 4_460, y: 5_660, width: 500, height: 32 }
	]
};
