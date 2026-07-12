import { describe, expect, it } from 'vitest';

import { meadowEntryMap } from '$lib/game/content/maps';
import { startingPlayer } from '$lib/game/content/player';
import { mainQuestId } from '$lib/game/content/quests';
import { getXpForLevel } from '$lib/game/core/progression';
import { createInitialQuestState } from '$lib/game/core/quests';
import {
	collectLandmarkRects,
	collectStrictCollisionRects,
	createNewSaveState,
	isInsideAnyCollisionRect,
	parseSaveState,
	serializeSaveState
} from '$lib/game/save/save-state';
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
			version: 8,
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
			mapExploration: {},
			seenDiscoveries: []
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

	it('migrates v5 saves to v8 by defaulting clearedEncounterUnitCounts and seenDiscoveries', () => {
		const v5Save = {
			...createNewSaveState(),
			version: 5
		};
		delete (v5Save.flags as Record<string, unknown>).clearedEncounterUnitCounts;
		delete (v5Save as Record<string, unknown>).seenDiscoveries;

		const migrated = parseSaveState(JSON.stringify(v5Save));

		expect(migrated).not.toBeNull();
		expect(migrated?.version).toBe(8);
		expect(migrated?.flags.clearedEncounterUnitCounts).toEqual({});
		expect(migrated?.seenDiscoveries).toEqual([]);
	});

	it('migrates v7 saves to v8 by clearing meadow-entry exploration', () => {
		// The layered village refactor moved landmarks within meadow-entry,
		// so coordinate-based exploration cells no longer cover the new
		// landmark positions. The v7→v8 migration must clear meadow-entry
		// exploration so area map markers reappear as the player re-explores.
		const v7Save = {
			...createNewSaveState(),
			version: 7,
			mapExploration: {
				'meadow-entry': ['6,37', '6,36'],
				'ruins-core': ['0,0', '1,0']
			}
		};

		const migrated = parseSaveState(JSON.stringify(v7Save));

		expect(migrated).not.toBeNull();
		expect(migrated?.version).toBe(8);
		expect(migrated?.mapExploration['meadow-entry']).toBeUndefined();
		// Other maps' exploration is preserved.
		expect(migrated?.mapExploration['ruins-core']).toEqual(['0,0', '1,0']);
	});

	it('migrates v7 saves to v8 preserving exploration when meadow-entry is absent', () => {
		const v7Save = {
			...createNewSaveState(),
			version: 7,
			mapExploration: {
				'ruins-core': ['0,0', '1,0']
			}
		};

		const migrated = parseSaveState(JSON.stringify(v7Save));

		expect(migrated).not.toBeNull();
		expect(migrated?.version).toBe(8);
		expect(migrated?.mapExploration['ruins-core']).toEqual(['0,0', '1,0']);
	});

	it('clamps saved coordinates to the current map bounds and nudges off collision', () => {
		const outOfBoundsSave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: 99_999,
				y: -50
			}
		};

		const parsed = parseSaveState(JSON.stringify(outOfBoundsSave));
		expect(parsed).not.toBeNull();
		// Position must be within map bounds
		expect(parsed!.player.x).toBeGreaterThanOrEqual(0);
		expect(parsed!.player.x).toBeLessThanOrEqual(meadowEntryMap.width * 32);
		expect(parsed!.player.y).toBeGreaterThanOrEqual(0);
		expect(parsed!.player.y).toBeLessThanOrEqual(meadowEntryMap.height * 32);
		// Position must not be inside any collision rect (corner walls get nudged)
		expect(isPositionWalkable(parsed!.player.x, parsed!.player.y)).toBe(true);
	});

	/**
	 * Collision-aware normalization: after the layered village refactor, old
	 * saves can have player positions that now land inside a wall blocker,
	 * fence, or decor collision rect. Blockers and fences use strict-rect
	 * collision (isMovementBlockedByStrictRect), which traps the player —
	 * every small step keeps the target inside the padded rect, so no
	 * movement is possible. normalizePlayerPosition must nudge such
	 * positions to the nearest walkable tile.
	 *
	 * The padded check mirrors WorldScene.isMovementBlockedByStrictRect,
	 * which expands every strict rect by playerRadius (12px) before testing
	 * containment. A tile center outside the raw rect but inside the padded
	 * rect still traps the player, so walkability is tested with padding.
	 */
	const NORMALIZE_PLAYER_RADIUS = 12;

	function isPositionWalkable(px: number, py: number): boolean {
		return !isInsideAnyCollisionRect(
			px,
			py,
			[...collectStrictCollisionRects(meadowEntryMap), ...collectLandmarkRects(meadowEntryMap)],
			NORMALIZE_PLAYER_RADIUS
		);
	}

	it('nudges a saved position inside a wall blocker to the nearest walkable tile', () => {
		// (700, 5430) is inside village-block-30-13 (garden-hedge at (688, 5408), 32x192)
		// and inside the hero-house-exterior landmark (235×246 at (720, 5424)). This was
		// the old hero-house landmark center — a valid save position before the layered
		// village refactor moved the walls. The rescue must place the player outside
		// both the blocker and the landmark building.
		const blockedSave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: 700,
				y: 5430
			}
		};

		const parsed = parseSaveState(JSON.stringify(blockedSave));
		expect(parsed).not.toBeNull();
		expect(isPositionWalkable(parsed!.player.x, parsed!.player.y)).toBe(true);
		// The nearest tile outside both the blocker and the landmark is ~140px away
		// (the landmark is 235px wide, so clearing it requires moving several tiles).
		expect(Math.abs(parsed!.player.x - 700)).toBeLessThanOrEqual(160);
		expect(Math.abs(parsed!.player.y - 5430)).toBeLessThanOrEqual(160);
	});

	it('does not rescue a saved position into a landmark building', () => {
		// (700, 5430) was the old hero-house landmark center. The rescue must
		// not place the player inside any landmark (opaque building), even
		// though landmark collision is escape-aware in WorldScene.
		const blockedSave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: 700,
				y: 5430
			}
		};

		const parsed = parseSaveState(JSON.stringify(blockedSave));
		expect(parsed).not.toBeNull();
		for (const landmark of meadowEntryMap.landmarks ?? []) {
			const left = landmark.x - landmark.width / 2;
			const right = landmark.x + landmark.width / 2;
			const top = landmark.y - landmark.height / 2;
			const bottom = landmark.y + landmark.height / 2;
			const inside =
				parsed!.player.x >= left &&
				parsed!.player.x <= right &&
				parsed!.player.y >= top &&
				parsed!.player.y <= bottom;
			expect(inside, `rescued position inside landmark ${landmark.id}`).toBe(false);
		}
	});

	it('nudges a saved position inside a fence to the nearest walkable tile', () => {
		// (4020, 5250) is inside coast-approach-west-fence (32x520 at (4020, 5250)).
		const blockedSave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: 4020,
				y: 5250
			}
		};

		const parsed = parseSaveState(JSON.stringify(blockedSave));
		expect(parsed).not.toBeNull();
		expect(isPositionWalkable(parsed!.player.x, parsed!.player.y)).toBe(true);
		expect(Math.abs(parsed!.player.x - 4020)).toBeLessThanOrEqual(96);
		expect(Math.abs(parsed!.player.y - 5250)).toBeLessThanOrEqual(96);
	});

	it('preserves a saved position at a landmark doorway opening', () => {
		// (1200, 5712) is the shrine-of-aurora doorway transition position.
		// The shrine landmark (246×333 at (1200, 5552)) spans bounds
		// (1077–1323, 5385.5–5718.5), so the transition sits inside the
		// landmark. WorldScene.getLandmarkCollisionRects carves a doorway
		// opening there; normalization must do the same so the player is
		// not nudged away from a valid doorway position.
		const doorwaySave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: 1200,
				y: 5712
			}
		};

		const parsed = parseSaveState(JSON.stringify(doorwaySave));
		expect(parsed).not.toBeNull();
		expect(parsed!.player.x).toBe(1200);
		expect(parsed!.player.y).toBe(5712);
	});

	it('nudges a saved position inside a decor collision rect to the nearest walkable tile', () => {
		// (1776, 4502) is inside village-decor-2-47 collision (50x60 at (1776, 4502)).
		const blockedSave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: 1776,
				y: 4502
			}
		};

		const parsed = parseSaveState(JSON.stringify(blockedSave));
		expect(parsed).not.toBeNull();
		expect(isPositionWalkable(parsed!.player.x, parsed!.player.y)).toBe(true);
		expect(Math.abs(parsed!.player.x - 1776)).toBeLessThanOrEqual(96);
		expect(Math.abs(parsed!.player.y - 4502)).toBeLessThanOrEqual(96);
	});

	it('nudges a saved position to a tile center outside the padded collision bounds', () => {
		// (1664, 4480) is inside village-block-3-43. The nearest tile center
		// outside the *raw* rect is (1680, 4496), but that point is still inside
		// the *padded* bounds of corridor-wall-2b (170x64 at (1775, 4510)):
		// WorldScene.isMovementBlockedByStrictRect expands the rect by
		// playerRadius (12px), so the player would be trapped in every
		// direction. The normalizer must reject padded-trapped tile centers
		// and keep searching outward.
		const blockedSave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: 1664,
				y: 4480
			}
		};

		const parsed = parseSaveState(JSON.stringify(blockedSave));
		expect(parsed).not.toBeNull();
		expect(isPositionWalkable(parsed!.player.x, parsed!.player.y)).toBe(true);
		// Must not be the padded-trapped tile center (1680, 4496).
		expect(parsed!.player.x === 1680 && parsed!.player.y === 4496).toBe(false);
		expect(Math.abs(parsed!.player.x - 1664)).toBeLessThanOrEqual(128);
		expect(Math.abs(parsed!.player.y - 4480)).toBeLessThanOrEqual(128);
	});

	it('leaves a walkable saved position unchanged', () => {
		// meadow-entry spawn is walkable
		const walkableSave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: meadowEntryMap.spawn.x,
				y: meadowEntryMap.spawn.y
			}
		};

		const parsed = parseSaveState(JSON.stringify(walkableSave));
		expect(parsed).not.toBeNull();
		expect(parsed!.player.x).toBe(meadowEntryMap.spawn.x);
		expect(parsed!.player.y).toBe(meadowEntryMap.spawn.y);
	});

	it('rejects invalid payloads', () => {
		expect(parseSaveState('{"bad":true}')).toBeNull();
	});

	it('rejects non-object top-level values', () => {
		expect(parseSaveState('5')).toBeNull();
		expect(parseSaveState('null')).toBeNull();
		expect(parseSaveState('[]')).toBeNull();
	});

	it('rejects version 4 and accepts version 8', () => {
		expect(parseSaveState(JSON.stringify({ ...createNewSaveState(), version: 4 }))).toBeNull();
		expect(parseSaveState(JSON.stringify(createNewSaveState()))?.version).toBe(8);
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
						clearedEncounterUnitCounts: {},
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
			},
			{
				...save,
				flags: {
					...save.flags,
					clearedEncounterUnitCounts: { 'meadow-slime-west': 0 }
				}
			},
			{
				...save,
				flags: {
					...save.flags,
					clearedEncounterUnitCounts: { 'meadow-slime-west': 1.5 }
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
					entries: { ...save.quests.entries, [mainQuestId]: null }
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

	it('preserves player position when the saved map is unknown', () => {
		const save = {
			...createNewSaveState(),
			mapId: 'unknown-map',
			player: {
				...createNewSaveState().player,
				x: 1234,
				y: 5678
			}
		};

		const parsed = parseSaveState(JSON.stringify(save));
		expect(parsed?.player.x).toBe(1234);
		expect(parsed?.player.y).toBe(5678);
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

describe('seenDiscoveries', () => {
	it('initializes empty on a new save', () => {
		expect(createNewSaveState().seenDiscoveries).toEqual([]);
	});

	it('round-trips a populated set', () => {
		const save = { ...createNewSaveState(), seenDiscoveries: ['crossroads-waystone-sign'] };
		const parsed = parseSaveState(serializeSaveState(save));
		expect(parsed?.seenDiscoveries).toEqual(['crossroads-waystone-sign']);
	});

	it('migrates a v6 payload by defaulting seenDiscoveries to []', () => {
		const v6 = { ...createNewSaveState(), version: 6 } as Record<string, unknown>;
		delete v6.seenDiscoveries;
		const parsed = parseSaveState(JSON.stringify(v6));
		expect(parsed?.version).toBe(8);
		expect(parsed?.seenDiscoveries).toEqual([]);
	});

	it('rejects a non-string-array seenDiscoveries', () => {
		const bad = { ...createNewSaveState(), seenDiscoveries: [1, 2] } as unknown;
		expect(parseSaveState(JSON.stringify(bad))).toBeNull();
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
		expect(storage.getItem('gliese.save.v7')).toBeNull();
		expect(loadStoredSaveState(storage)).toBeNull();
	});

	it('clears legacy v7 saves when clearing storage', () => {
		const storage = new MemoryStorage();
		const v7Key = 'gliese.save.v7';
		const save = {
			...createNewSaveState(),
			inventory: {
				stacks: [{ itemId: 'field-potion', quantity: 2 }],
				equipment: ['training-sword']
			}
		};

		storage.setItem(v7Key, serializeSaveState(save));
		clearStoredSaveState(storage);

		expect(storage.getItem(v7Key)).toBeNull();
		expect(storage.getItem(SAVE_STORAGE_KEY)).toBeNull();
		expect(loadStoredSaveState(storage)).toBeNull();
	});

	it('falls back to the previous storage key when the current key is empty', () => {
		const storage = new MemoryStorage();
		const v7Key = 'gliese.save.v7';
		const save = {
			...createNewSaveState(),
			inventory: {
				stacks: [{ itemId: 'field-potion', quantity: 2 }],
				equipment: ['training-sword']
			}
		};

		storage.setItem(v7Key, serializeSaveState(save));

		expect(storage.getItem(SAVE_STORAGE_KEY)).toBeNull();
		expect(loadStoredSaveState(storage)?.inventory.stacks).toEqual([
			{ itemId: 'field-potion', quantity: 2 }
		]);
	});
});
