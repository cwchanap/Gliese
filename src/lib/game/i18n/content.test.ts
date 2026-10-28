import { describe, expect, it } from 'vitest';

import { quests } from '$lib/game/content/quests';
import { buildHudQuestState, createInitialQuestState } from '$lib/game/core/quests';
import {
	formatRewardSummary,
	getEnemyText,
	getItemText,
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

	it('resolves shop, NPC, enemy, and quest text', () => {
		expect(getShopText('en', 'miras-item-shop')?.name).toBe("Mira's Herb Hut");
		expect(getNpcText('en', 'mott-hearth')?.name).toBe('Old Mott');
		expect(getEnemyText('en', 'boar-king')?.name).toBeTruthy();
		expect(getQuestText('zh-Hant', 'prologue-proving-morning')?.title).toBe('試煉之晨');
	});

	it('resolves quest objective text', () => {
		expect(getQuestObjectiveText('en', 'prologue-proving-morning', 'talk-to-mott')).toEqual({
			description: 'Talk to Old Mott by the hearth.',
			progressLabel: 'Spoke with Old Mott'
		});
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

	it('keeps the HUD reward summary aligned with the i18n formatter', () => {
		const hud = buildHudQuestState({ state: createInitialQuestState(), locale: 'en' });

		expect(hud.main?.rewardSummary).toBe(
			formatRewardSummary('en', quests['prologue-proving-morning'].reward)
		);
	});

	it('returns null for unknown content ids', () => {
		expect(getItemText('en', 'not-an-item')).toBeNull();
		expect(getShopText('en', 'not-a-shop')).toBeNull();
		expect(getQuestText('en', 'not-a-quest')).toBeNull();
		expect(getQuestObjectiveText('en', 'not-a-quest', 'talk-to-mott')).toBeNull();
		expect(getQuestObjectiveText('en', 'prologue-proving-morning', 'not-an-objective')).toBeNull();
		expect(getEnemyText('en', 'not-an-enemy')).toBeNull();
		expect(getNpcText('en', 'not-an-npc')).toBeNull();
	});
});
