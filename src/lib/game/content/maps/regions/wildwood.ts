import { forestDressingAsset } from '$lib/game/content/assets';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';

/**
 * Wildwood region — the top-right (NE) forest road leading to the Whispering
 * Cave: the gated ruins-threshold transition, the forest-road and combat-pocket
 * ground patches, the colliding canopy decor, the slime encounters, and their
 * combat bounds.
 *
 * Note: the `whispering-cave` landmark itself is authored in the village
 * fragment to preserve the composed map's original landmark ordering.
 */
export const wildwoodRegion: RegionFragment = {
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
		}
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
