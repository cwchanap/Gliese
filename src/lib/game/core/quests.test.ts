import { describe, expect, it } from 'vitest';

import {
	acceptQuest,
	applyQuestEvent,
	buildHudQuestState,
	createInitialQuestState,
	getAvailableGuildQuestIds,
	hasCompletedQuestObjective,
	isQuestComplete
} from '$lib/game/core/quests';

const emptyWorldFlags = {
	clearedEncounterIds: new Set<string>(),
	collectedPickupIds: new Set<string>()
};

describe('quest core', () => {
	it('starts the main quest at the Guild Master objective', () => {
		const state = createInitialQuestState();

		expect(state.entries).toEqual({
			'investigate-the-ruins': {
				status: 'active',
				currentObjectiveId: 'talk-to-guild-master',
				progress: 0,
				rewardApplied: false,
				countedSourceIds: []
			}
		});
		expect(getAvailableGuildQuestIds(state)).toEqual([]);
		expect(hasCompletedQuestObjective(state, 'investigate-the-ruins', 'talk-to-guild-master')).toBe(
			false
		);
	});

	it('advances the main quest and unlocks Guild side quests after talking to the Guild Master', () => {
		const result = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		});

		expect(result.rewards).toEqual([]);
		expect(result.state.entries['investigate-the-ruins']).toEqual({
			status: 'active',
			currentObjectiveId: 'defeat-ruins-warden',
			progress: 0,
			rewardApplied: false,
			countedSourceIds: []
		});
		expect(
			hasCompletedQuestObjective(result.state, 'investigate-the-ruins', 'talk-to-guild-master')
		).toBe(true);
		expect(getAvailableGuildQuestIds(result.state)).toEqual([
			'thin-village-slimes',
			'thin-ruins-slimes',
			'recover-ruins-relics'
		]);
	});

	it('accepts available Guild side quests and rejects invalid accepts without mutation', () => {
		const locked = createInitialQuestState();
		const unlocked = applyQuestEvent({
			state: locked,
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;

		const accepted = acceptQuest({
			state: unlocked,
			questId: 'thin-village-slimes',
			worldFlags: emptyWorldFlags
		});
		const duplicate = accepted.accepted
			? acceptQuest({
					state: accepted.state,
					questId: 'thin-village-slimes',
					worldFlags: emptyWorldFlags
				})
			: accepted;
		const main = acceptQuest({
			state: unlocked,
			questId: 'investigate-the-ruins',
			worldFlags: emptyWorldFlags
		});
		const missing = acceptQuest({
			state: unlocked,
			questId: 'not-a-quest',
			worldFlags: emptyWorldFlags
		});
		const lockedResult = acceptQuest({
			state: locked,
			questId: 'thin-ruins-slimes',
			worldFlags: emptyWorldFlags
		});

		expect(accepted.accepted).toBe(true);
		expect(accepted.accepted ? accepted.state.entries['thin-village-slimes'] : undefined).toEqual({
			status: 'active',
			currentObjectiveId: 'defeat-village-slimes',
			progress: 0,
			rewardApplied: false,
			countedSourceIds: []
		});
		expect(duplicate).toMatchObject({ accepted: false, reason: 'already-active' });
		expect(main).toMatchObject({ accepted: false, reason: 'main-quest' });
		expect(missing).toMatchObject({ accepted: false, reason: 'quest-not-found' });
		expect(lockedResult).toMatchObject({ accepted: false, reason: 'not-available' });
		expect(unlocked.entries['thin-village-slimes']).toBeUndefined();
	});

	it('seeds accepted side quest progress from already cleared world flags', () => {
		const unlocked = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;

		const accepted = acceptQuest({
			state: unlocked,
			questId: 'thin-village-slimes',
			worldFlags: {
				clearedEncounterIds: new Set(['meadow-slime-west', 'meadow-slime-center']),
				collectedPickupIds: new Set()
			}
		});

		expect(accepted.accepted).toBe(true);
		expect(accepted.accepted ? accepted.rewards : []).toEqual([]);
		expect(
			accepted.accepted ? accepted.state.entries['thin-village-slimes']?.progress : undefined
		).toBe(2);
		expect(
			accepted.accepted ? accepted.state.entries['thin-village-slimes']?.countedSourceIds : []
		).toEqual(['encounter:meadow-slime-west', 'encounter:meadow-slime-center']);
	});

	it('completes and rewards a side quest on accept when all sources are already cleared', () => {
		const unlocked = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;

		const accepted = acceptQuest({
			state: unlocked,
			questId: 'thin-village-slimes',
			worldFlags: {
				clearedEncounterIds: new Set([
					'meadow-slime-west',
					'meadow-slime-center',
					'meadow-slime-east'
				]),
				collectedPickupIds: new Set()
			}
		});

		expect(accepted.accepted).toBe(true);
		expect(
			accepted.accepted ? accepted.state.entries['thin-village-slimes'] : undefined
		).toMatchObject({
			status: 'completed',
			progress: 3,
			rewardApplied: true
		});
		expect(accepted.accepted ? accepted.rewards : []).toEqual([
			{
				questId: 'thin-village-slimes',
				title: 'Thin Village Slimes',
				reward: { xp: 6, coins: 12, items: [{ itemId: 'field-potion', quantity: 1 }] }
			}
		]);
	});

	it('rejects accepting an already completed side quest', () => {
		const unlocked = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;
		const accepted = acceptQuest({
			state: unlocked,
			questId: 'thin-village-slimes',
			worldFlags: {
				clearedEncounterIds: new Set([
					'meadow-slime-west',
					'meadow-slime-center',
					'meadow-slime-east'
				]),
				collectedPickupIds: new Set()
			}
		});
		if (!accepted.accepted) throw new Error(accepted.reason);

		const result = acceptQuest({
			state: accepted.state,
			questId: 'thin-village-slimes',
			worldFlags: emptyWorldFlags
		});

		expect(result).toMatchObject({ accepted: false, reason: 'already-completed' });
	});

	it('completes side quests from enemy and pickup events and emits rewards once', () => {
		const unlocked = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;
		const villageAccepted = acceptQuest({
			state: unlocked,
			questId: 'thin-village-slimes',
			worldFlags: emptyWorldFlags
		});
		if (!villageAccepted.accepted) throw new Error(villageAccepted.reason);

		const first = applyQuestEvent({
			state: villageAccepted.state,
			event: {
				type: 'defeat-enemy',
				mapId: 'meadow-entry',
				encounterId: 'meadow-slime-west',
				enemyId: 'slime-scout'
			}
		});
		const second = applyQuestEvent({
			state: first.state,
			event: {
				type: 'defeat-enemy',
				mapId: 'meadow-entry',
				encounterId: 'meadow-slime-center',
				enemyId: 'slime-scout'
			}
		});
		const third = applyQuestEvent({
			state: second.state,
			event: {
				type: 'defeat-enemy',
				mapId: 'meadow-entry',
				encounterId: 'meadow-slime-east',
				enemyId: 'slime-scout'
			}
		});
		const repeated = applyQuestEvent({
			state: third.state,
			event: {
				type: 'defeat-enemy',
				mapId: 'meadow-entry',
				encounterId: 'meadow-slime-east',
				enemyId: 'slime-scout'
			}
		});

		expect(first.rewards).toEqual([]);
		expect(second.rewards).toEqual([]);
		expect(third.state.entries['thin-village-slimes']).toMatchObject({
			status: 'completed',
			progress: 3,
			rewardApplied: true
		});
		expect(third.rewards).toEqual([
			{
				questId: 'thin-village-slimes',
				title: 'Thin Village Slimes',
				reward: { xp: 6, coins: 12, items: [{ itemId: 'field-potion', quantity: 1 }] }
			}
		]);
		expect(repeated.rewards).toEqual([]);

		const relicsAccepted = acceptQuest({
			state: unlocked,
			questId: 'recover-ruins-relics',
			worldFlags: emptyWorldFlags
		});
		if (!relicsAccepted.accepted) throw new Error(relicsAccepted.reason);

		const rune = applyQuestEvent({
			state: relicsAccepted.state,
			event: {
				type: 'collect-item',
				mapId: 'ruins-threshold',
				pickupId: 'ruins-threshold-rune',
				itemId: 'threshold-rune',
				quantity: 1
			}
		});
		const draught = applyQuestEvent({
			state: rune.state,
			event: {
				type: 'collect-item',
				mapId: 'ruins-core',
				pickupId: 'ruins-core-draught',
				itemId: 'ruin-draught',
				quantity: 1
			}
		});

		expect(rune.rewards).toEqual([]);
		expect(draught.rewards).toEqual([
			{
				questId: 'recover-ruins-relics',
				title: 'Recover Ruins Relics',
				reward: { xp: 8, coins: 18, items: [{ itemId: 'ruin-draught', quantity: 1 }] }
			}
		]);
	});

	it('does not count duplicate encounter events before the objective completes', () => {
		const unlocked = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;
		const accepted = acceptQuest({
			state: unlocked,
			questId: 'thin-village-slimes',
			worldFlags: emptyWorldFlags
		});
		if (!accepted.accepted) throw new Error(accepted.reason);

		const first = applyQuestEvent({
			state: accepted.state,
			event: {
				type: 'defeat-enemy',
				mapId: 'meadow-entry',
				encounterId: 'meadow-slime-west',
				enemyId: 'slime-scout'
			}
		});
		const duplicate = applyQuestEvent({
			state: first.state,
			event: {
				type: 'defeat-enemy',
				mapId: 'meadow-entry',
				encounterId: 'meadow-slime-west',
				enemyId: 'slime-scout'
			}
		});

		expect(first.state.entries['thin-village-slimes']?.progress).toBe(1);
		expect(duplicate.state.entries['thin-village-slimes']?.progress).toBe(1);
		expect(duplicate.rewards).toEqual([]);
	});

	it('does not count duplicate pickup events before the objective completes', () => {
		const unlocked = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;
		const accepted = acceptQuest({
			state: unlocked,
			questId: 'recover-ruins-relics',
			worldFlags: emptyWorldFlags
		});
		if (!accepted.accepted) throw new Error(accepted.reason);

		const first = applyQuestEvent({
			state: accepted.state,
			event: {
				type: 'collect-item',
				mapId: 'ruins-threshold',
				pickupId: 'ruins-threshold-rune',
				itemId: 'threshold-rune',
				quantity: 1
			}
		});
		const duplicate = applyQuestEvent({
			state: first.state,
			event: {
				type: 'collect-item',
				mapId: 'ruins-threshold',
				pickupId: 'ruins-threshold-rune',
				itemId: 'threshold-rune',
				quantity: 1
			}
		});

		expect(first.state.entries['recover-ruins-relics']?.progress).toBe(1);
		expect(duplicate.state.entries['recover-ruins-relics']?.progress).toBe(1);
		expect(duplicate.rewards).toEqual([]);
	});

	it('completes the main quest from the ruins boss victory event', () => {
		const unlocked = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;

		const result = applyQuestEvent({
			state: unlocked,
			event: {
				type: 'defeat-enemy',
				mapId: 'ruins-core',
				encounterId: 'ruins-warden',
				enemyId: 'ruins-warden',
				completion: 'victory'
			}
		});

		expect(isQuestComplete(result.state, 'investigate-the-ruins')).toBe(true);
		expect(result.rewards).toEqual([
			{
				questId: 'investigate-the-ruins',
				title: 'Investigate the Ruins',
				reward: { xp: 15, coins: 35, items: [{ itemId: 'greater-field-potion', quantity: 1 }] }
			}
		]);
	});

	it('builds normalized quest HUD state', () => {
		const unlocked = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;
		const accepted = acceptQuest({
			state: unlocked,
			questId: 'thin-ruins-slimes',
			worldFlags: emptyWorldFlags
		});
		if (!accepted.accepted) throw new Error(accepted.reason);

		const hud = buildHudQuestState({
			state: accepted.state,
			nearbyQuestGiverId: 'guild-master',
			locale: 'en'
		});

		expect(hud.main).toMatchObject({
			questId: 'investigate-the-ruins',
			title: 'Investigate the Ruins',
			objective: 'Defeat the ruins warden in the ruins core.',
			status: 'active'
		});
		expect(hud.side).toContainEqual(
			expect.objectContaining({
				questId: 'thin-ruins-slimes',
				title: 'Thin Ruins Slimes',
				description: 'Reduce the slime presence inside the ruin threshold.',
				progress: { current: 0, target: 2, label: 'Ruins slimes defeated' }
			})
		);
		expect(hud.completed).toEqual([]);
		expect(hud.guildOffer?.giverName).toBe('Guild Master Arlen');
		expect(hud.guildOffer?.quests.map((quest) => quest.questId)).toEqual([
			'thin-village-slimes',
			'recover-ruins-relics'
		]);
		expect(
			buildHudQuestState({ state: accepted.state, nearbyQuestGiverId: null, locale: 'en' })
				.guildOffer
		).toBe(null);
	});

	it('falls back to English quest HUD text for untranslated locales', () => {
		const unlocked = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;
		const hud = buildHudQuestState({
			state: unlocked,
			nearbyQuestGiverId: 'guild-master',
			locale: 'ja'
		});

		expect(hud.main).toMatchObject({
			title: 'Investigate the Ruins',
			description: 'Report to the Guild Master, then defeat the ruins warden.',
			objective: 'Defeat the ruins warden in the ruins core.',
			progress: { current: 0, target: 1, label: 'Ruins warden defeated' },
			rewardSummary: '15 XP / 35 coins / 1 item'
		});
		expect(hud.guildOffer?.giverName).toBe('Guild Master Arlen');
		expect(hud.guildOffer?.quests[0]).toMatchObject({
			title: 'Thin Village Slimes',
			description: 'Clear the slimes gathering on the village road.',
			objective: 'Defeat slimes near the village.',
			rewardSummary: '6 XP / 12 coins / 1 item'
		});
	});
});
