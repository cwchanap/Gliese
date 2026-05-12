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
				lines: [
					'Good work out there. The village notices when a hunter keeps the roads clear.'
				]
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
