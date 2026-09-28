/**
 * Pure gamepad → UI-action normalization plus the shared prompt-modality
 * state. No DOM polling here: GameShell owns the single rAF loop and routes
 * the emitted actions through the existing focus/bridge seams.
 */
import { writable } from 'svelte/store';
import type { PromptMode } from '$lib/game/i18n/preferences';

export type GamepadUiAction =
	| 'up'
	| 'down'
	| 'left'
	| 'right'
	| 'confirm'
	| 'cancel'
	| 'action'
	| 'tab-left'
	| 'tab-right'
	| 'menu';

export type PromptModality = 'keys' | 'pad';

/** Standard-mapping buttons. D-pad (12–15) mirrors the left stick. */
const BUTTON_ACTIONS: Record<number, GamepadUiAction> = {
	0: 'confirm', // A
	1: 'cancel', // B
	2: 'action', // X
	4: 'tab-left', // LB
	5: 'tab-right', // RB
	9: 'menu', // Start
	12: 'up',
	13: 'down',
	14: 'left',
	15: 'right'
};

const STICK_DEAD_ZONE = 0.5;

export type GamepadSnapshot = {
	buttons: readonly boolean[];
	axes: readonly number[];
} | null;

export function snapshotGamepad(pad: Gamepad | null): GamepadSnapshot {
	if (!pad) return null;
	return {
		buttons: Array.from(pad.buttons, (button) => button.pressed),
		axes: [pad.axes[0] ?? 0, pad.axes[1] ?? 0]
	};
}

/** Actions newly engaged since `previous` — edge-triggered; held inputs stay silent.
 *  D-pad and stick mirror each other, so a same-frame duplicate direction is
 *  emitted once.
 *  @param previous - Snapshot from the prior frame, or `null` when no pad was connected.
 *  @param current - Snapshot from this frame, or `null` when the pad disconnected.
 *  @returns GamepadUiAction[] — deduplicated actions pressed since `previous`. */
export function diffGamepadActions(
	previous: GamepadSnapshot,
	current: GamepadSnapshot
): GamepadUiAction[] {
	if (!current) return [];

	const actions: GamepadUiAction[] = [];
	// Integer-like keys iterate in ascending numeric order: stable output order.
	for (const [index, action] of Object.entries(BUTTON_ACTIONS)) {
		const buttonIndex = Number(index);
		if (current.buttons[buttonIndex] === true && previous?.buttons[buttonIndex] !== true) {
			actions.push(action);
		}
	}

	const pastDeadZone = (axis: number, sign: 1 | -1): boolean => sign * axis > STICK_DEAD_ZONE;
	const [x, y] = current.axes;
	const [previousX, previousY] = previous?.axes ?? [];
	if (pastDeadZone(x, 1) && !pastDeadZone(previousX ?? 0, 1)) actions.push('right');
	if (pastDeadZone(x, -1) && !pastDeadZone(previousX ?? 0, -1)) actions.push('left');
	if (pastDeadZone(y, -1) && !pastDeadZone(previousY ?? 0, -1)) actions.push('up');
	if (pastDeadZone(y, 1) && !pastDeadZone(previousY ?? 0, 1)) actions.push('down');

	return [...new Set(actions)];
}

/** Edge detection across every connected slot: each pad diffs against its own
 *  previous snapshot, then the per-slot action lists merge deduped per frame —
 *  an idle pad in slot 0 must not mask an active one (final review), and two
 *  pads pressing the same button still emit once.
 *  @param previous - Per-slot snapshots from the prior frame.
 *  @param current - Per-slot snapshots from this frame.
 *  @returns GamepadUiAction[] — deduplicated actions pressed on any slot. */
export function diffGamepadSlots(
	previous: readonly GamepadSnapshot[],
	current: readonly GamepadSnapshot[]
): GamepadUiAction[] {
	return [
		...new Set(
			current.flatMap((snapshot, slot) => diffGamepadActions(previous[slot] ?? null, snapshot))
		)
	];
}

/** Prompt glyphs follow the preference; 'auto' mirrors the last real input. */
export function resolvePromptModality(
	promptMode: PromptMode,
	lastModality: PromptModality
): PromptModality {
	return promptMode === 'auto' ? lastModality : promptMode;
}

const modality = writable<PromptModality>('keys');

/** Svelte-readable last real input modality (GameShell writes, glyphs read). */
export const lastInputModality = { subscribe: modality.subscribe };

export function setLastInputModality(value: PromptModality): void {
	modality.set(value);
}
