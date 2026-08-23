import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_HANDOFF_MAX_HALF_WIDTH_PX,
	validateCompleteGenerationProvenance,
	validateCompleteRawProvenance,
	validateCompleteRejectionHistory
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly';
import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS,
	type MeadowEntryPaintedV2CompletePanelId
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-complete';
import {
	assembleMeadowEntryPaintedV2CompleteMaster,
	type MeadowEntryPaintedV2CompleteAssemblyInput
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-complete-assembly';
import {
	decodeMeadowEntryRgba,
	validateCanonicalPngChunks,
	type DecodedMeadowEntryRgba
} from '$lib/game/content/backgrounds/meadow-entry-png';

export const COMPLETE_MEADOW_ENTRY_OUTPUT_ROOT = 'artifacts/meadow-entry/painted-v2/complete';
export const COMPLETE_MEADOW_ENTRY_MASTER_PATH =
	'artifacts/meadow-entry/painted-v2/complete/masters/meadow-entry-painted-v2-complete-base-master.png';
export const COMPLETE_MEADOW_ENTRY_MASTER_PROVENANCE_PATH =
	'artifacts/meadow-entry/painted-v2/complete/provenance/meadow-entry-painted-v2-complete-master.json';
export const COMPLETE_MEADOW_ENTRY_MASTER_APPROVAL_PATH =
	'artifacts/meadow-entry/painted-v2/complete/provenance/meadow-entry-painted-v2-complete-master-approval.json';

const COMPLETE_PACKAGE_ID = 'meadow-entry-painted-v2-complete';
const SHA256 = /^[a-f0-9]{64}$/;
const EXPECTED_ASSEMBLY = {
	order: 'row-major',
	horizontalOverlapPx: 448,
	verticalOverlapPx: 256,
	handoffMaxHalfWidthPx: MEADOW_ENTRY_PAINTED_V2_COMPLETE_HANDOFF_MAX_HALF_WIDTH_PX,
	canonicalPngChunks: ['IHDR', 'IDAT', 'IEND']
} as const;

export interface FinalizeMeadowEntryPaintedV2CompleteArguments {
	readonly check: boolean;
}

export interface MeadowEntryCompleteFinalizerFileSystem {
	readonly mkdir: typeof mkdir;
	readonly readFile: typeof readFile;
	readonly writeFile: typeof writeFile;
	readonly rename: typeof rename;
	readonly rm: typeof rm;
}

export interface MeadowEntryCompleteAssemblyResult {
	readonly masterPng: Buffer;
	readonly provenanceJson: Buffer;
}

export interface RunFinalizeMeadowEntryPaintedV2CompleteOptions {
	readonly check?: boolean;
	readonly fileSystem?: MeadowEntryCompleteFinalizerFileSystem;
	/** Test seam. Normal execution always assembles the checked-in complete source panels. */
	readonly assemblyResult?: MeadowEntryCompleteAssemblyResult;
}

export interface FinalizeMeadowEntryPaintedV2CompleteResult {
	readonly masterPng: Buffer;
	readonly provenanceJson: Buffer;
	readonly masterPath: string;
	readonly provenancePath: string;
	readonly masterSha256: string;
	readonly provenanceSha256: string;
}

const NODE_FILE_SYSTEM: MeadowEntryCompleteFinalizerFileSystem = {
	mkdir,
	readFile,
	writeFile,
	rename,
	rm
};

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function sha256(value: Uint8Array): string {
	return createHash('sha256').update(value).digest('hex');
}

function parseJson(value: Buffer, label: string): Record<string, unknown> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(value.toString('utf8')) as unknown;
	} catch {
		throw new Error(`Complete Meadow Entry ${label} is not valid JSON`);
	}
	assert(
		typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed),
		`Complete Meadow Entry ${label} must be a JSON object`
	);
	return parsed as Record<string, unknown>;
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

function objectProperty(value: unknown, property: string, label: string): Record<string, unknown> {
	assert(
		typeof value === 'object' && value !== null && !Array.isArray(value),
		`Complete Meadow Entry ${label} must be an object`
	);
	const result = (value as Record<string, unknown>)[property];
	assert(
		typeof result === 'object' && result !== null && !Array.isArray(result),
		`Complete Meadow Entry ${label}.${property} must be an object`
	);
	return result as Record<string, unknown>;
}

function stringProperty(value: Record<string, unknown>, property: string, label: string): string {
	const result = value[property];
	assert(typeof result === 'string', `Complete Meadow Entry ${label}.${property} is required`);
	return result;
}

function integerProperty(value: Record<string, unknown>, property: string, label: string): number {
	const result = value[property];
	assert(Number.isInteger(result), `Complete Meadow Entry ${label}.${property} must be an integer`);
	return result as number;
}

function boundsEqual(
	first: Record<string, unknown>,
	second: {
		readonly left: number;
		readonly top: number;
		readonly right: number;
		readonly bottom: number;
	}
): boolean {
	return (
		first.left === second.left &&
		first.top === second.top &&
		first.right === second.right &&
		first.bottom === second.bottom
	);
}

function assertHash(value: string, label: string): void {
	assert(SHA256.test(value), `Complete Meadow Entry ${label} must be a lowercase SHA-256 hash`);
}

function validateApproval(record: Record<string, unknown>, masterHash: string): void {
	const approvalValue = record.approval;
	if (approvalValue === undefined) return;
	const approval = objectProperty(record, 'approval', 'master provenance');
	assert(
		stringProperty(approval, 'packageId', 'master approval') === COMPLETE_PACKAGE_ID,
		'Complete Meadow Entry master approval package is stale'
	);
	assert(
		stringProperty(approval, 'decision', 'master approval') === 'approved',
		'Complete Meadow Entry master approval decision is not approved'
	);
	assert(
		stringProperty(approval, 'reviewer', 'master approval').length > 0,
		'Complete Meadow Entry master approval reviewer is required'
	);
	const approvedAtUtc = stringProperty(approval, 'approvedAtUtc', 'master approval');
	assert(
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(approvedAtUtc) &&
			!Number.isNaN(new Date(approvedAtUtc).getTime()) &&
			new Date(approvedAtUtc).toISOString().replace('.000Z', 'Z') === approvedAtUtc,
		'Complete Meadow Entry master approval timestamp is invalid'
	);
	const approvedMasterHash = stringProperty(approval, 'masterSha256', 'master approval');
	assertHash(approvedMasterHash, 'master approval hash');
	assert(
		approvedMasterHash === masterHash,
		'Complete Meadow Entry master approval does not bind the assembled master'
	);
	const evidenceManifestSha256 = approval.evidenceManifestSha256;
	if (evidenceManifestSha256 !== undefined) {
		assert(
			typeof evidenceManifestSha256 === 'string',
			'Complete Meadow Entry master approval evidence manifest hash is invalid'
		);
		assertHash(evidenceManifestSha256, 'master approval evidence manifest hash');
	}
}

function assertOpaque(decoded: DecodedMeadowEntryRgba): void {
	for (let offset = 3; offset < decoded.data.length; offset += 4) {
		assert(decoded.data[offset] === 255, 'Complete Meadow Entry master must be fully opaque');
	}
}

async function validateMasterProvenance(
	masterPng: Buffer,
	provenanceJson: Buffer
): Promise<Record<string, unknown>> {
	validateCanonicalPngChunks(masterPng);
	const decoded = await decodeMeadowEntryRgba(masterPng);
	assert(
		decoded.width === MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH &&
			decoded.height === MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
		`Complete Meadow Entry master dimensions must be ${MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH}x${MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT}`
	);
	assertOpaque(decoded);
	const record = parseJson(provenanceJson, 'master provenance');
	assert(
		stringProperty(record, 'packageId', 'master provenance') === COMPLETE_PACKAGE_ID,
		'Complete Meadow Entry master provenance package is stale'
	);
	assert(
		stringProperty(record, 'controlFingerprint', 'master provenance') ===
			MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT,
		'Complete Meadow Entry master provenance control fingerprint is stale'
	);
	const dimensions = objectProperty(record, 'dimensions', 'master provenance');
	assert(
		integerProperty(dimensions, 'width', 'master dimensions') ===
			MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH &&
			integerProperty(dimensions, 'height', 'master dimensions') ===
				MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
		'Complete Meadow Entry master provenance dimensions are stale'
	);
	const assembly = objectProperty(record, 'assembly', 'master provenance');
	assert(
		JSON.stringify(assembly.order) === JSON.stringify(EXPECTED_ASSEMBLY.order),
		'Complete Meadow Entry assembly order is stale'
	);
	assert(
		assembly.horizontalOverlapPx === EXPECTED_ASSEMBLY.horizontalOverlapPx,
		'Complete Meadow Entry horizontal overlap is stale'
	);
	assert(
		assembly.verticalOverlapPx === EXPECTED_ASSEMBLY.verticalOverlapPx,
		'Complete Meadow Entry vertical overlap is stale'
	);
	assert(
		assembly.handoffMaxHalfWidthPx === EXPECTED_ASSEMBLY.handoffMaxHalfWidthPx,
		'Complete Meadow Entry handoff width is stale'
	);
	assert(
		JSON.stringify(assembly.canonicalPngChunks) ===
			JSON.stringify(EXPECTED_ASSEMBLY.canonicalPngChunks),
		'Complete Meadow Entry PNG encoding contract is stale'
	);
	const master = objectProperty(record, 'master', 'master provenance');
	const masterHash = stringProperty(master, 'sha256', 'master provenance master');
	assertHash(masterHash, 'master hash');
	assert(masterHash === sha256(masterPng), 'Complete Meadow Entry master hash is stale');
	assert(
		integerProperty(master, 'bytes', 'master provenance master') === masterPng.byteLength,
		'Complete Meadow Entry master byte count is stale'
	);
	validateApproval(record, masterHash);

	const panels = record.panels;
	assert(Array.isArray(panels), 'Complete Meadow Entry master provenance panels are required');
	assert(
		panels.length === MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS.length,
		'Complete Meadow Entry master provenance must contain all twelve panels'
	);
	for (const [index, panelValue] of panels.entries()) {
		assert(
			typeof panelValue === 'object' && panelValue !== null && !Array.isArray(panelValue),
			`Complete Meadow Entry panel ${index} provenance is invalid`
		);
		const panel = panelValue as Record<string, unknown>;
		const spec = MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS[index]!;
		assert(
			stringProperty(panel, 'id', `panel ${spec.id}`) === spec.id,
			`Complete Meadow Entry panel ${spec.id} order is stale`
		);
		const bounds = objectProperty(panel, 'bounds', `panel ${spec.id}`);
		assert(
			boundsEqual(bounds, spec.bounds),
			`Complete Meadow Entry panel ${spec.id} bounds are stale`
		);
		assert(
			integerProperty(panel, 'assemblyPriority', `panel ${spec.id}`) === spec.assemblyPriority,
			`Complete Meadow Entry panel ${spec.id} priority is stale`
		);
		const normalized = objectProperty(panel, 'normalized', `panel ${spec.id}`);
		assert(
			stringProperty(normalized, 'path', `panel ${spec.id}`) === spec.normalizedPath,
			`Complete Meadow Entry panel ${spec.id} path is stale`
		);
		assertHash(
			stringProperty(normalized, 'sha256', `panel ${spec.id}`),
			`panel ${spec.id} normalized hash`
		);
		assert(
			integerProperty(normalized, 'bytes', `panel ${spec.id}`) > 0,
			`Complete Meadow Entry panel ${spec.id} byte count is invalid`
		);
		const panelDimensions = objectProperty(normalized, 'dimensions', `panel ${spec.id}`);
		assert(
			integerProperty(panelDimensions, 'width', `panel ${spec.id}`) ===
				spec.expectedDimensions.width &&
				integerProperty(panelDimensions, 'height', `panel ${spec.id}`) ===
					spec.expectedDimensions.height,
			`Complete Meadow Entry panel ${spec.id} dimensions are stale`
		);
		validateCompleteRawProvenance(panel.raw, spec);
		const generation = validateCompleteGenerationProvenance(panel.generation, spec);
		const acceptedAttempt = integerProperty(generation, 'attempt', `panel ${spec.id} generation`);
		validateCompleteRejectionHistory(panel.rejectionHistory, spec, acceptedAttempt);
		const provenanceHash = stringProperty(panel, 'provenanceSha256', `panel ${spec.id} provenance`);
		assertHash(provenanceHash, `panel ${spec.id} provenance hash`);
		const rejectionHistory = panel.rejectionHistory;
		assert(
			Array.isArray(rejectionHistory),
			`Complete Meadow Entry panel ${spec.id} rejection history is required`
		);
	}
	assert(
		Array.isArray(record.rejectionHistory),
		'Complete Meadow Entry rejection history must be an array'
	);
	const expectedRejectionHistory = panels.flatMap((panelValue, index) => {
		const panel = panelValue as Record<string, unknown>;
		const spec = MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS[index]!;
		return (panel.rejectionHistory as readonly Record<string, unknown>[]).map((entry) => ({
			panelId: spec.id,
			...entry
		}));
	});
	assert(
		JSON.stringify(stableValue(record.rejectionHistory)) ===
			JSON.stringify(stableValue(expectedRejectionHistory)),
		'Complete Meadow Entry rejection history aggregate is stale'
	);
	return record;
}

async function writeAtomic(
	fileSystem: MeadowEntryCompleteFinalizerFileSystem,
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
	fileSystem: MeadowEntryCompleteFinalizerFileSystem,
	path: string,
	label: string
): Promise<Buffer> {
	try {
		return await fileSystem.readFile(path);
	} catch (error) {
		throw new Error(`Complete Meadow Entry ${label} is missing: ${path}`, { cause: error });
	}
}

async function readOptionalJson(
	fileSystem: MeadowEntryCompleteFinalizerFileSystem,
	path: string,
	label: string
): Promise<Record<string, unknown> | undefined> {
	try {
		return parseJson(await fileSystem.readFile(path), label);
	} catch (error) {
		if (
			typeof error === 'object' &&
			error !== null &&
			'code' in error &&
			(error as { readonly code?: unknown }).code === 'ENOENT'
		) {
			return undefined;
		}
		throw error;
	}
}

async function loadAssemblyInput(
	root: string,
	fileSystem: MeadowEntryCompleteFinalizerFileSystem
): Promise<MeadowEntryPaintedV2CompleteAssemblyInput> {
	const entries = await Promise.all(
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS.map(async (panel) => {
			const [raw, png, provenance] = await Promise.all([
				readRequired(fileSystem, join(root, panel.rawPath), `${panel.id} raw source`),
				readRequired(fileSystem, join(root, panel.normalizedPath), `${panel.id} normalized source`),
				readRequired(fileSystem, join(root, panel.provenancePath), `${panel.id} provenance`)
			]);
			return { id: panel.id, raw, png, provenance };
		})
	);
	return {
		controlFingerprint: MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT,
		raw: Object.fromEntries(entries.map(({ id, raw }) => [id, raw])) as Readonly<
			Record<MeadowEntryPaintedV2CompletePanelId, Buffer>
		>,
		panels: Object.fromEntries(entries.map(({ id, png }) => [id, png])) as Readonly<
			Record<MeadowEntryPaintedV2CompletePanelId, Buffer>
		>,
		provenance: Object.fromEntries(
			entries.map(({ id, provenance }) => [id, provenance])
		) as Readonly<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>>
	};
}

function addFinalizerFields(
	provenanceJson: Buffer,
	approval: Record<string, unknown> | undefined
): Buffer {
	const record = parseJson(provenanceJson, 'assembled provenance');
	if (!Array.isArray(record.rejectionHistory)) record.rejectionHistory = [];
	if (approval !== undefined) record.approval = approval;
	return stableJson(record);
}

export function parseFinalizeMeadowEntryPaintedV2CompleteArguments(
	args: readonly string[]
): FinalizeMeadowEntryPaintedV2CompleteArguments {
	let check = false;
	for (let index = args[0] === '--' ? 1 : 0; index < args.length; index += 1) {
		const flag = args[index];
		if (flag === '--check') {
			if (check) throw new Error('Duplicate complete Meadow Entry finalizer argument: --check');
			check = true;
			continue;
		}
		throw new Error(`Unknown complete Meadow Entry finalizer argument: ${flag ?? '<missing>'}`);
	}
	return { check };
}

export async function runFinalizeMeadowEntryPaintedV2Complete(
	repositoryRoot = process.cwd(),
	options: RunFinalizeMeadowEntryPaintedV2CompleteOptions = {}
): Promise<FinalizeMeadowEntryPaintedV2CompleteResult> {
	const root = resolve(repositoryRoot);
	const fileSystem = options.fileSystem ?? NODE_FILE_SYSTEM;
	const assembly =
		options.assemblyResult ??
		(await assembleMeadowEntryPaintedV2CompleteMaster(await loadAssemblyInput(root, fileSystem)));
	const masterPath = join(root, COMPLETE_MEADOW_ENTRY_MASTER_PATH);
	const provenancePath = join(root, COMPLETE_MEADOW_ENTRY_MASTER_PROVENANCE_PATH);
	const approval = await readOptionalJson(
		fileSystem,
		join(root, COMPLETE_MEADOW_ENTRY_MASTER_APPROVAL_PATH),
		'master approval'
	);
	const provenanceJson = addFinalizerFields(assembly.provenanceJson, approval);
	await validateMasterProvenance(assembly.masterPng, provenanceJson);
	if (options.check) {
		const [actualMaster, actualProvenance] = await Promise.all([
			readRequired(fileSystem, masterPath, 'base master'),
			readRequired(fileSystem, provenancePath, 'master provenance')
		]);
		assert(actualMaster.equals(assembly.masterPng), 'Complete Meadow Entry base master is stale');
		assert(
			actualProvenance.equals(provenanceJson),
			'Complete Meadow Entry master provenance is stale'
		);
	} else {
		await writeAtomic(fileSystem, masterPath, assembly.masterPng);
		await writeAtomic(fileSystem, provenancePath, provenanceJson);
	}
	return {
		masterPng: assembly.masterPng,
		provenanceJson,
		masterPath,
		provenancePath,
		masterSha256: sha256(assembly.masterPng),
		provenanceSha256: sha256(provenanceJson)
	};
}

if (import.meta.main) {
	const args = parseFinalizeMeadowEntryPaintedV2CompleteArguments(process.argv.slice(2));
	const result = await runFinalizeMeadowEntryPaintedV2Complete(process.cwd(), args);
	process.stdout.write(
		`${JSON.stringify({
			check: args.check,
			masterPath: COMPLETE_MEADOW_ENTRY_MASTER_PATH,
			masterSha256: result.masterSha256,
			masterBytes: result.masterPng.byteLength,
			provenancePath: COMPLETE_MEADOW_ENTRY_MASTER_PROVENANCE_PATH,
			provenanceSha256: result.provenanceSha256,
			provenanceBytes: result.provenanceJson.byteLength
		})}\n`
	);
}
