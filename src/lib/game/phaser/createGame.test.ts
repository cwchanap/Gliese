import { beforeEach, describe, expect, it, vi } from 'vitest';

const environmentState = vi.hoisted(() => ({ browser: true }));
const phaserState = vi.hoisted(() => {
	const destroyMock = vi.fn();
	const gameMock = vi.fn();
	class SceneMock {
		constructor(...args: unknown[]) {
			void args;
		}
	}
	class GameMock {
		constructor(config: unknown) {
			gameMock(config);
		}

		destroy = destroyMock;
	}

	return { destroyMock, gameMock, SceneMock, GameMock };
});

vi.mock('$app/environment', () => environmentState);
vi.mock('phaser', () => {
	const runtime = {
		AUTO: 'AUTO',
		Scale: {
			RESIZE: 'RESIZE',
			CENTER_BOTH: 'CENTER_BOTH'
		},
		Game: phaserState.GameMock,
		Scene: phaserState.SceneMock
	};

	return {
		...runtime,
		default: runtime
	};
});

describe('createGame', () => {
	beforeEach(() => {
		environmentState.browser = true;
		phaserState.destroyMock.mockClear();
		phaserState.gameMock.mockClear();
		vi.resetModules();
	});

	it('returns a destroyable browser game wrapper', async () => {
		const { createGame } = await import('./createGame');
		const { BootScene } = await import('$lib/game/phaser/scenes/BootScene');
		const { WorldScene } = await import('$lib/game/phaser/scenes/WorldScene');
		const mountNode = { id: 'mount-node' } as HTMLElement;

		const instance = await createGame(mountNode);

		expect(phaserState.gameMock).toHaveBeenCalledOnce();
		expect(phaserState.gameMock).toHaveBeenCalledWith(
			expect.objectContaining({
				parent: mountNode,
				scale: {
					mode: 'RESIZE',
					autoCenter: 'CENTER_BOTH'
				},
				scene: [BootScene, WorldScene]
			})
		);
		expect(instance.destroy).toBeTypeOf('function');

		instance.destroy();

		expect(phaserState.destroyMock).toHaveBeenCalledWith(true);
	});

	it('throws when called outside the browser', async () => {
		environmentState.browser = false;
		const { createGame } = await import('./createGame');
		const mountNode = { id: 'mount-node' } as HTMLElement;

		await expect(createGame(mountNode)).rejects.toThrow('createGame must run in the browser');
		expect(phaserState.gameMock).not.toHaveBeenCalled();
	});
});
