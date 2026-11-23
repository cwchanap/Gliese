import type { Direction } from '$lib/game/core/types';

export const WORLD_SCENE_CAMERA_DIAGNOSTIC_EVENT = 'gliese:world-scene-camera-diagnostic';

export interface WorldSceneCameraRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface WorldSceneCameraDiagnostic {
	mapId: string;
	facing: Direction;
	camera: {
		view: WorldSceneCameraRect;
		bounds: WorldSceneCameraRect;
	};
}

/**
 * Emits a camera/facing snapshot for runtime probes. WorldScene publishes this
 * only once Phaser has applied camera bounds and refreshed worldView inside
 * the render pass, and always as a plain data snapshot — never the live camera.
 */
export function emitWorldSceneCameraDiagnostic(
	detail: WorldSceneCameraDiagnostic,
	target?: EventTarget
): void {
	const resolvedTarget = target ?? (typeof window === 'undefined' ? null : window);
	if (!resolvedTarget) return;

	resolvedTarget.dispatchEvent(
		new CustomEvent<WorldSceneCameraDiagnostic>(WORLD_SCENE_CAMERA_DIAGNOSTIC_EVENT, { detail })
	);
}
