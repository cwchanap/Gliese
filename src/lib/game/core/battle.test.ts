import { describe, expect, it } from 'vitest';

import { enemies } from '$lib/game/content/enemies';
import { shrineOfAuroraInteriorMap } from '$lib/game/content/maps';
import { anchorPoint } from '$lib/game/content/maps/overworld/world';
import { applyExperienceGain } from '$lib/game/core/progression';
import { createEmptyEquipment } from '$lib/game/core/equipment';
import { deriveEffectiveStats, getHeroBaseStats } from '$lib/game/core/stats';
import { getStoryProgress } from '$lib/game/core/quests';
import { questStateAt } from '$lib/game/core/quests.fixtures';
import {
	createNewSaveState,
	normalizePlayerPosition,
	type SaveState
} from '$lib/game/save/save-state';
import {
	applyBattleResultToSaveState,
	buildBattleEnemyUnits,
	buildBattleUnitSourceId,
	groupBattleDrops,
	hitBattleEnemy,
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
			encounterId: 'raid-soldiers-lane',
			enemy: enemies['human-soldier']!,
			count: 3
		});

		expect(units).toEqual([
			expect.objectContaining({
				unitId: 'raid-soldiers-lane:unit:0',
				unitIndex: 0,
				enemyId: 'human-soldier',
				hp: 24,
				maxHp: 24,
				defeated: false
			}),
			expect.objectContaining({ unitId: 'raid-soldiers-lane:unit:1', unitIndex: 1 }),
			expect.objectContaining({ unitId: 'raid-soldiers-lane:unit:2', unitIndex: 2 })
		]);
		expect(buildBattleUnitSourceId('raid-soldiers-lane', 2)).toBe(
			'encounter:raid-soldiers-lane:unit:2'
		);
	});

	it('clamps battle enemy unit counts to the supported range', () => {
		expect(
			buildBattleEnemyUnits({
				encounterId: 'raid-soldiers-lane',
				enemy: enemies['human-soldier']!,
				count: Number.NaN
			})
		).toHaveLength(1);
		expect(
			buildBattleEnemyUnits({
				encounterId: 'raid-soldiers-lane',
				enemy: enemies['human-soldier']!,
				count: 0
			})
		).toHaveLength(1);
		expect(
			buildBattleEnemyUnits({
				encounterId: 'raid-soldiers-lane',
				enemy: enemies['human-soldier']!,
				count: 25
			})
		).toHaveLength(10);
	});

	it('never drops the unbeatable captain below 1 HP', () => {
		const [captain] = buildBattleEnemyUnits({
			encounterId: 'sun-crest-captain',
			enemy: enemies['sun-crest-captain']!,
			count: 1
		});
		const [wolf] = buildBattleEnemyUnits({
			encounterId: 'wildwood-wolves-mouth',
			enemy: enemies['forest-wolf']!,
			count: 1
		});

		expect(hitBattleEnemy(captain!, 10_000)).toBe(1);
		expect(hitBattleEnemy(captain!, 5)).toBe(captain!.hp - 5);
		expect(hitBattleEnemy(wolf!, 10_000)).toBe(0);
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

	function soldierUnits(count: number, drops = [{ itemId: 'field-potion', quantity: 1 }]) {
		return Array.from({ length: count }, (_, unitIndex) => ({
			unitId: `raid-soldiers-lane:unit:${unitIndex}`,
			unitIndex,
			enemyId: 'human-soldier',
			xpReward: 5,
			coinReward: 6,
			drops: unitIndex === 0 ? drops : []
		}));
	}

	function soldierVictory(saveState: SaveState, count: number): BattleResult {
		return {
			outcome: 'victory',
			sourceMapId: 'overworld',
			sourceEncounterId: 'raid-soldiers-lane',
			sourceEnemyId: 'human-soldier',
			finalHeroHp: 14,
			inventory: saveState.inventory,
			defeatedUnits: soldierUnits(count)
		};
	}

	function raidSaveState(): SaveState {
		const save = createNewSaveState();
		return {
			...save,
			mapId: 'overworld',
			player: { ...save.player, x: 1_200, y: 5_440, facing: 'down' },
			quests: questStateAt('repel-the-soldiers')
		};
	}

	it('applies a victory with per-unit rewards, drops, quest progress, and one cleared marker', () => {
		const saveState = raidSaveState();

		const application = applyBattleResultToSaveState(saveState, soldierVictory(saveState, 3));
		const expected = applyExperienceGain(
			{
				level: saveState.player.level,
				xp: saveState.player.xp,
				hp: 14,
				attack: saveState.player.attack
			},
			15
		);

		const { x, y } = application.saveState.player;
		expect(application.saveState.player).toMatchObject({
			...expected,
			facing: 'down'
		});
		// The input return point is blocked raid terrain, so final normalization
		// nudges it to the nearest walkable spot (checked against the resulting
		// story-gated geometry, like the fled-result regressions below).
		expect(
			normalizePlayerPosition('overworld', saveState.player, application.saveState.quests)
		).not.toEqual(saveState.player);
		expect(
			normalizePlayerPosition(
				'overworld',
				application.saveState.player,
				application.saveState.quests
			)
		).toEqual(application.saveState.player);
		expect(Math.hypot(x - 1_200, y - 5_440)).toBeLessThanOrEqual(128);
		expect(application.saveState.wallet.coins).toBe(saveState.wallet.coins + 18);
		expect(application.saveState.flags.clearedEncounters).toEqual(['raid-soldiers-lane']);
		expect(application.saveState.flags.clearedEncounterUnitCounts).toEqual({
			'raid-soldiers-lane': 3
		});
		expect(application.saveState.flags.resolvedEncounterDrops).toEqual({
			'raid-soldiers-lane': [{ itemId: 'field-potion', quantity: 1 }]
		});
		expect(application.saveState.quests.entries['prologue-raid']).toMatchObject({
			currentObjectiveId: 'repel-the-soldiers',
			progress: 3,
			countedSourceIds: [
				'encounter:raid-soldiers-lane:unit:0',
				'encounter:raid-soldiers-lane:unit:1',
				'encounter:raid-soldiers-lane:unit:2'
			]
		});
		expect(application.summary).toMatchObject({
			outcome: 'victory',
			enemiesDefeated: 3,
			xpGained: 15,
			coinsGained: 18,
			leveledUp: expected.level > saveState.player.level,
			drops: [{ itemId: 'field-potion', quantity: 1 }],
			completedQuestIds: [],
			questRewards: [],
			questProgress: [
				expect.objectContaining({
					questId: 'prologue-raid',
					objectiveId: 'repel-the-soldiers',
					previousProgress: 0,
					currentProgress: 3,
					target: 6
				})
			]
		});
	});

	it('reports a finished objective at its full count and moves the chain on', () => {
		const saveState = raidSaveState();

		const application = applyBattleResultToSaveState(saveState, soldierVictory(saveState, 6));

		expect(getStoryProgress(application.saveState.quests)).toEqual({
			questId: 'prologue-raid',
			objectiveId: 'reach-the-gate'
		});
		expect(application.summary?.questProgress).toEqual([
			expect.objectContaining({ objectiveId: 'repel-the-soldiers', currentProgress: 6, target: 6 })
		]);
	});

	it('does not count the same battle units twice', () => {
		const saveState = raidSaveState();
		const first = applyBattleResultToSaveState(saveState, soldierVictory(saveState, 2));

		const again = applyBattleResultToSaveState(first.saveState, soldierVictory(first.saveState, 2));

		expect(again.saveState.quests.entries['prologue-raid']?.progress).toBe(2);
		expect(again.summary?.questProgress).toEqual([]);
	});

	it('completes a scripted loss and queues its scene when the hero falls to the captain', () => {
		const saveState = { ...createNewSaveState(), quests: questStateAt('charge-the-captain') };

		const application = applyBattleResultToSaveState(saveState, {
			outcome: 'defeat',
			sourceMapId: 'overworld',
			sourceEncounterId: 'sun-crest-captain',
			sourceEnemyId: 'sun-crest-captain',
			finalHeroHp: 0,
			inventory: saveState.inventory,
			defeatedUnits: []
		});

		expect(application.saveState.mapId).toBe(shrineOfAuroraInteriorMap.id);
		expect(application.summary?.completedQuestIds).toEqual(['prologue-raid']);
		expect(getStoryProgress(application.saveState.quests)).toEqual({
			questId: 'prologue-escape',
			objectiveId: 'wake-in-the-shrine'
		});
		expect(application.saveState.quests.pendingEffects).toEqual([
			{ type: 'play-scene', sceneId: 'prologue.captain-sneers' }
		]);
	});

	it('wakes the hero in the shrine after an ordinary raid loss, without advancing the raid', () => {
		const saveState = raidSaveState();

		const application = applyBattleResultToSaveState(saveState, {
			outcome: 'defeat',
			sourceMapId: 'overworld',
			sourceEncounterId: 'raid-soldiers-lane',
			sourceEnemyId: 'human-soldier',
			finalHeroHp: 0,
			inventory: saveState.inventory,
			defeatedUnits: []
		});

		expect(application.saveState.mapId).toBe(shrineOfAuroraInteriorMap.id);
		expect(getStoryProgress(application.saveState.quests)).toEqual(
			getStoryProgress(saveState.quests)
		);
	});

	it('wakes the hero at the tunnel end after a loss on the escape, clear of the burning village', () => {
		const saveState = {
			...createNewSaveState(),
			mapId: 'ruins-threshold',
			quests: questStateAt('climb-to-the-ridge')
		};

		const application = applyBattleResultToSaveState(saveState, {
			outcome: 'defeat',
			sourceMapId: 'ruins-threshold',
			sourceEncounterId: 'threshold-crawlers',
			sourceEnemyId: 'tunnel-crawler',
			finalHeroHp: 0,
			inventory: saveState.inventory,
			defeatedUnits: []
		});

		expect(application.saveState.mapId).toBe('ruins-core');
		expect(application.saveState.player).toMatchObject({
			hp: 20,
			x: 5_376,
			y: 3_200,
			facing: 'left'
		});
	});

	it('applies a fled result by restoring the hero at the return position with no rewards', () => {
		const baseState = createNewSaveState();
		const saveState = {
			...baseState,
			mapId: 'ruins-threshold',
			player: {
				...baseState.player,
				x: 512,
				y: 3_200,
				facing: 'right' as const,
				hp: 6
			}
		};
		const result: BattleResult = {
			outcome: 'fled',
			sourceMapId: 'ruins-threshold',
			sourceEncounterId: 'threshold-crawlers',
			sourceEnemyId: 'tunnel-crawler',
			finalHeroHp: 6,
			inventory: saveState.inventory,
			defeatedUnits: [
				{
					unitId: 'threshold-crawlers:unit:0',
					unitIndex: 0,
					enemyId: 'tunnel-crawler',
					xpReward: 4,
					coinReward: 4,
					drops: [{ itemId: 'field-potion', quantity: 1 }]
				}
			]
		};

		const application = applyBattleResultToSaveState(saveState, result);

		expect(application.summary).toBeNull();
		expect(application.saveState.mapId).toBe('ruins-threshold');
		expect(application.saveState.player).toMatchObject({
			hp: 6,
			x: 512,
			y: 3_200,
			facing: 'right'
		});
		expect(application.saveState.inventory).toEqual(saveState.inventory);
		expect(application.saveState.wallet).toEqual(saveState.wallet);
		expect(application.saveState.flags.clearedEncounters).toEqual([]);
		expect(application.saveState.flags.clearedEncounterUnitCounts).toEqual({});
		expect(application.saveState.flags.resolvedEncounterDrops).toEqual({});
		expect(application.saveState.quests).toEqual(saveState.quests);
		// Fled grants no XP and never levels the hero, even with defeated units carried.
		expect(application.saveState.player).toMatchObject({
			level: saveState.player.level,
			xp: saveState.player.xp
		});
	});

	function mistfenFledResult(encounterId: string): BattleResult {
		return {
			outcome: 'fled',
			sourceMapId: 'overworld',
			sourceEncounterId: encounterId,
			sourceEnemyId: 'mist-toad',
			finalHeroHp: 8,
			inventory: createNewSaveState().inventory,
			defeatedUnits: []
		};
	}

	// Walkability as normalizePlayerPosition sees it: the story-gated overworld
	// grid and obstacles at the save's own story progress.
	it('keeps a walkable Mistfen return position identical when applying a fled result', () => {
		const reeds = anchorPoint('mistfen-toads-reeds');
		const saveState = {
			...createNewSaveState(),
			mapId: 'overworld',
			player: { ...createNewSaveState().player, ...reeds, facing: 'right' as const },
			quests: questStateAt('gather-moonmoss')
		};
		expect(normalizePlayerPosition('overworld', saveState.player, saveState.quests)).toEqual(
			saveState.player
		);

		const application = applyBattleResultToSaveState(
			saveState,
			mistfenFledResult('mistfen-toads-reeds')
		);

		expect(application.saveState.player).toMatchObject({
			x: reeds.x,
			y: reeds.y,
			facing: 'right'
		});
	});

	it('returns to the position captured in the battle-start save', () => {
		const save = createNewSaveState();
		const reeds = anchorPoint('mistfen-toads-reeds');
		const saveState = {
			...save,
			mapId: 'overworld',
			player: { ...save.player, ...reeds, facing: 'right' as const },
			quests: questStateAt('gather-moonmoss')
		};
		const result = {
			outcome: 'fled',
			sourceMapId: 'overworld',
			sourceEncounterId: 'mistfen-toads-reeds',
			sourceEnemyId: 'mist-toad',
			finalHeroHp: 8,
			inventory: save.inventory,
			defeatedUnits: []
		} as BattleResult;

		const application = applyBattleResultToSaveState(saveState, result);
		expect(application.saveState.player).toMatchObject({ ...reeds, facing: 'right', hp: 8 });
	});

	it('nudges a blocked Mistfen-area return to walkable ground when applying a fled result', () => {
		const pool = anchorPoint('mistfen-toads-pool');
		const stranded = { x: pool.x, y: pool.y + 64 };
		const saveState = {
			...createNewSaveState(),
			mapId: 'overworld',
			player: { ...createNewSaveState().player, ...stranded, facing: 'up' as const },
			quests: questStateAt('gather-moonmoss')
		};
		// The old enemy-home offset: two tiles south of the pool pack, inside the
		// pond basin, which the story-gated Mistfen geometry blocks.
		expect(normalizePlayerPosition('overworld', saveState.player, saveState.quests)).not.toEqual(
			saveState.player
		);

		const application = applyBattleResultToSaveState(
			saveState,
			mistfenFledResult('mistfen-toads-pool')
		);

		const { x, y } = application.saveState.player;
		expect(
			normalizePlayerPosition(
				'overworld',
				application.saveState.player,
				application.saveState.quests
			)
		).toEqual(application.saveState.player);
		expect(Math.hypot(x - stranded.x, y - stranded.y)).toBeLessThanOrEqual(128);
	});

	it('applies a defeat result by sending the hero to the Shrine at full effective HP without rewards', () => {
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
			sourceEncounterId: 'threshold-crawlers',
			sourceEnemyId: 'tunnel-crawler',
			finalHeroHp: 0,
			inventory: saveState.inventory,
			defeatedUnits: []
		};

		const application = applyBattleResultToSaveState(saveState, result);

		expect(application.saveState.mapId).toBe(shrineOfAuroraInteriorMap.id);
		expect(application.saveState.player).toMatchObject({
			hp: 20,
			x: shrineOfAuroraInteriorMap.spawn.x,
			y: shrineOfAuroraInteriorMap.spawn.y,
			facing: shrineOfAuroraInteriorMap.spawnDirection
		});
		expect(application.saveState.wallet).toEqual(saveState.wallet);
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

	it('restores the full level-and-equipment-adjusted max HP on defeat', () => {
		const saveState = {
			...createNewSaveState(),
			mapId: 'ruins-threshold',
			player: {
				...createNewSaveState().player,
				level: 5,
				hp: 1
			},
			equipment: { ...createEmptyEquipment(), body: 'stone-mail' }
		};

		const application = applyBattleResultToSaveState(saveState, {
			outcome: 'defeat',
			sourceMapId: 'ruins-threshold',
			sourceEncounterId: 'threshold-crawlers',
			sourceEnemyId: 'tunnel-crawler',
			finalHeroHp: 0,
			inventory: saveState.inventory,
			defeatedUnits: []
		});

		expect(application.saveState.player.hp).toBe(
			deriveEffectiveStats(getHeroBaseStats(saveState.player), saveState.equipment).maxHp
		);
	});
});
