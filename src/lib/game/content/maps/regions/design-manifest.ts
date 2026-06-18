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
export const regionDesignManifest: RegionDesignEntry[] = [];
