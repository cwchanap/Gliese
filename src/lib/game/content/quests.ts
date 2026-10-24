import type { ItemDefinition } from '$lib/game/content/items';
import { homeBedside } from '$lib/game/content/player';
import type { Direction } from '$lib/game/core/types';
import { t, type MessageKey } from '$lib/game/i18n/translate';

/** The prologue main quests, in play order. Completing one starts the next. */
export const mainQuestIds = [
	'prologue-proving-morning',
	'prologue-trial-tracks',
	'prologue-trial-mistfen',
	'prologue-trial-boar-king',
	'prologue-hunters-name',
	'prologue-raid',
	'prologue-escape'
] as const;

export type QuestId = (typeof mainQuestIds)[number];

/** Story windows that map placements gate on (see `StoryGated` in maps/types.ts). */
export const storyWindows = {
	/** The proving day, from waking up to going to sleep. */
	dayOne: {
		quests: [
			'prologue-proving-morning',
			'prologue-trial-tracks',
			'prologue-trial-mistfen',
			'prologue-trial-boar-king',
			'prologue-hunters-name'
		]
	},
	/** The family dinner and the night after it. */
	evening: {
		objectives: ['share-the-dinner', 'hear-motts-tale', 'walk-lirra-home', 'go-to-sleep']
	},
	/** The raid and the escape that follows: the village is burning. */
	afterRaid: { quests: ['prologue-raid', 'prologue-escape'] }
} as const satisfies Record<
	string,
	{ quests?: readonly QuestId[]; objectives?: readonly string[] }
>;

export type QuestReward = {
	xp?: number;
	coins?: number;
	items?: Array<{ itemId: ItemDefinition['id']; quantity: number }>;
};

/**
 * Presentation that runs once an objective completes (or a quest starts). The
 * world plays effects in order between interactions: a scene is a system
 * dialogue whose prose lives in `story/`, and a move fades the hero to a map
 * position and rests them to full HP (sleeping, entering the tunnel).
 */
export type QuestEffect =
	| { type: 'play-scene'; sceneId: string }
	| { type: 'move-player'; mapId: string; x: number; y: number; facing: Direction };

type ObjectiveBase = {
	id: string;
	descriptionKey: MessageKey;
	progressLabelKey: MessageKey;
	description: string;
	progressLabel: string;
	target: number;
	reward?: QuestReward;
	onComplete?: QuestEffect[];
};

/** Talk to every listed NPC placement (by dialogue id), in any order. */
export type TalkToNpcObjective = ObjectiveBase & { kind: 'talk-to-npc'; npcIds: string[] };

/** Defeat `target` enemy units of one kind on the listed maps. */
export type DefeatEnemyObjective = ObjectiveBase & {
	kind: 'defeat-enemy';
	enemyId: string;
	mapIds: string[];
};

export type CollectItemObjective = ObjectiveBase & {
	kind: 'collect-item';
	sources: Array<{ mapId: string; pickupId: string; itemId: ItemDefinition['id'] }>;
};

/** Examine every listed map discovery, in any order. */
export type InspectObjective = ObjectiveBase & { kind: 'inspect'; discoveryIds: string[] };

/** A scripted battle that completes when the hero falls to this enemy. */
export type LoseBattleObjective = ObjectiveBase & { kind: 'lose-battle'; enemyId: string };

export type QuestObjective =
	| TalkToNpcObjective
	| DefeatEnemyObjective
	| CollectItemObjective
	| InspectObjective
	| LoseBattleObjective;

export type QuestDefinition = {
	id: QuestId;
	titleKey: MessageKey;
	descriptionKey: MessageKey;
	title: string;
	description: string;
	objectives: QuestObjective[];
	reward: QuestReward;
	onStart?: QuestEffect[];
};

// Talk and inspect targets derive from their id lists; lose-battle is always 1.
type ObjectiveSource<T extends QuestObjective> = T extends { kind: 'defeat-enemy' | 'collect-item' }
	? Omit<T, 'description' | 'progressLabel' | 'descriptionKey' | 'progressLabelKey'>
	: Omit<T, 'description' | 'progressLabel' | 'descriptionKey' | 'progressLabelKey' | 'target'>;

type QuestObjectiveSource =
	| ObjectiveSource<TalkToNpcObjective>
	| ObjectiveSource<DefeatEnemyObjective>
	| ObjectiveSource<CollectItemObjective>
	| ObjectiveSource<InspectObjective>
	| ObjectiveSource<LoseBattleObjective>;

type QuestDefinitionSource = Omit<
	QuestDefinition,
	'title' | 'description' | 'titleKey' | 'descriptionKey' | 'objectives'
> & {
	objectives: QuestObjectiveSource[];
};

const scene = (sceneId: string): QuestEffect => ({ type: 'play-scene', sceneId });

const questDefinitions: Record<QuestId, QuestDefinitionSource> = {
	'prologue-proving-morning': {
		id: 'prologue-proving-morning',
		onStart: [scene('prologue.opening')],
		objectives: [
			{
				id: 'talk-to-mott',
				kind: 'talk-to-npc',
				npcIds: ['mott-hearth'],
				reward: { items: [{ itemId: 'ancestral-amulet', quantity: 1 }] }
			},
			{
				id: 'collect-practice-spear',
				kind: 'talk-to-npc',
				npcIds: ['oren'],
				reward: { items: [{ itemId: 'practice-spear', quantity: 1 }] }
			},
			{
				id: 'collect-herb-pouch',
				kind: 'talk-to-npc',
				npcIds: ['mira'],
				reward: { items: [{ itemId: 'field-potion', quantity: 3 }] }
			},
			{ id: 'report-to-borak', kind: 'talk-to-npc', npcIds: ['borak'] }
		],
		reward: { coins: 10 }
	},
	'prologue-trial-tracks': {
		id: 'prologue-trial-tracks',
		objectives: [
			{ id: 'meet-lirra-forest', kind: 'talk-to-npc', npcIds: ['lirra-forest'] },
			{
				id: 'read-boar-signs',
				kind: 'inspect',
				discoveryIds: ['boar-sign-hoofprints', 'boar-sign-sapling', 'boar-sign-tusk-scrape']
			},
			{
				id: 'defeat-thornback-boar',
				kind: 'defeat-enemy',
				target: 1,
				enemyId: 'thornback-boar',
				mapIds: ['meadow-entry'],
				onComplete: [scene('prologue.sun-arrow')]
			},
			{ id: 'report-first-trial', kind: 'talk-to-npc', npcIds: ['borak'] }
		],
		reward: { xp: 4, coins: 15 }
	},
	'prologue-trial-mistfen': {
		id: 'prologue-trial-mistfen',
		objectives: [
			{ id: 'ask-mira-about-stores', kind: 'talk-to-npc', npcIds: ['mira'] },
			{ id: 'meet-lirra-mistfen', kind: 'talk-to-npc', npcIds: ['lirra-mistfen'] },
			{
				id: 'gather-moonmoss',
				kind: 'collect-item',
				target: 4,
				sources: [1, 2, 3, 4].map((index) => ({
					mapId: 'meadow-entry',
					pickupId: `mistfen-moonmoss-${index}`,
					itemId: 'moonmoss'
				}))
			},
			{ id: 'rest-at-the-pond', kind: 'inspect', discoveryIds: ['mistfen-pond-rest'] },
			{ id: 'deliver-moonmoss', kind: 'talk-to-npc', npcIds: ['mira'] }
		],
		reward: { xp: 6, coins: 20 }
	},
	'prologue-trial-boar-king': {
		id: 'prologue-trial-boar-king',
		objectives: [
			{ id: 'meet-drogg-crossroads', kind: 'talk-to-npc', npcIds: ['drogg-crossroads'] },
			{ id: 'track-the-boar-king', kind: 'inspect', discoveryIds: ['boar-king-trail'] },
			{ id: 'talk-to-drogg-falls', kind: 'talk-to-npc', npcIds: ['drogg-falls'] },
			{
				id: 'defeat-boar-king',
				kind: 'defeat-enemy',
				target: 1,
				enemyId: 'boar-king',
				mapIds: ['meadow-entry'],
				onComplete: [
					scene('prologue.boar-king-felled'),
					// Drogg carries the boar home: fade to Borak's desk in the lodge.
					{ type: 'move-player', mapId: 'guild-hall', x: 800, y: 200, facing: 'up' }
				]
			}
		],
		reward: { xp: 10 }
	},
	'prologue-hunters-name': {
		id: 'prologue-hunters-name',
		objectives: [
			{
				id: 'report-boar-king',
				kind: 'talk-to-npc',
				npcIds: ['borak'],
				reward: { coins: 60, items: [{ itemId: 'hunters-knife', quantity: 1 }] }
			},
			{
				id: 'share-the-dinner',
				kind: 'talk-to-npc',
				npcIds: ['tikka-home', 'drogg-home', 'borak-home']
			},
			{ id: 'hear-motts-tale', kind: 'talk-to-npc', npcIds: ['mott-hearth'] },
			{
				id: 'walk-lirra-home',
				kind: 'talk-to-npc',
				npcIds: ['lirra-herb-hut'],
				reward: { items: [{ itemId: 'sun-stamped-arrow', quantity: 1 }] }
			},
			{
				id: 'go-to-sleep',
				kind: 'inspect',
				discoveryIds: ['grik-bed'],
				onComplete: [scene('prologue.nightfall'), { type: 'move-player', ...homeBedside }]
			}
		],
		reward: {}
	},
	'prologue-raid': {
		id: 'prologue-raid',
		onStart: [scene('prologue.raid-wakes')],
		objectives: [
			{ id: 'heed-mott', kind: 'talk-to-npc', npcIds: ['mott-hearth'] },
			{
				id: 'repel-the-soldiers',
				kind: 'defeat-enemy',
				target: 6,
				enemyId: 'human-soldier',
				mapIds: ['meadow-entry']
			},
			{ id: 'reach-the-gate', kind: 'talk-to-npc', npcIds: ['borak-gate'] },
			{ id: 'find-drogg', kind: 'talk-to-npc', npcIds: ['drogg-well'] },
			{
				id: 'charge-the-captain',
				kind: 'lose-battle',
				enemyId: 'sun-crest-captain',
				onComplete: [scene('prologue.captain-sneers')]
			}
		],
		reward: {}
	},
	'prologue-escape': {
		id: 'prologue-escape',
		objectives: [
			{
				id: 'wake-in-the-shrine',
				kind: 'talk-to-npc',
				npcIds: ['mott-shrine'],
				onComplete: [
					scene('prologue.tunnel-seals'),
					// The tunnel collapses behind Grik: he comes to at its far end.
					{ type: 'move-player', mapId: 'ruins-core', x: 5_376, y: 3_200, facing: 'left' }
				]
			},
			{
				id: 'climb-to-the-ridge',
				kind: 'inspect',
				discoveryIds: ['ridge-overlook'],
				onComplete: [scene('prologue.the-vow'), scene('prologue.chapter-one')]
			}
		],
		reward: {}
	}
};

export const quests = addEnglishQuestText(questDefinitions);

export const questList: QuestDefinition[] = mainQuestIds.map((questId) => quests[questId]);

export function getQuest(questId: string): QuestDefinition | undefined {
	return (quests as Record<string, QuestDefinition>)[questId];
}

export function isQuestId(questId: string): questId is QuestId {
	return getQuest(questId) !== undefined;
}

/** Every scene id quest content plays; story_check requires each to exist. */
export function collectQuestSceneIds(
	definitions: readonly QuestDefinition[] = questList
): string[] {
	return definitions.flatMap((quest) =>
		[
			...(quest.onStart ?? []),
			...quest.objectives.flatMap((objective) => objective.onComplete ?? [])
		]
			.filter((effect) => effect.type === 'play-scene')
			.map((effect) => effect.sceneId)
	);
}

function objectiveTarget(objective: QuestObjectiveSource): number {
	switch (objective.kind) {
		case 'talk-to-npc':
			return objective.npcIds.length;
		case 'inspect':
			return objective.discoveryIds.length;
		case 'lose-battle':
			return 1;
		default:
			return objective.target;
	}
}

function addEnglishQuestText(
	definitions: Record<QuestId, QuestDefinitionSource>
): Record<QuestId, QuestDefinition> {
	return Object.fromEntries(
		Object.entries(definitions).map(([questId, quest]) => {
			const titleKey = `content.quests.${questId}.title` as MessageKey;
			const descriptionKey = `content.quests.${questId}.description` as MessageKey;
			return [
				questId,
				{
					...quest,
					titleKey,
					descriptionKey,
					title: t('en', titleKey),
					description: t('en', descriptionKey),
					objectives: quest.objectives.map((objective) => {
						const prefix = `content.quests.${questId}.objectives.${objective.id}`;
						const objectiveDescriptionKey = `${prefix}.description` as MessageKey;
						const progressLabelKey = `${prefix}.progressLabel` as MessageKey;
						return {
							...objective,
							target: objectiveTarget(objective),
							descriptionKey: objectiveDescriptionKey,
							progressLabelKey,
							description: t('en', objectiveDescriptionKey),
							progressLabel: t('en', progressLabelKey)
						};
					})
				}
			];
		})
	) as Record<QuestId, QuestDefinition>;
}
