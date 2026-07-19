export type Solid = (col: number, row: number) => boolean;
export type Walkable = (col: number, row: number) => boolean;
export interface Cell {
	readonly col: number;
	readonly row: number;
}
export interface Dims {
	readonly width: number;
	readonly height: number;
}

const STEPS: ReadonlyArray<readonly [number, number]> = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
];

/**
 * Rooms A and B are adjacent iff a walkable A-cell is 4-connected to a
 * walkable B-cell through cells labelled only A, B, or nothing. Restricting
 * the flood to the pair is what stops adjacency leaking through a third room
 * and collapsing the graph into a star.
 */
export function roomAdjacency(
	regions: readonly string[],
	collision: readonly string[],
	glyphs: readonly string[]
): Set<string> {
	const height = regions.length;
	const width = regions[0]?.length ?? 0;
	const walkable = (col: number, row: number) =>
		row >= 0 && row < height && col >= 0 && col < width && collision[row][col] === '.';
	const found = new Set<string>();

	for (let i = 0; i < glyphs.length; i++) {
		for (let j = i + 1; j < glyphs.length; j++) {
			const a = glyphs[i];
			const b = glyphs[j];
			const seen = new Set<string>();
			const queue: Cell[] = [];
			for (let row = 0; row < height; row++) {
				for (let col = 0; col < width; col++) {
					if (regions[row][col] === a && walkable(col, row)) {
						queue.push({ col, row });
						seen.add(`${col}:${row}`);
					}
				}
			}
			let hit = false;
			while (queue.length > 0 && !hit) {
				const { col, row } = queue.shift()!;
				for (const [dc, dr] of STEPS) {
					const nc = col + dc;
					const nr = row + dr;
					if (!walkable(nc, nr) || seen.has(`${nc}:${nr}`)) continue;
					const glyph = regions[nr][nc];
					if (glyph === b) {
						hit = true;
						break;
					}
					if (glyph === a || glyph === '.') {
						seen.add(`${nc}:${nr}`);
						queue.push({ col: nc, row: nr });
					}
				}
			}
			if (hit) found.add([a, b].sort().join('-'));
		}
	}
	return found;
}

/** Length of the maximal unbroken solid run through (col,row) along one axis. */
export function maximalRun(
	solid: Solid,
	col: number,
	row: number,
	axis: 'horizontal' | 'vertical',
	width: number,
	height: number
): number {
	if (!solid(col, row)) return 0;
	const [dc, dr] = axis === 'horizontal' ? [1, 0] : [0, 1];
	let length = 1;
	for (let k = 1; ; k++) {
		const c = col + dc * k;
		const r = row + dr * k;
		if (c < 0 || r < 0 || c >= width || r >= height || !solid(c, r)) break;
		length++;
	}
	for (let k = 1; ; k++) {
		const c = col - dc * k;
		const r = row - dr * k;
		if (c < 0 || r < 0 || c >= width || r >= height || !solid(c, r)) break;
		length++;
	}
	return length;
}

export function bfsPath(start: Cell, goal: Cell, walkable: Walkable, dims: Dims): Cell[] | null {
	const key = (c: Cell) => `${c.col}:${c.row}`;
	if (!walkable(start.col, start.row) || !walkable(goal.col, goal.row)) return null;
	const prev = new Map<string, string>();
	const seen = new Set<string>([key(start)]);
	const queue: Cell[] = [start];
	while (queue.length > 0) {
		const current = queue.shift()!;
		if (current.col === goal.col && current.row === goal.row) {
			const path: Cell[] = [];
			let node: string | undefined = key(current);
			while (node) {
				const [c, r] = node.split(':');
				path.unshift({ col: Number(c), row: Number(r) });
				node = prev.get(node);
			}
			return path;
		}
		for (const [dc, dr] of STEPS) {
			const next = { col: current.col + dc, row: current.row + dr };
			if (
				next.col < 0 ||
				next.row < 0 ||
				next.col >= dims.width ||
				next.row >= dims.height ||
				!walkable(next.col, next.row) ||
				seen.has(key(next))
			) {
				continue;
			}
			seen.add(key(next));
			prev.set(key(next), key(current));
			queue.push(next);
		}
	}
	return null;
}

/**
 * Free cross-section at path[index], measured perpendicular to the local
 * direction of travel. This is the operative definition of "route width":
 * a 3-wide corridor stays 3 however long it runs.
 */
export function perpendicularRun(
	path: readonly Cell[],
	index: number,
	walkable: Walkable,
	dims: Dims
): number {
	const here = path[index];
	const other = path[index + 1] ?? path[index - 1] ?? here;
	const travelHorizontal = other.col !== here.col;
	const [dc, dr] = travelHorizontal ? [0, 1] : [1, 0];
	let run = 1;
	for (const sign of [1, -1]) {
		for (let k = 1; ; k++) {
			const c = here.col + dc * k * sign;
			const r = here.row + dr * k * sign;
			if (c < 0 || r < 0 || c >= dims.width || r >= dims.height || !walkable(c, r)) break;
			run++;
		}
	}
	return run;
}

/**
 * Tiles covered by a rect centred on a tile centre and expanded by `padPx`.
 * Used to check that a building footprint clears an opening — WorldScene
 * blocks movement against landmark rects padded by its player radius.
 */
export function footprintTiles(
	centreCol: number,
	centreRow: number,
	widthPx: number,
	heightPx: number,
	padPx: number,
	tileSize: number
): Cell[] {
	const cx = centreCol * tileSize + tileSize / 2;
	const cy = centreRow * tileSize + tileSize / 2;
	const left = cx - widthPx / 2 - padPx;
	const right = cx + widthPx / 2 + padPx;
	const top = cy - heightPx / 2 - padPx;
	const bottom = cy + heightPx / 2 + padPx;
	const out: Cell[] = [];
	for (let row = Math.floor(top / tileSize); row <= Math.floor((bottom - 1) / tileSize); row++) {
		for (let col = Math.floor(left / tileSize); col <= Math.floor((right - 1) / tileSize); col++) {
			if (col >= 0 && row >= 0) out.push({ col, row });
		}
	}
	return out;
}
