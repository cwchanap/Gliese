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
	'09f82618ef395402f2ceffa2fb058c4f8ad8b9df5bc1f80c7e711a454c6121cd';

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
		cropManifest: join(root, 'provenance/meadow-entry-export-crop-manifest.json'),
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
	const stagingCropManifest = join(stagingRoot, 'meadow-entry-export-crop-manifest.json');
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
			await fileSystem.rm(backups[index]!, { recursive: true, force: true });
		}
	}
}

export async function readPublishedMeadowEntryExportSnapshot(
	outputRoot: string
): Promise<MeadowEntryExportPackageBytes> {
	const paths = publicationPaths(outputRoot);
	assert(
		!(await pathExists(paths.writerSentinel)),
		'Meadow Entry export publication is in progress'
	);
	const filenames = (await readdir(paths.exports)).sort();
	const [fileValues, provenanceJson, cropManifestJson] = await Promise.all([
		Promise.all(
			filenames.map(
				async (filename) => [filename, await readFile(join(paths.exports, filename))] as const
			)
		),
		readFile(paths.provenance),
		readFile(paths.cropManifest)
	]);
	assert(
		!(await pathExists(paths.writerSentinel)),
		'Meadow Entry export publication changed while its snapshot was read'
	);
	return { files: Object.fromEntries(fileValues), provenanceJson, cropManifestJson };
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

async function buildCropManifest(controlFingerprint: string): Promise<Buffer> {
	return await canonicalJson({
		version: 1,
		controlFingerprint,
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

function assertApprovedMasterSnapshot(
	snapshot: Awaited<ReturnType<typeof readApprovedMeadowEntryPackageSnapshot>>,
	controlFingerprint: string
): void {
	assert(
		sha256(snapshot.basePng) === APPROVED_BASE_SHA256,
		'Meadow Entry approved base master hash has drifted'
	);
	assert(
		sha256(snapshot.foregroundPng) === APPROVED_FOREGROUND_SHA256,
		'Meadow Entry approved foreground master hash has drifted'
	);
	assert(
		sha256(snapshot.provenanceJson) === APPROVED_MASTER_PROVENANCE_SHA256,
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
		provenance.controls?.fingerprint === controlFingerprint,
		'Meadow Entry approved master provenance control fingerprint has drifted'
	);
	assert(
		provenance.base?.sha256 === APPROVED_BASE_SHA256 &&
			provenance.foreground?.sha256 === APPROVED_FOREGROUND_SHA256,
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
	assertApprovedMasterSnapshot(approved, currentControlFingerprint);
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
		cropManifestJson: await buildCropManifest(currentControlFingerprint)
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
