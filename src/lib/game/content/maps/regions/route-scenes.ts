export type RouteSceneBeatPurpose = 'hook' | 'fork' | 'reveal' | 'payoff' | 'danger' | 'gate';

export type RouteSceneStoryMotif =
	| 'gate'
	| 'ferry'
	| 'white-line'
	| 'bell'
	| 'shrine'
	| 'forest-danger'
	| 'homeward-road';

export interface RouteSceneBeat {
	id: string;
	routeId: string;
	cameraPoint: { x: number; y: number };
	purpose: RouteSceneBeatPurpose;
	expectedVisibleIds: string[];
	optionalPathIds?: string[];
	payoffIds?: string[];
	storyMotif?: RouteSceneStoryMotif;
}

export interface RouteSceneDefinition {
	id: string;
	from: string;
	to: string;
	mainRoute: Array<{ x: number; y: number }>;
	beats: RouteSceneBeat[];
}

export const routeSceneDefinitions: RouteSceneDefinition[] = [
	{
		id: 'spawn-to-crossroads',
		from: 'Sundrop Village',
		to: 'Crossroads',
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
				storyMotif: 'homeward-road'
			},
			{
				id: 'village-roadside-nook',
				routeId: 'spawn-to-crossroads',
				cameraPoint: { x: 2_900, y: 4_780 },
				purpose: 'payoff',
				expectedVisibleIds: [
					'village-waymarker',
					'village-roadside-flowers',
					'village-roadside-cache'
				],
				optionalPathIds: ['village-crossroads-nook'],
				payoffIds: ['village-roadside-cache'],
				storyMotif: 'homeward-road'
			},
			{
				id: 'crossroads-waystone-reveal',
				routeId: 'spawn-to-crossroads',
				cameraPoint: { x: 3_500, y: 4_000 },
				purpose: 'reveal',
				expectedVisibleIds: ['crossroads-waystone', 'crossroads-waystone-sign', 'crossroads-banner']
			}
		]
	},
	{
		id: 'crossroads-to-coast',
		from: 'Crossroads',
		to: 'Coast',
		mainRoute: [
			{ x: 3_500, y: 4_000 },
			{ x: 3_900, y: 4_700 },
			{ x: 4_200, y: 5_500 },
			{ x: 4_600, y: 5_840 },
			{ x: 4_900, y: 6_180 }
		],
		beats: [
			{
				id: 'coast-approach-clue',
				routeId: 'crossroads-to-coast',
				cameraPoint: { x: 4_200, y: 5_300 },
				purpose: 'hook',
				expectedVisibleIds: ['coast-approach-path', 'coast-approach-net', 'coast-driftwood'],
				storyMotif: 'ferry'
			},
			{
				id: 'coast-ferry-fork-beat',
				routeId: 'crossroads-to-coast',
				cameraPoint: { x: 3_900, y: 5_520 },
				purpose: 'fork',
				expectedVisibleIds: ['coast-ferry-fork', 'coast-shrine-landing', 'ferry-crossing'],
				optionalPathIds: ['coast-ferry-fork', 'coast-shrine-landing'],
				storyMotif: 'ferry'
			},
			{
				id: 'coast-ferry-shrine-reveal',
				routeId: 'crossroads-to-coast',
				cameraPoint: { x: 3_600, y: 5_560 },
				purpose: 'reveal',
				expectedVisibleIds: ['coast-ferry-shrine', 'ferry-shrine-lore', 'coast-fisher'],
				storyMotif: 'shrine'
			},
			{
				id: 'coast-tidepool-payoff',
				routeId: 'crossroads-to-coast',
				cameraPoint: { x: 5_300, y: 5_900 },
				purpose: 'payoff',
				expectedVisibleIds: ['coast-tidepool', 'coast-net', 'coast-boat', 'coast-salve'],
				payoffIds: ['coast-salve']
			},
			{
				id: 'coast-jetty-future-route',
				routeId: 'crossroads-to-coast',
				cameraPoint: { x: 4_900, y: 6_180 },
				purpose: 'gate',
				expectedVisibleIds: ['coast-jetty', 'coast-jetty-foreshadow', 'coast-jetty-catch'],
				payoffIds: ['coast-jetty-catch'],
				storyMotif: 'ferry'
			}
		]
	},
	{
		id: 'crossroads-to-mistfen',
		from: 'Crossroads',
		to: 'Mistfen',
		mainRoute: [
			{ x: 3_050, y: 3_150 },
			{ x: 2_690, y: 2_750 },
			{ x: 2_150, y: 2_750 },
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
				storyMotif: 'gate'
			},
			{
				id: 'mistfen-east-pool-pocket',
				routeId: 'crossroads-to-mistfen',
				cameraPoint: { x: 1_700, y: 2_100 },
				purpose: 'fork',
				expectedVisibleIds: ['mistfen-pool-east', 'mistfen-bloom-trail-2', 'mistfen-cache'],
				optionalPathIds: ['mistfen-pool-east']
			},
			{
				id: 'mistfen-west-salve-payoff',
				routeId: 'crossroads-to-mistfen',
				cameraPoint: { x: 880, y: 2_500 },
				purpose: 'payoff',
				expectedVisibleIds: ['mistfen-marsh-rock', 'mistfen-salve'],
				payoffIds: ['mistfen-salve']
			},
			{
				id: 'mistfen-toxic-reveal',
				routeId: 'crossroads-to-mistfen',
				cameraPoint: { x: 1_250, y: 1_750 },
				purpose: 'danger',
				expectedVisibleIds: ['mistfen-toxic-bloom', 'mistfen-reeds-1', 'mistfen-fog'],
				storyMotif: 'gate'
			},
			{
				id: 'witchwood-gate-payoff',
				routeId: 'crossroads-to-mistfen',
				cameraPoint: { x: 1_200, y: 620 },
				purpose: 'gate',
				expectedVisibleIds: ['witchwood-gate', 'witchwood-poison-warning', 'witchwood-gate-block'],
				storyMotif: 'gate'
			}
		]
	},
	{
		id: 'crossroads-to-silverpine',
		from: 'Crossroads',
		to: 'Silverpine',
		mainRoute: [
			{ x: 3_500, y: 3_000 },
			{ x: 3_300, y: 2_950 },
			{ x: 3_100, y: 1_600 },
			{ x: 3_000, y: 520 }
		],
		beats: [
			{
				id: 'silverpine-lantern-hook',
				routeId: 'crossroads-to-silverpine',
				cameraPoint: { x: 3_100, y: 1_600 },
				purpose: 'hook',
				expectedVisibleIds: ['silverpine-lantern-mid', 'silverpine-pilgrim'],
				storyMotif: 'shrine'
			},
			{
				id: 'silverpine-side-grove',
				routeId: 'crossroads-to-silverpine',
				cameraPoint: { x: 2_900, y: 1_700 },
				purpose: 'fork',
				expectedVisibleIds: [
					'silverpine-grove-floor',
					'silverpine-amulet-rack',
					'silverpine-tonic'
				],
				optionalPathIds: ['silverpine-grove-floor'],
				payoffIds: ['silverpine-tonic'],
				storyMotif: 'shrine'
			},
			{
				id: 'silverpine-terrace-reveal',
				routeId: 'crossroads-to-silverpine',
				cameraPoint: { x: 3_000, y: 520 },
				purpose: 'gate',
				expectedVisibleIds: [
					'silver-shrine-gate',
					'silver-shrine-gate-sprite',
					'silverpine-offering-cache'
				],
				payoffIds: ['silverpine-offering-cache'],
				storyMotif: 'shrine'
			}
		]
	},
	{
		id: 'crossroads-to-wildwood',
		from: 'Crossroads',
		to: 'Wildwood',
		mainRoute: [
			{ x: 4_000, y: 4_300 },
			{ x: 4_200, y: 5_347 },
			{ x: 5_600, y: 5_347 },
			{ x: 5_600, y: 3_200 },
			{ x: 5_960, y: 1_800 }
		],
		beats: [
			{
				id: 'wildwood-threshold-hook',
				routeId: 'crossroads-to-wildwood',
				cameraPoint: { x: 5_600, y: 4_200 },
				purpose: 'hook',
				expectedVisibleIds: ['wildwood-staging-brush', 'wildwood-woodcutter'],
				storyMotif: 'forest-danger'
			},
			{
				id: 'wildwood-side-grove',
				routeId: 'crossroads-to-wildwood',
				cameraPoint: { x: 4_700, y: 3_650 },
				purpose: 'fork',
				expectedVisibleIds: [
					'wildwood-grove-floor-1',
					'wildwood-grove-brush-1',
					'wildwood-grove-cache'
				],
				optionalPathIds: ['wildwood-grove-floor-1'],
				payoffIds: ['wildwood-grove-cache']
			},
			{
				id: 'wildwood-combat-reveal',
				routeId: 'crossroads-to-wildwood',
				cameraPoint: { x: 5_360, y: 1_280 },
				purpose: 'danger',
				expectedVisibleIds: ['meadow-slime-center', 'wildwood-crossing-combat-pocket'],
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
				storyMotif: 'gate'
			}
		]
	}
];
