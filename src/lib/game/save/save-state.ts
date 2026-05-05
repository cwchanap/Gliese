import { equipmentSlots, getItem } from '$lib/game/content/items';
import { maps, meadowEntryMap } from '$lib/game/content/maps';
import { startingPlayer } from '$lib/game/content/player';
import { getShop } from '$lib/game/content/shops';
import { createEmptyEquipment, type EquipmentState } from '$lib/game/core/equipment';
import type { InventoryState } from '$lib/game/core/inventory';
import type { ItemDrop } from '$lib/game/core/loot';
import { getXpForLevel } from '$lib/game/core/progression';
import {
	createInitialShopStockState,
	type ShopStockState,
	type WalletState
} from '$lib/game/core/shop';
import type { Direction } from '$lib/game/core/types';

export type SaveState = {
	version: 3;
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
	wallet: WalletState;
	shops: {
		stock: ShopStockState;
	};
};

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

export function createNewSaveState(): SaveState {
	return {
		version: 3,
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
		},
		wallet: { coins: 30 },
		shops: {
			stock: createInitialShopStockState()
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

	const { version, mapId, player, flags, inventory, equipment, wallet, shops } = value;

	if (
		version !== 3 ||
		typeof mapId !== 'string' ||
		!isRecord(player) ||
		!isRecord(flags) ||
		!isInventoryState(inventory) ||
		!isEquipmentState(equipment, inventory) ||
		!isWalletState(wallet) ||
		!isShopsState(shops)
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

function isWalletState(value: unknown): value is WalletState {
	return (
		isRecord(value) &&
		isNumber(value.coins) &&
		Number.isInteger(value.coins) &&
		value.coins >= 0
	);
}

function isShopsState(value: unknown): value is SaveState['shops'] {
	return isRecord(value) && isShopStockState(value.stock);
}

function isShopStockState(value: unknown): value is ShopStockState {
	if (!isRecord(value) || Array.isArray(value)) {
		return false;
	}

	const expectedStockState = createInitialShopStockState();
	const expectedShopIds = Object.keys(expectedStockState);

	if (!hasExactKeys(value, expectedShopIds)) {
		return false;
	}

	return expectedShopIds.every((shopId) => {
		const shop = getShop(shopId);
		const stockById = value[shopId];
		const expectedStockById = expectedStockState[shopId];

		if (
			!shop ||
			!expectedStockById ||
			!isRecord(stockById) ||
			Array.isArray(stockById) ||
			!hasExactKeys(stockById, Object.keys(expectedStockById))
		) {
			return false;
		}

		return Object.entries(stockById).every(([stockId, quantity]) => {
			const stock = shop.stock.find((entry) => entry.id === stockId);

			return (
				stock?.availability.mode === 'finite' &&
				isNumber(quantity) &&
				Number.isInteger(quantity) &&
				quantity >= 0 &&
				quantity <= stock.availability.quantity
			);
		});
	});
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
				isStackableItemId(stack.itemId) &&
				isPositiveIntegerQuantity(stack.quantity)
		) &&
		value.equipment.every((itemId) => typeof itemId === 'string' && isEquipmentItemId(itemId))
	);
}

function isEquipmentState(value: unknown, inventory: InventoryState): value is EquipmentState {
	if (!isRecord(value)) {
		return false;
	}

	const keys = Object.keys(value);

	if (
		keys.length !== equipmentSlots.length ||
		!keys.every((slot) => equipmentSlots.includes(slot as (typeof equipmentSlots)[number]))
	) {
		return false;
	}

	return equipmentSlots.every((slot) => {
		const itemId = value[slot];

		if (itemId === null) {
			return true;
		}

		const item = typeof itemId === 'string' ? getItem(itemId) : undefined;

		return (
			item?.type === 'equipment' &&
			item.slot === slot &&
			inventory.equipment.includes(itemId as string)
		);
	});
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
					getItem(drop.itemId) !== undefined &&
					isPositiveIntegerQuantity(drop.quantity)
			)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: string[]): boolean {
	const keys = Object.keys(value);

	return (
		keys.length === expectedKeys.length &&
		expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
	);
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

function isStackableItemId(itemId: string): boolean {
	return getItem(itemId)?.stackable === true;
}

function isEquipmentItemId(itemId: string): boolean {
	return getItem(itemId)?.type === 'equipment';
}
