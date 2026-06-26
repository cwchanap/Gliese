export type DecorDesignRole =
	| 'wall'
	| 'threshold'
	| 'breadcrumb'
	| 'frame-landmark'
	| 'hide-reward'
	| 'block-shortcut'
	| 'signal-biome'
	| 'story-symbol'
	| 'vista';

export type DecorStoryMotif =
	| 'homeward-road'
	| 'gate'
	| 'ferry'
	| 'white-line'
	| 'bell'
	| 'shrine'
	| 'forest-danger'
	| 'memory-topology';

export interface DecorRoleEntry {
	id: string;
	role: DecorDesignRole;
	routeId?: string;
	supports?: string[];
	storyMotif?: DecorStoryMotif;
}

function role(
	id: string,
	entryRole: DecorDesignRole,
	options: Omit<DecorRoleEntry, 'id' | 'role'> = {}
): DecorRoleEntry {
	return { id, role: entryRole, ...options };
}

function roles(
	ids: string[],
	entryRole: DecorDesignRole,
	options: Omit<DecorRoleEntry, 'id' | 'role'> = {}
): DecorRoleEntry[] {
	return ids.map((id) => role(id, entryRole, options));
}

export const decorRoles: DecorRoleEntry[] = [
	role('village-hanging-lantern', 'story-symbol', { storyMotif: 'homeward-road' }),
	role('village-market-stall', 'frame-landmark', { storyMotif: 'homeward-road' }),
	role('village-festival-banner', 'story-symbol', { storyMotif: 'homeward-road' }),
	...roles(['village-plaza-flowers-1', 'village-plaza-flowers-2'], 'frame-landmark', {
		storyMotif: 'homeward-road'
	}),
	...roles(
		['village-lantern-junction-sw', 'village-lantern-junction-nw', 'village-lantern-junction-ne'],
		'breadcrumb',
		{ storyMotif: 'homeward-road' }
	),
	role('village-maple-garden', 'signal-biome', { storyMotif: 'homeward-road' }),
	role('village-shrine-offering', 'story-symbol', { storyMotif: 'shrine' }),
	role('village-stone-lantern', 'story-symbol', { storyMotif: 'shrine' }),
	...roles(['village-gate-lantern-a', 'village-gate-lantern-b'], 'threshold', {
		routeId: 'spawn-to-crossroads',
		storyMotif: 'homeward-road'
	}),
	role('village-corridor-waymarker', 'breadcrumb', { routeId: 'spawn-to-crossroads' }),
	role('village-gate-arch', 'threshold', {
		routeId: 'spawn-to-crossroads',
		storyMotif: 'homeward-road'
	}),
	role('village-plaza-fountain', 'frame-landmark', { storyMotif: 'homeward-road' }),
	role('village-field-scarecrow', 'signal-biome', { storyMotif: 'homeward-road' }),
	role('village-junction-topiary', 'frame-landmark', { storyMotif: 'homeward-road' }),

	...roles(['wildwood-north-canopy', 'wildwood-east-canopy'], 'wall', {
		routeId: 'crossroads-to-wildwood'
	}),
	...roles(['wildwood-grove-tree-1', 'wildwood-grove-tree-2'], 'wall', {
		routeId: 'crossroads-to-wildwood'
	}),
	role('wildwood-grove-brush-1', 'signal-biome', { routeId: 'crossroads-to-wildwood' }),
	role('wildwood-threshold-floor', 'threshold', {
		routeId: 'crossroads-to-wildwood',
		storyMotif: 'forest-danger'
	}),
	...roles(['wildwood-forest-lane-north-wall', 'wildwood-forest-lane-south-wall'], 'wall', {
		routeId: 'crossroads-to-wildwood'
	}),
	...roles(['wildwood-threshold-tree-wall-west', 'wildwood-threshold-tree-wall-east'], 'wall', {
		routeId: 'crossroads-to-wildwood'
	}),
	...roles(['wildwood-threshold-brush-left', 'wildwood-threshold-brush-right'], 'threshold', {
		routeId: 'crossroads-to-wildwood',
		storyMotif: 'forest-danger'
	}),
	role('wildwood-cache-brush-screen', 'hide-reward', {
		routeId: 'crossroads-to-wildwood',
		supports: ['wildwood-grove-cache']
	}),
	role('wildwood-cache-tree-cover', 'hide-reward', {
		routeId: 'crossroads-to-wildwood',
		supports: ['wildwood-grove-cache']
	}),
	role('wildwood-grove-maple-1', 'wall', { routeId: 'crossroads-to-wildwood' }),
	role('wildwood-grove-floor-1', 'signal-biome', { routeId: 'crossroads-to-wildwood' }),
	role('wildwood-staging-brush', 'breadcrumb', { routeId: 'crossroads-to-wildwood' }),
	role('wildwood-cave-warning-floor', 'threshold', {
		routeId: 'crossroads-to-wildwood',
		storyMotif: 'gate'
	}),
	...roles(
		[
			'wildwood-cave-canopy',
			'wildwood-cave-canopy-heavy',
			'wildwood-combat-pocket-wall-west',
			'wildwood-combat-pocket-wall-east',
			'wildwood-cave-canopy-neck'
		],
		'wall',
		{ routeId: 'crossroads-to-wildwood' }
	),

	role('witchwood-gate-sprite', 'story-symbol', { storyMotif: 'gate' }),
	...roles(['mistfen-dead-tree-west', 'mistfen-dead-tree-east'], 'wall', {
		routeId: 'crossroads-to-mistfen'
	}),
	role('mistfen-toxic-bloom', 'breadcrumb', { routeId: 'crossroads-to-mistfen' }),
	role('mistfen-reed-wall-east', 'hide-reward', {
		routeId: 'crossroads-to-mistfen',
		supports: ['mistfen-cache']
	}),
	...roles(
		[
			'mistfen-reed-wall-west',
			'mistfen-reed-wall-north',
			'mistfen-reed-wall-south',
			'mistfen-deadfall-bend'
		],
		'wall',
		{ routeId: 'crossroads-to-mistfen' }
	),
	role('mistfen-reeds-1', 'signal-biome', { routeId: 'crossroads-to-mistfen' }),
	role('mistfen-marsh-rock', 'wall', { routeId: 'crossroads-to-mistfen' }),
	...roles(['mistfen-bloom-trail-1', 'mistfen-bloom-trail-2'], 'breadcrumb', {
		routeId: 'crossroads-to-mistfen'
	}),
	...roles(
		['mistfen-fog-entry', 'mistfen-fog-middle', 'mistfen-fog-gate', 'mistfen-fog'],
		'signal-biome',
		{
			routeId: 'crossroads-to-mistfen',
			storyMotif: 'gate'
		}
	),
	role('mistfen-gate-fog-wall', 'wall', { routeId: 'crossroads-to-mistfen' }),
	role('mistfen-gate-reed-wall-east', 'wall', { routeId: 'crossroads-to-mistfen' }),

	role('silver-shrine-gate-sprite', 'story-symbol', { storyMotif: 'gate' }),
	...roles(['silverpine-lantern-west', 'silverpine-lantern-east'], 'threshold', {
		routeId: 'crossroads-to-silverpine',
		storyMotif: 'shrine'
	}),
	role('silverpine-offering', 'story-symbol', { storyMotif: 'shrine' }),
	role('silverpine-amulet-rack', 'story-symbol', { storyMotif: 'shrine' }),
	role('silverpine-side-grove-maple', 'hide-reward', {
		routeId: 'crossroads-to-silverpine',
		supports: ['silverpine-tonic']
	}),
	role('silverpine-side-grove-pine', 'wall', { routeId: 'crossroads-to-silverpine' }),
	...roles(['silverpine-tree-1', 'silverpine-maple-1', 'silverpine-maple-2'], 'wall', {
		routeId: 'crossroads-to-silverpine'
	}),
	role('silverpine-lantern-mid', 'breadcrumb', { routeId: 'crossroads-to-silverpine' }),
	...roles(
		[
			'silverpine-lower-wall-west',
			'silverpine-lower-wall-east',
			'silverpine-switchback-west',
			'silverpine-switchback-east',
			'silverpine-offering-grove-wall',
			'silverpine-terrace-boundary'
		],
		'wall',
		{ routeId: 'crossroads-to-silverpine' }
	),

	role('coast-torii', 'story-symbol', { storyMotif: 'ferry' }),
	role('coast-ferry-shrine', 'story-symbol', { storyMotif: 'bell' }),
	role('coast-boat', 'hide-reward', {
		routeId: 'crossroads-to-coast',
		supports: ['coast-salve']
	}),
	role('coast-net', 'hide-reward', {
		routeId: 'crossroads-to-coast',
		supports: ['coast-salve']
	}),
	role('coast-tidepool', 'hide-reward', {
		routeId: 'crossroads-to-coast',
		supports: ['coast-salve']
	}),
	role('coast-driftwood', 'breadcrumb', { routeId: 'crossroads-to-coast' }),
	role('coast-jetty', 'vista', { routeId: 'crossroads-to-coast', storyMotif: 'ferry' }),
	role('coast-foam', 'signal-biome', { routeId: 'crossroads-to-coast' }),
	role('coast-approach-net', 'threshold', {
		routeId: 'crossroads-to-coast',
		storyMotif: 'ferry'
	}),
	...roles(
		[
			'coast-fork-west-driftwood-wall',
			'coast-shrine-pocket-boundary',
			'coast-tidepool-rock-wall',
			'coast-jetty-neck'
		],
		'wall',
		{ routeId: 'crossroads-to-coast' }
	),

	role('castle-gate-sprite', 'story-symbol', { storyMotif: 'white-line' }),
	role('crossroads-waystone-sprite', 'story-symbol', { storyMotif: 'memory-topology' }),
	...roles(['crossroads-lantern-west', 'crossroads-lantern-east'], 'threshold', {
		routeId: 'crossroads-to-silverpine',
		storyMotif: 'memory-topology'
	}),
	role('crossroads-banner', 'story-symbol', { storyMotif: 'white-line' }),
	role('crossroads-stall', 'frame-landmark', { storyMotif: 'memory-topology' }),
	role('crossroads-flowers', 'frame-landmark', { storyMotif: 'memory-topology' }),
	role('crossroads-coast-cue-net', 'signal-biome', { routeId: 'crossroads-to-coast' }),
	role('crossroads-mistfen-cue-reeds', 'signal-biome', {
		routeId: 'crossroads-to-mistfen'
	}),
	role('crossroads-silverpine-cue-lantern', 'signal-biome', {
		routeId: 'crossroads-to-silverpine'
	}),
	role('crossroads-wildwood-cue-floor', 'signal-biome', {
		routeId: 'crossroads-to-wildwood'
	}),
	role('crossroads-wildwood-cue-brush', 'signal-biome', {
		routeId: 'crossroads-to-wildwood'
	}),
	role('crossroads-hanging-lantern', 'story-symbol', { storyMotif: 'memory-topology' })
];
