import { readable } from 'svelte/store';

import { equipmentSlots, type EquipmentSlot } from '$lib/game/content/items';
import { startingPlayer } from '$lib/game/content/player';
import { buildInitialAreaMapState } from '$lib/game/core/area-map';
import { buildHudQuestState, createInitialQuestState } from '$lib/game/core/quests';
import { getActiveLocale } from '$lib/game/i18n/store';
import { t } from '$lib/game/i18n/translate';
import { emitHudCommand, onHudState, type HudState } from '$lib/game/ui-bridge/events';

const initialLocale = getActiveLocale();
const initialAreaMap = buildInitialAreaMapState(initialLocale);
const emptyEquipped = Object.fromEntries(equipmentSlots.map((slot) => [slot, null])) as Record<
	EquipmentSlot,
	string | null
>;

const initialHudState: HudState = {
	ready: false,
	mapId: initialAreaMap.mapId,
	areaMap: initialAreaMap,
	hp: startingPlayer.baseHp,
	maxHp: startingPlayer.baseHp,
	level: 1,
	xp: 0,
	attack: startingPlayer.baseAttack,
	defense: 0,
	heals: 1,
	status: t(initialLocale, 'status.loadingGame'),
	wallet: {
		coins: 30
	},
	nearbyShop: null,
	shop: null,
	dialogue: null,
	battle: {
		phase: 'none',
		summary: null,
		active: null
	},
	quests: buildHudQuestState({
		state: createInitialQuestState(),
		nearbyQuestGiverId: null,
		locale: initialLocale
	}),
	inventory: {
		consumables: [],
		equipment: [],
		keyItems: [],
		equipped: emptyEquipped
	}
};

export const hudState = readable(initialHudState, (set) => onHudState(set));

export function requestSaveSlot(slot: 1 | 2) {
	emitHudCommand({ type: 'save-slot', slot });
}

export function requestHeal() {
	emitHudCommand({ type: 'heal' });
}

export function requestPauseGame() {
	emitHudCommand({ type: 'pause-game' });
}

export function requestResumeGame() {
	emitHudCommand({ type: 'resume-game' });
}

export function requestUseItem(itemId: string) {
	emitHudCommand({ type: 'use-item', itemId });
}

export function requestEquipItem(itemId: string) {
	emitHudCommand({ type: 'equip-item', itemId });
}

export function requestUnequipSlot(slot: EquipmentSlot) {
	emitHudCommand({ type: 'unequip-slot', slot });
}

export function requestOpenShop(shopId: string) {
	emitHudCommand({ type: 'open-shop', shopId });
}

export function requestCloseShop() {
	emitHudCommand({ type: 'close-shop' });
}

export function requestBuyShopItem(shopId: string, stockId: string) {
	emitHudCommand({ type: 'buy-shop-item', shopId, stockId });
}

export function requestSellInventoryItem(itemId: string) {
	emitHudCommand({ type: 'sell-inventory-item', itemId });
}

export function requestAcceptQuest(questId: string) {
	emitHudCommand({ type: 'accept-quest', questId });
}

export function requestDialogueAdvance() {
	emitHudCommand({ type: 'dialogue-advance' });
}

export function requestDialogueClose() {
	emitHudCommand({ type: 'dialogue-close' });
}

export function requestDialogueChoice(choiceId: string) {
	emitHudCommand({ type: 'dialogue-choose', choiceId });
}

export function requestDismissBattleSummary() {
	emitHudCommand({ type: 'dismiss-battle-summary' });
}

export function requestBattleCycleTarget(direction: -1 | 1) {
	emitHudCommand({ type: 'battle-cycle-target', direction });
}

export function requestBattleSelectTarget(unitId: string) {
	emitHudCommand({ type: 'battle-select-target', unitId });
}

export function requestBattleFlee() {
	emitHudCommand({ type: 'battle-flee' });
}
