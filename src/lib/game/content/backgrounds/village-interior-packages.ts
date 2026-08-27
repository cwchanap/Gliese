import { guildHallMap, heroHouseMap } from '$lib/game/content/maps';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';
import type { WorldMapDefinition } from '$lib/game/content/maps/types';
import guildHallManifestJson from './manifests/guild-hall.json';
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
const guildHallManifest = guildHallManifestJson as VillageInteriorPackageManifest;
const heroHouseNavigationSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
	(source) => source.mapId === 'hero-house'
);
const guildHallNavigationSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
	(source) => source.mapId === 'guild-hall'
);

if (!heroHouseNavigationSource) {
	throw new Error('Hero House navigation source is not registered');
}
if (!guildHallNavigationSource) {
	throw new Error('Guild Hall navigation source is not registered');
}

function interiorVisualOwners(
	map: WorldMapDefinition,
	cropId: string,
	baseImageId: string
): readonly MapBackgroundVisualOwner[] {
	const ownerCrops = [{ cropId, requiredBackgroundIds: [baseImageId] }] as const;
	return [
		...(map.groundPatches ?? []).map(({ id }) => ({
			sourceType: 'ground-patch' as const,
			sourceId: id,
			ownerCrops
		})),
		...(map.blockers ?? []).map(({ id }) => ({
			sourceType: 'blocker' as const,
			sourceId: id,
			ownerCrops
		})),
		...(map.interiorProps ?? []).map(({ id }) => ({
			sourceType: 'interior-prop' as const,
			sourceId: id,
			ownerCrops
		}))
	];
}

const heroHousePackage = buildVillageInteriorPackage({
	mapId: 'hero-house',
	layout: VILLAGE_INTERIOR_LAYOUTS['hero-house'],
	manifest: heroHouseManifest,
	visualOwners: interiorVisualOwners(
		heroHouseMap,
		'hero-house-full-map',
		heroHouseManifest.base.id
	),
	navigationSource: heroHouseNavigationSource
});

const guildHallPackage = buildVillageInteriorPackage({
	mapId: 'guild-hall',
	layout: VILLAGE_INTERIOR_LAYOUTS['guild-hall'],
	manifest: guildHallManifest,
	visualOwners: interiorVisualOwners(
		guildHallMap,
		'guild-hall-full-map',
		guildHallManifest.base.id
	),
	navigationSource: guildHallNavigationSource
});

export const VILLAGE_INTERIOR_PACKAGES: readonly MapBackgroundPackageDefinition[] = Object.freeze([
	heroHousePackage.definition,
	guildHallPackage.definition
]);
