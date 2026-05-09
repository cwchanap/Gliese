import { describe, expect, it } from 'vitest';

import { getItem } from '$lib/game/content/items';
import { maps } from '$lib/game/content/maps';
import {
	getQuest,
	mainQuestId,
	questList,
	sideQuestIds,
	type QuestDefinition
} from '$lib/game/content/quests';

describe('quest content', () => {
	it('declares one main quest and three Guild side quests with stable ids', () => {
		expect(mainQuestId).toBe('investigate-the-ruins');
		expect(sideQuestIds).toEqual([
			'thin-village-slimes',
			'thin-ruins-slimes',
			'recover-ruins-relics'
		]);
		expect(new Set(questList.map((quest) => quest.id)).size).toBe(questList.length);
		expect(getQuest('investigate-the-ruins')?.type).toBe('main');
		expect(questList.filter((quest) => quest.type === 'side')).toHaveLength(3);
	});

	it('defines valid objectives and Guild side quest givers', () => {
		for (const quest of questList) {
			expect(quest.title).not.toHaveLength(0);
			expect(quest.description).not.toHaveLength(0);
			expect(quest.objectives).not.toHaveLength(0);
			expect(new Set(quest.objectives.map((objective) => objective.id)).size).toBe(
				quest.objectives.length
			);

			if (quest.type === 'side') {
				expect(quest.giverNpcId).toBe('guild-master');
				expect(quest.availableAfterQuestId).toBe(mainQuestId);
				expect(quest.availableAfterObjectiveId).toBe('talk-to-guild-master');
			}
		}
	});

	it('uses known enemies, maps, pickups, configured NPCs, and reward items', () => {
		for (const quest of questList) {
			for (const objective of quest.objectives) {
				if (objective.kind === 'talk-to-npc') {
					expect(objective.npcId).toBe('guild-master');
					expect(objective.target).toBe(1);
				}

				if (objective.kind === 'defeat-enemy') {
					for (const mapId of objective.mapIds) {
						expect(maps[mapId]).toBeDefined();
						expect(
							(maps[mapId].encounters ?? []).some(
								(encounter) => encounter.enemyId === objective.enemyId
							)
						).toBe(true);
					}
					expect(objective.target).toBeGreaterThan(0);
				}

				if (objective.kind === 'collect-item') {
					for (const source of objective.sources) {
						expect(maps[source.mapId]).toBeDefined();
						expect(getItem(source.itemId)).toBeDefined();
						expect(
							(maps[source.mapId].pickups ?? []).some((pickup) => pickup.id === source.pickupId)
						).toBe(true);
					}
					expect(objective.target).toBeGreaterThan(0);
				}
			}

			for (const rewardItem of quest.reward.items ?? []) {
				expect(getItem(rewardItem.itemId)).toBeDefined();
				expect(rewardItem.quantity).toBeGreaterThan(0);
			}
		}
	});

	it('sets concrete first-pass rewards', () => {
		const rewards = Object.fromEntries(
			questList.map((quest) => [
				quest.id,
				{
					xp: quest.reward.xp ?? 0,
					coins: quest.reward.coins ?? 0,
					items: quest.reward.items ?? []
				}
			])
		) as Record<QuestDefinition['id'], { xp: number; coins: number; items: unknown[] }>;

		expect(rewards['investigate-the-ruins']).toEqual({
			xp: 15,
			coins: 35,
			items: [{ itemId: 'greater-field-potion', quantity: 1 }]
		});
		expect(rewards['thin-village-slimes']).toEqual({
			xp: 6,
			coins: 12,
			items: [{ itemId: 'field-potion', quantity: 1 }]
		});
		expect(rewards['thin-ruins-slimes']).toEqual({
			xp: 8,
			coins: 16,
			items: [{ itemId: 'sunleaf-salve', quantity: 1 }]
		});
		expect(rewards['recover-ruins-relics']).toEqual({
			xp: 8,
			coins: 18,
			items: [{ itemId: 'ruin-draught', quantity: 1 }]
		});
	});
});
