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
			'......................................ppppppppppp.......',
			'......................................ppppppppppp.......',
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
		collision: [
			'........................................................',
			'........................................................',
			'..######################################...##########...',
			'..##################################...............##...',
			'..##################################...............##...',
			'..##################################...............##...',
			'..##################################...............##...',
			'..##################################...............##...',
			'..############.....................#...............##...',
			'..############.....................#...............##...',
			'..############.....................#######...########...',
			'..############.....................#.............####...',
			'..############.....................#.............####...',
			'..############.....................#.............####...',
			'..############...................................####...',
			'..############...................................####...',
			'..############...................................####...',
			'..############.....................#.............####...',
			'..############.....................#.............####...',
			'..########################...########################...',
			'..###..............#..............###################...',
			'..###..............#..............###################...',
			'..###..............#..............###################...',
			'..###..............#..............###################...',
			'..###..............#..............###################...',
			'..###.............................###################...',
			'..###.............................###################...',
			'..###.............................###################...',
			'..###..............#..............###################...',
			'..###..............#..............###################...',
			'..###..............#..............###################...',
			'..###..............#..............###################...',
			'..######..##########...#######..#####################...',
			'..####.................#.....................########...',
			'..####.................#.....................########...',
			'..####.................#.....................########...',
			'..####.......................................########...',
			'..####.......................................########...',
			'..####.................#.....................########...',
			'..####.................#.....................########...',
			'..####.................#.....................########...',
			'..####.................#.....................########...',
			'..####.................#.....................########...',
			'..####.................#.....................########...',
			'..###################################################...',
			'........................................................',
			'........................................................',
			'........................................................'
		],
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
			'....................................l...................',
			'........................................................',
			'........................................................',
			'................l.......................................',
			'........................................................',
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
			'........................................................',
			'....................................EEEEEEEEEEEEEEE.....',
			'....................................EEEEEEEEEEEEEEE.....',
			'....................................EEEEEEEEEEEEEEE.....',
			'....................................EEEEEEEEEEEEEEE.....',
			'....................................EEEEEEEEEEEEEEE.....',
			'..............NNNNNNNNNNNNNNNNNNNNN.EEEEEEEEEEEEEEE.....',
			'..............NNNNNNNNNNNNNNNNNNNNN.EEEEEEEEEEEEEEE.....',
			'..............NNNNNNNNNNNNNNNNNNNNN.....................',
			'..............NNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGG.......',
			'..............NNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGG.......',
			'..............NNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGG.......',
			'..............NNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGG.......',
			'..............NNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGG.......',
			'..............NNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGG.......',
			'..............NNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGG.......',
			'..............NNNNNNNNNNNNNNNNNNNNN.GGGGGGGGGGGGG.......',
			'........................................................',
			'.....MMMMMMMMMMMMMM.PPPPPPPPPPPPPP......................',
			'.....MMMMMMMMMMMMMM.PPPPPPPPPPPPPP......................',
			'.....MMMMMMMMMMMMMM.PPPPPPPPPPPPPP......................',
			'.....MMMMMMMMMMMMMM.PPPPPPPPPPPPPP......................',
			'.....MMMMMMMMMMMMMM.PPPPPPPPPPPPPP......................',
			'.....MMMMMMMMMMMMMM.PPPPPPPPPPPPPP......................',
			'.....MMMMMMMMMMMMMM.PPPPPPPPPPPPPP......................',
			'.....MMMMMMMMMMMMMM.PPPPPPPPPPPPPP......................',
			'.....MMMMMMMMMMMMMM.PPPPPPPPPPPPPP......................',
			'.....MMMMMMMMMMMMMM.PPPPPPPPPPPPPP......................',
			'.....MMMMMMMMMMMMMM.PPPPPPPPPPPPPP......................',
			'.....MMMMMMMMMMMMMM.PPPPPPPPPPPPPP......................',
			'........................................................',
			'......HHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSS...........',
			'......HHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSS...........',
			'......HHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSS...........',
			'......HHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSS...........',
			'......HHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSS...........',
			'......HHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSS...........',
			'......HHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSS...........',
			'......HHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSS...........',
			'......HHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSS...........',
			'......HHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSS...........',
			'......HHHHHHHHHHHHHHHHH.SSSSSSSSSSSSSSSSSSSSS...........',
			'........................................................',
			'........................................................',
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
				row: 38,
				width: 235,
				height: 246,
				labelKey: 'content.maps.landmarks.hero-house-exterior.label'
			},
			{
				id: 'item-shop-exterior',
				col: 10,
				row: 24,
				width: 246,
				height: 235,
				labelKey: 'content.maps.landmarks.item-shop-exterior.label'
			},
			{
				// col/width/height narrowed from the original 9/235/226: at full size
				// this landmark's box overlapped item-shop-exterior's footprint (and the
				// meadow-to-item-shop door + its 64px approach clearance), making the
				// door unreachable under any check that treats landmarks as solid. Room
				// M has no space east of item-shop-exterior for a box this size without
				// bleeding into room P, so the box is narrowed to fit alongside it
				// instead of just being moved.
				id: 'blacksmith',
				col: 17,
				row: 29,
				width: 130,
				height: 126,
				labelKey: 'content.maps.landmarks.blacksmith.label'
			},
			{
				id: 'villager-house-1-exterior',
				col: 18,
				row: 12,
				width: 226,
				height: 205,
				labelKey: 'content.maps.landmarks.villager-house-1-exterior.label'
			},
			{
				id: 'villager-house-2-exterior',
				col: 28,
				row: 12,
				width: 338,
				height: 261,
				labelKey: 'content.maps.landmarks.villager-house-2-exterior.label'
			},
			{
				// height narrowed from 277: at full height the box's south edge
				// buried the door (row 17) ~42px deep inside the landmark, and the
				// only approach is the north gap (row 10) straight down col 42 to
				// the door. With the door landmark-covered, no point within 64px of
				// it was ever solid-free, so meadow-to-guild-hall was unreachable
				// regardless of the actual walkable path. Shrinking (center
				// unchanged) puts the door just past the south edge, matching
				// hero-house/item-shop's working convention.
				id: 'guild-hall-exterior',
				col: 42,
				row: 14,
				width: 307,
				height: 182,
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
				// height narrowed from 333 for the same reason as guild-hall-exterior
				// above: at full height the door (row 42) sat ~38px inside the
				// landmark with no other approach, making meadow-to-shrine-of-aurora
				// unreachable. Shrinking (center unchanged) exposes the door.
				id: 'shrine-of-aurora',
				col: 36,
				row: 38,
				width: 246,
				height: 246,
				labelKey: 'content.maps.landmarks.shrine-of-aurora.label'
			},
			{
				// height narrowed from 333 for the same reason as guild-hall-exterior
				// above: at full height the door (row 41) sat ~38px inside the
				// landmark with no other approach, making
				// meadow-to-villager-house-3 unreachable. Shrinking (center
				// unchanged) exposes the door.
				id: 'villager-house-3-exterior',
				col: 27,
				row: 37,
				width: 184,
				height: 246,
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
				col: 10,
				row: 28,
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
				row: 17,
				toMapId: 'guild-hall',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-shrine-of-aurora',
				col: 36,
				row: 42,
				toMapId: 'shrine-of-aurora-interior',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-villager-house-3',
				col: 27,
				row: 41,
				toMapId: 'villager-house-3',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			}
		],
		pickups: [
			{ id: 'village-market-cache', col: 6, row: 21, itemId: 'field-potion', quantity: 1 },
			{ id: 'village-shrine-cache', col: 43, row: 43, itemId: 'sunleaf-salve', quantity: 1 }
		],
		ambientNpcs: [
			{ id: 'village-wanderer', col: 23, row: 28, frameName: 'travelerNpc' },
			// col 13 fell inside item-shop-exterior's compiled footprint after the
			// re-cut; col 17 stays in room M clear of item-shop-exterior and
			// blacksmith's footprints.
			{ id: 'village-woodcutter', col: 17, row: 23, frameName: 'woodcutterNpc' },
			{ id: 'village-pilgrim', col: 31, row: 40, frameName: 'pilgrimNpc' },
			{ id: 'village-crier', col: 39, row: 7, frameName: 'crierNpc' }
		]
	}
};
