import { describe, expect, it } from 'vitest';

import { applyStoryGates } from '$lib/game/core/story-gates';
import { PLAYER_COLLISION_RADIUS } from '$lib/game/core/collision';
import { isWalkable, resolveMovementSegment } from '$lib/game/core/navigation';
import { heroHouseMap } from '$lib/game/content/maps';
import { overworldMap } from '../overworld/map';
import { silverpineChunk } from '../overworld/chunks/silverpine';
import { wildwoodEastChunk } from '../overworld/chunks/wildwood-east';
import type { WorldMapDefinition } from '../types';

import { compileGridWorld, gridWorldMap, type GridChunkSource } from './compile';
import * as gridRuntime from './runtime';
import {
	isGridWorldMap,
	resolveGridNavigationGrid,
	resolveGridTileLayers,
	type GridWorldMap
} from './runtime';
import { tileIdFor } from './tileset';

const world = compileGridWorld({
	id: 'runtime-test',
	width: 4,
	height: 2,
	fill: '^',
	chunks: [
		{
			chunk: {
				id: 'camp',
				anchors: { s: 'camp-spawn' },
				terrain: 's...\n....',
				overlays: [{ id: 'raid', activeDuring: { quests: ['prologue-raid'] }, rows: '--&-\n----' }]
			},
			col: 0,
			row: 0
		}
	]
});
const map = gridWorldMap(world, 'camp-spawn', 'down');

function gated(questId: 'prologue-proving-morning' | 'prologue-raid'): GridWorldMap {
	const view = applyStoryGates(map, { questId, objectiveId: null });
	if (!isGridWorldMap(view)) throw new Error('story gates dropped the tile grid');
	return view;
}
const before = gated('prologue-proving-morning');
const during = gated('prologue-raid');
const fire = { x: 2 * 32 + 16, y: 16 };

describe('grid map runtime', () => {
	it('recognises grid maps', () => {
		expect(isGridWorldMap(map)).toBe(true);
		expect(isGridWorldMap({ ...map, tileGrid: undefined })).toBe(false);
	});

	it('applies only the story overlays that are live', () => {
		expect(resolveGridTileLayers(before).ground[0]![2]).toBe(tileIdFor('.', 0, 2, 0));
		expect(resolveGridTileLayers(during).ground[0]![2]).toBe(tileIdFor('&', 0, 2, 0));
		expect(isWalkable(resolveGridNavigationGrid(before), fire.x, fire.y)).toBe(true);
		expect(isWalkable(resolveGridNavigationGrid(during), fire.x, fire.y)).toBe(false);
	});

	it('builds tiles and collision once per story state', () => {
		expect(resolveGridTileLayers(during)).toBe(resolveGridTileLayers(during));
		expect(resolveGridNavigationGrid(during)).toBe(resolveGridNavigationGrid({ ...during }));
	});
});

const gateRuntime = gridRuntime as unknown as {
	resolveGridTerrain?: (map: GridWorldMap) => readonly string[];
	facesSealedGate?: (
		map: WorldMapDefinition,
		x: number,
		y: number,
		facing: 'up' | 'down' | 'left' | 'right'
	) => boolean;
};

const gateWorld = compileGridWorld({
	id: 'runtime-gate-test',
	width: 6,
	height: 5,
	fill: '^',
	chunks: [
		{
			chunk: {
				id: 'seal',
				anchors: { s: 'seal-spawn' },
				terrain: 'P^^^^P\nP....P\nP!!!!P\nP.^..P\nPs...P',
				overlays: [
					{
						id: 'broken-seal',
						activeDuring: { quests: ['prologue-raid'] },
						rows: '------\n------\n-....-\n------\n------'
					}
				]
			},
			col: 0,
			row: 0
		}
	]
});
const gateMap = gridWorldMap(gateWorld, 'seal-spawn', 'down');

function authoredChunkMap(
	chunk: GridChunkSource,
	spawnAnchor: string,
	options: { topPad?: number; widthPad?: number } = {}
): GridWorldMap {
	const rows = chunk.terrain.trim().split('\n');
	return gridWorldMap(
		compileGridWorld({
			id: `runtime-${chunk.id}`,
			width: rows[0]!.length + (options.widthPad ?? 0),
			height: rows.length + (options.topPad ?? 0),
			fill: '^',
			chunks: [{ chunk, col: 0, row: options.topPad ?? 0 }]
		}),
		spawnAnchor,
		'down'
	);
}
const silverpineChunkMap = authoredChunkMap(silverpineChunk, 'gate-silver-shrine', { topPad: 1 });
const wildwoodEastChunkMap = authoredChunkMap(wildwoodEastChunk, 'gate-east-mountains', {
	widthPad: 1
});

function gatedGate(questId: 'prologue-proving-morning' | 'prologue-raid'): GridWorldMap {
	const view = applyStoryGates(gateMap, { questId, objectiveId: null });
	if (!isGridWorldMap(view)) throw new Error('story gates dropped the tile grid');
	return view;
}
const sealed = gatedGate('prologue-proving-morning');
const opened = gatedGate('prologue-raid');

const overworld = overworldMap as GridWorldMap;
const overworldTerrain = overworld.tileGrid.terrain;

describe('grid gate terrain', () => {
	it('pins the two TPP!!!PPT seal rows at the south-road gate', () => {
		const sealRows = overworldTerrain
			.map((row, index) => ({ row, index }))
			.filter(({ row }) => row.includes('TPP!!!PPT'));
		expect(sealRows).toHaveLength(2);
		expect(sealRows[1]!.index).toBe(sealRows[0]!.index + 1);

		const gateRow = sealRows[0]!.index;
		const bangColumn = sealRows[0]!.row.indexOf('!');
		expect(overworldTerrain[gateRow - 1]![bangColumn + 1]).toBe(',');
	});

	it('pins the Silverpine sealed rows with their P wall and ^ flank', () => {
		const index = overworldTerrain.findIndex(
			(row, i) => row.includes('PP!!!PP') && !(overworldTerrain[i + 1] ?? '').includes('!')
		);
		expect(index).toBeGreaterThan(0);
		const bangColumn = [...overworldTerrain[index]!].findIndex(
			(cell, col) => cell === '!' && overworldTerrain[index + 1]![col] === ','
		);
		expect(bangColumn).toBeGreaterThan(0);

		expect(overworldTerrain[index]![bangColumn - 1]).toBe('P');
		expect(overworldTerrain[index]![bangColumn + 3]).toBe('P');
		expect(overworldTerrain[index + 1]![bangColumn + 1]).toBe(',');
		expect(overworldTerrain[index + 1]![bangColumn - 1]).toBe('^');
	});

	it('resolves overlay-applied terrain through the pure helper', () => {
		expect(
			gateRuntime.resolveGridTerrain,
			'resolveGridTerrain is the planned pure helper'
		).toBeTypeOf('function');
		expect(gateRuntime.resolveGridTerrain!(sealed)).toEqual([
			'P^^^^P',
			'P....P',
			'P!!!!P',
			'P.^..P',
			'P....P'
		]);
	});

	it('drops the seal from the pure answer once its overlay is live', () => {
		expect(gateRuntime.resolveGridTerrain!(opened)).toEqual([
			'P^^^^P',
			'P....P',
			'P....P',
			'P.^..P',
			'P....P'
		]);
	});

	it('detects the authored one-tile-thick Silverpine gate above its corridor', () => {
		const terrain = silverpineChunkMap.tileGrid.terrain;
		const sealRows = terrain
			.map((row, index) => index)
			.filter((index) => terrain[index]!.includes('!'));
		expect(sealRows).toHaveLength(1);
		const sealRow = sealRows[0]!;
		const sealCol = terrain[sealRow]!.indexOf('!');
		expect(terrain[sealRow]!.slice(sealCol, sealCol + 3)).toBe('!!!');
		expect(terrain[sealRow - 1]!.slice(sealCol, sealCol + 3)).toBe('^^^');
		expect(terrain[sealRow + 1]!.slice(sealCol, sealCol + 3)).toBe(',,,');
		expect(gateRuntime.facesSealedGate, 'facesSealedGate is the planned pure helper').toBeTypeOf(
			'function'
		);
		expect(
			gateRuntime.facesSealedGate!(
				silverpineChunkMap,
				(sealCol + 1) * 32 + 16,
				(sealRow + 1) * 32 + 16,
				'up'
			)
		).toBe(true);
	});

	it('detects the authored one-tile-thick Wildwood East gate at its east edge', () => {
		const terrain = wildwoodEastChunkMap.tileGrid.terrain;
		const sealRows = terrain
			.map((row, index) => index)
			.filter((index) => terrain[index]!.includes('!'));
		expect(sealRows).toHaveLength(3);
		const sealRow = sealRows[0]!;
		const sealCol = terrain[sealRow]!.lastIndexOf('!');
		for (const row of sealRows) {
			expect(terrain[row]!.lastIndexOf('!')).toBe(sealCol);
		}
		expect(terrain[sealRow]![sealCol - 1]).toBe(',');
		expect(terrain[sealRow]![sealCol + 1]).toBe('^');
		expect(
			gateRuntime.facesSealedGate!(
				wildwoodEastChunkMap,
				(sealCol - 1) * 32 + 16,
				sealRow * 32 + 16,
				'right'
			)
		).toBe(true);
	});

	it('probes a full 32px ahead from a collision-limited south-road spot', () => {
		const nav = resolveGridNavigationGrid(overworld);
		const gateRow = overworldTerrain.findIndex((row) => row.includes('TPP!!!PPT'));
		const gateCol = overworldTerrain[gateRow]!.indexOf('!') + 1;
		const start = { x: gateCol * 32 + 16, y: (gateRow - 2) * 32 + 16 };
		expect(overworldTerrain[Math.floor(start.y / 32)]![gateCol]).toBe(',');
		expect(isWalkable(nav, start.x, start.y)).toBe(true);

		const approach = resolveMovementSegment(
			nav,
			[],
			start,
			{ x: start.x, y: gateRow * 32 + 64 },
			PLAYER_COLLISION_RADIUS
		);
		expect(Math.floor(approach.x / 32)).toBe(gateCol);
		expect(approach.y).toBeLessThan(gateRow * 32);
		expect(isWalkable(nav, approach.x, approach.y)).toBe(true);
		expect(isWalkable(nav, approach.x, approach.y + 1)).toBe(false);

		expect(overworldTerrain[Math.floor((approach.y + 16) / 32)]![gateCol]).toBe(',');
		expect(overworldTerrain[Math.floor((approach.y + 32) / 32)]![gateCol]).toBe('!');
		expect(overworldTerrain[Math.floor((approach.y + 96) / 32)]![gateCol]).toBe('T');
		expect(gateRuntime.facesSealedGate!(overworld, approach.x, approach.y, 'down')).toBe(true);
	});

	it('does not skip a one-tile-deep seal with clear ground beyond it', () => {
		const terrain = gateWorld.grid.terrain;
		expect(terrain[1]![3]).toBe('.');
		expect(terrain[2]![3]).toBe('!');
		expect(terrain[3]![3]).toBe('.');

		const nav = resolveGridNavigationGrid(sealed);
		const start = { x: 120, y: 120 };
		expect(isWalkable(nav, start.x, start.y)).toBe(true);
		const approach = resolveMovementSegment(
			nav,
			[],
			start,
			{ x: start.x, y: 0 },
			PLAYER_COLLISION_RADIUS
		);
		expect(Math.floor(approach.x / 32)).toBe(3);
		expect(approach.y).toBeGreaterThan(96);
		expect(isWalkable(nav, approach.x, approach.y)).toBe(true);
		expect(isWalkable(nav, approach.x, approach.y - 1)).toBe(false);

		const approachCol = Math.floor(approach.x / 32);
		expect(terrain[Math.floor((approach.y - 8) / 32)]![approachCol]).toBe('.');
		expect(terrain[Math.floor((approach.y - 32) / 32)]![approachCol]).toBe('!');
		expect(terrain[Math.floor((approach.y - 64) / 32)]![approachCol]).toBe('.');
		expect(gateRuntime.facesSealedGate!(sealed, approach.x, approach.y, 'up')).toBe(true);
		expect(gateRuntime.facesSealedGate!(sealed, start.x, start.y, 'up')).toBe(true);

		const deeper = { x: 136, y: 152 };
		expect(isWalkable(nav, deeper.x, deeper.y)).toBe(true);
		expect(gateRuntime.facesSealedGate!(sealed, deeper.x, deeper.y, 'up')).toBe(false);
	});

	it('stops reporting the seal once its overlay removes it', () => {
		expect(gateRuntime.facesSealedGate!(opened, 120, 120, 'up')).toBe(false);
	});

	it.each([
		{
			label: 'a P wall right of the approach',
			x: 136,
			y: 120,
			facing: 'right' as const,
			cell: [3, 5] as const,
			glyph: 'P'
		},
		{
			label: 'a P wall right of the deeper corridor',
			x: 136,
			y: 152,
			facing: 'right' as const,
			cell: [4, 5] as const,
			glyph: 'P'
		},
		{
			label: 'the ^ rock left of the approach',
			x: 120,
			y: 120,
			facing: 'left' as const,
			cell: [3, 2] as const,
			glyph: '^'
		}
	])('ignores ordinary blockers: $label', ({ x, y, facing, cell, glyph }) => {
		expect(gateWorld.grid.terrain[cell[0]]![cell[1]]).toBe(glyph);
		expect(isWalkable(resolveGridNavigationGrid(sealed), x, y)).toBe(true);
		expect(gateRuntime.facesSealedGate!(sealed, x, y, facing)).toBe(false);
	});

	it('ignores ground outside the grid', () => {
		expect(gateRuntime.facesSealedGate!(sealed, 136, 152, 'down')).toBe(false);
	});

	it('ignores non-grid maps instead of throwing', () => {
		expect(isGridWorldMap(heroHouseMap)).toBe(false);
		expect(gateRuntime.facesSealedGate!(heroHouseMap, 0, 0, 'down')).toBe(false);
	});
});
