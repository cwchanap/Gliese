import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import {
	MEADOW_ENTRY_PAINTED_V2_ART_STORAGE,
	validateMeadowEntryPaintedV2StorageContract
} from '$lib/game/content/backgrounds/meadow-entry-storage';
import {
	buildMeadowEntryControlInputs,
	computeMeadowEntryCombinedControlFingerprint,
	renderMeadowEntryControls
} from '$lib/game/content/backgrounds/meadow-entry-controls';
import { MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT } from '$lib/game/content/generated/meadow-entry-painted-v2-art-control';

import { runMeadowEntryArtControlsExporter } from './export-meadow-entry-art-controls';
import { verifyMeadowEntryArtStorage } from './verify-meadow-entry-art-storage';

const CONTROLS_DIRECTORY = 'artifacts/meadow-entry/painted-v2/controls';
const APPROVAL_PATH = 'src/lib/game/content/approvals/meadow-entry-painted-v2-controls.ts';
const EVIDENCE_PATH = 'docs/superpowers/reports/2026-08-11-painted-v2-controls.md' as const;
const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const REVIEWER = /^[A-Za-z0-9][A-Za-z0-9._@+ -]{0,99}$/;
const SHA256 = /^[0-9a-f]{64}$/;

export interface MeadowEntryControlsApprovalArguments {
	reviewedBy: string;
	reviewedAt: string;
}

export interface MeadowEntryControlsApprovalValues {
	combinedControlFingerprint: string;
	cropManifestSha256: string;
	bakeOwnershipSha256: string;
	storageMode: 'git-lfs';
	storageConfigurationSha256: string;
	evidencePath: string;
}

export interface MeadowEntryApprovalArtifactSnapshot {
	currentCombinedFingerprint: string;
	checkedInCombinedFingerprint: string;
	renderedCropManifest: string;
	checkedInCropManifest: Uint8Array;
	renderedBakeOwnership: string;
	checkedInBakeOwnership: Uint8Array;
	storageConfiguration: Uint8Array;
}

export interface MeadowEntryApprovalPublicationFileSystem {
	writeFileExclusive(path: string, contents: string): void;
	rename(source: string, destination: string): void;
	remove(path: string): void;
}

function isValidReviewedBy(value: string): boolean {
	return value === value.trim() && REVIEWER.test(value);
}

const NODE_PUBLICATION_FILE_SYSTEM: MeadowEntryApprovalPublicationFileSystem = {
	writeFileExclusive(path, contents) {
		writeFileSync(path, contents, { encoding: 'utf8', flag: 'wx' });
	},
	rename: renameSync,
	remove(path) {
		rmSync(path, { force: true });
	}
};

function assertValidReviewedAt(value: string): void {
	if (!UTC_SECONDS.test(value)) {
		throw new Error('--reviewed-at must use UTC seconds in YYYY-MM-DDTHH:mm:ssZ form.');
	}
	let normalized: string;
	try {
		normalized = new Date(value).toISOString().replace('.000Z', 'Z');
	} catch {
		throw new Error('--reviewed-at must be a valid UTC instant.');
	}
	if (normalized !== value) {
		throw new Error('--reviewed-at must be a valid UTC instant.');
	}
}

export function parseMeadowEntryControlsApprovalArguments(
	args: readonly string[]
): MeadowEntryControlsApprovalArguments {
	const values = new Map<string, string>();
	for (let index = args[0] === '--' ? 1 : 0; index < args.length; index += 2) {
		const flag = args[index];
		if (flag !== '--reviewed-by' && flag !== '--reviewed-at') {
			throw new Error(`Unknown meadow-entry approval argument: ${flag ?? '<missing>'}`);
		}
		if (values.has(flag)) {
			throw new Error(`Duplicate meadow-entry approval argument: ${flag}`);
		}
		const value = args[index + 1];
		if (value === undefined || value.startsWith('--')) {
			throw new Error(`Missing value for meadow-entry approval argument: ${flag}`);
		}
		values.set(flag, value);
	}

	const reviewedBy = values.get('--reviewed-by');
	const reviewedAt = values.get('--reviewed-at');
	if (reviewedBy === undefined) throw new Error('Missing required --reviewed-by argument.');
	if (!isValidReviewedBy(reviewedBy)) {
		throw new Error(
			'--reviewed-by must be 1-100 printable identity characters without surrounding whitespace.'
		);
	}
	if (reviewedAt === undefined) throw new Error('Missing required --reviewed-at argument.');
	assertValidReviewedAt(reviewedAt);

	return { reviewedBy, reviewedAt };
}

function sha256(value: Uint8Array | string): string {
	return createHash('sha256').update(value).digest('hex');
}

function requiredStorageConfigurationLines(): readonly {
	label: 'source' | 'runtime';
	line: string;
}[] {
	validateMeadowEntryPaintedV2StorageContract(MEADOW_ENTRY_PAINTED_V2_ART_STORAGE);
	return [
		{
			label: 'source',
			line: `${MEADOW_ENTRY_PAINTED_V2_ART_STORAGE.sourcePattern} filter=lfs diff=lfs merge=lfs -text`
		},
		{
			label: 'runtime',
			line: `${MEADOW_ENTRY_PAINTED_V2_ART_STORAGE.runtimePattern} filter=lfs diff=lfs merge=lfs -text`
		}
	];
}

function assertStorageConfiguration(storageConfiguration: Uint8Array): void {
	const text = Buffer.from(storageConfiguration).toString('utf8');
	if (text.includes('\r') || !text.endsWith('\n')) {
		throw new Error('Meadow-entry Git LFS configuration must use LF bytes with a final newline.');
	}
	const checkedInLines = text.slice(0, -1).split('\n');
	const activeLines = requiredStorageConfigurationLines();
	const activeMatches = activeLines.every(
		({ line }) => checkedInLines.filter((checkedInLine) => checkedInLine === line).length === 1
	);
	if (activeMatches) return;
	for (const { label, line } of activeLines) {
		if (checkedInLines.filter((checkedInLine) => checkedInLine === line).length !== 1) {
			throw new Error(`Expected exactly one ${label} Git LFS configuration line: ${line}`);
		}
	}
}

export function validateMeadowEntryApprovalArtifacts(
	snapshot: MeadowEntryApprovalArtifactSnapshot
): void {
	if (snapshot.currentCombinedFingerprint !== snapshot.checkedInCombinedFingerprint) {
		throw new Error(
			'Current combined control fingerprint does not match the checked-in fingerprint.'
		);
	}
	if (
		!Buffer.from(snapshot.renderedCropManifest).equals(Buffer.from(snapshot.checkedInCropManifest))
	) {
		throw new Error('Checked-in crop manifest bytes do not match the current rendered manifest.');
	}
	if (
		!Buffer.from(snapshot.renderedBakeOwnership).equals(
			Buffer.from(snapshot.checkedInBakeOwnership)
		)
	) {
		throw new Error('Checked-in bake ownership bytes do not match the current rendered ownership.');
	}
	assertStorageConfiguration(snapshot.storageConfiguration);
}

function readApprovalValues(repositoryRoot: string): MeadowEntryControlsApprovalValues {
	const inputs = buildMeadowEntryControlInputs(repositoryRoot);
	const currentCombinedFingerprint = computeMeadowEntryCombinedControlFingerprint(inputs);
	const rendered = renderMeadowEntryControls(inputs);
	const cropManifest = readFileSync(
		join(repositoryRoot, CONTROLS_DIRECTORY, 'meadow-entry-crop-manifest.json')
	);
	const bakeOwnership = readFileSync(
		join(repositoryRoot, CONTROLS_DIRECTORY, 'meadow-entry-bake-ownership.json')
	);
	const storageConfiguration = readFileSync(join(repositoryRoot, '.gitattributes'));
	validateMeadowEntryApprovalArtifacts({
		currentCombinedFingerprint,
		checkedInCombinedFingerprint: MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT,
		renderedCropManifest: rendered['meadow-entry-crop-manifest.json']!,
		checkedInCropManifest: cropManifest,
		renderedBakeOwnership: rendered['meadow-entry-bake-ownership.json']!,
		checkedInBakeOwnership: bakeOwnership,
		storageConfiguration
	});

	return {
		combinedControlFingerprint: currentCombinedFingerprint,
		cropManifestSha256: sha256(cropManifest),
		bakeOwnershipSha256: sha256(bakeOwnership),
		storageMode: 'git-lfs',
		storageConfigurationSha256: sha256(storageConfiguration),
		evidencePath: EVIDENCE_PATH
	};
}

export function publishMeadowEntryControlsApproval(
	contents: string,
	approvalPath: string,
	fileSystem: MeadowEntryApprovalPublicationFileSystem = NODE_PUBLICATION_FILE_SYSTEM,
	temporaryToken: string = randomUUID()
): void {
	if (!/^[A-Za-z0-9-]+$/.test(temporaryToken)) {
		throw new Error('Invalid meadow-entry approval temporary token.');
	}
	const temporaryPath = join(
		dirname(approvalPath),
		`.${basename(approvalPath)}.${temporaryToken}.tmp`
	);
	try {
		fileSystem.writeFileExclusive(temporaryPath, contents);
		fileSystem.rename(temporaryPath, approvalPath);
	} catch (error) {
		try {
			fileSystem.remove(temporaryPath);
		} catch (cleanupError) {
			throw new AggregateError(
				[error, cleanupError],
				`Failed to publish meadow-entry approval and clean staging file ${temporaryPath}`,
				{ cause: cleanupError }
			);
		}
		throw error;
	}
}

function assertApprovalValues(values: MeadowEntryControlsApprovalValues): void {
	for (const [name, value] of Object.entries(values)) {
		if (name.endsWith('Fingerprint') || name.endsWith('Sha256')) {
			if (!SHA256.test(value)) throw new Error(`Invalid approval SHA-256 value for ${name}.`);
		}
	}
	if (values.storageMode !== 'git-lfs' || values.evidencePath !== EVIDENCE_PATH) {
		throw new Error('Invalid fixed meadow-entry approval contract value.');
	}
}

export function renderMeadowEntryControlsApprovalModule(
	review: MeadowEntryControlsApprovalArguments,
	values: MeadowEntryControlsApprovalValues
): string {
	if (!isValidReviewedBy(review.reviewedBy)) {
		throw new Error('Invalid reviewedBy value: surrounding whitespace is not allowed.');
	}
	assertValidReviewedAt(review.reviewedAt);
	assertApprovalValues(values);

	return `/** Generated by tools/approve-meadow-entry-controls.ts from reviewed checked-in controls. */
export interface MeadowEntryControlsApproval {
\tcombinedControlFingerprint: string;
\tcropManifestSha256: string;
\tbakeOwnershipSha256: string;
\tstorageMode: 'git-lfs';
\tstorageConfigurationSha256: string;
\tevidencePath: '${EVIDENCE_PATH}';
}

export const meadowEntryControlsApprovalReview = {
\treviewedBy: '${review.reviewedBy}',
\treviewedAt: '${review.reviewedAt}'
} as const;

export const meadowEntryControlsApproval: MeadowEntryControlsApproval = {
\tcombinedControlFingerprint: '${values.combinedControlFingerprint}',
\tcropManifestSha256: '${values.cropManifestSha256}',
\tbakeOwnershipSha256: '${values.bakeOwnershipSha256}',
\tstorageMode: 'git-lfs',
\tstorageConfigurationSha256: '${values.storageConfigurationSha256}',
\tevidencePath: '${EVIDENCE_PATH}'
};
`;
}

/**
 * Orchestrates the full meadow-entry controls approval workflow.
 *
 * Verifies Git LFS storage, runs the controls exporter in `--check` mode,
 * reads the derived approval values, renders the approval module, and
 * publishes it to the checked-in approval path.
 *
 * @param {readonly string[]} args - CLI arguments parsed for reviewer identity
 *   (`--reviewed-by`) and review timestamp (`--reviewed-at`)
 * @param {string} [repositoryRoot] - the repository root directory, defaults
 *   to `process.cwd()`
 * @returns {Promise<MeadowEntryControlsApprovalValues>} the sealed approval values
 */
export async function approveMeadowEntryControls(
	args: readonly string[],
	repositoryRoot = process.cwd()
): Promise<MeadowEntryControlsApprovalValues> {
	const review = parseMeadowEntryControlsApprovalArguments(args);
	await verifyMeadowEntryArtStorage(repositoryRoot);
	runMeadowEntryArtControlsExporter(['--check'], repositoryRoot);
	const values = readApprovalValues(repositoryRoot);
	const output = renderMeadowEntryControlsApprovalModule(review, values);
	publishMeadowEntryControlsApproval(output, join(repositoryRoot, APPROVAL_PATH));

	console.log(`approved meadow-entry controls ${values.combinedControlFingerprint}`);
	console.log(`reviewedBy ${review.reviewedBy}`);
	console.log(`reviewedAt ${review.reviewedAt}`);
	console.log(`cropManifestSha256 ${values.cropManifestSha256}`);
	console.log(`bakeOwnershipSha256 ${values.bakeOwnershipSha256}`);
	console.log(`storageConfigurationSha256 ${values.storageConfigurationSha256}`);
	return values;
}

export function parseCheckedInMeadowEntryControlsApproval(
	source: string
): MeadowEntryControlsApprovalValues {
	const objectMatch = source.match(
		/export const meadowEntryControlsApproval\s*:\s*MeadowEntryControlsApproval\s*=\s*\{([\s\S]*?)^\};/m
	);
	if (!objectMatch) {
		throw new Error('Checked-in painted-v2 approval object is missing.');
	}
	const objectSource = objectMatch[1]!;
	const value = (field: string): string => {
		const match = objectSource.match(new RegExp(`^[\\t ]*${field}: '([^']+)',?[\\t ]*$`, 'm'));
		if (!match) throw new Error(`Checked-in painted-v2 approval is missing ${field}.`);
		return match[1]!;
	};
	const storageMode = value('storageMode');
	if (storageMode !== 'git-lfs')
		throw new Error('Checked-in painted-v2 approval storage mode drifted.');
	const evidencePath = value('evidencePath');
	if (evidencePath !== EVIDENCE_PATH)
		throw new Error('Checked-in painted-v2 approval evidence path drifted.');
	return {
		combinedControlFingerprint: value('combinedControlFingerprint'),
		cropManifestSha256: value('cropManifestSha256'),
		bakeOwnershipSha256: value('bakeOwnershipSha256'),
		storageMode: 'git-lfs',
		storageConfigurationSha256: value('storageConfigurationSha256'),
		evidencePath: EVIDENCE_PATH
	};
}

function readCheckedInApprovalValues(repositoryRoot: string): MeadowEntryControlsApprovalValues {
	return parseCheckedInMeadowEntryControlsApproval(
		readFileSync(join(repositoryRoot, APPROVAL_PATH), 'utf8')
	);
}

/** Recomputes the active payload and compares it without writing any file. */
export async function checkMeadowEntryControlsApproval(
	repositoryRoot = process.cwd()
): Promise<MeadowEntryControlsApprovalValues> {
	await verifyMeadowEntryArtStorage(repositoryRoot);
	runMeadowEntryArtControlsExporter(['--check'], repositoryRoot);
	const current = readApprovalValues(repositoryRoot);
	const checkedIn = readCheckedInApprovalValues(repositoryRoot);
	if (
		current.combinedControlFingerprint !== checkedIn.combinedControlFingerprint ||
		current.cropManifestSha256 !== checkedIn.cropManifestSha256 ||
		current.bakeOwnershipSha256 !== checkedIn.bakeOwnershipSha256 ||
		current.storageMode !== checkedIn.storageMode ||
		current.storageConfigurationSha256 !== checkedIn.storageConfigurationSha256 ||
		current.evidencePath !== checkedIn.evidencePath
	) {
		throw new Error('Checked-in painted-v2 controls approval payload is stale.');
	}
	console.log(`painted-v2 controls approval is current\t${current.combinedControlFingerprint}`);
	return current;
}

if (import.meta.main) {
	try {
		const args = process.argv.slice(2);
		if (args.length === 1 && args[0] === '--check') {
			await checkMeadowEntryControlsApproval();
		} else {
			await approveMeadowEntryControls(args);
		}
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	}
}
