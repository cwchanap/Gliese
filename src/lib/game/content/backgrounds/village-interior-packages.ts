import { guildHallMap, heroHouseMap, itemShopMap, villagerHouse1Map } from '$lib/game/content/maps';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';
import type { WorldMapDefinition } from '$lib/game/content/maps/types';
import guildHallManifestJson from './manifests/guild-hall.json';
import heroHouseManifestJson from './manifests/hero-house.json';
import itemShopManifestJson from './manifests/item-shop.json';
import villagerHouse1ManifestJson from './manifests/villager-house-1.json';
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
const itemShopManifest = itemShopManifestJson as VillageInteriorPackageManifest;
const villagerHouse1Manifest = villagerHouse1ManifestJson as VillageInteriorPackageManifest;
const heroHouseNavigationSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
	(source) => source.mapId === 'hero-house'
);
const guildHallNavigationSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
	(source) => source.mapId === 'guild-hall'
);
const itemShopNavigationSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
	(source) => source.mapId === 'item-shop'
);
const villagerHouse1NavigationSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
	(source) => source.mapId === 'villager-house-1'
);

if (!heroHouseNavigationSource) {
	throw new Error('Hero House navigation source is not registered');
}
if (!guildHallNavigationSource) {
	throw new Error('Guild Hall navigation source is not registered');
}
if (!itemShopNavigationSource) {
	throw new Error('Item Shop navigation source is not registered');
}
if (!villagerHouse1NavigationSource) {
	throw new Error('Villager House 1 navigation source is not registered');
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

const itemShopPackage = buildVillageInteriorPackage({
	mapId: 'item-shop',
	layout: VILLAGE_INTERIOR_LAYOUTS['item-shop'],
	manifest: itemShopManifest,
	visualOwners: interiorVisualOwners(itemShopMap, 'item-shop-full-map', itemShopManifest.base.id),
	navigationSource: itemShopNavigationSource
});

const villagerHouse1Package = buildVillageInteriorPackage({
	mapId: 'villager-house-1',
	layout: VILLAGE_INTERIOR_LAYOUTS['villager-house-1'],
	manifest: villagerHouse1Manifest,
	visualOwners: interiorVisualOwners(
		villagerHouse1Map,
		'villager-house-1-full-map',
		villagerHouse1Manifest.base.id
	),
	navigationSource: villagerHouse1NavigationSource
});

export const VILLAGE_INTERIOR_PACKAGES: readonly MapBackgroundPackageDefinition[] = Object.freeze([
	heroHousePackage.definition,
	guildHallPackage.definition,
	itemShopPackage.definition,
	villagerHouse1Package.definition
]);
