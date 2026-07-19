import { describe, expect, it } from 'vitest';
import {
	bfsPath,
	footprintTiles,
	maximalRun,
	perpendicularRun,
	roomAdjacency
} from '$lib/game/content/maps/layered/geometry';

const solidFrom = (rows: readonly string[]) => (col: number, row: number) =>
	rows[row]?.[col] === '#';
const walkableFrom = (rows: readonly string[]) => (col: number, row: number) =>
	rows[row]?.[col] !== undefined && rows[row][col] !== '#';

const sortCells = (cells: readonly { col: number; row: number }[]) =>
	[...cells].sort((a, b) => a.row - b.row || a.col - b.col);

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

describe('footprintTiles', () => {
	it('covers the tiles a centred rect occupies, including padding', () => {
		// 32px rect centred on tile (5,5), no padding => exactly that tile.
		expect(footprintTiles(5, 5, 32, 32, 0, 32)).toEqual([{ col: 5, row: 5 }]);
	});

	it('expands by the padding radius', () => {
		const tiles = footprintTiles(5, 5, 32, 32, 12, 32);
		const expected = [
			{ col: 4, row: 4 },
			{ col: 5, row: 4 },
			{ col: 6, row: 4 },
			{ col: 4, row: 5 },
			{ col: 5, row: 5 },
			{ col: 6, row: 5 },
			{ col: 4, row: 6 },
			{ col: 5, row: 6 },
			{ col: 6, row: 6 }
		];
		expect(sortCells(tiles)).toEqual(sortCells(expected));
	});
});
