import type { NavigationMaskSource } from '$lib/game/core/navigation';
import { buildVillageInteriorNavigationSource } from './village-interior-package';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';

export const VILLAGE_INTERIOR_NAVIGATION_SOURCES: readonly NavigationMaskSource[] = Object.freeze([
	buildVillageInteriorNavigationSource({
		mapId: 'hero-house',
		layout: VILLAGE_INTERIOR_LAYOUTS['hero-house']
	}),
	buildVillageInteriorNavigationSource({
		mapId: 'guild-hall',
		layout: VILLAGE_INTERIOR_LAYOUTS['guild-hall']
	}),
	buildVillageInteriorNavigationSource({
		mapId: 'item-shop',
		layout: VILLAGE_INTERIOR_LAYOUTS['item-shop']
	}),
	buildVillageInteriorNavigationSource({
		mapId: 'blacksmith-interior',
		layout: VILLAGE_INTERIOR_LAYOUTS['blacksmith-interior']
	}),
	buildVillageInteriorNavigationSource({
		mapId: 'villager-house-1',
		layout: VILLAGE_INTERIOR_LAYOUTS['villager-house-1']
	}),
	buildVillageInteriorNavigationSource({
		mapId: 'villager-house-2',
		layout: VILLAGE_INTERIOR_LAYOUTS['villager-house-2']
	}),
	buildVillageInteriorNavigationSource({
		mapId: 'villager-house-3',
		layout: VILLAGE_INTERIOR_LAYOUTS['villager-house-3']
	})
]);
