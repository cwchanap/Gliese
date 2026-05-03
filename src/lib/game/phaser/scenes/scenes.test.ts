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
	function createAnimatedMarker() {
		const marker: {
			x: number;
			y: number;
			frame: string | undefined;
			visible: boolean;
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

	function createOverlayMarker() {
		const marker = {
			x: 0,
			y: 0,
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
			setVisible: vi.fn((visible: boolean) => {
				marker.visible = visible;
				return marker;
			})
		};

		return marker;
	}

	const enemyHealthBarBg = createOverlayMarker();
	const enemyHealthBarFill = createOverlayMarker();
	const attackFlash = createOverlayMarker();
	const victoryOverlay = createOverlayMarker();
	const rectangleQueue = [enemyHealthBarBg, enemyHealthBarFill, attackFlash, victoryOverlay];

	function createImage(x: number, y: number, _texture: string, frame?: string) {
		if (frame === 'hero' || frame?.startsWith('hero')) {
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
			enemyMarker.x = x;
			enemyMarker.y = y;
			enemyMarker.frame = frame;
			return enemyMarker;
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
			image: vi.fn(createImage),
			sprite: vi.fn(createImage),
			rectangle: vi.fn(() => rectangleQueue.shift() ?? createOverlayMarker()),
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
				addKey: vi.fn()
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
		playerMarker,
		enemyMarker,
		enemyHealthBarBg,
		enemyHealthBarFill,
		attackFlash,
		victoryText,
		textureMock,
		tilemap,
		tilemapLayer,
		imageMarkers,
		reset() {
			Object.assign(playerMarker, { x: 0, y: 0, frame: undefined, visible: true });
			Object.assign(enemyMarker, { x: 0, y: 0, frame: undefined, visible: true });
			imageMarkers.splice(0, imageMarkers.length);
			playerMarker.setDisplaySize.mockClear();
			playerMarker.setTint.mockClear();
			playerMarker.setVisible.mockReset();
			playerMarker.play.mockReset();
			playerMarker.once.mockReset();
			enemyMarker.setDisplaySize.mockClear();
			enemyMarker.setVisible.mockReset();
			enemyMarker.setTint.mockReset();
			enemyMarker.play.mockReset();
			enemyMarker.once.mockReset();
			Object.assign(enemyHealthBarBg, { x: 0, y: 0, scaleX: 1, scaleY: 1, visible: true });
			Object.assign(enemyHealthBarFill, { x: 0, y: 0, scaleX: 1, scaleY: 1, visible: true });
			Object.assign(attackFlash, { x: 0, y: 0, scaleX: 1, scaleY: 1, visible: true });
			enemyHealthBarBg.setPosition.mockReset();
			enemyHealthBarBg.setScale.mockReset();
			enemyHealthBarBg.setVisible.mockReset();
			enemyHealthBarFill.setPosition.mockReset();
			enemyHealthBarFill.setScale.mockReset();
			enemyHealthBarFill.setVisible.mockReset();
			attackFlash.setPosition.mockReset();
			attackFlash.setScale.mockReset();
			attackFlash.setVisible.mockReset();
			textureMock.has.mockClear();
			textureMock.add.mockClear();
			tilemap.addTilesetImage.mockClear();
			tilemap.createLayer.mockClear();
			tilemapLayer.setDepth.mockClear();
			victoryText.setOrigin.mockReset();
			rectangleQueue.splice(
				0,
				rectangleQueue.length,
				enemyHealthBarBg,
				enemyHealthBarFill,
				attackFlash,
				victoryOverlay
			);
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
					SPACE: 'SPACE'
				}
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
		const { animationPackAsset, starterPackAsset } = await import('$lib/game/content/assets');
		const { BootScene } = await import('./BootScene');
		const scene = new BootScene();

		scene.preload();

		expect(scene.load.image).toHaveBeenCalledWith(starterPackAsset.key, starterPackAsset.path);
		expect(scene.load.image).toHaveBeenCalledWith(animationPackAsset.key, animationPackAsset.path);
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
		expect(scene.add.sprite).toHaveBeenCalledWith(
			1_280,
			1_280,
			'animation-pack',
			'slimeScoutIdle0'
		);
		expect(scene.add.image).toHaveBeenCalledWith(2_304, 1_280, 'starter-pack', 'doorwayTile');
		expect(scene.cameras.main.setBackgroundColor).toHaveBeenCalledWith('#1a1f2b');
	});

	it('registers animation pack frames and creates animated hero and enemy sprites', async () => {
		const { animationPackAsset } = await import('$lib/game/content/assets');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });

		expect(scene.add.sprite).toHaveBeenCalledWith(256, 1_280, 'animation-pack', 'heroIdle0');
		expect(scene.add.sprite).toHaveBeenCalledWith(
			1_280,
			1_280,
			'animation-pack',
			'slimeScoutIdle0'
		);
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
		Object.assign(phaserState.playerMarker, { x: 1_280, y: 1_280 });

		scene.update(0, 16);

		expect(phaserState.playerMarker.play).toHaveBeenCalledWith('hero-attack', false);
	});

	it('plays hero dead and stops movement when HP reaches zero', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
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

	it('renders uncollected pickups using flask art and skips pickups collected in a save', async () => {
		const { createNewSaveState } = await import('$lib/game/save/save-state');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({
			saveState: {
				...createNewSaveState(),
				mapId: meadowEntryMap.id,
				flags: {
					clearedEncounters: [],
					collectedPickups: ['meadow-entry-potion'],
					resolvedEncounterDrops: {}
				}
			}
		});

		expect(scene.add.image).not.toHaveBeenCalledWith(512, 1_184, 'starter-pack', 'healFlask');
		expect(scene.add.image).toHaveBeenCalledWith(896, 1_408, 'starter-pack', 'healFlask');
		expect(scene.add.image).toHaveBeenCalledWith(1_024, 1_152, 'starter-pack', 'healFlask');
		const pickupMarkers = phaserState.imageMarkers.filter((marker) => marker.frame === 'healFlask');
		expect(pickupMarkers).toHaveLength(meadowEntryMap.pickups!.length - 1);
		expect(pickupMarkers.every((marker) => marker.setDisplaySize.mock.calls[0]![0] === 28)).toBe(
			true
		);
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

		scene.create({ mapId: 'meadow-entry' });
		const marker = phaserState.imageMarkers.find(
			(imageMarker) => imageMarker.x === 512 && imageMarker.y === 1_184
		)!;
		Object.assign(phaserState.playerMarker, { x: 512, y: 1_184 });

		scene.update(0, 16);

		const saveState = sceneState.buildSaveState();
		expect(saveState.inventory.stacks).toContainEqual({ itemId: 'field-potion', quantity: 3 });
		expect(saveState.flags.collectedPickups).toContain('meadow-entry-potion');
		expect(sceneState.collectedPickupIds.has('meadow-entry-potion')).toBe(true);
		expect(marker.setVisible).toHaveBeenCalledWith(false);
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({ status: 'Found Field Potion' })
		);
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
		const sceneState = scene as unknown as { playerProgress: { level: number; xp: number } };

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 1_280, y: 1_280 });

		scene.update(0, 16);

		expect(applyExperienceGainSpy).toHaveBeenCalledWith({ level: 1, xp: 0, hp: 20, attack: 3 }, 5);
		expect(phaserState.attackFlash.setVisible).toHaveBeenCalledWith(true);
		expect(phaserState.enemyHealthBarFill.setScale).toHaveBeenCalledWith(0, 1);
		expect(sceneState.playerProgress).toMatchObject({ level: 2, xp: 5 });
		expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('slimeScout-dead', false);
	});

	it('plays enemy walk while chasing and attack when contact damage lands', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemy: { x: number; y: number; attackCooldownUntil: number };
		};

		scene.create({ mapId: 'ruins-core' });
		phaserState.enemyMarker.play.mockClear();
		Object.assign(phaserState.playerMarker, { x: 456, y: 480 });

		scene.update(0, 1000);

		expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('ruinsWarden-walk', true);

		phaserState.enemyMarker.play.mockClear();
		Object.assign(phaserState.playerMarker, { x: sceneState.enemy.x, y: sceneState.enemy.y });
		sceneState.enemy.attackCooldownUntil = 0;
		scene.update(500, 16);

		expect(phaserState.enemyMarker.play).toHaveBeenCalledWith('ruinsWarden-attack', false);

		phaserState.enemyMarker.play.mockClear();
		scene.update(600, 16);

		expect(phaserState.enemyMarker.play).not.toHaveBeenCalledWith('ruinsWarden-idle', true);
		expect(phaserState.enemyMarker.play).not.toHaveBeenCalledWith('ruinsWarden-walk', true);
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
		Object.assign(phaserState.playerMarker, { x: 1_280, y: 1_280 });

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
			Object.assign(phaserState.playerMarker, { x: 1_280, y: 1_280 });

			scene.update(0, 16);

			expect(sceneState.buildSaveState()).toMatchObject({
				inventory: { stacks: [{ itemId: 'field-potion', quantity: 2 }] },
				flags: {
					resolvedEncounterDrops: { 'slime-scout': [{ itemId: 'field-potion', quantity: 1 }] }
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
							'slime-scout': [{ itemId: 'greater-field-potion', quantity: 1 }]
						}
					},
					inventory: {
						stacks: [],
						equipment: ['training-sword']
					}
				}
			});
			Object.assign(phaserState.playerMarker, { x: 1_280, y: 1_280 });

			scene.update(0, 16);

			expect(randomSpy).not.toHaveBeenCalled();
			expect(sceneState.buildSaveState()).toMatchObject({
				inventory: { stacks: [{ itemId: 'greater-field-potion', quantity: 1 }] },
				flags: {
					resolvedEncounterDrops: {
						'slime-scout': [{ itemId: 'greater-field-potion', quantity: 1 }]
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
			enemy: { hp: number };
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 1_280, y: 1_280 });

		scene.update(0, 16);

		expect(sceneState.enemy.hp).toBe(0);
	});

	it('does not auto attack again before the cooldown elapses', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemy: { hp: number; maxHp: number; invulnerableUntil: number; defeated: boolean };
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 1_280, y: 1_280 });
		Object.assign(sceneState.enemy, { hp: 9, maxHp: 9, invulnerableUntil: 0, defeated: false });

		scene.update(0, 16);
		scene.update(200, 16);
		scene.update(400, 16);

		expect(sceneState.enemy.hp).toBe(5);
		expect(phaserState.enemyHealthBarFill.setScale).toHaveBeenLastCalledWith(
			expect.closeTo(5 / 9, 5),
			1
		);
	});

	it('keeps awarding xp after level 2 without throwing', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			playerProgress: { level: number; xp: number; hp: number; attack: number };
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 1_280, y: 1_280 });
		sceneState.playerProgress = { level: 2, xp: 5, hp: 24, attack: 4 };

		expect(() => scene.update(0, 16)).not.toThrow();
		expect(sceneState.playerProgress).toEqual({ level: 2, xp: 10, hp: 24, attack: 4 });
	});

	it('moves into the ruins after the opening encounter is cleared and the exit is reached', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 1_280, y: 1_280 });
		scene.update(0, 16);

		Object.assign(phaserState.playerMarker, { x: 2_304, y: 1_280 });
		scene.update(200, 16);

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

	it('returns from the ruins to a spawn point near the meadow entrance', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'ruins-threshold' });
		Object.assign(phaserState.playerMarker, { x: 128, y: 480 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'meadow-entry',
				player: expect.objectContaining({
					x: 2_176,
					y: 1_280,
					facing: 'left'
				})
			})
		});
	});

	it('moves from the ruins threshold into the core when the far exit is reached', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'ruins-threshold' });
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
					clearedEncounters: ['slime-scout'],
					collectedPickups: ['meadow-cache'],
					resolvedEncounterDrops: {
						'slime-scout': [{ itemId: 'field-potion', quantity: 1 }]
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
					clearedEncounters: ['slime-scout'],
					collectedPickups: ['meadow-cache'],
					resolvedEncounterDrops: {
						'slime-scout': [{ itemId: 'field-potion', quantity: 1 }]
					}
				}
			})
		});
	});

	it('bosses chase, strike back, and enrage in phase 2', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemy: { x: number; hp: number };
			playerProgress: { hp: number };
		};

		scene.create({ mapId: 'ruins-core' });
		Object.assign(phaserState.playerMarker, { x: 456, y: 480 });

		scene.update(0, 1000);

		expect(sceneState.enemy.x).toBeLessThan(640);

		Object.assign(phaserState.playerMarker, { x: sceneState.enemy.x, y: 480 });
		scene.update(500, 16);

		expect(sceneState.playerProgress.hp).toBe(16);

		scene.update(1000, 16);
		scene.update(1500, 16);

		expect(phaserState.enemyMarker.setTint).toHaveBeenCalledWith(0xff8a3d);
	});

	it('shows a victory state after defeating the boss encounter', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'ruins-core' });
		Object.assign(phaserState.playerMarker, { x: 640, y: 480 });

		scene.update(0, 16);
		scene.update(500, 16);
		scene.update(1000, 16);

		expect(scene.add.text).toHaveBeenCalledWith(
			expect.any(Number),
			expect.any(Number),
			expect.stringMatching(/victory/i),
			expect.anything()
		);
	});
});
