import { describe, expect, it } from 'vitest';

import {
	compileNavigationGrid,
	createOpenNavigationGrid,
	isWalkable,
	type NavigationMaskSource
} from '$lib/game/core/navigation';

function source(overrides: Partial<NavigationMaskSource> = {}): NavigationMaskSource {
	return {
		id: 'tiny',
		mapId: 'tiny-map',
		cellSizePx: 16,
		widthCells: 3,
		heightCells: 3,
		clearancePx: 0,
		rows: ['...', '.#.', '...'],
		...overrides
	};
}

describe('navigation grid compilation', () => {
	it('compiles raw cells into row-major packed bits and supports constant-time lookup', () => {
		const grid = compileNavigationGrid(source());

		expect(grid).toMatchObject({
			id: 'tiny',
			mapId: 'tiny-map',
			cellSizePx: 16,
			widthCells: 3,
			heightCells: 3,
			widthPx: 48,
			heightPx: 48
		});
		expect(Array.from(grid.blockedBits)).toEqual([0b0001_0000, 0]);
		expect(isWalkable(grid, 24, 24)).toBe(false);
		expect(isWalkable(grid, 8, 8)).toBe(true);
		expect(isWalkable(grid, 40, 40)).toBe(true);

		const finalCellGrid = compileNavigationGrid(source({ rows: ['...', '...', '..#'] }));
		expect(Array.from(finalCellGrid.blockedBits)).toEqual([0, 1]);
	});

	it.each([
		['row count', { rows: ['...', '...'] }],
		['row width', { rows: ['...', '.#.', '....'] }],
		['glyph alphabet', { rows: ['...', '.x.', '...'] }],
		['zero width', { widthCells: 0 }],
		['zero height', { heightCells: 0 }],
		['negative width', { widthCells: -1 }],
		['fractional height', { heightCells: 1.5 }],
		['zero cell size', { cellSizePx: 0 }],
		['negative cell size', { cellSizePx: -1 }],
		['fractional cell size', { cellSizePx: 1.5 }]
	] as const)('rejects invalid %s', (_label, overrides) => {
		expect(() => compileNavigationGrid(source(overrides))).toThrow();
	});

	it('rejects negative and non-finite clearance', () => {
		expect(() => compileNavigationGrid(source({ clearancePx: -1 }))).toThrow();
		expect(() => compileNavigationGrid(source({ clearancePx: Number.NaN }))).toThrow();
		expect(() =>
			compileNavigationGrid(source({ clearancePx: Number.POSITIVE_INFINITY }))
		).toThrow();
	});

	it('uses point-to-rectangle distance for horizontal, vertical, and diagonal clearance', () => {
		const grid = compileNavigationGrid(source({ clearancePx: 8 }));

		expect(isWalkable(grid, 8, 24)).toBe(false);
		expect(isWalkable(grid, 40, 24)).toBe(false);
		expect(isWalkable(grid, 24, 8)).toBe(false);
		expect(isWalkable(grid, 24, 40)).toBe(false);
		expect(isWalkable(grid, 8, 8)).toBe(true);
		expect(isWalkable(grid, 40, 40)).toBe(true);
	});

	it('creates an open packed grid with no blocked bits', () => {
		const grid = createOpenNavigationGrid({
			id: 'open',
			mapId: 'open-map',
			cellSizePx: 8,
			widthCells: 10,
			heightCells: 2
		});

		expect(grid.widthPx).toBe(80);
		expect(grid.heightPx).toBe(16);
		expect(Array.from(grid.blockedBits)).toEqual([0, 0, 0]);
		expect(isWalkable(grid, 79.99, 15.99)).toBe(true);
	});

	it('maps exact maximum world bounds to the final cells and rejects out-of-bounds points', () => {
		const grid = compileNavigationGrid(
			source({
				widthCells: 2,
				heightCells: 2,
				rows: ['.#', '..']
			})
		);

		expect(isWalkable(grid, 16, 0)).toBe(false);
		expect(isWalkable(grid, 0, 16)).toBe(true);
		expect(isWalkable(grid, 16, 16)).toBe(true);
		expect(isWalkable(grid, -0.01, 0)).toBe(false);
		expect(isWalkable(grid, 0, -0.01)).toBe(false);
		expect(isWalkable(grid, 16.01, 0)).toBe(false);
		expect(isWalkable(grid, 0, 32.01)).toBe(false);
		expect(isWalkable(grid, Number.NaN, 0)).toBe(false);
		expect(isWalkable(grid, Number.POSITIVE_INFINITY, 0)).toBe(false);
	});

	it('freezes metadata while leaving the bitset as typed-array storage', () => {
		const grid = createOpenNavigationGrid({
			id: 'open',
			mapId: 'open-map',
			cellSizePx: 8,
			widthCells: 1,
			heightCells: 1
		});

		expect(Object.isFrozen(grid)).toBe(true);
		expect(Object.isFrozen(grid.blockedBits)).toBe(false);
		expect(() => {
			(grid as unknown as { id: string }).id = 'changed';
		}).toThrow(TypeError);
		expect(grid.id).toBe('open');
	});

	it('does not require Phaser globals', () => {
		const globals = globalThis as unknown as Record<string, unknown>;
		const phaserDescriptor = Object.getOwnPropertyDescriptor(globals, 'Phaser');
		Reflect.deleteProperty(globals, 'Phaser');

		try {
			const grid = createOpenNavigationGrid({
				id: 'open',
				mapId: 'open-map',
				cellSizePx: 8,
				widthCells: 1,
				heightCells: 1
			});
			expect(isWalkable(grid, 4, 4)).toBe(true);
		} finally {
			if (phaserDescriptor) Reflect.defineProperty(globals, 'Phaser', phaserDescriptor);
		}
	});
});
