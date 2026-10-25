import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const phaserState = vi.hoisted(() => {
	const destroyMock = vi.fn();
	const gameMock = vi.fn();
	const registrySetMock = vi.fn();
	const games: Array<{ sound: { mute: boolean } }> = [];
	class SceneMock {
		constructor(...args: unknown[]) {
			void args;
		}
	}
	class GameMock {
		registry = { set: registrySetMock };
		sound = { mute: false };
		destroy = destroyMock;

		constructor(config: unknown) {
			gameMock(config);
			games.push(this);
			// Real Phaser fires callbacks.preBoot(game) before booting scenes.
			const { callbacks } = config as {
				callbacks?: {
					preBoot?: (game: GameMock) => void;
					postBoot?: (game: GameMock) => void;
				};
			};
			callbacks?.preBoot?.(this);
			callbacks?.postBoot?.(this);
		}
	}

	return { destroyMock, gameMock, games, registrySetMock, SceneMock, GameMock };
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
		phaserState.registrySetMock.mockClear();
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
		const startRequest = { reason: 'new', saveState: null } as const;

		const instance = await createGame(mountNode, startRequest);

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
		expect(phaserState.registrySetMock).toHaveBeenCalledWith('startRequest', startRequest);
		expect(instance.destroy).toBeTypeOf('function');

		instance.destroy();

		expect(phaserState.destroyMock).toHaveBeenCalledWith(true);
	}, 20_000);

	it('mutes the game while the sound preference is off', async () => {
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: {}
		});
		const { createGame } = await import('./createGame');
		const { updatePreferences } = await import('$lib/game/i18n/store');
		const instance = await createGame({ id: 'mount-node' } as HTMLElement, {
			reason: 'new',
			saveState: null
		});
		const game = phaserState.games.at(-1)!;

		expect(game.sound.mute).toBe(false);
		updatePreferences({ sound: 'off' });
		expect(game.sound.mute).toBe(true);

		instance.destroy();
		updatePreferences({ sound: 'on' });
		expect(game.sound.mute).toBe(true);
	}, 20_000);

	it('does not pin the WebGL drawing buffer for thumbnails', async () => {
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value: {}
		});
		const { createGame } = await import('./createGame');
		const mountNode = { id: 'mount-node' } as HTMLElement;

		await createGame(mountNode, { reason: 'new', saveState: null });

		// Thumbnails capture on the renderer's post-render tick instead, so the
		// buffer must not be preserved — preserving it slows every frame.
		const config = phaserState.gameMock.mock.calls[0]?.[0] as {
			render?: { preserveDrawingBuffer?: boolean };
		};
		expect(config.render?.preserveDrawingBuffer).not.toBe(true);
	}, 20_000);

	it('throws when called outside the browser', async () => {
		delete (globalThis as { window?: unknown }).window;
		const { createGame } = await import('./createGame');
		const mountNode = { id: 'mount-node' } as HTMLElement;

		await expect(createGame(mountNode, { reason: 'new', saveState: null })).rejects.toThrow(
			'createGame must run in the browser'
		);
		expect(phaserState.gameMock).not.toHaveBeenCalled();
	});
});
