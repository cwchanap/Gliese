import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
	MEADOW_ENTRY_ART_STORAGE,
	validateMeadowEntryStorageContract
} from '$lib/game/content/backgrounds/meadow-entry-storage';
import { MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT } from '$lib/game/content/generated/meadow-entry-art-control';

import { runMeadowEntryArtControlsExporter } from './export-meadow-entry-art-controls';

const CONTROLS_DIRECTORY = 'docs/superpowers/reports/img/hpa-399/controls';
const APPROVAL_PATH = 'src/lib/game/content/approvals/meadow-entry-controls.ts';
const EVIDENCE_PATH =
	'docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md' as const;
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
	evidencePath: typeof EVIDENCE_PATH;
}

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
	if (!REVIEWER.test(reviewedBy)) {
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

function canonicalStorageConfiguration(repositoryRoot: string): string {
	validateMeadowEntryStorageContract(MEADOW_ENTRY_ART_STORAGE);
	const requiredLines = [
		`${MEADOW_ENTRY_ART_STORAGE.assetPattern} filter=lfs diff=lfs merge=lfs -text`,
		`${MEADOW_ENTRY_ART_STORAGE.proofPattern} filter=lfs diff=lfs merge=lfs -text`
	];
	const checkedInLines = readFileSync(join(repositoryRoot, '.gitattributes'), 'utf8').split(
		/\r?\n/
	);
	for (const requiredLine of requiredLines) {
		if (checkedInLines.filter((line) => line === requiredLine).length !== 1) {
			throw new Error(
				`Expected exactly one checked-in Git LFS configuration line: ${requiredLine}`
			);
		}
	}
	return requiredLines.join('\n') + '\n';
}

function readApprovalValues(repositoryRoot: string): MeadowEntryControlsApprovalValues {
	const cropManifest = readFileSync(
		join(repositoryRoot, CONTROLS_DIRECTORY, 'meadow-entry-crop-manifest.json')
	);
	const bakeOwnership = readFileSync(
		join(repositoryRoot, CONTROLS_DIRECTORY, 'meadow-entry-bake-ownership.json')
	);
	const storageConfiguration = canonicalStorageConfiguration(repositoryRoot);

	return {
		combinedControlFingerprint: MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT,
		cropManifestSha256: sha256(cropManifest),
		bakeOwnershipSha256: sha256(bakeOwnership),
		storageMode: 'git-lfs',
		storageConfigurationSha256: sha256(storageConfiguration),
		evidencePath: EVIDENCE_PATH
	};
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
	if (!REVIEWER.test(review.reviewedBy)) throw new Error('Invalid reviewedBy value.');
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

export function approveMeadowEntryControls(
	args: readonly string[],
	repositoryRoot = process.cwd()
): MeadowEntryControlsApprovalValues {
	const review = parseMeadowEntryControlsApprovalArguments(args);
	runMeadowEntryArtControlsExporter(['--check'], repositoryRoot);
	const values = readApprovalValues(repositoryRoot);
	const output = renderMeadowEntryControlsApprovalModule(review, values);
	writeFileSync(join(repositoryRoot, APPROVAL_PATH), output, 'utf8');

	console.log(`approved meadow-entry controls ${values.combinedControlFingerprint}`);
	console.log(`reviewedBy ${review.reviewedBy}`);
	console.log(`reviewedAt ${review.reviewedAt}`);
	console.log(`cropManifestSha256 ${values.cropManifestSha256}`);
	console.log(`bakeOwnershipSha256 ${values.bakeOwnershipSha256}`);
	console.log(`storageConfigurationSha256 ${values.storageConfigurationSha256}`);
	return values;
}

if (import.meta.main) {
	try {
		approveMeadowEntryControls(process.argv.slice(2));
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	}
}
