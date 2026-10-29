/**
 * Bakes the grid-map tileset from the tile-ready art in `art/overworld/`. The
 * layout (which tile id draws what) lives in `content/maps/grid/tileset.ts`.
 *
 * Every slot is one square of TILE_VARIANTS × TILE_VARIANTS tiles, painted as a
 * single piece: textures are seamless at that size, and terrain edges fade to
 * the grass underneath along a wobble that is also periodic at that size, so a
 * tile always lines up with its neighbours. Terrains without art yet keep flat
 * placeholder colours.
 *
 *   bun run map:tileset
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

import type { TerrainGlyph } from '$lib/game/content/maps/grid/legend';
import {
	AUTOTILE_GLYPHS,
	EDGE_E,
	EDGE_N,
	EDGE_S,
	EDGE_W,
	GRID_TILESET,
	SINGLE_TILE_GLYPHS,
	TILE_VARIANTS,
	slotFor
} from '$lib/game/content/maps/grid/tileset';

type Rgba = readonly [number, number, number, number];
type Rgb = readonly [number, number, number];

interface Picture {
	readonly width: number;
	readonly height: number;
	readonly data: Buffer;
}

const TILE = GRID_TILESET.tileSize;
const PERIOD = TILE * TILE_VARIANTS;
const ART = join(process.cwd(), 'art', 'overworld');

async function load(name: string): Promise<Picture> {
	const { data, info } = await sharp(join(ART, `${name}.png`))
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	return { width: info.width, height: info.height, data };
}

const art = {
	grass: await load('tex-grass'),
	dirt: await load('tex-dirt'),
	water: await load('tex-water'),
	forest: await load('tex-forest'),
	mountain: await load('tex-mountain'),
	sand: await load('tex-sand'),
	cliffFace: await load('cliff-face'),
	mountainFoot: await load('mountain-foot'),
	bridgeDeck: await load('bridge-deck'),
	stairs: await load('stairs'),
	trees: [await load('tree-1'), await load('tree-2'), await load('tree-3')],
	rocks: [await load('rock-1'), await load('rock-2')]
};
for (const name of ['grass', 'dirt', 'water', 'forest', 'mountain', 'sand'] as const) {
	if (art[name].width !== PERIOD || art[name].height !== PERIOD) {
		throw new Error(`art/overworld/tex-${name}.png must be ${PERIOD}×${PERIOD}`);
	}
}

/** A pixel of `picture`, wrapping around its edges. */
function sample(picture: Picture, x: number, y: number): Rgba {
	const px = ((x % picture.width) + picture.width) % picture.width;
	const py = ((y % picture.height) + picture.height) % picture.height;
	const offset = (py * picture.width + px) * 4;
	const { data } = picture;
	return [data[offset]!, data[offset + 1]!, data[offset + 2]!, data[offset + 3]! / 255];
}

/** `top` laid over `bottom` at `amount` (times top's own alpha). */
function over(bottom: Rgba, top: Rgba, amount = 1): Rgba {
	const a = top[3] * amount;
	return [
		bottom[0] + (top[0] - bottom[0]) * a,
		bottom[1] + (top[1] - bottom[1]) * a,
		bottom[2] + (top[2] - bottom[2]) * a,
		bottom[3] + (1 - bottom[3]) * a
	];
}

const solid = ([r, g, b]: Rgb): Rgba => [r, g, b, 1];
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Smooth noise in [-1, 1], periodic over one slot, so edges run on across tiles and slots. */
function wave(seed: number, t: number): number {
	let sum = 0;
	let norm = 0;
	for (const [index, k] of [1, 2, 3, 5, 8, 13].entries()) {
		const amplitude = 1 / Math.sqrt(k);
		sum += amplitude * Math.sin((2 * Math.PI * k * t) / PERIOD + seed * 2.4 + index * 1.7);
		norm += amplitude;
	}
	return sum / norm;
}

interface EdgeStyle {
	/** How far inside the tile the edge sits, in px. */
	readonly inset: number;
	/** Width of the fade, in px. */
	readonly soft: number;
	/** How far the wobble pushes the edge in and out, in px. */
	readonly wobble: number;
	/** Radius of the rounded corner where two open edges meet, in px. */
	readonly radius: number;
}

/**
 * How far inside a terrain with edge `mask` the slot pixel (x, y) lies, in px,
 * measured from every edge whose neighbour is not the same terrain.
 */
function edgeDistance(mask: number, x: number, y: number, style: EdgeStyle): number {
	const lx = x % TILE;
	const ly = y % TILE;
	const reach = (open: boolean, from: number, seed: number, along: number) =>
		open ? from - style.inset - style.wobble * wave(seed, along) : Infinity;
	const n = reach(!(mask & EDGE_N), ly, 0, x);
	const s = reach(!(mask & EDGE_S), TILE - 1 - ly, 1, x);
	const w = reach(!(mask & EDGE_W), lx, 2, y);
	const e = reach(!(mask & EDGE_E), TILE - 1 - lx, 3, y);
	let distance = Math.min(n, s, w, e);
	const r = style.radius;
	for (const [a, b] of [
		[n, w],
		[n, e],
		[s, w],
		[s, e]
	] as const) {
		if (a < r && b < r) distance = Math.min(distance, r - Math.hypot(r - a, r - b));
	}
	return distance;
}

/** How much a terrain with edge `mask` covers the slot pixel (x, y): 1 inside, fading to 0 at its edges. */
const coverage = (mask: number, x: number, y: number, style: EdgeStyle) =>
	clamp01(edgeDistance(mask, x, y, style) / style.soft);

const PATH_EDGE: EdgeStyle = { inset: 3, soft: 4, wobble: 2.5, radius: 10 };
const BANK_EDGE: EdgeStyle = { inset: 1, soft: 3, wobble: 2, radius: 10 };
const WATER_EDGE: EdgeStyle = { inset: 4, soft: 2, wobble: 2, radius: 10 };
const FOREST_EDGE: EdgeStyle = { inset: 1, soft: 3, wobble: 3, radius: 12 };
const MOUNTAIN_EDGE: EdgeStyle = { inset: 1, soft: 3, wobble: 3, radius: 12 };
/** Under the mountain foot the rock stops halfway down the tile, so grass shows below the scree. */
const MOUNTAIN_FOOT_EDGE: EdgeStyle = { inset: 16, soft: 6, wobble: 3, radius: 12 };
const CLIFF_END: EdgeStyle = { inset: 0, soft: 3, wobble: 1.5, radius: 0 };
const STRAIGHT_EDGE: EdgeStyle = { inset: 0, soft: 1, wobble: 0, radius: 0 };

const BANK: Rgba = [96, 74, 46, 1];
const CLIFF_TOP: Rgba = [70, 58, 34, 1];
const RAIL: Rgba = [74, 48, 26, 1];
const RAIL_TOP: Rgba = [140, 98, 58, 1];

/** Placeholder colours for terrain that has no art yet. */
const PLACEHOLDER: Partial<Record<TerrainGlyph, Rgb>> = {
	P: [112, 78, 48],
	'!': [150, 60, 40],
	'%': [96, 120, 52],
	O: [90, 100, 120],
	'*': [70, 60, 56],
	I: [176, 120, 70],
	X: [160, 128, 84],
	'&': [236, 110, 30]
};

const grass = (x: number, y: number) => sample(art.grass, x, y);

/** Which of `count` sprites the tile holding slot pixel (x, y) draws, varied across the slot. */
const pick = (x: number, y: number, count: number) =>
	(Math.floor(x / TILE) * 3 + Math.floor(y / TILE) * 5) % count;

function paintSingle(glyph: (typeof SINGLE_TILE_GLYPHS)[number], x: number, y: number): Rgba {
	const lx = x % TILE;
	const ly = y % TILE;
	switch (glyph) {
		case '.':
			return grass(x, y);
		case 'Y': // canopy layer: the tree alone, over the grass ground tile
			return sample(art.trees[pick(x, y, art.trees.length)]!, lx, ly);
		case 'R':
			return over(grass(x, y), sample(art.rocks[pick(x, y, art.rocks.length)]!, lx, ly));
		case 'H':
			return over(grass(x, y), sample(art.stairs, lx, ly));
	}
	return over(grass(x, y), placeholderSingle(glyph, lx, ly));
}

function placeholderSingle(glyph: TerrainGlyph, lx: number, ly: number): Rgba {
	const color = solid(PLACEHOLDER[glyph]!);
	const clear: Rgba = [0, 0, 0, 0];
	const inRect = (x: number, y: number, w: number, h: number) =>
		lx >= x && lx < x + w && ly >= y && ly < y + h;
	const radius = Math.hypot(lx + 0.5 - TILE / 2, ly + 0.5 - TILE / 2);
	switch (glyph) {
		case '*':
			if (radius <= 6) return solid(PLACEHOLDER['&']!);
			return radius <= 12 ? color : clear;
		case 'I':
			return inRect(11, 2, 10, 28) ? color : clear;
		case 'X':
			return inRect(4, 6, 4, 24) || inRect(24, 6, 4, 24) || inRect(4, 8, 24, 4) ? color : clear;
		default:
			return inRect(2, 2, TILE - 4, TILE - 4) ? color : clear;
	}
}

function paintAutotile(
	glyph: (typeof AUTOTILE_GLYPHS)[number],
	mask: number,
	x: number,
	y: number
): Rgba {
	switch (glyph) {
		case ',':
			return over(grass(x, y), sample(art.dirt, x, y), coverage(mask, x, y, PATH_EDGE));
		case ':':
			return over(grass(x, y), sample(art.sand, x, y), coverage(mask, x, y, PATH_EDGE));
		case '^': {
			const rock = sample(art.mountain, x, y);
			if (mask & EDGE_S) return over(grass(x, y), rock, coverage(mask, x, y, MOUNTAIN_EDGE));
			// The open south side is the foot of the mountain: a rock face standing on the grass.
			const ground = over(grass(x, y), rock, coverage(mask, x, y, MOUNTAIN_FOOT_EDGE));
			const ends = coverage(mask | EDGE_N | EDGE_S, x, y, CLIFF_END);
			return over(ground, sample(art.mountainFoot, x, y % TILE), ends);
		}
		case '~': {
			const bank = over(grass(x, y), BANK, coverage(mask, x, y, BANK_EDGE));
			return over(bank, sample(art.water, x, y), coverage(mask, x, y, WATER_EDGE));
		}
		case 'T': {
			// Canopy layer: the forest alone, fading out over the grass ground tile.
			const [r, g, b] = sample(art.forest, x, y);
			return [r, g, b, coverage(mask, x, y, FOREST_EDGE)];
		}
		case '#': {
			const top = over(grass(x, y), CLIFF_TOP, 0.3 * coverage(mask, x, y, CLIFF_END));
			if (mask & EDGE_S) return top;
			// The open south side shows the cliff face, ending where the band ends.
			const ends = coverage(mask | EDGE_N | EDGE_S, x, y, CLIFF_END);
			return over(top, sample(art.cliffFace, x, y % TILE), ends);
		}
		case '=': {
			const lx = x % TILE;
			const ly = y % TILE;
			// The deck art runs east-west; a bridge that only runs north-south turns it.
			const northSouth = (mask & (EDGE_E | EDGE_W)) === 0 && (mask & (EDGE_N | EDGE_S)) !== 0;
			const planks = northSouth ? sample(art.bridgeDeck, ly, lx) : sample(art.bridgeDeck, lx, ly);
			// A log rail along every side that does not run on into more bridge or path.
			const toSide = edgeDistance(mask, x, y, STRAIGHT_EDGE);
			if (toSide < 1) return RAIL_TOP;
			if (toSide < 3) return RAIL;
			return over(sample(art.water, x, y), planks);
		}
	}
	return placeholderAutotile(PLACEHOLDER[glyph]!, mask, x % TILE, y % TILE);
}

function placeholderAutotile(color: Rgb, mask: number, lx: number, ly: number): Rgba {
	const band = 4;
	const onEdge =
		(!(mask & EDGE_N) && ly < band) ||
		(!(mask & EDGE_S) && ly >= TILE - band) ||
		(!(mask & EDGE_W) && lx < band) ||
		(!(mask & EDGE_E) && lx >= TILE - band);
	const [r, g, b] = color;
	return onEdge ? [r * 0.62, g * 0.62, b * 0.62, 1] : [r, g, b, 1];
}

const width = GRID_TILESET.columns * TILE;
const height = GRID_TILESET.rows * TILE;
const pixels = Buffer.alloc(width * height * 4);

function paintSlot(slot: number, paint: (x: number, y: number) => Rgba) {
	const left = (slot % GRID_TILESET.slotColumns) * PERIOD;
	const top = Math.floor(slot / GRID_TILESET.slotColumns) * PERIOD;
	for (let y = 0; y < PERIOD; y += 1) {
		for (let x = 0; x < PERIOD; x += 1) {
			const [r, g, b, a] = paint(x, y);
			const offset = ((top + y) * width + left + x) * 4;
			pixels[offset] = Math.round(r);
			pixels[offset + 1] = Math.round(g);
			pixels[offset + 2] = Math.round(b);
			pixels[offset + 3] = Math.round(a * 255);
		}
	}
}

for (const glyph of SINGLE_TILE_GLYPHS) {
	paintSlot(slotFor(glyph), (x, y) => paintSingle(glyph, x, y));
}
for (const glyph of AUTOTILE_GLYPHS) {
	for (let mask = 0; mask < 16; mask += 1) {
		paintSlot(slotFor(glyph, mask), (x, y) => paintAutotile(glyph, mask, x, y));
	}
}

const out = join(process.cwd(), 'public', GRID_TILESET.path);
mkdirSync(dirname(out), { recursive: true });
await sharp(pixels, { raw: { width, height, channels: 4 } })
	.png({ compressionLevel: 9 })
	.toFile(out);
console.log(`wrote ${out} (${width}×${height})`);
