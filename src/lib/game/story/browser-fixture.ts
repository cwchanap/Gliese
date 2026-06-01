// Browser-only fixture for Vite dev and Playwright. Tauri release builds use VITE_STORY_RUNTIME=tauri and must tree-shake this module.
import type {
	StoryDialogueResponse,
	StoryIntent,
	StoryQuestSummary,
	StoryRuntimeDialogueRequest
} from '$lib/game/story/client';

type StoryBranchCondition =
	| 'mainQuestNeedsGuildBriefing'
	| 'hasActiveSideQuest'
	| 'hasCompletedQuest'
	| 'guildBriefingComplete'
	| 'always';

type StoryFixtureBranch = {
	condition: StoryBranchCondition;
	speaker: string;
	lines: string[];
	actions: Array<{ id: string; label: string; intent: StoryIntent }>;
	completionIntent: StoryIntent | null;
};

const branchPriority: StoryBranchCondition[] = [
	'mainQuestNeedsGuildBriefing',
	'hasActiveSideQuest',
	'hasCompletedQuest',
	'guildBriefingComplete',
	'always'
];

const npcFixtures: Record<string, StoryFixtureBranch[]> = {
	'guild-master': [
		{
			condition: 'mainQuestNeedsGuildBriefing',
			speaker: 'Guild Master Arlen',
			lines: [
				'You made it. The eastern ruins are stirring again, and the village road is no longer safe.',
				'Go through the forest path, reach the old core, and defeat the warden before it wakes the rest.'
			],
			actions: [
				{
					id: 'quest',
					label: 'Quest',
					intent: { type: 'showQuestList', giverNpcId: 'guild-master' }
				}
			],
			completionIntent: { type: 'recordNpcTalk', npcId: 'guild-master' }
		},
		{
			condition: 'hasActiveSideQuest',
			speaker: 'Guild Master Arlen',
			lines: [
				'The Guild board is yours to work through, but do not lose sight of the warden.',
				'Report progress through your journal. I will keep new work here at the counter.'
			],
			actions: [
				{
					id: 'quest',
					label: 'Quest',
					intent: { type: 'showQuestList', giverNpcId: 'guild-master' }
				}
			],
			completionIntent: null
		},
		{
			condition: 'hasCompletedQuest',
			speaker: 'Guild Master Arlen',
			lines: ['Good work out there. The village notices when a hunter keeps the roads clear.'],
			actions: [
				{
					id: 'quest',
					label: 'Quest',
					intent: { type: 'showQuestList', giverNpcId: 'guild-master' }
				}
			],
			completionIntent: null
		},
		{
			condition: 'guildBriefingComplete',
			speaker: 'Guild Master Arlen',
			lines: ['The ruins route is open. Steel yourself before you enter the core.'],
			actions: [
				{
					id: 'quest',
					label: 'Quest',
					intent: { type: 'showQuestList', giverNpcId: 'guild-master' }
				}
			],
			completionIntent: null
		},
		{
			condition: 'always',
			speaker: 'Guild Master Arlen',
			lines: ['The Guild keeps watch over the old road. Speak plainly and choose your work.'],
			actions: [
				{
					id: 'quest',
					label: 'Quest',
					intent: { type: 'showQuestList', giverNpcId: 'guild-master' }
				}
			],
			completionIntent: null
		}
	],
	'guild-quartermaster': [
		{
			condition: 'guildBriefingComplete',
			speaker: 'Quartermaster Vale',
			lines: ['If you are bound for the ruins, buy what keeps you standing.'],
			actions: [
				{ id: 'shop', label: 'Shop', intent: { type: 'openShop', shopId: 'guild-quartermaster' } }
			],
			completionIntent: null
		},
		{
			condition: 'always',
			speaker: 'Quartermaster Vale',
			lines: ['Need field gear before the ruins? Guild stock is limited, but sturdy.'],
			actions: [
				{ id: 'shop', label: 'Shop', intent: { type: 'openShop', shopId: 'guild-quartermaster' } }
			],
			completionIntent: null
		}
	],
	'shopkeeper-mira': [
		{
			condition: 'guildBriefingComplete',
			speaker: 'Mira',
			lines: ['Back from the Guild? Take a tonic before the forest path gets rough.'],
			actions: [
				{ id: 'shop', label: 'Shop', intent: { type: 'openShop', shopId: 'miras-item-shop' } }
			],
			completionIntent: null
		},
		{
			condition: 'always',
			speaker: 'Mira',
			lines: ['Fresh tonics are on the shelf. The guild already stocked your field kit today.'],
			actions: [
				{ id: 'shop', label: 'Shop', intent: { type: 'openShop', shopId: 'miras-item-shop' } }
			],
			completionIntent: null
		}
	],
	'villager-lynn': [
		{
			condition: 'always',
			speaker: 'Lynn',
			lines: ['The kettle is warm if you need a quiet minute before the road.'],
			actions: [{ id: 'close', label: 'Close', intent: { type: 'close' } }],
			completionIntent: null
		}
	],
	'villager-toma': [
		{
			condition: 'always',
			speaker: 'Toma',
			lines: [
				'I patched the south fence this morning. If the slimes cross it again, tell the Guild.'
			],
			actions: [{ id: 'close', label: 'Close', intent: { type: 'close' } }],
			completionIntent: null
		}
	],
	'villager-io': [
		{
			condition: 'always',
			speaker: 'Io',
			lines: ['Old records say the ruins quiet down when someone brave reaches the core.'],
			actions: [{ id: 'close', label: 'Close', intent: { type: 'close' } }],
			completionIntent: null
		}
	]
};

export function getBrowserNpcDialogue(request: StoryRuntimeDialogueRequest): StoryDialogueResponse {
	const branches = npcFixtures[request.npcId];
	if (!branches) {
		throw new Error(`unknown story npc: ${request.npcId}`);
	}

	const branch = branchPriority
		.filter((condition) => branchConditionMatches(condition, request.quest))
		.map((condition) => branches.find((candidate) => candidate.condition === condition))
		.find((candidate) => candidate !== undefined);

	if (!branch) {
		throw new Error(`no story dialogue branch for npc: ${request.npcId}`);
	}

	return {
		sessionId: `npc:${request.npcId}:${branch.condition}`,
		speaker: branch.speaker,
		lines: branch.lines,
		actions: branch.actions,
		completionIntent: branch.completionIntent
	};
}

function branchConditionMatches(
	condition: StoryBranchCondition,
	quest: StoryQuestSummary
): boolean {
	switch (condition) {
		case 'mainQuestNeedsGuildBriefing':
			return quest.mainQuestNeedsGuildBriefing;
		case 'hasActiveSideQuest':
			return quest.hasActiveSideQuest;
		case 'hasCompletedQuest':
			return quest.hasCompletedQuest;
		case 'guildBriefingComplete':
			return quest.guildBriefingComplete;
		case 'always':
			return true;
	}
}
