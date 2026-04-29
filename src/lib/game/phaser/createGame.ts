import { browser } from '$app/environment';
import { BootScene } from '$lib/game/phaser/scenes/BootScene';
import { WorldScene } from '$lib/game/phaser/scenes/WorldScene';

export async function createGame(target: HTMLElement) {
	if (!browser) {
		throw new Error('createGame must run in the browser');
	}

	const PhaserModule = await import('phaser');
	const Phaser = resolvePhaserRuntime(PhaserModule);
	const game = new Phaser.Game({
		type: Phaser.AUTO,
		parent: target,
		width: 640,
		height: 360,
		backgroundColor: '#1a1f2b',
		scene: [BootScene, WorldScene]
	});

	return {
		destroy: () => game.destroy(true)
	};
}

function resolvePhaserRuntime(module: Awaited<ReturnType<typeof import('phaser')>>) {
	return 'Game' in module ? module : module.default;
}
