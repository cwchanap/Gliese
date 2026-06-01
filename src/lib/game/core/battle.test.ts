import { describe, expect, it } from 'vitest';

import { enemies } from '$lib/game/content/enemies';
import { shrineOfAuroraInteriorMap } from '$lib/game/content/maps';
import { mainQuestId } from '$lib/game/content/quests';
import { acceptQuest, applyQuestEvent } from '$lib/game/core/quests';
import { createNewSaveState } from '$lib/game/save/save-state';
import {
	applyBattleResultToSaveState,
	buildBattleEnemyUnits,
	buildBattleUnitSourceId,
	groupBattleDrops,
	rollBattleEnemyCount,
	type BattleResult
} from './battle';

describe('battle contracts', () => {
	it('rolls an inclusive 1 to 10 enemy count', () => {
		expect(rollBattleEnemyCount(() => 0)).toBe(1);
		expect(rollBattleEnemyCount(() => 0.999)).toBe(10);
		expect(rollBattleEnemyCount(() => 0.5)).toBe(6);
	});

	it('creates indexed enemy units from one world encounter', () => {
		const units = buildBattleEnemyUnits({
			encounterId: 'meadow-slime-west',
			enemy: enemies['slime-scout']!,
			count: 3
		});

		expect(units).toEqual([
			expect.objectContaining({
				unitId: 'meadow-slime-west:unit:0',
				unitIndex: 0,
				enemyId: 'slime-scout',
				hp: 8,
				maxHp: 8,
				defeated: false
			}),
			expect.objectContaining({ unitId: 'meadow-slime-west:unit:1', unitIndex: 1 }),
			expect.objectContaining({ unitId: 'meadow-slime-west:unit:2', unitIndex: 2 })
		]);
		expect(buildBattleUnitSourceId('meadow-slime-west', 2)).toBe(
			'encounter:meadow-slime-west:unit:2'
		);
	});

	it('clamps battle enemy unit counts to the supported range', () => {
		expect(
			buildBattleEnemyUnits({
				encounterId: 'meadow-slime-west',
				enemy: enemies['slime-scout']!,
				count: Number.NaN
			})
		).toHaveLength(1);
		expect(
			buildBattleEnemyUnits({
				encounterId: 'meadow-slime-west',
				enemy: enemies['slime-scout']!,
				count: 0
			})
		).toHaveLength(1);
		expect(
			buildBattleEnemyUnits({
				encounterId: 'meadow-slime-west',
				enemy: enemies['slime-scout']!,
				count: 25
			})
		).toHaveLength(10);
	});

	it('groups repeated item drops for summary display', () => {
		expect(
			groupBattleDrops([
				{ itemId: 'field-potion', quantity: 1 },
				{ itemId: 'field-potion', quantity: 2 },
				{ itemId: 'greater-field-potion', quantity: 1 }
			])
		).toEqual([
			{ itemId: 'field-potion', quantity: 3 },
			{ itemId: 'greater-field-potion', quantity: 1 }
		]);
	});

	it('lets battle units count as separate quest sources without changing encounter identity', () => {
		const accepted = acceptQuest({
			state: {
				...createNewSaveState().quests,
				completedObjectives: { [mainQuestId]: ['talk-to-guild-master'] }
			},
			questId: 'thin-village-slimes',
			worldFlags: {
				clearedEncounterIds: new Set(),
				clearedEncounterUnitCounts: {},
				collectedPickupIds: new Set()
			}
		});
		expect(accepted.accepted).toBe(true);

		const first = applyQuestEvent({
			state: accepted.accepted ? accepted.state : createNewSaveState().quests,
			event: {
				type: 'defeat-enemy',
				mapId: 'meadow-entry',
				encounterId: 'meadow-slime-west',
				enemyId: 'slime-scout',
				sourceId: 'unit:0'
			}
		});
		const second = applyQuestEvent({
			state: first.state,
			event: {
				type: 'defeat-enemy',
				mapId: 'meadow-entry',
				encounterId: 'meadow-slime-west',
				enemyId: 'slime-scout',
				sourceId: 'unit:1'
			}
		});

		expect(second.state.entries['thin-village-slimes']).toMatchObject({
			progress: 2,
			countedSourceIds: ['encounter:meadow-slime-west:unit:0', 'encounter:meadow-slime-west:unit:1']
		});
	});

	it('applies a victory result with per-unit rewards, drops, quest progress, and one cleared marker', () => {
		const accepted = acceptQuest({
			state: {
				...createNewSaveState().quests,
				completedObjectives: { [mainQuestId]: ['talk-to-guild-master'] }
			},
			questId: 'thin-village-slimes',
			worldFlags: {
				clearedEncounterIds: new Set(),
				clearedEncounterUnitCounts: {},
				collectedPickupIds: new Set()
			}
		});
		expect(accepted.accepted).toBe(true);

		const saveState = {
			...createNewSaveState(),
			quests: accepted.accepted ? accepted.state : createNewSaveState().quests
		};
		const result: BattleResult = {
			outcome: 'victory',
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			completion: undefined,
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			finalHeroHp: 14,
			inventory: saveState.inventory,
			defeatedUnits: [
				{
					unitId: 'meadow-slime-west:unit:0',
					unitIndex: 0,
					enemyId: 'slime-scout',
					xpReward: 4,
					coinReward: 4,
					drops: [{ itemId: 'field-potion', quantity: 1 }]
				},
				{
					unitId: 'meadow-slime-west:unit:1',
					unitIndex: 1,
					enemyId: 'slime-scout',
					xpReward: 4,
					coinReward: 4,
					drops: []
				},
				{
					unitId: 'meadow-slime-west:unit:2',
					unitIndex: 2,
					enemyId: 'slime-scout',
					xpReward: 4,
					coinReward: 4,
					drops: [{ itemId: 'field-potion', quantity: 1 }]
				}
			]
		};

		const application = applyBattleResultToSaveState(saveState, result);

		expect(application.saveState.player).toMatchObject({
			hp: 18,
			level: 2,
			xp: 18,
			attack: 4,
			x: 4_928,
			y: 1_024,
			facing: 'down'
		});
		expect(application.saveState.wallet.coins).toBe(54);
		expect(application.saveState.flags.clearedEncounters).toEqual(['meadow-slime-west']);
		expect(application.saveState.flags.clearedEncounterUnitCounts).toEqual({
			'meadow-slime-west': 3
		});
		expect(application.saveState.flags.resolvedEncounterDrops).toEqual({
			'meadow-slime-west': [{ itemId: 'field-potion', quantity: 2 }]
		});
		expect(application.saveState.inventory.stacks).toEqual([
			{ itemId: 'field-potion', quantity: 4 }
		]);
		expect(application.saveState.quests.entries['thin-village-slimes']).toMatchObject({
			status: 'completed',
			progress: 3,
			countedSourceIds: [
				'encounter:meadow-slime-west:unit:0',
				'encounter:meadow-slime-west:unit:1',
				'encounter:meadow-slime-west:unit:2'
			]
		});
		expect(application.summary).toMatchObject({
			outcome: 'victory',
			enemiesDefeated: 3,
			xpGained: 18,
			coinsGained: 24,
			leveledUp: true,
			drops: [{ itemId: 'field-potion', quantity: 3 }],
			completedQuestIds: ['thin-village-slimes'],
			questRewards: [
				expect.objectContaining({
					questId: 'thin-village-slimes',
					reward: {
						xp: 6,
						coins: 12,
						items: [{ itemId: 'field-potion', quantity: 1 }]
					}
				})
			],
			questProgress: []
		});
	});

	it('includes questProgress for quests advanced but not completed in the summary', () => {
		const accepted = acceptQuest({
			state: {
				...createNewSaveState().quests,
				completedObjectives: { [mainQuestId]: ['talk-to-guild-master'] }
			},
			questId: 'thin-village-slimes',
			worldFlags: {
				clearedEncounterIds: new Set(),
				clearedEncounterUnitCounts: {},
				collectedPickupIds: new Set()
			}
		});
		expect(accepted.accepted).toBe(true);

		const saveState = {
			...createNewSaveState(),
			quests: accepted.accepted ? accepted.state : createNewSaveState().quests
		};
		const result: BattleResult = {
			outcome: 'victory',
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			completion: undefined,
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			finalHeroHp: 14,
			inventory: saveState.inventory,
			defeatedUnits: [
				{
					unitId: 'meadow-slime-west:unit:0',
					unitIndex: 0,
					enemyId: 'slime-scout',
					xpReward: 4,
					coinReward: 4,
					drops: []
				}
			]
		};

		const application = applyBattleResultToSaveState(saveState, result);

		expect(application.summary.questProgress).toEqual([
			{
				questId: 'thin-village-slimes',
				title: 'Thin Village Slimes',
				objectiveId: 'defeat-village-slimes',
				progressLabel: 'Village slimes defeated',
				previousProgress: 0,
				currentProgress: 1,
				target: 3
			}
		]);
		expect(application.summary.questRewards).toEqual([]);
		expect(application.summary.completedQuestIds).toEqual([]);
	});

	it('coalesces questProgress to the highest progress per quest when multiple enemies advance the same quest', () => {
		const accepted = acceptQuest({
			state: {
				...createNewSaveState().quests,
				completedObjectives: { [mainQuestId]: ['talk-to-guild-master'] }
			},
			questId: 'thin-village-slimes',
			worldFlags: {
				clearedEncounterIds: new Set(),
				clearedEncounterUnitCounts: {},
				collectedPickupIds: new Set()
			}
		});
		expect(accepted.accepted).toBe(true);

		const saveState = {
			...createNewSaveState(),
			quests: accepted.accepted ? accepted.state : createNewSaveState().quests
		};
		const result: BattleResult = {
			outcome: 'victory',
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			completion: undefined,
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			finalHeroHp: 14,
			inventory: saveState.inventory,
			defeatedUnits: [
				{
					unitId: 'meadow-slime-west:unit:0',
					unitIndex: 0,
					enemyId: 'slime-scout',
					xpReward: 4,
					coinReward: 4,
					drops: []
				},
				{
					unitId: 'meadow-slime-west:unit:1',
					unitIndex: 1,
					enemyId: 'slime-scout',
					xpReward: 4,
					coinReward: 4,
					drops: []
				}
			]
		};

		const application = applyBattleResultToSaveState(saveState, result);

		expect(application.summary.questProgress).toEqual([
			{
				questId: 'thin-village-slimes',
				title: 'Thin Village Slimes',
				objectiveId: 'defeat-village-slimes',
				progressLabel: 'Village slimes defeated',
				previousProgress: 0,
				currentProgress: 2,
				target: 3
			}
		]);
		expect(application.summary.questRewards).toEqual([]);
		expect(application.summary.completedQuestIds).toEqual([]);
	});

	it('applies a defeat result by sending the hero to the Shrine at 1 HP without rewards', () => {
		const saveState = {
			...createNewSaveState(),
			mapId: 'ruins-threshold',
			player: {
				...createNewSaveState().player,
				x: 512,
				y: 3_200,
				facing: 'right' as const,
				hp: 6
			}
		};
		const result: BattleResult = {
			outcome: 'defeat',
			sourceMapId: 'ruins-threshold',
			sourceEncounterId: 'threshold-slime-west',
			sourceEnemyId: 'slime-scout',
			completion: undefined,
			returnPosition: { mapId: 'ruins-threshold', x: 512, y: 3_200, facing: 'right' },
			finalHeroHp: 0,
			inventory: saveState.inventory,
			defeatedUnits: []
		};

		const application = applyBattleResultToSaveState(saveState, result);

		expect(application.saveState.mapId).toBe(shrineOfAuroraInteriorMap.id);
		expect(application.saveState.player).toMatchObject({
			hp: 1,
			x: shrineOfAuroraInteriorMap.spawn.x,
			y: shrineOfAuroraInteriorMap.spawn.y,
			facing: shrineOfAuroraInteriorMap.spawnDirection
		});
		expect(application.saveState.wallet.coins).toBe(30);
		expect(application.saveState.flags.clearedEncounters).toEqual([]);
		expect(application.saveState.flags.clearedEncounterUnitCounts).toEqual({});
		expect(application.saveState.flags.resolvedEncounterDrops).toEqual({});
		expect(application.summary).toMatchObject({
			outcome: 'defeat',
			enemiesDefeated: 0,
			xpGained: 0,
			coinsGained: 0,
			drops: []
		});
	});
});
