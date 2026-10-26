import { describe, expect, it } from 'vitest';

import { applyStoryGates } from '$lib/game/core/story-gates';
import { isWalkable } from '$lib/game/core/navigation';

import { compileGridWorld, gridWorldMap } from './compile';
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
		expect(resolveGridTileLayers(before).ground[0]![2]).toBe(tileIdFor('.'));
		expect(resolveGridTileLayers(during).ground[0]![2]).toBe(tileIdFor('&'));
		expect(isWalkable(resolveGridNavigationGrid(before), fire.x, fire.y)).toBe(true);
		expect(isWalkable(resolveGridNavigationGrid(during), fire.x, fire.y)).toBe(false);
	});

	it('builds tiles and collision once per story state', () => {
		expect(resolveGridTileLayers(during)).toBe(resolveGridTileLayers(during));
		expect(resolveGridNavigationGrid(during)).toBe(resolveGridNavigationGrid({ ...during }));
	});
});
