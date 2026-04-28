import { beforeEach, describe, expect, it, vi } from 'vitest';

const environmentState = vi.hoisted(() => ({ browser: true }));
const destroyMock = vi.fn();
const gameMock = vi.fn();

class GameMock {
	constructor(config: unknown) {
		gameMock(config);
	}

	destroy = destroyMock;
}

vi.mock('$app/environment', () => environmentState);
vi.mock('phaser', () => ({
	default: {
		AUTO: 'AUTO',
		Game: GameMock
	}
}));

describe('createGame', () => {
	beforeEach(() => {
		environmentState.browser = true;
		destroyMock.mockClear();
		gameMock.mockClear();
		vi.resetModules();
	});

	it('returns a destroyable browser game wrapper', async () => {
		const { createGame } = await import('./createGame');
		const { BootScene } = await import('$lib/game/phaser/scenes/BootScene');
		const { WorldScene } = await import('$lib/game/phaser/scenes/WorldScene');
		const mountNode = { id: 'mount-node' } as HTMLElement;

		const instance = await createGame(mountNode);

		expect(gameMock).toHaveBeenCalledOnce();
		expect(gameMock).toHaveBeenCalledWith(
			expect.objectContaining({
				parent: mountNode,
				scene: [BootScene, WorldScene]
			})
		);
		expect(instance.destroy).toBeTypeOf('function');

		instance.destroy();

		expect(destroyMock).toHaveBeenCalledWith(true);
	});

	it('throws when called outside the browser', async () => {
		environmentState.browser = false;
		const { createGame } = await import('./createGame');
		const mountNode = { id: 'mount-node' } as HTMLElement;

		await expect(createGame(mountNode)).rejects.toThrow('createGame must run in the browser');
		expect(gameMock).not.toHaveBeenCalled();
	});
});
