import { readable } from 'svelte/store';

import { equipmentSlots, type EquipmentSlot } from '$lib/game/content/items';
import { startingPlayer } from '$lib/game/content/player';
import { buildInitialAreaMapState } from '$lib/game/core/area-map';
import { buildHudQuestState, createInitialQuestState } from '$lib/game/core/quests';
import { getActiveLocale } from '$lib/game/i18n/store';
import { t } from '$lib/game/i18n/translate';
import { loadStoredSaveResult } from '$lib/game/save/storage';
import { emitHudCommand, onHudState, type HudState } from '$lib/game/ui-bridge/events';

const initialSaveResult = loadStoredSaveResult();
const initialLocale = getActiveLocale();
const initialAreaMap = buildInitialAreaMapState(initialLocale);
const initialQuestState =
	initialSaveResult.status === 'loaded'
		? initialSaveResult.saveState.quests
		: createInitialQuestState();
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
	canResume: initialSaveResult.status === 'loaded',
	status: t(initialLocale, 'status.loadingGame'),
	wallet: {
		coins: initialSaveResult.status === 'loaded' ? initialSaveResult.saveState.wallet.coins : 30
	},
	nearbyShop: null,
	shop: null,
	dialogue: null,
	quests: buildHudQuestState({
		state: initialQuestState,
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

export function requestSave() {
	emitHudCommand({ type: 'save' });
}

export function requestResume() {
	emitHudCommand({ type: 'resume-save' });
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
