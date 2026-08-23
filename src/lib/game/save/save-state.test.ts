import { describe, expect, it } from 'vitest';

import { guildHallMap, maps, meadowEntryMap } from '$lib/game/content/maps';
import { COMPLETE_WORLD_MAP_IDS } from '$lib/game/content/maps/layouts/complete-world-layout-foundation';
import { MEADOW_ENTRY_V2_RIVER_SEGMENTS } from '$lib/game/content/maps/layouts/meadow-entry-v2';
import { startingPlayer } from '$lib/game/content/player';
import { mainQuestId } from '$lib/game/content/quests';
import { PLAYER_COLLISION_RADIUS } from '$lib/game/core/collision';
import { getXpForLevel } from '$lib/game/core/progression';
import { createInitialQuestState } from '$lib/game/core/quests';
import {
	buildMapNavigationObstacles,
	resolveMapNavigationGrid
} from '$lib/game/content/maps/navigation';
import { isPositionWalkable as isNavigationPositionWalkable } from '$lib/game/core/navigation';
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
	function isPositionWalkable(px: number, py: number): boolean {
		return isNavigationPositionWalkable(
			resolveMapNavigationGrid(meadowEntryMap),
			buildMapNavigationObstacles(meadowEntryMap, { includeInteractableNpcs: false }),
			{ x: px, y: py },
			PLAYER_COLLISION_RADIUS,
			'resting-position'
		);
	}

	it('normalizes loaded guild hall positions out of interior prop collision', () => {
		const collision = guildHallMap.interiorProps?.find(
			(prop) => prop.id === 'guild-hall-master-desk'
		)?.collision;
		expect(collision).toBeDefined();

		const save = createNewSaveState();
		save.mapId = guildHallMap.id;
		save.player = {
			...save.player,
			x: collision!.x,
			y: collision!.y
		};

		const parsed = parseSaveState(serializeSaveState(save));
		expect(parsed).not.toBeNull();

		const interiorCollisions = (guildHallMap.interiorProps ?? []).flatMap((prop) =>
			prop.collision ? [prop.collision] : []
		);
		expect(
			isInsideAnyCollisionRect(
				parsed!.player.x,
				parsed!.player.y,
				interiorCollisions,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(parsed!.player.x).toBe(784);
		expect(parsed!.player.y).toBe(144);
	});

	it('nudges a saved position inside a wall blocker to the nearest walkable tile', () => {
		// The reauthored Crossroads gate is strict movement collision: its padded
		// bounds trap the player, so a loaded position at the gate center must be
		// rescued.
		const blockedPosition = { x: 4_176, y: 2_836 };
		expect(
			isInsideAnyCollisionRect(
				blockedPosition.x,
				blockedPosition.y,
				collectStrictCollisionRects(meadowEntryMap),
				PLAYER_COLLISION_RADIUS
			)
		).toBe(true);
		const blockedSave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: blockedPosition.x,
				y: blockedPosition.y
			}
		};

		const parsed = parseSaveState(JSON.stringify(blockedSave));
		expect(parsed).not.toBeNull();
		expect(isPositionWalkable(parsed!.player.x, parsed!.player.y)).toBe(true);
		expect(parsed!.player.x !== blockedPosition.x || parsed!.player.y !== blockedPosition.y).toBe(
			true
		);
		expect(parsed!.player.x).toBe(4112);
		expect(parsed!.player.y).toBe(2768);
		expect(Math.abs(parsed!.player.x - blockedPosition.x)).toBeLessThanOrEqual(96);
		expect(Math.abs(parsed!.player.y - blockedPosition.y)).toBeLessThanOrEqual(96);
	});

	it('nudges a saved position inside the new watershed to the nearest walkable tile', () => {
		const river = MEADOW_ENTRY_V2_RIVER_SEGMENTS.find(({ id }) => id === 'north-river');
		expect(river).toBeDefined();
		const blockedPosition = {
			x: river!.rect.x + river!.rect.width / 2,
			y: river!.rect.y + river!.rect.height / 2
		};
		const blockedSave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: blockedPosition.x,
				y: blockedPosition.y
			}
		};

		const parsed = parseSaveState(JSON.stringify(blockedSave));
		expect(parsed).not.toBeNull();
		expect(isPositionWalkable(parsed!.player.x, parsed!.player.y)).toBe(true);
		expect(parsed!.player.x !== blockedPosition.x || parsed!.player.y !== blockedPosition.y).toBe(
			true
		);
		expect(parsed!.player.x).toBe(3376);
		expect(parsed!.player.y).toBe(1936);
	});

	it('does not rescue a saved position into a landmark building', () => {
		// The V2 Hero House center is opaque landmark geometry. Landmark collision
		// is escape-aware during movement, but a loaded position there is invalid.
		const blockedPosition = { x: 704, y: 5_712 };
		expect(
			isInsideAnyCollisionRect(
				blockedPosition.x,
				blockedPosition.y,
				collectLandmarkRects(meadowEntryMap),
				PLAYER_COLLISION_RADIUS
			)
		).toBe(true);
		const blockedSave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: blockedPosition.x,
				y: blockedPosition.y
			}
		};

		const parsed = parseSaveState(JSON.stringify(blockedSave));
		expect(parsed).not.toBeNull();
		expect(isPositionWalkable(parsed!.player.x, parsed!.player.y)).toBe(true);
		expect(parsed!.player.x !== blockedPosition.x || parsed!.player.y !== blockedPosition.y).toBe(
			true
		);
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
		// The V2 Shrine of Aurora return arrival is two tiles below its exterior
		// doorway and outside the landmark's padded collision bounds.
		const doorwaySave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: 2272,
				y: 5920
			}
		};

		const parsed = parseSaveState(JSON.stringify(doorwaySave));
		expect(parsed).not.toBeNull();
		expect(parsed!.player.x).toBe(2272);
		expect(parsed!.player.y).toBe(5920);
	});

	it('nudges a saved position inside a decor collision rect to the nearest walkable tile', () => {
		// This V2 pole-lantern anchor compiles to a strict collision rect.
		const blockedPosition = { x: 1_072, y: 4_950 };
		expect(
			isInsideAnyCollisionRect(
				blockedPosition.x,
				blockedPosition.y,
				collectStrictCollisionRects(meadowEntryMap),
				PLAYER_COLLISION_RADIUS
			)
		).toBe(true);
		const blockedSave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: blockedPosition.x,
				y: blockedPosition.y
			}
		};

		const parsed = parseSaveState(JSON.stringify(blockedSave));
		expect(parsed).not.toBeNull();
		expect(isPositionWalkable(parsed!.player.x, parsed!.player.y)).toBe(true);
		expect(parsed!.player.x !== blockedPosition.x || parsed!.player.y !== blockedPosition.y).toBe(
			true
		);
		expect(Math.abs(parsed!.player.x - blockedPosition.x)).toBeLessThanOrEqual(96);
		expect(Math.abs(parsed!.player.y - blockedPosition.y)).toBeLessThanOrEqual(96);
	});

	it('nudges a saved position to a tile center outside the padded collision bounds', () => {
		// This point is outside the raw Crossroads gate blocker but inside its
		// player-radius padding. The normalizer must reject the padded-trapped
		// position and keep searching outward.
		const blockedPosition = { x: 3_928, y: 2_836 };
		const wall = meadowEntryMap.blockers?.find((rect) => rect.id === 'castle-gate-block');
		expect(wall).toBeDefined();
		expect(isInsideAnyCollisionRect(blockedPosition.x, blockedPosition.y, [wall!], 0)).toBe(false);
		expect(
			isInsideAnyCollisionRect(
				blockedPosition.x,
				blockedPosition.y,
				[wall!],
				PLAYER_COLLISION_RADIUS
			)
		).toBe(true);
		const blockedSave = {
			...createNewSaveState(),
			player: {
				...createNewSaveState().player,
				x: blockedPosition.x,
				y: blockedPosition.y
			}
		};

		const parsed = parseSaveState(JSON.stringify(blockedSave));
		expect(parsed).not.toBeNull();
		expect(isPositionWalkable(parsed!.player.x, parsed!.player.y)).toBe(true);
		expect(parsed!.player.x !== blockedPosition.x || parsed!.player.y !== blockedPosition.y).toBe(
			true
		);
		expect(Math.abs(parsed!.player.x - blockedPosition.x)).toBeLessThanOrEqual(128);
		expect(Math.abs(parsed!.player.y - blockedPosition.y)).toBeLessThanOrEqual(128);
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

	it('round-trips every complete-world map spawn without collision recovery', () => {
		for (const mapId of COMPLETE_WORLD_MAP_IDS) {
			const map = maps[mapId];
			const save = createNewSaveState();
			save.mapId = mapId;
			save.player = {
				...save.player,
				x: map.spawn.x,
				y: map.spawn.y,
				facing: map.spawnDirection
			};

			const parsed = parseSaveState(serializeSaveState(save));
			expect(parsed, `${mapId}:parsed`).not.toBeNull();
			expect(parsed!.mapId).toBe(mapId);
			expect(parsed!.player.x, `${mapId}:spawn.x`).toBe(map.spawn.x);
			expect(parsed!.player.y, `${mapId}:spawn.y`).toBe(map.spawn.y);

			const interiorPropCollisions = (map.interiorProps ?? []).flatMap((prop) =>
				prop.collision ? [prop.collision] : []
			);
			expect(
				isInsideAnyCollisionRect(
					parsed!.player.x,
					parsed!.player.y,
					[
						...collectStrictCollisionRects(map),
						...collectLandmarkRects(map),
						...interiorPropCollisions
					],
					PLAYER_COLLISION_RADIUS
				),
				`${mapId}:spawn is inside composed collision`
			).toBe(false);
		}
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
