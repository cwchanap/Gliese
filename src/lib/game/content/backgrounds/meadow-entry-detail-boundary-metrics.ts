import type { PixelBounds } from './meadow-entry-authoring-types';
import type { DecodedMeadowEntryRgba } from './meadow-entry-png';

export type MeadowEntryDetailBoundaryEdge = 'top' | 'bottom' | 'left' | 'right';

export interface MeadowEntryDetailBoundaryPanel {
	readonly id: string;
	readonly bounds: PixelBounds;
	readonly assemblyPriority: number;
}

export interface MeadowEntryDetailBoundaryMetric {
	readonly panelId: string;
	readonly edge: MeadowEntryDetailBoundaryEdge;
	readonly samples: number;
	readonly edgeMean: number;
	readonly edgeP95: number;
	readonly comparisonSamples: number;
	readonly comparisonMean: number;
	readonly comparisonP95: number;
	readonly excess: number;
	readonly p95Ratio: number | null;
}

export interface PixelPoint {
	readonly x: number;
	readonly y: number;
}

interface EdgeSample {
	readonly perimeter: PixelPoint;
	readonly first: PixelPoint;
	readonly second: PixelPoint;
	readonly normal: PixelPoint;
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function contains(bounds: PixelBounds, point: PixelPoint): boolean {
	return (
		point.x >= bounds.left &&
		point.x < bounds.right &&
		point.y >= bounds.top &&
		point.y < bounds.bottom
	);
}

function insideImage(decoded: DecodedMeadowEntryRgba, point: PixelPoint): boolean {
	return point.x >= 0 && point.x < decoded.width && point.y >= 0 && point.y < decoded.height;
}

export function rgbStep(
	decoded: DecodedMeadowEntryRgba,
	first: PixelPoint,
	second: PixelPoint
): number {
	const firstOffset = (first.y * decoded.width + first.x) * 4;
	const secondOffset = (second.y * decoded.width + second.x) * 4;
	return (
		(Math.abs(decoded.data[firstOffset]! - decoded.data[secondOffset]!) +
			Math.abs(decoded.data[firstOffset + 1]! - decoded.data[secondOffset + 1]!) +
			Math.abs(decoded.data[firstOffset + 2]! - decoded.data[secondOffset + 2]!)) /
		3
	);
}

function mean(values: readonly number[]): number {
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function meadowEntryNearestRank(values: readonly number[], percentile: number): number {
	if (values.length === 0) return 0;
	assert(
		Number.isFinite(percentile) && percentile > 0 && percentile <= 1,
		'Meadow Entry nearest-rank percentile is invalid'
	);
	const sorted = [...values].sort((first, second) => first - second);
	return sorted[Math.ceil(sorted.length * percentile) - 1]!;
}

function edgeSamples(
	panel: MeadowEntryDetailBoundaryPanel,
	edge: MeadowEntryDetailBoundaryEdge
): readonly EdgeSample[] {
	const result: EdgeSample[] = [];
	if (edge === 'top' || edge === 'bottom') {
		const perimeterY = edge === 'top' ? panel.bounds.top : panel.bounds.bottom - 1;
		const firstY = edge === 'top' ? panel.bounds.top - 1 : panel.bounds.bottom - 1;
		const secondY = edge === 'top' ? panel.bounds.top : panel.bounds.bottom;
		for (let x = panel.bounds.left; x < panel.bounds.right; x += 1) {
			result.push({
				perimeter: { x, y: perimeterY },
				first: { x, y: firstY },
				second: { x, y: secondY },
				normal: { x: 0, y: 1 }
			});
		}
		return result;
	}

	const perimeterX = edge === 'left' ? panel.bounds.left : panel.bounds.right - 1;
	const firstX = edge === 'left' ? panel.bounds.left - 1 : panel.bounds.right - 1;
	const secondX = edge === 'left' ? panel.bounds.left : panel.bounds.right;
	for (let y = panel.bounds.top; y < panel.bounds.bottom; y += 1) {
		result.push({
			perimeter: { x: perimeterX, y },
			first: { x: firstX, y },
			second: { x: secondX, y },
			normal: { x: 1, y: 0 }
		});
	}
	return result;
}

function shifted(point: PixelPoint, normal: PixelPoint, distance: number): PixelPoint {
	return { x: point.x + normal.x * distance, y: point.y + normal.y * distance };
}

function validateInputs(
	decoded: DecodedMeadowEntryRgba,
	panels: readonly MeadowEntryDetailBoundaryPanel[],
	comparisonBandPx: number
): void {
	assert(
		Number.isInteger(decoded.width) &&
			decoded.width > 0 &&
			Number.isInteger(decoded.height) &&
			decoded.height > 0,
		'Meadow Entry detail boundary image dimensions are invalid'
	);
	assert(
		decoded.data.byteLength === decoded.width * decoded.height * 4,
		'Meadow Entry detail boundary RGBA dimensions are invalid'
	);
	assert(
		Number.isInteger(comparisonBandPx) && comparisonBandPx > 0,
		'Meadow Entry detail boundary comparison band is invalid'
	);
	const ids = new Set<string>();
	const priorities = new Set<number>();
	for (const panel of panels) {
		assert(
			panel.id.length > 0 && !ids.has(panel.id),
			'Meadow Entry detail boundary panel id is invalid'
		);
		ids.add(panel.id);
		assert(
			Number.isInteger(panel.assemblyPriority) &&
				panel.assemblyPriority >= 0 &&
				!priorities.has(panel.assemblyPriority),
			`Meadow Entry detail boundary panel ${panel.id} priority is invalid`
		);
		priorities.add(panel.assemblyPriority);
		assert(
			Number.isInteger(panel.bounds.left) &&
				Number.isInteger(panel.bounds.top) &&
				Number.isInteger(panel.bounds.right) &&
				Number.isInteger(panel.bounds.bottom) &&
				panel.bounds.left > 0 &&
				panel.bounds.top > 0 &&
				panel.bounds.right < decoded.width &&
				panel.bounds.bottom < decoded.height &&
				panel.bounds.right > panel.bounds.left &&
				panel.bounds.bottom > panel.bounds.top,
			`Meadow Entry detail boundary panel ${panel.id} bounds are invalid`
		);
	}
}

export function measureMeadowEntryDetailBoundaryMetrics(
	decoded: DecodedMeadowEntryRgba,
	panels: readonly MeadowEntryDetailBoundaryPanel[],
	comparisonBandPx = 32
): readonly MeadowEntryDetailBoundaryMetric[] {
	validateInputs(decoded, panels, comparisonBandPx);
	const metrics: MeadowEntryDetailBoundaryMetric[] = [];
	for (const panel of panels) {
		const laterBounds = panels
			.filter((candidate) => candidate.assemblyPriority > panel.assemblyPriority)
			.map((candidate) => candidate.bounds);
		for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
			const boundarySteps: number[] = [];
			const comparisonSteps: number[] = [];
			for (const sample of edgeSamples(panel, edge)) {
				if (laterBounds.some((bounds) => contains(bounds, sample.perimeter))) continue;
				boundarySteps.push(rgbStep(decoded, sample.first, sample.second));
				for (let distance = -comparisonBandPx; distance <= comparisonBandPx; distance += 1) {
					if (distance === 0) continue;
					const first = shifted(sample.first, sample.normal, distance);
					const second = shifted(sample.second, sample.normal, distance);
					if (!insideImage(decoded, first) || !insideImage(decoded, second)) continue;
					if (laterBounds.some((bounds) => contains(bounds, first) || contains(bounds, second))) {
						continue;
					}
					comparisonSteps.push(rgbStep(decoded, first, second));
				}
			}
			if (boundarySteps.length === 0) continue;
			assert(
				comparisonSteps.length > 0,
				`Meadow Entry detail boundary ${panel.id}/${edge} has no comparison samples`
			);
			const edgeMean = mean(boundarySteps);
			const edgeP95 = meadowEntryNearestRank(boundarySteps, 0.95);
			const comparisonMean = mean(comparisonSteps);
			const comparisonP95 = meadowEntryNearestRank(comparisonSteps, 0.95);
			metrics.push({
				panelId: panel.id,
				edge,
				samples: boundarySteps.length,
				edgeMean,
				edgeP95,
				comparisonSamples: comparisonSteps.length,
				comparisonMean,
				comparisonP95,
				excess: Math.max(0, edgeMean - comparisonMean),
				p95Ratio: comparisonP95 === 0 ? null : edgeP95 / comparisonP95
			});
		}
	}
	return metrics;
}
