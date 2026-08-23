import { expect, test, type Page } from '@playwright/test';
import { meadowEntryMap } from '../../src/lib/game/content/maps';
import { MEADOW_ENTRY_PAINTED_V2_COMPLETE_APPROVED_RUNTIME_BACKGROUNDS } from '../../src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete.generated';
import { getBlockerRuntimeRenderMode } from '../../src/lib/game/content/maps/blocker-rendering';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

type BackgroundDiagnosticEntry = {
	id: string;
	textureKey: string;
	status: string;
	expectedDimensions: { width: number; height: number };
	observedDimensions: { width: number; height: number } | null;
};

type BackgroundDiagnostic = {
	mapId: string;
	regionalBackgroundsEnabled: boolean;
	paintedMode?: string;
	packageId: string | null;
	requiredBackgroundIds: string[];
	selectedBackgroundIds: string[];
	presentationMode: 'painted' | 'fallback';
	entries: BackgroundDiagnosticEntry[];
	successfulBackgroundIds: string[];
	collisionIds: string[];
	statefulObjectIds: string[];
	selectedFallbackBlockerIds?: string[];
	selectedFallbackDecorIds: string[];
	selectedFallbackFenceIds: string[];
};

type MovementDiagnostic = {
	mapId: string;
	requestedPosition: { x: number; y: number };
	resolvedPosition: { x: number; y: number };
	blocked: boolean;
};

type CompleteProbeWindow = Window & {
	__completeBackgroundDiagnostics?: BackgroundDiagnostic[];
	__completeMovementDiagnostics?: MovementDiagnostic[];
	__completeHudState?: { mapId?: string; areaMap?: { player?: { x?: number; y?: number } } };
};

const COMPLETE_PACKAGE_ID = 'meadow-entry-painted-v2-complete';
const COMPLETE_BACKGROUND_IDS = MEADOW_ENTRY_PAINTED_V2_COMPLETE_APPROVED_RUNTIME_BACKGROUNDS.map(
	({ id }) => id
);
const COMPLETE_TEXTURE_IDS = MEADOW_ENTRY_PAINTED_V2_COMPLETE_APPROVED_RUNTIME_BACKGROUNDS.map(
	({ id }) => id
);
const RUNTIME_EVIDENCE_ROOT = resolve(
	'docs/superpowers/reports/img/hpa-586-painted-v2-complete/runtime'
);
const EXPECTED_FALLBACK_COLLECTIONS = {
	selectedFallbackBlockerIds: (meadowEntryMap.blockers ?? [])
		.filter(({ kind }) => getBlockerRuntimeRenderMode(kind) !== 'collision-only')
		.map(({ id }) => id),
	selectedFallbackDecorIds: (meadowEntryMap.mapDecor ?? []).map(({ id }) => id),
	selectedFallbackFenceIds: (meadowEntryMap.fences ?? []).map(({ id }) => id)
};

function completeUrl(query = '') {
	return `/?mapBackgroundReview=${COMPLETE_PACKAGE_ID}&movementDiagnostics=on${query}`;
}

async function installCompleteProbes(page: Page) {
	await page.addInitScript(() => {
		const probeWindow = window as CompleteProbeWindow;
		probeWindow.__completeBackgroundDiagnostics = [];
		probeWindow.__completeMovementDiagnostics = [];
		probeWindow.__completeHudState = undefined;
		window.addEventListener('gliese:regional-background-plane-render-diagnostic', (event) => {
			probeWindow.__completeBackgroundDiagnostics?.push(
				(event as CustomEvent<BackgroundDiagnostic>).detail
			);
		});
		window.addEventListener('gliese:player-movement-diagnostic', (event) => {
			probeWindow.__completeMovementDiagnostics?.push(
				(event as CustomEvent<MovementDiagnostic>).detail
			);
		});
		window.addEventListener('gliese:hud-state', (event) => {
			probeWindow.__completeHudState = (event as CustomEvent).detail;
		});
	});
}

async function waitForMeadowDiagnostic(page: Page): Promise<BackgroundDiagnostic> {
	await page.waitForFunction(
		() =>
			(window as CompleteProbeWindow).__completeBackgroundDiagnostics?.some(
				(diagnostic) => diagnostic.mapId === 'meadow-entry'
			) === true,
		undefined,
		{ timeout: 30_000 }
	);
	const diagnostic = await page.evaluate(() => {
		const entries = (window as CompleteProbeWindow).__completeBackgroundDiagnostics ?? [];
		return [...entries].reverse().find(({ mapId }) => mapId === 'meadow-entry') ?? null;
	});
	if (!diagnostic) throw new Error('Complete Meadow diagnostic was not emitted');
	return diagnostic;
}

async function saveCanvas(page: Page, name: string) {
	mkdirSync(RUNTIME_EVIDENCE_ROOT, { recursive: true });
	await page.locator('canvas').screenshot({ path: resolve(RUNTIME_EVIDENCE_ROOT, name) });
}

function assertCompletePaintedDiagnostic(diagnostic: BackgroundDiagnostic) {
	expect(diagnostic).toMatchObject({
		mapId: 'meadow-entry',
		regionalBackgroundsEnabled: true,
		paintedMode: 'complete',
		packageId: COMPLETE_PACKAGE_ID,
		presentationMode: 'painted'
	});
	expect(diagnostic.requiredBackgroundIds).toEqual([...COMPLETE_BACKGROUND_IDS]);
	expect(diagnostic.selectedBackgroundIds).toEqual([...COMPLETE_BACKGROUND_IDS]);
	expect(diagnostic.successfulBackgroundIds).toEqual([...COMPLETE_BACKGROUND_IDS].sort());
	expect(diagnostic.selectedFallbackBlockerIds).toEqual([]);
	expect(diagnostic.selectedFallbackDecorIds).toEqual([]);
	expect(diagnostic.selectedFallbackFenceIds).toEqual([]);
	for (const background of MEADOW_ENTRY_PAINTED_V2_COMPLETE_APPROVED_RUNTIME_BACKGROUNDS) {
		const entry = diagnostic.entries.find(({ id }) => id === background.id);
		expect(entry).toMatchObject({
			id: background.id,
			textureKey: background.textureKey,
			status: 'rendered',
			expectedDimensions: { width: 3_200, height: 3_200 },
			observedDimensions: { width: 3_200, height: 3_200 }
		});
	}
}

function assertFallbackDiagnostic(
	diagnostic: BackgroundDiagnostic,
	expectedFallback: Pick<
		BackgroundDiagnostic,
		'selectedFallbackBlockerIds' | 'selectedFallbackDecorIds' | 'selectedFallbackFenceIds'
	>
) {
	expect(diagnostic).toMatchObject({
		mapId: 'meadow-entry',
		packageId: null,
		presentationMode: 'fallback',
		selectedBackgroundIds: [],
		successfulBackgroundIds: []
	});
	expect(diagnostic.selectedFallbackBlockerIds).toEqual(
		expectedFallback.selectedFallbackBlockerIds
	);
	expect(diagnostic.selectedFallbackDecorIds).toEqual(expectedFallback.selectedFallbackDecorIds);
	expect(diagnostic.selectedFallbackFenceIds).toEqual(expectedFallback.selectedFallbackFenceIds);
}

function runtimeIdentity(diagnostic: BackgroundDiagnostic) {
	return {
		collisionIds: diagnostic.collisionIds,
		statefulObjectIds: diagnostic.statefulObjectIds
	};
}

function assertRuntimeIdentity(
	diagnostic: BackgroundDiagnostic,
	expected: ReturnType<typeof runtimeIdentity>
) {
	expect(diagnostic.collisionIds).toEqual(expected.collisionIds);
	expect(diagnostic.statefulObjectIds).toEqual(expected.statefulObjectIds);
}

test('complete Meadow package is the production default and explicit off restores fallback', async ({
	page
}) => {
	test.setTimeout(120_000);
	await page.setViewportSize({ width: 1_920, height: 1_080 });
	await installCompleteProbes(page);

	await page.goto('/?meadowPaintedPilot=off');
	await expect(page.locator('canvas')).toBeVisible();
	const fallbackDiagnostic = await waitForMeadowDiagnostic(page);
	expect(fallbackDiagnostic).toMatchObject({
		mapId: 'meadow-entry',
		packageId: null,
		presentationMode: 'fallback',
		selectedBackgroundIds: [],
		requiredBackgroundIds: []
	});
	// A no-package fallback has no required IDs and therefore reports empty
	// selected collections. A failed selected package reports the restored legacy
	// static collections; derive that exact expected set from the authored map.
	expect(fallbackDiagnostic.selectedFallbackBlockerIds).toEqual([]);
	expect(fallbackDiagnostic.selectedFallbackDecorIds).toEqual([]);
	expect(fallbackDiagnostic.selectedFallbackFenceIds).toEqual([]);

	await page.goto('/?movementDiagnostics=on');
	await expect(page.locator('canvas')).toBeVisible();
	const completeDiagnostic = await waitForMeadowDiagnostic(page);
	assertCompletePaintedDiagnostic(completeDiagnostic);
	const completeRuntimeIdentity = runtimeIdentity(completeDiagnostic);
	expect(completeRuntimeIdentity.collisionIds.length).toBeGreaterThan(0);
	expect(completeRuntimeIdentity.statefulObjectIds.length).toBeGreaterThan(0);
	assertRuntimeIdentity(fallbackDiagnostic, completeRuntimeIdentity);

	// The full-map package owns presentation only. The authored Meadow still has
	// collision, transitions, NPCs, discoveries, and encounters in its live map.
	expect(meadowEntryMap.blockers?.length ?? 0).toBeGreaterThan(0);
	expect(meadowEntryMap.transitions.length).toBeGreaterThan(0);
	expect(
		(meadowEntryMap.ambientNpcs?.length ?? 0) + (meadowEntryMap.npcs?.length ?? 0)
	).toBeGreaterThan(0);
	await page.locator('canvas').click();
	await page.keyboard.down('ArrowDown');
	try {
		await page.waitForFunction(
			() =>
				(window as CompleteProbeWindow).__completeMovementDiagnostics?.some(
					(diagnostic) => diagnostic.mapId === 'meadow-entry' && diagnostic.blocked
				) === true,
			undefined,
			{ timeout: 15_000 }
		);
	} finally {
		await page.keyboard.up('ArrowDown');
	}
	const blockedMovement = await page.evaluate(() => {
		const diagnostics = (window as CompleteProbeWindow).__completeMovementDiagnostics ?? [];
		return [...diagnostics]
			.reverse()
			.find(({ mapId, blocked }) => mapId === 'meadow-entry' && blocked);
	});
	expect(blockedMovement).toMatchObject({ mapId: 'meadow-entry', blocked: true });

	await page.goto(completeUrl(`&regionalBackgroundFault=${COMPLETE_TEXTURE_IDS[0]}:render`));
	await expect(page.locator('canvas')).toBeVisible();
	const firstFaultDiagnostic = await waitForMeadowDiagnostic(page);
	assertFallbackDiagnostic(firstFaultDiagnostic, EXPECTED_FALLBACK_COLLECTIONS);
	assertRuntimeIdentity(firstFaultDiagnostic, completeRuntimeIdentity);
	expect(firstFaultDiagnostic.entries).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ id: COMPLETE_TEXTURE_IDS[0], status: 'render-failed' })
		])
	);
	await saveCanvas(page, 'fallback-missing-northwest-1920x1080.png');
});

test.describe('complete Meadow atomic texture-fault rollback', () => {
	for (const textureId of COMPLETE_TEXTURE_IDS) {
		test(`restores fallback when ${textureId} fails`, async ({ page }) => {
			test.setTimeout(90_000);
			await page.setViewportSize({ width: 1_920, height: 1_080 });
			await installCompleteProbes(page);

			await page.goto(completeUrl());
			await expect(page.locator('canvas')).toBeVisible();
			const healthy = await waitForMeadowDiagnostic(page);
			assertCompletePaintedDiagnostic(healthy);
			const healthyRuntimeIdentity = runtimeIdentity(healthy);

			await page.goto(completeUrl(`&regionalBackgroundFault=${textureId}:render`));
			await expect(page.locator('canvas')).toBeVisible();
			const fault = await waitForMeadowDiagnostic(page);
			assertFallbackDiagnostic(fault, EXPECTED_FALLBACK_COLLECTIONS);
			assertRuntimeIdentity(fault, healthyRuntimeIdentity);
			expect(fault.entries).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: textureId,
						textureKey: textureId.replace(/-image$/, ''),
						status: 'render-failed'
					})
				])
			);
			const hud = await page.evaluate(
				() => (window as CompleteProbeWindow).__completeHudState ?? null
			);
			expect(hud?.mapId).toBe('meadow-entry');
		});
	}
});
