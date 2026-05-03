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

export function getEnemyFrameName(enemyId: string): StarterPackFrameName {
	if (enemyId === 'ruins-warden') {
		return 'ruinsWarden';
	}

	return 'slimeScout';
}

export function getGroundFrameName(mapId: string): StarterPackFrameName {
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
	hero: buildActorAnimationAsset('hero', { width: 44, height: 60 }),
	slimeScout: buildActorAnimationAsset('slimeScout', { width: 44, height: 44 }),
	ruinsWarden: buildActorAnimationAsset('ruinsWarden', { width: 80, height: 96 })
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
