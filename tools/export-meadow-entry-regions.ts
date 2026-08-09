import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

import sharp from 'sharp';
import { format } from 'prettier';

import { meadowEntryControlsApproval } from '$lib/game/content/approvals/meadow-entry-controls';
import {
	MEADOW_ENTRY_APPROVED_CROPS,
	MEADOW_ENTRY_APPROVED_OVERLAPS,
	MEADOW_ENTRY_CROP_BUDGET_SUMMARY,
	MEADOW_ENTRY_RUNTIME_COVERAGE
} from '$lib/game/content/backgrounds/meadow-entry-crop-manifest';
import {
	exportMeadowEntryRegions,
	verifyMeadowEntryOverlapPixels,
	type MeadowEntryDecodedExport
} from '$lib/game/content/backgrounds/meadow-entry-exporter';
import { decodeMeadowEntryRgba } from '$lib/game/content/backgrounds/meadow-entry-png';
import {
	buildMeadowEntryControlInputs,
	computeMeadowEntryCombinedControlFingerprint
} from '$lib/game/content/backgrounds/meadow-entry-controls';
import { readApprovedMeadowEntryPackageSnapshot } from './finalize-meadow-entry-masters';

const DEFAULT_OUTPUT_ROOT = 'artifacts/meadow-entry/hpa-399';
const APPROVED_BASE_SHA256 = '9a5097eea014d092e57a8953be0dec2a16c1e6d29446f8b293338bf95a93752c';
const APPROVED_FOREGROUND_SHA256 =
	'c9ffa6e50a8e3c9f9888a642078094e95d9175158df8d262de8ac94b1ab9124e';
const APPROVED_MASTER_PROVENANCE_SHA256 =
	'ed1814a4952b5465d35b3a5d25e7b7435d7511f26598a9a2a2ff0ff19e63cd7b';

export interface MeadowEntryExportPackageBytes {
	files: Readonly<Record<string, Buffer>>;
	provenanceJson: Buffer;
	cropManifestJson: Buffer;
}

export interface MeadowEntryExportVerification {
	cropCount: number;
	exportCount: number;
	baseExportCount: number;
	foregroundExportCount: number;
	overlapCount: number;
	cornerGroupCount: number;
	overlapPlanePixelsCompared: number;
	exportAreaRatio: number;
	measuredBaseBytes: number;
	measuredForegroundBytes: number;
	aggregateBaseHardBytes: number;
	aggregateForegroundHardBytes: number;
	reviewTargetExceptions: readonly string[];
}

export interface MeadowEntryExportRunResult extends MeadowEntryExportPackageBytes {
	verification: MeadowEntryExportVerification;
}

export interface MeadowEntryExportPublicationFileSystem {
	mkdir: typeof mkdir;
	rename: typeof rename;
	rm: typeof rm;
	writeFile: typeof writeFile;
}

const NODE_FILE_SYSTEM: MeadowEntryExportPublicationFileSystem = { mkdir, rename, rm, writeFile };

export interface MeadowEntryExportSnapshotFileSystem {
	lstat(path: string): ReturnType<typeof lstat>;
	readFile(path: string): Promise<Buffer>;
	readdir(path: string): Promise<string[]>;
}

const NODE_SNAPSHOT_FILE_SYSTEM: MeadowEntryExportSnapshotFileSystem = {
	lstat: async (path) => await lstat(path),
	readFile: async (path) => await readFile(path),
	readdir: async (path) => await readdir(path)
};

function sha256(value: Buffer): string {
	return createHash('sha256').update(value).digest('hex');
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await lstat(path);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
		throw error;
	}
}

function publicationPaths(outputRoot: string) {
	const root = resolve(outputRoot);
	return {
		root,
		exports: join(root, 'exports'),
		provenance: join(root, 'provenance/meadow-entry-export-provenance.json'),
		cropManifest: join(root, 'provenance/meadow-entry-crop-manifest.json'),
		writerSentinel: join(root, '.meadow-entry-export-publication.lock')
	};
}

export async function publishMeadowEntryExportPackage(
	outputRoot: string,
	packageBytes: MeadowEntryExportPackageBytes,
	fileSystem: MeadowEntryExportPublicationFileSystem = NODE_FILE_SYSTEM
): Promise<void> {
	const paths = publicationPaths(outputRoot);
	const token = randomUUID();
	const stagingRoot = join(
		dirname(paths.root),
		`.${basename(paths.root)}.exports-staging-${token}`
	);
	const stagingExports = join(stagingRoot, 'exports');
	const stagingProvenance = join(stagingRoot, 'meadow-entry-export-provenance.json');
	const stagingCropManifest = join(stagingRoot, 'meadow-entry-crop-manifest.json');
	const targets = [paths.exports, paths.provenance, paths.cropManifest];
	const staging = [stagingExports, stagingProvenance, stagingCropManifest];
	const backups = targets.map((path) => `${path}.${token}.rollback`);
	const backedUp: boolean[] = [];
	const installed: boolean[] = [];
	let sentinelOwned = false;
	try {
		await fileSystem.mkdir(stagingExports, { recursive: true });
		for (const filename of Object.keys(packageBytes.files).sort()) {
			assert(
				filename === basename(filename) && filename.endsWith('.png'),
				`Refusing unexpected Meadow Entry export filename: ${filename}`
			);
			await fileSystem.writeFile(join(stagingExports, filename), packageBytes.files[filename]!, {
				flag: 'wx'
			});
		}
		await fileSystem.writeFile(stagingProvenance, packageBytes.provenanceJson, { flag: 'wx' });
		await fileSystem.writeFile(stagingCropManifest, packageBytes.cropManifestJson, { flag: 'wx' });
		await fileSystem.mkdir(paths.root, { recursive: true });
		await fileSystem.writeFile(paths.writerSentinel, Buffer.from(`${token}\n`), { flag: 'wx' });
		sentinelOwned = true;
		for (let index = 0; index < targets.length; index += 1) {
			const target = targets[index]!;
			await fileSystem.mkdir(dirname(target), { recursive: true });
			backedUp[index] = await pathExists(target);
			if (backedUp[index]) await fileSystem.rename(target, backups[index]!);
			await fileSystem.rename(staging[index]!, target);
			installed[index] = true;
		}
		await fileSystem.rm(paths.writerSentinel);
		sentinelOwned = false;
	} catch (error) {
		if (sentinelOwned) {
			let restored = true;
			for (let index = targets.length - 1; index >= 0; index -= 1) {
				if (installed[index]) {
					try {
						await fileSystem.rm(targets[index]!, { recursive: true, force: true });
					} catch {
						restored = false;
					}
				}
				if (backedUp[index]) {
					try {
						await fileSystem.rename(backups[index]!, targets[index]!);
					} catch {
						restored = false;
					}
				}
			}
			if (restored) {
				await fileSystem.rm(paths.writerSentinel, { force: true }).catch(() => undefined);
			}
		}
		throw error;
	} finally {
		await fileSystem.rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined);
	}
	for (let index = 0; index < backups.length; index += 1) {
		if (backedUp[index]) {
			await fileSystem.rm(backups[index]!, { recursive: true, force: true }).catch(() => undefined);
		}
	}
}

interface ExportSnapshotInventoryEntry {
	filename: string;
	bytes: number;
	sha256: string;
}

interface ExportSnapshotGeneration {
	filenames: readonly string[];
	inventory: ReadonlyMap<string, ExportSnapshotInventoryEntry>;
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function parseJsonObject(buffer: Buffer, label: string): Record<string, unknown> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(buffer.toString('utf8')) as unknown;
	} catch {
		throw new Error(`Meadow Entry ${label} is not valid JSON`);
	}
	assert(
		typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed),
		`Meadow Entry ${label} must be a JSON object`
	);
	return parsed as Record<string, unknown>;
}

function stringProperty(value: unknown, property: string, label: string): string {
	assert(
		typeof value === 'object' &&
			value !== null &&
			typeof (value as Record<string, unknown>)[property] === 'string',
		`Meadow Entry ${label} requires ${property}`
	);
	return (value as Record<string, string>)[property]!;
}

function assertSha256(value: string, label: string): void {
	assert(SHA256_PATTERN.test(value), `Meadow Entry ${label} must be a lowercase SHA-256 hash`);
}

function validateExportSnapshotGeneration(
	provenanceJson: Buffer,
	cropManifestJson: Buffer
): ExportSnapshotGeneration {
	const provenance = parseJsonObject(provenanceJson, 'export provenance');
	const manifest = parseJsonObject(cropManifestJson, 'crop manifest');
	assert(provenance.version === 1, 'Meadow Entry export provenance version has drifted');
	assert(manifest.version === 1, 'Meadow Entry crop manifest version has drifted');

	const controlFingerprint = stringProperty(
		provenance.controls,
		'fingerprint',
		'export provenance controls'
	);
	const manifestControlFingerprint = stringProperty(
		manifest,
		'controlFingerprint',
		'crop manifest'
	);
	assertSha256(controlFingerprint, 'export control fingerprint');
	assert(
		manifestControlFingerprint === controlFingerprint,
		'Meadow Entry export provenance and crop manifest controls differ'
	);

	const provenanceBaseSha256 = stringProperty(
		(provenance.masters as Record<string, unknown> | undefined)?.base,
		'sha256',
		'export provenance base master'
	);
	const provenanceForegroundSha256 = stringProperty(
		(provenance.masters as Record<string, unknown> | undefined)?.foreground,
		'sha256',
		'export provenance foreground master'
	);
	const masterProvenanceSha256 = stringProperty(
		provenance,
		'approvedMasterProvenanceSha256',
		'export provenance'
	);
	for (const [label, value] of [
		['base master hash', provenanceBaseSha256],
		['foreground master hash', provenanceForegroundSha256],
		['master provenance hash', masterProvenanceSha256]
	] as const) {
		assertSha256(value, label);
	}
	const manifestMasters = manifest.masters;
	assert(
		stringProperty(manifestMasters, 'baseSha256', 'crop manifest masters') ===
			provenanceBaseSha256 &&
			stringProperty(manifestMasters, 'foregroundSha256', 'crop manifest masters') ===
				provenanceForegroundSha256 &&
			stringProperty(manifestMasters, 'provenanceSha256', 'crop manifest masters') ===
				masterProvenanceSha256,
		'Meadow Entry export provenance and crop manifest master identities differ'
	);

	assert(Array.isArray(manifest.crops), 'Meadow Entry crop manifest requires crops');
	const manifestFilenames: string[] = [];
	for (const value of manifest.crops) {
		assert(
			typeof value === 'object' && value !== null,
			'Meadow Entry crop manifest contains an invalid crop'
		);
		const crop = value as Record<string, unknown>;
		assert(
			typeof crop.baseFilename === 'string',
			'Meadow Entry crop manifest crop requires baseFilename'
		);
		manifestFilenames.push(crop.baseFilename);
		assert(
			crop.foregroundFilename === null || typeof crop.foregroundFilename === 'string',
			'Meadow Entry crop manifest crop has an invalid foregroundFilename'
		);
		if (typeof crop.foregroundFilename === 'string') {
			manifestFilenames.push(crop.foregroundFilename);
		}
	}

	assert(Array.isArray(provenance.inventory), 'Meadow Entry export provenance requires inventory');
	const inventory = new Map<string, ExportSnapshotInventoryEntry>();
	for (const value of provenance.inventory) {
		assert(
			typeof value === 'object' && value !== null,
			'Meadow Entry export provenance contains an invalid inventory entry'
		);
		const entry = value as Record<string, unknown>;
		assert(
			typeof entry.filename === 'string' &&
				entry.filename === basename(entry.filename) &&
				entry.filename.endsWith('.png'),
			'Meadow Entry export provenance contains an invalid filename'
		);
		assert(
			Number.isInteger(entry.bytes) && (entry.bytes as number) > 0,
			`Meadow Entry export provenance has invalid bytes for ${entry.filename}`
		);
		assert(
			typeof entry.sha256 === 'string' && SHA256_PATTERN.test(entry.sha256),
			`Meadow Entry export provenance has invalid hash for ${entry.filename}`
		);
		assert(
			!inventory.has(entry.filename),
			`Meadow Entry export provenance duplicates ${entry.filename}`
		);
		inventory.set(entry.filename, {
			filename: entry.filename,
			bytes: entry.bytes as number,
			sha256: entry.sha256
		});
	}
	const filenames = [...inventory.keys()].sort();
	const expectedFilenames = [...manifestFilenames].sort();
	assert(
		JSON.stringify(filenames) === JSON.stringify(expectedFilenames),
		`Meadow Entry export provenance/crop manifest inventory differs: provenance=${filenames.join(',')} manifest=${expectedFilenames.join(',')}`
	);
	return { filenames, inventory };
}

async function snapshotPathExists(
	fileSystem: MeadowEntryExportSnapshotFileSystem,
	path: string
): Promise<boolean> {
	try {
		await fileSystem.lstat(path);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
		throw error;
	}
}

export async function readPublishedMeadowEntryExportSnapshot(
	outputRoot: string,
	options: {
		attempts?: number;
		retryDelayMs?: number;
		fileSystem?: MeadowEntryExportSnapshotFileSystem;
	} = {}
): Promise<MeadowEntryExportPackageBytes> {
	const paths = publicationPaths(outputRoot);
	const attempts = options.attempts ?? 3;
	const retryDelayMs = options.retryDelayMs ?? 0;
	const fileSystem = options.fileSystem ?? NODE_SNAPSHOT_FILE_SYSTEM;
	let lastError: unknown;
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		if (attempt > 0 && retryDelayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
		}
		if (await snapshotPathExists(fileSystem, paths.writerSentinel)) {
			lastError = new Error('Meadow Entry export publication is in progress');
			continue;
		}
		try {
			const [provenanceJson, cropManifestJson] = await Promise.all([
				fileSystem.readFile(paths.provenance),
				fileSystem.readFile(paths.cropManifest)
			]);
			const generation = validateExportSnapshotGeneration(provenanceJson, cropManifestJson);
			const actualFilenames = (await fileSystem.readdir(paths.exports)).sort();
			assert(
				JSON.stringify(actualFilenames) === JSON.stringify(generation.filenames),
				`Meadow Entry published export inventory differs: expected=${generation.filenames.join(',')} actual=${actualFilenames.join(',')}`
			);
			const fileValues = await Promise.all(
				generation.filenames.map(async (filename) => {
					const bytes = await fileSystem.readFile(join(paths.exports, filename));
					const expected = generation.inventory.get(filename)!;
					assert(
						bytes.byteLength === expected.bytes && sha256(bytes) === expected.sha256,
						`Meadow Entry published export bytes drifted for ${filename}: bytes=${bytes.byteLength}/${expected.bytes} sha256=${sha256(bytes)}/${expected.sha256}`
					);
					return [filename, bytes] as const;
				})
			);
			const [provenanceAfter, cropManifestAfter, filenamesAfter] = await Promise.all([
				fileSystem.readFile(paths.provenance),
				fileSystem.readFile(paths.cropManifest),
				fileSystem.readdir(paths.exports)
			]);
			assert(
				provenanceAfter.equals(provenanceJson) &&
					cropManifestAfter.equals(cropManifestJson) &&
					JSON.stringify([...filenamesAfter].sort()) === JSON.stringify(actualFilenames) &&
					!(await snapshotPathExists(fileSystem, paths.writerSentinel)),
				'Meadow Entry export publication changed while its snapshot was read'
			);
			return { files: Object.fromEntries(fileValues), provenanceJson, cropManifestJson };
		} catch (error) {
			lastError = error;
		}
	}
	throw lastError instanceof Error
		? lastError
		: new Error('Meadow Entry published export snapshot is unavailable');
}

async function canonicalJson(value: unknown): Promise<Buffer> {
	return Buffer.from(
		await format(JSON.stringify(value), {
			parser: 'json',
			useTabs: true,
			singleQuote: true,
			trailingComma: 'none',
			printWidth: 100
		})
	);
}

async function buildCropManifest(
	controlFingerprint: string,
	masters: { baseSha256: string; foregroundSha256: string; provenanceSha256: string }
): Promise<Buffer> {
	return await canonicalJson({
		version: 1,
		controlFingerprint,
		masters,
		crops: MEADOW_ENTRY_APPROVED_CROPS,
		overlaps: MEADOW_ENTRY_APPROVED_OVERLAPS,
		runtimeCoverage: MEADOW_ENTRY_RUNTIME_COVERAGE,
		budgetSummary: MEADOW_ENTRY_CROP_BUDGET_SUMMARY
	});
}

function firstDifferentByte(first: Buffer, second: Buffer): number {
	const length = Math.min(first.length, second.length);
	for (let index = 0; index < length; index += 1) {
		if (first[index] !== second[index]) return index;
	}
	return first.length === second.length ? -1 : length;
}

async function verifyExportPixelsIndependently(
	approved: Awaited<ReturnType<typeof readApprovedMeadowEntryPackageSnapshot>>,
	published: MeadowEntryExportPackageBytes
): Promise<MeadowEntryExportVerification> {
	const expectedFilenames = MEADOW_ENTRY_APPROVED_CROPS.flatMap((crop) => [
		crop.baseFilename,
		...(crop.foregroundFilename === null ? [] : [crop.foregroundFilename])
	]).sort();
	const actualFilenames = Object.keys(published.files).sort();
	assert(
		JSON.stringify(actualFilenames) === JSON.stringify(expectedFilenames),
		`Meadow Entry export inventory drifted: expected=${expectedFilenames.join(',')} actual=${actualFilenames.join(',')}`
	);
	const decoded: MeadowEntryDecodedExport[] = [];
	const reviewTargetExceptions: string[] = [];
	let measuredBaseBytes = 0;
	let measuredForegroundBytes = 0;
	for (const crop of MEADOW_ENTRY_APPROVED_CROPS) {
		const planes: readonly ('base' | 'foreground')[] =
			crop.foregroundFilename === null ? ['base'] : ['base', 'foreground'];
		for (const plane of planes) {
			const filename = plane === 'base' ? crop.baseFilename : crop.foregroundFilename!;
			const png = published.files[filename]!;
			const masterPng = plane === 'base' ? approved.basePng : approved.foregroundPng;
			const expectedWidth = crop.bounds.right - crop.bounds.left;
			const expectedHeight = crop.bounds.bottom - crop.bounds.top;
			const [exported, masterExtract] = await Promise.all([
				decodeMeadowEntryRgba(png),
				sharp(masterPng)
					.extract({
						left: crop.bounds.left,
						top: crop.bounds.top,
						width: expectedWidth,
						height: expectedHeight
					})
					.toColourspace('srgb')
					.ensureAlpha()
					.raw()
					.toBuffer()
			]);
			assert(
				exported.width === expectedWidth && exported.height === expectedHeight,
				`Meadow Entry independently decoded dimensions drifted crop=${crop.id} plane=${plane}`
			);
			const difference = firstDifferentByte(exported.data, masterExtract);
			if (difference !== -1) {
				const pixel = Math.floor(difference / 4);
				const localX = pixel % expectedWidth;
				const localY = Math.floor(pixel / expectedWidth);
				throw new Error(
					`Meadow Entry independent master/export mismatch crop=${crop.id} plane=${plane} master=${crop.bounds.left + localX},${crop.bounds.top + localY} local=${localX},${localY} channel=${difference % 4}`
				);
			}
			if (plane === 'foreground') {
				for (let offset = 0; offset < exported.data.length; offset += 4) {
					assert(
						exported.data[offset + 3] !== 0 ||
							(exported.data[offset] === 0 &&
								exported.data[offset + 1] === 0 &&
								exported.data[offset + 2] === 0),
						`Meadow Entry independent hidden-RGB failure crop=${crop.id} local=${(offset / 4) % expectedWidth},${Math.floor(offset / 4 / expectedWidth)}`
					);
				}
			}
			const reviewBytes =
				plane === 'base'
					? crop.sizeBudgets.baseReviewBytes
					: crop.sizeBudgets.foregroundReviewBytes!;
			const hardBytes =
				plane === 'base' ? crop.sizeBudgets.baseHardBytes : crop.sizeBudgets.foregroundHardBytes!;
			assert(
				png.byteLength <= hardBytes,
				`Meadow Entry independent hard-budget failure crop=${crop.id} plane=${plane} bytes=${png.byteLength} hard=${hardBytes}`
			);
			if (png.byteLength > reviewBytes) reviewTargetExceptions.push(`${crop.id}:${plane}`);
			if (plane === 'base') measuredBaseBytes += png.byteLength;
			else measuredForegroundBytes += png.byteLength;
			decoded.push({
				cropId: crop.id,
				plane,
				bounds: crop.bounds,
				width: exported.width,
				height: exported.height,
				rgba: exported.data
			});
		}
	}
	verifyMeadowEntryOverlapPixels({ decoded, overlaps: MEADOW_ENTRY_APPROVED_OVERLAPS });
	const exportArea = MEADOW_ENTRY_APPROVED_CROPS.reduce(
		(sum, crop) =>
			sum + (crop.bounds.right - crop.bounds.left) * (crop.bounds.bottom - crop.bounds.top),
		0
	);
	const overlapPlanePixelsCompared = MEADOW_ENTRY_APPROVED_OVERLAPS.reduce(
		(sum, overlap) =>
			sum +
			(overlap.bounds.right - overlap.bounds.left) *
				(overlap.bounds.bottom - overlap.bounds.top) *
				(overlap.planePolicy === 'base-and-foreground' ? 2 : 1),
		0
	);
	assert(
		measuredBaseBytes <= MEADOW_ENTRY_CROP_BUDGET_SUMMARY.aggregateBaseHardBytes &&
			measuredForegroundBytes <= MEADOW_ENTRY_CROP_BUDGET_SUMMARY.aggregateForegroundHardBytes,
		`Meadow Entry independent aggregate budget failure base=${measuredBaseBytes}/${MEADOW_ENTRY_CROP_BUDGET_SUMMARY.aggregateBaseHardBytes} foreground=${measuredForegroundBytes}/${MEADOW_ENTRY_CROP_BUDGET_SUMMARY.aggregateForegroundHardBytes} exportAreaRatio=${exportArea / (6_400 * 6_400)}`
	);
	return {
		cropCount: MEADOW_ENTRY_APPROVED_CROPS.length,
		exportCount: actualFilenames.length,
		baseExportCount: MEADOW_ENTRY_APPROVED_CROPS.length,
		foregroundExportCount: MEADOW_ENTRY_APPROVED_CROPS.filter(
			(crop) => crop.foregroundFilename !== null
		).length,
		overlapCount: MEADOW_ENTRY_APPROVED_OVERLAPS.length,
		cornerGroupCount: new Set(
			MEADOW_ENTRY_APPROVED_OVERLAPS.flatMap((overlap) => overlap.cornerGroupId ?? [])
		).size,
		overlapPlanePixelsCompared,
		exportAreaRatio: exportArea / (6_400 * 6_400),
		measuredBaseBytes,
		measuredForegroundBytes,
		aggregateBaseHardBytes: MEADOW_ENTRY_CROP_BUDGET_SUMMARY.aggregateBaseHardBytes,
		aggregateForegroundHardBytes: MEADOW_ENTRY_CROP_BUDGET_SUMMARY.aggregateForegroundHardBytes,
		reviewTargetExceptions
	};
}

export interface MeadowEntryApprovedMasterIdentities {
	baseSha256: string;
	foregroundSha256: string;
	provenanceSha256: string;
	controlFingerprint: string;
}

export function assertApprovedMasterSnapshot(
	snapshot: { basePng: Buffer; foregroundPng: Buffer; provenanceJson: Buffer },
	expected: MeadowEntryApprovedMasterIdentities
): void {
	assert(
		sha256(snapshot.basePng) === expected.baseSha256,
		'Meadow Entry approved base master hash has drifted'
	);
	assert(
		sha256(snapshot.foregroundPng) === expected.foregroundSha256,
		'Meadow Entry approved foreground master hash has drifted'
	);
	assert(
		sha256(snapshot.provenanceJson) === expected.provenanceSha256,
		'Meadow Entry approved master provenance hash has drifted'
	);
	let provenance: {
		controls?: { fingerprint?: unknown };
		base?: { sha256?: unknown };
		foreground?: { sha256?: unknown };
	};
	try {
		provenance = JSON.parse(snapshot.provenanceJson.toString('utf8')) as typeof provenance;
	} catch {
		throw new Error('Meadow Entry approved master provenance is not valid JSON');
	}
	assert(
		provenance.controls?.fingerprint === expected.controlFingerprint,
		'Meadow Entry approved master provenance control fingerprint has drifted'
	);
	assert(
		provenance.base?.sha256 === expected.baseSha256 &&
			provenance.foreground?.sha256 === expected.foregroundSha256,
		'Meadow Entry approved master provenance plane hashes have drifted'
	);
}

export async function runExportMeadowEntryRegions(
	outputRoot = DEFAULT_OUTPUT_ROOT,
	repositoryRoot = process.cwd()
): Promise<MeadowEntryExportRunResult> {
	const inputs = buildMeadowEntryControlInputs(repositoryRoot);
	const currentControlFingerprint = computeMeadowEntryCombinedControlFingerprint(inputs);
	assert(
		currentControlFingerprint === meadowEntryControlsApproval.combinedControlFingerprint,
		'Meadow Entry control fingerprint is stale'
	);
	const packageRoot = resolve(repositoryRoot, outputRoot);
	const approved = await readApprovedMeadowEntryPackageSnapshot(packageRoot);
	assertApprovedMasterSnapshot(approved, {
		baseSha256: APPROVED_BASE_SHA256,
		foregroundSha256: APPROVED_FOREGROUND_SHA256,
		provenanceSha256: APPROVED_MASTER_PROVENANCE_SHA256,
		controlFingerprint: currentControlFingerprint
	});
	const exported = await exportMeadowEntryRegions({
		baseMasterPng: approved.basePng,
		foregroundMasterPng: approved.foregroundPng,
		controlFingerprint: currentControlFingerprint,
		approvedControlFingerprint: meadowEntryControlsApproval.combinedControlFingerprint,
		crops: MEADOW_ENTRY_APPROVED_CROPS,
		overlaps: MEADOW_ENTRY_APPROVED_OVERLAPS
	});
	const provenance = JSON.parse(exported.provenanceJson.toString('utf8')) as Record<
		string,
		unknown
	>;
	const packageBytes: MeadowEntryExportPackageBytes = {
		files: exported.files,
		provenanceJson: await canonicalJson({
			...provenance,
			approvedMasterProvenanceSha256: APPROVED_MASTER_PROVENANCE_SHA256
		}),
		cropManifestJson: await buildCropManifest(currentControlFingerprint, {
			baseSha256: APPROVED_BASE_SHA256,
			foregroundSha256: APPROVED_FOREGROUND_SHA256,
			provenanceSha256: APPROVED_MASTER_PROVENANCE_SHA256
		})
	};
	await publishMeadowEntryExportPackage(packageRoot, packageBytes);
	const published = await readPublishedMeadowEntryExportSnapshot(packageRoot);
	assert(
		Object.keys(published.files).length === Object.keys(packageBytes.files).length &&
			Object.entries(packageBytes.files).every(([filename, bytes]) =>
				published.files[filename]?.equals(bytes)
			) &&
			published.provenanceJson.equals(packageBytes.provenanceJson) &&
			published.cropManifestJson.equals(packageBytes.cropManifestJson),
		'Meadow Entry published export snapshot does not match generated bytes'
	);
	const verification = await verifyExportPixelsIndependently(approved, published);
	return { ...packageBytes, verification };
}

if (import.meta.main) {
	const packageBytes = await runExportMeadowEntryRegions();
	process.stdout.write(
		`${JSON.stringify({ ...packageBytes.verification, bytes: Object.values(packageBytes.files).reduce((sum, value) => sum + value.byteLength, 0), provenanceSha256: sha256(packageBytes.provenanceJson), cropManifestSha256: sha256(packageBytes.cropManifestJson) })}\n`
	);
}
