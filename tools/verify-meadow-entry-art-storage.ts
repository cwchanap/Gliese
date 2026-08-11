import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

import {
	MEADOW_ENTRY_ART_STORAGE,
	MEADOW_ENTRY_PAINTED_V2_ART_STORAGE,
	validateMeadowEntryPaintedV2StorageContract,
	validateMeadowEntryStorageContract
} from '$lib/game/content/backgrounds/meadow-entry-storage';

const historicalCanaryPath = MEADOW_ENTRY_ART_STORAGE.canaryPath;
const historicalProofProbePath = MEADOW_ENTRY_ART_STORAGE.proofPattern.replace(
	'**/*.png',
	'lfs-pattern-probe.png'
);
const paintedV2CanaryPath = MEADOW_ENTRY_PAINTED_V2_ART_STORAGE.canaryPath;
const paintedV2RuntimeProbePath = MEADOW_ENTRY_PAINTED_V2_ART_STORAGE.runtimePattern.replace(
	'**/*.png',
	'lfs-pattern-probe.png'
);
const expectedPngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type MeadowEntryStorageGitRunner = (...args: string[]) => string;

/**
 * Creates a Git runner that executes commands in the given repository root.
 *
 * @param {string} root - the repository root directory for Git command execution
 * @returns {MeadowEntryStorageGitRunner} a function that runs `git` with the given args
 *   in `root` and returns trimmed stdout, throwing on non-zero exit status
 */
function runGitIn(root: string): MeadowEntryStorageGitRunner {
	return (...args: string[]) => {
		const result = spawnSync('git', args, {
			cwd: root,
			encoding: 'utf8'
		});
		const stdout = result.stdout;
		const stderr = result.stderr;

		if (result.status !== 0) {
			throw new Error(`git ${args.join(' ')} failed:\n${stderr || stdout}`);
		}

		return stdout;
	};
}

/**
 * Verifies that a tracked art path carries the expected Git LFS attributes.
 *
 * @param {string} label - the storage role ('asset' or 'proof') used in failure messages
 * @param {string} path - the repository-relative path checked for Git LFS attributes
 * @param {MeadowEntryStorageGitRunner} git - the Git runner used to query check-attr output
 * @returns {void} throws when any expected attribute line is missing or mismatched
 */
function verifyLfsAttributes(label: string, path: string, git: MeadowEntryStorageGitRunner): void {
	const output = git('check-attr', 'filter', 'diff', 'merge', 'text', '--', path).trim();
	for (const [attribute, expected] of [
		['filter', 'lfs'],
		['diff', 'lfs'],
		['merge', 'lfs'],
		['text', 'unset']
	] as const) {
		const expectedLine = `${path}: ${attribute}: ${expected}`;
		if (!output.split('\n').includes(expectedLine)) {
			throw new Error(
				`Expected ${label} Git LFS ${attribute} attribute ${expectedLine}, received:\n${output}`
			);
		}
	}
}

export function verifyMeadowEntryHistoricalLfsAttributeCoverage(
	git: MeadowEntryStorageGitRunner = runGitIn(process.cwd())
): void {
	verifyLfsAttributes('asset', historicalCanaryPath, git);
	verifyLfsAttributes('proof', historicalProofProbePath, git);
}

export function verifyMeadowEntryPaintedV2LfsAttributeCoverage(
	git: MeadowEntryStorageGitRunner = runGitIn(process.cwd())
): void {
	verifyLfsAttributes('painted-v2 source', paintedV2CanaryPath, git);
	verifyLfsAttributes('painted-v2 runtime', paintedV2RuntimeProbePath, git);
}

export function verifyMeadowEntryLfsAttributeCoverage(
	git: MeadowEntryStorageGitRunner = runGitIn(process.cwd())
): void {
	verifyMeadowEntryHistoricalLfsAttributeCoverage(git);
	verifyMeadowEntryPaintedV2LfsAttributeCoverage(git);
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

export function assertTransparentOnePixelCanary(
	metadata: { width?: number; height?: number },
	rgbaPixel: Uint8Array,
	canaryPath: string = historicalCanaryPath
): void {
	assert(
		metadata.width === 1 && metadata.height === 1,
		`${canaryPath} must be a transparent one-pixel PNG, received ${metadata.width}x${metadata.height}`
	);
	assert(
		rgbaPixel.byteLength === 4 && rgbaPixel[3] === 0,
		`${canaryPath} must be a transparent RGBA pixel`
	);
}

/**
 * Validates the meadow-entry art storage contract end to end.
 *
 * Verifies the Git LFS configuration and attribute coverage, that the canary is
 * tracked as an LFS pointer in the Git index, that the working tree holds a
 * materialized PNG with the expected signature, and via sharp that the canary
 * is a transparent one-pixel RGBA image.
 *
 * @returns {Promise<void>} a Promise that resolves on success or rejects on any validation failure
 */
export async function verifyMeadowEntryArtStorage(
	repositoryRoot: string = process.cwd()
): Promise<void> {
	validateMeadowEntryStorageContract(MEADOW_ENTRY_ART_STORAGE);
	validateMeadowEntryPaintedV2StorageContract(MEADOW_ENTRY_PAINTED_V2_ART_STORAGE);

	const runGit = runGitIn(repositoryRoot);
	const lfsVersion = runGit('lfs', 'version').trim();
	verifyMeadowEntryLfsAttributeCoverage(runGit);

	const lfsFiles = runGit('lfs', 'ls-files');
	for (const canaryPath of [historicalCanaryPath, paintedV2CanaryPath]) {
		assert(
			lfsFiles.split('\n').some((line) => line.trimEnd().endsWith(canaryPath)),
			`Git LFS does not track ${canaryPath}`
		);
	}
	runGit('lfs', 'fsck');

	for (const canaryPath of [historicalCanaryPath, paintedV2CanaryPath]) {
		const indexBytes = runGit('show', `:${canaryPath}`);
		assert(
			indexBytes.startsWith('version https://git-lfs.github.com/spec/v1\n'),
			`${canaryPath} is not stored as an LFS pointer in the Git index`
		);

		const workingTreeBytes = readFileSync(join(repositoryRoot, canaryPath));
		assert(
			expectedPngSignature.every((byte, index) => workingTreeBytes[index] === byte),
			`${canaryPath} is not materialized as a PNG in the working tree`
		);

		const metadata = await sharp(workingTreeBytes).metadata();
		const rgbaPixel = await sharp(workingTreeBytes).ensureAlpha().raw().toBuffer();
		assertTransparentOnePixelCanary(metadata, rgbaPixel, canaryPath);
	}

	console.log(`git-lfs=${lfsVersion}`);
	console.log(`asset-attributes=git-lfs`);
	console.log(`proof-attributes=git-lfs`);
	console.log(`painted-v2-source-attributes=git-lfs`);
	console.log(`painted-v2-runtime-attributes=git-lfs`);
	console.log(`lfs-canary=${historicalCanaryPath}`);
	console.log(`lfs-canary=${paintedV2CanaryPath}`);
	console.log('lfs-fsck=ok');
	console.log('index=git-lfs-pointer (historical, painted-v2)');
	console.log('working-tree=png-signature (historical, painted-v2)');
	console.log('sharp=1x1 (historical, painted-v2)');
	console.log('alpha=zero (historical, painted-v2)');
}

if (import.meta.main) {
	await verifyMeadowEntryArtStorage().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
