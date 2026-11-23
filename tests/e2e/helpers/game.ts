import { expect, type Page } from '@playwright/test';

export const SAVES_STORAGE_KEY = 'gliese.saves.v1';

async function waitForPlaying(page: Page) {
	await expect(page.locator('canvas')).toBeVisible();
	// A save seeded inside an encounter's aggro radius can open the battle
	// scene — and on a contended runner even resolve it — before the field
	// HUD's Menu button ever mounts (hosted run 45286324261: Victory at the
	// 5s mark). The battle HUD or its summary are equally "playing" states,
	// matched by locale-stable testid.
	const battleUi = page.locator('[data-testid="battle-hud"], [data-testid="battle-summary"]');
	await expect(page.getByRole('button', { name: 'Menu' }).or(battleUi)).toBeVisible();
	// Menu/canvas exist before Phaser boots; the field HUD's "Loading game"
	// placeholder is only replaced by WorldScene's first publish, when interact
	// keys are live. Waiting for it keeps keyboard interactions deterministic.
	// A cold boot also pays for the Phaser import and BootScene's image preload,
	// which exceeds the 5s default expect timeout on contended CI runners — the
	// 30s bound matches the suite's other post-boot barriers. An immediate
	// battle can skip the field publish entirely, so the battle UI satisfies
	// the same readiness guarantee here.
	await expect
		.poll(
			async () =>
				(await page.getByText('Loading game').count()) === 0 || (await battleUi.count()) > 0,
			{ timeout: 30_000 }
		)
		.toBe(true);
}

/**
 * Boots a fresh run through the Title screen.
 *
 * `movementDiagnostics` arms `?movementDiagnostics=on` after the real Title
 * has rendered: the shell only classifies the entry URL once at mount, so a
 * history.replaceState adds the render option for WorldScene's create() —
 * where resolveWorldRenderOptions re-reads location.search — without a
 * reload and without turning the visit into a direct-boot tooling link. The
 * player's Title → New Run journey stays intact.
 */
export async function startNewRunFromTitle(
	page: Page,
	options: { movementDiagnostics?: boolean } = {}
) {
	await page.goto('/');
	const newRun = page.getByRole('button', { name: /New Run/i });
	await expect(newRun).toBeVisible();
	if (options.movementDiagnostics) {
		await page.evaluate(() => {
			const url = new URL(window.location.href);
			url.searchParams.set('movementDiagnostics', 'on');
			window.history.replaceState(null, '', url);
		});
	}
	await newRun.click();
	// An existing autosave raises the overwrite confirm; fresh profiles boot
	// straight into the run. Race the two outcomes so both stay deterministic.
	const confirm = page.getByTestId('confirm-new-run');
	const menu = page.getByRole('button', { name: 'Menu' });
	const outcome = await Promise.race([
		confirm.waitFor({ state: 'visible' }).then(() => 'confirm' as const),
		menu.waitFor({ state: 'visible' }).then(() => 'playing' as const)
	]);
	if (outcome === 'confirm') await confirm.click();
	await waitForPlaying(page);
}

export async function startNewRunThroughOpening(page: Page) {
	await startNewRunFromTitle(page);
	const opening = page.getByRole('dialog');
	await opening.waitFor({ state: 'visible', timeout: 30_000 });
	for (let advance = 0; advance < 40 && (await opening.count()) > 0; advance += 1) {
		const before = (await opening.allTextContents()).join('');
		await page.keyboard.press('Enter');
		// Condition-based advance: the next line changes the dialog's text, the
		// last one closes it. No probe dependency and no fixed sleep.
		await page
			.waitForFunction(
				(prev) => {
					const dialogs = document.querySelectorAll('dialog');
					if (dialogs.length === 0) return true;
					return [...dialogs].map((d) => d.textContent).join('') !== prev;
				},
				before,
				{ timeout: 5_000 }
			)
			.catch(() => {});
	}
	await expect(opening).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
}

/** Boots through the Title screen: Continue opens the Load picker, then resumes the first occupied slot. */
export async function continueFromTitle(page: Page) {
	await page.goto('/');
	await continueFromTitlePicker(page);
}

/**
 * The picker half of Continue, for a Title screen that is already rendered:
 * same-page returns (e.g. dismissing the completion card) must not reload
 * the document, which would clear the state the test is there to exercise.
 */
export async function continueFromTitlePicker(page: Page) {
	await page.getByRole('button', { name: /Continue/i }).click();
	const loadDialog = page.getByRole('dialog', { name: /load/i });
	await expect(loadDialog).toBeVisible();
	await loadDialog.locator('[data-testid^="save-slot-"]:not([disabled])').first().click();
	await waitForPlaying(page);
}

type SaveSlotSeed = {
	kind?: 'autosave' | 'manual';
	savedAt?: string;
	playtimeSeconds?: number;
	state: unknown;
};

/**
 * Seeds `gliese.saves.v1` before page load. Pass one seed per slot index
 * (0 = autosave, 1/2 = manual); a slot seeded as `null` stays empty unless
 * another seed provides `savedAt` ordering.
 */
export async function seedSaveSlots(page: Page, seeds: Array<SaveSlotSeed | null>) {
	if (seeds.length > 3) throw new Error('gliese.saves.v1 holds exactly 3 slots');
	// The runtime validates the envelope as an exact 3-slot tuple and discards
	// anything else, so pad the seed out to the full slot count.
	const records: Array<Record<string, unknown> | null> = seeds.map((seed) =>
		seed
			? {
					kind: seed.kind ?? 'autosave',
					savedAt: seed.savedAt ?? '2026-09-04T12:00:00.000Z',
					playtimeSeconds: seed.playtimeSeconds ?? 0,
					state: seed.state
				}
			: null
	);
	while (records.length < 3) records.push(null);
	const envelope = { version: 1, slots: records };

	await page.addInitScript(
		({ key, encoded, marker }) => {
			// Seed once per page session: a reload must exercise the envelope the
			// game rewrote, not silently restore the stale fixture.
			if (window.sessionStorage.getItem(marker) === '1') return;
			window.localStorage.setItem(key, encoded);
			window.sessionStorage.setItem(marker, '1');
		},
		{
			key: SAVES_STORAGE_KEY,
			encoded: JSON.stringify(envelope),
			marker: '__gliese_e2e_slots_seeded_v1'
		}
	);
}

/** Convenience: seed a single autosave record. */
export async function seedAutosaveSlot(page: Page, state: unknown) {
	await seedSaveSlots(page, [{ kind: 'autosave', state }]);
}

/** Reads the persisted slot envelope from localStorage. */
export function readSlotEnvelope(page: Page) {
	return page.evaluate(
		(key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
		SAVES_STORAGE_KEY
	) as Promise<{
		version: number;
		slots: Array<null | {
			kind: string;
			savedAt: string;
			playtimeSeconds: number;
			thumbnail?: string;
			state: Record<string, unknown>;
		}>;
	} | null>;
}

/**
 * Saves the run into manual slot `slot` (1 or 2) through the real Save screen.
 * Saving into an empty slot writes directly; saving again into the same slot
 * exercises the overwrite confirmation.
 */
export async function saveThroughSaveScreen(page: Page, slot: 1 | 2 = 1) {
	// The envelope decides the flow up front: an occupied slot always hits the
	// overwrite confirmation, an empty one never renders it.
	const envelope = await readSlotEnvelope(page);
	const overwriteExpected = Boolean(envelope?.slots[slot]);

	await page.getByRole('button', { name: 'Menu' }).click();
	const commandBox = page.getByLabel('Command');
	await commandBox.getByRole('button', { name: 'Save' }).click();

	const dialog = page.getByRole('dialog', { name: /^Save$/i });
	await expect(dialog).toBeVisible();

	await dialog.getByTestId(`save-slot-${slot}`).click();
	if (overwriteExpected) {
		const confirm = dialog.getByTestId('confirm-overwrite');
		await expect(confirm).toBeVisible();
		await confirm.click();
	}

	await expect(dialog.getByText(/Saved/i)).toBeVisible();
	await dialog.getByRole('button', { name: 'Back' }).click();
	await expect(dialog).toBeHidden();
}
