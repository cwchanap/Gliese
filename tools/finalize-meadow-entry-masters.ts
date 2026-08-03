import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

import sharp from 'sharp';

import { meadowEntryControlsApproval } from '$lib/game/content/approvals/meadow-entry-controls';
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

const DEFAULT_OUTPUT_ROOT = 'artifacts/meadow-entry/hpa-399';
const CONTROLS_ROOT = 'docs/superpowers/reports/img/hpa-399/controls';
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
	refinementManifest?: string;
	outputRoot: string;
	outputRootExplicit: boolean;
	validateOnly: boolean;
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
	for (let index = args[0] === '--' ? 1 : 0; index < args.length; index += 1) {
		const flag = args[index];
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
	return {
		plane,
		baseCandidate: values.get('--base-candidate'),
		foregroundCandidate: values.get('--foreground-candidate'),
		baseTransform: values.get('--base-transform'),
		foregroundTransform: values.get('--foreground-transform'),
		baseProvenance: values.get('--base-provenance'),
		foregroundProvenance: values.get('--foreground-provenance'),
		refinementManifest: values.get('--refinement-manifest'),
		outputRoot: values.get('--output-root') ?? DEFAULT_OUTPUT_ROOT,
		outputRootExplicit: values.has('--output-root'),
		validateOnly
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

async function currentContext(repositoryRoot: string) {
	const inputs = buildMeadowEntryControlInputs(repositoryRoot);
	const [basePng, foregroundPng, storageConfiguration] = await Promise.all([
		readFile(join(repositoryRoot, PREDECESSOR_BASE)),
		readFile(join(repositoryRoot, PREDECESSOR_FOREGROUND)),
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
			approvedBaseSha256: inputs.predecessor.hpa398BaseSha256,
			approvedForegroundSha256: inputs.predecessor.hpa398ForegroundSha256
		}
	};
}

async function baseInput(
	arguments_: FinalizeMeadowEntryMasterArguments,
	context: Awaited<ReturnType<typeof currentContext>>,
	refinements: readonly MeadowEntryRefinementProvenance[]
): Promise<FinalizeMeadowEntryBaseInput> {
	const [candidatePng, transform, generation] = await Promise.all([
		readFile(requiredArgument(arguments_.baseCandidate, '--base-candidate')),
		readJson<MeadowEntryNormalizationTransform>(
			requiredArgument(arguments_.baseTransform, '--base-transform')
		),
		readJson<MeadowEntryGenerationProvenance>(
			requiredArgument(arguments_.baseProvenance, '--base-provenance')
		)
	]);
	return {
		...context,
		candidatePng,
		transform,
		generation,
		refinements: refinements.filter((entry) => entry.plane === 'base')
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
	const [candidatePng, transform, generation, eligibleMaskPng, protectedMaskPng] =
		await Promise.all([
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
			)
		]);
	return {
		...context,
		candidatePng,
		transform,
		eligibleMaskPng,
		protectedMaskPng,
		generation,
		refinements: refinements.filter((entry) => entry.plane === 'foreground')
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

export async function runFinalizeMeadowEntryMasters(
	args: readonly string[],
	repositoryRoot = process.cwd(),
	dependencies: Partial<MeadowEntryMasterFinalizerDependencies> = {}
): Promise<void> {
	const finalizers = { ...DEFAULT_FINALIZERS, ...dependencies };
	const arguments_ = parseFinalizeMeadowEntryMasterArguments(args);
	if (arguments_.plane !== 'both') {
		if (!arguments_.outputRootExplicit) {
			throw new Error(
				'Single-plane meadow-entry finalization requires an explicit --output-root review/work destination; use --plane both to publish the approved package.'
			);
		}
		const approvedRoot = resolve(repositoryRoot, DEFAULT_OUTPUT_ROOT);
		if (resolve(arguments_.outputRoot) === approvedRoot) {
			throw new Error(
				'Single-plane meadow-entry finalization must not write to the approved package root; use --plane both or a review/work destination.'
			);
		}
	}
	const refinements = await readRefinements(arguments_.refinementManifest);
	const context = await currentContext(repositoryRoot);
	if (arguments_.plane === 'base') {
		const result = await finalizers.finalizeBase(await baseInput(arguments_, context, refinements));
		if (!arguments_.validateOnly) {
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
		if (!arguments_.validateOnly) {
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
	if (!arguments_.validateOnly) {
		await publishApprovedMeadowEntryPackage(arguments_.outputRoot, packageBytes);
	}
	console.log(`base-sha256 ${sha256(packageBytes.basePng)}`);
	console.log(`foreground-sha256 ${sha256(packageBytes.foregroundPng)}`);
}

if (import.meta.main) {
	await runFinalizeMeadowEntryMasters(process.argv.slice(2)).catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
