import {
	namedRect,
	point,
	rect,
	type LayoutPoint,
	type LayoutRect,
	type NamedLayoutRect
} from './layout-rects';

export interface VillageInteriorLayout {
	readonly widthTiles: number;
	readonly heightTiles: number;
	readonly fullFloor: LayoutRect;
	readonly rooms: Readonly<Record<string, LayoutRect>>;
	readonly corridors: Readonly<Record<string, LayoutRect>>;
	readonly doors: Readonly<Record<string, LayoutRect>>;
	readonly walls: readonly NamedLayoutRect[];
	readonly spawn: LayoutPoint;
	readonly exit: LayoutPoint;
	readonly npcApproaches: Readonly<
		Record<string, { readonly npc: LayoutPoint; readonly approach: LayoutPoint }>
	>;
	readonly ambientActivity?: Readonly<Record<string, LayoutPoint>>;
	readonly propZones: Readonly<Record<string, LayoutRect>>;
	readonly propCollisions: Readonly<Record<string, LayoutRect>>;
}

const guildHallWalls: readonly NamedLayoutRect[] = [
	namedRect('guild-hall-wall-north', 0, 0, 1024, 64),
	namedRect('guild-hall-wall-west', 0, 64, 64, 736),
	namedRect('guild-hall-wall-east', 960, 64, 64, 736),
	namedRect('guild-hall-wall-south-west', 0, 800, 480, 32),
	namedRect('guild-hall-wall-south-east', 544, 800, 480, 32),
	namedRect('guild-hall-records-spine-north', 416, 64, 32, 80),
	namedRect('guild-hall-records-spine-south', 416, 240, 32, 80),
	namedRect('guild-hall-common-spine-north', 416, 352, 32, 96),
	namedRect('guild-hall-common-spine-south', 416, 544, 32, 96),
	namedRect('guild-hall-office-spine-north', 576, 64, 32, 48),
	namedRect('guild-hall-office-spine-south', 576, 208, 32, 48),
	namedRect('guild-hall-training-spine-north', 576, 288, 32, 32),
	namedRect('guild-hall-training-spine-south', 576, 416, 32, 32),
	namedRect('guild-hall-quartermaster-spine-north', 576, 480, 32, 32),
	namedRect('guild-hall-quartermaster-spine-south', 576, 608, 32, 32),
	namedRect('guild-hall-records-common-divider', 64, 320, 384, 32),
	namedRect('guild-hall-common-lobby-divider', 64, 640, 384, 32),
	namedRect('guild-hall-office-training-divider', 576, 256, 384, 32),
	namedRect('guild-hall-training-quartermaster-divider', 576, 448, 384, 32),
	namedRect('guild-hall-quartermaster-lobby-divider', 576, 640, 384, 32),
	namedRect('guild-hall-lobby-west-service', 64, 672, 288, 128),
	namedRect('guild-hall-lobby-east-service', 672, 672, 288, 128)
];

const heroHouseWalls: readonly NamedLayoutRect[] = [
	namedRect('hero-house-wall-north', 0, 0, 704, 64),
	namedRect('hero-house-wall-west', 0, 64, 64, 480),
	namedRect('hero-house-wall-east', 640, 64, 64, 480),
	namedRect('hero-house-wall-south-west', 0, 544, 320, 32),
	namedRect('hero-house-wall-south-east', 384, 544, 320, 32),
	namedRect('hero-house-bedroom-divider-north', 256, 64, 32, 64),
	namedRect('hero-house-bedroom-divider-south', 256, 192, 32, 64),
	namedRect('hero-house-study-divider-north', 416, 64, 32, 64),
	namedRect('hero-house-study-divider-south', 416, 192, 32, 64),
	namedRect('hero-house-hall-living-divider-west', 64, 256, 224, 32),
	namedRect('hero-house-hall-living-divider-east', 416, 256, 224, 32)
];

const itemShopWalls: readonly NamedLayoutRect[] = [
	namedRect('item-shop-wall-north', 0, 0, 832, 64),
	namedRect('item-shop-wall-west', 0, 64, 64, 544),
	namedRect('item-shop-wall-east', 768, 64, 64, 544),
	namedRect('item-shop-wall-south-west', 0, 608, 384, 32),
	namedRect('item-shop-wall-south-east', 448, 608, 384, 32),
	namedRect('item-shop-stockroom-divider-north', 320, 64, 32, 48),
	namedRect('item-shop-stockroom-divider-south', 320, 176, 32, 48),
	namedRect('item-shop-office-divider-north', 480, 64, 32, 48),
	namedRect('item-shop-office-divider-south', 480, 176, 32, 48),
	namedRect('item-shop-stockroom-sales-divider', 64, 224, 256, 32),
	namedRect('item-shop-office-sales-divider', 512, 224, 256, 32),
	namedRect('item-shop-service-west-lower-divider', 320, 224, 32, 32),
	namedRect('item-shop-service-east-lower-divider', 480, 224, 32, 32)
];

const blacksmithWalls: readonly NamedLayoutRect[] = [
	namedRect('blacksmith-wall-north', 0, 0, 896, 64),
	namedRect('blacksmith-wall-west', 0, 64, 64, 608),
	namedRect('blacksmith-wall-east', 832, 64, 64, 608),
	namedRect('blacksmith-wall-south-west', 0, 672, 384, 32),
	namedRect('blacksmith-wall-south-east', 512, 672, 384, 32),
	namedRect('blacksmith-forge-divider-north', 416, 64, 32, 96),
	namedRect('blacksmith-forge-divider-south', 416, 256, 32, 128),
	namedRect('blacksmith-armory-divider-north', 544, 64, 32, 96),
	namedRect('blacksmith-armory-divider-south', 544, 256, 32, 128),
	namedRect('blacksmith-showroom-divider-west', 64, 352, 384, 32),
	namedRect('blacksmith-showroom-divider-east', 544, 352, 288, 32)
];

const shrineOfAuroraWalls: readonly NamedLayoutRect[] = [
	namedRect('shrine-of-aurora-wall-north', 0, 0, 1024, 64),
	namedRect('shrine-of-aurora-wall-west', 0, 64, 64, 800),
	namedRect('shrine-of-aurora-wall-east', 960, 64, 64, 800),
	namedRect('shrine-of-aurora-wall-south-west', 0, 864, 448, 32),
	namedRect('shrine-of-aurora-wall-south-east', 576, 864, 448, 32),
	namedRect('shrine-of-aurora-sanctum-divider-west', 256, 288, 160, 32),
	namedRect('shrine-of-aurora-sanctum-divider-east', 608, 288, 160, 32),
	namedRect('shrine-of-aurora-west-room-divider-north', 256, 320, 64, 128),
	namedRect('shrine-of-aurora-west-room-divider-south', 256, 544, 64, 128),
	namedRect('shrine-of-aurora-east-room-divider-north', 704, 320, 64, 128),
	namedRect('shrine-of-aurora-east-room-divider-south', 704, 544, 64, 128),
	namedRect('shrine-of-aurora-nave-entrance-divider-west', 320, 672, 96, 32),
	namedRect('shrine-of-aurora-nave-entrance-divider-east', 608, 672, 96, 32)
];

const villagerHouse1Walls: readonly NamedLayoutRect[] = [
	namedRect('villager-house-1-wall-north', 0, 0, 1280, 64),
	namedRect('villager-house-1-wall-west', 0, 64, 64, 736),
	namedRect('villager-house-1-wall-east', 1216, 64, 64, 736),
	namedRect('villager-house-1-wall-south-west', 0, 800, 576, 32),
	namedRect('villager-house-1-wall-south-east', 704, 800, 576, 32),
	namedRect('villager-house-1-bedroom-divider-north', 416, 64, 32, 128),
	namedRect('villager-house-1-bedroom-divider-south', 416, 256, 32, 128),
	namedRect('villager-house-1-storage-divider-north', 832, 64, 32, 128),
	namedRect('villager-house-1-storage-divider-south', 832, 256, 32, 128),
	namedRect('villager-house-1-hall-living-divider-west', 64, 352, 384, 32),
	namedRect('villager-house-1-hall-living-divider-east', 832, 352, 384, 32)
];

const villagerHouse2Walls: readonly NamedLayoutRect[] = [
	namedRect('villager-house-2-wall-north', 0, 0, 1280, 64),
	namedRect('villager-house-2-wall-west', 0, 64, 64, 672),
	namedRect('villager-house-2-wall-east', 1216, 64, 64, 672),
	namedRect('villager-house-2-wall-south-west', 0, 736, 576, 32),
	namedRect('villager-house-2-wall-south-east', 704, 736, 576, 32),
	namedRect('villager-house-2-workshop-divider-north', 512, 64, 32, 128),
	namedRect('villager-house-2-workshop-divider-south', 512, 288, 32, 128),
	namedRect('villager-house-2-bedroom-divider-north', 736, 64, 32, 128),
	namedRect('villager-house-2-bedroom-divider-south', 736, 256, 32, 160),
	namedRect('villager-house-2-hall-living-divider-west', 64, 384, 480, 32),
	namedRect('villager-house-2-hall-living-divider-east', 736, 384, 480, 32)
];

const villagerHouse3Walls: readonly NamedLayoutRect[] = [
	namedRect('villager-house-3-wall-north', 0, 0, 1024, 64),
	namedRect('villager-house-3-wall-west', 0, 64, 64, 608),
	namedRect('villager-house-3-wall-east', 960, 64, 64, 608),
	namedRect('villager-house-3-wall-south-west', 0, 672, 448, 32),
	namedRect('villager-house-3-wall-south-east', 576, 672, 448, 32),
	namedRect('villager-house-3-archive-divider-north', 416, 64, 32, 96),
	namedRect('villager-house-3-archive-divider-south', 416, 256, 32, 96),
	namedRect('villager-house-3-bedroom-divider-north', 576, 64, 32, 96),
	namedRect('villager-house-3-bedroom-divider-south', 576, 256, 32, 96),
	namedRect('villager-house-3-sitting-divider-west', 64, 352, 384, 32),
	namedRect('villager-house-3-sitting-divider-east', 576, 352, 384, 32)
];

export const VILLAGE_INTERIOR_LAYOUTS = {
	'guild-hall': {
		widthTiles: 32,
		heightTiles: 26,
		fullFloor: rect(0, 0, 1024, 832),
		rooms: {
			recordsHall: rect(64, 64, 352, 256),
			commonHall: rect(64, 352, 352, 288),
			guildMasterOffice: rect(608, 64, 352, 192),
			trainingHall: rect(608, 288, 352, 160),
			quartermasterRoom: rect(608, 480, 352, 160)
		},
		corridors: {
			mainSpine: rect(448, 64, 128, 608),
			entranceLobby: rect(352, 672, 320, 128)
		},
		doors: {
			recordsToSpine: rect(416, 144, 32, 96),
			commonToSpine: rect(416, 448, 32, 96),
			masterToSpine: rect(576, 112, 32, 96),
			trainingToSpine: rect(576, 320, 32, 96),
			quartermasterToSpine: rect(576, 512, 32, 96),
			exterior: rect(480, 800, 64, 32)
		},
		walls: guildHallWalls,
		spawn: point(512, 736),
		exit: point(512, 816),
		npcApproaches: {
			guildMaster: { npc: point(800, 144), approach: point(800, 184) },
			quartermaster: { npc: point(816, 528), approach: point(816, 568) }
		},
		ambientActivity: {
			'guild-hall-member-west': point(160, 592),
			'guild-hall-member-east': point(912, 368)
		},
		propZones: {
			recordsShelves: rect(80, 80, 112, 176),
			questBoardRecordsDesk: rect(224, 80, 160, 96),
			commonTableSeating: rect(128, 416, 224, 128),
			guildMasterStation: rect(704, 96, 192, 72),
			trainingEquipment: rect(704, 320, 192, 96),
			quartermasterStation: rect(672, 512, 224, 48),
			lobbyNoticeBenches: rect(384, 704, 256, 64)
		},
		propCollisions: {
			recordsShelves: rect(80, 80, 112, 176),
			questBoardRecordsDesk: rect(240, 144, 128, 32),
			commonTableSeating: rect(176, 448, 128, 64),
			guildMasterDesk: rect(728, 160, 144, 8),
			trainingEquipment: rect(752, 368, 96, 32),
			quartermasterCounter: rect(696, 544, 176, 8)
		}
	},
	'hero-house': {
		widthTiles: 22,
		heightTiles: 18,
		fullFloor: rect(0, 0, 704, 576),
		rooms: {
			bedroom: rect(64, 64, 192, 192),
			study: rect(448, 64, 192, 192),
			livingKitchen: rect(64, 288, 576, 256)
		},
		corridors: {
			hall: rect(288, 64, 128, 224)
		},
		doors: {
			bedroom: rect(256, 128, 32, 64),
			study: rect(416, 128, 32, 64),
			hallToLiving: rect(288, 256, 128, 32),
			exterior: rect(320, 544, 64, 32)
		},
		walls: heroHouseWalls,
		spawn: point(352, 480),
		exit: point(352, 560),
		npcApproaches: {},
		propZones: {
			bed: rect(96, 96, 128, 96),
			studyStorage: rect(480, 96, 128, 128),
			livingTable: rect(224, 352, 160, 96),
			kitchenStorage: rect(480, 352, 128, 128)
		},
		propCollisions: {
			bed: rect(112, 112, 96, 96),
			studyStorage: rect(496, 112, 112, 96),
			livingTable: rect(224, 400, 112, 64),
			kitchenStorage: rect(464, 320, 160, 144)
		}
	},
	'item-shop': {
		widthTiles: 26,
		heightTiles: 20,
		fullFloor: rect(0, 0, 832, 640),
		rooms: {
			stockroom: rect(64, 64, 256, 160),
			office: rect(512, 64, 256, 160),
			salesFloor: rect(64, 256, 704, 352)
		},
		corridors: {
			serviceCorridor: rect(352, 64, 128, 192),
			entranceAisle: rect(320, 512, 192, 96)
		},
		doors: {
			stockroom: rect(320, 112, 32, 64),
			office: rect(480, 112, 32, 64),
			serviceToSales: rect(352, 224, 128, 32),
			exterior: rect(384, 608, 64, 32)
		},
		walls: itemShopWalls,
		spawn: point(416, 544),
		exit: point(416, 624),
		npcApproaches: {
			mira: { npc: point(416, 320), approach: point(416, 360) }
		},
		ambientActivity: {
			'item-shop-customer': point(256, 512)
		},
		propZones: {
			counter: rect(224, 288, 384, 64),
			westDisplay: rect(128, 384, 96, 128),
			eastDisplay: rect(608, 384, 96, 128),
			stockShelves: rect(96, 96, 192, 96),
			officeDesk: rect(544, 96, 192, 96)
		},
		propCollisions: {
			miraCounter: rect(224, 336, 384, 8),
			westDisplay: rect(144, 384, 64, 128),
			eastDisplay: rect(624, 384, 64, 128),
			stockShelves: rect(128, 112, 128, 48),
			officeDesk: rect(576, 112, 128, 48)
		}
	},
	'blacksmith-interior': {
		widthTiles: 28,
		heightTiles: 22,
		fullFloor: rect(0, 0, 896, 704),
		rooms: {
			forgeFloor: rect(64, 64, 352, 288),
			armoryDisplay: rect(576, 64, 256, 288),
			showroom: rect(64, 384, 768, 288)
		},
		corridors: {
			serviceSpine: rect(448, 64, 96, 320),
			entranceAisle: rect(384, 480, 128, 192)
		},
		doors: {
			forge: rect(416, 160, 32, 96),
			armory: rect(544, 160, 32, 96),
			hallToShowroom: rect(448, 352, 96, 32),
			exterior: rect(384, 672, 128, 32)
		},
		walls: blacksmithWalls,
		spawn: point(448, 576),
		exit: point(448, 688),
		npcApproaches: { oren: { npc: point(448, 416), approach: point(448, 480) } },
		propZones: {
			forge: rect(96, 96, 128, 160),
			anvil: rect(272, 160, 96, 96),
			serviceCounter: rect(256, 400, 384, 96),
			weaponRacks: rect(608, 96, 160, 192),
			coalStorage: rect(96, 288, 224, 64),
			showroomDisplay: rect(640, 480, 128, 128)
		},
		propCollisions: {
			forge: rect(112, 112, 96, 128),
			anvil: rect(288, 176, 64, 64),
			serviceCounter: rect(284, 440, 324, 18),
			weaponRacks: rect(624, 112, 128, 160),
			coalStorage: rect(112, 304, 192, 32),
			showroomDisplay: rect(656, 496, 112, 96)
		}
	},
	'shrine-of-aurora-interior': {
		widthTiles: 32,
		heightTiles: 28,
		fullFloor: rect(0, 0, 1024, 896),
		rooms: {
			innerSanctum: rect(256, 64, 512, 224),
			westPreparation: rect(64, 320, 192, 352),
			eastArchive: rect(768, 320, 192, 352)
		},
		corridors: {
			nave: rect(320, 320, 384, 352),
			entranceHall: rect(320, 704, 384, 160)
		},
		doors: {
			sanctumOpening: rect(416, 288, 192, 32),
			westRoomOpening: rect(256, 448, 64, 96),
			eastRoomOpening: rect(704, 448, 64, 96),
			naveToEntrance: rect(416, 672, 192, 32),
			exterior: rect(448, 864, 128, 32)
		},
		walls: shrineOfAuroraWalls,
		spawn: point(512, 784),
		exit: point(512, 880),
		npcApproaches: {},
		propZones: {
			altar: rect(384, 96, 256, 128),
			luminousFocal: rect(448, 224, 128, 64),
			westBenches: rect(352, 384, 96, 224),
			eastBenches: rect(576, 384, 96, 224),
			preparation: rect(96, 384, 128, 192),
			archive: rect(800, 352, 128, 256),
			entranceLamps: rect(384, 736, 256, 96)
		},
		propCollisions: {
			altar: rect(416, 128, 192, 64),
			westBenches: rect(368, 400, 64, 192),
			eastBenches: rect(592, 400, 64, 192),
			preparation: rect(112, 400, 96, 160),
			archive: rect(816, 368, 96, 224)
		}
	},
	'villager-house-1': {
		widthTiles: 40,
		heightTiles: 26,
		fullFloor: rect(0, 0, 1280, 832),
		rooms: {
			bedroom: rect(128, 96, 288, 256),
			storage: rect(864, 96, 288, 256),
			livingKitchen: rect(128, 384, 1024, 416)
		},
		corridors: {
			hall: rect(448, 96, 384, 288)
		},
		doors: {
			bedroom: rect(416, 192, 32, 64),
			storage: rect(832, 192, 32, 64),
			hallToLiving: rect(448, 352, 384, 32),
			exterior: rect(576, 800, 128, 32)
		},
		walls: villagerHouse1Walls,
		spawn: point(640, 672),
		exit: point(640, 816),
		npcApproaches: {
			lynn: { npc: point(480, 544), approach: point(528, 544) }
		},
		ambientActivity: {
			'villager-house-1-family': point(800, 544)
		},
		propZones: {
			bed: rect(160, 128, 192, 128),
			familyTable: rect(160, 480, 256, 128),
			kitchen: rect(896, 448, 192, 192),
			storage: rect(928, 128, 192, 128)
		},
		propCollisions: {
			bed: rect(192, 128, 128, 64),
			familyTable: rect(192, 512, 192, 64),
			kitchen: rect(928, 480, 128, 128),
			storage: rect(960, 128, 128, 64)
		}
	},
	'villager-house-2': {
		widthTiles: 40,
		heightTiles: 24,
		fullFloor: rect(0, 0, 1280, 768),
		rooms: {
			workshop: rect(128, 96, 384, 288),
			bedroom: rect(768, 96, 384, 288),
			livingArea: rect(128, 416, 1024, 320)
		},
		corridors: {
			hall: rect(544, 96, 192, 288)
		},
		doors: {
			workshop: rect(512, 192, 32, 96),
			bedroom: rect(736, 192, 32, 64),
			hallToLiving: rect(544, 384, 192, 32),
			exterior: rect(576, 736, 128, 32)
		},
		walls: villagerHouse2Walls,
		spawn: point(640, 608),
		exit: point(640, 752),
		npcApproaches: {
			toma: { npc: point(368, 224), approach: point(408, 224) }
		},
		ambientActivity: {
			'villager-house-2-neighbor': point(960, 544)
		},
		propZones: {
			workbench: rect(160, 128, 192, 96),
			workshopStorage: rect(160, 288, 288, 64),
			bedroom: rect(832, 128, 224, 192),
			livingTable: rect(256, 512, 256, 128)
		},
		propCollisions: {
			tomaWorkbench: rect(176, 160, 160, 48),
			workshopStorage: rect(176, 304, 256, 32),
			bedroom: rect(864, 160, 128, 128),
			livingTable: rect(288, 544, 192, 64)
		}
	},
	'villager-house-3': {
		widthTiles: 32,
		heightTiles: 22,
		fullFloor: rect(0, 0, 1024, 704),
		rooms: {
			archiveStudy: rect(64, 64, 352, 288),
			bedroomStorage: rect(608, 64, 352, 288),
			sittingRoom: rect(64, 384, 896, 288)
		},
		corridors: {
			hall: rect(448, 64, 128, 320)
		},
		doors: {
			archive: rect(416, 160, 32, 96),
			bedroom: rect(576, 160, 32, 96),
			hallToSitting: rect(448, 352, 128, 32),
			exterior: rect(448, 672, 128, 32)
		},
		walls: villagerHouse3Walls,
		spawn: point(512, 576),
		exit: point(512, 688),
		npcApproaches: {
			io: { npc: point(256, 224), approach: point(304, 224) }
		},
		ambientActivity: {
			'villager-house-3-neighbor': point(768, 544)
		},
		propZones: {
			westArchiveShelves: rect(96, 96, 128, 192),
			readingTable: rect(256, 416, 224, 128),
			bedroom: rect(672, 96, 160, 160),
			travelStorage: rect(832, 96, 96, 192),
			sitting: rect(608, 448, 224, 128)
		},
		propCollisions: {
			ioWestArchiveShelves: rect(112, 112, 96, 160),
			readingTable: rect(288, 448, 160, 64),
			bedroom: rect(688, 112, 128, 128),
			travelStorage: rect(848, 112, 64, 160),
			sitting: rect(640, 480, 160, 64)
		}
	}
} as const satisfies Readonly<Record<string, VillageInteriorLayout>>;
