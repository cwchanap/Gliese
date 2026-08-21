import { expect, test, type Page } from '@playwright/test';
import { assertMeadowEntryPaintedV2CameraBoundsCovered } from '../../src/lib/game/content/backgrounds/meadow-entry-painted-v2-camera-envelope';
import {
	MEADOW_ENTRY_PAINTED_V2_APPROVED_RUNTIME_BACKGROUNDS,
	MEADOW_ENTRY_PAINTED_V2_RUNTIME_VISUAL_OWNERS
} from '../../src/lib/game/content/backgrounds/meadow-entry-painted-v2.generated';
import { meadowEntryMap, ruinsCoreMap } from '../../src/lib/game/content/maps';
import {
	MEADOW_ENTRY_V2_CROSSINGS,
	MEADOW_ENTRY_V2_RIVER_SEGMENTS
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

async function installRuntimeProbes(page: Page, options: { captureFacing?: boolean } = {}) {
	// WorldScene keeps its live facing private and the HUD intentionally omits it.
	// Instrument only the browser-served test chunk so the E2E can observe the
	// scene-create transition payload without adding a production diagnostic hook
	// or mutating any game state. The replacement is limited to the existing
	// authored `create()` assignment and records the value after it is applied.
	if (options.captureFacing) {
		await page.route('**/assets/WorldScene-*.js', async (route) => {
			const response = await route.fetch();
			const body = await response.text();
			// Vite's chunk minifier renames local variables between builds. Match the
			// authored assignments by their stable property names instead of coupling
			// the probe to one particular minified variable spelling.
			const facingMatch = body.match(/this\.facing=[^;]*?spawnDirection/);
			const cameraMatch = body.match(
				/this\.cameras\.main\.startFollow\(this\.player,[^;]*?cameraFollowLerp\),/
			);
			if (!facingMatch) {
				throw new Error('WorldScene facing probe marker was not found in the served test chunk');
			}
			if (!cameraMatch) {
				throw new Error('WorldScene camera probe marker was not found in the served test chunk');
			}
			const facingBody = body.replace(
				facingMatch[0],
				`${facingMatch[0]},globalThis.__glieseLastPlayerFacing=this.facing`
			);
			await route.fulfill({
				response,
				body: facingBody.replace(
					cameraMatch[0],
					`${cameraMatch[0]}globalThis.__glieseActiveSceneCamera=this.cameras.main,`
				)
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
			diagnosticAxes: Axis[];
		};
		let routeState: InternalRouteState | null = null;
		let keyLeaseFrame: number | null = null;

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
			routeState.status = 'done';
			cancelKeyLease();
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
			if (!axis || !target || !routeState.position) return;
			routeState.lastDiagnostic = diagnostic;
			routeState.diagnostics.push({
				mapId: diagnostic.mapId,
				previousPosition: { ...diagnostic.previousPosition },
				requestedPosition: { ...diagnostic.requestedPosition },
				resolvedPosition: { ...diagnostic.resolvedPosition },
				blocked: diagnostic.blocked
			});
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
			}
		};
		probeWindow.__glieseRouteRunner = routeRunner;
		window.addEventListener('pagehide', () => {
			cancelKeyLease();
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
	readonly finalClearance: 'top' | 'left';
};

const GUILD_HALL_RECORDS_AISLE_SPEC: GuildHallAisleSpec = {
	wallId: 'guild-hall-records-spine-south',
	roomKey: 'recordsHall',
	handoffY: 'safe-above',
	finalClearance: 'top'
};

const GUILD_HALL_COMMON_AISLE_SPEC: GuildHallAisleSpec = {
	wallId: 'guild-hall-common-spine-south',
	roomKey: 'commonHall',
	handoffY: 'safe-above',
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

function guildHallAisleSafeAboveY(wall: { y: number }): number {
	const expandedTop = wall.y - PLAYER_COLLISION_RADIUS;
	return expandedTop - 2 * AXIS_REACH_TOLERANCE - 1;
}

function guildHallAisleHandoffPoint(targetPoint: Point, spec: GuildHallAisleSpec): Point {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const wall = guildHallAisleWall(spec);
	const expandedLeft = wall.x - PLAYER_COLLISION_RADIUS;
	const handoffX = expandedLeft - AXIS_REACH_TOLERANCE - GUILD_HALL_ROUTE_ENDPOINT_RESIDUE - 1;
	const handoffY = spec.handoffY === 'safe-above' ? guildHallAisleSafeAboveY(wall) : targetPoint.y;
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
	const points = [
		currentPoint,
		{ x: currentPoint.x, y: safeY },
		{ x: conservativeX, y: safeY },
		{ x: conservativeX, y: targetPoint.y }
	];
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
	expect(points.at(-1)).toEqual({ x: conservativeX, y: targetPoint.y });
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
	const safeY = guildHallAisleSafeAboveY(wall);
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

function guildHallQuartermasterDividerOpenY(): number {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const trainingQuartermasterDivider = layout.walls.find(
		({ id }) => id === 'guild-hall-training-quartermaster-divider'
	);
	const counter = layout.propCollisions.quartermasterCounter;
	if (!trainingQuartermasterDivider) {
		throw new Error('Guild Hall training-quartermaster divider source is missing');
	}
	const expandedDividerBottom =
		trainingQuartermasterDivider.y + trainingQuartermasterDivider.height + PLAYER_COLLISION_RADIUS;
	const expandedCounterTop = counter.y - PLAYER_COLLISION_RADIUS;
	const minimumOpenY = expandedDividerBottom + AXIS_REACH_TOLERANCE + 1;
	const maximumOpenY = expandedCounterTop - AXIS_REACH_TOLERANCE - 1;
	// The authored open band is the only row range whose full route-residue box
	// clears both the divider below and the counter above. Keep the midpoint
	// source-derived so a later geometry change cannot turn this into a nominal
	// waypoint through either expanded collision.
	expect({ minimumOpenY, maximumOpenY }).toEqual({ minimumOpenY: 511, maximumOpenY: 513 });
	const openY = Math.floor((minimumOpenY + maximumOpenY) / 2);
	expect(openY - AXIS_REACH_TOLERANCE).toBeGreaterThan(expandedDividerBottom);
	expect(openY + AXIS_REACH_TOLERANCE).toBeLessThan(expandedCounterTop);
	const quartermasterToSpine = layout.doors.quartermasterToSpine;
	expect(openY).toBeGreaterThanOrEqual(quartermasterToSpine.y);
	return openY;
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
		const dividerOpenY = guildHallQuartermasterDividerOpenY();
		// The post-dialogue endpoint is a terminal point just below the expanded
		// divider. First pass through the authored open row; only that row has a
		// full ±18 envelope between the divider and counter, so the right-clearance
		// crossing cannot re-enter the divider before clearing the counter.
		const doorwayTransitY = guildHallQuartermasterDoorwayTransitY();
		const doorwayRightClearanceX = guildHallQuartermasterDoorwayRightClearanceX();
		return [
			currentPoint,
			{ x: currentPoint.x, y: dividerOpenY },
			{ x: rightClearanceX, y: dividerOpenY },
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
		return [
			currentPoint,
			{ x: currentPoint.x, y: doorwayTransitY },
			{ x: doorwayRightClearanceX, y: doorwayTransitY },
			{ x: doorwayRightClearanceX, y: belowCounterY },
			{ x: rightClearanceX, y: belowCounterY },
			stagingPoint
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
	const safeY = guildHallAisleSafeAboveY(wall);
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
			expect(routeDiagnostic.mapId).toBe('guild-hall');
			expect(routeDiagnostic.blocked).toBe(false);
			const axis = diagnosticAxes[index]!;
			expect(expectedAxes).toContain(axis);
			const targetValue = checkpoint[axis];
			const previousValue = routeDiagnostic.previousPosition[axis];
			const resolvedValue = routeDiagnostic.resolvedPosition[axis];
			const direction = Math.sign(targetValue - previousValue);
			expect(direction).not.toBe(0);
			expect(Math.sign(resolvedValue - previousValue)).toBe(direction);
			const distanceDecreased =
				Math.abs(targetValue - resolvedValue) < Math.abs(targetValue - previousValue);
			const crossedTarget =
				direction > 0 ? resolvedValue >= targetValue : resolvedValue <= targetValue;
			const landedWithinReach = Math.abs(targetValue - resolvedValue) <= AXIS_REACH_TOLERANCE;
			// Mirrors the characterized route-runner contract: a progressing diagnostic
			// may reduce distance, or may cross the target and remain inside its existing
			// reach band when one frame steps past the authored coordinate.
			expect(distanceDecreased || (crossedTarget && landedWithinReach)).toBe(true);
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

	expect(points.at(-1)).toEqual(targetPoint);
	if (returning) {
		const dividerOpenY = guildHallQuartermasterDividerOpenY();
		const doorwayTransitY = guildHallQuartermasterDoorwayTransitY();
		const doorwayRightClearanceX = guildHallQuartermasterDoorwayRightClearanceX();
		const quartermasterToSpine = layout.doors.quartermasterToSpine;
		expect(points[1]?.x).toBe(points[0]?.x);
		expect(points[1]?.y).toBe(dividerOpenY);
		expect(points[2]?.x).toBe(rightClearanceX);
		expect(points[2]?.y).toBe(dividerOpenY);
		expect(points[3]?.x).toBe(rightClearanceX);
		expect(points[3]?.y).toBe(belowCounterY);
		expect(points[4]?.x).toBe(doorwayRightClearanceX);
		expect(points[4]?.y).toBe(belowCounterY);
		expect(points[5]?.x).toBe(doorwayRightClearanceX);
		expect(points[5]?.y).toBe(doorwayTransitY);
		expect(points[6]?.x).toBe(targetPoint.x);
		expect(points[6]?.y).toBe(doorwayTransitY);
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
		expect(points[1]!.y - AXIS_REACH_TOLERANCE).toBeGreaterThan(expandedDividerBottom);
		expect(points[2]!.y + AXIS_REACH_TOLERANCE).toBeLessThan(expandedCounterTop);
		// The first leg departs the live post-dialogue terminal point directly;
		// the actual segment is clear before the full residue envelope begins at
		// the source-derived open row.
		expect(
			routeSegmentIntersectsExpandedRect(
				points[0]!,
				points[1]!,
				trainingQuartermasterDivider,
				PLAYER_COLLISION_RADIUS
			)
		).toBe(false);
		expect(
			layoutRectContainsPoint(layout.rooms.quartermasterRoom, {
				x: points[2]!.x,
				y: points[2]!.y
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
		expect(points[1]?.x).toBe(points[0]?.x);
		expect(points[1]?.y).toBe(doorwayTransitY);
		expect(points[2]?.x).toBe(doorwayRightClearanceX);
		expect(points[2]?.y).toBe(doorwayTransitY);
		expect(points[3]?.x).toBe(doorwayRightClearanceX);
		expect(points[3]?.y).toBe(belowCounterY);
		expect(points[4]?.x).toBe(rightClearanceX);
		expect(points[4]?.y).toBe(belowCounterY);
		expect(points.at(-1)).toEqual(stagingPoint);
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

function itemShopStockroomOfficeDividerSafeX(): number {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
	const officeDividerSouth = layout.walls.find(({ id }) => id === 'item-shop-office-divider-south');
	if (!officeDividerSouth) {
		throw new Error('Item Shop office-divider-south source is missing');
	}
	const expandedLeft = officeDividerSouth.x - PLAYER_COLLISION_RADIUS;
	const safeX = expandedLeft - AXIS_REACH_TOLERANCE - INTERIOR_ROUTE_SETTLE_TOLERANCE - 1;
	// Reserve the unchanged route reach plus settle residue before the vertical
	// stockroom leg. The full possible x endpoint box therefore stays strictly
	// west of the office divider's expanded left edge.
	expect(safeX + AXIS_REACH_TOLERANCE + INTERIOR_ROUTE_SETTLE_TOLERANCE).toBeLessThan(expandedLeft);
	expect(
		layoutRectContainsPoint(layout.corridors.serviceCorridor, {
			x: safeX,
			y: itemShopDoorwayTransitY(
				'item-shop-stockroom-divider-north',
				'item-shop-stockroom-divider-south',
				'stockroom'
			)
		})
	).toBe(true);
	return safeX;
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

function itemShopDoorwayRoutePoints(
	currentPoint: Point,
	targetPoint: Point,
	doorway: 'stockroom' | 'office'
): Point[] {
	const layout = VILLAGE_INTERIOR_LAYOUTS['item-shop'];
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
	const points =
		doorway === 'stockroom'
			? [
					currentPoint,
					{ x: itemShopStockroomOfficeDividerSafeX(), y: currentPoint.y },
					{ x: itemShopStockroomOfficeDividerSafeX(), y: transitY },
					{ x: targetPoint.x, y: transitY },
					targetPoint
				]
			: [
					currentPoint,
					{ x: currentPoint.x, y: transitY },
					{ x: targetPoint.x, y: transitY },
					targetPoint
				];
	if (doorway === 'stockroom') {
		const safeX = itemShopStockroomOfficeDividerSafeX();
		expect(points[1]?.x).toBe(safeX);
		expect(points[2]?.x).toBe(safeX);
		expect(points[2]?.y).toBe(transitY);
		// The first horizontal leg clears the office divider while still in the
		// authored sales/service opening; only then does the vertical leg enter the
		// stockroom doorway row.
		const handoffOwner = layoutRectContainsPoint(layout.rooms.salesFloor, points[1]!)
			? 'salesFloor'
			: layoutRectContainsPoint(layout.corridors.serviceCorridor, points[1]!)
				? 'serviceCorridor'
				: null;
		// At y=300 the handoff is in the sales floor; when this shared topology
		// helper is reused by office-door at y=160, the same x belongs to the
		// authored service corridor. Pin that exact source ownership rather than
		// labeling both rows as sales floor.
		expect(handoffOwner).toBe(
			points[1]!.y >= layout.rooms.salesFloor.y ? 'salesFloor' : 'serviceCorridor'
		);
		expect(layoutRectContainsPoint(layout.corridors.serviceCorridor, points[2]!)).toBe(true);
	}
	assertTask6InteriorRouteEnvelope('item-shop', points, `Item Shop ${doorway} doorway`);
	return points;
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
		const direction = startPoint.y <= minimumOpenY ? 'ArrowDown' : 'ArrowUp';
		const before = await currentHudPlayerEvidence(page, 'item-shop');
		await page.locator('canvas').click();
		type DoorwayConvergenceOutcome = {
			status: 'range' | 'blocked' | 'overshot';
			diagnostic: PlayerMovementDiagnostic;
		};
		let outcome: DoorwayConvergenceOutcome | undefined;
		await page.keyboard.down(direction);
		try {
			const outcomeHandle = await page.waitForFunction(
				({ requestedMapId, lowerBound, upperBound, direction, minimumMovementAt }) => {
					const probeWindow = window as GlieseProbeWindow;
					const state = probeWindow.__glieseLastHudState;
					const diagnostic = probeWindow.__glieseLastMovementDiagnostic;
					const movementAt = probeWindow.__glieseLastMovementAt ?? 0;
					if (
						state?.mapId !== requestedMapId ||
						diagnostic?.mapId !== requestedMapId ||
						movementAt <= minimumMovementAt
					) {
						return false;
					}
					const y = diagnostic.resolvedPosition.y;
					const status = diagnostic.blocked
						? 'blocked'
						: y > lowerBound && y < upperBound
							? 'range'
							: direction === 'ArrowUp'
								? y <= lowerBound
									? 'overshot'
									: false
								: y >= upperBound
									? 'overshot'
									: false;
					return status ? { status, diagnostic } : false;
				},
				{
					requestedMapId: 'item-shop',
					lowerBound: minimumOpenY,
					upperBound: maximumOpenY,
					direction,
					minimumMovementAt: before.movementAt
				},
				{ timeout: 30_000 }
			);
			outcome = (await outcomeHandle.jsonValue()) as DoorwayConvergenceOutcome;
		} finally {
			await page.keyboard.up(direction);
		}
		if (outcome?.status !== 'range') {
			throw new Error(
				`Item Shop ${doorway} doorway did not enter its authored player-safe band: ${JSON.stringify(
					{
						startPoint,
						outcome,
						band: { minimumOpenY, maximumOpenY }
					}
				)}`
			);
		}
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

type GuildMasterPulseKey = 'ArrowDown' | 'ArrowLeft' | 'ArrowUp';

async function runGuildMasterSemanticPulse(
	page: Page,
	keys: readonly GuildMasterPulseKey[],
	beforeEvidence: MapAwarePlayerEvidence,
	label: string
): Promise<MapAwarePlayerEvidence> {
	const layout = VILLAGE_INTERIOR_LAYOUTS['guild-hall'];
	const desk = layout.propCollisions.guildMasterDesk;
	const beforePoint = beforeEvidence.selectedPoint;
	const heldKeys: GuildMasterPulseKey[] = [];
	const releasedKeys: GuildMasterPulseKey[] = [];
	await page.locator('canvas').click();
	try {
		for (const key of keys) {
			await page.keyboard.down(key);
			heldKeys.push(key);
		}
		// One real browser frame is the complete semantic pulse. No retry or
		// correction is permitted if that frame misses the source-derived band.
		await page.evaluate(
			() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
		);
	} finally {
		for (const key of [...heldKeys].reverse()) {
			await page.keyboard.up(key);
			releasedKeys.push(key);
		}
	}
	expect(releasedKeys, `${label} released every trusted key`).toEqual([...keys].reverse());
	await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
	const afterEvidence = await currentHudPlayerEvidence(page, 'guild-hall');
	const afterPoint = afterEvidence.selectedPoint;
	expect(afterEvidence.movementAt).toBeGreaterThan(beforeEvidence.movementAt);
	expect(afterEvidence.state?.mapId).toBe('guild-hall');
	expect(afterEvidence.diagnostic?.mapId).toBe('guild-hall');
	expect(
		afterEvidence.diagnostic?.blocked,
		`${label} contacted authored collision: ${JSON.stringify({
			beforePoint,
			afterPoint,
			diagnostic: afterEvidence.diagnostic
		})}`
	).toBe(false);
	expect(Number.isFinite(afterPoint.x)).toBe(true);
	expect(Number.isFinite(afterPoint.y)).toBe(true);
	if (keys.length === 1 && keys[0] === 'ArrowUp') {
		expect(afterPoint.x).toBe(beforePoint.x);
		expect(afterPoint.y).toBeLessThan(beforePoint.y);
		const northWall = layout.walls.find(({ id }) => id === 'guild-hall-wall-north');
		if (!northWall) throw new Error('Guild Hall north-wall collision source is missing');
		expect(
			routeSegmentIntersectsExpandedRect(
				beforePoint,
				afterPoint,
				northWall,
				PLAYER_COLLISION_RADIUS
			),
			`${label} crossed the authored north wall: ${JSON.stringify({ beforePoint, afterPoint })}`
		).toBe(false);
	} else {
		expect(keys).toEqual(['ArrowDown', 'ArrowLeft']);
		expect(afterPoint.x).toBeLessThan(beforePoint.x);
		expect(afterPoint.y).toBeGreaterThan(beforePoint.y);
		expect(
			routeSegmentIntersectsExpandedRect(beforePoint, afterPoint, desk, PLAYER_COLLISION_RADIUS),
			`${label} crossed the authored desk: ${JSON.stringify({ beforePoint, afterPoint })}`
		).toBe(false);
	}
	expect(expandedLayoutRectContainsPoint(desk, afterPoint, PLAYER_COLLISION_RADIUS)).toBe(false);
	return afterEvidence;
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

	let currentEvidence = await currentHudPlayerEvidence(page, 'guild-hall');
	let currentPoint = currentEvidence.selectedPoint;
	const isInInteractionBand = (point: Point) =>
		point.y >= interactionYBand.min && point.y < interactionYBand.maxExclusive;
	if (!isInInteractionBand(currentPoint)) {
		if (currentPoint.y >= interactionYBand.maxExclusive) {
			currentEvidence = await runGuildMasterSemanticPulse(
				page,
				['ArrowUp'],
				currentEvidence,
				'Guild Master cardinal staging pulse'
			);
			currentPoint = currentEvidence.selectedPoint;
			expect(
				currentPoint.y < interactionYBand.min || isInInteractionBand(currentPoint),
				`Guild Master cardinal pulse did not reach the lower side of its source band: ${JSON.stringify(currentPoint)}`
			).toBe(true);
		}
		if (!isInInteractionBand(currentPoint)) {
			expect(currentPoint.y).toBeLessThan(interactionYBand.min);
			currentEvidence = await runGuildMasterSemanticPulse(
				page,
				['ArrowDown', 'ArrowLeft'],
				currentEvidence,
				'Guild Master diagonal staging pulse'
			);
			currentPoint = currentEvidence.selectedPoint;
		}
	}
	expect(isInInteractionBand(currentPoint)).toBe(true);

	assertGuildHallGuildMasterInteractionBand(stagingPoint);
	return assertGuildHallGuildMasterStagingContract(page, stagingPoint, currentEvidence);
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
		const stockroomTerminalStep = isItemShopStockroomTerminalStep(interior, step);
		const serviceReturnWestStep = isItemShopMiraServiceReturnWestStep(interior, step);
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
											: serviceReturnWestStep
												? serviceReturnWestPlan!.vertical
												: isItemShopStockroomReturnDoorwayStep(interior, step)
													? itemShopStockroomReturnDoorwayRoutePoints(currentPoint, checkpoint)
													: isItemShopStockroomTerminalStep(interior, step)
														? itemShopStockroomTerminalRoutePoints(currentPoint, checkpoint)
														: isItemShopStockroomDoorwayStep(interior, step)
															? itemShopDoorwayRoutePoints(currentPoint, checkpoint, 'stockroom')
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
																		? guildHallRecordsRoomRoutePoints(currentPoint, checkpoint)
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
																						: leavingInteraction
																							? [
																									currentPoint,
																									{ x: checkpoint.x, y: currentPoint.y },
																									checkpoint
																								]
																							: interiorRoutePoints(currentPoint, checkpoint);
			if (interior.mapId === 'guild-hall' || interior.mapId === 'item-shop') {
				assertTask6InteriorRouteEnvelope(
					interior.mapId,
					routePoints,
					`${interior.mapId}:${step.label}`,
					terminalDepartureStep ||
						isGuildHallQuartermasterReturnStep(interior, step, leavingInteraction)
						? { skipInitialTerminalDeparture: true }
						: doorwayKind
							? { skipInitialAsymmetricDoorwayCrossing: true }
							: spawnReturnCorridorStep
								? { skipInitialAsymmetricFixedAxisTransit: true }
								: serviceReturnWestStep
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
			if (stockroomTerminalStep) {
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
			const finish = (result: TransitionSourceWaitResult) => {
				if (settled) return;
				settled = true;
				if (listener) window.removeEventListener('gliese:player-movement-diagnostic', listener);
				if (timeoutId !== undefined) window.clearTimeout(timeoutId);
				resolveWait(result);
			};
			const promise = new Promise<TransitionSourceWaitResult>((resolve) => {
				resolveWait = resolve;
				listener = (event: Event) => {
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
						sourceEventCount
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
						sourceEventCount
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
						sourceEventCount
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
	try {
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
		await page.evaluate(() => (window as GlieseProbeWindow).__glieseTransitionSourceCleanup?.());
	}
	await page.waitForFunction(
		(requestedMapId) =>
			(window as GlieseProbeWindow).__glieseLastHudState?.mapId === requestedMapId,
		targetMapId,
		{ timeout: 30_000 }
	);
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

// Task 4's frozen route anchors, copied into the browser proof as exact
// keyboard waypoints. These are deliberately separate from the older pilot
// route fixtures above so the fallback journey exercises the authored bridge
// and destination anchors directly.
const FALLBACK_V2_HERO_HOUSE_TO_CROSSROADS = [
	{ x: 704, y: 5_920 },
	{ x: 704, y: 6_080 },
	{ x: 320, y: 6_080 },
	{ x: 320, y: 4_624 },
	{ x: 2_496, y: 4_624 },
	{ x: 3_744, y: 4_624 },
	{ x: 3_904, y: 4_624 },
	{ x: 3_904, y: 4_224 }
] as const;

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
	{ x: 4_944, y: 3_168 },
	{ x: 4_944, y: 3_904 }
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
const WILDWOOD_FOREST_LANE_WEST_BANK_ID = 'wildwood-forest-lane-west-bank';
const WILDWOOD_POST_RUINS_TARGET = { x: 4_800, y: 3_808 } as const;
const LOWER_RIVER_ID = 'lower-river';
const POST_RUINS_LOWER_RIVER_TARGET = { x: 3_264, y: 4_688 } as const;

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
	const wildwoodMouth = FALLBACK_V2_CROSSROADS_TO_WILDWOOD.at(-1)!;
	expect(safeRow).toBe(3_168);
	expect(wildwoodMouth).toEqual({ x: 4_944, y: 3_904 });
	expect(start.x - PLAYER_COLLISION_RADIUS).toBeGreaterThan(bank.x + bank.width);

	const points = [
		{ ...start },
		{ x: start.x, y: safeRow },
		{ x: wildwoodMouth.x, y: safeRow },
		{ ...wildwoodMouth },
		{ x: WILDWOOD_POST_RUINS_TARGET.x, y: wildwoodMouth.y },
		{ ...WILDWOOD_POST_RUINS_TARGET }
	];
	for (let index = 1; index < points.length; index += 1) {
		const from = points[index - 1]!;
		const to = points[index]!;
		expect(from.x === to.x || from.y === to.y).toBe(true);
		if (index === 1) {
			// This is a fixed-axis north leg at the actual settled x. Prove only
			// the actual player circle and swept segment; do not invent an
			// orthogonal ±reach envelope for the held axis.
			expect(routeSegmentIntersectsExpandedRect(from, to, bank, PLAYER_COLLISION_RADIUS)).toBe(
				false
			);
			expect(endpointYEnvelopeIsDisjointFromExpandedRect(to, bank, PLAYER_COLLISION_RADIUS)).toBe(
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
	const composed = findMeadowEntryCardinalPath(actualStart, target, () => true);
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
			`${label} collapsed segment ${index}`
		).toBe(true);
	}

	const route = [
		...meadowEntryAxisConnectionPoints(actualStart, collapsedStart),
		...collapsed.slice(1),
		...meadowEntryAxisConnectionPoints(collapsedGoal, target).slice(1)
	];
	expect(route[0]).toEqual(actualStart);
	expect(route.at(-1)).toEqual(target);
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
	{ x: 5_856, y: 3_200 }
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
		const blockedExhaustedAfter = runner.get(blockedExhaustedToken);
		const blockedExhaustedCancel = runner.cancel(
			blockedExhaustedToken,
			'synthetic blocked correction cleanup'
		);

		probeWindow.__glieseCharacterizationSyntheticPhase = false;
		resetMovementProbe();
		return {
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
	const wrongDirectionStart = evidence.wrongDirectionStart!;
	const wrongDirectionAfter = evidence.wrongDirectionAfter!;
	const blockedStart = evidence.blockedStart!;
	const blockedAfter = evidence.blockedAfter!;
	const blockedCancel = evidence.blockedCancel!;
	const staleDiagnosticStart = evidence.staleDiagnosticStart!;
	const staleDiagnosticCancel = evidence.staleDiagnosticCancel!;
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
	expect(blockedStart.status).toBe('running');
	expect(blockedAfter.status).toBe('running');
	expect(blockedAfter.pointIndex).toBe(1);
	expect(blockedAfter.axis).toBe('y');
	expect(blockedAfter.target).toEqual({
		x: initial!.x + 16,
		y: initial!.y + 64
	});
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
		{ x: 4_944, y: 3_168 },
		{ x: 4_944, y: 3_904 },
		{ x: 4_800, y: 3_904 },
		{ x: 4_800, y: 3_808 }
	]);
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
	// This one continuous keyboard journey takes over six minutes before the
	// final Wildwood and dungeon legs. The trace reached Threshold after the
	// valid Meadow legs, then its actively progressing 7,296px north loop was
	// still inside the unchanged 15-second route watchdog when the 600s outer
	// deadline closed the page 9.77s after that route began. Extend only this
	// test's outer budget; keep the route runner watchdog and movement contract
	// unchanged.
	test.setTimeout(1_200_000);
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
	await installRuntimeProbes(page, { captureFacing: true });
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

	type JourneyRouteEvidence = {
		label: string;
		token: string;
		status: BrowserRouteResult['status'];
		mapId: string;
		position: Point | null;
		lastDiagnostic: PlayerMovementDiagnostic | null;
	};
	const routeEvidence: JourneyRouteEvidence[] = [];
	const routeResults = new Map<string, BrowserRouteResult>();
	const recordRoute = (label: string, result: BrowserRouteResult) => {
		routeResults.set(label, result);
		routeEvidence.push({
			label,
			token: result.token,
			status: result.status,
			mapId: result.mapId,
			position: result.position,
			lastDiagnostic: result.lastDiagnostic
		});
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

	await journeyRoute('Villager House 1 to Villager House 2', [
		meadowPoint,
		{ x: 672, y: 4_688 },
		{ x: 1_376, y: 4_688 },
		villagerHouse2.returnArrival
	]);
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
	await journeyRoute('Village bridge to Crossroads', [
		meadowPoint,
		{ x: 1_472, y: 6_080 },
		{ x: 320, y: 6_080 },
		...FALLBACK_V2_HERO_HOUSE_TO_CROSSROADS.slice(3)
	]);
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
		{ x: 4_944, y: 3_904 },
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
	const wildwoodTransitionSourcePoint = {
		x: WILDWOOD_CAVE_STAGING.x,
		y: WILDWOOD_CAVE_ANCHOR.y
	};
	expect(Math.abs(wildwoodCaveStaging.x - wildwoodTransitionSourcePoint.x)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	expect(Math.abs(wildwoodCaveStaging.y - WILDWOOD_CAVE_STAGING.y)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	// The authored cave transition sits inside the landmark body. The source-aware
	// trusted transition helper owns its isolated collision-edge approach.
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
	await journeyRoute('Ruins Threshold main route to core stair', FALLBACK_THRESHOLD_MAIN_ROUTE);
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
	await journeyRoute('Ruins Core return stair staging', [
		{ x: 4_600, y: 3_200 },
		{ x: 288, y: 3_200 }
	]);
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
	const meadowLowerRiverHandoff = await journeyRoute(
		'Meadow continuation after ruins: lower-river east handoff',
		[meadowBankHandoff, { x: 4_288, y: 4_224 }, { x: 4_288, y: 4_480 }, { x: 3_776, y: 4_480 }]
	);
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
	await expect(page.locator('canvas')).toBeVisible();
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
			routeEvidence.map(({ label, token, status, mapId, position, lastDiagnostic }) => ({
				label,
				token,
				status,
				mapId,
				position,
				blocked: lastDiagnostic?.blocked ?? null,
				resolvedPosition: lastDiagnostic?.resolvedPosition ?? null
			}))
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
