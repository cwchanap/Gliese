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
			consumables: { heals: 1 }
		});
	});

	it('round-trips a valid save payload', () => {
		const encoded = serializeSaveState(createNewSaveState());
		expect(parseSaveState(encoded)?.mapId).toBe('meadow-entry');
	});

	it('upgrades legacy v1 save payloads without consumables', () => {
		const legacySave = createNewSaveState();
		const { consumables: _consumables, ...legacyPayload } = legacySave;
		void _consumables;

		expect(parseSaveState(JSON.stringify(legacyPayload))?.consumables.heals).toBe(1);
	});

	it('migrates old tiny-room meadow coordinates to the nearest large-room anchor', () => {
		const oldSave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: 64,
				y: 64
			}
		};

		expect(parseSaveState(JSON.stringify(oldSave))?.player).toMatchObject({
			x: meadowEntryMap.spawn.x,
			y: meadowEntryMap.spawn.y
		});
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

	it('does not migrate negative coordinates as legacy room positions', () => {
		const negativeCoordinateSave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: 300,
				y: -50
			}
		};

		expect(parseSaveState(JSON.stringify(negativeCoordinateSave))?.player).toMatchObject({
			x: 300,
			y: 0
		});
	});

	it('rejects invalid payloads', () => {
		expect(parseSaveState('{"bad":true}')).toBeNull();
	});

	it('rejects a payload with the wrong version', () => {
		expect(
			parseSaveState(
				JSON.stringify({
					...createNewSaveState(),
					version: 2
				})
			)
		).toBeNull();
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
						clearedEncounters: ['slime-scout-1', 7]
					}
				})
			)
		).toBeNull();
	});

	it('rejects a payload with invalid consumable counts', () => {
		expect(
			parseSaveState(
				JSON.stringify({
					...createNewSaveState(),
					consumables: {
						heals: '1'
					}
				})
			)
		).toBeNull();
	});
});

describe('save storage', () => {
	it('persists and loads saves from the versioned key', () => {
		const storage = new MemoryStorage();
		const save = {
			...createNewSaveState(),
			consumables: { heals: 0 }
		};

		storeSaveState(save, storage);

		expect(storage.getItem(SAVE_STORAGE_KEY)).toBe(serializeSaveState(save));
		expect(loadStoredSaveState(storage)?.mapId).toBe('meadow-entry');
		expect(loadStoredSaveState(storage)?.consumables.heals).toBe(0);
	});

	it('clears stored saves', () => {
		const storage = new MemoryStorage();

		storeSaveState(createNewSaveState(), storage);
		clearStoredSaveState(storage);

		expect(storage.getItem(SAVE_STORAGE_KEY)).toBeNull();
		expect(loadStoredSaveState(storage)).toBeNull();
	});
});
