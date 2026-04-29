import { meadowEntryMap } from '$lib/game/content/maps';
import { startingPlayer } from '$lib/game/content/player';
import { getXpForLevel } from '$lib/game/core/progression';
import type { Direction } from '$lib/game/core/types';

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
		facing: Direction;
	};
	flags: {
		clearedEncounters: string[];
	};
	consumables: {
		heals: number;
	};
};

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];
const STARTING_POSITION = { x: 64, y: 64 };
const DEFAULT_HEAL_CHARGES = 1;

export function createNewSaveState(): SaveState {
	return {
		version: 1,
		mapId: meadowEntryMap.id,
		player: {
			level: 1,
			xp: getXpForLevel(1),
			hp: startingPlayer.baseHp,
			attack: startingPlayer.baseAttack,
			x: STARTING_POSITION.x,
			y: STARTING_POSITION.y,
			facing: meadowEntryMap.spawnDirection
		},
		flags: { clearedEncounters: [] },
		consumables: { heals: DEFAULT_HEAL_CHARGES }
	};
}

export function serializeSaveState(saveState: SaveState): string {
	return JSON.stringify(saveState);
}

export function parseSaveState(value: string): SaveState | null {
	try {
		const parsed: unknown = JSON.parse(value);
		const normalized = normalizeSaveState(parsed);
		return normalized && isSaveState(normalized) ? normalized : null;
	} catch {
		return null;
	}
}

function isSaveState(value: unknown): value is SaveState {
	if (!isRecord(value)) {
		return false;
	}

	const { version, mapId, player, flags, consumables } = value;

	if (
		version !== 1 ||
		typeof mapId !== 'string' ||
		!isRecord(player) ||
		!isRecord(flags) ||
		!isRecord(consumables)
	) {
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
		flags.clearedEncounters.every((entry) => typeof entry === 'string') &&
		isNumber(consumables.heals)
	);
}

function normalizeSaveState(value: unknown): unknown {
	if (!isRecord(value) || 'consumables' in value) {
		return value;
	}

	return {
		...value,
		consumables: { heals: DEFAULT_HEAL_CHARGES }
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function isFacingDirection(value: unknown): value is Direction {
	return typeof value === 'string' && DIRECTIONS.includes(value as Direction);
}
