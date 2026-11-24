/**
 * Plays the Snare, Flank, Loose prototype fights headless with scripted
 * players and prints how long each fight lasts, to check the tuning in
 * `src/lib/game/core/snare-battle/tuning.ts` against the fight-length targets.
 * A bot is not a person: treat the numbers as a floor check, then play it.
 *
 *   bun tools/snare-battle-sim.ts              every fight and player, 20 runs each
 *   bun tools/snare-battle-sim.ts --runs 50
 *   bun tools/snare-battle-sim.ts --stats     also the mean count of each event per fight
 *   bun tools/snare-battle-sim.ts --set enemies.forest-wolf.hp=30 --set hero.runSpeed=200
 */
import { parseArgs } from 'node:util';

import {
	createSnareBattle,
	healSnareHero,
	isBehind,
	isSnared,
	isStunned,
	snareArenaBox,
	stepSnareBattle,
	type SnareBattleState,
	type SnareEnemy
} from '$lib/game/core/snare-battle/battle';
import { snareFightIds, snareFights, type SnareFightId } from '$lib/game/core/snare-battle/fights';
import {
	direction,
	distance,
	distanceToSegment,
	pointInArc,
	type Vec
} from '$lib/game/core/snare-battle/geometry';
import { snareTuning } from '$lib/game/core/snare-battle/tuning';

type Policy = (state: SnareBattleState, random: () => number) => Vec;

const frameMs = 1000 / 60;
const fieldPotionHeal = 8;
const still: Vec = { x: 0, y: 0 };

type Style = 'stand' | 'punish' | 'loop';

const styleLabels: Record<Style, string> = {
	stand: 'stands still',
	punish: 'dodges and punishes',
	loop: 'loops and flanks'
};

/**
 * The three scripted players. Each notices a telegraph or an exposed back only
 * after a human-like 150-350 ms. Every player drinks a Field Potion once 8 HP
 * are missing.
 * - stand:  never moves.
 * - punish: stands and throws, moves only to dodge, throws at any back it
 *           sees, and runs behind a stunned enemy. Never loops on purpose.
 * - loop:   circles the nearest enemy that can be snared until the loop
 *           closes, draws it off the wall first, dodges, and runs behind
 *           whatever is snared or stunned.
 */
function createPlayer(style: Style): Policy {
	const noticed = new Map<string, number>();

	/** True once `holds` has been true for a reaction time. */
	const sees = (key: string, holds: boolean, now: number, random: () => number) => {
		if (!holds) {
			noticed.delete(key);
			return false;
		}
		if (!noticed.has(key)) noticed.set(key, now + 150 + random() * 200);
		return now >= noticed.get(key)!;
	};

	return (state, random) => {
		const { hero, now } = state;

		if (style === 'stand') return still;

		const living = state.enemies.filter((enemy) => !enemy.defeated);
		const prey =
			style === 'loop'
				? living
						.filter((enemy) => now >= enemy.snareImmuneUntil && !isSnared(enemy, now))
						.sort((a, b) => distance(hero, a) - distance(hero, b))[0]
				: undefined;

		// Every attack is aimed at Grik's spot, so circling the attacker is a dodge too.
		const threat = findThreat(state);
		if (sees('threat', threat !== null, now, random)) {
			const circling = prey && threat!.unitId === prey.unitId && hasRoomToLoop(prey);
			return circling ? circle(hero, prey, loopRadius(prey)) : dodge(hero, threat!);
		}

		const opened = living
			.filter((enemy) => isSnared(enemy, now) || isStunned(enemy, now))
			.sort((a, b) => distance(hero, a) - distance(hero, b))[0];

		if (opened) {
			state.targetId = opened.unitId;
			return goTo(hero, behind(opened));
		}

		if (style === 'punish') {
			const exposed = living.find((enemy) =>
				sees(
					`back:${enemy.unitId}`,
					isBehind(enemy, hero.x) && distance(hero, enemy) <= snareTuning.hero.throwRange,
					now,
					random
				)
			);
			if (exposed) state.targetId = exposed.unitId;
			return still;
		}

		if (!prey) return still;
		// An enemy against the wall cannot be looped: draw it out toward the middle first.
		return hasRoomToLoop(prey) ? circle(hero, prey, loopRadius(prey)) : goTo(hero, lure(prey));
	};
}

/** Tight around the feet: Grik can run through an enemy, and a short loop closes fast. */
function loopRadius(enemy: SnareEnemy): number {
	return enemy.enemyId === 'boar-king' ? 50 : 40;
}

/** A spot toward the arena's middle that the enemy will walk to. */
function lure(enemy: SnareEnemy): Vec {
	const middle = { x: snareTuning.arena.width / 2, y: snareTuning.arena.height / 2 };
	const toward = direction(enemy, middle);
	return { x: enemy.x + toward.x * 160, y: enemy.y + toward.y * 160 };
}

function hasRoomToLoop(enemy: SnareEnemy): boolean {
	const room = loopRadius(enemy) + 12;
	return (
		enemy.x - snareArenaBox.minX > room &&
		snareArenaBox.maxX - enemy.x > room &&
		enemy.y - snareArenaBox.minY > room &&
		snareArenaBox.maxY - enemy.y > room
	);
}

/** A throwing spot on the side the enemy faces away from. */
function behind(enemy: SnareEnemy): Vec {
	const x = enemy.x - enemy.facing * (loopRadius(enemy) + 20);
	return { x: Math.min(Math.max(x, snareArenaBox.minX), snareArenaBox.maxX), y: enemy.y };
}

type Threat = { unitId: string; from: Vec; aim: Vec };

function findThreat(state: SnareBattleState): Threat | null {
	const margin = 14;

	for (const enemy of state.enemies) {
		const attack = enemy.attack;
		if (enemy.defeated || !attack || attack.stage === 'recovery') continue;

		const { pattern, origin, aim, length } = attack;
		const covered =
			pattern.shape === 'arc'
				? pointInArc(state.hero, origin, aim, pattern.reach + margin, pattern.halfAngleDeg + 10)
				: distanceToSegment(state.hero, origin, {
						x: origin.x + aim.x * length,
						y: origin.y + aim.y * length
					}) <=
					pattern.width / 2 + margin;

		if (covered) return { unitId: enemy.unitId, from: origin, aim };
	}

	return null;
}

function dodge(hero: Vec, threat: Threat): Vec {
	// Step sideways off the aim line, on the side Grik already stands, or toward
	// the arena's middle when he stands right on it.
	const side = { x: -threat.aim.y, y: threat.aim.x };
	const middle = { x: snareTuning.arena.width / 2, y: snareTuning.arena.height / 2 };
	const offset = side.x * (hero.x - threat.from.x) + side.y * (hero.y - threat.from.y);
	const toMiddle = side.x * (middle.x - hero.x) + side.y * (middle.y - hero.y);
	const sign = Math.abs(offset) > 4 ? Math.sign(offset) : toMiddle >= 0 ? 1 : -1;
	return toEightWay({ x: side.x * sign, y: side.y * sign });
}

function goTo(hero: Vec, spot: Vec): Vec {
	return distance(hero, spot) < 10 ? still : toEightWay(direction(hero, spot));
}

function circle(hero: Vec, center: SnareEnemy, radius: number): Vec {
	const out = direction(center, hero, { x: -1, y: 0 });
	const tangent = { x: -out.y, y: out.x };
	const pull = (radius - distance(center, hero)) / radius;
	return toEightWay({ x: tangent.x + out.x * pull * 2, y: tangent.y + out.y * pull * 2 });
}

/** Keyboards move in 8 directions only. */
function toEightWay(vector: Vec): Vec {
	const angle = Math.round(Math.atan2(vector.y, vector.x) / (Math.PI / 4)) * (Math.PI / 4);
	return { x: Math.round(Math.cos(angle) * 1e6) / 1e6, y: Math.round(Math.sin(angle) * 1e6) / 1e6 };
}

type RunResult = {
	outcome: string;
	seconds: number;
	phaseTwoSeconds: number | null;
	hpLeft: number;
	tally: Record<string, number>;
};

function play(fightId: SnareFightId, policy: Policy, random: () => number): RunResult {
	const state = createSnareBattle(fightId);
	let potions = snareFights[fightId].items.reduce((total, item) => total + item.quantity, 0);

	const tally: Record<string, number> = {};
	const count = (key: string, amount = 1) => (tally[key] = (tally[key] ?? 0) + amount);

	while (!state.outcome && state.now < 180_000) {
		if (potions > 0 && state.hero.maxHp - state.hero.hp >= fieldPotionHeal) {
			healSnareHero(state, fieldPotionHeal);
			potions -= 1;
		}
		for (const event of stepSnareBattle(state, { move: policy(state, random) }, frameMs)) {
			count(event.type);
			if (event.type === 'enemy-hit') {
				const kind = `${event.back ? 'back' : 'front'}${event.focus ? '+focus' : ''}`;
				count(`hit ${kind}`);
				count(`damage ${event.back ? 'back' : 'front'}`, event.damage);
			}
			if (event.type === 'hero-hit') count(`hurt by ${event.unitId.split(':')[0]}`, event.damage);
		}
	}

	return {
		outcome: state.outcome ?? 'timeout',
		seconds: state.now / 1000,
		phaseTwoSeconds: state.phaseTwoAt === null ? null : (state.now - state.phaseTwoAt) / 1000,
		hpLeft: state.hero.hp,
		tally
	};
}

function seeded(seed: number) {
	let value = seed;
	return () => {
		value = (value * 1_103_515_245 + 12_345) % 2_147_483_648;
		return value / 2_147_483_648;
	};
}

function summarize(label: string, results: RunResult[]) {
	const mean = (key: string) =>
		results.reduce((total, result) => total + (result.tally[key] ?? 0), 0) / results.length;
	const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

	if (showStats) {
		const keys = [...new Set(results.flatMap((result) => Object.keys(result.tally)))].sort();
		console.log(`  ${keys.map((key) => `${key}: ${mean(key).toFixed(1)}`).join(', ')}`);
	}

	const wins = results.filter((result) => result.outcome === 'victory');
	const seconds = median(wins.map((result) => result.seconds));
	const phaseTwo = median(
		wins.map((result) => result.phaseTwoSeconds).filter((value): value is number => value !== null)
	);
	const snaredIn = results.filter((result) => (result.tally.snared ?? 0) > 0).length;

	console.log(
		[
			label.padEnd(36),
			`won ${wins.length}/${results.length}`.padEnd(10),
			seconds === undefined ? 'median -     ' : `median ${seconds.toFixed(1).padStart(5)} s`,
			phaseTwo === undefined ? '' : `phase 2 ${phaseTwo.toFixed(1)} s`,
			`loops ${mean('loop-closed').toFixed(1)}`,
			`snares ${mean('snared').toFixed(1)} (in ${snaredIn}/${results.length} fights)`
		]
			.filter(Boolean)
			.join('  ')
	);
}

const { values } = parseArgs({
	options: {
		runs: { type: 'string', default: '20' },
		stats: { type: 'boolean', default: false },
		set: { type: 'string', multiple: true, default: [] }
	}
});
const runs = Number(values.runs);
const showStats = values.stats;

// `--set enemies.forest-wolf.hp=30` tries a number without editing tuning.ts.
for (const assignment of values.set) {
	const [path, value] = assignment.split('=') as [string, string];
	const keys = path.split('.');
	const parent = keys
		.slice(0, -1)
		.reduce<
			Record<string, unknown>
		>((node, key) => node[key] as Record<string, unknown>, snareTuning);
	parent[keys.at(-1)!] = Number(value);
}

for (const fightId of snareFightIds) {
	for (const style of ['stand', 'punish', 'loop'] as const) {
		summarize(
			`${fightId}, ${styleLabels[style]}`,
			Array.from({ length: runs }, (_, run) => play(fightId, createPlayer(style), seeded(run + 1)))
		);
	}
}
