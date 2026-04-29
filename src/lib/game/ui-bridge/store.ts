import { readable } from 'svelte/store';

import { startingPlayer } from '$lib/game/content/player';
import { loadStoredSaveResult } from '$lib/game/save/storage';
import {
	emitHudCommand,
	onHudState,
	type HudState
} from '$lib/game/ui-bridge/events';

const initialSaveResult = loadStoredSaveResult();

const initialHudState: HudState = {
	ready: false,
	mapId: 'meadow-entry',
	hp: startingPlayer.baseHp,
	maxHp: startingPlayer.baseHp,
	level: 1,
	xp: 0,
	attack: startingPlayer.baseAttack,
	heals: 1,
	canResume: initialSaveResult.status === 'loaded',
	status: 'Loading game'
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
