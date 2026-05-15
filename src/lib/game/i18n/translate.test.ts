import { describe, expect, it } from 'vitest';

import { t, type MessageKey } from '$lib/game/i18n/translate';

describe('translation lookup', () => {
	it('resolves English UI and content messages', () => {
		expect(t('en', 'ui.menu')).toBe('Menu');
		expect(t('en', 'content.items.field-potion.name')).toBe('Field Potion');
	});

	it('falls back to English for missing non-English messages', () => {
		expect(t('zh-Hant', 'ui.menu')).toBe('Menu');
		expect(t('ja', 'content.quests.investigate-the-ruins.title')).toBe('Investigate the Ruins');
	});

	it('interpolates fallback messages', () => {
		expect(t('ja', 'status.boughtItem', { itemName: 'Field Potion' })).toBe('Bought Field Potion');
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
