import {
	GRID_TILE_SIZE,
	compileGridWorld,
	type PlacedGridChunk
} from '$lib/game/content/maps/grid/compile';

import { demonHighlandsChunk } from './chunks/demon-highlands';
import { eastCoastChunk } from './chunks/east-coast';
import { eastMountainsChunk } from './chunks/east-mountains';
import { elvenWoodChunk } from './chunks/elven-wood';
import { mistfenChunk } from './chunks/mistfen';
import { orcHighlandsChunk } from './chunks/orc-highlands';
import { silverpineChunk } from './chunks/silverpine';
import { southernFrontierChunk } from './chunks/southern-frontier';
import { sundropChunk } from './chunks/sundrop';
import { valcrestChunk } from './chunks/valcrest';
import { westCoastChunk } from './chunks/west-coast';
import { wildwoodEastChunk } from './chunks/wildwood-east';
import { wildwoodNorthChunk } from './chunks/wildwood-north';

/**
 * The continent: one text-grid map for every outdoor area, 384×384 tiles. Each
 * chunk is placed at a tile offset; tiles no chunk covers are open sea.
 *
 * Sundrop, the Wildwood, Silverpine, and the Mistfen basin are built in detail. Every other
 * chunk is an outline (coast, mountains, region borders) that a later map PR
 * replaces in place; the routes toward them end at sealed gates, where the
 * matching region will open.
 *
 *         W (0-128)         C (128-256)                       E (256-384)
 *   N     elven-wood        demon-highlands                   orc-highlands
 *   midN  mistfen           silverpine                        orc-highlands
 *   mid   mistfen           wildwood-north / sundrop+east     east-mountains
 *   S     west-coast        southern-frontier                 east-coast
 *   farS  (sea)             valcrest                          (sea)
 */
export const overworld = compileGridWorld({
	id: 'overworld',
	width: 384,
	height: 384,
	fill: '~',
	chunks: [
		{ chunk: elvenWoodChunk, col: 0, row: 0 },
		{ chunk: demonHighlandsChunk, col: 128, row: 0 },
		{ chunk: orcHighlandsChunk, col: 256, row: 0 },
		{ chunk: mistfenChunk, col: 0, row: 56 },
		{ chunk: silverpineChunk, col: 128, row: 56 },
		{ chunk: wildwoodNorthChunk, col: 128, row: 136 },
		{ chunk: sundropChunk, col: 128, row: 184 },
		{ chunk: wildwoodEastChunk, col: 192, row: 184 },
		{ chunk: eastMountainsChunk, col: 256, row: 136 },
		{ chunk: westCoastChunk, col: 0, row: 240 },
		{ chunk: southernFrontierChunk, col: 128, row: 240 },
		{ chunk: eastCoastChunk, col: 256, row: 240 },
		{ chunk: valcrestChunk, col: 128, row: 312 }
	]
});

/** Named points on the overworld, for transitions, spawns, and story placements. */
export const overworldAnchors = overworld.anchors;

const chunkIndexByTile = (() => {
	const grid = new Int16Array(overworld.width * overworld.height).fill(-1);
	for (let index = 0; index < overworld.chunks.length; index++) {
		const chunk = overworld.chunks[index]!;
		for (let row = chunk.row; row < chunk.row + chunk.height; row++) {
			const rowOffset = row * overworld.width;
			for (let col = chunk.col; col < chunk.col + chunk.width; col++) {
				grid[rowOffset + col] = index;
			}
		}
	}
	return grid;
})();

/** The placed chunk covering a world-pixel point, or null for the open-sea fill. */
export function overworldChunkAt(point: { x: number; y: number }): PlacedGridChunk | null {
	const col = Math.floor(point.x / GRID_TILE_SIZE);
	const row = Math.floor(point.y / GRID_TILE_SIZE);
	if (col < 0 || col >= overworld.width || row < 0 || row >= overworld.height) {
		return null;
	}
	const index = chunkIndexByTile[row * overworld.width + col]!;
	return index >= 0 ? overworld.chunks[index]! : null;
}

/** The pixel centre of a named anchor. A typo throws instead of placing anything at 0,0. */
export function anchorPoint(name: string): { x: number; y: number } {
	const anchor = Object.hasOwn(overworldAnchors, name) ? overworldAnchors[name] : undefined;
	if (!anchor) throw new Error(`overworld: no anchor "${name}"`);
	return { x: anchor.x, y: anchor.y };
}
