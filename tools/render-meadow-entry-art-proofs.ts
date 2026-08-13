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
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest';
import { MEADOW_ENTRY_REVIEWED_PAINTED_V2_BAKE_OWNERSHIP_SHA256 } from '$lib/game/content/backgrounds/meadow-entry-bake-ownership';
import {
	MEADOW_ENTRY_PAINTED_V2_PROOF_DESCRIPTORS,
	MEADOW_ENTRY_PAINTED_V2_PROOF_FILENAMES,
	MEADOW_ENTRY_PROOF_DESCRIPTORS,
	MEADOW_ENTRY_PROOF_FILENAMES,
	assertAllowedMeadowEntryProofDestination,
	renderMeadowEntryOverlapDifference,
	renderMeadowEntryReviewComposite,
	type MeadowEntryProofDescriptor
} from '$lib/game/content/backgrounds/meadow-entry-proof-renderer';
import {
	MEADOW_ENTRY_PAINTED_V2_CAMERA_SAFE_ROUTE,
	collectMeadowEntryPaintedV2CameraEnvelopes
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-camera-envelope';
import { MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS } from '$lib/game/content/backgrounds/meadow-entry-painted-v2-pilot';
import {
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng,
	validateCanonicalPngChunks
} from '$lib/game/content/backgrounds/meadow-entry-png';
import { readCoherentMeadowEntryArtSourceSnapshot } from './read-meadow-entry-art-source-snapshot';

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
export const MEADOW_ENTRY_PAINTED_V2_PROOF_ROOT = 'artifacts/meadow-entry/painted-v2/proofs';
const PAINTED_V2_BASE_MASTER =
	'artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png';
const PAINTED_V2_CROP_MANIFEST =
	'artifacts/meadow-entry/painted-v2/provenance/meadow-entry-crop-manifest.json';
const PAINTED_V2_MASTER_PROVENANCE =
	'artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json';
const PAINTED_V2_CONTROL_MANIFEST =
	'artifacts/meadow-entry/painted-v2/controls/meadow-entry-control-manifest.json';
const PAINTED_V2_OWNERSHIP =
	'artifacts/meadow-entry/painted-v2/controls/meadow-entry-bake-ownership.json';
const PAINTED_V2_EXPORT_ROOT = 'artifacts/meadow-entry/painted-v2/exports';
const PAINTED_V2_CONTROL_ROOT = 'artifacts/meadow-entry/painted-v2/controls';

const PAINTED_V2_SOURCE_PANEL_PATHS = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.map(
	({ normalizedPath }) => normalizedPath
);
const PAINTED_V2_COMMON_PROOF_INPUTS = Object.freeze([
	PAINTED_V2_BASE_MASTER,
	PAINTED_V2_MASTER_PROVENANCE,
	PAINTED_V2_CONTROL_MANIFEST,
	PAINTED_V2_CROP_MANIFEST,
	...PAINTED_V2_SOURCE_PANEL_PATHS
]);

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

export interface MeadowEntryProofCheckFileSystem extends MeadowEntryProofSnapshotFileSystem {
	mkdir: typeof mkdir;
	writeFile: typeof writeFile;
	rename: typeof rename;
	rm: typeof rm;
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
	packageInputs: ReadonlyMap<string, Buffer>;
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

export function checkerboardSvg(width: number, height: number): Buffer {
	return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><pattern id="checker" width="64" height="64" patternUnits="userSpaceOnUse"><rect width="64" height="64" fill="#d6d6d6"/><path d="M0 0h32v32H0zm32 32h32v32H32z" fill="#9b9b9b"/></pattern></defs>
  <rect width="${width}" height="${height}" fill="url(#checker)"/>
</svg>`);
}

export function boundarySvg(
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

export function cornerGroupSvg(
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
		const packageBytes = context.packageInputs.get(path);
		assert(
			packageBytes !== undefined || !path.startsWith(`${PACKAGE_ROOT}/`),
			`Meadow Entry coherent package snapshot is missing hash input: ${path}`
		);
		value = sha256(packageBytes ?? (await readFile(join(context.repositoryRoot, path))));
		context.hashCache.set(path, value);
	}
	return { path, sha256: value };
}

function packageInput(context: RenderContext, path: string): Buffer {
	const bytes = context.packageInputs.get(path);
	assert(bytes, `Meadow Entry coherent package snapshot is missing input: ${path}`);
	return bytes;
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
		const base = packageInput(context, basePath);
		const inputPaths = [basePath];
		let png: Buffer = base;
		if (crop.foregroundFilename !== null) {
			const foregroundPath = `${EXPORT_ROOT}/${crop.foregroundFilename}`;
			const foreground = packageInput(context, foregroundPath);
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
	context: RenderContext,
	cropId: string,
	plane: 'base' | 'foreground',
	bounds: PixelBounds
): Promise<{ png: Buffer; path: string }> {
	const crop = MEADOW_ENTRY_APPROVED_CROPS.find(({ id }) => id === cropId)!;
	const filename = plane === 'base' ? crop.baseFilename : crop.foregroundFilename!;
	const path = `${EXPORT_ROOT}/${filename}`;
	const source = packageInput(context, path);
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
				extractExportOverlap(context, overlap.firstCropId, plane, overlap.bounds),
				extractExportOverlap(context, overlap.secondCropId, plane, overlap.bounds)
			]);
			inputPaths.push(first.path, second.path);
			const difference = await renderMeadowEntryOverlapDifference(first.png, second.png);
			assert(
				difference.differingPixels === 0 && difference.maximumChannelDifference === 0,
				`Meadow Entry overlap proof differs id=${overlap.id} plane=${plane} first=${JSON.stringify(difference.firstDifference)}`
			);
			// The published overlap proof PNG always comes from the first plane in
			// `planes` (base for single-plane and base-and-foreground overlaps); the
			// foreground difference image is discarded. Every plane is all-zero
			// (asserted above), so no information is lost — but the sidecar metrics
			// below are the only record of the other planes.
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

export function expectedProofInventory(): string[] {
	return MEADOW_ENTRY_PROOF_FILENAMES.flatMap((path) => [
		path,
		path.replace(/\.png$/, '.json')
	]).sort();
}

export function expectedProofInventoryFor(
	descriptors: readonly MeadowEntryProofDescriptor[]
): readonly string[] {
	return descriptors
		.flatMap(({ filename }) => [filename, filename.replace(/\.png$/, '.json')])
		.sort();
}

export function assertInventoryEquals(
	expected: readonly string[],
	actual: readonly string[]
): void {
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

const NODE_PROOF_CHECK_FILE_SYSTEM: MeadowEntryProofCheckFileSystem = {
	...NODE_PROOF_SNAPSHOT_FILE_SYSTEM,
	mkdir,
	writeFile,
	rename,
	rm
};

export async function assertExactProofInventory(
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
	if (backedUp)
		await fileSystem.rm(backup, { recursive: true, force: true }).catch(() => undefined);
	await assertExactProofInventory(target, fileSystem);
}

export function proofExportPath(cropId: string, plane: 'base' | 'foreground'): string {
	const crop = MEADOW_ENTRY_APPROVED_CROPS.find(({ id }) => id === cropId);
	assert(crop, `Unknown Meadow Entry proof crop: ${cropId}`);
	const filename = plane === 'base' ? crop.baseFilename : crop.foregroundFilename;
	assert(filename !== null, `Missing Meadow Entry proof foreground crop: ${cropId}`);
	return `${EXPORT_ROOT}/${filename}`;
}

export function expectedProofInputPaths(proofId: string): readonly string[] {
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

export function parseProofSidecar(bytes: Buffer, path: string): MeadowEntryProofSidecar {
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

export function boundsEqual(first: PixelBounds, second: PixelBounds): boolean {
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

export async function renderHistoricalMeadowEntryArtProofs(
	repositoryRoot = process.cwd()
): Promise<{
	proofCount: number;
	inventorySha256: string;
}> {
	const root = resolve(repositoryRoot);
	const proofRoot = join(root, PROOF_ROOT);
	const token = randomUUID();
	const stagingRoot = join(dirname(proofRoot), `.proofs-staging-${token}`);
	await mkdir(stagingRoot, { recursive: false });
	try {
		const [sourceSnapshot, sundropBase, sundropForeground] = await Promise.all([
			readCoherentMeadowEntryArtSourceSnapshot(join(root, PACKAGE_ROOT)),
			readFile(join(root, SUNDROP_BASE)),
			readFile(join(root, SUNDROP_FOREGROUND))
		]);
		const baseMaster = sourceSnapshot.basePng;
		const foregroundMaster = sourceSnapshot.foregroundPng;
		const packageInputs = new Map<string, Buffer>([
			[BASE_MASTER, sourceSnapshot.basePng],
			[FOREGROUND_MASTER, sourceSnapshot.foregroundPng],
			[CROP_MANIFEST, sourceSnapshot.exports.cropManifestJson],
			...Object.entries(sourceSnapshot.exports.files).map(
				([filename, bytes]) => [`${EXPORT_ROOT}/${filename}`, bytes] as const
			)
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
			packageInputs,
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

export interface MeadowEntryPaintedV2ProofPackage {
	files: Readonly<Record<string, Buffer>>;
	inventorySha256: string;
}

export interface MeadowEntryArtProofArguments {
	check: boolean;
}

/**
 * Return the fixed active painted-v2 proof inventory.  This deliberately does
 * not include the historical HPA-399 descriptors: those remain available to
 * the immutable package validator but are not active writer defaults.
 */
export function expectedPaintedV2ProofInventory(): string[] {
	return MEADOW_ENTRY_PAINTED_V2_PROOF_FILENAMES.flatMap((filename) => [
		filename,
		filename.replace(/\.png$/, '.json')
	]).sort();
}

function paintedV2ExportPath(filename: string): string {
	return `${PAINTED_V2_EXPORT_ROOT}/${filename}`;
}

/** Return the exact source identity list bound into an active proof sidecar. */
export function paintedV2ProofInputPaths(proofId: string): readonly string[] {
	const common = [...PAINTED_V2_COMMON_PROOF_INPUTS];
	if (proofId === 'pilot-camera-envelope') {
		return [...common, `${PAINTED_V2_CONTROL_ROOT}/meadow-entry-handoff-mask.svg`];
	}
	if (proofId === 'pilot-underlay-sundrop-seam') {
		return [
			...common,
			`${PAINTED_V2_CONTROL_ROOT}/meadow-entry-terrain-path-mask.svg`,
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-north.png',
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-south.png'
		];
	}
	if (proofId === 'pilot-underlay-crossroads-seam') {
		return [
			...common,
			`${PAINTED_V2_CONTROL_ROOT}/meadow-entry-terrain-path-mask.svg`,
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.png',
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.png'
		];
	}
	if (proofId === 'pilot-underlay-family-handoff') {
		return [
			...common,
			`${PAINTED_V2_CONTROL_ROOT}/meadow-entry-handoff-mask.svg`,
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-north.png',
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-sundrop-south.png',
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-north.png',
			'artifacts/meadow-entry/painted-v2/source-panels/camera-underlay-crossroads-south.png'
		];
	}
	if (proofId === 'pilot-detail-panel-handoffs') {
		return [
			...common,
			...MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.filter(({ role }) => role === 'detail').map(
				({ normalizedPath }) => normalizedPath
			)
		];
	}
	if (proofId === 'pilot-base-coverage') return common;
	if (proofId === 'pilot-master-transparency') return common;
	if (proofId === 'pilot-runtime-overlap') {
		const overlap = MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS[0]!;
		const first = MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.find(({ id }) => id === overlap.firstCropId)!;
		const second = MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.find(
			({ id }) => id === overlap.secondCropId
		)!;
		return [
			...common,
			paintedV2ExportPath(first.baseFilename),
			paintedV2ExportPath(second.baseFilename)
		];
	}
	if (proofId === 'pilot-protected-live') {
		return [...common, `${PAINTED_V2_CONTROL_ROOT}/meadow-entry-protected-live-mask.svg`];
	}
	if (proofId === 'pilot-ownership') {
		return [
			...common,
			`${PAINTED_V2_CONTROL_ROOT}/meadow-entry-region-mask.svg`,
			PAINTED_V2_OWNERSHIP
		];
	}
	throw new Error(`Unknown painted-v2 Meadow Entry proof identity: ${proofId}`);
}

function paintedV2Descriptor(proofId: string): MeadowEntryProofDescriptor {
	const descriptor = MEADOW_ENTRY_PAINTED_V2_PROOF_DESCRIPTORS.find(
		({ proofId: candidate }) => candidate === proofId
	);
	assert(descriptor, `Unknown painted-v2 Meadow Entry proof identity: ${proofId}`);
	return descriptor;
}

async function readPaintedV2ProofInput(
	repositoryRoot: string,
	path: string,
	cache: Map<string, Buffer>
): Promise<Buffer> {
	const cached = cache.get(path);
	if (cached) return cached;
	const bytes = await readFile(join(repositoryRoot, path));
	cache.set(path, bytes);
	return bytes;
}

async function activeProofSidecar(
	repositoryRoot: string,
	descriptor: MeadowEntryProofDescriptor,
	png: Buffer,
	inputPaths: readonly string[],
	cache: Map<string, Buffer>,
	metrics: Readonly<Record<string, unknown>> = {}
): Promise<Buffer> {
	validateCanonicalPngChunks(png);
	const decoded = await decodeMeadowEntryRgba(png);
	const inputs = await Promise.all(
		inputPaths.map(async (path) => ({
			path,
			sha256: sha256(await readPaintedV2ProofInput(repositoryRoot, path, cache))
		}))
	);
	const sidecar: MeadowEntryProofSidecar = {
		version: 1,
		proofId: descriptor.proofId,
		path: `${MEADOW_ENTRY_PAINTED_V2_PROOF_ROOT}/${descriptor.filename}`,
		sha256: sha256(png),
		bytes: png.byteLength,
		width: decoded.width,
		height: decoded.height,
		masterBounds: descriptor.masterBounds,
		inputs,
		inputSha256: inputs.map(({ sha256: inputSha256 }) => inputSha256),
		metrics
	};
	return Buffer.from(`${JSON.stringify(sidecar, null, 2)}\n`);
}

function svgOverlay(width: number, height: number, body: string): Buffer {
	return Buffer.from(
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`
	);
}

function escapeSvgText(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function boundsDimensions(bounds: PixelBounds): { width: number; height: number } {
	return { width: bounds.right - bounds.left, height: bounds.bottom - bounds.top };
}

async function renderLabeledMasterRegion(
	baseMaster: Buffer,
	descriptorBounds: PixelBounds,
	artBounds: PixelBounds,
	label: string
): Promise<Buffer> {
	const art = await canonicalExtract(baseMaster, artBounds);
	const insets = {
		left: artBounds.left - descriptorBounds.left,
		top: artBounds.top - descriptorBounds.top,
		right: descriptorBounds.right - artBounds.right,
		bottom: descriptorBounds.bottom - artBounds.bottom
	};
	const { width, height } = boundsDimensions(descriptorBounds);
	const labelX = Math.max(8, insets.left + 8);
	const labelY = insets.top >= 24 ? 24 : height - Math.max(8, insets.bottom - 8);
	const artRect = `<rect x="${insets.left}" y="${insets.top}" width="${artBounds.right - artBounds.left}" height="${artBounds.bottom - artBounds.top}" fill="none" stroke="#00e5ff" stroke-width="6"/>`;
	const labelPlate = `<rect x="${Math.max(0, labelX - 6)}" y="${Math.max(0, labelY - 18)}" width="${Math.min(width - Math.max(0, labelX - 6), Math.max(96, label.length * 9 + 18))}" height="24" fill="#08141b" fill-opacity="0.9"/>`;
	const body = `${labelPlate}<text x="${labelX}" y="${labelY}" fill="#d9fbff" font-family="monospace" font-size="16">${escapeSvgText(label)}</text>${artRect}`;
	return await canonicalPipeline(
		sharp(art)
			.extend({
				top: insets.top,
				bottom: insets.bottom,
				left: insets.left,
				right: insets.right,
				background: { r: 8, g: 20, b: 27, alpha: 1 }
			})
			.composite([{ input: svgOverlay(width, height, body), left: 0, top: 0 }])
	);
}

async function renderPaintedV2Proof(
	repositoryRoot: string,
	proofId: string,
	baseMaster: Buffer,
	cache: Map<string, Buffer>
): Promise<{ png: Buffer; metrics: Readonly<Record<string, unknown>> }> {
	const descriptor = paintedV2Descriptor(proofId);
	if (proofId === 'pilot-master-transparency') {
		return { png: baseMaster, metrics: { pixelTransform: 'none', alphaPolicy: 'union-opaque' } };
	}
	if (proofId === 'pilot-base-coverage') {
		const png = await canonicalExtract(baseMaster, descriptor.masterBounds);
		return {
			png,
			metrics: {
				cropIds: MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map(({ id }) => id),
				coverageMode: 'partial',
				opaqueBounds: MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map(({ bounds }) => bounds)
			}
		};
	}
	if (proofId === 'pilot-camera-envelope') {
		const envelopes = collectMeadowEntryPaintedV2CameraEnvelopes();
		const route = MEADOW_ENTRY_PAINTED_V2_CAMERA_SAFE_ROUTE;
		const routeBounds = descriptor.masterBounds;
		const rectangles = envelopes
			.map(
				(bounds, index) =>
					`<rect x="${bounds.left - routeBounds.left}" y="${bounds.top - routeBounds.top}" width="${bounds.right - bounds.left}" height="${bounds.bottom - bounds.top}" fill="none" stroke="#ff385c" stroke-width="8" stroke-opacity="0.7" data-segment="${index}"/>`
			)
			.join('');
		const points = route
			.map(({ x, y }) => `${x - routeBounds.left},${y - routeBounds.top}`)
			.join(' ');
		const body = `${rectangles}<polyline points="${points}" fill="none" stroke="#20e6ff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><text x="32" y="48" fill="#20e6ff" font-family="monospace" font-size="32">approved route + 18px swept camera envelope</text>`;
		return {
			png: await canonicalPipeline(
				sharp(baseMaster)
					.extract({
						left: routeBounds.left,
						top: routeBounds.top,
						...boundsDimensions(routeBounds)
					})
					.composite([
						{
							input: svgOverlay(
								routeBounds.right - routeBounds.left,
								routeBounds.bottom - routeBounds.top,
								body
							),
							left: 0,
							top: 0
						}
					])
			),
			metrics: { routePointCount: route.length, segmentCount: envelopes.length, routeReachPx: 18 }
		};
	}
	if (proofId === 'pilot-underlay-sundrop-seam') {
		const artBounds = { left: 0, top: 4736, right: 3200, bottom: 4864 };
		return {
			png: await renderLabeledMasterRegion(
				baseMaster,
				descriptor.masterBounds,
				artBounds,
				'Sundrop north/south source seam'
			),
			metrics: { artBounds, labelPlacement: 'outside-art-margin', overlapPx: 128 }
		};
	}
	if (proofId === 'pilot-underlay-crossroads-seam') {
		const artBounds = { left: 2368, top: 3776, right: 5568, bottom: 3904 };
		return {
			png: await renderLabeledMasterRegion(
				baseMaster,
				descriptor.masterBounds,
				artBounds,
				'Crossroads north/south source seam'
			),
			metrics: { artBounds, labelPlacement: 'outside-art-margin', overlapPx: 128 }
		};
	}
	if (proofId === 'pilot-underlay-family-handoff') {
		const artBounds = { left: 2368, top: 3200, right: 3200, bottom: 5440 };
		return {
			png: await renderLabeledMasterRegion(
				baseMaster,
				descriptor.masterBounds,
				artBounds,
				'Sundrop / Crossroads family handoff'
			),
			metrics: { artBounds, labelPlacement: 'outside-art-margin', widthPx: 832 }
		};
	}
	if (proofId === 'pilot-detail-panel-handoffs') {
		const detailPanels = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.filter(
			({ role }) => role === 'detail'
		);
		const { width, height } = boundsDimensions(descriptor.masterBounds);
		const panelRects = detailPanels
			.map(
				(panel) =>
					`<rect x="${panel.bounds.left - descriptor.masterBounds.left}" y="${panel.bounds.top - descriptor.masterBounds.top}" width="${panel.bounds.right - panel.bounds.left}" height="${panel.bounds.bottom - panel.bounds.top}" fill="none" stroke="#ffd166" stroke-width="8" stroke-opacity="0.9" data-panel="${panel.id}"/>`
			)
			.join('');
		const label = `<text x="16" y="32" fill="#ffd166" font-family="monospace" font-size="22">detail-panel feather handoffs (128px)</text>`;
		const extracted = await canonicalExtract(baseMaster, descriptor.masterBounds);
		return {
			png: await canonicalPipeline(
				sharp(extracted).composite([
					{ input: svgOverlay(width, height, `${panelRects}${label}`), left: 0, top: 0 }
				])
			),
			metrics: { detailPanelIds: detailPanels.map(({ id }) => id), featherWidthPx: 128 }
		};
	}
	if (proofId === 'pilot-protected-live' || proofId === 'pilot-ownership') {
		const maskPath =
			proofId === 'pilot-protected-live'
				? `${PAINTED_V2_CONTROL_ROOT}/meadow-entry-protected-live-mask.svg`
				: `${PAINTED_V2_CONTROL_ROOT}/meadow-entry-region-mask.svg`;
		const mask = await readPaintedV2ProofInput(repositoryRoot, maskPath, cache);
		const png = await canonicalPipeline(
			sharp(baseMaster).composite([{ input: mask, left: 0, top: 0 }])
		);
		return {
			png,
			metrics: {
				overlay: proofId === 'pilot-protected-live' ? 'protected-live-mask' : 'region-mask',
				ownership:
					proofId === 'pilot-ownership'
						? MEADOW_ENTRY_REVIEWED_PAINTED_V2_BAKE_OWNERSHIP_SHA256
						: undefined
			}
		};
	}
	if (proofId === 'pilot-runtime-overlap') {
		const overlap = MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS[0]!;
		const firstCrop = MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.find(
			({ id }) => id === overlap.firstCropId
		)!;
		const secondCrop = MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.find(
			({ id }) => id === overlap.secondCropId
		)!;
		const first = await canonicalExtract(
			await readPaintedV2ProofInput(
				repositoryRoot,
				paintedV2ExportPath(firstCrop.baseFilename),
				cache
			),
			{
				left: overlap.bounds.left - firstCrop.bounds.left,
				top: overlap.bounds.top - firstCrop.bounds.top,
				right: overlap.bounds.right - firstCrop.bounds.left,
				bottom: overlap.bounds.bottom - firstCrop.bounds.top
			}
		);
		const second = await canonicalExtract(
			await readPaintedV2ProofInput(
				repositoryRoot,
				paintedV2ExportPath(secondCrop.baseFilename),
				cache
			),
			{
				left: overlap.bounds.left - secondCrop.bounds.left,
				top: overlap.bounds.top - secondCrop.bounds.top,
				right: overlap.bounds.right - secondCrop.bounds.left,
				bottom: overlap.bounds.bottom - secondCrop.bounds.top
			}
		);
		const difference = await renderMeadowEntryOverlapDifference(first, second);
		assert(
			difference.differingPixels === 0 && difference.maximumChannelDifference === 0,
			`Painted-v2 overlap proof differs id=${overlap.id}`
		);
		return {
			png: difference.png,
			metrics: {
				planes: {
					base: {
						differingPixels: difference.differingPixels,
						maximumChannelDifference: difference.maximumChannelDifference
					}
				},
				ownerCropId: overlap.ownerCropId,
				minimumSharedPixels: overlap.minimumSharedPixels
			}
		};
	}
	throw new Error(`Unknown painted-v2 Meadow Entry proof identity: ${proofId}`);
}

/** Recompute the active ten-proof package without writing any filesystem state. */
export async function buildPaintedV2ProofPackage(
	repositoryRoot = process.cwd()
): Promise<MeadowEntryPaintedV2ProofPackage> {
	const root = resolve(repositoryRoot);
	const cache = new Map<string, Buffer>();
	const baseMaster = await readPaintedV2ProofInput(root, PAINTED_V2_BASE_MASTER, cache);
	const files: Record<string, Buffer> = {};
	for (const descriptor of MEADOW_ENTRY_PAINTED_V2_PROOF_DESCRIPTORS) {
		const { png, metrics } = await renderPaintedV2Proof(
			root,
			descriptor.proofId,
			baseMaster,
			cache
		);
		const sidecar = await activeProofSidecar(
			root,
			descriptor,
			png,
			paintedV2ProofInputPaths(descriptor.proofId),
			cache,
			metrics
		);
		files[descriptor.filename] = png;
		files[descriptor.filename.replace(/\.png$/, '.json')] = sidecar;
	}
	const manifest = Buffer.from(
		Object.keys(files)
			.sort()
			.map((path) => `${sha256(files[path]!)}  ${path}\n`)
			.join('')
	);
	return { files, inventorySha256: sha256(manifest) };
}

/** Compare the checked-in active proof package to a recomputed package, without writes. */
export async function checkMeadowEntryPaintedV2Proofs(
	repositoryRoot = process.cwd(),
	expected?: MeadowEntryPaintedV2ProofPackage,
	options: { fileSystem?: MeadowEntryProofCheckFileSystem } = {}
): Promise<void> {
	const root = resolve(repositoryRoot);
	const fileSystem = options.fileSystem ?? NODE_PROOF_CHECK_FILE_SYSTEM;
	const packageBytes = expected ?? (await buildPaintedV2ProofPackage(root));
	const proofRoot = join(root, MEADOW_ENTRY_PAINTED_V2_PROOF_ROOT);
	let actual: string[];
	try {
		actual = await fileSystem.listFiles(proofRoot);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			throw new Error(
				`Meadow Entry painted-v2 proof package is missing: ${MEADOW_ENTRY_PAINTED_V2_PROOF_ROOT}`,
				{ cause: error }
			);
		}
		throw error;
	}
	assertInventoryEquals(expectedPaintedV2ProofInventory(), actual);
	for (const path of expectedPaintedV2ProofInventory()) {
		const bytes = await fileSystem.readFile(join(proofRoot, path));
		assert(
			bytes.equals(packageBytes.files[path]!),
			`Meadow Entry painted-v2 proof is stale: ${path}`
		);
	}
}

async function publishPaintedV2ProofPackage(
	repositoryRoot: string,
	packageBytes: MeadowEntryPaintedV2ProofPackage
): Promise<void> {
	const root = resolve(repositoryRoot);
	const target = join(root, MEADOW_ENTRY_PAINTED_V2_PROOF_ROOT);
	const token = randomUUID();
	const staging = `${target}.staging-${token}`;
	const backup = `${target}.${token}.rollback`;
	await mkdir(staging, { recursive: false });
	try {
		for (const path of expectedPaintedV2ProofInventory()) {
			assertAllowedMeadowEntryProofDestination(path);
			const destination = join(staging, path);
			await mkdir(dirname(destination), { recursive: true });
			await writeFile(destination, packageBytes.files[path]!, { flag: 'wx' });
		}
		const hadTarget = await nodePathExists(target);
		if (hadTarget) await rename(target, backup);
		await rename(staging, target);
		if (hadTarget) await rm(backup, { recursive: true, force: true });
	} finally {
		await rm(staging, { recursive: true, force: true }).catch(() => undefined);
		await rm(backup, { recursive: true, force: true }).catch(() => undefined);
	}
}

export function parseMeadowEntryArtProofArguments(
	args: readonly string[]
): MeadowEntryArtProofArguments {
	let check = false;
	for (let index = args[0] === '--' ? 1 : 0; index < args.length; index += 1) {
		const flag = args[index];
		if (flag === '--check') {
			if (check) throw new Error('Duplicate Meadow Entry proof argument: --check');
			check = true;
			continue;
		}
		throw new Error(`Unknown Meadow Entry proof argument: ${flag ?? '<missing>'}`);
	}
	return { check };
}

/** Active CLI defaults to painted-v2; historical proof generation is explicit and test-only. */
export async function renderMeadowEntryArtProofs(
	repositoryRoot = process.cwd(),
	options: {
		check?: boolean;
		fileSystem?: MeadowEntryProofCheckFileSystem;
		/** Test seam for command-level snapshot checks; production always recomputes proofs. */
		packageBytes?: MeadowEntryPaintedV2ProofPackage;
	} = {}
): Promise<{ proofCount: number; inventorySha256: string }> {
	const packageBytes = options.packageBytes ?? (await buildPaintedV2ProofPackage(repositoryRoot));
	if (options.check) {
		await checkMeadowEntryPaintedV2Proofs(repositoryRoot, packageBytes, {
			fileSystem: options.fileSystem
		});
	} else {
		await publishPaintedV2ProofPackage(repositoryRoot, packageBytes);
	}
	return {
		proofCount: MEADOW_ENTRY_PAINTED_V2_PROOF_FILENAMES.length,
		inventorySha256: packageBytes.inventorySha256
	};
}

if (import.meta.main) {
	const parsed = parseMeadowEntryArtProofArguments(process.argv.slice(2));
	const result = await renderMeadowEntryArtProofs(process.cwd(), parsed);
	process.stdout.write(`${JSON.stringify(result)}\n`);
}
