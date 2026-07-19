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
	const rows = ['.###.', '..#..', '..#..'];
	it('measures the horizontal run through a cell', () => {
		expect(maximalRun(solidFrom(rows), 2, 0, 'horizontal', 5, 3)).toBe(3);
	});
	it('measures the vertical run through a cell', () => {
		expect(maximalRun(solidFrom(rows), 2, 0, 'vertical', 5, 3)).toBe(3);
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
});

describe('footprintTiles', () => {
	it('covers the tiles a centred rect occupies, including padding', () => {
		// 32px rect centred on tile (5,5), no padding => exactly that tile.
		expect(footprintTiles(5, 5, 32, 32, 0, 32)).toEqual([{ col: 5, row: 5 }]);
	});

	it('expands by the padding radius', () => {
		const tiles = footprintTiles(5, 5, 32, 32, 12, 32);
		expect(tiles).toContainEqual({ col: 4, row: 5 });
		expect(tiles).toContainEqual({ col: 6, row: 5 });
	});
});
