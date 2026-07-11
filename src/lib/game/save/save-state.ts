import { equipmentSlots, getItem } from '$lib/game/content/items';
import { maps, meadowEntryMap } from '$lib/game/content/maps';
import type { WorldMapDefinition } from '$lib/game/content/maps/types';
import { startingPlayer } from '$lib/game/content/player';
import { getShop } from '$lib/game/content/shops';
import { createEmptyEquipment, type EquipmentState } from '$lib/game/core/equipment';
import type { InventoryState } from '$lib/game/core/inventory';
import type { ItemDrop } from '$lib/game/core/loot';
import {
	cloneMapExploration,
	createEmptyMapExploration,
	isCellKey,
	type MapExplorationState
} from '$lib/game/core/map-exploration';
import { getXpForLevel } from '$lib/game/core/progression';
import {
	createInitialQuestState,
	type QuestEntryState,
	type QuestState
} from '$lib/game/core/quests';
import {
	createInitialShopStockState,
	type ShopStockState,
	type WalletState
} from '$lib/game/core/shop';
import type { Direction } from '$lib/game/core/types';
import { getQuest, isQuestId, mainQuestId, type QuestDefinition } from '$lib/game/content/quests';

export type SaveState = {
	version: 7;
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
		clearedEncounterUnitCounts: Record<string, number>;
		collectedPickups: string[];
		resolvedEncounterDrops: Record<string, ItemDrop[]>;
	};
	inventory: InventoryState;
	equipment: EquipmentState;
	wallet: WalletState;
	shops: {
		stock: ShopStockState;
	};
	quests: QuestState;
	mapExploration: MapExplorationState;
	seenDiscoveries: string[];
};

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];
const NORMALIZE_TILE_SIZE = 32;
// Mirrors WorldScene.playerRadius — strict-rect collision (blockers, fences,
// decor) expands every rect by this radius before testing containment, so a
// tile center outside the raw rect but inside the padded rect still traps the
// player. Normalization must test against the same padded bounds.
const NORMALIZE_PLAYER_RADIUS = 12;

export function createNewSaveState(): SaveState {
	return {
		version: 7,
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
		flags: {
			clearedEncounters: [],
			clearedEncounterUnitCounts: {},
			collectedPickups: [],
			resolvedEncounterDrops: {}
		},
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
		},
		quests: createInitialQuestState(),
		mapExploration: createEmptyMapExploration(),
		seenDiscoveries: []
	};
}

export function serializeSaveState(saveState: SaveState): string {
	return JSON.stringify(saveState);
}

export function parseSaveState(value: string): SaveState | null {
	try {
		const parsed: unknown = JSON.parse(value);
		const migrated = migrateSaveState(parsed);

		if (!isSaveState(migrated)) {
			return null;
		}

		return {
			...migrated,
			player: normalizePlayerPosition(migrated.mapId, migrated.player),
			mapExploration: cloneMapExploration(migrated.mapExploration)
		};
	} catch {
		return null;
	}
}

function migrateSaveState(value: unknown): unknown {
	let migrated = migrateV5ToV6(value);
	migrated = migrateV6ToV7(migrated);
	return migrated;
}

function migrateV5ToV6(value: unknown): unknown {
	if (!isRecord(value) || value.version !== 5) {
		return value;
	}

	const flags = isRecord(value.flags) ? value.flags : {};

	return {
		...value,
		version: 6,
		flags: {
			...flags,
			clearedEncounters: Array.isArray(flags.clearedEncounters) ? flags.clearedEncounters : [],
			clearedEncounterUnitCounts: isRecord(flags.clearedEncounterUnitCounts)
				? flags.clearedEncounterUnitCounts
				: {},
			collectedPickups: Array.isArray(flags.collectedPickups) ? flags.collectedPickups : [],
			resolvedEncounterDrops:
				isRecord(flags.resolvedEncounterDrops) && !Array.isArray(flags.resolvedEncounterDrops)
					? flags.resolvedEncounterDrops
					: {}
		}
	};
}

function migrateV6ToV7(value: unknown): unknown {
	if (!isRecord(value) || value.version !== 6) {
		return value;
	}

	return {
		...value,
		version: 7,
		seenDiscoveries: Array.isArray(value.seenDiscoveries) ? value.seenDiscoveries : []
	};
}

function isSaveState(value: unknown): value is SaveState {
	if (!isRecord(value)) {
		return false;
	}

	const {
		version,
		mapId,
		player,
		flags,
		inventory,
		equipment,
		wallet,
		shops,
		quests,
		mapExploration,
		seenDiscoveries
	} = value;

	// Version, SAVE_STORAGE_KEY, and isSaveState must all move in lockstep on every schema
	// change. Bumping version without updating isSaveState lets old-shape payloads pass
	// validation; bumping SAVE_STORAGE_KEY without migration orphans existing saves.
	if (
		version !== 7 ||
		typeof mapId !== 'string' ||
		!isRecord(player) ||
		!isRecord(flags) ||
		!isInventoryState(inventory) ||
		!isEquipmentState(equipment, inventory) ||
		!isWalletState(wallet) ||
		!isShopsState(shops) ||
		!isQuestState(quests) ||
		!isMapExplorationState(mapExploration)
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
		isClearedEncounterUnitCounts(flags.clearedEncounterUnitCounts) &&
		Array.isArray(flags.collectedPickups) &&
		flags.collectedPickups.every((entry) => typeof entry === 'string') &&
		isResolvedDrops(flags.resolvedEncounterDrops) &&
		Array.isArray(seenDiscoveries) &&
		seenDiscoveries.every((entry) => typeof entry === 'string')
	);
}

function isMapExplorationState(value: unknown): value is MapExplorationState {
	return (
		isRecord(value) &&
		!Array.isArray(value) &&
		Object.values(value).every(
			(cells) =>
				Array.isArray(cells) && cells.every((cell) => typeof cell === 'string' && isCellKey(cell))
		)
	);
}

function isWalletState(value: unknown): value is WalletState {
	return (
		isRecord(value) && isNumber(value.coins) && Number.isInteger(value.coins) && value.coins >= 0
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

function isQuestState(value: unknown): value is QuestState {
	if (
		!isRecord(value) ||
		Array.isArray(value) ||
		!isRecord(value.entries) ||
		Array.isArray(value.entries) ||
		!isRecord(value.completedObjectives) ||
		Array.isArray(value.completedObjectives) ||
		!Object.prototype.hasOwnProperty.call(value.entries, mainQuestId)
	) {
		return false;
	}

	return (
		Object.entries(value.entries).every(([questId, entry]) => {
			const quest = getQuest(questId);
			return quest !== undefined && isQuestEntryState(entry, quest);
		}) &&
		Object.entries(value.completedObjectives).every(([questId, objectiveIds]) => {
			const quest = isQuestId(questId) ? getQuest(questId) : undefined;
			return (
				quest !== undefined &&
				Array.isArray(objectiveIds) &&
				objectiveIds.every(
					(objectiveId) =>
						typeof objectiveId === 'string' &&
						quest.objectives.some((objective) => objective.id === objectiveId)
				)
			);
		})
	);
}

function isQuestEntryState(value: unknown, quest: QuestDefinition): value is QuestEntryState {
	if (!isRecord(value) || Array.isArray(value)) {
		return false;
	}

	const objective =
		typeof value.currentObjectiveId === 'string'
			? quest.objectives.find((candidate) => candidate.id === value.currentObjectiveId)
			: undefined;

	return (
		(value.status === 'active' || value.status === 'completed') &&
		objective !== undefined &&
		isNumber(value.progress) &&
		Number.isInteger(value.progress) &&
		value.progress >= 0 &&
		value.progress <= objective.target &&
		typeof value.rewardApplied === 'boolean' &&
		Array.isArray(value.countedSourceIds) &&
		value.countedSourceIds.every((sourceId) => typeof sourceId === 'string')
	);
}

function normalizePlayerPosition(mapId: string, player: SaveState['player']): SaveState['player'] {
	const map = maps[mapId];

	if (!map) {
		return player;
	}

	const x = clamp(player.x, 0, map.width * 32);
	const y = clamp(player.y, 0, map.height * 32);

	// After bounds clamping, check if the position is inside any strict-rect
	// collision (blockers, fences, decor collision). These use
	// isMovementBlockedByStrictRect in WorldScene, which traps the player —
	// every small step keeps the target inside the padded rect, so no movement
	// is possible. Nudge to the nearest walkable tile center to prevent
	// soft-locks after map layout changes (e.g. the layered village refactor).
	// Landmarks and interior props are excluded because their collision is
	// escape-aware (allows moving outward from inside).
	const collisionRects = collectStrictCollisionRects(map);
	if (!isInsideAnyCollisionRect(x, y, collisionRects, NORMALIZE_PLAYER_RADIUS)) {
		return { ...player, x, y };
	}

	const nearest = findNearestWalkableTile(
		x,
		y,
		map.width,
		map.height,
		collisionRects,
		NORMALIZE_PLAYER_RADIUS
	);
	if (nearest) {
		return { ...player, x: nearest.x, y: nearest.y };
	}

	// Fallback: map spawn (guaranteed walkable by map validation tests)
	return { ...player, x: map.spawn.x, y: map.spawn.y };
}

interface CollisionRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export function collectStrictCollisionRects(map: WorldMapDefinition): CollisionRect[] {
	const rects: CollisionRect[] = [];
	for (const blocker of map.blockers ?? []) {
		rects.push(blocker);
	}
	for (const fence of map.fences ?? []) {
		rects.push(fence);
	}
	for (const decor of map.mapDecor ?? []) {
		if (decor.collision) {
			rects.push(decor.collision);
		}
	}
	return rects;
}

export function isInsideAnyCollisionRect(
	x: number,
	y: number,
	rects: CollisionRect[],
	padding: number
): boolean {
	return rects.some((rect) => isInsideCollisionRect(x, y, rect, padding));
}

export function isInsideCollisionRect(
	x: number,
	y: number,
	rect: CollisionRect,
	padding: number
): boolean {
	return (
		x >= rect.x - rect.width / 2 - padding &&
		x <= rect.x + rect.width / 2 + padding &&
		y >= rect.y - rect.height / 2 - padding &&
		y <= rect.y + rect.height / 2 + padding
	);
}

/**
 * Searches outward from the tile containing (x, y) for the nearest tile
 * whose center is not inside any padded collision rect. Used by
 * {@link normalizePlayerPosition} to rescue saves that land inside a
 * wall, fence, or decor collision rect.
 *
 * @param x - World-space x coordinate of the position to search from.
 * @param y - World-space y coordinate of the position to search from.
 * @param mapWidth - Map width in tiles; bounds the search horizontally.
 * @param mapHeight - Map height in tiles; bounds the search vertically.
 * @param rects - Strict collision rects (blockers, fences, decor) to avoid.
 * @param padding - Pixels to expand each rect by when testing containment
 *   (matches the player radius so padded-trapped positions are rejected).
 * @returns The world-space center of the nearest walkable tile, or `null`
 *   if every tile on the map is inside a padded collision rect.
 */
function findNearestWalkableTile(
	x: number,
	y: number,
	mapWidth: number,
	mapHeight: number,
	rects: CollisionRect[],
	padding: number
): { x: number; y: number } | null {
	const startCol = Math.floor(x / NORMALIZE_TILE_SIZE);
	const startRow = Math.floor(y / NORMALIZE_TILE_SIZE);
	const maxRadius = Math.max(mapWidth, mapHeight);

	for (let radius = 0; radius <= maxRadius; radius++) {
		const minCol = Math.max(0, startCol - radius);
		const maxCol = Math.min(mapWidth - 1, startCol + radius);
		const minRow = Math.max(0, startRow - radius);
		const maxRow = Math.min(mapHeight - 1, startRow + radius);

		for (let row = minRow; row <= maxRow; row++) {
			for (let col = minCol; col <= maxCol; col++) {
				if (Math.max(Math.abs(col - startCol), Math.abs(row - startRow)) !== radius) {
					continue;
				}
				const tileCenterX = col * NORMALIZE_TILE_SIZE + NORMALIZE_TILE_SIZE / 2;
				const tileCenterY = row * NORMALIZE_TILE_SIZE + NORMALIZE_TILE_SIZE / 2;
				if (!isInsideAnyCollisionRect(tileCenterX, tileCenterY, rects, padding)) {
					return { x: tileCenterX, y: tileCenterY };
				}
			}
		}
	}

	return null;
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
		) && value.equipment.every((itemId) => typeof itemId === 'string' && isEquipmentItemId(itemId))
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

function isClearedEncounterUnitCounts(value: unknown): value is Record<string, number> {
	if (!isRecord(value) || Array.isArray(value)) {
		return false;
	}

	return Object.values(value).every(
		(count) => typeof count === 'number' && Number.isInteger(count) && count >= 1
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
