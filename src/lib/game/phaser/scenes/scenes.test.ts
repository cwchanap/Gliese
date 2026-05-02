import { beforeEach, describe, expect, it, vi } from 'vitest';

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
	const playerMarker = {
		x: 0,
		y: 0,
		setDisplaySize: vi.fn((...args: unknown[]) => {
			void args;
			return playerMarker;
		})
	};
	const enemyMarker = {
		x: 0,
		y: 0,
		setDisplaySize: vi.fn((...args: unknown[]) => {
			void args;
			return enemyMarker;
		}),
		setTint: vi.fn(),
		setVisible: vi.fn()
	};
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
		if (frame === 'hero') {
			playerMarker.x = x;
			playerMarker.y = y;
			return playerMarker;
		}

		if (frame === 'slimeScout' || frame === 'ruinsWarden') {
			enemyMarker.x = x;
			enemyMarker.y = y;
			return enemyMarker;
		}

		return {
			x,
			y,
			setDisplaySize() {
				return this;
			}
		};
	}

	class SceneMock {
		scene = { start: vi.fn(), restart: vi.fn() };
		add = {
			image: vi.fn(createImage),
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
		reset() {
			Object.assign(enemyMarker, { x: 0, y: 0 });
			playerMarker.setDisplaySize.mockClear();
			enemyMarker.setDisplaySize.mockClear();
			enemyMarker.setVisible.mockReset();
			enemyMarker.setTint.mockReset();
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
			rectangleQueue.splice(0, rectangleQueue.length, enemyHealthBarBg, enemyHealthBarFill, attackFlash, victoryOverlay);
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
		const tilemapCall = scene.make.tilemap.mock.calls[0]?.[0];
		expect(tilemapCall.data).toHaveLength(320);
		expect(tilemapCall.data[0]).toHaveLength(320);
		expect(phaserState.tilemap.addTilesetImage).toHaveBeenCalledWith(
			'starter-ground-tiles',
			'starter-ground-tiles',
			32,
			32
		);
		expect(phaserState.tilemap.createLayer).toHaveBeenCalledWith(
			0,
			expect.anything(),
			0,
			0
		);
		expect(phaserState.tilemapLayer.setDepth).toHaveBeenCalledWith(-10);
		expect(tilemapCall.data[0][0]).toBe(0);
		expect(tilemapCall.data[160][0]).toBe(1);
		expect(scene.add.image).toHaveBeenCalledWith(
			meadowEntryMap.spawn.x,
			meadowEntryMap.spawn.y,
			'starter-pack',
			'hero'
		);
		expect(scene.add.image).toHaveBeenCalledWith(5_120, 5_120, 'starter-pack', 'slimeScout');
		expect(scene.add.image).toHaveBeenCalledWith(9_984, 5_120, 'starter-pack', 'doorwayTile');
		expect(scene.cameras.main.setBackgroundColor).toHaveBeenCalledWith('#1a1f2b');
	});

	it('renders ruins tilemap data with stone borders and floor interior', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { ruinsThresholdMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: ruinsThresholdMap.id });

		const tilemapCall = scene.make.tilemap.mock.calls[0]?.[0];
		expect(tilemapCall.data[0][0]).toBe(3);
		expect(tilemapCall.data[0][1]).toBe(3);
		expect(tilemapCall.data[1][0]).toBe(3);
		expect(tilemapCall.data[1][1]).toBe(2);
		expect(phaserState.tilemap.createLayer).toHaveBeenCalledWith(
			0,
			expect.anything(),
			0,
			0
		);
		expect(phaserState.tilemapLayer.setDepth).toHaveBeenCalledWith(-10);
	});

	it('sets up camera follow and keyboard controls for the player marker', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });

		expect(meadowEntryMap.width).toBe(320);
		expect(meadowEntryMap.height).toBe(320);
		expect(scene.cameras.main.setBounds).toHaveBeenCalledWith(0, 0, 10_240, 10_240);
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

		expect(ruinsCoreMap.width).toBe(80);
		expect(ruinsCoreMap.height).toBe(80);
		expect(scene.cameras.main.setBounds).toHaveBeenCalledWith(0, 0, 2_560, 2_560);
	});

	it('moves the player marker using the current input state', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });
		phaserState.cursorKeys.right.isDown = true;

		scene.update(0, 1000);

		expect(phaserState.playerMarker.x).toBe(meadowEntryMap.spawn.x + 30);
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
		expect(phaserState.playerMarker.y).toBe(meadowEntryMap.spawn.y + 30);
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

		expect(phaserState.playerMarker.x).toBe(meadowEntryMap.spawn.x + 30);
		expect(phaserState.playerMarker.y).toBe(meadowEntryMap.spawn.y);
	});

	it('stops world movement while the gameplay menu is open', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			handleHudCommand: (command: 'pause-game' | 'resume-game') => void;
		};

		scene.create({ mapId: meadowEntryMap.id });
		phaserState.cursorKeys.right.isDown = true;
		sceneState.handleHudCommand('pause-game');

		scene.update(0, 1000);

		expect(phaserState.playerMarker.x).toBe(meadowEntryMap.spawn.x);
		expect(phaserState.playerMarker.y).toBe(meadowEntryMap.spawn.y);

		sceneState.handleHudCommand('resume-game');
		scene.update(1000, 1000);

		expect(phaserState.playerMarker.x).toBe(meadowEntryMap.spawn.x + 30);
	});

	it('defeats an enemy within the melee attack window and applies the xp reward', async () => {
		const progression = await import('$lib/game/core/progression');
		const applyExperienceGainSpy = vi.spyOn(progression, 'applyExperienceGain');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as { playerProgress: { level: number; xp: number } };

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 5_120, y: 5_120 });

		scene.update(0, 16);

		expect(applyExperienceGainSpy).toHaveBeenCalledWith(
			{ level: 1, xp: 0, hp: 20, attack: 3 },
			5
		);
		expect(phaserState.attackFlash.setVisible).toHaveBeenCalledWith(true);
		expect(phaserState.enemyHealthBarFill.setScale).toHaveBeenCalledWith(0, 1);
		expect(sceneState.playerProgress).toMatchObject({ level: 2, xp: 5 });
		expect(phaserState.enemyMarker.setVisible).toHaveBeenCalledWith(false);
	});

	it('auto attacks enemies in range without manual input', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemy: { hp: number };
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 5_120, y: 5_120 });

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
		Object.assign(phaserState.playerMarker, { x: 5_120, y: 5_120 });
		Object.assign(sceneState.enemy, { hp: 9, maxHp: 9, invulnerableUntil: 0, defeated: false });

		scene.update(0, 16);
		scene.update(200, 16);
		scene.update(400, 16);

		expect(sceneState.enemy.hp).toBe(6);
		expect(phaserState.enemyHealthBarFill.setScale).toHaveBeenLastCalledWith(
			expect.closeTo(6 / 9, 5),
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
		Object.assign(phaserState.playerMarker, { x: 5_120, y: 5_120 });
		sceneState.playerProgress = { level: 2, xp: 5, hp: 24, attack: 4 };

		expect(() => scene.update(0, 16)).not.toThrow();
		expect(sceneState.playerProgress).toEqual({ level: 2, xp: 10, hp: 24, attack: 4 });
	});

	it('moves into the ruins after the opening encounter is cleared and the exit is reached', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 5_120, y: 5_120 });
		scene.update(0, 16);

		Object.assign(phaserState.playerMarker, { x: 9_984, y: 5_120 });
		scene.update(200, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'ruins-threshold',
				player: expect.objectContaining({
					x: 256,
					y: 5_120,
					facing: 'right'
				})
			})
		});
	});

	it('returns from the ruins to a spawn point near the meadow entrance', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'ruins-threshold' });
		Object.assign(phaserState.playerMarker, { x: 128, y: 5_120 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'meadow-entry',
				player: expect.objectContaining({
					x: 9_856,
					y: 5_120,
					facing: 'left'
				})
			})
		});
	});

	it('moves from the ruins threshold into the core when the far exit is reached', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'ruins-threshold' });
		Object.assign(phaserState.playerMarker, { x: 9_984, y: 5_120 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'ruins-core',
				player: expect.objectContaining({
					x: 256,
					y: 1_280,
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
				flags: { clearedEncounters: ['ruins-warden'] }
			}
		});
		Object.assign(phaserState.playerMarker, { x: 128, y: 1_280 });

		scene.update(0, 16);

		expect(scene.scene.restart).toHaveBeenCalledWith({
			reason: 'transition',
			saveState: expect.objectContaining({
				mapId: 'ruins-threshold',
				player: expect.objectContaining({
					x: 9_856,
					y: 5_120,
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

	it('bosses chase, strike back, and enrage in phase 2', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();
		const sceneState = scene as unknown as {
			enemy: { x: number; hp: number };
			playerProgress: { hp: number };
		};

		scene.create({ mapId: 'ruins-core' });
		Object.assign(phaserState.playerMarker, { x: 1_416, y: 1_280 });

		scene.update(0, 1000);

		expect(sceneState.enemy.x).toBeLessThan(1_600);

		Object.assign(phaserState.playerMarker, { x: sceneState.enemy.x, y: 1_280 });
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
		Object.assign(phaserState.playerMarker, { x: 1_600, y: 1_280 });

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
