import { describe, expect, it } from 'vitest';

import { en } from '$lib/game/i18n/messages/en';
import { ja } from '$lib/game/i18n/messages/ja';
import { zhHant } from '$lib/game/i18n/messages/zh-Hant';
import { t, type MessageKey } from '$lib/game/i18n/translate';

function collectLeafPaths(source: unknown, prefix = ''): string[] {
	if (typeof source !== 'object' || source === null || Array.isArray(source)) return [];

	return Object.entries(source).flatMap(([key, value]) => {
		const path = prefix ? `${prefix}.${key}` : key;
		return typeof value === 'string' ? [path] : collectLeafPaths(value, path);
	});
}

describe('translation lookup', () => {
	it('resolves English UI and content messages', () => {
		expect(t('en', 'ui.menu')).toBe('Menu');
		expect(t('en', 'content.items.field-potion.name')).toBe('Field Potion');
	});

	it('keeps non-English dictionaries aligned with English source keys', () => {
		const sourcePaths = collectLeafPaths(en).sort();

		expect(collectLeafPaths(zhHant).sort()).toEqual(sourcePaths);
		expect(collectLeafPaths(ja).sort()).toEqual(sourcePaths);
	});

	it('resolves Traditional Chinese UI and content messages', () => {
		expect(t('zh-Hant', 'ui.menu')).toBe('選單');
		expect(t('zh-Hant', 'content.items.field-potion.name')).toBe('野外藥水');
		expect(t('zh-Hant', 'content.quests.investigate-the-ruins.title')).toBe('調查廢墟');
	});

	it('resolves Japanese UI and content messages', () => {
		expect(t('ja', 'ui.menu')).toBe('メニュー');
		expect(t('ja', 'content.items.field-potion.name')).toBe('フィールドポーション');
		expect(t('ja', 'content.quests.investigate-the-ruins.title')).toBe('遺跡を調査せよ');
	});

	it('interpolates localized messages', () => {
		expect(t('zh-Hant', 'status.boughtItem', { itemName: '野外藥水' })).toBe(
			'已購買 野外藥水'
		);
		expect(t('ja', 'status.boughtItem', { itemName: 'フィールドポーション' })).toBe(
			'フィールドポーションを購入した'
		);
	});

	it('preserves placeholders when interpolation params are missing', () => {
		expect(t('en', 'status.boughtItem')).toBe('Bought {{itemName}}');
	});

	it('includes current GameShell UI source strings', () => {
		expect(t('en', 'ui.equipmentSlots.weapon')).toBe('Weapon');
		expect(t('en', 'ui.equipmentSlots.accessory')).toBe('Accessory');
		expect(t('en', 'ui.loadGameShellError')).toBe('Unable to start the game shell.');
		expect(t('en', 'ui.reward', { rewardSummary: '15 XP / 35 coins' })).toBe(
			'Reward: 15 XP / 35 coins'
		);
		expect(t('en', 'ui.keyQuantity', { quantity: 2 })).toBe('Key x2');
		expect(t('en', 'ui.priceBadge', { price: 10 })).toBe('10c');
		expect(t('en', 'ui.itemKinds.consumable')).toBe('consumable');
	});

	it('includes the Guild quest-detail dialogue template', () => {
		expect(
			t('en', 'content.dialogue.system.questDetailNotice', {
				questTitle: 'Thin Village Slimes',
				objectiveDescription: 'Defeat slimes near the village.',
				rewardSummary: '6 XP / 12 coins / 1 item'
			})
		).toBe(
			'Thin Village Slimes: Defeat slimes near the village. Reward: 6 XP / 12 coins / 1 item.'
		);
	});

	it('returns a missing marker for unknown source keys', () => {
		expect(t('en', 'missing.key' as MessageKey)).toBe('[missing.key]');
	});
});
