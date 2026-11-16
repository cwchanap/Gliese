import { readable } from 'svelte/store';

import { equipmentSlots, type EquipmentSlot } from '$lib/game/content/items';
import { startingPlayer } from '$lib/game/content/player';
import { buildInitialAreaMapState } from '$lib/game/core/area-map';
import { buildHudQuestState, createInitialQuestState } from '$lib/game/core/quests';
import { getActiveLocale } from '$lib/game/i18n/store';
import { t } from '$lib/game/i18n/translate';
import {
	emitHudCommand,
	emitHudState,
	onHudState,
	type HudState
} from '$lib/game/ui-bridge/events';

const emptyEquipped = Object.fromEntries(equipmentSlots.map((slot) => [slot, null])) as Record<
	EquipmentSlot,
	string | null
>;

function createInitialHudState(): HudState {
	const locale = getActiveLocale();
	const areaMap = buildInitialAreaMapState(locale);
	return {
		ready: false,
		mapId: areaMap.mapId,
		areaMap,
		hp: startingPlayer.baseHp,
		maxHp: startingPlayer.baseHp,
		level: 1,
		xp: 0,
		attack: startingPlayer.baseAttack,
		defense: 0,
		heals: 1,
		status: t(locale, 'status.loadingGame'),
		wallet: {
			coins: 20
		},
		heroOccluded: false,
		nearbyShop: null,
		shop: null,
		dialogue: null,
		battle: {
			phase: 'none',
			summary: null,
			active: null
		},
		quests: buildHudQuestState({ state: createInitialQuestState(), locale }),
		inventory: {
			consumables: [],
			equipment: [],
			keyItems: [],
			equipped: { ...emptyEquipped }
		}
	};
}

const initialHudState = createInitialHudState();

export const hudState = readable(initialHudState, (set) => onHudState(set));

/** Clears a finished run's payload (stale `ready`, dialogue, battle) through
 *  the same channel, so a returning Title screen never reads the old scene.
 *  Store subscriptions stay intact. */
export function resetHudState() {
	emitHudState(createInitialHudState());
}

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
