import { describe, expect, it } from 'vitest';

import { meadowEntryMap } from '$lib/game/content/maps';
import { startingPlayer } from '$lib/game/content/player';
import { getXpForLevel } from '$lib/game/core/progression';
import { createNewSaveState, parseSaveState, serializeSaveState } from '$lib/game/save/save-state';
import {
	SAVE_STORAGE_KEY,
	clearStoredSaveState,
	loadStoredSaveState,
	storeSaveState
} from '$lib/game/save/storage';

class MemoryStorage implements Storage {
	#store = new Map<string, string>();

	get length() {
		return this.#store.size;
	}

	clear() {
		this.#store.clear();
	}

	getItem(key: string) {
		return this.#store.get(key) ?? null;
	}

	key(index: number) {
		return [...this.#store.keys()][index] ?? null;
	}

	removeItem(key: string) {
		this.#store.delete(key);
	}

	setItem(key: string, value: string) {
		this.#store.set(key, value);
	}
}

describe('save state', () => {
	it('creates a level 1 starting save', () => {
		expect(createNewSaveState()).toEqual({
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
				weapon: 'training-sword',
				head: null,
				body: null,
				hands: null,
				accessory: null
			}
		});
	});

	it('round-trips a valid save payload', () => {
		const encoded = serializeSaveState(createNewSaveState());
		expect(parseSaveState(encoded)?.mapId).toBe('meadow-entry');
	});

	it('rejects legacy v1 save payloads instead of migrating them', () => {
		const legacySave = {
			...createNewSaveState(),
			version: 1,
			flags: { clearedEncounters: [] },
			consumables: { heals: 1 }
		};

		expect(parseSaveState(JSON.stringify(legacySave))).toBeNull();
	});

	it('clamps saved coordinates to the current map bounds', () => {
		const outOfBoundsSave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: 99_999,
				y: -50
			}
		};

		expect(parseSaveState(JSON.stringify(outOfBoundsSave))?.player).toMatchObject({
			x: meadowEntryMap.width * 32,
			y: 0
		});
	});

	it('rejects invalid payloads', () => {
		expect(parseSaveState('{"bad":true}')).toBeNull();
	});

	it('rejects version 1 and accepts version 2', () => {
		expect(
			parseSaveState(
				JSON.stringify({
					...createNewSaveState(),
					version: 1
				})
			)
		).toBeNull();

		expect(parseSaveState(JSON.stringify(createNewSaveState()))?.version).toBe(2);
	});

	it('rejects a payload with wrong player field types', () => {
		expect(
			parseSaveState(
				JSON.stringify({
					...createNewSaveState(),
					player: {
						...createNewSaveState().player,
						level: '1'
					}
				})
			)
		).toBeNull();
	});

	it('rejects a payload with invalid flags entries', () => {
		expect(
			parseSaveState(
				JSON.stringify({
					...createNewSaveState(),
					flags: {
						clearedEncounters: ['slime-scout-1', 7],
						collectedPickups: [],
						resolvedEncounterDrops: {}
					}
				})
			)
		).toBeNull();
	});

	it('rejects missing required item state fields', () => {
		const save = createNewSaveState();

		for (const invalidPayload of [
			{ ...save, inventory: undefined },
			{ ...save, equipment: undefined },
			{
				...save,
				flags: {
					clearedEncounters: [],
					resolvedEncounterDrops: {}
				}
			},
			{
				...save,
				flags: {
					clearedEncounters: [],
					collectedPickups: [],
					resolvedEncounterDrops: { 'slime-scout-1': { itemId: 'field-potion', quantity: 1 } }
				}
			}
		]) {
			expect(parseSaveState(JSON.stringify(invalidPayload))).toBeNull();
		}
	});

	it('rejects invalid item state entries', () => {
		const save = createNewSaveState();

		for (const invalidPayload of [
			{
				...save,
				inventory: {
					stacks: [{ itemId: 'field-potion', quantity: 1.5 }],
					equipment: ['training-sword']
				}
			},
			{
				...save,
				inventory: {
					stacks: [{ itemId: 'field-potion', quantity: 1 }],
					equipment: ['training-sword', 7]
				}
			},
			{
				...save,
				equipment: {
					...save.equipment,
					head: 7
				}
			},
			{
				...save,
				equipment: {
					weapon: 'training-sword',
					head: null,
					body: null,
					hands: null
				}
			},
			{
				...save,
				flags: {
					...save.flags,
					collectedPickups: ['meadow-cache', 7]
				}
			},
			{
				...save,
				flags: {
					...save.flags,
					resolvedEncounterDrops: {
						'slime-scout-1': [{ itemId: 'field-potion', quantity: 0 }]
					}
				}
			}
		]) {
			expect(parseSaveState(JSON.stringify(invalidPayload))).toBeNull();
		}
	});
});

describe('save storage', () => {
	it('persists and loads saves from the versioned key', () => {
		const storage = new MemoryStorage();
		const save = {
			...createNewSaveState(),
			inventory: {
				stacks: [{ itemId: 'field-potion', quantity: 3 }],
				equipment: ['training-sword']
			}
		};

		storeSaveState(save, storage);

		expect(storage.getItem(SAVE_STORAGE_KEY)).toBe(serializeSaveState(save));
		expect(loadStoredSaveState(storage)?.mapId).toBe('meadow-entry');
		expect(loadStoredSaveState(storage)?.inventory.stacks).toEqual([
			{ itemId: 'field-potion', quantity: 3 }
		]);
	});

	it('clears stored saves', () => {
		const storage = new MemoryStorage();

		storeSaveState(createNewSaveState(), storage);
		clearStoredSaveState(storage);

		expect(storage.getItem(SAVE_STORAGE_KEY)).toBeNull();
		expect(loadStoredSaveState(storage)).toBeNull();
	});
});
