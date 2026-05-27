import { enemies, type EnemyCombatDefinition } from '$lib/game/content/enemies';
import { maps, openingMapId } from '$lib/game/content/maps';
import { addItem } from '$lib/game/core/inventory';
import type { ItemDrop } from '$lib/game/core/loot';
import { applyExperienceGain, type ProgressionState } from '$lib/game/core/progression';
import { applyQuestEvent, type QuestRewardGrant } from '$lib/game/core/quests';
import type { Direction } from '$lib/game/core/types';
import type { SaveState } from '$lib/game/save/save-state';

export const battleEnemyCountRange = { min: 1, max: 10 } as const;

export type BattleOutcome = 'victory' | 'defeat';

export type BattleReturnPosition = {
	mapId: string;
	x: number;
	y: number;
	facing: Direction;
};

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
	completion?: 'victory';
	returnPosition: BattleReturnPosition;
	enemyCount: number;
	hero: {
		hp: number;
		maxHp: number;
		attack: number;
		defense: number;
	};
	persistExplorationChanges?: boolean;
};

export type BattleResult = {
	outcome: BattleOutcome;
	sourceMapId: string;
	sourceEncounterId: string;
	sourceEnemyId: string;
	completion?: 'victory';
	returnPosition: BattleReturnPosition;
	finalHeroHp: number;
	inventory: SaveState['inventory'];
	defeatedUnits: BattleDefeatedUnit[];
};

export type BattleSummary = {
	outcome: BattleOutcome;
	enemiesDefeated: number;
	xpGained: number;
	coinsGained: number;
	drops: ItemDrop[];
	leveledUp: boolean;
	completedQuestIds: string[];
	questRewards: QuestRewardGrant[];
};

export type BattleApplication = {
	saveState: SaveState;
	summary: BattleSummary;
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
	if (result.outcome === 'defeat') {
		return applyBattleDefeat(saveState, result);
	}

	return applyBattleVictory(saveState, result);
}

function applyBattleVictory(saveState: SaveState, result: BattleResult): BattleApplication {
	const defeatedUnits = result.defeatedUnits;
	const xpGained = defeatedUnits.reduce((total, unit) => total + unit.xpReward, 0);
	const coinsGained = defeatedUnits.reduce((total, unit) => total + unit.coinReward, 0);
	const drops = groupBattleDrops(defeatedUnits.flatMap((unit) => unit.drops));
	const previousLevel = saveState.player.level;
	let inventory = result.inventory;

	for (const drop of drops) {
		inventory = addItem(inventory, drop.itemId, drop.quantity);
	}

	let progression = applyProgressionReward(
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
	const completedQuestIds: string[] = [];

	for (const unit of defeatedUnits) {
		const questResult = applyQuestEvent({
			state: quests,
			event: {
				type: 'defeat-enemy',
				mapId: result.sourceMapId,
				encounterId: result.sourceEncounterId,
				enemyId: unit.enemyId,
				completion: result.completion,
				sourceId: buildBattleUnitSourceSuffix(unit.unitIndex)
			}
		});
		quests = questResult.state;
		questRewards.push(...questResult.rewards);
		completedQuestIds.push(...questResult.completedQuestIds);
	}

	for (const grant of questRewards) {
		if (grant.reward.xp) {
			progression = applyProgressionReward(progression, grant.reward.xp);
		}

		for (const item of grant.reward.items ?? []) {
			inventory = addItem(inventory, item.itemId, item.quantity);
		}
	}

	const nextSaveState: SaveState = {
		...saveState,
		mapId: result.returnPosition.mapId,
		player: {
			...saveState.player,
			level: progression.level,
			xp: progression.xp,
			hp: progression.hp,
			attack: progression.attack,
			x: result.returnPosition.x,
			y: result.returnPosition.y,
			facing: result.returnPosition.facing
		},
		flags: {
			...saveState.flags,
			clearedEncounters: Array.from(
				new Set([...saveState.flags.clearedEncounters, result.sourceEncounterId])
			).sort(),
			clearedEncounterUnitCounts: {
				...saveState.flags.clearedEncounterUnitCounts,
				[result.sourceEncounterId]: defeatedUnits.length
			},
			resolvedEncounterDrops: {
				...saveState.flags.resolvedEncounterDrops,
				[result.sourceEncounterId]: drops
			}
		},
		inventory,
		wallet: {
			coins:
				saveState.wallet.coins +
				coinsGained +
				questRewards.reduce((total, grant) => total + (grant.reward.coins ?? 0), 0)
		},
		quests
	};

	return {
		saveState: nextSaveState,
		summary: {
			outcome: 'victory',
			enemiesDefeated: defeatedUnits.length,
			xpGained,
			coinsGained,
			drops,
			leveledUp: progression.level > previousLevel,
			completedQuestIds: Array.from(new Set(completedQuestIds)),
			questRewards
		}
	};
}

function normalizeBattleEnemyCount(count: number): number {
	const finiteCount = Number.isFinite(count) ? count : battleEnemyCountRange.min;

	return Math.min(
		Math.max(Math.trunc(finiteCount), battleEnemyCountRange.min),
		battleEnemyCountRange.max
	);
}

function applyBattleDefeat(saveState: SaveState, result: BattleResult): BattleApplication {
	const meadowEntry = maps[openingMapId]!;

	return {
		saveState: {
			...saveState,
			mapId: openingMapId,
			player: {
				...saveState.player,
				hp: 1,
				x: meadowEntry.spawn.x,
				y: meadowEntry.spawn.y,
				facing: meadowEntry.spawnDirection
			},
			inventory: result.inventory
		},
		summary: {
			outcome: 'defeat',
			enemiesDefeated: 0,
			xpGained: 0,
			coinsGained: 0,
			drops: [],
			leveledUp: false,
			completedQuestIds: [],
			questRewards: []
		}
	};
}

function applyProgressionReward(state: ProgressionState, xpReward: number): ProgressionState {
	if (xpReward <= 0) {
		return state;
	}

	if (state.level === 1) {
		return applyExperienceGain(state, xpReward);
	}

	return { ...state, xp: state.xp + xpReward };
}

export function getBattleEnemyDefinition(enemyId: string): EnemyCombatDefinition {
	return enemies[enemyId] ?? enemies['slime-scout']!;
}
