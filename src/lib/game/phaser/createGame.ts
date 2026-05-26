import { BootScene } from '$lib/game/phaser/scenes/BootScene';
import { BattleScene } from '$lib/game/phaser/scenes/BattleScene';
import { WorldScene } from '$lib/game/phaser/scenes/WorldScene';

type PhaserModule = typeof import('phaser');

export async function createGame(target: HTMLElement) {
	if (typeof window === 'undefined') {
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
		scale: {
			mode: Phaser.Scale.RESIZE,
			autoCenter: Phaser.Scale.CENTER_BOTH
		},
		scene: [BootScene, WorldScene, BattleScene]
	});

	return {
		destroy: () => game.destroy(true)
	};
}

function resolvePhaserRuntime(module: PhaserModule) {
	return (module as PhaserModule & { default?: PhaserModule }).default ?? module;
}
