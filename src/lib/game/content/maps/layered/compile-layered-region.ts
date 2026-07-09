import type { LayeredRegionSource } from '$lib/game/content/maps/layered/types';
import type { RegionFragment, RegionLandmark } from '$lib/game/content/maps/regions/types';
import type {
	MapAmbientNpc,
	MapBlocker,
	MapBlockerKind,
	MapDecor,
	MapDiscovery,
	MapGroundPatch,
	MapGroundTile
} from '$lib/game/content/maps/types';

const PATH_TILE: Partial<Record<string, MapGroundTile>> = {
	p: 'pathTile',
	c: 'plazaStoneTile',
	a: 'autumnLeafTile',
	s: 'seaTile'
};
const TERRAIN_TILE: Partial<Record<string, MapGroundTile>> = {
	g: 'sandTile',
	w: 'seaTile'
};
const COLLISION_KIND: Partial<Record<string, MapBlockerKind>> = {
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
		x: source.origin.x + col * source.tileSize + source.tileSize / 2,
		y: source.origin.y + row * source.tileSize + source.tileSize / 2
	};
}

function buildGroundPatches(source: LayeredRegionSource): MapGroundPatch[] {
	assertDimensions(source, 'terrain', source.layers.terrain);
	assertDimensions(source, 'paths', source.layers.paths);
	const cellTile: (MapGroundTile | '')[] = new Array(source.width * source.height).fill('');
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
		let runTile: MapGroundTile | '' = '';
		for (let col = 0; col <= source.width; col++) {
			const tile = col < source.width ? cellTile[row * source.width + col] : '';
			if (tile !== '' && tile === runTile) continue;
			if (runStart >= 0 && runTile) {
				const start = tileCenter(source, runStart, row);
				const end = tileCenter(source, col - 1, row);
				patches.push({
					id: `${source.idPrefix}-ground-${row}-${runStart}`,
					x: (start.x + end.x) / 2,
					y: start.y,
					width: end.x - start.x + source.tileSize,
					height: source.tileSize,
					tile: runTile
				});
			}
			runStart = tile !== '' ? col : -1;
			runTile = tile;
		}
	}
	return patches;
}

function buildBlockers(source: LayeredRegionSource): MapBlocker[] {
	const horizontal: MapBlocker[] = [];
	for (let row = 0; row < source.height; row++) {
		const line = source.layers.collision[row];
		let runStart = -1;
		let runGlyph = '';
		let runKind: MapBlockerKind | '' = '';
		for (let col = 0; col <= line.length; col++) {
			const glyph = col < line.length ? line[col] : '.';
			if (glyph !== '.' && !(glyph in COLLISION_KIND)) {
				throw new Error(`unknown collision glyph "${glyph}" at col ${col} row ${row}`);
			}
			const kind = COLLISION_KIND[glyph] ?? '';
			if (kind !== '' && glyph === runGlyph) continue;
			if (runStart >= 0 && runKind) {
				const start = tileCenter(source, runStart, row);
				const end = tileCenter(source, col - 1, row);
				horizontal.push({
					id: `${source.idPrefix}-block-${row}-${runStart}`,
					x: (start.x + end.x) / 2,
					y: start.y,
					width: end.x - start.x + source.tileSize,
					height: source.tileSize,
					kind: runKind
				});
			}
			runStart = kind !== '' ? col : -1;
			runGlyph = kind !== '' ? glyph : '';
			runKind = kind;
		}
	}
	return mergeBlockersVertically(horizontal);
}

/**
 * After horizontal run-length merging, stack vertically-adjacent blockers that
 * share the same kind and horizontal span (x, width) into a single taller
 * blocker. Without this pass, a vertical wall N tiles tall produces N separate
 * 32px-tall blockers — a ~3× count regression that inflates the
 * `isPlayerMovementBlockedByBlocker` hot path in WorldScene.
 */
function mergeBlockersVertically(blockers: MapBlocker[]): MapBlocker[] {
	if (blockers.length <= 1) return blockers;
	const groups = new Map<string, MapBlocker[]>();
	for (const b of blockers) {
		const key = `${b.kind}|${b.x}|${b.width}`;
		const group = groups.get(key);
		if (group) group.push(b);
		else groups.set(key, [b]);
	}
	const merged: MapBlocker[] = [];
	for (const group of groups.values()) {
		if (group.length === 1) {
			merged.push(group[0]);
			continue;
		}
		group.sort((a, b) => a.y - b.y);
		let current = group[0];
		for (let i = 1; i < group.length; i++) {
			const next = group[i];
			const currentBottom = current.y + current.height / 2;
			const nextTop = next.y - next.height / 2;
			if (Math.abs(currentBottom - nextTop) < 0.001) {
				const topEdge = current.y - current.height / 2;
				const bottomEdge = next.y + next.height / 2;
				current = {
					...current,
					y: (topEdge + bottomEdge) / 2,
					height: bottomEdge - topEdge
				};
			} else {
				merged.push(current);
				current = next;
			}
		}
		merged.push(current);
	}
	return merged;
}

function buildMapDecor(source: LayeredRegionSource): MapDecor[] {
	const decor: MapDecor[] = [];
	for (let row = 0; row < source.height; row++) {
		const line = source.layers.decor[row];
		for (let col = 0; col < line.length; col++) {
			const glyph = line[col];
			if (glyph === '.') continue;
			const spec = source.decorGlyphTable[glyph];
			if (!spec) throw new Error(`unknown decor glyph "${glyph}" at col ${col} row ${row}`);
			const center = tileCenter(source, col, row);
			const base: MapDecor = {
				id: `${source.idPrefix}-decor-${row}-${col}`,
				textureKey: spec.textureKey as MapDecor['textureKey'],
				frameName: spec.frame as MapDecor['frameName'],
				x: center.x,
				y: center.y,
				width: spec.renderWidth,
				height: spec.renderHeight,
				mode: 'image',
				...(spec.depth ? { depth: spec.depth } : {}),
				...(spec.collision
					? {
							collision: {
								id: `${source.idPrefix}-decor-${row}-${col}-collision`,
								x: center.x,
								y: center.y + spec.renderHeight / 2 - spec.collision.height / 2,
								width: spec.collision.width,
								height: spec.collision.height
							}
						}
					: {})
			} as MapDecor;
			decor.push(base);
		}
	}
	return decor;
}

export function compileLayeredRegion(source: LayeredRegionSource): RegionFragment {
	assertDimensions(source, 'collision', source.layers.collision);
	assertDimensions(source, 'decor', source.layers.decor);
	assertDimensions(source, 'regions', source.layers.regions);
	const objects = source.objects;
	const landmarks = objects.landmarks?.map((lm) => {
		const c = tileCenter(source, lm.col, lm.row);
		return {
			id: lm.id,
			x: c.x,
			y: c.y,
			width: lm.width,
			height: lm.height,
			labelKey: lm.labelKey as RegionLandmark['labelKey']
		};
	});
	const transitions = objects.transitions?.map((t) => {
		const c = tileCenter(source, t.col, t.row);
		return {
			id: t.id,
			x: c.x,
			y: c.y,
			toMapId: t.toMapId,
			...(t.showMarker !== undefined ? { showMarker: t.showMarker } : {}),
			...(t.arrival ? { arrival: t.arrival } : {})
		};
	});
	const pickups = objects.pickups?.map((p) => {
		const c = tileCenter(source, p.col, p.row);
		return { id: p.id, x: c.x, y: c.y, itemId: p.itemId, quantity: p.quantity };
	});
	const ambientNpcs = objects.ambientNpcs?.map((n) => {
		const c = tileCenter(source, n.col, n.row);
		return {
			id: n.id,
			x: c.x,
			y: c.y,
			frameName: n.frameName as MapAmbientNpc['frameName']
		};
	});
	const discoveries = objects.discoveries?.map((d) => {
		const c = tileCenter(source, d.col, d.row);
		return {
			id: d.id,
			x: c.x,
			y: c.y,
			labelKey: d.labelKey as MapDiscovery['labelKey'],
			descriptionKey: d.descriptionKey as MapDiscovery['descriptionKey']
		};
	});
	return {
		groundPatches: buildGroundPatches(source),
		blockers: buildBlockers(source),
		mapDecor: buildMapDecor(source),
		...(landmarks ? { landmarks } : {}),
		...(transitions ? { transitions } : {}),
		...(pickups ? { pickups } : {}),
		...(ambientNpcs ? { ambientNpcs } : {}),
		...(discoveries ? { discoveries } : {})
	};
}
