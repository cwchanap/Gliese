import { describe, expect, it } from 'vitest';

import { getBrowserNpcDialogue } from '$lib/game/story/browser-fixture';

describe('browser fixture', () => {
	it('throws for an unknown npc', () => {
		expect(() =>
			getBrowserNpcDialogue({
				npcId: 'unknown-npc',
				mapId: 'meadow-entry',
				locale: 'en',
				quest: {
					mainQuestNeedsGuildBriefing: false,
					guildBriefingComplete: true,
					hasActiveSideQuest: false,
					hasCompletedQuest: false
				}
			})
		).toThrow('unknown story npc: unknown-npc');
	});

	it('serves Blacksmith Oren dialogue with the Forge shop intent', () => {
		const dialogue = getBrowserNpcDialogue({
			npcId: 'blacksmith-oren',
			mapId: 'blacksmith-interior',
			locale: 'en',
			quest: {
				mainQuestNeedsGuildBriefing: false,
				guildBriefingComplete: true,
				hasActiveSideQuest: false,
				hasCompletedQuest: false
			}
		});

		expect(dialogue).toMatchObject({
			speaker: 'Blacksmith Oren',
			lines: ['Steel holds when the hand behind it does. Take what fits, and keep it dry.'],
			actions: [
				{ id: 'shop', label: 'Shop', intent: { type: 'openShop', shopId: 'sundrop-forge' } }
			]
		});
	});
});
