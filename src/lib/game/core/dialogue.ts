import {
	getDialogue,
	type DialogueActionIntent,
	type DialogueBranchCondition
} from '$lib/game/content/dialogue';
import { getQuest, mainQuestId, type QuestId, type QuestReward } from '$lib/game/content/quests';
import {
	getAvailableGuildQuestIds,
	hasCompletedQuestObjective,
	type QuestState
} from '$lib/game/core/quests';

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

export function startNpcDialogue({
	npcId,
	questState
}: {
	npcId: string;
	questState: QuestState;
}): DialogueSession {
	const definition = getDialogue(npcId);
	if (!definition) return buildDialogueFallback('Traveler', 'No dialogue is available.');

	const branch =
		definition.defaultBranches.find((candidate) =>
			branchMatches(candidate.condition, questState)
		) ?? definition.defaultBranches[definition.defaultBranches.length - 1];
	const lines = branch?.lines ?? ['No dialogue is available.'];
	const choices = definition.actions.map((action) => ({
		id: action.id,
		label: action.label,
		intent: action.intent
	}));
	const needsGuildBriefing =
		definition.id === 'guild-master' &&
		!hasCompletedQuestObjective(questState, mainQuestId, 'talk-to-guild-master');

	return createSession({
		id: `npc:${definition.id}`,
		npcId: definition.id,
		speaker: definition.speaker,
		lines,
		choices,
		completionIntent: needsGuildBriefing
			? { type: 'recordNpcTalk', npcId: 'guild-master' }
			: null
	});
}

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
	questState
}: {
	session: DialogueSession;
	choiceId: string;
	questState: QuestState;
}): DialogueChoiceResult {
	const choice = session.choices.find((candidate) => candidate.id === choiceId);
	if (!choice) {
		return {
			session: buildDialogueFallback(session.speaker, 'That option is not available.'),
			intent: null
		};
	}

	if (choice.intent.type === 'showQuestList') {
		return { session: buildGuildQuestListSession(questState), intent: choice.intent };
	}

	if (choice.intent.type === 'talk' && session.npcId) {
		return {
			session: startNpcDialogue({ npcId: session.npcId, questState }),
			intent: choice.intent
		};
	}

	if (choice.intent.type === 'showQuestDetails') {
		return { session: buildGuildQuestDetailSession(choice.intent.questId), intent: choice.intent };
	}

	return { session: null, intent: choice.intent };
}

export function buildQuestCompletionDialogue({
	questId,
	title,
	reward
}: {
	questId: QuestId;
	title: string;
	reward: QuestReward;
}): DialogueSession {
	return createSession({
		id: `quest-complete:${questId}`,
		npcId: null,
		speaker: 'Guild Notice',
		lines: [`Quest complete: ${title}. Reward: ${formatRewardSummary(reward)}.`],
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
	mode = 'conversation'
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
		mode,
		choices,
		completionIntent,
		canClose: true
	};
}

function buildGuildQuestListSession(questState: QuestState): DialogueSession {
	const questChoices = getAvailableGuildQuestIds(questState).flatMap((questId) => {
		const quest = getQuest(questId);
		if (!quest) return [];

		return [
			{
				id: `quest:${quest.id}`,
				label: quest.title,
				intent: { type: 'showQuestDetails', questId: quest.id } satisfies DialogueIntent
			}
		];
	});

	return createSession({
		id: 'guild-quest-list',
		npcId: 'guild-master',
		speaker: 'Guild Master Arlen',
		lines:
			questChoices.length > 0
				? ['Choose the Guild work you want to review.']
				: ['No new Guild work is available right now.'],
		choices: [...questChoices, { id: 'close', label: 'Close', intent: { type: 'close' } }],
		mode: 'choice'
	});
}

function buildGuildQuestDetailSession(questId: QuestId): DialogueSession {
	const quest = getQuest(questId);
	const objective = quest?.objectives[0];
	if (!quest || !objective) {
		return buildDialogueFallback('Guild Master Arlen', 'That Guild work is no longer available.');
	}

	return createSession({
		id: `guild-quest-detail:${quest.id}`,
		npcId: 'guild-master',
		speaker: 'Guild Master Arlen',
		lines: [`${quest.title}: ${objective.description} Reward: ${formatRewardSummary(quest.reward)}.`],
		choices: [
			{ id: `accept:${quest.id}`, label: 'Accept', intent: { type: 'acceptQuest', questId: quest.id } },
			{
				id: 'quest-list',
				label: 'Back',
				intent: { type: 'showQuestList', giverNpcId: 'guild-master' }
			},
			{ id: 'close', label: 'Close', intent: { type: 'close' } }
		],
		mode: 'choice'
	});
}

function branchMatches(condition: DialogueBranchCondition, questState: QuestState): boolean {
	if (condition === 'mainQuestNeedsGuildBriefing') {
		return !hasCompletedQuestObjective(questState, mainQuestId, 'talk-to-guild-master');
	}

	if (condition === 'guildBriefingComplete') {
		return hasCompletedQuestObjective(questState, mainQuestId, 'talk-to-guild-master');
	}

	if (condition === 'hasActiveSideQuest') {
		return Object.entries(questState.entries).some(
			([questId, entry]) => questId !== mainQuestId && entry.status === 'active'
		);
	}

	if (condition === 'hasCompletedQuest') {
		return Object.entries(questState.entries).some(
			([questId, entry]) => questId !== mainQuestId && entry.status === 'completed'
		);
	}

	return condition === 'always';
}

function formatRewardSummary(reward: QuestReward): string {
	const parts = [
		reward.xp ? `${reward.xp} XP` : '',
		reward.coins ? `${reward.coins} coins` : '',
		...(reward.items ?? []).map((item) => `${item.quantity} item`)
	].filter(Boolean);

	return parts.join(' / ');
}
