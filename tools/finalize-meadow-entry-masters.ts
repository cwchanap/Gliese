import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

import sharp from 'sharp';

import { meadowEntryControlsApproval } from '$lib/game/content/approvals/meadow-entry-painted-v2-controls';
import {
	MEADOW_ENTRY_MASTER_POLICY,
	finalizeMeadowEntryBase,
	finalizeMeadowEntryForeground,
	finalizeMeadowEntryMasters,
	type FinalizeMeadowEntryBaseInput,
	type FinalizeMeadowEntryForegroundInput
} from '$lib/game/content/backgrounds/meadow-entry-master-finalizer';
import type {
	MeadowEntryGenerationProvenance,
	MeadowEntryNormalizationTransform,
	MeadowEntryRefinementProvenance
} from '$lib/game/content/backgrounds/meadow-entry-master-provenance';
import { validateMeadowEntryRefinementProvenance } from '$lib/game/content/backgrounds/meadow-entry-master-provenance';
import {
	buildMeadowEntryControlInputs,
	computeMeadowEntryCombinedControlFingerprint
} from '$lib/game/content/backgrounds/meadow-entry-controls';

const DEFAULT_OUTPUT_ROOT = 'artifacts/meadow-entry/painted-v2';
const CONTROLS_ROOT = 'artifacts/meadow-entry/painted-v2/controls';
const PREDECESSOR_BASE = 'public/game/assets/regions/sundrop-village-base.png';
const PREDECESSOR_FOREGROUND = 'public/game/assets/regions/sundrop-village-foreground.png';

type Plane = 'base' | 'foreground' | 'both';

export interface FinalizeMeadowEntryMasterArguments {
	plane: Plane;
	baseCandidate?: string;
	foregroundCandidate?: string;
	baseTransform?: string;
	foregroundTransform?: string;
	baseProvenance?: string;
	foregroundProvenance?: string;
	basePreRefinementCandidate?: string;
	foregroundPreRefinementCandidate?: string;
	refinementManifest?: string;
	outputRoot: string;
	outputRootExplicit: boolean;
	validateOnly: boolean;
	check: boolean;
}

export interface MeadowEntryMasterPublicationFileSystem {
	mkdir: typeof mkdir;
	readdir: typeof readdir;
	rename: typeof rename;
	rm: typeof rm;
	writeFile: typeof writeFile;
}

export interface MeadowEntryMasterFinalizerDependencies {
	finalizeBase: typeof finalizeMeadowEntryBase;
	finalizeForeground: typeof finalizeMeadowEntryForeground;
	finalizeBoth: typeof finalizeMeadowEntryMasters;
	checkFileSystem?: MeadowEntryMasterCheckFileSystem;
	readPredecessor?: (repositoryRoot: string, path: string) => Promise<Buffer>;
	predecessorHashes?: {
		baseSha256: string;
		foregroundSha256: string;
	};
}

export interface MeadowEntryMasterCheckFileSystem {
	readFile(path: string): Promise<Buffer>;
	mkdir: typeof mkdir;
	writeFile: typeof writeFile;
	rename: typeof rename;
	rm: typeof rm;
}

const NODE_PUBLICATION_FILE_SYSTEM: MeadowEntryMasterPublicationFileSystem = {
	mkdir,
	readdir,
	rename,
	rm,
	writeFile
};

const DEFAULT_FINALIZERS: MeadowEntryMasterFinalizerDependencies = {
	finalizeBase: finalizeMeadowEntryBase,
	finalizeForeground: finalizeMeadowEntryForeground,
	finalizeBoth: finalizeMeadowEntryMasters
};

const NODE_CHECK_FILE_SYSTEM: MeadowEntryMasterCheckFileSystem = {
	readFile,
	mkdir,
	writeFile,
	rename,
	rm
};

function sha256(value: Buffer): string {
	return createHash('sha256').update(value).digest('hex');
}

function requiredValue(values: Map<string, string>, flag: string): string {
	const value = values.get(flag);
	if (!value) throw new Error(`Missing required ${flag} argument.`);
	return value;
}

function requiredArgument(value: string | undefined, flag: string): string {
	if (!value) throw new Error(`Missing required ${flag} argument.`);
	return value;
}

export function parseFinalizeMeadowEntryMasterArguments(
	args: readonly string[]
): FinalizeMeadowEntryMasterArguments {
	const values = new Map<string, string>();
	let validateOnly = false;
	let check = false;
	for (let index = args[0] === '--' ? 1 : 0; index < args.length; index += 1) {
		const flag = args[index];
		if (flag === '--check') {
			if (check) throw new Error('Duplicate meadow-entry finalizer argument: --check');
			check = true;
			continue;
		}
		if (flag === '--validate-only') {
			if (validateOnly)
				throw new Error('Duplicate meadow-entry finalizer argument: --validate-only');
			validateOnly = true;
			continue;
		}
		if (
			flag === undefined ||
			![
				'--plane',
				'--base-candidate',
				'--foreground-candidate',
				'--base-transform',
				'--foreground-transform',
				'--base-provenance',
				'--foreground-provenance',
				'--base-pre-refinement-candidate',
				'--foreground-pre-refinement-candidate',
				'--refinement-manifest',
				'--output-root'
			].includes(flag)
		) {
			throw new Error(`Unknown meadow-entry finalizer argument: ${flag ?? '<missing>'}`);
		}
		const value = args[index + 1];
		if (value === undefined || value.startsWith('--')) {
			throw new Error(`Missing value for meadow-entry finalizer argument: ${flag}`);
		}
		if (values.has(flag)) throw new Error(`Duplicate meadow-entry finalizer argument: ${flag}`);
		values.set(flag, value);
		index += 1;
	}
	const plane = requiredValue(values, '--plane');
	if (plane !== 'base' && plane !== 'foreground' && plane !== 'both') {
		throw new Error('--plane must be base, foreground, or both.');
	}
	if (check && validateOnly) {
		throw new Error('Meadow Entry finalizer cannot combine --check with --validate-only.');
	}
	return {
		plane,
		baseCandidate: values.get('--base-candidate'),
		foregroundCandidate: values.get('--foreground-candidate'),
		baseTransform: values.get('--base-transform'),
		foregroundTransform: values.get('--foreground-transform'),
		baseProvenance: values.get('--base-provenance'),
		foregroundProvenance: values.get('--foreground-provenance'),
		basePreRefinementCandidate: values.get('--base-pre-refinement-candidate'),
		foregroundPreRefinementCandidate: values.get('--foreground-pre-refinement-candidate'),
		refinementManifest: values.get('--refinement-manifest'),
		outputRoot: values.get('--output-root') ?? DEFAULT_OUTPUT_ROOT,
		outputRootExplicit: values.has('--output-root'),
		validateOnly,
		check
	};
}

async function readJson<T>(path: string): Promise<T> {
	return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function readRefinements(
	path: string | undefined
): Promise<readonly MeadowEntryRefinementProvenance[]> {
	if (!path) return [];
	const manifest = await readJson<unknown>(path);
	let records: unknown[];
	if (Array.isArray(manifest)) {
		records = manifest;
	} else if (
		typeof manifest === 'object' &&
		manifest !== null &&
		Array.isArray((manifest as { refinements?: unknown }).refinements)
	) {
		records = (manifest as { refinements: unknown[] }).refinements;
	} else {
		throw new Error(
			'Meadow Entry refinement manifest must be an array or contain a refinements array.'
		);
	}
	for (const record of records) {
		validateMeadowEntryRefinementProvenance(record);
	}
	return records as MeadowEntryRefinementProvenance[];
}

async function currentContext(
	repositoryRoot: string,
	readPredecessor?: (repositoryRoot: string, path: string) => Promise<Buffer>,
	predecessorHashes?: MeadowEntryMasterFinalizerDependencies['predecessorHashes']
) {
	const inputs = buildMeadowEntryControlInputs(repositoryRoot);
	const readHistoricalPredecessor = async (path: string): Promise<Buffer> => {
		try {
			return await readFile(join(repositoryRoot, path));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
			throw new Error(
				`Meadow Entry predecessor bytes are missing: ${path}; provide an immutable predecessor-byte reader`,
				{ cause: error }
			);
		}
	};
	const predecessorReader =
		readPredecessor ??
		(async (_repositoryRoot: string, path: string) => {
			return await readHistoricalPredecessor(path);
		});
	const [basePng, foregroundPng, storageConfiguration] = await Promise.all([
		predecessorReader(repositoryRoot, PREDECESSOR_BASE),
		predecessorReader(repositoryRoot, PREDECESSOR_FOREGROUND),
		readFile(join(repositoryRoot, '.gitattributes'))
	]);
	return {
		policy: MEADOW_ENTRY_MASTER_POLICY,
		controlFingerprint: computeMeadowEntryCombinedControlFingerprint(inputs),
		approvedControlFingerprint: meadowEntryControlsApproval.combinedControlFingerprint,
		storageConfigurationSha256: sha256(storageConfiguration),
		approvedStorageConfigurationSha256: meadowEntryControlsApproval.storageConfigurationSha256,
		predecessor: {
			basePng,
			foregroundPng,
			approvedBaseSha256: predecessorHashes?.baseSha256 ?? inputs.predecessor.hpa398BaseSha256,
			approvedForegroundSha256:
				predecessorHashes?.foregroundSha256 ?? inputs.predecessor.hpa398ForegroundSha256
		}
	};
}

async function baseInput(
	arguments_: FinalizeMeadowEntryMasterArguments,
	context: Awaited<ReturnType<typeof currentContext>>,
	refinements: readonly MeadowEntryRefinementProvenance[]
): Promise<FinalizeMeadowEntryBaseInput> {
	const baseRefinements = refinements.filter((entry) => entry.plane === 'base');
	const [candidatePng, transform, generation, preRefinementCandidatePng] = await Promise.all([
		readFile(requiredArgument(arguments_.baseCandidate, '--base-candidate')),
		readJson<MeadowEntryNormalizationTransform>(
			requiredArgument(arguments_.baseTransform, '--base-transform')
		),
		readJson<MeadowEntryGenerationProvenance>(
			requiredArgument(arguments_.baseProvenance, '--base-provenance')
		),
		arguments_.basePreRefinementCandidate
			? readFile(arguments_.basePreRefinementCandidate)
			: undefined
	]);
	if (baseRefinements.length > 0 && !preRefinementCandidatePng) {
		throw new Error(
			'Meadow Entry base refinements require --base-pre-refinement-candidate pointing to the master the first refinement started from.'
		);
	}
	return {
		...context,
		candidatePng,
		preRefinementCandidatePng,
		transform,
		generation,
		refinements: baseRefinements
	};
}

async function rasterizeControlMaskSvg(path: string): Promise<Buffer> {
	return await sharp(await readFile(path))
		.png()
		.toBuffer();
}

async function foregroundInput(
	arguments_: FinalizeMeadowEntryMasterArguments,
	repositoryRoot: string,
	context: Awaited<ReturnType<typeof currentContext>>,
	refinements: readonly MeadowEntryRefinementProvenance[]
): Promise<FinalizeMeadowEntryForegroundInput> {
	const foregroundRefinements = refinements.filter((entry) => entry.plane === 'foreground');
	const [
		candidatePng,
		transform,
		generation,
		eligibleMaskPng,
		protectedMaskPng,
		preRefinementCandidatePng
	] = await Promise.all([
		readFile(requiredArgument(arguments_.foregroundCandidate, '--foreground-candidate')),
		readJson<MeadowEntryNormalizationTransform>(
			requiredArgument(arguments_.foregroundTransform, '--foreground-transform')
		),
		readJson<MeadowEntryGenerationProvenance>(
			requiredArgument(arguments_.foregroundProvenance, '--foreground-provenance')
		),
		rasterizeControlMaskSvg(
			join(repositoryRoot, CONTROLS_ROOT, 'meadow-entry-foreground-eligible-mask.svg')
		),
		rasterizeControlMaskSvg(
			join(repositoryRoot, CONTROLS_ROOT, 'meadow-entry-protected-live-mask.svg')
		),
		arguments_.foregroundPreRefinementCandidate
			? readFile(arguments_.foregroundPreRefinementCandidate)
			: undefined
	]);
	if (foregroundRefinements.length > 0 && !preRefinementCandidatePng) {
		throw new Error(
			'Meadow Entry foreground refinements require --foreground-pre-refinement-candidate pointing to the master the first refinement started from.'
		);
	}
	return {
		...context,
		candidatePng,
		preRefinementCandidatePng,
		transform,
		eligibleMaskPng,
		protectedMaskPng,
		generation,
		refinements: foregroundRefinements
	};
}

export interface MeadowEntryApprovedPackagePaths {
	root: string;
	masters: string;
	provenance: string;
	writerSentinel: string;
}

export function meadowEntryApprovedPackagePaths(
	outputRoot: string
): MeadowEntryApprovedPackagePaths {
	const root = resolve(outputRoot);
	return {
		root,
		masters: join(root, 'masters'),
		provenance: join(root, 'provenance'),
		writerSentinel: join(root, '.meadow-entry-publication.lock')
	};
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

/**
 * Canonicalises a filesystem path by resolving symbolic links, so two paths
 * that refer to the same directory compare equal regardless of how they were
 * spelled. Non-existent destinations are supported by canonicalising their
 * nearest existing ancestor and re-appending the non-existent tail.
 *
 * @param path - Absolute or relative path to canonicalise.
 * @returns The canonical absolute path, with symlinks resolved on the
 * existing portion.
 */
async function canonicalizeRoot(path: string): Promise<string> {
	const resolved = resolve(path);
	let existingAncestor = resolved;
	const tail: string[] = [];
	while (true) {
		try {
			const real = await realpath(existingAncestor);
			return tail.length === 0 ? real : join(real, ...tail.reverse());
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
			tail.push(basename(existingAncestor));
			existingAncestor = dirname(existingAncestor);
		}
	}
}

export interface ApprovedPackageBytes {
	basePng: Buffer;
	foregroundPng: Buffer;
	provenanceJson: Buffer;
}

interface ApprovedMasterManifest {
	base?: { sha256?: unknown };
	foreground?: { sha256?: unknown };
}

function snapshotTargetPaths(paths: MeadowEntryApprovedPackagePaths): readonly string[] {
	return [
		join(paths.masters, 'meadow-entry-base-master.png'),
		join(paths.masters, 'meadow-entry-foreground-master.png'),
		join(paths.provenance, 'meadow-entry-master-provenance.json')
	];
}

function assertManifestHashes(
	provenanceJson: Buffer,
	basePng: Buffer,
	foregroundPng: Buffer
): void {
	let manifest: ApprovedMasterManifest;
	try {
		manifest = JSON.parse(provenanceJson.toString('utf8')) as ApprovedMasterManifest;
	} catch {
		throw new Error('Meadow Entry approved package provenance is not valid JSON');
	}
	if (
		manifest.base?.sha256 !== sha256(basePng) ||
		manifest.foreground?.sha256 !== sha256(foregroundPng)
	) {
		throw new Error('Meadow Entry approved package provenance does not match its master bytes');
	}
}

/**
 * Reads a consistent snapshot of the approved Meadow Entry master package
 * (base PNG, foreground PNG, and provenance JSON) from the configured output
 * root. Retries while a publication sentinel is present or the package changes
 * mid-read, and verifies that the provenance manifest hashes match the master
 * bytes before returning.
 *
 * @param outputRoot - Filesystem root of the approved package.
 * @param options - Optional retry tuning.
 * @param options.attempts - Maximum number of read attempts. Defaults to `3`.
 * @param options.retryDelayMs - Milliseconds to wait between retries. Defaults to `0`.
 * @returns A promise resolving to the approved package bytes
 * (`{ basePng, foregroundPng, provenanceJson }`).
 */
export async function readApprovedMeadowEntryPackageSnapshot(
	outputRoot: string,
	options: { attempts?: number; retryDelayMs?: number } = {}
): Promise<ApprovedPackageBytes> {
	const paths = meadowEntryApprovedPackagePaths(outputRoot);
	const attempts = options.attempts ?? 3;
	const retryDelayMs = options.retryDelayMs ?? 0;
	let lastError: unknown;
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		if (attempt > 0 && retryDelayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
		}
		if (await pathExists(paths.writerSentinel)) {
			lastError = new Error('Meadow Entry approved package publication is in progress');
			continue;
		}
		try {
			const [basePng, foregroundPng, provenanceJson] = await Promise.all(
				snapshotTargetPaths(paths).map((path) => readFile(path))
			);
			if (await pathExists(paths.writerSentinel)) {
				lastError = new Error('Meadow Entry approved package publication is in progress');
				continue;
			}
			assertManifestHashes(provenanceJson, basePng, foregroundPng);
			const provenanceAfterRead = await readFile(
				join(paths.provenance, 'meadow-entry-master-provenance.json')
			);
			if (!provenanceAfterRead.equals(provenanceJson) || (await pathExists(paths.writerSentinel))) {
				lastError = new Error('Meadow Entry approved package changed while its snapshot was read');
				continue;
			}
			return { basePng, foregroundPng, provenanceJson };
		} catch (error) {
			lastError = error;
		}
	}
	throw lastError instanceof Error
		? lastError
		: new Error('Meadow Entry approved package snapshot is unavailable');
}

export async function publishApprovedMeadowEntryPackage(
	outputRoot: string,
	packageBytes: ApprovedPackageBytes,
	fileSystem: MeadowEntryMasterPublicationFileSystem = NODE_PUBLICATION_FILE_SYSTEM
): Promise<void> {
	const paths = meadowEntryApprovedPackagePaths(outputRoot);
	const token = randomUUID();
	const stagingRoot = join(dirname(paths.root), `.${basename(paths.root)}.staging-${token}`);
	const stagingTargets = [
		join(stagingRoot, 'masters/meadow-entry-base-master.png'),
		join(stagingRoot, 'masters/meadow-entry-foreground-master.png'),
		join(stagingRoot, 'provenance/meadow-entry-master-provenance.json')
	];
	const targetPaths = snapshotTargetPaths(paths);
	const contents = [packageBytes.basePng, packageBytes.foregroundPng, packageBytes.provenanceJson];
	const backups = targetPaths.map((path) => `${path}.${token}.rollback`);
	const backedUp: boolean[] = [];
	const installed: boolean[] = [];
	let sentinelOwned = false;
	try {
		await fileSystem.mkdir(stagingRoot, { recursive: true });
		for (let index = 0; index < stagingTargets.length; index += 1) {
			const path = stagingTargets[index]!;
			await fileSystem.mkdir(dirname(path), { recursive: true });
			await fileSystem.writeFile(path, contents[index]!, { flag: 'wx' });
		}
		await fileSystem.mkdir(paths.root, { recursive: true });
		await fileSystem.writeFile(paths.writerSentinel, Buffer.from(`${token}\n`), { flag: 'wx' });
		sentinelOwned = true;
		for (let index = 0; index < targetPaths.length; index += 1) {
			const target = targetPaths[index]!;
			await fileSystem.mkdir(dirname(target), { recursive: true });
			const previousExists = await pathExists(target);
			backedUp[index] = previousExists;
			if (previousExists) await fileSystem.rename(target, backups[index]!);
			await fileSystem.rename(stagingTargets[index]!, target);
			installed[index] = true;
		}
		// The sole consumer-visible commit point: before this atomic removal, every
		// compliant reader rejects the sentinel; after it, all files match the new
		// provenance generation.
		await fileSystem.rm(paths.writerSentinel);
		sentinelOwned = false;
	} catch (error) {
		if (sentinelOwned) {
			let restored = true;
			for (let index = targetPaths.length - 1; index >= 0; index -= 1) {
				const target = targetPaths[index]!;
				if (installed[index]) {
					try {
						await fileSystem.rm(target, { force: true });
					} catch {
						restored = false;
					}
				}
				if (backedUp[index]) {
					try {
						await fileSystem.rename(backups[index]!, target);
					} catch {
						restored = false;
					}
				}
			}
			if (restored)
				await fileSystem.rm(paths.writerSentinel, { force: true }).catch(() => undefined);
		}
		throw error;
	} finally {
		await fileSystem.rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined);
	}
	await Promise.all(
		backups.map((path) => fileSystem.rm(path, { force: true }).catch(() => undefined))
	);
}

async function assertCheckedInPlane(
	outputRoot: string,
	relativePath: string,
	expected: Buffer,
	label: string,
	fileSystem: Pick<MeadowEntryMasterCheckFileSystem, 'readFile'> = NODE_CHECK_FILE_SYSTEM
): Promise<void> {
	let actual: Buffer;
	try {
		actual = await fileSystem.readFile(join(resolve(outputRoot), relativePath));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			throw new Error(`Meadow Entry ${label} check output is missing: ${relativePath}`, {
				cause: error
			});
		}
		throw error;
	}
	if (!actual.equals(expected)) {
		throw new Error(
			`Meadow Entry ${label} check output is stale: ${relativePath} expected=${sha256(expected)} actual=${sha256(actual)}`
		);
	}
}

async function assertCheckedInPackage(
	outputRoot: string,
	packageBytes: ApprovedPackageBytes,
	fileSystem: Pick<MeadowEntryMasterCheckFileSystem, 'readFile'> = NODE_CHECK_FILE_SYSTEM
): Promise<void> {
	await assertCheckedInPlane(
		outputRoot,
		'masters/meadow-entry-base-master.png',
		packageBytes.basePng,
		'base master',
		fileSystem
	);
	await assertCheckedInPlane(
		outputRoot,
		'masters/meadow-entry-foreground-master.png',
		packageBytes.foregroundPng,
		'foreground master',
		fileSystem
	);
	await assertCheckedInPlane(
		outputRoot,
		'provenance/meadow-entry-master-provenance.json',
		packageBytes.provenanceJson,
		'master provenance',
		fileSystem
	);
}

/**
 * Runs the Meadow Entry master finalization CLI flow: parses arguments, guards
 * single-plane writes away from the approved package root, assembles the
 * finalizer inputs from the repository context and refinement manifest, and
 * either writes a single-plane review output, publishes the combined approved
 * package, or only validates (with `--validate-only`). Finalizer dependencies
 * can be overridden for testing.
 *
 * @param args - CLI argument vector (without the executable name).
 * @param repositoryRoot - Repository root used to resolve control inputs,
 * predecessor assets, and the default approved output root. Defaults to
 * `process.cwd()`.
 * @param dependencies - Optional overrides for the base, foreground, or both
 * finalizer implementations.
 * @returns A promise that resolves when the finalization flow has completed.
 */
export async function runFinalizeMeadowEntryMasters(
	args: readonly string[],
	repositoryRoot = process.cwd(),
	dependencies: Partial<MeadowEntryMasterFinalizerDependencies> = {}
): Promise<void> {
	const finalizers = { ...DEFAULT_FINALIZERS, ...dependencies };
	const checkFileSystem = dependencies.checkFileSystem ?? NODE_CHECK_FILE_SYSTEM;
	const arguments_ = parseFinalizeMeadowEntryMasterArguments(args);
	if (arguments_.plane !== 'both' && !arguments_.validateOnly && !arguments_.check) {
		if (!arguments_.outputRootExplicit) {
			throw new Error(
				'Single-plane meadow-entry finalization requires an explicit --output-root review/work destination; use --plane both to publish the approved package.'
			);
		}
		const approvedRoot = await canonicalizeRoot(resolve(repositoryRoot, DEFAULT_OUTPUT_ROOT));
		if ((await canonicalizeRoot(arguments_.outputRoot)) === approvedRoot) {
			throw new Error(
				'Single-plane meadow-entry finalization must not write to the approved package root; use --plane both or a review/work destination.'
			);
		}
	}
	if (arguments_.plane === 'base' && !arguments_.baseCandidate) {
		throw new Error('Missing required --base-candidate argument.');
	}
	const refinements = await readRefinements(arguments_.refinementManifest);
	const context = await currentContext(
		repositoryRoot,
		dependencies.readPredecessor,
		dependencies.predecessorHashes
	);
	if (arguments_.plane === 'base') {
		const result = await finalizers.finalizeBase(await baseInput(arguments_, context, refinements));
		if (arguments_.check) {
			await assertCheckedInPlane(
				arguments_.outputRoot,
				'masters/meadow-entry-base-master.png',
				result.png,
				'base master',
				checkFileSystem
			);
		} else if (!arguments_.validateOnly) {
			const output = join(resolve(arguments_.outputRoot), 'masters/meadow-entry-base-master.png');
			await mkdir(dirname(output), { recursive: true });
			await writeFile(output, result.png);
		}
		console.log(`base-sha256 ${sha256(result.png)}`);
		return;
	}
	if (arguments_.plane === 'foreground') {
		const result = await finalizers.finalizeForeground(
			await foregroundInput(arguments_, repositoryRoot, context, refinements)
		);
		if (arguments_.check) {
			await assertCheckedInPlane(
				arguments_.outputRoot,
				'masters/meadow-entry-foreground-master.png',
				result.png,
				'foreground master',
				checkFileSystem
			);
		} else if (!arguments_.validateOnly) {
			const output = join(
				resolve(arguments_.outputRoot),
				'masters/meadow-entry-foreground-master.png'
			);
			await mkdir(dirname(output), { recursive: true });
			await writeFile(output, result.png);
		}
		console.log(`foreground-sha256 ${sha256(result.png)}`);
		return;
	}
	const packageBytes = await finalizers.finalizeBoth({
		base: await baseInput(arguments_, context, refinements),
		foreground: await foregroundInput(arguments_, repositoryRoot, context, refinements)
	});
	if (arguments_.check) {
		await assertCheckedInPackage(arguments_.outputRoot, packageBytes, checkFileSystem);
	} else if (!arguments_.validateOnly) {
		await publishApprovedMeadowEntryPackage(arguments_.outputRoot, packageBytes);
	}
	console.log(`base-sha256 ${sha256(packageBytes.basePng)}`);
	console.log(`foreground-sha256 ${sha256(packageBytes.foregroundPng)}`);
}
