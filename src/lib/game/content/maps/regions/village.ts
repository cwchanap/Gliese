import { crossroadsDressingAsset, shrineDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

/**
 * Village region — the bottom-left (SW) settlement of Sundrop: house, well,
 * blacksmith, and shrine landmarks with their interior doorways, plaza ground
 * patches, perimeter boundaries, the SW ocean sliver, and plaza fences.
 *
 * The NE `whispering-cave` landmark lives in the wildwood fragment alongside
 * its transition, paths, and combat pockets so all Whispering Cave content is
 * co-located. Landmarks render in array order but none overlap, so the split
 * has no visual effect.
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
			id: 'village-waymarker',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'poleLantern',
			x: 2_700,
			y: 4_760,
			width: 110,
			height: 220,
			mode: 'image',
			collision: { id: 'village-waymarker-collision', x: 2_700, y: 4_840, width: 50, height: 60 }
		},
		{
			id: 'village-roadside-flowers',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'flowerBed',
			x: 3_040,
			y: 4_900,
			width: 160,
			height: 130,
			mode: 'image'
		},
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
	pickups: [
		{ id: 'village-roadside-cache', x: 3_040, y: 4_930, itemId: 'field-potion', quantity: 1 }
	],
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
		},
		{
			id: 'sundrop-southwest-ocean-patch',
			x: 114,
			y: 6_311,
			width: 100,
			height: 50,
			tile: 'seaTile'
		},
		// Visual fill for the open vertical gap between the plaza's east lane
		// (y≈5347) and the village→crossroads horizontal lane (y≈4700). Without
		// this strip the connector reads as empty grass; with it the route is a
		// continuous lane bounded by the field hedges below.
		{
			id: 'village-lane-connector',
			x: 2_750,
			y: 5_020,
			width: 64,
			height: 700,
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
		},
		// Field seal south of the village→crossroads lane, west of villager-house-3
		// (which sits at x≈2477–2707). Blocks the open-field diagonal from the
		// plaza up toward the crossroads; the gap east of x2477 (house-3's west
		// wall + the connector at x≈2750) stays open so the authored lane remains
		// the only north route. y=4900 sits between the lane (4700) and the
		// house-3 doorway arrival (5024) so it touches neither.
		{
			id: 'village-field-boundary-south',
			x: 2_150,
			y: 4_900,
			width: 650,
			height: 64,
			kind: 'town-hedge'
		},
		// Connector east bank: flanks the vertical connector at x≈2750 on its
		// east side, giving the plaza→lane diagonal a right-hand boundary so the
		// route reads as a lane rather than open grass south of house-3.
		{
			id: 'village-connector-east-bank',
			x: 2_680,
			y: 5_150,
			width: 64,
			height: 350,
			kind: 'town-hedge'
		},
		// Field seal north of the lane, acting as the south wall of the
		// crossroads approach field. Forces northbound traffic onto the neck at
		// x≈3050 instead of cutting across open grass west of the hub.
		{
			id: 'village-field-boundary-north',
			x: 2_400,
			y: 4_400,
			width: 1_000,
			height: 64,
			kind: 'town-hedge'
		}
	],
	fences: [
		{ id: 'sundrop-home-fence', x: 531, y: 6_072, width: 384, height: 32 },
		{ id: 'sundrop-plaza-west-fence', x: 1_120, y: 5_536, width: 32, height: 288 },
		{ id: 'sundrop-plaza-east-fence', x: 1_952, y: 5_536, width: 32, height: 288 },
		{ id: 'village-road-west-fence-a', x: 2_670, y: 4_835, width: 620, height: 32 },
		{ id: 'village-road-east-fence-a', x: 2_760, y: 4_565, width: 560, height: 32 },
		{ id: 'village-road-west-fence-b', x: 2_925, y: 4_560, width: 32, height: 360 },
		{ id: 'village-road-east-fence-b', x: 3_210, y: 4_560, width: 32, height: 340 },
		{ id: 'village-reststop-fence', x: 3_090, y: 5_050, width: 330, height: 32 }
	]
};
