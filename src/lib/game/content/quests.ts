import type { ItemDefinition } from '$lib/game/content/items';
import { t, type MessageKey } from '$lib/game/i18n/translate';

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
	descriptionKey: MessageKey;
	progressLabelKey: MessageKey;
	description: string;
	progressLabel: string;
	target: 1;
	npcId: string;
};

export type DefeatEnemyObjective = {
	id: string;
	kind: 'defeat-enemy';
	descriptionKey: MessageKey;
	progressLabelKey: MessageKey;
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
	descriptionKey: MessageKey;
	progressLabelKey: MessageKey;
	description: string;
	progressLabel: string;
	target: number;
	sources: Array<{ mapId: string; pickupId: string; itemId: ItemDefinition['id'] }>;
};

export type QuestObjective = TalkToNpcObjective | DefeatEnemyObjective | CollectItemObjective;

export type QuestDefinition = {
	id: QuestId;
	type: QuestType;
	titleKey: MessageKey;
	descriptionKey: MessageKey;
	title: string;
	description: string;
	giverNpcId?: string;
	availableAfterQuestId?: MainQuestId;
	availableAfterObjectiveId?: string;
	objectives: QuestObjective[];
	reward: QuestReward;
};

type QuestObjectiveSource =
	| Omit<TalkToNpcObjective, 'description' | 'progressLabel'>
	| Omit<DefeatEnemyObjective, 'description' | 'progressLabel'>
	| Omit<CollectItemObjective, 'description' | 'progressLabel'>;

type QuestDefinitionSource = Omit<QuestDefinition, 'title' | 'description' | 'objectives'> & {
	objectives: QuestObjectiveSource[];
};

const questDefinitions = {
	'investigate-the-ruins': {
		id: 'investigate-the-ruins',
		type: 'main',
		titleKey: 'content.quests.investigate-the-ruins.title',
		descriptionKey: 'content.quests.investigate-the-ruins.description',
		objectives: [
			{
				id: 'talk-to-guild-master',
				kind: 'talk-to-npc',
				descriptionKey:
					'content.quests.investigate-the-ruins.objectives.talk-to-guild-master.description',
				progressLabelKey:
					'content.quests.investigate-the-ruins.objectives.talk-to-guild-master.progressLabel',
				target: 1,
				npcId: 'guild-master'
			},
			{
				id: 'defeat-ruins-warden',
				kind: 'defeat-enemy',
				descriptionKey:
					'content.quests.investigate-the-ruins.objectives.defeat-ruins-warden.description',
				progressLabelKey:
					'content.quests.investigate-the-ruins.objectives.defeat-ruins-warden.progressLabel',
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
		titleKey: 'content.quests.thin-village-slimes.title',
		descriptionKey: 'content.quests.thin-village-slimes.description',
		giverNpcId: 'guild-master',
		availableAfterQuestId: 'investigate-the-ruins',
		availableAfterObjectiveId: 'talk-to-guild-master',
		objectives: [
			{
				id: 'defeat-village-slimes',
				kind: 'defeat-enemy',
				descriptionKey:
					'content.quests.thin-village-slimes.objectives.defeat-village-slimes.description',
				progressLabelKey:
					'content.quests.thin-village-slimes.objectives.defeat-village-slimes.progressLabel',
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
		titleKey: 'content.quests.thin-ruins-slimes.title',
		descriptionKey: 'content.quests.thin-ruins-slimes.description',
		giverNpcId: 'guild-master',
		availableAfterQuestId: 'investigate-the-ruins',
		availableAfterObjectiveId: 'talk-to-guild-master',
		objectives: [
			{
				id: 'defeat-ruins-slimes',
				kind: 'defeat-enemy',
				descriptionKey:
					'content.quests.thin-ruins-slimes.objectives.defeat-ruins-slimes.description',
				progressLabelKey:
					'content.quests.thin-ruins-slimes.objectives.defeat-ruins-slimes.progressLabel',
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
		titleKey: 'content.quests.recover-ruins-relics.title',
		descriptionKey: 'content.quests.recover-ruins-relics.description',
		giverNpcId: 'guild-master',
		availableAfterQuestId: 'investigate-the-ruins',
		availableAfterObjectiveId: 'talk-to-guild-master',
		objectives: [
			{
				id: 'collect-ruins-items',
				kind: 'collect-item',
				descriptionKey:
					'content.quests.recover-ruins-relics.objectives.collect-ruins-items.description',
				progressLabelKey:
					'content.quests.recover-ruins-relics.objectives.collect-ruins-items.progressLabel',
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
} satisfies Record<QuestId, QuestDefinitionSource>;

export const quests = addEnglishQuestText(questDefinitions);

export const questList: QuestDefinition[] = Object.values(quests);

export function getQuest(questId: string): QuestDefinition | undefined {
	return (quests as Record<string, QuestDefinition>)[questId];
}

export function isQuestId(questId: string): questId is QuestId {
	return getQuest(questId) !== undefined;
}

function addEnglishQuestText(
	definitions: Record<QuestId, QuestDefinitionSource>
): Record<QuestId, QuestDefinition> {
	return Object.fromEntries(
		Object.entries(definitions).map(([questId, quest]) => [
			questId,
			{
				...quest,
				title: t('en', quest.titleKey),
				description: t('en', quest.descriptionKey),
				objectives: quest.objectives.map((objective) => ({
					...objective,
					description: t('en', objective.descriptionKey),
					progressLabel: t('en', objective.progressLabelKey)
				}))
			}
		])
	) as Record<QuestId, QuestDefinition>;
}
