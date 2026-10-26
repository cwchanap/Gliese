import { describe, expect, it } from 'vitest';

import {
	applyTileOverlays,
	buildGridNavigationGrid,
	findUnreachablePoints
} from '$lib/game/content/maps/grid/layers';
import { isWalkable } from '$lib/game/core/navigation';

import { overworld, overworldAnchors, overworldMap } from './world';

describe('overworld', () => {
	const anchors = Object.values(overworldAnchors);

	it('spawns on walkable ground', () => {
		const navigation = buildGridNavigationGrid(
			overworld.id,
			overworld.grid.terrain,
			overworld.grid.buildings
		);
		expect(isWalkable(navigation, overworldMap.spawn.x, overworldMap.spawn.y)).toBe(true);
	});

	it.each([
		{ state: 'without story overlays', overlays: [] },
		{ state: 'with every story overlay', overlays: overworld.overlays }
	])('can reach every anchor from spawn $state', ({ overlays }) => {
		const terrain = applyTileOverlays(overworld.grid.terrain, overlays);
		const navigation = buildGridNavigationGrid(overworld.id, terrain, overworld.grid.buildings);
		expect(findUnreachablePoints(navigation, overworldMap.spawn, anchors)).toEqual([]);
	});
});
