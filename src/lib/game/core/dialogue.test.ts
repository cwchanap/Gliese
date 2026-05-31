import { describe, expect, it, vi } from 'vitest';

import { mainQuestId } from '$lib/game/content/quests';
import { applyQuestEvent, createInitialQuestState } from '$lib/game/core/quests';
import {
	advanceDialogue,
	buildDialogueFallback,
	buildQuestCompletionDialogue,
	chooseDialogueOption,
	type DialogueSession
} from '$lib/game/core/dialogue';

vi.mock('$lib/game/i18n/translate', async () => {
	const actual = await vi.importActual<typeof import('$lib/game/i18n/translate')>(
		'$lib/game/i18n/translate'
	);

	return {
		...actual,
		t: vi.fn((locale, key, params) => {
			if (locale === 'ja' && key === 'content.dialogue.speakers.guildNotice') {
				return 'JP Guild Notice';
			}

			return actual.t(locale, key, params);
		})
	};
});

describe('dialogue core', () => {
	function createGuildQuestEntrySession(): DialogueSession {
		return {
			id: 'npc:guild-master:story',
			npcId: 'guild-master',
			speaker: 'Guild Master Arlen',
			lines: ['Choose your work.'],
			line: 'Choose your work.',
			lineIndex: 0,
			lineCount: 1,
			mode: 'choice',
			choices: [
				{
					id: 'quest',
					label: 'Quest',
					intent: { type: 'showQuestList', giverNpcId: 'guild-master' }
				}
			],
			completionIntent: null,
			canClose: true
		};
	}

	it('advances through story lines and exposes choices at the end', () => {
		const first: DialogueSession = {
			...createGuildQuestEntrySession(),
			lines: ['First story line.', 'Second story line.'],
			line: 'First story line.',
			lineIndex: 0,
			lineCount: 2,
			mode: 'conversation'
		};
		const second = advanceDialogue(first);
		const third = advanceDialogue(second);

		expect(second.line).toBe('Second story line.');
		expect(third.mode).toBe('choice');
		expect(third.choices.map((choice) => choice.label)).toEqual(['Quest']);
	});

	it('shows Guild quest choices after the Guild briefing is complete', () => {
		const questState = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;
		const session = createGuildQuestEntrySession();
		const choiceResult = chooseDialogueOption({
			session,
			choiceId: 'quest',
			questState,
			locale: 'en'
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

	it('returns accept intents from Guild quest detail choices', () => {
		const questState = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;
		const session = createGuildQuestEntrySession();
		const list = chooseDialogueOption({ session, choiceId: 'quest', questState, locale: 'en' });
		if (!list.session) throw new Error('Expected quest list session');
		const detail = chooseDialogueOption({
			session: list.session,
			choiceId: 'quest:thin-village-slimes',
			questState,
			locale: 'en'
		});
		if (!detail.session) throw new Error('Expected quest detail session');
		const accepted = chooseDialogueOption({
			session: detail.session,
			choiceId: 'accept:thin-village-slimes',
			questState,
			locale: 'en'
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
			},
			locale: 'en'
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

	it('localizes dialogue text for Japanese', () => {
		const questState = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;
		const session = createGuildQuestEntrySession();
		const list = chooseDialogueOption({
			session,
			choiceId: 'quest',
			questState,
			locale: 'ja'
		});
		if (!list.session) throw new Error('Expected quest list session');
		const detail = chooseDialogueOption({
			session: list.session,
			choiceId: 'quest:thin-village-slimes',
			questState,
			locale: 'ja'
		});
		if (!detail.session) throw new Error('Expected quest detail session');
		const completion = buildQuestCompletionDialogue({
			questId: mainQuestId,
			title: 'Investigate the Ruins',
			reward: { xp: 15, coins: 35, items: [{ itemId: 'greater-field-potion', quantity: 1 }] },
			locale: 'ja'
		});

		expect(list.session).toMatchObject({
			speaker: 'ギルドマスター・アーレン',
			line: '確認したいギルド仕事を選んでください。'
		});
		expect(list.session.choices.map((choice) => choice.label)).toEqual([
			'村道のスライム掃討',
			'遺跡のスライム掃討',
			'遺跡の遺物回収',
			'閉じる'
		]);
		expect(detail.session).toMatchObject({
			speaker: 'ギルドマスター・アーレン',
			line: '村道のスライム掃討: 村の近くでスライムを倒す。 報酬: 6XP / 12コイン / 1個。'
		});
		expect(detail.session.choices.map((choice) => choice.label)).toEqual([
			'受ける',
			'戻る',
			'閉じる'
		]);
		expect(completion).toMatchObject({
			speaker: 'JP Guild Notice',
			line: '依頼達成: 遺跡を調査せよ。報酬: 15XP / 35コイン / 1個。'
		});
	});
});
