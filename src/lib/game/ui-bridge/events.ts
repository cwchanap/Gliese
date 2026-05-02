import type { EquipmentSlot, StatModifiers } from '$lib/game/content/items';

export type HudInventoryStack = {
	itemId: string;
	name: string;
	description: string;
	quantity: number;
};

export type HudEquipmentItem = {
	itemId: string;
	name: string;
	description: string;
	slot: EquipmentSlot;
	equipped: boolean;
	modifiers: StatModifiers;
};

export type HudKeyItem = {
	itemId: string;
	name: string;
	description: string;
	quantity: number;
};

export type HudState = {
	ready: boolean;
	mapId: string;
	hp: number;
	maxHp: number;
	level: number;
	xp: number;
	attack: number;
	defense: number;
	heals: number;
	canResume: boolean;
	status: string;
	inventory: {
		consumables: HudInventoryStack[];
		equipment: HudEquipmentItem[];
		keyItems: HudKeyItem[];
		equipped: Record<EquipmentSlot, string | null>;
	};
};

export type HudCommand =
	| { type: 'heal' }
	| { type: 'resume-save' }
	| { type: 'save' }
	| { type: 'pause-game' }
	| { type: 'resume-game' }
	| { type: 'use-item'; itemId: string }
	| { type: 'equip-item'; itemId: string }
	| { type: 'unequip-slot'; slot: EquipmentSlot };

export const HUD_STATE_EVENT = 'gliese:hud-state';
export const HUD_COMMAND_EVENT = 'gliese:hud-command';

declare global {
	interface WindowEventMap {
		[HUD_STATE_EVENT]: CustomEvent<HudState>;
		[HUD_COMMAND_EVENT]: CustomEvent<HudCommand>;
	}
}

export function emitHudState(state: HudState) {
	getEventTarget()?.dispatchEvent(new CustomEvent(HUD_STATE_EVENT, { detail: state }));
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
