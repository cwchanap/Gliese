import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

import {
	MEADOW_ENTRY_ART_STORAGE,
	validateMeadowEntryStorageContract
} from '$lib/game/content/backgrounds/meadow-entry-storage';

const repositoryRoot = process.cwd();
const canaryPath = MEADOW_ENTRY_ART_STORAGE.canaryPath;
const proofProbePath = MEADOW_ENTRY_ART_STORAGE.proofPattern.replace(
	'**/*.png',
	'lfs-pattern-probe.png'
);
const expectedPngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type MeadowEntryStorageGitRunner = (...args: string[]) => string;

function runGit(...args: string[]): string {
	const result = spawnSync('git', args, {
		cwd: repositoryRoot,
		encoding: 'utf8'
	});
	const stdout = result.stdout;
	const stderr = result.stderr;

	if (result.status !== 0) {
		throw new Error(`git ${args.join(' ')} failed:\n${stderr || stdout}`);
	}

	return stdout;
}

function verifyLfsAttributes(
	label: 'asset' | 'proof',
	path: string,
	git: MeadowEntryStorageGitRunner
): void {
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

export function verifyMeadowEntryLfsAttributeCoverage(
	git: MeadowEntryStorageGitRunner = runGit
): void {
	verifyLfsAttributes('asset', canaryPath, git);
	verifyLfsAttributes('proof', proofProbePath, git);
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

export function assertTransparentOnePixelCanary(
	metadata: { width?: number; height?: number },
	rgbaPixel: Uint8Array
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

export async function verifyMeadowEntryArtStorage(): Promise<void> {
	validateMeadowEntryStorageContract(MEADOW_ENTRY_ART_STORAGE);

	const lfsVersion = runGit('lfs', 'version').trim();
	verifyMeadowEntryLfsAttributeCoverage();

	const lfsFiles = runGit('lfs', 'ls-files');
	assert(lfsFiles.includes(canaryPath), `Git LFS does not track ${canaryPath}`);
	runGit('lfs', 'fsck');

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
	assertTransparentOnePixelCanary(metadata, rgbaPixel);

	console.log(`git-lfs=${lfsVersion}`);
	console.log(`asset-attributes=git-lfs`);
	console.log(`proof-attributes=git-lfs`);
	console.log(`lfs-canary=${canaryPath}`);
	console.log('lfs-fsck=ok');
	console.log('index=git-lfs-pointer');
	console.log('working-tree=png-signature');
	console.log('sharp=1x1');
	console.log('alpha=zero');
}

if (import.meta.main) {
	await verifyMeadowEntryArtStorage().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
