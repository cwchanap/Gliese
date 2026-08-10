import { villageDressingAsset } from '$lib/game/content/assets';
import type { DecorGlyphSpec, LayeredRegionSource } from '$lib/game/content/maps/layered/types';

const WIDTH = 80;
const HEIGHT = 68;

type PaintRange = {
	readonly glyph: string;
	readonly rowStart: number;
	readonly rowEnd: number;
	readonly colStart: number;
	readonly colEnd: number;
};

function paintRanges(ranges: readonly PaintRange[]): string[] {
	const rows = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill('.'));
	for (const range of ranges) {
		for (let row = range.rowStart; row <= range.rowEnd; row += 1) {
			for (let col = range.colStart; col <= range.colEnd; col += 1) {
				rows[row]![col] = range.glyph;
			}
		}
	}
	return rows.map((row) => row.join(''));
}

const blankLayer = () => Array.from({ length: HEIGHT }, () => '.'.repeat(WIDTH));

const villageDecorGlyphTable: Record<
	string,
	DecorGlyphSpec<(typeof villageDressingAsset)['key']>
> = {
	A: {
		frame: 'gateArch',
		textureKey: villageDressingAsset.key,
		renderWidth: 220,
		renderHeight: 200
	},
	l: {
		frame: 'poleLantern',
		textureKey: villageDressingAsset.key,
		renderWidth: 100,
		renderHeight: 200,
		collision: { width: 50, height: 60 }
	},
	f: {
		frame: 'flowerBed',
		textureKey: villageDressingAsset.key,
		renderWidth: 150,
		renderHeight: 120
	}
};

const villagePaths = paintRanges([
	{ glyph: 'p', rowStart: 20, rowEnd: 24, colStart: 0, colEnd: 79 },
	{ glyph: 'p', rowStart: 25, rowEnd: 63, colStart: 0, colEnd: 3 },
	{ glyph: 'p', rowStart: 25, rowEnd: 63, colStart: 76, colEnd: 79 },
	{ glyph: 'p', rowStart: 44, rowEnd: 47, colStart: 0, colEnd: 79 },
	{ glyph: 'p', rowStart: 64, rowEnd: 67, colStart: 0, colEnd: 79 },
	{ glyph: 'p', rowStart: 13, rowEnd: 19, colStart: 11, colEnd: 14 },
	{ glyph: 'p', rowStart: 13, rowEnd: 19, colStart: 33, colEnd: 36 },
	{ glyph: 'p', rowStart: 14, rowEnd: 19, colStart: 61, colEnd: 64 },
	{ glyph: 'p', rowStart: 38, rowEnd: 43, colStart: 12, colEnd: 15 },
	{ glyph: 'p', rowStart: 38, rowEnd: 43, colStart: 61, colEnd: 64 },
	{ glyph: 'p', rowStart: 59, rowEnd: 63, colStart: 12, colEnd: 15 },
	{ glyph: 'p', rowStart: 59, rowEnd: 63, colStart: 36, colEnd: 39 },
	{ glyph: 'p', rowStart: 59, rowEnd: 63, colStart: 61, colEnd: 64 },
	{ glyph: 'c', rowStart: 26, rowEnd: 41, colStart: 28, colEnd: 49 },
	{ glyph: 'c', rowStart: 25, rowEnd: 25, colStart: 34, colEnd: 43 },
	{ glyph: 'c', rowStart: 42, rowEnd: 43, colStart: 34, colEnd: 43 }
]);

const villageDecor = paintRanges([
	{ glyph: 'A', rowStart: 22, rowEnd: 22, colStart: 77, colEnd: 77 },
	{ glyph: 'l', rowStart: 28, rowEnd: 28, colStart: 25, colEnd: 25 },
	{ glyph: 'l', rowStart: 28, rowEnd: 28, colStart: 53, colEnd: 53 },
	{ glyph: 'f', rowStart: 53, rowEnd: 53, colStart: 22, colEnd: 22 }
]);

export const sundropVillageLayered: LayeredRegionSource<(typeof villageDressingAsset)['key']> = {
	idPrefix: 'village',
	tileSize: 32,
	origin: { x: 256, y: 3968 },
	width: WIDTH,
	height: HEIGHT,
	layers: {
		terrain: blankLayer(),
		paths: villagePaths,
		collision: blankLayer(),
		decor: villageDecor,
		regions: blankLayer()
	},
	decorGlyphTable: villageDecorGlyphTable,
	objects: {}
};
