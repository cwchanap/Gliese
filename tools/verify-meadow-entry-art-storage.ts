import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

import {
	MEADOW_ENTRY_ART_STORAGE,
	validateMeadowEntryStorageContract
} from '$lib/game/content/backgrounds/meadow-entry-storage';

const repositoryRoot = process.cwd();
const canaryPath = MEADOW_ENTRY_ART_STORAGE.canaryPath;
const expectedPngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function runGit(...args: string[]): string {
	const result = Bun.spawnSync({
		cmd: ['git', ...args],
		cwd: repositoryRoot,
		stdout: 'pipe',
		stderr: 'pipe'
	});
	const stdout = new TextDecoder().decode(result.stdout);
	const stderr = new TextDecoder().decode(result.stderr);

	if (result.exitCode !== 0) {
		throw new Error(`git ${args.join(' ')} failed:\n${stderr || stdout}`);
	}

	return stdout;
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

async function main(): Promise<void> {
	validateMeadowEntryStorageContract(MEADOW_ENTRY_ART_STORAGE);

	const lfsVersion = runGit('lfs', 'version').trim();
	const filterAttribute = runGit('check-attr', 'filter', '--', canaryPath).trim();
	assert(
		filterAttribute === `${canaryPath}: filter: lfs`,
		`Expected ${canaryPath} to use the Git LFS filter, received: ${filterAttribute}`
	);

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
	assert(
		metadata.width === 1 && metadata.height === 1,
		`${canaryPath} must be a transparent one-pixel PNG, received ${metadata.width}x${metadata.height}`
	);
	const rgbaPixel = await sharp(workingTreeBytes).ensureAlpha().raw().toBuffer();
	assert(
		rgbaPixel.byteLength === 4 && rgbaPixel[3] === 0,
		`${canaryPath} must be a transparent RGBA pixel`
	);

	console.log(`git-lfs=${lfsVersion}`);
	console.log(`filter=${filterAttribute}`);
	console.log(`lfs-canary=${canaryPath}`);
	console.log('lfs-fsck=ok');
	console.log('index=git-lfs-pointer');
	console.log('working-tree=png-signature');
	console.log('sharp=1x1');
	console.log('alpha=zero');
}

await main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
