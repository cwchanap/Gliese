import { enemies, type EnemyCombatDefinition } from '$lib/game/content/enemies';
import { shrineOfAuroraInteriorMap } from '$lib/game/content/maps';
import { resolveHit } from '$lib/game/core/combat';
import { grantItems } from '$lib/game/core/equipment';
import type { ItemDrop } from '$lib/game/core/loot';
import { applyExperienceGain } from '$lib/game/core/progression';
import {
	applyQuestEvent,
	getCurrentObjective,
	questEventAdvanced,
	type QuestProgressUpdate,
	type QuestRewardGrant
} from '$lib/game/core/quests';
import type { QuestId } from '$lib/game/content/quests';
import { deriveEffectiveStats, getHeroBaseStats } from '$lib/game/core/stats';
import { normalizePlayerPosition, type SaveState } from '$lib/game/save/save-state';

/** A fight holds at most four enemies: the Snare arena has room for four spawn rows. */
export const battleEnemyCountRange = { min: 1, max: 4 } as const;

export type BattleOutcome = 'victory' | 'defeat' | 'fled';

export type BattleEnemyUnit = {
	unitId: string;
	unitIndex: number;
	enemyId: string;
	hp: number;
	maxHp: number;
	attack: number;
	moveSpeed: number;
	xpReward: number;
	coinReward: number;
	defeated: boolean;
};

export type BattleDefeatedUnit = {
	unitId: string;
	unitIndex: number;
	enemyId: string;
	xpReward: number;
	coinReward: number;
	drops: ItemDrop[];
};

export type BattleStartPayload = {
	saveState: SaveState;
	sourceMapId: string;
	sourceEncounterId: string;
	sourceEnemyId: string;
	enemyCount: number;
	hero: {
		hp: number;
		maxHp: number;
		attack: number;
		defense: number;
	};
};

export type BattleResult = {
	outcome: BattleOutcome;
	sourceMapId: string;
	sourceEncounterId: string;
	sourceEnemyId: string;
	finalHeroHp: number;
	inventory: SaveState['inventory'];
	defeatedUnits: BattleDefeatedUnit[];
};

/**
 * Marks the encounter the player just fled so the field can suppress an
 * instant re-trigger.
 */
export type RecentlyFledEncounter = {
	encounterId: string;
};

export type BattleSummary = {
	outcome: Extract<BattleOutcome, 'victory' | 'defeat'>;
	enemiesDefeated: number;
	xpGained: number;
	coinsGained: number;
	drops: ItemDrop[];
	leveledUp: boolean;
	completedQuestIds: string[];
	questRewards: QuestRewardGrant[];
	questProgress: QuestProgressUpdate[];
};

export type BattleApplication = {
	saveState: SaveState;
	summary: BattleSummary | null;
	completedQuestIds: QuestId[];
};

export function rollBattleEnemyCount(random: () => number = Math.random): number {
	const roll = Math.min(Math.max(random(), 0), 0.999_999);
	const span = battleEnemyCountRange.max - battleEnemyCountRange.min + 1;
	return battleEnemyCountRange.min + Math.floor(roll * span);
}

export function buildBattleUnitId(encounterId: string, unitIndex: number): string {
	return `${encounterId}:unit:${unitIndex}`;
}

function buildBattleUnitSourceSuffix(unitIndex: number): string {
	return `unit:${unitIndex}`;
}

export function buildBattleUnitSourceId(encounterId: string, unitIndex: number): string {
	return `encounter:${encounterId}:${buildBattleUnitSourceSuffix(unitIndex)}`;
}

export function buildBattleEnemyUnits({
	encounterId,
	enemy,
	count
}: {
	encounterId: string;
	enemy: EnemyCombatDefinition;
	count: number;
}): BattleEnemyUnit[] {
	const safeCount = normalizeBattleEnemyCount(count);

	return Array.from({ length: safeCount }, (_, unitIndex) => ({
		unitId: buildBattleUnitId(encounterId, unitIndex),
		unitIndex,
		enemyId: enemy.id,
		hp: enemy.baseHp,
		maxHp: enemy.baseHp,
		attack: enemy.baseAttack,
		moveSpeed: enemy.moveSpeed,
		xpReward: enemy.xpReward,
		coinReward: enemy.coinReward,
		defeated: false
	}));
}

export function groupBattleDrops(drops: ItemDrop[]): ItemDrop[] {
	const quantities = new Map<string, number>();

	for (const drop of drops) {
		quantities.set(drop.itemId, (quantities.get(drop.itemId) ?? 0) + drop.quantity);
	}

	return Array.from(quantities.entries()).map(([itemId, quantity]) => ({ itemId, quantity }));
}

export function applyBattleResultToSaveState(
	saveState: SaveState,
	result: BattleResult
): BattleApplication {
	const application =
		result.outcome === 'defeat'
			? applyBattleDefeat(saveState, result)
			: result.outcome === 'fled'
				? applyBattleFled(saveState, result)
				: applyBattleVictory(saveState, result);

	// Every outcome's final resting point is validated in one place: a blocked
	// return (or respawn) would strand Grik inside collision on load.
	return {
		...application,
		saveState: {
			...application.saveState,
			player: normalizePlayerPosition(
				application.saveState.mapId,
				application.saveState.player,
				application.saveState.quests
			)
		}
	};
}

function applyBattleVictory(saveState: SaveState, result: BattleResult): BattleApplication {
	const defeatedUnits = result.defeatedUnits;
	const xpGained = defeatedUnits.reduce((total, unit) => total + unit.xpReward, 0);
	const coinsGained = defeatedUnits.reduce((total, unit) => total + unit.coinReward, 0);
	const drops = groupBattleDrops(defeatedUnits.flatMap((unit) => unit.drops));
	const previousLevel = saveState.player.level;

	let progression = applyExperienceGain(
		{
			level: saveState.player.level,
			xp: saveState.player.xp,
			hp: result.finalHeroHp,
			attack: saveState.player.attack
		},
		xpGained
	);
	let quests = saveState.quests;
	const questRewards: QuestRewardGrant[] = [];
	const completedQuestIds: QuestId[] = [];
	const allProgressUpdates: QuestProgressUpdate[] = [];

	for (const unit of defeatedUnits) {
		const questResult = applyQuestEvent({
			state: quests,
			event: {
				type: 'defeat-enemy',
				mapId: result.sourceMapId,
				encounterId: result.sourceEncounterId,
				enemyId: unit.enemyId,
				sourceId: buildBattleUnitSourceSuffix(unit.unitIndex)
			}
		});
		quests = questResult.state;
		questRewards.push(...questResult.rewards);
		completedQuestIds.push(...questResult.completedQuestIds);
		allProgressUpdates.push(...questResult.progressUpdates);
	}

	for (const grant of questRewards) {
		if (grant.reward.xp) {
			progression = applyExperienceGain(progression, grant.reward.xp);
		}
	}

	const questRewardItems = questRewards.flatMap((grant) =>
		(grant.reward.items ?? []).map((item) => ({
			itemId: item.itemId,
			quantity: item.quantity
		}))
	);
	// Victory loot and quest reward items follow the same non-shop grant
	// policy as field rewards: new gear may auto-equip, replaced gear stays owned.
	const granted = grantItems({ inventory: result.inventory, equipment: saveState.equipment }, [
		...drops,
		...questRewardItems
	]);

	const nextSaveState: SaveState = {
		...saveState,
		player: {
			...saveState.player,
			level: progression.level,
			xp: progression.xp,
			hp: progression.hp,
			attack: progression.attack
		},
		flags: {
			...saveState.flags,
			clearedEncounters: Array.from(
				new Set([...saveState.flags.clearedEncounters, result.sourceEncounterId])
			).sort(),
			clearedEncounterUnitCounts: {
				...saveState.flags.clearedEncounterUnitCounts,
				[result.sourceEncounterId]: Math.max(
					saveState.flags.clearedEncounterUnitCounts[result.sourceEncounterId] ?? 0,
					defeatedUnits.length
				)
			},
			resolvedEncounterDrops: {
				...saveState.flags.resolvedEncounterDrops,
				[result.sourceEncounterId]: drops
			}
		},
		inventory: granted.inventory,
		equipment: granted.equipment,
		wallet: {
			coins:
				saveState.wallet.coins +
				coinsGained +
				questRewards.reduce((total, grant) => total + (grant.reward.coins ?? 0), 0)
		},
		quests
	};

	const questRewardXp = questRewards.reduce((total, grant) => total + (grant.reward.xp ?? 0), 0);
	const questRewardCoins = questRewards.reduce(
		(total, grant) => total + (grant.reward.coins ?? 0),
		0
	);
	const combinedDrops = groupBattleDrops([...drops, ...questRewardItems]);

	const completedQuestIdSet = new Set(completedQuestIds);
	const questProgressMap = new Map<string, QuestProgressUpdate>();
	for (const update of allProgressUpdates) {
		if (completedQuestIdSet.has(update.questId)) continue;
		const existing = questProgressMap.get(update.questId);
		if (!existing || update.currentProgress > existing.currentProgress) {
			questProgressMap.set(update.questId, {
				...update,
				previousProgress: Math.min(
					update.previousProgress,
					existing?.previousProgress ?? update.previousProgress
				)
			});
		}
	}
	const questProgress = Array.from(questProgressMap.values());

	const uniqueCompletedQuestIds = Array.from(new Set(completedQuestIds));

	return {
		saveState: nextSaveState,
		completedQuestIds: uniqueCompletedQuestIds,
		summary: {
			outcome: 'victory',
			enemiesDefeated: defeatedUnits.length,
			xpGained: xpGained + questRewardXp,
			coinsGained: coinsGained + questRewardCoins,
			drops: combinedDrops,
			leveledUp: progression.level > previousLevel,
			completedQuestIds: uniqueCompletedQuestIds,
			questRewards,
			questProgress
		}
	};
}

function applyBattleFled(saveState: SaveState, result: BattleResult): BattleApplication {
	return {
		saveState: {
			...saveState,
			player: {
				...saveState.player,
				hp: result.finalHeroHp
			},
			inventory: result.inventory
		},
		completedQuestIds: [],
		summary: null
	};
}

export function normalizeBattleEnemyCount(count: number): number {
	const finiteCount = Number.isFinite(count) ? count : battleEnemyCountRange.min;

	return Math.min(
		Math.max(Math.trunc(finiteCount), battleEnemyCountRange.min),
		battleEnemyCountRange.max
	);
}

/**
 * The hero falls and wakes at full effective HP — level- and equipment-adjusted —
 * in the Shrine of Aurora, or where the current objective's `respawn` says. A
 * fall can also be the story's own beat: it reports `lose-battle` so a
 * scripted loss completes.
 */
function applyBattleDefeat(saveState: SaveState, result: BattleResult): BattleApplication {
	const shrine = shrineOfAuroraInteriorMap;
	const questResult = applyQuestEvent({
		state: saveState.quests,
		event: { type: 'lose-battle', enemyId: result.sourceEnemyId }
	});
	// A fall that actually completes its `lose-battle` objective is the story's
	// own beat: no summary — the queued scene takes over directly. Any other
	// defeat keeps the standard summary.
	const scriptedLoss = questEventAdvanced(questResult);
	const wake = getCurrentObjective(questResult.state)?.respawn ?? {
		mapId: shrine.id,
		...shrine.spawn,
		facing: shrine.spawnDirection
	};
	// Scripted-loss reward items follow the same non-shop grant policy: new
	// gear may auto-equip, so the wake-up restore reads the post-grant loadout.
	const granted = grantItems(
		{ inventory: result.inventory, equipment: saveState.equipment },
		questResult.rewards.flatMap((grant) => grant.reward.items ?? [])
	);
	const fullHp = deriveEffectiveStats(getHeroBaseStats(saveState.player), granted.equipment).maxHp;

	return {
		saveState: {
			...saveState,
			mapId: wake.mapId,
			player: {
				...saveState.player,
				hp: fullHp,
				x: wake.x,
				y: wake.y,
				facing: wake.facing
			},
			inventory: granted.inventory,
			equipment: granted.equipment,
			quests: questResult.state
		},
		completedQuestIds: questResult.completedQuestIds,
		summary: scriptedLoss
			? null
			: {
					outcome: 'defeat',
					enemiesDefeated: 0,
					xpGained: 0,
					coinsGained: 0,
					drops: [],
					leveledUp: false,
					completedQuestIds: questResult.completedQuestIds,
					questRewards: questResult.rewards,
					questProgress: []
				}
	};
}

/** The enemy's HP after a hero hit. An unbeatable enemy never drops below 1 HP. */
export function hitBattleEnemy(unit: BattleEnemyUnit, power: number): number {
	const hp = resolveHit({ hp: unit.hp, defense: 0 }, { power }).hp;
	return enemies[unit.enemyId]?.unbeatable ? Math.max(1, hp) : hp;
}

export function getBattleEnemyDefinition(enemyId: string): EnemyCombatDefinition {
	const definition = enemies[enemyId];
	if (!definition) {
		throw new Error(`Unknown enemy ID: "${enemyId}"`);
	}
	return definition;
}
