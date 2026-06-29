import { marshDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

export const mistfenRegion: RegionFragment = {
	groundPatches: [
		{ id: 'mistfen-basin', x: 1_250, y: 1_750, width: 2_000, height: 2_300, tile: 'marshMudTile' },
		{ id: 'mistfen-pool-west', x: 800, y: 1_400, width: 420, height: 300, tile: 'seaTile' },
		{ id: 'mistfen-pool-east', x: 1_700, y: 2_100, width: 360, height: 280, tile: 'seaTile' },
		{ id: 'mistfen-approach-path', x: 2_150, y: 2_750, width: 360, height: 64, tile: 'pathTile' },
		{ id: 'mistfen-safe-curve-a', x: 1_760, y: 2_540, width: 780, height: 64, tile: 'pathTile' },
		{ id: 'mistfen-safe-curve-b', x: 1_400, y: 2_030, width: 64, height: 900, tile: 'pathTile' },
		{
			id: 'mistfen-hidden-pool-pocket',
			x: 1_560,
			y: 2_260,
			width: 440,
			height: 240,
			tile: 'marshMudTile'
		}
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
			id: 'mistfen-reed-wall-east',
			textureKey: marshDressingAsset.key,
			frameName: 'reeds',
			x: 1_760,
			y: 2_300,
			width: 260,
			height: 220,
			mode: 'tile',
			collision: {
				id: 'mistfen-reed-wall-east-collision',
				x: 1_840,
				y: 2_300,
				width: 110,
				height: 200
			}
		},
		{
			id: 'mistfen-reed-wall-west',
			textureKey: marshDressingAsset.key,
			frameName: 'reeds',
			x: 1_220,
			y: 2_120,
			width: 260,
			height: 220,
			mode: 'tile',
			collision: {
				id: 'mistfen-reed-wall-west-collision',
				x: 1_220,
				y: 2_120,
				width: 150,
				height: 200
			}
		},
		{
			id: 'mistfen-reed-wall-north',
			textureKey: marshDressingAsset.key,
			frameName: 'reeds',
			x: 1_850,
			y: 2_630,
			width: 760,
			height: 120,
			mode: 'tile',
			collision: {
				id: 'mistfen-reed-wall-north-collision',
				x: 1_850,
				y: 2_630,
				width: 760,
				height: 110
			}
		},
		{
			id: 'mistfen-reed-wall-south',
			textureKey: marshDressingAsset.key,
			frameName: 'reeds',
			x: 1_850,
			y: 2_890,
			width: 760,
			height: 120,
			mode: 'tile',
			collision: {
				id: 'mistfen-reed-wall-south-collision',
				x: 1_850,
				y: 2_890,
				width: 760,
				height: 110
			}
		},
		{
			id: 'mistfen-deadfall-bend',
			textureKey: marshDressingAsset.key,
			frameName: 'deadTree',
			x: 1_470,
			y: 1_660,
			width: 210,
			height: 250,
			mode: 'image',
			collision: {
				id: 'mistfen-deadfall-bend-collision',
				x: 1_470,
				y: 1_730,
				width: 80,
				height: 70
			}
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
			id: 'mistfen-fog-entry',
			textureKey: marshDressingAsset.key,
			frameName: 'fog',
			x: 2_050,
			y: 2_580,
			width: 720,
			height: 420,
			mode: 'tile',
			depth: 'foreground',
			alpha: 0.18
		},
		{
			id: 'mistfen-fog-middle',
			textureKey: marshDressingAsset.key,
			frameName: 'fog',
			x: 1_430,
			y: 1_780,
			width: 1_100,
			height: 900,
			mode: 'tile',
			depth: 'foreground',
			alpha: 0.32
		},
		{
			id: 'mistfen-fog-gate',
			textureKey: marshDressingAsset.key,
			frameName: 'fog',
			x: 1_180,
			y: 820,
			width: 900,
			height: 700,
			mode: 'tile',
			depth: 'foreground',
			alpha: 0.48
		},
		{
			id: 'mistfen-gate-fog-wall',
			textureKey: marshDressingAsset.key,
			frameName: 'fog',
			x: 960,
			y: 1_180,
			width: 180,
			height: 900,
			mode: 'tile',
			depth: 'foreground',
			alpha: 0.42,
			collision: {
				id: 'mistfen-gate-fog-wall-collision',
				x: 960,
				y: 1_180,
				width: 120,
				height: 760
			}
		},
		{
			id: 'mistfen-gate-reed-wall-east',
			textureKey: marshDressingAsset.key,
			frameName: 'reeds',
			x: 1_470,
			y: 1_080,
			width: 160,
			height: 820,
			mode: 'tile',
			collision: {
				id: 'mistfen-gate-reed-wall-east-collision',
				x: 1_470,
				y: 1_080,
				width: 120,
				height: 760
			}
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
			y: 820,
			kind: 'warning',
			revealMarker: true,
			labelKey: 'content.maps.discoveries.witchwood-poison-warning.label',
			descriptionKey: 'content.maps.discoveries.witchwood-poison-warning.description'
		}
	],
	// Sits on the safe approach at the Mistfen entrance (route segment 2690→2150, y≈2750) so the
	// forager reads as a "this way is passable" clue before the toxic blooms / gate —
	// follow-up plan §2.4.
	ambientNpcs: [{ id: 'mistfen-forager', x: 2_400, y: 2_700, frameName: 'travelerNpc' }],
	pickups: [
		{ id: 'mistfen-salve', x: 880, y: 2_500, itemId: 'sunleaf-salve', quantity: 1 },
		{ id: 'mistfen-cache', x: 1_920, y: 2_300, itemId: 'field-potion', quantity: 1 }
	],
	blockers: [
		{ id: 'witchwood-gate-block', x: 1_200, y: 470, width: 384, height: 96, kind: 'future-gate' },
		{ id: 'mistfen-pool-west-blocker', x: 800, y: 1_400, width: 420, height: 300, kind: 'ocean' },
		{ id: 'mistfen-pool-east-blocker', x: 1_700, y: 2_100, width: 360, height: 280, kind: 'ocean' },
		// Entry bank east of the crossroads→mistfen exit mouth so the reed
		// corridor begins at a defined threshold rather than open grass. (The
		// west side is covered by the declared mistfen-crossroads-exit-room.)
		{
			id: 'mistfen-entry-bank-east',
			x: 3_100,
			y: 2_850,
			width: 64,
			height: 500,
			kind: 'town-hedge'
		},
		// West bank of the gate approach so the final climb to the Witchwood Gate
		// reads as a narrowing corridor.
		{
			id: 'mistfen-gate-approach-west-bank',
			x: 1_080,
			y: 1_750,
			width: 64,
			height: 600,
			kind: 'town-hedge'
		}
	]
};
