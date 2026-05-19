import { describe, expect, it } from 'vitest';

import { meadowEntryMap } from '$lib/game/content/maps';
import { startingPlayer } from '$lib/game/content/player';
import { mainQuestId } from '$lib/game/content/quests';
import { getXpForLevel } from '$lib/game/core/progression';
import { createInitialQuestState } from '$lib/game/core/quests';
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
			version: 5,
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
			},
			wallet: { coins: 30 },
			shops: {
				stock: {
					'guild-quartermaster': {
						'iron-cap': 1,
						'grip-wraps': 1,
						'traveler-vest': 1
					}
				}
			},
			quests: createInitialQuestState(),
			mapExploration: {}
		});
	});

	it('round-trips a valid save payload', () => {
		const encoded = serializeSaveState(createNewSaveState());
		expect(parseSaveState(encoded)?.mapId).toBe('meadow-entry');
	});

	it('round-trips map exploration cells with cloned arrays', () => {
		const save = {
			...createNewSaveState(),
			mapExploration: { 'meadow-entry': ['0,0', '1,0'] }
		};

		const parsed = parseSaveState(JSON.stringify(save));

		expect(parsed?.mapExploration['meadow-entry']).toEqual(['0,0', '1,0']);
		expect(parsed?.mapExploration['meadow-entry']).not.toBe(save.mapExploration['meadow-entry']);
	});

	it('rejects malformed map exploration cell keys', () => {
		for (const cell of ['bad', '1', '1,NaN', '-1,0']) {
			expect(
				parseSaveState(
					JSON.stringify({
						...createNewSaveState(),
						mapExploration: { 'meadow-entry': [cell] }
					})
				)
			).toBeNull();
		}
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

	it('rejects version 4 and accepts version 5', () => {
		expect(parseSaveState(JSON.stringify({ ...createNewSaveState(), version: 4 }))).toBeNull();
		expect(parseSaveState(JSON.stringify(createNewSaveState()))?.version).toBe(5);
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

	it('rejects resolved encounter drops when the field is an array', () => {
		expect(
			parseSaveState(
				JSON.stringify({
					...createNewSaveState(),
					flags: {
						...createNewSaveState().flags,
						resolvedEncounterDrops: []
					}
				})
			)
		).toBeNull();
	});

	it('rejects resolved encounter drops with unknown item ids', () => {
		expect(
			parseSaveState(
				JSON.stringify({
					...createNewSaveState(),
					flags: {
						...createNewSaveState().flags,
						resolvedEncounterDrops: {
							'slime-scout-1': [{ itemId: 'not-real', quantity: 1 }]
						}
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
				equipment: {
					...save.equipment,
					trinket: null
				}
			},
			{
				...save,
				equipment: {
					...save.equipment,
					head: 'iron-cap'
				}
			},
			{
				...save,
				inventory: {
					...save.inventory,
					equipment: ['training-sword', 'iron-cap']
				},
				equipment: {
					...save.equipment,
					body: 'iron-cap'
				}
			},
			{
				...save,
				inventory: {
					...save.inventory,
					stacks: [{ itemId: 'training-sword', quantity: 1 }]
				}
			},
			{
				...save,
				inventory: {
					...save.inventory,
					equipment: ['training-sword', 'field-potion']
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

	it('rejects invalid quest state entries', () => {
		const save = createNewSaveState();
		const mainEntry = save.quests.entries[mainQuestId]!;

		for (const invalidPayload of [
			{ ...save, quests: undefined },
			{ ...save, quests: [] },
			{ ...save, quests: { entries: [], completedObjectives: {} } },
			{ ...save, quests: { entries: {}, completedObjectives: {} } },
			{
				...save,
				quests: {
					...save.quests,
					entries: { ...save.quests.entries, 'not-a-quest': mainEntry }
				}
			},
			{
				...save,
				quests: {
					...save.quests,
					entries: {
						...save.quests.entries,
						[mainQuestId]: { ...mainEntry, status: 'pending' }
					}
				}
			},
			{
				...save,
				quests: {
					...save.quests,
					entries: {
						...save.quests.entries,
						[mainQuestId]: { ...mainEntry, currentObjectiveId: 'not-an-objective' }
					}
				}
			},
			{
				...save,
				quests: {
					...save.quests,
					entries: {
						...save.quests.entries,
						[mainQuestId]: { ...mainEntry, progress: 1.5 }
					}
				}
			},
			{
				...save,
				quests: {
					...save.quests,
					entries: {
						...save.quests.entries,
						[mainQuestId]: { ...mainEntry, progress: -1 }
					}
				}
			},
			{
				...save,
				quests: {
					...save.quests,
					entries: {
						...save.quests.entries,
						[mainQuestId]: { ...mainEntry, progress: 2 }
					}
				}
			},
			{
				...save,
				quests: {
					...save.quests,
					entries: {
						...save.quests.entries,
						[mainQuestId]: { ...mainEntry, rewardApplied: 'yes' }
					}
				}
			},
			{
				...save,
				quests: {
					...save.quests,
					entries: {
						...save.quests.entries,
						[mainQuestId]: { ...mainEntry, countedSourceIds: undefined }
					}
				}
			},
			{
				...save,
				quests: {
					...save.quests,
					entries: {
						...save.quests.entries,
						[mainQuestId]: { ...mainEntry, countedSourceIds: ['npc:guild-master', 7] }
					}
				}
			},
			{
				...save,
				quests: {
					...save.quests,
					completedObjectives: []
				}
			},
			{
				...save,
				quests: {
					...save.quests,
					completedObjectives: { 'not-a-quest': ['talk-to-guild-master'] }
				}
			},
			{
				...save,
				quests: {
					...save.quests,
					completedObjectives: { [mainQuestId]: ['not-an-objective'] }
				}
			}
		]) {
			expect(parseSaveState(JSON.stringify(invalidPayload))).toBeNull();
		}
	});

	it('rejects invalid map exploration state', () => {
		const save = createNewSaveState();

		for (const invalidPayload of [
			{ ...save, mapExploration: undefined },
			{ ...save, mapExploration: [] },
			{ ...save, mapExploration: { 'meadow-entry': '0,0' } },
			{ ...save, mapExploration: { 'meadow-entry': ['0,0', 7] } }
		]) {
			expect(parseSaveState(JSON.stringify(invalidPayload))).toBeNull();
		}
	});

	it('rejects invalid wallet and shop stock state', () => {
		const save = createNewSaveState();

		for (const invalidPayload of [
			{ ...save, wallet: undefined },
			{ ...save, wallet: { coins: -1 } },
			{ ...save, wallet: { coins: 1.5 } },
			{ ...save, shops: undefined },
			{ ...save, shops: { stock: [] } },
			{ ...save, shops: { stock: {} } },
			{ ...save, shops: { stock: { 'not-real': { 'iron-cap': 1 } } } },
			{ ...save, shops: { stock: { 'guild-quartermaster': { 'iron-cap': 1 } } } },
			{ ...save, shops: { stock: { 'guild-quartermaster': { 'not-real': 1 } } } },
			{
				...save,
				shops: {
					stock: {
						'guild-quartermaster': {
							'iron-cap': 1,
							'grip-wraps': 1,
							'traveler-vest': 1,
							'extra-stock': 1
						}
					}
				}
			},
			{ ...save, shops: { stock: { 'guild-quartermaster': { 'iron-cap': -1 } } } },
			{ ...save, shops: { stock: { 'guild-quartermaster': { 'iron-cap': 1.5 } } } },
			{ ...save, shops: { stock: { 'guild-quartermaster': { 'iron-cap': 2 } } } }
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
