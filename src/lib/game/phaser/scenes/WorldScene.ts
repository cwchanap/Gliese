import * as Phaser from 'phaser';

import { ambienceFor, musicFor, sceneMusic, sceneSfx } from '$lib/game/content/audio';
import { lightingFor, type LightGrade } from '$lib/game/content/lighting';
import { playSfx, setAmbience, setMusic } from '$lib/game/phaser/audio';
import {
	actorAnimationAssets,
	actorAnimationKeys,
	animationPackAsset,
	environmentDressingAsset,
	getActorAnimationAsset,
	getEnemyActorId,
	interiorPropAsset,
	isNpcPackFrameName,
	npcPackAsset,
	starterPackAsset,
	terrainFrameOrder,
	terrainTilesAsset,
	type ActorAnimationKey,
	type EnvironmentDressingFrameName
} from '$lib/game/content/assets';
import { enemies, type EnemyCombatDefinition } from '$lib/game/content/enemies';
import {
	getMapBackgroundDepth,
	shouldRenderOwnedVisual
} from '$lib/game/content/maps/background-ownership';
import {
	applyMapBackgroundPackage,
	resolveMapBackgroundPackageSelection,
	type MapBackgroundPackagePresentation,
	type MapBackgroundPackageSelection
} from '$lib/game/content/backgrounds/map-background-package';
import {
	findMap,
	maps,
	openingMapId,
	type MapBlocker,
	type MapCombatBounds,
	type MapDiscovery,
	type MapGroundPatch,
	type MapGroundTile,
	type MapAmbientNpc,
	type MapInteriorProp,
	type MapNpc,
	type MapRect,
	type MapTransition,
	type WorldMapDefinition
} from '$lib/game/content/maps';
import {
	buildMapNavigationObstacles,
	resolveMapNavigationGrid
} from '$lib/game/content/maps/navigation';
import { GRID_OBJECT_SHEET, type GridObject } from '$lib/game/content/maps/grid/objects';
import {
	facesSealedGate,
	isGridWorldMap,
	resolveGridObjects,
	resolveGridTileLayers,
	type GridWorldMap
} from '$lib/game/content/maps/grid/runtime';
import { GRID_TILESET } from '$lib/game/content/maps/grid/tileset';
import { getItem, type EquipmentSlot } from '$lib/game/content/items';
import { startingPlayer } from '$lib/game/content/player';
import { isQuestId, type QuestEffect } from '$lib/game/content/quests';
import { getShop } from '$lib/game/content/shops';
import {
	emitRegionalBackgroundPlaneRenderDiagnostic,
	type RegionalBackgroundPlaneRenderDiagnosticEntry,
	type RegionalBackgroundRenderStatus
} from '$lib/game/phaser/regional-background-plane-render-diagnostics';
import { emitPlayerMovementDiagnostic } from '$lib/game/phaser/player-movement-diagnostics';
import { emitWorldSceneCameraDiagnostic } from '$lib/game/phaser/world-scene-camera-diagnostic';
import { advanceBossPhase } from '$lib/game/core/boss';
import { buildAreaMapState, getRegionId } from '$lib/game/core/area-map';
import {
	applyBattleResultToSaveState,
	rollBattleEnemyCount,
	type BattleResult,
	type RecentlyFledEncounter
} from '$lib/game/core/battle';
import { canReceiveHit } from '$lib/game/core/combat';
import {
	MAP_TRANSITION_RADIUS,
	MAP_TRANSITION_TRIGGER_RADIUS,
	NPC_INTERACTION_RADIUS,
	NPC_PACK_COLLISION_RADIUS,
	PLAYER_COLLISION_RADIUS,
	STARTER_NPC_COLLISION_RADIUS
} from '$lib/game/core/collision';
import { equipItem, grantItems, unequipSlot } from '$lib/game/core/equipment';
import { fieldCameraZoom } from '$lib/game/core/field-camera';
import {
	DEFAULT_HERO_HALF_SIZE,
	heroScreenPosition,
	isHeroInHeroCardZone
} from '$lib/game/core/hud-occlusion';
import { selectNearbyCandidate } from '$lib/game/core/interaction';
import { resolveMovementVector } from '$lib/game/core/input';
import { consumeStackItem } from '$lib/game/core/inventory';
import {
	entersUnrelatedDoorZone,
	isInTransitionZone,
	resolveMovementSegment,
	type NavigationGrid,
	type NavigationObstacle
} from '$lib/game/core/navigation';
import {
	cloneMapExploration,
	createEmptyMapExploration,
	revealMapArea,
	type MapExplorationState
} from '$lib/game/core/map-exploration';
import { applyExperienceGain, type ProgressionState } from '$lib/game/core/progression';
import {
	applyQuestEvent,
	buildHudQuestState,
	cloneQuestState,
	createInitialQuestState,
	getStoryProgress,
	questEventAdvanced,
	takeNextQuestEffect,
	type QuestEvent,
	type QuestRewardGrant,
	type QuestState
} from '$lib/game/core/quests';
import { applyStoryGates, storyGateSignature } from '$lib/game/core/story-gates';
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
import {
	clampHpToMax,
	deriveEffectiveStats,
	getHeroBaseStats,
	type EffectiveStats
} from '$lib/game/core/stats';
import {
	advanceDialogue,
	buildDialogueFallback,
	chooseDialogueOption,
	type DialogueChoiceResult,
	type DialogueIntent,
	type DialogueSession
} from '$lib/game/core/dialogue';
import type { Direction } from '$lib/game/core/types';
import { getItemText, getNpcText, getQuestText, getShopText } from '$lib/game/i18n/content';
import { getActiveLocale, preferences } from '$lib/game/i18n/store';
import { t, type MessageKey } from '$lib/game/i18n/translate';
import {
	createNewSaveState,
	SAVE_STATE_VERSION,
	serializeSaveState,
	type SaveState
} from '$lib/game/save/save-state';
import { getPlaytimeSeconds } from '$lib/game/save/playtime';
import { writeSaveSlot, type SaveSlotRecord } from '$lib/game/save/slots';
import { flushSaveStorage } from '$lib/game/save/storage';
import { captureSaveThumbnail } from '$lib/game/save/thumbnail';
import { getNpcStoryDialogue, getStoryScene } from '$lib/game/story/client';
import { emitPrologueEnd } from '$lib/game/ui-bridge/events';
import {
	emitHudState,
	onHudCommand,
	type HudCommand,
	type HudState
} from '$lib/game/ui-bridge/events';
import {
	resolveWorldRenderOptions,
	type WorldRenderOptions
} from '$lib/game/phaser/world-render-options';
import {
	MAP_BACKGROUND_DEFAULT_SELECTIONS,
	MAP_BACKGROUND_PACKAGE_REGISTRY
} from '$lib/game/content/backgrounds/map-background-registry';
import { SnareBattleScene, type SnareBattleStartData } from './SnareBattleScene';

interface RegionalBackgroundPackageRender extends MapBackgroundPackagePresentation {
	readonly successfulBackgroundIdSet: ReadonlySet<string>;
	readonly useOwnership: boolean;
}

function shouldRenderStaticOverlay(
	visual: MapBlocker['visual'],
	packageRender: RegionalBackgroundPackageRender
): boolean {
	if (packageRender.presentationMode === 'painted' && packageRender.coverage === 'full-map') {
		return false;
	}
	if (!packageRender.useOwnership) {
		return !visual || visual.mode === 'always' || packageRender.presentationMode === 'fallback';
	}
	return shouldRenderOwnedVisual(visual, packageRender.successfulBackgroundIdSet);
}

function shouldReportSelectedStaticOverlay(
	visual: MapBlocker['visual'],
	packageRender: RegionalBackgroundPackageRender
): boolean {
	if (!packageRender.useOwnership) {
		return (
			packageRender.presentationMode === 'fallback' &&
			packageRender.requiredBackgroundIds.length > 0
		);
	}
	return visual?.mode === 'fallback-only' && shouldRenderStaticOverlay(visual, packageRender);
}

/** Transient field-status payload: a MessageKey + params retained so a
 * locale switch (or a story-gate restart's re-create) retranslates it at
 * publish time; `text` is the freeform fallback for statuses without a
 * message key. `null` clears the field copy. A param value may name game
 * content by id ({@link WorldSceneStatusName}), resolved in the
 * publication locale instead of freezing one locale's string. */
export type WorldSceneStatusName = {
	npcId?: string;
	itemId?: string;
	questId?: string;
	/** Freeform fallback when the content catalog lacks the id. */
	fallback?: string;
};

export type WorldSceneStatus =
	| {
			key: MessageKey;
			params?: Record<string, string | number | WorldSceneStatusName>;
	  }
	| { text: string };

interface WorldSceneData {
	battleResult?: BattleResult;
	mapId?: string;
	mapBackgroundPackageSelection?: MapBackgroundPackageSelection;
	/**
	 * `story` re-renders the map in place after the story moved on; `story-move`
	 * is a quest effect fading the hero somewhere else (sleeping, the tunnel).
	 */
	reason?: 'battle-result' | 'new' | 'resume' | 'transition' | 'story' | 'story-move';
	recentlyFled?: RecentlyFledEncounter;
	saveState?: SaveState | null;
	/** `null` keeps the field copy cleared (an omitted status resolves the reason default). */
	status?: WorldSceneStatus | null;
	/** Preserves an active story-scene hold across a story-gate scene restart. */
	storySceneHold?: boolean;
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

type MapRectBounds = {
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

/**
 * Shape shared by every sprite-sheet asset (`starterPackAsset`,
 * `environmentDressingAsset`, …): a texture key plus a map of named frames whose
 * source rectangles live on the sheet.
 */
type SpriteSheetAsset = {
	key: string;
	frames: Record<string, { x: number; y: number; w: number; h: number }>;
};

type EnemyMovementMode = 'idle' | 'chase' | 'return';

type TilemapLayer = {
	setDepth?: (depth: number) => unknown;
};

type EnemyInstance = {
	/** Fixed battle size from the encounter; unset rolls a random pack. */
	count?: number;
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

// HUD commands that can never change the save payload — battle-scoped ones
// return before mutating, pause/resume and shop open/close only touch
// runtime flags, save-slot writes its own slot, and dialogue-close just
// ends the session. Anything not listed keeps the before/after compare so a
// new command can't silently skip the durable-mutation autosave.
const NON_MUTATING_HUD_COMMANDS: ReadonlySet<HudCommand['type']> = new Set([
	'dismiss-battle-summary',
	'battle-cycle-target',
	'battle-select-target',
	'battle-flee',
	'pause-game',
	'resume-game',
	'save-slot',
	'open-shop',
	'close-shop',
	'dialogue-close'
]);

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
	private static readonly npcPackDisplaySize = { width: 96, height: 87 };
	private static readonly playerRadius = PLAYER_COLLISION_RADIUS;
	private static readonly starterNpcDisplaySize = { width: 60, height: 54 };
	private static readonly tileSize = 32;
	private static readonly terrainTilesetKey = 'starter-ground-tiles';
	/**
	 * Invariant: `terrainTileIndexes[name]` MUST equal the index of `name` in
	 * `terrainFrameOrder`. `ensureTerrainTilesetTexture` builds the canvas tileset by
	 * drawing `terrainFrameOrder` left-to-right (one tile per index), and
	 * `buildGroundTileData` emits `terrainTileIndexes[patch.tile]` as the
	 * tilemap cell value that Phaser resolves against that canvas. The two
	 * collections must therefore contain the same tiles in the same order,
	 * mirroring `terrainTilesAsset.frames`.
	 */
	private static readonly terrainTileIndexes: Record<MapGroundTile, number> = Object.fromEntries(
		terrainFrameOrder.map((name, index) => [name, index])
	) as Record<MapGroundTile, number>;
	private static readonly terrainFrames = terrainFrameOrder;
	private static readonly cameraFollowLerp = 0.14;
	/** The grade on the current camera; a restart makes a new camera, so `create` resets it. */
	private fieldLightGrade: LightGrade | null | undefined;
	private static readonly bossPhaseTwoSpeedMultiplier = 1.5;
	private static readonly transitionRadius = MAP_TRANSITION_RADIUS;
	public static readonly doorTriggerRadius = MAP_TRANSITION_TRIGGER_RADIUS;
	private static readonly pickupRadius = 18;
	private static readonly enemyHealthBarOffsetY = 34;
	private static readonly discoveryInteractRadius = 64;
	// World markers stay hidden until the player is within this distance, so a normal
	// camera view never shows a cluster of pulsing circles — at most the one(s) nearby.
	private static readonly discoveryRevealRadius = 240;
	// Rendered above all gameplay layers and the baked regional background.
	private static readonly collisionDebugOverlayDepth = 10_000;
	/** Grid-map tree crowns draw over actors, like a foreground background plane. */
	private static readonly gridCanopyDepth = 100;
	/** Grid-map buildings and props, between the ground and the actors. */
	private static readonly gridObjectDepth = -5;
	/** Window after a fled battle during which that encounter cannot re-trigger. */
	private static readonly recentlyFledGraceMs = 4_000;
	/** Game-ms a held reward status waits once the field stays visible: the
	 *  claiming toast keeps a readable window before the held line lands. */
	private static readonly heldFieldStatusReleaseDelayMs = 2_000;
	private static readonly storyFadeMs = 600;

	private clearedEncounterIds = new Set<string>();
	private clearedEncounterUnitCounts: Record<string, number> = {};
	private battleReturnTransitions = new Set<string>();
	private transitions: readonly MapTransition[] = [];
	private collisionDebugGraphics?: Phaser.GameObjects.Graphics;
	private collectedPickupIds = new Set<string>();
	private seenDiscoveryIds = new Set<string>();
	private discoveryMarkers = new Map<string, Phaser.GameObjects.Arc>();
	// Pulse tweens for discovery markers, paused while their marker is invisible so
	// off-screen markers don't keep ticking `repeat: -1` tweens every frame.
	private discoveryTweens = new Map<string, Phaser.Tweens.Tween>();
	private cursorKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;
	private enemies: EnemyInstance[] = [];
	private facing: Direction = 'down';
	private heroAnimationLockedUntil = 0;
	private heroDefeated = false;
	private heroOccluded = false;
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
	private lastPublishedStatus: WorldSceneStatus | null = null;
	/** A named reward status held while something else claims the footer —
	 *  an open dialogue, the same beat's quest-complete toast, or a queued
	 *  story effect about to publish. {@link flushFieldStatus} releases it
	 *  once the field is visibly back; {@link updateStory} releases it after
	 *  the toast's window when no claim ever arrives. */
	private pendingFieldStatus: WorldSceneStatus | null = null;
	/** Remaining delay before a held status may publish while the field
	 *  stays visible; {@link updateStory} ticks it only on clear ticks. */
	private heldFieldStatusReleaseMs = 0;
	private currentNearbyNpcId: string | null = null;
	private currentNearbyNpcStatus: WorldSceneStatus | null = null;
	private npcMarkers = new Map<string, NpcMarker>();
	private pickupMarkers = new Map<string, PickupMarker>();
	private player?: ActorMarker;
	private recentlyFled: RecentlyFledEncounter | null = null;
	private fledGraceRemainingMs = 0;
	private fledPackHasBounds = false;
	/** Progress through entering and leaving the fled pack's acquisition zone. */
	private fledPackZone: 'awaiting-entry' | 'inside' | 'exited' = 'awaiting-entry';
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
	private storyDialogueSeq = 0;
	private resolvedEncounterDrops: SaveState['flags']['resolvedEncounterDrops'] = {};
	private removeHudCommandListener = () => {};
	private renderOptions!: WorldRenderOptions;
	private simulationPaused = false;
	/** A quest effect (a scene or a fade) is playing; the next one waits for it. */
	private storyEffectRunning = false;
	/** A queued scene failed to load: the queue holds (no later effect, no
	 * terminal card) until a reload replays the preserved checkpoint. */
	private storySceneHold = false;
	/** The play-scene effect popped for its in-flight request: kept in every
	 * save snapshot (see buildSaveState) so an autosave during the request
	 * cannot persist a queue missing the unseen cue. The seq identifies the
	 * request, so a response fenced by a shutdown/re-create is recognized as
	 * stale instead of settling the live queue. */
	private storySceneInFlight: { effect: QuestEffect; seq: number } | null = null;
	/** Bumped by every create(): requests capture it at start so a stale
	 * response from a shut-down incarnation never finalizes world state —
	 * even after the re-created scene's own request already finished (its
	 * terminal card must stay frozen until teardown). */
	private storySceneIncarnation = 0;
	/** The story moved on; re-render once the current dialogue and effects finish. */
	private storyRefreshPending = false;
	private storyGateKey = '';
	private wasdKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;
	private worldSize = { width: 0, height: 0 };
	private navigationGrid!: NavigationGrid;
	private navigationObstacles: readonly NavigationObstacle[] = [];

	constructor() {
		super(WorldScene.key);
	}

	private getLocale() {
		return getActiveLocale();
	}

	private status(key: MessageKey, params: Record<string, string | number> = {}) {
		return t(this.getLocale(), key, params);
	}

	/** Retains the message identity so the active locale resolves it at
	 *  publish time (see {@link publishHudState}). */
	private statusMessage(
		key: MessageKey,
		params: Record<string, string | number | WorldSceneStatusName> = {}
	): WorldSceneStatus {
		return { key, params };
	}

	/** Resolves one content-name param in the active locale. */
	private resolveStatusName(value: WorldSceneStatusName): string {
		if (value.npcId !== undefined) {
			return getNpcText(this.getLocale(), value.npcId)?.name ?? value.fallback ?? value.npcId;
		}
		if (value.itemId !== undefined) return this.getItemName(value.itemId, value.fallback);
		if (value.questId !== undefined) return this.getQuestTitle(value.questId, value.fallback);
		return value.fallback ?? '';
	}

	/** Resolves content-name params in the publication locale, so a locale
	 * switch retranslates the name and not just the surrounding template. */
	private resolveStatusParams(
		params: Record<string, string | number | WorldSceneStatusName> | undefined
	): Record<string, string | number> {
		if (!params) return {};
		const resolved: Record<string, string | number> = {};
		for (const [name, value] of Object.entries(params)) {
			resolved[name] = typeof value === 'object' ? this.resolveStatusName(value) : value;
		}
		return resolved;
	}

	private getItemName(itemId: string | undefined, fallback = 'item') {
		if (!itemId) return fallback;
		return getItemText(this.getLocale(), itemId)?.name ?? getItem(itemId)?.name ?? fallback;
	}

	private getQuestTitle(questId: string | undefined, fallback = 'Quest') {
		if (!questId || !isQuestId(questId)) return fallback;
		return getQuestText(this.getLocale(), questId)?.title ?? fallback;
	}

	private getTravelerSpeaker() {
		return this.status('content.dialogue.speakers.traveler');
	}

	private getShopSpeaker() {
		return this.status('content.dialogue.actions.shop');
	}

	create(data: WorldSceneData = {}) {
		this.sceneShutDown = false;
		this.renderOptions = resolveWorldRenderOptions();
		const battleApplication =
			data.battleResult && data.saveState
				? applyBattleResultToSaveState(data.saveState, data.battleResult)
				: null;
		const activeSave =
			battleApplication?.saveState ??
			data.saveState ??
			// A new run starts from the fresh save, so Grik wakes at his bedside.
			(data.reason === 'new' ? createNewSaveState() : undefined);
		// Story gates read the quest state, so it must be in place before the map resolves.
		this.quests = cloneQuestState(activeSave?.quests ?? createInitialQuestState());
		const requestedPackageSelection = data.mapBackgroundPackageSelection;
		const map = this.resolveMap(activeSave?.mapId ?? data.mapId, requestedPackageSelection);
		this.navigationGrid = resolveMapNavigationGrid(map);
		this.navigationObstacles = buildMapNavigationObstacles(map, {
			includeInteractableNpcs: true
		});
		this.transitions = map.transitions;
		const packageSelection: MapBackgroundPackageSelection =
			requestedPackageSelection?.definition && requestedPackageSelection.definition.mapId !== map.id
				? { mode: 'fallback', definition: null }
				: (requestedPackageSelection ?? this.resolveMapBackgroundPackageSelection(map.id));
		const width = map.width * WorldScene.tileSize;
		const height = map.height * WorldScene.tileSize;
		const reason = data.reason ?? (activeSave ? 'resume' : 'new');

		this.clearedEncounterIds = new Set(activeSave?.flags.clearedEncounters ?? []);
		this.clearedEncounterUnitCounts = {
			...(activeSave?.flags.clearedEncounterUnitCounts ?? {})
		};
		this.collectedPickupIds = new Set(activeSave?.flags.collectedPickups ?? []);
		this.seenDiscoveryIds = new Set(activeSave?.seenDiscoveries ?? []);
		this.enemies = [];
		this.facing = activeSave?.player.facing ?? map.spawnDirection;
		this.heroAnimationLockedUntil = 0;
		this.heroDefeated = false;
		this.heroHitReactionUntil = 0;
		this.heroVisualState = 'idle';
		this.heroOccluded = false;
		this.hitImpactLayers = undefined;
		this.hitImpactStartedAt = 0;
		this.hitImpactUntil = 0;
		this.inventory = cloneInventory(activeSave?.inventory ?? createNewSaveState().inventory);
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
		this.currentNearbyNpcStatus = null;
		this.storyDialogueSeq++;
		this.nearbyShopId = null;
		this.openShopId = null;
		this.dialogueSession = null;
		this.pendingFieldStatus = null;
		this.heldFieldStatusReleaseMs = 0;
		this.npcMarkers.clear();
		this.pickupMarkers.clear();
		this.discoveryMarkers.clear();
		this.discoveryTweens.clear();
		this.playerProgress = {
			level: activeSave?.player.level ?? 1,
			xp: activeSave?.player.xp ?? 0,
			hp: activeSave?.player.hp ?? startingPlayer.baseHp,
			attack: activeSave?.player.attack ?? startingPlayer.baseAttack
		};
		this.playerInvulnerableUntil = 0;
		this.playerAttackCooldownUntil = 0;
		this.recentlyFled = data.battleResult?.outcome === 'fled' ? (data.recentlyFled ?? null) : null;
		this.fledGraceRemainingMs = this.recentlyFled ? WorldScene.recentlyFledGraceMs : 0;
		this.fledPackZone = 'awaiting-entry';
		this.simulationPaused = false;
		this.storyEffectRunning = false;
		this.storySceneHold = data.storySceneHold ?? false;
		this.storySceneIncarnation += 1;
		this.storySceneInFlight = null;
		this.storyRefreshPending = false;
		this.storyGateKey = this.computeStoryGateKey();
		this.worldSize = { width, height };

		this.registerAssetFrames(starterPackAsset);
		this.registerAssetFrames(npcPackAsset);
		this.registerAssetFrames(environmentDressingAsset);
		this.registerAssetFrames(interiorPropAsset);
		this.registerAssetFrames(animationPackAsset);
		this.ensureActorAnimations();
		this.ensureTerrainTilesetTexture();
		const packageRender = this.renderRegionalBackgroundPackage(
			map,
			packageSelection ?? this.resolveMapBackgroundPackageSelection(map.id)
		);
		if (
			packageRender.presentationMode === 'fallback' ||
			packageRender.coverage === 'historical-partial' ||
			packageRender.coverage === null
		) {
			this.renderGround(map);
		}
		this.renderBlockers(map, packageRender);
		this.renderInteriorProps(map, ['floor', 'furniture'], packageRender);
		const heroAnimation = getActorAnimationAsset('hero');
		this.player = this.add.sprite(
			activeSave?.player.x ?? map.spawn.x,
			activeSave?.player.y ?? map.spawn.y,
			animationPackAsset.key,
			heroAnimation.clips.idle.frames[0]
		) as ActorMarker;
		this.player.setDisplaySize(heroAnimation.displaySize.width, heroAnimation.displaySize.height);
		this.battleReturnTransitions = new Set(
			battleApplication
				? map.transitions
						.filter((transition) => isInTransitionZone(transition, this.player!))
						.map((transition) => transition.id)
				: []
		);
		if (this.playerProgress.hp === 0) {
			this.defeatHero();
		} else {
			this.playHeroAnimation('idle');
		}

		this.setupEncounters(map);
		const fledEnemy = this.enemies.find((enemy) => enemy.id === this.recentlyFled?.encounterId);
		const fledBounds = fledEnemy && this.findLeashBoundsForEnemy(map, fledEnemy);
		this.fledPackHasBounds = Boolean(fledBounds);
		if (fledEnemy && fledBounds) {
			const { playerWithinLeash, canAcquire } = this.getEnemyAcquisition(
				this.player,
				fledEnemy,
				fledBounds
			);
			if (playerWithinLeash && canAcquire) this.fledPackZone = 'inside';
		}
		this.renderTransitions(map);
		this.renderPickups(map);
		this.renderDiscoveries(map);
		this.renderNpcs(map);
		this.renderAmbientNpcs(map);
		this.renderInteriorProps(map, ['foreground'], packageRender);
		this.renderCollisionDebugOverlay(map);

		this.cameras.main.setBackgroundColor('#1a1f2b');
		this.applyFieldCameraZoom();
		this.fieldLightGrade = undefined;
		this.applyFieldLighting();
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

		// The camera diagnostic publishes a typed snapshot only — never the live
		// camera — and only once Phaser has applied the bounds and refreshed
		// worldView inside preRender, which the scene 'render' event follows.
		// Initial readiness publishes once; each real resize re-arms one shot.
		let cameraDiagnosticPending = false;
		const publishCameraDiagnostic = () => {
			if (!cameraDiagnosticPending || this.sceneShutDown) return;
			cameraDiagnosticPending = false;
			const camera = this.cameras.main;
			const bounds = camera.getBounds();
			const view = camera.worldView;
			emitWorldSceneCameraDiagnostic({
				mapId: this.mapId,
				facing: this.facing,
				camera: {
					view: { x: view.x, y: view.y, width: view.width, height: view.height },
					bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
				}
			});
		};
		if (this.renderOptions.movementDiagnostics) {
			cameraDiagnosticPending = true;
			this.events.on('render', publishCameraDiagnostic);
		}

		// Live viewport resize re-centers the camera bounds; the captured map
		// dimensions belong to this create() so a transition/restart swaps the
		// closure via the shutdown cleanup below.
		const onResize = () => {
			this.applyFieldCameraZoom();
			const bounds = this.getCenteredCameraBounds(width, height);
			this.cameras.main.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
			cameraDiagnosticPending = this.renderOptions.movementDiagnostics;
		};
		this.scale.on('resize', onResize);

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
		this.unsubscribePreferences?.();
		let preferencesInitialized = false;
		this.unsubscribePreferences = preferences.subscribe(() => {
			// Svelte stores emit once on subscribe; skip that and re-publish only
			// on real changes, so a locale switch refreshes the translated quest
			// and status strings without waiting for the next world event.
			if (!preferencesInitialized) {
				preferencesInitialized = true;
				return;
			}
			this.publishHudState(this.lastPublishedStatus);
		});
		const cleanup = () => {
			this.renderEpoch += 1;
			// Fence deferred story work: the seq bump turns in-flight
			// playStoryScene / startNearbyNpcStoryDialogue responses stale, and
			// the shutdown flag makes publishHudState a no-op until the scene is
			// re-created (a story-gate scene.restart re-runs create()).
			this.sceneShutDown = true;
			this.storyDialogueSeq += 1;
			this.removeHudCommandListener();
			this.unsubscribePreferences?.();
			this.unsubscribePreferences = null;
			this.scale.off('resize', onResize);
			this.events?.off?.('render', publishCameraDiagnostic);
			this.events?.off?.('shutdown', cleanup);
			this.events?.off?.('destroy', cleanup);
		};
		this.events?.once?.('shutdown', cleanup);
		this.events?.once?.('destroy', cleanup);

		this.refreshFieldAudio();
		if (reason === 'transition') {
			playSfx(this, 'door');
		}

		this.revealCurrentMapArea();
		// Explicit durable points write the autosave slot: new-run readiness,
		// map transitions, and applied battle results. Resume and fog reveal do not.
		// The write waits for this scene's first render (Phaser RENDER event) and
		// then hops to the renderer's post-render tick, so the slot thumbnail
		// captures the arrival map as a completed frame.
		this.lastThumbnailMapId = null;
		this.lastThumbnail = undefined;
		if (
			reason === 'new' ||
			reason === 'transition' ||
			reason === 'story-move' ||
			battleApplication
		) {
			this.events?.once?.('render', () => void this.writeAutosave(this.buildSaveState()));
		}
		if (battleApplication?.completedQuestIds.length) {
			playSfx(this, 'quest-complete');
		}
		if (reason === 'story-move') {
			this.cameras.main.fadeIn?.(WorldScene.storyFadeMs, 0, 0, 0);
		}

		this.updateHeroOcclusion(false);

		// The arrival publish names the arrival region; the update loop only
		// republishes once the hero has actually left it.
		this.lastPublishedRegionId = getRegionId(
			this.mapId,
			this.player ? { x: this.player.x, y: this.player.y } : map.spawn
		);

		// `??` would resurrect a cleared status: an explicit null must survive the
		// story-gate restart instead of falling back to the reason default.
		this.publishHudState(
			data.status !== undefined
				? data.status
				: this.resolveInitialStatus(reason, Boolean(fledBounds))
		);

		// A carried status must outlive the first update(): mark an in-range
		// NPC's proximity prompt as already published so updateNpcDialogue's
		// 'Y nearby' cannot overwrite the carried line.
		if (data.status) {
			const nearbyNpc = this.findNearbyNpc();
			if (nearbyNpc) {
				this.currentNearbyNpcId = nearbyNpc.id;
				this.currentNearbyNpcStatus = this.statusMessage('status.npcNearby', {
					npcName: { npcId: nearbyNpc.id, fallback: nearbyNpc.name }
				});
			}
		}
	}

	/** Larger windows zoom in, so every window size frames about the same area (`fieldCameraZoom`). */
	private applyFieldCameraZoom() {
		const camera = this.cameras.main;
		camera.setZoom?.(fieldCameraZoom(camera.width, camera.height));
	}

	/** The story's colour grade over the field (`lightingFor`): dusk in the evening, smoke in the raid. */
	private applyFieldLighting() {
		const filters = this.cameras.main.filters?.internal;
		if (!filters) return;
		const grade = lightingFor(this.mapId, getStoryProgress(this.quests));
		if (grade === this.fieldLightGrade) return;
		this.fieldLightGrade = grade;
		filters.clear();
		if (grade) filters.addColorMatrix().colorMatrix.set([...grade]);
	}

	private getCenteredCameraBounds(width: number, height: number) {
		const camera = this.cameras.main;
		// Bounds are in world px: a zoomed camera's view covers its size divided by the zoom.
		const zoom = camera.zoomX > 0 ? camera.zoomX : 1;
		const viewportWidth = (camera.width > 0 ? camera.width : width) / zoom;
		const viewportHeight = (camera.height > 0 ? camera.height : height) / zoom;
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

		// Drain pending interact presses every frame so presses during pause,
		// defeat, story effects, or map transitions never fire on resume.
		const interactPressed = this.hasInteractJustDown();

		this.updateHeroOcclusion();

		if (this.simulationPaused) {
			return;
		}

		if (this.heroDefeated) {
			return;
		}

		if (this.updateStory(delta)) {
			return;
		}

		// A dialogue session freezes the world's moving parts: WASD reaches
		// Phaser as raw window keydowns the DOM handler cannot swallow, and
		// combat reactions/enemies must not run mid-conversation. Proximity
		// sensing (NPC refresh, the interact key, transitions, pickups) stays
		// live so an open prompt can still be superseded by a real interaction.
		const dialogueFrozen = this.dialogueSession !== null;

		if (!dialogueFrozen) {
			this.fledGraceRemainingMs = Math.max(
				0,
				this.fledGraceRemainingMs - Math.min(Math.max(delta, 0), WorldScene.maxMovementDeltaMs)
			);
			if (
				this.fledGraceRemainingMs === 0 &&
				(!this.fledPackHasBounds || this.fledPackZone === 'exited')
			) {
				this.recentlyFled = null;
			}
			this.updateHitReactions(time);
		}

		const direction = dialogueFrozen
			? { x: 0, y: 0 }
			: resolveMovementVector({
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
		if ((direction.x !== 0 || direction.y !== 0) && this.renderOptions.movementDiagnostics) {
			emitPlayerMovementDiagnostic({
				mapId: this.mapId,
				previousPosition: { x: this.player.x, y: this.player.y },
				requestedPosition: { x: targetX, y: targetY },
				resolvedPosition,
				blocked: resolvedPosition.x !== targetX || resolvedPosition.y !== targetY
			});
		}

		this.player.x = resolvedPosition.x;
		this.player.y = resolvedPosition.y;
		this.facing = this.resolveFacing(direction, this.facing);

		const explorationChanged = this.revealCurrentMapArea();
		const areaChanged = this.refreshPublishedRegion();
		if (explorationChanged || areaChanged) {
			// Fog reveal mutates exploration in memory only; the next durable
			// mutation persists it. Movement itself never writes the save.
			this.publishHudState(this.lastPublishedStatus);
		}

		if (this.tryTransition()) {
			return;
		}

		this.updateNpcDialogue();
		this.updateDiscoveryMarkers();
		this.handleInteractInput(interactPressed);
		this.tryCollectPickup();

		const battleTarget =
			!dialogueFrozen && time >= this.playerAttackCooldownUntil
				? this.findHeroAttackTarget(time)
				: undefined;

		if (battleTarget) {
			this.startBattle(battleTarget);
			return;
		}

		if (!this.hasLivingEnemies()) {
			return;
		}

		if (!dialogueFrozen) {
			this.updateEnemyBehavior(time, delta);
		}
	}

	private findHeroAttackTarget(time: number) {
		if (!this.player) {
			return undefined;
		}

		return this.enemies
			.filter(
				(enemy) => !enemy.defeated && !this.isFledPackProtected(enemy) && canReceiveHit(enemy, time)
			)
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
		const quests = cloneQuestState(this.quests);
		// The in-flight scene was already popped; re-add it at the head so
		// snapshots taken during its request keep the unseen cue. The success
		// path clears the field before snapshotting, so it is consumed exactly
		// once, and a re-created scene's create() reset makes a stale response
		// settle as foreign instead of re-adding a duplicate.
		if (this.storySceneInFlight) {
			quests.pendingEffects.unshift({ ...this.storySceneInFlight.effect });
		}
		return {
			version: SAVE_STATE_VERSION,
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
				clearedEncounterUnitCounts: { ...this.clearedEncounterUnitCounts },
				collectedPickups: [...this.collectedPickupIds].sort(),
				resolvedEncounterDrops: cloneResolvedEncounterDrops(this.resolvedEncounterDrops)
			},
			inventory: cloneInventory(this.inventory),
			equipment: { ...this.equipment },
			wallet: { ...this.wallet },
			shops: {
				stock: cloneShopStockState(this.shopStockState)
			},
			quests,
			mapExploration: cloneMapExploration(this.mapExploration),
			seenDiscoveries: [...this.seenDiscoveryIds].sort()
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
			this.publishHudState(this.statusMessage('status.noHealCharges'));
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
			this.publishHudState(this.statusMessage('status.itemCannotBeUsed'));
			return;
		}

		const maxHp = this.getEffectiveStats().maxHp;

		if (this.playerProgress.hp >= maxHp) {
			this.publishHudState(this.statusMessage('status.hpAlreadyFull'));
			return;
		}

		const result = consumeStackItem(this.inventory, itemId);

		if (!result.consumed) {
			this.publishHudState(this.statusMessage('status.itemCannotBeUsed'));
			return;
		}

		this.inventory = result.inventory;
		this.playerProgress = {
			...this.playerProgress,
			hp: Math.min(maxHp, this.playerProgress.hp + item.effect.amount)
		};
		playSfx(this, 'heal');
		this.publishHudState(this.statusMessage('status.recoveredHp'));
	}

	private startBattle(enemy: EnemyInstance) {
		if (!this.player) {
			return;
		}

		const effectiveStats = this.getEffectiveStats();
		// Grik returns to where he stood when the fight broke out; an enemy-home
		// offset can land inside blocking terrain (Mistfen pond, cliff bands).
		const saveState = this.buildSaveState();

		this.scene.start(SnareBattleScene.key, {
			payload: {
				saveState,
				sourceMapId: this.mapId,
				sourceEncounterId: enemy.id,
				sourceEnemyId: enemy.definition.id,
				enemyCount: enemy.definition.boss ? 1 : (enemy.count ?? rollBattleEnemyCount()),
				hero: {
					hp: this.playerProgress.hp,
					...effectiveStats
				}
			}
		} satisfies SnareBattleStartData);
	}

	private equipInventoryItem(itemId: string) {
		const result = equipItem(this.equipment, this.inventory.equipment, itemId);

		if (!result.equipped) {
			this.publishHudState(this.statusMessage('status.itemCannotBeEquipped'));
			return;
		}

		this.equipment = result.equipment;
		this.playerProgress = {
			...this.playerProgress,
			hp: clampHpToMax(this.playerProgress.hp, this.getEffectiveStats())
		};
		this.publishHudState(this.statusMessage('status.equippedItem', { itemName: { itemId } }));
	}

	private unequipInventorySlot(slot: EquipmentSlot) {
		this.equipment = unequipSlot(this.equipment, slot);
		this.playerProgress = {
			...this.playerProgress,
			hp: clampHpToMax(this.playerProgress.hp, this.getEffectiveStats())
		};
		this.publishHudState(this.statusMessage('status.unequippedItem'));
	}

	private openNearbyShop(shopId: string): boolean {
		if (this.nearbyShopId !== shopId || !getShop(shopId)) {
			this.dialogueSession = buildDialogueFallback(
				this.getShopSpeaker(),
				this.status('content.dialogue.system.shopOutOfReach')
			);
			this.publishHudState(this.statusMessage('status.noShopNearby'));
			return false;
		}

		this.storyDialogueSeq++;
		this.openShopId = shopId;
		this.dialogueSession = null;
		// A shop intent supersedes the session without a field-visible close:
		// a held reward status stays held and flushes when the shop closes.
		this.publishHudState(this.statusMessage('status.shopOpened'));
		return true;
	}

	private closeOpenShop() {
		this.openShopId = null;
		this.flushFieldStatus(this.statusMessage('status.shopClosed'));
	}

	private buyOpenShopItem(shopId: string, stockId: string) {
		if (this.openShopId !== shopId || this.nearbyShopId !== shopId) {
			this.publishHudState(this.statusMessage('status.noShopNearby'));
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
		playSfx(this, 'coins');
		this.publishHudState(
			this.statusMessage('status.boughtItem', { itemName: { itemId: itemId ?? '' } })
		);
	}

	private sellOpenShopItem(itemId: string) {
		if (!this.openShopId || this.nearbyShopId !== this.openShopId) {
			this.publishHudState(this.statusMessage('status.noShopNearby'));
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
		playSfx(this, 'coins');
		this.publishHudState(this.statusMessage('status.soldItem', { itemName: { itemId } }));
	}

	/** Applies one quest event; true when the event actually advanced the quest. */
	private applyQuestProgress(
		event: QuestEvent,
		fallbackStatus: WorldSceneStatus | null,
		onEvaluated?: (advanced: boolean) => void,
		heldStatus?: WorldSceneStatus | null
	): boolean {
		const result = applyQuestEvent({ state: this.quests, event });
		const advanced = questEventAdvanced(result);
		this.quests = result.state;
		const equippedStatus = this.applyQuestRewards(result.rewards);
		this.storyRefreshPending = true;
		onEvaluated?.(advanced);

		const completedGrant = result.rewards.find((grant) =>
			result.completedQuestIds.includes(grant.questId)
		);
		if (completedGrant) {
			playSfx(this, 'quest-complete');
		}
		const namedStatus = equippedStatus ?? heldStatus ?? null;
		if (namedStatus && (this.dialogueSession || completedGrant)) {
			// FieldHud is unmounted while the dialogue is up — or the completed
			// quest's own toast claims the footer: hold the named status for a
			// later close so neither publish erases it unseen.
			this.pendingFieldStatus = namedStatus;
			this.heldFieldStatusReleaseMs = WorldScene.heldFieldStatusReleaseDelayMs;
		}
		this.publishHudState(
			completedGrant
				? this.statusMessage('status.questComplete', {
						questTitle: {
							questId: completedGrant.questId,
							fallback: completedGrant.title
						}
					})
				: this.dialogueSession
					? fallbackStatus
					: (equippedStatus ?? fallbackStatus)
		);

		return advanced;
	}

	/** Grants reward items through the shared auto-equip policy and returns
	 *  the named status for the last auto-equipped item, if any. */
	private applyQuestRewards(rewards: QuestRewardGrant[]): WorldSceneStatus | null {
		const items = rewards.flatMap((grant) => grant.reward.items ?? []);

		for (const grant of rewards) {
			if (grant.reward.xp) {
				this.playerProgress = applyExperienceGain(this.playerProgress, grant.reward.xp);
			}

			if (grant.reward.coins) {
				this.wallet = { coins: this.wallet.coins + grant.reward.coins };
			}
		}

		const granted = grantItems({ inventory: this.inventory, equipment: this.equipment }, items);
		this.inventory = granted.inventory;
		this.equipment = granted.equipment;
		const equippedItemId = granted.equipped.at(-1);

		return equippedItemId === undefined
			? null
			: this.statusMessage('status.equippedItem', { itemName: { itemId: equippedItemId } });
	}

	private formatBuyFailure(reason: ShopBuyFailureReason): WorldSceneStatus {
		if (reason === 'not-enough-coins') return this.statusMessage('status.notEnoughCoins');
		if (reason === 'out-of-stock') return this.statusMessage('status.itemOutOfStock');

		return this.statusMessage('status.itemCannotBeBought');
	}

	private formatSellFailure(reason: ShopSellFailureReason): WorldSceneStatus {
		if (reason === 'equipped-item') return this.statusMessage('status.equippedItemCannotBeSold');
		if (reason === 'item-not-owned') return this.statusMessage('status.itemNotOwned');

		return this.statusMessage('status.itemCannotBeSold');
	}

	private getEffectiveStats(): EffectiveStats {
		return deriveEffectiveStats(getHeroBaseStats(this.playerProgress), this.equipment);
	}

	private handleHudCommand(command: HudCommand) {
		// Commands that can't touch the save payload skip the before/after
		// serialization entirely — they were paying two serializeSaveState
		// calls per keypress for nothing.
		if (NON_MUTATING_HUD_COMMANDS.has(command.type)) {
			this.applyHudCommand(command);
			return;
		}
		// Durable-mutation autosave: compare the serialized state before/after the
		// command and persist slot 0 only when the command changed something.
		const before = serializeSaveState(this.buildSaveState());
		this.applyHudCommand(command);
		const after = this.buildSaveState();

		if (serializeSaveState(after) !== before) {
			void this.writeAutosave(after);
		}
	}

	private applyHudCommand(command: HudCommand) {
		switch (command.type) {
			case 'dismiss-battle-summary':
			case 'battle-cycle-target':
			case 'battle-select-target':
			case 'battle-flee':
				// Battle-scoped commands are handled by SnareBattleScene.
				return;
			case 'pause-game':
				this.simulationPaused = true;
				// Opening an overlay takes over the footer: drop transient field
				// copy (a non-mutating publish) so stale text like "Recovered HP"
				// or "Saved" cannot leak into Save/System, while keeping an
				// active story-scene hold notice visible.
				if (this.storySceneHold) {
					if (
						!this.lastPublishedStatus ||
						!('key' in this.lastPublishedStatus) ||
						this.lastPublishedStatus.key !== 'status.storySceneFailed'
					) {
						this.publishHudState(this.statusMessage('status.storySceneFailed'));
					}
				} else {
					this.publishHudState(null);
				}
				return;
			case 'resume-game':
				this.simulationPaused = false;
				if (this.storySceneHold) {
					if (
						!this.lastPublishedStatus ||
						!('key' in this.lastPublishedStatus) ||
						this.lastPublishedStatus.key !== 'status.storySceneFailed'
					) {
						this.publishHudState(this.statusMessage('status.storySceneFailed'));
					}
				} else if (
					this.currentNearbyNpcId &&
					this.currentNearbyNpcStatus &&
					this.lastPublishedStatus === null
				) {
					this.publishHudState(this.currentNearbyNpcStatus);
				}
				return;
			case 'heal':
				this.consumeHeal();
				return;
			case 'save-slot':
				this.writeManualSlot(command.slot);
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
			case 'dialogue-advance':
				this.advanceDialogueCommand();
				return;
			case 'dialogue-close':
				if (this.dialogueSession && !this.dialogueSession.canClose) {
					return;
				}
				this.endDialogue();
				return;
			case 'dialogue-choose':
				this.chooseDialogueCommand(command.choiceId);
				return;
		}
	}

	private advanceDialogueCommand() {
		const session = this.dialogueSession;
		if (!session) {
			return;
		}

		if (session.lineIndex + 1 >= session.lineCount && session.choices.length === 0) {
			this.endDialogue();
			return;
		}

		this.dialogueSession = advanceDialogue(session);
		playSfx(this, 'ui-select');
		this.publishHudState(this.statusMessage('status.dialogueUpdated'));
	}

	private chooseDialogueCommand(choiceId: string) {
		if (!this.dialogueSession) {
			this.dialogueSession = buildDialogueFallback(
				this.getTravelerSpeaker(),
				this.status('content.dialogue.system.noDialogueOpen')
			);
			this.publishHudState(this.statusMessage('status.noDialogueOpen'));
			return;
		}

		const result = chooseDialogueOption({
			session: this.dialogueSession,
			choiceId,
			fallbackLine: this.status('content.dialogue.system.optionNotAvailable')
		});
		this.applyDialogueChoiceResult(result);
	}

	private applyDialogueChoiceResult(result: DialogueChoiceResult) {
		this.dialogueSession = result.session;

		if (result.intent) {
			this.applyDialogueIntent(result.intent);
			return;
		}

		this.publishHudState(this.statusMessage('status.dialogueUpdated'));
	}

	private applyDialogueIntent(intent: DialogueIntent) {
		switch (intent.type) {
			case 'openShop':
				this.openNearbyShop(intent.shopId);
				return;
			case 'close':
				this.endDialogue();
				return;
		}
	}

	/** Ends the open dialogue and flushes any held reward status exactly
	 *  once, so it lands where the player can see it — after the dialogue is
	 *  gone and FieldHud is mounted again. */
	private endDialogue() {
		// Only a real conversation supersedes an in-flight dialogue request:
		// dismissing a transient fallback line while an NPC request is still
		// loading must not cancel that conversation.
		if (this.dialogueSession && !this.isTransientFallbackDialogueSession(this.dialogueSession)) {
			this.storyDialogueSeq++;
		}
		this.dialogueSession = null;
		this.flushFieldStatus(null);
	}

	/** Publishes the held reward status once the field is visible, or keeps
	 *  it held while a queued/running story effect would overwrite it on the
	 *  next frame — the effect's own session close flushes it then. A held
	 *  scene load never releases it: the failure notice stays the field
	 *  status, so the flush republishes it instead of the held line. */
	private flushFieldStatus(fallback: WorldSceneStatus | null) {
		if (this.storySceneHold) {
			this.publishHudState(this.statusMessage('status.storySceneFailed'));
			return;
		}
		if (
			this.pendingFieldStatus !== null &&
			(this.quests.pendingEffects.length > 0 ||
				this.storyEffectRunning ||
				this.storySceneInFlight !== null)
		) {
			this.publishHudState(fallback);
			return;
		}
		const pending = this.pendingFieldStatus;
		this.pendingFieldStatus = null;
		this.publishHudState(pending ?? fallback);
	}

	private updateHeroOcclusion(publish = true) {
		const camera = this.cameras?.main;
		if (!camera || !this.player) {
			return;
		}
		const screen = heroScreenPosition(camera, this.player);
		// The hero sprite scales with the field zoom; the HUD card stays screen-sized.
		const occluded = isHeroInHeroCardZone(
			screen.x,
			screen.y,
			camera.width,
			camera.height,
			DEFAULT_HERO_HALF_SIZE * camera.zoomX
		);
		if (occluded !== this.heroOccluded) {
			this.heroOccluded = occluded;
			if (publish) {
				this.publishHudState(this.lastPublishedStatus);
			}
		}
	}

	private publishHudState(status: WorldSceneStatus | null) {
		if (this.sceneShutDown) return;
		const locale = this.getLocale();
		const resolvedStatus =
			status === null
				? ''
				: 'key' in status
					? t(locale, status.key, this.resolveStatusParams(status.params))
					: status.text;
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
			status: resolvedStatus,
			areaMap: buildAreaMapState({
				map,
				player: {
					x: this.player?.x ?? map.spawn.x,
					y: this.player?.y ?? map.spawn.y
				},
				revealedCells,
				quests: this.quests,
				locale: this.getLocale(),
				seenDiscoveries: [...this.seenDiscoveryIds]
			}),
			wallet: { ...this.wallet },
			heroOccluded: this.heroOccluded,
			nearbyShop: this.buildNearbyShop(),
			shop: this.buildOpenShop(),
			dialogue: this.buildHudDialogue(),
			battle: {
				phase: 'none',
				summary: null,
				active: null
			},
			quests: buildHudQuestState({ state: this.quests, locale: this.getLocale() }),
			inventory: this.buildHudInventory()
		});
	}

	private buildHudDialogue(): HudState['dialogue'] {
		if (!this.dialogueSession) {
			return null;
		}

		return {
			id: this.dialogueSession.id,
			npcId: this.dialogueSession.npcId,
			speaker: this.dialogueSession.speaker,
			line: this.dialogueSession.line,
			lineIndex: this.dialogueSession.lineIndex,
			lineCount: this.dialogueSession.lineCount,
			mode: this.dialogueSession.mode,
			choices: this.dialogueSession.choices.map((choice) => ({
				id: choice.id,
				label: choice.label,
				kind:
					choice.intent.type === 'openShop'
						? 'trade'
						: choice.intent.type === 'close'
							? 'leave'
							: 'ask'
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
			merchantName: shopText?.merchantName ?? shop.merchantName,
			description: shopText?.description ?? shop.description,
			bustPath: shop.bustPath
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
			description: shopText?.description ?? shop.description,
			bustPath: shop.bustPath,
			buy: buildShopBuyEntries(shop.id, this.shopStockState, locale, {
				base: getHeroBaseStats(this.playerProgress),
				equipment: this.equipment,
				inventory: this.inventory
			}),
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

	/**
	 * Registers every frame declared on a sprite-sheet asset into Phaser's
	 * texture for that asset. Replaces the dozen per-asset `register*Frames`
	 * methods, which were byte-identical apart from the asset constant.
	 */
	private registerAssetFrames(asset: SpriteSheetAsset) {
		const texture = this.textures.get(asset.key);

		for (const [frameName, frame] of Object.entries(asset.frames)) {
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

		const sourceImage = this.textures.get(terrainTilesAsset.key)?.source?.[0]?.image;

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
			const frame = terrainTilesAsset.frames[frameName];
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
		if (isGridWorldMap(map)) {
			this.renderTileGrid(map);
			return;
		}

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

	private renderTileGrid(map: GridWorldMap) {
		const layers = resolveGridTileLayers(map);
		for (const [data, depth] of [
			[layers.ground, -10],
			[layers.edges, -9],
			[layers.canopy, WorldScene.gridCanopyDepth]
		] as const) {
			const tilemap = this.make.tilemap({
				data,
				tileWidth: GRID_TILESET.tileSize,
				tileHeight: GRID_TILESET.tileSize
			});
			const tileset = tilemap.addTilesetImage(
				GRID_TILESET.key,
				GRID_TILESET.key,
				GRID_TILESET.tileSize,
				GRID_TILESET.tileSize
			);
			if (!tileset) continue;
			const layer = tilemap.createLayer(0, tileset, 0, 0) as TilemapLayer | null;
			layer?.setDepth?.(depth);
		}

		this.registerAssetFrames(GRID_OBJECT_SHEET);
		for (const object of resolveGridObjects(map)) this.renderGridObject(object);
	}

	/**
	 * Draws a building or prop in two parts split at the top of its footprint: the
	 * part above covers actors (Grik walks behind the roof), the rest stays under them.
	 */
	private renderGridObject(object: GridObject) {
		const frame = GRID_OBJECT_SHEET.frames[object.frame]!;
		const left = object.x - object.width / 2;
		const top = object.y - object.height;
		const scale = frame.h / object.height;
		const split = Math.min(Math.max(Math.round((object.overheadY - top) * scale), 0), frame.h);
		for (const [cropTop, cropHeight, depth] of [
			[0, split, WorldScene.gridCanopyDepth],
			[split, frame.h - split, WorldScene.gridObjectDepth]
		] as const) {
			if (cropHeight <= 0) continue;
			this.add
				.image(left, top, GRID_OBJECT_SHEET.key, object.frame)
				.setOrigin(0, 0)
				.setDisplaySize(object.width, object.height)
				.setCrop(0, cropTop, frame.w, cropHeight)
				.setDepth(depth);
		}
	}

	/**
	 * Renders one map package as a transaction. A selected package commits no
	 * images or suppression policy until every required descriptor succeeds.
	 */
	private renderRegionalBackgroundPackage(
		map: WorldMapDefinition,
		selection: MapBackgroundPackageSelection
	): RegionalBackgroundPackageRender {
		const definition = selection.definition;
		const backgrounds = definition?.backgrounds ?? [];
		const transactional = definition !== null;
		const successfulBackgroundIds = new Set<string>();
		const entries: RegionalBackgroundPlaneRenderDiagnosticEntry[] = [];
		const createdImages: Phaser.GameObjects.Image[] = [];
		const textureManager = this.textures as typeof this.textures & {
			exists?: (key: string) => boolean;
		};
		let packageFailed = false;

		for (const background of backgrounds) {
			const expectedDimensions = { width: background.width, height: background.height };

			if (!this.renderOptions.regionalBackgrounds) {
				this.pushRegionalBackgroundDiagnosticEntry(
					entries,
					background,
					expectedDimensions,
					null,
					'disabled',
					map.id,
					null
				);
				packageFailed = true;
				continue;
			}

			if (!textureManager.exists?.(background.textureKey)) {
				this.pushRegionalBackgroundDiagnosticEntry(
					entries,
					background,
					expectedDimensions,
					null,
					'missing-texture',
					map.id,
					'unavailable'
				);
				packageFailed = true;
				continue;
			}

			const texture = this.textures.get(background.textureKey) as { key?: string } | undefined;
			if (texture?.key === '__MISSING') {
				this.pushRegionalBackgroundDiagnosticEntry(
					entries,
					background,
					expectedDimensions,
					null,
					'missing-texture',
					map.id,
					'unavailable'
				);
				packageFailed = true;
				continue;
			}

			const dimensions = this.getTextureSourceDimensions(background.textureKey);
			if (!dimensions) {
				this.pushRegionalBackgroundDiagnosticEntry(
					entries,
					background,
					expectedDimensions,
					null,
					'invalid-dimensions',
					map.id,
					'source dimensions unavailable'
				);
				packageFailed = true;
				continue;
			}

			if (dimensions.width !== background.width || dimensions.height !== background.height) {
				this.pushRegionalBackgroundDiagnosticEntry(
					entries,
					background,
					expectedDimensions,
					dimensions,
					'invalid-dimensions',
					map.id,
					'dimensions mismatch',
					` expected=${background.width}x${background.height} actual=${dimensions.width}x${dimensions.height}`
				);
				packageFailed = true;
				continue;
			}

			let image: Phaser.GameObjects.Image | undefined;
			try {
				image = this.add.image(background.x, background.y, background.textureKey);
				if (this.renderOptions.regionalBackgroundFault?.backgroundId === background.id) {
					throw new Error('injected regional background render failure');
				}
				image
					.setOrigin(0.5, 0.5)
					.setDisplaySize(background.width, background.height)
					.setDepth(getMapBackgroundDepth(background));
				createdImages.push(image);
				successfulBackgroundIds.add(background.id);
				entries.push({
					id: background.id,
					textureKey: background.textureKey,
					plane: background.plane,
					expectedDimensions,
					observedDimensions: dimensions,
					renderTransform: {
						x: image.x,
						y: image.y,
						originX: image.originX,
						originY: image.originY,
						displayWidth: image.displayWidth,
						displayHeight: image.displayHeight,
						depth: image.depth
					},
					status: 'rendered'
				});
			} catch {
				image?.destroy();
				this.pushRegionalBackgroundDiagnosticEntry(
					entries,
					background,
					expectedDimensions,
					dimensions,
					'render-failed',
					map.id,
					'render failed'
				);
				packageFailed = true;
			}
		}

		const packageSucceeded =
			transactional && !packageFailed && successfulBackgroundIds.size === backgrounds.length;
		if (transactional && !packageSucceeded) {
			for (const image of createdImages) image.destroy();
			successfulBackgroundIds.clear();
		}

		const presentationMode: MapBackgroundPackagePresentation['presentationMode'] = transactional
			? packageSucceeded
				? 'painted'
				: 'fallback'
			: 'fallback';
		const presentation: RegionalBackgroundPackageRender = {
			packageId: packageSucceeded ? (definition?.id ?? null) : null,
			presentationMode,
			coverage: packageSucceeded ? (definition?.coverage ?? null) : null,
			requiredBackgroundIds: backgrounds.map(({ id }) => id),
			successfulBackgroundIds: [...successfulBackgroundIds],
			selectedBackgroundIds: packageSucceeded ? backgrounds.map(({ id }) => id) : [],
			successfulBackgroundIdSet: successfulBackgroundIds,
			useOwnership: packageSucceeded && definition?.coverage === 'historical-partial'
		};
		const selectedFallbackBlockers = (map.blockers ?? []).filter((blocker) =>
			shouldReportSelectedStaticOverlay(blocker.visual, presentation)
		);
		emitRegionalBackgroundPlaneRenderDiagnostic({
			mapId: map.id,
			regionalBackgroundsEnabled: this.renderOptions.regionalBackgrounds,
			packageId: presentation.packageId,
			requiredBackgroundIds: presentation.requiredBackgroundIds,
			selectedBackgroundIds: presentation.selectedBackgroundIds,
			presentationMode: presentation.presentationMode,
			entries,
			successfulBackgroundIds: presentation.successfulBackgroundIds,
			selectedFallbackBlockerIds: selectedFallbackBlockers.map((blocker) => blocker.id),
			collisionIds: this.getRuntimeCollisionIds(map),
			statefulObjectIds: this.getRuntimeStatefulObjectIds(map)
		});
		return presentation;
	}

	private getRuntimeCollisionIds(map: WorldMapDefinition): string[] {
		return [
			...(map.blockers ?? []).map(({ id }) => id),
			...(map.interiorProps ?? []).flatMap(({ collision }) => (collision ? [collision.id] : []))
		].sort();
	}

	private getRuntimeStatefulObjectIds(map: WorldMapDefinition): string[] {
		return [
			...map.transitions.map(({ id }) => id),
			...(map.pickups ?? []).map(({ id }) => id),
			...(map.encounters ?? []).map(({ id }) => id),
			...(map.npcs ?? []).map(({ id }) => id),
			...(map.ambientNpcs ?? []).map(({ id }) => id),
			...(map.discoveries ?? []).map(({ id }) => id),
			...(map.combatBounds ?? []).map(({ id }) => id)
		].sort();
	}

	/**
	 * Pushes a regional-background diagnostic entry and, when `warnMessage` is
	 * not null, emits the matching `[WorldScene] regional background ...`
	 * warning. Shared by the disabled / missing-texture / invalid-dimensions /
	 * render-failed paths so the entry shape and warning prefix stay in sync.
	 */
	private pushRegionalBackgroundDiagnosticEntry(
		entries: RegionalBackgroundPlaneRenderDiagnosticEntry[],
		background: NonNullable<WorldMapDefinition['backgroundImages']>[number],
		expectedDimensions: { width: number; height: number },
		observedDimensions: { width: number; height: number } | null,
		status: RegionalBackgroundRenderStatus,
		mapId: string,
		warnMessage: string | null,
		warnSuffix = ''
	): void {
		entries.push({
			id: background.id,
			textureKey: background.textureKey,
			plane: background.plane,
			expectedDimensions,
			observedDimensions,
			status
		});
		if (warnMessage !== null) {
			console.warn(
				`[WorldScene] regional background ${warnMessage}: id="${background.id}" textureKey="${background.textureKey}" plane="${background.plane}" mapId="${mapId}"${warnSuffix}`
			);
		}
	}

	/**
	 * Renders a visual overlay of the collision categories for a map when
	 * `renderOptions.collisionDebug` is enabled. Draws, onto a single
	 * high-depth `Graphics` object, the map bounds and player-radius inset,
	 * then the player-expanded exclusion envelopes for blockers and
	 * interior props, and the interaction radii around NPCs, transitions,
	 * pickups, and discoveries. The graphics are cleared and destroyed on
	 * scene shutdown. No-op when collision debugging is disabled.
	 *
	 * @param map - The WorldMapDefinition whose collision shapes are rendered.
	 * @returns void; the overlay is drawn into the scene and tracked via
	 *   `collisionDebugGraphics`.
	 */
	private renderCollisionDebugOverlay(map: WorldMapDefinition) {
		if (!this.renderOptions.collisionDebug) {
			return;
		}

		const width = map.width * WorldScene.tileSize;
		const height = map.height * WorldScene.tileSize;
		const graphics = this.add.graphics();
		this.collisionDebugGraphics = graphics;
		graphics.setDepth(WorldScene.collisionDebugOverlayDepth);
		graphics.lineStyle(2, 0xffffff, 0.95);
		graphics.strokeRect(0, 0, width, height);
		graphics.lineStyle(1, 0x38bdf8, 0.9);
		graphics.strokeRect(
			WorldScene.playerRadius,
			WorldScene.playerRadius,
			width - WorldScene.playerRadius * 2,
			height - WorldScene.playerRadius * 2
		);
		// These are resolved player-center exclusion envelopes and alignment aids, not
		// an exact movement predictor: escape-aware rectangles also depend on the
		// current and target positions.
		graphics.fillStyle(0xff3355, 0.18);
		for (const blocker of map.blockers ?? []) {
			this.fillExpandedCollisionRect(
				graphics,
				this.getMapRectBounds(blocker),
				WorldScene.playerRadius
			);
		}
		for (const prop of map.interiorProps ?? []) {
			if (prop.collision) {
				this.fillExpandedCollisionRect(
					graphics,
					this.getMapRectBounds(prop.collision),
					WorldScene.playerRadius
				);
			}
		}
		graphics.lineStyle(2, 0xc084fc, 0.95);
		for (const npc of map.npcs ?? []) {
			graphics.strokeCircle(
				npc.x,
				npc.y,
				WorldScene.playerRadius + this.getNpcCollisionRadius(npc)
			);
		}
		graphics.lineStyle(2, 0x22d3ee, 0.95);
		for (const transition of map.transitions) {
			graphics.strokeCircle(transition.x, transition.y, WorldScene.doorTriggerRadius);
			if (transition.triggerRect) {
				graphics.strokeRect(
					transition.triggerRect.x,
					transition.triggerRect.y,
					transition.triggerRect.width,
					transition.triggerRect.height
				);
			}
		}
		graphics.lineStyle(2, 0x4ade80, 0.95);
		for (const pickup of map.pickups ?? []) {
			if (!this.collectedPickupIds.has(pickup.id)) {
				graphics.strokeCircle(
					pickup.x,
					pickup.y,
					WorldScene.playerRadius + WorldScene.pickupRadius
				);
			}
		}
		graphics.lineStyle(2, 0xfacc15, 0.95);
		for (const discovery of map.discoveries ?? []) {
			graphics.strokeCircle(
				discovery.x,
				discovery.y,
				WorldScene.playerRadius + (discovery.radius ?? WorldScene.discoveryInteractRadius)
			);
		}
		this.events.once('shutdown', () => {
			graphics.clear();
			graphics.destroy();
			if (this.collisionDebugGraphics === graphics) {
				this.collisionDebugGraphics = undefined;
			}
		});
	}

	private fillExpandedCollisionRect(
		graphics: Phaser.GameObjects.Graphics,
		bounds: CollisionRect,
		padding: number
	) {
		graphics.fillRect(
			bounds.left - padding,
			bounds.top - padding,
			bounds.right - bounds.left + padding * 2,
			bounds.bottom - bounds.top + padding * 2
		);
	}

	private getTextureSourceDimensions(
		textureKey: string
	): { width: number; height: number } | undefined {
		const texture = this.textures.get(textureKey) as {
			key?: string;
			source?: Array<{ width?: number; height?: number }>;
			get?: () => { cutWidth?: number; cutHeight?: number };
		};

		if (!texture || texture.key === '__MISSING') {
			return undefined;
		}

		const source = texture.source?.[0];

		if (typeof source?.width === 'number' && typeof source.height === 'number') {
			return { width: source.width, height: source.height };
		}

		const baseFrame = texture.get?.();

		if (typeof baseFrame?.cutWidth === 'number' && typeof baseFrame.cutHeight === 'number') {
			return { width: baseFrame.cutWidth, height: baseFrame.cutHeight };
		}

		return undefined;
	}

	/** Interiors and the tunnel: authored ground patches on a ruins floor inside a stone rim. */
	private buildGroundTileData(map: WorldMapDefinition) {
		const baseTile = WorldScene.terrainTileIndexes.ruinsFloorTile;
		const stoneTile = WorldScene.terrainTileIndexes.stoneWallTile;

		return Array.from({ length: map.height }, (_, row) =>
			Array.from({ length: map.width }, (_, column) => {
				const patchTile = this.findGroundPatchTile(map, column, row);

				if (patchTile !== undefined) {
					return patchTile;
				}

				if (row === 0 || column === 0 || row === map.height - 1 || column === map.width - 1) {
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
			return enemy.definition.moveSpeed * WorldScene.bossPhaseTwoSpeedMultiplier;
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
			if (this.isFledPackProtected(enemy)) {
				enemy.movementMode = 'idle';
				return undefined;
			}

			enemy.movementMode = 'chase';
			return { x: this.player.x, y: this.player.y };
		}

		const { playerWithinLeash, canAcquire } = this.getEnemyAcquisition(
			this.player,
			enemy,
			combatBounds
		);
		const canContinueChase = enemy.movementMode === 'chase' && playerWithinLeash;

		// The fled pack only re-engages after the player deliberately leaves its
		// acquisition zone; observe the exit before protection skips the chase.
		if (this.recentlyFled?.encounterId === enemy.id) {
			if (playerWithinLeash && canAcquire && this.fledPackZone !== 'exited') {
				this.fledPackZone = 'inside';
			} else if (!(playerWithinLeash && canAcquire) && this.fledPackZone === 'inside') {
				this.fledPackZone = 'exited';
			}
		}

		if (playerWithinLeash && (canAcquire || canContinueChase) && !this.isFledPackProtected(enemy)) {
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

	private getEnemyAcquisition(
		player: { x: number; y: number },
		enemy: EnemyInstance,
		combatBounds: MapCombatBounds
	) {
		const playerDistanceFromHome = Phaser.Math.Distance.Between(
			player.x,
			player.y,
			enemy.homeX,
			enemy.homeY
		);
		const playerInsideForest = this.isPointInsideMapRect(
			player.x,
			player.y,
			combatBounds,
			WorldScene.playerRadius
		);
		return {
			playerWithinLeash: playerInsideForest && playerDistanceFromHome <= combatBounds.leashRadius,
			canAcquire:
				Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y) <=
				combatBounds.aggroRadius
		};
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
	): MapCombatBounds | undefined {
		return this.findCombatBoundsForEnemy(map, enemy);
	}

	/**
	 * A pack the player just fled stays disengaged: every pack gets the grace
	 * window, and a bounded pack also stays protected until the player has
	 * left its acquisition zone (`fledPackZone === 'exited'`, observed in
	 * `resolveEnemyMovementTarget`). Packs without bounds have no finite
	 * pocket to observe, so they re-engage once grace expires.
	 */
	private isFledPackProtected(enemy: EnemyInstance): boolean {
		if (!this.recentlyFled || enemy.id !== this.recentlyFled.encounterId) {
			return false;
		}

		if (this.fledGraceRemainingMs > 0) {
			return true;
		}

		return this.fledPackHasBounds && this.fledPackZone !== 'exited';
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

	private renderBlockers(map: WorldMapDefinition, packageRender: RegionalBackgroundPackageRender) {
		const blockers: MapBlocker[] = map.blockers ?? [];

		for (const blocker of blockers) {
			if (!shouldRenderStaticOverlay(blocker.visual, packageRender)) {
				continue;
			}

			this.add.tileSprite(
				blocker.x,
				blocker.y,
				blocker.width,
				blocker.height,
				environmentDressingAsset.key,
				this.getBlockerFrameName(blocker)
			);
		}
	}

	private getBlockerFrameName(blocker: MapBlocker): EnvironmentDressingFrameName {
		switch (blocker.kind) {
			case 'future-gate':
				return 'futureGate';

			case 'ruin-wall':
				return 'ruinWall';

			default:
				blocker.kind satisfies never;
				throw new Error(`Unknown blocker kind: ${blocker.kind}`);
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

	private renderDiscoveries(map: WorldMapDefinition) {
		this.discoveryMarkers.clear();
		this.discoveryTweens.clear();
		for (const discovery of map.discoveries ?? []) {
			const marker = this.add.circle(discovery.x, discovery.y, 10, 0xfff2b0, 0.55);
			marker.setStrokeStyle(2, 0xffd24d, 0.9);
			marker.setDepth(1000);
			// Hidden until the player approaches; updateDiscoveryMarkers() toggles visibility.
			marker.setVisible(false);
			const tween = this.tweens.add({
				targets: marker,
				alpha: { from: 0.25, to: 0.7 },
				duration: 900,
				yoyo: true,
				repeat: -1
			});
			// Marker starts hidden, so pause the pulse until updateDiscoveryMarkers() reveals it.
			tween.pause();
			this.discoveryTweens.set(discovery.id, tween);
			this.discoveryMarkers.set(discovery.id, marker);
		}
	}

	private renderInteriorProps(
		map: WorldMapDefinition,
		depths: Array<MapInteriorProp['depth']>,
		packageRender: RegionalBackgroundPackageRender
	) {
		for (const prop of map.interiorProps ?? []) {
			const depth = prop.depth ?? 'furniture';

			if (!depths.includes(depth)) {
				continue;
			}
			if (!shouldRenderStaticOverlay(prop.visual, packageRender)) {
				continue;
			}

			this.add
				.image(prop.x, prop.y, interiorPropAsset.key, prop.frameName)
				.setDisplaySize(prop.width, prop.height);
		}
	}

	private renderAmbientNpcs(map: WorldMapDefinition) {
		const ambientNpcs: MapAmbientNpc[] = map.ambientNpcs ?? [];

		for (const npc of ambientNpcs) {
			const usesNpcPack = isNpcPackFrameName(npc.frameName);
			const displaySize = usesNpcPack
				? WorldScene.npcPackDisplaySize
				: WorldScene.starterNpcDisplaySize;

			this.add
				.image(npc.x, npc.y, usesNpcPack ? npcPackAsset.key : starterPackAsset.key, npc.frameName)
				.setDisplaySize(npc.width ?? displaySize.width, npc.height ?? displaySize.height);
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

			// On a grid map the building art draws the door.
			if (isGridWorldMap(map)) continue;

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
		return resolveMovementSegment(
			this.navigationGrid,
			this.navigationObstacles,
			{ x: currentX, y: currentY },
			{ x: targetX, y: targetY },
			WorldScene.playerRadius,
			{
				// A corner slide must not carry the player into a door they are not walking toward.
				canSlideTo: (destination, from, to) =>
					!entersUnrelatedDoorZone(destination, from, to, this.transitions)
			}
		);
	}

	private getNpcCollisionRadius(npc: MapNpc | MapAmbientNpc): number {
		return isNpcPackFrameName(npc.frameName)
			? NPC_PACK_COLLISION_RADIUS
			: STARTER_NPC_COLLISION_RADIUS;
	}

	private getMapRectBounds(rect: MapRect): MapRectBounds {
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

	private resolveMapBackgroundPackageSelection(mapId: string): MapBackgroundPackageSelection {
		return resolveMapBackgroundPackageSelection(MAP_BACKGROUND_PACKAGE_REGISTRY, {
			mapId,
			regionalBackgrounds: this.renderOptions.regionalBackgrounds,
			reviewPackageIds: this.renderOptions.mapBackgroundReviewIds,
			defaultSelection: MAP_BACKGROUND_DEFAULT_SELECTIONS[mapId] ?? null
		});
	}

	private resolveMap(
		mapId?: string,
		packageSelection?: MapBackgroundPackageSelection
	): WorldMapDefinition {
		const source = maps[mapId ?? openingMapId] ?? maps[openingMapId];
		return applyMapBackgroundPackage(
			applyStoryGates(source, getStoryProgress(this.quests)),
			packageSelection ?? this.resolveMapBackgroundPackageSelection(source.id)
		);
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

	/** The region the HUD last named; crossing an already-revealed border must
	 *  still republish, so this compares independently of fog discovery. */
	private refreshPublishedRegion(): boolean {
		const regionId = getRegionId(
			this.mapId,
			this.player ? { x: this.player.x, y: this.player.y } : this.resolveMap(this.mapId).spawn
		);
		if (regionId === this.lastPublishedRegionId) return false;
		this.lastPublishedRegionId = regionId;
		return true;
	}

	// Copying the canvas and encoding a JPEG is expensive, so thumbnails are
	// captured once per map and reused while the save stays on it.
	private lastThumbnailMapId: string | null = null;
	private lastPublishedRegionId: string | null = null;
	private lastThumbnail: string | undefined;

	// Bumped on scene shutdown: a deferred POST_RENDER callback that was queued
	// before a same-update scene switch (pickup autosave followed by
	// startBattle) must not treat the shared canvas as this scene's frame.
	private renderEpoch = 0;
	private unsubscribePreferences: (() => void) | null = null;
	/** Set on shutdown, cleared on create: a destroyed run (return-to-title
	 *  teardown) must not publish HUD state or accept late story responses. */
	private sceneShutDown = false;

	private captureSlotThumbnail(mapId: string, canvasOwned = true): string | undefined {
		// The canvas belongs to another scene (battle started after this save
		// was queued): capturing would cache a foreign frame under this map's
		// id. Reuse the last good thumbnail or save without one — the save
		// itself must still land.
		if (!canvasOwned) {
			return this.lastThumbnail;
		}
		if (mapId !== this.lastThumbnailMapId) {
			const captured = captureSaveThumbnail(this.game?.canvas);
			// Cache only a successful capture — a failed one (canvas not ready
			// yet) must retry on the next save, not stay dropped until the map
			// changes.
			if (captured !== undefined) {
				this.lastThumbnail = captured;
				this.lastThumbnailMapId = mapId;
			}
			return captured;
		}
		return this.lastThumbnail;
	}

	/**
	 * Run `action` on the renderer's post-render tick — after every scene has
	 * drawn, while the canvas buffer still holds the completed frame. This is
	 * what lets thumbnail capture work without preserveDrawingBuffer (which
	 * would slow every frame). Renderers without an event emitter — mocked or
	 * headless environments — run the action immediately.
	 *
	 * The action receives whether THIS scene still owned the canvas when the
	 * frame rendered: a same-update scene switch (pickup autosave queued, then
	 * startBattle) shuts this scene down before the render pass, so the
	 * post-render canvas holds another scene's frame.
	 */
	private afterNextRenderedFrame(action: (canvasOwned: boolean) => void) {
		const renderer = this.game?.renderer;
		if (typeof renderer?.once !== 'function') {
			action(true);
			return;
		}
		const epoch = this.renderEpoch;
		renderer.once(Phaser.Renderer.Events.POST_RENDER, () => {
			action(epoch === this.renderEpoch);
		});
	}

	private buildSlotRecord(
		kind: SaveSlotRecord['kind'],
		state: SaveState,
		canvasOwned = true
	): SaveSlotRecord {
		return {
			kind,
			savedAt: new Date().toISOString(),
			playtimeSeconds: getPlaytimeSeconds(),
			thumbnail: this.captureSlotThumbnail(state.mapId, canvasOwned),
			state
		};
	}

	/**
	 * A `?startMap=` dev run is throwaway: it never overwrites the player's save slots.
	 * Uses the same lookup as BootScene, so an unknown id leaves a normal, saving run.
	 */
	private get isDevMapRun(): boolean {
		return findMap(this.renderOptions.startMapId) !== undefined;
	}

	/**
	 * Persists the autosave slot after this scene's next rendered frame, so the
	 * thumbnail captures the completed canvas. Resolves only once the attempt
	 * settled: true when the write was confirmed on storage, including the
	 * adapter's asynchronous flush. A `?startMap=` dev run is throwaway — it
	 * writes nothing and resolves immediately. Ordinary callers may ignore the
	 * result; the prologue-end card awaits it.
	 */
	private writeAutosave(state: SaveState): Promise<boolean> {
		if (this.isDevMapRun) return Promise.resolve(true);
		return new Promise<boolean>((resolve) => {
			this.afterNextRenderedFrame((canvasOwned) => {
				void this.persistAutosaveSlot(state, canvasOwned).then(resolve);
			});
		});
	}

	private async persistAutosaveSlot(state: SaveState, canvasOwned: boolean): Promise<boolean> {
		try {
			writeSaveSlot(0, this.buildSlotRecord('autosave', state, canvasOwned));
			// The adapter queues an asynchronous disk write; a cache-only
			// "success" must still reach the log when the disk rejects it.
			if (await flushSaveStorage()) {
				return true;
			}
			console.error('Autosave slot was not confirmed on disk.');
			return false;
		} catch (error) {
			// The envelope already retried without thumbnails; a remaining failure
			// means storage is unavailable. Never break gameplay over the autosave.
			console.error('Failed to persist autosave slot.', error);
			return false;
		}
	}

	private writeManualSlot(slot: 1 | 2) {
		if (this.isDevMapRun) {
			this.publishHudState(this.statusMessage('status.saveFailed'));
			return;
		}
		const state = this.buildSaveState();
		this.afterNextRenderedFrame(async (canvasOwned) => {
			try {
				const result = writeSaveSlot(slot, this.buildSlotRecord('manual', state, canvasOwned));
				// setItem only queues the disk write on Tauri — wait for it before
				// telling the player the save landed (review: critical).
				if (!(await flushSaveStorage())) {
					throw new Error('The save was not confirmed on disk.');
				}
				playSfx(this, 'save');
				this.publishHudState(
					this.statusMessage(
						result.thumbnailDropped ? 'status.savedWithoutThumbnail' : 'status.saved'
					)
				);
			} catch (error) {
				console.error('Failed to persist manual save slot.', error);
				this.publishHudState(this.statusMessage('status.saveFailed'));
			}
		});
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
				count: encounter.count,
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
			} else {
				this.playEnemyAnimation(enemy, 'idle');
			}
		}
	}

	private resolveInitialStatus(
		reason: NonNullable<WorldSceneData['reason']>,
		fledBounded: boolean
	): WorldSceneStatus {
		if (reason === 'battle-result') {
			if (fledBounded) {
				return this.statusMessage(
					this.fledPackZone === 'inside'
						? 'status.fledLeaveAndReturn'
						: 'status.fledEnterLeaveAndReturn'
				);
			}
			return this.statusMessage('status.battleReturned');
		}
		if (reason === 'resume') return this.statusMessage('status.saveResumed');
		if (reason === 'transition' || reason === 'story-move')
			return this.statusMessage('status.enteredArea');
		return this.statusMessage('status.newRun');
	}

	private tryTransition() {
		if (!this.player) {
			return false;
		}

		const map = this.resolveMap(this.mapId);
		const hasLivingEnemies = this.hasLivingEnemies();

		for (const transition of map.transitions) {
			if (!isInTransitionZone(transition, this.player)) {
				this.battleReturnTransitions.delete(transition.id);
				continue;
			}

			if (
				this.battleReturnTransitions.has(transition.id) ||
				(transition.requiresClear === true && hasLivingEnemies)
			) {
				continue;
			}

			this.scene.restart({
				saveState: this.buildTransitionSaveState(transition),
				reason: 'transition'
			});
			return true;
		}

		return false;
	}

	private hasLivingEnemies() {
		return this.enemies.some((enemy) => !enemy.defeated);
	}

	private isTrackedAmbientNpcNearby(ambientNpcId: string): boolean {
		if (!this.player) {
			return false;
		}
		const map = this.resolveMap(this.mapId);
		const ambientNpc = map.ambientNpcs?.find((npc) => npc.id === ambientNpcId);
		if (!ambientNpc) {
			return false;
		}
		const distance = Phaser.Math.Distance.Between(
			this.player.x,
			this.player.y,
			ambientNpc.x,
			ambientNpc.y
		);
		return (
			distance <=
			PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS + this.getNpcCollisionRadius(ambientNpc)
		);
	}

	private updateNpcDialogue() {
		if (!this.player) {
			return;
		}

		const nearbyNpc = this.findNearbyNpc();

		if (!nearbyNpc) {
			if (this.currentNearbyNpcId && this.isTrackedAmbientNpcNearby(this.currentNearbyNpcId)) {
				return;
			}

			const hadShop = this.nearbyShopId !== null;
			const hadNearbyStatus =
				this.currentNearbyNpcStatus !== null &&
				this.lastPublishedStatus === this.currentNearbyNpcStatus;
			this.currentNearbyNpcId = null;
			this.currentNearbyNpcStatus = null;
			this.storyDialogueSeq++;
			this.nearbyShopId = null;
			this.openShopId = null;

			if (hadShop) {
				this.publishHudState(this.statusMessage('status.shopOutOfReach'));
			} else if (hadNearbyStatus) {
				this.publishHudState(null);
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

		const nearbyStatus = this.statusMessage('status.npcNearby', {
			npcName: { npcId: nearbyNpc.id, fallback: nearbyNpc.name }
		});
		this.currentNearbyNpcId = nearbyNpc.id;
		this.currentNearbyNpcStatus = nearbyStatus;
		this.publishHudState(nearbyStatus);
	}

	private handleInteractInput(interactPressed: boolean) {
		if (!interactPressed) {
			return;
		}

		const nearbyNpc = this.findNearbyNpc();

		if (this.dialogueSession) {
			if (!nearbyNpc || !this.isTransientFallbackDialogueSession(this.dialogueSession)) {
				return;
			}
		}

		if (!nearbyNpc) {
			const discovery = this.findNearbyDiscovery();
			if (discovery) {
				this.readDiscovery(discovery);
				return;
			}
		}

		this.interactWithNearbyNpc(nearbyNpc);
	}

	private updateDiscoveryMarkers() {
		if (!this.player) {
			return;
		}

		const map = this.resolveMap(this.mapId);
		const playerX = this.player.x;
		const playerY = this.player.y;

		for (const discovery of map.discoveries ?? []) {
			const marker = this.discoveryMarkers.get(discovery.id);
			if (!marker) {
				continue;
			}

			const distance = Phaser.Math.Distance.Between(playerX, playerY, discovery.x, discovery.y);
			const visible = distance <= WorldScene.discoveryRevealRadius;
			marker.setVisible(visible);
			// Keep the pulse tween running only while the marker is on screen; otherwise it
			// would tick forever on an invisible object.
			const tween = this.discoveryTweens.get(discovery.id);
			if (tween) {
				if (visible) {
					tween.resume();
				} else {
					tween.pause();
				}
			}
		}
	}

	private findNearbyDiscovery(): MapDiscovery | undefined {
		if (!this.player) {
			return undefined;
		}

		const player = this.player;
		const map = this.resolveMap(this.mapId);

		return (map.discoveries ?? [])
			.map((discovery) => ({
				discovery,
				distance: Phaser.Math.Distance.Between(player.x, player.y, discovery.x, discovery.y)
			}))
			.filter(
				({ discovery, distance }) =>
					distance <=
					WorldScene.playerRadius + (discovery.radius ?? WorldScene.discoveryInteractRadius)
			)
			.sort((left, right) => left.distance - right.distance)[0]?.discovery;
	}

	private readDiscovery(discovery: MapDiscovery) {
		const locale = this.getLocale();
		this.storyDialogueSeq++;
		if (discovery.sceneId) {
			// The discovery's own scene queues ahead of whatever this inspection
			// unlocks, so a failed fetch takes the same hold-and-replay path as
			// any queued play-scene effect: later cues wait behind it and the
			// checkpoint still carries it for Continue to replay.
			this.quests.pendingEffects.unshift({ type: 'play-scene', sceneId: discovery.sceneId });
		} else if (discovery.descriptionKey) {
			this.dialogueSession = buildDialogueFallback(
				t(locale, discovery.labelKey),
				t(locale, discovery.descriptionKey)
			);
		}

		this.seenDiscoveryIds.add(discovery.id);
		this.applyQuestProgress(
			{ type: 'inspect', discoveryId: discovery.id },
			this.statusMessage('status.dialogueUpdated')
		);
		// Discovery is a durable point: persist the seen id and any quest progress.
		void this.writeAutosave(this.buildSaveState());
	}

	/**
	 * Plays one queued quest effect at a time, between interactions, then re-renders
	 * the map once the story has moved on. Returns true while the world is held.
	 */
	private updateStory(delta: number): boolean {
		if (this.storyEffectRunning || this.dialogueSession || this.openShopId) {
			return this.storyEffectRunning;
		}

		// A queued scene failed to load: hold later effects (the terminal card
		// must never run past a cue the player never saw) until a reload replays
		// the preserved checkpoint. Story-gate refreshes still run so new
		// story-window overlays and NPCs render.
		if (!this.storySceneHold) {
			const next = takeNextQuestEffect(this.quests);
			if (next.effect) {
				this.quests = next.state;
				this.runQuestEffect(next.effect);
				return true;
			}
		}

		if (this.storyRefreshPending) {
			this.storyRefreshPending = false;
			if (this.computeStoryGateKey() !== this.storyGateKey) {
				this.scene.restart({
					saveState: this.buildSaveState(),
					reason: 'story',
					// A held reward status is unshown field copy: carry it as the
					// arrival status so the re-created scene still publishes it.
					// A held scene load carries its failure notice instead — the
					// unshown equip line must not mask it.
					status: this.storySceneHold
						? this.statusMessage('status.storySceneFailed')
						: (this.pendingFieldStatus ?? this.lastPublishedStatus),
					storySceneHold: this.storySceneHold
				});
				return true;
			}
			// The story moved on without changing this map: the music may still change.
			this.refreshFieldAudio();
		}

		// This tick is clear of dialogues, shops, effects, and gate restarts:
		// the claiming toast's window runs down, then the held line lands so a
		// no-dialogue completion never strands it waiting for a close. A held
		// scene load freezes the release — its failure notice stays the status.
		if (this.pendingFieldStatus !== null && !this.storySceneHold) {
			this.heldFieldStatusReleaseMs -= Math.min(Math.max(delta, 0), WorldScene.maxMovementDeltaMs);
			if (this.heldFieldStatusReleaseMs <= 0) {
				this.flushFieldStatus(null);
			}
		}

		return false;
	}

	private runQuestEffect(effect: QuestEffect) {
		this.storyEffectRunning = true;

		if (effect.type === 'play-scene') {
			const requestSeq = ++this.storyDialogueSeq;
			const requestIncarnation = this.storySceneIncarnation;
			// Popped but not yet shown: keep it in every save snapshot until the
			// request settles, so an autosave during the request cannot persist
			// a queue missing the unseen cue.
			this.storySceneInFlight = { effect, seq: requestSeq };
			void this.playStoryScene(effect.sceneId, requestSeq)
				.then((outcome) => {
					// A shutdown or re-create fenced this response (create() cleared
					// the field): the re-created scene already owns the restored
					// queue from its snapshot, so settling would duplicate the cue.
					if (this.storySceneInFlight?.seq !== requestSeq) return;
					this.storySceneInFlight = null;
					if (outcome === 'cancelled') {
						// Superseded before the prose arrived (for example, the player
						// opened a shop): re-queue without holding or reporting an error
						// so the scene plays once clear.
						this.quests.pendingEffects.unshift(effect);
						return;
					}
					if (outcome === 'failed') {
						// The request failed: put the scene back and hold the queue so
						// the marker behind it can't run and save past an unseen cue.
						// The on-disk checkpoint still carries it, so Continue replays.
						this.quests.pendingEffects.unshift(effect);
						this.storySceneHold = true;
						// The hold is not silent: the field status names the failure
						// so the player knows why later beats stopped. No retry here —
						// a reload replays the preserved checkpoint.
						this.publishHudState(this.statusMessage('status.storySceneFailed'));
						return;
					}
					// The scene is on screen: persist its consumption so a reload
					// doesn't replay it. The in-flight hold is cleared above, so the
					// snapshot records the cue as consumed exactly once.
					void this.writeAutosave(this.buildSaveState());
				})
				.finally(() => {
					// A stale response must not clear a newer request's hold, and a
					// request from a shut-down incarnation must never release the
					// re-created scene's hold — not even once the re-created request
					// finished and cleared the in-flight field (its terminal card
					// freeze lasts until teardown).
					if (this.storySceneIncarnation !== requestIncarnation) return;
					if (this.storySceneInFlight && this.storySceneInFlight.seq !== requestSeq) return;
					this.storyEffectRunning = false;
				});
			return;
		}

		// The card concludes the prologue: the world stays frozen until the card
		// is dismissed and the return-to-title teardown destroys this scene, so
		// the freeze is never cleared here — not even after the autosave settles.
		if (effect.type === 'show-prologue-end') {
			// The card owns its music: a Continue from the Chapter One checkpoint
			// lands here without replaying the scene that starts it.
			setMusic(this, 'bgm-title');
			void this.completePrologueEnd();
			return;
		}

		// Sleep, or wake somewhere new: fade out, rest to full HP, and arrive.
		const saveState = this.buildSaveState();
		const arrive = () =>
			this.scene.restart({
				saveState: {
					...saveState,
					mapId: effect.mapId,
					player: {
						...saveState.player,
						hp: this.getEffectiveStats().maxHp,
						x: effect.x,
						y: effect.y,
						facing: effect.facing
					}
				},
				reason: 'story-move',
				// A held reward status rides the fade so the move cannot drop it;
				// an omitted status keeps the default arrival line otherwise.
				status: this.pendingFieldStatus ?? undefined
			});
		const camera = this.cameras.main;
		if (!camera.fadeOut) {
			arrive();
			return;
		}
		camera.once('camerafadeoutcomplete', arrive);
		camera.fadeOut(WorldScene.storyFadeMs, 0, 0, 0);
	}

	/**
	 * Consumes the terminal marker's moment: the queue is already past the last
	 * chapter-one line, so the final autosave persists every quest completed
	 * with no pending marker, and its outcome drives the completion card. The
	 * world stays frozen behind the card until the shell tears this scene down.
	 */
	private async completePrologueEnd() {
		// Same fence as the story-scene continuations: the write outlives a
		// teardown, so its result must only reach the shell while this run —
		// not a re-created scene or a dead one — still owns the card.
		const requestIncarnation = this.storySceneIncarnation;
		const saved = await this.writeAutosave(this.buildSaveState());
		if (this.sceneShutDown || this.storySceneIncarnation !== requestIncarnation) return;
		emitPrologueEnd({ success: saved });
	}

	/** Shows a story scene as a system dialogue once its prose arrives. */
	private async playStoryScene(
		sceneId: string,
		requestSeq: number
	): Promise<'shown' | 'cancelled' | 'failed'> {
		try {
			const session = await getStoryScene({ sceneId, locale: this.getLocale() });
			if (this.storyDialogueSeq !== requestSeq) return 'cancelled';
			this.dialogueSession = session;
			const cue = sceneSfx[sceneId];
			if (cue) playSfx(this, cue);
			const music = sceneMusic[sceneId];
			if (music) setMusic(this, music);
			this.publishHudState(this.statusMessage('status.dialogueUpdated'));
			return 'shown';
		} catch (error) {
			console.error('[story] story scene failed for scene=%s:', sceneId, error);
			return this.storyDialogueSeq !== requestSeq ? 'cancelled' : 'failed';
		}
	}

	/** The music, ambience and light for this map at this point of the story. */
	private refreshFieldAudio() {
		const progress = getStoryProgress(this.quests);
		setMusic(this, musicFor(this.mapId, progress));
		setAmbience(this, ambienceFor(this.mapId, progress));
		this.applyFieldLighting();
	}

	private computeStoryGateKey(): string {
		const source = maps[this.mapId] ?? maps[openingMapId];
		return storyGateSignature(source, getStoryProgress(this.quests));
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
			const ambientNpc = this.findNearbyAmbientNpc();
			if (!ambientNpc) {
				const map = this.resolveMap(this.mapId);
				if (this.player && facesSealedGate(map, this.player.x, this.player.y, this.facing)) {
					this.publishHudState(this.statusMessage('status.wayBarred'));
				}
				return;
			}
			this.dialogueSession = buildDialogueFallback(
				this.getTravelerSpeaker(),
				this.status('content.dialogue.system.nothingToSay')
			);
			const publishedStatus = this.statusMessage('status.nothingToSay');
			this.currentNearbyNpcId = ambientNpc.id;
			this.currentNearbyNpcStatus = publishedStatus;
			this.publishHudState(publishedStatus);
			return;
		}

		this.currentNearbyNpcId = nearbyNpc.id;
		this.currentNearbyNpcStatus = this.statusMessage('status.npcNearby', {
			npcName: { npcId: nearbyNpc.id, fallback: nearbyNpc.name }
		});
		this.nearbyShopId = nearbyNpc.shopId ?? null;
		void this.startNearbyNpcStoryDialogue(nearbyNpc);
	}

	private async startNearbyNpcStoryDialogue(nearbyNpc: MapNpc) {
		const requestSeq = ++this.storyDialogueSeq;

		try {
			const session = await getNpcStoryDialogue({
				npcId: nearbyNpc.dialogueId,
				mapId: this.mapId,
				locale: this.getLocale(),
				progress: getStoryProgress(this.quests)
			});

			if (this.storyDialogueSeq !== requestSeq) {
				return;
			}

			this.dialogueSession = session;
			// Talking is what a talk objective counts, so the line the player reads
			// is the one written for the objective it completes. A talk that
			// advances the quest is a story beat: it cannot be closed or skipped.
			this.applyQuestProgress(
				{ type: 'talk-to-npc', npcId: nearbyNpc.dialogueId },
				this.statusMessage('status.npcNearby', {
					npcName: { npcId: nearbyNpc.id, fallback: nearbyNpc.name }
				}),
				(advanced) => {
					if (advanced && this.dialogueSession === session) {
						session.canClose = false;
					}
				}
			);
			void this.writeAutosave(this.buildSaveState());
		} catch (error) {
			console.error(
				'[story] story dialogue failed for npc=%s map=%s locale=%s:',
				nearbyNpc.dialogueId,
				this.mapId,
				this.getLocale(),
				error
			);

			if (this.storyDialogueSeq !== requestSeq) {
				return;
			}

			this.dialogueSession = buildDialogueFallback(
				this.getTravelerSpeaker(),
				this.status('content.dialogue.system.noDialogueAvailable')
			);
			this.publishHudState(this.statusMessage('status.dialogueUpdated'));
		}
	}

	private findNearbyCandidateNpc<TNpc extends MapNpc | MapAmbientNpc>(
		npcs: readonly TNpc[] | undefined,
		requireFacing = false
	): TNpc | undefined {
		if (!this.player || !npcs || npcs.length === 0) {
			return undefined;
		}

		return selectNearbyCandidate({
			origin: { x: this.player.x, y: this.player.y },
			facing: this.facing,
			reach: PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS,
			requireFacing,
			candidates: npcs.map((npc) => ({
				npc,
				id: npc.id,
				x: npc.x,
				y: npc.y,
				radius: this.getNpcCollisionRadius(npc)
			}))
		})?.npc;
	}

	private findNearbyNpc(): MapNpc | undefined {
		const map = this.resolveMap(this.mapId);
		return this.findNearbyCandidateNpc(map.npcs);
	}

	private findNearbyAmbientNpc(): MapAmbientNpc | undefined {
		const map = this.resolveMap(this.mapId);
		return this.findNearbyCandidateNpc(map.ambientNpcs, true);
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

			if (distance > WorldScene.playerRadius + WorldScene.pickupRadius) {
				continue;
			}

			const granted = grantItems({ inventory: this.inventory, equipment: this.equipment }, [
				{ itemId: pickup.itemId, quantity: pickup.quantity }
			]);
			this.inventory = granted.inventory;
			this.equipment = granted.equipment;
			this.collectedPickupIds.add(pickup.id);
			playSfx(this, 'pickup');
			this.pickupMarkers.get(pickup.id)?.setVisible(false);
			const equippedItemId = granted.equipped.at(-1);
			const pickupEquipStatus =
				equippedItemId !== undefined
					? this.statusMessage('status.equippedItem', {
							itemName: { itemId: equippedItemId }
						})
					: null;
			this.applyQuestProgress(
				{
					type: 'collect-item',
					mapId: this.mapId,
					pickupId: pickup.id,
					itemId: pickup.itemId,
					quantity: pickup.quantity
				},
				this.dialogueSession
					? this.statusMessage('status.foundItem', {
							itemName: { itemId: pickup.itemId }
						})
					: (pickupEquipStatus ??
							this.statusMessage('status.foundItem', {
								itemName: { itemId: pickup.itemId }
							})),
				undefined,
				pickupEquipStatus
			);
			// Pickup is a durable point: persist after the collect-item quest event
			// so quest progress and rewards land in the same autosave.
			void this.writeAutosave(this.buildSaveState());
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
		this.publishHudState(this.statusMessage('status.bossEnraged'));
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

			if (
				chaseDistance > 0 &&
				this.canEnemyAttackPlayer(enemy) &&
				this.isEnemyInBattleRange(enemy)
			) {
				this.startBattle(enemy);
				return;
			}
		}
	}

	private isEnemyInBattleRange(enemy: EnemyInstance): boolean {
		if (!this.player) {
			return false;
		}

		const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
		return distance <= WorldScene.playerRadius + WorldScene.enemyRadius + WorldScene.attackReach;
	}

	private canEnemyAttackPlayer(enemy: EnemyInstance): boolean {
		if (this.isFledPackProtected(enemy)) {
			return false;
		}

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
