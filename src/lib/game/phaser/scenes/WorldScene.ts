import * as Phaser from 'phaser';

import {
	actorAnimationAssets,
	actorAnimationKeys,
	animationPackAsset,
	environmentDressingAsset,
	fenceDressingAsset,
	forestDressingAsset,
	getActorAnimationAsset,
	getEnemyActorId,
	getGroundFrameName,
	getVillageBuildingFrameName,
	isNpcPackFrameName,
	npcPackAsset,
	starterPackAsset,
	villageBuildingAsset,
	type ActorAnimationKey,
	type EnvironmentDressingFrameName,
	type StarterPackFrameName
} from '$lib/game/content/assets';
import { enemies, type EnemyCombatDefinition } from '$lib/game/content/enemies';
import {
	maps,
	openingMapId,
	type MapBlocker,
	type MapCombatBounds,
	type MapFenceSegment,
	type MapForestDecor,
	type MapForestZone,
	type MapGroundPatch,
	type MapLandmark,
	type MapNpc,
	type MapRect,
	type MapTransition,
	type WorldMapDefinition
} from '$lib/game/content/maps';
import { getItem, type EquipmentSlot } from '$lib/game/content/items';
import { startingPlayer } from '$lib/game/content/player';
import { isQuestId } from '$lib/game/content/quests';
import { getShop } from '$lib/game/content/shops';
import { advanceBossPhase } from '$lib/game/core/boss';
import { buildAreaMapState } from '$lib/game/core/area-map';
import { canReceiveHit, resolveHit } from '$lib/game/core/combat';
import { equipItem, unequipSlot } from '$lib/game/core/equipment';
import { resolveMovementVector } from '$lib/game/core/input';
import { addItem, consumeStackItem } from '$lib/game/core/inventory';
import { resolveLootDrops } from '$lib/game/core/loot';
import {
	cloneMapExploration,
	createEmptyMapExploration,
	revealMapArea,
	type MapExplorationState
} from '$lib/game/core/map-exploration';
import { applyExperienceGain, type ProgressionState } from '$lib/game/core/progression';
import {
	acceptQuest,
	applyQuestEvent,
	buildHudQuestState,
	cloneQuestState,
	createInitialQuestState,
	hasCompletedQuestObjective,
	type QuestEvent,
	type QuestRewardGrant,
	type QuestState
} from '$lib/game/core/quests';
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
import {
	advanceDialogue,
	buildDialogueFallback,
	buildQuestCompletionDialogue,
	chooseDialogueOption,
	startNpcDialogue,
	type DialogueChoiceResult,
	type DialogueIntent,
	type DialogueSession
} from '$lib/game/core/dialogue';
import type { Direction } from '$lib/game/core/types';
import { getItemText, getNpcText, getQuestText, getShopText } from '$lib/game/i18n/content';
import { getActiveLocale } from '$lib/game/i18n/store';
import { t, type MessageKey } from '$lib/game/i18n/translate';
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
	persistExplorationChanges?: boolean;
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

type LandmarkCollisionBounds = {
	left: number;
	right: number;
	top: number;
	bottom: number;
	centerX: number;
	centerY: number;
};

type CollisionRect = {
	left: number;
	right: number;
	top: number;
	bottom: number;
};

type EnemyMovementMode = 'idle' | 'chase' | 'return';

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
	homeX: number;
	homeY: number;
	hp: number;
	id: string;
	invulnerableUntil: number;
	marker: ActorMarker;
	maxHp: number;
	movementMode: EnemyMovementMode;
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
	private static readonly landmarkDoorwayClearanceWidth = 56;
	private static readonly npcCollisionScale = 0.7;
	private static readonly npcInteractionRadius = 36;
	private static readonly npcPackDisplaySize = { width: 48, height: 58 };
	private static readonly playerRadius = 12;
	private static readonly starterNpcDisplaySize = { width: 30, height: 36 };
	private static readonly tileSize = 32;
	private static readonly fenceTileLength = 64;
	private static readonly fenceTileThickness = 32;
	private static readonly environmentBlockerSegmentLength = 48;
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
	private quests: QuestState = createInitialQuestState();
	private mapExploration: MapExplorationState = createEmptyMapExploration();
	private mapId = openingMapId;
	private lastPublishedStatus = '';
	private shouldPersistExplorationChanges = true;
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
	private dialogueSession: DialogueSession | null = null;
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

	private getLocale() {
		return getActiveLocale();
	}

	private status(key: MessageKey, params: Record<string, string | number> = {}) {
		return t(this.getLocale(), key, params);
	}

	private getItemName(itemId: string | undefined, fallback = 'item') {
		if (!itemId) return fallback;
		return getItemText(this.getLocale(), itemId)?.name ?? getItem(itemId)?.name ?? fallback;
	}

	private getQuestTitle(questId: string | undefined, fallback = 'Quest') {
		if (!questId || !isQuestId(questId)) return fallback;
		return getQuestText(this.getLocale(), questId)?.title ?? fallback;
	}

	private getNpcName(npc: MapNpc) {
		return getNpcText(this.getLocale(), npc.id)?.name ?? npc.name;
	}

	private getGuildMasterName() {
		return getNpcText(this.getLocale(), 'guild-master')?.name ?? 'Guild Master Arlen';
	}

	private getTravelerSpeaker() {
		return this.status('content.dialogue.speakers.traveler');
	}

	private getShopSpeaker() {
		return this.status('content.dialogue.actions.shop');
	}

	create(data: WorldSceneData = {}) {
		const activeSave = data.saveState;
		const map = this.resolveMap(activeSave?.mapId ?? data.mapId);
		const width = map.width * WorldScene.tileSize;
		const height = map.height * WorldScene.tileSize;
		const reason = data.reason ?? (activeSave ? 'resume' : 'new');
		// A probe run can coexist with a stored save before the player chooses Resume. Do not
		// auto-persist exploration from that run over the stored save until it is resumed.
		this.shouldPersistExplorationChanges =
			data.persistExplorationChanges ??
			(activeSave !== undefined || loadStoredSaveResult().status === 'missing');

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
		this.quests = cloneQuestState(activeSave?.quests ?? createInitialQuestState());
		this.mapExploration = cloneMapExploration(
			activeSave?.mapExploration ?? createEmptyMapExploration()
		);
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
		this.dialogueSession = null;
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
		this.registerForestDressingFrames();
		this.registerFenceDressingFrames();
		this.registerEnvironmentDressingFrames();
		this.registerAnimationPackFrames();
		this.ensureActorAnimations();
		this.ensureTerrainTilesetTexture();
		this.renderGround(map);
		this.renderForestDressing(map);
		this.renderFences(map);
		this.renderBlockers(map);
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
		const cameraBounds = this.getCenteredCameraBounds(width, height);
		this.cameras.main.setBounds(
			cameraBounds.x,
			cameraBounds.y,
			cameraBounds.width,
			cameraBounds.height
		);
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

		const initialExplorationChanged = this.revealCurrentMapArea();
		if (initialExplorationChanged && this.shouldPersistExplorationChanges) {
			saveGameState(this.buildSaveState());
		}

		this.publishHudState(
			this.victoryAchieved
				? this.status('status.victoryRuinsCleared')
				: this.resolveInitialStatus(reason)
		);
	}

	private getCenteredCameraBounds(width: number, height: number) {
		const camera = this.cameras.main;
		const viewportWidth = camera.width > 0 ? camera.width : width;
		const viewportHeight = camera.height > 0 ? camera.height : height;
		const xPadding = Math.max(0, (viewportWidth - width) / 2);
		const yPadding = Math.max(0, (viewportHeight - height) / 2);

		return {
			x: xPadding === 0 ? 0 : -xPadding,
			y: yPadding === 0 ? 0 : -yPadding,
			width: width + xPadding * 2,
			height: height + yPadding * 2
		};
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

		const targetX = Math.min(Math.max(this.player.x + direction.x * step, min), maxX);
		const targetY = Math.min(Math.max(this.player.y + direction.y * step, min), maxY);
		const resolvedPosition = this.resolvePlayerCollision(
			this.player.x,
			this.player.y,
			targetX,
			targetY
		);

		this.player.x = resolvedPosition.x;
		this.player.y = resolvedPosition.y;
		this.facing = this.resolveFacing(direction, this.facing);

		const explorationChanged = this.revealCurrentMapArea();
		if (explorationChanged) {
			if (this.shouldPersistExplorationChanges) {
				saveGameState(this.buildSaveState());
			}
			this.publishHudState(this.lastPublishedStatus);
		}

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
				this.publishHudState(this.status('status.strikeLanded'));
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
			version: 5,
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
			},
			quests: cloneQuestState(this.quests),
			mapExploration: cloneMapExploration(this.mapExploration)
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
			this.publishHudState(this.status('status.noHealCharges'));
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
			this.publishHudState(this.status('status.itemCannotBeUsed'));
			return;
		}

		const maxHp = this.getEffectiveStats().maxHp;

		if (this.playerProgress.hp >= maxHp) {
			this.publishHudState(this.status('status.hpAlreadyFull'));
			return;
		}

		const result = consumeStackItem(this.inventory, itemId);

		if (!result.consumed) {
			this.publishHudState(this.status('status.itemCannotBeUsed'));
			return;
		}

		this.inventory = result.inventory;
		this.playerProgress = {
			...this.playerProgress,
			hp: Math.min(maxHp, this.playerProgress.hp + item.effect.amount)
		};
		this.publishHudState(this.status('status.recoveredHp'));
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

		this.applyQuestProgress(
			{
				type: 'defeat-enemy',
				mapId: this.mapId,
				encounterId: enemy.id,
				enemyId: enemy.definition.id,
				completion: enemy.completion
			},
			enemy.completion === 'victory'
				? this.status('status.victoryRuinsCleared')
				: this.status('status.enemyDefeated')
		);

		if (enemy.completion === 'victory') {
			this.showVictoryState();
		}
	}

	private equipInventoryItem(itemId: string) {
		const result = equipItem(this.equipment, this.inventory.equipment, itemId);

		if (!result.equipped) {
			this.publishHudState(this.status('status.itemCannotBeEquipped'));
			return;
		}

		this.equipment = result.equipment;
		this.playerProgress = {
			...this.playerProgress,
			hp: clampHpToMax(this.playerProgress.hp, this.getEffectiveStats())
		};
		this.publishHudState(this.status('status.equippedItem'));
	}

	private unequipInventorySlot(slot: EquipmentSlot) {
		this.equipment = unequipSlot(this.equipment, slot);
		this.playerProgress = {
			...this.playerProgress,
			hp: clampHpToMax(this.playerProgress.hp, this.getEffectiveStats())
		};
		this.publishHudState(this.status('status.unequippedItem'));
	}

	private openNearbyShop(shopId: string): boolean {
		if (this.nearbyShopId !== shopId || !getShop(shopId)) {
			this.dialogueSession = buildDialogueFallback(
				this.getShopSpeaker(),
				this.status('content.dialogue.system.shopOutOfReach')
			);
			this.publishHudState(this.status('status.noShopNearby'));
			return false;
		}

		this.openShopId = shopId;
		this.dialogueSession = null;
		this.publishHudState(this.status('status.shopOpened'));
		return true;
	}

	private closeOpenShop() {
		this.openShopId = null;
		this.publishHudState(this.status('status.shopClosed'));
	}

	private buyOpenShopItem(shopId: string, stockId: string) {
		if (this.openShopId !== shopId || this.nearbyShopId !== shopId) {
			this.publishHudState(this.status('status.noShopNearby'));
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
		this.publishHudState(this.status('status.boughtItem', { itemName: this.getItemName(itemId) }));
	}

	private sellOpenShopItem(itemId: string) {
		if (!this.openShopId || this.nearbyShopId !== this.openShopId) {
			this.publishHudState(this.status('status.noShopNearby'));
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
		this.publishHudState(this.status('status.soldItem', { itemName: this.getItemName(itemId) }));
	}

	private acceptGuildQuest(questId: string): boolean {
		const nearbyNpc = this.findNearbyNpc();

		if (nearbyNpc?.id !== 'guild-master') {
			this.dialogueSession = buildDialogueFallback(
				this.getGuildMasterName(),
				this.status('content.dialogue.system.noGuildQuestAvailableHere')
			);
			this.publishHudState(this.status('status.noGuildQuestAvailable'));
			return false;
		}

		this.currentNearbyNpcId = nearbyNpc.id;
		this.nearbyShopId = null;
		this.openShopId = null;

		const result = acceptQuest({
			state: this.quests,
			questId,
			worldFlags: {
				clearedEncounterIds: this.clearedEncounterIds,
				collectedPickupIds: this.collectedPickupIds
			}
		});

		if (!result.accepted) {
			const failureStatus = this.formatQuestAcceptFailure(result.reason);
			this.dialogueSession = buildDialogueFallback(this.getGuildMasterName(), failureStatus);
			this.publishHudState(this.formatQuestAcceptFailure(result.reason));
			return false;
		}

		this.quests = result.state;
		this.applyQuestRewards(result.rewards);
		this.dialogueSession =
			result.completedQuestIds.length > 0 && result.rewards[0]
				? buildQuestCompletionDialogue({
						questId: result.rewards[0].questId,
						title: result.rewards[0].title,
						reward: result.rewards[0].reward,
						locale: this.getLocale()
					})
				: null;
		this.publishHudState(
			result.completedQuestIds.length > 0
				? this.status('status.questComplete', {
						questTitle: this.getQuestTitle(
							result.rewards[0]?.questId,
							result.rewards[0]?.title ?? 'Quest'
						)
					})
				: this.status('status.questAccepted')
		);
		return true;
	}

	private formatQuestAcceptFailure(reason: string): string {
		if (reason === 'already-active') return this.status('status.questAlreadyActive');
		if (reason === 'already-completed') return this.status('status.questAlreadyComplete');
		if (reason === 'not-available') return this.status('status.questNotAvailable');

		return this.status('status.questCannotBeAccepted');
	}

	private applyQuestProgress(event: QuestEvent, fallbackStatus: string) {
		const result = applyQuestEvent({ state: this.quests, event });
		this.quests = result.state;
		this.applyQuestRewards(result.rewards);

		if (result.completedQuestIds.length > 0) {
			const rewardGrant = result.rewards[0];
			if (rewardGrant) {
				this.dialogueSession = buildQuestCompletionDialogue({
					questId: rewardGrant.questId,
					title: rewardGrant.title,
					reward: rewardGrant.reward,
					locale: this.getLocale()
				});
			}
			this.publishHudState(
				this.status('status.questComplete', {
					questTitle: this.getQuestTitle(
						result.rewards[0]?.questId,
						result.rewards[0]?.title ?? 'Quest'
					)
				})
			);
			return;
		}

		this.publishHudState(fallbackStatus);
	}

	private applyQuestRewards(rewards: QuestRewardGrant[]) {
		for (const grant of rewards) {
			if (grant.reward.xp) {
				this.playerProgress = this.applyReward(grant.reward.xp);
			}

			if (grant.reward.coins) {
				this.wallet = { coins: this.wallet.coins + grant.reward.coins };
			}

			for (const item of grant.reward.items ?? []) {
				this.inventory = addItem(this.inventory, item.itemId, item.quantity);
			}
		}
	}

	private formatBuyFailure(reason: ShopBuyFailureReason): string {
		if (reason === 'not-enough-coins') return this.status('status.notEnoughCoins');
		if (reason === 'out-of-stock') return this.status('status.itemOutOfStock');

		return this.status('status.itemCannotBeBought');
	}

	private formatSellFailure(reason: ShopSellFailureReason): string {
		if (reason === 'equipped-item') return this.status('status.equippedItemCannotBeSold');
		if (reason === 'item-not-owned') return this.status('status.itemNotOwned');

		return this.status('status.itemCannotBeSold');
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
			case 'accept-quest':
				this.acceptGuildQuest(command.questId);
				return;
			case 'dialogue-advance':
				this.advanceDialogueCommand();
				return;
			case 'dialogue-close':
				this.dialogueSession = null;
				this.publishHudState(this.status('status.dialogueClosed'));
				return;
			case 'dialogue-choose':
				this.chooseDialogueCommand(command.choiceId);
				return;
		}
	}

	private advanceDialogueCommand() {
		if (!this.dialogueSession) {
			return;
		}

		const previousSession = this.dialogueSession;
		const isTerminalLine = previousSession.lineIndex + 1 >= previousSession.lineCount;
		const advancedSession = advanceDialogue(previousSession);
		const completionIntent = isTerminalLine ? previousSession.completionIntent : null;

		if (isTerminalLine && !completionIntent && previousSession.choices.length === 0) {
			this.dialogueSession = null;
			this.publishHudState(this.status('status.dialogueClosed'));
			return;
		}

		this.dialogueSession = {
			...advancedSession,
			completionIntent: completionIntent ? null : advancedSession.completionIntent
		};

		if (completionIntent) {
			this.applyDialogueIntent(completionIntent);
			return;
		}

		this.publishHudState(this.status('status.dialogueUpdated'));
	}

	private chooseDialogueCommand(choiceId: string) {
		if (!this.dialogueSession) {
			this.dialogueSession = buildDialogueFallback(
				this.getTravelerSpeaker(),
				this.status('content.dialogue.system.noDialogueOpen')
			);
			this.publishHudState(this.status('status.noDialogueOpen'));
			return;
		}

		const result = chooseDialogueOption({
			session: this.dialogueSession,
			choiceId,
			questState: this.quests,
			locale: this.getLocale()
		});
		this.applyDialogueChoiceResult(result);
	}

	private applyDialogueChoiceResult(result: DialogueChoiceResult) {
		this.dialogueSession = result.session;

		if (result.intent) {
			this.applyDialogueIntent(result.intent);
			return;
		}

		this.publishHudState(this.status('status.dialogueUpdated'));
	}

	private applyDialogueIntent(intent: DialogueIntent) {
		switch (intent.type) {
			case 'recordNpcTalk':
				if (!this.isNpcDialogueInRange(intent.npcId)) {
					this.dialogueSession = buildDialogueFallback(
						this.getTravelerSpeaker(),
						this.status('content.dialogue.system.noOneNearby')
					);
					this.publishHudState(this.status('status.noOneNearby'));
					return;
				}

				this.applyQuestProgress(
					{ type: 'talk-to-npc', npcId: intent.npcId },
					this.status('status.ruinsRouteUnlocked')
				);
				return;
			case 'acceptQuest':
				this.acceptGuildQuest(intent.questId);
				return;
			case 'openShop':
				this.openNearbyShop(intent.shopId);
				return;
			case 'close':
				this.dialogueSession = null;
				this.publishHudState(this.status('status.dialogueClosed'));
				return;
			case 'talk':
			case 'showQuestList':
			case 'showQuestDetails':
				this.publishHudState(this.status('status.dialogueUpdated'));
				return;
		}
	}

	private publishHudState(status: string) {
		const saveResult = loadStoredSaveResult();
		const effectiveStats = this.getEffectiveStats();
		this.lastPublishedStatus = status;
		const map = this.resolveMap(this.mapId);
		const revealedCells = this.mapExploration[this.mapId] ?? [];

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
			areaMap: buildAreaMapState({
				map,
				player: {
					x: this.player?.x ?? map.spawn.x,
					y: this.player?.y ?? map.spawn.y
				},
				revealedCells,
				quests: this.quests,
				locale: this.getLocale()
			}),
			wallet: { ...this.wallet },
			nearbyShop: this.buildNearbyShop(),
			shop: this.buildOpenShop(),
			dialogue: this.buildHudDialogue(),
			quests: buildHudQuestState({
				state: this.quests,
				nearbyQuestGiverId: this.findNearbyNpc()?.id === 'guild-master' ? 'guild-master' : null,
				locale: this.getLocale()
			}),
			inventory: this.buildHudInventory()
		});
	}

	private buildHudDialogue(): HudState['dialogue'] {
		if (!this.dialogueSession) {
			return null;
		}

		return {
			id: this.dialogueSession.id,
			speaker: this.dialogueSession.speaker,
			line: this.dialogueSession.line,
			lineIndex: this.dialogueSession.lineIndex,
			lineCount: this.dialogueSession.lineCount,
			mode: this.dialogueSession.mode,
			choices: this.dialogueSession.choices.map((choice) => ({
				id: choice.id,
				label: choice.label
			})),
			canClose: this.dialogueSession.canClose
		};
	}

	private buildNearbyShop(): HudState['nearbyShop'] {
		if (!this.nearbyShopId) {
			return null;
		}

		const shop = getShop(this.nearbyShopId);

		if (!shop) {
			return null;
		}
		const shopText = getShopText(this.getLocale(), shop.id);

		return {
			shopId: shop.id,
			name: shopText?.name ?? shop.name,
			merchantName: shopText?.merchantName ?? shop.merchantName
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
		const locale = this.getLocale();
		const shopText = getShopText(locale, shop.id);

		return {
			shopId: shop.id,
			name: shopText?.name ?? shop.name,
			merchantName: shopText?.merchantName ?? shop.merchantName,
			buy: buildShopBuyEntries(shop.id, this.shopStockState, locale),
			sell: buildShopSellEntries({ inventory: this.inventory, equipment: this.equipment, locale })
		};
	}

	private isNpcDialogueInRange(npcId: string): boolean {
		return this.findNearbyNpc()?.dialogueId === npcId;
	}

	private isTransientFallbackDialogueSession(session: DialogueSession): boolean {
		return (
			session.id.startsWith('fallback:') &&
			session.npcId === null &&
			session.mode === 'system' &&
			session.choices.length === 0
		);
	}

	private buildHudInventory(): HudState['inventory'] {
		return {
			consumables: this.inventory.stacks.flatMap((stack) => {
				const item = getItem(stack.itemId);
				const itemText = item ? getItemText(this.getLocale(), item.id) : null;

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
			equipment: this.inventory.equipment.flatMap((itemId) => {
				const item = getItem(itemId);
				const itemText = item ? getItemText(this.getLocale(), item.id) : null;

				return item?.type === 'equipment'
					? [
							{
								itemId: item.id,
								name: itemText?.name ?? item.name,
								description: itemText?.description ?? item.description,
								iconPath: item.iconPath,
								slot: item.slot,
								equipped: this.equipment[item.slot] === item.id,
								modifiers: { ...item.modifiers }
							}
						]
					: [];
			}),
			keyItems: this.inventory.stacks.flatMap((stack) => {
				const item = getItem(stack.itemId);
				const itemText = item ? getItemText(this.getLocale(), item.id) : null;

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

	private registerForestDressingFrames() {
		const texture = this.textures.get(forestDressingAsset.key);

		for (const [frameName, frame] of Object.entries(forestDressingAsset.frames)) {
			if (!texture.has(frameName)) {
				texture.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);
			}
		}
	}

	private registerFenceDressingFrames() {
		const texture = this.textures.get(fenceDressingAsset.key);

		for (const [frameName, frame] of Object.entries(fenceDressingAsset.frames)) {
			if (!texture.has(frameName)) {
				texture.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);
			}
		}
	}

	private registerEnvironmentDressingFrames() {
		const texture = this.textures.get(environmentDressingAsset.key);

		for (const [frameName, frame] of Object.entries(environmentDressingAsset.frames)) {
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
				const patchTile = this.findGroundPatchTile(map, column, row);

				if (patchTile !== undefined) {
					return patchTile;
				}

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

	private findGroundPatchTile(
		map: WorldMapDefinition,
		column: number,
		row: number
	): number | undefined {
		const patches: MapGroundPatch[] = map.groundPatches ?? [];
		const tileCenterX = column * WorldScene.tileSize + WorldScene.tileSize / 2;
		const tileCenterY = row * WorldScene.tileSize + WorldScene.tileSize / 2;

		for (let index = patches.length - 1; index >= 0; index -= 1) {
			const patch = patches[index]!;

			if (this.isPointInsideGenericMapRect(tileCenterX, tileCenterY, patch)) {
				return WorldScene.terrainTileIndexes[patch.tile];
			}
		}

		return undefined;
	}

	private isPointInsideGenericMapRect(x: number, y: number, rect: MapRect, padding = 0): boolean {
		const bounds = this.getMapRectBounds(rect);

		return (
			x >= bounds.left - padding &&
			x <= bounds.right + padding &&
			y >= bounds.top - padding &&
			y <= bounds.bottom + padding
		);
	}

	private getEnemyMoveSpeed(enemy: EnemyInstance) {
		if (enemy.definition.boss && enemy.phase === 2) {
			return enemy.definition.moveSpeed * 1.5;
		}

		return enemy.definition.moveSpeed;
	}

	private resolveEnemyMovementTarget(enemy: EnemyInstance): { x: number; y: number } | undefined {
		if (!this.player) {
			return undefined;
		}

		const map = this.resolveMap(this.mapId);
		const combatBounds = this.findLeashBoundsForEnemy(map, enemy);

		if (!combatBounds) {
			enemy.movementMode = 'chase';
			return { x: this.player.x, y: this.player.y };
		}

		const distanceToPlayer = Phaser.Math.Distance.Between(
			this.player.x,
			this.player.y,
			enemy.x,
			enemy.y
		);
		const playerDistanceFromHome = Phaser.Math.Distance.Between(
			this.player.x,
			this.player.y,
			enemy.homeX,
			enemy.homeY
		);
		const playerInsideForest = this.isPointInsideMapRect(
			this.player.x,
			this.player.y,
			combatBounds,
			WorldScene.playerRadius
		);
		const playerWithinLeash =
			playerInsideForest && playerDistanceFromHome <= combatBounds.leashRadius;
		const canAcquire = distanceToPlayer <= combatBounds.aggroRadius;
		const canContinueChase = enemy.movementMode === 'chase' && playerWithinLeash;

		if (playerWithinLeash && (canAcquire || canContinueChase)) {
			enemy.movementMode = 'chase';
			return { x: this.player.x, y: this.player.y };
		}

		if (Phaser.Math.Distance.Between(enemy.x, enemy.y, enemy.homeX, enemy.homeY) > 2) {
			enemy.movementMode = 'return';
			return { x: enemy.homeX, y: enemy.homeY };
		}

		enemy.movementMode = 'idle';
		return undefined;
	}

	private findCombatBoundsForEnemy(
		map: WorldMapDefinition,
		enemy: EnemyInstance
	): MapCombatBounds | undefined {
		return (map.combatBounds ?? []).find((combatBounds) =>
			combatBounds.encounterIds.includes(enemy.id)
		);
	}

	private findLeashBoundsForEnemy(
		map: WorldMapDefinition,
		enemy: EnemyInstance
	): MapCombatBounds | MapForestZone | undefined {
		return (
			this.findCombatBoundsForEnemy(map, enemy) ??
			(enemy.definition.id === 'slime-scout' ? map.forestZone : undefined)
		);
	}

	private isPointInsideMapRect(x: number, y: number, rect: MapRect, padding = 0): boolean {
		const bounds = this.getMapRectBounds(rect);

		return (
			x >= bounds.left - padding &&
			x <= bounds.right + padding &&
			y >= bounds.top - padding &&
			y <= bounds.bottom + padding
		);
	}

	private clampPointToMapRect(
		x: number,
		y: number,
		rect: MapRect,
		padding = 0
	): { x: number; y: number } {
		const bounds = this.getMapRectBounds(rect);

		return {
			x: Math.min(Math.max(x, bounds.left + padding), bounds.right - padding),
			y: Math.min(Math.max(y, bounds.top + padding), bounds.bottom - padding)
		};
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

	private renderForestDressing(map: WorldMapDefinition) {
		const forestZone: MapForestZone | undefined = map.forestZone;
		const forestDecor: MapForestDecor[] = map.forestDecor ?? [];

		if (!forestZone && forestDecor.length === 0) {
			return;
		}

		for (const decor of forestDecor) {
			if (decor.frameName === 'forestEntrance') {
				this.add
					.image(decor.x, decor.y, forestDressingAsset.key, decor.frameName)
					.setDisplaySize(decor.width, decor.height);
				continue;
			}

			this.add.tileSprite(
				decor.x,
				decor.y,
				decor.width,
				decor.height,
				forestDressingAsset.key,
				decor.frameName
			);
		}
	}

	private renderFences(map: WorldMapDefinition) {
		const fences: MapFenceSegment[] = map.fences ?? [];

		for (const fence of fences) {
			this.renderFenceSegment(fence);
		}
	}

	private renderBlockers(map: WorldMapDefinition) {
		const blockers: MapBlocker[] = map.blockers ?? [];

		for (const blocker of blockers) {
			switch (blocker.kind) {
				case 'ocean':
					this.add.rectangle(blocker.x, blocker.y, blocker.width, blocker.height, 0x1d5f9f, 0.92);
					break;

				case 'town-hedge':
					this.renderBlockerSegments(blocker, forestDressingAsset.key, 'treeCluster');
					break;

				case 'city-wall':
					this.renderBlockerSegments(
						blocker,
						environmentDressingAsset.key,
						this.getBlockerFrameName(blocker)
					);
					break;

				case 'future-gate':
				case 'ruin-wall':
					this.add.tileSprite(
						blocker.x,
						blocker.y,
						blocker.width,
						blocker.height,
						environmentDressingAsset.key,
						this.getBlockerFrameName(blocker)
					);
					break;

				default:
					blocker.kind satisfies never;
					throw new Error(`Unknown blocker kind: ${blocker.kind}`);
			}
		}
	}

	private renderBlockerSegments(blocker: MapBlocker, textureKey: string, frameName: string) {
		const isHorizontal = blocker.width >= blocker.height;
		const length = isHorizontal ? blocker.width : blocker.height;
		const tileCount = Math.max(1, Math.ceil(length / WorldScene.environmentBlockerSegmentLength));
		const firstOffset = -((tileCount - 1) * WorldScene.environmentBlockerSegmentLength) / 2;
		const displayWidth = isHorizontal ? WorldScene.environmentBlockerSegmentLength : blocker.width;
		const displayHeight = isHorizontal
			? blocker.height
			: WorldScene.environmentBlockerSegmentLength;

		for (let index = 0; index < tileCount; index += 1) {
			const offset = firstOffset + index * WorldScene.environmentBlockerSegmentLength;
			const x = blocker.x + (isHorizontal ? offset : 0);
			const y = blocker.y + (isHorizontal ? 0 : offset);

			this.add.image(x, y, textureKey, frameName).setDisplaySize(displayWidth, displayHeight);
		}
	}

	private getBlockerFrameName(blocker: MapBlocker): EnvironmentDressingFrameName {
		const orientation = blocker.width >= blocker.height ? 'Horizontal' : 'Vertical';

		switch (blocker.kind) {
			case 'ocean':
				throw new Error('Ocean blockers are rendered as rectangles, not sprites');

			case 'future-gate':
				return 'futureGate';

			case 'ruin-wall':
				return 'ruinWall';

			case 'town-hedge':
				return `townHedge${orientation}` as EnvironmentDressingFrameName;

			case 'city-wall':
				return `townWall${orientation}` as EnvironmentDressingFrameName;

			default:
				blocker.kind satisfies never;
				throw new Error(`Unknown blocker kind: ${blocker.kind}`);
		}
	}

	private renderFenceSegment(fence: MapFenceSegment) {
		const isHorizontal = fence.width >= fence.height;
		const length = isHorizontal ? fence.width : fence.height;
		const tileCount = Math.max(1, Math.ceil(length / WorldScene.fenceTileLength));
		const firstOffset = -((tileCount - 1) * WorldScene.fenceTileLength) / 2;
		const frameName = isHorizontal ? 'horizontalFence' : 'verticalFence';
		const displayWidth = isHorizontal ? WorldScene.fenceTileLength : WorldScene.fenceTileThickness;
		const displayHeight = isHorizontal ? WorldScene.fenceTileThickness : WorldScene.fenceTileLength;

		for (let index = 0; index < tileCount; index += 1) {
			const offset = firstOffset + index * WorldScene.fenceTileLength;
			const x = fence.x + (isHorizontal ? offset : 0);
			const y = fence.y + (isHorizontal ? 0 : offset);

			this.add
				.image(x, y, fenceDressingAsset.key, frameName)
				.setDisplaySize(displayWidth, displayHeight);
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

			if (transition.marker === 'stair') {
				this.renderStairTransition(transition.x, transition.y);
				continue;
			}

			this.add
				.image(transition.x, transition.y, starterPackAsset.key, 'doorwayTile')
				.setDisplaySize(40, 40);
		}
	}

	private renderStairTransition(x: number, y: number) {
		this.add.image(x, y, environmentDressingAsset.key, 'stoneStair').setDisplaySize(56, 42);
	}

	private resolveFacing(direction: { x: number; y: number }, fallback: Direction): Direction {
		if (direction.x > 0) return 'right';
		if (direction.x < 0) return 'left';
		if (direction.y > 0) return 'down';
		if (direction.y < 0) return 'up';
		return fallback;
	}

	private resolvePlayerCollision(
		currentX: number,
		currentY: number,
		targetX: number,
		targetY: number
	) {
		let x = targetX;
		let y = targetY;

		if (this.isPlayerMovementBlocked(currentX, currentY, x, currentY)) {
			x = currentX;
		}

		if (this.isPlayerMovementBlocked(x, currentY, x, y)) {
			y = currentY;
		}

		return { x, y };
	}

	private isPlayerMovementBlocked(
		currentX: number,
		currentY: number,
		targetX: number,
		targetY: number
	): boolean {
		return (
			this.isPlayerMovementBlockedByNpc(currentX, currentY, targetX, targetY) ||
			this.isPlayerMovementBlockedByLandmark(currentX, currentY, targetX, targetY) ||
			this.isPlayerMovementBlockedByFence(currentX, currentY, targetX, targetY) ||
			this.isPlayerMovementBlockedByBlocker(currentX, currentY, targetX, targetY) ||
			this.isPlayerMovementBlockedByForestDecor(currentX, currentY, targetX, targetY)
		);
	}

	private isPlayerMovementBlockedByNpc(
		currentX: number,
		currentY: number,
		targetX: number,
		targetY: number
	): boolean {
		const map = this.resolveMap(this.mapId);

		return (map.npcs ?? []).some((npc) => {
			const currentDistance = Phaser.Math.Distance.Between(currentX, currentY, npc.x, npc.y);
			const targetDistance = Phaser.Math.Distance.Between(targetX, targetY, npc.x, npc.y);
			const collisionRadius = WorldScene.playerRadius + this.getNpcCollisionRadius(npc);

			if (currentDistance < collisionRadius) {
				return targetDistance <= currentDistance;
			}

			return this.doesMovementSegmentIntersectNpc(
				currentX,
				currentY,
				targetX,
				targetY,
				npc,
				collisionRadius
			);
		});
	}

	private doesMovementSegmentIntersectNpc(
		currentX: number,
		currentY: number,
		targetX: number,
		targetY: number,
		npc: MapNpc,
		collisionRadius: number
	): boolean {
		const segmentX = targetX - currentX;
		const segmentY = targetY - currentY;
		const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

		if (segmentLengthSquared === 0) {
			return Phaser.Math.Distance.Between(currentX, currentY, npc.x, npc.y) < collisionRadius;
		}

		const npcOffsetX = npc.x - currentX;
		const npcOffsetY = npc.y - currentY;
		const closestPointRatio = Math.min(
			Math.max((npcOffsetX * segmentX + npcOffsetY * segmentY) / segmentLengthSquared, 0),
			1
		);
		const closestX = currentX + segmentX * closestPointRatio;
		const closestY = currentY + segmentY * closestPointRatio;

		return Phaser.Math.Distance.Between(closestX, closestY, npc.x, npc.y) < collisionRadius;
	}

	private getNpcCollisionRadius(npc: MapNpc): number {
		const displaySize = isNpcPackFrameName(npc.frameName)
			? WorldScene.npcPackDisplaySize
			: WorldScene.starterNpcDisplaySize;

		return (Math.min(displaySize.width, displaySize.height) / 2) * WorldScene.npcCollisionScale;
	}

	private isPlayerMovementBlockedByLandmark(
		currentX: number,
		currentY: number,
		targetX: number,
		targetY: number
	): boolean {
		const map = this.resolveMap(this.mapId);

		return (map.landmarks ?? []).some((landmark) => {
			const bounds = this.getLandmarkCollisionBounds(landmark);

			return this.getLandmarkCollisionRects(landmark, bounds).some((rect) =>
				this.isPlayerMovementBlockedByRect(currentX, currentY, targetX, targetY, rect, bounds)
			);
		});
	}

	private isPlayerMovementBlockedByFence(
		currentX: number,
		currentY: number,
		targetX: number,
		targetY: number
	): boolean {
		const map = this.resolveMap(this.mapId);

		return (map.fences ?? []).some((fence) => {
			const bounds = this.getMapRectBounds(fence);

			return this.isMovementBlockedByStrictRect(
				currentX,
				currentY,
				targetX,
				targetY,
				bounds,
				WorldScene.playerRadius
			);
		});
	}

	private isPlayerMovementBlockedByBlocker(
		currentX: number,
		currentY: number,
		targetX: number,
		targetY: number
	): boolean {
		const map = this.resolveMap(this.mapId);

		return (map.blockers ?? []).some((blocker) => {
			const bounds = this.getMapRectBounds(blocker);

			return this.isMovementBlockedByStrictRect(
				currentX,
				currentY,
				targetX,
				targetY,
				bounds,
				WorldScene.playerRadius
			);
		});
	}

	private isPlayerMovementBlockedByForestDecor(
		currentX: number,
		currentY: number,
		targetX: number,
		targetY: number
	): boolean {
		const map = this.resolveMap(this.mapId);
		const forestDecor = map.forestDecor ?? [];
		const entranceBounds = forestDecor
			.filter((decor) => decor.frameName === 'forestEntrance')
			.map((decor) => this.getMapRectBounds(decor));

		return forestDecor.some((decor) => {
			if (decor.frameName !== 'treeCluster') {
				return false;
			}

			const bounds = this.getMapRectBounds(decor);

			return this.getForestTreeCollisionRects(bounds, entranceBounds).some((rect) =>
				this.isMovementBlockedByStrictRect(
					currentX,
					currentY,
					targetX,
					targetY,
					rect,
					WorldScene.playerRadius
				)
			);
		});
	}

	private getLandmarkCollisionBounds(landmark: MapLandmark): LandmarkCollisionBounds {
		const left = landmark.x - landmark.width / 2;
		const right = landmark.x + landmark.width / 2;
		const top = landmark.y - landmark.height / 2;
		const bottom = landmark.y + landmark.height / 2;

		return {
			left,
			right,
			top,
			bottom,
			centerX: landmark.x,
			centerY: landmark.y
		};
	}

	private getMapRectBounds(
		rect: MapFenceSegment | MapForestDecor | MapForestZone | MapBlocker | MapCombatBounds
	): LandmarkCollisionBounds {
		const left = rect.x - rect.width / 2;
		const right = rect.x + rect.width / 2;
		const top = rect.y - rect.height / 2;
		const bottom = rect.y + rect.height / 2;

		return {
			left,
			right,
			top,
			bottom,
			centerX: rect.x,
			centerY: rect.y
		};
	}

	private getForestTreeCollisionRects(
		bounds: LandmarkCollisionBounds,
		entranceBounds: LandmarkCollisionBounds[]
	): CollisionRect[] {
		return entranceBounds.reduce<CollisionRect[]>(
			(rects, entrance) =>
				rects.flatMap((rect) => this.splitForestTreeCollisionRect(rect, entrance)),
			[bounds]
		);
	}

	private splitForestTreeCollisionRect(
		rect: CollisionRect,
		entrance: CollisionRect
	): CollisionRect[] {
		if (!this.doRectsOverlap(rect, entrance)) {
			return [rect];
		}

		const rectWidth = rect.right - rect.left;
		const rectHeight = rect.bottom - rect.top;

		if (rectHeight > rectWidth) {
			return [
				{ left: rect.left, right: rect.right, top: rect.top, bottom: entrance.top },
				{ left: rect.left, right: rect.right, top: entrance.bottom, bottom: rect.bottom }
			].filter((collisionRect) => collisionRect.bottom > collisionRect.top);
		}

		return [
			{ left: rect.left, right: entrance.left, top: rect.top, bottom: rect.bottom },
			{ left: entrance.right, right: rect.right, top: rect.top, bottom: rect.bottom }
		].filter((collisionRect) => collisionRect.right > collisionRect.left);
	}

	private doRectsOverlap(rect: CollisionRect, other: CollisionRect): boolean {
		return (
			rect.left < other.right &&
			rect.right > other.left &&
			rect.top < other.bottom &&
			rect.bottom > other.top
		);
	}

	private getLandmarkCollisionRects(
		landmark: MapLandmark,
		bounds: LandmarkCollisionBounds
	): CollisionRect[] {
		const doorway = this.findLandmarkDoorway(landmark, bounds);

		if (!doorway) {
			return [bounds];
		}

		const doorLeft = Math.max(
			bounds.left,
			doorway.x - WorldScene.landmarkDoorwayClearanceWidth / 2
		);
		const doorRight = Math.min(
			bounds.right,
			doorway.x + WorldScene.landmarkDoorwayClearanceWidth / 2
		);
		const doorTop = Math.max(bounds.top, doorway.y - WorldScene.transitionRadius);

		return [
			{ left: bounds.left, right: bounds.right, top: bounds.top, bottom: doorTop },
			{ left: bounds.left, right: doorLeft, top: doorTop, bottom: bounds.bottom },
			{ left: doorRight, right: bounds.right, top: doorTop, bottom: bounds.bottom }
		].filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
	}

	private findLandmarkDoorway(landmark: MapLandmark, bounds: LandmarkCollisionBounds) {
		const map = this.resolveMap(this.mapId);

		return map.transitions.find(
			(transition) =>
				transition.showMarker === false &&
				transition.x >= bounds.left &&
				transition.x <= bounds.right &&
				transition.y >= bounds.top &&
				transition.y <= bounds.bottom &&
				transition.id.includes(landmark.id.replace('-exterior', ''))
		);
	}

	private isPlayerMovementBlockedByRect(
		currentX: number,
		currentY: number,
		targetX: number,
		targetY: number,
		rect: CollisionRect,
		bounds: LandmarkCollisionBounds
	) {
		if (currentY >= bounds.bottom && targetY >= bounds.bottom) {
			return false;
		}

		const currentInside = this.isPointInsideRect(currentX, currentY, rect, WorldScene.playerRadius);
		const targetInside = this.isPointInsideRect(targetX, targetY, rect, WorldScene.playerRadius);

		if (currentInside) {
			return (
				targetInside &&
				this.getPointDistanceFromBoundsCenter(targetX, targetY, bounds) <=
					this.getPointDistanceFromBoundsCenter(currentX, currentY, bounds)
			);
		}

		return this.doesMovementSegmentIntersectRect(
			currentX,
			currentY,
			targetX,
			targetY,
			rect,
			WorldScene.playerRadius
		);
	}

	private isMovementBlockedByStrictRect(
		currentX: number,
		currentY: number,
		targetX: number,
		targetY: number,
		rect: CollisionRect,
		padding: number
	) {
		const currentInside = this.isPointInsideRect(currentX, currentY, rect, padding);
		const targetInside = this.isPointInsideRect(targetX, targetY, rect, padding);

		if (currentInside) {
			return targetInside;
		}

		return this.doesMovementSegmentIntersectRect(
			currentX,
			currentY,
			targetX,
			targetY,
			rect,
			padding
		);
	}

	private isPointInsideRect(x: number, y: number, rect: CollisionRect, padding: number) {
		return (
			x >= rect.left - padding &&
			x <= rect.right + padding &&
			y >= rect.top - padding &&
			y <= rect.bottom + padding
		);
	}

	private getPointDistanceFromBoundsCenter(x: number, y: number, bounds: LandmarkCollisionBounds) {
		const offsetX = x - bounds.centerX;
		const offsetY = y - bounds.centerY;

		return offsetX * offsetX + offsetY * offsetY;
	}

	private doesMovementSegmentIntersectRect(
		currentX: number,
		currentY: number,
		targetX: number,
		targetY: number,
		rect: CollisionRect,
		padding: number
	): boolean {
		const left = rect.left - padding;
		const right = rect.right + padding;
		const top = rect.top - padding;
		const bottom = rect.bottom + padding;
		const deltaX = targetX - currentX;
		const deltaY = targetY - currentY;
		let entry = 0;
		let exit = 1;

		if (deltaX === 0) {
			if (currentX < left || currentX > right) {
				return false;
			}
		} else {
			const axisEntry = Math.min((left - currentX) / deltaX, (right - currentX) / deltaX);
			const axisExit = Math.max((left - currentX) / deltaX, (right - currentX) / deltaX);
			entry = Math.max(entry, axisEntry);
			exit = Math.min(exit, axisExit);
		}

		if (deltaY === 0) {
			if (currentY < top || currentY > bottom) {
				return false;
			}
		} else {
			const axisEntry = Math.min((top - currentY) / deltaY, (bottom - currentY) / deltaY);
			const axisExit = Math.max((top - currentY) / deltaY, (bottom - currentY) / deltaY);
			entry = Math.max(entry, axisEntry);
			exit = Math.min(exit, axisExit);
		}

		return entry <= exit && exit >= 0 && entry <= 1;
	}

	private resolveMap(mapId?: string): WorldMapDefinition {
		return maps[mapId ?? openingMapId] ?? maps[openingMapId];
	}

	private revealCurrentMapArea(): boolean {
		if (!this.player) return false;
		const map = this.resolveMap(this.mapId);
		const result = revealMapArea({
			exploration: this.mapExploration,
			mapId: this.mapId,
			x: this.player.x,
			y: this.player.y,
			mapWidth: map.width * WorldScene.tileSize,
			mapHeight: map.height * WorldScene.tileSize
		});
		this.mapExploration = result.exploration;
		return result.changed;
	}

	private resumeStoredSave() {
		const storedSave = loadStoredSaveResult();

		if (storedSave.status === 'missing') {
			this.publishHudState(this.status('status.noSaveFound'));
			return;
		}

		if (storedSave.status === 'invalid') {
			this.scene.restart({ mapId: openingMapId, reason: 'invalid-save' });
			return;
		}

		this.scene.restart({ saveState: storedSave.saveState, reason: 'resume' });
	}

	private saveCurrentState() {
		this.shouldPersistExplorationChanges = true;
		saveGameState(this.buildSaveState());
		this.publishHudState(this.status('status.saved'));
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
				homeX: encounter.x,
				homeY: encounter.y,
				hp: isCleared ? 0 : definition.baseHp,
				id: encounter.id,
				invulnerableUntil: 0,
				marker,
				maxHp: definition.baseHp,
				movementMode: 'idle',
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
		if (reason === 'resume') return this.status('status.saveResumed');
		if (reason === 'transition') return this.status('status.enteredArea');
		if (reason === 'invalid-save') return this.status('status.invalidSaveReset');
		return this.status('status.newRun');
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
			.text(
				this.worldSize.width / 2,
				this.worldSize.height / 2,
				this.status('status.victoryRuinsCleared'),
				{
					color: '#f8fafc',
					fontSize: '28px'
				}
			)
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
				if (transition.questRequirement) {
					const { questId, objectiveId } = transition.questRequirement;

					if (
						!isQuestId(questId) ||
						!hasCompletedQuestObjective(this.quests, questId, objectiveId)
					) {
						this.publishHudState(this.status('status.reportToGuildMasterFirst'));
						return false;
					}
				}

				this.scene.restart({
					saveState: this.buildTransitionSaveState(transition),
					...(this.shouldPersistExplorationChanges ? {} : { persistExplorationChanges: false }),
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
				this.publishHudState(this.status('status.shopOutOfReach'));
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
		this.publishHudState(this.status('status.npcNearby', { npcName: this.getNpcName(nearbyNpc) }));
	}

	private handleInteractInput() {
		if (!this.hasInteractJustDown()) {
			return;
		}

		const nearbyNpc = this.findNearbyNpc();

		if (this.dialogueSession) {
			if (!nearbyNpc || !this.isTransientFallbackDialogueSession(this.dialogueSession)) {
				return;
			}
		}

		this.interactWithNearbyNpc(nearbyNpc);
	}

	private hasInteractJustDown() {
		return this.interactKeys.reduce(
			(pressed, key) => Phaser.Input.Keyboard.JustDown(key) || pressed,
			false
		);
	}

	private interactWithNearbyNpc(nearbyNpc = this.findNearbyNpc()) {
		if (this.dialogueSession && !this.isTransientFallbackDialogueSession(this.dialogueSession)) {
			return;
		}

		if (!nearbyNpc) {
			this.dialogueSession = buildDialogueFallback(
				this.getTravelerSpeaker(),
				this.status('content.dialogue.system.noOneNearby')
			);
			this.publishHudState(this.status('status.noOneNearby'));
			return;
		}

		this.currentNearbyNpcId = nearbyNpc.id;
		this.nearbyShopId = nearbyNpc.shopId ?? null;
		this.dialogueSession = startNpcDialogue({
			npcId: nearbyNpc.dialogueId,
			questState: this.quests,
			locale: this.getLocale()
		});
		this.publishHudState(this.status('status.npcNearby', { npcName: this.getNpcName(nearbyNpc) }));
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
			this.applyQuestProgress(
				{
					type: 'collect-item',
					mapId: this.mapId,
					pickupId: pickup.id,
					itemId: pickup.itemId,
					quantity: pickup.quantity
				},
				this.status('status.foundItem', { itemName: this.getItemName(pickup.itemId) })
			);
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
		this.publishHudState(this.status('status.bossEnraged'));
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
			const movementTarget = this.resolveEnemyMovementTarget(enemy);

			if (movementTarget) {
				const distanceToTarget = Phaser.Math.Distance.Between(
					movementTarget.x,
					movementTarget.y,
					enemy.x,
					enemy.y
				);

				if (distanceToTarget > 0) {
					const chaseStep =
						this.getEnemyMoveSpeed(enemy) * (Math.min(delta, WorldScene.maxMovementDeltaMs) / 1000);
					chaseDistance = Math.min(
						chaseStep,
						enemy.movementMode === 'chase'
							? Math.max(0, distanceToTarget - WorldScene.enemyAttackReach)
							: distanceToTarget
					);
					const directionX = (movementTarget.x - enemy.x) / distanceToTarget;
					const directionY = (movementTarget.y - enemy.y) / distanceToTarget;
					let nextX = enemy.x + directionX * chaseDistance;
					let nextY = enemy.y + directionY * chaseDistance;
					const map = this.resolveMap(this.mapId);
					const combatBounds = this.findLeashBoundsForEnemy(map, enemy);

					if (combatBounds) {
						const clamped = this.clampPointToMapRect(
							nextX,
							nextY,
							combatBounds,
							WorldScene.enemyRadius
						);
						nextX = clamped.x;
						nextY = clamped.y;
					}

					enemy.x = nextX;
					enemy.y = nextY;
					enemy.marker.x = enemy.x;
					enemy.marker.y = enemy.y;
					this.updateEnemyHealthBar(enemy);
				}
			}
			this.updateEnemyMovementAnimation(enemy, chaseDistance > 0 ? 'walk' : 'idle', time);

			if (!this.canEnemyAttackPlayer(enemy)) {
				continue;
			}

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
			this.publishHudState(
				this.playerProgress.hp === 0
					? this.status('status.heroDown')
					: this.status('status.enemyStruckFirst')
			);
		}
	}

	private canEnemyAttackPlayer(enemy: EnemyInstance): boolean {
		const map = this.resolveMap(this.mapId);
		const combatBounds = this.findLeashBoundsForEnemy(map, enemy);

		if (!combatBounds) {
			return true;
		}

		return enemy.movementMode === 'chase';
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
