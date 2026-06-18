import { marshDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

export const mistfenRegion: RegionFragment = {
	groundPatches: [
		{ id: 'mistfen-basin', x: 1_250, y: 1_750, width: 2_000, height: 2_300, tile: 'marshMudTile' },
		{ id: 'mistfen-pool-west', x: 800, y: 1_400, width: 420, height: 300, tile: 'seaTile' },
		{ id: 'mistfen-pool-east', x: 1_700, y: 2_100, width: 360, height: 280, tile: 'seaTile' },
		{ id: 'mistfen-approach-path', x: 2_150, y: 2_750, width: 360, height: 64, tile: 'pathTile' }
	],
	landmarks: [
		{
			id: 'witchwood-gate',
			x: 1_200,
			y: 620,
			width: 360,
			height: 300,
			labelKey: 'content.maps.landmarks.witchwood-gate.label'
		}
	],
	mapDecor: [
		{
			id: 'witchwood-gate-sprite',
			textureKey: marshDressingAsset.key,
			frameName: 'witchwoodGate',
			x: 1_200,
			y: 620,
			width: 384,
			height: 384,
			mode: 'image'
		},
		{
			id: 'mistfen-dead-tree-west',
			textureKey: marshDressingAsset.key,
			frameName: 'deadTree',
			x: 620,
			y: 1_120,
			width: 200,
			height: 240,
			mode: 'image',
			collision: { id: 'mistfen-dead-tree-west-collision', x: 620, y: 1_180, width: 80, height: 70 }
		},
		{
			id: 'mistfen-dead-tree-east',
			textureKey: marshDressingAsset.key,
			frameName: 'deadTree',
			x: 1_900,
			y: 1_500,
			width: 200,
			height: 240,
			mode: 'image',
			collision: {
				id: 'mistfen-dead-tree-east-collision',
				x: 1_900,
				y: 1_560,
				width: 80,
				height: 70
			}
		},
		{
			id: 'mistfen-toxic-bloom',
			textureKey: marshDressingAsset.key,
			frameName: 'toxicBloom',
			x: 1_040,
			y: 2_000,
			width: 150,
			height: 150,
			mode: 'image'
		},
		{
			id: 'mistfen-reeds-1',
			textureKey: marshDressingAsset.key,
			frameName: 'reeds',
			x: 1_500,
			y: 1_300,
			width: 240,
			height: 200,
			mode: 'tile'
		},
		{
			id: 'mistfen-marsh-rock',
			textureKey: marshDressingAsset.key,
			frameName: 'marshRock',
			x: 720,
			y: 2_300,
			width: 170,
			height: 140,
			mode: 'image',
			collision: { id: 'mistfen-marsh-rock-collision', x: 720, y: 2_320, width: 120, height: 90 }
		},
		{
			id: 'mistfen-bloom-trail-1',
			textureKey: marshDressingAsset.key,
			frameName: 'toxicBloom',
			x: 1_220,
			y: 1_180,
			width: 150,
			height: 150,
			mode: 'image'
		},
		{
			id: 'mistfen-bloom-trail-2',
			textureKey: marshDressingAsset.key,
			frameName: 'toxicBloom',
			x: 1_700,
			y: 2_200,
			width: 150,
			height: 150,
			mode: 'image'
		},
		{
			id: 'mistfen-fog',
			textureKey: marshDressingAsset.key,
			frameName: 'fog',
			x: 1_250,
			y: 1_750,
			width: 2_000,
			height: 2_300,
			mode: 'tile',
			depth: 'foreground',
			alpha: 0.35
		}
	],
	discoveries: [
		{
			id: 'witchwood-poison-warning',
			x: 1_200,
			y: 620,
			kind: 'warning',
			revealMarker: true,
			labelKey: 'content.maps.discoveries.witchwood-poison-warning.label',
			descriptionKey: 'content.maps.discoveries.witchwood-poison-warning.description'
		}
	],
	ambientNpcs: [{ id: 'mistfen-forager', x: 2_400, y: 2_700, frameName: 'travelerNpc' }],
	pickups: [
		{ id: 'mistfen-salve', x: 880, y: 2_500, itemId: 'sunleaf-salve', quantity: 1 },
		{ id: 'mistfen-cache', x: 1_780, y: 2_120, itemId: 'field-potion', quantity: 1 }
	],
	blockers: [
		{ id: 'witchwood-gate-block', x: 1_200, y: 470, width: 384, height: 96, kind: 'future-gate' }
	]
};
