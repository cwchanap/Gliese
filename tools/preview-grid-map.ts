/**
 * Renders the overworld to a PNG with the grid tileset, building footprints,
 * and labelled anchors, then reports anchors the player cannot reach from spawn.
 *
 *   bun run map:preview                      base terrain, 16px tiles
 *   bun run map:preview -- --overlay all     with every story overlay applied
 *   bun run map:preview -- --overlay sandbox-raid --tile 32 --out /tmp/raid.png
 *
 * Output defaults to .artifacts/previews/overworld.png.
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
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
		tile: { type: 'string', default: '16' },
		overlay: { type: 'string', multiple: true, default: [] },
		out: { type: 'string', default: '.artifacts/previews/overworld.png' }
	}
});

const tile = Number(values.tile);
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

const width = overworld.width * tile;
const height = overworld.height * tile;
const pixels = Buffer.alloc(width * height * 4);

function blitTile(id: number, col: number, row: number) {
	if (id < 0) return;
	const sourceLeft = (id % GRID_TILESET.columns) * tile;
	const sourceTop = Math.floor(id / GRID_TILESET.columns) * tile;
	for (let y = 0; y < tile; y += 1) {
		for (let x = 0; x < tile; x += 1) {
			const source = ((sourceTop + y) * tilesetWidth + sourceLeft + x) * 4;
			const alpha = tileset[source + 3]! / 255;
			if (alpha === 0) continue;
			const target = ((row * tile + y) * width + col * tile + x) * 4;
			for (let channel = 0; channel < 3; channel += 1) {
				pixels[target + channel] = Math.round(
					tileset[source + channel]! * alpha + pixels[target + channel]! * (1 - alpha)
				);
			}
			pixels[target + 3] = 255;
		}
	}
}

for (let row = 0; row < overworld.height; row += 1) {
	for (let col = 0; col < overworld.width; col += 1) {
		blitTile(layers.ground[row]![col]!, col, row);
		blitTile(layers.canopy[row]![col]!, col, row);
	}
}

const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;
const fontSize = Math.max(8, Math.round(tile * 0.6));
const svg = [
	`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
	// A faint line every 8 tiles, labelled every 16, to find rows and columns in the grid text.
	...Array.from({ length: Math.floor(overworld.width / 8) }, (_, index) => {
		const x = (index + 1) * 8 * tile;
		return `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#000" stroke-opacity="0.18"/>`;
	}),
	...Array.from({ length: Math.floor(overworld.height / 8) }, (_, index) => {
		const y = (index + 1) * 8 * tile;
		return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#000" stroke-opacity="0.18"/>`;
	}),
	...Array.from({ length: Math.ceil(overworld.height / 16) }, (_, rowBlock) =>
		Array.from({ length: Math.ceil(overworld.width / 16) }, (_, colBlock) => {
			const col = colBlock * 16;
			const row = rowBlock * 16;
			return `<text x="${col * tile + 2}" y="${row * tile + fontSize}" font-size="${fontSize}" font-family="sans-serif" fill="#fff" fill-opacity="0.7">${col},${row}</text>`;
		})
	).flat(),
	...overworld.grid.buildings.map(
		(building) =>
			`<rect x="${building.col * tile}" y="${building.row * tile}" width="${building.width * tile}" height="${building.height * tile}" fill="${hex(GRID_BUILDING_TYPES[building.type].color)}" stroke="#1a1a1a" stroke-width="2"/>` +
			`<text x="${building.col * tile + 3}" y="${building.row * tile + fontSize + 2}" font-size="${fontSize}" font-family="sans-serif" fill="#fff">${building.type}</text>`
	),
	...Object.values(overworld.anchors).map(
		(anchor) =>
			`<circle cx="${anchor.col * tile + tile / 2}" cy="${anchor.row * tile + tile / 2}" r="${Math.max(2, tile / 3)}" fill="#ff2bd6" stroke="#000"/>` +
			`<text x="${anchor.col * tile + tile}" y="${anchor.row * tile + tile / 2 + fontSize / 3}" font-size="${fontSize}" font-family="sans-serif" fill="#fff" stroke="#000" stroke-width="2" paint-order="stroke">${anchor.name}</text>`
	),
	'</svg>'
].join('');

const out = join(process.cwd(), values.out);
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
	console.warn(`unreachable from spawn: ${unreachable.join(', ')}`);
	process.exitCode = 1;
}
