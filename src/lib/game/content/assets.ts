export const starterPackAsset = {
	key: 'starter-pack',
	path: '/game/assets/starter-pack.png',
	frames: {
		hero: { x: 90, y: 80, w: 190, h: 280 },
		slimeScout: { x: 355, y: 115, w: 250, h: 190 },
		ruinsWarden: { x: 675, y: 30, w: 430, h: 360 },
		healFlask: { x: 1210, y: 145, w: 150, h: 170 },
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
