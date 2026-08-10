import { crossroadsDressingAsset } from '$lib/game/content/assets';
import { rect, toMapRect } from '$lib/game/content/maps/layouts/layout-rects';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

export const crossroadsRegion: RegionFragment = {
	groundPatches: [
		{ ...toMapRect('crossroads-plaza', rect(3_264, 3_680, 1_024, 1_088)), tile: 'cobblestoneTile' },
		{
			...toMapRect('crossroads-north-trunk', rect(3_680, 2_816, 192, 864)),
			tile: 'pathTile'
		}
	],
	landmarks: [
		{
			id: 'castle-gate',
			x: 4_176,
			y: 2_976,
			width: 480,
			height: 320,
			labelKey: 'content.maps.landmarks.castle-gate.label'
		},
		{
			id: 'crossroads-waystone',
			x: 3_776,
			y: 4_224,
			width: 120,
			height: 150,
			labelKey: 'content.maps.landmarks.crossroads-waystone.label'
		}
	],
	mapDecor: [
		{
			id: 'castle-gate-sprite',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'castleGate',
			x: 4_176,
			y: 2_976,
			width: 480,
			height: 320,
			mode: 'image'
		},
		{
			id: 'crossroads-waystone-sprite',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'waystone',
			x: 3_776,
			y: 4_224,
			width: 140,
			height: 180,
			mode: 'image',
			collision: { id: 'crossroads-waystone-collision', x: 3_776, y: 4_264, width: 90, height: 80 }
		},
		{
			id: 'crossroads-lantern-west',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'poleLantern',
			x: 3_488,
			y: 3_904,
			width: 110,
			height: 220,
			mode: 'image'
		},
		{
			id: 'crossroads-lantern-east',
			textureKey: crossroadsDressingAsset.key,
			frameName: 'poleLantern',
			x: 4_064,
			y: 3_904,
			width: 110,
			height: 220,
			mode: 'image'
		}
	],
	discoveries: [
		{
			id: 'crossroads-waystone-sign',
			x: 3_904,
			y: 4_224,
			revealMarker: true,
			labelKey: 'content.maps.discoveries.crossroads-waystone-sign.label',
			descriptionKey: 'content.maps.discoveries.crossroads-waystone-sign.description'
		},
		{
			id: 'castle-gate-warning',
			x: 4_176,
			y: 3_200,
			revealMarker: true,
			labelKey: 'content.maps.discoveries.castle-gate-warning.label',
			descriptionKey: 'content.maps.discoveries.castle-gate-warning.description'
		}
	],
	pickups: [{ id: 'crossroads-cache', x: 4_032, y: 4_480, itemId: 'sunleaf-salve', quantity: 1 }],
	ambientNpcs: [
		{ id: 'crossroads-crier', x: 3_584, y: 4_384, frameName: 'crierNpc' },
		{ id: 'crossroads-traveler', x: 4_032, y: 4_384, frameName: 'travelerNpc' }
	],
	blockers: [
		{ id: 'castle-gate-block', x: 4_176, y: 2_836, width: 480, height: 96, kind: 'future-gate' }
	],
	fences: []
};
