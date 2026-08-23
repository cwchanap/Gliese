import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import {
	MEADOW_ENTRY_PAINTED_V2_ART_STORAGE,
	MEADOW_ENTRY_PAINTED_V2_LEGACY_STORAGE_CONFIGURATION_SHA256,
	validateMeadowEntryPaintedV2StorageContract
} from '$lib/game/content/backgrounds/meadow-entry-storage';
import {
	buildMeadowEntryControlInputs,
	computeMeadowEntryCombinedControlFingerprint,
	renderMeadowEntryControls
} from '$lib/game/content/backgrounds/meadow-entry-controls';
import { MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT } from '$lib/game/content/generated/meadow-entry-painted-v2-art-control';
import { MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT as MEADOW_ENTRY_COMPLETE_COMBINED_CONTROL_FINGERPRINT } from '$lib/game/content/generated/meadow-entry-painted-v2-complete-art-control';

import { runMeadowEntryArtControlsExporter } from './export-meadow-entry-art-controls';
import { verifyMeadowEntryArtStorage } from './verify-meadow-entry-art-storage';

export type MeadowEntryControlPackage = 'legacy' | 'complete';

const LEGACY_CONTROLS_DIRECTORY = 'artifacts/meadow-entry/painted-v2/controls';
const LEGACY_APPROVAL_PATH = 'src/lib/game/content/approvals/meadow-entry-painted-v2-controls.ts';
const LEGACY_EVIDENCE_PATH =
	'docs/superpowers/reports/2026-08-12-meadow-entry-painted-camera-safe-controls.md' as const;
const COMPLETE_CONTROLS_DIRECTORY = 'artifacts/meadow-entry/painted-v2/complete/controls';
const COMPLETE_APPROVAL_PATH =
	'src/lib/game/content/approvals/meadow-entry-painted-v2-complete-controls.ts';
const COMPLETE_EVIDENCE_PATH =
	'docs/superpowers/reports/2026-08-19-complete-world-layout-foundation.md' as const;
const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const REVIEWER = /^[A-Za-z0-9][A-Za-z0-9._@+ -]{0,99}$/;
const SHA256 = /^[0-9a-f]{64}$/;

export interface MeadowEntryControlsApprovalArguments {
	reviewedBy: string;
	reviewedAt: string;
	packageName?: MeadowEntryControlPackage;
}

export interface MeadowEntryControlsApprovalValues {
	combinedControlFingerprint: string;
	cropManifestSha256: string;
	bakeOwnershipSha256: string;
	storageMode: 'git-lfs';
	storageConfigurationSha256: string;
	evidencePath: string;
}

interface MeadowEntryControlPackageConfig {
	readonly controlsDirectory: string;
	readonly approvalPath: string;
	readonly evidencePath: string;
	readonly checkedInCombinedFingerprint: string;
	readonly moduleInterfaceName: string;
	readonly reviewExportName: string;
	readonly approvalExportName: string;
}

function packageConfig(packageName: MeadowEntryControlPackage): MeadowEntryControlPackageConfig {
	if (packageName === 'complete') {
		return {
			controlsDirectory: COMPLETE_CONTROLS_DIRECTORY,
			approvalPath: COMPLETE_APPROVAL_PATH,
			evidencePath: COMPLETE_EVIDENCE_PATH,
			checkedInCombinedFingerprint: MEADOW_ENTRY_COMPLETE_COMBINED_CONTROL_FINGERPRINT,
			moduleInterfaceName: 'MeadowEntryPaintedV2CompleteControlsApproval',
			reviewExportName: 'meadowEntryPaintedV2CompleteControlsApprovalReview',
			approvalExportName: 'meadowEntryPaintedV2CompleteControlsApproval'
		};
	}
	return {
		controlsDirectory: LEGACY_CONTROLS_DIRECTORY,
		approvalPath: LEGACY_APPROVAL_PATH,
		evidencePath: LEGACY_EVIDENCE_PATH,
		checkedInCombinedFingerprint: MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT,
		moduleInterfaceName: 'MeadowEntryControlsApproval',
		reviewExportName: 'meadowEntryControlsApprovalReview',
		approvalExportName: 'meadowEntryControlsApproval'
	};
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
		if (flag !== '--reviewed-by' && flag !== '--reviewed-at' && flag !== '--package') {
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
	const packageValue = values.get('--package');
	if (packageValue !== undefined && packageValue !== 'legacy' && packageValue !== 'complete') {
		throw new Error('Unknown meadow-entry control package. Expected legacy or complete.');
	}
	if (reviewedBy === undefined) throw new Error('Missing required --reviewed-by argument.');
	if (!isValidReviewedBy(reviewedBy)) {
		throw new Error(
			'--reviewed-by must be 1-100 printable identity characters without surrounding whitespace.'
		);
	}
	if (reviewedAt === undefined) throw new Error('Missing required --reviewed-at argument.');
	assertValidReviewedAt(reviewedAt);

	return {
		reviewedBy,
		reviewedAt,
		...(packageValue === undefined ? {} : { packageName: packageValue })
	};
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

export function getMeadowEntryControlsStorageConfigurationSha256(
	storageConfiguration: Uint8Array,
	packageName: MeadowEntryControlPackage = 'legacy'
): string {
	assertStorageConfiguration(storageConfiguration);
	return packageName === 'legacy'
		? MEADOW_ENTRY_PAINTED_V2_LEGACY_STORAGE_CONFIGURATION_SHA256
		: sha256(storageConfiguration);
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

function readApprovalValues(
	repositoryRoot: string,
	packageName: MeadowEntryControlPackage = 'legacy'
): MeadowEntryControlsApprovalValues {
	const config = packageConfig(packageName);
	const inputs = buildMeadowEntryControlInputs(repositoryRoot, packageName);
	const currentCombinedFingerprint = computeMeadowEntryCombinedControlFingerprint(inputs);
	const rendered = renderMeadowEntryControls(inputs);
	const cropManifest = readFileSync(
		join(repositoryRoot, config.controlsDirectory, 'meadow-entry-crop-manifest.json')
	);
	const bakeOwnership = readFileSync(
		join(repositoryRoot, config.controlsDirectory, 'meadow-entry-bake-ownership.json')
	);
	const storageConfiguration = readFileSync(join(repositoryRoot, '.gitattributes'));
	validateMeadowEntryApprovalArtifacts({
		currentCombinedFingerprint,
		checkedInCombinedFingerprint: config.checkedInCombinedFingerprint,
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
		storageConfigurationSha256: getMeadowEntryControlsStorageConfigurationSha256(
			storageConfiguration,
			packageName
		),
		evidencePath: config.evidencePath
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

function assertApprovalValues(
	values: MeadowEntryControlsApprovalValues,
	packageName: MeadowEntryControlPackage
): void {
	for (const [name, value] of Object.entries(values)) {
		if (name.endsWith('Fingerprint') || name.endsWith('Sha256')) {
			if (!SHA256.test(value)) throw new Error(`Invalid approval SHA-256 value for ${name}.`);
		}
	}
	if (
		values.storageMode !== 'git-lfs' ||
		values.evidencePath !== packageConfig(packageName).evidencePath
	) {
		throw new Error('Invalid fixed meadow-entry approval contract value.');
	}
}

export function renderMeadowEntryControlsApprovalModule(
	review: MeadowEntryControlsApprovalArguments,
	values: MeadowEntryControlsApprovalValues,
	packageName: MeadowEntryControlPackage = 'legacy'
): string {
	if (!isValidReviewedBy(review.reviewedBy)) {
		throw new Error('Invalid reviewedBy value: surrounding whitespace is not allowed.');
	}
	assertValidReviewedAt(review.reviewedAt);
	const config = packageConfig(packageName);
	assertApprovalValues(values, packageName);
	const approvalAssignment =
		config.moduleInterfaceName.length > 40
			? `export const ${config.approvalExportName}: ${config.moduleInterfaceName} =\n\t{`
			: `export const ${config.approvalExportName}: ${config.moduleInterfaceName} = {`;

	return `/** Generated by tools/approve-meadow-entry-controls.ts from reviewed checked-in controls. */
export interface ${config.moduleInterfaceName} {
\tcombinedControlFingerprint: string;
\tcropManifestSha256: string;
\tbakeOwnershipSha256: string;
\tstorageMode: 'git-lfs';
\tstorageConfigurationSha256: string;
\tevidencePath: '${config.evidencePath}';
}

export const ${config.reviewExportName} = {
\treviewedBy: '${review.reviewedBy}',
\treviewedAt: '${review.reviewedAt}'
} as const;

${approvalAssignment}
\tcombinedControlFingerprint: '${values.combinedControlFingerprint}',
\tcropManifestSha256: '${values.cropManifestSha256}',
\tbakeOwnershipSha256: '${values.bakeOwnershipSha256}',
\tstorageMode: 'git-lfs',
\tstorageConfigurationSha256: '${values.storageConfigurationSha256}',
\tevidencePath: '${config.evidencePath}'
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
	const packageName = review.packageName ?? 'legacy';
	const config = packageConfig(packageName);
	await verifyMeadowEntryArtStorage(repositoryRoot);
	runMeadowEntryArtControlsExporter(['--package', packageName, '--check'], repositoryRoot);
	const values = readApprovalValues(repositoryRoot, packageName);
	const output = renderMeadowEntryControlsApprovalModule(review, values, packageName);
	publishMeadowEntryControlsApproval(output, join(repositoryRoot, config.approvalPath));

	console.log(`approved meadow-entry controls ${values.combinedControlFingerprint}`);
	console.log(`reviewedBy ${review.reviewedBy}`);
	console.log(`reviewedAt ${review.reviewedAt}`);
	console.log(`cropManifestSha256 ${values.cropManifestSha256}`);
	console.log(`bakeOwnershipSha256 ${values.bakeOwnershipSha256}`);
	console.log(`storageConfigurationSha256 ${values.storageConfigurationSha256}`);
	return values;
}

export function parseCheckedInMeadowEntryControlsApproval(
	source: string,
	packageName: MeadowEntryControlPackage = 'legacy'
): MeadowEntryControlsApprovalValues {
	const config = packageConfig(packageName);
	const objectMatch = source.match(
		new RegExp(
			`export const ${config.approvalExportName}\\s*:\\s*${config.moduleInterfaceName}\\s*=\\s*\\{([\\s\\S]*?)^\\};`,
			'm'
		)
	);
	if (!objectMatch) {
		throw new Error(`Checked-in ${packageName} painted-v2 approval object is missing.`);
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
	if (evidencePath !== config.evidencePath)
		throw new Error(`Checked-in ${packageName} painted-v2 approval evidence path drifted.`);
	return {
		combinedControlFingerprint: value('combinedControlFingerprint'),
		cropManifestSha256: value('cropManifestSha256'),
		bakeOwnershipSha256: value('bakeOwnershipSha256'),
		storageMode: 'git-lfs',
		storageConfigurationSha256: value('storageConfigurationSha256'),
		evidencePath: config.evidencePath
	};
}

function readCheckedInApprovalValues(
	repositoryRoot: string,
	packageName: MeadowEntryControlPackage = 'legacy'
): MeadowEntryControlsApprovalValues {
	const config = packageConfig(packageName);
	return parseCheckedInMeadowEntryControlsApproval(
		readFileSync(join(repositoryRoot, config.approvalPath), 'utf8'),
		packageName
	);
}

/** Recomputes the active payload and compares it without writing any file. */
export async function checkMeadowEntryControlsApproval(
	repositoryRoot = process.cwd(),
	packageName: MeadowEntryControlPackage = 'legacy'
): Promise<MeadowEntryControlsApprovalValues> {
	await verifyMeadowEntryArtStorage(repositoryRoot);
	runMeadowEntryArtControlsExporter(['--package', packageName, '--check'], repositoryRoot);
	const current = readApprovalValues(repositoryRoot, packageName);
	const checkedIn = readCheckedInApprovalValues(repositoryRoot, packageName);
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
	console.log(
		`${packageName} painted-v2 controls approval is current\t${current.combinedControlFingerprint}`
	);
	return current;
}

if (import.meta.main) {
	try {
		const args = process.argv.slice(2);
		const checkIndex = args.indexOf('--check');
		if (checkIndex >= 0) {
			const checkArgs = args.filter((_, index) => index !== checkIndex);
			let packageName: MeadowEntryControlPackage = 'legacy';
			if (checkArgs.length === 2 && checkArgs[0] === '--package') {
				if (checkArgs[1] !== 'legacy' && checkArgs[1] !== 'complete') {
					throw new Error('Unknown meadow-entry control package. Expected legacy or complete.');
				}
				packageName = checkArgs[1];
			} else if (checkArgs.length > 0) {
				throw new Error(
					'Usage: bun tools/approve-meadow-entry-controls.ts [--package legacy|complete] --check'
				);
			}
			await checkMeadowEntryControlsApproval(process.cwd(), packageName);
		} else {
			await approveMeadowEntryControls(args);
		}
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	}
}
