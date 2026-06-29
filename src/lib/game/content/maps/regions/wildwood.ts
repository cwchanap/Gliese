import { forestDressingAsset, shrineDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

/**
 * Wildwood region — the top-right (NE) forest road leading to the Whispering
 * Cave: the gated ruins-threshold transition, the forest-road and combat-pocket
 * ground patches, the colliding canopy decor, the slime encounters, and their
 * combat bounds.
 *
 * The `whispering-cave` landmark is co-located here with its transition,
 * paths, and combat pockets so all Whispering Cave content lives in one file.
 */
export const wildwoodRegion: RegionFragment = {
	landmarks: [
		{
			id: 'whispering-cave',
			x: 5_960,
			y: 1_800,
			width: 256,
			height: 224,
			labelKey: 'content.maps.landmarks.whispering-cave.label'
		}
	],
	transitions: [
		{
			id: 'meadow-to-whispering-cave-ruins-threshold',
			x: 5_960,
			y: 1_868,
			toMapId: 'ruins-threshold',
			requiresClear: true,
			marker: 'stair',
			questRequirement: {
				questId: 'investigate-the-ruins',
				objectiveId: 'talk-to-guild-master'
			},
			arrival: { x: 512, y: 3_200, facing: 'right' }
		}
	],
	groundPatches: [
		{
			id: 'sundrop-forest-road-east',
			x: 4_200,
			y: 5_347,
			width: 2_800,
			height: 70,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-forest-road-north',
			x: 5_600,
			y: 3_200,
			width: 70,
			height: 4_300,
			tile: 'pathTile'
		},
		{
			id: 'wildwood-north-combat-pocket',
			x: 5_120,
			y: 960,
			width: 672,
			height: 384,
			tile: 'pathTile'
		},
		{
			id: 'wildwood-crossing-combat-pocket',
			x: 5_360,
			y: 1_280,
			width: 512,
			height: 320,
			tile: 'pathTile'
		},
		{
			id: 'whispering-cave-combat-pocket',
			x: 5_920,
			y: 1_600,
			width: 512,
			height: 384,
			tile: 'pathTile'
		},
		{
			id: 'wildwood-cave-branch',
			x: 5_880,
			y: 1_600,
			width: 520,
			height: 70,
			tile: 'pathTile'
		},
		{
			id: 'sundrop-cave-pocket',
			x: 5_960,
			y: 1_896,
			width: 288,
			height: 96,
			tile: 'pathTile'
		},
		{
			id: 'wildwood-side-clearing',
			x: 4_620,
			y: 3_650,
			width: 520,
			height: 360,
			tile: 'pathTile'
		}
	],
	mapDecor: [
		{
			id: 'wildwood-north-canopy',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 5_360,
			y: 360,
			width: 960,
			height: 160,
			mode: 'tile',
			collision: {
				id: 'wildwood-north-canopy-collision',
				x: 5_360,
				y: 360,
				width: 960,
				height: 160
			}
		},
		{
			id: 'wildwood-east-canopy',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 6_120,
			y: 1_020,
			width: 160,
			height: 900,
			mode: 'tile',
			collision: {
				id: 'wildwood-east-canopy-collision',
				x: 6_120,
				y: 1_020,
				width: 160,
				height: 900
			}
		},
		{
			id: 'wildwood-grove-tree-1',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 4_400,
			y: 3_000,
			width: 220,
			height: 280,
			mode: 'image',
			collision: {
				id: 'wildwood-grove-tree-1-collision',
				x: 4_400,
				y: 3_090,
				width: 80,
				height: 70
			}
		},
		{
			id: 'wildwood-grove-tree-2',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 4_900,
			y: 4_300,
			width: 220,
			height: 280,
			mode: 'image',
			collision: {
				id: 'wildwood-grove-tree-2-collision',
				x: 4_900,
				y: 4_390,
				width: 80,
				height: 70
			}
		},
		{
			id: 'wildwood-grove-brush-1',
			textureKey: forestDressingAsset.key,
			frameName: 'brush',
			x: 4_650,
			y: 3_650,
			width: 180,
			height: 150,
			mode: 'image'
		},
		{
			id: 'wildwood-threshold-floor',
			textureKey: forestDressingAsset.key,
			frameName: 'forestFloor',
			x: 5_520,
			y: 4_420,
			width: 520,
			height: 360,
			mode: 'tile',
			depth: 'floor'
		},
		{
			id: 'wildwood-forest-lane-north-wall',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 5_000,
			y: 5_200,
			width: 1_100,
			height: 120,
			mode: 'tile',
			collision: {
				id: 'wildwood-forest-lane-north-wall-collision',
				x: 5_000,
				y: 5_200,
				width: 1_100,
				height: 110
			}
		},
		{
			id: 'wildwood-forest-lane-south-wall',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 5_000,
			y: 5_500,
			width: 1_100,
			height: 120,
			mode: 'tile',
			collision: {
				id: 'wildwood-forest-lane-south-wall-collision',
				x: 5_000,
				y: 5_500,
				width: 1_100,
				height: 110
			}
		},
		{
			id: 'wildwood-threshold-tree-wall-west',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 5_280,
			y: 4_420,
			width: 220,
			height: 320,
			mode: 'image',
			collision: {
				id: 'wildwood-threshold-tree-wall-west-collision',
				x: 5_280,
				y: 4_540,
				width: 90,
				height: 110
			}
		},
		{
			id: 'wildwood-threshold-tree-wall-east',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 5_900,
			y: 4_420,
			width: 220,
			height: 320,
			mode: 'image',
			collision: {
				id: 'wildwood-threshold-tree-wall-east-collision',
				x: 5_900,
				y: 4_540,
				width: 90,
				height: 110
			}
		},
		{
			id: 'wildwood-threshold-brush-left',
			textureKey: forestDressingAsset.key,
			frameName: 'brush',
			x: 5_360,
			y: 4_380,
			width: 180,
			height: 150,
			mode: 'image'
		},
		{
			id: 'wildwood-threshold-brush-right',
			textureKey: forestDressingAsset.key,
			frameName: 'brush',
			x: 5_820,
			y: 4_380,
			width: 180,
			height: 150,
			mode: 'image'
		},
		{
			id: 'wildwood-cache-brush-screen',
			textureKey: forestDressingAsset.key,
			frameName: 'brush',
			x: 4_780,
			y: 3_540,
			width: 210,
			height: 170,
			mode: 'image'
		},
		{
			id: 'wildwood-cache-tree-cover',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 4_480,
			y: 3_420,
			width: 240,
			height: 300,
			mode: 'image',
			collision: {
				id: 'wildwood-cache-tree-cover-collision',
				x: 4_480,
				y: 3_520,
				width: 90,
				height: 80
			}
		},
		{
			id: 'wildwood-grove-maple-1',
			textureKey: shrineDressingAsset.key,
			frameName: 'autumnMaple',
			x: 4_500,
			y: 4_750,
			width: 240,
			height: 300,
			mode: 'image',
			collision: {
				id: 'wildwood-grove-maple-1-collision',
				x: 4_500,
				y: 4_850,
				width: 90,
				height: 80
			}
		},
		{
			id: 'wildwood-grove-floor-1',
			textureKey: forestDressingAsset.key,
			frameName: 'forestFloor',
			x: 4_800,
			y: 4_050,
			width: 320,
			height: 320,
			mode: 'tile',
			depth: 'floor'
		},
		{
			id: 'wildwood-staging-brush',
			textureKey: forestDressingAsset.key,
			frameName: 'brush',
			x: 5_600,
			y: 4_200,
			width: 180,
			height: 150,
			mode: 'image'
		},
		{
			id: 'wildwood-cave-warning-floor',
			textureKey: forestDressingAsset.key,
			frameName: 'forestFloor',
			x: 5_900,
			y: 1_760,
			width: 420,
			height: 300,
			mode: 'tile',
			depth: 'floor'
		},
		{
			id: 'wildwood-cave-canopy',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 5_700,
			y: 2_100,
			width: 200,
			height: 260,
			mode: 'image',
			collision: { id: 'wildwood-cave-canopy-collision', x: 5_700, y: 2_180, width: 80, height: 70 }
		},
		{
			id: 'wildwood-cave-canopy-heavy',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 5_980,
			y: 2_120,
			width: 260,
			height: 320,
			mode: 'image',
			collision: {
				id: 'wildwood-cave-canopy-heavy-collision',
				x: 5_980,
				y: 2_230,
				width: 90,
				height: 80
			}
		},
		{
			id: 'wildwood-combat-pocket-wall-west',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 5_040,
			y: 1_280,
			width: 220,
			height: 360,
			mode: 'image',
			collision: {
				id: 'wildwood-combat-pocket-wall-west-collision',
				x: 5_040,
				y: 1_390,
				width: 90,
				height: 120
			}
		},
		{
			id: 'wildwood-combat-pocket-wall-east',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 5_680,
			y: 1_280,
			width: 220,
			height: 360,
			mode: 'image',
			collision: {
				id: 'wildwood-combat-pocket-wall-east-collision',
				x: 5_680,
				y: 1_390,
				width: 90,
				height: 120
			}
		},
		{
			id: 'wildwood-cave-canopy-neck',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 5_760,
			y: 1_920,
			width: 220,
			height: 280,
			mode: 'image',
			collision: {
				id: 'wildwood-cave-canopy-neck-collision',
				x: 5_760,
				y: 2_020,
				width: 90,
				height: 90
			}
		}
	],
	discoveries: [
		{
			id: 'wildwood-cave-danger',
			x: 5_960,
			y: 1_620,
			kind: 'warning',
			revealMarker: true,
			labelKey: 'content.maps.discoveries.wildwood-cave-danger.label',
			descriptionKey: 'content.maps.discoveries.wildwood-cave-danger.description'
		}
	],
	ambientNpcs: [{ id: 'wildwood-woodcutter', x: 5_340, y: 4_520, frameName: 'woodcutterNpc' }],
	pickups: [
		{ id: 'wildwood-grove-cache', x: 4_700, y: 3_650, itemId: 'sunleaf-salve', quantity: 1 }
	],
	combatBounds: [
		{
			id: 'wildwood-north-combat-pocket',
			x: 5_120,
			y: 960,
			width: 672,
			height: 384,
			encounterIds: ['meadow-slime-west'],
			aggroRadius: 240,
			leashRadius: 420
		},
		{
			id: 'wildwood-crossing-combat-pocket',
			x: 5_360,
			y: 1_280,
			width: 512,
			height: 320,
			encounterIds: ['meadow-slime-center'],
			aggroRadius: 240,
			leashRadius: 420
		},
		{
			id: 'whispering-cave-combat-pocket',
			x: 5_920,
			y: 1_600,
			width: 512,
			height: 384,
			encounterIds: ['meadow-slime-east'],
			aggroRadius: 240,
			leashRadius: 420
		}
	],
	encounters: [
		{ id: 'meadow-slime-west', x: 4_928, y: 960, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-center', x: 5_360, y: 1_280, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-east', x: 5_920, y: 1_600, enemyId: 'slime-scout' }
	],
	blockers: [
		// Forest-lane banks flanking the vertical climb at x≈5600 (route segment
		// between the horizontal lane y≈5347 and the combat rooms y≈3200). Both
		// stop at y=5300 so they never cross the horizontal lane junction, and
		// both sit outside the threshold room (x 5140–5900) and the route
		// centerline (x 5600).
		{
			id: 'wildwood-forest-lane-west-bank',
			x: 5_000,
			y: 4_250,
			width: 64,
			height: 2_100,
			kind: 'town-hedge'
		},
		{
			id: 'wildwood-forest-lane-east-bank',
			x: 6_100,
			y: 4_250,
			width: 64,
			height: 2_100,
			kind: 'town-hedge'
		},
		// North-climb banks flanking the diagonal from the top of the forest lane
		// (5600,3200) up to the Whispering Cave mouth (5960,1800). West bank
		// stays east of the combat rooms; east bank sits inside the map east
		// margin. Both stop south of the cave room so the cave neck stays open.
		{
			id: 'wildwood-north-climb-west-bank',
			x: 5_400,
			y: 2_500,
			width: 64,
			height: 1_100,
			kind: 'town-hedge'
		},
		{
			id: 'wildwood-north-climb-east-bank',
			x: 6_200,
			y: 2_750,
			width: 64,
			height: 1_100,
			kind: 'town-hedge'
		}
	]
};
