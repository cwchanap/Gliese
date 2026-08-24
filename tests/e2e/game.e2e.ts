import { expect, test, type Page } from '@playwright/test';
import { assertMeadowEntryPaintedV2CameraBoundsCovered } from '../../src/lib/game/content/backgrounds/meadow-entry-painted-v2-camera-envelope';
import {
	MEADOW_ENTRY_PAINTED_V2_APPROVED_RUNTIME_BACKGROUNDS,
	MEADOW_ENTRY_PAINTED_V2_RUNTIME_VISUAL_OWNERS
} from '../../src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated';
import { meadowEntryMap, ruinsCoreMap, ruinsThresholdMap } from '../../src/lib/game/content/maps';
import {
	MEADOW_ENTRY_V2_CROSSINGS,
	MEADOW_ENTRY_V2_RIVER_SEGMENTS,
	MEADOW_ENTRY_V2_ROUTE_PATCHES,
	SUNDROP_VILLAGE_V2_BUILDINGS,
	SUNDROP_VILLAGE_V2_PUBLIC_SPACES
} from '../../src/lib/game/content/maps/layouts/meadow-entry-v2';
import { coastRegion } from '../../src/lib/game/content/maps/regions/coast';
import {
	collectLandmarkRects,
	collectStrictCollisionRects,
	isInsideAnyCollisionRect
} from '../../src/lib/game/save/save-state';
import {
	NPC_INTERACTION_RADIUS,
	NPC_PACK_COLLISION_RADIUS,
	PLAYER_COLLISION_RADIUS
} from '../../src/lib/game/core/collision';
import {
	expandedLayoutRectContainsPoint,
	layoutRectContainsPoint
} from '../../src/lib/game/content/maps/layouts/layout-rects';
import { VILLAGE_INTERIOR_LAYOUTS } from '../../src/lib/game/content/maps/layouts/village-interiors-v2';

type HudStateSnapshot = {
	ready?: boolean;
	mapId?: string;
	status?: string;
	areaMap?: { player?: { x?: number; y?: number } };
	dialogue?: unknown;
	battle?: unknown;
	nearbyShop?: { shopId?: string; merchantName?: string } | null;
	inventory?: {
		consumables?: Array<{ itemId?: string; quantity?: number }>;
		keyItems?: Array<{ itemId?: string; quantity?: number }>;
	};
};

type PlayerMovementDiagnostic = {
	mapId: string;
	previousPosition: { x: number; y: number };
	requestedPosition: { x: number; y: number };
	resolvedPosition: { x: number; y: number };
	blocked: boolean;
};

type TransitionSourceWaitResult = {
	found: boolean;
	diagnostic: PlayerMovementDiagnostic | null;
	lastDiagnostic: PlayerMovementDiagnostic | null;
	hudMapId: string | null;
	diagnosticCount: number;
	sourceEventCount: number;
	sourceWaitStartedAt?: number;
	sourceWaitFinishedAt?: number;
	sourceDiagnosticAt?: number | null;
	sourceHudAt?: number;
	sourceMovementAt?: number;
};

type SceneEncounterDiagnostic = {
	mapId: string;
	clearedEncounterIds: string[];
	enemies: Array<{
		id: string;
		defeated: boolean;
		hp: number;
		maxHp: number;
	}>;
};

type TransitionGateDiagnostic = SceneEncounterDiagnostic & {
	player: { x: number; y: number } | null;
	hasLivingEnemies: boolean;
};

type RegionalBackgroundPlaneRenderDiagnosticEntry = {
	id: string;
	status: string;
	expectedDimensions: { width: number; height: number };
	observedDimensions: { width: number; height: number } | null;
};

type RegionalBackgroundPlaneRenderDiagnostic = {
	mapId: string;
	regionalBackgroundsEnabled: boolean;
	paintedMode: 'fallback' | 'pilot' | 'production';
	entries: RegionalBackgroundPlaneRenderDiagnosticEntry[];
	successfulBackgroundIds: string[];
	selectedFallbackBlockerIds?: string[];
	selectedFallbackDecorIds: string[];
	selectedFallbackFenceIds: string[];
};

type RegionalBackgroundRendererDiagnostic = {
	renderer: 'webgl' | 'canvas';
	paintedMode: 'fallback' | 'pilot' | 'production';
	maxTextureSize: number | null;
	regionalBackgroundLoadMs: number | null;
	regionalBackgroundLoadCompletions: number;
};

type MeadowCameraSample = {
	mapId: string;
	routeToken: string;
	pointIndex: number;
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
};

type MeadowSceneCamera = {
	worldView?: {
		x?: number;
		y?: number;
		left?: number;
		top?: number;
		right?: number;
		bottom?: number;
		width?: number;
		height?: number;
	};
};

type GlieseProbeWindow = Window & {
	__glieseLastHudState?: HudStateSnapshot;
	__glieseLastPlayerFacing?: string;
	__glieseLastHudAt?: number;
	__glieseMovementDiagnostics?: PlayerMovementDiagnostic[];
	__glieseLastMovementDiagnostic?: PlayerMovementDiagnostic;
	__glieseLastMovementAt?: number;
	__glieseSceneEncounterState?: SceneEncounterDiagnostic;
	__glieseTransitionGateState?: TransitionGateDiagnostic;
	__glieseTransitionSourceWait?: () => Promise<TransitionSourceWaitResult>;
	__glieseTransitionSourceCleanup?: () => void;
	__glieseCharacterizationMovementCount?: number;
	__glieseCharacterizationSyntheticPhase?: boolean;
	__glieseRegionalBackgroundDiagnostics?: RegionalBackgroundPlaneRenderDiagnostic[];
	__glieseRegionalBackgroundRendererDiagnostics?: RegionalBackgroundRendererDiagnostic[];
	__glieseActiveSceneCamera?: MeadowSceneCamera;
	__glieseCameraSamples?: MeadowCameraSample[];
	__glieseExteriorRouteTokens?: string[];
	__glieseRouteVisibilityState?: string;
	__glieseRouteHasFocus?: boolean;
	__glieseRouteBlurAt?: number;
	__glieseRouteFocusAt?: number;
	__glieseRouteRunner?: {
		start: (plan: BrowserRoutePlan) => BrowserRouteResult;
		get: (token: string) => BrowserRouteResult | null;
		cancel: (token: string, reason: string) => BrowserRouteResult | null;
		startGuildMasterSemanticDiagonal: (
			plan: GuildMasterSemanticDiagonalPlan
		) => GuildMasterSemanticDiagonalResult;
		getGuildMasterSemanticDiagonal: (token: string) => GuildMasterSemanticDiagonalResult | null;
		cancelGuildMasterSemanticDiagonal: (
			token: string,
			reason: string
		) => GuildMasterSemanticDiagonalResult | null;
		startCaveDoorwayBand: (plan: CaveDoorwayBandPlan) => CaveDoorwayBandResult;
		getCaveDoorwayBand: (token: string) => CaveDoorwayBandResult | null;
		cancelCaveDoorwayBand: (token: string, reason: string) => CaveDoorwayBandResult | null;
		active: () => BrowserRouteResult | null;
	};
};

function commandBox(page: Page, name = 'Command') {
	return page.getByRole('region', { name });
}

function fieldStatus(page: Page) {
	return page.getByRole('status', { name: 'Field status' });
}

function createQuestFixture() {
	return {
		entries: {
			'investigate-the-ruins': {
				status: 'active',
				currentObjectiveId: 'talk-to-guild-master',
				progress: 0,
				rewardApplied: false,
				countedSourceIds: []
			}
		},
		completedObjectives: {}
	};
}

type SaveFixtureOverrides = Partial<{
	mapId: string;
	player: {
		level: number;
		xp: number;
		hp: number;
		attack: number;
		x: number;
		y: number;
		facing: string;
	};
	inventory: {
		stacks: { itemId: string; quantity: number }[];
		equipment: string[];
	};
	equipment: {
		weapon: string | null;
		head: string | null;
		body: string | null;
		hands: string | null;
		accessory: string | null;
	};
	wallet: { coins: number };
}> & {
	clearedEncounters?: string[];
	collectedPickups?: string[];
	seenDiscoveries?: string[];
};

// Single source of truth for the save schema version/storage key in this e2e
// suite. Mirrors SAVE_STORAGE_KEY / SaveState.version in src/lib/game/save —
// kept local (not imported) so the Playwright Node worker doesn't have to
// resolve the game's `$lib` alias. addInitScript callbacks run in the browser
// and cannot close over Node bindings, so the key is passed to them as an arg.
const SAVE_VERSION = 8;
const SAVE_STORAGE_KEY = 'gliese.save.v8';

// addInitScript serializes its callback to the browser and accepts only one
// arg, so the save JSON and storage key are bundled into a single object.
type SaveInitPayload = { encoded: string; key: string };
type SaveSeedInitPayload = SaveInitPayload & { marker: string };
const SAVE_SEED_MARKER = '__gliese_e2e_save_seeded_v1';

function createSaveFixture(overrides: SaveFixtureOverrides = {}) {
	return {
		version: SAVE_VERSION,
		mapExploration: {},
		mapId: overrides.mapId ?? 'meadow-entry',
		player: overrides.player ?? {
			level: 1,
			xp: 0,
			hp: 20,
			attack: 3,
			x: 256,
			y: 144,
			facing: 'down'
		},
		flags: {
			clearedEncounters: overrides.clearedEncounters ?? [],
			clearedEncounterUnitCounts: {},
			collectedPickups: overrides.collectedPickups ?? [],
			resolvedEncounterDrops: {}
		},
		inventory: overrides.inventory ?? {
			stacks: [{ itemId: 'field-potion', quantity: 1 }],
			equipment: ['training-sword']
		},
		equipment: overrides.equipment ?? {
			weapon: 'training-sword',
			head: null,
			body: null,
			hands: null,
			accessory: null
		},
		wallet: overrides.wallet ?? { coins: 30 },
		shops: {
			stock: {
				'guild-quartermaster': {
					'iron-cap': 1,
					'grip-wraps': 1,
					'traveler-vest': 1
				}
			}
		},
		quests: createQuestFixture(),
		seenDiscoveries: overrides.seenDiscoveries ?? []
	};
}

function injectSave(page: Page, save: ReturnType<typeof createSaveFixture>) {
	return page.addInitScript(
		(payload: SaveSeedInitPayload) => {
			// The fixture is intentionally seeded once per page session. A reload
			// must exercise the save written by the game; checking localStorage
			// alone would allow an app-side removal to silently re-seed the stale
			// fixture and mask persistence regressions.
			if (window.sessionStorage.getItem(payload.marker) === '1') return;
			window.localStorage.setItem(payload.key, payload.encoded);
			window.sessionStorage.setItem(payload.marker, '1');
		},
		{ encoded: JSON.stringify(save), key: SAVE_STORAGE_KEY, marker: SAVE_SEED_MARKER }
	);
}

function rewriteSceneStateProbeSource(servedBody: string): string {
	const encounterMatch = servedBody.match(
		/(this\.setupEncounters\(([^)]+)\)),this\.renderTransitions\(\2\)/
	);
	const transitionGateMatch = servedBody.match(
		/((?<![A-Za-z0-9_$])[A-Za-z_$][\w$]*)=this\.hasLivingEnemies\(\);for\(let ([A-Za-z_$][\w$]*) of ([A-Za-z_$][\w$]*)\.transitions\)/
	);
	if (!encounterMatch) {
		throw new Error('WorldScene encounter probe marker was not found in the served test chunk');
	}
	if (!transitionGateMatch) {
		throw new Error(
			'WorldScene transition gate probe marker was not found in the served test chunk'
		);
	}
	servedBody = servedBody.replace(
		encounterMatch[0],
		`${encounterMatch[1]},globalThis.__glieseSceneEncounterState={mapId:this.mapId,clearedEncounterIds:[...this.clearedEncounterIds],enemies:this.enemies.map(e=>({id:e.id,defeated:e.defeated,hp:e.hp,maxHp:e.maxHp}))},this.renderTransitions(${encounterMatch[2]})`
	);
	const [, livingEnemiesVariable, transitionVariable, mapVariable] = transitionGateMatch;
	return servedBody.replace(
		transitionGateMatch[0],
		`${livingEnemiesVariable}=this.hasLivingEnemies();globalThis.__glieseTransitionGateState={mapId:this.mapId,player:this.player?{x:this.player.x,y:this.player.y}:null,hasLivingEnemies:${livingEnemiesVariable},clearedEncounterIds:[...this.clearedEncounterIds],enemies:this.enemies.map(e=>({id:e.id,defeated:e.defeated,hp:e.hp,maxHp:e.maxHp}))};for(let ${transitionVariable} of ${mapVariable}.transitions)`
	);
}

async function installRuntimeProbes(
	page: Page,
	options: { captureFacing?: boolean; captureSceneState?: boolean } = {}
) {
	// WorldScene keeps its live facing private and the HUD intentionally omits it.
	// Instrument only the browser-served test chunk so the E2E can observe the
	// scene-create transition payload without adding a production diagnostic hook
	// or mutating any game state. The replacement is limited to the existing
	// authored `create()` assignment and records the value after it is applied.
	if (options.captureFacing || options.captureSceneState) {
		await page.route('**/assets/WorldScene-*.js', async (route) => {
			const response = await route.fetch();
			const body = await response.text();
			let servedBody = body;
			// Vite's chunk minifier renames local variables between builds. Match the
			// authored assignments by their stable property names instead of coupling
			// the probe to one particular minified variable spelling.
			if (options.captureFacing) {
				const facingMatch = servedBody.match(/this\.facing=[^;]*?spawnDirection/);
				const cameraMatch = servedBody.match(
					/this\.cameras\.main\.startFollow\(this\.player,[^;]*?cameraFollowLerp\),/
				);
				if (!facingMatch) {
					throw new Error('WorldScene facing probe marker was not found in the served test chunk');
				}
				if (!cameraMatch) {
					throw new Error('WorldScene camera probe marker was not found in the served test chunk');
				}
				servedBody = servedBody.replace(
					facingMatch[0],
					`${facingMatch[0]},globalThis.__glieseLastPlayerFacing=this.facing`
				);
				servedBody = servedBody.replace(
					cameraMatch[0],
					`${cameraMatch[0]}globalThis.__glieseActiveSceneCamera=this.cameras.main,`
				);
			}
			if (options.captureSceneState) {
				servedBody = rewriteSceneStateProbeSource(servedBody);
			}
			await route.fulfill({
				response,
				body: servedBody
			});
		});
	}

	return page.addInitScript(() => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseLastHudState = undefined;
		probeWindow.__glieseLastPlayerFacing = undefined;
		probeWindow.__glieseLastHudAt = 0;
		probeWindow.__glieseMovementDiagnostics = [];
		probeWindow.__glieseLastMovementDiagnostic = undefined;
		probeWindow.__glieseLastMovementAt = 0;
		probeWindow.__glieseSceneEncounterState = undefined;
		probeWindow.__glieseTransitionGateState = undefined;
		probeWindow.__glieseRegionalBackgroundDiagnostics = [];
		probeWindow.__glieseRegionalBackgroundRendererDiagnostics = [];
		probeWindow.__glieseActiveSceneCamera = undefined;
		probeWindow.__glieseCameraSamples = [];
		probeWindow.__glieseExteriorRouteTokens = [];
		probeWindow.__glieseRouteVisibilityState = document.visibilityState;
		probeWindow.__glieseRouteHasFocus = document.hasFocus();
		probeWindow.__glieseRouteBlurAt = undefined;
		probeWindow.__glieseRouteFocusAt = undefined;
		window.addEventListener('gliese:hud-state', (event) => {
			probeWindow.__glieseLastHudState = (event as CustomEvent<HudStateSnapshot>).detail;
			probeWindow.__glieseLastHudAt = performance.now();
		});
		window.addEventListener('gliese:player-movement-diagnostic', (event) => {
			const detail = (event as CustomEvent<PlayerMovementDiagnostic>).detail;
			probeWindow.__glieseMovementDiagnostics?.push(detail);
			probeWindow.__glieseLastMovementDiagnostic = detail;
			probeWindow.__glieseLastMovementAt = performance.now();
		});
		window.addEventListener('gliese:regional-background-plane-render-diagnostic', (event) => {
			probeWindow.__glieseRegionalBackgroundDiagnostics?.push(
				(event as CustomEvent<RegionalBackgroundPlaneRenderDiagnostic>).detail
			);
		});
		window.addEventListener('gliese:regional-background-renderer-diagnostic', (event) => {
			probeWindow.__glieseRegionalBackgroundRendererDiagnostics?.push(
				(event as CustomEvent<RegionalBackgroundRendererDiagnostic>).detail
			);
		});
		const recordRouteFocus = () => {
			probeWindow.__glieseRouteVisibilityState = document.visibilityState;
			probeWindow.__glieseRouteHasFocus = document.hasFocus();
			probeWindow.__glieseRouteFocusAt = performance.now();
		};
		const recordRouteBlur = () => {
			probeWindow.__glieseRouteVisibilityState = document.visibilityState;
			probeWindow.__glieseRouteHasFocus = document.hasFocus();
			probeWindow.__glieseRouteBlurAt = performance.now();
		};
		window.addEventListener('focus', recordRouteFocus);
		window.addEventListener('blur', recordRouteBlur);
		document.addEventListener('visibilitychange', () => {
			probeWindow.__glieseRouteVisibilityState = document.visibilityState;
			probeWindow.__glieseRouteHasFocus = document.hasFocus();
		});

		type ArrowKey = 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp';
		const keyCodes: Record<ArrowKey, number> = {
			ArrowDown: 40,
			ArrowLeft: 37,
			ArrowRight: 39,
			ArrowUp: 38
		};
		type InternalRouteState = BrowserRouteResult & {
			points: Point[];
			mapId: string;
			settleTolerance: number;
			reachTolerance: number;
			maxCorrectionTaps: number;
			blockedTolerance: number;
			activeKey: ArrowKey | null;
			startedAt: number;
			lastProgressAt: number;
			leaseFrameCount: number;
			lastLeaseAt: number | null;
			movementCount: number;
			lastMovementAt: number | null;
			correctionTaps: number;
			noProgressDiagnostics: number;
			settledAxes: { x: boolean; y: boolean };
			axisHistory: Axis[];
			diagnostics: PlayerMovementDiagnostic[];
			invalidDiagnostics: PlayerMovementDiagnostic[];
			diagnosticAxes: Axis[];
		};
		type InternalGuildMasterSemanticDiagonalState = GuildMasterSemanticDiagonalResult & {
			expectedMapId: string;
			minY: number;
			maxYExclusive: number;
			xDirection: -1 | 1;
			yDirection: -1 | 0 | 1;
		};
		type InternalCaveDoorwayBandState = CaveDoorwayBandResult & {
			expectedMapId: string;
			minX: number;
			maxXExclusive: number;
			expectedY: number;
			xDirection: -1 | 0 | 1;
		};
		let routeState: InternalRouteState | null = null;
		let keyLeaseFrame: number | null = null;
		let semanticDiagonalState: InternalGuildMasterSemanticDiagonalState | null = null;
		let semanticKeyLeaseFrame: number | null = null;
		let caveDoorwayBandState: InternalCaveDoorwayBandState | null = null;
		let caveDoorwayBandKeyLeaseFrame: number | null = null;

		const cloneDiagnostic = (diagnostic: PlayerMovementDiagnostic | null) =>
			diagnostic
				? {
						mapId: diagnostic.mapId,
						previousPosition: { ...diagnostic.previousPosition },
						requestedPosition: { ...diagnostic.requestedPosition },
						resolvedPosition: { ...diagnostic.resolvedPosition },
						blocked: diagnostic.blocked
					}
				: null;
		const semanticSnapshot = (): GuildMasterSemanticDiagonalResult | null => {
			if (!semanticDiagonalState) return null;
			return {
				token: semanticDiagonalState.token,
				mapId: semanticDiagonalState.mapId,
				status: semanticDiagonalState.status,
				position: semanticDiagonalState.position ? { ...semanticDiagonalState.position } : null,
				lastDiagnostic: cloneDiagnostic(semanticDiagonalState.lastDiagnostic),
				diagnostics: semanticDiagonalState.diagnostics.map(
					(diagnostic) => cloneDiagnostic(diagnostic)!
				),
				invalidDiagnostics: semanticDiagonalState.invalidDiagnostics.map(
					(diagnostic) => cloneDiagnostic(diagnostic)!
				),
				activeKeys: [...semanticDiagonalState.activeKeys],
				releasedKeys: [...semanticDiagonalState.releasedKeys],
				released: semanticDiagonalState.released,
				startedAt: semanticDiagonalState.startedAt,
				finishedAt: semanticDiagonalState.finishedAt,
				error: semanticDiagonalState.error
			};
		};
		const snapshot = (): BrowserRouteResult | null => {
			if (!routeState) return null;
			return {
				token: routeState.token,
				mapId: routeState.mapId,
				status: routeState.status,
				pointIndex: routeState.pointIndex,
				axis: routeState.axis,
				position: routeState.position ? { ...routeState.position } : null,
				target: routeState.target ? { ...routeState.target } : null,
				lastDiagnostic: cloneDiagnostic(routeState.lastDiagnostic),
				axisHistory: [...routeState.axisHistory],
				diagnostics: routeState.diagnostics.map((diagnostic) => cloneDiagnostic(diagnostic)!),
				invalidDiagnostics: routeState.invalidDiagnostics.map(
					(diagnostic) => cloneDiagnostic(diagnostic)!
				),
				diagnosticAxes: [...routeState.diagnosticAxes],
				activeKey: routeState.activeKey,
				startedAt: routeState.startedAt,
				lastProgressAt: routeState.lastProgressAt,
				leaseFrameCount: routeState.leaseFrameCount,
				lastLeaseAt: routeState.lastLeaseAt,
				movementCount: routeState.movementCount,
				lastMovementAt: routeState.lastMovementAt,
				visibilityState: probeWindow.__glieseRouteVisibilityState ?? document.visibilityState,
				hasFocus: probeWindow.__glieseRouteHasFocus ?? document.hasFocus(),
				blurAt: probeWindow.__glieseRouteBlurAt,
				focusAt: probeWindow.__glieseRouteFocusAt,
				error: routeState.error
			};
		};
		const dispatchSyntheticKey = (type: 'keydown' | 'keyup', key: ArrowKey) => {
			const keyCode = keyCodes[key];
			const event = new KeyboardEvent(type, {
				bubbles: true,
				cancelable: true,
				code: key,
				key,
				location: 0,
				repeat: false
			});
			// KeyboardEventInit does not expose keyCode/which, while Phaser's keyboard
			// manager intentionally reads both legacy fields from the DOM event.
			for (const field of ['keyCode', 'which'] as const) {
				try {
					Object.defineProperty(event, field, { configurable: true, value: keyCode });
				} catch {
					// Chromium exposes these as configurable accessors; retain the native
					// event if another browser makes the legacy field non-configurable.
				}
			}
			window.dispatchEvent(event);
		};
		const cancelSemanticKeyLease = () => {
			if (semanticKeyLeaseFrame === null) return;
			cancelAnimationFrame(semanticKeyLeaseFrame);
			semanticKeyLeaseFrame = null;
		};
		const releaseSemanticDiagonalKeys = () => {
			if (!semanticDiagonalState) return;
			cancelSemanticKeyLease();
			for (const key of [...semanticDiagonalState.activeKeys].reverse()) {
				dispatchSyntheticKey('keyup', key);
				semanticDiagonalState.releasedKeys.push(key);
			}
			semanticDiagonalState.activeKeys = [];
			semanticDiagonalState.released = true;
		};
		const finishSemanticDiagonal = (status: 'done' | 'error', error?: string) => {
			if (!semanticDiagonalState) return;
			releaseSemanticDiagonalKeys();
			semanticDiagonalState.status = status;
			semanticDiagonalState.finishedAt = performance.now();
			if (error) semanticDiagonalState.error = error;
		};
		const runSemanticKeyLeaseFrame = () => {
			semanticKeyLeaseFrame = null;
			if (!semanticDiagonalState || semanticDiagonalState.status !== 'running') return;
			for (const key of semanticDiagonalState.activeKeys) {
				dispatchSyntheticKey('keydown', key);
			}
			semanticKeyLeaseFrame = requestAnimationFrame(runSemanticKeyLeaseFrame);
		};
		const startSemanticKeyLease = () => {
			if (semanticKeyLeaseFrame !== null) return;
			semanticKeyLeaseFrame = requestAnimationFrame(runSemanticKeyLeaseFrame);
		};
		const cancelKeyLease = () => {
			if (keyLeaseFrame === null) return;
			cancelAnimationFrame(keyLeaseFrame);
			keyLeaseFrame = null;
		};
		const runKeyLeaseFrame = () => {
			keyLeaseFrame = null;
			if (!routeState || routeState.status !== 'running' || !routeState.activeKey) return;
			routeState.leaseFrameCount += 1;
			routeState.lastLeaseAt = performance.now();
			dispatchSyntheticKey('keydown', routeState.activeKey);
			keyLeaseFrame = requestAnimationFrame(runKeyLeaseFrame);
		};
		const startKeyLease = () => {
			if (keyLeaseFrame !== null) return;
			keyLeaseFrame = requestAnimationFrame(runKeyLeaseFrame);
		};
		const releaseKey = () => {
			if (!routeState?.activeKey) return;
			const key = routeState.activeKey;
			routeState.activeKey = null;
			dispatchSyntheticKey('keyup', key);
		};
		const pressKey = (key: ArrowKey) => {
			if (routeState?.activeKey === key) return;
			releaseKey();
			dispatchSyntheticKey('keydown', key);
			if (routeState) routeState.activeKey = key;
		};
		const failRoute = (message: string) => {
			cancelKeyLease();
			releaseKey();
			if (!routeState) return;
			routeState.status = 'error';
			routeState.error = message;
		};
		const axisKey = (axis: Axis, direction: number): ArrowKey => {
			if (axis === 'x') return direction > 0 ? 'ArrowRight' : 'ArrowLeft';
			return direction > 0 ? 'ArrowDown' : 'ArrowUp';
		};
		const actualPosition = (): Point | null => {
			const diagnostic = probeWindow.__glieseLastMovementDiagnostic;
			const movementAt = probeWindow.__glieseLastMovementAt ?? 0;
			const hudState = probeWindow.__glieseLastHudState;
			const hudPlayer = hudState?.areaMap?.player;
			const hudAt = probeWindow.__glieseLastHudAt ?? 0;
			const diagnosticPosition = diagnostic?.resolvedPosition;
			if (
				diagnostic?.mapId === hudState?.mapId &&
				diagnosticPosition &&
				typeof diagnosticPosition.x === 'number' &&
				typeof diagnosticPosition.y === 'number' &&
				movementAt >= hudAt
			) {
				return { ...diagnosticPosition };
			}
			if (typeof hudPlayer?.x === 'number' && typeof hudPlayer.y === 'number') {
				return { x: hudPlayer.x, y: hudPlayer.y };
			}
			return diagnosticPosition ? { ...diagnosticPosition } : null;
		};
		const startGuildMasterSemanticDiagonal = (
			plan: GuildMasterSemanticDiagonalPlan
		): GuildMasterSemanticDiagonalResult => {
			if (semanticDiagonalState?.status === 'running') {
				finishSemanticDiagonal('error', 'semantic diagonal was already active');
			}
			const currentMapId = probeWindow.__glieseLastHudState?.mapId ?? '';
			const position = actualPosition();
			semanticDiagonalState = {
				token: plan.token,
				mapId: currentMapId,
				status: 'running',
				position: position ? { ...position } : null,
				lastDiagnostic: null,
				diagnostics: [],
				invalidDiagnostics: [],
				activeKeys: [],
				releasedKeys: [],
				released: false,
				startedAt: performance.now(),
				finishedAt: null,
				expectedMapId: plan.expectedMapId,
				minY: plan.minY,
				maxYExclusive: plan.maxYExclusive,
				xDirection: plan.xDirection,
				yDirection: 0
			};
			if (
				!Number.isFinite(plan.minY) ||
				!Number.isFinite(plan.maxYExclusive) ||
				plan.minY >= plan.maxYExclusive ||
				(plan.xDirection !== -1 && plan.xDirection !== 1)
			) {
				finishSemanticDiagonal('error', `invalid semantic diagonal plan ${JSON.stringify(plan)}`);
				return semanticSnapshot()!;
			}
			if (!position) {
				finishSemanticDiagonal('error', 'semantic diagonal missing current player position');
				return semanticSnapshot()!;
			}
			if (currentMapId !== plan.expectedMapId) {
				finishSemanticDiagonal(
					'error',
					`semantic diagonal started on ${currentMapId}; expected ${plan.expectedMapId}`
				);
				return semanticSnapshot()!;
			}
			const yDirection: -1 | 0 | 1 =
				position.y < plan.minY ? 1 : position.y >= plan.maxYExclusive ? -1 : 0;
			semanticDiagonalState.yDirection = yDirection;
			if (yDirection === 0) {
				finishSemanticDiagonal('done');
				return semanticSnapshot()!;
			}
			const yKey = yDirection > 0 ? 'ArrowDown' : 'ArrowUp';
			semanticDiagonalState.activeKeys = [yKey, 'ArrowLeft'];
			dispatchSyntheticKey('keydown', yKey);
			dispatchSyntheticKey('keydown', 'ArrowLeft');
			startSemanticKeyLease();
			return semanticSnapshot()!;
		};
		const onGuildMasterSemanticDiagonalDiagnostic = (event: Event) => {
			if (!semanticDiagonalState || semanticDiagonalState.status !== 'running') return;
			const diagnostic = (event as CustomEvent<PlayerMovementDiagnostic>).detail;
			const clonedDiagnostic = {
				mapId: diagnostic.mapId,
				previousPosition: { ...diagnostic.previousPosition },
				requestedPosition: { ...diagnostic.requestedPosition },
				resolvedPosition: { ...diagnostic.resolvedPosition },
				blocked: diagnostic.blocked
			};
			semanticDiagonalState.diagnostics.push(clonedDiagnostic);
			semanticDiagonalState.lastDiagnostic = clonedDiagnostic;
			semanticDiagonalState.position = { ...diagnostic.resolvedPosition };
			const failSemanticDiagnostic = (reason: string) => {
				semanticDiagonalState!.invalidDiagnostics.push(clonedDiagnostic);
				finishSemanticDiagonal('error', reason);
			};
			if (diagnostic.mapId !== semanticDiagonalState.expectedMapId) {
				failSemanticDiagnostic(
					`semantic diagonal received wrong-map diagnostic: expected ${semanticDiagonalState.expectedMapId}, received ${diagnostic.mapId}`
				);
				return;
			}
			if (diagnostic.blocked) {
				failSemanticDiagnostic('semantic diagonal received blocked diagnostic');
				return;
			}
			const { previousPosition, resolvedPosition } = diagnostic;
			if (
				![previousPosition.x, previousPosition.y, resolvedPosition.x, resolvedPosition.y].every(
					(value) => Number.isFinite(value)
				)
			) {
				failSemanticDiagnostic('semantic diagonal received non-finite diagnostic');
				return;
			}
			const movedAwayFromDesk =
				(resolvedPosition.x - previousPosition.x) * semanticDiagonalState.xDirection > 0;
			const movedTowardBand =
				semanticDiagonalState.yDirection === 1
					? resolvedPosition.y > previousPosition.y
					: semanticDiagonalState.yDirection === -1
						? resolvedPosition.y < previousPosition.y
						: false;
			if (!movedAwayFromDesk || !movedTowardBand) {
				failSemanticDiagnostic(
					`semantic diagonal did not make monotonic progress: ${JSON.stringify({ diagnostic, movedAwayFromDesk, movedTowardBand })}`
				);
				return;
			}
			const overshotBand =
				semanticDiagonalState.yDirection === 1
					? resolvedPosition.y >= semanticDiagonalState.maxYExclusive
					: resolvedPosition.y < semanticDiagonalState.minY;
			if (overshotBand) {
				failSemanticDiagnostic(
					`semantic diagonal overshot its band: ${JSON.stringify({ diagnostic, minY: semanticDiagonalState.minY, maxYExclusive: semanticDiagonalState.maxYExclusive })}`
				);
				return;
			}
			if (
				resolvedPosition.y >= semanticDiagonalState.minY &&
				resolvedPosition.y < semanticDiagonalState.maxYExclusive
			) {
				finishSemanticDiagonal('done');
			}
		};
		const caveDoorwaySnapshot = (): CaveDoorwayBandResult | null => {
			if (!caveDoorwayBandState) return null;
			return {
				token: caveDoorwayBandState.token,
				mapId: caveDoorwayBandState.mapId,
				status: caveDoorwayBandState.status,
				position: caveDoorwayBandState.position ? { ...caveDoorwayBandState.position } : null,
				lastDiagnostic: cloneDiagnostic(caveDoorwayBandState.lastDiagnostic),
				diagnostics: caveDoorwayBandState.diagnostics.map(
					(diagnostic) => cloneDiagnostic(diagnostic)!
				),
				invalidDiagnostics: caveDoorwayBandState.invalidDiagnostics.map(
					(diagnostic) => cloneDiagnostic(diagnostic)!
				),
				activeKeys: [...caveDoorwayBandState.activeKeys],
				releasedKeys: [...caveDoorwayBandState.releasedKeys],
				released: caveDoorwayBandState.released,
				startedAt: caveDoorwayBandState.startedAt,
				finishedAt: caveDoorwayBandState.finishedAt,
				error: caveDoorwayBandState.error
			};
		};
		const cancelCaveDoorwayBandKeyLease = () => {
			if (caveDoorwayBandKeyLeaseFrame === null) return;
			cancelAnimationFrame(caveDoorwayBandKeyLeaseFrame);
			caveDoorwayBandKeyLeaseFrame = null;
		};
		const releaseCaveDoorwayBandKey = () => {
			if (!caveDoorwayBandState) return;
			cancelCaveDoorwayBandKeyLease();
			for (const key of [...caveDoorwayBandState.activeKeys].reverse()) {
				dispatchSyntheticKey('keyup', key);
				caveDoorwayBandState.releasedKeys.push(key);
			}
			caveDoorwayBandState.activeKeys = [];
			caveDoorwayBandState.released = true;
		};
		const finishCaveDoorwayBand = (status: 'done' | 'error', error?: string) => {
			if (!caveDoorwayBandState) return;
			releaseCaveDoorwayBandKey();
			caveDoorwayBandState.status = status;
			caveDoorwayBandState.finishedAt = performance.now();
			if (error) caveDoorwayBandState.error = error;
		};
		const runCaveDoorwayBandKeyLeaseFrame = () => {
			caveDoorwayBandKeyLeaseFrame = null;
			if (!caveDoorwayBandState || caveDoorwayBandState.status !== 'running') return;
			for (const key of caveDoorwayBandState.activeKeys) {
				dispatchSyntheticKey('keydown', key);
			}
			caveDoorwayBandKeyLeaseFrame = requestAnimationFrame(runCaveDoorwayBandKeyLeaseFrame);
		};
		const startCaveDoorwayBandKeyLease = () => {
			if (caveDoorwayBandKeyLeaseFrame !== null) return;
			caveDoorwayBandKeyLeaseFrame = requestAnimationFrame(runCaveDoorwayBandKeyLeaseFrame);
		};
		const startCaveDoorwayBand = (plan: CaveDoorwayBandPlan): CaveDoorwayBandResult => {
			if (caveDoorwayBandState?.status === 'running') {
				finishCaveDoorwayBand('error', 'cave doorway band was already active');
			}
			const currentMapId = probeWindow.__glieseLastHudState?.mapId ?? '';
			const position = actualPosition();
			caveDoorwayBandState = {
				token: plan.token,
				mapId: currentMapId,
				status: 'running',
				position: position ? { ...position } : null,
				lastDiagnostic: null,
				diagnostics: [],
				invalidDiagnostics: [],
				activeKeys: [],
				releasedKeys: [],
				released: false,
				startedAt: performance.now(),
				finishedAt: null,
				expectedMapId: plan.expectedMapId,
				minX: plan.minX,
				maxXExclusive: plan.maxXExclusive,
				expectedY: plan.expectedY,
				xDirection: 0
			};
			if (
				![plan.minX, plan.maxXExclusive, plan.expectedY].every(Number.isFinite) ||
				plan.minX >= plan.maxXExclusive
			) {
				finishCaveDoorwayBand('error', `invalid cave doorway band plan ${JSON.stringify(plan)}`);
				return caveDoorwaySnapshot()!;
			}
			if (!position) {
				finishCaveDoorwayBand('error', 'cave doorway band missing current player position');
				return caveDoorwaySnapshot()!;
			}
			if (currentMapId !== plan.expectedMapId) {
				finishCaveDoorwayBand(
					'error',
					`cave doorway band started on ${currentMapId}; expected ${plan.expectedMapId}`
				);
				return caveDoorwaySnapshot()!;
			}
			if (position.y !== plan.expectedY) {
				finishCaveDoorwayBand(
					'error',
					`cave doorway band started off safe row: ${JSON.stringify({ position, expectedY: plan.expectedY })}`
				);
				return caveDoorwaySnapshot()!;
			}
			const xDirection: -1 | 0 | 1 =
				position.x < plan.minX ? 1 : position.x >= plan.maxXExclusive ? -1 : 0;
			caveDoorwayBandState.xDirection = xDirection;
			if (xDirection === 0) {
				finishCaveDoorwayBand('done');
				return caveDoorwaySnapshot()!;
			}
			const key = xDirection > 0 ? 'ArrowRight' : 'ArrowLeft';
			caveDoorwayBandState.activeKeys = [key];
			dispatchSyntheticKey('keydown', key);
			startCaveDoorwayBandKeyLease();
			return caveDoorwaySnapshot()!;
		};
		const onCaveDoorwayBandDiagnostic = (event: Event) => {
			if (!caveDoorwayBandState || caveDoorwayBandState.status !== 'running') return;
			const diagnostic = (event as CustomEvent<PlayerMovementDiagnostic>).detail;
			const clonedDiagnostic = {
				mapId: diagnostic.mapId,
				previousPosition: { ...diagnostic.previousPosition },
				requestedPosition: { ...diagnostic.requestedPosition },
				resolvedPosition: { ...diagnostic.resolvedPosition },
				blocked: diagnostic.blocked
			};
			caveDoorwayBandState.diagnostics.push(clonedDiagnostic);
			caveDoorwayBandState.lastDiagnostic = clonedDiagnostic;
			caveDoorwayBandState.position = { ...diagnostic.resolvedPosition };
			const failCaveDoorwayDiagnostic = (reason: string) => {
				caveDoorwayBandState!.invalidDiagnostics.push(clonedDiagnostic);
				finishCaveDoorwayBand('error', reason);
			};
			if (diagnostic.mapId !== caveDoorwayBandState.expectedMapId) {
				failCaveDoorwayDiagnostic(
					`cave doorway band received wrong-map diagnostic: expected ${caveDoorwayBandState.expectedMapId}, received ${diagnostic.mapId}`
				);
				return;
			}
			if (diagnostic.blocked) {
				failCaveDoorwayDiagnostic('cave doorway band received blocked diagnostic');
				return;
			}
			const { previousPosition, resolvedPosition } = diagnostic;
			if (
				![previousPosition.x, previousPosition.y, resolvedPosition.x, resolvedPosition.y].every(
					Number.isFinite
				)
			) {
				failCaveDoorwayDiagnostic('cave doorway band received non-finite diagnostic');
				return;
			}
			if (
				previousPosition.y !== caveDoorwayBandState.expectedY ||
				resolvedPosition.y !== caveDoorwayBandState.expectedY
			) {
				failCaveDoorwayDiagnostic(
					`cave doorway band left safe row: ${JSON.stringify({ diagnostic, expectedY: caveDoorwayBandState.expectedY })}`
				);
				return;
			}
			const movedTowardBand =
				(resolvedPosition.x - previousPosition.x) * caveDoorwayBandState.xDirection > 0;
			if (!movedTowardBand) {
				failCaveDoorwayDiagnostic(
					`cave doorway band did not make monotonic progress: ${JSON.stringify({ diagnostic, xDirection: caveDoorwayBandState.xDirection })}`
				);
				return;
			}
			const overshotBand =
				caveDoorwayBandState.xDirection === 1
					? resolvedPosition.x >= caveDoorwayBandState.maxXExclusive
					: resolvedPosition.x < caveDoorwayBandState.minX;
			if (overshotBand) {
				failCaveDoorwayDiagnostic(
					`cave doorway band overshot its band: ${JSON.stringify({ diagnostic, minX: caveDoorwayBandState.minX, maxXExclusive: caveDoorwayBandState.maxXExclusive })}`
				);
				return;
			}
			if (
				resolvedPosition.x >= caveDoorwayBandState.minX &&
				resolvedPosition.x < caveDoorwayBandState.maxXExclusive
			) {
				finishCaveDoorwayBand('done');
			}
		};
		const beginNextAxis = () => {
			let contractAdvanced = false;
			if (!routeState || routeState.status !== 'running' || !routeState.position) {
				return contractAdvanced;
			}
			while (routeState.pointIndex < routeState.points.length) {
				const target = routeState.points[routeState.pointIndex]!;
				const deltaX = target.x - routeState.position.x;
				if (!routeState.settledAxes.x && Math.abs(deltaX) > routeState.settleTolerance) {
					routeState.axis = 'x';
					routeState.axisHistory.push('x');
					routeState.target = { ...target };
					routeState.correctionTaps = 0;
					routeState.noProgressDiagnostics = 0;
					pressKey(axisKey('x', deltaX));
					return contractAdvanced;
				}
				if (!routeState.settledAxes.x) {
					routeState.settledAxes.x = true;
					contractAdvanced = true;
				}
				const deltaY = target.y - routeState.position.y;
				if (!routeState.settledAxes.y && Math.abs(deltaY) > routeState.settleTolerance) {
					routeState.axis = 'y';
					routeState.axisHistory.push('y');
					routeState.target = { ...target };
					routeState.correctionTaps = 0;
					routeState.noProgressDiagnostics = 0;
					pressKey(axisKey('y', deltaY));
					return contractAdvanced;
				}
				if (!routeState.settledAxes.y) {
					routeState.settledAxes.y = true;
				}
				routeState.pointIndex += 1;
				routeState.settledAxes = { x: false, y: false };
				contractAdvanced = true;
			}
			routeState.axis = null;
			routeState.target = null;
			releaseKey();
			cancelKeyLease();
			if (routeState.invalidDiagnostics.length > 0) {
				const firstInvalidDiagnostic = routeState.invalidDiagnostics[0]!;
				routeState.status = 'error';
				routeState.error = `invalid movement diagnostic for map ${routeState.mapId}: expected blocked=false and mapId=${routeState.mapId}; received ${JSON.stringify(firstInvalidDiagnostic)}`;
				return contractAdvanced;
			}
			routeState.status = 'done';
			return contractAdvanced;
		};
		const onMovementDiagnostic = (event: Event) => {
			if (!routeState || routeState.status !== 'running') return;
			const diagnostic = (event as CustomEvent<PlayerMovementDiagnostic>).detail;
			const movementAt = performance.now();
			routeState.movementCount += 1;
			routeState.lastMovementAt = movementAt;
			const axis = routeState.axis;
			const target = routeState.target;
			const clonedDiagnostic = {
				mapId: diagnostic.mapId,
				previousPosition: { ...diagnostic.previousPosition },
				requestedPosition: { ...diagnostic.requestedPosition },
				resolvedPosition: { ...diagnostic.resolvedPosition },
				blocked: diagnostic.blocked
			};
			if (
				diagnostic.mapId !== routeState.mapId ||
				diagnostic.blocked ||
				!axis ||
				!target ||
				!routeState.position
			) {
				routeState.invalidDiagnostics.push(clonedDiagnostic);
				return;
			}
			routeState.lastDiagnostic = clonedDiagnostic;
			routeState.diagnostics.push(clonedDiagnostic);
			routeState.diagnosticAxes.push(axis);
			routeState.position = { ...diagnostic.resolvedPosition };
			const value = diagnostic.resolvedPosition[axis];
			const previous = diagnostic.previousPosition[axis];
			const targetValue = target[axis];
			const direction = targetValue > previous ? 1 : -1;
			const previousDistance = Math.abs(targetValue - previous);
			const distance = Math.abs(targetValue - value);
			const distanceDecreased = distance < previousDistance;
			const reached =
				direction > 0
					? value >= targetValue - routeState.reachTolerance
					: value <= targetValue + routeState.reachTolerance;
			if (diagnostic.blocked && previous === value) {
				if (distance <= routeState.blockedTolerance) {
					routeState.noProgressDiagnostics = 0;
					let contractAdvanced = false;
					if (!routeState.settledAxes[axis]) {
						routeState.settledAxes[axis] = true;
						contractAdvanced = true;
					}
					contractAdvanced = beginNextAxis() || contractAdvanced;
					if (distanceDecreased || contractAdvanced) {
						routeState.lastProgressAt = movementAt;
					}
				} else {
					failRoute(
						`blocked at point ${routeState.pointIndex} axis ${axis} target ${JSON.stringify(target)}`
					);
				}
				return;
			}
			if (!reached) {
				if (distanceDecreased) routeState.lastProgressAt = movementAt;
				if (previous === value) routeState.noProgressDiagnostics += 1;
				else routeState.noProgressDiagnostics = 0;
				if (routeState.noProgressDiagnostics >= 32) {
					failRoute(
						`stalled at point ${routeState.pointIndex} axis ${axis} target ${JSON.stringify(target)}`
					);
				}
				return;
			}
			routeState.noProgressDiagnostics = 0;
			if (
				distance <= routeState.settleTolerance ||
				(routeState.correctionTaps > 0 &&
					!diagnostic.blocked &&
					reached &&
					distance <= routeState.reachTolerance)
			) {
				releaseKey();
				let contractAdvanced = false;
				if (!routeState.settledAxes[axis]) {
					routeState.settledAxes[axis] = true;
					contractAdvanced = true;
				}
				contractAdvanced = beginNextAxis() || contractAdvanced;
				if (distanceDecreased || contractAdvanced) {
					routeState.lastProgressAt = movementAt;
				}
				return;
			}
			if (distanceDecreased) routeState.lastProgressAt = movementAt;
			if (routeState.correctionTaps >= routeState.maxCorrectionTaps) {
				failRoute(
					`correction limit at point ${routeState.pointIndex} axis ${axis} target ${JSON.stringify(target)}`
				);
				return;
			}
			routeState.correctionTaps += 1;
			pressKey(axisKey(axis, targetValue - value));
		};
		window.addEventListener('gliese:player-movement-diagnostic', onMovementDiagnostic);
		window.addEventListener(
			'gliese:player-movement-diagnostic',
			onGuildMasterSemanticDiagonalDiagnostic
		);
		window.addEventListener('gliese:player-movement-diagnostic', onCaveDoorwayBandDiagnostic);
		const sampleCamera = () => {
			const activeRoute = probeWindow.__glieseRouteRunner?.active();
			const view = probeWindow.__glieseActiveSceneCamera?.worldView;
			const mapId = activeRoute?.mapId;
			const left = typeof view?.left === 'number' ? view.left : view?.x;
			const top = typeof view?.top === 'number' ? view.top : view?.y;
			const width = view?.width;
			const height = view?.height;
			const right = typeof view?.right === 'number' ? view.right : undefined;
			const bottom = typeof view?.bottom === 'number' ? view.bottom : undefined;
			if (
				activeRoute?.status === 'running' &&
				typeof mapId === 'string' &&
				typeof left === 'number' &&
				typeof top === 'number' &&
				typeof width === 'number' &&
				typeof height === 'number' &&
				typeof right === 'number' &&
				typeof bottom === 'number'
			) {
				probeWindow.__glieseCameraSamples?.push({
					mapId,
					routeToken: activeRoute.token,
					pointIndex: activeRoute.pointIndex,
					left,
					top,
					right,
					bottom,
					width,
					height
				});
			}
			requestAnimationFrame(sampleCamera);
		};
		requestAnimationFrame(sampleCamera);
		const routeRunner: NonNullable<GlieseProbeWindow['__glieseRouteRunner']> = {
			start: (plan) => {
				if (routeState?.status === 'running') {
					failRoute(`route ${routeState.token} was still active`);
				}
				const points = plan.points.map((point) => ({ x: point.x, y: point.y }));
				const startedAt = performance.now();
				routeState = {
					token: plan.token,
					mapId: probeWindow.__glieseLastHudState?.mapId ?? '',
					status: 'running',
					pointIndex: 1,
					axis: null,
					position: actualPosition(),
					target: null,
					lastDiagnostic: null,
					points,
					settleTolerance: plan.settleTolerance,
					reachTolerance: plan.reachTolerance,
					maxCorrectionTaps: plan.maxCorrectionTaps,
					blockedTolerance: plan.blockedTolerance ?? plan.settleTolerance,
					activeKey: null,
					startedAt,
					lastProgressAt: startedAt,
					leaseFrameCount: 0,
					lastLeaseAt: null,
					movementCount: 0,
					lastMovementAt: null,
					correctionTaps: 0,
					noProgressDiagnostics: 0,
					settledAxes: { x: false, y: false },
					axisHistory: [],
					diagnostics: [],
					invalidDiagnostics: [],
					diagnosticAxes: []
				};
				if (routeState.mapId === 'meadow-entry') {
					probeWindow.__glieseExteriorRouteTokens?.push(plan.token);
				}
				if (points.length < 1) {
					failRoute('route requires at least one point');
					return snapshot()!;
				}
				if (!routeState.position) {
					failRoute('missing HUD/diagnostic player position at route start');
					return snapshot()!;
				}
				const first = points[0]!;
				const startTolerance = plan.startTolerance ?? plan.settleTolerance;
				if (
					Math.abs(routeState.position.x - first.x) > startTolerance ||
					Math.abs(routeState.position.y - first.y) > startTolerance
				) {
					failRoute(
						`route start position ${JSON.stringify(routeState.position)} did not match point 0 ${JSON.stringify(first)}`
					);
					return snapshot()!;
				}
				beginNextAxis();
				startKeyLease();
				return snapshot()!;
			},
			get: (token) => (routeState?.token === token ? snapshot() : null),
			active: () => (routeState?.status === 'running' ? snapshot() : null),
			cancel: (token, reason) => {
				if (routeState?.token !== token) return null;
				if (routeState.status === 'running') failRoute(reason);
				return snapshot();
			},
			startGuildMasterSemanticDiagonal,
			getGuildMasterSemanticDiagonal: (token) =>
				semanticDiagonalState?.token === token ? semanticSnapshot() : null,
			cancelGuildMasterSemanticDiagonal: (token, reason) => {
				if (semanticDiagonalState?.token !== token) return null;
				if (semanticDiagonalState.status === 'running') {
					finishSemanticDiagonal('error', reason);
				}
				return semanticSnapshot();
			},
			startCaveDoorwayBand,
			getCaveDoorwayBand: (token) =>
				caveDoorwayBandState?.token === token ? caveDoorwaySnapshot() : null,
			cancelCaveDoorwayBand: (token, reason) => {
				if (caveDoorwayBandState?.token !== token) return null;
				if (caveDoorwayBandState.status === 'running') {
					finishCaveDoorwayBand('error', reason);
				}
				return caveDoorwaySnapshot();
			}
		};
		probeWindow.__glieseRouteRunner = routeRunner;
		window.addEventListener('pagehide', () => {
			cancelKeyLease();
			if (semanticDiagonalState?.status === 'running') {
				finishSemanticDiagonal('error', 'page unloaded while semantic diagonal was active');
			}
			if (caveDoorwayBandState?.status === 'running') {
				finishCaveDoorwayBand('error', 'page unloaded while cave doorway band was active');
			}
			if (routeState?.status === 'running') {
				failRoute('page unloaded while route was active');
			}
		});
	});
}

type Point = { x: number; y: number };
type Axis = 'x' | 'y';

type BrowserRoutePlan = {
	token: string;
	points: readonly Point[];
	settleTolerance: number;
	startTolerance?: number;
	reachTolerance: number;
	maxCorrectionTaps: number;
	blockedTolerance?: number;
};

type GuildMasterSemanticDiagonalPlan = {
	token: string;
	expectedMapId: string;
	minY: number;
	maxYExclusive: number;
	xDirection: -1 | 1;
};

type GuildMasterSemanticDiagonalResult = {
	token: string;
	mapId: string;
	status: 'running' | 'done' | 'error';
	position: Point | null;
	lastDiagnostic: PlayerMovementDiagnostic | null;
	diagnostics: PlayerMovementDiagnostic[];
	invalidDiagnostics: PlayerMovementDiagnostic[];
	activeKeys: Array<'ArrowDown' | 'ArrowLeft' | 'ArrowUp'>;
	releasedKeys: Array<'ArrowDown' | 'ArrowLeft' | 'ArrowUp'>;
	released: boolean;
	startedAt: number;
	finishedAt: number | null;
	error?: string;
};

type CaveDoorwayBandPlan = {
	token: string;
	expectedMapId: string;
	minX: number;
	maxXExclusive: number;
	expectedY: number;
};

type CaveDoorwayBandResult = {
	token: string;
	mapId: string;
	status: 'running' | 'done' | 'error';
	position: Point | null;
	lastDiagnostic: PlayerMovementDiagnostic | null;
	diagnostics: PlayerMovementDiagnostic[];
	invalidDiagnostics: PlayerMovementDiagnostic[];
	activeKeys: Array<'ArrowLeft' | 'ArrowRight'>;
	releasedKeys: Array<'ArrowLeft' | 'ArrowRight'>;
	released: boolean;
	startedAt: number;
	finishedAt: number | null;
	error?: string;
};

type FixedXAxisBandSteeringRequest = {
	expectedMapId: string;
	minX: number;
	maxXExclusive: number;
	expectedY: number;
	initialPoint: Point;
	tokenPrefix: string;
};

type BrowserRouteResult = {
	token: string;
	mapId: string;
	status: 'running' | 'done' | 'error';
	pointIndex: number;
	axis: Axis | null;
	position: Point | null;
	target: Point | null;
	lastDiagnostic: PlayerMovementDiagnostic | null;
	axisHistory?: Axis[];
	diagnostics?: PlayerMovementDiagnostic[];
	invalidDiagnostics?: PlayerMovementDiagnostic[];
	diagnosticAxes?: Axis[];
	activeKey?: 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | null;
	startedAt?: number;
	lastProgressAt?: number;
	leaseFrameCount?: number;
	lastLeaseAt?: number | null;
	movementCount?: number;
	lastMovementAt?: number | null;
	visibilityState?: string;
	hasFocus?: boolean;
	blurAt?: number;
	focusAt?: number;
	error?: string;
};

type JourneyRouteEvidence = {
	label: string;
	token: string;
	status: BrowserRouteResult['status'];
	mapId: string;
	position: Point | null;
	lastDiagnostic: PlayerMovementDiagnostic | null;
	diagnosticCount: number;
	diagnosticMapIds: string[];
	invalidDiagnostics: PlayerMovementDiagnostic[];
};

function collectJourneyRouteEvidence(
	label: string,
	result: BrowserRouteResult
): JourneyRouteEvidence {
	return {
		label,
		token: result.token,
		status: result.status,
		mapId: result.mapId,
		position: result.position,
		lastDiagnostic: result.lastDiagnostic,
		diagnosticCount: result.diagnostics?.length ?? 0,
		diagnosticMapIds: [...new Set((result.diagnostics ?? []).map(({ mapId }) => mapId))],
		invalidDiagnostics: result.invalidDiagnostics ?? []
	};
}

const AXIS_SETTLE_TOLERANCE = 12;
const COAST_SAFE_X_MIN = 4_160;
const COAST_SAFE_X_MAX = 4_186;
const COAST_SAFE_X_CENTER = (COAST_SAFE_X_MIN + COAST_SAFE_X_MAX) / 2;
const COAST_SAFE_X_TOLERANCE = (COAST_SAFE_X_MAX - COAST_SAFE_X_MIN) / 2;
const COAST_CONTINUATION_SETTLE_TOLERANCE = 24;
const AXIS_REACH_TOLERANCE = 18;
const MAX_AXIS_CORRECTION_TAPS = 8;
const ROUTE_NO_PROGRESS_WATCHDOG_MS = 15_000;
// Mirrors WorldScene playerRadius (12) + transitionRadius (18).
const PLAYER_TRANSITION_REACH = 30;

async function latestMovement(page: Page): Promise<PlayerMovementDiagnostic | null> {
	return page.evaluate(() => (window as GlieseProbeWindow).__glieseLastMovementDiagnostic ?? null);
}

let routeTokenSequence = 0;
let previousRouteSettleTolerance = AXIS_SETTLE_TOLERANCE;

function describeBrowserRouteResult(result: BrowserRouteResult | null, token: string): string {
	if (!result) return `route ${token} returned no browser state`;
	return [
		`route ${token} ${result.status}`,
		`point=${result.pointIndex}`,
		`axis=${result.axis ?? 'none'}`,
		`target=${JSON.stringify(result.target)}`,
		`position=${JSON.stringify(result.position)}`,
		`diagnostic=${JSON.stringify(result.lastDiagnostic)}`,
		`axisHistory=${JSON.stringify(result.axisHistory ?? [])}`,
		`diagnosticAxes=${JSON.stringify(result.diagnosticAxes ?? [])}`,
		`diagnostics=${JSON.stringify(result.diagnostics ?? [])}`,
		`invalidDiagnostics=${JSON.stringify(result.invalidDiagnostics ?? [])}`,
		`telemetry=${JSON.stringify({
			startedAt: result.startedAt,
			lastProgressAt: result.lastProgressAt,
			activeKey: result.activeKey,
			leaseFrameCount: result.leaseFrameCount,
			lastLeaseAt: result.lastLeaseAt,
			movementCount: result.movementCount,
			lastMovementAt: result.lastMovementAt,
			visibilityState: result.visibilityState,
			hasFocus: result.hasFocus,
			blurAt: result.blurAt,
			focusAt: result.focusAt
		})}`,
		result.error ? `error=${result.error}` : null
	]
		.filter((part): part is string => part !== null)
		.join('; ');
}

function assertRouteDiagnosticsAreFaithful(result: BrowserRouteResult, label: string): void {
	const invalidDiagnostics = result.invalidDiagnostics ?? [];
	expect(invalidDiagnostics, `${label} invalid movement diagnostics`).toEqual([]);
	for (const [index, diagnostic] of (result.diagnostics ?? []).entries()) {
		expect(diagnostic.mapId, `${label} diagnostic ${index} map`).toBe(result.mapId);
		expect(diagnostic.blocked, `${label} diagnostic ${index} blocked`).toBe(false);
	}
}

async function runBrowserRoute(
	page: Page,
	points: readonly Point[],
	settleTolerance: number,
	blockedTolerance = settleTolerance
): Promise<BrowserRouteResult> {
	const token = `route-${Date.now()}-${routeTokenSequence++}`;
	const started = await page.evaluate(
		(plan) => (window as GlieseProbeWindow).__glieseRouteRunner?.start(plan) ?? null,
		{
			token,
			points,
			settleTolerance,
			startTolerance: Math.max(settleTolerance, previousRouteSettleTolerance),
			reachTolerance: AXIS_REACH_TOLERANCE,
			maxCorrectionTaps: MAX_AXIS_CORRECTION_TAPS,
			blockedTolerance
		}
	);
	if (!started) {
		throw new Error(`Browser route runner unavailable for ${token}`);
	}
	if (started.status === 'error') {
		throw new Error(describeBrowserRouteResult(started, token));
	}
	try {
		await page.waitForFunction(
			({ requestedToken, noProgressWatchdogMs }) => {
				const state = (window as GlieseProbeWindow).__glieseRouteRunner?.get(requestedToken);
				if (!state) return false;
				if (state.status === 'done' || state.status === 'error') return true;
				const lastProgressAt = state.lastProgressAt ?? state.startedAt ?? performance.now();
				return performance.now() - lastProgressAt >= noProgressWatchdogMs;
			},
			{ requestedToken: token, noProgressWatchdogMs: ROUTE_NO_PROGRESS_WATCHDOG_MS },
			{ timeout: 0 }
		);
	} catch (error) {
		const timedOutState = await page.evaluate(
			(requestedToken) =>
				(window as GlieseProbeWindow).__glieseRouteRunner?.get(requestedToken) ?? null,
			token
		);
		const canceledState = await page.evaluate(
			(requestedToken) =>
				(window as GlieseProbeWindow).__glieseRouteRunner?.cancel(
					requestedToken,
					'route wait interrupted'
				) ?? null,
			token
		);
		throw new Error(
			`${describeBrowserRouteResult(timedOutState, token)}; wait interrupted; cleanup=${describeBrowserRouteResult(canceledState, token)}`,
			{ cause: error }
		);
	}
	const result = await page.evaluate(
		(requestedToken) =>
			(window as GlieseProbeWindow).__glieseRouteRunner?.get(requestedToken) ?? null,
		token
	);
	if (result?.status === 'running') {
		const canceledState = await page.evaluate(
			(requestedToken) =>
				(window as GlieseProbeWindow).__glieseRouteRunner?.cancel(
					requestedToken,
					'route no-progress watchdog'
				) ?? null,
			token
		);
		throw new Error(
			`${describeBrowserRouteResult(result, token)}; no-progress watchdog=${ROUTE_NO_PROGRESS_WATCHDOG_MS}ms; cleanup=${describeBrowserRouteResult(canceledState, token)}`
		);
	}
	if (!result || result.status !== 'done') {
		throw new Error(describeBrowserRouteResult(result, token));
	}
	assertRouteDiagnosticsAreFaithful(result, token);
	const finalPoint = points.at(-1);
	if (result.position && finalPoint) {
		previousRouteSettleTolerance = Math.max(
			settleTolerance,
			Math.abs(result.position.x - finalPoint.x),
			Math.abs(result.position.y - finalPoint.y)
		);
	} else {
		previousRouteSettleTolerance = settleTolerance;
	}
	return result;
}

async function moveRoute(
	page: Page,
	points: readonly Point[],
	settleTolerance = AXIS_SETTLE_TOLERANCE,
	blockedTolerance = settleTolerance,
	onResult?: (result: BrowserRouteResult) => void
): Promise<Point> {
	const result = await runBrowserRoute(page, points, settleTolerance, blockedTolerance);
	onResult?.(result);
	if (!result.position) {
		throw new Error(
			`Browser route returned no final position: ${describeBrowserRouteResult(result, result.token)}`
		);
	}
	return result.position;
}

type InteriorGrayboxInteraction = {
	speaker: string;
	shopName?: string;
};

type InteriorGrayboxStep = {
	label: string;
	point: Point;
	interaction?: InteriorGrayboxInteraction;
};

type InteriorGrayboxCase = {
	mapId: string;
	returnArrival: Point;
	exteriorDoor: Point;
	spawn: Point;
	exit: Point;
	steps: readonly InteriorGrayboxStep[];
	persistAfterStep?: string;
};

const INTERIOR_GRAYBOX_CASES: readonly InteriorGrayboxCase[] = [
	{
		mapId: 'guild-hall',
		returnArrival: { x: 2_272, y: 4_480 },
		exteriorDoor: { x: 2_272, y: 4_416 },
		spawn: { x: 512, y: 736 },
		exit: { x: 512, y: 816 },
		persistAfterStep: 'quartermaster-approach',
		steps: [
			{ label: 'entrance-lobby-spine', point: { x: 512, y: 656 } },
			{ label: 'common-hall-spine', point: { x: 512, y: 512 } },
			{ label: 'common-hall-west', point: { x: 400, y: 512 } },
			{ label: 'common-hall-room', point: { x: 192, y: 512 } },
			{ label: 'records-hall-spine', point: { x: 512, y: 512 } },
			{ label: 'records-hall-north', point: { x: 512, y: 208 } },
			{ label: 'records-hall-west', point: { x: 400, y: 208 } },
			{ label: 'records-hall-room', point: { x: 192, y: 208 } },
			{ label: 'guild-master-spine', point: { x: 400, y: 208 } },
			{ label: 'guild-master-north', point: { x: 512, y: 208 } },
			{ label: 'guild-master-approach-spine', point: { x: 512, y: 184 } },
			{
				label: 'guild-master-approach',
				point: { x: 800, y: 184 },
				interaction: { speaker: 'Guild Master Arlen' }
			},
			{ label: 'training-hall-spine', point: { x: 512, y: 184 } },
			{ label: 'training-hall-south', point: { x: 512, y: 368 } },
			{ label: 'training-hall-room', point: { x: 800, y: 368 } },
			{ label: 'quartermaster-spine', point: { x: 512, y: 368 } },
			{ label: 'quartermaster-south', point: { x: 512, y: 568 } },
			{
				label: 'quartermaster-approach',
				point: { x: 816, y: 568 },
				interaction: { speaker: 'Quartermaster Vale', shopName: 'Guild Quartermaster' }
			},
			{ label: 'lobby-return-spine', point: { x: 512, y: 568 } },
			{ label: 'lobby-return', point: { x: 512, y: 736 } }
		]
	},
	{
		mapId: 'hero-house',
		returnArrival: { x: 704, y: 5_920 },
		exteriorDoor: { x: 704, y: 5_856 },
		spawn: { x: 352, y: 480 },
		exit: { x: 352, y: 560 },
		steps: [
			{ label: 'living-kitchen', point: { x: 544, y: 480 } },
			{ label: 'hall-south', point: { x: 352, y: 320 } },
			{ label: 'hall-north', point: { x: 352, y: 160 } },
			{ label: 'bedroom', point: { x: 160, y: 160 } },
			{ label: 'study-door', point: { x: 352, y: 160 } },
			{ label: 'study', point: { x: 544, y: 160 } },
			{ label: 'study-hall-door', point: { x: 352, y: 160 } },
			{ label: 'spawn-return', point: { x: 352, y: 480 } }
		]
	},
	{
		mapId: 'item-shop',
		returnArrival: { x: 704, y: 5_248 },
		exteriorDoor: { x: 704, y: 5_184 },
		spawn: { x: 416, y: 544 },
		exit: { x: 416, y: 624 },
		steps: [
			{ label: 'sales-west-aisle', point: { x: 192, y: 544 } },
			{ label: 'sales-west-shelf', point: { x: 192, y: 448 } },
			{ label: 'mira-cross-aisle', point: { x: 416, y: 448 } },
			{
				label: 'mira-approach',
				point: { x: 416, y: 360 },
				interaction: { speaker: 'Mira', shopName: "Mira's Item Shop" }
			},
			{ label: 'east-aisle-crossing', point: { x: 416, y: 448 } },
			{ label: 'east-aisle', point: { x: 640, y: 448 } },
			{ label: 'service-corridor-south', point: { x: 640, y: 544 } },
			{ label: 'service-corridor-north', point: { x: 640, y: 300 } },
			{ label: 'service-corridor-west', point: { x: 448, y: 300 } },
			{ label: 'stockroom-entry', point: { x: 448, y: 160 } },
			{ label: 'stockroom', point: { x: 192, y: 160 } },
			{ label: 'office-door', point: { x: 448, y: 160 } },
			{ label: 'office', point: { x: 608, y: 160 } },
			{ label: 'service-return-east', point: { x: 448, y: 160 } },
			{ label: 'service-return-west', point: { x: 448, y: 300 } },
			{ label: 'service-return-south', point: { x: 640, y: 300 } },
			{ label: 'spawn-return-corridor', point: { x: 640, y: 544 } },
			{ label: 'spawn-return', point: { x: 416, y: 544 } }
		]
	},
	{
		mapId: 'shrine-of-aurora-interior',
		returnArrival: { x: 2_272, y: 5_920 },
		exteriorDoor: { x: 2_272, y: 5_856 },
		spawn: { x: 384, y: 608 },
		exit: { x: 384, y: 688 },
		steps: [
			{ label: 'nave', point: { x: 384, y: 400 } },
			{ label: 'west-preparation', point: { x: 160, y: 400 } },
			{ label: 'nave-return', point: { x: 384, y: 400 } },
			{ label: 'east-archive', point: { x: 640, y: 400 } },
			{ label: 'nave-east-return', point: { x: 384, y: 400 } },
			{ label: 'inner-sanctum', point: { x: 384, y: 200 } },
			{ label: 'spawn-return', point: { x: 384, y: 608 } }
		]
	},
	{
		mapId: 'villager-house-1',
		returnArrival: { x: 672, y: 4_448 },
		exteriorDoor: { x: 672, y: 4_384 },
		spawn: { x: 320, y: 480 },
		exit: { x: 320, y: 560 },
		steps: [
			{ label: 'hall-living', point: { x: 320, y: 320 } },
			{ label: 'living-west', point: { x: 200, y: 320 } },
			{ label: 'lynn-approach', point: { x: 200, y: 416 }, interaction: { speaker: 'Lynn' } },
			{ label: 'bedroom-door', point: { x: 200, y: 320 } },
			{ label: 'hall-return', point: { x: 320, y: 320 } },
			{ label: 'bedroom-hall', point: { x: 320, y: 160 } },
			{ label: 'bedroom', point: { x: 200, y: 160 } },
			{ label: 'storage-door', point: { x: 320, y: 160 } },
			{ label: 'storage', point: { x: 520, y: 160 } },
			{ label: 'storage-south', point: { x: 520, y: 208 } },
			{ label: 'living-kitchen-door', point: { x: 320, y: 160 } },
			{ label: 'living-kitchen', point: { x: 320, y: 320 } },
			{ label: 'living-kitchen-room', point: { x: 520, y: 480 } },
			{ label: 'spawn-return', point: { x: 320, y: 480 } }
		]
	},
	{
		mapId: 'villager-house-2',
		returnArrival: { x: 1_376, y: 4_448 },
		exteriorDoor: { x: 1_376, y: 4_384 },
		spawn: { x: 352, y: 480 },
		exit: { x: 352, y: 560 },
		steps: [
			{ label: 'living-area', point: { x: 560, y: 480 } },
			{ label: 'hall-workshop', point: { x: 400, y: 480 } },
			{ label: 'workshop-south', point: { x: 400, y: 304 } },
			{ label: 'workshop-north', point: { x: 400, y: 192 } },
			{ label: 'toma-approach', point: { x: 232, y: 192 }, interaction: { speaker: 'Toma' } },
			{ label: 'bedroom-door', point: { x: 400, y: 192 } },
			{ label: 'bedroom', point: { x: 512, y: 192 } },
			{ label: 'hall-return', point: { x: 400, y: 192 } },
			{ label: 'living-return', point: { x: 400, y: 480 } },
			{ label: 'spawn-return', point: { x: 352, y: 480 } }
		]
	},
	{
		mapId: 'villager-house-3',
		returnArrival: { x: 1_472, y: 5_920 },
		exteriorDoor: { x: 1_472, y: 5_856 },
		spawn: { x: 320, y: 544 },
		exit: { x: 320, y: 624 },
		steps: [
			{ label: 'sitting-room', point: { x: 512, y: 544 } },
			{ label: 'hall-archive', point: { x: 320, y: 544 } },
			{ label: 'archive-study', point: { x: 320, y: 192 } },
			{ label: 'io-approach', point: { x: 200, y: 192 }, interaction: { speaker: 'Io' } },
			{ label: 'bedroom-door', point: { x: 320, y: 192 } },
			{ label: 'bedroom-storage', point: { x: 512, y: 192 } },
			{ label: 'hall-return', point: { x: 320, y: 192 } },
			{ label: 'spawn-return-hall', point: { x: 320, y: 544 } },
			{ label: 'spawn-return', point: { x: 320, y: 544 } }
		]
	}
];

type InteriorNpcApproachBinding = {
	readonly approachKey: string;
	readonly propCollisionKey?: string;
};

const INTERIOR_NPC_APPROACH_BINDINGS = {
	'guild-hall': {
		'Guild Master Arlen': { approachKey: 'guildMaster', propCollisionKey: 'guildMasterDesk' },
		'Quartermaster Vale': {
			approachKey: 'quartermaster',
			propCollisionKey: 'quartermasterCounter'
		}
	},
	'item-shop': {
		Mira: { approachKey: 'mira', propCollisionKey: 'miraCounter' }
	},
	'villager-house-1': {
		Lynn: { approachKey: 'lynn' }
	},
	'villager-house-2': {
		Toma: { approachKey: 'toma', propCollisionKey: 'tomaWorkbench' }
	},
	'villager-house-3': {
		Io: { approachKey: 'io', propCollisionKey: 'ioWestArchiveShelves' }
	}
} as const satisfies Readonly<Record<string, Readonly<Record<string, InteriorNpcApproachBinding>>>>;

const NPC_APPROACH_SETTLE_TOLERANCE = 4;
const INTERIOR_ROUTE_SETTLE_TOLERANCE = 4;

function interiorRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	return currentPoint.y !== targetPoint.y
		? [currentPoint, { x: currentPoint.x, y: targetPoint.y }, targetPoint]
		: [currentPoint, targetPoint];
}

function isVillagerHouse1LynnStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'villager-house-1' && step.label === 'lynn-approach';
}

function villagerHouse1LynnRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	const approach = VILLAGE_INTERIOR_LAYOUTS['villager-house-1'].npcApproaches.lynn.approach;
	expect(targetPoint).toEqual(approach);
	return [currentPoint, { x: approach.x, y: currentPoint.y }, { ...approach }];
}

function isVillagerHouse2TomaStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'villager-house-2' && step.label === 'toma-approach';
}

function villagerHouse2TomaRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	const approach = VILLAGE_INTERIOR_LAYOUTS['villager-house-2'].npcApproaches.toma.approach;
	const stagingOffset = AXIS_SETTLE_TOLERANCE;
	expect(stagingOffset).toBe(12);
	expect(targetPoint).toEqual(approach);
	return [currentPoint, { x: approach.x + stagingOffset, y: currentPoint.y }, { ...approach }];
}

function assertVillagerHouse1LynnRouteGeometry(points: readonly Point[], targetPoint: Point): void {
	const layout = VILLAGE_INTERIOR_LAYOUTS['villager-house-1'];
	const approach = layout.npcApproaches.lynn.approach;
	const npc = layout.npcApproaches.lynn.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const interactionRadius = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;

	expect(targetPoint).toEqual({ x: 200, y: 416 });
	expect(targetPoint).toEqual(approach);
	expect(points).toHaveLength(3);
	expect(points[1]?.x).toBe(approach.x);
	expect(points[1]?.y).toBe(points[0]?.y);
	expect(points.at(-1)).toEqual(approach);

	for (let index = 1; index < points.length; index += 1) {
		expect(
			routeSegmentIntersectsCircle(points[index - 1]!, points[index]!, npc, npcCollisionRadius)
		).toBe(false);
	}

	const authoredDistance = Math.hypot(approach.x - npc.x, approach.y - npc.y);
	expect(authoredDistance).toBe(40);
	expect(authoredDistance).toBeGreaterThan(npcCollisionRadius);
	expect(authoredDistance).toBeLessThanOrEqual(interactionRadius);
}

function assertVillagerHouse1LynnRouteResult(
	points: readonly Point[],
	result: BrowserRouteResult
): Point {
	const layout = VILLAGE_INTERIOR_LAYOUTS['villager-house-1'];
	const approach = layout.npcApproaches.lynn.approach;
	const npc = layout.npcApproaches.lynn.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const interactionRadius = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;

	assertVillagerHouse1LynnRouteGeometry(points, approach);
	expect(result.status).toBe('done');
	expect(result.mapId).toBe('villager-house-1');
	expect(result.activeKey).toBeNull();
	expect(result.invalidDiagnostics ?? []).toEqual([]);
	expect(result.position).not.toBeNull();
	if (!result.position) {
		throw new Error(
			`VH1 Lynn route returned no live endpoint: ${describeBrowserRouteResult(result, result.token)}`
		);
	}
	for (const diagnostic of result.diagnostics ?? []) {
		expect(diagnostic.mapId).toBe('villager-house-1');
		expect(diagnostic.blocked).toBe(false);
		expect(
			routeSegmentIntersectsCircle(
				diagnostic.previousPosition,
				diagnostic.requestedPosition,
				npc,
				npcCollisionRadius
			)
		).toBe(false);
	}
	const liveDistance = Math.hypot(result.position.x - npc.x, result.position.y - npc.y);
	expect(liveDistance).toBeGreaterThan(npcCollisionRadius);
	expect(liveDistance).toBeLessThanOrEqual(interactionRadius);
	expect(Math.abs(result.position.x - approach.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(result.position.y - approach.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	return result.position;
}

function assertVillagerHouse2TomaRouteGeometry(points: readonly Point[], targetPoint: Point): void {
	const layout = VILLAGE_INTERIOR_LAYOUTS['villager-house-2'];
	const approach = layout.npcApproaches.toma.approach;
	const npc = layout.npcApproaches.toma.npc;
	const workbench = layout.propCollisions.tomaWorkbench;
	const workshopSouthDivider = layout.walls.find(
		({ id }) => id === 'villager-house-2-workshop-divider-south'
	);
	if (!workshopSouthDivider) {
		throw new Error('Villager House 2 workshop south divider source is missing');
	}
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const interactionRadius = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;
	const expandedWorkbenchBottom = workbench.y + workbench.height + PLAYER_COLLISION_RADIUS;
	const expandedDividerTop = workshopSouthDivider.y - PLAYER_COLLISION_RADIUS;
	const stagingOffset = AXIS_SETTLE_TOLERANCE;

	expect(targetPoint).toEqual({ x: 232, y: 192 });
	expect(targetPoint).toEqual(approach);
	expect(points).toHaveLength(3);
	expect(points[1]?.x).toBe(approach.x + stagingOffset);
	expect(points[1]?.y).toBe(points[0]?.y);
	expect(points.at(-1)).toEqual(approach);
	for (const point of points) {
		expect(point.y).toBeGreaterThan(expandedWorkbenchBottom);
		expect(point.y).toBeLessThan(expandedDividerTop);
	}

	for (let index = 1; index < points.length; index += 1) {
		const from = points[index - 1]!;
		const to = points[index]!;
		expect(routeSegmentIntersectsExpandedRect(from, to, workbench, PLAYER_COLLISION_RADIUS)).toBe(
			false
		);
		expect(
			routeSegmentIntersectsExpandedRect(from, to, workshopSouthDivider, PLAYER_COLLISION_RADIUS)
		).toBe(false);
		expect(routeSegmentIntersectsCircle(from, to, npc, npcCollisionRadius)).toBe(false);
	}

	const authoredDistance = Math.hypot(approach.x - npc.x, approach.y - npc.y);
	expect(authoredDistance).toBe(40);
	expect(authoredDistance).toBeGreaterThan(npcCollisionRadius);
	expect(authoredDistance).toBeLessThanOrEqual(interactionRadius);
}

function assertVillagerHouse2TomaRouteResult(
	points: readonly Point[],
	result: BrowserRouteResult
): Point {
	const layout = VILLAGE_INTERIOR_LAYOUTS['villager-house-2'];
	const approach = layout.npcApproaches.toma.approach;
	const npc = layout.npcApproaches.toma.npc;
	const workbench = layout.propCollisions.tomaWorkbench;
	const workshopSouthDivider = layout.walls.find(
		({ id }) => id === 'villager-house-2-workshop-divider-south'
	);
	if (!workshopSouthDivider) {
		throw new Error('Villager House 2 workshop south divider source is missing');
	}
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const interactionRadius = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;
	const expandedWorkbenchBottom = workbench.y + workbench.height + PLAYER_COLLISION_RADIUS;
	const expandedDividerTop = workshopSouthDivider.y - PLAYER_COLLISION_RADIUS;

	assertVillagerHouse2TomaRouteGeometry(points, approach);
	expect(result.status).toBe('done');
	expect(result.mapId).toBe('villager-house-2');
	expect(result.activeKey).toBeNull();
	expect(result.invalidDiagnostics ?? []).toEqual([]);
	expect(result.diagnostics?.length ?? 0).toBeGreaterThan(0);
	expect(result.position).not.toBeNull();
	if (!result.position) {
		throw new Error(
			`VH2 Toma route returned no live endpoint: ${describeBrowserRouteResult(result, result.token)}`
		);
	}

	for (const diagnostic of result.diagnostics ?? []) {
		expect(diagnostic.mapId).toBe('villager-house-2');
		expect(diagnostic.blocked).toBe(false);
		for (const position of [
			diagnostic.previousPosition,
			diagnostic.requestedPosition,
			diagnostic.resolvedPosition
		]) {
			expect(position.y).toBeGreaterThan(expandedWorkbenchBottom);
			expect(position.y).toBeLessThan(expandedDividerTop);
		}
		expect(
			routeSegmentIntersectsExpandedRect(
				diagnostic.previousPosition,
				diagnostic.requestedPosition,
				workbench,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsExpandedRect(
				diagnostic.previousPosition,
				diagnostic.requestedPosition,
				workshopSouthDivider,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsCircle(
				diagnostic.previousPosition,
				diagnostic.requestedPosition,
				npc,
				npcCollisionRadius
			)
		).toBe(false);
	}
	if (result.lastDiagnostic) {
		expect(result.lastDiagnostic.mapId).toBe('villager-house-2');
		expect(result.lastDiagnostic.blocked).toBe(false);
	}

	const liveDistance = Math.hypot(result.position.x - npc.x, result.position.y - npc.y);
	expect(liveDistance).toBeGreaterThan(npcCollisionRadius);
	expect(liveDistance).toBeLessThanOrEqual(interactionRadius);
	// The unchanged route runner may finish a corrected axis anywhere inside its
	// existing reach band. The interaction annulus above is the authoritative
	// Toma contract; keep this endpoint check aligned with that same ±18 reach
	// bound without changing the shared runner or NPC settle tolerance.
	expect(Math.abs(result.position.x - approach.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(result.position.y - approach.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	return result.position;
}

function isItemShopServiceCorridorWestStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'item-shop' && step.label === 'service-corridor-west';
}

function isItemShopServiceCorridorNorthStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'item-shop' && step.label === 'service-corridor-north';
}

function isItemShopStockroomDoorwayStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	if (interior.mapId === 'item-shop' && step.label === 'stockroom-entry') {
		// Keep the authored doorway checkpoint attached to the exact dispatch key;
		// otherwise the generic route can silently bypass the source-safe office
		// divider handoff.
		expect(step.point).toEqual({ x: 448, y: 160 });
	}
	return interior.mapId === 'item-shop' && step.label === 'stockroom-entry';
}

function isItemShopStockroomTerminalStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'item-shop' && step.label === 'stockroom';
}

function isItemShopStockroomReturnDoorwayStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'item-shop' && step.label === 'office-door';
}

function isItemShopOfficeDoorwayStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return (
		interior.mapId === 'item-shop' &&
		(step.label === 'office' || step.label === 'service-return-east')
	);
}

function isItemShopSpawnReturnCorridorStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	if (interior.mapId === 'item-shop' && step.label === 'spawn-return-corridor') {
		// Keep this fixed-axis handoff attached to the exact authored checkpoint;
		// otherwise the generic two-axis route can reintroduce symmetric x residue
		// into the already-clear vertical service-corridor transit.
		expect(step.point).toEqual({ x: 640, y: 544 });
	}
	return interior.mapId === 'item-shop' && step.label === 'spawn-return-corridor';
}

function itemShopAsymmetricDoorwayKind(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): 'stockroom' | 'office' | null {
	if (
		isItemShopStockroomTerminalStep(interior, step) ||
		isItemShopStockroomReturnDoorwayStep(interior, step)
	) {
		return 'stockroom';
	}
	if (isItemShopOfficeDoorwayStep(interior, step)) return 'office';
	return null;
}

function isGuildHallRecordsAisleHandoffStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'guild-hall' && step.label === 'records-hall-west';
}

function isGuildHallCommonHallWestStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'guild-hall' && step.label === 'common-hall-west';
}

function isGuildHallCommonHallRoomStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'guild-hall' && step.label === 'common-hall-room';
}

function isGuildHallRecordsRoomStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'guild-hall' && step.label === 'records-hall-room';
}

function isGuildHallGuildMasterNorthStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'guild-hall' && step.label === 'guild-master-north';
}

function isGuildHallGuildMasterSpineStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'guild-hall' && step.label === 'guild-master-spine';
}

type GuildHallAisleSpec = {
	readonly wallId: 'guild-hall-records-spine-south' | 'guild-hall-common-spine-south';
	readonly roomKey: 'recordsHall' | 'commonHall';
	readonly handoffY: 'target' | 'safe-above';
	readonly safeAboveInset: number;
	readonly finalClearance: 'top' | 'left';
};

const GUILD_HALL_RECORDS_AISLE_SPEC: GuildHallAisleSpec = {
	wallId: 'guild-hall-records-spine-south',
	roomKey: 'recordsHall',
	handoffY: 'safe-above',
	safeAboveInset: 0,
	finalClearance: 'top'
};

const GUILD_HALL_COMMON_AISLE_SPEC: GuildHallAisleSpec = {
	wallId: 'guild-hall-common-spine-south',
	roomKey: 'commonHall',
	handoffY: 'safe-above',
	// One extra source-safe pixel keeps the observed terminal correction residue
	// inside the unchanged reach band without changing the authored checkpoint.
	safeAboveInset: 1,
	finalClearance: 'top'
};

// The route runner may legally finish a corrected axis anywhere inside its
// unchanged reach tolerance. Keep the full possible endpoint residue separate
// from the ordinary settle tolerance when deriving an obstacle-side handoff.
const GUILD_HALL_ROUTE_ENDPOINT_RESIDUE = AXIS_REACH_TOLERANCE;

function guildHallAisleWall(spec: GuildHallAisleSpec) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const wall = layout.walls.find(({ id }) => id === spec.wallId);
	if (!wall) {
		throw new Error(`Guild Hall ${spec.wallId} source is missing`);
	}
	return wall;
}

function guildHallAisleSafeAboveY(wall: { y: number }, safeAboveInset = 0): number {
	const expandedTop = wall.y - PLAYER_COLLISION_RADIUS;
	return expandedTop - 2 * AXIS_REACH_TOLERANCE - 1 - safeAboveInset;
}

function guildHallAisleHandoffPoint(targetPoint: Point, spec: GuildHallAisleSpec): Point {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const wall = guildHallAisleWall(spec);
	const expandedLeft = wall.x - PLAYER_COLLISION_RADIUS;
	const handoffX = expandedLeft - AXIS_REACH_TOLERANCE - GUILD_HALL_ROUTE_ENDPOINT_RESIDUE - 1;
	const handoffY =
		spec.handoffY === 'safe-above'
			? guildHallAisleSafeAboveY(wall, spec.safeAboveInset)
			: targetPoint.y;
	expect(handoffX + AXIS_REACH_TOLERANCE + GUILD_HALL_ROUTE_ENDPOINT_RESIDUE).toBeLessThan(
		expandedLeft
	);
	if (spec.handoffY === 'safe-above') {
		// Keep the source-derived safe row within the authored checkpoint's
		// unchanged reach contract as well as outside the full two-reach envelope.
		expect(Math.abs(handoffY - targetPoint.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
		expect(handoffY + AXIS_REACH_TOLERANCE + GUILD_HALL_ROUTE_ENDPOINT_RESIDUE).toBeLessThan(
			wall.y - PLAYER_COLLISION_RADIUS
		);
	}
	expect(
		layoutRectContainsPoint(layout.rooms[spec.roomKey], {
			x: handoffX,
			y: handoffY
		})
	).toBe(true);
	return { x: handoffX, y: handoffY };
}

function guildHallAisleRoutePoints(
	currentPoint: Point,
	targetPoint: Point,
	spec: GuildHallAisleSpec
): Point[] {
	const handoff = guildHallAisleHandoffPoint(targetPoint, spec);
	const points =
		currentPoint.y !== handoff.y
			? [currentPoint, { x: currentPoint.x, y: handoff.y }, handoff]
			: [currentPoint, handoff];
	expect(points.at(-1)).toEqual(handoff);
	return points;
}

function guildHallAisleFinalCheckpointRoutePoints(
	currentPoint: Point,
	targetPoint: Point,
	spec: GuildHallAisleSpec
): Point[] {
	const wall = guildHallAisleWall(spec);
	const expandedLeft = wall.x - PLAYER_COLLISION_RADIUS;
	const expandedTop = wall.y - PLAYER_COLLISION_RADIUS;
	// The final leg is only valid after the actual handoff remains clear of the
	// source wall even at the unchanged route reach envelope.
	if (spec.finalClearance === 'top') {
		expect(currentPoint.y + AXIS_REACH_TOLERANCE).toBeLessThan(expandedTop);
	} else {
		expect(currentPoint.x + AXIS_REACH_TOLERANCE).toBeLessThan(expandedLeft);
	}
	if (
		Math.abs(currentPoint.x - targetPoint.x) <= AXIS_REACH_TOLERANCE &&
		Math.abs(currentPoint.y - targetPoint.y) <= AXIS_REACH_TOLERANCE
	) {
		// The live endpoint already satisfies the authored checkpoint contract.
		// Do not synthesize a corner whose skipped first axis would leave the
		// runner at this unchanged coordinate for an unsafe second-axis tap.
		return [currentPoint];
	}
	const points =
		currentPoint.x !== targetPoint.x
			? [currentPoint, { x: targetPoint.x, y: currentPoint.y }, targetPoint]
			: [currentPoint, targetPoint];
	for (let index = 1; index < points.length; index += 1) {
		const from = points[index - 1]!;
		const to = points[index]!;
		expect(
			routeSegmentIntersectsExpandedRectAtReachEnvelope(from, to, wall, PLAYER_COLLISION_RADIUS)
		).toBe(false);
	}
	return points;
}

function guildHallRecordsAisleRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	return guildHallAisleRoutePoints(currentPoint, targetPoint, GUILD_HALL_RECORDS_AISLE_SPEC);
}

function guildHallRecordsAisleFinalCheckpointRoutePoints(
	currentPoint: Point,
	targetPoint: Point
): Point[] {
	return guildHallAisleFinalCheckpointRoutePoints(
		currentPoint,
		targetPoint,
		GUILD_HALL_RECORDS_AISLE_SPEC
	);
}

function guildHallRecordsWallTerminalDepartureRoutePoints(
	currentPoint: Point,
	targetPoint: Point
): Point[] {
	const wall = guildHallAisleWall(GUILD_HALL_RECORDS_AISLE_SPEC);
	const safeY = guildHallAisleSafeAboveY(wall);
	// The preceding records-hall-west endpoint is a terminal checkpoint. Leave
	// it by moving north first, then use the source-derived safe row for every
	// transit leg that follows.
	expect(currentPoint.y).toBeGreaterThan(safeY);
	expect(targetPoint.y).toBeGreaterThan(safeY);
	return [
		currentPoint,
		{ x: currentPoint.x, y: safeY },
		{ x: targetPoint.x, y: safeY },
		targetPoint
	];
}

function guildHallAisleTerminalDepartureRoutePoints(
	currentPoint: Point,
	targetPoint: Point,
	spec: GuildHallAisleSpec
): Point[] {
	const handoff = guildHallAisleHandoffPoint(targetPoint, spec);
	// A terminal endpoint may be inside the symmetric residue envelope while
	// still being collision-free. Depart north first, then apply the full
	// envelope only after reaching the source-derived safe row.
	expect(currentPoint.y).toBeGreaterThan(handoff.y);
	return [currentPoint, { x: currentPoint.x, y: handoff.y }, handoff];
}

function guildHallRecordsRoomRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	return guildHallRecordsWallTerminalDepartureRoutePoints(currentPoint, targetPoint);
}

function guildHallGuildMasterSpineConservativeX(): number {
	const wall = guildHallAisleWall(GUILD_HALL_RECORDS_AISLE_SPEC);
	const expandedLeft = wall.x - PLAYER_COLLISION_RADIUS;
	const conservativeX = expandedLeft - 2 * AXIS_REACH_TOLERANCE - 1;
	// Reserve one reach span for the route endpoint and another for the final
	// correction before descending toward the authored terminal band.
	expect(conservativeX + 2 * AXIS_REACH_TOLERANCE).toBeLessThan(expandedLeft);
	return conservativeX;
}

function guildHallGuildMasterSpineRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	const wall = guildHallAisleWall(GUILD_HALL_RECORDS_AISLE_SPEC);
	const safeY = guildHallAisleSafeAboveY(wall);
	const conservativeX = guildHallGuildMasterSpineConservativeX();
	// The authored checkpoint is deliberately consumed by the dedicated trusted
	// convergence that follows this safe-row handoff.
	expect(targetPoint.y).toBeGreaterThan(safeY);
	const points = [currentPoint, { x: currentPoint.x, y: safeY }, { x: conservativeX, y: safeY }];
	for (let index = 1; index < points.length; index += 1) {
		expect(
			routeSegmentIntersectsExpandedRectAtReachEnvelope(
				points[index - 1]!,
				points[index]!,
				wall,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
	}
	return points;
}

function assertGuildHallGuildMasterSpineRouteContract(
	points: readonly Point[],
	targetPoint: Point
) {
	const wall = guildHallAisleWall(GUILD_HALL_RECORDS_AISLE_SPEC);
	const safeY = guildHallAisleSafeAboveY(wall);
	const conservativeX = guildHallGuildMasterSpineConservativeX();
	expect(points.at(-1)).toEqual({ x: conservativeX, y: safeY });
	expect(targetPoint.y).toBeGreaterThan(safeY);
	expect(points[1]?.x).toBe(points[0]?.x);
	expect(points[1]?.y).toBe(safeY);
	expect(points[2]).toEqual({ x: conservativeX, y: safeY });
	expect(
		layoutRectContainsPoint(VILLAGE_INTERIOR_LAYOUTS['guild-hall'].rooms.recordsHall, {
			x: conservativeX,
			y: safeY
		})
	).toBe(true);
	for (let index = 1; index < points.length; index += 1) {
		expect(
			routeSegmentIntersectsExpandedRectAtReachEnvelope(
				points[index - 1]!,
				points[index]!,
				wall,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
	}
}

function guildHallGuildMasterNorthRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	// The authored y checkpoint is already inside the unchanged reach band once
	// the real endpoint is on the safe row. Converge that terminal y with one
	// trusted-keyboard diagnostic instead of a correction-loop center target.
	return guildHallRecordsWallTerminalDepartureRoutePoints(currentPoint, targetPoint).slice(0, 3);
}

function guildHallCommonHallWestRouteTarget(targetPoint: Point): Point {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const wall = guildHallAisleWall(GUILD_HALL_COMMON_AISLE_SPEC);
	const expandedTop = wall.y - PLAYER_COLLISION_RADIUS;
	const safeY = guildHallAisleSafeAboveY(wall, GUILD_HALL_COMMON_AISLE_SPEC.safeAboveInset);
	// Move the common-west checkpoint onto a source-derived row whose complete
	// endpoint-residue plus reach envelope remains above common-spine-south. The
	// row is still within the authored checkpoint's unchanged ±18 assertion.
	expect(Math.abs(safeY - targetPoint.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(safeY + AXIS_REACH_TOLERANCE + GUILD_HALL_ROUTE_ENDPOINT_RESIDUE).toBeLessThan(
		expandedTop
	);
	expect(layoutRectContainsPoint(layout.rooms.commonHall, { x: targetPoint.x, y: safeY })).toBe(
		true
	);
	return { x: targetPoint.x, y: safeY };
}

function guildHallCommonHallRoomAisleRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	return guildHallAisleTerminalDepartureRoutePoints(
		currentPoint,
		targetPoint,
		GUILD_HALL_COMMON_AISLE_SPEC
	);
}

function guildHallCommonHallRoomFinalCheckpointRoutePoints(
	currentPoint: Point,
	targetPoint: Point
): Point[] {
	return guildHallAisleFinalCheckpointRoutePoints(
		currentPoint,
		targetPoint,
		GUILD_HALL_COMMON_AISLE_SPEC
	);
}

function isItemShopMiraStep(interior: InteriorGrayboxCase, step: InteriorGrayboxStep): boolean {
	return interior.mapId === 'item-shop' && step.interaction?.speaker === 'Mira';
}

function isItemShopMiraReturnStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep,
	leavingInteraction: boolean
): boolean {
	return (
		leavingInteraction && interior.mapId === 'item-shop' && step.label === 'east-aisle-crossing'
	);
}

function isItemShopMiraServiceReturnWestStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'item-shop' && step.label === 'service-return-west';
}

function isItemShopServiceReturnSouthStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'item-shop' && step.label === 'service-return-south';
}

function isGuildHallGuildMasterStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'guild-hall' && step.interaction?.speaker === 'Guild Master Arlen';
}

function isGuildHallGuildMasterReturnStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep,
	leavingInteraction: boolean
): boolean {
	return (
		leavingInteraction && interior.mapId === 'guild-hall' && step.label === 'training-hall-spine'
	);
}

function isGuildHallQuartermasterStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'guild-hall' && step.interaction?.speaker === 'Quartermaster Vale';
}

function isGuildHallQuartermasterReturnStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep,
	leavingInteraction: boolean
): boolean {
	return (
		leavingInteraction && interior.mapId === 'guild-hall' && step.label === 'lobby-return-spine'
	);
}

function isGuildHallLobbyReturnStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep
): boolean {
	return interior.mapId === 'guild-hall' && step.label === 'lobby-return';
}

function guildHallGuildMasterCheckpoint(): Point {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const approach = layout.npcApproaches.guildMaster.approach;
	const npc = layout.npcApproaches.guildMaster.npc;
	const desk = layout.propCollisions.guildMasterDesk;
	const interactionRadius = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;
	const minimumSafeTargetY =
		desk.y + desk.height + PLAYER_COLLISION_RADIUS + NPC_APPROACH_SETTLE_TOLERANCE + 1;
	const maximumSafeTargetY = Math.floor(
		npc.y +
			Math.sqrt(interactionRadius ** 2 - NPC_APPROACH_SETTLE_TOLERANCE ** 2) -
			NPC_APPROACH_SETTLE_TOLERANCE
	);
	return {
		x: approach.x,
		y: Math.floor((minimumSafeTargetY + maximumSafeTargetY) / 2)
	};
}

function guildHallGuildMasterInteractionStagingBand(): IntegerBand {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const npc = layout.npcApproaches.guildMaster.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const interactionRadius = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;
	const minimumStableY = Math.ceil(
		npc.y - Math.sqrt(interactionRadius ** 2 - AXIS_REACH_TOLERANCE ** 2)
	);
	const maximumStableY = npc.y - npcCollisionRadius - 1;

	// The complete integer band is source-derived for the unchanged ±18 route
	// endpoint residue: every y in it remains outside the 29px player/NPC
	// collision circle while every endpoint dx in [-18, 18] remains within the
	// 48px live interaction radius. The strict integer row below the collision
	// boundary is y=114; the interaction envelope's lower row is y=100.
	expect({ minimumStableY, maximumStableY }).toEqual({
		minimumStableY: 100,
		maximumStableY: 114
	});
	return { min: minimumStableY, max: maximumStableY };
}

function guildHallGuildMasterInteractionYBand(): { min: number; maxExclusive: number } {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const npc = layout.npcApproaches.guildMaster.npc;
	const interactionRadius = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const min = npc.y - Math.sqrt(interactionRadius ** 2 - AXIS_REACH_TOLERANCE ** 2);
	const maxExclusive = npc.y - npcCollisionRadius;
	// This continuous source-derived band is the geometry contract for the live
	// point: the integer checkpoints above are 100..114, while a real frame may
	// settle at any y >= npc.y-44.49 and strictly below npc.y-29.
	expect(min).toBeGreaterThan(99);
	expect(min).toBeLessThan(100);
	expect(maxExclusive).toBe(115);
	return { min, maxExclusive };
}

function assertGuildHallGuildMasterInteractionBand(stagingPoint: Point, livePoint?: Point) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const desk = layout.propCollisions.guildMasterDesk;
	const npc = layout.npcApproaches.guildMaster.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const interactionRadius = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;
	const interactionYBand = guildHallGuildMasterInteractionYBand();
	const expandedDeskLeft = desk.x - PLAYER_COLLISION_RADIUS;
	const leftClearanceX = desk.x - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1;
	const officeSpineNorth = layout.walls.find(({ id }) => id === 'guild-hall-office-spine-north');
	const officeSpineSouth = layout.walls.find(({ id }) => id === 'guild-hall-office-spine-south');
	if (!officeSpineNorth || !officeSpineSouth) {
		throw new Error('Guild Hall office-spine collision sources are missing');
	}
	const band = guildHallGuildMasterInteractionStagingBand();

	expect(stagingPoint.x).toBe(leftClearanceX);
	expect(leftClearanceX + AXIS_REACH_TOLERANCE).toBeLessThan(expandedDeskLeft);
	expect(stagingPoint.y).toBe(Math.floor((band.min + band.max) / 2));
	for (let y = band.min; y <= band.max; y += 1) {
		for (let x = npc.x - AXIS_REACH_TOLERANCE; x <= npc.x + AXIS_REACH_TOLERANCE; x += 1) {
			const candidate = { x, y };
			const distanceSquared = (x - npc.x) ** 2 + (y - npc.y) ** 2;
			expect(distanceSquared).toBeGreaterThan(npcCollisionRadius ** 2);
			expect(distanceSquared).toBeLessThanOrEqual(interactionRadius ** 2);
			expect(expandedLayoutRectContainsPoint(desk, candidate, PLAYER_COLLISION_RADIUS)).toBe(false);
		}
		const horizontalEnvelopeStart = {
			x: leftClearanceX + AXIS_REACH_TOLERANCE,
			y
		};
		const horizontalEnvelopeEnd = { x: npc.x + AXIS_REACH_TOLERANCE, y };
		expect(
			routeSegmentIntersectsExpandedRect(
				horizontalEnvelopeStart,
				horizontalEnvelopeEnd,
				desk,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsCircle(
				horizontalEnvelopeStart,
				horizontalEnvelopeEnd,
				npc,
				npcCollisionRadius
			)
		).toBe(false);
		// The semantic row stays inside the authored office and crosses only the
		// open desk-side aisle; neither office/spine partition can intersect the
		// full horizontal endpoint envelope.
		expect(
			routeSegmentIntersectsExpandedRect(
				horizontalEnvelopeStart,
				horizontalEnvelopeEnd,
				officeSpineNorth,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsExpandedRect(
				horizontalEnvelopeStart,
				horizontalEnvelopeEnd,
				officeSpineSouth,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
	}

	if (livePoint) {
		const liveDistanceSquared = (livePoint.x - npc.x) ** 2 + (livePoint.y - npc.y) ** 2;
		expect(livePoint.y).toBeGreaterThanOrEqual(interactionYBand.min);
		expect(livePoint.y).toBeLessThan(interactionYBand.maxExclusive);
		expect(liveDistanceSquared).toBeGreaterThan(npcCollisionRadius ** 2);
		expect(liveDistanceSquared).toBeLessThanOrEqual(interactionRadius ** 2);
		expect(expandedLayoutRectContainsPoint(desk, livePoint, PLAYER_COLLISION_RADIUS)).toBe(false);
	}
}

async function assertGuildHallGuildMasterStagingContract(
	page: Page,
	stagingPoint: Point,
	evidence: MapAwarePlayerEvidence
): Promise<Point> {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const desk = layout.propCollisions.guildMasterDesk;
	const npc = layout.npcApproaches.guildMaster.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const interactionYBand = guildHallGuildMasterInteractionYBand();
	const livePoint = evidence.selectedPoint;
	const npcCollisionBounds = {
		x: npc.x - npcCollisionRadius,
		y: npc.y - npcCollisionRadius,
		width: npcCollisionRadius * 2,
		height: npcCollisionRadius * 2
	};
	const officeSpineNorth = layout.walls.find(({ id }) => id === 'guild-hall-office-spine-north');
	const officeSpineSouth = layout.walls.find(({ id }) => id === 'guild-hall-office-spine-south');
	if (!officeSpineNorth || !officeSpineSouth) {
		throw new Error('Guild Hall office-spine collision sources are missing');
	}

	// This is only the left-side handoff. The NPC annulus is asserted after the
	// horizontal route reaches the NPC's x coordinate below; the staging point is
	// deliberately outside that annulus so it can clear the desk first.
	expect(evidence.state?.ready).toBe(true);
	expect(evidence.state?.mapId).toBe('guild-hall');
	expect(evidence.diagnostic?.mapId).toBe('guild-hall');
	expect(evidence.diagnostic?.blocked).toBe(false);
	expect(Math.abs(livePoint.y - stagingPoint.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(livePoint.y).toBeGreaterThanOrEqual(interactionYBand.min);
	expect(livePoint.y).toBeLessThan(interactionYBand.maxExclusive);
	// The preceding route can settle x on either side of the nominal checkpoint
	// inside its unchanged ±18 band. Prove the complete live residue box is clear
	// in 2D: y separation above the desk is sufficient even when x+18 reaches its
	// expanded left edge, while the same box must be axis-disjoint from the NPC's
	// combined collision envelope and both authored office partitions.
	expect(
		endpointBoxIsDisjointFromExpandedRect(livePoint, desk, PLAYER_COLLISION_RADIUS),
		`Guild Master live residue intersects the desk envelope: ${JSON.stringify({ livePoint, desk })}`
	).toBe(true);
	expect(
		endpointBoxIsDisjointFromExpandedRect(livePoint, npcCollisionBounds, 0),
		`Guild Master live residue intersects the NPC collision envelope: ${JSON.stringify({ livePoint, npc })}`
	).toBe(true);
	expect(
		endpointBoxIsDisjointFromExpandedRect(livePoint, officeSpineNorth, PLAYER_COLLISION_RADIUS),
		`Guild Master live residue intersects the north office partition: ${JSON.stringify({ livePoint, officeSpineNorth })}`
	).toBe(true);
	expect(
		endpointBoxIsDisjointFromExpandedRect(livePoint, officeSpineSouth, PLAYER_COLLISION_RADIUS),
		`Guild Master live residue intersects the south office partition: ${JSON.stringify({ livePoint, officeSpineSouth })}`
	).toBe(true);
	expect(expandedLayoutRectContainsPoint(desk, livePoint, PLAYER_COLLISION_RADIUS)).toBe(false);
	expect(
		expandedLayoutRectContainsPoint(officeSpineNorth, livePoint, PLAYER_COLLISION_RADIUS)
	).toBe(false);
	expect(
		expandedLayoutRectContainsPoint(officeSpineSouth, livePoint, PLAYER_COLLISION_RADIUS)
	).toBe(false);
	const horizontalTarget = { x: npc.x, y: livePoint.y };
	expect(
		routeSegmentIntersectsExpandedRect(livePoint, horizontalTarget, desk, PLAYER_COLLISION_RADIUS)
	).toBe(false);
	expect(routeSegmentIntersectsCircle(livePoint, horizontalTarget, npc, npcCollisionRadius)).toBe(
		false
	);

	const activeRoute = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseRouteRunner?.active() ?? null
	);
	expect(activeRoute?.activeKey ?? null).toBeNull();
	return livePoint;
}

function guildHallGuildMasterInteractionStagingPoint(): Point {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const desk = layout.propCollisions.guildMasterDesk;
	const npc = layout.npcApproaches.guildMaster.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const interactionRadius = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;
	const stagingBand = guildHallGuildMasterInteractionStagingBand();
	const stagingY = Math.floor((stagingBand.min + stagingBand.max) / 2);
	const leftClearanceX = desk.x - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1;
	for (let rowY = stagingBand.min; rowY <= stagingBand.max; rowY += 1) {
		const verticalDistance = npc.y - rowY;
		expect(verticalDistance).toBeGreaterThan(npcCollisionRadius);
		expect(verticalDistance).toBeLessThanOrEqual(interactionRadius);
		expect(rowY).toBeLessThan(desk.y - PLAYER_COLLISION_RADIUS);
		const interactionEntryX =
			npc.x - Math.floor(Math.sqrt(interactionRadius ** 2 - verticalDistance ** 2));
		const approachStart = { x: leftClearanceX, y: rowY };
		const interactionEntry = { x: interactionEntryX, y: rowY };
		expect(interactionEntryX).toBeLessThan(npc.x);
		expect(
			routeSegmentIntersectsExpandedRect(
				approachStart,
				interactionEntry,
				desk,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsCircle(approachStart, interactionEntry, npc, npcCollisionRadius)
		).toBe(false);
	}
	return {
		// The semantic approach stays in the source-derived upper annulus band:
		// every unchanged settle corner is above the expanded desk, outside the
		// NPC's 29px combined collision, and can enter the exact 48px interaction
		// annulus on a horizontal approach without targeting the NPC center.
		x: leftClearanceX,
		y: stagingY
	};
}

function guildHallGuildMasterUpperTransitY(): number {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const desk = layout.propCollisions.guildMasterDesk;
	const expandedDeskTop = desk.y - PLAYER_COLLISION_RADIUS;
	const transitY = expandedDeskTop - 2 * AXIS_REACH_TOLERANCE - 1;
	expect(transitY + 2 * AXIS_REACH_TOLERANCE).toBeLessThan(expandedDeskTop);
	return transitY;
}

function guildHallGuildMasterDoorwayTransitY(): number {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const officeSpineNorth = layout.walls.find(({ id }) => id === 'guild-hall-office-spine-north');
	const officeSpineSouth = layout.walls.find(({ id }) => id === 'guild-hall-office-spine-south');
	if (!officeSpineNorth || !officeSpineSouth) {
		throw new Error('Guild Hall office-spine doorway source is missing');
	}
	return Math.floor((officeSpineNorth.y + officeSpineNorth.height + officeSpineSouth.y) / 2);
}

function guildHallGuildMasterRoutePoints(
	currentPoint: Point,
	targetPoint: Point,
	semanticApproach = false,
	returningToSpine = false
): Point[] {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const desk = layout.propCollisions.guildMasterDesk;
	const leftClearanceX = desk.x - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1;
	// Reserve one additional unchanged reach span for a correction that begins
	// from the preceding route endpoint residue before the return leg crosses
	// the desk row. This is source-derived headroom, not a tolerance change.
	const returnClearanceX =
		desk.x - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - GUILD_HALL_ROUTE_ENDPOINT_RESIDUE - 1;
	const safeTransitY = guildHallGuildMasterDoorwayTransitY();
	const upperTransitY = guildHallGuildMasterUpperTransitY();
	if (semanticApproach) {
		return [
			currentPoint,
			// Cross the office/spine partition through its authored doorway before
			// climbing beside the desk. The upper row is only safe after the
			// horizontal handoff has cleared the desk's expanded left edge.
			{ x: currentPoint.x, y: safeTransitY },
			{ x: returnClearanceX, y: safeTransitY },
			{ x: returnClearanceX, y: upperTransitY },
			{ x: leftClearanceX, y: upperTransitY },
			targetPoint
		];
	}
	if (returningToSpine) {
		// The semantic interaction leaves the player above the NPC. Move laterally
		// while still above its collision circle, then descend at the conservative
		// desk-clearance x before crossing the authored office doorway.
		return [
			currentPoint,
			{ x: returnClearanceX, y: currentPoint.y },
			{ x: returnClearanceX, y: safeTransitY },
			{ x: targetPoint.x, y: safeTransitY },
			targetPoint
		];
	}
	return [
		currentPoint,
		{ x: currentPoint.x, y: upperTransitY },
		{ x: returnClearanceX, y: upperTransitY },
		{ x: returnClearanceX, y: safeTransitY },
		{ x: targetPoint.x, y: safeTransitY },
		targetPoint
	];
}

type IntegerBand = { min: number; max: number };

type GuildHallQuartermasterStagedApproachRow = {
	stagingY: number;
	targetY: number;
	bands: IntegerBand[];
};

type GuildHallQuartermasterStagedApproachCandidate = {
	stagingY: number;
	targetY: number;
	x: number;
};

function guildHallQuartermasterStableApproachBands(targetY: number): IntegerBand[] {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const counter = layout.propCollisions.quartermasterCounter;
	const npc = layout.npcApproaches.quartermaster.npc;
	const interactionRadius = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;
	const candidateStart = Math.ceil(npc.x - interactionRadius - NPC_APPROACH_SETTLE_TOLERANCE);
	const candidateEnd = Math.floor(npc.x + interactionRadius + NPC_APPROACH_SETTLE_TOLERANCE);
	const settleOffsets = [-NPC_APPROACH_SETTLE_TOLERANCE, NPC_APPROACH_SETTLE_TOLERANCE];
	const stableX = Array.from({ length: candidateEnd - candidateStart + 1 }, (_, index) => {
		const x = candidateStart + index;
		return settleOffsets.every((offsetX) =>
			settleOffsets.every((offsetY) => {
				const settledPoint = { x: x + offsetX, y: targetY + offsetY };
				const distance = Math.hypot(settledPoint.x - npc.x, settledPoint.y - npc.y);
				return (
					!expandedLayoutRectContainsPoint(counter, settledPoint, PLAYER_COLLISION_RADIUS) &&
					distance > PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS &&
					distance <= interactionRadius
				);
			})
		);
	})
		.map((stable, index) => (stable ? candidateStart + index : null))
		.filter((x): x is number => x !== null);
	const bands: IntegerBand[] = [];
	for (const x of stableX) {
		const previous = bands.at(-1);
		if (previous && x === previous.max + 1) {
			previous.max = x;
		} else {
			bands.push({ min: x, max: x });
		}
	}
	return bands;
}

function guildHallQuartermasterHorizontalCorrectionIsSafe(targetX: number, targetY: number) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const counter = layout.propCollisions.quartermasterCounter;
	const npc = layout.npcApproaches.quartermaster.npc;
	const trainingQuartermasterDivider = layout.walls.find(
		({ id }) => id === 'guild-hall-training-quartermaster-divider'
	);
	if (!trainingQuartermasterDivider) {
		throw new Error('Guild Hall training-quartermaster divider source is missing');
	}
	const rightClearanceX =
		counter.x + counter.width + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE + 1;
	const settleOffsets = [-NPC_APPROACH_SETTLE_TOLERANCE, NPC_APPROACH_SETTLE_TOLERANCE];
	return settleOffsets.every((offsetY) => {
		const from = { x: rightClearanceX, y: targetY + offsetY };
		const to = { x: targetX, y: targetY + offsetY };
		return (
			!routeSegmentIntersectsExpandedRect(from, to, counter, PLAYER_COLLISION_RADIUS) &&
			!routeSegmentIntersectsExpandedRect(
				from,
				to,
				trainingQuartermasterDivider,
				PLAYER_COLLISION_RADIUS
			) &&
			!routeSegmentIntersectsCircle(
				from,
				to,
				npc,
				PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS
			)
		);
	});
}

function guildHallQuartermasterFinalVerticalCorrectionIsSafe(
	targetX: number,
	stagingY: number,
	targetY: number
) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const counter = layout.propCollisions.quartermasterCounter;
	const npc = layout.npcApproaches.quartermaster.npc;
	const trainingQuartermasterDivider = layout.walls.find(
		({ id }) => id === 'guild-hall-training-quartermaster-divider'
	);
	if (!trainingQuartermasterDivider) {
		throw new Error('Guild Hall training-quartermaster divider source is missing');
	}
	const from = { x: targetX, y: stagingY + NPC_APPROACH_SETTLE_TOLERANCE };
	const through = { x: targetX, y: targetY - AXIS_REACH_TOLERANCE };
	return (
		!routeSegmentIntersectsExpandedRect(from, through, counter, PLAYER_COLLISION_RADIUS) &&
		!routeSegmentIntersectsExpandedRect(
			from,
			through,
			trainingQuartermasterDivider,
			PLAYER_COLLISION_RADIUS
		) &&
		!routeSegmentIntersectsCircle(
			from,
			through,
			npc,
			PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS
		)
	);
}

function guildHallQuartermasterStagedApproachRows(): {
	minimumStableY: number;
	maximumStableY: number;
	minimumFinalTravel: number;
	rows: GuildHallQuartermasterStagedApproachRow[];
	candidates: GuildHallQuartermasterStagedApproachCandidate[];
} {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const counter = layout.propCollisions.quartermasterCounter;
	const trainingQuartermasterDivider = layout.walls.find(
		({ id }) => id === 'guild-hall-training-quartermaster-divider'
	);
	if (!trainingQuartermasterDivider) {
		throw new Error('Guild Hall training-quartermaster divider source is missing');
	}
	const minimumStableY =
		trainingQuartermasterDivider.y +
		trainingQuartermasterDivider.height +
		PLAYER_COLLISION_RADIUS +
		NPC_APPROACH_SETTLE_TOLERANCE +
		1;
	const maximumStableY = counter.y - PLAYER_COLLISION_RADIUS - NPC_APPROACH_SETTLE_TOLERANCE - 1;
	const minimumFinalTravel = NPC_APPROACH_SETTLE_TOLERANCE + 1;
	const rows: GuildHallQuartermasterStagedApproachRow[] = [];
	const candidates: GuildHallQuartermasterStagedApproachCandidate[] = [];
	for (let stagingY = minimumStableY; stagingY <= maximumStableY; stagingY += 1) {
		for (let targetY = minimumStableY; targetY <= maximumStableY; targetY += 1) {
			if (stagingY - targetY < minimumFinalTravel) continue;
			if (
				targetY - AXIS_REACH_TOLERANCE <=
				trainingQuartermasterDivider.y +
					trainingQuartermasterDivider.height +
					PLAYER_COLLISION_RADIUS
			) {
				continue;
			}
			const stableX = guildHallQuartermasterStableApproachBands(targetY)
				.flatMap((band) =>
					Array.from({ length: band.max - band.min + 1 }, (_, index) => band.min + index)
				)
				.filter(
					(targetX) =>
						guildHallQuartermasterHorizontalCorrectionIsSafe(targetX, stagingY) &&
						guildHallQuartermasterFinalVerticalCorrectionIsSafe(targetX, stagingY, targetY)
				);
			const bands: IntegerBand[] = [];
			for (const targetX of stableX) {
				const previous = bands.at(-1);
				if (previous && targetX === previous.max + 1) {
					previous.max = targetX;
				} else {
					bands.push({ min: targetX, max: targetX });
				}
				candidates.push({ stagingY, targetY, x: targetX });
			}
			if (bands.length > 0) rows.push({ stagingY, targetY, bands });
		}
	}
	return { minimumStableY, maximumStableY, minimumFinalTravel, rows, candidates };
}

function guildHallQuartermasterSelectedStagedApproach(): GuildHallQuartermasterStagedApproachCandidate {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const authoredApproach = layout.npcApproaches.quartermaster.approach;
	const { candidates } = guildHallQuartermasterStagedApproachRows();
	const selected = candidates.reduce<GuildHallQuartermasterStagedApproachCandidate | null>(
		(best, candidate) => {
			if (!best) return candidate;
			const candidateDistance =
				(candidate.x - authoredApproach.x) ** 2 + (candidate.targetY - authoredApproach.y) ** 2;
			const bestDistance =
				(best.x - authoredApproach.x) ** 2 + (best.targetY - authoredApproach.y) ** 2;
			if (candidateDistance !== bestDistance)
				return candidateDistance < bestDistance ? candidate : best;
			return candidate.stagingY > best.stagingY ? candidate : best;
		},
		null
	);
	if (!selected) {
		throw new Error('Guild Hall Quartermaster has no source-derived staged approach');
	}
	return selected;
}

function guildHallQuartermasterInteractionStagingPoint(): Point {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const counter = layout.propCollisions.quartermasterCounter;
	return {
		x: counter.x + counter.width + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE + 1,
		// The semantic keyboard approach is separate from the coordinate checkpoint:
		// keep every legal route-residue y above the expanded counter while remaining
		// below the expanded training divider.
		y: counter.y - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1
	};
}

function assertGuildHallGuildMasterRouteContract(
	points: readonly Point[],
	targetPoint: Point,
	semanticApproach = false,
	returningToSpine = false
) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const desk = layout.propCollisions.guildMasterDesk;
	const leftClearanceX = desk.x - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1;
	const returnClearanceX =
		desk.x - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - GUILD_HALL_ROUTE_ENDPOINT_RESIDUE - 1;
	const safeTransitY = guildHallGuildMasterDoorwayTransitY();
	const upperTransitY = guildHallGuildMasterUpperTransitY();
	const npc = layout.npcApproaches.guildMaster.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;

	expect(points.at(-1)).toEqual(targetPoint);
	if (semanticApproach) {
		const officeSpineNorth = layout.walls.find(({ id }) => id === 'guild-hall-office-spine-north');
		const officeSpineSouth = layout.walls.find(({ id }) => id === 'guild-hall-office-spine-south');
		if (!officeSpineNorth || !officeSpineSouth) {
			throw new Error('Guild Hall office-spine doorway source is missing');
		}
		const expandedNorthBottom =
			officeSpineNorth.y + officeSpineNorth.height + PLAYER_COLLISION_RADIUS;
		const expandedSouthTop = officeSpineSouth.y - PLAYER_COLLISION_RADIUS;
		expect(points).toHaveLength(6);
		expect(points[1]?.x).toBe(points[0]?.x);
		expect(points[1]?.y).toBe(safeTransitY);
		expect(points[2]?.x).toBe(returnClearanceX);
		expect(points[2]?.y).toBe(safeTransitY);
		expect(points[3]?.x).toBe(returnClearanceX);
		expect(points[3]?.y).toBe(upperTransitY);
		expect(points[4]?.x).toBe(leftClearanceX);
		expect(points[4]?.y).toBe(upperTransitY);
		expect(targetPoint).toEqual(guildHallGuildMasterInteractionStagingPoint());
		const expandedDeskLeft = desk.x - PLAYER_COLLISION_RADIUS;
		const expandedDeskTop = desk.y - PLAYER_COLLISION_RADIUS;
		const semanticStaging = guildHallGuildMasterInteractionStagingPoint();
		assertGuildHallGuildMasterInteractionBand(semanticStaging);
		// The first horizontal leg uses the authored office/spine doorway. Keep
		// every unchanged route-residue corner strictly between the two expanded
		// partition bands before taking the upper desk approach.
		for (let offset = -AXIS_REACH_TOLERANCE; offset <= AXIS_REACH_TOLERANCE; offset += 1) {
			expect(safeTransitY + offset).toBeGreaterThan(expandedNorthBottom);
			expect(safeTransitY + offset).toBeLessThan(expandedSouthTop);
		}
		expect(
			routeSegmentIntersectsExpandedRectAtReachEnvelope(
				points[1]!,
				points[2]!,
				officeSpineNorth,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsExpandedRectAtReachEnvelope(
				points[1]!,
				points[2]!,
				officeSpineSouth,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			returnClearanceX + AXIS_REACH_TOLERANCE + GUILD_HALL_ROUTE_ENDPOINT_RESIDUE
		).toBeLessThan(expandedDeskLeft);
		expect(upperTransitY + 2 * AXIS_REACH_TOLERANCE).toBeLessThan(expandedDeskTop);
		expect(leftClearanceX + AXIS_REACH_TOLERANCE).toBeLessThan(expandedDeskLeft);
		const transitPoints = [points[1]!, points[2]!, points[3]!, points[4]!];
		for (const transitPoint of transitPoints) {
			for (let offsetX = -AXIS_REACH_TOLERANCE; offsetX <= AXIS_REACH_TOLERANCE; offsetX += 1) {
				for (let offsetY = -AXIS_REACH_TOLERANCE; offsetY <= AXIS_REACH_TOLERANCE; offsetY += 1) {
					const settledPoint = {
						x: transitPoint.x + offsetX,
						y: transitPoint.y + offsetY
					};
					const dx = settledPoint.x - npc.x;
					const dy = settledPoint.y - npc.y;
					expect(dx * dx + dy * dy).toBeGreaterThan(npcCollisionRadius ** 2);
					expect(expandedLayoutRectContainsPoint(desk, settledPoint, PLAYER_COLLISION_RADIUS)).toBe(
						false
					);
				}
			}
		}
		expect(
			routeSegmentIntersectsExpandedRectAtReachEnvelope(
				points[1]!,
				points[2]!,
				desk,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsExpandedRectAtReachEnvelope(
				points[2]!,
				points[3]!,
				desk,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsExpandedRectAtReachEnvelope(
				points[3]!,
				points[4]!,
				desk,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		for (let offsetY = -AXIS_REACH_TOLERANCE; offsetY <= AXIS_REACH_TOLERANCE; offsetY += 1) {
			for (const fromOffsetX of [-AXIS_REACH_TOLERANCE, AXIS_REACH_TOLERANCE]) {
				for (const toOffsetX of [-AXIS_REACH_TOLERANCE, AXIS_REACH_TOLERANCE]) {
					expect(
						routeSegmentIntersectsCircle(
							{
								x: points[3]!.x + fromOffsetX,
								y: points[3]!.y + offsetY
							},
							{
								x: points[4]!.x + toOffsetX,
								y: points[4]!.y + offsetY
							},
							npc,
							npcCollisionRadius
						)
					).toBe(false);
				}
			}
		}
		for (let offset = -AXIS_REACH_TOLERANCE; offset <= AXIS_REACH_TOLERANCE; offset += 1) {
			expect(targetPoint.x + offset).toBeLessThan(expandedDeskLeft);
			if (Math.abs(offset) <= NPC_APPROACH_SETTLE_TOLERANCE) {
				expect(targetPoint.y + offset).toBeLessThan(expandedDeskTop);
			}
		}
		expect(targetPoint).toEqual(semanticStaging);
		expect(targetPoint.x).toBe(leftClearanceX);
		expect(trustedNpcDirectionToward(targetPoint, npc)).toBe('ArrowRight');
		for (
			let offset = -NPC_APPROACH_SETTLE_TOLERANCE;
			offset <= NPC_APPROACH_SETTLE_TOLERANCE;
			offset += 1
		) {
			const rowY = targetPoint.y + offset;
			const verticalDistance = npc.y - rowY;
			const interactionEntryX =
				npc.x -
				Math.floor(
					Math.sqrt((PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS) ** 2 - verticalDistance ** 2)
				);
			expect(verticalDistance).toBeGreaterThan(npcCollisionRadius);
			expect(verticalDistance).toBeLessThanOrEqual(
				PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS
			);
			expect(interactionEntryX).toBeLessThan(npc.x);
			expect(
				routeSegmentIntersectsCircle(
					{ x: leftClearanceX, y: rowY },
					{ x: interactionEntryX, y: rowY },
					npc,
					npcCollisionRadius
				)
			).toBe(false);
		}
	} else {
		expect(
			returnClearanceX + AXIS_REACH_TOLERANCE + GUILD_HALL_ROUTE_ENDPOINT_RESIDUE
		).toBeLessThan(desk.x - PLAYER_COLLISION_RADIUS);
		if (returningToSpine) {
			// Leave the semantic interaction laterally while still above the NPC,
			// then descend only after the full-residue handoff is desk-clear.
			expect(points).toHaveLength(5);
			expect(npc.y - points[0]!.y).toBeGreaterThan(npcCollisionRadius);
			expect(points[1]?.x).toBe(returnClearanceX);
			expect(points[1]?.y).toBe(points[0]?.y);
			expect(points[2]?.x).toBe(returnClearanceX);
			expect(points[2]?.y).toBe(safeTransitY);
			expect(points[3]?.x).toBe(targetPoint.x);
			expect(points[3]?.y).toBe(safeTransitY);
		} else {
			expect(points[1]?.x).toBe(points[0]?.x);
			expect(points[1]?.y).toBe(upperTransitY);
			expect(points[2]?.x).toBe(returnClearanceX);
			expect(points[2]?.y).toBe(upperTransitY);
			expect(points[3]?.x).toBe(returnClearanceX);
			expect(points[3]?.y).toBe(safeTransitY);
			expect(points[4]?.x).toBe(targetPoint.x);
			expect(points[4]?.y).toBe(safeTransitY);
		}
		expect(points.some((point) => point.y === safeTransitY)).toBe(true);
		if (returningToSpine) {
			const clearancePoints = [points[1]!, points[2]!];
			for (const clearancePoint of clearancePoints) {
				for (let offsetX = -AXIS_REACH_TOLERANCE; offsetX <= AXIS_REACH_TOLERANCE; offsetX += 1) {
					for (let offsetY = -AXIS_REACH_TOLERANCE; offsetY <= AXIS_REACH_TOLERANCE; offsetY += 1) {
						const settledPoint = {
							x: clearancePoint.x + offsetX,
							y: clearancePoint.y + offsetY
						};
						const dx = settledPoint.x - npc.x;
						const dy = settledPoint.y - npc.y;
						expect(dx * dx + dy * dy).toBeGreaterThan(npcCollisionRadius ** 2);
						expect(
							expandedLayoutRectContainsPoint(desk, settledPoint, PLAYER_COLLISION_RADIUS)
						).toBe(false);
					}
				}
			}
		}
		const officeSpineNorth = layout.walls.find(({ id }) => id === 'guild-hall-office-spine-north');
		const officeSpineSouth = layout.walls.find(({ id }) => id === 'guild-hall-office-spine-south');
		if (!officeSpineNorth || !officeSpineSouth) {
			throw new Error('Guild Hall office-spine doorway source is missing');
		}
		const expandedNorthBottom =
			officeSpineNorth.y + officeSpineNorth.height + PLAYER_COLLISION_RADIUS;
		const expandedSouthTop = officeSpineSouth.y - PLAYER_COLLISION_RADIUS;
		for (let offset = -AXIS_REACH_TOLERANCE; offset <= AXIS_REACH_TOLERANCE; offset += 1) {
			expect(safeTransitY + offset).toBeGreaterThan(expandedNorthBottom);
			expect(safeTransitY + offset).toBeLessThan(expandedSouthTop);
		}
	}
	const routeClearanceX = semanticApproach ? leftClearanceX : returnClearanceX;
	expect(
		layoutRectContainsPoint(layout.rooms.guildMasterOffice, {
			x: routeClearanceX,
			y: safeTransitY
		})
	).toBe(true);
	if (returningToSpine) {
		expect(layoutRectContainsPoint(layout.corridors.mainSpine, targetPoint)).toBe(true);
	} else {
		expect(layoutRectContainsPoint(layout.rooms.guildMasterOffice, targetPoint)).toBe(true);
	}

	for (let index = 1; index < points.length; index += 1) {
		expect(
			routeSegmentIntersectsExpandedRect(
				points[index - 1]!,
				points[index]!,
				desk,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		if (!semanticApproach) {
			const officeSpineNorth = layout.walls.find(
				({ id }) => id === 'guild-hall-office-spine-north'
			);
			const officeSpineSouth = layout.walls.find(
				({ id }) => id === 'guild-hall-office-spine-south'
			);
			if (!officeSpineNorth || !officeSpineSouth) {
				throw new Error('Guild Hall office-spine doorway source is missing');
			}
			expect(
				routeSegmentIntersectsExpandedRect(
					points[index - 1]!,
					points[index]!,
					officeSpineNorth,
					PLAYER_COLLISION_RADIUS
				)
			).toBe(false);
			expect(
				routeSegmentIntersectsExpandedRect(
					points[index - 1]!,
					points[index]!,
					officeSpineSouth,
					PLAYER_COLLISION_RADIUS
				)
			).toBe(false);
		}
		if (semanticApproach || returningToSpine) {
			expect(
				routeSegmentIntersectsCircle(points[index - 1]!, points[index]!, npc, npcCollisionRadius)
			).toBe(false);
		}
	}
}

function guildHallQuartermasterCheckpoint(): Point {
	const selected = guildHallQuartermasterSelectedStagedApproach();
	return { x: selected.x, y: selected.targetY };
}

function guildHallQuartermasterDoorwayTransitY(): number {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const quartermasterSpineSouth = layout.walls.find(
		({ id }) => id === 'guild-hall-quartermaster-spine-south'
	);
	const quartermasterToSpine = layout.doors.quartermasterToSpine;
	if (!quartermasterSpineSouth) {
		throw new Error('Guild Hall quartermaster spine south source is missing');
	}
	const transitY = quartermasterSpineSouth.y - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1;
	expect(transitY).toBeGreaterThanOrEqual(quartermasterToSpine.y);
	expect(transitY).toBeLessThanOrEqual(quartermasterToSpine.y + quartermasterToSpine.height);
	expect(transitY + AXIS_REACH_TOLERANCE).toBeLessThan(
		quartermasterSpineSouth.y - PLAYER_COLLISION_RADIUS
	);
	return transitY;
}

function guildHallQuartermasterDoorwayRightClearanceX(): number {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const quartermasterSpineSouth = layout.walls.find(
		({ id }) => id === 'guild-hall-quartermaster-spine-south'
	);
	if (!quartermasterSpineSouth) {
		throw new Error('Guild Hall quartermaster spine south source is missing');
	}
	const clearanceX =
		quartermasterSpineSouth.x +
		quartermasterSpineSouth.width +
		PLAYER_COLLISION_RADIUS +
		AXIS_REACH_TOLERANCE +
		1;
	expect(clearanceX - AXIS_REACH_TOLERANCE).toBeGreaterThan(
		quartermasterSpineSouth.x + quartermasterSpineSouth.width + PLAYER_COLLISION_RADIUS
	);
	expect(
		layoutRectContainsPoint(layout.rooms.quartermasterRoom, {
			x: clearanceX,
			y: guildHallQuartermasterDoorwayTransitY()
		})
	).toBe(true);
	return clearanceX;
}

function guildHallQuartermasterRoutePoints(
	currentPoint: Point,
	targetPoint: Point,
	leavingInteraction: boolean,
	semanticApproach = false
): Point[] {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const counter = layout.propCollisions.quartermasterCounter;
	const rightClearanceX =
		counter.x + counter.width + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE + 1;
	const belowCounterY =
		counter.y + counter.height + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE + 1;
	if (leavingInteraction) {
		// The post-dialogue endpoint is already in the authored open row between the
		// expanded training divider and counter. Exit the Quartermaster NPC circle
		// on that actual y first; only then descend at the source-derived counter
		// right clearance. This avoids a one-frame downward overshoot back into the
		// NPC collision circle.
		const doorwayTransitY = guildHallQuartermasterDoorwayTransitY();
		const doorwayRightClearanceX = guildHallQuartermasterDoorwayRightClearanceX();
		return [
			currentPoint,
			{ x: rightClearanceX, y: currentPoint.y },
			{ x: rightClearanceX, y: belowCounterY },
			{ x: doorwayRightClearanceX, y: belowCounterY },
			{ x: doorwayRightClearanceX, y: doorwayTransitY },
			{ x: targetPoint.x, y: doorwayTransitY },
			targetPoint
		];
	}
	// The quartermaster room is entered through the spine door below the training
	// divider. Cross the room below the counter to the source-derived right
	// clearance and rise to the semantic keyboard staging row.
	const stagedApproach = guildHallQuartermasterSelectedStagedApproach();
	if (semanticApproach) {
		const stagingPoint = guildHallQuartermasterInteractionStagingPoint();
		if (targetPoint.x !== stagingPoint.x || targetPoint.y !== stagingPoint.y) {
			throw new Error(
				`Guild Hall Quartermaster semantic staging target mismatch: ${JSON.stringify({
					targetPoint,
					stagingPoint
				})}`
			);
		}
		const doorwayTransitY = guildHallQuartermasterDoorwayTransitY();
		const doorwayRightClearanceX = guildHallQuartermasterDoorwayRightClearanceX();
		// Stop at the doorway-right handoff. The actual settled y is the
		// authoritative fixed-axis row for the next leg; forcing the nominal
		// below-counter row here can require an unreachable correction after the
		// doorway y has already settled within the unchanged route reach.
		return [
			currentPoint,
			{ x: currentPoint.x, y: doorwayTransitY },
			{ x: doorwayRightClearanceX, y: doorwayTransitY }
		];
	}
	if (targetPoint.x !== stagedApproach.x || targetPoint.y !== stagedApproach.targetY) {
		throw new Error(
			`Guild Hall Quartermaster target is not the selected staged approach: ${JSON.stringify({
				targetPoint,
				stagedApproach
			})}`
		);
	}
	return [
		currentPoint,
		{ x: currentPoint.x, y: belowCounterY },
		{ x: rightClearanceX, y: belowCounterY },
		{ x: rightClearanceX, y: stagedApproach.stagingY },
		{ x: targetPoint.x, y: stagedApproach.stagingY },
		targetPoint
	];
}

function guildHallQuartermasterSemanticHorizontalRoutePoints(
	doorwayRightHandoff: Point
): [Point, Point] {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const counter = layout.propCollisions.quartermasterCounter;
	const rightClearanceX =
		counter.x + counter.width + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE + 1;
	const expandedCounterBottom = counter.y + counter.height + PLAYER_COLLISION_RADIUS;
	// The doorway route's actual y is authoritative. It is already below the
	// expanded counter, so the fixed-axis crossing must preserve that y rather
	// than invent a symmetric ±18 orthogonal residue envelope.
	expect(doorwayRightHandoff.y).toBeGreaterThan(expandedCounterBottom);
	return [doorwayRightHandoff, { x: rightClearanceX, y: doorwayRightHandoff.y }];
}

function guildHallQuartermasterSemanticVerticalRoutePoints(
	horizontalHandoff: Point,
	targetPoint: Point
): [Point, Point] {
	const stagingPoint = guildHallQuartermasterInteractionStagingPoint();
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const counter = layout.propCollisions.quartermasterCounter;
	const expandedCounterRight = counter.x + counter.width + PLAYER_COLLISION_RADIUS;
	expect(targetPoint).toEqual(stagingPoint);
	expect(Math.abs(horizontalHandoff.x - stagingPoint.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(horizontalHandoff.x).toBeGreaterThan(expandedCounterRight);
	// Preserve the actual horizontal handoff x during the final vertical leg;
	// the source-derived x=903 target is a clearance anchor, while the live
	// endpoint is the authoritative continuation point.
	return [horizontalHandoff, { x: horizontalHandoff.x, y: stagingPoint.y }];
}

function guildHallQuartermasterReturnCorridorRoutePoints(
	verticalHandoff: Point,
	targetPoint: Point
): Point[] {
	const doorwayTransitY = guildHallQuartermasterDoorwayTransitY();
	const doorwayRightClearanceX = guildHallQuartermasterDoorwayRightClearanceX();
	return [
		verticalHandoff,
		{ x: doorwayRightClearanceX, y: verticalHandoff.y },
		{ x: doorwayRightClearanceX, y: doorwayTransitY },
		{ x: targetPoint.x, y: doorwayTransitY },
		targetPoint
	];
}

function assertGuildHallQuartermasterReturnAxisRouteContract(
	points: readonly [Point, Point],
	result: BrowserRouteResult,
	axis: Axis,
	label: string
) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const counter = layout.propCollisions.quartermasterCounter;
	const npc = layout.npcApproaches.quartermaster.npc;
	const trainingQuartermasterDivider = layout.walls.find(
		({ id }) => id === 'guild-hall-training-quartermaster-divider'
	);
	const quartermasterSpineSouth = layout.walls.find(
		({ id }) => id === 'guild-hall-quartermaster-spine-south'
	);
	if (!trainingQuartermasterDivider || !quartermasterSpineSouth) {
		throw new Error('Guild Hall Quartermaster return source geometry is missing');
	}
	const from = points[0]!;
	const target = points[1]!;
	const diagnostics = result.diagnostics ?? [];

	expect(result.status, `${label} status`).toBe('done');
	expect(result.mapId, `${label} map`).toBe('guild-hall');
	expect(result.activeKey ?? null, `${label} active key`).toBeNull();
	expect(result.axis, `${label} final axis`).toBeNull();
	expect(result.target, `${label} final target`).toBeNull();
	expect(result.invalidDiagnostics ?? [], `${label} invalid diagnostics`).toEqual([]);
	expect(result.diagnosticAxes ?? [], `${label} diagnostic axes`).toEqual(
		diagnostics.map(() => axis)
	);

	for (const [index, diagnostic] of diagnostics.entries()) {
		expect(diagnostic.mapId, `${label} diagnostic ${index} map`).toBe('guild-hall');
		expect(diagnostic.blocked, `${label} diagnostic ${index} blocked`).toBe(false);
		const fixedAxis = axis === 'x' ? 'y' : 'x';
		expect(
			diagnostic.previousPosition[fixedAxis],
			`${label} diagnostic ${index} fixed previous`
		).toBe(from[fixedAxis]);
		expect(
			diagnostic.requestedPosition[fixedAxis],
			`${label} diagnostic ${index} fixed requested`
		).toBe(from[fixedAxis]);
		expect(
			diagnostic.resolvedPosition[fixedAxis],
			`${label} diagnostic ${index} fixed resolved`
		).toBe(from[fixedAxis]);
		assertGuildHallTerminalDiagnosticProgress(diagnostic, axis, target);
		for (const obstacle of [counter, trainingQuartermasterDivider, quartermasterSpineSouth]) {
			expect(
				routeSegmentIntersectsExpandedRect(
					diagnostic.previousPosition,
					diagnostic.requestedPosition,
					obstacle,
					PLAYER_COLLISION_RADIUS
				),
				`${label} diagnostic ${index} crossed a source obstacle`
			).toBe(false);
		}
		expect(
			routeSegmentIntersectsCircle(
				diagnostic.previousPosition,
				diagnostic.requestedPosition,
				npc,
				PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS
			),
			`${label} diagnostic ${index} crossed Quartermaster NPC`
		).toBe(false);
	}
	const finalAxisValue = result.position?.[axis] ?? Number.NaN;
	expect(
		Math.abs(target[axis] - finalAxisValue),
		`${label} final ${axis} distance improves`
	).toBeLessThan(Math.abs(target[axis] - from[axis]));
	if (axis === 'x') {
		expect(target.y).toBe(from.y);
		expect(result.position?.y).toBe(from.y);
		expect(Math.abs((result.position?.x ?? Number.NaN) - target.x)).toBeLessThanOrEqual(
			AXIS_REACH_TOLERANCE
		);
	} else {
		expect(target.x).toBe(from.x);
		expect(result.position?.x).toBe(from.x);
		expect(Math.abs((result.position?.y ?? Number.NaN) - target.y)).toBeLessThanOrEqual(
			AXIS_REACH_TOLERANCE
		);
	}
}

function assertGuildHallQuartermasterReturnCorridorGeometry(
	points: readonly Point[],
	label: string
) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const npc = layout.npcApproaches.quartermaster.npc;
	const obstacles = [
		...Object.values(layout.propCollisions),
		...layout.walls.filter(({ id }) => id === 'guild-hall-training-quartermaster-divider'),
		...layout.walls.filter(({ id }) => id === 'guild-hall-quartermaster-spine-south')
	];
	for (let index = 1; index < points.length; index += 1) {
		const from = points[index - 1]!;
		const to = points[index]!;
		for (const obstacle of obstacles) {
			expect(
				routeSegmentIntersectsExpandedRect(from, to, obstacle, PLAYER_COLLISION_RADIUS),
				`${label} crossed a source obstacle`
			).toBe(false);
		}
		expect(
			routeSegmentIntersectsCircle(
				from,
				to,
				npc,
				PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS
			),
			`${label} crossed Quartermaster NPC`
		).toBe(false);
	}
}

function axisAlignedSegmentIntersectsExpandedRect(
	from: Point,
	to: Point,
	rect: { x: number; y: number; width: number; height: number },
	padding: number
): boolean {
	const left = rect.x - padding;
	const right = rect.x + rect.width + padding;
	const top = rect.y - padding;
	const bottom = rect.y + rect.height + padding;
	if (from.x === to.x) {
		return (
			from.x >= left &&
			from.x <= right &&
			Math.max(Math.min(from.y, to.y), top) <= Math.min(Math.max(from.y, to.y), bottom)
		);
	}
	if (from.y === to.y) {
		return (
			from.y >= top &&
			from.y <= bottom &&
			Math.max(Math.min(from.x, to.x), left) <= Math.min(Math.max(from.x, to.x), right)
		);
	}
	throw new Error(`Guild Hall corridor must remain axis-aligned: ${JSON.stringify({ from, to })}`);
}

function routeSegmentIntersectsExpandedRect(
	from: Point,
	to: Point,
	rect: { x: number; y: number; width: number; height: number },
	padding: number
): boolean {
	const axisTurn = { x: to.x, y: from.y };
	return (
		axisAlignedSegmentIntersectsExpandedRect(from, axisTurn, rect, padding) ||
		axisAlignedSegmentIntersectsExpandedRect(axisTurn, to, rect, padding)
	);
}

function axisAlignedSegmentIntersectsCircle(
	from: Point,
	to: Point,
	center: Point,
	radius: number
): boolean {
	if (from.x === to.x) {
		const horizontalDistance = Math.abs(from.x - center.x);
		if (horizontalDistance > radius) return false;
		const verticalReach = Math.sqrt(radius ** 2 - horizontalDistance ** 2);
		return (
			Math.max(Math.min(from.y, to.y), center.y - verticalReach) <=
			Math.min(Math.max(from.y, to.y), center.y + verticalReach)
		);
	}
	if (from.y === to.y) {
		const verticalDistance = Math.abs(from.y - center.y);
		if (verticalDistance > radius) return false;
		const horizontalReach = Math.sqrt(radius ** 2 - verticalDistance ** 2);
		return (
			Math.max(Math.min(from.x, to.x), center.x - horizontalReach) <=
			Math.min(Math.max(from.x, to.x), center.x + horizontalReach)
		);
	}
	throw new Error(`Guild Hall corridor must remain axis-aligned: ${JSON.stringify({ from, to })}`);
}

function routeSegmentIntersectsCircle(
	from: Point,
	to: Point,
	center: Point,
	radius: number
): boolean {
	const axisTurn = { x: to.x, y: from.y };
	return (
		axisAlignedSegmentIntersectsCircle(from, axisTurn, center, radius) ||
		axisAlignedSegmentIntersectsCircle(axisTurn, to, center, radius)
	);
}

function endpointBoxIsDisjointFromExpandedRect(
	point: Point,
	rect: { x: number; y: number; width: number; height: number },
	padding: number
): boolean {
	const endpointLeft = point.x - AXIS_REACH_TOLERANCE;
	const endpointRight = point.x + AXIS_REACH_TOLERANCE;
	const endpointTop = point.y - AXIS_REACH_TOLERANCE;
	const endpointBottom = point.y + AXIS_REACH_TOLERANCE;
	const obstacleLeft = rect.x - padding;
	const obstacleRight = rect.x + rect.width + padding;
	const obstacleTop = rect.y - padding;
	const obstacleBottom = rect.y + rect.height + padding;

	// Rectangle collision is inclusive at the boundary. The endpoint box is safe
	// when its x or y interval is strictly disjoint from the expanded obstacle;
	// this is the 2D contract for live route residue rather than an x-only aisle
	// assumption.
	return (
		endpointRight < obstacleLeft ||
		endpointLeft > obstacleRight ||
		endpointBottom < obstacleTop ||
		endpointTop > obstacleBottom
	);
}

function endpointXEnvelopeIsDisjointFromExpandedRect(
	point: Point,
	rect: { x: number; y: number; width: number; height: number },
	padding: number
): boolean {
	const endpointLeft = point.x - AXIS_REACH_TOLERANCE;
	const endpointRight = point.x + AXIS_REACH_TOLERANCE;
	const obstacleLeft = rect.x - padding;
	const obstacleRight = rect.x + rect.width + padding;
	const obstacleTop = rect.y - padding;
	const obstacleBottom = rect.y + rect.height + padding;

	// Doorway crossings hold y fixed. Their legal endpoint residue is therefore
	// only the unchanged x reach; applying a hypothetical ±18 y residue here
	// would reject the authored 40px player-safe opening.
	return (
		endpointRight < obstacleLeft ||
		endpointLeft > obstacleRight ||
		point.y < obstacleTop ||
		point.y > obstacleBottom
	);
}

function endpointYEnvelopeIsDisjointFromExpandedRect(
	point: Point,
	rect: { x: number; y: number; width: number; height: number },
	padding: number
): boolean {
	const endpointTop = point.y - AXIS_REACH_TOLERANCE;
	const endpointBottom = point.y + AXIS_REACH_TOLERANCE;
	const obstacleLeft = rect.x - padding;
	const obstacleRight = rect.x + rect.width + padding;
	const obstacleTop = rect.y - padding;
	const obstacleBottom = rect.y + rect.height + padding;

	// Fixed-axis vertical transit holds x at the actual settled coordinate. Its
	// legal endpoint residue is therefore only the unchanged y reach; applying a
	// hypothetical ±18 x residue would reject a source-clear side passage.
	return (
		point.x < obstacleLeft ||
		point.x > obstacleRight ||
		endpointBottom < obstacleTop ||
		endpointTop > obstacleBottom
	);
}

function routeSegmentIntersectsExpandedRectAtReachEnvelope(
	from: Point,
	to: Point,
	rect: { x: number; y: number; width: number; height: number },
	padding: number
): boolean {
	if (from.x === to.x) {
		for (let offsetX = -AXIS_REACH_TOLERANCE; offsetX <= AXIS_REACH_TOLERANCE; offsetX += 1) {
			for (const fromOffsetY of [-AXIS_REACH_TOLERANCE, AXIS_REACH_TOLERANCE]) {
				for (const toOffsetY of [-AXIS_REACH_TOLERANCE, AXIS_REACH_TOLERANCE]) {
					if (
						routeSegmentIntersectsExpandedRect(
							{ x: from.x + offsetX, y: from.y + fromOffsetY },
							{ x: to.x + offsetX, y: to.y + toOffsetY },
							rect,
							padding
						)
					) {
						return true;
					}
				}
			}
		}
		return false;
	}
	if (from.y === to.y) {
		for (let offsetY = -AXIS_REACH_TOLERANCE; offsetY <= AXIS_REACH_TOLERANCE; offsetY += 1) {
			for (const fromOffsetX of [-AXIS_REACH_TOLERANCE, AXIS_REACH_TOLERANCE]) {
				for (const toOffsetX of [-AXIS_REACH_TOLERANCE, AXIS_REACH_TOLERANCE]) {
					if (
						routeSegmentIntersectsExpandedRect(
							{ x: from.x + fromOffsetX, y: from.y + offsetY },
							{ x: to.x + toOffsetX, y: to.y + offsetY },
							rect,
							padding
						)
					) {
						return true;
					}
				}
			}
		}
		return false;
	}
	throw new Error(`Route envelope must remain axis-aligned: ${JSON.stringify({ from, to })}`);
}

function assertTask6InteriorRouteEnvelope(
	mapId: 'guild-hall' | 'item-shop',
	points: readonly Point[],
	label: string,
	options: {
		readonly skipInitialTerminalDeparture?: boolean;
		readonly skipInitialAsymmetricDoorwayCrossing?: boolean;
		readonly skipInitialAsymmetricFixedAxisTransit?: boolean;
	} = {}
) {
	const layout = VILLAGE_INTERIOR_LAYOUTS[mapId];
	const firstTransitSegment =
		options.skipInitialTerminalDeparture ||
		options.skipInitialAsymmetricDoorwayCrossing ||
		options.skipInitialAsymmetricFixedAxisTransit
			? 2
			: 1;
	for (let index = firstTransitSegment; index < points.length; index += 1) {
		const from = points[index - 1]!;
		const to = points[index]!;
		for (const wall of layout.walls) {
			expect(
				routeSegmentIntersectsExpandedRectAtReachEnvelope(from, to, wall, PLAYER_COLLISION_RADIUS),
				`${label} crossed ${wall.id} within the ±${AXIS_REACH_TOLERANCE} endpoint envelope: ${JSON.stringify({ from, to })}`
			).toBe(false);
		}
		for (const propCollision of Object.values(layout.propCollisions)) {
			expect(
				routeSegmentIntersectsExpandedRectAtReachEnvelope(
					from,
					to,
					propCollision,
					PLAYER_COLLISION_RADIUS
				),
				`${label} crossed a prop collision within the ±${AXIS_REACH_TOLERANCE} endpoint envelope: ${JSON.stringify({ from, to, propCollision })}`
			).toBe(false);
		}
	}
}

function assertGuildHallAisleHandoffContract(
	points: readonly Point[],
	targetPoint: Point,
	spec: GuildHallAisleSpec
) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const wall = guildHallAisleWall(spec);
	const handoff = guildHallAisleHandoffPoint(targetPoint, spec);
	const expandedLeft = wall.x - PLAYER_COLLISION_RADIUS;
	expect(points.at(-1)).toEqual(handoff);
	expect(handoff.x + AXIS_REACH_TOLERANCE).toBeLessThan(
		expandedLeft - INTERIOR_ROUTE_SETTLE_TOLERANCE
	);
	expect(layoutRectContainsPoint(layout.rooms[spec.roomKey], handoff)).toBe(true);
}

function assertGuildHallRecordsAisleHandoffContract(points: readonly Point[], targetPoint: Point) {
	assertGuildHallAisleHandoffContract(points, targetPoint, GUILD_HALL_RECORDS_AISLE_SPEC);
}

function assertGuildHallTerminalDepartureRouteContract(
	points: readonly Point[],
	label: string,
	spec: GuildHallAisleSpec = GUILD_HALL_RECORDS_AISLE_SPEC
) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const wall = guildHallAisleWall(spec);
	const [terminalPoint, departurePoint] = points;
	const safeY = guildHallAisleSafeAboveY(wall, spec.safeAboveInset);
	expect(terminalPoint).toBeDefined();
	expect(departurePoint).toEqual({ x: terminalPoint?.x, y: safeY });
	expect(departurePoint?.y).toBeLessThan(terminalPoint?.y ?? safeY);
	// The first leg departs directly from a terminal checkpoint, so prove the
	// actual segment is clear before applying the full envelope to transit.
	for (const obstacle of [...layout.walls, ...Object.values(layout.propCollisions)]) {
		expect(
			routeSegmentIntersectsExpandedRect(
				terminalPoint!,
				departurePoint!,
				obstacle,
				PLAYER_COLLISION_RADIUS
			),
			`${label} terminal departure crossed ${JSON.stringify(obstacle)}: ${JSON.stringify({ terminalPoint, departurePoint })}`
		).toBe(false);
	}
	for (let index = 2; index < points.length; index += 1) {
		const from = points[index - 1]!;
		const to = points[index]!;
		expect(
			routeSegmentIntersectsExpandedRectAtReachEnvelope(from, to, wall, PLAYER_COLLISION_RADIUS),
			`${label} crossed ${wall.id} within the ±${AXIS_REACH_TOLERANCE} endpoint envelope: ${JSON.stringify({ from, to })}`
		).toBe(false);
	}
}

function assertGuildHallRecordsRoomHandoffContract(points: readonly Point[]) {
	assertGuildHallTerminalDepartureRouteContract(
		points,
		'records-hall-room',
		GUILD_HALL_RECORDS_AISLE_SPEC
	);
}

function assertGuildHallTerminalCheckpointContract(point: Point, authoredCheckpoint: Point) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	expect(Math.abs(point.x - authoredCheckpoint.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(point.y - authoredCheckpoint.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	for (const obstacle of [...layout.walls, ...Object.values(layout.propCollisions)]) {
		expect(
			expandedLayoutRectContainsPoint(obstacle, point, PLAYER_COLLISION_RADIUS),
			`terminal checkpoint entered ${JSON.stringify(obstacle)}: ${JSON.stringify({ point, authoredCheckpoint })}`
		).toBe(false);
	}
}

function assertGuildHallTerminalDiagnosticProgress(
	diagnostic: PlayerMovementDiagnostic,
	axis: Axis,
	checkpoint: Point
): void {
	expect(diagnostic.mapId).toBe('guild-hall');
	expect(diagnostic.blocked).toBe(false);
	const targetValue = checkpoint[axis];
	const previousValue = diagnostic.previousPosition[axis];
	const resolvedValue = diagnostic.resolvedPosition[axis];
	const direction = Math.sign(targetValue - previousValue);
	expect(direction).not.toBe(0);
	expect(Math.sign(resolvedValue - previousValue)).toBe(direction);
	const distanceDecreased =
		Math.abs(targetValue - resolvedValue) < Math.abs(targetValue - previousValue);
	const crossedTarget = direction > 0 ? resolvedValue >= targetValue : resolvedValue <= targetValue;
	// A real frame can cross an authored coordinate by more than the final reach
	// band. The unchanged route runner owns the bounded correction; this diagnostic
	// only needs to make directional progress or cross toward the target. The final
	// terminal assertion below remains responsible for the unchanged ±18 band.
	expect(distanceDecreased || crossedTarget).toBe(true);
}

async function convergeGuildHallTerminalCheckpointWithTrustedKeyboard(
	page: Page,
	startPoint: Point,
	checkpoint: Point
): Promise<Point> {
	const wall = guildHallAisleWall(GUILD_HALL_RECORDS_AISLE_SPEC);
	const horizontalDistance = Math.abs(checkpoint.x - startPoint.x);
	const verticalDistance = Math.abs(checkpoint.y - startPoint.y);
	const expectedAxes: Axis[] = [];
	if (horizontalDistance > AXIS_SETTLE_TOLERANCE) expectedAxes.push('x');
	if (verticalDistance > AXIS_SETTLE_TOLERANCE) expectedAxes.push('y');
	const result = await runBrowserRoute(page, [startPoint, checkpoint], AXIS_SETTLE_TOLERANCE);
	const actualPoint = result.position;
	const diagnostics = result.diagnostics ?? [];
	const diagnosticAxes = result.diagnosticAxes ?? [];
	const axisHistory = result.axisHistory ?? [];
	const movementCount = result.movementCount ?? 0;
	const movementOccurred =
		movementCount > 0 ||
		diagnostics.length > 0 ||
		diagnosticAxes.length > 0 ||
		axisHistory.length > 0;
	expect(result.status).toBe('done');
	expect(result.mapId).toBe('guild-hall');
	expect(result.activeKey).toBeNull();
	expect(actualPoint).not.toBeNull();
	if (!actualPoint) {
		throw new Error(
			`Guild Hall terminal checkpoint convergence returned incomplete route evidence: ${JSON.stringify(
				{
					startPoint,
					checkpoint,
					result: describeBrowserRouteResult(result, result.token)
				}
			)}`
		);
	}
	// Both branches must end at a live, collision-free point in the unchanged
	// authored checkpoint band. A route whose start is already within the
	// existing settle tolerance legitimately needs no input or movement event.
	assertGuildHallTerminalCheckpointContract(actualPoint, checkpoint);
	expect(result.pointIndex).toBe(2);
	expect(result.axis).toBeNull();
	expect(result.target).toBeNull();
	expect(axisHistory).toEqual(expectedAxes);
	expect(diagnostics.length).toBe(movementCount);
	expect(diagnosticAxes).toHaveLength(diagnostics.length);
	if (!movementOccurred) {
		// Characterized zero-input branch: route completion itself is the evidence;
		// no diagnostic, axis history, or movement count is required.
		expect(expectedAxes).toEqual([]);
		expect(result.lastDiagnostic).toBeNull();
		expect(diagnostics).toEqual([]);
		expect(diagnosticAxes).toEqual([]);
		expect(movementCount).toBe(0);
	} else {
		const diagnostic = result.lastDiagnostic;
		expect(expectedAxes.length).toBeGreaterThan(0);
		expect(diagnostic).not.toBeNull();
		expect(diagnostic?.blocked).toBe(false);
		expect(diagnostic?.mapId).toBe('guild-hall');
		expect(diagnostics.length).toBeGreaterThan(0);
		for (const [index, routeDiagnostic] of diagnostics.entries()) {
			const axis = diagnosticAxes[index]!;
			expect(expectedAxes).toContain(axis);
			assertGuildHallTerminalDiagnosticProgress(routeDiagnostic, axis, checkpoint);
		}
	}
	expect(
		routeSegmentIntersectsExpandedRect(startPoint, actualPoint, wall, PLAYER_COLLISION_RADIUS)
	).toBe(false);
	return actualPoint;
}

function assertGuildHallCommonHallRoomHandoffContract(
	points: readonly Point[],
	targetPoint: Point
) {
	assertGuildHallTerminalDepartureRouteContract(
		points,
		'common-hall-room',
		GUILD_HALL_COMMON_AISLE_SPEC
	);
	expect(points.at(-1)).toEqual(
		guildHallAisleHandoffPoint(targetPoint, GUILD_HALL_COMMON_AISLE_SPEC)
	);
}

function assertGuildHallQuartermasterSemanticStagingContract(stagingPoint: Point) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const counter = layout.propCollisions.quartermasterCounter;
	const npc = layout.npcApproaches.quartermaster.npc;
	const trainingQuartermasterDivider = layout.walls.find(
		({ id }) => id === 'guild-hall-training-quartermaster-divider'
	);
	if (!trainingQuartermasterDivider) {
		throw new Error('Guild Hall training-quartermaster divider source is missing');
	}
	const interactionRadius = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const rightClearanceX =
		counter.x + counter.width + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE + 1;
	const expectedStagingY = counter.y - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1;

	expect(stagingPoint).toEqual({ x: rightClearanceX, y: expectedStagingY });
	for (let offsetX = -AXIS_REACH_TOLERANCE; offsetX <= AXIS_REACH_TOLERANCE; offsetX += 1) {
		for (let offsetY = -AXIS_REACH_TOLERANCE; offsetY <= AXIS_REACH_TOLERANCE; offsetY += 1) {
			const settledPoint = {
				x: stagingPoint.x + offsetX,
				y: stagingPoint.y + offsetY
			};
			expect(settledPoint.x).toBeGreaterThan(counter.x + counter.width + PLAYER_COLLISION_RADIUS);
			expect(settledPoint.y).toBeLessThan(counter.y - PLAYER_COLLISION_RADIUS);
			expect(settledPoint.y).toBeGreaterThan(
				trainingQuartermasterDivider.y +
					trainingQuartermasterDivider.height +
					PLAYER_COLLISION_RADIUS
			);
			expect(expandedLayoutRectContainsPoint(counter, settledPoint, PLAYER_COLLISION_RADIUS)).toBe(
				false
			);
			expect(
				expandedLayoutRectContainsPoint(
					trainingQuartermasterDivider,
					settledPoint,
					PLAYER_COLLISION_RADIUS
				)
			).toBe(false);
			expect((settledPoint.x - npc.x) ** 2 + (settledPoint.y - npc.y) ** 2).toBeGreaterThan(
				npcCollisionRadius ** 2
			);
		}
	}

	for (let offsetY = -AXIS_REACH_TOLERANCE; offsetY <= AXIS_REACH_TOLERANCE; offsetY += 1) {
		const settledY = stagingPoint.y + offsetY;
		const settledPoint = { x: stagingPoint.x, y: settledY };
		const verticalDistance = Math.abs(settledY - npc.y);
		const interactionEntryX =
			npc.x + Math.floor(Math.sqrt(interactionRadius ** 2 - verticalDistance ** 2));
		const interactionEntry = { x: interactionEntryX, y: settledY };
		const collisionEntryX =
			verticalDistance < npcCollisionRadius
				? npc.x + Math.floor(Math.sqrt(npcCollisionRadius ** 2 - verticalDistance ** 2))
				: npc.x;
		const interactionEntryDistanceSquared =
			(interactionEntry.x - npc.x) ** 2 + (interactionEntry.y - npc.y) ** 2;

		// Moving left from the right clearance enters the live interaction radius
		// before it can reach the NPC collision circle or the counter.
		expect(interactionEntryX).toBeGreaterThan(collisionEntryX);
		expect(interactionEntryDistanceSquared).toBeLessThanOrEqual(interactionRadius ** 2);
		expect(interactionEntryDistanceSquared).toBeGreaterThan(npcCollisionRadius ** 2);
		expect(
			routeSegmentIntersectsExpandedRect(
				settledPoint,
				interactionEntry,
				counter,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsCircle(settledPoint, interactionEntry, npc, npcCollisionRadius)
		).toBe(false);
	}
}

function assertGuildHallQuartermasterSemanticHorizontalRouteContract(
	points: readonly Point[],
	result: BrowserRouteResult
) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const counter = layout.propCollisions.quartermasterCounter;
	const npc = layout.npcApproaches.quartermaster.npc;
	const trainingQuartermasterDivider = layout.walls.find(
		({ id }) => id === 'guild-hall-training-quartermaster-divider'
	);
	if (!trainingQuartermasterDivider) {
		throw new Error('Guild Hall training-quartermaster divider source is missing');
	}
	const from = points[0]!;
	const target = points.at(-1)!;
	const rightClearanceX =
		counter.x + counter.width + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE + 1;
	const expandedCounterBottom = counter.y + counter.height + PLAYER_COLLISION_RADIUS;
	const diagnostics = result.diagnostics ?? [];
	const diagnosticAxes = result.diagnosticAxes ?? [];

	expect(points).toHaveLength(2);
	expect(target).toEqual({ x: rightClearanceX, y: from.y });
	expect(from.y).toBeGreaterThan(expandedCounterBottom);
	expect(result.status).toBe('done');
	expect(result.mapId).toBe('guild-hall');
	expect(result.activeKey).toBeNull();
	expect(result.position).not.toBeNull();
	expect(diagnosticAxes).toHaveLength(diagnostics.length);
	for (const [index, diagnostic] of diagnostics.entries()) {
		expect(diagnosticAxes[index]).toBe('x');
		expect(diagnostic.mapId).toBe('guild-hall');
		expect(diagnostic.blocked).toBe(false);
		expect(diagnostic.previousPosition.y).toBe(from.y);
		expect(diagnostic.requestedPosition.y).toBe(from.y);
		expect(diagnostic.resolvedPosition.y).toBe(from.y);
		expect(
			expandedLayoutRectContainsPoint(counter, diagnostic.resolvedPosition, PLAYER_COLLISION_RADIUS)
		).toBe(false);
		expect(
			routeSegmentIntersectsExpandedRect(
				diagnostic.previousPosition,
				diagnostic.requestedPosition,
				counter,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
	}
	expect(routeSegmentIntersectsExpandedRect(from, target, counter, PLAYER_COLLISION_RADIUS)).toBe(
		false
	);
	expect(
		endpointXEnvelopeIsDisjointFromExpandedRect(target, counter, PLAYER_COLLISION_RADIUS)
	).toBe(true);
	expect(
		routeSegmentIntersectsExpandedRect(
			from,
			target,
			trainingQuartermasterDivider,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(false);
	expect(
		routeSegmentIntersectsCircle(
			from,
			target,
			npc,
			PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS
		)
	).toBe(false);
	expect(result.position).not.toBeNull();
	if (!result.position) return;
	expect(result.position.y).toBe(from.y);
	expect(Math.abs(result.position.x - rightClearanceX)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(expandedLayoutRectContainsPoint(counter, result.position, PLAYER_COLLISION_RADIUS)).toBe(
		false
	);
}

function assertGuildHallQuartermasterSemanticVerticalRouteContract(
	points: readonly Point[],
	result: BrowserRouteResult,
	targetPoint: Point
) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const counter = layout.propCollisions.quartermasterCounter;
	const npc = layout.npcApproaches.quartermaster.npc;
	const trainingQuartermasterDivider = layout.walls.find(
		({ id }) => id === 'guild-hall-training-quartermaster-divider'
	);
	const quartermasterSpineSouth = layout.walls.find(
		({ id }) => id === 'guild-hall-quartermaster-spine-south'
	);
	if (!trainingQuartermasterDivider || !quartermasterSpineSouth) {
		throw new Error('Guild Hall Quartermaster vertical source geometry is missing');
	}
	const from = points[0]!;
	const target = points.at(-1)!;
	const stagingPoint = guildHallQuartermasterInteractionStagingPoint();
	const expandedCounterRight = counter.x + counter.width + PLAYER_COLLISION_RADIUS;
	const diagnostics = result.diagnostics ?? [];
	const diagnosticAxes = result.diagnosticAxes ?? [];

	expect(points).toHaveLength(2);
	expect(targetPoint).toEqual(stagingPoint);
	expect(target).toEqual({ x: from.x, y: stagingPoint.y });
	expect(from.x).toBeGreaterThan(expandedCounterRight);
	expect(Math.abs(from.x - stagingPoint.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(result.status).toBe('done');
	expect(result.mapId).toBe('guild-hall');
	expect(result.activeKey).toBeNull();
	expect(result.position).not.toBeNull();
	expect(diagnosticAxes).toHaveLength(diagnostics.length);
	for (const [index, diagnostic] of diagnostics.entries()) {
		expect(diagnosticAxes[index]).toBe('y');
		expect(diagnostic.mapId).toBe('guild-hall');
		expect(diagnostic.blocked).toBe(false);
		expect(diagnostic.previousPosition.x).toBe(from.x);
		expect(diagnostic.requestedPosition.x).toBe(from.x);
		expect(diagnostic.resolvedPosition.x).toBe(from.x);
		for (const obstacle of [counter, trainingQuartermasterDivider, quartermasterSpineSouth]) {
			expect(
				expandedLayoutRectContainsPoint(
					obstacle,
					diagnostic.resolvedPosition,
					PLAYER_COLLISION_RADIUS
				)
			).toBe(false);
			expect(
				routeSegmentIntersectsExpandedRect(
					diagnostic.previousPosition,
					diagnostic.requestedPosition,
					obstacle,
					PLAYER_COLLISION_RADIUS
				)
			).toBe(false);
		}
		expect(
			routeSegmentIntersectsCircle(
				diagnostic.previousPosition,
				diagnostic.requestedPosition,
				npc,
				PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS
			)
		).toBe(false);
	}
	for (const obstacle of [counter, trainingQuartermasterDivider, quartermasterSpineSouth]) {
		expect(
			routeSegmentIntersectsExpandedRect(from, target, obstacle, PLAYER_COLLISION_RADIUS)
		).toBe(false);
	}
	expect(
		routeSegmentIntersectsCircle(
			from,
			target,
			npc,
			PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS
		)
	).toBe(false);
	if (!result.position) return;
	expect(result.position.x).toBe(from.x);
	expect(Math.abs(result.position.y - stagingPoint.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(expandedLayoutRectContainsPoint(counter, result.position, PLAYER_COLLISION_RADIUS)).toBe(
		false
	);
}

function assertGuildHallQuartermasterCorridorContract(
	points: readonly Point[],
	targetPoint: Point,
	returning: boolean,
	semanticApproach = false
) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const counter = layout.propCollisions.quartermasterCounter;
	const npc = layout.npcApproaches.quartermaster.npc;
	const trainingQuartermasterDivider = layout.walls.find(
		({ id }) => id === 'guild-hall-training-quartermaster-divider'
	);
	const quartermasterSpineSouth = layout.walls.find(
		({ id }) => id === 'guild-hall-quartermaster-spine-south'
	);
	if (!trainingQuartermasterDivider) {
		throw new Error('Guild Hall training-quartermaster divider source is missing');
	}
	if (!quartermasterSpineSouth) {
		throw new Error('Guild Hall quartermaster spine south source is missing');
	}
	const rightClearanceX =
		counter.x + counter.width + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE + 1;
	const belowCounterY =
		counter.y + counter.height + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE + 1;
	expect(belowCounterY - AXIS_REACH_TOLERANCE).toBeGreaterThan(
		counter.y + counter.height + PLAYER_COLLISION_RADIUS
	);
	expect(rightClearanceX - AXIS_REACH_TOLERANCE).toBeGreaterThan(
		counter.x + counter.width + PLAYER_COLLISION_RADIUS
	);

	if (semanticApproach) {
		expect(points.at(-1)?.x).toBe(guildHallQuartermasterDoorwayRightClearanceX());
		expect(points.at(-1)?.y).toBe(guildHallQuartermasterDoorwayTransitY());
	} else {
		expect(points.at(-1)).toEqual(targetPoint);
	}
	if (returning) {
		const doorwayTransitY = guildHallQuartermasterDoorwayTransitY();
		const doorwayRightClearanceX = guildHallQuartermasterDoorwayRightClearanceX();
		const quartermasterToSpine = layout.doors.quartermasterToSpine;
		expect(points).toHaveLength(7);
		expect(points[1]?.x).toBe(rightClearanceX);
		expect(points[1]?.y).toBe(points[0]?.y);
		expect(points[2]?.x).toBe(rightClearanceX);
		expect(points[2]?.y).toBe(belowCounterY);
		expect(points[3]?.x).toBe(doorwayRightClearanceX);
		expect(points[3]?.y).toBe(belowCounterY);
		expect(points[4]?.x).toBe(doorwayRightClearanceX);
		expect(points[4]?.y).toBe(doorwayTransitY);
		expect(points[5]?.x).toBe(targetPoint.x);
		expect(points[5]?.y).toBe(doorwayTransitY);
		const trainingQuartermasterDivider = layout.walls.find(
			({ id }) => id === 'guild-hall-training-quartermaster-divider'
		);
		if (!trainingQuartermasterDivider) {
			throw new Error('Guild Hall training-quartermaster divider source is missing');
		}
		const expandedDividerBottom =
			trainingQuartermasterDivider.y +
			trainingQuartermasterDivider.height +
			PLAYER_COLLISION_RADIUS;
		const expandedCounterTop = counter.y - PLAYER_COLLISION_RADIUS;
		expect(points[0]!.y).toBeGreaterThan(expandedDividerBottom);
		expect(points[0]!.y).toBeLessThan(expandedCounterTop);
		expect(points[1]!.x - AXIS_REACH_TOLERANCE).toBeGreaterThan(
			counter.x + counter.width + PLAYER_COLLISION_RADIUS
		);
		expect(points[2]!.y - AXIS_REACH_TOLERANCE).toBeGreaterThan(
			counter.y + counter.height + PLAYER_COLLISION_RADIUS
		);
		// The first leg leaves the live post-dialogue NPC circle on its actual row;
		// only the following fixed-x leg descends through the counter-side aisle.
		expect(
			routeSegmentIntersectsExpandedRect(points[0]!, points[1]!, counter, PLAYER_COLLISION_RADIUS)
		).toBe(false);
		expect(
			routeSegmentIntersectsExpandedRect(
				points[0]!,
				points[1]!,
				trainingQuartermasterDivider,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsCircle(
				points[0]!,
				points[1]!,
				npc,
				PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsExpandedRect(points[1]!, points[2]!, counter, PLAYER_COLLISION_RADIUS)
		).toBe(false);
		expect(
			routeSegmentIntersectsExpandedRect(
				points[1]!,
				points[2]!,
				trainingQuartermasterDivider,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsCircle(
				points[1]!,
				points[2]!,
				npc,
				PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			layoutRectContainsPoint(layout.rooms.quartermasterRoom, {
				x: points[1]!.x,
				y: points[1]!.y
			})
		).toBe(true);
		expect(
			layoutRectContainsPoint(layout.corridors.mainSpine, {
				x: targetPoint.x,
				y: doorwayTransitY
			})
		).toBe(true);
		expect(
			layoutRectContainsPoint(quartermasterToSpine, {
				x: quartermasterToSpine.x + quartermasterToSpine.width / 2,
				y: doorwayTransitY
			})
		).toBe(true);
		// The entire possible endpoint envelope stays above the expanded south
		// spine wall, including the horizontal doorway crossing.
		for (let offsetX = -AXIS_REACH_TOLERANCE; offsetX <= AXIS_REACH_TOLERANCE; offsetX += 1) {
			for (let offsetY = -AXIS_REACH_TOLERANCE; offsetY <= AXIS_REACH_TOLERANCE; offsetY += 1) {
				for (const x of [rightClearanceX, targetPoint.x]) {
					expect(
						expandedLayoutRectContainsPoint(
							quartermasterSpineSouth,
							{ x: x + offsetX, y: doorwayTransitY + offsetY },
							PLAYER_COLLISION_RADIUS
						)
					).toBe(false);
				}
			}
		}
		for (let offsetY = -AXIS_REACH_TOLERANCE; offsetY <= AXIS_REACH_TOLERANCE; offsetY += 1) {
			expect(
				routeSegmentIntersectsExpandedRect(
					{ x: rightClearanceX, y: doorwayTransitY + offsetY },
					{ x: targetPoint.x, y: doorwayTransitY + offsetY },
					quartermasterSpineSouth,
					PLAYER_COLLISION_RADIUS
				)
			).toBe(false);
		}
		expect(layoutRectContainsPoint(layout.corridors.mainSpine, targetPoint)).toBe(true);
	} else if (semanticApproach) {
		const stagingPoint = guildHallQuartermasterInteractionStagingPoint();
		const doorwayTransitY = guildHallQuartermasterDoorwayTransitY();
		const doorwayRightClearanceX = guildHallQuartermasterDoorwayRightClearanceX();
		expect(targetPoint).toEqual(stagingPoint);
		expect(points).toHaveLength(3);
		expect(points[1]?.x).toBe(points[0]?.x);
		expect(points[1]?.y).toBe(doorwayTransitY);
		expect(points[2]?.x).toBe(doorwayRightClearanceX);
		expect(points[2]?.y).toBe(doorwayTransitY);
		expect(layoutRectContainsPoint(layout.rooms.quartermasterRoom, stagingPoint)).toBe(true);
		assertGuildHallQuartermasterSemanticStagingContract(stagingPoint);
	} else {
		const stagedApproach = guildHallQuartermasterSelectedStagedApproach();
		expect(targetPoint).toEqual({ x: stagedApproach.x, y: stagedApproach.targetY });
		expect(points[1]?.x).toBe(points[0]?.x);
		expect(points[1]?.y).toBe(belowCounterY);
		expect(points[2]?.x).toBe(rightClearanceX);
		expect(points[2]?.y).toBe(belowCounterY);
		expect(points[3]?.x).toBe(rightClearanceX);
		expect(points[3]?.y).toBe(stagedApproach.stagingY);
		expect(points[4]?.x).toBe(targetPoint.x);
		expect(points[4]?.y).toBe(stagedApproach.stagingY);
		expect(layoutRectContainsPoint(layout.rooms.quartermasterRoom, targetPoint)).toBe(true);
		expect(points.some((point) => point.y === targetPoint.y)).toBe(true);
		expect(
			layoutRectContainsPoint(layout.rooms.quartermasterRoom, {
				x: rightClearanceX,
				y: stagedApproach.stagingY
			})
		).toBe(true);
		expect(
			layoutRectContainsPoint(layout.corridors.mainSpine, {
				x: points[1]?.x ?? Number.NaN,
				y: belowCounterY
			})
		).toBe(true);
		expect(
			guildHallQuartermasterFinalVerticalCorrectionIsSafe(
				stagedApproach.x,
				stagedApproach.stagingY,
				stagedApproach.targetY
			)
		).toBe(true);
	}

	for (let index = 1; index < points.length; index += 1) {
		expect(
			routeSegmentIntersectsExpandedRect(
				points[index - 1]!,
				points[index]!,
				counter,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsCircle(
				points[index - 1]!,
				points[index]!,
				npc,
				PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsExpandedRect(
				points[index - 1]!,
				points[index]!,
				trainingQuartermasterDivider,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		if (returning) {
			expect(
				routeSegmentIntersectsExpandedRect(
					points[index - 1]!,
					points[index]!,
					quartermasterSpineSouth,
					PLAYER_COLLISION_RADIUS
				)
			).toBe(false);
		}
	}
}

function assertInteriorNpcCheckpointContract(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep,
	checkpoint: Point
) {
	const interactionRadius = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;

	if (interior.mapId === 'guild-hall' && step.interaction?.speaker === 'Guild Master Arlen') {
		const guildHallLayout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
		const guildMasterApproach = guildHallLayout.npcApproaches.guildMaster.approach;
		const guildMasterNpc = guildHallLayout.npcApproaches.guildMaster.npc;
		const guildMasterDesk = guildHallLayout.propCollisions.guildMasterDesk;
		const expandedDeskBottom = guildMasterDesk.y + guildMasterDesk.height + PLAYER_COLLISION_RADIUS;
		const minimumSafeTargetY = expandedDeskBottom + NPC_APPROACH_SETTLE_TOLERANCE + 1;
		const maximumSafeTargetY = Math.floor(
			guildMasterNpc.y +
				Math.sqrt(interactionRadius ** 2 - NPC_APPROACH_SETTLE_TOLERANCE ** 2) -
				NPC_APPROACH_SETTLE_TOLERANCE
		);
		const settleOffsets = [-NPC_APPROACH_SETTLE_TOLERANCE, NPC_APPROACH_SETTLE_TOLERANCE];

		expect(step.point).toEqual(guildMasterApproach);
		expect({ minimumSafeTargetY, maximumSafeTargetY }).toEqual({
			minimumSafeTargetY: 185,
			maximumSafeTargetY: 187
		});
		expect(checkpoint).toEqual({ x: guildMasterApproach.x, y: 186 });
		for (let targetY = minimumSafeTargetY; targetY <= maximumSafeTargetY; targetY += 1) {
			for (const offsetX of settleOffsets) {
				for (const offsetY of settleOffsets) {
					const settledPoint = {
						x: guildMasterApproach.x + offsetX,
						y: targetY + offsetY
					};
					expect(
						expandedLayoutRectContainsPoint(guildMasterDesk, settledPoint, PLAYER_COLLISION_RADIUS)
					).toBe(false);
					expect(
						Math.hypot(settledPoint.x - guildMasterNpc.x, settledPoint.y - guildMasterNpc.y)
					).toBeGreaterThan(PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS);
					expect(
						Math.hypot(settledPoint.x - guildMasterNpc.x, settledPoint.y - guildMasterNpc.y)
					).toBeLessThanOrEqual(interactionRadius);
				}
			}
		}
		return;
	}

	if (interior.mapId === 'guild-hall' && step.interaction?.speaker === 'Quartermaster Vale') {
		const guildHallLayout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
		const quartermasterCounter = guildHallLayout.propCollisions.quartermasterCounter;
		const quartermasterApproach = guildHallLayout.npcApproaches.quartermaster.approach;
		const quartermasterNpc = guildHallLayout.npcApproaches.quartermaster.npc;
		const settleOffsets = [-NPC_APPROACH_SETTLE_TOLERANCE, NPC_APPROACH_SETTLE_TOLERANCE];
		const interactionRadius = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;
		const trainingQuartermasterDivider = guildHallLayout.walls.find(
			({ id }) => id === 'guild-hall-training-quartermaster-divider'
		);
		if (!trainingQuartermasterDivider) {
			throw new Error('Guild Hall training-quartermaster divider source is missing');
		}
		const stableApproach = guildHallQuartermasterStagedApproachRows();
		const selectedStagedApproach = guildHallQuartermasterSelectedStagedApproach();

		expect(step.point).toEqual(quartermasterApproach);
		expect({
			minimumStableY: stableApproach.minimumStableY,
			maximumStableY: stableApproach.maximumStableY,
			minimumFinalTravel: stableApproach.minimumFinalTravel,
			rowCount: stableApproach.rows.length,
			candidateCount: stableApproach.candidates.length,
			firstRow: stableApproach.rows[0],
			middleRow: stableApproach.rows[Math.floor(stableApproach.rows.length / 2)],
			lastRow: stableApproach.rows.at(-1)
		}).toEqual({
			minimumStableY: 497,
			maximumStableY: 527,
			minimumFinalTravel: 5,
			rowCount: 78,
			candidateCount: 741,
			firstRow: { stagingY: 516, targetY: 511, bands: [{ min: 846, max: 855 }] },
			middleRow: { stagingY: 524, targetY: 514, bands: [{ min: 848, max: 856 }] },
			lastRow: { stagingY: 527, targetY: 522, bands: [{ min: 849, max: 858 }] }
		});
		expect(checkpoint).toEqual({ x: 849, y: 522 });
		expect(checkpoint).toEqual({
			x: selectedStagedApproach.x,
			y: selectedStagedApproach.targetY
		});
		expect(selectedStagedApproach).toEqual({ stagingY: 527, targetY: 522, x: 849 });
		expect(layoutRectContainsPoint(guildHallLayout.rooms.quartermasterRoom, checkpoint)).toBe(true);
		const stagingPoint = { x: selectedStagedApproach.x, y: selectedStagedApproach.stagingY };
		expect(layoutRectContainsPoint(guildHallLayout.rooms.quartermasterRoom, stagingPoint)).toBe(
			true
		);
		expect(
			guildHallQuartermasterHorizontalCorrectionIsSafe(
				selectedStagedApproach.x,
				selectedStagedApproach.stagingY
			)
		).toBe(true);
		expect(
			guildHallQuartermasterFinalVerticalCorrectionIsSafe(
				selectedStagedApproach.x,
				selectedStagedApproach.stagingY,
				selectedStagedApproach.targetY
			)
		).toBe(true);
		expect(
			expandedLayoutRectContainsPoint(quartermasterCounter, stagingPoint, PLAYER_COLLISION_RADIUS)
		).toBe(false);
		expect(
			expandedLayoutRectContainsPoint(
				trainingQuartermasterDivider,
				stagingPoint,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			Math.hypot(stagingPoint.x - quartermasterNpc.x, stagingPoint.y - quartermasterNpc.y)
		).toBeGreaterThan(PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS);
		for (const offsetX of settleOffsets) {
			for (const offsetY of settleOffsets) {
				const settledPoint = {
					x: checkpoint.x + offsetX,
					y: checkpoint.y + offsetY
				};
				const distance = Math.hypot(
					settledPoint.x - quartermasterNpc.x,
					settledPoint.y - quartermasterNpc.y
				);
				expect(
					expandedLayoutRectContainsPoint(
						quartermasterCounter,
						settledPoint,
						PLAYER_COLLISION_RADIUS
					)
				).toBe(false);
				expect(
					expandedLayoutRectContainsPoint(
						trainingQuartermasterDivider,
						settledPoint,
						PLAYER_COLLISION_RADIUS
					)
				).toBe(false);
				expect(distance).toBeGreaterThan(PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS);
				expect(distance).toBeLessThanOrEqual(interactionRadius);
			}
		}
		return;
	}

	if (interior.mapId === 'item-shop' && step.interaction?.speaker === 'Mira') {
		const itemShopLayout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
		const miraApproach = itemShopLayout.npcApproaches.mira.approach;
		const miraNpc = itemShopLayout.npcApproaches.mira.npc;
		const miraCounter = itemShopLayout.propCollisions.miraCounter;
		const expandedCounterBottom = miraCounter.y + miraCounter.height + PLAYER_COLLISION_RADIUS;
		const minimumSafeTargetY = expandedCounterBottom + NPC_APPROACH_SETTLE_TOLERANCE + 1;
		const maximumSafeTargetY = Math.floor(
			miraNpc.y +
				Math.sqrt(interactionRadius ** 2 - NPC_APPROACH_SETTLE_TOLERANCE ** 2) -
				NPC_APPROACH_SETTLE_TOLERANCE
		);
		const settleOffsets = [-NPC_APPROACH_SETTLE_TOLERANCE, NPC_APPROACH_SETTLE_TOLERANCE];

		expect({ minimumSafeTargetY, maximumSafeTargetY }).toEqual({
			minimumSafeTargetY: 361,
			maximumSafeTargetY: 363
		});
		expect(checkpoint).toEqual({ x: miraApproach.x, y: miraApproach.y + 2 });
		expect(checkpoint.y).toBe(Math.floor((minimumSafeTargetY + maximumSafeTargetY) / 2));
		for (let targetY = minimumSafeTargetY; targetY <= maximumSafeTargetY; targetY += 1) {
			for (const offsetX of settleOffsets) {
				for (const offsetY of settleOffsets) {
					const settledPoint = {
						x: miraApproach.x + offsetX,
						y: targetY + offsetY
					};
					expect(
						expandedLayoutRectContainsPoint(miraCounter, settledPoint, PLAYER_COLLISION_RADIUS)
					).toBe(false);
					expect(
						Math.hypot(settledPoint.x - miraNpc.x, settledPoint.y - miraNpc.y)
					).toBeLessThanOrEqual(interactionRadius);
				}
			}
		}
	}
}

function itemShopDoorwayTransitY(
	northWallId: 'item-shop-stockroom-divider-north' | 'item-shop-office-divider-north',
	southWallId: 'item-shop-stockroom-divider-south' | 'item-shop-office-divider-south',
	doorId: 'stockroom' | 'office'
): number {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const northWall = layout.walls.find(({ id }) => id === northWallId);
	const southWall = layout.walls.find(({ id }) => id === southWallId);
	const door = layout.doors[doorId];
	if (!northWall || !southWall) {
		throw new Error(`Item Shop ${doorId} divider source is missing`);
	}
	const minimumSafeY =
		northWall.y + northWall.height + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE + 1;
	const maximumSafeY = southWall.y - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1;
	const transitY = Math.floor((minimumSafeY + maximumSafeY) / 2);
	expect({ minimumSafeY, maximumSafeY, transitY }).toEqual({
		minimumSafeY: 143,
		maximumSafeY: 145,
		transitY: 144
	});
	expect(layoutRectContainsPoint(door, { x: door.x + door.width / 2, y: transitY })).toBe(true);
	for (let offset = -AXIS_REACH_TOLERANCE; offset <= AXIS_REACH_TOLERANCE; offset += 1) {
		expect(transitY + offset).toBeGreaterThan(
			northWall.y + northWall.height + PLAYER_COLLISION_RADIUS
		);
		expect(transitY + offset).toBeLessThan(southWall.y - PLAYER_COLLISION_RADIUS);
	}
	return transitY;
}

function itemShopDoorwayOpenBand(doorway: 'stockroom' | 'office') {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const northWall = layout.walls.find(({ id }) => id === `item-shop-${doorway}-divider-north`);
	const southWall = layout.walls.find(({ id }) => id === `item-shop-${doorway}-divider-south`);
	const door = layout.doors[doorway];
	if (!northWall || !southWall || !door) {
		throw new Error(`Item Shop ${doorway} doorway source is missing`);
	}
	const minimumOpenY = northWall.y + northWall.height + PLAYER_COLLISION_RADIUS;
	const maximumOpenY = southWall.y - PLAYER_COLLISION_RADIUS;
	const authoredOpenBandHeight = maximumOpenY - minimumOpenY;
	// The source doors are 64px high. After the unchanged player radius is
	// expanded around the two 48px divider walls, the actual player-center band
	// remains 40px wide; no route reach residue is applied to its orthogonal y.
	expect({ minimumOpenY, maximumOpenY, authoredOpenBandHeight }).toEqual({
		minimumOpenY: 124,
		maximumOpenY: 164,
		authoredOpenBandHeight: 40
	});
	expect(minimumOpenY).toBeGreaterThanOrEqual(door.y);
	expect(maximumOpenY).toBeLessThanOrEqual(door.y + door.height);
	return {
		northWall,
		southWall,
		door,
		minimumOpenY,
		maximumOpenY
	};
}

function itemShopStockroomVerticalSafeX(): number {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const dividers = layout.walls.filter(({ id }) =>
		['item-shop-stockroom-divider-north', 'item-shop-stockroom-divider-south'].includes(id)
	);
	if (dividers.length !== 2) {
		throw new Error('Item Shop stockroom divider sources are incomplete');
	}
	const expandedLeft = Math.min(...dividers.map(({ x }) => x)) - PLAYER_COLLISION_RADIUS;
	const safeX = expandedLeft - AXIS_REACH_TOLERANCE - 1;
	// Enter the stockroom before the vertical convergence. This source-derived
	// x keeps the entire unchanged ±18 vertical endpoint envelope west of both
	// expanded divider rectangles.
	expect({ expandedLeft, safeX }).toEqual({ expandedLeft: 308, safeX: 289 });
	for (const divider of dividers) {
		expect(safeX + AXIS_REACH_TOLERANCE).toBeLessThan(divider.x - PLAYER_COLLISION_RADIUS);
	}
	expect(layoutRectContainsPoint(layout.rooms.stockroom, { x: safeX, y: 160 })).toBe(true);
	return safeX;
}

function itemShopStockroomEntrySafeXBand(): { minimumX: number; maximumX: number } {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const officeDividerSouth = layout.walls.find(({ id }) => id === 'item-shop-office-divider-south');
	if (!officeDividerSouth) {
		throw new Error('Item Shop office-divider-south source is missing');
	}
	const npc = layout.npcApproaches.mira.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const minimumX = npc.x + npcCollisionRadius + 1;
	const maximumX = officeDividerSouth.x - PLAYER_COLLISION_RADIUS;
	// The vertical handoff passes above Mira and through the service corridor. The
	// lower bound clears Mira's combined collision; the exclusive upper bound keeps
	// the player circle strictly west of the office divider's expanded left edge.
	expect({ minimumX, maximumX }).toEqual({ minimumX: 446, maximumX: 468 });
	expect(minimumX).toBeLessThan(maximumX);
	return { minimumX, maximumX };
}

function assertItemShopStockroomEntryBandContract(
	startPoint: Point,
	result: CaveDoorwayBandResult,
	label: string
): Point {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const npc = layout.npcApproaches.mira.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const { minimumX, maximumX } = itemShopStockroomEntrySafeXBand();
	const obstacles = [...layout.walls, ...Object.values(layout.propCollisions)];

	expect(Number.isFinite(startPoint.x), `${label} start x`).toBe(true);
	expect(Number.isFinite(startPoint.y), `${label} start y`).toBe(true);
	expect(layoutRectContainsPoint(layout.rooms.salesFloor, startPoint), `${label} start room`).toBe(
		true
	);
	for (const obstacle of obstacles) {
		expect(
			expandedLayoutRectContainsPoint(obstacle, startPoint, PLAYER_COLLISION_RADIUS),
			`${label} start entered ${'id' in obstacle ? obstacle.id : 'prop collision'}`
		).toBe(false);
	}
	expect(
		routeSegmentIntersectsCircle(startPoint, startPoint, npc, npcCollisionRadius),
		`${label} start crossed Mira`
	).toBe(false);

	expect(result.status, `${label} status`).toBe('done');
	expect(result.mapId, `${label} map`).toBe('item-shop');
	expect(result.invalidDiagnostics, `${label} invalid diagnostics`).toEqual([]);
	expect(result.activeKeys, `${label} active keys`).toEqual([]);
	expect(result.released, `${label} released`).toBe(true);
	expect(result.position, `${label} final position`).not.toBeNull();
	if (!result.position) throw new Error(`${label}: band handoff returned no final position`);
	expect(result.position.y, `${label} fixed y`).toBe(startPoint.y);
	expect(result.position.x, `${label} final x lower bound`).toBeGreaterThanOrEqual(minimumX);
	expect(result.position.x, `${label} final x upper bound`).toBeLessThan(maximumX);

	const expectedDirection = startPoint.x < minimumX ? 1 : startPoint.x >= maximumX ? -1 : 0;
	const expectedReleasedKey =
		expectedDirection > 0 ? ['ArrowRight'] : expectedDirection < 0 ? ['ArrowLeft'] : [];
	expect(result.releasedKeys, `${label} released keys`).toEqual(expectedReleasedKey);
	const diagnostics = result.diagnostics;
	if (expectedDirection === 0) {
		expect(diagnostics, `${label} in-band diagnostics`).toEqual([]);
		expect(result.lastDiagnostic, `${label} in-band last diagnostic`).toBeNull();
		expect(result.position, `${label} in-band position`).toEqual(startPoint);
		return result.position;
	}

	expect(diagnostics.length, `${label} diagnostic count`).toBeGreaterThan(0);
	let previousResolvedX = startPoint.x;
	for (const [index, diagnostic] of diagnostics.entries()) {
		const diagnosticLabel = `${label} diagnostic ${index}`;
		expect(diagnostic.mapId, `${diagnosticLabel} map`).toBe('item-shop');
		expect(diagnostic.blocked, `${diagnosticLabel} blocked`).toBe(false);
		expect(diagnostic.previousPosition.x, `${diagnosticLabel} previous x continuity`).toBe(
			previousResolvedX
		);
		for (const value of [
			diagnostic.previousPosition.x,
			diagnostic.previousPosition.y,
			diagnostic.requestedPosition.x,
			diagnostic.requestedPosition.y,
			diagnostic.resolvedPosition.x,
			diagnostic.resolvedPosition.y
		]) {
			expect(Number.isFinite(value), `${diagnosticLabel} finite coordinate`).toBe(true);
		}
		expect(diagnostic.previousPosition.y, `${diagnosticLabel} previous y`).toBe(startPoint.y);
		expect(diagnostic.requestedPosition.y, `${diagnosticLabel} requested y`).toBe(startPoint.y);
		expect(diagnostic.resolvedPosition.y, `${diagnosticLabel} resolved y`).toBe(startPoint.y);
		expect(
			(diagnostic.resolvedPosition.x - diagnostic.previousPosition.x) * expectedDirection,
			`${diagnosticLabel} strict x monotonicity`
		).toBeGreaterThan(0);
		expect(
			diagnostic.resolvedPosition.x,
			`${diagnosticLabel} in-band x lower bound`
		).toBeGreaterThanOrEqual(minimumX);
		for (const obstacle of obstacles) {
			expect(
				routeSegmentIntersectsExpandedRect(
					diagnostic.previousPosition,
					diagnostic.resolvedPosition,
					obstacle,
					PLAYER_COLLISION_RADIUS
				),
				`${diagnosticLabel} swept ${'id' in obstacle ? obstacle.id : 'prop collision'}`
			).toBe(false);
			expect(
				expandedLayoutRectContainsPoint(
					obstacle,
					diagnostic.resolvedPosition,
					PLAYER_COLLISION_RADIUS
				),
				`${diagnosticLabel} endpoint ${'id' in obstacle ? obstacle.id : 'prop collision'}`
			).toBe(false);
		}
		expect(
			routeSegmentIntersectsCircle(
				diagnostic.previousPosition,
				diagnostic.resolvedPosition,
				npc,
				npcCollisionRadius
			),
			`${diagnosticLabel} swept Mira`
		).toBe(false);
		previousResolvedX = diagnostic.resolvedPosition.x;
	}
	expect(result.lastDiagnostic, `${label} last diagnostic`).toEqual(diagnostics.at(-1));
	expect(result.position, `${label} diagnostic endpoint`).toEqual(
		diagnostics.at(-1)!.resolvedPosition
	);
	for (const obstacle of obstacles) {
		expect(
			expandedLayoutRectContainsPoint(obstacle, result.position, PLAYER_COLLISION_RADIUS),
			`${label} final ${'id' in obstacle ? obstacle.id : 'prop collision'}`
		).toBe(false);
	}
	expect(
		routeSegmentIntersectsCircle(result.position, result.position, npc, npcCollisionRadius),
		`${label} final Mira clearance`
	).toBe(false);
	return result.position;
}

function itemShopStockroomOfficeDividerSafeX(): number {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const officeDividerSouth = layout.walls.find(({ id }) => id === 'item-shop-office-divider-south');
	if (!officeDividerSouth) {
		throw new Error('Item Shop office-divider-south source is missing');
	}
	const expandedLeft = officeDividerSouth.x - PLAYER_COLLISION_RADIUS;
	const safeX = expandedLeft - AXIS_REACH_TOLERANCE - INTERIOR_ROUTE_SETTLE_TOLERANCE - 1;
	// This source-derived x remains owned by the service-return-west doorway
	// handoff; stockroom-entry uses its live x band above instead of this route
	// correction.
	expect(safeX + AXIS_REACH_TOLERANCE + INTERIOR_ROUTE_SETTLE_TOLERANCE).toBeLessThan(expandedLeft);
	return safeX;
}

function itemShopStockroomEntryRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const npc = layout.npcApproaches.mira.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const { minimumX, maximumX } = itemShopStockroomEntrySafeXBand();
	const transitY = itemShopDoorwayTransitY(
		'item-shop-stockroom-divider-north',
		'item-shop-stockroom-divider-south',
		'stockroom'
	);
	const verticalDestination = { x: currentPoint.x, y: transitY };
	const doorwayDestination = { x: targetPoint.x, y: transitY };
	const points = [currentPoint, verticalDestination, doorwayDestination, targetPoint];

	expect(targetPoint).toEqual({ x: 448, y: 160 });
	expect(currentPoint.x).toBeGreaterThanOrEqual(minimumX);
	expect(currentPoint.x).toBeLessThan(maximumX);
	expect(layoutRectContainsPoint(layout.rooms.salesFloor, currentPoint)).toBe(true);
	expect(layoutRectContainsPoint(layout.corridors.serviceCorridor, verticalDestination)).toBe(true);
	expect(layoutRectContainsPoint(layout.corridors.serviceCorridor, doorwayDestination)).toBe(true);

	const obstacles = [...layout.walls, ...Object.values(layout.propCollisions)];
	for (let index = 1; index < points.length; index += 1) {
		const from = points[index - 1]!;
		const to = points[index]!;
		expect(
			from.x === to.x || from.y === to.y,
			`Item Shop stockroom-entry route must remain axis-aligned: ${JSON.stringify({ from, to })}`
		).toBe(true);
		for (const obstacle of obstacles) {
			expect(
				routeSegmentIntersectsExpandedRect(from, to, obstacle, PLAYER_COLLISION_RADIUS),
				`Item Shop stockroom-entry route crossed ${JSON.stringify(obstacle)}: ${JSON.stringify({ from, to })}`
			).toBe(false);
		}
		expect(
			routeSegmentIntersectsCircle(from, to, npc, npcCollisionRadius),
			`Item Shop stockroom-entry route crossed Mira: ${JSON.stringify({ from, to, npc })}`
		).toBe(false);
	}
	// The first leg is an actual fixed-x transit. Its endpoint envelope is y-only;
	// applying a hypothetical ±18 x residue would reject the source-clear band.
	for (const obstacle of obstacles) {
		expect(
			endpointYEnvelopeIsDisjointFromExpandedRect(
				verticalDestination,
				obstacle,
				PLAYER_COLLISION_RADIUS
			),
			`Item Shop stockroom-entry fixed-x endpoint entered an expanded y envelope: ${JSON.stringify({ verticalDestination, obstacle })}`
		).toBe(true);
	}
	return points;
}

function itemShopStockroomEntryInitialFixedAxisDiagnostics(
	diagnostics: readonly PlayerMovementDiagnostic[],
	diagnosticAxes: readonly ('x' | 'y')[],
	from: Point
): PlayerMovementDiagnostic[] {
	const initialPhase: PlayerMovementDiagnostic[] = [];
	for (const [index, diagnostic] of diagnostics.entries()) {
		if (
			diagnosticAxes[index] !== 'y' ||
			diagnostic.previousPosition.x !== from.x ||
			diagnostic.requestedPosition.x !== from.x ||
			diagnostic.resolvedPosition.x !== from.x ||
			diagnostic.resolvedPosition.y >= diagnostic.previousPosition.y
		) {
			break;
		}
		initialPhase.push(diagnostic);
	}
	return initialPhase;
}

function assertItemShopStockroomEntryRouteContract(
	points: readonly Point[],
	result: BrowserRouteResult
): Point {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const npc = layout.npcApproaches.mira.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const { minimumX, maximumX } = itemShopStockroomEntrySafeXBand();
	const transitY = itemShopDoorwayTransitY(
		'item-shop-stockroom-divider-north',
		'item-shop-stockroom-divider-south',
		'stockroom'
	);
	const from = points[0]!;
	const verticalDestination = points[1]!;
	const doorwayDestination = points[2]!;
	const targetPoint = points.at(-1)!;
	const obstacles = [...layout.walls, ...Object.values(layout.propCollisions)];

	expect(points).toHaveLength(4);
	expect(targetPoint).toEqual({ x: 448, y: 160 });
	expect(from.x).toBeGreaterThanOrEqual(minimumX);
	expect(from.x).toBeLessThan(maximumX);
	expect(verticalDestination).toEqual({ x: from.x, y: transitY });
	expect(doorwayDestination).toEqual({ x: targetPoint.x, y: transitY });
	expect(layoutRectContainsPoint(layout.rooms.salesFloor, from)).toBe(true);
	expect(layoutRectContainsPoint(layout.corridors.serviceCorridor, verticalDestination)).toBe(true);
	expect(layoutRectContainsPoint(layout.corridors.serviceCorridor, doorwayDestination)).toBe(true);

	expect(result.status).toBe('done');
	expect(result.mapId).toBe('item-shop');
	expect(result.activeKey ?? null).toBeNull();
	expect(result.axis).toBeNull();
	expect(result.target).toBeNull();
	expect(result.invalidDiagnostics ?? []).toEqual([]);
	expect(result.pointIndex).toBe(points.length);
	expect(result.position).not.toBeNull();
	if (!result.position) {
		throw new Error(
			`Item Shop stockroom-entry route returned no live endpoint: ${describeBrowserRouteResult(result, result.token)}`
		);
	}
	const actualPoint = result.position;
	expect(Math.abs(actualPoint.x - targetPoint.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(actualPoint.y - targetPoint.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(actualPoint.x).toBeGreaterThanOrEqual(minimumX - AXIS_REACH_TOLERANCE);
	expect(actualPoint.x).toBeLessThan(maximumX + AXIS_REACH_TOLERANCE);

	const diagnostics = result.diagnostics ?? [];
	const diagnosticAxes = result.diagnosticAxes ?? [];
	expect(diagnosticAxes).toHaveLength(diagnostics.length);
	const initialFixedAxisDiagnostics = itemShopStockroomEntryInitialFixedAxisDiagnostics(
		diagnostics,
		diagnosticAxes,
		from
	);
	expect(initialFixedAxisDiagnostics.length).toBeGreaterThan(0);
	expect(initialFixedAxisDiagnostics.at(-1)!.resolvedPosition.y).toBeLessThan(from.y);
	for (const diagnostic of diagnostics) {
		expect(diagnostic.mapId).toBe('item-shop');
		expect(diagnostic.blocked).toBe(false);
		for (const obstacle of obstacles) {
			expect(
				routeSegmentIntersectsExpandedRect(
					diagnostic.previousPosition,
					diagnostic.requestedPosition,
					obstacle,
					PLAYER_COLLISION_RADIUS
				),
				`Item Shop stockroom-entry diagnostic swept ${JSON.stringify(obstacle)}: ${JSON.stringify(diagnostic)}`
			).toBe(false);
			expect(
				expandedLayoutRectContainsPoint(
					obstacle,
					diagnostic.resolvedPosition,
					PLAYER_COLLISION_RADIUS
				),
				`Item Shop stockroom-entry diagnostic entered ${JSON.stringify(obstacle)}: ${JSON.stringify(diagnostic)}`
			).toBe(false);
		}
		expect(
			routeSegmentIntersectsCircle(
				diagnostic.previousPosition,
				diagnostic.requestedPosition,
				npc,
				npcCollisionRadius
			),
			`Item Shop stockroom-entry diagnostic crossed Mira: ${JSON.stringify(diagnostic)}`
		).toBe(false);
	}
	for (const [index, diagnostic] of initialFixedAxisDiagnostics.entries()) {
		expect(
			diagnostic.resolvedPosition.y,
			`Item Shop stockroom-entry initial fixed-x northward diagnostic ${index}`
		).toBeLessThan(diagnostic.previousPosition.y);
	}
	for (const obstacle of obstacles) {
		expect(
			routeSegmentIntersectsExpandedRect(
				from,
				verticalDestination,
				obstacle,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			endpointYEnvelopeIsDisjointFromExpandedRect(
				verticalDestination,
				obstacle,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(true);
	}
	for (let index = 1; index < points.length; index += 1) {
		expect(
			routeSegmentIntersectsCircle(points[index - 1]!, points[index]!, npc, npcCollisionRadius)
		).toBe(false);
	}
	expect(routeSegmentIntersectsCircle(actualPoint, actualPoint, npc, npcCollisionRadius)).toBe(
		false
	);
	for (const obstacle of obstacles) {
		expect(expandedLayoutRectContainsPoint(obstacle, actualPoint, PLAYER_COLLISION_RADIUS)).toBe(
			false
		);
	}
	return actualPoint;
}

function itemShopStockroomTerminalRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const { minimumOpenY, maximumOpenY } = itemShopDoorwayOpenBand('stockroom');
	const stockroomSafeX = itemShopStockroomVerticalSafeX();
	const points = [
		currentPoint,
		{ x: stockroomSafeX, y: currentPoint.y },
		{ x: stockroomSafeX, y: targetPoint.y },
		targetPoint
	];

	// The doorway crossing preserves its actual authored y. First move farther
	// into the stockroom, then converge vertically at a source-derived x whose
	// full unchanged ±18 envelope clears both divider rectangles before the
	// authored stockroom checkpoint is reached.
	expect(targetPoint).toEqual({ x: 192, y: 160 });
	expect(currentPoint.y).toBeGreaterThan(minimumOpenY);
	expect(currentPoint.y).toBeLessThan(maximumOpenY);
	expect(layoutRectContainsPoint(layout.corridors.serviceCorridor, currentPoint)).toBe(true);
	expect(layoutRectContainsPoint(layout.rooms.stockroom, points[1]!)).toBe(true);
	expect(layoutRectContainsPoint(layout.rooms.stockroom, points[2]!)).toBe(true);
	for (const divider of layout.walls.filter(({ id }) =>
		['item-shop-stockroom-divider-north', 'item-shop-stockroom-divider-south'].includes(id)
	)) {
		expect(
			routeSegmentIntersectsExpandedRect(
				currentPoint,
				points[1]!,
				divider,
				PLAYER_COLLISION_RADIUS
			),
			`Item Shop stockroom doorway crossed ${divider.id} at actual y: ${JSON.stringify({ currentPoint, divider })}`
		).toBe(false);
		expect(
			routeSegmentIntersectsExpandedRectAtReachEnvelope(
				points[1]!,
				points[2]!,
				divider,
				PLAYER_COLLISION_RADIUS
			),
			`Item Shop stockroom vertical convergence crossed ${divider.id}: ${JSON.stringify({ from: points[1], to: points[2], divider })}`
		).toBe(false);
	}
	for (const obstacle of [...layout.walls, ...Object.values(layout.propCollisions)]) {
		expect(
			routeSegmentIntersectsExpandedRectAtReachEnvelope(
				points[2]!,
				targetPoint,
				obstacle,
				PLAYER_COLLISION_RADIUS
			),
			`Item Shop stockroom terminal leg crossed authored collision: ${JSON.stringify({ from: points[2], to: targetPoint, obstacle })}`
		).toBe(false);
	}

	return points;
}

function assertItemShopStockroomTerminalRouteContract(
	points: readonly Point[],
	result: BrowserRouteResult,
	targetPoint: Point
) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const dividers = layout.walls.filter(({ id }) =>
		['item-shop-stockroom-divider-north', 'item-shop-stockroom-divider-south'].includes(id)
	);
	const diagnostics = result.diagnostics ?? [];
	const diagnosticAxes = result.diagnosticAxes ?? [];
	const verticalDiagnostics = diagnostics.filter((_, index) => diagnosticAxes[index] === 'y');
	expect(points.at(-1)).toEqual(targetPoint);
	expect(result.status).toBe('done');
	expect(result.mapId).toBe('item-shop');
	expect(result.activeKey).toBeNull();
	if (verticalDiagnostics.length === 0) {
		// A route may already be inside the unchanged settle band when it reaches
		// the vertical target, so no y movement diagnostic is emitted. Preserve
		// that characterized zero-movement branch instead of requiring telemetry
		// for an input that never occurred.
		expect(diagnosticAxes).not.toContain('y');
		for (const diagnostic of diagnostics) {
			expect(diagnostic.mapId).toBe('item-shop');
			expect(diagnostic.blocked).toBe(false);
		}
	} else {
		for (const diagnostic of verticalDiagnostics) {
			expect(diagnostic.mapId).toBe('item-shop');
			expect(diagnostic.blocked).toBe(false);
			expect(diagnostic.previousPosition.x).toBe(diagnostic.requestedPosition.x);
			expect(diagnostic.requestedPosition.x).toBe(diagnostic.resolvedPosition.x);
			expect(diagnostic.resolvedPosition.x + PLAYER_COLLISION_RADIUS).toBeLessThan(
				Math.min(...dividers.map(({ x }) => x))
			);
			for (const divider of dividers) {
				expect(
					expandedLayoutRectContainsPoint(
						divider,
						diagnostic.resolvedPosition,
						PLAYER_COLLISION_RADIUS
					),
					`Item Shop stockroom vertical diagnostic entered ${divider.id}: ${JSON.stringify(diagnostic)}`
				).toBe(false);
				expect(
					routeSegmentIntersectsExpandedRect(
						diagnostic.previousPosition,
						diagnostic.requestedPosition,
						divider,
						PLAYER_COLLISION_RADIUS
					),
					`Item Shop stockroom vertical diagnostic swept ${divider.id}: ${JSON.stringify(diagnostic)}`
				).toBe(false);
			}
		}
	}
	const actualPoint = result.position;
	expect(actualPoint).not.toBeNull();
	if (!actualPoint) {
		throw new Error('Item Shop stockroom terminal route returned no final position');
	}
	expect(Math.abs(actualPoint.x - targetPoint.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(actualPoint.y - targetPoint.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	for (const obstacle of [...layout.walls, ...Object.values(layout.propCollisions)]) {
		expect(
			expandedLayoutRectContainsPoint(obstacle, actualPoint, PLAYER_COLLISION_RADIUS),
			`Item Shop stockroom terminal entered authored collision: ${JSON.stringify({ actualPoint, obstacle })}`
		).toBe(false);
	}
}

async function convergeItemShopDoorwayToOpenBand(
	page: Page,
	startPoint: Point,
	doorway: 'stockroom' | 'office'
): Promise<Point> {
	const { minimumOpenY, maximumOpenY } = itemShopDoorwayOpenBand(doorway);
	const alreadyInOpenBand = startPoint.y > minimumOpenY && startPoint.y < maximumOpenY;
	if (!alreadyInOpenBand) {
		const transitY =
			doorway === 'stockroom'
				? itemShopDoorwayTransitY(
						'item-shop-stockroom-divider-north',
						'item-shop-stockroom-divider-south',
						'stockroom'
					)
				: itemShopDoorwayTransitY(
						'item-shop-office-divider-north',
						'item-shop-office-divider-south',
						'office'
					);
		const result = await runBrowserRoute(
			page,
			[startPoint, { x: startPoint.x, y: transitY }],
			INTERIOR_ROUTE_SETTLE_TOLERANCE
		);
		return assertItemShopDoorwayConvergenceContract(
			startPoint,
			result,
			transitY,
			{ minimumOpenY, maximumOpenY },
			`Item Shop ${doorway} doorway convergence`
		);
	}
	const evidence = await currentHudPlayerEvidence(page, 'item-shop');
	const actualPoint = evidence.selectedPoint;
	expect(evidence.state?.mapId).toBe('item-shop');
	expect(actualPoint.y).toBeGreaterThan(minimumOpenY);
	expect(actualPoint.y).toBeLessThan(maximumOpenY);
	if (!alreadyInOpenBand) {
		expect(evidence.diagnostic?.mapId).toBe('item-shop');
		expect(evidence.diagnostic?.blocked).toBe(false);
	}
	return actualPoint;
}

function assertItemShopDoorwayConvergenceContract(
	startPoint: Point,
	result: BrowserRouteResult,
	transitY: number,
	band: { minimumOpenY: number; maximumOpenY: number },
	label: string
): Point {
	expect(result.status, `${label} status`).toBe('done');
	expect(result.mapId, `${label} map`).toBe('item-shop');
	expect(result.activeKey, `${label} active key`).toBeNull();
	expect(result.invalidDiagnostics ?? [], `${label} invalid diagnostics`).toEqual([]);
	const diagnostics = result.diagnostics ?? [];
	const diagnosticAxes = result.diagnosticAxes ?? [];
	expect(diagnostics.length, `${label} diagnostic count`).toBeGreaterThan(0);
	expect(diagnosticAxes, `${label} diagnostic axes`).toHaveLength(diagnostics.length);
	for (const [index, diagnostic] of diagnostics.entries()) {
		expect(diagnosticAxes[index], `${label} diagnostic ${index} axis`).toBe('y');
		expect(diagnostic.mapId, `${label} diagnostic ${index} map`).toBe('item-shop');
		expect(diagnostic.blocked, `${label} diagnostic ${index} blocked`).toBe(false);
		expect(diagnostic.previousPosition.x, `${label} diagnostic ${index} previous x`).toBe(
			startPoint.x
		);
		expect(diagnostic.requestedPosition.x, `${label} diagnostic ${index} requested x`).toBe(
			startPoint.x
		);
		expect(diagnostic.resolvedPosition.x, `${label} diagnostic ${index} resolved x`).toBe(
			startPoint.x
		);
		expect(
			Math.abs(diagnostic.resolvedPosition.y - transitY),
			`${label} diagnostic ${index} transit row reach`
		).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	}
	const actualPoint = result.position;
	expect(actualPoint, `${label} final position`).not.toBeNull();
	if (!actualPoint) {
		throw new Error(`${label} returned no final position`);
	}
	expect(actualPoint.x, `${label} final x`).toBe(startPoint.x);
	expect(
		Math.abs(actualPoint.y - transitY),
		`${label} final transit row reach`
	).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(actualPoint.y, `${label} final y lower boundary`).toBeGreaterThan(band.minimumOpenY);
	expect(actualPoint.y, `${label} final y upper boundary`).toBeLessThan(band.maximumOpenY);
	return actualPoint;
}

function itemShopDoorwayCrossingRoutePoints(
	currentPoint: Point,
	targetPoint: Point,
	doorway: 'stockroom' | 'office'
): Point[] {
	const { minimumOpenY, maximumOpenY } = itemShopDoorwayOpenBand(doorway);
	const points = [currentPoint, { x: targetPoint.x, y: currentPoint.y }, targetPoint];
	expect(currentPoint.y).toBeGreaterThan(minimumOpenY);
	expect(currentPoint.y).toBeLessThan(maximumOpenY);
	expect(points[1]?.y).toBe(currentPoint.y);
	return points;
}

function assertItemShopFixedAxisRouteContract(
	points: readonly Point[],
	result: BrowserRouteResult,
	axis: 'x' | 'y',
	obstacles: readonly { x: number; y: number; width: number; height: number }[],
	label: string
) {
	const from = points[0]!;
	const axisDestination = points[1]!;
	const fixedCoordinate = axis === 'x' ? 'y' : 'x';
	expect(from[fixedCoordinate]).toBe(axisDestination[fixedCoordinate]);
	expect(result.status).toBe('done');
	expect(result.mapId).toBe('item-shop');
	expect(result.activeKey).toBeNull();
	const diagnostics = result.diagnostics ?? [];
	const diagnosticAxes = result.diagnosticAxes ?? [];
	const fixedAxisDiagnostics = diagnostics.filter((_, index) => diagnosticAxes[index] === axis);
	const actualPoint = result.position;
	expect(actualPoint).not.toBeNull();
	if (!actualPoint) {
		throw new Error(`${label} returned no final position`);
	}
	expect(Number.isFinite(from.x) && Number.isFinite(from.y)).toBe(true);
	expect(Number.isFinite(actualPoint.x) && Number.isFinite(actualPoint.y)).toBe(true);
	expect(diagnosticAxes).toHaveLength(diagnostics.length);
	expect(Math.abs(actualPoint.x - points.at(-1)!.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(actualPoint.y - points.at(-1)!.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	if (fixedAxisDiagnostics.length === 0) {
		// A fixed-axis target can already be inside the unchanged settle/reach band.
		// In that case no input was issued for this axis: validate the actual live
		// point and its zero-length sweep, rather than a hypothetical segment to the
		// requested coordinate that the browser never traversed.
		expect(Math.abs(axisDestination[axis] - from[axis])).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
		expect(diagnosticAxes).not.toContain(axis);
		expect(actualPoint[axis]).toBe(from[axis]);
		for (const diagnostic of diagnostics) {
			expect(diagnostic.mapId).toBe('item-shop');
			expect(diagnostic.blocked).toBe(false);
		}
		for (const obstacle of obstacles) {
			expect(
				expandedLayoutRectContainsPoint(obstacle, from, PLAYER_COLLISION_RADIUS),
				`${label} zero-movement start entered an expanded collision: ${JSON.stringify({ from, obstacle })}`
			).toBe(false);
			expect(
				routeSegmentIntersectsExpandedRect(from, from, obstacle, PLAYER_COLLISION_RADIUS),
				`${label} zero-movement sweep entered an expanded collision: ${JSON.stringify({ from, obstacle })}`
			).toBe(false);
		}
		return;
	}
	for (const diagnostic of fixedAxisDiagnostics) {
		expect(diagnostic.mapId).toBe('item-shop');
		expect(diagnostic.blocked).toBe(false);
		// A fixed-axis input preserves its orthogonal coordinate exactly. Do not
		// invent the route runner's ±18 reach residue on that locked axis.
		expect(diagnostic.previousPosition[fixedCoordinate]).toBe(from[fixedCoordinate]);
		expect(diagnostic.requestedPosition[fixedCoordinate]).toBe(from[fixedCoordinate]);
		expect(diagnostic.resolvedPosition[fixedCoordinate]).toBe(from[fixedCoordinate]);
		for (const obstacle of obstacles) {
			expect(
				expandedLayoutRectContainsPoint(
					obstacle,
					diagnostic.resolvedPosition,
					PLAYER_COLLISION_RADIUS
				),
				`${label} entered an expanded collision: ${JSON.stringify({ diagnostic, obstacle })}`
			).toBe(false);
			expect(
				routeSegmentIntersectsExpandedRect(
					diagnostic.previousPosition,
					diagnostic.requestedPosition,
					obstacle,
					PLAYER_COLLISION_RADIUS
				),
				`${label} diagnostic swept an expanded collision: ${JSON.stringify({ diagnostic, obstacle })}`
			).toBe(false);
		}
	}
	for (const obstacle of obstacles) {
		expect(
			routeSegmentIntersectsExpandedRect(from, axisDestination, obstacle, PLAYER_COLLISION_RADIUS),
			`${label} crossed an expanded collision at the actual fixed axis: ${JSON.stringify({ from, axisDestination, obstacle })}`
		).toBe(false);
		expect(
			axis === 'x'
				? endpointXEnvelopeIsDisjointFromExpandedRect(
						axisDestination,
						obstacle,
						PLAYER_COLLISION_RADIUS
					)
				: endpointYEnvelopeIsDisjointFromExpandedRect(
						axisDestination,
						obstacle,
						PLAYER_COLLISION_RADIUS
					),
			`${label} destination ${axis} envelope entered an expanded collision: ${JSON.stringify({ axisDestination, obstacle })}`
		).toBe(true);
	}
}

function assertItemShopDoorwayHorizontalRouteContract(
	points: readonly Point[],
	result: BrowserRouteResult,
	doorway: 'stockroom' | 'office'
) {
	const { northWall, southWall, minimumOpenY, maximumOpenY } = itemShopDoorwayOpenBand(doorway);
	const from = points[0]!;
	expect(from.y).toBeGreaterThan(minimumOpenY);
	expect(from.y).toBeLessThan(maximumOpenY);
	assertItemShopFixedAxisRouteContract(
		points,
		result,
		'x',
		[northWall, southWall],
		`Item Shop ${doorway} doorway`
	);
}

function assertItemShopSpawnReturnCorridorVerticalRouteContract(
	points: readonly Point[],
	result: BrowserRouteResult
) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const counter = layout.propCollisions.miraCounter;
	const verticalFrom = points[0]!;
	const verticalDestination = points[1]!;
	const expandedRight = counter.x + counter.width + PLAYER_COLLISION_RADIUS;
	// The actual settled x is the source-backed side clearance for this fixed-y
	// transit. Its vertical segment and y-only endpoint envelope must stay clear
	// without applying a hypothetical ±18 x residue.
	expect(verticalFrom.x).toBeGreaterThan(expandedRight);
	expect(verticalDestination.x).toBe(verticalFrom.x);
	expect(verticalDestination.y).toBe(544);
	assertItemShopFixedAxisRouteContract(
		points,
		result,
		'y',
		[counter],
		'Item Shop spawn-return-corridor'
	);
}

function assertItemShopSpawnReturnCorridorHorizontalRouteContract(
	points: readonly Point[],
	result: BrowserRouteResult
) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const counter = layout.propCollisions.miraCounter;
	const from = points[0]!;
	const horizontalDestination = points[1]!;
	const targetPoint = points.at(-1)!;
	const diagnostics = result.diagnostics ?? [];
	const diagnosticAxes = result.diagnosticAxes ?? [];
	expect(points).toHaveLength(3);
	expect(targetPoint).toEqual({ x: 640, y: 544 });
	expect(horizontalDestination.y).toBe(from.y);
	expect(horizontalDestination.x).toBe(targetPoint.x);
	expect(result.status).toBe('done');
	expect(result.mapId).toBe('item-shop');
	expect(result.activeKey).toBeNull();
	expect(result.axis).toBeNull();
	expect(result.target).toBeNull();
	expect(result.pointIndex).toBe(3);
	expect(diagnosticAxes).toHaveLength(diagnostics.length);
	for (const [index, diagnostic] of diagnostics.entries()) {
		expect(diagnostic.mapId).toBe('item-shop');
		expect(diagnostic.blocked).toBe(false);
		expect(
			routeSegmentIntersectsExpandedRect(
				diagnostic.previousPosition,
				diagnostic.requestedPosition,
				counter,
				PLAYER_COLLISION_RADIUS
			),
			`Item Shop spawn-return-corridor horizontal diagnostic swept the counter: ${JSON.stringify({ index, diagnostic })}`
		).toBe(false);
		expect(
			expandedLayoutRectContainsPoint(
				counter,
				diagnostic.resolvedPosition,
				PLAYER_COLLISION_RADIUS
			),
			`Item Shop spawn-return-corridor horizontal diagnostic entered the counter: ${JSON.stringify({ index, diagnostic })}`
		).toBe(false);
	}
	for (let index = 1; index < points.length; index += 1) {
		expect(
			routeSegmentIntersectsExpandedRectAtReachEnvelope(
				points[index - 1]!,
				points[index]!,
				counter,
				PLAYER_COLLISION_RADIUS
			),
			`Item Shop spawn-return-corridor horizontal segment crossed the counter envelope: ${JSON.stringify({ from: points[index - 1], to: points[index] })}`
		).toBe(false);
	}
	const actualPoint = result.position;
	expect(actualPoint).not.toBeNull();
	if (!actualPoint) {
		throw new Error('Item Shop spawn-return-corridor horizontal route returned no final position');
	}
	expect(Math.abs(actualPoint.x - targetPoint.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(actualPoint.y - targetPoint.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(
		expandedLayoutRectContainsPoint(counter, actualPoint, PLAYER_COLLISION_RADIUS),
		`Item Shop spawn-return-corridor horizontal endpoint entered the counter: ${JSON.stringify({ actualPoint, targetPoint })}`
	).toBe(false);
}

function assertItemShopServiceReturnWestVerticalRouteContract(
	points: readonly Point[],
	result: BrowserRouteResult
) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const officeDividerSouth = layout.walls.find(({ id }) => id === 'item-shop-office-divider-south');
	if (!officeDividerSouth) {
		throw new Error('Item Shop office-divider-south source is missing');
	}
	const verticalFrom = points[0]!;
	const verticalDestination = points[1]!;
	const actualPoint = result.position;
	// This is a fixed-x departure from the already-proven office doorway band.
	// Keep the real player circle west of the divider and constrain only the
	// destination y residue; a hypothetical ±18 x residue would reject the
	// source-clear side passage.
	expect(verticalFrom.x + PLAYER_COLLISION_RADIUS).toBeLessThan(officeDividerSouth.x);
	expect(verticalDestination.x).toBe(verticalFrom.x);
	expect(verticalDestination.y).toBe(300);
	expect(actualPoint).not.toBeNull();
	if (!actualPoint) {
		throw new Error('Item Shop service-return-west route returned no final position');
	}
	expect(actualPoint.x + PLAYER_COLLISION_RADIUS).toBeLessThan(officeDividerSouth.x);
	expect(
		expandedLayoutRectContainsPoint(officeDividerSouth, actualPoint, PLAYER_COLLISION_RADIUS)
	).toBe(false);
	expect(
		routeSegmentIntersectsExpandedRect(
			verticalFrom,
			verticalDestination,
			officeDividerSouth,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(false);
	assertItemShopFixedAxisRouteContract(
		points,
		result,
		'y',
		[officeDividerSouth],
		'Item Shop service-return-west doorway departure'
	);
}

function assertItemShopServiceReturnWestHorizontalRouteContract(
	points: readonly Point[],
	result: BrowserRouteResult
) {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const npc = layout.npcApproaches.mira.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const targetPoint = points.at(-1)!;
	const diagnostics = result.diagnostics ?? [];
	const diagnosticAxes = result.diagnosticAxes ?? [];
	expect(points.length).toBeGreaterThanOrEqual(2);
	expect(targetPoint).toEqual({ x: 448, y: 300 });
	for (let index = 1; index < points.length; index += 1) {
		expect(
			points[index - 1]!.x === points[index]!.x || points[index - 1]!.y === points[index]!.y,
			`Item Shop service-return-west horizontal route must remain axis-aligned: ${JSON.stringify({ from: points[index - 1], to: points[index] })}`
		).toBe(true);
	}
	expect(result.status).toBe('done');
	expect(result.mapId).toBe('item-shop');
	expect(result.activeKey).toBeNull();
	expect(result.axis).toBeNull();
	expect(result.target).toBeNull();
	expect(result.pointIndex).toBe(points.length);
	expect(diagnosticAxes).toHaveLength(diagnostics.length);
	for (const [index, diagnostic] of diagnostics.entries()) {
		expect(diagnostic.mapId).toBe('item-shop');
		expect(diagnostic.blocked).toBe(false);
		for (const obstacle of [...layout.walls, ...Object.values(layout.propCollisions)]) {
			expect(
				routeSegmentIntersectsExpandedRect(
					diagnostic.previousPosition,
					diagnostic.requestedPosition,
					obstacle,
					PLAYER_COLLISION_RADIUS
				),
				`Item Shop service-return-west horizontal diagnostic ${index} swept ${JSON.stringify(obstacle)}: ${JSON.stringify(diagnostic)}`
			).toBe(false);
			expect(
				expandedLayoutRectContainsPoint(
					obstacle,
					diagnostic.resolvedPosition,
					PLAYER_COLLISION_RADIUS
				),
				`Item Shop service-return-west horizontal diagnostic ${index} entered ${JSON.stringify(obstacle)}: ${JSON.stringify(diagnostic)}`
			).toBe(false);
		}
		expect(
			routeSegmentIntersectsCircle(
				diagnostic.previousPosition,
				diagnostic.requestedPosition,
				npc,
				npcCollisionRadius
			),
			`Item Shop service-return-west horizontal diagnostic ${index} crossed Mira: ${JSON.stringify(diagnostic)}`
		).toBe(false);
	}
	for (const obstacle of [...layout.walls, ...Object.values(layout.propCollisions)]) {
		expect(
			points.every((point, index) => {
				if (index === 0) return true;
				return !routeSegmentIntersectsExpandedRectAtReachEnvelope(
					points[index - 1]!,
					point,
					obstacle,
					PLAYER_COLLISION_RADIUS
				);
			}),
			`Item Shop service-return-west horizontal route crossed ${JSON.stringify(obstacle)}: ${JSON.stringify({ points })}`
		).toBe(false);
	}
	for (let index = 1; index < points.length; index += 1) {
		expect(
			points[index - 1]!.x === points[index]!.x || points[index - 1]!.y === points[index]!.y
		).toBe(true);
		expect(
			routeSegmentIntersectsCircle(points[index - 1]!, points[index]!, npc, npcCollisionRadius),
			`Item Shop service-return-west horizontal route crossed Mira: ${JSON.stringify({
				from: points[index - 1],
				to: points[index]
			})}`
		).toBe(false);
	}
	const actualPoint = result.position;
	expect(actualPoint).not.toBeNull();
	if (!actualPoint) {
		throw new Error('Item Shop service-return-west horizontal route returned no final position');
	}
	expect(Math.abs(actualPoint.x - targetPoint.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(actualPoint.y - targetPoint.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	for (const obstacle of [...layout.walls, ...Object.values(layout.propCollisions)]) {
		expect(
			expandedLayoutRectContainsPoint(obstacle, actualPoint, PLAYER_COLLISION_RADIUS),
			`Item Shop service-return-west horizontal endpoint entered ${JSON.stringify(obstacle)}: ${JSON.stringify({ actualPoint, targetPoint })}`
		).toBe(false);
	}
}

function assertItemShopServiceReturnWestTerminalContract(
	result: BrowserRouteResult,
	targetPoint: Point
): Point {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const npc = layout.npcApproaches.mira.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const actualPoint = result.position;
	expect(result.status).toBe('done');
	expect(result.mapId).toBe('item-shop');
	expect(result.activeKey).toBeNull();
	expect(result.axis).toBeNull();
	expect(result.target).toBeNull();
	expect(result.pointIndex).toBe(2);
	expect(actualPoint).not.toBeNull();
	if (!actualPoint) {
		throw new Error('Item Shop service-return-west terminal route returned no final position');
	}
	expect(Number.isFinite(actualPoint.x) && Number.isFinite(actualPoint.y)).toBe(true);
	expect(Math.abs(actualPoint.x - targetPoint.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(actualPoint.y - targetPoint.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	const diagnostics = result.diagnostics ?? [];
	const diagnosticAxes = result.diagnosticAxes ?? [];
	expect(diagnosticAxes).toHaveLength(diagnostics.length);
	for (const diagnostic of diagnostics) {
		expect(diagnostic.mapId).toBe('item-shop');
		expect(diagnostic.blocked).toBe(false);
	}
	for (const obstacle of [...layout.walls, ...Object.values(layout.propCollisions)]) {
		expect(
			expandedLayoutRectContainsPoint(obstacle, actualPoint, PLAYER_COLLISION_RADIUS),
			`Item Shop service-return-west terminal entered ${JSON.stringify(obstacle)}: ${JSON.stringify({ actualPoint, targetPoint })}`
		).toBe(false);
	}
	expect(
		routeSegmentIntersectsCircle(actualPoint, actualPoint, npc, npcCollisionRadius),
		`Item Shop service-return-west terminal entered Mira collision: ${JSON.stringify({ actualPoint, targetPoint })}`
	).toBe(false);
	return actualPoint;
}

function itemShopSpawnReturnCorridorRoutePoints(
	currentPoint: Point,
	targetPoint: Point
): {
	vertical: [Point, Point];
	horizontal: [Point, Point];
} {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const counter = layout.propCollisions.miraCounter;
	const verticalDestination = { x: currentPoint.x, y: targetPoint.y };
	const vertical: [Point, Point] = [currentPoint, verticalDestination];
	const horizontal: [Point, Point] = [verticalDestination, targetPoint];
	const expandedRight = counter.x + counter.width + PLAYER_COLLISION_RADIUS;
	expect(targetPoint).toEqual({ x: 640, y: 544 });
	// This is an actual-position handoff, not a new waypoint: the prior route's
	// settled x is already east of the expanded counter and remains locked while
	// the player descends to the authored return corridor.
	expect(currentPoint.x).toBeGreaterThan(expandedRight);
	expect(verticalDestination.x).toBe(currentPoint.x);
	expect(verticalDestination.y).toBe(targetPoint.y);
	expect(
		routeSegmentIntersectsExpandedRect(
			currentPoint,
			verticalDestination,
			counter,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(false);
	expect(
		endpointYEnvelopeIsDisjointFromExpandedRect(
			verticalDestination,
			counter,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(true);
	return { vertical, horizontal };
}

function itemShopSpawnReturnCorridorHorizontalRoutePoints(
	currentPoint: Point,
	targetPoint: Point
): Point[] {
	const horizontalDestination = { x: targetPoint.x, y: currentPoint.y };
	const points = [currentPoint, horizontalDestination, targetPoint];
	expect(targetPoint).toEqual({ x: 640, y: 544 });
	expect(horizontalDestination.y).toBe(currentPoint.y);
	expect(horizontalDestination.x).toBe(targetPoint.x);
	return points;
}

function itemShopStockroomReturnDoorwayRoutePoints(
	currentPoint: Point,
	targetPoint: Point
): Point[] {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const { minimumOpenY, maximumOpenY } = itemShopDoorwayOpenBand('stockroom');
	const points = itemShopDoorwayCrossingRoutePoints(currentPoint, targetPoint, 'stockroom');
	expect(targetPoint).toEqual({ x: 448, y: 160 });
	expect(currentPoint.y).toBeGreaterThan(minimumOpenY);
	expect(currentPoint.y).toBeLessThan(maximumOpenY);
	expect(layoutRectContainsPoint(layout.rooms.stockroom, currentPoint)).toBe(true);
	expect(layoutRectContainsPoint(layout.corridors.serviceCorridor, points[1]!)).toBe(true);
	return points;
}

function itemShopServiceCorridorWestCheckpoint(requestedPoint: Point): Point {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const npc = layout.npcApproaches.mira.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const safeSideX = npc.x + npcCollisionRadius + AXIS_REACH_TOLERANCE + 1;
	const serviceToSalesDoor = layout.doors.serviceToSales;
	const targetPoint = { x: safeSideX, y: requestedPoint.y };
	expect(targetPoint.x).toBeGreaterThanOrEqual(serviceToSalesDoor.x);
	expect(targetPoint.x).toBeLessThanOrEqual(serviceToSalesDoor.x + serviceToSalesDoor.width);
	expect(layoutRectContainsPoint(layout.rooms.salesFloor, targetPoint)).toBe(true);
	expect(safeSideX).toBeGreaterThan(npc.x + npcCollisionRadius + AXIS_REACH_TOLERANCE);
	for (const offsetX of [-AXIS_REACH_TOLERANCE, AXIS_REACH_TOLERANCE]) {
		for (const offsetY of [-AXIS_REACH_TOLERANCE, AXIS_REACH_TOLERANCE]) {
			const settledPoint = {
				x: targetPoint.x + offsetX,
				y: targetPoint.y + offsetY
			};
			const dx = settledPoint.x - npc.x;
			const dy = settledPoint.y - npc.y;
			expect(dx * dx + dy * dy).toBeGreaterThan(npcCollisionRadius ** 2);
			for (const propCollision of Object.values(layout.propCollisions)) {
				expect(
					expandedLayoutRectContainsPoint(propCollision, settledPoint, PLAYER_COLLISION_RADIUS)
				).toBe(false);
			}
		}
	}
	return targetPoint;
}

function itemShopMiraSemanticStagingPoint(): Point {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const counter = layout.propCollisions.miraCounter;
	const npc = layout.npcApproaches.mira.npc;
	const interactionRadius = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const serviceWestLowerDivider = layout.walls.find(
		({ id }) => id === 'item-shop-service-west-lower-divider'
	);
	if (!serviceWestLowerDivider) {
		throw new Error('Item Shop service west lower divider source is missing');
	}
	const leftClearanceX = counter.x - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1;
	const minimumDividerSafeY =
		serviceWestLowerDivider.y +
		serviceWestLowerDivider.height +
		PLAYER_COLLISION_RADIUS +
		AXIS_REACH_TOLERANCE +
		1;
	const minimumInteractionSafeY = npc.y - interactionRadius + AXIS_REACH_TOLERANCE;
	const minimumSafeY = Math.max(minimumDividerSafeY, minimumInteractionSafeY);
	const maximumSafeY = counter.y - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1;
	const stagingY = Math.floor((minimumSafeY + maximumSafeY) / 2);
	const stagingPoint = { x: leftClearanceX, y: stagingY };

	expect({ minimumDividerSafeY, minimumInteractionSafeY, minimumSafeY, maximumSafeY }).toEqual({
		minimumDividerSafeY: 287,
		minimumInteractionSafeY: 290,
		minimumSafeY: 290,
		maximumSafeY: 305
	});
	expect(stagingPoint).toEqual({ x: 193, y: 297 });
	expect(layoutRectContainsPoint(layout.rooms.salesFloor, stagingPoint)).toBe(true);
	expect(stagingPoint.x + AXIS_REACH_TOLERANCE).toBeLessThan(counter.x - PLAYER_COLLISION_RADIUS);
	expect(stagingPoint.y - AXIS_REACH_TOLERANCE).toBeGreaterThan(
		serviceWestLowerDivider.y + serviceWestLowerDivider.height + PLAYER_COLLISION_RADIUS
	);
	expect(stagingPoint.y + AXIS_REACH_TOLERANCE).toBeLessThan(counter.y - PLAYER_COLLISION_RADIUS);
	for (let offsetX = -AXIS_REACH_TOLERANCE; offsetX <= AXIS_REACH_TOLERANCE; offsetX += 1) {
		for (let offsetY = -AXIS_REACH_TOLERANCE; offsetY <= AXIS_REACH_TOLERANCE; offsetY += 1) {
			const settledPoint = {
				x: stagingPoint.x + offsetX,
				y: stagingPoint.y + offsetY
			};
			expect(expandedLayoutRectContainsPoint(counter, settledPoint, PLAYER_COLLISION_RADIUS)).toBe(
				false
			);
			expect(
				expandedLayoutRectContainsPoint(
					serviceWestLowerDivider,
					settledPoint,
					PLAYER_COLLISION_RADIUS
				)
			).toBe(false);
			const dx = settledPoint.x - npc.x;
			const dy = settledPoint.y - npc.y;
			expect(dx * dx + dy * dy).toBeGreaterThan(npcCollisionRadius ** 2);
		}
	}

	// From every legal staging-row residue, moving right enters the interaction
	// circle before it could reach Mira's combined collision circle.
	for (let offsetY = -AXIS_REACH_TOLERANCE; offsetY <= AXIS_REACH_TOLERANCE; offsetY += 1) {
		const settledY = stagingPoint.y + offsetY;
		const verticalDistance = Math.abs(settledY - npc.y);
		expect(verticalDistance).toBeLessThanOrEqual(interactionRadius);
		const interactionReachX = Math.floor(Math.sqrt(interactionRadius ** 2 - verticalDistance ** 2));
		const interactionEntryX = npc.x - interactionReachX;
		const collisionEntryX =
			verticalDistance < npcCollisionRadius
				? npc.x - Math.floor(Math.sqrt(npcCollisionRadius ** 2 - verticalDistance ** 2))
				: npc.x;
		const interactionEntry = { x: interactionEntryX, y: settledY };
		const interactionEntryDistanceSquared =
			(interactionEntry.x - npc.x) ** 2 + (interactionEntry.y - npc.y) ** 2;
		expect(interactionEntryX).toBeLessThan(collisionEntryX);
		expect(interactionEntryDistanceSquared).toBeLessThanOrEqual(interactionRadius ** 2);
		expect(interactionEntryDistanceSquared).toBeGreaterThan(npcCollisionRadius ** 2);
		expect(
			routeSegmentIntersectsCircle(
				{ x: stagingPoint.x + AXIS_REACH_TOLERANCE, y: settledY },
				interactionEntry,
				npc,
				npcCollisionRadius
			)
		).toBe(false);
	}
	return stagingPoint;
}

function itemShopMiraRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const counter = layout.propCollisions.miraCounter;
	const npc = layout.npcApproaches.mira.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const leftClearanceX = counter.x - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1;
	const stagingPoint = itemShopMiraSemanticStagingPoint();
	const points = [
		currentPoint,
		{ x: leftClearanceX, y: currentPoint.y },
		{ x: leftClearanceX, y: stagingPoint.y },
		targetPoint
	];
	expect(targetPoint).toEqual(stagingPoint);
	expect(targetPoint.x).toBe(leftClearanceX);
	expect(targetPoint.y).toBe(stagingPoint.y);
	expect(layoutRectContainsPoint(layout.rooms.salesFloor, targetPoint)).toBe(true);
	for (let index = 1; index < points.length; index += 1) {
		const from = points[index - 1]!;
		const to = points[index]!;
		expect(
			from.x === to.x || from.y === to.y,
			`Item Shop Mira route must remain axis-aligned: ${JSON.stringify({ from, to })}`
		).toBe(true);
		for (const wall of layout.walls) {
			expect(
				routeSegmentIntersectsExpandedRect(from, to, wall, PLAYER_COLLISION_RADIUS),
				`Item Shop Mira route crossed ${wall.id}: ${JSON.stringify({ from, to })}`
			).toBe(false);
		}
		for (const propCollision of Object.values(layout.propCollisions)) {
			expect(
				routeSegmentIntersectsExpandedRect(from, to, propCollision, PLAYER_COLLISION_RADIUS),
				`Item Shop Mira route crossed a prop collision: ${JSON.stringify({ from, to, propCollision })}`
			).toBe(false);
		}
		expect(
			routeSegmentIntersectsCircle(from, to, npc, npcCollisionRadius),
			`Item Shop Mira route crossed Mira's combined collision: ${JSON.stringify({ from, to, npc })}`
		).toBe(false);
	}
	return points;
}

function itemShopMiraReturnRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const counter = layout.propCollisions.miraCounter;
	const npc = layout.npcApproaches.mira.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const leftClearanceX = counter.x - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1;
	const stagingPoint = itemShopMiraSemanticStagingPoint();
	const points = [
		currentPoint,
		{ x: leftClearanceX, y: currentPoint.y },
		{ x: leftClearanceX, y: targetPoint.y },
		targetPoint
	];

	// This is the inverse of the source-derived west sales-floor corridor used to
	// approach Mira: move away from the NPC above the counter, descend on its west
	// side, then cross the open sales floor at the next authored checkpoint.
	expect(Math.abs(currentPoint.y - stagingPoint.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(points[1]?.x).toBe(leftClearanceX);
	expect(points[2]?.x).toBe(leftClearanceX);
	expect(layoutRectContainsPoint(layout.rooms.salesFloor, targetPoint)).toBe(true);
	expect(leftClearanceX + AXIS_REACH_TOLERANCE).toBeLessThan(counter.x - PLAYER_COLLISION_RADIUS);
	for (let index = 1; index < points.length; index += 1) {
		const from = points[index - 1]!;
		const to = points[index]!;
		expect(
			from.x === to.x || from.y === to.y,
			`Item Shop Mira return route must remain axis-aligned: ${JSON.stringify({ from, to })}`
		).toBe(true);
		for (const wall of layout.walls) {
			expect(
				routeSegmentIntersectsExpandedRect(from, to, wall, PLAYER_COLLISION_RADIUS),
				`Item Shop Mira return route crossed ${wall.id}: ${JSON.stringify({ from, to })}`
			).toBe(false);
		}
		for (const propCollision of Object.values(layout.propCollisions)) {
			expect(
				routeSegmentIntersectsExpandedRect(from, to, propCollision, PLAYER_COLLISION_RADIUS),
				`Item Shop Mira return route crossed a prop collision: ${JSON.stringify({ from, to, propCollision })}`
			).toBe(false);
		}
		expect(
			routeSegmentIntersectsCircle(from, to, npc, npcCollisionRadius),
			`Item Shop Mira return route crossed Mira's combined collision: ${JSON.stringify({ from, to, npc })}`
		).toBe(false);
	}
	return points;
}

function itemShopServiceCorridorWestRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const npc = layout.npcApproaches.mira.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const points = [
		currentPoint,
		...(currentPoint.y === targetPoint.y ? [] : [{ x: currentPoint.x, y: targetPoint.y }]),
		targetPoint
	];
	for (let index = 1; index < points.length; index += 1) {
		const from = points[index - 1]!;
		const to = points[index]!;
		expect(
			from.x === to.x || from.y === to.y,
			`Item Shop service corridor west route must remain axis-aligned: ${JSON.stringify({ from, to })}`
		).toBe(true);
		for (const wall of layout.walls) {
			expect(
				routeSegmentIntersectsExpandedRect(from, to, wall, PLAYER_COLLISION_RADIUS),
				`Item Shop route crossed ${wall.id}: ${JSON.stringify({ from, to })}`
			).toBe(false);
		}
		for (const propCollision of Object.values(layout.propCollisions)) {
			expect(
				routeSegmentIntersectsExpandedRect(from, to, propCollision, PLAYER_COLLISION_RADIUS),
				`Item Shop route crossed a prop collision: ${JSON.stringify({ from, to, propCollision })}`
			).toBe(false);
		}
		if (index === 1 && from.x === to.x) {
			// The service-corridor handoff starts from the actual settled x of the
			// preceding north route. That settled point is exact live evidence;
			// retain the Y reach envelope only for the planned destination, where
			// the runner may still settle within its unchanged tolerance.
			for (const obstacle of [...layout.walls, ...Object.values(layout.propCollisions)]) {
				for (const endpoint of [to]) {
					expect(
						endpointYEnvelopeIsDisjointFromExpandedRect(
							endpoint,
							obstacle,
							PLAYER_COLLISION_RADIUS
						),
						`Item Shop service corridor west fixed-x endpoint entered an expanded collision envelope: ${JSON.stringify({ endpoint, obstacle })}`
					).toBe(true);
				}
			}
		}
		expect(
			routeSegmentIntersectsCircle(from, to, npc, npcCollisionRadius),
			`Item Shop route crossed Mira's combined collision: ${JSON.stringify({ from, to, npc })}`
		).toBe(false);
	}
	return points;
}

function itemShopServiceCorridorNorthRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const counter = layout.propCollisions.miraCounter;
	const npc = layout.npcApproaches.mira.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const expandedRight = counter.x + counter.width + PLAYER_COLLISION_RADIUS;
	const safeX = expandedRight + AXIS_REACH_TOLERANCE + INTERIOR_ROUTE_SETTLE_TOLERANCE + 1;
	// The preceding real endpoint can be inside the authored x=640 checkpoint
	// band. Move east on the already-open sales-floor row first; the extra
	// unchanged reach/settle headroom makes the subsequent north leg's entire
	// endpoint box clear the Mira counter.
	expect(safeX - AXIS_REACH_TOLERANCE - INTERIOR_ROUTE_SETTLE_TOLERANCE).toBeGreaterThan(
		expandedRight
	);
	expect(layoutRectContainsPoint(layout.rooms.salesFloor, { x: safeX, y: targetPoint.y })).toBe(
		true
	);
	const points = [
		currentPoint,
		{ x: safeX, y: currentPoint.y },
		{ x: safeX, y: targetPoint.y },
		targetPoint
	];
	for (let index = 1; index < points.length; index += 1) {
		const from = points[index - 1]!;
		const to = points[index]!;
		expect(
			from.x === to.x || from.y === to.y,
			`Item Shop service north route must remain axis-aligned: ${JSON.stringify({ from, to })}`
		).toBe(true);
		expect(
			routeSegmentIntersectsExpandedRectAtReachEnvelope(from, to, counter, PLAYER_COLLISION_RADIUS),
			`Item Shop service north route crossed Mira's counter envelope: ${JSON.stringify({ from, to, counter })}`
		).toBe(false);
		expect(
			routeSegmentIntersectsCircle(from, to, npc, npcCollisionRadius),
			`Item Shop service north route crossed Mira's collision: ${JSON.stringify({ from, to, npc })}`
		).toBe(false);
	}
	return points;
}

function itemShopServiceReturnSouthRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const counter = layout.propCollisions.miraCounter;
	const expandedRight = counter.x + counter.width + PLAYER_COLLISION_RADIUS;
	const safeX = expandedRight + AXIS_REACH_TOLERANCE + INTERIOR_ROUTE_SETTLE_TOLERANCE + 1;
	const points = [
		currentPoint,
		{ x: safeX, y: currentPoint.y },
		{ x: safeX, y: targetPoint.y },
		targetPoint
	];
	const obstacles = [...layout.walls, ...Object.values(layout.propCollisions)];

	// Preserve the live y residue above Mira's counter while moving east. This
	// fixed-y leg uses only the x endpoint envelope; the symmetric oracle starts
	// at the vertical leg after this source-derived handoff.
	expect(targetPoint).toEqual({ x: 640, y: 300 });
	expect(safeX - AXIS_REACH_TOLERANCE - INTERIOR_ROUTE_SETTLE_TOLERANCE).toBeGreaterThan(
		expandedRight
	);
	expect(layoutRectContainsPoint(layout.rooms.salesFloor, points[1]!)).toBe(true);
	expect(layoutRectContainsPoint(layout.rooms.salesFloor, points[2]!)).toBe(true);
	for (const obstacle of obstacles) {
		expect(
			routeSegmentIntersectsExpandedRect(points[0]!, points[1]!, obstacle, PLAYER_COLLISION_RADIUS),
			`Item Shop service-return-south east handoff crossed ${JSON.stringify(obstacle)}: ${JSON.stringify({ from: points[0], to: points[1] })}`
		).toBe(false);
		expect(
			endpointXEnvelopeIsDisjointFromExpandedRect(points[1]!, obstacle, PLAYER_COLLISION_RADIUS),
			`Item Shop service-return-south east handoff endpoint entered ${JSON.stringify(obstacle)}: ${JSON.stringify({ endpoint: points[1], obstacle })}`
		).toBe(true);
	}
	return points;
}

function itemShopMiraServiceReturnWestDoorwayRoutePoints(currentPoint: Point): Point[] {
	const safeX = itemShopStockroomOfficeDividerSafeX();
	const points = itemShopDoorwayCrossingRoutePoints(
		currentPoint,
		{ x: safeX, y: currentPoint.y },
		'office'
	).slice(0, 2);

	// The service-corridor endpoint is already on the west side of the office
	// divider. Reuse the authored office doorway helper for the fixed-y westward
	// handoff, rather than sending a generic route directly down beside the
	// divider and applying a false symmetric y residue to its doorway opening.
	expect(points).toEqual([currentPoint, { x: safeX, y: currentPoint.y }]);
	return points;
}

function itemShopMiraServiceReturnWestExitRoutePoints(
	currentPoint: Point,
	targetPoint: Point
): { vertical: [Point, Point]; horizontal: [Point, Point] } {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const officeDividerSouth = layout.walls.find(({ id }) => id === 'item-shop-office-divider-south');
	if (!officeDividerSouth) {
		throw new Error('Item Shop office-divider-south source is missing');
	}
	const expandedLeft = officeDividerSouth.x - PLAYER_COLLISION_RADIUS;
	const verticalDestination = { x: currentPoint.x, y: targetPoint.y };

	// The fixed-y doorway leg above returns the authoritative live x. The real
	// player circle must be west of the divider before descending; the vertical
	// leg applies the asymmetric fixed-axis contract below.
	expect(targetPoint).toEqual({ x: 448, y: 300 });
	expect(currentPoint.x + PLAYER_COLLISION_RADIUS).toBeLessThan(officeDividerSouth.x);
	expect(currentPoint.x).toBeLessThan(expandedLeft);
	expect(layoutRectContainsPoint(layout.corridors.serviceCorridor, currentPoint)).toBe(true);
	return {
		vertical: [currentPoint, verticalDestination],
		horizontal: [verticalDestination, targetPoint]
	};
}

async function waitForHudPosition(page: Page, mapId: string, point: Point) {
	await page.waitForFunction(
		({ requestedMapId, requestedPoint, tolerance }) => {
			const state = (window as GlieseProbeWindow).__glieseLastHudState;
			const diagnostic = (window as GlieseProbeWindow).__glieseLastMovementDiagnostic;
			const player =
				diagnostic?.mapId === requestedMapId ? diagnostic.resolvedPosition : state?.areaMap?.player;
			return (
				state?.ready === true &&
				state.mapId === requestedMapId &&
				typeof player?.x === 'number' &&
				typeof player?.y === 'number' &&
				Math.abs(player.x - requestedPoint.x) <= tolerance &&
				Math.abs(player.y - requestedPoint.y) <= tolerance
			);
		},
		{ requestedMapId: mapId, requestedPoint: point, tolerance: AXIS_REACH_TOLERANCE },
		{ timeout: 30_000 }
	);
}

async function waitForExactHudPosition(page: Page, mapId: string, point: Point) {
	await page.waitForFunction(
		({ requestedMapId, requestedPoint }) => {
			const state = (window as GlieseProbeWindow).__glieseLastHudState;
			const player = state?.areaMap?.player;
			return (
				state?.ready === true &&
				state.mapId === requestedMapId &&
				typeof player?.x === 'number' &&
				typeof player?.y === 'number' &&
				player.x === requestedPoint.x &&
				player.y === requestedPoint.y
			);
		},
		{ requestedMapId: mapId, requestedPoint: point },
		{ timeout: 30_000 }
	);
}

type MapAwarePlayerEvidence = {
	state: HudStateSnapshot | null;
	diagnostic: PlayerMovementDiagnostic | null;
	hudAt: number;
	movementAt: number;
	hudPoint: Point | null;
	mapMatchedDiagnosticPoint: Point | null;
	selectedPoint: Point;
};

async function currentHudPlayerEvidence(
	page: Page,
	mapId = 'meadow-entry'
): Promise<MapAwarePlayerEvidence> {
	const evidence = await page.evaluate(() => {
		const probeWindow = window as GlieseProbeWindow;
		return {
			state: probeWindow.__glieseLastHudState ?? null,
			diagnostic: probeWindow.__glieseLastMovementDiagnostic ?? null,
			hudAt: probeWindow.__glieseLastHudAt ?? 0,
			movementAt: probeWindow.__glieseLastMovementAt ?? 0
		};
	});
	const state = evidence.state;
	const hudPoint =
		state?.mapId === mapId &&
		typeof state.areaMap?.player?.x === 'number' &&
		typeof state.areaMap.player.y === 'number'
			? { x: state.areaMap.player.x, y: state.areaMap.player.y }
			: null;
	const mapMatchedDiagnosticPoint =
		evidence.diagnostic?.mapId === mapId ? { ...evidence.diagnostic.resolvedPosition } : null;
	const selectedPoint =
		mapMatchedDiagnosticPoint && evidence.movementAt >= evidence.hudAt
			? mapMatchedDiagnosticPoint
			: hudPoint;
	if (!selectedPoint) {
		throw new Error(
			`Missing live player point for ${mapId}: ${JSON.stringify({
				...evidence,
				hudPoint,
				mapMatchedDiagnosticPoint
			})}`
		);
	}
	return { ...evidence, hudPoint, mapMatchedDiagnosticPoint, selectedPoint };
}

async function currentHudPlayerPoint(page: Page, mapId = 'meadow-entry'): Promise<Point> {
	return (await currentHudPlayerEvidence(page, mapId)).selectedPoint;
}

type TrustedNpcSemanticApproach = {
	mapId: string;
	speaker: string;
	stagingPoint: Point;
	npc: Point;
	propCollision?: { x: number; y: number; width: number; height: number };
};

type TrustedNpcDirection = 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp';

function assertInteriorNpcApproachBindings() {
	const interactionKeys = new Set<string>();
	for (const interior of INTERIOR_GRAYBOX_CASES) {
		const layout =
			VILLAGE_INTERIOR_LAYOUTS[interior.mapId as keyof typeof VILLAGE_INTERIOR_LAYOUTS];
		if (!layout) throw new Error(`Missing source interior layout: ${interior.mapId}`);
		const bindings = (INTERIOR_NPC_APPROACH_BINDINGS[
			interior.mapId as keyof typeof INTERIOR_NPC_APPROACH_BINDINGS
		] ?? {}) as Readonly<Record<string, InteriorNpcApproachBinding>>;
		for (const step of interior.steps) {
			if (!step.interaction) continue;
			const interactionKey = `${interior.mapId}:${step.interaction.speaker}`;
			interactionKeys.add(interactionKey);
			const binding = bindings[step.interaction.speaker];
			expect(binding, `Missing NPC approach binding for ${interactionKey}`).toBeDefined();
			if (!binding) continue;
			const npcApproach = (
				layout.npcApproaches as Readonly<
					Record<string, { readonly npc: Point; readonly approach: Point }>
				>
			)[binding.approachKey];
			expect(
				npcApproach,
				`Missing source NPC approach ${binding.approachKey} for ${interactionKey}`
			).toBeDefined();
			if (!npcApproach) continue;
			expect(step.point, `${interactionKey} must use its authored approach`).toEqual(
				npcApproach.approach
			);
			if (binding.propCollisionKey) {
				const propCollision = (
					layout.propCollisions as Readonly<
						Record<
							string,
							{
								readonly x: number;
								readonly y: number;
								readonly width: number;
								readonly height: number;
							}
						>
					>
				)[binding.propCollisionKey];
				expect(
					propCollision,
					`Missing source prop collision ${binding.propCollisionKey} for ${interactionKey}`
				).toBeDefined();
			}
		}
	}

	for (const [mapId, layout] of Object.entries(VILLAGE_INTERIOR_LAYOUTS)) {
		const bindings =
			INTERIOR_NPC_APPROACH_BINDINGS[mapId as keyof typeof INTERIOR_NPC_APPROACH_BINDINGS];
		for (const approachKey of Object.keys(layout.npcApproaches)) {
			expect(
				Object.values(bindings ?? {}).some(({ approachKey: boundKey }) => boundKey === approachKey),
				`Unbound source NPC approach ${mapId}:${approachKey}`
			).toBe(true);
		}
	}

	for (const [mapId, bindings] of Object.entries(INTERIOR_NPC_APPROACH_BINDINGS)) {
		for (const speaker of Object.keys(bindings)) {
			expect(
				interactionKeys.has(`${mapId}:${speaker}`),
				`NPC approach binding has no journey interaction: ${mapId}:${speaker}`
			).toBe(true);
		}
	}
}

function trustedNpcDirectionToward(from: Point, npc: Point): TrustedNpcDirection {
	const deltaX = npc.x - from.x;
	const deltaY = npc.y - from.y;
	if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY) || (deltaX === 0 && deltaY === 0)) {
		throw new Error(`Unable to derive a cardinal NPC approach: ${JSON.stringify({ from, npc })}`);
	}
	if (Math.abs(deltaX) >= Math.abs(deltaY)) {
		return deltaX < 0 ? 'ArrowLeft' : 'ArrowRight';
	}
	return deltaY < 0 ? 'ArrowUp' : 'ArrowDown';
}

function trustedNpcSemanticApproachForStep(
	interior: InteriorGrayboxCase,
	step: InteriorGrayboxStep,
	checkpoint: Point
): TrustedNpcSemanticApproach | null {
	if (!step.interaction) return null;
	const layout = VILLAGE_INTERIOR_LAYOUTS[interior.mapId as keyof typeof VILLAGE_INTERIOR_LAYOUTS];
	const bindings = (INTERIOR_NPC_APPROACH_BINDINGS[
		interior.mapId as keyof typeof INTERIOR_NPC_APPROACH_BINDINGS
	] ?? {}) as Readonly<Record<string, InteriorNpcApproachBinding>>;
	const binding = bindings[step.interaction.speaker];
	if (!layout || !binding) {
		throw new Error(
			`Missing trusted NPC source binding: ${interior.mapId}:${step.interaction.speaker}`
		);
	}
	const npcApproach = (
		layout.npcApproaches as Readonly<
			Record<string, { readonly npc: Point; readonly approach: Point }>
		>
	)[binding.approachKey];
	if (!npcApproach) {
		throw new Error(
			`Missing trusted NPC source approach ${binding.approachKey}: ${interior.mapId}:${step.interaction.speaker}`
		);
	}
	const propCollision = binding.propCollisionKey
		? (
				layout.propCollisions as Readonly<
					Record<
						string,
						{
							readonly x: number;
							readonly y: number;
							readonly width: number;
							readonly height: number;
						}
					>
				>
			)[binding.propCollisionKey]
		: undefined;
	if (binding.propCollisionKey && !propCollision) {
		throw new Error(
			`Missing trusted NPC source prop collision ${binding.propCollisionKey}: ${interior.mapId}:${step.interaction.speaker}`
		);
	}
	expect(step.point).toEqual(npcApproach.approach);
	const stagingPoint =
		interior.mapId === 'guild-hall' && step.interaction.speaker === 'Guild Master Arlen'
			? guildHallGuildMasterInteractionStagingPoint()
			: interior.mapId === 'guild-hall' && step.interaction.speaker === 'Quartermaster Vale'
				? guildHallQuartermasterInteractionStagingPoint()
				: isItemShopMiraStep(interior, step)
					? itemShopMiraSemanticStagingPoint()
					: checkpoint;
	return {
		mapId: interior.mapId,
		speaker: step.interaction.speaker,
		stagingPoint,
		npc: { x: npcApproach.npc.x, y: npcApproach.npc.y },
		propCollision: propCollision
			? {
					x: propCollision.x,
					y: propCollision.y,
					width: propCollision.width,
					height: propCollision.height
				}
			: undefined
	};
}

async function runGuildMasterSemanticDiagonal(
	page: Page,
	beforeEvidence: MapAwarePlayerEvidence,
	interactionYBand: { min: number; maxExclusive: number },
	label: string
): Promise<GuildMasterSemanticDiagonalResult> {
	const token = `guild-master-semantic-diagonal-${Date.now()}`;
	expect(beforeEvidence.state?.mapId).toBe('guild-hall');
	const yDirection =
		beforeEvidence.selectedPoint.y < interactionYBand.min
			? 1
			: beforeEvidence.selectedPoint.y >= interactionYBand.maxExclusive
				? -1
				: 0;
	const started = await page.evaluate(
		(plan) =>
			(window as GlieseProbeWindow).__glieseRouteRunner?.startGuildMasterSemanticDiagonal(plan) ??
			null,
		{
			token,
			expectedMapId: 'guild-hall',
			minY: interactionYBand.min,
			maxYExclusive: interactionYBand.maxExclusive,
			xDirection: -1 as const
		}
	);
	if (!started) throw new Error(`${label}: semantic diagonal runner unavailable`);
	if (started.status === 'error') {
		throw new Error(`${label}: ${JSON.stringify(started)}`);
	}
	try {
		await page.waitForFunction(
			(requestedToken) => {
				const state = (
					window as GlieseProbeWindow
				).__glieseRouteRunner?.getGuildMasterSemanticDiagonal(requestedToken);
				return state?.status === 'done' || state?.status === 'error';
			},
			token,
			{ timeout: ROUTE_NO_PROGRESS_WATCHDOG_MS }
		);
	} catch (error) {
		const timedOutState = await page.evaluate(
			(requestedToken) =>
				(window as GlieseProbeWindow).__glieseRouteRunner?.getGuildMasterSemanticDiagonal(
					requestedToken
				) ?? null,
			token
		);
		const canceledState = await page.evaluate(
			(requestedToken) =>
				(window as GlieseProbeWindow).__glieseRouteRunner?.cancelGuildMasterSemanticDiagonal(
					requestedToken,
					'semantic diagonal wait interrupted'
				) ?? null,
			token
		);
		throw new Error(
			`${label}: semantic diagonal wait interrupted; state=${JSON.stringify(timedOutState)}; cleanup=${JSON.stringify(canceledState)}`,
			{ cause: error }
		);
	}
	const result = await page.evaluate(
		(requestedToken) =>
			(window as GlieseProbeWindow).__glieseRouteRunner?.getGuildMasterSemanticDiagonal(
				requestedToken
			) ?? null,
		token
	);
	if (!result) throw new Error(`${label}: semantic diagonal returned no state`);
	expect(result.token).toBe(token);
	expect(result.mapId).toBe('guild-hall');
	expect(result.released).toBe(true);
	expect(result.activeKeys).toEqual([]);
	expect(result.position).not.toBeNull();
	const expectedReleasedKeys =
		yDirection === 1
			? ['ArrowLeft', 'ArrowDown']
			: yDirection === -1
				? ['ArrowLeft', 'ArrowUp']
				: [];
	expect(result.releasedKeys).toEqual(expectedReleasedKeys);
	expect(
		expandedLayoutRectContainsPoint(
			VILLAGE_INTERIOR_LAYOUTS['guild-hall'].propCollisions.guildMasterDesk,
			result.position!,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(false);
	expect(result.position!.y).toBeGreaterThanOrEqual(interactionYBand.min);
	expect(result.position!.y).toBeLessThan(interactionYBand.maxExclusive);
	for (const [index, diagnostic] of result.diagnostics.entries()) {
		expect(diagnostic.mapId, `${label} diagnostic ${index} map`).toBe('guild-hall');
		expect(diagnostic.blocked, `${label} diagnostic ${index} blocked`).toBe(false);
		expect(diagnostic.resolvedPosition.x).toBeLessThan(diagnostic.previousPosition.x);
		expect(
			yDirection === 1
				? diagnostic.resolvedPosition.y > diagnostic.previousPosition.y
				: diagnostic.resolvedPosition.y < diagnostic.previousPosition.y
		).toBe(true);
		expect(
			routeSegmentIntersectsExpandedRect(
				diagnostic.previousPosition,
				diagnostic.resolvedPosition,
				VILLAGE_INTERIOR_LAYOUTS['guild-hall'].propCollisions.guildMasterDesk,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			yDirection === 1
				? diagnostic.resolvedPosition.y < interactionYBand.maxExclusive
				: yDirection === -1
					? diagnostic.resolvedPosition.y >= interactionYBand.min
					: diagnostic.resolvedPosition.y >= interactionYBand.min &&
						diagnostic.resolvedPosition.y < interactionYBand.maxExclusive
		).toBe(true);
	}
	return result;
}

function guildHallLobbyReturnSemanticDiagonalBand(): { min: number; maxExclusive: number } {
	const min = guildHallQuartermasterDoorwayTransitY();
	const maxExclusive = min + AXIS_REACH_TOLERANCE;
	// The lower lobby phase uses the same source-derived open doorway row as the
	// Quartermaster handoff. Its unchanged ±18 endpoint reach is the strict band
	// [577, 595), which remains above the expanded spine-south wall.
	expect({ min, maxExclusive }).toEqual({ min: 577, maxExclusive: 595 });
	return { min, maxExclusive };
}

function assertGuildHallLobbyReturnSemanticDiagonalContract(
	startPoint: Point,
	result: GuildMasterSemanticDiagonalResult,
	label: string
): Point {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const phaseBand = guildHallLobbyReturnSemanticDiagonalBand();
	const npc = layout.npcApproaches.quartermaster.npc;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const commonLobbyDivider = layout.walls.find(
		({ id }) => id === 'guild-hall-common-lobby-divider'
	);
	const quartermasterLobbyDivider = layout.walls.find(
		({ id }) => id === 'guild-hall-quartermaster-lobby-divider'
	);
	if (!commonLobbyDivider || !quartermasterLobbyDivider) {
		throw new Error('Guild Hall lobby divider source geometry is missing');
	}
	const obstacles = [...layout.walls, ...Object.values(layout.propCollisions)];
	const alreadyInBand = startPoint.y >= phaseBand.min && startPoint.y < phaseBand.maxExclusive;

	expect(result.status, `${label} status`).toBe('done');
	expect(result.mapId, `${label} map`).toBe('guild-hall');
	expect(result.activeKeys, `${label} active keys`).toEqual([]);
	expect(result.released, `${label} released`).toBe(true);
	expect(result.invalidDiagnostics, `${label} invalid diagnostics`).toEqual([]);
	expect(result.position, `${label} final position`).not.toBeNull();
	if (!result.position) {
		throw new Error(`${label}: semantic diagonal returned no final position`);
	}
	const phasePoint = result.position;
	expect(phasePoint.y, `${label} final y lower bound`).toBeGreaterThanOrEqual(phaseBand.min);
	expect(phasePoint.y, `${label} final y upper bound`).toBeLessThan(phaseBand.maxExclusive);
	expect(layoutRectContainsPoint(layout.corridors.mainSpine, phasePoint)).toBe(true);

	// Keep the live ±18 x envelope in the open central lane before the final
	// fixed-x descent through the lobby dividers.
	expect(phasePoint.x - AXIS_REACH_TOLERANCE).toBeGreaterThan(
		commonLobbyDivider.x + commonLobbyDivider.width + PLAYER_COLLISION_RADIUS
	);
	expect(phasePoint.x + AXIS_REACH_TOLERANCE).toBeLessThan(
		quartermasterLobbyDivider.x - PLAYER_COLLISION_RADIUS
	);

	if (alreadyInBand) {
		expect(result.releasedKeys, `${label} released keys`).toEqual([]);
		expect(result.diagnostics, `${label} diagnostics`).toEqual([]);
		expect(result.lastDiagnostic, `${label} last diagnostic`).toBeNull();
		expect(phasePoint, `${label} zero-input position`).toEqual(startPoint);
	} else {
		expect(result.releasedKeys, `${label} released keys`).toEqual(['ArrowLeft', 'ArrowDown']);
		expect(result.diagnostics.length, `${label} diagnostic count`).toBeGreaterThanOrEqual(1);
		expect(phasePoint.x, `${label} final x moves left`).toBeLessThan(startPoint.x);
		expect(phasePoint.y, `${label} final y moves down`).toBeGreaterThan(startPoint.y);

		for (const [diagnosticIndex, diagnostic] of result.diagnostics.entries()) {
			const expectedPreviousPosition =
				diagnosticIndex === 0
					? startPoint
					: result.diagnostics[diagnosticIndex - 1]!.resolvedPosition;
			expect(diagnostic.previousPosition, `${label} diagnostic ${diagnosticIndex} start`).toEqual(
				expectedPreviousPosition
			);
			expect(diagnostic.mapId, `${label} diagnostic ${diagnosticIndex} map`).toBe('guild-hall');
			expect(diagnostic.blocked, `${label} diagnostic ${diagnosticIndex} blocked`).toBe(false);
			expect(
				diagnostic.resolvedPosition.x,
				`${label} diagnostic ${diagnosticIndex} moves left`
			).toBeLessThan(diagnostic.previousPosition.x);
			expect(
				diagnostic.resolvedPosition.y,
				`${label} diagnostic ${diagnosticIndex} moves down`
			).toBeGreaterThan(diagnostic.previousPosition.y);
			for (const [segmentIndex, segmentTarget] of [
				diagnostic.requestedPosition,
				diagnostic.resolvedPosition
			].entries()) {
				for (const obstacle of obstacles) {
					expect(
						routeSegmentIntersectsExpandedRect(
							diagnostic.previousPosition,
							segmentTarget,
							obstacle,
							PLAYER_COLLISION_RADIUS
						),
						`${label} diagnostic ${diagnosticIndex} segment ${segmentIndex} crossed ${'id' in obstacle ? obstacle.id : 'prop collision'}`
					).toBe(false);
					expect(
						routeSegmentIntersectsCircle(
							diagnostic.previousPosition,
							segmentTarget,
							npc,
							npcCollisionRadius
						),
						`${label} diagnostic ${diagnosticIndex} segment ${segmentIndex} crossed Quartermaster NPC`
					).toBe(false);
				}
			}
		}
		expect(result.diagnostics.at(-1)!.resolvedPosition).toEqual(phasePoint);
	}

	for (const obstacle of obstacles) {
		expect(
			endpointBoxIsDisjointFromExpandedRect(phasePoint, obstacle, PLAYER_COLLISION_RADIUS),
			`${label} endpoint envelope crossed ${'id' in obstacle ? obstacle.id : 'prop collision'}`
		).toBe(true);
	}
	expect(
		Math.hypot(phasePoint.x - npc.x, phasePoint.y - npc.y),
		`${label} endpoint envelope crossed Quartermaster NPC`
	).toBeGreaterThan(npcCollisionRadius + AXIS_REACH_TOLERANCE);

	return phasePoint;
}

function assertGuildHallLobbyReturnFinalRouteContract(
	points: readonly [Point, Point, Point],
	result: BrowserRouteResult,
	targetPoint: Point,
	label: string
): Point {
	/*
	 * The terminal route assertions intentionally remain outside the semantic
	 * diagnostic loop: the semantic phase may emit more than one valid frame
	 * before entering its strict y band.
	 */
	expect(points[1], `${label} fixed-x handoff`).toEqual({ x: points[0]!.x, y: targetPoint.y });
	expect(points[2], `${label} authored final point`).toEqual(targetPoint);
	expect(result.status, `${label} status`).toBe('done');
	expect(result.mapId, `${label} map`).toBe('guild-hall');
	expect(result.activeKey ?? null, `${label} active key`).toBeNull();
	expect(result.position, `${label} final position`).not.toBeNull();
	if (!result.position) {
		throw new Error(`${label}: final route returned no position`);
	}
	assertGuildHallTerminalCheckpointContract(result.position, targetPoint);
	return result.position;
}

async function runFixedXAxisBandSteering(
	page: Page,
	request: FixedXAxisBandSteeringRequest,
	label: string
): Promise<CaveDoorwayBandResult> {
	const token = `${request.tokenPrefix}-${Date.now()}-${routeTokenSequence++}`;
	const started = await page.evaluate(
		(plan) => (window as GlieseProbeWindow).__glieseRouteRunner?.startCaveDoorwayBand(plan) ?? null,
		{
			token,
			expectedMapId: request.expectedMapId,
			minX: request.minX,
			maxXExclusive: request.maxXExclusive,
			expectedY: request.expectedY
		}
	);
	if (!started) throw new Error(`${label}: fixed-x band runner unavailable`);
	if (started.status === 'error') {
		throw new Error(`${label}: ${JSON.stringify(started)}`);
	}
	try {
		await page.waitForFunction(
			(requestedToken) => {
				const state = (window as GlieseProbeWindow).__glieseRouteRunner?.getCaveDoorwayBand(
					requestedToken
				);
				return state?.status === 'done' || state?.status === 'error';
			},
			token,
			{ timeout: ROUTE_NO_PROGRESS_WATCHDOG_MS }
		);
	} catch (error) {
		const timedOutState = await page.evaluate(
			(requestedToken) =>
				(window as GlieseProbeWindow).__glieseRouteRunner?.getCaveDoorwayBand(requestedToken) ??
				null,
			token
		);
		const canceledState = await page.evaluate(
			(requestedToken) =>
				(window as GlieseProbeWindow).__glieseRouteRunner?.cancelCaveDoorwayBand(
					requestedToken,
					'fixed-x band wait interrupted'
				) ?? null,
			token
		);
		throw new Error(
			`${label}: fixed-x band wait interrupted; state=${JSON.stringify(timedOutState)}; cleanup=${JSON.stringify(canceledState)}`,
			{ cause: error }
		);
	}
	const result = await page.evaluate(
		(requestedToken) =>
			(window as GlieseProbeWindow).__glieseRouteRunner?.getCaveDoorwayBand(requestedToken) ?? null,
		token
	);
	if (!result) throw new Error(`${label}: fixed-x band returned no state`);
	if (result.status === 'error') {
		throw new Error(`${label}: ${JSON.stringify(result)}`);
	}
	expect(result.token, `${label} token`).toBe(token);
	expect(result.status, `${label} status`).toBe('done');
	expect(result.mapId, `${label} map`).toBe(request.expectedMapId);
	expect(result.released, `${label} released`).toBe(true);
	expect(result.activeKeys, `${label} active keys`).toEqual([]);
	expect(result.position, `${label} final position`).not.toBeNull();
	if (!result.position) throw new Error(`${label}: fixed-x band returned no final point`);
	expect(result.position.y, `${label} fixed y`).toBe(request.expectedY);
	expect(result.position.x, `${label} band lower bound`).toBeGreaterThanOrEqual(request.minX);
	expect(result.position.x, `${label} band upper bound`).toBeLessThan(request.maxXExclusive);
	const expectedDirection =
		request.initialPoint.x < request.minX
			? 1
			: request.initialPoint.x >= request.maxXExclusive
				? -1
				: 0;
	expect(result.releasedKeys, `${label} released keys`).toEqual(
		expectedDirection > 0 ? ['ArrowRight'] : expectedDirection < 0 ? ['ArrowLeft'] : []
	);
	let previousResolvedX = request.initialPoint.x;
	for (const [index, diagnostic] of result.diagnostics.entries()) {
		expect(diagnostic.mapId, `${label} diagnostic ${index} map`).toBe(request.expectedMapId);
		expect(diagnostic.blocked, `${label} diagnostic ${index} blocked`).toBe(false);
		expect(diagnostic.previousPosition.x, `${label} diagnostic ${index} continuity`).toBe(
			previousResolvedX
		);
		expect(diagnostic.previousPosition.y, `${label} diagnostic ${index} previous y`).toBe(
			request.expectedY
		);
		expect(diagnostic.requestedPosition.y, `${label} diagnostic ${index} requested y`).toBe(
			request.expectedY
		);
		expect(diagnostic.resolvedPosition.y, `${label} diagnostic ${index} resolved y`).toBe(
			request.expectedY
		);
		expect(
			(diagnostic.resolvedPosition.x - diagnostic.previousPosition.x) * expectedDirection,
			`${label} diagnostic ${index} monotonic x`
		).toBeGreaterThan(0);
		previousResolvedX = diagnostic.resolvedPosition.x;
	}
	return result;
}

async function runCaveDoorwayBandSteering(
	page: Page,
	beforeEvidence: MapAwarePlayerEvidence,
	safeY: number,
	label: string
): Promise<CaveDoorwayBandResult> {
	const geometry = wildwoodCaveDoorwayGeometry();
	const { selectedPoint } = beforeEvidence;
	expect(beforeEvidence.state?.ready).toBe(true);
	expect(beforeEvidence.state?.mapId).toBe('meadow-entry');
	expect(Number.isFinite(safeY)).toBe(true);
	expect(Math.abs(safeY - WILDWOOD_CAVE_STAGING.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(safeY).toBeGreaterThan(
		geometry.landmarkRect.y + geometry.landmarkRect.height + PLAYER_COLLISION_RADIUS
	);
	expect(Math.abs(selectedPoint.y - safeY)).toBe(0);
	expect(Math.abs(selectedPoint.x - WILDWOOD_CAVE_STAGING.x)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	const result = await runFixedXAxisBandSteering(
		page,
		{
			expectedMapId: 'meadow-entry',
			minX: geometry.minX,
			maxXExclusive: geometry.maxXExclusive,
			expectedY: safeY,
			initialPoint: selectedPoint,
			tokenPrefix: 'cave-doorway-band'
		},
		label
	);

	for (const [index, diagnostic] of result.diagnostics.entries()) {
		expect(diagnostic.mapId, `${label} diagnostic ${index} map`).toBe('meadow-entry');
		expect(diagnostic.blocked, `${label} diagnostic ${index} blocked`).toBe(false);
		expect(diagnostic.previousPosition.y, `${label} diagnostic ${index} previous y`).toBe(safeY);
		expect(diagnostic.resolvedPosition.y, `${label} diagnostic ${index} resolved y`).toBe(safeY);
		expect(
			expandedLayoutRectContainsPoint(
				geometry.landmarkRect,
				diagnostic.previousPosition,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			expandedLayoutRectContainsPoint(
				geometry.landmarkRect,
				diagnostic.resolvedPosition,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsExpandedRect(
				diagnostic.previousPosition,
				diagnostic.resolvedPosition,
				geometry.landmarkRect,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		for (const collisionRect of geometry.collisionRects) {
			expect(
				expandedLayoutRectContainsPoint(
					collisionRect,
					diagnostic.resolvedPosition,
					PLAYER_COLLISION_RADIUS
				)
			).toBe(false);
			expect(
				routeSegmentIntersectsExpandedRect(
					diagnostic.previousPosition,
					diagnostic.resolvedPosition,
					collisionRect,
					PLAYER_COLLISION_RADIUS
				)
			).toBe(false);
		}
	}
	return result;
}

async function runItemShopStockroomEntryBandSteering(
	page: Page,
	beforeEvidence: MapAwarePlayerEvidence,
	label: string
): Promise<Point> {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const { selectedPoint } = beforeEvidence;
	const { minimumX, maximumX } = itemShopStockroomEntrySafeXBand();
	expect(beforeEvidence.state?.ready, `${label} ready`).toBe(true);
	expect(beforeEvidence.state?.mapId, `${label} map`).toBe('item-shop');
	expect(Number.isFinite(selectedPoint.x), `${label} current x`).toBe(true);
	expect(Number.isFinite(selectedPoint.y), `${label} current y`).toBe(true);
	expect(
		layoutRectContainsPoint(layout.rooms.salesFloor, selectedPoint),
		`${label} sales floor`
	).toBe(true);

	const result = await runFixedXAxisBandSteering(
		page,
		{
			expectedMapId: 'item-shop',
			minX: minimumX,
			maxXExclusive: maximumX,
			expectedY: selectedPoint.y,
			initialPoint: selectedPoint,
			tokenPrefix: 'item-shop-stockroom-entry-band'
		},
		label
	);
	return assertItemShopStockroomEntryBandContract(selectedPoint, result, label);
}

async function pulseGuildMasterIntoInteractionBand(page: Page, startPoint: Point): Promise<Point> {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const desk = layout.propCollisions.guildMasterDesk;
	const expandedDeskLeft = desk.x - PLAYER_COLLISION_RADIUS;
	const leftClearanceX = desk.x - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1;
	const interactionYBand = guildHallGuildMasterInteractionYBand();
	const stagingPoint = guildHallGuildMasterInteractionStagingPoint();

	// The route runner may legally finish the preceding axis at any point inside
	// its unchanged ±18 reach band. Keep that endpoint on the source-derived left
	// side of the desk before using vertical real-input pulses.
	expect(leftClearanceX + AXIS_REACH_TOLERANCE).toBeLessThan(expandedDeskLeft);
	expect(startPoint.x).toBeLessThan(expandedDeskLeft);
	expect(Math.abs(startPoint.x - stagingPoint.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);

	const currentEvidence = await currentHudPlayerEvidence(page, 'guild-hall');
	const isInInteractionBand = (point: Point) =>
		point.y >= interactionYBand.min && point.y < interactionYBand.maxExclusive;
	const semanticDiagonal = await runGuildMasterSemanticDiagonal(
		page,
		currentEvidence,
		interactionYBand,
		'Guild Master diagonal staging pulse'
	);
	expect(semanticDiagonal.status).toBe('done');
	const currentPoint = semanticDiagonal.position!;
	expect(isInInteractionBand(currentPoint)).toBe(true);

	assertGuildHallGuildMasterInteractionBand(stagingPoint);
	const semanticEvidence = await currentHudPlayerEvidence(page, 'guild-hall');
	return assertGuildHallGuildMasterStagingContract(page, stagingPoint, semanticEvidence);
}

async function approachNpcWithTrustedKeyboard(
	page: Page,
	approach: TrustedNpcSemanticApproach
): Promise<Point> {
	let stagingEvidence = await currentHudPlayerEvidence(page, approach.mapId);
	expect(Math.abs(stagingEvidence.selectedPoint.x - approach.stagingPoint.x)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	expect(Math.abs(stagingEvidence.selectedPoint.y - approach.stagingPoint.y)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	const interactionRadius = PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const guildMasterSemanticApproach =
		approach.mapId === 'guild-hall' && approach.speaker === 'Guild Master Arlen';
	let minimumMovementAt = stagingEvidence.movementAt;
	let rangeObserved: boolean;
	let blockedBeforeRange = false;

	if (guildMasterSemanticApproach) {
		const stagingPoint = guildHallGuildMasterInteractionStagingPoint();
		const stagedPoint = await pulseGuildMasterIntoInteractionBand(
			page,
			stagingEvidence.selectedPoint
		);
		stagingEvidence = await currentHudPlayerEvidence(page, approach.mapId);
		minimumMovementAt = stagingEvidence.movementAt;

		// Once the real-input pulse has placed the player in the source-derived
		// vertical band, the unchanged in-page route runner can traverse the open
		// row to the NPC's x coordinate without crossing either collision envelope.
		const horizontalTarget = { x: approach.npc.x, y: stagedPoint.y };
		const horizontalResult = await runBrowserRoute(
			page,
			[stagedPoint, horizontalTarget],
			NPC_APPROACH_SETTLE_TOLERANCE
		);
		expect(horizontalResult.status).toBe('done');
		expect(horizontalResult.mapId).toBe(approach.mapId);
		expect(horizontalResult.activeKey).toBeNull();
		expect(horizontalResult.axis).toBeNull();
		expect(horizontalResult.target).toBeNull();
		expect(horizontalResult.pointIndex).toBe(2);
		expect(horizontalResult.axisHistory).toEqual(['x']);
		expect(horizontalResult.diagnostics?.length).toBeGreaterThan(0);
		for (const diagnostic of horizontalResult.diagnostics ?? []) {
			expect(diagnostic.mapId).toBe(approach.mapId);
			expect(diagnostic.blocked).toBe(false);
		}
		expect(horizontalResult.position).not.toBeNull();
		if (!horizontalResult.position) {
			throw new Error(
				`Guild Master horizontal semantic route returned no live point: ${describeBrowserRouteResult(horizontalResult, horizontalResult.token)}`
			);
		}
		const horizontalPoint = horizontalResult.position;
		assertGuildHallGuildMasterInteractionBand(stagingPoint, horizontalPoint);
		expect(Math.abs(horizontalPoint.x - approach.npc.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
		expect(
			routeSegmentIntersectsExpandedRect(
				stagedPoint,
				horizontalPoint,
				VILLAGE_INTERIOR_LAYOUTS['guild-hall'].propCollisions.guildMasterDesk,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			routeSegmentIntersectsCircle(stagedPoint, horizontalPoint, approach.npc, npcCollisionRadius)
		).toBe(false);
		rangeObserved = true;
	} else {
		const direction = trustedNpcDirectionToward(stagingEvidence.selectedPoint, approach.npc);
		await page.locator('canvas').click();
		await page.keyboard.down(direction);
		try {
			const rangeHandle = await page.waitForFunction(
				({ requestedMapId, requestedNpc, requestedRadius, minimumMovementAt: minimumAt }) => {
					const probeWindow = window as GlieseProbeWindow;
					const state = probeWindow.__glieseLastHudState;
					const diagnostic = probeWindow.__glieseLastMovementDiagnostic;
					const movementAt = probeWindow.__glieseLastMovementAt ?? 0;
					if (
						state?.mapId !== requestedMapId ||
						diagnostic?.mapId !== requestedMapId ||
						movementAt <= minimumAt
					) {
						return false;
					}
					const resolved = diagnostic.resolvedPosition;
					if (!Number.isFinite(resolved.x) || !Number.isFinite(resolved.y)) return false;
					const distance = Math.hypot(resolved.x - requestedNpc.x, resolved.y - requestedNpc.y);
					if (diagnostic.blocked && distance > requestedRadius) return 'blocked';
					if (distance <= requestedRadius) return 'range';
					return false;
				},
				{
					requestedMapId: approach.mapId,
					requestedNpc: approach.npc,
					requestedRadius: interactionRadius,
					minimumMovementAt
				},
				{ timeout: 30_000 }
			);
			const rangeOutcome = (await rangeHandle.jsonValue()) as 'blocked' | 'range';
			rangeObserved = rangeOutcome === 'range';
			blockedBeforeRange = rangeOutcome === 'blocked';
		} finally {
			await page.keyboard.up(direction);
		}
	}
	if (blockedBeforeRange) {
		const evidence = await currentHudPlayerEvidence(page, approach.mapId);
		throw new Error(
			`${approach.speaker} blocked before entering exact interaction range: ${JSON.stringify({
				diagnostic: evidence.diagnostic,
				npc: approach.npc,
				interactionRadius
			})}`
		);
	}

	const evidence = await currentHudPlayerEvidence(page, approach.mapId);
	expect(evidence.movementAt).toBeGreaterThan(minimumMovementAt);
	expect(evidence.mapMatchedDiagnosticPoint).not.toBeNull();
	const livePoint = evidence.mapMatchedDiagnosticPoint!;
	const npcDistance = Math.hypot(livePoint.x - approach.npc.x, livePoint.y - approach.npc.y);
	expect(evidence.state?.mapId).toBe(approach.mapId);
	expect(Number.isFinite(livePoint.x)).toBe(true);
	expect(Number.isFinite(livePoint.y)).toBe(true);
	expect(rangeObserved).toBe(true);
	expect(npcDistance).toBeGreaterThan(npcCollisionRadius);
	expect(npcDistance).toBeLessThanOrEqual(interactionRadius);
	if (approach.propCollision) {
		expect(
			expandedLayoutRectContainsPoint(approach.propCollision, livePoint, PLAYER_COLLISION_RADIUS)
		).toBe(false);
	}
	const diagnostic = evidence.diagnostic;
	expect(diagnostic?.mapId).toBe(approach.mapId);
	if (guildMasterSemanticApproach) {
		const desk = VILLAGE_INTERIOR_LAYOUTS['guild-hall'].propCollisions.guildMasterDesk;
		expect(diagnostic?.blocked).toBe(false);
		expect(approach.npc.y - livePoint.y).toBeGreaterThan(npcCollisionRadius);
		expect(livePoint.y).toBeLessThan(desk.y - PLAYER_COLLISION_RADIUS);
		assertGuildHallGuildMasterInteractionBand(
			guildHallGuildMasterInteractionStagingPoint(),
			livePoint
		);
	}
	for (const position of [
		diagnostic?.previousPosition,
		diagnostic?.requestedPosition,
		diagnostic?.resolvedPosition
	]) {
		expect(Number.isFinite(position?.x)).toBe(true);
		expect(Number.isFinite(position?.y)).toBe(true);
	}
	const terminalPropContact =
		rangeObserved &&
		diagnostic?.blocked === true &&
		approach.propCollision !== undefined &&
		routeSegmentIntersectsExpandedRect(
			diagnostic.previousPosition,
			diagnostic.requestedPosition,
			approach.propCollision,
			PLAYER_COLLISION_RADIUS
		);
	const terminalNpcContact =
		rangeObserved &&
		diagnostic?.blocked === true &&
		routeSegmentIntersectsCircle(
			diagnostic.previousPosition,
			diagnostic.requestedPosition,
			approach.npc,
			npcCollisionRadius
		);
	if (diagnostic?.blocked) {
		expect(
			terminalPropContact || terminalNpcContact,
			`${approach.speaker} blocked approach was not authored prop/NPC contact: ${JSON.stringify({
				diagnostic,
				propCollision: approach.propCollision,
				npc: approach.npc,
				npcCollisionRadius
			})}`
		).toBe(true);
	}
	await page.waitForFunction(
		({ requestedMapId, requestedSpeaker }) => {
			const state = (window as GlieseProbeWindow).__glieseLastHudState;
			return (
				state?.mapId === requestedMapId &&
				state.status?.includes(`${requestedSpeaker} nearby`) === true
			);
		},
		{ requestedMapId: approach.mapId, requestedSpeaker: approach.speaker },
		{ timeout: 30_000 }
	);
	return livePoint;
}

async function assertInteriorCheckpoint(page: Page, interior: InteriorGrayboxCase, point: Point) {
	const evidence = await currentHudPlayerEvidence(page, interior.mapId);
	const { state, selectedPoint: player, diagnostic } = evidence;
	const selectedCurrentMapDiagnostic =
		evidence.mapMatchedDiagnosticPoint !== null && evidence.movementAt >= evidence.hudAt;
	expect(state?.ready).toBe(true);
	expect(state?.mapId).toBe(interior.mapId);
	expect(Number.isFinite(player.x)).toBe(true);
	expect(Number.isFinite(player.y)).toBe(true);
	expect(Math.abs(player.x - point.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(player.y - point.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	if (selectedCurrentMapDiagnostic) {
		expect(diagnostic?.mapId).toBe(interior.mapId);
		expect(diagnostic?.blocked).toBe(false);
	}
}

async function dismissQueuedQuestCompletionNotice(page: Page): Promise<boolean> {
	const notice = page.getByRole('dialog', { name: 'Guild Notice' });
	if (!(await notice.isVisible())) return false;

	// Clearing Meadow encounters in the single initial save unlocks the authored
	// requiresClear transition, but it also lets the accepted guild quest finish
	// as soon as the next NPC interaction is dispatched. Consume that queued
	// system notice through the real UI before retrying the intended interaction.
	await expect(notice.getByText(/^Quest complete: Thin Village Slimes\. Reward:/)).toBeVisible();
	await notice.getByRole('button', { name: 'Close' }).click();
	await expect(notice).toHaveCount(0);
	return true;
}

async function dismissUnexpectedRuinsWardenBattleSummary(page: Page): Promise<boolean> {
	const summary = page.getByRole('dialog', { name: 'Battle Summary' });
	if (!(await summary.isVisible())) return false;

	// A cleared Warden normally enters the authored victory state directly. If a
	// legitimate queued battle summary is present while loading Core, it can only
	// be the one Core encounter: ruins-warden. Prove that context before using the
	// existing Continue control; never suppress the runtime battle surface.
	const hud = await page.evaluate(() => (window as GlieseProbeWindow).__glieseLastHudState ?? null);
	expect(hud?.mapId).toBe('ruins-core');
	expect(TASK6_INITIAL_CLEARED_ENCOUNTERS).toContain('ruins-warden');
	await expect(summary).toContainText('Victory');
	await expect(summary).toContainText('Enemies defeated: 1');
	await summary.getByRole('button', { name: 'Continue' }).click();
	await expect(summary).toHaveCount(0);
	return true;
}

async function interactWithInteriorNpc(page: Page, interaction: InteriorGrayboxInteraction) {
	try {
		await page.waitForFunction(
			(requestedSpeaker) =>
				(window as GlieseProbeWindow).__glieseLastHudState?.status?.includes(
					`${requestedSpeaker} nearby`
				) === true,
			interaction.speaker,
			{ timeout: 30_000 }
		);
	} catch (error) {
		const evidence = await page.evaluate(() => {
			const probeWindow = window as GlieseProbeWindow;
			return {
				state: probeWindow.__glieseLastHudState ?? null,
				diagnostic: probeWindow.__glieseLastMovementDiagnostic ?? null
			};
		});
		throw new Error(`NPC proximity did not settle: ${JSON.stringify(evidence)}`, { cause: error });
	}
	await page.locator('canvas').click();
	await page.keyboard.press('e', { delay: 50 });
	if (await dismissQueuedQuestCompletionNotice(page)) {
		await page.locator('canvas').click();
		await page.keyboard.press('e', { delay: 50 });
	}
	const dialogue = page.getByRole('dialog', { name: interaction.speaker });
	await expect(dialogue).toBeVisible();

	if (interaction.shopName) {
		await dialogue.getByRole('button', { name: 'Shop' }).click();
		const shopDialog = page.getByRole('dialog', { name: interaction.shopName });
		await expect(shopDialog).toBeVisible();
		await shopDialog.getByRole('button', { name: 'Close' }).click();
		await expect(shopDialog).toHaveCount(0);
		await expect(dialogue).toHaveCount(0);
		return;
	}

	await dialogue.getByRole('button', { name: 'Close' }).first().click();
	await expect(dialogue).toHaveCount(0);
}

async function completeGuildMasterQuest(page: Page) {
	await page.waitForFunction(
		() =>
			(window as GlieseProbeWindow).__glieseLastHudState?.status?.includes(
				'Guild Master Arlen nearby'
			) === true,
		undefined,
		{ timeout: 30_000 }
	);
	await page.locator('canvas').click();
	await page.keyboard.press('e', { delay: 50 });
	const dialogue = page.getByRole('dialog', { name: 'Guild Master Arlen' });
	await expect(dialogue).toBeVisible();
	await expect(dialogue.getByText(/eastern ruins are stirring/i)).toBeVisible();
	await dialogue.getByRole('button', { name: 'Next' }).click();
	await dialogue.getByRole('button', { name: 'Next' }).click();
	await dialogue.getByRole('button', { name: 'Quest' }).click();
	await dialogue.getByRole('button', { name: 'Thin Village Slimes' }).click();
	await expect(dialogue.getByText(/Defeat slimes near the village/i)).toBeVisible();
	await dialogue.getByRole('button', { name: 'Accept' }).click();
	await expect(dialogue).toHaveCount(0);
	// The seeded Meadow clears make this side quest complete at acceptance. Consume
	// the authored Guild Notice before the next real keyboard route can begin.
	await expect(page.getByRole('dialog', { name: 'Guild Notice' })).toBeVisible();
	expect(await dismissQueuedQuestCompletionNotice(page)).toBe(true);
}

async function traverseInteriorForJourney(
	page: Page,
	interior: InteriorGrayboxCase,
	options: { completeGuildMasterQuest?: boolean } = {},
	onRoute?: (label: string, result: BrowserRouteResult) => void
): Promise<Point> {
	await enterInteriorWithTrustedKeyboard(page, interior);
	let currentPoint = interior.spawn;
	let leavingInteraction = false;
	for (const [stepIndex, step] of interior.steps.entries()) {
		// Every interacted NPC uses its authored approach checkpoint, followed by one
		// source-derived trusted keyboard approach when the nearby status is absent.
		const checkpoint = isGuildHallGuildMasterStep(interior, step)
			? guildHallGuildMasterCheckpoint()
			: isGuildHallQuartermasterStep(interior, step)
				? guildHallQuartermasterCheckpoint()
				: isItemShopServiceCorridorWestStep(interior, step)
					? itemShopServiceCorridorWestCheckpoint(step.point)
					: step.interaction?.speaker === 'Mira' && interior.mapId === 'item-shop'
						? { x: step.point.x, y: step.point.y + 2 }
						: step.point;
		assertInteriorNpcCheckpointContract(interior, step, checkpoint);
		const semanticApproach = trustedNpcSemanticApproachForStep(interior, step, checkpoint);
		const quartermasterSemanticStep =
			isGuildHallQuartermasterStep(interior, step) && semanticApproach !== null;
		const quartermasterReturnStep = isGuildHallQuartermasterReturnStep(
			interior,
			step,
			leavingInteraction
		);
		const guildHallLobbyReturnStep = isGuildHallLobbyReturnStep(interior, step);
		const routeTarget =
			semanticApproach?.stagingPoint ??
			(isGuildHallCommonHallWestStep(interior, step)
				? guildHallCommonHallWestRouteTarget(checkpoint)
				: checkpoint);
		const terminalDepartureStep =
			isGuildHallRecordsRoomStep(interior, step) ||
			isGuildHallGuildMasterNorthStep(interior, step) ||
			isGuildHallCommonHallRoomStep(interior, step);
		if (terminalDepartureStep) {
			const terminalStep = interior.steps[stepIndex - 1];
			expect(terminalStep?.label).toBe(
				isGuildHallRecordsRoomStep(interior, step)
					? 'records-hall-west'
					: isGuildHallGuildMasterNorthStep(interior, step)
						? 'guild-master-spine'
						: 'common-hall-west'
			);
			assertGuildHallTerminalCheckpointContract(currentPoint, terminalStep!.point);
		}
		const doorwayKind = itemShopAsymmetricDoorwayKind(interior, step);
		const spawnReturnCorridorStep = isItemShopSpawnReturnCorridorStep(interior, step);
		const stockroomEntryStep = isItemShopStockroomDoorwayStep(interior, step);
		const stockroomTerminalStep = isItemShopStockroomTerminalStep(interior, step);
		const serviceReturnWestStep = isItemShopMiraServiceReturnWestStep(interior, step);
		const serviceReturnSouthStep = isItemShopServiceReturnSouthStep(interior, step);
		const serviceCorridorWestStep = isItemShopServiceCorridorWestStep(interior, step);
		const villagerHouse1LynnStep = isVillagerHouse1LynnStep(interior, step);
		const villagerHouse2TomaStep = isVillagerHouse2TomaStep(interior, step);
		if (currentPoint.x !== routeTarget.x || currentPoint.y !== routeTarget.y) {
			if (doorwayKind) {
				currentPoint = await convergeItemShopDoorwayToOpenBand(page, currentPoint, doorwayKind);
			}
			if (serviceReturnWestStep) {
				currentPoint = await convergeItemShopDoorwayToOpenBand(page, currentPoint, 'office');
				const doorwayRoutePoints = itemShopMiraServiceReturnWestDoorwayRoutePoints(currentPoint);
				const doorwayRouteResult = await runBrowserRoute(
					page,
					doorwayRoutePoints,
					INTERIOR_ROUTE_SETTLE_TOLERANCE
				);
				onRoute?.(`${interior.mapId}:${step.label}:office-doorway`, doorwayRouteResult);
				if (!doorwayRouteResult.position) {
					throw new Error(
						`Item Shop office doorway handoff returned no final position: ${describeBrowserRouteResult(
							doorwayRouteResult,
							doorwayRouteResult.token
						)}`
					);
				}
				assertItemShopDoorwayHorizontalRouteContract(
					doorwayRoutePoints,
					doorwayRouteResult,
					'office'
				);
				currentPoint = doorwayRouteResult.position;
			}
			const spawnReturnCorridorPlan = spawnReturnCorridorStep
				? itemShopSpawnReturnCorridorRoutePoints(currentPoint, checkpoint)
				: null;
			const serviceReturnWestPlan = serviceReturnWestStep
				? itemShopMiraServiceReturnWestExitRoutePoints(currentPoint, checkpoint)
				: null;
			if (stockroomEntryStep) {
				expect(interior.steps[stepIndex - 1]?.label).toBe('service-corridor-west');
				const beforeEvidence = await currentHudPlayerEvidence(page, 'item-shop');
				expect(beforeEvidence.selectedPoint).toEqual(currentPoint);
				currentPoint = await runItemShopStockroomEntryBandSteering(
					page,
					beforeEvidence,
					`${interior.mapId}:${step.label}:band-handoff`
				);
			}
			const routePoints = isGuildHallGuildMasterStep(interior, step)
				? guildHallGuildMasterRoutePoints(currentPoint, routeTarget, semanticApproach !== null)
				: isGuildHallGuildMasterReturnStep(interior, step, leavingInteraction)
					? guildHallGuildMasterRoutePoints(currentPoint, checkpoint, false, true)
					: isGuildHallQuartermasterStep(interior, step)
						? guildHallQuartermasterRoutePoints(
								currentPoint,
								routeTarget,
								leavingInteraction,
								semanticApproach !== null
							)
						: isGuildHallQuartermasterReturnStep(interior, step, leavingInteraction)
							? guildHallQuartermasterRoutePoints(currentPoint, checkpoint, true)
							: isItemShopMiraStep(interior, step)
								? itemShopMiraRoutePoints(currentPoint, routeTarget)
								: isItemShopMiraReturnStep(interior, step, leavingInteraction)
									? itemShopMiraReturnRoutePoints(currentPoint, checkpoint)
									: isItemShopServiceCorridorNorthStep(interior, step)
										? itemShopServiceCorridorNorthRoutePoints(currentPoint, checkpoint)
										: isItemShopServiceCorridorWestStep(interior, step)
											? itemShopServiceCorridorWestRoutePoints(currentPoint, routeTarget)
											: serviceReturnSouthStep
												? itemShopServiceReturnSouthRoutePoints(currentPoint, checkpoint)
												: serviceReturnWestStep
													? serviceReturnWestPlan!.vertical
													: villagerHouse1LynnStep
														? villagerHouse1LynnRoutePoints(currentPoint, routeTarget)
														: villagerHouse2TomaStep
															? villagerHouse2TomaRoutePoints(currentPoint, routeTarget)
															: isItemShopStockroomReturnDoorwayStep(interior, step)
																? itemShopStockroomReturnDoorwayRoutePoints(
																		currentPoint,
																		checkpoint
																	)
																: isItemShopStockroomTerminalStep(interior, step)
																	? itemShopStockroomTerminalRoutePoints(currentPoint, checkpoint)
																	: stockroomEntryStep
																		? itemShopStockroomEntryRoutePoints(currentPoint, checkpoint)
																		: isItemShopOfficeDoorwayStep(interior, step)
																			? itemShopDoorwayCrossingRoutePoints(
																					currentPoint,
																					checkpoint,
																					'office'
																				)
																			: spawnReturnCorridorStep
																				? [
																						...spawnReturnCorridorPlan!.vertical,
																						...spawnReturnCorridorPlan!.horizontal.slice(1)
																					]
																				: isGuildHallRecordsRoomStep(interior, step)
																					? guildHallRecordsRoomRoutePoints(
																							currentPoint,
																							checkpoint
																						)
																					: isGuildHallGuildMasterSpineStep(interior, step)
																						? guildHallGuildMasterSpineRoutePoints(
																								currentPoint,
																								checkpoint
																							)
																						: isGuildHallGuildMasterNorthStep(interior, step)
																							? guildHallGuildMasterNorthRoutePoints(
																									currentPoint,
																									checkpoint
																								)
																							: isGuildHallCommonHallRoomStep(interior, step)
																								? guildHallCommonHallRoomAisleRoutePoints(
																										currentPoint,
																										checkpoint
																									)
																								: isGuildHallRecordsAisleHandoffStep(interior, step)
																									? guildHallRecordsAisleRoutePoints(
																											currentPoint,
																											checkpoint
																										)
																									: guildHallLobbyReturnStep
																										? [
																												currentPoint,
																												{ x: currentPoint.x, y: checkpoint.y },
																												checkpoint
																											]
																										: leavingInteraction
																											? [
																													currentPoint,
																													{ x: checkpoint.x, y: currentPoint.y },
																													checkpoint
																												]
																											: interiorRoutePoints(
																													currentPoint,
																													checkpoint
																												);
			if (
				(interior.mapId === 'guild-hall' || interior.mapId === 'item-shop') &&
				!quartermasterSemanticStep
			) {
				// Quartermaster return points 0->1 and 1->2 are the dedicated
				// fixed-axis/asymmetric egress legs. Their live diagnostics and
				// source geometry are asserted below; start the generic symmetric
				// endpoint-envelope audit at point 2 for the remaining corridor.
				const envelopeRoutePoints = quartermasterReturnStep ? routePoints.slice(2) : routePoints;
				const serviceCorridorWestHasInitialFixedXAxisTransit =
					serviceCorridorWestStep &&
					routePoints.length > 2 &&
					routePoints[0]!.x === routePoints[1]!.x;
				const stockroomEntryHasInitialFixedYAxisTransit =
					stockroomEntryStep && routePoints.length > 2 && routePoints[0]!.x === routePoints[1]!.x;
				const serviceReturnSouthHasInitialFixedYAxisTransit =
					serviceReturnSouthStep &&
					routePoints.length > 2 &&
					routePoints[0]!.y === routePoints[1]!.y;
				assertTask6InteriorRouteEnvelope(
					interior.mapId,
					envelopeRoutePoints,
					`${interior.mapId}:${step.label}`,
					terminalDepartureStep
						? { skipInitialTerminalDeparture: true }
						: doorwayKind
							? { skipInitialAsymmetricDoorwayCrossing: true }
							: spawnReturnCorridorStep
								? { skipInitialAsymmetricFixedAxisTransit: true }
								: serviceReturnWestStep
									? { skipInitialAsymmetricFixedAxisTransit: true }
									: stockroomEntryHasInitialFixedYAxisTransit
										? { skipInitialAsymmetricFixedAxisTransit: true }
										: serviceReturnSouthHasInitialFixedYAxisTransit
											? { skipInitialAsymmetricFixedAxisTransit: true }
											: serviceCorridorWestHasInitialFixedXAxisTransit
												? { skipInitialAsymmetricFixedAxisTransit: true }
												: undefined
				);
				if (serviceReturnWestStep) {
					const plan = serviceReturnWestPlan;
					if (!plan) {
						throw new Error('Item Shop service-return-west route plan was not created');
					}
					assertTask6InteriorRouteEnvelope(
						'item-shop',
						plan.horizontal,
						`${interior.mapId}:${step.label}:horizontal`
					);
				}
			}
			if (isGuildHallRecordsAisleHandoffStep(interior, step)) {
				assertGuildHallRecordsAisleHandoffContract(routePoints, checkpoint);
			}
			if (villagerHouse1LynnStep) {
				assertVillagerHouse1LynnRouteGeometry(routePoints, routeTarget);
			}
			if (villagerHouse2TomaStep) {
				assertVillagerHouse2TomaRouteGeometry(routePoints, routeTarget);
			}
			if (isGuildHallGuildMasterSpineStep(interior, step)) {
				assertGuildHallGuildMasterSpineRouteContract(routePoints, checkpoint);
			}
			if (terminalDepartureStep) {
				if (isGuildHallRecordsRoomStep(interior, step)) {
					assertGuildHallRecordsRoomHandoffContract(routePoints);
				} else if (isGuildHallCommonHallRoomStep(interior, step)) {
					assertGuildHallCommonHallRoomHandoffContract(routePoints, checkpoint);
				} else {
					assertGuildHallTerminalDepartureRouteContract(
						routePoints,
						`${interior.mapId}:${step.label}`
					);
				}
			}
			if (
				isGuildHallGuildMasterStep(interior, step) ||
				isGuildHallGuildMasterReturnStep(interior, step, leavingInteraction) ||
				isGuildHallQuartermasterStep(interior, step) ||
				isGuildHallQuartermasterReturnStep(interior, step, leavingInteraction)
			) {
				if (isGuildHallGuildMasterStep(interior, step)) {
					assertGuildHallGuildMasterRouteContract(
						routePoints,
						routeTarget,
						semanticApproach !== null
					);
				} else if (isGuildHallGuildMasterReturnStep(interior, step, leavingInteraction)) {
					assertGuildHallGuildMasterRouteContract(routePoints, checkpoint, false, true);
				} else {
					assertGuildHallQuartermasterCorridorContract(
						routePoints,
						routeTarget,
						isGuildHallQuartermasterReturnStep(interior, step, leavingInteraction),
						semanticApproach !== null
					);
				}
			}
			const routeSettleTolerance = step.interaction
				? NPC_APPROACH_SETTLE_TOLERANCE
				: INTERIOR_ROUTE_SETTLE_TOLERANCE;
			if (quartermasterSemanticStep) {
				const doorwayRouteResult = await runBrowserRoute(page, routePoints, routeSettleTolerance);
				onRoute?.(`${interior.mapId}:${step.label}:doorway`, doorwayRouteResult);
				expect(doorwayRouteResult.position).not.toBeNull();
				if (!doorwayRouteResult.position) {
					throw new Error(
						`Guild Hall Quartermaster doorway route returned no final position: ${describeBrowserRouteResult(
							doorwayRouteResult,
							doorwayRouteResult.token
						)}`
					);
				}
				currentPoint = doorwayRouteResult.position;

				const horizontalRoutePoints =
					guildHallQuartermasterSemanticHorizontalRoutePoints(currentPoint);
				const horizontalRouteResult = await runBrowserRoute(
					page,
					horizontalRoutePoints,
					routeSettleTolerance
				);
				onRoute?.(`${interior.mapId}:${step.label}:counter-row`, horizontalRouteResult);
				expect(horizontalRouteResult.position).not.toBeNull();
				if (!horizontalRouteResult.position) {
					throw new Error(
						`Guild Hall Quartermaster counter-row route returned no final position: ${describeBrowserRouteResult(
							horizontalRouteResult,
							horizontalRouteResult.token
						)}`
					);
				}
				assertGuildHallQuartermasterSemanticHorizontalRouteContract(
					horizontalRoutePoints,
					horizontalRouteResult
				);
				currentPoint = horizontalRouteResult.position;

				const verticalRoutePoints = guildHallQuartermasterSemanticVerticalRoutePoints(
					currentPoint,
					routeTarget
				);
				const verticalRouteResult = await runBrowserRoute(
					page,
					verticalRoutePoints,
					routeSettleTolerance
				);
				onRoute?.(`${interior.mapId}:${step.label}:semantic-staging`, verticalRouteResult);
				expect(verticalRouteResult.position).not.toBeNull();
				if (!verticalRouteResult.position) {
					throw new Error(
						`Guild Hall Quartermaster semantic staging route returned no final position: ${describeBrowserRouteResult(
							verticalRouteResult,
							verticalRouteResult.token
						)}`
					);
				}
				assertGuildHallQuartermasterSemanticVerticalRouteContract(
					verticalRoutePoints,
					verticalRouteResult,
					routeTarget
				);
				currentPoint = verticalRouteResult.position;
			} else if (quartermasterReturnStep) {
				const horizontalRoutePoints: [Point, Point] = [currentPoint, routePoints[1]!];
				const horizontalRouteResult = await runBrowserRoute(
					page,
					horizontalRoutePoints,
					routeSettleTolerance
				);
				onRoute?.(`${interior.mapId}:${step.label}:egress-horizontal`, horizontalRouteResult);
				expect(horizontalRouteResult.position).not.toBeNull();
				if (!horizontalRouteResult.position) {
					throw new Error(
						`Guild Hall Quartermaster horizontal egress returned no final position: ${describeBrowserRouteResult(
							horizontalRouteResult,
							horizontalRouteResult.token
						)}`
					);
				}
				assertGuildHallQuartermasterReturnAxisRouteContract(
					horizontalRoutePoints,
					horizontalRouteResult,
					'x',
					`${interior.mapId}:${step.label}:egress-horizontal`
				);
				currentPoint = horizontalRouteResult.position;

				const verticalRoutePoints: [Point, Point] = [
					currentPoint,
					{ x: currentPoint.x, y: routePoints[2]!.y }
				];
				const verticalRouteResult = await runBrowserRoute(
					page,
					verticalRoutePoints,
					routeSettleTolerance
				);
				onRoute?.(`${interior.mapId}:${step.label}:egress-vertical`, verticalRouteResult);
				expect(verticalRouteResult.position).not.toBeNull();
				if (!verticalRouteResult.position) {
					throw new Error(
						`Guild Hall Quartermaster vertical egress returned no final position: ${describeBrowserRouteResult(
							verticalRouteResult,
							verticalRouteResult.token
						)}`
					);
				}
				assertGuildHallQuartermasterReturnAxisRouteContract(
					verticalRoutePoints,
					verticalRouteResult,
					'y',
					`${interior.mapId}:${step.label}:egress-vertical`
				);
				currentPoint = verticalRouteResult.position;

				const corridorRoutePoints = guildHallQuartermasterReturnCorridorRoutePoints(
					currentPoint,
					checkpoint
				);
				assertGuildHallQuartermasterReturnCorridorGeometry(
					corridorRoutePoints,
					`${interior.mapId}:${step.label}:corridor`
				);
				const corridorRouteResult = await runBrowserRoute(
					page,
					corridorRoutePoints,
					routeSettleTolerance
				);
				onRoute?.(`${interior.mapId}:${step.label}:corridor`, corridorRouteResult);
				expect(corridorRouteResult.status).toBe('done');
				expect(corridorRouteResult.mapId).toBe('guild-hall');
				expect(corridorRouteResult.activeKey ?? null).toBeNull();
				expect(corridorRouteResult.position).not.toBeNull();
				if (!corridorRouteResult.position) {
					throw new Error(
						`Guild Hall Quartermaster corridor returned no final position: ${describeBrowserRouteResult(
							corridorRouteResult,
							corridorRouteResult.token
						)}`
					);
				}
				currentPoint = corridorRouteResult.position;
			} else if (guildHallLobbyReturnStep) {
				const beforeEvidence = await currentHudPlayerEvidence(page, 'guild-hall');
				expect(beforeEvidence.selectedPoint).toEqual(currentPoint);
				const phaseResult = await runGuildMasterSemanticDiagonal(
					page,
					beforeEvidence,
					guildHallLobbyReturnSemanticDiagonalBand(),
					`${interior.mapId}:${step.label}:continuity-phase`
				);
				const phasePoint = assertGuildHallLobbyReturnSemanticDiagonalContract(
					currentPoint,
					phaseResult,
					`${interior.mapId}:${step.label}:continuity-phase`
				);
				const finalRoutePoints: [Point, Point, Point] = [
					phasePoint,
					{ x: phasePoint.x, y: checkpoint.y },
					checkpoint
				];
				assertTask6InteriorRouteEnvelope(
					'guild-hall',
					finalRoutePoints,
					`${interior.mapId}:${step.label}:terminal`
				);
				const finalRouteResult = await runBrowserRoute(
					page,
					finalRoutePoints,
					routeSettleTolerance
				);
				onRoute?.(`${interior.mapId}:${step.label}:terminal`, finalRouteResult);
				currentPoint = assertGuildHallLobbyReturnFinalRouteContract(
					finalRoutePoints,
					finalRouteResult,
					checkpoint,
					`${interior.mapId}:${step.label}:terminal`
				);
			} else if (stockroomEntryStep) {
				const stockroomEntryRouteResult = await runBrowserRoute(
					page,
					routePoints,
					routeSettleTolerance
				);
				onRoute?.(`${interior.mapId}:${step.label}`, stockroomEntryRouteResult);
				expect(stockroomEntryRouteResult.position).not.toBeNull();
				if (!stockroomEntryRouteResult.position) {
					throw new Error(
						`Item Shop stockroom-entry route returned no final position: ${describeBrowserRouteResult(
							stockroomEntryRouteResult,
							stockroomEntryRouteResult.token
						)}`
					);
				}
				assertItemShopStockroomEntryRouteContract(routePoints, stockroomEntryRouteResult);
				currentPoint = stockroomEntryRouteResult.position;
			} else if (stockroomTerminalStep) {
				const stockroomTerminalRouteResult = await runBrowserRoute(
					page,
					routePoints,
					routeSettleTolerance
				);
				onRoute?.(`${interior.mapId}:${step.label}`, stockroomTerminalRouteResult);
				expect(stockroomTerminalRouteResult.position).not.toBeNull();
				if (!stockroomTerminalRouteResult.position) {
					throw new Error(
						`Item Shop stockroom terminal route returned no final position: ${describeBrowserRouteResult(
							stockroomTerminalRouteResult,
							stockroomTerminalRouteResult.token
						)}`
					);
				}
				assertItemShopStockroomTerminalRouteContract(
					routePoints,
					stockroomTerminalRouteResult,
					checkpoint
				);
				currentPoint = stockroomTerminalRouteResult.position;
			} else if (spawnReturnCorridorStep) {
				const plan = spawnReturnCorridorPlan;
				if (!plan) {
					throw new Error('Item Shop spawn-return-corridor route plan was not created');
				}
				const verticalRouteResult = await runBrowserRoute(
					page,
					plan.vertical,
					routeSettleTolerance
				);
				onRoute?.(`${interior.mapId}:${step.label}:vertical`, verticalRouteResult);
				expect(verticalRouteResult.position).not.toBeNull();
				if (!verticalRouteResult.position) {
					throw new Error(
						`Item Shop spawn-return-corridor vertical route returned no final position: ${describeBrowserRouteResult(verticalRouteResult, verticalRouteResult.token)}`
					);
				}
				assertItemShopSpawnReturnCorridorVerticalRouteContract(plan.vertical, verticalRouteResult);
				currentPoint = verticalRouteResult.position;

				const horizontalRoutePoints = itemShopSpawnReturnCorridorHorizontalRoutePoints(
					currentPoint,
					checkpoint
				);
				assertTask6InteriorRouteEnvelope(
					'item-shop',
					horizontalRoutePoints,
					`${interior.mapId}:${step.label}:horizontal`
				);
				const horizontalRouteResult = await runBrowserRoute(
					page,
					horizontalRoutePoints,
					routeSettleTolerance
				);
				onRoute?.(`${interior.mapId}:${step.label}:horizontal`, horizontalRouteResult);
				expect(horizontalRouteResult.position).not.toBeNull();
				if (!horizontalRouteResult.position) {
					throw new Error(
						`Item Shop spawn-return-corridor horizontal route returned no final position: ${describeBrowserRouteResult(horizontalRouteResult, horizontalRouteResult.token)}`
					);
				}
				assertItemShopSpawnReturnCorridorHorizontalRouteContract(
					horizontalRoutePoints,
					horizontalRouteResult
				);
				currentPoint = horizontalRouteResult.position;
			} else if (doorwayKind) {
				const fixedAxisRouteResult = await runBrowserRoute(page, routePoints, routeSettleTolerance);
				onRoute?.(`${interior.mapId}:${step.label}`, fixedAxisRouteResult);
				expect(fixedAxisRouteResult.position).not.toBeNull();
				if (!fixedAxisRouteResult.position) {
					throw new Error(
						`Item Shop fixed-axis route returned no final position: ${describeBrowserRouteResult(fixedAxisRouteResult, fixedAxisRouteResult.token)}`
					);
				}
				assertItemShopDoorwayHorizontalRouteContract(
					routePoints,
					fixedAxisRouteResult,
					doorwayKind
				);
				currentPoint = fixedAxisRouteResult.position;
			} else if (serviceReturnWestStep) {
				const plan = serviceReturnWestPlan;
				if (!plan) {
					throw new Error('Item Shop service-return-west route plan was not created');
				}
				const verticalRouteResult = await runBrowserRoute(
					page,
					plan.vertical,
					routeSettleTolerance
				);
				onRoute?.(`${interior.mapId}:${step.label}:vertical`, verticalRouteResult);
				expect(verticalRouteResult.position).not.toBeNull();
				if (!verticalRouteResult.position) {
					throw new Error(
						`Item Shop service-return-west vertical route returned no final position: ${describeBrowserRouteResult(
							verticalRouteResult,
							verticalRouteResult.token
						)}`
					);
				}
				assertItemShopServiceReturnWestVerticalRouteContract(plan.vertical, verticalRouteResult);
				currentPoint = verticalRouteResult.position;

				const horizontalTarget = plan.horizontal[1];
				const withinAuthoredTerminalBand =
					Math.abs(currentPoint.x - horizontalTarget.x) <= AXIS_REACH_TOLERANCE &&
					Math.abs(currentPoint.y - horizontalTarget.y) <= AXIS_REACH_TOLERANCE;
				if (withinAuthoredTerminalBand) {
					// The vertical route already produced a valid terminal point in the
					// authored checkpoint band. Do not feed a diagonal micro-correction
					// into the axis-aligned route-envelope oracle.
					currentPoint = assertItemShopServiceReturnWestTerminalContract(
						verticalRouteResult,
						horizontalTarget
					);
				} else {
					const horizontalRoutePoints: [Point, Point, Point] = [
						currentPoint,
						{ x: horizontalTarget.x, y: currentPoint.y },
						horizontalTarget
					];
					assertTask6InteriorRouteEnvelope(
						'item-shop',
						horizontalRoutePoints,
						`${interior.mapId}:${step.label}:horizontal`
					);
					const horizontalRouteResult = await runBrowserRoute(
						page,
						horizontalRoutePoints,
						routeSettleTolerance
					);
					onRoute?.(`${interior.mapId}:${step.label}:horizontal`, horizontalRouteResult);
					expect(horizontalRouteResult.position).not.toBeNull();
					if (!horizontalRouteResult.position) {
						throw new Error(
							`Item Shop service-return-west horizontal route returned no final position: ${describeBrowserRouteResult(
								horizontalRouteResult,
								horizontalRouteResult.token
							)}`
						);
					}
					assertItemShopServiceReturnWestHorizontalRouteContract(
						horizontalRoutePoints,
						horizontalRouteResult
					);
					currentPoint = horizontalRouteResult.position;
				}
			} else if (villagerHouse1LynnStep) {
				const lynnRouteResult = await runBrowserRoute(page, routePoints, routeSettleTolerance);
				onRoute?.(`${interior.mapId}:${step.label}`, lynnRouteResult);
				currentPoint = assertVillagerHouse1LynnRouteResult(routePoints, lynnRouteResult);
			} else if (villagerHouse2TomaStep) {
				const tomaRouteResult = await runBrowserRoute(page, routePoints, routeSettleTolerance);
				onRoute?.(`${interior.mapId}:${step.label}`, tomaRouteResult);
				currentPoint = assertVillagerHouse2TomaRouteResult(routePoints, tomaRouteResult);
			} else {
				currentPoint = await moveRoute(
					page,
					routePoints,
					routeSettleTolerance,
					undefined,
					(result) => onRoute?.(`${interior.mapId}:${step.label}`, result)
				);
			}
			if (isGuildHallGuildMasterSpineStep(interior, step)) {
				currentPoint = await convergeGuildHallTerminalCheckpointWithTrustedKeyboard(
					page,
					currentPoint,
					checkpoint
				);
			} else if (isGuildHallGuildMasterNorthStep(interior, step)) {
				currentPoint = await convergeGuildHallTerminalCheckpointWithTrustedKeyboard(
					page,
					currentPoint,
					checkpoint
				);
			} else if (isGuildHallCommonHallRoomStep(interior, step)) {
				const finalCheckpointRoutePoints = guildHallCommonHallRoomFinalCheckpointRoutePoints(
					currentPoint,
					checkpoint
				);
				assertTask6InteriorRouteEnvelope(
					'guild-hall',
					finalCheckpointRoutePoints,
					`${interior.mapId}:${step.label}:authored-checkpoint`
				);
				currentPoint = await moveRoute(
					page,
					finalCheckpointRoutePoints,
					INTERIOR_ROUTE_SETTLE_TOLERANCE,
					undefined,
					(result) => onRoute?.(`${interior.mapId}:${step.label}:authored-checkpoint`, result)
				);
			} else if (isGuildHallRecordsAisleHandoffStep(interior, step)) {
				const finalCheckpointRoutePoints = guildHallRecordsAisleFinalCheckpointRoutePoints(
					currentPoint,
					checkpoint
				);
				assertTask6InteriorRouteEnvelope(
					'guild-hall',
					finalCheckpointRoutePoints,
					`${interior.mapId}:${step.label}:authored-checkpoint`
				);
				currentPoint = await moveRoute(
					page,
					finalCheckpointRoutePoints,
					INTERIOR_ROUTE_SETTLE_TOLERANCE,
					undefined,
					(result) => onRoute?.(`${interior.mapId}:${step.label}:authored-checkpoint`, result)
				);
			}
		}
		if (semanticApproach) {
			expect(Math.abs(currentPoint.x - semanticApproach.stagingPoint.x)).toBeLessThanOrEqual(
				AXIS_REACH_TOLERANCE
			);
			expect(Math.abs(currentPoint.y - semanticApproach.stagingPoint.y)).toBeLessThanOrEqual(
				AXIS_REACH_TOLERANCE
			);
			currentPoint = await approachNpcWithTrustedKeyboard(page, semanticApproach);
		} else {
			await assertInteriorCheckpoint(page, interior, checkpoint);
		}
		if (step.interaction) {
			const pointBeforeInteraction = currentPoint;
			if (options.completeGuildMasterQuest && step.interaction.speaker === 'Guild Master Arlen') {
				await completeGuildMasterQuest(page);
			} else {
				await interactWithInteriorNpc(page, step.interaction);
			}
			const postInteraction = await currentHudPlayerEvidence(page, interior.mapId);
			if (semanticApproach) {
				expect(
					postInteraction.selectedPoint,
					`${step.interaction.speaker} interaction moved the player: ${JSON.stringify({
						pointBeforeInteraction,
						...postInteraction
					})}`
				).toEqual(pointBeforeInteraction);
			}
			// Interaction closes only HUD/dialogue surfaces; carry the newest
			// map-matched live point into the next interior route instead of the
			// nominal checkpoint or an older movement result.
			currentPoint = postInteraction.selectedPoint;
		}
		leavingInteraction = Boolean(step.interaction);
	}
	return exitInteriorWithTrustedKeyboard(page, interior);
}

async function saveGuildCheckpointAndReload(page: Page, point: Point): Promise<Point> {
	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Save Game' }).click();
	await expect(fieldStatus(page)).toContainText('Saved');
	const persisted = await page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
		SAVE_STORAGE_KEY
	);
	expect(persisted?.mapId).toBe('guild-hall');
	expect(Math.abs(persisted?.player?.x - point.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(persisted?.player?.y - point.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);

	await page.reload();
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
	await waitForHudPosition(page, 'guild-hall', point);
	const resumed = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseLastHudState ?? null
	);
	expect(resumed?.mapId).toBe('guild-hall');
	expect(Math.abs((resumed?.areaMap?.player?.x ?? 0) - point.x)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	expect(Math.abs((resumed?.areaMap?.player?.y ?? 0) - point.y)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	return {
		x: resumed?.areaMap?.player?.x ?? point.x,
		y: resumed?.areaMap?.player?.y ?? point.y
	};
}

async function enterInteriorWithTrustedKeyboard(page: Page, interior: InteriorGrayboxCase) {
	const exteriorState = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseLastHudState ?? null
	);
	expect(exteriorState?.mapId).toBe('meadow-entry');
	// Frontage proof is behavioral: select the newest authoritative Meadow
	// point by event timestamps, then prove the authored door transition with
	// real ArrowUp input. Do not compare a keyboard-quantized point to the
	// authored return coordinate before the transition.
	const convergedExterior = await page.evaluate(() => {
		const probeWindow = window as GlieseProbeWindow;
		const state = probeWindow.__glieseLastHudState ?? null;
		const diagnostic = probeWindow.__glieseLastMovementDiagnostic;
		const hudPlayer = state?.areaMap?.player;
		const hudAt = probeWindow.__glieseLastHudAt ?? 0;
		const movementAt = probeWindow.__glieseLastMovementAt ?? 0;
		const player =
			diagnostic?.mapId === 'meadow-entry' && movementAt >= hudAt
				? diagnostic.resolvedPosition
				: hudPlayer;
		return { state, player, diagnostic, hudAt, movementAt };
	});
	expect(convergedExterior.state?.mapId).toBe('meadow-entry');
	expect(convergedExterior.player).toEqual(
		expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
	);
	expect(interior.exteriorDoor.x).toBe(interior.returnArrival.x);
	expect(interior.returnArrival.y - interior.exteriorDoor.y).toBe(64);
	await page.locator('canvas').click();
	await page.keyboard.down('ArrowUp');
	try {
		await page.waitForFunction(
			({ requestedMapId, door, transitionReach }) => {
				const state = (window as GlieseProbeWindow).__glieseLastHudState;
				const diagnostics = (window as GlieseProbeWindow).__glieseMovementDiagnostics ?? [];
				return (
					state?.mapId === requestedMapId &&
					diagnostics.some(
						(diagnostic) =>
							diagnostic.mapId === 'meadow-entry' &&
							diagnostic.requestedPosition.y <= door.y + transitionReach
					)
				);
			},
			{
				requestedMapId: interior.mapId,
				door: interior.exteriorDoor,
				transitionReach: PLAYER_TRANSITION_REACH
			},
			{ timeout: 30_000 }
		);
	} finally {
		await page.keyboard.up('ArrowUp');
	}
	await waitForExactHudPosition(page, interior.mapId, interior.spawn);
	previousRouteSettleTolerance = AXIS_SETTLE_TOLERANCE;
	await page.evaluate(() => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseMovementDiagnostics = [];
		probeWindow.__glieseLastMovementDiagnostic = undefined;
		probeWindow.__glieseLastMovementAt = 0;
	});
}

async function exitInteriorWithTrustedKeyboard(
	page: Page,
	interior: InteriorGrayboxCase
): Promise<Point> {
	expect(interior.exit.x).toBe(interior.spawn.x);
	expect(interior.exit.y).toBeGreaterThan(interior.spawn.y);
	await page.locator('canvas').click();
	await page.keyboard.down('ArrowDown');
	try {
		await page.waitForFunction(
			({ requestedMapId, interiorMapId, exit }) => {
				const state = (window as GlieseProbeWindow).__glieseLastHudState;
				const diagnostics = (window as GlieseProbeWindow).__glieseMovementDiagnostics ?? [];
				return (
					state?.mapId === requestedMapId &&
					diagnostics.some(
						(diagnostic) =>
							diagnostic.mapId === interiorMapId && diagnostic.requestedPosition.y >= exit.y - 64
					)
				);
			},
			{ requestedMapId: 'meadow-entry', interiorMapId: interior.mapId, exit: interior.exit },
			{ timeout: 30_000 }
		);
	} finally {
		await page.keyboard.up('ArrowDown');
	}
	await waitForExactHudPosition(page, 'meadow-entry', interior.returnArrival);
	const state = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseLastHudState ?? null
	);
	expect(state?.mapId).toBe('meadow-entry');
	const player = state?.areaMap?.player;
	expect({ x: player?.x, y: player?.y }).toEqual(interior.returnArrival);
	const arrivalFacing = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseLastPlayerFacing ?? null
	);
	expect(arrivalFacing).toBe('down');

	await page.evaluate(() => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseMovementDiagnostics = [];
		probeWindow.__glieseLastMovementDiagnostic = undefined;
		probeWindow.__glieseLastMovementAt = 0;
	});
	const before = {
		x: typeof player?.x === 'number' ? player.x : interior.returnArrival.x,
		y: typeof player?.y === 'number' ? player.y : interior.returnArrival.y
	};
	await page.locator('canvas').click();
	await page.keyboard.down('ArrowDown');
	try {
		await page.waitForFunction(
			(previous) => {
				const state = (window as GlieseProbeWindow).__glieseLastHudState;
				const current = (window as GlieseProbeWindow).__glieseLastMovementDiagnostic
					?.resolvedPosition;
				return (
					state?.mapId === 'meadow-entry' &&
					typeof current?.x === 'number' &&
					typeof current.y === 'number' &&
					current.y > previous.y
				);
			},
			before,
			{ timeout: 5_000 }
		);
	} finally {
		await page.keyboard.up('ArrowDown');
	}
	const moved = await page.evaluate(() => {
		const probeWindow = window as GlieseProbeWindow;
		return {
			state: probeWindow.__glieseLastHudState ?? null,
			diagnostic: probeWindow.__glieseLastMovementDiagnostic ?? null
		};
	});
	expect(moved.state?.mapId).toBe('meadow-entry');
	expect(moved.diagnostic?.mapId).toBe('meadow-entry');
	expect(moved.diagnostic?.resolvedPosition.y).toBeGreaterThan(before.y);
	expect(moved.diagnostic?.blocked).toBe(false);
	const postWitness = moved.diagnostic?.resolvedPosition ?? moved.state?.areaMap?.player;
	expect(postWitness).toEqual(
		expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
	);
	return { x: postWitness!.x!, y: postWitness!.y! };
}

async function transitionWithTrustedKeyboard(
	page: Page,
	key: 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp',
	sourceMapId: string,
	transitionPoint: Point,
	targetMapId: string,
	arrival: Point
) {
	const liveMapId = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseLastHudState?.mapId ?? null
	);
	if (liveMapId === targetMapId) {
		await waitForExactHudPosition(page, targetMapId, arrival);
		previousRouteSettleTolerance = AXIS_SETTLE_TOLERANCE;
		await page.evaluate(() => {
			const probeWindow = window as GlieseProbeWindow;
			probeWindow.__glieseMovementDiagnostics = [];
			probeWindow.__glieseLastMovementDiagnostic = undefined;
			probeWindow.__glieseLastMovementAt = 0;
		});
		return;
	}
	expect(liveMapId, `Transition helper started on an unexpected map`).toBe(sourceMapId);
	await page.evaluate(
		({ requestedMapId, requestedPoint, transitionReach }) => {
			const probeWindow = window as GlieseProbeWindow;
			probeWindow.__glieseTransitionSourceCleanup?.();
			let settled = false;
			let timeoutId: number | undefined;
			let listener: ((event: Event) => void) | undefined;
			let resolveWait: (result: TransitionSourceWaitResult) => void = () => undefined;
			let sourceEventCount = 0;
			const sourceWaitStartedAt = performance.now();
			const finish = (result: TransitionSourceWaitResult) => {
				if (settled) return;
				settled = true;
				if (listener) window.removeEventListener('gliese:player-movement-diagnostic', listener);
				if (timeoutId !== undefined) window.clearTimeout(timeoutId);
				resolveWait({
					sourceWaitStartedAt,
					sourceWaitFinishedAt: performance.now(),
					...result
				});
			};
			const promise = new Promise<TransitionSourceWaitResult>((resolve) => {
				resolveWait = resolve;
				listener = (event: Event) => {
					const eventAt = performance.now();
					const diagnostic = (event as CustomEvent<PlayerMovementDiagnostic>).detail;
					if (diagnostic.mapId !== requestedMapId) return;
					sourceEventCount += 1;
					const resolved = diagnostic.resolvedPosition;
					if (
						!Number.isFinite(resolved.x) ||
						!Number.isFinite(resolved.y) ||
						Math.hypot(resolved.x - requestedPoint.x, resolved.y - requestedPoint.y) >
							transitionReach
					) {
						return;
					}
					finish({
						found: true,
						diagnostic,
						lastDiagnostic: diagnostic,
						hudMapId: probeWindow.__glieseLastHudState?.mapId ?? null,
						diagnosticCount: probeWindow.__glieseMovementDiagnostics?.length ?? 0,
						sourceEventCount,
						sourceDiagnosticAt: eventAt,
						sourceHudAt: probeWindow.__glieseLastHudAt ?? 0,
						sourceMovementAt: probeWindow.__glieseLastMovementAt ?? 0
					});
				};
				window.addEventListener('gliese:player-movement-diagnostic', listener);
				timeoutId = window.setTimeout(() => {
					finish({
						found: false,
						diagnostic: null,
						lastDiagnostic: probeWindow.__glieseLastMovementDiagnostic ?? null,
						hudMapId: probeWindow.__glieseLastHudState?.mapId ?? null,
						diagnosticCount: probeWindow.__glieseMovementDiagnostics?.length ?? 0,
						sourceEventCount,
						sourceDiagnosticAt: null,
						sourceHudAt: probeWindow.__glieseLastHudAt ?? 0,
						sourceMovementAt: probeWindow.__glieseLastMovementAt ?? 0
					});
				}, 30_000);
			});
			probeWindow.__glieseTransitionSourceWait = () => promise;
			probeWindow.__glieseTransitionSourceCleanup = () => {
				if (listener) window.removeEventListener('gliese:player-movement-diagnostic', listener);
				if (timeoutId !== undefined) window.clearTimeout(timeoutId);
				if (!settled) {
					finish({
						found: false,
						diagnostic: null,
						lastDiagnostic: probeWindow.__glieseLastMovementDiagnostic ?? null,
						hudMapId: probeWindow.__glieseLastHudState?.mapId ?? null,
						diagnosticCount: probeWindow.__glieseMovementDiagnostics?.length ?? 0,
						sourceEventCount,
						sourceDiagnosticAt: null,
						sourceHudAt: probeWindow.__glieseLastHudAt ?? 0,
						sourceMovementAt: probeWindow.__glieseLastMovementAt ?? 0
					});
				}
				delete probeWindow.__glieseTransitionSourceWait;
				delete probeWindow.__glieseTransitionSourceCleanup;
			};
		},
		{
			requestedMapId: sourceMapId,
			requestedPoint: transitionPoint,
			transitionReach: PLAYER_TRANSITION_REACH
		}
	);
	let sourceWait: TransitionSourceWaitResult;
	const transitionKeyLifecycle = {
		key,
		sourceMapId,
		targetMapId,
		transitionPoint,
		arrival,
		preflightMapId: liveMapId,
		preflightIssuedAt: Date.now(),
		keyDownIssuedAt: null as number | null,
		sourceWaitReturnedAt: null as number | null,
		keyUpIssuedAt: null as number | null
	};
	try {
		transitionKeyLifecycle.keyDownIssuedAt = Date.now();
		await page.keyboard.down(key);
		sourceWait = await page.evaluate(
			() =>
				(window as GlieseProbeWindow).__glieseTransitionSourceWait?.() ?? {
					found: false,
					diagnostic: null,
					lastDiagnostic: null,
					hudMapId: null,
					diagnosticCount: 0,
					sourceEventCount: 0
				}
		);
		transitionKeyLifecycle.sourceWaitReturnedAt = Date.now();
		if (!sourceWait.found) {
			throw new Error(
				`Source transition diagnostic did not reach trigger: ${JSON.stringify({
					sourceMapId,
					transitionPoint,
					transitionReach: PLAYER_TRANSITION_REACH,
					...sourceWait
				})}`
			);
		}
	} finally {
		await page.keyboard.up(key);
		transitionKeyLifecycle.keyUpIssuedAt = Date.now();
		await page.evaluate(() => (window as GlieseProbeWindow).__glieseTransitionSourceCleanup?.());
	}
	try {
		await page.waitForFunction(
			(requestedMapId) =>
				(window as GlieseProbeWindow).__glieseLastHudState?.mapId === requestedMapId,
			targetMapId,
			{ timeout: 30_000 }
		);
	} catch (error) {
		let targetWaitTelemetry: unknown;
		try {
			targetWaitTelemetry = await page.evaluate((saveStorageKey) => {
				const probeWindow = window as GlieseProbeWindow;
				const hud = probeWindow.__glieseLastHudState ?? null;
				let persistedClearedEncounterIds: unknown;
				try {
					const persisted = JSON.parse(localStorage.getItem(saveStorageKey) ?? 'null');
					persistedClearedEncounterIds = persisted?.flags?.clearedEncounters ?? null;
				} catch (parseError) {
					persistedClearedEncounterIds = `unreadable: ${String(parseError)}`;
				}
				return {
					hud: {
						mapId: hud?.mapId ?? null,
						player: hud?.areaMap?.player ?? null,
						status: hud?.status ?? null,
						dialogue: hud?.dialogue ?? null,
						battle: hud?.battle ?? null
					},
					hudAt: probeWindow.__glieseLastHudAt ?? 0,
					latestMovementDiagnostic: probeWindow.__glieseLastMovementDiagnostic ?? null,
					latestMovementAt: probeWindow.__glieseLastMovementAt ?? 0,
					routeRunner: probeWindow.__glieseRouteRunner?.active() ?? null,
					sceneEncounterState: probeWindow.__glieseSceneEncounterState ?? null,
					transitionGateState: probeWindow.__glieseTransitionGateState ?? null,
					persistedClearedEncounterIds
				};
			}, SAVE_STORAGE_KEY);
		} catch (telemetryError) {
			targetWaitTelemetry = { pageEvaluateError: String(telemetryError) };
		}
		throw new Error(
			`Transition target HUD wait timed out: ${JSON.stringify({
				targetMapId,
				transitionPoint,
				arrival,
				transitionKeyLifecycle,
				sourceWait,
				targetWaitError: String(error),
				targetWaitTelemetry
			})}`,
			{ cause: error }
		);
	}
	await waitForExactHudPosition(page, targetMapId, arrival);
	previousRouteSettleTolerance = AXIS_SETTLE_TOLERANCE;
	await page.evaluate(() => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseMovementDiagnostics = [];
		probeWindow.__glieseLastMovementDiagnostic = undefined;
		probeWindow.__glieseLastMovementAt = 0;
	});
}

async function moveAndResolveBattle(
	page: Page,
	key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
) {
	await page.keyboard.down(key);
	await page.waitForTimeout(2_000);
	await page.keyboard.up(key);

	const battleSummary = page.getByRole('dialog', { name: /battle summary/i });
	await expect(battleSummary).toBeVisible({ timeout: 30_000 });
	await expect(battleSummary.getByText(/Enemies defeated: (?:[1-9]|10)/i)).toBeVisible();
	await battleSummary.getByRole('button', { name: /continue/i }).click();
	await expect(battleSummary).toHaveCount(0);
}

const HERO_HOUSE_TO_CROSSROADS = [
	{ x: 704, y: 5_920 },
	{ x: 704, y: 6_080 },
	{ x: 320, y: 6_080 },
	{ x: 320, y: 5_920 },
	{ x: 320, y: 4_688 },
	{ x: 3_264, y: 4_688 },
	{ x: 3_776, y: 4_688 },
	{ x: 3_776, y: 4_480 }
] as const;

const CROSSROADS_TO_MISTFEN = [
	{ x: 3_776, y: 4_480 },
	{ x: 3_648, y: 4_480 },
	{ x: 3_648, y: 4_064 },
	{ x: 3_776, y: 4_064 },
	{ x: 3_776, y: 3_136 },
	{ x: 3_072, y: 3_136 },
	{ x: 2_320, y: 3_136 },
	{ x: 2_320, y: 2_784 }
] as const;

const CROSSROADS_TO_SILVERPINE = [
	{ x: 3_776, y: 4_480 },
	{ x: 3_648, y: 4_480 },
	{ x: 3_648, y: 4_064 },
	{ x: 3_776, y: 4_064 },
	{ x: 3_776, y: 2_432 },
	{ x: 3_440, y: 2_432 }
] as const;

const CROSSROADS_TO_WILDWOOD = [
	{ x: 3_776, y: 4_480 },
	{ x: 4_288, y: 4_480 },
	{ x: 4_288, y: 4_224 },
	{ x: 4_800, y: 4_224 },
	{ x: 4_800, y: 3_808 }
] as const;

const CROSSROADS_TO_COAST = [
	{ x: 3_776, y: 4_480 },
	{ x: 4_224, y: 4_480 },
	{ x: 4_224, y: 5_520 },
	{ x: 4_184, y: 5_520 },
	{ x: 4_184, y: 5_840 },
	{ x: 4_600, y: 5_840 }
] as const;

// Task 4's fallback route anchors. The browser proof stages one navigation
// step west of the authored bridge seam so endpoint residue cannot oscillate
// on the shared west-main-street/bridge boundary.
const FALLBACK_V2_HERO_HOUSE_TO_CROSSROADS = [
	{ x: 704, y: 5_920 },
	{ x: 704, y: 6_080 },
	{ x: 320, y: 6_080 },
	{ x: 320, y: 4_624 },
	{ x: 2_464, y: 4_624 },
	{ x: 3_744, y: 4_624 },
	{ x: 3_904, y: 4_624 },
	{ x: 3_904, y: 4_224 }
] as const;

test('village bridge browser seam staging stays source-safe', () => {
	const staging = villageBridgeWestStagingPoint();
	expect(FALLBACK_V2_HERO_HOUSE_TO_CROSSROADS[4]).toEqual(staging);
	expect(staging.x + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE).toBeLessThan(
		MEADOW_ENTRY_V2_CROSSINGS.sundropBridge.x
	);
});

test('first composed route collision preserves requested and resolved obstacle order', () => {
	const obstacles = [
		{ x: 20, y: 20, width: 4, height: 4 },
		{ x: 40, y: -2, width: 4, height: 4 },
		{ x: 70, y: -2, width: 4, height: 4 }
	] as const;
	const requestedCollision = firstIntersectingRouteObstacle(
		{ x: 0, y: 0 },
		{ x: 100, y: 0 },
		obstacles,
		0
	);
	const resolvedCollision = firstIntersectingRouteObstacle(
		{ x: 60, y: 0 },
		{ x: 100, y: 0 },
		obstacles,
		0
	);

	expect(firstIntersectingRouteObstacle({ x: 0, y: 0 }, { x: 10, y: 0 }, obstacles, 0)).toBeNull();
	expect(requestedCollision).toBe(obstacles[1]);
	expect(resolvedCollision).toBe(obstacles[2]);
});

test('scene state probe preserves minified dollar-prefixed identifiers', () => {
	const rewritten = rewriteSceneStateProbeSource(
		'this.setupEncounters(e),this.renderTransitions(e);$a=this.hasLivingEnemies();for(let $b of $c.transitions)'
	);

	expect(rewritten).toContain('this.setupEncounters(e),globalThis.__glieseSceneEncounterState=');
	expect(rewritten).toContain(',this.renderTransitions(e)');
	expect(rewritten).toContain('$a=this.hasLivingEnemies();');
	expect(rewritten).toContain('hasLivingEnemies:$a,');
	expect(rewritten).toContain('for(let $b of $c.transitions)');
	expect(rewritten).not.toContain('hasLivingEnemies:a');

	const standardIdentifiers = rewriteSceneStateProbeSource(
		'this.setupEncounters(e),this.renderTransitions(e);living=this.hasLivingEnemies();for(let transition of map.transitions)'
	);
	expect(standardIdentifiers).toContain('hasLivingEnemies:living,');
	expect(standardIdentifiers).toContain('for(let transition of map.transitions)');
});

test('Item Shop stockroom entry checks only its initial fixed-x northward phase', () => {
	const routeStart = { x: 448, y: 301.60239999999817 };
	const target = { x: 448, y: 160 };
	const points = itemShopStockroomEntryRoutePoints(routeStart, target);
	const initialNorthwardDiagnostic: PlayerMovementDiagnostic = {
		mapId: 'item-shop',
		previousPosition: routeStart,
		requestedPosition: { x: 448, y: 138.83440000000107 },
		resolvedPosition: { x: 448, y: 138.83440000000107 },
		blocked: false
	};
	const finalSouthwardDiagnostic: PlayerMovementDiagnostic = {
		mapId: 'item-shop',
		previousPosition: initialNorthwardDiagnostic.resolvedPosition,
		requestedPosition: { x: 448, y: 166.62400000000162 },
		resolvedPosition: { x: 448, y: 166.62400000000162 },
		blocked: false
	};
	const result: BrowserRouteResult = {
		token: 'characterization-item-shop-stockroom-entry-two-phase',
		mapId: 'item-shop',
		status: 'done',
		pointIndex: points.length,
		axis: null,
		position: finalSouthwardDiagnostic.resolvedPosition,
		target: null,
		lastDiagnostic: finalSouthwardDiagnostic,
		axisHistory: ['y'],
		diagnostics: [initialNorthwardDiagnostic, finalSouthwardDiagnostic],
		invalidDiagnostics: [],
		diagnosticAxes: ['y', 'y'],
		activeKey: null
	};

	expect(() => assertItemShopStockroomEntryRouteContract(points, result)).not.toThrow();
});

const FALLBACK_V2_CROSSROADS_TO_MISTFEN = [
	{ x: 3_904, y: 4_224 },
	{ x: 3_904, y: 3_648 },
	{ x: 2_240, y: 3_648 }
] as const;

const FALLBACK_V2_CROSSROADS_TO_SILVERPINE = [
	{ x: 3_904, y: 4_224 },
	{ x: 3_904, y: 2_416 }
] as const;

const FALLBACK_V2_CROSSROADS_TO_WILDWOOD = [
	{ x: 3_904, y: 4_224 },
	{ x: 3_904, y: 3_168 },
	{ x: 4_992, y: 3_168 },
	{ x: 4_992, y: 3_904 }
] as const;

const FALLBACK_V2_CROSSROADS_TO_COAST = [
	{ x: 3_904, y: 4_224 },
	{ x: 4_224, y: 4_224 },
	{ x: 4_224, y: 5_120 }
] as const;

// This is the Task 6 journey's only save seed: these six authored encounter
// identities are cleared solely to unlock existing requiresClear transitions
// (including the Ruins Core return). Browser combat is explicitly out of this
// package's scope; no later coordinate reseed is claimed.
const TASK6_INITIAL_CLEARED_ENCOUNTERS = [
	'threshold-slime-west',
	'threshold-slime-east',
	'meadow-slime-west',
	'meadow-slime-center',
	'meadow-slime-east',
	'ruins-warden'
] as const;

const SILVERPINE_OPTIONAL_CACHE_TARGET = { x: 3_260, y: 720 } as const;
const MEADOW_ENTRY_NAVIGATION_STEP = 16;
const MEADOW_ENTRY_TRANSIT_COLLISION_PADDING = PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE;
const COAST_FERRY_DISCOVERY = { x: 3_600, y: 5_500 } as const;
const COAST_FERRY_TRANSIT_COLLISION_PADDING = PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE;
const WILDWOOD_CAVE_ANCHOR = { x: 5_760, y: 1_868 } as const;
const WILDWOOD_CAVE_STAGING = { x: 5_960, y: 2_100 } as const;
const WILDWOOD_LANDMARK_DOORWAY_CLEARANCE_WIDTH = 56;
const WILDWOOD_TRANSITION_RADIUS = 18;
const WILDWOOD_FOREST_LANE_WEST_BANK_ID = 'wildwood-forest-lane-west-bank';
const WILDWOOD_POST_RUINS_TARGET = { x: 4_800, y: 3_808 } as const;
const LOWER_RIVER_ID = 'lower-river';
const POST_RUINS_LOWER_RIVER_TARGET = { x: 3_264, y: 4_688 } as const;

function villageBridgeWestStagingPoint(): Point {
	const bridge = MEADOW_ENTRY_V2_CROSSINGS.sundropBridge;
	const x =
		Math.floor(
			(bridge.x - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1) / MEADOW_ENTRY_NAVIGATION_STEP
		) * MEADOW_ENTRY_NAVIGATION_STEP;
	const y = bridge.y + bridge.height / 2;
	expect(x).toBe(2_464);
	expect(y).toBe(4_624);
	expect(x + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE).toBeLessThan(bridge.x);
	return { x, y };
}

function villagerHouse2OutdoorApproachRoutePoints(
	currentPoint: Point,
	targetPoint: Point
): { vertical: [Point, Point] } {
	const building = SUNDROP_VILLAGE_V2_BUILDINGS.villagerHouse2;
	const mainStreet = SUNDROP_VILLAGE_V2_PUBLIC_SPACES.mainStreet;
	const approach = building.approach;
	const authoredArrival = {
		x: building.returnArrival.x,
		y: building.returnArrival.y
	};
	const safeApproachMinX = approach.x + PLAYER_COLLISION_RADIUS;
	const safeApproachMaxX = approach.x + approach.width - PLAYER_COLLISION_RADIUS;

	expect(targetPoint.x).toBe(authoredArrival.x);
	expect(targetPoint.y).toBe(authoredArrival.y);
	expect(layoutRectContainsPoint(mainStreet, currentPoint)).toBe(true);
	expect(currentPoint.y).toBeGreaterThan(approach.y + approach.height);
	expect(currentPoint.x).toBeGreaterThanOrEqual(safeApproachMinX);
	expect(currentPoint.x).toBeLessThanOrEqual(safeApproachMaxX);
	expect(Math.abs(currentPoint.x - authoredArrival.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(layoutRectContainsPoint(approach, authoredArrival)).toBe(true);

	// The south-lane handoff is already inside the source approach's safe x
	// band. Preserve that actual x while moving north; the footprint ends above
	// the authored return-arrival y, so this fixed-axis segment is collision-free.
	const verticalDestination = { x: currentPoint.x, y: authoredArrival.y };
	expect(
		routeSegmentIntersectsExpandedRect(
			currentPoint,
			verticalDestination,
			building.footprint,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(false);
	return { vertical: [currentPoint, verticalDestination] };
}

function wildwoodCaveDoorwayGeometry() {
	const landmark = meadowEntryMap.landmarks?.find(({ id }) => id === 'whispering-cave');
	const transition = meadowEntryMap.transitions.find(
		({ id }) => id === 'meadow-to-whispering-cave-ruins-threshold'
	);
	expect(landmark).toMatchObject({
		id: 'whispering-cave',
		x: 5_960,
		y: 1_800,
		width: 256,
		height: 224
	});
	expect(transition).toMatchObject({
		id: 'meadow-to-whispering-cave-ruins-threshold',
		x: 5_960,
		y: 1_868
	});
	if (!landmark || !transition) {
		throw new Error('Wildwood cave landmark/transition source is incomplete');
	}
	const bounds = {
		left: landmark.x - landmark.width / 2,
		top: landmark.y - landmark.height / 2,
		right: landmark.x + landmark.width / 2,
		bottom: landmark.y + landmark.height / 2
	};
	const doorLeft = transition.x - WILDWOOD_LANDMARK_DOORWAY_CLEARANCE_WIDTH / 2;
	const doorRight = transition.x + WILDWOOD_LANDMARK_DOORWAY_CLEARANCE_WIDTH / 2;
	const doorTop = Math.max(bounds.top, transition.y - WILDWOOD_TRANSITION_RADIUS);
	const collisionRects = [
		{
			x: bounds.left,
			y: bounds.top,
			width: bounds.right - bounds.left,
			height: doorTop - bounds.top
		},
		{ x: bounds.left, y: doorTop, width: doorLeft - bounds.left, height: bounds.bottom - doorTop },
		{ x: doorRight, y: doorTop, width: bounds.right - doorRight, height: bounds.bottom - doorTop }
	].filter(({ width, height }) => width > 0 && height > 0);
	const minX = doorLeft + PLAYER_COLLISION_RADIUS;
	const maxXExclusive = doorRight - PLAYER_COLLISION_RADIUS;
	expect({ minX, maxXExclusive }).toEqual({ minX: 5_944, maxXExclusive: 5_976 });
	expect(collisionRects).toHaveLength(3);
	return {
		landmarkRect: {
			x: bounds.left,
			y: bounds.top,
			width: bounds.right - bounds.left,
			height: bounds.bottom - bounds.top
		},
		collisionRects,
		minX,
		maxXExclusive,
		doorTop
	};
}

function wildwoodForestLaneWestBankRect() {
	const sourceBlocker = meadowEntryMap.blockers?.find(
		({ id }) => id === WILDWOOD_FOREST_LANE_WEST_BANK_ID
	);
	expect(sourceBlocker).toMatchObject({
		id: WILDWOOD_FOREST_LANE_WEST_BANK_ID,
		x: 5_040,
		y: 4_250,
		width: 64,
		height: 2_100
	});
	if (!sourceBlocker) {
		throw new Error(`Missing authored Wildwood bank blocker: ${WILDWOOD_FOREST_LANE_WEST_BANK_ID}`);
	}
	// MapRect coordinates are centers in the authored source; the route geometry
	// helpers consume top-left rectangles, matching WorldScene's bounds math.
	return {
		x: sourceBlocker.x - sourceBlocker.width / 2,
		y: sourceBlocker.y - sourceBlocker.height / 2,
		width: sourceBlocker.width,
		height: sourceBlocker.height
	};
}

function postRuinsWildwoodBankRoutePoints(start: Point): Point[] {
	const bank = wildwoodForestLaneWestBankRect();
	const safeRow = bank.y - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 2;
	const safeWestX =
		Math.floor(
			(bank.x - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1) / MEADOW_ENTRY_NAVIGATION_STEP
		) * MEADOW_ENTRY_NAVIGATION_STEP;
	const wildwoodMouth = FALLBACK_V2_CROSSROADS_TO_WILDWOOD.at(-1)!;
	expect(safeRow).toBe(3_168);
	expect(safeWestX).toBe(4_976);
	// The unchanged reach residue after the westward staging leg must still leave
	// the player's circle strictly west of the authored bank's raw left edge.
	expect(safeWestX + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE).toBeLessThan(bank.x);
	expect(wildwoodMouth).toEqual({ x: 4_992, y: 3_904 });
	// The authored mouth remains an exact, source-backed canonical anchor. The
	// post-Ruins detour proves it without issuing a redundant eastward correction
	// from a live west-staging residue that can overshoot the padded bank.
	expect(meadowEntryPointIsWalkable(wildwoodMouth, PLAYER_COLLISION_RADIUS)).toBe(true);
	expect(start.x - PLAYER_COLLISION_RADIUS).toBeGreaterThan(bank.x + bank.width);

	const points = [
		{ ...start },
		{ x: start.x, y: safeRow },
		{ x: safeWestX, y: safeRow },
		{ x: safeWestX, y: wildwoodMouth.y },
		{ x: WILDWOOD_POST_RUINS_TARGET.x, y: wildwoodMouth.y },
		{ ...WILDWOOD_POST_RUINS_TARGET }
	];
	for (let index = 1; index < points.length; index += 1) {
		const from = points[index - 1]!;
		const to = points[index]!;
		expect(from.x === to.x || from.y === to.y).toBe(true);
		if (from.x === to.x) {
			// A vertical input preserves the settled x exactly. Prove only the
			// actual player circle and the y-axis endpoint residue; do not invent
			// an orthogonal ±reach envelope for the held axis.
			expect(routeSegmentIntersectsExpandedRect(from, to, bank, PLAYER_COLLISION_RADIUS)).toBe(
				false
			);
			expect(endpointYEnvelopeIsDisjointFromExpandedRect(to, bank, PLAYER_COLLISION_RADIUS)).toBe(
				true
			);
			continue;
		}
		if (from.y === to.y) {
			// A horizontal input preserves the settled y exactly, with only the
			// active x axis retaining its endpoint residue.
			expect(routeSegmentIntersectsExpandedRect(from, to, bank, PLAYER_COLLISION_RADIUS)).toBe(
				false
			);
			expect(endpointXEnvelopeIsDisjointFromExpandedRect(to, bank, PLAYER_COLLISION_RADIUS)).toBe(
				true
			);
			continue;
		}
		expect(
			routeSegmentIntersectsExpandedRectAtReachEnvelope(from, to, bank, PLAYER_COLLISION_RADIUS)
		).toBe(false);
	}
	return points;
}

function assertPostRuinsWildwoodBankRouteContract(
	points: readonly Point[],
	result: BrowserRouteResult,
	label: string
) {
	const bank = wildwoodForestLaneWestBankRect();
	const wildwoodMouth = FALLBACK_V2_CROSSROADS_TO_WILDWOOD.at(-1)!;
	const safeWestX = points[2]!.x;
	const safeRow = points[2]!.y;
	expect(safeWestX).toBe(4_976);
	expect(safeRow).toBe(3_168);
	expect(safeWestX + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE).toBeLessThan(bank.x);
	// The exact mouth remains a canonical authored anchor, but this post-Ruins
	// bank detour intentionally does not revisit it with live eastward input.
	expect(wildwoodMouth).toEqual({ x: 4_992, y: 3_904 });
	expect(meadowEntryPointIsWalkable(wildwoodMouth, PLAYER_COLLISION_RADIUS)).toBe(true);
	expect(points).not.toContainEqual({ x: wildwoodMouth.x, y: wildwoodMouth.y });
	expect(result.status, `${label} status`).toBe('done');
	expect(result.mapId, `${label} map`).toBe('meadow-entry');
	expect(result.activeKey, `${label} active key`).toBeNull();
	expect(result.invalidDiagnostics ?? [], `${label} invalid diagnostics`).toEqual([]);
	const diagnostics = result.diagnostics ?? [];
	const diagnosticAxes = result.diagnosticAxes ?? [];
	expect(diagnosticAxes, `${label} diagnostic axes`).toHaveLength(diagnostics.length);
	const routeSegments = points.slice(1).map((to, index) => ({ from: points[index]!, to }));
	const matchesAxisRouteSegment = (point: Point, from: Point, to: Point, axis: Axis) => {
		const segmentAxis: Axis = from.x === to.x ? 'y' : 'x';
		if (segmentAxis !== axis) return false;
		const fixedAxis: 'x' | 'y' = axis === 'x' ? 'y' : 'x';
		const activeAxis: 'x' | 'y' = axis;
		const lower = Math.min(from[activeAxis], to[activeAxis]) - AXIS_REACH_TOLERANCE;
		const upper = Math.max(from[activeAxis], to[activeAxis]) + AXIS_REACH_TOLERANCE;
		return (
			Math.abs(point[fixedAxis] - from[fixedAxis]) <= AXIS_REACH_TOLERANCE &&
			point[activeAxis] >= lower &&
			point[activeAxis] <= upper
		);
	};
	let previousResolved = points[0]!;
	for (const [index, diagnostic] of diagnostics.entries()) {
		const axis = diagnosticAxes[index]!;
		expect(diagnostic.mapId, `${label} diagnostic ${index} map`).toBe('meadow-entry');
		expect(diagnostic.blocked, `${label} diagnostic ${index} blocked`).toBe(false);
		expect(diagnostic.previousPosition, `${label} diagnostic ${index} continuity`).toEqual(
			previousResolved
		);
		expect(
			[
				diagnostic.previousPosition,
				diagnostic.requestedPosition,
				diagnostic.resolvedPosition
			].every((point) =>
				routeSegments.some(({ from, to }) => matchesAxisRouteSegment(point, from, to, axis))
			),
			`${label} diagnostic ${index} route mapping`
		).toBe(true);
		if (
			axis === 'y' &&
			Math.abs(diagnostic.previousPosition.x - safeWestX) <= AXIS_REACH_TOLERANCE &&
			diagnostic.previousPosition.y >= safeRow
		) {
			// This is the descent after west staging. Its actual frame residue,
			// rather than a nominal target, must remain strictly west of the bank.
			expect(
				diagnostic.previousPosition.x + PLAYER_COLLISION_RADIUS,
				`${label} diagnostic ${index} staging x`
			).toBeLessThan(bank.x);
			expect(
				diagnostic.resolvedPosition.x + PLAYER_COLLISION_RADIUS,
				`${label} diagnostic ${index} resolved staging x`
			).toBeLessThan(bank.x);
		}
		expect(
			routeSegmentIntersectsExpandedRect(
				diagnostic.previousPosition,
				diagnostic.requestedPosition,
				bank,
				PLAYER_COLLISION_RADIUS
			),
			`${label} diagnostic ${index} swept bank`
		).toBe(false);
		expect(
			routeSegmentIntersectsExpandedRect(
				diagnostic.previousPosition,
				diagnostic.resolvedPosition,
				bank,
				PLAYER_COLLISION_RADIUS
			),
			`${label} diagnostic ${index} resolved bank`
		).toBe(false);
		previousResolved = diagnostic.resolvedPosition;
	}
	const actual = result.position;
	expect(actual, `${label} final point`).not.toBeNull();
	if (!actual) throw new Error(`${label} returned no final position`);
	expect(Math.abs(actual.x - WILDWOOD_POST_RUINS_TARGET.x), `${label} final x`).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	expect(Math.abs(actual.y - WILDWOOD_POST_RUINS_TARGET.y), `${label} final y`).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	expect(
		routeSegmentIntersectsExpandedRect(actual, actual, bank, PLAYER_COLLISION_RADIUS),
		`${label} final bank collision`
	).toBe(false);
	expect(points.at(-1)).toEqual(WILDWOOD_POST_RUINS_TARGET);
}

function lowerRiverLayoutRect() {
	const sourceSegment = MEADOW_ENTRY_V2_RIVER_SEGMENTS.find(({ id }) => id === LOWER_RIVER_ID);
	expect(sourceSegment).toEqual({
		id: LOWER_RIVER_ID,
		rect: { x: 2_784, y: 3_744, width: 480, height: 768 }
	});
	if (!sourceSegment) {
		throw new Error(`Missing authored Meadow river segment: ${LOWER_RIVER_ID}`);
	}
	return sourceSegment.rect;
}

function postRuinsLowerRiverEastHandoffSafeBand(): {
	min: number;
	maxExclusive: number;
} {
	const southApproach = MEADOW_ENTRY_V2_ROUTE_PATCHES.find(
		({ id }) => id === 'crossroads-south-approach'
	);
	const sundropBridge = MEADOW_ENTRY_V2_CROSSINGS.sundropBridge;
	expect(southApproach).toMatchObject({
		id: 'crossroads-south-approach',
		rect: { x: 3_360, y: 4_448, width: 384, height: 320 }
	});
	if (!southApproach) {
		throw new Error('Missing authored crossroads south-approach route patch');
	}
	const min = southApproach.rect.y;
	const maxExclusive = sundropBridge.y - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE;
	// The live handoff must remain on the authored south-approach row and below
	// the bridge's unchanged player/reach envelope. This is a test-route band,
	// not a new map collision or movement tolerance.
	expect({ min, maxExclusive }).toEqual({ min: 4_448, maxExclusive: 4_482 });
	return { min, maxExclusive };
}

function postRuinsLowerRiverEastHandoffTransitRow(): number {
	const { min, maxExclusive } = postRuinsLowerRiverEastHandoffSafeBand();
	const transitRow =
		Math.floor((maxExclusive - MEADOW_ENTRY_NAVIGATION_STEP - 1) / MEADOW_ENTRY_NAVIGATION_STEP) *
		MEADOW_ENTRY_NAVIGATION_STEP;
	// Keep one authored navigation step below the exclusive bridge envelope so
	// the live endpoint's unchanged ±18 residue cannot re-enter the failed row.
	expect(transitRow).toBe(4_464);
	expect(transitRow).toBeGreaterThanOrEqual(min);
	expect(transitRow).toBeLessThan(maxExclusive);
	return transitRow;
}

function meadowEntryComposedRouteCollisionRects() {
	// collectStrictCollisionRects/collectLandmarkRects use center-based map
	// rectangles, while the route sweep oracle consumes top-left rectangles.
	return MEADOW_ENTRY_COMPOSED_COLLISION_RECTS.map(({ x, y, width, height }) => ({
		x: x - width / 2,
		y: y - height / 2,
		width,
		height
	}));
}

function firstIntersectingRouteObstacle(
	from: Point,
	to: Point,
	obstacles: readonly { x: number; y: number; width: number; height: number }[],
	padding: number
): { x: number; y: number; width: number; height: number } | null {
	for (const obstacle of obstacles) {
		if (routeSegmentIntersectsExpandedRect(from, to, obstacle, padding)) return obstacle;
	}
	return null;
}

function assertVillageBridgeRoutePhaseContract(
	points: readonly Point[],
	result: BrowserRouteResult,
	label: string
): void {
	const obstacles = meadowEntryComposedRouteCollisionRects();
	expect(result.status, `${label} status`).toBe('done');
	expect(result.mapId, `${label} map`).toBe('meadow-entry');
	expect(result.activeKey ?? null, `${label} active key`).toBeNull();
	expect(result.invalidDiagnostics ?? [], `${label} invalid diagnostics`).toEqual([]);
	const diagnostics = result.diagnostics ?? [];
	expect(diagnostics.length, `${label} diagnostics`).toBeGreaterThan(0);
	let previousResolved = points[0]!;
	for (const [index, diagnostic] of diagnostics.entries()) {
		const diagnosticLabel = `${label} diagnostic ${index}`;
		expect(diagnostic.mapId, `${diagnosticLabel} map`).toBe('meadow-entry');
		expect(diagnostic.blocked, `${diagnosticLabel} blocked`).toBe(false);
		expect(diagnostic.previousPosition, `${diagnosticLabel} continuity`).toEqual(previousResolved);
		const requestedCollision = firstIntersectingRouteObstacle(
			diagnostic.previousPosition,
			diagnostic.requestedPosition,
			obstacles,
			PLAYER_COLLISION_RADIUS
		);
		expect(
			requestedCollision,
			`${diagnosticLabel} requested sweep crossed composed collision: ${JSON.stringify(requestedCollision)}`
		).toBeNull();
		const resolvedCollision = firstIntersectingRouteObstacle(
			diagnostic.previousPosition,
			diagnostic.resolvedPosition,
			obstacles,
			PLAYER_COLLISION_RADIUS
		);
		expect(
			resolvedCollision,
			`${diagnosticLabel} resolved sweep crossed composed collision: ${JSON.stringify(resolvedCollision)}`
		).toBeNull();
		previousResolved = diagnostic.resolvedPosition;
	}
	expect(result.lastDiagnostic, `${label} last diagnostic`).toEqual(diagnostics.at(-1));
	expect(result.position, `${label} final position`).toEqual(previousResolved);
}

function postRuinsLowerRiverEastVerticalHandoffRoutePoints(start: Point): Point[] {
	const transitRow = postRuinsLowerRiverEastHandoffTransitRow();
	const points = [{ ...start }, { x: 4_288, y: 4_224 }, { x: 4_288, y: transitRow }];
	for (let index = 1; index < points.length; index += 1) {
		const from = points[index - 1]!;
		const to = points[index]!;
		for (const obstacle of meadowEntryComposedRouteCollisionRects()) {
			expect(
				routeSegmentIntersectsExpandedRect(from, to, obstacle, PLAYER_COLLISION_RADIUS),
				`lower-river east vertical handoff crossed composed collision: ${JSON.stringify({ from, to, obstacle })}`
			).toBe(false);
		}
	}
	return points;
}

function postRuinsLowerRiverEastHorizontalHandoffRoutePoints(start: Point): Point[] {
	const { min, maxExclusive } = postRuinsLowerRiverEastHandoffSafeBand();
	expect(start.y).toBeGreaterThanOrEqual(min);
	expect(start.y).toBeLessThan(maxExclusive);
	const points = [{ ...start }, { x: 3_776, y: start.y }];
	for (const obstacle of meadowEntryComposedRouteCollisionRects()) {
		expect(
			routeSegmentIntersectsExpandedRectAtReachEnvelope(
				points[0]!,
				points[1]!,
				obstacle,
				PLAYER_COLLISION_RADIUS
			),
			`lower-river east horizontal handoff crossed composed collision: ${JSON.stringify({ from: points[0], to: points[1], obstacle })}`
		).toBe(false);
	}
	return points;
}

function assertPostRuinsLowerRiverEastHandoffPhaseContract(
	points: readonly Point[],
	result: BrowserRouteResult,
	phase: 'vertical' | 'horizontal',
	label: string
) {
	const { min, maxExclusive } = postRuinsLowerRiverEastHandoffSafeBand();
	const obstacles = meadowEntryComposedRouteCollisionRects();
	expect(result.status, `${label} status`).toBe('done');
	expect(result.mapId, `${label} map`).toBe('meadow-entry');
	expect(result.activeKey ?? null, `${label} active key`).toBeNull();
	expect(result.invalidDiagnostics ?? [], `${label} invalid diagnostics`).toEqual([]);
	expect(result.position, `${label} final position`).not.toBeNull();
	if (!result.position) throw new Error(`${label} returned no final position`);

	const target = points.at(-1)!;
	expect(target, `${label} target`).toBeDefined();
	if (phase === 'vertical') {
		expect(target).toEqual({ x: 4_288, y: postRuinsLowerRiverEastHandoffTransitRow() });
		expect(Math.abs(result.position.x - target.x), `${label} final x`).toBeLessThanOrEqual(
			AXIS_REACH_TOLERANCE
		);
	} else {
		expect(points[0]?.y, `${label} fixed-y start`).toBe(target.y);
		expect(result.position.y, `${label} fixed-y final`).toBe(target.y);
		expect(Math.abs(result.position.x - target.x), `${label} final x`).toBeLessThanOrEqual(
			AXIS_REACH_TOLERANCE
		);
	}
	expect(result.position.y, `${label} staging y lower bound`).toBeGreaterThanOrEqual(min);
	expect(result.position.y, `${label} staging y upper bound`).toBeLessThan(maxExclusive);

	const diagnostics = result.diagnostics ?? [];
	expect(diagnostics.length, `${label} diagnostic count`).toBeGreaterThan(0);
	let previousResolved = points[0]!;
	for (const [index, diagnostic] of diagnostics.entries()) {
		const diagnosticLabel = `${label} diagnostic ${index}`;
		expect(diagnostic.mapId, `${diagnosticLabel} map`).toBe('meadow-entry');
		expect(diagnostic.blocked, `${diagnosticLabel} blocked`).toBe(false);
		expect(diagnostic.previousPosition, `${diagnosticLabel} continuity`).toEqual(previousResolved);
		const requestedCollision = firstIntersectingRouteObstacle(
			diagnostic.previousPosition,
			diagnostic.requestedPosition,
			obstacles,
			PLAYER_COLLISION_RADIUS
		);
		expect(
			requestedCollision,
			`${diagnosticLabel} requested sweep crossed composed collision: ${JSON.stringify(requestedCollision)}`
		).toBeNull();
		const resolvedCollision = firstIntersectingRouteObstacle(
			diagnostic.previousPosition,
			diagnostic.resolvedPosition,
			obstacles,
			PLAYER_COLLISION_RADIUS
		);
		expect(
			resolvedCollision,
			`${diagnosticLabel} resolved sweep crossed composed collision: ${JSON.stringify(resolvedCollision)}`
		).toBeNull();
		const resolvedEndpointCollision = firstIntersectingRouteObstacle(
			diagnostic.resolvedPosition,
			diagnostic.resolvedPosition,
			obstacles,
			PLAYER_COLLISION_RADIUS
		);
		expect(
			resolvedEndpointCollision,
			`${diagnosticLabel} resolved endpoint entered composed collision: ${JSON.stringify(resolvedEndpointCollision)}`
		).toBeNull();
		if (phase === 'horizontal') {
			expect(diagnostic.previousPosition.y, `${diagnosticLabel} previous y`).toBe(target.y);
			expect(diagnostic.requestedPosition.y, `${diagnosticLabel} requested y`).toBe(target.y);
			expect(diagnostic.resolvedPosition.y, `${diagnosticLabel} resolved y`).toBe(target.y);
			expect(
				(diagnostic.resolvedPosition.x - diagnostic.previousPosition.x) * -1,
				`${diagnosticLabel} strict westward progress`
			).toBeGreaterThan(0);
		}
		previousResolved = diagnostic.resolvedPosition;
	}
	expect(result.lastDiagnostic, `${label} last diagnostic`).toEqual(diagnostics.at(-1));
	expect(result.position, `${label} diagnostic endpoint`).toEqual(previousResolved);
}

function postRuinsLowerRiverCrossingRoutePoints(start: Point): Point[] {
	const lowerRiver = lowerRiverLayoutRect();
	const expandedRight = lowerRiver.x + lowerRiver.width + PLAYER_COLLISION_RADIUS;
	const expandedBottom = lowerRiver.y + lowerRiver.height + PLAYER_COLLISION_RADIUS;
	expect(start.x - PLAYER_COLLISION_RADIUS).toBeGreaterThan(lowerRiver.x + lowerRiver.width);
	const points = [
		{ ...start },
		{ x: start.x, y: POST_RUINS_LOWER_RIVER_TARGET.y },
		{ ...POST_RUINS_LOWER_RIVER_TARGET }
	];
	expect(points[1]!.x).toBeGreaterThan(expandedRight);
	expect(points[1]!.y - AXIS_REACH_TOLERANCE).toBeGreaterThan(expandedBottom);
	// The first leg keeps its actual x fixed while moving south. Its player
	// circle and swept segment are east of the expanded river; no hypothetical
	// orthogonal endpoint residue is applied to this fixed-axis passage.
	expect(
		routeSegmentIntersectsExpandedRect(points[0]!, points[1]!, lowerRiver, PLAYER_COLLISION_RADIUS)
	).toBe(false);
	expect(
		endpointYEnvelopeIsDisjointFromExpandedRect(points[1]!, lowerRiver, PLAYER_COLLISION_RADIUS)
	).toBe(true);
	// Only after the actual y is below the expanded river bottom does the
	// westward leg use the normal reach envelope.
	expect(
		routeSegmentIntersectsExpandedRectAtReachEnvelope(
			points[1]!,
			points[2]!,
			lowerRiver,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(false);
	return points;
}

function assertPostRuinsLowerRiverCrossingRouteContract(
	points: readonly Point[],
	result: BrowserRouteResult,
	label: string
) {
	const lowerRiver = lowerRiverLayoutRect();
	expect(result.status, `${label} status`).toBe('done');
	expect(result.mapId, `${label} map`).toBe('meadow-entry');
	expect(result.activeKey, `${label} active key`).toBeNull();
	for (const [index, diagnostic] of (result.diagnostics ?? []).entries()) {
		expect(diagnostic.mapId, `${label} diagnostic ${index} map`).toBe('meadow-entry');
		expect(diagnostic.blocked, `${label} diagnostic ${index} blocked`).toBe(false);
		expect(
			routeSegmentIntersectsExpandedRect(
				diagnostic.previousPosition,
				diagnostic.requestedPosition,
				lowerRiver,
				PLAYER_COLLISION_RADIUS
			),
			`${label} diagnostic ${index} swept lower river`
		).toBe(false);
	}
	const actual = result.position;
	expect(actual, `${label} final point`).not.toBeNull();
	if (!actual) throw new Error(`${label} returned no final position`);
	expect(
		Math.abs(actual.x - POST_RUINS_LOWER_RIVER_TARGET.x),
		`${label} final x`
	).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(
		Math.abs(actual.y - POST_RUINS_LOWER_RIVER_TARGET.y),
		`${label} final y`
	).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(
		routeSegmentIntersectsExpandedRect(actual, actual, lowerRiver, PLAYER_COLLISION_RADIUS),
		`${label} final lower-river collision`
	).toBe(false);
	expect(points.at(-1)).toEqual(POST_RUINS_LOWER_RIVER_TARGET);
}

const SILVERPINE_AUTHORED_GROUND_PATCH_IDS = new Set([
	'crossroads-to-silverpine',
	'silverpine-south-approach',
	'silverpine-north-approach',
	'silverpine-stair-path',
	'silverpine-lower-approach',
	'silverpine-bend-west',
	'silverpine-bend-east',
	'silverpine-grove-floor',
	'silverpine-side-grove-floor',
	'silverpine-shrine-terrace',
	'silverpine-terrace-landing',
	'silverpineBridge-path'
]);
const MEADOW_ENTRY_COMPOSED_COLLISION_RECTS = [
	...collectStrictCollisionRects(meadowEntryMap),
	...collectLandmarkRects(meadowEntryMap)
];

type CardinalPathSearch = {
	path: Point[] | null;
	start: Point;
	goal: Point;
	visited: number;
};

function alignMeadowEntryNavigationPoint(point: Point): Point {
	return {
		x: Math.round(point.x / MEADOW_ENTRY_NAVIGATION_STEP) * MEADOW_ENTRY_NAVIGATION_STEP,
		y: Math.round(point.y / MEADOW_ENTRY_NAVIGATION_STEP) * MEADOW_ENTRY_NAVIGATION_STEP
	};
}

function silverpineGroundPatchContains(point: Point): boolean {
	return (meadowEntryMap.groundPatches ?? [])
		.filter(({ id }) => SILVERPINE_AUTHORED_GROUND_PATCH_IDS.has(id))
		.some(
			(patch) =>
				Math.abs(point.x - patch.x) <= patch.width / 2 &&
				Math.abs(point.y - patch.y) <= patch.height / 2
		);
}

function meadowEntryPointIsWalkable(point: Point, padding = PLAYER_COLLISION_RADIUS): boolean {
	const mapSize = meadowEntryMap.width * 32;
	return (
		point.x >= padding &&
		point.y >= padding &&
		point.x <= mapSize - padding &&
		point.y <= mapSize - padding &&
		!isInsideAnyCollisionRect(point.x, point.y, MEADOW_ENTRY_COMPOSED_COLLISION_RECTS, padding)
	);
}

function findMeadowEntryCardinalPath(
	from: Point,
	to: Point,
	allowed: (point: Point) => boolean,
	transitPadding = MEADOW_ENTRY_TRANSIT_COLLISION_PADDING
): CardinalPathSearch {
	const start = alignMeadowEntryNavigationPoint(from);
	const goal = alignMeadowEntryNavigationPoint(to);
	const key = (point: Point) => `${point.x},${point.y}`;
	if (
		!meadowEntryPointIsWalkable(start, PLAYER_COLLISION_RADIUS) ||
		!meadowEntryPointIsWalkable(goal, PLAYER_COLLISION_RADIUS) ||
		!allowed(start) ||
		!allowed(goal)
	) {
		return { path: null, start, goal, visited: 0 };
	}

	const queue: Point[] = [start];
	const parents = new Map<string, string | null>([[key(start), null]]);
	for (let index = 0; index < queue.length; index += 1) {
		const current = queue[index]!;
		if (key(current) === key(goal)) {
			const path: Point[] = [];
			let currentKey: string | null = key(current);
			while (currentKey !== null) {
				const [x, y] = currentKey.split(',').map(Number);
				path.push({ x, y });
				currentKey = parents.get(currentKey) ?? null;
			}
			return { path: path.reverse(), start, goal, visited: parents.size };
		}

		for (const [dx, dy] of [
			[MEADOW_ENTRY_NAVIGATION_STEP, 0],
			[-MEADOW_ENTRY_NAVIGATION_STEP, 0],
			[0, MEADOW_ENTRY_NAVIGATION_STEP],
			[0, -MEADOW_ENTRY_NAVIGATION_STEP]
		]) {
			const next = { x: current.x + dx, y: current.y + dy };
			const nextKey = key(next);
			const nextPadding = nextKey === key(goal) ? PLAYER_COLLISION_RADIUS : transitPadding;
			if (
				parents.has(nextKey) ||
				!meadowEntryPointIsWalkable(next, nextPadding) ||
				!allowed(next)
			) {
				continue;
			}
			parents.set(nextKey, key(current));
			queue.push(next);
		}
	}
	return { path: null, start, goal, visited: parents.size };
}

function collapseMeadowEntryCardinalPath(path: readonly Point[]): Point[] {
	if (path.length <= 2) return [...path];
	const collapsed: Point[] = [path[0]!];
	for (let index = 1; index < path.length - 1; index += 1) {
		const previous = path[index - 1]!;
		const current = path[index]!;
		const next = path[index + 1]!;
		const previousDirection = {
			x: Math.sign(current.x - previous.x),
			y: Math.sign(current.y - previous.y)
		};
		const nextDirection = {
			x: Math.sign(next.x - current.x),
			y: Math.sign(next.y - current.y)
		};
		if (previousDirection.x !== nextDirection.x || previousDirection.y !== nextDirection.y) {
			collapsed.push(current);
		}
	}
	collapsed.push(path.at(-1)!);
	return collapsed;
}

function meadowEntrySegmentIsWalkable(
	from: Point,
	to: Point,
	transitPadding = MEADOW_ENTRY_TRANSIT_COLLISION_PADDING,
	fromPadding = transitPadding,
	toPadding = transitPadding
): boolean {
	const distance = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
	const samples = Math.max(1, Math.ceil(distance / 4));
	return Array.from({ length: samples + 1 }, (_, index) => {
		const ratio = index / samples;
		const padding = index === 0 ? fromPadding : index === samples ? toPadding : transitPadding;
		return {
			padding,
			point: {
				x: from.x + (to.x - from.x) * ratio,
				y: from.y + (to.y - from.y) * ratio
			}
		};
	}).every(({ padding, point }) => meadowEntryPointIsWalkable(point, padding));
}

function meadowEntryLiveSegmentIsWalkable(
	from: Point,
	to: Point,
	transitPadding = MEADOW_ENTRY_TRANSIT_COLLISION_PADDING,
	fromPadding = transitPadding,
	toPadding = transitPadding
): boolean {
	const maxAxisDelta = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
	if (maxAxisDelta <= AXIS_SETTLE_TOLERANCE) {
		// The browser route runner advances a target inside settle tolerance without
		// issuing movement input. Validate only the destination's actual player
		// footprint; there is no live transit sweep to expand.
		return meadowEntryPointIsWalkable(to, PLAYER_COLLISION_RADIUS);
	}
	return meadowEntrySegmentIsWalkable(from, to, transitPadding, fromPadding, toPadding);
}

function wildwoodLoopReturnAnchorWestStagingPoint(): Point {
	const bank = wildwoodForestLaneWestBankRect();
	const wildwoodMouth = FALLBACK_V2_CROSSROADS_TO_WILDWOOD.at(-1)!;
	const safeWestX =
		Math.floor(
			(bank.x - PLAYER_COLLISION_RADIUS - AXIS_REACH_TOLERANCE - 1) / MEADOW_ENTRY_NAVIGATION_STEP
		) * MEADOW_ENTRY_NAVIGATION_STEP;
	expect(safeWestX).toBe(4_976);
	return { x: safeWestX, y: wildwoodMouth.y };
}

function isWildwoodLoopReturnAnchorWestStagingSegment(
	label: string,
	from: Point,
	to: Point
): boolean {
	const wildwoodMouth = FALLBACK_V2_CROSSROADS_TO_WILDWOOD.at(-1)!;
	const safeStaging = wildwoodLoopReturnAnchorWestStagingPoint();
	return (
		label === 'Wildwood loop return to cave anchor' &&
		from.x === wildwoodMouth.x &&
		from.y === wildwoodMouth.y &&
		to.x === safeStaging.x &&
		to.y === safeStaging.y
	);
}

function wildwoodLoopReturnUsesExactAnchor(actualStart: Point, label: string): boolean {
	const wildwoodMouth = FALLBACK_V2_CROSSROADS_TO_WILDWOOD.at(-1)!;
	return (
		label === 'Wildwood loop return to cave anchor' &&
		Math.abs(actualStart.x - wildwoodMouth.x) <= AXIS_SETTLE_TOLERANCE &&
		Math.abs(actualStart.y - wildwoodMouth.y) <= AXIS_SETTLE_TOLERANCE
	);
}

function wildwoodLoopReturnAnchorWestStagingIsWalkable(from: Point, to: Point): boolean {
	const bank = wildwoodForestLaneWestBankRect();
	return (
		meadowEntrySegmentIsWalkable(
			from,
			to,
			PLAYER_COLLISION_RADIUS,
			PLAYER_COLLISION_RADIUS,
			PLAYER_COLLISION_RADIUS
		) &&
		meadowEntryPointIsWalkable(to, MEADOW_ENTRY_TRANSIT_COLLISION_PADDING) &&
		to.x + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE < bank.x
	);
}

function meadowEntryAxisConnectionPoints(from: Point, to: Point): Point[] {
	const points = [from];
	if (from.x !== to.x && from.y !== to.y) {
		points.push({ x: to.x, y: from.y });
	}
	points.push(to);
	return points;
}

function deriveMeadowEntryComposedCollisionRoute(
	actualStart: Point,
	target: Point,
	label: string
): Point[] {
	const wildwoodMouth = FALLBACK_V2_CROSSROADS_TO_WILDWOOD.at(-1)!;
	const useExactWildwoodAnchor = wildwoodLoopReturnUsesExactAnchor(actualStart, label);
	if (useExactWildwoodAnchor) {
		expect(
			meadowEntryPointIsWalkable(wildwoodMouth, PLAYER_COLLISION_RADIUS),
			`${label} exact anchor player walkability`
		).toBe(true);
	}
	const composed = findMeadowEntryCardinalPath(
		useExactWildwoodAnchor ? wildwoodMouth : actualStart,
		target,
		() => true
	);
	expect(composed.path, `${label} composed-collision path`).not.toBeNull();
	if (!composed.path) throw new Error(`${label} composed-collision BFS returned no path`);
	const collapsed = collapseMeadowEntryCardinalPath(composed.path);
	const collapsedStart = collapsed[0];
	const collapsedGoal = collapsed.at(-1);
	if (!collapsedStart || !collapsedGoal) {
		throw new Error(`${label} composed-collision BFS returned an empty path`);
	}
	expect(collapsedStart).toEqual(composed.start);
	expect(collapsedGoal).toEqual(composed.goal);
	for (let index = 1; index < collapsed.length; index += 1) {
		const from = collapsed[index - 1]!;
		const to = collapsed[index]!;
		if (index === 1 && isWildwoodLoopReturnAnchorWestStagingSegment(label, from, to)) {
			// The exact authored mouth anchor is player-clear, but the short
			// westward staging sweep crosses the transit envelope before reaching
			// the source-derived transit-safe staging point. Prove this one route
			// leg using the actual player footprint and retain the generic oracle
			// for every later segment.
			expect(
				wildwoodLoopReturnAnchorWestStagingIsWalkable(from, to),
				`${label} asymmetric initial west staging`
			).toBe(true);
			continue;
		}
		const fromPadding =
			index === 1 ? PLAYER_COLLISION_RADIUS : MEADOW_ENTRY_TRANSIT_COLLISION_PADDING;
		const toPadding =
			index === collapsed.length - 1
				? PLAYER_COLLISION_RADIUS
				: MEADOW_ENTRY_TRANSIT_COLLISION_PADDING;
		expect(
			meadowEntrySegmentIsWalkable(
				from,
				to,
				MEADOW_ENTRY_TRANSIT_COLLISION_PADDING,
				fromPadding,
				toPadding
			),
			`${label} collapsed segment ${index}`
		).toBe(true);
	}

	const route = [
		...(useExactWildwoodAnchor
			? [actualStart, collapsedStart]
			: meadowEntryAxisConnectionPoints(actualStart, collapsedStart)),
		...collapsed.slice(1),
		...meadowEntryAxisConnectionPoints(collapsedGoal, target).slice(1)
	];
	expect(route[0]).toEqual(actualStart);
	expect(route.at(-1)).toEqual(target);
	for (let index = 1; index < route.length; index += 1) {
		const from = route[index - 1]!;
		const to = route[index]!;
		const fromPadding =
			index === 1 ? PLAYER_COLLISION_RADIUS : MEADOW_ENTRY_TRANSIT_COLLISION_PADDING;
		const toPadding =
			index === route.length - 1 ? PLAYER_COLLISION_RADIUS : MEADOW_ENTRY_TRANSIT_COLLISION_PADDING;
		expect(
			isWildwoodLoopReturnAnchorWestStagingSegment(label, from, to)
				? wildwoodLoopReturnAnchorWestStagingIsWalkable(from, to)
				: meadowEntryLiveSegmentIsWalkable(
						from,
						to,
						MEADOW_ENTRY_TRANSIT_COLLISION_PADDING,
						fromPadding,
						toPadding
					),
			`${label} live segment ${index}`
		).toBe(true);
	}
	console.log(
		`TASK6_MEADOW_ENTRY_BFS ${JSON.stringify({
			label,
			actualStart,
			exactTarget: target,
			alignedStart: composed.start,
			alignedGoal: composed.goal,
			composedCollisionVisited: composed.visited,
			waypoints: collapsed
		})}`
	);
	return route;
}

function deriveCoastFerryRoute(actualStart: Point): Point[] {
	const westApproachFence = coastRegion.fences?.find(
		(fence) => fence.id === 'coast-approach-west-fence'
	);
	const estuaryEast = MEADOW_ENTRY_V2_RIVER_SEGMENTS.find(({ id }) => id === 'estuary-east')?.rect;
	const ferryApproach = MEADOW_ENTRY_V2_CROSSINGS.ferryApproach;
	const ferryLandmark = meadowEntryMap.landmarks?.find(({ id }) => id === 'ferry-crossing');
	if (!westApproachFence || !estuaryEast || !ferryLandmark) {
		throw new Error('Coast ferry route is missing authored fence, estuary, or landmark geometry');
	}

	const westApproachFenceTop = westApproachFence.y - westApproachFence.height / 2;
	const ferryTransitRow =
		Math.floor(
			(Math.min(westApproachFenceTop, estuaryEast.y) - COAST_FERRY_TRANSIT_COLLISION_PADDING - 1) /
				MEADOW_ENTRY_NAVIGATION_STEP
		) * MEADOW_ENTRY_NAVIGATION_STEP;
	const ferryLandmarkRect = {
		x: ferryLandmark.x,
		y: ferryLandmark.y,
		width: ferryLandmark.width,
		height: ferryLandmark.height
	};

	// The row is derived strictly above both the approach fence and the estuary,
	// leaving the full transit envelope clear before the route crosses west.
	expect(ferryTransitRow + COAST_FERRY_TRANSIT_COLLISION_PADDING).toBeLessThan(
		westApproachFenceTop
	);
	expect(ferryTransitRow + COAST_FERRY_TRANSIT_COLLISION_PADDING).toBeLessThan(estuaryEast.y);
	expect(layoutRectContainsPoint(ferryApproach, COAST_FERRY_DISCOVERY)).toBe(true);
	expect(
		isInsideAnyCollisionRect(
			COAST_FERRY_DISCOVERY.x,
			COAST_FERRY_DISCOVERY.y,
			[ferryLandmarkRect],
			COAST_FERRY_TRANSIT_COLLISION_PADDING
		)
	).toBe(false);

	const route = [
		actualStart,
		{ x: actualStart.x, y: ferryTransitRow },
		{ x: COAST_FERRY_DISCOVERY.x, y: ferryTransitRow },
		COAST_FERRY_DISCOVERY
	];
	for (let index = 1; index < route.length; index += 1) {
		const fromPadding =
			index === 1 ? PLAYER_COLLISION_RADIUS : COAST_FERRY_TRANSIT_COLLISION_PADDING;
		const toPadding =
			index === route.length - 1 ? PLAYER_COLLISION_RADIUS : COAST_FERRY_TRANSIT_COLLISION_PADDING;
		expect(
			meadowEntrySegmentIsWalkable(
				route[index - 1]!,
				route[index]!,
				COAST_FERRY_TRANSIT_COLLISION_PADDING,
				fromPadding,
				toPadding
			),
			`Coast ferry source-derived segment ${index}`
		).toBe(true);
	}
	return route;
}

function deriveSilverpineOptionalCacheRoute(actualStart: Point): Point[] {
	const corridor = findMeadowEntryCardinalPath(
		actualStart,
		SILVERPINE_OPTIONAL_CACHE_TARGET,
		silverpineGroundPatchContains
	);
	const composed =
		corridor.path === null
			? findMeadowEntryCardinalPath(actualStart, SILVERPINE_OPTIONAL_CACHE_TARGET, () => true)
			: corridor;
	expect(composed.path, 'Silverpine optional-cache composed-collision path').not.toBeNull();
	if (!composed.path) throw new Error('Silverpine optional-cache BFS returned no path');
	const collapsed = collapseMeadowEntryCardinalPath(composed.path);
	for (let index = 1; index < collapsed.length; index += 1) {
		const fromPadding =
			index === 1 ? PLAYER_COLLISION_RADIUS : MEADOW_ENTRY_TRANSIT_COLLISION_PADDING;
		const toPadding =
			index === collapsed.length - 1
				? PLAYER_COLLISION_RADIUS
				: MEADOW_ENTRY_TRANSIT_COLLISION_PADDING;
		expect(
			meadowEntrySegmentIsWalkable(
				collapsed[index - 1]!,
				collapsed[index]!,
				MEADOW_ENTRY_TRANSIT_COLLISION_PADDING,
				fromPadding,
				toPadding
			),
			`Silverpine optional-cache segment ${index}`
		).toBe(true);
	}
	const route = [
		...meadowEntryAxisConnectionPoints(actualStart, collapsed[0]!),
		...collapsed.slice(1),
		...meadowEntryAxisConnectionPoints(collapsed.at(-1)!, SILVERPINE_OPTIONAL_CACHE_TARGET).slice(1)
	];
	for (let index = 1; index < route.length; index += 1) {
		const fromPadding =
			index === 1 ? PLAYER_COLLISION_RADIUS : MEADOW_ENTRY_TRANSIT_COLLISION_PADDING;
		const toPadding =
			index === route.length - 1 ? PLAYER_COLLISION_RADIUS : MEADOW_ENTRY_TRANSIT_COLLISION_PADDING;
		expect(
			meadowEntrySegmentIsWalkable(
				route[index - 1]!,
				route[index]!,
				MEADOW_ENTRY_TRANSIT_COLLISION_PADDING,
				fromPadding,
				toPadding
			),
			`Silverpine optional-cache live route segment ${index}`
		).toBe(true);
	}
	console.log(
		`TASK6_SILVERPINE_BFS ${JSON.stringify({
			actualStart,
			alignedStart: composed.start,
			alignedGoal: composed.goal,
			authoredGroundCorridorPath: corridor.path ? 'found' : 'no-path',
			authoredGroundCorridorVisited: corridor.visited,
			composedCollisionVisited: composed.visited,
			waypoints: collapsed
		})}`
	);
	return route;
}

const FALLBACK_THRESHOLD_MAIN_ROUTE = [
	{ x: 512, y: 3_200 },
	{ x: 2_304, y: 3_200 },
	{ x: 2_400, y: 3_200 },
	{ x: 2_400, y: 2_112 },
	{ x: 1_728, y: 2_112 },
	{ x: 1_728, y: 4_800 },
	{ x: 2_048, y: 4_800 },
	{ x: 2_048, y: 3_200 },
	{ x: 4_096, y: 3_200 },
	{ x: 4_096, y: 3_008 },
	{ x: 4_096, y: 3_200 },
	{ x: 5_824, y: 3_200 }
] as const;

const FALLBACK_THRESHOLD_NORTH_LOOP = [
	{ x: 512, y: 3_200 },
	{ x: 2_400, y: 3_200 },
	{ x: 2_400, y: 2_112 },
	{ x: 1_728, y: 2_112 },
	{ x: 2_400, y: 2_112 },
	{ x: 2_400, y: 3_200 },
	{ x: 512, y: 3_200 }
] as const;

const FALLBACK_THRESHOLD_SOUTH_LOOP = [
	{ x: 512, y: 3_200 },
	{ x: 2_048, y: 3_200 },
	{ x: 2_048, y: 4_800 },
	{ x: 2_048, y: 3_200 },
	{ x: 512, y: 3_200 }
] as const;

const FALLBACK_CORE_MAIN_ROUTE = [
	{ x: 512, y: 3_200 },
	{ x: 2_240, y: 3_200 },
	{ x: 2_240, y: 2_048 },
	{ x: 2_240, y: 3_200 },
	{ x: 3_744, y: 3_200 },
	{ x: 3_744, y: 4_544 },
	{ x: 3_584, y: 4_544 },
	{ x: 3_744, y: 4_544 },
	{ x: 3_744, y: 3_200 },
	{ x: 4_600, y: 3_200 }
] as const;

function ruinsCoreReturnStagingPoint(): Point {
	const transition = ruinsCoreMap.transitions.find(({ id }) => id === 'core-to-threshold');
	if (!transition) {
		throw new Error('Missing Ruins Core return transition source');
	}
	return { x: transition.x + 64, y: transition.y };
}

function assertRuinsCoreDraughtRouteContract(points: readonly Point[]) {
	const draught = ruinsCoreMap.pickups?.find(({ id }) => id === 'ruins-core-draught');
	const southGate = ruinsCoreMap.blockers?.find(({ id }) => id === 'core-future-gate-south');
	expect(draught).toEqual({
		id: 'ruins-core-draught',
		x: 3_584,
		y: 4_544,
		itemId: 'ruin-draught',
		quantity: 1
	});
	expect(southGate).toMatchObject({
		id: 'core-future-gate-south',
		x: 3_584,
		y: 3_936,
		width: 256,
		height: 96
	});
	if (!draught || !southGate) {
		throw new Error('Ruins Core draught or south gate source is missing');
	}
	expect(points).toContainEqual({ x: draught.x, y: draught.y });

	// MapRect coordinates are centers in the authored map source; the route
	// oracle consumes top-left rectangles, matching WorldScene's bounds math.
	const blockerRects = (ruinsCoreMap.blockers ?? []).map(({ x, y, width, height }) => ({
		x: x - width / 2,
		y: y - height / 2,
		width,
		height
	}));
	for (let index = 1; index < points.length; index += 1) {
		const from = points[index - 1]!;
		const to = points[index]!;
		expect(from.x === to.x || from.y === to.y).toBe(true);
		for (const blocker of blockerRects) {
			expect(
				routeSegmentIntersectsExpandedRectAtReachEnvelope(
					from,
					to,
					blocker,
					PLAYER_COLLISION_RADIUS
				),
				`Ruins Core draught route crossed ${JSON.stringify(blocker)}: ${JSON.stringify({ from, to })}`
			).toBe(false);
		}
	}

	const gateRight = southGate.x + southGate.width / 2;
	const eastCorridorX = gateRight + PLAYER_COLLISION_RADIUS + AXIS_REACH_TOLERANCE + 2;
	expect(eastCorridorX).toBe(3_744);
	expect(points).toContainEqual({ x: eastCorridorX, y: draught.y });
	expect(eastCorridorX - AXIS_REACH_TOLERANCE).toBeGreaterThan(gateRight + PLAYER_COLLISION_RADIUS);
	expect(draught.y - AXIS_REACH_TOLERANCE).toBeGreaterThan(
		southGate.y + southGate.height / 2 + PLAYER_COLLISION_RADIUS
	);
}

test('Ruins Threshold core-stair staging leaves the trusted transition envelope clear', () => {
	const transition = ruinsThresholdMap.transitions.find(({ id }) => id === 'threshold-to-core');
	expect(transition).toMatchObject({ x: 5_888, y: 3_200 });
	if (!transition) {
		throw new Error('Missing Ruins Threshold core transition source');
	}

	const safeStaging = FALLBACK_THRESHOLD_MAIN_ROUTE.at(-1)!;
	const unsafeStaging = { x: transition.x - 32, y: transition.y };
	expect(safeStaging).toEqual({ x: transition.x - 64, y: transition.y });
	expect(safeStaging.x + AXIS_REACH_TOLERANCE + PLAYER_TRANSITION_REACH).toBeLessThan(transition.x);
	expect(unsafeStaging.x + AXIS_REACH_TOLERANCE + PLAYER_TRANSITION_REACH).toBeGreaterThanOrEqual(
		transition.x
	);
});

const PAINTED_PILOT_BACKGROUND_IDS = [
	'meadow-entry-painted-v2-sundrop-camera-base-image',
	'meadow-entry-painted-v2-crossroads-camera-base-image'
] as const;

const PAINTED_PILOT_BACKGROUND_DIMENSIONS = {
	'meadow-entry-painted-v2-sundrop-camera-base-image': { width: 3_200, height: 3_200 },
	'meadow-entry-painted-v2-crossroads-camera-base-image': { width: 3_200, height: 3_200 }
} as const;

const PAINTED_PILOT_CROSSROADS_TEXTURE = 'meadow-entry-painted-v2-crossroads-camera-base-image';
const PAINTED_PILOT_SUNDROP_TEXTURE = 'meadow-entry-painted-v2-sundrop-camera-base-image';

const PAINTED_PILOT_CROSSROADS_BLOCKER_OWNERS = [
	'coast-crossroads-mouth-bank',
	'mistfen-entry-bank-east',
	'silverpine-wall-A-east',
	'silverpine-wall-A-west',
	'silverpine-wall-B-north',
	'silverpine-wall-B-south',
	'silverpine-wall-C-east',
	'silverpine-wall-C-west',
	'wildwood-forest-lane-west-bank'
] as const;

const PAINTED_PILOT_RUNTIME_CROP_BOUNDS = MEADOW_ENTRY_PAINTED_V2_APPROVED_RUNTIME_BACKGROUNDS.map(
	({ x, y, width, height }) => ({
		left: x - width / 2,
		top: y - height / 2,
		right: x + width / 2,
		bottom: y + height / 2
	})
) satisfies readonly { left: number; top: number; right: number; bottom: number }[];

function assertLiveMeadowCameraCoverage(
	samples: readonly MeadowCameraSample[],
	exteriorRouteTokens: readonly string[]
) {
	const meadowSamples = samples.filter((sample) => sample.mapId === 'meadow-entry');
	expect(exteriorRouteTokens.length).toBeGreaterThan(0);
	expect(meadowSamples.length).toBeGreaterThan(0);
	const sampledTokens = new Set(meadowSamples.map((sample) => sample.routeToken));
	for (const token of exteriorRouteTokens) {
		expect(sampledTokens, `missing Meadow camera sample for ${token}`).toContain(token);
	}
	for (const sample of meadowSamples) {
		expect(
			[sample.left, sample.top, sample.right, sample.bottom, sample.width, sample.height].every(
				Number.isFinite
			)
		).toBe(true);
		expect({ width: sample.width, height: sample.height }).toEqual({
			width: 1_920,
			height: 1_080
		});
		expect(sample.right).toBe(sample.left + sample.width);
		expect(sample.bottom).toBe(sample.top + sample.height);
		try {
			// Phaser follows at subpixel precision. The pure envelope helper computes
			// exact half-open pixel union area, so rasterize outward for the live
			// assertion while retaining the original fractional sample in evidence.
			const sampledBounds = {
				left: Math.floor(sample.left),
				top: Math.floor(sample.top),
				right: Math.ceil(sample.right),
				bottom: Math.ceil(sample.bottom)
			};
			expect(sampledBounds.left).toBeLessThanOrEqual(sample.left);
			expect(sampledBounds.top).toBeLessThanOrEqual(sample.top);
			expect(sampledBounds.right).toBeGreaterThanOrEqual(sample.right);
			expect(sampledBounds.bottom).toBeGreaterThanOrEqual(sample.bottom);
			assertMeadowEntryPaintedV2CameraBoundsCovered(
				PAINTED_PILOT_RUNTIME_CROP_BOUNDS,
				sampledBounds,
				`live camera sample ${sample.routeToken} point ${sample.pointIndex}`
			);
		} catch (error) {
			throw new Error(`${String(error)} sample=${JSON.stringify(sample)}`, { cause: error });
		}
	}
}

async function waitForMeadowPlaneDiagnostic(page: Page) {
	await page.waitForFunction(
		() =>
			(window as GlieseProbeWindow).__glieseRegionalBackgroundDiagnostics?.some(
				(diagnostic) => diagnostic.mapId === 'meadow-entry'
			) === true,
		undefined,
		{ timeout: 30_000 }
	);
	const diagnostics = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseRegionalBackgroundDiagnostics ?? []
	);
	const diagnostic = diagnostics.find((entry) => entry.mapId === 'meadow-entry');
	if (!diagnostic)
		throw new Error(`Missing Meadow Entry plane diagnostic: ${JSON.stringify(diagnostics)}`);
	return diagnostic;
}

async function waitForMeadowRendererDiagnostic(page: Page) {
	await page.waitForFunction(
		() => (window as GlieseProbeWindow).__glieseRegionalBackgroundRendererDiagnostics?.length === 1,
		undefined,
		{ timeout: 30_000 }
	);
	const diagnostics = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseRegionalBackgroundRendererDiagnostics ?? []
	);
	const diagnostic = diagnostics[0];
	if (!diagnostic) {
		throw new Error(`Missing Meadow Entry preload diagnostic: ${JSON.stringify(diagnostics)}`);
	}
	return diagnostic;
}

function assertPaintedPilotPlaneDiagnostic(
	diagnostic: RegionalBackgroundPlaneRenderDiagnostic,
	expectedSuccessfulIds: readonly string[]
) {
	expect(diagnostic).toMatchObject({
		mapId: 'meadow-entry',
		regionalBackgroundsEnabled: true,
		paintedMode: 'pilot'
	});
	expect(diagnostic.successfulBackgroundIds).toEqual([...expectedSuccessfulIds].sort());
	for (const entry of diagnostic.entries) {
		if (!(entry.id in PAINTED_PILOT_BACKGROUND_DIMENSIONS)) continue;
		expect(entry.status, entry.id).toBe('rendered');
		expect(entry.expectedDimensions, entry.id).toEqual(
			PAINTED_PILOT_BACKGROUND_DIMENSIONS[
				entry.id as keyof typeof PAINTED_PILOT_BACKGROUND_DIMENSIONS
			]
		);
		expect(entry.observedDimensions, entry.id).toEqual(entry.expectedDimensions);
	}
}

function assertExactCrossroadsBlockerFallback(diagnostic: RegionalBackgroundPlaneRenderDiagnostic) {
	expect(diagnostic.selectedFallbackBlockerIds).toHaveLength(
		PAINTED_PILOT_CROSSROADS_BLOCKER_OWNERS.length
	);
	expect(diagnostic.selectedFallbackBlockerIds).toEqual(
		expect.arrayContaining([...PAINTED_PILOT_CROSSROADS_BLOCKER_OWNERS])
	);
}

function assertCollisionDiagnosticsAreFaithful(diagnostics: readonly PlayerMovementDiagnostic[]) {
	expect(diagnostics.length).toBeGreaterThan(0);
	for (const diagnostic of diagnostics) {
		expect(diagnostic.mapId).toBe('meadow-entry');
		for (const position of [
			diagnostic.previousPosition,
			diagnostic.requestedPosition,
			diagnostic.resolvedPosition
		]) {
			expect(Number.isFinite(position.x)).toBe(true);
			expect(Number.isFinite(position.y)).toBe(true);
		}
		if (diagnostic.blocked) {
			expect(
				diagnostic.resolvedPosition.x !== diagnostic.requestedPosition.x ||
					diagnostic.resolvedPosition.y !== diagnostic.requestedPosition.y
			).toBe(true);
		} else {
			expect(diagnostic.resolvedPosition).toEqual(diagnostic.requestedPosition);
		}
	}
}

test('Wildwood exact anchor staging proves the asymmetric west leg', () => {
	const wildwoodMouth = FALLBACK_V2_CROSSROADS_TO_WILDWOOD.at(-1)!;
	const wildwoodBank = wildwoodForestLaneWestBankRect();
	const safeStaging = wildwoodLoopReturnAnchorWestStagingPoint();
	const validFrameResidue = { x: safeStaging.x + AXIS_REACH_TOLERANCE, y: safeStaging.y };
	const settledLiveStart = { x: wildwoodMouth.x - 6, y: wildwoodMouth.y + 8 };
	const nonSettledLiveStart = { x: wildwoodMouth.x - 16, y: wildwoodMouth.y };

	const settledRoute = deriveMeadowEntryComposedCollisionRoute(
		settledLiveStart,
		WILDWOOD_CAVE_ANCHOR,
		'Wildwood loop return to cave anchor'
	);
	expect(meadowEntryPointIsWalkable(wildwoodMouth, PLAYER_COLLISION_RADIUS)).toBe(true);
	expect(
		meadowEntryLiveSegmentIsWalkable(
			settledLiveStart,
			wildwoodMouth,
			MEADOW_ENTRY_TRANSIT_COLLISION_PADDING,
			PLAYER_COLLISION_RADIUS,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(true);
	expect(settledRoute.slice(0, 3)).toEqual([settledLiveStart, wildwoodMouth, safeStaging]);

	const nonSettledRoute = deriveMeadowEntryComposedCollisionRoute(
		nonSettledLiveStart,
		WILDWOOD_CAVE_ANCHOR,
		'Wildwood loop return to cave anchor'
	);
	expect(nonSettledRoute[0]).toEqual(nonSettledLiveStart);
	expect(nonSettledRoute[1]).not.toEqual(wildwoodMouth);

	const route = deriveMeadowEntryComposedCollisionRoute(
		wildwoodMouth,
		WILDWOOD_CAVE_ANCHOR,
		'Wildwood loop return to cave anchor'
	);
	expect(route.slice(0, 3)).toEqual([wildwoodMouth, wildwoodMouth, safeStaging]);

	// The first leg is an actual player-radius sweep, while the staging
	// destination must already clear the unchanged transit envelope.
	expect(wildwoodLoopReturnAnchorWestStagingIsWalkable(wildwoodMouth, safeStaging)).toBe(true);
	expect(
		meadowEntrySegmentIsWalkable(
			wildwoodMouth,
			safeStaging,
			PLAYER_COLLISION_RADIUS,
			PLAYER_COLLISION_RADIUS,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(true);
	expect(meadowEntryPointIsWalkable(safeStaging, MEADOW_ENTRY_TRANSIT_COLLISION_PADDING)).toBe(
		true
	);
	for (const unsafeX of [4_978, wildwoodMouth.x]) {
		expect(
			wildwoodLoopReturnAnchorWestStagingIsWalkable(wildwoodMouth, {
				x: unsafeX,
				y: wildwoodMouth.y
			})
		).toBe(false);
		expect(
			meadowEntryPointIsWalkable(
				{ x: unsafeX, y: wildwoodMouth.y },
				MEADOW_ENTRY_TRANSIT_COLLISION_PADDING
			)
		).toBe(false);
	}

	// The runner may retain the full unchanged reach residue after staging;
	// the source raw bank edge must still remain strictly east of the player.
	expect(validFrameResidue.x + PLAYER_COLLISION_RADIUS).toBeLessThan(wildwoodBank.x);
	expect(meadowEntryPointIsWalkable(validFrameResidue, PLAYER_COLLISION_RADIUS)).toBe(true);
});

test('Guild Hall terminal checkpoint skips an in-band micro-correction', () => {
	const liveResidue = { x: 410, y: 193 };
	const authoredCheckpoint = { x: 400, y: 208 };
	const finalRoute = guildHallRecordsAisleFinalCheckpointRoutePoints(
		liveResidue,
		authoredCheckpoint
	);

	// Both coordinates already satisfy the unchanged terminal reach contract. A
	// generated x-then-y corner would skip x at the runner's settle tolerance,
	// then drive y at x=410 through the records-spine wall.
	expect(Math.abs(liveResidue.x - authoredCheckpoint.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(liveResidue.y - authoredCheckpoint.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(finalRoute).toEqual([liveResidue]);
});

test('validated route evidence records diagnostics without revalidating them', () => {
	const invalidDiagnostic: PlayerMovementDiagnostic = {
		mapId: 'guild-hall',
		previousPosition: { x: 1, y: 2 },
		requestedPosition: { x: 3, y: 2 },
		resolvedPosition: { x: 1, y: 2 },
		blocked: true
	};
	const result: BrowserRouteResult = {
		token: 'characterization-evidence-only',
		mapId: 'meadow-entry',
		status: 'done',
		pointIndex: 1,
		axis: null,
		position: { x: 3, y: 2 },
		target: null,
		lastDiagnostic: invalidDiagnostic,
		axisHistory: ['x'],
		diagnostics: [invalidDiagnostic],
		invalidDiagnostics: [invalidDiagnostic],
		diagnosticAxes: ['x'],
		activeKey: null
	};

	const evidence = collectJourneyRouteEvidence('evidence-only', result);
	expect(evidence).toMatchObject({
		label: 'evidence-only',
		token: result.token,
		status: 'done',
		mapId: 'meadow-entry',
		diagnosticCount: 1,
		diagnosticMapIds: ['guild-hall'],
		invalidDiagnostics: [invalidDiagnostic]
	});
	expect(() => assertRouteDiagnosticsAreFaithful(result, 'validator characterization')).toThrow();
});

test('Meadow painted pilot selects only approved planes and preserves live fallbacks', async ({
	page
}) => {
	test.setTimeout(180_000);
	await installRuntimeProbes(page);
	const paintedRequests: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes('/game/assets/regions/meadow-entry-painted-v2/')) {
			paintedRequests.push(request.url());
		}
	});

	await page.goto('/?meadowPaintedPilot=on&movementDiagnostics=on');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	const pilotPlaneDiagnostic = await waitForMeadowPlaneDiagnostic(page);
	const pilotRendererDiagnostic = await waitForMeadowRendererDiagnostic(page);
	expect(pilotPlaneDiagnostic.entries).toHaveLength(2);
	expect(pilotPlaneDiagnostic.entries.map((entry) => entry.id)).toEqual(
		PAINTED_PILOT_BACKGROUND_IDS
	);
	assertPaintedPilotPlaneDiagnostic(pilotPlaneDiagnostic, PAINTED_PILOT_BACKGROUND_IDS);
	const approvedBlockerOwners = MEADOW_ENTRY_PAINTED_V2_RUNTIME_VISUAL_OWNERS.filter(
		(owner) => owner.sourceType === 'blocker'
	).map((owner) => owner.sourceId);
	expect(approvedBlockerOwners).toHaveLength(PAINTED_PILOT_CROSSROADS_BLOCKER_OWNERS.length);
	expect(approvedBlockerOwners).toEqual(
		expect.arrayContaining([...PAINTED_PILOT_CROSSROADS_BLOCKER_OWNERS])
	);
	expect(pilotPlaneDiagnostic.selectedFallbackBlockerIds).toEqual([]);
	expect(pilotPlaneDiagnostic.selectedFallbackDecorIds).toEqual([]);
	expect(pilotPlaneDiagnostic.selectedFallbackFenceIds).toEqual([]);
	expect(pilotRendererDiagnostic).toMatchObject({
		paintedMode: 'pilot',
		regionalBackgroundLoadCompletions: 2
	});
	expect(pilotRendererDiagnostic.regionalBackgroundLoadMs).not.toBeNull();
	expect(paintedRequests.map((url) => new URL(url).pathname).sort()).toEqual([
		'/game/assets/regions/meadow-entry-painted-v2/painted-v2-crossroads-camera-base.png',
		'/game/assets/regions/meadow-entry-painted-v2/painted-v2-sundrop-camera-base.png'
	]);

	paintedRequests.length = 0;
	await page.goto('/?regionalBackground=off&meadowPaintedPilot=on&movementDiagnostics=on');
	await expect(page.locator('canvas')).toBeVisible();
	const offPlaneDiagnostic = await waitForMeadowPlaneDiagnostic(page);
	const offRendererDiagnostic = await waitForMeadowRendererDiagnostic(page);
	expect(offPlaneDiagnostic).toMatchObject({
		mapId: 'meadow-entry',
		regionalBackgroundsEnabled: false,
		paintedMode: 'fallback',
		entries: [],
		successfulBackgroundIds: [],
		selectedFallbackBlockerIds: [],
		selectedFallbackDecorIds: [],
		selectedFallbackFenceIds: []
	});
	expect(offRendererDiagnostic).toMatchObject({
		paintedMode: 'fallback',
		regionalBackgroundLoadMs: null,
		regionalBackgroundLoadCompletions: 0
	});
	expect(paintedRequests).toEqual([]);
	expect(offPlaneDiagnostic.entries).not.toEqual(
		expect.arrayContaining([
			expect.objectContaining({ status: 'missing-texture' }),
			expect.objectContaining({ status: 'render-failed' })
		])
	);

	await page.route(
		'**/game/assets/regions/meadow-entry-painted-v2/painted-v2-crossroads-camera-base.png',
		(route) => route.abort()
	);
	await page.goto('/?meadowPaintedPilot=on&movementDiagnostics=on&mapDebug=collision');
	await expect(page.locator('canvas')).toBeVisible();
	const missingCrossroadsPlaneDiagnostic = await waitForMeadowPlaneDiagnostic(page);
	const missingCrossroadsRendererDiagnostic = await waitForMeadowRendererDiagnostic(page);
	expect(missingCrossroadsRendererDiagnostic).toMatchObject({
		paintedMode: 'pilot',
		regionalBackgroundLoadCompletions: 1
	});
	expect(missingCrossroadsPlaneDiagnostic.successfulBackgroundIds).toEqual(
		[PAINTED_PILOT_BACKGROUND_IDS[0]].sort()
	);
	expect(
		missingCrossroadsPlaneDiagnostic.entries.find(
			(entry) => entry.id === PAINTED_PILOT_CROSSROADS_TEXTURE
		)
	).toEqual(
		expect.objectContaining({
			status: 'missing-texture',
			expectedDimensions: PAINTED_PILOT_BACKGROUND_DIMENSIONS[PAINTED_PILOT_CROSSROADS_TEXTURE],
			observedDimensions: null
		})
	);
	assertExactCrossroadsBlockerFallback(missingCrossroadsPlaneDiagnostic);
	expect(missingCrossroadsPlaneDiagnostic.selectedFallbackDecorIds).not.toContain(
		'village-decor-22-77'
	);

	// The restored Silverpine wall is still authoritative collision. Reach its
	// south face with real keyboard input and require the collision diagnostic to
	// resolve short of the requested point.
	previousRouteSettleTolerance = AXIS_SETTLE_TOLERANCE;
	await page.locator('canvas').click();
	// The authored village-to-Crossroads handoff is a continuous eastbound lane;
	// the intermediate x=3,264 seam marker is review metadata, not a required
	// gameplay stop. Keep the real-input route on that lane and carry its actual
	// settled point into the Silverpine connector so quantization at the seam does
	// not become a false correction-limit failure.
	const meadowConnectorPoint = await moveRoute(page, [
		...HERO_HOUSE_TO_CROSSROADS.slice(0, 5),
		{ x: 3_776, y: 4_688 }
	]);
	const silverpineArrival = await moveRoute(page, [
		meadowConnectorPoint,
		{ x: 3_648, y: meadowConnectorPoint.y },
		...CROSSROADS_TO_SILVERPINE.slice(2)
	]);
	await moveRoute(page, [
		silverpineArrival,
		{ x: 3_776, y: silverpineArrival.y },
		{ x: 3_776, y: 2_640 },
		{ x: 3_600, y: 2_640 },
		{ x: 3_600, y: 2_900 }
	]);
	await page.locator('canvas').click();
	await page.keyboard.down('ArrowLeft');
	try {
		await page.waitForFunction(
			() => {
				const diagnostic = (window as GlieseProbeWindow).__glieseLastMovementDiagnostic;
				return diagnostic?.mapId === 'meadow-entry' && diagnostic.blocked;
			},
			undefined,
			{ timeout: 5_000 }
		);
	} finally {
		await page.keyboard.up('ArrowLeft');
	}
	const wallCollisionDiagnostic = await latestMovement(page);
	expect(wallCollisionDiagnostic?.mapId).toBe('meadow-entry');
	expect(wallCollisionDiagnostic?.blocked).toBe(true);
	expect(wallCollisionDiagnostic?.resolvedPosition.x).toBeGreaterThan(
		wallCollisionDiagnostic?.requestedPosition.x ?? Number.POSITIVE_INFINITY
	);

	await page.unroute(
		'**/game/assets/regions/meadow-entry-painted-v2/painted-v2-crossroads-camera-base.png'
	);
	await page.goto(
		`/?meadowPaintedPilot=on&movementDiagnostics=on&mapDebug=collision&regionalBackgroundFault=${PAINTED_PILOT_CROSSROADS_TEXTURE}:render`
	);
	await expect(page.locator('canvas')).toBeVisible();
	const crossroadsFaultPlaneDiagnostic = await waitForMeadowPlaneDiagnostic(page);
	const crossroadsFaultRendererDiagnostic = await waitForMeadowRendererDiagnostic(page);
	expect(crossroadsFaultRendererDiagnostic).toMatchObject({
		paintedMode: 'pilot',
		regionalBackgroundLoadCompletions: 2
	});
	expect(crossroadsFaultPlaneDiagnostic.successfulBackgroundIds).toEqual(
		[PAINTED_PILOT_BACKGROUND_IDS[0]].sort()
	);
	expect(
		crossroadsFaultPlaneDiagnostic.entries.find(
			(entry) => entry.id === PAINTED_PILOT_CROSSROADS_TEXTURE
		)
	).toEqual(
		expect.objectContaining({
			status: 'render-failed',
			expectedDimensions: PAINTED_PILOT_BACKGROUND_DIMENSIONS[PAINTED_PILOT_CROSSROADS_TEXTURE],
			observedDimensions: PAINTED_PILOT_BACKGROUND_DIMENSIONS[PAINTED_PILOT_CROSSROADS_TEXTURE]
		})
	);
	assertExactCrossroadsBlockerFallback(crossroadsFaultPlaneDiagnostic);

	await page.goto(
		`/?meadowPaintedPilot=on&movementDiagnostics=on&regionalBackgroundFault=${PAINTED_PILOT_SUNDROP_TEXTURE}:render`
	);
	await expect(page.locator('canvas')).toBeVisible();
	const sundropFaultPlaneDiagnostic = await waitForMeadowPlaneDiagnostic(page);
	const sundropFaultRendererDiagnostic = await waitForMeadowRendererDiagnostic(page);
	expect(sundropFaultRendererDiagnostic).toMatchObject({
		paintedMode: 'pilot',
		regionalBackgroundLoadCompletions: 2
	});
	expect(sundropFaultPlaneDiagnostic.successfulBackgroundIds).toEqual(
		[PAINTED_PILOT_BACKGROUND_IDS[1]].sort()
	);
	expect(
		sundropFaultPlaneDiagnostic.entries.find((entry) => entry.id === PAINTED_PILOT_SUNDROP_TEXTURE)
	).toEqual(
		expect.objectContaining({
			status: 'render-failed',
			expectedDimensions: PAINTED_PILOT_BACKGROUND_DIMENSIONS[PAINTED_PILOT_SUNDROP_TEXTURE],
			observedDimensions: PAINTED_PILOT_BACKGROUND_DIMENSIONS[PAINTED_PILOT_SUNDROP_TEXTURE]
		})
	);
	expect(sundropFaultPlaneDiagnostic.selectedFallbackDecorIds).toEqual([
		'village-decor-28-25',
		'village-decor-28-53',
		'village-decor-53-22'
	]);
	expect(sundropFaultPlaneDiagnostic.selectedFallbackBlockerIds).toEqual([]);
	// The boundary decor owns both Sundrop and connector crops; the complete
	// connector crop keeps it suppressed even while Sundrop is faulted.
	expect(sundropFaultPlaneDiagnostic.selectedFallbackDecorIds).not.toContain('village-decor-22-77');
});

test('Meadow painted pilot preserves the village Crossroads gameplay loop', async ({ page }) => {
	test.setTimeout(360_000);
	await installRuntimeProbes(page, { captureFacing: true });
	await injectSave(
		page,
		createSaveFixture({
			mapId: 'meadow-entry',
			player: {
				level: 1,
				xp: 0,
				hp: 20,
				attack: 3,
				x: 704,
				y: 5_920,
				facing: 'up'
			}
		})
	);
	await page.setViewportSize({ width: 1_920, height: 1_080 });
	await page.goto('/?meadowPaintedPilot=on&movementDiagnostics=on');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
	await waitForExactHudPosition(page, 'meadow-entry', { x: 704, y: 5_920 });

	// The only coordinate seed is the normal Meadow spawn. All subsequent
	// positions come from real keyboard input through the browser route runner.
	const initialSeed = await page.evaluate((key) => {
		const encoded = localStorage.getItem(key);
		const save = encoded ? JSON.parse(encoded) : null;
		return {
			marker: sessionStorage.getItem('__gliese_e2e_save_seeded_v1'),
			mapId: save?.mapId,
			player: save?.player ? { x: save.player.x, y: save.player.y } : null
		};
	}, SAVE_STORAGE_KEY);
	expect(initialSeed).toEqual({
		marker: '1',
		mapId: 'meadow-entry',
		player: { x: 704, y: 5_920 }
	});

	const heroHouse = INTERIOR_GRAYBOX_CASES.find((interior) => interior.mapId === 'hero-house');
	const villagerHouse1 = INTERIOR_GRAYBOX_CASES.find(
		(interior) => interior.mapId === 'villager-house-1'
	);
	expect(heroHouse).toBeDefined();
	expect(villagerHouse1).toBeDefined();
	if (!heroHouse || !villagerHouse1)
		throw new Error('HPA-586 route constants missing Hero House or Villager House 1');

	// Hero House frontage and door, both directions, use the existing trusted
	// keyboard transition helper rather than mutating the scene position.
	await enterInteriorWithTrustedKeyboard(page, heroHouse);
	await exitInteriorWithTrustedKeyboard(page, heroHouse);
	const afterHeroHouse = await currentHudPlayerPoint(page);

	// Main street route to the market cache. The pickup is collected by the live
	// scene while the route runner holds real arrow-key input.
	previousRouteSettleTolerance = AXIS_SETTLE_TOLERANCE;
	await page.locator('canvas').click();
	await moveRoute(page, [
		afterHeroHouse,
		{ x: afterHeroHouse.x, y: 6_080 },
		{ x: 320, y: 6_080 },
		{ x: 320, y: 4_688 },
		{ x: 912, y: 5_072 }
	]);
	await expect(fieldStatus(page)).toContainText('Found');
	const afterPickup = await currentHudPlayerPoint(page);

	// Continue through Sundrop's authored main street to Villager House 1. Keep
	// the actual settled x while moving north to the main-street lane so the
	// Item Shop footprint is never crossed; the authored VH1 approach then uses
	// the exact return-arrival coordinate for the transition.
	await moveRoute(page, [
		afterPickup,
		{ x: afterPickup.x, y: 4_688 },
		// Stop one existing settle tolerance inside the authored VH1 approach
		// rectangle before taking the exact return-arrival y. This compensates
		// for the route driver's fixed keyboard frame quantization without
		// changing its tolerances or injecting a player coordinate.
		{ x: villagerHouse1.returnArrival.x - AXIS_SETTLE_TOLERANCE, y: 4_688 },
		villagerHouse1.returnArrival
	]);

	// Run the same proven Villager House 1 graybox journey as the dedicated
	// HPA-586 parameterized test. This is the live resident interaction clause;
	// Meadow's outdoor ambient characters remain deliberately non-interactable.
	await enterInteriorWithTrustedKeyboard(page, villagerHouse1);
	let villagerHouse1Point = villagerHouse1.spawn;
	for (const step of villagerHouse1.steps) {
		// Lynn's authored approach leaves only 8px of interaction slack from
		// her x=160 center. The unchanged route driver's allowed 18px reach
		// residual can otherwise leave the live player just outside her 48px
		// interaction radius. Stay one existing settle tolerance inward for this
		// Task8 approach only; the parameterized HPA graybox remains unchanged.
		const checkpoint =
			step.interaction?.speaker === 'Lynn'
				? {
						// Keep the live x inside the existing interaction settle band:
						// observed x≈196–199 remains 36–39px from Lynn (inside 48px)
						// and outside the expanded 29px collision boundary, so the
						// runner takes only the safe vertical approach.
						x: step.point.x - NPC_APPROACH_SETTLE_TOLERANCE,
						y: step.point.y
					}
				: step.point;
		if (villagerHouse1Point.x !== checkpoint.x || villagerHouse1Point.y !== checkpoint.y) {
			const routePoints = interiorRoutePoints(villagerHouse1Point, checkpoint);
			villagerHouse1Point = await moveRoute(
				page,
				routePoints,
				step.interaction ? NPC_APPROACH_SETTLE_TOLERANCE : INTERIOR_ROUTE_SETTLE_TOLERANCE
			);
		}
		await assertInteriorCheckpoint(page, villagerHouse1, checkpoint);
		if (step.interaction) await interactWithInteriorNpc(page, step.interaction);
	}
	expect(Math.abs(villagerHouse1Point.x - villagerHouse1.spawn.x)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	expect(Math.abs(villagerHouse1Point.y - villagerHouse1.spawn.y)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	await exitInteriorWithTrustedKeyboard(page, villagerHouse1);
	const afterVillagerHouse1 = await currentHudPlayerPoint(page);

	// Village → connector → Crossroads. Keep the route on the current
	// HPA-586 constants so painted coverage cannot hide a geometry regression.
	// Return south on the actual x, then take the authored main-street lane
	// directly east to Crossroads; avoid seam metadata stops.
	await moveRoute(page, [
		afterVillagerHouse1,
		{ x: afterVillagerHouse1.x, y: 4_688 },
		{ x: 3_776, y: 4_688 }
	]);
	// Crossroads is a region within the persistent Meadow Entry map (the HUD
	// location label intentionally remains Sundrop Meadows). The live point at
	// the authored plaza handoff, followed by Waystone interaction below, is the
	// route proof rather than a map-id change.
	const crossroadsPoint = await currentHudPlayerPoint(page);
	expect(Math.abs(crossroadsPoint.x - 3_776)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(crossroadsPoint.y - 4_688)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);

	// Crossroads Waystone discovery. The authored approach goes around the
	// waystone collision and deliberately uses real interaction input.
	const waystoneApproachStart = await currentHudPlayerPoint(page);
	const waystoneNorthPoint = await moveRoute(page, [
		waystoneApproachStart,
		{ x: 4_032, y: 4_480 },
		{ x: 4_032, y: 4_224 }
	]);
	const waystonePoint = await moveRoute(page, [
		waystoneNorthPoint,
		// Preserve the actual settled y from the northbound leg. The discovery's
		// authored interaction radius makes this a valid live approach and avoids
		// re-correcting the keyboard-quantized y against a stale target.
		{ x: 3_904, y: waystoneNorthPoint.y }
	]);
	await page.waitForFunction(() => {
		const movementAt = (window as GlieseProbeWindow).__glieseLastMovementAt ?? 0;
		return movementAt > 0 && performance.now() - movementAt >= 50;
	});
	await page.keyboard.press('e', { delay: 50 });
	const discoveryDialog = page.getByRole('dialog');
	await expect(discoveryDialog).toBeVisible();
	await expect(discoveryDialog).toContainText(/Waystone|Crossroads/i);
	await discoveryDialog.getByRole('button', { name: 'Close' }).click();

	// Connector → village return, ending on the main street before the save.
	await moveRoute(page, [
		waystonePoint,
		{ x: 4_160, y: waystonePoint.y },
		{ x: 4_160, y: 4_480 },
		{ x: 3_776, y: 4_480 },
		{ x: 3_264, y: 4_688 },
		{ x: 320, y: 4_688 },
		{ x: 1_152, y: 4_800 }
	]);
	await expect(page.getByTestId('hud-location-panel')).toContainText('Sundrop Meadows');
	const movementDiagnosticsBeforeSave = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseMovementDiagnostics ?? []
	);
	assertCollisionDiagnosticsAreFaithful(movementDiagnosticsBeforeSave);

	const savedHudState = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseLastHudState ?? null
	);
	const savedPlayer = await currentHudPlayerPoint(page);
	expect(savedHudState?.mapId).toBe('meadow-entry');

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Save Game' }).click();
	await expect(fieldStatus(page)).toContainText('Saved');
	const persisted = await page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
		SAVE_STORAGE_KEY
	);
	expect({
		mapId: persisted?.mapId,
		player: { x: persisted?.player?.x, y: persisted?.player?.y }
	}).toEqual({
		mapId: 'meadow-entry',
		player: savedPlayer
	});
	expect(persisted?.flags?.collectedPickups).toContain('village-market-cache');
	expect(persisted?.seenDiscoveries).toContain('crossroads-waystone-sign');
	const cameraEvidence = await page.evaluate(() => {
		const probeWindow = window as GlieseProbeWindow;
		return {
			samples: probeWindow.__glieseCameraSamples ?? [],
			exteriorRouteTokens: probeWindow.__glieseExteriorRouteTokens ?? []
		};
	});

	await page.reload();
	await expect(page.locator('canvas')).toBeVisible();
	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
	await waitForExactHudPosition(page, 'meadow-entry', savedPlayer);
	const resumedHudState = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseLastHudState ?? null
	);
	expect({
		mapId: resumedHudState?.mapId,
		player: resumedHudState?.areaMap?.player
	}).toEqual({
		mapId: persisted.mapId,
		player: persisted.player && { x: persisted.player.x, y: persisted.player.y }
	});
	expect(resumedHudState?.inventory?.consumables).toEqual(
		expect.arrayContaining([expect.objectContaining({ itemId: 'field-potion', quantity: 2 })])
	);
	expect(await page.evaluate(() => sessionStorage.getItem('__gliese_e2e_save_seeded_v1'))).toBe(
		'1'
	);
	assertLiveMeadowCameraCoverage(cameraEvidence.samples, cameraEvidence.exteriorRouteTokens);
});

test('Meadow Entry starts as the active zero-background graybox and accepts movement', async ({
	page
}) => {
	await installRuntimeProbes(page);
	await page.goto('/?movementDiagnostics=on');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	await page.waitForFunction(() => {
		const diagnostics = (window as GlieseProbeWindow).__glieseRegionalBackgroundDiagnostics ?? [];
		return diagnostics.some((diagnostic) => diagnostic.mapId === 'meadow-entry');
	});
	const rendererDiagnostics = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseRegionalBackgroundDiagnostics ?? []
	);
	const meadowDiagnostics = rendererDiagnostics.filter(
		(diagnostic) => diagnostic.mapId === 'meadow-entry'
	);
	expect(meadowDiagnostics).toHaveLength(1);
	expect(meadowDiagnostics[0]).toEqual(
		expect.objectContaining({
			mapId: 'meadow-entry',
			entries: [],
			successfulBackgroundIds: [],
			selectedFallbackBlockerIds: [],
			selectedFallbackDecorIds: [],
			selectedFallbackFenceIds: []
		})
	);

	await expect(page.getByTestId('hud-location-panel')).toBeVisible();
	await expect(page.getByTestId('hud-party-panel')).toBeVisible();
	await expect(fieldStatus(page)).toBeVisible();
	await page.locator('canvas').click();
	await page.keyboard.down('ArrowLeft');
	try {
		await page.waitForFunction(
			() => {
				const diagnostics = (window as GlieseProbeWindow).__glieseMovementDiagnostics ?? [];
				return diagnostics.some(
					(diagnostic) =>
						diagnostic.mapId === 'meadow-entry' &&
						diagnostic.previousPosition.x === 704 &&
						diagnostic.previousPosition.y === 5_920 &&
						diagnostic.resolvedPosition.x < 704
				);
			},
			undefined,
			{ timeout: 5_000 }
		);
	} finally {
		await page.keyboard.up('ArrowLeft');
	}

	const movementDiagnostics = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseMovementDiagnostics ?? []
	);
	expect(movementDiagnostics[0]?.mapId).toBe('meadow-entry');
	expect(movementDiagnostics[0]?.previousPosition).toEqual({ x: 704, y: 5_920 });
	expect(movementDiagnostics.at(-1)?.resolvedPosition.x).toBeLessThan(704);
	expect(movementDiagnostics.at(-1)?.blocked).toBe(false);
});

test('browser-local route steering acknowledges a plan and continues through Phaser movement', async ({
	page
}) => {
	await installRuntimeProbes(page);
	// This listener is registered after the runner listener above. It models the
	// browser losing a held key after the first diagnostic; the lease must restore
	// the runner's desired direction without another host round-trip.
	await page.addInitScript(() => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseCharacterizationMovementCount = 0;
		probeWindow.__glieseCharacterizationSyntheticPhase = false;
		let interrupted = false;
		window.addEventListener('gliese:player-movement-diagnostic', () => {
			if (probeWindow.__glieseCharacterizationSyntheticPhase) return;
			probeWindow.__glieseCharacterizationMovementCount =
				(probeWindow.__glieseCharacterizationMovementCount ?? 0) + 1;
			if (interrupted) return;
			interrupted = true;
			const event = new KeyboardEvent('keyup', {
				bubbles: true,
				cancelable: true,
				code: 'ArrowRight',
				key: 'ArrowRight',
				location: 0,
				repeat: false
			});
			for (const field of ['keyCode', 'which'] as const) {
				Object.defineProperty(event, field, { configurable: true, value: 39 });
			}
			window.dispatchEvent(event);
		});
	});
	await page.goto('/?movementDiagnostics=on');
	await expect(page.locator('canvas')).toBeVisible();
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;
		return state?.ready === true && state.mapId === 'meadow-entry';
	});

	const initial = await page.evaluate(() => {
		const player = (window as GlieseProbeWindow).__glieseLastHudState?.areaMap?.player;
		return player && typeof player.x === 'number' && typeof player.y === 'number'
			? { x: player.x, y: player.y }
			: null;
	});
	expect(initial).not.toBeNull();
	const savedPlayerEvidenceProbe = await page.evaluate(() => {
		const probeWindow = window as GlieseProbeWindow;
		return {
			hudAt: probeWindow.__glieseLastHudAt ?? 0,
			movementAt: probeWindow.__glieseLastMovementAt ?? 0,
			diagnostic: probeWindow.__glieseLastMovementDiagnostic ?? null
		};
	});
	await page.evaluate((initialPoint) => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseLastHudAt = 100;
		probeWindow.__glieseLastMovementAt = 200;
		probeWindow.__glieseLastMovementDiagnostic = {
			mapId: 'meadow-entry',
			previousPosition: { x: initialPoint.x, y: initialPoint.y },
			requestedPosition: { x: initialPoint.x + 8, y: initialPoint.y + 4 },
			resolvedPosition: { x: initialPoint.x + 8, y: initialPoint.y + 4 },
			blocked: false
		};
	}, initial!);
	const freshDiagnosticEvidence = await currentHudPlayerEvidence(page, 'meadow-entry');
	expect(freshDiagnosticEvidence.mapMatchedDiagnosticPoint).toEqual({
		x: initial!.x + 8,
		y: initial!.y + 4
	});
	expect(freshDiagnosticEvidence.selectedPoint).toEqual(
		freshDiagnosticEvidence.mapMatchedDiagnosticPoint
	);
	expect(freshDiagnosticEvidence.diagnostic?.blocked).toBe(false);
	await page.evaluate(() => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseLastMovementDiagnostic = undefined;
		probeWindow.__glieseLastMovementAt = 0;
		probeWindow.__glieseLastHudAt = 300;
	});
	const hudFallbackEvidence = await currentHudPlayerEvidence(page, 'meadow-entry');
	expect(hudFallbackEvidence.mapMatchedDiagnosticPoint).toBeNull();
	expect(hudFallbackEvidence.selectedPoint).toEqual(hudFallbackEvidence.hudPoint);
	await page.evaluate((saved) => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseLastHudAt = saved.hudAt;
		probeWindow.__glieseLastMovementAt = saved.movementAt;
		probeWindow.__glieseLastMovementDiagnostic = saved.diagnostic ?? undefined;
	}, savedPlayerEvidenceProbe);
	const stateMachineEvidence = await page.evaluate(async (initialPoint) => {
		const probeWindow = window as GlieseProbeWindow;
		const runner = probeWindow.__glieseRouteRunner;
		if (!runner) return null;
		type SemanticDiagonalPlan = {
			token: string;
			expectedMapId: string;
			minY: number;
			maxYExclusive: number;
			xDirection: -1 | 1;
		};
		type SemanticDiagonalResult = {
			token: string;
			status: 'running' | 'done' | 'error';
			position: Point | null;
			diagnostics: PlayerMovementDiagnostic[];
			invalidDiagnostics: PlayerMovementDiagnostic[];
			activeKeys: string[];
			releasedKeys: string[];
			released: boolean;
			error?: string;
		};
		const semanticRunner = runner as typeof runner & {
			startGuildMasterSemanticDiagonal?: (plan: SemanticDiagonalPlan) => SemanticDiagonalResult;
			getGuildMasterSemanticDiagonal?: (token: string) => SemanticDiagonalResult | null;
		};
		type CaveDoorwayBandPlan = {
			token: string;
			expectedMapId: string;
			minX: number;
			maxXExclusive: number;
			expectedY: number;
		};
		type CaveDoorwayBandResult = {
			token: string;
			mapId: string;
			status: 'running' | 'done' | 'error';
			position: Point | null;
			diagnostics: PlayerMovementDiagnostic[];
			invalidDiagnostics: PlayerMovementDiagnostic[];
			activeKeys: string[];
			releasedKeys: string[];
			released: boolean;
			error?: string;
		};
		const caveDoorwayRunner = runner as typeof runner & {
			startCaveDoorwayBand?: (plan: CaveDoorwayBandPlan) => CaveDoorwayBandResult;
			getCaveDoorwayBand?: (token: string) => CaveDoorwayBandResult | null;
		};
		// RED: the diagnostic-synchronized semantic diagonal API is intentionally
		// absent until the browser-local runner implementation is added.
		const semanticApiAvailable =
			typeof semanticRunner.startGuildMasterSemanticDiagonal === 'function';
		const caveDoorwayApiAvailable = typeof caveDoorwayRunner.startCaveDoorwayBand === 'function';
		const dispatchDiagnostic = (detail: PlayerMovementDiagnostic) => {
			window.dispatchEvent(
				new CustomEvent<PlayerMovementDiagnostic>('gliese:player-movement-diagnostic', {
					detail
				})
			);
		};
		const resetMovementProbe = () => {
			probeWindow.__glieseLastMovementDiagnostic = undefined;
			probeWindow.__glieseLastMovementAt = 0;
			probeWindow.__glieseMovementDiagnostics = [];
		};

		probeWindow.__glieseCharacterizationSyntheticPhase = true;
		const staleDiagnosticToken = `characterization-stale-map-${Date.now()}`;
		probeWindow.__glieseLastMovementDiagnostic = {
			mapId: 'item-shop',
			previousPosition: { x: 416, y: 360 },
			requestedPosition: { x: 416, y: 360.4216 },
			resolvedPosition: { x: 416, y: 360.4216 },
			blocked: true
		};
		probeWindow.__glieseLastMovementAt = (probeWindow.__glieseLastHudAt ?? 0) + 1;
		const staleDiagnosticStart = runner.start({
			token: staleDiagnosticToken,
			points: [
				{ x: initialPoint.x, y: initialPoint.y },
				{ x: initialPoint.x + 16, y: initialPoint.y }
			],
			settleTolerance: 12,
			reachTolerance: 18,
			maxCorrectionTaps: 8,
			blockedTolerance: 12
		});
		const staleDiagnosticCancel = runner.cancel(
			staleDiagnosticToken,
			'synthetic stale-map diagnostic cleanup'
		);
		resetMovementProbe();
		const blockedToken = `characterization-blocked-${Date.now()}`;
		const blockedStart = runner.start({
			token: blockedToken,
			points: [
				{ x: initialPoint.x, y: initialPoint.y },
				{ x: initialPoint.x + 16, y: initialPoint.y + 64 }
			],
			settleTolerance: 12,
			reachTolerance: 18,
			maxCorrectionTaps: 8,
			blockedTolerance: 18
		});
		dispatchDiagnostic({
			mapId: 'meadow-entry',
			previousPosition: { ...initialPoint },
			requestedPosition: { x: initialPoint.x + 8, y: initialPoint.y + 16 },
			resolvedPosition: { x: initialPoint.x, y: initialPoint.y + 16 },
			blocked: true
		});
		const blockedAfter = runner.get(blockedToken);
		const blockedCancel = runner.cancel(blockedToken, 'synthetic blocked-axis cleanup');

		resetMovementProbe();
		const invalidBlockedToken = `characterization-invalid-blocked-${Date.now()}`;
		const invalidBlockedTarget = { x: initialPoint.x + 64, y: initialPoint.y };
		const invalidBlockedStart = runner.start({
			token: invalidBlockedToken,
			points: [{ ...initialPoint }, invalidBlockedTarget],
			settleTolerance: 12,
			reachTolerance: 18,
			maxCorrectionTaps: 8,
			blockedTolerance: 12
		});
		dispatchDiagnostic({
			mapId: 'meadow-entry',
			previousPosition: { ...initialPoint },
			requestedPosition: { x: initialPoint.x + 256, y: initialPoint.y },
			resolvedPosition: { x: initialPoint.x + 256, y: initialPoint.y },
			blocked: true
		});
		// A later clean event must not erase the earlier blocked evidence or make
		// the route authoritative again.
		dispatchDiagnostic({
			mapId: 'meadow-entry',
			previousPosition: { ...initialPoint },
			requestedPosition: { ...invalidBlockedTarget },
			resolvedPosition: { ...invalidBlockedTarget },
			blocked: false
		});
		const invalidBlockedAfter = runner.get(invalidBlockedToken);

		resetMovementProbe();
		const invalidMapToken = `characterization-invalid-map-${Date.now()}`;
		const invalidMapTarget = { x: initialPoint.x + 64, y: initialPoint.y };
		const invalidMapStart = runner.start({
			token: invalidMapToken,
			points: [{ ...initialPoint }, invalidMapTarget],
			settleTolerance: 12,
			reachTolerance: 18,
			maxCorrectionTaps: 8,
			blockedTolerance: 12
		});
		dispatchDiagnostic({
			mapId: 'item-shop',
			previousPosition: { ...initialPoint },
			requestedPosition: { x: initialPoint.x + 256, y: initialPoint.y },
			resolvedPosition: { x: initialPoint.x + 256, y: initialPoint.y },
			blocked: false
		});
		// A clean current-map event after the stale event must still leave the
		// route rejected, with the stale point excluded from authoritative state.
		dispatchDiagnostic({
			mapId: 'meadow-entry',
			previousPosition: { ...initialPoint },
			requestedPosition: { ...invalidMapTarget },
			resolvedPosition: { ...invalidMapTarget },
			blocked: false
		});
		const invalidMapAfter = runner.get(invalidMapToken);

		resetMovementProbe();
		const wrongDirectionToken = `characterization-wrong-direction-${Date.now()}`;
		const wrongDirectionStart = runner.start({
			token: wrongDirectionToken,
			points: [
				{ x: initialPoint.x, y: initialPoint.y },
				{ x: initialPoint.x + 1_000, y: initialPoint.y }
			],
			settleTolerance: 12,
			reachTolerance: 18,
			maxCorrectionTaps: 8,
			blockedTolerance: 12
		});
		const wrongDirectionBefore = runner.get(wrongDirectionToken);
		const wrongDirectionPosition = wrongDirectionBefore?.position ?? initialPoint;
		await new Promise((resolve) => setTimeout(resolve, 5));
		const wrongDirectionSnapshot = runner.get(wrongDirectionToken);
		const wrongDirectionPrevious = wrongDirectionSnapshot?.position ?? wrongDirectionPosition;
		const wrongDirectionLastProgressAt = wrongDirectionSnapshot?.lastProgressAt ?? null;
		dispatchDiagnostic({
			mapId: 'meadow-entry',
			previousPosition: { ...wrongDirectionPrevious },
			requestedPosition: { x: wrongDirectionPrevious.x - 8, y: wrongDirectionPrevious.y },
			resolvedPosition: { x: wrongDirectionPrevious.x - 8, y: wrongDirectionPrevious.y },
			blocked: false
		});
		const wrongDirectionAfter = runner.get(wrongDirectionToken);
		const wrongDirectionCancel = runner.cancel(
			wrongDirectionToken,
			'synthetic wrong-direction cleanup'
		);

		resetMovementProbe();
		const correctionToken = `characterization-correction-${Date.now()}`;
		const correctionTarget = { x: initialPoint.x + 64, y: initialPoint.y + 64 };
		const correctionStart = runner.start({
			token: correctionToken,
			points: [{ ...initialPoint }, correctionTarget],
			settleTolerance: 12,
			reachTolerance: 18,
			maxCorrectionTaps: 8,
			blockedTolerance: 12
		});
		const firstCorrectionPosition = {
			x: correctionTarget.x + 16.8016,
			y: initialPoint.y
		};
		dispatchDiagnostic({
			mapId: 'meadow-entry',
			previousPosition: { ...initialPoint },
			requestedPosition: { ...firstCorrectionPosition },
			resolvedPosition: { ...firstCorrectionPosition },
			blocked: false
		});
		const correctionBeforeCorrection = runner.get(correctionToken);
		const correctionPosition = {
			x: correctionTarget.x - 15.992,
			y: initialPoint.y
		};
		dispatchDiagnostic({
			mapId: 'meadow-entry',
			previousPosition: { ...firstCorrectionPosition },
			requestedPosition: { ...correctionPosition },
			resolvedPosition: { ...correctionPosition },
			blocked: false
		});
		const correctionAfterX = runner.get(correctionToken);
		dispatchDiagnostic({
			mapId: 'meadow-entry',
			previousPosition: { ...correctionPosition },
			requestedPosition: { x: correctionPosition.x, y: correctionTarget.y },
			resolvedPosition: { x: correctionPosition.x, y: correctionTarget.y },
			blocked: false
		});
		const correctionAfterY = runner.get(correctionToken);

		resetMovementProbe();
		const zeroMovementToken = `characterization-zero-movement-${Date.now()}`;
		const zeroMovement = runner.start({
			token: zeroMovementToken,
			points: [{ ...initialPoint }, { x: initialPoint.x + 8, y: initialPoint.y + 8 }],
			settleTolerance: 12,
			reachTolerance: 18,
			maxCorrectionTaps: 8,
			blockedTolerance: 12
		});

		resetMovementProbe();
		const exhaustedFarToken = `characterization-correction-far-${Date.now()}`;
		const exhaustedFarStart = runner.start({
			token: exhaustedFarToken,
			points: [{ ...initialPoint }, correctionTarget],
			settleTolerance: 12,
			reachTolerance: 18,
			maxCorrectionTaps: 0,
			blockedTolerance: 12
		});
		const exhaustedFarPosition = {
			x: correctionTarget.x + 18.01,
			y: initialPoint.y
		};
		dispatchDiagnostic({
			mapId: 'meadow-entry',
			previousPosition: { ...initialPoint },
			requestedPosition: { ...exhaustedFarPosition },
			resolvedPosition: { ...exhaustedFarPosition },
			blocked: false
		});
		const exhaustedFarAfter = runner.get(exhaustedFarToken);
		const exhaustedFarCancel = runner.cancel(exhaustedFarToken, 'synthetic far correction cleanup');

		resetMovementProbe();
		const blockedExhaustedToken = `characterization-correction-blocked-${Date.now()}`;
		const blockedExhaustedStart = runner.start({
			token: blockedExhaustedToken,
			points: [{ ...initialPoint }, correctionTarget],
			settleTolerance: 12,
			reachTolerance: 18,
			maxCorrectionTaps: 0,
			blockedTolerance: 12
		});
		const blockedExhaustedPosition = {
			x: correctionTarget.x + 16,
			y: initialPoint.y
		};
		dispatchDiagnostic({
			mapId: 'meadow-entry',
			previousPosition: { ...blockedExhaustedPosition },
			requestedPosition: { ...blockedExhaustedPosition },
			resolvedPosition: { ...blockedExhaustedPosition },
			blocked: true
		});
		dispatchDiagnostic({
			mapId: 'meadow-entry',
			previousPosition: { ...initialPoint },
			requestedPosition: { ...correctionTarget },
			resolvedPosition: { ...correctionTarget },
			blocked: false
		});
		const blockedExhaustedAfter = runner.get(blockedExhaustedToken);
		const blockedExhaustedCancel = runner.cancel(
			blockedExhaustedToken,
			'synthetic blocked correction cleanup'
		);

		let semanticCharacterization: {
			successStart: SemanticDiagonalResult;
			successAfterFirst: SemanticDiagonalResult;
			successAfterLater: SemanticDiagonalResult;
			aboveBandStart: SemanticDiagonalResult;
			aboveBandAfter: SemanticDiagonalResult;
			inBandStart: SemanticDiagonalResult;
			inBandAfter: SemanticDiagonalResult;
			wrongMap: SemanticDiagonalResult;
			blocked: SemanticDiagonalResult;
			overshoot: SemanticDiagonalResult;
			zeroMovement: SemanticDiagonalResult;
		} | null = null;
		if (
			semanticApiAvailable &&
			semanticRunner.startGuildMasterSemanticDiagonal &&
			semanticRunner.getGuildMasterSemanticDiagonal
		) {
			const semanticBand = {
				minY: initialPoint.y + 8,
				maxYExclusive: initialPoint.y + 24
			};
			const semanticPlan = (suffix: string): SemanticDiagonalPlan => ({
				token: `characterization-semantic-diagonal-${suffix}-${Date.now()}`,
				expectedMapId: 'meadow-entry',
				...semanticBand,
				xDirection: -1
			});
			const semanticStartWithPlan = (plan: SemanticDiagonalPlan) => {
				resetMovementProbe();
				return semanticRunner.startGuildMasterSemanticDiagonal!(plan);
			};
			const semanticStart = (suffix: string) => semanticStartWithPlan(semanticPlan(suffix));
			const semanticGet = (token: string) => semanticRunner.getGuildMasterSemanticDiagonal!(token)!;

			const successStart = semanticStart('success');
			dispatchDiagnostic({
				mapId: 'meadow-entry',
				previousPosition: { ...initialPoint },
				requestedPosition: { x: initialPoint.x - 8, y: initialPoint.y + 12 },
				resolvedPosition: { x: initialPoint.x - 8, y: initialPoint.y + 12 },
				blocked: false
			});
			const successAfterFirst = semanticGet(successStart.token);
			dispatchDiagnostic({
				mapId: 'meadow-entry',
				previousPosition: { x: initialPoint.x - 8, y: initialPoint.y + 12 },
				requestedPosition: { x: initialPoint.x - 16, y: initialPoint.y + 16 },
				resolvedPosition: { x: initialPoint.x - 16, y: initialPoint.y + 16 },
				blocked: false
			});
			const successAfterLater = semanticGet(successStart.token);

			const aboveBandPlan = (suffix: string): SemanticDiagonalPlan => ({
				token: `characterization-semantic-diagonal-${suffix}-${Date.now()}`,
				expectedMapId: 'meadow-entry',
				minY: initialPoint.y - 24,
				maxYExclusive: initialPoint.y - 8,
				xDirection: -1
			});
			const aboveBandStart = semanticStartWithPlan(aboveBandPlan('above-band'));
			dispatchDiagnostic({
				mapId: 'meadow-entry',
				previousPosition: { ...initialPoint },
				requestedPosition: { x: initialPoint.x - 8, y: initialPoint.y - 4 },
				resolvedPosition: { x: initialPoint.x - 8, y: initialPoint.y - 4 },
				blocked: false
			});
			dispatchDiagnostic({
				mapId: 'meadow-entry',
				previousPosition: { x: initialPoint.x - 8, y: initialPoint.y - 4 },
				requestedPosition: { x: initialPoint.x - 16, y: initialPoint.y - 12 },
				resolvedPosition: { x: initialPoint.x - 16, y: initialPoint.y - 12 },
				blocked: false
			});
			const aboveBandAfter = semanticGet(aboveBandStart.token);

			const inBandStart = semanticStartWithPlan({
				token: `characterization-semantic-diagonal-in-band-${Date.now()}`,
				expectedMapId: 'meadow-entry',
				minY: initialPoint.y - 8,
				maxYExclusive: initialPoint.y + 8,
				xDirection: -1
			});
			const inBandAfter = semanticGet(inBandStart.token);

			const wrongMapStart = semanticStart('wrong-map');
			dispatchDiagnostic({
				mapId: 'item-shop',
				previousPosition: { ...initialPoint },
				requestedPosition: { x: initialPoint.x - 8, y: initialPoint.y + 12 },
				resolvedPosition: { x: initialPoint.x - 8, y: initialPoint.y + 12 },
				blocked: false
			});
			const wrongMap = semanticGet(wrongMapStart.token);

			const blockedStart = semanticStart('blocked');
			dispatchDiagnostic({
				mapId: 'meadow-entry',
				previousPosition: { ...initialPoint },
				requestedPosition: { x: initialPoint.x - 8, y: initialPoint.y + 12 },
				resolvedPosition: { ...initialPoint },
				blocked: true
			});
			const blocked = semanticGet(blockedStart.token);

			const overshootStart = semanticStart('overshoot');
			dispatchDiagnostic({
				mapId: 'meadow-entry',
				previousPosition: { ...initialPoint },
				requestedPosition: { x: initialPoint.x - 8, y: initialPoint.y + 32 },
				resolvedPosition: { x: initialPoint.x - 8, y: initialPoint.y + 32 },
				blocked: false
			});
			const overshoot = semanticGet(overshootStart.token);

			const zeroMovementStart = semanticStart('zero-movement');
			dispatchDiagnostic({
				mapId: 'meadow-entry',
				previousPosition: { ...initialPoint },
				requestedPosition: { ...initialPoint },
				resolvedPosition: { ...initialPoint },
				blocked: false
			});
			const zeroMovement = semanticGet(zeroMovementStart.token);
			semanticCharacterization = {
				successStart,
				successAfterFirst,
				successAfterLater,
				aboveBandStart,
				aboveBandAfter,
				inBandStart,
				inBandAfter,
				wrongMap,
				blocked,
				overshoot,
				zeroMovement
			};
		}

		let caveDoorwayCharacterization: {
			rightStart: CaveDoorwayBandResult;
			rightAfter: CaveDoorwayBandResult;
			leftStart: CaveDoorwayBandResult;
			leftAfter: CaveDoorwayBandResult;
			inBandStart: CaveDoorwayBandResult;
			inBandAfter: CaveDoorwayBandResult;
			blocked: CaveDoorwayBandResult;
			wrongMap: CaveDoorwayBandResult;
			overshoot: CaveDoorwayBandResult;
			zeroMovement: CaveDoorwayBandResult;
		} | null = null;
		let itemShopBandCharacterization: {
			outOfBandStart: CaveDoorwayBandResult;
			outOfBandAfter: CaveDoorwayBandResult;
			inBandStart: CaveDoorwayBandResult;
			inBandAfter: CaveDoorwayBandResult;
			blocked: CaveDoorwayBandResult;
			wrongMap: CaveDoorwayBandResult;
			undershoot: CaveDoorwayBandResult;
			nonMonotonic: CaveDoorwayBandResult;
		} | null = null;
		if (
			caveDoorwayApiAvailable &&
			caveDoorwayRunner.startCaveDoorwayBand &&
			caveDoorwayRunner.getCaveDoorwayBand
		) {
			const caveBand = {
				minX: initialPoint.x + 8,
				maxXExclusive: initialPoint.x + 24,
				expectedY: initialPoint.y
			};
			const cavePlan = (suffix: string): CaveDoorwayBandPlan => ({
				token: `characterization-cave-doorway-${suffix}-${Date.now()}`,
				expectedMapId: 'meadow-entry',
				...caveBand
			});
			const setSyntheticPositionForMap = (mapId: string, position: Point) => {
				probeWindow.__glieseLastHudState = {
					...(probeWindow.__glieseLastHudState ?? {}),
					mapId,
					areaMap: { player: { ...position } }
				};
				probeWindow.__glieseLastHudAt = 500;
				probeWindow.__glieseLastMovementDiagnostic = undefined;
				probeWindow.__glieseLastMovementAt = 0;
			};
			const setSyntheticPosition = (position: Point) =>
				setSyntheticPositionForMap('meadow-entry', position);
			const caveStart = (suffix: string, position: Point) => {
				resetMovementProbe();
				setSyntheticPosition(position);
				return caveDoorwayRunner.startCaveDoorwayBand!(cavePlan(suffix));
			};
			const caveGet = (token: string) => caveDoorwayRunner.getCaveDoorwayBand!(token)!;

			const rightStart = caveStart('right', { x: initialPoint.x + 32, y: initialPoint.y });
			dispatchDiagnostic({
				mapId: 'meadow-entry',
				previousPosition: { x: initialPoint.x + 32, y: initialPoint.y },
				requestedPosition: { x: initialPoint.x + 16, y: initialPoint.y },
				resolvedPosition: { x: initialPoint.x + 16, y: initialPoint.y },
				blocked: false
			});
			const rightAfter = caveGet(rightStart.token);

			const leftStart = caveStart('left', { x: initialPoint.x - 16, y: initialPoint.y });
			dispatchDiagnostic({
				mapId: 'meadow-entry',
				previousPosition: { x: initialPoint.x - 16, y: initialPoint.y },
				requestedPosition: { x: initialPoint.x + 16, y: initialPoint.y },
				resolvedPosition: { x: initialPoint.x + 16, y: initialPoint.y },
				blocked: false
			});
			const leftAfter = caveGet(leftStart.token);

			const inBandStart = caveStart('in-band', { x: initialPoint.x + 16, y: initialPoint.y });
			const inBandAfter = caveGet(inBandStart.token);

			const blockedStart = caveStart('blocked', { x: initialPoint.x + 32, y: initialPoint.y });
			dispatchDiagnostic({
				mapId: 'meadow-entry',
				previousPosition: { x: initialPoint.x + 32, y: initialPoint.y },
				requestedPosition: { x: initialPoint.x + 16, y: initialPoint.y },
				resolvedPosition: { x: initialPoint.x + 32, y: initialPoint.y },
				blocked: true
			});
			const blocked = caveGet(blockedStart.token);

			const wrongMapStart = caveStart('wrong-map', { x: initialPoint.x + 32, y: initialPoint.y });
			dispatchDiagnostic({
				mapId: 'item-shop',
				previousPosition: { x: initialPoint.x + 32, y: initialPoint.y },
				requestedPosition: { x: initialPoint.x + 16, y: initialPoint.y },
				resolvedPosition: { x: initialPoint.x + 16, y: initialPoint.y },
				blocked: false
			});
			const wrongMap = caveGet(wrongMapStart.token);

			const overshootStart = caveStart('overshoot', { x: initialPoint.x + 32, y: initialPoint.y });
			dispatchDiagnostic({
				mapId: 'meadow-entry',
				previousPosition: { x: initialPoint.x + 32, y: initialPoint.y },
				requestedPosition: { x: initialPoint.x - 16, y: initialPoint.y },
				resolvedPosition: { x: initialPoint.x - 16, y: initialPoint.y },
				blocked: false
			});
			const overshoot = caveGet(overshootStart.token);

			const zeroMovementStart = caveStart('zero-movement', {
				x: initialPoint.x + 32,
				y: initialPoint.y
			});
			dispatchDiagnostic({
				mapId: 'meadow-entry',
				previousPosition: { x: initialPoint.x + 32, y: initialPoint.y },
				requestedPosition: { x: initialPoint.x + 32, y: initialPoint.y },
				resolvedPosition: { x: initialPoint.x + 32, y: initialPoint.y },
				blocked: false
			});
			const zeroMovement = caveGet(zeroMovementStart.token);
			caveDoorwayCharacterization = {
				rightStart,
				rightAfter,
				leftStart,
				leftAfter,
				inBandStart,
				inBandAfter,
				blocked,
				wrongMap,
				overshoot,
				zeroMovement
			};

			const itemShopBand = {
				minX: 446,
				maxXExclusive: 468,
				expectedY: initialPoint.y
			};
			const itemShopPlan = (suffix: string): CaveDoorwayBandPlan => ({
				token: `characterization-item-shop-stockroom-band-${suffix}-${Date.now()}`,
				expectedMapId: 'item-shop',
				...itemShopBand
			});
			const itemShopStart = (suffix: string, position: Point) => {
				resetMovementProbe();
				setSyntheticPositionForMap('item-shop', position);
				return caveDoorwayRunner.startCaveDoorwayBand!(itemShopPlan(suffix));
			};
			const itemShopGet = (token: string) => caveDoorwayRunner.getCaveDoorwayBand!(token)!;
			const outOfBandPoint = { x: 470.729599999999, y: initialPoint.y };
			const outOfBandStart = itemShopStart('out-of-band', outOfBandPoint);
			dispatchDiagnostic({
				mapId: 'item-shop',
				previousPosition: { ...outOfBandPoint },
				requestedPosition: { x: 462, y: initialPoint.y },
				resolvedPosition: { x: 462, y: initialPoint.y },
				blocked: false
			});
			const outOfBandAfter = itemShopGet(outOfBandStart.token);

			const inBandPoint = { x: 460, y: initialPoint.y };
			const itemBandInBandStart = itemShopStart('in-band', inBandPoint);
			const itemBandInBandAfter = itemShopGet(itemBandInBandStart.token);

			const blockedPoint = { x: 470, y: initialPoint.y };
			const itemBandBlockedStart = itemShopStart('blocked', blockedPoint);
			dispatchDiagnostic({
				mapId: 'item-shop',
				previousPosition: { ...blockedPoint },
				requestedPosition: { x: 462, y: initialPoint.y },
				resolvedPosition: { ...blockedPoint },
				blocked: true
			});
			const itemBandBlocked = itemShopGet(itemBandBlockedStart.token);

			const wrongMapPoint = { x: 470, y: initialPoint.y };
			const itemBandWrongMapStart = itemShopStart('wrong-map', wrongMapPoint);
			dispatchDiagnostic({
				mapId: 'guild-hall',
				previousPosition: { ...wrongMapPoint },
				requestedPosition: { x: 462, y: initialPoint.y },
				resolvedPosition: { x: 462, y: initialPoint.y },
				blocked: false
			});
			const itemBandWrongMap = itemShopGet(itemBandWrongMapStart.token);

			const undershootPoint = { x: 470, y: initialPoint.y };
			const itemBandUndershootStart = itemShopStart('undershoot', undershootPoint);
			dispatchDiagnostic({
				mapId: 'item-shop',
				previousPosition: { ...undershootPoint },
				requestedPosition: { x: 445, y: initialPoint.y },
				resolvedPosition: { x: 445, y: initialPoint.y },
				blocked: false
			});
			const itemBandUndershoot = itemShopGet(itemBandUndershootStart.token);

			const nonMonotonicPoint = { x: 470, y: initialPoint.y };
			const itemBandNonMonotonicStart = itemShopStart('non-monotonic', nonMonotonicPoint);
			dispatchDiagnostic({
				mapId: 'item-shop',
				previousPosition: { ...nonMonotonicPoint },
				requestedPosition: { x: 474, y: initialPoint.y },
				resolvedPosition: { x: 474, y: initialPoint.y },
				blocked: false
			});
			const itemBandNonMonotonic = itemShopGet(itemBandNonMonotonicStart.token);
			itemShopBandCharacterization = {
				outOfBandStart,
				outOfBandAfter,
				inBandStart: itemBandInBandStart,
				inBandAfter: itemBandInBandAfter,
				blocked: itemBandBlocked,
				wrongMap: itemBandWrongMap,
				undershoot: itemBandUndershoot,
				nonMonotonic: itemBandNonMonotonic
			};
			// Synthetic cave cases temporarily move the probe HUD so the browser-local
			// contract can derive its direction. Restore the real characterization start
			// before the shared route acknowledgement below.
			setSyntheticPosition(initialPoint);
		}

		probeWindow.__glieseCharacterizationSyntheticPhase = false;
		resetMovementProbe();
		return {
			semanticApiAvailable,
			semanticCharacterization,
			caveDoorwayApiAvailable,
			caveDoorwayCharacterization,
			itemShopBandCharacterization,
			invalidBlockedStart,
			invalidBlockedAfter,
			invalidMapStart,
			invalidMapAfter,
			staleDiagnosticStart,
			staleDiagnosticCancel,
			blockedStart,
			blockedAfter,
			blockedCancel,
			wrongDirectionStart,
			wrongDirectionLastProgressAt,
			wrongDirectionAfter,
			wrongDirectionCancel,
			correctionStart,
			correctionBeforeCorrection,
			correctionAfterX,
			correctionAfterY,
			zeroMovement,
			exhaustedFarStart,
			exhaustedFarAfter,
			exhaustedFarCancel,
			blockedExhaustedStart,
			blockedExhaustedAfter,
			blockedExhaustedCancel
		};
	}, initial!);
	expect(stateMachineEvidence).not.toBeNull();
	const evidence = stateMachineEvidence!;
	expect(evidence.semanticApiAvailable).toBe(true);
	const semanticCharacterization = evidence.semanticCharacterization!;
	expect(semanticCharacterization).not.toBeNull();
	const semanticSuccess = semanticCharacterization!;
	expect(semanticSuccess.successStart.status).toBe('running');
	expect(semanticSuccess.successAfterFirst.status).toBe('done');
	expect(semanticSuccess.successAfterFirst.diagnostics).toHaveLength(1);
	expect(semanticSuccess.successAfterLater.diagnostics).toHaveLength(1);
	expect(semanticSuccess.successAfterLater.position).toEqual(
		semanticSuccess.successAfterFirst.position
	);
	expect(semanticSuccess.aboveBandStart.status).toBe('running');
	expect(semanticSuccess.aboveBandAfter.status).toBe('done');
	expect(semanticSuccess.aboveBandAfter.diagnostics).toHaveLength(2);
	expect(semanticSuccess.aboveBandAfter.releasedKeys).toEqual(['ArrowLeft', 'ArrowUp']);
	expect(semanticSuccess.inBandStart.status).toBe('done');
	expect(semanticSuccess.inBandAfter.status).toBe('done');
	expect(semanticSuccess.inBandAfter.diagnostics).toEqual([]);
	expect(semanticSuccess.inBandAfter.releasedKeys).toEqual([]);
	for (const result of [
		semanticSuccess.successAfterFirst,
		semanticSuccess.wrongMap,
		semanticSuccess.blocked,
		semanticSuccess.overshoot,
		semanticSuccess.zeroMovement
	]) {
		expect(result.activeKeys).toEqual([]);
		expect(result.released).toBe(true);
	}
	expect(semanticSuccess.successAfterFirst.invalidDiagnostics).toEqual([]);
	expect(semanticSuccess.wrongMap.status).toBe('error');
	expect(semanticSuccess.wrongMap.invalidDiagnostics).toHaveLength(1);
	expect(semanticSuccess.wrongMap.invalidDiagnostics[0]?.mapId).toBe('item-shop');
	expect(semanticSuccess.blocked.status).toBe('error');
	expect(semanticSuccess.blocked.invalidDiagnostics[0]?.blocked).toBe(true);
	expect(semanticSuccess.overshoot.status).toBe('error');
	expect(semanticSuccess.overshoot.error).toContain('overshot');
	expect(semanticSuccess.zeroMovement.status).toBe('error');
	expect(semanticSuccess.zeroMovement.error).toContain('monotonic progress');
	expect(evidence.caveDoorwayApiAvailable).toBe(true);
	const caveDoorwayCharacterization = evidence.caveDoorwayCharacterization!;
	expect(caveDoorwayCharacterization).not.toBeNull();
	expect(caveDoorwayCharacterization.rightStart.status).toBe('running');
	expect(caveDoorwayCharacterization.rightAfter.status).toBe('done');
	expect(caveDoorwayCharacterization.rightAfter.releasedKeys).toEqual(['ArrowLeft']);
	expect(caveDoorwayCharacterization.rightAfter.diagnostics).toHaveLength(1);
	expect(caveDoorwayCharacterization.leftStart.status).toBe('running');
	expect(caveDoorwayCharacterization.leftAfter.status).toBe('done');
	expect(caveDoorwayCharacterization.leftAfter.releasedKeys).toEqual(['ArrowRight']);
	expect(caveDoorwayCharacterization.leftAfter.diagnostics).toHaveLength(1);
	expect(caveDoorwayCharacterization.inBandStart.status).toBe('done');
	expect(caveDoorwayCharacterization.inBandAfter.diagnostics).toEqual([]);
	expect(caveDoorwayCharacterization.inBandAfter.releasedKeys).toEqual([]);
	expect(caveDoorwayCharacterization.blocked.status).toBe('error');
	expect(caveDoorwayCharacterization.blocked.invalidDiagnostics[0]?.blocked).toBe(true);
	expect(caveDoorwayCharacterization.wrongMap.status).toBe('error');
	expect(caveDoorwayCharacterization.wrongMap.invalidDiagnostics[0]?.mapId).toBe('item-shop');
	expect(caveDoorwayCharacterization.overshoot.status).toBe('error');
	expect(caveDoorwayCharacterization.overshoot.error).toContain('overshot');
	expect(caveDoorwayCharacterization.zeroMovement.status).toBe('error');
	expect(caveDoorwayCharacterization.zeroMovement.error).toContain('monotonic progress');
	const itemShopBandCharacterization = evidence.itemShopBandCharacterization!;
	expect(itemShopBandCharacterization).not.toBeNull();
	expect(itemShopBandCharacterization.outOfBandStart.status).toBe('running');
	expect(itemShopBandCharacterization.outOfBandAfter.status).toBe('done');
	expect(itemShopBandCharacterization.outOfBandAfter.mapId).toBe('item-shop');
	expect(itemShopBandCharacterization.outOfBandAfter.position).toEqual({
		x: 462,
		y: initial!.y
	});
	expect(itemShopBandCharacterization.outOfBandAfter.releasedKeys).toEqual(['ArrowLeft']);
	expect(itemShopBandCharacterization.outOfBandAfter.diagnostics).toHaveLength(1);
	expect(itemShopBandCharacterization.outOfBandAfter.invalidDiagnostics).toEqual([]);
	expect(itemShopBandCharacterization.outOfBandAfter.activeKeys).toEqual([]);
	expect(itemShopBandCharacterization.outOfBandAfter.released).toBe(true);
	expect(itemShopBandCharacterization.inBandStart.status).toBe('done');
	expect(itemShopBandCharacterization.inBandAfter.status).toBe('done');
	expect(itemShopBandCharacterization.inBandAfter.position).toEqual({
		x: 460,
		y: initial!.y
	});
	expect(itemShopBandCharacterization.inBandAfter.diagnostics).toEqual([]);
	expect(itemShopBandCharacterization.inBandAfter.releasedKeys).toEqual([]);
	expect(itemShopBandCharacterization.inBandAfter.activeKeys).toEqual([]);
	expect(itemShopBandCharacterization.inBandAfter.released).toBe(true);
	expect(itemShopBandCharacterization.blocked.status).toBe('error');
	expect(itemShopBandCharacterization.blocked.invalidDiagnostics[0]?.blocked).toBe(true);
	expect(itemShopBandCharacterization.blocked.activeKeys).toEqual([]);
	expect(itemShopBandCharacterization.blocked.released).toBe(true);
	expect(itemShopBandCharacterization.wrongMap.status).toBe('error');
	expect(itemShopBandCharacterization.wrongMap.invalidDiagnostics[0]?.mapId).toBe('guild-hall');
	expect(itemShopBandCharacterization.undershoot.status).toBe('error');
	expect(itemShopBandCharacterization.undershoot.error).toContain('overshot');
	expect(itemShopBandCharacterization.nonMonotonic.status).toBe('error');
	expect(itemShopBandCharacterization.nonMonotonic.error).toContain('monotonic progress');
	const wrongDirectionStart = evidence.wrongDirectionStart!;
	const wrongDirectionAfter = evidence.wrongDirectionAfter!;
	const blockedStart = evidence.blockedStart!;
	const blockedAfter = evidence.blockedAfter!;
	const blockedCancel = evidence.blockedCancel!;
	const staleDiagnosticStart = evidence.staleDiagnosticStart!;
	const staleDiagnosticCancel = evidence.staleDiagnosticCancel!;
	const invalidBlockedStart = evidence.invalidBlockedStart!;
	const invalidBlockedAfter = evidence.invalidBlockedAfter!;
	const invalidMapStart = evidence.invalidMapStart!;
	const invalidMapAfter = evidence.invalidMapAfter!;
	const correctionStart = evidence.correctionStart!;
	const correctionBeforeCorrection = evidence.correctionBeforeCorrection!;
	const correctionAfterX = evidence.correctionAfterX!;
	const correctionAfterY = evidence.correctionAfterY!;
	const zeroMovement = evidence.zeroMovement!;
	const exhaustedFarStart = evidence.exhaustedFarStart!;
	const exhaustedFarAfter = evidence.exhaustedFarAfter!;
	const exhaustedFarCancel = evidence.exhaustedFarCancel!;
	const blockedExhaustedStart = evidence.blockedExhaustedStart!;
	const blockedExhaustedAfter = evidence.blockedExhaustedAfter!;
	const blockedExhaustedCancel = evidence.blockedExhaustedCancel!;
	expect(wrongDirectionStart.status).toBe('running');
	expect(wrongDirectionAfter.status).toBe('running');
	expect(wrongDirectionAfter.lastProgressAt).toBe(evidence.wrongDirectionLastProgressAt);
	expect(staleDiagnosticStart.status).toBe('running');
	expect(staleDiagnosticStart.position).toEqual(initial);
	expect(staleDiagnosticCancel.status).toBe('error');
	expect(invalidBlockedStart.status).toBe('running');
	expect(invalidBlockedAfter.status).toBe('error');
	expect(invalidBlockedAfter.position).toEqual({ x: initial!.x + 64, y: initial!.y });
	expect(invalidBlockedAfter.diagnostics).toHaveLength(1);
	expect(invalidBlockedAfter.invalidDiagnostics).toHaveLength(1);
	expect(invalidBlockedAfter.invalidDiagnostics?.[0]?.blocked).toBe(true);
	expect(invalidMapStart.status).toBe('running');
	expect(invalidMapAfter.status).toBe('error');
	expect(invalidMapAfter.position).toEqual({ x: initial!.x + 64, y: initial!.y });
	expect(invalidMapAfter.diagnostics).toHaveLength(1);
	expect(invalidMapAfter.invalidDiagnostics).toHaveLength(1);
	expect(invalidMapAfter.invalidDiagnostics?.[0]?.mapId).toBe('item-shop');
	expect(blockedStart.status).toBe('running');
	expect(blockedAfter.status).toBe('running');
	expect(blockedAfter.pointIndex).toBe(1);
	expect(blockedAfter.axis).toBe('x');
	expect(blockedAfter.target).toEqual({
		x: initial!.x + 16,
		y: initial!.y + 64
	});
	expect(blockedAfter.position).toEqual(initial);
	expect(blockedAfter.diagnostics).toEqual([]);
	expect(blockedAfter.invalidDiagnostics).toHaveLength(1);
	expect(blockedAfter.invalidDiagnostics?.[0]?.blocked).toBe(true);
	expect(blockedCancel.status).toBe('error');
	expect(correctionStart.status).toBe('running');
	expect(correctionBeforeCorrection.status).toBe('running');
	expect(correctionBeforeCorrection.pointIndex).toBe(1);
	expect(correctionBeforeCorrection.axis).toBe('x');
	expect(correctionBeforeCorrection.position).toEqual({
		x: initial!.x + 64 + 16.8016,
		y: initial!.y
	});
	expect(correctionAfterX.status).toBe('running');
	expect(correctionAfterX.pointIndex).toBe(1);
	expect(correctionAfterX.axis).toBe('y');
	expect(correctionAfterX.target).toEqual({
		x: initial!.x + 64,
		y: initial!.y + 64
	});
	expect(correctionAfterY.status).toBe('done');
	// Characterize the shared terminal helper's legitimate no-input branch: a
	// target inside the unchanged settle tolerance completes with no diagnostics.
	expect(zeroMovement.status).toBe('done');
	expect(zeroMovement.activeKey).toBeNull();
	expect(zeroMovement.position).toEqual(initial);
	expect(zeroMovement.lastDiagnostic).toBeNull();
	expect(zeroMovement.axisHistory).toEqual([]);
	expect(zeroMovement.diagnostics).toEqual([]);
	expect(zeroMovement.diagnosticAxes).toEqual([]);
	expect(zeroMovement.movementCount).toBe(0);
	// Characterize the Meadow live-route oracle's zero-input branch against the
	// authored Wildwood bank: a safe settled destination ignores the transit
	// envelope, an unsafe settled destination is rejected, and a segment beyond
	// settle tolerance still retains the transit-envelope check.
	const wildwoodBank = wildwoodForestLaneWestBankRect();
	const liveOracleY = wildwoodBank.y + wildwoodBank.height / 2;
	const liveOracleStart = {
		x: wildwoodBank.x - PLAYER_COLLISION_RADIUS - 4,
		y: liveOracleY
	};
	const liveOracleSafeNoOpDestination = {
		x: liveOracleStart.x - 4,
		y: liveOracleY
	};
	const liveOracleUnsafeNoOpDestination = {
		x: wildwoodBank.x - PLAYER_COLLISION_RADIUS + 1,
		y: liveOracleY
	};
	const liveOracleTraversedDestination = {
		x: liveOracleStart.x - AXIS_REACH_TOLERANCE,
		y: liveOracleY
	};
	expect(
		Math.max(
			Math.abs(liveOracleSafeNoOpDestination.x - liveOracleStart.x),
			Math.abs(liveOracleSafeNoOpDestination.y - liveOracleStart.y)
		)
	).toBeLessThanOrEqual(AXIS_SETTLE_TOLERANCE);
	expect(
		meadowEntrySegmentIsWalkable(
			liveOracleStart,
			liveOracleSafeNoOpDestination,
			MEADOW_ENTRY_TRANSIT_COLLISION_PADDING,
			PLAYER_COLLISION_RADIUS,
			MEADOW_ENTRY_TRANSIT_COLLISION_PADDING
		)
	).toBe(false);
	expect(
		meadowEntryLiveSegmentIsWalkable(
			liveOracleStart,
			liveOracleSafeNoOpDestination,
			MEADOW_ENTRY_TRANSIT_COLLISION_PADDING,
			PLAYER_COLLISION_RADIUS,
			MEADOW_ENTRY_TRANSIT_COLLISION_PADDING
		)
	).toBe(true);
	expect(
		meadowEntryLiveSegmentIsWalkable(
			liveOracleStart,
			liveOracleUnsafeNoOpDestination,
			MEADOW_ENTRY_TRANSIT_COLLISION_PADDING,
			PLAYER_COLLISION_RADIUS,
			MEADOW_ENTRY_TRANSIT_COLLISION_PADDING
		)
	).toBe(false);
	expect(
		Math.max(
			Math.abs(liveOracleTraversedDestination.x - liveOracleStart.x),
			Math.abs(liveOracleTraversedDestination.y - liveOracleStart.y)
		)
	).toBeGreaterThan(AXIS_SETTLE_TOLERANCE);
	expect(
		meadowEntrySegmentIsWalkable(
			liveOracleStart,
			liveOracleTraversedDestination,
			PLAYER_COLLISION_RADIUS,
			PLAYER_COLLISION_RADIUS,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(true);
	expect(
		meadowEntryLiveSegmentIsWalkable(
			liveOracleStart,
			liveOracleTraversedDestination,
			MEADOW_ENTRY_TRANSIT_COLLISION_PADDING,
			PLAYER_COLLISION_RADIUS,
			MEADOW_ENTRY_TRANSIT_COLLISION_PADDING
		)
	).toBe(false);
	// Characterize both Item Shop fixed-axis contract branches independently of
	// browser frame timing: a target already inside reach has no axis diagnostic,
	// while a traversed target retains the strict fixed-axis evidence checks.
	const officeDoorway = itemShopDoorwayOpenBand('office');
	const fixedAxisContractStart = { x: 289, y: 144 };
	const fixedAxisContractObstacles = [officeDoorway.northWall, officeDoorway.southWall];
	const zeroFixedAxisContractResult: BrowserRouteResult = {
		token: 'characterization-item-shop-fixed-axis-zero',
		mapId: 'item-shop',
		status: 'done',
		pointIndex: 1,
		axis: null,
		position: { ...fixedAxisContractStart },
		target: null,
		lastDiagnostic: null,
		axisHistory: [],
		diagnostics: [],
		diagnosticAxes: [],
		activeKey: null
	};
	assertItemShopFixedAxisRouteContract(
		[fixedAxisContractStart, { x: fixedAxisContractStart.x + 8, y: fixedAxisContractStart.y }],
		zeroFixedAxisContractResult,
		'x',
		fixedAxisContractObstacles,
		'characterization Item Shop fixed-axis zero movement'
	);
	const movedFixedAxisContractResult: BrowserRouteResult = {
		token: 'characterization-item-shop-fixed-axis-moved',
		mapId: 'item-shop',
		status: 'done',
		pointIndex: 1,
		axis: null,
		position: { x: fixedAxisContractStart.x + 255, y: fixedAxisContractStart.y },
		target: null,
		lastDiagnostic: {
			mapId: 'item-shop',
			previousPosition: { ...fixedAxisContractStart },
			requestedPosition: { x: fixedAxisContractStart.x + 255, y: fixedAxisContractStart.y },
			resolvedPosition: { x: fixedAxisContractStart.x + 255, y: fixedAxisContractStart.y },
			blocked: false
		},
		axisHistory: ['x'],
		diagnostics: [
			{
				mapId: 'item-shop',
				previousPosition: { ...fixedAxisContractStart },
				requestedPosition: { x: fixedAxisContractStart.x + 255, y: fixedAxisContractStart.y },
				resolvedPosition: { x: fixedAxisContractStart.x + 255, y: fixedAxisContractStart.y },
				blocked: false
			}
		],
		diagnosticAxes: ['x'],
		activeKey: null
	};
	assertItemShopFixedAxisRouteContract(
		[fixedAxisContractStart, { x: fixedAxisContractStart.x + 255, y: fixedAxisContractStart.y }],
		movedFixedAxisContractResult,
		'x',
		fixedAxisContractObstacles,
		'characterization Item Shop fixed-axis long movement'
	);
	const zeroLongFixedAxisContractResult: BrowserRouteResult = {
		...zeroFixedAxisContractResult,
		token: 'characterization-item-shop-fixed-axis-zero-long'
	};
	expect(() =>
		assertItemShopFixedAxisRouteContract(
			[fixedAxisContractStart, { x: fixedAxisContractStart.x + 255, y: fixedAxisContractStart.y }],
			zeroLongFixedAxisContractResult,
			'x',
			fixedAxisContractObstacles,
			'characterization Item Shop fixed-axis zero long movement'
		)
	).toThrow();
	// Characterize the source-derived Item Shop doorway convergence contract:
	// target the exact transit row, retain the live fixed x, and reject both
	// strict player-safe-band boundaries even when movement itself was unblocked.
	const stockroomDoorway = itemShopDoorwayOpenBand('stockroom');
	const stockroomDoorwayTransitY = itemShopDoorwayTransitY(
		'item-shop-stockroom-divider-north',
		'item-shop-stockroom-divider-south',
		'stockroom'
	);
	const doorwayConvergenceStart = { x: 456.02, y: 165.09280000000578 };
	const doorwayConvergenceFirstDiagnostic: PlayerMovementDiagnostic = {
		mapId: 'item-shop',
		previousPosition: { ...doorwayConvergenceStart },
		requestedPosition: { x: doorwayConvergenceStart.x, y: 151.5280000000041 },
		resolvedPosition: { x: doorwayConvergenceStart.x, y: 151.5280000000041 },
		blocked: false
	};
	const doorwayConvergenceFinalDiagnostic: PlayerMovementDiagnostic = {
		mapId: 'item-shop',
		previousPosition: { x: doorwayConvergenceStart.x, y: 151.5280000000041 },
		requestedPosition: { x: doorwayConvergenceStart.x, y: 136.1680000000041 },
		resolvedPosition: { x: doorwayConvergenceStart.x, y: 136.1680000000041 },
		blocked: false
	};
	const doorwayConvergenceResult: BrowserRouteResult = {
		token: 'characterization-item-shop-doorway-convergence',
		mapId: 'item-shop',
		status: 'done',
		pointIndex: 2,
		axis: null,
		position: { x: doorwayConvergenceStart.x, y: 136.1680000000041 },
		target: null,
		lastDiagnostic: doorwayConvergenceFinalDiagnostic,
		axisHistory: ['y'],
		diagnostics: [doorwayConvergenceFirstDiagnostic, doorwayConvergenceFinalDiagnostic],
		invalidDiagnostics: [],
		diagnosticAxes: ['y', 'y'],
		activeKey: null
	};
	assertItemShopDoorwayConvergenceContract(
		doorwayConvergenceStart,
		doorwayConvergenceResult,
		stockroomDoorwayTransitY,
		stockroomDoorway,
		'characterization Item Shop doorway convergence'
	);
	for (const boundaryY of [stockroomDoorway.minimumOpenY, stockroomDoorway.maximumOpenY]) {
		const boundaryDiagnostic = {
			...doorwayConvergenceFinalDiagnostic,
			requestedPosition: { x: doorwayConvergenceStart.x, y: boundaryY },
			resolvedPosition: { x: doorwayConvergenceStart.x, y: boundaryY }
		};
		expect(() =>
			assertItemShopDoorwayConvergenceContract(
				doorwayConvergenceStart,
				{
					...doorwayConvergenceResult,
					position: { x: doorwayConvergenceStart.x, y: boundaryY },
					lastDiagnostic: boundaryDiagnostic,
					diagnostics: [boundaryDiagnostic],
					diagnosticAxes: ['y']
				},
				stockroomDoorwayTransitY,
				stockroomDoorway,
				`characterization Item Shop doorway boundary y=${boundaryY}`
			)
		).toThrow();
	}
	// Characterize the Item Shop service-corridor-west handoff: the first leg
	// keeps the actual settled x fixed, so its endpoint envelope is y-only while
	// the remaining westbound leg remains under the generic symmetric oracle.
	const serviceCorridorWestStart = { x: 637.7840000000091, y: 307.3096000000027 };
	const serviceCorridorWestTarget = itemShopServiceCorridorWestCheckpoint({ x: 448, y: 300 });
	const serviceCorridorWestPlan = itemShopServiceCorridorWestRoutePoints(
		serviceCorridorWestStart,
		serviceCorridorWestTarget
	);
	expect(serviceCorridorWestPlan).toEqual([
		serviceCorridorWestStart,
		{ x: serviceCorridorWestStart.x, y: 300 },
		serviceCorridorWestTarget
	]);
	const failedLiveServiceCorridorWestStart = {
		x: 634.9807999999931,
		y: 283.7392000000053
	};
	// This is the exact settled endpoint captured by the final runtime smoke.
	// Its exact expanded-rect position and vertical sweep are clear; only a
	// hypothetical Y reach residue would overlap the office-sales divider.
	expect(() =>
		itemShopServiceCorridorWestRoutePoints(
			failedLiveServiceCorridorWestStart,
			serviceCorridorWestTarget
		)
	).not.toThrow();
	expect(() =>
		assertTask6InteriorRouteEnvelope(
			'item-shop',
			serviceCorridorWestPlan,
			'characterization Item Shop service-corridor-west full route'
		)
	).toThrow();
	assertTask6InteriorRouteEnvelope(
		'item-shop',
		serviceCorridorWestPlan.slice(1),
		'characterization Item Shop service-corridor-west remaining route'
	);
	// Keep a genuinely unsafe fixture under the corrected contract: the exact
	// settled point starts inside the office-sales divider's expanded rect, so
	// the full segment oracle must still reject the route.
	const unsafeServiceCorridorWestStart = { x: 619.5, y: 260 };
	expect(() =>
		itemShopServiceCorridorWestRoutePoints(
			unsafeServiceCorridorWestStart,
			serviceCorridorWestTarget
		)
	).toThrow(/route crossed item-shop-office-sales-divider/);
	// RED characterization for the stockroom doorway handoff: the live endpoint
	// from service-corridor-west is already in the source-safe x band. Preserve
	// that actual x for the initial vertical transit, then cross the authored
	// doorway row and finish at the unchanged checkpoint. The old doorway helper
	// inserts a fragile westward correction before the vertical leg.
	const stockroomEntryStart = { x: 463.62560000000195, y: 301.60239999999817 };
	const stockroomEntryTarget = { x: 448, y: 160 };
	const stockroomEntryTransitY = itemShopDoorwayTransitY(
		'item-shop-stockroom-divider-north',
		'item-shop-stockroom-divider-south',
		'stockroom'
	);
	const stockroomEntryPlan = itemShopStockroomEntryRoutePoints(
		stockroomEntryStart,
		stockroomEntryTarget
	);
	expect(stockroomEntryPlan).toEqual([
		stockroomEntryStart,
		{ x: stockroomEntryStart.x, y: stockroomEntryTransitY },
		{ x: stockroomEntryTarget.x, y: stockroomEntryTransitY },
		stockroomEntryTarget
	]);
	const stockroomEntryDiagnostic: PlayerMovementDiagnostic = {
		mapId: 'item-shop',
		previousPosition: stockroomEntryStart,
		requestedPosition: { x: stockroomEntryStart.x, y: stockroomEntryStart.y - 12.8 },
		resolvedPosition: { x: stockroomEntryStart.x, y: stockroomEntryStart.y - 12.8 },
		blocked: false
	};
	const stockroomEntryContractResult: BrowserRouteResult = {
		token: 'characterization-item-shop-stockroom-entry',
		mapId: 'item-shop',
		status: 'done',
		pointIndex: stockroomEntryPlan.length,
		axis: null,
		position: { x: 448.6256, y: 160.18 },
		target: null,
		lastDiagnostic: stockroomEntryDiagnostic,
		axisHistory: ['y'],
		diagnostics: [stockroomEntryDiagnostic],
		invalidDiagnostics: [],
		diagnosticAxes: ['y'],
		activeKey: null
	};
	assertItemShopStockroomEntryRouteContract(stockroomEntryPlan, stockroomEntryContractResult);
	expect(() =>
		itemShopStockroomEntryRoutePoints({ x: 445, y: stockroomEntryStart.y }, stockroomEntryTarget)
	).toThrow();
	expect(() =>
		itemShopStockroomEntryRoutePoints({ x: 467, y: stockroomEntryStart.y }, stockroomEntryTarget)
	).not.toThrow();
	expect(() =>
		itemShopStockroomEntryRoutePoints({ x: 468, y: stockroomEntryStart.y }, stockroomEntryTarget)
	).toThrow();
	// Characterize the live band handoff's frame residue: a first westward
	// diagnostic may remain at or beyond the exclusive upper edge, but the
	// runner must keep steering until its released final endpoint is in-band
	// before this x becomes the vertical-leg anchor.
	const stockroomBand = itemShopStockroomEntrySafeXBand();
	const stockroomBandStart = { x: 474.6152000000029, y: 301.3816000000049 };
	const stockroomBandTransientDiagnostic: PlayerMovementDiagnostic = {
		mapId: 'item-shop',
		previousPosition: stockroomBandStart,
		requestedPosition: { x: 468.2144000000026, y: stockroomBandStart.y },
		resolvedPosition: { x: 468.2144000000026, y: stockroomBandStart.y },
		blocked: false
	};
	const stockroomBandFinalDiagnostic: PlayerMovementDiagnostic = {
		mapId: 'item-shop',
		previousPosition: stockroomBandTransientDiagnostic.resolvedPosition,
		requestedPosition: { x: 461.2136000000024, y: stockroomBandStart.y },
		resolvedPosition: { x: 461.2136000000024, y: stockroomBandStart.y },
		blocked: false
	};
	const stockroomBandInBandResult: CaveDoorwayBandResult = {
		token: 'characterization-item-shop-stockroom-band-transient',
		mapId: 'item-shop',
		status: 'done',
		position: stockroomBandFinalDiagnostic.resolvedPosition,
		lastDiagnostic: stockroomBandFinalDiagnostic,
		diagnostics: [stockroomBandTransientDiagnostic, stockroomBandFinalDiagnostic],
		invalidDiagnostics: [],
		activeKeys: [],
		releasedKeys: ['ArrowLeft'],
		released: true,
		startedAt: 0,
		finishedAt: 1
	};
	expect(stockroomBandTransientDiagnostic.resolvedPosition.x).toBeGreaterThanOrEqual(
		stockroomBand.maximumX
	);
	expect(stockroomBandInBandResult.position?.x).toBeGreaterThanOrEqual(stockroomBand.minimumX);
	expect(stockroomBandInBandResult.position?.x).toBeLessThan(stockroomBand.maximumX);
	assertItemShopStockroomEntryBandContract(
		stockroomBandStart,
		stockroomBandInBandResult,
		'characterization Item Shop stockroom band transient then in-band final'
	);
	const stockroomBandOutOfBandResult: CaveDoorwayBandResult = {
		...stockroomBandInBandResult,
		token: 'characterization-item-shop-stockroom-band-final-out-of-band',
		position: stockroomBandTransientDiagnostic.resolvedPosition,
		lastDiagnostic: stockroomBandTransientDiagnostic,
		diagnostics: [stockroomBandTransientDiagnostic]
	};
	expect(() =>
		assertItemShopStockroomEntryBandContract(
			stockroomBandStart,
			stockroomBandOutOfBandResult,
			'characterization Item Shop stockroom band final out-of-band rejection'
		)
	).toThrow(/final x upper bound/);
	const wrongMapStockroomEntryDiagnostic = {
		...stockroomEntryDiagnostic,
		mapId: 'guild-hall'
	};
	expect(() =>
		assertItemShopStockroomEntryRouteContract(stockroomEntryPlan, {
			...stockroomEntryContractResult,
			mapId: 'guild-hall',
			lastDiagnostic: wrongMapStockroomEntryDiagnostic,
			diagnostics: [wrongMapStockroomEntryDiagnostic]
		})
	).toThrow();
	const blockedStockroomEntryDiagnostic = {
		...stockroomEntryDiagnostic,
		blocked: true
	};
	expect(() =>
		assertItemShopStockroomEntryRouteContract(stockroomEntryPlan, {
			...stockroomEntryContractResult,
			lastDiagnostic: blockedStockroomEntryDiagnostic,
			diagnostics: [blockedStockroomEntryDiagnostic],
			invalidDiagnostics: [blockedStockroomEntryDiagnostic]
		})
	).toThrow();
	// RED characterization for the Quartermaster semantic doorway handoff: the
	// route must stop after reaching the authored doorway-right clearance and
	// let the next fixed-axis phases consume the actual settled y. The old plan
	// inserts an impossible below-counter y micro-correction here.
	const quartermasterSemanticStart = { x: 508.9688, y: 566.4856 };
	const quartermasterSemanticStaging = guildHallQuartermasterInteractionStagingPoint();
	const quartermasterDoorwayTransitY = guildHallQuartermasterDoorwayTransitY();
	const quartermasterDoorwayRightClearanceX = guildHallQuartermasterDoorwayRightClearanceX();
	const quartermasterSemanticDoorwayPlan = guildHallQuartermasterRoutePoints(
		quartermasterSemanticStart,
		quartermasterSemanticStaging,
		false,
		true
	);
	expect(quartermasterSemanticDoorwayPlan).toEqual([
		quartermasterSemanticStart,
		{ x: quartermasterSemanticStart.x, y: quartermasterDoorwayTransitY },
		{ x: quartermasterDoorwayRightClearanceX, y: quartermasterDoorwayTransitY }
	]);
	// RED characterization for the post-Quartermaster egress: the live semantic
	// endpoint is already in the authored divider/counter open row, so the first
	// leg must preserve that actual y while moving monotonically to the source
	// counter-right clearance. Only after that handoff may the route descend.
	const quartermasterReturnStart = { x: 842.2976, y: 506.4688 };
	const quartermasterReturnTarget = { x: 512, y: 568 };
	const quartermasterReturnPlan = guildHallQuartermasterRoutePoints(
		quartermasterReturnStart,
		quartermasterReturnTarget,
		true
	);
	const quartermasterReturnRightClearanceX =
		VILLAGE_INTERIOR_LAYOUTS['guild-hall'].propCollisions.quartermasterCounter.x +
		VILLAGE_INTERIOR_LAYOUTS['guild-hall'].propCollisions.quartermasterCounter.width +
		PLAYER_COLLISION_RADIUS +
		AXIS_REACH_TOLERANCE +
		1;
	const quartermasterReturnBelowCounterY =
		VILLAGE_INTERIOR_LAYOUTS['guild-hall'].propCollisions.quartermasterCounter.y +
		VILLAGE_INTERIOR_LAYOUTS['guild-hall'].propCollisions.quartermasterCounter.height +
		PLAYER_COLLISION_RADIUS +
		AXIS_REACH_TOLERANCE +
		1;
	expect(quartermasterReturnPlan).toEqual([
		quartermasterReturnStart,
		{ x: quartermasterReturnRightClearanceX, y: quartermasterReturnStart.y },
		{ x: quartermasterReturnRightClearanceX, y: quartermasterReturnBelowCounterY },
		{ x: quartermasterDoorwayRightClearanceX, y: quartermasterReturnBelowCounterY },
		{ x: quartermasterDoorwayRightClearanceX, y: quartermasterDoorwayTransitY },
		{ x: quartermasterReturnTarget.x, y: quartermasterDoorwayTransitY },
		quartermasterReturnTarget
	]);
	// Characterize both valid frame-count outcomes for the Guild Hall lobby
	// continuity handoff, then preserve the existing axis-only terminal route and
	// its unchanged ±18 authored-checkpoint contract.
	const lobbyReturnPhaseStart = { x: 515.2736, y: 561.7048 };
	const lobbyReturnPhasePoint = {
		x: lobbyReturnPhaseStart.x - 27.44,
		y: lobbyReturnPhaseStart.y + 27.44
	};
	const lobbyReturnPhaseDiagnostic: PlayerMovementDiagnostic = {
		mapId: 'guild-hall',
		previousPosition: lobbyReturnPhaseStart,
		requestedPosition: lobbyReturnPhasePoint,
		resolvedPosition: lobbyReturnPhasePoint,
		blocked: false
	};
	const lobbyReturnPhaseResult: GuildMasterSemanticDiagonalResult = {
		token: 'characterization-guild-hall-lobby-return-phase',
		mapId: 'guild-hall',
		status: 'done',
		position: lobbyReturnPhasePoint,
		lastDiagnostic: lobbyReturnPhaseDiagnostic,
		diagnostics: [lobbyReturnPhaseDiagnostic],
		invalidDiagnostics: [],
		activeKeys: [],
		releasedKeys: ['ArrowLeft', 'ArrowDown'],
		released: true,
		startedAt: 0,
		finishedAt: 1
	};
	const lobbyReturnZeroInputStart = { x: 507.39919999999813, y: 577.2735999999987 };
	const lobbyReturnZeroInputResult: GuildMasterSemanticDiagonalResult = {
		token: 'characterization-guild-hall-lobby-return-zero-input-phase',
		mapId: 'guild-hall',
		status: 'done',
		position: lobbyReturnZeroInputStart,
		lastDiagnostic: null,
		diagnostics: [],
		invalidDiagnostics: [],
		activeKeys: [],
		releasedKeys: [],
		released: true,
		startedAt: 0,
		finishedAt: 1
	};
	assertGuildHallLobbyReturnSemanticDiagonalContract(
		lobbyReturnZeroInputStart,
		lobbyReturnZeroInputResult,
		'characterization Guild Hall lobby-return zero-input phase'
	);
	assertGuildHallLobbyReturnSemanticDiagonalContract(
		lobbyReturnPhaseStart,
		lobbyReturnPhaseResult,
		'characterization Guild Hall lobby-return one-diagnostic phase'
	);
	const lobbyReturnTwoDiagnosticStart = { x: 514.9999999999999, y: 566.8144000000005 };
	const lobbyReturnTwoDiagnosticIntermediate = {
		x: 508.3560246839711,
		y: 573.4583753160293
	};
	const lobbyReturnTwoDiagnosticPoint = {
		x: 502.1346163803798,
		y: 579.6797836196207
	};
	const lobbyReturnTwoDiagnosticFirst: PlayerMovementDiagnostic = {
		mapId: 'guild-hall',
		previousPosition: lobbyReturnTwoDiagnosticStart,
		requestedPosition: lobbyReturnTwoDiagnosticIntermediate,
		resolvedPosition: lobbyReturnTwoDiagnosticIntermediate,
		blocked: false
	};
	const lobbyReturnTwoDiagnosticSecond: PlayerMovementDiagnostic = {
		mapId: 'guild-hall',
		previousPosition: lobbyReturnTwoDiagnosticIntermediate,
		requestedPosition: lobbyReturnTwoDiagnosticPoint,
		resolvedPosition: lobbyReturnTwoDiagnosticPoint,
		blocked: false
	};
	const lobbyReturnTwoDiagnosticResult: GuildMasterSemanticDiagonalResult = {
		token: 'characterization-guild-hall-lobby-return-two-diagnostic-phase',
		mapId: 'guild-hall',
		status: 'done',
		position: lobbyReturnTwoDiagnosticPoint,
		lastDiagnostic: lobbyReturnTwoDiagnosticSecond,
		diagnostics: [lobbyReturnTwoDiagnosticFirst, lobbyReturnTwoDiagnosticSecond],
		invalidDiagnostics: [],
		activeKeys: [],
		releasedKeys: ['ArrowLeft', 'ArrowDown'],
		released: true,
		startedAt: 0,
		finishedAt: 1
	};
	const characterizedLobbyReturnTwoDiagnosticPoint =
		assertGuildHallLobbyReturnSemanticDiagonalContract(
			lobbyReturnTwoDiagnosticStart,
			lobbyReturnTwoDiagnosticResult,
			'characterization Guild Hall lobby-return two-diagnostic phase'
		);
	const wrongMapLobbyReturnDiagnostic: PlayerMovementDiagnostic = {
		...lobbyReturnPhaseDiagnostic,
		mapId: 'item-shop'
	};
	const blockedLobbyReturnDiagnostic: PlayerMovementDiagnostic = {
		...lobbyReturnPhaseDiagnostic,
		blocked: true
	};
	const nonMonotonicLobbyReturnDiagnostic: PlayerMovementDiagnostic = {
		mapId: 'guild-hall',
		previousPosition: lobbyReturnTwoDiagnosticIntermediate,
		requestedPosition: {
			x: lobbyReturnTwoDiagnosticIntermediate.x + 4,
			y: lobbyReturnTwoDiagnosticPoint.y
		},
		resolvedPosition: {
			x: lobbyReturnTwoDiagnosticIntermediate.x + 4,
			y: lobbyReturnTwoDiagnosticPoint.y
		},
		blocked: false
	};
	expect(() =>
		assertGuildHallLobbyReturnSemanticDiagonalContract(
			lobbyReturnPhaseStart,
			{
				...lobbyReturnPhaseResult,
				mapId: 'item-shop',
				lastDiagnostic: wrongMapLobbyReturnDiagnostic,
				diagnostics: [wrongMapLobbyReturnDiagnostic]
			},
			'characterization Guild Hall lobby-return wrong-map rejection'
		)
	).toThrow();
	expect(() =>
		assertGuildHallLobbyReturnSemanticDiagonalContract(
			lobbyReturnPhaseStart,
			{
				...lobbyReturnPhaseResult,
				lastDiagnostic: blockedLobbyReturnDiagnostic,
				diagnostics: [blockedLobbyReturnDiagnostic]
			},
			'characterization Guild Hall lobby-return blocked rejection'
		)
	).toThrow();
	expect(() =>
		assertGuildHallLobbyReturnSemanticDiagonalContract(
			lobbyReturnTwoDiagnosticStart,
			{
				...lobbyReturnTwoDiagnosticResult,
				position: nonMonotonicLobbyReturnDiagnostic.resolvedPosition,
				lastDiagnostic: nonMonotonicLobbyReturnDiagnostic,
				diagnostics: [lobbyReturnTwoDiagnosticFirst, nonMonotonicLobbyReturnDiagnostic]
			},
			'characterization Guild Hall lobby-return non-monotonic rejection'
		)
	).toThrow();
	const characterizedLobbyReturnFinalRoute: [Point, Point, Point] = [
		characterizedLobbyReturnTwoDiagnosticPoint,
		{ x: characterizedLobbyReturnTwoDiagnosticPoint.x, y: 736 },
		{ x: 512, y: 736 }
	];
	assertTask6InteriorRouteEnvelope(
		'guild-hall',
		characterizedLobbyReturnFinalRoute,
		'characterization Guild Hall lobby-return terminal route'
	);
	const characterizedLobbyReturnFinalResult: BrowserRouteResult = {
		token: 'characterization-guild-hall-lobby-return-terminal',
		mapId: 'guild-hall',
		status: 'done',
		pointIndex: 2,
		axis: null,
		position: { x: 526.5, y: 743 },
		target: null,
		lastDiagnostic: null,
		axisHistory: ['y', 'x'],
		diagnostics: [],
		invalidDiagnostics: [],
		diagnosticAxes: [],
		activeKey: null
	};
	assertGuildHallLobbyReturnFinalRouteContract(
		characterizedLobbyReturnFinalRoute,
		characterizedLobbyReturnFinalResult,
		{ x: 512, y: 736 },
		'characterization Guild Hall lobby-return terminal route'
	);
	// Service-return-west must keep its fixed-x doorway departure separate from
	// the following horizontal alignment. This RED characterization deliberately
	// expects the two phase plans before traversal is split into two route calls.
	const serviceReturnWestStart = { x: 443.66719999999935, y: 158.5 };
	expect(
		itemShopMiraServiceReturnWestExitRoutePoints(serviceReturnWestStart, {
			x: 448,
			y: 300
		})
	).toEqual({
		vertical: [serviceReturnWestStart, { x: serviceReturnWestStart.x, y: 300 }],
		horizontal: [
			{ x: serviceReturnWestStart.x, y: 300 },
			{ x: 448, y: 300 }
		]
	});
	// RED characterization for service-return-south: the prior live endpoint is
	// already above Mira's counter, so the route must preserve its y and move east
	// before descending. The generic vertical-first plan over-approximates the
	// fixed-axis residue and rejects the source-safe east-first plan's first leg.
	const serviceReturnSouthResidueStart = { x: 449.7248, y: 309.6976 };
	const serviceReturnSouthTarget = { x: 640, y: 300 };
	const serviceReturnSouthLayout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const serviceReturnSouthCounter = serviceReturnSouthLayout.propCollisions.miraCounter;
	const serviceReturnSouthExpandedRight =
		serviceReturnSouthCounter.x + serviceReturnSouthCounter.width + PLAYER_COLLISION_RADIUS;
	const serviceReturnSouthSafeX =
		serviceReturnSouthExpandedRight + AXIS_REACH_TOLERANCE + INTERIOR_ROUTE_SETTLE_TOLERANCE + 1;
	const serviceReturnSouthEastFirstPlan = [
		serviceReturnSouthResidueStart,
		{ x: serviceReturnSouthSafeX, y: serviceReturnSouthResidueStart.y },
		{ x: serviceReturnSouthSafeX, y: serviceReturnSouthTarget.y },
		serviceReturnSouthTarget
	];
	expect(
		itemShopServiceReturnSouthRoutePoints(serviceReturnSouthResidueStart, serviceReturnSouthTarget)
	).toEqual(serviceReturnSouthEastFirstPlan);
	for (const obstacle of [
		...serviceReturnSouthLayout.walls,
		...Object.values(serviceReturnSouthLayout.propCollisions)
	]) {
		expect(
			routeSegmentIntersectsExpandedRect(
				serviceReturnSouthEastFirstPlan[0]!,
				serviceReturnSouthEastFirstPlan[1]!,
				obstacle,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			endpointXEnvelopeIsDisjointFromExpandedRect(
				serviceReturnSouthEastFirstPlan[1]!,
				obstacle,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(true);
	}
	expect(() =>
		assertTask6InteriorRouteEnvelope(
			'item-shop',
			serviceReturnSouthEastFirstPlan,
			'characterization Item Shop service-return-south full plan'
		)
	).toThrow();
	assertTask6InteriorRouteEnvelope(
		'item-shop',
		serviceReturnSouthEastFirstPlan.slice(1),
		'characterization Item Shop service-return-south remaining plan'
	);
	const serviceReturnSouthUnsafeX = serviceReturnSouthSafeX - INTERIOR_ROUTE_SETTLE_TOLERANCE - 1;
	const serviceReturnSouthUnsafePlan = [
		serviceReturnSouthResidueStart,
		{ x: serviceReturnSouthUnsafeX, y: serviceReturnSouthResidueStart.y },
		{ x: serviceReturnSouthUnsafeX, y: serviceReturnSouthTarget.y },
		serviceReturnSouthTarget
	];
	expect(
		serviceReturnSouthUnsafeX - AXIS_REACH_TOLERANCE - INTERIOR_ROUTE_SETTLE_TOLERANCE
	).toBeLessThanOrEqual(serviceReturnSouthExpandedRight);
	expect(() =>
		assertTask6InteriorRouteEnvelope(
			'item-shop',
			serviceReturnSouthUnsafePlan.slice(1),
			'characterization Item Shop service-return-south unsafe clearance'
		)
	).toThrow();
	// RED characterization for the VH2 exterior handoff: once the south-lane
	// route has settled at a real x inside the authored approach, the next leg
	// must keep that x and only move north to the authored return-arrival y.
	const villagerHouse2Building = SUNDROP_VILLAGE_V2_BUILDINGS.villagerHouse2;
	const villagerHouse2MainStreet = SUNDROP_VILLAGE_V2_PUBLIC_SPACES.mainStreet;
	const villagerHouse2CharacterizationStart = {
		x:
			villagerHouse2Building.approach.x +
			villagerHouse2Building.approach.width / 2 +
			PLAYER_COLLISION_RADIUS +
			4,
		y: villagerHouse2MainStreet.y + villagerHouse2MainStreet.height
	};
	const villagerHouse2CharacterizationPlan = villagerHouse2OutdoorApproachRoutePoints(
		villagerHouse2CharacterizationStart,
		villagerHouse2Building.returnArrival
	);
	expect(villagerHouse2CharacterizationPlan.vertical).toEqual([
		villagerHouse2CharacterizationStart,
		{
			x: villagerHouse2CharacterizationStart.x,
			y: villagerHouse2Building.returnArrival.y
		}
	]);
	// RED characterization for the VH1 resident route: the generic vertical-first
	// helper sends the actual x-residue into Lynn's 29px NPC collision circle before
	// it can correct to the authored x=200 approach. The source-safe contract must
	// instead cross to x=200 on the current row, then descend.
	const lynnActualStart = { x: 188.2352, y: 316.332 };
	const lynnApproach = { x: 200, y: 416 };
	const lynnVerticalFirst = interiorRoutePoints(lynnActualStart, lynnApproach);
	expect(
		routeSegmentIntersectsCircle(
			lynnVerticalFirst[0]!,
			lynnVerticalFirst[1]!,
			{ x: 160, y: 416 },
			PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS
		)
	).toBe(true);
	const lynnHorizontalFirst = villagerHouse1LynnRoutePoints(lynnActualStart, lynnApproach);
	assertVillagerHouse1LynnRouteGeometry(lynnHorizontalFirst, lynnApproach);
	expect(lynnHorizontalFirst).toEqual([
		{ x: 188.2352, y: 316.332 },
		{ x: 200, y: 316.332 },
		{ x: 200, y: 416 }
	]);
	// RED characterization for the VH2 resident route: after the generic
	// vertical-first route settles with the observed x residue, its next y
	// correction enters Toma's unchanged 29px packing circle. The source-safe
	// split crosses to x=244 on the live row first, then approaches the authored
	// {232,192} endpoint without changing production geometry or tolerances.
	const tomaResidueStart = { x: 220.14639999998255, y: 199.05839999999938 };
	const tomaApproach = { x: 232, y: 192 };
	const tomaNpc = VILLAGE_INTERIOR_LAYOUTS['villager-house-2'].npcApproaches.toma.npc;
	const tomaNpcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const tomaVerticalFirst = interiorRoutePoints(tomaResidueStart, tomaApproach);
	expect(tomaVerticalFirst).toEqual([
		tomaResidueStart,
		{ x: tomaResidueStart.x, y: tomaApproach.y },
		tomaApproach
	]);
	expect(
		routeSegmentIntersectsCircle(
			tomaVerticalFirst[0]!,
			tomaVerticalFirst[1]!,
			tomaNpc,
			tomaNpcCollisionRadius
		)
	).toBe(true);
	const tomaHorizontalFirst = villagerHouse2TomaRoutePoints(tomaResidueStart, tomaApproach);
	assertVillagerHouse2TomaRouteGeometry(tomaHorizontalFirst, tomaApproach);
	expect(tomaHorizontalFirst).toEqual([
		tomaResidueStart,
		{ x: 244, y: tomaResidueStart.y },
		tomaApproach
	]);
	// RED characterization for Guild Hall terminal convergence: the real route
	// runner can cross the checkpoint on an unblocked frame by 19.0552 px, then
	// make a valid bounded correction back into the unchanged ±18 band. The old
	// per-diagnostic contract incorrectly rejects that first frame because it is
	// outside the final reach band even though the complete route finishes validly.
	const terminalOvershootCheckpoint = { x: 400, y: 208 };
	const terminalOvershootDiagnostics: PlayerMovementDiagnostic[] = [
		{
			mapId: 'guild-hall',
			previousPosition: { x: 398.83039999999835, y: 190.25600000000549 },
			requestedPosition: { x: 398.83039999999835, y: 227.0552000000059 },
			resolvedPosition: { x: 398.83039999999835, y: 227.0552000000059 },
			blocked: false
		},
		{
			mapId: 'guild-hall',
			previousPosition: { x: 398.83039999999835, y: 227.0552000000059 },
			requestedPosition: { x: 398.83039999999835, y: 190.25600000000549 },
			resolvedPosition: { x: 398.83039999999835, y: 190.25600000000549 },
			blocked: false
		}
	];
	const terminalOvershootResult: BrowserRouteResult = {
		token: 'characterization-guild-hall-terminal-overshoot',
		mapId: 'guild-hall',
		status: 'done',
		pointIndex: 2,
		axis: null,
		position: { x: 398.83039999999835, y: 190.25600000000549 },
		target: null,
		lastDiagnostic: terminalOvershootDiagnostics.at(-1)!,
		axisHistory: ['x', 'y'],
		diagnostics: terminalOvershootDiagnostics,
		invalidDiagnostics: [],
		diagnosticAxes: ['y', 'y'],
		activeKey: null,
		movementCount: 3
	};
	expect(terminalOvershootResult.status).toBe('done');
	expect(terminalOvershootResult.activeKey).toBeNull();
	expect(terminalOvershootResult.invalidDiagnostics).toEqual([]);
	expect(
		Math.abs(terminalOvershootCheckpoint.y - terminalOvershootDiagnostics[0]!.resolvedPosition.y)
	).toBeCloseTo(19.0552, 4);
	for (const diagnostic of terminalOvershootDiagnostics) {
		assertGuildHallTerminalDiagnosticProgress(diagnostic, 'y', terminalOvershootCheckpoint);
	}
	expect(
		Math.abs(terminalOvershootResult.position!.x - terminalOvershootCheckpoint.x)
	).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(
		Math.abs(terminalOvershootResult.position!.y - terminalOvershootCheckpoint.y)
	).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	// The former Guild Hall spine handoff inherited a mixed frame residue near
	// {415.5912,204.5584}; the next north leg then oscillated around x=512
	// without entering its unchanged ±18 reach band. Keep that failure evidence
	// explicit while making the safe-row handoff the sole owner of this route's
	// intermediate phase.
	const guildMasterSpineInheritedResidueStart = { x: 415.5912, y: 204.5584 };
	const guildMasterSpineAuthoredCheckpoint = { x: 400, y: 208 };
	const guildMasterSpineSafeRow = guildHallAisleSafeAboveY(
		guildHallAisleWall(GUILD_HALL_RECORDS_AISLE_SPEC)
	);
	const guildMasterSpinePhase = guildHallGuildMasterSpineRoutePoints(
		guildMasterSpineInheritedResidueStart,
		guildMasterSpineAuthoredCheckpoint
	);
	expect(guildMasterSpinePhase).toHaveLength(3);
	expect(guildMasterSpinePhase).toEqual([
		guildMasterSpineInheritedResidueStart,
		{ x: guildMasterSpineInheritedResidueStart.x, y: guildMasterSpineSafeRow },
		{ x: guildHallGuildMasterSpineConservativeX(), y: guildMasterSpineSafeRow }
	]);
	assertGuildHallGuildMasterSpineRouteContract(
		guildMasterSpinePhase,
		guildMasterSpineAuthoredCheckpoint
	);
	const guildMasterNorthAuthoredCheckpoint = { x: 512, y: 208 };
	const guildMasterNorthReachBand = {
		minimum: guildMasterNorthAuthoredCheckpoint.x - AXIS_REACH_TOLERANCE,
		maximum: guildMasterNorthAuthoredCheckpoint.x + AXIS_REACH_TOLERANCE
	};
	const formerGuildMasterNorthXResidue = [
		453.4184, 492.248, 531.0776, 492.2312, 531.4808, 492.2312, 532.6544, 492.0128, 532.4768,
		493.6112, 531.92
	];
	expect(
		formerGuildMasterNorthXResidue.every(
			(value) =>
				value < guildMasterNorthReachBand.minimum || value > guildMasterNorthReachBand.maximum
		)
	).toBe(true);
	expect(
		formerGuildMasterNorthXResidue.some((value) => value < guildMasterNorthReachBand.minimum)
	).toBe(true);
	expect(
		formerGuildMasterNorthXResidue.some((value) => value > guildMasterNorthReachBand.maximum)
	).toBe(true);
	// RED characterization for the common-hall terminal handoff: the observed
	// frame residues make the old y=495 row miss the unchanged ±18 reach band on
	// the final correction, while the source-safe y=494 row accepts that same
	// residue without changing the authored {192,512} checkpoint.
	const commonHallTerminalCheckpoint = { x: 192, y: 512 };
	const commonHallTerminalWall = guildHallAisleWall(GUILD_HALL_COMMON_AISLE_SPEC);
	const commonHallTerminalHandoff = guildHallAisleHandoffPoint(
		commonHallTerminalCheckpoint,
		GUILD_HALL_COMMON_AISLE_SPEC
	);
	const commonHallExpandedTop = commonHallTerminalWall.y - PLAYER_COLLISION_RADIUS;
	const commonHallFrameStartY = 514.0384;
	const commonHallFirstUpResidueY = 478.408;
	const commonHallFinalUpResidueY = 476.368;
	const commonHallSafeHandoffY = 494;
	const commonHallUnsafeHandoffY = 495;
	expect(commonHallTerminalHandoff).toEqual({ x: 367, y: commonHallSafeHandoffY });
	expect(commonHallSafeHandoffY + AXIS_REACH_TOLERANCE + AXIS_REACH_TOLERANCE).toBeLessThan(
		commonHallExpandedTop
	);
	expect(Math.abs(commonHallFrameStartY - commonHallFirstUpResidueY)).toBeCloseTo(35.6304, 4);
	expect(Math.abs(commonHallSafeHandoffY - commonHallFinalUpResidueY)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	// The old row is rejected by the frame-residue contract even though the
	// authored checkpoint remains unchanged.
	expect(Math.abs(commonHallUnsafeHandoffY - commonHallFinalUpResidueY)).toBeGreaterThan(
		AXIS_REACH_TOLERANCE
	);
	// Characterize the live Quartermaster egress sequence: the first frames move
	// forward toward the authored y=583 staging row, one frame crosses that row,
	// and the runner's bounded correction returns toward the same target. The
	// route contract must accept that valid correction while retaining its
	// source-geometry checks.
	const quartermasterReturnAxisStart = { x: 901.0375999999958, y: 510.2031999999933 };
	const quartermasterReturnAxisTarget = { x: quartermasterReturnAxisStart.x, y: 583 };
	const quartermasterReturnAxisDiagnostics: PlayerMovementDiagnostic[] = [
		{
			mapId: 'guild-hall',
			previousPosition: quartermasterReturnAxisStart,
			requestedPosition: { x: quartermasterReturnAxisStart.x, y: 542.2071999999932 },
			resolvedPosition: { x: quartermasterReturnAxisStart.x, y: 542.2071999999932 },
			blocked: false
		},
		{
			mapId: 'guild-hall',
			previousPosition: { x: quartermasterReturnAxisStart.x, y: 542.2071999999932 },
			requestedPosition: { x: quartermasterReturnAxisStart.x, y: 574.8039999999921 },
			resolvedPosition: { x: quartermasterReturnAxisStart.x, y: 574.8039999999921 },
			blocked: false
		},
		{
			mapId: 'guild-hall',
			previousPosition: { x: quartermasterReturnAxisStart.x, y: 574.8039999999921 },
			requestedPosition: { x: quartermasterReturnAxisStart.x, y: 607.9959999999921 },
			resolvedPosition: { x: quartermasterReturnAxisStart.x, y: 607.9959999999921 },
			blocked: false
		},
		{
			mapId: 'guild-hall',
			previousPosition: { x: quartermasterReturnAxisStart.x, y: 607.9959999999921 },
			requestedPosition: { x: quartermasterReturnAxisStart.x, y: 574.6023999999916 },
			resolvedPosition: { x: quartermasterReturnAxisStart.x, y: 574.6023999999916 },
			blocked: false
		}
	];
	assertGuildHallQuartermasterReturnAxisRouteContract(
		[quartermasterReturnAxisStart, quartermasterReturnAxisTarget],
		{
			token: 'characterization-guild-hall-quartermaster-return-axis',
			mapId: 'guild-hall',
			status: 'done',
			pointIndex: 2,
			axis: null,
			position: { x: quartermasterReturnAxisStart.x, y: 574.6023999999916 },
			target: null,
			lastDiagnostic: quartermasterReturnAxisDiagnostics.at(-1)!,
			axisHistory: ['y'],
			diagnostics: quartermasterReturnAxisDiagnostics,
			invalidDiagnostics: [],
			diagnosticAxes: ['y', 'y', 'y', 'y'],
			activeKey: null
		},
		'y',
		'characterization Guild Hall Quartermaster return axis'
	);
	const wrongDirectionTerminalDiagnostic: PlayerMovementDiagnostic = {
		...terminalOvershootDiagnostics[0]!,
		requestedPosition: { x: terminalOvershootCheckpoint.x, y: 180 },
		resolvedPosition: { x: terminalOvershootCheckpoint.x, y: 180 }
	};
	const noProgressTerminalDiagnostic: PlayerMovementDiagnostic = {
		...terminalOvershootDiagnostics[0]!,
		requestedPosition: terminalOvershootDiagnostics[0]!.previousPosition,
		resolvedPosition: terminalOvershootDiagnostics[0]!.previousPosition
	};
	expect(() =>
		assertGuildHallTerminalDiagnosticProgress(
			wrongDirectionTerminalDiagnostic,
			'y',
			terminalOvershootCheckpoint
		)
	).toThrow();
	expect(() =>
		assertGuildHallTerminalDiagnosticProgress(
			noProgressTerminalDiagnostic,
			'y',
			terminalOvershootCheckpoint
		)
	).toThrow();
	// The spawn-return corridor is two contracts, not one flat route: the
	// counter-clearing vertical leg must retain its fixed x, while the authored
	// x alignment is a separate normal route that starts from that leg's result.
	const spawnReturnStart = { x: 648, y: 301 };
	const spawnReturnTarget = { x: 640, y: 544 };
	expect(itemShopSpawnReturnCorridorRoutePoints(spawnReturnStart, spawnReturnTarget)).toEqual({
		vertical: [spawnReturnStart, { x: spawnReturnStart.x, y: spawnReturnTarget.y }],
		horizontal: [{ x: spawnReturnStart.x, y: spawnReturnTarget.y }, spawnReturnTarget]
	});
	// The post-Ruins west-bank crossing uses the authored Wildwood corridor
	// rather than walking straight through the expanded bank.
	const postRuinsPlan = postRuinsWildwoodBankRoutePoints({ x: 5_600, y: 3_808 });
	expect(postRuinsPlan).toEqual([
		{ x: 5_600, y: 3_808 },
		{ x: 5_600, y: 3_168 },
		{ x: 4_976, y: 3_168 },
		{ x: 4_976, y: 3_904 },
		{ x: 4_800, y: 3_904 },
		{ x: 4_800, y: 3_808 }
	]);
	const wildwoodBankForPostRuins = wildwoodForestLaneWestBankRect();
	const postRuinsMouth = FALLBACK_V2_CROSSROADS_TO_WILDWOOD.at(-1)!;
	expect(postRuinsMouth).toEqual({ x: 4_992, y: 3_904 });
	expect(meadowEntryPointIsWalkable(postRuinsMouth, PLAYER_COLLISION_RADIUS)).toBe(true);
	// Characterize the redundant live correction that previously failed: the
	// observed west-staging residue is safe, but its first eastward frame reaches
	// into the bank's expanded collision envelope.
	const postRuinsObservedResidue = { x: 4_973.2056, y: 3_908.4272 };
	const postRuinsRedundantCorrection = { x: 4_996.6056, y: 3_908.4272 };
	expect(
		routeSegmentIntersectsExpandedRect(
			postRuinsObservedResidue,
			postRuinsRedundantCorrection,
			wildwoodBankForPostRuins,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(true);
	// The same live residue can continue west, then make the final southward
	// correction at x=4800 without touching the continuous bank.
	const postRuinsSafeWestContinuation = { x: 4_800, y: postRuinsObservedResidue.y };
	expect(
		routeSegmentIntersectsExpandedRect(
			postRuinsObservedResidue,
			postRuinsSafeWestContinuation,
			wildwoodBankForPostRuins,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(false);
	expect(
		routeSegmentIntersectsExpandedRect(
			postRuinsSafeWestContinuation,
			{ x: postRuinsSafeWestContinuation.x, y: 3_808 },
			wildwoodBankForPostRuins,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(false);
	const postRuinsSafeStagingPoint = postRuinsPlan[2]!;
	const postRuinsSafeFrameResidue = {
		x: postRuinsSafeStagingPoint.x + AXIS_REACH_TOLERANCE,
		y: postRuinsSafeStagingPoint.y
	};
	// The staging residue may retain the full unchanged reach tolerance, but its
	// player circle must remain strictly west of the authored bank envelope.
	expect(postRuinsSafeFrameResidue.x + PLAYER_COLLISION_RADIUS).toBeLessThan(
		wildwoodBankForPostRuins.x
	);
	expect(
		expandedLayoutRectContainsPoint(
			wildwoodBankForPostRuins,
			postRuinsSafeFrameResidue,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(false);
	// A staging point on the bank's player envelope is rejected by the same
	// source-backed geometry proof; no tolerance is widened to admit it.
	const postRuinsUnsafeStagingPoint = {
		x: wildwoodBankForPostRuins.x - PLAYER_COLLISION_RADIUS + 1,
		y: postRuinsSafeStagingPoint.y
	};
	expect(
		routeSegmentIntersectsExpandedRect(
			postRuinsUnsafeStagingPoint,
			{ x: postRuinsUnsafeStagingPoint.x, y: 3_904 },
			wildwoodBankForPostRuins,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(true);
	// RED characterization for the Ruins Core return stair: the browser route
	// must settle outside the authored transition envelope before the trusted
	// keyboard helper owns the final stair crossing. The source/grid-aligned
	// `{320,3200}` staging point leaves room for the unchanged settle residue.
	const ruinsCoreReturnTransition = ruinsCoreMap.transitions.find(
		({ id }) => id === 'core-to-threshold'
	);
	expect(ruinsCoreReturnTransition).toMatchObject({ x: 256, y: 3_200 });
	if (!ruinsCoreReturnTransition) {
		throw new Error('Missing Ruins Core return transition source');
	}
	const ruinsCoreReturnStagingCharacterization = ruinsCoreReturnStagingPoint();
	expect(ruinsCoreReturnStagingCharacterization).toEqual({ x: 320, y: 3_200 });
	expect(
		ruinsCoreReturnStagingCharacterization.x - AXIS_SETTLE_TOLERANCE - PLAYER_TRANSITION_REACH
	).toBeGreaterThan(ruinsCoreReturnTransition.x);
	const ruinsCoreUnsafeReturnStaging = {
		x: ruinsCoreReturnTransition.x + PLAYER_TRANSITION_REACH - 1,
		y: ruinsCoreReturnTransition.y
	};
	expect(
		ruinsCoreUnsafeReturnStaging.x - AXIS_SETTLE_TOLERANCE - PLAYER_TRANSITION_REACH
	).toBeLessThanOrEqual(ruinsCoreReturnTransition.x);
	// The lower-river mouth settles south at its actual east-side x before the
	// westward correction; the old combined point made the runner correct x
	// first and enter the river's expanded right edge.
	const postRuinsLowerRiverPlan = postRuinsLowerRiverCrossingRoutePoints({
		x: 3_283.908,
		y: 4_470.4496
	});
	expect(postRuinsLowerRiverPlan).toEqual([
		{ x: 3_283.908, y: 4_470.4496 },
		{ x: 3_283.908, y: 4_688 },
		{ x: 3_264, y: 4_688 }
	]);
	// The failed full-fallback handoff ended above the source-derived band. The
	// replacement uses the authored navigation row and carries the live y into
	// the separate westbound phase instead of targeting another fixed y.
	const lowerRiverEastHandoffSafeBand = postRuinsLowerRiverEastHandoffSafeBand();
	const lowerRiverEastTransitRow = postRuinsLowerRiverEastHandoffTransitRow();
	const failedLowerRiverEastHandoffEndpoint = { x: 4_285.2816, y: 4_498.7144 };
	expect(failedLowerRiverEastHandoffEndpoint.y).toBeGreaterThanOrEqual(
		lowerRiverEastHandoffSafeBand.maxExclusive
	);
	const lowerRiverEastVerticalStart = { x: 4_810.2168, y: 3_817.2896 };
	const lowerRiverEastVerticalPlan = postRuinsLowerRiverEastVerticalHandoffRoutePoints(
		lowerRiverEastVerticalStart
	);
	expect(lowerRiverEastVerticalPlan).toEqual([
		lowerRiverEastVerticalStart,
		{ x: 4_288, y: 4_224 },
		{ x: 4_288, y: lowerRiverEastTransitRow }
	]);
	const lowerRiverEastVerticalDiagnostics: PlayerMovementDiagnostic[] = [
		{
			mapId: 'meadow-entry',
			previousPosition: lowerRiverEastVerticalStart,
			requestedPosition: { x: 4_288, y: lowerRiverEastVerticalStart.y },
			resolvedPosition: { x: 4_288, y: lowerRiverEastVerticalStart.y },
			blocked: false
		},
		{
			mapId: 'meadow-entry',
			previousPosition: { x: 4_288, y: lowerRiverEastVerticalStart.y },
			requestedPosition: { x: 4_288, y: 4_224 },
			resolvedPosition: { x: 4_288, y: 4_224 },
			blocked: false
		},
		{
			mapId: 'meadow-entry',
			previousPosition: { x: 4_288, y: 4_224 },
			requestedPosition: { x: 4_288, y: lowerRiverEastTransitRow },
			resolvedPosition: { x: 4_288, y: lowerRiverEastTransitRow },
			blocked: false
		}
	];
	const lowerRiverEastVerticalResult: BrowserRouteResult = {
		token: 'characterization-meadow-lower-river-east-vertical',
		mapId: 'meadow-entry',
		status: 'done',
		pointIndex: lowerRiverEastVerticalPlan.length,
		axis: null,
		position: { x: 4_288, y: lowerRiverEastTransitRow },
		target: null,
		lastDiagnostic: lowerRiverEastVerticalDiagnostics.at(-1)!,
		axisHistory: ['x', 'y'],
		diagnostics: lowerRiverEastVerticalDiagnostics,
		invalidDiagnostics: [],
		diagnosticAxes: ['x', 'y', 'y'],
		activeKey: null
	};
	assertPostRuinsLowerRiverEastHandoffPhaseContract(
		lowerRiverEastVerticalPlan,
		lowerRiverEastVerticalResult,
		'vertical',
		'characterization Meadow lower-river east vertical handoff'
	);
	const liveLowerRiverEastStaging = { x: 4_285.2816, y: 4_460.684 };
	const lowerRiverEastHorizontalPlan =
		postRuinsLowerRiverEastHorizontalHandoffRoutePoints(liveLowerRiverEastStaging);
	expect(lowerRiverEastHorizontalPlan).toEqual([
		liveLowerRiverEastStaging,
		{ x: 3_776, y: liveLowerRiverEastStaging.y }
	]);
	const lowerRiverEastHorizontalDiagnostic: PlayerMovementDiagnostic = {
		mapId: 'meadow-entry',
		previousPosition: liveLowerRiverEastStaging,
		requestedPosition: { x: 3_776, y: liveLowerRiverEastStaging.y },
		resolvedPosition: { x: 3_776, y: liveLowerRiverEastStaging.y },
		blocked: false
	};
	const lowerRiverEastHorizontalResult: BrowserRouteResult = {
		token: 'characterization-meadow-lower-river-east-horizontal',
		mapId: 'meadow-entry',
		status: 'done',
		pointIndex: lowerRiverEastHorizontalPlan.length,
		axis: null,
		position: lowerRiverEastHorizontalDiagnostic.resolvedPosition,
		target: null,
		lastDiagnostic: lowerRiverEastHorizontalDiagnostic,
		axisHistory: ['x'],
		diagnostics: [lowerRiverEastHorizontalDiagnostic],
		invalidDiagnostics: [],
		diagnosticAxes: ['x'],
		activeKey: null
	};
	assertPostRuinsLowerRiverEastHandoffPhaseContract(
		lowerRiverEastHorizontalPlan,
		lowerRiverEastHorizontalResult,
		'horizontal',
		'characterization Meadow lower-river east horizontal handoff'
	);
	const lowerRiverEastResultWithFinalY = (y: number): BrowserRouteResult => {
		const finalDiagnostic: PlayerMovementDiagnostic = {
			...lowerRiverEastVerticalDiagnostics.at(-1)!,
			requestedPosition: { x: 4_288, y },
			resolvedPosition: { x: 4_288, y }
		};
		return {
			...lowerRiverEastVerticalResult,
			position: { x: 4_288, y },
			lastDiagnostic: finalDiagnostic,
			diagnostics: [...lowerRiverEastVerticalDiagnostics.slice(0, -1), finalDiagnostic],
			diagnosticAxes: ['x', 'y', 'y']
		};
	};
	expect(() =>
		assertPostRuinsLowerRiverEastHandoffPhaseContract(
			lowerRiverEastVerticalPlan,
			lowerRiverEastResultWithFinalY(lowerRiverEastHandoffSafeBand.min - 1),
			'vertical',
			'characterization Meadow lower-river east below-band rejection'
		)
	).toThrow();
	expect(() =>
		assertPostRuinsLowerRiverEastHandoffPhaseContract(
			lowerRiverEastVerticalPlan,
			lowerRiverEastResultWithFinalY(lowerRiverEastHandoffSafeBand.maxExclusive),
			'vertical',
			'characterization Meadow lower-river east above-band rejection'
		)
	).toThrow();
	const wrongMapLowerRiverDiagnostic = {
		...lowerRiverEastVerticalDiagnostics[0]!,
		mapId: 'guild-hall'
	};
	expect(() =>
		assertPostRuinsLowerRiverEastHandoffPhaseContract(
			lowerRiverEastVerticalPlan,
			{
				...lowerRiverEastVerticalResult,
				diagnostics: [wrongMapLowerRiverDiagnostic, ...lowerRiverEastVerticalDiagnostics.slice(1)]
			},
			'vertical',
			'characterization Meadow lower-river east wrong-map rejection'
		)
	).toThrow();
	const blockedLowerRiverDiagnostic = {
		...lowerRiverEastVerticalDiagnostics[0]!,
		blocked: true
	};
	expect(() =>
		assertPostRuinsLowerRiverEastHandoffPhaseContract(
			lowerRiverEastVerticalPlan,
			{
				...lowerRiverEastVerticalResult,
				diagnostics: [blockedLowerRiverDiagnostic, ...lowerRiverEastVerticalDiagnostics.slice(1)],
				invalidDiagnostics: [blockedLowerRiverDiagnostic]
			},
			'vertical',
			'characterization Meadow lower-river east blocked rejection'
		)
	).toThrow();
	const sweptLowerRiverDiagnostic: PlayerMovementDiagnostic = {
		mapId: 'meadow-entry',
		previousPosition: { x: 3_776, y: 4_000 },
		requestedPosition: { x: 3_776, y: 4_400 },
		resolvedPosition: { x: 3_776, y: 4_400 },
		blocked: false
	};
	const sweptLowerRiverFinalDiagnostic: PlayerMovementDiagnostic = {
		mapId: 'meadow-entry',
		previousPosition: sweptLowerRiverDiagnostic.resolvedPosition,
		requestedPosition: { x: 4_288, y: lowerRiverEastTransitRow },
		resolvedPosition: { x: 4_288, y: lowerRiverEastTransitRow },
		blocked: false
	};
	expect(() =>
		assertPostRuinsLowerRiverEastHandoffPhaseContract(
			[sweptLowerRiverDiagnostic.previousPosition, { x: 4_288, y: lowerRiverEastTransitRow }],
			{
				...lowerRiverEastVerticalResult,
				lastDiagnostic: sweptLowerRiverFinalDiagnostic,
				diagnostics: [sweptLowerRiverDiagnostic, sweptLowerRiverFinalDiagnostic]
			},
			'vertical',
			'characterization Meadow lower-river east swept-collision rejection'
		)
	).toThrow();
	expect(exhaustedFarStart.status).toBe('running');
	expect(exhaustedFarAfter.status).toBe('error');
	expect(exhaustedFarAfter.error).toContain('correction limit');
	expect(exhaustedFarCancel.status).toBe('error');
	expect(blockedExhaustedStart.status).toBe('running');
	expect(blockedExhaustedAfter.status).toBe('error');
	expect(blockedExhaustedAfter.error).toContain('blocked');
	expect(blockedExhaustedCancel.status).toBe('error');
	const token = `characterization-${Date.now()}`;
	const ack = await page.evaluate(
		({
			token: requestedToken,
			initialPoint,
			settleTolerance,
			reachTolerance,
			maxCorrectionTaps
		}) => {
			const runner = (window as GlieseProbeWindow).__glieseRouteRunner;
			return (
				runner?.start({
					token: requestedToken,
					points: [
						{ x: initialPoint.x, y: initialPoint.y },
						{ x: initialPoint.x + 64, y: initialPoint.y + 64 }
					],
					settleTolerance,
					reachTolerance,
					maxCorrectionTaps
				}) ?? null
			);
		},
		{
			token,
			initialPoint: initial!,
			settleTolerance: AXIS_SETTLE_TOLERANCE,
			reachTolerance: AXIS_REACH_TOLERANCE,
			maxCorrectionTaps: MAX_AXIS_CORRECTION_TAPS
		}
	);
	expect(ack?.status).toBe('running');

	try {
		await page.waitForFunction(
			(requestedToken) => {
				const state = (window as GlieseProbeWindow).__glieseRouteRunner?.get(requestedToken);
				return state?.status === 'done';
			},
			token,
			{ timeout: 4_000 }
		);
	} catch (error) {
		const evidence = await page.evaluate(
			(requestedToken) => ({
				state: (window as GlieseProbeWindow).__glieseRouteRunner?.get(requestedToken) ?? null,
				movementCount: (window as GlieseProbeWindow).__glieseCharacterizationMovementCount ?? 0
			}),
			token
		);
		throw new Error(`Characterization route did not finish: ${JSON.stringify(evidence)}`, {
			cause: error
		});
	}
	const result = await page.evaluate(
		(requestedToken) =>
			(window as GlieseProbeWindow).__glieseRouteRunner?.get(requestedToken) ?? null,
		token
	);
	expect(result?.status).toBe('done');
	expect(result?.position?.x).toBeGreaterThan(initial!.x);
	expect(result?.position?.y).toBeGreaterThan(initial!.y);
	expect(result?.lastDiagnostic?.mapId).toBe('meadow-entry');
	expect(result?.lastDiagnostic?.blocked).toBe(false);
});

test('Meadow Entry supports the continuous outdoor route and persists its proof state', async ({
	page
}) => {
	// The proof traverses every authored Meadow Entry seam and includes a battle;
	// allow the browser route enough wall-clock budget while each movement helper
	// retains its own collision timeout.
	test.setTimeout(360_000);
	await installRuntimeProbes(page);
	await injectSave(
		page,
		createSaveFixture({
			clearedEncounters: ['meadow-slime-west', 'meadow-slime-center'],
			player: {
				level: 1,
				xp: 0,
				hp: 200,
				attack: 50,
				x: 704,
				y: 5_920,
				facing: 'down'
			}
		})
	);
	await page.goto('/?movementDiagnostics=on');
	await expect(page.locator('canvas')).toBeVisible();
	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
	await expect(fieldStatus(page)).toContainText('Save resumed');
	await page.locator('canvas').click();

	// Hero House frontage → west village lane → Main Street. The short side trip
	// to the market cache keeps a real pickup in the same continuous run.
	await moveRoute(page, HERO_HOUSE_TO_CROSSROADS.slice(0, 5));
	await moveRoute(page, [
		{ x: 320, y: 4_688 },
		{ x: 912, y: 4_688 },
		{ x: 912, y: 5_072 }
	]);
	await expect(fieldStatus(page)).toContainText('Found');
	await moveRoute(page, [
		{ x: 912, y: 5_072 },
		{ x: 912, y: 4_688 },
		{ x: 3_264, y: 4_688 },
		{ x: 3_776, y: 4_688 },
		{ x: 3_776, y: 4_480 }
	]);

	// Crossroads payoff: collect one plaza pickup and read one waystone discovery.
	await moveRoute(page, [
		{ x: 3_776, y: 4_480 },
		{ x: 4_032, y: 4_480 }
	]);
	await expect(fieldStatus(page)).toContainText('Found');
	await moveRoute(page, [
		{ x: 4_032, y: 4_480 },
		{ x: 4_032, y: 4_224 },
		{ x: 3_904, y: 4_224 }
	]);
	// Give Phaser one settled frame after the final movement correction, then hold
	// the interaction key long enough for JustDown to be observed deterministically.
	await page.waitForTimeout(120);
	await page.keyboard.press('e', { delay: 50 });
	const discoveryDialog = page.getByRole('dialog');
	await expect(discoveryDialog).toBeVisible();
	await discoveryDialog.getByRole('button', { name: 'Close' }).click();

	// Crossroads → Mistfen seam → Crossroads.
	await moveRoute(page, [
		{ x: 3_904, y: 4_224 },
		// The waystone collision owns the direct west edge of the discovery;
		// return around its north-east corner before rejoining the plaza route.
		{ x: 4_160, y: 4_224 },
		{ x: 4_160, y: 4_480 },
		{ x: 3_776, y: 4_480 },
		...CROSSROADS_TO_MISTFEN.slice(1)
	]);
	await moveRoute(page, [...CROSSROADS_TO_MISTFEN].reverse());

	// Crossroads → Silverpine seam → Crossroads.
	await moveRoute(page, CROSSROADS_TO_SILVERPINE);
	await moveRoute(page, [...CROSSROADS_TO_SILVERPINE].reverse());

	// Crossroads → Wildwood seam. Continue up the live forest road to the one
	// remaining encounter, then return to the gated cave transition.
	await moveRoute(page, CROSSROADS_TO_WILDWOOD);
	await moveRoute(page, [
		{ x: 4_800, y: 3_808 },
		{ x: 4_420, y: 3_808 },
		{ x: 4_420, y: 5_347 },
		{ x: 5_600, y: 5_347 },
		{ x: 5_600, y: 3_200 },
		{ x: 5_600, y: 2_100 },
		{ x: 5_600, y: 1_600 }
	]);
	await moveAndResolveBattle(page, 'ArrowRight');
	await expect(fieldStatus(page)).toContainText('Returned from battle');
	await moveRoute(page, [
		{ x: 5_920, y: 1_664 },
		{ x: 5_600, y: 1_664 },
		{ x: 5_600, y: 2_100 },
		{ x: 5_960, y: 2_100 }
	]);
	// The authored cave transition point sits inside the landmark body. Keep
	// this final approach isolated and allow only the existing reach tolerance
	// for its collision edge; all other blocked stalls remain strict settle
	// failures, and the gated status is asserted immediately afterward.
	await moveRoute(
		page,
		[
			{ x: 5_960, y: 2_100 },
			{ x: 5_960, y: 1_868 }
		],
		AXIS_SETTLE_TOLERANCE,
		AXIS_REACH_TOLERANCE
	);
	await expect(fieldStatus(page)).toContainText('Report to the Guild Master first');

	// Return to Crossroads, then take the Tidewatch Coast seam and return.
	await moveRoute(page, [
		{ x: 5_960, y: 1_868 },
		{ x: 5_960, y: 2_100 },
		{ x: 5_600, y: 2_100 },
		{ x: 5_600, y: 3_200 },
		{ x: 5_600, y: 3_808 },
		// The authored forest road is one-way around this hedge bank at y=3808;
		// drop to the southern lane before crossing back west.
		{ x: 5_600, y: 5_347 },
		{ x: 4_420, y: 5_347 },
		{ x: 4_420, y: 3_808 },
		{ x: 4_800, y: 3_808 },
		{ x: 4_800, y: 4_224 },
		{ x: 4_288, y: 4_224 },
		{ x: 4_288, y: 4_480 },
		{ x: 3_776, y: 4_480 }
	]);
	// A keyboard-only Phaser step is legally anywhere from 0 to 60px, so the
	// numerical x=4,180 ± 4 fine-tune cannot be guaranteed. The collision-safe
	// band asserted below is authoritative; carry the actual safe x through each
	// vertical leg before rejoining the authored route.
	const coastOutboundPrefix = await moveRoute(page, CROSSROADS_TO_COAST.slice(0, 4));
	const coastOutboundCurrent = await moveRoute(
		page,
		[coastOutboundPrefix, { x: COAST_SAFE_X_CENTER, y: coastOutboundPrefix.y }],
		COAST_SAFE_X_TOLERANCE
	);
	const coastOutboundTurn = await latestMovement(page);
	expect(coastOutboundCurrent.x).toBeGreaterThanOrEqual(COAST_SAFE_X_MIN);
	expect(coastOutboundCurrent.x).toBeLessThanOrEqual(COAST_SAFE_X_MAX);
	expect(coastOutboundCurrent.y).toBeGreaterThanOrEqual(5_508);
	expect(coastOutboundCurrent.y).toBeLessThanOrEqual(5_532);
	expect(coastOutboundTurn?.resolvedPosition.x).toBeLessThanOrEqual(COAST_SAFE_X_MAX);
	expect(coastOutboundTurn?.resolvedPosition.x).toBeGreaterThanOrEqual(COAST_SAFE_X_MIN);
	expect(coastOutboundTurn?.resolvedPosition.y).toBeGreaterThanOrEqual(5_508);
	expect(coastOutboundTurn?.resolvedPosition.y).toBeLessThanOrEqual(5_532);
	expect(coastOutboundTurn?.blocked).toBe(false);
	await moveRoute(page, [
		coastOutboundCurrent,
		{ x: coastOutboundCurrent.x, y: CROSSROADS_TO_COAST[4].y },
		...CROSSROADS_TO_COAST.slice(5)
	]);
	const coastReversePath = [...CROSSROADS_TO_COAST].reverse();
	const coastReversePrefix = await moveRoute(page, coastReversePath.slice(0, 2));
	const coastReverseCurrent = await moveRoute(
		page,
		[coastReversePrefix, { x: COAST_SAFE_X_CENTER, y: coastReversePrefix.y }],
		COAST_SAFE_X_TOLERANCE
	);
	const coastReverseTurn = await latestMovement(page);
	expect(coastReverseCurrent.x).toBeGreaterThanOrEqual(COAST_SAFE_X_MIN);
	expect(coastReverseCurrent.x).toBeLessThanOrEqual(COAST_SAFE_X_MAX);
	expect(coastReverseCurrent.y).toBeGreaterThanOrEqual(5_828);
	expect(coastReverseCurrent.y).toBeLessThanOrEqual(5_852);
	expect(coastReverseTurn?.resolvedPosition.x).toBeLessThanOrEqual(COAST_SAFE_X_MAX);
	expect(coastReverseTurn?.resolvedPosition.x).toBeGreaterThanOrEqual(COAST_SAFE_X_MIN);
	expect(coastReverseTurn?.resolvedPosition.y).toBeGreaterThanOrEqual(5_828);
	expect(coastReverseTurn?.resolvedPosition.y).toBeLessThanOrEqual(5_852);
	expect(coastReverseTurn?.blocked).toBe(false);
	// The continuation starts above the east-fence crossbar. Preserve the safe x
	// while moving north, then rejoin the authored x=4,224 crossbar point.
	await moveRoute(
		page,
		[
			coastReverseCurrent,
			{ x: coastReverseCurrent.x, y: coastReversePath[2].y },
			...coastReversePath.slice(3)
		],
		COAST_CONTINUATION_SETTLE_TOLERANCE
	);

	// Crossroads → Sundrop Village, ending on the authored village main street.
	await moveRoute(page, [
		{ x: 3_776, y: 4_480 },
		{ x: 3_264, y: 4_688 },
		{ x: 320, y: 4_688 },
		{ x: 1_152, y: 4_800 }
	]);
	await expect(page.getByTestId('hud-location-panel')).toContainText('Sundrop Meadows');

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Save Game' }).click();
	await expect(fieldStatus(page)).toContainText('Saved');
	const persisted = await page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
		SAVE_STORAGE_KEY
	);
	expect(persisted.mapId).toBe('meadow-entry');
	expect(persisted.player.x).toBeGreaterThanOrEqual(1_140);
	expect(persisted.player.x).toBeLessThanOrEqual(1_164);
	expect(persisted.player.y).toBeGreaterThanOrEqual(4_788);
	expect(persisted.player.y).toBeLessThanOrEqual(4_812);
	expect(persisted.flags.collectedPickups).toEqual(
		expect.arrayContaining(['village-market-cache', 'crossroads-cache'])
	);
	expect(persisted.seenDiscoveries).toContain('crossroads-waystone-sign');
	expect(persisted.flags.clearedEncounters).toContain('meadow-slime-east');

	await page.reload();
	await expect(page.locator('canvas')).toBeVisible();
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;
		return state?.ready === true && state.mapId === 'meadow-entry';
	});
	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
	try {
		await page.waitForFunction(
			({ x, y, tolerance }) => {
				const state = (window as GlieseProbeWindow).__glieseLastHudState;
				const player = state?.areaMap?.player;
				return (
					state?.ready === true &&
					state.mapId === 'meadow-entry' &&
					typeof player?.x === 'number' &&
					typeof player?.y === 'number' &&
					Math.abs(player.x - x) <= tolerance &&
					Math.abs(player.y - y) <= tolerance
				);
			},
			{ x: persisted.player.x, y: persisted.player.y, tolerance: AXIS_SETTLE_TOLERANCE },
			{ timeout: 30_000 }
		);
	} catch (error) {
		const resumedState = await page.evaluate(
			() => (window as GlieseProbeWindow).__glieseLastHudState ?? null
		);
		throw new Error(
			`Resumed HUD did not restore saved player position: ${JSON.stringify({
				persisted: persisted.player,
				resumed: resumedState?.areaMap?.player,
				mapId: resumedState?.mapId,
				ready: resumedState?.ready
			})}; ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error }
		);
	}
	await expect(fieldStatus(page)).toContainText('Save resumed');
	const resumedHud = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseLastHudState ?? null
	);
	expect(resumedHud?.areaMap?.player?.x).toBeCloseTo(persisted.player.x, 0);
	expect(resumedHud?.areaMap?.player?.y).toBeCloseTo(persisted.player.y, 0);
	const resumedConsumables = resumedHud?.inventory?.consumables ?? [];
	expect(
		resumedConsumables.find((item) => item.itemId === 'field-potion')?.quantity
	).toBeGreaterThanOrEqual(2);
	expect(
		resumedConsumables.find((item) => item.itemId === 'sunleaf-salve')?.quantity
	).toBeGreaterThanOrEqual(1);
});

test('Complete world layout foundation keeps historical Meadow art opt-in', async ({ page }) => {
	test.setTimeout(180_000);
	await installRuntimeProbes(page);

	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();
	const fallbackDiagnostic = await waitForMeadowPlaneDiagnostic(page);
	expect(fallbackDiagnostic).toMatchObject({
		mapId: 'meadow-entry',
		packageId: null,
		presentationMode: 'fallback',
		selectedBackgroundIds: [],
		requiredBackgroundIds: [],
		selectedFallbackBlockerIds: [],
		selectedFallbackDecorIds: [],
		selectedFallbackFenceIds: []
	});

	await page.goto('/?meadowPaintedPilot=on');
	await expect(page.locator('canvas')).toBeVisible();
	const pilotDiagnostic = await waitForMeadowPlaneDiagnostic(page);
	expect(pilotDiagnostic).toMatchObject({
		mapId: 'meadow-entry',
		packageId: 'meadow-entry-painted-v2-legacy',
		presentationMode: 'painted',
		selectedBackgroundIds: [...PAINTED_PILOT_BACKGROUND_IDS],
		requiredBackgroundIds: [...PAINTED_PILOT_BACKGROUND_IDS]
	});

	await page.goto(
		`/?meadowPaintedPilot=on&regionalBackgroundFault=${PAINTED_PILOT_CROSSROADS_TEXTURE}:render`
	);
	await expect(page.locator('canvas')).toBeVisible();
	const faultDiagnostic = await waitForMeadowPlaneDiagnostic(page);
	expect(faultDiagnostic).toMatchObject({
		mapId: 'meadow-entry',
		packageId: null,
		presentationMode: 'fallback',
		selectedBackgroundIds: [],
		successfulBackgroundIds: []
	});
	// A failed historical package restores the complete authored static
	// presentation. The ownership IDs are the protected painted-pilot subset;
	// assert their presence while also proving the fallback includes the other
	// legacy static classes (rather than expecting only the pilot-owned subset).
	expect(faultDiagnostic.selectedFallbackBlockerIds).toEqual(
		expect.arrayContaining([...PAINTED_PILOT_CROSSROADS_BLOCKER_OWNERS])
	);
	expect(faultDiagnostic.selectedFallbackBlockerIds?.length).toBeGreaterThan(
		PAINTED_PILOT_CROSSROADS_BLOCKER_OWNERS.length
	);
	expect(faultDiagnostic.selectedFallbackDecorIds.length).toBeGreaterThan(4);
	expect(faultDiagnostic.selectedFallbackDecorIds).toEqual(
		expect.arrayContaining([
			'village-decor-22-77',
			'village-decor-28-25',
			'village-decor-28-53',
			'village-decor-53-22'
		])
	);
	expect(faultDiagnostic.selectedFallbackFenceIds.length).toBeGreaterThan(0);
	expect(faultDiagnostic.entries).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				id: PAINTED_PILOT_CROSSROADS_TEXTURE,
				status: 'render-failed'
			})
		])
	);
});

test('Complete world layout foundation traverses every map in fallback mode', async ({ page }) => {
	// This one continuous keyboard journey can exceed twenty minutes under the
	// full composed-collision route. Provide a 120-minute outer budget for the
	// source-known final route and save/reload tail while keeping the route
	// runner watchdog and movement contract unchanged.
	test.setTimeout(7_200_000);
	assertInteriorNpcApproachBindings();
	expect(TASK6_INITIAL_CLEARED_ENCOUNTERS).toEqual([
		'threshold-slime-west',
		'threshold-slime-east',
		'meadow-slime-west',
		'meadow-slime-center',
		'meadow-slime-east',
		'ruins-warden'
	]);
	expect(FALLBACK_CORE_MAIN_ROUTE).toContainEqual({ x: 3_584, y: 4_544 });
	await installRuntimeProbes(page, { captureFacing: true, captureSceneState: true });
	await injectSave(
		page,
		createSaveFixture({
			mapId: 'hero-house',
			clearedEncounters: [...TASK6_INITIAL_CLEARED_ENCOUNTERS],
			player: {
				level: 1,
				xp: 0,
				hp: 20,
				attack: 3,
				x: 352,
				y: 480,
				facing: 'up'
			}
		})
	);
	await page.setViewportSize({ width: 1_920, height: 1_080 });
	await page.goto('/?meadowPaintedPilot=off&movementDiagnostics=on');
	await expect(page.locator('canvas')).toBeVisible();
	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
	await waitForExactHudPosition(page, 'hero-house', { x: 352, y: 480 });

	const routeEvidence: JourneyRouteEvidence[] = [];
	const routeResults = new Map<string, BrowserRouteResult>();
	const recordRoute = (label: string, result: BrowserRouteResult) => {
		// Every caller passes a result returned by runBrowserRoute, which performs
		// the faithful per-diagnostic validation before returning. Keep this
		// recorder evidence-only so the 944-diagnostic routes are not validated a
		// second time.
		routeResults.set(label, result);
		routeEvidence.push(collectJourneyRouteEvidence(label, result));
		if (result.lastDiagnostic) {
			expect(result.lastDiagnostic.blocked, `${label} last movement`).toBe(false);
		}
	};
	const journeyRoute = async (
		label: string,
		points: readonly Point[],
		settleTolerance = AXIS_SETTLE_TOLERANCE,
		blockedTolerance = settleTolerance
	): Promise<Point> => {
		await page.locator('canvas').click();
		const result = await runBrowserRoute(page, points, settleTolerance, blockedTolerance);
		recordRoute(label, result);
		if (!result.position) {
			throw new Error(
				`Missing final point for ${label}: ${describeBrowserRouteResult(result, result.token)}`
			);
		}
		return result.position;
	};
	const journeyToOutdoorAnchor = async (
		label: string,
		requestedAnchor: Point,
		points: readonly Point[]
	): Promise<Point> => {
		expect(points.at(-1)).toEqual(requestedAnchor);
		const actual = await journeyRoute(label, points);
		expect(Math.abs(actual.x - requestedAnchor.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
		expect(Math.abs(actual.y - requestedAnchor.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
		return actual;
	};
	const interior = (mapId: string): InteriorGrayboxCase => {
		const found = INTERIOR_GRAYBOX_CASES.find((candidate) => candidate.mapId === mapId);
		if (!found) throw new Error(`Missing Task 6 interior fixture: ${mapId}`);
		return found;
	};
	const recordInteriorRoute = (label: string, result: BrowserRouteResult) => {
		recordRoute(label, result);
	};

	const heroHouse = interior('hero-house');
	const guildHall = interior('guild-hall');
	const itemShop = interior('item-shop');
	const villagerHouse1 = interior('villager-house-1');
	const villagerHouse2 = interior('villager-house-2');
	const villagerHouse3 = interior('villager-house-3');
	const shrine = interior('shrine-of-aurora-interior');

	// Start inside Hero House, then prove its authored Meadow return arrival with
	// the existing trusted keyboard transition helper.
	let meadowPoint = await exitInteriorWithTrustedKeyboard(page, heroHouse);
	await waitForExactHudPosition(page, 'meadow-entry', heroHouse.returnArrival);

	// Visit all seven interiors. The Guild Master interaction completes the main
	// quest's talk objective and accepts one representative side quest; the
	// Quartermaster and Mira interactions cover shop behavior while the other
	// rooms exercise their resident NPCs and exact return arrivals.
	await journeyRoute('Meadow to Guild Hall', [
		meadowPoint,
		{ x: 704, y: 6_080 },
		{ x: 320, y: 6_080 },
		{ x: 320, y: 4_688 },
		{ x: 2_272, y: 4_688 },
		guildHall.returnArrival
	]);
	meadowPoint = await traverseInteriorForJourney(
		page,
		guildHall,
		{ completeGuildMasterQuest: true },
		recordInteriorRoute
	);
	const questAfterGuild = await page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
		SAVE_STORAGE_KEY
	);
	expect(questAfterGuild?.quests?.completedObjectives?.['investigate-the-ruins']).toContain(
		'talk-to-guild-master'
	);

	await journeyRoute('Guild Hall to Item Shop', [
		meadowPoint,
		{ x: 2_272, y: 4_688 },
		{ x: 912, y: 4_688 },
		{ x: 912, y: 5_376 },
		{ x: 704, y: 5_376 },
		itemShop.returnArrival
	]);
	meadowPoint = await traverseInteriorForJourney(page, itemShop, {}, recordInteriorRoute);

	await journeyRoute('Item Shop to Villager House 1', [
		meadowPoint,
		{ x: meadowPoint.x, y: 5_376 },
		{ x: 912, y: 5_376 },
		{ x: 912, y: 4_688 },
		{ x: 672, y: 4_688 },
		villagerHouse1.returnArrival
	]);
	meadowPoint = await traverseInteriorForJourney(page, villagerHouse1, {}, recordInteriorRoute);

	const villagerHouse2SouthLaneHandoff = await journeyRoute(
		'Villager House 1 to Villager House 2 south-lane handoff',
		[meadowPoint, { x: 672, y: 4_688 }, { x: 1_376, y: 4_688 }]
	);
	const villagerHouse2ApproachRoute = villagerHouse2OutdoorApproachRoutePoints(
		villagerHouse2SouthLaneHandoff,
		villagerHouse2.returnArrival
	);
	const villagerHouse2ReturnPoint = await journeyRoute(
		'Villager House 1 to Villager House 2 vertical approach',
		villagerHouse2ApproachRoute.vertical
	);
	const villagerHouse2Approach = SUNDROP_VILLAGE_V2_BUILDINGS.villagerHouse2.approach;
	expect(villagerHouse2ReturnPoint.x).toBeGreaterThanOrEqual(
		villagerHouse2Approach.x + PLAYER_COLLISION_RADIUS
	);
	expect(villagerHouse2ReturnPoint.x).toBeLessThanOrEqual(
		villagerHouse2Approach.x + villagerHouse2Approach.width - PLAYER_COLLISION_RADIUS
	);
	expect(
		Math.abs(villagerHouse2ReturnPoint.x - villagerHouse2.returnArrival.x)
	).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(
		Math.abs(villagerHouse2ReturnPoint.y - villagerHouse2.returnArrival.y)
	).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	meadowPoint = await traverseInteriorForJourney(page, villagerHouse2, {}, recordInteriorRoute);

	await journeyRoute('Villager House 2 to Shrine', [
		meadowPoint,
		{ x: 1_376, y: 4_688 },
		{ x: 2_688, y: 4_688 },
		{ x: 2_688, y: 6_080 },
		{ x: 2_272, y: 6_080 },
		shrine.returnArrival
	]);
	meadowPoint = await traverseInteriorForJourney(page, shrine, {}, recordInteriorRoute);

	await journeyRoute('Shrine to Villager House 3', [
		meadowPoint,
		{ x: 2_272, y: 6_080 },
		{ x: 1_472, y: 6_080 },
		villagerHouse3.returnArrival
	]);
	meadowPoint = await traverseInteriorForJourney(page, villagerHouse3, {}, recordInteriorRoute);

	// Village bridge → Crossroads. The Waystone is an actual discovery
	// interaction, not a coordinate seed or direct scene mutation.
	const villageBridgeWestStagingTarget = villageBridgeWestStagingPoint();
	const villageBridgeWestStagingRoute = [
		meadowPoint,
		{ x: 1_472, y: 6_080 },
		{ x: 320, y: 6_080 },
		...FALLBACK_V2_HERO_HOUSE_TO_CROSSROADS.slice(3, 4),
		villageBridgeWestStagingTarget
	] as const;
	const villageBridgeWestStaging = await journeyRoute(
		'Village bridge west staging',
		villageBridgeWestStagingRoute
	);
	const villageBridgeWestStagingResult = routeResults.get('Village bridge west staging');
	if (!villageBridgeWestStagingResult) {
		throw new Error('Missing Village bridge west staging route result');
	}
	assertVillageBridgeRoutePhaseContract(
		villageBridgeWestStagingRoute,
		villageBridgeWestStagingResult,
		'Village bridge west staging'
	);
	expect(villageBridgeWestStagingResult.position).not.toBeNull();
	expect(
		villageBridgeWestStaging.x + PLAYER_COLLISION_RADIUS,
		'Village bridge west staging player envelope'
	).toBeLessThan(MEADOW_ENTRY_V2_CROSSINGS.sundropBridge.x);
	expect(
		Math.abs(villageBridgeWestStaging.x - villageBridgeWestStagingTarget.x),
		'Village bridge west staging x residue'
	).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(
		Math.abs(villageBridgeWestStaging.y - villageBridgeWestStagingTarget.y),
		'Village bridge west staging y residue'
	).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);

	const bridgeEastAnchor = FALLBACK_V2_HERO_HOUSE_TO_CROSSROADS[5]!;
	const crossroadsSouthAnchor = FALLBACK_V2_HERO_HOUSE_TO_CROSSROADS[6]!;
	const crossroadsAnchor = FALLBACK_V2_HERO_HOUSE_TO_CROSSROADS[7]!;
	const villageBridgeToCrossroadsRoute = [
		villageBridgeWestStaging,
		{ x: bridgeEastAnchor.x, y: villageBridgeWestStaging.y },
		{ x: crossroadsSouthAnchor.x, y: villageBridgeWestStaging.y },
		crossroadsAnchor
	] as const;
	await journeyRoute('Village bridge to Crossroads', villageBridgeToCrossroadsRoute);
	const villageBridgeToCrossroadsResult = routeResults.get('Village bridge to Crossroads');
	if (!villageBridgeToCrossroadsResult) {
		throw new Error('Missing Village bridge to Crossroads route result');
	}
	assertVillageBridgeRoutePhaseContract(
		villageBridgeToCrossroadsRoute,
		villageBridgeToCrossroadsResult,
		'Village bridge to Crossroads'
	);
	for (const point of villageBridgeToCrossroadsRoute.slice(1, -1)) {
		expect(point.y, 'Village bridge live-y continuity').toBe(villageBridgeWestStaging.y);
	}
	const crossroads = await currentHudPlayerPoint(page);
	expect(Math.abs(crossroads.x - 3_904)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(crossroads.y - 4_224)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	await journeyRoute('Crossroads cache approach', [crossroads, { x: 4_032, y: 4_480 }]);
	await expect(fieldStatus(page)).toContainText('Found');
	const waystonePoint = await journeyRoute('Crossroads Waystone approach', [
		{ x: 4_032, y: 4_480 },
		{ x: 4_032, y: 4_224 },
		crossroads
	]);
	await page.waitForTimeout(120);
	await page.keyboard.press('e', { delay: 50 });
	const waystoneDialog = page.getByRole('dialog');
	await expect(waystoneDialog).toBeVisible();
	await expect(waystoneDialog).toContainText(/Waystone|Crossroads/i);
	await waystoneDialog.getByRole('button', { name: 'Close' }).click();

	// Mistfen bridge and its authored forager loop.
	const mistfenAnchor = await journeyToOutdoorAnchor(
		'Crossroads to Mistfen bridge',
		{ x: 2_240, y: 3_648 },
		[waystonePoint, ...FALLBACK_V2_CROSSROADS_TO_MISTFEN.slice(1)]
	);
	const mistfenLoop = await journeyRoute('Mistfen optional loop outbound', [
		mistfenAnchor,
		{ x: 2_320, y: 3_648 },
		{ x: 2_320, y: 3_136 },
		{ x: 2_320, y: 2_784 },
		{ x: 2_400, y: 2_784 },
		{ x: 2_400, y: 2_700 }
	]);
	const mistfenLoopReturn = await journeyRoute('Mistfen optional loop return', [
		mistfenLoop,
		{ x: 2_400, y: 2_784 },
		{ x: 2_320, y: 2_784 },
		{ x: 2_320, y: 3_136 },
		{ x: 2_320, y: 3_648 },
		mistfenAnchor
	]);
	const mistfenBridgeReturn = await journeyRoute('Mistfen bridge return', [
		mistfenLoopReturn,
		...[...FALLBACK_V2_CROSSROADS_TO_MISTFEN].reverse().slice(1)
	]);

	// Silverpine bridge and its upper offering-cache loop.
	const silverpineAnchor = await journeyToOutdoorAnchor(
		'Crossroads to Silverpine bridge',
		{ x: 3_904, y: 2_416 },
		[mistfenBridgeReturn, ...FALLBACK_V2_CROSSROADS_TO_SILVERPINE.slice(1)]
	);
	const silverpineCacheRoute = deriveSilverpineOptionalCacheRoute(silverpineAnchor);
	const silverpineLoop = await journeyRoute('Silverpine optional loop outbound', [
		...silverpineCacheRoute
	]);
	await expect(fieldStatus(page)).toContainText('Found');
	const silverpineLoopReturn = await journeyRoute('Silverpine optional loop return', [
		silverpineLoop,
		...silverpineCacheRoute.slice().reverse().slice(1)
	]);
	const silverpineBridgeReturn = await journeyRoute('Silverpine bridge return', [
		silverpineLoopReturn,
		...[...FALLBACK_V2_CROSSROADS_TO_SILVERPINE].reverse().slice(1)
	]);

	// Tidewatch Coast and the ferry approach/discovery.
	const coastAnchor = await journeyToOutdoorAnchor(
		'Crossroads to Tidewatch Coast',
		{ x: 4_224, y: 5_120 },
		[silverpineBridgeReturn, ...FALLBACK_V2_CROSSROADS_TO_COAST.slice(1)]
	);
	const coastFerryRoute = deriveCoastFerryRoute(coastAnchor);
	const ferryPoint = await journeyRoute('Tidewatch ferry approach', coastFerryRoute);
	expect(
		isInsideAnyCollisionRect(
			ferryPoint.x,
			ferryPoint.y,
			collectLandmarkRects(meadowEntryMap),
			PLAYER_COLLISION_RADIUS
		)
	).toBe(false);
	await page.waitForTimeout(120);
	await page.keyboard.press('e', { delay: 50 });
	const ferryDialog = page.getByRole('dialog');
	await expect(ferryDialog).toBeVisible();
	await expect(ferryDialog).toContainText(/Ferry|Tidewatch|shrine/i);
	await ferryDialog.getByRole('button', { name: 'Close' }).click();
	const ferryReturn = await journeyRoute('Tidewatch ferry return', [
		ferryPoint,
		...coastFerryRoute.slice().reverse().slice(1)
	]);
	const coastBridgeReturn = await journeyRoute('Tidewatch Coast return', [
		ferryReturn,
		...[...FALLBACK_V2_CROSSROADS_TO_COAST].reverse().slice(1)
	]);

	// Wildwood and its optional side clearing, stopping at the safe cave staging
	// point before the trusted transition key enters the gated dungeon.
	const wildwoodAnchor = await journeyToOutdoorAnchor(
		'Crossroads to Wildwood bridge',
		{ x: 4_992, y: 3_904 },
		[coastBridgeReturn, ...FALLBACK_V2_CROSSROADS_TO_WILDWOOD.slice(1)]
	);
	const wildwoodLoop = await journeyRoute('Wildwood optional loop outbound', [
		wildwoodAnchor,
		{ x: 4_700, y: 3_904 },
		{ x: 4_700, y: 3_650 }
	]);
	await expect(fieldStatus(page)).toContainText('Found');
	const wildwoodLoopReturn = await journeyRoute('Wildwood optional loop return', [
		wildwoodLoop,
		{ x: 4_700, y: 3_904 },
		wildwoodAnchor
	]);
	const wildwoodCaveAnchor = await journeyToOutdoorAnchor(
		'Wildwood cave anchor route',
		WILDWOOD_CAVE_ANCHOR,
		deriveMeadowEntryComposedCollisionRoute(
			wildwoodLoopReturn,
			WILDWOOD_CAVE_ANCHOR,
			'Wildwood loop return to cave anchor'
		)
	);
	const wildwoodCaveStaging = await journeyToOutdoorAnchor(
		'Wildwood cave staging route',
		WILDWOOD_CAVE_STAGING,
		deriveMeadowEntryComposedCollisionRoute(
			wildwoodCaveAnchor,
			WILDWOOD_CAVE_STAGING,
			'Wildwood cave anchor to transition staging'
		)
	);
	const wildwoodCaveStagingEvidence = await currentHudPlayerEvidence(page, 'meadow-entry');
	const wildwoodCaveDoorway = await runCaveDoorwayBandSteering(
		page,
		wildwoodCaveStagingEvidence,
		wildwoodCaveStagingEvidence.selectedPoint.y,
		'Wildwood cave doorway band steering'
	);
	const wildwoodDoorwayPoint = wildwoodCaveDoorway.position!;
	expect(wildwoodDoorwayPoint.y).toBe(wildwoodCaveStagingEvidence.selectedPoint.y);
	const wildwoodTransitionSourcePoint = {
		x: WILDWOOD_CAVE_STAGING.x,
		y: WILDWOOD_CAVE_ANCHOR.y
	};
	expect(Math.abs(wildwoodDoorwayPoint.x - wildwoodCaveStaging.x)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	expect(Math.abs(wildwoodDoorwayPoint.y - WILDWOOD_CAVE_STAGING.y)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	// The authored cave transition sits inside the landmark body. The browser-local
	// doorway helper first moves the actual staged x into the source-carved band;
	// the source-aware trusted transition helper then owns the exact trigger edge.
	await transitionWithTrustedKeyboard(
		page,
		'ArrowUp',
		'meadow-entry',
		wildwoodTransitionSourcePoint,
		'ruins-threshold',
		{
			x: 512,
			y: 3_200
		}
	);

	// Ruins Threshold: exercise both optional loops first, then run the authored
	// east encounter/stair approach. The six initial seed identities only unlock
	// existing requiresClear transitions; no browser combat is claimed here.
	await journeyRoute('Ruins Threshold north loop', FALLBACK_THRESHOLD_NORTH_LOOP);
	await journeyRoute('Ruins Threshold south loop', FALLBACK_THRESHOLD_SOUTH_LOOP);
	const ruinsThresholdCoreStagingActual = await journeyRoute(
		'Ruins Threshold main route to core stair',
		FALLBACK_THRESHOLD_MAIN_ROUTE
	);
	const ruinsThresholdCoreStagingResult = routeResults.get(
		'Ruins Threshold main route to core stair'
	);
	const ruinsThresholdCoreTransition = ruinsThresholdMap.transitions.find(
		({ id }) => id === 'threshold-to-core'
	);
	expect(ruinsThresholdCoreStagingResult).toBeDefined();
	expect(ruinsThresholdCoreTransition).toMatchObject({ x: 5_888, y: 3_200 });
	if (!ruinsThresholdCoreStagingResult || !ruinsThresholdCoreTransition) {
		throw new Error('Missing Ruins Threshold core-stair route evidence or transition source');
	}
	expect(ruinsThresholdCoreStagingResult.mapId).toBe('ruins-threshold');
	expect(ruinsThresholdCoreStagingResult.invalidDiagnostics).toEqual([]);
	expect(
		(ruinsThresholdCoreStagingResult.diagnostics ?? []).every(
			(diagnostic) => diagnostic.mapId === 'ruins-threshold' && diagnostic.blocked === false
		)
	).toBe(true);
	expect(ruinsThresholdCoreStagingActual.x + PLAYER_TRANSITION_REACH).toBeLessThan(
		ruinsThresholdCoreTransition.x
	);
	await transitionWithTrustedKeyboard(
		page,
		'ArrowRight',
		'ruins-threshold',
		{ x: 5_888, y: 3_200 },
		'ruins-core',
		{
			x: 512,
			y: 3_200
		}
	);
	await dismissUnexpectedRuinsWardenBattleSummary(page);
	await expect(fieldStatus(page)).toContainText('Victory: ruins cleared');

	// Ruins Core north pickup, south pickup, and the safe boss approach.
	assertRuinsCoreDraughtRouteContract(FALLBACK_CORE_MAIN_ROUTE);
	const corePickupsBefore = await page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
		SAVE_STORAGE_KEY
	);
	expect(corePickupsBefore?.flags?.collectedPickups ?? []).not.toContain('ruins-core-draught');
	await journeyRoute('Ruins Core pickup and boss approach', FALLBACK_CORE_MAIN_ROUTE);
	const coreRouteResult = routeResults.get('Ruins Core pickup and boss approach');
	expect(coreRouteResult).toBeDefined();
	if (!coreRouteResult) {
		throw new Error('Missing Ruins Core route result');
	}
	for (const [index, diagnostic] of (coreRouteResult.diagnostics ?? []).entries()) {
		expect(diagnostic.blocked, `Ruins Core route diagnostic ${index}`).toBe(false);
	}
	const coreState = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseLastHudState ?? null
	);
	expect(coreState?.mapId).toBe('ruins-core');
	const coreSave = await page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
		SAVE_STORAGE_KEY
	);
	expect(coreSave?.flags?.collectedPickups).toEqual(
		expect.arrayContaining(['ruins-core-mail', 'ruins-core-draught'])
	);

	// Return through both ruin transitions with trusted keyboard input, then
	// continue from the Meadow cave arrival to a walkable village save point.
	const ruinsCoreReturnStaging = ruinsCoreReturnStagingPoint();
	const ruinsCoreReturnStagingActual = await journeyRoute('Ruins Core return stair staging', [
		{ x: 4_600, y: 3_200 },
		ruinsCoreReturnStaging
	]);
	const ruinsCoreReturnStagingResult = routeResults.get('Ruins Core return stair staging');
	expect(ruinsCoreReturnStagingResult).toBeDefined();
	if (!ruinsCoreReturnStagingResult) {
		throw new Error('Missing Ruins Core return stair staging route result');
	}
	expect(ruinsCoreReturnStagingResult.mapId).toBe('ruins-core');
	expect(ruinsCoreReturnStagingResult.invalidDiagnostics).toEqual([]);
	expect(
		ruinsCoreReturnStagingResult.diagnostics?.every(
			(diagnostic) => diagnostic.mapId === 'ruins-core' && diagnostic.blocked === false
		)
	).toBe(true);
	const ruinsCoreReturnTransition = ruinsCoreMap.transitions.find(
		({ id }) => id === 'core-to-threshold'
	);
	expect(ruinsCoreReturnTransition).toMatchObject({ x: 256, y: 3_200 });
	if (!ruinsCoreReturnTransition) {
		throw new Error('Missing Ruins Core return transition source');
	}
	expect(ruinsCoreReturnStagingActual.x - PLAYER_TRANSITION_REACH).toBeGreaterThan(
		ruinsCoreReturnTransition.x
	);
	await transitionWithTrustedKeyboard(
		page,
		'ArrowLeft',
		'ruins-core',
		{ x: 256, y: 3_200 },
		'ruins-threshold',
		{
			x: 5_504,
			y: 3_200
		}
	);
	await journeyRoute('Ruins Threshold return stair staging', [
		{ x: 5_504, y: 3_200 },
		{ x: 288, y: 3_200 }
	]);
	await transitionWithTrustedKeyboard(
		page,
		'ArrowLeft',
		'ruins-threshold',
		{ x: 256, y: 3_200 },
		'meadow-entry',
		{
			x: 5_760,
			y: 1_868
		}
	);
	const meadowReturnStart = await currentHudPlayerPoint(page);
	expect(meadowReturnStart).toEqual({ x: 5_760, y: 1_868 });
	const meadowForestHandoff = await journeyRoute(
		'Meadow continuation after ruins: forest handoff',
		[
			meadowReturnStart,
			{ x: 5_600, y: 1_868 },
			{ x: 5_600, y: 2_100 },
			{ x: 5_600, y: 3_200 },
			{ x: 5_600, y: 3_808 }
		]
	);

	// The west bank is a continuous authored blocker. Cross above its expanded
	// top edge first, then descend on the proven west side instead of asking the
	// live collision solver to walk through the bank. This route starts at the
	// actual settled handoff from the preceding route and returns its actual
	// endpoint for the continuation below.
	const postRuinsBankRoute = postRuinsWildwoodBankRoutePoints(meadowForestHandoff);
	await page.locator('canvas').click();
	const postRuinsBankResult = await runBrowserRoute(
		page,
		postRuinsBankRoute,
		AXIS_SETTLE_TOLERANCE
	);
	recordRoute('Meadow continuation after ruins: Wildwood bank detour', postRuinsBankResult);
	assertPostRuinsWildwoodBankRouteContract(
		postRuinsBankRoute,
		postRuinsBankResult,
		'Meadow continuation after ruins: Wildwood bank detour'
	);
	if (!postRuinsBankResult.position) {
		throw new Error(
			`Missing final point for Meadow continuation after ruins: Wildwood bank detour: ${describeBrowserRouteResult(postRuinsBankResult, postRuinsBankResult.token)}`
		);
	}
	const meadowBankHandoff = postRuinsBankResult.position;
	const lowerRiverEastVerticalRoute =
		postRuinsLowerRiverEastVerticalHandoffRoutePoints(meadowBankHandoff);
	await page.locator('canvas').click();
	const lowerRiverEastVerticalResult = await runBrowserRoute(
		page,
		lowerRiverEastVerticalRoute,
		AXIS_SETTLE_TOLERANCE
	);
	recordRoute(
		'Meadow continuation after ruins: lower-river east vertical staging',
		lowerRiverEastVerticalResult
	);
	assertPostRuinsLowerRiverEastHandoffPhaseContract(
		lowerRiverEastVerticalRoute,
		lowerRiverEastVerticalResult,
		'vertical',
		'Meadow continuation after ruins: lower-river east vertical staging'
	);
	if (!lowerRiverEastVerticalResult.position) {
		throw new Error(
			`Missing final point for Meadow continuation after ruins: lower-river east vertical staging: ${describeBrowserRouteResult(lowerRiverEastVerticalResult, lowerRiverEastVerticalResult.token)}`
		);
	}
	const lowerRiverEastStaging = lowerRiverEastVerticalResult.position;
	const lowerRiverEastHorizontalRoute =
		postRuinsLowerRiverEastHorizontalHandoffRoutePoints(lowerRiverEastStaging);
	await page.locator('canvas').click();
	const lowerRiverEastHorizontalResult = await runBrowserRoute(
		page,
		lowerRiverEastHorizontalRoute,
		AXIS_SETTLE_TOLERANCE
	);
	recordRoute(
		'Meadow continuation after ruins: lower-river east horizontal handoff',
		lowerRiverEastHorizontalResult
	);
	assertPostRuinsLowerRiverEastHandoffPhaseContract(
		lowerRiverEastHorizontalRoute,
		lowerRiverEastHorizontalResult,
		'horizontal',
		'Meadow continuation after ruins: lower-river east horizontal handoff'
	);
	if (!lowerRiverEastHorizontalResult.position) {
		throw new Error(
			`Missing final point for Meadow continuation after ruins: lower-river east horizontal handoff: ${describeBrowserRouteResult(lowerRiverEastHorizontalResult, lowerRiverEastHorizontalResult.token)}`
		);
	}
	const meadowLowerRiverHandoff = lowerRiverEastHorizontalResult.position;
	const postRuinsLowerRiverRoute = postRuinsLowerRiverCrossingRoutePoints(meadowLowerRiverHandoff);
	await page.locator('canvas').click();
	const postRuinsLowerRiverResult = await runBrowserRoute(
		page,
		postRuinsLowerRiverRoute,
		AXIS_SETTLE_TOLERANCE
	);
	recordRoute('Meadow continuation after ruins: lower-river crossing', postRuinsLowerRiverResult);
	assertPostRuinsLowerRiverCrossingRouteContract(
		postRuinsLowerRiverRoute,
		postRuinsLowerRiverResult,
		'Meadow continuation after ruins: lower-river crossing'
	);
	if (!postRuinsLowerRiverResult.position) {
		throw new Error(
			`Missing final point for Meadow continuation after ruins: lower-river crossing: ${describeBrowserRouteResult(postRuinsLowerRiverResult, postRuinsLowerRiverResult.token)}`
		);
	}
	const lowerRiverSouthHandoff = postRuinsLowerRiverResult.position;
	const saveStagingPoint = await journeyRoute('Meadow continuation after ruins', [
		lowerRiverSouthHandoff,
		{ x: 320, y: 4_688 },
		{ x: 1_152, y: 4_800 }
	]);
	expect(await currentHudPlayerPoint(page)).toEqual(saveStagingPoint);

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Save Game' }).click();
	await expect(fieldStatus(page)).toContainText('Saved');
	const persisted = await page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
		SAVE_STORAGE_KEY
	);
	expect(persisted?.mapId).toBe('meadow-entry');
	const persistedPlayer = persisted?.player as
		| {
				level?: unknown;
				xp?: unknown;
				hp?: unknown;
				attack?: unknown;
				x?: unknown;
				y?: unknown;
				facing?: unknown;
		  }
		| undefined;
	expect(persistedPlayer).toEqual(
		expect.objectContaining({
			x: saveStagingPoint.x,
			y: saveStagingPoint.y
		})
	);
	expect(Number.isFinite(persistedPlayer?.x)).toBe(true);
	expect(Number.isFinite(persistedPlayer?.y)).toBe(true);
	expect(Number.isInteger(persistedPlayer?.level)).toBe(true);
	expect((persistedPlayer?.level as number) >= 1).toBe(true);
	expect(Number.isFinite(persistedPlayer?.xp)).toBe(true);
	expect((persistedPlayer?.xp as number) >= 0).toBe(true);
	expect(Number.isFinite(persistedPlayer?.hp)).toBe(true);
	expect((persistedPlayer?.hp as number) >= 0).toBe(true);
	expect(Number.isFinite(persistedPlayer?.attack)).toBe(true);
	expect((persistedPlayer?.attack as number) > 0).toBe(true);
	expect(persistedPlayer?.facing).toMatch(/^(up|down|left|right)$/);
	expect(persisted?.flags?.clearedEncounters).toEqual(
		expect.arrayContaining(['threshold-slime-west', 'threshold-slime-east'])
	);
	expect(persisted?.flags?.collectedPickups).toEqual(
		expect.arrayContaining([
			'crossroads-cache',
			'silverpine-offering-cache',
			'wildwood-grove-cache'
		])
	);
	expect(persisted?.flags?.collectedPickups).toEqual(
		expect.arrayContaining(['ruins-core-mail', 'ruins-core-draught'])
	);
	expect(persisted?.seenDiscoveries).toEqual(
		expect.arrayContaining(['crossroads-waystone-sign', 'ferry-shrine-lore'])
	);

	await page.reload();
	await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 });
	await page.waitForFunction(
		() => {
			const state = (window as GlieseProbeWindow).__glieseLastHudState;
			return state?.ready === true && state.mapId === 'meadow-entry';
		},
		undefined,
		{ timeout: 30_000 }
	);
	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
	await waitForExactHudPosition(page, 'meadow-entry', saveStagingPoint);
	const resumedPoint = await currentHudPlayerPoint(page, 'meadow-entry');
	expect(resumedPoint).toEqual(saveStagingPoint);
	await journeyRoute('Post-reload Meadow continuation', [
		resumedPoint,
		{ x: resumedPoint.x + 128, y: resumedPoint.y }
	]);
	expect((await currentHudPlayerPoint(page)).x).toBeGreaterThan(resumedPoint.x);

	console.log(
		`TASK6_ROUTE_EVIDENCE ${JSON.stringify(
			routeEvidence.map(
				({
					label,
					token,
					status,
					mapId,
					position,
					lastDiagnostic,
					diagnosticCount,
					diagnosticMapIds,
					invalidDiagnostics
				}) => ({
					label,
					token,
					status,
					mapId,
					position,
					blocked: lastDiagnostic?.blocked ?? null,
					resolvedPosition: lastDiagnostic?.resolvedPosition ?? null,
					diagnosticCount,
					diagnosticMapIds,
					invalidDiagnostics
				})
			)
		)}`
	);
});

test('entry map boots with no game console errors', async ({ page }) => {
	// Collect console errors emitted during boot. Phaser logs missing-texture and
	// asset-load failures to console.error, so this catches a broken/missing asset
	// from the entry-map enrichment (terrain tiles, decor packs, etc.).
	const errors: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') errors.push(msg.text());
	});

	await page.goto('/');
	// Canvas visible + Menu button visible is the suite's canonical "game ready"
	// signal: the HUD only renders after Phaser boots WorldScene on the entry map.
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
	// Let async asset loads and runtime frame registration settle before asserting.
	await page.waitForTimeout(1_500);

	// Filter benign, game-unrelated noise (e.g. favicon / generic resource 404s and
	// devtools chatter) so the assertion stays meaningful. We deliberately do NOT
	// filter anything that mentions a game asset path, Phaser, texture, or frame
	// failure — a real missing-texture from the enrichment must still fail here.
	const benign = /favicon|\.ico\b/i;
	const gameErrors = errors.filter((text) => !benign.test(text));

	expect(gameErrors).toEqual([]);
});

test('game route boots', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	const viewport = page.viewportSize();
	const locationPanel = page.getByTestId('hud-location-panel');
	const minimap = page.getByTestId('hud-minimap');
	const partyPanel = page.getByTestId('hud-party-panel');
	const questTracker = page.getByTestId('hud-side-panel');
	await expect(locationPanel).toBeVisible();
	await expect(minimap).toBeVisible();
	await expect(partyPanel).toBeVisible();
	await expect(questTracker).toBeVisible();

	const locationBox = await locationPanel.boundingBox();
	const minimapBox = await minimap.boundingBox();
	const partyBox = await partyPanel.boundingBox();
	const questBox = await questTracker.boundingBox();
	expect(locationBox?.x).toBeLessThan(40);
	expect(locationBox?.y).toBeLessThan(40);
	expect(minimapBox?.y).toBeLessThan(40);
	expect((minimapBox?.x ?? 0) + (minimapBox?.width ?? 0)).toBeGreaterThan(
		(viewport?.width ?? 0) - 40
	);
	expect(partyBox?.x).toBeLessThan(40);
	expect((partyBox?.y ?? 0) + (partyBox?.height ?? 0)).toBeGreaterThan(
		(viewport?.height ?? 0) - 40
	);
	expect((questBox?.x ?? 0) + (questBox?.width ?? 0)).toBeGreaterThan((viewport?.width ?? 0) - 40);
	expect((questBox?.y ?? 0) + (questBox?.height ?? 0)).toBeGreaterThan(
		(viewport?.height ?? 0) - 40
	);

	await page.getByRole('button', { name: 'Menu' }).click();
	await expect(commandBox(page)).toBeVisible();
	const commandBounds = await commandBox(page).boundingBox();
	expect((commandBounds?.y ?? 0) + (commandBounds?.height ?? 0)).toBeLessThan(
		(viewport?.height ?? 0) * 0.78
	);
});

test('encounter opens battle scene and returns through battle summary', async ({ page }) => {
	const save = createSaveFixture({
		player: {
			level: 1,
			xp: 0,
			hp: 200,
			attack: 50,
			x: 4_960,
			y: 960,
			facing: 'down'
		}
	});

	await injectSave(page, save);
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();

	const battleSummary = page.getByRole('dialog', { name: /battle summary/i });
	await expect(battleSummary).toBeVisible({ timeout: 30_000 });
	await expect(battleSummary.getByText(/Enemies defeated: (?:[1-9]|10)/i)).toBeVisible();
	await battleSummary.getByRole('button', { name: /continue/i }).click();
	await expect(battleSummary).toHaveCount(0);
	await expect(fieldStatus(page)).toContainText('Returned from battle');
});

test('mobile HUD stacks without overlapping controls', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();

	const viewport = page.viewportSize();
	const menuButton = page.getByRole('button', { name: 'Menu' });
	const locationPanel = page.getByTestId('hud-location-panel');
	const minimap = page.getByTestId('hud-minimap');
	const partyPanel = page.getByTestId('hud-party-panel');
	const questTracker = page.getByTestId('hud-side-panel');
	const fieldStatusMessage = fieldStatus(page);
	await expect(menuButton).toBeVisible();
	await expect(locationPanel).toBeVisible();
	await expect(minimap).toBeVisible();
	await expect(partyPanel).toBeVisible();
	await expect(questTracker).toBeVisible();
	await expect(fieldStatusMessage).toBeVisible();

	const menuBox = await menuButton.boundingBox();
	const locationBox = await locationPanel.boundingBox();
	const minimapBox = await minimap.boundingBox();
	const partyBox = await partyPanel.boundingBox();
	const questBox = await questTracker.boundingBox();
	const fieldStatusBox = await fieldStatusMessage.boundingBox();
	expect(menuBox).not.toBeNull();
	expect(locationBox).not.toBeNull();
	expect(minimapBox).not.toBeNull();
	expect(partyBox).not.toBeNull();
	expect(questBox).not.toBeNull();
	expect(fieldStatusBox).not.toBeNull();
	const locationRight = locationBox!.x + locationBox!.width;
	const minimapBottom = minimapBox!.y + minimapBox!.height;
	const partyTop = partyBox!.y;
	const questBottom = questBox!.y + questBox!.height;
	const questRight = questBox!.x + questBox!.width;
	const fieldStatusRight = fieldStatusBox!.x + fieldStatusBox!.width;
	expect(locationRight).toBeLessThan(minimapBox!.x - 8);
	expect(menuBox!.y).toBeGreaterThan(minimapBottom + 8);
	expect(questBottom).toBeLessThan(partyTop - 8);
	expect(questRight).toBeLessThanOrEqual((viewport?.width ?? 0) - 8);
	expect(fieldStatusBox!.width).toBeLessThan((viewport?.width ?? 0) * 0.75);
	expect(fieldStatusRight).toBeLessThanOrEqual((viewport?.width ?? 0) - 8);
});

test('inventory overlay opens from the menu', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Inventory' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	const inventorySlotGrid = inventoryDialog.getByTestId('inventory-slot-grid');
	await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
	await expect(inventoryDialog.getByTestId('inventory-slot')).toHaveCount(24);
	await expect
		.soft(
			await inventorySlotGrid.evaluate(
				(element) => getComputedStyle(element).gridTemplateColumns.split(' ').length
			)
		)
		.toBe(6);
	await expect
		.soft(
			await inventorySlotGrid.evaluate(
				(element) => getComputedStyle(element).gridTemplateRows.split(' ').length
			)
		)
		.toBe(4);
	await expect(inventoryDialog.getByLabel('Field Potion')).toBeVisible();
	const fieldPotionSlot = inventoryDialog.getByLabel('Field Potion');
	await expect(fieldPotionSlot.getByRole('img', { name: 'Field Potion' })).toBeVisible();
	await expect(fieldPotionSlot.getByText('Restores 8 HP.')).toHaveCount(0);
	await expect(fieldPotionSlot.getByRole('button', { name: 'Use' })).toHaveCount(0);

	await page.getByRole('tab', { name: 'Equipment' }).click();
	await expect(inventoryDialog.getByTestId('inventory-slot')).toHaveCount(24);
	const trainingSwordSlot = inventoryDialog.getByLabel('Training Sword');
	await expect(trainingSwordSlot).toBeVisible();
	await expect(trainingSwordSlot.getByRole('img', { name: 'Training Sword' })).toBeVisible();
	await expect(trainingSwordSlot.getByRole('button', { name: /Equip|Equipped/ })).toHaveCount(0);
	await expect(trainingSwordSlot.getByText('Equipped')).toBeVisible();
});

test('area map opens from the menu and closes back to field HUD', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Map' }).click();

	const mapDialog = page.getByRole('dialog', { name: /map$/i });
	await expect(mapDialog).toBeVisible();
	await expect(mapDialog.getByTestId('area-map-svg')).toBeVisible();
	await expect(mapDialog.getByTestId('area-map-player')).toBeVisible();

	await mapDialog.getByRole('button', { name: 'Close' }).click();
	await expect(mapDialog).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
	await expect(fieldStatus(page)).toBeVisible();
});

test('language preference shows Japanese chrome and keeps Japanese selected', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	let languageSelect = page.getByLabel('Language');
	await expect(languageSelect).toBeVisible();
	await languageSelect.selectOption('ja');
	languageSelect = page.getByLabel('言語');
	await expect(languageSelect).toHaveValue('ja');
	await page.getByRole('button', { name: '閉じる' }).click();
	await expect(languageSelect).toHaveCount(0);

	await page.getByRole('button', { name: 'メニュー' }).click();
	await commandBox(page, 'コマンド').getByRole('button', { name: '持ち物' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: '持ち物' });
	await expect(inventoryDialog).toBeVisible();
	await expect(inventoryDialog.getByRole('heading', { name: '持ち物' })).toBeVisible();
	await expect(inventoryDialog.getByRole('tab', { name: '消耗品' })).toBeVisible();
	await inventoryDialog.getByRole('button', { name: '閉じる' }).click();

	await page.getByRole('button', { name: 'メニュー' }).click();
	await expect(page.getByLabel('言語')).toHaveValue('ja');
});

test('full hp potions explain why they cannot be consumed', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Inventory' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	const fieldPotionSlot = inventoryDialog.getByLabel('Field Potion');
	await expect(fieldPotionSlot).toBeVisible();
	await expect(fieldPotionSlot.getByRole('button', { name: 'Use' })).toHaveCount(0);
	await fieldPotionSlot.hover();
	await expect(page.getByRole('tooltip')).toContainText('Restores 8 HP.');
	await fieldPotionSlot.dblclick();
	await inventoryDialog.getByRole('button', { name: 'Close' }).click();
	await page.getByRole('button', { name: 'Menu' }).click();
	await expect(fieldStatus(page)).toContainText('HP already full');
});

test('double-clicking unequipped equipment equips it from inventory', async ({ page }) => {
	const save = createSaveFixture({
		inventory: {
			stacks: [{ itemId: 'field-potion', quantity: 1 }],
			equipment: ['training-sword', 'iron-cap']
		}
	});

	await injectSave(page, save);
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Inventory' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	await page.getByRole('tab', { name: 'Equipment' }).click();
	const ironCapSlot = inventoryDialog.getByLabel('Iron Cap');
	await expect(ironCapSlot.getByRole('img', { name: 'Iron Cap' })).toBeVisible();
	await expect(ironCapSlot.getByText('head')).toBeVisible();
	await ironCapSlot.dblclick();
	await expect(ironCapSlot.getByText('Equipped')).toBeVisible();
});

test('shop overlay opens near a merchant and supports buying and selling', async ({ page }) => {
	const save = createSaveFixture({
		mapId: 'item-shop',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 416, y: 360, facing: 'up' }
	});

	await page.addInitScript(
		(payload: SaveInitPayload) => {
			const probeWindow = window as GlieseProbeWindow;
			probeWindow.__glieseLastHudState = undefined;
			window.addEventListener('gliese:hud-state', (event) => {
				probeWindow.__glieseLastHudState = (event as CustomEvent<HudStateSnapshot>).detail;
			});
			window.localStorage.setItem(payload.key, payload.encoded);
		},
		{ encoded: JSON.stringify(save), key: SAVE_STORAGE_KEY }
	);
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;

		return state?.nearbyShop?.shopId === 'miras-item-shop' || state?.status?.startsWith('Mira:');
	});
	await page.getByRole('button', { name: 'Menu' }).click();
	const shopButton = commandBox(page).getByRole('button', { name: 'Shop' });
	await expect(shopButton).toBeEnabled();
	await shopButton.click();

	await expect(page.getByRole('heading', { name: "Mira's Item Shop" })).toBeVisible();
	await expect(page.getByText('Coins: 30')).toBeVisible();
	const buyGrid = page.getByTestId('shop-buy-grid');
	await expect
		.soft(
			await buyGrid.evaluate(
				(element) => getComputedStyle(element).gridTemplateColumns.split(' ').length
			)
		)
		.toBe(6);
	const fieldPotionBuyTile = buyGrid.getByLabel('Field Potion', { exact: true });
	await expect(fieldPotionBuyTile.getByRole('img', { name: 'Field Potion' })).toBeVisible();
	await expect(fieldPotionBuyTile.getByText('Restores 8 HP.')).toHaveCount(0);
	await expect(fieldPotionBuyTile.getByRole('button', { name: 'Buy' })).toHaveCount(0);
	await fieldPotionBuyTile.hover();
	await expect(page.getByRole('tooltip')).toContainText('Restores 8 HP.');

	await fieldPotionBuyTile.dblclick();
	await expect(page.getByText('Coins: 20')).toBeVisible();

	await page.getByRole('tab', { name: 'Sell' }).click();
	const sellGrid = page.getByTestId('shop-sell-grid');
	await expect
		.soft(
			await sellGrid.evaluate(
				(element) => getComputedStyle(element).gridTemplateColumns.split(' ').length
			)
		)
		.toBe(6);
	const fieldPotionSellTile = sellGrid.getByLabel('Field Potion', { exact: true });
	await expect(fieldPotionSellTile.getByRole('img', { name: 'Field Potion' })).toBeVisible();
	await expect(fieldPotionSellTile.getByText('Restores 8 HP.')).toHaveCount(0);
	await expect(fieldPotionSellTile.getByRole('button', { name: 'Sell' })).toHaveCount(0);
	await fieldPotionSellTile.hover();
	await expect(page.getByRole('tooltip')).toContainText('Restores 8 HP.');
	await fieldPotionSellTile.dblclick();
	await expect(page.getByText('Coins: 25')).toBeVisible();
});

test('interact key shop purchase appears in inventory', async ({ page }) => {
	const save = createSaveFixture({
		mapId: 'item-shop',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 416, y: 360, facing: 'up' }
	});

	await page.addInitScript(
		(payload: SaveInitPayload) => {
			const probeWindow = window as GlieseProbeWindow;
			probeWindow.__glieseLastHudState = undefined;
			window.addEventListener('gliese:hud-state', (event) => {
				probeWindow.__glieseLastHudState = (event as CustomEvent<HudStateSnapshot>).detail;
			});
			window.localStorage.setItem(payload.key, payload.encoded);
		},
		{ encoded: JSON.stringify(save), key: SAVE_STORAGE_KEY }
	);
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;

		return state?.nearbyShop?.shopId === 'miras-item-shop' || state?.status?.startsWith('Mira:');
	});

	await page.locator('canvas').click();
	await page.keyboard.press('e', { delay: 50 });

	const miraDialog = page.getByRole('dialog', { name: 'Mira' });
	await expect(miraDialog).toBeVisible();
	await expect(miraDialog.getByRole('button', { name: 'Next' })).toHaveCount(0);
	await miraDialog.getByRole('button', { name: 'Shop' }).click();

	const shopDialog = page.getByRole('dialog', { name: "Mira's Item Shop" });
	await expect(shopDialog).toBeVisible();
	await shopDialog
		.getByTestId('shop-buy-grid')
		.getByLabel('Field Potion', { exact: true })
		.dblclick();
	await expect(shopDialog.getByText('Coins: 20')).toBeVisible();
	await shopDialog.getByRole('button', { name: 'Close' }).click();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Inventory' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	const fieldPotionSlot = inventoryDialog.getByLabel('Field Potion');
	await expect(inventoryDialog.getByTestId('inventory-slot')).toHaveCount(24);
	await expect(fieldPotionSlot).toBeVisible();
	await expect(fieldPotionSlot.getByText('x2')).toBeVisible();
});

for (const interiorCase of INTERIOR_GRAYBOX_CASES) {
	test(`HPA-586 interior graybox: ${interiorCase.mapId}`, async ({ page }) => {
		test.setTimeout(180_000);
		await installRuntimeProbes(page, { captureFacing: true });
		await injectSave(
			page,
			createSaveFixture({
				mapId: 'meadow-entry',
				player: {
					level: 1,
					xp: 0,
					hp: 20,
					attack: 3,
					x: interiorCase.returnArrival.x,
					y: interiorCase.returnArrival.y,
					facing: 'up'
				}
			})
		);
		await page.goto('/?movementDiagnostics=on');
		await expect(page.locator('canvas')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
		await page.getByRole('button', { name: 'Menu' }).click();
		await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
		await waitForHudPosition(page, 'meadow-entry', interiorCase.returnArrival);
		await enterInteriorWithTrustedKeyboard(page, interiorCase);

		let currentPoint = interiorCase.spawn;
		for (const step of interiorCase.steps) {
			if (currentPoint.x !== step.point.x || currentPoint.y !== step.point.y) {
				const routePoints = interiorRoutePoints(currentPoint, step.point);
				currentPoint = await moveRoute(
					page,
					routePoints,
					step.interaction ? NPC_APPROACH_SETTLE_TOLERANCE : INTERIOR_ROUTE_SETTLE_TOLERANCE
				);
			}
			await assertInteriorCheckpoint(page, interiorCase, step.point);
			if (step.interaction) {
				await interactWithInteriorNpc(page, step.interaction);
			}
			if (interiorCase.persistAfterStep === step.label) {
				currentPoint = await saveGuildCheckpointAndReload(page, step.point);
			}
		}

		expect(Math.abs(currentPoint.x - interiorCase.spawn.x)).toBeLessThanOrEqual(
			AXIS_REACH_TOLERANCE
		);
		expect(Math.abs(currentPoint.y - interiorCase.spawn.y)).toBeLessThanOrEqual(
			AXIS_REACH_TOLERANCE
		);
		await exitInteriorWithTrustedKeyboard(page, interiorCase);
	});
}

test('quest log shows main quest and accepts Guild side quests', async ({ page }) => {
	const save = createSaveFixture({
		mapId: 'guild-hall',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 800, y: 184, facing: 'up' }
	});

	await page.addInitScript(
		(payload: SaveInitPayload) => {
			const probeWindow = window as GlieseProbeWindow;
			probeWindow.__glieseLastHudState = undefined;
			window.addEventListener('gliese:hud-state', (event) => {
				probeWindow.__glieseLastHudState = (event as CustomEvent<HudStateSnapshot>).detail;
			});
			window.localStorage.setItem(payload.key, payload.encoded);
		},
		{ encoded: JSON.stringify(save), key: SAVE_STORAGE_KEY }
	);
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Resume Save' }).click();
	await expect(page.getByText('Talk to the Guild Master')).toBeVisible();
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;
		return state?.status?.includes('Guild Master');
	});

	await page.locator('canvas').click();
	await page.keyboard.press('e', { delay: 50 });
	const guildMasterDialog = page.getByRole('dialog', { name: 'Guild Master Arlen' });
	await expect(guildMasterDialog).toBeVisible({ timeout: 10_000 });
	await expect(guildMasterDialog.getByText(/eastern ruins are stirring/i)).toBeVisible();
	await guildMasterDialog.getByRole('button', { name: 'Next' }).click();
	await guildMasterDialog.getByRole('button', { name: 'Next' }).click();
	await guildMasterDialog.getByRole('button', { name: 'Quest' }).click();
	await guildMasterDialog.getByRole('button', { name: 'Thin Village Slimes' }).click();
	await expect(guildMasterDialog.getByText(/Defeat slimes near the village/i)).toBeVisible();
	await guildMasterDialog.getByRole('button', { name: 'Accept' }).click();
	await expect(guildMasterDialog).toHaveCount(0);

	await page.getByRole('button', { name: 'Menu' }).click();
	await expect(fieldStatus(page)).toContainText(/^Quest accepted\.?$/);
	await expect(page.getByRole('button', { name: 'Guild Quests' })).toHaveCount(0);
	await commandBox(page).getByRole('button', { name: 'Quests', exact: true }).click();

	const questDialog = page.getByRole('dialog', { name: 'Quest Log' });
	await expect(questDialog).toBeVisible();
	await expect(questDialog.getByText('Investigate the Ruins')).toBeVisible();
	await expect(questDialog.getByText('Defeat the ruins warden in the ruins core.')).toBeVisible();
	await expect(questDialog.getByText('Thin Village Slimes')).toBeVisible();
	await expect(questDialog.getByText('Village slimes defeated: 0 / 3')).toBeVisible();
});
