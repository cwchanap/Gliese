import { readable } from 'svelte/store';

import { equipmentSlots, type EquipmentSlot } from '$lib/game/content/items';
import { startingPlayer } from '$lib/game/content/player';
import { loadStoredSaveResult } from '$lib/game/save/storage';
import { emitHudCommand, onHudState, type HudState } from '$lib/game/ui-bridge/events';

const initialSaveResult = loadStoredSaveResult();
const emptyEquipped = Object.fromEntries(equipmentSlots.map((slot) => [slot, null])) as Record<
	EquipmentSlot,
	string | null
>;

const initialHudState: HudState = {
	ready: false,
	mapId: 'meadow-entry',
	hp: startingPlayer.baseHp,
	maxHp: startingPlayer.baseHp,
	level: 1,
	xp: 0,
	attack: startingPlayer.baseAttack,
	defense: 0,
	heals: 1,
	canResume: initialSaveResult.status === 'loaded',
	status: 'Loading game',
	wallet: {
		coins: initialSaveResult.status === 'loaded' ? initialSaveResult.saveState.wallet.coins : 30
	},
	nearbyShop: null,
	shop: null,
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
