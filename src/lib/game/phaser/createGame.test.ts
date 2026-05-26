import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

const ORIGINAL_WINDOW_DESCRIPTOR = Object.getOwnPropertyDescriptor(globalThis, 'window');

describe('createGame', () => {
	beforeEach(() => {
		phaserState.destroyMock.mockClear();
		phaserState.gameMock.mockClear();
		vi.resetModules();
	});

	afterEach(() => {
		if (ORIGINAL_WINDOW_DESCRIPTOR) {
			Object.defineProperty(globalThis, 'window', ORIGINAL_WINDOW_DESCRIPTOR);
		} else {
			delete (globalThis as { window?: unknown }).window;
		}
	});

	it('returns a destroyable browser game wrapper', async () => {
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: {}
		});
		const { createGame } = await import('./createGame');
		const { BootScene } = await import('$lib/game/phaser/scenes/BootScene');
		const { WorldScene } = await import('$lib/game/phaser/scenes/WorldScene');
		const { BattleScene } = await import('$lib/game/phaser/scenes/BattleScene');
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
				scene: [BootScene, WorldScene, BattleScene]
			})
		);
		expect(instance.destroy).toBeTypeOf('function');

		instance.destroy();

		expect(phaserState.destroyMock).toHaveBeenCalledWith(true);
	});

	it('throws when called outside the browser', async () => {
		delete (globalThis as { window?: unknown }).window;
		const { createGame } = await import('./createGame');
		const mountNode = { id: 'mount-node' } as HTMLElement;

		await expect(createGame(mountNode)).rejects.toThrow('createGame must run in the browser');
		expect(phaserState.gameMock).not.toHaveBeenCalled();
	});
});
