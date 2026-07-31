export const AREA_MAP_CELL_SIZE = 128;
export const AREA_MAP_REVEAL_RADIUS = 320;

export type MapExplorationState = Record<string, string[]>;

export type MapExplorationCell = {
	column: number;
	row: number;
};

export type RevealMapAreaInput = {
	exploration: MapExplorationState;
	mapId: string;
	x: number;
	y: number;
	mapWidth: number;
	mapHeight: number;
	cellSize?: number;
	radius?: number;
};

export function createEmptyMapExploration(): MapExplorationState {
	return {};
}

export function cloneMapExploration(exploration: MapExplorationState): MapExplorationState {
	return Object.fromEntries(
		Object.entries(exploration).map(([mapId, cells]) => [mapId, [...cells]])
	);
}

export function getCellKey(column: number, row: number): string {
	return `${column},${row}`;
}

export function isCellKey(value: string): boolean {
	return /^\d+,\d+$/.test(value);
}

export function parseCellKey(key: string): MapExplorationCell {
	if (!isCellKey(key)) {
		return { column: 0, row: 0 };
	}

	const [column = 0, row = 0] = key.split(',').map(Number);
	return { column, row };
}

export function getCellKeyForWorldPosition({
	x,
	y,
	cellSize = AREA_MAP_CELL_SIZE
}: {
	x: number;
	y: number;
	cellSize?: number;
}): string {
	return getCellKey(Math.floor(x / cellSize), Math.floor(y / cellSize));
}

export function revealCellsAroundPoint({
	x,
	y,
	mapWidth,
	mapHeight,
	cellSize = AREA_MAP_CELL_SIZE,
	radius = AREA_MAP_REVEAL_RADIUS
}: {
	x: number;
	y: number;
	mapWidth: number;
	mapHeight: number;
	cellSize?: number;
	radius?: number;
}): string[] {
	if (mapWidth <= 0 || mapHeight <= 0 || cellSize <= 0) {
		return [];
	}

	const maxColumn = Math.max(0, Math.ceil(mapWidth / cellSize) - 1);
	const maxRow = Math.max(0, Math.ceil(mapHeight / cellSize) - 1);
	const minColumn = Math.max(0, Math.floor((x - radius) / cellSize));
	const maxRevealColumn = Math.min(maxColumn, Math.floor((x + radius) / cellSize));
	const minRow = Math.max(0, Math.floor((y - radius) / cellSize));
	const maxRevealRow = Math.min(maxRow, Math.floor((y + radius) / cellSize));
	const cells: string[] = [];

	for (let row = minRow; row <= maxRevealRow; row += 1) {
		for (let column = minColumn; column <= maxRevealColumn; column += 1) {
			const centerX = column * cellSize + cellSize / 2;
			const centerY = row * cellSize + cellSize / 2;
			if (Math.hypot(centerX - x, centerY - y) <= radius) {
				cells.push(getCellKey(column, row));
			}
		}
	}

	return sortCellKeys(cells);
}

export function mergeRevealedCells(existing: string[], incoming: string[]) {
	const merged = normalizeCellKeys([...existing, ...incoming]);

	return {
		cells: merged,
		changed: !areCellKeysEqual(merged, existing)
	};
}

export function revealMapArea(input: RevealMapAreaInput) {
	const revealed = revealCellsAroundPoint(input);
	const current = input.exploration[input.mapId] ?? [];
	const merged = mergeRevealedCells(current, revealed);

	if (!merged.changed) {
		return { exploration: input.exploration, changed: false, revealedCells: current };
	}

	return {
		exploration: { ...input.exploration, [input.mapId]: merged.cells },
		changed: true,
		revealedCells: merged.cells
	};
}

export function isWorldPositionRevealed({
	revealed,
	x,
	y,
	cellSize = AREA_MAP_CELL_SIZE
}: {
	revealed: string[];
	x: number;
	y: number;
	cellSize?: number;
}): boolean {
	return revealed.includes(getCellKeyForWorldPosition({ x, y, cellSize }));
}

function sortCellKeys(cells: string[]): string[] {
	return [...cells].sort((left, right) => {
		const { column: leftColumn, row: leftRow } = parseCellKey(left);
		const { column: rightColumn, row: rightRow } = parseCellKey(right);
		return leftRow - rightRow || leftColumn - rightColumn;
	});
}

function normalizeCellKeys(cells: string[]): string[] {
	return sortCellKeys([...new Set(cells.filter(isCellKey))]);
}

function areCellKeysEqual(left: string[], right: string[]): boolean {
	return left.length === right.length && left.every((cell, index) => cell === right[index]);
}
