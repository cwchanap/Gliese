/**
 * Every number of the Snare, Flank, Loose prototype (HPA-747) lives here, so a
 * playtest can retune the fight from one file. Times are ms, distances are
 * arena px, speeds are px/s. They started as the ticket's paper values; a value
 * changed after measuring keeps the paper value in a comment.
 */

export type SnareEnemyId = 'forest-wolf' | 'boar-king';

/** A straight lane the enemy runs along after the wind-up. */
export type LanePattern = {
	shape: 'lane';
	name: 'lunge' | 'charge';
	windupMs: number;
	speed: number;
	/** Lane length; leave it out and the lane runs to the arena edge. */
	length?: number;
	width: number;
	damage: number;
	/** Facing the way it ran, open to a back throw. */
	recoveryMs: number;
	/** Stunned this long when the lane ends at the arena edge. */
	edgeStunMs?: number;
	/** From the wind-up's start, or from the end of the edge stun when there is one. */
	intervalMs: number;
	/** Starts only while Grik stands this close. */
	range: number;
	/**
	 * Crossing the snare line cuts all of it. Only the charge does: every attack
	 * is aimed at Grik's spot, and his line always runs through that spot.
	 */
	cutsLine: boolean;
};

/** A swing that lands on a cone in front of the enemy when the wind-up ends. */
export type ArcPattern = {
	shape: 'arc';
	name: 'gore';
	windupMs: number;
	reach: number;
	halfAngleDeg: number;
	damage: number;
	recoveryMs: number;
	intervalMs: number;
	range: number;
	/** Landing on any part of the snare line cuts all of it. */
	cutsLine: boolean;
};

export type AttackPattern = LanePattern | ArcPattern;

export type EnemyProfile = {
	hp: number;
	walkSpeed: number;
	/** Stops walking once this close to Grik. */
	holdDistance: number;
	/** Other enemies are pushed out of this radius. */
	radius: number;
	turnDelayMs: number;
	/** Loops needed to snare it; every loop short of that adds a Bound ring. */
	loopsToSnare: number;
	snareMs: number;
	/** Bound rings fall off this long after the last loop. */
	ringsFallOffMs: number;
	/** In priority order: the first ready pattern in range starts. */
	patterns: AttackPattern[];
	/** From half HP on. */
	phaseTwo?: { walkSpeed: number; patterns: AttackPattern[] };
};

const wolfLunge: LanePattern = {
	shape: 'lane',
	name: 'lunge',
	windupMs: 600,
	speed: 400,
	length: 160,
	width: 44,
	damage: 4,
	recoveryMs: 800,
	intervalMs: 2_500,
	range: 150,
	cutsLine: false
};

const boarGore: ArcPattern = {
	shape: 'arc',
	name: 'gore',
	windupMs: 900,
	reach: 90,
	halfAngleDeg: 60,
	damage: 10,
	recoveryMs: 600,
	intervalMs: 3_000,
	range: 80,
	cutsLine: false
};

const boarCharge: LanePattern = {
	shape: 'lane',
	name: 'charge',
	windupMs: 1_000,
	speed: 420,
	width: 80,
	damage: 14,
	recoveryMs: 800,
	edgeStunMs: 2_500,
	intervalMs: 8_000,
	range: Number.POSITIVE_INFINITY,
	cutsLine: true
};

const enemyProfiles: Record<SnareEnemyId, EnemyProfile> = {
	'forest-wolf': {
		hp: 48, // 36 in HPA-747 (paper 24: standing still won); HPA-1232 raised it with the back-hit rule
		walkSpeed: 110,
		holdDistance: 90,
		radius: 28,
		turnDelayMs: 400,
		loopsToSnare: 1,
		snareMs: 6_000, // 4_500 in HPA-747 (paper 3_000)
		ringsFallOffMs: 10_000,
		patterns: [wolfLunge]
	},
	'boar-king': {
		hp: 760, // paper 520
		walkSpeed: 90,
		holdDistance: 60,
		radius: 60,
		turnDelayMs: 1_000,
		loopsToSnare: 3,
		snareMs: 7_000, // paper 6_000
		ringsFallOffMs: 10_000,
		patterns: [boarCharge, boarGore],
		phaseTwo: {
			walkSpeed: 135,
			patterns: [
				{ ...boarCharge, intervalMs: 5_000 },
				{ ...boarGore, windupMs: 700 }
			]
		}
	}
};

export const snareTuning = {
	arena: { width: 896, height: 504, padding: 48 },
	/** Longer frames are clamped, so a hitch never teleports anyone through a line. */
	maxStepMs: 100,
	/** Grik counts as in front or behind only once he is this far to one side. */
	facingDeadZonePx: 16,
	hero: {
		runSpeed: 180,
		firstThrowDelayMs: 300,
		throwIntervalMs: 600,
		throwRange: 300,
		spearSpeed: 900,
		/** Only on a snared or stunned enemy's back; a free enemy's back takes plain damage. */
		backHitMultiplier: 3,
		focusEvery: 4,
		focusMultiplier: 2,
		backHurtMultiplier: 1.5,
		/** A hit stops Grik's throws for this long and resets Focus. */
		hitStaggerMs: 1_000
	},
	line: {
		maxLength: 720,
		minLoopLength: 180, // 240 in HPA-747: loops around moving wolves closed on nothing
		/** A new line point is laid every this many px. */
		sampleSpacing: 8,
		cutPauseMs: 500
	},
	snareImmuneMs: 1_500,
	/** The first attacks of a pack are spread out by this much per unit. */
	attackStaggerMs: 800,
	enemies: enemyProfiles
};

export type SnareTuning = typeof snareTuning;
