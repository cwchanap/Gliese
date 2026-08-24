export interface NavigationPoint {
	readonly x: number;
	readonly y: number;
}

export interface NavigationRect {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
}

export interface NavigationDoorCandidate<T = unknown> {
	readonly id: string;
	readonly point: NavigationPoint;
	readonly value?: T;
}

export type NavigationObstacle =
	| {
			readonly id: string;
			readonly shape: 'rect';
			readonly bounds: NavigationRect;
			readonly movement: 'strict' | 'escape-aware';
			readonly invalidAtRest: boolean;
			readonly escapeOrigin?: NavigationPoint;
	  }
	| {
			readonly id: string;
			readonly shape: 'circle';
			readonly center: NavigationPoint;
			readonly radius: number;
			readonly movement: 'escape-aware';
			readonly invalidAtRest: boolean;
	  }
	| {
			readonly id: string;
			readonly shape: 'landmark';
			readonly landmarkId: string;
			readonly bounds: NavigationRect;
			readonly doorCandidates: readonly NavigationDoorCandidate[];
			readonly doorwayWidthPx: number;
			readonly transitionRadiusPx: number;
			readonly invalidAtRest: true;
	  };

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

	for (const blockedCell of rawBlockedCells) {
		const columnRange = getCandidateCellRange(
			blockedCell.x,
			source.cellSizePx,
			source.clearancePx,
			source.widthCells
		);
		const rowRange = getCandidateCellRange(
			blockedCell.y,
			source.cellSizePx,
			source.clearancePx,
			source.heightCells
		);

		for (let row = rowRange.min; row <= rowRange.max; row += 1) {
			for (let column = columnRange.min; column <= columnRange.max; column += 1) {
				const center = {
					x: (column + 0.5) * source.cellSizePx,
					y: (row + 0.5) * source.cellSizePx
				};
				if (isWithinClearance(center, blockedCell, source)) {
					setBlocked(blockedBits, row * source.widthCells + column);
				}
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
	return !isGridPositionBlocked(grid, { x, y });
}

export function resolveMovementSegment(
	grid: NavigationGrid,
	obstacles: readonly NavigationObstacle[],
	from: NavigationPoint,
	to: NavigationPoint,
	radius: number
): NavigationPoint {
	let x = to.x;
	let y = to.y;

	if (isSegmentBlocked(grid, obstacles, from, { x, y: from.y }, radius)) {
		x = from.x;
	}
	if (isSegmentBlocked(grid, obstacles, { x, y: from.y }, { x, y }, radius)) {
		y = from.y;
	}

	return { x, y };
}

export function isPositionWalkable(
	grid: NavigationGrid,
	obstacles: readonly NavigationObstacle[],
	point: NavigationPoint,
	radius: number,
	mode: 'movement-target' | 'resting-position' = 'movement-target'
): boolean {
	if (!isWalkable(grid, point.x, point.y)) return false;

	return !obstacles.some((obstacle) => {
		if (mode === 'resting-position' && !obstacle.invalidAtRest) return false;
		return isPointBlockedByObstacle(obstacle, point, radius);
	});
}

export function findLandmarkDoorway<T>(
	landmarkId: string,
	bounds: NavigationRect,
	doorCandidates: readonly NavigationDoorCandidate<T>[]
): NavigationDoorCandidate<T> | undefined {
	const landmarkKey = landmarkId.replace('-exterior', '');
	return doorCandidates.find(
		(candidate) =>
			candidate.point.x >= bounds.left &&
			candidate.point.x <= bounds.right &&
			candidate.point.y >= bounds.top &&
			candidate.point.y <= bounds.bottom &&
			candidate.id.includes(landmarkKey)
	);
}

export function isPointInsideRect(
	point: NavigationPoint,
	rect: NavigationRect,
	padding: number
): boolean {
	return (
		point.x >= rect.left - padding &&
		point.x <= rect.right + padding &&
		point.y >= rect.top - padding &&
		point.y <= rect.bottom + padding
	);
}

export function isPointInsideAnyRect(
	point: NavigationPoint,
	rects: readonly NavigationRect[],
	padding: number
): boolean {
	return rects.some((rect) => isPointInsideRect(point, rect, padding));
}

export function findNearestWalkablePosition(
	grid: NavigationGrid,
	obstacles: readonly NavigationObstacle[],
	point: NavigationPoint,
	radius: number
): NavigationPoint | null {
	const startColumn = worldCoordinateToCell(
		point.x,
		grid.widthPx,
		grid.cellSizePx,
		grid.widthCells
	);
	const startRow = worldCoordinateToCell(point.y, grid.heightPx, grid.cellSizePx, grid.heightCells);
	if (startColumn < 0 || startRow < 0) return null;

	const maxRadius = Math.max(grid.widthCells, grid.heightCells);
	for (let ring = 0; ring <= maxRadius; ring += 1) {
		const minColumn = Math.max(0, startColumn - ring);
		const maxColumn = Math.min(grid.widthCells - 1, startColumn + ring);
		const minRow = Math.max(0, startRow - ring);
		const maxRow = Math.min(grid.heightCells - 1, startRow + ring);

		for (let row = minRow; row <= maxRow; row += 1) {
			for (let column = minColumn; column <= maxColumn; column += 1) {
				if (Math.max(Math.abs(column - startColumn), Math.abs(row - startRow)) !== ring) {
					continue;
				}

				const candidate = {
					x: (column + 0.5) * grid.cellSizePx,
					y: (row + 0.5) * grid.cellSizePx
				};
				if (isPositionWalkable(grid, obstacles, candidate, radius, 'resting-position')) {
					return candidate;
				}
			}
		}
	}

	return null;
}

function isSegmentBlocked(
	grid: NavigationGrid,
	obstacles: readonly NavigationObstacle[],
	from: NavigationPoint,
	to: NavigationPoint,
	radius: number
): boolean {
	return (
		isGridSegmentBlocked(grid, from, to) ||
		obstacles.some((obstacle) => {
			return isSegmentBlockedByObstacle(obstacle, from, to, radius);
		})
	);
}

/**
 * Traverses only the cells touched by the segment. Equal-time boundary
 * crossings visit both side cells as well as the diagonal cell (supercover),
 * so a diagonal step cannot slip through a blocked corner.
 */
function isGridSegmentBlocked(
	grid: NavigationGrid,
	from: NavigationPoint,
	to: NavigationPoint
): boolean {
	if (!isInsideWorld(grid, from) || !isInsideWorld(grid, to)) return true;

	const deltaX = to.x - from.x;
	const deltaY = to.y - from.y;
	let column = worldCoordinateToCell(from.x, grid.widthPx, grid.cellSizePx, grid.widthCells);
	let row = worldCoordinateToCell(from.y, grid.heightPx, grid.cellSizePx, grid.heightCells);
	if (column < 0 || row < 0) return true;

	const stepX = deltaX > 0 ? 1 : deltaX < 0 ? -1 : 0;
	const stepY = deltaY > 0 ? 1 : deltaY < 0 ? -1 : 0;
	const deltaTByX = stepX === 0 ? Number.POSITIVE_INFINITY : grid.cellSizePx / Math.abs(deltaX);
	const deltaTByY = stepY === 0 ? Number.POSITIVE_INFINITY : grid.cellSizePx / Math.abs(deltaY);
	let nextBoundaryT = nextGridBoundaryT(from.x, column, stepX, grid.cellSizePx, deltaX);
	let nextBoundaryY = nextGridBoundaryT(from.y, row, stepY, grid.cellSizePx, deltaY);

	if (isGridPositionBlocked(grid, from)) return true;

	while (nextBoundaryT <= 1 || nextBoundaryY <= 1) {
		if (Math.abs(nextBoundaryT - nextBoundaryY) <= 1e-12) {
			if (nextBoundaryT > 1) break;
			const crossesX = !isWorldEdgeEndpoint(to.x, grid.widthPx, stepX, nextBoundaryT);
			const crossesY = !isWorldEdgeEndpoint(to.y, grid.heightPx, stepY, nextBoundaryY);
			if (!crossesX && !crossesY) break;
			if (crossesX && isGridCellBlocked(grid, row, column + stepX)) return true;
			if (crossesY && isGridCellBlocked(grid, row + stepY, column)) return true;
			if (crossesX) column += stepX;
			if (crossesY) row += stepY;
			if (isGridCellBlocked(grid, row, column)) return true;
			nextBoundaryT = crossesX ? nextBoundaryT + deltaTByX : Number.POSITIVE_INFINITY;
			nextBoundaryY = crossesY ? nextBoundaryY + deltaTByY : Number.POSITIVE_INFINITY;
			continue;
		}

		if (nextBoundaryT < nextBoundaryY) {
			if (nextBoundaryT > 1) break;
			if (isWorldEdgeEndpoint(to.x, grid.widthPx, stepX, nextBoundaryT)) {
				nextBoundaryT = Number.POSITIVE_INFINITY;
				continue;
			}
			column += stepX;
			if (isGridCellBlocked(grid, row, column)) return true;
			nextBoundaryT += deltaTByX;
			continue;
		}

		if (nextBoundaryY > 1) break;
		if (isWorldEdgeEndpoint(to.y, grid.heightPx, stepY, nextBoundaryY)) {
			nextBoundaryY = Number.POSITIVE_INFINITY;
			continue;
		}
		row += stepY;
		if (isGridCellBlocked(grid, row, column)) return true;
		nextBoundaryY += deltaTByY;
	}

	return false;
}

function isInsideWorld(grid: NavigationGrid, point: NavigationPoint): boolean {
	return (
		Number.isFinite(point.x) &&
		Number.isFinite(point.y) &&
		point.x >= 0 &&
		point.x <= grid.widthPx &&
		point.y >= 0 &&
		point.y <= grid.heightPx
	);
}

function isWorldEdgeEndpoint(
	coordinate: number,
	maximum: number,
	step: number,
	boundaryT: number
): boolean {
	return (
		Math.abs(boundaryT - 1) <= 1e-12 &&
		((step > 0 && coordinate === maximum) || (step < 0 && coordinate === 0))
	);
}

function nextGridBoundaryT(
	coordinate: number,
	cell: number,
	step: number,
	cellSizePx: number,
	delta: number
): number {
	if (step === 0) return Number.POSITIVE_INFINITY;
	const boundary = (step > 0 ? cell + 1 : cell) * cellSizePx;
	return (boundary - coordinate) / delta;
}

function isGridCellBlocked(grid: NavigationGrid, row: number, column: number): boolean {
	if (column < 0 || row < 0 || column >= grid.widthCells || row >= grid.heightCells) return true;
	return isBlocked(grid.blockedBits, row * grid.widthCells + column);
}

function isGridPositionBlocked(grid: NavigationGrid, point: NavigationPoint): boolean {
	const column = worldCoordinateToCell(point.x, grid.widthPx, grid.cellSizePx, grid.widthCells);
	const row = worldCoordinateToCell(point.y, grid.heightPx, grid.cellSizePx, grid.heightCells);
	if (column < 0 || row < 0) return true;
	return isGridCellBlocked(grid, row, column);
}

function isSegmentBlockedByObstacle(
	obstacle: NavigationObstacle,
	from: NavigationPoint,
	to: NavigationPoint,
	radius: number
): boolean {
	if (obstacle.shape === 'circle') {
		return isMovementBlockedByCircle(from, to, obstacle.center, obstacle.radius + radius);
	}

	const rects =
		obstacle.shape === 'landmark' ? getLandmarkCollisionRects(obstacle) : [obstacle.bounds];
	return rects.some((rect) => {
		if (
			obstacle.shape === 'landmark' &&
			from.y >= obstacle.bounds.bottom &&
			to.y >= obstacle.bounds.bottom
		) {
			return false;
		}
		const escapeOrigin =
			obstacle.shape === 'rect' && obstacle.escapeOrigin
				? obstacle.escapeOrigin
				: getRectCenter(obstacle.bounds);
		return obstacle.shape === 'rect' && obstacle.movement === 'strict'
			? isMovementBlockedByStrictRect(from, to, rect, radius)
			: isMovementBlockedByEscapeAwareRect(from, to, rect, radius, escapeOrigin);
	});
}

function isPointBlockedByObstacle(
	obstacle: NavigationObstacle,
	point: NavigationPoint,
	radius: number
): boolean {
	if (obstacle.shape === 'circle') {
		const effectiveRadius = obstacle.radius + radius;
		return distanceSquared(point, obstacle.center) < effectiveRadius * effectiveRadius;
	}

	const rects =
		obstacle.shape === 'landmark' ? getLandmarkCollisionRects(obstacle) : [obstacle.bounds];
	return rects.some((rect) => isPointInsideRect(point, rect, radius));
}

export function getLandmarkCollisionRects(
	obstacle: Extract<NavigationObstacle, { shape: 'landmark' }>
): NavigationRect[] {
	const doorway = findLandmarkDoorway(
		obstacle.landmarkId,
		obstacle.bounds,
		obstacle.doorCandidates
	);
	if (!doorway) return [obstacle.bounds];

	const doorLeft = Math.max(obstacle.bounds.left, doorway.point.x - obstacle.doorwayWidthPx / 2);
	const doorRight = Math.min(obstacle.bounds.right, doorway.point.x + obstacle.doorwayWidthPx / 2);
	const doorTop = Math.max(obstacle.bounds.top, doorway.point.y - obstacle.transitionRadiusPx);

	return [
		{
			left: obstacle.bounds.left,
			right: obstacle.bounds.right,
			top: obstacle.bounds.top,
			bottom: doorTop
		},
		{
			left: obstacle.bounds.left,
			right: doorLeft,
			top: doorTop,
			bottom: obstacle.bounds.bottom
		},
		{
			left: doorRight,
			right: obstacle.bounds.right,
			top: doorTop,
			bottom: obstacle.bounds.bottom
		}
	].filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
}

function isMovementBlockedByStrictRect(
	from: NavigationPoint,
	to: NavigationPoint,
	rect: NavigationRect,
	radius: number
): boolean {
	const currentInside = isPointInsideRect(from, rect, radius);
	const targetInside = isPointInsideRect(to, rect, radius);
	if (currentInside) return targetInside;
	return doesSegmentIntersectRect(from, to, rect, radius);
}

function isMovementBlockedByEscapeAwareRect(
	from: NavigationPoint,
	to: NavigationPoint,
	rect: NavigationRect,
	radius: number,
	escapeOrigin: NavigationPoint
): boolean {
	const currentInside = isPointInsideRect(from, rect, radius);
	const targetInside = isPointInsideRect(to, rect, radius);
	if (currentInside) {
		return targetInside && distanceSquared(to, escapeOrigin) <= distanceSquared(from, escapeOrigin);
	}
	return doesSegmentIntersectRect(from, to, rect, radius);
}

function isMovementBlockedByCircle(
	from: NavigationPoint,
	to: NavigationPoint,
	center: NavigationPoint,
	radius: number
): boolean {
	const currentDistance = distanceSquared(from, center);
	if (currentDistance < radius * radius) {
		return distanceSquared(to, center) <= currentDistance;
	}
	return doesSegmentIntersectCircle(from, to, center, radius);
}

function doesSegmentIntersectRect(
	from: NavigationPoint,
	to: NavigationPoint,
	rect: NavigationRect,
	padding: number
): boolean {
	const left = rect.left - padding;
	const right = rect.right + padding;
	const top = rect.top - padding;
	const bottom = rect.bottom + padding;
	const deltaX = to.x - from.x;
	const deltaY = to.y - from.y;
	let entry = 0;
	let exit = 1;

	if (deltaX === 0) {
		if (from.x < left || from.x > right) return false;
	} else {
		const axisEntry = Math.min((left - from.x) / deltaX, (right - from.x) / deltaX);
		const axisExit = Math.max((left - from.x) / deltaX, (right - from.x) / deltaX);
		entry = Math.max(entry, axisEntry);
		exit = Math.min(exit, axisExit);
	}

	if (deltaY === 0) {
		if (from.y < top || from.y > bottom) return false;
	} else {
		const axisEntry = Math.min((top - from.y) / deltaY, (bottom - from.y) / deltaY);
		const axisExit = Math.max((top - from.y) / deltaY, (bottom - from.y) / deltaY);
		entry = Math.max(entry, axisEntry);
		exit = Math.min(exit, axisExit);
	}

	return entry <= exit && exit >= 0 && entry <= 1;
}

function doesSegmentIntersectCircle(
	from: NavigationPoint,
	to: NavigationPoint,
	center: NavigationPoint,
	radius: number
): boolean {
	const segmentX = to.x - from.x;
	const segmentY = to.y - from.y;
	const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
	if (segmentLengthSquared === 0) return distanceSquared(from, center) < radius * radius;

	const centerOffsetX = center.x - from.x;
	const centerOffsetY = center.y - from.y;
	const closestPointRatio = Math.min(
		Math.max((centerOffsetX * segmentX + centerOffsetY * segmentY) / segmentLengthSquared, 0),
		1
	);
	const closestPoint = {
		x: from.x + segmentX * closestPointRatio,
		y: from.y + segmentY * closestPointRatio
	};
	return distanceSquared(closestPoint, center) < radius * radius;
}

function distanceSquared(first: NavigationPoint, second: NavigationPoint): number {
	const deltaX = first.x - second.x;
	const deltaY = first.y - second.y;
	return deltaX * deltaX + deltaY * deltaY;
}

function getRectCenter(rect: NavigationRect): NavigationPoint {
	return {
		x: (rect.left + rect.right) / 2,
		y: (rect.top + rect.bottom) / 2
	};
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

function getCandidateCellRange(
	blockedCellIndex: number,
	cellSizePx: number,
	clearancePx: number,
	cellCount: number
): { min: number; max: number } {
	const left = blockedCellIndex * cellSizePx;
	const min = Math.max(0, Math.ceil((left - clearancePx) / cellSizePx - 0.5));
	const max = Math.min(
		cellCount - 1,
		Math.floor((left + cellSizePx + clearancePx) / cellSizePx - 0.5)
	);
	return { min, max };
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
