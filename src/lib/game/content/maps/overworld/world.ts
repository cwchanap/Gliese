import { compileGridWorld, gridWorldMap } from '$lib/game/content/maps/grid/compile';

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
 * Sundrop and the Wildwood are built in detail. Every other chunk is an outline
 * (coast, mountains, region borders) that a later map PR replaces in place; the
 * routes toward them end at sealed gates, where the matching region will open.
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

/** Grik's door is the dev-link spawn until the opening switches to the overworld. */
export const overworldMap = gridWorldMap(overworld, 'sundrop-grik-home-door', 'down');
