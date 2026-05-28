import type { EquipmentSlot, StatModifiers } from '$lib/game/content/items';
import type { HudAreaMapState } from '$lib/game/core/area-map';
import type { HudQuestState } from '$lib/game/core/quests';
import type { HudShopBuyEntry, HudShopSellEntry } from '$lib/game/core/shop';

export type HudInventoryStack = {
	itemId: string;
	name: string;
	description: string;
	iconPath: string;
	quantity: number;
};

export type HudEquipmentItem = {
	itemId: string;
	name: string;
	description: string;
	iconPath: string;
	slot: EquipmentSlot;
	equipped: boolean;
	modifiers: StatModifiers;
};

export type HudKeyItem = {
	itemId: string;
	name: string;
	description: string;
	iconPath: string;
	quantity: number;
};

export type HudNearbyShop = {
	shopId: string;
	name: string;
	merchantName: string;
};

export type HudOpenShop = HudNearbyShop & {
	buy: HudShopBuyEntry[];
	sell: HudShopSellEntry[];
};

export type HudDialogueChoice = {
	id: string;
	label: string;
};

export type HudDialogueState = {
	id: string;
	speaker: string;
	line: string;
	lineIndex: number;
	lineCount: number;
	mode: 'conversation' | 'choice' | 'system';
	choices: HudDialogueChoice[];
	canClose: boolean;
};

export type HudBattleSummaryDrop = {
	itemId: string;
	name: string;
	quantity: number;
};

export type HudBattleSummaryQuestReward = {
	title: string;
	rewardSummary: string;
};

export type HudBattleSummaryQuestProgress = {
	questId: string;
	title: string;
	progressLabel: string;
	previousProgress: number;
	currentProgress: number;
	target: number;
};

export type HudBattleSummary = {
	outcome: 'victory' | 'defeat';
	enemiesDefeated: number;
	xpGained: number;
	coinsGained: number;
	drops: HudBattleSummaryDrop[];
	leveledUp: boolean;
	completedQuestTitles: string[];
	questRewards: HudBattleSummaryQuestReward[];
	questProgress: HudBattleSummaryQuestProgress[];
};

export type HudBattleState = {
	phase: 'none' | 'active' | 'summary';
	summary: HudBattleSummary | null;
};

export type HudState = {
	ready: boolean;
	mapId: string;
	areaMap: HudAreaMapState;
	hp: number;
	maxHp: number;
	level: number;
	xp: number;
	attack: number;
	defense: number;
	heals: number;
	canResume: boolean;
	status: string;
	wallet: { coins: number };
	nearbyShop: HudNearbyShop | null;
	shop: HudOpenShop | null;
	dialogue: HudDialogueState | null;
	battle: HudBattleState;
	quests: HudQuestState;
	inventory: {
		consumables: HudInventoryStack[];
		equipment: HudEquipmentItem[];
		keyItems: HudKeyItem[];
		equipped: Record<EquipmentSlot, string | null>;
	};
};

export type HudStatePayload = Omit<HudState, 'dialogue'> & {
	dialogue?: HudDialogueState | null;
};

export type HudCommand =
	| { type: 'heal' }
	| { type: 'resume-save' }
	| { type: 'save' }
	| { type: 'pause-game' }
	| { type: 'resume-game' }
	| { type: 'use-item'; itemId: string }
	| { type: 'equip-item'; itemId: string }
	| { type: 'unequip-slot'; slot: EquipmentSlot }
	| { type: 'open-shop'; shopId: string }
	| { type: 'close-shop' }
	| { type: 'buy-shop-item'; shopId: string; stockId: string }
	| { type: 'sell-inventory-item'; itemId: string }
	| { type: 'accept-quest'; questId: string }
	| { type: 'dialogue-advance' }
	| { type: 'dialogue-close' }
	| { type: 'dialogue-choose'; choiceId: string }
	| { type: 'dismiss-battle-summary' };

export const HUD_STATE_EVENT = 'gliese:hud-state';
export const HUD_COMMAND_EVENT = 'gliese:hud-command';

declare global {
	interface WindowEventMap {
		[HUD_STATE_EVENT]: CustomEvent<HudState>;
		[HUD_COMMAND_EVENT]: CustomEvent<HudCommand>;
	}
}

export function emitHudState(state: HudStatePayload) {
	const detail: HudState = {
		...state,
		dialogue: state.dialogue ?? null
	};
	getEventTarget()?.dispatchEvent(new CustomEvent(HUD_STATE_EVENT, { detail }));
}

export function emitHudCommand(command: HudCommand) {
	getEventTarget()?.dispatchEvent(new CustomEvent(HUD_COMMAND_EVENT, { detail: command }));
}

export function onHudState(listener: (state: HudState) => void) {
	const handleEvent = (event: WindowEventMap[typeof HUD_STATE_EVENT]) => listener(event.detail);
	const target = getEventTarget();
	target?.addEventListener(HUD_STATE_EVENT, handleEvent);
	return () => target?.removeEventListener(HUD_STATE_EVENT, handleEvent);
}

export function onHudCommand(listener: (command: HudCommand) => void) {
	const handleEvent = (event: WindowEventMap[typeof HUD_COMMAND_EVENT]) => listener(event.detail);
	const target = getEventTarget();
	target?.addEventListener(HUD_COMMAND_EVENT, handleEvent);
	return () => target?.removeEventListener(HUD_COMMAND_EVENT, handleEvent);
}

function getEventTarget() {
	return typeof window === 'undefined' ? undefined : window;
}
