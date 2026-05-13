import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HudCommand } from '$lib/game/ui-bridge/events';

const phaserState = vi.hoisted(() => {
	const cursorKeys = {
		left: { isDown: false },
		right: { isDown: false },
		up: { isDown: false },
		down: { isDown: false }
	};
	const wasdKeys = {
		left: { isDown: false },
		right: { isDown: false },
		up: { isDown: false },
		down: { isDown: false }
	};
	const interactKeys = {
		e: { isDown: false, justDown: false },
		space: { isDown: false, justDown: false },
		enter: { isDown: false, justDown: false }
	};

	function getInteractKey(code: string) {
		if (code === 'E') return interactKeys.e;
		if (code === 'SPACE') return interactKeys.space;
		if (code === 'ENTER') return interactKeys.enter;

		throw new Error(`Unexpected key code ${code}`);
	}

	function createAnimatedMarker() {
		const marker: {
			x: number;
			y: number;
			frame: string | undefined;
			visible: boolean;
			clearTint: ReturnType<typeof vi.fn>;
			setDisplaySize: ReturnType<typeof vi.fn>;
			setTint: ReturnType<typeof vi.fn>;
			setVisible: ReturnType<typeof vi.fn>;
			play: ReturnType<typeof vi.fn>;
			once: ReturnType<typeof vi.fn>;
		} = {
			x: 0,
			y: 0,
			frame: undefined as string | undefined,
			visible: true,
			clearTint: vi.fn(() => marker),
			setDisplaySize: vi.fn(() => marker),
			setTint: vi.fn(() => marker),
			setVisible: vi.fn((visible: boolean) => {
				marker.visible = visible;
				return marker;
			}),
			play: vi.fn(() => marker),
			once: vi.fn((_event: string, _callback: () => void) => {
				void _event;
				void _callback;
				return marker;
			})
		};

		return marker;
	}

	const playerMarker = createAnimatedMarker();
	const enemyMarker = createAnimatedMarker();
	const enemyMarkers: ReturnType<typeof createAnimatedMarker>[] = [];
	const victoryText = { setOrigin: vi.fn() };
	const textureMock = {
		has: vi.fn(() => false),
		add: vi.fn()
	};
	const tilemapLayer = {
		setDepth: vi.fn(() => tilemapLayer)
	};
	const tilemap = {
		addTilesetImage: vi.fn(() => ({ name: 'starter-ground-tiles' })),
		createLayer: vi.fn((layerId: number | string) => (layerId === 0 ? tilemapLayer : null))
	};
	const imageMarkers: Array<{
		x: number;
		y: number;
		frame?: string;
		visible: boolean;
		setDisplaySize: ReturnType<typeof vi.fn>;
		setVisible: ReturnType<typeof vi.fn>;
	}> = [];
	const tileSpriteMarkers: Array<{
		x: number;
		y: number;
		width: number;
		height: number;
		frame?: string;
	}> = [];

	function createOverlayMarker() {
		const marker = {
			x: 0,
			y: 0,
			alpha: 1,
			scaleX: 1,
			scaleY: 1,
			visible: true,
			setPosition: vi.fn((x: number, y: number) => {
				marker.x = x;
				marker.y = y;
				return marker;
			}),
			setScale: vi.fn((x: number, y?: number) => {
				marker.scaleX = x;
				marker.scaleY = y ?? x;
				return marker;
			}),
			setOrigin: vi.fn((_x: number, _y?: number) => {
				void _x;
				void _y;
				return marker;
			}),
			setAlpha: vi.fn((alpha: number) => {
				marker.alpha = alpha;
				return marker;
			}),
			setVisible: vi.fn((visible: boolean) => {
				marker.visible = visible;
				return marker;
			})
		};

		return marker;
	}

	const hitImpactMarkers = [
		createOverlayMarker(),
		createOverlayMarker(),
		createOverlayMarker(),
		createOverlayMarker()
	];
	let nextHitImpactMarkerIndex = 0;
	const enemyHealthBarBg = createOverlayMarker();
	const enemyHealthBarFill = createOverlayMarker();
	const enemyHealthBarBgs: ReturnType<typeof createOverlayMarker>[] = [];
	const enemyHealthBarFills: ReturnType<typeof createOverlayMarker>[] = [];
	const attackFlash = createOverlayMarker();
	const victoryOverlay = createOverlayMarker();

	function createImage(x: number, y: number, _texture: string, frame?: string) {
		if (
			frame === 'hero' ||
			frame?.startsWith('heroIdle') ||
			frame?.startsWith('heroWalk') ||
			frame?.startsWith('heroAttack') ||
			frame?.startsWith('heroDead')
		) {
			playerMarker.x = x;
			playerMarker.y = y;
			playerMarker.frame = frame;
			return playerMarker;
		}

		if (
			frame === 'slimeScout' ||
			frame === 'ruinsWarden' ||
			frame?.startsWith('slimeScout') ||
			frame?.startsWith('ruinsWarden')
		) {
			const marker = enemyMarkers.length === 0 ? enemyMarker : createAnimatedMarker();
			marker.x = x;
			marker.y = y;
			marker.frame = frame;
			marker.visible = true;
			enemyMarkers.push(marker);
			return marker;
		}

		const marker = {
			x,
			y,
			frame,
			visible: true,
			setDisplaySize: vi.fn(() => marker),
			setVisible: vi.fn((visible: boolean) => {
				marker.visible = visible;
				return marker;
			})
		};
		imageMarkers.push(marker);
		return marker;
	}

	function createTileSprite(
		x: number,
		y: number,
		width: number,
		height: number,
		_texture: string,
		frame?: string
	) {
		const marker = { x, y, width, height, frame };
		tileSpriteMarkers.push(marker);
		return marker;
	}

	function createRectangle(
		x: number,
		y: number,
		width: number,
		height: number,
		color?: number,
		_alpha?: number
	) {
		void _alpha;

		if (width === 34 && height === 4) {
			const marker = enemyHealthBarBgs.length === 0 ? enemyHealthBarBg : createOverlayMarker();
			Object.assign(marker, { x, y, scaleX: 1, scaleY: 1, visible: true });
			enemyHealthBarBgs.push(marker);
			return marker;
		}

		if (width === 30 && height === 2) {
			const marker = enemyHealthBarFills.length === 0 ? enemyHealthBarFill : createOverlayMarker();
			Object.assign(marker, { x, y, scaleX: 1, scaleY: 1, visible: true });
			enemyHealthBarFills.push(marker);
			return marker;
		}

		if (width === 18 && height === 18 && color === 0xfff0a8) {
			Object.assign(attackFlash, { x, y, scaleX: 1, scaleY: 1, visible: true });
			return attackFlash;
		}

		Object.assign(victoryOverlay, { x, y, scaleX: 1, scaleY: 1, visible: true });
		return victoryOverlay;
	}

	class SceneMock {
		scene = { start: vi.fn(), restart: vi.fn() };
		load = {
			image: vi.fn()
		};
		anims = {
			exists: vi.fn(() => false),
			create: vi.fn(),
			generateFrameNames: vi.fn((_key: string, config: { frames: string[] }) => config.frames)
		};
		add = {
			arc: vi.fn((x: number, y: number) => {
				const marker = hitImpactMarkers[nextHitImpactMarkerIndex] ?? createOverlayMarker();
				if (!hitImpactMarkers[nextHitImpactMarkerIndex]) {
					hitImpactMarkers.push(marker);
				}
				nextHitImpactMarkerIndex += 1;
				Object.assign(marker, { x, y, alpha: 1, scaleX: 1, scaleY: 1, visible: true });
				return marker;
			}),
			image: vi.fn(createImage),
			tileSprite: vi.fn(createTileSprite),
			sprite: vi.fn(createImage),
			rectangle: vi.fn(createRectangle),
			text: vi.fn(() => victoryText)
		};
		cameras = {
			main: {
				setBackgroundColor: vi.fn(),
				setBounds: vi.fn(),
				startFollow: vi.fn()
			}
		};
		make = {
			tilemap: vi.fn(() => tilemap)
		};
		input = {
			keyboard: {
				createCursorKeys: vi.fn(() => cursorKeys),
				addKeys: vi.fn(() => wasdKeys),
				addKey: vi.fn((code: string) => getInteractKey(code))
			}
		};
		textures = {
			get: vi.fn(() => textureMock)
		};

		constructor(...args: unknown[]) {
			void args;
		}
	}

	return {
		SceneMock,
		cursorKeys,
		wasdKeys,
		interactKeys,
		playerMarker,
		enemyMarker,
		enemyMarkers,
		enemyHealthBarBg,
		enemyHealthBarFill,
		hitImpactArc: hitImpactMarkers[0],
		hitImpactSpark: hitImpactMarkers[1],
		hitImpactRing: hitImpactMarkers[2],
		hitImpactCore: hitImpactMarkers[3],
		hitImpactMarkers,
		enemyHealthBarBgs,
		enemyHealthBarFills,
		attackFlash,
		victoryText,
		textureMock,
		tilemap,
		tilemapLayer,
		imageMarkers,
		tileSpriteMarkers,
		reset() {
			Object.assign(playerMarker, { x: 0, y: 0, frame: undefined, visible: true });
			Object.assign(enemyMarker, { x: 0, y: 0, frame: undefined, visible: true });
			enemyMarkers.splice(0, enemyMarkers.length);
			enemyHealthBarBgs.splice(0, enemyHealthBarBgs.length);
			enemyHealthBarFills.splice(0, enemyHealthBarFills.length);
			imageMarkers.splice(0, imageMarkers.length);
			tileSpriteMarkers.splice(0, tileSpriteMarkers.length);
			nextHitImpactMarkerIndex = 0;
			playerMarker.setDisplaySize.mockClear();
			playerMarker.clearTint.mockClear();
			playerMarker.setTint.mockClear();
			playerMarker.setVisible.mockReset();
			playerMarker.play.mockReset();
			playerMarker.once.mockReset();
			enemyMarker.setDisplaySize.mockClear();
			enemyMarker.clearTint.mockClear();
			enemyMarker.setVisible.mockReset();
			enemyMarker.setTint.mockReset();
			enemyMarker.play.mockReset();
			enemyMarker.once.mockReset();
			Object.assign(enemyHealthBarBg, { x: 0, y: 0, scaleX: 1, scaleY: 1, visible: true });
			Object.assign(enemyHealthBarFill, { x: 0, y: 0, scaleX: 1, scaleY: 1, visible: true });
			Object.assign(attackFlash, { x: 0, y: 0, scaleX: 1, scaleY: 1, visible: true });
			for (const marker of hitImpactMarkers) {
				Object.assign(marker, { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1, visible: true });
				marker.setPosition.mockReset();
				marker.setScale.mockReset();
				marker.setOrigin.mockReset();
				marker.setAlpha.mockReset();
				marker.setVisible.mockReset();
			}
			enemyHealthBarBg.setPosition.mockReset();
			enemyHealthBarBg.setScale.mockReset();
			enemyHealthBarBg.setOrigin.mockReset();
			enemyHealthBarBg.setVisible.mockReset();
			enemyHealthBarFill.setPosition.mockReset();
			enemyHealthBarFill.setScale.mockReset();
			enemyHealthBarFill.setOrigin.mockReset();
			enemyHealthBarFill.setVisible.mockReset();
			attackFlash.setPosition.mockReset();
			attackFlash.setScale.mockReset();
			attackFlash.setOrigin.mockReset();
			attackFlash.setVisible.mockReset();
			textureMock.has.mockClear();
			textureMock.add.mockClear();
			tilemap.addTilesetImage.mockClear();
			tilemap.createLayer.mockClear();
			tilemapLayer.setDepth.mockClear();
			victoryText.setOrigin.mockReset();
		}
	};
});

vi.mock('phaser', () => {
	const runtime = {
		Scene: phaserState.SceneMock,
		Math: {
			Distance: {
				Between: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1)
			}
		},
		Input: {
			Keyboard: {
				KeyCodes: {
					A: 'A',
					D: 'D',
					W: 'W',
					S: 'S',
					E: 'E',
					SPACE: 'SPACE',
					ENTER: 'ENTER'
				},
				JustDown: vi.fn((key: { justDown?: boolean }) => {
					const result = Boolean(key.justDown);
					key.justDown = false;
					return result;
				})
			}
		}
	};

	return {
		...runtime,
		default: runtime
	};
});

describe('BootScene', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('starts the world scene on the opening map', async () => {
		const { BootScene } = await import('./BootScene');
		const { WorldScene } = await import('./WorldScene');
		const { openingMapId } = await import('$lib/game/content/maps');
		const scene = new BootScene();

		scene.create();

		expect(scene.scene.start).toHaveBeenCalledWith(WorldScene.key, { mapId: openingMapId });
	});

	it('preloads the static and animation sheets', async () => {
		const {
			animationPackAsset,
			fenceDressingAsset,
			forestDressingAsset,
			npcPackAsset,
			starterPackAsset,
			villageBuildingAsset
		} = await import('$lib/game/content/assets');
		const { BootScene } = await import('./BootScene');
		const scene = new BootScene();

		scene.preload();

		expect(scene.load.image).toHaveBeenCalledWith(starterPackAsset.key, starterPackAsset.path);
		expect(scene.load.image).toHaveBeenCalledWith(animationPackAsset.key, animationPackAsset.path);
		expect(scene.load.image).toHaveBeenCalledWith(npcPackAsset.key, npcPackAsset.path);
		expect(scene.load.image).toHaveBeenCalledWith(
			villageBuildingAsset.key,
			villageBuildingAsset.path
		);
		expect(scene.load.image).toHaveBeenCalledWith(
			forestDressingAsset.key,
			forestDressingAsset.path
		);
		expect(scene.load.image).toHaveBeenCalledWith(fenceDressingAsset.key, fenceDressingAsset.path);
	});
});

describe('WorldScene', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		phaserState.reset();
		Object.assign(phaserState.cursorKeys.left, { isDown: false });
		Object.assign(phaserState.cursorKeys.right, { isDown: false });
		Object.assign(phaserState.cursorKeys.up, { isDown: false });
		Object.assign(phaserState.cursorKeys.down, { isDown: false });
		Object.assign(phaserState.wasdKeys.left, { isDown: false });
		Object.assign(phaserState.wasdKeys.right, { isDown: false });
		Object.assign(phaserState.wasdKeys.up, { isDown: false });
		Object.assign(phaserState.wasdKeys.down, { isDown: false });
		Object.assign(phaserState.interactKeys.e, { isDown: false, justDown: false });
		Object.assign(phaserState.interactKeys.space, { isDown: false, justDown: false });
		Object.assign(phaserState.interactKeys.enter, { isDown: false, justDown: false });
		Object.assign(phaserState.playerMarker, { x: 0, y: 0 });
	});

	it('renders tilemap ground, a hero sprite, and encounter art for the resolved map', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });

		expect(scene.make.tilemap).toHaveBeenCalledWith({
			data: expect.any(Array),
			tileWidth: 32,
			tileHeight: 32
		});
		const tilemapCall = vi.mocked(scene.make.tilemap).mock.calls[0]![0]!;
		const tilemapData = tilemapCall.data as number[][];
		expect(tilemapData).toHaveLength(80);
		expect(tilemapData[0]).toHaveLength(80);
		expect(phaserState.tilemap.addTilesetImage).toHaveBeenCalledWith(
			'starter-ground-tiles',
			'starter-ground-tiles',
			32,
			32
		);
		expect(phaserState.tilemap.createLayer).toHaveBeenCalledWith(0, expect.anything(), 0, 0);
		expect(phaserState.tilemapLayer.setDepth).toHaveBeenCalledWith(-10);
		expect(tilemapData[0][0]).toBe(0);
		expect(tilemapData[40][0]).toBe(1);
		expect(scene.add.sprite).toHaveBeenCalledWith(
			meadowEntryMap.spawn.x,
			meadowEntryMap.spawn.y,
			'animation-pack',
			'heroIdle0'
		);
		expect(scene.add.sprite).toHaveBeenCalledWith(1_664, 832, 'animation-pack', 'slimeScoutIdle0');
		expect(phaserState.enemyMarkers).toHaveLength(3);
		expect(scene.add.image).toHaveBeenCalledWith(2_304, 704, 'starter-pack', 'doorwayTile');
		expect(scene.cameras.main.setBackgroundColor).toHaveBeenCalledWith('#1a1f2b');
	});

	it('renders village building landmarks before doorway markers', async () => {
		const { villageBuildingAsset } = await import('$lib/game/content/assets');
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });

		expect(scene.textures.get).toHaveBeenCalledWith(villageBuildingAsset.key);
		for (const [frameName, frame] of Object.entries(villageBuildingAsset.frames)) {
			expect(phaserState.textureMock.add).toHaveBeenCalledWith(
				frameName,
				0,
				frame.x,
				frame.y,
				frame.w,
				frame.h
			);
		}

		expect(scene.add.image).toHaveBeenCalledWith(384, 1_289, 'village-buildings', 'heroHouse');
		expect(scene.add.image).toHaveBeenCalledWith(800, 1_054, 'village-buildings', 'guildHall');
		expect(scene.add.image).toHaveBeenCalledWith(832, 1_436, 'village-buildings', 'itemShop');
		expect(scene.add.image).toHaveBeenCalledWith(352, 991, 'village-buildings', 'villagerHouse');
		expect(scene.add.image).toHaveBeenCalledWith(576, 1_535, 'village-buildings', 'villagerHouse');
		expect(scene.add.image).toHaveBeenCalledWith(
			1_056,
			1_311,
			'village-buildings',
			'villagerHouse'
		);
		expect(scene.add.rectangle).not.toHaveBeenCalledWith(384, 1_289, 192, 174, 0x5b4636, 0.9);
		expect(scene.add.text).toHaveBeenCalledWith(384, 1_206, "Hero's House", {
			color: '#f8fafc',
			fontSize: '12px'
		});
		expect(scene.add.image).not.toHaveBeenCalledWith(384, 1_344, 'starter-pack', 'doorwayTile');
		expect(scene.add.image).not.toHaveBeenCalledWith(800, 1_136, 'starter-pack', 'doorwayTile');
		expect(scene.add.image).not.toHaveBeenCalledWith(832, 1_504, 'starter-pack', 'doorwayTile');
		expect(scene.add.image).not.toHaveBeenCalledWith(352, 1_048, 'starter-pack', 'doorwayTile');
		expect(scene.add.image).not.toHaveBeenCalledWith(576, 1_592, 'starter-pack', 'doorwayTile');
		expect(scene.add.image).not.toHaveBeenCalledWith(1_056, 1_368, 'starter-pack', 'doorwayTile');
		expect(scene.add.image).toHaveBeenCalledWith(2_304, 704, 'starter-pack', 'doorwayTile');
		expect(
			phaserState.imageMarkers.filter((marker) => marker.frame === 'doorwayTile')
		).toHaveLength(1);

		const heroHouseMarker = phaserState.imageMarkers.find(
			(marker) => marker.x === 384 && marker.y === 1_289 && marker.frame === 'heroHouse'
		);
		const guildHallMarker = phaserState.imageMarkers.find(
			(marker) => marker.x === 800 && marker.y === 1_054 && marker.frame === 'guildHall'
		);
		const itemShopMarker = phaserState.imageMarkers.find(
			(marker) => marker.x === 832 && marker.y === 1_436 && marker.frame === 'itemShop'
		);
		const villagerHouseMarkers = phaserState.imageMarkers.filter(
			(marker) => marker.frame === 'villagerHouse'
		);
		expect(heroHouseMarker?.setDisplaySize).toHaveBeenCalledWith(192, 174);
		expect(guildHallMarker?.setDisplaySize).toHaveBeenCalledWith(256, 228);
		expect(itemShopMarker?.setDisplaySize).toHaveBeenCalledWith(192, 200);
		expect(villagerHouseMarkers).toHaveLength(3);
		expect(
			villagerHouseMarkers.every((marker) => marker.setDisplaySize.mock.calls[0]![0] === 160)
		).toBe(true);
		expect(
			villagerHouseMarkers.every((marker) => marker.setDisplaySize.mock.calls[0]![1] === 178)
		).toBe(true);

		const imageCalls = vi.mocked(scene.add.image).mock.calls;
		const firstLandmarkCallIndex = imageCalls.findIndex(
			([x, y, texture, frame]) =>
				x === 384 && y === 1_289 && texture === 'village-buildings' && frame === 'heroHouse'
		);
		const firstDoorwayCallIndex = imageCalls.findIndex(
			([x, y, texture, frame]) =>
				x === 2_304 && y === 704 && texture === 'starter-pack' && frame === 'doorwayTile'
		);
		const firstLandmarkCallOrder = vi.mocked(scene.add.image).mock.invocationCallOrder[
			firstLandmarkCallIndex
		];
		const firstDoorwayCallOrder = vi.mocked(scene.add.image).mock.invocationCallOrder[
			firstDoorwayCallIndex
		];
		expect(firstLandmarkCallOrder).toBeLessThan(firstDoorwayCallOrder);
	});

	it('registers and renders meadow forest dressing before actors', async () => {
		const { forestDressingAsset } = await import('$lib/game/content/assets');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });

		expect(scene.textures.get).toHaveBeenCalledWith(forestDressingAsset.key);
		for (const [frameName, frame] of Object.entries(forestDressingAsset.frames)) {
			expect(phaserState.textureMock.add).toHaveBeenCalledWith(
				frameName,
				0,
				frame.x,
				frame.y,
				frame.w,
				frame.h
			);
		}

		expect(scene.add.tileSprite).toHaveBeenCalledWith(
			2_016,
			544,
			960,
			704,
			'forest-dressing',
			'forestFloor'
		);
		expect(scene.add.tileSprite).toHaveBeenCalledWith(
			2_016,
			64,
			1_088,
			128,
			'forest-dressing',
			'treeCluster'
		);
		expect(scene.add.tileSprite).toHaveBeenCalledWith(
			2_016,
			704,
			512,
			192,
			'forest-dressing',
			'brush'
		);
		expect(scene.add.image).toHaveBeenCalledWith(1_472, 832, 'forest-dressing', 'forestEntrance');
		expect(
			phaserState.tileSpriteMarkers.filter((marker) => marker.frame === 'treeCluster')
		).toHaveLength(4);

		const entrance = phaserState.imageMarkers.find((marker) => marker.frame === 'forestEntrance');
		expect(entrance?.setDisplaySize).toHaveBeenCalledWith(160, 160);

		const firstForestCallIndex = vi
			.mocked(scene.add.tileSprite)
			.mock.calls.findIndex(
				([x, y, width, height, texture, frame]) =>
					x === 2_016 &&
					y === 544 &&
					width === 960 &&
					height === 704 &&
					texture === 'forest-dressing' &&
					frame === 'forestFloor'
			);
		const firstHeroCallOrder = vi.mocked(scene.add.sprite).mock.invocationCallOrder[0];
		const firstForestCallOrder = vi.mocked(scene.add.tileSprite).mock.invocationCallOrder[
			firstForestCallIndex
		];
		expect(firstForestCallOrder).toBeLessThan(firstHeroCallOrder);
	});

	it('registers and renders village fence segments with generated fence art', async () => {
		const { fenceDressingAsset } = await import('$lib/game/content/assets');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });

		expect(scene.textures.get).toHaveBeenCalledWith(fenceDressingAsset.key);
		for (const [frameName, frame] of Object.entries(fenceDressingAsset.frames)) {
			expect(phaserState.textureMock.add).toHaveBeenCalledWith(
				frameName,
				0,
				frame.x,
				frame.y,
				frame.w,
				frame.h
			);
		}
		expect(scene.add.rectangle).not.toHaveBeenCalledWith(392, 848, 432, 32, 0x6f5132, 0.95);
		expect(scene.add.image).toHaveBeenCalledWith(200, 848, 'fence-dressing', 'horizontalFence');
		expect(scene.add.image).toHaveBeenCalledWith(176, 912, 'fence-dressing', 'verticalFence');
		const horizontalFence = phaserState.imageMarkers.find(
			(marker) => marker.x === 200 && marker.y === 848 && marker.frame === 'horizontalFence'
		);
		const verticalFence = phaserState.imageMarkers.find(
			(marker) => marker.x === 176 && marker.y === 912 && marker.frame === 'verticalFence'
		);
		expect(horizontalFence?.setDisplaySize).toHaveBeenCalledWith(64, 32);
		expect(verticalFence?.setDisplaySize).toHaveBeenCalledWith(32, 64);
	});

	it('registers animation pack frames and creates animated hero and enemy sprites', async () => {
		const { animationPackAsset } = await import('$lib/game/content/assets');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });

		expect(scene.add.sprite).toHaveBeenCalledWith(
			meadowEntryMap.spawn.x,
			meadowEntryMap.spawn.y,
			'animation-pack',
			'heroIdle0'
		);
		expect(scene.add.sprite).toHaveBeenCalledWith(1_664, 832, 'animation-pack', 'slimeScoutIdle0');
		expect(phaserState.enemyMarkers).toHaveLength(3);
		expect(phaserState.textureMock.add).toHaveBeenCalledWith(
			'heroIdle0',
			0,
			animationPackAsset.frames.heroIdle0.x,
			animationPackAsset.frames.heroIdle0.y,
			192,
			192
		);
		expect(scene.anims.create).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'hero-idle', frameRate: 3, repeat: -1 })
		);
		expect(scene.anims.create).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'slimeScout-idle', frameRate: 3, repeat: -1 })
		);
		expect(phaserState.playerMarker.play).toHaveBeenCalledWith('hero-idle', true);
		expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('slimeScout-idle', true);
	});

	it('renders ruins tilemap data with stone borders and floor interior', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { ruinsThresholdMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: ruinsThresholdMap.id });

		const tilemapCall = vi.mocked(scene.make.tilemap).mock.calls[0]![0]!;
		const tilemapData = tilemapCall.data as number[][];
		expect(tilemapData[0][0]).toBe(3);
		expect(tilemapData[0][1]).toBe(3);
		expect(tilemapData[1][0]).toBe(3);
		expect(tilemapData[1][1]).toBe(2);
		expect(phaserState.tilemap.createLayer).toHaveBeenCalledWith(0, expect.anything(), 0, 0);
		expect(phaserState.tilemapLayer.setDepth).toHaveBeenCalledWith(-10);
	});

	it('sets up camera follow and keyboard controls for the player marker', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });

		expect(meadowEntryMap.width).toBe(80);
		expect(meadowEntryMap.height).toBe(80);
		expect(scene.cameras.main.setBounds).toHaveBeenCalledWith(0, 0, 2_560, 2_560);
		expect(scene.cameras.main.startFollow).toHaveBeenCalledWith(
			phaserState.playerMarker,
			true,
			0.14,
			0.14
		);
		expect(scene.input.keyboard?.createCursorKeys).toHaveBeenCalledOnce();
		expect(scene.input.keyboard?.addKeys).toHaveBeenCalledWith({
			left: 'A',
			right: 'D',
			up: 'W',
			down: 'S'
		});
		expect(scene.input.keyboard?.addKey).toHaveBeenCalledWith('E');
		expect(scene.input.keyboard?.addKey).toHaveBeenCalledWith('SPACE');
		expect(scene.input.keyboard?.addKey).toHaveBeenCalledWith('ENTER');
	});

	it('sets camera bounds for the ruins core map dimensions', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { ruinsCoreMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: ruinsCoreMap.id });

		expect(ruinsCoreMap.width).toBe(30);
		expect(ruinsCoreMap.height).toBe(30);
		expect(scene.cameras.main.setBounds).toHaveBeenCalledWith(0, 0, 960, 960);
	});

	it('moves the player marker using the current input state', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 1000);

		expect(phaserState.playerMarker.x).toBe(meadowEntryMap.spawn.x + 60);
		expect(phaserState.playerMarker.y).toBe(meadowEntryMap.spawn.y);
	});

	it('moves the player marker using WASD input state', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });
		phaserState.wasdKeys.down.isDown = true;

		scene.update(0, 1000);

		expect(phaserState.playerMarker.x).toBe(meadowEntryMap.spawn.x);
		expect(phaserState.playerMarker.y).toBe(meadowEntryMap.spawn.y + 60);
	});

	it('clamps the player marker within the world bounds during movement', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });
		Object.assign(phaserState.playerMarker, { x: 13, y: 13 });
		phaserState.cursorKeys.left.isDown = true;
		phaserState.cursorKeys.up.isDown = true;

		scene.update(0, 1000);

		expect(phaserState.playerMarker.x).toBe(12);
		expect(phaserState.playerMarker.y).toBe(12);
	});

	it('blocks player movement through NPC bodies', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 352, y: 185 });
		phaserState.cursorKeys.up.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(352);
		expect(phaserState.playerMarker.y).toBe(185);
	});

	it('slides along an NPC when only one movement axis is blocked', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 316, y: 180 });
		phaserState.cursorKeys.right.isDown = true;
		phaserState.cursorKeys.up.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBeGreaterThan(316);
		expect(phaserState.playerMarker.y).toBe(180);
	});

	it('allows player movement away from an existing NPC collision overlap', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 352, y: 150 });
		phaserState.cursorKeys.down.isDown = true;

		scene.update(0, 50);

		expect(phaserState.playerMarker.x).toBe(352);
		expect(phaserState.playerMarker.y).toBeGreaterThan(150);
	});

	it('blocks fast movement from tunneling through an NPC collision body', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 352, y: 174 });
		phaserState.cursorKeys.up.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(352);
		expect(phaserState.playerMarker.y).toBe(174);
	});

	it('blocks player movement through village building bodies', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 660, y: 1_054 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(660);
		expect(phaserState.playerMarker.y).toBe(1_054);
	});

	it('blocks player movement through village building side windows', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 320, y: 1_376 });
		phaserState.cursorKeys.up.isDown = true;

		scene.update(0, 50);

		expect(phaserState.playerMarker.x).toBe(320);
		expect(phaserState.playerMarker.y).toBe(1_376);
	});

	it('blocks player movement through village fence segments', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 1_164, y: 1_024 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(1_164);
		expect(phaserState.playerMarker.y).toBe(1_024);
	});

	it('blocks movement across the lower padded edge of village fence segments', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 579, y: 1_764 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(579);
		expect(phaserState.playerMarker.y).toBe(1_764);
	});

	it('keeps the central east fence gate open toward the forest', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 1_184, y: 1_280 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBeGreaterThan(1_184);
		expect(phaserState.playerMarker.y).toBe(1_280);
	});

	it('keeps the hero house south fence opening passable', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 384, y: 1_704 });
		phaserState.cursorKeys.down.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(384);
		expect(phaserState.playerMarker.y).toBeGreaterThan(1_704);
	});

	it('keeps building doorway transitions reachable from the exterior approach', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 384, y: 1_376 });
		phaserState.cursorKeys.up.isDown = true;

		scene.update(0, 50);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'hero-house',
				player: expect.objectContaining({
					x: 256,
					y: 224,
					facing: 'up'
				})
			})
		});
	});

	it('limits large frame deltas before applying movement distance', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 10_000);

		expect(phaserState.playerMarker.x).toBe(meadowEntryMap.spawn.x + 60);
		expect(phaserState.playerMarker.y).toBe(meadowEntryMap.spawn.y);
	});

	it('plays hero walk while moving and idle after stopping', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		phaserState.playerMarker.play.mockClear();
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 100);

		expect(phaserState.playerMarker.play).toHaveBeenLastCalledWith('hero-walk', true);

		phaserState.playerMarker.play.mockClear();
		phaserState.cursorKeys.right.isDown = false;
		scene.update(100, 100);

		expect(phaserState.playerMarker.play).toHaveBeenLastCalledWith('hero-idle', true);
	});

	it('plays hero attack when auto attacking an enemy', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		phaserState.playerMarker.play.mockClear();
		Object.assign(phaserState.playerMarker, { x: 1_696, y: 832 });

		scene.update(0, 16);

		expect(phaserState.playerMarker.play).toHaveBeenCalledWith('hero-attack', false);
	});

	it('plays hero dead and stops movement when HP reaches zero', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ hp: number }>;
			playerProgress: { level: number; xp: number; hp: number; attack: number };
		};

		scene.create({ mapId: 'ruins-core' });
		sceneState.playerProgress = { level: 1, xp: 0, hp: 1, attack: 3 };
		Object.assign(phaserState.playerMarker, { x: 640, y: 480 });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(500, 16);
		const xAfterDeath = phaserState.playerMarker.x;
		scene.update(600, 1000);

		expect(phaserState.playerMarker.play).toHaveBeenCalledWith('hero-dead', false);
		expect(phaserState.playerMarker.x).toBe(xAfterDeath);
	});

	it('resumes a zero HP save as dead and keeps movement stopped', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				player: {
					...createNewSaveState().player,
					hp: 0
				}
			}
		});
		const xAfterCreate = phaserState.playerMarker.x;
		phaserState.cursorKeys.right.isDown = true;

		scene.update(1_000, 1_000);

		expect(phaserState.playerMarker.play).toHaveBeenCalledWith('hero-dead', false);
		expect(phaserState.playerMarker.x).toBe(xAfterCreate);
	});

	it('does not draw a square placeholder for the hero attack', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 1_696, y: 832 });

		scene.update(0, 16);

		expect(scene.add.rectangle).not.toHaveBeenCalledWith(
			expect.any(Number),
			expect.any(Number),
			18,
			18,
			0xfff0a8,
			0.82
		);
	});

	it('shows the hero hit impact on the enemy target and clears the hurt reaction', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 1_696, y: 832 });
		phaserState.enemyMarker.setTint.mockClear();
		phaserState.enemyMarker.clearTint.mockClear();

		scene.update(0, 16);

		expect(scene.add.arc).toHaveBeenCalledWith(1_664, 832, 32, 210, 330, false, 0xff8a1f, 0.98);
		expect(scene.add.arc).toHaveBeenCalledWith(1_664, 832, 16, 20, 160, false, 0xfff7d6, 1);
		expect(scene.add.arc).toHaveBeenCalledWith(1_664, 832, 26, 0, 360, false, 0xfff0a8, 0.72);
		expect(scene.add.arc).toHaveBeenCalledWith(1_664, 832, 10, 0, 360, false, 0xffffff, 0.92);
		expect(phaserState.hitImpactArc.setAlpha).toHaveBeenCalledWith(0.98);
		expect(phaserState.hitImpactSpark.setAlpha).toHaveBeenCalledWith(1);
		expect(phaserState.hitImpactRing.setScale).toHaveBeenCalledWith(0.55, 0.55);
		expect(phaserState.hitImpactCore.setScale).toHaveBeenCalledWith(0.85, 0.85);
		expect(phaserState.hitImpactCore.setAlpha).toHaveBeenCalledWith(0.92);
		expect(phaserState.enemyMarker.setTint).toHaveBeenCalledWith(0xfff0a8);

		scene.update(200, 16);

		expect(phaserState.hitImpactArc.setVisible).not.toHaveBeenCalledWith(false);
		expect(phaserState.hitImpactSpark.setVisible).not.toHaveBeenCalledWith(false);
		expect(phaserState.hitImpactRing.setVisible).not.toHaveBeenCalledWith(false);
		expect(phaserState.hitImpactCore.setVisible).not.toHaveBeenCalledWith(false);
		expect(phaserState.hitImpactArc.scaleX).toBeGreaterThan(1);
		expect(phaserState.hitImpactSpark.alpha).toBeLessThan(0.95);
		expect(phaserState.hitImpactRing.scaleX).toBeGreaterThan(0.45);
		expect(phaserState.hitImpactCore.alpha).toBeGreaterThan(0.25);
		expect(phaserState.enemyMarker.clearTint).not.toHaveBeenCalled();

		scene.update(470, 16);

		expect(phaserState.hitImpactArc.setVisible).toHaveBeenCalledWith(false);
		expect(phaserState.hitImpactSpark.setVisible).toHaveBeenCalledWith(false);
		expect(phaserState.hitImpactRing.setVisible).toHaveBeenCalledWith(false);
		expect(phaserState.hitImpactCore.setVisible).toHaveBeenCalledWith(false);
		expect(phaserState.enemyMarker.clearTint).toHaveBeenCalled();
	});

	it('stops world movement while the gameplay menu is open', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({ mapId: meadowEntryMap.id });
		phaserState.cursorKeys.right.isDown = true;
		sceneState.handleHudCommand({ type: 'pause-game' });

		scene.update(0, 1000);

		expect(phaserState.playerMarker.x).toBe(meadowEntryMap.spawn.x);
		expect(phaserState.playerMarker.y).toBe(meadowEntryMap.spawn.y);

		sceneState.handleHudCommand({ type: 'resume-game' });
		scene.update(1000, 1000);

		expect(phaserState.playerMarker.x).toBe(meadowEntryMap.spawn.x + 60);
	});

	it('uses a field potion command to heal and publish the updated inventory', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({
			saveState: {
				...createNewSaveState(),
				player: {
					...createNewSaveState().player,
					hp: 10
				},
				inventory: {
					stacks: [{ itemId: 'field-potion', quantity: 1 }],
					equipment: ['training-sword']
				}
			}
		});
		sceneState.handleHudCommand({ type: 'use-item', itemId: 'field-potion' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				hp: 18,
				heals: 0,
				status: 'Recovered HP',
				inventory: expect.objectContaining({
					consumables: [],
					equipment: expect.arrayContaining([
						expect.objectContaining({ itemId: 'training-sword', equipped: true })
					])
				})
			})
		);
	});

	it('publishes item icon paths in HUD inventory entries', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				inventory: {
					stacks: [
						{ itemId: 'field-potion', quantity: 1 },
						{ itemId: 'meadow-token', quantity: 1 }
					],
					equipment: ['training-sword']
				}
			}
		});

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				inventory: expect.objectContaining({
					consumables: expect.arrayContaining([
						expect.objectContaining({
							itemId: 'field-potion',
							iconPath: '/game/assets/items/field-potion.png'
						})
					]),
					equipment: expect.arrayContaining([
						expect.objectContaining({
							itemId: 'training-sword',
							iconPath: '/game/assets/items/training-sword.png'
						})
					]),
					keyItems: expect.arrayContaining([
						expect.objectContaining({
							itemId: 'meadow-token',
							iconPath: '/game/assets/items/meadow-token.png'
						})
					])
				})
			})
		);
	});

	it('renders uncollected pickups using flask art and skips pickups collected in a save', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { ruinsThresholdMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: ruinsThresholdMap.id,
				flags: {
					clearedEncounters: [],
					collectedPickups: ['ruins-threshold-cap'],
					resolvedEncounterDrops: {}
				}
			}
		});

		expect(scene.add.image).not.toHaveBeenCalledWith(416, 352, 'starter-pack', 'healFlask');
		expect(scene.add.image).toHaveBeenCalledWith(576, 608, 'starter-pack', 'healFlask');
		expect(scene.add.image).toHaveBeenCalledWith(320, 640, 'starter-pack', 'healFlask');
		const pickupMarkers = phaserState.imageMarkers.filter((marker) => marker.frame === 'healFlask');
		expect(pickupMarkers).toHaveLength(ruinsThresholdMap.pickups!.length - 1);
		expect(pickupMarkers.every((marker) => marker.setDisplaySize.mock.calls[0]![0] === 28)).toBe(
			true
		);
	});

	it('renders NPC markers for maps with NPC definitions', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });

		expect(scene.add.image).not.toHaveBeenCalledWith(256, 144, 'starter-pack', 'titleBadge');
		expect(scene.add.image).not.toHaveBeenCalledWith(256, 144, 'npc-pack', 'miraItemShopNpc');
		expect(scene.add.image).toHaveBeenCalledWith(192, 144, 'npc-pack', 'guildMasterNpc');
		expect(scene.add.image).toHaveBeenCalledWith(352, 144, 'npc-pack', 'quartermasterNpc');
		const npcMarkers = phaserState.imageMarkers.filter(
			(marker) => marker.x === 256 && marker.y === 144 && marker.frame === 'miraItemShopNpc'
		);
		expect(npcMarkers).toHaveLength(0);
		const guildMasterMarkers = phaserState.imageMarkers.filter(
			(marker) => marker.x === 192 && marker.y === 144 && marker.frame === 'guildMasterNpc'
		);
		expect(guildMasterMarkers).toHaveLength(1);
		expect(guildMasterMarkers[0]!.setDisplaySize).toHaveBeenCalledWith(48, 58);
		const quartermasterMarkers = phaserState.imageMarkers.filter(
			(marker) => marker.x === 352 && marker.y === 144 && marker.frame === 'quartermasterNpc'
		);
		expect(quartermasterMarkers).toHaveLength(1);
		expect(quartermasterMarkers[0]!.setDisplaySize).toHaveBeenCalledWith(48, 58);
	});

	it('renders Mira with item shop NPC art', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'item-shop' });

		expect(scene.add.image).toHaveBeenCalledWith(256, 144, 'npc-pack', 'miraItemShopNpc');
		const miraMarkers = phaserState.imageMarkers.filter(
			(marker) => marker.x === 256 && marker.y === 144 && marker.frame === 'miraItemShopNpc'
		);
		expect(miraMarkers).toHaveLength(1);
		expect(miraMarkers[0]!.setDisplaySize).toHaveBeenCalledWith(48, 58);
	});

	it('does not render placeholder NPCs in villager houses', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'villager-house-1' });

		expect(scene.add.image).not.toHaveBeenCalledWith(256, 144, 'starter-pack', 'titleBadge');
		expect(scene.add.image).not.toHaveBeenCalledWith(256, 144, 'npc-pack', 'miraItemShopNpc');
		expect(
			phaserState.imageMarkers.some(
				(marker) =>
					marker.x === 256 &&
					marker.y === 144 &&
					(marker.frame === 'titleBadge' || marker.frame === 'miraItemShopNpc')
			)
		).toBe(false);
	});

	it('publishes nearby NPC status once when the hero enters proximity', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		emitHudStateSpy.mockClear();
		Object.assign(phaserState.playerMarker, { x: 352, y: 144 });

		scene.update(0, 16);
		scene.update(16, 16);

		expect(emitHudStateSpy).toHaveBeenCalledOnce();
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				mapId: 'guild-hall',
				status: 'Quartermaster Vale nearby',
				dialogue: null
			})
		);
	});

	it('allows nearby NPC status to publish again after leaving and re-entering proximity', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'item-shop' });
		emitHudStateSpy.mockClear();

		Object.assign(phaserState.playerMarker, { x: 256, y: 144 });
		scene.update(0, 16);
		Object.assign(phaserState.playerMarker, { x: 64, y: 64 });
		scene.update(16, 16);
		Object.assign(phaserState.playerMarker, { x: 256, y: 144 });
		scene.update(32, 16);

		expect(emitHudStateSpy).toHaveBeenCalledTimes(3);
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Mira nearby',
				dialogue: null
			})
		);
	});

	it('starts Guild Master dialogue instead of status-only NPC text', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 192, y: 144 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				dialogue: expect.objectContaining({
					speaker: 'Guild Master Arlen',
					line: expect.stringContaining('The eastern ruins are stirring again')
				})
			})
		);
	});

	it('starts Guild Master dialogue after a no-NPC fallback prompt', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(0, 16);

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'No one nearby',
				dialogue: expect.objectContaining({
					speaker: 'Traveler',
					line: 'No one is nearby.'
				})
			})
		);

		Object.assign(phaserState.playerMarker, { x: 192, y: 144 });
		scene.update(16, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(32, 16);

		expect(emitHudStateSpy).toHaveBeenCalledOnce();
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Guild Master Arlen nearby',
				dialogue: expect.objectContaining({
					speaker: 'Guild Master Arlen',
					line: expect.stringContaining('The eastern ruins are stirring again')
				})
			})
			);
		});

	it('closes terminal dialogue when advance is pressed at the final line', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({ mapId: 'guild-hall' });
		emitHudStateSpy.mockClear();
		phaserState.interactKeys.e.justDown = true;
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		sceneState.handleHudCommand({ type: 'dialogue-advance' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Dialogue closed',
				dialogue: null
			})
		);
	});

	it('advances dialogue and records Guild Master quest progress at the end of briefing', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
			buildSaveState: () => {
				quests: {
					entries: Record<string, { currentObjectiveId: string }>;
					completedObjectives: Record<string, string[]>;
				};
			};
		};

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 192, y: 144 });
		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);

		sceneState.handleHudCommand({ type: 'dialogue-advance' });
		sceneState.handleHudCommand({ type: 'dialogue-advance' });

		expect(sceneState.buildSaveState().quests.entries['investigate-the-ruins']).toMatchObject({
			currentObjectiveId: 'defeat-ruins-warden'
		});
		expect(
			sceneState.buildSaveState().quests.completedObjectives['investigate-the-ruins']
		).toContain('talk-to-guild-master');
	});

	it('does not complete Guild Master quest progress from stale out-of-range dialogue', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
			buildSaveState: () => {
				quests: {
					entries: Record<string, { currentObjectiveId: string }>;
					completedObjectives: Record<string, string[]>;
				};
			};
		};

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 192, y: 144 });
		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);

		Object.assign(phaserState.playerMarker, { x: 64, y: 64 });
		scene.update(32, 16);
		sceneState.handleHudCommand({ type: 'dialogue-advance' });
		sceneState.handleHudCommand({ type: 'dialogue-advance' });

		expect(sceneState.buildSaveState().quests.entries['investigate-the-ruins']).toMatchObject({
			currentObjectiveId: 'talk-to-guild-master'
		});
		expect(
			sceneState.buildSaveState().quests.completedObjectives['investigate-the-ruins'] ?? []
		).not.toContain('talk-to-guild-master');
	});

	it('accepts a Guild side quest through dialogue choices', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
			buildSaveState: () => {
				quests: { entries: Record<string, { currentObjectiveId: string; progress: number }> };
			};
		};
		const unlockedSave = createNewSaveState();

		scene.create({
			saveState: {
				...unlockedSave,
				mapId: 'guild-hall',
				player: { ...unlockedSave.player, x: 192, y: 144 },
				quests: {
					entries: {
						'investigate-the-ruins': {
							status: 'active',
							currentObjectiveId: 'defeat-ruins-warden',
							progress: 0,
							rewardApplied: false,
							countedSourceIds: []
						}
					},
					completedObjectives: { 'investigate-the-ruins': ['talk-to-guild-master'] }
				}
			}
		});
		Object.assign(phaserState.playerMarker, { x: 192, y: 144 });
		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);

		sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'quest' });
		sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'quest:thin-village-slimes' });
		sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'accept:thin-village-slimes' });

		expect(sceneState.buildSaveState().quests.entries['thin-village-slimes']).toMatchObject({
			currentObjectiveId: 'defeat-village-slimes',
			progress: 0
		});
	});

	it('opens shops through dialogue choices', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 352, y: 144 });
		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);
		emitHudStateSpy.mockClear();

		const sceneState = scene as unknown as { handleHudCommand: (command: HudCommand) => void };
		sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'shop' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				shop: expect.objectContaining({ shopId: 'guild-quartermaster' })
			})
		);
	});

	it('talking through the Guild Master briefing unlocks ruins and publishes Guild quest offers', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
			buildSaveState: () => {
				quests: {
					entries: Record<string, { currentObjectiveId: string; progress: number }>;
					completedObjectives: Record<string, string[]>;
				};
			};
		};

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 192, y: 144 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);
		sceneState.handleHudCommand({ type: 'dialogue-advance' });
		sceneState.handleHudCommand({ type: 'dialogue-advance' });

		expect(sceneState.buildSaveState().quests.entries['investigate-the-ruins']).toMatchObject({
			currentObjectiveId: 'defeat-ruins-warden',
			progress: 0
		});
		expect(
			sceneState.buildSaveState().quests.completedObjectives['investigate-the-ruins']
		).toContain('talk-to-guild-master');
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Ruins route unlocked',
				quests: expect.objectContaining({
					guildOffer: expect.objectContaining({
						quests: expect.arrayContaining([
							expect.objectContaining({ questId: 'thin-village-slimes' })
						])
					})
				})
			})
		);
	});

	it('accepts Guild side quests through HUD commands and seeds cleared village slime progress', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
			buildSaveState: () => {
				quests: { entries: Record<string, { currentObjectiveId: string; progress: number }> };
			};
		};

		const unlockedSave = createNewSaveState();
		scene.create({
			saveState: {
				...unlockedSave,
				mapId: 'guild-hall',
				player: { ...unlockedSave.player, x: 192, y: 144 },
				flags: {
					...unlockedSave.flags,
					clearedEncounters: ['meadow-slime-west', 'meadow-slime-center']
				},
				quests: {
					entries: {
						'investigate-the-ruins': {
							status: 'active',
							currentObjectiveId: 'defeat-ruins-warden',
							progress: 0,
							rewardApplied: false,
							countedSourceIds: []
						}
					},
					completedObjectives: { 'investigate-the-ruins': ['talk-to-guild-master'] }
				}
			}
		});

		sceneState.handleHudCommand({ type: 'accept-quest', questId: 'thin-village-slimes' });

		expect(sceneState.buildSaveState().quests.entries['thin-village-slimes']).toMatchObject({
			currentObjectiveId: 'defeat-village-slimes',
			progress: 2
		});
	});

	it('starts nearby guild shopkeeper dialogue when an interact key is pressed', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 352, y: 144 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);

		expect(emitHudStateSpy).toHaveBeenCalledOnce();
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Quartermaster Vale nearby',
				dialogue: expect.objectContaining({
					speaker: 'Quartermaster Vale',
					choices: expect.arrayContaining([expect.objectContaining({ id: 'shop' })])
				})
			})
		);
	});

	it('shows shop out-of-reach feedback from stale out-of-range shopkeeper dialogue', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({ mapId: 'item-shop' });
		Object.assign(phaserState.playerMarker, { x: 256, y: 144 });
		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);

		Object.assign(phaserState.playerMarker, { x: 64, y: 64 });
		scene.update(32, 16);
		emitHudStateSpy.mockClear();

		sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'shop' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'No shop nearby',
				nearbyShop: null,
				shop: null,
				dialogue: expect.objectContaining({
					speaker: 'Shop',
					line: 'Shop out of reach.'
				})
			})
		);
	});

	it('shows Guild quest feedback from stale out-of-range Guild Master dialogue', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};
		const unlockedSave = createNewSaveState();

		scene.create({
			saveState: {
				...unlockedSave,
				mapId: 'guild-hall',
				player: { ...unlockedSave.player, x: 192, y: 144 },
				quests: {
					entries: {
						'investigate-the-ruins': {
							status: 'active',
							currentObjectiveId: 'defeat-ruins-warden',
							progress: 0,
							rewardApplied: false,
							countedSourceIds: []
						}
					},
					completedObjectives: { 'investigate-the-ruins': ['talk-to-guild-master'] }
				}
			}
		});
		Object.assign(phaserState.playerMarker, { x: 192, y: 144 });
		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);
		sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'quest' });
		sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'quest:thin-village-slimes' });

		Object.assign(phaserState.playerMarker, { x: 64, y: 64 });
		scene.update(32, 16);
		emitHudStateSpy.mockClear();

		sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'accept:thin-village-slimes' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'No Guild quest available',
				dialogue: expect.objectContaining({
					speaker: 'Guild Master Arlen',
					line: 'No Guild quest is available here.'
				})
			})
		);
	});

	it('starts nearby shopkeeper dialogue when an interact key is pressed', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'item-shop' });
		Object.assign(phaserState.playerMarker, { x: 256, y: 144 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.space.justDown = true;
		scene.update(16, 16);

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Mira nearby',
				dialogue: expect.objectContaining({
					speaker: 'Mira',
					choices: expect.arrayContaining([expect.objectContaining({ id: 'shop' })])
				})
			})
		);
	});

	it('consumes multiple interact key edges in the same frame as one interaction', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 352, y: 144 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		phaserState.interactKeys.space.justDown = true;
		phaserState.interactKeys.enter.justDown = true;
		scene.update(16, 16);
		scene.update(32, 16);

		expect(emitHudStateSpy).toHaveBeenCalledOnce();
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Quartermaster Vale nearby',
				dialogue: expect.objectContaining({
					speaker: 'Quartermaster Vale',
					choices: expect.arrayContaining([expect.objectContaining({ id: 'shop' })])
				})
			})
		);
	});

	it('publishes no one nearby when Enter is pressed away from NPCs', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 64, y: 64 });
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.enter.justDown = true;
		scene.update(16, 16);

		expect(emitHudStateSpy).toHaveBeenCalledOnce();
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'No one nearby'
			})
		);
	});

	it.each([
		{
			mapId: 'item-shop',
			x: 256,
			y: 144,
			nearbyShop: {
				shopId: 'miras-item-shop',
				name: "Mira's Item Shop",
				merchantName: 'Mira'
			}
		},
		{
			mapId: 'guild-hall',
			x: 352,
			y: 144,
			nearbyShop: {
				shopId: 'guild-quartermaster',
				name: 'Guild Quartermaster',
				merchantName: 'Quartermaster Vale'
			}
		}
	])(
		'publishes nearby shop metadata for $nearbyShop.shopId',
		async ({ mapId, x, y, nearbyShop }) => {
			const events = await import('$lib/game/ui-bridge/events');
			const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
			const { WorldScene } = await import('./WorldScene');
			const scene = new WorldScene();

			scene.create({ mapId });
			emitHudStateSpy.mockClear();
			Object.assign(phaserState.playerMarker, { x, y });

			scene.update(0, 16);

			expect(emitHudStateSpy).toHaveBeenLastCalledWith(
				expect.objectContaining({
					nearbyShop
				})
			);
		}
	);

	it('opens a nearby shop and publishes buy and sell views', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({ mapId: 'item-shop' });
		Object.assign(phaserState.playerMarker, { x: 256, y: 144 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		sceneState.handleHudCommand({ type: 'open-shop', shopId: 'miras-item-shop' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Shop opened',
				shop: expect.objectContaining({
					shopId: 'miras-item-shop',
					buy: expect.arrayContaining([
						expect.objectContaining({ stockId: 'field-potion', price: 10 })
					]),
					sell: expect.arrayContaining([
						expect.objectContaining({ itemId: 'field-potion', price: 5 })
					])
				})
			})
		);
	});

	it('buys shop items, updates wallet, and persists finite stock', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
			buildSaveState: () => ReturnType<typeof createNewSaveState>;
		};
		const save = createNewSaveState();

		scene.create({
			saveState: {
				...save,
				mapId: 'guild-hall',
				player: { ...save.player, x: 352, y: 144 },
				wallet: { coins: 40 }
			}
		});
		Object.assign(phaserState.playerMarker, { x: 352, y: 144 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		sceneState.handleHudCommand({ type: 'open-shop', shopId: 'guild-quartermaster' });
		sceneState.handleHudCommand({
			type: 'buy-shop-item',
			shopId: 'guild-quartermaster',
			stockId: 'iron-cap'
		});

		const saveState = sceneState.buildSaveState();
		expect(saveState.wallet.coins).toBe(5);
		expect(saveState.inventory.equipment).toContain('iron-cap');
		expect(saveState.shops.stock['guild-quartermaster']?.['iron-cap']).toBe(0);
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Bought Iron Cap',
				wallet: { coins: 5 },
				inventory: expect.objectContaining({
					equipment: expect.arrayContaining([
						expect.objectContaining({ itemId: 'iron-cap', equipped: false })
					])
				}),
				shop: expect.objectContaining({
					sell: expect.arrayContaining([
						expect.objectContaining({ itemId: 'iron-cap', quantity: 1, price: 17 })
					])
				})
			})
		);
	});

	it('sells unequipped items through the active shop', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
			buildSaveState: () => ReturnType<typeof createNewSaveState>;
		};
		const save = createNewSaveState();

		scene.create({
			saveState: {
				...save,
				mapId: 'item-shop',
				player: { ...save.player, x: 256, y: 144 },
				inventory: {
					stacks: [{ itemId: 'field-potion', quantity: 2 }],
					equipment: ['training-sword', 'iron-cap']
				},
				equipment: { ...save.equipment, weapon: 'training-sword' },
				wallet: { coins: 0 }
			}
		});
		Object.assign(phaserState.playerMarker, { x: 256, y: 144 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		sceneState.handleHudCommand({ type: 'open-shop', shopId: 'miras-item-shop' });
		sceneState.handleHudCommand({ type: 'sell-inventory-item', itemId: 'iron-cap' });

		const saveState = sceneState.buildSaveState();
		expect(saveState.wallet.coins).toBe(17);
		expect(saveState.inventory.equipment).toEqual(['training-sword']);
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({ status: 'Sold Iron Cap' })
		);
	});

	it('awards coins when an enemy is defeated once', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ hp: number }>;
			buildSaveState: () => ReturnType<typeof createNewSaveState>;
		};
		const save = createNewSaveState();

		scene.create({ saveState: { ...save, wallet: { coins: 0 } } });
		Object.assign(phaserState.playerMarker, { x: 1_696, y: 832 });
		sceneState.enemies[0]!.hp = 3;

		scene.update(500, 16);
		scene.update(1000, 16);

		expect(sceneState.buildSaveState().wallet.coins).toBe(4);
	});

	it('collects a nearby pickup, updates inventory and flags, hides the marker, and publishes status', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			buildSaveState: () => {
				inventory: { stacks: Array<{ itemId: string; quantity: number }> };
				flags: { collectedPickups: string[] };
			};
			collectedPickupIds: Set<string>;
		};

		scene.create({ mapId: 'ruins-threshold' });
		const marker = phaserState.imageMarkers.find(
			(imageMarker) => imageMarker.x === 320 && imageMarker.y === 640
		)!;
		Object.assign(phaserState.playerMarker, { x: 320, y: 640 });

		scene.update(0, 16);

		const saveState = sceneState.buildSaveState();
		expect(saveState.inventory.stacks).toContainEqual({ itemId: 'sunleaf-salve', quantity: 2 });
		expect(saveState.flags.collectedPickups).toContain('ruins-threshold-salve');
		expect(sceneState.collectedPickupIds.has('ruins-threshold-salve')).toBe(true);
		expect(marker.setVisible).toHaveBeenCalledWith(false);
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({ status: 'Found Sunleaf Salve' })
		);
	});

	it('preserves loaded wallet and finite shop stock when building saves', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			buildSaveState: () => {
				wallet: { coins: number };
				shops: { stock: Record<string, Record<string, number>> };
			};
		};

		scene.create({
			saveState: {
				...createNewSaveState(),
				wallet: { coins: 12 },
				shops: {
					stock: {
						'guild-quartermaster': {
							'iron-cap': 0,
							'grip-wraps': 1,
							'traveler-vest': 0
						}
					}
				}
			}
		});

		expect(sceneState.buildSaveState()).toMatchObject({
			wallet: { coins: 12 },
			shops: {
				stock: {
					'guild-quartermaster': {
						'iron-cap': 0,
						'grip-wraps': 1,
						'traveler-vest': 0
					}
				}
			}
		});
	});

	it('equips owned equipment and publishes effective combat stats', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({
			saveState: {
				...createNewSaveState(),
				inventory: {
					stacks: [],
					equipment: ['ruin-blade', 'stone-mail']
				},
				equipment: {
					weapon: null,
					head: null,
					body: null,
					hands: null,
					accessory: null
				}
			}
		});
		sceneState.handleHudCommand({ type: 'equip-item', itemId: 'ruin-blade' });
		sceneState.handleHudCommand({ type: 'equip-item', itemId: 'stone-mail' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				attack: 5,
				defense: 1,
				maxHp: 26,
				inventory: expect.objectContaining({
					equipped: expect.objectContaining({
						weapon: 'ruin-blade',
						body: 'stone-mail'
					})
				})
			})
		);
	});

	it('unequips a max HP item and clamps current HP to the lower max', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: HudCommand) => void;
		};

		scene.create({
			saveState: {
				...createNewSaveState(),
				player: {
					...createNewSaveState().player,
					hp: 26
				},
				inventory: {
					stacks: [],
					equipment: ['stone-mail']
				},
				equipment: {
					weapon: null,
					head: null,
					body: 'stone-mail',
					hands: null,
					accessory: null
				}
			}
		});
		sceneState.handleHudCommand({ type: 'unequip-slot', slot: 'body' });

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				hp: 20,
				maxHp: 20,
				defense: 0,
				inventory: expect.objectContaining({
					equipped: expect.objectContaining({ body: null })
				})
			})
		);
	});

	it('defeats an enemy within the melee attack window and applies the xp reward', async () => {
		const progression = await import('$lib/game/core/progression');
		const applyExperienceGainSpy = vi.spyOn(progression, 'applyExperienceGain');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ hp: number; x: number }>;
			playerProgress: { level: number; xp: number };
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 1_696, y: 832 });
		sceneState.enemies[0]!.hp = 3;

		scene.update(0, 16);

		expect(applyExperienceGainSpy).toHaveBeenCalledWith({ level: 1, xp: 0, hp: 20, attack: 3 }, 4);
		expect(phaserState.enemyHealthBarFill.setScale).toHaveBeenCalledWith(0, 1);
		expect(sceneState.playerProgress).toMatchObject({ level: 1, xp: 4 });
		expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('slimeScout-dead', false);
	});

	it('plays enemy walk while chasing and attack when contact damage lands', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ x: number; y: number; attackCooldownUntil: number }>;
		};

		scene.create({ mapId: 'ruins-core' });
		phaserState.enemyMarker.play.mockClear();
		Object.assign(phaserState.playerMarker, { x: 456, y: 480 });

		scene.update(0, 1000);

		expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('ruinsWarden-walk', true);

		phaserState.enemyMarker.play.mockClear();
		Object.assign(phaserState.playerMarker, {
			x: sceneState.enemies[0]!.x,
			y: sceneState.enemies[0]!.y
		});
		sceneState.enemies[0]!.attackCooldownUntil = 0;
		scene.update(500, 16);

		expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('ruinsWarden-attack', false);

		phaserState.enemyMarker.play.mockClear();
		scene.update(600, 16);

		expect(phaserState.enemyMarker.play).not.toHaveBeenCalledWith('ruinsWarden-idle', true);
		expect(phaserState.enemyMarker.play).not.toHaveBeenCalledWith('ruinsWarden-walk', true);
	});

	it('shows enemy hit impact on the hero and clears the hurt reaction', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ attackCooldownUntil: number }>;
		};

		scene.create({ mapId: 'ruins-core' });
		Object.assign(phaserState.playerMarker, { x: 600, y: 480 });
		sceneState.enemies[0]!.attackCooldownUntil = 0;
		phaserState.playerMarker.setTint.mockClear();
		phaserState.playerMarker.clearTint.mockClear();

		scene.update(500, 16);

		expect(phaserState.playerMarker.setTint).toHaveBeenCalledWith(0xfff0a8);

		scene.update(700, 16);

		expect(phaserState.playerMarker.clearTint).not.toHaveBeenCalled();

		scene.update(980, 16);

		expect(phaserState.playerMarker.clearTint).toHaveBeenCalled();
	});

	it('keeps enemies at a readable melee distance while chasing', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ x: number; y: number }>;
			playerProgress: { hp: number };
		};

		scene.create({ mapId: 'ruins-core' });
		Object.assign(phaserState.playerMarker, { x: 560, y: 480 });

		scene.update(0, 10_000);
		scene.update(500, 10_000);
		scene.update(1000, 10_000);

		expect(sceneState.enemies[0]!.x).toBe(600);
		expect(sceneState.enemies[0]!.y).toBe(480);
		expect(sceneState.playerProgress.hp).toBe(15);
	});

	it('plays enemy dead animation before hiding encounter art and health bars', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		let deathCallback: (() => void) | undefined;
		phaserState.enemyMarker.once.mockImplementation((_event: string, callback: () => void) => {
			deathCallback = callback;
			return phaserState.enemyMarker;
		});

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 1_696, y: 832 });
		(scene as unknown as { enemies: Array<{ hp: number }> }).enemies[0]!.hp = 3;

		scene.update(0, 16);

		expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('slimeScout-dead', false);
		expect(phaserState.enemyMarker.setVisible).not.toHaveBeenCalledWith(false);

		deathCallback?.();

		expect(phaserState.enemyMarker.setVisible).toHaveBeenCalledWith(false);
		expect(phaserState.enemyHealthBarBg.setVisible).toHaveBeenCalledWith(false);
		expect(phaserState.enemyHealthBarFill.setVisible).toHaveBeenCalledWith(false);
	});

	it('awards deterministic encounter drops on defeat and saves resolved drops', async () => {
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			buildSaveState: () => {
				inventory: { stacks: Array<{ itemId: string; quantity: number }> };
				flags: {
					resolvedEncounterDrops: Record<string, Array<{ itemId: string; quantity: number }>>;
				};
			};
		};

		try {
			scene.create({ mapId: 'meadow-entry' });
			Object.assign(phaserState.playerMarker, { x: 1_696, y: 832 });
			(scene as unknown as { enemies: Array<{ hp: number }> }).enemies[0]!.hp = 3;

			scene.update(0, 16);

			expect(sceneState.buildSaveState()).toMatchObject({
				inventory: { stacks: [{ itemId: 'field-potion', quantity: 2 }] },
				flags: {
					resolvedEncounterDrops: { 'meadow-slime-west': [{ itemId: 'field-potion', quantity: 1 }] }
				}
			});
		} finally {
			randomSpy.mockRestore();
		}
	});

	it('reuses loaded encounter drops without rerolling them', async () => {
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			buildSaveState: () => {
				inventory: { stacks: Array<{ itemId: string; quantity: number }> };
				flags: {
					resolvedEncounterDrops: Record<string, Array<{ itemId: string; quantity: number }>>;
				};
			};
		};

		try {
			scene.create({
				saveState: {
					...createNewSaveState(),
					mapId: 'meadow-entry',
					flags: {
						clearedEncounters: [],
						collectedPickups: [],
						resolvedEncounterDrops: {
							'meadow-slime-west': [{ itemId: 'greater-field-potion', quantity: 1 }]
						}
					},
					inventory: {
						stacks: [],
						equipment: ['training-sword']
					}
				}
			});
			Object.assign(phaserState.playerMarker, { x: 1_696, y: 832 });
			(scene as unknown as { enemies: Array<{ hp: number }> }).enemies[0]!.hp = 3;

			scene.update(0, 16);

			expect(randomSpy).not.toHaveBeenCalled();
			expect(sceneState.buildSaveState()).toMatchObject({
				inventory: { stacks: [{ itemId: 'greater-field-potion', quantity: 1 }] },
				flags: {
					resolvedEncounterDrops: {
						'meadow-slime-west': [{ itemId: 'greater-field-potion', quantity: 1 }]
					}
				}
			});
		} finally {
			randomSpy.mockRestore();
		}
	});

	it('auto attacks enemies in range without manual input', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ hp: number }>;
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 1_696, y: 832 });

		scene.update(0, 16);

		expect(sceneState.enemies[0]!.hp).toBe(4);
	});

	it('does not auto attack again before the cooldown elapses', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ hp: number; maxHp: number; invulnerableUntil: number; defeated: boolean }>;
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 1_696, y: 832 });
		Object.assign(sceneState.enemies[0]!, {
			hp: 9,
			maxHp: 9,
			invulnerableUntil: 0,
			defeated: false
		});

		scene.update(0, 16);
		scene.update(200, 16);
		scene.update(400, 16);

		expect(sceneState.enemies[0]!.hp).toBe(5);
		expect(phaserState.enemyHealthBarFill.setScale).toHaveBeenLastCalledWith(
			expect.closeTo(5 / 9, 5),
			1
		);
	});

	it('keeps awarding xp after level 2 without throwing', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ hp: number }>;
			playerProgress: { level: number; xp: number; hp: number; attack: number };
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 1_696, y: 832 });
		sceneState.playerProgress = { level: 2, xp: 5, hp: 24, attack: 4 };
		sceneState.enemies[0]!.hp = 4;

		expect(() => scene.update(0, 16)).not.toThrow();
		expect(sceneState.playerProgress).toEqual({ level: 2, xp: 9, hp: 24, attack: 4 });
	});

	it('side quest completion from combat grants rewards once', async () => {
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(1);
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ hp: number }>;
			buildSaveState: () => {
				wallet: { coins: number };
				inventory: { stacks: Array<{ itemId: string; quantity: number }> };
				quests: {
					entries: Record<string, { status: string; progress: number; rewardApplied: boolean }>;
				};
			};
		};

		try {
			const save = createNewSaveState();
			scene.create({
				saveState: {
					...save,
					mapId: 'meadow-entry',
					wallet: { coins: 0 },
					flags: {
						...save.flags,
						clearedEncounters: ['meadow-slime-west', 'meadow-slime-center']
					},
					quests: {
						entries: {
							'investigate-the-ruins': {
								status: 'active',
								currentObjectiveId: 'defeat-ruins-warden',
								progress: 0,
								rewardApplied: false,
								countedSourceIds: []
							},
							'thin-village-slimes': {
								status: 'active',
								currentObjectiveId: 'defeat-village-slimes',
								progress: 2,
								rewardApplied: false,
								countedSourceIds: ['encounter:meadow-slime-west', 'encounter:meadow-slime-center']
							}
						},
						completedObjectives: { 'investigate-the-ruins': ['talk-to-guild-master'] }
					}
				}
			});
			Object.assign(phaserState.playerMarker, { x: 2_304, y: 512 });
			sceneState.enemies[2]!.hp = 3;

			scene.update(500, 16);
			scene.update(1000, 16);

			const completedSave = sceneState.buildSaveState();
			expect(completedSave.quests.entries['thin-village-slimes']).toMatchObject({
				status: 'completed',
				progress: 3,
				rewardApplied: true
			});
			expect(completedSave.wallet.coins).toBe(16);
			expect(completedSave.inventory.stacks).toContainEqual({
				itemId: 'field-potion',
				quantity: 2
			});
		} finally {
			randomSpy.mockRestore();
		}
	});

	it('blocks the ruins route until the Guild Master objective is complete', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'meadow-entry',
				flags: {
					clearedEncounters: ['meadow-slime-east', 'meadow-slime-center', 'meadow-slime-west'],
					collectedPickups: [],
					resolvedEncounterDrops: {}
				}
			}
		});
		emitHudStateSpy.mockClear();
		Object.assign(phaserState.playerMarker, { x: 2_304, y: 704 });

		scene.update(0, 16);

		expect(scene.scene.restart).not.toHaveBeenCalled();
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({ status: 'Report to the Guild Master first' })
		);
	});

	it('moves into the ruins after the opening encounter is cleared and the exit is reached', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const save = createNewSaveState();

		scene.create({
			saveState: {
				...save,
				mapId: 'meadow-entry',
				flags: {
					clearedEncounters: ['meadow-slime-center', 'meadow-slime-east', 'meadow-slime-west'],
					collectedPickups: [],
					resolvedEncounterDrops: {}
				},
				quests: {
					entries: {
						'investigate-the-ruins': {
							status: 'active',
							currentObjectiveId: 'defeat-ruins-warden',
							progress: 0,
							rewardApplied: false,
							countedSourceIds: []
						}
					},
					completedObjectives: { 'investigate-the-ruins': ['talk-to-guild-master'] }
				}
			}
		});

		Object.assign(phaserState.playerMarker, { x: 2_304, y: 704 });
		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'ruins-threshold',
				player: expect.objectContaining({
					x: 256,
					y: 480,
					facing: 'right'
				})
			})
		});
	});

	it('allows peaceful village building transitions while road enemies are alive', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'meadow-entry',
				flags: {
					clearedEncounters: [],
					collectedPickups: [],
					resolvedEncounterDrops: {}
				}
			}
		});
		Object.assign(phaserState.playerMarker, { x: 384, y: 1_344 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'hero-house',
				player: expect.objectContaining({
					x: 256,
					y: 224,
					facing: 'up'
				})
			})
		});
	});

	it('returns from the hero house to a safe point below the exterior doorway', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'hero-house'
			}
		});
		Object.assign(phaserState.playerMarker, { x: 256, y: 336 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'meadow-entry',
				player: expect.objectContaining({
					x: 384,
					y: 1_456,
					facing: 'down'
				})
			})
		});
	});

	it('returns from the ruins to a spawn point near the meadow entrance', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'ruins-threshold',
				flags: {
					clearedEncounters: ['threshold-slime-east', 'threshold-slime-west'],
					collectedPickups: [],
					resolvedEncounterDrops: {}
				}
			}
		});
		Object.assign(phaserState.playerMarker, { x: 128, y: 480 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'meadow-entry',
				player: expect.objectContaining({
					x: 2_176,
					y: 704,
					facing: 'left'
				})
			})
		});
	});

	it('moves from the ruins threshold into the core when the far exit is reached', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'ruins-threshold',
				flags: {
					clearedEncounters: ['threshold-slime-east', 'threshold-slime-west'],
					collectedPickups: [],
					resolvedEncounterDrops: {}
				}
			}
		});
		Object.assign(phaserState.playerMarker, { x: 704, y: 480 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'ruins-core',
				player: expect.objectContaining({
					x: 256,
					y: 480,
					facing: 'right'
				})
			})
		});
	});

	it('blocks transitions while any map enemy is still alive', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'meadow-entry',
				flags: {
					clearedEncounters: ['meadow-slime-west', 'meadow-slime-center'],
					collectedPickups: [],
					resolvedEncounterDrops: {}
				}
			}
		});
		Object.assign(phaserState.playerMarker, { x: 2_304, y: 704 });

		scene.update(0, 16);

		expect(scene.scene.restart).not.toHaveBeenCalled();
	});

	it('returns from the ruins core to the threshold after the boss encounter is cleared', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'ruins-core',
				flags: {
					clearedEncounters: ['ruins-warden'],
					collectedPickups: [],
					resolvedEncounterDrops: {}
				}
			}
		});
		Object.assign(phaserState.playerMarker, { x: 128, y: 480 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'ruins-threshold',
				player: expect.objectContaining({
					x: 576,
					y: 480,
					facing: 'left'
				})
			})
		});
	});

	it('boots transitions with an area-entry status instead of save resumed', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			reason: 'transition',
			saveState: {
				...createNewSaveState(),
				mapId: 'ruins-threshold'
			}
		});

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({ status: 'Entered area' })
		);
	});

	it('preserves loaded item flags when building transition saves', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: 'ruins-threshold',
				flags: {
					clearedEncounters: ['threshold-slime-east', 'threshold-slime-west'],
					collectedPickups: ['meadow-cache'],
					resolvedEncounterDrops: {
						'threshold-slime-east': [{ itemId: 'field-potion', quantity: 1 }]
					}
				}
			}
		});
		Object.assign(phaserState.playerMarker, { x: 704, y: 480 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				flags: {
					clearedEncounters: ['threshold-slime-east', 'threshold-slime-west'],
					collectedPickups: ['meadow-cache'],
					resolvedEncounterDrops: {
						'threshold-slime-east': [{ itemId: 'field-potion', quantity: 1 }]
					}
				}
			})
		});
	});

	it('keeps meadow slimes inside the forest zone while chasing', async () => {
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ x: number; y: number; movementMode: string }>;
		};

		scene.create({ mapId: meadowEntryMap.id });
		Object.assign(phaserState.playerMarker, { x: 1_472, y: 832 });

		scene.update(0, 1_000);

		const forestZone = meadowEntryMap.forestZone!;
		const left = forestZone.x - forestZone.width / 2;
		for (const enemy of sceneState.enemies) {
			expect(enemy.x).toBeGreaterThanOrEqual(left);
		}
		expect(sceneState.enemies[0]!.movementMode).toBe('chase');
	});

	it('keeps an engaged meadow slime chasing inside the forest leash beyond aggro range', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ x: number; y: number; movementMode: string }>;
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(sceneState.enemies[0]!, { x: 1_500, y: 832, movementMode: 'chase' });
		Object.assign(phaserState.playerMarker, { x: 2_000, y: 832 });
		const startX = sceneState.enemies[0]!.x;

		scene.update(0, 1_000);

		expect(sceneState.enemies[0]!.movementMode).toBe('chase');
		expect(sceneState.enemies[0]!.x).toBeGreaterThan(startX);
	});

	it('returns meadow slimes home after the hero escapes the forest', async () => {
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ x: number; y: number; homeX: number; homeY: number; movementMode: string }>;
		};

		scene.create({ mapId: meadowEntryMap.id });
		Object.assign(phaserState.playerMarker, { x: 1_472, y: 832 });
		scene.update(0, 1_000);

		const chasedX = sceneState.enemies[0]!.x;
		Object.assign(phaserState.playerMarker, { x: 1_200, y: 832 });
		scene.update(1_000, 1_000);

		expect(sceneState.enemies[0]!.movementMode).toBe('return');
		expect(sceneState.enemies[0]!.x).toBeGreaterThan(chasedX);
		expect(sceneState.enemies[0]!.x).toBeLessThanOrEqual(sceneState.enemies[0]!.homeX);
		expect(sceneState.enemies[0]!.y).toBe(sceneState.enemies[0]!.homeY);
	});

	it('prevents returning meadow slimes from attacking after the hero leaves the forest', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ x: number; y: number; movementMode: string }>;
			playerProgress: { hp: number };
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(sceneState.enemies[0]!, { x: 1_490, y: 832, movementMode: 'chase' });
		Object.assign(phaserState.playerMarker, { x: 1_455, y: 832 });
		const hpBeforeReturn = sceneState.playerProgress.hp;

		scene.update(1_000, 16);

		expect(sceneState.enemies[0]!.movementMode).toBe('return');
		expect(sceneState.playerProgress.hp).toBe(hpBeforeReturn);
	});

	it('keeps ruins slimes on the existing direct chase behavior', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ x: number; movementMode: string }>;
		};

		scene.create({ mapId: 'ruins-threshold' });
		Object.assign(phaserState.playerMarker, { x: 256, y: 480 });

		scene.update(0, 1_000);

		expect(sceneState.enemies[0]!.x).toBeLessThan(416);
		expect(sceneState.enemies[0]!.movementMode).toBe('chase');
	});

	it('bosses chase, strike back, and enrage in phase 2', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ x: number; hp: number }>;
			playerProgress: { hp: number };
		};

		scene.create({ mapId: 'ruins-core' });
		Object.assign(phaserState.playerMarker, { x: 456, y: 480 });

		scene.update(0, 1000);

		expect(sceneState.enemies[0]!.x).toBeLessThan(640);

		Object.assign(phaserState.playerMarker, { x: sceneState.enemies[0]!.x, y: 480 });
		scene.update(500, 16);

		expect(sceneState.playerProgress.hp).toBe(15);

		sceneState.enemies[0]!.hp = 22;
		scene.update(1000, 16);

		expect(phaserState.enemyMarker.setTint).toHaveBeenCalledWith(0xff8a3d);
	});

	it('does not defeat the boss with one opening hit', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemies: Array<{ hp: number; defeated: boolean }>;
		};

		scene.create({ mapId: 'ruins-core' });
		Object.assign(phaserState.playerMarker, { x: 640, y: 480 });

		scene.update(0, 16);

		expect(sceneState.enemies[0]).toMatchObject({ hp: 41, defeated: false });
		expect(scene.add.text).not.toHaveBeenCalled();
	});

	it('shows a victory state after defeating the boss encounter', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'ruins-core' });
		Object.assign(phaserState.playerMarker, { x: 640, y: 480 });
		(scene as unknown as { enemies: Array<{ hp: number }> }).enemies[0]!.hp = 3;

		scene.update(0, 16);

		expect(scene.add.text).toHaveBeenCalledWith(
			expect.any(Number),
			expect.any(Number),
			expect.stringMatching(/victory/i),
			expect.anything()
		);
	});
});
