import { describe, expect, it } from 'vitest';

import {
	AREA_MAP_CELL_SIZE,
	AREA_MAP_REVEAL_RADIUS,
	getCellKey,
	getCellKeyForWorldPosition,
	isCellKey,
	isWorldPositionRevealed,
	mergeRevealedCells,
	parseCellKey,
	revealCellsAroundPoint,
	revealMapArea
} from '$lib/game/core/map-exploration';

describe('map exploration', () => {
	it('builds stable cell keys from world positions', () => {
		expect(getCellKey(0, 0)).toBe('0,0');
		expect(getCellKeyForWorldPosition({ x: 0, y: 0 })).toBe('0,0');
		expect(getCellKeyForWorldPosition({ x: AREA_MAP_CELL_SIZE, y: AREA_MAP_CELL_SIZE * 2 })).toBe(
			'1,2'
		);
	});

	it('parses only canonical non-negative cell keys', () => {
		expect(isCellKey('2,3')).toBe(true);
		expect(parseCellKey('2,3')).toEqual({ column: 2, row: 3 });
		expect(isCellKey('-1,0')).toBe(false);
		expect(isCellKey('1,NaN')).toBe(false);
		expect(parseCellKey('1,NaN')).toEqual({ column: 0, row: 0 });
	});

	it('reveals a circular area around the player and clamps to map bounds', () => {
		const cells = revealCellsAroundPoint({
			x: 64,
			y: 64,
			mapWidth: 512,
			mapHeight: 512,
			cellSize: 128,
			radius: 192
		});

		expect(cells).toContain('0,0');
		expect(cells).toContain('1,0');
		expect(cells).toContain('0,1');
		expect(cells).not.toContain('-1,0');
		expect(cells).not.toContain('2,2');
		expect(cells).not.toContain('3,3');
	});

	it('does not reveal cells for invalid map dimensions', () => {
		expect(
			revealCellsAroundPoint({
				x: 0,
				y: 0,
				mapWidth: 0,
				mapHeight: 512
			})
		).toEqual([]);
		expect(
			revealCellsAroundPoint({
				x: 0,
				y: 0,
				mapWidth: 512,
				mapHeight: -1
			})
		).toEqual([]);
		expect(
			revealCellsAroundPoint({
				x: 0,
				y: 0,
				mapWidth: 512,
				mapHeight: 512,
				cellSize: 0
			})
		).toEqual([]);
	});

	it('merges revealed cells with numeric sorting and change tracking', () => {
		expect(mergeRevealedCells(['2,0', '0,0'], ['1,0', '2,0'])).toEqual({
			cells: ['0,0', '1,0', '2,0'],
			changed: true
		});
		expect(mergeRevealedCells(['2,0', '0,0'], ['0,0', '2,0'])).toEqual({
			cells: ['0,0', '2,0'],
			changed: true
		});
		expect(mergeRevealedCells(['0,0', '0,0'], ['0,0'])).toEqual({
			cells: ['0,0'],
			changed: true
		});
		expect(mergeRevealedCells(['0,0'], ['0,0'])).toEqual({
			cells: ['0,0'],
			changed: false
		});
	});

	it('reveals per map without mutating the previous exploration state', () => {
		const previous = { 'meadow-entry': ['0,0'] };
		const result = revealMapArea({
			exploration: previous,
			mapId: 'meadow-entry',
			x: 256,
			y: 256,
			mapWidth: 1024,
			mapHeight: 1024
		});

		expect(result.changed).toBe(true);
		expect(result.exploration).not.toBe(previous);
		expect(result.exploration['meadow-entry']).toContain('2,2');
		expect(previous['meadow-entry']).toEqual(['0,0']);
	});

	it('checks whether marker positions are revealed', () => {
		const revealed = ['1,2'];

		expect(isWorldPositionRevealed({ revealed, x: 130, y: 260 })).toBe(true);
		expect(isWorldPositionRevealed({ revealed, x: 10, y: 10 })).toBe(false);
		expect(AREA_MAP_REVEAL_RADIUS).toBe(320);
	});
});
