import { describe, expect, it } from 'vitest';

import { isWalkable } from '$lib/game/core/navigation';

import {
	applyTileOverlays,
	buildGridNavigationGrid,
	buildGridTileLayers,
	edgeMask,
	findUnreachablePoints
} from './layers';
import { EDGE_E, EDGE_N, EDGE_S, EDGE_W, tileIdFor } from './tileset';

const tileCentre = (col: number, row: number) => ({ x: col * 32 + 16, y: row * 32 + 16 });

describe('edgeMask', () => {
	it('joins the same terrain and the map edge, and draws an edge elsewhere', () => {
		const terrain = ['~~.', '~~.', '...'];
		expect(edgeMask(terrain, 0, 0, '~')).toBe(EDGE_N | EDGE_E | EDGE_S | EDGE_W);
		expect(edgeMask(terrain, 1, 1, '~')).toBe(EDGE_N | EDGE_W);
	});

	it('joins the glyphs a terrain connects to', () => {
		// The path runs onto the bridge, and the water runs under it.
		const terrain = ['.,.', '~=~', '.,.'];
		expect(edgeMask(terrain, 1, 0, ',')).toBe(EDGE_N | EDGE_S);
		expect(edgeMask(terrain, 1, 1, '=')).toBe(EDGE_N | EDGE_S);
		expect(edgeMask(terrain, 0, 1, '~')).toBe(EDGE_E | EDGE_W);
	});
});

describe('buildGridTileLayers', () => {
	it('puts canopy terrain above grass and leaves the rest of the canopy empty', () => {
		const layers = buildGridTileLayers(['.T', 'R~']);
		expect(layers.ground).toEqual([
			[tileIdFor('.', 0, 0, 0), tileIdFor('.', 0, 1, 0)],
			[tileIdFor('R', 0, 0, 1), tileIdFor('~', EDGE_E | EDGE_S, 1, 1)]
		]);
		expect(layers.canopy).toEqual([
			[-1, tileIdFor('T', EDGE_N | EDGE_E, 1, 0)],
			[-1, -1]
		]);
	});

	it('draws the same terrain with a different variant on each tile', () => {
		const layers = buildGridTileLayers(['.'.repeat(9)]);
		expect(new Set(layers.ground[0]!.slice(0, 8)).size).toBe(8);
		expect(layers.ground[0]![8]).toBe(layers.ground[0]![0]);
	});
});

describe('applyTileOverlays', () => {
	it('writes overlay cells over the terrain without changing the source', () => {
		const terrain = ['...', '...'];
		const result = applyTileOverlays(terrain, [
			{ id: 'a', cells: [{ col: 0, row: 0, glyph: '~' }] },
			{
				id: 'b',
				cells: [
					{ col: 0, row: 0, glyph: '&' },
					{ col: 2, row: 1, glyph: 'T' }
				]
			}
		]);
		expect(result).toEqual(['&..', '..T']);
		expect(terrain).toEqual(['...', '...']);
	});
});

describe('buildGridNavigationGrid', () => {
	it('blocks blocking terrain and building footprints', () => {
		const grid = buildGridNavigationGrid(
			'test',
			['....', '.~..', '....', '....'],
			[{ id: 'hut', type: 'goblin-hut', col: 2, row: 2, width: 2, height: 2 }]
		);
		expect(grid.widthCells).toBe(8);
		expect(isWalkable(grid, tileCentre(3, 0).x, tileCentre(3, 0).y)).toBe(true);
		expect(isWalkable(grid, tileCentre(1, 1).x, tileCentre(1, 1).y)).toBe(false);
		expect(isWalkable(grid, tileCentre(3, 3).x, tileCentre(3, 3).y)).toBe(false);
	});

	it('lets the player through a two-tile gap but not a one-tile gap', () => {
		const east = [{ name: 'east', ...tileCentre(4, 0) }];
		const twoTileGap = buildGridNavigationGrid(
			'test',
			['..T..', '..T..', '.....', '.....', '..T..', '..T..'],
			[]
		);
		expect(findUnreachablePoints(twoTileGap, tileCentre(0, 0), east)).toEqual([]);

		const oneTileGap = buildGridNavigationGrid(
			'test',
			['..T..', '..T..', '.....', '..T..', '..T..'],
			[]
		);
		expect(findUnreachablePoints(oneTileGap, tileCentre(0, 0), east)).toEqual(['east']);
	});
});
