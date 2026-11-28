/**
 * Bakes the grid-map tileset from the tile-ready art in `art/overworld/`. The
 * layout (which tile id draws what) lives in `content/maps/grid/tileset.ts`.
 *
 * Every slot is one square of TILE_VARIANTS × TILE_VARIANTS tiles, painted as a
 * single piece: textures are seamless at that size, and terrain edges fade to
 * the grass underneath along a wobble that is also periodic at that size, so a
 * tile always lines up with its neighbours.
 *
 * It also packs the sprite art in `art/overworld/objects/` into the object sheet
 * (`GRID_OBJECT_SHEET` in `content/maps/grid/objects.ts`).
 *
 *   bun run map:tileset
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

import { GRID_OBJECT_SHEET } from '$lib/game/content/maps/grid/objects';
import {
	AUTOTILE_GLYPHS,
	EDGE_E,
	EDGE_N,
	EDGE_S,
	EDGE_W,
	GRID_TILESET,
	MOUNTAIN_ROCK_ROW,
	SINGLE_TILE_GLYPHS,
	TILE_VARIANTS,
	slotFor
} from '$lib/game/content/maps/grid/tileset';

type Rgba = readonly [number, number, number, number];

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
	marsh: await load('tex-marsh'),
	reeds: await load('tex-reeds'),
	pines: await load('tex-pines'),
	ledge: await load('tex-ledge'),
	cliffFace: await load('cliff-face'),
	mountainFoot: await load('mountain-foot'),
	bridgeDeck: await load('bridge-deck'),
	stairs: await load('stairs')
};
for (const name of [
	'grass',
	'dirt',
	'water',
	'forest',
	'mountain',
	'sand',
	'marsh',
	'reeds',
	'pines',
	'ledge'
] as const) {
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

/**
 * A tree line seen along one edge: a row of round leaf clumps of uneven size. Gives how far
 * the canopy's outline sits inside the tile edge at each px, periodic over one slot.
 */
const clumpProfiles = new Map<number, Float32Array>();
function clumpInset(seed: number, t: number): number {
	let profile = clumpProfiles.get(seed);
	if (!profile) {
		profile = new Float32Array(PERIOD).fill(Infinity);
		let state = 977 + seed * 7919;
		const random = () => (state = (state * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
		for (let centre = 0; centre < PERIOD; ) {
			const radius = 8 + random() * 9;
			const depth = radius + random() * 5; // the clump's tip sits 0-5px inside the tile edge
			for (let d = -Math.floor(radius); d <= radius; d += 1) {
				const at = (((Math.round(centre) + d) % PERIOD) + PERIOD) % PERIOD;
				profile[at] = Math.min(profile[at]!, depth - Math.sqrt(radius * radius - d * d));
			}
			centre += radius * (0.9 + random() * 0.7);
		}
		for (let at = 0; at < PERIOD; at += 1) profile[at] = Math.min(profile[at]!, 15);
		clumpProfiles.set(seed, profile);
	}
	return profile[((Math.round(t) % PERIOD) + PERIOD) % PERIOD]!;
}

interface EdgeStyle {
	/** The edge is a row of leaf clumps (canopies only). */
	readonly lobes?: boolean;
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
		open
			? from -
				style.inset -
				style.wobble * wave(seed, along) -
				(style.lobes ? clumpInset(seed, along) : 0)
			: Infinity;
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
const CANOPY_EDGE: EdgeStyle = { inset: 0, soft: 1.2, wobble: 0, radius: 13, lobes: true };
const MOUNTAIN_EDGE: EdgeStyle = { inset: 1, soft: 3, wobble: 3, radius: 12 };
/** Under the mountain foot the rock stops halfway down the tile, so grass shows below the scree. */
const MOUNTAIN_FOOT_EDGE: EdgeStyle = { inset: 16, soft: 6, wobble: 3, radius: 12 };
const CLIFF_END: EdgeStyle = { inset: 0, soft: 3, wobble: 1.5, radius: 0 };
const STRAIGHT_EDGE: EdgeStyle = { inset: 0, soft: 1, wobble: 0, radius: 0 };

const BANK: Rgba = [96, 74, 46, 1];
const CLIFF_TOP: Rgba = [70, 58, 34, 1];
const RAIL: Rgba = [74, 48, 26, 1];
const RAIL_TOP: Rgba = [140, 98, 58, 1];

/** Soot over the dirt where the raid burns. */
const SOOT: Rgba = [34, 24, 20, 1];

const grass = (x: number, y: number) => sample(art.grass, x, y);
const dirt = (x: number, y: number) => sample(art.dirt, x, y);
const marsh = (x: number, y: number) => sample(art.marsh, x, y);

/** Props drawn as sprites over their tile (see `objects.ts`) bake as the ground they stand on. */
function paintSingle(glyph: (typeof SINGLE_TILE_GLYPHS)[number], x: number, y: number): Rgba {
	const lx = x % TILE;
	const ly = y % TILE;
	switch (glyph) {
		case 'H':
			return over(grass(x, y), sample(art.stairs, lx, ly));
		case '*':
		case '!': // the sealed gate's rockfall lies across the road
			return dirt(x, y);
		case 'D': // a dead tree stands in the marsh, which joins it on every side
			return marsh(x, y);
		case 'V': // the waterfall sprite covers its patch; the river runs on under it
			return sample(art.water, x, y);
		case '&': // flames and the broken palisade stand on scorched earth, darkest in the middle
		case '/':
			return over(dirt(x, y), SOOT, 0.5 * Math.max(0, 1 - Math.hypot(lx - 15.5, ly - 15.5) / 22));
		default:
			return grass(x, y);
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
			return over(grass(x, y), dirt(x, y), coverage(mask, x, y, PATH_EDGE));
		case ':':
			return over(grass(x, y), sample(art.sand, x, y), coverage(mask, x, y, PATH_EDGE));
		case '_':
			return over(grass(x, y), sample(art.ledge, x, y), coverage(mask, x, y, PATH_EDGE));
		case '^': {
			// Only the mountain's edges: the rock itself is on the ground layer (`mountainRock`), so
			// this is grass where the rock fades out, and on an open south side the mountain foot,
			// a rock face standing on the grass, all over transparent rock.
			if (mask & EDGE_S) {
				const [r, g, b] = grass(x, y);
				return [r, g, b, 1 - coverage(mask, x, y, MOUNTAIN_EDGE)];
			}
			const rockCover = coverage(mask, x, y, MOUNTAIN_FOOT_EDGE);
			const foot = sample(art.mountainFoot, x, y % TILE);
			const footCover = foot[3] * coverage(mask | EDGE_N | EDGE_S, x, y, CLIFF_END);
			// Laid over rock, this gives foot over (rock fading to grass), as one layer.
			const alpha = 1 - rockCover * (1 - footCover);
			if (alpha <= 0) return [0, 0, 0, 0];
			const grassShare = (1 - rockCover) * (1 - footCover);
			const [gr, gg, gb] = grass(x, y);
			return [
				(foot[0] * footCover + gr * grassShare) / alpha,
				(foot[1] * footCover + gg * grassShare) / alpha,
				(foot[2] * footCover + gb * grassShare) / alpha,
				alpha
			];
		}
		case '~':
		case ';': {
			const water = glyph === '~' ? sample(art.water, x, y) : marsh(x, y);
			const bank = over(grass(x, y), BANK, coverage(mask, x, y, BANK_EDGE));
			return over(bank, water, coverage(mask, x, y, WATER_EDGE));
		}
		case 'T':
		case 'A':
		case '"': {
			// Canopy layer: the forest, pines or reeds alone, fading out over the grass ground tile.
			const canopy = { T: art.forest, A: art.pines, '"': art.reeds }[glyph];
			const [r, g, b] = sample(canopy, x, y);
			if (glyph === '"') return [r, g, b, coverage(mask, x, y, FOREST_EDGE)];
			// Trees end in clumps of leaves with a hard outline, a darker underside and a shadow on the grass.
			const inside = edgeDistance(mask, x, y, CANOPY_EDGE);
			if (inside <= 0) return [14, 24, 12, 0.5 * clamp01(1 + inside / 9)];
			if (inside < 1.6) return [r * 0.32, g * 0.36, b * 0.3, 1];
			const shade = 0.66 + 0.34 * clamp01((inside - 1.6) / 6);
			return [r * shade, g * shade, b * shade, 1];
		}
		case '#': {
			// Every cliff tile shows the rock face, ending where the band ends, so blocked ground
			// never draws as grass. A band more than one tile deep stands as tiers of face, one per
			// row, each shifted along the strip so its rocks do not line up with the tier below.
			const top = over(grass(x, y), CLIFF_TOP, 0.3 * coverage(mask, x, y, CLIFF_END));
			const ends = coverage(mask | EDGE_N | EDGE_S, x, y, CLIFF_END);
			const tier = Math.floor(y / TILE);
			return over(top, sample(art.cliffFace, x + tier * 101, y % TILE), ends);
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
		case 'O': // the well stands in the dirt of the village square
			return dirt(x, y);
		case 'P':
		case '%':
			return grass(x, y);
	}
}

/**
 * How each of the two Wang edge kinds samples the mountain art: kind 1 mirrors it and
 * shifts it, so its ridges cross the other kind's instead of lining up in one lattice.
 */
const rockKind = (kind: number, x: number, y: number) =>
	kind ? sample(art.mountain, 131 - x, y + 83) : sample(art.mountain, x, y);

/**
 * Wang tile `wang` of mountain rock (see `MOUNTAIN_ROCK_ROW`): near each edge the art
 * is sampled at that edge kind's offset, so it runs on into any block whose touching
 * edge has the same kind, and inside the tile the four edges' samples blend, each
 * weighted by how close its edge is.
 */
function mountainRock(wang: number, x: number, y: number): Rgba {
	const kinds = [wang & EDGE_N, wang & EDGE_E, wang & EDGE_S, wang & EDGE_W].map((bit) =>
		bit ? 1 : 0
	);
	const distances = [y, PERIOD - 1 - x, PERIOD - 1 - y, x];
	let r = 0;
	let g = 0;
	let b = 0;
	let total = 0;
	for (let edge = 0; edge < 4; edge += 1) {
		const weight = 1 / (distances[edge]! + 0.5) ** 6;
		const [sr, sg, sb] = rockKind(kinds[edge]!, x, y);
		r += sr * weight;
		g += sg * weight;
		b += sb * weight;
		total += weight;
	}
	return [r / total, g / total, b / total, 1];
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
for (let wang = 0; wang < 16; wang += 1) {
	paintSlot(MOUNTAIN_ROCK_ROW * GRID_TILESET.slotColumns + wang, (x, y) =>
		mountainRock(wang, x, y)
	);
}

const out = join(process.cwd(), 'public', GRID_TILESET.path);
mkdirSync(dirname(out), { recursive: true });
await sharp(pixels, { raw: { width, height, channels: 4 } })
	.png({ compressionLevel: 9 })
	.toFile(out);
console.log(`wrote ${out} (${width}×${height})`);

// The object sheet: every piece of object art, at the position `GRID_OBJECT_SHEET` gives it.
const sheetOut = join(process.cwd(), 'public', GRID_OBJECT_SHEET.path);
const pieces = await Promise.all(
	Object.entries(GRID_OBJECT_SHEET.frames).map(async ([frame, { x, y, w, h }]) => {
		const input = join(ART, 'objects', `${frame}.png`);
		const { width: actualWidth, height: actualHeight } = await sharp(input).metadata();
		if (actualWidth !== w || actualHeight !== h) {
			throw new Error(`art/overworld/objects/${frame}.png must be ${w}×${h}`);
		}
		return { input, left: x, top: y };
	})
);
await sharp({
	create: {
		width: GRID_OBJECT_SHEET.width,
		height: GRID_OBJECT_SHEET.height,
		channels: 4,
		background: { r: 0, g: 0, b: 0, alpha: 0 }
	}
})
	.composite(pieces)
	.png({ compressionLevel: 9 })
	.toFile(sheetOut);
console.log(`wrote ${sheetOut} (${GRID_OBJECT_SHEET.width}×${GRID_OBJECT_SHEET.height})`);
