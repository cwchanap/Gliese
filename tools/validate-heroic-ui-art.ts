/**
 * Heroic UI art validation: structural checks on the source art package
 * (public/game/assets/heroic-ui) and the runtime review captures
 * (docs/visual-references/heroic-ui/runtime).
 *
 * Dimensions, alpha content, and presence only — the source/runtime PNG pairs
 * are human-review evidence, never pixel goldens.
 */
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import sharp from 'sharp';

export const HEROIC_UI_ASSET_ROOT = 'public/game/assets/heroic-ui';
export const HEROIC_UI_RUNTIME_ROOT = 'docs/visual-references/heroic-ui/runtime';

const TITLE_KEY_ART = { file: 'title-key-art.png', width: 1440, height: 900 };
const LIAM_PORTRAIT = { file: 'liam-portrait.png', width: 1024, height: 1024 };
const LIAM_PAPER_DOLL = { file: 'liam-paper-doll.png', width: 700, height: 1200 };
const BATTLE_BACKDROP = { file: 'battle-backdrop.png', width: 1440, height: 900 };

const BUSTS = ['blacksmith-oren', 'guild-master-arlen', 'liam', 'mira', 'quartermaster-vale'];
const BUST_WIDTH = 512;
const BUST_HEIGHT = 576;
const ENEMY_PLATES = ['slime-scout', 'ruins-warden'];
const COMMAND_ICONS = ['bag', 'gear', 'map', 'quest', 'rest', 'save', 'skill', 'system'];
const CAPTURE_WIDTH = 1440;
const CAPTURE_HEIGHT = 900;
const RUNTIME_CAPTURES = [
	'01-title',
	'02-field',
	'03-bag',
	'04-shop',
	'05-quest',
	'06-dialogue',
	'07-battle',
	'08-victory',
	'09-save',
	'10-system',
	'map-regression',
	'skill-regression'
];

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

async function assertDimensions(
	path: string,
	width: number,
	height: number,
	label: string
): Promise<void> {
	const metadata = await sharp(await readFile(path)).metadata();
	assert(
		metadata.width === width && metadata.height === height,
		`${label} must be ${width}x${height}, got ${metadata.width}x${metadata.height}`
	);
}

/** Decodes as RGBA and requires both fully transparent and visible pixels. */
async function assertTransparency(path: string, label: string): Promise<void> {
	const { data, info } = await sharp(await readFile(path))
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	assert(info.channels === 4, `${label} did not decode as RGBA`);
	let hasTransparent = false;
	let hasVisible = false;
	for (let index = 3; index < data.length; index += 4) {
		const alpha = data[index]!;
		if (alpha === 0) hasTransparent = true;
		else hasVisible = true;
		if (hasTransparent && hasVisible) return;
	}
	assert(hasTransparent && hasVisible, `${label} must contain both transparent and visible pixels`);
}

async function assertNonEmpty(path: string, label: string): Promise<void> {
	const { size } = await stat(path);
	assert(size > 0, `${label} is zero-byte: ${path}`);
}

export async function validateHeroicUiArt(repositoryRoot = process.cwd()): Promise<void> {
	const assetRoot = join(repositoryRoot, HEROIC_UI_ASSET_ROOT);

	// Key art, portrait, paper doll, and battle backdrop at their authored sizes.
	for (const art of [TITLE_KEY_ART, LIAM_PORTRAIT, LIAM_PAPER_DOLL, BATTLE_BACKDROP]) {
		await assertDimensions(join(assetRoot, art.file), art.width, art.height, art.file);
	}

	// Neutral busts: UI-sized with true transparency.
	for (const bust of BUSTS) {
		const path = join(assetRoot, 'busts', `${bust}.png`);
		await assertDimensions(path, BUST_WIDTH, BUST_HEIGHT, `bust ${bust}`);
		await assertTransparency(path, `bust ${bust}`);
	}

	// Enemy plate art exists; flourish is transparent.
	for (const plate of ENEMY_PLATES) {
		await assertNonEmpty(join(assetRoot, 'enemies', `${plate}.png`), `enemy plate ${plate}`);
	}
	await assertTransparency(join(assetRoot, 'victory-flourish.png'), 'victory flourish');

	// Eight field command icons exist, and no package art file is missing/empty.
	for (const icon of COMMAND_ICONS) {
		await assertNonEmpty(join(assetRoot, 'icons', `${icon}.svg`), `command icon ${icon}`);
	}

	// Runtime review captures exist at the mockup canvas size.
	const runtimeRoot = join(repositoryRoot, HEROIC_UI_RUNTIME_ROOT);
	for (const capture of RUNTIME_CAPTURES) {
		const path = join(runtimeRoot, `${capture}.png`);
		await assertNonEmpty(path, `runtime capture ${capture}`);
		await assertDimensions(path, CAPTURE_WIDTH, CAPTURE_HEIGHT, `runtime capture ${capture}`);
	}
}

if (import.meta.main) {
	await validateHeroicUiArt()
		.then(() => console.log('Heroic UI art validated'))
		.catch((error: unknown) => {
			console.error(error instanceof Error ? error.message : error);
			process.exitCode = 1;
		});
}
