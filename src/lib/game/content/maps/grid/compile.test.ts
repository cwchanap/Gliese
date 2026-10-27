import { describe, expect, it } from 'vitest';

import {
	compileGridChunk,
	compileGridWorld,
	gridWorldMap,
	parseGridRows,
	type GridChunkSource
} from './compile';

const chunk = (overrides: Partial<GridChunkSource> & { terrain: string }): GridChunkSource => ({
	id: 'test',
	...overrides
});

describe('parseGridRows', () => {
	it('drops blank lines at either end and trailing spaces', () => {
		expect(parseGridRows('\n\n..  \n.T\n\n')).toEqual(['..', '.T']);
	});
});

describe('compileGridChunk', () => {
	it('rejects empty terrain and ragged rows', () => {
		expect(() => compileGridChunk(chunk({ terrain: '\n' }))).toThrow(
			'grid chunk "test": terrain is empty'
		);
		expect(() => compileGridChunk(chunk({ terrain: '...\n..' }))).toThrow(
			'row 1 has width 2, expected 3'
		);
	});

	it('rejects glyphs that are neither terrain, anchors, nor buildings', () => {
		expect(() => compileGridChunk(chunk({ terrain: '..\n.Q' }))).toThrow(
			'row 1 col 1: unknown glyph "Q"'
		);
	});

	it('turns each anchor into the walkable ground around it', () => {
		const compiled = compileGridChunk(chunk({ anchors: { d: 'door' }, terrain: 'TTT\n,d,\n,,.' }));
		expect(compiled.anchors).toEqual([{ name: 'door', col: 1, row: 1 }]);
		expect(compiled.terrain).toEqual(['TTT', ',,,', ',,.']);
	});

	it('requires each anchor exactly once, with a lowercase glyph', () => {
		expect(() => compileGridChunk(chunk({ anchors: { d: 'door' }, terrain: '...' }))).toThrow(
			'anchor "d" (door) appears 0 times'
		);
		expect(() => compileGridChunk(chunk({ anchors: { d: 'door' }, terrain: 'd.d' }))).toThrow(
			'anchor "d" (door) appears 2 times'
		);
		expect(() => compileGridChunk(chunk({ anchors: { D: 'door' }, terrain: 'D..' }))).toThrow(
			'anchor glyph "D" must be one lowercase letter'
		);
	});

	it('collects each block of a building glyph as one building on grass', () => {
		const compiled = compileGridChunk(
			chunk({
				buildings: { A: 'goblin-hut' },
				terrain: `
,AA..
,AA.A
,,,,A
`
			})
		);
		expect(compiled.buildings).toEqual([
			{ id: 'test-goblin-hut-1', type: 'goblin-hut', col: 1, row: 0, width: 2, height: 2 },
			{ id: 'test-goblin-hut-2', type: 'goblin-hut', col: 4, row: 1, width: 1, height: 2 }
		]);
		expect(compiled.terrain).toEqual([',....', ',....', ',,,,.']);
	});

	it('rejects non-rectangular buildings and bad building glyphs', () => {
		expect(() =>
			compileGridChunk(chunk({ buildings: { A: 'forge' }, terrain: 'AA.\nA..' }))
		).toThrow('building "A" at row 0 col 0 is not a solid rectangle');
		expect(() => compileGridChunk(chunk({ buildings: { T: 'forge' }, terrain: 'T' }))).toThrow(
			'building glyph "T" is already a terrain glyph'
		);
		expect(() => compileGridChunk(chunk({ buildings: { a: 'forge' }, terrain: 'a' }))).toThrow(
			'building glyph "a" must be one character'
		);
		expect(() =>
			compileGridChunk(chunk({ buildings: { A: 'castle' as 'forge' }, terrain: 'A' }))
		).toThrow('building glyph "A" has unknown type "castle"');
	});

	it('keeps only the replaced cells of an overlay, with its story gate', () => {
		const compiled = compileGridChunk(
			chunk({
				terrain: '...\n...',
				overlays: [{ id: 'fire', activeDuring: { quests: ['prologue-raid'] }, rows: '-&-\n--~' }]
			})
		);
		expect(compiled.overlays).toEqual([
			{
				id: 'fire',
				activeDuring: { quests: ['prologue-raid'] },
				cells: [
					{ col: 1, row: 0, glyph: '&' },
					{ col: 2, row: 1, glyph: '~' }
				]
			}
		]);
	});

	it('rejects overlays that do not match the terrain', () => {
		const terrain = '...\n...';
		expect(() =>
			compileGridChunk(chunk({ terrain, overlays: [{ id: 'o', rows: '---' }] }))
		).toThrow('overlay "o" has 1 rows, expected 2');
		expect(() =>
			compileGridChunk(chunk({ terrain, overlays: [{ id: 'o', rows: '---\n--' }] }))
		).toThrow('overlay "o" row 1 has width 2, expected 3');
		expect(() =>
			compileGridChunk(chunk({ terrain, overlays: [{ id: 'o', rows: '---\n-a-' }] }))
		).toThrow('overlay "o" row 1 col 1: unknown glyph "a"');
		expect(() =>
			compileGridChunk(
				chunk({
					terrain,
					overlays: [
						{ id: 'o', rows: '---\n---' },
						{ id: 'o', rows: '---\n---' }
					]
				})
			)
		).toThrow('overlay "o" is defined twice');
	});
});

describe('compileGridWorld', () => {
	const west: GridChunkSource = {
		id: 'west',
		anchors: { w: 'west-gate' },
		buildings: { A: 'shrine' },
		terrain: 'AA\n.w',
		overlays: [{ id: 'flood', rows: '--\n~-' }]
	};
	const east: GridChunkSource = { id: 'east', terrain: ',,\n,,' };

	it('places chunks at their offsets and fills the rest', () => {
		const world = compileGridWorld({
			id: 'world',
			width: 5,
			height: 3,
			fill: '^',
			chunks: [
				{ chunk: west, col: 0, row: 1 },
				{ chunk: east, col: 3, row: 0 }
			]
		});
		expect(world.chunks).toEqual([
			{ id: 'west', col: 0, row: 1, width: 2, height: 2 },
			{ id: 'east', col: 3, row: 0, width: 2, height: 2 }
		]);
		expect(world.grid.terrain).toEqual(['^^^,,', '..^,,', '..^^^']);
		expect(world.grid.buildings).toEqual([
			{ id: 'west-shrine-1', type: 'shrine', col: 0, row: 1, width: 2, height: 1 }
		]);
		expect(world.anchors).toEqual({
			'west-gate': { name: 'west-gate', col: 1, row: 2, x: 48, y: 80 }
		});
		expect(world.overlays).toEqual([{ id: 'west-flood', cells: [{ col: 0, row: 2, glyph: '~' }] }]);
	});

	it('rejects chunks outside the world, overlapping, or placed twice', () => {
		const base = { id: 'world', width: 4, height: 2, fill: '^' } as const;
		expect(() => compileGridWorld({ ...base, chunks: [{ chunk: east, col: 3, row: 0 }] })).toThrow(
			'chunk "east" (2×2 at col 3 row 0) is outside the 4×2 world'
		);
		expect(() =>
			compileGridWorld({
				...base,
				chunks: [
					{ chunk: west, col: 0, row: 0 },
					{ chunk: east, col: 1, row: 0 }
				]
			})
		).toThrow('chunks "west" and "east" overlap at col 1 row 0');
		expect(() =>
			compileGridWorld({
				...base,
				chunks: [
					{ chunk: east, col: 0, row: 0 },
					{ chunk: east, col: 2, row: 0 }
				]
			})
		).toThrow('chunk "east" is placed twice');
		expect(() =>
			compileGridWorld({ ...base, chunks: [{ chunk: east, col: 0.5, row: 0 }] })
		).toThrow('chunk "east" must be placed at whole tiles, got col 0.5 row 0');
	});

	it('requires anchor names to be unique across chunks', () => {
		const twin: GridChunkSource = { ...west, id: 'twin' };
		expect(() =>
			compileGridWorld({
				id: 'world',
				width: 4,
				height: 2,
				fill: '^',
				chunks: [
					{ chunk: west, col: 0, row: 0 },
					{ chunk: twin, col: 2, row: 0 }
				]
			})
		).toThrow('anchor "west-gate" is defined more than once');
	});

	it('treats anchor names that are Object keys as ordinary names', () => {
		const named = (id: string, name: string): GridChunkSource => ({
			id,
			anchors: { a: name },
			terrain: 'a'
		});
		const world = compileGridWorld({
			id: 'world',
			width: 3,
			height: 1,
			fill: '^',
			chunks: [
				{ chunk: named('one', 'constructor'), col: 0, row: 0 },
				{ chunk: named('two', '__proto__'), col: 1, row: 0 }
			]
		});
		expect(Object.keys(world.anchors)).toEqual(['constructor', '__proto__']);
		expect(gridWorldMap(world, '__proto__', 'down').spawn).toEqual({ x: 48, y: 16 });
		expect(() => gridWorldMap(world, 'toString', 'down')).toThrow('no spawn anchor "toString"');
		expect(() =>
			compileGridWorld({
				id: 'world',
				width: 3,
				height: 1,
				fill: '^',
				chunks: [
					{ chunk: named('one', 'constructor'), col: 0, row: 0 },
					{ chunk: named('two', 'constructor'), col: 1, row: 0 }
				]
			})
		).toThrow('anchor "constructor" is defined more than once');
	});

	it('builds a playable map that spawns on an anchor', () => {
		const world = compileGridWorld({
			id: 'world',
			width: 2,
			height: 2,
			fill: '^',
			chunks: [{ chunk: west, col: 0, row: 0 }]
		});
		const map = gridWorldMap(world, 'west-gate', 'up');
		expect(map).toMatchObject({
			id: 'world',
			width: 2,
			height: 2,
			spawn: { x: 48, y: 48 },
			spawnDirection: 'up',
			transitions: [],
			tileGrid: world.grid
		});
		expect(map.tileOverlays).toEqual(world.overlays);
		expect(() => gridWorldMap(world, 'nowhere', 'up')).toThrow('no spawn anchor "nowhere"');
	});
});
