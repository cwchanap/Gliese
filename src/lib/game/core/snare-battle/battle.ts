/**
 * Snare, Flank, Loose: the real-time battle rules of the graybox prototype
 * (HPA-747). Pure TypeScript, no Phaser. The scene feeds movement in with
 * `stepSnareBattle`, which advances the fight in place and returns what
 * happened this step so the scene can draw it.
 */
import { advanceBossPhase } from '$lib/game/core/boss';
import { snareFights, type SnareFightId } from '$lib/game/core/snare-battle/fights';
import {
	direction,
	distance,
	distanceToBoxEdge,
	distanceToSegment,
	pointInArc,
	pointInPolygon,
	type Vec
} from '$lib/game/core/snare-battle/geometry';
import {
	clearLine,
	createLine,
	extendLine,
	lineCrossesSegment,
	lineTouchesArc,
	type SnareLine
} from '$lib/game/core/snare-battle/line';
import {
	snareTuning,
	type ArcPattern,
	type AttackPattern,
	type EnemyProfile,
	type LanePattern,
	type SnareEnemyId
} from '$lib/game/core/snare-battle/tuning';

/** Every fighter faces left (-1) or right (1). */
export type Facing = -1 | 1;

export type SnareHero = {
	x: number;
	y: number;
	hp: number;
	maxHp: number;
	attack: number;
	facing: Facing;
	/** Standing still: spears fly and Focus builds. */
	planted: boolean;
	nextThrowAt: number;
	/** Throws in a row from this spot. */
	focusCount: number;
	/** A hit stops his throws until then. */
	staggeredUntil: number;
};

export type EnemyAttack = {
	pattern: AttackPattern;
	stage: 'windup' | 'active' | 'recovery';
	stageEndsAt: number;
	origin: Vec;
	/** Unit vector toward the spot Grik stood on when the wind-up began. */
	aim: Vec;
	/** The lane's length, or the arc's reach. */
	length: number;
	travelled: number;
	hitHero: boolean;
};

export type SnareEnemy = {
	unitId: string;
	unitIndex: number;
	enemyId: SnareEnemyId;
	x: number;
	y: number;
	hp: number;
	maxHp: number;
	facing: Facing;
	phase: 1 | 2;
	turnStartedAt: number | null;
	attack: EnemyAttack | null;
	readyAt: Partial<Record<AttackPattern['name'], number>>;
	boundRings: number;
	ringsExpireAt: number;
	snaredUntil: number;
	snareImmuneUntil: number;
	stunnedUntil: number;
	defeated: boolean;
};

export type Spear = {
	id: number;
	x: number;
	y: number;
	/** Where Grik threw from: decides the back hit when it lands. */
	originX: number;
	targetId: string;
	focus: boolean;
};

export type SnareBattleState = {
	fightId: SnareFightId;
	/** Fight clock in ms, from 0. */
	now: number;
	hero: SnareHero;
	line: SnareLine;
	lineBlockedUntil: number;
	enemies: SnareEnemy[];
	spears: Spear[];
	nextSpearId: number;
	/** The selected target; throws prefer it while it is in range. */
	targetId: string | null;
	outcome: 'victory' | 'defeat' | null;
	phaseTwoAt: number | null;
};

export type SnareEvent =
	| { type: 'loop-closed'; loop: Vec[] }
	| { type: 'bound'; unitId: string; rings: number }
	| { type: 'snared'; unitId: string }
	| { type: 'line-cut'; unitId: string }
	| { type: 'windup'; unitId: string; pattern: AttackPattern['name'] }
	| { type: 'strike'; unitId: string; pattern: AttackPattern['name'] }
	| { type: 'stunned'; unitId: string }
	| { type: 'throw'; spearId: number; unitId: string }
	| { type: 'enemy-hit'; unitId: string; damage: number; back: boolean; focus: boolean }
	| { type: 'enemy-defeated'; unitId: string }
	| { type: 'hero-hit'; unitId: string; damage: number; back: boolean }
	| { type: 'phase-two'; unitId: string }
	| { type: 'victory' }
	| { type: 'defeat' };

/** Unit movement vector; zero means Grik stands still. */
export type SnareInput = { move: Vec };

const tuning = snareTuning;

export const snareArenaBox = {
	minX: tuning.arena.padding,
	minY: tuning.arena.padding,
	maxX: tuning.arena.width - tuning.arena.padding,
	maxY: tuning.arena.height - tuning.arena.padding
};

const heroStart = { x: 220, y: tuning.arena.height / 2 };
const enemyStartX = 680;
const enemySpawnSpacing = 112;

export function createSnareBattle(fightId: SnareFightId): SnareBattleState {
	const fight = snareFights[fightId];
	const profile = tuning.enemies[fight.enemyId];
	const enemies = Array.from({ length: fight.count }, (_, unitIndex): SnareEnemy => {
		const stagger = unitIndex * tuning.attackStaggerMs;

		return {
			unitId: `${fight.enemyId}:${unitIndex}`,
			unitIndex,
			enemyId: fight.enemyId,
			x: enemyStartX,
			y: heroStart.y + (unitIndex - (fight.count - 1) / 2) * enemySpawnSpacing,
			hp: profile.hp,
			maxHp: profile.hp,
			facing: -1,
			phase: 1,
			turnStartedAt: null,
			attack: null,
			readyAt: Object.fromEntries(
				profile.patterns.map((pattern) => [pattern.name, pattern.intervalMs + stagger])
			),
			boundRings: 0,
			ringsExpireAt: 0,
			snaredUntil: 0,
			snareImmuneUntil: 0,
			stunnedUntil: 0,
			defeated: false
		};
	});

	return {
		fightId,
		now: 0,
		hero: {
			...heroStart,
			hp: fight.hero.maxHp,
			maxHp: fight.hero.maxHp,
			attack: fight.hero.attack,
			facing: 1,
			planted: true,
			nextThrowAt: tuning.hero.firstThrowDelayMs,
			focusCount: 0,
			staggeredUntil: 0
		},
		line: createLine(heroStart),
		lineBlockedUntil: 0,
		enemies,
		spears: [],
		nextSpearId: 1,
		targetId: enemies[0]?.unitId ?? null,
		outcome: null,
		phaseTwoAt: null
	};
}

/** Advances the fight by `deltaMs` (clamped to `maxStepMs`) and reports what happened. */
export function stepSnareBattle(
	state: SnareBattleState,
	input: SnareInput,
	deltaMs: number
): SnareEvent[] {
	const events: SnareEvent[] = [];

	if (state.outcome) {
		return events;
	}

	const dt = Math.min(Math.max(deltaMs, 0), tuning.maxStepMs);
	state.now += dt;
	stepHero(state, input.move, dt, events);
	stepThrows(state, events);
	stepSpears(state, dt, events);

	for (const enemy of state.enemies) {
		if (state.outcome) break;
		if (!enemy.defeated) stepEnemy(state, enemy, dt, events);
	}

	separateEnemies(state);
	return events;
}

/** Heals Grik and returns the HP actually restored. */
export function healSnareHero(state: SnareBattleState, amount: number): number {
	const before = state.hero.hp;
	state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + Math.max(0, amount));
	return state.hero.hp - before;
}

export function getEnemyProfile(enemy: Pick<SnareEnemy, 'enemyId'>): EnemyProfile {
	return tuning.enemies[enemy.enemyId];
}

export function isSnared(enemy: SnareEnemy, now: number): boolean {
	return now < enemy.snaredUntil;
}

export function isStunned(enemy: SnareEnemy, now: number): boolean {
	return now < enemy.stunnedUntil;
}

/** True when `x` lies on the side `fighter` faces away from, past the dead zone. */
export function isBehind(fighter: { x: number; facing: Facing }, x: number): boolean {
	return (fighter.x - x) * fighter.facing > tuning.facingDeadZonePx;
}

/** The selected target while it is in range, else the nearest enemy in range. */
export function pickThrowTarget(state: SnareBattleState): SnareEnemy | null {
	const inRange = state.enemies.filter(
		(enemy) => !enemy.defeated && distance(state.hero, enemy) <= tuning.hero.throwRange
	);
	const selected = inRange.find((enemy) => enemy.unitId === state.targetId);

	if (selected) {
		return selected;
	}

	return inRange.reduce<SnareEnemy | null>(
		(nearest, enemy) =>
			!nearest || distance(state.hero, enemy) < distance(state.hero, nearest) ? enemy : nearest,
		null
	);
}

function stepHero(state: SnareBattleState, move: Vec, dt: number, events: SnareEvent[]) {
	const { hero } = state;

	if (move.x === 0 && move.y === 0) {
		if (!hero.planted) {
			hero.planted = true;
			hero.focusCount = 0;
			hero.nextThrowAt = state.now + tuning.hero.firstThrowDelayMs;
		}
		return;
	}

	const step = (tuning.hero.runSpeed * dt) / 1000;
	hero.x = clamp(hero.x + move.x * step, snareArenaBox.minX, snareArenaBox.maxX);
	hero.y = clamp(hero.y + move.y * step, snareArenaBox.minY, snareArenaBox.maxY);
	if (move.x !== 0) hero.facing = move.x > 0 ? 1 : -1;
	hero.planted = false;
	hero.focusCount = 0;

	if (state.now < state.lineBlockedUntil) {
		return;
	}

	const loop = extendLine(state.line, hero, tuning.line);
	if (loop) {
		closeLoop(state, loop, events);
	}
}

function closeLoop(state: SnareBattleState, loop: Vec[], events: SnareEvent[]) {
	events.push({ type: 'loop-closed', loop });

	for (const enemy of state.enemies) {
		if (!enemy.defeated && pointInPolygon(enemy, loop)) {
			bindEnemy(state, enemy, events);
		}
	}
}

/** One loop around the enemy: a Bound ring, or the snare once enough rings are on. */
function bindEnemy(state: SnareBattleState, enemy: SnareEnemy, events: SnareEvent[]) {
	const now = state.now;

	if (now < enemy.snaredUntil || now < enemy.snareImmuneUntil) {
		return;
	}

	const profile = getEnemyProfile(enemy);
	enemy.boundRings += 1;
	enemy.ringsExpireAt = now + profile.ringsFallOffMs;

	if (enemy.boundRings < profile.loopsToSnare) {
		events.push({ type: 'bound', unitId: enemy.unitId, rings: enemy.boundRings });
		return;
	}

	enemy.boundRings = 0;
	enemy.snaredUntil = now + profile.snareMs;
	enemy.snareImmuneUntil = enemy.snaredUntil + tuning.snareImmuneMs;
	enemy.attack = null;
	enemy.turnStartedAt = null;
	events.push({ type: 'snared', unitId: enemy.unitId });
}

function stepThrows(state: SnareBattleState, events: SnareEvent[]) {
	const { hero } = state;

	if (!hero.planted) {
		return;
	}

	const target = pickThrowTarget(state);
	if (!target) {
		return;
	}

	if (target.x !== hero.x) hero.facing = target.x > hero.x ? 1 : -1;

	if (state.now < hero.nextThrowAt || state.now < hero.staggeredUntil) {
		return;
	}

	hero.focusCount += 1;
	const spear: Spear = {
		id: state.nextSpearId,
		x: hero.x,
		y: hero.y,
		originX: hero.x,
		targetId: target.unitId,
		focus: hero.focusCount % tuning.hero.focusEvery === 0
	};
	state.nextSpearId += 1;
	state.spears.push(spear);
	hero.nextThrowAt = state.now + tuning.hero.throwIntervalMs;
	events.push({ type: 'throw', spearId: spear.id, unitId: target.unitId });
}

function stepSpears(state: SnareBattleState, dt: number, events: SnareEvent[]) {
	const step = (tuning.hero.spearSpeed * dt) / 1000;

	state.spears = state.spears.filter((spear) => {
		const target = state.enemies.find((enemy) => enemy.unitId === spear.targetId);

		if (!target || target.defeated) {
			return false;
		}

		const gap = distance(spear, target);
		if (gap > step) {
			spear.x += ((target.x - spear.x) / gap) * step;
			spear.y += ((target.y - spear.y) / gap) * step;
			return true;
		}

		landSpear(state, spear, target, events);
		return false;
	});
}

function landSpear(
	state: SnareBattleState,
	spear: Spear,
	target: SnareEnemy,
	events: SnareEvent[]
) {
	const back = isBehind(target, spear.originX);
	const damage = Math.round(
		state.hero.attack *
			(back ? tuning.hero.backHitMultiplier : 1) *
			(spear.focus ? tuning.hero.focusMultiplier : 1)
	);
	target.hp = Math.max(0, target.hp - damage);
	events.push({ type: 'enemy-hit', unitId: target.unitId, damage, back, focus: spear.focus });

	if (target.hp > 0) {
		enterPhaseTwo(state, target, events);
		return;
	}

	target.defeated = true;
	target.attack = null;
	events.push({ type: 'enemy-defeated', unitId: target.unitId });

	if (state.enemies.every((enemy) => enemy.defeated)) {
		state.outcome = 'victory';
		events.push({ type: 'victory' });
	}
}

function enterPhaseTwo(state: SnareBattleState, enemy: SnareEnemy, events: SnareEvent[]) {
	const phaseTwo = getEnemyProfile(enemy).phaseTwo;

	if (!phaseTwo || enemy.phase === 2) {
		return;
	}

	if (advanceBossPhase({ phase: enemy.phase, hp: enemy.hp, maxHp: enemy.maxHp }).phase !== 2) {
		return;
	}

	enemy.phase = 2;
	state.phaseTwoAt = state.now;
	for (const pattern of phaseTwo.patterns) {
		enemy.readyAt[pattern.name] = Math.min(
			enemy.readyAt[pattern.name] ?? 0,
			state.now + pattern.intervalMs
		);
	}
	events.push({ type: 'phase-two', unitId: enemy.unitId });
}

function getPhaseProfile(enemy: SnareEnemy): Pick<EnemyProfile, 'walkSpeed' | 'patterns'> {
	const profile = getEnemyProfile(enemy);
	return enemy.phase === 2 && profile.phaseTwo ? profile.phaseTwo : profile;
}

function stepEnemy(state: SnareBattleState, enemy: SnareEnemy, dt: number, events: SnareEvent[]) {
	const { now, hero } = state;
	const profile = getEnemyProfile(enemy);

	if (enemy.boundRings > 0 && now >= enemy.ringsExpireAt) {
		enemy.boundRings = 0;
	}

	if (isSnared(enemy, now) || isStunned(enemy, now)) {
		return;
	}

	if (enemy.attack) {
		stepAttack(state, enemy, dt, events);
		return;
	}

	// It turns toward Grik only after he has stood behind it for the turn delay.
	if (isBehind(enemy, hero.x)) {
		enemy.turnStartedAt ??= now;
		if (now - enemy.turnStartedAt >= profile.turnDelayMs) {
			enemy.facing = enemy.facing === 1 ? -1 : 1;
			enemy.turnStartedAt = null;
		}
		return;
	}

	enemy.turnStartedAt = null;
	const gap = distance(enemy, hero);
	const phase = getPhaseProfile(enemy);
	const pattern = phase.patterns.find(
		(candidate) => now >= (enemy.readyAt[candidate.name] ?? 0) && gap <= candidate.range
	);

	if (pattern) {
		startAttack(state, enemy, pattern, events);
		return;
	}

	if (gap > profile.holdDistance) {
		const step = Math.min((phase.walkSpeed * dt) / 1000, gap - profile.holdDistance);
		enemy.x += ((hero.x - enemy.x) / gap) * step;
		enemy.y += ((hero.y - enemy.y) / gap) * step;
	}
}

function startAttack(
	state: SnareBattleState,
	enemy: SnareEnemy,
	pattern: AttackPattern,
	events: SnareEvent[]
) {
	const origin = { x: enemy.x, y: enemy.y };
	const aim = direction(origin, state.hero, { x: enemy.facing, y: 0 });

	enemy.attack = {
		pattern,
		stage: 'windup',
		stageEndsAt: state.now + pattern.windupMs,
		origin,
		aim,
		length:
			pattern.shape === 'lane'
				? (pattern.length ?? distanceToBoxEdge(origin, aim, snareArenaBox))
				: pattern.reach,
		travelled: 0,
		hitHero: false
	};
	enemy.readyAt[pattern.name] = state.now + pattern.intervalMs;
	events.push({ type: 'windup', unitId: enemy.unitId, pattern: pattern.name });
}

function stepAttack(state: SnareBattleState, enemy: SnareEnemy, dt: number, events: SnareEvent[]) {
	const attack = enemy.attack!;
	const { pattern } = attack;

	if (attack.stage === 'recovery') {
		if (state.now >= attack.stageEndsAt) enemy.attack = null;
		return;
	}

	if (attack.stage === 'windup') {
		if (state.now < attack.stageEndsAt) return;

		events.push({ type: 'strike', unitId: enemy.unitId, pattern: pattern.name });
		if (pattern.shape === 'arc') {
			strikeArc(state, enemy, attack, pattern, events);
			return;
		}

		attack.stage = 'active';
		if (attack.aim.x !== 0) enemy.facing = attack.aim.x > 0 ? 1 : -1;
	}

	runLane(state, enemy, attack, pattern as LanePattern, dt, events);
}

function strikeArc(
	state: SnareBattleState,
	enemy: SnareEnemy,
	attack: EnemyAttack,
	pattern: ArcPattern,
	events: SnareEvent[]
) {
	const { origin, aim } = attack;

	if (
		pattern.cutsLine &&
		lineTouchesArc(state.line, origin, aim, pattern.reach, pattern.halfAngleDeg)
	) {
		cutLine(state, enemy, events);
	}

	if (pointInArc(state.hero, origin, aim, pattern.reach, pattern.halfAngleDeg)) {
		hurtHero(state, enemy, origin, pattern.damage, events);
	}

	attack.stage = 'recovery';
	attack.stageEndsAt = state.now + pattern.recoveryMs;
}

function runLane(
	state: SnareBattleState,
	enemy: SnareEnemy,
	attack: EnemyAttack,
	pattern: LanePattern,
	dt: number,
	events: SnareEvent[]
) {
	const from = { x: enemy.x, y: enemy.y };
	const step = Math.min((pattern.speed * dt) / 1000, attack.length - attack.travelled);
	enemy.x = clamp(enemy.x + attack.aim.x * step, snareArenaBox.minX, snareArenaBox.maxX);
	enemy.y = clamp(enemy.y + attack.aim.y * step, snareArenaBox.minY, snareArenaBox.maxY);
	attack.travelled += step;

	if (pattern.cutsLine && lineCrossesSegment(state.line, from, enemy)) {
		cutLine(state, enemy, events);
	}

	if (!attack.hitHero && distanceToSegment(state.hero, from, enemy) <= pattern.width / 2) {
		attack.hitHero = true;
		hurtHero(state, enemy, attack.origin, pattern.damage, events);
		if (state.outcome) return;
	}

	if (attack.travelled < attack.length - 1e-6) {
		return;
	}

	if (pattern.edgeStunMs !== undefined) {
		enemy.attack = null;
		enemy.stunnedUntil = state.now + pattern.edgeStunMs;
		// Its cooldown starts once it is back on its feet, so it does not charge again from the wall.
		enemy.readyAt[pattern.name] = enemy.stunnedUntil + pattern.intervalMs;
		events.push({ type: 'stunned', unitId: enemy.unitId });
		return;
	}

	attack.stage = 'recovery';
	attack.stageEndsAt = state.now + pattern.recoveryMs;
}

/** An attack crossed the line: all of it is lost, and a new one starts after a pause. */
function cutLine(state: SnareBattleState, enemy: SnareEnemy, events: SnareEvent[]) {
	if (state.line.points.length < 2) {
		return;
	}

	clearLine(state.line);
	state.lineBlockedUntil = state.now + tuning.line.cutPauseMs;
	events.push({ type: 'line-cut', unitId: enemy.unitId });
}

/** `from` is where the attack came from: behind Grik, it lands on his back. */
function hurtHero(
	state: SnareBattleState,
	enemy: SnareEnemy,
	from: Vec,
	damage: number,
	events: SnareEvent[]
) {
	const { hero } = state;
	const back = isBehind(hero, from.x);
	const amount = Math.round(damage * (back ? tuning.hero.backHurtMultiplier : 1));
	hero.hp = Math.max(0, hero.hp - amount);
	hero.staggeredUntil = state.now + tuning.hero.hitStaggerMs;
	hero.focusCount = 0;
	events.push({ type: 'hero-hit', unitId: enemy.unitId, damage: amount, back });

	if (hero.hp === 0) {
		state.outcome = 'defeat';
		events.push({ type: 'defeat' });
	}
}

/** Keeps free-moving enemies from stacking on one spot. */
function separateEnemies(state: SnareBattleState) {
	const isFree = (enemy: SnareEnemy) =>
		!enemy.attack && !isSnared(enemy, state.now) && !isStunned(enemy, state.now);
	const living = state.enemies.filter((enemy) => !enemy.defeated);

	for (let i = 0; i < living.length; i += 1) {
		for (let j = i + 1; j < living.length; j += 1) {
			const a = living[i]!;
			const b = living[j]!;
			const overlap = getEnemyProfile(a).radius + getEnemyProfile(b).radius - distance(a, b);

			if (overlap <= 0) continue;

			const away = direction(a, b, { x: 0, y: 1 });
			const share = isFree(a) && isFree(b) ? overlap / 2 : overlap;
			if (isFree(a)) moveEnemy(a, -away.x * share, -away.y * share);
			if (isFree(b)) moveEnemy(b, away.x * share, away.y * share);
		}
	}
}

function moveEnemy(enemy: SnareEnemy, dx: number, dy: number) {
	enemy.x = clamp(enemy.x + dx, snareArenaBox.minX, snareArenaBox.maxX);
	enemy.y = clamp(enemy.y + dy, snareArenaBox.minY, snareArenaBox.maxY);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
