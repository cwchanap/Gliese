import { describe, expect, it, vi } from 'vitest';

import { walk } from './navigation-test-utils';

import { buildVillageInteriorNavigationSource } from '$lib/game/content/backgrounds/village-interior-package';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';
import { MAP_TRANSITION_TRIGGER_RADIUS } from '$lib/game/core/collision';

import {
	compileNavigationGrid,
	createOpenNavigationGrid,
	entersUnrelatedDoorZone,
	findNearestWalkablePosition,
	findLandmarkDoorway,
	getLandmarkCollisionRects,
	isInTransitionZone,
	isWalkable,
	isPointInsideAnyRect,
	isPointInsideRect,
	isPositionWalkable,
	resolveMovementSegment,
	type NavigationObstacle,
	type NavigationMaskSource,
	type NavigationPoint
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

	it('uses the same containing-cell convention for exact internal boundaries at rest and during sweeps', () => {
		const verticalBoundary = compileNavigationGrid(
			source({ widthCells: 2, heightCells: 1, rows: ['#.'] })
		);
		const horizontalBoundary = compileNavigationGrid(
			source({ widthCells: 1, heightCells: 2, rows: ['#', '.'] })
		);

		expect(isWalkable(verticalBoundary, 16, 8)).toBe(true);
		expect(
			resolveMovementSegment(verticalBoundary, [], { x: 24, y: 8 }, { x: 16, y: 8 }, 0)
		).toEqual({ x: 16, y: 8 });
		expect(
			resolveMovementSegment(verticalBoundary, [], { x: 16, y: 8 }, { x: 24, y: 8 }, 0)
		).toEqual({ x: 24, y: 8 });

		expect(isWalkable(horizontalBoundary, 8, 16)).toBe(true);
		expect(
			resolveMovementSegment(horizontalBoundary, [], { x: 8, y: 24 }, { x: 8, y: 16 }, 0)
		).toEqual({ x: 8, y: 16 });
		expect(
			resolveMovementSegment(horizontalBoundary, [], { x: 8, y: 16 }, { x: 8, y: 24 }, 0)
		).toEqual({ x: 8, y: 24 });
	});

	it('compiles clearance from localized blocker neighborhoods instead of candidate-wide raw scans', () => {
		const rows = Array.from({ length: 32 }, (_unused, row) =>
			row === 16 ? `${'.'.repeat(16)}#${'.'.repeat(15)}` : '.'.repeat(32)
		);
		const someSpy = vi.spyOn(Array.prototype, 'some');

		compileNavigationGrid({
			id: 'shape',
			mapId: 'shape-map',
			cellSizePx: 16,
			widthCells: 32,
			heightCells: 32,
			clearancePx: 8,
			rows
		});

		const someCallCount = someSpy.mock.calls.length;
		someSpy.mockRestore();
		expect(someCallCount).toBe(0);
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
	it('returns the containing cell center when it is walkable at rest', () => {
		const grid = openGrid(3, 3, 16);

		expect(findNearestWalkablePosition(grid, [], { x: 25, y: 23 }, 12)).toEqual({
			x: 24,
			y: 24
		});
	});

	it('searches the first row-major candidate in the next Chebyshev ring', () => {
		const grid = compileNavigationGrid(source({ rows: ['...', '.#.', '...'], cellSizePx: 16 }));

		expect(findNearestWalkablePosition(grid, [], { x: 24, y: 24 }, 0)).toEqual({
			x: 8,
			y: 8
		});
	});

	it.each([
		{
			label: 'strict rectangle',
			obstacle: {
				id: 'wall',
				shape: 'rect',
				bounds: { left: 20, right: 28, top: 20, bottom: 28 },
				movement: 'strict',
				invalidAtRest: true
			} satisfies NavigationObstacle
		},
		{
			label: 'escape-aware rectangle',
			obstacle: {
				id: 'crate',
				shape: 'rect',
				bounds: { left: 20, right: 28, top: 20, bottom: 28 },
				movement: 'escape-aware',
				invalidAtRest: true,
				escapeOrigin: { x: 24, y: 24 }
			} satisfies NavigationObstacle
		},
		{
			label: 'landmark',
			obstacle: {
				id: 'house',
				shape: 'landmark',
				landmarkId: 'house-exterior',
				bounds: { left: 20, right: 28, top: 20, bottom: 28 },
				doorCandidates: [],
				doorwayWidthPx: 56,
				transitionRadiusPx: 18,
				invalidAtRest: true
			} satisfies NavigationObstacle
		}
	])('$label positions are invalid at rest', ({ obstacle }) => {
		const grid = openGrid(3, 3, 16);

		expect(findNearestWalkablePosition(grid, [obstacle], { x: 24, y: 24 }, 0)).toEqual({
			x: 8,
			y: 8
		});
	});

	it('does not displace a save for an NPC obstacle that is valid at rest', () => {
		const grid = openGrid(3, 3, 16);
		const npc: NavigationObstacle = {
			id: 'villager',
			shape: 'circle',
			center: { x: 24, y: 24 },
			radius: 12,
			movement: 'escape-aware',
			invalidAtRest: false
		};

		expect(findNearestWalkablePosition(grid, [npc], { x: 24, y: 24 }, 12)).toEqual({
			x: 24,
			y: 24
		});
	});

	it('returns null when every grid cell is blocked', () => {
		const grid = compileNavigationGrid(source({ rows: ['###', '###', '###'], cellSizePx: 16 }));

		expect(findNearestWalkablePosition(grid, [], { x: 24, y: 24 }, 0)).toBeNull();
	});

	it.each([
		[16, { x: 8, y: 8 }],
		[32, { x: 16, y: 16 }]
	] as const)('uses %dpx grid cell centers for recovery', (cellSizePx, expected) => {
		const grid = createOpenNavigationGrid({
			id: `open-${cellSizePx}`,
			mapId: 'open-map',
			cellSizePx,
			widthCells: 2,
			heightCells: 2
		});

		expect(findNearestWalkablePosition(grid, [], { x: 1, y: 1 }, 0)).toEqual(expected);
	});

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

	it('allows movement to exact width and height maximum endpoints on an open grid', () => {
		const grid = openGrid(2, 2);

		expect(isWalkable(grid, 32, 8)).toBe(true);
		expect(isWalkable(grid, 8, 32)).toBe(true);
		expect(resolveMovementSegment(grid, [], { x: 24, y: 8 }, { x: 32, y: 8 }, 0)).toEqual({
			x: 32,
			y: 8
		});
		expect(resolveMovementSegment(grid, [], { x: 8, y: 24 }, { x: 8, y: 32 }, 0)).toEqual({
			x: 8,
			y: 32
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

	it('exposes shared doorway decomposition and containment for compatibility adapters', () => {
		const landmark: NavigationObstacle = {
			id: 'house',
			shape: 'landmark',
			landmarkId: 'hero-house-exterior',
			bounds: { left: 32, right: 96, top: 32, bottom: 96 },
			doorCandidates: [{ id: 'hero-house-entry', point: { x: 64, y: 52 } }],
			doorwayWidthPx: 24,
			transitionRadiusPx: 10,
			invalidAtRest: true
		};

		expect(
			findLandmarkDoorway(landmark.landmarkId, landmark.bounds, landmark.doorCandidates)
		).toEqual({ id: 'hero-house-entry', point: { x: 64, y: 52 } });
		expect(getLandmarkCollisionRects(landmark)).toEqual([
			{ left: 32, right: 96, top: 32, bottom: 42 },
			{ left: 32, right: 52, top: 42, bottom: 96 },
			{ left: 76, right: 96, top: 42, bottom: 96 }
		]);
		expect(isPointInsideRect({ x: 48, y: 48 }, landmark.bounds, 0)).toBe(true);
		expect(isPointInsideAnyRect({ x: 110, y: 48 }, [landmark.bounds], 0)).toBe(false);
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
		// The slide is vetoed so these two pin only the padding, not the corner slide around it.
		const noSlide = { canSlideTo: () => false };
		expect(
			resolveMovementSegment(openGrid(8, 4), [rect], { x: 48, y: 24 }, { x: 60, y: 24 }, 4, noSlide)
		).toEqual({
			x: 48,
			y: 24
		});
		expect(
			resolveMovementSegment(
				openGrid(8, 4),
				[circle],
				{ x: 8, y: 24 },
				{ x: 20, y: 24 },
				4,
				noSlide
			)
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

describe('corner slide', () => {
	// A two-cell lane (x 32–64, y 32–80) through a wall; open ground above and below it.
	const verticalLane = () =>
		compileNavigationGrid(
			source({
				widthCells: 6,
				heightCells: 8,
				rows: ['......', '......', '##..##', '##..##', '##..##', '......', '......', '......']
			})
		);
	// The same lane laid on its side (x 32–80, y 32–64).
	const horizontalLane = () =>
		compileNavigationGrid(
			source({
				widthCells: 8,
				heightCells: 6,
				rows: ['..###...', '..###...', '........', '........', '..###...', '..###...']
			})
		);
	const south = { x: 0, y: 1 };
	const east = { x: 1, y: 0 };

	it('carries a straight push into a lane that is a few pixels off', () => {
		const end = walk(verticalLane(), [], { x: 68, y: 24 }, south, 40);

		expect(end.x).toBeGreaterThanOrEqual(32);
		expect(end.x).toBeLessThan(64);
		expect(end.y).toBeGreaterThan(96);
	});

	it('does the same for a push along the other axis', () => {
		const end = walk(horizontalLane(), [], { x: 24, y: 68 }, east, 40);

		expect(end.y).toBeGreaterThanOrEqual(32);
		expect(end.y).toBeLessThan(64);
		expect(end.x).toBeGreaterThan(96);
	});

	it('reaches at most one cell sideways', () => {
		const grid = verticalLane();

		// x = 79 needs 16px to reach the lane, x = 80 needs 17.
		expect(resolveMovementSegment(grid, [], { x: 79, y: 24 }, { x: 79, y: 40 }, 0)).toEqual({
			x: 63,
			y: 40
		});
		expect(resolveMovementSegment(grid, [], { x: 80, y: 24 }, { x: 80, y: 40 }, 0)).toEqual({
			x: 80,
			y: 24
		});
	});

	it('moves sideways no faster than the push, then goes forward once aligned', () => {
		const grid = verticalLane();

		// The lane is 5px away; a 2px push slides 2px and does not advance yet.
		expect(resolveMovementSegment(grid, [], { x: 68, y: 31 }, { x: 68, y: 33 }, 0)).toEqual({
			x: 66,
			y: 31
		});
		// A 5px push is enough to slide the full 5px and advance.
		expect(resolveMovementSegment(grid, [], { x: 68, y: 31 }, { x: 68, y: 36 }, 0)).toEqual({
			x: 63,
			y: 36
		});
	});

	it('lets the caller veto a slide', () => {
		const grid = verticalLane();
		const from = { x: 68, y: 31 };
		const to = { x: 68, y: 36 };

		expect(resolveMovementSegment(grid, [], from, to, 0, { canSlideTo: () => false })).toEqual(
			from
		);
		expect(
			resolveMovementSegment(grid, [], from, to, 0, { canSlideTo: (point) => point.x < 64 })
		).toEqual({ x: 63, y: 36 });
	});

	it('checks canSlideTo against the aligned end point so a vetoed side does not strand the player', () => {
		// Single 1-cell wide obstacle at col 3 (x: 48-64), row 2-3 (y: 32-64).
		// Player at x=54, y=31 pushing south into row 2.
		// West opening is at x < 48 (offset 7px west).
		// East opening is at x >= 64 (offset 10px east).
		// With a 2px push (push = 2), offset > push, so each frame only takes a 2px partial step.
		// If canSlideTo vetoes the west aligned destination (x=47, y=33), the search must not greedily
		// take a partial step west to (52, 31) and strand the player; it should take the east slide.
		const singleCellObstacleGrid = compileNavigationGrid(
			source({
				widthCells: 8,
				heightCells: 6,
				rows: ['........', '........', '...#....', '...#....', '........', '........']
			})
		);
		const from = { x: 54, y: 31 };
		const to = { x: 54, y: 33 }; // 2px push south into row 2
		// West lane needs offset 7px (x=47). East lane needs offset 10px (x=64).
		// Veto any destination or aligned point on the west side (x < 54).
		const result = resolveMovementSegment(singleCellObstacleGrid, [], from, to, 0, {
			canSlideTo: (point) => point.x >= 54
		});
		// Should slide east (x > 54), taking a 2px step east to x = 56.
		expect(result.x).toBe(56);
		expect(result.y).toBe(31);
	});

	it('refuses a slide whose only open lane lies outside the map margin', () => {
		// Open 48x48px grid, radius 12, so the walkable margin is [12, 36].
		const grid = createOpenNavigationGrid({
			id: 'open',
			mapId: 'open-map',
			cellSizePx: 16,
			widthCells: 3,
			heightCells: 3
		});
		// Inflated by the radius this wall spans x 4-60, y 16-52: the south push is
		// blocked and the only lateral clearance is a 4px sliver along the west edge.
		const wall: NavigationObstacle = {
			id: 'edge-wall',
			shape: 'rect',
			bounds: { left: 16, right: 48, top: 28, bottom: 40 },
			movement: 'strict',
			invalidAtRest: true
		};
		// Without the margin guard, offset 15 would slide west to (10, 14) — inside
		// the world but below the 12px margin.
		const from = { x: 18, y: 14 };
		expect(resolveMovementSegment(grid, [wall], from, { x: 18, y: 22 }, 12)).toEqual(from);
	});

	it('does not slide a diagonal push, which already slides along the wall', () => {
		expect(
			resolveMovementSegment(verticalLane(), [], { x: 68, y: 24 }, { x: 72, y: 40 }, 0)
		).toEqual({ x: 72, y: 24 });
	});

	it('stays put at a dead end instead of sliding through the side walls', () => {
		const grid = compileNavigationGrid(
			source({ widthCells: 6, heightCells: 4, rows: ['......', '##..##', '##..##', '######'] })
		);

		expect(resolveMovementSegment(grid, [], { x: 60, y: 40 }, { x: 60, y: 60 }, 0)).toEqual({
			x: 60,
			y: 40
		});
	});

	it('slides around an obstacle body as well as around grid corners', () => {
		const grid = createOpenNavigationGrid({
			id: 'open',
			mapId: 'open-map',
			cellSizePx: 16,
			widthCells: 12,
			heightCells: 12
		});
		const npc: NavigationObstacle = {
			id: 'npc',
			shape: 'circle',
			center: { x: 96, y: 96 },
			radius: 17,
			movement: 'escape-aware',
			invalidAtRest: false
		};

		// x = 76 is 20px from the NPC; it clears the 29px body 9px further west.
		const end = walk(grid, [npc], { x: 76, y: 40 }, south, 40, undefined, 4);
		expect(end.y).toBeGreaterThan(150);
	});
});

describe('entersUnrelatedDoorZone', () => {
	// Point-only transitions stay supported: they are the transition-like shape with
	// no authored triggerRect, and keep the canonical 30px zone.
	const doors = [{ x: 100, y: 100 }];

	it('lets a slide end anywhere outside every door zone', () => {
		expect(
			entersUnrelatedDoorZone({ x: 100, y: 140 }, { x: 100, y: 136 }, { x: 100, y: 140 }, doors)
		).toBe(false);
	});

	it('vetoes a slide that ends in the zone of a door beside the push', () => {
		// Pushing south at x = 131, 31px from the door; the slide steps west to 127.
		expect(
			entersUnrelatedDoorZone({ x: 127, y: 100 }, { x: 131, y: 100 }, { x: 131, y: 104 }, doors)
		).toBe(true);
	});

	it('allows a slide that ends in the zone of the door the push is heading for', () => {
		// Pushing north at y = 125, straight at the door; the slide ends 25px from it.
		expect(
			entersUnrelatedDoorZone({ x: 97, y: 125 }, { x: 100, y: 125 }, { x: 100, y: 121 }, doors)
		).toBe(false);
	});

	it('vetoes a slide that newly enters the zone of a door the straight push misses', () => {
		// Pushing east at y = 124: the straight endpoint is ~31.9px from the door (outside the
		// 30px zone) while the 4px north slide lands 29px from it (inside). The door sits inside
		// the forward heading cone (dot = 100 >= cross = 96), so only the new-entry check vetoes.
		expect(
			entersUnrelatedDoorZone({ x: 79, y: 120 }, { x: 75, y: 124 }, { x: 79, y: 124 }, doors)
		).toBe(true);
	});

	it('vetoes a door almost perpendicular to the push even with a tiny positive forward component', () => {
		// Pushing south from (100, 100) to (100, 104). Door is at (128, 101), 28px east and 1px south.
		// Slide moves 4px east to (104, 100), ending 24px from the door (inside the 30px zone).
		const lateralDoors = [{ x: 128, y: 101 }];
		expect(
			entersUnrelatedDoorZone(
				{ x: 104, y: 100 },
				{ x: 100, y: 100 },
				{ x: 100, y: 104 },
				lateralDoors
			)
		).toBe(true);
	});
});

describe('entersUnrelatedDoorZone with wide doorway rects', () => {
	const blacksmithDoorway = {
		x: 448,
		y: 688,
		triggerRect: { x: 384, y: 672, width: 128, height: 32 }
	};

	it('does not veto an off-center southward push into the doorway it is heading for', () => {
		// A straight south push at the doorway's west side: aiming the heading cone at the
		// doorway centre fails (dot 72 < cross 208); aiming at the nearest rect point
		// (396, 672) passes (dot 8 > cross 0).
		expect(
			entersUnrelatedDoorZone({ x: 400, y: 674 }, { x: 396, y: 670 }, { x: 396, y: 674 }, [
				blacksmithDoorway
			])
		).toBe(false);
	});

	it('still vetoes a lateral push whose slide newly enters the doorway zone', () => {
		// Pushing west along the south face: the straight endpoint misses the doorway, so
		// the slide landing inside the rect is a newly entered, unrelated door zone.
		expect(
			entersUnrelatedDoorZone({ x: 510, y: 688 }, { x: 524, y: 688 }, { x: 520, y: 688 }, [
				blacksmithDoorway
			])
		).toBe(true);
	});

	it('permits an ongoing move wholly inside the same doorway rect despite the zero clamped vector', () => {
		// Clamping an origin already inside the rect yields a zero aim vector; that must
		// not turn an ordinary move within the doorway into an unrelated-door veto.
		expect(
			entersUnrelatedDoorZone({ x: 400, y: 694 }, { x: 396, y: 690 }, { x: 396, y: 694 }, [
				blacksmithDoorway
			])
		).toBe(false);
	});
});

describe('isInTransitionZone', () => {
	const wideDoorway = {
		x: 448,
		y: 688,
		triggerRect: { x: 384, y: 672, width: 128, height: 32 }
	};

	it('keeps the existing 30px circle around x/y when no triggerRect is authored', () => {
		const pointTransition = { x: 100, y: 100 };

		expect(isInTransitionZone(pointTransition, { x: 100, y: 125 })).toBe(true);
		// The circle boundary stays inside, matching tryTransition's `distance > radius` rule.
		expect(isInTransitionZone(pointTransition, { x: 100, y: 130 })).toBe(true);
		expect(isInTransitionZone(pointTransition, { x: 121, y: 100 })).toBe(true);
		expect(isInTransitionZone(pointTransition, { x: 100, y: 131 })).toBe(false);
		expect(isInTransitionZone(pointTransition, { x: 131, y: 121 })).toBe(false);
	});

	it('covers the off-center portion of a 128px doorway through its triggerRect', () => {
		// 52px west of the doorway centre: far outside the 30px circle, inside the rect.
		expect(isInTransitionZone(wideDoorway, { x: 396, y: 680 })).toBe(true);
		expect(isInTransitionZone(wideDoorway, { x: 508, y: 700 })).toBe(true);
		expect(isInTransitionZone(wideDoorway, { x: 384, y: 672 })).toBe(true);
	});

	it('rejects points beyond the rect edges, including above the south wall', () => {
		expect(isInTransitionZone(wideDoorway, { x: 383, y: 688 })).toBe(false);
		expect(isInTransitionZone(wideDoorway, { x: 513, y: 688 })).toBe(false);
		expect(isInTransitionZone(wideDoorway, { x: 448, y: 719 })).toBe(false);
		// The rejected width-band design would have started the rectangle at y=658 and
		// contained this point above the wall.
		expect(isInTransitionZone(wideDoorway, { x: 396, y: 665 })).toBe(false);
	});
});

describe('village interior exterior exits', () => {
	const south = { x: 0, y: 1 };
	const layoutIds = Object.keys(
		VILLAGE_INTERIOR_LAYOUTS
	) as (keyof typeof VILLAGE_INTERIOR_LAYOUTS)[];

	it.each(layoutIds)('%s: left, center and right opening approaches reach the zone', (layoutId) => {
		const layout = VILLAGE_INTERIOR_LAYOUTS[layoutId];
		const grid = compileNavigationGrid(
			buildVillageInteriorNavigationSource({ mapId: layoutId, layout })
		);
		const doorway = layout.doors.exterior;
		const transition = { x: layout.exit.x, y: layout.exit.y, triggerRect: doorway };
		const approachY = doorway.y - 8;

		// Collision-walkable positions just north of the opening. Points painted inside
		// the doorway but blocked by wall or player-radius clearance are not starts.
		const walkableStarts: number[] = [];
		for (let x = doorway.x; x < doorway.x + doorway.width; x += 1) {
			if (isWalkable(grid, x, approachY)) walkableStarts.push(x);
		}
		expect(walkableStarts.length).toBeGreaterThan(0);
		expect(isWalkable(grid, layout.exit.x, approachY)).toBe(true);

		const starts = [walkableStarts[0], layout.exit.x, walkableStarts[walkableStarts.length - 1]];
		for (const startX of starts) {
			const end = walk(grid, [], { x: startX, y: approachY }, south, 40);

			expect(end.y).toBeGreaterThan(approachY);
			expect(isInTransitionZone(transition, end)).toBe(true);
			if (doorway.width < 128) {
				// Narrow 64px exits were already fully covered by the legacy 30px circle.
				expect(Math.hypot(end.x - layout.exit.x, end.y - layout.exit.y)).toBeLessThanOrEqual(
					MAP_TRANSITION_TRIGGER_RADIUS
				);
			}
		}
	});
});

describe('blacksmith jamb slide (HPA-817 regression)', () => {
	const south = { x: 0, y: 1 };
	const blacksmithDoorway = {
		x: 448,
		y: 688,
		triggerRect: VILLAGE_INTERIOR_LAYOUTS['blacksmith-interior'].doors.exterior
	};
	const jambGrid = () =>
		compileNavigationGrid(
			buildVillageInteriorNavigationSource({
				mapId: 'blacksmith-interior',
				layout: VILLAGE_INTERIOR_LAYOUTS['blacksmith-interior']
			})
		);
	// The corner-slide veto, wired exactly as WorldScene.resolvePlayerCollision wires it.
	const doorVeto = () => ({
		canSlideTo: (destination: NavigationPoint, from: NavigationPoint, to: NavigationPoint) =>
			!entersUnrelatedDoorZone(destination, from, to, [blacksmithDoorway])
	});

	it('slides from beside the west jamb toward the opening without a false unrelated-door veto', () => {
		// (393, 660) itself sits inside the wall-clearance band, so the walk starts on
		// the nearest walkable row north of the jamb on the same column.
		const end = walk(jambGrid(), [], { x: 393, y: 652 }, south, 40, doorVeto());

		expect(end.x).toBeGreaterThanOrEqual(400);
		expect(end.y).toBeGreaterThanOrEqual(672);
	});

	it('continues that walk to an active transition without activating above the south wall', () => {
		const end = walk(jambGrid(), [], { x: 393, y: 652 }, south, 40, doorVeto());

		expect(isInTransitionZone(blacksmithDoorway, end)).toBe(true);
		// Above the south wall the zone must stay empty — the rejected width-band
		// rectangle (starting at y=658) would have contained this point.
		expect(isInTransitionZone(blacksmithDoorway, { x: 396, y: 665 })).toBe(false);
	});
});
