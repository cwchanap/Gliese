import { describe, expect, it } from 'vitest';

import { enemies, enemyList } from '$lib/game/content/enemies';
import {
	applyBattleResultToSaveState,
	battleEnemyCountRange,
	buildBattleUnitId,
	type BattleStartPayload
} from '$lib/game/core/battle';
import { startFleeChannel } from '$lib/game/core/battle-presentation';
import { resolveLootDrops } from '$lib/game/core/loot';
import {
	createSnareBattle,
	stepSnareBattle,
	type SnareBattleState,
	type SnareEvent
} from '$lib/game/core/snare-battle/battle';
import {
	buildSnareBattleResult,
	isSnareEnemyId,
	snareSetupFromPayload,
	stepSnareFrame
} from '$lib/game/core/snare-battle/encounter';
import { snareTuning } from '$lib/game/core/snare-battle/tuning';
import { createNewSaveState } from '$lib/game/save/save-state';

function payloadFor(overrides: Partial<BattleStartPayload> = {}): BattleStartPayload {
	return {
		saveState: createNewSaveState(),
		sourceMapId: 'overworld',
		sourceEncounterId: 'wildwood-wolves-mouth',
		sourceEnemyId: 'forest-wolf',
		enemyCount: 2,
		hero: { hp: 24, maxHp: 24, attack: 4, defense: 0 },
		...overrides
	};
}

/** Parks every enemy: no walking, turning or attacking until released. */
function park(state: SnareBattleState) {
	for (const enemy of state.enemies) {
		enemy.stunnedUntil = Number.POSITIVE_INFINITY;
		for (const name of Object.keys(enemy.readyAt) as Array<keyof typeof enemy.readyAt>) {
			enemy.readyAt[name] = Number.POSITIVE_INFINITY;
		}
	}
}

function runUntil(state: SnareBattleState, done: (event: SnareEvent) => boolean) {
	for (let step = 0; step < 2_000 && !state.outcome; step += 1) {
		const events = stepSnareBattle(state, { move: { x: 0, y: 0 } }, 16);
		const hit = events.find(done);
		if (hit) return hit;
	}
	throw new Error('the event never came');
}

describe('snare encounter: setup', () => {
	it('has a fight profile for every enemy in the game', () => {
		for (const enemy of enemyList) {
			expect(isSnareEnemyId(enemy.id), enemy.id).toBe(true);
			expect(snareTuning.enemies[enemy.id as keyof typeof snareTuning.enemies].hp).toBeGreaterThan(
				0
			);
		}
	});

	it('does not take inherited object keys for an enemy', () => {
		expect(isSnareEnemyId('toString')).toBe(false);
		expect(isSnareEnemyId('not-an-enemy')).toBe(false);
	});

	it('builds the fight from the payload: enemy, count and the hero it carries', () => {
		const setup = snareSetupFromPayload(
			payloadFor({ hero: { hp: 9, maxHp: 30, attack: 6, defense: 2 } })
		);

		expect(setup).toEqual({
			enemyId: 'forest-wolf',
			encounterId: 'wildwood-wolves-mouth',
			count: 2,
			hero: { hp: 9, maxHp: 30, attack: 6, defense: 2 }
		});
	});

	it('keeps the enemy count between 1 and what the arena fits', () => {
		const countOf = (enemyCount: number) => snareSetupFromPayload(payloadFor({ enemyCount })).count;

		expect(countOf(0)).toBe(1);
		expect(countOf(Number.NaN)).toBe(1);
		expect(countOf(2.9)).toBe(2);
		expect(countOf(10)).toBe(battleEnemyCountRange.max);
	});

	it('throws on an enemy that has no fight profile', () => {
		expect(() => snareSetupFromPayload(payloadFor({ sourceEnemyId: 'ghost' }))).toThrow(/ghost/);
	});

	it('starts the fight at the hero HP the world sent', () => {
		const state = createSnareBattle(
			snareSetupFromPayload(payloadFor({ hero: { hp: 9, maxHp: 30, attack: 6, defense: 2 } }))
		);

		expect(state.hero).toMatchObject({ hp: 9, maxHp: 30, attack: 6, defense: 2 });
		expect(state.enemies.map((enemy) => enemy.unitId)).toEqual([
			'wildwood-wolves-mouth:unit:0',
			'wildwood-wolves-mouth:unit:1'
		]);
	});
});

describe('snare encounter: the hero’s defense', () => {
	function lungeAt(defense: number) {
		const payload = payloadFor({
			sourceEnemyId: 'forest-wolf',
			enemyCount: 1,
			hero: { hp: 24, maxHp: 24, attack: 4, defense }
		});
		const state = createSnareBattle(snareSetupFromPayload(payload));
		const wolf = state.enemies[0]!;
		state.hero.x = 450;
		state.hero.y = 250;
		state.line.points = [{ x: 450, y: 250 }];
		Object.assign(wolf, { x: 360, y: 250, facing: 1 });
		park(state);
		wolf.stunnedUntil = 0;
		wolf.readyAt.lunge = 0;

		return runUntil(state, (event) => event.type === 'hero-hit');
	}

	it('takes its defense off each hit', () => {
		expect(lungeAt(0)).toMatchObject({ damage: 4 });
		expect(lungeAt(3)).toMatchObject({ damage: 1 });
	});

	it('never lets a hit fall below 1', () => {
		expect(lungeAt(99)).toMatchObject({ damage: 1 });
	});
});

describe('snare encounter: the flee deadline', () => {
	const idle = { move: { x: 0, y: 0 } };

	/** A wolf about to lunge at Grik, who has 1 HP: the first strike is lethal. */
	function lethalLunge() {
		const payload = payloadFor({
			enemyCount: 1,
			hero: { hp: 1, maxHp: 24, attack: 4, defense: 0 }
		});
		const state = createSnareBattle(snareSetupFromPayload(payload));
		const wolf = state.enemies[0]!;
		state.hero.x = 450;
		state.hero.y = 250;
		state.line.points = [{ x: 450, y: 250 }];
		Object.assign(wolf, { x: 360, y: 250, facing: 1 });
		park(state);
		wolf.stunnedUntil = 0;
		wolf.readyAt.lunge = 0;
		return state;
	}

	/** Runs to the frame just before the strike and says when the strike frame ends. */
	function approachStrike() {
		const probe = lethalLunge();
		let strikeFrameEnd = -1;
		while (strikeFrameEnd < 0) {
			const { events } = stepSnareFrame(probe, { status: 'idle' }, idle, 16);
			if (events.some((event) => event.type === 'hero-hit')) strikeFrameEnd = probe.now;
			expect(probe.now).toBeLessThan(5_000);
		}

		const state = lethalLunge();
		while (state.now + 16 < strikeFrameEnd) stepSnareFrame(state, { status: 'idle' }, idle, 16);
		return { state, strikeFrameEnd };
	}

	it('lets a flee that completes on the strike frame win over the strike', () => {
		const { state, strikeFrameEnd } = approachStrike();
		const flee = startFleeChannel(state.now, strikeFrameEnd - state.now);
		const before = { now: state.now, hp: state.hero.hp };

		const frame = stepSnareFrame(state, flee, idle, 16);

		expect(frame).toEqual({ fled: true, events: [] });
		expect(state.hero.hp).toBe(before.hp);
		expect(state.outcome).toBeNull();
		expect(state.now).toBe(before.now);
	});

	it('still lands a strike on the frame before the flee completes', () => {
		const { state, strikeFrameEnd } = approachStrike();
		const flee = startFleeChannel(state.now, strikeFrameEnd - state.now + 1);

		const frame = stepSnareFrame(state, flee, idle, 16);

		expect(frame.fled).toBe(false);
		expect(frame.events).toContainEqual(expect.objectContaining({ type: 'hero-hit' }));
		expect(state.hero.hp).toBe(0);
		expect(state.outcome).toBe('defeat');
	});

	it('judges the deadline on the clamped frame, not the raw one', () => {
		const longFrame = snareTuning.maxStepMs * 5;
		const frameWith = (durationMs: number) =>
			stepSnareFrame(lethalLunge(), startFleeChannel(0, durationMs), idle, longFrame);

		expect(frameWith(snareTuning.maxStepMs + 1).fled).toBe(false);
		expect(frameWith(snareTuning.maxStepMs).fled).toBe(true);
	});
});

describe('snare encounter: the unbeatable captain', () => {
	it('never drops below 1 HP, however hard Grik hits', () => {
		const payload = payloadFor({
			sourceEnemyId: 'sun-crest-captain',
			enemyCount: 1,
			hero: { hp: 24, maxHp: 24, attack: 500, defense: 0 }
		});
		const state = createSnareBattle(snareSetupFromPayload(payload));
		const captain = state.enemies[0]!;
		state.hero.x = 400;
		state.hero.y = 250;
		state.line.points = [{ x: 400, y: 250 }];
		Object.assign(captain, { x: 500, y: 250, facing: -1, hp: 5 });
		park(state);

		runUntil(state, (event) => event.type === 'enemy-hit');

		expect(captain.hp).toBe(1);
		expect(captain.defeated).toBe(false);
		expect(state.outcome).toBeNull();
	});
});

describe('snare encounter: the result', () => {
	function wonFight() {
		const payload = payloadFor();
		const state = createSnareBattle(snareSetupFromPayload(payload));
		for (const enemy of state.enemies) {
			enemy.hp = 0;
			enemy.defeated = true;
		}
		return { payload, state };
	}

	it('carries each defeated enemy’s rewards and drops on a victory', () => {
		const { payload, state } = wonFight();
		const result = buildSnareBattleResult({
			payload,
			state,
			inventory: payload.saveState.inventory,
			outcome: 'victory',
			random: () => 0
		});
		const wolf = enemies['forest-wolf']!;

		expect(result).toMatchObject({
			outcome: 'victory',
			sourceMapId: 'overworld',
			sourceEncounterId: 'wildwood-wolves-mouth',
			sourceEnemyId: 'forest-wolf',
			finalHeroHp: 24
		});
		expect(result.defeatedUnits).toEqual(
			[0, 1].map((unitIndex) => ({
				unitId: buildBattleUnitId('wildwood-wolves-mouth', unitIndex),
				unitIndex,
				enemyId: 'forest-wolf',
				xpReward: wolf.xpReward,
				coinReward: wolf.coinReward,
				drops: resolveLootDrops(wolf.loot, () => 0)
			}))
		);
	});

	it('carries nothing on a defeat or a flee, even with enemies down', () => {
		const { payload, state } = wonFight();

		for (const outcome of ['defeat', 'fled'] as const) {
			const result = buildSnareBattleResult({
				payload,
				state,
				inventory: payload.saveState.inventory,
				outcome
			});
			expect(result.defeatedUnits).toEqual([]);
		}
	});

	it('hands back the inventory Grik ended with and the HP he has left', () => {
		const { payload, state } = wonFight();
		state.hero.hp = 7;
		const inventory = { stacks: [{ itemId: 'field-potion', quantity: 2 }], equipment: [] };
		const result = buildSnareBattleResult({ payload, state, inventory, outcome: 'fled' });

		expect(result.inventory).toBe(inventory);
		expect(result.finalHeroHp).toBe(7);
	});

	it('is a result the world can apply: a victory has a summary, a flee does not', () => {
		const { payload, state } = wonFight();
		const build = (outcome: 'victory' | 'fled') =>
			applyBattleResultToSaveState(
				payload.saveState,
				buildSnareBattleResult({ payload, state, inventory: payload.saveState.inventory, outcome })
			);

		expect(build('victory').summary).toMatchObject({ outcome: 'victory', enemiesDefeated: 2 });
		expect(build('fled').summary).toBeNull();
	});
});
