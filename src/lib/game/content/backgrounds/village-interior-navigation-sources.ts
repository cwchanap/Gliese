import type { NavigationMaskSource } from '$lib/game/core/navigation';
import { buildVillageInteriorNavigationSource } from './village-interior-package';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';

export const VILLAGE_INTERIOR_NAVIGATION_SOURCES: readonly NavigationMaskSource[] = Object.freeze([
	buildVillageInteriorNavigationSource({
		mapId: 'hero-house',
		layout: VILLAGE_INTERIOR_LAYOUTS['hero-house']
	})
]);
