import { describe, expect, it } from 'vitest';
import {
	bfsPath,
	hasWidePath,
	maximalRun,
	perpendicularRun,
	roomAdjacency
} from '$lib/game/content/maps/layered/geometry';

const solidFrom = (rows: readonly string[]) => (col: number, row: number) =>
	rows[row]?.[col] === '#';
const walkableFrom = (rows: readonly string[]) => (col: number, row: number) =>
	rows[row]?.[col] !== undefined && rows[row][col] !== '#';

describe('roomAdjacency', () => {
	it('reports two rooms adjacent only through an opening in their divider', () => {
		const regions = ['AAA.BBB', 'AAA.BBB', 'AAA.BBB'];
		const sealed = ['...#...', '...#...', '...#...'];
		const pierced = ['...#...', '.......', '...#...'];
		expect(roomAdjacency(regions, sealed, ['A', 'B'])).toEqual(new Set());
		expect(roomAdjacency(regions, pierced, ['A', 'B'])).toEqual(new Set(['A-B']));
	});

	it('does not route adjacency through a third room', () => {
		const regions = ['AAABBBCCC'];
		const collision = ['.........'];
		// A touches B, B touches C, but A must not be reported adjacent to C.
		expect(roomAdjacency(regions, collision, ['A', 'B', 'C'])).toEqual(new Set(['A-B', 'B-C']));
	});
});

describe('maximalRun', () => {
	// Row 1 is a 5-wide solid bar; col 2 additionally carries a 3-tall solid
	// spike (rows 1-3). The queried cell (2,1) sits at the intersection, so
	// the horizontal (5) and vertical (3) runs through it differ — an
	// implementation with the axis step-vectors swapped would fail both.
	const rows = ['.....', '#####', '..#..', '..#..'];
	it('measures the horizontal run through a cell', () => {
		expect(maximalRun(solidFrom(rows), 2, 1, 'horizontal', 5, 4)).toBe(5);
	});
	it('measures the vertical run through a cell', () => {
		expect(maximalRun(solidFrom(rows), 2, 1, 'vertical', 5, 4)).toBe(3);
	});
	it('reports 1 for an isolated solid cell', () => {
		expect(maximalRun(solidFrom(['#.']), 0, 0, 'horizontal', 2, 1)).toBe(1);
	});
});

describe('bfsPath and perpendicularRun', () => {
	const rows = ['.....', '.###.', '.....'];
	const dims = { width: 5, height: 3 };

	it('finds a route around an obstacle', () => {
		const path = bfsPath({ col: 0, row: 1 }, { col: 4, row: 1 }, walkableFrom(rows), dims);
		expect(path).not.toBeNull();
		expect(path![0]).toEqual({ col: 0, row: 1 });
		expect(path![path!.length - 1]).toEqual({ col: 4, row: 1 });
		// The 3-wide obstacle forces a 1-row detour: 4 straight-line steps
		// plus 2 extra (one to go around, one to come back) = 6 steps, 7 cells.
		// A non-shortest or non-4-connected "route" would miss this.
		expect(path!.length).toBe(7);
		for (let i = 1; i < path!.length; i++) {
			const prev = path![i - 1];
			const curr = path![i];
			const step = Math.abs(curr.col - prev.col) + Math.abs(curr.row - prev.row);
			expect(step).toBe(1);
		}
	});

	it('returns null when no route exists', () => {
		const sealed = ['..#..', '..#..', '..#..'];
		expect(bfsPath({ col: 0, row: 0 }, { col: 4, row: 0 }, walkableFrom(sealed), dims)).toBeNull();
	});

	it('measures the free cross-section perpendicular to travel', () => {
		const open = ['.....', '.....', '.....'];
		const path = bfsPath({ col: 0, row: 1 }, { col: 4, row: 1 }, walkableFrom(open), dims)!;
		// Travelling east along row 1, the perpendicular (vertical) free run is 3.
		expect(perpendicularRun(path, 2, walkableFrom(open), dims)).toBe(3);
	});

	it('detects a mid-route chokepoint distinct from its open neighbours', () => {
		// Path travels straight along row 1. Col 2 is pinched (rows 0 and 2
		// blocked directly above/below it) while cols 1 and 3 are open on
		// both sides. A constant-return stub cannot produce 3, 1, 3.
		const pinched = ['..#..', '.....', '..#..'];
		const path = bfsPath({ col: 0, row: 1 }, { col: 4, row: 1 }, walkableFrom(pinched), dims)!;
		expect(path).not.toBeNull();
		expect(perpendicularRun(path, 1, walkableFrom(pinched), dims)).toBe(3);
		expect(perpendicularRun(path, 2, walkableFrom(pinched), dims)).toBe(1);
		expect(perpendicularRun(path, 3, walkableFrom(pinched), dims)).toBe(3);
	});

	it('reports a pinch at the path start when both vertical neighbours are blocked', () => {
		const rows3 = ['#..', '...', '#..'];
		const dims3 = { width: 3, height: 3 };
		const path = bfsPath({ col: 0, row: 1 }, { col: 2, row: 1 }, walkableFrom(rows3), dims3)!;
		expect(path).not.toBeNull();
		// Direction at the first cell is inferred from the single available
		// (next) neighbour — an off-by-one here would look elsewhere.
		expect(perpendicularRun(path, 0, walkableFrom(rows3), dims3)).toBe(1);
	});

	it('reports a pinch at the path end when both vertical neighbours are blocked', () => {
		const rows3 = ['..#', '...', '..#'];
		const dims3 = { width: 3, height: 3 };
		const path = bfsPath({ col: 0, row: 1 }, { col: 2, row: 1 }, walkableFrom(rows3), dims3)!;
		expect(path).not.toBeNull();
		const lastIndex = path!.length - 1;
		// Direction at the last cell is inferred from the single available
		// (previous) neighbour.
		expect(perpendicularRun(path, lastIndex, walkableFrom(rows3), dims3)).toBe(1);
	});

	it('measures the perpendicular axis horizontally for a vertical path', () => {
		// Path travels straight down col 1. Row 0 is fully open (horizontal
		// cross-section 3), row 1 is pinched left/right (cross-section 1).
		// A hardcoded-vertical implementation would report 3 at both indices.
		const vertical = ['...', '#.#', '...'];
		const dims3 = { width: 3, height: 3 };
		const path = bfsPath({ col: 1, row: 0 }, { col: 1, row: 2 }, walkableFrom(vertical), dims3)!;
		expect(path).not.toBeNull();
		expect(perpendicularRun(path, 0, walkableFrom(vertical), dims3)).toBe(3);
		expect(perpendicularRun(path, 1, walkableFrom(vertical), dims3)).toBe(1);
	});
});

describe('hasWidePath', () => {
	// hasWidePath uses walkable as both the passability predicate AND the
	// run-length predicate for maximalRun, so a '#' in the grid is a wall
	// and a '.' is open space — the cross-section at a cell is the longest
	// unbroken run of '.' through it on each axis.

	it('finds a longer wide route when the shortest route is narrow', () => {
		// Col 0 is open top-to-bottom, so the shortest (0,0)→(0,5) path
		// runs straight down it — 5 steps. But row 2 walls off cols 1-2,
		// leaving col 0 with a horizontal run of 1 at (0,2): the shortest
		// path is narrow. A 2-wide gap at cols 2-3 lets a longer detour
		// through (2,*) stay ≥2 wide at every step.
		//
		//   row 0:  ....
		//   row 1:  ....
		//   row 2:  .#..   ← col 0 pinched (hRun 1), cols 2-3 wide
		//   row 3:  ....
		//   row 4:  ....
		//   row 5:  ....
		const rows = ['....', '....', '.#..', '....', '....', '....'];
		const dims = { width: 4, height: 6 };
		const walkable = walkableFrom(rows);

		// Sanity: the shortest path does go through the narrow col-0 cell.
		const shortest = bfsPath({ col: 0, row: 0 }, { col: 0, row: 5 }, walkable, dims)!;
		const narrowIdx = shortest.findIndex((c) => c.col === 0 && c.row === 2);
		expect(narrowIdx, 'shortest path crosses the narrow (0,2) cell').toBeGreaterThanOrEqual(0);
		expect(perpendicularRun(shortest, narrowIdx, walkable, dims)).toBe(1);

		// hasWidePath must still succeed — the detour through cols 2-3 is wide.
		expect(hasWidePath({ col: 0, row: 0 }, { col: 0, row: 5 }, walkable, dims, 2)).toBe(true);
	});

	it('rejects a map where every route has a one-tile choke', () => {
		// Row 2 walls off cols 1-2, leaving only cols 0 and 3 open. Both
		// have a horizontal run of 1 at row 2, so no ≥2-wide crossing
		// exists — even though start and goal are individually wide.
		//
		//   row 0:  ....
		//   row 1:  ....
		//   row 2:  .##.   ← both open cols are pinched
		//   row 3:  ....
		//   row 4:  ....
		const rows = ['....', '....', '.##.', '....', '....'];
		const dims = { width: 4, height: 5 };
		const walkable = walkableFrom(rows);

		// Start and goal are wide (fully open rows/cols).
		expect(hasWidePath({ col: 0, row: 0 }, { col: 3, row: 4 }, walkable, dims, 2)).toBe(false);
	});

	it('handles a horizontal corridor (2-tall, fully open)', () => {
		const rows = ['......', '......'];
		const dims = { width: 6, height: 2 };
		const walkable = walkableFrom(rows);
		// Every cell has vRun=2, hRun=6 → min=2.
		expect(hasWidePath({ col: 0, row: 0 }, { col: 5, row: 0 }, walkable, dims, 2)).toBe(true);
	});

	it('handles a vertical corridor (2-wide, fully open)', () => {
		const rows = ['..', '..', '..'];
		const dims = { width: 2, height: 3 };
		const walkable = walkableFrom(rows);
		// Every cell has vRun=3, hRun=2 → min=2.
		expect(hasWidePath({ col: 0, row: 0 }, { col: 1, row: 2 }, walkable, dims, 2)).toBe(true);
	});

	it('handles a turning corridor (L-shaped, 2-wide throughout)', () => {
		// An L-shaped 2-wide corridor: go right along rows 0-1 (cols 0-3),
		// then down cols 2-3 (rows 2-5). The 2×2 block at (2-3, 1-2) is the
		// turn. Every cell on the route has min(vRun,hRun) ≥ 2.
		//
		//   row 0:  ....#   cols 0-3 open
		//   row 1:  ....#   cols 0-3 open
		//   row 2:  ##..#   cols 2-3 open (the turn)
		//   row 3:  ##..#   cols 2-3 open
		//   row 4:  ##..#   cols 2-3 open
		//   row 5:  ##..#   cols 2-3 open
		const rows = ['....#', '....#', '##..#', '##..#', '##..#', '##..#'];
		const dims = { width: 5, height: 6 };
		const walkable = walkableFrom(rows);
		expect(hasWidePath({ col: 0, row: 0 }, { col: 3, row: 5 }, walkable, dims, 2)).toBe(true);
	});

	it('rejects a narrow start cell', () => {
		// Start at (1,0) is in a 1-wide vertical slot (walls left and right
		// on row 0) — hRun=1, so isWide(start) fails immediately.
		//
		//   row 0:  .#.
		//   row 1:  .#.
		//   row 2:  ...
		//   row 3:  ...
		//   row 4:  ...
		const rows = ['.#.', '.#.', '...', '...', '...'];
		const dims = { width: 3, height: 5 };
		const walkable = walkableFrom(rows);
		expect(hasWidePath({ col: 1, row: 0 }, { col: 1, row: 4 }, walkable, dims, 2)).toBe(false);
	});

	it('rejects a narrow goal cell', () => {
		// Goal at (1,4) is in a 1-wide vertical slot — hRun=1. The start
		// and the corridor are wide, but the goal itself is narrow.
		//
		//   row 0:  ...
		//   row 1:  ...
		//   row 2:  ...
		//   row 3:  .#.
		//   row 4:  .#.
		const rows = ['...', '...', '...', '.#.', '.#.'];
		const dims = { width: 3, height: 5 };
		const walkable = walkableFrom(rows);
		expect(hasWidePath({ col: 1, row: 0 }, { col: 1, row: 4 }, walkable, dims, 2)).toBe(false);
	});
});
