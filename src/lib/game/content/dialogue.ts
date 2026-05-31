import type { QuestId } from '$lib/game/content/quests';
import { t, type MessageKey } from '$lib/game/i18n/translate';

export type NpcDialogueId = 'guild-master' | 'guild-quartermaster' | 'shopkeeper-mira';

export type DialogueBranchCondition =
	| 'always'
	| 'mainQuestNeedsGuildBriefing'
	| 'guildBriefingComplete'
	| 'hasActiveSideQuest'
	| 'hasCompletedQuest';

export type DialogueActionIntent =
	| { type: 'talk' }
	| { type: 'showQuestList'; giverNpcId: string }
	| { type: 'showQuestDetails'; questId: QuestId }
	| { type: 'openShop'; shopId: string }
	| { type: 'close' };

export type DialogueActionDefinition = {
	id: string;
	labelKey: MessageKey;
	label: string;
	intent: DialogueActionIntent;
};

export type DialogueBranchDefinition = {
	condition: DialogueBranchCondition;
	lineKeys: MessageKey[];
	lines: string[];
};

export type NpcDialogueDefinition = {
	id: NpcDialogueId;
	speakerKey: MessageKey;
	speaker: string;
	defaultBranches: DialogueBranchDefinition[];
	actions: DialogueActionDefinition[];
};

type DialogueActionDefinitionSource = Omit<DialogueActionDefinition, 'label'>;
type DialogueBranchDefinitionSource = Omit<DialogueBranchDefinition, 'lines'>;
type NpcDialogueDefinitionSource = Omit<
	NpcDialogueDefinition,
	'speaker' | 'defaultBranches' | 'actions'
> & {
	defaultBranches: DialogueBranchDefinitionSource[];
	actions: DialogueActionDefinitionSource[];
};

const npcDialogueDefinitions = {
	'guild-master': {
		id: 'guild-master',
		speakerKey: 'content.dialogue.guild-master.speaker',
		defaultBranches: [
			{
				condition: 'mainQuestNeedsGuildBriefing',
				lineKeys: [
					'content.dialogue.guild-master.lines.mainQuestNeedsGuildBriefing1',
					'content.dialogue.guild-master.lines.mainQuestNeedsGuildBriefing2'
				]
			},
			{
				condition: 'hasActiveSideQuest',
				lineKeys: [
					'content.dialogue.guild-master.lines.hasActiveSideQuest1',
					'content.dialogue.guild-master.lines.hasActiveSideQuest2'
				]
			},
			{
				condition: 'hasCompletedQuest',
				lineKeys: ['content.dialogue.guild-master.lines.hasCompletedQuest']
			},
			{
				condition: 'guildBriefingComplete',
				lineKeys: ['content.dialogue.guild-master.lines.guildBriefingComplete']
			},
			{
				condition: 'always',
				lineKeys: ['content.dialogue.guild-master.lines.always']
			}
		],
		actions: [
			{ id: 'talk', labelKey: 'content.dialogue.actions.talk', intent: { type: 'talk' } },
			{
				id: 'quest',
				labelKey: 'content.dialogue.actions.quest',
				intent: { type: 'showQuestList', giverNpcId: 'guild-master' }
			}
		]
	},
	'guild-quartermaster': {
		id: 'guild-quartermaster',
		speakerKey: 'content.dialogue.guild-quartermaster.speaker',
		defaultBranches: [
			{
				condition: 'guildBriefingComplete',
				lineKeys: ['content.dialogue.guild-quartermaster.lines.guildBriefingComplete']
			},
			{
				condition: 'always',
				lineKeys: ['content.dialogue.guild-quartermaster.lines.always']
			}
		],
		actions: [
			{ id: 'talk', labelKey: 'content.dialogue.actions.talk', intent: { type: 'talk' } },
			{
				id: 'shop',
				labelKey: 'content.dialogue.actions.shop',
				intent: { type: 'openShop', shopId: 'guild-quartermaster' }
			}
		]
	},
	'shopkeeper-mira': {
		id: 'shopkeeper-mira',
		speakerKey: 'content.dialogue.shopkeeper-mira.speaker',
		defaultBranches: [
			{
				condition: 'guildBriefingComplete',
				lineKeys: ['content.dialogue.shopkeeper-mira.lines.guildBriefingComplete']
			},
			{
				condition: 'always',
				lineKeys: ['content.dialogue.shopkeeper-mira.lines.always']
			}
		],
		actions: [
			{ id: 'talk', labelKey: 'content.dialogue.actions.talk', intent: { type: 'talk' } },
			{
				id: 'shop',
				labelKey: 'content.dialogue.actions.shop',
				intent: { type: 'openShop', shopId: 'miras-item-shop' }
			}
		]
	}
} satisfies Record<NpcDialogueId, NpcDialogueDefinitionSource>;

export const npcDialogues = addEnglishDialogueText(npcDialogueDefinitions);

export const npcDialogueList: NpcDialogueDefinition[] = Object.values(npcDialogues);

export function getDialogue(dialogueId: string): NpcDialogueDefinition | undefined {
	return (npcDialogues as Record<string, NpcDialogueDefinition>)[dialogueId];
}

function addEnglishDialogueText(
	definitions: Record<NpcDialogueId, NpcDialogueDefinitionSource>
): Record<NpcDialogueId, NpcDialogueDefinition> {
	return Object.fromEntries(
		Object.entries(definitions).map(([dialogueId, dialogue]) => [
			dialogueId,
			{
				...dialogue,
				speaker: t('en', dialogue.speakerKey),
				defaultBranches: dialogue.defaultBranches.map((branch) => ({
					...branch,
					lines: branch.lineKeys.map((key) => t('en', key))
				})),
				actions: dialogue.actions.map((action) => ({
					...action,
					label: t('en', action.labelKey)
				}))
			}
		])
	) as Record<NpcDialogueId, NpcDialogueDefinition>;
}
