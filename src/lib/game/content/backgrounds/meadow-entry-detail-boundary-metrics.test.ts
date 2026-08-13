import { describe, expect, it } from 'vitest';

import type { DecodedMeadowEntryRgba } from './meadow-entry-png';
import {
	measureMeadowEntryDetailBoundaryMetrics,
	type MeadowEntryDetailBoundaryPanel
} from './meadow-entry-detail-boundary-metrics';

function horizontalGradient(width: number, height: number): DecodedMeadowEntryRgba {
	const data = Buffer.alloc(width * height * 4);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const offset = (y * width + x) * 4;
			data[offset] = x * 10;
			data[offset + 1] = x * 10;
			data[offset + 2] = x * 10;
			data[offset + 3] = 255;
		}
	}
	return { data, width, height };
}

const panels = [
	{
		id: 'measured',
		bounds: { left: 3, top: 2, right: 8, bottom: 8 },
		assemblyPriority: 10
	},
	{
		id: 'touching-right-comparison-band',
		bounds: { left: 8, top: 2, right: 11, bottom: 5 },
		assemblyPriority: 20
	},
	{
		id: 'covering-right-perimeter',
		bounds: { left: 7, top: 6, right: 10, bottom: 8 },
		assemblyPriority: 30
	}
] as const satisfies readonly MeadowEntryDetailBoundaryPanel[];

describe('Meadow Entry detail boundary metrics', () => {
	it('filters later-covered comparison steps per edge without pooling the opposite edge', () => {
		const metrics = measureMeadowEntryDetailBoundaryMetrics(horizontalGradient(12, 10), panels, 2);
		const right = metrics.find(
			(metric) => metric.panelId === 'measured' && metric.edge === 'right'
		);
		const left = metrics.find((metric) => metric.panelId === 'measured' && metric.edge === 'left');

		expect(right).toEqual({
			panelId: 'measured',
			edge: 'right',
			samples: 4,
			edgeMean: 10,
			edgeP95: 10,
			comparisonSamples: 10,
			comparisonMean: 10,
			comparisonP95: 10,
			excess: 0,
			p95Ratio: 1
		});
		expect(left?.samples).toBe(6);
		expect(left?.comparisonSamples).toBe(24);
	});

	it('uses nearest-rank p95 independently for edge and comparison distributions', () => {
		const decoded = horizontalGradient(30, 30);
		const measuredPanel = {
			id: 'nearest-rank',
			bounds: { left: 3, top: 4, right: 25, bottom: 24 },
			assemblyPriority: 10
		} as const;
		// The top edge has 22 samples. One large step is the final sorted value, so nearest-rank
		// p95 selects sample 21 and remains at the ordinary zero-point step.
		const spikeX = measuredPanel.bounds.right - 1;
		const outsideOffset = ((measuredPanel.bounds.top - 1) * decoded.width + spikeX) * 4;
		decoded.data[outsideOffset] = 0;
		decoded.data[outsideOffset + 1] = 0;
		decoded.data[outsideOffset + 2] = 0;

		const top = measureMeadowEntryDetailBoundaryMetrics(decoded, [measuredPanel], 1).find(
			(metric) => metric.edge === 'top'
		);

		expect(top?.samples).toBe(22);
		expect(top?.edgeP95).toBe(0);
		expect(top?.edgeMean).toBeGreaterThan(0);
	});
});
