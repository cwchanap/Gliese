import { describe, expect, it } from 'vitest';

import { applyStoryGates } from '$lib/game/core/story-gates';
import { isWalkable } from '$lib/game/core/navigation';
import { heroHouseMap } from '$lib/game/content/maps';
import { overworldMap } from '../overworld/map';
import type { WorldMapDefinition } from '../types';

import { compileGridWorld, gridWorldMap } from './compile';
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
	width: 3,
	height: 4,
	fill: '^',
	chunks: [
		{
			chunk: {
				id: 'seal',
				anchors: { s: 'seal-spawn' },
				terrain: 'P^P\nP.P\nP!P\nPsP',
				overlays: [
					{
						id: 'broken-seal',
						activeDuring: { quests: ['prologue-raid'] },
						rows: '---\n---\n-.-\n---'
					}
				]
			},
			col: 0,
			row: 0
		}
	]
});
const gateMap = gridWorldMap(gateWorld, 'seal-spawn', 'down');

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
		expect(gateRuntime.resolveGridTerrain!(sealed)).toEqual(['P^P', 'P.P', 'P.P', 'P.P']);
	});

	it('drops the seal from the pure answer once its overlay is live', () => {
		expect(gateRuntime.resolveGridTerrain!(opened)).toEqual(['P^P', 'P.P', 'P.P', 'P.P']);
	});

	it.each([
		{
			label: 'Silverpine’s sealed rows above its corridor',
			x: 190 * 32 + 16,
			y: 57 * 32 + 16,
			facing: 'up' as const,
			cell: [56, 190] as const
		},
		{
			label: 'Wildwood East’s sealed columns east of its corridor',
			x: 254 * 32 + 16,
			y: 223 * 32 + 16,
			facing: 'right' as const,
			cell: [223, 255] as const
		}
	])('detects the authored one-tile-thick gate: $label', ({ x, y, facing, cell }) => {
		expect(overworldTerrain[cell[0]]![cell[1]]).toBe('!');
		expect(gateRuntime.facesSealedGate, 'facesSealedGate is the planned pure helper').toBeTypeOf(
			'function'
		);
		expect(gateRuntime.facesSealedGate!(overworld, x, y, facing)).toBe(true);
	});

	it('probes a full 32px ahead from a collision-limited south-road spot', () => {
		const gateRow = overworldTerrain.findIndex((row) => row.includes('TPP!!!PPT'));
		const gateCol = overworldTerrain[gateRow]!.indexOf('!') + 1;
		const hero = { x: gateCol * 32 + 16, y: gateRow * 32 - 32 };
		expect(overworldTerrain[Math.floor(hero.y / 32)]![gateCol]).toBe(',');
		expect(overworldTerrain[Math.floor((hero.y + 16) / 32)]![gateCol]).toBe(',');
		expect(overworldTerrain[Math.floor((hero.y + 32) / 32)]![gateCol]).toBe('!');
		expect(gateRuntime.facesSealedGate!(overworld, hero.x, hero.y, 'down')).toBe(true);

		const walkedUp = { x: hero.x, y: gateRow * 32 - 16 };
		expect(gateRuntime.facesSealedGate!(overworld, walkedUp.x, walkedUp.y, 'down')).toBe(true);
	});

	it('does not skip a one-tile-deep seal with clear ground beyond it', () => {
		expect(gateWorld.grid.terrain[1]![1]).toBe('.');
		expect(gateWorld.grid.terrain[2]![1]).toBe('!');
		expect(gateWorld.grid.terrain[3]![1]).toBe('.');

		const overshootProne = { x: 48, y: 97 };
		expect(gateWorld.grid.terrain[Math.floor((overshootProne.y - 32) / 32)]![1]).toBe('!');
		expect(gateWorld.grid.terrain[Math.floor((overshootProne.y - 48) / 32)]![1]).toBe('.');
		expect(gateRuntime.facesSealedGate!(sealed, overshootProne.x, overshootProne.y, 'up')).toBe(
			true
		);

		const deeper = { x: 48, y: 120 };
		expect(gateWorld.grid.terrain[Math.floor((deeper.y - 16) / 32)]![1]).toBe('.');
		expect(gateRuntime.facesSealedGate!(sealed, deeper.x, deeper.y, 'up')).toBe(true);
	});

	it('stops reporting the seal once its overlay removes it', () => {
		expect(gateRuntime.facesSealedGate!(opened, 1 * 32 + 16, 3 * 32 + 16, 'up')).toBe(false);
	});

	it.each([
		{
			label: 'a P wall left of the approach',
			x: 48,
			y: 48,
			facing: 'left' as const,
			cell: [1, 0] as const,
			glyph: 'P'
		},
		{
			label: 'a P wall right of the approach',
			x: 48,
			y: 48,
			facing: 'right' as const,
			cell: [1, 2] as const,
			glyph: 'P'
		},
		{
			label: 'the ^ rock above the approach',
			x: 48,
			y: 48,
			facing: 'up' as const,
			cell: [0, 1] as const,
			glyph: '^'
		}
	])('ignores ordinary blockers: $label', ({ x, y, facing, cell, glyph }) => {
		expect(gateWorld.grid.terrain[cell[0]]![cell[1]]).toBe(glyph);
		expect(gateRuntime.facesSealedGate!(sealed, x, y, facing)).toBe(false);
	});

	it('ignores ground outside the grid', () => {
		expect(gateRuntime.facesSealedGate!(sealed, 48, 112, 'down')).toBe(false);
	});

	it('ignores non-grid maps instead of throwing', () => {
		expect(isGridWorldMap(heroHouseMap)).toBe(false);
		expect(gateRuntime.facesSealedGate!(heroHouseMap, 0, 0, 'down')).toBe(false);
	});
});
