import * as Phaser from 'phaser';

import {
	actorAnimationAssets,
	actorAnimationKeys,
	animationPackAsset,
	getActorAnimationAsset,
	getBattleBackgroundAsset,
	getEnemyActorId,
	getEnemyPlateArtPath,
	type ActorAnimationId,
	type ActorAnimationKey
} from '$lib/game/content/assets';
import { getBattleEnemyDefinition } from '$lib/game/core/battle';
import { getItem } from '$lib/game/content/items';
import { maps, openingMapId } from '$lib/game/content/maps';
import { buildAreaMapState } from '$lib/game/core/area-map';
import {
	appendBattleFeedEvent,
	cancelFleeChannel,
	cycleBattleTarget,
	getFleeChannelProgress,
	isFleeChannelComplete,
	selectBattleTarget,
	sortBattleRibbonEntries,
	startFleeChannel,
	type FleeChannelState
} from '$lib/game/core/battle-presentation';
import { createEmptyEquipment } from '$lib/game/core/equipment';
import { resolveMovementVector } from '$lib/game/core/input';
import { consumeStackItem } from '$lib/game/core/inventory';
import {
	buildHudQuestState,
	createInitialQuestState,
	getStoryProgress
} from '$lib/game/core/quests';
import {
	createSnareBattle,
	getEnemyProfile,
	healSnareHero,
	isSnared,
	isStunned,
	stepSnareBattle,
	type SnareBattleState,
	type SnareEnemy,
	type SnareEvent
} from '$lib/game/core/snare-battle/battle';
import { snareFights, type SnareFightId } from '$lib/game/core/snare-battle/fights';
import type { Vec } from '$lib/game/core/snare-battle/geometry';
import { snareTuning } from '$lib/game/core/snare-battle/tuning';
import { applyStoryGates } from '$lib/game/core/story-gates';
import { getEnemyText, getItemText } from '$lib/game/i18n/content';
import { getActiveLocale } from '$lib/game/i18n/store';
import { t, type MessageKey } from '$lib/game/i18n/translate';
import type { SaveState } from '$lib/game/save/save-state';
import {
	emitHudState,
	onHudCommand,
	type HudBattleActive,
	type HudBattleFeedEntry,
	type HudBattleSummary,
	type HudCommand,
	type HudState
} from '$lib/game/ui-bridge/events';

export type SnareBattleStartData = { fightId: SnareFightId };

type DirectionKey = { isDown: boolean };
type DirectionKeys = Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;

type EnemyView = {
	sprite: Phaser.GameObjects.Sprite;
	actorId: ActorAnimationId;
	clip: ActorAnimationKey;
	last: Vec;
	flashUntil: number;
};

type Flash = { points: Vec[]; color: number; until: number; durationMs: number; fill: boolean };

const colors = {
	line: 0xfff8e7,
	lineEdge: 0x1a1408,
	loop: 0xffe08a,
	cut: 0xff5d5d,
	telegraph: 0xff4d4d,
	snared: 0x8fd3ff,
	stunned: 0xd8d8ff,
	bound: 0xffd166,
	front: 0xff6b6b,
	heroFront: 0xfff1b8,
	spear: 0xf2ead3,
	focus: 0xffc83d,
	hit: 0xfff0a8
} as const;

const hudPublishIntervalMs = 200;
const hitFlashMs = 120;
/** Spears fly at about hand height above the ground point they track. */
const spearHeight = 38;

/**
 * Graybox of the Snare, Flank, Loose battle (HPA-747), opened only by the
 * `?battleTest=<fight>` dev link. The rules live in `core/snare-battle`; this
 * scene reads movement keys, steps the fight and draws it with today's
 * sprites and drawn shapes. A finished fight restarts; nothing is saved.
 */
export class SnareBattleScene extends Phaser.Scene {
	static readonly key = 'snare-battle';

	private fightId: SnareFightId = 'wolves-2';
	private state!: SnareBattleState;
	private inventory: SaveState['inventory'] = { stacks: [], equipment: [] };
	private hero!: Phaser.GameObjects.Sprite;
	private heroClip: ActorAnimationKey = 'idle';
	private heroClipLockedUntil = 0;
	private enemyViews = new Map<string, EnemyView>();
	private ground!: Phaser.GameObjects.Graphics;
	private overlay!: Phaser.GameObjects.Graphics;
	private timerText!: Phaser.GameObjects.Text;
	private flashes: Flash[] = [];
	private cursorKeys?: DirectionKeys;
	private wasdKeys?: DirectionKeys;
	private feed: HudBattleFeedEntry[] = [];
	private feedSeq = 0;
	private fleeChannel: FleeChannelState = { status: 'idle' };
	private lastHudPublishAt = 0;
	private hudStatic!: Pick<HudState, 'mapId' | 'areaMap' | 'quests'>;
	private finished = false;
	private removeHudCommandListener = () => {};
	private removeResizeListener = () => {};

	constructor() {
		super(SnareBattleScene.key);
	}

	create(data: SnareBattleStartData) {
		this.fightId = data.fightId;
		const fight = snareFights[this.fightId];
		this.state = createSnareBattle(this.fightId);
		this.inventory = { stacks: fight.items.map((item) => ({ ...item })), equipment: [] };
		this.enemyViews = new Map();
		this.flashes = [];
		this.feed = [];
		this.feedSeq = 0;
		this.fleeChannel = cancelFleeChannel();
		this.finished = false;
		this.heroClip = 'idle';
		this.heroClipLockedUntil = 0;
		this.lastHudPublishAt = 0;

		this.cameras.main.setBackgroundColor('#0b0d22');
		this.removeResizeListener();
		this.centerArena();
		this.scale.on('resize', this.centerArena);
		this.removeResizeListener = () => this.scale.off('resize', this.centerArena);

		this.registerAnimationPackFrames();
		this.ensureActorAnimations();
		this.createBackdrop(fight.mapId);
		this.ground = this.add.graphics().setDepth(1);
		this.overlay = this.add.graphics().setDepth(2_000);
		this.hero = this.createActor('hero', this.state.hero);
		for (const enemy of this.state.enemies) {
			const actorId = getEnemyActorId(enemy.enemyId);
			this.enemyViews.set(enemy.unitId, {
				sprite: this.createActor(actorId, enemy),
				actorId,
				clip: 'idle',
				last: { x: enemy.x, y: enemy.y },
				flashUntil: 0
			});
		}
		this.timerText = this.add
			.text(snareTuning.arena.width / 2, 20, '', {
				color: '#f8fafc',
				fontFamily: 'monospace',
				fontSize: '14px'
			})
			.setOrigin(0.5, 0)
			.setDepth(2_001);

		this.cursorKeys = this.input.keyboard?.createCursorKeys();
		this.wasdKeys = this.input.keyboard?.addKeys({
			left: Phaser.Input.Keyboard.KeyCodes.A,
			right: Phaser.Input.Keyboard.KeyCodes.D,
			up: Phaser.Input.Keyboard.KeyCodes.W,
			down: Phaser.Input.Keyboard.KeyCodes.S
		}) as DirectionKeys | undefined;

		this.hudStatic = this.buildHudStatic(fight.mapId);
		this.removeHudCommandListener();
		this.removeHudCommandListener = onHudCommand((command) => this.handleHudCommand(command));
		this.events.once('shutdown', () => {
			this.removeHudCommandListener();
			this.removeResizeListener();
		});

		this.draw();
		this.publishHud('status.battleStarted');
	}

	update(_time: number, delta: number) {
		if (!this.state || this.finished) {
			return;
		}

		if (this.updateFlee()) {
			return;
		}

		// The drawn line, tip included, so a cut can flash it.
		const { points } = this.state.line;
		const lineBefore = points.length > 0 ? [...points, { ...this.state.hero }] : [];
		const move = this.readMovement();
		const events = stepSnareBattle(this.state, { move }, delta);
		this.handleEvents(events, lineBefore);
		this.updateHeroClip(move);
		this.draw();

		if (this.state.outcome) {
			this.finish();
			return;
		}

		if (events.length > 0 || this.state.now - this.lastHudPublishAt >= hudPublishIntervalMs) {
			this.publishHud('status.battleActive');
		}
	}

	private readMovement(): Vec {
		const down = (key: 'left' | 'right' | 'up' | 'down') =>
			Boolean(this.cursorKeys?.[key]?.isDown || this.wasdKeys?.[key]?.isDown);
		const vector = resolveMovementVector({
			left: down('left'),
			right: down('right'),
			up: down('up'),
			down: down('down')
		});
		return { x: vector.x, y: vector.y };
	}

	private handleEvents(events: SnareEvent[], lineBefore: Vec[]) {
		const now = this.state.now;

		for (const event of events) {
			switch (event.type) {
				case 'loop-closed':
					this.flashes.push({
						points: event.loop,
						color: colors.loop,
						until: now + 450,
						durationMs: 450,
						fill: true
					});
					break;
				case 'line-cut':
					this.flashes.push({
						points: lineBefore,
						color: colors.cut,
						until: now + 350,
						durationMs: 350,
						fill: false
					});
					break;
				case 'strike':
					this.playEnemyClip(event.unitId, 'attack', 400);
					break;
				case 'throw':
					this.playHeroClip('attack', 300);
					break;
				case 'enemy-hit': {
					const enemy = this.findEnemy(event.unitId);
					const view = this.enemyViews.get(event.unitId);
					if (view) view.flashUntil = now + hitFlashMs;
					const multiplier =
						(event.back ? snareTuning.hero.backHitMultiplier : 1) *
						(event.focus ? snareTuning.hero.focusMultiplier : 1);
					if (enemy) {
						this.popNumber(
							enemy,
							`-${event.damage}${multiplier > 1 ? ` ×${multiplier}` : ''}`,
							event.back ? '#ffd166' : '#f8fafc',
							event.back || event.focus
						);
					}
					this.appendFeed('hit', event.damage, this.enemyName(event.unitId));
					break;
				}
				case 'enemy-defeated': {
					this.playEnemyClip(event.unitId, 'dead', Number.POSITIVE_INFINITY);
					const sprite = this.enemyViews.get(event.unitId)?.sprite;
					if (sprite) {
						this.tweens.add({ targets: sprite, alpha: 0, delay: 500, duration: 500 });
					}
					this.appendFeed('defeat', 0, this.enemyName(event.unitId));
					this.publishHud('status.enemyDefeated');
					break;
				}
				case 'hero-hit':
					this.popNumber(
						this.state.hero,
						`-${event.damage}${event.back ? ` ×${snareTuning.hero.backHurtMultiplier}` : ''}`,
						'#ff8a8a',
						event.back
					);
					this.cameras.main.shake(event.back ? 120 : 70, event.back ? 0.006 : 0.003);
					this.fleeChannel = cancelFleeChannel();
					this.appendFeed('hurt', event.damage, t(getActiveLocale(), 'ui.heroName'));
					break;
				case 'phase-two':
					this.publishHud('status.bossEnraged');
					break;
				default:
					break;
			}
		}
	}

	private finish() {
		this.finished = true;
		const outcome = this.state.outcome!;
		const seconds = (this.state.now / 1000).toFixed(1);
		const phaseTwo =
			this.state.phaseTwoAt === null
				? ''
				: `, phase 2 ${((this.state.now - this.state.phaseTwoAt) / 1000).toFixed(1)} s`;
		console.info(`[battleTest] ${this.fightId}: ${outcome} in ${seconds} s${phaseTwo}`);

		if (outcome === 'defeat') this.playHeroClip('dead', Number.POSITIVE_INFINITY);
		const summary: HudBattleSummary = {
			outcome,
			enemiesDefeated: this.state.enemies.filter((enemy) => enemy.defeated).length,
			xpGained: 0,
			coinsGained: 0,
			drops: [],
			leveledUp: false,
			completedQuestTitles: [],
			questRewards: [],
			questProgress: []
		};
		this.publishHud(
			outcome === 'victory' ? 'status.battleVictory' : 'status.battleDefeat',
			summary
		);
	}

	private restart() {
		this.scene.restart({ fightId: this.fightId } satisfies SnareBattleStartData);
	}

	// ---- Drawing -------------------------------------------------------------

	private draw() {
		const { now } = this.state;
		this.ground.clear();
		this.overlay.clear();

		for (const enemy of this.state.enemies) {
			if (!enemy.defeated) this.drawTelegraph(enemy);
		}
		this.drawFlashes();
		this.drawLine();
		for (const enemy of this.state.enemies) {
			this.drawEnemy(enemy);
		}
		this.drawHero();
		this.drawSpears();

		this.flashes = this.flashes.filter((flash) => flash.until > now);
		const phaseTwo =
			this.state.phaseTwoAt === null
				? ''
				: `   phase 2 ${((now - this.state.phaseTwoAt) / 1000).toFixed(1)} s`;
		this.timerText.setText(`${(now / 1000).toFixed(1)} s${phaseTwo}`);
	}

	private drawLine() {
		const { line, hero, now, lineBlockedUntil } = this.state;
		const points = [...line.points, { x: hero.x, y: hero.y }];

		if (now < lineBlockedUntil || points.length < 2) {
			return;
		}

		// A dark edge under a bright core keeps the line readable on any backdrop.
		for (const [width, color, strength] of [
			[7, colors.lineEdge, 0.5],
			[3, colors.line, 1]
		] as const) {
			for (let index = 1; index < points.length; index += 1) {
				const age = index / points.length;
				this.ground.lineStyle(width, color, (0.3 + 0.7 * age) * strength);
				this.ground.lineBetween(
					points[index - 1]!.x,
					points[index - 1]!.y,
					points[index]!.x,
					points[index]!.y
				);
			}
		}
	}

	private drawFlashes() {
		const { now } = this.state;

		for (const flash of this.flashes) {
			const alpha = Math.max(0, (flash.until - now) / flash.durationMs);
			if (flash.points.length < 2) continue;
			const points = flash.points.map((point) => new Phaser.Math.Vector2(point.x, point.y));

			if (flash.fill) {
				this.ground.fillStyle(flash.color, 0.35 * alpha);
				this.ground.fillPoints(points, true);
			}
			this.ground.lineStyle(4, flash.color, alpha);
			this.ground.strokePoints(points, flash.fill);
		}
	}

	private drawTelegraph(enemy: SnareEnemy) {
		const attack = enemy.attack;
		if (!attack || attack.stage === 'recovery') return;

		const { pattern, origin, aim, length } = attack;
		const progress =
			attack.stage === 'windup'
				? 1 - Math.max(0, attack.stageEndsAt - this.state.now) / pattern.windupMs
				: 1;

		if (pattern.shape === 'lane') {
			const half = pattern.width / 2;
			const side = { x: -aim.y * half, y: aim.x * half };
			const corners = (reach: number) =>
				[
					{ x: origin.x + side.x, y: origin.y + side.y },
					{ x: origin.x + aim.x * reach + side.x, y: origin.y + aim.y * reach + side.y },
					{ x: origin.x + aim.x * reach - side.x, y: origin.y + aim.y * reach - side.y },
					{ x: origin.x - side.x, y: origin.y - side.y }
				].map((point) => new Phaser.Math.Vector2(point.x, point.y));

			this.ground.fillStyle(colors.telegraph, 0.16);
			this.ground.fillPoints(corners(length), true);
			this.ground.fillStyle(colors.telegraph, 0.32);
			this.ground.fillPoints(corners(length * progress), true);
			this.ground.lineStyle(2, colors.telegraph, 0.75);
			this.ground.strokePoints(corners(length), true);
			return;
		}

		const angle = Math.atan2(aim.y, aim.x);
		const spread = Phaser.Math.DegToRad(pattern.halfAngleDeg);
		this.ground.fillStyle(colors.telegraph, 0.16);
		this.ground.slice(origin.x, origin.y, length, angle - spread, angle + spread);
		this.ground.fillPath();
		this.ground.fillStyle(colors.telegraph, 0.32);
		this.ground.slice(origin.x, origin.y, length * progress, angle - spread, angle + spread);
		this.ground.fillPath();
		this.ground.lineStyle(2, colors.telegraph, 0.75);
		this.ground.slice(origin.x, origin.y, length, angle - spread, angle + spread);
		this.ground.strokePath();
	}

	private drawEnemy(enemy: SnareEnemy) {
		const view = this.enemyViews.get(enemy.unitId);
		if (!view) return;

		const { now } = this.state;
		const sprite = view.sprite;
		sprite
			.setPosition(enemy.x, enemy.y)
			.setDepth(10 + enemy.y)
			.setFlipX(enemy.facing === -1);

		if (enemy.defeated) {
			sprite.clearTint();
			return;
		}

		const moved = Math.hypot(enemy.x - view.last.x, enemy.y - view.last.y) > 0.3;
		view.last = { x: enemy.x, y: enemy.y };
		if (now >= view.flashUntil || view.clip !== 'attack') {
			this.setEnemyClip(view, moved ? 'walk' : 'idle');
		}

		const profile = getEnemyProfile(enemy);
		const snared = isSnared(enemy, now);
		const stunned = isStunned(enemy, now);
		const tint =
			now < view.flashUntil
				? colors.hit
				: snared
					? colors.snared
					: stunned
						? colors.stunned
						: enemy.phase === 2
							? (getBattleEnemyDefinition(enemy.enemyId).boss?.phaseTwoColor ?? null)
							: null;
		if (tint === null) sprite.clearTint();
		else sprite.setTint(tint);

		const footWidth = profile.radius * 2.2;
		const footHeight = profile.radius * 0.8;

		// Its front: a wedge on the side it faces.
		const tipX = enemy.x + enemy.facing * (profile.radius + 26);
		const baseX = enemy.x + enemy.facing * (profile.radius + 4);
		this.ground.fillStyle(colors.front, snared || stunned ? 0.12 : 0.4);
		this.ground.fillTriangle(baseX, enemy.y - 14, baseX, enemy.y + 14, tipX, enemy.y);

		if (snared || stunned) {
			const until = snared ? enemy.snaredUntil : enemy.stunnedUntil;
			const total = snared ? profile.snareMs : this.stunLength(enemy);
			const left = Math.max(0, until - now) / total;
			const color = snared ? colors.snared : colors.stunned;
			this.ground.lineStyle(4, color, 0.9);
			this.ground.strokeEllipse(enemy.x, enemy.y, footWidth, footHeight);
			this.overlay.lineStyle(4, color, 0.95);
			this.overlay.beginPath();
			this.overlay.arc(
				enemy.x,
				enemy.y - sprite.displayHeight - 6,
				9,
				-Math.PI / 2,
				-Math.PI / 2 + Math.PI * 2 * left
			);
			this.overlay.strokePath();
		}

		for (let ring = 0; ring < enemy.boundRings; ring += 1) {
			const grow = 1 + ring * 0.22;
			this.ground.lineStyle(3, colors.bound, 0.9);
			this.ground.strokeEllipse(enemy.x, enemy.y, footWidth * grow, footHeight * grow);
		}

		this.drawEnemyBars(enemy, sprite.displayHeight, profile.loopsToSnare);
	}

	private stunLength(enemy: SnareEnemy): number {
		for (const pattern of getEnemyProfile(enemy).patterns) {
			if (pattern.shape === 'lane' && pattern.edgeStunMs) return pattern.edgeStunMs;
		}
		return 1;
	}

	private drawEnemyBars(enemy: SnareEnemy, spriteHeight: number, loopsToSnare: number) {
		const width = enemy.enemyId === 'boar-king' ? 90 : 40;
		const top = enemy.y - spriteHeight - 2;
		this.overlay.fillStyle(0x0f172a, 0.92);
		this.overlay.fillRect(enemy.x - width / 2 - 2, top - 2, width + 4, 7);
		this.overlay.fillStyle(0xff5d8f, 1);
		this.overlay.fillRect(enemy.x - width / 2, top, width * (enemy.hp / enemy.maxHp), 3);

		// Bound pips: how many loops it takes, and how many are on.
		if (loopsToSnare > 1) {
			for (let pip = 0; pip < loopsToSnare; pip += 1) {
				const x = enemy.x + (pip - (loopsToSnare - 1) / 2) * 16;
				this.overlay.lineStyle(2, colors.bound, 0.9);
				this.overlay.strokeCircle(x, top - 10, 5);
				if (pip < enemy.boundRings) {
					this.overlay.fillStyle(colors.bound, 1);
					this.overlay.fillCircle(x, top - 10, 3.5);
				}
			}
		}
	}

	private drawHero() {
		const { hero } = this.state;
		this.hero
			.setPosition(hero.x, hero.y)
			.setDepth(10 + hero.y)
			.setFlipX(hero.facing === -1);

		// His front, so a back hit on him is readable.
		const tipX = hero.x + hero.facing * 34;
		const baseX = hero.x + hero.facing * 16;
		this.ground.fillStyle(colors.heroFront, 0.45);
		this.ground.fillTriangle(baseX, hero.y - 9, baseX, hero.y + 9, tipX, hero.y);

		if (!hero.planted) return;

		// Focus pips: every 4th planted throw doubles. Red while a hit staggers him.
		const every = snareTuning.hero.focusEvery;
		const filled = hero.focusCount % every;
		const top = hero.y - this.hero.displayHeight - 4;
		const pipColor = this.state.now < hero.staggeredUntil ? colors.cut : colors.focus;
		for (let pip = 0; pip < every - 1; pip += 1) {
			const x = hero.x + (pip - (every - 2) / 2) * 12;
			this.overlay.lineStyle(2, pipColor, 0.9);
			this.overlay.strokeCircle(x, top, 4);
			if (pip < filled) {
				this.overlay.fillStyle(colors.focus, 1);
				this.overlay.fillCircle(x, top, 3);
			}
		}
		if (filled === every - 1) {
			this.overlay.lineStyle(2, colors.focus, 0.6);
			this.overlay.strokeCircle(hero.x, top, 22);
		}
	}

	private drawSpears() {
		for (const spear of this.state.spears) {
			const target = this.findEnemy(spear.targetId);
			if (!target) continue;
			const dx = target.x - spear.x;
			const dy = target.y - spear.y;
			const length = Math.hypot(dx, dy) || 1;
			const tailX = spear.x - (dx / length) * 26;
			const tailY = spear.y - (dy / length) * 26;
			this.overlay.lineStyle(3, spear.focus ? colors.focus : colors.spear, 1);
			this.overlay.lineBetween(tailX, tailY - spearHeight, spear.x, spear.y - spearHeight);
		}
	}

	private popNumber(at: Vec, text: string, color: string, big: boolean) {
		const label = this.add
			.text(at.x, at.y - 70, text, {
				color,
				fontFamily: 'monospace',
				fontSize: big ? '18px' : '13px',
				fontStyle: big ? 'bold' : 'normal',
				stroke: '#0b0d22',
				strokeThickness: 3
			})
			.setOrigin(0.5)
			.setDepth(2_002);
		this.tweens.add({
			targets: label,
			y: label.y - 28,
			alpha: 0,
			duration: 700,
			ease: 'Sine.easeOut',
			onComplete: () => label.destroy()
		});
	}

	// ---- Actors ---------------------------------------------------------------

	private createActor(actorId: ActorAnimationId, at: Vec): Phaser.GameObjects.Sprite {
		const asset = getActorAnimationAsset(actorId);
		const idleFrame = asset.clips.idle.frames[0]!;
		const sprite = this.add.sprite(at.x, at.y, animationPackAsset.key, idleFrame);
		sprite.setDisplaySize(asset.displaySize.width, asset.displaySize.height);
		// The core works in ground points: stand the sprite on its feet.
		sprite.setOrigin(0.5, (asset.groundContactY[idleFrame] ?? 188) / animationPackAsset.cellHeight);
		sprite.play(asset.clips.idle.key);
		return sprite;
	}

	private updateHeroClip(move: Vec) {
		if (this.state.now < this.heroClipLockedUntil) return;
		const clip = move.x !== 0 || move.y !== 0 ? 'walk' : 'idle';
		if (clip === this.heroClip) return;
		this.heroClip = clip;
		this.hero.play(getActorAnimationAsset('hero').clips[clip].key);
	}

	private playHeroClip(clip: ActorAnimationKey, lockMs: number) {
		this.heroClip = clip;
		this.heroClipLockedUntil = this.state.now + lockMs;
		this.hero.play(getActorAnimationAsset('hero').clips[clip].key);
	}

	private playEnemyClip(unitId: string, clip: ActorAnimationKey, lockMs: number) {
		const view = this.enemyViews.get(unitId);
		if (!view) return;
		view.clip = clip;
		view.flashUntil = Math.max(view.flashUntil, this.state.now + Math.min(lockMs, 400));
		view.sprite.play(getActorAnimationAsset(view.actorId).clips[clip].key);
	}

	private setEnemyClip(view: EnemyView, clip: ActorAnimationKey) {
		if (view.clip === clip || view.clip === 'dead') return;
		view.clip = clip;
		view.sprite.play(getActorAnimationAsset(view.actorId).clips[clip].key);
	}

	private registerAnimationPackFrames() {
		const texture = this.textures.get(animationPackAsset.key);
		for (const [frameName, frame] of Object.entries(animationPackAsset.frames)) {
			if (!texture.has(frameName)) {
				texture.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);
			}
		}
	}

	private ensureActorAnimations() {
		for (const animation of Object.values(actorAnimationAssets)) {
			for (const clipName of actorAnimationKeys) {
				const clip = animation.clips[clipName];
				if (this.anims.exists(clip.key)) continue;
				this.anims.create({
					key: clip.key,
					frames: clip.frames.map((frame) => ({ key: animationPackAsset.key, frame })),
					frameRate: clip.frameRate,
					repeat: clip.repeat
				});
			}
		}
	}

	private createBackdrop(mapId: string) {
		const { width, height } = snareTuning.arena;
		const background = getBattleBackgroundAsset(mapId);
		this.add
			.image(width / 2, height / 2, background.key)
			.setDisplaySize(width * 2, height * 2)
			.setDepth(-10);
		this.add.rectangle(width / 2, height / 2, width, height, 0x07130f, 0.35).setDepth(-9);
		const box = snareTuning.arena.padding;
		this.add
			.rectangle(width / 2, height / 2, width - box * 2, height - box * 2)
			.setStrokeStyle(1, 0xf8d78f, 0.25)
			.setDepth(-8);
	}

	private centerArena = () => {
		const { width, height } = snareTuning.arena;
		const zoom = Math.min(1, this.scale.width / width, this.scale.height / height);
		this.cameras.main.setZoom(zoom);
		this.cameras.main.centerOn(width / 2, height / 2);
	};

	// ---- HUD: the Svelte battle HUD, unchanged ---------------------------------

	private handleHudCommand(command: HudCommand) {
		if (command.type === 'dismiss-battle-summary' && this.finished) {
			this.restart();
			return;
		}
		if (this.finished) return;

		switch (command.type) {
			case 'heal':
				this.useFirstHealingItem();
				return;
			case 'use-item':
				this.useItem(command.itemId);
				return;
			case 'battle-cycle-target': {
				const next = cycleBattleTarget(
					this.state.enemies,
					this.state.targetId,
					command.direction,
					this.state.hero
				);
				this.state.targetId = next?.unitId ?? null;
				this.publishHud('status.battleActive');
				return;
			}
			case 'battle-select-target': {
				const next = selectBattleTarget(this.state.enemies, command.unitId);
				if (next) this.state.targetId = next.unitId;
				this.publishHud('status.battleActive');
				return;
			}
			case 'battle-flee':
				if (this.fleeChannel.status !== 'channeling') {
					this.fleeChannel = startFleeChannel(this.state.now);
					this.publishHud('status.battleActive');
				}
				return;
			default:
				this.publishHud('status.battleLocked');
		}
	}

	/** A finished flee restarts the test fight. Returns true when it did. */
	private updateFlee(): boolean {
		if (!isFleeChannelComplete(this.fleeChannel, this.state.now)) {
			return false;
		}
		this.restart();
		return true;
	}

	private useFirstHealingItem() {
		const stack = this.inventory.stacks.find((candidate) => {
			const item = getItem(candidate.itemId);
			return item?.type === 'consumable' && item.effect.type === 'heal';
		});

		if (!stack) {
			this.publishHud('status.noHealCharges');
			return;
		}

		this.useItem(stack.itemId);
	}

	private useItem(itemId: string) {
		const item = getItem(itemId);

		if (item?.type !== 'consumable' || item.effect.type !== 'heal') {
			this.publishHud('status.itemCannotBeUsed');
			return;
		}

		if (this.state.hero.hp >= this.state.hero.maxHp) {
			this.publishHud('status.hpAlreadyFull');
			return;
		}

		const result = consumeStackItem(this.inventory, itemId);
		if (!result.consumed) {
			this.publishHud('status.itemCannotBeUsed');
			return;
		}

		this.inventory = result.inventory;
		const healed = healSnareHero(this.state, item.effect.amount);
		this.appendFeed('heal', healed, getItemText(getActiveLocale(), itemId)?.name ?? item.name);
		this.publishHud('status.recoveredHp');
	}

	private appendFeed(kind: HudBattleFeedEntry['kind'], amount: number, subject: string) {
		this.feedSeq += 1;
		this.feed = appendBattleFeedEvent(this.feed, { id: this.feedSeq, kind, amount, subject });
	}

	private findEnemy(unitId: string): SnareEnemy | undefined {
		return this.state.enemies.find((enemy) => enemy.unitId === unitId);
	}

	private enemyName(unitId: string): string {
		const enemy = this.findEnemy(unitId);
		return enemy ? (getEnemyText(getActiveLocale(), enemy.enemyId)?.name ?? enemy.enemyId) : unitId;
	}

	private buildHudStatic(mapId: string): Pick<HudState, 'mapId' | 'areaMap' | 'quests'> {
		const locale = getActiveLocale();
		const quests = createInitialQuestState();
		const map = applyStoryGates(maps[mapId] ?? maps[openingMapId]!, getStoryProgress(quests));
		return {
			mapId: map.id,
			areaMap: buildAreaMapState({ map, player: map.spawn, revealedCells: [], quests, locale }),
			quests: buildHudQuestState({ state: quests, locale })
		};
	}

	private publishHud(statusKey: MessageKey, summary: HudBattleSummary | null = null) {
		const locale = getActiveLocale();
		const { hero } = this.state;
		const fight = snareFights[this.fightId];
		const consumables = this.inventory.stacks.flatMap((stack) => {
			const item = getItem(stack.itemId);
			const text = item ? getItemText(locale, item.id) : null;
			return item?.type === 'consumable'
				? [
						{
							itemId: item.id,
							name: text?.name ?? item.name,
							description: text?.description ?? item.description,
							iconPath: item.iconPath,
							quantity: stack.quantity
						}
					]
				: [];
		});
		const consumableCount = consumables.reduce((total, stack) => total + stack.quantity, 0);

		this.lastHudPublishAt = this.state.now;
		emitHudState({
			...this.hudStatic,
			ready: true,
			hp: hero.hp,
			maxHp: hero.maxHp,
			level: fight.hero.level,
			xp: 0,
			attack: hero.attack,
			defense: 0,
			heals: consumableCount,
			status: t(locale, statusKey),
			wallet: { coins: 0 },
			heroOccluded: false,
			nearbyShop: null,
			shop: null,
			dialogue: null,
			battle: summary
				? { phase: 'summary', summary, active: null }
				: { phase: 'active', summary: null, active: this.buildHudBattleActive(consumableCount) },
			inventory: {
				consumables,
				equipment: [],
				keyItems: [],
				equipped: createEmptyEquipment()
			}
		});
	}

	private buildHudBattleActive(consumableCount: number): HudBattleActive {
		const { now, hero, enemies } = this.state;
		const locale = getActiveLocale();
		const living = enemies.filter((enemy) => !enemy.defeated);

		return {
			targetUnitId: this.state.targetId,
			enemies: enemies.map((enemy) => ({
				unitId: enemy.unitId,
				enemyId: enemy.enemyId,
				name: getEnemyText(locale, enemy.enemyId)?.name ?? enemy.enemyId,
				hp: enemy.hp,
				maxHp: enemy.maxHp,
				defeated: enemy.defeated,
				artPath: getEnemyPlateArtPath(enemy.enemyId)
			})),
			ribbon: sortBattleRibbonEntries([
				{
					unitId: 'hero',
					readyAt: Math.max(
						hero.planted ? hero.nextThrowAt : now + snareTuning.hero.firstThrowDelayMs,
						hero.staggeredUntil
					)
				},
				...living.map((enemy) => ({
					unitId: enemy.unitId,
					readyAt: Math.max(
						enemy.snaredUntil,
						enemy.stunnedUntil,
						Math.min(...Object.values(enemy.readyAt))
					)
				}))
			]),
			feed: this.feed,
			heals: this.inventory.stacks.reduce((total, stack) => {
				const item = getItem(stack.itemId);
				return item?.type === 'consumable' && item.effect.type === 'heal'
					? total + stack.quantity
					: total;
			}, 0),
			items: consumableCount,
			flee: {
				status: this.fleeChannel.status,
				progress: getFleeChannelProgress(this.fleeChannel, now)
			},
			now
		};
	}
}
