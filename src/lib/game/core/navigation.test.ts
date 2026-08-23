import { describe, expect, it } from 'vitest';

import {
	compileNavigationGrid,
	createOpenNavigationGrid,
	isWalkable,
	isPositionWalkable,
	resolveMovementSegment,
	type NavigationObstacle,
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

function openGrid(widthCells = 8, heightCells = 8, cellSizePx = 16) {
	return createOpenNavigationGrid({
		id: 'open',
		mapId: 'open-map',
		cellSizePx,
		widthCells,
		heightCells
	});
}

describe('navigation movement and obstacle policies', () => {
	it('blocks a large step when its segment crosses a blocked cell despite open endpoints', () => {
		const grid = compileNavigationGrid(source({ widthCells: 4, heightCells: 1, rows: ['..#.'] }));

		expect(isWalkable(grid, 8, 8)).toBe(true);
		expect(isWalkable(grid, 56, 8)).toBe(true);
		expect(resolveMovementSegment(grid, [], { x: 8, y: 8 }, { x: 56, y: 8 }, 12)).toEqual({
			x: 8,
			y: 8
		});
	});

	it('resolves a blocked diagonal onto its open Y axis after testing X first', () => {
		const grid = compileNavigationGrid(source({ widthCells: 4, rows: ['..#.', '....', '....'] }));

		expect(resolveMovementSegment(grid, [], { x: 8, y: 8 }, { x: 56, y: 40 }, 0)).toEqual({
			x: 8,
			y: 40
		});
	});

	it('resolves a blocked diagonal onto its open X axis when the Y leg is blocked', () => {
		const grid = compileNavigationGrid(source({ rows: ['...', '..#', '...'] }));

		expect(resolveMovementSegment(grid, [], { x: 8, y: 8 }, { x: 40, y: 40 }, 0)).toEqual({
			x: 40,
			y: 8
		});
	});

	it('keeps a straight open segment unchanged', () => {
		const grid = openGrid();

		expect(resolveMovementSegment(grid, [], { x: 8, y: 8 }, { x: 104, y: 8 }, 12)).toEqual({
			x: 104,
			y: 8
		});
	});

	it('strict rectangles block entry and inside-to-inside movement but permit one-step escape', () => {
		const grid = openGrid();
		const obstacle: NavigationObstacle = {
			id: 'wall',
			shape: 'rect',
			bounds: { left: 32, right: 64, top: 32, bottom: 64 },
			movement: 'strict',
			invalidAtRest: true
		};

		expect(resolveMovementSegment(grid, [obstacle], { x: 8, y: 48 }, { x: 40, y: 48 }, 0)).toEqual({
			x: 8,
			y: 48
		});
		expect(resolveMovementSegment(grid, [obstacle], { x: 40, y: 48 }, { x: 48, y: 48 }, 0)).toEqual(
			{
				x: 40,
				y: 48
			}
		);
		expect(resolveMovementSegment(grid, [obstacle], { x: 40, y: 48 }, { x: 8, y: 48 }, 0)).toEqual({
			x: 8,
			y: 48
		});
	});

	it('escape-aware rectangles permit only movement increasing distance from their escape origin while embedded', () => {
		const grid = openGrid();
		const obstacle: NavigationObstacle = {
			id: 'crate',
			shape: 'rect',
			bounds: { left: 32, right: 64, top: 32, bottom: 64 },
			movement: 'escape-aware',
			invalidAtRest: true,
			escapeOrigin: { x: 48, y: 48 }
		};

		expect(resolveMovementSegment(grid, [obstacle], { x: 56, y: 48 }, { x: 48, y: 48 }, 0)).toEqual(
			{
				x: 56,
				y: 48
			}
		);
		expect(resolveMovementSegment(grid, [obstacle], { x: 56, y: 48 }, { x: 64, y: 48 }, 0)).toEqual(
			{
				x: 64,
				y: 48
			}
		);
	});

	it('escape-aware circles use the same outward-only policy while embedded', () => {
		const grid = openGrid();
		const obstacle: NavigationObstacle = {
			id: 'npc',
			shape: 'circle',
			center: { x: 48, y: 48 },
			radius: 8,
			movement: 'escape-aware',
			invalidAtRest: false
		};

		expect(resolveMovementSegment(grid, [obstacle], { x: 52, y: 48 }, { x: 48, y: 48 }, 0)).toEqual(
			{
				x: 52,
				y: 48
			}
		);
		expect(resolveMovementSegment(grid, [obstacle], { x: 52, y: 48 }, { x: 56, y: 48 }, 0)).toEqual(
			{
				x: 56,
				y: 48
			}
		);
	});

	it('uses the full landmark body when no transition candidate matches', () => {
		const grid = openGrid();
		const landmark: NavigationObstacle = {
			id: 'house',
			shape: 'landmark',
			landmarkId: 'hero-house-exterior',
			bounds: { left: 32, right: 96, top: 32, bottom: 96 },
			doorCandidates: [{ id: 'unrelated-exit', point: { x: 64, y: 64 } }],
			doorwayWidthPx: 24,
			transitionRadiusPx: 10,
			invalidAtRest: true
		};

		expect(resolveMovementSegment(grid, [landmark], { x: 16, y: 64 }, { x: 48, y: 64 }, 0)).toEqual(
			{
				x: 16,
				y: 64
			}
		);
	});

	it('matches a landmark doorway by candidate ID and point, carves body sides, and passes below it', () => {
		const grid = openGrid(10, 10);
		const landmark: NavigationObstacle = {
			id: 'house',
			shape: 'landmark',
			landmarkId: 'hero-house-exterior',
			bounds: { left: 32, right: 96, top: 32, bottom: 96 },
			doorCandidates: [
				{ id: 'hero-house-entry', point: { x: 64, y: 52 } },
				{ id: 'hero-house-far', point: { x: 112, y: 52 } }
			],
			doorwayWidthPx: 24,
			transitionRadiusPx: 10,
			invalidAtRest: true
		};

		expect(resolveMovementSegment(grid, [landmark], { x: 64, y: 64 }, { x: 64, y: 48 }, 0)).toEqual(
			{
				x: 64,
				y: 48
			}
		);
		expect(resolveMovementSegment(grid, [landmark], { x: 64, y: 64 }, { x: 40, y: 64 }, 0)).toEqual(
			{
				x: 64,
				y: 64
			}
		);
		expect(resolveMovementSegment(grid, [landmark], { x: 64, y: 64 }, { x: 88, y: 64 }, 0)).toEqual(
			{
				x: 64,
				y: 64
			}
		);
		expect(
			resolveMovementSegment(grid, [landmark], { x: 64, y: 112 }, { x: 64, y: 128 }, 0)
		).toEqual({
			x: 64,
			y: 128
		});
	});

	it('expands rectangle and circle obstacles by player radius without expanding the authored grid again', () => {
		const grid = compileNavigationGrid(
			source({ widthCells: 3, heightCells: 2, rows: ['.#.', '...'] })
		);
		const rect: NavigationObstacle = {
			id: 'box',
			shape: 'rect',
			bounds: { left: 64, right: 80, top: 16, bottom: 32 },
			movement: 'strict',
			invalidAtRest: true
		};
		const circle: NavigationObstacle = {
			id: 'orb',
			shape: 'circle',
			center: { x: 24, y: 24 },
			radius: 2,
			movement: 'escape-aware',
			invalidAtRest: true
		};

		expect(resolveMovementSegment(grid, [], { x: 8, y: 24 }, { x: 40, y: 24 }, 100)).toEqual({
			x: 40,
			y: 24
		});
		expect(
			resolveMovementSegment(openGrid(8, 4), [rect], { x: 48, y: 24 }, { x: 60, y: 24 }, 4)
		).toEqual({
			x: 48,
			y: 24
		});
		expect(
			resolveMovementSegment(openGrid(8, 4), [circle], { x: 8, y: 24 }, { x: 20, y: 24 }, 4)
		).toEqual({
			x: 8,
			y: 24
		});
	});

	it('does not treat NPC circles marked valid at rest as save-position blockers', () => {
		const grid = openGrid();
		const npc: NavigationObstacle = {
			id: 'villager',
			shape: 'circle',
			center: { x: 48, y: 48 },
			radius: 11,
			movement: 'escape-aware',
			invalidAtRest: false
		};

		expect(isPositionWalkable(grid, [npc], { x: 48, y: 48 }, 12, 'movement-target')).toBe(false);
		expect(isPositionWalkable(grid, [npc], { x: 48, y: 48 }, 12, 'resting-position')).toBe(true);
	});
});
