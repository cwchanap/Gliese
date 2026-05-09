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
