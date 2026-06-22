import { shrineDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

export const silverpineRegion: RegionFragment = {
	groundPatches: [
		{ id: 'silverpine-stair-path', x: 3_100, y: 1_600, width: 70, height: 2_400, tile: 'pathTile' },
		{
			id: 'silverpine-lower-approach',
			x: 3_180,
			y: 2_360,
			width: 520,
			height: 70,
			tile: 'pathTile'
		},
		{ id: 'silverpine-bend-west', x: 2_900, y: 1_820, width: 440, height: 70, tile: 'pathTile' },
		{ id: 'silverpine-bend-east', x: 3_220, y: 1_320, width: 440, height: 70, tile: 'pathTile' },
		{
			id: 'silverpine-grove-floor',
			x: 3_100,
			y: 900,
			width: 1_400,
			height: 1_000,
			tile: 'autumnLeafTile'
		},
		{
			id: 'silverpine-side-grove-floor',
			x: 2_620,
			y: 1_560,
			width: 500,
			height: 420,
			tile: 'autumnLeafTile'
		},
		{
			id: 'silverpine-shrine-terrace',
			x: 3_000,
			y: 520,
			width: 900,
			height: 360,
			tile: 'cobblestoneTile'
		},
		{
			id: 'silverpine-terrace-landing',
			x: 3_000,
			y: 760,
			width: 820,
			height: 260,
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
			id: 'silverpine-side-grove-maple',
			textureKey: shrineDressingAsset.key,
			frameName: 'autumnMaple',
			x: 2_420,
			y: 1_520,
			width: 230,
			height: 290,
			mode: 'image',
			collision: {
				id: 'silverpine-side-grove-maple-collision',
				x: 2_420,
				y: 1_620,
				width: 90,
				height: 80
			}
		},
		{
			id: 'silverpine-side-grove-pine',
			textureKey: shrineDressingAsset.key,
			frameName: 'silverpine',
			x: 2_820,
			y: 1_360,
			width: 220,
			height: 300,
			mode: 'image',
			collision: {
				id: 'silverpine-side-grove-pine-collision',
				x: 2_820,
				y: 1_460,
				width: 90,
				height: 80
			}
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
		},
		{
			id: 'silverpine-lower-wall-west',
			textureKey: shrineDressingAsset.key,
			frameName: 'silverpine',
			x: 2_920,
			y: 2_340,
			width: 220,
			height: 300,
			mode: 'image',
			collision: {
				id: 'silverpine-lower-wall-west-collision',
				x: 2_920,
				y: 2_440,
				width: 90,
				height: 100
			}
		},
		{
			id: 'silverpine-lower-wall-east',
			textureKey: shrineDressingAsset.key,
			frameName: 'silverpine',
			x: 3_440,
			y: 2_340,
			width: 220,
			height: 300,
			mode: 'image',
			collision: {
				id: 'silverpine-lower-wall-east-collision',
				x: 3_440,
				y: 2_440,
				width: 90,
				height: 100
			}
		},
		{
			id: 'silverpine-switchback-west',
			textureKey: shrineDressingAsset.key,
			frameName: 'autumnMaple',
			x: 2_620,
			y: 1_780,
			width: 240,
			height: 300,
			mode: 'image',
			collision: {
				id: 'silverpine-switchback-west-collision',
				x: 2_620,
				y: 1_880,
				width: 90,
				height: 90
			}
		},
		{
			id: 'silverpine-switchback-east',
			textureKey: shrineDressingAsset.key,
			frameName: 'silverpine',
			x: 3_520,
			y: 1_520,
			width: 220,
			height: 300,
			mode: 'image',
			collision: {
				id: 'silverpine-switchback-east-collision',
				x: 3_520,
				y: 1_620,
				width: 90,
				height: 90
			}
		},
		{
			id: 'silverpine-offering-grove-wall',
			textureKey: shrineDressingAsset.key,
			frameName: 'autumnMaple',
			x: 2_300,
			y: 1_620,
			width: 240,
			height: 300,
			mode: 'image',
			collision: {
				id: 'silverpine-offering-grove-wall-collision',
				x: 2_300,
				y: 1_720,
				width: 90,
				height: 90
			}
		},
		{
			id: 'silverpine-terrace-boundary',
			textureKey: shrineDressingAsset.key,
			frameName: 'silverpine',
			x: 2_560,
			y: 940,
			width: 240,
			height: 170,
			mode: 'tile',
			collision: {
				id: 'silverpine-terrace-boundary-collision',
				x: 2_560,
				y: 940,
				width: 220,
				height: 90
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
	ambientNpcs: [{ id: 'silverpine-pilgrim', x: 3_120, y: 1_360, frameName: 'pilgrimNpc' }],
	pickups: [
		{ id: 'silverpine-tonic', x: 2_620, y: 1_560, itemId: 'field-potion', quantity: 1 },
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
		},
		// Silverpine corridor walls — paired hedges at ±160px perpendicular
		// to each reshaped mainRoute segment, forming a winding JRPG-dungeon
		// corridor ≤320px wide. Gaps at beat-room boundaries act as doorways.
		// Seg A: x=3500, y∈[2750,3000] (vertical)
		{
			id: 'silverpine-wall-A-west',
			x: 3_340,
			y: 2_850,
			width: 64,
			height: 300,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-wall-A-east',
			x: 3_660,
			y: 2_850,
			width: 64,
			height: 300,
			kind: 'town-hedge'
		},
		// Seg B: y=2750, x∈[3180,3500] (horizontal)
		{
			id: 'silverpine-wall-B-north',
			x: 3_340,
			y: 2_590,
			width: 384,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-wall-B-south',
			x: 3_340,
			y: 2_910,
			width: 384,
			height: 64,
			kind: 'town-hedge'
		},
		// Seg C: x=3180, y∈[2360,2750] (vertical); lower-room covers y≤2570
		{
			id: 'silverpine-wall-C-west',
			x: 3_020,
			y: 2_660,
			width: 64,
			height: 240,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-wall-C-east',
			x: 3_340,
			y: 2_660,
			width: 64,
			height: 240,
			kind: 'town-hedge'
		},
		// Seg E: x=2900, y∈[1820,2360] (vertical); lower-room covers y≥2150
		{
			id: 'silverpine-wall-E-west',
			x: 2_740,
			y: 1_985,
			width: 64,
			height: 370,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-wall-E-east',
			x: 3_060,
			y: 1_985,
			width: 64,
			height: 370,
			kind: 'town-hedge'
		},
		// Seg G: y=1580, x∈[2900,3220] (horizontal); grove covers x≤2900
		{
			id: 'silverpine-wall-G-north',
			x: 3_060,
			y: 1_420,
			width: 400,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-wall-G-south',
			x: 3_060,
			y: 1_740,
			width: 400,
			height: 64,
			kind: 'town-hedge'
		},
		// Seg H: x=3220, y∈[1320,1580] (vertical)
		{
			id: 'silverpine-wall-H-west',
			x: 3_060,
			y: 1_450,
			width: 64,
			height: 320,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-wall-H-east',
			x: 3_380,
			y: 1_450,
			width: 64,
			height: 320,
			kind: 'town-hedge'
		},
		// Seg I: y=1320, x∈[3100,3220] (horizontal)
		{
			id: 'silverpine-wall-I-north',
			x: 3_160,
			y: 1_160,
			width: 200,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-wall-I-south',
			x: 3_160,
			y: 1_480,
			width: 200,
			height: 64,
			kind: 'town-hedge'
		},
		// Seg J: x=3100, y∈[1000,1320] (vertical)
		{
			id: 'silverpine-wall-J-west',
			x: 2_940,
			y: 1_160,
			width: 64,
			height: 380,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-wall-J-east',
			x: 3_260,
			y: 1_160,
			width: 64,
			height: 380,
			kind: 'town-hedge'
		},
		// Seg K: y=1000, x∈[3000,3100] (horizontal)
		{
			id: 'silverpine-wall-K-north',
			x: 3_050,
			y: 840,
			width: 164,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-wall-K-south',
			x: 3_050,
			y: 1_160,
			width: 164,
			height: 64,
			kind: 'town-hedge'
		},
		// Seg L: x=3000, y∈[760,1000] (vertical); terrace covers y≤890
		{
			id: 'silverpine-wall-L-west',
			x: 2_840,
			y: 1_000,
			width: 64,
			height: 120,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-wall-L-east',
			x: 3_160,
			y: 1_000,
			width: 64,
			height: 120,
			kind: 'town-hedge'
		},
		// Alcove pocket enclosure — walls around the silverpine-mid-climb-alcove
		// pocket at (3420, 1320) so flood-fill from the pocket center reaches
		// the corridor before leaking >640px into open field. The existing
		// silverpine-wall-H-east (x=3380, y∈[1290,1610]) seals the west side;
		// these walls seal north, east, and south. The west-side gap between
		// the north wall and wall-H-east (y∈[1222,1290]) drains into the
		// corridor absorption zone (distToRoute<160) before leaking.
		{
			id: 'silverpine-mid-climb-alcove-wall-east',
			x: 3_580,
			y: 1_290,
			width: 64,
			height: 380,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-mid-climb-alcove-wall-north',
			x: 3_460,
			y: 1_190,
			width: 320,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-mid-climb-alcove-wall-south',
			x: 3_460,
			y: 1_450,
			width: 320,
			height: 64,
			kind: 'town-hedge'
		},
		// Grove pocket enclosure — walls around the silverpine-grove-pocket at
		// (2620, 1560) so flood-fill from the pocket center reaches the corridor
		// (x=2900) before leaking >640px west into open field. The east side
		// opens to the corridor where the absorption zone (distToRoute<160)
		// drains the flood-fill.
		{
			id: 'silverpine-grove-pocket-wall-west',
			x: 2_360,
			y: 1_560,
			width: 64,
			height: 520,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-grove-pocket-wall-north',
			x: 2_620,
			y: 1_300,
			width: 560,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'silverpine-grove-pocket-wall-south',
			x: 2_600,
			y: 1_820,
			width: 480,
			height: 64,
			kind: 'town-hedge'
		}
	]
};
