# Quest System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a main/side quest system where a new game starts with a main quest, the Guild Master unlocks the ruins route, Guild side quests can be accepted, objectives progress automatically, and rewards apply once.

**Architecture:** Quest definitions live in content, pure quest rules live in `core/quests.ts`, save state persists only active/completed quest entries, and `WorldScene` translates runtime events into quest events. The HUD bridge publishes normalized quest data, and `GameShell.svelte` renders a compact tracker, Quest Log, and Guild quest-offer overlay without importing quest content.

**Tech Stack:** TypeScript, Svelte 5 runes, Vite, Phaser 4, Vitest, Playwright, bun.

---

## File Structure

- Create `src/lib/game/content/quests.ts`: quest ids, objective definitions, rewards, and derived content helpers.
- Create `src/lib/game/content/quests.test.ts`: content validity tests for quest ids, objectives, NPC references, item rewards, and objective sources.
- Create `src/lib/game/core/quests.ts`: pure state transitions for initial quest state, availability, accept, progress events, completion, reward emission, and HUD view building.
- Create `src/lib/game/core/quests.test.ts`: pure rule tests for main quest progression, side quest acceptance, objective progress, completion, idempotence, and retroactive side quest seeding.
- Modify `src/lib/game/save/save-state.ts`: bump save schema to `version: 4`, add `quests`, validate quest state.
- Modify `src/lib/game/save/save-state.test.ts`: update existing expected saves and add quest-state rejection tests.
- Modify `src/lib/game/save/storage.ts`: move storage key from `gliese.save.v3` to `gliese.save.v4`.
- Modify `src/lib/game/ui-bridge/events.ts`: add normalized quest HUD types and `accept-quest` command.
- Modify `src/lib/game/ui-bridge/store.ts`: add initial quest HUD state and `requestAcceptQuest`.
- Modify `src/lib/game/content/maps.ts`: add a Guild Master NPC and add a quest requirement to the ruins transition.
- Modify `src/lib/game/content/maps.test.ts`: update Guild Hall NPC expectations and transition shape.
- Modify `src/lib/game/phaser/scenes/WorldScene.ts`: own quest state, seed from saves, block the ruins transition until the Guild Master objective is complete, progress quests from NPC/enemy/pickup events, apply rewards, and publish quest HUD state.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`: add scene coverage for quest gating, Guild Master progression, side quest acceptance, automatic completion, reward idempotence, and persistence.
- Modify `src/lib/game/GameShell.svelte`: add quest tracker, Quest Log overlay, Guild quest-offer overlay, and quest commands.
- Modify `tests/e2e/game.e2e.ts`: update save fixtures to v4 and add a browser flow for quest log visibility and Guild quest acceptance.

The village slime side quest must seed progress from already-cleared `meadow-entry` encounters when accepted. Without that, a player who clears village slimes before accepting the quest can make the side quest impossible.

---

### Task 1: Quest Content And Pure Rules

**Files:**
- Create: `src/lib/game/content/quests.ts`
- Create: `src/lib/game/content/quests.test.ts`
- Create: `src/lib/game/core/quests.ts`
- Create: `src/lib/game/core/quests.test.ts`

- [ ] **Step 1.1: Write failing quest content tests**

Create `src/lib/game/content/quests.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { getItem } from '$lib/game/content/items';
import { maps } from '$lib/game/content/maps';
import {
	getQuest,
	mainQuestId,
	questList,
	sideQuestIds,
	type QuestDefinition
} from '$lib/game/content/quests';

function findNpc(npcId: string) {
	return Object.values(maps)
		.flatMap((map) => map.npcs ?? [])
		.find((npc) => npc.id === npcId);
}

describe('quest content', () => {
	it('declares one main quest and three Guild side quests with stable ids', () => {
		expect(mainQuestId).toBe('investigate-the-ruins');
		expect(sideQuestIds).toEqual([
			'thin-village-slimes',
			'thin-ruins-slimes',
			'recover-ruins-relics'
		]);
		expect(new Set(questList.map((quest) => quest.id)).size).toBe(questList.length);
		expect(getQuest('investigate-the-ruins')?.type).toBe('main');
		expect(questList.filter((quest) => quest.type === 'side')).toHaveLength(3);
	});

	it('defines valid objectives and Guild side quest givers', () => {
		for (const quest of questList) {
			expect(quest.title).not.toHaveLength(0);
			expect(quest.description).not.toHaveLength(0);
			expect(quest.objectives).not.toHaveLength(0);
			expect(new Set(quest.objectives.map((objective) => objective.id)).size).toBe(
				quest.objectives.length
			);

			if (quest.type === 'side') {
				expect(quest.giverNpcId).toBe('guild-master');
				expect(findNpc(quest.giverNpcId)).toBeDefined();
				expect(quest.availableAfterQuestId).toBe(mainQuestId);
				expect(quest.availableAfterObjectiveId).toBe('talk-to-guild-master');
			}
		}
	});

	it('uses known enemies, maps, pickups, NPCs, and reward items', () => {
		for (const quest of questList) {
			for (const objective of quest.objectives) {
				if (objective.kind === 'talk-to-npc') {
					expect(findNpc(objective.npcId)).toBeDefined();
					expect(objective.target).toBe(1);
				}

				if (objective.kind === 'defeat-enemy') {
					for (const mapId of objective.mapIds) {
						expect(maps[mapId]).toBeDefined();
						expect(
							(maps[mapId].encounters ?? []).some(
								(encounter) => encounter.enemyId === objective.enemyId
							)
						).toBe(true);
					}
					expect(objective.target).toBeGreaterThan(0);
				}

				if (objective.kind === 'collect-item') {
					for (const source of objective.sources) {
						expect(maps[source.mapId]).toBeDefined();
						expect(getItem(source.itemId)).toBeDefined();
						expect((maps[source.mapId].pickups ?? []).some((pickup) => pickup.id === source.pickupId))
							.toBe(true);
					}
					expect(objective.target).toBeGreaterThan(0);
				}
			}

			for (const rewardItem of quest.reward.items ?? []) {
				expect(getItem(rewardItem.itemId)).toBeDefined();
				expect(rewardItem.quantity).toBeGreaterThan(0);
			}
		}
	});

	it('sets concrete first-pass rewards', () => {
		const rewards = Object.fromEntries(
			questList.map((quest) => [
				quest.id,
				{
					xp: quest.reward.xp ?? 0,
					coins: quest.reward.coins ?? 0,
					items: quest.reward.items ?? []
				}
			])
		) as Record<QuestDefinition['id'], { xp: number; coins: number; items: unknown[] }>;

		expect(rewards['investigate-the-ruins']).toEqual({
			xp: 15,
			coins: 35,
			items: [{ itemId: 'greater-field-potion', quantity: 1 }]
		});
		expect(rewards['thin-village-slimes']).toEqual({
			xp: 6,
			coins: 12,
			items: [{ itemId: 'field-potion', quantity: 1 }]
		});
		expect(rewards['thin-ruins-slimes']).toEqual({
			xp: 8,
			coins: 16,
			items: [{ itemId: 'sunleaf-salve', quantity: 1 }]
		});
		expect(rewards['recover-ruins-relics']).toEqual({
			xp: 8,
			coins: 18,
			items: [{ itemId: 'ruin-draught', quantity: 1 }]
		});
	});
});
```

- [ ] **Step 1.2: Run quest content tests to verify they fail**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/quests.test.ts
```

Expected: FAIL because `src/lib/game/content/quests.ts` does not exist.

- [ ] **Step 1.3: Create quest content definitions**

Create `src/lib/game/content/quests.ts`:

```ts
import type { ItemDefinition } from '$lib/game/content/items';

export const mainQuestId = 'investigate-the-ruins' as const;

export const sideQuestIds = [
	'thin-village-slimes',
	'thin-ruins-slimes',
	'recover-ruins-relics'
] as const;

export type MainQuestId = typeof mainQuestId;
export type SideQuestId = (typeof sideQuestIds)[number];
export type QuestId = MainQuestId | SideQuestId;
export type QuestType = 'main' | 'side';

export type QuestReward = {
	xp?: number;
	coins?: number;
	items?: Array<{ itemId: ItemDefinition['id']; quantity: number }>;
};

export type TalkToNpcObjective = {
	id: string;
	kind: 'talk-to-npc';
	description: string;
	progressLabel: string;
	target: 1;
	npcId: string;
};

export type DefeatEnemyObjective = {
	id: string;
	kind: 'defeat-enemy';
	description: string;
	progressLabel: string;
	target: number;
	enemyId: string;
	mapIds: string[];
	requiresCompletion?: 'victory';
};

export type CollectItemObjective = {
	id: string;
	kind: 'collect-item';
	description: string;
	progressLabel: string;
	target: number;
	sources: Array<{ mapId: string; pickupId: string; itemId: ItemDefinition['id'] }>;
};

export type QuestObjective = TalkToNpcObjective | DefeatEnemyObjective | CollectItemObjective;

export type QuestDefinition = {
	id: QuestId;
	type: QuestType;
	title: string;
	description: string;
	giverNpcId?: string;
	availableAfterQuestId?: MainQuestId;
	availableAfterObjectiveId?: string;
	objectives: QuestObjective[];
	reward: QuestReward;
};

export const quests = {
	'investigate-the-ruins': {
		id: 'investigate-the-ruins',
		type: 'main',
		title: 'Investigate the Ruins',
		description: 'Report to the Guild Master, then defeat the ruins warden.',
		objectives: [
			{
				id: 'talk-to-guild-master',
				kind: 'talk-to-npc',
				description: 'Talk to the Guild Master in the Guild Hall.',
				progressLabel: 'Guild Master spoken to',
				target: 1,
				npcId: 'guild-master'
			},
			{
				id: 'defeat-ruins-warden',
				kind: 'defeat-enemy',
				description: 'Defeat the ruins warden in the ruins core.',
				progressLabel: 'Ruins warden defeated',
				target: 1,
				enemyId: 'ruins-warden',
				mapIds: ['ruins-core'],
				requiresCompletion: 'victory'
			}
		],
		reward: {
			xp: 15,
			coins: 35,
			items: [{ itemId: 'greater-field-potion', quantity: 1 }]
		}
	},
	'thin-village-slimes': {
		id: 'thin-village-slimes',
		type: 'side',
		title: 'Thin Village Slimes',
		description: 'Clear the slimes gathering on the village road.',
		giverNpcId: 'guild-master',
		availableAfterQuestId: 'investigate-the-ruins',
		availableAfterObjectiveId: 'talk-to-guild-master',
		objectives: [
			{
				id: 'defeat-village-slimes',
				kind: 'defeat-enemy',
				description: 'Defeat slimes near the village.',
				progressLabel: 'Village slimes defeated',
				target: 3,
				enemyId: 'slime-scout',
				mapIds: ['meadow-entry']
			}
		],
		reward: {
			xp: 6,
			coins: 12,
			items: [{ itemId: 'field-potion', quantity: 1 }]
		}
	},
	'thin-ruins-slimes': {
		id: 'thin-ruins-slimes',
		type: 'side',
		title: 'Thin Ruins Slimes',
		description: 'Reduce the slime presence inside the ruin threshold.',
		giverNpcId: 'guild-master',
		availableAfterQuestId: 'investigate-the-ruins',
		availableAfterObjectiveId: 'talk-to-guild-master',
		objectives: [
			{
				id: 'defeat-ruins-slimes',
				kind: 'defeat-enemy',
				description: 'Defeat slimes in the ruins.',
				progressLabel: 'Ruins slimes defeated',
				target: 2,
				enemyId: 'slime-scout',
				mapIds: ['ruins-threshold']
			}
		],
		reward: {
			xp: 8,
			coins: 16,
			items: [{ itemId: 'sunleaf-salve', quantity: 1 }]
		}
	},
	'recover-ruins-relics': {
		id: 'recover-ruins-relics',
		type: 'side',
		title: 'Recover Ruins Relics',
		description: 'Bring back useful items from the old ruins.',
		giverNpcId: 'guild-master',
		availableAfterQuestId: 'investigate-the-ruins',
		availableAfterObjectiveId: 'talk-to-guild-master',
		objectives: [
			{
				id: 'collect-ruins-items',
				kind: 'collect-item',
				description: 'Collect ruins items from the threshold and core.',
				progressLabel: 'Ruins items recovered',
				target: 2,
				sources: [
					{ mapId: 'ruins-threshold', pickupId: 'ruins-threshold-rune', itemId: 'threshold-rune' },
					{ mapId: 'ruins-core', pickupId: 'ruins-core-draught', itemId: 'ruin-draught' }
				]
			}
		],
		reward: {
			xp: 8,
			coins: 18,
			items: [{ itemId: 'ruin-draught', quantity: 1 }]
		}
	}
} satisfies Record<QuestId, QuestDefinition>;

export const questList: QuestDefinition[] = Object.values(quests);

export function getQuest(questId: string): QuestDefinition | undefined {
	return (quests as Record<string, QuestDefinition>)[questId];
}

export function isQuestId(questId: string): questId is QuestId {
	return getQuest(questId) !== undefined;
}
```

- [ ] **Step 1.4: Run quest content tests to verify they pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/quests.test.ts
```

Expected: PASS.

- [ ] **Step 1.5: Write failing pure quest rule tests**

Create `src/lib/game/core/quests.test.ts`:

```ts
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
				rewardApplied: false
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
			rewardApplied: false
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
		const unlocked = applyQuestEvent({
			state: createInitialQuestState(),
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
		const locked = acceptQuest({
			state: createInitialQuestState(),
			questId: 'thin-ruins-slimes',
			worldFlags: emptyWorldFlags
		});

		expect(accepted.accepted).toBe(true);
		expect(accepted.accepted ? accepted.state.entries['thin-village-slimes'] : undefined).toEqual({
			status: 'active',
			currentObjectiveId: 'defeat-village-slimes',
			progress: 0,
			rewardApplied: false
		});
		expect(duplicate).toMatchObject({ accepted: false, reason: 'already-active' });
		expect(main).toMatchObject({ accepted: false, reason: 'main-quest' });
		expect(locked).toMatchObject({ accepted: false, reason: 'not-available' });
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
		expect(accepted.accepted ? accepted.state.entries['thin-village-slimes']?.progress : undefined)
			.toBe(2);
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
		expect(accepted.accepted ? accepted.state.entries['thin-village-slimes'] : undefined)
			.toMatchObject({
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
			nearbyQuestGiverId: 'guild-master'
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
				progress: { current: 0, target: 2, label: 'Ruins slimes defeated' }
			})
		);
		expect(hud.guildOffer?.quests.map((quest) => quest.questId)).toEqual([
			'thin-village-slimes',
			'recover-ruins-relics'
		]);
	});
});

```

- [ ] **Step 1.6: Run pure quest tests to verify they fail**

Run:

```sh
bun run test:unit -- --run src/lib/game/core/quests.test.ts
```

Expected: FAIL because `src/lib/game/core/quests.ts` does not exist.

- [ ] **Step 1.7: Implement pure quest rules**

Create `src/lib/game/core/quests.ts` with these exported types and functions:

```ts
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

export type QuestEntryStatus = 'active' | 'completed';

export type QuestEntryState = {
	status: QuestEntryStatus;
	currentObjectiveId: string;
	progress: number;
	rewardApplied: boolean;
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
		giverName: 'Guild Master';
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
				rewardApplied: false
			}
		},
		completedObjectives: {}
	};
}

export function cloneQuestState(state: QuestState): QuestState {
	return {
		entries: Object.fromEntries(
			Object.entries(state.entries).map(([questId, entry]) => [questId, { ...entry }])
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
	if (existing?.status === 'completed') return { accepted: false, reason: 'already-completed', state };
	if (!getAvailableGuildQuestIds(state).includes(quest.id)) {
		return { accepted: false, reason: 'not-available', state };
	}

	const objective = quest.objectives[0]!;
	const seededProgress = getExistingProgressForObjective(objective, worldFlags);
	const completed = seededProgress >= objective.target;
	const nextState = setQuestEntry(
		state,
		quest,
		objective,
		completed ? objective.target : seededProgress,
		completed
	);

	return {
		accepted: true,
		state: nextState,
		rewards: completed ? [{ questId: quest.id, title: quest.title, reward: quest.reward }] : [],
		completedQuestIds: completed ? [quest.id] : []
	};
}

export function applyQuestEvent({ state, event }: { state: QuestState; event: QuestEvent }): QuestEventResult {
	let nextState = cloneQuestState(state);
	const rewards: QuestRewardGrant[] = [];
	const completedQuestIds: QuestId[] = [];

	for (const quest of questList) {
		const entry = nextState.entries[quest.id];
		if (!entry || entry.status === 'completed') continue;

		const objective = quest.objectives.find((candidate) => candidate.id === entry.currentObjectiveId);
		if (!objective || !eventMatchesObjective(event, objective)) continue;

		const nextProgress = Math.min(objective.target, entry.progress + getEventProgress(event, objective));
		nextState = setQuestEntry(nextState, quest, objective, nextProgress, nextProgress >= objective.target);

		const updatedEntry = nextState.entries[quest.id]!;
		if (updatedEntry.status === 'completed' && updatedEntry.rewardApplied) {
			rewards.push({ questId: quest.id, title: quest.title, reward: quest.reward });
			completedQuestIds.push(quest.id);
		}
	}

	return { state: nextState, rewards, completedQuestIds };
}

function setQuestEntry(
	state: QuestState,
	quest: QuestDefinition,
	objective: QuestObjective,
	progress: number,
	objectiveComplete: boolean
): QuestState {
	const objectiveIndex = quest.objectives.findIndex((candidate) => candidate.id === objective.id);
	const nextObjective = quest.objectives[objectiveIndex + 1];
	const completedObjectives = objectiveComplete
		? Array.from(new Set([...(state.completedObjectives[quest.id] ?? []), objective.id]))
		: state.completedObjectives[quest.id] ?? [];

	if (objectiveComplete && nextObjective) {
		return {
			entries: {
				...state.entries,
				[quest.id]: {
					status: 'active',
					currentObjectiveId: nextObjective.id,
					progress: 0,
					rewardApplied: false
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
				rewardApplied: objectiveComplete
			}
		},
		completedObjectives: objectiveComplete
			? { ...state.completedObjectives, [quest.id]: completedObjectives }
			: state.completedObjectives
	};
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
			(objective.requiresCompletion === undefined || event.completion === objective.requiresCompletion)
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

function getExistingProgressForObjective(
	objective: QuestObjective,
	worldFlags: QuestWorldFlags
): number {
	if (objective.kind === 'defeat-enemy') {
		const matchingEncounterIds = objective.mapIds.flatMap((mapId) =>
			(maps[mapId]?.encounters ?? [])
				.filter((encounter) => encounter.enemyId === objective.enemyId)
				.map((encounter) => encounter.id)
		);
		return Math.min(
			objective.target,
			matchingEncounterIds.filter((encounterId) => worldFlags.clearedEncounterIds.has(encounterId))
				.length
		);
	}

	if (objective.kind === 'collect-item') {
		return Math.min(
			objective.target,
			objective.sources.filter((source) => worldFlags.collectedPickupIds.has(source.pickupId)).length
		);
	}

	return 0;
}

export function buildHudQuestState({
	state,
	nearbyQuestGiverId
}: {
	state: QuestState;
	nearbyQuestGiverId: string | null;
}): HudQuestState {
	const entries = Object.entries(state.entries).flatMap(([questId, entry]) => {
		const quest = getQuest(questId);
		const objective = quest?.objectives.find(
			(candidate) => candidate.id === entry.currentObjectiveId
		);
		return quest && objective ? [buildHudEntry(quest, objective, entry)] : [];
	});

	const availableQuestIds =
		nearbyQuestGiverId === 'guild-master' ? getAvailableGuildQuestIds(state) : [];
	const availableQuests = availableQuestIds.flatMap((questId) => {
		const quest = getQuest(questId);
		const objective = quest?.objectives[0];
		return quest && objective ? [buildHudOffer(quest, objective)] : [];
	});

	return {
		main: entries.find((entry) => entry.type === 'main') ?? null,
		side: entries.filter((entry) => entry.type === 'side' && entry.status === 'active'),
		completed: entries.filter((entry) => entry.status === 'completed'),
		guildOffer:
			availableQuests.length > 0
				? { giverNpcId: 'guild-master', giverName: 'Guild Master', quests: availableQuests }
				: null
	};
}

function buildHudEntry(
	quest: QuestDefinition,
	objective: QuestObjective,
	entry: QuestEntryState
): HudQuestEntry {
	return {
		questId: quest.id,
		title: quest.title,
		type: quest.type,
		status: entry.status,
		description: quest.description,
		objective: objective.description,
		progress: {
			current: entry.progress,
			target: objective.target,
			label: objective.progressLabel
		},
		rewardSummary: formatRewardSummary(quest.reward)
	};
}

function buildHudOffer(quest: QuestDefinition, objective: QuestObjective): HudQuestOffer {
	return {
		questId: quest.id,
		title: quest.title,
		description: quest.description,
		objective: objective.description,
		rewardSummary: formatRewardSummary(quest.reward)
	};
}

function formatRewardSummary(reward: QuestReward): string {
	const parts = [
		reward.xp ? `${reward.xp} XP` : '',
		reward.coins ? `${reward.coins} coins` : '',
		...(reward.items ?? []).map((item) => `${item.quantity} item`)
	].filter(Boolean);

	return parts.join(' / ');
}
```

- [ ] **Step 1.8: Run pure quest tests to verify they pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/quests.test.ts src/lib/game/core/quests.test.ts
```

Expected: PASS.

- [ ] **Step 1.9: Commit quest content and core rules**

Run:

```sh
git add src/lib/game/content/quests.ts src/lib/game/content/quests.test.ts src/lib/game/core/quests.ts src/lib/game/core/quests.test.ts
git commit -m "Add quest content and core rules"
```

Expected: commit succeeds.

---

### Task 2: Save State And HUD Bridge

**Files:**
- Modify: `src/lib/game/save/save-state.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Modify: `src/lib/game/save/storage.ts`
- Modify: `src/lib/game/ui-bridge/events.ts`
- Modify: `src/lib/game/ui-bridge/store.ts`
- Modify: `tests/e2e/game.e2e.ts`

- [ ] **Step 2.1: Write failing save-state tests for quests and v4**

In `src/lib/game/save/save-state.test.ts`, update the starting-save expectation to `version: 4` and add `quests: createInitialQuestState()` to the expected object. Import `createInitialQuestState`:

```ts
import { createInitialQuestState } from '$lib/game/core/quests';
```

Replace the version test with:

```ts
it('rejects version 3 and accepts version 4', () => {
	expect(parseSaveState(JSON.stringify({ ...createNewSaveState(), version: 3 }))).toBeNull();
	expect(parseSaveState(JSON.stringify(createNewSaveState()))?.version).toBe(4);
});
```

Append this test in the `describe('save state')` block:

```ts
it('rejects invalid quest state', () => {
	const save = createNewSaveState();

	for (const invalidPayload of [
		{ ...save, quests: undefined },
		{ ...save, quests: [] },
		{ ...save, quests: { entries: {}, completedObjectives: {} } },
		{
			...save,
			quests: {
				...save.quests,
				entries: {
					...save.quests.entries,
					'not-real': {
						status: 'active',
						currentObjectiveId: 'talk-to-guild-master',
						progress: 0,
						rewardApplied: false
					}
				}
			}
		},
		{
			...save,
			quests: {
				...save.quests,
				entries: {
					'investigate-the-ruins': {
						status: 'available',
						currentObjectiveId: 'talk-to-guild-master',
						progress: 0,
						rewardApplied: false
					}
				}
			}
		},
		{
			...save,
			quests: {
				...save.quests,
				entries: {
					'investigate-the-ruins': {
						status: 'active',
						currentObjectiveId: 'not-real',
						progress: 0,
						rewardApplied: false
					}
				}
			}
		},
		{
			...save,
			quests: {
				...save.quests,
				entries: {
					'investigate-the-ruins': {
						status: 'active',
						currentObjectiveId: 'talk-to-guild-master',
						progress: -1,
						rewardApplied: false
					}
				}
			}
		},
		{
			...save,
			quests: {
				...save.quests,
				entries: {
					'investigate-the-ruins': {
						status: 'active',
						currentObjectiveId: 'talk-to-guild-master',
						progress: 2,
						rewardApplied: false
					}
				}
			}
		},
		{
			...save,
			quests: {
				...save.quests,
				completedObjectives: { 'not-real': ['talk-to-guild-master'] }
			}
		}
	]) {
		expect(parseSaveState(JSON.stringify(invalidPayload))).toBeNull();
	}
});
```

In the save storage test, update the expected storage key literal to `gliese.save.v4`.

- [ ] **Step 2.2: Run save-state tests to verify they fail**

Run:

```sh
bun run test:unit -- --run src/lib/game/save/save-state.test.ts
```

Expected: FAIL because save state is still version 3 and has no `quests` field.

- [ ] **Step 2.3: Implement save v4 quest persistence**

In `src/lib/game/save/storage.ts`, change:

```ts
export const SAVE_STORAGE_KEY = 'gliese.save.v4';
```

In `src/lib/game/save/save-state.ts`, add imports:

```ts
import { getQuest, type QuestObjective } from '$lib/game/content/quests';
import {
	cloneQuestState,
	createInitialQuestState,
	type QuestEntryState,
	type QuestState
} from '$lib/game/core/quests';
```

Change the save type header and add `quests`:

```ts
export type SaveState = {
	version: 4;
	mapId: string;
	player: {
		level: number;
		xp: number;
		hp: number;
		attack: number;
		x: number;
		y: number;
		facing: Direction;
	};
	flags: {
		clearedEncounters: string[];
		collectedPickups: string[];
		resolvedEncounterDrops: Record<string, ItemDrop[]>;
	};
	inventory: InventoryState;
	equipment: EquipmentState;
	wallet: WalletState;
	shops: {
		stock: ShopStockState;
	};
	quests: QuestState;
};
```

In `createNewSaveState()`, change `version: 4` and add:

```ts
quests: createInitialQuestState()
```

In `parseSaveState`, keep the returned object shape and rely on `isSaveState`.

In `isSaveState`, destructure `quests`, require `version !== 4` rejection, and include `!isQuestState(quests)` in the invalid check.

Add these helper functions in `save-state.ts` near the other validators:

```ts
function isQuestState(value: unknown): value is QuestState {
	if (!isRecord(value) || Array.isArray(value)) {
		return false;
	}

	const { entries, completedObjectives } = value;

	if (!isRecord(entries) || Array.isArray(entries) || !isRecord(completedObjectives)) {
		return false;
	}

	if (!entries[mainQuestId]) {
		return false;
	}

	return (
		Object.entries(entries).every(([questId, entry]) => isQuestEntry(questId, entry)) &&
		Object.entries(completedObjectives).every(([questId, objectiveIds]) => {
			const quest = getQuest(questId);
			return (
				quest !== undefined &&
				Array.isArray(objectiveIds) &&
				objectiveIds.every(
					(objectiveId) =>
						typeof objectiveId === 'string' &&
						quest.objectives.some((objective) => objective.id === objectiveId)
				)
			);
		})
	);
}

function isQuestEntry(questId: string, value: unknown): value is QuestEntryState {
	const quest = getQuest(questId);

	if (!quest || !isRecord(value)) {
		return false;
	}

	const { status, currentObjectiveId, progress, rewardApplied } = value;
	const objective = quest.objectives.find((candidate) => candidate.id === currentObjectiveId);

	return (
		(status === 'active' || status === 'completed') &&
		objective !== undefined &&
		isNumber(progress) &&
		Number.isInteger(progress) &&
		progress >= 0 &&
		progress <= getObjectiveTarget(objective) &&
		typeof rewardApplied === 'boolean'
	);
}

function getObjectiveTarget(objective: QuestObjective): number {
	return objective.target;
}
```

Add `mainQuestId` to the quest imports if the helper uses it:

```ts
import { getQuest, mainQuestId, type QuestObjective } from '$lib/game/content/quests';
```

- [ ] **Step 2.4: Run save-state tests to verify they pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/save/save-state.test.ts
```

Expected: PASS.

- [ ] **Step 2.5: Update HUD bridge types and store helpers**

In `src/lib/game/ui-bridge/events.ts`, add:

```ts
import type { HudQuestState } from '$lib/game/core/quests';
```

Add to `HudState`:

```ts
quests: HudQuestState;
```

Add to `HudCommand`:

```ts
| { type: 'accept-quest'; questId: string }
```

In `src/lib/game/ui-bridge/store.ts`, import:

```ts
import { buildHudQuestState, createInitialQuestState } from '$lib/game/core/quests';
```

Add to `initialHudState`:

```ts
quests: buildHudQuestState({
	state:
		initialSaveResult.status === 'loaded'
			? initialSaveResult.saveState.quests
			: createInitialQuestState(),
	nearbyQuestGiverId: null
})
```

Add:

```ts
export function requestAcceptQuest(questId: string) {
	emitHudCommand({ type: 'accept-quest', questId });
}
```

- [ ] **Step 2.6: Update e2e save fixtures to v4**

In `tests/e2e/game.e2e.ts`, update each hardcoded save object:

```ts
version: 4,
```

Add a `quests` property to each save fixture:

```ts
quests: {
	entries: {
		'investigate-the-ruins': {
			status: 'active',
			currentObjectiveId: 'talk-to-guild-master',
			progress: 0,
			rewardApplied: false
		}
	},
	completedObjectives: {}
}
```

Update each `window.localStorage.setItem('gliese.save.v3', encoded);` to:

```ts
window.localStorage.setItem('gliese.save.v4', encoded);
```

- [ ] **Step 2.7: Run bridge/save focused checks**

Run:

```sh
bun run test:unit -- --run src/lib/game/save/save-state.test.ts
bun run check
```

Expected: both PASS.

- [ ] **Step 2.8: Commit save and bridge state**

Run:

```sh
git add src/lib/game/save/save-state.ts src/lib/game/save/save-state.test.ts src/lib/game/save/storage.ts src/lib/game/ui-bridge/events.ts src/lib/game/ui-bridge/store.ts tests/e2e/game.e2e.ts
git commit -m "Persist quest state in saves and HUD bridge"
```

Expected: commit succeeds.

---

### Task 3: Phaser Runtime And Map Gating

**Files:**
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 3.1: Write failing map content tests for Guild Master and quest gate**

In `src/lib/game/content/maps.test.ts`, update the expected Guild Hall NPC array to include the Guild Master before Quartermaster Vale:

```ts
expect(guildHallMap.npcs).toEqual([
	{
		id: 'guild-master',
		x: 192,
		y: 144,
		name: 'Guild Master Arlen',
		dialogue: 'The ruins are stirring again. Speak with me, then clear the warden.',
		role: 'guild',
		frameName: 'quartermasterNpc'
	},
	{
		id: 'guild-quartermaster',
		x: 352,
		y: 144,
		name: 'Quartermaster Vale',
		dialogue: 'Need field gear before the ruins? Guild stock is limited, but sturdy.',
		role: 'shopkeeper',
		frameName: 'quartermasterNpc',
		shopId: 'guild-quartermaster'
	}
]);
```

Update the `meadow-to-ruins-threshold` transition expectation to include:

```ts
questRequirement: {
	questId: 'investigate-the-ruins',
	objectiveId: 'talk-to-guild-master'
}
```

- [ ] **Step 3.2: Run map content tests to verify they fail**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: FAIL because the Guild Master and `questRequirement` are not defined.

- [ ] **Step 3.3: Add Guild Master and quest-gated transition content**

In `src/lib/game/content/maps.ts`, extend `MapTransition`:

```ts
questRequirement?: {
	questId: string;
	objectiveId: string;
};
```

In `meadowEntryMap.transitions`, add this to `meadow-to-ruins-threshold`:

```ts
questRequirement: {
	questId: 'investigate-the-ruins',
	objectiveId: 'talk-to-guild-master'
}
```

In `guildHallMap.npcs`, insert:

```ts
{
	id: 'guild-master',
	x: 192,
	y: 144,
	name: 'Guild Master Arlen',
	dialogue: 'The ruins are stirring again. Speak with me, then clear the warden.',
	role: 'guild',
	frameName: 'quartermasterNpc'
}
```

- [ ] **Step 3.4: Run map content tests to verify they pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: PASS.

- [ ] **Step 3.5: Write failing scene tests for quest runtime behavior**

In `src/lib/game/phaser/scenes/scenes.test.ts`, add tests near the existing NPC/transition/shop tests:

```ts
it('blocks the ruins route until the Guild Master objective is complete', async () => {
	const events = await import('$lib/game/ui-bridge/events');
	const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
	const { createNewSaveState } = await import('$lib/game/save/save-state');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({
		saveState: {
			...createNewSaveState(),
			mapId: 'meadow-entry',
			flags: {
				clearedEncounters: ['meadow-slime-east', 'meadow-slime-center', 'meadow-slime-west'],
				collectedPickups: [],
				resolvedEncounterDrops: {}
			}
		}
	});
	emitHudStateSpy.mockClear();
	Object.assign(phaserState.playerMarker, { x: 2_304, y: 1_280 });

	scene.update(0, 16);

	expect(scene.scene.restart).not.toHaveBeenCalled();
	expect(emitHudStateSpy).toHaveBeenLastCalledWith(
		expect.objectContaining({ status: 'Report to the Guild Master first' })
	);
});

it('talking to the Guild Master unlocks ruins and publishes Guild quest offers', async () => {
	const events = await import('$lib/game/ui-bridge/events');
	const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		buildSaveState: () => {
			quests: {
				entries: Record<string, { currentObjectiveId: string; progress: number }>;
				completedObjectives: Record<string, string[]>;
			};
		};
	};

	scene.create({ mapId: 'guild-hall' });
	Object.assign(phaserState.playerMarker, { x: 192, y: 144 });
	scene.update(0, 16);
	emitHudStateSpy.mockClear();

	phaserState.interactKeys.e.justDown = true;
	scene.update(16, 16);

	expect(sceneState.buildSaveState().quests.entries['investigate-the-ruins']).toMatchObject({
		currentObjectiveId: 'defeat-ruins-warden',
		progress: 0
	});
	expect(
		sceneState.buildSaveState().quests.completedObjectives['investigate-the-ruins']
	).toContain('talk-to-guild-master');
	expect(emitHudStateSpy).toHaveBeenLastCalledWith(
		expect.objectContaining({
			status: 'Ruins route unlocked',
			quests: expect.objectContaining({
				guildOffer: expect.objectContaining({
					quests: expect.arrayContaining([
						expect.objectContaining({ questId: 'thin-village-slimes' })
					])
				})
			})
		})
	);
});

it('accepts Guild side quests through HUD commands and seeds cleared village slime progress', async () => {
	const { createNewSaveState } = await import('$lib/game/save/save-state');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		handleHudCommand: (command: HudCommand) => void;
		buildSaveState: () => {
			quests: { entries: Record<string, { currentObjectiveId: string; progress: number }> };
		};
	};

	const unlockedSave = createNewSaveState();
	scene.create({
		saveState: {
			...unlockedSave,
			mapId: 'guild-hall',
			flags: {
				...unlockedSave.flags,
				clearedEncounters: ['meadow-slime-west', 'meadow-slime-center']
			},
			quests: {
				entries: {
					'investigate-the-ruins': {
						status: 'active',
						currentObjectiveId: 'defeat-ruins-warden',
						progress: 0,
						rewardApplied: false
					}
				},
				completedObjectives: { 'investigate-the-ruins': ['talk-to-guild-master'] }
			}
		}
	});

	sceneState.handleHudCommand({ type: 'accept-quest', questId: 'thin-village-slimes' });

	expect(sceneState.buildSaveState().quests.entries['thin-village-slimes']).toMatchObject({
		currentObjectiveId: 'defeat-village-slimes',
		progress: 2
	});
});

it('side quest completion from combat grants rewards once', async () => {
	const { createNewSaveState } = await import('$lib/game/save/save-state');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		enemies: Array<{ hp: number }>;
		buildSaveState: () => {
			wallet: { coins: number };
			inventory: { stacks: Array<{ itemId: string; quantity: number }> };
			quests: { entries: Record<string, { status: string; progress: number; rewardApplied: boolean }> };
		};
	};

	const save = createNewSaveState();
	scene.create({
		saveState: {
			...save,
			mapId: 'meadow-entry',
			wallet: { coins: 0 },
			flags: {
				...save.flags,
				clearedEncounters: ['meadow-slime-west', 'meadow-slime-center']
			},
			quests: {
				entries: {
					'investigate-the-ruins': {
						status: 'active',
						currentObjectiveId: 'defeat-ruins-warden',
						progress: 0,
						rewardApplied: false
					},
					'thin-village-slimes': {
						status: 'active',
						currentObjectiveId: 'defeat-village-slimes',
						progress: 2,
						rewardApplied: false
					}
				},
				completedObjectives: { 'investigate-the-ruins': ['talk-to-guild-master'] }
			}
		}
	});
	Object.assign(phaserState.playerMarker, { x: 2_080, y: 1_280 });
	sceneState.enemies[0]!.hp = 3;

	scene.update(500, 16);
	scene.update(1000, 16);

	const completedSave = sceneState.buildSaveState();
	expect(completedSave.quests.entries['thin-village-slimes']).toMatchObject({
		status: 'completed',
		progress: 3,
		rewardApplied: true
	});
	expect(completedSave.wallet.coins).toBe(16);
	expect(completedSave.inventory.stacks).toContainEqual({ itemId: 'field-potion', quantity: 2 });
});
```

- [ ] **Step 3.6: Run scene tests to verify they fail**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts --testNamePattern "quest|Guild Master|ruins route"
```

Expected: FAIL because `WorldScene` does not own quest state or handle `accept-quest`.

- [ ] **Step 3.7: Wire quest state into `WorldScene`**

In `src/lib/game/phaser/scenes/WorldScene.ts`, add imports:

```ts
import {
	acceptQuest,
	applyQuestEvent,
	buildHudQuestState,
	cloneQuestState,
	type QuestEvent,
	type QuestRewardGrant,
	type QuestState
} from '$lib/game/core/quests';
```

Add a field:

```ts
private questState: QuestState = cloneQuestState(createNewSaveState().quests);
```

In `create()`, initialize from the active save:

```ts
this.questState = cloneQuestState(activeSave?.quests ?? createNewSaveState().quests);
```

In `buildSaveState()`, add:

```ts
quests: cloneQuestState(this.questState)
```

In `handleHudCommand`, add:

```ts
case 'accept-quest':
	this.acceptGuildQuest(command.questId);
	return;
```

Add methods:

```ts
private acceptGuildQuest(questId: string) {
	if (this.findNearbyNpc()?.id !== 'guild-master') {
		this.publishHudState('No Guild quest available');
		return;
	}

	const result = acceptQuest({
		state: this.questState,
		questId,
		worldFlags: {
			clearedEncounterIds: this.clearedEncounterIds,
			collectedPickupIds: this.collectedPickupIds
		}
	});

	if (!result.accepted) {
		this.publishHudState(this.formatQuestAcceptFailure(result.reason));
		return;
	}

	this.questState = result.state;
	this.applyQuestRewards(result.rewards);
	this.publishHudState(
		result.completedQuestIds.length > 0
			? `Quest complete: ${result.rewards[0]?.title ?? 'Quest'}`
			: 'Quest accepted'
	);
}

private formatQuestAcceptFailure(reason: string): string {
	if (reason === 'already-active') return 'Quest already active';
	if (reason === 'already-completed') return 'Quest already complete';
	if (reason === 'not-available') return 'Quest not available';
	return 'Quest cannot be accepted';
}

private applyQuestProgress(event: QuestEvent, fallbackStatus: string) {
	const result = applyQuestEvent({ state: this.questState, event });
	this.questState = result.state;
	this.applyQuestRewards(result.rewards);

	if (result.completedQuestIds.length > 0) {
		this.publishHudState(`Quest complete: ${result.rewards[0]?.title ?? 'Quest'}`);
		return;
	}

	this.publishHudState(fallbackStatus);
}

private applyQuestRewards(rewards: QuestRewardGrant[]) {
	for (const grant of rewards) {
		if (grant.reward.xp) {
			this.playerProgress = this.applyReward(grant.reward.xp);
		}

		if (grant.reward.coins) {
			this.wallet = { coins: this.wallet.coins + grant.reward.coins };
		}

		for (const item of grant.reward.items ?? []) {
			this.inventory = addItem(this.inventory, item.itemId, item.quantity);
		}
	}
}
```

In `publishHudState`, add:

```ts
quests: buildHudQuestState({
	state: this.questState,
	nearbyQuestGiverId: this.findNearbyNpc()?.id === 'guild-master' ? 'guild-master' : null
})
```

- [ ] **Step 3.8: Progress quests from NPC, combat, and pickups**

In `interactWithNearbyNpc()`, before shop handling, add Guild Master handling:

```ts
if (nearbyNpc.id === 'guild-master') {
	this.applyQuestProgress({ type: 'talk-to-npc', npcId: nearbyNpc.id }, 'Ruins route unlocked');
	return;
}
```

In `finishEncounter(enemy: EnemyInstance)`, replace the final status publication with a quest-aware call after XP/coin/drop updates. Keep the existing victory status for boss completion by letting quest completion win:

```ts
this.applyQuestProgress(
	{
		type: 'defeat-enemy',
		mapId: this.mapId,
		encounterId: enemy.id,
		enemyId: enemy.definition.id,
		completion: enemy.completion
	},
	enemy.completion === 'victory' ? 'Victory: ruins cleared' : 'Enemy defeated'
);

if (enemy.completion === 'victory') {
	this.showVictoryState();
}
```

Remove the old `publishHudState('Victory: ruins cleared')` and `publishHudState('Enemy defeated')` calls from the same method so only one status publishes.

In `tryCollectPickup()`, after inventory/flag updates and before returning, replace the status call with:

```ts
this.applyQuestProgress(
	{
		type: 'collect-item',
		mapId: this.mapId,
		pickupId: pickup.id,
		itemId: pickup.itemId,
		quantity: pickup.quantity
	},
	`Found ${getItem(pickup.itemId)?.name ?? 'item'}`
);
```

- [ ] **Step 3.9: Enforce quest transition requirements**

In `tryTransition()`, after `requiresClear` handling and before `scene.restart`, add:

```ts
if (transition.questRequirement) {
	const { questId, objectiveId } = transition.questRequirement;

	if (!isQuestId(questId) || !hasCompletedQuestObjective(this.questState, questId, objectiveId)) {
		this.publishHudState('Report to the Guild Master first');
		return false;
	}
}
```

Add `hasCompletedQuestObjective` to the quest core imports and add `isQuestId` to the quest content imports:

```ts
import { isQuestId } from '$lib/game/content/quests';
```

- [ ] **Step 3.10: Run focused scene tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/scenes.test.ts --testNamePattern "quest|Guild Master|ruins route|transition"
```

Expected: PASS.

- [ ] **Step 3.11: Run broader affected tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts src/lib/game/core/quests.test.ts src/lib/game/save/save-state.test.ts src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 3.12: Commit Phaser quest runtime**

Run:

```sh
git add src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Wire quest progression into world scene"
```

Expected: commit succeeds.

---

### Task 4: Quest UI And Browser Coverage

**Files:**
- Modify: `src/lib/game/GameShell.svelte`
- Modify: `tests/e2e/game.e2e.ts`

- [ ] **Step 4.1: Write failing e2e quest UI test**

Append to `tests/e2e/game.e2e.ts`:

```ts
test('quest log shows main quest and accepts Guild side quests', async ({ page }) => {
	const save = {
		version: 4,
		mapId: 'guild-hall',
		player: {
			level: 1,
			xp: 0,
			hp: 20,
			attack: 3,
			x: 192,
			y: 144,
			facing: 'up'
		},
		flags: { clearedEncounters: [], collectedPickups: [], resolvedEncounterDrops: {} },
		inventory: {
			stacks: [{ itemId: 'field-potion', quantity: 1 }],
			equipment: ['training-sword']
		},
		equipment: {
			weapon: 'training-sword',
			head: null,
			body: null,
			hands: null,
			accessory: null
		},
		wallet: { coins: 30 },
		shops: {
			stock: {
				'guild-quartermaster': {
					'iron-cap': 1,
					'grip-wraps': 1,
					'traveler-vest': 1
				}
			}
		},
		quests: {
			entries: {
				'investigate-the-ruins': {
					status: 'active',
					currentObjectiveId: 'talk-to-guild-master',
					progress: 0,
					rewardApplied: false
				}
			},
			completedObjectives: {}
		}
	};

	await page.addInitScript((encoded) => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseLastHudState = undefined;
		window.addEventListener('gliese:hud-state', (event) => {
			probeWindow.__glieseLastHudState = (event as CustomEvent<HudStateSnapshot>).detail;
		});
		window.localStorage.setItem('gliese.save.v4', encoded);
	}, JSON.stringify(save));
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Resume Save' }).click();
	await expect(page.getByText('Talk to the Guild Master')).toBeVisible();

	await page.locator('canvas').click();
	await page.keyboard.press('KeyE');
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;
		return state?.status === 'Ruins route unlocked';
	});

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Quests' }).click();
	const questDialog = page.getByRole('dialog', { name: 'Quest Log' });
	await expect(questDialog).toBeVisible();
	await expect(questDialog.getByText('Investigate the Ruins')).toBeVisible();
	await expect(questDialog.getByText('Defeat the ruins warden in the ruins core.')).toBeVisible();
	await expect(questDialog.getByText('Thin Village Slimes')).toBeVisible();
	await questDialog.getByRole('button', { name: 'Close' }).click();

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Guild Quests' }).click();
	const guildDialog = page.getByRole('dialog', { name: 'Guild Quests' });
	await expect(guildDialog).toBeVisible();
	await guildDialog.getByRole('button', { name: 'Accept Thin Village Slimes' }).click();
	await expect(guildDialog.getByText('Thin Village Slimes')).toHaveCount(0);
	await guildDialog.getByRole('button', { name: 'Close' }).click();

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Quests' }).click();
	await expect(page.getByRole('dialog', { name: 'Quest Log' }).getByText('Village slimes defeated: 0 / 3'))
		.toBeVisible();
});
```

- [ ] **Step 4.2: Run quest e2e test to verify it fails**

Run:

```sh
bun run test:e2e -- --grep "quest log shows main quest"
```

Expected: FAIL because the Quest Log and Guild Quests buttons do not exist.

- [ ] **Step 4.3: Add quest UI state and command imports**

In `src/lib/game/GameShell.svelte`, import `requestAcceptQuest` from the store and quest types from events:

```ts
import {
	hudState,
	requestAcceptQuest,
	requestBuyShopItem,
	requestCloseShop,
	requestEquipItem,
	requestHeal,
	requestOpenShop,
	requestPauseGame,
	requestResume,
	requestResumeGame,
	requestSave,
	requestSellInventoryItem,
	requestUnequipSlot,
	requestUseItem
} from '$lib/game/ui-bridge/store';
```

Extend overlay state:

```ts
type OverlayPauseOwner = 'settings' | 'inventory' | 'shop' | 'questLog' | 'guildQuests';
```

Add state:

```ts
let questLogDialog = $state<HTMLDivElement>();
let questLogCloseButton = $state<HTMLButtonElement>();
let guildQuestsDialog = $state<HTMLDivElement>();
let guildQuestsCloseButton = $state<HTMLButtonElement>();
let questLogOpen = $state(false);
let guildQuestsOpen = $state(false);
```

Add helpers:

```ts
function openQuestLog() {
	if (questLogOpen) return;
	settingsOpen = false;
	questLogOpen = true;
	pauseForOverlay('questLog');
	void focusQuestLogDialog();
}

function closeQuestLog() {
	if (!questLogOpen) return;
	questLogOpen = false;
	resumeForOverlay('questLog');
}

function openGuildQuests() {
	if (guildQuestsOpen || !$hudState.quests.guildOffer) return;
	settingsOpen = false;
	guildQuestsOpen = true;
	pauseForOverlay('guildQuests');
	void focusGuildQuestsDialog();
}

function closeGuildQuests() {
	if (!guildQuestsOpen) return;
	guildQuestsOpen = false;
	resumeForOverlay('guildQuests');
}

async function focusQuestLogDialog() {
	await tick();
	(questLogCloseButton ?? questLogDialog)?.focus();
}

async function focusGuildQuestsDialog() {
	await tick();
	(guildQuestsCloseButton ?? guildQuestsDialog)?.focus();
}

function acceptGuildQuest(questId: string) {
	requestAcceptQuest(questId);
}
```

In `releaseOverlayPause()`, add:

```ts
questLogOpen = false;
guildQuestsOpen = false;
```

- [ ] **Step 4.4: Add Menu buttons and compact tracker**

In the settings menu button grid, add buttons before `Shop`:

```svelte
<button
	type="button"
	class="hud-action rounded-[1.1rem] border border-cyan-200/20 bg-[linear-gradient(135deg,rgba(26,49,92,0.95),rgba(14,21,44,0.92))] px-4 py-3 text-sm font-black tracking-[0.24em] text-cyan-50 uppercase transition hover:-translate-y-0.5 hover:border-cyan-200/45 hover:shadow-[0_15px_30px_rgba(74,144,255,0.24)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
	onclick={openQuestLog}
	disabled={!$hudState.ready}
>
	Quests
</button>
<button
	type="button"
	class="hud-action rounded-[1.1rem] border border-emerald-200/20 bg-[linear-gradient(135deg,rgba(20,91,76,0.95),rgba(12,42,48,0.92))] px-4 py-3 text-sm font-black tracking-[0.24em] text-emerald-50 uppercase transition hover:-translate-y-0.5 hover:border-emerald-200/45 hover:shadow-[0_15px_30px_rgba(62,205,155,0.22)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
	onclick={openGuildQuests}
	disabled={!$hudState.ready || !$hudState.quests.guildOffer}
>
	Guild Quests
</button>
```

Add a compact tracker above or near the existing bottom-left HUD:

```svelte
{#if $hudState.quests.main}
	<section
		class="pointer-events-none absolute bottom-[8.8rem] left-4 z-20 w-[min(25rem,calc(100vw-2rem))] rounded-[1.2rem] border border-cyan-100/14 bg-[linear-gradient(145deg,rgba(8,13,34,0.9),rgba(12,32,52,0.82))] px-4 py-3 text-slate-50 shadow-[0_18px_44px_rgba(0,0,0,0.3)] backdrop-blur-md sm:bottom-[9.3rem] sm:left-6"
		aria-label="Quest tracker"
	>
		<p class="text-[0.58rem] font-black tracking-[0.28em] text-cyan-100/68 uppercase">
			Main Quest
		</p>
		<p class="mt-1 truncate text-sm font-black tracking-[0.08em] text-white uppercase">
			{$hudState.quests.main.objective}
		</p>
		{#if $hudState.quests.side.length > 0}
			<p class="mt-1 text-xs font-bold text-emerald-100/78">
				{$hudState.quests.side.length} side active
			</p>
		{/if}
	</section>
{/if}
```

- [ ] **Step 4.5: Add Quest Log overlay**

Add after the inventory overlay block:

```svelte
{#if questLogOpen}
	<div
		class="absolute inset-0 z-50 flex items-center justify-center bg-black/52 p-3 backdrop-blur-[3px] sm:p-6"
		role="presentation"
	>
		<div class="absolute inset-0 cursor-default" role="presentation" onclick={closeQuestLog}></div>
		<div
			bind:this={questLogDialog}
			class="relative z-10 grid max-h-[calc(100vh-1.5rem)] w-[min(62rem,calc(100vw-1.5rem))] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[1.8rem] border border-white/12 bg-[linear-gradient(145deg,rgba(8,13,34,0.98),rgba(15,28,48,0.96)_54%,rgba(16,38,34,0.94))] text-slate-50 shadow-[0_34px_100px_rgba(0,0,0,0.58)] backdrop-blur-md sm:max-h-[calc(100vh-3rem)] sm:rounded-[2rem]"
			aria-labelledby="quest-log-heading"
			aria-modal="true"
			role="dialog"
			tabindex="-1"
		>
			<div class="border-b border-white/10 px-4 py-4 sm:px-6">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-[0.62rem] font-black tracking-[0.34em] text-cyan-100/68 uppercase">
							Field Journal
						</p>
						<h2
							id="quest-log-heading"
							class="mt-1 text-2xl font-black tracking-[0.12em] text-white uppercase sm:text-3xl"
						>
							Quest Log
						</h2>
					</div>
					<button
						bind:this={questLogCloseButton}
						type="button"
						class="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[0.65rem] font-black tracking-[0.24em] text-slate-100 uppercase transition hover:border-white/30"
						onclick={closeQuestLog}
					>
						Close
					</button>
				</div>
			</div>
			<div class="min-h-0 overflow-y-auto p-4 sm:p-6">
				<div class="grid gap-4 lg:grid-cols-2">
					<section class="rounded-[1.2rem] border border-cyan-100/12 bg-cyan-100/8 p-4">
						<h3 class="text-sm font-black tracking-[0.22em] text-cyan-50 uppercase">Main</h3>
						{#if $hudState.quests.main}
							<article class="mt-3 rounded-[0.95rem] border border-white/10 bg-black/14 p-3">
								<h4 class="font-black tracking-[0.1em] text-white uppercase">
									{$hudState.quests.main.title}
								</h4>
								<p class="mt-2 text-sm text-slate-100/82">{$hudState.quests.main.objective}</p>
								<p class="mt-2 text-xs font-black tracking-[0.16em] text-cyan-100/72 uppercase">
									{$hudState.quests.main.progress.label}: {$hudState.quests.main.progress.current} /
									{$hudState.quests.main.progress.target}
								</p>
								<p class="mt-1 text-xs text-slate-300/72">
									Reward: {$hudState.quests.main.rewardSummary}
								</p>
							</article>
						{/if}
					</section>
					<section class="rounded-[1.2rem] border border-emerald-100/12 bg-emerald-100/8 p-4">
						<h3 class="text-sm font-black tracking-[0.22em] text-emerald-50 uppercase">Side</h3>
						<div class="mt-3 grid gap-3">
							{#each [...$hudState.quests.side, ...($hudState.quests.guildOffer?.quests ?? [])] as quest (quest.questId)}
								<article class="rounded-[0.95rem] border border-white/10 bg-black/14 p-3">
									<h4 class="font-black tracking-[0.1em] text-white uppercase">{quest.title}</h4>
									<p class="mt-2 text-sm text-slate-100/82">{quest.objective}</p>
									{#if 'progress' in quest}
										<p class="mt-2 text-xs font-black tracking-[0.16em] text-emerald-100/72 uppercase">
											{quest.progress.label}: {quest.progress.current} / {quest.progress.target}
										</p>
									{:else}
										<p class="mt-2 text-xs font-black tracking-[0.16em] text-amber-100/72 uppercase">
											Available from Guild Master
										</p>
									{/if}
									<p class="mt-1 text-xs text-slate-300/72">Reward: {quest.rewardSummary}</p>
								</article>
							{/each}
							{#if $hudState.quests.side.length === 0 && !$hudState.quests.guildOffer}
								<p class="text-sm text-slate-300/72">No side quests active.</p>
							{/if}
						</div>
					</section>
				</div>
			</div>
		</div>
	</div>
{/if}
```

- [ ] **Step 4.6: Add Guild quest-offer overlay**

Add after the Quest Log overlay:

```svelte
{#if guildQuestsOpen && $hudState.quests.guildOffer}
	<div
		class="absolute inset-0 z-50 flex items-center justify-center bg-black/52 p-3 backdrop-blur-[3px] sm:p-6"
		role="presentation"
	>
		<div class="absolute inset-0 cursor-default" role="presentation" onclick={closeGuildQuests}></div>
		<div
			bind:this={guildQuestsDialog}
			class="relative z-10 grid max-h-[calc(100vh-1.5rem)] w-[min(56rem,calc(100vw-1.5rem))] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[1.8rem] border border-white/12 bg-[linear-gradient(145deg,rgba(8,13,34,0.98),rgba(18,42,40,0.96)_54%,rgba(34,38,16,0.94))] text-slate-50 shadow-[0_34px_100px_rgba(0,0,0,0.58)] backdrop-blur-md sm:max-h-[calc(100vh-3rem)] sm:rounded-[2rem]"
			aria-labelledby="guild-quests-heading"
			aria-modal="true"
			role="dialog"
			tabindex="-1"
		>
			<div class="border-b border-white/10 px-4 py-4 sm:px-6">
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-[0.62rem] font-black tracking-[0.34em] text-emerald-100/68 uppercase">
							{$hudState.quests.guildOffer.giverName}
						</p>
						<h2
							id="guild-quests-heading"
							class="mt-1 text-2xl font-black tracking-[0.12em] text-white uppercase sm:text-3xl"
						>
							Guild Quests
						</h2>
					</div>
					<button
						bind:this={guildQuestsCloseButton}
						type="button"
						class="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[0.65rem] font-black tracking-[0.24em] text-slate-100 uppercase transition hover:border-white/30"
						onclick={closeGuildQuests}
					>
						Close
					</button>
				</div>
			</div>
			<div class="min-h-0 overflow-y-auto p-4 sm:p-6">
				<div class="grid gap-3">
					{#each $hudState.quests.guildOffer.quests as quest (quest.questId)}
						<article class="grid gap-3 rounded-[1.05rem] border border-white/10 bg-black/14 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
							<div>
								<h3 class="font-black tracking-[0.1em] text-white uppercase">{quest.title}</h3>
								<p class="mt-2 text-sm text-slate-100/82">{quest.objective}</p>
								<p class="mt-1 text-xs text-slate-300/72">Reward: {quest.rewardSummary}</p>
							</div>
							<button
								type="button"
								class="rounded-full border border-emerald-200/24 bg-emerald-200/12 px-4 py-2 text-xs font-black tracking-[0.18em] text-emerald-50 uppercase transition hover:border-emerald-200/48 disabled:cursor-not-allowed disabled:opacity-45"
								onclick={() => acceptGuildQuest(quest.questId)}
								disabled={!$hudState.ready}
							>
								Accept {quest.title}
							</button>
						</article>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
```

- [ ] **Step 4.7: Run Svelte autofixer**

Use the Svelte MCP tools required by `AGENTS.md`:

1. Call `list-sections`.
2. Fetch relevant Svelte 5 sections for runes, event handlers, keyed each blocks, and conditional blocks.
3. Call `svelte-autofixer` on the modified `src/lib/game/GameShell.svelte`.
4. Apply every fix it reports.
5. Repeat `svelte-autofixer` until it reports no issues.

If the Svelte MCP tools are unavailable in the implementation session, run:

```sh
bun run check
```

Expected: PASS after fixing all Svelte diagnostics.

- [ ] **Step 4.8: Run quest e2e test**

Run:

```sh
bun run test:e2e -- --grep "quest log shows main quest"
```

Expected: PASS.

- [ ] **Step 4.9: Run affected browser tests**

Run:

```sh
bun run test:e2e -- --grep "game route boots|inventory overlay opens|shop overlay opens|quest log shows main quest"
```

Expected: PASS.

- [ ] **Step 4.10: Commit quest UI**

Run:

```sh
git add src/lib/game/GameShell.svelte tests/e2e/game.e2e.ts
git commit -m "Add quest log and Guild quest UI"
```

Expected: commit succeeds.

---

### Task 5: Full Verification And Cleanup

**Files:**
- Review all touched files.

- [ ] **Step 5.1: Run focused unit suite**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/quests.test.ts src/lib/game/core/quests.test.ts src/lib/game/save/save-state.test.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 5.2: Run type and Svelte checks**

Run:

```sh
bun run check
```

Expected: PASS.

- [ ] **Step 5.3: Run full test suite**

Run:

```sh
bun run test
```

Expected: PASS.

- [ ] **Step 5.4: Inspect git diff**

Run:

```sh
git status --short
git diff --stat
```

Expected: only intentional quest-system files are modified, or the working tree is clean if every task commit has already happened.

- [ ] **Step 5.5: Commit final cleanup if needed**

If formatting or small cleanup edits were made during verification, run:

```sh
git add src/lib/game docs/superpowers/plans/2026-05-09-quest-system.md tests/e2e/game.e2e.ts
git commit -m "Verify quest system implementation"
```

Expected: commit succeeds if there were cleanup edits. If there are no cleanup edits, skip this step.

---

## Self-Review Notes

- Spec coverage: the plan includes quest content, pure rules, save persistence, bridge payloads, `WorldScene` event integration, ruins gating, automatic rewards, Quest Log UI, Guild quest acceptance UI, e2e coverage, and final verification.
- Save determinism: available side quests are derived from state and content; accepted/completed quests are persisted.
- Impossible-side-quest guard: accepting a side quest seeds progress from existing cleared encounter and collected pickup flags.
- Scope guard: the plan does not add branching dialogue, minimap markers, reputation, multiple quest givers, or new art.
