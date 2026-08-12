import { expect, test, type Page } from '@playwright/test';

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

type GlieseProbeWindow = Window & {
	__glieseLastHudState?: HudStateSnapshot;
	__glieseLastPlayerFacing?: string;
	__glieseLastHudAt?: number;
	__glieseMovementDiagnostics?: PlayerMovementDiagnostic[];
	__glieseLastMovementDiagnostic?: PlayerMovementDiagnostic;
	__glieseLastMovementAt?: number;
	__glieseCharacterizationMovementCount?: number;
	__glieseCharacterizationSyntheticPhase?: boolean;
	__glieseRegionalBackgroundDiagnostics?: RegionalBackgroundPlaneRenderDiagnostic[];
	__glieseRegionalBackgroundRendererDiagnostics?: RegionalBackgroundRendererDiagnostic[];
	__glieseRouteVisibilityState?: string;
	__glieseRouteHasFocus?: boolean;
	__glieseRouteBlurAt?: number;
	__glieseRouteFocusAt?: number;
	__glieseRouteRunner?: {
		start: (plan: BrowserRoutePlan) => BrowserRouteResult;
		get: (token: string) => BrowserRouteResult | null;
		cancel: (token: string, reason: string) => BrowserRouteResult | null;
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
			const marker = 'this.facing=r?.player.facing??i.spawnDirection';
			if (!body.includes(marker)) {
				throw new Error('WorldScene facing probe marker was not found in the served test chunk');
			}
			await route.fulfill({
				response,
				body: body.replace(marker, `${marker},globalThis.__glieseLastPlayerFacing=this.facing`)
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
				status: routeState.status,
				pointIndex: routeState.pointIndex,
				axis: routeState.axis,
				position: routeState.position ? { ...routeState.position } : null,
				target: routeState.target ? { ...routeState.target } : null,
				lastDiagnostic: cloneDiagnostic(routeState.lastDiagnostic),
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
			if (distance <= routeState.settleTolerance) {
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
				if (!diagnostic.blocked && distance <= routeState.reachTolerance) {
					releaseKey();
					let contractAdvanced = false;
					if (!routeState.settledAxes[axis]) {
						routeState.settledAxes[axis] = true;
						contractAdvanced = true;
					}
					contractAdvanced = beginNextAxis() || contractAdvanced;
					if (contractAdvanced) routeState.lastProgressAt = movementAt;
					return;
				}
				failRoute(
					`correction limit at point ${routeState.pointIndex} axis ${axis} target ${JSON.stringify(target)}`
				);
				return;
			}
			routeState.correctionTaps += 1;
			pressKey(axisKey(axis, targetValue - value));
		};
		window.addEventListener('gliese:player-movement-diagnostic', onMovementDiagnostic);
		const routeRunner: NonNullable<GlieseProbeWindow['__glieseRouteRunner']> = {
			start: (plan) => {
				if (routeState?.status === 'running') {
					failRoute(`route ${routeState.token} was still active`);
				}
				const points = plan.points.map((point) => ({ x: point.x, y: point.y }));
				const startedAt = performance.now();
				routeState = {
					token: plan.token,
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
					settledAxes: { x: false, y: false }
				};
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
	status: 'running' | 'done' | 'error';
	pointIndex: number;
	axis: Axis | null;
	position: Point | null;
	target: Point | null;
	lastDiagnostic: PlayerMovementDiagnostic | null;
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
	blockedTolerance = settleTolerance
): Promise<Point> {
	const result = await runBrowserRoute(page, points, settleTolerance, blockedTolerance);
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

const NPC_APPROACH_SETTLE_TOLERANCE = 4;
const INTERIOR_ROUTE_SETTLE_TOLERANCE = 4;

function interiorRoutePoints(currentPoint: Point, targetPoint: Point): Point[] {
	return currentPoint.y !== targetPoint.y
		? [currentPoint, { x: currentPoint.x, y: targetPoint.y }, targetPoint]
		: [currentPoint, targetPoint];
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

async function currentHudPlayerPoint(page: Page, mapId = 'meadow-entry'): Promise<Point> {
	const evidence = await page.evaluate(() => {
		const probeWindow = window as GlieseProbeWindow;
		return {
			state: probeWindow.__glieseLastHudState ?? null,
			diagnostic: probeWindow.__glieseLastMovementDiagnostic ?? null
		};
	});
	const state = evidence.state;
	const livePlayer =
		evidence.diagnostic?.mapId === mapId
			? evidence.diagnostic.resolvedPosition
			: state?.areaMap?.player;
	if (
		state?.mapId !== mapId ||
		typeof livePlayer?.x !== 'number' ||
		typeof livePlayer.y !== 'number'
	) {
		throw new Error(`Missing live player point for ${mapId}: ${JSON.stringify(evidence)}`);
	}
	return { x: livePlayer.x, y: livePlayer.y };
}

async function assertInteriorCheckpoint(page: Page, interior: InteriorGrayboxCase, point: Point) {
	await waitForHudPosition(page, interior.mapId, point);
	const state = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseLastHudState ?? null
	);
	expect(state?.mapId).toBe(interior.mapId);
	const player = await page.evaluate(() => {
		const probeWindow = window as GlieseProbeWindow;
		const diagnostic = probeWindow.__glieseLastMovementDiagnostic;
		if (diagnostic && diagnostic.mapId === probeWindow.__glieseLastHudState?.mapId) {
			return diagnostic.resolvedPosition;
		}
		return probeWindow.__glieseLastHudState?.areaMap?.player ?? null;
	});
	expect(player).toBeDefined();
	expect(Math.abs((player?.x ?? 0) - point.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs((player?.y ?? 0) - point.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	const diagnostic = await latestMovement(page);
	if (diagnostic?.mapId === interior.mapId) {
		expect(diagnostic.blocked).toBe(false);
	}
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

async function enterInteriorWithTrustedKeyboard(
	page: Page,
	interior: InteriorGrayboxCase,
	options: { allowLiveFrontage?: boolean } = {}
) {
	const exteriorState = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseLastHudState ?? null
	);
	expect(exteriorState?.mapId).toBe('meadow-entry');
	if (options.allowLiveFrontage) {
		// Movement diagnostics are the authoritative live position. HUD updates
		// are event-driven and may still reflect the prior frame immediately after
		// the trusted route runner settles at the frontage.
		const exteriorPlayer = await currentHudPlayerPoint(page);
		expect(Math.abs(exteriorPlayer.x - interior.returnArrival.x)).toBeLessThanOrEqual(
			AXIS_REACH_TOLERANCE
		);
		expect(Math.abs(exteriorPlayer.y - interior.returnArrival.y)).toBeLessThanOrEqual(
			AXIS_REACH_TOLERANCE
		);
	} else {
		expect(exteriorState?.areaMap?.player?.x).toBe(interior.returnArrival.x);
		expect(exteriorState?.areaMap?.player?.y).toBe(interior.returnArrival.y);
	}
	expect(interior.exteriorDoor.x).toBe(interior.returnArrival.x);
	expect(interior.exteriorDoor.y).toBeLessThan(interior.returnArrival.y);
	await page.locator('canvas').click();
	await page.keyboard.down('ArrowUp');
	try {
		await page.waitForFunction(
			({ requestedMapId, door }) => {
				const state = (window as GlieseProbeWindow).__glieseLastHudState;
				const diagnostics = (window as GlieseProbeWindow).__glieseMovementDiagnostics ?? [];
				return (
					state?.mapId === requestedMapId &&
					diagnostics.some(
						(diagnostic) =>
							diagnostic.mapId === 'meadow-entry' && diagnostic.requestedPosition.y <= door.y + 48
					)
				);
			},
			{ requestedMapId: interior.mapId, door: interior.exteriorDoor },
			{ timeout: 30_000 }
		);
	} finally {
		await page.keyboard.up('ArrowUp');
	}
	await waitForHudPosition(page, interior.mapId, interior.spawn);
	previousRouteSettleTolerance = AXIS_SETTLE_TOLERANCE;
	await page.evaluate(() => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseMovementDiagnostics = [];
		probeWindow.__glieseLastMovementDiagnostic = undefined;
		probeWindow.__glieseLastMovementAt = 0;
	});
}

async function exitInteriorWithTrustedKeyboard(page: Page, interior: InteriorGrayboxCase) {
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

const PAINTED_PILOT_BACKGROUND_IDS = [
	'meadow-entry-painted-v2-sundrop-village-base-image',
	'meadow-entry-painted-v2-village-crossroads-connector-base-image',
	'meadow-entry-painted-v2-crossroads-base-image'
] as const;

const PAINTED_PILOT_BACKGROUND_DIMENSIONS = {
	'meadow-entry-painted-v2-sundrop-village-base-image': { width: 2_624, height: 2_176 },
	'meadow-entry-painted-v2-village-crossroads-connector-base-image': {
		width: 800,
		height: 416
	},
	'meadow-entry-painted-v2-crossroads-base-image': { width: 1_728, height: 1_952 }
} as const;

const PAINTED_PILOT_CROSSROADS_TEXTURE = 'meadow-entry-painted-v2-crossroads-base-image';
const PAINTED_PILOT_SUNDROP_TEXTURE = 'meadow-entry-painted-v2-sundrop-village-base-image';

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
	expect(pilotPlaneDiagnostic.entries).toHaveLength(3);
	expect(pilotPlaneDiagnostic.entries.map((entry) => entry.id)).toEqual(
		PAINTED_PILOT_BACKGROUND_IDS
	);
	assertPaintedPilotPlaneDiagnostic(pilotPlaneDiagnostic, PAINTED_PILOT_BACKGROUND_IDS);
	expect(pilotPlaneDiagnostic.selectedFallbackBlockerIds).toEqual([]);
	expect(pilotPlaneDiagnostic.selectedFallbackDecorIds).toEqual([]);
	expect(pilotPlaneDiagnostic.selectedFallbackFenceIds).toEqual([]);
	expect(pilotRendererDiagnostic).toMatchObject({
		paintedMode: 'pilot',
		regionalBackgroundLoadCompletions: 3
	});
	expect(pilotRendererDiagnostic.regionalBackgroundLoadMs).not.toBeNull();
	expect(paintedRequests.map((url) => new URL(url).pathname).sort()).toEqual([
		'/game/assets/regions/meadow-entry-painted-v2/painted-v2-crossroads-base.png',
		'/game/assets/regions/meadow-entry-painted-v2/painted-v2-sundrop-village-base.png',
		'/game/assets/regions/meadow-entry-painted-v2/painted-v2-village-crossroads-connector-base.png'
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
		'**/game/assets/regions/meadow-entry-painted-v2/painted-v2-crossroads-base.png',
		(route) => route.abort()
	);
	await page.goto('/?meadowPaintedPilot=on&movementDiagnostics=on&mapDebug=collision');
	await expect(page.locator('canvas')).toBeVisible();
	const missingCrossroadsPlaneDiagnostic = await waitForMeadowPlaneDiagnostic(page);
	const missingCrossroadsRendererDiagnostic = await waitForMeadowRendererDiagnostic(page);
	expect(missingCrossroadsRendererDiagnostic).toMatchObject({
		paintedMode: 'pilot',
		regionalBackgroundLoadCompletions: 2
	});
	expect(missingCrossroadsPlaneDiagnostic.successfulBackgroundIds).toEqual(
		[PAINTED_PILOT_BACKGROUND_IDS[0], PAINTED_PILOT_BACKGROUND_IDS[1]].sort()
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
	expect(missingCrossroadsPlaneDiagnostic.selectedFallbackBlockerIds).toContain(
		'silverpine-wall-B-south'
	);
	expect(missingCrossroadsPlaneDiagnostic.selectedFallbackDecorIds).not.toContain(
		'village-decor-22-77'
	);

	// The restored Silverpine wall is still authoritative collision. Reach its
	// south face with real keyboard input and require the collision diagnostic to
	// resolve short of the requested point.
	previousRouteSettleTolerance = AXIS_SETTLE_TOLERANCE;
	await page.locator('canvas').click();
	await moveRoute(page, HERO_HOUSE_TO_CROSSROADS);
	const silverpineArrival = await moveRoute(page, CROSSROADS_TO_SILVERPINE);
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
		'**/game/assets/regions/meadow-entry-painted-v2/painted-v2-crossroads-base.png'
	);
	await page.goto(
		`/?meadowPaintedPilot=on&movementDiagnostics=on&regionalBackgroundFault=${PAINTED_PILOT_SUNDROP_TEXTURE}:render`
	);
	await expect(page.locator('canvas')).toBeVisible();
	const sundropFaultPlaneDiagnostic = await waitForMeadowPlaneDiagnostic(page);
	const sundropFaultRendererDiagnostic = await waitForMeadowRendererDiagnostic(page);
	expect(sundropFaultRendererDiagnostic).toMatchObject({
		paintedMode: 'pilot',
		regionalBackgroundLoadCompletions: 3
	});
	expect(sundropFaultPlaneDiagnostic.successfulBackgroundIds).toEqual(
		[PAINTED_PILOT_BACKGROUND_IDS[1], PAINTED_PILOT_BACKGROUND_IDS[2]].sort()
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
	const itemShop = INTERIOR_GRAYBOX_CASES.find((interior) => interior.mapId === 'item-shop');
	expect(heroHouse).toBeDefined();
	expect(itemShop).toBeDefined();
	if (!heroHouse || !itemShop)
		throw new Error('HPA-586 route constants missing Hero House or Item Shop');

	// Hero House frontage and door, both directions, use the existing trusted
	// keyboard transition helper rather than mutating the scene position.
	await enterInteriorWithTrustedKeyboard(page, heroHouse, { allowLiveFrontage: true });
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
		{ x: 912, y: 4_688 },
		{ x: 912, y: 5_072 }
	]);
	await expect(fieldStatus(page)).toContainText('Found');
	const afterPickup = await currentHudPlayerPoint(page);

	// Visit a live village NPC on the same authored village route. Item-shop is
	// reached from the southern lane so the approach stops outside its door.
	await moveRoute(page, [
		afterPickup,
		{ x: 912, y: 5_376 },
		{ x: 704, y: 5_376 },
		{ x: 704, y: 5_248 }
	]);
	await enterInteriorWithTrustedKeyboard(page, itemShop, { allowLiveFrontage: true });

	let itemShopPoint = itemShop.spawn;
	for (const step of itemShop.steps.slice(0, 4)) {
		itemShopPoint = await moveRoute(
			page,
			interiorRoutePoints(itemShopPoint, step.point),
			step.interaction ? NPC_APPROACH_SETTLE_TOLERANCE : INTERIOR_ROUTE_SETTLE_TOLERANCE
		);
		await assertInteriorCheckpoint(page, itemShop, step.point);
		if (step.interaction) await interactWithInteriorNpc(page, step.interaction);
	}
	itemShopPoint = await moveRoute(
		page,
		[itemShopPoint, { x: 416, y: 448 }, { x: 640, y: 448 }, { x: 640, y: 544 }, { x: 416, y: 544 }],
		INTERIOR_ROUTE_SETTLE_TOLERANCE
	);
	await assertInteriorCheckpoint(page, itemShop, itemShopPoint);
	await exitInteriorWithTrustedKeyboard(page, itemShop);
	const afterItemShop = await currentHudPlayerPoint(page);

	// Village → connector → Crossroads. Keep the route on the current
	// HPA-586 constants so painted coverage cannot hide a geometry regression.
	await moveRoute(page, [
		afterItemShop,
		{ x: afterItemShop.x, y: 5_376 },
		{ x: 320, y: 5_376 },
		{ x: 320, y: 4_688 },
		{ x: 3_264, y: 4_688 },
		{ x: 3_776, y: 4_480 }
	]);
	// Crossroads is a region within the persistent Meadow Entry map (the HUD
	// location label intentionally remains Sundrop Meadows). The live point at
	// the authored plaza handoff, followed by Waystone interaction below, is the
	// route proof rather than a map-id change.
	const crossroadsPoint = await currentHudPlayerPoint(page);
	expect(Math.abs(crossroadsPoint.x - 3_776)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(crossroadsPoint.y - 4_480)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);

	// Crossroads Waystone discovery. The authored approach goes around the
	// waystone collision and deliberately uses real interaction input.
	await moveRoute(page, [
		{ x: 3_776, y: 4_480 },
		{ x: 4_032, y: 4_480 },
		{ x: 4_032, y: 4_224 },
		{ x: 3_904, y: 4_224 }
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
		{ x: 3_904, y: 4_224 },
		{ x: 4_160, y: 4_224 },
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
		let correctionPosition = { ...initialPoint };
		for (let attempt = 0; attempt < 9; attempt += 1) {
			const offset = attempt % 2 === 0 ? 16.8016 : -15.992;
			const resolvedPosition = {
				x: correctionTarget.x + offset,
				y: initialPoint.y
			};
			dispatchDiagnostic({
				mapId: 'meadow-entry',
				previousPosition: { ...correctionPosition },
				requestedPosition: { ...resolvedPosition },
				resolvedPosition: { ...resolvedPosition },
				blocked: false
			});
			correctionPosition = resolvedPosition;
		}
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
			blockedStart,
			blockedAfter,
			blockedCancel,
			wrongDirectionStart,
			wrongDirectionLastProgressAt,
			wrongDirectionAfter,
			wrongDirectionCancel,
			correctionStart,
			correctionAfterX,
			correctionAfterY,
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
	const correctionStart = evidence.correctionStart!;
	const correctionAfterX = evidence.correctionAfterX!;
	const correctionAfterY = evidence.correctionAfterY!;
	const exhaustedFarStart = evidence.exhaustedFarStart!;
	const exhaustedFarAfter = evidence.exhaustedFarAfter!;
	const exhaustedFarCancel = evidence.exhaustedFarCancel!;
	const blockedExhaustedStart = evidence.blockedExhaustedStart!;
	const blockedExhaustedAfter = evidence.blockedExhaustedAfter!;
	const blockedExhaustedCancel = evidence.blockedExhaustedCancel!;
	expect(wrongDirectionStart.status).toBe('running');
	expect(wrongDirectionAfter.status).toBe('running');
	expect(wrongDirectionAfter.lastProgressAt).toBe(evidence.wrongDirectionLastProgressAt);
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
	expect(correctionAfterX.status).toBe('running');
	expect(correctionAfterX.pointIndex).toBe(1);
	expect(correctionAfterX.axis).toBe('y');
	expect(correctionAfterX.target).toEqual({
		x: initial!.x + 64,
		y: initial!.y + 64
	});
	expect(correctionAfterY.status).toBe('done');
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
