import { describe, expect, it } from 'vitest';

import { homeBedside } from '$lib/game/content/player';
import { mainQuestIds, quests } from '$lib/game/content/quests';
import {
	applyQuestEvent,
	buildHudQuestState,
	cloneQuestState,
	createInitialQuestState,
	getCurrentObjective,
	getStoryProgress,
	takeNextQuestEffect,
	type QuestEvent,
	type QuestEventResult,
	type QuestState
} from '$lib/game/core/quests';
import { eventsFor } from '$lib/game/core/quests.fixtures';

function apply(state: QuestState, events: QuestEvent[]): QuestEventResult[] {
	const results: QuestEventResult[] = [];
	for (const event of events) {
		const result = applyQuestEvent({ state, event });
		results.push(result);
		state = result.state;
	}
	return results;
}

function completeCurrentObjective(state: QuestState): QuestEventResult[] {
	const objective = getCurrentObjective(state);
	if (!objective) throw new Error('no current objective');
	return apply(state, eventsFor(objective));
}

function drainEffects(state: QuestState): QuestState {
	let next = takeNextQuestEffect(state);
	while (next.effect) next = takeNextQuestEffect(next.state);
	return next.state;
}

describe('quest core', () => {
	it('starts the prologue at Old Mott with the opening scene queued', () => {
		const state = createInitialQuestState();

		expect(getStoryProgress(state)).toEqual({
			questId: 'prologue-proving-morning',
			objectiveId: 'talk-to-mott'
		});
		expect(state.pendingEffects).toEqual([{ type: 'play-scene', sceneId: 'prologue.opening' }]);
	});

	it('takes queued effects in order without mutating the source state', () => {
		const state = createInitialQuestState();
		const next = takeNextQuestEffect(state);

		expect(next.effect).toEqual({ type: 'play-scene', sceneId: 'prologue.opening' });
		expect(next.state.pendingEffects).toEqual([]);
		expect(state.pendingEffects).toHaveLength(1);
		expect(takeNextQuestEffect(next.state)).toEqual({ effect: null, state: next.state });
	});

	it('advances objective by objective and grants objective rewards', () => {
		const state = drainEffects(createInitialQuestState());
		const [result] = apply(state, [{ type: 'talk-to-npc', npcId: 'mott-hearth' }]);

		expect(getStoryProgress(result!.state).objectiveId).toBe('collect-practice-spear');
		expect(result!.rewards).toEqual([
			{
				questId: 'prologue-proving-morning',
				title: quests['prologue-proving-morning'].title,
				reward: { items: [{ itemId: 'ancestral-amulet', quantity: 1 }] }
			}
		]);
		expect(result!.state.completedObjectives['prologue-proving-morning']).toEqual(['talk-to-mott']);
	});

	it('ignores events for anything but the current objective', () => {
		const state = drainEffects(createInitialQuestState());

		for (const event of [
			{ type: 'talk-to-npc', npcId: 'borak' },
			{ type: 'inspect', discoveryId: 'boar-sign-sapling' },
			{ type: 'lose-battle', enemyId: 'sun-crest-captain' }
		] satisfies QuestEvent[]) {
			const result = applyQuestEvent({ state, event });
			expect(result.state).toBe(state);
			expect(result.rewards).toEqual([]);
			expect(result.progressUpdates).toEqual([]);
		}
	});

	it('counts each talk target once and reports partial progress', () => {
		let state = createInitialQuestState();
		while (getStoryProgress(state).objectiveId !== 'share-the-dinner') {
			state = completeCurrentObjective(state).at(-1)!.state;
		}

		const [first, repeat, second] = apply(state, [
			{ type: 'talk-to-npc', npcId: 'tikka-home' },
			{ type: 'talk-to-npc', npcId: 'tikka-home' },
			{ type: 'talk-to-npc', npcId: 'drogg-home' }
		]);

		expect(first!.progressUpdates[0]).toMatchObject({
			objectiveId: 'share-the-dinner',
			previousProgress: 0,
			currentProgress: 1,
			target: 3
		});
		expect(repeat!.progressUpdates).toEqual([]);
		expect(second!.progressUpdates[0]).toMatchObject({ currentProgress: 2, target: 3 });
	});

	it('counts separate battle units in one encounter but not the same unit twice', () => {
		let state = createInitialQuestState();
		while (getStoryProgress(state).objectiveId !== 'repel-the-soldiers') {
			state = completeCurrentObjective(state).at(-1)!.state;
		}
		const soldier = (sourceId: string): QuestEvent => ({
			type: 'defeat-enemy',
			mapId: 'meadow-entry',
			encounterId: 'raid-soldiers-lane',
			enemyId: 'human-soldier',
			sourceId
		});

		const results = apply(state, [soldier('a'), soldier('a'), soldier('b')]);

		expect(results.map((result) => result.progressUpdates[0]?.currentProgress)).toEqual([
			1,
			undefined,
			2
		]);
	});

	it('completes a quest, grants its reward, and starts the next with its opening effects', () => {
		let state = drainEffects(createInitialQuestState());
		while (getStoryProgress(state).objectiveId !== 'report-to-borak') {
			state = completeCurrentObjective(state).at(-1)!.state;
		}

		const [result] = completeCurrentObjective(state);

		expect(result!.completedQuestIds).toEqual(['prologue-proving-morning']);
		expect(result!.rewards.at(-1)?.reward).toEqual({ coins: 10 });
		expect(getStoryProgress(result!.state)).toEqual({
			questId: 'prologue-trial-tracks',
			objectiveId: 'meet-lirra-forest'
		});
	});

	it('plays the whole prologue chain to the end, queueing every effect in story order', () => {
		let state = createInitialQuestState();
		const completed: string[] = [];

		while (getCurrentObjective(state)) {
			for (const result of completeCurrentObjective(state)) {
				completed.push(...result.completedQuestIds);
				state = result.state;
			}
		}

		expect(completed).toEqual([...mainQuestIds]);
		expect(getStoryProgress(state)).toEqual({ questId: 'prologue-escape', objectiveId: null });
		expect(state.pendingEffects).toEqual(
			mainQuestIds.flatMap((questId) => [
				...(quests[questId].onStart ?? []),
				...quests[questId].objectives.flatMap((objective) => objective.onComplete ?? [])
			])
		);
		expect(state.pendingEffects).toContainEqual({ type: 'move-player', ...homeBedside });
	});

	it('deep-clones state so later events never touch an earlier snapshot', () => {
		const state = createInitialQuestState();
		const clone = cloneQuestState(state);
		clone.pendingEffects.pop();
		clone.entries['prologue-proving-morning']!.countedSourceIds.push('npc:x');

		expect(state.pendingEffects).toHaveLength(1);
		expect(state.entries['prologue-proving-morning']!.countedSourceIds).toEqual([]);
	});

	it('builds HUD state with the active quest and completed quests', () => {
		let state = createInitialQuestState();
		while (getStoryProgress(state).questId !== 'prologue-trial-tracks') {
			state = completeCurrentObjective(state).at(-1)!.state;
		}

		const hud = buildHudQuestState({ state, locale: 'en' });

		expect(hud.main).toMatchObject({
			questId: 'prologue-trial-tracks',
			status: 'active',
			objectiveId: 'meet-lirra-forest',
			progress: { current: 0, target: 1 }
		});
		expect(hud.completed.map((entry) => entry.questId)).toEqual(['prologue-proving-morning']);
		expect(hud.completed[0]?.progress.current).toBe(hud.completed[0]?.progress.target);
	});

	it('localizes quest HUD text for Japanese', () => {
		const hud = buildHudQuestState({ state: createInitialQuestState(), locale: 'ja' });

		expect(hud.main).toMatchObject({
			title: '試練の朝',
			objective: '炉端のモット爺と話す。',
			progress: { label: 'モット爺と話した' }
		});
	});
});
