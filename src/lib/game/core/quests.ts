import {
	getQuest,
	mainQuestId,
	questList,
	sideQuestIds,
	type QuestDefinition,
	type QuestId,
	type QuestObjective,
	type QuestReward
} from '$lib/game/content/quests';
import { maps } from '$lib/game/content/maps';
import {
	formatRewardSummary,
	getNpcText,
	getQuestObjectiveText,
	getQuestText
} from '$lib/game/i18n/content';
import type { Locale } from '$lib/game/i18n/locales';

export type QuestEntryStatus = 'active' | 'completed';

export type QuestEntryState = {
	status: QuestEntryStatus;
	currentObjectiveId: string;
	progress: number;
	rewardApplied: boolean;
	countedSourceIds: string[];
};

export type QuestState = {
	entries: Record<string, QuestEntryState>;
	completedObjectives: Record<string, string[]>;
};

export type QuestWorldFlags = {
	clearedEncounterIds: Set<string>;
	collectedPickupIds: Set<string>;
};

export type QuestEvent =
	| { type: 'talk-to-npc'; npcId: string }
	| {
			type: 'defeat-enemy';
			mapId: string;
			encounterId: string;
			enemyId: string;
			completion?: 'victory';
	  }
	| { type: 'collect-item'; mapId: string; pickupId: string; itemId: string; quantity: number };

export type QuestRewardGrant = {
	questId: QuestId;
	title: string;
	reward: QuestReward;
};

export type QuestEventResult = {
	state: QuestState;
	rewards: QuestRewardGrant[];
	completedQuestIds: QuestId[];
};

export type AcceptQuestFailureReason =
	| 'quest-not-found'
	| 'main-quest'
	| 'already-active'
	| 'already-completed'
	| 'not-available';

export type AcceptQuestResult =
	| { accepted: true; state: QuestState; rewards: QuestRewardGrant[]; completedQuestIds: QuestId[] }
	| { accepted: false; reason: AcceptQuestFailureReason; state: QuestState };

export type HudQuestEntry = {
	questId: QuestId;
	title: string;
	type: QuestDefinition['type'];
	status: QuestEntryStatus | 'available';
	description: string;
	objective: string;
	progress: { current: number; target: number; label: string };
	rewardSummary: string;
};

export type HudQuestOffer = {
	questId: QuestId;
	title: string;
	description: string;
	objective: string;
	rewardSummary: string;
};

export type HudQuestState = {
	main: HudQuestEntry | null;
	side: HudQuestEntry[];
	completed: HudQuestEntry[];
	guildOffer: null | {
		giverNpcId: 'guild-master';
		giverName: string;
		quests: HudQuestOffer[];
	};
};

export function createInitialQuestState(): QuestState {
	const mainQuest = getQuest(mainQuestId)!;
	const firstObjective = mainQuest.objectives[0]!;

	return {
		entries: {
			[mainQuestId]: {
				status: 'active',
				currentObjectiveId: firstObjective.id,
				progress: 0,
				rewardApplied: false,
				countedSourceIds: []
			}
		},
		completedObjectives: {}
	};
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
		)
	};
}

export function hasCompletedQuestObjective(
	state: QuestState,
	questId: QuestId,
	objectiveId: string
): boolean {
	return state.completedObjectives[questId]?.includes(objectiveId) ?? false;
}

export function isQuestComplete(state: QuestState, questId: QuestId): boolean {
	return state.entries[questId]?.status === 'completed';
}

export function getAvailableGuildQuestIds(state: QuestState): QuestId[] {
	if (!hasCompletedQuestObjective(state, mainQuestId, 'talk-to-guild-master')) {
		return [];
	}

	return sideQuestIds.filter((questId) => state.entries[questId] === undefined);
}

export function acceptQuest({
	state,
	questId,
	worldFlags
}: {
	state: QuestState;
	questId: string;
	worldFlags: QuestWorldFlags;
}): AcceptQuestResult {
	const quest = getQuest(questId);

	if (!quest) return { accepted: false, reason: 'quest-not-found', state };
	if (quest.type === 'main') return { accepted: false, reason: 'main-quest', state };

	const existing = state.entries[quest.id];
	if (existing?.status === 'active') return { accepted: false, reason: 'already-active', state };
	if (existing?.status === 'completed')
		return { accepted: false, reason: 'already-completed', state };
	if (!getAvailableGuildQuestIds(state).includes(quest.id)) {
		return { accepted: false, reason: 'not-available', state };
	}

	const objective = quest.objectives[0]!;
	const seededSourceIds = getExistingSourceIdsForObjective(objective, worldFlags);
	const seededProgress = Math.min(objective.target, seededSourceIds.length);
	const completed = seededProgress >= objective.target;
	const nextState = setQuestEntry(
		state,
		quest,
		objective,
		completed ? objective.target : seededProgress,
		completed,
		seededSourceIds
	);

	return {
		accepted: true,
		state: nextState,
		rewards: completed ? [buildRewardGrant(quest)] : [],
		completedQuestIds: completed ? [quest.id] : []
	};
}

export function applyQuestEvent({
	state,
	event
}: {
	state: QuestState;
	event: QuestEvent;
}): QuestEventResult {
	let nextState = cloneQuestState(state);
	const rewards: QuestRewardGrant[] = [];
	const completedQuestIds: QuestId[] = [];

	for (const quest of questList) {
		const entry = nextState.entries[quest.id];
		if (!entry || entry.status === 'completed') continue;

		const objective = quest.objectives.find(
			(candidate) => candidate.id === entry.currentObjectiveId
		);
		if (!objective || !eventMatchesObjective(event, objective)) continue;

		const sourceId = getQuestEventSourceId(event, objective);
		if (sourceId && entry.countedSourceIds.includes(sourceId)) continue;

		const nextProgress = Math.min(
			objective.target,
			entry.progress + getEventProgress(event, objective)
		);
		const countedSourceIds = sourceId
			? [...entry.countedSourceIds, sourceId]
			: entry.countedSourceIds;
		nextState = setQuestEntry(
			nextState,
			quest,
			objective,
			nextProgress,
			nextProgress >= objective.target,
			countedSourceIds
		);

		const updatedEntry = nextState.entries[quest.id]!;
		if (updatedEntry.status === 'completed' && updatedEntry.rewardApplied) {
			rewards.push(buildRewardGrant(quest));
			completedQuestIds.push(quest.id);
		}
	}

	return { state: nextState, rewards, completedQuestIds };
}

export function buildHudQuestState({
	state,
	nearbyQuestGiverId,
	locale
}: {
	state: QuestState;
	nearbyQuestGiverId: string | null;
	locale: Locale;
}): HudQuestState {
	const entries = Object.entries(state.entries).flatMap(([questId, entry]) => {
		const quest = getQuest(questId);
		const objective = quest?.objectives.find(
			(candidate) => candidate.id === entry.currentObjectiveId
		);
		return quest && objective ? [buildHudEntry(quest, objective, entry, locale)] : [];
	});

	const availableQuestIds =
		nearbyQuestGiverId === 'guild-master' ? getAvailableGuildQuestIds(state) : [];
	const availableQuests = availableQuestIds.flatMap((questId) => {
		const quest = getQuest(questId);
		const objective = quest?.objectives[0];
		return quest && objective ? [buildHudOffer(quest, objective, locale)] : [];
	});
	const guildMasterText = getNpcText(locale, 'guild-master');

	return {
		main: entries.find((entry) => entry.type === 'main') ?? null,
		side: entries.filter((entry) => entry.type === 'side' && entry.status === 'active'),
		completed: entries.filter((entry) => entry.status === 'completed'),
		guildOffer:
			availableQuests.length > 0
				? {
						giverNpcId: 'guild-master',
						giverName: guildMasterText?.name ?? 'Guild Master',
						quests: availableQuests
					}
				: null
	};
}

function setQuestEntry(
	state: QuestState,
	quest: QuestDefinition,
	objective: QuestObjective,
	progress: number,
	objectiveComplete: boolean,
	countedSourceIds: string[]
): QuestState {
	const objectiveIndex = quest.objectives.findIndex((candidate) => candidate.id === objective.id);
	const nextObjective = quest.objectives[objectiveIndex + 1];
	const completedObjectives = objectiveComplete
		? Array.from(new Set([...(state.completedObjectives[quest.id] ?? []), objective.id]))
		: (state.completedObjectives[quest.id] ?? []);

	if (objectiveComplete && nextObjective) {
		return {
			entries: {
				...state.entries,
				[quest.id]: {
					status: 'active',
					currentObjectiveId: nextObjective.id,
					progress: 0,
					rewardApplied: false,
					countedSourceIds: []
				}
			},
			completedObjectives: { ...state.completedObjectives, [quest.id]: completedObjectives }
		};
	}

	return {
		entries: {
			...state.entries,
			[quest.id]: {
				status: objectiveComplete ? 'completed' : 'active',
				currentObjectiveId: objective.id,
				progress,
				rewardApplied: objectiveComplete,
				countedSourceIds
			}
		},
		completedObjectives: objectiveComplete
			? { ...state.completedObjectives, [quest.id]: completedObjectives }
			: state.completedObjectives
	};
}

function getQuestEventSourceId(event: QuestEvent, objective: QuestObjective): string | null {
	if (objective.kind === 'defeat-enemy' && event.type === 'defeat-enemy') {
		return `encounter:${event.encounterId}`;
	}

	if (objective.kind === 'collect-item' && event.type === 'collect-item') {
		return `pickup:${event.pickupId}`;
	}

	return null;
}

function eventMatchesObjective(event: QuestEvent, objective: QuestObjective): boolean {
	if (objective.kind === 'talk-to-npc') {
		return event.type === 'talk-to-npc' && event.npcId === objective.npcId;
	}

	if (objective.kind === 'defeat-enemy') {
		return (
			event.type === 'defeat-enemy' &&
			event.enemyId === objective.enemyId &&
			objective.mapIds.includes(event.mapId) &&
			(objective.requiresCompletion === undefined ||
				event.completion === objective.requiresCompletion)
		);
	}

	return (
		event.type === 'collect-item' &&
		objective.sources.some(
			(source) =>
				source.mapId === event.mapId &&
				source.pickupId === event.pickupId &&
				source.itemId === event.itemId
		)
	);
}

function getEventProgress(event: QuestEvent, objective: QuestObjective): number {
	if (objective.kind === 'collect-item' && event.type === 'collect-item') {
		return Math.max(0, event.quantity);
	}

	return 1;
}

function getExistingSourceIdsForObjective(
	objective: QuestObjective,
	worldFlags: QuestWorldFlags
): string[] {
	if (objective.kind === 'defeat-enemy') {
		const matchingEncounterIds = objective.mapIds.flatMap((mapId) =>
			(maps[mapId]?.encounters ?? [])
				.filter((encounter) => encounter.enemyId === objective.enemyId)
				.map((encounter) => encounter.id)
		);
		return matchingEncounterIds
			.filter((encounterId) => worldFlags.clearedEncounterIds.has(encounterId))
			.slice(0, objective.target)
			.map((encounterId) => `encounter:${encounterId}`);
	}

	if (objective.kind === 'collect-item') {
		return objective.sources
			.filter((source) => worldFlags.collectedPickupIds.has(source.pickupId))
			.slice(0, objective.target)
			.map((source) => `pickup:${source.pickupId}`);
	}

	return [];
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
		type: quest.type,
		status: entry.status,
		description: questText?.description ?? quest.description,
		objective: objectiveText?.description ?? objective.description,
		progress: {
			current: entry.progress,
			target: objective.target,
			label: objectiveText?.progressLabel ?? objective.progressLabel
		},
		rewardSummary: formatRewardSummary(locale, quest.reward)
	};
}

function buildHudOffer(
	quest: QuestDefinition,
	objective: QuestObjective,
	locale: Locale
): HudQuestOffer {
	const questText = getQuestText(locale, quest.id);
	const objectiveText = getQuestObjectiveText(locale, quest.id, objective.id);

	return {
		questId: quest.id,
		title: questText?.title ?? quest.title,
		description: questText?.description ?? quest.description,
		objective: objectiveText?.description ?? objective.description,
		rewardSummary: formatRewardSummary(locale, quest.reward)
	};
}

function buildRewardGrant(quest: QuestDefinition): QuestRewardGrant {
	return { questId: quest.id, title: quest.title, reward: quest.reward };
}
