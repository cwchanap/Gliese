import type { VillagePoint, VillageRoomId } from './rooms';

export type VillageRouteSceneId = 'spawn-to-crossroads';

export type VillageRouteSceneBeatId =
	| 'home-yard-origin'
	| 'well-plaza-choice'
	| 'east-gate-threshold'
	| 'crossroads-road-breadcrumb';

export type VillageRouteSceneBeat = {
	id: VillageRouteSceneBeatId;
	point: VillagePoint;
	roomId?: VillageRoomId;
	boundaryIds?: readonly string[];
};

export type VillageRouteSceneDefinition = {
	id: VillageRouteSceneId;
	beats: readonly VillageRouteSceneBeat[];
};

export const spawnToCrossroadsRouteScene: VillageRouteSceneDefinition = {
	id: 'spawn-to-crossroads',
	beats: [
		{
			id: 'home-yard-origin',
			roomId: 'village-home-yard-room',
			point: { x: 700, y: 5_600 },
			boundaryIds: ['village-home-yard-west-fence', 'village-home-yard-east-fence']
		},
		{
			id: 'well-plaza-choice',
			roomId: 'village-well-plaza-room',
			point: { x: 1_000, y: 5_160 },
			boundaryIds: ['village-plaza-fountain-collision']
		},
		{
			id: 'east-gate-threshold',
			roomId: 'village-east-gate-room',
			point: { x: 1_660, y: 4_430 },
			boundaryIds: ['village-gate-arch', 'village-gate-lantern-a-collision']
		},
		{
			id: 'crossroads-road-breadcrumb',
			point: { x: 2_120, y: 4_440 },
			boundaryIds: ['corridor-wall-2a', 'corridor-wall-10b', 'village-corridor-waymarker-collision']
		}
	]
};

export const villageRouteScenes: readonly VillageRouteSceneDefinition[] = [
	spawnToCrossroadsRouteScene
];
