import { crossroadsDressingAsset, shrineDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

/**
 * Village region — the bottom-left (SW) settlement of Sundrop: house, well,
 * blacksmith, and shrine landmarks with their interior doorways, plaza ground
 * patches, perimeter boundaries, the SW ocean sliver, and plaza fences.
 *
 * Note: the `whispering-cave` landmark (NE forest) is authored in this fragment
 * to preserve the original landmark ordering of the composed meadow-entry map
 * (it sits between `sundrop-well` and `blacksmith`). Its transition, paths, and
 * combat live in the wildwood fragment.
 */
export const villageRegion: RegionFragment = {
	landmarks: [
		{
			id: 'hero-house-exterior',
			x: 531,
			y: 5_850,
			width: 294,
			height: 307,
			labelKey: 'content.maps.landmarks.hero-house-exterior.label'
		},
		{
			id: 'guild-hall-exterior',
			x: 2_048,
			y: 5_869,
			width: 384,
			height: 346,
			labelKey: 'content.maps.landmarks.guild-hall-exterior.label'
		},
		{
			id: 'item-shop-exterior',
			x: 2_138,
			y: 4_634,
			width: 307,
			height: 294,
			labelKey: 'content.maps.landmarks.item-shop-exterior.label'
		},
		{
			id: 'villager-house-1-exterior',
			x: 333,
			y: 5_152,
			width: 282,
			height: 256,
			labelKey: 'content.maps.landmarks.villager-house-1-exterior.label'
		},
		{
			id: 'villager-house-2-exterior',
			x: 1_011,
			y: 4_618,
			width: 422,
			height: 326,
			labelKey: 'content.maps.landmarks.villager-house-2-exterior.label'
		},
		{
			id: 'villager-house-3-exterior',
			x: 2_592,
			y: 4_778,
			width: 230,
			height: 416,
			labelKey: 'content.maps.landmarks.villager-house-3-exterior.label'
		},
		{
			id: 'sundrop-well',
			x: 1_536,
			y: 5_341,
			width: 141,
			height: 160,
			labelKey: 'content.maps.landmarks.sundrop-well.label'
		},
		{
			id: 'whispering-cave',
			x: 5_960,
			y: 1_800,
			width: 256,
			height: 224,
			labelKey: 'content.maps.landmarks.whispering-cave.label'
		},
		{
			id: 'blacksmith',
			x: 595,
			y: 4_877,
			width: 294,
			height: 282,
			labelKey: 'content.maps.landmarks.blacksmith.label'
		},
		{
			id: 'shrine-of-aurora',
			x: 1_050,
			y: 5_872,
			width: 307,
			height: 416,
			labelKey: 'content.maps.landmarks.shrine-of-aurora.label'
		}
	],
	mapDecor: [
		{
			id: 'village-maple-1',
			textureKey: shrineDressingAsset.key,
			frameName: 'autumnMaple',
			x: 1_180,
			y: 5_100,
			width: 220,
			height: 280,
			mode: 'image',
			collision: { id: 'village-maple-1-collision', x: 1_180, y: 5_190, width: 80, height: 70 }
		},
		{
			id: 'village-stall',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'marketStall',
			x: 1_900,
			y: 5_500,
			width: 240,
			height: 190,
			mode: 'image',
			collision: { id: 'village-stall-collision', x: 1_900, y: 5_540, width: 200, height: 110 }
		},
		{
			id: 'village-flowers',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'flowerBed',
			x: 1_536,
			y: 5_640,
			width: 160,
			height: 130,
			mode: 'image'
		},
		{
			id: 'village-hanging-lantern',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'hangingLantern',
			x: 1_536,
			y: 5_200,
			width: 110,
			height: 130,
			mode: 'image',
			depth: 'foreground'
		}
	],
	ambientNpcs: [{ id: 'village-wanderer', x: 1_700, y: 5_700, frameName: 'travelerNpc' }],
	transitions: [
		{
			id: 'meadow-to-hero-house',
			x: 531,
			y: 5_940,
			toMapId: 'hero-house',
			showMarker: false,
			arrival: { x: 256, y: 224, facing: 'up' }
		},
		{
			id: 'meadow-to-guild-hall',
			x: 2_048,
			y: 5_960,
			toMapId: 'guild-hall',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-item-shop',
			x: 2_138,
			y: 4_717,
			toMapId: 'item-shop',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-1',
			x: 333,
			y: 5_222,
			toMapId: 'villager-house-1',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-2',
			x: 1_011,
			y: 4_712,
			toMapId: 'villager-house-2',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-3',
			x: 2_592,
			y: 4_912,
			toMapId: 'villager-house-3',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-shrine-of-aurora',
			x: 1_050,
			y: 6_000,
			toMapId: 'shrine-of-aurora-interior',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		}
	],
	groundPatches: [
		{
			id: 'sundrop-plaza-stone',
			x: 1_536,
			y: 5_344,
			width: 672,
			height: 512,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'sundrop-north-lane',
			x: 1_536,
			y: 4_800,
			width: 64,
			height: 640,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-south-lane',
			x: 1_536,
			y: 5_818,
			width: 64,
			height: 448,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-west-lane',
			x: 720,
			y: 5_347,
			width: 992,
			height: 70,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-east-lane',
			x: 2_336,
			y: 5_347,
			width: 960,
			height: 70,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-northwest-branch',
			x: 896,
			y: 4_797,
			width: 384,
			height: 58,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-northeast-branch',
			x: 2_176,
			y: 4_797,
			width: 384,
			height: 58,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-southwest-branch',
			x: 896,
			y: 5_853,
			width: 384,
			height: 58,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-southeast-branch',
			x: 2_176,
			y: 5_853,
			width: 384,
			height: 58,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-home-pocket',
			x: 531,
			y: 6_002,
			width: 384,
			height: 96,
			tile: 'pathTile'
		}
	],
	blockers: [
		{
			id: 'meadow-north-boundary',
			x: 3_200,
			y: 32,
			width: 6_400,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'meadow-south-boundary',
			x: 3_200,
			y: 6_368,
			width: 6_400,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'meadow-west-boundary',
			x: 32,
			y: 3_200,
			width: 64,
			height: 6_400,
			kind: 'town-hedge'
		},
		{
			id: 'meadow-east-boundary',
			x: 6_368,
			y: 3_200,
			width: 64,
			height: 6_400,
			kind: 'town-hedge'
		},
		{
			id: 'sundrop-southwest-ocean',
			x: 114,
			y: 6_311,
			width: 100,
			height: 50,
			kind: 'ocean'
		}
	],
	fences: [
		{ id: 'sundrop-home-fence', x: 531, y: 6_072, width: 384, height: 32 },
		{ id: 'sundrop-plaza-west-fence', x: 1_120, y: 5_536, width: 32, height: 288 },
		{ id: 'sundrop-plaza-east-fence', x: 1_952, y: 5_536, width: 32, height: 288 }
	]
};
