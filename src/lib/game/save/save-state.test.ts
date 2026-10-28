import { describe, expect, it } from 'vitest';

import {
	blacksmithInteriorMap,
	guildHallMap,
	itemShopMap,
	maps,
	overworldMap,
	shrineOfAuroraInteriorMap,
	villagerHouse1Map,
	villagerHouse2Map,
	villagerHouse3Map
} from '$lib/game/content/maps';
import { overworldDoorArrival } from '$lib/game/content/maps/overworld/places';
import { overworld } from '$lib/game/content/maps/overworld/world';
import { homeBedside, startingPlayer } from '$lib/game/content/player';
import { PLAYER_COLLISION_RADIUS } from '$lib/game/core/collision';
import { getXpForLevel } from '$lib/game/core/progression';
import { createInitialQuestState, getStoryProgress } from '$lib/game/core/quests';
import { questStateAt } from '$lib/game/core/quests.fixtures';
import { applyStoryGates } from '$lib/game/core/story-gates';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';
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
	serializeSaveState,
	type SaveState
} from '$lib/game/save/save-state';

/** A new run moved onto the overworld, for position and normalization checks. */
function overworldSaveState(): SaveState {
	const save = createNewSaveState();
	return {
		...save,
		mapId: overworldMap.id,
		player: { ...save.player, x: overworldMap.spawn.x, y: overworldMap.spawn.y }
	};
}

/** The centre of the first building of this type, in world pixels. */
function buildingCentre(type: string) {
	const building = overworld.grid.buildings.find((candidate) => candidate.type === type)!;
	return {
		x: (building.col + building.width / 2) * 32,
		y: (building.row + building.height / 2) * 32
	};
}

describe('save state', () => {
	it('creates a level 1 starting save', () => {
		expect(createNewSaveState()).toEqual({
			version: 10,
			mapId: homeBedside.mapId,
			player: {
				level: 1,
				xp: getXpForLevel(1),
				hp: startingPlayer.baseHp,
				attack: startingPlayer.baseAttack,
				x: homeBedside.x,
				y: homeBedside.y,
				facing: homeBedside.facing
			},
			flags: {
				clearedEncounters: [],
				clearedEncounterUnitCounts: {},
				collectedPickups: [],
				resolvedEncounterDrops: {}
			},
			inventory: { stacks: [], equipment: [] },
			equipment: {
				weapon: null,
				head: null,
				body: null,
				hands: null,
				accessory: null
			},
			wallet: { coins: 20 },
			shops: {
				stock: {
					'guild-quartermaster': {
						'iron-cap': 1,
						'grip-wraps': 1,
						'traveler-vest': 1
					},
					'sundrop-forge': {
						'training-sword': 1,
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
		expect(parseSaveState(encoded)).toEqual(createNewSaveState());
	});

	it('round-trips an Item Shop save at Mira approach without moving the player', () => {
		const save = overworldSaveState();
		save.mapId = itemShopMap.id;
		save.player = {
			...save.player,
			x: 416,
			y: 360,
			facing: 'up'
		};

		const parsed = parseSaveState(serializeSaveState(save));

		expect(parsed).toMatchObject({
			mapId: 'item-shop',
			player: { x: 416, y: 360, facing: 'up' }
		});
		expect(
			isInsideAnyCollisionRect(
				parsed!.player.x,
				parsed!.player.y,
				(itemShopMap.interiorProps ?? []).flatMap((prop) =>
					prop.collision ? [prop.collision] : []
				),
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
	});

	it('round-trips a Blacksmith save at Oren approach without moving the player', () => {
		const save = overworldSaveState();
		save.mapId = blacksmithInteriorMap.id;
		save.player = {
			...save.player,
			x: 448,
			y: 480,
			facing: 'up'
		};

		const parsed = parseSaveState(serializeSaveState(save));

		expect(parsed).toMatchObject({
			mapId: 'blacksmith-interior',
			player: { x: 448, y: 480, facing: 'up' }
		});
		expect(
			isInsideAnyCollisionRect(
				parsed!.player.x,
				parsed!.player.y,
				(blacksmithInteriorMap.interiorProps ?? []).flatMap((prop) =>
					prop.collision ? [prop.collision] : []
				),
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
	});

	it('round-trips map exploration cells with cloned arrays', () => {
		const save = {
			...overworldSaveState(),
			mapExploration: { overworld: ['0,0', '1,0'] }
		};

		const parsed = parseSaveState(JSON.stringify(save));

		expect(parsed?.mapExploration.overworld).toEqual(['0,0', '1,0']);
		expect(parsed?.mapExploration.overworld).not.toBe(save.mapExploration.overworld);
	});

	it('rejects malformed map exploration cell keys', () => {
		for (const cell of ['bad', '1', '1,NaN', '-1,0']) {
			expect(
				parseSaveState(
					JSON.stringify({
						...overworldSaveState(),
						mapExploration: { overworld: [cell] }
					})
				)
			).toBeNull();
		}
	});

	it('rejects legacy v1 save payloads instead of migrating them', () => {
		const legacySave = {
			...overworldSaveState(),
			version: 1,
			flags: { clearedEncounters: [] },
			consumables: { heals: 1 }
		};

		expect(parseSaveState(JSON.stringify(legacySave))).toBeNull();
	});

	it('rejects malformed shop stock instead of silently resetting it', () => {
		const v8Save = overworldSaveState();
		const validLegacyStock = {
			'guild-quartermaster': {
				'iron-cap': 1,
				'grip-wraps': 1,
				'traveler-vest': 1
			}
		};
		const invalidStocks = [
			{ 'not-a-shop': validLegacyStock['guild-quartermaster'] },
			{
				'guild-quartermaster': {
					...validLegacyStock['guild-quartermaster'],
					'extra-stock': 1
				}
			},
			{
				'guild-quartermaster': {
					...validLegacyStock['guild-quartermaster'],
					'not-a-stock': 1
				}
			},
			{ 'guild-quartermaster': { ...validLegacyStock['guild-quartermaster'], 'iron-cap': -1 } },
			{ 'guild-quartermaster': { ...validLegacyStock['guild-quartermaster'], 'iron-cap': 2 } }
		];

		for (const stock of invalidStocks) {
			expect(parseSaveState(JSON.stringify({ ...v8Save, shops: { stock } }))).toBeNull();
		}
	});

	// The west gate of Sundrop is open dirt by day and burns during the raid.
	const raidFire = { col: 132, row: 211, x: 132 * 32 + 16, y: 211 * 32 + 16 };

	it('keeps a saved position on terrain that only blocks in a later story window', () => {
		const save = createNewSaveState();
		const onRaidFire = {
			...save,
			mapId: overworldMap.id,
			player: { ...save.player, x: raidFire.x, y: raidFire.y }
		};
		const raidCell = overworldMap.tileOverlays
			?.flatMap((overlay) => overlay.cells)
			.find((cell) => cell.col === raidFire.col && cell.row === raidFire.row);
		expect(raidCell?.glyph).toBe('&');

		expect(parseSaveState(serializeSaveState(onRaidFire))?.player).toMatchObject({
			x: raidFire.x,
			y: raidFire.y
		});
	});

	it('nudges a saved position off terrain that blocks in the saved story window', () => {
		const save = createNewSaveState();
		const duringRaid = {
			...save,
			mapId: overworldMap.id,
			quests: questStateAt('heed-mott'),
			player: { ...save.player, x: raidFire.x, y: raidFire.y }
		};

		const player = parseSaveState(serializeSaveState(duringRaid))?.player;
		expect(player).not.toMatchObject({ x: raidFire.x, y: raidFire.y });
		const raidMap = applyStoryGates(overworldMap, getStoryProgress(duringRaid.quests));
		expect(
			isNavigationPositionWalkable(
				resolveMapNavigationGrid(raidMap),
				buildMapNavigationObstacles(raidMap, { includeInteractableNpcs: false }),
				player!,
				PLAYER_COLLISION_RADIUS,
				'resting-position'
			)
		).toBe(true);
	});

	it('clamps saved coordinates to the current map bounds and nudges off collision', () => {
		const outOfBoundsSave = {
			...overworldSaveState(),
			player: {
				...overworldSaveState().player,
				x: 99_999,
				y: -50
			}
		};

		const parsed = parseSaveState(JSON.stringify(outOfBoundsSave));
		expect(parsed).not.toBeNull();
		// Position must be within map bounds
		expect(parsed!.player.x).toBeGreaterThanOrEqual(0);
		expect(parsed!.player.x).toBeLessThanOrEqual(overworldMap.width * 32);
		expect(parsed!.player.y).toBeGreaterThanOrEqual(0);
		expect(parsed!.player.y).toBeLessThanOrEqual(overworldMap.height * 32);
		// Position must not be inside any collision rect (corner walls get nudged)
		expect(isPositionWalkable(parsed!.player.x, parsed!.player.y)).toBe(true);
	});

	/**
	 * Collision-aware normalization: a saved position that now lands on blocking
	 * terrain or a building footprint traps the player, so normalizePlayerPosition
	 * must nudge it to the nearest walkable spot.
	 */
	function isPositionWalkable(px: number, py: number): boolean {
		return isNavigationPositionWalkable(
			resolveMapNavigationGrid(overworldMap),
			buildMapNavigationObstacles(overworldMap, { includeInteractableNpcs: false }),
			{ x: px, y: py },
			PLAYER_COLLISION_RADIUS,
			'resting-position'
		);
	}

	it.each([
		['guild-hall-master-desk', guildHallMap, { x: 792, y: 184 }],
		['guild-hall-quartermaster-counter', guildHallMap, { x: 776, y: 568 }],
		['villager-house-1-family-table', villagerHouse1Map, { x: 248, y: 600 }]
	] as const)(
		'normalizes loaded %s positions out of interior prop collision',
		(propId, map, expected) => {
			const collision = map.interiorProps?.find((prop) => prop.id === propId)?.collision;
			expect(collision).toBeDefined();

			const save = overworldSaveState();
			save.mapId = map.id;
			save.player = {
				...save.player,
				x: collision!.x,
				y: collision!.y
			};

			const parsed = parseSaveState(serializeSaveState(save));
			expect(parsed).not.toBeNull();

			const interiorCollisions = (map.interiorProps ?? []).flatMap((prop) =>
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
			expect(
				isNavigationPositionWalkable(
					resolveMapNavigationGrid(map),
					buildMapNavigationObstacles(map, { includeInteractableNpcs: false }),
					{ x: parsed!.player.x, y: parsed!.player.y },
					PLAYER_COLLISION_RADIUS,
					'resting-position'
				)
			).toBe(true);
			expect(parsed!.player.x).toBe(expected.x);
			expect(parsed!.player.y).toBe(expected.y);
		}
	);

	it('normalizes a loaded Villager House 2 Toma workbench position from the current layout', () => {
		const layout = VILLAGE_INTERIOR_LAYOUTS['villager-house-2'];
		const prop = villagerHouse2Map.interiorProps?.find(
			({ id }) => id === 'villager-house-2-workbench'
		);
		const collision = prop?.collision;
		expect(collision).toMatchObject({
			width: layout.propCollisions.tomaWorkbench.width,
			height: layout.propCollisions.tomaWorkbench.height,
			x: layout.propCollisions.tomaWorkbench.x + layout.propCollisions.tomaWorkbench.width / 2,
			y: layout.propCollisions.tomaWorkbench.y + layout.propCollisions.tomaWorkbench.height / 2
		});
		if (!collision) return;

		const save = overworldSaveState();
		save.mapId = villagerHouse2Map.id;
		save.player = { ...save.player, x: collision.x, y: collision.y };

		const parsed = parseSaveState(serializeSaveState(save));
		expect(parsed).not.toBeNull();
		if (!parsed) return;
		const interiorCollisions = (villagerHouse2Map.interiorProps ?? []).flatMap((item) =>
			item.collision ? [item.collision] : []
		);
		expect(
			isInsideAnyCollisionRect(
				parsed.player.x,
				parsed.player.y,
				interiorCollisions,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			isNavigationPositionWalkable(
				resolveMapNavigationGrid(villagerHouse2Map),
				buildMapNavigationObstacles(villagerHouse2Map, { includeInteractableNpcs: false }),
				parsed.player,
				PLAYER_COLLISION_RADIUS,
				'resting-position'
			)
		).toBe(true);
		expect(parsed.player.x !== collision.x || parsed.player.y !== collision.y).toBe(true);
	});

	it.each([
		['a building footprint', buildingCentre('home')],
		['the Sundrop river', { x: 180 * 32 + 16, y: 204 * 32 + 16 }]
	] as const)('nudges a saved position on %s to nearby walkable ground', (_label, blocked) => {
		expect(isPositionWalkable(blocked.x, blocked.y)).toBe(false);
		const blockedSave = {
			...overworldSaveState(),
			player: { ...overworldSaveState().player, x: blocked.x, y: blocked.y }
		};

		const parsed = parseSaveState(JSON.stringify(blockedSave));
		expect(parsed).not.toBeNull();
		expect(isPositionWalkable(parsed!.player.x, parsed!.player.y)).toBe(true);
		expect(Math.abs(parsed!.player.x - blocked.x)).toBeLessThanOrEqual(128);
		expect(Math.abs(parsed!.player.y - blocked.y)).toBeLessThanOrEqual(128);
	});

	it('preserves a saved position at a door arrival', () => {
		const arrival = overworldDoorArrival('shrine-of-aurora-interior');
		const doorwaySave = {
			...overworldSaveState(),
			player: { ...overworldSaveState().player, x: arrival.x, y: arrival.y }
		};

		const parsed = parseSaveState(JSON.stringify(doorwaySave));
		expect(parsed).not.toBeNull();
		expect(parsed!.player.x).toBe(arrival.x);
		expect(parsed!.player.y).toBe(arrival.y);
	});

	it.each([
		['overworld', overworldMap, overworldMap.spawn],
		['shrine-of-aurora-interior', shrineOfAuroraInteriorMap, shrineOfAuroraInteriorMap.spawn],
		['villager-house-1', villagerHouse1Map, villagerHouse1Map.spawn],
		['villager-house-2', villagerHouse2Map, villagerHouse2Map.spawn],
		['villager-house-3', villagerHouse3Map, villagerHouse3Map.spawn]
	] as const)('leaves a walkable %s saved position unchanged', (_mapId, map, point) => {
		const walkableSave = {
			...overworldSaveState(),
			player: {
				...overworldSaveState().player,
				x: point.x,
				y: point.y
			}
		};
		walkableSave.mapId = map.id;

		const parsed = parseSaveState(JSON.stringify(walkableSave));
		expect(parsed).not.toBeNull();
		expect(parsed!.mapId).toBe(map.id);
		expect(parsed!.player.x).toBe(point.x);
		expect(parsed!.player.y).toBe(point.y);
		expect(
			isNavigationPositionWalkable(
				resolveMapNavigationGrid(map),
				buildMapNavigationObstacles(map, { includeInteractableNpcs: false }),
				point,
				PLAYER_COLLISION_RADIUS,
				'resting-position'
			)
		).toBe(true);
	});

	it('round-trips every map spawn without collision recovery', () => {
		for (const mapId of Object.keys(maps)) {
			const map = maps[mapId];
			const save = overworldSaveState();
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

	it('rejects older schema versions and accepts version 10', () => {
		expect(parseSaveState(JSON.stringify({ ...overworldSaveState(), version: 9 }))).toBeNull();
		expect(parseSaveState(JSON.stringify(overworldSaveState()))?.version).toBe(10);
	});

	it('rejects a payload with wrong player field types', () => {
		expect(
			parseSaveState(
				JSON.stringify({
					...overworldSaveState(),
					player: {
						...overworldSaveState().player,
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
					...overworldSaveState(),
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
					...overworldSaveState(),
					flags: {
						...overworldSaveState().flags,
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
					...overworldSaveState(),
					flags: {
						...overworldSaveState().flags,
						resolvedEncounterDrops: {
							'slime-scout-1': [{ itemId: 'not-real', quantity: 1 }]
						}
					}
				})
			)
		).toBeNull();
	});

	it('rejects missing required item state fields', () => {
		const save = overworldSaveState();

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
		const save = overworldSaveState();

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
		const save = overworldSaveState();
		const mainQuestId = 'prologue-proving-morning';
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
						[mainQuestId]: { ...mainEntry, countedSourceIds: ['npc:mott-hearth', 7] }
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
			{ ...save, quests: { ...save.quests, pendingEffects: undefined } },
			{
				...save,
				quests: { ...save.quests, pendingEffects: [{ type: 'play-scene' }] }
			},
			{
				...save,
				quests: {
					...save.quests,
					completedObjectives: { 'not-a-quest': ['talk-to-mott'] }
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
		const save = overworldSaveState();

		for (const invalidPayload of [
			{ ...save, mapExploration: undefined },
			{ ...save, mapExploration: [] },
			{ ...save, mapExploration: { overworld: '0,0' } },
			{ ...save, mapExploration: { overworld: ['0,0', 7] } }
		]) {
			expect(parseSaveState(JSON.stringify(invalidPayload))).toBeNull();
		}
	});

	it('preserves player position when the saved map is unknown', () => {
		const save = {
			...overworldSaveState(),
			mapId: 'unknown-map',
			player: {
				...overworldSaveState().player,
				x: 1234,
				y: 5678
			}
		};

		const parsed = parseSaveState(JSON.stringify(save));
		expect(parsed?.player.x).toBe(1234);
		expect(parsed?.player.y).toBe(5678);
	});

	it('rejects invalid wallet and shop stock state', () => {
		const save = overworldSaveState();

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
		const save = { ...overworldSaveState(), seenDiscoveries: ['crossroads-waystone-sign'] };
		const parsed = parseSaveState(serializeSaveState(save));
		expect(parsed?.seenDiscoveries).toEqual(['crossroads-waystone-sign']);
	});

	it('rejects a non-string-array seenDiscoveries', () => {
		const bad = { ...overworldSaveState(), seenDiscoveries: [1, 2] } as unknown;
		expect(parseSaveState(JSON.stringify(bad))).toBeNull();
	});
});
