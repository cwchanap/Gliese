import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

import {
	SUNDROP_VILLAGE_BASE_BACKGROUND_ID,
	SUNDROP_VILLAGE_BASE_BACKGROUND_PATH,
	SUNDROP_VILLAGE_BASE_BACKGROUND_TEXTURE_KEY,
	SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID,
	SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_PATH,
	SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_TEXTURE_KEY
} from '../../src/lib/game/content/backgrounds/sundrop-village-backgrounds';
import {
	buildSundropVillageObstacleControlInputs,
	buildSundropVillageObstacleOcclusionProofCases
} from '../../src/lib/game/content/backgrounds/sundrop-village-obstacle-controls';
import { MAP_BACKGROUND_DEPTHS } from '../../src/lib/game/content/maps/background-ownership';
import {
	REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT,
	type RegionalBackgroundRendererDiagnostic
} from '../../src/lib/game/phaser/renderer-diagnostics';
import {
	REGIONAL_BACKGROUND_PLANE_RENDER_DIAGNOSTIC_EVENT,
	type RegionalBackgroundPlaneRenderDiagnostic
} from '../../src/lib/game/phaser/regional-background-plane-render-diagnostics';
import {
	PLAYER_MOVEMENT_DIAGNOSTIC_EVENT,
	type PlayerMovementDiagnostic
} from '../../src/lib/game/phaser/player-movement-diagnostics';
import { HUD_COMMAND_EVENT } from '../../src/lib/game/ui-bridge/events';

type HudStateSnapshot = {
	status?: string;
	nearbyShop?: { shopId?: string; merchantName?: string } | null;
};

type ConsoleEntry = {
	type: string;
	text: string;
	url: string;
};

type RegionalBackgroundEvidenceCase = {
	name: string;
	screenshotName: string;
	url: string;
	/** Expected regional background load completions; defaults to 2 when omitted. */
	expectedLoadCompletions?: number;
};

type GlieseProbeWindow = Window & {
	__glieseLastHudState?: HudStateSnapshot;
};

const SUNDROP_SELECTED_FALLBACK_IDS = [
	'village-block-2-2',
	'village-block-2-49',
	'village-block-33-49',
	'village-block-3-2',
	'village-block-3-51',
	'village-block-4-2',
	'village-block-32-2',
	'village-block-4-35',
	'village-block-11-35',
	'village-block-10-35',
	'village-block-19-2',
	'village-block-19-30',
	'village-block-20-2',
	'village-block-20-34',
	'village-block-25-20',
	'village-block-32-8',
	'village-block-32-24',
	'village-block-32-33',
	'village-block-33-24',
	'village-block-41-24',
	'corridor-wall-2b'
] as const;
const SUNDROP_FOREGROUND_FALLBACK_IDS = [
	'village-block-2-2',
	'village-block-2-49',
	'village-block-3-2',
	'village-block-10-35',
	'village-block-19-2',
	'village-block-19-30',
	'corridor-wall-2b'
] as const;
const SUNDROP_OCCLUSION_CONTROL_INPUTS = buildSundropVillageObstacleControlInputs(process.cwd());
const SUNDROP_OCCLUSION_PROOF_CASES = buildSundropVillageObstacleOcclusionProofCases(
	SUNDROP_OCCLUSION_CONTROL_INPUTS
);
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
}>;

// Single source of truth for the save schema version/storage key in this e2e
// suite. Mirrors SAVE_STORAGE_KEY / SaveState.version in src/lib/game/save —
// kept local (not imported) so the Playwright Node worker doesn't have to
// resolve the game's `$lib` alias. addInitScript callbacks run in the browser
// and cannot close over Node bindings, so the key is passed to them as an arg.
const SAVE_VERSION = 8;
const SAVE_STORAGE_KEY = 'gliese.save.v8';

// addInitScript serializes its callback to the browser and accepts only one
// arg, so the save JSON and the storage key are bundled into a single object.
type SaveInitPayload = { encoded: string; key: string };

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
			clearedEncounters: [],
			clearedEncounterUnitCounts: {},
			collectedPickups: [],
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
		seenDiscoveries: []
	};
}

const SUNDROP_BLOCKED_MOTION_SAVE = createSaveFixture({
	mapId: 'meadow-entry',
	player: { level: 1, xp: 0, hp: 20, attack: 3, x: 896, y: 4480, facing: 'up' }
});

function injectSave(page: Page, save: ReturnType<typeof createSaveFixture>) {
	return page.addInitScript(
		(payload: SaveInitPayload) => {
			window.localStorage.setItem(payload.key, payload.encoded);
		},
		{ encoded: JSON.stringify(save), key: SAVE_STORAGE_KEY }
	);
}

async function captureRuntimeScreenshot(page: Page, testInfo: TestInfo, name: string) {
	const outputPath = testInfo.outputPath(name);
	await page.screenshot({ path: outputPath });
	await testInfo.attach(name, { path: outputPath, contentType: 'image/png' });
}

function createRegionalBackgroundSaveFixture() {
	return createSaveFixture({
		mapId: 'meadow-entry',
		player: {
			level: 1,
			xp: 0,
			hp: 20,
			attack: 3,
			x: 624,
			y: 5_776,
			facing: 'up'
		}
	});
}

/**
 * Installs a Playwright binding + page init script that captures every
 * `gliese:regional-background-renderer-diagnostic` event dispatched by the
 * running app. Each event's `detail` is forwarded through the
 * `captureRegionalBackgroundRendererDiagnostic` binding and appended to the
 * returned array. The listener is registered before page scripts run, so no
 * diagnostic emitted during boot is missed.
 *
 * @param page - The Playwright page to install the listener on.
 * @returns A mutable array that accumulates `RegionalBackgroundRendererDiagnostic`
 *   records as they are emitted by the app.
 */
async function installRegionalBackgroundDiagnosticListener(page: Page) {
	const diagnostics: RegionalBackgroundRendererDiagnostic[] = [];
	const bindingName = 'captureRegionalBackgroundRendererDiagnostic';

	await page.exposeBinding(bindingName, (_source, detail: RegionalBackgroundRendererDiagnostic) => {
		diagnostics.push(detail);
	});
	await page.addInitScript(
		({ diagnosticBindingName, eventName }) => {
			window.addEventListener(eventName, (event) => {
				const binding = (
					window as unknown as Record<
						string,
						(detail: RegionalBackgroundRendererDiagnostic) => Promise<void>
					>
				)[diagnosticBindingName];
				void binding((event as CustomEvent<RegionalBackgroundRendererDiagnostic>).detail);
			});
		},
		{
			diagnosticBindingName: bindingName,
			eventName: REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT
		}
	);

	return diagnostics;
}

async function installRegionalBackgroundPlaneDiagnosticListener(page: Page) {
	const diagnostics: RegionalBackgroundPlaneRenderDiagnostic[] = [];
	const bindingName = 'captureRegionalBackgroundPlaneRenderDiagnostic';
	await page.exposeBinding(
		bindingName,
		(_source, detail: RegionalBackgroundPlaneRenderDiagnostic) => diagnostics.push(detail)
	);
	await page.addInitScript(
		({ diagnosticBindingName, eventName }) => {
			window.addEventListener(eventName, (event) => {
				const binding = (
					window as unknown as Record<
						string,
						(detail: RegionalBackgroundPlaneRenderDiagnostic) => Promise<void>
					>
				)[diagnosticBindingName];
				void binding((event as CustomEvent<RegionalBackgroundPlaneRenderDiagnostic>).detail);
			});
		},
		{
			diagnosticBindingName: bindingName,
			eventName: REGIONAL_BACKGROUND_PLANE_RENDER_DIAGNOSTIC_EVENT
		}
	);
	return diagnostics;
}

async function installPlayerMovementDiagnosticListener(page: Page) {
	const diagnostics: PlayerMovementDiagnostic[] = [];
	const bindingName = 'capturePlayerMovementDiagnostic';
	await page.exposeBinding(bindingName, (_source, detail: PlayerMovementDiagnostic) =>
		diagnostics.push(detail)
	);
	await page.addInitScript(
		({ diagnosticBindingName, eventName }) => {
			window.addEventListener(eventName, (event) => {
				const binding = (
					window as unknown as Record<string, (detail: PlayerMovementDiagnostic) => Promise<void>>
				)[diagnosticBindingName];
				void binding((event as CustomEvent<PlayerMovementDiagnostic>).detail);
			});
		},
		{ diagnosticBindingName: bindingName, eventName: PLAYER_MOVEMENT_DIAGNOSTIC_EVENT }
	);
	return diagnostics;
}

type RegionalBackgroundEvidenceDiagnostics = RegionalBackgroundRendererDiagnostic[] & {
	planeDiagnostics: RegionalBackgroundPlaneRenderDiagnostic[];
	movementDiagnostics: PlayerMovementDiagnostic[];
};

async function prepareRegionalBackgroundEvidencePage(
	page: Page,
	save = createRegionalBackgroundSaveFixture()
) {
	await page.setViewportSize({ width: 1280, height: 720 });
	await injectSave(page, save);
	const [rendererDiagnostics, planeDiagnostics, movementDiagnostics] = await Promise.all([
		installRegionalBackgroundDiagnosticListener(page),
		installRegionalBackgroundPlaneDiagnosticListener(page),
		installPlayerMovementDiagnosticListener(page)
	]);
	return Object.assign(rendererDiagnostics, {
		planeDiagnostics,
		movementDiagnostics
	}) as RegionalBackgroundEvidenceDiagnostics;
}

async function expectGameReady(page: Page) {
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
}

/**
 * Asserts the captured regional-background diagnostic matches expectations and
 * attaches it as a JSON test artifact. Polls until exactly one diagnostic has
 * been collected, then verifies the load-completion count equals
 * `expectedLoadCompletions`, the load duration is non-negative, and
 * `maxTextureSize` is null for canvas renderers or a positive number for
 * WebGL. Finally, writes the diagnostic to `testInfo.outputPath(attachmentName)`
 * and attaches it to the test report.
 *
 * @param diagnostics - The array populated by
 *   `installRegionalBackgroundDiagnosticListener`.
 * @param expectedLoadCompletions - The expected
 *   `regionalBackgroundLoadCompletions` value.
 * @param attachmentName - Name used for both the output file and the test
 *   attachment.
 * @param testInfo - The Playwright `TestInfo` for the current test, used to
 *   resolve the output path and attach the artifact.
 * @returns void; assertions and attachment are performed as side effects.
 */
async function assertAndAttachRendererDiagnostic(
	diagnostics: RegionalBackgroundRendererDiagnostic[],
	expectedLoadCompletions: number,
	attachmentName: string,
	testInfo: TestInfo,
	expectedLoadMs: 'null' | 'non-negative' = 'non-negative'
) {
	await expect.poll(() => diagnostics.length).toBe(1);
	expect(diagnostics).toHaveLength(1);

	const diagnostic = diagnostics[0]!;
	expect(diagnostic.regionalBackgroundLoadCompletions).toBe(expectedLoadCompletions);
	if (expectedLoadMs === 'null') {
		expect(diagnostic.regionalBackgroundLoadMs).toBeNull();
	} else {
		expect(diagnostic.regionalBackgroundLoadMs).toBeGreaterThanOrEqual(0);
	}
	if (diagnostic.renderer === 'canvas') {
		expect(diagnostic.maxTextureSize).toBeNull();
	} else {
		expect(diagnostic.maxTextureSize).toBeGreaterThan(0);
	}

	const diagnosticOutputPath = testInfo.outputPath(attachmentName);
	await writeFile(diagnosticOutputPath, `${JSON.stringify(diagnostic, null, 2)}\n`, 'utf8');
	await testInfo.attach(attachmentName, {
		path: diagnosticOutputPath,
		contentType: 'application/json'
	});
}

async function assertPlaneDiagnostics(
	diagnostics: RegionalBackgroundPlaneRenderDiagnostic[],
	statuses: readonly RegionalBackgroundPlaneRenderDiagnostic['entries'][number]['status'][]
) {
	await expect.poll(() => diagnostics.length).toBe(1);
	expect(diagnostics[0]?.mapId).toBe('meadow-entry');
	expect(diagnostics[0]?.entries.map((entry) => entry.status)).toEqual(statuses);
	expect(diagnostics[0]?.entries).toEqual(
		[
			{
				id: SUNDROP_VILLAGE_BASE_BACKGROUND_ID,
				textureKey: SUNDROP_VILLAGE_BASE_BACKGROUND_TEXTURE_KEY,
				plane: 'base'
			},
			{
				id: SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID,
				textureKey: SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_TEXTURE_KEY,
				plane: 'foreground'
			}
		].map((expected, index) => expect.objectContaining({ ...expected, status: statuses[index] }))
	);
	const expectedFallback =
		statuses[0] === 'rendered' && statuses[1] === 'rendered'
			? { ids: [], segments: 0 }
			: statuses[0] === 'rendered'
				? { ids: SUNDROP_FOREGROUND_FALLBACK_IDS, segments: 82 }
				: { ids: SUNDROP_SELECTED_FALLBACK_IDS, segments: 190 };
	expect(diagnostics[0]?.selectedFallbackBlockerIds).toEqual(expectedFallback.ids);
	expect(diagnostics[0]?.selectedFallbackBlockerSegmentCount).toBe(expectedFallback.segments);
}

async function assertAndAttachPlaneDiagnostic(
	diagnostics: RegionalBackgroundPlaneRenderDiagnostic[],
	statuses: readonly RegionalBackgroundPlaneRenderDiagnostic['entries'][number]['status'][],
	attachmentName: string,
	testInfo: TestInfo
) {
	await assertPlaneDiagnostics(diagnostics, statuses);
	const outputPath = testInfo.outputPath(attachmentName);
	await writeFile(outputPath, `${JSON.stringify(diagnostics[0], null, 2)}\n`, 'utf8');
	await testInfo.attach(attachmentName, { path: outputPath, contentType: 'application/json' });
}

async function resumeAndAssertSundropBlockerStopsPlayer(
	page: Page,
	movementDiagnostics: PlayerMovementDiagnostic[]
) {
	await page.evaluate((eventName) => {
		window.dispatchEvent(new CustomEvent(eventName, { detail: { type: 'resume-save' } }));
	}, HUD_COMMAND_EVENT);
	await page.waitForTimeout(150);
	await expectGameReady(page);
	await page.locator('canvas').click();
	await page.keyboard.down('ArrowUp');
	await page.waitForTimeout(300);
	await page.keyboard.up('ArrowUp');
	// Resume normalizes the deliberately near-blocker seed (896, 4480) to the
	// closest walkable center (912, 4496). Holding Up requests a lower Y inside
	// village-block-2-2; collision must resolve it back to that exact center.
	await expect.poll(() => movementDiagnostics.length).toBeGreaterThan(0);
	const blockedUpwardMovement = movementDiagnostics.find(
		(diagnostic) => diagnostic.requestedPosition.y < diagnostic.previousPosition.y
	);
	expect(blockedUpwardMovement).toEqual(
		expect.objectContaining({
			mapId: 'meadow-entry',
			previousPosition: { x: 912, y: 4496 },
			resolvedPosition: { x: 912, y: 4496 },
			blocked: true
		})
	);
	expect(blockedUpwardMovement!.requestedPosition.y).toBeLessThan(4496);
}

test('regional background load failure keeps fallback gameplay ready with scoped diagnostics', async ({
	page
}, testInfo) => {
	const consoleEntries: ConsoleEntry[] = [];
	const pageErrors: Error[] = [];
	const expectedAssetUrl = new URL(SUNDROP_VILLAGE_BASE_BACKGROUND_PATH, 'http://127.0.0.1:4173')
		.href;

	const diagnostics = await prepareRegionalBackgroundEvidencePage(
		page,
		SUNDROP_BLOCKED_MOTION_SAVE
	);
	page.on('console', (message) => {
		consoleEntries.push({
			type: message.type(),
			text: message.text(),
			url: message.location().url
		});
	});
	page.on('pageerror', (error) => pageErrors.push(error));
	await page.route(`**${SUNDROP_VILLAGE_BASE_BACKGROUND_PATH}`, (route) => route.abort('failed'));

	await page.goto('/');
	await expectGameReady(page);
	await assertAndAttachRendererDiagnostic(
		diagnostics,
		1,
		'runtime-background-load-failure.renderer.json',
		testInfo
	);

	const bootErrors = consoleEntries.filter(
		(entry) => entry.type === 'error' && entry.text.startsWith('[BootScene] asset load failed:')
	);
	expect(bootErrors).toHaveLength(1);
	expect(bootErrors[0]?.text).toContain(`key="${SUNDROP_VILLAGE_BASE_BACKGROUND_TEXTURE_KEY}"`);
	const bootSource = bootErrors[0]?.text.match(/\ssrc="([^"]+)"$/)?.[1];
	expect(bootSource).toBeDefined();
	expect(new URL(bootSource!, expectedAssetUrl).href).toBe(expectedAssetUrl);

	const expectedWorldWarning =
		`[WorldScene] regional background unavailable: id="${SUNDROP_VILLAGE_BASE_BACKGROUND_ID}" ` +
		`textureKey="${SUNDROP_VILLAGE_BASE_BACKGROUND_TEXTURE_KEY}" plane="base" mapId="meadow-entry"`;
	const findTargetedWorldWarnings = () =>
		consoleEntries.filter(
			(entry) =>
				entry.type === 'warning' &&
				entry.text.includes(`id="${SUNDROP_VILLAGE_BASE_BACKGROUND_ID}"`)
		);
	await expect
		.poll(() => findTargetedWorldWarnings().map((entry) => entry.text))
		.toEqual([expectedWorldWarning]);
	const targetedWorldWarnings = findTargetedWorldWarnings();
	expect(targetedWorldWarnings.map((entry) => entry.text)).toEqual([expectedWorldWarning]);
	await assertPlaneDiagnostics(diagnostics.planeDiagnostics, ['missing-texture', 'rendered']);
	await resumeAndAssertSundropBlockerStopsPlayer(page, diagnostics.movementDiagnostics);

	const toleratedChromiumFailures = consoleEntries.filter((entry) => {
		if (entry.type !== 'error' || entry.text !== 'Failed to load resource: net::ERR_FAILED') {
			return false;
		}

		try {
			return new URL(entry.url).href === expectedAssetUrl;
		} catch {
			return false;
		}
	});
	const unexpectedErrors = consoleEntries.filter(
		(entry) =>
			entry.type === 'error' &&
			!bootErrors.includes(entry) &&
			!toleratedChromiumFailures.includes(entry)
	);
	expect(unexpectedErrors).toEqual([]);

	const unexpectedGameWarnings = consoleEntries.filter(
		(entry) =>
			entry.type === 'warning' &&
			!findTargetedWorldWarnings().includes(entry) &&
			/\[(?:BootScene|WorldScene)\]|game\/assets|phaser|texture|frame/i.test(
				`${entry.text} ${entry.url}`
			)
	);
	expect(unexpectedGameWarnings).toEqual([]);
	expect(pageErrors).toEqual([]);
	await captureRuntimeScreenshot(page, testInfo, 'runtime-background-load-failure.png');
	expect(
		testInfo.attachments.some(
			(attachment) =>
				attachment.name === 'runtime-background-load-failure.png' &&
				attachment.contentType === 'image/png'
		)
	).toBe(true);
});

const ONE_PIXEL_PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL5hAAAAABJRU5ErkJggg==',
	'base64'
);

for (const failureCase of [
	{
		name: 'missing foreground',
		path: SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_PATH,
		statuses: ['rendered', 'missing-texture'] as const,
		loadCompletions: 1,
		intercept: (route: import('@playwright/test').Route) => route.abort('failed')
	},
	{
		name: 'wrong-sized base',
		path: SUNDROP_VILLAGE_BASE_BACKGROUND_PATH,
		statuses: ['invalid-dimensions', 'rendered'] as const,
		loadCompletions: 2,
		intercept: (route: import('@playwright/test').Route) =>
			route.fulfill({ contentType: 'image/png', body: ONE_PIXEL_PNG })
	},
	{
		name: 'wrong-sized foreground',
		path: SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_PATH,
		statuses: ['rendered', 'invalid-dimensions'] as const,
		loadCompletions: 2,
		intercept: (route: import('@playwright/test').Route) =>
			route.fulfill({ contentType: 'image/png', body: ONE_PIXEL_PNG })
	}
] as const) {
	test(`regional background ${failureCase.name} retains its valid plane and fallback gameplay`, async ({
		page
	}, testInfo) => {
		const diagnostics = await prepareRegionalBackgroundEvidencePage(
			page,
			SUNDROP_BLOCKED_MOTION_SAVE
		);
		await page.route(`**${failureCase.path}`, failureCase.intercept);
		await page.goto('/');
		await expectGameReady(page);
		await assertAndAttachRendererDiagnostic(
			diagnostics,
			failureCase.loadCompletions,
			`runtime-background-${failureCase.name.replaceAll(' ', '-')}.renderer.json`,
			testInfo
		);
		await assertPlaneDiagnostics(diagnostics.planeDiagnostics, failureCase.statuses);
		await resumeAndAssertSundropBlockerStopsPlayer(page, diagnostics.movementDiagnostics);
		await captureRuntimeScreenshot(
			page,
			testInfo,
			`runtime-background-${failureCase.name.replaceAll(' ', '-')}.png`
		);
	});
}

for (const renderFault of [
	{
		name: 'base render failure',
		url: `/?regionalBackgroundFault=${SUNDROP_VILLAGE_BASE_BACKGROUND_ID}:render`,
		statuses: ['render-failed', 'rendered'] as const
	},
	{
		name: 'foreground render failure',
		url: `/?regionalBackgroundFault=${SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID}:render`,
		statuses: ['rendered', 'render-failed'] as const
	}
] as const) {
	test(`regional background ${renderFault.name} keeps the other plane visible`, async ({
		page
	}, testInfo) => {
		const diagnostics = await prepareRegionalBackgroundEvidencePage(
			page,
			SUNDROP_BLOCKED_MOTION_SAVE
		);
		await page.goto(renderFault.url);
		await expectGameReady(page);
		const artifactStem = `runtime-background-${renderFault.name.replaceAll(' ', '-')}`;
		await assertAndAttachRendererDiagnostic(
			diagnostics,
			2,
			`${artifactStem}.renderer.json`,
			testInfo
		);
		await assertAndAttachPlaneDiagnostic(
			diagnostics.planeDiagnostics,
			renderFault.statuses,
			`${artifactStem}.planes.json`,
			testInfo
		);
		await resumeAndAssertSundropBlockerStopsPlayer(page, diagnostics.movementDiagnostics);
		await captureRuntimeScreenshot(page, testInfo, `${artifactStem}.png`);
	});
}

for (const proofCase of SUNDROP_OCCLUSION_PROOF_CASES) {
	for (const side of ['behind', 'front'] as const) {
		test(`regional foreground runtime ${proofCase.motif} ${side} proof uses authored geometry and plane depth`, async ({
			page
		}, testInfo) => {
			const position = proofCase.player[side];
			const diagnostics = await prepareRegionalBackgroundEvidencePage(
				page,
				createSaveFixture({
					mapId: 'meadow-entry',
					player: {
						level: 1,
						xp: 0,
						hp: 20,
						attack: 3,
						x: position.world.x,
						y: position.world.y,
						facing: side === 'behind' ? 'up' : 'down'
					}
				})
			);
			await page.goto('/');
			await expectGameReady(page);
			await assertPlaneDiagnostics(diagnostics.planeDiagnostics, ['rendered', 'rendered']);
			const planeEntries = diagnostics.planeDiagnostics[0]!.entries;
			for (const [
				index,
				background
			] of SUNDROP_OCCLUSION_CONTROL_INPUTS.map.backgroundImages!.entries()) {
				expect(planeEntries[index]?.renderTransform).toEqual({
					x: background.x,
					y: background.y,
					originX: 0.5,
					originY: 0.5,
					displayWidth: background.width,
					displayHeight: background.height,
					depth:
						background.plane === 'base'
							? MAP_BACKGROUND_DEPTHS.base
							: MAP_BACKGROUND_DEPTHS.foreground
				});
			}
			expect(MAP_BACKGROUND_DEPTHS.base).toBeLessThan(0);
			expect(MAP_BACKGROUND_DEPTHS.foreground).toBeGreaterThan(0);
			expect(position.centerDeltaFromCutoffPx < 0).toBe(side === 'behind');

			await page.evaluate((eventName) => {
				window.dispatchEvent(new CustomEvent(eventName, { detail: { type: 'resume-save' } }));
			}, HUD_COMMAND_EVENT);
			await page.waitForTimeout(200);
			const artifactStem = `runtime-occlusion-${proofCase.motif}-${side}`;
			const sidecarPath = testInfo.outputPath(`${artifactStem}.planes.json`);
			await writeFile(
				sidecarPath,
				`${JSON.stringify(
					{
						proofCase,
						playerDepth: 0,
						planeDiagnostic: diagnostics.planeDiagnostics[0]
					},
					null,
					2
				)}\n`,
				'utf8'
			);
			await testInfo.attach(`${artifactStem}.planes.json`, {
				path: sidecarPath,
				contentType: 'application/json'
			});
			await captureRuntimeScreenshot(page, testInfo, `${artifactStem}.png`);
		});
	}
}

const regionalBackgroundEvidenceCases: RegionalBackgroundEvidenceCase[] = [
	{
		name: 'enabled capture',
		screenshotName: 'runtime-background-enabled.png',
		url: '/'
	},
	{
		name: 'off capture',
		screenshotName: 'runtime-background-off.png',
		url: '/?regionalBackground=off',
		expectedLoadCompletions: 0
	},
	{
		name: 'collision capture',
		screenshotName: 'runtime-background-collision.png',
		url: '/?mapDebug=collision'
	},
	{
		name: 'off collision capture',
		screenshotName: 'runtime-background-off-collision.png',
		url: '/?regionalBackground=off&mapDebug=collision',
		expectedLoadCompletions: 0
	}
];

for (const evidenceCase of regionalBackgroundEvidenceCases) {
	test(`regional background ${evidenceCase.name}`, async ({ page }, testInfo) => {
		const diagnostics = await prepareRegionalBackgroundEvidencePage(page);

		await page.goto(evidenceCase.url);
		await expectGameReady(page);
		await assertAndAttachRendererDiagnostic(
			diagnostics,
			evidenceCase.expectedLoadCompletions ?? 2,
			evidenceCase.screenshotName.replace(/\.png$/, '.renderer.json'),
			testInfo,
			evidenceCase.expectedLoadCompletions === 0 ? 'null' : 'non-negative'
		);
		await assertPlaneDiagnostics(
			diagnostics.planeDiagnostics,
			evidenceCase.expectedLoadCompletions === 0
				? ['disabled', 'disabled']
				: ['rendered', 'rendered']
		);
		await captureRuntimeScreenshot(page, testInfo, evidenceCase.screenshotName);
	});
}

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
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 256, y: 144, facing: 'up' }
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
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 256, y: 144, facing: 'up' }
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

test('quest log shows main quest and accepts Guild side quests', async ({ page }) => {
	const save = createSaveFixture({
		mapId: 'guild-hall',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 192, y: 144, facing: 'up' }
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
