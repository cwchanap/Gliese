// Test-only helpers for positioning the main quest chain. Not imported by game code.
import type { QuestObjective } from '$lib/game/content/quests';
import {
	applyQuestEvent,
	createInitialQuestState,
	getCurrentObjective,
	getStoryProgress,
	type QuestEvent,
	type QuestState
} from '$lib/game/core/quests';

/** Every event that finishes `objective`, as the world would emit them. */
export function eventsFor(objective: QuestObjective): QuestEvent[] {
	switch (objective.kind) {
		case 'talk-to-npc':
			return objective.npcIds.map((npcId) => ({ type: 'talk-to-npc', npcId }));
		case 'inspect':
			return objective.discoveryIds.map((discoveryId) => ({ type: 'inspect', discoveryId }));
		case 'lose-battle':
			return [{ type: 'lose-battle', enemyId: objective.enemyId }];
		case 'collect-item':
			return objective.sources.map((source) => ({
				type: 'collect-item',
				mapId: source.mapId,
				pickupId: source.pickupId,
				itemId: source.itemId,
				quantity: 1
			}));
		case 'defeat-enemy':
			return Array.from({ length: objective.target }, (_, unit) => ({
				type: 'defeat-enemy',
				mapId: objective.mapIds[0]!,
				encounterId: `${objective.id}-pack`,
				enemyId: objective.enemyId,
				sourceId: `unit-${unit}`
			}));
	}
}

export function completeCurrentObjective(state: QuestState): QuestState {
	const objective = getCurrentObjective(state);
	if (!objective) throw new Error('the prologue is already complete');
	return eventsFor(objective).reduce(
		(next, event) => applyQuestEvent({ state: next, event }).state,
		state
	);
}

/**
 * Quest state with `objectiveId` current (or the whole prologue done, for null)
 * and no effects queued, as if every earlier objective was played.
 */
export function questStateAt(objectiveId: string | null): QuestState {
	let state = createInitialQuestState();
	while (getStoryProgress(state).objectiveId !== objectiveId) {
		state = completeCurrentObjective(state);
	}
	return { ...state, pendingEffects: [] };
}
