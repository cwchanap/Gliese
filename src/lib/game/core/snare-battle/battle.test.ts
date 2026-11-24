import { describe, expect, it } from 'vitest';

import {
	createSnareBattle,
	healSnareHero,
	isSnared,
	isStunned,
	stepSnareBattle,
	type SnareBattleState,
	type SnareEnemy,
	type SnareEvent
} from '$lib/game/core/snare-battle/battle';
import { snareFights, type SnareFightId } from '$lib/game/core/snare-battle/fights';
import { direction, distance, type Vec } from '$lib/game/core/snare-battle/geometry';
import { snareTuning } from '$lib/game/core/snare-battle/tuning';

const frameMs = 16;
const still: Vec = { x: 0, y: 0 };

/** A fight with every enemy parked: no walking, turning or attacking until released. */
function setup(
	fightId: SnareFightId,
	place: Array<Partial<SnareEnemy>>,
	hero: Vec = { x: 220, y: 252 }
) {
	const state = createSnareBattle(fightId);
	state.hero.x = hero.x;
	state.hero.y = hero.y;
	state.line.points = [{ ...hero }];
	state.enemies.forEach((enemy, index) => {
		Object.assign(enemy, { stunnedUntil: Number.POSITIVE_INFINITY }, place[index]);
		for (const name of Object.keys(enemy.readyAt) as Array<keyof SnareEnemy['readyAt']>) {
			enemy.readyAt[name] = Number.POSITIVE_INFINITY;
		}
	});
	return state;
}

function release(enemy: SnareEnemy) {
	enemy.stunnedUntil = 0;
}

function run(state: SnareBattleState, move: Vec, ms: number): SnareEvent[] {
	const events: SnareEvent[] = [];
	for (let elapsed = 0; elapsed < ms && !state.outcome; elapsed += frameMs) {
		events.push(...stepSnareBattle(state, { move }, Math.min(frameMs, ms - elapsed)));
	}
	return events;
}

function runUntil(
	state: SnareBattleState,
	move: Vec,
	done: (event: SnareEvent) => boolean,
	limitMs = 20_000
): SnareEvent[] {
	const events: SnareEvent[] = [];
	const start = state.now;
	while (state.now - start < limitMs && !state.outcome) {
		const step = stepSnareBattle(state, { move }, frameMs);
		events.push(...step);
		if (step.some(done)) return events;
	}
	throw new Error('the event never came');
}

/** Runs Grik through the waypoints in straight lines, the way held keys would. */
function runPath(state: SnareBattleState, waypoints: Vec[]): SnareEvent[] {
	const events: SnareEvent[] = [];
	for (const waypoint of waypoints) {
		for (let guard = 0; guard < 2_000 && distance(state.hero, waypoint) > 1; guard += 1) {
			const ms = Math.min(
				frameMs,
				(distance(state.hero, waypoint) / snareTuning.hero.runSpeed) * 1000
			);
			events.push(...stepSnareBattle(state, { move: direction(state.hero, waypoint) }, ms));
		}
	}
	return events;
}

/** A square loop around `center`, starting and ending on its left side. */
function loopAround(center: Vec, half = 60): Vec[] {
	return [
		{ x: center.x - half, y: center.y - half },
		{ x: center.x + half, y: center.y - half },
		{ x: center.x + half, y: center.y + half },
		{ x: center.x - half, y: center.y + half },
		{ x: center.x - half, y: center.y - half - 10 }
	];
}

function hits(events: SnareEvent[]) {
	return events.filter(
		(event): event is Extract<SnareEvent, { type: 'enemy-hit' }> => event.type === 'enemy-hit'
	);
}

describe('snare battle: the loop', () => {
	it('snares exactly the enemies inside the loop', () => {
		const state = setup(
			'wolves-3',
			[
				{ x: 300, y: 210 },
				{ x: 300, y: 290 },
				{ x: 650, y: 250 }
			],
			{ x: 240, y: 150 }
		);

		const events = runPath(state, [
			{ x: 360, y: 150 },
			{ x: 360, y: 350 },
			{ x: 240, y: 350 },
			{ x: 240, y: 140 }
		]);

		expect(events.filter((event) => event.type === 'loop-closed')).toHaveLength(1);
		const [inside1, inside2, outside] = state.enemies as [SnareEnemy, SnareEnemy, SnareEnemy];
		expect(isSnared(inside1, state.now)).toBe(true);
		expect(isSnared(inside2, state.now)).toBe(true);
		expect(isSnared(outside, state.now)).toBe(false);
	});

	it('holds a wolf for 3 s: it cannot move, turn or attack', () => {
		const state = setup(
			'wolves-2',
			[
				{ x: 400, y: 250 },
				{ x: 800, y: 450 }
			],
			{ x: 340, y: 190 }
		);
		const wolf = state.enemies[0]!;
		release(wolf);
		runPath(state, loopAround(wolf));
		expect(isSnared(wolf, state.now)).toBe(true);

		// Ready to lunge, Grik in range and behind it: a free wolf would turn and lunge.
		wolf.readyAt.lunge = 0;
		const held = { x: wolf.x, y: wolf.y, facing: wolf.facing };
		const snaredAt = state.now;
		const events = run(state, still, snareTuning.enemies['forest-wolf'].snareMs - 100);

		expect(events.some((event) => event.type === 'windup')).toBe(false);
		expect({ x: wolf.x, y: wolf.y, facing: wolf.facing }).toEqual(held);
		expect(isSnared(wolf, snaredAt + 2_950)).toBe(true);
		expect(isSnared(wolf, snaredAt + 3_000)).toBe(false);
	});

	it('brings the Boar King down on the third Bound ring, for its bring-down time', () => {
		const state = setup('boar-king', [{ x: 450, y: 250 }], { x: 360, y: 160 });
		const boar = state.enemies[0]!;

		const first = runPath(state, loopAround(boar, 90));
		expect(first).toContainEqual({ type: 'bound', unitId: boar.unitId, rings: 1 });
		const second = runPath(state, loopAround(boar, 90));
		expect(second).toContainEqual({ type: 'bound', unitId: boar.unitId, rings: 2 });
		expect(isSnared(boar, state.now)).toBe(false);

		const third = runPath(state, loopAround(boar, 90));
		expect(third).toContainEqual({ type: 'snared', unitId: boar.unitId });
		expect(boar.boundRings).toBe(0);
		expect(boar.snaredUntil - state.now).toBeCloseTo(snareTuning.enemies['boar-king'].snareMs, -2);
	});

	it('drops the Bound rings 10 s after the last loop', () => {
		const state = setup('boar-king', [{ x: 450, y: 250 }], { x: 360, y: 160 });
		const boar = state.enemies[0]!;
		runPath(state, loopAround(boar, 90));
		expect(boar.boundRings).toBe(1);

		const loopedAt = state.now;
		run(state, still, 9_900);
		expect(boar.boundRings).toBe(1);
		run(state, still, 10_000 - (state.now - loopedAt) + 50);
		expect(boar.boundRings).toBe(0);
	});

	it('does not snare an enemy again right after a snare ends', () => {
		const state = setup(
			'wolves-2',
			[
				{ x: 400, y: 250 },
				{ x: 800, y: 450 }
			],
			{ x: 340, y: 190 }
		);
		const wolf = state.enemies[0]!;
		runPath(state, loopAround(wolf));
		const firstEnd = wolf.snaredUntil;

		// The next loop closes just after the snare ends, inside the 1.5 s grace.
		run(state, still, firstEnd - state.now - 1_200);
		runPath(state, [{ x: 360, y: 210 }, ...loopAround(wolf, 40)]);

		expect(state.now).toBeGreaterThan(firstEnd);
		expect(state.now).toBeLessThan(firstEnd + snareTuning.snareImmuneMs);
		expect(isSnared(wolf, state.now)).toBe(false);
	});
});

describe('snare battle: cutting the line', () => {
	it('a charge crossing the line cuts all of it, and a new line starts after 0.5 s', () => {
		const state = setup('boar-king', [{ x: 600, y: 250, facing: -1 }], { x: 400, y: 150 });
		const boar = state.enemies[0]!;
		runPath(state, [
			{ x: 400, y: 350 },
			{ x: 300, y: 350 },
			{ x: 300, y: 250 }
		]);
		release(boar);
		boar.readyAt.charge = state.now;

		runUntil(state, still, (event) => event.type === 'line-cut');
		expect(boar.attack?.pattern.name).toBe('charge');
		expect(state.line.points).toHaveLength(0);

		run(state, { x: 0, y: 1 }, snareTuning.line.cutPauseMs - 50);
		expect(state.line.points).toHaveLength(0);
		run(state, { x: 0, y: 1 }, 200);
		expect(state.line.points.length).toBeGreaterThan(1);
	});

	it('a wolf lunging across the line does not cut it', () => {
		const state = setup(
			'wolves-2',
			[
				{ x: 480, y: 250, facing: -1 },
				{ x: 800, y: 450 }
			],
			{ x: 400, y: 150 }
		);
		const wolf = state.enemies[0]!;
		runPath(state, [
			{ x: 400, y: 350 },
			{ x: 300, y: 350 },
			{ x: 300, y: 250 }
		]);
		const laid = state.line.points.length;
		release(wolf);
		wolf.readyAt.lunge = state.now;

		const events = run(state, still, 1_300);

		expect(events).toContainEqual({ type: 'strike', unitId: wolf.unitId, pattern: 'lunge' });
		expect(wolf.x).toBeLessThan(400);
		expect(events.some((event) => event.type === 'line-cut')).toBe(false);
		expect(state.line.points).toHaveLength(laid);
	});

	it('a Boar King gore over the line does not cut it', () => {
		const state = setup('boar-king', [{ x: 450, y: 250, facing: -1 }], { x: 400, y: 150 });
		const boar = state.enemies[0]!;
		runPath(state, [
			{ x: 400, y: 350 },
			{ x: 380, y: 350 },
			{ x: 380, y: 250 }
		]);
		const laid = state.line.points.length;
		release(boar);
		boar.readyAt.gore = state.now;

		const events = run(state, still, 1_000);

		expect(events).toContainEqual({ type: 'strike', unitId: boar.unitId, pattern: 'gore' });
		expect(events.some((event) => event.type === 'line-cut')).toBe(false);
		expect(state.line.points).toHaveLength(laid);
	});

	it('an enemy walking over the line does not cut it', () => {
		const state = setup(
			'wolves-2',
			[
				{ x: 520, y: 250 },
				{ x: 800, y: 450 }
			],
			{ x: 400, y: 150 }
		);
		const wolf = state.enemies[0]!;
		runPath(state, [{ x: 400, y: 350 }]);
		release(wolf);

		// Grik runs off to the left; the wolf follows him across the line.
		const events = run(state, { x: -1, y: 0 }, 1_200);

		expect(wolf.x).toBeLessThan(400);
		expect(events.some((event) => event.type === 'line-cut')).toBe(false);
		expect(state.line.points.some((point) => point.x === 400 && point.y > 300)).toBe(true);
	});
});

describe('snare battle: throws', () => {
	it('deals Attack from the front and 3 times on the back', () => {
		const front = setup(
			'wolves-2',
			[
				{ x: 500, y: 250, facing: -1 },
				{ x: 800, y: 450 }
			],
			{ x: 400, y: 250 }
		);
		const frontHit = hits(runUntil(front, still, (event) => event.type === 'enemy-hit'))[0]!;
		expect(frontHit).toMatchObject({ back: false, damage: 4 });

		const back = setup(
			'wolves-2',
			[
				{ x: 500, y: 250, facing: -1 },
				{ x: 800, y: 450 }
			],
			{ x: 600, y: 250 }
		);
		const backHit = hits(runUntil(back, still, (event) => event.type === 'enemy-hit'))[0]!;
		expect(backHit).toMatchObject({ back: true, damage: 12 });
	});

	it('doubles every 4th throw in a row from the same spot', () => {
		const state = setup(
			'wolves-2',
			[
				{ x: 500, y: 250, facing: -1, hp: 999 },
				{ x: 800, y: 450 }
			],
			{
				x: 400,
				y: 250
			}
		);
		const events = run(state, still, 300 + 600 * 7 + 400);

		expect(hits(events).map((hit) => hit.damage)).toEqual([4, 4, 4, 8, 4, 4, 4, 8]);
	});

	it('stops throwing while Grik moves, and moving resets Focus', () => {
		const state = setup(
			'wolves-2',
			[
				{ x: 500, y: 300, facing: -1, hp: 999 },
				{ x: 800, y: 450 }
			],
			{
				x: 400,
				y: 250
			}
		);
		run(state, still, 300 + 600 * 2 + 50);
		expect(state.hero.focusCount).toBe(3);

		const moving = run(state, { x: 0, y: 1 }, 1_000);
		expect(moving.some((event) => event.type === 'throw')).toBe(false);
		expect(state.hero.focusCount).toBe(0);

		const planted = run(state, still, 300 + 600 * 3 + 400);
		expect(hits(planted).map((hit) => hit.damage)).toEqual([4, 4, 4, 8]);
	});
});

describe('snare battle: enemy attacks', () => {
	it('deals 1.5 times on Grik’s back', () => {
		// Grik is planted facing his target on the right; a second wolf lunges from his left.
		const state = setup(
			'wolves-2',
			[
				{ x: 560, y: 250 },
				{ x: 360, y: 250, facing: 1 }
			],
			{ x: 450, y: 250 }
		);
		const lunger = state.enemies[1]!;
		release(lunger);
		lunger.readyAt.lunge = 0;

		const backHit = runUntil(state, still, (event) => event.type === 'hero-hit').at(-1);
		expect(backHit).toMatchObject({ type: 'hero-hit', back: true, damage: 6 });

		const front = setup(
			'wolves-2',
			[
				{ x: 560, y: 250 },
				{ x: 360, y: 250, facing: 1 }
			],
			{ x: 450, y: 250 }
		);
		front.targetId = front.enemies[1]!.unitId;
		release(front.enemies[1]!);
		front.enemies[1]!.readyAt.lunge = 0;
		const frontHit = runUntil(front, still, (event) => event.type === 'hero-hit').at(-1);
		expect(frontHit).toMatchObject({ type: 'hero-hit', back: false, damage: 4 });
	});

	it('deals damage only through attacks: touching Grik does nothing', () => {
		const state = setup(
			'wolves-2',
			[
				{ x: 400, y: 250 },
				{ x: 800, y: 450 }
			],
			{ x: 400, y: 250 }
		);
		release(state.enemies[0]!);
		const events = run(state, still, 3_000);

		expect(events.some((event) => event.type === 'hero-hit')).toBe(false);
		expect(state.hero.hp).toBe(state.hero.maxHp);
	});

	it('stuns the Boar King when its charge reaches the arena edge', () => {
		const state = setup('boar-king', [{ x: 500, y: 250, facing: 1 }], { x: 640, y: 250 });
		const boar = state.enemies[0]!;
		release(boar);
		boar.readyAt.charge = 0;

		runUntil(state, { x: 0, y: -1 }, (event) => event.type === 'stunned');
		expect(boar.x).toBeCloseTo(snareTuning.arena.width - snareTuning.arena.padding);
		expect(isStunned(boar, state.now + 2_400)).toBe(true);
		expect(isStunned(boar, state.now + 2_500)).toBe(false);
	});

	it('enters phase 2 at half HP: faster, charging every 5 s', () => {
		const halfHp = snareTuning.enemies['boar-king'].hp / 2;
		const state = setup('boar-king', [{ x: 520, y: 250, facing: -1, hp: halfHp + 2 }], {
			x: 400,
			y: 250
		});
		const boar = state.enemies[0]!;
		boar.readyAt.charge = Number.POSITIVE_INFINITY;

		const events = runUntil(state, still, (event) => event.type === 'phase-two');
		expect(hits(events).at(-1)!.damage).toBe(8);
		expect(boar.hp).toBeLessThanOrEqual(boar.maxHp / 2);
		expect(boar.phase).toBe(2);
		expect(boar.readyAt.charge).toBe(state.now + 5_000);
		expect(state.phaseTwoAt).toBe(state.now);
	});
});

describe('snare battle: the whole fight', () => {
	it('standing still against the Boar King loses, even with all three Field Potions', () => {
		const state = createSnareBattle('boar-king');
		const potion = snareFights['boar-king'].items[0]!;
		let potions = potion.quantity;

		while (!state.outcome && state.now < 120_000) {
			if (potions > 0 && state.hero.maxHp - state.hero.hp >= 8) {
				healSnareHero(state, 8);
				potions -= 1;
			}
			stepSnareBattle(state, { move: still }, frameMs);
		}

		expect(potions).toBe(0);
		expect(state.outcome).toBe('defeat');
	});

	it('wins once every enemy is down', () => {
		const state = setup('wolves-2', [
			{ x: 400, y: 200, hp: 1 },
			{ x: 400, y: 300, hp: 1 }
		]);
		const events = run(state, still, 3_000);

		expect(events.filter((event) => event.type === 'enemy-defeated')).toHaveLength(2);
		expect(events.at(-1)).toEqual({ type: 'victory' });
		expect(state.outcome).toBe('victory');
	});
});
