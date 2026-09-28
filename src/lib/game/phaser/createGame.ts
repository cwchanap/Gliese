import type { SaveState } from '$lib/game/save/save-state';

export type GameStartRequest =
	| { reason: 'new'; saveState: null }
	| { reason: 'resume'; saveState: SaveState };

type PhaserModule = typeof import('phaser');

/**
 * Dynamic-imports Phaser and mounts the game (Boot → World → Battle scenes).
 * @param target - Host HTMLElement the Phaser canvas attaches to.
 * @param start - GameStartRequest boot mode: `new` run or `resume` from a save state.
 * @returns Promise<{ destroy: () => void }> — resolves once the game is
 *   mounted; `destroy()` tears the Phaser instance down.
 */
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
		// Save-slot thumbnails read the canvas on the renderer's post-render
		// tick, so preserveDrawingBuffer stays off and doesn't slow every frame.
		// BootScene is the auto-started first scene: it preloads the sprite sheets
		// before WorldScene runs. The start request reaches it via the registry,
		// populated in preBoot so it lands before any scene init no matter how
		// early Phaser boots the game.
		callbacks: {
			preBoot: (bootedGame) => {
				bootedGame.registry.set('startRequest', start);
			}
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
