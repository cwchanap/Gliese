export type FacingDirection = 'up' | 'down' | 'left' | 'right';

export type SaveState = {
	version: 1;
	mapId: string;
	player: {
		level: number;
		xp: number;
		hp: number;
		attack: number;
		x: number;
		y: number;
		facing: FacingDirection;
	};
	flags: {
		clearedEncounters: string[];
	};
};

const FACING_DIRECTIONS: FacingDirection[] = ['up', 'down', 'left', 'right'];

export function createNewSaveState(): SaveState {
	return {
		version: 1,
		mapId: 'meadow-entry',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 64, y: 64, facing: 'down' },
		flags: { clearedEncounters: [] }
	};
}

export function serializeSaveState(saveState: SaveState): string {
	return JSON.stringify(saveState);
}

export function parseSaveState(value: string): SaveState | null {
	try {
		const parsed: unknown = JSON.parse(value);
		return isSaveState(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function isSaveState(value: unknown): value is SaveState {
	if (!isRecord(value)) {
		return false;
	}

	const { version, mapId, player, flags } = value;

	if (version !== 1 || typeof mapId !== 'string' || !isRecord(player) || !isRecord(flags)) {
		return false;
	}

	return (
		isNumber(player.level) &&
		isNumber(player.xp) &&
		isNumber(player.hp) &&
		isNumber(player.attack) &&
		isNumber(player.x) &&
		isNumber(player.y) &&
		isFacingDirection(player.facing) &&
		Array.isArray(flags.clearedEncounters) &&
		flags.clearedEncounters.every((entry) => typeof entry === 'string')
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function isFacingDirection(value: unknown): value is FacingDirection {
	return typeof value === 'string' && FACING_DIRECTIONS.includes(value as FacingDirection);
}
