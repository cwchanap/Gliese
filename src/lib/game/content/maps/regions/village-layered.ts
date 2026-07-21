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
		// task 4j: row 10 (G-E gate) moved its 3-col opening from 42-44 to
		// 48-50 — guild-hall-exterior (cols 37.70-47.30) blocked the approach
		// from inside G at the old position. row 32 (H-M gate) moved its 2-col
		// opening from 8-9 to 4-5 — hero-house-exterior (cols 7.83-15.17)
		// blocked the approach from inside H at the old position. col 20
		// (M-P gate) moved its 2-row opening from rows 25-27→21-22 — this
		// gate was not one of the brief's four root causes, but measuring it
		// (per the brief's own "check both sides" instruction) found
		// blacksmith (cols 11.83-19.17, rows 23.97-31.03) blocking the
		// approach from inside M at the old rows; rows 20-23 are clear of
		// both blacksmith and the row-19 N/M wall.
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
			'..##...............................#...............##...',
			'..##...............................#...............##...',
			'..########################...#######...............##...',
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
			'..#.................#.............##...............##...',
			'..#.................#.............##...............##...',
			'..##..###############...######..#####################...',
			'..##....................#........................####...',
			'..##....................#........................####...',
			'..##....................#........................####...',
			'..##.............................................####...',
			'..##.............................................####...',
			'..##....................#........................####...',
			'..##....................#........................####...',
			'..##....................#........................####...',
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
