import { describe, expect, it } from 'vitest';

import {
	emitWorldSceneCameraDiagnostic,
	WORLD_SCENE_CAMERA_DIAGNOSTIC_EVENT,
	type WorldSceneCameraDiagnostic
} from './world-scene-camera-diagnostic';

describe('world scene camera diagnostic', () => {
	it('dispatches the typed map/facing/camera snapshot on the target', () => {
		const target = new EventTarget();
		const detail: WorldSceneCameraDiagnostic = {
			mapId: 'blacksmith-interior',
			facing: 'down',
			camera: {
				view: { x: 0, y: 0, width: 640, height: 360 },
				bounds: { x: -96, y: -172, width: 896, height: 704 }
			}
		};
		let received: WorldSceneCameraDiagnostic | undefined;

		target.addEventListener(WORLD_SCENE_CAMERA_DIAGNOSTIC_EVENT, (event) => {
			received = (event as CustomEvent<WorldSceneCameraDiagnostic>).detail;
		});

		emitWorldSceneCameraDiagnostic(detail, target);

		expect(received).toEqual(detail);
	});

	it('does not throw when no window-like target exists', () => {
		// Omit the target: this Node-project test has no `window`, so the call
		// exercises the emitter's no-target fallback.
		expect(typeof window).toBe('undefined');
		expect(() =>
			emitWorldSceneCameraDiagnostic({
				mapId: 'overworld',
				facing: 'up',
				camera: {
					view: { x: 0, y: 0, width: 1280, height: 720 },
					bounds: { x: 0, y: 0, width: 8_096, height: 8_096 }
				}
			})
		).not.toThrow();
	});
});
