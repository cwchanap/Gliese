import { describe, expect, it } from 'vitest';

import { openingMapId } from '$lib/game/content/maps';
import { getQuest, mainQuestIds } from '$lib/game/content/quests';
import {
	applyBattleResultToSaveState,
	type BattleResult,
	type BattleStartPayload,
	type BattleSummary
} from '$lib/game/core/battle';
import {
	buildBattleHudState,
	countConsumables,
	countHealingItems
} from '$lib/game/phaser/battle-hud';
import { createNewSaveState } from '$lib/game/save/save-state';
import type { HudBattleActive } from '$lib/game/ui-bridge/events';

const active: HudBattleActive = {
	targetUnitId: null,
	enemies: [],
	ribbon: [],
	feed: [],
	heals: 0,
	items: 0,
	flee: { status: 'idle', progress: 0 },
	now: 0
};

function payloadFor(): BattleStartPayload {
	const saveState = createNewSaveState();
	return {
		saveState: {
			...saveState,
			mapId: 'overworld',
			inventory: { stacks: [{ itemId: 'field-potion', quantity: 2 }], equipment: [] }
		},
		sourceMapId: 'overworld',
		sourceEncounterId: 'wildwood-wolves-mouth',
		sourceEnemyId: 'forest-wolf',
		enemyCount: 1,
		hero: { hp: 12, maxHp: 20, attack: 5, defense: 1 }
	};
}

describe('battle HUD state', () => {
	it('shows the live fight: hero HP, items, map and the active battle HUD', () => {
		const payload = payloadFor();
		const state = buildBattleHudState({
			payload,
			hero: { hp: 9, maxHp: 20, attack: 5, defense: 1 },
			inventory: payload.saveState.inventory,
			status: 'Fighting',
			summary: null,
			active
		});

		expect(state).toMatchObject({
			ready: true,
			mapId: 'overworld',
			hp: 9,
			maxHp: 20,
			attack: 5,
			defense: 1,
			heals: 2,
			status: 'Fighting',
			battle: { phase: 'active', summary: null, active }
		});
		expect(state.inventory.consumables).toHaveLength(1);
	});

	it('shows the summary and the saved stats once the result is applied', () => {
		const payload = payloadFor();
		const result: BattleResult = {
			outcome: 'victory',
			sourceMapId: payload.sourceMapId,
			sourceEncounterId: payload.sourceEncounterId,
			sourceEnemyId: payload.sourceEnemyId,
			finalHeroHp: 4,
			inventory: { stacks: [{ itemId: 'field-potion', quantity: 1 }], equipment: [] },
			defeatedUnits: [
				{
					unitId: 'wildwood-wolves-mouth:unit:0',
					unitIndex: 0,
					enemyId: 'forest-wolf',
					xpReward: 5,
					coinReward: 3,
					drops: []
				}
			]
		};
		const application = applyBattleResultToSaveState(payload.saveState, result);
		const state = buildBattleHudState({
			payload,
			applied: application.saveState,
			hero: { hp: 4, maxHp: 20, attack: 5, defense: 1 },
			inventory: result.inventory,
			status: 'Victory',
			summary: application.summary,
			active
		});

		expect(state.battle).toMatchObject({
			phase: 'summary',
			active: null,
			summary: { outcome: 'victory', enemiesDefeated: 1, xpGained: 5, coinsGained: 3 }
		});
		expect(state.wallet.coins).toBe(application.saveState.wallet.coins);
		expect(state.heals).toBe(1);
	});
});

describe('battle item counts', () => {
	it('counts every consumable, but only healing ones as heals', () => {
		const inventory = {
			stacks: [
				{ itemId: 'field-potion', quantity: 2 },
				{ itemId: 'not-an-item', quantity: 5 }
			],
			equipment: []
		};

		expect(countConsumables(inventory)).toBe(2);
		expect(countHealingItems(inventory)).toBe(2);
	});
});

describe('battle HUD state: the bag and the summary details', () => {
	it('lists consumables, equipment (worn or not) and key items, and skips unknown items', () => {
		const payload = payloadFor();
		const saveState = {
			...payload.saveState,
			equipment: { ...payload.saveState.equipment, weapon: 'practice-spear' }
		};
		const state = buildBattleHudState({
			payload: { ...payload, saveState },
			hero: payload.hero,
			inventory: {
				stacks: [
					{ itemId: 'field-potion', quantity: 2 },
					{ itemId: 'meadow-token', quantity: 1 },
					{ itemId: 'not-an-item', quantity: 4 }
				],
				equipment: ['practice-spear', 'ancestral-amulet', 'not-an-item']
			},
			status: 'Fighting',
			summary: null,
			active
		});

		expect(state.inventory.consumables.map((item) => item.itemId)).toEqual(['field-potion']);
		expect(state.inventory.keyItems.map((item) => item.itemId)).toEqual(['meadow-token']);
		expect(state.inventory.equipment.map(({ itemId, equipped }) => [itemId, equipped])).toEqual([
			['practice-spear', true],
			['ancestral-amulet', false]
		]);
		expect(state.inventory.equipped.weapon).toBe('practice-spear');
	});

	it('names the drops, the quests it finished and the progress it made', () => {
		const questId = mainQuestIds[0];
		const quest = getQuest(questId)!;
		const objectiveId = quest.objectives[0]!.id;
		const payload = payloadFor();
		const summary: BattleSummary = {
			outcome: 'victory',
			enemiesDefeated: 2,
			xpGained: 12,
			coinsGained: 7,
			drops: [
				{ itemId: 'field-potion', quantity: 1 },
				{ itemId: 'not-an-item', quantity: 2 }
			],
			leveledUp: true,
			completedQuestIds: [questId, 'not-a-quest'],
			questRewards: [{ questId, title: quest.title, reward: { xp: 10, coins: 5 } }],
			questProgress: [
				{
					questId,
					title: quest.title,
					objectiveId,
					progressLabel: 'Wolves',
					previousProgress: 1,
					currentProgress: 2,
					target: 4
				}
			]
		};
		const state = buildBattleHudState({
			payload,
			hero: payload.hero,
			inventory: payload.saveState.inventory,
			status: 'Victory',
			summary,
			active
		});

		expect(state.battle.summary).toMatchObject({
			outcome: 'victory',
			enemiesDefeated: 2,
			leveledUp: true,
			drops: [
				{ itemId: 'field-potion', quantity: 1 },
				{ itemId: 'not-an-item', name: 'not-an-item', quantity: 2 }
			],
			completedQuestTitles: [expect.any(String)],
			questRewards: [{ title: expect.any(String), rewardSummary: expect.any(String) }],
			questProgress: [
				{
					questId,
					previousProgress: 1,
					currentProgress: 2,
					target: 4,
					progressLabel: expect.any(String)
				}
			]
		});
		expect(state.battle.summary?.completedQuestTitles).toHaveLength(1);
	});

	it('falls back to the opening map for a source map it does not know', () => {
		const payload = { ...payloadFor(), sourceMapId: 'no-such-map' };
		const state = buildBattleHudState({
			payload,
			hero: payload.hero,
			inventory: payload.saveState.inventory,
			status: 'Fighting',
			summary: null,
			active
		});

		expect(state.mapId).toBe(openingMapId);
	});
});
