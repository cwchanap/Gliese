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
			id: 'wildwood-cave-canopy',
			textureKey: forestDressingAsset.key,
			frameName: 'treeCluster',
			x: 5_700,
			y: 2_100,
			width: 200,
			height: 260,
			mode: 'image',
			collision: { id: 'wildwood-cave-canopy-collision', x: 5_700, y: 2_180, width: 80, height: 70 }
		}
	],
	ambientNpcs: [{ id: 'wildwood-woodcutter', x: 4_600, y: 3_300, frameName: 'woodcutterNpc' }],
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
	]
};
