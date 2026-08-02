import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import sharp, { type Sharp } from 'sharp';

import type { PixelBounds } from '$lib/game/content/backgrounds/meadow-entry-authoring-types';
import {
	MEADOW_ENTRY_APPROVED_CROPS,
	MEADOW_ENTRY_APPROVED_OVERLAPS,
	MEADOW_ENTRY_RUNTIME_COVERAGE
} from '$lib/game/content/backgrounds/meadow-entry-crop-manifest';
import {
	MEADOW_ENTRY_PROOF_DESCRIPTORS,
	MEADOW_ENTRY_PROOF_FILENAMES,
	assertAllowedMeadowEntryProofDestination,
	renderMeadowEntryOverlapDifference,
	renderMeadowEntryReviewComposite,
	type MeadowEntryProofDescriptor
} from '$lib/game/content/backgrounds/meadow-entry-proof-renderer';
import {
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng,
	validateCanonicalPngChunks
} from '$lib/game/content/backgrounds/meadow-entry-png';

const PROOF_ROOT = 'docs/superpowers/reports/img/hpa-399/proofs';
const PACKAGE_ROOT = 'artifacts/meadow-entry/hpa-399';
const BASE_MASTER = `${PACKAGE_ROOT}/masters/meadow-entry-base-master.png`;
const FOREGROUND_MASTER = `${PACKAGE_ROOT}/masters/meadow-entry-foreground-master.png`;
const EXPORT_ROOT = `${PACKAGE_ROOT}/exports`;
const CROP_MANIFEST = `${PACKAGE_ROOT}/provenance/meadow-entry-crop-manifest.json`;
const SUNDROP_BASE = 'public/game/assets/regions/sundrop-village-base.png';
const SUNDROP_FOREGROUND = 'public/game/assets/regions/sundrop-village-foreground.png';
const CONTROL_ROOT = 'docs/superpowers/reports/img/hpa-399/controls';
const PROOF_SENTINEL = 'docs/superpowers/reports/img/hpa-399/.meadow-entry-proof-publication.lock';

const FULL_MASKS = {
	'full/protected-live-overlay': `${CONTROL_ROOT}/meadow-entry-protected-live-mask.svg`,
	'full/collision-overlay': `${CONTROL_ROOT}/meadow-entry-collision-mask.svg`,
	'full/foreground-eligibility-overlay': `${CONTROL_ROOT}/meadow-entry-foreground-eligible-mask.svg`,
	'full/baked-coverage': `${CONTROL_ROOT}/meadow-entry-runtime-base-coverage-mask.svg`,
	'full/fallback-coverage': `${CONTROL_ROOT}/meadow-entry-runtime-fallback-coverage-mask.svg`
} as const;
const INTERACTION_MASKS = [
	`${CONTROL_ROOT}/meadow-entry-semantic-anchor-mask.svg`,
	`${CONTROL_ROOT}/meadow-entry-entrance-transition-mask.svg`,
	`${CONTROL_ROOT}/meadow-entry-reward-discovery-mask.svg`
] as const;

interface ProofInput {
	path: string;
	sha256: string;
}

export interface MeadowEntryProofSidecar {
	version: 1;
	proofId: string;
	path: string;
	sha256: string;
	bytes: number;
	width: number;
	height: number;
	masterBounds: PixelBounds;
	inputs: readonly ProofInput[];
	inputSha256: readonly string[];
	metrics: Readonly<Record<string, unknown>>;
}

export type MeadowEntryProofPublicationPhase =
	| 'sentinel-written'
	| 'previous-backed-up'
	| 'replacement-installed'
	| 'replacement-validated'
	| 'sentinel-removed'
	| 'rollback-target-removed'
	| 'rollback-backup-restored'
	| 'rollback-sentinel-removed'
	| 'rollback-failed';

export interface MeadowEntryProofPublicationFileSystem {
	pathExists(path: string): Promise<boolean>;
	listFiles(root: string): Promise<string[]>;
	mkdir: typeof mkdir;
	rename: typeof rename;
	rm: typeof rm;
	writeFile: typeof writeFile;
}

export interface MeadowEntryProofSnapshotFileSystem {
	pathExists(path: string): Promise<boolean>;
	listFiles(root: string): Promise<string[]>;
	readFile(path: string): Promise<Buffer>;
}

export interface MeadowEntryPublishedProof {
	descriptor: MeadowEntryProofDescriptor;
	png: Buffer;
	sidecar: MeadowEntryProofSidecar;
	sidecarBytes: Buffer;
}

export interface MeadowEntryProofSnapshot {
	attemptsUsed: number;
	proofs: readonly MeadowEntryPublishedProof[];
}

interface RenderContext {
	repositoryRoot: string;
	stagingRoot: string;
	baseMaster: Buffer;
	foregroundMaster: Buffer;
	sundropBase: Buffer;
	sundropForeground: Buffer;
	reviewComposite: Buffer;
	written: Set<string>;
	hashCache: Map<string, string>;
}

function sha256(value: Buffer): string {
	return createHash('sha256').update(value).digest('hex');
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function dimensions(bounds: PixelBounds): { width: number; height: number } {
	return { width: bounds.right - bounds.left, height: bounds.bottom - bounds.top };
}

function extractOptions(bounds: PixelBounds): {
	left: number;
	top: number;
	width: number;
	height: number;
} {
	return { left: bounds.left, top: bounds.top, ...dimensions(bounds) };
}

async function nodePathExists(path: string): Promise<boolean> {
	try {
		await lstat(path);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
		throw error;
	}
}

async function canonicalPipeline(pipeline: Sharp): Promise<Buffer> {
	const { data, info } = await pipeline
		.toColourspace('srgb')
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	assert(info.channels === 4, 'Meadow Entry proof pipeline did not produce RGBA');
	return await encodeCanonicalMeadowEntryPng(data, info.width, info.height);
}

async function canonicalExtract(png: Buffer, bounds: PixelBounds): Promise<Buffer> {
	return await canonicalPipeline(sharp(png).extract(extractOptions(bounds)));
}

function checkerboardSvg(width: number, height: number): Buffer {
	return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><pattern id="checker" width="64" height="64" patternUnits="userSpaceOnUse"><rect width="64" height="64" fill="#d6d6d6"/><path d="M0 0h32v32H0zm32 32h32v32H32z" fill="#9b9b9b"/></pattern></defs>
  <rect width="${width}" height="${height}" fill="url(#checker)"/>
</svg>`);
}

function boundarySvg(
	width: number,
	height: number,
	sides: readonly ('top' | 'right' | 'bottom' | 'left')[] = ['top', 'right', 'bottom', 'left']
): Buffer {
	const line = 8;
	const rectangles = sides.map((side) => {
		if (side === 'top') return `<rect x="0" y="0" width="${width}" height="${line}"/>`;
		if (side === 'right')
			return `<rect x="${Math.max(0, width - line)}" y="0" width="${line}" height="${height}"/>`;
		if (side === 'bottom')
			return `<rect x="0" y="${Math.max(0, height - line)}" width="${width}" height="${line}"/>`;
		return `<rect x="0" y="0" width="${line}" height="${height}"/>`;
	});
	return Buffer.from(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g fill="#ff2b2b" fill-opacity="0.9">${rectangles.join('')}</g></svg>`
	);
}

function cornerGroupSvg(
	masterBounds: PixelBounds,
	overlaps: readonly (typeof MEADOW_ENTRY_APPROVED_OVERLAPS)[number][]
): Buffer {
	const { width, height } = dimensions(masterBounds);
	const rectangles = overlaps
		.map((overlap) => {
			const bounds = overlap.bounds;
			const mouth = overlap.routeMouth.bounds;
			return `<g data-overlap-id="${overlap.id}">
  <rect x="${bounds.left - masterBounds.left}" y="${bounds.top - masterBounds.top}" width="${bounds.right - bounds.left}" height="${bounds.bottom - bounds.top}" fill="none" stroke="#ff2b2b" stroke-width="8"/>
  <rect x="${mouth.left - masterBounds.left}" y="${mouth.top - masterBounds.top}" width="${mouth.right - mouth.left}" height="${mouth.bottom - mouth.top}" fill="#20b8ff" fill-opacity="0.35" stroke="#20b8ff" stroke-width="8"/>
</g>`;
		})
		.join('\n');
	return Buffer.from(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${rectangles}</svg>`
	);
}

async function hashInput(context: RenderContext, path: string): Promise<ProofInput> {
	let value = context.hashCache.get(path);
	if (!value) {
		value = sha256(await readFile(join(context.repositoryRoot, path)));
		context.hashCache.set(path, value);
	}
	return { path, sha256: value };
}

async function writeProof(
	context: RenderContext,
	descriptor: MeadowEntryProofDescriptor,
	png: Buffer,
	inputPaths: readonly string[],
	metrics: Readonly<Record<string, unknown>> = {}
): Promise<void> {
	const relativePng = descriptor.filename;
	const relativeJson = relativePng.replace(/\.png$/, '.json');
	assertAllowedMeadowEntryProofDestination(relativePng);
	assertAllowedMeadowEntryProofDestination(relativeJson);
	assert(!context.written.has(relativePng), `Duplicate Meadow Entry proof output: ${relativePng}`);
	validateCanonicalPngChunks(png);
	const decoded = await decodeMeadowEntryRgba(png);
	const inputs = await Promise.all(inputPaths.map((path) => hashInput(context, path)));
	const sidecar: MeadowEntryProofSidecar = {
		version: 1,
		proofId: descriptor.proofId,
		path: `${PROOF_ROOT}/${relativePng}`,
		sha256: sha256(png),
		bytes: png.byteLength,
		width: decoded.width,
		height: decoded.height,
		masterBounds: descriptor.masterBounds,
		inputs,
		inputSha256: inputs.map(({ sha256: inputSha256 }) => inputSha256),
		metrics
	};
	const pngPath = join(context.stagingRoot, relativePng);
	const jsonPath = join(context.stagingRoot, relativeJson);
	await mkdir(dirname(pngPath), { recursive: true });
	await writeFile(pngPath, png, { flag: 'wx' });
	await writeFile(jsonPath, `${JSON.stringify(sidecar, null, 2)}\n`, { flag: 'wx' });
	context.written.add(relativePng);
	context.written.add(relativeJson);
}

async function renderFullProofs(context: RenderContext): Promise<void> {
	const full = new Map(MEADOW_ENTRY_PROOF_DESCRIPTORS.map((item) => [item.proofId, item]));
	await writeProof(context, full.get('full/base-master')!, context.baseMaster, [BASE_MASTER], {
		pixelTransform: 'none'
	});
	const baseDecoded = await decodeMeadowEntryRgba(context.baseMaster);
	const checkerboard = await canonicalPipeline(
		sharp(checkerboardSvg(baseDecoded.width, baseDecoded.height)).composite([
			{ input: context.foregroundMaster, left: 0, top: 0 }
		])
	);
	await writeProof(
		context,
		full.get('full/foreground-checkerboard')!,
		checkerboard,
		[FOREGROUND_MASTER],
		{ reviewComposite: '64px-checkerboard' }
	);
	await writeProof(
		context,
		full.get('full/immutable-sundrop-composite')!,
		context.reviewComposite,
		[BASE_MASTER, SUNDROP_BASE, FOREGROUND_MASTER, SUNDROP_FOREGROUND],
		{
			drawOrder: [
				'hpa-399-base',
				'immutable-hpa-398-sundrop-base',
				'hpa-399-foreground',
				'immutable-hpa-398-sundrop-foreground'
			]
		}
	);

	for (const [proofId, maskPath] of Object.entries(FULL_MASKS)) {
		const mask = await readFile(join(context.repositoryRoot, maskPath));
		const png = await canonicalPipeline(
			sharp(context.reviewComposite).composite([{ input: mask, left: 0, top: 0 }])
		);
		await writeProof(context, full.get(proofId)!, png, [
			BASE_MASTER,
			SUNDROP_BASE,
			FOREGROUND_MASTER,
			SUNDROP_FOREGROUND,
			maskPath
		]);
	}
	const interactionMasks = await Promise.all(
		INTERACTION_MASKS.map((path) => readFile(join(context.repositoryRoot, path)))
	);
	const interaction = await canonicalPipeline(
		sharp(context.reviewComposite).composite(
			interactionMasks.map((input) => ({ input, left: 0, top: 0 }))
		)
	);
	await writeProof(context, full.get('full/interaction-readability-overlay')!, interaction, [
		BASE_MASTER,
		SUNDROP_BASE,
		FOREGROUND_MASTER,
		SUNDROP_FOREGROUND,
		...INTERACTION_MASKS
	]);
}

async function renderCropProofs(context: RenderContext): Promise<void> {
	const byId = new Map(MEADOW_ENTRY_PROOF_DESCRIPTORS.map((item) => [item.proofId, item]));
	for (const crop of MEADOW_ENTRY_APPROVED_CROPS) {
		const category = crop.id.includes('connector') ? 'connectors' : 'regions';
		const basePath = `${EXPORT_ROOT}/${crop.baseFilename}`;
		const base = await readFile(join(context.repositoryRoot, basePath));
		const inputPaths = [basePath];
		let png: Buffer = base;
		if (crop.foregroundFilename !== null) {
			const foregroundPath = `${EXPORT_ROOT}/${crop.foregroundFilename}`;
			const foreground = await readFile(join(context.repositoryRoot, foregroundPath));
			png = await canonicalPipeline(
				sharp(base).composite([{ input: foreground, left: 0, top: 0 }])
			);
			inputPaths.push(foregroundPath);
		}
		await writeProof(context, byId.get(`${category}/${crop.id}`)!, png, inputPaths, {
			cropId: crop.id,
			textureKeys: crop.textureKeys,
			drawOrder: crop.drawOrder
		});
	}
}

async function extractExportOverlap(
	repositoryRoot: string,
	cropId: string,
	plane: 'base' | 'foreground',
	bounds: PixelBounds
): Promise<{ png: Buffer; path: string }> {
	const crop = MEADOW_ENTRY_APPROVED_CROPS.find(({ id }) => id === cropId)!;
	const filename = plane === 'base' ? crop.baseFilename : crop.foregroundFilename!;
	const path = `${EXPORT_ROOT}/${filename}`;
	const source = await readFile(join(repositoryRoot, path));
	return {
		png: await canonicalExtract(source, {
			left: bounds.left - crop.bounds.left,
			top: bounds.top - crop.bounds.top,
			right: bounds.right - crop.bounds.left,
			bottom: bounds.bottom - crop.bounds.top
		}),
		path
	};
}

async function renderOverlapProofs(context: RenderContext): Promise<void> {
	const byId = new Map(MEADOW_ENTRY_PROOF_DESCRIPTORS.map((item) => [item.proofId, item]));
	for (const overlap of MEADOW_ENTRY_APPROVED_OVERLAPS) {
		const planes: readonly ('base' | 'foreground')[] =
			overlap.planePolicy === 'base-and-foreground' ? ['base', 'foreground'] : ['base'];
		const inputPaths: string[] = [];
		const planeMetrics: Record<string, unknown> = {};
		let proofPng: Buffer | undefined;
		for (const plane of planes) {
			const [first, second] = await Promise.all([
				extractExportOverlap(context.repositoryRoot, overlap.firstCropId, plane, overlap.bounds),
				extractExportOverlap(context.repositoryRoot, overlap.secondCropId, plane, overlap.bounds)
			]);
			inputPaths.push(first.path, second.path);
			const difference = await renderMeadowEntryOverlapDifference(first.png, second.png);
			assert(
				difference.differingPixels === 0 && difference.maximumChannelDifference === 0,
				`Meadow Entry overlap proof differs id=${overlap.id} plane=${plane} first=${JSON.stringify(difference.firstDifference)}`
			);
			proofPng ??= difference.png;
			planeMetrics[plane] = {
				differingPixels: difference.differingPixels,
				maximumChannelDifference: difference.maximumChannelDifference
			};
		}
		await writeProof(context, byId.get(`overlaps/${overlap.id}`)!, proofPng!, inputPaths, {
			planes: planeMetrics,
			ownerCropId: overlap.ownerCropId,
			cornerGroupId: overlap.cornerGroupId ?? null
		});
	}
}

async function renderExtractedBoundaryProofs(context: RenderContext): Promise<void> {
	const byId = new Map(MEADOW_ENTRY_PROOF_DESCRIPTORS.map((item) => [item.proofId, item]));
	for (const cornerGroupId of new Set(
		MEADOW_ENTRY_APPROVED_OVERLAPS.flatMap(({ cornerGroupId }) =>
			cornerGroupId ? [cornerGroupId] : []
		)
	)) {
		const descriptor = byId.get(`corners/${cornerGroupId}`)!;
		const overlaps = MEADOW_ENTRY_APPROVED_OVERLAPS.filter(
			(overlap) => overlap.cornerGroupId === cornerGroupId
		);
		const extract = await canonicalExtract(context.reviewComposite, descriptor.masterBounds);
		const png = await canonicalPipeline(
			sharp(extract).composite([
				{ input: cornerGroupSvg(descriptor.masterBounds, overlaps), left: 0, top: 0 }
			])
		);
		await writeProof(
			context,
			descriptor,
			png,
			[BASE_MASTER, SUNDROP_BASE, FOREGROUND_MASTER, SUNDROP_FOREGROUND, CROP_MANIFEST],
			{
				cornerGroupId,
				overlapIds: overlaps.map(({ id }) => id),
				overlapBoundsColor: '#ff2b2b',
				routeMouthColor: '#20b8ff'
			}
		);
	}

	for (const crop of MEADOW_ENTRY_APPROVED_CROPS) {
		for (const side of crop.edgeClamp?.sides ?? []) {
			const descriptor = byId.get(`clamps/${crop.id}-${side}`)!;
			const source = await canonicalExtract(context.reviewComposite, descriptor.masterBounds);
			const { width, height } = dimensions(descriptor.masterBounds);
			const png = await canonicalPipeline(
				sharp(source).composite([{ input: boundarySvg(width, height, [side]), left: 0, top: 0 }])
			);
			await writeProof(
				context,
				descriptor,
				png,
				[BASE_MASTER, SUNDROP_BASE, FOREGROUND_MASTER, SUNDROP_FOREGROUND, CROP_MANIFEST],
				{ cropId: crop.id, side, preClampBounds: crop.preClampBounds, approvedBounds: crop.bounds }
			);
		}
	}

	for (let index = 0; index < MEADOW_ENTRY_RUNTIME_COVERAGE.length; index += 1) {
		const coverage = MEADOW_ENTRY_RUNTIME_COVERAGE[index]!;
		if (coverage.mode !== 'fallback-tile') continue;
		const descriptor = byId.get(`fallback-boundaries/fallback-${String(index).padStart(3, '0')}`)!;
		const source = await canonicalExtract(context.baseMaster, coverage.bounds);
		const { width, height } = dimensions(coverage.bounds);
		const png = await canonicalPipeline(
			sharp(source).composite([{ input: boundarySvg(width, height), left: 0, top: 0 }])
		);
		await writeProof(context, descriptor, png, [BASE_MASTER, CROP_MANIFEST], {
			coverageIndex: index,
			mode: coverage.mode,
			reason: coverage.reason
		});
	}

	for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
		const descriptor = byId.get(`sundrop-feather/${edge}`)!;
		const png = await canonicalExtract(context.reviewComposite, descriptor.masterBounds);
		await writeProof(
			context,
			descriptor,
			png,
			[BASE_MASTER, SUNDROP_BASE, FOREGROUND_MASTER, SUNDROP_FOREGROUND, CROP_MANIFEST],
			{ edge, featherReviewBandPx: 128 }
		);
	}
}

async function walkFiles(root: string, prefix = ''): Promise<string[]> {
	const entries = await readdir(join(root, prefix), { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		const path = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) files.push(...(await walkFiles(root, path)));
		else {
			assert(entry.isFile(), `Unexpected non-file Meadow Entry proof entry: ${path}`);
			files.push(path);
		}
	}
	return files.sort();
}

function expectedProofInventory(): string[] {
	return MEADOW_ENTRY_PROOF_FILENAMES.flatMap((path) => [
		path,
		path.replace(/\.png$/, '.json')
	]).sort();
}

function expectedProofInventoryFor(
	descriptors: readonly MeadowEntryProofDescriptor[]
): readonly string[] {
	return descriptors
		.flatMap(({ filename }) => [filename, filename.replace(/\.png$/, '.json')])
		.sort();
}

function assertInventoryEquals(expected: readonly string[], actual: readonly string[]): void {
	assert(
		JSON.stringify([...actual].sort()) === JSON.stringify(expected),
		`Meadow Entry proof inventory differs: expected=${expected.join(',')} actual=${actual.join(',')}`
	);
}

const NODE_PROOF_PUBLICATION_FILE_SYSTEM: MeadowEntryProofPublicationFileSystem = {
	pathExists: nodePathExists,
	listFiles: walkFiles,
	mkdir,
	rename,
	rm,
	writeFile
};

const NODE_PROOF_SNAPSHOT_FILE_SYSTEM: MeadowEntryProofSnapshotFileSystem = {
	pathExists: nodePathExists,
	listFiles: walkFiles,
	readFile
};

async function assertExactProofInventory(
	root: string,
	fileSystem: Pick<
		MeadowEntryProofPublicationFileSystem,
		'listFiles'
	> = NODE_PROOF_PUBLICATION_FILE_SYSTEM
): Promise<void> {
	const expected = expectedProofInventory();
	const actual = await fileSystem.listFiles(root);
	assertInventoryEquals(expected, actual);
	for (const path of actual) assertAllowedMeadowEntryProofDestination(path);
}

export async function publishMeadowEntryProofInventory(input: {
	repositoryRoot: string;
	stagingRoot: string;
	token: string;
	fileSystem?: MeadowEntryProofPublicationFileSystem;
	onPhase?: (phase: MeadowEntryProofPublicationPhase) => void;
}): Promise<void> {
	const { repositoryRoot, stagingRoot, token } = input;
	const fileSystem = input.fileSystem ?? NODE_PROOF_PUBLICATION_FILE_SYSTEM;
	const onPhase = input.onPhase ?? (() => undefined);
	const target = join(repositoryRoot, PROOF_ROOT);
	const sentinel = join(repositoryRoot, PROOF_SENTINEL);
	const backup = `${target}.${token}.rollback`;
	await assertExactProofInventory(stagingRoot, fileSystem);
	const hadTarget = await fileSystem.pathExists(target);
	let backedUp = false;
	let installed = false;
	let sentinelOwned = false;
	try {
		if (hadTarget) await assertExactProofInventory(target, fileSystem);
		await fileSystem.mkdir(dirname(sentinel), { recursive: true });
		await fileSystem.writeFile(sentinel, `${token}\n`, { flag: 'wx' });
		sentinelOwned = true;
		onPhase('sentinel-written');
		if (hadTarget) {
			await fileSystem.rename(target, backup);
			backedUp = true;
			onPhase('previous-backed-up');
		}
		await fileSystem.rename(stagingRoot, target);
		installed = true;
		onPhase('replacement-installed');
		await assertExactProofInventory(target, fileSystem);
		onPhase('replacement-validated');
		await fileSystem.rm(sentinel);
		sentinelOwned = false;
		onPhase('sentinel-removed');
	} catch (error) {
		if (sentinelOwned) {
			const rollbackErrors: unknown[] = [];
			let targetRemoved = !installed;
			let backupRestored = !backedUp;
			if (installed) {
				try {
					await fileSystem.rm(target, { recursive: true, force: true });
					targetRemoved = true;
					onPhase('rollback-target-removed');
				} catch (rollbackError) {
					rollbackErrors.push(rollbackError);
				}
			}
			if (backedUp && targetRemoved) {
				try {
					await fileSystem.rename(backup, target);
					backupRestored = true;
					onPhase('rollback-backup-restored');
				} catch (rollbackError) {
					rollbackErrors.push(rollbackError);
				}
			}
			if (targetRemoved && backupRestored) {
				try {
					if (hadTarget) await assertExactProofInventory(target, fileSystem);
					else assert(!(await fileSystem.pathExists(target)), 'Rollback left a proof target');
					await fileSystem.rm(sentinel, { force: true });
					sentinelOwned = false;
					onPhase('rollback-sentinel-removed');
				} catch (rollbackError) {
					rollbackErrors.push(rollbackError);
				}
			}
			if (rollbackErrors.length > 0 || sentinelOwned) {
				onPhase('rollback-failed');
				const messages = rollbackErrors
					.map((item) => (item instanceof Error ? item.message : String(item)))
					.join('; ');
				throw new AggregateError(
					[error, ...rollbackErrors],
					`Meadow Entry proof publication rollback failed closed: ${messages}`,
					{ cause: error }
				);
			}
		}
		throw error;
	} finally {
		await fileSystem.rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined);
	}
	if (backedUp) await fileSystem.rm(backup, { recursive: true, force: true });
	await assertExactProofInventory(target, fileSystem);
}

function proofExportPath(cropId: string, plane: 'base' | 'foreground'): string {
	const crop = MEADOW_ENTRY_APPROVED_CROPS.find(({ id }) => id === cropId);
	assert(crop, `Unknown Meadow Entry proof crop: ${cropId}`);
	const filename = plane === 'base' ? crop.baseFilename : crop.foregroundFilename;
	assert(filename !== null, `Missing Meadow Entry proof foreground crop: ${cropId}`);
	return `${EXPORT_ROOT}/${filename}`;
}

function expectedProofInputPaths(proofId: string): readonly string[] {
	const fourLayers = [BASE_MASTER, SUNDROP_BASE, FOREGROUND_MASTER, SUNDROP_FOREGROUND];
	if (proofId === 'full/base-master') return [BASE_MASTER];
	if (proofId === 'full/foreground-checkerboard') return [FOREGROUND_MASTER];
	if (proofId === 'full/immutable-sundrop-composite') return fourLayers;
	if (proofId === 'full/interaction-readability-overlay') {
		return [...fourLayers, ...INTERACTION_MASKS];
	}
	const fullMask = FULL_MASKS[proofId as keyof typeof FULL_MASKS];
	if (fullMask) return [...fourLayers, fullMask];
	if (proofId.startsWith('regions/') || proofId.startsWith('connectors/')) {
		const cropId = proofId.slice(proofId.indexOf('/') + 1);
		const crop = MEADOW_ENTRY_APPROVED_CROPS.find(({ id }) => id === cropId);
		assert(crop, `Unknown Meadow Entry crop proof: ${proofId}`);
		return [
			proofExportPath(cropId, 'base'),
			...(crop.foregroundFilename === null ? [] : [proofExportPath(cropId, 'foreground')])
		];
	}
	if (proofId.startsWith('overlaps/')) {
		const overlap = MEADOW_ENTRY_APPROVED_OVERLAPS.find(({ id }) => `overlaps/${id}` === proofId);
		assert(overlap, `Unknown Meadow Entry overlap proof: ${proofId}`);
		return [
			proofExportPath(overlap.firstCropId, 'base'),
			proofExportPath(overlap.secondCropId, 'base'),
			...(overlap.planePolicy === 'base-and-foreground'
				? [
						proofExportPath(overlap.firstCropId, 'foreground'),
						proofExportPath(overlap.secondCropId, 'foreground')
					]
				: [])
		];
	}
	if (proofId.startsWith('fallback-boundaries/')) return [BASE_MASTER, CROP_MANIFEST];
	if (
		proofId.startsWith('corners/') ||
		proofId.startsWith('clamps/') ||
		proofId.startsWith('sundrop-feather/')
	) {
		return [...fourLayers, CROP_MANIFEST];
	}
	throw new Error(`Unknown Meadow Entry proof identity: ${proofId}`);
}

function parseProofSidecar(bytes: Buffer, path: string): MeadowEntryProofSidecar {
	let value: unknown;
	try {
		value = JSON.parse(bytes.toString('utf8')) as unknown;
	} catch {
		throw new Error(`Meadow Entry proof sidecar is malformed: ${path}`);
	}
	assert(value !== null && typeof value === 'object' && !Array.isArray(value), `Malformed ${path}`);
	const sidecar = value as Record<string, unknown>;
	assert(
		JSON.stringify(Object.keys(sidecar).sort()) ===
			JSON.stringify([
				'bytes',
				'height',
				'inputSha256',
				'inputs',
				'masterBounds',
				'metrics',
				'path',
				'proofId',
				'sha256',
				'version',
				'width'
			]),
		`Meadow Entry proof sidecar has unexpected fields: ${path}`
	);
	assert(
		Array.isArray(sidecar.inputs) &&
			Array.isArray(sidecar.inputSha256) &&
			sidecar.masterBounds !== null &&
			typeof sidecar.masterBounds === 'object' &&
			!Array.isArray(sidecar.masterBounds) &&
			sidecar.metrics !== null &&
			typeof sidecar.metrics === 'object' &&
			!Array.isArray(sidecar.metrics),
		`Meadow Entry proof sidecar has malformed structured fields: ${path}`
	);
	return sidecar as unknown as MeadowEntryProofSidecar;
}

function boundsEqual(first: PixelBounds, second: PixelBounds): boolean {
	return (
		first.left === second.left &&
		first.top === second.top &&
		first.right === second.right &&
		first.bottom === second.bottom
	);
}

async function readProofGeneration(
	repositoryRoot: string,
	fileSystem: MeadowEntryProofSnapshotFileSystem,
	descriptors: readonly MeadowEntryProofDescriptor[],
	inputPathsFor: (proofId: string) => readonly string[]
): Promise<readonly MeadowEntryPublishedProof[]> {
	const proofRoot = join(repositoryRoot, PROOF_ROOT);
	const expectedInventory = expectedProofInventoryFor(descriptors);
	assertInventoryEquals(expectedInventory, await fileSystem.listFiles(proofRoot));
	const proofs: MeadowEntryPublishedProof[] = [];
	for (const descriptor of descriptors) {
		const relativeJson = descriptor.filename.replace(/\.png$/, '.json');
		const sidecarPath = join(proofRoot, relativeJson);
		const pngPath = join(proofRoot, descriptor.filename);
		const sidecarBytes = await fileSystem.readFile(sidecarPath);
		const sidecar = parseProofSidecar(sidecarBytes, relativeJson);
		const png = await fileSystem.readFile(pngPath);
		validateCanonicalPngChunks(png);
		const decoded = await decodeMeadowEntryRgba(png);
		const expectedDimensions = dimensions(descriptor.masterBounds);
		assert(
			decoded.width === expectedDimensions.width && decoded.height === expectedDimensions.height,
			`Meadow Entry proof dimensions do not match master bounds: ${descriptor.proofId}`
		);
		assert(
			sidecar.version === 1 &&
				sidecar.proofId === descriptor.proofId &&
				sidecar.path === `${PROOF_ROOT}/${descriptor.filename}` &&
				sidecar.sha256 === sha256(png) &&
				sidecar.bytes === png.byteLength &&
				sidecar.width === decoded.width &&
				sidecar.height === decoded.height &&
				boundsEqual(sidecar.masterBounds, descriptor.masterBounds) &&
				JSON.stringify(sidecar.inputs.map(({ path }) => path)) ===
					JSON.stringify(inputPathsFor(descriptor.proofId)) &&
				JSON.stringify(sidecar.inputSha256) ===
					JSON.stringify(sidecar.inputs.map(({ sha256: inputSha256 }) => inputSha256)),
			`Meadow Entry proof sidecar does not bind its PNG/input identity: ${descriptor.proofId}`
		);
		for (const input of sidecar.inputs) {
			assert(
				input !== null &&
					typeof input === 'object' &&
					JSON.stringify(Object.keys(input).sort()) === JSON.stringify(['path', 'sha256']) &&
					/^[a-f0-9]{64}$/.test(input.sha256) &&
					input.path === input.path.replaceAll('\\', '/') &&
					!input.path.startsWith('/') &&
					!input.path.split('/').includes('..'),
				`Meadow Entry proof has an invalid input identity: ${descriptor.proofId}`
			);
		}
		assert(
			new Set(sidecar.inputs.map(({ path }) => path)).size === sidecar.inputs.length,
			`Meadow Entry proof has duplicate input identities: ${descriptor.proofId}`
		);
		proofs.push({ descriptor, png, sidecar, sidecarBytes });
	}
	return proofs;
}

export async function readPublishedMeadowEntryProofSnapshot(
	repositoryRoot: string,
	options: {
		attempts?: number;
		retryDelayMs?: number;
		fileSystem?: MeadowEntryProofSnapshotFileSystem;
		descriptors?: readonly MeadowEntryProofDescriptor[];
		expectedInputPaths?: (proofId: string) => readonly string[];
	} = {}
): Promise<MeadowEntryProofSnapshot> {
	const root = resolve(repositoryRoot);
	const attempts = options.attempts ?? 3;
	const retryDelayMs = options.retryDelayMs ?? 25;
	assert(Number.isInteger(attempts) && attempts > 0, 'Proof snapshot attempts must be positive');
	assert(
		Number.isFinite(retryDelayMs) && retryDelayMs >= 0,
		'Proof snapshot retry delay must be non-negative'
	);
	const fileSystem = options.fileSystem ?? NODE_PROOF_SNAPSHOT_FILE_SYSTEM;
	const descriptors = options.descriptors ?? MEADOW_ENTRY_PROOF_DESCRIPTORS;
	const inputPathsFor = options.expectedInputPaths ?? expectedProofInputPaths;
	const sentinel = join(root, PROOF_SENTINEL);
	const proofRoot = join(root, PROOF_ROOT);
	let lastError: unknown;
	for (let attempt = 1; attempt <= attempts; attempt += 1) {
		if (await fileSystem.pathExists(sentinel)) {
			lastError = new Error('Meadow Entry proof publication is in progress');
			if (attempt < attempts && retryDelayMs > 0) {
				await new Promise((resolveRetry) => setTimeout(resolveRetry, retryDelayMs));
			}
			continue;
		}
		try {
			const proofs = await readProofGeneration(root, fileSystem, descriptors, inputPathsFor);
			for (const proof of proofs) {
				const reread = await fileSystem.readFile(
					join(proofRoot, proof.descriptor.filename.replace(/\.png$/, '.json'))
				);
				assert(
					reread.equals(proof.sidecarBytes),
					`Meadow Entry proof generation changed while reading: ${proof.descriptor.proofId}`
				);
			}
			assertInventoryEquals(
				expectedProofInventoryFor(descriptors),
				await fileSystem.listFiles(proofRoot)
			);
			assert(
				!(await fileSystem.pathExists(sentinel)),
				'Meadow Entry proof publication started while reading'
			);
			return { attemptsUsed: attempt, proofs };
		} catch (error) {
			lastError = error;
			if (attempt < attempts && retryDelayMs > 0) {
				await new Promise((resolveRetry) => setTimeout(resolveRetry, retryDelayMs));
			}
		}
	}
	throw lastError instanceof Error
		? lastError
		: new Error('Meadow Entry proof snapshot is unavailable');
}

export async function renderMeadowEntryArtProofs(repositoryRoot = process.cwd()): Promise<{
	proofCount: number;
	inventorySha256: string;
}> {
	const root = resolve(repositoryRoot);
	const proofRoot = join(root, PROOF_ROOT);
	const token = randomUUID();
	const stagingRoot = join(dirname(proofRoot), `.proofs-staging-${token}`);
	await mkdir(stagingRoot, { recursive: false });
	try {
		const [baseMaster, foregroundMaster, sundropBase, sundropForeground] = await Promise.all([
			readFile(join(root, BASE_MASTER)),
			readFile(join(root, FOREGROUND_MASTER)),
			readFile(join(root, SUNDROP_BASE)),
			readFile(join(root, SUNDROP_FOREGROUND))
		]);
		const sundropBounds = MEADOW_ENTRY_APPROVED_CROPS.find(
			({ id }) => id === 'sundrop-village-underlay'
		)!.bounds;
		const reviewComposite = await renderMeadowEntryReviewComposite({
			baseMasterPng: baseMaster,
			foregroundMasterPng: foregroundMaster,
			sundropBasePng: sundropBase,
			sundropForegroundPng: sundropForeground,
			sundropBounds
		});
		const context: RenderContext = {
			repositoryRoot: root,
			stagingRoot,
			baseMaster,
			foregroundMaster,
			sundropBase,
			sundropForeground,
			reviewComposite,
			written: new Set(),
			hashCache: new Map()
		};
		await renderFullProofs(context);
		await renderCropProofs(context);
		await renderOverlapProofs(context);
		await renderExtractedBoundaryProofs(context);
		await assertExactProofInventory(stagingRoot);
		await publishMeadowEntryProofInventory({ repositoryRoot: root, stagingRoot, token });
		const manifest = Buffer.from(
			(
				await Promise.all(
					MEADOW_ENTRY_PROOF_FILENAMES.map(async (path) => {
						const bytes = await readFile(join(proofRoot, path));
						return `${sha256(bytes)}  ${path}\n`;
					})
				)
			).join('')
		);
		return { proofCount: MEADOW_ENTRY_PROOF_FILENAMES.length, inventorySha256: sha256(manifest) };
	} catch (error) {
		await rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined);
		throw error;
	}
}

if (import.meta.main) {
	const result = await renderMeadowEntryArtProofs();
	process.stdout.write(`${JSON.stringify(result)}\n`);
}
