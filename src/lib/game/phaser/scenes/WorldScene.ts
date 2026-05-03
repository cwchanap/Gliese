import * as Phaser from 'phaser';

import {
	actorAnimationAssets,
	actorAnimationKeys,
	animationPackAsset,
	getActorAnimationAsset,
	getEnemyActorId,
	getGroundFrameName,
	starterPackAsset,
	type ActorAnimationKey,
	type StarterPackFrameName
} from '$lib/game/content/assets';
import { enemies, type EnemyCombatDefinition } from '$lib/game/content/enemies';
import {
	maps,
	openingMapId,
	type MapTransition,
	type WorldMapDefinition
} from '$lib/game/content/maps';
import { getItem, type EquipmentSlot } from '$lib/game/content/items';
import { startingPlayer } from '$lib/game/content/player';
import { advanceBossPhase } from '$lib/game/core/boss';
import { canReceiveHit, resolveHit } from '$lib/game/core/combat';
import { equipItem, unequipSlot } from '$lib/game/core/equipment';
import { resolveMovementVector } from '$lib/game/core/input';
import { addItem, consumeStackItem } from '$lib/game/core/inventory';
import { resolveLootDrops } from '$lib/game/core/loot';
import { applyExperienceGain, type ProgressionState } from '$lib/game/core/progression';
import { clampHpToMax, deriveEffectiveStats, type EffectiveStats } from '$lib/game/core/stats';
import type { Direction } from '$lib/game/core/types';
import { createNewSaveState, type SaveState } from '$lib/game/save/save-state';
import { loadStoredSaveResult, saveGameState } from '$lib/game/save/storage';
import {
	emitHudState,
	onHudCommand,
	type HudCommand,
	type HudState
} from '$lib/game/ui-bridge/events';

interface WorldSceneData {
	mapId?: string;
	reason?: 'invalid-save' | 'new' | 'resume' | 'transition';
	saveState?: SaveState | null;
}

type DirectionKey = {
	isDown: boolean;
};

type ActorMarker = {
	x: number;
	y: number;
	setDisplaySize: (width: number, height: number) => unknown;
	setTint: (color: number) => unknown;
	setVisible: (visible: boolean) => unknown;
	play: (key: string, ignoreIfPlaying?: boolean) => unknown;
	once: (event: string, callback: () => void) => unknown;
};

type OverlayMarker = {
	x?: number;
	y?: number;
	setPosition: (x: number, y: number) => unknown;
	setScale: (x: number, y?: number) => unknown;
	setVisible: (visible: boolean) => unknown;
};

type PickupMarker = {
	setDisplaySize: (width: number, height: number) => unknown;
	setVisible: (visible: boolean) => unknown;
};

type TilemapLayer = {
	setDepth?: (depth: number) => unknown;
};

type EnemyInstance = {
	completion?: 'victory';
	defeated: boolean;
	definition: EnemyCombatDefinition;
	attackCooldownUntil: number;
	hp: number;
	invulnerableUntil: number;
	maxHp: number;
	phase: 1 | 2;
	x: number;
	y: number;
};

function cloneInventory(inventory: SaveState['inventory']): SaveState['inventory'] {
	return {
		stacks: inventory.stacks.map((stack) => ({ ...stack })),
		equipment: [...inventory.equipment]
	};
}

function cloneResolvedEncounterDrops(
	resolvedEncounterDrops: SaveState['flags']['resolvedEncounterDrops']
): SaveState['flags']['resolvedEncounterDrops'] {
	return Object.fromEntries(
		Object.entries(resolvedEncounterDrops).map(([encounterId, drops]) => [
			encounterId,
			drops.map((drop) => ({ ...drop }))
		])
	);
}

export class WorldScene extends Phaser.Scene {
	static readonly key = 'world';
	private static readonly attackReach = 40;
	private static readonly attackFlashDurationMs = 150;
	private static readonly autoAttackCooldownMs = 450;
	private static readonly enemyInvulnerabilityMs = 250;
	private static readonly enemyRadius = 10;
	private static readonly maxMovementDeltaMs = 250;
	private static readonly playerRadius = 12;
	private static readonly tileSize = 32;
	private static readonly terrainTilesetKey = 'starter-ground-tiles';
	private static readonly terrainTileIndexes: Record<StarterPackFrameName, number> = {
		hero: 0,
		slimeScout: 0,
		ruinsWarden: 0,
		healFlask: 0,
		grassTile: 0,
		pathTile: 1,
		ruinsFloorTile: 2,
		stoneWallTile: 3,
		doorwayTile: 0,
		encounterTile: 0,
		hudFrame: 0,
		hpIcon: 0,
		xpIcon: 0,
		titleBadge: 0
	};
	private static readonly terrainFrames: StarterPackFrameName[] = [
		'grassTile',
		'pathTile',
		'ruinsFloorTile',
		'stoneWallTile'
	];
	private static readonly cameraFollowLerp = 0.14;
	private static readonly transitionRadius = 18;
	private static readonly enemyHealthBarOffsetY = 34;

	private attackFlash?: OverlayMarker;
	private attackFlashUntil = 0;
	private clearedEncounterIds = new Set<string>();
	private collectedPickupIds = new Set<string>();
	private cursorKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;
	private enemy?: EnemyInstance;
	private enemyDeathAnimationPending = false;
	private enemyHealthBarBg?: OverlayMarker;
	private enemyHealthBarFill?: OverlayMarker;
	private enemyMarker?: ActorMarker;
	private enemyVisualState: ActorAnimationKey = 'idle';
	private facing: Direction = 'down';
	private heroAnimationLockedUntil = 0;
	private heroDefeated = false;
	private heroVisualState: ActorAnimationKey = 'idle';
	private inventory: SaveState['inventory'] = cloneInventory(createNewSaveState().inventory);
	private mapId = openingMapId;
	private pickupMarkers = new Map<string, PickupMarker>();
	private player?: ActorMarker;
	private playerAttackCooldownUntil = 0;
	private playerInvulnerableUntil = 0;
	private playerProgress: ProgressionState = {
		level: 1,
		xp: 0,
		hp: startingPlayer.baseHp,
		attack: startingPlayer.baseAttack
	};
	private equipment: SaveState['equipment'] = { ...createNewSaveState().equipment };
	private resolvedEncounterDrops: SaveState['flags']['resolvedEncounterDrops'] = {};
	private removeHudCommandListener = () => {};
	private simulationPaused = false;
	private victoryAchieved = false;
	private wasdKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;
	private worldSize = { width: 0, height: 0 };

	constructor() {
		super(WorldScene.key);
	}

	create(data: WorldSceneData = {}) {
		const activeSave = data.saveState;
		const map = this.resolveMap(activeSave?.mapId ?? data.mapId);
		const width = map.width * WorldScene.tileSize;
		const height = map.height * WorldScene.tileSize;
		const reason = data.reason ?? (activeSave ? 'resume' : 'new');

		this.attackFlashUntil = 0;
		this.attackFlash = undefined;
		this.clearedEncounterIds = new Set(activeSave?.flags.clearedEncounters ?? []);
		this.collectedPickupIds = new Set(activeSave?.flags.collectedPickups ?? []);
		this.enemy = undefined;
		this.enemyDeathAnimationPending = false;
		this.enemyHealthBarBg = undefined;
		this.enemyHealthBarFill = undefined;
		this.enemyMarker = undefined;
		this.enemyVisualState = 'idle';
		this.facing = activeSave?.player.facing ?? map.spawnDirection;
		this.heroAnimationLockedUntil = 0;
		this.heroDefeated = false;
		this.heroVisualState = 'idle';
		this.inventory = cloneInventory(activeSave?.inventory ?? createNewSaveState().inventory);
		this.equipment = { ...(activeSave?.equipment ?? createNewSaveState().equipment) };
		this.resolvedEncounterDrops = cloneResolvedEncounterDrops(
			activeSave?.flags.resolvedEncounterDrops ?? {}
		);
		this.mapId = map.id;
		this.pickupMarkers.clear();
		this.playerProgress = {
			level: activeSave?.player.level ?? 1,
			xp: activeSave?.player.xp ?? 0,
			hp: activeSave?.player.hp ?? startingPlayer.baseHp,
			attack: activeSave?.player.attack ?? startingPlayer.baseAttack
		};
		this.playerInvulnerableUntil = 0;
		this.playerAttackCooldownUntil = 0;
		this.simulationPaused = false;
		this.victoryAchieved = false;
		this.worldSize = { width, height };

		this.registerStarterPackFrames();
		this.registerAnimationPackFrames();
		this.ensureActorAnimations();
		this.ensureTerrainTilesetTexture();
		this.renderGround(map);
		const heroAnimation = getActorAnimationAsset('hero');
		this.player = this.add.sprite(
			activeSave?.player.x ?? map.spawn.x,
			activeSave?.player.y ?? map.spawn.y,
			animationPackAsset.key,
			heroAnimation.clips.idle.frames[0]
		) as ActorMarker;
		this.player.setDisplaySize(heroAnimation.displaySize.width, heroAnimation.displaySize.height);
		this.playHeroAnimation('idle');

		this.setupEncounter(map);
		this.renderTransitions(map);
		this.renderPickups(map);

		this.cameras.main.setBackgroundColor('#1a1f2b');
		this.cameras.main.setBounds(0, 0, width, height);
		this.cameras.main.startFollow(
			this.player,
			true,
			WorldScene.cameraFollowLerp,
			WorldScene.cameraFollowLerp
		);

		this.cursorKeys = this.input?.keyboard?.createCursorKeys?.();
		this.wasdKeys = this.input?.keyboard?.addKeys?.({
			left: Phaser.Input.Keyboard.KeyCodes.A,
			right: Phaser.Input.Keyboard.KeyCodes.D,
			up: Phaser.Input.Keyboard.KeyCodes.W,
			down: Phaser.Input.Keyboard.KeyCodes.S
		}) as Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>> | undefined;
		this.removeHudCommandListener();
		this.removeHudCommandListener = onHudCommand((command) => this.handleHudCommand(command));
		this.events?.once?.('shutdown', () => this.removeHudCommandListener());

		this.publishHudState(
			this.victoryAchieved ? 'Victory: ruins cleared' : this.resolveInitialStatus(reason)
		);
	}

	update(time: number, delta: number) {
		if (!this.player) {
			return;
		}

		if (this.simulationPaused) {
			return;
		}

		if (this.heroDefeated) {
			return;
		}

		const direction = resolveMovementVector({
			left: Boolean(this.cursorKeys?.left?.isDown || this.wasdKeys?.left?.isDown),
			right: Boolean(this.cursorKeys?.right?.isDown || this.wasdKeys?.right?.isDown),
			up: Boolean(this.cursorKeys?.up?.isDown || this.wasdKeys?.up?.isDown),
			down: Boolean(this.cursorKeys?.down?.isDown || this.wasdKeys?.down?.isDown)
		});
		this.updateHeroMovementAnimation(direction, time);

		const step = startingPlayer.moveSpeed * (Math.min(delta, WorldScene.maxMovementDeltaMs) / 1000);
		const min = WorldScene.playerRadius;
		const maxX = this.worldSize.width - WorldScene.playerRadius;
		const maxY = this.worldSize.height - WorldScene.playerRadius;

		this.player.x = Math.min(Math.max(this.player.x + direction.x * step, min), maxX);
		this.player.y = Math.min(Math.max(this.player.y + direction.y * step, min), maxY);
		this.facing = this.resolveFacing(direction, this.facing);

		if (this.tryTransition()) {
			return;
		}

		this.tryCollectPickup();

		if (time >= this.attackFlashUntil) {
			this.attackFlash?.setVisible(false);
		}

		if (
			this.enemy &&
			!this.enemy.defeated &&
			time >= this.playerAttackCooldownUntil &&
			this.canHeroAttackEnemy(time)
		) {
			this.playerAttackCooldownUntil = time + WorldScene.autoAttackCooldownMs;
			this.attackFlashUntil = time + WorldScene.attackFlashDurationMs;
			this.playHeroAttackAnimation(time);
			this.showAttackFlash();
			const effectiveStats = this.getEffectiveStats();
			this.enemy.hp = resolveHit(
				{ hp: this.enemy.hp, defense: 0 },
				{ power: effectiveStats.attack }
			).hp;
			this.enemy.invulnerableUntil = time + WorldScene.enemyInvulnerabilityMs;
			this.updateEnemyHealthBar();
			this.updateBossPhase();

			if (this.enemy.hp === 0) {
				this.finishEncounter();
			} else {
				this.publishHudState('Strike landed');
			}
		}

		if (!this.enemy || this.enemy.defeated) {
			return;
		}

		this.updateEnemyBehavior(time, delta);
	}

	private applyReward(xpReward: number): ProgressionState {
		if (this.playerProgress.level === 1) {
			return applyExperienceGain(this.playerProgress, xpReward);
		}

		return {
			...this.playerProgress,
			xp: this.playerProgress.xp + xpReward
		};
	}

	private canHeroAttackEnemy(time: number) {
		if (!this.player || !this.enemy || this.enemy.defeated) {
			return false;
		}

		const distanceToEnemy = Phaser.Math.Distance.Between(
			this.player.x,
			this.player.y,
			this.enemy.x,
			this.enemy.y
		);

		return (
			distanceToEnemy <=
				WorldScene.playerRadius + WorldScene.enemyRadius + WorldScene.attackReach &&
			canReceiveHit(this.enemy, time)
		);
	}

	private buildSaveState(): SaveState {
		return {
			version: 2,
			mapId: this.mapId,
			player: {
				level: this.playerProgress.level,
				xp: this.playerProgress.xp,
				hp: this.playerProgress.hp,
				attack: this.playerProgress.attack,
				x: this.player?.x ?? 64,
				y: this.player?.y ?? 64,
				facing: this.facing
			},
			flags: {
				clearedEncounters: [...this.clearedEncounterIds].sort(),
				collectedPickups: [...this.collectedPickupIds].sort(),
				resolvedEncounterDrops: cloneResolvedEncounterDrops(this.resolvedEncounterDrops)
			},
			inventory: cloneInventory(this.inventory),
			equipment: { ...this.equipment }
		};
	}

	private buildTransitionSaveState(transition: MapTransition): SaveState {
		const nextMap = this.resolveMap(transition.toMapId);
		const arrival = transition.arrival;
		const saveState = this.buildSaveState();

		return {
			...saveState,
			mapId: nextMap.id,
			player: {
				...saveState.player,
				x: arrival?.x ?? nextMap.spawn.x,
				y: arrival?.y ?? nextMap.spawn.y,
				facing: arrival?.facing ?? nextMap.spawnDirection
			}
		};
	}

	private consumeHeal() {
		const healingItem = this.consumeFirstHealingItem();

		if (!healingItem) {
			this.publishHudState('No heal charges left');
			return;
		}

		this.useItem(healingItem.itemId);
	}

	private consumeFirstHealingItem() {
		return this.inventory.stacks.find((stack) => {
			const item = getItem(stack.itemId);

			return item?.type === 'consumable' && item.effect.type === 'heal';
		});
	}

	private useItem(itemId: string) {
		const item = getItem(itemId);

		if (item?.type !== 'consumable' || item.effect.type !== 'heal') {
			this.publishHudState('Item cannot be used');
			return;
		}

		const maxHp = this.getEffectiveStats().maxHp;

		if (this.playerProgress.hp >= maxHp) {
			this.publishHudState('HP already full');
			return;
		}

		const result = consumeStackItem(this.inventory, itemId);

		if (!result.consumed) {
			this.publishHudState('Item cannot be used');
			return;
		}

		this.inventory = result.inventory;
		this.playerProgress = {
			...this.playerProgress,
			hp: Math.min(maxHp, this.playerProgress.hp + item.effect.amount)
		};
		this.publishHudState('Recovered HP');
	}

	private finishEncounter() {
		if (!this.enemy) {
			return;
		}

		this.enemy.defeated = true;
		this.playEnemyDeathAnimation();
		this.clearedEncounterIds.add(this.enemy.definition.id);
		this.awardEncounterDrops(this.enemy.definition.id);
		this.playerProgress = this.applyReward(this.enemy.definition.xpReward);

		if (this.enemy.completion === 'victory') {
			this.showVictoryState();
			this.publishHudState('Victory: ruins cleared');
			return;
		}

		this.publishHudState('Enemy defeated');
	}

	private equipInventoryItem(itemId: string) {
		const result = equipItem(this.equipment, this.inventory.equipment, itemId);

		if (!result.equipped) {
			this.publishHudState('Item cannot be equipped');
			return;
		}

		this.equipment = result.equipment;
		this.playerProgress = {
			...this.playerProgress,
			hp: clampHpToMax(this.playerProgress.hp, this.getEffectiveStats())
		};
		this.publishHudState('Equipped item');
	}

	private unequipInventorySlot(slot: EquipmentSlot) {
		this.equipment = unequipSlot(this.equipment, slot);
		this.playerProgress = {
			...this.playerProgress,
			hp: clampHpToMax(this.playerProgress.hp, this.getEffectiveStats())
		};
		this.publishHudState('Unequipped item');
	}

	private getBaseMaxHp() {
		return this.playerProgress.level > 1 ? startingPlayer.baseHp + 4 : startingPlayer.baseHp;
	}

	private getEffectiveStats(): EffectiveStats {
		return deriveEffectiveStats(
			{
				hp: this.getBaseMaxHp(),
				attack: this.playerProgress.attack,
				defense: 0
			},
			this.equipment
		);
	}

	private handleHudCommand(command: HudCommand) {
		switch (command.type) {
			case 'pause-game':
				this.simulationPaused = true;
				return;
			case 'resume-game':
				this.simulationPaused = false;
				return;
			case 'heal':
				this.consumeHeal();
				return;
			case 'resume-save':
				this.resumeStoredSave();
				return;
			case 'save':
				this.saveCurrentState();
				return;
			case 'use-item':
				this.useItem(command.itemId);
				return;
			case 'equip-item':
				this.equipInventoryItem(command.itemId);
				return;
			case 'unequip-slot':
				this.unequipInventorySlot(command.slot);
				return;
		}
	}

	private publishHudState(status: string) {
		const saveResult = loadStoredSaveResult();
		const effectiveStats = this.getEffectiveStats();

		emitHudState({
			ready: true,
			mapId: this.mapId,
			hp: this.playerProgress.hp,
			maxHp: effectiveStats.maxHp,
			level: this.playerProgress.level,
			xp: this.playerProgress.xp,
			attack: effectiveStats.attack,
			defense: effectiveStats.defense,
			heals: this.getConsumableCount(),
			canResume: saveResult.status === 'loaded',
			status,
			inventory: this.buildHudInventory()
		});
	}

	private buildHudInventory(): HudState['inventory'] {
		return {
			consumables: this.inventory.stacks.flatMap((stack) => {
				const item = getItem(stack.itemId);

				return item?.type === 'consumable'
					? [
							{
								itemId: item.id,
								name: item.name,
								description: item.description,
								quantity: stack.quantity
							}
						]
					: [];
			}),
			equipment: this.inventory.equipment.flatMap((itemId) => {
				const item = getItem(itemId);

				return item?.type === 'equipment'
					? [
							{
								itemId: item.id,
								name: item.name,
								description: item.description,
								slot: item.slot,
								equipped: this.equipment[item.slot] === item.id,
								modifiers: { ...item.modifiers }
							}
						]
					: [];
			}),
			keyItems: this.inventory.stacks.flatMap((stack) => {
				const item = getItem(stack.itemId);

				return item?.type === 'key'
					? [
							{
								itemId: item.id,
								name: item.name,
								description: item.description,
								quantity: stack.quantity
							}
						]
					: [];
			}),
			equipped: { ...this.equipment }
		};
	}

	private getConsumableCount() {
		return this.inventory.stacks.reduce((total, stack) => {
			const item = getItem(stack.itemId);

			return item?.type === 'consumable' ? total + stack.quantity : total;
		}, 0);
	}

	private registerStarterPackFrames() {
		const texture = this.textures.get(starterPackAsset.key);

		for (const [frameName, frame] of Object.entries(starterPackAsset.frames)) {
			if (!texture.has(frameName)) {
				texture.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);
			}
		}
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
		for (const actor of Object.values(actorAnimationAssets)) {
			for (const clipName of actorAnimationKeys) {
				const clip = actor.clips[clipName];

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

	private playHeroAnimation(clipName: ActorAnimationKey, ignoreIfPlaying = true) {
		this.player?.play(getActorAnimationAsset('hero').clips[clipName].key, ignoreIfPlaying);
	}

	private setHeroAnimation(clipName: ActorAnimationKey, ignoreIfPlaying = true) {
		if (this.heroVisualState === clipName && ignoreIfPlaying) {
			return;
		}

		this.heroVisualState = clipName;
		this.playHeroAnimation(clipName, ignoreIfPlaying);
	}

	private updateHeroMovementAnimation(direction: { x: number; y: number }, time: number) {
		if (this.heroDefeated || time < this.heroAnimationLockedUntil) {
			return;
		}

		this.setHeroAnimation(direction.x !== 0 || direction.y !== 0 ? 'walk' : 'idle');
	}

	private playHeroAttackAnimation(time: number) {
		this.heroAnimationLockedUntil = time + 400;
		this.setHeroAnimation('attack', false);
	}

	private defeatHero() {
		if (this.heroDefeated) {
			return;
		}

		this.heroDefeated = true;
		this.setHeroAnimation('dead', false);
	}

	private playEnemyAnimation(clipName: ActorAnimationKey, ignoreIfPlaying = true) {
		if (!this.enemy) {
			return;
		}

		this.enemyMarker?.play(
			getActorAnimationAsset(getEnemyActorId(this.enemy.definition.id)).clips[clipName].key,
			ignoreIfPlaying
		);
	}

	private setEnemyAnimation(clipName: ActorAnimationKey, ignoreIfPlaying = true) {
		if (!this.enemy || this.enemy.defeated || this.enemyDeathAnimationPending) {
			return;
		}

		if (this.enemyVisualState === clipName && ignoreIfPlaying) {
			return;
		}

		this.enemyVisualState = clipName;
		this.playEnemyAnimation(clipName, ignoreIfPlaying);
	}

	private playEnemyDeathAnimation() {
		if (!this.enemy || this.enemyDeathAnimationPending) {
			return;
		}

		this.enemyDeathAnimationPending = true;
		this.enemyVisualState = 'dead';
		this.playEnemyAnimation('dead', false);

		const hideDefeatedEnemy = () => {
			this.enemyMarker?.setVisible(false);
			this.enemyHealthBarBg?.setVisible(false);
			this.enemyHealthBarFill?.setVisible(false);
		};

		const completionEvent = `animationcomplete-${
			getActorAnimationAsset(getEnemyActorId(this.enemy.definition.id)).clips.dead.key
		}`;

		if (this.enemyMarker?.once) {
			this.enemyMarker.once(completionEvent, hideDefeatedEnemy);
			return;
		}

		hideDefeatedEnemy();
	}

	private ensureTerrainTilesetTexture() {
		const textureManager = this.textures as typeof this.textures & {
			exists?: (key: string) => boolean;
			addCanvas?: (key: string, source: HTMLCanvasElement) => unknown;
		};

		if (textureManager.exists?.(WorldScene.terrainTilesetKey)) {
			return;
		}

		const sourceImage = this.textures.get(starterPackAsset.key)?.source?.[0]?.image;

		if (typeof document === 'undefined' || !sourceImage || !textureManager.addCanvas) {
			return;
		}

		const canvas = document.createElement('canvas');
		canvas.width = WorldScene.terrainFrames.length * WorldScene.tileSize;
		canvas.height = WorldScene.tileSize;
		const context = canvas.getContext('2d');

		if (!context) {
			return;
		}

		for (const [index, frameName] of WorldScene.terrainFrames.entries()) {
			const frame = starterPackAsset.frames[frameName];
			context.drawImage(
				sourceImage,
				frame.x,
				frame.y,
				frame.w,
				frame.h,
				index * WorldScene.tileSize,
				0,
				WorldScene.tileSize,
				WorldScene.tileSize
			);
		}

		textureManager.addCanvas(WorldScene.terrainTilesetKey, canvas);
	}

	private renderGround(map: WorldMapDefinition) {
		const tilemap = this.make.tilemap({
			data: this.buildGroundTileData(map),
			tileWidth: WorldScene.tileSize,
			tileHeight: WorldScene.tileSize
		});
		const tileset = tilemap.addTilesetImage(
			WorldScene.terrainTilesetKey,
			WorldScene.terrainTilesetKey,
			WorldScene.tileSize,
			WorldScene.tileSize
		);

		if (!tileset) {
			return;
		}

		const layer = tilemap.createLayer(0, tileset, 0, 0) as TilemapLayer | null;
		layer?.setDepth?.(-10);
	}

	private buildGroundTileData(map: WorldMapDefinition) {
		const baseTile = WorldScene.terrainTileIndexes[getGroundFrameName(map.id)];
		const pathTile = WorldScene.terrainTileIndexes.pathTile;
		const stoneTile = WorldScene.terrainTileIndexes.stoneWallTile;
		const centerRow = Math.floor(map.height / 2);

		return Array.from({ length: map.height }, (_, row) =>
			Array.from({ length: map.width }, (_, column) => {
				if (map.id === openingMapId && Math.abs(row - centerRow) <= 1) {
					return pathTile;
				}

				if (
					map.id !== openingMapId &&
					(row === 0 || column === 0 || row === map.height - 1 || column === map.width - 1)
				) {
					return stoneTile;
				}

				return baseTile;
			})
		);
	}

	private getEnemyMoveSpeed() {
		if (!this.enemy) {
			return 0;
		}

		if (this.enemy.definition.boss && this.enemy.phase === 2) {
			return this.enemy.definition.moveSpeed * 1.5;
		}

		return this.enemy.definition.moveSpeed;
	}

	private renderPickups(map: WorldMapDefinition) {
		this.pickupMarkers.clear();

		for (const pickup of map.pickups ?? []) {
			if (this.collectedPickupIds.has(pickup.id)) {
				continue;
			}

			const marker = this.add.image(
				pickup.x,
				pickup.y,
				starterPackAsset.key,
				'healFlask'
			) as PickupMarker;
			marker.setDisplaySize(28, 32);
			this.pickupMarkers.set(pickup.id, marker);
		}
	}

	private renderTransitions(map: WorldMapDefinition) {
		for (const transition of map.transitions) {
			this.add
				.image(transition.x, transition.y, starterPackAsset.key, 'doorwayTile')
				.setDisplaySize(40, 40);
		}
	}

	private resolveFacing(direction: { x: number; y: number }, fallback: Direction): Direction {
		if (direction.x > 0) return 'right';
		if (direction.x < 0) return 'left';
		if (direction.y > 0) return 'down';
		if (direction.y < 0) return 'up';
		return fallback;
	}

	private resolveMap(mapId?: string): WorldMapDefinition {
		return maps[mapId ?? openingMapId] ?? maps[openingMapId];
	}

	private resumeStoredSave() {
		const storedSave = loadStoredSaveResult();

		if (storedSave.status === 'missing') {
			this.publishHudState('No save found');
			return;
		}

		if (storedSave.status === 'invalid') {
			this.scene.restart({ mapId: openingMapId, reason: 'invalid-save' });
			return;
		}

		this.scene.restart({ saveState: storedSave.saveState, reason: 'resume' });
	}

	private saveCurrentState() {
		saveGameState(this.buildSaveState());
		this.publishHudState('Saved');
	}

	private setupEncounter(map: WorldMapDefinition) {
		const encounter = map.encounter;

		if (!encounter) {
			return;
		}

		const definition = enemies[encounter.enemyId];
		const isCleared = this.clearedEncounterIds.has(definition.id);
		this.enemy = {
			completion: encounter.completion,
			defeated: isCleared,
			definition,
			attackCooldownUntil: 0,
			hp: isCleared ? 0 : definition.baseHp,
			invulnerableUntil: 0,
			maxHp: definition.baseHp,
			phase: 1,
			x: encounter.x,
			y: encounter.y
		};
		const actorId = getEnemyActorId(encounter.enemyId);
		const actorAnimation = getActorAnimationAsset(actorId);
		this.enemyMarker = this.add.sprite(
			encounter.x,
			encounter.y,
			animationPackAsset.key,
			actorAnimation.clips.idle.frames[0]
		) as ActorMarker;
		this.enemyMarker.setDisplaySize(
			actorAnimation.displaySize.width,
			actorAnimation.displaySize.height
		);
		this.enemyMarker.x = encounter.x;
		this.enemyMarker.y = encounter.y;
		this.enemyHealthBarBg = this.add.rectangle(
			encounter.x,
			encounter.y - WorldScene.enemyHealthBarOffsetY,
			34,
			4,
			0x0f172a,
			0.92
		) as OverlayMarker;
		this.enemyHealthBarFill = this.add.rectangle(
			encounter.x,
			encounter.y - WorldScene.enemyHealthBarOffsetY,
			30,
			2,
			0xff5d8f,
			1
		) as OverlayMarker;
		this.updateEnemyHealthBar();

		if (isCleared) {
			this.enemyMarker.setVisible(false);
			this.enemyHealthBarBg?.setVisible(false);
			this.enemyHealthBarFill?.setVisible(false);

			if (encounter.completion === 'victory') {
				this.showVictoryState();
			}
		} else {
			this.playEnemyAnimation('idle');
		}
	}

	private resolveInitialStatus(reason: NonNullable<WorldSceneData['reason']>) {
		if (reason === 'resume') return 'Save resumed';
		if (reason === 'transition') return 'Entered area';
		if (reason === 'invalid-save') return 'Invalid save reset';
		return 'New run';
	}

	private showVictoryState() {
		if (this.victoryAchieved) {
			return;
		}

		this.victoryAchieved = true;
		this.add.rectangle(
			this.worldSize.width / 2,
			this.worldSize.height / 2,
			this.worldSize.width,
			this.worldSize.height,
			0x0f172a,
			0.78
		);
		this.add
			.text(this.worldSize.width / 2, this.worldSize.height / 2, 'Victory: ruins cleared', {
				color: '#f8fafc',
				fontSize: '28px'
			})
			.setOrigin(0.5);
	}

	private awardEncounterDrops(encounterId: string) {
		if (!this.enemy) {
			return;
		}

		const drops =
			this.resolvedEncounterDrops[encounterId] ?? resolveLootDrops(this.enemy.definition.loot);
		this.resolvedEncounterDrops = { ...this.resolvedEncounterDrops, [encounterId]: drops };

		for (const drop of drops) {
			this.inventory = addItem(this.inventory, drop.itemId, drop.quantity);
		}
	}

	private tryTransition() {
		if (!this.player || (this.enemy && !this.enemy.defeated)) {
			return false;
		}

		const map = this.resolveMap(this.mapId);

		for (const transition of map.transitions) {
			const distance = Phaser.Math.Distance.Between(
				this.player.x,
				this.player.y,
				transition.x,
				transition.y
			);

			if (distance <= WorldScene.playerRadius + WorldScene.transitionRadius) {
				this.scene.restart({
					saveState: this.buildTransitionSaveState(transition),
					reason: 'transition'
				});
				return true;
			}
		}

		return false;
	}

	private tryCollectPickup() {
		if (!this.player) {
			return;
		}

		const map = this.resolveMap(this.mapId);

		for (const pickup of map.pickups ?? []) {
			if (this.collectedPickupIds.has(pickup.id)) {
				continue;
			}

			const distance = Phaser.Math.Distance.Between(
				this.player.x,
				this.player.y,
				pickup.x,
				pickup.y
			);

			if (distance > WorldScene.playerRadius + 18) {
				continue;
			}

			this.inventory = addItem(this.inventory, pickup.itemId, pickup.quantity);
			this.collectedPickupIds.add(pickup.id);
			this.pickupMarkers.get(pickup.id)?.setVisible(false);
			this.publishHudState(`Found ${getItem(pickup.itemId)?.name ?? 'item'}`);
			return;
		}
	}

	private updateBossPhase() {
		if (!this.enemy?.definition.boss) {
			return;
		}

		const nextState = advanceBossPhase({
			phase: this.enemy.phase,
			hp: this.enemy.hp,
			maxHp: this.enemy.maxHp
		});

		if (nextState.phase === this.enemy.phase) {
			return;
		}

		this.enemy.phase = nextState.phase;
		this.enemyMarker?.setTint(this.enemy.definition.boss.phaseTwoColor);
		this.publishHudState('Boss enraged');
	}

	private updateEnemyBehavior(time: number, delta: number) {
		if (!this.player || !this.enemy || this.enemy.defeated) {
			return;
		}

		let chaseDistance = 0;
		const distanceToPlayer = Phaser.Math.Distance.Between(
			this.player.x,
			this.player.y,
			this.enemy.x,
			this.enemy.y
		);

		if (distanceToPlayer > 0) {
			const chaseStep =
				this.getEnemyMoveSpeed() * (Math.min(delta, WorldScene.maxMovementDeltaMs) / 1000);
			chaseDistance = Math.min(
				chaseStep,
				Math.max(0, distanceToPlayer - WorldScene.enemyRadius)
			);
			const directionX = (this.player.x - this.enemy.x) / distanceToPlayer;
			const directionY = (this.player.y - this.enemy.y) / distanceToPlayer;

			this.enemy.x += directionX * chaseDistance;
			this.enemy.y += directionY * chaseDistance;
			if (this.enemyMarker) {
				this.enemyMarker.x = this.enemy.x;
				this.enemyMarker.y = this.enemy.y;
			}
			this.updateEnemyHealthBar();
		}
		this.setEnemyAnimation(chaseDistance > 0 ? 'walk' : 'idle');

		const contactDistance = Phaser.Math.Distance.Between(
			this.player.x,
			this.player.y,
			this.enemy.x,
			this.enemy.y
		);

		if (
			contactDistance > WorldScene.playerRadius + WorldScene.enemyRadius ||
			time < this.enemy.attackCooldownUntil ||
			time < this.playerInvulnerableUntil
		) {
			return;
		}

		this.playerProgress = {
			...this.playerProgress,
			hp: resolveHit(
				{ hp: this.playerProgress.hp, defense: this.getEffectiveStats().defense },
				{ power: this.enemy.definition.baseAttack }
			).hp
		};
		this.enemy.attackCooldownUntil = time + (this.enemy.definition.boss ? 450 : 700);
		this.playerInvulnerableUntil = time + 500;
		this.setEnemyAnimation('attack', false);
		if (this.playerProgress.hp === 0) {
			this.defeatHero();
		}
		this.publishHudState(this.playerProgress.hp === 0 ? 'Hero down' : 'Enemy struck first');
	}

	private getAttackFlashPosition() {
		if (!this.player) {
			return { x: 0, y: 0 };
		}

		if (this.facing === 'left') {
			return { x: this.player.x - 20, y: this.player.y };
		}

		if (this.facing === 'right') {
			return { x: this.player.x + 20, y: this.player.y };
		}

		if (this.facing === 'up') {
			return { x: this.player.x, y: this.player.y - 20 };
		}

		return { x: this.player.x, y: this.player.y + 20 };
	}

	private showAttackFlash() {
		if (!this.player) {
			return;
		}

		if (!this.attackFlash) {
			this.attackFlash = this.add.rectangle(
				this.player.x,
				this.player.y,
				18,
				18,
				0xfff0a8,
				0.82
			) as OverlayMarker;
		}

		const { x, y } = this.getAttackFlashPosition();
		this.attackFlash.setPosition(x, y);
		this.attackFlash.setVisible(true);
	}

	private updateEnemyHealthBar() {
		if (!this.enemy || !this.enemyHealthBarBg || !this.enemyHealthBarFill) {
			return;
		}

		if (this.enemy.defeated) {
			this.enemyHealthBarBg.setVisible(false);
			this.enemyHealthBarFill.setVisible(false);
			return;
		}

		const hpRatio = Math.max(0, this.enemy.hp / Math.max(this.enemy.maxHp, 1));
		const x = this.enemy.x;
		const y = this.enemy.y - WorldScene.enemyHealthBarOffsetY;

		this.enemyHealthBarBg.setPosition(x, y);
		this.enemyHealthBarFill.setPosition(x, y);
		this.enemyHealthBarBg.setVisible(true);
		this.enemyHealthBarFill.setVisible(true);
		this.enemyHealthBarFill.setScale(hpRatio, 1);
	}
}
