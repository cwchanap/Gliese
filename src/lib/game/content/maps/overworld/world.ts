import { compileGridWorld, gridWorldMap } from '$lib/game/content/maps/grid/compile';

import { sandboxChunk } from './chunks/sandbox';

/**
 * The continent: one text-grid map for every outdoor area. Each chunk is placed
 * at a tile offset; tiles no chunk covers are `fill`.
 */
export const overworld = compileGridWorld({
	id: 'overworld',
	width: 40,
	height: 28,
	fill: '^',
	chunks: [{ chunk: sandboxChunk, col: 0, row: 0 }]
});

/** Named points on the overworld, for transitions, spawns, and story placements. */
export const overworldAnchors = overworld.anchors;

export const overworldMap = gridWorldMap(overworld, 'sandbox-spawn', 'down');
