import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
	MEADOW_ENTRY_ART_STORAGE,
	MEADOW_ENTRY_PAINTED_V2_ART_STORAGE,
	validateMeadowEntryPaintedV2StorageContract,
	validateMeadowEntryStorageContract
} from '$lib/game/content/backgrounds/meadow-entry-storage';

const paintedV2RuntimePatternProbePath = MEADOW_ENTRY_PAINTED_V2_ART_STORAGE.runtimePattern.replace(
	'**/*.png',
	'lfs-pattern-probe.png'
);
const expectedPngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const lfsPointerVersionLine = 'version https://git-lfs.github.com/spec/v1\n';

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
 * @param {string} label - the storage role used in failure messages
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

/**
 * Verifies Git LFS attribute coverage for the active storage contract: only
 * the painted-v2 runtime pattern. The historical artifacts/ and docs-proofs
 * paths left Git LFS in the de-LFS world and are no longer attribute-covered.
 *
 * @param {MeadowEntryStorageGitRunner} [git] - the Git runner used to query check-attr output
 * @returns {void} throws when any expected attribute line is missing or mismatched
 */
export function verifyMeadowEntryLfsAttributeCoverage(
	git: MeadowEntryStorageGitRunner = runGitIn(process.cwd())
): void {
	verifyLfsAttributes('painted-v2 runtime', paintedV2RuntimePatternProbePath, git);
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

/**
 * Validates the meadow-entry art storage contract end to end against the
 * active de-LFS world: Git LFS is installed, the painted-v2 runtime pattern
 * carries Git LFS attributes, and a tracked runtime probe file is LFS-tracked,
 * stored as an LFS pointer in the Git index, and materialized as a PNG in the
 * working tree. Historical artifacts/ canaries and the sharp one-pixel canary
 * checks are gone with the de-LFS .gitattributes.
 *
 * @param {string} [repositoryRoot] - the repository root directory, defaults
 *   to `process.cwd()`
 * @param {MeadowEntryStorageGitRunner} [runGit] - the Git runner, defaults to
 *   real `git` execution in `repositoryRoot` (tests inject a mock)
 * @returns {Promise<void>} a Promise that resolves on success or rejects on any validation failure
 */
export async function verifyMeadowEntryArtStorage(
	repositoryRoot: string = process.cwd(),
	runGit: MeadowEntryStorageGitRunner = runGitIn(repositoryRoot)
): Promise<void> {
	validateMeadowEntryStorageContract(MEADOW_ENTRY_ART_STORAGE);
	validateMeadowEntryPaintedV2StorageContract(MEADOW_ENTRY_PAINTED_V2_ART_STORAGE);

	const lfsVersion = runGit('lfs', 'version').trim();
	verifyMeadowEntryLfsAttributeCoverage(runGit);

	// Tracking is probed through an actually tracked runtime file; the pattern
	// probe path above is a .gitattributes pattern probe and not a repo path.
	const runtimeProbePath = runGit(
		'ls-files',
		'--',
		`:(glob)${MEADOW_ENTRY_PAINTED_V2_ART_STORAGE.runtimePattern}`
	)
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.sort()[0];
	assert(
		runtimeProbePath !== undefined,
		`Git does not track any runtime file under ${MEADOW_ENTRY_PAINTED_V2_ART_STORAGE.runtimePattern}`
	);

	const lfsFiles = runGit('lfs', 'ls-files');
	assert(
		lfsFiles.split('\n').some((line) => line.trimEnd().endsWith(runtimeProbePath)),
		`Git LFS does not track ${runtimeProbePath}`
	);
	runGit('lfs', 'fsck');

	const indexBytes = runGit('show', `:${runtimeProbePath}`);
	assert(
		indexBytes.startsWith(lfsPointerVersionLine),
		`${runtimeProbePath} is not stored as an LFS pointer in the Git index`
	);

	const workingTreeBytes = readFileSync(join(repositoryRoot, runtimeProbePath));
	assert(
		expectedPngSignature.every((byte, index) => workingTreeBytes[index] === byte),
		`${runtimeProbePath} is not materialized as a PNG in the working tree`
	);

	console.log(`git-lfs=${lfsVersion}`);
	console.log('painted-v2-runtime-attributes=git-lfs');
	console.log(`lfs-runtime-probe=${runtimeProbePath}`);
	console.log('lfs-fsck=ok');
	console.log('index=git-lfs-pointer (painted-v2 runtime)');
	console.log('working-tree=png-signature (painted-v2 runtime)');
}

if (import.meta.main) {
	await verifyMeadowEntryArtStorage().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
