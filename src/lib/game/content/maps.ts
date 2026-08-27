import type { DefinitionRegistry } from '$lib/game/core/types';
import { meadowEntryMap, openingMapId } from '$lib/game/content/maps/meadow-entry';
import { VILLAGE_INTERIOR_EXTERIORS } from '$lib/game/content/maps/layouts/meadow-entry-v2';
import { toMapRect } from '$lib/game/content/maps/layouts/layout-rects';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';
import { addEnglishMapText } from '$lib/game/content/maps/text';
import { VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES } from '$lib/game/content/backgrounds/village-interior-package';
import { GENERATED_NAVIGATION_GRIDS } from '$lib/game/content/generated/navigation-grids.generated';

export type {
	MapDiscovery,
	MapTransition,
	MapTransitionMarker,
	MapEncounter,
	MapPickup,
	MapNpcRole,
	MapNpc,
	MapLandmark,
	MapRect,
	MapBackgroundPlane,
	MapGroundTile,
	MapGroundPatch,
	MapBlockerKind,
	MapBlocker,
	MapCombatBounds,
	MapFenceSegment,
	MapInteriorPropDepth,
	MapInteriorProp,
	MapAmbientNpcRole,
	MapAmbientNpc,
	MapDecor,
	MapDecorDepth,
	WorldMapDefinition
} from '$lib/game/content/maps/types';

import type { WorldMapDefinition } from '$lib/game/content/maps/types';

export { meadowEntryMap, openingMapId };

const returnArrival = (mapId: keyof typeof VILLAGE_INTERIOR_EXTERIORS) =>
	VILLAGE_INTERIOR_EXTERIORS[mapId].returnArrival;

const guildHallLayout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];

const guildHallGroundPatches = [
	{
		...toMapRect('guild-hall-full-floor', guildHallLayout.fullFloor),
		tile: 'cobblestoneTile' as const
	},
	{
		...toMapRect('guild-hall-room-records', guildHallLayout.rooms.recordsHall),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('guild-hall-room-common', guildHallLayout.rooms.commonHall),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('guild-hall-room-master-office', guildHallLayout.rooms.guildMasterOffice),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('guild-hall-room-training', guildHallLayout.rooms.trainingHall),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('guild-hall-room-quartermaster', guildHallLayout.rooms.quartermasterRoom),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('guild-hall-corridor-spine', guildHallLayout.corridors.mainSpine),
		tile: 'pathTile' as const
	},
	{
		...toMapRect('guild-hall-corridor-lobby', guildHallLayout.corridors.entranceLobby),
		tile: 'pathTile' as const
	}
];

const guildHallBlockers = [
	{
		...toMapRect(guildHallLayout.walls[0]!.id, guildHallLayout.walls[0]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[1]!.id, guildHallLayout.walls[1]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[2]!.id, guildHallLayout.walls[2]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[3]!.id, guildHallLayout.walls[3]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[4]!.id, guildHallLayout.walls[4]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[5]!.id, guildHallLayout.walls[5]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[6]!.id, guildHallLayout.walls[6]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[7]!.id, guildHallLayout.walls[7]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[8]!.id, guildHallLayout.walls[8]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[9]!.id, guildHallLayout.walls[9]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[10]!.id, guildHallLayout.walls[10]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[11]!.id, guildHallLayout.walls[11]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[12]!.id, guildHallLayout.walls[12]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[13]!.id, guildHallLayout.walls[13]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[14]!.id, guildHallLayout.walls[14]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[15]!.id, guildHallLayout.walls[15]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[16]!.id, guildHallLayout.walls[16]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[17]!.id, guildHallLayout.walls[17]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[18]!.id, guildHallLayout.walls[18]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[19]!.id, guildHallLayout.walls[19]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[20]!.id, guildHallLayout.walls[20]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(guildHallLayout.walls[21]!.id, guildHallLayout.walls[21]!),
		kind: 'ruin-wall' as const
	}
];

const heroHouseLayout = VILLAGE_INTERIOR_LAYOUTS['hero-house'];

const heroHouseGroundPatches = [
	{
		...toMapRect('hero-house-full-floor', heroHouseLayout.fullFloor),
		tile: 'cobblestoneTile' as const
	},
	{
		...toMapRect('hero-house-room-bedroom', heroHouseLayout.rooms.bedroom),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('hero-house-room-study', heroHouseLayout.rooms.study),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('hero-house-room-living-kitchen', heroHouseLayout.rooms.livingKitchen),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('hero-house-corridor-hall', heroHouseLayout.corridors.hall),
		tile: 'pathTile' as const
	}
];

const heroHouseBlockers = [
	{
		...toMapRect(heroHouseLayout.walls[0]!.id, heroHouseLayout.walls[0]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(heroHouseLayout.walls[1]!.id, heroHouseLayout.walls[1]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(heroHouseLayout.walls[2]!.id, heroHouseLayout.walls[2]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(heroHouseLayout.walls[3]!.id, heroHouseLayout.walls[3]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(heroHouseLayout.walls[4]!.id, heroHouseLayout.walls[4]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(heroHouseLayout.walls[5]!.id, heroHouseLayout.walls[5]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(heroHouseLayout.walls[6]!.id, heroHouseLayout.walls[6]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(heroHouseLayout.walls[7]!.id, heroHouseLayout.walls[7]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(heroHouseLayout.walls[8]!.id, heroHouseLayout.walls[8]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(heroHouseLayout.walls[9]!.id, heroHouseLayout.walls[9]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(heroHouseLayout.walls[10]!.id, heroHouseLayout.walls[10]!),
		kind: 'ruin-wall' as const
	}
];

const itemShopLayout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];

const itemShopGroundPatches = [
	{
		...toMapRect('item-shop-full-floor', itemShopLayout.fullFloor),
		tile: 'cobblestoneTile' as const
	},
	{
		...toMapRect('item-shop-room-stockroom', itemShopLayout.rooms.stockroom),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('item-shop-room-office', itemShopLayout.rooms.office),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('item-shop-room-sales-floor', itemShopLayout.rooms.salesFloor),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('item-shop-corridor-service-corridor', itemShopLayout.corridors.serviceCorridor),
		tile: 'pathTile' as const
	},
	{
		...toMapRect('item-shop-corridor-entrance-aisle', itemShopLayout.corridors.entranceAisle),
		tile: 'pathTile' as const
	}
];

const itemShopBlockers = [
	{
		...toMapRect(itemShopLayout.walls[0]!.id, itemShopLayout.walls[0]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(itemShopLayout.walls[1]!.id, itemShopLayout.walls[1]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(itemShopLayout.walls[2]!.id, itemShopLayout.walls[2]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(itemShopLayout.walls[3]!.id, itemShopLayout.walls[3]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(itemShopLayout.walls[4]!.id, itemShopLayout.walls[4]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(itemShopLayout.walls[5]!.id, itemShopLayout.walls[5]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(itemShopLayout.walls[6]!.id, itemShopLayout.walls[6]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(itemShopLayout.walls[7]!.id, itemShopLayout.walls[7]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(itemShopLayout.walls[8]!.id, itemShopLayout.walls[8]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(itemShopLayout.walls[9]!.id, itemShopLayout.walls[9]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(itemShopLayout.walls[10]!.id, itemShopLayout.walls[10]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(itemShopLayout.walls[11]!.id, itemShopLayout.walls[11]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(itemShopLayout.walls[12]!.id, itemShopLayout.walls[12]!),
		kind: 'ruin-wall' as const
	}
];

const shrineOfAuroraLayout = VILLAGE_INTERIOR_LAYOUTS['shrine-of-aurora-interior'];

const shrineOfAuroraGroundPatches = [
	{
		...toMapRect('shrine-of-aurora-full-floor', shrineOfAuroraLayout.fullFloor),
		tile: 'cobblestoneTile' as const
	},
	{
		...toMapRect('shrine-of-aurora-room-inner-sanctum', shrineOfAuroraLayout.rooms.innerSanctum),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect(
			'shrine-of-aurora-room-west-preparation',
			shrineOfAuroraLayout.rooms.westPreparation
		),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('shrine-of-aurora-room-east-archive', shrineOfAuroraLayout.rooms.eastArchive),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('shrine-of-aurora-corridor-nave', shrineOfAuroraLayout.corridors.nave),
		tile: 'pathTile' as const
	},
	{
		...toMapRect(
			'shrine-of-aurora-corridor-entrance-hall',
			shrineOfAuroraLayout.corridors.entranceHall
		),
		tile: 'pathTile' as const
	}
];

const shrineOfAuroraBlockers = [
	{
		...toMapRect(shrineOfAuroraLayout.walls[0]!.id, shrineOfAuroraLayout.walls[0]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[1]!.id, shrineOfAuroraLayout.walls[1]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[2]!.id, shrineOfAuroraLayout.walls[2]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[3]!.id, shrineOfAuroraLayout.walls[3]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[4]!.id, shrineOfAuroraLayout.walls[4]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[5]!.id, shrineOfAuroraLayout.walls[5]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[6]!.id, shrineOfAuroraLayout.walls[6]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[7]!.id, shrineOfAuroraLayout.walls[7]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[8]!.id, shrineOfAuroraLayout.walls[8]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[9]!.id, shrineOfAuroraLayout.walls[9]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[10]!.id, shrineOfAuroraLayout.walls[10]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[11]!.id, shrineOfAuroraLayout.walls[11]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[12]!.id, shrineOfAuroraLayout.walls[12]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[13]!.id, shrineOfAuroraLayout.walls[13]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[14]!.id, shrineOfAuroraLayout.walls[14]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[15]!.id, shrineOfAuroraLayout.walls[15]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[16]!.id, shrineOfAuroraLayout.walls[16]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[17]!.id, shrineOfAuroraLayout.walls[17]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[18]!.id, shrineOfAuroraLayout.walls[18]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[19]!.id, shrineOfAuroraLayout.walls[19]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(shrineOfAuroraLayout.walls[20]!.id, shrineOfAuroraLayout.walls[20]!),
		kind: 'ruin-wall' as const
	}
];

const villagerHouse1Layout = VILLAGE_INTERIOR_LAYOUTS['villager-house-1'];

const villagerHouse1GroundPatches = [
	{
		...toMapRect('villager-house-1-full-floor', villagerHouse1Layout.fullFloor),
		tile: 'cobblestoneTile' as const
	},
	{
		...toMapRect('villager-house-1-room-bedroom', villagerHouse1Layout.rooms.bedroom),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('villager-house-1-room-storage', villagerHouse1Layout.rooms.storage),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('villager-house-1-room-living-kitchen', villagerHouse1Layout.rooms.livingKitchen),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('villager-house-1-corridor-hall', villagerHouse1Layout.corridors.hall),
		tile: 'pathTile' as const
	}
];

const villagerHouse1Blockers = [
	{
		...toMapRect(villagerHouse1Layout.walls[0]!.id, villagerHouse1Layout.walls[0]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse1Layout.walls[1]!.id, villagerHouse1Layout.walls[1]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse1Layout.walls[2]!.id, villagerHouse1Layout.walls[2]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse1Layout.walls[3]!.id, villagerHouse1Layout.walls[3]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse1Layout.walls[4]!.id, villagerHouse1Layout.walls[4]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse1Layout.walls[5]!.id, villagerHouse1Layout.walls[5]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse1Layout.walls[6]!.id, villagerHouse1Layout.walls[6]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse1Layout.walls[7]!.id, villagerHouse1Layout.walls[7]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse1Layout.walls[8]!.id, villagerHouse1Layout.walls[8]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse1Layout.walls[9]!.id, villagerHouse1Layout.walls[9]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse1Layout.walls[10]!.id, villagerHouse1Layout.walls[10]!),
		kind: 'ruin-wall' as const
	}
];

const villagerHouse2Layout = VILLAGE_INTERIOR_LAYOUTS['villager-house-2'];

const villagerHouse2GroundPatches = [
	{
		...toMapRect('villager-house-2-full-floor', villagerHouse2Layout.fullFloor),
		tile: 'cobblestoneTile' as const
	},
	{
		...toMapRect('villager-house-2-room-workshop', villagerHouse2Layout.rooms.workshop),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('villager-house-2-room-bedroom', villagerHouse2Layout.rooms.bedroom),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('villager-house-2-room-living-area', villagerHouse2Layout.rooms.livingArea),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('villager-house-2-corridor-hall', villagerHouse2Layout.corridors.hall),
		tile: 'pathTile' as const
	}
];

const villagerHouse2Blockers = [
	{
		...toMapRect(villagerHouse2Layout.walls[0]!.id, villagerHouse2Layout.walls[0]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse2Layout.walls[1]!.id, villagerHouse2Layout.walls[1]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse2Layout.walls[2]!.id, villagerHouse2Layout.walls[2]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse2Layout.walls[3]!.id, villagerHouse2Layout.walls[3]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse2Layout.walls[4]!.id, villagerHouse2Layout.walls[4]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse2Layout.walls[5]!.id, villagerHouse2Layout.walls[5]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse2Layout.walls[6]!.id, villagerHouse2Layout.walls[6]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse2Layout.walls[7]!.id, villagerHouse2Layout.walls[7]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse2Layout.walls[8]!.id, villagerHouse2Layout.walls[8]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse2Layout.walls[9]!.id, villagerHouse2Layout.walls[9]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse2Layout.walls[10]!.id, villagerHouse2Layout.walls[10]!),
		kind: 'ruin-wall' as const
	}
];

const villagerHouse3Layout = VILLAGE_INTERIOR_LAYOUTS['villager-house-3'];

const villagerHouse3GroundPatches = [
	{
		...toMapRect('villager-house-3-full-floor', villagerHouse3Layout.fullFloor),
		tile: 'cobblestoneTile' as const
	},
	{
		...toMapRect('villager-house-3-room-archive-study', villagerHouse3Layout.rooms.archiveStudy),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect(
			'villager-house-3-room-bedroom-storage',
			villagerHouse3Layout.rooms.bedroomStorage
		),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('villager-house-3-room-sitting-room', villagerHouse3Layout.rooms.sittingRoom),
		tile: 'plazaStoneTile' as const
	},
	{
		...toMapRect('villager-house-3-corridor-hall', villagerHouse3Layout.corridors.hall),
		tile: 'pathTile' as const
	}
];

const villagerHouse3Blockers = [
	{
		...toMapRect(villagerHouse3Layout.walls[0]!.id, villagerHouse3Layout.walls[0]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse3Layout.walls[1]!.id, villagerHouse3Layout.walls[1]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse3Layout.walls[2]!.id, villagerHouse3Layout.walls[2]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse3Layout.walls[3]!.id, villagerHouse3Layout.walls[3]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse3Layout.walls[4]!.id, villagerHouse3Layout.walls[4]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse3Layout.walls[5]!.id, villagerHouse3Layout.walls[5]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse3Layout.walls[6]!.id, villagerHouse3Layout.walls[6]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse3Layout.walls[7]!.id, villagerHouse3Layout.walls[7]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse3Layout.walls[8]!.id, villagerHouse3Layout.walls[8]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse3Layout.walls[9]!.id, villagerHouse3Layout.walls[9]!),
		kind: 'ruin-wall' as const
	},
	{
		...toMapRect(villagerHouse3Layout.walls[10]!.id, villagerHouse3Layout.walls[10]!),
		kind: 'ruin-wall' as const
	}
];

export const heroHouseMap: WorldMapDefinition = {
	id: 'hero-house',
	width: heroHouseLayout.widthTiles,
	height: heroHouseLayout.heightTiles,
	spawnDirection: 'up',
	spawn: { ...heroHouseLayout.spawn },
	navigationGrid: GENERATED_NAVIGATION_GRIDS['hero-house-navigation'],
	navigationGridOwnedSources: VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES,
	groundPatches: heroHouseGroundPatches,
	blockers: heroHouseBlockers,
	transitions: [
		{
			id: 'hero-house-to-meadow',
			...heroHouseLayout.exit,
			toMapId: openingMapId,
			arrival: returnArrival('hero-house')
		}
	],
	interiorProps: [
		{
			...toMapRect('hero-house-bed', heroHouseLayout.propZones.bed),
			frameName: 'bed',
			collision: toMapRect('hero-house-bed-collision', heroHouseLayout.propCollisions.bed)
		},
		{
			...toMapRect('hero-house-study-storage', heroHouseLayout.propZones.studyStorage),
			frameName: 'bookshelf',
			collision: toMapRect(
				'hero-house-study-storage-collision',
				heroHouseLayout.propCollisions.studyStorage
			)
		},
		{
			...toMapRect('hero-house-living-table', heroHouseLayout.propZones.livingTable),
			frameName: 'table',
			collision: toMapRect(
				'hero-house-living-table-collision',
				heroHouseLayout.propCollisions.livingTable
			)
		},
		{
			...toMapRect('hero-house-kitchen-storage', heroHouseLayout.propZones.kitchenStorage),
			frameName: 'crateStack',
			collision: toMapRect(
				'hero-house-kitchen-storage-collision',
				heroHouseLayout.propCollisions.kitchenStorage
			)
		}
	]
};

export const guildHallMap: WorldMapDefinition = addEnglishMapText({
	id: 'guild-hall',
	width: guildHallLayout.widthTiles,
	height: guildHallLayout.heightTiles,
	spawnDirection: 'up',
	spawn: { ...guildHallLayout.spawn },
	navigationGrid: GENERATED_NAVIGATION_GRIDS['guild-hall-navigation'],
	navigationGridOwnedSources: VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES,
	groundPatches: guildHallGroundPatches,
	blockers: guildHallBlockers,
	transitions: [
		{
			id: 'guild-hall-to-meadow',
			...guildHallLayout.exit,
			toMapId: openingMapId,
			arrival: returnArrival('guild-hall')
		}
	],
	npcs: [
		{
			id: 'guild-master',
			...guildHallLayout.npcApproaches.guildMaster.npc,
			nameKey: 'content.maps.npcs.guild-master.name',
			dialogueId: 'guild-master',
			role: 'guild',
			frameName: 'guildMasterNpc'
		},
		{
			id: 'guild-quartermaster',
			...guildHallLayout.npcApproaches.quartermaster.npc,
			nameKey: 'content.maps.npcs.guild-quartermaster.name',
			dialogueId: 'guild-quartermaster',
			role: 'shopkeeper',
			frameName: 'quartermasterNpc',
			shopId: 'guild-quartermaster'
		}
	],
	interiorProps: [
		{
			...toMapRect('guild-hall-records-shelves', guildHallLayout.propZones.recordsShelves),
			frameName: 'bookshelf',
			collision: toMapRect(
				'guild-hall-records-shelves-collision',
				guildHallLayout.propCollisions.recordsShelves
			)
		},
		{
			...toMapRect('guild-hall-notice-board', guildHallLayout.propZones.questBoardRecordsDesk),
			frameName: 'noticeBoard',
			collision: toMapRect(
				'guild-hall-notice-board-collision',
				guildHallLayout.propCollisions.questBoardRecordsDesk
			)
		},
		{
			...toMapRect('guild-hall-common-table', guildHallLayout.propZones.commonTableSeating),
			frameName: 'table',
			depth: 'furniture',
			collision: toMapRect(
				'guild-hall-common-table-collision',
				guildHallLayout.propCollisions.commonTableSeating
			)
		},
		{
			...toMapRect('guild-hall-master-desk', guildHallLayout.propZones.guildMasterStation),
			frameName: 'shopCounter',
			collision: {
				...toMapRect(
					'guild-hall-master-desk-collision',
					guildHallLayout.propCollisions.guildMasterDesk
				)
			}
		},
		{
			...toMapRect('guild-hall-training-equipment', guildHallLayout.propZones.trainingEquipment),
			frameName: 'weaponRack',
			collision: toMapRect(
				'guild-hall-training-equipment-collision',
				guildHallLayout.propCollisions.trainingEquipment
			)
		},
		{
			...toMapRect(
				'guild-hall-quartermaster-counter',
				guildHallLayout.propZones.quartermasterStation
			),
			frameName: 'shopCounter',
			collision: {
				...toMapRect(
					'guild-hall-quartermaster-counter-collision',
					guildHallLayout.propCollisions.quartermasterCounter
				)
			}
		},
		{
			...toMapRect('guild-hall-lobby-benches', guildHallLayout.propZones.lobbyNoticeBenches),
			frameName: 'bench'
		}
	],
	ambientNpcs: [
		{
			id: 'guild-hall-member-west',
			...guildHallLayout.ambientActivity['guild-hall-member-west'],
			frameName: 'quartermasterNpc',
			role: 'guild-member'
		},
		{
			id: 'guild-hall-member-east',
			...guildHallLayout.ambientActivity['guild-hall-member-east'],
			frameName: 'miraItemShopNpc',
			role: 'guild-member'
		}
	]
});

export const itemShopMap: WorldMapDefinition = addEnglishMapText({
	id: 'item-shop',
	width: itemShopLayout.widthTiles,
	height: itemShopLayout.heightTiles,
	spawnDirection: 'up',
	spawn: { ...itemShopLayout.spawn },
	navigationGrid: GENERATED_NAVIGATION_GRIDS['item-shop-navigation'],
	navigationGridOwnedSources: VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES,
	groundPatches: itemShopGroundPatches,
	blockers: itemShopBlockers,
	transitions: [
		{
			id: 'item-shop-to-meadow',
			...itemShopLayout.exit,
			toMapId: openingMapId,
			arrival: returnArrival('item-shop')
		}
	],
	npcs: [
		{
			id: 'shopkeeper-mira',
			...itemShopLayout.npcApproaches.mira.npc,
			nameKey: 'content.maps.npcs.shopkeeper-mira.name',
			dialogueId: 'shopkeeper-mira',
			role: 'shopkeeper',
			frameName: 'miraItemShopNpc',
			shopId: 'miras-item-shop'
		}
	],
	interiorProps: [
		{
			...toMapRect('item-shop-counter', itemShopLayout.propZones.counter),
			frameName: 'shopCounter',
			collision: {
				...toMapRect('item-shop-counter-collision', itemShopLayout.propCollisions.miraCounter)
			}
		},
		{
			...toMapRect('item-shop-west-display', itemShopLayout.propZones.westDisplay),
			frameName: 'displayShelf',
			collision: toMapRect(
				'item-shop-west-display-collision',
				itemShopLayout.propCollisions.westDisplay
			)
		},
		{
			...toMapRect('item-shop-east-display', itemShopLayout.propZones.eastDisplay),
			frameName: 'displayShelf',
			collision: toMapRect(
				'item-shop-east-display-collision',
				itemShopLayout.propCollisions.eastDisplay
			)
		},
		{
			...toMapRect('item-shop-stock-shelves', itemShopLayout.propZones.stockShelves),
			frameName: 'bookshelf',
			collision: toMapRect(
				'item-shop-stock-shelves-collision',
				itemShopLayout.propCollisions.stockShelves
			)
		},
		{
			...toMapRect('item-shop-office-desk', itemShopLayout.propZones.officeDesk),
			frameName: 'table',
			collision: toMapRect(
				'item-shop-office-desk-collision',
				itemShopLayout.propCollisions.officeDesk
			)
		}
	],
	ambientNpcs: [
		{
			id: 'item-shop-customer',
			...itemShopLayout.ambientActivity['item-shop-customer'],
			frameName: 'guildMasterNpc',
			role: 'shopper'
		}
	]
});

export const villagerHouse1Map: WorldMapDefinition = addEnglishMapText({
	id: 'villager-house-1',
	width: villagerHouse1Layout.widthTiles,
	height: villagerHouse1Layout.heightTiles,
	spawnDirection: 'up',
	spawn: { ...villagerHouse1Layout.spawn },
	groundPatches: villagerHouse1GroundPatches,
	blockers: villagerHouse1Blockers,
	transitions: [
		{
			id: 'villager-house-1-to-meadow',
			...villagerHouse1Layout.exit,
			toMapId: openingMapId,
			arrival: returnArrival('villager-house-1')
		}
	],
	interiorProps: [
		{
			...toMapRect('villager-house-1-bed', villagerHouse1Layout.propZones.bed),
			frameName: 'bed'
		},
		{
			...toMapRect('villager-house-1-family-table', villagerHouse1Layout.propZones.familyTable),
			frameName: 'table'
		},
		{
			...toMapRect('villager-house-1-kitchen', villagerHouse1Layout.propZones.kitchen),
			frameName: 'crateStack'
		},
		{
			...toMapRect('villager-house-1-storage', villagerHouse1Layout.propZones.storage),
			frameName: 'bookshelf'
		}
	],
	npcs: [
		{
			id: 'villager-lynn',
			...villagerHouse1Layout.npcApproaches.lynn.npc,
			nameKey: 'content.maps.npcs.villager-lynn.name',
			dialogueId: 'villager-lynn',
			role: 'villager',
			frameName: 'miraItemShopNpc'
		}
	],
	ambientNpcs: [
		{ id: 'villager-house-1-family', x: 480, y: 416, frameName: 'miraItemShopNpc', role: 'family' }
	]
});

export const villagerHouse2Map: WorldMapDefinition = addEnglishMapText({
	id: 'villager-house-2',
	width: villagerHouse2Layout.widthTiles,
	height: villagerHouse2Layout.heightTiles,
	spawnDirection: 'up',
	spawn: { ...villagerHouse2Layout.spawn },
	groundPatches: villagerHouse2GroundPatches,
	blockers: villagerHouse2Blockers,
	transitions: [
		{
			id: 'villager-house-2-to-meadow',
			...villagerHouse2Layout.exit,
			toMapId: openingMapId,
			arrival: returnArrival('villager-house-2')
		}
	],
	interiorProps: [
		{
			...toMapRect('villager-house-2-workbench', villagerHouse2Layout.propZones.workbench),
			frameName: 'table',
			collision: {
				...toMapRect(
					'villager-house-2-workbench-collision',
					villagerHouse2Layout.propCollisions.tomaWorkbench
				)
			}
		},
		{
			...toMapRect(
				'villager-house-2-workshop-storage',
				villagerHouse2Layout.propZones.workshopStorage
			),
			frameName: 'crateStack'
		},
		{
			...toMapRect('villager-house-2-bedroom', villagerHouse2Layout.propZones.bedroom),
			frameName: 'bed'
		},
		{
			...toMapRect('villager-house-2-living-table', villagerHouse2Layout.propZones.livingTable),
			frameName: 'table'
		}
	],
	npcs: [
		{
			id: 'villager-toma',
			...villagerHouse2Layout.npcApproaches.toma.npc,
			nameKey: 'content.maps.npcs.villager-toma.name',
			dialogueId: 'villager-toma',
			role: 'villager',
			frameName: 'quartermasterNpc'
		}
	],
	ambientNpcs: [
		{
			id: 'villager-house-2-neighbor',
			x: 512,
			y: 416,
			frameName: 'guildMasterNpc',
			role: 'neighbor'
		}
	]
});

export const villagerHouse3Map: WorldMapDefinition = addEnglishMapText({
	id: 'villager-house-3',
	width: villagerHouse3Layout.widthTiles,
	height: villagerHouse3Layout.heightTiles,
	spawnDirection: 'up',
	spawn: { ...villagerHouse3Layout.spawn },
	groundPatches: villagerHouse3GroundPatches,
	blockers: villagerHouse3Blockers,
	transitions: [
		{
			id: 'villager-house-3-to-meadow',
			...villagerHouse3Layout.exit,
			toMapId: openingMapId,
			arrival: returnArrival('villager-house-3')
		}
	],
	interiorProps: [
		{
			...toMapRect(
				'villager-house-3-west-archive-shelves',
				villagerHouse3Layout.propZones.westArchiveShelves
			),
			frameName: 'bookshelf',
			collision: {
				...toMapRect(
					'villager-house-3-west-archive-shelves-collision',
					villagerHouse3Layout.propCollisions.ioWestArchiveShelves
				)
			}
		},
		{
			...toMapRect('villager-house-3-reading-table', villagerHouse3Layout.propZones.readingTable),
			frameName: 'table'
		},
		{
			...toMapRect('villager-house-3-bedroom', villagerHouse3Layout.propZones.bedroom),
			frameName: 'bed'
		},
		{
			...toMapRect('villager-house-3-sitting', villagerHouse3Layout.propZones.sitting),
			frameName: 'rug'
		}
	],
	npcs: [
		{
			id: 'villager-io',
			...villagerHouse3Layout.npcApproaches.io.npc,
			nameKey: 'content.maps.npcs.villager-io.name',
			dialogueId: 'villager-io',
			role: 'villager',
			frameName: 'guildMasterNpc'
		}
	],
	ambientNpcs: [
		{
			id: 'villager-house-3-neighbor',
			x: 480,
			y: 480,
			frameName: 'quartermasterNpc',
			role: 'neighbor'
		}
	]
});

export const shrineOfAuroraInteriorMap: WorldMapDefinition = {
	id: 'shrine-of-aurora-interior',
	width: shrineOfAuroraLayout.widthTiles,
	height: shrineOfAuroraLayout.heightTiles,
	spawnDirection: 'up',
	spawn: { ...shrineOfAuroraLayout.spawn },
	groundPatches: shrineOfAuroraGroundPatches,
	blockers: shrineOfAuroraBlockers,
	transitions: [
		{
			id: 'shrine-of-aurora-to-meadow',
			...shrineOfAuroraLayout.exit,
			toMapId: openingMapId,
			arrival: returnArrival('shrine-of-aurora-interior')
		}
	],
	interiorProps: [
		{
			...toMapRect('shrine-of-aurora-altar', shrineOfAuroraLayout.propZones.altar),
			frameName: 'table'
		},
		{
			...toMapRect('shrine-of-aurora-nave-benches', shrineOfAuroraLayout.propZones.naveBenches),
			frameName: 'bench'
		},
		{
			...toMapRect('shrine-of-aurora-preparation', shrineOfAuroraLayout.propZones.preparation),
			frameName: 'crateStack'
		},
		{
			...toMapRect('shrine-of-aurora-archive', shrineOfAuroraLayout.propZones.archive),
			frameName: 'bookshelf'
		},
		{
			...toMapRect('shrine-of-aurora-entrance-lamps', shrineOfAuroraLayout.propZones.entranceLamps),
			frameName: 'hearthLamp'
		}
	]
};

export const ruinsThresholdMap: WorldMapDefinition = {
	id: 'ruins-threshold',
	width: 200,
	height: 200,
	spawnDirection: 'right',
	spawn: { x: 512, y: 3_200 },
	transitions: [
		{
			id: 'threshold-to-meadow',
			x: 256,
			y: 3_200,
			toMapId: openingMapId,
			requiresClear: true,
			marker: 'stair',
			arrival: { x: 5_760, y: 1_868, facing: 'left' }
		},
		{
			id: 'threshold-to-core',
			x: 5_888,
			y: 3_200,
			toMapId: 'ruins-core',
			requiresClear: true,
			marker: 'stair',
			arrival: { x: 512, y: 3_200, facing: 'right' }
		}
	],
	groundPatches: [
		{
			id: 'threshold-main-loop-west',
			x: 1_600,
			y: 3_200,
			width: 2_176,
			height: 192,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'threshold-main-loop-east',
			x: 4_224,
			y: 3_200,
			width: 2_560,
			height: 192,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'threshold-north-branch',
			x: 2_240,
			y: 2_048,
			width: 192,
			height: 1_920,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'threshold-south-branch',
			x: 3_584,
			y: 4_352,
			width: 192,
			height: 1_920,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'threshold-north-room',
			x: 1_728,
			y: 2_048,
			width: 832,
			height: 640,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'threshold-south-room',
			x: 3_584,
			y: 4_608,
			width: 960,
			height: 672,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'threshold-east-room',
			x: 4_864,
			y: 3_008,
			width: 832,
			height: 640,
			tile: 'ruinsFloorTile'
		}
	],
	blockers: [
		{
			id: 'threshold-north-wall',
			x: 3_200,
			y: 1_184,
			width: 5_120,
			height: 128,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-south-wall',
			x: 3_200,
			y: 5_216,
			width: 5_120,
			height: 128,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-west-wall-north',
			x: 768,
			y: 2_080,
			width: 128,
			height: 1_600,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-west-wall-south',
			x: 768,
			y: 4_320,
			width: 128,
			height: 1_600,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-east-wall-north',
			x: 5_632,
			y: 2_080,
			width: 128,
			height: 1_600,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-east-wall-south',
			x: 5_632,
			y: 4_320,
			width: 128,
			height: 1_600,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-loop-divider-north',
			x: 3_040,
			y: 2_368,
			width: 128,
			height: 1_536,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-loop-divider-south',
			x: 2_912,
			y: 4_032,
			width: 128,
			height: 1_280,
			kind: 'ruin-wall'
		},
		{
			id: 'threshold-future-gate-north',
			x: 2_240,
			y: 2_816,
			width: 256,
			height: 96,
			kind: 'future-gate',
			label: 'Future north switch gate'
		},
		{
			id: 'threshold-future-gate-east',
			x: 4_864,
			y: 2_816,
			width: 320,
			height: 96,
			kind: 'future-gate',
			label: 'Future east gate'
		}
	],
	pickups: [
		{ id: 'ruins-threshold-cap', x: 1_728, y: 2_112, itemId: 'iron-cap', quantity: 1 },
		{ id: 'ruins-threshold-rune', x: 3_584, y: 4_384, itemId: 'threshold-rune', quantity: 1 },
		{ id: 'ruins-threshold-salve', x: 2_048, y: 4_800, itemId: 'sunleaf-salve', quantity: 2 }
	],
	encounters: [
		{ id: 'threshold-slime-west', x: 2_304, y: 3_200, enemyId: 'slime-scout' },
		{ id: 'threshold-slime-east', x: 4_096, y: 3_008, enemyId: 'slime-scout' }
	]
};

export const ruinsCoreMap: WorldMapDefinition = {
	id: 'ruins-core',
	width: 200,
	height: 200,
	spawnDirection: 'right',
	spawn: { x: 512, y: 3_200 },
	transitions: [
		{
			id: 'core-to-threshold',
			x: 256,
			y: 3_200,
			toMapId: 'ruins-threshold',
			requiresClear: true,
			marker: 'stair',
			arrival: { x: 5_504, y: 3_200, facing: 'left' }
		}
	],
	groundPatches: [
		{
			id: 'core-main-approach',
			x: 2_368,
			y: 3_200,
			width: 3_648,
			height: 192,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'core-north-side-room',
			x: 2_240,
			y: 2_048,
			width: 896,
			height: 704,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'core-south-side-room',
			x: 3_584,
			y: 4_544,
			width: 1_024,
			height: 704,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'core-boss-chamber',
			x: 4_992,
			y: 3_200,
			width: 1_024,
			height: 960,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'core-north-connector',
			x: 2_240,
			y: 2_624,
			width: 192,
			height: 1_280,
			tile: 'ruinsFloorTile'
		},
		{
			id: 'core-south-connector',
			x: 3_584,
			y: 3_872,
			width: 192,
			height: 1_344,
			tile: 'ruinsFloorTile'
		}
	],
	blockers: [
		{
			id: 'core-north-wall',
			x: 3_200,
			y: 1_184,
			width: 5_120,
			height: 128,
			kind: 'ruin-wall'
		},
		{
			id: 'core-south-wall',
			x: 3_200,
			y: 5_216,
			width: 5_120,
			height: 128,
			kind: 'ruin-wall'
		},
		{
			id: 'core-west-wall-north',
			x: 768,
			y: 2_080,
			width: 128,
			height: 1_600,
			kind: 'ruin-wall'
		},
		{
			id: 'core-west-wall-south',
			x: 768,
			y: 4_320,
			width: 128,
			height: 1_600,
			kind: 'ruin-wall'
		},
		{
			id: 'core-east-wall',
			x: 5_760,
			y: 3_200,
			width: 128,
			height: 3_840,
			kind: 'ruin-wall'
		},
		{
			id: 'core-boss-approach-north',
			x: 4_352,
			y: 2_432,
			width: 128,
			height: 896,
			kind: 'ruin-wall'
		},
		{
			id: 'core-boss-approach-south',
			x: 4_352,
			y: 3_968,
			width: 128,
			height: 896,
			kind: 'ruin-wall'
		},
		{
			id: 'core-future-gate-boss',
			x: 4_608,
			y: 2_816,
			width: 96,
			height: 256,
			kind: 'future-gate',
			label: 'Future boss gate'
		},
		{
			id: 'core-future-gate-south',
			x: 3_584,
			y: 3_936,
			width: 256,
			height: 96,
			kind: 'future-gate',
			label: 'Future south chamber gate'
		}
	],
	pickups: [
		{ id: 'ruins-core-mail', x: 2_240, y: 2_048, itemId: 'stone-mail', quantity: 1 },
		{ id: 'ruins-core-draught', x: 3_584, y: 4_544, itemId: 'ruin-draught', quantity: 1 }
	],
	encounters: [
		{ id: 'ruins-warden', x: 4_992, y: 3_200, enemyId: 'ruins-warden', completion: 'victory' }
	]
};

export const maps: DefinitionRegistry<WorldMapDefinition> = {
	[meadowEntryMap.id]: meadowEntryMap,
	[heroHouseMap.id]: heroHouseMap,
	[guildHallMap.id]: guildHallMap,
	[itemShopMap.id]: itemShopMap,
	[villagerHouse1Map.id]: villagerHouse1Map,
	[villagerHouse2Map.id]: villagerHouse2Map,
	[villagerHouse3Map.id]: villagerHouse3Map,
	[shrineOfAuroraInteriorMap.id]: shrineOfAuroraInteriorMap,
	[ruinsThresholdMap.id]: ruinsThresholdMap,
	[ruinsCoreMap.id]: ruinsCoreMap
};
