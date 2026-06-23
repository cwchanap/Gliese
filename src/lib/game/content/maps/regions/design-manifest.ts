export interface RegionDesignEntry {
	id: string;
	emotion?: string;
	density?: 'quiet' | 'medium' | 'dense';
	anchorIds: string[];
	approachClueIds: string[];
	optionalBranchIds: string[];
	payoffIds: string[];
	exitHookIds: string[];
}

/** Design-intent manifest. Regions are appended as their content tasks land. */
export const regionDesignManifest: RegionDesignEntry[] = [
	{
		id: 'village',
		emotion: 'home',
		density: 'dense',
		anchorIds: ['guild-hall-exterior'],
		approachClueIds: ['sundrop-well', 'link-village-crossroads'],
		optionalBranchIds: ['village-crossroads-nook'],
		payoffIds: ['village-hanging-lantern'],
		exitHookIds: ['crossroads-waystone']
	},
	{
		id: 'crossroads',
		emotion: 'civic',
		density: 'dense',
		anchorIds: ['crossroads-waystone'],
		approachClueIds: ['crossroads-festival-road', 'crossroads-banner'],
		optionalBranchIds: ['crossroads-nook'],
		payoffIds: ['crossroads-cache'],
		exitHookIds: ['castle-gate']
	},
	{
		id: 'coast',
		emotion: 'open',
		density: 'medium',
		anchorIds: ['ferry-crossing'],
		approachClueIds: ['coast-approach-path', 'coast-net', 'coast-driftwood'],
		optionalBranchIds: ['coast-tidepool'],
		payoffIds: ['coast-salve'],
		exitHookIds: ['coast-jetty']
	},
	{
		id: 'mistfen',
		emotion: 'eerie',
		density: 'quiet',
		anchorIds: ['witchwood-gate'],
		approachClueIds: ['mistfen-toxic-bloom', 'mistfen-reeds-1'],
		optionalBranchIds: ['mistfen-pool-east'],
		payoffIds: ['mistfen-salve'],
		exitHookIds: ['witchwood-gate']
	},
	{
		id: 'silverpine',
		emotion: 'reverent',
		density: 'medium',
		anchorIds: ['silver-shrine-gate'],
		approachClueIds: ['silverpine-lantern-west', 'silverpine-lantern-east'],
		optionalBranchIds: ['silverpine-amulet-rack'],
		payoffIds: ['silverpine-tonic'],
		exitHookIds: ['silver-shrine-gate']
	},
	{
		id: 'wildwood',
		emotion: 'tense',
		density: 'medium',
		anchorIds: ['whispering-cave'],
		approachClueIds: ['sundrop-forest-road-north', 'wildwood-staging-brush', 'wildwood-woodcutter'],
		optionalBranchIds: ['wildwood-grove-cache'],
		payoffIds: ['wildwood-grove-cache'],
		exitHookIds: ['whispering-cave']
	}
];
