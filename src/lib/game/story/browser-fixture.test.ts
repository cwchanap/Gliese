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
});
