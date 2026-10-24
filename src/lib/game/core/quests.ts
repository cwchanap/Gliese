import {
	getQuest,
	mainQuestIds,
	quests,
	type QuestDefinition,
	type QuestEffect,
	type QuestId,
	type QuestObjective,
	type QuestReward
} from '$lib/game/content/quests';
import { formatRewardSummary, getQuestObjectiveText, getQuestText } from '$lib/game/i18n/content';
import type { Locale } from '$lib/game/i18n/locales';

export type QuestEntryStatus = 'active' | 'completed';

export type QuestEntryState = {
	status: QuestEntryStatus;
	currentObjectiveId: string;
	progress: number;
	countedSourceIds: string[];
};

export type QuestState = {
	entries: Partial<Record<QuestId, QuestEntryState>>;
	completedObjectives: Partial<Record<QuestId, string[]>>;
	/** Presentation queued by completed objectives; the world plays it in order. */
	pendingEffects: QuestEffect[];
};

/** Where the main story stands. `objectiveId` is null once the prologue is complete. */
export type StoryProgress = {
	questId: QuestId;
	objectiveId: string | null;
};

export type QuestEvent =
	| { type: 'talk-to-npc'; npcId: string }
	| {
			type: 'defeat-enemy';
			mapId: string;
			encounterId: string;
			enemyId: string;
			sourceId?: string;
	  }
	| { type: 'collect-item'; mapId: string; pickupId: string; itemId: string; quantity: number }
	| { type: 'inspect'; discoveryId: string }
	| { type: 'lose-battle'; enemyId: string };

export type QuestRewardGrant = {
	questId: QuestId;
	title: string;
	reward: QuestReward;
};

export type QuestProgressUpdate = {
	questId: QuestId;
	title: string;
	objectiveId: string;
	progressLabel: string;
	previousProgress: number;
	currentProgress: number;
	target: number;
};

export type QuestEventResult = {
	state: QuestState;
	rewards: QuestRewardGrant[];
	completedQuestIds: QuestId[];
	progressUpdates: QuestProgressUpdate[];
};

export type HudQuestEntry = {
	questId: QuestId;
	title: string;
	status: QuestEntryStatus;
	description: string;
	/** Stable id of the current objective — the journal matches the chain
	 *  position on this, never on the translated `objective` text. */
	objectiveId: string;
	objective: string;
	progress: { current: number; target: number; label: string };
	rewardSummary: string;
};

export type HudQuestState = {
	main: HudQuestEntry | null;
	completed: HudQuestEntry[];
};

export function createInitialQuestState(): QuestState {
	return activateQuest({ entries: {}, completedObjectives: {}, pendingEffects: [] }, mainQuestIds[0]);
}

export function cloneQuestState(state: QuestState): QuestState {
	return {
		entries: Object.fromEntries(
			Object.entries(state.entries).map(([questId, entry]) => [
				questId,
				{ ...entry, countedSourceIds: [...entry.countedSourceIds] }
			])
		),
		completedObjectives: Object.fromEntries(
			Object.entries(state.completedObjectives).map(([questId, objectiveIds]) => [
				questId,
				[...objectiveIds]
			])
		),
		pendingEffects: state.pendingEffects.map((effect) => ({ ...effect }))
	};
}

export function isQuestComplete(state: QuestState, questId: QuestId): boolean {
	return state.entries[questId]?.status === 'completed';
}

export function getStoryProgress(state: QuestState): StoryProgress {
	for (const questId of mainQuestIds) {
		const entry = state.entries[questId];
		if (entry?.status === 'active') {
			return { questId, objectiveId: entry.currentObjectiveId };
		}
	}

	// Past the last objective the world stays in its final story state.
	return { questId: mainQuestIds[mainQuestIds.length - 1]!, objectiveId: null };
}

/** The active main objective, or null once the prologue is complete. */
export function getCurrentObjective(state: QuestState): QuestObjective | null {
	const { questId, objectiveId } = getStoryProgress(state);
	return getQuest(questId)?.objectives.find((objective) => objective.id === objectiveId) ?? null;
}

export function takeNextQuestEffect(state: QuestState): {
	effect: QuestEffect | null;
	state: QuestState;
} {
	const [effect, ...rest] = state.pendingEffects;
	return effect
		? { effect, state: { ...cloneQuestState(state), pendingEffects: rest } }
		: { effect: null, state };
}

export function applyQuestEvent({
	state,
	event
}: {
	state: QuestState;
	event: QuestEvent;
}): QuestEventResult {
	const result: QuestEventResult = {
		state,
		rewards: [],
		completedQuestIds: [],
		progressUpdates: []
	};
	const { questId, objectiveId } = getStoryProgress(state);
	const quest = getQuest(questId);
	const entry = state.entries[questId];
	const objective = quest?.objectives.find((candidate) => candidate.id === objectiveId);
	if (!quest || !entry || !objective || !eventMatchesObjective(event, objective)) return result;

	const sourceId = getQuestEventSourceId(event);
	if (entry.countedSourceIds.includes(sourceId)) return result;

	const previousProgress = entry.progress;
	const progress = Math.min(objective.target, previousProgress + getEventProgress(event));
	let nextState = cloneQuestState(state);
	nextState.entries[quest.id] = {
		...entry,
		progress,
		countedSourceIds: [...entry.countedSourceIds, sourceId]
	};

	if (progress < objective.target) {
		result.state = nextState;
		result.progressUpdates.push({
			questId: quest.id,
			title: quest.title,
			objectiveId: objective.id,
			progressLabel: objective.progressLabel,
			previousProgress,
			currentProgress: progress,
			target: objective.target
		});
		return result;
	}

	nextState.completedObjectives[quest.id] = [
		...(nextState.completedObjectives[quest.id] ?? []),
		objective.id
	];
	nextState.pendingEffects.push(...(objective.onComplete ?? []));
	if (objective.reward) {
		result.rewards.push({ questId: quest.id, title: quest.title, reward: objective.reward });
	}

	const nextObjective = quest.objectives[quest.objectives.indexOf(objective) + 1];
	if (nextObjective) {
		nextState.entries[quest.id] = startObjective(nextObjective);
		result.state = nextState;
		return result;
	}

	nextState.entries[quest.id] = { ...nextState.entries[quest.id]!, status: 'completed' };
	result.rewards.push({ questId: quest.id, title: quest.title, reward: quest.reward });
	result.completedQuestIds.push(quest.id);
	const nextQuestId = mainQuestIds[mainQuestIds.indexOf(quest.id) + 1];
	if (nextQuestId) nextState = activateQuest(nextState, nextQuestId);
	result.state = nextState;
	return result;
}

export function buildHudQuestState({
	state,
	locale
}: {
	state: QuestState;
	locale: Locale;
}): HudQuestState {
	const entries = mainQuestIds.flatMap((questId) => {
		const quest = quests[questId];
		const entry = state.entries[questId];
		const objective = quest.objectives.find(
			(candidate) => candidate.id === entry?.currentObjectiveId
		);
		return entry && objective ? [buildHudEntry(quest, objective, entry, locale)] : [];
	});

	return {
		main: entries.find((entry) => entry.status === 'active') ?? null,
		completed: entries.filter((entry) => entry.status === 'completed')
	};
}

function activateQuest(state: QuestState, questId: QuestId): QuestState {
	const quest = quests[questId];
	return {
		...state,
		entries: { ...state.entries, [questId]: startObjective(quest.objectives[0]!) },
		pendingEffects: [...state.pendingEffects, ...(quest.onStart ?? [])]
	};
}

function startObjective(objective: QuestObjective): QuestEntryState {
	return { status: 'active', currentObjectiveId: objective.id, progress: 0, countedSourceIds: [] };
}

function getQuestEventSourceId(event: QuestEvent): string {
	switch (event.type) {
		case 'talk-to-npc':
			return `npc:${event.npcId}`;
		case 'defeat-enemy':
			return event.sourceId
				? `encounter:${event.encounterId}:${event.sourceId}`
				: `encounter:${event.encounterId}`;
		case 'collect-item':
			return `pickup:${event.pickupId}`;
		case 'inspect':
			return `discovery:${event.discoveryId}`;
		case 'lose-battle':
			return `defeat:${event.enemyId}`;
	}
}

function eventMatchesObjective(event: QuestEvent, objective: QuestObjective): boolean {
	switch (objective.kind) {
		case 'talk-to-npc':
			return event.type === 'talk-to-npc' && objective.npcIds.includes(event.npcId);
		case 'defeat-enemy':
			return (
				event.type === 'defeat-enemy' &&
				event.enemyId === objective.enemyId &&
				objective.mapIds.includes(event.mapId)
			);
		case 'collect-item':
			return (
				event.type === 'collect-item' &&
				objective.sources.some(
					(source) =>
						source.mapId === event.mapId &&
						source.pickupId === event.pickupId &&
						source.itemId === event.itemId
				)
			);
		case 'inspect':
			return event.type === 'inspect' && objective.discoveryIds.includes(event.discoveryId);
		case 'lose-battle':
			return event.type === 'lose-battle' && event.enemyId === objective.enemyId;
	}
}

function getEventProgress(event: QuestEvent): number {
	return event.type === 'collect-item' ? Math.max(0, event.quantity) : 1;
}

function buildHudEntry(
	quest: QuestDefinition,
	objective: QuestObjective,
	entry: QuestEntryState,
	locale: Locale
): HudQuestEntry {
	const questText = getQuestText(locale, quest.id);
	const objectiveText = getQuestObjectiveText(locale, quest.id, objective.id);

	return {
		questId: quest.id,
		title: questText?.title ?? quest.title,
		status: entry.status,
		description: questText?.description ?? quest.description,
		objectiveId: objective.id,
		objective: objectiveText?.description ?? objective.description,
		progress: {
			current: entry.status === 'completed' ? objective.target : entry.progress,
			target: objective.target,
			label: objectiveText?.progressLabel ?? objective.progressLabel
		},
		rewardSummary: formatRewardSummary(locale, quest.reward)
	};
}
