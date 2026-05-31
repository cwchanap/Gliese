import {
	getDialogue,
	type DialogueActionDefinition,
	type NpcDialogueDefinition
} from '$lib/game/content/dialogue';
import { getItem } from '$lib/game/content/items';
import { maps } from '$lib/game/content/maps';
import { getQuest, type QuestReward } from '$lib/game/content/quests';
import { getShop } from '$lib/game/content/shops';
import type { Locale } from '$lib/game/i18n/locales';
import { t } from '$lib/game/i18n/translate';

export type LocalizedItemText = {
	name: string;
	description: string;
};

export type LocalizedShopText = {
	name: string;
	merchantName: string;
	description: string;
};

export type LocalizedQuestText = {
	title: string;
	description: string;
};

export type LocalizedQuestObjectiveText = {
	description: string;
	progressLabel: string;
};

export type LocalizedDialogueAction = Omit<DialogueActionDefinition, 'labelKey'> & {
	label: string;
};

export type LocalizedDialogueText = Omit<NpcDialogueDefinition, 'actions'> & {
	actions: LocalizedDialogueAction[];
};

export function getItemText(locale: Locale, itemId: string): LocalizedItemText | null {
	const item = getItem(itemId);
	if (!item) return null;

	return {
		name: t(locale, item.nameKey),
		description: t(locale, item.descriptionKey)
	};
}

export function getShopText(locale: Locale, shopId: string): LocalizedShopText | null {
	const shop = getShop(shopId);
	if (!shop) return null;

	return {
		name: t(locale, shop.nameKey),
		merchantName: t(locale, shop.merchantNameKey),
		description: t(locale, shop.descriptionKey)
	};
}

export function getQuestText(locale: Locale, questId: string): LocalizedQuestText | null {
	const quest = getQuest(questId);
	if (!quest) return null;

	return {
		title: t(locale, quest.titleKey),
		description: t(locale, quest.descriptionKey)
	};
}

export function getQuestObjectiveText(
	locale: Locale,
	questId: string,
	objectiveId: string
): LocalizedQuestObjectiveText | null {
	const objective = getQuest(questId)?.objectives.find((candidate) => candidate.id === objectiveId);
	if (!objective) return null;

	return {
		description: t(locale, objective.descriptionKey),
		progressLabel: t(locale, objective.progressLabelKey)
	};
}

export function getDialogueText(locale: Locale, dialogueId: string): LocalizedDialogueText | null {
	const dialogue = getDialogue(dialogueId);
	if (!dialogue) return null;

	return {
		id: dialogue.id,
		actions: dialogue.actions.map((action) => ({
			id: action.id,
			label: t(locale, action.labelKey),
			intent: action.intent
		}))
	};
}

export function getNpcText(locale: Locale, npcId: string): { name: string } | null {
	for (const map of Object.values(maps)) {
		const npc = (map.npcs ?? []).find((candidate) => candidate.id === npcId);
		if (npc) return { name: t(locale, npc.nameKey) };
	}

	return null;
}

export function getMapLandmarkText(locale: Locale, landmarkId: string): { label: string } | null {
	for (const map of Object.values(maps)) {
		const landmark = (map.landmarks ?? []).find((candidate) => candidate.id === landmarkId);
		if (landmark) return { label: t(locale, landmark.labelKey) };
	}

	return null;
}

export function formatRewardSummary(locale: Locale, reward: QuestReward): string {
	const parts = [
		reward.xp ? t(locale, 'content.rewards.xp', { xp: reward.xp }) : '',
		reward.coins ? t(locale, 'content.rewards.coins', { coins: reward.coins }) : '',
		...(reward.items ?? []).map((item) =>
			t(locale, item.quantity === 1 ? 'content.rewards.oneItem' : 'content.rewards.itemCount', {
				count: item.quantity
			})
		)
	].filter(Boolean);

	return parts.join(t(locale, 'content.rewards.separator'));
}
