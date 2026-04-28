import { beforeEach, describe, expect, it, vi } from 'vitest';

const destroyMock = vi.fn();
const gameMock = vi.fn();

class GameMock {
	constructor(config: unknown) {
		gameMock(config);
	}

	destroy = destroyMock;
}

vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('phaser', () => ({
	default: {
		AUTO: 'AUTO',
		Game: GameMock
	}
}));

describe('createGame', () => {
	beforeEach(() => {
		destroyMock.mockClear();
		gameMock.mockClear();
	});

	it('returns a destroyable browser game wrapper', async () => {
		const { createGame } = await import('./createGame');
		const mountNode = {} as HTMLElement;

		const instance = await createGame(mountNode);

		expect(gameMock).toHaveBeenCalledOnce();
		expect(instance.destroy).toBeTypeOf('function');

		instance.destroy();

		expect(destroyMock).toHaveBeenCalledWith(true);
	});
});
