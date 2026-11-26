import { getItem } from '$lib/game/content/items';
import { maps, openingMapId } from '$lib/game/content/maps';
import { startingPlayer } from '$lib/game/content/player';
import { getQuest } from '$lib/game/content/quests';
import { buildAreaMapState } from '$lib/game/core/area-map';
import type { BattleStartPayload, BattleSummary } from '$lib/game/core/battle';
import { getBaseMaxHp } from '$lib/game/core/progression';
import { buildHudQuestState, getStoryProgress } from '$lib/game/core/quests';
import { clampHpToMax, deriveEffectiveStats } from '$lib/game/core/stats';
import { applyStoryGates } from '$lib/game/core/story-gates';
import {
	formatRewardSummary,
	getItemText,
	getQuestObjectiveText,
	getQuestText
} from '$lib/game/i18n/content';
import { getActiveLocale } from '$lib/game/i18n/store';
import type { SaveState } from '$lib/game/save/save-state';
import type { HudBattleActive, HudBattleSummary, HudState } from '$lib/game/ui-bridge/events';

type HeroStats = { hp: number; maxHp: number; attack: number; defense: number };

export type BattleHudInput = {
	payload: BattleStartPayload;
	/** The save after the result was applied: set once the summary shows. */
	applied?: SaveState;
	/** Grik's stats right now; the applied save's own stats take over with `applied`. */
	hero: HeroStats;
	inventory: SaveState['inventory'];
	status: string;
	/** Shown instead of the live battle when set. */
	summary: BattleSummary | null;
	active: HudBattleActive;
};

/** The whole HUD state of a battle: the live fight, or its summary once it ends. */
export function buildBattleHudState(input: BattleHudInput): HudState {
	const { payload, applied, summary } = input;
	const locale = getActiveLocale();
	const saveState = applied ?? payload.saveState;
	const rawMap = maps[applied?.mapId ?? payload.sourceMapId] ?? maps[openingMapId]!;
	const questState = saveState.quests;
	const map = applyStoryGates(rawMap, getStoryProgress(questState));
	const hero = applied ? statsFromSave(applied) : input.hero;
	const inventory = applied?.inventory ?? input.inventory;
	const { equipment } = saveState;

	return {
		ready: true,
		mapId: map.id,
		hp: hero.hp,
		maxHp: hero.maxHp,
		level: saveState.player.level,
		xp: saveState.player.xp,
		attack: hero.attack,
		defense: hero.defense,
		heals: countConsumables(inventory),
		status: input.status,
		areaMap: buildAreaMapState({
			map,
			player: saveState.player,
			revealedCells: saveState.mapExploration[map.id] ?? [],
			quests: questState,
			locale
		}),
		wallet: { coins: saveState.wallet.coins },
		heroOccluded: false,
		nearbyShop: null,
		shop: null,
		dialogue: null,
		// Split ternary so the object literal matches the phase union exactly.
		battle: summary
			? { phase: 'summary' as const, summary: buildHudSummary(summary), active: null }
			: { phase: 'active' as const, summary: null, active: input.active },
		quests: buildHudQuestState({ state: questState, locale }),
		inventory: buildHudInventory(inventory, equipment)
	};
}

function statsFromSave(saveState: SaveState): HeroStats {
	const effectiveStats = deriveEffectiveStats(
		{
			hp: getBaseMaxHp(startingPlayer.baseHp, saveState.player.level),
			attack: saveState.player.attack,
			defense: 0
		},
		saveState.equipment
	);

	return { hp: clampHpToMax(saveState.player.hp, effectiveStats), ...effectiveStats };
}

export function countConsumables(inventory: SaveState['inventory']): number {
	return inventory.stacks.reduce((total, stack) => {
		const item = getItem(stack.itemId);
		return item?.type === 'consumable' ? total + stack.quantity : total;
	}, 0);
}

export function countHealingItems(inventory: SaveState['inventory']): number {
	return inventory.stacks.reduce((total, stack) => {
		const item = getItem(stack.itemId);
		return item?.type === 'consumable' && item.effect.type === 'heal'
			? total + stack.quantity
			: total;
	}, 0);
}

function buildHudSummary(summary: BattleSummary): HudBattleSummary {
	const locale = getActiveLocale();

	return {
		outcome: summary.outcome,
		enemiesDefeated: summary.enemiesDefeated,
		xpGained: summary.xpGained,
		coinsGained: summary.coinsGained,
		drops: summary.drops.map((drop) => {
			const item = getItem(drop.itemId);
			const itemText = getItemText(locale, drop.itemId);

			return {
				itemId: drop.itemId,
				name: itemText?.name ?? item?.name ?? drop.itemId,
				quantity: drop.quantity
			};
		}),
		leveledUp: summary.leveledUp,
		completedQuestTitles: summary.completedQuestIds
			.map((questId) => getQuestText(locale, questId)?.title ?? getQuest(questId)?.title)
			.filter((title): title is string => Boolean(title)),
		questRewards: summary.questRewards.map((grant) => ({
			title: getQuestText(locale, grant.questId)?.title ?? grant.title,
			rewardSummary: formatRewardSummary(locale, grant.reward)
		})),
		questProgress: (summary.questProgress ?? []).map((update) => ({
			questId: update.questId,
			title: getQuestText(locale, update.questId)?.title ?? update.title,
			progressLabel:
				getQuestObjectiveText(locale, update.questId, update.objectiveId)?.progressLabel ??
				update.progressLabel,
			previousProgress: update.previousProgress,
			currentProgress: update.currentProgress,
			target: update.target
		}))
	};
}

function buildHudInventory(
	inventory: SaveState['inventory'],
	equipment: SaveState['equipment']
): HudState['inventory'] {
	const locale = getActiveLocale();

	return {
		consumables: inventory.stacks.flatMap((stack) => {
			const item = getItem(stack.itemId);
			const itemText = item ? getItemText(locale, item.id) : null;

			return item?.type === 'consumable'
				? [
						{
							itemId: item.id,
							name: itemText?.name ?? item.name,
							description: itemText?.description ?? item.description,
							iconPath: item.iconPath,
							quantity: stack.quantity
						}
					]
				: [];
		}),
		equipment: inventory.equipment.flatMap((itemId) => {
			const item = getItem(itemId);
			const itemText = item ? getItemText(locale, item.id) : null;

			return item?.type === 'equipment'
				? [
						{
							itemId: item.id,
							name: itemText?.name ?? item.name,
							description: itemText?.description ?? item.description,
							iconPath: item.iconPath,
							slot: item.slot,
							equipped: equipment[item.slot] === item.id,
							modifiers: { ...item.modifiers }
						}
					]
				: [];
		}),
		keyItems: inventory.stacks.flatMap((stack) => {
			const item = getItem(stack.itemId);
			const itemText = item ? getItemText(locale, item.id) : null;

			return item?.type === 'key'
				? [
						{
							itemId: item.id,
							name: itemText?.name ?? item.name,
							description: itemText?.description ?? item.description,
							iconPath: item.iconPath,
							quantity: stack.quantity
						}
					]
				: [];
		}),
		equipped: { ...equipment }
	};
}
