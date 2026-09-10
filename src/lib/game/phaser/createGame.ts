import type { SaveState } from '$lib/game/save/save-state';

export type GameStartRequest =
	| { reason: 'new'; saveState: null }
	| { reason: 'resume'; saveState: SaveState };

type PhaserModule = typeof import('phaser');

export async function createGame(target: HTMLElement, start: GameStartRequest) {
	if (typeof window === 'undefined') {
		throw new Error('createGame must run in the browser');
	}
	const PhaserModule = await import('phaser');
	const Phaser = resolvePhaserRuntime(PhaserModule);
	const { BootScene } = await import('$lib/game/phaser/scenes/BootScene');
	const { WorldScene } = await import('$lib/game/phaser/scenes/WorldScene');
	const { BattleScene } = await import('$lib/game/phaser/scenes/BattleScene');
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
		// Save-slot thumbnails read the canvas via toDataURL after the frame;
		// without this WebGL clears the buffer first and captures come out black.
		render: { preserveDrawingBuffer: true },
		// BootScene is the auto-started first scene: it preloads the sprite sheets
		// before WorldScene runs. The start request reaches it via the registry.
		scene: [BootScene, WorldScene, BattleScene]
	});
	game.registry.set('startRequest', start);

	return {
		destroy: () => game.destroy(true)
	};
}

function resolvePhaserRuntime(module: PhaserModule) {
	return (module as PhaserModule & { default?: PhaserModule }).default ?? module;
}
