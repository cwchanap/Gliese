export const starterPackAsset = {
	key: 'starter-pack',
	path: '/game/assets/starter-pack.png',
	frames: {
		hero: { x: 90, y: 80, w: 235, h: 280 },
		slimeScout: { x: 355, y: 115, w: 250, h: 190 },
		ruinsWarden: { x: 675, y: 30, w: 430, h: 360 },
		healFlask: { x: 1210, y: 145, w: 150, h: 215 },
		grassTile: { x: 25, y: 470, w: 230, h: 220 },
		pathTile: { x: 280, y: 470, w: 225, h: 220 },
		ruinsFloorTile: { x: 535, y: 470, w: 225, h: 220 },
		stoneWallTile: { x: 780, y: 470, w: 225, h: 220 },
		doorwayTile: { x: 1020, y: 470, w: 230, h: 220 },
		encounterTile: { x: 1280, y: 470, w: 220, h: 220 },
		hudFrame: { x: 20, y: 790, w: 500, h: 210 },
		hpIcon: { x: 555, y: 800, w: 150, h: 150 },
		xpIcon: { x: 725, y: 790, w: 165, h: 165 },
		titleBadge: { x: 1050, y: 780, w: 440, h: 190 }
	}
} as const;

export type StarterPackFrameName = keyof typeof starterPackAsset.frames;

export const terrainTilesAsset = {
	key: 'terrain-tiles',
	path: '/game/assets/terrain-tiles.png',
	cellWidth: 256,
	cellHeight: 256,
	columns: 9,
	frames: {
		grassTile: { x: 0, y: 0, w: 256, h: 256 },
		pathTile: { x: 256, y: 0, w: 256, h: 256 },
		ruinsFloorTile: { x: 512, y: 0, w: 256, h: 256 },
		stoneWallTile: { x: 768, y: 0, w: 256, h: 256 },
		seaTile: { x: 1_024, y: 0, w: 256, h: 256 },
		sandTile: { x: 1_280, y: 0, w: 256, h: 256 },
		marshMudTile: { x: 1_536, y: 0, w: 256, h: 256 },
		autumnLeafTile: { x: 1_792, y: 0, w: 256, h: 256 },
		cobblestoneTile: { x: 2_048, y: 0, w: 256, h: 256 }
	}
} as const;

export type TerrainTileFrameName = keyof typeof terrainTilesAsset.frames;

export const battleBackgroundAssets = {
	meadow: {
		key: 'battle-background-meadow',
		path: '/game/assets/battle-meadow.png'
	},
	ruins: {
		key: 'battle-background-ruins',
		path: '/game/assets/battle-ruins.png'
	},
	neutral: {
		key: 'battle-background-neutral',
		path: '/game/assets/battle-neutral.png'
	}
} as const;

export type BattleEnvironmentId = keyof typeof battleBackgroundAssets;

const battleEnvironmentByMapId: Partial<Record<string, BattleEnvironmentId>> = {
	'meadow-entry': 'meadow',
	'ruins-threshold': 'ruins',
	'ruins-core': 'ruins'
};

export function getBattleEnvironmentId(mapId: string): BattleEnvironmentId {
	return battleEnvironmentByMapId[mapId] ?? 'neutral';
}

export function getBattleBackgroundAsset(mapId: string) {
	return battleBackgroundAssets[getBattleEnvironmentId(mapId)];
}

export const villageBuildingAsset = {
	key: 'village-buildings',
	path: '/game/assets/village-buildings.png',
	cellWidth: 627,
	cellHeight: 627,
	columns: 4,
	frames: {
		heroHouse: { x: 118, y: 116, w: 407, h: 437 },
		guildHall: { x: 627, y: 96, w: 563, h: 499 },
		itemShop: { x: 114, y: 668, w: 430, h: 445 },
		villagerHouse: { x: 688, y: 675, w: 403, h: 449 },
		blacksmith: { x: 1_254, y: 0, w: 627, h: 627 },
		shrineOfAurora: { x: 1_881, y: 0, w: 627, h: 627 },
		whisperingCave: { x: 1_254, y: 627, w: 627, h: 627 },
		sundropWell: { x: 1_881, y: 627, w: 627, h: 627 }
	}
} as const;

export type VillageBuildingFrameName = keyof typeof villageBuildingAsset.frames;

export const forestDressingAsset = {
	key: 'forest-dressing',
	path: '/game/assets/forest-dressing.png',
	cellWidth: 256,
	cellHeight: 256,
	columns: 2,
	frames: {
		treeCluster: { x: 0, y: 0, w: 256, h: 256 },
		brush: { x: 256, y: 0, w: 256, h: 256 },
		forestFloor: { x: 0, y: 256, w: 256, h: 256 },
		forestEntrance: { x: 256, y: 256, w: 256, h: 256 }
	}
} as const;

export type ForestDressingFrameName = keyof typeof forestDressingAsset.frames;

export const fenceDressingAsset = {
	key: 'fence-dressing',
	path: '/game/assets/fence-dressing.png',
	cellWidth: 256,
	cellHeight: 256,
	columns: 2,
	frames: {
		horizontalFence: { x: 0, y: 0, w: 256, h: 256 },
		verticalFence: { x: 256, y: 0, w: 256, h: 256 },
		fencePost: { x: 0, y: 256, w: 256, h: 256 },
		gateMarker: { x: 256, y: 256, w: 256, h: 256 }
	}
} as const;

export type FenceDressingFrameName = keyof typeof fenceDressingAsset.frames;

export const interiorPropAsset = {
	key: 'interior-props',
	path: '/game/assets/interior-props.png',
	cellWidth: 128,
	cellHeight: 128,
	columns: 4,
	frames: {
		bed: { x: 0, y: 0, w: 128, h: 128 },
		table: { x: 128, y: 0, w: 128, h: 128 },
		bench: { x: 256, y: 0, w: 128, h: 128 },
		bookshelf: { x: 384, y: 0, w: 128, h: 128 },
		shopCounter: { x: 0, y: 128, w: 128, h: 128 },
		noticeBoard: { x: 128, y: 128, w: 128, h: 128 },
		rug: { x: 256, y: 128, w: 128, h: 128 },
		crateStack: { x: 384, y: 128, w: 128, h: 128 },
		barrel: { x: 0, y: 256, w: 128, h: 128 },
		displayShelf: { x: 128, y: 256, w: 128, h: 128 },
		papers: { x: 256, y: 256, w: 128, h: 128 },
		weaponRack: { x: 384, y: 256, w: 128, h: 128 },
		hearthLamp: { x: 0, y: 384, w: 128, h: 128 },
		plant: { x: 128, y: 384, w: 128, h: 128 }
	}
} as const;

export type InteriorPropFrameName = keyof typeof interiorPropAsset.frames;

export const environmentDressingAsset = {
	key: 'environment-dressing',
	path: '/game/assets/environment-dressing.png',
	cellWidth: 96,
	cellHeight: 96,
	columns: 4,
	frames: {
		townWallHorizontal: { x: 0, y: 0, w: 96, h: 96 },
		townWallVertical: { x: 96, y: 0, w: 96, h: 96 },
		townHedgeHorizontal: { x: 192, y: 0, w: 96, h: 96 },
		townHedgeVertical: { x: 288, y: 0, w: 96, h: 96 },
		ruinWall: { x: 0, y: 96, w: 96, h: 96 },
		futureGate: { x: 96, y: 96, w: 96, h: 96 },
		stoneStair: { x: 192, y: 96, w: 96, h: 96 }
	}
} as const;

export type EnvironmentDressingFrameName = keyof typeof environmentDressingAsset.frames;

export const coastDressingAsset = {
	key: 'coast-dressing',
	path: '/game/assets/coast-dressing.png',
	cellWidth: 256,
	cellHeight: 256,
	columns: 3,
	frames: {
		torii: { x: 0, y: 0, w: 256, h: 256 },
		ferryShrine: { x: 256, y: 0, w: 256, h: 256 },
		fishingBoat: { x: 512, y: 0, w: 256, h: 256 },
		fishingNet: { x: 0, y: 256, w: 256, h: 256 },
		tidePool: { x: 256, y: 256, w: 256, h: 256 },
		driftwood: { x: 512, y: 256, w: 256, h: 256 },
		jetty: { x: 0, y: 512, w: 256, h: 256 },
		shorelineFoam: { x: 256, y: 512, w: 256, h: 256 }
	}
} as const;

export type CoastDressingFrameName = keyof typeof coastDressingAsset.frames;

export const shrineDressingAsset = {
	key: 'shrine-dressing',
	path: '/game/assets/shrine-dressing.png',
	cellWidth: 256,
	cellHeight: 256,
	columns: 3,
	frames: {
		silverShrineGate: { x: 0, y: 0, w: 256, h: 256 },
		stoneLantern: { x: 256, y: 0, w: 256, h: 256 },
		offeringStand: { x: 512, y: 0, w: 256, h: 256 },
		amuletRack: { x: 0, y: 256, w: 256, h: 256 },
		silverpine: { x: 256, y: 256, w: 256, h: 256 },
		autumnMaple: { x: 512, y: 256, w: 256, h: 256 }
	}
} as const;

export type ShrineDressingFrameName = keyof typeof shrineDressingAsset.frames;

export type VillageLandmarkId =
	| 'hero-house-exterior'
	| 'guild-hall-exterior'
	| 'item-shop-exterior'
	| 'villager-house-1-exterior'
	| 'villager-house-2-exterior'
	| 'villager-house-3-exterior'
	| 'blacksmith'
	| 'shrine-of-aurora'
	| 'whispering-cave'
	| 'sundrop-well';

const villageLandmarkFrames: Partial<Record<VillageLandmarkId, VillageBuildingFrameName>> = {
	'hero-house-exterior': 'heroHouse',
	'guild-hall-exterior': 'guildHall',
	'item-shop-exterior': 'itemShop',
	'villager-house-1-exterior': 'villagerHouse',
	'villager-house-2-exterior': 'villagerHouse',
	'villager-house-3-exterior': 'villagerHouse',
	blacksmith: 'blacksmith',
	'shrine-of-aurora': 'shrineOfAurora',
	'whispering-cave': 'whisperingCave',
	'sundrop-well': 'sundropWell'
};

export function getVillageBuildingFrameName(
	landmarkId: string
): VillageBuildingFrameName | undefined {
	return villageLandmarkFrames[landmarkId as VillageLandmarkId];
}

export const npcPackAsset = {
	key: 'npc-pack',
	path: '/game/assets/npc-pack.png',
	cellWidth: 96,
	cellHeight: 96,
	frames: {
		miraItemShopNpc: { x: 0, y: 0, w: 96, h: 96 },
		quartermasterNpc: { x: 96, y: 0, w: 96, h: 96 },
		guildMasterNpc: { x: 192, y: 0, w: 96, h: 96 }
	}
} as const;

export type NpcPackFrameName = keyof typeof npcPackAsset.frames;
export type NpcFrameName = StarterPackFrameName | NpcPackFrameName;

export function isNpcPackFrameName(frameName: NpcFrameName): frameName is NpcPackFrameName {
	return frameName in npcPackAsset.frames;
}

export function getEnemyFrameName(enemyId: string): StarterPackFrameName {
	if (enemyId === 'ruins-warden') {
		return 'ruinsWarden';
	}

	return 'slimeScout';
}

export function getGroundFrameName(mapId: string): TerrainTileFrameName {
	if (mapId === 'meadow-entry') {
		return 'grassTile';
	}

	return 'ruinsFloorTile';
}

export const actorAnimationKeys = ['idle', 'walk', 'attack', 'dead'] as const;
export type ActorAnimationKey = (typeof actorAnimationKeys)[number];

export const actorAnimationIds = ['hero', 'slimeScout', 'ruinsWarden'] as const;
export type ActorAnimationId = (typeof actorAnimationIds)[number];

type AnimationFrameName = `${ActorAnimationId}${Capitalize<ActorAnimationKey>}${number}`;

type AnimationFrame = {
	x: number;
	y: number;
	w: number;
	h: number;
};

type ActorAnimationClip = {
	key: `${ActorAnimationId}-${ActorAnimationKey}`;
	frames: AnimationFrameName[];
	frameRate: number;
	repeat: number;
};

type ActorAnimationAsset = {
	id: ActorAnimationId;
	displaySize: { width: number; height: number };
	clips: Record<ActorAnimationKey, ActorAnimationClip>;
};

const animationCellSize = 192;
const animationFrameCount = 4;
const animationRows: Array<{ actorId: ActorAnimationId; clip: ActorAnimationKey }> = [
	{ actorId: 'hero', clip: 'idle' },
	{ actorId: 'hero', clip: 'walk' },
	{ actorId: 'hero', clip: 'attack' },
	{ actorId: 'hero', clip: 'dead' },
	{ actorId: 'slimeScout', clip: 'idle' },
	{ actorId: 'slimeScout', clip: 'walk' },
	{ actorId: 'slimeScout', clip: 'attack' },
	{ actorId: 'slimeScout', clip: 'dead' },
	{ actorId: 'ruinsWarden', clip: 'idle' },
	{ actorId: 'ruinsWarden', clip: 'walk' },
	{ actorId: 'ruinsWarden', clip: 'attack' },
	{ actorId: 'ruinsWarden', clip: 'dead' }
];

function capitalizeAnimationKey(key: ActorAnimationKey): Capitalize<ActorAnimationKey> {
	return `${key[0]!.toUpperCase()}${key.slice(1)}` as Capitalize<ActorAnimationKey>;
}

function buildAnimationFrames(): Record<AnimationFrameName, AnimationFrame> {
	return Object.fromEntries(
		animationRows.flatMap(({ actorId, clip }, row) =>
			Array.from({ length: animationFrameCount }, (_, column) => [
				`${actorId}${capitalizeAnimationKey(clip)}${column}`,
				{
					x: column * animationCellSize,
					y: row * animationCellSize,
					w: animationCellSize,
					h: animationCellSize
				}
			])
		)
	) as Record<AnimationFrameName, AnimationFrame>;
}

function buildClip(
	actorId: ActorAnimationId,
	clip: ActorAnimationKey,
	sourceClip: ActorAnimationKey = clip
): ActorAnimationClip {
	const frameRateByClip: Record<ActorAnimationKey, number> = {
		idle: 3,
		walk: 6,
		attack: 10,
		dead: 8
	};
	const repeatByClip: Record<ActorAnimationKey, number> = {
		idle: -1,
		walk: -1,
		attack: 0,
		dead: 0
	};

	return {
		key: `${actorId}-${clip}`,
		frames: Array.from(
			{ length: animationFrameCount },
			(_, index) => `${actorId}${capitalizeAnimationKey(sourceClip)}${index}` as AnimationFrameName
		),
		frameRate: frameRateByClip[clip],
		repeat: repeatByClip[clip]
	};
}

function buildActorAnimationAsset(
	id: ActorAnimationId,
	displaySize: ActorAnimationAsset['displaySize']
): ActorAnimationAsset {
	return {
		id,
		displaySize,
		clips: {
			idle: buildClip(id, 'idle'),
			walk: buildClip(id, 'walk'),
			attack: id === 'hero' ? buildClip(id, 'attack', 'walk') : buildClip(id, 'attack'),
			dead: buildClip(id, 'dead')
		}
	};
}

export const animationPackAsset = {
	key: 'animation-pack',
	path: '/game/assets/animation-pack.png',
	cellWidth: animationCellSize,
	cellHeight: animationCellSize,
	columns: animationFrameCount,
	frames: buildAnimationFrames()
} as const;

export const actorAnimationAssets: Record<ActorAnimationId, ActorAnimationAsset> = {
	hero: buildActorAnimationAsset('hero', { width: 88, height: 90 }),
	slimeScout: buildActorAnimationAsset('slimeScout', { width: 88, height: 66 }),
	ruinsWarden: buildActorAnimationAsset('ruinsWarden', { width: 160, height: 144 })
};

export function getEnemyActorId(enemyId: string): ActorAnimationId {
	if (enemyId === 'ruins-warden') {
		return 'ruinsWarden';
	}

	return 'slimeScout';
}

export function getActorAnimationAsset(actorId: ActorAnimationId): ActorAnimationAsset {
	return actorAnimationAssets[actorId];
}
