import type { GridChunkSource } from '$lib/game/content/maps/grid/compile';

/**
 * Outline only: the Southern Frontier (chapter 1), where the human outpost will stand. The
 * corridor from the south gate ends at a sealed gate.
 */
export const southernFrontierChunk: GridChunkSource = {
	id: 'southern-frontier',
	anchors: {
		g: 'gate-south-road'
	},
	terrain: `
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,.TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,.TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,.TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.............................................^^
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT...............................................^^
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.....................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTT.,,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,,.TTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,.TTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^.R.TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,.TTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,.TTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,.TTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,.TTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,g,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^.....TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,.TTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^.....TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,.TTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^.......TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,.TTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^.......TTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^........TTTTTTTTTTTTTTTTTTTTTTTTTTTPP!!!PPTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^.........TTTTTTTTTTTTTTTTTTTTTTTTTTPP!!!PPTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.................YYY.....................................^^
^^..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^..........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^............................................................................................................................^^
^^..........................................................................................................................::^^
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^:::^^
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^PP!!!PP^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^:::~~
`
};
