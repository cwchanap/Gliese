import { describe, expect, it } from 'vitest';
import { resolveMenuFocusTarget, type MenuFocusNode } from './menu-focus';

/** 4×2 command grid, row-major (row 0: bag..map, row 1: skill..system). */
function grid4x2(
	overrides: Record<string, { row?: number; column?: number; disabled?: boolean }> = {}
) {
	const ids = ['bag', 'gear', 'quest', 'map', 'skill', 'rest', 'save', 'system'];
	return ids.map((id, index) => ({
		id,
		row: Math.floor(index / 4),
		column: index % 4,
		...overrides[id]
	})) satisfies MenuFocusNode[];
}

describe('resolveMenuFocusTarget', () => {
	it('moves right and left within a row', () => {
		const nodes = grid4x2();
		expect(resolveMenuFocusTarget(nodes, 'bag', 'right')).toBe('gear');
		expect(resolveMenuFocusTarget(nodes, 'gear', 'left')).toBe('bag');
	});

	it('moves down and up within a column', () => {
		const nodes = grid4x2();
		expect(resolveMenuFocusTarget(nodes, 'gear', 'down')).toBe('rest');
		expect(resolveMenuFocusTarget(nodes, 'rest', 'up')).toBe('gear');
	});

	it('stays on the current node at an edge', () => {
		const nodes = grid4x2();
		expect(resolveMenuFocusTarget(nodes, 'bag', 'left')).toBe('bag');
		expect(resolveMenuFocusTarget(nodes, 'map', 'right')).toBe('map');
		expect(resolveMenuFocusTarget(nodes, 'bag', 'up')).toBe('bag');
		expect(resolveMenuFocusTarget(nodes, 'system', 'down')).toBe('system');
	});

	it('skips a disabled node in the movement direction', () => {
		const nodes = grid4x2({ rest: { disabled: true } });
		expect(resolveMenuFocusTarget(nodes, 'skill', 'right')).toBe('save');
		expect(resolveMenuFocusTarget(nodes, 'save', 'left')).toBe('skill');
	});

	it('skips a disabled node vertically in a taller grid', () => {
		const nodes: MenuFocusNode[] = [
			{ id: 'a', row: 0, column: 0 },
			{ id: 'b', row: 1, column: 0, disabled: true },
			{ id: 'c', row: 2, column: 0 }
		];
		expect(resolveMenuFocusTarget(nodes, 'a', 'down')).toBe('c');
		expect(resolveMenuFocusTarget(nodes, 'c', 'up')).toBe('a');
	});

	it('falls back to the nearest enabled node when the aligned target is disabled', () => {
		// gear (row 0, col 1) down: rest is disabled, so the nearest enabled
		// node in the next row wins — document order breaks the col-0/col-2 tie.
		const nodes = grid4x2({ rest: { disabled: true } });
		expect(resolveMenuFocusTarget(nodes, 'gear', 'down')).toBe('skill');
	});

	it('crosses empty cells to the nearest candidate in the direction', () => {
		// Area-map marker rows have irregular columns — a move must cross gaps
		// instead of stopping at the first empty cell.
		const nodes: MenuFocusNode[] = [
			{ id: 'm1', row: 0, column: 0 },
			{ id: 'm2', row: 0, column: 3 },
			{ id: 'close', row: 1, column: 0 }
		];
		expect(resolveMenuFocusTarget(nodes, 'm1', 'right')).toBe('m2');
		expect(resolveMenuFocusTarget(nodes, 'm2', 'left')).toBe('m1');
		expect(resolveMenuFocusTarget(nodes, 'm2', 'down')).toBe('close');
		expect(resolveMenuFocusTarget(nodes, 'close', 'up')).toBe('m1');
	});

	it('lands on the detail action under a short last row (shop grid)', () => {
		// The shop detail action sits below the last tile's column; pressing
		// down from any tile on the last grid row must reach it.
		const nodes: MenuFocusNode[] = [
			{ id: 'a', row: 0, column: 0 },
			{ id: 'b', row: 0, column: 1 },
			{ id: 'c', row: 0, column: 2 },
			{ id: 'd', row: 0, column: 3 },
			{ id: 'detail', row: 1, column: 2 }
		];
		expect(resolveMenuFocusTarget(nodes, 'd', 'down')).toBe('detail');
		expect(resolveMenuFocusTarget(nodes, 'a', 'down')).toBe('detail');
		expect(resolveMenuFocusTarget(nodes, 'detail', 'up')).toBe('c');
	});

	it('keeps moving within the column when a further aligned node exists', () => {
		// Column-preserving moves beat a closer diagonal — the fallback only
		// engages when the aligned direction has no enabled node at all.
		const nodes: MenuFocusNode[] = [
			{ id: 'a', row: 0, column: 0 },
			{ id: 'b', row: 1, column: 2 },
			{ id: 'c', row: 2, column: 0 }
		];
		expect(resolveMenuFocusTarget(nodes, 'a', 'down')).toBe('c');
	});

	it('stays put when every candidate in the direction is disabled', () => {
		const nodes = grid4x2({
			gear: { disabled: true },
			quest: { disabled: true },
			map: { disabled: true },
			rest: { disabled: true },
			save: { disabled: true },
			system: { disabled: true }
		});
		expect(resolveMenuFocusTarget(nodes, 'skill', 'right')).toBe('skill');
	});

	it('chooses the first enabled node when current is null', () => {
		const nodes = grid4x2({ bag: { disabled: true } });
		expect(resolveMenuFocusTarget(nodes, null, 'right')).toBe('gear');
		expect(resolveMenuFocusTarget(nodes, null, 'down')).toBe('gear');
	});

	it('chooses the first enabled node when current is unknown', () => {
		const nodes = grid4x2();
		expect(resolveMenuFocusTarget(nodes, 'nope', 'up')).toBe('bag');
	});

	it('returns null when there is no enabled node at all', () => {
		const nodes = grid4x2({ bag: { disabled: true } }).map((node) => ({ ...node, disabled: true }));
		expect(resolveMenuFocusTarget(nodes, null, 'left')).toBeNull();
		expect(resolveMenuFocusTarget([], null, 'right')).toBeNull();
	});
});
