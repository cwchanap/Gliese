import { describe, expect, it } from 'vitest';

import { TERRAIN_LEGEND } from './legend';
import { GRID_MAP_COLORS, buildGridMapPixels } from './map-image';

describe('buildGridMapPixels', () => {
	it('gives every terrain glyph a map colour', () => {
		expect(Object.keys(GRID_MAP_COLORS).sort()).toEqual(Object.keys(TERRAIN_LEGEND).sort());
	});

	it('paints one opaque pixel per tile, with buildings over the terrain', () => {
		const { width, height, pixels } = buildGridMapPixels(
			['.~', 'T,'],
			[{ id: 'hut', type: 'goblin-hut', col: 1, row: 1, width: 1, height: 1 }]
		);
		expect([width, height]).toEqual([2, 2]);
		const pixel = (col: number, row: number) => [
			...pixels.slice((row * width + col) * 4, (row * width + col) * 4 + 4)
		];
		expect(pixel(0, 0)).toEqual([0x6f, 0x8f, 0x3e, 255]);
		expect(pixel(1, 0)).toEqual([0x3f, 0x86, 0xa8, 255]);
		expect(pixel(0, 1)).toEqual([0x2f, 0x5a, 0x2a, 255]);
		expect(pixel(1, 1)).toEqual([0xa0, 0x68, 0x3a, 255]);
	});
});
