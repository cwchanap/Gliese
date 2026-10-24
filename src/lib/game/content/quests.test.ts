import { describe, expect, it } from 'vitest';

import { enemies } from '$lib/game/content/enemies';
import { getItem } from '$lib/game/content/items';
import { maps } from '$lib/game/content/maps';
import {
	collectQuestSceneIds,
	mainQuestIds,
	questList,
	type QuestObjective,
	type QuestReward
} from '$lib/game/content/quests';
import { applyStoryGates } from '$lib/game/core/story-gates';
import { browserStoryCatalog } from '$lib/game/story/browser-fixture';
import { t } from '$lib/game/i18n/translate';

function expectEnglishMessage(key: Parameters<typeof t>[1]) {
	const value = t('en', key);
	expect(value, key).not.toMatch(/^\[/);
	expect(value.trim()).not.toHaveLength(0);
}

function expectKnownRewardItems(reward: QuestReward | undefined) {
	for (const item of reward?.items ?? []) {
		expect(getItem(item.itemId), item.itemId).toBeDefined();
		expect(item.quantity).toBeGreaterThan(0);
	}
}

/** Every map as the world shows it while `objective` is the current main objective. */
function worldDuring(questId: (typeof mainQuestIds)[number], objective: QuestObjective) {
	return Object.values(maps).map((map) =>
		applyStoryGates(map, { questId, objectiveId: objective.id })
	);
}

describe('quest content', () => {
	it('chains the seven prologue quests with globally unique objective ids', () => {
		expect(questList.map((quest) => quest.id)).toEqual([...mainQuestIds]);
		const objectiveIds = questList.flatMap((quest) => quest.objectives.map(({ id }) => id));
		expect(new Set(objectiveIds).size).toBe(objectiveIds.length);
	});

	it('has text and known reward items for every quest and objective', () => {
		for (const quest of questList) {
			expectEnglishMessage(quest.titleKey);
			expectEnglishMessage(quest.descriptionKey);
			expectKnownRewardItems(quest.reward);
			expect(quest.objectives).not.toHaveLength(0);

			for (const objective of quest.objectives) {
				expectEnglishMessage(objective.descriptionKey);
				expectEnglishMessage(objective.progressLabelKey);
				expectKnownRewardItems(objective.reward);
				expect(objective.target).toBeGreaterThan(0);
			}
		}
	});

	// A target missing from the world while its objective is current would softlock the chain.
	it('places every objective target in the world while that objective is current', () => {
		for (const quest of questList) {
			for (const objective of quest.objectives) {
				const world = worldDuring(quest.id, objective);
				const label = `${quest.id}/${objective.id}`;

				switch (objective.kind) {
					case 'talk-to-npc':
						for (const npcId of objective.npcIds) {
							expect(
								world.some((map) => map.npcs?.some((npc) => npc.dialogueId === npcId)),
								`${label}: ${npcId}`
							).toBe(true);
						}
						break;
					case 'inspect':
						for (const discoveryId of objective.discoveryIds) {
							expect(
								world.some((map) => map.discoveries?.some(({ id }) => id === discoveryId)),
								`${label}: ${discoveryId}`
							).toBe(true);
						}
						break;
					case 'collect-item':
						for (const source of objective.sources) {
							const map = world.find(({ id }) => id === source.mapId);
							expect(
								map?.pickups?.some(
									(pickup) => pickup.id === source.pickupId && pickup.itemId === source.itemId
								),
								`${label}: ${source.pickupId}`
							).toBe(true);
						}
						break;
					case 'defeat-enemy': {
						expect(enemies[objective.enemyId], label).toBeDefined();
						const units = world
							.filter((map) => objective.mapIds.includes(map.id))
							.flatMap((map) => map.encounters ?? [])
							.filter((encounter) => encounter.enemyId === objective.enemyId)
							.reduce((sum, encounter) => sum + (encounter.count ?? 1), 0);
						expect(units, label).toBeGreaterThanOrEqual(objective.target);
						break;
					}
					case 'lose-battle':
						expect(
							world.some((map) =>
								map.encounters?.some((encounter) => encounter.enemyId === objective.enemyId)
							),
							label
						).toBe(true);
						break;
				}
			}
		}
	});

	it('moves the hero only onto known maps and plays only compiled scenes', () => {
		const effects = questList.flatMap((quest) => [
			...(quest.onStart ?? []),
			...quest.objectives.flatMap((objective) => objective.onComplete ?? [])
		]);
		for (const effect of effects) {
			if (effect.type === 'move-player') expect(maps[effect.mapId], effect.mapId).toBeDefined();
		}

		const compiledSceneIds = new Set(browserStoryCatalog.scenes.map((scene) => scene.id));
		for (const sceneId of collectQuestSceneIds()) {
			expect(compiledSceneIds.has(sceneId), sceneId).toBe(true);
		}
	});
});
