export type VillagePoint = { x: number; y: number };

export type VillageRoomId =
	| 'village-home-yard-room'
	| 'village-well-plaza-room'
	| 'village-market-yard-room'
	| 'village-north-residences-room'
	| 'village-shrine-garden-room'
	| 'village-east-gate-room';

export type VillageRoomDefinition = {
	id: VillageRoomId;
	center: VillagePoint;
	radius: number;
};

export const villageRooms: readonly VillageRoomDefinition[] = [
	{ id: 'village-home-yard-room', center: { x: 700, y: 5_585 }, radius: 260 },
	{ id: 'village-well-plaza-room', center: { x: 1_000, y: 5_160 }, radius: 320 },
	{ id: 'village-market-yard-room', center: { x: 650, y: 5_045 }, radius: 320 },
	{ id: 'village-north-residences-room', center: { x: 1_050, y: 4_860 }, radius: 420 },
	{ id: 'village-shrine-garden-room', center: { x: 1_200, y: 5_660 }, radius: 340 },
	{ id: 'village-east-gate-room', center: { x: 1_660, y: 4_430 }, radius: 260 }
];

export type VillageCorridorId =
	| 'village-home-to-plaza'
	| 'village-plaza-to-market'
	| 'village-plaza-to-north-residences'
	| 'village-plaza-to-shrine'
	| 'village-plaza-to-east-gate'
	| 'village-east-gate-to-crossroads-road';

export type VillageCorridorEndpointId = VillageRoomId | 'crossroads-road';

export type VillageCorridorDefinition = {
	id: VillageCorridorId;
	fromRoomId: VillageCorridorEndpointId;
	toRoomId: VillageCorridorEndpointId;
	route: readonly VillagePoint[];
};

export const villageCorridors: readonly VillageCorridorDefinition[] = [
	{
		id: 'village-home-to-plaza',
		fromRoomId: 'village-home-yard-room',
		toRoomId: 'village-well-plaza-room',
		route: [
			{ x: 700, y: 5_600 },
			{ x: 780, y: 5_390 },
			{ x: 1_000, y: 5_160 }
		]
	},
	{
		id: 'village-plaza-to-market',
		fromRoomId: 'village-well-plaza-room',
		toRoomId: 'village-market-yard-room',
		route: [
			{ x: 1_000, y: 5_160 },
			{ x: 650, y: 5_045 }
		]
	},
	{
		id: 'village-plaza-to-north-residences',
		fromRoomId: 'village-well-plaza-room',
		toRoomId: 'village-north-residences-room',
		route: [
			{ x: 1_000, y: 5_160 },
			{ x: 1_050, y: 4_860 }
		]
	},
	{
		id: 'village-plaza-to-shrine',
		fromRoomId: 'village-well-plaza-room',
		toRoomId: 'village-shrine-garden-room',
		route: [
			{ x: 1_000, y: 5_160 },
			{ x: 1_100, y: 5_420 },
			{ x: 1_200, y: 5_660 }
		]
	},
	{
		id: 'village-plaza-to-east-gate',
		fromRoomId: 'village-well-plaza-room',
		toRoomId: 'village-east-gate-room',
		route: [
			{ x: 1_000, y: 5_160 },
			{ x: 1_460, y: 4_900 },
			{ x: 1_660, y: 4_430 }
		]
	},
	{
		id: 'village-east-gate-to-crossroads-road',
		fromRoomId: 'village-east-gate-room',
		toRoomId: 'crossroads-road',
		route: [
			{ x: 1_660, y: 4_430 },
			{ x: 2_120, y: 4_440 }
		]
	}
];

export const villageMainRoute: readonly VillagePoint[] = [
	{ x: 700, y: 5_600 },
	{ x: 780, y: 5_390 },
	{ x: 1_000, y: 5_160 },
	{ x: 1_460, y: 4_900 },
	{ x: 1_660, y: 4_430 },
	{ x: 2_120, y: 4_440 }
];
