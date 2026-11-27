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
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.............................................^^
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT...............................................^^
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.....................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^.R.TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,g,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^.....TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^.....TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^.......TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
^^.......TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT.........................................................^^
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
