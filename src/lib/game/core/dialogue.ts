import type { DialogueActionIntent } from '$lib/game/content/dialogue';
import { getQuest, type QuestId, type QuestReward } from '$lib/game/content/quests';
import { getAvailableGuildQuestIds, type QuestState } from '$lib/game/core/quests';
import {
	formatRewardSummary,
	getNpcText,
	getQuestObjectiveText,
	getQuestText
} from '$lib/game/i18n/content';
import type { Locale } from '$lib/game/i18n/locales';
import { t } from '$lib/game/i18n/translate';

export type DialogueMode = 'conversation' | 'choice' | 'system';

export type DialogueChoice = {
	id: string;
	label: string;
	intent: DialogueIntent;
};

export type DialogueIntent =
	| DialogueActionIntent
	| { type: 'acceptQuest'; questId: QuestId }
	| { type: 'recordNpcTalk'; npcId: string };

export type DialogueSession = {
	id: string;
	npcId: string | null;
	speaker: string;
	lines: string[];
	line: string;
	lineIndex: number;
	lineCount: number;
	mode: DialogueMode;
	choices: DialogueChoice[];
	completionIntent: DialogueIntent | null;
	canClose: boolean;
};

export type DialogueChoiceResult = {
	session: DialogueSession | null;
	intent: DialogueIntent | null;
};

export function advanceDialogue(session: DialogueSession): DialogueSession {
	if (session.lineIndex + 1 < session.lineCount) {
		const lineIndex = session.lineIndex + 1;

		return {
			...session,
			lineIndex,
			line: session.lines[lineIndex] ?? session.line,
			mode: 'conversation'
		};
	}

	return {
		...session,
		mode: session.choices.length > 0 ? 'choice' : session.mode,
		line: session.lines[session.lines.length - 1] ?? session.line
	};
}

export function chooseDialogueOption({
	session,
	choiceId,
	questState,
	locale
}: {
	session: DialogueSession;
	choiceId: string;
	questState: QuestState;
	locale: Locale;
}): DialogueChoiceResult {
	const choice = session.choices.find((candidate) => candidate.id === choiceId);
	if (!choice) {
		return {
			session: buildDialogueFallback(
				session.speaker,
				t(locale, 'content.dialogue.system.optionNotAvailable')
			),
			intent: null
		};
	}

	if (choice.intent.type === 'showQuestList') {
		return { session: buildGuildQuestListSession(questState, locale), intent: choice.intent };
	}

	if (choice.intent.type === 'showQuestDetails') {
		return {
			session: buildGuildQuestDetailSession(choice.intent.questId, locale),
			intent: choice.intent
		};
	}

	return { session: null, intent: choice.intent };
}

export function buildQuestCompletionDialogue({
	questId,
	title,
	reward,
	locale
}: {
	questId: QuestId;
	title: string;
	reward: QuestReward;
	locale: Locale;
}): DialogueSession {
	const questTitle = getQuestText(locale, questId)?.title ?? title;
	const rewardSummary = formatRewardSummary(locale, reward);

	return createSession({
		id: `quest-complete:${questId}`,
		npcId: null,
		speaker: t(locale, 'content.dialogue.speakers.guildNotice'),
		lines: [
			t(locale, 'content.dialogue.system.questCompleteNotice', {
				questTitle,
				rewardSummary
			})
		],
		choices: [],
		mode: 'system'
	});
}

export function buildDialogueFallback(speaker: string, line: string): DialogueSession {
	return createSession({
		id: `fallback:${speaker}:${line}`,
		npcId: null,
		speaker,
		lines: [line],
		choices: [],
		mode: 'system'
	});
}

function createSession({
	id,
	npcId = null,
	speaker,
	lines,
	choices,
	completionIntent = null,
	mode
}: {
	id: string;
	npcId?: string | null;
	speaker: string;
	lines: string[];
	choices: DialogueChoice[];
	completionIntent?: DialogueIntent | null;
	mode?: DialogueMode;
}): DialogueSession {
	return {
		id,
		npcId,
		speaker,
		lines,
		line: lines[0] ?? '',
		lineIndex: 0,
		lineCount: lines.length,
		mode: mode ?? (lines.length <= 1 && choices.length > 0 ? 'choice' : 'conversation'),
		choices,
		completionIntent,
		canClose: true
	};
}

function buildGuildQuestListSession(questState: QuestState, locale: Locale): DialogueSession {
	const questChoices = getAvailableGuildQuestIds(questState).flatMap((questId) => {
		const quest = getQuest(questId);
		if (!quest) return [];
		const questText = getQuestText(locale, quest.id);

		return [
			{
				id: `quest:${quest.id}`,
				label: questText?.title ?? quest.title,
				intent: { type: 'showQuestDetails', questId: quest.id } satisfies DialogueIntent
			}
		];
	});
	const guildMasterName = getNpcText(locale, 'guild-master')?.name ?? 'Guild Master Arlen';

	return createSession({
		id: 'guild-quest-list',
		npcId: 'guild-master',
		speaker: guildMasterName,
		lines:
			questChoices.length > 0
				? [t(locale, 'content.dialogue.system.chooseGuildWork')]
				: [t(locale, 'content.dialogue.system.noNewGuildWork')],
		choices: [
			...questChoices,
			{ id: 'close', label: t(locale, 'content.dialogue.actions.close'), intent: { type: 'close' } }
		],
		mode: 'choice'
	});
}

function buildGuildQuestDetailSession(questId: QuestId, locale: Locale): DialogueSession {
	const quest = getQuest(questId);
	const objective = quest?.objectives[0];
	const guildMasterName = getNpcText(locale, 'guild-master')?.name ?? 'Guild Master Arlen';

	if (!quest || !objective) {
		return buildDialogueFallback(
			guildMasterName,
			t(locale, 'content.dialogue.system.guildWorkUnavailable')
		);
	}
	const questText = getQuestText(locale, quest.id);
	const objectiveText = getQuestObjectiveText(locale, quest.id, objective.id);
	const rewardSummary = formatRewardSummary(locale, quest.reward);

	return createSession({
		id: `guild-quest-detail:${quest.id}`,
		npcId: 'guild-master',
		speaker: guildMasterName,
		lines: [
			t(locale, 'content.dialogue.system.questDetailNotice', {
				questTitle: questText?.title ?? quest.title,
				objectiveDescription: objectiveText?.description ?? objective.description,
				rewardSummary
			})
		],
		choices: [
			{
				id: `accept:${quest.id}`,
				label: t(locale, 'content.dialogue.actions.accept'),
				intent: { type: 'acceptQuest', questId: quest.id }
			},
			{
				id: 'quest-list',
				label: t(locale, 'content.dialogue.actions.back'),
				intent: { type: 'showQuestList', giverNpcId: 'guild-master' }
			},
			{ id: 'close', label: t(locale, 'content.dialogue.actions.close'), intent: { type: 'close' } }
		],
		mode: 'choice'
	});
}
