import { shrineDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

export const silverpineRegion: RegionFragment = {
	groundPatches: [
		{ id: 'silverpine-stair-path', x: 3_100, y: 1_600, width: 70, height: 2_400, tile: 'pathTile' },
		{
			id: 'silverpine-grove-floor',
			x: 3_100,
			y: 900,
			width: 1_400,
			height: 1_000,
			tile: 'autumnLeafTile'
		},
		{
			id: 'silverpine-shrine-terrace',
			x: 3_000,
			y: 520,
			width: 900,
			height: 360,
			tile: 'cobblestoneTile'
		}
	],
	landmarks: [
		{
			id: 'silver-shrine-gate',
			x: 3_000,
			y: 480,
			width: 420,
			height: 320,
			labelKey: 'content.maps.landmarks.silver-shrine-gate.label'
		}
	],
	mapDecor: [
		{
			id: 'silver-shrine-gate-sprite',
			textureKey: shrineDressingAsset.key,
			frameName: 'silverShrineGate',
			x: 3_000,
			y: 480,
			width: 420,
			height: 420,
			mode: 'image'
		},
		{
			id: 'silverpine-lantern-west',
			textureKey: shrineDressingAsset.key,
			frameName: 'stoneLantern',
			x: 2_700,
			y: 760,
			width: 120,
			height: 180,
			mode: 'image',
			collision: {
				id: 'silverpine-lantern-west-collision',
				x: 2_700,
				y: 820,
				width: 70,
				height: 70
			}
		},
		{
			id: 'silverpine-lantern-east',
			textureKey: shrineDressingAsset.key,
			frameName: 'stoneLantern',
			x: 3_300,
			y: 760,
			width: 120,
			height: 180,
			mode: 'image',
			collision: {
				id: 'silverpine-lantern-east-collision',
				x: 3_300,
				y: 820,
				width: 70,
				height: 70
			}
		},
		{
			id: 'silverpine-offering',
			textureKey: shrineDressingAsset.key,
			frameName: 'offeringStand',
			x: 3_000,
			y: 720,
			width: 150,
			height: 150,
			mode: 'image'
		},
		{
			id: 'silverpine-amulet-rack',
			textureKey: shrineDressingAsset.key,
			frameName: 'amuletRack',
			x: 2_840,
			y: 1_120,
			width: 160,
			height: 170,
			mode: 'image'
		},
		{
			id: 'silverpine-tree-1',
			textureKey: shrineDressingAsset.key,
			frameName: 'silverpine',
			x: 2_540,
			y: 1_300,
			width: 220,
			height: 300,
			mode: 'image',
			collision: { id: 'silverpine-tree-1-collision', x: 2_540, y: 1_400, width: 90, height: 80 }
		},
		{
			id: 'silverpine-maple-1',
			textureKey: shrineDressingAsset.key,
			frameName: 'autumnMaple',
			x: 3_640,
			y: 1_400,
			width: 240,
			height: 300,
			mode: 'image',
			collision: { id: 'silverpine-maple-1-collision', x: 3_640, y: 1_500, width: 90, height: 80 }
		},
		{
			id: 'silverpine-maple-2',
			textureKey: shrineDressingAsset.key,
			frameName: 'autumnMaple',
			x: 2_700,
			y: 1_900,
			width: 240,
			height: 300,
			mode: 'image',
			collision: { id: 'silverpine-maple-2-collision', x: 2_700, y: 2_000, width: 90, height: 80 }
		},
		{
			id: 'silverpine-lantern-mid',
			textureKey: shrineDressingAsset.key,
			frameName: 'stoneLantern',
			x: 3_080,
			y: 1_080,
			width: 120,
			height: 180,
			mode: 'image',
			collision: {
				id: 'silverpine-lantern-mid-collision',
				x: 3_080,
				y: 1_140,
				width: 70,
				height: 70
			}
		}
	],
	discoveries: [
		{
			id: 'silverpine-amulet-foreshadow',
			x: 2_840,
			y: 1_120,
			kind: 'foreshadow',
			revealMarker: false,
			labelKey: 'content.maps.discoveries.silverpine-amulet-foreshadow.label',
			descriptionKey: 'content.maps.discoveries.silverpine-amulet-foreshadow.description'
		}
	],
	ambientNpcs: [{ id: 'silverpine-pilgrim', x: 3_100, y: 1_150, frameName: 'pilgrimNpc' }],
	pickups: [
		{ id: 'silverpine-tonic', x: 2_900, y: 1_700, itemId: 'field-potion', quantity: 1 },
		{ id: 'silverpine-offering-cache', x: 3_260, y: 720, itemId: 'sunleaf-salve', quantity: 1 }
	],
	blockers: [
		{
			id: 'silver-shrine-gate-block',
			x: 3_000,
			y: 340,
			width: 420,
			height: 96,
			kind: 'future-gate'
		}
	]
};
