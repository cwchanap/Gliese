import type { LayeredRegionSource } from '$lib/game/content/maps/layered/types';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';
import type { MapBlocker, MapGroundPatch } from '$lib/game/content/maps/types';

const PATH_TILE: Record<string, string> = {
	p: 'pathTile',
	c: 'plazaStoneTile',
	a: 'autumnLeafTile',
	s: 'seaTile'
};
const TERRAIN_TILE: Record<string, string> = {
	g: 'sandTile',
	w: 'seaTile'
};
const COLLISION_KIND: Record<string, string> = {
	'#': 'garden-hedge',
	B: 'garden-hedge',
	T: 'garden-hedge',
	W: 'ocean',
	G: 'future-gate'
};

function assertDimensions(
	source: LayeredRegionSource,
	layerName: string,
	rows: readonly string[]
): void {
	if (rows.length !== source.height) {
		throw new Error(`layer ${layerName} has ${rows.length} rows, expected height ${source.height}`);
	}
	for (let i = 0; i < rows.length; i++) {
		if (rows[i].length !== source.width) {
			throw new Error(
				`layer ${layerName} row ${i} has width ${rows[i].length}, expected ${source.width}`
			);
		}
	}
}

function tileCenter(
	source: LayeredRegionSource,
	col: number,
	row: number
): { x: number; y: number } {
	return {
		x: source.origin.x + col * source.tileSize + 16,
		y: source.origin.y + row * source.tileSize + 16
	};
}

function buildGroundPatches(source: LayeredRegionSource): MapGroundPatch[] {
	assertDimensions(source, 'terrain', source.layers.terrain);
	assertDimensions(source, 'paths', source.layers.paths);
	const cellTile: string[] = new Array(source.width * source.height).fill('');
	for (let row = 0; row < source.height; row++) {
		for (let col = 0; col < source.width; col++) {
			const t = TERRAIN_TILE[source.layers.terrain[row][col]];
			if (t) cellTile[row * source.width + col] = t;
		}
	}
	for (let row = 0; row < source.height; row++) {
		for (let col = 0; col < source.width; col++) {
			const p = PATH_TILE[source.layers.paths[row][col]];
			if (p) cellTile[row * source.width + col] = p;
		}
	}
	const patches: MapGroundPatch[] = [];
	for (let row = 0; row < source.height; row++) {
		let runStart = -1;
		let runTile = '';
		for (let col = 0; col <= source.width; col++) {
			const tile = col < source.width ? cellTile[row * source.width + col] : '';
			if (tile !== '' && tile === runTile) continue;
			if (runStart >= 0) {
				const start = tileCenter(source, runStart, row);
				const end = tileCenter(source, col - 1, row);
				patches.push({
					id: `ground-${row}-${runStart}`,
					x: start.x,
					y: start.y,
					width: end.x - start.x + source.tileSize,
					height: source.tileSize,
					tile: runTile as MapGroundPatch['tile']
				});
			}
			runStart = tile !== '' ? col : -1;
			runTile = tile;
		}
	}
	return patches;
}

function buildBlockers(source: LayeredRegionSource): MapBlocker[] {
	const blockers: MapBlocker[] = [];
	for (let row = 0; row < source.height; row++) {
		const line = source.layers.collision[row];
		let runStart = -1;
		let runGlyph = '';
		for (let col = 0; col <= line.length; col++) {
			const glyph = col < line.length ? line[col] : '.';
			const kind = COLLISION_KIND[glyph] ?? '';
			if (kind !== '' && glyph === runGlyph) continue;
			if (runStart >= 0) {
				const start = tileCenter(source, runStart, row);
				const end = tileCenter(source, col - 1, row);
				blockers.push({
					id: `block-${row}-${runStart}`,
					x: start.x,
					y: start.y,
					width: end.x - start.x + source.tileSize,
					height: source.tileSize,
					kind: (COLLISION_KIND[runGlyph] ?? '') as MapBlocker['kind']
				});
			}
			runStart = kind !== '' ? col : -1;
			runGlyph = kind !== '' ? glyph : '';
		}
	}
	return blockers;
}

export function compileLayeredRegion(source: LayeredRegionSource): RegionFragment {
	assertDimensions(source, 'collision', source.layers.collision);
	assertDimensions(source, 'decor', source.layers.decor);
	assertDimensions(source, 'regions', source.layers.regions);
	return { groundPatches: buildGroundPatches(source), blockers: buildBlockers(source) };
}
