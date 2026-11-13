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

// The sealed-gate check is a pure read of the compiled terrain plus a 32px
// facing probe. The helpers land with the WorldScene wiring, so these pin
// the contract through the module until they exist (RED: both absent).
const gateRuntime = gridRuntime as unknown as {
	resolveGridTerrain?: (map: GridWorldMap) => readonly string[];
	facesSealedGate?: (
		map: WorldMapDefinition,
		x: number,
		y: number,
		facing: 'up' | 'down' | 'left' | 'right'
	) => boolean;
};

// A one-tile-deep `!` seal in a `P` wall, `^` rock above the approach, walkable
// ground on both sides of the seal so a long probe could overshoot past it.
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

// `overworld` is authored through the same compiler the test worlds use; its
// live overlays are already filtered on the map definition.
const overworld = overworldMap as GridWorldMap;
const overworldTerrain = overworld.tileGrid.terrain;

describe('grid gate terrain', () => {
	it('pins the two TPP!!!PPT seal rows at the south-road gate', () => {
		const sealRows = overworldTerrain
			.map((row, index) => ({ row, index }))
			.filter(({ row }) => row.includes('TPP!!!PPT'));
		expect(sealRows).toHaveLength(2);
		expect(sealRows[1]!.index).toBe(sealRows[0]!.index + 1);

		// The corridor's `,` floor runs into the seal from the north: the walk-up
		// row directly above the first seal row is plain `,` between `T`s.
		const gateRow = sealRows[0]!.index;
		const bangColumn = sealRows[0]!.row.indexOf('!');
		expect(overworldTerrain[gateRow - 1]![bangColumn + 1]).toBe(',');
	});

	it('pins the Silverpine sealed rows with their P wall and ^ flank', () => {
		// The gate is two rows deep: the corridor approaches the LAST seal row.
		// Two regions share `PP!!!PP` on these rows — the Silverpine one is the
		// `!` column whose tile below is corridor `,`.
		const index = overworldTerrain.findIndex(
			(row, i) => row.includes('PP!!!PP') && !(overworldTerrain[i + 1] ?? '').includes('!')
		);
		expect(index).toBeGreaterThan(0);
		const bangColumn = [...overworldTerrain[index]!].findIndex(
			(cell, col) => cell === '!' && overworldTerrain[index + 1]![col] === ','
		);
		expect(bangColumn).toBeGreaterThan(0);

		// The seal sits inside the palisade (`P`) — the wall itself stays an
		// ordinary blocker, not a gate.
		expect(overworldTerrain[index]![bangColumn - 1]).toBe('P');
		expect(overworldTerrain[index]![bangColumn + 3]).toBe('P');
		// The `,` corridor approaches from the south.
		expect(overworldTerrain[index + 1]![bangColumn + 1]).toBe(',');
		// Rock (`^`) flanks the corridor at the same step — an ordinary
		// blocker a facing probe can legitimately hit.
		expect(overworldTerrain[index + 1]![bangColumn - 1]).toBe('^');
	});

	it('resolves overlay-applied terrain through the pure helper', () => {
		expect(
			gateRuntime.resolveGridTerrain,
			'resolveGridTerrain is the planned pure helper'
		).toBeTypeOf('function');
		expect(gateRuntime.resolveGridTerrain!(sealed)).toEqual(['P^P', 'P.P', 'P!P', 'P.P']);
	});

	it('drops the seal from the pure answer once its overlay is live', () => {
		expect(gateRuntime.resolveGridTerrain!(opened)).toEqual(['P^P', 'P.P', 'P.P', 'P.P']);
	});

	it('probes the tile 32px ahead along facing from the hero’s collision spot', () => {
		expect(gateRuntime.facesSealedGate, 'facesSealedGate is the planned pure helper').toBeTypeOf(
			'function'
		);
		// South-road corridor's last `,` step: the collision margin leaves the
		// hero ~16px short of the seal, so the probe must reach a full tile.
		const gateRow = overworldTerrain.findIndex((row) => row.includes('TPP!!!PPT'));
		const gateCol = overworldTerrain[gateRow]!.indexOf('!') + 1;
		const hero = { x: gateCol * 32 + 16, y: (gateRow - 1) * 32 + 16 };
		expect(gateRuntime.facesSealedGate!(overworld, hero.x, hero.y, 'down')).toBe(true);

		// And it must land inside the seal, not past it: the tile between the
		// hero and the gate is the walkable `,` the hero stands on.
		expect(overworldTerrain[gateRow - 1]![gateCol]).toBe(',');
		expect(overworldTerrain[gateRow]![gateCol]).toBe('!');
	});

	it('does not skip a one-tile-deep seal with clear ground beyond it', () => {
		// The synthetic seal has `.` on the far side — a probe longer than the
		// tile would read plain ground and miss the gate entirely. (The spawn
		// anchor compiles to `.` ground.)
		expect(gateWorld.grid.terrain[1]![1]).toBe('.');
		expect(gateWorld.grid.terrain[2]![1]).toBe('!');
		expect(gateWorld.grid.terrain[3]![1]).toBe('.');
		expect(gateRuntime.facesSealedGate!(sealed, 1 * 32 + 16, 3 * 32 + 16, 'up')).toBe(true);
	});

	it('stops reporting the seal once its overlay removes it', () => {
		expect(gateRuntime.facesSealedGate!(opened, 1 * 32 + 16, 3 * 32 + 16, 'up')).toBe(false);
	});

	it.each([
		{ label: 'a P wall left of the approach', x: 16, y: 48, facing: 'left' as const },
		{ label: 'a P wall right of the approach', x: 80, y: 48, facing: 'right' as const },
		{ label: 'the ^ rock above the approach', x: 48, y: 48, facing: 'up' as const },
		{ label: 'ground outside the grid', x: 48, y: 112, facing: 'down' as const }
	])('ignores ordinary blockers: $label', ({ x, y, facing }) => {
		expect(gateRuntime.facesSealedGate!(sealed, x, y, facing)).toBe(false);
	});

	it('ignores non-grid maps instead of throwing', () => {
		expect(isGridWorldMap(heroHouseMap)).toBe(false);
		expect(gateRuntime.facesSealedGate!(heroHouseMap, 0, 0, 'down')).toBe(false);
	});
});
