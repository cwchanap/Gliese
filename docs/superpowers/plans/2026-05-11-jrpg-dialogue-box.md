# JRPG Dialogue Box Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace one-line NPC status dialogue with a JRPG-style dialogue box for all NPCs, including state-aware quest dialogue, Talk/Quest/Shop choices, Guild side quest acceptance inside dialogue, and dialogue-style quest completion rewards.

**Architecture:** Add a pure dialogue content and engine layer, then have `WorldScene` own runtime session state and intent execution. Svelte renders a focused dialogue panel from HUD state and sends dialogue commands through the existing custom event bridge.

**Tech Stack:** TypeScript, Svelte 5 runes mode, Phaser 4 integration, Vite, Vitest node tests, vitest-browser-svelte component tests, Playwright e2e, bun.

---

## File Structure

- Create `src/lib/game/content/dialogue.ts`: declarative NPC dialogue definitions, choice ids, and dialogue content helpers.
- Create `src/lib/game/content/dialogue.test.ts`: content validation for NPC dialogue ids, quest references, and shop references.
- Create `src/lib/game/core/dialogue.ts`: pure dialogue session model, state-aware branch selection, advance, choose, completion, and fallback helpers.
- Create `src/lib/game/core/dialogue.test.ts`: pure tests for Guild Master branches, Talk/Quest/Shop choices, quest detail/accept intents, completion messages, and fallback lines.
- Create `src/lib/game/DialoguePanel.svelte`: focused bottom-screen JRPG dialogue renderer.
- Create `src/lib/game/DialoguePanel.svelte.spec.ts`: browser component tests for rendering, choices, close, and keyboard controls.
- Modify `src/lib/game/content/maps.ts`: add `dialogueId` references first, then remove legacy NPC `dialogue` strings after `WorldScene` is migrated.
- Modify `src/lib/game/ui-bridge/events.ts`: add `HudDialogueState` to `HudState` and dialogue commands to `HudCommand`.
- Modify `src/lib/game/ui-bridge/store.ts`: add request helpers for dialogue advance, close, and choice.
- Modify `src/lib/game/phaser/scenes/WorldScene.ts`: store active dialogue session, start NPC dialogue, execute dialogue intents, show completion dialogue, and publish dialogue HUD state.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`: update NPC/shop/quest tests for dialogue sessions and commands.
- Modify `src/lib/game/GameShell.svelte`: render `DialoguePanel`, wire commands, and remove the Guild Quests menu action.
- Modify `tests/e2e/game.e2e.ts`: replace the Guild Quests overlay flow with a Guild Master dialogue acceptance flow.

## Task 1: Dialogue Content Definitions

**Files:**

- Create: `src/lib/game/content/dialogue.ts`
- Create: `src/lib/game/content/dialogue.test.ts`
- Modify: `src/lib/game/content/maps.ts`

- [ ] **Step 1: Write the failing dialogue content validation tests**

Create `src/lib/game/content/dialogue.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { getDialogue, npcDialogueList } from '$lib/game/content/dialogue';
import { maps } from '$lib/game/content/maps';
import { getQuest } from '$lib/game/content/quests';
import { getShop } from '$lib/game/content/shops';

describe('dialogue content', () => {
	it('defines dialogue for every configured NPC', () => {
		const npcs = Object.values(maps).flatMap((map) => map.npcs ?? []);

		expect(npcs.length).toBeGreaterThan(0);
		for (const npc of npcs) {
			expect(getDialogue(npc.dialogueId)?.speaker).toBe(npc.name);
		}
	});

	it('uses stable unique dialogue ids', () => {
		expect(new Set(npcDialogueList.map((dialogue) => dialogue.id)).size).toBe(
			npcDialogueList.length
		);
		expect(getDialogue('guild-master')?.id).toBe('guild-master');
		expect(getDialogue('guild-quartermaster')?.id).toBe('guild-quartermaster');
		expect(getDialogue('shopkeeper-mira')?.id).toBe('shopkeeper-mira');
	});

	it('keeps dialogue action references valid', () => {
		for (const dialogue of npcDialogueList) {
			for (const action of dialogue.actions) {
				if (action.intent.type === 'openShop') {
					expect(getShop(action.intent.shopId)).toBeDefined();
				}

				if (action.intent.type === 'showQuestList') {
					expect(action.intent.giverNpcId).toBe('guild-master');
				}

				if (action.intent.type === 'showQuestDetails') {
					expect(getQuest(action.intent.questId)).toBeDefined();
				}
			}
		}
	});
});
```

- [ ] **Step 2: Run the dialogue content test and verify it fails**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/dialogue.test.ts
```

Expected: FAIL because `src/lib/game/content/dialogue.ts` does not exist and `MapNpc` does not expose `dialogueId`.

- [ ] **Step 3: Add dialogue content definitions**

Create `src/lib/game/content/dialogue.ts`:

```ts
import type { QuestId } from '$lib/game/content/quests';

export type NpcDialogueId = 'guild-master' | 'guild-quartermaster' | 'shopkeeper-mira';

export type DialogueBranchCondition =
	| 'always'
	| 'mainQuestNeedsGuildBriefing'
	| 'guildBriefingComplete'
	| 'hasActiveSideQuest'
	| 'hasCompletedQuest';

export type DialogueActionIntent =
	| { type: 'talk' }
	| { type: 'showQuestList'; giverNpcId: 'guild-master' }
	| { type: 'showQuestDetails'; questId: QuestId }
	| { type: 'openShop'; shopId: string }
	| { type: 'close' };

export type DialogueActionDefinition = {
	id: string;
	label: string;
	intent: DialogueActionIntent;
};

export type DialogueBranchDefinition = {
	condition: DialogueBranchCondition;
	lines: string[];
};

export type NpcDialogueDefinition = {
	id: NpcDialogueId;
	speaker: string;
	defaultBranches: DialogueBranchDefinition[];
	actions: DialogueActionDefinition[];
};

export const npcDialogues = {
	'guild-master': {
		id: 'guild-master',
		speaker: 'Guild Master Arlen',
		defaultBranches: [
			{
				condition: 'mainQuestNeedsGuildBriefing',
				lines: [
					'You made it. The eastern ruins are stirring again, and the village road is no longer safe.',
					'Go through the forest path, reach the old core, and defeat the warden before it wakes the rest.'
				]
			},
			{
				condition: 'hasActiveSideQuest',
				lines: [
					'The Guild board is yours to work through, but do not lose sight of the warden.',
					'Report progress through your journal. I will keep new work here at the counter.'
				]
			},
			{
				condition: 'hasCompletedQuest',
				lines: ['Good work out there. The village notices when a hunter keeps the roads clear.']
			},
			{
				condition: 'guildBriefingComplete',
				lines: ['The ruins route is open. Steel yourself before you enter the core.']
			},
			{
				condition: 'always',
				lines: ['The Guild keeps watch over the old road. Speak plainly and choose your work.']
			}
		],
		actions: [
			{ id: 'talk', label: 'Talk', intent: { type: 'talk' } },
			{
				id: 'quest',
				label: 'Quest',
				intent: { type: 'showQuestList', giverNpcId: 'guild-master' }
			}
		]
	},
	'guild-quartermaster': {
		id: 'guild-quartermaster',
		speaker: 'Quartermaster Vale',
		defaultBranches: [
			{
				condition: 'guildBriefingComplete',
				lines: ['If you are bound for the ruins, buy what keeps you standing.']
			},
			{
				condition: 'always',
				lines: ['Need field gear before the ruins? Guild stock is limited, but sturdy.']
			}
		],
		actions: [
			{ id: 'talk', label: 'Talk', intent: { type: 'talk' } },
			{ id: 'shop', label: 'Shop', intent: { type: 'openShop', shopId: 'guild-quartermaster' } }
		]
	},
	'shopkeeper-mira': {
		id: 'shopkeeper-mira',
		speaker: 'Mira',
		defaultBranches: [
			{
				condition: 'guildBriefingComplete',
				lines: ['Back from the Guild? Take a tonic before the forest path gets rough.']
			},
			{
				condition: 'always',
				lines: ['Fresh tonics are on the shelf. The guild already stocked your field kit today.']
			}
		],
		actions: [
			{ id: 'talk', label: 'Talk', intent: { type: 'talk' } },
			{ id: 'shop', label: 'Shop', intent: { type: 'openShop', shopId: 'miras-item-shop' } }
		]
	}
} satisfies Record<NpcDialogueId, NpcDialogueDefinition>;

export const npcDialogueList: NpcDialogueDefinition[] = Object.values(npcDialogues);

export function getDialogue(dialogueId: string): NpcDialogueDefinition | undefined {
	return (npcDialogues as Record<string, NpcDialogueDefinition>)[dialogueId];
}
```

- [ ] **Step 4: Add dialogue ids while preserving existing status text temporarily**

Modify `src/lib/game/content/maps.ts`:

```ts
import type { NpcDialogueId } from '$lib/game/content/dialogue';
```

Update `MapNpc`:

```ts
export interface MapNpc {
	id: string;
	x: number;
	y: number;
	name: string;
	dialogue: string;
	dialogueId: NpcDialogueId;
	role: MapNpcRole;
	frameName: NpcFrameName;
	shopId?: string;
}
```

Update the NPC entries:

```ts
{
	id: 'guild-master',
	x: 192,
	y: 144,
	name: 'Guild Master Arlen',
	dialogue: 'The ruins are stirring again. Speak with me, then clear the warden.',
	dialogueId: 'guild-master',
	role: 'guild',
	frameName: 'guildMasterNpc'
},
{
	id: 'guild-quartermaster',
	x: 352,
	y: 144,
	name: 'Quartermaster Vale',
	dialogue: 'Need field gear before the ruins? Guild stock is limited, but sturdy.',
	dialogueId: 'guild-quartermaster',
	role: 'shopkeeper',
	frameName: 'quartermasterNpc',
	shopId: 'guild-quartermaster'
}
```

Update Mira:

```ts
{
	id: 'shopkeeper-mira',
	x: 256,
	y: 144,
	name: 'Mira',
	dialogue: 'Fresh tonics are on the shelf. The guild already stocked your field kit today.',
	dialogueId: 'shopkeeper-mira',
	role: 'shopkeeper',
	frameName: 'miraItemShopNpc',
	shopId: 'miras-item-shop'
}
```

- [ ] **Step 5: Run the dialogue content test and verify it passes**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/dialogue.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit dialogue content**

```sh
git add src/lib/game/content/dialogue.ts src/lib/game/content/dialogue.test.ts src/lib/game/content/maps.ts
git commit -m "feat: add dialogue content definitions"
```

## Task 2: Pure Dialogue Engine

**Files:**

- Create: `src/lib/game/core/dialogue.ts`
- Create: `src/lib/game/core/dialogue.test.ts`

- [ ] **Step 1: Write failing pure dialogue engine tests**

Create `src/lib/game/core/dialogue.test.ts`:

```ts
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
		expect(third.choices.map((choice) => choice.label)).toEqual(['Talk', 'Quest']);
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

	it('replays state-aware Talk lines from the Talk choice', () => {
		const questState = applyQuestEvent({
			state: createInitialQuestState(),
			event: { type: 'talk-to-npc', npcId: 'guild-master' }
		}).state;
		const session = startNpcDialogue({ npcId: 'guild-master', questState });
		const choiceResult = chooseDialogueOption({
			session,
			choiceId: 'talk',
			questState
		});

		expect(choiceResult.intent).toEqual({ type: 'talk' });
		expect(choiceResult.session).toMatchObject({
			speaker: 'Guild Master Arlen',
			line: 'The ruins route is open. Steel yourself before you enter the core.'
		});
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
```

- [ ] **Step 2: Run the pure dialogue test and verify it fails**

Run:

```sh
bun run test:unit -- --run src/lib/game/core/dialogue.test.ts
```

Expected: FAIL because `src/lib/game/core/dialogue.ts` does not exist.

- [ ] **Step 3: Implement the dialogue engine types and helpers**

Create `src/lib/game/core/dialogue.ts`:

```ts
import { getDialogue, type DialogueActionIntent } from '$lib/game/content/dialogue';
import { getQuest, type QuestId, type QuestReward } from '$lib/game/content/quests';
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

	return createSession({
		id: `npc:${definition.id}`,
		npcId: definition.id,
		speaker: definition.speaker,
		lines,
		choices,
		completionIntent:
			definition.id === 'guild-master' &&
			!hasCompletedQuestObjective(questState, 'investigate-the-ruins', 'talk-to-guild-master')
				? { type: 'recordNpcTalk', npcId: 'guild-master' }
				: null
	});
}

export function advanceDialogue(session: DialogueSession): DialogueSession {
	if (session.lineIndex + 1 < session.lineCount) {
		return {
			...session,
			lineIndex: session.lineIndex + 1,
			line: session.lines[session.lineIndex + 1]!,
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
	title,
	reward
}: {
	questId: QuestId;
	title: string;
	reward: QuestReward;
}): DialogueSession {
	return createSession({
		id: `quest-complete:${title}`,
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
	const questChoices = getAvailableGuildQuestIds(questState).map((questId) => {
		const quest = getQuest(questId)!;
		return {
			id: `quest:${quest.id}`,
			label: quest.title,
			intent: { type: 'showQuestDetails', questId: quest.id } as const
		};
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
		lines: [
			`${quest.title}: ${objective.description} Reward: ${formatRewardSummary(quest.reward)}.`
		],
		choices: [
			{
				id: `accept:${quest.id}`,
				label: 'Accept',
				intent: { type: 'acceptQuest', questId: quest.id }
			},
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

function branchMatches(condition: string, questState: QuestState): boolean {
	if (condition === 'mainQuestNeedsGuildBriefing') {
		return !hasCompletedQuestObjective(questState, 'investigate-the-ruins', 'talk-to-guild-master');
	}

	if (condition === 'guildBriefingComplete') {
		return hasCompletedQuestObjective(questState, 'investigate-the-ruins', 'talk-to-guild-master');
	}

	if (condition === 'hasActiveSideQuest') {
		return Object.entries(questState.entries).some(
			([questId, entry]) => questId !== 'investigate-the-ruins' && entry.status === 'active'
		);
	}

	if (condition === 'hasCompletedQuest') {
		return Object.entries(questState.entries).some(
			([questId, entry]) => questId !== 'investigate-the-ruins' && entry.status === 'completed'
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
```

- [ ] **Step 4: Run the pure dialogue test and verify it passes**

Run:

```sh
bun run test:unit -- --run src/lib/game/core/dialogue.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the dialogue engine**

```sh
git add src/lib/game/core/dialogue.ts src/lib/game/core/dialogue.test.ts
git commit -m "feat: add pure dialogue engine"
```

## Task 3: HUD Bridge And Dialogue Panel

**Files:**

- Modify: `src/lib/game/ui-bridge/events.ts`
- Modify: `src/lib/game/ui-bridge/store.ts`
- Create: `src/lib/game/DialoguePanel.svelte`
- Create: `src/lib/game/DialoguePanel.svelte.spec.ts`

- [ ] **Step 1: Add failing dialogue panel component tests**

Create `src/lib/game/DialoguePanel.svelte.spec.ts`:

```ts
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import DialoguePanel from '$lib/game/DialoguePanel.svelte';
import type { HudDialogueState } from '$lib/game/ui-bridge/events';

const dialogue: HudDialogueState = {
	id: 'npc:guild-master',
	speaker: 'Guild Master Arlen',
	line: 'Choose the Guild work you want to review.',
	lineIndex: 0,
	lineCount: 1,
	mode: 'choice',
	canClose: true,
	choices: [
		{ id: 'quest:thin-village-slimes', label: 'Thin Village Slimes' },
		{ id: 'close', label: 'Close' }
	]
};

describe('DialoguePanel.svelte', () => {
	it('renders speaker text and choices', async () => {
		render(DialoguePanel, {
			props: {
				dialogue,
				onadvance: vi.fn(),
				onclose: vi.fn(),
				onchoose: vi.fn()
			}
		});

		await expect.element(page.getByRole('dialog', { name: 'Guild Master Arlen' })).toBeVisible();
		await expect.element(page.getByText('Choose the Guild work you want to review.')).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Thin Village Slimes' })).toBeVisible();
	});

	it('emits choose and close callbacks', async () => {
		const onchoose = vi.fn();
		const onclose = vi.fn();
		render(DialoguePanel, {
			props: {
				dialogue,
				onadvance: vi.fn(),
				onclose,
				onchoose
			}
		});

		await page.getByRole('button', { name: 'Thin Village Slimes' }).click();
		await page.getByRole('button', { name: 'Close' }).click();

		expect(onchoose).toHaveBeenCalledWith('quest:thin-village-slimes');
		expect(onclose).toHaveBeenCalledOnce();
	});
});
```

- [ ] **Step 2: Run the panel test and verify it fails**

Run:

```sh
bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts
```

Expected: FAIL because `DialoguePanel.svelte` and `HudDialogueState` do not exist.

- [ ] **Step 3: Extend HUD bridge types and helpers**

Modify `src/lib/game/ui-bridge/events.ts`:

```ts
export type HudDialogueChoice = {
	id: string;
	label: string;
};

export type HudDialogueState = {
	id: string;
	speaker: string;
	line: string;
	lineIndex: number;
	lineCount: number;
	mode: 'conversation' | 'choice' | 'system';
	choices: HudDialogueChoice[];
	canClose: boolean;
};
```

Add `dialogue` to `HudState`:

```ts
dialogue: HudDialogueState | null;
```

Add dialogue commands to `HudCommand`:

```ts
| { type: 'dialogue-advance' }
| { type: 'dialogue-close' }
| { type: 'dialogue-choose'; choiceId: string }
```

Modify `src/lib/game/ui-bridge/store.ts` initial state:

```ts
dialogue: null,
```

Add request helpers:

```ts
export function requestDialogueAdvance() {
	emitHudCommand({ type: 'dialogue-advance' });
}

export function requestDialogueClose() {
	emitHudCommand({ type: 'dialogue-close' });
}

export function requestDialogueChoice(choiceId: string) {
	emitHudCommand({ type: 'dialogue-choose', choiceId });
}
```

- [ ] **Step 4: Implement the focused dialogue panel**

Create `src/lib/game/DialoguePanel.svelte`:

```svelte
<script lang="ts">
	import type { HudDialogueState } from '$lib/game/ui-bridge/events';

	type Props = {
		dialogue: HudDialogueState;
		onadvance: () => void;
		onclose: () => void;
		onchoose: (choiceId: string) => void;
	};

	let { dialogue, onadvance, onclose, onchoose }: Props = $props();

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && dialogue.canClose) {
			event.preventDefault();
			event.stopPropagation();
			onclose();
			return;
		}

		if (event.key !== 'Enter' && event.key !== ' ') return;

		event.preventDefault();
		event.stopPropagation();

		if (dialogue.mode === 'choice') {
			const firstChoice = dialogue.choices[0];
			if (firstChoice) onchoose(firstChoice.id);
			return;
		}

		onadvance();
	}
</script>

<section
	class="pointer-events-auto absolute right-4 bottom-4 left-4 z-[70] rounded-[1.2rem] border border-white/18 bg-[linear-gradient(145deg,rgba(8,13,34,0.96),rgba(16,24,44,0.94))] p-4 text-slate-50 shadow-[0_24px_70px_rgba(0,0,0,0.48)] backdrop-blur-md sm:right-6 sm:bottom-6 sm:left-6"
	role="dialog"
	aria-label={dialogue.speaker}
	tabindex="-1"
	onkeydown={handleKeydown}
>
	<div class="grid gap-3">
		<div class="flex items-center justify-between gap-3">
			<p class="text-[0.65rem] font-black tracking-[0.28em] text-cyan-100/75 uppercase">
				{dialogue.speaker}
			</p>
			{#if dialogue.canClose}
				<button
					type="button"
					class="rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-[0.62rem] font-black tracking-[0.2em] text-slate-100 uppercase"
					onclick={onclose}
				>
					Close
				</button>
			{/if}
		</div>

		<p class="min-h-[3rem] text-base leading-7 text-slate-50 sm:text-lg">{dialogue.line}</p>

		{#if dialogue.mode === 'choice'}
			<div class="grid gap-2 sm:grid-cols-2">
				{#each dialogue.choices as choice (choice.id)}
					<button
						type="button"
						class="rounded-[0.8rem] border border-cyan-100/18 bg-cyan-100/8 px-3 py-2 text-left text-sm font-black tracking-[0.08em] text-cyan-50 uppercase transition hover:border-cyan-100/42 hover:bg-cyan-100/14"
						onclick={() => onchoose(choice.id)}
					>
						{choice.label}
					</button>
				{/each}
			</div>
		{:else}
			<div class="flex justify-end">
				<button
					type="button"
					class="rounded-full border border-cyan-100/22 bg-cyan-100/10 px-4 py-2 text-xs font-black tracking-[0.2em] text-cyan-50 uppercase"
					onclick={onadvance}
				>
					Next
				</button>
			</div>
		{/if}
	</div>
</section>
```

- [ ] **Step 5: Run the panel test and verify it passes**

Run:

```sh
bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit bridge and panel**

```sh
git add src/lib/game/ui-bridge/events.ts src/lib/game/ui-bridge/store.ts src/lib/game/DialoguePanel.svelte src/lib/game/DialoguePanel.svelte.spec.ts
git commit -m "feat: add dialogue hud panel"
```

## Task 4: WorldScene Dialogue Runtime

**Files:**

- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/content/maps.ts`

- [ ] **Step 1: Add failing WorldScene dialogue runtime tests**

Modify `src/lib/game/phaser/scenes/scenes.test.ts` near the current NPC interaction tests:

```ts
it('starts Guild Master dialogue instead of status-only NPC text', async () => {
	const events = await import('$lib/game/ui-bridge/events');
	const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'guild-hall' });
	Object.assign(phaserState.playerMarker, { x: 192, y: 144 });
	scene.update(0, 16);
	emitHudStateSpy.mockClear();

	phaserState.interactKeys.e.justDown = true;
	scene.update(16, 16);

	expect(emitHudStateSpy).toHaveBeenLastCalledWith(
		expect.objectContaining({
			dialogue: expect.objectContaining({
				speaker: 'Guild Master Arlen',
				line: expect.stringContaining('The eastern ruins are stirring again')
			})
		})
	);
});

it('advances dialogue and records Guild Master quest progress at the end of briefing', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		handleHudCommand: (command: HudCommand) => void;
		buildSaveState: () => {
			quests: {
				entries: Record<string, { currentObjectiveId: string }>;
				completedObjectives: Record<string, string[]>;
			};
		};
	};

	scene.create({ mapId: 'guild-hall' });
	Object.assign(phaserState.playerMarker, { x: 192, y: 144 });
	phaserState.interactKeys.e.justDown = true;
	scene.update(16, 16);

	sceneState.handleHudCommand({ type: 'dialogue-advance' });
	sceneState.handleHudCommand({ type: 'dialogue-advance' });

	expect(sceneState.buildSaveState().quests.entries['investigate-the-ruins']).toMatchObject({
		currentObjectiveId: 'defeat-ruins-warden'
	});
	expect(sceneState.buildSaveState().quests.completedObjectives['investigate-the-ruins']).toContain(
		'talk-to-guild-master'
	);
});

it('accepts a Guild side quest through dialogue choices', async () => {
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
			player: { ...unlockedSave.player, x: 192, y: 144 },
			quests: {
				entries: {
					'investigate-the-ruins': {
						status: 'active',
						currentObjectiveId: 'defeat-ruins-warden',
						progress: 0,
						rewardApplied: false,
						countedSourceIds: []
					}
				},
				completedObjectives: { 'investigate-the-ruins': ['talk-to-guild-master'] }
			}
		}
	});
	Object.assign(phaserState.playerMarker, { x: 192, y: 144 });
	phaserState.interactKeys.e.justDown = true;
	scene.update(16, 16);

	sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'quest' });
	sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'quest:thin-village-slimes' });
	sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'accept:thin-village-slimes' });

	expect(sceneState.buildSaveState().quests.entries['thin-village-slimes']).toMatchObject({
		currentObjectiveId: 'defeat-village-slimes',
		progress: 0
	});
});

it('opens shops through dialogue choices', async () => {
	const events = await import('$lib/game/ui-bridge/events');
	const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'guild-hall' });
	Object.assign(phaserState.playerMarker, { x: 352, y: 144 });
	phaserState.interactKeys.e.justDown = true;
	scene.update(16, 16);
	emitHudStateSpy.mockClear();

	const sceneState = scene as unknown as { handleHudCommand: (command: HudCommand) => void };
	sceneState.handleHudCommand({ type: 'dialogue-choose', choiceId: 'shop' });

	expect(emitHudStateSpy).toHaveBeenLastCalledWith(
		expect.objectContaining({
			shop: expect.objectContaining({ shopId: 'guild-quartermaster' })
		})
	);
});
```

- [ ] **Step 2: Run the focused scene tests and verify they fail**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL because `WorldScene` still publishes status-only NPC dialogue and does not handle dialogue commands.

- [ ] **Step 3: Wire dialogue session state into WorldScene**

Modify `src/lib/game/phaser/scenes/WorldScene.ts` imports:

```ts
import {
	advanceDialogue,
	buildDialogueFallback,
	buildQuestCompletionDialogue,
	chooseDialogueOption,
	startNpcDialogue,
	type DialogueChoiceResult,
	type DialogueIntent,
	type DialogueSession
} from '$lib/game/core/dialogue';
```

Add scene state:

```ts
private dialogueSession: DialogueSession | null = null;
```

In `publishHudState`, include:

```ts
dialogue: this.buildHudDialogue(),
```

Add helper:

```ts
private buildHudDialogue(): HudState['dialogue'] {
	if (!this.dialogueSession) return null;

	return {
		id: this.dialogueSession.id,
		speaker: this.dialogueSession.speaker,
		line: this.dialogueSession.line,
		lineIndex: this.dialogueSession.lineIndex,
		lineCount: this.dialogueSession.lineCount,
		mode: this.dialogueSession.mode,
		choices: this.dialogueSession.choices.map((choice) => ({
			id: choice.id,
			label: choice.label
		})),
		canClose: this.dialogueSession.canClose
	};
}
```

- [ ] **Step 4: Start NPC dialogue from interaction**

Guard world interaction while dialogue is already open:

```ts
private handleInteractInput() {
	if (!this.hasInteractJustDown()) {
		return;
	}

	if (this.dialogueSession) {
		return;
	}

	this.interactWithNearbyNpc();
}
```

Replace status-only NPC handling in `interactWithNearbyNpc` with:

```ts
private interactWithNearbyNpc() {
	const nearbyNpc = this.findNearbyNpc();

	if (!nearbyNpc) {
		this.dialogueSession = buildDialogueFallback('System', 'No one nearby.');
		this.publishHudState('No one nearby');
		return;
	}

	this.currentNearbyNpcId = nearbyNpc.id;
	this.nearbyShopId = nearbyNpc.shopId ?? null;
	this.dialogueSession = startNpcDialogue({
		npcId: nearbyNpc.dialogueId,
		questState: this.quests
	});
	this.publishHudState('Dialogue opened');
}
```

Update `updateNpcDialogue` so proximity only updates nearby shop metadata and does not publish the old NPC dialogue line:

```ts
if (this.currentNearbyNpcId === nearbyNpc.id) {
	return;
}

this.currentNearbyNpcId = nearbyNpc.id;
this.publishHudState(`${nearbyNpc.name} nearby`);
```

- [ ] **Step 4A: Remove legacy NPC dialogue strings after runtime migration**

Modify `src/lib/game/content/maps.ts` so `MapNpc` no longer exposes `dialogue`:

```ts
export interface MapNpc {
	id: string;
	x: number;
	y: number;
	name: string;
	dialogueId: NpcDialogueId;
	role: MapNpcRole;
	frameName: NpcFrameName;
	shopId?: string;
}
```

Remove the `dialogue: ...` fields from the `guild-master`, `guild-quartermaster`, and `shopkeeper-mira` NPC entries. `WorldScene` should use `nearbyNpc.dialogueId` for dialogue sessions and no code should read `nearbyNpc.dialogue`.

- [ ] **Step 5: Handle dialogue HUD commands**

Add to `handleHudCommand`:

```ts
case 'dialogue-advance':
	this.advanceDialogueCommand();
	return;
case 'dialogue-close':
	this.dialogueSession = null;
	this.publishHudState('Dialogue closed');
	return;
case 'dialogue-choose':
	this.chooseDialogueCommand(command.choiceId);
	return;
```

Add methods:

```ts
private advanceDialogueCommand() {
	if (!this.dialogueSession) {
		this.publishHudState('No dialogue open');
		return;
	}

	const before = this.dialogueSession;
	this.dialogueSession = advanceDialogue(this.dialogueSession);

	if (
		before.completionIntent &&
		before.lineIndex + 1 >= before.lineCount &&
		this.dialogueSession.mode === 'choice'
	) {
		this.executeDialogueIntent(before.completionIntent);
		return;
	}

	this.publishHudState('Dialogue advanced');
}

private chooseDialogueCommand(choiceId: string) {
	if (!this.dialogueSession) {
		this.publishHudState('No dialogue open');
		return;
	}

	const result = chooseDialogueOption({
		session: this.dialogueSession,
		choiceId,
		questState: this.quests
	});
	this.applyDialogueChoiceResult(result);
}

private applyDialogueChoiceResult(result: DialogueChoiceResult) {
	this.dialogueSession = result.session;

	if (result.intent) {
		this.executeDialogueIntent(result.intent);
		return;
	}

	this.publishHudState('Dialogue updated');
}
```

- [ ] **Step 6: Execute dialogue intents in WorldScene**

Add method:

```ts
private executeDialogueIntent(intent: DialogueIntent) {
	if (intent.type === 'recordNpcTalk') {
		this.applyQuestProgress({ type: 'talk-to-npc', npcId: intent.npcId }, 'Ruins route unlocked');
		return;
	}

	if (intent.type === 'acceptQuest') {
		this.acceptGuildQuest(intent.questId);
		return;
	}

	if (intent.type === 'openShop') {
		this.openNearbyShop(intent.shopId);
		return;
	}

	if (intent.type === 'close') {
		this.dialogueSession = null;
		this.publishHudState('Dialogue closed');
		return;
	}

	this.publishHudState('Dialogue updated');
}
```

Update `acceptGuildQuest` failure path to set dialogue feedback:

```ts
if (!result.accepted) {
	this.dialogueSession = buildDialogueFallback(
		'Guild Master Arlen',
		this.formatQuestAcceptFailure(result.reason)
	);
	this.publishHudState(this.formatQuestAcceptFailure(result.reason));
	return;
}
```

Update success path:

```ts
this.dialogueSession = buildDialogueFallback(
	'Guild Master Arlen',
	result.completedQuestIds.length > 0
		? `Quest complete: ${result.rewards[0]?.title ?? 'Quest'}`
		: 'Quest accepted.'
);
```

- [ ] **Step 7: Build quest completion dialogue from rewards**

Update `applyQuestProgress` completion path:

```ts
if (result.completedQuestIds.length > 0) {
	this.dialogueSession = buildQuestCompletionDialogue(
		result.rewards[0] ?? {
			questId: result.completedQuestIds[0]!,
			title: 'Quest',
			reward: {}
		}
	);
	this.publishHudState(`Quest complete: ${result.rewards[0]?.title ?? 'Quest'}`);
	return;
}
```

- [ ] **Step 8: Run focused scene tests and verify they pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit WorldScene dialogue runtime**

```sh
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat: route npc interactions through dialogue"
```

## Task 5: GameShell Integration

**Files:**

- Modify: `src/lib/game/GameShell.svelte`
- Modify: `src/lib/game/DialoguePanel.svelte.spec.ts`

- [ ] **Step 1: Add keyboard coverage to the dialogue panel test**

Append to `src/lib/game/DialoguePanel.svelte.spec.ts`:

```ts
it('advances and closes from keyboard events', async () => {
	const onadvance = vi.fn();
	const onclose = vi.fn();
	render(DialoguePanel, {
		props: {
			dialogue: { ...dialogue, mode: 'conversation', choices: [] },
			onadvance,
			onclose,
			onchoose: vi.fn()
		}
	});

	const panel = page.getByRole('dialog', { name: 'Guild Master Arlen' });
	await panel.element().focus();
	await page.keyboard.press('Enter');
	await page.keyboard.press('Escape');

	expect(onadvance).toHaveBeenCalledOnce();
	expect(onclose).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the panel test and verify it fails**

Run:

```sh
bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts
```

Expected: FAIL until keyboard focus and event handling are stable.

- [ ] **Step 3: Wire DialoguePanel into GameShell**

Modify imports in `src/lib/game/GameShell.svelte`:

```svelte
import DialoguePanel from '$lib/game/DialoguePanel.svelte'; import {(hudState,
requestDialogueAdvance,
requestDialogueChoice,
requestDialogueClose,
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
requestUseItem)} from '$lib/game/ui-bridge/store';
```

Add the dialogue panel near the other top-level overlays:

```svelte
{#if $hudState.dialogue}
	<DialoguePanel
		dialogue={$hudState.dialogue}
		onadvance={requestDialogueAdvance}
		onclose={requestDialogueClose}
		onchoose={requestDialogueChoice}
	/>
{/if}
```

- [ ] **Step 4: Remove the Guild Quests menu action**

Remove `guildQuestsOpen`, `guildQuestsDialog`, `guildQuestsCloseButton`, `openGuildQuests`, `closeGuildQuests`, `focusGuildQuestsDialog`, and the Guild Quests overlay block from `GameShell.svelte`.

Remove the menu button:

```svelte
<button
	type="button"
	class="hud-action rounded-[1.1rem] border border-emerald-200/20 bg-[linear-gradient(135deg,rgba(20,91,76,0.95),rgba(12,42,48,0.92))] px-4 py-3 text-sm font-black tracking-[0.24em] text-emerald-50 uppercase transition hover:-translate-y-0.5 hover:border-emerald-200/45 hover:shadow-[0_15px_30px_rgba(62,205,155,0.22)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
	onclick={openGuildQuests}
	disabled={!$hudState.ready || !$hudState.quests.guildOffer}
>
	Guild Quests
</button>
```

Keep the Quest Log read-only display of available quests because it remains a journal surface.

- [ ] **Step 5: Run Svelte autofixer**

Run the Svelte MCP `svelte-autofixer` on:

```text
src/lib/game/DialoguePanel.svelte
src/lib/game/GameShell.svelte
```

Expected: no remaining Svelte 5 syntax, accessibility, or runes-mode issues.

- [ ] **Step 6: Run component and Svelte checks**

Run:

```sh
bun run test:unit -- --run src/lib/game/DialoguePanel.svelte.spec.ts
bun run check
```

Expected: PASS. If `bun run check` reports stale generated worker types, run `bun run gen` and then re-run `bun run check`.

- [ ] **Step 7: Commit GameShell integration**

```sh
git add src/lib/game/GameShell.svelte src/lib/game/DialoguePanel.svelte src/lib/game/DialoguePanel.svelte.spec.ts
git commit -m "feat: render jrpg dialogue panel"
```

## Task 6: Browser Flow And Full Verification

**Files:**

- Modify: `tests/e2e/game.e2e.ts`

- [ ] **Step 1: Update the Guild quest e2e flow to use dialogue**

Replace the Guild Quests overlay portion of `quest log shows main quest and accepts Guild side quests` in `tests/e2e/game.e2e.ts` with:

```ts
await page.locator('canvas').click();
await page.keyboard.press('KeyE');
await expect(page.getByRole('dialog', { name: 'Guild Master Arlen' })).toBeVisible();
await expect(page.getByText(/eastern ruins are stirring/i)).toBeVisible();
await page.getByRole('button', { name: 'Next' }).click();
await page.getByRole('button', { name: 'Next' }).click();
await page.getByRole('button', { name: 'Quest' }).click();
await page.getByRole('button', { name: 'Thin Village Slimes' }).click();
await expect(page.getByText(/Defeat slimes near the village/i)).toBeVisible();
await page.getByRole('button', { name: 'Accept' }).click();
await expect(page.getByText('Quest accepted.')).toBeVisible();
await page.getByRole('button', { name: 'Close' }).click();

await page.getByRole('button', { name: 'Menu' }).click();
await page.getByRole('button', { name: 'Quests', exact: true }).click();
await expect(
	page.getByRole('dialog', { name: 'Quest Log' }).getByText('Village slimes defeated: 0 / 3')
).toBeVisible();
```

- [ ] **Step 2: Assert the old Guild Quests menu action is gone**

Add this expectation after opening the menu in the same test:

```ts
await expect(page.getByRole('button', { name: 'Guild Quests' })).toHaveCount(0);
```

- [ ] **Step 3: Run the focused e2e and verify it passes**

Run:

```sh
bun run test:e2e -- --grep "quest log shows main quest"
```

Expected: PASS.

- [ ] **Step 4: Run targeted unit coverage**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/dialogue.test.ts src/lib/game/core/dialogue.test.ts src/lib/game/DialoguePanel.svelte.spec.ts src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run full verification**

Run:

```sh
bun run check
bun run test
```

Expected: PASS. If `bun run check` reports stale generated worker types, run:

```sh
bun run gen
bun run check
bun run test
```

Expected after regeneration: PASS.

- [ ] **Step 6: Commit e2e and verification updates**

```sh
git add tests/e2e/game.e2e.ts
git commit -m "test: cover guild quest dialogue flow"
```

## Self-Review Checklist

- Spec coverage: Tasks cover pure dialogue engine, structured dialogue content, all NPC dialogue surface, Talk/Quest/Shop choices, Guild quest acceptance in dialogue, immediate completion dialogue, HUD commands, no-pause behavior, error fallbacks, focused component tests, scene tests, and e2e.
- Incomplete-marker scan: this plan contains no incomplete sections or deferred implementation markers.
- Type consistency: `DialogueSession`, `DialogueIntent`, `HudDialogueState`, `dialogue-advance`, `dialogue-close`, and `dialogue-choose` are introduced before later tasks consume them.
- Scope check: the plan does not add portraits, typewriter effects, manual rewards, new quests, new save state, or Quest Log rewrites.
