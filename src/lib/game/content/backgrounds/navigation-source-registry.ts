import type { NavigationMaskSource } from '$lib/game/core/navigation';

import { VILLAGE_INTERIOR_NAVIGATION_SOURCES } from './village-interior-navigation-sources';

/**
 * Meadow owns the first slice of this shared registry. Keeping the slot here
 * means the generator has one input when that source is present.
 */
export const MEADOW_ENTRY_NAVIGATION_SOURCES: readonly NavigationMaskSource[] = Object.freeze([]);

export const NAVIGATION_MASK_SOURCES: readonly NavigationMaskSource[] = Object.freeze([
	...MEADOW_ENTRY_NAVIGATION_SOURCES,
	...VILLAGE_INTERIOR_NAVIGATION_SOURCES
]);
