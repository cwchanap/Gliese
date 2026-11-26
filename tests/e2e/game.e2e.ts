import {
	chromium,
	expect,
	test,
	type JSHandle,
	type Locator,
	type Page,
	type TestInfo
} from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	continueFromTitle,
	continueFromTitlePicker,
	readSlotEnvelope,
	saveThroughSaveScreen,
	seedSaveSlots,
	startNewRunFromTitle,
	startNewRunThroughOpening
} from './helpers/game';
import { expectTimeout, testTimeout } from '../../tools/e2e-timeout-budget';
import { blacksmithInteriorMap, overworldMap } from '../../src/lib/game/content/maps';
import {
	overworldDoorArrival,
	type OverworldDoorMapId
} from '../../src/lib/game/content/maps/overworld/places';
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
import { anchorPoint } from '../../src/lib/game/content/maps/overworld/world';
import { type QuestState } from '../../src/lib/game/core/quests';
import { questStateAt } from '../../src/lib/game/core/quests.fixtures';

type HudStateSnapshot = {
	ready?: boolean;
	mapId?: string;
	status?: string;
	heroOccluded?: boolean;
	hp?: number;
	maxHp?: number;
	attack?: number;
	defense?: number;
	areaMap?: { player?: { x?: number; y?: number } };
	dialogue?: { id?: string; lineIndex?: number } | null;
	battle?: {
		phase?: string;
		active?: {
			feed?: Array<{ id: number; kind: string; amount: number; subject: string }>;
			enemies?: Array<{ unitId: string; hp: number; maxHp: number }>;
		} | null;
	};
	nearbyShop?: { shopId?: string; merchantName?: string } | null;
	wallet?: { coins?: number };
	quests?: { main?: { objectiveId?: string | null } | null; completed?: unknown[]; total?: number };
	inventory?: {
		consumables?: Array<{ itemId?: string; quantity?: number }>;
		equipment?: Array<{ itemId?: string }>;
		keyItems?: Array<{ itemId?: string; quantity?: number }>;
		equipped?: Record<string, string | null>;
	};
};

type PlayerMovementDiagnostic = {
	mapId: string;
	previousPosition: { x: number; y: number };
	requestedPosition: { x: number; y: number };
	resolvedPosition: { x: number; y: number };
	blocked: boolean;
};

// Mirrors WorldSceneCameraDiagnostic in
// src/lib/game/phaser/world-scene-camera-diagnostic.ts: a plain-data
// map/facing/camera snapshot emitted after Phaser has applied the camera
// bounds and refreshed worldView. Never the live camera object.
type WorldSceneCameraDiagnostic = {
	mapId: string;
	facing: string;
	camera: {
		view: { x: number; y: number; width: number; height: number };
		bounds: { x: number; y: number; width: number; height: number };
	};
};

type RegionalBackgroundPlaneRenderDiagnosticEntry = {
	id: string;
	textureKey: string;
	plane: 'base' | 'foreground';
	status: string;
	expectedDimensions: { width: number; height: number };
	observedDimensions: { width: number; height: number } | null;
	renderTransform?: {
		x: number;
		y: number;
		originX: number;
		originY: number;
		displayWidth: number;
		displayHeight: number;
		depth: number;
	};
};

type RegionalBackgroundPlaneRenderDiagnostic = {
	mapId: string;
	regionalBackgroundsEnabled: boolean;
	packageId: string | null;
	requiredBackgroundIds: string[];
	selectedBackgroundIds: string[];
	presentationMode: 'painted' | 'fallback';
	entries: RegionalBackgroundPlaneRenderDiagnosticEntry[];
	successfulBackgroundIds: string[];
	collisionIds: string[];
	statefulObjectIds: string[];
	selectedFallbackBlockerIds?: string[];
};

type RegionalBackgroundRendererDiagnostic = {
	renderer: 'webgl' | 'canvas';
	packageIds: string[];
	requiredAssetKeys: string[];
	completedAssetKeys: string[];
	maxTextureSize: number | null;
	regionalBackgroundLoadMs: number | null;
};

type GlieseProbeWindow = Window & {
	__glieseLastHudState?: HudStateSnapshot;
	__glieseLastHudAt?: number;
	__glieseMovementDiagnostics?: PlayerMovementDiagnostic[];
	__glieseLastMovementDiagnostic?: PlayerMovementDiagnostic;
	__glieseLastMovementAt?: number;
	__glieseRegionalBackgroundDiagnostics?: RegionalBackgroundPlaneRenderDiagnostic[];
	__glieseRegionalBackgroundRendererDiagnostics?: RegionalBackgroundRendererDiagnostic[];
	__glieseLastSceneCameraDiagnostic?: WorldSceneCameraDiagnostic;
	__glieseRouteVisibilityState?: string;
	__glieseRouteHasFocus?: boolean;
	__glieseRouteBlurAt?: number;
	__glieseRouteFocusAt?: number;
	__glieseJourneyTrace?: { x: number; y: number; mapId?: string }[];
	__glieseAxisHold?: {
		token: number;
		axis: 'x' | 'y';
		direction: 'gte' | 'lte';
		value: number;
		key: string;
		keyCode: number;
	} | null;
	__glieseAxisHoldLog?: {
		token: number;
		key: string;
		value: number;
		x: number;
		y: number;
	}[];
	__glieseBattleFeed?: { id: number; kind: string; amount: number; subject: string }[];
	__glieseWolvesHudPlates?: string[];
	__glieseWolvesActive?: {
		attack?: number;
		defense?: number;
		enemies: { unitId: string; hp: number; maxHp: number }[];
	} | null;
	__glieseRouteRunner?: {
		start: (plan: BrowserRoutePlan) => BrowserRouteResult;
		get: (token: string) => BrowserRouteResult | null;
		cancel: (token: string, reason: string) => BrowserRouteResult | null;
		active: () => BrowserRouteResult | null;
	};
};

function commandBox(page: Page, name: string | RegExp = 'Command') {
	return page.getByRole('region', { name });
}

function fieldStatus(page: Page) {
	return page.getByRole('status', { name: 'Field status' });
}

/** Registers the shared hud-state probe so readHud()-style evaluates work on
 * any page (fresh or in a pass-local browser context). */
function installHudStateListener(page: Page) {
	return page.addInitScript(() => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseLastHudState = undefined;
		window.addEventListener('gliese:hud-state', (event) => {
			probeWindow.__glieseLastHudState = (event as CustomEvent<HudStateSnapshot>).detail;
		});
	});
}

function readHudState(page: Page): Promise<HudStateSnapshot | null> {
	return page.evaluate(() => (window as GlieseProbeWindow).__glieseLastHudState ?? null);
}

/**
 * Presses the interact key until the NPC story dialog mounts. A lone 'e' can
 * be eaten when it lands on the same frame as a post-boot story-gate restart
 * (interact presses drain every frame, before the interact handler runs).
 * Repeats are safe: once the panel is open 'e' is inert — it only listens for
 * Enter/Space/Escape — and interactWithNearbyNpc refuses to reopen a session.
 */
async function pressInteractUntilDialog(page: Page, name: string | RegExp) {
	const dialog = page.getByRole('dialog', { name });
	await page.locator('canvas').click();
	await expect(async () => {
		await page.keyboard.press('e', { delay: 50 });
		await expect(dialog).toBeVisible({ timeout: 1_000 });
	}).toPass({ timeout: expectTimeout(15_000), intervals: [800, 1_200] });
	return dialog;
}

/**
 * Advances a conversation-mode story dialogue to its end and returns every
 * rendered `.jrpg-dialogue-line` in order.
 *
 * The default 'pointer' driver clicks the panel's Next action — the same
 * path pad-confirm uses — for callers that cannot guarantee DOM focus.
 * 'enter' presses Enter on the focused panel instead, covering real
 * keyboard advance including the terminal close. Enter is only safe while
 * focus stays inside the panel: its keydown handler stopPropagations the
 * press, so it never reaches Phaser's interact key handler. Pressed with
 * focus elsewhere (e.g. after a canvas click), the closing Enter doubles as
 * an interact key and can reopen the same NPC's dialogue.
 */
async function advanceConversationToEnd(page: Page, driver: 'pointer' | 'enter' = 'pointer') {
	const panel = page.locator('dialog.jrpg-dialogue-panel');
	const next = panel.getByRole('button', { name: 'Next' });
	const seenLines: string[] = [];
	for (let press = 0; press < 40; press += 1) {
		const hud = await readHudState(page);
		if (!hud?.dialogue) return seenLines;
		const renderedLine = await panel
			.locator('.jrpg-dialogue-line')
			.textContent()
			.catch(() => null);
		if (renderedLine !== null && seenLines.at(-1) !== renderedLine) {
			seenLines.push(renderedLine);
		}
		const prevDialogue = JSON.stringify(hud.dialogue);
		if (driver === 'enter') {
			// Keep the press inside the panel — autofocus holds it, and a stray
			// focus drop would leak the Enter to Phaser's interact handler.
			await panel.evaluate((el) => el.focus({ preventScroll: true }));
			await page.keyboard.press('Enter');
		} else {
			await next.click();
		}
		await page
			.waitForFunction(
				(prev) => {
					const state = (window as GlieseProbeWindow).__glieseLastHudState;
					return !state?.dialogue || JSON.stringify(state.dialogue) !== prev;
				},
				prevDialogue,
				{ timeout: 5_000 }
			)
			.catch(() => {});
	}
	throw new Error('dialogue did not close after 40 advances');
}

/**
 * Evidence screenshot capture shared by ticket evidence packs (HPA-839/840):
 * screenshots land in the pack's reports dir by default and deliberately
 * refresh whatever evidence is already committed there, or in an isolated
 * scratch dir when an override root is set. Existing names are never
 * overwritten on a rooted (isolated) run — 'wx' flags stale evidence.
 */
function evidenceShots(defaultRoot: string) {
	return (override?: string) => {
		const root = resolve(override ?? defaultRoot);
		let initialized = false;
		return {
			root,
			async shot(page: Pick<Page, 'screenshot'>, name: string) {
				if (!initialized) {
					// recursive: a restarted Playwright worker gets a fresh helper
					// over the same isolated root; the root may already exist.
					// Overwrite safety lives at the file level ('wx' below), so
					// new names always write while existing names refuse.
					mkdirSync(root, { recursive: true });
					initialized = true;
				}
				const path = resolve(root, name);
				if (override !== undefined) writeFileSync(path, '', { flag: 'wx' });
				await page.screenshot({ path });
			}
		};
	};
}

const HPA839_EVIDENCE_DOCS_DIR = 'docs/superpowers/reports/img/hpa-839-story-gear-shop';
const hpa839Evidence = evidenceShots(HPA839_EVIDENCE_DOCS_DIR);
const hpa840Evidence = evidenceShots('verification-output/hpa-840-responsive');

/**
 * HPA-839 evidence capture: isolated per-test output by default so a plain
 * `bun run test:e2e` can never overwrite — or leave `-retryN` litter in —
 * the committed docs pack. `HPA839_EVIDENCE_DOCS=1` opts back into the
 * committed dir for a deliberate refresh; `HPA839_EVIDENCE_ROOT` captures
 * into a custom (still 'wx'-guarded) root.
 */
function hpa839Capture(info: TestInfo) {
	if (process.env.HPA839_EVIDENCE_ROOT) {
		return hpa839Evidence(process.env.HPA839_EVIDENCE_ROOT);
	}
	if (process.env.HPA839_EVIDENCE_DOCS === '1') {
		return hpa839Evidence();
	}
	return hpa839Evidence(info.outputPath('hpa-839-evidence'));
}

async function hpa839Shot(page: Page, name: string) {
	// A retried attempt re-takes the same screenshots; stamp the retry index so
	// the no-overwrite guard still flags stale evidence instead of the retry.
	const retry = test.info().retry;
	const stamped = retry > 0 ? name.replace(/\.png$/, `-retry${retry}.png`) : name;
	await hpa839Capture(test.info()).shot(page, stamped);
}

/**
 * The boar king trial. The lodge still has Borak and its keeper, but Drogg (there only during the
 * earlier trials) has left the training-hall row that the guild hall route walks.
 */

/** The guild hall route walks the training-hall row, which Drogg holds during the earlier trials. */

function createQuestFixture(): QuestState {
	return {
		entries: {
			'prologue-trial-mistfen': {
				status: 'active',
				currentObjectiveId: 'gather-moonmoss',
				progress: 0,
				countedSourceIds: []
			}
		},
		completedObjectives: {},
		pendingEffects: []
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
	quests: QuestState;
}> & {
	clearedEncounters?: string[];
	collectedPickups?: string[];
	seenDiscoveries?: string[];
};

// Single source of truth for the save schema version/slot-envelope key in
// this e2e suite. Mirrors SAVE_SLOTS_STORAGE_KEY / SaveState.version in
// src/lib/game/save —
// kept local (not imported) so the Playwright Node worker doesn't have to
// resolve the game's `$lib` alias. addInitScript callbacks run in the browser
// and cannot close over Node bindings, so the key is passed to them as an arg.
const SAVE_VERSION = 11;
const SAVES_STORAGE_KEY = 'gliese.saves.v1';

// addInitScript serializes its callback to the browser and accepts only one
// arg, so the save JSON and storage key are bundled into a single object.
type SaveInitPayload = { encoded: string; key: string };
type SaveSeedInitPayload = SaveInitPayload & { marker: string };
const SAVE_SEED_MARKER = '__gliese_e2e_save_seeded_v1';

function createSaveFixture(overrides: SaveFixtureOverrides = {}) {
	return {
		version: SAVE_VERSION,
		mapExploration: {},
		mapId: overrides.mapId ?? 'overworld',
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
				},
				'sundrop-forge': {
					'training-sword': 1,
					'iron-cap': 1,
					'grip-wraps': 1,
					'traveler-vest': 1
				}
			}
		},
		quests: overrides.quests ?? createQuestFixture(),
		seenDiscoveries: overrides.seenDiscoveries ?? []
	};
}

function injectSave(page: Page, save: ReturnType<typeof createSaveFixture>) {
	// The runtime reads the slot envelope, so the fixture is seeded as the
	// newest autosave record.
	const envelope = {
		version: 1,
		slots: [
			{
				kind: 'autosave',
				savedAt: new Date().toISOString(),
				playtimeSeconds: 0,
				state: save
			},
			null,
			null
		]
	};

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
		{ encoded: JSON.stringify(envelope), key: SAVES_STORAGE_KEY, marker: SAVE_SEED_MARKER }
	);
}

// The persisted state keeps the SaveFixture shape, but e2e assertions treat it
// loosely (like the previous raw JSON.parse reads), so it stays a loose record.
type LooseSaveState = {
	[x: string]:
		| undefined
		| string
		| number
		| boolean
		| null
		| Record<string, unknown>
		| Array<unknown>
		| { x: number; y: number };
	mapId: string;
	player: { x: number; y: number };
	wallet: { coins: number };
	flags: Record<string, unknown>;
	quests: { completedObjectives?: Record<string, string[]> };
	shops: { stock: Record<string, Record<string, number>> };
	inventory: {
		equipment: unknown[];
		stacks?: Array<{ itemId?: string; quantity?: number }>;
	};
};

function readManualSlotState(page: Page): Promise<LooseSaveState> {
	return readSlotEnvelope(page).then(
		(envelope) => (envelope?.slots[1]?.state ?? {}) as LooseSaveState
	);
}

async function installRuntimeProbes(page: Page) {
	// Runtime observation is event-driven: the app emits typed
	// `gliese:*-diagnostic` CustomEvents (HUD, movement, camera) which the init
	// script below mirrors onto `window.__gliese*` handles. No production bundle
	// rewriting; the game chunk the tests run is byte-identical to the shipped one.
	return page.addInitScript(() => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseLastHudState = undefined;
		probeWindow.__glieseLastHudAt = 0;
		probeWindow.__glieseMovementDiagnostics = [];
		probeWindow.__glieseLastMovementDiagnostic = undefined;
		probeWindow.__glieseLastMovementAt = 0;
		probeWindow.__glieseRegionalBackgroundDiagnostics = [];
		probeWindow.__glieseRegionalBackgroundRendererDiagnostics = [];
		probeWindow.__glieseLastSceneCameraDiagnostic = undefined;
		probeWindow.__glieseAxisHold = null;
		probeWindow.__glieseAxisHoldLog = [];
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
			// The journey trace records every resolved step once the test arms it;
			// mapId tags each point so multi-map legs filter client-side.
			const trace = probeWindow.__glieseJourneyTrace;
			if (trace) {
				const last = trace[trace.length - 1];
				if (
					!last ||
					last.x !== detail.resolvedPosition.x ||
					last.y !== detail.resolvedPosition.y ||
					last.mapId !== detail.mapId
				) {
					trace.push({
						x: detail.resolvedPosition.x,
						y: detail.resolvedPosition.y,
						mapId: detail.mapId
					});
				}
			}
			// An armed axis hold releases its key on the same frame the resolved
			// position crosses the threshold — synchronous with the movement
			// update, so no CDP or poll latency adds overshoot. The arm is
			// consumed on the first matching event so exactly one keyup is
			// dispatched; the test-side poll observes that hold's completion
			// through the release log's token.
			const hold = probeWindow.__glieseAxisHold;
			if (hold) {
				const axisValue = hold.axis === 'x' ? detail.resolvedPosition.x : detail.resolvedPosition.y;
				const crossed =
					(hold.direction === 'gte' && axisValue >= hold.value) ||
					(hold.direction === 'lte' && axisValue <= hold.value);
				if (crossed) {
					probeWindow.__glieseAxisHold = null;
					probeWindow.__glieseAxisHoldLog?.push({
						token: hold.token,
						key: hold.key,
						value: hold.value,
						x: detail.resolvedPosition.x,
						y: detail.resolvedPosition.y
					});
					const keyup = new KeyboardEvent('keyup', {
						bubbles: true,
						cancelable: true,
						key: hold.key,
						code: `Key${hold.key.toUpperCase()}`
					});
					try {
						Object.defineProperty(keyup, 'keyCode', {
							configurable: true,
							value: hold.keyCode
						});
						Object.defineProperty(keyup, 'which', {
							configurable: true,
							value: hold.keyCode
						});
					} catch {
						// keyCode/which are read-only on some engines; the `key`
						// field alone still satisfies the Phaser keyup listener.
					}
					window.dispatchEvent(keyup);
				}
			}
		});
		window.addEventListener('gliese:world-scene-camera-diagnostic', (event) => {
			probeWindow.__glieseLastSceneCameraDiagnostic = (
				event as CustomEvent<WorldSceneCameraDiagnostic>
			).detail;
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
			blockedAxes: { x: boolean; y: boolean };
			axisHistory: Axis[];
			diagnostics: PlayerMovementDiagnostic[];
			invalidDiagnostics: PlayerMovementDiagnostic[];
			diagnosticAxes: Axis[];
		};
		let routeState: InternalRouteState | null = null;
		let keyLeaseFrame: number | null = null;
		let scheduledCorrectionWaitFrame: number | null = null;
		let scheduledCorrectionFrame: number | null = null;

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
				invalidDiagnostics: routeState.invalidDiagnostics.map(
					(diagnostic) => cloneDiagnostic(diagnostic)!
				),
				diagnosticAxes: [...routeState.diagnosticAxes],
				activeKey: routeState.activeKey,
				correctionTaps: routeState.correctionTaps,
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
		const cancelScheduledCorrection = () => {
			if (scheduledCorrectionWaitFrame !== null) {
				cancelAnimationFrame(scheduledCorrectionWaitFrame);
				scheduledCorrectionWaitFrame = null;
			}
			if (scheduledCorrectionFrame === null) return;
			cancelAnimationFrame(scheduledCorrectionFrame);
			scheduledCorrectionFrame = null;
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
		const scheduleCorrection = (key: ArrowKey) => {
			if (!routeState || routeState.status !== 'running') return;
			cancelScheduledCorrection();
			cancelKeyLease();
			releaseKey();
			const { token, pointIndex, axis } = routeState;
			scheduledCorrectionWaitFrame = requestAnimationFrame(() => {
				scheduledCorrectionWaitFrame = null;
				if (
					!routeState ||
					routeState.status !== 'running' ||
					routeState.token !== token ||
					routeState.pointIndex !== pointIndex ||
					routeState.axis !== axis
				) {
					return;
				}
				scheduledCorrectionFrame = requestAnimationFrame(() => {
					scheduledCorrectionFrame = null;
					if (
						!routeState ||
						routeState.status !== 'running' ||
						routeState.token !== token ||
						routeState.pointIndex !== pointIndex ||
						routeState.axis !== axis
					) {
						return;
					}
					pressKey(key);
					startKeyLease();
				});
			});
		};
		const failRoute = (message: string) => {
			cancelScheduledCorrection();
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
			cancelScheduledCorrection();
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
				routeState.blockedAxes = { x: false, y: false };
				contractAdvanced = true;
			}
			routeState.axis = null;
			routeState.target = null;
			releaseKey();
			cancelKeyLease();
			if (routeState.invalidDiagnostics.length > 0) {
				const firstInvalidDiagnostic = routeState.invalidDiagnostics[0]!;
				routeState.status = 'error';
				routeState.error = `invalid movement diagnostic for map ${routeState.mapId}: expected mapId=${routeState.mapId} with an active axis and a blocked flag matching resolved!=requested; received ${JSON.stringify(firstInvalidDiagnostic)}`;
				return contractAdvanced;
			}
			routeState.status = 'done';
			return contractAdvanced;
		};
		const onMovementDiagnostic = (event: Event) => {
			if (!routeState || routeState.status !== 'running') return;
			const diagnostic = (event as CustomEvent<PlayerMovementDiagnostic>).detail;
			const movementAt = performance.now();
			const axis = routeState.axis;
			const target = routeState.target;
			const clonedDiagnostic = {
				mapId: diagnostic.mapId,
				previousPosition: { ...diagnostic.previousPosition },
				requestedPosition: { ...diagnostic.requestedPosition },
				resolvedPosition: { ...diagnostic.resolvedPosition },
				blocked: diagnostic.blocked
			};
			// Blocked is faithful movement evidence, not invalid evidence: the
			// emitter sets it exactly when collision resolution clamps the
			// request, so the flag must agree with resolved!==requested. Keep the
			// wrong-map / inactive-axis checks and reject only an inconsistent
			// flag; genuine blocked steps flow through to the blocked handler
			// below, where blockedTolerance applies.
			const blockedConsistent =
				diagnostic.blocked ===
				(diagnostic.resolvedPosition.x !== diagnostic.requestedPosition.x ||
					diagnostic.resolvedPosition.y !== diagnostic.requestedPosition.y);
			if (
				diagnostic.mapId !== routeState.mapId ||
				!blockedConsistent ||
				!axis ||
				!target ||
				!routeState.position
			) {
				routeState.movementCount += 1;
				routeState.lastMovementAt = movementAt;
				routeState.invalidDiagnostics.push(clonedDiagnostic);
				return;
			}
			// A diagnostic arriving before the first pacing frame is still a valid
			// movement result from the released key. Once the guaranteed idle frame
			// is pending, ignore only this already-validated replay until the next
			// correction key is held.
			if (scheduledCorrectionFrame !== null) return;
			// A late/coasting diagnostic from a previous axis can arrive after the
			// runner has switched axes (route-around below, or beginNextAxis). Its
			// requested axis — derived from requestedPosition - previousPosition —
			// won't match routeState.axis. Letting it through lets the blocked
			// handler mark the wrong axis blocked and bounce X/Y until the watchdog,
			// which is timing-dependent on slow runners. Drop it silently: it carries
			// no progress on the active axis and must not touch distance, blockedAxes,
			// or settling state. A diagnostic with no requested movement on either
			// axis (requestedPosition === previousPosition) cannot be classified and
			// is allowed through conservatively. axis is non-null here (the !axis
			// guard above already returned).
			const requestedOnX = diagnostic.requestedPosition.x !== diagnostic.previousPosition.x;
			const requestedOnY = diagnostic.requestedPosition.y !== diagnostic.previousPosition.y;
			if (requestedOnX !== requestedOnY && (requestedOnX ? 'x' : 'y') !== axis) return;
			routeState.movementCount += 1;
			routeState.lastMovementAt = movementAt;
			routeState.lastDiagnostic = clonedDiagnostic;
			// Blocked steps are faithful evidence too: the emitter sets the flag
			// exactly when collision resolution clamps the request, so they stay
			// in the recorded diagnostics alongside unblocked steps.
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
					// Blocked far from target on this axis. Mark it and try to route
					// around via the other axis if it still has distance to this
					// waypoint — e.g. the hero settled the previous axis a few px off
					// and landed on a prop collision that does not exist on-axis.
					routeState.blockedAxes[axis] = true;
					const otherAxis: Axis = axis === 'x' ? 'y' : 'x';
					const otherDelta = target[otherAxis] - routeState.position[otherAxis];
					if (
						!routeState.blockedAxes[otherAxis] &&
						Math.abs(otherDelta) > routeState.settleTolerance
					) {
						cancelScheduledCorrection();
						routeState.noProgressDiagnostics = 0;
						routeState.axis = otherAxis;
						routeState.axisHistory.push(otherAxis);
						routeState.target = { ...target };
						routeState.correctionTaps = 0;
						pressKey(axisKey(otherAxis, otherDelta));
						return;
					}
					failRoute(
						`blocked at point ${routeState.pointIndex} axis ${axis} target ${JSON.stringify(target)}`
					);
				}
				return;
			}
			if (!reached) {
				if (distanceDecreased) {
					routeState.lastProgressAt = movementAt;
					routeState.blockedAxes[axis] = false;
				}
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
			const pastTarget = direction > 0 ? value >= targetValue : value <= targetValue;
			// A paced correction uses two rAF callbacks (idle wait, then reverse key).
			// Coasting diagnostics from the released key arrive while waitFrame is set
			// and scheduledCorrectionFrame is still null — they must update position
			// without settling or burning another tap (Guild Hall opposite-overshoot).
			const correctionPending =
				scheduledCorrectionWaitFrame !== null || scheduledCorrectionFrame !== null;
			// Keep the intentional *first* overshoot correction (taps === 0 → schedule).
			// Do not let reachTolerance settle a past-target sample before a correction
			// is armed — that skipped the steering contract (axis stayed x, then reverse).
			// After a correction is armed, settle approach/past residues within reach
			// (including sync characterization samples while rAF pacing is pending).
			// Far past-target while pending must wait so Guild Hall idle oscillation
			// (> reachTolerance) cannot cancel the paced reverse; once pending clears,
			// past-target settle stops --fully-parallel thrash.
			if (
				distance <= routeState.settleTolerance ||
				(!diagnostic.blocked && reached && distance <= routeState.reachTolerance && !pastTarget) ||
				(!diagnostic.blocked &&
					pastTarget &&
					routeState.correctionTaps >= 1 &&
					(!correctionPending || distance <= routeState.reachTolerance))
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
			if (correctionPending) {
				// Already pacing a correction: keep this coasting sample authoritative
				// but do not schedule another reverse (that burned taps under >=2 and
				// either skipped the Guild Hall ArrowUp or failed to stop overworld thrash).
				if (distanceDecreased) {
					routeState.lastProgressAt = movementAt;
					routeState.blockedAxes[axis] = false;
				}
				return;
			}
			if (distanceDecreased) {
				routeState.lastProgressAt = movementAt;
				routeState.blockedAxes[axis] = false;
			}
			if (routeState.correctionTaps >= routeState.maxCorrectionTaps) {
				failRoute(
					`correction limit at point ${routeState.pointIndex} axis ${axis} target ${JSON.stringify(target)}`
				);
				return;
			}
			routeState.correctionTaps += 1;
			scheduleCorrection(axisKey(axis, targetValue - value));
		};
		window.addEventListener('gliese:player-movement-diagnostic', onMovementDiagnostic);
		const routeRunner: NonNullable<GlieseProbeWindow['__glieseRouteRunner']> = {
			start: (plan) => {
				if (routeState?.status === 'running') {
					failRoute(`route ${routeState.token} was still active`);
				}
				cancelScheduledCorrection();
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
					blockedAxes: { x: false, y: false },
					axisHistory: [],
					diagnostics: [],
					invalidDiagnostics: [],
					diagnosticAxes: []
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
			active: () => (routeState?.status === 'running' ? snapshot() : null),
			cancel: (token, reason) => {
				if (routeState?.token !== token) return null;
				if (routeState.status === 'running') failRoute(reason);
				return snapshot();
			}
		};
		probeWindow.__glieseRouteRunner = routeRunner;
		window.addEventListener('pagehide', () => {
			cancelScheduledCorrection();
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
	invalidDiagnostics?: PlayerMovementDiagnostic[];
	diagnosticAxes?: Axis[];
	activeKey?: 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | null;
	correctionTaps?: number;
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
const AXIS_REACH_TOLERANCE = 18;
const MAX_AXIS_CORRECTION_TAPS = 8;
const ROUTE_NO_PROGRESS_WATCHDOG_MS = 15_000;
// Mirrors WorldScene playerRadius (12) + transitionRadius (18).
const PLAYER_TRANSITION_REACH = 30;

let routeTokenSequence = 0;
let previousRouteSettleTolerance = AXIS_SETTLE_TOLERANCE;

test.beforeEach(() => {
	routeTokenSequence = 0;
	previousRouteSettleTolerance = AXIS_SETTLE_TOLERANCE;
});

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
	// `blocked` is legitimate evidence in `diagnostics`: the runner settles or
	// fails stationary-blocked frames against blockedTolerance itself, so a
	// completed route may retain them.
	for (const [index, diagnostic] of (result.diagnostics ?? []).entries()) {
		expect(diagnostic.mapId, `${label} diagnostic ${index} map`).toBe(result.mapId);
	}
}

async function runBrowserRoute(
	page: Page,
	points: readonly Point[],
	settleTolerance: number,
	blockedTolerance = settleTolerance,
	reachTolerance = AXIS_REACH_TOLERANCE
): Promise<BrowserRouteResult> {
	const token = `route-${Date.now()}-${routeTokenSequence++}`;
	const started = await page.evaluate(
		(plan) => (window as GlieseProbeWindow).__glieseRouteRunner?.start(plan) ?? null,
		{
			token,
			points,
			settleTolerance,
			startTolerance: Math.max(settleTolerance, previousRouteSettleTolerance),
			reachTolerance,
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
	onResult?: (result: BrowserRouteResult) => void,
	reachTolerance: number = AXIS_REACH_TOLERANCE
): Promise<Point> {
	const result = await runBrowserRoute(
		page,
		points,
		settleTolerance,
		blockedTolerance,
		reachTolerance
	);
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
	/** Deterministic buy executed inside the open shop before it closes. */
	purchase?: { label: string; itemId: string; quantityAfter: number; coinsAfter: number };
};

type InteriorGrayboxStep = {
	label: string;
	point: Point;
	interaction?: InteriorGrayboxInteraction;
	/** Per-step override of the coarse reach settling tolerance for handoff legs. */
	reachTolerance?: number;
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

/** Where an interior's exit sets Grik down on the overworld, and the door that leads back in. */
function overworldDoor(
	mapId: OverworldDoorMapId
): Pick<InteriorGrayboxCase, 'returnArrival' | 'exteriorDoor'> {
	const arrival = overworldDoorArrival(mapId);
	const door = overworldMap.transitions.find(({ toMapId }) => toMapId === mapId);
	if (!door) throw new Error(`No overworld door into ${mapId}`);
	return { returnArrival: { x: arrival.x, y: arrival.y }, exteriorDoor: { x: door.x, y: door.y } };
}

// Coarse 18px reach settling leaves up to 18px of residue on the approach axis.
// Legs whose settled residue feeds a strict downstream handoff must converge
// tighter, so they opt in per step via `reachTolerance`: interior spawn-return
// legs exit through clearance-eroded door lanes (Hero House and Item Shop are
// only two 16px cells wide) right after the route, the Guild Hall
// quartermaster doorway handoff must settle below the expanded counter before
// the horizontal crossing, Villager House 2's bedroom-entry leg must land east
// of the bedroom-divider wall column (x < 784 is nav-blocked below the doorway
// row) before the authored vertical descent to the bedroom, and the Shrine
// archive aisles (safe columns 232/792) sit one 16px cell from nav-blocked
// columns, so their descent legs must start inside the safe column.
// The Shrine east staging/aisle checkpoints also sit a fixed 4-5px design gap
// from their routes' transit-column endpoints, so an 18px accepted residue plus
// that gap can exceed the 18px checkpoint assert; those legs converge at reach 6.
const TIGHT_HANDOFF_REACH_TOLERANCE = 6;

/** An axis-aligned route from `start` through `targets`, moving along `first` before the other axis on each hop. */

/**
 * Ambient villagers answer E only to a player who is close and facing them (HPA-760), so walk
 * onto the villager's row and along it through `offsets` (x distances from the villager), then
 * tap toward the villager. The tap sets the facing even where a wall blocks the step, and it
 * undoes any reverse correction the route runner made on its last leg.
 */

/** Returns the player to `point` after a stance, so later legs start where the journey expects. */

// Graybox and all-eight route staging on the open row between the showroom-divider
// clearance (y < 400) and the service-counter zone (y >= 412). The interaction test
// does not use it; it walks up from the customer aisle on the compiled grid.
const blacksmithOrenInteractionStagingPoint = { x: 384, y: 400 };

// The armory passage has one open navigation column: x=592..<608. Bias the
// 18px reach target east so its first accepted point is inside that column.
const BLACKSMITH_ARMORY_TRANSIT_X = 611;

// The guild hall tests seed the boar king trial, so Drogg is not rendered in the lodge.
const BLACKSMITH_RUNTIME_EVIDENCE_ROOT = resolve(
	'verification-output/hpa-586-interiors-runtime/blacksmith-interior'
);
const BLACKSMITH_COLLISION_IDS = [
	...(blacksmithInteriorMap.blockers ?? []).map(({ id }) => id),
	...(blacksmithInteriorMap.interiorProps ?? []).flatMap(({ collision }) =>
		collision ? [collision.id] : []
	)
].sort();
const BLACKSMITH_STATEFUL_OBJECT_IDS = [
	...blacksmithInteriorMap.transitions.map(({ id }) => id),
	...(blacksmithInteriorMap.pickups ?? []).map(({ id }) => id),
	...(blacksmithInteriorMap.encounters ?? []).map(({ id }) => id),
	...(blacksmithInteriorMap.npcs ?? []).map(({ id }) => id),
	...(blacksmithInteriorMap.ambientNpcs ?? []).map(({ id }) => id),
	...(blacksmithInteriorMap.discoveries ?? []).map(({ id }) => id),
	...(blacksmithInteriorMap.combatBounds ?? []).map(({ id }) => id)
].sort();
const BLACKSMITH_FALLBACK_BLOCKER_IDS = (blacksmithInteriorMap.blockers ?? []).map(({ id }) => id);
// Mott stands in the shrine only during the escape, so the run under test does not render him.

const INTERIOR_ROUTE_SETTLE_TOLERANCE = 4;

// The route runner may legally finish a corrected axis anywhere inside its
// unchanged reach tolerance. Keep the full possible endpoint residue separate
// from the ordinary settle tolerance when deriving an obstacle-side handoff.

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
	mapId = 'overworld'
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

async function currentHudPlayerPoint(page: Page, mapId = 'overworld'): Promise<Point> {
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

async function approachNpcWithTrustedKeyboard(
	page: Page,
	approach: TrustedNpcSemanticApproach
): Promise<Point> {
	const stagingEvidence = await currentHudPlayerEvidence(page, approach.mapId);
	expect(Math.abs(stagingEvidence.selectedPoint.x - approach.stagingPoint.x)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	expect(Math.abs(stagingEvidence.selectedPoint.y - approach.stagingPoint.y)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	const interactionRadius =
		PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const npcCollisionRadius = PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS;
	const minimumMovementAt = stagingEvidence.movementAt;
	const attemptStart = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseMovementDiagnostics?.length ?? 0
	);
	let rangeObserved: boolean;
	let blockedBeforeRange: boolean;

	const direction = trustedNpcDirectionToward(stagingEvidence.selectedPoint, approach.npc);
	await page.locator('canvas').click();
	await page.keyboard.down(direction);
	try {
		const rangeHandle = await page.waitForFunction(
			({
				requestedMapId,
				requestedNpc,
				requestedRadius,
				minimumMovementAt: minimumAt,
				diagnosticsStart,
				pinnedWindow
			}) => {
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
				if (distance <= requestedRadius) return 'range';
				// A lone blocked diagnostic is not terminal: that frame's step can
				// be rejected whole while the next smaller step advances (same
				// rule the counter-settle window uses). Only a run of blocked
				// attempts pinned at one position outside range means the walk
				// can never reach the speaker.
				const recent = (probeWindow.__glieseMovementDiagnostics ?? [])
					.slice(diagnosticsStart)
					.slice(-pinnedWindow);
				const firstRecent = recent[0];
				if (
					firstRecent &&
					recent.length === pinnedWindow &&
					recent.every(
						(attempt) =>
							attempt.mapId === requestedMapId &&
							attempt.blocked === true &&
							attempt.resolvedPosition.x === firstRecent.resolvedPosition.x &&
							attempt.resolvedPosition.y === firstRecent.resolvedPosition.y &&
							Math.hypot(
								attempt.resolvedPosition.x - requestedNpc.x,
								attempt.resolvedPosition.y - requestedNpc.y
							) > requestedRadius
					)
				) {
					return 'blocked';
				}
				return false;
			},
			{
				requestedMapId: approach.mapId,
				requestedNpc: approach.npc,
				requestedRadius: interactionRadius,
				minimumMovementAt,
				diagnosticsStart: attemptStart,
				pinnedWindow: APPROACH_PINNED_ATTEMPTS
			},
			{ timeout: 30_000 }
		);
		const rangeOutcome = (await rangeHandle.jsonValue()) as 'blocked' | 'range';
		rangeObserved = rangeOutcome === 'range';
		blockedBeforeRange = rangeOutcome === 'blocked';
	} finally {
		await page.keyboard.up(direction);
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

	// Clearing overworld encounters in the single initial save unlocks the authored
	// requiresClear transition, but it also lets the accepted guild quest finish
	// as soon as the next NPC interaction is dispatched. Consume that queued
	// system notice through the real UI before retrying the intended interaction.
	// Scope to the visible line: the sr-only status twin repeats the dialogue text.
	await expect(notice.locator('.jrpg-dialogue-line')).toContainText(
		/^Quest complete: Thin Village Slimes\. Reward:/
	);
	await notice.getByRole('button', { name: 'Close' }).click();
	await expect(notice).toHaveCount(0);
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
		if (interaction.purchase) {
			await shopDialog
				.getByTestId('shop-buy-grid')
				.getByLabel(interaction.purchase.label, { exact: true })
				.dblclick();
			await expect(
				shopDialog.getByLabel(`Coins: ${interaction.purchase.coinsAfter}`)
			).toBeVisible();
		}
		await shopDialog.getByRole('button', { name: 'Close' }).click();
		await expect(shopDialog).toHaveCount(0);
		await expect(dialogue).toHaveCount(0);
		return;
	}

	await dialogue.getByRole('button', { name: 'Close' }).first().click();
	await expect(dialogue).toHaveCount(0);
}

async function saveInteriorCheckpointAndReload(
	page: Page,
	mapId: string,
	point: Point
): Promise<Point> {
	await saveThroughSaveScreen(page, 1);
	const persisted = await readManualSlotState(page);
	expect(persisted.mapId).toBe(mapId);
	expect(Math.abs(persisted.player?.x - point.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.abs(persisted.player?.y - point.y)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);

	await page.reload();
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
	await waitForHudPosition(page, mapId, point);
	const resumed = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseLastHudState ?? null
	);
	expect(resumed?.mapId).toBe(mapId);
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
	expect(exteriorState?.mapId).toBe('overworld');
	// Frontage proof is behavioral: select the newest authoritative overworld
	// point by event timestamps, then prove the authored door transition with
	// real arrow-key input. Do not compare a keyboard-quantized point to the
	// authored return coordinate before the transition.
	const convergedExterior = await page.evaluate(() => {
		const probeWindow = window as GlieseProbeWindow;
		const state = probeWindow.__glieseLastHudState ?? null;
		const diagnostic = probeWindow.__glieseLastMovementDiagnostic;
		const hudPlayer = state?.areaMap?.player;
		const hudAt = probeWindow.__glieseLastHudAt ?? 0;
		const movementAt = probeWindow.__glieseLastMovementAt ?? 0;
		const player =
			diagnostic?.mapId === 'overworld' && movementAt >= hudAt
				? diagnostic.resolvedPosition
				: hudPlayer;
		return { state, player, diagnostic, hudAt, movementAt };
	});
	expect(convergedExterior.state?.mapId).toBe('overworld');
	expect(convergedExterior.player).toEqual(
		expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
	);
	// The door is one tile from the arrival: up for a building to the north, down for one to the south.
	expect(interior.exteriorDoor.x).toBe(interior.returnArrival.x);
	expect(Math.abs(interior.returnArrival.y - interior.exteriorDoor.y)).toBe(32);
	const doorKey = interior.exteriorDoor.y < interior.returnArrival.y ? 'ArrowUp' : 'ArrowDown';
	await page.locator('canvas').click();
	await page.keyboard.down(doorKey);
	try {
		await page.waitForFunction(
			({ requestedMapId, door, transitionReach }) => {
				const state = (window as GlieseProbeWindow).__glieseLastHudState;
				const diagnostics = (window as GlieseProbeWindow).__glieseMovementDiagnostics ?? [];
				return (
					state?.mapId === requestedMapId &&
					diagnostics.some(
						(diagnostic) =>
							diagnostic.mapId === 'overworld' &&
							Math.abs(diagnostic.requestedPosition.y - door.y) <= transitionReach
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
		await page.keyboard.up(doorKey);
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

function unblockedSouthProgressWitness(input: {
	mapId: string;
	minimumY: number;
	startIndex?: number;
	attempts?: PlayerMovementDiagnostic[];
}): PlayerMovementDiagnostic | false {
	const diagnostics =
		input.attempts ?? (window as GlieseProbeWindow).__glieseMovementDiagnostics ?? [];
	return (
		diagnostics
			.slice(input.startIndex ?? 0)
			.find(
				(attempt) =>
					attempt.mapId === input.mapId &&
					attempt.blocked === false &&
					Number.isFinite(attempt.resolvedPosition.x) &&
					Number.isFinite(attempt.resolvedPosition.y) &&
					attempt.resolvedPosition.y > input.minimumY &&
					attempt.resolvedPosition.y > attempt.previousPosition.y
			) ?? false
	);
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
			{ requestedMapId: 'overworld', interiorMapId: interior.mapId, exit: interior.exit },
			{ timeout: 30_000 }
		);
	} finally {
		await page.keyboard.up('ArrowDown');
	}
	await waitForExactHudPosition(page, 'overworld', interior.returnArrival);
	const state = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseLastHudState ?? null
	);
	expect(state?.mapId).toBe('overworld');
	const player = state?.areaMap?.player;
	expect({ x: player?.x, y: player?.y }).toEqual(interior.returnArrival);
	// The HUD publishes during WorldScene.create() but the camera diagnostic
	// only fires after the first render — reading it right after the HUD wait
	// can still see the interior's snapshot. Wait for a snapshot that is
	// actually stamped 'overworld' before asserting the arrival facing.
	const arrivalFacing = await page
		.waitForFunction(
			() => {
				const diagnostic = (window as GlieseProbeWindow).__glieseLastSceneCameraDiagnostic;
				return diagnostic?.mapId === 'overworld' ? diagnostic.facing : false;
			},
			undefined,
			{ timeout: 10_000 }
		)
		.then((handle) => handle.jsonValue());
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
	const movementStart = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseMovementDiagnostics?.length ?? 0
	);
	await page.locator('canvas').click();
	await page.keyboard.down('ArrowDown');
	const progressWitness = await page
		.waitForFunction(
			unblockedSouthProgressWitness,
			{ mapId: 'overworld', minimumY: before.y, startIndex: movementStart },
			{ timeout: 5_000 }
		)
		.finally(() => page.keyboard.up('ArrowDown'));
	const moved = await page.evaluate(() => {
		const probeWindow = window as GlieseProbeWindow;
		return {
			state: probeWindow.__glieseLastHudState ?? null
		};
	});
	const diagnostic = (await progressWitness.jsonValue()) as PlayerMovementDiagnostic;
	expect(moved.state?.mapId).toBe('overworld');
	expect(diagnostic?.mapId).toBe('overworld');
	expect(diagnostic?.resolvedPosition.y).toBeGreaterThan(before.y);
	expect(diagnostic?.blocked).toBe(false);
	const postWitness = diagnostic?.resolvedPosition ?? moved.state?.areaMap?.player;
	expect(postWitness).toEqual(
		expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
	);
	return { x: postWitness!.x!, y: postWitness!.y! };
}

async function waitForMapBackgroundDiagnostic(
	page: Page,
	mapId: string,
	previousMapDiagnosticCount = 0
) {
	await page.waitForFunction(
		({ requestedMapId, previousCount }) => {
			const diagnostics = (window as GlieseProbeWindow).__glieseRegionalBackgroundDiagnostics ?? [];
			return (
				diagnostics.filter((diagnostic) => diagnostic.mapId === requestedMapId).length >
				previousCount
			);
		},
		{ requestedMapId: mapId, previousCount: previousMapDiagnosticCount },
		{ timeout: 30_000 }
	);
	const diagnostics = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseRegionalBackgroundDiagnostics ?? []
	);
	const diagnostic = [...diagnostics].reverse().find((entry) => entry.mapId === mapId);
	if (!diagnostic)
		throw new Error(`Missing ${mapId} plane diagnostic: ${JSON.stringify(diagnostics)}`);
	return diagnostic;
}

function assertBlacksmithPaintedDiagnostic(diagnostic: RegionalBackgroundPlaneRenderDiagnostic) {
	expect(diagnostic).toMatchObject({
		mapId: 'blacksmith-interior',
		regionalBackgroundsEnabled: true,
		packageId: 'blacksmith-interior-painted',
		presentationMode: 'painted',
		requiredBackgroundIds: ['blacksmith-interior-painted-base-image'],
		selectedBackgroundIds: ['blacksmith-interior-painted-base-image'],
		successfulBackgroundIds: ['blacksmith-interior-painted-base-image'],
		selectedFallbackBlockerIds: [],
		collisionIds: [...BLACKSMITH_COLLISION_IDS],
		statefulObjectIds: [...BLACKSMITH_STATEFUL_OBJECT_IDS]
	});
	expect(diagnostic.entries).toEqual([
		expect.objectContaining({
			id: 'blacksmith-interior-painted-base-image',
			textureKey: 'blacksmith-interior-painted-base',
			plane: 'base',
			status: 'rendered',
			expectedDimensions: { width: 896, height: 704 },
			observedDimensions: { width: 896, height: 704 },
			renderTransform: {
				x: 448,
				y: 352,
				originX: 0.5,
				originY: 0.5,
				displayWidth: 896,
				displayHeight: 704,
				depth: -9
			}
		})
	]);
}

function assertBlacksmithFallbackDiagnostic(diagnostic: RegionalBackgroundPlaneRenderDiagnostic) {
	expect(diagnostic).toMatchObject({
		mapId: 'blacksmith-interior',
		regionalBackgroundsEnabled: true,
		packageId: null,
		presentationMode: 'fallback',
		requiredBackgroundIds: ['blacksmith-interior-painted-base-image'],
		selectedBackgroundIds: [],
		successfulBackgroundIds: [],
		selectedFallbackBlockerIds: [...BLACKSMITH_FALLBACK_BLOCKER_IDS],
		collisionIds: [...BLACKSMITH_COLLISION_IDS],
		statefulObjectIds: [...BLACKSMITH_STATEFUL_OBJECT_IDS]
	});
	expect(diagnostic.entries).toEqual([
		expect.objectContaining({
			id: 'blacksmith-interior-painted-base-image',
			textureKey: 'blacksmith-interior-painted-base',
			plane: 'base',
			status: 'missing-texture',
			expectedDimensions: { width: 896, height: 704 },
			observedDimensions: null
		})
	]);
}

/**
 * Blacksmith runtime evidence: isolated per-test output by default so a
 * plain `bun run test:e2e` never overwrites the shared evidence dir.
 * `BLACKSMITH_EVIDENCE_DOCS=1` opts back into the shared dir for a
 * deliberate refresh; `BLACKSMITH_EVIDENCE_ROOT` captures into a custom dir.
 */
function blacksmithEvidenceRoot(info: TestInfo) {
	if (process.env.BLACKSMITH_EVIDENCE_ROOT) return process.env.BLACKSMITH_EVIDENCE_ROOT;
	if (process.env.BLACKSMITH_EVIDENCE_DOCS === '1') return BLACKSMITH_RUNTIME_EVIDENCE_ROOT;
	return info.outputPath('blacksmith-evidence');
}

async function saveBlacksmithCanvas(page: Page, name: string) {
	return saveInteriorCanvas(page, blacksmithEvidenceRoot(test.info()), 'blacksmith-interior', name);
}

async function saveInteriorCanvas(page: Page, evidenceRoot: string, styleId: string, name: string) {
	mkdirSync(evidenceRoot, { recursive: true });
	await page.evaluate((id) => {
		const style = document.createElement('style');
		style.id = `${id}-runtime-evidence-style`;
		style.textContent = '.game-shell > :not(.game-stage) { visibility: hidden !important; }';
		document.head.append(style);
	}, styleId);
	try {
		await page.locator('canvas').screenshot({
			path: resolve(evidenceRoot, name)
		});
	} finally {
		await page.evaluate(
			(id) => document.getElementById(`${id}-runtime-evidence-style`)?.remove(),
			styleId
		);
	}
}

// Registered first on purpose: at ~3 minutes this sweep is the longest tail
// in the suite, so a worker takes it at t=0 and the rest overlap it.
test('HPA-840 overlay evidence sweep across the required viewport matrix', async ({ page }) => {
	test.setTimeout(testTimeout(540_000));
	// Every overlay also runs a real journey once at 640×360 (the most
	// clip-prone viewport): scroll the inner panel to the last control, then
	// activate a real action with a locator click or keyboard Enter and observe
	// the runtime effect — not just "dialog opened". The other viewport legs
	// prove the heading + Close/Back control render unclipped and the document
	// itself never scrolls, then capture the evidence shot.
	const usePotionFromBag = async (dialog: Locator) => {
		const potion = dialog.getByRole('button', { name: /^field potion$/i }).last();
		await potion.scrollIntoViewIfNeeded({ timeout: 5_000 });
		await expectCenterVisible(potion);
		await potion.click();
		const detail = dialog.getByTestId('inventory-detail');
		await expect(detail).toContainText('Field Potion');
		const action = detail.locator('.bag-detail-action');
		await action.scrollIntoViewIfNeeded({ timeout: 5_000 });
		await expectUnclipped(action);
		await action.press('Enter');
		// Using the potion heals the seeded hp:10 (or consumes a stack if the
		// runtime rejects the heal) — either way a real state change published.
		await expect
			.poll(async () =>
				page.evaluate(() => {
					const s = (window as GlieseProbeWindow).__glieseLastHudState;
					const qty =
						s?.inventory?.consumables?.find((c) => c.itemId === 'field-potion')?.quantity ?? 0;
					return (s?.hp ?? 0) > 10 || qty < 3;
				})
			)
			.toBe(true);
	};

	const equipFromGear = async (dialog: Locator) => {
		const knife = dialog.getByRole('button', { name: /^hunter'?s knife$/i }).last();
		await knife.scrollIntoViewIfNeeded({ timeout: 5_000 });
		await expectCenterVisible(knife);
		await knife.click();
		const detail = dialog.getByTestId('inventory-detail');
		await expect(detail).toContainText("Hunter's Knife");
		const action = detail.locator('.bag-detail-action');
		await action.scrollIntoViewIfNeeded({ timeout: 5_000 });
		await expectUnclipped(action);
		await action.press('Enter');
		await expect
			.poll(async () =>
				page.evaluate(
					() =>
						(window as GlieseProbeWindow).__glieseLastHudState?.inventory?.equipped?.weapon ?? ''
				)
			)
			.toBe('hunters-knife');
	};

	const openQuestDetail = async (dialog: Locator) => {
		// The seeded save has a main quest plus completed chapters. The main row
		// is preselected on open — clicking it again would prove nothing, so the
		// journey activates a previously UNSELECTED completed row and requires
		// both the selection flag and the detail content to change.
		const main = dialog.getByTestId('quest-entry-main');
		const completed = dialog.getByTestId('quest-entry-completed').first();
		await expect(main).toHaveAttribute('aria-pressed', 'true');
		await expect(completed).toHaveAttribute('aria-pressed', 'false');
		const detail = dialog.getByTestId('quest-detail');
		await expect(detail).toBeVisible();
		const beforeText = (await detail.textContent()) ?? '';
		const completedTitle = (await completed.locator('.quest-entry-name').textContent()) ?? '';
		expect(completedTitle.trim()).not.toBe('');
		await completed.scrollIntoViewIfNeeded({ timeout: 5_000 });
		// A quest row can be taller than the 640×360 scroll window — require the
		// actionable centre to be hit-testable rather than a 95% area reveal.
		await expectCenterVisible(completed);
		await completed.click();
		await expect(completed).toHaveAttribute('aria-pressed', 'true');
		await expect(main).toHaveAttribute('aria-pressed', 'false');
		await expect(detail).toContainText(completedTitle.trim());
		expect(((await detail.textContent()) ?? '').trim()).not.toBe(beforeText.trim());
	};

	const closeWithKeyboard = (name: RegExp) => async (dialog: Locator) => {
		const close = dialog.getByRole('button', { name }).first();
		await expectUnclipped(close);
		await close.press('Enter');
		await expect(dialog).toBeHidden();
	};

	const saveIntoManualSlot = async (dialog: Locator) => {
		const slot = dialog.getByTestId('save-slot-1');
		await slot.scrollIntoViewIfNeeded({ timeout: 5_000 });
		await expectCenterVisible(slot);
		await slot.press('Enter');
		await expect(dialog.getByText(/saved/i)).toBeVisible();
	};

	const systemJourney = async (dialog: Locator) => {
		const langRow = dialog.getByTestId('system-language-row');
		await langRow.scrollIntoViewIfNeeded({ timeout: 5_000 });
		await expectCenterVisible(langRow);
		// Keyboard-activate the ja segment — a real locale switch that must
		// re-render the overlay chrome (heading) in the new locale.
		await dialog.locator('[data-focus-id="system-locale-ja"]').press('Enter');
		await expect(dialog.locator('#system-heading')).toHaveText('表示とテキスト');
		await hpa840Shot(page, 'system-ja-640x360.png');
		await dialog.locator('[data-focus-id="system-locale-zh-Hant"]').press('Enter');
		await expect(dialog.locator('#system-heading')).toHaveText('顯示與文字');
		await hpa840Shot(page, 'system-zh-hant-640x360.png');
		// Restore English so the remaining legs keep en labels.
		await dialog.locator('[data-focus-id="system-locale-en"]').press('Enter');
		await expect(dialog.locator('#system-heading')).toHaveText('Display & Text');
	};

	const overlayPlan: {
		tile: string;
		dialogName: RegExp | string;
		/** Locale-agnostic dialog locator when the accessible name localizes. */
		dialogLocator?: () => Locator;
		/** English name of the pinned Close/Back control. */
		close: RegExp;
		viewports: [number, number][];
		journey?: (dialog: Locator) => Promise<void>;
	}[] = [
		{
			tile: 'Bag',
			dialogName: /inventory/i,
			close: /close/i,
			viewports: [
				[640, 360],
				[1280, 640],
				[1280, 719],
				[1280, 720],
				[1920, 1080],
				[390, 844],
				[832, 560]
			],
			journey: usePotionFromBag
		},
		{
			tile: 'Gear',
			dialogName: /inventory/i,
			close: /close/i,
			viewports: [
				[640, 360],
				[1280, 640]
			],
			journey: equipFromGear
		},
		{
			tile: 'Quest',
			dialogName: /quest log/i,
			close: /close/i,
			viewports: [
				[640, 360],
				[1280, 640],
				[1280, 719],
				[1280, 720],
				[1920, 1080],
				[390, 844],
				[832, 560]
			],
			journey: openQuestDetail
		},
		{
			tile: 'Map',
			dialogName: /map$/i,
			close: /close/i,
			viewports: [
				[640, 360],
				[1280, 640],
				[390, 844]
			],
			journey: closeWithKeyboard(/close/i)
		},
		{
			tile: 'Skill',
			dialogName: 'Skill',
			close: /back/i,
			viewports: [
				[640, 360],
				[1280, 640]
			],
			journey: closeWithKeyboard(/back/i)
		},
		{
			tile: 'Save',
			dialogName: /^save$/i,
			close: /back/i,
			viewports: [
				[640, 360],
				[1280, 640]
			],
			journey: saveIntoManualSlot
		},
		{
			tile: 'System',
			dialogName: /display & text/i,
			// The heading IS the accessible name and localizes on switch, so this
			// dialog is located by its stable heading id instead.
			dialogLocator: () => page.locator('[role="dialog"]:has(#system-heading)'),
			close: /close/i,
			viewports: [
				[640, 360],
				[1280, 640],
				[832, 560]
			],
			journey: systemJourney
		}
	];

	await installRuntimeProbes(page);
	// Deeper inventory so the Bag/Gear panels genuinely overflow at 640×360;
	// hp:10 makes the potion's heal observable in the published hud state.
	// questStateAt('gather-moonmoss') seeds a main quest PLUS completed earlier
	// chapters so the Quest journey can select a previously unselected row.
	await injectSave(
		page,
		createSaveFixture({
			player: { level: 1, xp: 0, hp: 10, attack: 3, x: 256, y: 144, facing: 'down' },
			quests: questStateAt('gather-moonmoss'),
			inventory: {
				stacks: [
					{ itemId: 'field-potion', quantity: 3 },
					{ itemId: 'greater-field-potion', quantity: 2 },
					{ itemId: 'ember-tonic', quantity: 2 },
					{ itemId: 'ruin-draught', quantity: 1 },
					{ itemId: 'sunleaf-salve', quantity: 1 },
					{ itemId: 'moonmoss', quantity: 4 }
				],
				equipment: [
					'training-sword',
					'hunters-knife',
					'ruin-blade',
					'iron-cap',
					'traveler-vest',
					'stone-mail',
					'grip-wraps',
					'meadow-charm',
					'practice-spear',
					'ancestral-amulet'
				]
			}
		})
	);
	await continueFromTitle(page);
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	for (const overlay of overlayPlan) {
		for (const [width, height] of overlay.viewports) {
			await page.setViewportSize({ width, height });
			const commandGrid = commandBox(page);
			if (!(await commandGrid.isVisible())) {
				await page.getByRole('button', { name: 'Menu' }).click();
				await expect(commandGrid).toBeVisible();
			}
			await commandGrid.getByRole('button', { name: overlay.tile, exact: true }).click();
			const dialog = overlay.dialogLocator
				? overlay.dialogLocator()
				: page.getByRole('dialog', { name: overlay.dialogName });
			await expect(dialog).toBeVisible();
			// Entrance animation settled = rect stable across two frames.
			await settleMotion(dialog);
			// Opening a dialog lands focus inside it (real focus, not just an
			// activation that could target anything).
			await expectFocusInside(dialog);
			// Pinned chrome must be inside the viewport, not clipped by a
			// scrollable ancestor.
			await expectUnclipped(dialog.getByRole('heading').first());
			await expectUnclipped(dialog.getByRole('button', { name: overlay.close }).first());

			if (width === 640 && height === 360) {
				// Inner-panel scrolling: where the overlay grows a scroller it must
				// move (and the page document must not). Runs BEFORE the Tab pass
				// because focus-into-view already scrolls the panel.
				const scroller = await findInnerScroller(dialog);
				if (scroller) {
					const { before, after } = await scrollInnerPanelToEnd(scroller);
					expect(after).toBeGreaterThan(before);
					// The pinned Close control stays visible after the inner scroll.
					await expectUnclipped(dialog.getByRole('button', { name: overlay.close }).first());
				}
				// Focus containment: Tab cycles through every stop and stays
				// inside the dialog — never falls through to the field HUD.
				await expectTabContained(page, dialog);
				await hpa840Shot(page, `${overlay.tile.toLowerCase()}-${width}x${height}.png`);
				await overlay.journey?.(dialog);
			} else {
				if (width === 1280 && height === 640) {
					// Same containment contract at the second required size.
					await expectTabContained(page, dialog);
				}
				await hpa840Shot(page, `${overlay.tile.toLowerCase()}-${width}x${height}.png`);
			}
			expect(await documentScrollTop(page)).toBe(0);
			if (await dialog.isVisible()) {
				await page.keyboard.press('Escape');
				await expect(dialog).toBeHidden();
			}
			// leaveOverlay reopens the grid and returns focus to the SAME
			// command tile that opened the overlay (field-cmd-<command>).
			await expect(
				page.locator(`[data-focus-id="field-cmd-${overlay.tile.toLowerCase()}"]`)
			).toBeFocused();
		}
	}
	// Leave the command grid before the locale/load legs.
	await page.keyboard.press('Escape');

	// Shop is not a command tile: park the resume save at Mira's approach and
	// open her dialog. injectSave only seeds once per page session, so the
	// second fixture goes through localStorage before the reload.
	const shopSave = createSaveFixture({
		mapId: 'item-shop',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 416, y: 360, facing: 'up' }
	});
	const shopEnvelope = {
		version: 1,
		slots: [
			{
				kind: 'autosave',
				savedAt: new Date().toISOString(),
				playtimeSeconds: 0,
				state: shopSave
			},
			null,
			null
		]
	};
	await page.evaluate(({ key, encoded }) => window.localStorage.setItem(key, encoded), {
		key: SAVES_STORAGE_KEY,
		encoded: JSON.stringify(shopEnvelope)
	});
	await continueFromTitle(page);
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;
		return (
			state?.nearbyShop?.shopId === 'miras-item-shop' ||
			state?.status?.includes('Mira nearby') === true
		);
	});
	for (const [width, height] of [
		[640, 360],
		[1280, 640]
	] as const) {
		await page.setViewportSize({ width, height });
		await page.locator('canvas').click();
		await page.keyboard.press('e', { delay: 50 });
		const miraDialog = page.getByRole('dialog', { name: 'Mira' });
		await expect(miraDialog).toBeVisible();
		await miraDialog.getByRole('button', { name: 'Shop' }).click();
		const shopDialog = page.getByRole('dialog', { name: /herb hut/i });
		await expect(shopDialog).toBeVisible();
		await expect(page.getByTestId('shop-buy-grid')).toBeVisible();
		await settleMotion(shopDialog);
		await expectFocusInside(shopDialog);
		if (width === 640) {
			// Real buy journey: scroll the buy grid, reach the last stock row,
			// open it, and complete a purchase with the detail action. The scroller
			// check runs before the Tab pass (focus-into-view scrolls the grid).
			const scroller = await findInnerScroller(shopDialog);
			if (scroller) {
				const { before, after } = await scrollInnerPanelToEnd(scroller);
				expect(after).toBeGreaterThan(before);
			}
			await expectTabContained(page, shopDialog);
			const lastRow = page.getByTestId('shop-buy-grid').getByRole('button').last();
			await lastRow.scrollIntoViewIfNeeded({ timeout: 5_000 });
			await expectCenterVisible(lastRow);
			await lastRow.click();
			const buyAction = shopDialog.locator('[data-focus-id="shop-detail-action"]');
			await buyAction.scrollIntoViewIfNeeded({ timeout: 5_000 });
			await expectUnclipped(buyAction);
			const purse = shopDialog.getByTestId('shop-purse');
			const purseBefore = (await purse.textContent()) ?? '';
			await buyAction.press('Enter');
			await expect(purse).not.toHaveText(purseBefore);
		}
		await hpa840Shot(page, `shop-${width}x${height}.png`);
		expect(await documentScrollTop(page)).toBe(0);
		await page.keyboard.press('Escape');
		await expect(shopDialog).toBeHidden();
		// The dialogue's Shop button is destroyed when the shop opens, so
		// restoreOverlayFocus falls through to focusFieldStage(): the
		// .game-stage mount — not just "any button" — must hold focus.
		await expect(page.locator('.game-stage')).toBeFocused();
	}

	// Locale legs: switch the language inside the real System overlay, then
	// open Bag in that locale — overlay chrome must re-render localized.
	await page.setViewportSize({ width: 640, height: 360 });
	const menuChip = () => page.getByRole('button', { name: /^(menu|メニュー|選單)$/i });
	const sysDialog = page.locator('[role="dialog"]:has(#system-heading)');
	// The command region's own aria-label follows the live locale.
	const localeGrid = () => commandBox(page, /^(command|コマンド|指令)$/i);
	for (const loc of [
		{ localeId: 'ja', bagTile: 'バッグ', heading: '表示とテキスト' },
		{ localeId: 'zh-Hant', bagTile: '背包', heading: '顯示與文字' }
	] as const) {
		const grid = localeGrid();
		if (!(await grid.isVisible())) {
			await menuChip().click();
			await expect(grid).toBeVisible();
		}
		// The System tile label follows the CURRENT locale.
		await grid.getByRole('button', { name: /^(system|システム|系統)$/i }).click();
		await expect(sysDialog).toBeVisible();
		await settleMotion(sysDialog);
		await sysDialog.locator(`[data-focus-id="system-locale-${loc.localeId}"]`).press('Enter');
		await expect(sysDialog.locator('#system-heading')).toHaveText(loc.heading);
		await page.keyboard.press('Escape');
		await expect(sysDialog).toBeHidden();
		// Focus restore is locale-agnostic: the System tile (field-cmd-system).
		await expect(page.locator('[data-focus-id="field-cmd-system"]')).toBeFocused();
		// Reopen Bag via its localized tile and capture the localized overlay.
		if (!(await grid.isVisible())) {
			await menuChip().click();
			await expect(grid).toBeVisible();
		}
		await grid.getByRole('button', { name: loc.bagTile, exact: true }).click();
		const bagDialog = page.locator('[role="dialog"]:has([data-testid="inventory-detail"])');
		await expect(bagDialog).toBeVisible();
		await settleMotion(bagDialog);
		await hpa840Shot(page, `bag-${loc.localeId.toLowerCase()}-640x360.png`);
		await page.keyboard.press('Escape');
		await expect(bagDialog).toBeHidden();
		await expect(page.locator('[data-focus-id="field-cmd-bag"]')).toBeFocused();
	}
	// Restore English for the remaining legs (tile labels are localized now).
	const restoreGrid = localeGrid();
	if (!(await restoreGrid.isVisible())) {
		await menuChip().click();
		await expect(restoreGrid).toBeVisible();
	}
	await restoreGrid.getByRole('button', { name: '系統', exact: true }).click();
	await expect(sysDialog).toBeVisible();
	await sysDialog.locator('[data-focus-id="system-locale-en"]').press('Enter');
	await expect(sysDialog.locator('#system-heading')).toHaveText('Display & Text');
	await page.keyboard.press('Escape');
	await expect(sysDialog).toBeHidden();
	await expect(page.locator('[data-focus-id="field-cmd-system"]')).toBeFocused();
	await page.keyboard.press('Escape');

	// Load leg: the real Title → Continue → Load picker → resume journey at each
	// required small size. The picker lists the autosave the shop leg wrote;
	// the last size clicks the enabled slot and resumes play.
	for (const [width, height] of [
		[640, 360],
		[1280, 640],
		[1280, 720]
	] as const) {
		await page.setViewportSize({ width, height });
		await page.goto('/');
		await page.getByRole('button', { name: /Continue/i }).click();
		const loadDialog = page.getByRole('dialog', { name: /load/i });
		await expect(loadDialog).toBeVisible();
		await settleMotion(loadDialog);
		await expectFocusInside(loadDialog);
		await expectUnclipped(loadDialog.getByRole('heading').first());
		const loadBack = loadDialog.getByRole('button', { name: /back/i }).first();
		await expectUnclipped(loadBack);
		const scroller = await findInnerScroller(loadDialog);
		if (scroller) {
			const { before, after } = await scrollInnerPanelToEnd(scroller);
			expect(after).toBeGreaterThan(before);
			// Pinned Back control stays visible after the inner scroll.
			await expectUnclipped(loadBack);
		}
		const enabledSlots = loadDialog.locator('[data-testid^="save-slot-"]:not([disabled])');
		expect(await enabledSlots.count()).toBeGreaterThanOrEqual(1);
		// Same containment contract at every required size (scroller check ran
		// first — focus-into-view scrolls the slot list).
		await expectTabContained(page, loadDialog);
		await hpa840Shot(page, `load-${width}x${height}.png`);
		expect(await documentScrollTop(page)).toBe(0);
		if (width === 1280 && height === 720) {
			await enabledSlots.first().click();
			await expect(page.locator('canvas')).toBeVisible();
			await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
			await expect(page.getByText('Loading game')).toHaveCount(0, { timeout: 30_000 });
		} else {
			// Real click on the pinned Back control returns to Title — and
			// closeLoadPicker restores focus onto Continue specifically.
			await loadBack.click();
			await expect(page.getByRole('button', { name: /Continue/i })).toBeVisible();
			await expect(page.locator('[data-focus-id="title-continue"]')).toBeFocused();
		}
	}
});

test('entry map boots with no game console errors', async ({ page }) => {
	// Collect console errors emitted during boot. Phaser logs missing-texture and
	// asset-load failures to console.error, so this catches a broken/missing asset
	// from the entry-map enrichment (terrain tiles, decor packs, etc.). Missing
	// atlas frames and texture keys only surface as console warnings — a stale
	// reference to a deleted sheet is not an error — so those are gated below
	// on an asset-scoped pass over the warning stream.
	const errors: string[] = [];
	const warnings: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') errors.push(msg.text());
		if (msg.type() === 'warning') warnings.push(msg.text());
	});

	await startNewRunFromTitle(page);
	// startNewRunFromTitle returns as soon as the canvas mounts, while BootScene
	// is still preloading textures and audio. Wait for WorldScene's opening
	// dialogue (emitted in WorldScene.create() only after BootScene's loader
	// completes and runtime frames are registered), plus a bounded settle
	// window for any late asset/decode 404.
	await expect(page.getByRole('dialog')).toBeVisible({ timeout: 30_000 });
	await page.waitForTimeout(1_000);

	// Filter benign, game-unrelated noise (e.g. favicon / generic resource 404s and
	// devtools chatter) so the assertion stays meaningful. We deliberately do NOT
	// filter anything that mentions a game asset path, Phaser, texture, or frame
	// failure — a real missing-texture from the enrichment must still fail here.
	const benign = /favicon|\.ico\b/i;
	const gameErrors = errors.filter((text) => !benign.test(text));

	expect(gameErrors).toEqual([]);

	// A boot also logs unrelated browser warnings (WebGL "GPU stall" noise),
	// so instead of asserting on every warning, fail only on ones that name
	// game content — Phaser's "Frame not found in texture" and "No texture
	// found matching key" both land here.
	const gameAsset = /texture|frame|atlas|sprite|tile(set|map)|animation|audio|font|phaser|asset/i;
	expect(warnings.filter((text) => !benign.test(text) && gameAsset.test(text))).toEqual([]);
});

test('game route boots', async ({ page }) => {
	await startNewRunThroughOpening(page);

	const viewport = page.viewportSize();
	const minimap = page.getByTestId('hud-minimap');
	const partyPanel = page.getByTestId('hud-party-panel');
	const sideHud = page.getByTestId('hud-side-panel');
	await expect(minimap).toBeVisible();
	await expect(partyPanel).toBeVisible();
	await expect(sideHud).toBeVisible();
	// Location pill renders the live area name inside the minimap card.
	await expect(minimap.getByText("Grik's House")).toBeVisible();

	const minimapBox = await minimap.boundingBox();
	const partyBox = await partyPanel.boundingBox();
	const sideBox = await sideHud.boundingBox();
	// Hero card top-left, minimap medallion + side HUD top-right.
	expect(partyBox?.x).toBeLessThan(40);
	expect(partyBox?.y).toBeLessThan(40);
	expect(minimapBox?.y).toBeLessThan(40);
	expect((minimapBox?.x ?? 0) + (minimapBox?.width ?? 0)).toBeGreaterThan(
		(viewport?.width ?? 0) - 40
	);
	expect((sideBox?.x ?? 0) + (sideBox?.width ?? 0)).toBeGreaterThan((viewport?.width ?? 0) - 40);

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
			x: 2_896,
			y: 5_904,
			facing: 'down'
		}
	});

	await injectSave(page, save);
	// Seeded inside the pack's aggro radius: the self-playing fight can open
	// before the field HUD's Menu mounts — same boot race as the wolf fight.
	await continueFromTitle(page, { readiness: 'field-or-battle' });

	// The Heroic summary dialog is named by its outcome (Victory / Defeat);
	// /battle summary/i keeps matching the pre-Heroic Arcane naming.
	const battleSummary = page.getByRole('dialog', { name: /battle summary|victory|defeat/i });
	await expect(battleSummary).toBeVisible({ timeout: 30_000 });
	// Heroic summary renders foes defeated as the structured stat tile.
	await expect(battleSummary.getByTestId('battle-stat-foes')).toContainText(/[1-9]/);
	await battleSummary.getByRole('button', { name: /continue/i }).click();
	await expect(battleSummary).toHaveCount(0);
	await expect(fieldStatus(page)).toContainText('Returned from battle');
});

test('fleeing the boar king requires leaving and returning before re-engagement', async ({
	page
}) => {
	test.setTimeout(testTimeout(90_000));
	const home = anchorPoint('silverpine-boar-king');
	const save = {
		...createSaveFixture({
			player: {
				level: 1,
				xp: 0,
				hp: 20,
				attack: 3,
				x: home.x,
				y: home.y + 60,
				facing: 'up'
			},
			clearedEncounters: ['silverpine-wolves-falls', 'silverpine-wolves-terrace']
		}),
		quests: questStateAt('defeat-boar-king')
	};
	await seedSaveSlots(page, [{ state: save }]);
	await page.addInitScript(() => {
		localStorage.setItem(
			'gliese.preferences.v1',
			JSON.stringify({ locale: 'en', textSpeed: 'instant', motion: 'on', promptMode: 'auto' })
		);
		window.addEventListener('gliese:player-movement-diagnostic', (event) => {
			(window as GlieseProbeWindow).__glieseLastMovementDiagnostic = (
				event as CustomEvent<PlayerMovementDiagnostic>
			).detail;
		});
	});
	await page.goto('/?movementDiagnostics=on');
	const battle = page.getByRole('region', { name: 'Battle' });
	await expect(battle).toBeVisible({ timeout: expectTimeout(15_000) });
	await page.keyboard.down('ArrowDown');
	await battle.getByRole('button', { name: 'Flee' }).click();
	await expect(fieldStatus(page)).toContainText(/leave.+return/i, {
		timeout: expectTimeout(10_000)
	});
	await page.keyboard.up('ArrowDown');
	await page.waitForTimeout(5_500);
	await expect(fieldStatus(page)).toContainText(/leave.+return/i);
	await expect(battle).toHaveCount(0);

	await page.evaluate((targetY) => {
		function stopAtLane(event: Event) {
			const movement = (event as CustomEvent<PlayerMovementDiagnostic>).detail;
			if (movement.resolvedPosition.y > targetY) return;
			window.removeEventListener('gliese:player-movement-diagnostic', stopAtLane);
			window.dispatchEvent(
				new KeyboardEvent('keyup', {
					key: 'ArrowUp',
					code: 'ArrowUp',
					keyCode: 38,
					which: 38,
					bubbles: true
				})
			);
		}
		window.addEventListener('gliese:player-movement-diagnostic', stopAtLane);
	}, home.y + 16);
	await page.keyboard.down('ArrowUp');
	await page.waitForFunction(
		(y) =>
			(window as GlieseProbeWindow).__glieseLastMovementDiagnostic?.resolvedPosition.y !==
				undefined &&
			(window as GlieseProbeWindow).__glieseLastMovementDiagnostic!.resolvedPosition.y <= y + 16,
		home.y,
		{ timeout: 15_000 }
	);
	await page.keyboard.up('ArrowUp');
	await page.keyboard.down('ArrowLeft');
	await page.waitForFunction(
		(x) =>
			(window as GlieseProbeWindow).__glieseLastMovementDiagnostic?.resolvedPosition.x !==
				undefined &&
			(window as GlieseProbeWindow).__glieseLastMovementDiagnostic!.resolvedPosition.x <= x - 220,
		home.x,
		{ timeout: 15_000 }
	);
	await page.keyboard.up('ArrowLeft');
	await expect(battle).toHaveCount(0);
	// Stop inside the acquisition zone: flee protection drains in sim time, so
	// under contention it can outlast the return walk — a held ArrowRight then
	// carries the hero through the 200px aggro radius and out of the pocket
	// before the boar may re-engage. A stationary hero stays a legal target.
	await page.evaluate((stopX) => {
		function stopInAcquisitionZone(event: Event) {
			const movement = (event as CustomEvent<PlayerMovementDiagnostic>).detail;
			if (movement.resolvedPosition.x < stopX) return;
			window.removeEventListener('gliese:player-movement-diagnostic', stopInAcquisitionZone);
			window.dispatchEvent(
				new KeyboardEvent('keyup', {
					key: 'ArrowRight',
					code: 'ArrowRight',
					keyCode: 39,
					which: 39,
					bubbles: true
				})
			);
		}
		window.addEventListener('gliese:player-movement-diagnostic', stopInAcquisitionZone);
	}, home.x - 160);
	await page.keyboard.down('ArrowRight');
	await page.waitForFunction(
		(x) =>
			(window as GlieseProbeWindow).__glieseLastMovementDiagnostic?.resolvedPosition.x !==
				undefined &&
			(window as GlieseProbeWindow).__glieseLastMovementDiagnostic!.resolvedPosition.x >= x - 160,
		home.x,
		{ timeout: 15_000 }
	);
	await page.keyboard.up('ArrowRight');
	// The hero now waits in-zone for the re-engagement chase; any grace left in
	// the fled pack's sim-time protection must still drain before it may start.
	await expect(battle.getByRole('button', { name: /Boar King/i })).toBeVisible({ timeout: 30_000 });
});

test('mobile HUD stacks without overlapping controls', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await startNewRunThroughOpening(page);

	const viewport = page.viewportSize();
	const menuButton = page.getByRole('button', { name: 'Menu' });
	const minimap = page.getByTestId('hud-minimap');
	const partyPanel = page.getByTestId('hud-party-panel');
	const sideHud = page.getByTestId('hud-side-panel');
	const fieldStatusMessage = fieldStatus(page);
	await expect(menuButton).toBeVisible();
	await expect(minimap).toBeVisible();
	await expect(partyPanel).toBeVisible();
	await expect(sideHud).toBeVisible();
	await expect(fieldStatusMessage).toBeVisible();

	const menuBox = await menuButton.boundingBox();
	const minimapBox = await minimap.boundingBox();
	const partyBox = await partyPanel.boundingBox();
	const sideBox = await sideHud.boundingBox();
	const fieldStatusBox = await fieldStatusMessage.boundingBox();
	expect(menuBox).not.toBeNull();
	expect(minimapBox).not.toBeNull();
	expect(partyBox).not.toBeNull();
	expect(sideBox).not.toBeNull();
	expect(fieldStatusBox).not.toBeNull();
	const partyRight = partyBox!.x + partyBox!.width;
	// Hero card top-left with the Menu button clear of it top-right.
	expect(partyRight).toBeLessThan(menuBox!.x - 8);
	// Side HUD (minimap / quest / wallet) stacks below the hero card.
	expect(sideBox!.y).toBeGreaterThan(partyBox!.y + partyBox!.height + 8);
	expect((sideBox?.x ?? 0) + (sideBox?.width ?? 0)).toBeLessThanOrEqual((viewport?.width ?? 0) - 8);

	// The opened 2-column command grid stays left of the side HUD.
	await menuButton.click();
	const gridBox = await commandBox(page).boundingBox();
	expect(gridBox).not.toBeNull();
	expect((gridBox?.x ?? 0) + (gridBox?.width ?? 0)).toBeLessThan(sideBox!.x - 8);

	expect(fieldStatusBox!.width).toBeLessThan((viewport?.width ?? 0) * 0.75);
});

test('inventory overlay opens from the menu', async ({ page }) => {
	await injectSave(page, createSaveFixture());
	await continueFromTitle(page);
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Bag' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	const inventorySlotGrid = inventoryDialog.getByTestId('inventory-slot-grid');
	await expect(page.getByRole('heading', { name: 'Potions' })).toBeVisible();
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

	await page.getByRole('tab', { name: 'Gear' }).click();
	await expect(inventoryDialog.getByTestId('inventory-slot')).toHaveCount(24);
	const trainingSwordSlot = inventoryDialog
		.getByTestId('inventory-slot-grid')
		.getByLabel('Training Sword');
	await expect(trainingSwordSlot).toBeVisible();
	await expect(trainingSwordSlot.getByRole('img', { name: 'Training Sword' })).toBeVisible();
	await expect(trainingSwordSlot.getByRole('button', { name: /Equip|Equipped/ })).toHaveCount(0);
	await expect(trainingSwordSlot.getByText('Equipped')).toBeVisible();
});

test('area map opens from the menu and closes back to field HUD', async ({ page }) => {
	await startNewRunThroughOpening(page);

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Map' }).click();

	const mapDialog = page.getByRole('dialog', { name: /map$/i });
	await expect(mapDialog).toBeVisible();
	await expect(mapDialog.getByTestId('area-map-svg')).toBeVisible();
	await expect(mapDialog.getByTestId('area-map-player')).toBeVisible();

	await mapDialog.getByRole('button', { name: 'Close' }).click();
	await expect(mapDialog).toHaveCount(0);
	await expect(commandBox(page)).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(commandBox(page)).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
	await expect(fieldStatus(page)).toBeVisible();
});

const openFieldPosition = { x: 4_336, y: 7_856, facing: 'down' };

async function tabFocusMenu(page: Page) {
	const menu = page.getByRole('button', { name: 'Menu' });
	for (let attempt = 0; attempt < 10; attempt += 1) {
		if (await menu.evaluate((element) => element === document.activeElement)) return;
		await page.keyboard.press('Tab');
	}
}

type ActivationProbe = {
	menuClicks: number;
	commandClicks: number;
	windowKeys: string[];
	interactions: number;
};

async function installActivationProbe(page: Page) {
	await page.evaluate(() => {
		const probe: ActivationProbe = {
			menuClicks: 0,
			commandClicks: 0,
			windowKeys: [],
			interactions: 0
		};
		(window as unknown as { __glieseKeyProbe: ActivationProbe }).__glieseKeyProbe = probe;
		const menu = document.querySelector<HTMLButtonElement>(
			'button[aria-controls="game-command-panel"]'
		);
		menu?.addEventListener('click', () => {
			probe.menuClicks += 1;
		});
		document.addEventListener('click', (event) => {
			const target = event.target as HTMLElement | null;
			if (target?.closest('[role="region"][aria-label="Command"]')) probe.commandClicks += 1;
		});
		window.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				probe.windowKeys.push(`keydown:${event.key}`);
			}
		});
		window.addEventListener('keyup', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				probe.windowKeys.push(`keyup:${event.key}`);
			}
		});
		window.addEventListener('gliese:hud-state', (event) => {
			const detail = (event as CustomEvent).detail as
				| { dialogue?: unknown; status?: unknown }
				| undefined;
			if (detail?.dialogue || detail?.status) probe.interactions += 1;
		});
	});
}

function readActivationProbe(page: Page): Promise<ActivationProbe> {
	return page.evaluate(
		() => (window as unknown as { __glieseKeyProbe: ActivationProbe }).__glieseKeyProbe
	);
}

test('trusted Enter activates the focused field Menu and command tiles without world interaction', async ({
	page
}) => {
	await injectSave(
		page,
		createSaveFixture({
			player: { level: 1, xp: 0, hp: 20, attack: 3, ...openFieldPosition }
		})
	);
	await continueFromTitle(page);
	await installActivationProbe(page);

	const menu = page.getByRole('button', { name: 'Menu' });
	const command = commandBox(page);
	const traveler = page.getByRole('dialog', { name: 'Traveler' });
	await tabFocusMenu(page);
	await expect(menu).toBeFocused();

	await page.keyboard.press('Enter');
	let probe = await readActivationProbe(page);
	expect(probe.menuClicks).toBe(1);
	expect(probe.windowKeys).toEqual([]);
	await expect(command).toBeVisible();
	await expect(traveler).toHaveCount(0);

	await command.getByRole('button', { name: 'Map' }).focus();
	await page.keyboard.press('Enter');
	probe = await readActivationProbe(page);
	expect(probe.commandClicks).toBe(1);
	expect(probe.windowKeys).toEqual([]);
	const mapDialog = page.getByRole('dialog', { name: /map$/i });
	await expect(mapDialog).toBeVisible();
	await expect(traveler).toHaveCount(0);

	await page.keyboard.press('Escape');
	await expect(command).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(command).toHaveCount(0);
	await expect(page.locator('.game-stage')).toBeFocused();
	// World interaction fetches story dialogue asynchronously; wait a bounded
	// window before asserting no stray key, interaction, or dialog fired.
	await page.waitForTimeout(250);

	probe = await readActivationProbe(page);
	expect(probe.menuClicks).toBe(1);
	expect(probe.commandClicks).toBe(1);
	expect(probe.windowKeys).toEqual([]);
	expect(probe.interactions).toBe(0);
	await expect(traveler).toHaveCount(0);
});

test('trusted Space activates the focused field Menu without world interaction', async ({
	page
}) => {
	await injectSave(
		page,
		createSaveFixture({
			player: { level: 1, xp: 0, hp: 20, attack: 3, ...openFieldPosition }
		})
	);
	await continueFromTitle(page);
	await installActivationProbe(page);

	const menu = page.getByRole('button', { name: 'Menu' });
	const command = commandBox(page);
	const traveler = page.getByRole('dialog', { name: 'Traveler' });
	await tabFocusMenu(page);
	await expect(menu).toBeFocused();

	await page.keyboard.press('Space');
	let probe = await readActivationProbe(page);
	expect(probe.menuClicks).toBe(1);
	expect(probe.windowKeys).toEqual([]);
	await expect(command).toBeVisible();
	await expect(traveler).toHaveCount(0);

	await page.keyboard.press('Escape');
	await expect(command).toHaveCount(0);
	await expect(page.locator('.game-stage')).toBeFocused();
	// Same as above: give any leaked interaction + async story fetch time to
	// surface before asserting the negative.
	await page.waitForTimeout(250);

	probe = await readActivationProbe(page);
	expect(probe.menuClicks).toBe(1);
	expect(probe.windowKeys).toEqual([]);
	expect(probe.interactions).toBe(0);
	await expect(traveler).toHaveCount(0);
});

test('trusted Enter activates a focused command tile opened by pointer exactly once', async ({
	page
}) => {
	await injectSave(
		page,
		createSaveFixture({
			player: { level: 1, xp: 0, hp: 20, attack: 3, ...openFieldPosition }
		})
	);
	await continueFromTitle(page);
	await installActivationProbe(page);

	const menu = page.getByRole('button', { name: 'Menu' });
	await menu.click();
	const command = commandBox(page);
	await expect(command).toBeVisible();
	let probe = await readActivationProbe(page);
	expect(probe.menuClicks).toBe(1);

	const mapTile = command.getByRole('button', { name: 'Map', exact: true });
	await mapTile.focus();
	await page.keyboard.press('Enter');

	probe = await readActivationProbe(page);
	expect(probe.commandClicks).toBe(1);
	expect(probe.windowKeys).toEqual([]);
	const mapDialog = page.getByRole('dialog', { name: /map$/i });
	await expect(mapDialog).toBeVisible();
	await expect(page.getByRole('dialog', { name: 'Traveler' })).toHaveCount(0);
	expect(probe.interactions).toBe(0);
});

test('Escape ladder returns through Command one level at a time', async ({ page }) => {
	await injectSave(
		page,
		createSaveFixture({
			player: { level: 1, xp: 0, hp: 20, attack: 3, ...openFieldPosition }
		})
	);
	await continueFromTitle(page);

	const menu = page.getByRole('button', { name: 'Menu' });
	const command = commandBox(page);

	await page.keyboard.press('Escape');
	await expect(command).toBeVisible();
	await expect(command.getByRole('button', { name: 'Bag' })).toBeFocused();

	await page.keyboard.press('ArrowRight');
	await expect(command.getByRole('button', { name: 'Gear' })).toBeFocused();
	await page.keyboard.press('Enter');
	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	await expect(inventoryDialog).toBeVisible();
	await expect(inventoryDialog.getByRole('tab', { name: 'Gear' })).toHaveAttribute(
		'aria-selected',
		'true'
	);

	await page.keyboard.press('Escape');
	await expect(inventoryDialog).toHaveCount(0);
	await expect(command).toBeVisible();
	await expect(command.getByRole('button', { name: 'Gear' })).toBeFocused();

	await page.keyboard.press('Escape');
	await expect(command).toHaveCount(0);
	await expect(menu).not.toBeFocused();
	await expect(page.locator('.game-stage')).toBeFocused();

	await page.keyboard.press('Space');
	await expect(command).toHaveCount(0);
});

test('a pointer-picked command tile owns the return focus in a keyboard-opened Command', async ({
	page
}) => {
	await injectSave(
		page,
		createSaveFixture({
			player: { level: 1, xp: 0, hp: 20, attack: 3, ...openFieldPosition }
		})
	);
	await continueFromTitle(page);

	const command = commandBox(page);
	await page.keyboard.press('Escape');
	await expect(command).toBeVisible();

	const bagTile = command.getByRole('button', { name: 'Bag', exact: true });
	await bagTile.focus();
	const mapTile = command.getByRole('button', { name: 'Map', exact: true });
	await mapTile.dispatchEvent('click');

	const mapDialog = page.getByRole('dialog', { name: /map$/i });
	await expect(mapDialog).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(mapDialog).toHaveCount(0);

	await expect(command).toBeVisible();
	await expect(mapTile).toBeFocused();
});

test('E on genuinely empty ground opens no dialogue and publishes no status', async ({ page }) => {
	await injectSave(
		page,
		createSaveFixture({
			player: { level: 1, xp: 0, hp: 20, attack: 3, ...openFieldPosition }
		})
	);
	await continueFromTitle(page);

	const statusBefore = await fieldStatus(page).textContent();
	// Hold 'e' across frames: a zero-delay press can have its JustDown edge
	// cleared by keyup before any update consumes it (~200ms/frame under CI
	// contention — see the sealed-gate comment below), which would let this
	// absence-only test pass without the interact ever being delivered.
	await page.keyboard.down('e');
	await page.waitForTimeout(500);
	await page.keyboard.up('e');
	// Wait a bounded window so an unintended async dialogue fetch or status
	// publish has time to surface before asserting absence.
	await page.waitForTimeout(250);

	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(fieldStatus(page)).toHaveText(statusBefore ?? '');
});

const southGateApproach = { x: 5_392, y: 8_688, facing: 'down' };

test('E facing the south-road sealed gate reports the way barred without a dialogue', async ({
	page
}) => {
	await injectSave(
		page,
		createSaveFixture({
			player: { level: 1, xp: 0, hp: 20, attack: 3, ...southGateApproach }
		})
	);
	await continueFromTitle(page);

	// A lone press's edge likely died with its hold: Phaser v4 clears
	// Key._justDown in onUp, and WorldScene drains JustDown every frame — at
	// ~200ms/frame under CI contention (run 45297648388) a zero-delay press can
	// clear before any update consumes it, with no evidence the interact
	// ever ran. Hold 'e' until the real interact path lands the barred
	// line: the first update in the window consumes the edge once, and held
	// repeats cannot re-fire it (onDown only re-arms while !isDown).
	await page.keyboard.down('e');
	try {
		await expect(fieldStatus(page)).toContainText(/barred/i);
	} finally {
		await page.keyboard.up('e');
	}
	await page.waitForTimeout(250);

	await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('language preference shows Japanese chrome and keeps Japanese selected', async ({ page }) => {
	await startNewRunThroughOpening(page);
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	// Japanese is chosen on the Heroic System surface (segmented control).
	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'System', exact: true }).click();
	const systemDialog = page.getByRole('dialog', { name: /display & text/i });
	await expect(systemDialog).toBeVisible();
	// Selecting 日本語 re-renders the chrome (and this dialog's name) in Japanese.
	await systemDialog.getByRole('button', { name: '日本語' }).click();
	const japaneseDialog = page.getByRole('dialog', { name: '表示とテキスト' });
	await expect(japaneseDialog.getByRole('button', { name: '日本語' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await japaneseDialog.getByRole('button', { name: '閉じる' }).click();
	await expect(japaneseDialog).toHaveCount(0);

	// The command chrome flips to Japanese; the bag opens on the Potions rail.
	await commandBox(page, 'コマンド').getByRole('button', { name: 'バッグ' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: '持ち物' });
	await expect(inventoryDialog).toBeVisible();
	await expect(inventoryDialog.getByRole('heading', { name: 'ポーション' })).toBeVisible();
	await expect(inventoryDialog.getByRole('tab', { name: 'ポーション', exact: true })).toBeVisible();
	await inventoryDialog.getByRole('button', { name: '閉じる' }).click();

	await commandBox(page, 'コマンド').getByRole('button', { name: 'システム' }).click();
	await expect(
		page.getByRole('dialog', { name: '表示とテキスト' }).getByRole('button', { name: '日本語' })
	).toHaveAttribute('aria-pressed', 'true');
});

test('full hp potions explain why they cannot be consumed', async ({ page }) => {
	await injectSave(page, createSaveFixture());
	await continueFromTitle(page);
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Bag' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	const fieldPotionSlot = inventoryDialog
		.getByTestId('inventory-slot-grid')
		.getByLabel('Field Potion');
	await expect(fieldPotionSlot).toBeVisible();
	await expect(fieldPotionSlot.getByRole('button', { name: 'Use' })).toHaveCount(0);
	// Selecting the potion shows its description in the detail panel.
	await fieldPotionSlot.click();
	await expect(page.getByTestId('inventory-detail')).toContainText('Restores 8 HP.');
	await fieldPotionSlot.dblclick();
	await inventoryDialog.getByRole('button', { name: 'Close' }).click();
	await page.keyboard.press('Escape');
	// The status pill only renders while the command grid is closed (Task 4).
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
	await continueFromTitle(page);
	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Bag' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	await page.getByRole('tab', { name: 'Gear' }).click();
	const ironCapSlot = inventoryDialog.getByTestId('inventory-slot-grid').getByLabel('Iron Cap');
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
			window.localStorage.setItem(
				payload.key,
				JSON.stringify({
					version: 1,
					slots: [
						{
							kind: 'autosave',
							savedAt: new Date().toISOString(),
							playtimeSeconds: 0,
							state: JSON.parse(payload.encoded)
						},
						null,
						null
					]
				})
			);
		},
		{ encoded: JSON.stringify(save), key: SAVES_STORAGE_KEY }
	);
	await continueFromTitle(page);
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;

		return state?.nearbyShop?.shopId === 'miras-item-shop' || state?.status?.startsWith('Mira:');
	});
	// The Heroic command grid has no Shop tile: talk to Mira and enter the
	// shop through the dialogue action.
	await page.locator('canvas').click();
	await page.keyboard.press('e', { delay: 50 });
	const miraDialog = page.getByRole('dialog', { name: 'Mira' });
	await expect(miraDialog).toBeVisible();
	await miraDialog.getByRole('button', { name: 'Shop' }).click();

	await expect(page.getByRole('heading', { name: "Mira's Herb Hut" })).toBeVisible();
	await expect(page.getByLabel('Coins: 30')).toBeVisible();
	const buyGrid = page.getByTestId('shop-buy-grid');
	await expect
		.soft(
			await buyGrid.evaluate(
				(element) => getComputedStyle(element).gridTemplateColumns.split(' ').length
			)
		)
		.toBe(4);
	const fieldPotionBuyTile = buyGrid.getByLabel('Field Potion', { exact: true });
	await expect(fieldPotionBuyTile.getByRole('img', { name: 'Field Potion' })).toBeVisible();
	await expect(fieldPotionBuyTile.getByText('Restores 8 HP.')).toHaveCount(0);
	await expect(fieldPotionBuyTile.getByRole('button', { name: 'Buy' })).toHaveCount(0);
	await fieldPotionBuyTile.hover();
	await expect(page.getByRole('tooltip')).toContainText('Restores 8 HP.');

	await fieldPotionBuyTile.dblclick();
	await expect(page.getByLabel('Coins: 20')).toBeVisible();

	await page.getByRole('tab', { name: 'Sell' }).click();
	const sellGrid = page.getByTestId('shop-sell-grid');
	await expect
		.soft(
			await sellGrid.evaluate(
				(element) => getComputedStyle(element).gridTemplateColumns.split(' ').length
			)
		)
		.toBe(4);
	const fieldPotionSellTile = sellGrid.getByLabel('Field Potion', { exact: true });
	await expect(fieldPotionSellTile.getByRole('img', { name: 'Field Potion' })).toBeVisible();
	await expect(fieldPotionSellTile.getByText('Restores 8 HP.')).toHaveCount(0);
	await expect(fieldPotionSellTile.getByRole('button', { name: 'Sell' })).toHaveCount(0);
	await fieldPotionSellTile.hover();
	await expect(page.getByRole('tooltip')).toContainText('Restores 8 HP.');
	await fieldPotionSellTile.dblclick();
	await expect(page.getByLabel('Coins: 25')).toBeVisible();
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
			window.localStorage.setItem(
				payload.key,
				JSON.stringify({
					version: 1,
					slots: [
						{
							kind: 'autosave',
							savedAt: new Date().toISOString(),
							playtimeSeconds: 0,
							state: JSON.parse(payload.encoded)
						},
						null,
						null
					]
				})
			);
		},
		{ encoded: JSON.stringify(save), key: SAVES_STORAGE_KEY }
	);
	// Instant reveal keeps the confirm grammar deterministic: the single line
	// renders complete, so one confirm advances into the choice treatment.
	await page.addInitScript(() =>
		window.localStorage.setItem(
			'gliese.preferences.v1',
			JSON.stringify({ locale: 'en', textSpeed: 'instant', motion: 'on', promptMode: 'auto' })
		)
	);
	await continueFromTitle(page);
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;

		return state?.nearbyShop?.shopId === 'miras-item-shop' || state?.status?.startsWith('Mira:');
	});

	await page.locator('canvas').click();
	await page.keyboard.press('e', { delay: 50 });

	const miraDialog = page.getByRole('dialog', { name: 'Mira' });
	await expect(miraDialog).toBeVisible();
	await miraDialog.getByRole('button', { name: 'Next' }).click();
	await miraDialog.getByRole('button', { name: 'Shop' }).click();

	const shopDialog = page.getByRole('dialog', { name: "Mira's Herb Hut" });
	await expect(shopDialog).toBeVisible();
	await shopDialog
		.getByTestId('shop-buy-grid')
		.getByLabel('Field Potion', { exact: true })
		.dblclick();
	await expect(shopDialog.getByLabel('Coins: 20')).toBeVisible();
	await shopDialog.getByRole('button', { name: 'Close' }).click();

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Bag' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	const fieldPotionSlot = inventoryDialog.getByLabel('Field Potion');
	await expect(inventoryDialog.getByTestId('inventory-slot')).toHaveCount(24);
	await expect(fieldPotionSlot).toBeVisible();
	await expect(fieldPotionSlot.getByText('x2')).toBeVisible();
});

test('HPA-839 Mira salve economy, potion prices, and tooltip clearance', async ({ page }) => {
	test.setTimeout(testTimeout(300_000));

	type PassLocale = 'en' | 'ja' | 'zh-Hant';
	type PassCopy = {
		// The dialogue panel's accessible name is the story speaker string —
		// 'Mira' in every locale — while the shop dialog takes the localized
		// shop name.
		miraName: string;
		shopName: string;
		shopChoice: string;
		nextChoice: string;
		closeName: string;
		salveName: string;
		fieldPotionName: string;
		greaterPotionName: string;
		coins: (n: number) => string;
	};
	const passCopy: Record<PassLocale, PassCopy> = {
		en: {
			miraName: 'Mira',
			shopName: "Mira's Herb Hut",
			shopChoice: 'Shop',
			nextChoice: 'Next',
			closeName: 'Close',
			salveName: 'Sunleaf Salve',
			fieldPotionName: 'Field Potion',
			greaterPotionName: 'Greater Field Potion',
			coins: (n) => `Coins: ${n}`
		},
		ja: {
			miraName: 'Mira',
			shopName: 'ミラの薬草小屋',
			shopChoice: '店',
			nextChoice: '次へ',
			closeName: '閉じる',
			salveName: '陽葉軟膏',
			fieldPotionName: 'フィールドポーション',
			greaterPotionName: '上級フィールドポーション',
			coins: (n) => `コイン: ${n}`
		},
		'zh-Hant': {
			miraName: 'Mira',
			shopName: '米拉的採藥小屋',
			shopChoice: '商店',
			nextChoice: '下一步',
			closeName: '關閉',
			salveName: '日葉藥膏',
			fieldPotionName: '野外藥水',
			greaterPotionName: '強效野外藥水',
			coins: (n) => `金幣：${n}`
		}
	};

	// hp 10 < max 20 so the drink-a-salve step has headroom to heal 6.
	const miraSeed = () =>
		createSaveFixture({
			mapId: 'item-shop',
			player: { level: 1, xp: 0, hp: 10, attack: 3, x: 416, y: 360, facing: 'up' },
			wallet: { coins: 30 }
		});
	const miraEnvelope = () =>
		JSON.stringify({
			version: 1,
			slots: [
				{
					kind: 'autosave',
					savedAt: '2026-09-04T12:00:00.000Z',
					playtimeSeconds: 0,
					state: miraSeed()
				},
				null,
				null
			]
		});

	await seedSaveSlots(page, [{ state: miraSeed() }]);
	await installHudStateListener(page);
	// Seeded preferences must not clobber a locale chosen later: later passes
	// rewrite the preference before reload, and only the first write wins.
	await page.addInitScript(() => {
		if (!window.localStorage.getItem('gliese.preferences.v1')) {
			window.localStorage.setItem(
				'gliese.preferences.v1',
				JSON.stringify({ locale: 'en', textSpeed: 'instant', motion: 'on', promptMode: 'auto' })
			);
		}
	});
	await continueFromTitle(page);
	const readHud = () => readHudState(page);
	const waitAtMira = () =>
		page.waitForFunction(
			() =>
				(window as GlieseProbeWindow).__glieseLastHudState?.nearbyShop?.shopId ===
				'miras-item-shop',
			undefined,
			{ timeout: 15_000 }
		);
	await waitAtMira();

	const openMiraShop = async (copy: PassCopy) => {
		const miraDialog = await pressInteractUntilDialog(page, copy.miraName);
		// Mira's greeting lines end on the shop/close choice row; advance Next
		// lines until the Shop choice is actually rendered.
		for (let press = 0; press < 6; press += 1) {
			const shopChoice = miraDialog.getByRole('button', { name: copy.shopChoice, exact: true });
			if (await shopChoice.isVisible().catch(() => false)) {
				await shopChoice.click();
				return;
			}
			await miraDialog.getByRole('button', { name: copy.nextChoice }).click();
		}
		throw new Error('Mira dialogue never offered the Shop choice');
	};

	// Measures the rendered tooltip, the selected item's Buy/Sell action, the
	// stock column and the dialog frame, then hit-tests the action's center.
	// Text clipping is measured too: a control can sit fully on-screen while a
	// localized label still overflows its box.
	const measureShopLayout = () =>
		page.evaluate(() => {
			const rect = (selector: string) => {
				const el = document.querySelector<HTMLElement>(selector);
				if (!el) return null;
				const r = el.getBoundingClientRect();
				return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
			};
			const textOverflows = (selector: string) => {
				const el = document.querySelector<HTMLElement>(selector);
				if (!el) return null;
				return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
			};
			const actionEl = document.querySelector<HTMLElement>('.shop-detail-action');
			let actionHit = false;
			if (actionEl) {
				const r = actionEl.getBoundingClientRect();
				const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
				actionHit = hit === actionEl || actionEl.contains(hit);
			}
			return {
				tooltip: rect('.shop-tooltip'),
				action: rect('.shop-detail-action'),
				main: rect('.shop-main'),
				dialog: rect('.shop-screen'),
				actionHit,
				actionTextOverflows: textOverflows('.shop-detail-action'),
				detailNameOverflows: textOverflows('.shop-detail-name'),
				tooltipNameOverflows: textOverflows('.shop-tooltip-name'),
				viewport: { width: window.innerWidth, height: window.innerHeight }
			};
		});

	type ShopLayout = Awaited<ReturnType<typeof measureShopLayout>>;

	const expectTooltipClear = (m: ShopLayout) => {
		expect(m.tooltip, 'tooltip rendered').not.toBeNull();
		expect(m.action, 'selected detail action rendered').not.toBeNull();
		expect(m.main).not.toBeNull();
		expect(m.dialog, 'shop dialog rendered').not.toBeNull();
		const tooltip = m.tooltip!;
		const action = m.action!;
		const main = m.main!;
		const dialog = m.dialog!;
		// The tooltip is clamped inside the stock column and on-screen.
		expect(tooltip.left).toBeGreaterThanOrEqual(main.left - 1);
		expect(tooltip.right).toBeLessThanOrEqual(main.right + 1);
		expect(tooltip.top).toBeGreaterThanOrEqual(main.top - 1);
		expect(tooltip.bottom).toBeLessThanOrEqual(main.bottom + 1);
		expect(tooltip.left).toBeGreaterThanOrEqual(0);
		expect(tooltip.right).toBeLessThanOrEqual(m.viewport.width);
		expect(tooltip.bottom).toBeLessThanOrEqual(m.viewport.height);
		// HPA-839 regression: the tooltip must not cover the Buy/Sell action.
		const overlaps = !(
			tooltip.right <= action.left ||
			tooltip.left >= action.right ||
			tooltip.bottom <= action.top ||
			tooltip.top >= action.bottom
		);
		expect(overlaps, 'tooltip must not cover the Buy/Sell action').toBe(false);
		expect(m.actionHit, 'Buy/Sell action hit-testable').toBe(true);
		// The action's complete bounds must sit inside the dialog and on-screen —
		// a partially clipped/offscreen action passes a center-only hit test.
		expect(action.left, 'action left edge inside dialog').toBeGreaterThanOrEqual(dialog.left - 1);
		expect(action.right, 'action right edge inside dialog').toBeLessThanOrEqual(dialog.right + 1);
		expect(action.top, 'action top edge inside dialog').toBeGreaterThanOrEqual(dialog.top - 1);
		expect(action.bottom, 'action bottom edge inside dialog').toBeLessThanOrEqual(
			dialog.bottom + 1
		);
		expect(action.left).toBeGreaterThanOrEqual(0);
		expect(action.right).toBeLessThanOrEqual(m.viewport.width);
		expect(action.top).toBeGreaterThanOrEqual(0);
		expect(action.bottom).toBeLessThanOrEqual(m.viewport.height);
		// Localized labels must not silently clip inside their boxes.
		expect(m.actionTextOverflows, 'action label text clipped').toBe(false);
		expect(m.detailNameOverflows, 'detail item name clipped').toBe(false);
		expect(m.tooltipNameOverflows, 'tooltip item name clipped').toBe(false);
	};

	// Moves DOM focus through the shop dialog the way a real keyboard does:
	// arrows rove the data-focus lattice (the pad path), while the Buy/Sell
	// tab rail roves arrows between its tabs by design — Tab is the genuine
	// keyboard exit off the rail into the stock panel. Bounded: a small
	// dialog resolves in a dozen presses.
	const focusedElement = () => page.evaluateHandle(() => document.activeElement);
	const waitForFocusChange = (previous: JSHandle) =>
		page
			.waitForFunction((prev) => document.activeElement !== prev, previous, { timeout: 400 })
			.catch(() => undefined);
	const keyboardFocusTo = async (focusId: string) => {
		for (let step = 0; step < 16; step += 1) {
			const state = await page.evaluate((id) => {
				const active = document.activeElement;
				if (active?.getAttribute('data-focus-id') === id) return { done: true as const };
				const axis = (el: Element | null, attr: string) =>
					Number(el?.getAttribute(attr) ?? Number.NaN);
				const target = document.querySelector(`[data-focus-id="${id}"]`);
				return {
					done: false as const,
					activeId: active?.getAttribute('data-focus-id') ?? null,
					activeInDialog: active?.closest('[role="dialog"]') !== null,
					activeIsTab: active?.getAttribute('role') === 'tab',
					targetIsTab: target?.getAttribute('role') === 'tab',
					targetExists: target !== null,
					dRow: axis(target, 'data-focus-row') - axis(active, 'data-focus-row'),
					dCol: axis(target, 'data-focus-column') - axis(active, 'data-focus-column')
				};
			}, focusId);
			if (state.done) return;
			expect(state.targetExists, `focus target ${focusId} rendered`).toBe(true);
			const previous = await focusedElement();
			// Inside the dialog but off-lattice (rail Close) or on a tab whose
			// target sits off the rail: Tab walks DOM order into the panel —
			// an arrow would rove the rail or snap to the first lattice node.
			const key =
				(state.activeId === null && state.activeInDialog) ||
				(state.activeIsTab && !state.targetIsTab)
					? 'Tab'
					: state.dRow !== 0
						? state.dRow > 0
							? 'ArrowDown'
							: 'ArrowUp'
						: state.dCol !== 0
							? state.dCol > 0
								? 'ArrowRight'
								: 'ArrowLeft'
							: 'ArrowDown';
			await page.keyboard.press(key);
			await waitForFocusChange(previous);
			await previous.dispose();
		}
		throw new Error(`keyboard focus did not reach ${focusId}`);
	};

	// ---- Pass 1: full economy + geometry at 1280×720 (en) ----
	const en = passCopy.en;
	await openMiraShop(en);
	const shop = page.getByRole('dialog', { name: en.shopName });
	await expect(shop).toBeVisible();
	await expect(shop.getByLabel('Coins: 30')).toBeVisible();
	const buyGrid = shop.getByTestId('shop-buy-grid');
	// The herb shop's own prices: salve 6, Field Potion 10, Greater 18.
	await expect(
		buyGrid.getByLabel(en.salveName, { exact: true }).locator('.shop-tile-price')
	).toHaveText('6');
	await expect(
		buyGrid.getByLabel(en.fieldPotionName, { exact: true }).locator('.shop-tile-price')
	).toHaveText('10');
	await expect(
		buyGrid.getByLabel(en.greaterPotionName, { exact: true }).locator('.shop-tile-price')
	).toHaveText('18');

	// Select the salve so the detail action exists, then hover/focus other
	// tiles: the tooltip must stay inside the stock column and clear of it.
	await buyGrid.getByLabel(en.salveName, { exact: true }).click();
	await expect(shop.locator('.shop-detail-action')).toBeVisible();
	await buyGrid.getByLabel(en.greaterPotionName, { exact: true }).hover();
	await expect(shop.locator('.shop-tooltip')).toBeVisible();
	let layout = await measureShopLayout();
	expectTooltipClear(layout);
	await expectUnclipped(shop.locator('.shop-detail-action'));
	await hpa839Shot(page, 'mira-shop-1280x720-en-tooltip.png');
	await buyGrid.getByLabel(en.fieldPotionName, { exact: true }).focus();
	await expect(shop.locator('.shop-tooltip')).toContainText(en.fieldPotionName);
	layout = await measureShopLayout();
	expectTooltipClear(layout);
	await expectUnclipped(shop.locator('.shop-detail-action'));
	// Clicking the action twice proves it is hit-testable both times; each
	// salve costs exactly 6 coins.
	await shop.locator('.shop-detail-action').click();
	await expect(shop.getByLabel('Coins: 24')).toBeVisible();
	await shop.locator('.shop-detail-action').click();
	await expect(shop.getByLabel('Coins: 18')).toBeVisible();
	expect(
		(await readHud())?.inventory?.consumables?.find((item) => item.itemId === 'sunleaf-salve')
			?.quantity
	).toBe(2);
	await shop.getByRole('button', { name: 'Close' }).click();

	// Drink one salve below max HP: exactly +6 (10 → 16).
	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Bag' }).click();
	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	const salveSlot = inventoryDialog.getByLabel(en.salveName, { exact: true });
	await salveSlot.click();
	await expect(inventoryDialog.getByTestId('inventory-detail')).toBeVisible();
	await inventoryDialog.getByRole('button', { name: 'Drink' }).click();
	await expect.poll(async () => (await readHud())?.hp).toBe(16);
	expect(
		(await readHud())?.inventory?.consumables?.find((item) => item.itemId === 'sunleaf-salve')
			?.quantity
	).toBe(1);
	await inventoryDialog.getByRole('button', { name: 'Close' }).click();
	await page.keyboard.press('Escape');

	// Back into the shop: sell the remaining salve for exactly 3 coins.
	await openMiraShop(en);
	await expect(shop).toBeVisible();
	await shop.getByRole('tab', { name: 'Sell' }).click();
	const sellGrid = shop.getByTestId('shop-sell-grid');
	const salveSellTile = sellGrid.getByLabel(en.salveName, { exact: true });
	await expect(salveSellTile.locator('.shop-tile-price')).toHaveText('3');
	await salveSellTile.click();
	await expect(shop.locator('.shop-detail-action')).toBeVisible();
	await sellGrid.getByLabel(en.fieldPotionName, { exact: true }).hover();
	layout = await measureShopLayout();
	expectTooltipClear(layout);
	await expectUnclipped(shop.locator('.shop-detail-action'));
	await shop.locator('.shop-detail-action').click();
	await expect(shop.getByLabel('Coins: 21')).toBeVisible();
	expect(
		(await readHud())?.inventory?.consumables?.find((item) => item.itemId === 'sunleaf-salve')
			?.quantity ?? 0
	).toBe(0);
	await shop.getByRole('button', { name: 'Close' }).click();

	// ---- Passes 2-4: geometry + localization at 640×360 (en/ja/zh-Hant) ----
	// Same page and same browser target as pass 1: resize the viewport,
	// rewrite locale + a fresh seeded save, reload, and reopen the real shop.
	await page.setViewportSize({ width: 640, height: 360 });
	for (const locale of ['en', 'ja', 'zh-Hant'] as const) {
		const copy = passCopy[locale];
		await page.evaluate(
			({ loc, envelope, prefsKey, savesKey }) => {
				window.localStorage.setItem(
					prefsKey,
					JSON.stringify({
						locale: loc,
						textSpeed: 'instant',
						motion: 'on',
						promptMode: 'auto'
					})
				);
				window.localStorage.setItem(savesKey, envelope);
			},
			{
				loc: locale,
				envelope: miraEnvelope(),
				prefsKey: 'gliese.preferences.v1',
				savesKey: SAVES_STORAGE_KEY
			}
		);
		// Locale-agnostic continue: the Title/Load labels are localized, but the
		// focus ids and save-slot testids are stable. waitAtMira doubles as the
		// post-boot barrier — the seeded spot is already inside her shop.
		await page.goto('/');
		await page.locator('[data-focus-id="title-continue"]').click();
		await page
			.locator('[role="dialog"] [data-testid^="save-slot-"]:not([disabled])')
			.first()
			.click();
		await waitAtMira();
		await openMiraShop(copy);
		const passShop = page.getByRole('dialog', { name: copy.shopName });
		await expect(passShop).toBeVisible();
		await expect(passShop.getByLabel(copy.coins(30))).toBeVisible();
		const passBuyGrid = passShop.getByTestId('shop-buy-grid');
		const salveTile = passBuyGrid.getByLabel(copy.salveName, { exact: true });
		await expect(salveTile).toBeVisible();
		await salveTile.click();
		await expect(passShop.locator('.shop-detail-action')).toBeVisible();
		await passBuyGrid.getByLabel(copy.greaterPotionName, { exact: true }).hover();
		await expect(passShop.locator('.shop-tooltip')).toBeVisible();
		layout = await measureShopLayout();
		expectTooltipClear(layout);
		await expectUnclipped(passShop.locator('.shop-detail-action'));
		await hpa839Shot(page, `mira-shop-640x360-${locale}-tooltip.png`);
		await passBuyGrid.getByLabel(copy.fieldPotionName, { exact: true }).focus();
		layout = await measureShopLayout();
		expectTooltipClear(layout);
		await expectUnclipped(passShop.locator('.shop-detail-action'));
		if (locale === 'en') {
			// Compact keyboard economy: buy and sell at 640×360 entirely through
			// the dialog's arrow/Enter lattice — never .focus()/.click() — with
			// wallet + inventory assertions proving each activation landed.
			const salveFocusId = await salveTile.getAttribute('data-focus-id');
			expect(salveFocusId, 'salve tile carries a focus id').toBeTruthy();
			await keyboardFocusTo(salveFocusId!);
			await page.keyboard.press('Enter');
			await expect(passShop.locator('.shop-detail-action')).toBeVisible();
			await keyboardFocusTo('shop-detail-action');
			await page.keyboard.press('Enter');
			await expect(passShop.getByLabel('Coins: 24')).toBeVisible();
			expect(
				(await readHud())?.inventory?.consumables?.find((item) => item.itemId === 'sunleaf-salve')
					?.quantity
			).toBe(1);

			// Compact Sell tab: arrow to the tab, Enter opens it, arrow to the
			// salve sell tile and select it, then measure the sell layout with
			// the tooltip shown by focusing a different sell tile.
			await keyboardFocusTo('shop-tab-sell');
			await page.keyboard.press('Enter');
			const passSellGrid = passShop.getByTestId('shop-sell-grid');
			await expect(passSellGrid).toBeVisible();
			const salveSellTile = passSellGrid.getByLabel(copy.salveName, { exact: true });
			const salveSellFocusId = await salveSellTile.getAttribute('data-focus-id');
			expect(salveSellFocusId, 'salve sell tile carries a focus id').toBeTruthy();
			await keyboardFocusTo(salveSellFocusId!);
			await page.keyboard.press('Enter');
			await expect(passShop.locator('.shop-detail-action')).toBeVisible();
			const potionSellFocusId = await passSellGrid
				.getByLabel(copy.fieldPotionName, { exact: true })
				.getAttribute('data-focus-id');
			expect(potionSellFocusId, 'potion sell tile carries a focus id').toBeTruthy();
			await keyboardFocusTo(potionSellFocusId!);
			await expect(passShop.locator('.shop-tooltip')).toBeVisible();
			layout = await measureShopLayout();
			expectTooltipClear(layout);
			await expectUnclipped(passShop.locator('.shop-detail-action'));
			await hpa839Shot(page, 'mira-shop-640x360-en-sell.png');
			// Keyboard-activate the Sell action: +3 coins, salve count back to 0.
			await keyboardFocusTo('shop-detail-action');
			await page.keyboard.press('Enter');
			await expect(passShop.getByLabel('Coins: 27')).toBeVisible();
			expect(
				(await readHud())?.inventory?.consumables?.find((item) => item.itemId === 'sunleaf-salve')
					?.quantity ?? 0
			).toBe(0);
		}
		await passShop.getByRole('button', { name: copy.closeName }).click();
	}
	await page.setViewportSize({ width: 1280, height: 720 });
});

test('Blacksmith graybox entrance', async ({ page }) => {
	test.setTimeout(testTimeout(180_000));
	const blacksmith: InteriorGrayboxCase = {
		mapId: 'blacksmith-interior',
		...overworldDoor('blacksmith-interior'),
		spawn: { x: 448, y: 576 },
		exit: { x: 448, y: 688 },
		steps: []
	};

	await installRuntimeProbes(page);
	await injectSave(
		page,
		createSaveFixture({
			mapId: 'overworld',
			player: {
				level: 1,
				xp: 0,
				hp: 20,
				attack: 3,
				x: blacksmith.returnArrival.x,
				y: blacksmith.returnArrival.y,
				facing: 'up'
			}
		})
	);
	await page.goto('/?movementDiagnostics=on');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
	await waitForHudPosition(page, 'overworld', blacksmith.returnArrival);

	await enterInteriorWithTrustedKeyboard(page, blacksmith);
	await waitForExactHudPosition(page, 'blacksmith-interior', blacksmith.spawn);
	await exitInteriorWithTrustedKeyboard(page, blacksmith);
});

// A `blocked` diagnostic means one requested frame step did not fully fit and
// was clamped to the furthest free point, not that the player cannot advance.
// A stop is only real once a bounded window of fresh attempts all resolve to
// one unchanged position.
const COUNTER_SETTLE_ATTEMPTS = 10;
// Consecutive blocked attempts pinned at one resolved position before the
// NPC approach walker accepts that the speaker is unreachable — a single
// rejected step is recoverable, ten in a row at the same point is not.
const APPROACH_PINNED_ATTEMPTS = 10;

function settledBlockedWindow(input: {
	mapId: string;
	counterBottom: number;
	maxY: number;
	windowSize: number;
	startIndex: number;
	attempts?: PlayerMovementDiagnostic[];
}): PlayerMovementDiagnostic[] | false {
	const diagnostics =
		input.attempts ?? (window as GlieseProbeWindow).__glieseMovementDiagnostics ?? [];
	const fresh = diagnostics.slice(input.startIndex);
	if (fresh.length < input.windowSize) return false;
	const recent = fresh.slice(-input.windowSize);
	const first = recent[0];
	if (
		first.mapId !== input.mapId ||
		first.blocked !== true ||
		first.resolvedPosition.y <= input.counterBottom ||
		first.resolvedPosition.y >= input.maxY
	) {
		return false;
	}
	const settled = recent.every(
		(attempt) =>
			attempt.mapId === input.mapId &&
			attempt.blocked === true &&
			attempt.resolvedPosition.x === first.resolvedPosition.x &&
			attempt.resolvedPosition.y === first.resolvedPosition.y
	);
	return settled ? recent : false;
}

test('Blacksmith Oren equipment shop', async ({ page }) => {
	test.setTimeout(testTimeout(180_000));
	const blacksmith: InteriorGrayboxCase = {
		mapId: 'blacksmith-interior',
		...overworldDoor('blacksmith-interior'),
		spawn: { x: 448, y: 576 },
		exit: { x: 448, y: 688 },
		steps: []
	};

	await installRuntimeProbes(page);
	await seedSaveSlots(page, [
		{
			state: createSaveFixture({
				mapId: 'overworld',
				player: {
					level: 1,
					xp: 0,
					hp: 20,
					attack: 3,
					x: blacksmith.returnArrival.x,
					y: blacksmith.returnArrival.y,
					facing: 'up'
				},
				wallet: { coins: 100 }
			})
		}
	]);
	await page.goto('/?movementDiagnostics=on');
	await expect(page.locator('canvas')).toBeVisible();
	await waitForHudPosition(page, 'overworld', blacksmith.returnArrival);

	await enterInteriorWithTrustedKeyboard(page, blacksmith);
	const layout = VILLAGE_INTERIOR_LAYOUTS['blacksmith-interior'];
	const oren = blacksmithInteriorMap.npcs?.find(({ id }) => id === 'oren');
	if (!oren) throw new Error('Oren fixture is missing');
	const counter = layout.propCollisions.serviceCounter;
	const counterBottom = counter.y + counter.height;

	// HPA-816: walk up the centre customer aisle from spawn and keep holding
	// north until the service counter has stopped the player for a bounded window
	// of emitted movement attempts at one unchanged position. A lone blocked
	// diagnostic is not a stop: that frame's step can be rejected whole while the
	// next smaller step advances. The pre-fix 18px counter core left the compiled
	// grid's last walkable row at y=480 (64px from Oren), so y<480 also rejects
	// that geometry even though the authored orenApproachPoint=(448,480) is
	// reachable.
	const movementStart = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseMovementDiagnostics?.length ?? 0
	);
	await page.locator('canvas').click();
	await page.keyboard.down('w');
	// Release the key in `finally` even when the bounded wait times out.
	const settled = await page
		.waitForFunction(
			settledBlockedWindow,
			{
				mapId: blacksmith.mapId,
				counterBottom,
				maxY: 480,
				windowSize: COUNTER_SETTLE_ATTEMPTS,
				startIndex: movementStart
			},
			{ timeout: 30_000 }
		)
		.finally(() => page.keyboard.up('w'));
	const settledWindow = (await settled.jsonValue()) as PlayerMovementDiagnostic[];

	expect(settledWindow).toHaveLength(COUNTER_SETTLE_ATTEMPTS);
	const stopPoint = settledWindow[0].resolvedPosition;
	// The body may clip at most 5px into the painted counter.
	expect(stopPoint.y).toBeGreaterThanOrEqual(counterBottom + PLAYER_COLLISION_RADIUS - 5);
	expect(stopPoint.y).toBeLessThan(480);
	expect(Math.abs(stopPoint.x - blacksmith.spawn.x)).toBeLessThanOrEqual(AXIS_REACH_TOLERANCE);
	expect(Math.hypot(stopPoint.x - oren.x, stopPoint.y - oren.y)).toBeLessThanOrEqual(
		PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS + NPC_PACK_COLLISION_RADIUS
	);

	// Condition-based interaction: a lone timed 'e' press can land while the
	// interact key is still debounced after the counter stop, so retry the
	// press until the dialogue actually appears.
	const dialogue = await pressInteractUntilDialog(page, 'Oren');
	await expect(dialogue).toContainText(
		"Steel for those who can pay, advice for those who can't. Today, the advice is free."
	);
	await dialogue.getByRole('button', { name: 'Shop' }).click();

	const shop = page.getByRole('dialog', { name: 'Sundrop Forge' });
	await expect(shop).toBeVisible();
	await expect(shop.getByLabel('Coins: 100')).toBeVisible();
	await shop.getByTestId('shop-buy-grid').getByLabel('Iron Cap', { exact: true }).dblclick();
	await expect(shop.getByLabel('Coins: 65')).toBeVisible();
	await shop.getByRole('button', { name: 'Close' }).click();
	await expect(shop).toHaveCount(0);

	await saveThroughSaveScreen(page, 1);
	const persisted = await readManualSlotState(page);
	expect(persisted.wallet?.coins).toBe(65);
	expect(persisted.shops?.stock?.['sundrop-forge']?.['iron-cap']).toBe(0);
	expect(persisted.inventory?.equipment).toContain('iron-cap');

	await page.reload();
	await expect(page.locator('canvas')).toBeVisible();
	await page.waitForFunction(
		() => {
			const state = (window as GlieseProbeWindow).__glieseLastHudState;
			return state?.mapId === 'blacksmith-interior' && state.status === 'Oren nearby';
		},
		undefined,
		{ timeout: 30_000 }
	);
	const resumedDialogue = await pressInteractUntilDialog(page, 'Oren');
	await resumedDialogue.getByRole('button', { name: 'Shop' }).click();
	const resumedShop = page.getByRole('dialog', { name: 'Sundrop Forge' });
	await expect(resumedShop).toBeVisible();
	await expect(resumedShop.getByLabel('Coins: 65')).toBeVisible();
	const resumedIronCap = resumedShop
		.getByTestId('shop-buy-grid')
		.getByLabel('Iron Cap', { exact: true });
	await resumedIronCap.hover();
	await expect(page.getByRole('tooltip')).toContainText('0 left');
});

test('proving morning keyboard journey reaches Oren through the painted forge lane', async ({
	page
}) => {
	test.setTimeout(testTimeout(240_000));
	await installRuntimeProbes(page);
	// Instant text: at normal speed a reveal-skip Enter never changes the HUD
	// dialogue payload, so every advanceDialogue press would eat the full
	// 5s payload-change timeout before the next press.
	await page.addInitScript(() => {
		localStorage.setItem(
			'gliese.preferences.v1',
			JSON.stringify({ locale: 'en', textSpeed: 'instant', motion: 'on', promptMode: 'auto' })
		);
	});
	await startNewRunFromTitle(page, { movementDiagnostics: true });

	const readHud = () =>
		page.evaluate(() => (window as GlieseProbeWindow).__glieseLastHudState ?? null);
	const readPosition = () =>
		page.evaluate(() => {
			const probeWindow = window as GlieseProbeWindow;
			const state = probeWindow.__glieseLastHudState;
			// The movement diagnostic publishes the resolved player position every
			// frame the player moves — fresher than the throttled HUD snapshot.
			const diagnostic = probeWindow.__glieseLastMovementDiagnostic;
			if (diagnostic && diagnostic.mapId === state?.mapId) {
				return { ...diagnostic.resolvedPosition };
			}
			const player = state?.areaMap?.player;
			return typeof player?.x === 'number' && typeof player.y === 'number'
				? { x: player.x, y: player.y }
				: null;
		});
	let axisHoldSequence = 0;
	const holdUntil = async (
		key: 'w' | 'a' | 's' | 'd',
		stop:
			| { kind: 'axis'; axis: 'x' | 'y'; direction: 'gte' | 'lte'; value: number }
			| { kind: 'status'; value: string }
			| { kind: 'map'; value: string },
		timeoutMs = 15_000
	) => {
		// Axis stops arm the movement-diagnostic release before the key goes
		// down: the init-script listener checks each resolved position,
		// consumes the arm on the first crossing and dispatches one keyup on
		// that same event — a stalled frame can overshoot by at most its own
		// step, and the poll below resolves only when the release log records
		// this hold's token, so listener release is the sole release path.
		// Status/map stops have no axis to arm; their key stays held until the
		// Playwright keyup in finally, which is fine because those stops fire
		// on state, not on a lane boundary.
		let axisToken: number | null = null;
		if (stop.kind === 'axis') {
			axisToken = axisHoldSequence += 1;
			await page.evaluate(
				(armed) => {
					(window as GlieseProbeWindow).__glieseAxisHold = armed;
				},
				{
					token: axisToken,
					axis: stop.axis,
					direction: stop.direction,
					value: stop.value,
					key,
					keyCode: key.toUpperCase().charCodeAt(0)
				}
			);
		}
		await page.keyboard.down(key);
		try {
			await page.waitForFunction(
				({ requested, token }) => {
					const probeWindow = window as GlieseProbeWindow;
					const state = probeWindow.__glieseLastHudState;
					if (requested.kind === 'map') return state?.mapId === requested.value;
					if (requested.kind === 'status') return state?.status === requested.value;
					return (probeWindow.__glieseAxisHoldLog ?? []).some((entry) => entry.token === token);
				},
				{ requested: stop, token: axisToken },
				// rAF polling starves under headless occlusion while the Phaser
				// loop keeps stepping — interval polling keeps the observation
				// lag off the release path entirely.
				{ timeout: timeoutMs, polling: 50 }
			);
		} catch (error) {
			const hud = await readHud();
			const position = await readPosition();
			throw new Error(
				`holdUntil(${JSON.stringify(stop)}) timed out holding '${key}' ` +
					`at ${JSON.stringify(position)} on map ${hud?.mapId ?? '?'} ` +
					`(status: ${hud?.status ?? '?'})`,
				{ cause: error }
			);
		} finally {
			if (stop.kind === 'axis') {
				await page
					.evaluate(() => {
						(window as GlieseProbeWindow).__glieseAxisHold = null;
					})
					.catch(() => {});
			}
			await page.keyboard.up(key);
		}
	};
	// Forward nudges for a hold that released short of the checkpoint band.
	// Recovery can only move along the leg's progress axis — backing up would
	// falsify the corridor trace (the violation check rejects >8px regression)
	// — so a short landing is nudged forward with real presses, checked after
	// each tap rather than re-held past the safe edge.
	const tapAxisUntil = async (
		key: 'w' | 'a' | 's' | 'd',
		axis: 'x' | 'y',
		direction: 'gte' | 'lte',
		value: number,
		maxTaps = 8
	) => {
		for (let tap = 0; tap < maxTaps; tap += 1) {
			const position = await readPosition();
			if (!position) return;
			const current = position[axis];
			if (direction === 'gte' ? current >= value : current <= value) return;
			await page.keyboard.press(key, { delay: 45 });
		}
	};
	// Relies on the instant text speed seeded above — a mid-reveal confirm only
	// completes the typewriter and never republishes the dialogue payload.
	// Each visible line is recorded as rendered so the HPA-839 Oren dialogue
	// correction can be verified against the actual panel text. The keyboard
	// journey drives Enter — the panel autofocuses on mount, so presses stay
	// inside its keydown handler and never leak to Phaser's interact key.
	const seenDialogueLines: string[] = [];
	const advanceDialogue = async () => {
		seenDialogueLines.push(...(await advanceConversationToEnd(page, 'enter')));
	};

	await page.waitForFunction(
		() => (window as GlieseProbeWindow).__glieseLastHudState?.dialogue != null,
		undefined,
		{ timeout: 30_000 }
	);
	await advanceDialogue();
	await expect.poll(async () => (await readHud())?.quests?.main?.objectiveId).toBe('talk-to-mott');
	await expect.poll(async () => (await readHud())?.mapId).toBe('hero-house');

	await page.locator('canvas').click();
	await holdUntil('d', { kind: 'axis', axis: 'x', direction: 'gte', value: 228 });
	await holdUntil('w', { kind: 'axis', axis: 'y', direction: 'lte', value: 160 });
	await holdUntil('d', { kind: 'axis', axis: 'x', direction: 'gte', value: 336 });
	await holdUntil('s', { kind: 'axis', axis: 'y', direction: 'gte', value: 352 });
	await holdUntil('a', { kind: 'axis', axis: 'x', direction: 'lte', value: 160 });
	for (let attempt = 0; attempt < 6; attempt += 1) {
		const status = (await readHud())?.status ?? '';
		if (status === 'Old Mott nearby') break;
		if (status === 'Tikka nearby') {
			await holdUntil('w', { kind: 'axis', axis: 'y', direction: 'lte', value: 352 }, 5_000);
		} else {
			await page.keyboard.down('a');
			await page.waitForTimeout(250);
			await page.keyboard.up('a');
		}
	}
	await expect
		.poll(async () => (await readHud())?.status, { timeout: expectTimeout(10_000) })
		.toBe('Old Mott nearby');
	await pressInteractUntilDialog(page, 'Old Mott');
	await advanceDialogue();
	// HPA-839: the amulet auto-equips when Mott's actual reward dialogue
	// closes. The named status must render on the remounted FieldHud — the
	// hidden HUD payload alone is not the acceptance signal.
	await expect(fieldStatus(page)).toHaveText('Equipped Ancestral Amulet');
	await hpa839Shot(page, 'mott-amulet-status.png');
	const afterMott = await readHud();
	expect(afterMott?.inventory?.equipped?.accessory).toBe('ancestral-amulet');
	// The amulet's +2 max HP must not refill current HP; its +1 DEF is
	// already live without opening Gear.
	expect(afterMott?.maxHp).toBe(22);
	expect(afterMott?.hp).toBe(20);
	expect(afterMott?.defense).toBe(1);
	await expect
		.poll(async () => (await readHud())?.quests?.main?.objectiveId)
		.toBe('collect-practice-spear');

	await page.locator('canvas').click();
	await holdUntil('d', { kind: 'axis', axis: 'x', direction: 'gte', value: 352 });
	// The exterior-door trigger column is x∈[320,384]: an over-released east
	// hold pins the hero in the wall pocket beside the door instead of
	// transitioning. Nudge back into the column before committing south.
	const exitDoorLane = await readPosition();
	if (exitDoorLane && exitDoorLane.x > 368) {
		await tapAxisUntil('a', 'x', 'lte', 352);
	}
	await holdUntil('s', { kind: 'map', value: 'overworld' }, 20_000);
	await expect.poll(async () => (await readHud())?.mapId).toBe('overworld');

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Map' }).click();
	const mapDialog = page.getByRole('dialog', { name: /map$/i });
	await expect(mapDialog).toBeVisible();
	const mapEvidence = await mapDialog.getByTestId('area-map-svg').evaluate((svgEl) => {
		const [viewX = 0, viewY = 0, viewWidth = 0, viewHeight = 0] = (
			svgEl.getAttribute('viewBox') ?? ''
		)
			.split(/\s+/)
			.map(Number);
		const markers = [...svgEl.querySelectorAll('[data-focus-id^="map-marker-"]')].map(
			(markerEl) => {
				const textEl = markerEl.querySelector('text');
				const transform = markerEl.getAttribute('transform') ?? '';
				const translate = transform.match(/translate\((-?[\d.]+)[ ,]+(-?[\d.]+)\)/);
				const textBox = textEl?.getBBox();
				return {
					id: markerEl.getAttribute('data-focus-id'),
					label: textEl?.textContent ?? null,
					markerX: translate ? Number(translate[1]) : NaN,
					markerY: translate ? Number(translate[2]) : NaN,
					textLeft: textBox ? textBox.x : null,
					textRight: textBox ? textBox.x + textBox.width : null,
					textTop: textBox ? textBox.y : null,
					textBottom: textBox ? textBox.y + textBox.height : null,
					emphasis: markerEl.classList.contains('area-map-marker-emphasis')
				};
			}
		);
		return { viewX, viewY, viewWidth, viewHeight, markers };
	});
	expect(mapEvidence.viewWidth).toBeGreaterThan(0);
	expect(mapEvidence.viewWidth).toBeLessThan(12_288);
	const forgeMarker = mapEvidence.markers.find(
		(marker) => marker.id === 'map-marker-overworld-to-blacksmith-interior'
	);
	expect(forgeMarker?.label).toBe('Sundrop Forge');
	expect(forgeMarker?.emphasis).toBe(true);
	expect(forgeMarker?.textLeft).not.toBeNull();
	expect(forgeMarker!.markerX + forgeMarker!.textLeft!).toBeGreaterThanOrEqual(
		mapEvidence.viewX - 1
	);
	expect(forgeMarker!.markerX + forgeMarker!.textRight!).toBeLessThanOrEqual(
		mapEvidence.viewX + mapEvidence.viewWidth + 1
	);
	expect(forgeMarker!.markerY + forgeMarker!.textTop!).toBeGreaterThanOrEqual(
		mapEvidence.viewY - 1
	);
	expect(forgeMarker!.markerY + forgeMarker!.textBottom!).toBeLessThanOrEqual(
		mapEvidence.viewY + mapEvidence.viewHeight + 1
	);
	expect(new Set(mapEvidence.markers.map((marker) => marker.id))).toEqual(
		new Set(['map-marker-overworld-to-hero-house', 'map-marker-overworld-to-blacksmith-interior'])
	);
	await mapDialog.getByRole('button', { name: 'Close' }).click();
	await expect(mapDialog).toHaveCount(0);
	await page.keyboard.press('Escape');

	await page.locator('canvas').click();
	await page.evaluate(() => {
		(window as GlieseProbeWindow).__glieseJourneyTrace = [];
	});
	await holdUntil('d', { kind: 'axis', axis: 'x', direction: 'gte', value: 4508 });
	await holdUntil('w', { kind: 'axis', axis: 'y', direction: 'lte', value: 7288 });
	const doorLane = await readPosition();
	expect(doorLane?.x).toBeGreaterThanOrEqual(4_508);
	expect(doorLane?.x).toBeLessThanOrEqual(4_576);
	expect(doorLane?.y).toBeGreaterThanOrEqual(7_264);
	expect(doorLane?.y).toBeLessThanOrEqual(7_296);
	await holdUntil('d', { kind: 'axis', axis: 'x', direction: 'gte', value: 4640 });
	const connectorTurn = await readPosition();
	expect(connectorTurn?.x).toBeGreaterThanOrEqual(4_632);
	expect(connectorTurn?.x).toBeLessThanOrEqual(4_704);
	expect(connectorTurn?.y).toBeGreaterThanOrEqual(7_264);
	expect(connectorTurn?.y).toBeLessThanOrEqual(7_296);
	// Release at the corridor's safe edge, not the assert's: the connector is
	// open below y=7152, so a stalled frame could carry the old 7190 stop past
	// the walkable band outright. Every landing now stays inside [7154,7214].
	await holdUntil('w', { kind: 'axis', axis: 'y', direction: 'lte', value: 7214 });
	const laneTop = await readPosition();
	expect(laneTop?.x).toBeGreaterThanOrEqual(4_632);
	expect(laneTop?.x).toBeLessThanOrEqual(4_704);
	expect(laneTop?.y).toBeGreaterThanOrEqual(7_152);
	expect(laneTop?.y).toBeLessThanOrEqual(7_216);
	// Same idea on the top lane: the first-crossing landing after a gte stop is
	// guaranteed inside [T,T+60), so release at the band's own entry edge and
	// let the assert/corridor band cover the whole one-step envelope — a
	// nudge's timed press has the same step bound, which is why nudges are
	// gone from every corridor leg.
	await holdUntil('d', { kind: 'axis', axis: 'x', direction: 'gte', value: 5136 });
	const southTurn = await readPosition();
	expect(southTurn?.x).toBeGreaterThanOrEqual(5_136);
	expect(southTurn?.x).toBeLessThanOrEqual(5_196);
	expect(southTurn?.y).toBeGreaterThanOrEqual(7_152);
	expect(southTurn?.y).toBeLessThanOrEqual(7_216);
	// The lower lane opens south well past y=7300 (walkable to ~7344+), so the
	// release must land inside the widened corridor edge: gte 7276 lands in
	// [7276,7336), which keeps the 'w' descent crossing the jog-north band
	// (jog-north-only trace coverage needs at least one point above y=7272).
	await holdUntil('s', { kind: 'axis', axis: 'y', direction: 'gte', value: 7276 });
	const lowerLane = await readPosition();
	expect(lowerLane?.x).toBeGreaterThanOrEqual(5_136);
	expect(lowerLane?.x).toBeLessThanOrEqual(5_196);
	expect(lowerLane?.y).toBeGreaterThanOrEqual(7_276);
	expect(lowerLane?.y).toBeLessThanOrEqual(7_336);
	// The eastward leg releases at the band's entry edge: landing is always
	// ≥5440 and below 5500, inside the real lane apron (walkable east to
	// ~5679) and inside the widened jog-north corridor leg.
	await holdUntil('d', { kind: 'axis', axis: 'x', direction: 'gte', value: 5440 });
	const underHut = await readPosition();
	expect(underHut?.x).toBeGreaterThanOrEqual(5_440);
	expect(underHut?.x).toBeLessThanOrEqual(5_504);
	expect(underHut?.y).toBeGreaterThanOrEqual(7_276);
	expect(underHut?.y).toBeLessThanOrEqual(7_336);
	// The descent releases at the jog's north edge: landings sit inside
	// (7212,7272], and the real north wall near x≈5500 (y≥7216) clamps any
	// stall-step inside the widened jog-east leg — no rescue nudge needed.
	await holdUntil('w', { kind: 'axis', axis: 'y', direction: 'lte', value: 7272 });
	const jogShoulder = await readPosition();
	expect(jogShoulder?.x).toBeGreaterThanOrEqual(5_432);
	expect(jogShoulder?.x).toBeLessThanOrEqual(5_508);
	expect(jogShoulder?.y).toBeGreaterThanOrEqual(7_216);
	expect(jogShoulder?.y).toBeLessThanOrEqual(7_272);
	// The forge door only triggers inside the ~30px cone at (5648,7184) —
	// x∈[5618,5678]. The release target bounds the whole one-step envelope:
	// the lane's east wall is 5743 at y≤7259 (not 5679), so gte 5628 lands in
	// [5628,5688) — inside the forge-approach corridor leg and mostly inside
	// the cone already.
	await holdUntil('d', { kind: 'axis', axis: 'x', direction: 'gte', value: 5628 });
	const forgeColumn = await readPosition();
	expect(forgeColumn?.x).toBeGreaterThanOrEqual(5_628);
	expect(forgeColumn?.x).toBeLessThanOrEqual(5_688);
	expect(forgeColumn?.y).toBeGreaterThanOrEqual(7_216);
	expect(forgeColumn?.y).toBeLessThanOrEqual(7_272);
	// A landing past the cone's east edge still satisfies the corridor asserts
	// but walks north past the trigger — observed as a real timeout at
	// (5678.7,7184), and a timed nudge can start just below its target and
	// overshoot the same edge it was meant to avoid (5617→5639→5687). The
	// correction is event-gated like every other stop: 'a' releasing at the
	// cone's own east edge puts the landing envelope at (5618,5678] — strictly
	// inside the cone on the west and inclusive on the east — and westward
	// points there attribute to the y-axis forge-approach leg, so the trace
	// contract is preserved.
	if (forgeColumn && forgeColumn.x > 5_678) {
		await holdUntil('a', { kind: 'axis', axis: 'x', direction: 'lte', value: 5678 });
	}
	const approachPoint = await readPosition();
	expect(approachPoint?.x).toBeGreaterThanOrEqual(5_618);
	expect(approachPoint?.x).toBeLessThanOrEqual(5_678);
	await holdUntil('w', { kind: 'map', value: 'blacksmith-interior' }, 20_000);
	await expect.poll(async () => (await readHud())?.mapId).toBe('blacksmith-interior');
	// The overworld route is complete on arrival — capture and attach it before
	// any later check can fail, so a failed reward assertion still leaves the
	// route evidence in the report.
	const journeyTrace =
		(await page.evaluate(() => (window as GlieseProbeWindow).__glieseJourneyTrace ?? [])) ?? [];
	const overworldTrace = journeyTrace.filter((point) => point.mapId === 'overworld');
	const axisHoldLog =
		(await page.evaluate(() => (window as GlieseProbeWindow).__glieseAxisHoldLog ?? [])) ?? [];
	await test.info().attach('overworld-journey-trace-raw', {
		body: JSON.stringify({ trace: overworldTrace, axisHoldLog }),
		contentType: 'application/json'
	});
	const forgePoint = await readPosition();
	expect(forgePoint?.x).toBeGreaterThanOrEqual(440);
	expect(forgePoint?.x).toBeLessThanOrEqual(456);
	expect(forgePoint?.y).toBeGreaterThanOrEqual(560);
	expect(forgePoint?.y).toBeLessThanOrEqual(580);

	await page.locator('canvas').click();
	await holdUntil('a', { kind: 'axis', axis: 'x', direction: 'lte', value: 200 });
	await holdUntil('w', { kind: 'axis', axis: 'y', direction: 'lte', value: 404 });
	await holdUntil('d', { kind: 'status', value: 'Oren nearby' }, 15_000);
	await pressInteractUntilDialog(page, 'Oren');
	await advanceDialogue();
	// HPA-839: the corrected line must actually render — the old wording told
	// Grik to equip the spear himself, which the auto-equip now does.
	expect(
		seenDialogueLines.some((line) => /spear in a bag has never killed anything/i.test(line)),
		'Oren corrected line rendered'
	).toBe(true);
	expect(
		seenDialogueLines.some((line) =>
			/come home with coin, come back\. i keep better steel for real hunters/i.test(line)
		),
		'Oren better-steel hook rendered'
	).toBe(true);
	expect(
		seenDialogueLines.some((line) => /open your pack/i.test(line)),
		'no line still asks the player to equip manually'
	).toBe(false);
	// The spear auto-equips when the reward dialogue closes; the FieldHud
	// status renders the equipped name, not just a hidden payload field.
	await expect(fieldStatus(page)).toHaveText('Equipped Practice Spear');
	await hpa839Shot(page, 'oren-spear-status.png');
	await expect
		.poll(async () => (await readHud())?.quests?.main?.objectiveId)
		.toBe('collect-herb-pouch');
	await expect
		.poll(
			async () =>
				(await readHud())?.inventory?.equipment?.some(
					(item) => item.itemId === 'practice-spear'
				) === true
		)
		.toBe(true);
	const afterOren = await readHud();
	expect(afterOren?.inventory?.equipped?.weapon).toBe('practice-spear');
	expect(afterOren?.inventory?.equipped?.accessory).toBe('ancestral-amulet');
	// The stats the hero brings to the first wolves are live now: spear +1
	// ATK (3→4), amulet +1 DEF, +2 max HP applied without refilling HP.
	expect(afterOren?.attack).toBe(4);
	expect(afterOren?.defense).toBe(1);
	expect(afterOren?.maxHp).toBe(22);
	expect(afterOren?.hp).toBe(20);
	// The rendered hero card shows the same first-wolves numbers, so the
	// visible HUD — not only the probe — reflects the equips.
	const heroStats = await page
		.getByTestId('hud-party-panel')
		.locator('.hero-stats')
		.first()
		.evaluate((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim());
	expect(heroStats).toContain('ATK 4');
	expect(heroStats).toContain('DEF 1');
	await expect(page.getByTestId('hud-party-panel').locator('.hero-meter-value').first()).toHaveText(
		'20/22'
	);

	// The corridor trace is verified at the end of the test — after the Oren
	// reward checks — so a route-flake failure cannot mask the reward result.
	expect(overworldTrace.length).toBeGreaterThan(0);
	const corridorLegs: {
		name: string;
		axis: 'x' | 'y';
		dir: 1 | -1;
		test: (point: { x: number; y: number }) => boolean;
	}[] = [
		{
			name: 'door-apron',
			axis: 'x',
			dir: 1,
			test: (point) => point.x >= 4_440 && point.x <= 4_576 && point.y >= 7_264 && point.y <= 7_344
		},
		{
			name: 'door-lane',
			axis: 'x',
			dir: 1,
			test: (point) => point.x >= 4_448 && point.x <= 4_696 && point.y >= 7_264 && point.y <= 7_296
		},
		{
			name: 'connector',
			axis: 'y',
			dir: -1,
			test: (point) => point.x >= 4_624 && point.x <= 4_704 && point.y >= 7_152 && point.y <= 7_296
		},
		{
			name: 'top-lane',
			axis: 'x',
			dir: 1,
			test: (point) => point.x >= 4_624 && point.x <= 5_216 && point.y >= 7_152 && point.y <= 7_216
		},
		{
			name: 'south-turn',
			axis: 'y',
			dir: 1,
			test: (point) => point.x >= 5_136 && point.x <= 5_196 && point.y >= 7_152 && point.y <= 7_288
		},
		{
			name: 'lower-lane',
			axis: 'x',
			dir: 1,
			test: (point) => point.x >= 5_136 && point.x <= 5_468 && point.y >= 7_256 && point.y <= 7_340
		},
		{
			name: 'jog-north',
			axis: 'y',
			dir: -1,
			test: (point) => point.x >= 5_432 && point.x <= 5_508 && point.y >= 7_232 && point.y <= 7_340
		},
		{
			name: 'jog-east',
			axis: 'x',
			dir: 1,
			test: (point) => point.x >= 5_432 && point.x <= 5_664 && point.y >= 7_216 && point.y <= 7_272
		},
		{
			name: 'forge-approach',
			axis: 'y',
			dir: -1,
			test: (point) => point.x >= 5_616 && point.x <= 5_688 && point.y >= 7_160 && point.y <= 7_272
		}
	];
	const containingLegs = (point: { x: number; y: number }) =>
		corridorLegs.flatMap((leg, legIndex) => (leg.test(point) ? [legIndex] : []));
	const corridorViolation = (trace: typeof overworldTrace) => {
		let furthestLeg = 0;
		const legProgress = corridorLegs.map(() => Number.NEGATIVE_INFINITY);
		for (const [index, point] of trace.entries()) {
			const containing = containingLegs(point);
			if (containing.length === 0) {
				return `point ${index} (${point.x.toFixed(2)}, ${point.y.toFixed(2)}) outside the authored corridor`;
			}
			const reached = containing[containing.length - 1];
			if (reached < furthestLeg) {
				return `point ${index} (${point.x.toFixed(2)}, ${point.y.toFixed(2)}) returned to ${corridorLegs[reached].name} after ${corridorLegs[furthestLeg].name}`;
			}
			furthestLeg = reached;
			const leg = corridorLegs[furthestLeg];
			const progress = (leg.axis === 'x' ? point.x : point.y) * leg.dir;
			if (progress < legProgress[furthestLeg] - 8) {
				return `point ${index} (${point.x.toFixed(2)}, ${point.y.toFixed(2)}) regressed ${(legProgress[furthestLeg] - progress).toFixed(1)}px along ${leg.name}`;
			}
			legProgress[furthestLeg] = Math.max(legProgress[furthestLeg], progress);
		}
		if (furthestLeg !== corridorLegs.length - 1) {
			return `trace never reached ${corridorLegs[corridorLegs.length - 1].name}`;
		}
		return null;
	};
	expect(corridorViolation(overworldTrace)).toBeNull();
	const samplePoints = (
		waypoints: readonly { x: number; y: number }[],
		stepPx = 7
	): typeof overworldTrace =>
		waypoints.slice(1).flatMap((to, segment) => {
			const from = waypoints[segment];
			const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / stepPx));
			return Array.from({ length: steps }, (_, step) => ({
				x: from.x + ((to.x - from.x) * (step + 1)) / steps,
				y: from.y + ((to.y - from.y) * (step + 1)) / steps,
				mapId: 'overworld'
			}));
		});
	// The first top-lane sample before the south turn, wherever in the lane the run walked.
	const detourIndex = overworldTrace.findIndex(
		(point) => point.x >= 4_900 && point.x < 5_136 && point.y >= 7_152 && point.y <= 7_216
	);
	expect(detourIndex).toBeGreaterThanOrEqual(0);
	const detouredTrace = [
		...overworldTrace.slice(0, detourIndex),
		{ x: 4_900, y: 7_215, mapId: 'overworld' },
		{ x: 4_900, y: 7_245, mapId: 'overworld' },
		{ x: 5_040, y: 7_245, mapId: 'overworld' },
		{ x: 5_040, y: 7_190, mapId: 'overworld' },
		...overworldTrace.slice(detourIndex)
	];
	expect(corridorViolation(detouredTrace)).toContain('outside the authored corridor');
	let loopAnchorIndex = -1;
	let loopAnchorDistance = Number.POSITIVE_INFINITY;
	for (const [index, point] of overworldTrace.entries()) {
		const distance = Math.hypot(point.x - 4_613.44, point.y - 7_305.4);
		if (distance < loopAnchorDistance) {
			loopAnchorDistance = distance;
			loopAnchorIndex = index;
		}
	}
	expect(loopAnchorIndex).toBeGreaterThanOrEqual(0);
	const loopedTrace = [
		...overworldTrace.slice(0, loopAnchorIndex + 1),
		{ x: 4_613.44, y: 7_305.4, mapId: 'overworld' },
		...samplePoints([
			{ x: 4_613.44, y: 7_305.4 },
			{ x: 4_598, y: 7_305.4 },
			{ x: 4_598, y: 7_208 },
			{ x: 4_636, y: 7_208 },
			{ x: 4_636, y: 7_305.4 },
			{ x: 4_613.44, y: 7_305.4 }
		]),
		...overworldTrace.slice(loopAnchorIndex + 1)
	];
	expect(corridorViolation(loopedTrace)).toContain('outside the authored corridor');
	const connectorIndex = overworldTrace.findIndex(
		(point) => point.x >= 4_624 && point.x <= 4_704 && point.y >= 7_152 && point.y <= 7_296
	);
	expect(connectorIndex).toBeGreaterThanOrEqual(0);
	const connectorEntry = overworldTrace[connectorIndex];
	const withinBandTrace = [
		...overworldTrace.slice(0, connectorIndex + 1),
		...samplePoints([
			connectorEntry,
			{ x: 4_644, y: connectorEntry.y },
			{ x: 4_644, y: 7_224 },
			{ x: 4_676, y: 7_224 },
			{ x: 4_676, y: connectorEntry.y },
			{ x: 4_644, y: connectorEntry.y },
			connectorEntry
		]),
		...overworldTrace.slice(connectorIndex + 1)
	];
	expect(corridorViolation(withinBandTrace)).toContain('regressed');
	const legRuns = corridorLegs.map((leg) => ({
		name: leg.name,
		points: [] as typeof overworldTrace
	}));
	let legCursor = 0;
	for (const point of overworldTrace) {
		legCursor = Math.max(legCursor, ...containingLegs(point));
		legRuns[legCursor].points.push(point);
	}
	const legRanges = legRuns.map((run) => {
		expect(run.points.length, `corridor leg "${run.name}" has no trace points`).toBeGreaterThan(0);
		return {
			leg: run.name,
			points: run.points.length,
			x: [
				Math.min(...run.points.map((point) => point.x)),
				Math.max(...run.points.map((point) => point.x))
			],
			y: [
				Math.min(...run.points.map((point) => point.y)),
				Math.max(...run.points.map((point) => point.y))
			]
		};
	});
	const forgeDoor = overworldMap.transitions.find(
		(transition) => transition.id === 'overworld-to-blacksmith-interior'
	)!;
	const lastTracePoint = overworldTrace[overworldTrace.length - 1];
	const lastDoorDistance = Math.hypot(
		lastTracePoint.x - forgeDoor.x,
		lastTracePoint.y - forgeDoor.y
	);
	expect(lastDoorDistance).toBeLessThanOrEqual(32);
	const relatedDoors = new Set([forgeDoor.id, 'overworld-to-hero-house']);
	const unrelatedDoors = overworldMap.transitions.filter(
		(transition) => !relatedDoors.has(transition.id)
	);
	const doorClearance = (trace: typeof overworldTrace) =>
		Math.min(
			...trace.flatMap((point) =>
				unrelatedDoors.map((door) => Math.hypot(point.x - door.x, point.y - door.y))
			)
		);
	const minDoorClearance = doorClearance(overworldTrace);
	expect(minDoorClearance).toBeGreaterThanOrEqual(48);
	expect(doorClearance(detouredTrace)).toBeGreaterThanOrEqual(48);
	expect(
		Math.hypot(
			detouredTrace[detouredTrace.length - 1].x - forgeDoor.x,
			detouredTrace[detouredTrace.length - 1].y - forgeDoor.y
		)
	).toBeLessThanOrEqual(32);
	expect(doorClearance(loopedTrace)).toBeGreaterThanOrEqual(48);
	expect(
		Math.hypot(
			loopedTrace[loopedTrace.length - 1].x - forgeDoor.x,
			loopedTrace[loopedTrace.length - 1].y - forgeDoor.y
		)
	).toBeLessThanOrEqual(32);
	expect(doorClearance(withinBandTrace)).toBeGreaterThanOrEqual(48);
	const traceEvidence = { legRanges, minDoorClearance, lastDoorDistance, trace: overworldTrace };
	await test.info().attach('overworld-journey-trace', {
		body: JSON.stringify(traceEvidence),
		contentType: 'application/json'
	});
});

test('HPA-839 Oren reward equips the practice spear and shows it on the field HUD', async ({
	page
}) => {
	test.setTimeout(testTimeout(120_000));
	// Real-game checkpoint one step from Oren — the same seeded-continue
	// pattern the quest-log and shop tests use. The amulet is already worn
	// (maxHp 22, DEF 1) exactly as Mott's reward left it; the long proving
	// walk to the forge is covered by the journey test above.
	const save = createSaveFixture({
		mapId: 'blacksmith-interior',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 448, y: 480, facing: 'up' },
		inventory: {
			stacks: [{ itemId: 'field-potion', quantity: 1 }],
			equipment: ['ancestral-amulet']
		},
		equipment: {
			weapon: null,
			head: null,
			body: null,
			hands: null,
			accessory: 'ancestral-amulet'
		},
		wallet: { coins: 0 },
		quests: questStateAt('collect-practice-spear')
	});
	await seedSaveSlots(page, [{ state: save }]);
	await installHudStateListener(page);
	await page.addInitScript(() => {
		window.localStorage.setItem(
			'gliese.preferences.v1',
			JSON.stringify({ locale: 'en', textSpeed: 'instant', motion: 'on', promptMode: 'auto' })
		);
	});
	await continueFromTitle(page);
	const readHud = () => readHudState(page);
	await page.waitForFunction(
		() => (window as GlieseProbeWindow).__glieseLastHudState?.status === 'Oren nearby',
		undefined,
		{ timeout: 15_000 }
	);
	await pressInteractUntilDialog(page, 'Oren');
	// Advance the real reward dialogue, recording each rendered line: the
	// corrected copy must appear and no line may still ask Grik to equip it.
	const seenLines = await advanceConversationToEnd(page);
	expect(
		seenLines.some((line) => /spear in a bag has never killed anything/i.test(line)),
		'Oren corrected line rendered'
	).toBe(true);
	expect(
		seenLines.some((line) =>
			/come home with coin, come back\. i keep better steel for real hunters/i.test(line)
		),
		'Oren better-steel hook rendered'
	).toBe(true);
	expect(
		seenLines.some((line) => /open your pack/i.test(line)),
		'no line still asks the player to equip manually'
	).toBe(false);
	await expect.poll(async () => (await readHud())?.dialogue ?? null).toBeNull();
	// The spear auto-equips when the reward dialogue closes; the rendered
	// FieldHud status shows the equipped name.
	await expect(fieldStatus(page)).toHaveText('Equipped Practice Spear');
	await hpa839Shot(page, 'checkpoint-oren-spear-status.png');
	const afterOren = await readHud();
	expect(afterOren?.inventory?.equipped?.weapon).toBe('practice-spear');
	expect(afterOren?.inventory?.equipped?.accessory).toBe('ancestral-amulet');
	// First-wolves numbers, live without opening Gear: spear +1 ATK (3→4),
	// amulet +1 DEF, +2 max HP applied without refilling HP.
	expect(afterOren?.attack).toBe(4);
	expect(afterOren?.defense).toBe(1);
	expect(afterOren?.maxHp).toBe(22);
	expect(afterOren?.hp).toBe(20);
	const heroStats = await page
		.getByTestId('hud-party-panel')
		.locator('.hero-stats')
		.first()
		.evaluate((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim());
	expect(heroStats).toContain('ATK 4');
	expect(heroStats).toContain('DEF 1');
	await expect(page.getByTestId('hud-party-panel').locator('.hero-meter-value').first()).toHaveText(
		'20/22'
	);
});

test('HPA-839 first wolf fight applies the auto-equipped stats in battle', async ({ page }) => {
	test.setTimeout(testTimeout(120_000));
	// The wildwood mouth pack is the proving day's first wolf fight: seeded at
	// report-to-borak with the spear and amulet already worn exactly as Oren's
	// and Mott's auto-equip left them, three potions in the bag.
	const pack = anchorPoint('wildwood-wolves-mouth');
	const save = createSaveFixture({
		mapId: 'overworld',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: pack.x, y: pack.y + 48, facing: 'up' },
		inventory: {
			stacks: [{ itemId: 'field-potion', quantity: 3 }],
			equipment: ['ancestral-amulet', 'practice-spear']
		},
		equipment: {
			weapon: 'practice-spear',
			head: null,
			body: null,
			hands: null,
			accessory: 'ancestral-amulet'
		},
		wallet: { coins: 0 },
		quests: questStateAt('report-to-borak')
	});
	await seedSaveSlots(page, [{ state: save }]);
	await installHudStateListener(page);
	await page.addInitScript(() => {
		window.localStorage.setItem(
			'gliese.preferences.v1',
			JSON.stringify({ locale: 'en', textSpeed: 'instant', motion: 'on', promptMode: 'auto' })
		);
		// The HUD feed keeps only the last four entries; accumulate every
		// battle event so a short fight still proves each hit/hurt amount.
		// Two separate proofs, because the self-playing fight can resolve to
		// its summary before any test-side poll observes the active phase:
		//  1. `__glieseWolvesActive` records the first active-phase hud-state
		//     publish carrying both mouth-pack units — the state/stats the
		//     fight ran with. It says nothing about the DOM.
		//  2. `__glieseWolvesHudPlates` records the named, exposed Battle
		//     region and both visible, on-screen plates in one observation.
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseBattleFeed = [];
		probeWindow.__glieseWolvesActive = null;
		probeWindow.__glieseWolvesHudPlates = undefined;
		const wolfIds = ['wildwood-wolves-mouth:unit:0', 'wildwood-wolves-mouth:unit:1'];
		const rendered = (el: Element | null): el is HTMLElement => {
			if (
				!(el instanceof HTMLElement) ||
				!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })
			)
				return false;
			const box = el.getBoundingClientRect();
			if (box.width <= 0 || box.height <= 0) return false;
			let left = Math.max(box.left, 0);
			let top = Math.max(box.top, 0);
			let right = Math.min(box.right, window.innerWidth);
			let bottom = Math.min(box.bottom, window.innerHeight);
			for (let node: HTMLElement | null = el; node; node = node.parentElement) {
				if (
					node.hasAttribute('inert') ||
					node.getAttribute('aria-hidden')?.trim().toLowerCase() === 'true'
				)
					return false;
				const style = getComputedStyle(node);
				if (Number(style.opacity) <= 0) return false;
				if (node !== el) {
					const clip = node.getBoundingClientRect();
					if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX)) {
						left = Math.max(left, clip.left);
						right = Math.min(right, clip.right);
					}
					if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY)) {
						top = Math.max(top, clip.top);
						bottom = Math.min(bottom, clip.bottom);
					}
				}
			}
			return right > left && bottom > top;
		};
		const checkHud = () => {
			// A mounted summary ends observation, even before its entrance transition.
			if (document.querySelector('[data-testid="battle-summary"]')) return stop();
			const hud = document.querySelector('[data-testid="battle-hud"]');
			// BattleHud is a section named directly with aria-label; reject alternate
			// roles or aria-labelledby, which can override that accessible name.
			if (
				rendered(hud) &&
				hud.tagName === 'SECTION' &&
				(!hud.hasAttribute('role') || hud.getAttribute('role') === 'region') &&
				!hud.hasAttribute('aria-labelledby') &&
				hud.getAttribute('aria-label')?.replace(/\s+/g, ' ').trim() === 'Battle'
			) {
				const plates = wolfIds
					.map((unitId) =>
						hud.querySelector(`[data-testid="battle-plate"][data-unit-id="${unitId}"]`)
					)
					.filter(rendered)
					.map((plate) => plate.dataset.unitId ?? '');
				if (plates.length === wolfIds.length) {
					probeWindow.__glieseWolvesHudPlates = plates;
					stop();
				}
			}
		};
		let finished = false;
		let frame = 0;
		const hudObserver = new MutationObserver(checkHud);
		const stop = () => {
			finished = true;
			hudObserver.disconnect();
			cancelAnimationFrame(frame);
			clearTimeout(deadline);
		};
		const deadline = window.setTimeout(stop, 120_000);
		const checkFrame = () => {
			checkHud();
			if (!finished) frame = requestAnimationFrame(checkFrame);
		};
		hudObserver.observe(document, {
			childList: true,
			subtree: true,
			attributes: true,
			characterData: true
		});
		checkFrame();
		window.addEventListener('gliese:hud-state', (event) => {
			const detail = (event as CustomEvent<HudStateSnapshot>).detail;
			const feed = detail?.battle?.active?.feed ?? [];
			for (const entry of feed) {
				if (!probeWindow.__glieseBattleFeed?.some((seen) => seen.id === entry.id)) {
					probeWindow.__glieseBattleFeed?.push(entry);
				}
			}
			const active = detail?.battle?.phase === 'active' ? detail.battle.active : null;
			const unitIds = new Set((active?.enemies ?? []).map((enemy) => enemy.unitId));
			if (
				probeWindow.__glieseWolvesActive == null &&
				unitIds.has('wildwood-wolves-mouth:unit:0') &&
				unitIds.has('wildwood-wolves-mouth:unit:1')
			) {
				probeWindow.__glieseWolvesActive = {
					attack: detail?.attack,
					defense: detail?.defense,
					enemies: (active?.enemies ?? []).map((enemy) => ({
						unitId: enemy.unitId,
						hp: enemy.hp,
						maxHp: enemy.maxHp
					}))
				};
			}
		});
	});
	await continueFromTitle(page, { readiness: 'field-or-battle' });
	// Spawning inside the pack's aggro radius opens the real battle scene — and
	// on a contended runner the self-playing fight can already stand at its
	// summary, so either battle UI is a valid readiness signal here.
	const battle = page.getByRole('region', { name: 'Battle' });
	const summary = page.getByTestId('battle-summary');
	await expect(battle.or(summary)).toBeVisible({ timeout: expectTimeout(15_000) });
	// The page-side observer requires the named, exposed Battle region and
	// both visible, on-screen wolf plates in the same check before summary.
	await expect
		.poll(async () =>
			page.evaluate(() => ((window as GlieseProbeWindow).__glieseWolvesHudPlates ?? []).join(','))
		)
		.toBe('wildwood-wolves-mouth:unit:0,wildwood-wolves-mouth:unit:1');
	// The summary recomputes its stats from the applied save, so it cannot
	// prove what the fight showed. The recorded active state snapshot must
	// carry the two mouth units — and the equipped spear+amulet stats live
	// in combat (ATK 4, DEF 1), not just on the field hero card.
	await expect
		.poll(async () =>
			page.evaluate(() => (window as GlieseProbeWindow).__glieseWolvesActive?.enemies.length ?? 0)
		)
		.toBe(2);
	const activeFight = await page.evaluate(
		() => (window as GlieseProbeWindow).__glieseWolvesActive ?? null
	);
	expect(activeFight?.enemies.map((enemy) => enemy.unitId).sort()).toEqual([
		'wildwood-wolves-mouth:unit:0',
		'wildwood-wolves-mouth:unit:1'
	]);
	expect(activeFight?.attack).toBe(4);
	expect(activeFight?.defense).toBe(1);
	// Damage has no variance, and the feed shows each hit's full damage, so a
	// finishing blow can read higher than the HP it took. `.some(amount===4)`
	// would pass a wrong hit followed by a right one, so the proof is the FIRST
	// spear on a 48-HP wolf (ATK 4, a front hit) and the FIRST lunge on the
	// 20-HP hero (the wolf's 4 minus DEF 1), when neither is a finishing blow.
	const seenFeed = async () =>
		(await page.evaluate(() => (window as GlieseProbeWindow).__glieseBattleFeed ?? [])) ?? [];
	await expect
		.poll(async () => (await seenFeed()).find((entry) => entry.kind === 'hit')?.amount ?? null, {
			timeout: expectTimeout(20_000)
		})
		.toBe(4);
	await expect
		.poll(async () => (await seenFeed()).find((entry) => entry.kind === 'hurt')?.amount ?? null, {
			timeout: expectTimeout(20_000)
		})
		.toBe(3);
	await hpa839Shot(page, 'first-wolves-fight.png');
});

test('HPA-839 reporting the Boar King equips the hunter knife and persists it', async ({
	page
}) => {
	test.setTimeout(testTimeout(240_000));
	// Same real-game checkpoint the quest-log test uses: inside the guild hall,
	// one step from Borak, with the Boar King trial already cleared so the
	// report-boar-king branch awards the knife.
	const save = createSaveFixture({
		mapId: 'guild-hall',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 800, y: 184, facing: 'up' },
		inventory: {
			stacks: [{ itemId: 'field-potion', quantity: 3 }],
			equipment: ['ancestral-amulet', 'practice-spear']
		},
		equipment: {
			weapon: 'practice-spear',
			head: null,
			body: null,
			hands: null,
			accessory: 'ancestral-amulet'
		},
		wallet: { coins: 30 },
		quests: questStateAt('report-boar-king')
	});
	await seedSaveSlots(page, [{ state: save }]);
	await installHudStateListener(page);
	await page.addInitScript(() => {
		window.localStorage.setItem(
			'gliese.preferences.v1',
			JSON.stringify({ locale: 'en', textSpeed: 'instant', motion: 'on', promptMode: 'auto' })
		);
	});
	await continueFromTitle(page);
	const readHud = () => readHudState(page);
	await page.waitForFunction(
		() => (window as GlieseProbeWindow).__glieseLastHudState?.status === 'Borak nearby',
		undefined,
		{ timeout: 15_000 }
	);
	await pressInteractUntilDialog(page, 'Borak');
	// Advance the full naming ceremony; the knife handoff line must render.
	const seenLines = await advanceConversationToEnd(page);
	expect(
		seenLines.some((line) => /first I ever carried/i.test(line)),
		'Borak knife handoff line rendered'
	).toBe(true);
	await expect.poll(async () => (await readHud())?.dialogue ?? null).toBeNull();
	// The +4 knife replaces the +1 spear automatically and the status pill
	// shows the equipped name once the dialogue closes.
	await expect(fieldStatus(page)).toHaveText("Equipped Hunter's Knife");
	await hpa839Shot(page, 'borak-knife-status.png');
	const awarded = await readHud();
	expect(awarded?.inventory?.equipped?.weapon).toBe('hunters-knife');
	expect(awarded?.inventory?.equipment?.map((item) => item.itemId)).toEqual(
		expect.arrayContaining(['hunters-knife', 'practice-spear', 'ancestral-amulet'])
	);
	expect(awarded?.wallet?.coins).toBe(90); // 30 seeded + 60 report reward
	expect(awarded?.attack).toBe(7); // 3 base + 4 knife

	// Save through the real Save screen; the persisted slot keeps the knife
	// worn and the spear merely owned.
	await saveThroughSaveScreen(page, 1);
	const savedEquipped = await readManualSlotState(page);
	expect((savedEquipped.equipment as Record<string, string | null> | undefined)?.weapon).toBe(
		'hunters-knife'
	);
	expect(savedEquipped.inventory.equipment).toEqual(
		expect.arrayContaining(['hunters-knife', 'practice-spear'])
	);

	// Continue from that manual slot through the real load flow.
	const loadManualSlot = async () => {
		await page.goto('/');
		await page.getByRole('button', { name: /Continue/i }).click();
		const loadDialog = page.getByRole('dialog', { name: /load/i });
		await expect(loadDialog).toBeVisible();
		await loadDialog.getByTestId('save-slot-1').click();
		await expect(page.locator('canvas')).toBeVisible();
		await expect(page.getByText('Loading game')).toHaveCount(0, { timeout: 30_000 });
		await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({
			timeout: expectTimeout(15_000)
		});
	};
	await loadManualSlot();
	await expect
		.poll(async () => (await readHud())?.inventory?.equipped?.weapon)
		.toBe('hunters-knife');
	let hud = await readHud();
	expect(hud?.inventory?.equipment?.map((item) => item.itemId)).toEqual(
		expect.arrayContaining(['hunters-knife', 'practice-spear'])
	);

	// Manually unworn gear must stay unworn: unequip the knife, save, load,
	// and the weapon slot must still be empty — loading never re-equips it.
	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Bag' }).click();
	const bagDialog = page.getByRole('dialog', { name: 'Inventory' });
	await expect(bagDialog).toBeVisible();
	await bagDialog.getByRole('button', { name: "Remove Hunter's Knife" }).click();
	await expect.poll(async () => (await readHud())?.inventory?.equipped?.weapon).toBeNull();
	await bagDialog.getByRole('button', { name: 'Close' }).click();
	await page.keyboard.press('Escape');
	await saveThroughSaveScreen(page, 1);
	const savedUnworn = await readManualSlotState(page);
	expect((savedUnworn.equipment as Record<string, string | null> | undefined)?.weapon).toBeNull();
	expect(savedUnworn.inventory.equipment).toEqual(
		expect.arrayContaining(['hunters-knife', 'practice-spear'])
	);
	await loadManualSlot();
	await expect.poll(async () => (await readHud())?.inventory?.equipped?.weapon).toBeNull();
	hud = await readHud();
	expect(hud?.inventory?.equipment?.map((item) => item.itemId)).toEqual(
		expect.arrayContaining(['hunters-knife', 'practice-spear'])
	);
});

test('HPA-839 portrait forge tooltip stays on screen at 390x844', async ({ page }) => {
	test.setTimeout(testTimeout(120_000));
	// Post-spear checkpoint at the forge counter: Oren's always-branch offers
	// the Shop choice. All four stock pieces are finite and wrap to a
	// 3-tile first row plus one at 390px — exactly the case whose tooltip
	// anchored below the stacked screen's fold.
	const save = createSaveFixture({
		mapId: 'blacksmith-interior',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 448, y: 480, facing: 'up' },
		wallet: { coins: 100 },
		quests: questStateAt('collect-herb-pouch')
	});
	await seedSaveSlots(page, [{ state: save }]);
	await installHudStateListener(page);
	await page.addInitScript(() => {
		window.localStorage.setItem(
			'gliese.preferences.v1',
			JSON.stringify({ locale: 'en', textSpeed: 'instant', motion: 'on', promptMode: 'auto' })
		);
	});
	await continueFromTitle(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.waitForFunction(
		() => (window as GlieseProbeWindow).__glieseLastHudState?.status === 'Oren nearby',
		undefined,
		{ timeout: 15_000 }
	);
	const dialogue = await pressInteractUntilDialog(page, 'Oren');
	await dialogue.getByRole('button', { name: 'Shop', exact: true }).click();
	const shop = page.getByRole('dialog', { name: 'Sundrop Forge' });
	await expect(shop).toBeVisible();
	const buyGrid = shop.getByTestId('shop-buy-grid');
	await expect(buyGrid.getByRole('button')).toHaveCount(4);

	const measureTooltip = () =>
		page.evaluate(() => {
			const rect = (selector: string) => {
				const el = document.querySelector<HTMLElement>(selector);
				if (!el) return null;
				const r = el.getBoundingClientRect();
				return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
			};
			return {
				tooltip: rect('.shop-tooltip'),
				action: rect('.shop-detail-action'),
				main: rect('.shop-main'),
				screenScrollTop: document.querySelector<HTMLElement>('.shop-screen')?.scrollTop,
				viewport: { width: window.innerWidth, height: window.innerHeight }
			};
		});
	const expectTooltipInView = async () => {
		const m = await measureTooltip();
		expect(m.tooltip, 'tooltip rendered').not.toBeNull();
		expect(m.main, 'stock column rendered').not.toBeNull();
		// visibility:hidden keeps the layout box — assert the strip is painted
		// before trusting the geometry.
		await expect(shop.locator('.shop-tooltip')).toBeVisible();
		const tooltip = m.tooltip!;
		const main = m.main!;
		// Regression: the strip pins inside the scrolling shop's viewport —
		// never anchored at the bottom of a stock column that runs below it.
		expect(tooltip.left).toBeGreaterThanOrEqual(main.left - 1);
		expect(tooltip.right).toBeLessThanOrEqual(main.right + 1);
		expect(tooltip.top).toBeGreaterThanOrEqual(0);
		expect(tooltip.bottom).toBeLessThanOrEqual(m.viewport.height);
		// Same measurement as the bounds: a hover that scrolled the shop would
		// pass the checks above in the scrolled layout instead.
		expect(m.screenScrollTop).toBe(0);
		if (m.action) {
			const overlaps = !(
				tooltip.right <= m.action.left ||
				tooltip.left >= m.action.right ||
				tooltip.bottom <= m.action.top ||
				tooltip.top >= m.action.bottom
			);
			expect(overlaps, 'tooltip must not cover the Buy action').toBe(false);
		}
	};

	// The bug only shows at scrollTop 0: a real pointer hover on a tile's
	// visible portion never scrolls, so the strip anchored at the stock
	// column's bottom stays below the fold. (Clicking/focusing a tile would
	// scroll it into view and mask the bug, so the detail action is armed
	// with a synthetic click that leaves scroll position alone.)
	const screenMetrics = await measureTooltip();
	expect(screenMetrics.main!.bottom).toBeGreaterThan(screenMetrics.viewport.height);
	expect(screenMetrics.screenScrollTop).toBe(0);
	await buyGrid.getByLabel('Training Sword', { exact: true }).dispatchEvent('click');
	await expect(shop.locator('.shop-detail-action')).toBeVisible();
	const hover = async (name: string) => {
		const tile = buyGrid.getByLabel(name, { exact: true });
		const box = (await tile.boundingBox())!;
		expect(box.y).toBeLessThan(844);
		// Midpoint of the tile's visible slice — a real pointer rest there
		// without scrolling.
		await page.mouse.move(box.x + box.width / 2, (box.y + Math.min(box.y + box.height, 844)) / 2);
	};
	await hover('Iron Cap');
	await expect(shop.locator('.shop-tooltip')).toContainText('Iron Cap');
	await expectTooltipInView();
	await hover('Grip Wraps');
	await expect(shop.locator('.shop-tooltip')).toContainText('Grip Wraps');
	await expectTooltipInView();
});

test('Blacksmith painted interior preserves baked composition and collision', async ({ page }) => {
	test.setTimeout(testTimeout(600_000));
	const blacksmith: InteriorGrayboxCase = {
		mapId: 'blacksmith-interior',
		...overworldDoor('blacksmith-interior'),
		spawn: { x: 448, y: 576 },
		exit: { x: 448, y: 688 },
		steps: []
	};
	const layout = VILLAGE_INTERIOR_LAYOUTS['blacksmith-interior'];
	const oren = blacksmithInteriorMap.npcs?.find(({ id }) => id === 'oren');
	if (!oren) throw new Error('Oren fixture is missing');
	expect(blacksmith.spawn).toEqual(layout.spawn);
	expect(blacksmith.exit).toEqual(layout.exit);
	expect(oren).toMatchObject({
		id: 'oren',
		x: 448,
		y: 416,
		shopId: 'sundrop-forge'
	});

	const forgePoint = { x: 240, y: 144 };
	const storagePoint = { x: 336, y: 320 };
	const armoryPoint = { x: 800, y: 304 };
	const showroomPoint = { x: 800, y: 624 };
	const orenApproachPoint = layout.npcApproaches.oren.approach;
	expect(layoutRectContainsPoint(layout.rooms.forgeFloor, forgePoint)).toBe(true);
	expect(layoutRectContainsPoint(layout.rooms.forgeFloor, storagePoint)).toBe(true);
	expect(layoutRectContainsPoint(layout.rooms.armoryDisplay, armoryPoint)).toBe(true);
	expect(layoutRectContainsPoint(layout.rooms.showroom, showroomPoint)).toBe(true);
	expect(orenApproachPoint).toEqual({ x: 448, y: 480 });
	expect(
		expandedLayoutRectContainsPoint(
			layout.propCollisions.coalStorage,
			storagePoint,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(false);

	await installRuntimeProbes(page);
	await seedSaveSlots(page, [
		{
			state: createSaveFixture({
				mapId: 'overworld',
				player: {
					level: 1,
					xp: 0,
					hp: 20,
					attack: 3,
					x: blacksmith.returnArrival.x,
					y: blacksmith.returnArrival.y,
					facing: 'up'
				},
				wallet: { coins: 100 }
			})
		}
	]);
	await page.setViewportSize({ width: 640, height: 360 });
	await page.goto('/?movementDiagnostics=on');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
	await waitForHudPosition(page, 'overworld', blacksmith.returnArrival);

	await enterInteriorWithTrustedKeyboard(page, blacksmith);
	assertBlacksmithPaintedDiagnostic(await waitForMapBackgroundDiagnostic(page, blacksmith.mapId));
	await saveBlacksmithCanvas(page, 'painted-camera-640x360.png');

	let currentPoint = blacksmith.spawn;
	currentPoint = await moveRoute(page, [
		currentPoint,
		{ x: 448, y: 640 },
		{ x: 800, y: 640 },
		{ x: 800, y: 400 },
		{ x: 520, y: 400 },
		{ x: 480, y: 208 },
		{ x: 368, y: 208 },
		{ x: 368, y: 144 },
		forgePoint
	]);
	await assertInteriorCheckpoint(page, blacksmith, forgePoint);

	currentPoint = await moveRoute(page, [
		currentPoint,
		{ x: 240, y: 272 },
		{ x: 336, y: 272 },
		storagePoint
	]);
	await assertInteriorCheckpoint(page, blacksmith, storagePoint);

	currentPoint = await moveRoute(page, [
		currentPoint,
		{ x: 384, y: 320 },
		{ x: 384, y: 208 },
		{ x: 592, y: 208 },
		{ x: BLACKSMITH_ARMORY_TRANSIT_X, y: 304 },
		armoryPoint
	]);
	await assertInteriorCheckpoint(page, blacksmith, armoryPoint);

	currentPoint = await moveRoute(page, [
		currentPoint,
		{ x: 592, y: 208 },
		{ x: 512, y: 208 },
		{ x: 512, y: 416 },
		{ x: 640, y: 416 },
		{ x: 640, y: 624 },
		showroomPoint
	]);
	await assertInteriorCheckpoint(page, blacksmith, showroomPoint);

	currentPoint = await moveRoute(page, [
		currentPoint,
		{ x: 240, y: 624 },
		{ x: 240, y: 480 },
		orenApproachPoint
	]);
	await assertInteriorCheckpoint(page, blacksmith, orenApproachPoint);
	await moveRoute(
		page,
		[currentPoint, { x: 240, y: 480 }, { x: 240, y: 400 }, blacksmithOrenInteractionStagingPoint],
		INTERIOR_ROUTE_SETTLE_TOLERANCE,
		undefined,
		undefined,
		TIGHT_HANDOFF_REACH_TOLERANCE
	);
	await approachNpcWithTrustedKeyboard(page, {
		mapId: blacksmith.mapId,
		speaker: 'Oren',
		stagingPoint: blacksmithOrenInteractionStagingPoint,
		npc: { x: oren.x, y: oren.y },
		propCollision: layout.propCollisions.serviceCounter
	});
	await interactWithInteriorNpc(page, {
		speaker: 'Oren',
		shopName: 'Sundrop Forge'
	});
	currentPoint = await currentHudPlayerPoint(page, blacksmith.mapId);

	currentPoint = await saveInteriorCheckpointAndReload(page, blacksmith.mapId, currentPoint);
	assertBlacksmithPaintedDiagnostic(await waitForMapBackgroundDiagnostic(page, blacksmith.mapId));
	await saveBlacksmithCanvas(page, 'painted-reentry-camera-640x360.png');

	await moveRoute(page, [currentPoint, { x: 240, y: 416 }, { x: 240, y: 576 }, blacksmith.spawn]);
	await assertInteriorCheckpoint(page, blacksmith, blacksmith.spawn);
	await exitInteriorWithTrustedKeyboard(page, blacksmith);
	const diagnosticCountBeforeReturn = await page.evaluate(
		() =>
			(window as GlieseProbeWindow).__glieseRegionalBackgroundDiagnostics?.filter(
				({ mapId }) => mapId === 'blacksmith-interior'
			).length ?? 0
	);
	await enterInteriorWithTrustedKeyboard(page, blacksmith);
	assertBlacksmithPaintedDiagnostic(
		await waitForMapBackgroundDiagnostic(page, blacksmith.mapId, diagnosticCountBeforeReturn)
	);
	await saveBlacksmithCanvas(page, 'painted-exit-return-camera-640x360.png');

	const reentrySavePoint = await currentHudPlayerPoint(page, blacksmith.mapId);
	await saveThroughSaveScreen(page, 1);
	const reentryPersisted = await readManualSlotState(page);
	expect(reentryPersisted.mapId).toBe(blacksmith.mapId);
	expect(Math.abs(reentryPersisted.player?.x - reentrySavePoint.x)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);
	expect(Math.abs(reentryPersisted.player?.y - reentrySavePoint.y)).toBeLessThanOrEqual(
		AXIS_REACH_TOLERANCE
	);

	const missingBaseRoute = '**/game/assets/interiors/blacksmith-interior/base.png';
	await page.route(missingBaseRoute, (route) => route.abort());
	try {
		await page.reload();
		await expect(page.locator('canvas')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
		await waitForHudPosition(page, blacksmith.mapId, reentrySavePoint);
		assertBlacksmithFallbackDiagnostic(
			await waitForMapBackgroundDiagnostic(page, blacksmith.mapId)
		);
		await saveBlacksmithCanvas(page, 'fallback-base-missing-camera-640x360.png');
		await exitInteriorWithTrustedKeyboard(page, blacksmith);
	} finally {
		await page.unroute(missingBaseRoute);
	}
});

test('quest log shows main quest and completes proving morning at Borak', async ({ page }) => {
	// The dialogue advance, quest-log round-trip, and Escape all run on real
	// HUD publishes; under two-worker CPU contention the whole sequence can
	// pass the default 30s before the final assertion.
	test.setTimeout(testTimeout(60_000));
	const save = createSaveFixture({
		mapId: 'guild-hall',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 800, y: 184, facing: 'up' },
		quests: questStateAt('report-to-borak')
	});

	await page.addInitScript(
		(payload: SaveInitPayload) => {
			const probeWindow = window as GlieseProbeWindow;
			probeWindow.__glieseLastHudState = undefined;
			window.addEventListener('gliese:hud-state', (event) => {
				probeWindow.__glieseLastHudState = (event as CustomEvent<HudStateSnapshot>).detail;
			});
			window.localStorage.setItem(
				payload.key,
				JSON.stringify({
					version: 1,
					slots: [
						{
							kind: 'autosave',
							savedAt: new Date().toISOString(),
							playtimeSeconds: 0,
							state: JSON.parse(payload.encoded)
						},
						null,
						null
					]
				})
			);
		},
		{ encoded: JSON.stringify(save), key: SAVES_STORAGE_KEY }
	);
	// Instant reveal keeps the confirm count deterministic (Heroic reveal
	// grammar: confirm completes the line, the next confirm advances).
	await page.addInitScript(() =>
		window.localStorage.setItem(
			'gliese.preferences.v1',
			JSON.stringify({ locale: 'en', textSpeed: 'instant', motion: 'on', promptMode: 'auto' })
		)
	);
	await continueFromTitle(page);
	await expect(page.getByText("Report to Borak at the Hunters' Lodge.")).toBeVisible();
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;
		return state?.status?.includes('Borak');
	});

	await page.locator('canvas').click();
	await page.keyboard.press('e', { delay: 50 });
	const borakDialog = page.getByRole('dialog', { name: 'Borak' });
	await expect(borakDialog).toBeVisible({ timeout: expectTimeout(10_000) });
	// Scope to the visible line: the sr-only status twin repeats the dialogue text.
	await expect(borakDialog.locator('.jrpg-dialogue-line')).toContainText(/Grik\. You came/i);
	await borakDialog.getByRole('button', { name: 'Next' }).click();
	await expect(borakDialog.locator('.jrpg-dialogue-line')).toContainText(/Three Trials/i);
	const anyDialog = page.getByRole('dialog');
	for (let advance = 0; advance < 40; advance += 1) {
		const hud = await page.evaluate(
			() => (window as GlieseProbeWindow).__glieseLastHudState ?? null
		);
		if (!hud?.dialogue) break;
		const prevDialogue = JSON.stringify(hud.dialogue);
		const next = anyDialog.getByRole('button', { name: 'Next' });
		if ((await next.count()) > 0) {
			await next.click();
		} else {
			await page.keyboard.press('Enter');
		}
		// Wait for the advance to publish a new hud-state (dialogue payload
		// changes each line) rather than a fixed sleep.
		await page
			.waitForFunction(
				(prev) => {
					const state = (window as GlieseProbeWindow).__glieseLastHudState;
					return !state?.dialogue || JSON.stringify(state.dialogue) !== prev;
				},
				prevDialogue,
				{ timeout: 5_000 }
			)
			.catch(() => {});
	}
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;
		return !state?.dialogue;
	});
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;
		return state?.quests?.main?.objectiveId === 'meet-lirra-forest';
	});

	// HPA-841 removed the "Dialogue closed" toast: closing the dialogue
	// publishes an explicit null, so the transient status is empty here.
	await expect(fieldStatus(page)).toHaveText('');

	await page.getByRole('button', { name: 'Menu' }).click();
	await commandBox(page).getByRole('button', { name: 'Quest', exact: true }).click();

	const questDialog = page.getByRole('dialog', { name: 'Quest Log' });
	await expect(questDialog).toBeVisible();
	await expect(questDialog.getByTestId('quest-entry-main')).toContainText('First Trial: Tracks');
	await expect(questDialog.getByText('Meet Lirra at the edge of the Wildwood.')).toBeVisible();
	await expect(questDialog.getByTestId('quest-entry-completed')).toContainText(
		'The Proving Morning'
	);
	// Live progress renders in the detail panel only while the quest is selected.
	const detailPanel = questDialog.getByTestId('quest-detail');
	await expect(detailPanel).toContainText('Met Lirra: 0 / 1');
	await questDialog.getByTestId('quest-entry-completed').click();
	await expect(detailPanel).toContainText('Reported to Borak: 1 / 1');
	await questDialog.getByRole('button', { name: 'Close' }).click();
	await page.keyboard.press('Escape');
	// The status pill only renders while the command grid is closed (Task 4);
	// resume-game restores the nearby-NPC prompt once the grid closes.
	await expect(fieldStatus(page)).toHaveText('Borak nearby');
});

// HPA-841 acceptance: one seeded near-end run through the whole ending on a
// normal saved game (no ?startMap=, which would disable autosave). The save
// sits at the real ridge anchor with `climb-to-the-ridge` current; the run
// inspects the ridge sign, plays the final scenes to the completion card,
// dismisses to Title, and Continue restores the ridge without a replay.
test('a seeded near-end saved run finishes the prologue and Continue restores the ridge without replay', async ({
	page
}) => {
	test.setTimeout(testTimeout(120_000));
	const ridge = anchorPoint('wildwood-ridge-overlook');
	const save = createSaveFixture({
		player: { level: 1, xp: 0, hp: 200, attack: 50, x: ridge.x, y: ridge.y, facing: 'up' },
		quests: questStateAt('climb-to-the-ridge'),
		seenDiscoveries: []
	});
	await seedSaveSlots(page, [{ state: save }]);
	await page.addInitScript(() => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseLastHudState = undefined;
		window.addEventListener('gliese:hud-state', (event) => {
			probeWindow.__glieseLastHudState = (event as CustomEvent<HudStateSnapshot>).detail;
		});
	});
	// Instant reveal keeps the advance count deterministic (Heroic reveal
	// grammar: confirm completes the line, the next confirm advances).
	await page.addInitScript(() =>
		window.localStorage.setItem(
			'gliese.preferences.v1',
			JSON.stringify({ locale: 'en', textSpeed: 'instant', motion: 'on', promptMode: 'auto' })
		)
	);
	await continueFromTitle(page);

	// The saved run booted onto the actual ridge coordinates.
	await page.waitForFunction(
		(target) => {
			const state = (window as GlieseProbeWindow).__glieseLastHudState;
			return (
				state?.mapId === 'overworld' &&
				Math.abs((state?.areaMap?.player?.x ?? NaN) - target.x) < 1 &&
				Math.abs((state?.areaMap?.player?.y ?? NaN) - target.y) < 1
			);
		},
		ridge,
		{ timeout: 30_000 }
	);

	// Inspect the ridge sign: the final story scene, then the vow and the
	// chapter-one cue, then the terminal autosave and the completion card.
	await page.keyboard.press('e', { delay: 50 });
	const anyDialog = page.getByRole('dialog');
	const endCard = page.getByRole('dialog', { name: 'End of the Prologue' });
	// Drive every line to the completion card, synchronized on the HUD
	// dialogue state instead of fixed sleeps: each pass performs at most one
	// advance, and only once the previous one has landed (the line id/index
	// moved, the session closed, or the card appeared).
	let lastDialogueKey: string | null = null;
	await expect(async () => {
		if ((await endCard.count()) > 0) return;
		const key = await page.evaluate(() => {
			const state = (window as GlieseProbeWindow).__glieseLastHudState;
			return state?.dialogue ? `${state.dialogue.id}:${state.dialogue.lineIndex}` : null;
		});
		if (key === null) throw new Error('final dialogue not open yet');
		if (key === lastDialogueKey) throw new Error('previous advance has not landed yet');
		lastDialogueKey = key;
		const next = anyDialog.getByRole('button', { name: 'Next' });
		if ((await next.count()) > 0) {
			await next.click();
		} else {
			await page.keyboard.press('Enter');
		}
		// One advance per pass: keep retrying until the early return above
		// sees the completion card.
		throw new Error('advanced a line; driving until the completion card');
	}).toPass({ timeout: 60_000 });
	await expect(endCard).toBeVisible({ timeout: 30_000 });

	// No gameplay behind the card: the field HUD (and its Menu chip) is gone.
	await expect(page.getByRole('button', { name: 'Menu' })).toHaveCount(0);

	// The terminal autosave persisted the finished state before the card:
	// seven completed quests and no pending marker (Continue validates this).
	const envelope = await readSlotEnvelope(page);
	const terminalState = envelope?.slots[0]?.state as
		| { quests?: { entries?: Record<string, { status?: string }>; pendingEffects?: unknown[] } }
		| undefined;
	expect(terminalState?.quests?.pendingEffects).toEqual([]);
	const entries = Object.values(terminalState?.quests?.entries ?? {});
	expect(entries).toHaveLength(7);
	expect(entries.every((entry) => entry?.status === 'completed')).toBe(true);

	// Dismiss once: Title returns with a refreshed Continue subtitle over the
	// finished save's region (the ridge sits in the Wildwood).
	await endCard.click();
	await expect(page.getByRole('heading', { name: 'GLIESE' })).toBeVisible();
	await expect(endCard).toHaveCount(0);
	await expect(page.getByRole('button', { name: /continue/i })).toContainText('Wildwood');

	// Continue loads the finished run on the same page — no reload, so stale
	// teardown state would still be there to fail — restoring the ridge
	// coordinates without replaying the card.
	await continueFromTitlePicker(page);
	await page.waitForFunction(
		(target) => {
			const state = (window as GlieseProbeWindow).__glieseLastHudState;
			return (
				state?.mapId === 'overworld' &&
				Math.abs((state?.areaMap?.player?.x ?? NaN) - target.x) < 1 &&
				Math.abs((state?.areaMap?.player?.y ?? NaN) - target.y) < 1
			);
		},
		ridge,
		{ timeout: 30_000 }
	);
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
	await expect(page.getByTestId('hud-side-panel').getByText('Prologue complete')).toBeVisible();
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;
		return state?.quests?.main === null && state?.quests?.completed?.length === 7;
	});
	// Wait a fixed window after the resumed HUD settles before asserting the
	// completion card stayed absent (toHaveCount(0) would otherwise pass on
	// the first poll before a replayed card appears).
	await page.waitForTimeout(500);
	await expect(endCard).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
});

// ======================= HPA-840 Task 4: live resize integration gates =======
// One checked-in gate per named scenario: real `?startMap=` interior boots (opening scene
// dismissed), live setViewportSize resizes, camera bounds axes, movement, and
// viewport screenshots for the evidence pack. The capture factory is the
// shared `evidenceShots` helper declared near the top of this file.

if (process.env.HPA840_SHARED_CDP) {
	test.beforeEach(async ({ page }) => {
		const endpoint = process.env.HPA840_SHARED_CDP!;
		const url = new URL(endpoint);
		if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password) {
			throw new Error('HPA840_SHARED_CDP must be a localhost HTTP endpoint');
		}
		const pageSession = await page.context().newCDPSession(page);
		const { targetInfo } = await pageSession.send('Target.getTargetInfo');
		await pageSession.detach();
		const shared = await chromium.connectOverCDP(endpoint);
		try {
			const browserSession = await shared.newBrowserCDPSession();
			const { targetInfos } = await browserSession.send('Target.getTargets');
			await browserSession.detach();
			if (!targetInfos.some((target) => target.targetId === targetInfo.targetId)) {
				throw new Error(`Playwright target ${targetInfo.targetId} is not in HPA840_SHARED_CDP`);
			}
		} finally {
			await shared.close();
		}
	});
}

/**
 * HPA-840 evidence capture: isolated per-test output by default so a plain
 * `bun run test:e2e` can never overwrite — or leave `-retryN` litter in —
 * the shared evidence dir. `HPA840_EVIDENCE_DOCS=1` opts back into the
 * shared dir for a deliberate refresh; `HPA840_EVIDENCE_ROOT` captures
 * into a custom (still 'wx'-guarded) root.
 */
function hpa840Capture(info: TestInfo) {
	if (process.env.HPA840_EVIDENCE_ROOT) {
		return hpa840Evidence(process.env.HPA840_EVIDENCE_ROOT);
	}
	if (process.env.HPA840_EVIDENCE_DOCS === '1') {
		return hpa840Evidence();
	}
	return hpa840Evidence(info.outputPath('hpa-840-evidence'));
}

async function hpa840Shot(page: Page, name: string) {
	// A retried attempt re-takes the same screenshots; stamp the retry index so
	// the no-overwrite guard still flags stale evidence instead of the retry.
	const retry = test.info().retry;
	const stamped = retry > 0 ? name.replace(/\.png$/, `-retry${retry}.png`) : name;
	await hpa840Capture(test.info()).shot(page, stamped);
}

/**
 * Fraction of the element's rect still visible after intersecting every
 * ancestor clip context (overflow auto/scroll/hidden/clip) and the viewport —
 * a boundingClientRect alone misses ancestor clipping.
 */
async function visibleFraction(target: Locator): Promise<number> {
	return target.evaluate((el) => {
		const rect = el.getBoundingClientRect();
		const area = rect.width * rect.height;
		if (area <= 0) return 0;
		let x1 = rect.left;
		let y1 = rect.top;
		let x2 = rect.right;
		let y2 = rect.bottom;
		for (let anc = el.parentElement; anc; anc = anc.parentElement) {
			const s = getComputedStyle(anc);
			if (!/(auto|scroll|hidden|clip)/.test(`${s.overflowX} ${s.overflowY}`)) continue;
			const cr = anc.getBoundingClientRect();
			const cl = cr.left + anc.clientLeft;
			const ct = cr.top + anc.clientTop;
			x1 = Math.max(x1, cl);
			y1 = Math.max(y1, ct);
			x2 = Math.min(x2, cl + anc.clientWidth);
			y2 = Math.min(y2, ct + anc.clientHeight);
		}
		x1 = Math.max(x1, 0);
		y1 = Math.max(y1, 0);
		x2 = Math.min(x2, window.innerWidth);
		y2 = Math.min(y2, window.innerHeight);
		return (Math.max(0, x2 - x1) * Math.max(0, y2 - y1)) / area;
	});
}

/** Asserts an element is rendered essentially unclipped inside the viewport. */
async function expectUnclipped(target: Locator) {
	await expect(target).toBeVisible();
	expect(await visibleFraction(target)).toBeGreaterThan(0.95);
}

/**
 * Clip-aware check for controls taller than their scroll context (a row can
 * never reach 95% visible area at a tiny viewport): the element's centre must
 * sit inside every ancestor clip + the viewport, and a real hit test at that
 * point must resolve to the element (or a descendant of it).
 */
async function expectCenterVisible(target: Locator) {
	await expect(target).toBeVisible();
	const hit = await target.evaluate((el) => {
		const rect = el.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		for (let anc = el.parentElement; anc; anc = anc.parentElement) {
			const s = getComputedStyle(anc);
			if (!/(auto|scroll|hidden|clip)/.test(`${s.overflowX} ${s.overflowY}`)) continue;
			const cr = anc.getBoundingClientRect();
			if (cx < cr.left || cx > cr.left + anc.clientWidth) return false;
			if (cy < cr.top || cy > cr.top + anc.clientHeight) return false;
		}
		if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) return false;
		const top = document.elementFromPoint(cx, cy);
		return top === el || el.contains(top);
	});
	expect(hit).toBe(true);
}

/**
 * Waits until the overlay's entrance animation actually settles: any running
 * CSS animation/transition inside the element finishes, then its rect must be
 * identical across two consecutive frames (both bounded — never a fixed
 * sleep). A plain two-frame check can exit before the animation's first tick.
 */
async function settleMotion(target: Locator) {
	await target.evaluate(async (el) => {
		const animations = el.getAnimations({ subtree: true });
		await Promise.race([
			Promise.all(animations.map((a) => a.finished.catch(() => {}))),
			new Promise((r) => setTimeout(r, 2_000))
		]);
		let last = '';
		const deadline = performance.now() + 1_000;
		for (;;) {
			const r = el.getBoundingClientRect();
			const now = `${r.x},${r.y},${r.width},${r.height}`;
			if (now === last || performance.now() > deadline) return;
			last = now;
			await new Promise((res) => requestAnimationFrame(res));
		}
	});
}

/** Focus must land inside the dialog once it opens (bounded poll). */
async function expectFocusInside(dialog: Locator) {
	await expect
		.poll(() => dialog.evaluate((el) => el.contains(document.activeElement)), {
			timeout: expectTimeout(5_000)
		})
		.toBe(true);
}

/**
 * Focus containment: pressing Tab once per stop plus one wrap press never
 * escapes the dialog into the field HUD behind it.
 */
async function expectTabContained(page: Page, dialog: Locator) {
	const stops = await dialog
		.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
		.count();
	for (let press = 0; press < stops + 1; press += 1) {
		await page.keyboard.press('Tab');
		const inside = await dialog.evaluate((el) => el.contains(document.activeElement));
		expect(inside).toBe(true);
	}
}

/**
 * Tags and returns the dialog's largest vertically scrollable panel, or null
 * when nothing inside overflows (small content never grows a scroller — the
 * caller then asserts the document didn't scroll instead).
 */
async function findInnerScroller(dialog: Locator): Promise<Locator | null> {
	const found = await dialog.evaluate((root) => {
		for (const e of root.querySelectorAll('[data-e2e-scroller]')) {
			e.removeAttribute('data-e2e-scroller');
		}
		let best: HTMLElement | null = null;
		let bestArea = 0;
		for (const el of root.querySelectorAll<HTMLElement>('*')) {
			const s = getComputedStyle(el);
			if (s.overflowY !== 'auto' && s.overflowY !== 'scroll') continue;
			if (el.scrollHeight <= el.clientHeight + 4 || el.clientHeight < 40) continue;
			const area = el.clientWidth * el.clientHeight;
			if (area > bestArea) {
				best = el;
				bestArea = area;
			}
		}
		if (!best) return false;
		best.setAttribute('data-e2e-scroller', '1');
		return true;
	});
	return found ? dialog.locator('[data-e2e-scroller="1"]') : null;
}

/**
 * Scrolls an inner panel toward its end via the last scrollable descendant —
 * an interactive control when one exists, otherwise the last element child —
 * and returns the panel's scrollTop before/after.
 */
async function scrollInnerPanelToEnd(scroller: Locator) {
	const before = await scroller.evaluate((e) => e.scrollTop);
	let tail = scroller.locator('button, [tabindex], a[href]').last();
	if ((await tail.count()) === 0) {
		tail = scroller.locator('*').last();
	}
	await tail.scrollIntoViewIfNeeded({ timeout: 5_000 });
	return { before, after: await scroller.evaluate((e) => e.scrollTop) };
}

async function documentScrollTop(page: Page) {
	return page.evaluate(() => document.documentElement.scrollTop + document.body.scrollTop);
}

type CameraSnapshot = {
	view: { x: number; y: number; width: number; height: number } | null;
	bounds: { x: number; y: number; width: number; height: number } | null;
};

// The scene emits one camera diagnostic after the first post-startFollow
// render and one more after each real resize — nothing in between. The
// returned snapshot is that last emitted geometry, so view.x/y go stale as
// soon as the camera follows a moving player: only read it right after
// waitForCameraSnapshot, and keep bounds assertions to center/clamp math
// that movement cannot change.
async function waitForCameraSnapshot(page: Page, width: number, height: number) {
	await page.waitForFunction(
		({ w, h }) => {
			const diagnostic = (window as GlieseProbeWindow).__glieseLastSceneCameraDiagnostic;
			return diagnostic?.camera.view.width === w && diagnostic?.camera.view.height === h;
		},
		{ w: width, h: height },
		{ timeout: 30_000 }
	);
}

async function cameraSnapshot(page: Page): Promise<CameraSnapshot> {
	return page.evaluate(() => {
		const diagnostic = (window as GlieseProbeWindow).__glieseLastSceneCameraDiagnostic;
		const camera = diagnostic?.camera;
		return {
			view: camera ? { ...camera.view } : null,
			bounds: camera ? { ...camera.bounds } : null
		};
	});
}

// The WorldScene resize contract per axis: when the map is smaller than the
// viewport the camera bounds center it (equal negative padding, bounds sized
// to the viewport so the whole window shows the room plus margin); when it is
// larger the axis clamps to the map rect and the view stays inside it.
function expectCameraAxes(
	mapId: string,
	mapW: number,
	mapH: number,
	vw: number,
	vh: number,
	cam: CameraSnapshot
) {
	expect(cam.bounds, `${mapId} camera bounds`).not.toBeNull();
	expect(cam.view, `${mapId} world view`).not.toBeNull();
	const bounds = cam.bounds!;
	const view = cam.view!;
	expect({ width: view.width, height: view.height }, `${mapId} view size at ${vw}×${vh}`).toEqual({
		width: vw,
		height: vh
	});
	for (const axis of ['x', 'y'] as const) {
		const mapDim = axis === 'x' ? mapW : mapH;
		const viewDim = axis === 'x' ? vw : vh;
		const boundsStart = axis === 'x' ? bounds.x : bounds.y;
		const boundsSize = axis === 'x' ? bounds.width : bounds.height;
		const viewStart = axis === 'x' ? view.x : view.y;
		const label = `${mapId} ${axis} at ${vw}×${vh}`;
		if (mapDim <= viewDim) {
			expect(boundsStart, `${label}: centered bounds start`).toBeCloseTo((mapDim - viewDim) / 2, 0);
			expect(boundsSize, `${label}: centered bounds size`).toBe(viewDim);
			// Zero scroll slack: the view is pinned to the bounds origin.
			expect(viewStart, `${label}: pinned view start`).toBeCloseTo(boundsStart, 0);
		} else {
			expect(boundsStart, `${label}: clamped bounds start`).toBe(0);
			expect(boundsSize, `${label}: clamped bounds size`).toBe(mapDim);
			expect(viewStart, `${label}: view start inside map`).toBeGreaterThanOrEqual(-1);
			expect(viewStart + viewDim, `${label}: view end inside map`).toBeLessThanOrEqual(mapDim + 1);
		}
	}
}

async function playerHudPoint(page: Page): Promise<{ x: number; y: number }> {
	const point = await page.evaluate(() => {
		const probeWindow = window as GlieseProbeWindow;
		const player =
			probeWindow.__glieseLastMovementDiagnostic?.resolvedPosition ??
			probeWindow.__glieseLastHudState?.areaMap?.player;
		return typeof player?.x === 'number' && typeof player?.y === 'number'
			? { x: player.x, y: player.y }
			: null;
	});
	if (!point) throw new Error('HUD player position unavailable');
	return point;
}

// Real-keyboard proof the scene keeps resolving movement at the new size:
// try each cardinal direction until the resolved player position displaces.
async function expectPlayerMoves(page: Page, mapId: string) {
	const start = await playerHudPoint(page);
	for (const key of ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'] as const) {
		await page.keyboard.down(key);
		let moved = false;
		try {
			await page.waitForFunction(
				(origin) => {
					const probeWindow = window as GlieseProbeWindow;
					const player =
						probeWindow.__glieseLastMovementDiagnostic?.resolvedPosition ??
						probeWindow.__glieseLastHudState?.areaMap?.player;
					return (
						typeof player?.x === 'number' &&
						typeof player?.y === 'number' &&
						Math.hypot(player.x - origin.x, player.y - origin.y) >= 12
					);
				},
				start,
				{ timeout: 2_500 }
			);
			moved = true;
		} catch {
			// This direction is blocked or unreachable — try the next one.
		}
		await page.keyboard.up(key);
		if (moved) return;
	}
	throw new Error(`${mapId}: player could not move in any direction from ${JSON.stringify(start)}`);
}

// `?startMap=` boots a fresh profile, and the proving-morning quest starts the
// prologue.opening scene over the interior — Enter advances each line until the
// dialog is gone, freeing both the Menu anchor and player movement.
async function dismissOpeningScene(page: Page) {
	const dialog = page.getByRole('dialog');
	// The scene mounts only after the story catalog fetch; give it a bounded
	// window before concluding there is nothing to dismiss.
	try {
		await dialog.first().waitFor({ state: 'visible', timeout: 30_000 });
	} catch {
		return;
	}
	for (let advance = 0; advance < 40 && (await dialog.count()) > 0; advance += 1) {
		const lastHudAt = await page.evaluate(
			() => (window as GlieseProbeWindow).__glieseLastHudAt ?? 0
		);
		await page.keyboard.press('Enter');
		// Wait for the next hud-state publish (each advance emits one) or the
		// dialog closing, instead of a fixed sleep.
		await page
			.waitForFunction(
				(at) =>
					((window as GlieseProbeWindow).__glieseLastHudAt ?? 0) > at ||
					document.querySelectorAll('dialog').length === 0,
				lastHudAt,
				{ timeout: 5_000 }
			)
			.catch(() => {});
	}
	await expect(dialog).toHaveCount(0);
}

for (const interior of [
	{ mapId: 'hero-house', mapW: 704, mapH: 576, spawn: { x: 352, y: 480 } },
	{ mapId: 'guild-hall', mapW: 1024, mapH: 832, spawn: { x: 512, y: 736 } },
	{ mapId: 'blacksmith-interior', mapW: 896, mapH: 704, spawn: { x: 448, y: 576 } }
] as const) {
	test(`HPA-840 ${interior.mapId} recenters the camera across live resizes and keeps movement working`, async ({
		page
	}) => {
		test.setTimeout(testTimeout(120_000));
		await installRuntimeProbes(page);
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto(`/?movementDiagnostics=on&startMap=${interior.mapId}`);
		await expect(page.locator('canvas')).toBeVisible();
		await expect(page.getByText('Loading game')).toHaveCount(0, { timeout: 30_000 });
		await dismissOpeningScene(page);
		await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
		await waitForHudPosition(page, interior.mapId, interior.spawn);

		await waitForCameraSnapshot(page, 1280, 720);
		expectCameraAxes(
			interior.mapId,
			interior.mapW,
			interior.mapH,
			1280,
			720,
			await cameraSnapshot(page)
		);
		await hpa840Shot(page, `${interior.mapId}-before-1280x720.png`);

		await page.setViewportSize({ width: 1920, height: 1080 });
		await waitForCameraSnapshot(page, 1920, 1080);
		expectCameraAxes(
			interior.mapId,
			interior.mapW,
			interior.mapH,
			1920,
			1080,
			await cameraSnapshot(page)
		);
		await expectPlayerMoves(page, interior.mapId);
		await hpa840Shot(page, `${interior.mapId}-resized-1920x1080.png`);

		await page.setViewportSize({ width: 640, height: 360 });
		await waitForCameraSnapshot(page, 640, 360);
		expectCameraAxes(
			interior.mapId,
			interior.mapW,
			interior.mapH,
			640,
			360,
			await cameraSnapshot(page)
		);
		await expectPlayerMoves(page, interior.mapId);
		await hpa840Shot(page, `${interior.mapId}-resized-640x360.png`);

		// Indoor Area Map leg (architecture review): the persisted sweep's
		// only map evidence was the outdoor Wilds. Open the real interior map
		// at 640×360 — chrome, marker focus, containment and no document
		// scroll all checked in this same persisted execution.
		await page.keyboard.press('m');
		const indoorMap = page.getByRole('dialog', { name: /map$/i });
		await expect(indoorMap).toBeVisible();
		await settleMotion(indoorMap);
		await expectFocusInside(indoorMap);
		// Chrome is pinned outside the scrollable body.
		await expectUnclipped(indoorMap.getByRole('heading').first());
		const indoorClose = indoorMap.getByRole('button', { name: /close/i }).first();
		await expectUnclipped(indoorClose);
		// The map body is intentionally the scrollport: at 640×360 the SVG is
		// allowed to be taller than it, so assert bounded scrolling instead of
		// an unclipped SVG height. Horizontally nothing may overflow.
		const indoorBody = indoorMap.locator('.jrpg-area-map-body');
		await expectUnclipped(indoorBody);
		const indoorBodyBox = await indoorBody.evaluate((el) => ({
			clientWidth: el.clientWidth,
			scrollWidth: el.scrollWidth,
			clientHeight: el.clientHeight,
			scrollHeight: el.scrollHeight
		}));
		expect(indoorBodyBox.scrollWidth).toBeLessThanOrEqual(indoorBodyBox.clientWidth + 1);
		expect(indoorBodyBox.scrollHeight).toBeGreaterThan(indoorBodyBox.clientHeight);
		const indoorBodyScrolled = await indoorBody.evaluate((el) => {
			el.scrollTop = el.scrollHeight;
			const top = el.scrollTop;
			el.scrollTop = 0;
			return top;
		});
		expect(indoorBodyScrolled).toBeGreaterThan(0);
		// Each interior's exit transition marker sits within the spawn reveal
		// radius, so a real marker joins the Tab/focus lattice, scrolls fully
		// into the scrollport on focus, and publishes its live label.
		const indoorMarkers = indoorMap.getByTestId('area-map-marker');
		await expect(indoorMarkers.first()).toBeVisible();
		await indoorMarkers.first().focus();
		await expect(indoorMarkers.first()).toBeFocused();
		await indoorMarkers.first().scrollIntoViewIfNeeded({ timeout: 5_000 });
		await expectCenterVisible(indoorMarkers.first());
		await expectUnclipped(indoorMarkers.first());
		await expect(indoorMap.getByTestId('area-map-selected')).toContainText(/\S/);
		// The focused marker's rendered label must sit inside the SVG frame
		// horizontally — the regression was long titles clipped at the edge.
		const indoorLabelInside = await indoorMarkers.first().evaluate((g) => {
			const text = g.querySelector('text');
			const svg = g.closest('svg');
			if (!text || !svg) return false;
			const frame = svg.getBoundingClientRect();
			const box = text.getBoundingClientRect();
			return box.left >= frame.left - 1 && box.right <= frame.right + 1;
		});
		expect(indoorLabelInside).toBe(true);
		await hpa840Shot(page, `${interior.mapId}-area-map-640x360.png`);
		expect(await documentScrollTop(page)).toBe(0);
		await page.keyboard.press('m');
		await expect(indoorMap).toBeHidden();
	});
}

test('HPA-840 compact field HUD at 640×360 hides the minimap, keeps M, and stays disjoint', async ({
	page
}) => {
	test.setTimeout(testTimeout(90_000));
	await installRuntimeProbes(page);
	// Same seeded-save reason as the interior gates: a `?startMap=` fresh boot
	// would park the run inside the prologue.opening scene.
	await injectSave(page, createSaveFixture());
	await page.setViewportSize({ width: 640, height: 360 });
	await page.goto('/?movementDiagnostics=on');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
	await expect(page.getByText('Loading game')).toHaveCount(0, { timeout: 30_000 });
	await expect(page.getByTestId('hud-party-panel')).toBeVisible();

	// Compact layout: the minimap is removed entirely while the shrunken
	// card, Menu chip, quest tracker, wallet and status stay onscreen.
	await expect(page.getByTestId('hud-minimap')).toBeHidden();
	await expect(page.locator('.jrpg-menu-anchor')).toBeVisible();
	await expect(page.locator('.quest-banner')).toBeVisible();
	await expect(page.locator('.wallet-pill')).toBeVisible();
	await hpa840Shot(page, 'field-hud-640x360.png');

	const surfaceRects = await page.evaluate(() => {
		const selectors = [
			['party', '[data-testid="hud-party-panel"]'],
			['menu', '.jrpg-menu-anchor'],
			['questBanner', '.quest-banner'],
			['wallet', '.wallet-pill'],
			['status', '.heroic-field-status']
		] as const;
		return selectors
			.map(([id, selector]) => {
				const rect = document.querySelector(selector)?.getBoundingClientRect();
				return rect ? ([id, rect.toJSON()] as const) : null;
			})
			.filter((entry) => entry !== null);
	});
	// An empty status pill can collapse to zero size; only surfaces with a real
	// box participate in the bounds and disjointness gates.
	const sizedRects = surfaceRects.filter(([, rect]) => rect.width > 0 && rect.height > 0);
	expect(sizedRects.length).toBeGreaterThanOrEqual(4);
	for (const [id, rect] of sizedRects) {
		expect(rect.top, `${id} top`).toBeGreaterThanOrEqual(0);
		expect(rect.left, `${id} left`).toBeGreaterThanOrEqual(0);
		expect(rect.bottom, `${id} bottom`).toBeLessThanOrEqual(360);
		expect(rect.right, `${id} right`).toBeLessThanOrEqual(640);
	}
	for (let i = 0; i < sizedRects.length; i += 1) {
		for (let j = i + 1; j < sizedRects.length; j += 1) {
			const [idA, a] = sizedRects[i]!;
			const [idB, b] = sizedRects[j]!;
			const overlaps = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
			expect(overlaps, `${idA} overlaps ${idB} at 640×360`).toBe(false);
		}
	}
	const totalArea = sizedRects.reduce((sum, [, rect]) => sum + rect.width * rect.height, 0);
	// The compact HUD must stay under a third of the tiny field.
	expect(totalArea).toBeLessThanOrEqual((640 * 360) / 3);
	expect(
		await page.evaluate(() => document.documentElement.scrollTop + document.body.scrollTop)
	).toBe(0);

	// M still opens the area map even with the minimap medallion removed.
	await page.keyboard.press('m');
	const mapDialog = page.getByRole('dialog', { name: /map$/i });
	await expect(mapDialog).toBeVisible();
	await hpa840Shot(page, 'area-map-640x360.png');
	await page.keyboard.press('m');
	await expect(mapDialog).toBeHidden();
});
