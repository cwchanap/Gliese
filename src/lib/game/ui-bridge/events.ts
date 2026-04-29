export type HudState = {
	ready: boolean;
	mapId: string;
	hp: number;
	maxHp: number;
	level: number;
	xp: number;
	attack: number;
	heals: number;
	canResume: boolean;
	status: string;
};

export type HudCommand = 'heal' | 'resume' | 'save';

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
