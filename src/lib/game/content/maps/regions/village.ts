import { villageDressingAsset } from '$lib/game/content/assets';
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
			textureKey: villageDressingAsset.key,
			frameName: 'hangingLantern',
			x: 1_000,
			y: 4_950,
			width: 110,
			height: 130,
			mode: 'image',
			depth: 'foreground'
		},
		// Plaza decor
		{
			id: 'village-market-stall',
			textureKey: villageDressingAsset.key,
			frameName: 'marketStall',
			x: 1_150,
			y: 5_050,
			width: 240,
			height: 190,
			mode: 'image'
		},
		{
			id: 'village-festival-banner',
			textureKey: villageDressingAsset.key,
			frameName: 'festivalBanner',
			x: 870,
			y: 5_050,
			width: 200,
			height: 250,
			mode: 'image'
		},
		{
			id: 'village-plaza-flowers-1',
			textureKey: villageDressingAsset.key,
			frameName: 'flowerBed',
			x: 850,
			y: 5_250,
			width: 160,
			height: 130,
			mode: 'image'
		},
		{
			id: 'village-plaza-flowers-2',
			textureKey: villageDressingAsset.key,
			frameName: 'flowerBed',
			x: 1_150,
			y: 5_250,
			width: 160,
			height: 130,
			mode: 'image'
		},
		// Junction pole lanterns
		{
			id: 'village-lantern-junction-sw',
			textureKey: villageDressingAsset.key,
			frameName: 'poleLantern',
			x: 400,
			y: 5_400,
			width: 110,
			height: 220,
			mode: 'image',
			collision: { id: 'village-lantern-sw-collision', x: 400, y: 5_480, width: 50, height: 60 }
		},
		{
			id: 'village-lantern-junction-nw',
			textureKey: villageDressingAsset.key,
			frameName: 'poleLantern',
			x: 500,
			y: 4_650,
			width: 110,
			height: 220,
			mode: 'image',
			collision: { id: 'village-lantern-nw-collision', x: 500, y: 4_730, width: 50, height: 60 }
		},
		{
			id: 'village-lantern-junction-ne',
			textureKey: villageDressingAsset.key,
			frameName: 'poleLantern',
			x: 1_550,
			y: 4_650,
			width: 110,
			height: 220,
			mode: 'image',
			collision: { id: 'village-lantern-ne-collision', x: 1_550, y: 4_730, width: 50, height: 60 }
		},
		// Dead-end accents
		{
			id: 'village-maple-garden',
			textureKey: villageDressingAsset.key,
			frameName: 'autumnMaple',
			x: 340,
			y: 4_775,
			width: 220,
			height: 280,
			mode: 'image',
			collision: { id: 'village-maple-garden-collision', x: 340, y: 4_865, width: 80, height: 70 }
		},
		{
			id: 'village-shrine-offering',
			textureKey: villageDressingAsset.key,
			frameName: 'offeringStand',
			x: 920,
			y: 5_500,
			width: 200,
			height: 200,
			mode: 'image',
			collision: {
				id: 'village-shrine-offering-collision',
				x: 920,
				y: 5_550,
				width: 80,
				height: 60
			}
		},
		{
			id: 'village-stone-lantern',
			textureKey: villageDressingAsset.key,
			frameName: 'stoneLantern',
			x: 1_080,
			y: 5_500,
			width: 200,
			height: 200,
			mode: 'image',
			collision: {
				id: 'village-stone-lantern-collision',
				x: 1_080,
				y: 5_550,
				width: 80,
				height: 60
			}
		},
		// Gate decor (from Task 4)
		{
			id: 'village-gate-lantern-a',
			textureKey: villageDressingAsset.key,
			frameName: 'poleLantern',
			x: 1_580,
			y: 4_500,
			width: 110,
			height: 220,
			mode: 'image',
			collision: {
				id: 'village-gate-lantern-a-collision',
				x: 1_580,
				y: 4_580,
				width: 50,
				height: 60
			}
		},
		{
			id: 'village-gate-lantern-b',
			textureKey: villageDressingAsset.key,
			frameName: 'poleLantern',
			x: 1_720,
			y: 4_500,
			width: 110,
			height: 220,
			mode: 'image',
			collision: {
				id: 'village-gate-lantern-b-collision',
				x: 1_720,
				y: 4_580,
				width: 50,
				height: 60
			}
		},
		{
			id: 'village-corridor-waymarker',
			textureKey: villageDressingAsset.key,
			frameName: 'poleLantern',
			x: 2_200,
			y: 4_180,
			width: 110,
			height: 220,
			mode: 'image',
			collision: {
				id: 'village-corridor-waymarker-collision',
				x: 2_200,
				y: 4_260,
				width: 50,
				height: 60
			}
		},
		// Village-exclusive props (village-dressing row 3). No collision by
		// default — keeps the validated maze/corridor reachability intact
		// (same precedent as the no-collision market stall).
		{
			id: 'village-gate-arch',
			textureKey: villageDressingAsset.key,
			frameName: 'gateArch',
			x: 1_650,
			y: 4_400,
			width: 220,
			height: 200,
			mode: 'image'
		},
		{
			id: 'village-plaza-fountain',
			textureKey: villageDressingAsset.key,
			frameName: 'fountain',
			x: 1_130,
			y: 5_280,
			width: 180,
			height: 150,
			mode: 'image'
		},
		{
			id: 'village-field-scarecrow',
			textureKey: villageDressingAsset.key,
			frameName: 'scarecrow',
			x: 400,
			y: 5_580,
			width: 120,
			height: 170,
			mode: 'image'
		},
		{
			id: 'village-junction-topiary',
			textureKey: villageDressingAsset.key,
			frameName: 'hedgeTopiary',
			x: 600,
			y: 4_900,
			width: 130,
			height: 150,
			mode: 'image'
		}
	],
	ambientNpcs: [
		{ id: 'village-wanderer', x: 1_000, y: 5_150, frameName: 'travelerNpc' },
		{ id: 'village-woodcutter', x: 308, y: 4_800, frameName: 'woodcutterNpc' },
		{ id: 'village-fisher', x: 308, y: 5_500, frameName: 'fisherNpc' },
		{ id: 'village-crier', x: 1_692, y: 4_900, frameName: 'crierNpc' }
	],
	pickups: [
		{ id: 'village-corridor-cache', x: 2_700, y: 4_480, itemId: 'field-potion', quantity: 1 }
	],
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
			tile: 'plazaStoneTile'
		},
		{
			id: 'village-spawn-pocket',
			x: 700,
			y: 5_550,
			width: 300,
			height: 100,
			tile: 'pathTile'
		},
		// Ring road lane tiles — between perimeter and inner walls
		{ id: 'village-lane-west-ring', x: 308, y: 5_100, width: 100, height: 1_000, tile: 'pathTile' },
		{
			id: 'village-lane-north-ring',
			x: 1_000,
			y: 4_483,
			width: 1_300,
			height: 100,
			tile: 'pathTile'
		},
		{
			id: 'village-lane-east-ring',
			x: 1_692,
			y: 5_100,
			width: 100,
			height: 1_000,
			tile: 'pathTile'
		},
		{
			id: 'village-lane-south-ring',
			x: 1_000,
			y: 5_711,
			width: 1_400,
			height: 100,
			tile: 'pathTile'
		},
		// Spoke lanes — connecting plaza to ring road
		{ id: 'village-lane-w-spoke', x: 600, y: 5_000, width: 600, height: 100, tile: 'pathTile' },
		{ id: 'village-lane-e-spoke', x: 1_250, y: 5_130, width: 450, height: 100, tile: 'pathTile' },
		{ id: 'village-lane-s-spoke', x: 950, y: 5_400, width: 100, height: 300, tile: 'pathTile' },
		// Dead-end spur tiles
		{
			id: 'village-lane-blacksmith-spur',
			x: 500,
			y: 5_200,
			width: 100,
			height: 200,
			tile: 'pathTile'
		},
		{
			id: 'village-lane-itemshop-spur',
			x: 600,
			y: 4_800,
			width: 100,
			height: 150,
			tile: 'pathTile'
		},
		{ id: 'village-lane-vh2-spur', x: 1_200, y: 4_700, width: 100, height: 100, tile: 'pathTile' },
		// Exit corridor path
		{
			id: 'village-lane-exit-corridor',
			x: 2_275,
			y: 4_225,
			width: 900,
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
		},
		// === Village perimeter ===
		// Outer rectangle at x∈[168,1832], y∈[4368,5832]. North + South span the full
		// width to seal the corners. The NE gate gap (x∈[1600,1700]) is the village exit
		// — the spawn→crossroads critical route threads through it, and the whole-map
		// connectivity flood-fill escapes to the whispering-cave threshold via it.
		{
			id: 'village-perimeter-north-west',
			x: 884,
			y: 4_400,
			width: 1_432,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'village-perimeter-north-east',
			x: 1_766,
			y: 4_400,
			width: 132,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'village-perimeter-west',
			x: 200,
			y: 5_100,
			width: 64,
			height: 1_400,
			kind: 'town-hedge'
		},
		{
			id: 'village-perimeter-south',
			x: 1_000,
			y: 5_800,
			width: 1_664,
			height: 64,
			kind: 'town-hedge'
		},
		// East wall runs the full height y∈[4400,5800], closing the unintended
		// y∈[4432,4600] gap. The ONLY NE opening is the gate at x∈[1600,1700]
		// (between perimeter-north-west and perimeter-north-east), reserved for Task 4.
		{
			id: 'village-perimeter-east',
			x: 1_800,
			y: 5_100,
			width: 64,
			height: 1_400,
			kind: 'town-hedge'
		},
		// === Ring road pocket walls (double as inner ring boundary + dead-end enclosures) ===
		// Each pocket is a small enclosed room off the ring road; lane samples inside count as dead-ends.
		// NW pocket — interior x∈[240,440], y∈[4440,4530]. Walls S only (perimeter
		// forms N + W). E wall removed to open a ~120px gap onto the N-ring lane
		// (was a sealed box on all 4 sides).
		{ id: 'vp-nw-s', x: 340, y: 4_540, width: 220, height: 32, kind: 'town-hedge' },
		// N pocket — interior x∈[820,1020], y∈[4440,4520]. Walls S + W (perimeter
		// forms N). E wall removed to open a ~100px gap onto the N-ring lane
		// (was a sealed box on all 4 sides).
		{ id: 'vp-n-s', x: 920, y: 4_540, width: 220, height: 32, kind: 'town-hedge' },
		{ id: 'vp-n-w', x: 820, y: 4_490, width: 32, height: 100, kind: 'town-hedge' },
		// NE pocket — interior x∈[1430,1640], y∈[4440,4530]. Walls S + W (perimeter forms N + E).
		{ id: 'vp-ne-s', x: 1_530, y: 4_540, width: 220, height: 32, kind: 'town-hedge' },
		{ id: 'vp-ne-w', x: 1_430, y: 4_485, width: 32, height: 120, kind: 'town-hedge' },
		// W pocket — interior x∈[250,440], y∈[4700,4850]. 3 walls (perimeter forms W).
		{ id: 'vp-w-n', x: 340, y: 4_700, width: 180, height: 32, kind: 'town-hedge' },
		{ id: 'vp-w-e', x: 448, y: 4_775, width: 32, height: 120, kind: 'town-hedge' },
		{ id: 'vp-w-s', x: 340, y: 4_850, width: 180, height: 32, kind: 'town-hedge' },
		// E pocket — interior x∈[1490,1710], y∈[5250,5400]. N/S walls stop at x≤1710
		// so the E-ring corridor (x≈1716) stays clear for connectivity; opens E to ring.
		{ id: 'vp-e-n', x: 1_600, y: 5_250, width: 220, height: 32, kind: 'town-hedge' },
		{ id: 'vp-e-w', x: 1_490, y: 5_325, width: 32, height: 120, kind: 'town-hedge' },
		{ id: 'vp-e-s', x: 1_600, y: 5_400, width: 220, height: 32, kind: 'town-hedge' },
		// SW pocket — interior x∈[300,440], y∈[5450,5600]. 3 walls (perimeter forms W).
		// Walls start at x≥300 to keep the W-ring corridor (x≈276) clear for connectivity.
		{ id: 'vp-sw-n', x: 365, y: 5_450, width: 130, height: 32, kind: 'town-hedge' },
		{ id: 'vp-sw-e', x: 448, y: 5_525, width: 32, height: 120, kind: 'town-hedge' },
		{ id: 'vp-sw-s', x: 365, y: 5_600, width: 130, height: 32, kind: 'town-hedge' },
		// S pocket — interior x∈[820,1020], y∈[5650,5750]. Only the N wall (vp-s-n) is
		// needed: it doubles as the S-ring north boundary. The W/E walls are omitted so
		// the S-ring corridor stays fully navigable around the S-junction noses (the
		// detour band y∈[5712,5768] must have a clear 32px-grid row).
		{ id: 'vp-s-n', x: 920, y: 5_650, width: 220, height: 32, kind: 'town-hedge' },
		// SE pocket — interior x∈[1490,1710], y∈[5450,5600]. N/S walls stop at x≤1710
		// to keep the E-ring corridor clear; opens E to ring.
		{ id: 'vp-se-n', x: 1_600, y: 5_450, width: 220, height: 32, kind: 'town-hedge' },
		{ id: 'vp-se-w', x: 1_490, y: 5_525, width: 32, height: 120, kind: 'town-hedge' },
		{ id: 'vp-se-s', x: 1_600, y: 5_600, width: 220, height: 32, kind: 'town-hedge' },
		// SE-S pocket — interior x∈[1180,1380], y∈[5650,5750]. Only N wall kept (S-ring
		// north boundary); W/E walls omitted to keep the S-ring detour band navigable.
		{ id: 'vp-ses-n', x: 1_280, y: 5_650, width: 220, height: 32, kind: 'town-hedge' },
		// === Junction noses ===
		// W-spoke × W-ring junction at (290, 5000): noses block sight N, S, and E.
		{ id: 'vn-w-nose-n', x: 264, y: 4_968, width: 64, height: 32, kind: 'town-hedge' },
		{ id: 'vn-w-nose-s', x: 264, y: 5_032, width: 64, height: 32, kind: 'town-hedge' },
		{ id: 'vn-w-nose-e', x: 354, y: 4_984, width: 32, height: 64, kind: 'town-hedge' },
		// E-spoke × E-ring junction at (1700, 5130): noses block sight N, S, and W.
		// Noses centered on x=1700 so junction rays (which stay at x=1700) hit them.
		{ id: 'vn-e-nose-n', x: 1_700, y: 5_068, width: 32, height: 32, kind: 'town-hedge' },
		{ id: 'vn-e-nose-s', x: 1_700, y: 5_192, width: 32, height: 32, kind: 'town-hedge' },
		{ id: 'vn-e-nose-w', x: 1_646, y: 5_130, width: 32, height: 32, kind: 'town-hedge' },
		// SE detour bend at (1240, 5400): noses block sight across the bend.
		{ id: 'vn-se-nose-n', x: 1_208, y: 5_336, width: 64, height: 32, kind: 'town-hedge' },
		{ id: 'vn-se-nose-s', x: 1_240, y: 5_448, width: 32, height: 64, kind: 'town-hedge' },
		{ id: 'vn-se-nose-w', x: 1_176, y: 5_400, width: 32, height: 64, kind: 'town-hedge' },
		// S-corridor junction at (1000, 5680): noses block sight E, W, N.
		{ id: 'vn-s-nose-n', x: 1_032, y: 5_648, width: 32, height: 64, kind: 'town-hedge' },
		{ id: 'vn-s-nose-w', x: 936, y: 5_696, width: 32, height: 32, kind: 'town-hedge' },
		{ id: 'vn-s-nose-e', x: 1_064, y: 5_696, width: 32, height: 32, kind: 'town-hedge' },
		// === Inner ring boundary walls ===
		// These bound the ring-road lane samples on the building side,
		// filling y-gaps between buildings. Gaps left for spokes.
		// W inner (x≈400): covers y above item-shop and below blacksmith.
		{ id: 'vw-inner-upper', x: 400, y: 4_713, width: 32, height: 467, kind: 'town-hedge' },
		{ id: 'vw-inner-lower', x: 400, y: 5_370, width: 32, height: 620, kind: 'town-hedge' },
		// W spoke S boundary (where blacksmith doesn't cover, x∈[320,800]).
		// y=5090 sits below the item-shop-to-meadow arrival at (600,5045).
		{ id: 'vw-spoke-s', x: 560, y: 5_090, width: 480, height: 32, kind: 'town-hedge' },
		// N inner (y≈4550): continuous above the north buildings row.
		{ id: 'vn-inner', x: 900, y: 4_550, width: 1_400, height: 32, kind: 'town-hedge' },
		// E inner (x≈1600): covers the y-gap below guild-hall only. The E-ring N-half
		// lane starts at y=4740 (guild-hall top) so no west wall is needed above it —
		// that region is the NE exit-gate corridor the spawn→crossroads route threads.
		{ id: 've-inner-lower', x: 1_600, y: 5_400, width: 32, height: 480, kind: 'town-hedge' },
		// E spoke boundary fillers — guild-hall (N) and shrine/vh3 (S) leave end gaps.
		// South gap between shrine (right 1154) and vh3 (left 1335): wall at y=5220.
		{ id: 've-spoke-s', x: 1_245, y: 5_220, width: 180, height: 32, kind: 'town-hedge' },
		// North gap east of guild-hall (right 1592) up to E ring (1700): wall at y=5050.
		{ id: 've-spoke-n', x: 1_645, y: 5_050, width: 90, height: 32, kind: 'town-hedge' },
		// S corridor N boundary (filling x-gaps between buildings at y≈5610).
		{ id: 'vs-gap-w', x: 375, y: 5_630, width: 350, height: 48, kind: 'town-hedge' },
		{ id: 'vs-gap-mid', x: 1_240, y: 5_630, width: 180, height: 48, kind: 'town-hedge' },
		// vs-gap-e stops at x≤1690 so the E-ring corridor (x≈1716) can reach the S-ring.
		{ id: 'vs-gap-e', x: 1_625, y: 5_630, width: 130, height: 48, kind: 'town-hedge' },
		// === Exit corridor walls ===
		// Paired town-hedge walls flanking the winding dogleg from village gate to crossroads.
		// ±160px perpendicular offset from each corridor segment. Each wall extends 20px
		// past segment endpoints to ensure corner overlap (no ray-cast edge gaps).
		// Segment 1 (1650,4550)→(1650,4350) passes through the village gate — no
		// dedicated walls needed; the village perimeter provides enclosure there.
		// Segment: (1650,4350)→(1850,4350) horizontal
		{ id: 'corridor-wall-2a', x: 1_750, y: 4_190, width: 220, height: 64, kind: 'town-hedge' },
		{ id: 'corridor-wall-2b', x: 1_775, y: 4_510, width: 170, height: 64, kind: 'town-hedge' },
		// Segment: (1850,4350)→(1850,4100) vertical
		// wall-3a height capped at 220 (y∈[4115,4335]) so it doesn't block the
		// mainRoute junction at y=4350 where segment 2 turns into segment 3.
		{ id: 'corridor-wall-3a', x: 1_690, y: 4_225, width: 64, height: 220, kind: 'town-hedge' },
		{ id: 'corridor-wall-3b', x: 2_010, y: 4_225, width: 64, height: 270, kind: 'town-hedge' },
		// Segment: (1850,4100)→(2200,4100) horizontal
		{ id: 'corridor-wall-4a', x: 2_025, y: 3_940, width: 370, height: 64, kind: 'town-hedge' },
		{ id: 'corridor-wall-4b', x: 2_040, y: 4_260, width: 330, height: 64, kind: 'town-hedge' },
		// Segment: (2200,4100)→(2200,4350) vertical
		{ id: 'corridor-wall-5a', x: 2_040, y: 4_225, width: 64, height: 270, kind: 'town-hedge' },
		{ id: 'corridor-wall-5b', x: 2_360, y: 4_225, width: 64, height: 270, kind: 'town-hedge' },
		// Segment: (2200,4350)→(2550,4350) horizontal
		{ id: 'corridor-wall-6a', x: 2_375, y: 4_190, width: 370, height: 64, kind: 'town-hedge' },
		{ id: 'corridor-wall-6b', x: 2_375, y: 4_510, width: 370, height: 64, kind: 'town-hedge' },
		// Segment: (2550,4350)→(2550,4100) vertical
		{ id: 'corridor-wall-7a', x: 2_390, y: 4_225, width: 64, height: 270, kind: 'town-hedge' },
		{ id: 'corridor-wall-7b', x: 2_710, y: 4_225, width: 64, height: 270, kind: 'town-hedge' },
		// Segment: (2550,4100)→(2900,4100) horizontal
		{ id: 'corridor-wall-8a', x: 2_725, y: 3_940, width: 370, height: 64, kind: 'town-hedge' },
		{ id: 'corridor-wall-8b', x: 2_725, y: 4_260, width: 370, height: 64, kind: 'town-hedge' },
		// Segment: (2900,4100)→(2900,4400) vertical — east side covered by crossroads-west-hedge
		{ id: 'corridor-wall-9a', x: 2_740, y: 4_250, width: 64, height: 300, kind: 'town-hedge' },
		// Segment: (2900,4400)→(3200,4400) horizontal — north side covered by crossroads-west-hedge
		{ id: 'corridor-wall-10b', x: 3_050, y: 4_560, width: 300, height: 64, kind: 'town-hedge' }
	],
	fences: []
};
