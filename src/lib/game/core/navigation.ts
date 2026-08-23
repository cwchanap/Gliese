export interface NavigationPoint {
	readonly x: number;
	readonly y: number;
}

export interface NavigationMaskSource {
	readonly id: string;
	readonly mapId: string;
	readonly cellSizePx: number;
	readonly widthCells: number;
	readonly heightCells: number;
	readonly clearancePx: number;
	readonly rows: readonly string[];
}

export interface NavigationGrid {
	readonly id: string;
	readonly mapId: string;
	readonly cellSizePx: number;
	readonly widthCells: number;
	readonly heightCells: number;
	readonly widthPx: number;
	readonly heightPx: number;
	readonly blockedBits: Uint8Array;
}

export function compileNavigationGrid(source: NavigationMaskSource): NavigationGrid {
	validateDimensions(source);
	validateRows(source);
	validateClearance(source.clearancePx);

	const widthPx = source.widthCells * source.cellSizePx;
	const heightPx = source.heightCells * source.cellSizePx;
	const blockedBits = new Uint8Array(bitsetByteLength(source.widthCells * source.heightCells));
	const rawBlockedCells = collectRawBlockedCells(source.rows);

	for (let row = 0; row < source.heightCells; row += 1) {
		for (let column = 0; column < source.widthCells; column += 1) {
			const center = {
				x: (column + 0.5) * source.cellSizePx,
				y: (row + 0.5) * source.cellSizePx
			};
			if (rawBlockedCells.some((blockedCell) => isWithinClearance(center, blockedCell, source))) {
				setBlocked(blockedBits, row * source.widthCells + column);
			}
		}
	}

	return freezeGrid({
		id: source.id,
		mapId: source.mapId,
		cellSizePx: source.cellSizePx,
		widthCells: source.widthCells,
		heightCells: source.heightCells,
		widthPx,
		heightPx,
		blockedBits
	});
}

export function createOpenNavigationGrid(input: {
	readonly id: string;
	readonly mapId: string;
	readonly cellSizePx: number;
	readonly widthCells: number;
	readonly heightCells: number;
}): NavigationGrid {
	validatePositiveInteger(input.cellSizePx, 'cellSizePx');
	validatePositiveInteger(input.widthCells, 'widthCells');
	validatePositiveInteger(input.heightCells, 'heightCells');

	const widthPx = input.widthCells * input.cellSizePx;
	const heightPx = input.heightCells * input.cellSizePx;

	return freezeGrid({
		id: input.id,
		mapId: input.mapId,
		cellSizePx: input.cellSizePx,
		widthCells: input.widthCells,
		heightCells: input.heightCells,
		widthPx,
		heightPx,
		blockedBits: new Uint8Array(bitsetByteLength(input.widthCells * input.heightCells))
	});
}

export function isWalkable(grid: NavigationGrid, x: number, y: number): boolean {
	const column = worldCoordinateToCell(x, grid.widthPx, grid.cellSizePx, grid.widthCells);
	const row = worldCoordinateToCell(y, grid.heightPx, grid.cellSizePx, grid.heightCells);
	if (column < 0 || row < 0) return false;

	return !isBlocked(grid.blockedBits, row * grid.widthCells + column);
}

function validateDimensions(source: NavigationMaskSource): void {
	validatePositiveInteger(source.cellSizePx, 'cellSizePx');
	validatePositiveInteger(source.widthCells, 'widthCells');
	validatePositiveInteger(source.heightCells, 'heightCells');

	const widthPx = source.widthCells * source.cellSizePx;
	const heightPx = source.heightCells * source.cellSizePx;
	if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx)) {
		throw new Error('Navigation dimensions exceed the supported world size');
	}
}

function validateRows(source: NavigationMaskSource): void {
	if (source.rows.length !== source.heightCells) {
		throw new Error(
			`Navigation row count must equal heightCells (${source.heightCells}), got ${source.rows.length}`
		);
	}

	for (const [rowIndex, row] of source.rows.entries()) {
		if (typeof row !== 'string' || row.length !== source.widthCells) {
			throw new Error(`Navigation row ${rowIndex} must contain exactly ${source.widthCells} cells`);
		}
		for (const glyph of row) {
			if (glyph !== '.' && glyph !== '#') {
				throw new Error(
					`Navigation row ${rowIndex} contains invalid glyph ${JSON.stringify(glyph)}`
				);
			}
		}
	}
}

function validateClearance(clearancePx: number): void {
	if (!Number.isFinite(clearancePx) || clearancePx < 0) {
		throw new Error('clearancePx must be a finite non-negative number');
	}
}

function collectRawBlockedCells(rows: readonly string[]): NavigationPoint[] {
	const blockedCells: NavigationPoint[] = [];
	for (const [row, value] of rows.entries()) {
		for (const [column, glyph] of [...value].entries()) {
			if (glyph === '#') blockedCells.push({ x: column, y: row });
		}
	}
	return blockedCells;
}

function isWithinClearance(
	point: NavigationPoint,
	blockedCell: NavigationPoint,
	source: NavigationMaskSource
): boolean {
	const left = blockedCell.x * source.cellSizePx;
	const right = left + source.cellSizePx;
	const top = blockedCell.y * source.cellSizePx;
	const bottom = top + source.cellSizePx;
	const dx = point.x < left ? left - point.x : point.x > right ? point.x - right : 0;
	const dy = point.y < top ? top - point.y : point.y > bottom ? point.y - bottom : 0;

	return dx * dx + dy * dy <= source.clearancePx * source.clearancePx;
}

function bitsetByteLength(cellCount: number): number {
	return Math.ceil(cellCount / 8);
}

function setBlocked(blockedBits: Uint8Array, index: number): void {
	blockedBits[index >> 3] |= 1 << (index & 7);
}

function isBlocked(blockedBits: Uint8Array, index: number): boolean {
	return (blockedBits[index >> 3] & (1 << (index & 7))) !== 0;
}

function worldCoordinateToCell(
	coordinate: number,
	maximum: number,
	cellSizePx: number,
	cellCount: number
): number {
	if (!Number.isFinite(coordinate) || coordinate < 0 || coordinate > maximum) return -1;
	return Math.min(Math.floor(coordinate / cellSizePx), cellCount - 1);
}

function validatePositiveInteger(value: number, name: string): void {
	if (!Number.isSafeInteger(value) || value <= 0) {
		throw new Error(`${name} must be a positive integer`);
	}
}

function freezeGrid(grid: NavigationGrid): NavigationGrid {
	return Object.freeze(grid);
}
