export type RouteSceneBeatPurpose =
	| 'hook'
	| 'threshold'
	| 'fork'
	| 'reveal'
	| 'payoff'
	| 'danger'
	| 'gate';

export type RouteSceneStoryMotif =
	| 'gate'
	| 'ferry'
	| 'white-line'
	| 'bell'
	| 'shrine'
	| 'forest-danger'
	| 'homeward-road'
	| 'memory-topology';

export interface RouteSceneBeat {
	id: string;
	routeId: string;
	cameraPoint: { x: number; y: number };
	purpose: RouteSceneBeatPurpose;
	expectedVisibleIds: string[];
	optionalPathIds?: string[];
	payoffIds?: string[];
	boundaryIds?: string[];
	storyMotif?: RouteSceneStoryMotif;
}

export interface RouteSceneDefinition {
	id: string;
	from: string;
	to: string;
	mainRoute: Array<{ x: number; y: number }>;
	beats: RouteSceneBeat[];
	pockets?: Array<{ id: string; x: number; y: number; w: number; h: number }>;
}

export const routeSceneDefinitions: RouteSceneDefinition[] = [
	{
		id: 'spawn-to-crossroads',
		from: 'village-plaza-room',
		to: 'crossroads-hub-room',
		mainRoute: [
			{ x: 1_536, y: 5_550 },
			{ x: 2_336, y: 5_347 },
			{ x: 2_750, y: 4_700 },
			{ x: 3_500, y: 4_000 }
		],
		beats: [
			{
				id: 'village-homeward-hook',
				routeId: 'spawn-to-crossroads',
				cameraPoint: { x: 1_536, y: 5_550 },
				purpose: 'hook',
				expectedVisibleIds: ['sundrop-well', 'village-wanderer'],
				boundaryIds: ['sundrop-plaza-east-fence', 'village-road-west-fence-a'],
				storyMotif: 'homeward-road'
			},
			{
				id: 'village-fenced-lane-threshold',
				routeId: 'spawn-to-crossroads',
				cameraPoint: { x: 2_700, y: 4_760 },
				purpose: 'threshold',
				expectedVisibleIds: [
					'village-waymarker',
					'village-road-west-fence-a',
					'village-road-east-fence-a'
				],
				boundaryIds: ['village-road-west-fence-a', 'village-road-east-fence-a'],
				storyMotif: 'homeward-road'
			},
			{
				id: 'village-roadside-nook',
				routeId: 'spawn-to-crossroads',
				cameraPoint: { x: 2_900, y: 4_780 },
				purpose: 'fork',
				expectedVisibleIds: [
					'village-waymarker',
					'village-roadside-flowers',
					'village-roadside-cache'
				],
				optionalPathIds: ['village-crossroads-nook'],
				boundaryIds: ['village-reststop-fence', 'village-road-west-fence-b'],
				storyMotif: 'homeward-road'
			},
			{
				id: 'village-roadside-cache-payoff',
				routeId: 'spawn-to-crossroads',
				cameraPoint: { x: 3_040, y: 4_930 },
				purpose: 'payoff',
				expectedVisibleIds: ['village-roadside-cache', 'village-crossroads-nook'],
				payoffIds: ['village-roadside-cache'],
				boundaryIds: ['village-reststop-fence', 'village-road-west-fence-b'],
				storyMotif: 'homeward-road'
			},
			{
				id: 'crossroads-waystone-reveal',
				routeId: 'spawn-to-crossroads',
				cameraPoint: { x: 3_500, y: 4_000 },
				purpose: 'reveal',
				expectedVisibleIds: [
					'crossroads-waystone',
					'crossroads-waystone-sign',
					'crossroads-banner'
				],
				boundaryIds: ['crossroads-west-hedge', 'crossroads-south-market-fence'],
				storyMotif: 'memory-topology'
			}
		]
	},
	{
		id: 'crossroads-to-coast',
		from: 'crossroads-hub-room',
		to: 'coast-jetty-vista-room',
		mainRoute: [
			{ x: 3_500, y: 4_000 },
			{ x: 3_900, y: 4_700 },
			{ x: 4_200, y: 5_500 },
			{ x: 4_600, y: 5_840 },
			{ x: 4_900, y: 6_180 }
		],
		beats: [
			{
				id: 'coast-crossroads-hook',
				routeId: 'crossroads-to-coast',
				cameraPoint: { x: 3_990, y: 4_480 },
				purpose: 'hook',
				expectedVisibleIds: ['crossroads-coast-cue-sand', 'crossroads-coast-cue-net'],
				boundaryIds: ['crossroads-east-hedge', 'crossroads-south-market-fence'],
				storyMotif: 'ferry'
			},
			{
				id: 'coast-corridor-threshold',
				routeId: 'crossroads-to-coast',
				cameraPoint: { x: 4_200, y: 5_300 },
				purpose: 'threshold',
				expectedVisibleIds: ['coast-approach-path', 'coast-approach-net', 'coast-driftwood'],
				boundaryIds: ['coast-approach-west-fence', 'coast-approach-east-fence'],
				storyMotif: 'ferry'
			},
			{
				id: 'coast-ferry-fork-beat',
				routeId: 'crossroads-to-coast',
				cameraPoint: { x: 3_900, y: 5_520 },
				purpose: 'fork',
				expectedVisibleIds: ['coast-ferry-fork', 'coast-shrine-landing', 'ferry-crossing'],
				optionalPathIds: ['coast-ferry-fork', 'coast-shrine-landing'],
				boundaryIds: ['coast-fork-west-driftwood-wall', 'coast-fork-east-field-fence'],
				storyMotif: 'ferry'
			},
			{
				id: 'coast-ferry-shrine-reveal',
				routeId: 'crossroads-to-coast',
				cameraPoint: { x: 3_600, y: 5_560 },
				purpose: 'reveal',
				expectedVisibleIds: ['coast-ferry-shrine', 'ferry-shrine-lore', 'coast-fisher'],
				boundaryIds: ['coast-shrine-pocket-boundary', 'coast-ferry-shrine'],
				storyMotif: 'shrine'
			},
			{
				id: 'coast-tidepool-payoff',
				routeId: 'crossroads-to-coast',
				cameraPoint: { x: 5_300, y: 5_900 },
				purpose: 'payoff',
				expectedVisibleIds: ['coast-tidepool', 'coast-net', 'coast-boat', 'coast-salve'],
				payoffIds: ['coast-salve'],
				boundaryIds: ['coast-tidepool-rock-wall', 'coast-boat']
			},
			{
				id: 'coast-jetty-future-route',
				routeId: 'crossroads-to-coast',
				cameraPoint: { x: 4_900, y: 6_180 },
				purpose: 'gate',
				expectedVisibleIds: ['coast-jetty', 'coast-jetty-foreshadow', 'coast-jetty-catch'],
				payoffIds: ['coast-jetty-catch'],
				boundaryIds: ['coast-jetty-neck', 'coast-sea-wall'],
				storyMotif: 'ferry'
			}
		]
	},
	{
		id: 'crossroads-to-mistfen',
		from: 'crossroads-hub-room',
		to: 'mistfen-gate-room',
		mainRoute: [
			{ x: 3_050, y: 3_150 },
			{ x: 2_690, y: 2_750 },
			{ x: 2_150, y: 2_750 },
			{ x: 1_760, y: 2_540 },
			{ x: 1_400, y: 2_030 },
			{ x: 1_250, y: 1_750 },
			{ x: 1_200, y: 620 }
		],
		beats: [
			{
				id: 'mistfen-entry-warning',
				routeId: 'crossroads-to-mistfen',
				cameraPoint: { x: 2_400, y: 2_700 },
				purpose: 'hook',
				expectedVisibleIds: ['mistfen-forager', 'mistfen-approach-path'],
				boundaryIds: ['crossroads-west-hedge', 'crossroads-north-festival-barrier'],
				storyMotif: 'gate'
			},
			{
				id: 'mistfen-reed-corridor-threshold',
				routeId: 'crossroads-to-mistfen',
				cameraPoint: { x: 2_150, y: 2_750 },
				purpose: 'threshold',
				expectedVisibleIds: [
					'mistfen-reed-wall-north',
					'mistfen-reed-wall-south',
					'mistfen-fog-entry'
				],
				boundaryIds: ['mistfen-reed-wall-north', 'mistfen-reed-wall-south'],
				storyMotif: 'gate'
			},
			{
				id: 'mistfen-east-pool-pocket',
				routeId: 'crossroads-to-mistfen',
				cameraPoint: { x: 1_700, y: 2_100 },
				purpose: 'fork',
				expectedVisibleIds: [
					'mistfen-pool-east',
					'mistfen-hidden-pool-pocket',
					'mistfen-reed-wall-east',
					'mistfen-cache'
				],
				optionalPathIds: ['mistfen-hidden-pool-pocket'],
				boundaryIds: ['mistfen-reed-wall-east', 'mistfen-pool-east-blocker']
			},
			{
				id: 'mistfen-west-salve-payoff',
				routeId: 'crossroads-to-mistfen',
				cameraPoint: { x: 880, y: 2_500 },
				purpose: 'payoff',
				expectedVisibleIds: ['mistfen-marsh-rock', 'mistfen-salve'],
				payoffIds: ['mistfen-salve'],
				boundaryIds: ['mistfen-marsh-rock', 'mistfen-pool-west-blocker']
			},
			{
				id: 'mistfen-toxic-reveal',
				routeId: 'crossroads-to-mistfen',
				cameraPoint: { x: 1_250, y: 1_750 },
				purpose: 'reveal',
				expectedVisibleIds: [
					'mistfen-toxic-bloom',
					'mistfen-deadfall-bend',
					'mistfen-reeds-1',
					'mistfen-fog-middle'
				],
				boundaryIds: ['mistfen-deadfall-bend', 'mistfen-gate-reed-wall-east'],
				storyMotif: 'gate'
			},
			{
				id: 'witchwood-gate-payoff',
				routeId: 'crossroads-to-mistfen',
				cameraPoint: { x: 1_200, y: 620 },
				purpose: 'gate',
				expectedVisibleIds: ['witchwood-gate', 'witchwood-poison-warning', 'witchwood-gate-block'],
				boundaryIds: ['mistfen-gate-fog-wall', 'witchwood-gate-block'],
				storyMotif: 'gate'
			}
		]
	},
	{
		id: 'crossroads-to-silverpine',
		from: 'crossroads-hub-room',
		to: 'silverpine-terrace-room',
		mainRoute: [
			{ x: 3_500, y: 3_000 },
			{ x: 3_300, y: 2_950 },
			{ x: 3_180, y: 2_360 },
			{ x: 2_900, y: 1_820 },
			{ x: 3_220, y: 1_320 },
			{ x: 3_000, y: 760 },
			{ x: 3_000, y: 520 }
		],
		beats: [
			{
				id: 'silverpine-crossroads-threshold',
				routeId: 'crossroads-to-silverpine',
				cameraPoint: { x: 3_260, y: 3_310 },
				purpose: 'threshold',
				expectedVisibleIds: [
					'crossroads-silverpine-cue-leaves',
					'crossroads-silverpine-cue-lantern'
				],
				boundaryIds: [
					'crossroads-north-festival-barrier',
					'crossroads-north-festival-barrier-east'
				],
				storyMotif: 'shrine'
			},
			{
				id: 'silverpine-lantern-hook',
				routeId: 'crossroads-to-silverpine',
				cameraPoint: { x: 3_180, y: 2_360 },
				purpose: 'hook',
				expectedVisibleIds: ['silverpine-lower-approach', 'silverpine-lantern-mid'],
				boundaryIds: ['silverpine-lower-wall-west', 'silverpine-lower-wall-east'],
				storyMotif: 'shrine'
			},
			{
				id: 'silverpine-bend-fork',
				routeId: 'crossroads-to-silverpine',
				cameraPoint: { x: 2_900, y: 1_820 },
				purpose: 'fork',
				expectedVisibleIds: [
					'silverpine-bend-west',
					'silverpine-bend-east',
					'silverpine-side-grove-floor',
					'silverpine-side-grove-maple',
					'silverpine-pilgrim'
				],
				optionalPathIds: ['silverpine-side-grove-floor'],
				boundaryIds: ['silverpine-switchback-west', 'silverpine-switchback-east'],
				storyMotif: 'shrine'
			},
			{
				id: 'silverpine-side-grove',
				routeId: 'crossroads-to-silverpine',
				cameraPoint: { x: 2_620, y: 1_560 },
				purpose: 'payoff',
				expectedVisibleIds: [
					'silverpine-side-grove-floor',
					'silverpine-side-grove-maple',
					'silverpine-side-grove-pine',
					'silverpine-tonic'
				],
				payoffIds: ['silverpine-tonic'],
				boundaryIds: ['silverpine-offering-grove-wall', 'silverpine-side-grove-pine'],
				storyMotif: 'shrine'
			},
			{
				id: 'silverpine-terrace-reveal',
				routeId: 'crossroads-to-silverpine',
				cameraPoint: { x: 3_000, y: 520 },
				purpose: 'reveal',
				expectedVisibleIds: [
					'silver-shrine-gate',
					'silver-shrine-gate-sprite',
					'silverpine-offering-cache'
				],
				payoffIds: ['silverpine-offering-cache'],
				boundaryIds: ['silverpine-terrace-boundary', 'silverpine-lantern-east'],
				storyMotif: 'shrine'
			},
			{
				id: 'silverpine-sealed-threshold',
				routeId: 'crossroads-to-silverpine',
				cameraPoint: { x: 3_000, y: 480 },
				purpose: 'gate',
				expectedVisibleIds: ['silver-shrine-gate', 'silver-shrine-gate-block'],
				boundaryIds: ['silver-shrine-gate-block', 'silverpine-lantern-west'],
				storyMotif: 'gate'
			}
		]
	},
	{
		id: 'crossroads-to-wildwood',
		from: 'crossroads-hub-room',
		to: 'wildwood-cave-room',
		mainRoute: [
			{ x: 4_000, y: 4_300 },
			{ x: 4_200, y: 5_347 },
			{ x: 5_600, y: 5_347 },
			{ x: 5_520, y: 4_420 },
			{ x: 5_600, y: 3_200 },
			{ x: 5_960, y: 1_800 }
		],
		beats: [
			{
				id: 'wildwood-crossroads-hook',
				routeId: 'crossroads-to-wildwood',
				cameraPoint: { x: 4_080, y: 4_180 },
				purpose: 'hook',
				expectedVisibleIds: ['crossroads-wildwood-cue-floor', 'crossroads-wildwood-cue-brush'],
				boundaryIds: ['crossroads-east-hedge', 'crossroads-south-market-fence'],
				storyMotif: 'forest-danger'
			},
			{
				id: 'wildwood-threshold-hook',
				routeId: 'crossroads-to-wildwood',
				cameraPoint: { x: 5_520, y: 4_420 },
				purpose: 'threshold',
				expectedVisibleIds: [
					'wildwood-threshold-floor',
					'wildwood-threshold-tree-wall-west',
					'wildwood-threshold-brush-left',
					'wildwood-woodcutter'
				],
				boundaryIds: ['wildwood-threshold-tree-wall-west', 'wildwood-threshold-tree-wall-east'],
				storyMotif: 'forest-danger'
			},
			{
				id: 'wildwood-side-grove',
				routeId: 'crossroads-to-wildwood',
				cameraPoint: { x: 4_620, y: 3_650 },
				purpose: 'fork',
				expectedVisibleIds: [
					'wildwood-side-clearing',
					'wildwood-cache-brush-screen',
					'wildwood-cache-tree-cover'
				],
				optionalPathIds: ['wildwood-side-clearing'],
				boundaryIds: ['wildwood-cache-tree-cover', 'wildwood-grove-tree-1']
			},
			{
				id: 'wildwood-hidden-cache-payoff',
				routeId: 'crossroads-to-wildwood',
				cameraPoint: { x: 4_700, y: 3_650 },
				purpose: 'payoff',
				expectedVisibleIds: [
					'wildwood-cache-brush-screen',
					'wildwood-cache-tree-cover',
					'wildwood-grove-cache'
				],
				payoffIds: ['wildwood-grove-cache'],
				boundaryIds: ['wildwood-cache-tree-cover', 'wildwood-grove-tree-1']
			},
			{
				id: 'wildwood-combat-reveal',
				routeId: 'crossroads-to-wildwood',
				cameraPoint: { x: 5_360, y: 1_280 },
				purpose: 'reveal',
				expectedVisibleIds: [
					'meadow-slime-center',
					'wildwood-crossing-combat-pocket',
					'wildwood-cave-canopy-heavy'
				],
				boundaryIds: ['wildwood-combat-pocket-wall-west', 'wildwood-combat-pocket-wall-east'],
				storyMotif: 'forest-danger'
			},
			{
				id: 'wildwood-cave-gate',
				routeId: 'crossroads-to-wildwood',
				cameraPoint: { x: 5_960, y: 1_800 },
				purpose: 'gate',
				expectedVisibleIds: [
					'whispering-cave',
					'wildwood-cave-danger',
					'meadow-to-whispering-cave-ruins-threshold'
				],
				boundaryIds: ['wildwood-cave-canopy-neck', 'wildwood-east-canopy'],
				storyMotif: 'gate'
			}
		]
	}
];
