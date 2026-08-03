import { readFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

export type ArtMapPackageOperation = 'finalize' | 'export' | 'proof' | 'approve' | 'validate';

export interface ArtMapPackageAdapterV1 {
	version: 1;
	adapterId: string;
	mapId: string;
	implementation: string;
	schemas: { input: 'gliese-art-map-package-input-v1'; output: 'gliese-art-map-package-output-v1' };
	paths: { packageRoot: string; proofRoot: string; controlsRoot: string };
	artifacts: { baseMaster: string; foregroundMaster: string; exportsDirectory: string };
	manifests: {
		controlApproval: string;
		packageApproval: string;
		productionProvenance: string;
		exportProvenance: string;
		cropManifest: string;
		validationEvidence: string;
	};
	versions: {
		normalizationTransform: number;
		cropContract: number;
		canonicalPngEncoder: number;
		dependencies: { sharp: string; runtime: string };
	};
	productionRecord: {
		modeField: string;
		promptField: string;
		manualProductionValue: string;
		provenanceManifest: string;
	};
	commands: Record<ArtMapPackageOperation, string>;
}

const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OPERATIONS = ['finalize', 'export', 'proof', 'approve', 'validate'] as const;
const MEADOW_ENTRY_PACKAGE_V1_CAPABILITY = {
	version: 1,
	adapterId: 'meadow-entry-hpa-399',
	mapId: 'meadow-entry',
	implementation: 'meadow-entry-package-v1',
	schemas: {
		input: 'gliese-art-map-package-input-v1',
		output: 'gliese-art-map-package-output-v1'
	},
	paths: {
		packageRoot: 'artifacts/meadow-entry/hpa-399',
		proofRoot: 'docs/superpowers/reports/img/hpa-399/proofs',
		controlsRoot: 'docs/superpowers/reports/img/hpa-399/controls'
	},
	artifacts: {
		baseMaster: 'masters/meadow-entry-base-master.png',
		foregroundMaster: 'masters/meadow-entry-foreground-master.png',
		exportsDirectory: 'exports'
	},
	manifests: {
		controlApproval: 'src/lib/game/content/approvals/meadow-entry-controls.ts',
		packageApproval: 'src/lib/game/content/approvals/meadow-entry-art-package.ts',
		productionProvenance: 'provenance/meadow-entry-master-provenance.json',
		exportProvenance: 'provenance/meadow-entry-export-provenance.json',
		cropManifest: 'provenance/meadow-entry-crop-manifest.json',
		validationEvidence:
			'docs/superpowers/reports/2026-07-30-hpa-399-visual-masters-exports-validation.md'
	},
	versions: {
		normalizationTransform: 1,
		cropContract: 1,
		canonicalPngEncoder: 1,
		dependencies: { sharp: '0.35.3', runtime: 'bun' }
	},
	productionRecord: {
		modeField: 'base.generation.mode|foreground.generation.mode',
		promptField: 'base.generation.prompt|foreground.generation.prompt',
		manualProductionValue: 'manual',
		provenanceManifest: 'provenance/meadow-entry-master-provenance.json'
	},
	commands: {
		finalize: 'art:finalize:meadow-entry',
		export: 'art:export:meadow-entry',
		proof: 'art:proof:meadow-entry',
		approve: 'art:approve:meadow-entry',
		validate: 'art:validate:meadow-entry'
	}
} satisfies ArtMapPackageAdapterV1;

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function object(value: unknown, label: string): Record<string, unknown> {
	assert(
		value !== null && typeof value === 'object' && !Array.isArray(value),
		`${label} must be an object`
	);
	return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
	assert(
		JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()),
		`${label} fields differ: expected=${[...keys].sort().join(',')} actual=${Object.keys(value).sort().join(',')}`
	);
}

function string(value: unknown, label: string): string {
	assert(typeof value === 'string' && value.length > 0, `${label} must be a non-empty string`);
	return value;
}

function repositoryRelativePath(value: unknown, label: string): string {
	const path = string(value, label);
	assert(
		!isAbsolute(path) &&
			path === path.replaceAll('\\', '/') &&
			!path.split('/').includes('..') &&
			!path.startsWith('./') &&
			!path.endsWith('/'),
		`${label} must be a normalized repository-relative path`
	);
	return path;
}

function positiveVersion(value: unknown, label: string): number {
	assert(Number.isInteger(value) && (value as number) > 0, `${label} must be a positive integer`);
	return value as number;
}

function validateAdapter(value: unknown): ArtMapPackageAdapterV1 {
	const adapter = object(value, 'Art map package adapter');
	exactKeys(
		adapter,
		[
			'version',
			'adapterId',
			'mapId',
			'implementation',
			'schemas',
			'paths',
			'artifacts',
			'manifests',
			'versions',
			'productionRecord',
			'commands'
		],
		'Art map package adapter'
	);
	assert(adapter.version === 1, 'Unsupported art map package adapter version');
	for (const key of ['adapterId', 'mapId', 'implementation'] as const) {
		assert(
			IDENTIFIER.test(string(adapter[key], key)),
			`${key} must be a stable lowercase identifier`
		);
	}

	const schemas = object(adapter.schemas, 'schemas');
	exactKeys(schemas, ['input', 'output'], 'schemas');
	assert(
		schemas.input === 'gliese-art-map-package-input-v1',
		'Unsupported art package input schema'
	);
	assert(
		schemas.output === 'gliese-art-map-package-output-v1',
		'Unsupported art package output schema'
	);

	const paths = object(adapter.paths, 'paths');
	exactKeys(paths, ['packageRoot', 'proofRoot', 'controlsRoot'], 'paths');
	for (const key of ['packageRoot', 'proofRoot', 'controlsRoot'] as const)
		repositoryRelativePath(paths[key], `paths.${key}`);

	const artifacts = object(adapter.artifacts, 'artifacts');
	exactKeys(artifacts, ['baseMaster', 'foregroundMaster', 'exportsDirectory'], 'artifacts');
	for (const key of ['baseMaster', 'foregroundMaster', 'exportsDirectory'] as const)
		repositoryRelativePath(artifacts[key], `artifacts.${key}`);

	const manifests = object(adapter.manifests, 'manifests');
	exactKeys(
		manifests,
		[
			'controlApproval',
			'packageApproval',
			'productionProvenance',
			'exportProvenance',
			'cropManifest',
			'validationEvidence'
		],
		'manifests'
	);
	for (const key of Object.keys(manifests))
		repositoryRelativePath(manifests[key], `manifests.${key}`);

	const versions = object(adapter.versions, 'versions');
	exactKeys(
		versions,
		['normalizationTransform', 'cropContract', 'canonicalPngEncoder', 'dependencies'],
		'versions'
	);
	for (const key of ['normalizationTransform', 'cropContract', 'canonicalPngEncoder'] as const)
		positiveVersion(versions[key], `versions.${key}`);
	const dependencies = object(versions.dependencies, 'versions.dependencies');
	exactKeys(dependencies, ['sharp', 'runtime'], 'versions.dependencies');
	string(dependencies.sharp, 'versions.dependencies.sharp');
	string(dependencies.runtime, 'versions.dependencies.runtime');

	const productionRecord = object(adapter.productionRecord, 'productionRecord');
	exactKeys(
		productionRecord,
		['modeField', 'promptField', 'manualProductionValue', 'provenanceManifest'],
		'productionRecord'
	);
	for (const key of ['modeField', 'promptField', 'manualProductionValue'] as const)
		string(productionRecord[key], `productionRecord.${key}`);
	repositoryRelativePath(
		productionRecord.provenanceManifest,
		'productionRecord.provenanceManifest'
	);

	const commands = object(adapter.commands, 'commands');
	exactKeys(commands, OPERATIONS, 'commands');
	for (const operation of OPERATIONS) string(commands[operation], `commands.${operation}`);
	return adapter as unknown as ArtMapPackageAdapterV1;
}

function assertSupportedCapability(adapter: ArtMapPackageAdapterV1): void {
	assert(
		adapter.implementation === MEADOW_ENTRY_PACKAGE_V1_CAPABILITY.implementation,
		`Unsupported art map package adapter implementation "${adapter.implementation}" for adapter "${adapter.adapterId}"`
	);
	assert(
		isDeepStrictEqual(adapter, MEADOW_ENTRY_PACKAGE_V1_CAPABILITY),
		`Unsupported art map package adapter capability contract for implementation "${adapter.implementation}" and adapter "${adapter.adapterId}"`
	);
}

/**
 * Loads and validates the art map package adapter manifest.
 *
 * @param repositoryRoot - Absolute path to the repository root used to resolve
 *   the manifest path.
 * @param manifestPath - Repository-relative JSON manifest path.
 * @returns The validated adapter contract.
 * @throws Error - When the manifest path escapes the repository, the file is
 *   not valid JSON, the adapter fails schema validation, or the capability
 *   contract is unsupported (fail-closed).
 */
export async function loadArtMapPackageAdapter(
	repositoryRoot: string,
	manifestPath: string
): Promise<ArtMapPackageAdapterV1> {
	const relativePath = repositoryRelativePath(manifestPath, 'Adapter manifest path');
	let parsed: unknown;
	try {
		parsed = JSON.parse(
			await readFile(join(resolve(repositoryRoot), relativePath), 'utf8')
		) as unknown;
	} catch (error) {
		if (error instanceof SyntaxError)
			throw new Error(`Art map package adapter is not valid JSON: ${relativePath}`, {
				cause: error
			});
		throw error;
	}
	const adapter = validateAdapter(parsed);
	assertSupportedCapability(adapter);
	return adapter;
}

function parseArguments(args: readonly string[]): {
	adapterPath: string;
	operation: ArtMapPackageOperation;
	operationArgs: readonly string[];
} {
	const normalized = args[0] === '--' ? args.slice(1) : [...args];
	const separator = normalized.indexOf('--');
	const flags = separator === -1 ? normalized : normalized.slice(0, separator);
	const operationArgs = separator === -1 ? [] : normalized.slice(separator + 1);
	assert(
		flags.length === 4,
		'Usage: art:map-package --adapter <repository-relative-json> --operation <operation> [-- <operation-args>]'
	);
	const values = new Map<string, string>();
	for (let index = 0; index < flags.length; index += 2) {
		const flag = flags[index];
		const value = flags[index + 1];
		assert(
			(flag === '--adapter' || flag === '--operation') && value !== undefined,
			'Invalid art map package CLI arguments'
		);
		assert(!values.has(flag), `Duplicate art map package CLI argument: ${flag}`);
		values.set(flag, value);
	}
	const operation = values.get('--operation');
	assert(
		OPERATIONS.includes(operation as ArtMapPackageOperation),
		`Unsupported art map package operation: ${operation ?? '<missing>'}`
	);
	return {
		adapterPath: values.get('--adapter')!,
		operation: operation as ArtMapPackageOperation,
		operationArgs
	};
}

/**
 * Runs the art map package CLI.
 *
 * @param args - CLI arguments: `--adapter <path> --operation <operation> [-- <operation-args>]`.
 * @param repositoryRoot - Absolute path to the repository root; defaults to the
 *   current working directory.
 * @param options - Optional `onDispatch` callback invoked with the parsed
 *   operation after the adapter loads successfully.
 * @returns Nothing on success.
 * @throws Error - For invalid or duplicate CLI arguments, unsupported
 *   operations, or any failure in the fail-closed capability check or the
 *   dispatched operation.
 */
export async function runArtMapPackageCli(
	args: readonly string[],
	repositoryRoot = process.cwd(),
	options: { onDispatch?: (operation: ArtMapPackageOperation) => void } = {}
): Promise<void> {
	const parsed = parseArguments(args);
	const adapter = await loadArtMapPackageAdapter(repositoryRoot, parsed.adapterPath);
	options.onDispatch?.(parsed.operation);
	const root = resolve(repositoryRoot);
	if (parsed.operation === 'finalize') {
		const { runFinalizeMeadowEntryMasters } = await import('./finalize-meadow-entry-masters');
		await runFinalizeMeadowEntryMasters(
			[...parsed.operationArgs, '--output-root', join(root, adapter.paths.packageRoot)],
			root
		);
	} else if (parsed.operation === 'export') {
		const { runExportMeadowEntryRegions } = await import('./export-meadow-entry-regions');
		assert(
			parsed.operationArgs.length === 0,
			'The export operation accepts no operation arguments'
		);
		await runExportMeadowEntryRegions(adapter.paths.packageRoot, root);
	} else if (parsed.operation === 'proof') {
		const { renderMeadowEntryArtProofs } = await import('./render-meadow-entry-art-proofs');
		assert(parsed.operationArgs.length === 0, 'The proof operation accepts no operation arguments');
		await renderMeadowEntryArtProofs(root);
	} else if (parsed.operation === 'approve') {
		const { approveMeadowEntryArtPackage } = await import('./approve-meadow-entry-art-package');
		await approveMeadowEntryArtPackage(parsed.operationArgs, root);
	} else {
		const { validateMeadowEntryArtPackage } = await import('./validate-meadow-entry-art-package');
		assert(
			parsed.operationArgs.length === 0,
			'The validate operation accepts no operation arguments'
		);
		await validateMeadowEntryArtPackage(root);
	}
}

if (import.meta.main) {
	await runArtMapPackageCli(process.argv.slice(2)).catch((error: unknown) => {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 1;
	});
}
