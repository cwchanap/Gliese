import { beforeEach, describe, expect, it, vi } from 'vitest';

const phaserState = vi.hoisted(() => {
	class SceneMock {
		scene = { start: vi.fn() };
		add = {
			rectangle: vi.fn(),
			circle: vi.fn()
		};
		cameras = {
			main: {
				setBackgroundColor: vi.fn()
			}
		};

		constructor(_key?: string) {}
	}

	return { SceneMock };
});

vi.mock('phaser', () => ({
	default: {
		Scene: phaserState.SceneMock
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
});
