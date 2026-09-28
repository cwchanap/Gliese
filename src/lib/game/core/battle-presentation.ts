/**
 * Pure battle presentation contracts: target selection, readiness ribbon,
 * bounded combat feed, and the deterministic flee channel.
 * No Phaser, no DOM — consumed by BattleScene (Task 10).
 */

export type BattleTargetUnit = {
	unitId: string;
	unitIndex: number;
	x: number;
	y: number;
	defeated: boolean;
};

export type BattleOrigin = { x: number; y: number };

export const battleFeedLimit = 4;

export const fleeChannelDurationMs = 2_400;

export type FleeChannelState =
	| { status: 'idle' }
	| { status: 'channeling'; startedAt: number; durationMs: number };

export type BattleRibbonEntry = {
	unitId: string;
	readyAt: number;
};

export function selectNearestBattleTarget<T extends BattleTargetUnit>(
	units: readonly T[],
	origin: BattleOrigin
): T | null {
	let nearest: T | null = null;
	let nearestDistance = Number.POSITIVE_INFINITY;

	for (const unit of units) {
		if (unit.defeated) {
			continue;
		}

		const distance = (unit.x - origin.x) ** 2 + (unit.y - origin.y) ** 2;

		if (distance < nearestDistance) {
			nearest = unit;
			nearestDistance = distance;
		}
	}

	return nearest;
}

/**
 * Returns the living neighbor of `currentUnitId` in left-to-right order,
 * skipping defeated units and wrapping at the ends. Invalid or defeated
 * current targets fall back to the nearest living enemy.
 */
export function cycleBattleTarget<T extends BattleTargetUnit>(
	units: readonly T[],
	currentUnitId: string | null,
	direction: -1 | 1,
	origin: BattleOrigin
): T | null {
	const living = units
		.filter((unit) => !unit.defeated)
		.sort((left, right) => left.x - right.x || left.unitIndex - right.unitIndex);

	if (living.length === 0) {
		return null;
	}

	const currentIndex = currentUnitId
		? living.findIndex((unit) => unit.unitId === currentUnitId)
		: -1;

	if (currentIndex === -1) {
		return selectNearestBattleTarget(units, origin);
	}

	return living[(currentIndex + direction + living.length) % living.length]!;
}

/**
 * Returns the living unit matching `unitId`, or `null` when the id is
 * unknown or already defeated — used by direct (pointer) target selection.
 */
export function selectBattleTarget<T extends BattleTargetUnit>(
	units: readonly T[],
	unitId: string
): T | null {
	return units.find((unit) => unit.unitId === unitId && !unit.defeated) ?? null;
}

export function appendBattleFeedEvent<T>(feed: readonly T[], event: T): T[] {
	return [...feed, event].slice(-battleFeedLimit);
}

export function sortBattleRibbonEntries<T extends BattleRibbonEntry>(entries: readonly T[]): T[] {
	return [...entries].sort((left, right) => left.readyAt - right.readyAt);
}

export function startFleeChannel(
	startedAt: number,
	durationMs: number = fleeChannelDurationMs
): FleeChannelState {
	return { status: 'channeling', startedAt, durationMs };
}

export function cancelFleeChannel(): FleeChannelState {
	return { status: 'idle' };
}

export function getFleeChannelProgress(state: FleeChannelState, now: number): number {
	if (state.status !== 'channeling') {
		return 0;
	}

	return Math.min(Math.max((now - state.startedAt) / state.durationMs, 0), 1);
}

export function isFleeChannelComplete(state: FleeChannelState, now: number): boolean {
	return state.status === 'channeling' && now - state.startedAt >= state.durationMs;
}
