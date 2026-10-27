/**
 * Renders the overworld to a PNG with the grid tileset, building footprints,
 * chunk borders and labelled anchors, then reports anchors the player cannot
 * reach from spawn (an error for the base map, a note when overlays are applied).
 *
 *   bun run map:preview                      the whole continent, 4px tiles
 *   bun run map:preview -- --chunk sundrop   one chunk, 16px tiles
 *   bun run map:preview -- --chunk sundrop --overlay all
 *   bun run map:preview -- --overlay sundrop-raid --tile 8 --out /tmp/raid.png
 *
 * Output defaults to .artifacts/previews/overworld.png (or overworld-<chunk>.png).
 */
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';

import { GRID_BUILDING_TYPES } from '$lib/game/content/maps/grid/buildings';
import {
	applyTileOverlays,
	buildGridNavigationGrid,
	buildGridTileLayers,
	findUnreachablePoints
} from '$lib/game/content/maps/grid/layers';
import { GRID_TILESET } from '$lib/game/content/maps/grid/tileset';
import { overworld, overworldMap } from '$lib/game/content/maps/overworld/world';

const { values } = parseArgs({
	options: {
		tile: { type: 'string' },
		chunk: { type: 'string' },
		overlay: { type: 'string', multiple: true, default: [] },
		out: { type: 'string' }
	}
});

const view = values.chunk
	? overworld.chunks.find((chunk) => chunk.id === values.chunk)
	: { col: 0, row: 0, width: overworld.width, height: overworld.height };
if (!view) {
	throw new Error(
		`unknown chunk "${values.chunk}"; known: ${overworld.chunks.map((chunk) => chunk.id).join(', ')}`
	);
}

const tile = Number(values.tile ?? (values.chunk ? 16 : 4));
if (!Number.isInteger(tile) || tile < 2 || tile > GRID_TILESET.tileSize) {
	throw new Error(`--tile must be an integer from 2 to ${GRID_TILESET.tileSize}`);
}
const overlayIds = values.overlay.includes('all')
	? overworld.overlays.map((overlay) => overlay.id)
	: values.overlay;
for (const id of overlayIds) {
	if (!overworld.overlays.some((overlay) => overlay.id === id)) {
		throw new Error(
			`unknown overlay "${id}"; known: ${overworld.overlays.map((o) => o.id).join(', ')}`
		);
	}
}
const overlays = overworld.overlays.filter((overlay) => overlayIds.includes(overlay.id));
const terrain = applyTileOverlays(overworld.grid.terrain, overlays);
const layers = buildGridTileLayers(terrain);

const tilesetWidth = GRID_TILESET.columns * tile;
const tileset = await sharp(join(process.cwd(), 'public', GRID_TILESET.path))
	.resize(tilesetWidth, GRID_TILESET.rows * tile, { kernel: 'nearest' })
	.ensureAlpha()
	.raw()
	.toBuffer();

const width = view.width * tile;
const height = view.height * tile;
const pixels = Buffer.alloc(width * height * 4);
/** Pixel position of a world tile column or row inside the rendered view. */
const px = (col: number) => (col - view.col) * tile;
const py = (row: number) => (row - view.row) * tile;

function blitTile(id: number, col: number, row: number) {
	if (id < 0) return;
	const sourceLeft = (id % GRID_TILESET.columns) * tile;
	const sourceTop = Math.floor(id / GRID_TILESET.columns) * tile;
	for (let y = 0; y < tile; y += 1) {
		for (let x = 0; x < tile; x += 1) {
			const source = ((sourceTop + y) * tilesetWidth + sourceLeft + x) * 4;
			const alpha = tileset[source + 3]! / 255;
			if (alpha === 0) continue;
			const target = ((py(row) + y) * width + px(col) + x) * 4;
			for (let channel = 0; channel < 3; channel += 1) {
				pixels[target + channel] = Math.round(
					tileset[source + channel]! * alpha + pixels[target + channel]! * (1 - alpha)
				);
			}
			pixels[target + 3] = 255;
		}
	}
}

for (let row = view.row; row < view.row + view.height; row += 1) {
	for (let col = view.col; col < view.col + view.width; col += 1) {
		blitTile(layers.ground[row]![col]!, col, row);
		blitTile(layers.canopy[row]![col]!, col, row);
	}
}

const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;
const fontSize = Math.max(8, Math.round(tile * 0.6));
const inView = (col: number, row: number) =>
	col >= view.col && col < view.col + view.width && row >= view.row && row < view.row + view.height;
// Whole-continent views are too small for per-tile labels: draw chunk names instead.
const detailed = tile >= 8;
const svg = [
	`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
	...(detailed
		? [
				// A faint line every 8 tiles, labelled every 16, to find rows and columns in the grid text.
				...Array.from({ length: Math.floor(view.width / 8) }, (_, index) => {
					const x = (index + 1) * 8 * tile;
					return `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#000" stroke-opacity="0.18"/>`;
				}),
				...Array.from({ length: Math.floor(view.height / 8) }, (_, index) => {
					const y = (index + 1) * 8 * tile;
					return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#000" stroke-opacity="0.18"/>`;
				}),
				...Array.from({ length: Math.ceil(view.height / 16) }, (_, rowBlock) =>
					Array.from({ length: Math.ceil(view.width / 16) }, (_, colBlock) => {
						const col = view.col + colBlock * 16;
						const row = view.row + rowBlock * 16;
						return `<text x="${px(col) + 2}" y="${py(row) + fontSize}" font-size="${fontSize}" font-family="sans-serif" fill="#fff" fill-opacity="0.7">${col},${row}</text>`;
					})
				).flat()
			]
		: []),
	...overworld.chunks.map((chunk) => {
		const label = chunk.id;
		const size = detailed ? fontSize : 12;
		return (
			`<rect x="${px(chunk.col)}" y="${py(chunk.row)}" width="${chunk.width * tile}" height="${chunk.height * tile}" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="1" stroke-dasharray="6 4"/>` +
			`<text x="${px(chunk.col) + 4}" y="${py(chunk.row) + size + 2}" font-size="${size}" font-family="sans-serif" font-weight="bold" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">${label}</text>`
		);
	}),
	...overworld.grid.buildings
		.filter((building) => inView(building.col, building.row))
		.map(
			(building) =>
				`<rect x="${px(building.col)}" y="${py(building.row)}" width="${building.width * tile}" height="${building.height * tile}" fill="${hex(GRID_BUILDING_TYPES[building.type].color)}" stroke="#1a1a1a" stroke-width="${detailed ? 2 : 1}"/>` +
				(detailed
					? `<text x="${px(building.col) + 3}" y="${py(building.row) + fontSize + 2}" font-size="${fontSize}" font-family="sans-serif" fill="#fff">${building.type}</text>`
					: '')
		),
	...Object.values(overworld.anchors)
		.filter((anchor) => inView(anchor.col, anchor.row))
		.map(
			(anchor) =>
				`<circle cx="${px(anchor.col) + tile / 2}" cy="${py(anchor.row) + tile / 2}" r="${Math.max(2, tile / 3)}" fill="#ff2bd6" stroke="#000"/>` +
				(detailed
					? `<text x="${px(anchor.col) + tile}" y="${py(anchor.row) + tile / 2 + fontSize / 3}" font-size="${fontSize}" font-family="sans-serif" fill="#fff" stroke="#000" stroke-width="2" paint-order="stroke">${anchor.name}</text>`
					: '')
		),
	'</svg>'
].join('');

const out = resolve(
	process.cwd(),
	values.out ?? `.artifacts/previews/overworld${values.chunk ? `-${values.chunk}` : ''}.png`
);
mkdirSync(dirname(out), { recursive: true });
await sharp(pixels, { raw: { width, height, channels: 4 } })
	.composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
	.png()
	.toFile(out);
console.log(
	`wrote ${out} (${width}×${height}${overlayIds.length ? `, overlays: ${overlayIds.join(', ')}` : ''})`
);

const navigation = buildGridNavigationGrid(overworld.id, terrain, overworld.grid.buildings);
const unreachable = findUnreachablePoints(
	navigation,
	overworldMap.spawn,
	Object.values(overworld.anchors)
);
if (unreachable.length > 0) {
	// Story terrain can seal anchors on purpose (the raid burns the gates), so only the base map fails.
	console.warn(
		`unreachable from spawn${overlays.length ? ' with these overlays' : ''}: ${unreachable.join(', ')}`
	);
	if (overlays.length === 0) process.exitCode = 1;
}
