import { maps, meadowEntryMap } from '$lib/game/content/maps';
import { startingPlayer } from '$lib/game/content/player';
import { createEmptyEquipment, type EquipmentState } from '$lib/game/core/equipment';
import type { InventoryState } from '$lib/game/core/inventory';
import type { ItemDrop } from '$lib/game/core/loot';
import { getXpForLevel } from '$lib/game/core/progression';
import type { Direction } from '$lib/game/core/types';

export type SaveState = {
	version: 2;
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
		collectedPickups: string[];
		resolvedEncounterDrops: Record<string, ItemDrop[]>;
	};
	inventory: InventoryState;
	equipment: EquipmentState;
};

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

export function createNewSaveState(): SaveState {
	return {
		version: 2,
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
		flags: { clearedEncounters: [], collectedPickups: [], resolvedEncounterDrops: {} },
		inventory: {
			stacks: [{ itemId: 'field-potion', quantity: 1 }],
			equipment: ['training-sword']
		},
		equipment: {
			...createEmptyEquipment(),
			weapon: 'training-sword'
		}
	};
}

export function serializeSaveState(saveState: SaveState): string {
	return JSON.stringify(saveState);
}

export function parseSaveState(value: string): SaveState | null {
	try {
		const parsed: unknown = JSON.parse(value);

		if (!isSaveState(parsed)) {
			return null;
		}

		return {
			...parsed,
			player: normalizePlayerPosition(parsed.mapId, parsed.player)
		};
	} catch {
		return null;
	}
}

function isSaveState(value: unknown): value is SaveState {
	if (!isRecord(value)) {
		return false;
	}

	const { version, mapId, player, flags, inventory, equipment } = value;

	if (
		version !== 2 ||
		typeof mapId !== 'string' ||
		!isRecord(player) ||
		!isRecord(flags) ||
		!isInventoryState(inventory) ||
		!isEquipmentState(equipment)
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
		Array.isArray(flags.collectedPickups) &&
		flags.collectedPickups.every((entry) => typeof entry === 'string') &&
		isResolvedDrops(flags.resolvedEncounterDrops)
	);
}

function normalizePlayerPosition(mapId: string, player: SaveState['player']): SaveState['player'] {
	const map = maps[mapId];

	if (!map) {
		return player;
	}

	const x = clamp(player.x, 0, map.width * 32);
	const y = clamp(player.y, 0, map.height * 32);

	return { ...player, x, y };
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function isInventoryState(value: unknown): value is InventoryState {
	if (!isRecord(value) || !Array.isArray(value.stacks) || !Array.isArray(value.equipment)) {
		return false;
	}

	return (
		value.stacks.every(
			(stack) =>
				isRecord(stack) &&
				typeof stack.itemId === 'string' &&
				isPositiveIntegerQuantity(stack.quantity)
		) && value.equipment.every((itemId) => typeof itemId === 'string')
	);
}

function isEquipmentState(value: unknown): value is EquipmentState {
	if (!isRecord(value)) {
		return false;
	}

	return ['weapon', 'head', 'body', 'hands', 'accessory'].every(
		(slot) => value[slot] === null || typeof value[slot] === 'string'
	);
}

function isResolvedDrops(value: unknown): value is Record<string, ItemDrop[]> {
	if (!isRecord(value) || Array.isArray(value)) {
		return false;
	}

	return Object.values(value).every(
		(drops) =>
			Array.isArray(drops) &&
			drops.every(
				(drop) =>
					isRecord(drop) &&
					typeof drop.itemId === 'string' &&
					isPositiveIntegerQuantity(drop.quantity)
			)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveIntegerQuantity(value: unknown): value is number {
	return isNumber(value) && Number.isInteger(value) && value >= 1;
}

function isFacingDirection(value: unknown): value is Direction {
	return typeof value === 'string' && DIRECTIONS.includes(value as Direction);
}
