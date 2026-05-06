import * as Phaser from 'phaser';

import {
	actorAnimationAssets,
	actorAnimationKeys,
	animationPackAsset,
	getActorAnimationAsset,
	getEnemyActorId,
	getGroundFrameName,
	getVillageBuildingFrameName,
	isNpcPackFrameName,
	npcPackAsset,
	starterPackAsset,
	villageBuildingAsset,
	type ActorAnimationKey,
	type StarterPackFrameName
} from '$lib/game/content/assets';
import { enemies, type EnemyCombatDefinition } from '$lib/game/content/enemies';
import {
	maps,
	openingMapId,
	type MapNpc,
	type MapTransition,
	type WorldMapDefinition
} from '$lib/game/content/maps';
import { getItem, type EquipmentSlot } from '$lib/game/content/items';
import { startingPlayer } from '$lib/game/content/player';
import { getShop } from '$lib/game/content/shops';
import { advanceBossPhase } from '$lib/game/core/boss';
import { canReceiveHit, resolveHit } from '$lib/game/core/combat';
import { equipItem, unequipSlot } from '$lib/game/core/equipment';
import { resolveMovementVector } from '$lib/game/core/input';
import { addItem, consumeStackItem } from '$lib/game/core/inventory';
import { resolveLootDrops } from '$lib/game/core/loot';
import { applyExperienceGain, type ProgressionState } from '$lib/game/core/progression';
import {
	buildShopBuyEntries,
	buildShopSellEntries,
	buyShopItem,
	createInitialShopStockState,
	sellInventoryItem,
	type ShopBuyFailureReason,
	type ShopSellFailureReason,
	type ShopStockState,
	type WalletState
} from '$lib/game/core/shop';
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
	clearTint: () => unknown;
	setDisplaySize: (width: number, height: number) => unknown;
	setTint: (color: number) => unknown;
	setVisible: (visible: boolean) => unknown;
	play: (key: string, ignoreIfPlaying?: boolean) => unknown;
	once: (event: string, callback: () => void) => unknown;
};

type OverlayMarker = {
	x?: number;
	y?: number;
	setAlpha: (alpha: number) => unknown;
	setOrigin?: (x: number, y?: number) => unknown;
	setPosition: (x: number, y: number) => unknown;
	setScale: (x: number, y?: number) => unknown;
	setVisible: (visible: boolean) => unknown;
};

type HitImpactLayers = {
	arc: OverlayMarker;
	core: OverlayMarker;
	ring: OverlayMarker;
	spark: OverlayMarker;
};

type PickupMarker = {
	setDisplaySize: (width: number, height: number) => unknown;
	setVisible: (visible: boolean) => unknown;
};

type NpcMarker = {
	setDisplaySize: (width: number, height: number) => unknown;
};

type TilemapLayer = {
	setDepth?: (depth: number) => unknown;
};

type EnemyInstance = {
	completion?: 'victory';
	defeated: boolean;
	definition: EnemyCombatDefinition;
	attackCooldownUntil: number;
	animationLockedUntil: number;
	deathAnimationPending: boolean;
	healthBarBg: OverlayMarker;
	healthBarFill: OverlayMarker;
	hitReactionUntil: number;
	hp: number;
	id: string;
	invulnerableUntil: number;
	marker: ActorMarker;
	maxHp: number;
	phase: 1 | 2;
	visualState: ActorAnimationKey;
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

function cloneShopStockState(shopStockState: ShopStockState): ShopStockState {
	return Object.fromEntries(
		Object.entries(shopStockState).map(([shopId, stockById]) => [shopId, { ...stockById }])
	);
}

export class WorldScene extends Phaser.Scene {
	static readonly key = 'world';
	private static readonly attackReach = 40;
	private static readonly autoAttackCooldownMs = 450;
	private static readonly enemyAttackReach = 40;
	private static readonly enemyInvulnerabilityMs = 250;
	private static readonly enemyRadius = 10;
	private static readonly hitReactionDurationMs = 450;
	private static readonly hitReactionTint = 0xfff0a8;
	private static readonly hitImpactDurationMs = 450;
	private static readonly hitImpactTint = 0xff8a1f;
	private static readonly hitImpactCoreTint = 0xffffff;
	private static readonly hitImpactRingTint = 0xfff0a8;
	private static readonly hitImpactSparkTint = 0xfff7d6;
	private static readonly maxMovementDeltaMs = 250;
	private static readonly npcInteractionRadius = 36;
	private static readonly npcPackDisplaySize = { width: 48, height: 58 };
	private static readonly playerRadius = 12;
	private static readonly starterNpcDisplaySize = { width: 30, height: 36 };
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

	private clearedEncounterIds = new Set<string>();
	private collectedPickupIds = new Set<string>();
	private cursorKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;
	private enemies: EnemyInstance[] = [];
	private facing: Direction = 'down';
	private heroAnimationLockedUntil = 0;
	private heroDefeated = false;
	private heroHitReactionUntil = 0;
	private heroVisualState: ActorAnimationKey = 'idle';
	private hitImpactLayers?: HitImpactLayers;
	private hitImpactStartedAt = 0;
	private hitImpactUntil = 0;
	private interactKeys: Phaser.Input.Keyboard.Key[] = [];
	private inventory: SaveState['inventory'] = cloneInventory(createNewSaveState().inventory);
	private mapId = openingMapId;
	private currentNearbyNpcId: string | null = null;
	private npcMarkers = new Map<string, NpcMarker>();
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
	private wallet: WalletState = { ...createNewSaveState().wallet };
	private shopStockState: ShopStockState = cloneShopStockState(createInitialShopStockState());
	private nearbyShopId: string | null = null;
	private openShopId: string | null = null;
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

		this.clearedEncounterIds = new Set(activeSave?.flags.clearedEncounters ?? []);
		this.collectedPickupIds = new Set(activeSave?.flags.collectedPickups ?? []);
		this.enemies = [];
		this.facing = activeSave?.player.facing ?? map.spawnDirection;
		this.heroAnimationLockedUntil = 0;
		this.heroDefeated = false;
		this.heroHitReactionUntil = 0;
		this.heroVisualState = 'idle';
		this.hitImpactLayers = undefined;
		this.hitImpactStartedAt = 0;
		this.hitImpactUntil = 0;
		this.inventory = cloneInventory(activeSave?.inventory ?? createNewSaveState().inventory);
		this.equipment = { ...(activeSave?.equipment ?? createNewSaveState().equipment) };
		this.wallet = { ...(activeSave?.wallet ?? createNewSaveState().wallet) };
		this.shopStockState = cloneShopStockState(
			activeSave?.shops.stock ?? createInitialShopStockState()
		);
		this.resolvedEncounterDrops = cloneResolvedEncounterDrops(
			activeSave?.flags.resolvedEncounterDrops ?? {}
		);
		this.mapId = map.id;
		this.currentNearbyNpcId = null;
		this.nearbyShopId = null;
		this.openShopId = null;
		this.npcMarkers.clear();
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
		this.registerNpcPackFrames();
		this.registerVillageBuildingFrames();
		this.registerAnimationPackFrames();
		this.ensureActorAnimations();
		this.ensureTerrainTilesetTexture();
		this.renderGround(map);
		this.renderLandmarks(map);
		const heroAnimation = getActorAnimationAsset('hero');
		this.player = this.add.sprite(
			activeSave?.player.x ?? map.spawn.x,
			activeSave?.player.y ?? map.spawn.y,
			animationPackAsset.key,
			heroAnimation.clips.idle.frames[0]
		) as ActorMarker;
		this.player.setDisplaySize(heroAnimation.displaySize.width, heroAnimation.displaySize.height);
		if (this.playerProgress.hp === 0) {
			this.defeatHero();
		} else {
			this.playHeroAnimation('idle');
		}

		this.setupEncounters(map);
		this.renderTransitions(map);
		this.renderPickups(map);
		this.renderNpcs(map);

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
		const keyboard = this.input?.keyboard;
		this.interactKeys = keyboard
			? [
					keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
					keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
					keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
				]
			: [];
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

		this.updateHitReactions(time);

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

		this.updateNpcDialogue();
		this.handleInteractInput();
		this.tryCollectPickup();

		const attackTarget =
			time >= this.playerAttackCooldownUntil ? this.findHeroAttackTarget(time) : undefined;

		if (attackTarget) {
			this.playerAttackCooldownUntil = time + WorldScene.autoAttackCooldownMs;
			this.playHeroAttackAnimation(time);
			const effectiveStats = this.getEffectiveStats();
			attackTarget.hp = resolveHit(
				{ hp: attackTarget.hp, defense: 0 },
				{ power: effectiveStats.attack }
			).hp;
			attackTarget.invulnerableUntil = time + WorldScene.enemyInvulnerabilityMs;
			this.updateEnemyHealthBar(attackTarget);
			this.updateBossPhase(attackTarget);

			if (attackTarget.hp === 0) {
				this.finishEncounter(attackTarget);
			} else {
				this.playEnemyHitReaction(attackTarget, time);
				this.showHitImpact(attackTarget.x, attackTarget.y, time);
				this.publishHudState('Strike landed');
			}
		}

		if (!this.hasLivingEnemies()) {
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

	private findHeroAttackTarget(time: number) {
		if (!this.player) {
			return undefined;
		}

		return this.enemies
			.filter((enemy) => !enemy.defeated && canReceiveHit(enemy, time))
			.map((enemy) => ({
				enemy,
				distance: Phaser.Math.Distance.Between(this.player!.x, this.player!.y, enemy.x, enemy.y)
			}))
			.filter(
				({ distance }) =>
					distance <= WorldScene.playerRadius + WorldScene.enemyRadius + WorldScene.attackReach
			)
			.sort((left, right) => left.distance - right.distance)[0]?.enemy;
	}

	private buildSaveState(): SaveState {
		return {
			version: 3,
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
			equipment: { ...this.equipment },
			wallet: { ...this.wallet },
			shops: {
				stock: cloneShopStockState(this.shopStockState)
			}
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

	private finishEncounter(enemy: EnemyInstance) {
		if (enemy.defeated) {
			return;
		}

		enemy.defeated = true;
		this.playEnemyDeathAnimation(enemy);
		this.clearedEncounterIds.add(enemy.id);
		this.awardEncounterDrops(enemy);
		this.wallet = { coins: this.wallet.coins + enemy.definition.coinReward };
		this.playerProgress = this.applyReward(enemy.definition.xpReward);

		if (enemy.completion === 'victory') {
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

	private openNearbyShop(shopId: string) {
		if (this.nearbyShopId !== shopId || !getShop(shopId)) {
			this.publishHudState('No shop nearby');
			return;
		}

		this.openShopId = shopId;
		this.publishHudState('Shop opened');
	}

	private closeOpenShop() {
		this.openShopId = null;
		this.publishHudState('Shop closed');
	}

	private buyOpenShopItem(shopId: string, stockId: string) {
		if (this.openShopId !== shopId || this.nearbyShopId !== shopId) {
			this.publishHudState('No shop nearby');
			return;
		}

		const result = buyShopItem({
			shopId,
			stockId,
			wallet: this.wallet,
			inventory: this.inventory,
			stockState: this.shopStockState
		});

		if (!result.purchased) {
			this.publishHudState(this.formatBuyFailure(result.reason));
			return;
		}

		const itemId = getShop(shopId)?.stock.find((entry) => entry.id === stockId)?.itemId;
		this.wallet = result.wallet;
		this.inventory = result.inventory;
		this.shopStockState = result.stockState;
		this.publishHudState(`Bought ${getItem(itemId ?? '')?.name ?? 'item'}`);
	}

	private sellOpenShopItem(itemId: string) {
		if (!this.openShopId || this.nearbyShopId !== this.openShopId) {
			this.publishHudState('No shop nearby');
			return;
		}

		const result = sellInventoryItem({
			itemId,
			wallet: this.wallet,
			inventory: this.inventory,
			equipment: this.equipment
		});

		if (!result.sold) {
			this.publishHudState(this.formatSellFailure(result.reason));
			return;
		}

		this.wallet = result.wallet;
		this.inventory = result.inventory;
		this.publishHudState(`Sold ${getItem(itemId)?.name ?? 'item'}`);
	}

	private formatBuyFailure(reason: ShopBuyFailureReason): string {
		if (reason === 'not-enough-coins') return 'Not enough coins';
		if (reason === 'out-of-stock') return 'Item out of stock';

		return 'Item cannot be bought';
	}

	private formatSellFailure(reason: ShopSellFailureReason): string {
		if (reason === 'equipped-item') return 'Equipped item cannot be sold';
		if (reason === 'item-not-owned') return 'Item not owned';

		return 'Item cannot be sold';
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
			case 'open-shop':
				this.openNearbyShop(command.shopId);
				return;
			case 'close-shop':
				this.closeOpenShop();
				return;
			case 'buy-shop-item':
				this.buyOpenShopItem(command.shopId, command.stockId);
				return;
			case 'sell-inventory-item':
				this.sellOpenShopItem(command.itemId);
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
			wallet: { ...this.wallet },
			nearbyShop: this.buildNearbyShop(),
			shop: this.buildOpenShop(),
			inventory: this.buildHudInventory()
		});
	}

	private buildNearbyShop(): HudState['nearbyShop'] {
		if (!this.nearbyShopId) {
			return null;
		}

		const shop = getShop(this.nearbyShopId);

		if (!shop) {
			return null;
		}

		return {
			shopId: shop.id,
			name: shop.name,
			merchantName: shop.merchantName
		};
	}

	private buildOpenShop(): HudState['shop'] {
		if (!this.openShopId || this.openShopId !== this.nearbyShopId) {
			return null;
		}

		const shop = getShop(this.openShopId);

		if (!shop) {
			return null;
		}

		return {
			shopId: shop.id,
			name: shop.name,
			merchantName: shop.merchantName,
			buy: buildShopBuyEntries(shop.id, this.shopStockState),
			sell: buildShopSellEntries({ inventory: this.inventory, equipment: this.equipment })
		};
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

	private registerNpcPackFrames() {
		const texture = this.textures.get(npcPackAsset.key);

		for (const [frameName, frame] of Object.entries(npcPackAsset.frames)) {
			if (!texture.has(frameName)) {
				texture.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);
			}
		}
	}

	private registerVillageBuildingFrames() {
		const texture = this.textures.get(villageBuildingAsset.key);

		for (const [frameName, frame] of Object.entries(villageBuildingAsset.frames)) {
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

	private playEnemyAnimation(
		enemy: EnemyInstance,
		clipName: ActorAnimationKey,
		ignoreIfPlaying = true
	) {
		enemy.marker.play(
			getActorAnimationAsset(getEnemyActorId(enemy.definition.id)).clips[clipName].key,
			ignoreIfPlaying
		);
	}

	private setEnemyAnimation(
		enemy: EnemyInstance,
		clipName: ActorAnimationKey,
		ignoreIfPlaying = true
	) {
		if (enemy.defeated || enemy.deathAnimationPending) {
			return;
		}

		if (enemy.visualState === clipName && ignoreIfPlaying) {
			return;
		}

		enemy.visualState = clipName;
		this.playEnemyAnimation(enemy, clipName, ignoreIfPlaying);
	}

	private updateEnemyMovementAnimation(
		enemy: EnemyInstance,
		clipName: ActorAnimationKey,
		time: number
	) {
		if (time < enemy.animationLockedUntil) {
			return;
		}

		this.setEnemyAnimation(enemy, clipName);
	}

	private playEnemyDeathAnimation(enemy: EnemyInstance) {
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
			getActorAnimationAsset(getEnemyActorId(enemy.definition.id)).clips.dead.key
		}`;

		if (enemy.marker.once) {
			enemy.marker.once(completionEvent, hideDefeatedEnemy);
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

	private getEnemyMoveSpeed(enemy: EnemyInstance) {
		if (enemy.definition.boss && enemy.phase === 2) {
			return enemy.definition.moveSpeed * 1.5;
		}

		return enemy.definition.moveSpeed;
	}

	private renderLandmarks(map: WorldMapDefinition) {
		for (const landmark of map.landmarks ?? []) {
			const frameName = getVillageBuildingFrameName(landmark.id);

			if (frameName) {
				this.add
					.image(landmark.x, landmark.y, villageBuildingAsset.key, frameName)
					.setDisplaySize(landmark.width, landmark.height);
			} else {
				this.add.rectangle(landmark.x, landmark.y, landmark.width, landmark.height, 0x5b4636, 0.9);
				this.add.rectangle(
					landmark.x,
					landmark.y + landmark.height / 2,
					landmark.width,
					24,
					0x2f241c,
					0.95
				);
			}

			const label = this.add.text(
				landmark.x,
				landmark.y - landmark.height / 2 + 4,
				landmark.label,
				{
					color: '#f8fafc',
					fontSize: '12px'
				}
			) as OverlayMarker;
			label.setOrigin?.(0.5, 0);
		}
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

	private renderNpcs(map: WorldMapDefinition) {
		this.npcMarkers.clear();

		for (const npc of map.npcs ?? []) {
			const usesNpcPack = isNpcPackFrameName(npc.frameName);
			const marker = this.add.image(
				npc.x,
				npc.y,
				usesNpcPack ? npcPackAsset.key : starterPackAsset.key,
				npc.frameName
			) as NpcMarker;
			const displaySize = usesNpcPack
				? WorldScene.npcPackDisplaySize
				: WorldScene.starterNpcDisplaySize;
			marker.setDisplaySize(displaySize.width, displaySize.height);
			this.npcMarkers.set(npc.id, marker);
		}
	}

	private renderTransitions(map: WorldMapDefinition) {
		for (const transition of map.transitions) {
			if (transition.showMarker === false) {
				continue;
			}

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

	private setupEncounters(map: WorldMapDefinition) {
		for (const encounter of map.encounters ?? []) {
			const definition = enemies[encounter.enemyId];
			const isCleared =
				this.clearedEncounterIds.has(encounter.id) || this.clearedEncounterIds.has(definition.id);
			const actorId = getEnemyActorId(encounter.enemyId);
			const actorAnimation = getActorAnimationAsset(actorId);
			const marker = this.add.sprite(
				encounter.x,
				encounter.y,
				animationPackAsset.key,
				actorAnimation.clips.idle.frames[0]
			) as ActorMarker;
			const healthBarBg = this.add.rectangle(
				encounter.x,
				encounter.y - WorldScene.enemyHealthBarOffsetY,
				34,
				4,
				0x0f172a,
				0.92
			) as OverlayMarker;
			const healthBarFill = this.add.rectangle(
				encounter.x,
				encounter.y - WorldScene.enemyHealthBarOffsetY,
				30,
				2,
				0xff5d8f,
				1
			) as OverlayMarker;
			const enemy: EnemyInstance = {
				completion: encounter.completion,
				defeated: isCleared,
				definition,
				attackCooldownUntil: 0,
				animationLockedUntil: 0,
				deathAnimationPending: false,
				healthBarBg,
				healthBarFill,
				hitReactionUntil: 0,
				hp: isCleared ? 0 : definition.baseHp,
				id: encounter.id,
				invulnerableUntil: 0,
				marker,
				maxHp: definition.baseHp,
				phase: 1,
				visualState: 'idle',
				x: encounter.x,
				y: encounter.y
			};

			marker.setDisplaySize(actorAnimation.displaySize.width, actorAnimation.displaySize.height);
			marker.x = encounter.x;
			marker.y = encounter.y;
			this.enemies.push(enemy);
			this.updateEnemyHealthBar(enemy);

			if (isCleared) {
				marker.setVisible(false);
				healthBarBg.setVisible(false);
				healthBarFill.setVisible(false);

				if (encounter.completion === 'victory') {
					this.showVictoryState();
				}
			} else {
				this.playEnemyAnimation(enemy, 'idle');
			}
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

	private awardEncounterDrops(enemy: EnemyInstance) {
		const encounterId = enemy.id;
		const drops =
			this.resolvedEncounterDrops[encounterId] ?? resolveLootDrops(enemy.definition.loot);
		this.resolvedEncounterDrops = { ...this.resolvedEncounterDrops, [encounterId]: drops };

		for (const drop of drops) {
			this.inventory = addItem(this.inventory, drop.itemId, drop.quantity);
		}
	}

	private tryTransition() {
		if (!this.player) {
			return false;
		}

		const map = this.resolveMap(this.mapId);
		const hasLivingEnemies = this.hasLivingEnemies();

		for (const transition of map.transitions) {
			if (transition.requiresClear === true && hasLivingEnemies) {
				continue;
			}

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

	private hasLivingEnemies() {
		return this.enemies.some((enemy) => !enemy.defeated);
	}

	private updateNpcDialogue() {
		if (!this.player) {
			return;
		}

		const nearbyNpc = this.findNearbyNpc();

		if (!nearbyNpc) {
			const hadShop = this.nearbyShopId !== null;
			this.currentNearbyNpcId = null;
			this.nearbyShopId = null;
			this.openShopId = null;

			if (hadShop) {
				this.publishHudState('Shop out of reach');
			}

			return;
		}

		this.nearbyShopId = nearbyNpc.shopId ?? null;

		if (this.openShopId && this.openShopId !== this.nearbyShopId) {
			this.openShopId = null;
		}

		if (this.currentNearbyNpcId === nearbyNpc.id) {
			return;
		}

		this.currentNearbyNpcId = nearbyNpc.id;
		this.publishHudState(`${nearbyNpc.name}: ${nearbyNpc.dialogue}`);
	}

	private handleInteractInput() {
		if (!this.interactKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
			return;
		}

		this.interactWithNearbyNpc();
	}

	private interactWithNearbyNpc() {
		const nearbyNpc = this.findNearbyNpc();

		if (!nearbyNpc) {
			this.publishHudState('No one nearby');
			return;
		}

		this.currentNearbyNpcId = nearbyNpc.id;
		this.nearbyShopId = nearbyNpc.shopId ?? null;

		if (nearbyNpc.shopId) {
			this.openNearbyShop(nearbyNpc.shopId);
			return;
		}

		this.publishHudState(`${nearbyNpc.name}: ${nearbyNpc.dialogue}`);
	}

	private findNearbyNpc(): MapNpc | undefined {
		if (!this.player) {
			return undefined;
		}

		const map = this.resolveMap(this.mapId);

		return (map.npcs ?? [])
			.map((npc) => ({
				npc,
				distance: Phaser.Math.Distance.Between(this.player!.x, this.player!.y, npc.x, npc.y)
			}))
			.filter(
				({ distance }) => distance <= WorldScene.playerRadius + WorldScene.npcInteractionRadius
			)
			.sort((left, right) => left.distance - right.distance)[0]?.npc;
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

	private updateBossPhase(enemy: EnemyInstance) {
		if (!enemy.definition.boss) {
			return;
		}

		const nextState = advanceBossPhase({
			phase: enemy.phase,
			hp: enemy.hp,
			maxHp: enemy.maxHp
		});

		if (nextState.phase === enemy.phase) {
			return;
		}

		enemy.phase = nextState.phase;
		enemy.marker.setTint(enemy.definition.boss.phaseTwoColor);
		this.publishHudState('Boss enraged');
	}

	private updateEnemyBehavior(time: number, delta: number) {
		if (!this.player) {
			return;
		}

		for (const enemy of this.enemies) {
			if (enemy.defeated) {
				continue;
			}

			let chaseDistance = 0;
			const distanceToPlayer = Phaser.Math.Distance.Between(
				this.player.x,
				this.player.y,
				enemy.x,
				enemy.y
			);

			if (distanceToPlayer > 0) {
				const chaseStep =
					this.getEnemyMoveSpeed(enemy) * (Math.min(delta, WorldScene.maxMovementDeltaMs) / 1000);
				chaseDistance = Math.min(
					chaseStep,
					Math.max(0, distanceToPlayer - WorldScene.enemyAttackReach)
				);
				const directionX = (this.player.x - enemy.x) / distanceToPlayer;
				const directionY = (this.player.y - enemy.y) / distanceToPlayer;

				enemy.x += directionX * chaseDistance;
				enemy.y += directionY * chaseDistance;
				enemy.marker.x = enemy.x;
				enemy.marker.y = enemy.y;
				this.updateEnemyHealthBar(enemy);
			}
			this.updateEnemyMovementAnimation(enemy, chaseDistance > 0 ? 'walk' : 'idle', time);

			const contactDistance = Phaser.Math.Distance.Between(
				this.player.x,
				this.player.y,
				enemy.x,
				enemy.y
			);

			if (
				contactDistance > WorldScene.enemyAttackReach ||
				time < enemy.attackCooldownUntil ||
				time < this.playerInvulnerableUntil
			) {
				continue;
			}

			this.playerProgress = {
				...this.playerProgress,
				hp: resolveHit(
					{ hp: this.playerProgress.hp, defense: this.getEffectiveStats().defense },
					{ power: enemy.definition.baseAttack }
				).hp
			};
			enemy.attackCooldownUntil = time + (enemy.definition.boss ? 450 : 700);
			this.playerInvulnerableUntil = time + 500;
			enemy.animationLockedUntil = time + 400;
			this.setEnemyAnimation(enemy, 'attack', false);
			if (this.playerProgress.hp === 0) {
				this.defeatHero();
			} else {
				this.playHeroHitReaction(time);
			}
			this.publishHudState(this.playerProgress.hp === 0 ? 'Hero down' : 'Enemy struck first');
		}
	}

	private playEnemyHitReaction(enemy: EnemyInstance, time: number) {
		enemy.hitReactionUntil = time + WorldScene.hitReactionDurationMs;
		enemy.marker.setTint(WorldScene.hitReactionTint);
	}

	private playHeroHitReaction(time: number) {
		this.heroHitReactionUntil = time + WorldScene.hitReactionDurationMs;
		this.player?.setTint(WorldScene.hitReactionTint);
	}

	private showHitImpact(x: number, y: number, time: number) {
		if (!this.hitImpactLayers) {
			this.hitImpactLayers = {
				arc: this.add.arc(
					x,
					y,
					32,
					210,
					330,
					false,
					WorldScene.hitImpactTint,
					0.98
				) as OverlayMarker,
				spark: this.add.arc(
					x,
					y,
					16,
					20,
					160,
					false,
					WorldScene.hitImpactSparkTint,
					1
				) as OverlayMarker,
				ring: this.add.arc(
					x,
					y,
					26,
					0,
					360,
					false,
					WorldScene.hitImpactRingTint,
					0.72
				) as OverlayMarker,
				core: this.add.arc(
					x,
					y,
					10,
					0,
					360,
					false,
					WorldScene.hitImpactCoreTint,
					0.92
				) as OverlayMarker
			};
		}

		this.hitImpactStartedAt = time;
		this.hitImpactUntil = time + WorldScene.hitImpactDurationMs;

		for (const layer of Object.values(this.hitImpactLayers)) {
			layer.setPosition(x, y);
			layer.setVisible(true);
		}

		this.hitImpactLayers.arc.setScale(1.08, 0.74);
		this.hitImpactLayers.arc.setAlpha(0.98);
		this.hitImpactLayers.spark.setScale(0.95, 0.48);
		this.hitImpactLayers.spark.setAlpha(1);
		this.hitImpactLayers.ring.setScale(0.55, 0.55);
		this.hitImpactLayers.ring.setAlpha(0.72);
		this.hitImpactLayers.core.setScale(0.85, 0.85);
		this.hitImpactLayers.core.setAlpha(0.92);
	}

	private updateHitImpactAnimation(time: number) {
		if (!this.hitImpactLayers || this.hitImpactUntil === 0) {
			return;
		}

		if (time >= this.hitImpactUntil) {
			this.hitImpactUntil = 0;
			for (const layer of Object.values(this.hitImpactLayers)) {
				layer.setVisible(false);
			}
			return;
		}

		const progress = Math.max(
			0,
			Math.min(1, (time - this.hitImpactStartedAt) / Math.max(WorldScene.hitImpactDurationMs, 1))
		);

		this.hitImpactLayers.arc.setScale(1.08 + progress * 0.42, 0.74 + progress * 0.22);
		this.hitImpactLayers.arc.setAlpha(0.98 * (1 - progress * 0.62));
		this.hitImpactLayers.spark.setScale(0.95 + progress * 0.75, 0.48 + progress * 0.26);
		this.hitImpactLayers.spark.setAlpha(1 * (1 - progress * 0.95));
		this.hitImpactLayers.ring.setScale(0.55 + progress * 1.95, 0.55 + progress * 1.95);
		this.hitImpactLayers.ring.setAlpha(0.72 * (1 - progress * 0.85));
		this.hitImpactLayers.core.setScale(0.85 + progress * 0.95, 0.85 + progress * 0.95);
		this.hitImpactLayers.core.setAlpha(0.92 * (1 - progress * 0.72));
	}

	private updateHitReactions(time: number) {
		this.updateHitImpactAnimation(time);

		if (this.player && this.heroHitReactionUntil > 0 && time >= this.heroHitReactionUntil) {
			this.heroHitReactionUntil = 0;
			this.player.clearTint();
		}

		for (const enemy of this.enemies) {
			if (enemy.hitReactionUntil === 0 || time < enemy.hitReactionUntil || enemy.defeated) {
				continue;
			}

			enemy.hitReactionUntil = 0;
			if (enemy.definition.boss && enemy.phase === 2) {
				enemy.marker.setTint(enemy.definition.boss.phaseTwoColor);
			} else {
				enemy.marker.clearTint();
			}
		}
	}

	private updateEnemyHealthBar(enemy: EnemyInstance) {
		if (enemy.defeated) {
			enemy.healthBarBg.setVisible(false);
			enemy.healthBarFill.setVisible(false);
			return;
		}

		const hpRatio = Math.max(0, enemy.hp / Math.max(enemy.maxHp, 1));
		const x = enemy.x;
		const y = enemy.y - WorldScene.enemyHealthBarOffsetY;
		enemy.healthBarBg.setPosition(x, y);
		enemy.healthBarFill.setPosition(x - 15 + (30 * hpRatio) / 2, y);
		enemy.healthBarFill.setScale(hpRatio, 1);
		enemy.healthBarBg.setVisible(true);
		enemy.healthBarFill.setVisible(true);
	}
}
