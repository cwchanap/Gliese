import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { meadowEntryMap } from '../../src/lib/game/content/maps';
import { MEADOW_ENTRY_PAINTED_V2_COMPLETE_APPROVED_RUNTIME_BACKGROUNDS } from '../../src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete.generated';

type Point = { x: number; y: number };

type HudState = {
	ready?: boolean;
	mapId?: string;
	areaMap?: { player?: Point };
};

type MovementDiagnostic = {
	mapId: string;
	requestedPosition: Point;
	resolvedPosition: Point;
	blocked: boolean;
};

type BackgroundDiagnostic = {
	mapId: string;
	packageId: string | null;
	selectedBackgroundIds: string[];
	presentationMode: 'painted' | 'fallback';
};

type JourneyProbeWindow = Window & {
	__completeJourneyHud?: HudState;
	__completeJourneyMovement?: MovementDiagnostic[];
	__completeJourneyBackgrounds?: BackgroundDiagnostic[];
};

const SAVE_STORAGE_KEY = 'gliese.save.v8';
const SAVE_SEED_MARKER = '__gliese_complete_journey_seeded_v1';
const COMPLETE_PACKAGE_ID = 'meadow-entry-painted-v2-complete';
const COMPLETE_BACKGROUND_IDS = MEADOW_ENTRY_PAINTED_V2_COMPLETE_APPROVED_RUNTIME_BACKGROUNDS.map(
	({ id }) => id
);
const RUNTIME_EVIDENCE_ROOT = resolve(
	'docs/superpowers/reports/img/hpa-586-painted-v2-complete/runtime'
);

const HERO_HOUSE_SPAWN = { x: 352, y: 480 } as const;
const MEADOW_AFTER_HERO_HOUSE = { x: 704, y: 5_920 } as const;
const SUNDROP_TO_RIVER = [
	MEADOW_AFTER_HERO_HOUSE,
	{ x: 704, y: 6_080 },
	{ x: 320, y: 6_080 },
	{ x: 320, y: 4_624 },
	{ x: 2_464, y: 4_624 }
] as const;
const RIVER_TO_CROSSROADS = [
	{ x: 3_744, y: 4_624 },
	{ x: 3_904, y: 4_624 },
	{ x: 3_904, y: 4_224 }
] as const;
const CROSSROADS_TO_MISTFEN = [
	{ x: 3_904, y: 3_648 },
	{ x: 2_240, y: 3_648 }
] as const;
const CROSSROADS_TO_SILVERPINE = [{ x: 3_904, y: 2_416 }] as const;
const CROSSROADS_TO_COAST = [
	{ x: 4_224, y: 4_224 },
	{ x: 4_224, y: 5_120 }
] as const;
const CROSSROADS_TO_WILDWOOD = [
	{ x: 3_904, y: 3_168 },
	{ x: 4_992, y: 3_168 },
	{ x: 4_992, y: 3_904 }
] as const;

function completeUrl() {
	return `/?mapBackgroundReview=${COMPLETE_PACKAGE_ID}&movementDiagnostics=on`;
}

function createHeroHouseSave() {
	return {
		version: 8,
		mapExploration: {},
		mapId: 'hero-house',
		player: {
			level: 1,
			xp: 0,
			hp: 20,
			attack: 3,
			x: HERO_HOUSE_SPAWN.x,
			y: HERO_HOUSE_SPAWN.y,
			facing: 'up'
		},
		flags: {
			clearedEncounters: [],
			clearedEncounterUnitCounts: {},
			collectedPickups: [],
			resolvedEncounterDrops: {}
		},
		inventory: {
			stacks: [{ itemId: 'field-potion', quantity: 1 }],
			equipment: ['training-sword']
		},
		equipment: {
			weapon: 'training-sword',
			head: null,
			body: null,
			hands: null,
			accessory: null
		},
		wallet: { coins: 30 },
		shops: {
			stock: {
				'guild-quartermaster': {
					'iron-cap': 1,
					'grip-wraps': 1,
					'traveler-vest': 1
				}
			}
		},
		quests: {
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
		},
		seenDiscoveries: []
	};
}

async function seedHeroHouse(page: Page) {
	await page.addInitScript(
		({ encoded, key, marker }: { encoded: string; key: string; marker: string }) => {
			if (window.sessionStorage.getItem(marker) === '1') return;
			window.localStorage.setItem(key, encoded);
			window.sessionStorage.setItem(marker, '1');
		},
		{
			encoded: JSON.stringify(createHeroHouseSave()),
			key: SAVE_STORAGE_KEY,
			marker: SAVE_SEED_MARKER
		}
	);
}

async function installJourneyProbes(page: Page) {
	await page.addInitScript(() => {
		const probeWindow = window as JourneyProbeWindow;
		probeWindow.__completeJourneyHud = undefined;
		probeWindow.__completeJourneyMovement = [];
		probeWindow.__completeJourneyBackgrounds = [];
		window.addEventListener('gliese:hud-state', (event) => {
			probeWindow.__completeJourneyHud = (event as CustomEvent<HudState>).detail;
		});
		window.addEventListener('gliese:player-movement-diagnostic', (event) => {
			probeWindow.__completeJourneyMovement?.push(
				(event as CustomEvent<MovementDiagnostic>).detail
			);
		});
		window.addEventListener('gliese:regional-background-plane-render-diagnostic', (event) => {
			probeWindow.__completeJourneyBackgrounds?.push(
				(event as CustomEvent<BackgroundDiagnostic>).detail
			);
		});
	});
}

async function waitForHud(page: Page, mapId: string, point?: Point) {
	await page.waitForFunction(
		({ expectedMapId, expectedPoint }) => {
			const hud = (window as JourneyProbeWindow).__completeJourneyHud;
			if (hud?.mapId !== expectedMapId) return false;
			if (!expectedPoint) return true;
			const player = hud.areaMap?.player;
			return (
				player !== undefined &&
				Math.abs(player.x - expectedPoint.x) <= 32 &&
				Math.abs(player.y - expectedPoint.y) <= 32
			);
		},
		{ expectedMapId: mapId, expectedPoint: point ?? null },
		{ timeout: 30_000 }
	);
}

async function moveAxis(page: Page, target: Point) {
	const current = await page.evaluate(() => {
		const probeWindow = window as JourneyProbeWindow;
		const movement = [...(probeWindow.__completeJourneyMovement ?? [])]
			.reverse()
			.find(({ mapId }) => mapId === 'meadow-entry');
		return {
			mapId: movement?.mapId ?? probeWindow.__completeJourneyHud?.mapId,
			areaMap: {
				player: movement?.resolvedPosition ?? probeWindow.__completeJourneyHud?.areaMap?.player
			}
		};
	});
	const from = current.areaMap.player;
	if (!from || current.mapId !== 'meadow-entry') {
		throw new Error(`Cannot move from an unexpected state: ${JSON.stringify(current)}`);
	}
	const horizontal = Math.abs(from.y - target.y) <= 24 && from.x !== target.x;
	const vertical = Math.abs(from.x - target.x) <= 24 && from.y !== target.y;
	if (!horizontal && !vertical) {
		throw new Error(`Route segment is not axis-aligned: ${JSON.stringify({ from, target })}`);
	}
	if (Math.abs(from.x - target.x) <= 24 && Math.abs(from.y - target.y) <= 24) return from;
	const key = horizontal
		? target.x > from.x
			? 'ArrowRight'
			: 'ArrowLeft'
		: target.y > from.y
			? 'ArrowDown'
			: 'ArrowUp';
	const movementStartCount = await page.evaluate(
		() => (window as JourneyProbeWindow).__completeJourneyMovement?.length ?? 0
	);
	await page.locator('canvas').click();
	await page.keyboard.down(key);
	try {
		await page.waitForFunction(
			({ expectedPoint, startCount }) => {
				const diagnostics = (window as JourneyProbeWindow).__completeJourneyMovement ?? [];
				return diagnostics
					.slice(startCount)
					.some(
						({ mapId, resolvedPosition }) =>
							mapId === 'meadow-entry' &&
							Math.abs(resolvedPosition.x - expectedPoint.x) <= 24 &&
							Math.abs(resolvedPosition.y - expectedPoint.y) <= 24
					);
			},
			{ expectedPoint: target, startCount: movementStartCount },
			{ timeout: 30_000 }
		);
	} catch (error) {
		const diagnostics = await page.evaluate(
			() => (window as JourneyProbeWindow).__completeJourneyMovement ?? []
		);
		throw new Error(
			`Route failed at ${JSON.stringify({ from, target, key, last: diagnostics.at(-1) })}: ${String(error)}`,
			{ cause: error }
		);
	} finally {
		await page.keyboard.up(key);
	}
	const settled = await page.evaluate(
		({ expectedPoint, startCount }) => {
			const diagnostics = (window as JourneyProbeWindow).__completeJourneyMovement ?? [];
			return (
				[...diagnostics.slice(startCount)]
					.reverse()
					.find(
						({ mapId, resolvedPosition }) =>
							mapId === 'meadow-entry' &&
							Math.abs(resolvedPosition.x - expectedPoint.x) <= 24 &&
							Math.abs(resolvedPosition.y - expectedPoint.y) <= 24
					)?.resolvedPosition ?? expectedPoint
			);
		},
		{ expectedPoint: target, startCount: movementStartCount }
	);
	return settled;
}

async function followPath(page: Page, points: readonly Point[]) {
	let position = await page.evaluate(() => {
		const probeWindow = window as JourneyProbeWindow;
		const movement = [...(probeWindow.__completeJourneyMovement ?? [])]
			.reverse()
			.find(({ mapId }) => mapId === 'meadow-entry');
		return movement?.resolvedPosition ?? probeWindow.__completeJourneyHud?.areaMap?.player ?? null;
	});
	if (!position) throw new Error('Missing live player position before route');
	for (const target of points) {
		// Keyboard movement settles on the simulation frame, so a point that was
		// authored as axis-aligned can carry a tiny residue on the other axis.
		// Resolve that residue with an existing route axis before taking the
		// requested segment; never inject a player coordinate.
		if (Math.abs(position.x - target.x) > 24 && Math.abs(position.y - target.y) > 24) {
			await moveAxis(page, { x: position.x, y: target.y });
		}
		position = await moveAxis(page, target);
	}
	return position;
}

async function saveCanvas(page: Page, name: string) {
	mkdirSync(RUNTIME_EVIDENCE_ROOT, { recursive: true });
	await page.locator('canvas').screenshot({ path: resolve(RUNTIME_EVIDENCE_ROOT, name) });
}

async function assertCompletePackage(page: Page) {
	await page.waitForFunction(
		() =>
			(window as JourneyProbeWindow).__completeJourneyBackgrounds?.some(
				({ mapId }) => mapId === 'meadow-entry'
			) === true,
		undefined,
		{ timeout: 30_000 }
	);
	const diagnostic = await page.evaluate(() => {
		const entries = (window as JourneyProbeWindow).__completeJourneyBackgrounds ?? [];
		return [...entries].reverse().find(({ mapId }) => mapId === 'meadow-entry') ?? null;
	});
	expect(diagnostic).toMatchObject({
		mapId: 'meadow-entry',
		packageId: COMPLETE_PACKAGE_ID,
		presentationMode: 'painted',
		selectedBackgroundIds: COMPLETE_BACKGROUND_IDS
	});
}

test('complete world layout journey renders approved Meadow art and survives save/reload', async ({
	page
}) => {
	test.setTimeout(900_000);
	await page.setViewportSize({ width: 1_920, height: 1_080 });
	await seedHeroHouse(page);
	await installJourneyProbes(page);
	await page.goto(completeUrl());
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
	await page.getByRole('button', { name: 'Menu' }).click();
	await page
		.getByRole('region', { name: 'Command' })
		.getByRole('button', { name: 'Resume Save' })
		.click();
	await waitForHud(page, 'hero-house', HERO_HOUSE_SPAWN);
	await saveCanvas(page, 'route-hero-house-interior-1920x1080.png');

	// Start at Hero House and use the authored exit transition. All subsequent
	// Meadow coordinates come from real keyboard movement on the live map.
	await page.locator('canvas').click();
	await page.keyboard.down('ArrowDown');
	try {
		await waitForHud(page, 'meadow-entry', MEADOW_AFTER_HERO_HOUSE);
	} finally {
		await page.keyboard.up('ArrowDown');
	}
	await assertCompletePackage(page);
	await saveCanvas(page, 'route-sundrop-village-1920x1080.png');

	await followPath(page, SUNDROP_TO_RIVER.slice(1));
	await saveCanvas(page, 'route-river-crossing-1920x1080.png');
	await saveCanvas(page, 'runtime-quadrant-edge-southwest-1920x1080.png');

	const crossroadsPoint = await followPath(page, RIVER_TO_CROSSROADS);
	await saveCanvas(page, 'route-crossroads-1920x1080.png');
	await saveCanvas(page, 'runtime-quadrant-edge-southeast-1920x1080.png');

	expect(Math.abs(crossroadsPoint.x - 3_904)).toBeLessThanOrEqual(24);
	expect(Math.abs(crossroadsPoint.y - 4_224)).toBeLessThanOrEqual(24);

	await followPath(page, CROSSROADS_TO_MISTFEN);
	await saveCanvas(page, 'route-mistfen-1920x1080.png');
	await saveCanvas(page, 'runtime-quadrant-edge-northwest-1920x1080.png');

	await followPath(page, [
		{ x: 3_904, y: 3_648 },
		{ x: 3_904, y: 4_224 },
		...CROSSROADS_TO_SILVERPINE
	]);
	await saveCanvas(page, 'route-silverpine-1920x1080.png');
	await saveCanvas(page, 'runtime-quadrant-edge-northeast-1920x1080.png');

	await followPath(page, [{ x: 3_904, y: 4_224 }, ...CROSSROADS_TO_COAST]);
	await saveCanvas(page, 'route-tidewatch-coast-1920x1080.png');

	const wildwoodPoint = await followPath(page, [
		{ x: 4_224, y: 4_224 },
		{ x: 3_904, y: 4_224 },
		...CROSSROADS_TO_WILDWOOD
	]);
	await saveCanvas(page, 'route-wildwood-1920x1080.png');

	const savedPoint = wildwoodPoint;
	expect(Math.abs(savedPoint.x - 4_992)).toBeLessThanOrEqual(24);
	expect(Math.abs(savedPoint.y - 3_904)).toBeLessThanOrEqual(24);
	await page.getByRole('button', { name: 'Menu' }).click();
	await page
		.getByRole('region', { name: 'Command' })
		.getByRole('button', { name: 'Save Game' })
		.click();
	await expect(page.getByRole('status', { name: 'Field status' })).toContainText('Saved');

	const persisted = await page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
		SAVE_STORAGE_KEY
	);
	expect(persisted).toMatchObject({
		mapId: 'meadow-entry',
		player: { x: savedPoint?.x, y: savedPoint?.y }
	});

	await page.reload();
	await expect(page.locator('canvas')).toBeVisible();
	await page.getByRole('button', { name: 'Menu' }).click();
	await page
		.getByRole('region', { name: 'Command' })
		.getByRole('button', { name: 'Resume Save' })
		.click();
	await waitForHud(page, 'meadow-entry', savedPoint);
	await assertCompletePackage(page);
	await saveCanvas(page, 'route-post-reload-meadow-1920x1080.png');

	const resumed = await followPath(page, [{ x: 4_864, y: 3_904 }]);
	expect(Math.abs(resumed.x - 4_864)).toBeLessThanOrEqual(24);
	expect(Math.abs(resumed.y - 3_904)).toBeLessThanOrEqual(24);
	const movementDiagnostics = await page.evaluate(
		() => (window as JourneyProbeWindow).__completeJourneyMovement ?? []
	);
	expect(movementDiagnostics.length).toBeGreaterThan(0);
	expect(movementDiagnostics.every(({ mapId }) => mapId === 'meadow-entry')).toBe(true);

	// These live source collections are the stateful objects that the complete
	// package must leave to the authored map; the painted diagnostics above prove
	// their legacy static presentation was suppressed on success.
	expect(meadowEntryMap.transitions.length).toBeGreaterThan(0);
	expect(meadowEntryMap.blockers?.length ?? 0).toBeGreaterThan(0);
	expect(meadowEntryMap.discoveries?.length ?? 0).toBeGreaterThan(0);
});
