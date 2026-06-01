import type { QuestId } from '$lib/game/content/quests';
import { t, type MessageKey } from '$lib/game/i18n/translate';

export type NpcDialogueId =
	| 'guild-master'
	| 'guild-quartermaster'
	| 'shopkeeper-mira'
	| 'villager-lynn'
	| 'villager-toma'
	| 'villager-io';

export type DialogueActionIntent =
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

export type NpcDialogueDefinition = {
	id: NpcDialogueId;
	actions: DialogueActionDefinition[];
};

type DialogueActionDefinitionSource = Omit<DialogueActionDefinition, 'label'>;
type NpcDialogueDefinitionSource = Omit<NpcDialogueDefinition, 'actions'> & {
	actions: DialogueActionDefinitionSource[];
};

const npcDialogueDefinitions = {
	'guild-master': {
		id: 'guild-master',
		actions: [
			{
				id: 'quest',
				labelKey: 'content.dialogue.actions.quest',
				intent: { type: 'showQuestList', giverNpcId: 'guild-master' }
			}
		]
	},
	'guild-quartermaster': {
		id: 'guild-quartermaster',
		actions: [
			{
				id: 'shop',
				labelKey: 'content.dialogue.actions.shop',
				intent: { type: 'openShop', shopId: 'guild-quartermaster' }
			}
		]
	},
	'shopkeeper-mira': {
		id: 'shopkeeper-mira',
		actions: [
			{
				id: 'shop',
				labelKey: 'content.dialogue.actions.shop',
				intent: { type: 'openShop', shopId: 'miras-item-shop' }
			}
		]
	},
	'villager-lynn': {
		id: 'villager-lynn',
		actions: [
			{
				id: 'close',
				labelKey: 'content.dialogue.actions.close',
				intent: { type: 'close' }
			}
		]
	},
	'villager-toma': {
		id: 'villager-toma',
		actions: [
			{
				id: 'close',
				labelKey: 'content.dialogue.actions.close',
				intent: { type: 'close' }
			}
		]
	},
	'villager-io': {
		id: 'villager-io',
		actions: [
			{
				id: 'close',
				labelKey: 'content.dialogue.actions.close',
				intent: { type: 'close' }
			}
		]
	}
} satisfies Record<NpcDialogueId, NpcDialogueDefinitionSource>;

export const npcDialogues = addEnglishActionLabels(npcDialogueDefinitions);

export const npcDialogueList: NpcDialogueDefinition[] = Object.values(npcDialogues);

export function getDialogue(dialogueId: string): NpcDialogueDefinition | undefined {
	return (npcDialogues as Record<string, NpcDialogueDefinition>)[dialogueId];
}

function addEnglishActionLabels(
	definitions: Record<NpcDialogueId, NpcDialogueDefinitionSource>
): Record<NpcDialogueId, NpcDialogueDefinition> {
	return Object.fromEntries(
		Object.entries(definitions).map(([dialogueId, dialogue]) => [
			dialogueId,
			{
				...dialogue,
				actions: dialogue.actions.map((action) => ({
					...action,
					label: t('en', action.labelKey)
				}))
			}
		])
	) as Record<NpcDialogueId, NpcDialogueDefinition>;
}
