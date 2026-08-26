import { heroHouseMap } from '$lib/game/content/maps';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';
import type { WorldMapDefinition } from '$lib/game/content/maps/types';
import heroHouseManifestJson from './manifests/hero-house.json';
import {
	buildVillageInteriorPackage,
	type VillageInteriorPackageManifest
} from './village-interior-package';
import { VILLAGE_INTERIOR_NAVIGATION_SOURCES } from './village-interior-navigation-sources';
import type {
	MapBackgroundPackageDefinition,
	MapBackgroundVisualOwner
} from './map-background-package';

const heroHouseManifest = heroHouseManifestJson as VillageInteriorPackageManifest;
const heroHouseNavigationSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
	(source) => source.mapId === 'hero-house'
);

if (!heroHouseNavigationSource) {
	throw new Error('Hero House navigation source is not registered');
}

const heroHouseOwnerCrops = [
	{
		cropId: 'hero-house-full-map',
		requiredBackgroundIds: [heroHouseManifest.base.id]
	}
] as const;

function heroHouseVisualOwners(map: WorldMapDefinition): readonly MapBackgroundVisualOwner[] {
	return [
		...(map.groundPatches ?? []).map(({ id }) => ({
			sourceType: 'ground-patch' as const,
			sourceId: id,
			ownerCrops: heroHouseOwnerCrops
		})),
		...(map.blockers ?? []).map(({ id }) => ({
			sourceType: 'blocker' as const,
			sourceId: id,
			ownerCrops: heroHouseOwnerCrops
		})),
		...(map.interiorProps ?? []).map(({ id }) => ({
			sourceType: 'interior-prop' as const,
			sourceId: id,
			ownerCrops: heroHouseOwnerCrops
		}))
	];
}

const heroHousePackage = buildVillageInteriorPackage({
	mapId: 'hero-house',
	layout: VILLAGE_INTERIOR_LAYOUTS['hero-house'],
	manifest: heroHouseManifest,
	visualOwners: heroHouseVisualOwners(heroHouseMap),
	navigationSource: heroHouseNavigationSource
});

export const VILLAGE_INTERIOR_PACKAGES: readonly MapBackgroundPackageDefinition[] = Object.freeze([
	heroHousePackage.definition
]);
