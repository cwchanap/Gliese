import { maps, meadowEntryMap, type WorldMapDefinition } from '$lib/game/content/maps';
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
const DEFAULT_HEAL_CHARGES = 1;

type LegacyPositionAnchor = {
	legacy: { x: number; y: number };
	current: { x: number; y: number };
};

const LEGACY_ROOM_BOUNDS: Record<string, { width: number; height: number }> = {
	'meadow-entry': { width: 20 * 32, height: 12 * 32 },
	'ruins-threshold': { width: 16 * 32, height: 10 * 32 },
	'ruins-core': { width: 18 * 32, height: 10 * 32 }
};

const LEGACY_POSITION_ANCHORS: Record<string, LegacyPositionAnchor[]> = {
	'meadow-entry': [
		{ legacy: { x: 64, y: 64 }, current: meadowEntryMap.spawn },
		{ legacy: { x: 304, y: 96 }, current: meadowEntryMap.encounter ?? meadowEntryMap.spawn },
		{ legacy: { x: 352, y: 96 }, current: meadowEntryMap.transitions[0] ?? meadowEntryMap.spawn }
	],
	'ruins-threshold': [
		{ legacy: { x: 48, y: 96 }, current: maps['ruins-threshold'].spawn },
		{
			legacy: { x: 16, y: 96 },
			current: maps['ruins-threshold'].transitions[0] ?? maps['ruins-threshold'].spawn
		},
		{
			legacy: { x: 464, y: 96 },
			current: maps['ruins-threshold'].transitions[1] ?? maps['ruins-threshold'].spawn
		}
	],
	'ruins-core': [
		{ legacy: { x: 48, y: 96 }, current: maps['ruins-core'].spawn },
		{
			legacy: { x: 16, y: 96 },
			current: maps['ruins-core'].transitions[0] ?? maps['ruins-core'].spawn
		},
		{ legacy: { x: 304, y: 96 }, current: maps['ruins-core'].encounter ?? maps['ruins-core'].spawn }
	]
};

export function createNewSaveState(): SaveState {
	return {
		version: 1,
		mapId: meadowEntryMap.id,
		player: {
			level: 1,
			xp: getXpForLevel(1),
			hp: startingPlayer.baseHp,
			attack: startingPlayer.baseAttack,
			x: meadowEntryMap.spawn.x,
			y: meadowEntryMap.spawn.y,
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
	if (!isRecord(value)) {
		return value;
	}

	const withConsumables =
		'consumables' in value
			? value
			: {
					...value,
					consumables: { heals: DEFAULT_HEAL_CHARGES }
				};

	if (!isSaveStateShape(withConsumables)) {
		return withConsumables;
	}

	return {
		...withConsumables,
		player: normalizePlayerPosition(withConsumables.mapId, withConsumables.player)
	};
}

function isSaveStateShape(value: unknown): value is SaveState {
	return isSaveState(value);
}

function normalizePlayerPosition(mapId: string, player: SaveState['player']): SaveState['player'] {
	const map = maps[mapId];

	if (!map) {
		return player;
	}

	const migratedPosition = migrateLegacyPosition(map, player);
	const x = clamp(migratedPosition.x, 0, map.width * 32);
	const y = clamp(migratedPosition.y, 0, map.height * 32);

	return { ...player, x, y };
}

function migrateLegacyPosition(
	map: WorldMapDefinition,
	player: SaveState['player']
): { x: number; y: number } {
	const bounds = LEGACY_ROOM_BOUNDS[map.id];
	const anchors = LEGACY_POSITION_ANCHORS[map.id];

	if (
		!bounds ||
		!anchors ||
		player.x < 0 ||
		player.y < 0 ||
		player.x > bounds.width ||
		player.y > bounds.height
	) {
		return player;
	}

	return findNearestAnchor({ x: player.x, y: player.y }, anchors).current;
}

function findNearestAnchor(
	position: { x: number; y: number },
	anchors: LegacyPositionAnchor[]
): LegacyPositionAnchor {
	return anchors.reduce((nearest, anchor) =>
		getDistanceSquared(position, anchor.legacy) < getDistanceSquared(position, nearest.legacy)
			? anchor
			: nearest
	);
}

function getDistanceSquared(a: { x: number; y: number }, b: { x: number; y: number }): number {
	return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
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
