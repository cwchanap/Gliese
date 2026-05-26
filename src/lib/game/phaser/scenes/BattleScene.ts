import * as Phaser from 'phaser';

import {
	actorAnimationAssets,
	actorAnimationKeys,
	animationPackAsset,
	getActorAnimationAsset,
	getEnemyActorId,
	type ActorAnimationKey
} from '$lib/game/content/assets';
import { getItem } from '$lib/game/content/items';
import { maps, openingMapId } from '$lib/game/content/maps';
import { buildAreaMapState } from '$lib/game/core/area-map';
import {
	applyBattleResultToSaveState,
	buildBattleEnemyUnits,
	getBattleEnemyDefinition,
	type BattleDefeatedUnit,
	type BattleEnemyUnit,
	type BattleResult,
	type BattleSummary,
	type BattleStartPayload
} from '$lib/game/core/battle';
import { canReceiveHit, resolveHit } from '$lib/game/core/combat';
import { createEmptyEquipment } from '$lib/game/core/equipment';
import { resolveMovementVector } from '$lib/game/core/input';
import { resolveLootDrops } from '$lib/game/core/loot';
import { buildHudQuestState, createInitialQuestState } from '$lib/game/core/quests';
import { getItemText } from '$lib/game/i18n/content';
import { getActiveLocale } from '$lib/game/i18n/store';
import { t } from '$lib/game/i18n/translate';
import { emitHudState, type HudState } from '$lib/game/ui-bridge/events';

type DirectionKey = { isDown: boolean };

type ActorMarker = {
	x: number;
	y: number;
	clearTint: () => unknown;
	setDisplaySize: (width: number, height: number) => unknown;
	setTint: (color: number) => unknown;
	setVisible: (visible: boolean) => unknown;
	play: (key: string, ignoreIfPlaying?: boolean) => unknown;
	once?: (event: string, callback: () => void) => unknown;
};

type OverlayMarker = {
	setPosition: (x: number, y: number) => unknown;
	setScale: (x: number, y?: number) => unknown;
	setVisible: (visible: boolean) => unknown;
};

type BattleEnemyInstance = BattleEnemyUnit & {
	animationLockedUntil: number;
	attackCooldownUntil: number;
	deathAnimationPending: boolean;
	healthBarBg: OverlayMarker;
	healthBarFill: OverlayMarker;
	hitReactionUntil: number;
	invulnerableUntil: number;
	marker: ActorMarker;
	visualState: ActorAnimationKey;
	x: number;
	y: number;
};

export class BattleScene extends Phaser.Scene {
	static readonly key = 'battle';
	private static readonly arena = { width: 640, height: 360, padding: 34 };
	private static readonly playerRadius = 12;
	private static readonly enemyRadius = 10;
	private static readonly attackReach = 40;
	private static readonly autoAttackCooldownMs = 450;
	private static readonly enemyInvulnerabilityMs = 250;
	private static readonly enemyAttackReach = 40;
	private static readonly enemyAttackCooldownMs = 700;
	private static readonly heroInvulnerabilityMs = 500;
	private static readonly maxMovementDeltaMs = 250;
	private static readonly actorAnimationLockMs = 400;
	private static readonly hitReactionDurationMs = 450;
	private static readonly hitReactionTint = 0xfff0a8;
	private static readonly heroMoveSpeed = 140;
	private static readonly enemyHealthBarOffsetY = 34;

	private cursorKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;
	private defeatedUnits: BattleDefeatedUnit[] = [];
	private enemies: BattleEnemyInstance[] = [];
	private hero = { hp: 1, maxHp: 1, attack: 1, defense: 0 };
	private heroAttackCooldownUntil = 0;
	private heroInvulnerableUntil = 0;
	private inventory: BattleStartPayload['saveState']['inventory'] | null = null;
	private payload: BattleStartPayload | null = null;
	private pendingResult: BattleResult | null = null;
	private player?: ActorMarker;
	private heroAnimationLockedUntil = 0;
	private heroVisualState: ActorAnimationKey = 'idle';
	private wasdKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;

	constructor() {
		super(BattleScene.key);
	}

	create(payload?: BattleStartPayload) {
		this.resetRuntimeState();
		this.cameras.main.setBackgroundColor('#17231f');

		if (!isBattleStartPayload(payload)) {
			this.add
				.text(320, 180, 'Battle payload missing', {
					color: '#f8fafc',
					fontSize: '14px'
				})
				.setOrigin(0.5);
			return;
		}

		this.payload = payload;
		this.inventory = {
			stacks: payload.saveState.inventory.stacks.map((stack) => ({ ...stack })),
			equipment: [...payload.saveState.inventory.equipment]
		};
		this.hero = { ...payload.hero };
		this.registerAnimationPackFrames();
		this.ensureActorAnimations();
		this.add.rectangle(320, 180, 584, 304, 0x203d31, 1);
		this.add.rectangle(320, 180, 552, 272, 0x2f6b48, 0.45);
		this.createHero();
		this.createEnemies(payload);
		this.cursorKeys = this.input?.keyboard?.createCursorKeys?.();
		this.wasdKeys = this.input?.keyboard?.addKeys?.({
			left: Phaser.Input.Keyboard.KeyCodes.A,
			right: Phaser.Input.Keyboard.KeyCodes.D,
			up: Phaser.Input.Keyboard.KeyCodes.W,
			down: Phaser.Input.Keyboard.KeyCodes.S
		}) as Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>> | undefined;
		this.publishHudState(t(getActiveLocale(), 'status.enemyStruckFirst'));
	}

	update(time: number, delta: number) {
		if (!this.player || !this.payload || this.pendingResult) {
			return;
		}

		this.updateHitReactions(time);
		this.updateHeroMovement(time, delta);
		this.tryHeroAttack(time);
		this.updateEnemyBehavior(time, delta);
	}

	getBattlePayloadForTest() {
		return this.payload;
	}

	private resetRuntimeState() {
		this.cursorKeys = undefined;
		this.defeatedUnits = [];
		this.enemies = [];
		this.hero = { hp: 1, maxHp: 1, attack: 1, defense: 0 };
		this.heroAttackCooldownUntil = 0;
		this.heroAnimationLockedUntil = 0;
		this.heroInvulnerableUntil = 0;
		this.heroVisualState = 'idle';
		this.inventory = null;
		this.payload = null;
		this.pendingResult = null;
		this.player = undefined;
		this.wasdKeys = undefined;
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

				if (this.anims.exists(clip.key)) {
					continue;
				}

				this.anims.create({
					key: clip.key,
					frames: clip.frames.map((frame) => ({ key: animationPackAsset.key, frame })),
					frameRate: clip.frameRate,
					repeat: clip.repeat
				});
			}
		}
	}

	private createHero() {
		const heroAnimation = getActorAnimationAsset('hero');
		this.player = this.add.sprite(
			320,
			180,
			animationPackAsset.key,
			heroAnimation.clips.idle.frames[0]
		) as ActorMarker;
		this.player.setDisplaySize(heroAnimation.displaySize.width, heroAnimation.displaySize.height);
		this.setHeroAnimation('idle');
	}

	private createEnemies(payload: BattleStartPayload) {
		const definition = getBattleEnemyDefinition(payload.sourceEnemyId);
		const units = buildBattleEnemyUnits({
			encounterId: payload.sourceEncounterId,
			enemy: definition,
			count: payload.enemyCount
		});
		const positions = this.getEnemySpawnPositions(units.length);

		this.enemies = units.map((unit, index) => {
			const position = positions[index]!;
			const actorAnimation = getActorAnimationAsset(getEnemyActorId(unit.enemyId));
			const marker = this.add.sprite(
				position.x,
				position.y,
				animationPackAsset.key,
				actorAnimation.clips.idle.frames[0]
			) as ActorMarker;
			const healthBarBg = this.add.rectangle(
				position.x,
				position.y - BattleScene.enemyHealthBarOffsetY,
				34,
				4,
				0x0f172a,
				0.92
			) as OverlayMarker;
			const healthBarFill = this.add.rectangle(
				position.x,
				position.y - BattleScene.enemyHealthBarOffsetY,
				30,
				2,
				0xff5d8f,
				1
			) as OverlayMarker;

			marker.setDisplaySize(actorAnimation.displaySize.width, actorAnimation.displaySize.height);
			marker.play(actorAnimation.clips.idle.key, true);

			const enemy: BattleEnemyInstance = {
				...unit,
				animationLockedUntil: 0,
				attackCooldownUntil: 0,
				deathAnimationPending: false,
				healthBarBg,
				healthBarFill,
				hitReactionUntil: 0,
				invulnerableUntil: 0,
				marker,
				visualState: 'idle',
				x: position.x,
				y: position.y
			};
			this.updateEnemyHealthBar(enemy);
			return enemy;
		});
	}

	private getEnemySpawnPositions(count: number): Array<{ x: number; y: number }> {
		const centerX = BattleScene.arena.width / 2;
		const centerY = BattleScene.arena.height / 2;
		const radiusX = 230;
		const radiusY = 122;

		return Array.from({ length: count }, (_, index) => {
			const angle = (Math.PI * 2 * index) / Math.max(count, 1) - Math.PI / 2;

			return {
				x: centerX + Math.round(Math.cos(angle) * radiusX),
				y: centerY + Math.round(Math.sin(angle) * radiusY)
			};
		});
	}

	private updateHeroMovement(time: number, delta: number) {
		if (!this.player) {
			return;
		}

		const direction = resolveMovementVector({
			left: Boolean(this.cursorKeys?.left?.isDown || this.wasdKeys?.left?.isDown),
			right: Boolean(this.cursorKeys?.right?.isDown || this.wasdKeys?.right?.isDown),
			up: Boolean(this.cursorKeys?.up?.isDown || this.wasdKeys?.up?.isDown),
			down: Boolean(this.cursorKeys?.down?.isDown || this.wasdKeys?.down?.isDown)
		});
		const step =
			BattleScene.heroMoveSpeed * (Math.min(delta, BattleScene.maxMovementDeltaMs) / 1000);

		this.player.x = clamp(
			this.player.x + direction.x * step,
			BattleScene.arena.padding,
			BattleScene.arena.width - BattleScene.arena.padding
		);
		this.player.y = clamp(
			this.player.y + direction.y * step,
			BattleScene.arena.padding,
			BattleScene.arena.height - BattleScene.arena.padding
		);

		if (time >= this.heroAnimationLockedUntil) {
			this.setHeroAnimation(direction.x === 0 && direction.y === 0 ? 'idle' : 'walk');
		}
	}

	private tryHeroAttack(time: number) {
		if (!this.player || time < this.heroAttackCooldownUntil) {
			return;
		}

		const target = this.enemies
			.filter((enemy) => !enemy.defeated && canReceiveHit(enemy, time))
			.map((enemy) => ({
				enemy,
				distance: Phaser.Math.Distance.Between(this.player!.x, this.player!.y, enemy.x, enemy.y)
			}))
			.filter(
				({ distance }) =>
					distance <= BattleScene.playerRadius + BattleScene.enemyRadius + BattleScene.attackReach
			)
			.sort((left, right) => left.distance - right.distance)[0]?.enemy;

		if (!target) {
			return;
		}

		this.heroAttackCooldownUntil = time + BattleScene.autoAttackCooldownMs;
		this.heroAnimationLockedUntil = time + BattleScene.actorAnimationLockMs;
		this.setHeroAnimation('attack', false);
		target.hp = resolveHit({ hp: target.hp, defense: 0 }, { power: this.hero.attack }).hp;
		target.invulnerableUntil = time + BattleScene.enemyInvulnerabilityMs;
		this.updateEnemyHealthBar(target);

		if (target.hp === 0) {
			this.finishEnemy(target);
			return;
		}

		target.hitReactionUntil = time + BattleScene.hitReactionDurationMs;
		target.marker.setTint(BattleScene.hitReactionTint);
	}

	private finishEnemy(enemy: BattleEnemyInstance) {
		if (enemy.defeated || !this.payload) {
			return;
		}

		enemy.defeated = true;
		this.playEnemyDeathAnimation(enemy);
		this.defeatedUnits.push({
			unitId: enemy.unitId,
			unitIndex: enemy.unitIndex,
			enemyId: enemy.enemyId,
			xpReward: enemy.xpReward,
			coinReward: enemy.coinReward,
			drops: resolveLootDrops(getBattleEnemyDefinition(enemy.enemyId).loot)
		});

		if (this.enemies.every((candidate) => candidate.defeated)) {
			this.finishBattle('victory');
		}
	}

	private updateEnemyBehavior(time: number, delta: number) {
		if (!this.player) {
			return;
		}

		for (const enemy of this.enemies) {
			if (enemy.defeated) {
				continue;
			}

			const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);

			if (distance > BattleScene.enemyAttackReach) {
				this.moveEnemyTowardHero(enemy, distance, time, delta);
			} else {
				this.updateEnemyMovementAnimation(enemy, 'idle', time);
			}

			if (
				distance <= BattleScene.enemyAttackReach &&
				time >= enemy.attackCooldownUntil &&
				time >= this.heroInvulnerableUntil
			) {
				this.enemyAttackHero(enemy, time);

				if (this.hero.hp === 0) {
					this.finishBattle('defeat');
					return;
				}
			}
		}
	}

	private moveEnemyTowardHero(
		enemy: BattleEnemyInstance,
		distance: number,
		time: number,
		delta: number
	) {
		if (!this.player || distance <= 0) {
			return;
		}

		const chaseStep = enemy.moveSpeed * (Math.min(delta, BattleScene.maxMovementDeltaMs) / 1000);
		const appliedStep = Math.min(chaseStep, distance);
		enemy.x += ((this.player.x - enemy.x) / distance) * appliedStep;
		enemy.y += ((this.player.y - enemy.y) / distance) * appliedStep;
		enemy.marker.x = enemy.x;
		enemy.marker.y = enemy.y;
		this.updateEnemyMovementAnimation(enemy, 'walk', time);
		this.updateEnemyHealthBar(enemy);
	}

	private enemyAttackHero(enemy: BattleEnemyInstance, time: number) {
		this.hero.hp = resolveHit(
			{ hp: this.hero.hp, defense: this.hero.defense },
			{ power: enemy.attack }
		).hp;
		enemy.attackCooldownUntil = time + BattleScene.enemyAttackCooldownMs;
		enemy.animationLockedUntil = time + BattleScene.actorAnimationLockMs;
		this.heroInvulnerableUntil = time + BattleScene.heroInvulnerabilityMs;
		this.playEnemyAnimation(enemy, 'attack', false);

		if (this.hero.hp === 0 && this.player) {
			this.setHeroAnimation('dead', false);
		}
	}

	private finishBattle(outcome: 'victory' | 'defeat') {
		if (!this.payload || !this.inventory || this.pendingResult) {
			return;
		}

		this.pendingResult = {
			outcome,
			sourceMapId: this.payload.sourceMapId,
			sourceEncounterId: this.payload.sourceEncounterId,
			sourceEnemyId: this.payload.sourceEnemyId,
			completion: this.payload.completion,
			returnPosition: this.payload.returnPosition,
			finalHeroHp: this.hero.hp,
			inventory: this.inventory,
			defeatedUnits: outcome === 'victory' ? this.defeatedUnits : []
		};
		const { summary } = applyBattleResultToSaveState(this.payload.saveState, this.pendingResult);
		this.publishHudState(this.getBattleSummaryStatus(outcome), summary);
	}

	private setHeroAnimation(clipName: ActorAnimationKey, ignoreIfPlaying = true) {
		if (!this.player || (this.heroVisualState === clipName && ignoreIfPlaying)) {
			return;
		}

		this.heroVisualState = clipName;
		this.player.play(getActorAnimationAsset('hero').clips[clipName].key, ignoreIfPlaying);
	}

	private updateEnemyMovementAnimation(
		enemy: BattleEnemyInstance,
		clipName: ActorAnimationKey,
		time: number
	) {
		if (time < enemy.animationLockedUntil) {
			return;
		}

		this.playEnemyAnimation(enemy, clipName);
	}

	private playEnemyDeathAnimation(enemy: BattleEnemyInstance) {
		if (enemy.deathAnimationPending) {
			return;
		}

		enemy.deathAnimationPending = true;
		enemy.visualState = 'dead';
		this.playEnemyAnimation(enemy, 'dead', false);

		const hideDefeatedEnemy = () => {
			enemy.marker.setVisible(false);
			enemy.healthBarBg.setVisible(false);
			enemy.healthBarFill.setVisible(false);
		};

		const completionEvent = `animationcomplete-${
			getActorAnimationAsset(getEnemyActorId(enemy.enemyId)).clips.dead.key
		}`;

		if (enemy.marker.once) {
			enemy.marker.once(completionEvent, hideDefeatedEnemy);
			return;
		}

		hideDefeatedEnemy();
	}

	private playEnemyAnimation(
		enemy: BattleEnemyInstance,
		clipName: ActorAnimationKey,
		ignoreIfPlaying = true
	) {
		if (enemy.visualState === clipName && ignoreIfPlaying) {
			return;
		}

		enemy.visualState = clipName;
		enemy.marker.play(
			getActorAnimationAsset(getEnemyActorId(enemy.enemyId)).clips[clipName].key,
			ignoreIfPlaying
		);
	}

	private updateHitReactions(time: number) {
		for (const enemy of this.enemies) {
			if (enemy.hitReactionUntil === 0 || time < enemy.hitReactionUntil || enemy.defeated) {
				continue;
			}

			enemy.hitReactionUntil = 0;
			enemy.marker.clearTint();
		}
	}

	private updateEnemyHealthBar(enemy: BattleEnemyInstance) {
		if (enemy.defeated) {
			enemy.healthBarBg.setVisible(false);
			enemy.healthBarFill.setVisible(false);
			return;
		}

		const hpRatio = Math.max(0, enemy.hp / Math.max(enemy.maxHp, 1));
		const y = enemy.y - BattleScene.enemyHealthBarOffsetY;
		enemy.healthBarBg.setPosition(enemy.x, y);
		enemy.healthBarFill.setPosition(enemy.x - 15 + (30 * hpRatio) / 2, y);
		enemy.healthBarFill.setScale(hpRatio, 1);
		enemy.healthBarBg.setVisible(true);
		enemy.healthBarFill.setVisible(true);
	}

	private getBattleSummaryStatus(outcome: 'victory' | 'defeat') {
		const locale = getActiveLocale();

		if (outcome === 'defeat') {
			return t(locale, 'status.heroDown');
		}

		return t(
			locale,
			this.payload?.completion === 'victory' ? 'status.victoryRuinsCleared' : 'status.enemyDefeated'
		);
	}

	private publishHudState(status: string, summary: BattleSummary | null = null) {
		const locale = getActiveLocale();
		const saveState = this.payload?.saveState;
		const map =
			maps[this.payload?.sourceMapId ?? saveState?.mapId ?? openingMapId] ?? maps[openingMapId]!;
		const questState = saveState?.quests ?? createInitialQuestState();
		const hudSummary: HudState['battle']['summary'] = summary
			? {
					outcome: summary.outcome,
					enemiesDefeated: summary.enemiesDefeated,
					xpGained: summary.xpGained,
					coinsGained: summary.coinsGained,
					drops: summary.drops.map((drop) => {
						const item = getItem(drop.itemId);
						const itemText = getItemText(locale, drop.itemId);

						return {
							itemId: drop.itemId,
							name: itemText?.name ?? item?.name ?? drop.itemId,
							quantity: drop.quantity
						};
					}),
					leveledUp: summary.leveledUp,
					completedQuestTitles: summary.completedQuestIds
				}
			: null;

		emitHudState({
			ready: true,
			mapId: map.id,
			hp: this.hero.hp,
			maxHp: this.hero.maxHp,
			level: saveState?.player.level ?? 1,
			xp: saveState?.player.xp ?? 0,
			attack: this.hero.attack,
			defense: this.hero.defense,
			heals: this.getConsumableCount(),
			canResume: false,
			status,
			areaMap: buildAreaMapState({
				map,
				player: saveState?.player ?? map.spawn,
				revealedCells: saveState?.mapExploration[map.id] ?? [],
				quests: questState,
				locale
			}),
			wallet: { coins: saveState?.wallet.coins ?? 0 },
			nearbyShop: null,
			shop: null,
			dialogue: null,
			battle: {
				phase: hudSummary ? 'summary' : 'active',
				summary: hudSummary
			},
			quests: buildHudQuestState({
				state: questState,
				nearbyQuestGiverId: null,
				locale
			}),
			inventory: this.buildHudInventory()
		});
	}

	private buildHudInventory(): HudState['inventory'] {
		const locale = getActiveLocale();
		const inventory = this.inventory ??
			this.payload?.saveState.inventory ?? { stacks: [], equipment: [] };
		const equipment = this.payload?.saveState.equipment ?? createEmptyEquipment();

		return {
			consumables: inventory.stacks.flatMap((stack) => {
				const item = getItem(stack.itemId);
				const itemText = item ? getItemText(locale, item.id) : null;

				return item?.type === 'consumable'
					? [
							{
								itemId: item.id,
								name: itemText?.name ?? item.name,
								description: itemText?.description ?? item.description,
								iconPath: item.iconPath,
								quantity: stack.quantity
							}
						]
					: [];
			}),
			equipment: inventory.equipment.flatMap((itemId) => {
				const item = getItem(itemId);
				const itemText = item ? getItemText(locale, item.id) : null;

				return item?.type === 'equipment'
					? [
							{
								itemId: item.id,
								name: itemText?.name ?? item.name,
								description: itemText?.description ?? item.description,
								iconPath: item.iconPath,
								slot: item.slot,
								equipped: equipment[item.slot] === item.id,
								modifiers: { ...item.modifiers }
							}
						]
					: [];
			}),
			keyItems: inventory.stacks.flatMap((stack) => {
				const item = getItem(stack.itemId);
				const itemText = item ? getItemText(locale, item.id) : null;

				return item?.type === 'key'
					? [
							{
								itemId: item.id,
								name: itemText?.name ?? item.name,
								description: itemText?.description ?? item.description,
								iconPath: item.iconPath,
								quantity: stack.quantity
							}
						]
					: [];
			}),
			equipped: { ...equipment }
		};
	}

	private getConsumableCount() {
		const inventory = this.inventory ?? this.payload?.saveState.inventory;

		return (
			inventory?.stacks.reduce((total, stack) => {
				const item = getItem(stack.itemId);

				return item?.type === 'consumable' ? total + stack.quantity : total;
			}, 0) ?? 0
		);
	}
}

function isBattleStartPayload(payload: unknown): payload is BattleStartPayload {
	if (!payload || typeof payload !== 'object') {
		return false;
	}

	const candidate = payload as Partial<BattleStartPayload>;

	return (
		Boolean(candidate.saveState) &&
		typeof candidate.sourceMapId === 'string' &&
		typeof candidate.sourceEncounterId === 'string' &&
		typeof candidate.sourceEnemyId === 'string' &&
		typeof candidate.enemyCount === 'number' &&
		Boolean(candidate.returnPosition) &&
		Boolean(candidate.hero) &&
		typeof candidate.hero?.hp === 'number' &&
		typeof candidate.hero?.maxHp === 'number' &&
		typeof candidate.hero?.attack === 'number' &&
		typeof candidate.hero?.defense === 'number'
	);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
