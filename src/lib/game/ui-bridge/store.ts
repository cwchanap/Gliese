import { readable } from 'svelte/store';

import { startingPlayer } from '$lib/game/content/player';
import { loadStoredSaveState } from '$lib/game/save/storage';
import {
	emitHudCommand,
	onHudState,
	type HudState
} from '$lib/game/ui-bridge/events';

const initialHudState: HudState = {
	mapId: 'meadow-entry',
	hp: startingPlayer.baseHp,
	maxHp: startingPlayer.baseHp,
	level: 1,
	xp: 0,
	attack: startingPlayer.baseAttack,
	heals: 1,
	canResume: Boolean(loadStoredSaveState()),
	status: 'New run'
};

export const hudState = readable(initialHudState, (set) => onHudState(set));

export function requestSave() {
	emitHudCommand('save');
}

export function requestResume() {
	emitHudCommand('resume');
}

export function requestHeal() {
	emitHudCommand('heal');
}
