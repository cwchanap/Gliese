import { villageDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

/**
 * Village region — the bottom-left (SW) settlement of Sundrop. An authored
 * JRPG miniature: home yard → well plaza → market lane / north residences /
 * shrine garden / east gate. Every pixel region has a job.
 *
 * The layout is a deterministic blueprint (see sundrop-village-deterministic-
 * layout-plan.md). Buildings form a C-shape around the central well plaza,
 * which acts as the navigation anchor. Four routes radiate from the plaza:
 * west (market/blacksmith), north (residences/guild), southeast (shrine
 * garden + hidden pocket), and northeast (east gate → crossroads).
 *
 * The NE exit corridor (corridor-wall-*) is preserved — it is the load-bearing
 * dogleg from the village gate to the crossroads, validated by the exit
 * corridor tests and referenced by spawn-to-crossroads route-scene beats.
 */
export const villageRegion: RegionFragment = {
	landmarks: [
		{
			id: 'hero-house-exterior',
			x: 700,
			y: 5_430,
			width: 235,
			height: 246,
			labelKey: 'content.maps.landmarks.hero-house-exterior.label'
		},
		{
			id: 'item-shop-exterior',
			x: 520,
			y: 4_960,
			width: 246,
			height: 235,
			labelKey: 'content.maps.landmarks.item-shop-exterior.label'
		},
		{
			id: 'blacksmith',
			x: 380,
			y: 5_260,
			width: 235,
			height: 226,
			labelKey: 'content.maps.landmarks.blacksmith.label'
		},
		{
			id: 'villager-house-1-exterior',
			x: 870,
			y: 4_720,
			width: 226,
			height: 205,
			labelKey: 'content.maps.landmarks.villager-house-1-exterior.label'
		},
		{
			id: 'villager-house-2-exterior',
			x: 1_180,
			y: 4_660,
			width: 338,
			height: 261,
			labelKey: 'content.maps.landmarks.villager-house-2-exterior.label'
		},
		{
			id: 'guild-hall-exterior',
			x: 1_460,
			y: 4_900,
			width: 307,
			height: 277,
			labelKey: 'content.maps.landmarks.guild-hall-exterior.label'
		},
		{
			id: 'sundrop-well',
			x: 1_000,
			y: 5_160,
			width: 141,
			height: 160,
			labelKey: 'content.maps.landmarks.sundrop-well.label'
		},
		{
			id: 'shrine-of-aurora',
			x: 1_180,
			y: 5_560,
			width: 246,
			height: 333,
			labelKey: 'content.maps.landmarks.shrine-of-aurora.label'
		},
		{
			id: 'villager-house-3-exterior',
			x: 1_520,
			y: 5_380,
			width: 184,
			height: 333,
			labelKey: 'content.maps.landmarks.villager-house-3-exterior.label'
		}
	],
	mapDecor: [
		// Plaza identity
		{
			id: 'village-plaza-fountain',
			textureKey: villageDressingAsset.key,
			frameName: 'fountain',
			x: 1_000,
			y: 5_250,
			width: 180,
			height: 150,
			mode: 'image'
		},
		{
			id: 'village-hanging-lantern',
			textureKey: villageDressingAsset.key,
			frameName: 'hangingLantern',
			x: 1_000,
			y: 4_980,
			width: 110,
			height: 130,
			mode: 'image',
			depth: 'foreground'
		},
		{
			id: 'village-plaza-flowers-west',
			textureKey: villageDressingAsset.key,
			frameName: 'flowerBed',
			x: 840,
			y: 5_300,
			width: 150,
			height: 120,
			mode: 'image'
		},
		{
			id: 'village-plaza-flowers-east',
			textureKey: villageDressingAsset.key,
			frameName: 'flowerBed',
			x: 1_160,
			y: 5_300,
			width: 150,
			height: 120,
			mode: 'image'
		},

		// West market lane
		{
			id: 'village-market-stall',
			textureKey: villageDressingAsset.key,
			frameName: 'marketStall',
			x: 640,
			y: 5_110,
			width: 240,
			height: 190,
			mode: 'image'
		},
		{
			id: 'village-market-banner',
			textureKey: villageDressingAsset.key,
			frameName: 'festivalBanner',
			x: 760,
			y: 4_920,
			width: 160,
			height: 220,
			mode: 'image'
		},

		// Blacksmith / field flavor
		{
			id: 'village-field-scarecrow',
			textureKey: villageDressingAsset.key,
			frameName: 'scarecrow',
			x: 330,
			y: 5_560,
			width: 120,
			height: 170,
			mode: 'image'
		},
		{
			id: 'village-blacksmith-topiary',
			textureKey: villageDressingAsset.key,
			frameName: 'hedgeTopiary',
			x: 470,
			y: 5_420,
			width: 120,
			height: 140,
			mode: 'image'
		},

		// North lane thresholds
		{
			id: 'village-north-lantern-west',
			textureKey: villageDressingAsset.key,
			frameName: 'poleLantern',
			x: 760,
			y: 4_860,
			width: 100,
			height: 200,
			mode: 'image',
			collision: {
				id: 'village-north-lantern-west-collision',
				x: 760,
				y: 4_940,
				width: 50,
				height: 60
			}
		},
		{
			id: 'village-north-lantern-east',
			textureKey: villageDressingAsset.key,
			frameName: 'poleLantern',
			x: 1_420,
			y: 4_760,
			width: 100,
			height: 200,
			mode: 'image',
			collision: {
				id: 'village-north-lantern-east-collision',
				x: 1_420,
				y: 4_840,
				width: 50,
				height: 60
			}
		},

		// Shrine garden
		{
			id: 'village-shrine-offering',
			textureKey: villageDressingAsset.key,
			frameName: 'offeringStand',
			x: 1_050,
			y: 5_620,
			width: 180,
			height: 180,
			mode: 'image',
			collision: {
				id: 'village-shrine-offering-collision',
				x: 1_050,
				y: 5_680,
				width: 80,
				height: 60
			}
		},
		{
			id: 'village-stone-lantern',
			textureKey: villageDressingAsset.key,
			frameName: 'stoneLantern',
			x: 1_320,
			y: 5_620,
			width: 180,
			height: 180,
			mode: 'image',
			collision: {
				id: 'village-stone-lantern-collision',
				x: 1_320,
				y: 5_680,
				width: 80,
				height: 60
			}
		},
		{
			id: 'village-shrine-maple',
			textureKey: villageDressingAsset.key,
			frameName: 'autumnMaple',
			x: 1_520,
			y: 5_470,
			width: 220,
			height: 280,
			mode: 'image',
			collision: {
				id: 'village-shrine-maple-collision',
				x: 1_570,
				y: 5_570,
				width: 70,
				height: 70
			}
		},

		// East gate
		{
			id: 'village-gate-arch',
			textureKey: villageDressingAsset.key,
			frameName: 'gateArch',
			x: 1_660,
			y: 4_430,
			width: 220,
			height: 200,
			mode: 'image'
		},
		{
			id: 'village-gate-lantern-a',
			textureKey: villageDressingAsset.key,
			frameName: 'poleLantern',
			x: 1_560,
			y: 4_440,
			width: 100,
			height: 200,
			mode: 'image',
			collision: {
				id: 'village-gate-lantern-a-collision',
				x: 1_560,
				y: 4_520,
				width: 50,
				height: 60
			}
		},
		{
			id: 'village-gate-lantern-b',
			textureKey: villageDressingAsset.key,
			frameName: 'poleLantern',
			x: 1_760,
			y: 4_440,
			width: 100,
			height: 200,
			mode: 'image',
			collision: {
				id: 'village-gate-lantern-b-collision',
				x: 1_760,
				y: 4_520,
				width: 50,
				height: 60
			}
		},

		// Crossroads route breadcrumb
		{
			id: 'village-corridor-waymarker',
			textureKey: villageDressingAsset.key,
			frameName: 'poleLantern',
			x: 2_120,
			y: 4_440,
			width: 100,
			height: 200,
			mode: 'image',
			collision: {
				id: 'village-corridor-waymarker-collision',
				x: 2_120,
				y: 4_520,
				width: 50,
				height: 60
			}
		}
	],
	ambientNpcs: [
		{ id: 'village-wanderer', x: 1_140, y: 5_000, frameName: 'travelerNpc' },
		{ id: 'village-woodcutter', x: 560, y: 5_260, frameName: 'woodcutterNpc' },
		{ id: 'village-pilgrim', x: 1_100, y: 5_780, frameName: 'pilgrimNpc' },
		{ id: 'village-crier', x: 1_540, y: 4_620, frameName: 'crierNpc' }
	],
	pickups: [
		{
			id: 'village-market-cache',
			x: 430,
			y: 5_380,
			itemId: 'field-potion',
			quantity: 1
		},
		{
			id: 'village-shrine-cache',
			x: 1_560,
			y: 5_650,
			itemId: 'sunleaf-salve',
			quantity: 1
		}
	],
	transitions: [
		{
			id: 'meadow-to-hero-house',
			x: 700,
			y: 5_555,
			toMapId: 'hero-house',
			showMarker: false,
			arrival: { x: 256, y: 224, facing: 'up' }
		},
		{
			id: 'meadow-to-item-shop',
			x: 520,
			y: 5_080,
			toMapId: 'item-shop',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-1',
			x: 870,
			y: 4_825,
			toMapId: 'villager-house-1',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-2',
			x: 1_180,
			y: 4_795,
			toMapId: 'villager-house-2',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-guild-hall',
			x: 1_460,
			y: 5_040,
			toMapId: 'guild-hall',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-shrine-of-aurora',
			x: 1_180,
			y: 5_728,
			toMapId: 'shrine-of-aurora-interior',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-3',
			x: 1_520,
			y: 5_548,
			toMapId: 'villager-house-3',
			showMarker: false,
			arrival: { x: 256, y: 288, facing: 'up' }
		}
	],
	groundPatches: [
		// Room 1: Home Yard / spawn
		{
			id: 'village-home-yard',
			x: 700,
			y: 5_585,
			width: 420,
			height: 180,
			tile: 'pathTile'
		},

		// Corridor: home yard to plaza
		{
			id: 'village-south-lane',
			x: 780,
			y: 5_390,
			width: 120,
			height: 380,
			tile: 'pathTile'
		},

		// Room 2: Central well plaza
		{
			id: 'sundrop-plaza-stone',
			x: 1_000,
			y: 5_160,
			width: 500,
			height: 420,
			tile: 'cobblestoneTile'
		},

		// West route: market / blacksmith bend
		{
			id: 'village-market-lane',
			x: 650,
			y: 5_045,
			width: 560,
			height: 120,
			tile: 'pathTile'
		},
		{
			id: 'village-blacksmith-yard',
			x: 400,
			y: 5_280,
			width: 360,
			height: 300,
			tile: 'pathTile'
		},

		// North route: residences
		{
			id: 'village-north-lane',
			x: 1_050,
			y: 4_860,
			width: 860,
			height: 120,
			tile: 'pathTile'
		},
		{
			id: 'village-north-courtyard',
			x: 1_120,
			y: 4_690,
			width: 620,
			height: 200,
			tile: 'pathTile'
		},

		// Guild approach
		{
			id: 'village-guild-forecourt',
			x: 1_460,
			y: 5_040,
			width: 360,
			height: 180,
			tile: 'cobblestoneTile'
		},

		// East gate path
		{
			id: 'village-east-bend',
			x: 1_500,
			y: 4_760,
			width: 140,
			height: 420,
			tile: 'pathTile'
		},
		{
			id: 'village-gate-road',
			x: 1_760,
			y: 4_440,
			width: 520,
			height: 120,
			tile: 'pathTile'
		},

		// Shrine garden
		{
			id: 'village-shrine-path',
			x: 1_100,
			y: 5_420,
			width: 120,
			height: 440,
			tile: 'pathTile'
		},
		{
			id: 'village-shrine-garden',
			x: 1_200,
			y: 5_660,
			width: 520,
			height: 320,
			tile: 'autumnLeafTile'
		},

		// Hidden offering pocket east of shrine
		{
			id: 'village-hidden-offering-pocket',
			x: 1_520,
			y: 5_620,
			width: 300,
			height: 260,
			tile: 'autumnLeafTile'
		},

		// Existing ocean corner
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
		// Global meadow boundaries
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

		// Village outer boundary, leaving northeast gate open
		{
			id: 'village-outer-north-west',
			x: 940,
			y: 4_360,
			width: 1_360,
			height: 64,
			kind: 'garden-hedge'
		},
		{
			id: 'village-outer-north-east',
			x: 1_820,
			y: 4_360,
			width: 120,
			height: 64,
			kind: 'garden-hedge'
		},
		{
			id: 'village-outer-west',
			x: 240,
			y: 5_120,
			width: 64,
			height: 1_440,
			kind: 'garden-hedge'
		},
		{
			id: 'village-outer-south',
			x: 1_060,
			y: 5_860,
			width: 1_640,
			height: 64,
			kind: 'garden-hedge'
		},
		{
			id: 'village-outer-east-lower',
			x: 1_880,
			y: 5_240,
			width: 64,
			height: 1_200,
			kind: 'garden-hedge'
		},

		// Home yard enclosure
		{
			id: 'village-home-yard-west-fence',
			x: 500,
			y: 5_600,
			width: 40,
			height: 260,
			kind: 'garden-hedge'
		},
		{
			id: 'village-home-yard-east-fence',
			x: 920,
			y: 5_650,
			width: 40,
			height: 220,
			kind: 'garden-hedge'
		},
		{
			id: 'village-home-yard-south-fence',
			x: 700,
			y: 5_740,
			width: 420,
			height: 40,
			kind: 'garden-hedge'
		},

		// Plaza framing, with four intentional openings
		{
			id: 'village-plaza-nw-hedge',
			x: 720,
			y: 4_960,
			width: 260,
			height: 40,
			kind: 'garden-hedge'
		},
		{
			id: 'village-plaza-ne-hedge',
			x: 1_300,
			y: 4_960,
			width: 260,
			height: 40,
			kind: 'garden-hedge'
		},
		{
			id: 'village-plaza-west-hedge',
			x: 720,
			y: 5_280,
			width: 40,
			height: 240,
			kind: 'garden-hedge'
		},
		{
			id: 'village-plaza-east-hedge',
			x: 1_300,
			y: 5_280,
			width: 40,
			height: 240,
			kind: 'garden-hedge'
		},

		// West market / blacksmith lane boundaries
		{
			id: 'village-market-lane-north-wall',
			x: 650,
			y: 4_910,
			width: 560,
			height: 40,
			kind: 'garden-hedge'
		},
		{
			id: 'village-market-lane-south-wall',
			x: 650,
			y: 5_180,
			width: 340,
			height: 40,
			kind: 'garden-hedge'
		},
		{
			id: 'village-blacksmith-yard-south-wall',
			x: 400,
			y: 5_440,
			width: 360,
			height: 40,
			kind: 'garden-hedge'
		},

		// North residences lane boundaries
		{
			id: 'village-north-lane-north-wall',
			x: 1_050,
			y: 4_590,
			width: 860,
			height: 40,
			kind: 'garden-hedge'
		},
		{
			id: 'village-north-lane-south-wall-west',
			x: 780,
			y: 4_980,
			width: 280,
			height: 40,
			kind: 'garden-hedge'
		},
		{
			id: 'village-north-lane-south-wall-east',
			x: 1_320,
			y: 4_980,
			width: 280,
			height: 40,
			kind: 'garden-hedge'
		},

		// Guild / east gate bend
		{
			id: 'village-guild-forecourt-east-wall',
			x: 1_660,
			y: 5_040,
			width: 40,
			height: 260,
			kind: 'garden-hedge'
		},
		{
			id: 'village-east-bend-west-wall',
			x: 1_420,
			y: 4_650,
			width: 40,
			height: 500,
			kind: 'garden-hedge'
		},
		{
			id: 'village-east-bend-east-wall',
			x: 1_640,
			y: 4_700,
			width: 40,
			height: 380,
			kind: 'garden-hedge'
		},

		// Gate road to Crossroads — narrowed to leave the corridor entrance
		// (x≈1640–1860) unblocked for the village exit route.
		{
			id: 'village-gate-road-north-wall',
			x: 1_570,
			y: 4_300,
			width: 140,
			height: 40,
			kind: 'garden-hedge'
		},
		{
			id: 'village-gate-road-south-wall',
			x: 1_570,
			y: 4_580,
			width: 140,
			height: 40,
			kind: 'garden-hedge'
		},

		// Shrine garden boundaries
		{
			id: 'village-shrine-garden-west-wall',
			x: 900,
			y: 5_620,
			width: 40,
			height: 360,
			kind: 'garden-hedge'
		},
		{
			id: 'village-shrine-garden-south-wall',
			x: 1_200,
			y: 5_820,
			width: 520,
			height: 40,
			kind: 'garden-hedge'
		},
		{
			id: 'village-hidden-pocket-east-wall',
			x: 1_700,
			y: 5_620,
			width: 40,
			height: 260,
			kind: 'garden-hedge'
		},
		{
			id: 'village-hidden-pocket-north-wall',
			x: 1_520,
			y: 5_470,
			width: 300,
			height: 40,
			kind: 'garden-hedge'
		},

		// === Exit corridor walls (village gate → crossroads) ===
		// Preserved dogleg corridor. Paired garden-hedge walls flank the winding
		// path from the village gate to the crossroads. These are load-bearing
		// for the spawn-to-crossroads critical route and referenced by route-scene
		// beat boundaryIds; they are NOT village-interior micro-hedges.
		{ id: 'corridor-wall-2a', x: 1_750, y: 4_190, width: 220, height: 64, kind: 'garden-hedge' },
		{ id: 'corridor-wall-2b', x: 1_775, y: 4_510, width: 170, height: 64, kind: 'garden-hedge' },
		{ id: 'corridor-wall-3a', x: 1_690, y: 4_225, width: 64, height: 220, kind: 'garden-hedge' },
		{ id: 'corridor-wall-3b', x: 2_010, y: 4_225, width: 64, height: 270, kind: 'garden-hedge' },
		{ id: 'corridor-wall-4a', x: 2_025, y: 3_940, width: 370, height: 64, kind: 'garden-hedge' },
		{ id: 'corridor-wall-4b', x: 2_040, y: 4_260, width: 330, height: 64, kind: 'garden-hedge' },
		{ id: 'corridor-wall-5a', x: 2_040, y: 4_225, width: 64, height: 270, kind: 'garden-hedge' },
		{ id: 'corridor-wall-5b', x: 2_360, y: 4_225, width: 64, height: 270, kind: 'garden-hedge' },
		{ id: 'corridor-wall-6a', x: 2_375, y: 4_190, width: 370, height: 64, kind: 'garden-hedge' },
		{ id: 'corridor-wall-6b', x: 2_375, y: 4_510, width: 370, height: 64, kind: 'garden-hedge' },
		{ id: 'corridor-wall-7a', x: 2_390, y: 4_225, width: 64, height: 270, kind: 'garden-hedge' },
		{ id: 'corridor-wall-7b', x: 2_710, y: 4_225, width: 64, height: 270, kind: 'garden-hedge' },
		{ id: 'corridor-wall-8a', x: 2_725, y: 3_940, width: 370, height: 64, kind: 'garden-hedge' },
		{ id: 'corridor-wall-8b', x: 2_725, y: 4_260, width: 370, height: 64, kind: 'garden-hedge' },
		{ id: 'corridor-wall-9a', x: 2_740, y: 4_250, width: 64, height: 300, kind: 'garden-hedge' },
		{ id: 'corridor-wall-10b', x: 3_050, y: 4_560, width: 300, height: 64, kind: 'garden-hedge' }
	]
};
