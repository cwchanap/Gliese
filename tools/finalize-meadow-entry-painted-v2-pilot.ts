import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { meadowEntryControlsApproval } from '$lib/game/content/approvals/meadow-entry-painted-v2-controls';
import {
	buildMeadowEntryControlInputs,
	computeMeadowEntryCombinedControlFingerprint
} from '$lib/game/content/backgrounds/meadow-entry-controls';
import type { MeadowEntryGenerationProvenance } from '$lib/game/content/backgrounds/meadow-entry-master-provenance';
import {
	assembleMeadowEntryPaintedV2Pilot,
	type MeadowEntryPaintedV2PilotAssemblyInput,
	type MeadowEntryPaintedV2PilotAssemblyResult
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-pilot-finalizer';
import { MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS } from '$lib/game/content/backgrounds/meadow-entry-painted-v2-pilot';

export const PAINTED_V2_PILOT_OUTPUT_ROOT = 'artifacts/meadow-entry/painted-v2';
export const PAINTED_V2_PILOT_MASTER_PATH =
	'artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png';
export const PAINTED_V2_PILOT_MASTER_PROVENANCE_PATH =
	'artifacts/meadow-entry/painted-v2/provenance/meadow-entry-master-provenance.json';
export const PAINTED_V2_PILOT_PACKAGE_PROVENANCE_PATH =
	'artifacts/meadow-entry/painted-v2/provenance.json';

const SHA256 = /^[a-f0-9]{64}$/;

export interface FinalizeMeadowEntryPaintedV2PilotArguments {
	readonly check: boolean;
}

export interface MeadowEntryPaintedV2PilotFinalizerFileSystem {
	readonly mkdir: typeof mkdir;
	readonly readFile: typeof readFile;
	readonly writeFile: typeof writeFile;
	readonly rename: typeof rename;
	readonly rm: typeof rm;
}

export interface RunFinalizeMeadowEntryPaintedV2PilotOptions {
	readonly check?: boolean;
	readonly fileSystem?: MeadowEntryPaintedV2PilotFinalizerFileSystem;
	/** Test seam for pure command tests; normal execution always assembles from checked-in panels. */
	readonly assemblyResult?: MeadowEntryPaintedV2PilotAssemblyResult;
}

export interface FinalizeMeadowEntryPaintedV2PilotResult {
	readonly masterPng: Buffer;
	readonly provenanceJson: Buffer;
	readonly packageProvenanceJson: Buffer;
	readonly masterSha256: string;
	readonly provenanceSha256: string;
}

const NODE_FILE_SYSTEM: MeadowEntryPaintedV2PilotFinalizerFileSystem = {
	mkdir,
	readFile,
	writeFile,
	rename,
	rm
};

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function sha256(value: Buffer): string {
	return createHash('sha256').update(value).digest('hex');
}

function assertSha256(value: string, label: string): void {
	assert(SHA256.test(value), `${label} must be a lowercase SHA-256 hash`);
}

function boundsEqual(
	first: { left: number; top: number; right: number; bottom: number },
	second: { left: number; top: number; right: number; bottom: number }
): boolean {
	return (
		first.left === second.left &&
		first.top === second.top &&
		first.right === second.right &&
		first.bottom === second.bottom
	);
}

function parseJson(buffer: Buffer, label: string): Record<string, unknown> {
	let value: unknown;
	try {
		value = JSON.parse(buffer.toString('utf8')) as unknown;
	} catch {
		throw new Error(`Meadow Entry ${label} is not valid JSON`);
	}
	assert(
		typeof value === 'object' && value !== null && !Array.isArray(value),
		`Meadow Entry ${label} must be a JSON object`
	);
	return value as Record<string, unknown>;
}

function canonicalJson(value: unknown): Buffer {
	const json = JSON.stringify(value, null, '\t').replace(
		/"canonicalPngChunks": \[\s*"IHDR",\s*"IDAT",\s*"IEND"\s*\]/g,
		'"canonicalPngChunks": ["IHDR", "IDAT", "IEND"]'
	);
	return Buffer.from(`${json}\n`);
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

function numberProperty(value: unknown, property: string, label: string): number {
	assert(
		typeof value === 'object' &&
			value !== null &&
			Number.isInteger((value as Record<string, unknown>)[property]),
		`Meadow Entry ${label} requires integer ${property}`
	);
	return (value as Record<string, number>)[property]!;
}

function objectProperty(value: unknown, property: string, label: string): Record<string, unknown> {
	const result =
		typeof value === 'object' && value !== null
			? (value as Record<string, unknown>)[property]
			: undefined;
	assert(
		typeof result === 'object' && result !== null && !Array.isArray(result),
		`Meadow Entry ${label} requires object ${property}`
	);
	return result as Record<string, unknown>;
}

function referenceHashes(manifest: Record<string, unknown>): string[] {
	const references = manifest.references;
	if (typeof references !== 'object' || references === null || Array.isArray(references)) return [];
	const result: string[] = [];
	const record = references as Record<string, unknown>;
	for (const key of ['controlCropSha256', 'conceptCropSha256']) {
		const value = record[key];
		if (typeof value === 'string' && SHA256.test(value)) result.push(value);
	}
	if (Array.isArray(record.controls)) {
		for (const control of record.controls) {
			if (typeof control !== 'object' || control === null || Array.isArray(control)) continue;
			const value = (control as Record<string, unknown>).sha256;
			if (typeof value === 'string' && SHA256.test(value)) result.push(value);
		}
	}
	return [...new Set(result)].sort();
}

function buildPanelGeneration(
	manifest: Record<string, unknown>,
	panel: (typeof MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS)[number]
): MeadowEntryGenerationProvenance {
	const generation = objectProperty(manifest, 'generation', `${panel.id} panel manifest`);
	const normalized = objectProperty(manifest, 'normalized', `${panel.id} panel manifest`);
	const tool = stringProperty(generation, 'tool', `${panel.id} generation`);
	const provider = stringProperty(generation, 'provider', `${panel.id} generation`);
	const model = stringProperty(generation, 'model', `${panel.id} generation`);
	const modelVersion = stringProperty(generation, 'modelVersion', `${panel.id} generation`);
	const promptUnavailable = generation.promptUnavailable === true;
	if (promptUnavailable) {
		assert(
			generation.prompt === null && generation.promptSha256 === null,
			`${panel.id} generation promptUnavailable requires null prompt and prompt hash`
		);
	}
	const prompt = promptUnavailable
		? null
		: stringProperty(generation, 'prompt', `${panel.id} generation`);
	const promptSha256 = promptUnavailable
		? null
		: stringProperty(generation, 'promptSha256', `${panel.id} generation`);
	if (promptSha256 !== null) assertSha256(promptSha256, `${panel.id} prompt hash`);
	const normalizedSha256 = stringProperty(normalized, 'sha256', `${panel.id} normalized`);
	assertSha256(normalizedSha256, `${panel.id} normalized hash`);
	const normalizedDimensions = objectProperty(normalized, 'dimensions', `${panel.id} normalized`);
	const normalizedBytes = numberProperty(normalized, 'bytes', `${panel.id} normalized`);
	assert(
		boundsEqual(
			{
				left: 0,
				top: 0,
				right: numberProperty(normalizedDimensions, 'width', `${panel.id} dimensions`),
				bottom: numberProperty(normalizedDimensions, 'height', `${panel.id} dimensions`)
			},
			{
				left: 0,
				top: 0,
				right: panel.expectedDimensions.width,
				bottom: panel.expectedDimensions.height
			}
		),
		`Meadow Entry ${panel.id} normalized dimensions do not match the panel contract`
	);
	return {
		mode: 'generative',
		provider,
		model,
		modelVersion,
		tool,
		toolVersion: modelVersion,
		settings: {
			panelId: panel.id,
			assemblyPriority: panel.assemblyPriority,
			bounds: panel.bounds,
			attempt: generation.attempt ?? null,
			result: generation.result ?? null,
			rejected: generation.rejected ?? false,
			normalizedSha256,
			normalizedBytes,
			normalizedDimensions,
			rawSha256: objectProperty(manifest, 'raw', `${panel.id} panel manifest`).sha256 ?? null,
			referenceImageSha256: referenceHashes(manifest),
			promptUnavailable
		},
		seed: null,
		seedUnavailable: true,
		prompt,
		promptSha256,
		referenceImageSha256: referenceHashes(manifest),
		byteReproducibleGeneration: false
	};
}

async function loadAssemblyInput(
	repositoryRoot: string,
	fileSystem: MeadowEntryPaintedV2PilotFinalizerFileSystem
): Promise<MeadowEntryPaintedV2PilotAssemblyInput> {
	const currentInputs = buildMeadowEntryControlInputs(repositoryRoot);
	const controlFingerprint = computeMeadowEntryCombinedControlFingerprint(currentInputs);
	assert(
		controlFingerprint === meadowEntryControlsApproval.combinedControlFingerprint,
		'Meadow Entry painted-v2 control fingerprint is stale'
	);
	const panels: Record<string, Buffer> = {};
	const panelProvenance: Record<string, MeadowEntryGenerationProvenance> = {};
	for (const panel of MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS) {
		const normalizedPath = join(repositoryRoot, panel.normalizedPath);
		const manifestPath = join(repositoryRoot, panel.provenancePath);
		const [bytes, manifestBytes] = await Promise.all([
			fileSystem.readFile(normalizedPath),
			fileSystem.readFile(manifestPath)
		]);
		const manifest = parseJson(manifestBytes, `${panel.id} panel manifest`);
		assert(manifest.id === panel.id, `Meadow Entry panel manifest id drifted for ${panel.id}`);
		const manifestBounds = objectProperty(manifest, 'bounds', `${panel.id} panel manifest`);
		assert(
			boundsEqual(manifestBounds as never, panel.bounds),
			`Meadow Entry panel bounds drifted for ${panel.id}`
		);
		const expected = objectProperty(manifest, 'expectedDimensions', `${panel.id} panel manifest`);
		assert(
			numberProperty(expected, 'width', `${panel.id} expected dimensions`) ===
				panel.expectedDimensions.width &&
				numberProperty(expected, 'height', `${panel.id} expected dimensions`) ===
					panel.expectedDimensions.height,
			`Meadow Entry panel expected dimensions drifted for ${panel.id}`
		);
		const normalized = objectProperty(manifest, 'normalized', `${panel.id} panel manifest`);
		assert(
			stringProperty(normalized, 'path', `${panel.id} normalized`) === panel.normalizedPath,
			`Meadow Entry panel normalized path drifted for ${panel.id}`
		);
		panels[panel.id] = bytes;
		panelProvenance[panel.id] = buildPanelGeneration(manifest, panel);
	}
	return {
		panels,
		panelProvenance,
		controlFingerprint,
		approvedControlFingerprint: meadowEntryControlsApproval.combinedControlFingerprint
	};
}

function mergedPackageProvenance(existing: Buffer, assembly: Buffer): Buffer {
	const packageProvenance = parseJson(existing, 'painted-v2 package provenance');
	const assemblyProvenance = parseJson(assembly, 'painted-v2 assembly provenance');
	packageProvenance.assembly = assemblyProvenance;
	const controls = objectProperty(assemblyProvenance, 'controls', 'painted-v2 assembly provenance');
	packageProvenance.controlFingerprint = stringProperty(
		controls,
		'fingerprint',
		'painted-v2 assembly controls'
	);
	return canonicalJson(packageProvenance);
}

async function writeAtomic(
	fileSystem: MeadowEntryPaintedV2PilotFinalizerFileSystem,
	path: string,
	bytes: Buffer
): Promise<void> {
	const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
	try {
		await fileSystem.mkdir(dirname(path), { recursive: true });
		await fileSystem.writeFile(temporary, bytes, { flag: 'wx' });
		await fileSystem.rename(temporary, path);
	} catch (error) {
		await fileSystem.rm(temporary, { force: true }).catch(() => undefined);
		throw error;
	}
}

async function readRequired(
	fileSystem: MeadowEntryPaintedV2PilotFinalizerFileSystem,
	path: string,
	label: string
): Promise<Buffer> {
	try {
		return await fileSystem.readFile(path);
	} catch (error) {
		throw new Error(`Meadow Entry painted-v2 ${label} is missing: ${path}`, { cause: error });
	}
}

export function parseFinalizeMeadowEntryPaintedV2PilotArguments(
	args: readonly string[]
): FinalizeMeadowEntryPaintedV2PilotArguments {
	let check = false;
	for (let index = args[0] === '--' ? 1 : 0; index < args.length; index += 1) {
		const flag = args[index];
		if (flag === '--check') {
			if (check) throw new Error('Duplicate Meadow Entry pilot finalizer argument: --check');
			check = true;
			continue;
		}
		throw new Error(`Unknown Meadow Entry pilot finalizer argument: ${flag ?? '<missing>'}`);
	}
	return { check };
}

export async function runFinalizeMeadowEntryPaintedV2Pilot(
	repositoryRoot = process.cwd(),
	options: RunFinalizeMeadowEntryPaintedV2PilotOptions = {}
): Promise<FinalizeMeadowEntryPaintedV2PilotResult> {
	const root = resolve(repositoryRoot);
	const fileSystem = options.fileSystem ?? NODE_FILE_SYSTEM;
	const input = options.assemblyResult ? undefined : await loadAssemblyInput(root, fileSystem);
	const assembled = options.assemblyResult ?? (await assembleMeadowEntryPaintedV2Pilot(input!));
	const packageProvenancePath = join(root, PAINTED_V2_PILOT_PACKAGE_PROVENANCE_PATH);
	const packageProvenance = await readRequired(
		fileSystem,
		packageProvenancePath,
		'package provenance'
	);
	const packageProvenanceJson = mergedPackageProvenance(
		packageProvenance,
		assembled.provenanceJson
	);
	const masterPath = join(root, PAINTED_V2_PILOT_MASTER_PATH);
	const masterProvenancePath = join(root, PAINTED_V2_PILOT_MASTER_PROVENANCE_PATH);
	if (options.check) {
		const [actualMaster, actualMasterProvenance, actualPackageProvenance] = await Promise.all([
			readRequired(fileSystem, masterPath, 'pilot base master'),
			readRequired(fileSystem, masterProvenancePath, 'pilot master provenance'),
			readRequired(fileSystem, packageProvenancePath, 'package provenance')
		]);
		assert(actualMaster.equals(assembled.masterPng), 'Meadow Entry pilot base master is stale');
		assert(
			actualMasterProvenance.equals(assembled.provenanceJson),
			'Meadow Entry pilot master provenance is stale'
		);
		assert(
			actualPackageProvenance.equals(packageProvenanceJson),
			'Meadow Entry painted-v2 package provenance is stale'
		);
	} else {
		await writeAtomic(fileSystem, masterPath, assembled.masterPng);
		await writeAtomic(fileSystem, masterProvenancePath, assembled.provenanceJson);
		await writeAtomic(fileSystem, packageProvenancePath, packageProvenanceJson);
	}
	return {
		masterPng: assembled.masterPng,
		provenanceJson: assembled.provenanceJson,
		packageProvenanceJson,
		masterSha256: sha256(assembled.masterPng),
		provenanceSha256: sha256(assembled.provenanceJson)
	};
}

if (import.meta.main) {
	const args = parseFinalizeMeadowEntryPaintedV2PilotArguments(process.argv.slice(2));
	const result = await runFinalizeMeadowEntryPaintedV2Pilot(process.cwd(), args);
	process.stdout.write(
		`${JSON.stringify({
			check: args.check,
			masterSha256: result.masterSha256,
			masterBytes: result.masterPng.byteLength,
			provenanceSha256: result.provenanceSha256,
			provenanceBytes: result.provenanceJson.byteLength,
			packageProvenanceSha256: sha256(result.packageProvenanceJson),
			packageProvenanceBytes: result.packageProvenanceJson.byteLength
		})}\n`
	);
}
