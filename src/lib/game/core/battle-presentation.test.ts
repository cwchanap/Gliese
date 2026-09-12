import { describe, expect, it } from 'vitest';

import {
	appendBattleFeedEvent,
	battleFeedLimit,
	cancelFleeChannel,
	cycleBattleTarget,
	fleeChannelDurationMs,
	getFleeChannelProgress,
	isFleeChannelComplete,
	selectNearestBattleTarget,
	startFleeChannel,
	sortBattleRibbonEntries,
	type BattleRibbonEntry,
	type BattleTargetUnit
} from './battle-presentation';

function unit(
	unitId: string,
	unitIndex: number,
	x: number,
	y: number,
	defeated = false
): BattleTargetUnit {
	return { unitId, unitIndex, x, y, defeated };
}

describe('battle target helpers', () => {
	it('selects the nearest living enemy and skips defeated units', () => {
		const units = [
			unit('far-defeated', 0, 100, 0, true),
			unit('mid', 1, 60, 0),
			unit('near', 2, 40, 0)
		];

		expect(selectNearestBattleTarget(units, { x: 0, y: 0 })?.unitId).toBe('near');
	});

	it('keeps the earliest input unit when distances tie', () => {
		const units = [unit('first', 0, 50, 0), unit('second', 1, 0, 50)];

		expect(selectNearestBattleTarget(units, { x: 0, y: 0 })?.unitId).toBe('first');
	});

	it('returns null when no living enemy remains', () => {
		const units = [unit('down', 0, 10, 10, true)];

		expect(selectNearestBattleTarget(units, { x: 0, y: 0 })).toBeNull();
		expect(selectNearestBattleTarget([], { x: 0, y: 0 })).toBeNull();
	});

	it('cycles living targets left to right, skipping defeated units and wrapping', () => {
		const units = [
			unit('a', 0, 10, 0),
			unit('b', 1, 20, 0, true),
			unit('c', 2, 30, 0),
			unit('d', 3, 40, 0)
		];
		const origin = { x: 0, y: 0 };

		expect(cycleBattleTarget(units, 'a', 1, origin)?.unitId).toBe('c');
		expect(cycleBattleTarget(units, 'c', 1, origin)?.unitId).toBe('d');
		expect(cycleBattleTarget(units, 'd', 1, origin)?.unitId).toBe('a');
		expect(cycleBattleTarget(units, 'd', -1, origin)?.unitId).toBe('c');
		expect(cycleBattleTarget(units, 'a', -1, origin)?.unitId).toBe('d');
	});

	it('breaks left/right ordering ties by unit index', () => {
		const units = [unit('later', 1, 20, 5), unit('earlier', 0, 20, -5), unit('right', 2, 60, 0)];

		expect(cycleBattleTarget(units, 'earlier', 1, { x: 0, y: 0 })?.unitId).toBe('later');
		expect(cycleBattleTarget(units, 'later', 1, { x: 0, y: 0 })?.unitId).toBe('right');
	});

	it('falls back to the nearest living enemy when the current target is invalid', () => {
		const units = [unit('defeated', 0, 5, 0, true), unit('near', 1, 20, 0), unit('far', 2, 90, 0)];
		const origin = { x: 12, y: 0 };

		expect(cycleBattleTarget(units, 'defeated', 1, origin)?.unitId).toBe('near');
		expect(cycleBattleTarget(units, null, -1, origin)?.unitId).toBe('near');
		expect(cycleBattleTarget(units, 'missing', 1, origin)?.unitId).toBe('near');
	});

	it('returns null without living enemies and repeats a lone living target', () => {
		const allDefeated = [unit('down', 0, 10, 0, true)];
		const lone = [unit('only', 0, 10, 0)];

		expect(cycleBattleTarget(allDefeated, 'down', 1, { x: 0, y: 0 })).toBeNull();
		expect(cycleBattleTarget(lone, 'only', 1, { x: 0, y: 0 })?.unitId).toBe('only');
		expect(cycleBattleTarget(lone, 'only', -1, { x: 0, y: 0 })?.unitId).toBe('only');
	});
});

describe('battle feed', () => {
	it('keeps only the newest four events without mutating the input', () => {
		const feed = ['event-1', 'event-2', 'event-3', 'event-4'];

		expect(battleFeedLimit).toBe(4);
		expect(appendBattleFeedEvent(feed, 'event-5')).toEqual([
			'event-2',
			'event-3',
			'event-4',
			'event-5'
		]);
		expect(feed).toEqual(['event-1', 'event-2', 'event-3', 'event-4']);
		expect(appendBattleFeedEvent([], 'only')).toEqual(['only']);
	});
});

describe('battle readiness ribbon', () => {
	it('sorts render entries by readyAt without changing the simulation order', () => {
		const entries: BattleRibbonEntry[] = [
			{ unitId: 'slow', readyAt: 900 },
			{ unitId: 'fast', readyAt: 100 },
			{ unitId: 'mid-a', readyAt: 500 },
			{ unitId: 'mid-b', readyAt: 500 }
		];

		expect(sortBattleRibbonEntries(entries).map((entry) => entry.unitId)).toEqual([
			'fast',
			'mid-a',
			'mid-b',
			'slow'
		]);
		expect(entries.map((entry) => entry.unitId)).toEqual(['slow', 'fast', 'mid-a', 'mid-b']);
	});
});

describe('flee channel', () => {
	it('defaults to a 2400ms channel and reports clamped progress', () => {
		expect(fleeChannelDurationMs).toBe(2_400);

		const channel = startFleeChannel(1_000);

		expect(channel).toEqual({ status: 'channeling', startedAt: 1_000, durationMs: 2_400 });
		expect(getFleeChannelProgress(channel, 1_000)).toBe(0);
		expect(getFleeChannelProgress(channel, 2_200)).toBeCloseTo(0.5);
		expect(getFleeChannelProgress(channel, 500)).toBe(0);
		expect(getFleeChannelProgress(channel, 5_000)).toBe(1);
	});

	it('completes exactly at the channel duration and honours custom durations', () => {
		const channel = startFleeChannel(1_000);

		expect(isFleeChannelComplete(channel, 3_399)).toBe(false);
		expect(isFleeChannelComplete(channel, 3_400)).toBe(true);

		const short = startFleeChannel(0, 500);

		expect(short).toEqual({ status: 'channeling', startedAt: 0, durationMs: 500 });
		expect(getFleeChannelProgress(short, 250)).toBeCloseTo(0.5);
		expect(isFleeChannelComplete(short, 500)).toBe(true);
	});

	it('cancel returns to idle with zero progress', () => {
		const idle = cancelFleeChannel();

		expect(idle).toEqual({ status: 'idle' });
		expect(getFleeChannelProgress(idle, 9_999)).toBe(0);
		expect(isFleeChannelComplete(idle, 9_999)).toBe(false);
	});
});
