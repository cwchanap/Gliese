import { browser } from '$app/environment';

export async function createGame(target: HTMLElement) {
	if (!browser) {
		throw new Error('createGame must run in the browser');
	}

	const Phaser = await import('phaser');
	const game = new Phaser.default.Game({
		type: Phaser.default.AUTO,
		parent: target,
		width: 640,
		height: 360,
		backgroundColor: '#1a1f2b',
		scene: []
	});

	return {
		destroy: () => game.destroy(true)
	};
}
