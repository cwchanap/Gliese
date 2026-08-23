import { createHash, randomUUID } from 'node:crypto';
import { open, readFile, rename, unlink, mkdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

import sharp from 'sharp';

import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS,
	type MeadowEntryPaintedV2CompletePanelId,
	type MeadowEntryPaintedV2CompleteSourcePanel
} from '../src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete';
import { MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT } from '../src/lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly';
import {
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng,
	writeAtomicMeadowEntryPng
} from '../src/lib/game/content/backgrounds/meadow-entry-png';
import { parseFlagPairs } from './parse-flag-pairs';

const COMPLETE_PACKAGE_ID = 'meadow-entry-painted-v2-complete';
const SHA256 = /^[a-f0-9]{64}$/;
const REQUIRED_ARGUMENTS = ['--panel', '--input'] as const;

export interface NormalizeMeadowEntryPaintedV2CompleteSourceInput {
	readonly panelId: MeadowEntryPaintedV2CompletePanelId;
	readonly inputPath: string;
	readonly repositoryRoot?: string;
}

export interface NormalizeMeadowEntryPaintedV2CompleteSourceResult {
	readonly panelId: MeadowEntryPaintedV2CompletePanelId;
	readonly rawPath: string;
	readonly normalizedPath: string;
	readonly provenancePath: string;
	readonly normalizedSha256: string;
	readonly normalizedBytes: number;
	readonly transform: {
		readonly native: { readonly width: number; readonly height: number };
		readonly crop: {
			readonly left: number;
			readonly top: number;
			readonly width: number;
			readonly height: number;
		};
		readonly output: { readonly width: number; readonly height: number };
		readonly scale: number;
	};
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function sha256(value: Buffer): string {
	return createHash('sha256').update(value).digest('hex');
}

function stableValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stableValue);
	if (typeof value !== 'object' || value === null) return value;
	return Object.fromEntries(
		Object.keys(value as Record<string, unknown>)
			.sort()
			.map((key) => [key, stableValue((value as Record<string, unknown>)[key])])
	);
}

function stableJson(value: unknown): Buffer {
	return Buffer.from(`${JSON.stringify(stableValue(value), null, '\t')}\n`);
}

function panelById(panelId: string): MeadowEntryPaintedV2CompleteSourcePanel {
	const panel = MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS.find(({ id }) => id === panelId);
	assert(panel !== undefined, `Unknown complete Meadow Entry source panel: ${panelId}`);
	return panel;
}

function assertInside(root: string, path: string, label: string): void {
	const relativePath = relative(root, path).replaceAll('\\', '/');
	assert(
		relativePath !== '' &&
			relativePath !== '..' &&
			!relativePath.startsWith('../') &&
			!relativePath.startsWith('/'),
		`Refusing complete Meadow Entry ${label} outside the repository root`
	);
	assert(
		relativePath.startsWith('artifacts/meadow-entry/painted-v2/complete/'),
		`Refusing complete Meadow Entry ${label} outside the complete namespace`
	);
}

function parsePanelId(value: string): MeadowEntryPaintedV2CompletePanelId {
	return panelById(value).id;
}

export function parseMeadowEntryPaintedV2CompleteSourceArguments(argv: readonly string[]): {
	readonly panelId: MeadowEntryPaintedV2CompletePanelId;
	readonly inputPath: string;
} {
	const values = parseFlagPairs([...REQUIRED_ARGUMENTS], [...argv]);
	for (const name of REQUIRED_ARGUMENTS) {
		assert(values.has(name.slice(2)), `Missing required argument ${name}`);
	}
	const inputPath = values.get('input')!;
	assert(inputPath.length > 0, 'Complete Meadow Entry source input path is empty');
	return { panelId: parsePanelId(values.get('panel')!), inputPath };
}

async function writeAtomicBytes(path: string, bytes: Buffer): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
	try {
		const handle = await open(temporary, 'wx');
		try {
			await handle.writeFile(bytes);
			await handle.sync();
		} finally {
			await handle.close();
		}
		await rename(temporary, path);
	} catch (error) {
		await unlink(temporary).catch(() => undefined);
		throw error;
	}
}

function outputPath(repositoryRoot: string, relativePath: string, label: string): string {
	const path = resolve(repositoryRoot, relativePath);
	assertInside(repositoryRoot, path, label);
	return path;
}

export async function normalizeMeadowEntryPaintedV2CompleteSource(
	input: NormalizeMeadowEntryPaintedV2CompleteSourceInput
): Promise<NormalizeMeadowEntryPaintedV2CompleteSourceResult> {
	const repositoryRoot = resolve(input.repositoryRoot ?? process.cwd());
	const panel = panelById(input.panelId);
	const inputPath = resolve(input.inputPath);
	const nativeBytes = await readFile(inputPath);
	const native = await decodeMeadowEntryRgba(nativeBytes);
	assert(
		native.width > 0 && native.height > 0,
		`Complete Meadow Entry panel ${panel.id} input dimensions are invalid`
	);
	for (let offset = 3; offset < native.data.length; offset += 4) {
		assert(
			native.data[offset] === 255,
			`Complete Meadow Entry panel ${panel.id} source must be opaque`
		);
	}

	const targetWidth = panel.expectedDimensions.width;
	const targetHeight = panel.expectedDimensions.height;
	const scale = Math.max(targetWidth / native.width, targetHeight / native.height);
	assert(
		Number.isFinite(scale) && scale > 0,
		`Complete Meadow Entry panel ${panel.id} cover scale is invalid`
	);
	assert(
		scale <= 2,
		`Complete Meadow Entry panel ${panel.id} requires ${scale}x uniform upscaling, above the 2x limit`
	);
	const scaledWidth = Math.max(targetWidth, Math.ceil(native.width * scale));
	const scaledHeight = Math.max(targetHeight, Math.ceil(native.height * scale));
	const crop = {
		left: Math.floor((scaledWidth - targetWidth) / 2),
		top: Math.floor((scaledHeight - targetHeight) / 2),
		width: targetWidth,
		height: targetHeight
	};
	const { data, info } = await sharp(nativeBytes)
		.toColourspace('srgb')
		.ensureAlpha()
		.resize(targetWidth, targetHeight, {
			fit: 'cover',
			position: 'centre',
			kernel: sharp.kernel.lanczos3
		})
		.raw()
		.toBuffer({ resolveWithObject: true });
	assert(
		info.channels === 4,
		`Complete Meadow Entry panel ${panel.id} normalization did not produce RGBA`
	);
	for (let offset = 3; offset < data.length; offset += 4) {
		assert(
			data[offset] === 255,
			`Complete Meadow Entry panel ${panel.id} normalization introduced transparency`
		);
	}
	const normalizedPng = await encodeCanonicalMeadowEntryPng(data, targetWidth, targetHeight);
	const normalizedSha256 = sha256(normalizedPng);
	assert(SHA256.test(normalizedSha256), 'Complete Meadow Entry normalized hash is invalid');

	const rawPath = outputPath(repositoryRoot, panel.rawPath, `${panel.id} raw source`);
	const normalizedPath = outputPath(
		repositoryRoot,
		panel.normalizedPath,
		`${panel.id} normalized source`
	);
	const provenancePath = outputPath(repositoryRoot, panel.provenancePath, `${panel.id} provenance`);
	const rawRelativePath = panel.rawPath;
	const transform = {
		native: { width: native.width, height: native.height },
		crop,
		output: { width: targetWidth, height: targetHeight },
		scale
	};
	const provenance = stableJson({
		packageId: COMPLETE_PACKAGE_ID,
		panelId: panel.id,
		bounds: panel.bounds,
		controlFingerprint: MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT,
		raw: {
			path: rawRelativePath,
			sha256: sha256(nativeBytes),
			bytes: nativeBytes.byteLength,
			dimensions: { width: native.width, height: native.height }
		},
		normalized: {
			path: panel.normalizedPath,
			sha256: normalizedSha256,
			bytes: normalizedPng.byteLength,
			dimensions: { width: targetWidth, height: targetHeight }
		},
		transform,
		canonicalPngChunks: ['IHDR', 'IDAT', 'IEND']
	});

	await mkdir(dirname(rawPath), { recursive: true });
	await mkdir(dirname(normalizedPath), { recursive: true });
	await mkdir(dirname(provenancePath), { recursive: true });
	await writeAtomicBytes(rawPath, nativeBytes);
	await writeAtomicMeadowEntryPng(normalizedPath, normalizedPng);
	await writeAtomicBytes(provenancePath, provenance);
	return {
		panelId: panel.id,
		rawPath,
		normalizedPath,
		provenancePath,
		normalizedSha256,
		normalizedBytes: normalizedPng.byteLength,
		transform
	};
}

if (import.meta.main) {
	const args = parseMeadowEntryPaintedV2CompleteSourceArguments(process.argv.slice(2));
	normalizeMeadowEntryPaintedV2CompleteSource(args)
		.then((result) => console.log(JSON.stringify(result)))
		.catch((error: unknown) => {
			console.error(error instanceof Error ? error.message : error);
			process.exitCode = 1;
		});
}
