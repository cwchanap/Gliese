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
	const attackKey = { isDown: false };
	const playerMarker = { x: 0, y: 0 };
	const enemyMarker = { setVisible: vi.fn() };

	class SceneMock {
		scene = { start: vi.fn() };
		add = {
			rectangle: vi.fn(
				(_x: number, _y: number, _width: number, _height: number, color: number) => {
					if (color === 0x7cff6b) {
						return enemyMarker;
					}

					return {};
				}
			),
			circle: vi.fn((x: number, y: number) => {
				playerMarker.x = x;
				playerMarker.y = y;
				return playerMarker;
			})
		};
		cameras = {
			main: {
				setBackgroundColor: vi.fn(),
				setBounds: vi.fn(),
				startFollow: vi.fn()
			}
		};
		input = {
			keyboard: {
				createCursorKeys: vi.fn(() => cursorKeys),
				addKeys: vi.fn(() => wasdKeys),
				addKey: vi.fn(() => attackKey)
			}
		};

		constructor(_key?: string) {}
	}

	return {
		SceneMock,
		cursorKeys,
		wasdKeys,
		attackKey,
		playerMarker,
		enemyMarker,
		reset() {
			enemyMarker.setVisible.mockReset();
		}
	};
});

vi.mock('phaser', () => ({
	default: {
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
	}
}));

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
		Object.assign(phaserState.attackKey, { isDown: false });
		Object.assign(phaserState.playerMarker, { x: 0, y: 0 });
	});

	it('renders placeholder ground, spawn marker, and hostile transition marker for the resolved map', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });

		expect(scene.add.rectangle).toHaveBeenNthCalledWith(
			1,
			320,
			192,
			meadowEntryMap.width * 32,
			meadowEntryMap.height * 32,
			0x5d7a3a
		);
		expect(scene.add.circle).toHaveBeenCalledWith(
			meadowEntryMap.spawn.x,
			meadowEntryMap.spawn.y,
			12,
			0x4da6ff
		);
		expect(scene.add.rectangle).toHaveBeenNthCalledWith(2, 304, 96, 20, 20, 0x8b2f2f);
		expect(scene.cameras.main.setBackgroundColor).toHaveBeenCalledWith('#1a1f2b');
	});

	it('sets up camera follow and keyboard controls for the player marker', async () => {
		const { WorldScene } = await import('./WorldScene');
		const { meadowEntryMap } = await import('$lib/game/content/maps');
		const scene = new WorldScene();

		scene.create({ mapId: meadowEntryMap.id });

		expect(scene.cameras.main.setBounds).toHaveBeenCalledWith(
			0,
			0,
			meadowEntryMap.width * 32,
			meadowEntryMap.height * 32
		);
		expect(scene.cameras.main.startFollow).toHaveBeenCalledWith(phaserState.playerMarker, true);
		expect(scene.input.keyboard.createCursorKeys).toHaveBeenCalledOnce();
		expect(scene.input.keyboard.addKeys).toHaveBeenCalledWith({
			left: 'A',
			right: 'D',
			up: 'W',
			down: 'S'
		});
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

	it('defeats an enemy within the melee attack window and applies the xp reward', async () => {
		const progression = await import('$lib/game/core/progression');
		const applyExperienceGainSpy = vi.spyOn(progression, 'applyExperienceGain');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene() as WorldScene & { playerProgress: { level: number; xp: number } };

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 304, y: 96 });
		phaserState.attackKey.isDown = true;

		scene.update(0, 16);

		expect(applyExperienceGainSpy).toHaveBeenCalledWith(
			{ level: 1, xp: 0, hp: 20, attack: 3 },
			5
		);
		expect(scene.playerProgress).toMatchObject({ level: 2, xp: 5 });
		expect(phaserState.enemyMarker.setVisible).toHaveBeenCalledWith(false);
	});

	it('does not reopen melee attack windows while space is held', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene() as WorldScene & {
			enemy: { hp: number; invulnerableUntil: number; defeated: boolean };
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 304, y: 96 });
		Object.assign(scene.enemy, { hp: 9, invulnerableUntil: 0, defeated: false });
		phaserState.attackKey.isDown = true;

		scene.update(0, 16);
		scene.update(200, 16);
		scene.update(400, 16);

		expect(scene.enemy.hp).toBe(6);
	});

	it('keeps awarding xp after level 2 without throwing', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene() as WorldScene & {
			playerProgress: { level: number; xp: number; hp: number; attack: number };
		};

		scene.create({ mapId: 'meadow-entry' });
		Object.assign(phaserState.playerMarker, { x: 304, y: 96 });
		scene.playerProgress = { level: 2, xp: 5, hp: 24, attack: 4 };
		phaserState.attackKey.isDown = true;

		expect(() => scene.update(0, 16)).not.toThrow();
		expect(scene.playerProgress).toEqual({ level: 2, xp: 10, hp: 24, attack: 4 });
	});
});
