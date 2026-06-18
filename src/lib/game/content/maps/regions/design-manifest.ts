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
		approachClueIds: ['village-waymarker', 'link-village-crossroads'],
		optionalBranchIds: ['village-crossroads-nook'],
		payoffIds: ['village-roadside-cache'],
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
	}
];
