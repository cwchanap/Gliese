import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { format } from 'prettier';

import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-complete';
import { meadowEntryPaintedV2CompleteControlsApproval } from '$lib/game/content/approvals/meadow-entry-painted-v2-complete-controls';
import { MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT } from '$lib/game/content/generated/meadow-entry-painted-v2-complete-art-control';
import {
	COMPLETE_MEADOW_ENTRY_CROP_MANIFEST_PATH,
	COMPLETE_MEADOW_ENTRY_EXPORT_PROVENANCE_PATH,
	COMPLETE_MEADOW_ENTRY_MASTER_PATH,
	COMPLETE_MEADOW_ENTRY_MASTER_PROVENANCE_PATH,
	COMPLETE_MEADOW_ENTRY_PACKAGE_ID,
	COMPLETE_MEADOW_ENTRY_RUNTIME_ROOT,
	buildCompleteRuntimeExportPackage,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES,
	type CompleteRuntimeExportArtifact
} from './export-meadow-entry-painted-v2-complete';

export const COMPLETE_MEADOW_ENTRY_TEXTURE_PROBE_PATH =
	'artifacts/meadow-entry/painted-v2/complete/proofs/texture-probe/browser-3200.json';
export const COMPLETE_MEADOW_ENTRY_REVIEW_PROOF_INVENTORY_PATH =
	'docs/superpowers/reports/img/hpa-586-painted-v2-complete/complete-review-manifest.json';
export const COMPLETE_MEADOW_ENTRY_VALIDATION_REPORT_PATH =
	'docs/superpowers/reports/2026-08-22-meadow-entry-painted-v2-complete-validation.md';
export const COMPLETE_MEADOW_ENTRY_APPROVAL_PATH =
	'src/lib/game/content/approvals/meadow-entry-painted-v2-complete-art-package.ts';
export const COMPLETE_MEADOW_ENTRY_STORAGE_CONFIGURATION_PATH = '.gitattributes';

const SHA256 = /^[a-f0-9]{64}$/;
const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export interface CompleteArtPackageArtifact {
	path: string;
	sha256: string;
	bytes: number;
	width: number;
	height: number;
}

export interface CompleteArtPackageExportArtifact extends CompleteArtPackageArtifact {
	cropId: string;
	plane: 'base' | 'foreground';
	textureKey: string;
	drawOrder: number;
}

export interface CompleteArtPackageEvidenceArtifact {
	path: string;
	sha256: string;
}

export interface CompleteArtPackageApprovalSnapshot {
	packageId: string;
	coverage: 'full-map';
	combinedControlFingerprint: string;
	storageMode: 'git-lfs';
	storageConfigurationSha256: string;
	master: CompleteArtPackageArtifact;
	masterProvenanceSha256: string;
	exportProvenanceSha256: string;
	cropManifestSha256: string;
	textureProbe: CompleteArtPackageEvidenceArtifact;
	reviewProofInventory: CompleteArtPackageEvidenceArtifact;
	validationReport: CompleteArtPackageEvidenceArtifact;
	exports: CompleteArtPackageExportArtifact[];
}

export interface CompleteArtPackageApprovalReview {
	reviewedBy: string;
	reviewedAt: string;
}

export interface CompleteArtPackageApprovalResult {
	readonly snapshot: CompleteArtPackageApprovalSnapshot;
	readonly module: string;
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function sha256(value: Uint8Array): string {
	return createHash('sha256').update(value).digest('hex');
}

function assertHash(value: string, label: string): void {
	assert(SHA256.test(value), `Complete Meadow Entry ${label} must be a SHA-256 hash`);
}

function assertReview(review: CompleteArtPackageApprovalReview): void {
	assert(
		review.reviewedBy === review.reviewedBy.trim() && review.reviewedBy.length > 0,
		'Complete Meadow Entry reviewer is invalid'
	);
	assert(UTC_SECONDS.test(review.reviewedAt), 'Complete Meadow Entry review timestamp is invalid');
	assert(
		new Date(review.reviewedAt).toISOString().replace('.000Z', 'Z') === review.reviewedAt,
		'Complete Meadow Entry review timestamp is invalid'
	);
}

function assertArtifact(artifact: CompleteArtPackageArtifact, label: string): void {
	assert(
		typeof artifact.path === 'string' && artifact.path.length > 0,
		`Complete Meadow Entry ${label} path is required`
	);
	assertHash(artifact.sha256, `${label} hash`);
	assert(
		Number.isSafeInteger(artifact.bytes) && artifact.bytes > 0,
		`Complete Meadow Entry ${label} bytes are invalid`
	);
	assert(
		Number.isInteger(artifact.width) && artifact.width > 0,
		`Complete Meadow Entry ${label} width is invalid`
	);
	assert(
		Number.isInteger(artifact.height) && artifact.height > 0,
		`Complete Meadow Entry ${label} height is invalid`
	);
}

function assertEvidence(artifact: CompleteArtPackageEvidenceArtifact, label: string): void {
	assert(
		typeof artifact.path === 'string' && artifact.path.length > 0,
		`Complete Meadow Entry ${label} path is required`
	);
	assertHash(artifact.sha256, `${label} hash`);
}

export function assertCompleteArtPackageApprovalSnapshot(
	snapshot: CompleteArtPackageApprovalSnapshot
): void {
	assert(
		snapshot.packageId === COMPLETE_MEADOW_ENTRY_PACKAGE_ID,
		'Complete Meadow Entry package id is stale'
	);
	assert(snapshot.coverage === 'full-map', 'Complete Meadow Entry coverage must be full-map');
	assert(
		snapshot.combinedControlFingerprint === MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT,
		'Complete Meadow Entry control fingerprint is stale'
	);
	assert(snapshot.storageMode === 'git-lfs', 'Complete Meadow Entry storage mode must be git-lfs');
	assertHash(snapshot.storageConfigurationSha256, 'storage configuration');
	assertArtifact(snapshot.master, 'master');
	assert(
		snapshot.master.path === COMPLETE_MEADOW_ENTRY_MASTER_PATH,
		'Complete Meadow Entry master path is stale'
	);
	assert(
		snapshot.master.width === MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH &&
			snapshot.master.height === MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
		'Complete Meadow Entry master dimensions are stale'
	);
	for (const [label, value] of [
		['master provenance', snapshot.masterProvenanceSha256],
		['export provenance', snapshot.exportProvenanceSha256],
		['crop manifest', snapshot.cropManifestSha256]
	] as const)
		assertHash(value, label);
	assertEvidence(snapshot.textureProbe, 'texture probe');
	assertEvidence(snapshot.reviewProofInventory, 'review proof inventory');
	assertEvidence(snapshot.validationReport, 'validation report');
	assert(
		snapshot.exports.length === 4,
		'Complete Meadow Entry approval must bind exactly four exports'
	);
	const expectedIds = MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES.map(({ cropId }) => cropId);
	const seenIds = new Set<string>();
	const seenPaths = new Set<string>();
	for (const [index, artifact] of snapshot.exports.entries()) {
		const spec = MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES.find(
			(candidate) => candidate.cropId === artifact.cropId
		);
		assert(spec !== undefined, `Complete Meadow Entry export id is unknown: ${artifact.cropId}`);
		assert(
			artifact.cropId === expectedIds[index],
			'Complete Meadow Entry approval exports are not in draw-order order'
		);
		assertArtifact(artifact, `export ${artifact.cropId}`);
		assert(
			artifact.plane === 'base',
			`Complete Meadow Entry export ${artifact.cropId} must be a base plane`
		);
		assert(
			artifact.width === 3200 && artifact.height === 3200,
			`Complete Meadow Entry export ${artifact.cropId} dimensions are stale`
		);
		assert(
			artifact.path === `${COMPLETE_MEADOW_ENTRY_RUNTIME_ROOT}/${spec.filename}`,
			`Complete Meadow Entry export path is stale: ${artifact.cropId}`
		);
		assert(
			artifact.textureKey === spec.textureKey,
			`Complete Meadow Entry export texture key is stale: ${artifact.cropId}`
		);
		assert(
			artifact.drawOrder === spec.drawOrder,
			`Complete Meadow Entry export draw order is stale: ${artifact.cropId}`
		);
		assert(
			!seenIds.has(artifact.cropId),
			`Complete Meadow Entry export id is duplicated: ${artifact.cropId}`
		);
		assert(
			!seenPaths.has(artifact.path),
			`Complete Meadow Entry export path is duplicated: ${artifact.path}`
		);
		seenIds.add(artifact.cropId);
		seenPaths.add(artifact.path);
	}
	assert(
		JSON.stringify([...seenIds].sort()) === JSON.stringify([...expectedIds].sort()),
		'Complete Meadow Entry approval export inventory is incomplete'
	);
}

function parseObject(bytes: Buffer, label: string): Record<string, unknown> {
	let value: unknown;
	try {
		value = JSON.parse(bytes.toString('utf8')) as unknown;
	} catch (error) {
		throw new Error(`Complete Meadow Entry ${label} is not valid JSON`, { cause: error });
	}
	assert(
		typeof value === 'object' && value !== null && !Array.isArray(value),
		`Complete Meadow Entry ${label} must be an object`
	);
	return value as Record<string, unknown>;
}

function numberProperty(value: Record<string, unknown>, key: string, label: string): number {
	const property = value[key];
	assert(
		typeof property === 'number' && Number.isFinite(property),
		`Complete Meadow Entry ${label}.${key} is invalid`
	);
	return property;
}

async function inspectArtifact(
	root: string,
	path: string,
	width: number,
	height: number
): Promise<CompleteArtPackageArtifact> {
	const bytes = await readFile(join(root, path));
	return { path, sha256: sha256(bytes), bytes: bytes.byteLength, width, height };
}

async function inspectExportArtifact(
	root: string,
	artifact: CompleteRuntimeExportArtifact
): Promise<CompleteArtPackageExportArtifact> {
	const actual = await inspectArtifact(root, artifact.path, artifact.width, artifact.height);
	assert(
		actual.sha256 === artifact.sha256 && actual.bytes === artifact.bytes,
		`Complete Meadow Entry runtime export is stale: ${artifact.path}`
	);
	return {
		...actual,
		cropId: artifact.cropId,
		plane: artifact.plane,
		textureKey: artifact.textureKey,
		drawOrder: artifact.drawOrder
	};
}

function validateTextureProbe(bytes: Buffer): void {
	const report = parseObject(bytes, 'texture probe report');
	assert(report.decision === 'proceed', 'Complete Meadow Entry texture probe did not proceed');
	assert(
		report.assetCount === 4 && report.successfulUploads === 4 && report.retainedTextures === 4,
		'Complete Meadow Entry texture probe does not retain four textures'
	);
	assert(
		report.webglAvailable === true && report.contextLost === false,
		'Complete Meadow Entry texture probe WebGL gate failed'
	);
	assert(
		numberProperty(report, 'maxTextureSize', 'texture probe') >= 3200,
		'Complete Meadow Entry texture probe texture limit is too small'
	);
}

function validateExportProvenance(
	bytes: Buffer,
	expected: CompleteArtPackageApprovalSnapshot,
	exports: readonly CompleteArtPackageExportArtifact[]
): void {
	const provenance = parseObject(bytes, 'export provenance');
	assert(provenance.version === 1, 'Complete Meadow Entry export provenance version is stale');
	assert(
		provenance.packageId === COMPLETE_MEADOW_ENTRY_PACKAGE_ID && provenance.coverage === 'full-map',
		'Complete Meadow Entry export provenance package or coverage is stale'
	);
	assert(
		provenance.controlFingerprint === expected.combinedControlFingerprint,
		'Complete Meadow Entry export provenance control fingerprint is stale'
	);
	assert(
		provenance.cropManifestSha256 === expected.cropManifestSha256,
		'Complete Meadow Entry export provenance crop manifest hash is stale'
	);
	assert(
		provenance.masterProvenanceSha256 === expected.masterProvenanceSha256,
		'Complete Meadow Entry export provenance master provenance hash is stale'
	);
	const master = provenance.master;
	assert(
		typeof master === 'object' && master !== null && !Array.isArray(master),
		'Complete Meadow Entry export provenance master is malformed'
	);
	const masterRecord = master as Record<string, unknown>;
	assert(
		masterRecord.path === expected.master.path &&
			masterRecord.sha256 === expected.master.sha256 &&
			masterRecord.bytes === expected.master.bytes &&
			masterRecord.width === expected.master.width &&
			masterRecord.height === expected.master.height,
		'Complete Meadow Entry export provenance master is stale'
	);
	const entries = provenance.exports;
	assert(
		Array.isArray(entries) && entries.length === 4,
		'Complete Meadow Entry export provenance inventory is incomplete'
	);
	for (const [index, artifact] of exports.entries()) {
		const entry = entries[index];
		assert(
			typeof entry === 'object' && entry !== null && !Array.isArray(entry),
			`Complete Meadow Entry export provenance is missing ${artifact.cropId}`
		);
		const record = entry as Record<string, unknown>;
		const spec = MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES[index]!;
		assert(
			record.cropId === artifact.cropId &&
				record.plane === 'base' &&
				record.textureKey === artifact.textureKey &&
				record.drawOrder === artifact.drawOrder &&
				record.path === artifact.path &&
				record.masterPath === expected.master.path &&
				record.sha256 === artifact.sha256 &&
				record.bytes === artifact.bytes &&
				record.width === artifact.width &&
				record.height === artifact.height,
			`Complete Meadow Entry export provenance is stale for ${artifact.cropId}`
		);
		for (const [label, value] of [
			['bounds', record.bounds],
			['sourceRect', record.sourceRect]
		] as const) {
			assert(
				typeof value === 'object' && value !== null && !Array.isArray(value),
				`Complete Meadow Entry export provenance ${artifact.cropId} ${label} is malformed`
			);
			const rect = value as Record<string, unknown>;
			assert(
				rect.left === spec.bounds.left &&
					rect.top === spec.bounds.top &&
					rect.right === spec.bounds.right &&
					rect.bottom === spec.bounds.bottom,
				`Complete Meadow Entry export provenance ${artifact.cropId} ${label} is stale`
			);
		}
	}
}

function renderApprovalModule(
	review: CompleteArtPackageApprovalReview,
	snapshot: CompleteArtPackageApprovalSnapshot
): Promise<string> {
	assertReview(review);
	return format(
		`/** Generated by tools/approve-meadow-entry-painted-v2-complete-art-package.ts. */\nexport const meadowEntryPaintedV2CompleteArtPackageApprovalReview = ${JSON.stringify(review)} as const;\n\nexport const meadowEntryPaintedV2CompleteArtPackageApproval = ${JSON.stringify(snapshot)} as const;\n`,
		{
			parser: 'typescript',
			useTabs: true,
			singleQuote: true,
			trailingComma: 'none',
			printWidth: 100
		}
	);
}

export function parseCompleteApprovalArguments(args: readonly string[]): {
	readonly check: boolean;
	readonly review?: CompleteArtPackageApprovalReview;
} {
	if (args.length === 1 && args[0] === '--check') return { check: true };
	if (args.length !== 4 || args[0] !== '--reviewed-by' || args[2] !== '--reviewed-at') {
		throw new Error(
			'Usage: bun tools/approve-meadow-entry-painted-v2-complete-art-package.ts [--check | --reviewed-by <name> --reviewed-at <UTC>]'
		);
	}
	const review = { reviewedBy: args[1]!, reviewedAt: args[3]! };
	assertReview(review);
	return { check: false, review };
}

export async function buildCompleteArtPackageApproval(
	repositoryRoot = process.cwd(),
	review: CompleteArtPackageApprovalReview = {
		reviewedBy: 'chanwaichan',
		reviewedAt: '1970-01-01T00:00:00Z'
	}
): Promise<CompleteArtPackageApprovalResult> {
	const root = resolve(repositoryRoot);
	assert(
		meadowEntryPaintedV2CompleteControlsApproval.combinedControlFingerprint ===
			MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT,
		'Complete Meadow Entry controls approval is stale'
	);
	const built = await buildCompleteRuntimeExportPackage(root);
	const [
		masterProvenance,
		cropManifest,
		exportProvenance,
		textureProbe,
		reviewProofInventory,
		validationReport,
		storageConfiguration
	] = await Promise.all([
		readFile(join(root, COMPLETE_MEADOW_ENTRY_MASTER_PROVENANCE_PATH)),
		readFile(join(root, COMPLETE_MEADOW_ENTRY_CROP_MANIFEST_PATH)),
		readFile(join(root, COMPLETE_MEADOW_ENTRY_EXPORT_PROVENANCE_PATH)),
		readFile(join(root, COMPLETE_MEADOW_ENTRY_TEXTURE_PROBE_PATH)),
		readFile(join(root, COMPLETE_MEADOW_ENTRY_REVIEW_PROOF_INVENTORY_PATH)),
		readFile(join(root, COMPLETE_MEADOW_ENTRY_VALIDATION_REPORT_PATH)),
		readFile(join(root, COMPLETE_MEADOW_ENTRY_STORAGE_CONFIGURATION_PATH))
	]);
	validateTextureProbe(textureProbe);
	assert(
		validationReport.toString('utf8').includes('Status: **APPROVED**') &&
			validationReport.toString('utf8').includes('Status: **PROCEED**'),
		'Complete Meadow Entry validation report is not approved'
	);
	const exports = await Promise.all(
		built.exports.map((artifact) => inspectExportArtifact(root, artifact))
	);
	const snapshot: CompleteArtPackageApprovalSnapshot = {
		packageId: COMPLETE_MEADOW_ENTRY_PACKAGE_ID,
		coverage: 'full-map',
		combinedControlFingerprint: MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT,
		storageMode: 'git-lfs',
		storageConfigurationSha256: sha256(storageConfiguration),
		master: built.master,
		masterProvenanceSha256: sha256(masterProvenance),
		exportProvenanceSha256: sha256(exportProvenance),
		cropManifestSha256: sha256(cropManifest),
		textureProbe: { path: COMPLETE_MEADOW_ENTRY_TEXTURE_PROBE_PATH, sha256: sha256(textureProbe) },
		reviewProofInventory: {
			path: COMPLETE_MEADOW_ENTRY_REVIEW_PROOF_INVENTORY_PATH,
			sha256: sha256(reviewProofInventory)
		},
		validationReport: {
			path: COMPLETE_MEADOW_ENTRY_VALIDATION_REPORT_PATH,
			sha256: sha256(validationReport)
		},
		exports
	};
	validateExportProvenance(exportProvenance, snapshot, exports);
	assertCompleteArtPackageApprovalSnapshot(snapshot);
	return { snapshot, module: await renderApprovalModule(review, snapshot) };
}

async function publishApproval(root: string, contents: string): Promise<void> {
	const target = join(root, COMPLETE_MEADOW_ENTRY_APPROVAL_PATH);
	const temporary = join(dirname(target), `.${randomUUID()}.tmp`);
	await mkdir(dirname(target), { recursive: true });
	try {
		await writeFile(temporary, contents, { encoding: 'utf8', flag: 'wx' });
		await rename(temporary, target);
	} finally {
		await rm(temporary, { force: true }).catch(() => undefined);
	}
}

export async function runCompleteArtPackageApproval(
	args: readonly string[],
	repositoryRoot = process.cwd()
): Promise<CompleteArtPackageApprovalSnapshot> {
	const parsed = parseCompleteApprovalArguments(args);
	const root = resolve(repositoryRoot);
	let review = parsed.review;
	if (parsed.check) {
		const current = await readFile(join(root, COMPLETE_MEADOW_ENTRY_APPROVAL_PATH), 'utf8');
		const reviewedBy = current.match(/reviewedBy:\s*'([^']+)'/)?.[1];
		const reviewedAt = current.match(/reviewedAt:\s*'([^']+)'/)?.[1];
		assert(
			reviewedBy !== undefined && reviewedAt !== undefined,
			'Complete Meadow Entry approval review metadata is missing'
		);
		review = { reviewedBy, reviewedAt };
	}
	const built = await buildCompleteArtPackageApproval(
		root,
		review ?? { reviewedBy: 'chanwaichan', reviewedAt: '1970-01-01T00:00:00Z' }
	);
	if (parsed.check) {
		const current = await readFile(join(root, COMPLETE_MEADOW_ENTRY_APPROVAL_PATH), 'utf8');
		assert(current === built.module, 'Complete Meadow Entry art package approval is stale');
		process.stdout.write('complete Meadow Entry art package approval is current\n');
		return built.snapshot;
	}
	await publishApproval(root, built.module);
	process.stdout.write(
		`${JSON.stringify({ reviewedBy: parsed.review!.reviewedBy, reviewedAt: parsed.review!.reviewedAt, exports: built.snapshot.exports.length })}\n`
	);
	return built.snapshot;
}

if (import.meta.main) {
	await runCompleteArtPackageApproval(process.argv.slice(2));
}
