import { describe, expect, it } from 'vitest';

import { isWalkable } from '$lib/game/core/navigation';

import {
	applyTileOverlays,
	buildGridNavigationGrid,
	buildGridTileLayers,
	edgeMask,
	findUnreachablePoints,
	loneTreeTiles
} from './layers';
import { EDGE_E, EDGE_N, EDGE_S, EDGE_W, mountainRockTileId, tileIdFor } from './tileset';

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
		const layers = buildGridTileLayers(['.TT', 'RTT', '~..']);
		expect(layers.ground).toEqual([
			[tileIdFor('.', 0, 0, 0), tileIdFor('.', 0, 1, 0), tileIdFor('.', 0, 2, 0)],
			[tileIdFor('R', 0, 0, 1), tileIdFor('.', 0, 1, 1), tileIdFor('.', 0, 2, 1)],
			[tileIdFor('~', EDGE_S | EDGE_W, 0, 2), tileIdFor('.', 0, 1, 2), tileIdFor('.', 0, 2, 2)]
		]);
		expect(layers.canopy).toEqual([
			[-1, tileIdFor('T', EDGE_N | EDGE_E | EDGE_S, 1, 0), tileIdFor('T', 15, 2, 0)],
			[-1, tileIdFor('T', EDGE_N | EDGE_E, 1, 1), tileIdFor('T', EDGE_N | EDGE_E | EDGE_W, 2, 1)],
			[-1, -1, -1]
		]);
	});

	it('draws a forest or pine patch of up to three tiles as single trees, with no canopy', () => {
		const terrain = ['TT..A', '.....', 'TT.AA', 'TT.A.'];
		expect([...loneTreeTiles(terrain)].sort()).toEqual(['0,0', '1,0', '3,2', '3,3', '4,0', '4,2']);
		const layers = buildGridTileLayers(terrain);
		expect(layers.canopy[0]).toEqual([-1, -1, -1, -1, -1]);
		expect(layers.canopy[2]![0]).toBe(tileIdFor('T', EDGE_E | EDGE_S | EDGE_W, 0, 2));
	});

	it('draws mountains as varied rock with their edges on the layer above', () => {
		const terrain = ['^^^', '^^^', '...'];
		const layers = buildGridTileLayers(terrain);
		expect(layers.ground[0]).toEqual([0, 1, 2].map((col) => mountainRockTileId(col, 0)));
		// The surrounded tile has no edge to draw; the bottom row shows the mountain foot.
		expect(layers.edges[0]![1]).toBe(-1);
		expect(layers.edges[1]![1]).toBe(tileIdFor('^', EDGE_N | EDGE_E | EDGE_W, 1, 1));
		expect(layers.edges[2]).toEqual([-1, -1, -1]);
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
