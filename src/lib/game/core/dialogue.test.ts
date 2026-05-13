import { describe, expect, it } from 'vitest';

import { mainQuestId } from '$lib/game/content/quests';
import { applyQuestEvent, createInitialQuestState } from '$lib/game/core/quests';
import {
	advanceDialogue,
	buildDialogueFallback,
	buildQuestCompletionDialogue,
	chooseDialogueOption,
	startNpcDialogue
} from '$lib/game/core/dialogue';

describe('dialogue core', () => {
	it('starts Guild Master briefing before the ruins are unlocked', () => {
		const session = startNpcDialogue({
			npcId: 'guild-master',
			questState: createInitialQuestState()
		});

		expect(session).toMatchObject({
			speaker: 'Guild Master Arlen',
			line: 'You made it. The eastern ruins are stirring again, and the village road is no longer safe.',
			lineIndex: 0,
			lineCount: 2,
			mode: 'conversation'
		});
		expect(session.completionIntent).toEqual({ type: 'recordNpcTalk', npcId: 'guild-master' });
	});

	it('advances through briefing lines and exposes choices at the end', () => {
		const first = startNpcDialogue({
			npcId: 'guild-master',
			questState: createInitialQuestState()
		});
		const second = advanceDialogue(first);
		const third = advanceDialogue(second);

		expect(second.line).toBe(
			'Go through the forest path, reach the old core, and defeat the warden before it wakes the rest.'
		);
		expect(third.mode).toBe('choice');
		expect(third.choices.map((choice) => choice.label)).toEqual(['Quest']);
	});

	it('shows useful choices immediately for single-line NPC dialogue', () => {
		const session = startNpcDialogue({
			npcId: 'shopkeeper-mira',
			questState: createInitialQuestState()
		});

		expect(session.lineCount).toBe(1);
		expect(session.mode).toBe('choice');
		expect(session.choices.map((choice) => choice.label)).toEqual(['Shop']);
	});

	it('shows Guild quest choices after the Guild briefing is complete', () => {
		const questState = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;
		const session = startNpcDialogue({ npcId: 'guild-master', questState });
		const choiceResult = chooseDialogueOption({
			session,
			choiceId: 'quest',
			questState
		});

		expect(choiceResult.intent).toEqual({ type: 'showQuestList', giverNpcId: 'guild-master' });
		expect(choiceResult.session?.mode).toBe('choice');
		expect(choiceResult.session?.choices.map((choice) => choice.label)).toEqual([
			'Thin Village Slimes',
			'Thin Ruins Slimes',
			'Recover Ruins Relics',
			'Close'
		]);
	});

	it('hides Talk when it would repeat the current Guild Master dialogue', () => {
		const questState = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;
		const session = startNpcDialogue({ npcId: 'guild-master', questState });

		expect(session.line).toBe('The ruins route is open. Steel yourself before you enter the core.');
		expect(session.choices.map((choice) => choice.label)).toEqual(['Quest']);
	});

	it('returns accept intents from Guild quest detail choices', () => {
		const questState = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;
		const session = startNpcDialogue({ npcId: 'guild-master', questState });
		const list = chooseDialogueOption({ session, choiceId: 'quest', questState });
		if (!list.session) throw new Error('Expected quest list session');
		const detail = chooseDialogueOption({
			session: list.session,
			choiceId: 'quest:thin-village-slimes',
			questState
		});
		if (!detail.session) throw new Error('Expected quest detail session');
		const accepted = chooseDialogueOption({
			session: detail.session,
			choiceId: 'accept:thin-village-slimes',
			questState
		});

		expect(detail.session.line).toContain('Defeat slimes near the village.');
		expect(accepted.intent).toEqual({ type: 'acceptQuest', questId: 'thin-village-slimes' });
	});

	it('builds quest completion dialogue from a reward grant', () => {
		const session = buildQuestCompletionDialogue({
			questId: mainQuestId,
			title: 'Investigate the Ruins',
			reward: {
				xp: 15,
				coins: 35,
				items: [{ itemId: 'greater-field-potion', quantity: 1 }]
			}
		});

		expect(session).toMatchObject({
			speaker: 'Guild Notice',
			mode: 'system',
			line: 'Quest complete: Investigate the Ruins. Reward: 15 XP / 35 coins / 1 item.'
		});
	});

	it('falls back for unknown NPC dialogue', () => {
		const session = buildDialogueFallback('Traveler', 'No dialogue is available.');

		expect(session).toMatchObject({
			speaker: 'Traveler',
			line: 'No dialogue is available.',
			mode: 'system'
		});
	});
});
