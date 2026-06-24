import type { RouteSceneStoryMotif } from '$lib/game/content/maps/regions/route-scenes';

export type SoftMazeRoomKind =
	| 'safe'
	| 'hub'
	| 'threshold'
	| 'side-pocket'
	| 'gate'
	| 'combat'
	| 'vista';

export interface SoftMazeRoom {
	id: string;
	kind: SoftMazeRoomKind;
	bounds: { id: string; x: number; y: number; width: number; height: number };
	routeIds: string[];
	beatId: string;
	requiredVisibleIds: string[];
	payoffIds?: string[];
	storyMotif?: RouteSceneStoryMotif;
}

export interface SoftMazeCorridor {
	id: string;
	fromRoomId: string;
	toRoomId: string;
	route: Array<{ x: number; y: number }>;
	expectedBoundaryIds: string[];
	maxWalkableWidth?: number;
}

export const softMazeRooms: SoftMazeRoom[] = [
	{
		id: 'village-plaza-room',
		kind: 'safe',
		bounds: { id: 'village-plaza-room', x: 1_000, y: 5_100, width: 400, height: 400 },
		routeIds: ['spawn-to-crossroads'],
		beatId: 'village-homeward-hook',
		requiredVisibleIds: ['sundrop-well', 'guild-hall-exterior', 'village-wanderer'],
		storyMotif: 'homeward-road'
	},
	{
		id: 'village-gate-threshold-room',
		kind: 'gate',
		bounds: { id: 'village-gate-threshold-room', x: 1_650, y: 4_425, width: 300, height: 350 },
		routeIds: ['spawn-to-crossroads'],
		beatId: 'village-fenced-lane-threshold',
		requiredVisibleIds: ['village-gate-lantern-a', 'village-gate-lantern-b'],
		storyMotif: 'homeward-road'
	},
	{
		id: 'village-road-reststop-room',
		kind: 'side-pocket',
		bounds: { id: 'village-road-reststop-room', x: 2_800, y: 4_400, width: 400, height: 300 },
		routeIds: ['spawn-to-crossroads'],
		beatId: 'village-roadside-cache-payoff',
		requiredVisibleIds: ['village-corridor-cache'],
		payoffIds: ['village-corridor-cache'],
		storyMotif: 'homeward-road'
	},
	{
		id: 'crossroads-hub-room',
		kind: 'hub',
		bounds: { id: 'crossroads-hub-room', x: 3_500, y: 4_000, width: 900, height: 900 },
		routeIds: [
			'spawn-to-crossroads',
			'crossroads-to-coast',
			'crossroads-to-mistfen',
			'crossroads-to-silverpine',
			'crossroads-to-wildwood'
		],
		beatId: 'crossroads-waystone-reveal',
		requiredVisibleIds: [
			'crossroads-waystone',
			'crossroads-waystone-sign',
			'crossroads-white-line'
		],
		storyMotif: 'memory-topology'
	},
	{
		id: 'coast-fork-room',
		kind: 'threshold',
		bounds: { id: 'coast-fork-room', x: 4_100, y: 5_520, width: 760, height: 360 },
		routeIds: ['crossroads-to-coast'],
		beatId: 'coast-ferry-fork-beat',
		requiredVisibleIds: ['coast-ferry-fork', 'coast-fork-west-driftwood-wall'],
		storyMotif: 'ferry'
	},
	{
		id: 'coast-ferry-shrine-room',
		kind: 'vista',
		bounds: { id: 'coast-ferry-shrine-room', x: 3_600, y: 5_650, width: 520, height: 440 },
		routeIds: ['crossroads-to-coast'],
		beatId: 'coast-ferry-shrine-reveal',
		requiredVisibleIds: ['coast-ferry-shrine', 'ferry-shrine-lore', 'coast-fisher'],
		payoffIds: ['ferry-shrine-lore'],
		storyMotif: 'ferry'
	},
	{
		id: 'coast-tidepool-room',
		kind: 'side-pocket',
		bounds: { id: 'coast-tidepool-room', x: 5_340, y: 5_920, width: 700, height: 360 },
		routeIds: ['crossroads-to-coast'],
		beatId: 'coast-tidepool-payoff',
		requiredVisibleIds: ['coast-tidepool', 'coast-boat', 'coast-net'],
		payoffIds: ['coast-salve'],
		storyMotif: 'ferry'
	},
	{
		id: 'coast-jetty-vista-room',
		kind: 'vista',
		bounds: { id: 'coast-jetty-vista-room', x: 4_900, y: 6_120, width: 560, height: 420 },
		routeIds: ['crossroads-to-coast'],
		beatId: 'coast-jetty-future-route',
		requiredVisibleIds: ['coast-jetty', 'coast-jetty-foreshadow', 'coast-jetty-catch'],
		payoffIds: ['coast-jetty-catch'],
		storyMotif: 'homeward-road'
	},
	{
		id: 'mistfen-entry-room',
		kind: 'threshold',
		bounds: { id: 'mistfen-entry-room', x: 2_150, y: 2_750, width: 760, height: 360 },
		routeIds: ['crossroads-to-mistfen'],
		beatId: 'mistfen-entry-warning',
		requiredVisibleIds: ['mistfen-forager', 'mistfen-reed-wall-north', 'mistfen-reed-wall-south'],
		storyMotif: 'gate'
	},
	{
		id: 'mistfen-east-pool-room',
		kind: 'side-pocket',
		bounds: { id: 'mistfen-east-pool-room', x: 1_560, y: 2_260, width: 560, height: 360 },
		routeIds: ['crossroads-to-mistfen'],
		beatId: 'mistfen-east-pool-pocket',
		requiredVisibleIds: [
			'mistfen-pool-east',
			'mistfen-hidden-pool-pocket',
			'mistfen-reed-wall-east'
		],
		payoffIds: ['mistfen-cache'],
		storyMotif: 'gate'
	},
	{
		id: 'mistfen-gate-room',
		kind: 'gate',
		bounds: { id: 'mistfen-gate-room', x: 1_200, y: 620, width: 760, height: 540 },
		routeIds: ['crossroads-to-mistfen'],
		beatId: 'witchwood-gate-payoff',
		requiredVisibleIds: ['witchwood-gate', 'witchwood-poison-warning', 'witchwood-gate-block'],
		storyMotif: 'gate'
	},
	{
		id: 'silverpine-lower-room',
		kind: 'threshold',
		bounds: { id: 'silverpine-lower-room', x: 3_180, y: 2_360, width: 620, height: 420 },
		routeIds: ['crossroads-to-silverpine'],
		beatId: 'silverpine-lantern-hook',
		requiredVisibleIds: ['silverpine-lower-approach', 'silverpine-lantern-mid'],
		storyMotif: 'shrine'
	},
	{
		id: 'silverpine-offering-grove-room',
		kind: 'side-pocket',
		bounds: { id: 'silverpine-offering-grove-room', x: 2_620, y: 1_560, width: 560, height: 460 },
		routeIds: ['crossroads-to-silverpine'],
		beatId: 'silverpine-side-grove',
		requiredVisibleIds: [
			'silverpine-side-grove-floor',
			'silverpine-side-grove-maple',
			'silverpine-side-grove-pine'
		],
		payoffIds: ['silverpine-tonic'],
		storyMotif: 'shrine'
	},
	{
		id: 'silverpine-terrace-room',
		kind: 'gate',
		bounds: { id: 'silverpine-terrace-room', x: 3_000, y: 590, width: 900, height: 600 },
		routeIds: ['crossroads-to-silverpine'],
		beatId: 'silverpine-terrace-reveal',
		requiredVisibleIds: [
			'silver-shrine-gate',
			'silver-shrine-gate-block',
			'silverpine-offering-cache'
		],
		payoffIds: ['silverpine-offering-cache'],
		storyMotif: 'shrine'
	},
	{
		id: 'wildwood-threshold-room',
		kind: 'threshold',
		bounds: { id: 'wildwood-threshold-room', x: 5_520, y: 4_420, width: 760, height: 520 },
		routeIds: ['crossroads-to-wildwood'],
		beatId: 'wildwood-threshold-hook',
		requiredVisibleIds: [
			'wildwood-threshold-floor',
			'wildwood-threshold-tree-wall-west',
			'wildwood-woodcutter'
		],
		storyMotif: 'forest-danger'
	},
	{
		id: 'wildwood-side-clearing-room',
		kind: 'side-pocket',
		bounds: { id: 'wildwood-side-clearing-room', x: 4_620, y: 3_650, width: 560, height: 420 },
		routeIds: ['crossroads-to-wildwood'],
		beatId: 'wildwood-side-grove',
		requiredVisibleIds: [
			'wildwood-side-clearing',
			'wildwood-cache-brush-screen',
			'wildwood-cache-tree-cover'
		],
		payoffIds: ['wildwood-grove-cache'],
		storyMotif: 'forest-danger'
	},
	{
		id: 'wildwood-combat-room',
		kind: 'combat',
		bounds: { id: 'wildwood-combat-room', x: 5_360, y: 1_280, width: 720, height: 480 },
		routeIds: ['crossroads-to-wildwood'],
		beatId: 'wildwood-combat-reveal',
		requiredVisibleIds: ['meadow-slime-center', 'wildwood-crossing-combat-pocket'],
		storyMotif: 'forest-danger'
	},
	{
		id: 'wildwood-cave-room',
		kind: 'gate',
		bounds: { id: 'wildwood-cave-room', x: 5_960, y: 1_800, width: 560, height: 520 },
		routeIds: ['crossroads-to-wildwood'],
		beatId: 'wildwood-cave-gate',
		requiredVisibleIds: ['whispering-cave', 'wildwood-cave-danger', 'wildwood-cave-warning-floor'],
		storyMotif: 'gate'
	}
];

export const softMazeCorridors: SoftMazeCorridor[] = [
	{
		id: 'crossroads-coast-corridor',
		fromRoomId: 'crossroads-hub-room',
		toRoomId: 'coast-fork-room',
		route: [
			{ x: 4_200, y: 4_900 },
			{ x: 4_200, y: 5_350 }
		],
		expectedBoundaryIds: ['coast-approach-west-fence', 'coast-approach-east-fence'],
		maxWalkableWidth: 420
	},
	{
		id: 'coast-fork-corridor',
		fromRoomId: 'coast-fork-room',
		toRoomId: 'coast-tidepool-room',
		route: [
			{ x: 3_940, y: 5_520 },
			{ x: 4_460, y: 5_520 }
		],
		expectedBoundaryIds: ['coast-fork-west-driftwood-wall', 'coast-fork-east-field-fence'],
		maxWalkableWidth: 360
	},
	{
		id: 'mistfen-reed-corridor',
		fromRoomId: 'mistfen-entry-room',
		toRoomId: 'mistfen-east-pool-room',
		route: [
			{ x: 2_150, y: 2_750 },
			{ x: 1_500, y: 2_750 }
		],
		expectedBoundaryIds: ['mistfen-reed-wall-north', 'mistfen-reed-wall-south'],
		maxWalkableWidth: 400
	},
	{
		id: 'mistfen-gate-corridor',
		fromRoomId: 'mistfen-east-pool-room',
		toRoomId: 'mistfen-gate-room',
		route: [
			{ x: 1_250, y: 1_750 },
			{ x: 1_200, y: 900 }
		],
		expectedBoundaryIds: ['mistfen-gate-fog-wall', 'mistfen-gate-reed-wall-east'],
		maxWalkableWidth: 620
	},
	{
		id: 'silverpine-lower-corridor',
		fromRoomId: 'crossroads-hub-room',
		toRoomId: 'silverpine-lower-room',
		route: [
			{ x: 3_180, y: 2_360 },
			{ x: 3_180, y: 2_050 }
		],
		expectedBoundaryIds: ['silverpine-lower-wall-west', 'silverpine-lower-wall-east'],
		maxWalkableWidth: 620
	},
	{
		id: 'silverpine-switchback-corridor',
		fromRoomId: 'silverpine-lower-room',
		toRoomId: 'silverpine-offering-grove-room',
		route: [
			{ x: 2_900, y: 1_820 },
			{ x: 3_220, y: 1_320 }
		],
		expectedBoundaryIds: ['silverpine-switchback-west', 'silverpine-switchback-east'],
		maxWalkableWidth: 900
	},
	{
		id: 'wildwood-forest-lane',
		fromRoomId: 'crossroads-hub-room',
		toRoomId: 'wildwood-threshold-room',
		route: [
			{ x: 4_400, y: 5_347 },
			{ x: 5_520, y: 5_347 }
		],
		expectedBoundaryIds: ['wildwood-forest-lane-north-wall', 'wildwood-forest-lane-south-wall'],
		maxWalkableWidth: 420
	},
	{
		id: 'wildwood-combat-neck',
		fromRoomId: 'wildwood-threshold-room',
		toRoomId: 'wildwood-combat-room',
		route: [
			{ x: 5_360, y: 1_500 },
			{ x: 5_360, y: 1_120 }
		],
		expectedBoundaryIds: ['wildwood-combat-pocket-wall-west', 'wildwood-combat-pocket-wall-east'],
		maxWalkableWidth: 820
	}
];
