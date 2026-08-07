import { describe, expect, it } from 'vitest';

import {
	emitRegionalBackgroundPlaneRenderDiagnostic,
	REGIONAL_BACKGROUND_PLANE_RENDER_DIAGNOSTIC_EVENT,
	type RegionalBackgroundPlaneRenderDiagnostic
} from './regional-background-plane-render-diagnostics';

describe('regional background plane render diagnostics', () => {
	it('preserves descriptor order, fallback selections, and sorted successful background IDs', () => {
		const target = new EventTarget();
		const diagnostic: RegionalBackgroundPlaneRenderDiagnostic = {
			mapId: 'two-plane-test',
			regionalBackgroundsEnabled: true,
			entries: [
				{
					id: 'foreground-image',
					textureKey: 'two-plane-foreground',
					plane: 'foreground',
					expectedDimensions: { width: 640, height: 320 },
					observedDimensions: { width: 640, height: 320 },
					status: 'rendered'
				},
				{
					id: 'base-image',
					textureKey: 'two-plane-base',
					plane: 'base',
					expectedDimensions: { width: 640, height: 320 },
					observedDimensions: null,
					status: 'missing-texture'
				}
			],
			successfulBackgroundIds: ['foreground-image', 'base-image'],
			selectedFallbackDecorIds: ['decor-b', 'decor-a'],
			selectedFallbackFenceIds: ['fence-a']
		};
		let received: RegionalBackgroundPlaneRenderDiagnostic | undefined;

		target.addEventListener(REGIONAL_BACKGROUND_PLANE_RENDER_DIAGNOSTIC_EVENT, (event) => {
			received = (event as CustomEvent<RegionalBackgroundPlaneRenderDiagnostic>).detail;
		});

		emitRegionalBackgroundPlaneRenderDiagnostic(diagnostic, target);

		expect(received?.entries.map((entry) => entry.id)).toEqual(['foreground-image', 'base-image']);
		expect(received?.successfulBackgroundIds).toEqual(['base-image', 'foreground-image']);
		expect(received?.selectedFallbackDecorIds).toEqual(['decor-b', 'decor-a']);
		expect(received?.selectedFallbackFenceIds).toEqual(['fence-a']);
	});
});
