import { describe, expect, it } from 'vitest';

import type { PixelBounds } from './meadow-entry-authoring-types';
import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS
} from './meadow-entry-painted-v2-complete';

function intersection(first: PixelBounds, second: PixelBounds): PixelBounds | null {
	const result = {
		left: Math.max(first.left, second.left),
		top: Math.max(first.top, second.top),
		right: Math.min(first.right, second.right),
		bottom: Math.min(first.bottom, second.bottom)
	};
	return result.left < result.right && result.top < result.bottom ? result : null;
}

function area(bounds: PixelBounds | null): number {
	return bounds === null ? 0 : (bounds.right - bounds.left) * (bounds.bottom - bounds.top);
}

function coversEveryWorldCell(): boolean {
	const xEdges = [
		0,
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
		...MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS.flatMap(({ bounds }) => [
			bounds.left,
			bounds.right
		])
	]
		.filter((value, index, values) => values.indexOf(value) === index)
		.sort((first, second) => first - second);
	const yEdges = [
		0,
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
		...MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS.flatMap(({ bounds }) => [
			bounds.top,
			bounds.bottom
		])
	]
		.filter((value, index, values) => values.indexOf(value) === index)
		.sort((first, second) => first - second);

	for (let xIndex = 0; xIndex < xEdges.length - 1; xIndex += 1) {
		for (let yIndex = 0; yIndex < yEdges.length - 1; yIndex += 1) {
			const cell = {
				left: xEdges[xIndex]!,
				top: yEdges[yIndex]!,
				right: xEdges[xIndex + 1]!,
				bottom: yEdges[yIndex + 1]!
			};
			if (
				!MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS.some(
					({ bounds }) =>
						bounds.left <= cell.left &&
						bounds.top <= cell.top &&
						bounds.right >= cell.right &&
						bounds.bottom >= cell.bottom
				)
			) {
				return false;
			}
		}
	}
	return true;
}

describe('complete Meadow Entry painted-v2 source-panel contract', () => {
	it('declares the exact twelve landscape panels in row-major order', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS).toEqual([
			{
				id: 'north-west',
				bounds: { left: 0, top: 0, right: 2432, bottom: 1792 },
				expectedDimensions: { width: 2432, height: 1792 },
				assemblyPriority: 0,
				rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/north-west.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/north-west.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/north-west.json'
			},
			{
				id: 'north-center',
				bounds: { left: 1984, top: 0, right: 4416, bottom: 1792 },
				expectedDimensions: { width: 2432, height: 1792 },
				assemblyPriority: 1,
				rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/north-center.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/north-center.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/north-center.json'
			},
			{
				id: 'north-east',
				bounds: { left: 3968, top: 0, right: 6400, bottom: 1792 },
				expectedDimensions: { width: 2432, height: 1792 },
				assemblyPriority: 2,
				rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/north-east.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/north-east.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/north-east.json'
			},
			{
				id: 'north-mid-west',
				bounds: { left: 0, top: 1536, right: 2432, bottom: 3328 },
				expectedDimensions: { width: 2432, height: 1792 },
				assemblyPriority: 3,
				rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/north-mid-west.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/north-mid-west.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/north-mid-west.json'
			},
			{
				id: 'north-mid-center',
				bounds: { left: 1984, top: 1536, right: 4416, bottom: 3328 },
				expectedDimensions: { width: 2432, height: 1792 },
				assemblyPriority: 4,
				rawPath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/north-mid-center.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/north-mid-center.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/north-mid-center.json'
			},
			{
				id: 'north-mid-east',
				bounds: { left: 3968, top: 1536, right: 6400, bottom: 3328 },
				expectedDimensions: { width: 2432, height: 1792 },
				assemblyPriority: 5,
				rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/north-mid-east.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/north-mid-east.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/north-mid-east.json'
			},
			{
				id: 'south-mid-west',
				bounds: { left: 0, top: 3072, right: 2432, bottom: 4864 },
				expectedDimensions: { width: 2432, height: 1792 },
				assemblyPriority: 6,
				rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/south-mid-west.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/south-mid-west.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/south-mid-west.json'
			},
			{
				id: 'south-mid-center',
				bounds: { left: 1984, top: 3072, right: 4416, bottom: 4864 },
				expectedDimensions: { width: 2432, height: 1792 },
				assemblyPriority: 7,
				rawPath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/south-mid-center.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/south-mid-center.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/south-mid-center.json'
			},
			{
				id: 'south-mid-east',
				bounds: { left: 3968, top: 3072, right: 6400, bottom: 4864 },
				expectedDimensions: { width: 2432, height: 1792 },
				assemblyPriority: 8,
				rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/south-mid-east.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/south-mid-east.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/south-mid-east.json'
			},
			{
				id: 'south-west',
				bounds: { left: 0, top: 4608, right: 2432, bottom: 6400 },
				expectedDimensions: { width: 2432, height: 1792 },
				assemblyPriority: 9,
				rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/south-west.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/south-west.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/south-west.json'
			},
			{
				id: 'south-center',
				bounds: { left: 1984, top: 4608, right: 4416, bottom: 6400 },
				expectedDimensions: { width: 2432, height: 1792 },
				assemblyPriority: 10,
				rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/south-center.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/south-center.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/south-center.json'
			},
			{
				id: 'south-east',
				bounds: { left: 3968, top: 4608, right: 6400, bottom: 6400 },
				expectedDimensions: { width: 2432, height: 1792 },
				assemblyPriority: 11,
				rawPath: 'artifacts/meadow-entry/painted-v2/complete/source-panels/raw/south-east.png',
				normalizedPath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/normalized/south-east.png',
				provenancePath:
					'artifacts/meadow-entry/painted-v2/complete/source-panels/provenance/south-east.json'
			}
		]);
	});

	it('covers the 6400×6400 world exactly and has the declared 448×256 internal overlaps', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS).toHaveLength(12);
		expect(coversEveryWorldCell()).toBe(true);
		expect(new Set(MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS.map(({ id }) => id)).size).toBe(
			12
		);
		expect(
			new Set(
				MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS.map(
					({ assemblyPriority }) => assemblyPriority
				)
			)
		).toEqual(new Set(Array.from({ length: 12 }, (_, index) => index)));

		const byId = new Map(
			MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS.map((panel) => [panel.id, panel])
		);
		for (const [firstId, secondId] of [
			['north-west', 'north-center'],
			['north-center', 'north-east'],
			['north-mid-west', 'north-mid-center'],
			['north-mid-center', 'north-mid-east'],
			['south-mid-west', 'south-mid-center'],
			['south-mid-center', 'south-mid-east'],
			['south-west', 'south-center'],
			['south-center', 'south-east']
		] as const) {
			expect(area(intersection(byId.get(firstId)!.bounds, byId.get(secondId)!.bounds))).toBe(
				448 * 1792
			);
		}
		for (const [firstId, secondId] of [
			['north-west', 'north-mid-west'],
			['north-center', 'north-mid-center'],
			['north-east', 'north-mid-east'],
			['north-mid-west', 'south-mid-west'],
			['north-mid-center', 'south-mid-center'],
			['north-mid-east', 'south-mid-east'],
			['south-mid-west', 'south-west'],
			['south-mid-center', 'south-center'],
			['south-mid-east', 'south-east']
		] as const) {
			expect(area(intersection(byId.get(firstId)!.bounds, byId.get(secondId)!.bounds))).toBe(
				2432 * 256
			);
		}
	});

	it('uses only the complete source namespace and freezes every contract record', () => {
		for (const panel of MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS) {
			expect(panel.rawPath).toContain('/painted-v2/complete/source-panels/raw/');
			expect(panel.normalizedPath).toContain('/painted-v2/complete/source-panels/normalized/');
			expect(panel.provenancePath).toContain('/painted-v2/complete/source-panels/provenance/');
			expect(panel.rawPath).not.toContain('/painted-v2/source-panels/');
			expect(panel.normalizedPath).not.toContain('/painted-v2/source-panels/');
			expect(panel.provenancePath).not.toContain('/painted-v2/source-panels/');
			expect(panel.expectedDimensions).toEqual({ width: 2432, height: 1792 });
			expect(Object.isFrozen(panel)).toBe(true);
			expect(Object.isFrozen(panel.bounds)).toBe(true);
			expect(Object.isFrozen(panel.expectedDimensions)).toBe(true);
		}
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS)).toBe(true);
	});
});
