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
			'..#.................#.............##...............##...',
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
		// task 4j: the pole lantern 'l' marking the N-G gateway moved from
		// (col 36, row 12) to (col 32, row 16). Its collision box is anchored
		// ~70px below its glyph tile (not centred), so at row 12 the padded
		// box reached back up and covered the N-G gate cells at col 35, rows
		// 14-15, cutting that gate from 3 standable tiles to 1. Sliding it
		// down the SAME column (36), or to the immediately adjacent column
		// (34), does not fix this: the box's half-width (25px) plus the
		// player radius (12px) reaches 37px — more than one 32px tile pitch
		// — so any glyph within 1 column of col 35 still foots the gate at
		// whatever rows its ~3-row vertical reach lands on. Needed >=2
		// columns of clearance (col 32) to guarantee col 35 is never
		// touched, and row 16 to clear villager-house-2-exterior (rows
		// 7.42-15.58 at this column).
		decor: [
			'........................................................',
			'........................................................',
			'........................................................',
			'.........................................l..............',
			'.........................................A..............',
			'........................................................',
			'........................................l...............',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'................l.......................................',
			'................................l.......................',
			'................b.......................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'...........................h............................',
			'............m...........................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'.......................F................................',
			'........................................................',
			'..................f.........f...........................',
			'........................................................',
			'........................................................',
			'........................................................',
			'.......D................................................',
			'........................................................',
			'........s.................................M.............',
			'........................................................',
			'........................................................',
			'........................................................',
			'.........................o.......t......................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
			'........................................................',
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
				id: 'blacksmith',
				col: 15,
				row: 27,
				width: 235,
				height: 226,
				labelKey: 'content.maps.landmarks.blacksmith.label'
			},
			{
				id: 'villager-house-1-exterior',
				col: 18,
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
				// task 4j: moved from col 28 to col 43. At col 28 this footprint sat
				// directly on top of the P-S gate's south-side approach ((30,33) and
				// (31,33)) and the H-S gate's east-side approach ((25,36) and
				// (25,37)), sealing room S entirely. Cols 40.6-46.4 is the only band
				// in room S (cols 25-48) that clears both gate approaches without
				// colliding with shrine-of-aurora (cols 32.66-40.34).
				id: 'villager-house-3-exterior',
				col: 43,
				row: 38,
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
				col: 18,
				row: 16,
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
				col: 43,
				row: 44,
				toMapId: 'villager-house-3',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			}
		],
		pickups: [
			// col 6/row 21 sits inside item-shop-exterior's restored footprint;
			// col 16 clears every landmark and stays >=5 walkable tiles from the
			// main route (village-layered.test.ts asserts the distance).
			{ id: 'village-market-cache', col: 16, row: 21, itemId: 'field-potion', quantity: 1 },
			// col 41/row 44 sits on the doorstep strip south of both the shrine and
			// the (relocated) villager-house-3 footprint — the original (43,43)
			// spot is now inside villager-house-3-exterior's moved footprint
			// (task 4j: the house moved to col 43 to unseal room S's gates).
			{ id: 'village-shrine-cache', col: 41, row: 44, itemId: 'sunleaf-salve', quantity: 1 }
		],
		ambientNpcs: [
			{ id: 'village-wanderer', col: 23, row: 28, frameName: 'travelerNpc' },
			{ id: 'village-woodcutter', col: 17, row: 23, frameName: 'woodcutterNpc' },
			{ id: 'village-pilgrim', col: 31, row: 40, frameName: 'pilgrimNpc' },
			{ id: 'village-crier', col: 38, row: 7, frameName: 'crierNpc' }
		]
	}
};
