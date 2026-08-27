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

const shrineOfAuroraWalls: readonly NamedLayoutRect[] = [
	namedRect('shrine-of-aurora-wall-north', 0, 0, 768, 64),
	namedRect('shrine-of-aurora-wall-west', 0, 64, 64, 608),
	namedRect('shrine-of-aurora-wall-east', 704, 64, 64, 608),
	namedRect('shrine-of-aurora-wall-south-west', 0, 672, 352, 32),
	namedRect('shrine-of-aurora-wall-south-east', 416, 672, 352, 32),
	namedRect('shrine-of-aurora-west-upper-service', 64, 64, 160, 160),
	namedRect('shrine-of-aurora-east-upper-service', 544, 64, 160, 160),
	namedRect('shrine-of-aurora-west-mid-service-pocket', 64, 224, 160, 32),
	namedRect('shrine-of-aurora-east-mid-service-pocket', 544, 224, 160, 32),
	namedRect('shrine-of-aurora-sanctum-opening-west', 224, 224, 96, 32),
	namedRect('shrine-of-aurora-sanctum-opening-east', 448, 224, 96, 32),
	namedRect('shrine-of-aurora-west-room-opening-north', 192, 256, 32, 96),
	namedRect('shrine-of-aurora-west-room-opening-south', 192, 448, 32, 64),
	namedRect('shrine-of-aurora-east-room-opening-north', 544, 256, 32, 96),
	namedRect('shrine-of-aurora-east-room-opening-south', 544, 448, 32, 64),
	namedRect('shrine-of-aurora-west-lower-service', 64, 512, 160, 64),
	namedRect('shrine-of-aurora-east-lower-service', 544, 512, 160, 64),
	namedRect('shrine-of-aurora-west-entrance-service-pocket', 64, 576, 192, 96),
	namedRect('shrine-of-aurora-east-entrance-service-pocket', 512, 576, 192, 96),
	namedRect('shrine-of-aurora-nave-entrance-divider-west', 224, 544, 96, 32),
	namedRect('shrine-of-aurora-nave-entrance-divider-east', 448, 544, 96, 32)
];

const villagerHouse1Walls: readonly NamedLayoutRect[] = [
	namedRect('villager-house-1-wall-north', 0, 0, 640, 64),
	namedRect('villager-house-1-wall-west', 0, 64, 64, 480),
	namedRect('villager-house-1-wall-east', 576, 64, 64, 480),
	namedRect('villager-house-1-wall-south-west', 0, 544, 288, 32),
	namedRect('villager-house-1-wall-south-east', 352, 544, 288, 32),
	namedRect('villager-house-1-bedroom-divider-north', 256, 64, 32, 64),
	namedRect('villager-house-1-bedroom-divider-south', 256, 192, 32, 64),
	namedRect('villager-house-1-storage-divider-north', 384, 64, 32, 64),
	namedRect('villager-house-1-storage-divider-south', 384, 192, 32, 64),
	namedRect('villager-house-1-hall-living-divider-west', 64, 256, 224, 32),
	namedRect('villager-house-1-hall-living-divider-east', 384, 256, 192, 32)
];

const villagerHouse2Walls: readonly NamedLayoutRect[] = [
	namedRect('villager-house-2-wall-north', 0, 0, 704, 64),
	namedRect('villager-house-2-wall-west', 0, 64, 64, 480),
	namedRect('villager-house-2-wall-east', 640, 64, 64, 480),
	namedRect('villager-house-2-wall-south-west', 0, 544, 320, 32),
	namedRect('villager-house-2-wall-south-east', 384, 544, 320, 32),
	namedRect('villager-house-2-workshop-divider-north', 320, 64, 32, 64),
	namedRect('villager-house-2-workshop-divider-south', 320, 224, 32, 64),
	namedRect('villager-house-2-bedroom-divider-north', 448, 64, 32, 64),
	namedRect('villager-house-2-bedroom-divider-south', 448, 224, 32, 64),
	namedRect('villager-house-2-hall-living-divider-west', 64, 288, 288, 32),
	namedRect('villager-house-2-hall-living-divider-east', 448, 288, 192, 32)
];

const villagerHouse3Walls: readonly NamedLayoutRect[] = [
	namedRect('villager-house-3-wall-north', 0, 0, 640, 64),
	namedRect('villager-house-3-wall-west', 0, 64, 64, 544),
	namedRect('villager-house-3-wall-east', 576, 64, 64, 544),
	namedRect('villager-house-3-wall-south-west', 0, 608, 288, 32),
	namedRect('villager-house-3-wall-south-east', 352, 608, 288, 32),
	namedRect('villager-house-3-archive-divider-north', 256, 64, 32, 64),
	namedRect('villager-house-3-archive-divider-south', 256, 224, 32, 96),
	namedRect('villager-house-3-bedroom-divider-north', 384, 64, 32, 64),
	namedRect('villager-house-3-bedroom-divider-south', 384, 224, 32, 96),
	namedRect('villager-house-3-hall-sitting-divider-west', 64, 320, 224, 32),
	namedRect('villager-house-3-hall-sitting-divider-east', 384, 320, 192, 32)
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
			serviceCorridor: rect(352, 64, 128, 192)
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
		propZones: {
			counter: rect(224, 312, 384, 40),
			westDisplay: rect(96, 384, 96, 128),
			eastDisplay: rect(640, 384, 96, 128),
			stockShelves: rect(96, 96, 192, 96),
			officeDesk: rect(560, 96, 160, 96)
		},
		propCollisions: {
			miraCounter: rect(224, 336, 384, 8)
		}
	},
	'shrine-of-aurora-interior': {
		widthTiles: 24,
		heightTiles: 22,
		fullFloor: rect(0, 0, 768, 704),
		rooms: {
			innerSanctum: rect(224, 64, 320, 160),
			westPreparation: rect(64, 256, 128, 256),
			eastArchive: rect(576, 256, 128, 256)
		},
		corridors: {
			nave: rect(224, 256, 320, 288),
			entranceHall: rect(256, 576, 256, 96)
		},
		doors: {
			sanctumOpening: rect(320, 224, 128, 32),
			westRoomOpening: rect(192, 352, 32, 96),
			eastRoomOpening: rect(544, 352, 32, 96),
			naveToEntrance: rect(320, 544, 128, 32),
			exterior: rect(352, 672, 64, 32)
		},
		walls: shrineOfAuroraWalls,
		spawn: point(384, 608),
		exit: point(384, 688),
		npcApproaches: {},
		propZones: {
			altar: rect(288, 96, 192, 96),
			naveBenches: rect(256, 352, 256, 128),
			preparation: rect(80, 320, 96, 128),
			archive: rect(592, 288, 96, 160),
			entranceLamps: rect(288, 592, 192, 64)
		},
		propCollisions: {}
	},
	'villager-house-1': {
		widthTiles: 20,
		heightTiles: 18,
		fullFloor: rect(0, 0, 640, 576),
		rooms: {
			bedroom: rect(64, 64, 192, 192),
			storage: rect(416, 64, 160, 192),
			livingKitchen: rect(64, 288, 512, 256)
		},
		corridors: {
			hall: rect(288, 64, 96, 224)
		},
		doors: {
			bedroom: rect(256, 128, 32, 64),
			storage: rect(384, 128, 32, 64),
			hallToLiving: rect(288, 256, 96, 32),
			exterior: rect(288, 544, 64, 32)
		},
		walls: villagerHouse1Walls,
		spawn: point(320, 480),
		exit: point(320, 560),
		npcApproaches: {
			lynn: { npc: point(160, 416), approach: point(200, 416) }
		},
		propZones: {
			bed: rect(80, 96, 144, 96),
			familyTable: rect(224, 352, 192, 96),
			kitchen: rect(448, 320, 96, 128),
			storage: rect(432, 96, 112, 128)
		},
		propCollisions: {}
	},
	'villager-house-2': {
		widthTiles: 22,
		heightTiles: 18,
		fullFloor: rect(0, 0, 704, 576),
		rooms: {
			workshop: rect(64, 64, 256, 224),
			bedroom: rect(480, 64, 160, 224),
			livingArea: rect(64, 320, 576, 224)
		},
		corridors: {
			hall: rect(352, 64, 96, 256)
		},
		doors: {
			workshop: rect(320, 128, 32, 96),
			bedroom: rect(448, 128, 32, 96),
			hallToLiving: rect(352, 288, 96, 32),
			exterior: rect(320, 544, 64, 32)
		},
		walls: villagerHouse2Walls,
		spawn: point(352, 480),
		exit: point(352, 560),
		npcApproaches: {
			toma: { npc: point(192, 192), approach: point(232, 192) }
		},
		propZones: {
			workbench: rect(96, 96, 192, 64),
			workshopStorage: rect(96, 224, 192, 48),
			bedroom: rect(496, 96, 128, 160),
			livingTable: rect(224, 384, 192, 96)
		},
		propCollisions: {
			tomaWorkbench: rect(112, 128, 160, 32)
		}
	},
	'villager-house-3': {
		widthTiles: 20,
		heightTiles: 20,
		fullFloor: rect(0, 0, 640, 640),
		rooms: {
			archiveStudy: rect(64, 64, 192, 256),
			bedroomStorage: rect(416, 64, 160, 256),
			sittingRoom: rect(64, 352, 512, 256)
		},
		corridors: {
			hall: rect(288, 64, 96, 288)
		},
		doors: {
			archive: rect(256, 128, 32, 96),
			bedroom: rect(384, 128, 32, 96),
			hallToSitting: rect(288, 320, 96, 32),
			exterior: rect(288, 608, 64, 32)
		},
		walls: villagerHouse3Walls,
		spawn: point(320, 544),
		exit: point(320, 624),
		npcApproaches: {
			io: { npc: point(160, 192), approach: point(200, 192) }
		},
		propZones: {
			westArchiveShelves: rect(80, 96, 48, 192),
			readingTable: rect(96, 384, 160, 96),
			bedroom: rect(432, 96, 112, 160),
			sitting: rect(320, 416, 192, 128)
		},
		propCollisions: {
			ioWestArchiveShelves: rect(80, 96, 48, 192)
		}
	}
} as const satisfies Readonly<Record<string, VillageInteriorLayout>>;
