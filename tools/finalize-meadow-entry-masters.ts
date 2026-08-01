import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

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
	if (Array.isArray(manifest)) return manifest as MeadowEntryRefinementProvenance[];
	if (
		typeof manifest === 'object' &&
		manifest !== null &&
		Array.isArray((manifest as { refinements?: unknown }).refinements)
	) {
		return (manifest as { refinements: MeadowEntryRefinementProvenance[] }).refinements;
	}
	throw new Error(
		'Meadow Entry refinement manifest must be an array or contain a refinements array.'
	);
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
	repositoryRoot: string,
	refinements: readonly MeadowEntryRefinementProvenance[]
): Promise<FinalizeMeadowEntryBaseInput> {
	const [candidatePng, transform, generation, context] = await Promise.all([
		readFile(
			requiredValue(
				new Map([['--base-candidate', arguments_.baseCandidate ?? '']]),
				'--base-candidate'
			)
		),
		readJson<MeadowEntryNormalizationTransform>(
			requiredValue(
				new Map([['--base-transform', arguments_.baseTransform ?? '']]),
				'--base-transform'
			)
		),
		readJson<MeadowEntryGenerationProvenance>(
			requiredValue(
				new Map([['--base-provenance', arguments_.baseProvenance ?? '']]),
				'--base-provenance'
			)
		),
		currentContext(repositoryRoot)
	]);
	return {
		...context,
		candidatePng,
		transform,
		generation,
		refinements: refinements.filter((entry) => entry.plane === 'base')
	};
}

async function foregroundInput(
	arguments_: FinalizeMeadowEntryMasterArguments,
	repositoryRoot: string,
	refinements: readonly MeadowEntryRefinementProvenance[]
): Promise<FinalizeMeadowEntryForegroundInput> {
	const [candidatePng, transform, generation, eligibleMaskPng, protectedMaskPng, context] =
		await Promise.all([
			readFile(
				requiredValue(
					new Map([['--foreground-candidate', arguments_.foregroundCandidate ?? '']]),
					'--foreground-candidate'
				)
			),
			readJson<MeadowEntryNormalizationTransform>(
				requiredValue(
					new Map([['--foreground-transform', arguments_.foregroundTransform ?? '']]),
					'--foreground-transform'
				)
			),
			readJson<MeadowEntryGenerationProvenance>(
				requiredValue(
					new Map([['--foreground-provenance', arguments_.foregroundProvenance ?? '']]),
					'--foreground-provenance'
				)
			),
			readFile(join(repositoryRoot, CONTROLS_ROOT, 'meadow-entry-foreground-eligible-mask.svg')),
			readFile(join(repositoryRoot, CONTROLS_ROOT, 'meadow-entry-protected-live-mask.svg')),
			currentContext(repositoryRoot)
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
}

export function meadowEntryApprovedPackagePaths(
	outputRoot: string
): MeadowEntryApprovedPackagePaths {
	const root = resolve(outputRoot);
	return {
		root,
		masters: join(root, 'masters'),
		provenance: join(root, 'provenance')
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

export async function publishApprovedMeadowEntryPackage(
	outputRoot: string,
	packageBytes: { basePng: Buffer; foregroundPng: Buffer; provenanceJson: Buffer },
	fileSystem: MeadowEntryMasterPublicationFileSystem = NODE_PUBLICATION_FILE_SYSTEM
): Promise<void> {
	const paths = meadowEntryApprovedPackagePaths(outputRoot);
	const parent = dirname(paths.root);
	const token = randomUUID();
	const stagingRoot = join(parent, `.${basename(paths.root)}.staging-${token}`);
	const rollbackRoot = join(parent, `.${basename(paths.root)}.rollback-${token}`);
	const targets = [
		{
			path: join(stagingRoot, 'masters/meadow-entry-base-master.png'),
			contents: packageBytes.basePng
		},
		{
			path: join(stagingRoot, 'masters/meadow-entry-foreground-master.png'),
			contents: packageBytes.foregroundPng
		},
		{
			path: join(stagingRoot, 'provenance/meadow-entry-master-provenance.json'),
			contents: packageBytes.provenanceJson
		}
	];
	let previousPackageMoved = false;
	const preservedEntries: string[] = [];
	try {
		await fileSystem.mkdir(stagingRoot, { recursive: true });
		for (const target of targets) {
			await fileSystem.mkdir(dirname(target.path), { recursive: true });
			await fileSystem.writeFile(target.path, target.contents, { flag: 'wx' });
		}
		if (await pathExists(paths.root)) {
			await fileSystem.rename(paths.root, rollbackRoot);
			previousPackageMoved = true;
			for (const entry of await fileSystem.readdir(rollbackRoot)) {
				if (entry === 'masters' || entry === 'provenance') continue;
				await fileSystem.rename(join(rollbackRoot, entry), join(stagingRoot, entry));
				preservedEntries.push(entry);
			}
		}
		// The package is a real directory: this install publishes base, foreground,
		// and provenance together, so readers can never observe a mixed generation.
		await fileSystem.rename(stagingRoot, paths.root);
	} catch (error) {
		if (previousPackageMoved) {
			for (const entry of [...preservedEntries].reverse()) {
				await fileSystem
					.rename(join(stagingRoot, entry), join(rollbackRoot, entry))
					.catch(() => undefined);
			}
			await fileSystem.rename(rollbackRoot, paths.root).catch(() => undefined);
		}
		await fileSystem.rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined);
		throw error;
	}
	// A cleanup failure cannot invalidate an already committed package. Retain the
	// rollback directory for recovery and let a later maintenance pass remove it.
	await fileSystem.rm(rollbackRoot, { recursive: true, force: true }).catch(() => undefined);
}

export async function runFinalizeMeadowEntryMasters(
	args: readonly string[],
	repositoryRoot = process.cwd(),
	dependencies: Partial<MeadowEntryMasterFinalizerDependencies> = {}
): Promise<void> {
	const finalizers = { ...DEFAULT_FINALIZERS, ...dependencies };
	const arguments_ = parseFinalizeMeadowEntryMasterArguments(args);
	const refinements = await readRefinements(arguments_.refinementManifest);
	if (arguments_.plane === 'base') {
		const result = await finalizers.finalizeBase(
			await baseInput(arguments_, repositoryRoot, refinements)
		);
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
			await foregroundInput(arguments_, repositoryRoot, refinements)
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
		base: await baseInput(arguments_, repositoryRoot, refinements),
		foreground: await foregroundInput(arguments_, repositoryRoot, refinements)
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
