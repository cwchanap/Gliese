import { describe, expect, it } from 'vitest';

import {
	diffGamepadActions,
	lastInputModality,
	resolvePromptModality,
	setLastInputModality,
	snapshotGamepad,
	type GamepadSnapshot
} from './gamepad';

function padFrom({
	buttons = {},
	axes = [0, 0]
}: { buttons?: Record<number, boolean>; axes?: number[] } = {}): GamepadSnapshot {
	return snapshotGamepad({
		buttons: Array.from({ length: 17 }, (_, index) => ({ pressed: buttons[index] === true })),
		axes
	} as unknown as Gamepad);
}

const NONE: GamepadSnapshot = padFrom();

describe('diffGamepadActions', () => {
	it('emits a direction on D-pad press edge only', () => {
		expect(diffGamepadActions(NONE, padFrom({ buttons: { 12: true } }))).toEqual(['up']);

		// Held: silent.
		expect(
			diffGamepadActions(padFrom({ buttons: { 12: true } }), padFrom({ buttons: { 12: true } }))
		).toEqual([]);

		// Release: silent.
		expect(diffGamepadActions(padFrom({ buttons: { 12: true } }), NONE)).toEqual([]);
	});

	it('maps all four D-pad buttons', () => {
		expect(diffGamepadActions(NONE, padFrom({ buttons: { 12: true } }))).toEqual(['up']);
		expect(diffGamepadActions(NONE, padFrom({ buttons: { 13: true } }))).toEqual(['down']);
		expect(diffGamepadActions(NONE, padFrom({ buttons: { 14: true } }))).toEqual(['left']);
		expect(diffGamepadActions(NONE, padFrom({ buttons: { 15: true } }))).toEqual(['right']);
	});

	it('dead-zones the left stick and edge-triggers direction crossings', () => {
		expect(diffGamepadActions(NONE, padFrom({ axes: [0.49, 0] }))).toEqual([]);
		expect(diffGamepadActions(NONE, padFrom({ axes: [0.8, 0] }))).toEqual(['right']);
		expect(diffGamepadActions(padFrom({ axes: [0.8, 0] }), padFrom({ axes: [0.8, 0] }))).toEqual(
			[]
		);
		expect(diffGamepadActions(NONE, padFrom({ axes: [-0.8, 0] }))).toEqual(['left']);
		expect(diffGamepadActions(NONE, padFrom({ axes: [0, -0.8] }))).toEqual(['up']);
		expect(diffGamepadActions(NONE, padFrom({ axes: [0, 0.8] }))).toEqual(['down']);
		expect(diffGamepadActions(padFrom({ axes: [0, 0.8] }), NONE)).toEqual([]);
	});

	it('dedupes a same-frame D-pad + stick direction into one emit', () => {
		expect(diffGamepadActions(NONE, padFrom({ buttons: { 15: true }, axes: [0.8, 0] }))).toEqual([
			'right'
		]);
	});

	it('maps face, shoulder, and menu buttons', () => {
		expect(diffGamepadActions(NONE, padFrom({ buttons: { 0: true } }))).toEqual(['confirm']);
		expect(diffGamepadActions(NONE, padFrom({ buttons: { 1: true } }))).toEqual(['cancel']);
		expect(diffGamepadActions(NONE, padFrom({ buttons: { 2: true } }))).toEqual(['action']);
		expect(diffGamepadActions(NONE, padFrom({ buttons: { 4: true } }))).toEqual(['tab-left']);
		expect(diffGamepadActions(NONE, padFrom({ buttons: { 5: true } }))).toEqual(['tab-right']);
		expect(diffGamepadActions(NONE, padFrom({ buttons: { 9: true } }))).toEqual(['menu']);
	});

	it('emits simultaneous presses in stable button order', () => {
		expect(diffGamepadActions(NONE, padFrom({ buttons: { 0: true, 4: true } }))).toEqual([
			'confirm',
			'tab-left'
		]);
	});

	it('treats a disconnected pad as no actions', () => {
		expect(diffGamepadActions(NONE, null)).toEqual([]);
		expect(diffGamepadActions(null, null)).toEqual([]);
	});
});

describe('resolvePromptModality', () => {
	it('mirrors the last modality in auto mode', () => {
		expect(resolvePromptModality('auto', 'keys')).toBe('keys');
		expect(resolvePromptModality('auto', 'pad')).toBe('pad');
	});

	it('honors a forced mode over the last modality', () => {
		expect(resolvePromptModality('pad', 'keys')).toBe('pad');
		expect(resolvePromptModality('keys', 'pad')).toBe('keys');
	});
});

describe('lastInputModality store', () => {
	it('defaults to keys and follows writes', () => {
		let observed: 'keys' | 'pad' | undefined;
		const unsubscribe = lastInputModality.subscribe((value) => (observed = value));
		expect(observed).toBe('keys');

		setLastInputModality('pad');
		expect(observed).toBe('pad');

		setLastInputModality('keys');
		unsubscribe();
	});
});
