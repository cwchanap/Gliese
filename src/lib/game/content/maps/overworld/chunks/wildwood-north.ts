import type { GridChunkSource } from '$lib/game/content/maps/grid/compile';

/**
 * The north Wildwood (野林北端): the corridor from Sundrop's north gate to the Silverpine gate,
 * the river down from the Silverpine falls, the thornback boar's clearing beyond the brook,
 * the Whispering Cave under the rim, and the ridge plateau that overlooks Sundrop. The bridge and
 * the west trail close the loop back to the corridor.
 */
const WIDTH = 128;
const HEIGHT = 48;

/** An overlay as big as the chunk that sets one rectangle to `glyph` and keeps the rest. */
function patch(col: number, row: number, width: number, height: number, glyph: string): string {
	return Array.from({ length: HEIGHT }, (_, y) =>
		Array.from({ length: WIDTH }, (_, x) =>
			x >= col && x < col + width && y >= row && y < row + height ? glyph : '-'
		).join('')
	).join('\n');
}

export const wildwoodNorthChunk: GridChunkSource = {
	id: 'wildwood-north',
	buildings: { C: 'whispering-cave' },
	anchors: {
		c: 'wildwood-whispering-cave',
		a: 'wildwood-cave-arrival',
		d: 'wildwood-cave-danger',
		w: 'wildwood-wolves-cave',
		b: 'wildwood-thornback-boar',
		t: 'wildwood-boar-sign-tusk-scrape',
		x: 'wildwood-wolves-crossing',
		r: 'wildwood-ridge-overlook',
		j: 'wildwood-woodcutter'
	},
	terrain: `
^^^^^^^^^^^^^^^^^^^^^^^^^^^^PP,,,PP^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
^^^^^^^^^^^^^^^^^^^^^^^^^^^^PP,,,PP^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
^^TTTT...TTTTTTTTTTTTTTTTTTT,,,,,,,.TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT~~TTTTTTTTTTTTTTTTTTTTTTT###########CCC###########^^
TTTTT.....TTTTTTTTTTTTTTTTTT,,,,,,,TTTTT##########################TTTTTTTTTT~~TTTTTTTTTTTTTTTTTTTTTTT###########CCC###########^^
TTTTTT...T...TTTTTTTTTTTTTTT,,,,,,,TTTTT##########################TTTTTTTTTT~~TTTTTTTTTTTTTTTTTTTTTTT###########,c,###########^^
TTTTTTTTT.....TTTTTTTTTTTTTT,,,,,,,.TTTTTT......................TTTTTTTTTTTT~~TTTTTTTTTTTTTTTTT.TTTTTTTTTTTTTT..,,,.TTTTTTTTTT^^
TTTTTTTTTT...TTTTTTTTTTTTTT,,,,,,TTTTTTTTT......................TTTTTTTTTTTT~~TTTTTTTTTTTTTT.T...TTTTTTTTTTT.TT,,,,TTTTTTTTTTT^^
TTTTTTTTTTTTTTTTTTTTTTTT..,,,,,,TTTTTTTTTT......................TTTTT.TTTT.T~~TTT.TTTTT.TT...........TTTTTTTT,,,,a,TTTTTTTTTTT^^
TTTTTTTTTTTTTTTTTTTTTTTTT,,,,,,T.TTTTTTTTT.......Y.....RR.......,,,,,,,,,,,,==,,,,,,,,,,................T.T.,,........TTTTTTTT^^
TTTTTT...TTTTTTTTTTTTTTT,,,,,,.TTTTTTTTTTT....Y.....R...........,,,,,,,,,,,,==,,,,,,,,,,.................,,,,...........TTTTTT^^
TTTTT.....TTTTTTTTTTTTT,,,,,,TTTTTTTTTTTTT............Y.........,,,,,,,,,,,,==,,,,,,,,,,..............,,,,,,.d.........TTTTTTT^^
TTTTTT...TTTTTTTTTTTT.,,,,,,TTTTTTTTTTTTTT.........Y............TTTT..,,,TTT~~TTTTTTTT................,,,,,,,.........w...TTTT^^
TTTTTTTTTTTTTTT...TTTT,,,,.TTTTTTTTTTTTTTT...R..R............Y..TTTT.T,,,TTT~~TTTTTT.........,b,,.....,,,,,TTT............TTTT^^
TTTTTTTTTTTTTT.....TT.,,,,TTTTTTTTTTTTTTTT......................TTTTT,,,,.TT~~TTTTTTT........,,,,,.......TT.T.TTTT.........TTT^^
TTTTTTTTTTTTTTT...TTTT,,,TTTTTTTTTTTTTTTTT......................TTTT.,,,,.T~~~TTTTTTTT.......,,,,,........TTTTTTTTT........TTT^^
TTTTTTTTTTTTT...TTTTTT,,,TTTTTTTTTTTTTTTTT......R...r.....R.....TTTTT,,,,TT~~~TTTTTTTT.......,,,,,,......TTTTTTTTTTT.....TTTTT^^
TTTTTTTTTTTT.....TTTTT,,,.TTTTTTTTTTTTTTTT......................TTTTT,,,.T~~~TTTTTTTTT.T.....,,,,,,,...TTTTTTTTTTTTT.T..T.TTTT^^
TTTTTTTTTTTTT......TTT,,,.TTTTTTTTTTTTTTTT......................TT...,,,.~~~TTTTTTTTTTTT.T....,,,,,,..TTTTTTTTTTTTTTTTT.TTTTTT^^
TTTTTTTTTTTTTTT.....TT,,,TTTTTTTTTTTTTTT##########################...,,,T~~~T~~~TTTTTTTTTT.TTTT,,t,,.TTTTTTTTTTTTTTTTTTTTTTTTT^^
TTTTTTTTTTTTTTTT......,,,TTTTTTTTTTTTTTT##########################.,,,,,~~~TT~~~~~~TTTTTTTTTTTT,,,,,.TTTTTTTTTTTTTTTTTTTTTTTTT^^
TTTTTTTTTTTTTTTTTT....,,,.TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,,~~~TTTT~~~~~~~TTTTTTTT.T,,,,TTTTTTTTTTTTTTTTTTTTTTTT..^^
TTTTTTTTTTTTTTTTTTT...,,,.TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT...TTT.T,,,,,,~~~TTTTTTTT~~~~~~~~TTTTTT,,x,TTTTTTTTTTTTTTTTTTTTTTT...^^
TTTTTTTTTTTTTTTTTTTTT.,,,,.TTTTTTTTTTTTTTTTTTTTTTTTTTT.......TT.,,,,,,~~~TTTTTTTTTTTT~~~~~~~~~T.,,,,TTTTTTTTTTTTTTT...TTTTTT..^^
TTTTTTTTTTTTTTTTTTTTTT,,,,,TTTTTTTTTTTTTTTTTTTTTTTTTT.......TTT,,,,,,~~~TTTTTT...TTTTTTT~~~~~~~====,TTTTTTTTTTTTTT.....TTTTTTT^^
TTTTTTTTTTTTTTTTTTTTT.T,,,,,.TTTT...TTTTTTTTTTTTTTTTTT...TTTTT,,,,,,~~~TTTTTT.....TTTTTTTTT..~~=======~TTTTTTTTTTTT...TTTTTTTT^^
TTTTTTTTTTTTTTTTTTTTTTT,,,,,,TTT.....TTTTTTTTTTTTTTTTTTTTTTT.,,,,,,~~~TTTTTTTT...TTTTTTTTT.....T,=====~~~~~TTTTTTTTTTTTTTTTTTT^^
TTTTTTTTTTTTTTTTTTTTTT..,,,,,.TTT....TTTTTTTTTTTTTTTTTTTTTT,,,,,,,~~~TTTTTTTTTTTTTTTTTTTTTT...T.,,,,T=~~~~~~~~~~TTTTTTTTTT...T^^
TTTTTTTTTTTTTTTTTTTTTTTTT,,,,,T.T.....TTTTTTTTTTTTTTTTTTT,,,,,,,T~~~TTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,TTTTTT~~~~~~~~~~TTTTT.....^^
TTTTTTTTTTT...TTTTTTTTTTTT,,,,,T.T...TTTTTTTTTTTTTTTTT.,,,,,,,,,~~~..TTTT...T...TTTTTTTTTTTTTTT.,,,,TTTTT...TT~~~~~~~~~~TT...T^^
TTTTTTTTTT.....TTTTTTTTTTT,,,,,,TTTTTTTTTTTTTTTTTTTTT,,,,,,,,,T~~~....TT.........TTTTTTTTTTTTTTT,,,,TTTT.....TTTTT~~~~~~~~~~TT^^
TTTTTTTTTTT...TTTTTTTTTTTT.,,,,,TTTTTTTTTT...TTTT.T,,,,,,,,,T.~~~T...TTTT...T...TTTTTTTTTTTTTTTT,,,,TTTTT...TTTTTTTTTT~~~~~~~~^^
TTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,TTTTTTTT............,,,,,.T.~~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,,TTTTTTTTTTTTTTTTTTTTTT~~~~^^
TTTTTTTTTTTTTTTTTTTTTTTT...T.,,,,.TTTTT.,,,,,....j....,TT.TT~~~~TTTTTTT...TTTT...TTTTTTTTTTTTTTT,,,,TTTTTTTTTTTTTTTTTTTTTTTTTT^^
TTTTTTTTTTTTTTTTTTTTTTT.....TT,,,,,,,,,,,,,,............T..~~~~TTTTTTT.....TT.....TTTTTTTTTTTTT.,,,,TTTTTTTTTTTTTTTTTT...TTTTT^^
TTTTTTTTTTTTTTTTTTTTTTT....TT.,,,,,,,,,,,,,,,.........TT...~~~TTTTTTTTT...TTTT...TTTTTTTTTTTTTTT,,,,T...TTTTTTTTTTTTT.....TTTT^^
TTTTTTTTTTTTTTTTTTTTTT.....TTT,,,,,,,,,,,,...T.......TTTT.~~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.,,,,.....TTTTTTTTTTTTT...TTTTT^^
TTTTTTTTTTTTTTTTTTTTTTT...TTT.,,,TT.T.TT....T.........TTT~~~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,T...TTTTTTTTTTTTTTTTTTTTTT^^
TTTTTTTTTTTTTTTTTTTTTTTTTTT...,,,.TTTTTTTTTTTT...T...TTT~~~~TTTTTTTTTTTTTTTTTTTTTTTTT...TTTTT..,,,,,.TTTTTTTTTTTTTTTTTTTTTTTTT^^
TTTTTTTTTTTTTTTTTTTTTTTTTT....,,,TTTTTTTTT...TTTTTTTTTTT~~~...TTTTTTTTTTTTTTTTTTTTTT.....TTT...,,,,,TTTTTTT...TTTTTTTTTTTTTTTT^^
TTTTTTTTTTTTTTTTTTTTTTTTTTT...,,,TTTTTTTT.....TTTTTTTTT~~~.....TTTTTTTT...TTTTTTTTT.....TTTTT..,,,,,TTTTTT.....TTTTTTTTTTTTTTT^^
TTTTTTTTT...TTTTTTTTTTTTTTTTTT,,,TTTTTTTTT...TTTTTTTTT~~~.....TTTTTTTT.....TTTTTTT.....TTTTTTTT,,,,TTTTTTTT...TTTTTTTTTTTTTT..^^
TTTTTTTT.....TTTT...TTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTTT~~~~...TTTTTTTTTTT...TTTTTTTTT...TTTTTTT.,,,,,TTTTTTTTTTTTTTTTTTTTTTTT...^^
TT..TTTTT...TTTT.....TT...TTTT,,,TTTTTTTTTTTTTT...TTT~~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,.TTTTTTTTTTTTTTTTTTTTTTTT..^^
TT...TTTTTTTTTTTT...TT.....TT.,,,.TTTTTTTTTTTT.....T~~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.T,,,,,TTTTTTTTTTTTTTTTTTTTTTTTTTT^^
TT..TTTTTTTTTTTTTTTTTTT...TTT.,,,TTT...TTTTTTTT...TT~~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,,,TTTTTTTTTTTTTTTTTTT...TTTTTT^^
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TT.....TTTTTT.....T~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT.T,,,,,TTTTTTTTTTTTTTTTTT.....TTTTT^^
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTT...TTTTTTTT...TT~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT..,,,,,,.TTTTTTTTTTTTTTTTTT...TTTTTT^^
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT,,,TTTTTTTTTTTTTTTTTTT~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT...,,,,,,.TTTTTTTTTTTTTTTTTTTTTTTTT..^^
`,
	overlays: [
		{
			// The tunnel mouth opens on the escape: path under the cave swaps in its open art.
			id: 'whispering-cave-open',
			activeDuring: { quests: ['prologue-escape'] },
			rows: patch(112, 2, 3, 2, ',')
		}
	]
};
