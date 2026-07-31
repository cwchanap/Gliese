import { describe, expect, it } from 'vitest';

import { getDialogue, npcDialogueList } from '$lib/game/content/dialogue';
import { maps } from '$lib/game/content/maps';
import { getQuest } from '$lib/game/content/quests';
import { getShop } from '$lib/game/content/shops';
import { t } from '$lib/game/i18n/translate';

function expectEnglishMessage(key: Parameters<typeof t>[1]): string {
	const value = t('en', key);
	expect(value).not.toMatch(/^\[/);
	expect(value.trim()).not.toHaveLength(0);
	return value;
}

describe('dialogue content', () => {
	it('defines action shells for every interactable map NPC', () => {
		const npcs = Object.values(maps).flatMap((map) => map.npcs ?? []);

		expect(npcs.length).toBeGreaterThan(0);
		for (const npc of npcs) {
			expect(getDialogue(npc.dialogueId)?.id).toBe(npc.dialogueId);
			expectEnglishMessage(npc.nameKey);
		}
	});

	it('uses stable unique dialogue ids', () => {
		expect(new Set(npcDialogueList.map((dialogue) => dialogue.id)).size).toBe(
			npcDialogueList.length
		);
		expect(getDialogue('guild-master')?.id).toBe('guild-master');
		expect(getDialogue('guild-quartermaster')?.id).toBe('guild-quartermaster');
		expect(getDialogue('shopkeeper-mira')?.id).toBe('shopkeeper-mira');
	});

	it('does not keep migrated NPC story prose in frontend dialogue definitions', () => {
		const serialized = JSON.stringify(npcDialogueList);

		expect(serialized).not.toContain('The eastern ruins are stirring again');
		expect(serialized).not.toContain('Fresh tonics are on the shelf');
	});

	it('keeps dialogue action references valid', () => {
		for (const dialogue of npcDialogueList) {
			for (const action of dialogue.actions) {
				expectEnglishMessage(action.labelKey);

				if (action.intent.type === 'openShop') {
					expect(getShop(action.intent.shopId)).toBeDefined();
				}

				if (action.intent.type === 'showQuestList') {
					expect(action.intent.giverNpcId).toBe('guild-master');
				}

				if (action.intent.type === 'showQuestDetails') {
					expect(getQuest(action.intent.questId)).toBeDefined();
				}
			}
		}
	});
});
