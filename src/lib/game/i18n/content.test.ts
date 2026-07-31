import { describe, expect, it } from 'vitest';

import { getQuest, mainQuestId } from '$lib/game/content/quests';
import { buildQuestCompletionDialogue } from '$lib/game/core/dialogue';
import { buildHudQuestState, createInitialQuestState } from '$lib/game/core/quests';
import {
	formatRewardSummary,
	getDialogueText,
	getItemText,
	getMapLandmarkText,
	getNpcText,
	getQuestObjectiveText,
	getQuestText,
	getShopText
} from '$lib/game/i18n/content';

describe('localized content helpers', () => {
	it('resolves item text in the requested locale', () => {
		expect(getItemText('en', 'field-potion')).toEqual({
			name: 'Field Potion',
			description: 'Restores 8 HP.'
		});
		expect(getItemText('ja', 'field-potion')?.name).toBe('フィールドポーション');
	});

	it('resolves shop, NPC, map landmark, and quest text', () => {
		expect(getShopText('en', 'miras-item-shop')?.name).toBe("Mira's Item Shop");
		expect(getNpcText('en', 'guild-master')?.name).toBe('Guild Master Arlen');
		expect(getMapLandmarkText('en', 'hero-house-exterior')?.label).toBe("Hero's House");
		expect(getQuestText('en', 'investigate-the-ruins')?.title).toBe('Investigate the Ruins');
	});

	it('resolves quest objective text', () => {
		expect(getQuestObjectiveText('en', 'investigate-the-ruins', 'talk-to-guild-master')).toEqual({
			description: 'Talk to the Guild Master in the Guild Hall.',
			progressLabel: 'Guild Master spoken to'
		});
	});

	it('resolves dialogue action labels', () => {
		const text = getDialogueText('en', 'guild-master');

		expect(text?.actions.map((action) => action.label)).toEqual(['Quest']);
	});

	it('formats localized reward summaries', () => {
		expect(
			formatRewardSummary('en', {
				xp: 15,
				coins: 35,
				items: [{ itemId: 'greater-field-potion', quantity: 1 }]
			})
		).toBe('15 XP / 35 coins / 1 item');
	});

	it('keeps English reward summaries aligned with current runtime formatters', () => {
		const mainQuest = getQuest(mainQuestId);
		if (!mainQuest) throw new Error('Expected main quest content');
		const i18nSummary = formatRewardSummary('en', mainQuest.reward);

		const hud = buildHudQuestState({
			state: createInitialQuestState(),
			nearbyQuestGiverId: null,
			locale: 'en'
		});
		expect(hud.main?.rewardSummary).toBe(i18nSummary);

		const completion = buildQuestCompletionDialogue({
			questId: mainQuestId,
			title: mainQuest.title,
			reward: mainQuest.reward,
			locale: 'en'
		});
		expect(completion.line).toContain(`Reward: ${i18nSummary}.`);

		const multiItemReward = {
			items: [{ itemId: 'field-potion', quantity: 2 }]
		};
		const multiItemCompletion = buildQuestCompletionDialogue({
			questId: mainQuestId,
			title: mainQuest.title,
			reward: multiItemReward,
			locale: 'en'
		});
		expect(multiItemCompletion.line).toContain(
			`Reward: ${formatRewardSummary('en', multiItemReward)}.`
		);
	});

	it('returns null for unknown content ids', () => {
		expect(getItemText('en', 'not-an-item')).toBeNull();
		expect(getShopText('en', 'not-a-shop')).toBeNull();
		expect(getQuestText('en', 'not-a-quest')).toBeNull();
		expect(getQuestObjectiveText('en', 'not-a-quest', 'talk-to-guild-master')).toBeNull();
		expect(getQuestObjectiveText('en', 'investigate-the-ruins', 'not-an-objective')).toBeNull();
		expect(getDialogueText('en', 'not-a-dialogue')).toBeNull();
		expect(getNpcText('en', 'not-an-npc')).toBeNull();
		expect(getMapLandmarkText('en', 'not-a-landmark')).toBeNull();
	});
});
