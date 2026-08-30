import {
	blacksmithInteriorMap,
	guildHallMap,
	heroHouseMap,
	itemShopMap,
	shrineOfAuroraInteriorMap,
	villagerHouse1Map,
	villagerHouse2Map,
	villagerHouse3Map
} from '$lib/game/content/maps';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';
import type { WorldMapDefinition } from '$lib/game/content/maps/types';
import guildHallManifestJson from './manifests/guild-hall.json';
import heroHouseManifestJson from './manifests/hero-house.json';
import itemShopManifestJson from './manifests/item-shop.json';
import blacksmithInteriorManifestJson from './manifests/blacksmith-interior.json';
import shrineOfAuroraInteriorManifestJson from './manifests/shrine-of-aurora-interior.json';
import villagerHouse1ManifestJson from './manifests/villager-house-1.json';
import villagerHouse2ManifestJson from './manifests/villager-house-2.json';
import villagerHouse3ManifestJson from './manifests/villager-house-3.json';
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
const blacksmithInteriorManifest = blacksmithInteriorManifestJson as VillageInteriorPackageManifest;
const shrineOfAuroraInteriorManifest =
	shrineOfAuroraInteriorManifestJson as VillageInteriorPackageManifest;
const villagerHouse1Manifest = villagerHouse1ManifestJson as VillageInteriorPackageManifest;
const villagerHouse2Manifest = villagerHouse2ManifestJson as VillageInteriorPackageManifest;
const villagerHouse3Manifest = villagerHouse3ManifestJson as VillageInteriorPackageManifest;
const heroHouseNavigationSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
	(source) => source.mapId === 'hero-house'
);
const guildHallNavigationSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
	(source) => source.mapId === 'guild-hall'
);
const itemShopNavigationSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
	(source) => source.mapId === 'item-shop'
);
const blacksmithInteriorNavigationSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
	(source) => source.mapId === 'blacksmith-interior'
);
const villagerHouse1NavigationSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
	(source) => source.mapId === 'villager-house-1'
);
const villagerHouse2NavigationSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
	(source) => source.mapId === 'villager-house-2'
);
const villagerHouse3NavigationSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
	(source) => source.mapId === 'villager-house-3'
);
const shrineOfAuroraInteriorNavigationSource = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
	(source) => source.mapId === 'shrine-of-aurora-interior'
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
if (!blacksmithInteriorNavigationSource) {
	throw new Error('Blacksmith navigation source is not registered');
}
if (!villagerHouse1NavigationSource) {
	throw new Error('Villager House 1 navigation source is not registered');
}
if (!villagerHouse2NavigationSource) {
	throw new Error('Villager House 2 navigation source is not registered');
}
if (!villagerHouse3NavigationSource) {
	throw new Error('Villager House 3 navigation source is not registered');
}
if (!shrineOfAuroraInteriorNavigationSource) {
	throw new Error('Shrine of Aurora navigation source is not registered');
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

const blacksmithInteriorPackage = buildVillageInteriorPackage({
	mapId: 'blacksmith-interior',
	layout: VILLAGE_INTERIOR_LAYOUTS['blacksmith-interior'],
	manifest: blacksmithInteriorManifest,
	visualOwners: interiorVisualOwners(
		blacksmithInteriorMap,
		'blacksmith-interior-full-map',
		blacksmithInteriorManifest.base.id
	),
	navigationSource: blacksmithInteriorNavigationSource
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

const villagerHouse2Package = buildVillageInteriorPackage({
	mapId: 'villager-house-2',
	layout: VILLAGE_INTERIOR_LAYOUTS['villager-house-2'],
	manifest: villagerHouse2Manifest,
	visualOwners: interiorVisualOwners(
		villagerHouse2Map,
		'villager-house-2-full-map',
		villagerHouse2Manifest.base.id
	),
	navigationSource: villagerHouse2NavigationSource
});

const villagerHouse3Package = buildVillageInteriorPackage({
	mapId: 'villager-house-3',
	layout: VILLAGE_INTERIOR_LAYOUTS['villager-house-3'],
	manifest: villagerHouse3Manifest,
	visualOwners: interiorVisualOwners(
		villagerHouse3Map,
		'villager-house-3-full-map',
		villagerHouse3Manifest.base.id
	),
	navigationSource: villagerHouse3NavigationSource
});

const shrineOfAuroraInteriorPackage = buildVillageInteriorPackage({
	mapId: 'shrine-of-aurora-interior',
	layout: VILLAGE_INTERIOR_LAYOUTS['shrine-of-aurora-interior'],
	manifest: shrineOfAuroraInteriorManifest,
	visualOwners: interiorVisualOwners(
		shrineOfAuroraInteriorMap,
		'shrine-of-aurora-interior-full-map',
		shrineOfAuroraInteriorManifest.base.id
	),
	navigationSource: shrineOfAuroraInteriorNavigationSource
});

export const VILLAGE_INTERIOR_PACKAGES: readonly MapBackgroundPackageDefinition[] = Object.freeze([
	heroHousePackage.definition,
	guildHallPackage.definition,
	itemShopPackage.definition,
	blacksmithInteriorPackage.definition,
	villagerHouse1Package.definition,
	villagerHouse2Package.definition,
	villagerHouse3Package.definition,
	shrineOfAuroraInteriorPackage.definition
]);
