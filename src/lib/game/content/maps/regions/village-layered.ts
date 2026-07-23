import { villageDressingAsset } from '$lib/game/content/assets';
import type { DecorGlyphSpec, LayeredRegionSource } from '$lib/game/content/maps/layered/types';

const villageDecorGlyphTable: Record<
	string,
	DecorGlyphSpec<(typeof villageDressingAsset)['key']>
> = {
	f: {
		frame: 'flowerBed',
		textureKey: villageDressingAsset.key,
		renderWidth: 150,
		renderHeight: 120
	},
	m: {
		frame: 'marketStall',
		textureKey: villageDressingAsset.key,
		renderWidth: 240,
		renderHeight: 190
	},
	b: {
		frame: 'festivalBanner',
		textureKey: villageDressingAsset.key,
		renderWidth: 160,
		renderHeight: 220
	},
	s: {
		frame: 'scarecrow',
		textureKey: villageDressingAsset.key,
		renderWidth: 120,
		renderHeight: 170
	},
	D: {
		frame: 'hedgeTopiary',
		textureKey: villageDressingAsset.key,
		renderWidth: 120,
		renderHeight: 140
	},
	F: {
		frame: 'fountain',
		textureKey: villageDressingAsset.key,
		renderWidth: 180,
		renderHeight: 150
	},
	A: {
		frame: 'gateArch',
		textureKey: villageDressingAsset.key,
		renderWidth: 220,
		renderHeight: 200
	},
	l: {
		frame: 'poleLantern',
		textureKey: villageDressingAsset.key,
		renderWidth: 100,
		renderHeight: 200,
		collision: { width: 50, height: 60 }
	},
	h: {
		frame: 'hangingLantern',
		textureKey: villageDressingAsset.key,
		renderWidth: 110,
		renderHeight: 130,
		depth: 'foreground'
	},
	o: {
		frame: 'offeringStand',
		textureKey: villageDressingAsset.key,
		renderWidth: 180,
		renderHeight: 180,
		collision: { width: 80, height: 60 }
	},
	t: {
		frame: 'stoneLantern',
		textureKey: villageDressingAsset.key,
		renderWidth: 180,
		renderHeight: 180,
		collision: { width: 80, height: 60 }
	},
	M: {
		frame: 'autumnMaple',
		textureKey: villageDressingAsset.key,
		renderWidth: 220,
		renderHeight: 280,
		collision: { width: 70, height: 70 }
	}
};

export const sundropVillageLayered: LayeredRegionSource<(typeof villageDressingAsset)['key']> = {
	idPrefix: 'village',
	tileSize: 32,
	origin: { x: 256, y: 4_352 },
	width: 56,
	height: 48,
	layers: {
		terrain: [
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................'
		],
		paths: [
			'......................................ccccccccccc.......',
			'......................................ccccccccccc.......',
			'............................................ppppp.......',
			'............................................ppppp.......',
			'............................................ppppp.......',
			'........................................ppppppppp.......',
			'........................................ppppppppp.......',
			'........................................ppppppppp.......',
			'..................ppppppppppppppppppppppppppppppp.......',
			'..................ppppppppppppppppppppppp...............',
			'..................ppppppppppppppppppppppp...............',
			'..................ppppppppppppppppppppppp...............',
			'..................ppppppppppppppppppppppp...............',
			'..................ppppppppppppppppppppppp...............',
			'..................ppppppppppppppppppppppp...............',
			'..................ppppppppppppppppppppppp...............',
			'.........................ppp.....pppppppp...............',
			'.........................ppp.....pppppppp...............',
			'.........................ppp.....pppppppp...............',
			'.........................ppp.....pppppppp...............',
			'.........................ppp.....pppppppp...............',
			'.........................ppp.....pppppppp...............',
			'......ppppppppppppppccccccccccccc.......................',
			'......ppppppppppppppccccccccccccc.......................',
			'......ppppppppppppppccccccccccccc.......................',
			'......pppppppppppppppcccccccccccc.......................',
			'......pppppppppppppppcccccccccccc.......................',
			'......ppppppppppppppccccccccccccc.......................',
			'......ppppppppppppppccccccccccccc.......................',
			'......ppppppppppppppccccccccccccc.......................',
			'..............ppp........ppp............................',
			'..............ppp........ppp............................',
			'..............ppp........ppp............................',
			'..............ppp........ppp............................',
			'..............ppp.....aaaaaaaaaaaaaaaaaaa...............',
			'..............ppp.....aaaaaaaaaaaaaaaaaaa...............',
			'......ppppppppppppppp.aaaaaaaaaaaaaaaaaaa...............',
			'......ppppppppppppppp.aaaaaaaaaaaaaaaaaaa...............',
			'......ppppppppppppppp.aaaaaaaaaaaaaaaaaaa...............',
			'......ppppppppppppppp.aaaaaaaaaaaaaaaaaaa...............',
			'......ppppppppppppppp.aaaaaaaaaaaaaaaaaaaa..............',
			'......ppppppppppppppp.aaaaaaaaaaaaaaaaaaa...............',
			'......ppppppppppppppp.aaaaaaaaaaaaaaaaaaa...............',
			'......................aaaaaaaaaaaaaaaaaaa...............',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................'
		],
		// HPA-238 v3 partial-spur layout. Two earlier attempts each failed one half
		// of the brief: the original eight full-height hedge compartments read as
		// cramped, and opening them into three bands read better but collapsed the
		// room graph — every room sharing a band abutted every other, producing 12
		// adjacencies instead of the 9 the issue's target route structure specifies
		// (it gained E-N, E-P, G-P, M-N and lost H-P, which is on the critical
		// route). This layout keeps the 9-edge skeleton but cuts each divider back
		// to a partial spur, so a gate is a wide street rather than a slot and the
		// rooms still read as open space:
		//   row 19  cols 24-29 open  N-P  (critical)   spurs 2-23, 30-35
		//   col 20  rows 20-24 open  M-P               spur rows 25-31
		//   col 35  rows 14-18 open  N-G  (critical)   spur rows 4-13
		//   row 10  cols 48-50 open  G-E  (critical)   spur cols 35-47
		//           (not widened west: cols 46-47 of row 11 are under the guild
		//            hall, so a wider gate would open onto the building — A10)
		//   row 32  cols 4-7 open    H-M
		//           cols 20-23 open  H-P  (critical)
		//           cols 29-32 open  P-S               spurs 8-19, 24-28, 33-52
		//   col 24  rows 36-40 open  H-S               spurs rows 33-35, 41-45
		//   row 2   cols 38-48 open  E-C  (critical; also clears the paths.ts
		//                                 corridor wall documented in the spec)
		// Every solid run is >=3 on one axis (A4), and no gate touches a third
		// room, which is what keeps the graph at 9 edges and off a ring road.
		collision: [
			'.....................................#...........#......',
			'.....................................#...........#......',
			'..####################################...........####...',
			'..##################################...............##...',
			'..##...............................#...............##...',
			'..##...............................#...............##...',
			'..##...............................#...............##...',
			'..##...............................#...............##...',
			'..##...............................#...............##...',
			'..##...............................#...............##...',
			'..##...............................#############...##...',
			'..##...............................#...............##...',
			'..##...............................#...............##...',
			'..##...............................#...............##...',
			'..##...............................................##...',
			'..##...............................................##...',
			'..##...............................................##...',
			'..##...............................................##...',
			'..##...............................................##...',
			'..######################......######...............##...',
			'..#...............................##...............##...',
			'..#...............................##...............##...',
			'..#...............................##...............##...',
			'..#...............................##...............##...',
			'..#...............................##...............##...',
			'..#.................#.............##...............##...',
			'..#.................#.............##...............##...',
			'..#.................#.............##...............##...',
			'..#.................#.............##...............##...',
			'..#.................#.............##...............##...',
			'..#.................#.............##...............##...',
			'..#.................#.............##...............##...',
			'..##....############....#####....####################...',
			'..##....................#........................####...',
			'..##....................#........................####...',
			'..##....................#........................####...',
			'..##.............................................####...',
			'..##.............................................####...',
			'..##.............................................####...',
			'..##.............................................####...',
			'..##.............................................####...',
			'..##....................#........................####...',
			'..##....................#........................####...',
			'..##....................#........................####...',
			'..##....................#........................####...',
			'..##....................#........................####...',
			'..###################################################...',
			'........................................................'
		],
		// HPA-238 v2 decor pass (human visual gate: "still too crowded / check
		// for overlap"). Decor sprites render far larger than their one-tile
		// anchor — a maple is ~7×9 tiles, a market stall ~7×6 — so the earlier
		// grouped pass had its props overlapping the buildings and each other
		// heavily, which read as clutter. This set is deliberately sparse and
		// every sprite rect is disjoint from every building and every other prop
		// (asserted by the "no sprite overlaps" contract test): a gate arch at
		// the entrance, one stall in the market's open east, a scarecrow + flower
		// bed in the open home yard, and a symmetric shrine garden (two hedges
		// above two stone lanterns, mirrored about the shrine). The two stone
		// lanterns are the only collision props; A9/A10/A11 verify they seal
		// nothing. Everything else is left as open ground.
		decor: [
			'........................................................',
			'........................................................',
			'........................................................',
			'..........................................A.............',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'................m.......................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'..............f.........................................',
			'........................................................',
			'........................................................',
			'............................D...............D...........',
			'........................................................',
			'........................................................',
			'........................................................',
			'...................s....................................',
			'........................................................',
			'............................t...............t...........',
			'........................................................',
			'........................................................',
			'........................................................',
			'...................f....................................',
			'........................................................',
			'........................................................',
			'........................................................'
		],
		regions: [
			'......................................CCCCCCCCCCC.......',
			'......................................CCCCCCCCCCC.......',
			'......................................CCCCCCCCCCC.......',
			'....................................EEEEEEEEEEEEEEE.....',
			'....NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.EEEEEEEEEEEEEEE.....',
			'....NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.EEEEEEEEEEEEEEE.....',
			'....NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.EEEEEEEEEEEEEEE.....',
			'....NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.EEEEEEEEEEEEEEE.....',
			'....NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.EEEEEEEEEEEEEEE.....',
			'....NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.EEEEEEEEEEEEEEE.....',
			'....NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.....................',
			'....NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGGGG.....',
			'....NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGGGG.....',
			'....NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGGGG.....',
			'....NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGGGG.....',
			'....NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGGGG.....',
			'....NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGGGG.....',
			'....NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGGGG.....',
			'....NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGGGG.....',
			'....................................GGGGGGGGGGGGGGG.....',
			'...MMMMMMMMMMMMMMMMM.PPPPPPPPPPPPP..GGGGGGGGGGGGGGG.....',
			'...MMMMMMMMMMMMMMMMM.PPPPPPPPPPPPP..GGGGGGGGGGGGGGG.....',
			'...MMMMMMMMMMMMMMMMM.PPPPPPPPPPPPP..GGGGGGGGGGGGGGG.....',
			'...MMMMMMMMMMMMMMMMM.PPPPPPPPPPPPP..GGGGGGGGGGGGGGG.....',
			'...MMMMMMMMMMMMMMMMM.PPPPPPPPPPPPP..GGGGGGGGGGGGGGG.....',
			'...MMMMMMMMMMMMMMMMM.PPPPPPPPPPPPP..GGGGGGGGGGGGGGG.....',
			'...MMMMMMMMMMMMMMMMM.PPPPPPPPPPPPP..GGGGGGGGGGGGGGG.....',
			'...MMMMMMMMMMMMMMMMM.PPPPPPPPPPPPP..GGGGGGGGGGGGGGG.....',
			'...MMMMMMMMMMMMMMMMM.PPPPPPPPPPPPP..GGGGGGGGGGGGGGG.....',
			'...MMMMMMMMMMMMMMMMM.PPPPPPPPPPPPP..GGGGGGGGGGGGGGG.....',
			'...MMMMMMMMMMMMMMMMM.PPPPPPPPPPPPP..GGGGGGGGGGGGGGG.....',
			'...MMMMMMMMMMMMMMMMM.PPPPPPPPPPPPP..GGGGGGGGGGGGGGG.....',
			'........................................................',
			'....HHHHHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSSSSS.......',
			'....HHHHHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSSSSS.......',
			'....HHHHHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSSSSS.......',
			'....HHHHHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSSSSS.......',
			'....HHHHHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSSSSS.......',
			'....HHHHHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSSSSS.......',
			'....HHHHHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSSSSS.......',
			'....HHHHHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSSSSS.......',
			'....HHHHHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSSSSS.......',
			'....HHHHHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSSSSS.......',
			'....HHHHHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSSSSS.......',
			'....HHHHHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSSSSS.......',
			'....HHHHHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSSSSS.......',
			'........................................................',
			'........................................................'
		]
	},
	decorGlyphTable: villageDecorGlyphTable,
	objects: {
		// HPA-238 v2 (human visual gate): the first blockout read as crowded
		// because three building pairs sat wall-to-wall (item-shop+blacksmith in
		// M, the two north houses in N, shrine+villager-house-3 in S). Buildings
		// are landmark rects, not collision-layer glyphs, so repositioning them
		// leaves the room/gate/corridor skeleton (A1–A8) untouched and only the
		// composed-rule passability (A9–A11) to re-verify. New distribution — one
		// or two well-separated buildings per room:
		//   H  home yard : hero-house alone, open yard around the spawn
		//   M  market    : item-shop alone, fronted by a stall cluster
		//   P  plaza     : the well alone
		//   N  residences: a lane of three houses — villager-house-1 (west),
		//                  villager-house-3 (centre), villager-house-2 (east),
		//                  each separated by a two-tile alley
		//   G  guild ward: guild-hall (top) + blacksmith (relocated to its open bottom)
		//   S  shrine    : shrine-of-aurora alone, centred in its garden
		landmarks: [
			{
				id: 'hero-house-exterior',
				col: 11,
				row: 37,
				width: 235,
				height: 246,
				labelKey: 'content.maps.landmarks.hero-house-exterior.label'
			},
			{
				id: 'item-shop-exterior',
				col: 7,
				row: 24,
				width: 246,
				height: 235,
				labelKey: 'content.maps.landmarks.item-shop-exterior.label'
			},
			{
				// Relocated from the market (col 15) to the guild ward's open south
				// half. The smithy has no interior transition, so it is a fully
				// solid rect; G's lower rows (20–31) are clear of the E-G and G-N
				// gates, so it seals nothing.
				id: 'blacksmith',
				col: 42,
				row: 26,
				width: 235,
				height: 226,
				labelKey: 'content.maps.landmarks.blacksmith.label'
			},
			{
				id: 'villager-house-1-exterior',
				col: 8,
				row: 11,
				width: 226,
				height: 205,
				labelKey: 'content.maps.landmarks.villager-house-1-exterior.label'
			},
			{
				id: 'villager-house-2-exterior',
				col: 28,
				row: 11,
				width: 338,
				height: 261,
				labelKey: 'content.maps.landmarks.villager-house-2-exterior.label'
			},
			{
				id: 'guild-hall-exterior',
				col: 42,
				row: 15,
				width: 307,
				height: 277,
				labelKey: 'content.maps.landmarks.guild-hall-exterior.label'
			},
			{
				id: 'sundrop-well',
				col: 26,
				row: 25,
				width: 141,
				height: 160,
				labelKey: 'content.maps.landmarks.sundrop-well.label'
			},
			{
				id: 'shrine-of-aurora',
				col: 36,
				row: 38,
				width: 246,
				height: 333,
				labelKey: 'content.maps.landmarks.shrine-of-aurora.label'
			},
			{
				// Relocated from the packed shrine garden (col 43) to the centre of
				// the north residential lane, a spaced neighbour between houses 1
				// and 2. Its tall footprint sits high in N (rows 6–16), leaving the
				// rows 17–18 lane clear beneath it.
				id: 'villager-house-3-exterior',
				col: 17,
				row: 11,
				width: 184,
				height: 333,
				labelKey: 'content.maps.landmarks.villager-house-3-exterior.label'
			}
		],
		transitions: [
			{
				id: 'meadow-to-hero-house',
				col: 11,
				row: 42,
				toMapId: 'hero-house',
				showMarker: false,
				arrival: { x: 256, y: 224, facing: 'up' }
			},
			{
				id: 'meadow-to-item-shop',
				col: 7,
				row: 29,
				toMapId: 'item-shop',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-villager-house-1',
				col: 8,
				row: 15,
				toMapId: 'villager-house-1',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-villager-house-2',
				col: 28,
				row: 16,
				toMapId: 'villager-house-2',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-guild-hall',
				col: 42,
				row: 21,
				toMapId: 'guild-hall',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-shrine-of-aurora',
				col: 36,
				row: 44,
				toMapId: 'shrine-of-aurora-interior',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-villager-house-3',
				col: 17,
				row: 17,
				toMapId: 'villager-house-3',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			}
		],
		pickups: [
			// Tucked in the market's open east side (region M): clears item-shop
			// (cols 3–11) and the stall cluster, and stays >=5 walkable tiles from
			// the main route (village-layered.test.ts asserts the distance).
			{ id: 'village-market-cache', col: 16, row: 21, itemId: 'field-potion', quantity: 1 },
			// In the shrine garden's open east side (region S), on the doorstep
			// strip south of the shrine. With villager-house-3 relocated to the
			// north lane, room S is now a single-building garden with room to spare.
			{ id: 'village-shrine-cache', col: 41, row: 44, itemId: 'sunleaf-salve', quantity: 1 }
		],
		ambientNpcs: [
			{ id: 'village-wanderer', col: 23, row: 28, frameName: 'travelerNpc' },
			{ id: 'village-woodcutter', col: 12, row: 16, frameName: 'woodcutterNpc' },
			{ id: 'village-pilgrim', col: 30, row: 44, frameName: 'pilgrimNpc' },
			{ id: 'village-crier', col: 29, row: 30, frameName: 'crierNpc' }
		]
	}
};
