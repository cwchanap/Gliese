import { crossroadsDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

/**
 * Village region — the bottom-left (SW) settlement of Sundrop. All buildings
 * are clustered into a compact ~1200×1000px layout centered near (1000, 5100).
 *
 * The village is temporarily "open" (no maze walls, no field-boundary hedges) —
 * Task 3 adds the hedge network that shapes corridors between buildings.
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
			x: 700,
			y: 5_450,
			width: 294,
			height: 307,
			labelKey: 'content.maps.landmarks.hero-house-exterior.label'
		},
		{
			id: 'guild-hall-exterior',
			x: 1_400,
			y: 4_900,
			width: 384,
			height: 346,
			labelKey: 'content.maps.landmarks.guild-hall-exterior.label'
		},
		{
			id: 'item-shop-exterior',
			x: 600,
			y: 4_800,
			width: 307,
			height: 294,
			labelKey: 'content.maps.landmarks.item-shop-exterior.label'
		},
		{
			id: 'villager-house-1-exterior',
			x: 900,
			y: 4_750,
			width: 282,
			height: 256,
			labelKey: 'content.maps.landmarks.villager-house-1-exterior.label'
		},
		{
			id: 'villager-house-2-exterior',
			x: 1_200,
			y: 4_700,
			width: 422,
			height: 326,
			labelKey: 'content.maps.landmarks.villager-house-2-exterior.label'
		},
		{
			id: 'villager-house-3-exterior',
			x: 1_450,
			y: 5_400,
			width: 230,
			height: 416,
			labelKey: 'content.maps.landmarks.villager-house-3-exterior.label'
		},
		{
			id: 'sundrop-well',
			x: 1_000,
			y: 5_100,
			width: 141,
			height: 160,
			labelKey: 'content.maps.landmarks.sundrop-well.label'
		},
		{
			id: 'blacksmith',
			x: 500,
			y: 5_200,
			width: 294,
			height: 282,
			labelKey: 'content.maps.landmarks.blacksmith.label'
		},
		{
			id: 'shrine-of-aurora',
			x: 1_000,
			y: 5_400,
			width: 307,
			height: 416,
			labelKey: 'content.maps.landmarks.shrine-of-aurora.label'
		}
	],
	mapDecor: [
		{
			id: 'village-hanging-lantern',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'hangingLantern',
			x: 1_000,
			y: 4_950,
			width: 110,
			height: 130,
			mode: 'image',
			depth: 'foreground'
		}
	],
	ambientNpcs: [{ id: 'village-wanderer', x: 1_000, y: 5_150, frameName: 'travelerNpc' }],
	pickups: [],
	transitions: [
		{
			id: 'meadow-to-hero-house',
			x: 700,
			y: 5_600,
			toMapId: 'hero-house',
			showMarker: false,
			arrival: { x: 256, y: 224, facing: 'up' }
		},
		{
			id: 'meadow-to-guild-hall',
			x: 1_400,
			y: 5_070,
			toMapId: 'guild-hall',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-item-shop',
			x: 600,
			y: 4_945,
			toMapId: 'item-shop',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-1',
			x: 900,
			y: 4_880,
			toMapId: 'villager-house-1',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-2',
			x: 1_200,
			y: 4_870,
			toMapId: 'villager-house-2',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-3',
			x: 1_450,
			y: 5_610,
			toMapId: 'villager-house-3',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-shrine-of-aurora',
			x: 1_000,
			y: 5_610,
			toMapId: 'shrine-of-aurora-interior',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		}
	],
	groundPatches: [
		{
			id: 'sundrop-plaza-stone',
			x: 1_000,
			y: 5_100,
			width: 400,
			height: 400,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'village-spawn-pocket',
			x: 700,
			y: 5_550,
			width: 300,
			height: 100,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-southwest-ocean-patch',
			x: 114,
			y: 6_311,
			width: 100,
			height: 50,
			tile: 'seaTile'
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
	fences: []
};
