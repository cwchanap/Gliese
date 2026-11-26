/**
 * Joins the Snare, Flank, Loose fight to the field: turns the payload the world
 * hands over into a fight, and a finished fight into the `BattleResult` the
 * world takes back. Pure TypeScript, so both halves are tested without Phaser.
 */
import {
	getBattleEnemyDefinition,
	type BattleOutcome,
	type BattleResult,
	type BattleStartPayload
} from '$lib/game/core/battle';
import { resolveLootDrops } from '$lib/game/core/loot';
import type { SaveState } from '$lib/game/save/save-state';
import type { SnareBattleSetup, SnareBattleState } from '$lib/game/core/snare-battle/battle';
import { snareTuning, type SnareEnemyId } from '$lib/game/core/snare-battle/tuning';

/** Spawn rows are 112 px apart in a 504 px arena, so more than four would not fit. */
export const snareMaxEnemies = 4;

export function isSnareEnemyId(value: string): value is SnareEnemyId {
	return Object.hasOwn(snareTuning.enemies, value);
}

/** The fight a world encounter starts. Throws on an enemy the fight has no profile for. */
export function snareSetupFromPayload(payload: BattleStartPayload): SnareBattleSetup {
	if (!isSnareEnemyId(payload.sourceEnemyId)) {
		throw new Error(`No snare battle profile for enemy "${payload.sourceEnemyId}"`);
	}

	const count = Number.isFinite(payload.enemyCount) ? Math.trunc(payload.enemyCount) : 1;

	return {
		enemyId: payload.sourceEnemyId,
		encounterId: payload.sourceEncounterId,
		count: Math.min(Math.max(count, 1), snareMaxEnemies),
		hero: { ...payload.hero }
	};
}

/** What the world takes back. Only a victory carries the defeated enemies' rewards. */
export function buildSnareBattleResult({
	payload,
	state,
	inventory,
	outcome,
	random = Math.random
}: {
	payload: BattleStartPayload;
	state: SnareBattleState;
	inventory: SaveState['inventory'];
	outcome: BattleOutcome;
	random?: () => number;
}): BattleResult {
	return {
		outcome,
		sourceMapId: payload.sourceMapId,
		sourceEncounterId: payload.sourceEncounterId,
		sourceEnemyId: payload.sourceEnemyId,
		finalHeroHp: state.hero.hp,
		inventory,
		defeatedUnits:
			outcome === 'victory'
				? state.enemies
						.filter((enemy) => enemy.defeated)
						.map((enemy) => {
							const definition = getBattleEnemyDefinition(enemy.enemyId);

							return {
								unitId: enemy.unitId,
								unitIndex: enemy.unitIndex,
								enemyId: enemy.enemyId,
								xpReward: definition.xpReward,
								coinReward: definition.coinReward,
								drops: resolveLootDrops(definition.loot, random)
							};
						})
				: []
	};
}
